import type { AppLanguage } from '../types/erp';

export interface TranslationBundle {
  appTitle: string;
  appSubtitle: string;
  languageArabic: string;
  languageFrench: string;
  serverConnected: string;
  serverDisconnected: string;
  serverChecking: string;
  serverDisconnectedBannerTitle: string;
  serverDisconnectedBannerBody: string;
  retryConnection: string;
  setup: {
    eyebrow: string;
    title: string;
    subtitle: string;
    orgSectionTitle: string;
    orgSectionDesc: string;
    adminSectionTitle: string;
    adminSectionDesc: string;
    legalName: string;
    legalNamePlaceholder: string;
    tradeName: string;
    legalForm: string;
    nif: string;
    nis: string;
    rc: string;
    ai: string;
    capitalDzd: string;
    wilaya: string;
    address: string;
    orgPhone: string;
    orgEmail: string;
    defaultLang: string;
    adminUsername: string;
    adminFullName: string;
    adminEmail: string;
    adminPhone: string;
    adminPassword: string;
    confirmPassword: string;
    passwordHint: string;
    submitButton: string;
    submitting: string;
    singleAdminNotice: string;
  };
  auth: {
    title: string;
    subtitle: string;
    usernameOrEmail: string;
    password: string;
    signIn: string;
    signingIn: string;
    signOut: string;
    localServerBadge: string;
    sessionNotice: string;
  };
  nav: {
    overview: string;
    projects: string;
    users: string;
    audit: string;
    organization: string;
    sectionOperations: string;
    sectionAdministration: string;
  };
  overview: {
    title: string;
    subtitle: string;
    orgIdentityHeading: string;
    systemHealthHeading: string;
    databaseEngine: string;
    apiRuntime: string;
    initializationState: string;
    initializedYes: string;
    foundationReadinessHeading: string;
    accessibleProjectsCount: string;
    activeSessionUser: string;
    quickActionsHeading: string;
    goToProjects: string;
    goToUsers: string;
    goToAudit: string;
    domainRoadmapHeading: string;
  };
  users: {
    title: string;
    subtitle: string;
    createButton: string;
    tableUsername: string;
    tableFullName: string;
    tableRoles: string;
    tableStatus: string;
    tableLastLogin: string;
    tableActions: string;
    statusActive: string;
    statusInactive: string;
    statusLocked: string;
    sysAdminLabel: string;
    activate: string;
    deactivate: string;
    editRoles: string;
    resetPassword: string;
    modalCreateTitle: string;
    modalEditTitle: string;
    modalResetTitle: string;
    fieldUsername: string;
    fieldFullName: string;
    fieldEmail: string;
    fieldPhone: string;
    fieldLanguage: string;
    fieldPassword: string;
    fieldNewPassword: string;
    fieldRoles: string;
    save: string;
    cancel: string;
    emptyTitle: string;
    emptyBody: string;
  };
  projects: {
    title: string;
    subtitle: string;
    createButton: string;
    emptyTitle: string;
    emptyBody: string;
    tableCode: string;
    tableName: string;
    tableLocation: string;
    tableStatus: string;
    tableBudget: string;
    tableMembers: string;
    manageAccess: string;
    modalCreateTitle: string;
    modalAccessTitle: string;
    fieldCode: string;
    fieldNameAr: string;
    fieldNameFr: string;
    fieldWilaya: string;
    fieldMunicipality: string;
    fieldAddress: string;
    fieldLandTitle: string;
    fieldPermitNo: string;
    fieldPermitDate: string;
    fieldStatus: string;
    fieldBudgetDzd: string;
    fieldBlocks: string;
    fieldUnits: string;
    assignMemberTitle: string;
    selectEmployee: string;
    projectRole: string;
    permFinancials: string;
    permSales: string;
    permConstruction: string;
    permDocuments: string;
    assignButton: string;
    removeMember: string;
    noMembersYet: string;
    projectGuardNotice: string;
  };
  audit: {
    title: string;
    subtitle: string;
    refresh: string;
    emptyTitle: string;
    tableTime: string;
    tableActor: string;
    tableEvent: string;
    tableSeverity: string;
    tableSummary: string;
    tableSource: string;
  };
  organization: {
    title: string;
    subtitle: string;
    fiscalTitle: string;
    locationTitle: string;
    runtimeTitle: string;
  };
}

