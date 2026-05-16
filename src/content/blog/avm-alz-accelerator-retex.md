---
title: "L'AVM ALZ accelerator est solide. Voilà ce qu'on rajoute par-dessus (et ce qu'on referait autrement)"
description: "Retour d'expérience sur Azure AVM ALZ accelerator en production : trois ajustements qu'on a dû faire (pinning libraries, retries, exclusions VMSS) et trois choses qu'on referait autrement (découpage du state, tests, inventaire centralisé)."
pubDate: 2026-05-15
tags: [azure, terraform, terragrunt, alz, avm, infrastructure-as-code, cloud-architecture]
lang: fr
draft: false
featured: true
---

> **TL;DR.** Le module officiel `Azure/avm-ptn-alz/azurerm` couvre l'essentiel d'une Azure Landing Zone correctement. Trois choses ne sont pas dans la boîte et nous ont coûté du temps : le pinning explicite des libraries `alz`/`amba`, les retries sur eventual consistency Azure, et l'exclusion des resource groups de nodes AKS du scope des policies VMSS. Trois choses dans notre wrapper actuel sont à refaire : le state Terraform est monolithique, il n'y a pas de tests automatisés, et l'inventaire des AKS est hardcodé dans le `terragrunt.hcl`.

*Publié le 15 mai 2026.*
*Stack utilisé : Terraform `>= 1.5` · azurerm `~> 4.0` · azapi `~> 2.4` · alz `~> 0.19` · avm-ptn-alz/azurerm `0.13.0` · platform/alz `2025.02.0` · platform/amba `2025.05.0`.*

---

## La friction

L'AVM ALZ accelerator ([`Azure/terraform-azurerm-avm-ptn-alz`](https://github.com/Azure/terraform-azurerm-avm-ptn-alz)) fait gagner des semaines : hiérarchie de management groups, subscription placement, policySets ALZ DINE, intégration AMBA, intégration Defender for Cloud, DDoS, Backup. C'est solide, c'est testé, c'est maintenu par Microsoft.

Et pourtant, brut de décoffrage, il ne suffit pas. Trois choses cassent ou dérapent en production :

- Le premier `apply` sur une nouvelle hiérarchie échoue 1 fois sur 3 sur des erreurs `PolicyDefinitionNotFound` qui sont en réalité de l'eventual consistency Azure.
- Les libraries `platform/alz` et `platform/amba` sont résolues à la dernière version disponible si on ne pin rien, et un bump silencieux peut ajouter ou retirer des paramètres de policySet entre deux runs de pipeline.
- Les policies VMSS de l'archetype Landing Zone (`ChangeTracking`, `Monitoring Agent`) s'appliquent **aussi** aux VMSS managés par AKS dans les resource groups de nodes, et là, soit la policy reste `NonCompliant` à l'infini, soit l'extension perturbe le bootstrap du node.

Ce post n'est pas un tutoriel pour wrapper. C'est un retour sur trois ajustements qu'on a dû faire au-dessus du module et trois choses qu'on a faites moins bien.

---

## Ce que le wrapper apporte

### 1. Le pinning explicite des libraries `alz` et `amba`

**Le problème.** Au deuxième mois d'exploitation, une assignment policy a commencé à dériver entre `nprd` et `prod` sans qu'on n'ait modifié le code. Aucun commit, aucune PR, juste un drift detection qui se met à clignoter sur `Deploy-MDFC-Config-H224` (l'initiative Defender for Cloud, mise à jour semestrielle par Microsoft). Cause racine : la library `platform/amba` avait bumpé chez Microsoft entre les deux runs, et le provider `alz` consommait par défaut la dernière version disponible. Le mapping de paramètres avait changé entre les deux versions.

**Le fix.** Pin tout, partout :

```hcl
provider "alz" {
  library_overwrite_enabled = false
  library_references = [
    { path = "platform/alz",  ref = "2025.02.0" },
    { path = "platform/amba", ref = "2025.05.0" },
    { custom_url = "${path.root}/lib" },
  ]
}
```

