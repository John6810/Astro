// English dictionary — source of truth for the key shape.
// Other locales (`fr`, `ja`) must declare the same keys (TS enforces via Dict).
// Values may contain inline HTML (e.g. <strong>) which is rendered via Astro
// expression with set:html where appropriate.

const dict = {
  // Page-level meta (used by BaseHead per locale)
  meta_title:
    "Jonathan Aerts — Senior Cloud Platform Architect | Azure Landing Zone | Belgium · Luxembourg",
  meta_description:
    "Senior Cloud Platform Architect, 15+ years IT. Azure Landing Zones from scratch, Terraform/GitOps, enterprise governance. Belgium · Luxembourg · EU Remote.",

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
  stat_alz_label: "Landing Zones from scratch",
  stat_subscriptions_label: "Azure subscriptions governed",
  stat_budget_label: "budget managed",
  stat_trained_label: "engineers trained",

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
  exp_refs_eyebrow: "Standards",
  exp_sources_eyebrow: "Sources & references",
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
  proj2_title: "Distributed Scoring Platform",
  proj2_tagline: "Event-driven architecture · K8s / ArgoCD · 359 tests",
  proj2_desc:
    "Distributed multi-criteria scoring platform deployed in GitOps on a personal Kubernetes cluster. Multi-layer architecture: CLI (19 commands), FastAPI REST API (19 endpoints), Kubernetes CronJobs for automated scan pipelines, Discord companion bot for notifications. Modular business logic, validated by 359 pytest tests, GitOps deployment via Argo CD. Application use case: quantitative analysis on public financial data.",
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
};

// Shape contract for every locale dictionary: same keys as EN, string values.
// (Don't widen with `as const` here — sibling locales would need to match each
// literal value, not just the key set.)
export type Dict = Record<keyof typeof dict, string>;
export default dict;
