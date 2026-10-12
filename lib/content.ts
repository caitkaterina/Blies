import { t, type Localized } from "./i18n.ts";
export type PageContent = {
  slug: string;
  group:
    | "company"
    | "procurement"
    | "logistics"
    | "support"
    | "industries"
    | "technology"
    | "legal";
  title: Localized;
  intro: Localized;
  points: Localized[];
};
const p = (
  slug: string,
  group: PageContent["group"],
  title: Localized,
  intro: Localized,
  points: Localized[] = [],
): PageContent => ({ slug, group, title, intro, points });
export const pages: PageContent[] = [
  p(
    "about",
    "company",
    t("About BLIES", "À propos de BLIES", "عن BLIES"),
    t(
      "An integrated procurement and supply-chain partner, established in 2012.",
      "Un partenaire intégré d’approvisionnement et de chaîne logistique, fondé en 2012.",
      "شريك متكامل للمشتريات وسلسلة الإمداد، تأسس عام 2012.",
    ),
    [
      t(
        "Business Logistics Imports Exports & Suppliers. Headquarters: Atrium on 5th, Sandton, Johannesburg, South Africa.",
        "Business Logistics Imports Exports & Suppliers. Siège : Atrium on 5th, Sandton, Johannesburg, Afrique du Sud.",
        "Business Logistics Imports Exports & Suppliers. المقر: Atrium on 5th، ساندتون، جوهانسبرغ، جنوب أفريقيا.",
      ),
      t(
        "Bases in South Africa, Gabon and the UAE. Additional operating markets: Zimbabwe, Mozambique and Oman.",
        "Bases en Afrique du Sud, au Gabon et aux Émirats arabes unis. Marchés opérationnels supplémentaires : Zimbabwe, Mozambique et Oman.",
        "قواعد في جنوب أفريقيا والغابون والإمارات. أسواق تشغيل إضافية: زيمبابوي وموزمبيق وعُمان.",
      ),
    ],
  ),
  p(
    "trust",
    "company",
    t(
      "Clarity is the foundation of trust.",
      "La clarté est le fondement de la confiance.",
      "الوضوح أساس الثقة.",
    ),
    t(
      "A clear distinction between what we own, what we coordinate and what comes next.",
      "Une distinction claire entre nos actifs, nos services coordonnés et nos projets futurs.",
      "تمييز واضح بين ما نملكه وما ننسقه وما نخطط له.",
    ),
    [
      t(
        "Owned road fleet with GPS and route monitoring. Sea and air freight arranged through partners; no owned ships or aircraft.",
        "Flotte routière détenue avec GPS et suivi des itinéraires. Fret maritime et aérien organisé par des partenaires ; aucun navire ni avion détenu.",
        "أسطول بري مملوك مع GPS ومراقبة المسارات. الشحن البحري والجوي عبر شركاء؛ لا نملك سفنًا أو طائرات.",
      ),
      t(
        "Supplier checks, procurement monitoring, documentation and delivery verification coordinate the full journey.",
        "Vérification des fournisseurs, suivi des achats, documentation et vérification de livraison coordonnent le parcours complet.",
        "فحص الموردين ومراقبة المشتريات والتوثيق والتحقق من التسليم تنسق الرحلة كاملة.",
      ),
      t(
        "Private-contract experience. Client identities remain confidential unless disclosure is authorised. No unverified certifications or performance figures are published.",
        "Expérience des contrats privés. Les identités des clients restent confidentielles sans autorisation. Aucune certification ou statistique non vérifiée n’est publiée.",
        "خبرة في العقود الخاصة. تبقى هويات العملاء سرية دون إذن بالإفصاح. لا تُنشر شهادات أو إحصاءات أداء غير موثقة.",
      ),
      t(
        "English, French and Arabic website support. Published translations require professional review before launch.",
        "Site en anglais, français et arabe. Les traductions doivent être révisées professionnellement avant lancement.",
        "دعم الموقع بالإنجليزية والفرنسية والعربية. تتطلب الترجمات مراجعة متخصصة قبل الإطلاق.",
      ),
    ],
  ),
  p(
    "procurement",
    "procurement",
    t(
      "The right supply. A coordinated journey.",
      "Le bon approvisionnement. Un parcours coordonné.",
      "الإمداد المناسب. رحلة منسقة.",
    ),
    t(
      "Source, compare and procure products for industrial, commercial and project requirements.",
      "Identifier, comparer et acheter des produits pour les besoins industriels, commerciaux et de projets.",
      "تحديد ومقارنة وشراء المنتجات للاحتياجات الصناعية والتجارية والمشروعات.",
    ),
    [
      t(
        "Supplier identification, verification and comparison. Multiple quotations, negotiation and price, quantity and lead-time comparisons.",
        "Identification, vérification et comparaison des fournisseurs. Devis multiples, négociation et comparaison des prix, quantités et délais.",
        "تحديد الموردين والتحقق منهم ومقارنتهم. عروض متعددة وتفاوض ومقارنة الأسعار والكميات ومهل التوريد.",
      ),
      t(
        "Bulk, project and technical procurement with consolidation, packaging, labelling, export preparation and inspection.",
        "Achats en volume, de projet et techniques avec consolidation, emballage, étiquetage, préparation à l’export et inspection.",
        "مشتريات بالجملة وللمشروعات ومشتريات فنية مع التجميع والتغليف ووضع الملصقات والاستعداد للتصدير والفحص.",
      ),
      t(
        "Products are sourced to requirements, subject to supplier availability. This is not a retail stock catalogue.",
        "Les produits sont sourcés selon les besoins et la disponibilité des fournisseurs. Il ne s’agit pas d’un catalogue de stock au détail.",
        "تُورّد المنتجات وفق المتطلبات وتوافر الموردين. هذا ليس كتالوج مخزون للبيع بالتجزئة.",
      ),
    ],
  ),
  p(
    "procurement/categories",
    "procurement",
    t(
      "Industrial needs. Considered sourcing.",
      "Besoins industriels. Sourcing réfléchi.",
      "احتياجات صناعية. توريد مدروس.",
    ),
    t(
      "Explore product categories and request sourcing against your specifications.",
      "Explorez les catégories et demandez un sourcing selon vos spécifications.",
      "استكشف فئات المنتجات واطلب التوريد وفق مواصفاتك.",
    ),
    [
      t(
        "Machinery, equipment and spare parts. Mechanical, electrical, hydraulic, pneumatic and automation products.",
        "Machines, équipements et pièces détachées. Produits mécaniques, électriques, hydrauliques, pneumatiques et d’automatisation.",
        "آلات ومعدات وقطع غيار. منتجات ميكانيكية وكهربائية وهيدروليكية وهوائية ومنتجات أتمتة.",
      ),
      t(
        "PPE, safety equipment, industrial consumables, uniforms and workwear. Food and perishables where applicable.",
        "EPI, équipements de sécurité, consommables industriels, uniformes et vêtements de travail. Aliments et denrées périssables selon les besoins.",
        "معدات الوقاية والسلامة والمستهلكات الصناعية والزي وملابس العمل. الأغذية والمواد القابلة للتلف حيث ينطبق.",
      ),
    ],
  ),
  p(
    "procurement/markets",
    "procurement",
    t(
      "Sourcing beyond borders.",
      "Sourcing au-delà des frontières.",
      "توريد يتجاوز الحدود.",
    ),
    t(
      "Sourcing markets are supplier opportunities, not BLIES offices or owned facilities.",
      "Les marchés de sourcing sont des opportunités fournisseurs, pas des bureaux ou installations BLIES.",
      "أسواق التوريد فرص للموردين وليست مكاتب أو منشآت مملوكة لـ BLIES.",
    ),
    [
      t(
        "South Africa: food and meat. China, Singapore and India: machinery. Turkey: uniforms.",
        "Afrique du Sud : aliments et viande. Chine, Singapour et Inde : machines. Turquie : uniformes.",
        "جنوب أفريقيا: الغذاء واللحوم. الصين وسنغافورة والهند: الآلات. تركيا: الزي الرسمي.",
      ),
      t(
        "Middle East and Africa: relevant sourcing opportunities subject to supplier verification and requirements.",
        "Moyen-Orient et Afrique : opportunités pertinentes selon vérification des fournisseurs et exigences.",
        "الشرق الأوسط وأفريقيا: فرص توريد مناسبة وفق التحقق من الموردين والمتطلبات.",
      ),
    ],
  ),
  p(
    "logistics",
    "logistics",
    t(
      "Movement, with every detail considered.",
      "Chaque détail du transport compte.",
      "نقل يراعي كل التفاصيل.",
    ),
    t(
      "Owned road transport and partner-coordinated sea and air freight, connected with documentation and clearance.",
      "Transport routier détenu et fret maritime et aérien coordonné avec des partenaires, associés à la documentation et au dédouanement.",
      "نقل بري مملوك وشحن بحري وجوي منسق مع الشركاء، مرتبط بالتوثيق والتخليص.",
    ),
    [
      t(
        "Choose the service that fits your route, cargo and schedule. All arrangements depend on operational availability and cargo requirements.",
        "Choisissez le service adapté à votre itinéraire, fret et calendrier. Les arrangements dépendent de la disponibilité opérationnelle et des exigences du fret.",
        "اختر الخدمة المناسبة للمسار والشحنة والجدول. تخضع الترتيبات للتوافر التشغيلي ومتطلبات الشحنة.",
      ),
    ],
  ),
  p(
    "logistics/road",
    "logistics",
    t(
      "Road transport. Owned fleet.",
      "Transport routier. Flotte détenue.",
      "نقل بري. أسطول مملوك.",
    ),
    t(
      "BLIES-owned road transportation, with route coordination, GPS tracking and route monitoring.",
      "Transport routier assuré par la flotte BLIES, avec coordination des itinéraires, GPS et suivi des trajets.",
      "نقل بري بأسطول BLIES المملوك، مع تنسيق المسارات والتتبع بنظام GPS ومراقبة الرحلات.",
    ),
    [
      t(
        "Vehicle suitability, route availability and scheduling are assessed against your cargo. Verified specifications are confirmed during quotation.",
        "L’adéquation des véhicules, les itinéraires et la planification sont évalués selon le fret. Les caractéristiques vérifiées sont confirmées au devis.",
        "تُقيّم ملاءمة المركبة وتوافر المسار والجدولة وفق الشحنة. تُؤكد المواصفات الموثقة عند التسعير.",
      ),
    ],
  ),
  p(
    "logistics/mining",
    "logistics",
    t(
      "Mining logistics. Built around the cargo.",
      "Logistique minière. Adaptée au fret.",
      "لوجستيات التعدين. مصممة حول الشحنة.",
    ),
    t(
      "Side-tipper capability for iron ore, chrome, coal, lithium and other minerals, subject to route, vehicle, contract and operational requirements.",
      "Capacité de transport à benne latérale pour minerai de fer, chrome, charbon, lithium et autres minerais, selon itinéraire, véhicule, contrat et exigences opérationnelles.",
      "قدرات النقل بالقلابات الجانبية لخام الحديد والكروم والفحم والليثيوم ومعادن أخرى، وفق متطلبات المسار والمركبة والعقد والتشغيل.",
    ),
  ),
  p(
    "logistics/cold-chain",
    "logistics",
    t(
      "Cold chain. Care throughout the journey.",
      "Chaîne du froid. Attention à chaque étape.",
      "سلسلة التبريد. عناية طوال الرحلة.",
    ),
    t(
      "Refrigerated transportation enquiries for meat, seafood, dairy, produce, frozen goods and other applicable perishables.",
      "Demandes de transport frigorifique pour viande, fruits de mer, produits laitiers, fruits et légumes, surgelés et autres denrées périssables.",
      "استفسارات النقل المبرد للحوم والمأكولات البحرية والألبان والمنتجات الزراعية والمجمدات والمواد القابلة للتلف.",
    ),
    [
      t(
        "Specify temperature, packaging, route and delivery requirements. Temperature-monitoring capability and pharmaceutical standards must be confirmed before commitment.",
        "Précisez température, emballage, itinéraire et livraison. La surveillance des températures et les normes pharmaceutiques doivent être confirmées avant engagement.",
        "حدد درجة الحرارة والتغليف والمسار والتسليم. يجب تأكيد قدرات مراقبة الحرارة والمعايير الدوائية قبل الالتزام.",
      ),
    ],
  ),
  p(
    "logistics/project-cargo",
    "logistics",
    t(
      "General & project cargo",
      "Fret général et de projet",
      "الشحن العام وشحن المشروعات",
    ),
    t(
      "Coordinated transportation for commercial cargo, equipment and project requirements.",
      "Transport coordonné pour fret commercial, équipements et besoins de projets.",
      "نقل منسق للشحنات التجارية والمعدات واحتياجات المشروعات.",
    ),
    [
      t(
        "Provide dimensions, weight, handling needs and site access details. Equipment and load capacity are assessed per request.",
        "Fournissez dimensions, poids, manutention et accès au site. L’équipement et la capacité sont évalués pour chaque demande.",
        "قدم الأبعاد والوزن واحتياجات المناولة وتفاصيل الوصول للموقع. تُقيّم المعدات والحمولة لكل طلب.",
      ),
    ],
  ),
  p(
    "logistics/sea",
    "logistics",
    t(
      "Sea freight. Coordinated worldwide.",
      "Fret maritime. Coordination internationale.",
      "شحن بحري. تنسيق عالمي.",
    ),
    t(
      "Sea freight is arranged through partners and freight networks. BLIES does not own ships.",
      "Le fret maritime est organisé via des partenaires et réseaux. BLIES ne possède pas de navires.",
      "يُنظم الشحن البحري عبر شركاء وشبكات شحن. لا تمتلك BLIES سفنًا.",
    ),
    [
      t(
        "FCL, LCL, project cargo, breakbulk and oversized cargo where available. Mode selection depends on cargo, dimensions, weight, urgency, route and capacity.",
        "FCL, LCL, fret de projet, conventionnel et hors gabarit selon disponibilité. Le choix dépend du fret, dimensions, poids, urgence, itinéraire et capacité.",
        "حاويات كاملة وجزئية وشحن مشروعات وبضائع غير معبأة في حاويات وشحنات كبيرة حيث تتاح. يعتمد الاختيار على الشحنة والأبعاد والوزن والاستعجال والمسار والسعة.",
      ),
      t(
        "Richards Bay, Cape Town, Jebel Ali, Dubai and Singapore are relevant gateways, not BLIES-owned facilities.",
        "Richards Bay, Le Cap, Jebel Ali, Dubaï et Singapour sont des portes d’entrée pertinentes, pas des installations BLIES.",
        "ريتشاردز باي وكيب تاون وجبل علي ودبي وسنغافورة بوابات ذات صلة وليست منشآت مملوكة لـ BLIES.",
      ),
    ],
  ),
  p(
    "logistics/air",
    "logistics",
    t(
      "Air freight. Time-sensitive coordination.",
      "Fret aérien. Coordination urgente.",
      "شحن جوي. تنسيق حساس للوقت.",
    ),
    t(
      "Partner-coordinated air freight for urgent, high-value and specialised cargo. BLIES does not own aircraft.",
      "Fret aérien coordonné avec des partenaires pour fret urgent, de valeur ou spécialisé. BLIES ne possède pas d’avions.",
      "شحن جوي منسق مع الشركاء للشحنات العاجلة وعالية القيمة والمتخصصة. لا تمتلك BLIES طائرات.",
    ),
    [
      t(
        "Subject to dimensions, weight, route, carrier availability and applicable regulations.",
        "Selon dimensions, poids, itinéraire, disponibilité des transporteurs et réglementation applicable.",
        "وفق الأبعاد والوزن والمسار وتوافر الناقلين واللوائح المعمول بها.",
      ),
    ],
  ),
  p(
    "logistics/cross-border",
    "logistics",
    t(
      "Cross-border Africa",
      "Transport transfrontalier africain",
      "النقل عبر الحدود الأفريقية",
    ),
    t(
      "Cross-border trucking and coordination with confirmed reach into the Democratic Republic of the Congo.",
      "Transport routier transfrontalier et coordination avec une portée confirmée en République démocratique du Congo.",
      "نقل بالشاحنات وتنسيق عبر الحدود مع وصول مؤكد إلى جمهورية الكونغو الديمقراطية.",
    ),
    [
      t(
        "Operating markets include Zimbabwe and Mozambique. Confirm the specific corridor, permits and cargo conditions during quotation; coverage is not universal.",
        "Les marchés comprennent le Zimbabwe et le Mozambique. Confirmez corridor, permis et conditions au devis ; la couverture n’est pas universelle.",
        "تشمل أسواق التشغيل زيمبابوي وموزمبيق. أكد الممر والتصاريح وشروط الشحنة عند التسعير؛ التغطية ليست شاملة لكل البلدان.",
      ),
    ],
  ),
  p(
    "services/customs",
    "support",
    t("Customs & clearing", "Douanes et dédouanement", "الجمارك والتخليص"),
    t(
      "A clearing-agent network covering South Africa, Gabon, China, the UAE and Saudi Arabia.",
      "Un réseau d’agents de dédouanement couvrant l’Afrique du Sud, le Gabon, la Chine, les Émirats arabes unis et l’Arabie saoudite.",
      "شبكة وكلاء تخليص تغطي جنوب أفريقيا والغابون والصين والإمارات والسعودية.",
    ),
    [
      t(
        "Licences and specific legal arrangements must be confirmed. Quotations include VAT where applicable. BLIES may coordinate tax or legal advisers; it is not a tax firm.",
        "Licences et arrangements juridiques à confirmer. Les devis incluent la TVA si applicable. BLIES peut coordonner des conseillers fiscaux ou juridiques ; ce n’est pas un cabinet fiscal.",
        "يجب تأكيد التراخيص والترتيبات القانونية المحددة. تشمل العروض ضريبة القيمة المضافة عند انطباقها. قد تنسق BLIES مع مستشارين ضريبيين أو قانونيين؛ وليست شركة استشارات ضريبية.",
      ),
    ],
  ),
  p(
    "services/documentation",
    "support",
    t(
      "The paperwork. Handled.",
      "Les formalités. Prises en charge.",
      "المستندات. نتولاها.",
    ),
    t(
      "Documentation coordinated around the product, commodity, origin, destination and applicable regulations.",
      "Documentation coordonnée selon produit, marchandise, origine, destination et réglementation applicable.",
      "توثيق منسق وفق المنتج والسلعة والمنشأ والوجهة واللوائح السارية.",
    ),
    [
      t(
        "Invoices, packing lists, certificates of origin, bills of lading, air waybills, customs documents, permits and inspection certificates.",
        "Factures, listes de colisage, certificats d’origine, connaissements, lettres de transport aérien, documents douaniers, permis et certificats d’inspection.",
        "فواتير وقوائم تعبئة وشهادات منشأ وسندات شحن وبوالص جوية ومستندات جمركية وتصاريح وشهادات فحص.",
      ),
      t(
        "Product, health, phytosanitary and veterinary certificates, dangerous-goods and insurance documents where relevant.",
        "Certificats produits, sanitaires, phytosanitaires et vétérinaires, documents de marchandises dangereuses et d’assurance si pertinents.",
        "شهادات المنتجات والصحة والصحة النباتية والبيطرية ومستندات المواد الخطرة والتأمين عند الحاجة.",
      ),
    ],
  ),
  p(
    "services/quality",
    "support",
    t(
      "We don’t just move goods. We verify them.",
      "Nous ne faisons pas que transporter. Nous vérifions.",
      "لا ننقل البضائع فحسب. نتحقق منها.",
    ),
    t(
      "Quality assurance across procurement, transit and delivery, with scope agreed for your requirements.",
      "Assurance qualité au fil des achats, du transit et de la livraison, selon un périmètre convenu.",
      "ضمان الجودة عبر المشتريات والنقل والتسليم، وفق نطاق متفق عليه لاحتياجاتك.",
    ),
    [
      t(
        "Initial supplier checks → Procurement monitoring → Quality-control checks → Pre-shipment inspection → Transit monitoring → Final delivery verification.",
        "Vérification initiale des fournisseurs → Suivi des achats → Contrôles qualité → Inspection avant expédition → Suivi du transit → Vérification de livraison.",
        "فحص أولي للموردين ← مراقبة المشتريات ← فحص الجودة ← فحص ما قبل الشحن ← مراقبة النقل ← التحقق من التسليم.",
      ),
      t(
        "Specific team credentials, standards and inspection capabilities require confirmation.",
        "Les qualifications, normes et capacités d’inspection spécifiques doivent être confirmées.",
        "تتطلب مؤهلات الفريق والمعايير وقدرات الفحص المحددة تأكيدًا.",
      ),
    ],
  ),
  p(
    "fleet",
    "company",
    t(
      "Built to move industry.",
      "Conçue pour transporter l’industrie.",
      "مصمم لنقل الصناعة.",
    ),
    t(
      "Our road fleet is owned. Published fleet information must be verified.",
      "Notre flotte routière est détenue. Les informations publiées doivent être vérifiées.",
      "أسطولنا البري مملوك. يجب التحقق من معلومات الأسطول المنشورة.",
    ),
  ),
  p(
    "technology/gps",
    "technology",
    t(
      "GPS & fleet monitoring",
      "GPS et suivi de flotte",
      "GPS ومراقبة الأسطول",
    ),
    t(
      "GPS and route monitoring support owned road operations. Client-facing live web tracking is in development.",
      "Le GPS et le suivi des itinéraires soutiennent les opérations routières. Le suivi web en direct pour les clients est en développement.",
      "يدعم GPS ومراقبة المسارات العمليات البرية. التتبع المباشر عبر الويب للعملاء قيد التطوير.",
    ),
    [
      t(
        "Request an update through the tracking enquiry form. We do not publish simulated shipment positions or statuses.",
        "Demandez une mise à jour via le formulaire de suivi. Nous ne publions pas de positions ou statuts simulés.",
        "اطلب تحديثًا من خلال نموذج الاستفسار. لا ننشر مواقع أو حالات شحن محاكاة.",
      ),
    ],
  ),
  p(
    "technology/roadmap",
    "technology",
    t(
      "The next chapter. Clearly future.",
      "Le prochain chapitre. Clairement futur.",
      "الفصل التالي. مستقبلي بوضوح.",
    ),
    t(
      "Digital roadmap / future development. These capabilities are not operational products.",
      "Feuille de route numérique / développement futur. Ces fonctionnalités ne sont pas des produits opérationnels.",
      "خارطة الطريق الرقمية / تطوير مستقبلي. هذه الإمكانات ليست منتجات تشغيلية.",
    ),
    [
      t(
        "My BLIES: a future authenticated portal for orders, quotes, shipments, invoices, messages and account management, with MFA, roles and audit logs.",
        "My BLIES : futur portail authentifié pour commandes, devis, expéditions, factures, messages et comptes, avec MFA, rôles et audit.",
        "My BLIES: بوابة مستقبلية موثقة للطلبات والعروض والشحنات والفواتير والرسائل والحسابات، مع مصادقة متعددة العوامل وأدوار وسجلات تدقيق.",
      ),
      t(
        "Document Vault: planned private document access with encryption, expiring signed links, revocation and audit trails.",
        "Document Vault : accès privé prévu avec chiffrement, liens signés expirants, révocation et audit.",
        "خزنة المستندات: وصول خاص مخطط له مع تشفير وروابط موقعة منتهية الصلاحية وإلغاء الوصول وسجلات تدقيق.",
      ),
      t(
        "Mode Recommender: planned indicative road, sea or air guidance, subject to operational conditions. Live timelines and deep CRM/ERP integration remain future scope.",
        "Mode Recommender : orientation indicative prévue route, mer ou air, selon conditions opérationnelles. Chronologies en direct et intégration CRM/ERP approfondie restent futures.",
        "موصي وسيلة النقل: إرشاد مستقبلي استرشادي بري أو بحري أو جوي وفق الظروف التشغيلية. الجداول المباشرة والتكامل العميق مع CRM/ERP ميزات مستقبلية.",
      ),
    ],
  ),
];
const industries = [
  [
    "mining",
    t("Mining", "Industrie minière", "التعدين"),
    t(
      "Coordinate mineral transport, industrial equipment and spare-part sourcing. Side-tipper enquiries are assessed against route, vehicle and contract requirements.",
      "Coordonnez le transport de minerais et le sourcing d’équipements et pièces. Les demandes de bennes latérales sont évaluées selon itinéraire, véhicule et contrat.",
      "نسق نقل المعادن وتوريد المعدات الصناعية وقطع الغيار. تُقيّم طلبات القلابات الجانبية وفق المسار والمركبة والعقد.",
    ),
  ],
  [
    "oil-gas",
    t("Oil & Gas", "Pétrole et gaz", "النفط والغاز"),
    t(
      "Procurement and cargo coordination for technical equipment, PPE and industrial consumables. Specialised and dangerous-goods capabilities must be confirmed per enquiry.",
      "Achats et coordination pour équipements techniques, EPI et consommables. Les capacités spécialisées et marchandises dangereuses doivent être confirmées.",
      "مشتريات وتنسيق شحن للمعدات الفنية والوقاية والمستهلكات. يجب تأكيد قدرات الشحن المتخصص والمواد الخطرة لكل استفسار.",
    ),
  ],
  [
    "construction",
    t("Construction", "Construction", "البناء"),
    t(
      "Source equipment, workwear and project supplies, with documentation and delivery coordination aligned to site requirements.",
      "Sourcez équipements, vêtements de travail et fournitures avec documentation et livraison adaptées au chantier.",
      "توريد المعدات وملابس العمل ولوازم المشروعات مع توثيق وتسليم وفق متطلبات الموقع.",
    ),
  ],
  [
    "manufacturing",
    t("Manufacturing", "Industrie manufacturière", "التصنيع"),
    t(
      "Source mechanical, electrical, hydraulic, pneumatic and automation products, spare parts and industrial consumables.",
      "Sourcez produits mécaniques, électriques, hydrauliques, pneumatiques, automatisation, pièces et consommables.",
      "توريد المنتجات الميكانيكية والكهربائية والهيدروليكية والهوائية والأتمتة وقطع الغيار والمستهلكات الصناعية.",
    ),
  ],
  [
    "government",
    t("Government", "Secteur public", "القطاع الحكومي"),
    t(
      "Specification-led sourcing, documented comparisons and coordinated delivery for public-sector enquiries, subject to applicable procurement requirements.",
      "Sourcing selon spécifications, comparaisons documentées et livraison coordonnée, selon règles d’achat applicables.",
      "توريد وفق المواصفات ومقارنات موثقة وتسليم منسق لاستفسارات القطاع العام، وفق متطلبات المشتريات السارية.",
    ),
  ],
  [
    "corporations",
    t(
      "International corporations",
      "Entreprises internationales",
      "الشركات الدولية",
    ),
    t(
      "Connect sourcing, inspection, documentation and transport through one coordinated supply-chain journey. Client information stays confidential.",
      "Reliez sourcing, inspection, documentation et transport dans un parcours coordonné. Les informations clients restent confidentielles.",
      "اربط التوريد والفحص والتوثيق والنقل في رحلة إمداد منسقة واحدة. تبقى معلومات العملاء سرية.",
    ),
  ],
] as const;
for (const [slug, title, intro] of industries)
  pages.push(p(`industries/${slug}`, "industries", title, intro));