Le `library_overwrite_enabled = false` empêche le merge silencieux d'overrides locaux dans la lib upstream. Le `custom_url` pointe vers un dossier `lib/` versionné dans le repo où on stocke nos archetype overrides (`connectivity.alz_archetype_override.yaml`, `landing_zones.alz_archetype_override.yaml`, `platform.alz_archetype_override.yaml`) et les définitions d'architecture par environnement.

**La leçon transférable.** Le pinning n'est pas une question de Terraform, c'est une question d'audit. Tant qu'une dépendance n'est pas fixée à un ref précis, vous ne pouvez pas reproduire un déploiement passé. Pour une infra de gouvernance — où la posture évolue par décisions humaines, pas par bumps automatiques — c'est non négociable.

### 2. Les retries sur eventual consistency Azure

**Le problème.** Premier déploiement sur une fresh tenant. `terragrunt apply`, 6 minutes plus tard :

```text
Error: PolicyDefinitionNotFound — The policy definition 'Deploy-MDFC-Config-H224' could not be found
Error: AuthorizationFailed — The client does not have authorization to perform action
'Microsoft.Authorization/policyAssignments/write' over scope '/providers/.../mg-lzr-prod'
```

La policy existe. Le client a les droits. Mais Azure n'a pas fini de propager la création des management groups et des definitions au moment où le provider essaie de créer les assignments. Relancer manuellement `terragrunt apply` 30 secondes plus tard fonctionne. Faire ça en pipeline en plein audit, beaucoup moins.

**Le fix.** Le provider `alz` expose un bloc `retries` qui réessaie automatiquement les opérations qui matchent un regex. On le câble large :

```hcl
inputs = {
  retries = {
    policy_definitions = {
      error_message_regex = ["AuthorizationFailed", "PolicyDefinitionNotFound"]
    }
    policy_set_definitions = {
      error_message_regex = ["AuthorizationFailed", "PolicyDefinitionNotFound"]
    }
    policy_assignments = {
      error_message_regex = [
        "AuthorizationFailed",
        "PolicyAssignmentNotFound",
        "PolicyDefinitionNotFound"
      ]
    }
    policy_role_assignments = {
      error_message_regex = ["AuthorizationFailed", "RoleAssignmentNotFound"]
    }
  }
}
```

Depuis qu'on l'a ajouté, zéro échec sur fresh deployment. Le wrapper devient idempotent même sur les premiers `apply`.

**La leçon transférable.** Eventual consistency est un trait de plateforme, pas un bug. À chaque fois qu'on déploie une ressource de gouvernance qui dépend d'une autre ressource de gouvernance via le control plane Azure (policy on MG, RBAC on subscription, role assignment on managed identity), il faut prévoir des retries explicites. Si le provider l'expose, l'utiliser. Sinon, retry au niveau du pipeline ou via `local-exec`.

### 3. L'exclusion des resource groups de nodes AKS du scope des policies VMSS

**Le problème.** Un nouveau cluster AKS est déployé dans un spoke. Quelques heures plus tard, les nodes commencent à montrer des warnings `Extension installation failed`, et la policy `Deploy-VMSS-MonitoringAgent` est marquée `NonCompliant` sur le resource group de nodes (`MC_*` ou équivalent). Le cluster fonctionne mais Defender et le Container Insights ne voient plus rien correctement, parce que l'agent VM essaie de s'installer sur des VMSS gérés par AKS, qui le rejette.

**Le fix.** Passer une liste `not_scopes` aux policies VMSS, ciblant les RG de nodes des AKS :

```hcl
inputs = {
  vmss_policy_not_scopes = [
    "/subscriptions/${include.root.locals.corp_subs.platform_api.id}/resourceGroups/rg-platform-api-${include.root.inputs.environment}-westeurope-aks-nodes",
  ]
}
```

Côté wrapper, ces `not_scopes` sont injectés dans `policy_assignments_to_modify` pour les assignments concernées (`Deploy-VMSS-ChangeTracking`, `Deploy-VMSS-MonitoringAgent`).

**La leçon transférable.** Les policies de plateforme sont conçues pour des VMSS "classiques". Tout ce qui est managé par un service Azure (AKS, AVS, Databricks…) a son propre cycle de vie d'extensions et n'aime pas qu'on lui en pousse de l'extérieur. Avant d'activer une policy `Deploy-VMSS-*` sur une hiérarchie qui contient des services managés, mapper les RG concernés et les sortir du scope.

