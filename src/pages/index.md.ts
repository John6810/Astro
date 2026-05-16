import type { APIRoute } from "astro";

// Markdown rendering of the recruiter home (/) for AI sourcing agents.
// Hand-written from the same data the .astro components render — kept in
// English so it lands well in boolean searches and LLM context windows.
// Update this file when the page's factual content (titles, dates, metrics)
// changes. No styling, no emojis, hierarchical h1->h3 only.

const markdown = `# Jonathan Aerts — Senior Cloud Platform Architect

Senior Cloud Platform Architect with 15+ years of IT experience, 5+ years focused on enterprise Azure. Specialized in designing and delivering Azure Landing Zones from scratch — governance, multi-region networking, full IaC automation via Terraform/Terragrunt. Currently delivering a regulated banking-grade Landing Zone at POST Luxembourg under CSSF Cloud Outsourcing, DORA, NIS2 and ISO 27001.

## Profile

- **Location**: Wallonia, Belgium
- **Work locations**: Luxembourg · EU remote
- **Current role**: Senior Cloud Platform Architect at POST Luxembourg (Aug 2024 — present)
- **Target roles**: Senior / Principal Cloud Architect, Cloud Solution Architect, or Customer Success Engineer — at a hyperscaler (Microsoft, AWS, HashiCorp), a tech scale-up, or a regulated enterprise environment
- **Engagement**: selectively exploring next IC role — Belgium / Luxembourg / EU remote only, no management roles, no body-shop contracting
- **Email**: hi@jonathan-aerts.dev
- **LinkedIn**: [linkedin.com/in/jaerts085](https://linkedin.com/in/jaerts085)
- **GitHub**: [github.com/john6810](https://github.com/john6810)
- **Languages**: French (native), English (C1 fluent), Japanese (JLPT N5, N2 in progress)

## Key figures

- 15+ years in IT
- 5+ years on Azure
- 4 Azure Landing Zones delivered from scratch
- 26 Azure subscriptions governed
- 500K€+ budget managed
- 35+ engineers trained

## Professional experience

### Senior Cloud Platform Architect — POST Luxembourg

*Aug 2024 — Present · Luxembourg*

Hired to single-handedly build POST Luxembourg's cloud foundation — Grand Duchy telecom operator and postal bank, supervised by the CSSF. Mission: host the critical banking workloads on Azure under a compliant Cloud Outsourcing framework. No prior cloud footprint. 13+ months of continuous delivery.

- Designed and delivered an Enterprise-Scale Azure Landing Zone across **26 subscriptions**, multi-region, aligned with Microsoft CAF and Azure Verified Modules — foundation eligible to host workloads under banking regulation.
- Aligned the platform with regulatory requirements: controls derived from **CSSF Circular 22/806** (Cloud Outsourcing), **DORA**, **NIS2** and **ISO 27001**, **CIS Microsoft Azure** baselines, **zero persistent secrets** (OIDC / Workload Identity end-to-end), Private Endpoints across all PaaS, customer-managed encryption everywhere.
- Industrialised Infrastructure as Code: **60+ production-ready Terraform modules**, single Terragrunt pipeline across the whole perimeter, automated drift detection — immutability and full audit-ready traceability.
- Built the application platform: private AKS clusters in GitOps (Argo CD), **Azure Virtual Desktop** (Host Pools, FSLogix ZRS, Private Endpoints) for compliant virtual desktops, enterprise-grade observability (managed Prometheus + Grafana, 20+ dashboards), AMBA alerts aligned with Microsoft production guidance.
- Formalised internal governance: **20 ADRs**, 6 SRE runbooks, 10K-line enterprise wiki, strict naming / tagging / RBAC conventions — audit and onboarding foundation for future teams.
- Designing the multi-cloud strategy: multi-account AWS Landing Zone in design (Control Tower, SCPs, IaC) to address resilience and supplier diversification requirements imposed by DORA.
- Tooled the project with a suite of specialised AI agents — codified conventions and gotchas, assisted module generation and accelerated architecture reviews.

Sources & references:
- [Microsoft Customer Story — POST & Azure](https://www.microsoft.com/en/customers/story/24351-post-luxembourg-azure)
- [terraform-azurerm-modules — my custom modules (open source)](https://github.com/John6810/terraform-azurerm-modules)

Stack: Azure, Terraform, Terragrunt, Argo CD, AKS, Azure Virtual Desktop, Entra ID, Defender for Cloud, Sentinel, Key Vault, Private Endpoints, Workload Identity, Managed Prometheus, Grafana.

Standards: CSSF 22/806, DORA, NIS2, ISO 27001, CIS Azure, Microsoft CAF, Azure Verified Modules.

### Cloud Architect — M365 & Azure Migration — Alten

*Aug 2023 — Jul 2024 · Mission: Luxembourg Airport*

Consulting mission via Alten for the IT modernisation of Luxembourg Airport — 24/7 critical infrastructure of Luxembourg air transport. Twofold goal: migrate mail to Microsoft 365 and lay the airport's first cloud foundations.

- Migrated **500+ on-premises Exchange mailboxes to Microsoft 365** — hybrid coexistence, progressive cutover, on-prem decommissioning, zero service loss.
- Designed and deployed the airport's first Azure Landing Zone — modular foundation aligned with Microsoft CAF, ready to host the IT department's future workloads.
- Industrialised an initial library of reusable Terraform modules — IaC baseline that shaped the group's cloud deployment strategy.
- Hardened the M365 security posture: Conditional Access, MFA across the board, **CIS Microsoft 365 baselines**, sensitivity labels, retention policies and Compliance Center.
- Migrated identity services to Entra ID — RBAC convention, SSO for the airport's business applications.

Stack: Azure, Terraform, Microsoft 365, Exchange Online, Entra ID, Conditional Access, MFA, Microsoft Compliance Center, CIS Baselines, Microsoft CAF.

### Cloud & Infrastructure Architect — Astorg

*Sep 2021 — Jul 2023 · Private Equity, Luxembourg*

Global IT infrastructure modernisation at Astorg — European Private Equity fund, 250 users, 6 international offices (LU, FR, UK, DE, IT, US), supervised by the CSSF under AIFMD. Transformation from a legacy environment to a compliant hybrid Azure / Entra ID architecture.

- Led the global IT transformation across 6 international offices — on-site deployments (servers, storage, network, endpoints), inter-site network unification via **Cisco Meraki SD-WAN**, standards harmonisation.
- Designed the hybrid Azure architecture: VNETs, Private Endpoints, Key Vault, Entra ID — Terraform foundations developed from scratch.
- Deployed unified endpoint management: **250 endpoints** and 100+ mobile devices via Microsoft Intune, compliance and configuration policies aligned with CIS.
- Aligned the platform with PE regulatory requirements: **CSSF AIFMD**, **ISO 27001**, **CIS Microsoft** baselines, RBAC + PIM governance, systemic Azure Policy.
- Managed the infrastructure renewal budget (~**€500K**): vendor selection, negotiation, multi-country procurement.

Standards: CSSF AIFMD, ISO 27001, CIS Benchmarks, GDPR, Microsoft CAF.

### IT-OT System Administrator — Guardian Industries

*Jul 2019 — Aug 2021 · Luxembourg*

Sole IT/OT administrator for a Guardian Industries industrial site — 24/7 continuous-production glass manufacturing, ~100 users. Mission: guarantee IT continuity under production constraints, with zero tolerance for outage.

- Single-handedly operated the production VMware environment: 10+ ESXi hosts, RDS/VDI infrastructure for operations, backups and recovery plan.
- Ran the Cisco network infrastructure: LAN/WAN, **IT / OT** segmentation, perimeter security for the industrial site.
- Deployed line-edge thin clients: hardened solutions for the industrial environment, integration with production business applications.
- Guaranteed 24/7 operational continuity: **zero IT-attributable outage over 2 years**, permanent on-call support under continuous production constraints.

### System Engineer — Microsoft 365 & Infrastructure — GMS-it

*Oct 2016 — Aug 2019 · Luxembourg MSP*

Systems engineer at GMS-it (Luxembourg MSP) — delivered end-to-end Microsoft 365 and infrastructure projects for **7 Luxembourg SMB and trust company clients**. Full ownership: technical design, deployment, support.

- Led Exchange on-prem to Microsoft 365 migrations: coexistence analysis, tenant setup, mailbox cutover, legacy on-prem decommissioning.
- Designed and delivered client infrastructure projects: network modernisation, virtualisation, perimeter security, backups.
- Industrialised M365 deployment standards: Conditional Access, MFA, RBAC, hardening baselines — rolled out across the 7 client environments.
- Ensured run & continuous evolution: L3 support, critical incident management, infrastructure roadmap planning.

### VMware Consultant — Global Virtualization Project — Computacenter

*Jan 2014 — Sep 2016 · Mission: TI Automotive, Belgium*

Consulting mission via Computacenter for TI Automotive's global virtualisation project — tier-1 automotive supplier with multiple international plants. Multicultural and distributed environment, multi-country travel.

- Led the global VMware virtualisation project: **200+ ESXi hosts** across all international production sites.
- Performed P2V migrations: legacy physical server cutover to vSphere, on-site deployments in multiple countries.
- Administered large-scale vSphere infrastructure: provisioning, performance troubleshooting, resource optimisation across the global perimeter.

### System & Network Administrator — ETNIC

*Sep 2007 — Dec 2013 · Brussels*

System and network administrator at ETNIC — public IT operator of the Wallonia-Brussels Federation, supporting the Belgian French-speaking education system (schools and institutions). Broad infrastructure scope: Cisco network, VMware virtualisation, 100+ Windows servers.

- Administered the Cisco network: switching, routing, VLAN segmentation at organisation scale.
- Managed the VMware infrastructure: ESXi host management, VM provisioning and maintenance.
- Maintained a fleet of 100+ Windows servers: system administration, support for schools and institutions of the French-speaking Community of Belgium.

## Skills

### Cloud & Architecture

- **Azure Landing Zone** — Expert
- Microsoft CAF / Azure Verified Modules — Advanced
- AKS / Kubernetes — Advanced

### IaC & GitOps

- **Terraform** — Expert
- Terragrunt — Advanced
- Argo CD / GitOps — Advanced
- Azure DevOps / GitHub Actions — Advanced

### Networking & Security

- **Hub-Spoke / Virtual WAN / ExpressRoute** — Expert
- Palo Alto VM-Series — Advanced
- Defender for Cloud / Sentinel — Advanced

### Identity & Governance

- **Entra ID / Conditional Access / PIM** — Expert
- **Azure Policy / RBAC** — Expert
- Key Vault / Workload Identity — Advanced

### Observability & adjacent

- Azure Monitor / Managed Prometheus / Grafana — Advanced
- Microsoft 365 / Exchange Online / Intune — Advanced
- VMware vSphere · Cisco / Meraki SD-WAN — Advanced

### Currently learning

- AWS Landing Zone · Control Tower · SCPs

## Selected projects

### Terraform Azure Module Library

*Open source library, AVM / CAF-aligned.*

Open source library of Azure Terraform modules I maintain — networking, AKS, Key Vault, RBAC, Private Endpoints, FinOps Hub, Palo Alto HA, and more. AVM patterns (validation, lookup, locks), telemetry, diagnostic settings and naming conventions by default.

Repository: [github.com/John6810/terraform-azurerm-modules](https://github.com/John6810/terraform-azurerm-modules)

Stack: Terraform, Azure, AVM, IaC, GitHub Actions.

### Distributed Scoring Platform

*Event-driven architecture, K8s / Argo CD, 359 tests.*

Distributed multi-criteria scoring platform deployed in GitOps on a personal Kubernetes cluster. Multi-layer architecture: CLI (19 commands), FastAPI REST API (19 endpoints), Kubernetes CronJobs for automated scan pipelines, Discord companion bot for notifications. Modular business logic, validated by 359 pytest tests, GitOps deployment via Argo CD. Application use case: quantitative analysis on public financial data.

Stack: Python, FastAPI, Kubernetes, Argo CD, Docker, pytest.

### Homelab Kubernetes

*Bare-metal cluster, GitOps end-to-end.*

Bare-metal 2-node Kubernetes cluster, GitOps via ArgoCD ApplicationSet, Prometheus/Grafana observability, Traefik ingress, MetalLB for L2 load balancing, hybrid SMB/RawFile CSI storage. Sealed Secrets for GitOps-managed secrets. Sandbox for validating patterns before production.

Stack: Kubernetes, Argo CD, Traefik, Prometheus, MetalLB, Sealed Secrets.

## Education, certifications & languages

### Education

- **Bachelor — Computer Science & Systems**, Haute École de la Province de Liège, Belgium (2003 – 2007)

### Certifications obtained

- Microsoft Certified: Azure Administrator Associate (AZ-104)
- Microsoft Certified: Azure Security Engineer Associate (AZ-500)
- Microsoft Certified: Azure Network Engineer Associate (AZ-700)
- HashiCorp Certified: Terraform Associate

### In progress

- Microsoft Certified: Azure Solutions Architect Expert (AZ-305)
- AWS Certified Solutions Architect — Associate

### Languages

- French — native
- English — C1 fluent
- Japanese — JLPT N5 certified, N2 in progress

## Contact

Target roles: Senior / Principal Cloud Architect, Cloud Solution Architect, or Customer Success Engineer — at a hyperscaler (Microsoft, AWS, HashiCorp), a tech scale-up, or a regulated enterprise environment.

- Email: hi@jonathan-aerts.dev
- LinkedIn: https://linkedin.com/in/jaerts085
- GitHub: https://github.com/john6810
- Location: Belgium · Luxembourg · open to EU remote

Direct positions only — no sourcing agencies.
`;

export const GET: APIRoute = async () => {
  return new Response(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