for (const [slug, title, intro] of [
  [
    "privacy",
    t("Privacy policy", "Politique de confidentialité", "سياسة الخصوصية"),
    t(
      "Enquiry data is used to respond to service requests. Production retention, lawful basis, data rights, transfers and privacy contacts require legal approval under relevant POPIA, GDPR, UAE and Gabon obligations.",
      "Les données servent à répondre aux demandes. Conservation, base légale, droits, transferts et contacts doivent être approuvés selon les obligations POPIA, RGPD, EAU et Gabon.",
      "تُستخدم بيانات الاستفسار للرد على الطلبات. تتطلب مدة الاحتفاظ والأساس القانوني والحقوق والنقل وجهات الخصوصية اعتمادًا قانونيًا وفق الالتزامات ذات الصلة.",
    ),
  ],
  [
    "terms",
    t("Terms & conditions", "Conditions générales", "الشروط والأحكام"),
    t(
      "Service scope, liability, insurance, payment, jurisdiction and contractual obligations require approved terms before production launch.",
      "Périmètre, responsabilité, assurance, paiement, juridiction et obligations nécessitent des conditions approuvées avant lancement.",
      "يتطلب نطاق الخدمة والمسؤولية والتأمين والدفع والاختصاص والالتزامات شروطًا معتمدة قبل الإطلاق.",
    ),
  ],
  [
    "cookies",
    t("Cookie policy", "Politique des cookies", "سياسة ملفات الارتباط"),
    t(
      "The public site uses no advertising cookies by default. Admin access requires a secure session cookie. Optional analytics load only after consent when configured. Final policy requires review.",
      "Le site public n’utilise pas de cookies publicitaires par défaut. L’administration nécessite un cookie de session sécurisé. Les analyses facultatives se chargent après consentement si configurées. Politique à valider.",
      "لا يستخدم الموقع العام ملفات إعلانية افتراضيًا. تتطلب الإدارة ملف جلسة آمنًا. تُحمّل التحليلات الاختيارية بعد الموافقة عند إعدادها. تتطلب السياسة النهائية مراجعة.",
    ),
  ],
  [
    "quote-terms",
    t("Quote terms", "Conditions des devis", "شروط عروض الأسعار"),
    t(
      "Quotations include VAT where applicable. Availability, specifications, cargo, route and supplier requirements affect pricing and timing. A request is not a binding quotation or accepted transport contract.",
      "Les devis incluent la TVA si applicable. Disponibilité, spécifications, fret, itinéraire et fournisseurs influencent prix et délais. Une demande n’est pas un devis contraignant ni un contrat accepté.",
      "تشمل العروض ضريبة القيمة المضافة عند انطباقها. يؤثر التوافر والمواصفات والشحنة والمسار والموردون في السعر والتوقيت. الطلب ليس عرضًا ملزمًا أو عقد نقل مقبولًا.",
    ),
  ],
] as const)
  pages.push(p(`legal/${slug}`, "legal", title, intro));