const AR: TranslationBundle = {
  appTitle: 'PROMO GEST',
  appSubtitle: 'نظام تسيير الترقية العقارية — خادم محلي مستقل',
  languageArabic: 'العربية',
  languageFrench: 'Français',
  serverConnected: 'متصل بالخادم المحلي',
  serverDisconnected: 'انقطاع الاتصال بالخادم المحلي',
  serverChecking: 'فحص الاتصال المحلي...',
  serverDisconnectedBannerTitle: 'تعذر الوصول إلى الخادم المحلي للمؤسسة',
  serverDisconnectedBannerBody:
    'توقفت العمليات التجارية مؤقتاً لأن الخادم المحلي غير متاح. تبقى قاعدة بيانات PostgreSQL المصدر المرجعي الوحيد ولا يمكن إجراء معاملات دون اتصال بالخادم.',
  retryConnection: 'إعادة المحاولة',
  setup: {
    eyebrow: 'التثبيت الأولي للنظام المحلي',
    title: 'تهيئة مؤسسة الترقية العقارية',
    subtitle:
      'إعداد أولي آمن لمرة واحدة لربط هوية المؤسسة وإنشاء حساب مدير النظام الوحيد داخل الشبكة المحلية.',
    orgSectionTitle: '١. هوية المؤسسة العقارية',
    orgSectionDesc: 'المعلومات القانونية والجبائية الخاصة بالمرقي العقاري في الجزائر.',
    adminSectionTitle: '٢. حساب مدير النظام الوحيد',
    adminSectionDesc:
      'يسمح النظام بوجود مدير نظام واحد فقط لكل تثبيت محلي، ويتم إنشاؤه هنا دون أي بيانات دخول افتراضية.',
    legalName: 'الاسم القانوني للمؤسسة *',
    legalNamePlaceholder: 'مثال: شركة الترقية العقارية البهجة ذ.م.م',
    tradeName: 'الاسم التجاري (اختياري)',
    legalForm: 'الشكل القانوني *',
    nif: 'رقم التعريف الجبائي (NIF)',
    nis: 'رقم التعريف الإحصائي (NIS)',
    rc: 'رقم السجل التجاري (RC)',
    ai: 'رقم المادة الضريبية (AI)',
    capitalDzd: 'رأس المال الاجتماعي (دج)',
    wilaya: 'الولاية *',
    address: 'عنوان المقر الاجتماعي *',
    orgPhone: 'هاتف المؤسسة',
    orgEmail: 'البريد المهني للمؤسسة',
    defaultLang: 'اللغة الافتراضية للنظام',
    adminUsername: 'اسم مستخدم مدير النظام *',
    adminFullName: 'الاسم الكامل لمدير النظام *',
    adminEmail: 'البريد الإلكتروني لمدير النظام *',
    adminPhone: 'رقم الهاتف',
    adminPassword: 'كلمة المرور *',
    confirmPassword: 'تأكيد كلمة المرور *',
    passwordHint: '10 أحرف على الأقل تشمل حرفاً كبيراً وصغيراً ورقماً.',
    submitButton: 'إتمام التهيئة وإنشاء مدير النظام',
    submitting: 'جاري التهيئة الآمنة لقاعدة البيانات...',
    singleAdminNotice: 'تغلق هذه الشاشة نهائياً بمجرد إتمام التثبيت الأولي.',
  },
  auth: {
    title: 'تسجيل الدخول إلى النظام المحلي',
    subtitle: 'المصادقة محلية بالكامل عبر خادم المؤسسة عبر ملف تعريف ارتباط آمن HTTP-only.',
    usernameOrEmail: 'اسم المستخدم أو البريد الإلكتروني',
    password: 'كلمة المرور',
    signIn: 'دخول',
    signingIn: 'جاري التحقق...',
    signOut: 'تسجيل الخروج',
    localServerBadge: 'خادم محلي مستقل · DZD',
    sessionNotice: 'محمي بقفل تلقائي بعد 5 محاولات فاشلة وتحديد معدل الطلبات.',
  },
  nav: {
    overview: 'لوحة المؤسسة والصحة',
    projects: 'المشاريع والصلاحيات',
    users: 'حسابات الموظفين',
    audit: 'سجل التدقيق الأمني',
    organization: 'ملف المؤسسة',
    sectionOperations: 'العمليات العقارية',
    sectionAdministration: 'الإدارة والأمن المحلي',
  },
  overview: {
    title: 'المركز المحلي للمؤسسة',
    subtitle: 'حالة الخادم المحلي والجاهزية التشغيلية لتسيير المشاريع العقارية.',
    orgIdentityHeading: 'هوية المؤسسة المسجلة',
    systemHealthHeading: 'حالة الخادم وقاعدة البيانات',
    databaseEngine: 'قاعدة البيانات المحلية',
    apiRuntime: 'خادم التطبيق المحلي',
    initializationState: 'حالة التثبيت الأولي',
    initializedYes: 'مهيأ ومؤمّن',
    foundationReadinessHeading: 'نطاق المستخدم الحالي',
    accessibleProjectsCount: 'المشاريع المصرح بالوصول إليها',
    activeSessionUser: 'الحساب المتصل حالياً',
    quickActionsHeading: 'الإجراءات المتاحة',
    goToProjects: 'إدارة المشاريع وصلاحيات الفرق',
    goToUsers: 'إدارة حسابات الموظفين',
    goToAudit: 'مراجعة سجل التدقيق الأمني',
    domainRoadmapHeading: 'البنية المعيارية للترقية العقارية (الجزائر)',
  },
  users: {
    title: 'إدارة حسابات الموظفين',
    subtitle: 'إنشاء وتفعيل وتعطيل حسابات الموظفين مع ضمان وجود مدير نظام واحد فقط.',
    createButton: 'إضافة موظف جديد',
    tableUsername: 'اسم المستخدم',
    tableFullName: 'الاسم الكامل',
    tableRoles: 'الأدوار الوظيفية',
    tableStatus: 'الحالة',
    tableLastLogin: 'آخر دخول',
    tableActions: 'الإجراءات',
    statusActive: 'نشط',
    statusInactive: 'معطّل',
    statusLocked: 'مقفل مؤقتاً',
    sysAdminLabel: 'مدير النظام الوحيد',
    activate: 'تفعيل',
    deactivate: 'تعطيل',
    editRoles: 'تعديل الأدوار',
    resetPassword: 'تعيين كلمة مرور',
    modalCreateTitle: 'إنشاء حساب موظف جديد',
    modalEditTitle: 'تعديل بيانات وأدوار الموظف',
    modalResetTitle: 'إعادة تعيين كلمة مرور الموظف',
    fieldUsername: 'اسم المستخدم *',
    fieldFullName: 'الاسم الكامل *',
    fieldEmail: 'البريد الإلكتروني *',
    fieldPhone: 'رقم الهاتف',
    fieldLanguage: 'اللغة المفضلة',
    fieldPassword: 'كلمة المرور الأولية *',
    fieldNewPassword: 'كلمة المرور الجديدة *',
    fieldRoles: 'الأدوار الوظيفية *',
    save: 'حفظ',
    cancel: 'إلغاء',
    emptyTitle: 'لا توجد حسابات موظفين إضافية بعد',
    emptyBody: 'أنشئ حسابات لمسؤولي المبيعات والمالية والمهندسين لمنحهم صلاحيات محددة.',
  },
  projects: {
    title: 'المشاريع العقارية والتحكم في الوصول',
    subtitle: 'التفويض على مستوى كل مشروع يفرضه الخادم: لا يمكن لأي موظف الوصول إلى مشروع دون تعيين صريح.',
    createButton: 'إضافة مشروع عقاري',
    emptyTitle: 'لا توجد مشاريع مصرح لك بالوصول إليها',
    emptyBody: 'ستظهر هنا المشاريع العقارية بمجرد إنشائها أو تعيينك كعضو فيها.',
    tableCode: 'الرمز',
    tableName: 'المشروع العقاري',
    tableLocation: 'الموقع (الولاية / البلدية)',
    tableStatus: 'المرحلة',
    tableBudget: 'الميزانية التقديرية',
    tableMembers: 'الأعضاء المصرح لهم',
    manageAccess: 'صلاحيات المشروع',
    modalCreateTitle: 'إنشاء مشروع ترقية عقارية',
    modalAccessTitle: 'إدارة صلاحيات الوصول للمشروع',
    fieldCode: 'رمز المشروع *',
    fieldNameAr: 'اسم المشروع بالعربية *',
    fieldNameFr: 'اسم المشروع بالفرنسية *',
    fieldWilaya: 'الولاية *',
    fieldMunicipality: 'البلدية *',
    fieldAddress: 'العنوان الدقيق',
    fieldLandTitle: 'مرجع الدفتر العقاري / العقد',
    fieldPermitNo: 'رقم رخصة البناء',
    fieldPermitDate: 'تاريخ رخصة البناء',
    fieldStatus: 'حالة المشروع',
    fieldBudgetDzd: 'الميزانية التقديرية (دج)',
    fieldBlocks: 'عدد العمارات المخططة',
    fieldUnits: 'عدد الوحدات (شقق / محلات)',
    assignMemberTitle: 'منح صلاحية وصول لموظف',
    selectEmployee: 'اختر الموظف',
    projectRole: 'الدور داخل المشروع',
    permFinancials: 'عرض البيانات المالية',
    permSales: 'تسيير المبيعات والحجوزات',
    permConstruction: 'متابعة الأشغال',
    permDocuments: 'إدارة الوثائق المحلية',
    assignButton: 'منح الصلاحية',
    removeMember: 'سحب الصلاحية',
    noMembersYet: 'لم يتم تعيين أي موظف لهذا المشروع بعد.',
    projectGuardNotice: 'يتم التحقق من عضوية المشروع على الخادم في كل طلب API (403 Forbidden لغير الأعضاء).',
  },
  audit: {
    title: 'سجل التدقيق الأمني المحلي',
    subtitle: 'تتبع عمليات الدخول، حالات الرفض، إنشاء الحسابات، وتغييرات صلاحيات المشاريع.',
    refresh: 'تحديث السجل',
    emptyTitle: 'لا توجد أحداث مسجلة',
    tableTime: 'التاريخ والوقت',
    tableActor: 'الفاعل',
    tableEvent: 'الحدث',
    tableSeverity: 'المستوى',
    tableSummary: 'التفاصيل',
    tableSource: 'المصدر',
  },
  organization: {
    title: 'ملف المؤسسة المحلي',
    subtitle: 'البيانات القانونية والجبائية المسجلة لهذا التثبيت المستقل.',
    fiscalTitle: 'المعرفات الجبائية والتجارية (الجزائر)',
    locationTitle: 'المقر والعنوان',
    runtimeTitle: 'إعدادات التشغيل المحلي',
  },
};

