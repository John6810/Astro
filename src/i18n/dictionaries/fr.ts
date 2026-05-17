// Locale française — wording from the existing translations.ts `fr` block,
// preserved verbatim per migration spec.
import type { Dict } from "./en";

const dict: Dict = {
  meta_title:
    "Jonathan Aerts — Senior Cloud Platform Architect | Azure Landing Zone | Belgique · Luxembourg",
  meta_description:
    "Senior Cloud Platform Architect, 15+ ans d’IT. Azure Landing Zones from scratch, Terraform/GitOps, gouvernance enterprise. Belgique · Luxembourg · EU Remote.",

  // Side nav (aria-labels) + footer
  nav_about: "À propos",
  nav_experience: "Expérience",
  nav_skills: "Compétences",
  nav_projects: "Projets",
  nav_education: "Formation",
  nav_contact: "Contact",
  footer_built: "Built with Astro · Tailwind v4 · Inter",

  // Header
  hero_role: "Senior Cloud Platform Architect · Azure Landing Zone · Terraform/GitOps",
  hero_desc:
    'Senior Cloud Platform Architect avec <strong class="font-bold text-ink">15+ ans d’expérience IT</strong> et 5+ ans focalisés sur les environnements Azure enterprise. Spécialisé dans la conception et le déploiement d’<strong class="font-bold text-ink">Azure Landing Zones</strong> de A à Z — gouvernance, networking multi-région, et automatisation complète via Terraform/Terragrunt.',
  hero_label_email: "Email:",
  hero_label_site: "Site:",
  hero_label_from: "De:",
  hero_label_currently: "Actuellement:",
  hero_label_languages: "Langues:",
  hero_value_from: "Belgium · Luxembourg",
  hero_value_currently: "POST Luxembourg",
  hero_cta_cv: "Télécharger le CV",

  // Stats
  stat_years_label: "ans d’IT",
  stat_azure_label: "ans sur Azure",
  stat_alz_label: "Landing Zones from scratch",
  stat_subscriptions_label: "souscriptions Azure gouvernées",
  stat_budget_label: "budget piloté",
  stat_trained_label: "ingénieurs formés",

  // Sections
  section_experience: "Expérience professionnelle",
  section_skills: "Skills",
  section_projects: "Selected projects",
  section_education: "Formation, certifications & langues",
  section_contact: "Contact",

  // ── Experience: POST (job1) ──
  job1_title: "Senior Cloud Platform Architect",
  job1_company: "POST Luxembourg",
  job1_location: "Luxembourg",
  job1_date: "Août 2024 — Présent",
  job1_context:
    "Recruté pour bâtir solo la fondation cloud de POST Luxembourg — opérateur télécom et banque postale du Grand-Duché, supervisé par la CSSF. Mission : héberger les workloads bancaires critiques sur Azure dans un cadre Cloud Outsourcing conforme. Aucun existant à l’arrivée. 13 mois de delivery continue.",
  job1_b1:
    '<strong class="font-bold text-ink">Conçu et livré une Azure Landing Zone Enterprise-Scale</strong> sur <strong class="font-bold text-ink">26 souscriptions</strong> multi-région, alignée Microsoft CAF et Azure Verified Modules — base éligible pour héberger des workloads sous régulation bancaire.',
  job1_b2:
    '<strong class="font-bold text-ink">Aligné la plateforme sur les exigences réglementaires</strong> : contrôles dérivés <strong class="font-bold text-ink">CSSF Circular 22/806</strong> (Cloud Outsourcing), <strong class="font-bold text-ink">DORA</strong>, <strong class="font-bold text-ink">NIS2</strong> et <strong class="font-bold text-ink">ISO 27001</strong>, baselines <strong class="font-bold text-ink">CIS Microsoft Azure</strong>, <strong class="font-bold text-ink">zéro secret persistant</strong> (OIDC / Workload Identity end-to-end), Private Endpoints sur tous les PaaS, chiffrement client-managed généralisé.',
  job1_b3:
    '<strong class="font-bold text-ink">Industrialisé l’Infrastructure as Code</strong> : <strong class="font-bold text-ink">plus de 60 modules Terraform</strong> production-ready, pipeline Terragrunt unique sur tout le périmètre, drift detection automatisée — immutabilité et traçabilité full audit-ready.',
  job1_b4:
    '<strong class="font-bold text-ink">Bâti la plateforme applicative</strong> : Clusters AKS privés en GitOps (Argo CD), <strong class="font-bold text-ink">Azure Virtual Desktop</strong> (Host Pools, FSLogix ZRS, Private Endpoints) pour postes virtuels conformes, observabilité enterprise (Prometheus managé + Grafana, 20+ dashboards), alertes AMBA conformes aux recommandations Microsoft production.',
  job1_b5:
    '<strong class="font-bold text-ink">Formalisé la gouvernance interne</strong> : <strong class="font-bold text-ink">20 ADRs</strong>, 6 runbooks SRE, wiki enterprise de 10K lignes, conventions strictes naming / tagging / RBAC — fondation d’audit et d’onboarding pour les équipes futures.',
  job1_b6:
    '<strong class="font-bold text-ink">Conçoit la stratégie multi-cloud</strong> : Landing Zone AWS multi-compte en design (Control Tower, SCPs, IaC) pour répondre aux exigences de résilience et de diversification fournisseur posées par <strong class="font-bold text-ink">DORA</strong>.',
  job1_b7:
    '<strong class="font-bold text-ink">Outillé le projet d’une suite d’agents IA spécialisés</strong> — encodage des conventions et gotchas, génération assistée de modules et revues d’architecture accélérées.',
  exp_refs_eyebrow: "Référentiels",
  exp_sources_eyebrow: "Sources & références",
  job1_ref_label: "Référentiels",
  job1_sources_label: "Sources & références",
  job1_link_ms: "🔗 Microsoft Customer Story — POST & Azure →",
  job1_link_github: "📦 terraform-azurerm-modules — mes modules custom (open source) →",

  // ── Experience: Alten (job2) ──
  job2_title: "Cloud Architect — M365 & Azure Migration",
  job2_company: "Alten",
  job2_meta: "Mission : Aéroport de Luxembourg",
  job2_date: "Août 2023 — Juil. 2024",
  job2_context:
    "Mission consulting via Alten pour la modernisation IT de l’Aéroport de Luxembourg — infrastructure critique 24/7 du transport aérien luxembourgeois. Objectif double : migrer la messagerie vers Microsoft 365 et poser les premières fondations cloud de l’aéroport.",
  job2_b1:
    '<strong class="font-bold text-ink">Migré 500+ boîtes Exchange on-premises vers Microsoft 365</strong> — coexistence hybride, bascule progressive, retrait du on-prem, zéro perte de service.',
  job2_b2:
    '<strong class="font-bold text-ink">Conçu et déployé le premier Azure Landing Zone de l’aéroport</strong> — fondation modulaire alignée Microsoft CAF, posée pour héberger les futurs workloads de la DSI.',
  job2_b3:
    '<strong class="font-bold text-ink">Industrialisé une bibliothèque initiale de modules Terraform réutilisables</strong> — base IaC qui a préfiguré la stratégie de déploiement cloud du groupe.',
  job2_b4:
    '<strong class="font-bold text-ink">Durci la posture sécurité M365</strong> : Conditional Access, MFA généralisé, <strong class="font-bold text-ink">baselines CIS Microsoft 365</strong>, sensitivity labels, retention policies et Compliance Center.',
  job2_b5:
    '<strong class="font-bold text-ink">Migré les services d’identité vers Entra ID</strong> — convention RBAC, SSO pour les applications métier de l’aéroport.',

  // ── Experience: Astorg (job3) ──
  job3_title: "Cloud & Infrastructure Architect",
  job3_company: "Astorg",
  job3_meta: "Private Equity",
  job3_date: "Sep. 2021 — Juil. 2023",
  job3_context:
    "Modernisation globale de l’infrastructure IT d’Astorg — fonds de Private Equity européen, 250 utilisateurs, 6 bureaux internationaux (LU, FR, UK, DE, IT, US), supervisé par la CSSF au titre de l’AIFMD. Transformation d’un environnement legacy vers une architecture hybride Azure / Entra ID conforme.",
  job3_b1:
    '<strong class="font-bold text-ink">Conduit la transformation IT globale</strong> sur 6 bureaux internationaux — déploiements on-site (serveurs, stockage, réseau, endpoints), unification du réseau inter-sites via <strong class="font-bold text-ink">Cisco Meraki SD-WAN</strong>, harmonisation des standards.',
  job3_b2:
    '<strong class="font-bold text-ink">Conçu l’architecture hybride Azure</strong> : VNETs, Private Endpoints, Key Vault, Entra ID — fondations Terraform développées from scratch.',
  job3_b3:
    '<strong class="font-bold text-ink">Déployé l’endpoint management unifié</strong> : <strong class="font-bold text-ink">250 postes</strong> et 100+ devices mobiles via Microsoft Intune, policies de compliance et de configuration alignées CIS.',
  job3_b4:
    '<strong class="font-bold text-ink">Aligné la plateforme sur les exigences réglementaires PE</strong> : <strong class="font-bold text-ink">CSSF AIFMD</strong>, <strong class="font-bold text-ink">ISO 27001</strong>, baselines <strong class="font-bold text-ink">CIS Microsoft</strong>, gouvernance RBAC + PIM, Azure Policy systémique.',
  job3_b5:
    '<strong class="font-bold text-ink">Piloté le budget renouvellement infrastructure</strong> (~<strong class="font-bold text-ink">€500 K</strong>) : sélection des fournisseurs, négociation, procurement multi-pays.',

  // ── Experience: Guardian (job4) ──
  job4_title: "IT-OT System Administrator",
  job4_company: "Guardian Industries",
  job4_meta: "Luxembourg",
  job4_date: "Juil. 2019 — Août 2021",
  job4_context:
    "Seul administrateur IT/OT d’un site industriel Guardian Industries — fabrication de verre en production continue 24/7, ~100 utilisateurs. Mission : garantir la continuité IT sous contraintes de production, sans interruption tolérée.",
  job4_b1:
    '<strong class="font-bold text-ink">Opéré seul l’environnement VMware production</strong> : 10+ hosts ESXi, infrastructure RDS/VDI pour les opérations, sauvegardes et plan de reprise.',
  job4_b2:
    '<strong class="font-bold text-ink">Géré l’infrastructure réseau Cisco</strong> : LAN/WAN, segmentation <strong class="font-bold text-ink">IT / OT</strong>, sécurité périmétrique du site industriel.',
  job4_b3:
    '<strong class="font-bold text-ink">Déployé les postes thin client en bord de ligne</strong> : solutions durcies pour environnement industriel, intégration aux applications métier de production.',
  job4_b4:
    '<strong class="font-bold text-ink">Garanti la continuité opérationnelle 24/7</strong> : <strong class="font-bold text-ink">zéro interruption imputable à l’IT sur 2 ans</strong>, support on-call permanent sous contraintes de production continue.',

  // ── Experience: GMS-it (job5) ──
  job5_title: "System Engineer — Microsoft 365 & Infrastructure",
  job5_company: "GMS-it",
  job5_meta: "Luxembourg",
  job5_date: "Oct. 2016 — Août 2019",
  job5_context:
    'Ingénieur système chez GMS-it (<strong class="font-bold text-ink">MSP luxembourgeois</strong>) — délivré bout-en-bout des projets Microsoft 365 et infrastructure pour <strong class="font-bold text-ink">7 clients SMB et fiduciaires luxembourgeois</strong>. Ownership complet : design technique, déploiement, support.',
  job5_b1:
    '<strong class="font-bold text-ink">Mené les migrations Exchange on-premises vers Microsoft 365</strong> : analyse de coexistence, setup des tenants, bascule des mailboxes, retrait du legacy on-prem.',
  job5_b2:
    '<strong class="font-bold text-ink">Conçu et livré les projets d’infrastructure clients</strong> : modernisation réseau, virtualisation, sécurité périmétrique, sauvegardes.',
  job5_b3:
    '<strong class="font-bold text-ink">Industrialisé les standards de déploiement M365</strong> : Conditional Access, MFA, RBAC, baselines de hardening — déclinés sur les 7 environnements clients.',
  job5_b4:
    '<strong class="font-bold text-ink">Assuré le run et l’évolution continue</strong> : support N3, gestion des incidents critiques, planification des évolutions infrastructure.',

  // ── Experience: Computacenter (job6) ──
  job6_title: "VMware Consultant — Global Virtualization Project",
  job6_company: "Computacenter",
  job6_meta: "Mission : TI Automotive · Belgique",
  job6_date: "Jan. 2014 — Sep. 2016",
  job6_context:
    'Mission consulting via Computacenter pour le projet de virtualisation globale de <strong class="font-bold text-ink">TI Automotive</strong> — équipementier automobile tier-1, présent sur plusieurs usines internationales. Environnement multiculturel et distribué, déplacements multi-pays.',
  job6_b1:
    '<strong class="font-bold text-ink">Conduit le projet global de virtualisation VMware</strong> : <strong class="font-bold text-ink">200+ hosts ESXi</strong> sur l’ensemble des sites de production internationaux.',
  job6_b2:
    '<strong class="font-bold text-ink">Réalisé les migrations P2V</strong> : bascule des serveurs physiques legacy vers vSphere, déploiements on-site dans plusieurs pays.',
  job6_b3:
    '<strong class="font-bold text-ink">Administré l’infrastructure vSphere à grande échelle</strong> : provisionnement, troubleshooting performance, optimisation des ressources sur le périmètre global.',

  // ── Experience: ETNIC (job7) ──
  job7_title: "System & Network Administrator",
  job7_company: "ETNIC",
  job7_meta: "Bruxelles",
  job7_date: "Sep. 2007 — Déc. 2013",
  job7_context:
    'Administrateur système et réseau chez <strong class="font-bold text-ink">ETNIC</strong> — opérateur IT public de la <strong class="font-bold text-ink">Fédération Wallonie-Bruxelles</strong>, supportant le système éducatif francophone belge (écoles et institutions). Périmètre infrastructure étendu : réseau Cisco, virtualisation VMware, parc 100+ serveurs Windows.',
  job7_b1:
    '<strong class="font-bold text-ink">Administré le réseau Cisco</strong> : switching, routing, segmentation VLAN à l’échelle de l’organisation.',
  job7_b2:
    '<strong class="font-bold text-ink">Géré l’infrastructure VMware</strong> : management des hosts ESXi, provisioning et maintenance des VMs.',
  job7_b3:
    '<strong class="font-bold text-ink">Maintenu un parc de 100+ serveurs Windows</strong> : administration système, support des écoles et institutions de la Communauté française de Belgique.',

  // Skills
  skills_mastering: "Je maîtrise",
  skills_learning: "J’apprends",
  skills_speak: "Je parle",
  cat_cloud: "Cloud & Architecture",
  cat_iac: "IaC & GitOps",
  cat_network: "Networking & Security",
  cat_identity: "Identity & Governance",
  cat_observ: "Observability & Adjacent",
  level_expert: "EXPERT",
  level_avance: "AVANCÉ",
  lang_fr: "Français — Natif",
  lang_en: "Anglais — C1 courant",
  lang_jp: "日本語 — JLPT N5 certifié · N2 en préparation",

  // Selected Projects
  proj1_title: "Terraform Azure Module Library",
  proj1_tagline: "Bibliothèque open source · alignée AVM / CAF",
  proj1_desc:
    "Bibliothèque open source de modules Terraform Azure que je maintiens — networking, AKS, Key Vault, RBAC, Private Endpoints, FinOps Hub, Palo Alto HA, et plus. Patterns AVM (validation, lookup, locks), telemetry, diagnostic settings et naming conventions par défaut.",
  proj1_link: "📦 github.com/John6810/terraform-azurerm-modules →",
  proj2_title: "Distributed Scoring Platform",
  proj2_tagline: "Event-driven architecture · K8s / ArgoCD · 359 tests",
  proj2_desc:
    "Plateforme distribuée de scoring multi-critères déployée en GitOps sur cluster Kubernetes personnel. Architecture multi-couches : CLI (19 commandes), REST API FastAPI (19 endpoints), CronJobs Kubernetes pour les pipelines de scan automatique, bot Discord companion pour les notifications. Logique métier modulaire, validation par 359 tests pytest, déploiement GitOps via ArgoCD. Use case d’application : analyse quantitative sur données financières publiques.",
  proj3_title: "Homelab Kubernetes",
  proj3_tagline: "Cluster bare-metal · GitOps end-to-end",
  proj3_desc:
    "Cluster Kubernetes 2 nœuds bare-metal, GitOps via ArgoCD ApplicationSet, observabilité Prometheus/Grafana, ingress Traefik, MetalLB pour L2 load balancing, stockage hybride SMB/RawFile CSI. Sealed Secrets pour la gestion des secrets en GitOps. Sandbox de validation des patterns avant production.",

  // Education
  edu_eb_diplome: "Diplôme",
  edu_eb_langs: "Langues",
  edu_eb_certs_done: "Certifications obtenues",
  edu_eb_certs_wip: "En cours",
  edu_degree_title: "Bachelier en informatique et systèmes",
  edu_degree_school: "Haute École de la Province de Liège, Belgique · 2003 – 2007",
  edu_certs_done_title: "Certifications obtenues",
  edu_certs_wip_title: "En cours",
  edu_langs_title: "Langues",

  // Contact
  contact_desc:
    "Rôles cibles : Senior / Principal Cloud Architect, Cloud Solution Architect, ou Customer Success Engineer — chez un hyperscaler (Microsoft, AWS, HashiCorp), une scale-up tech ou un environnement enterprise sous régulation.",
  contact_loc: "Belgium · Luxembourg",
};

export default dict;