export const services = [
  {
    id: "procurement",
    slug: "procurement",
    title: t("Source a product", "Sourcer un produit", "توريد منتج"),
  },
  {
    id: "equipment",
    slug: "procurement/categories",
    title: t("Buy equipment", "Acheter des équipements", "شراء معدات"),
  },
  {
    id: "road",
    slug: "logistics/road",
    title: t("Move cargo", "Transporter du fret", "نقل شحنة"),
  },
  {
    id: "mining",
    slug: "logistics/mining",
    title: t("Mining logistics", "Logistique minière", "لوجستيات التعدين"),
  },
  {
    id: "cold",
    slug: "logistics/cold-chain",
    title: t("Refrigerated transport", "Transport frigorifique", "نقل مبرد"),
  },
  {
    id: "sea",
    slug: "logistics/sea",
    title: t("Sea freight", "Fret maritime", "شحن بحري"),
  },
  {
    id: "air",
    slug: "logistics/air",
    title: t("Air freight", "Fret aérien", "شحن جوي"),
  },
  {
    id: "import",
    slug: "services/customs",
    title: t("Import", "Importer", "استيراد"),
  },
  {
    id: "export",
    slug: "services/documentation",
    title: t("Export", "Exporter", "تصدير"),
  },
  {
    id: "clearing",
    slug: "services/customs",
    title: t("Customs clearing", "Dédouanement", "تخليص جمركي"),
  },
  {
    id: "integrated",
    slug: "services/quality",
    title: t("Full supply chain", "Chaîne complète", "سلسلة إمداد كاملة"),
  },
  {
    id: "project",
    slug: "logistics/project-cargo",
    title: t(
      "General / project cargo",
      "Fret général / de projet",
      "شحن عام / مشروعات",
    ),
  },
];
export const locations = [
  {
    id: "za",
    x: 54,
    y: 82,
    title: t("South Africa", "Afrique du Sud", "جنوب أفريقيا"),
    role: t("Headquarters / base", "Siège / base", "المقر / قاعدة"),
    description: t(
      "Atrium on 5th, Sandton, Johannesburg. Procurement and owned road transportation coordination.",
      "Atrium on 5th, Sandton, Johannesburg. Achats et coordination du transport routier détenu.",
      "Atrium on 5th، ساندتون، جوهانسبرغ. تنسيق المشتريات والنقل البري المملوك.",
    ),
  },
  {
    id: "ga",
    x: 46,
    y: 55,
    title: t("Gabon", "Gabon", "الغابون"),
    role: t("Base / presence", "Base / présence", "قاعدة / حضور"),
    description: t(
      "Confirmed presence. Local address, entity status and activities await management approval.",
      "Présence confirmée. Adresse, statut juridique et activités locales à approuver.",
      "حضور مؤكد. العنوان المحلي ووضع الكيان والأنشطة بانتظار اعتماد الإدارة.",
    ),
  },
  {
    id: "ae",
    x: 64,
    y: 40,
    title: t("UAE", "Émirats arabes unis", "الإمارات"),
    role: t("Base / presence", "Base / présence", "قاعدة / حضور"),
    description: t(
      "Confirmed presence. Sea and air coordination through networks; local contact details await approval.",
      "Présence confirmée. Coordination maritime et aérienne via réseaux ; coordonnées locales à approuver.",
      "حضور مؤكد. تنسيق بحري وجوي عبر الشبكات؛ بيانات التواصل المحلية بانتظار الاعتماد.",
    ),
  },
  {
    id: "zw",
    x: 50,
    y: 72,
    title: t("Zimbabwe", "Zimbabwe", "زيمبابوي"),
    role: t("Operating market", "Marché opérationnel", "سوق تشغيل"),
    description: t(
      "Additional operating market. Specific corridors are confirmed per request, not represented as offices.",
      "Marché opérationnel supplémentaire. Corridors confirmés sur demande, sans représentation de bureaux.",
      "سوق تشغيل إضافي. تُؤكد الممرات لكل طلب ولا تُعرض كمكاتب.",
    ),
  },
  {
    id: "mz",
    x: 60,
    y: 75,
    title: t("Mozambique", "Mozambique", "موزمبيق"),
    role: t("Operating market", "Marché opérationnel", "سوق تشغيل"),
    description: t(
      "Additional operating market; route and cargo conditions assessed per enquiry.",
      "Marché opérationnel supplémentaire ; itinéraire et fret évalués pour chaque demande.",
      "سوق تشغيل إضافي؛ تُقيّم شروط المسار والشحنة لكل استفسار.",
    ),
  },
  {
    id: "om",
    x: 66,
    y: 51,
    title: t("Oman", "Oman", "عُمان"),
    role: t("Operating market", "Marché opérationnel", "سوق تشغيل"),
    description: t(
      "Additional operating market, not a confirmed BLIES office.",
      "Marché opérationnel supplémentaire, pas un bureau BLIES confirmé.",
      "سوق تشغيل إضافي وليس مكتب BLIES مؤكدًا.",
    ),
  },
  {
    id: "cd",
    x: 55,
    y: 64,
    title: t("DRC", "RDC", "الكونغو الديمقراطية"),
    role: t("Cross-border reach", "Portée transfrontalière", "وصول عبر الحدود"),
    description: t(
      "Confirmed cross-border trucking reach. Individual corridors and availability require assessment.",
      "Portée routière transfrontalière confirmée. Corridors et disponibilité à évaluer.",
      "وصول مؤكد للشاحنات عبر الحدود. تتطلب الممرات والتوافر تقييمًا.",
    ),
  },
  {
    id: "cn",
    x: 84,
    y: 31,
    title: t("China", "Chine", "الصين"),
    role: t("Sourcing market", "Marché de sourcing", "سوق توريد"),
    description: t(
      "Machinery sourcing and clearing-agent network. No office or owned facility implied.",
      "Sourcing de machines et réseau de dédouanement. Aucun bureau ou installation détenue implicite.",
      "توريد آلات وشبكة تخليص. لا يُقصد الإشارة إلى مكتب أو منشأة مملوكة.",
    ),
  },
  {
    id: "in",
    x: 76,
    y: 47,
    title: t("India", "Inde", "الهند"),
    role: t("Sourcing market", "Marché de sourcing", "سوق توريد"),
    description: t(
      "Machinery sourcing subject to supplier verification and requirements.",
      "Sourcing de machines selon vérification des fournisseurs et besoins.",
      "توريد آلات وفق التحقق من الموردين والاحتياجات.",
    ),
  },
  {
    id: "sg",
    x: 83,
    y: 64,
    title: t("Singapore", "Singapour", "سنغافورة"),
    role: t("Sourcing / gateway", "Sourcing / porte d’entrée", "توريد / بوابة"),
    description: t(
      "Machinery sourcing and relevant freight gateway; not a BLIES facility.",
      "Sourcing de machines et porte d’entrée fret pertinente ; pas une installation BLIES.",
      "توريد آلات وبوابة شحن ذات صلة؛ ليست منشأة لـ BLIES.",
    ),
  },
  {
    id: "tr",
    x: 59,
    y: 27,
    title: t("Turkey", "Turquie", "تركيا"),
    role: t("Sourcing market", "Marché de sourcing", "سوق توريد"),
    description: t(
      "Uniform sourcing. Supplier relationships are assessed per enquiry.",
      "Sourcing d’uniformes. Relations fournisseurs évaluées selon demande.",
      "توريد الزي الرسمي. تُقيّم علاقات الموردين لكل استفسار.",
    ),
  },
];
export const journey = [
  t("Source", "Sourcer", "التوريد"),
  t("Procure", "Acheter", "الشراء"),
  t("Inspect", "Inspecter", "الفحص"),
  t("Document", "Documenter", "التوثيق"),
  t("Clear", "Dédouaner", "التخليص"),
  t("Move", "Transporter", "النقل"),
  t("Deliver", "Livrer", "التسليم"),
];
export const articles = [
  {
    slug: "procurement-specifications",
    category: t(
      "Procurement strategy",
      "Stratégie d’achat",
      "استراتيجية المشتريات",
    ),
    title: t(
      "A better brief makes better procurement.",
      "Un meilleur cahier des charges améliore les achats.",
      "مواصفات أفضل لمشتريات أفضل.",
    ),
    body: [
      t(
        "Start with the purpose of the product, not only its name. Record quantities, technical specifications, required standards, acceptable alternatives and delivery timing.",
        "Commencez par l’usage du produit, pas seulement son nom. Notez quantités, spécifications, normes requises, alternatives et délais.",
        "ابدأ بغرض المنتج وليس اسمه فقط. سجل الكميات والمواصفات والمعايير والبدائل المقبولة ومواعيد التسليم.",
      ),
      t(
        "Compare supplier responses on the same basis: unit, currency, packaging, lead time and delivery terms. Quality checks and documentation should be agreed before purchase.",
        "Comparez les réponses sur une base commune : unité, devise, emballage, délai et livraison. Convenez des contrôles qualité et documents avant achat.",
        "قارن ردود الموردين على أساس موحد: الوحدة والعملة والتغليف ومدة التوريد وشروط التسليم. اتفق على فحوص الجودة والمستندات قبل الشراء.",
      ),
    ],
  },
  {
    slug: "cross-border-documentation",
    category: t(
      "African trade & customs",
      "Commerce africain et douanes",
      "التجارة الأفريقية والجمارك",
    ),
    title: t(
      "Documentation belongs at the start of the journey.",
      "La documentation commence dès le départ.",
      "التوثيق يبدأ من أول الرحلة.",
    ),
    body: [
      t(
        "The required documents depend on commodity, origin, destination and regulation. Begin by identifying invoices, packing lists and origin evidence; permits and certificates may also be needed.",
        "Les documents dépendent de la marchandise, origine, destination et réglementation. Identifiez factures, colisage et origine ; permis et certificats peuvent être nécessaires.",
        "تعتمد المستندات على السلعة والمنشأ والوجهة واللوائح. حدد الفواتير وقوائم التعبئة وإثبات المنشأ؛ قد تلزم أيضًا تصاريح وشهادات.",
      ),
      t(
        "Have the route and document requirements reviewed before dispatch. This article is general guidance, not legal or customs advice.",
        "Faites vérifier itinéraire et documents avant expédition. Cet article est général, pas un conseil juridique ou douanier.",
        "راجع المسار ومتطلبات المستندات قبل الإرسال. هذا المقال إرشاد عام وليس استشارة قانونية أو جمركية.",
      ),
    ],
  },
  {
    slug: "mining-logistics-planning",
    category: t("Mining logistics", "Logistique minière", "لوجستيات التعدين"),
    title: t(
      "Plan the route around the material.",
      "Planifier l’itinéraire selon la matière.",
      "خطط للمسار حول المادة.",
    ),
    body: [
      t(
        "Mineral transport planning starts with material characteristics, collection and delivery sites, handling needs and the contract schedule. Vehicle and corridor availability must be checked for the specific request.",
        "La planification commence par matière, sites, manutention et calendrier. Véhicules et corridors doivent être vérifiés pour chaque demande.",
        "يبدأ تخطيط نقل المعادن بخصائص المادة ومواقع الاستلام والتسليم والمناولة والجدول التعاقدي. يجب فحص توافر المركبات والممرات لكل طلب.",
      ),
      t(
        "Do not assume a published payload or a universal route. Confirm operating conditions before a transport commitment.",
        "Ne supposez pas une charge ou un itinéraire universel. Confirmez les conditions avant engagement.",
        "لا تفترض حمولة منشورة أو مسارًا شاملًا. أكد ظروف التشغيل قبل الالتزام بالنقل.",
      ),
    ],
  },
  {
    slug: "international-supplier-comparison",
    category: t(
      "International sourcing",
      "Sourcing international",
      "التوريد الدولي",
    ),
    title: t(
      "Compare the complete offer.",
      "Comparer l’offre complète.",
      "قارن العرض كاملًا.",
    ),
    body: [
      t(
        "The lowest unit price is only one part of a sourcing decision. Compare packaging, inspection, export preparation, delivery terms and lead times alongside price.",
        "Le prix unitaire n’est qu’un élément. Comparez emballage, inspection, préparation export, livraison et délais avec le prix.",
        "أقل سعر للوحدة جزء واحد من قرار التوريد. قارن التغليف والفحص والاستعداد للتصدير وشروط التسليم والمهل مع السعر.",
      ),
      t(
        "Supplier assessment should be proportionate to the product and risk. Agree acceptable evidence before placing an order.",
        "L’évaluation fournisseur doit être proportionnée au produit et au risque. Convenez des preuves avant commande.",
        "يجب أن يتناسب تقييم المورد مع المنتج والمخاطر. اتفق على الأدلة المقبولة قبل الطلب.",
      ),
    ],
  },
  {
    slug: "supply-chain-handoffs",
    category: t(
      "Supply-chain strategy",
      "Stratégie logistique",
      "استراتيجية سلسلة الإمداد",
    ),
    title: t(
      "Make every handoff explicit.",
      "Clarifier chaque transition.",
      "وضح كل انتقال.",
    ),
    body: [
      t(
        "Source, procure, inspect, document, clear, move and deliver: each stage has information that the next stage needs. Agree who supplies it, who verifies it and when it is required.",
        "Sourcer, acheter, inspecter, documenter, dédouaner, transporter et livrer : chaque étape fournit des informations à la suivante. Définissez responsables et échéances.",
        "التوريد والشراء والفحص والتوثيق والتخليص والنقل والتسليم: لكل مرحلة معلومات تحتاجها التالية. اتفق على من يقدمها ومن يتحقق منها ومتى تلزم.",
      ),
      t(
        "A coordinated supply chain keeps the specification, document set and delivery requirements aligned throughout the journey.",
        "Une chaîne coordonnée maintient spécifications, documents et livraison alignés tout au long du parcours.",
        "تحافظ سلسلة الإمداد المنسقة على توافق المواصفات والمستندات ومتطلبات التسليم طوال الرحلة.",
      ),
    ],
  },
];