const FR: TranslationBundle = {
  appTitle: 'PROMO GEST',
  appSubtitle: 'ERP Promotion Immobilière — Serveur Local Autonome',
  languageArabic: 'العربية',
  languageFrench: 'Français',
  serverConnected: 'Connecté au serveur local',
  serverDisconnected: 'Serveur local inaccessible',
  serverChecking: 'Vérification du serveur local...',
  serverDisconnectedBannerTitle: 'Connexion perdue avec le serveur local',
  serverDisconnectedBannerBody:
    'Les opérations métier sont suspendues car le serveur local est indisponible. PostgreSQL reste la source unique de vérité : aucune transaction ne peut continuer hors serveur.',
  retryConnection: 'Réessayer',
  setup: {
    eyebrow: 'Installation initiale locale',
    title: 'Initialisation de l\'entreprise immobilière',
    subtitle:
      'Configuration sécurisée à usage unique : enregistrez l\'identité de l\'organisation et créez l\'unique compte Administrateur Système du serveur local.',
    orgSectionTitle: '1. Identité de l\'organisation',
    orgSectionDesc: 'Informations légales et fiscales du promoteur immobilier en Algérie.',
    adminSectionTitle: '2. Compte unique Administrateur Système',
    adminSectionDesc:
      'Un seul Administrateur Système est autorisé par installation locale. Aucun identifiant par défaut n\'est créé.',
    legalName: 'Raison sociale *',
    legalNamePlaceholder: 'Ex : SARL Promotion Immobilière El-Bahdja',
    tradeName: 'Nom commercial (optionnel)',
    legalForm: 'Forme juridique *',
    nif: 'NIF (Identification Fiscale)',
    nis: 'NIS (Identification Statistique)',
    rc: 'Registre de Commerce (RC)',
    ai: 'Article d\'Imposition (AI)',
    capitalDzd: 'Capital social (DZD)',
    wilaya: 'Wilaya *',
    address: 'Adresse du siège social *',
    orgPhone: 'Téléphone entreprise',
    orgEmail: 'E-mail professionnel',
    defaultLang: 'Langue par défaut',
    adminUsername: 'Identifiant administrateur *',
    adminFullName: 'Nom complet *',
    adminEmail: 'E-mail administrateur *',
    adminPhone: 'Téléphone',
    adminPassword: 'Mot de passe *',
    confirmPassword: 'Confirmer le mot de passe *',
    passwordHint: '10 caractères minimum incluant majuscule, minuscule et chiffre.',
    submitButton: 'Initialiser le serveur et créer l\'administrateur',
    submitting: 'Initialisation transactionnelle de PostgreSQL...',
    singleAdminNotice: 'Cet assistant est définitivement verrouillé après l\'initialisation.',
  },
  auth: {
    title: 'Connexion au serveur local',
    subtitle: 'Authentification locale par cookie sécurisé HTTP-only émis par le serveur de l\'entreprise.',
    usernameOrEmail: 'Identifiant ou adresse e-mail',
    password: 'Mot de passe',
    signIn: 'Se connecter',
    signingIn: 'Vérification...',
    signOut: 'Déconnexion',
    localServerBadge: 'Serveur Local · DZD',
    sessionNotice: 'Protégé par verrouillage automatique après 5 échecs et limitation de débit.',
  },
  nav: {
    overview: 'Vue d\'ensemble & Santé',
    projects: 'Projets & Accès',
    users: 'Comptes Employés',
    audit: 'Journal d\'Audit',
    organization: 'Organisation',
    sectionOperations: 'Opérations Immobilières',
    sectionAdministration: 'Administration & Sécurité',
  },
  overview: {
    title: 'Console locale de l\'organisation',
    subtitle: 'État du serveur local et socle opérationnel de gestion immobilière.',
    orgIdentityHeading: 'Organisation enregistrée',
    systemHealthHeading: 'Santé serveur & base de données',
    databaseEngine: 'Moteur PostgreSQL local',
    apiRuntime: 'Serveur applicatif local',
    initializationState: 'État d\'initialisation',
    initializedYes: 'Initialisé et verrouillé',
    foundationReadinessHeading: 'Périmètre de la session',
    accessibleProjectsCount: 'Projets accessibles',
    activeSessionUser: 'Utilisateur connecté',
    quickActionsHeading: 'Actions directes',
    goToProjects: 'Gérer les projets et les accès',
    goToUsers: 'Gérer les comptes employés',
    goToAudit: 'Consulter le journal de sécurité',
    domainRoadmapHeading: 'Socle métier promotion immobilière (Algérie)',
  },
  users: {
    title: 'Gestion des comptes employés',
    subtitle: 'Création, activation, désactivation et attribution des rôles applicatifs (Administrateur Système unique).',
    createButton: 'Nouvel employé',
    tableUsername: 'Identifiant',
    tableFullName: 'Nom complet',
    tableRoles: 'Rôles',
    tableStatus: 'Statut',
    tableLastLogin: 'Dernière connexion',
    tableActions: 'Actions',
    statusActive: 'Actif',
    statusInactive: 'Désactivé',
    statusLocked: 'Verrouillé',
    sysAdminLabel: 'Admin Système Unique',
    activate: 'Activer',
    deactivate: 'Désactiver',
    editRoles: 'Modifier rôles',
    resetPassword: 'Réinitialiser mot de passe',
    modalCreateTitle: 'Créer un compte employé',
    modalEditTitle: 'Modifier le profil et les rôles',
    modalResetTitle: 'Réinitialiser le mot de passe',
    fieldUsername: 'Identifiant *',
    fieldFullName: 'Nom complet *',
    fieldEmail: 'Adresse e-mail *',
    fieldPhone: 'Téléphone',
    fieldLanguage: 'Langue préférée',
    fieldPassword: 'Mot de passe initial *',
    fieldNewPassword: 'Nouveau mot de passe *',
    fieldRoles: 'Rôles attribués *',
    save: 'Enregistrer',
    cancel: 'Annuler',
    emptyTitle: 'Aucun compte employé supplémentaire',
    emptyBody: 'Créez les comptes de vos responsables commerciaux, financiers et ingénieurs.',
  },
  projects: {
    title: 'Projets immobiliers & Contrôle d\'accès',
    subtitle: 'Autorisation appliquée côté serveur par projet : un employé ne peut jamais accéder à un projet non attribué.',
    createButton: 'Nouveau projet',
    emptyTitle: 'Aucun projet autorisé',
    emptyBody: 'Les projets immobiliers auxquels vous êtes affecté apparaîtront ici.',
    tableCode: 'Code',
    tableName: 'Projet immobilier',
    tableLocation: 'Localisation (Wilaya / Commune)',
    tableStatus: 'Statut',
    tableBudget: 'Budget estimatif',
    tableMembers: 'Membres autorisés',
    manageAccess: 'Accès projet',
    modalCreateTitle: 'Créer un projet immobilier',
    modalAccessTitle: 'Gestion des accès au projet',
    fieldCode: 'Code projet *',
    fieldNameAr: 'Nom du projet (AR) *',
    fieldNameFr: 'Nom du projet (FR) *',
    fieldWilaya: 'Wilaya *',
    fieldMunicipality: 'Commune *',
    fieldAddress: 'Adresse du site',
    fieldLandTitle: 'Référence foncière / Livret',
    fieldPermitNo: 'N° Permis de construire',
    fieldPermitDate: 'Date du permis',
    fieldStatus: 'Phase du projet',
    fieldBudgetDzd: 'Budget estimatif (DZD)',
    fieldBlocks: 'Bâtiments / Blocs prévus',
    fieldUnits: 'Unités prévues (logements / locaux)',
    assignMemberTitle: 'Attribuer l\'accès à un employé',
    selectEmployee: 'Sélectionner un employé',
    projectRole: 'Rôle sur le projet',
    permFinancials: 'Voir les finances',
    permSales: 'Gérer les ventes',
    permConstruction: 'Suivre les travaux',
    permDocuments: 'Gérer les documents locaux',
    assignButton: 'Attribuer l\'accès',
    removeMember: 'Révoquer',
    noMembersYet: 'Aucun employé affecté à ce projet pour le moment.',
    projectGuardNotice: 'Vérification serveur systématique : toute requête directe hors périmètre renvoie 403 Forbidden.',
  },
  audit: {
    title: 'Journal d\'audit de sécurité',
    subtitle: 'Traçabilité des connexions, refus d\'accès, création de comptes et habilitations projets.',
    refresh: 'Actualiser',
    emptyTitle: 'Aucun événement enregistré',
    tableTime: 'Horodatage',
    tableActor: 'Acteur',
    tableEvent: 'Événement',
    tableSeverity: 'Sévérité',
    tableSummary: 'Résumé',
    tableSource: 'Adresse IP',
  },
  organization: {
    title: 'Identité de l\'organisation',
    subtitle: 'Informations légales et fiscales de cette installation locale autonome.',
    fiscalTitle: 'Identifiants fiscaux et commerciaux',
    locationTitle: 'Siège social',
    runtimeTitle: 'Paramètres locaux',
  },
};

