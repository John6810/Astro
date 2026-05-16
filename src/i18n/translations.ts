export type Lang = "fr" | "en" | "jp";
export type Translations = Record<string, string>;
export type TranslationMap = Record<Lang, Translations>;

/**
 * Translation map for FR / EN / JP.
 * Keys are stable identifiers; values may contain inline HTML
 * (e.g. <strong>) which the runtime applies via innerHTML.
 *
 * Technical terms (Azure, Terraform, AKS, CSSF, AZ-104…) stay
 * identical across languages by design. Section titles, labels,
 * prose, and date strings are localised.
 */
export const T: TranslationMap = {
  // ───────────── FRANÇAIS ─────────────
  fr: {
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
    stat_modules_label: "modules Terraform",
    stat_budget_label: "budget annuel",
    stat_trained_label: "ingénieurs formés",
    stat_alz_label: "Landing Zones",

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
    proj2_title: "Stock Screener",
    proj2_tagline: "Screening quantitatif · K8s / ArgoCD · 359 tests",
    proj2_desc:
      "Plateforme personnelle de screening quantitatif et gestion d’ordres pour swing trading sur Interactive Brokers. Architecture multi-couches : CLI (19 commandes), REST API FastAPI (19 endpoints), CronJobs K8s pour le scan automatique, bot Discord companion. Scoring technique + fondamental, risk management automatisé (heat portfolio, exposition sectorielle, earnings blackout), journal et performance tracking. Déployée en GitOps via ArgoCD sur le cluster homelab.",
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
    // (cert items, langs labels stay in shared technical form — reused above)
    edu_certs_done_title: "Certifications obtenues",
    edu_certs_wip_title: "En cours",
    edu_langs_title: "Langues",

    // Contact
    contact_desc:
      "Rôles cibles : Senior / Principal Cloud Architect, Cloud Solution Architect, ou Customer Success Engineer — chez un hyperscaler (Microsoft, AWS, HashiCorp), une scale-up tech ou un environnement enterprise sous régulation.",
    contact_loc: "Belgium · Luxembourg",
  },

  // ───────────── ENGLISH ─────────────
  en: {
    // Side nav + footer
    nav_about: "About",
    nav_experience: "Experience",
    nav_skills: "Skills",
    nav_projects: "Projects",
    nav_education: "Education",
    nav_contact: "Contact",
    footer_built: "Built with Astro · Tailwind v4 · Inter",

    // Header
    hero_role: "Senior Cloud Platform Architect · Azure Landing Zone · Terraform/GitOps",
    hero_desc:
      'Senior Cloud Platform Architect with <strong class="font-bold text-ink">15+ years of IT experience</strong> and 5+ years focused on enterprise Azure environments. Specialised in designing and deploying <strong class="font-bold text-ink">Azure Landing Zones</strong> end-to-end — governance, multi-region networking, and full automation via Terraform/Terragrunt.',
    hero_label_email: "Email:",
    hero_label_site: "Site:",
    hero_label_from: "From:",
    hero_label_currently: "Currently:",
    hero_label_languages: "Languages:",
    hero_value_from: "Belgium · Luxembourg",
    hero_value_currently: "POST Luxembourg",
    hero_cta_cv: "Download CV",

    // Stats
    stat_years_label: "years in IT",
    stat_azure_label: "years on Azure",
    stat_modules_label: "Terraform modules",
    stat_budget_label: "annual budget",
    stat_trained_label: "engineers trained",
    stat_alz_label: "Landing Zones",

    // Sections
    section_experience: "Professional experience",
    section_skills: "Skills",
    section_projects: "Selected projects",
    section_education: "Education, certifications & languages",
    section_contact: "Contact",

    // ── Experience: POST (job1) ──
    job1_title: "Senior Cloud Platform Architect",
    job1_company: "POST Luxembourg",
    job1_location: "Luxembourg",
    job1_date: "Aug 2024 — Present",
    job1_context:
      "Hired to single-handedly build POST Luxembourg’s cloud foundation — Grand Duchy telecom operator and postal bank, supervised by the CSSF. Mission: host the critical banking workloads on Azure under a compliant Cloud Outsourcing framework. No prior cloud footprint. 13 months of continuous delivery.",
    job1_b1:
      '<strong class="font-bold text-ink">Designed and delivered an Enterprise-Scale Azure Landing Zone</strong> across <strong class="font-bold text-ink">26 subscriptions</strong>, multi-region, aligned with Microsoft CAF and Azure Verified Modules — foundation eligible to host workloads under banking regulation.',
    job1_b2:
      '<strong class="font-bold text-ink">Aligned the platform with regulatory requirements</strong>: controls derived from <strong class="font-bold text-ink">CSSF Circular 22/806</strong> (Cloud Outsourcing), <strong class="font-bold text-ink">DORA</strong>, <strong class="font-bold text-ink">NIS2</strong> and <strong class="font-bold text-ink">ISO 27001</strong>, <strong class="font-bold text-ink">CIS Microsoft Azure</strong> baselines, <strong class="font-bold text-ink">zero persistent secrets</strong> (OIDC / Workload Identity end-to-end), Private Endpoints across all PaaS, customer-managed encryption everywhere.',
    job1_b3:
      '<strong class="font-bold text-ink">Industrialised Infrastructure as Code</strong>: <strong class="font-bold text-ink">60+ production-ready Terraform modules</strong>, single Terragrunt pipeline across the whole perimeter, automated drift detection — immutability and full audit-ready traceability.',
    job1_b4:
      '<strong class="font-bold text-ink">Built the application platform</strong>: private AKS clusters in GitOps (Argo CD), <strong class="font-bold text-ink">Azure Virtual Desktop</strong> (Host Pools, FSLogix ZRS, Private Endpoints) for compliant virtual desktops, enterprise-grade observability (managed Prometheus + Grafana, 20+ dashboards), AMBA alerts aligned with Microsoft production guidance.',
    job1_b5:
      '<strong class="font-bold text-ink">Formalised internal governance</strong>: <strong class="font-bold text-ink">20 ADRs</strong>, 6 SRE runbooks, 10K-line enterprise wiki, strict naming / tagging / RBAC conventions — audit and onboarding foundation for future teams.',
    job1_b6:
      '<strong class="font-bold text-ink">Designing the multi-cloud strategy</strong>: multi-account AWS Landing Zone in design (Control Tower, SCPs, IaC) to address resilience and supplier diversification requirements imposed by <strong class="font-bold text-ink">DORA</strong>.',
    job1_b7:
      '<strong class="font-bold text-ink">Tooled the project with a suite of specialised AI agents</strong> — codified conventions and gotchas, assisted module generation and accelerated architecture reviews.',
    job1_ref_label: "Standards",
    job1_sources_label: "Sources & references",
    job1_link_ms: "🔗 Microsoft Customer Story — POST & Azure →",
    job1_link_github: "📦 terraform-azurerm-modules — my custom modules (open source) →",

    // ── Experience: Alten (job2) ──
    job2_title: "Cloud Architect — M365 & Azure Migration",
    job2_company: "Alten",
    job2_meta: "Mission: Luxembourg Airport",
    job2_date: "Aug 2023 — Jul 2024",
    job2_context:
      "Consulting mission via Alten for the IT modernisation of Luxembourg Airport — 24/7 critical infrastructure of Luxembourg air transport. Twofold goal: migrate mail to Microsoft 365 and lay the airport’s first cloud foundations.",
    job2_b1:
      '<strong class="font-bold text-ink">Migrated 500+ on-premises Exchange mailboxes to Microsoft 365</strong> — hybrid coexistence, progressive cutover, on-prem decommissioning, zero service loss.',
    job2_b2:
      '<strong class="font-bold text-ink">Designed and deployed the airport’s first Azure Landing Zone</strong> — modular foundation aligned with Microsoft CAF, ready to host the IT department’s future workloads.',
    job2_b3:
      '<strong class="font-bold text-ink">Industrialised an initial library of reusable Terraform modules</strong> — IaC baseline that shaped the group’s cloud deployment strategy.',
    job2_b4:
      '<strong class="font-bold text-ink">Hardened the M365 security posture</strong>: Conditional Access, MFA across the board, <strong class="font-bold text-ink">CIS Microsoft 365 baselines</strong>, sensitivity labels, retention policies and Compliance Center.',
    job2_b5:
      '<strong class="font-bold text-ink">Migrated identity services to Entra ID</strong> — RBAC convention, SSO for the airport’s business applications.',

    // ── Experience: Astorg (job3) ──
    job3_title: "Cloud & Infrastructure Architect",
    job3_company: "Astorg",
    job3_meta: "Private Equity",
    job3_date: "Sep 2021 — Jul 2023",
    job3_context:
      "Global IT infrastructure modernisation at Astorg — European Private Equity fund, 250 users, 6 international offices (LU, FR, UK, DE, IT, US), supervised by the CSSF under AIFMD. Transformation from a legacy environment to a compliant hybrid Azure / Entra ID architecture.",
    job3_b1:
      '<strong class="font-bold text-ink">Led the global IT transformation</strong> across 6 international offices — on-site deployments (servers, storage, network, endpoints), inter-site network unification via <strong class="font-bold text-ink">Cisco Meraki SD-WAN</strong>, standards harmonisation.',
    job3_b2:
      '<strong class="font-bold text-ink">Designed the hybrid Azure architecture</strong>: VNETs, Private Endpoints, Key Vault, Entra ID — Terraform foundations developed from scratch.',
    job3_b3:
      '<strong class="font-bold text-ink">Deployed unified endpoint management</strong>: <strong class="font-bold text-ink">250 endpoints</strong> and 100+ mobile devices via Microsoft Intune, compliance and configuration policies aligned with CIS.',
    job3_b4:
      '<strong class="font-bold text-ink">Aligned the platform with PE regulatory requirements</strong>: <strong class="font-bold text-ink">CSSF AIFMD</strong>, <strong class="font-bold text-ink">ISO 27001</strong>, <strong class="font-bold text-ink">CIS Microsoft</strong> baselines, RBAC + PIM governance, systemic Azure Policy.',
    job3_b5:
      '<strong class="font-bold text-ink">Managed the infrastructure renewal budget</strong> (~<strong class="font-bold text-ink">€500K</strong>): vendor selection, negotiation, multi-country procurement.',

    // ── Experience: Guardian (job4) ──
    job4_title: "IT-OT System Administrator",
    job4_company: "Guardian Industries",
    job4_meta: "Luxembourg",
    job4_date: "Jul 2019 — Aug 2021",
    job4_context:
      "Sole IT/OT administrator for a Guardian Industries industrial site — 24/7 continuous-production glass manufacturing, ~100 users. Mission: guarantee IT continuity under production constraints, with zero tolerance for outage.",
    job4_b1:
      '<strong class="font-bold text-ink">Single-handedly operated the production VMware environment</strong>: 10+ ESXi hosts, RDS/VDI infrastructure for operations, backups and recovery plan.',
    job4_b2:
      '<strong class="font-bold text-ink">Ran the Cisco network infrastructure</strong>: LAN/WAN, <strong class="font-bold text-ink">IT / OT</strong> segmentation, perimeter security for the industrial site.',
    job4_b3:
      '<strong class="font-bold text-ink">Deployed line-edge thin clients</strong>: hardened solutions for the industrial environment, integration with production business applications.',
    job4_b4:
      '<strong class="font-bold text-ink">Guaranteed 24/7 operational continuity</strong>: <strong class="font-bold text-ink">zero IT-attributable outage over 2 years</strong>, permanent on-call support under continuous production constraints.',

    // ── Experience: GMS-it (job5) ──
    job5_title: "System Engineer — Microsoft 365 & Infrastructure",
    job5_company: "GMS-it",
    job5_meta: "Luxembourg",
    job5_date: "Oct 2016 — Aug 2019",
    job5_context:
      'Systems engineer at GMS-it (<strong class="font-bold text-ink">Luxembourg MSP</strong>) — delivered end-to-end Microsoft 365 and infrastructure projects for <strong class="font-bold text-ink">7 Luxembourg SMB and trust company clients</strong>. Full ownership: technical design, deployment, support.',
    job5_b1:
      '<strong class="font-bold text-ink">Led Exchange on-prem to Microsoft 365 migrations</strong>: coexistence analysis, tenant setup, mailbox cutover, legacy on-prem decommissioning.',
    job5_b2:
      '<strong class="font-bold text-ink">Designed and delivered client infrastructure projects</strong>: network modernisation, virtualisation, perimeter security, backups.',
    job5_b3:
      '<strong class="font-bold text-ink">Industrialised M365 deployment standards</strong>: Conditional Access, MFA, RBAC, hardening baselines — rolled out across the 7 client environments.',
    job5_b4:
      '<strong class="font-bold text-ink">Ensured run & continuous evolution</strong>: L3 support, critical incident management, infrastructure roadmap planning.',

    // ── Experience: Computacenter (job6) ──
    job6_title: "VMware Consultant — Global Virtualization Project",
    job6_company: "Computacenter",
    job6_meta: "Mission: TI Automotive · Belgium",
    job6_date: "Jan 2014 — Sep 2016",
    job6_context:
      'Consulting mission via Computacenter for <strong class="font-bold text-ink">TI Automotive</strong>’s global virtualisation project — tier-1 automotive supplier with multiple international plants. Multicultural and distributed environment, multi-country travel.',
    job6_b1:
      '<strong class="font-bold text-ink">Led the global VMware virtualisation project</strong>: <strong class="font-bold text-ink">200+ ESXi hosts</strong> across all international production sites.',
    job6_b2:
      '<strong class="font-bold text-ink">Performed P2V migrations</strong>: legacy physical server cutover to vSphere, on-site deployments in multiple countries.',
    job6_b3:
      '<strong class="font-bold text-ink">Administered large-scale vSphere infrastructure</strong>: provisioning, performance troubleshooting, resource optimisation across the global perimeter.',

    // ── Experience: ETNIC (job7) ──
    job7_title: "System & Network Administrator",
    job7_company: "ETNIC",
    job7_meta: "Brussels",
    job7_date: "Sep 2007 — Dec 2013",
    job7_context:
      'System and network administrator at <strong class="font-bold text-ink">ETNIC</strong> — public IT operator of the <strong class="font-bold text-ink">Wallonia-Brussels Federation</strong>, supporting the Belgian French-speaking education system (schools and institutions). Broad infrastructure scope: Cisco network, VMware virtualisation, 100+ Windows servers.',
    job7_b1:
      '<strong class="font-bold text-ink">Administered the Cisco network</strong>: switching, routing, VLAN segmentation at organisation scale.',
    job7_b2:
      '<strong class="font-bold text-ink">Managed the VMware infrastructure</strong>: ESXi host management, VM provisioning and maintenance.',
    job7_b3:
      '<strong class="font-bold text-ink">Maintained a fleet of 100+ Windows servers</strong>: system administration, support for schools and institutions of the French-speaking Community of Belgium.',

    // Skills
    skills_mastering: "I know",
    skills_learning: "Learning",
    skills_speak: "I speak",
    cat_cloud: "Cloud & Architecture",
    cat_iac: "IaC & GitOps",
    cat_network: "Networking & Security",
    cat_identity: "Identity & Governance",
    cat_observ: "Observability & Adjacent",
    level_expert: "EXPERT",
    level_avance: "ADVANCED",
    lang_fr: "French — Native",
    lang_en: "English — C1 fluent",
    lang_jp: "日本語 — JLPT N5 certified · N2 in progress",

    // Selected Projects
    proj1_title: "Terraform Azure Module Library",
    proj1_tagline: "Open source library · AVM / CAF-aligned",
    proj1_desc:
      "Open source library of Azure Terraform modules I maintain — networking, AKS, Key Vault, RBAC, Private Endpoints, FinOps Hub, Palo Alto HA, and more. AVM patterns (validation, lookup, locks), telemetry, diagnostic settings and naming conventions by default.",
    proj1_link: "📦 github.com/John6810/terraform-azurerm-modules →",
    proj2_title: "Stock Screener",
    proj2_tagline: "Quant screening · K8s / ArgoCD · 359 tests",
    proj2_desc:
      "Personal platform for quantitative screening and order management for swing trading on Interactive Brokers. Multi-layer architecture: CLI (19 commands), FastAPI REST (19 endpoints), K8s CronJobs for automated scans, companion Discord bot. Technical + fundamental scoring, automated risk management (portfolio heat, sector exposure, earnings blackout), journal and performance tracking. Deployed in GitOps via ArgoCD on the homelab cluster.",
    proj3_title: "Homelab Kubernetes",
    proj3_tagline: "Bare-metal cluster · GitOps end-to-end",
    proj3_desc:
      "Bare-metal 2-node Kubernetes cluster, GitOps via ArgoCD ApplicationSet, Prometheus/Grafana observability, Traefik ingress, MetalLB for L2 load balancing, hybrid SMB/RawFile CSI storage. Sealed Secrets for GitOps-managed secrets. Sandbox for validating patterns before production.",

    // Education
    edu_eb_diplome: "Degree",
    edu_eb_langs: "Languages",
    edu_eb_certs_done: "Certifications obtained",
    edu_eb_certs_wip: "In progress",
    edu_degree_title: "Bachelor — Computer Science & Systems",
    edu_degree_school: "Haute École de la Province de Liège, Belgium · 2003 – 2007",
    edu_certs_done_title: "Certifications obtained",
    edu_certs_wip_title: "In progress",
    edu_langs_title: "Languages",

    // Contact
    contact_desc:
      "Target roles: Senior / Principal Cloud Architect, Cloud Solution Architect, or Customer Success Engineer — at a hyperscaler (Microsoft, AWS, HashiCorp), a tech scale-up or a regulated enterprise environment.",
    contact_loc: "Belgium · Luxembourg",
  },

  // ───────────── 日本語 ─────────────
  jp: {
    // Side nav + footer
    nav_about: "プロフィール",
    nav_experience: "職務経歴",
    nav_skills: "スキル",
    nav_projects: "プロジェクト",
    nav_education: "学歴",
    nav_contact: "連絡先",
    footer_built: "Built with Astro · Tailwind v4 · Inter",

    // Header
    hero_role: "Senior Cloud Platform Architect · Azure Landing Zone · Terraform/GitOps",
    hero_desc:
      '<strong class="font-bold text-ink">15年以上のIT経験</strong>と5年以上のAzureエンタープライズ環境を専門とするシニアクラウドプラットフォームアーキテクト。<strong class="font-bold text-ink">Azure Landing Zone</strong>のゼロからの設計・展開、ガバナンス、マルチリージョンネットワーキング、Terraform/Terragruntによる完全自動化を専門としています。',
    hero_label_email: "Email:",
    hero_label_site: "Site:",
    hero_label_from: "居住地:",
    hero_label_currently: "現職:",
    hero_label_languages: "言語:",
    hero_value_from: "Belgium · Luxembourg",
    hero_value_currently: "POST Luxembourg",
    hero_cta_cv: "履歴書ダウンロード",

    // Stats
    stat_years_label: "年のIT経験",
    stat_azure_label: "年のAzure経験",
    stat_modules_label: "Terraformモジュール",
    stat_budget_label: "年間予算",
    stat_trained_label: "名のエンジニア育成",
    stat_alz_label: "Landing Zones",

    // Sections
    section_experience: "職務経歴",
    section_skills: "スキル",
    section_projects: "主要プロジェクト",
    section_education: "学歴・資格・言語",
    section_contact: "連絡先",

    // ── Experience: POST (job1) ──
    job1_title: "Senior Cloud Platform Architect",
    job1_company: "POST Luxembourg",
    job1_location: "ルクセンブルク",
    job1_date: "2024年8月 — 現在",
    job1_context:
      "POST Luxembourg（ルクセンブルクの通信事業者および郵便銀行、CSSF監督下）のクラウド基盤をゼロから単独で構築するために採用。ミッション：銀行業務の重要ワークロードを、コンプライアンス準拠のCloud Outsourcingの枠組みでAzureに収容する。前任なし。13ヶ月間の継続的デリバリー。",
    job1_b1:
      '<strong class="font-bold text-ink">Enterprise-Scale Azure Landing Zoneを設計・展開</strong> — <strong class="font-bold text-ink">26サブスクリプション</strong>、マルチリージョン、Microsoft CAFおよびAzure Verified Modules準拠、銀行規制下のワークロードを収容可能な基盤。',
    job1_b2:
      '<strong class="font-bold text-ink">規制要件にプラットフォームを整合</strong>：<strong class="font-bold text-ink">CSSF Circular 22/806</strong>（Cloud Outsourcing）、<strong class="font-bold text-ink">DORA</strong>、<strong class="font-bold text-ink">NIS2</strong>、<strong class="font-bold text-ink">ISO 27001</strong>由来の統制、<strong class="font-bold text-ink">CIS Microsoft Azure</strong>ベースライン、<strong class="font-bold text-ink">永続的シークレットゼロ</strong>（OIDC / Workload Identity エンドツーエンド）、全PaaSへのPrivate Endpoints、顧客管理鍵暗号化を全面採用。',
    job1_b3:
      '<strong class="font-bold text-ink">IaCを工業化</strong>：<strong class="font-bold text-ink">60以上のプロダクションレディTerraformモジュール</strong>、全領域共通のTerragruntパイプライン、自動ドリフト検出 — イミュータビリティと監査対応のトレーサビリティを確保。',
    job1_b4:
      '<strong class="font-bold text-ink">アプリケーション基盤を構築</strong>：GitOps（Argo CD）によるプライベートAKSクラスター、<strong class="font-bold text-ink">Azure Virtual Desktop</strong>（Host Pools、FSLogix ZRS、Private Endpoints）による準拠仮想デスクトップ、エンタープライズ級の可観測性（マネージドPrometheus + Grafana、20以上のダッシュボード）、Microsoftプロダクション推奨に準拠したAMBAアラート。',
    job1_b5:
      '<strong class="font-bold text-ink">内部ガバナンスを文書化</strong>：<strong class="font-bold text-ink">20件のADR</strong>、6件のSREランブック、1万行のエンタープライズWiki、命名 / タギング / RBAC の厳格な規約 — 監査と将来のチーム受入れのための基盤。',
    job1_b6:
      '<strong class="font-bold text-ink">マルチクラウド戦略を設計中</strong>：<strong class="font-bold text-ink">DORA</strong>が要求するレジリエンスとサプライヤー多様化に対応するため、AWS マルチアカウント Landing Zone（Control Tower、SCPs、IaC）を設計中。',
    job1_b7:
      '<strong class="font-bold text-ink">プロジェクトに専門化AIエージェント群を導入</strong> — 規約とハマりどころのコード化、モジュール生成支援、アーキテクチャレビューの加速化。',
    job1_ref_label: "準拠規格",
    job1_sources_label: "ソース・参考資料",
    job1_link_ms: "🔗 Microsoft Customer Story — POST & Azure →",
    job1_link_github: "📦 terraform-azurerm-modules — 自作モジュール（オープンソース） →",

    // ── Experience: Alten (job2) ──
    job2_title: "Cloud Architect — M365 & Azureマイグレーション",
    job2_company: "Alten",
    job2_meta: "ミッション：ルクセンブルク空港",
    job2_date: "2023年8月 — 2024年7月",
    job2_context:
      "ルクセンブルク空港のIT近代化のため、Alten経由でコンサルティングミッション — ルクセンブルク航空輸送の24時間365日稼働の重要インフラ。二重の目標：メールをMicrosoft 365に移行し、空港初のクラウド基盤を整備すること。",
    job2_b1:
      '<strong class="font-bold text-ink">オンプレミスExchangeのメールボックス500超をMicrosoft 365へ移行</strong> — ハイブリッド共存、段階的切替、オンプレミス撤去、サービス無停止。',
    job2_b2:
      '<strong class="font-bold text-ink">空港初のAzure Landing Zoneを設計・展開</strong> — Microsoft CAFに準拠したモジュラー基盤、情報システム部門の将来のワークロードを収容可能。',
    job2_b3:
      '<strong class="font-bold text-ink">再利用可能なTerraformモジュールの初期ライブラリを整備</strong> — グループのクラウド展開戦略を方向づけたIaCベースライン。',
    job2_b4:
      '<strong class="font-bold text-ink">M365のセキュリティ態勢を強化</strong>：Conditional Access、MFA全面適用、<strong class="font-bold text-ink">CIS Microsoft 365 ベースライン</strong>、機密ラベル、保持ポリシー、Compliance Center。',
    job2_b5:
      '<strong class="font-bold text-ink">IDサービスをEntra IDに移行</strong> — RBAC規約、空港業務アプリケーションのSSO。',

    // ── Experience: Astorg (job3) ──
    job3_title: "Cloud & インフラアーキテクト",
    job3_company: "Astorg",
    job3_meta: "Private Equity",
    job3_date: "2021年9月 — 2023年7月",
    job3_context:
      "Astorg（欧州プライベートエクイティファンド、250ユーザー、国際6拠点：LU、FR、UK、DE、IT、US、CSSFのAIFMD監督下）のITインフラのグローバル近代化。レガシー環境から、コンプライアンス準拠のAzure / Entra IDハイブリッドアーキテクチャへの転換。",
    job3_b1:
      '<strong class="font-bold text-ink">グローバルIT変革を主導</strong> — 6つの国際拠点でのオンサイト展開（サーバー、ストレージ、ネットワーク、エンドポイント）、<strong class="font-bold text-ink">Cisco Meraki SD-WAN</strong>による拠点間ネットワーク統合、標準の統一。',
    job3_b2:
      '<strong class="font-bold text-ink">Azureハイブリッドアーキテクチャを設計</strong>：VNETs、Private Endpoints、Key Vault、Entra ID — ゼロからのTerraform基盤構築。',
    job3_b3:
      '<strong class="font-bold text-ink">統合エンドポイント管理を展開</strong>：Microsoft Intune経由で<strong class="font-bold text-ink">250台</strong>のPCと100台超のモバイルデバイス、CIS準拠のコンプライアンスおよび構成ポリシー。',
    job3_b4:
      '<strong class="font-bold text-ink">PE規制要件にプラットフォームを整合</strong>：<strong class="font-bold text-ink">CSSF AIFMD</strong>、<strong class="font-bold text-ink">ISO 27001</strong>、<strong class="font-bold text-ink">CIS Microsoft</strong>ベースライン、RBAC + PIMガバナンス、システム全体のAzure Policy。',
    job3_b5:
      '<strong class="font-bold text-ink">インフラ刷新予算を運用</strong>（約<strong class="font-bold text-ink">€500K</strong>）：ベンダー選定、交渉、多国間調達。',

    // ── Experience: Guardian (job4) ──
    job4_title: "IT-OTシステム管理者",
    job4_company: "Guardian Industries",
    job4_meta: "ルクセンブルク",
    job4_date: "2019年7月 — 2021年8月",
    job4_context:
      "Guardian Industriesの産業サイトの唯一のIT/OT管理者 — 24時間連続稼働のガラス製造、約100ユーザー。ミッション：生産制約下でITの継続性を保証し、ダウンタイム許容ゼロ。",
    job4_b1:
      '<strong class="font-bold text-ink">プロダクションVMware環境を単独で運用</strong>：ESXiホスト10台超、運用向けRDS/VDIインフラ、バックアップと復旧計画。',
    job4_b2:
      '<strong class="font-bold text-ink">Ciscoネットワークインフラを管理</strong>：LAN/WAN、<strong class="font-bold text-ink">IT / OT</strong>セグメンテーション、産業サイトの境界セキュリティ。',
    job4_b3:
      '<strong class="font-bold text-ink">ライン端のシンクライアントを展開</strong>：産業環境向けの堅牢化ソリューション、生産業務アプリケーションとの統合。',
    job4_b4:
      '<strong class="font-bold text-ink">24/7運用継続性を保証</strong>：<strong class="font-bold text-ink">2年間ITに起因するダウンタイムゼロ</strong>、連続稼働制約下での常時オンコール対応。',

    // ── Experience: GMS-it (job5) ──
    job5_title: "システムエンジニア — Microsoft 365 & インフラ",
    job5_company: "GMS-it",
    job5_meta: "ルクセンブルク",
    job5_date: "2016年10月 — 2019年8月",
    job5_context:
      'GMS-it（<strong class="font-bold text-ink">ルクセンブルクのMSP</strong>）のシステムエンジニア — <strong class="font-bold text-ink">ルクセンブルクの中小企業および信託会社7社</strong>に対し、Microsoft 365およびインフラプロジェクトをエンドツーエンドで提供。完全なオーナーシップ：技術設計、展開、サポート。',
    job5_b1:
      '<strong class="font-bold text-ink">オンプレミスExchangeからMicrosoft 365への移行を主導</strong>：共存分析、テナント構築、メールボックス切替、レガシーオンプレミスの撤去。',
    job5_b2:
      '<strong class="font-bold text-ink">顧客インフラプロジェクトを設計・展開</strong>：ネットワーク近代化、仮想化、境界セキュリティ、バックアップ。',
    job5_b3:
      '<strong class="font-bold text-ink">M365展開標準を工業化</strong>：Conditional Access、MFA、RBAC、強化ベースライン — 顧客7環境に展開。',
    job5_b4:
      '<strong class="font-bold text-ink">運用と継続的進化を担保</strong>：N3サポート、重大インシデント管理、インフラ進化計画。',

    // ── Experience: Computacenter (job6) ──
    job6_title: "VMwareコンサルタント — グローバル仮想化プロジェクト",
    job6_company: "Computacenter",
    job6_meta: "ミッション：TI Automotive · ベルギー",
    job6_date: "2014年1月 — 2016年9月",
    job6_context:
      'Computacenter経由のコンサルティングミッション — <strong class="font-bold text-ink">TI Automotive</strong>のグローバル仮想化プロジェクト、複数の国際工場を持つ大手自動車部品サプライヤー。多文化・分散環境、多国間出張。',
    job6_b1:
      '<strong class="font-bold text-ink">グローバルVMware仮想化プロジェクトを主導</strong>：全国際生産拠点で<strong class="font-bold text-ink">200台超のESXiホスト</strong>。',
    job6_b2:
      '<strong class="font-bold text-ink">P2V移行を実施</strong>：レガシー物理サーバーをvSphereに切替、複数国でのオンサイト展開。',
    job6_b3:
      '<strong class="font-bold text-ink">大規模vSphereインフラを管理</strong>：プロビジョニング、パフォーマンストラブルシューティング、グローバル領域のリソース最適化。',

    // ── Experience: ETNIC (job7) ──
    job7_title: "システム & ネットワーク管理者",
    job7_company: "ETNIC",
    job7_meta: "ブリュッセル",
    job7_date: "2007年9月 — 2013年12月",
    job7_context:
      '<strong class="font-bold text-ink">ETNIC</strong>のシステム・ネットワーク管理者 — <strong class="font-bold text-ink">ワロニー＝ブリュッセル連合</strong>の公共IT事業者、ベルギーのフランス語圏教育システム（学校・機関）を支援。広範なインフラ領域：Ciscoネットワーク、VMware仮想化、Windowsサーバー100台超。',
    job7_b1:
      '<strong class="font-bold text-ink">Ciscoネットワークを管理</strong>：スイッチング、ルーティング、組織規模のVLANセグメンテーション。',
    job7_b2:
      '<strong class="font-bold text-ink">VMwareインフラを運用</strong>：ESXiホスト管理、VMのプロビジョニングと保守。',
    job7_b3:
      '<strong class="font-bold text-ink">Windowsサーバー100台超を維持管理</strong>：システム管理、ベルギーフランス語圏共同体の学校・機関のサポート。',

    // Skills
    skills_mastering: "習得済み",
    skills_learning: "学習中",
    skills_speak: "話す言語",
    cat_cloud: "クラウド & アーキテクチャ",
    cat_iac: "IaC & GitOps",
    cat_network: "ネットワーク & セキュリティ",
    cat_identity: "ID & ガバナンス",
    cat_observ: "可観測性 & 周辺",
    level_expert: "エキスパート",
    level_avance: "上級",
    lang_fr: "フランス語 — 母国語",
    lang_en: "英語 — C1 流暢",
    lang_jp: "日本語 — JLPT N5取得 · N2準備中",

    // Selected Projects
    proj1_title: "Terraform Azure モジュールライブラリ",
    proj1_tagline: "オープンソースライブラリ · AVM / CAF 準拠",
    proj1_desc:
      "私がメンテナンスしているAzure Terraformモジュールのオープンソースライブラリ — ネットワーキング、AKS、Key Vault、RBAC、Private Endpoints、FinOps Hub、Palo Alto HA など。AVMパターン（バリデーション、lookup、ロック）、テレメトリ、診断設定、命名規約をデフォルトで実装。",
    proj1_link: "📦 github.com/John6810/terraform-azurerm-modules →",
    proj2_title: "Stock Screener",
    proj2_tagline: "定量スクリーニング · K8s / ArgoCD · 359 テスト",
    proj2_desc:
      "Interactive Brokers向けのスイングトレードのための、定量スクリーニングと注文管理を行う個人プラットフォーム。多層アーキテクチャ：CLI（19コマンド）、FastAPI REST（19エンドポイント）、自動スキャン用のK8s CronJob、コンパニオンDiscordボット。テクニカル + ファンダメンタルのスコアリング、自動リスク管理（ポートフォリオヒート、セクター露出、決算ブラックアウト）、ジャーナルとパフォーマンス追跡。homelabクラスターにArgoCDによるGitOpsで展開。",
    proj3_title: "ホームラボ Kubernetes",
    proj3_tagline: "ベアメタルクラスター · GitOps エンドツーエンド",
    proj3_desc:
      "2ノードのベアメタルKubernetesクラスター、ArgoCD ApplicationSetによるGitOps、Prometheus/Grafanaによる可観測性、Traefikイングレス、L2ロードバランシング用のMetalLB、SMB/RawFile CSIによるハイブリッドストレージ。GitOps管理のシークレットのためのSealed Secrets。本番投入前のパターン検証用サンドボックス。",

    // Education
    edu_eb_diplome: "学位",
    edu_eb_langs: "言語",
    edu_eb_certs_done: "取得済み資格",
    edu_eb_certs_wip: "取得中",
    edu_degree_title: "学士 — コンピュータサイエンス & システム",
    edu_degree_school: "Haute École de la Province de Liège、ベルギー · 2003 – 2007",
    edu_certs_done_title: "取得済み資格",
    edu_certs_wip_title: "取得中",
    edu_langs_title: "言語",

    // Contact
    contact_desc:
      "希望職種：Senior / Principal Cloud Architect、Cloud Solution Architect、または Customer Success Engineer — ハイパースケーラー（Microsoft、AWS、HashiCorp）、テックスケールアップ、または規制下のエンタープライズ環境にて。",
    contact_loc: "Belgium · Luxembourg",
  },
};
