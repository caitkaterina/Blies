export const locales = ["en", "fr", "ar"] as const;
export type Locale = (typeof locales)[number];
export type Localized = Record<Locale, string>;
export const t = (en: string, fr: string, ar: string): Localized => ({
  en,
  fr,
  ar,
});
export const ui = {
  backendUnavailable: t(
    "Online requests are temporarily unavailable because secure backend services are not connected. No enquiry has been accepted. Please use the Contact page.",
    "Les demandes en ligne sont temporairement indisponibles : les services sécurisés ne sont pas connectés. Aucune demande n’a été acceptée. Veuillez utiliser la page Contact.",
    "الطلبات عبر الإنترنت غير متاحة مؤقتًا لأن خدمات الخلفية الآمنة غير متصلة. لم يتم قبول أي استفسار. يرجى استخدام صفحة التواصل.",
  ),
  home: t("Home", "Accueil", "الرئيسية"),
  procurement: t("Procurement", "Approvisionnement", "المشتريات"),
  logistics: t("Logistics", "Logistique", "الخدمات اللوجستية"),
  company: t("Company", "Entreprise", "الشركة"),
  fleet: t("Our fleet", "Notre flotte", "أسطولنا"),
  quote: t("Request a quote", "Demander un devis", "طلب عرض سعر"),
  explore: t("Explore our services", "Explorer nos services", "استكشف خدماتنا"),
  trust: t("Trust Centre", "Centre de confiance", "مركز الثقة"),
  contact: t(
    "Contact & locations",
    "Contact et implantations",
    "التواصل والمواقع",
  ),
  insights: t("Insights", "Analyses", "رؤى"),
  track: t("Track shipment", "Suivi d’expédition", "تتبع الشحنة"),
  roadmap: t(
    "Digital roadmap",
    "Feuille de route numérique",
    "خارطة الطريق الرقمية",
  ),
  future: t("Future development", "Développement futur", "تطوير مستقبلي"),
  menu: t("Menu", "Menu", "القائمة"),
  close: t("Close menu", "Fermer le menu", "إغلاق القائمة"),
  read: t("Explore", "Découvrir", "استكشف"),
  back: t("Back", "Retour", "السابق"),
  next: t("Continue", "Continuer", "متابعة"),
  submit: t("Submit request", "Envoyer la demande", "إرسال الطلب"),
  loading: t("Submitting…", "Envoi en cours…", "جارٍ الإرسال…"),
  select: t("Select an option", "Choisir une option", "اختر خيارًا"),
  required: t(
    "Complete the required fields to continue.",
    "Veuillez remplir les champs obligatoires.",
    "يرجى إكمال الحقول المطلوبة للمتابعة.",
  ),
  error: t(
    "We could not submit your request. Please try again.",
    "Impossible d’envoyer votre demande. Veuillez réessayer.",
    "تعذر إرسال طلبك. يرجى المحاولة مجددًا.",
  ),
  consent: t(
    "I authorise BLIES to process this information to respond to my enquiry. Do not upload sensitive personal information.",
    "J’autorise BLIES à traiter ces informations pour répondre à ma demande. Ne téléversez pas de données personnelles sensibles.",
    "أوافق على معالجة BLIES لهذه المعلومات للرد على استفساري. لا ترفع معلومات شخصية حساسة.",
  ),
  turnaround: t(
    "Target: 72 hours to 5 business days, excluding weekends, subject to complete specifications, supplier availability and cargo requirements.",
    "Objectif : 72 heures à 5 jours ouvrés, hors week-ends, sous réserve de spécifications complètes, de la disponibilité des fournisseurs et des exigences du fret.",
    "المدة المستهدفة: من 72 ساعة إلى 5 أيام عمل، باستثناء عطلات نهاية الأسبوع، وفقًا لاكتمال المواصفات وتوافر الموردين ومتطلبات الشحنة.",
  ),
  development: t(
    "Development preview · Contact details, legal terms and translations require approval before launch.",
    "Aperçu de développement · Coordonnées, textes juridiques et traductions à approuver avant le lancement.",
    "معاينة تطوير · يجب اعتماد بيانات التواصل والنصوص القانونية والترجمات قبل الإطلاق.",
  ),
  call: t("Call", "Appeler", "اتصال"),
  whatsapp: t(
    "WhatsApp — awaiting approved number",
    "WhatsApp — numéro approuvé en attente",
    "واتساب — بانتظار الرقم المعتمد",
  ),
  saved: t("Request received", "Demande reçue", "تم استلام الطلب"),
  reference: t("Your reference", "Votre référence", "رقم المرجع"),
  emailPending: t(
    "Your request is stored securely. Email confirmation is pending configuration or delivery; this screen is your acknowledgement.",
    "Votre demande est enregistrée de manière privée. La confirmation par e-mail attend la configuration ou l’envoi ; cet écran confirme la réception.",
    "تم حفظ طلبك بشكل خاص. تأكيد البريد الإلكتروني بانتظار الإعداد أو الإرسال؛ هذه الشاشة تؤكد الاستلام.",
  ),
  emailSent: t(
    "A confirmation email has been sent.",
    "Un e-mail de confirmation a été envoyé.",
    "تم إرسال رسالة تأكيد بالبريد الإلكتروني.",
  ),
  noUploads: t(
    "Document uploads are unavailable until private storage and malware scanning are connected. You can submit your request without documents.",
    "Le téléversement est indisponible avant la connexion du stockage privé et de l’analyse antivirus. Vous pouvez envoyer votre demande sans documents.",
    "رفع المستندات غير متاح حتى توصيل التخزين الخاص وفحص البرمجيات الضارة. يمكنك إرسال الطلب دون مستندات.",
  ),
  upload: t(
    "Supporting documents",
    "Documents complémentaires",
    "المستندات الداعمة",
  ),
  fileHelp: t(
    "PDF, JPG or PNG. Up to 10 MB per file, 3 files maximum. Files are scanned before private storage.",
    "PDF, JPG ou PNG. Jusqu’à 10 Mo par fichier, 3 fichiers maximum. Analyse antivirus avant stockage privé.",
    "PDF أو JPG أو PNG. حتى 10 ميغابايت للملف، وبحد أقصى 3 ملفات. تُفحص الملفات قبل التخزين الخاص.",
  ),
  fileError: t(
    "Use PDF, JPG or PNG files within the stated limits.",
    "Utilisez des fichiers PDF, JPG ou PNG dans les limites indiquées.",
    "استخدم ملفات PDF أو JPG أو PNG ضمن الحدود المذكورة.",
  ),
  review: t("Review your request", "Vérifier votre demande", "مراجعة طلبك"),
  edit: t("Edit", "Modifier", "تعديل"),
  noArticles: t(
    "More editorial content will be published after review.",
    "D’autres articles seront publiés après validation.",
    "سيتم نشر المزيد من المقالات بعد المراجعة.",
  ),
  quoteIntro: t(
    "Tell us what you need. We will coordinate the next steps.",
    "Décrivez votre besoin. Nous coordonnerons les prochaines étapes.",
    "أخبرنا باحتياجاتك. سننسق الخطوات التالية.",
  ),
  reviewNotice: t(
    "Translations are working editorial drafts awaiting professional human review.",
    "Les traductions sont des versions éditoriales de travail en attente de révision professionnelle.",
    "الترجمات مسودات تحريرية بانتظار مراجعة بشرية متخصصة.",
  ),
  trackingIntro: t(
    "Our owned road fleet uses GPS and route monitoring. Client-facing live tracking is in development. Send a tracking enquiry for an update; no live status is shown here.",
    "Notre flotte routière utilise le GPS et le suivi des itinéraires. Le suivi en direct destiné aux clients est en développement. Envoyez une demande pour obtenir une mise à jour ; aucun statut en direct n’est affiché ici.",
    "يستخدم أسطولنا البري نظام GPS ومراقبة المسارات. التتبع المباشر للعملاء قيد التطوير. أرسل استفسارًا للحصول على تحديث؛ لا تُعرض هنا حالة مباشرة.",
  ),
  footer: t(
    "Business Logistics Imports Exports & Suppliers. Established in 2012. Based in Sandton, Johannesburg, with a presence in Gabon and the UAE.",
    "Business Logistics Imports Exports & Suppliers. Fondée en 2012. Basée à Sandton, Johannesburg, avec une présence au Gabon et aux Émirats arabes unis.",
    "Business Logistics Imports Exports & Suppliers. تأسست عام 2012. مقرها في ساندتون، جوهانسبرغ، مع حضور في الغابون والإمارات العربية المتحدة.",
  ),
  legalDraft: t(
    "Draft for legal review. This page is not an approved legal policy. Production launch is blocked pending qualified review.",
    "Projet soumis à examen juridique. Cette page n’est pas une politique juridique approuvée. Le lancement est bloqué en attendant une validation qualifiée.",
    "مسودة للمراجعة القانونية. هذه الصفحة ليست سياسة قانونية معتمدة. الإطلاق متوقف حتى المراجعة المتخصصة.",
  ),
  noFleet: t(
    "BLIES owns its road fleet. Individual vehicle categories, specifications and authentic photographs will be published only after management verification. No fleet totals or payload claims are published.",
    "BLIES possède sa flotte routière. Les catégories, caractéristiques et photos authentiques seront publiées après vérification par la direction. Aucun total ni capacité de charge n’est publié.",
    "تمتلك BLIES أسطولها البري. لن تُنشر فئات المركبات والمواصفات والصور الأصلية إلا بعد تحقق الإدارة. لا تُنشر أعداد الأسطول أو ادعاءات الحمولة.",
  ),
};
export const fields = {
  service: t("Service", "Service", "الخدمة"),
  originCountry: t("Origin country", "Pays d’origine", "بلد المنشأ"),
  originCity: t("Origin city", "Ville d’origine", "مدينة المنشأ"),
  collection: t("Collection location", "Lieu de collecte", "موقع الاستلام"),
  destinationCountry: t(
    "Destination country",
    "Pays de destination",
    "بلد الوجهة",
  ),
  destinationCity: t(
    "Destination city",
    "Ville de destination",
    "مدينة الوجهة",
  ),
  crossBorder: t(
    "Cross-border requirements",
    "Exigences transfrontalières",
    "متطلبات العبور الحدودي",
  ),
  cargo: t(
    "Cargo / product description",
    "Description du fret / produit",
    "وصف الشحنة / المنتج",
  ),
  category: t("Product category", "Catégorie de produit", "فئة المنتج"),
  quantity: t("Quantity", "Quantité", "الكمية"),
  unit: t("Unit of measurement", "Unité de mesure", "وحدة القياس"),
  weight: t("Weight (kg)", "Poids (kg)", "الوزن (كغ)"),
  dimensions: t(
    "Dimensions (L × W × H, cm)",
    "Dimensions (L × l × H, cm)",
    "الأبعاد (طول × عرض × ارتفاع، سم)",
  ),
  packaging: t("Packaging", "Emballage", "التغليف"),
  temperature: t(
    "Required temperature (°C)",
    "Température requise (°C)",
    "درجة الحرارة المطلوبة (°م)",
  ),
  requirements: t(
    "Technical / cargo requirements",
    "Exigences techniques / du fret",
    "المتطلبات الفنية / متطلبات الشحنة",
  ),
  dangerous: t(
    "Dangerous goods details, if applicable",
    "Marchandises dangereuses, le cas échéant",
    "تفاصيل المواد الخطرة إن وجدت",
  ),
  date: t(
    "Required delivery date",
    "Date de livraison souhaitée",
    "تاريخ التسليم المطلوب",
  ),
  urgency: t(
    "Urgency / deadline details",
    "Urgence / échéance",
    "تفاصيل الاستعجال / الموعد النهائي",
  ),
  company: t("Company name", "Nom de l’entreprise", "اسم الشركة"),
  name: t("Contact name", "Nom du contact", "اسم جهة الاتصال"),
  email: t(
    "Business email",
    "E-mail professionnel",
    "البريد الإلكتروني المهني",
  ),
  phone: t("Telephone", "Téléphone", "الهاتف"),
  notes: t(
    "Additional information",
    "Informations complémentaires",
    "معلومات إضافية",
  ),
  shipment: t("Shipment reference", "Référence d’expédition", "مرجع الشحنة"),
};
export const steps = [
  t("Service", "Service", "الخدمة"),
  t("Route", "Itinéraire", "المسار"),
  t("Cargo", "Fret", "الشحنة"),
  t("Requirements", "Exigences", "المتطلبات"),
  t("Schedule", "Calendrier", "الجدول الزمني"),
  t("Contact", "Contact", "التواصل"),
  ui.upload,
  ui.review,
];