export function getTranslations(lang: AppLanguage): TranslationBundle {
  return lang === 'fr' ? FR : AR;
}

const API_ERROR_MESSAGES: Record<string, { ar: string; fr: string }> = {
  SETUP_ALREADY_INITIALIZED: {
    ar: 'تمت تهيئة هذا التثبيت مسبقاً ولا يمكن إعادة تشغيل معالج التثبيت.',
    fr: 'Cette installation est déjà initialisée et ne peut pas être réinitialisée.',
  },
  AUTH_INVALID_CREDENTIALS: {
    ar: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
    fr: 'Identifiant ou mot de passe incorrect.',
  },
  AUTH_ACCOUNT_INACTIVE: {
    ar: 'تم تعطيل هذا الحساب من طرف مدير النظام.',
    fr: 'Ce compte a été désactivé par l\'Administrateur Système.',
  },
  AUTH_ACCOUNT_LOCKED: {
    ar: 'تم قفل الحساب مؤقتاً بسبب تكرار محاولات الدخول الفاشلة. يرجى المحاولة لاحقاً.',
    fr: 'Compte temporairement verrouillé suite à plusieurs tentatives échouées. Réessayez plus tard.',
  },
  SINGLE_SYSTEM_ADMIN_ONLY: {
    ar: 'يسمح النظام بحساب مدير نظام واحد فقط لكل تثبيت محلي.',
    fr: 'Un seul compte Administrateur Système est autorisé par installation locale.',
  },
  CANNOT_DEACTIVATE_SYSTEM_ADMIN: {
    ar: 'لا يمكن تعطيل حساب مدير النظام الوحيد.',
    fr: 'Le compte unique Administrateur Système ne peut pas être désactivé.',
  },
  USER_ALREADY_EXISTS: {
    ar: 'اسم المستخدم أو البريد الإلكتروني مسجل مسبقاً.',
    fr: 'Cet identifiant ou cette adresse e-mail existe déjà.',
  },
  PROJECT_CODE_EXISTS: {
    ar: 'رمز المشروع مستخدم مسبقاً.',
    fr: 'Ce code projet est déjà utilisé.',
  },
  PROJECT_ACCESS_DENIED: {
    ar: 'ليس لديك صلاحية الوصول إلى هذا المشروع.',
    fr: 'Vous n\'avez pas l\'autorisation d\'accéder à ce projet.',
  },
  PASSWORD_TOO_SHORT: {
    ar: 'كلمة المرور يجب أن تحتوي على 10 أحرف على الأقل.',
    fr: 'Le mot de passe doit contenir au moins 10 caractères.',
  },
  PASSWORD_COMPLEXITY_UNMET: {
    ar: 'كلمة المرور يجب أن تتضمن حرفاً كبيراً وحرفاً صغيراً ورقماً.',
    fr: 'Le mot de passe doit contenir une majuscule, une minuscule et un chiffre.',
  },
  CSRF_TOKEN_INVALID: {
    ar: 'انتهت صلاحية رمز الحماية الأمني (CSRF). يرجى تحديث الصفحة والمحاولة مجدداً.',
    fr: 'Jeton anti-falsification (CSRF) manquant ou expiré. Veuillez réessayer.',
  },
  CANNOT_MODIFY_SYSTEM_ADMIN: {
    ar: 'لا يمكن تعديل حساب مدير النظام الوحيد أو إعادة تعيين كلمة مروره من هذه الواجهة.',
    fr: 'Le compte unique Administrateur Système ne peut pas être modifié ici.',
  },
  ENDPOINT_NOT_FOUND: {
    ar: 'نقطة النهاية المطلوبة غير موجودة.',
    fr: 'Le point de terminaison demandé est introuvable.',
  },
};

export function translateApiError(code: string | undefined, fallbackMessage: string, lang: AppLanguage): string {
  if (code && API_ERROR_MESSAGES[code]) {
    return API_ERROR_MESSAGES[code][lang];
  }
  return fallbackMessage;
}