---

## Ce qu'on referait autrement

J'ai brainstormé sept candidats. Trois sont mineurs (email hardcodé, fallback `try()`, TODO non clos), deux ne s'appliquent pas honnêtement à ce module (variables sensibles, OIDC federation — déjà en place sur les pipelines), un est trop nuancé pour ce post (drift detection partielle). Reste les trois ci-dessous, qui partagent la même propriété : ils n'auraient rien coûté à faire correctement le jour 1, et coûtent maintenant une refonte.

### 1. State Terraform monolithique sur toute la hiérarchie

Le module `AlzArchitecture` actuel produit, pour un environnement, **un seul state** qui contient :

- la hiérarchie complète des management groups,
- les subscription placements,
- toutes les policy definitions, policySets et assignments ALZ DINE,
- les assignments AMBA (alertes Prometheus baseline),
- la configuration Defender for Cloud (12 plans),
- les assignments Backup et DDoS.

Conséquence directe : un `terragrunt plan` sur ce dossier prend entre 4 et 8 minutes. Le state lock bloque toute autre opération sur ce périmètre pendant ce temps. Et surtout, n'importe quelle modification — même un changement d'email de contact — passe par un `apply` qui touche potentiellement les 200+ ressources du state.

Le blast radius est énorme par rapport au cycle de vie réel : les management groups bougent une fois par an, les policySets ALZ une fois par trimestre quand on bump la library, les assignments AMBA toutes les semaines parce que c'est là qu'on tune les seuils.

**La refonte.** Découper en au moins trois states :

- `alz-hierarchy` : MGs + subscription placement uniquement. Quasi-immutable.
- `alz-policies` : policySets ALZ DINE + Defender + DDoS + Backup. Bumps trimestriels.
- `alz-amba` : assignments AMBA et tuning d'alertes. Modifications fréquentes.

