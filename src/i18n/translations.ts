export type Lang = 'fr' | 'en' | 'jp';
export type Translations = Record<string, string>;
export type TranslationMap = Record<Lang, Translations>;

export const T: TranslationMap = {
  fr: {
    // Status / nav
    status: "Disponible — Ouvert aux opportunités",
    nav_experience: "Expérience",
    nav_skills: "Compétences",
    nav_contact: "Contact",

    // Hero
    hero_role: "Senior Cloud Platform Architect · Azure Landing Zone · Terraform/GitOps",
    hero_desc: "Senior Cloud Platform Architect avec 15+ ans d'expérience IT et 5+ ans focalisés sur les environnements Azure enterprise. Spécialisé dans la conception et le déploiement d'Azure Landing Zones de A à Z — gouvernance, networking multi-région, et automatisation complète via Terraform/Terragrunt.",
    hero_loc_value: "Belgium · Luxembourg · EU Remote",
    hero_co_value: "POST Luxembourg",
    cta_contact: "Me contacter",

    // Stats
    stat_years: "années IT · Sysadmin → Cloud Architect",
    stat_subs: "subscriptions Azure · gouvernance end-to-end",
    stat_budget_num: "€500K",
    stat_budget: "budget Azure annuel géré",
    stat_alz: "Azure Landing Zones from scratch",

    // Sections
    section_skills: "Compétences techniques",
    section_experience: "Expérience professionnelle",
    section_education: "Formation, certifications & langues",
    section_contact: "Contact",

    // Skills groups
    skills_cloud: "Cloud Architecture",
    skills_iac: "IaC & Automation",
    skills_security: "Security & Identity",
    level_expert: "Expert",
    level_advanced: "Avancé",
    level_learning: "En cours",

    // Jobs
    job1_title: "Senior Cloud Platform Architect — Azure Landing Zone & Terraform",
    job1_company: "POST Luxembourg",
    job1_location: "Luxembourg",
    job1_date: "Août 2024 — Présent",
    job1_context: "Rejoint pour concevoir et implémenter la fondation Azure de POST from scratch. Aucun Landing Zone, modèle de gouvernance ou pratique IaC n'existait.",
    job1_b1: "Conçu et déployé l'Azure Landing Zone (Enterprise-Scale) via Microsoft CAF, ALZ modules, AVM-PTN-ALZ et AMBA.",
    job1_b2: "IaC from scratch — pipeline Terraform/Terragrunt DRY sur 14 subscriptions depuis un seul codebase.",
    job1_b3: "Architecture multi-région (Germany West Central + France Central) avec VWAN et Palo Alto VM-Series.",
    job1_b4: "Intégré Defender for Cloud, Azure Policies, RBAC, PIM, CMK, Log Analytics et Sentinel.",
    job1_b5: "Conception en cours d'un AWS Landing Zone multi-compte (Control Tower, SCPs, IaC).",
    job1_ref: "Microsoft Customer Story — POST Luxembourg moves core banking to Azure",

    job2_title: "Cloud Architect — M365 & Azure Migration",
    job2_company: "Alten",
    job2_client: "Mission : Aéroport de Luxembourg",
    job2_date: "Août 2023 — Juillet 2024",

    job3_title: "Cloud & Infrastructure Architect",
    job3_company: "Astorg (Private Equity)",
    job3_location: "Luxembourg",
    job3_date: "Sep. 2021 — Juil. 2023",

    earlier_title: "Expériences précédentes (2007–2021)",
    earlier_view: "Voir le détail",
    earlier1_title: "IT/OT System Administrator",
    earlier1_company: "Guardian Industries — Luxembourg",
    earlier1_date: "2019–2021",

    // Education
    edu_degree_title: "Bachelier en informatique et systèmes",
    edu_degree_school: "Haute École de la Province de Liège, Belgique · 2003–2007",
    edu_certs_done_title: "Certifications obtenues",
    edu_certs_wip_title: "En cours / à venir",
    edu_langs_title: "Langues",
    lang_fr: "Français — Natif",
    lang_en: "Anglais — C1 courant",
    lang_jp: "日本語 — JLPT N5 certifié · N2 en préparation",

    // Contact
    contact_desc: "Rôles cibles : Senior / Principal Cloud Architect, Cloud Solution Architect, ou Customer Success Engineer — chez un hyperscaler (Microsoft, AWS, HashiCorp), une scale-up tech ou un environnement enterprise sous régulation.",
    contact_loc: "Belgique · Luxembourg",
  },

  en: {
    status: "Available — Open to opportunities",
    nav_experience: "Experience",
    nav_skills: "Skills",
    nav_contact: "Contact",

    hero_role: "Senior Cloud Platform Architect · Azure Landing Zone · Terraform/GitOps",
    hero_desc: "Senior Cloud Platform Architect with 15+ years of IT experience and 5+ years focused on enterprise Azure environments. Specialized in designing and deploying Azure Landing Zones from scratch — governance, multi-region networking, and full automation via Terraform/Terragrunt.",
    hero_loc_value: "Belgium · Luxembourg · EU Remote",
    hero_co_value: "POST Luxembourg",
    cta_contact: "Contact me",

    stat_years: "years IT · Sysadmin → Cloud Architect",
    stat_subs: "Azure subscriptions · end-to-end governance",
    stat_budget_num: "€500K",
    stat_budget: "annual Azure budget managed",
    stat_alz: "Azure Landing Zones from scratch",

    section_skills: "Technical skills",
    section_experience: "Professional experience",
    section_education: "Education, certifications & languages",
    section_contact: "Contact",

    skills_cloud: "Cloud Architecture",
    skills_iac: "IaC & Automation",
    skills_security: "Security & Identity",
    level_expert: "Expert",
    level_advanced: "Advanced",
    level_learning: "Learning",

    job1_title: "Senior Cloud Platform Architect — Azure Landing Zone & Terraform",
    job1_company: "POST Luxembourg",
    job1_location: "Luxembourg",
    job1_date: "Aug 2024 — Present",
    job1_context: "Joined to design and implement POST's Azure foundation from scratch. No Landing Zone, governance model, or IaC practices existed.",
    job1_b1: "Designed and deployed the Azure Landing Zone (Enterprise-Scale) using Microsoft CAF, ALZ modules, AVM-PTN-ALZ, and AMBA.",
    job1_b2: "Introduced IaC from scratch — DRY Terraform/Terragrunt pipeline across 14 subscriptions from a single codebase.",
    job1_b3: "Multi-region architecture (Germany West Central + France Central) with VWAN and Palo Alto VM-Series firewalls.",
    job1_b4: "Integrated Defender for Cloud, Azure Policies, RBAC, PIM, CMK, Log Analytics, and Sentinel.",
    job1_b5: "Designing multi-account AWS Landing Zone (Control Tower, SCPs, IaC) — in progress.",
    job1_ref: "Microsoft Customer Story — POST Luxembourg moves core banking to Azure",

    job2_title: "Cloud Architect — M365 & Azure Migration",
    job2_company: "Alten",
    job2_client: "Mission: Luxembourg Airport",
    job2_date: "Aug 2023 — Jul 2024",

    job3_title: "Cloud & Infrastructure Architect",
    job3_company: "Astorg (Private Equity)",
    job3_location: "Luxembourg",
    job3_date: "Sep 2021 — Jul 2023",

    earlier_title: "Previous experience (2007–2021)",
    earlier_view: "View details",
    earlier1_title: "IT/OT System Administrator",
    earlier1_company: "Guardian Industries — Luxembourg",
    earlier1_date: "2019–2021",

    edu_degree_title: "Bachelier en informatique et systèmes",
    edu_degree_school: "Haute École de la Province de Liège, Belgium · 2003–2007",
    edu_certs_done_title: "Certifications obtained",
    edu_certs_wip_title: "In progress / upcoming",
    edu_langs_title: "Languages",
    lang_fr: "French — Native",
    lang_en: "English — C1 fluent",
    lang_jp: "日本語 — JLPT N5 certified · N2 in progress",

    contact_desc: "Target roles: Senior / Principal Cloud Architect, Cloud Solution Architect, or Customer Success Engineer — at a hyperscaler (Microsoft, AWS, HashiCorp), tech scale-up, or regulated enterprise environment.",
    contact_loc: "Belgium · Luxembourg",
  },

  jp: {
    status: "求職中 — 新しい機会を探しています",
    nav_experience: "経験",
    nav_skills: "スキル",
    nav_contact: "連絡先",

    hero_role: "Senior Cloud Platform Architect · Azure Landing Zone · Terraform/GitOps",
    hero_desc: "15年以上のIT経験と5年以上のAzureエンタープライズ環境に特化したシニアクラウドプラットフォームアーキテクト。Azure Landing Zoneのゼロからの設計・展開、ガバナンス、マルチリージョンネットワーキング、Terraform/Terragruntによる完全自動化を専門としています。",
    hero_loc_value: "ベルギー · ルクセンブルク · EU Remote",
    hero_co_value: "POST Luxembourg",
    cta_contact: "お問い合わせ",

    stat_years: "年のIT経験 · Sysadmin → Cloud Architect",
    stat_subs: "Azureサブスクリプション · ガバナンス完全管理",
    stat_budget_num: "€500K",
    stat_budget: "年間Azure予算管理",
    stat_alz: "Azure Landing Zones ゼロから構築",

    section_skills: "技術スキル",
    section_experience: "職務経歴",
    section_education: "学歴・資格・言語",
    section_contact: "連絡先",


    skills_cloud: "クラウドアーキテクチャ",
    skills_iac: "IaCと自動化",
    skills_security: "セキュリティとID管理",
    level_expert: "エキスパート",
    level_advanced: "上級",
    level_learning: "学習中",

    job1_title: "クラウドソリューションアーキテクト — Azure Landing Zone & Terraform",
    job1_company: "POST Luxembourg",
    job1_location: "ルクセンブルク",
    job1_date: "2024年8月 — 現在",
    job1_context: "POSTのAzure基盤をゼロから設計・実装するために入社。Landing Zone、ガバナンスモデル、IaC practicesは存在しなかった。",
    job1_b1: "Microsoft CAF、ALZモジュール、AVM-PTN-ALZ、AMBAを使用してAzure Landing Zone（Enterprise-Scale）を設計・展開。",
    job1_b2: "IaCをゼロから導入 — 単一コードベースから14サブスクリプションのDRY Terraform/Terragruntパイプライン。",
    job1_b3: "Virtual WAN、Palo Alto VM-Seriesによるマルチリージョンアーキテクチャ（ドイツ西中部 + フランス中部）。",
    job1_b4: "Defender for Cloud、Azure Policies、RBAC、PIM、CMK、Log Analytics、Sentinelを統合。",
    job1_b5: "AWS Landing Zone マルチアカウント設計中（Control Tower、SCPs、IaC）。",
    job1_ref: "Microsoft Customer Story — POST Luxembourg moves core banking to Azure",

    job2_title: "クラウドアーキテクト — M365 & Azureマイグレーション",
    job2_company: "Alten",
    job2_client: "ミッション: ルクセンブルク空港",
    job2_date: "2023年8月 — 2024年7月",

    job3_title: "クラウド & インフラアーキテクト",
    job3_company: "Astorg (プライベートエクイティ)",
    job3_location: "ルクセンブルク",
    job3_date: "2021年9月 — 2023年7月",

    earlier_title: "過去の経験 (2007–2021)",
    earlier_view: "詳細を見る",
    earlier1_title: "IT/OTシステム管理者",
    earlier1_company: "Guardian Industries — ルクセンブルク",
    earlier1_date: "2019–2021",

    edu_degree_title: "学士 — コンピュータ技術 / システム技術",
    edu_degree_school: "Haute École de la Province de Liège、ベルギー · 2003–2007",
    edu_certs_done_title: "取得済み資格",
    edu_certs_wip_title: "取得中 / 予定",
    edu_langs_title: "言語",
    lang_fr: "フランス語 — 母国語",
    lang_en: "英語 — C1 流暢",
    lang_jp: "日本語 — JLPT N5取得 · N2準備中",

    contact_desc: "ターゲット職種：シニア / プリンシパル Cloud Architect、Cloud Solution Architect、または Customer Success Engineer — ハイパースケーラー（Microsoft、AWS、HashiCorp）、テック スケールアップ、または規制されたエンタープライズ環境で。",
    contact_loc: "ベルギー · ルクセンブルク",
  },
};