Les states aval consomment les outputs de `alz-hierarchy` (MG IDs, identités d'assignment) via les `dependency` blocks Terragrunt, pas via `terraform_remote_state` direct — pour garder le couplage à un seul mécanisme et éviter qu'un downstream lise un state qu'il n'a pas le droit de lire si on bouge le storage backend.

**La leçon transférable.** Le découpage de state n'est pas un détail technique, c'est une décision d'architecture. La règle qu'on essaie d'appliquer maintenant : *un state par cycle de vie × criticité*. Mettre dans un même state une ressource qui change 50 fois par an et une qui change 1 fois par an, c'est se condamner à des `plan` longs et à des reviews qui mélangent l'opérationnel et le structurel.

### 2. Pas de tests automatisés sur le wrapper

Le wrapper a `terraform validate` en CI, et c'est tout. Pas de `terraform test`, pas de conftest, pas de terratest, pas même un test de présence des outputs.

Conséquence : quand le module AVM upstream a bumpé de `0.12.x` à `0.13.0`, la signature de certains outputs a légèrement changé (renommage d'une clé dans `policy_assignment_identity_ids`). Notre `terraform validate` est passé. Le `terragrunt plan` sur l'environnement nprd est passé aussi parce que les mocks ne reflétaient pas la nouvelle structure. C'est seulement au moment où un module aval a essayé de consommer l'output que la rupture est apparue, en plein `apply`.

**La refonte.** À minima un fichier `tests/wrapper.tftest.hcl` qui :

- vérifie la présence et le type de chaque output (`output "management_group_ids" { value = ... }` doit rester un `map(string)` non vide),
- vérifie que les `policy_assignments_to_modify` reçoivent bien les paramètres attendus pour chaque MG ciblé,
- valide quelques scenarios de `defender_plans` (tout activé / tout désactivé / mix).

Ces tests tournent en `terraform test -plan-only`, ne déploient rien, prennent 30 secondes, et auraient attrapé le rename d'output upstream avant qu'on ne le subisse en prod.

**Ce que ces tests ne couvrent pas.** Ils valident la *forme* du wrapper, pas le *fond* du comportement des policies. Une policy `DeployIfNotExists` qui passe le test de signature peut très bien ne plus déployer ce qu'elle est censée déployer après un bump de library — typiquement parce qu'un paramètre a été renommé ou qu'une condition a changé dans le policySet upstream. Valider ça demande un test d'intégration sur une sandbox subscription dédiée, qui crée une ressource cible et vérifie que la remediation tourne. C'est une autre brique, hors scope du wrapper, et c'est une dette qu'on assume pour l'instant.

**La leçon transférable.** `terraform validate` ne valide pas grand-chose. C'est un parser HCL augmenté. Un wrapper qui n'a pas au moins un test de signature est un proxy aveugle : à chaque bump de la dépendance qu'il wrap, on découvre les changements de comportement en aval, pas en CI.

### 3. L'inventaire AKS hardcodé pour les exclusions VMSS

Le `vmss_policy_not_scopes` du sous-point précédent est aujourd'hui figé sur **un seul cluster AKS** :

```hcl
vmss_policy_not_scopes = [
  "/subscriptions/${include.root.locals.corp_subs.platform_api.id}/resourceGroups/rg-platform-api-${include.root.inputs.environment}-westeurope-aks-nodes",
]
```

Le commentaire au-dessus dit, mot pour mot : *"Pour ajouter un nouveau AKS, ajouter une entrée dans la liste"*. C'est honnête. C'est aussi un foot-gun. Le jour où une équipe spoke déploie un AKS sans toucher à `alz-architecture`, la policy VMSS s'applique aux nodes du nouveau cluster, et on retombe sur le bug de la section précédente. Le pipeline ne crie pas, le `terragrunt plan` du nouvel AKS ne mentionne rien — il faut aller lire le compliance report Azure pour comprendre.

**La refonte.** Centraliser l'inventaire des AKS dans un fichier `_global/aks_inventory.hcl` consommé par tous les modules qui en ont besoin :

- `alz-architecture` pour les `not_scopes` de policies VMSS,
- `container-insights` pour la liste des clusters à monitorer,
- `prometheus-collector` pour les DCR cibles,
- les alertes pour les scopes ARM.

Une seule source de vérité, une seule chose à mettre à jour, et chaque module dérive ce dont il a besoin.

**La leçon transférable.** Si une donnée structurelle vit en deux endroits, elle ne sera jamais synchro. La règle : *toute liste de ressources que plusieurs modules consomment doit vivre dans `_global/`*, et chaque module la dérive. C'est vrai pour les AKS, c'est vrai pour les VNets, c'est vrai pour les subscriptions, c'est vrai pour les contacts d'astreinte. Le coût de centralisation est faible. Le coût de désynchronisation se paie en incidents.

---

## Est-ce que je referais pareil aujourd'hui ?

**Le wrapping : oui, sans hésiter.** Le wrapper a été le bon véhicule pour matérialiser des choix de plateforme (posture Defender, conventions de tag, exclusions de scope) qui n'ont pas leur place dans un module générique. Le pinning, les retries et les `not_scopes` ne sont pas négociables et n'auraient pas trouvé leur place ailleurs.

**Le state monolithique et l'absence de tests : non, pas comme ça.** Si je devais reconstruire la chaîne demain, je découperais le state en trois dès le jour 1 et j'écrirais un `wrapper.tftest.hcl` minimal avant la première PR. Ces deux décisions auraient été quasi-gratuites au début et coûtent maintenant une refonte assumée.

L'AVM ALZ accelerator continuera d'évoluer. Notre wrapper aussi. La différence entre un wrapper qui vieillit bien et un wrapper qui devient une dette, c'est la rigueur du pinning, la présence de tests, et le découpage du blast radius. Ces trois corrections ne sont pas spécifiques à ALZ — elles s'appliquent à n'importe quel wrapper Terraform à l'échelle. Ce qui est spécifique à ALZ, c'est le coût de les ignorer : une hiérarchie de gouvernance qui dérive silencieusement est un problème d'audit, pas d'infra.

---

## Pour aller plus loin

- Module AVM ALZ accelerator : <https://github.com/Azure/terraform-azurerm-avm-ptn-alz>
- Provider `alz` : <https://registry.terraform.io/providers/Azure/alz>
- Azure Monitor Baseline Alerts (AMBA) : <https://github.com/Azure/azure-monitor-baseline-alerts>
- Doc officielle ALZ Terraform : <https://azure.github.io
