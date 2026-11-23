import type { AppLanguage } from '../../types/erp';

export interface TranslationBundle {
  appTitle: string;
  appSubtitle: string;
  languageArabic: string;
  languageFrench: string;
  operationTemporarilyUnavailable: string;
  loginFailedGeneric: string;
  loadingWorkspace: string;
  unexpectedErrorTitle: string;
  unexpectedErrorDescription: string;
  unexpectedErrorRetry: string;
  unexpectedErrorReload: string;
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
    bootstrapToken: string;
    bootstrapTokenHint: string;
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
    setupCompletedNotice: string;
    logoutFailed: string;
    retryLogout: string;
    passwordChangeRequiredTitle: string;
    passwordChangeRequiredDescription: string;
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
    changePassword: string;
    changingPassword: string;
    passwordChangedNotice: string;
    temporaryPasswordExpired: string;
    changePasswordAction: string;
    changePasswordModalTitle: string;
    changePasswordModalDescription: string;
    changePasswordCancel: string;
    passwordCurrentRequired: string;
    passwordTooLong: string;
    passwordMismatch: string;
    passwordChangeFailed: string;
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
    temporaryPasswordNotice: string;
    mustChangePasswordBadge: string;
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
    structureButton: string;
    structureTitle: string;
    buildings: string;
    structureEmpty: string;
    createBuilding: string;
    editBuilding: string;
    saveBuilding: string;
    buildingCode: string;
    buildingNameAr: string;
    buildingNameFr: string;
    buildingStatus: string;
    floors: string;
    floorNumber: string;
    floorNameAr: string;
    floorNameFr: string;
    addFloor: string;
    editFloor: string;
    saveFloor: string;
    noFloors: string;
    units: string;
    unitNumber: string;
    unitType: string;
    unitStatus: string;
    addUnit: string;
    noUnits: string;
    grossArea: string;
    netArea: string;
    roomsCount: string;
    editUnit: string;
    saveUnit: string;
    changeUnitStatus: string;
    salesWorkflowNotice: string;
    editButton: string;
    modalCreateTitle: string;
    modalEditTitle: string;
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
    editButton: string;
    saveButton: string;
    savingButton: string;
    cancelButton: string;
    saveSuccess: string;
    readOnlyNotice: string;
    currency: string;
  };
}

const AR: TranslationBundle = {
  appTitle: 'PROMO GEST',
  appSubtitle: 'نظام تسيير الترقية العقارية — خادم محلي مستقل',
  languageArabic: 'العربية',
  languageFrench: 'Français',
  operationTemporarilyUnavailable: 'تعذّر إتمام العملية حالياً. يرجى المحاولة مجدداً.',
  loginFailedGeneric: 'تعذّر تسجيل الدخول. تحقّق من بياناتك وحاول مرة أخرى.',
  loadingWorkspace: 'جارٍ تحميل مساحة العمل...',
  unexpectedErrorTitle: 'حدث خطأ غير متوقع في هذه الشاشة',
  unexpectedErrorDescription: 'تعذّر عرض هذا الجزء من الواجهة. يمكنك إعادة المحاولة، أو إعادة تحميل التطبيق. لم تُفقد البيانات المحفوظة على الخادم.',
  unexpectedErrorRetry: 'إعادة المحاولة',
  unexpectedErrorReload: 'إعادة تحميل التطبيق',
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
    passwordHint: 'من 10 إلى 128 حرفاً تشمل حرفاً كبيراً وصغيراً ورقماً.',
    bootstrapToken: 'رمز التهيئة الأولية (X-PROMOGEST-SETUP-TOKEN) *',
    bootstrapTokenHint: 'أدخل الرمز السري المهيأ على الخادم (PROMOGEST_SETUP_TOKEN) لإتمام الإعداد من خارج الجهاز المحلي.',
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
    setupCompletedNotice: 'اكتملت تهيئة المؤسسة وإنشاء حساب مدير النظام. سجّل الدخول الآن ببيانات الحساب الذي أنشأته.',
    logoutFailed: 'تعذّر تأكيد تسجيل الخروج من الخادم. بقيت الجلسة نشطة؛ تحقق من الاتصال ثم أعد المحاولة.',
    retryLogout: 'إعادة المحاولة',
    passwordChangeRequiredTitle: 'يجب تغيير كلمة المرور المؤقتة',
    passwordChangeRequiredDescription: 'هذه كلمة مرور مؤقتة أنشأها مسؤول النظام. يجب تعيين كلمة مرور شخصية قبل الوصول إلى بيانات المؤسسة أو المشاريع. تنتهي صلاحيتها خلال 24 ساعة من إصدارها.',
    currentPassword: 'كلمة المرور الحالية',
    newPassword: 'كلمة المرور الشخصية الجديدة',
    confirmNewPassword: 'تأكيد كلمة المرور الجديدة',
    changePassword: 'تغيير كلمة المرور',
    changingPassword: 'جارٍ تحديث كلمة المرور...',
    passwordChangedNotice: 'تم تغيير كلمة المرور وإبطال الجلسات السابقة. سجّل الدخول مجدداً بكلمة المرور الجديدة.',
    temporaryPasswordExpired: 'انتهت صلاحية كلمة المرور المؤقتة. اطلب من مدير النظام إعادة تعيينها.',
    changePasswordAction: 'تغيير كلمة المرور',
    changePasswordModalTitle: 'تغيير كلمة المرور',
    changePasswordModalDescription: 'أدخل كلمة المرور الحالية ثم كلمة مرور شخصية جديدة. بعد الحفظ تُغلق كل الجلسات وتعود إلى شاشة الدخول لتسجيل الدخول بكلمة المرور الجديدة.',
    changePasswordCancel: 'إلغاء',
    passwordCurrentRequired: 'يرجى إدخال كلمة المرور الحالية.',
    passwordTooLong: 'كلمة المرور تتجاوز الحد الأقصى المسموح به.',
    passwordMismatch: 'تأكيد كلمة المرور الجديدة غير مطابق.',
    passwordChangeFailed: 'تعذر تغيير كلمة المرور.',
  },
  nav: {
    overview: 'مساحة المؤسسة',
    projects: 'دليل المشاريع',
    users: 'حسابات الموظفين',
    audit: 'سجل التدقيق الأمني',
    organization: 'ملف المؤسسة',
    sectionOperations: 'العمليات العقارية',
    sectionAdministration: 'الإدارة التقنية والأمن',
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
    temporaryPasswordNotice: 'كلمة المرور التي تدخلها مؤقتة لمدة 24 ساعة. يجب على الموظف تغييرها عند أول دخول قبل الوصول إلى بيانات النظام. سلّمها له عبر قناة محلية آمنة ولا تسجلها في الملاحظات.',
    mustChangePasswordBadge: 'يتطلب تغيير كلمة المرور',
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
    structureButton: 'العمارات والوحدات',
    structureTitle: 'الهيكل العقاري للمشروع',
    buildings: 'العمارات',
    structureEmpty: 'لم تتم إضافة أي عمارات لهذا المشروع بعد.',
    createBuilding: 'إضافة عمارة',
    editBuilding: 'تعديل العمارة',
    saveBuilding: 'حفظ بيانات العمارة',
    buildingCode: 'رمز العمارة',
    buildingNameAr: 'اسم العمارة بالعربية',
    buildingNameFr: 'اسم العمارة بالفرنسية',
    buildingStatus: 'حالة العمارة',
    floors: 'الطوابق',
    floorNumber: 'رقم الطابق',
    floorNameAr: 'اسم الطابق بالعربية',
    floorNameFr: 'اسم الطابق بالفرنسية',
    addFloor: 'إضافة طابق',
    editFloor: 'تعديل الطابق',
    saveFloor: 'حفظ بيانات الطابق',
    noFloors: 'لا توجد طوابق مسجلة لهذه العمارة.',
    units: 'الوحدات العقارية',
    unitNumber: 'رقم الوحدة',
    unitType: 'نوع الوحدة',
    unitStatus: 'حالة الوحدة',
    addUnit: 'إضافة وحدة',
    noUnits: 'لا توجد وحدات مسجلة لهذا الطابق.',
    grossArea: 'المساحة الإجمالية (م²)',
    netArea: 'المساحة الصافية (م²)',
    roomsCount: 'عدد الغرف',
    editUnit: 'تعديل الوحدة',
    saveUnit: 'حفظ التعديلات',
    changeUnitStatus: 'تحديث الحالة',
    salesWorkflowNotice: 'الحجز والبيع والتسليم تُدار عبر مسار البيع والعقود، ولا تُسجّل مباشرة من شاشة الهيكل العقاري.',
    editButton: 'تعديل البيانات',
    modalCreateTitle: 'إنشاء مشروع ترقية عقارية',
    modalEditTitle: 'تعديل بيانات المشروع العقاري',
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
    editButton: 'تعديل ملف المؤسسة',
    saveButton: 'حفظ التغييرات',
    savingButton: 'جارٍ الحفظ...',
    cancelButton: 'إلغاء',
    saveSuccess: 'تم حفظ بيانات المؤسسة بنجاح.',
    readOnlyNotice: 'ليس لديك صلاحية تعديل بيانات المؤسسة. يمكنك الاطلاع عليها فقط.',
    currency: 'العملة',
  },
};

const FR: TranslationBundle = {
  appTitle: 'PROMO GEST',
  appSubtitle: 'ERP Promotion Immobilière — Serveur Local Autonome',
  languageArabic: 'العربية',
  languageFrench: 'Français',
  operationTemporarilyUnavailable: "Opération impossible pour le moment. Veuillez réessayer.",
  loginFailedGeneric: "Connexion impossible. Vérifiez vos identifiants et réessayez.",
  loadingWorkspace: "Chargement de l'espace de travail...",
  unexpectedErrorTitle: "Une erreur inattendue s'est produite dans cet écran",
  unexpectedErrorDescription: "Cette partie de l'interface n'a pas pu être affichée. Réessayez ou rechargez l'application. Les données enregistrées sur le serveur ne sont pas perdues.",
  unexpectedErrorRetry: "Réessayer",
  unexpectedErrorReload: "Recharger l'application",
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
    passwordHint: 'De 10 à 128 caractères incluant majuscule, minuscule et chiffre.',
    bootstrapToken: 'Jeton d\'initialisation (X-PROMOGEST-SETUP-TOKEN) *',
    bootstrapTokenHint: 'Saisissez le jeton configuré sur le serveur (PROMOGEST_SETUP_TOKEN) pour initialiser à distance.',
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
    setupCompletedNotice: 'L’organisation est initialisée et le compte Administrateur Système est créé. Connectez-vous avec les identifiants que vous venez de définir.',
    logoutFailed: 'Le serveur n’a pas confirmé la déconnexion. La session reste active ; vérifiez la connexion puis réessayez.',
    retryLogout: 'Réessayer',
    passwordChangeRequiredTitle: 'Changement du mot de passe temporaire obligatoire',
    passwordChangeRequiredDescription: 'Ce mot de passe temporaire a été défini par un administrateur. Définissez un mot de passe personnel avant d’accéder aux données de l’organisation ou des projets. Il expire 24 heures après son émission.',
    currentPassword: 'Mot de passe actuel',
    newPassword: 'Nouveau mot de passe personnel',
    confirmNewPassword: 'Confirmer le nouveau mot de passe',
    changePassword: 'Changer le mot de passe',
    changingPassword: 'Mise à jour du mot de passe...',
    passwordChangedNotice: 'Le mot de passe a été modifié et les anciennes sessions révoquées. Connectez-vous à nouveau avec votre nouveau mot de passe.',
    temporaryPasswordExpired: 'Le mot de passe temporaire a expiré. Demandez une nouvelle réinitialisation à l’Administrateur Système.',
    changePasswordAction: 'Changer le mot de passe',
    changePasswordModalTitle: 'Changer le mot de passe',
    changePasswordModalDescription: 'Saisissez votre mot de passe actuel puis un nouveau mot de passe personnel. Après validation, toutes les sessions sont fermées et vous revenez à l’écran de connexion.',
    changePasswordCancel: 'Annuler',
    passwordCurrentRequired: 'Saisissez votre mot de passe actuel.',
    passwordTooLong: 'Le mot de passe dépasse la longueur maximale autorisée.',
    passwordMismatch: 'La confirmation du nouveau mot de passe ne correspond pas.',
    passwordChangeFailed: 'Impossible de modifier le mot de passe.',
  },
  nav: {
    overview: 'Espace Organisation',
    projects: 'Annuaire des Projets',
    users: 'Comptes Employés',
    audit: 'Journal d\'Audit',
    organization: 'Profil Organisation',
    sectionOperations: 'Opérations Immobilières',
    sectionAdministration: 'Administration Technique',
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
    temporaryPasswordNotice: 'Le mot de passe saisi est temporaire pendant 24 heures. L’employé doit le remplacer à sa première connexion avant tout accès aux données. Transmettez-le par un canal local sécurisé et ne le consignez pas dans les notes.',
    mustChangePasswordBadge: 'Changement de mot de passe requis',
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
    structureButton: 'Bâtiments et unités',
    structureTitle: 'Structure immobilière du projet',
    buildings: 'Bâtiments',
    structureEmpty: 'Aucun bâtiment n’a encore été ajouté à ce projet.',
    createBuilding: 'Ajouter un bâtiment',
    editBuilding: 'Modifier le bâtiment',
    saveBuilding: 'Enregistrer le bâtiment',
    buildingCode: 'Code du bâtiment',
    buildingNameAr: 'Nom du bâtiment en arabe',
    buildingNameFr: 'Nom du bâtiment en français',
    buildingStatus: 'Statut du bâtiment',
    floors: 'Étages',
    floorNumber: 'Numéro de l’étage',
    floorNameAr: 'Nom de l’étage en arabe',
    floorNameFr: 'Nom de l’étage en français',
    addFloor: 'Ajouter un étage',
    editFloor: 'Modifier l’étage',
    saveFloor: 'Enregistrer l’étage',
    noFloors: 'Aucun étage enregistré pour ce bâtiment.',
    units: 'Unités immobilières',
    unitNumber: 'Numéro de l’unité',
    unitType: 'Type d’unité',
    unitStatus: 'Statut de l’unité',
    addUnit: 'Ajouter une unité',
    noUnits: 'Aucune unité enregistrée à cet étage.',
    grossArea: 'Surface brute (m²)',
    netArea: 'Surface nette (m²)',
    roomsCount: 'Nombre de pièces',
    editUnit: 'Modifier l’unité',
    saveUnit: 'Enregistrer les modifications',
    changeUnitStatus: 'Mettre à jour le statut',
    salesWorkflowNotice: 'La réservation, la vente et la livraison seront gérées par le circuit commercial et contractuel, et non depuis la structure immobilière.',
    editButton: 'Modifier',
    modalCreateTitle: 'Créer un projet immobilier',
    modalEditTitle: 'Modifier les données du projet immobilier',
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
    editButton: 'Modifier le profil de l’organisation',
    saveButton: 'Enregistrer les modifications',
    savingButton: 'Enregistrement…',
    cancelButton: 'Annuler',
    saveSuccess: 'Les informations de l’organisation ont été enregistrées.',
    readOnlyNotice: 'Vous ne disposez pas de l’autorisation de modifier le profil de l’organisation.',
    currency: 'Devise',
  },
};

export function getTranslations(lang: AppLanguage): TranslationBundle {
  return lang === 'fr' ? FR : AR;
}

const API_ERROR_MESSAGES: Record<string, { ar: string; fr: string }> = {
  SESSION_NOT_FOUND: {
    ar: 'الجلسة غير موجودة أو لم تعد نشطة.',
    fr: 'Cette session n’existe pas ou n’est plus active.',
  },
  CURRENT_SESSION_CONFIRMATION_REQUIRED: {
    ar: 'إنهاء الجلسة الحالية سيخرجك من الحساب. أكد هذا الاختيار للمتابعة.',
    fr: 'La fin de la session actuelle vous déconnectera. Confirmez cette action pour continuer.',
  },
  SESSION_DISPOSITION_INVALID: {
    ar: 'خيار إنهاء الجلسة لا يتوافق مع الجلسة المحددة.',
    fr: 'L’option de déconnexion ne correspond pas à la session sélectionnée.',
  },
  USER_CONCURRENCY_CONFLICT: {
    ar: 'تغيّر الحساب منذ تحميل بياناته. أعد تحميل الجلسة ثم حاول حفظ تفضيل اللغة مجدداً.',
    fr: 'Le compte a changé depuis son chargement. Rechargez la session avant de réessayer.',
  },
  USER_PREFERRED_LANGUAGE_INVALID: {
    ar: 'اللغة المختارة غير مدعومة. اختر العربية أو الفرنسية.',
    fr: 'La langue sélectionnée n’est pas prise en charge. Choisissez l’arabe ou le français.',
  },
  SETUP_ALREADY_INITIALIZED: {
    ar: 'تمت تهيئة هذا التثبيت مسبقاً ولا يمكن إعادة تشغيل معالج التثبيت.',
    fr: 'Cette installation est déjà initialisée et ne peut pas être réinitialisée.',
  },
  PASSWORD_CURRENT_INVALID: {
    ar: 'كلمة المرور الحالية غير صحيحة.',
    fr: 'Le mot de passe actuel est incorrect.',
  },
  PASSWORD_REUSE_NOT_ALLOWED: {
    ar: 'اختر كلمة مرور تختلف عن كلمة المرور المؤقتة.',
    fr: 'Choisissez un mot de passe différent du mot de passe temporaire.',
  },
  PASSWORD_CHANGE_REQUIRED: {
    ar: 'يجب تغيير كلمة المرور المؤقتة قبل متابعة العمل.',
    fr: 'Vous devez changer le mot de passe temporaire avant de continuer.',
  },
  TEMPORARY_PASSWORD_EXPIRED: {
    ar: 'انتهت صلاحية كلمة المرور المؤقتة. اطلب إعادة تعيينها.',
    fr: 'Le mot de passe temporaire a expiré. Demandez sa réinitialisation.',
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
  SETUP_BOOTSTRAP_FORBIDDEN: {
    ar: 'التهيئة الأولية مقصورة على الخادم المحلي أو تتطلب رمز تهيئة صالحاً (X-PROMOGEST-SETUP-TOKEN).',
    fr: 'L\'initialisation est réservée au serveur local ou requiert un jeton valide (X-PROMOGEST-SETUP-TOKEN).',
  },
  PASSWORD_TOO_SHORT: {
    ar: 'كلمة المرور يجب أن تحتوي على 10 أحرف على الأقل.',
    fr: 'Le mot de passe doit contenir au moins 10 caractères.',
  },
  PASSWORD_TOO_LONG: {
    ar: 'كلمة المرور يجب ألا تتجاوز 128 حرفاً.',
    fr: 'Le mot de passe ne doit pas dépasser 128 caractères.',
  },
  PASSWORD_COMPLEXITY_UNMET: {
    ar: 'كلمة المرور يجب أن تتضمن حرفاً كبيراً وحرفاً صغيراً ورقماً.',
    fr: 'Le mot de passe doit contenir une majuscule, une minuscule et un chiffre.',
  },
  CSRF_TOKEN_INVALID: {
    ar: 'انتهت صلاحية رمز الحماية الأمني (CSRF). يرجى تحديث الصفحة والمحاولة مجدداً.',
    fr: 'Jeton anti-falsification (CSRF) manquant ou expiré. Veuillez réessayer.',
  },
  HTTP_403_NON_JSON: {
    ar: 'رفض مضيف المعاينة أو الوسيط الطلب باستجابة 403 (قد تكون ملفات تعريف الارتباط محظورة في هذا المتصفح أو انتهت جلسة المعاينة). تأكد من تفعيل الكوكيز ثم أعد تحميل الصفحة وحاول مجدداً.',
    fr: 'L’hôte d’aperçu ou son proxy a renvoyé une réponse 403 (les cookies sont peut-être bloqués par le navigateur ou la session d’aperçu a expiré). Vérifiez l’activation des cookies, rechargez la page et réessayez.',
  },
  CONCURRENCY_CONFLICT: {
    ar: 'تم تعديل هذا السجل بواسطة عملية أخرى. حدّث البيانات ثم أعد المحاولة.',
    fr: 'Cet enregistrement a été modifié par une autre opération. Rechargez les données puis réessayez.',
  },
  FORBIDDEN_PROJECT_UPDATE: {
    ar: 'لا تملك صلاحية تعديل البيانات الأساسية لهذا المشروع.',
    fr: 'Vous ne disposez pas du droit de modifier les données principales de ce projet.',
  },
  PROJECT_STATUS_INVALID: {
    ar: 'حالة المشروع غير صالحة.',
    fr: 'Le statut du projet est invalide.',
  },
  PROJECT_BUDGET_INVALID: {
    ar: 'الميزانية يجب أن تكون قيمة موجبة ضمن النطاق المسموح.',
    fr: 'Le budget doit être une valeur positive dans la plage autorisée.',
  },
  PROJECT_COUNTS_NEGATIVE: {
    ar: 'عدد العمارات والوحدات لا يمكن أن يكون سالباً.',
    fr: 'Les nombres de bâtiments et d’unités ne peuvent pas être négatifs.',
  },
  PROJECT_NAME_TOO_LONG: {
    ar: 'اسم المشروع يتجاوز الحد الأقصى المسموح به.',
    fr: 'Le nom du projet dépasse la longueur maximale autorisée.',
  },
  PROJECT_LOCATION_TOO_LONG: {
    ar: 'بيانات الموقع تتجاوز الحد الأقصى المسموح به.',
    fr: 'Les données de localisation dépassent la longueur maximale autorisée.',
  },
  PROJECT_ADDRESS_TOO_LONG: {
    ar: 'عنوان المشروع يتجاوز الحد الأقصى المسموح به.',
    fr: 'L’adresse du projet dépasse la longueur maximale autorisée.',
  },
  PROJECT_LAND_REFERENCE_TOO_LONG: {
    ar: 'المرجع العقاري يتجاوز الحد الأقصى المسموح به.',
    fr: 'La référence foncière dépasse la longueur maximale autorisée.',
  },
  PROJECT_PERMIT_NUMBER_TOO_LONG: {
    ar: 'رقم رخصة البناء يتجاوز الحد الأقصى المسموح به.',
    fr: 'Le numéro du permis de construire dépasse la longueur maximale autorisée.',
  },
  FORBIDDEN_PROJECT_STRUCTURE_MANAGE: {
    ar: 'ليست لديك صلاحية إدارة عمارات وطوابق ووحدات هذا المشروع.',
    fr: 'Vous n’avez pas l’autorisation de gérer les bâtiments, étages et unités de ce projet.',
  },
  BUILDING_CODE_EXISTS: {
    ar: 'رمز العمارة مستخدم مسبقاً داخل هذا المشروع.',
    fr: 'Ce code de bâtiment existe déjà dans ce projet.',
  },
  BUILDING_CODE_REQUIRED: {
    ar: 'رمز العمارة مطلوب.',
    fr: 'Le code du bâtiment est obligatoire.',
  },
  BUILDING_NAME_REQUIRED: {
    ar: 'يجب إدخال اسم العمارة بالعربية أو الفرنسية.',
    fr: 'Le nom du bâtiment en arabe ou en français est obligatoire.',
  },
  BUILDING_STATUS_INVALID: {
    ar: 'حالة العمارة غير صالحة.',
    fr: 'Le statut du bâtiment est invalide.',
  },
  BUILDING_CODE_TOO_LONG: {
    ar: 'رمز العمارة يتجاوز الحد الأقصى المسموح.',
    fr: 'Le code du bâtiment dépasse la longueur maximale autorisée.',
  },
  BUILDING_NAME_TOO_LONG: {
    ar: 'اسم العمارة يتجاوز الحد الأقصى المسموح.',
    fr: 'Le nom du bâtiment dépasse la longueur maximale autorisée.',
  },
  FLOOR_NUMBER_EXISTS: {
    ar: 'رقم هذا الطابق مسجل مسبقاً في العمارة.',
    fr: 'Ce numéro d’étage existe déjà dans le bâtiment.',
  },
  FLOOR_NUMBER_INVALID: {
    ar: 'رقم الطابق خارج النطاق المسموح.',
    fr: 'Le numéro d’étage est hors de la plage autorisée.',
  },
  FLOOR_NAME_REQUIRED: {
    ar: 'يجب إدخال اسم الطابق بالعربية أو الفرنسية.',
    fr: 'Le nom de l’étage en arabe ou en français est obligatoire.',
  },
  FLOOR_NAME_TOO_LONG: {
    ar: 'اسم الطابق يتجاوز الحد الأقصى المسموح.',
    fr: 'Le nom de l’étage dépasse la longueur maximale autorisée.',
  },
  UNIT_NUMBER_EXISTS: {
    ar: 'رقم الوحدة مسجل مسبقاً في هذا الطابق.',
    fr: 'Ce numéro d’unité existe déjà à cet étage.',
  },
  UNIT_NUMBER_REQUIRED: {
    ar: 'رقم الوحدة العقارية مطلوب.',
    fr: 'Le numéro de l’unité immobilière est obligatoire.',
  },
  UNIT_NUMBER_TOO_LONG: {
    ar: 'رقم الوحدة يتجاوز الحد الأقصى المسموح.',
    fr: 'Le numéro de l’unité dépasse la longueur maximale autorisée.',
  },
  UNIT_TYPE_INVALID: {
    ar: 'نوع الوحدة العقارية غير صالح.',
    fr: 'Le type d’unité immobilière est invalide.',
  },
  UNIT_STATUS_INVALID: {
    ar: 'حالة الوحدة العقارية غير صالحة.',
    fr: 'Le statut de l’unité immobilière est invalide.',
  },
  UNIT_AREA_INVALID: {
    ar: 'المساحات يجب أن تكون غير سالبة وضمن النطاق المسموح.',
    fr: 'Les surfaces doivent être positives ou nulles et respecter la plage autorisée.',
  },
  UNIT_NET_AREA_EXCEEDS_GROSS: {
    ar: 'المساحة الصافية لا يمكن أن تتجاوز المساحة الإجمالية.',
    fr: 'La surface nette ne peut pas dépasser la surface brute.',
  },
  UNIT_ROOMS_COUNT_INVALID: {
    ar: 'عدد الغرف يجب أن يكون بين صفر و20.',
    fr: 'Le nombre de pièces doit être compris entre 0 et 20.',
  },
  UNIT_STATUS_REQUIRES_SALES_WORKFLOW: {
    ar: 'لا يمكن تسجيل الحجز أو البيع أو التسليم مباشرة. يجب تنفيذ ذلك عبر مسار البيع والعقود.',
    fr: 'La réservation, la vente ou la livraison ne peut pas être enregistrée directement. Utilisez le circuit commercial et contractuel.',
  },
  UNIT_STATUS_LOCKED_BY_SALES_WORKFLOW: {
    ar: 'حالة هذه الوحدة مرتبطة بمسار البيع أو العقد ولا يمكن تغييرها من شاشة الهيكل العقاري.',
    fr: 'Le statut de cette unité est lié au processus commercial ou contractuel et ne peut pas être modifié depuis la structure immobilière.',
  },
  UNIT_DETAILS_LOCKED_BY_SALES_WORKFLOW: {
    ar: 'لا يمكن تعديل البيانات الفنية لوحدة محجوزة أو مباعة أو مسلمة من هذه الشاشة.',
    fr: 'Les données techniques d’une unité réservée, vendue ou livrée ne peuvent pas être modifiées depuis cet écran.',
  },
  UNIT_STATUS_TRANSITION_INVALID: {
    ar: 'الانتقال المطلوب بين حالتي الوحدة غير مسموح.',
    fr: 'La transition demandée entre les deux statuts de l’unité n’est pas autorisée.',
  },
  CANNOT_MODIFY_SYSTEM_ADMIN: {
    ar: 'لا يمكن تعديل حساب مدير النظام الوحيد أو إعادة تعيين كلمة مروره من هذه الواجهة.',
    fr: 'Le compte unique Administrateur Système ne peut pas être modifié ici.',
  },

  FILE_NAME_TOO_LONG: {
    ar: 'اسم الملف يتجاوز الحد الأقصى المسموح به وهو 255 حرفاً.',
    fr: 'Le nom du fichier dépasse la limite autorisée de 255 caractères.',
  },
  FILE_TYPE_NOT_ALLOWED: {
    ar: 'نوع الملف غير مدعوم. الأنواع المسموحة: PDF والصور ومستندات Office وTXT وCSV.',
    fr: 'Type de fichier non pris en charge. Types autorisés : PDF, images, documents Office, TXT et CSV.',
  },
  FILE_SIGNATURE_INVALID: {
    ar: 'محتوى الملف لا يطابق نوعه أو امتداده المعلن. تم رفض الرفع.',
    fr: 'Le contenu du fichier ne correspond pas à son type ou extension déclaré. Téléversement refusé.',
  },
  FILE_SIZE_LIMIT_EXCEEDED: {
    ar: 'حجم الوثيقة يتجاوز الحد الأقصى المسموح به وهو 25 ميغابايت.',
    fr: 'La taille du document dépasse la limite autorisée de 25 Mo.',
  },
  FILE_SIZE_INVALID: {
    ar: 'الملف فارغ أو حجمه غير صالح.',
    fr: 'Le fichier est vide ou sa taille est invalide.',
  },
  FILE_CATEGORY_INVALID: {
    ar: 'تصنيف الوثيقة غير صالح.',
    fr: 'La catégorie du document est invalide.',
  },
  FILE_DESCRIPTION_TOO_LONG: {
    ar: 'وصف الوثيقة يجب ألا يتجاوز 500 حرف.',
    fr: 'La description du document ne doit pas dépasser 500 caractères.',
  },
  PROJECT_DOCUMENT_ACCESS_DENIED: {
    ar: 'لا تملك صلاحية الاطلاع على وثائق هذا المشروع.',
    fr: 'Vous n’êtes pas autorisé à consulter les documents de ce projet.',
  },
  FORBIDDEN_PROJECT_DOCUMENT_WRITE: {
    ar: 'لا تملك صلاحية رفع وثائق إلى هذا المشروع.',
    fr: 'Vous n’êtes pas autorisé à téléverser des documents dans ce projet.',
  },
  PROJECT_DOCUMENT_INTEGRITY_FAILED: {
    ar: 'فشل التحقق من سلامة الوثيقة، ولذلك تم منع تنزيلها.',
    fr: 'Le contrôle d’intégrité du document a échoué ; son téléchargement est bloqué.',
  },
  PROJECT_DOCUMENT_CONTENT_MISSING: {
    ar: 'محتوى الوثيقة غير موجود على الخادم المحلي.',
    fr: 'Le contenu du document est introuvable sur le serveur local.',
  },
  CUSTOMER_REFERENCE_INVALID: {
    ar: 'مرجع المشروع أو الموظف غير صالح.',
    fr: 'La référence du projet ou de l’employé est invalide.',
  },
  CUSTOMER_TYPE_INVALID: {
    ar: 'حدد نوع الزبون: شخص طبيعي أو شخص معنوي.',
    fr: 'Sélectionnez le type de client : personne physique ou morale.',
  },
  CUSTOMER_SOURCE_INVALID: {
    ar: 'مصدر التعرف على الزبون غير صالح.',
    fr: 'La source du contact est invalide.',
  },
  CUSTOMER_NAME_REQUIRED: {
    ar: 'اسم الزبون أو الكيان القانوني مطلوب.',
    fr: 'Le nom du client ou de l’entité juridique est obligatoire.',
  },
  CUSTOMER_NAME_TOO_LONG: {
    ar: 'اسم الزبون يجب ألا يتجاوز 200 حرف.',
    fr: 'Le nom du client ne doit pas dépasser 200 caractères.',
  },
  CUSTOMER_PHONE_INVALID: {
    ar: 'أدخل رقم هاتف صحيحاً يحتوي على 7 إلى 15 رقماً.',
    fr: 'Saisissez un numéro de téléphone valide de 7 à 15 chiffres.',
  },
  CUSTOMER_EMAIL_INVALID: {
    ar: 'عنوان البريد الإلكتروني غير صالح.',
    fr: 'L’adresse e-mail est invalide.',
  },
  CUSTOMER_DUPLICATE: {
    ar: 'يوجد زبون بالاسم ورقم الهاتف نفسيهما في هذا المشروع.',
    fr: 'Un client portant le même nom et le même numéro existe déjà dans ce projet.',
  },
  CUSTOMER_STATUS_INVALID: {
    ar: 'حالة سجل الزبون غير صالحة.',
    fr: 'Le statut du dossier client est invalide.',
  },
  PROJECT_CUSTOMER_ACCESS_DENIED: {
    ar: 'لا تملك صلاحية الاطلاع على سجل زبائن هذا المشروع.',
    fr: 'Vous n’êtes pas autorisé à consulter les clients de ce projet.',
  },
  FORBIDDEN_PROJECT_CUSTOMER_WRITE: {
    ar: 'لا تملك صلاحية إدارة زبائن هذا المشروع.',
    fr: 'Vous n’êtes pas autorisé à gérer les clients de ce projet.',
  },
  CUSTOMER_IDENTITY_DOCUMENT_ACCESS_DENIED: {
    ar: 'لا تملك صلاحية الاطلاع على وثائق المشروع لربطها بسجل الزبون.',
    fr: 'Vous n’êtes pas autorisé à consulter les documents du projet pour les lier au client.',
  },
  CUSTOMER_IDENTITY_DOCUMENT_NOT_FOUND: {
    ar: 'وثيقة الهوية المحددة لا تنتمي إلى هذا المشروع أو لم تعد موجودة.',
    fr: 'Le document d’identité sélectionné n’appartient pas à ce projet ou n’existe plus.',
  },
  CUSTOMER_CONTACT_TOO_LONG: {
    ar: 'اسم الشخص المسؤول عن الاتصال يجب ألا يتجاوز 150 حرفاً.',
    fr: 'Le nom de la personne à contacter ne doit pas dépasser 150 caractères.',
  },
  CUSTOMER_ADDRESS_TOO_LONG: {
    ar: 'عنوان الزبون يجب ألا يتجاوز 300 حرف.',
    fr: 'L’adresse du client ne doit pas dépasser 300 caractères.',
  },
  CUSTOMER_LANGUAGE_INVALID: {
    ar: 'اللغة المفضلة يجب أن تكون العربية أو الفرنسية.',
    fr: 'La langue préférée doit être l’arabe ou le français.',
  },
  CUSTOMER_NOT_FOUND: {
    ar: 'سجل الزبون غير موجود ضمن هذا المشروع.',
    fr: 'Le dossier client est introuvable dans ce projet.',
  },
  CUSTOMER_INTERACTION_REFERENCE_INVALID: {
    ar: 'مرجع الزبون أو الموظف غير صالح.',
    fr: 'La référence du client ou de l’employé est invalide.',
  },
  CUSTOMER_INTERACTION_SUBJECT_TOO_LONG: {
    ar: 'موضوع الاتصال يجب ألا يتجاوز 120 حرفاً.',
    fr: 'L’objet de la communication ne doit pas dépasser 120 caractères.',
  },
  CUSTOMER_INTERACTION_SUMMARY_TOO_LONG: {
    ar: 'ملخص الاتصال يجب ألا يتجاوز 1500 حرف.',
    fr: 'Le résumé de la communication ne doit pas dépasser 1 500 caractères.',
  },
  CUSTOMER_INTERACTION_TYPE_INVALID: {
    ar: 'نوع الاتصال غير صالح.',
    fr: 'Le type de communication est invalide.',
  },
  CUSTOMER_INTERACTION_SUBJECT_REQUIRED: {
    ar: 'موضوع الاتصال مطلوب.',
    fr: 'L’objet de la communication est obligatoire.',
  },
  CUSTOMER_INTERACTION_SUMMARY_REQUIRED: {
    ar: 'ملخص الاتصال مطلوب.',
    fr: 'Le résumé de la communication est obligatoire.',
  },
  CUSTOMER_INTERACTION_DATE_INVALID: {
    ar: 'تاريخ الاتصال لا يمكن أن يكون في المستقبل.',
    fr: 'La date de communication ne peut pas être dans le futur.',
  },
  CUSTOMER_FOLLOW_UP_DATE_INVALID: {
    ar: 'موعد المتابعة لا يمكن أن يسبق تاريخ الاتصال.',
    fr: 'La date de suivi ne peut pas précéder la communication.',
  },
  RESERVATION_REFERENCE_INVALID: {
    ar: 'مرجع المشروع أو الوحدة أو الزبون أو الموظف غير صالح.',
    fr: 'La référence du projet, de l’unité, du client ou de l’employé est invalide.',
  },
  RESERVATION_NUMBER_INVALID: {
    ar: 'مرجع الحجز الداخلي غير صالح.',
    fr: 'La référence interne de réservation est invalide.',
  },
  RESERVATION_EXPIRY_INVALID: {
    ar: 'يجب أن يكون تاريخ انتهاء الحجز في المستقبل.',
    fr: 'La date d’expiration doit être dans le futur.',
  },
  RESERVATION_UNIT_NOT_FOUND: {
    ar: 'الوحدة المحددة لا تنتمي إلى هذا المشروع أو لم تعد موجودة.',
    fr: 'L’unité sélectionnée n’appartient pas à ce projet ou n’existe plus.',
  },
  RESERVATION_CUSTOMER_NOT_FOUND: {
    ar: 'الزبون المحدد غير مسجل ضمن هذا المشروع.',
    fr: 'Le client sélectionné n’est pas enregistré dans ce projet.',
  },
  RESERVATION_CUSTOMER_ARCHIVED: {
    ar: 'لا يمكن إنشاء حجز لزبون مؤرشف.',
    fr: 'Un client archivé ne peut pas faire l’objet d’une nouvelle réservation.',
  },
  RESERVATION_UNIT_UNAVAILABLE: {
    ar: 'الوحدة غير متاحة للحجز أو تم حجزها من طرف عملية أخرى.',
    fr: 'L’unité n’est pas disponible ou vient d’être réservée par une autre opération.',
  },
  RESERVATION_NOT_FOUND: {
    ar: 'الحجز غير موجود ضمن هذا المشروع.',
    fr: 'La réservation est introuvable dans ce projet.',
  },
  RESERVATION_NOT_ACTIVE: {
    ar: 'لا يمكن إغلاق هذا الحجز لأنه لم يعد نشطاً.',
    fr: 'Cette réservation ne peut plus être clôturée car elle n’est plus active.',
  },
  RESERVATION_EXPIRY_REACHED: {
    ar: 'انتهت مدة الحجز؛ سيغلقه النظام آلياً وتُحدّث حالة الوحدة.',
    fr: 'La réservation a expiré ; le système la clôturera automatiquement et actualisera l’état de l’unité.',
  },
  RESERVATION_NOT_DUE: {
    ar: 'لم يحن موعد انتهاء هذا الحجز بعد.',
    fr: 'Cette réservation n’a pas encore atteint sa date d’expiration.',
  },
  RESERVATION_CLOSE_REASON_REQUIRED: {
    ar: 'سبب إلغاء الحجز مطلوب.',
    fr: 'Le motif d’annulation est obligatoire.',
  },
  RESERVATION_CLOSE_REASON_TOO_LONG: {
    ar: 'سبب الإلغاء يجب ألا يتجاوز 300 حرف.',
    fr: 'Le motif d’annulation ne doit pas dépasser 300 caractères.',
  },
  RESERVATION_REVIEW_NOT_REQUIRED: {
    ar: 'هذا الحجز لم يُدرج في طابور مراجعة التعليق.',
    fr: 'Cette réservation n’a jamais été mise en file pour une revue de suspension.',
  },
  RESERVATION_REVIEW_ALREADY_COMPLETED: {
    ar: 'تم تسجيل مراجعة هذا الحجز مسبقاً.',
    fr: 'La revue de cette réservation est déjà enregistrée.',
  },
  RESERVATION_REVIEW_TIMESTAMP_INVALID: {
    ar: 'لا يمكن إتمام المراجعة قبل تاريخ طلبها.',
    fr: 'Une revue ne peut pas être clôturée avant sa date de demande.',
  },
  RESERVATION_CONCURRENCY_CONFLICT: {
    ar: 'تغير الحجز أو الوحدة في الوقت نفسه. أعد تحميل البيانات وحاول مجدداً.',
    fr: 'La réservation ou l’unité a été modifiée simultanément. Actualisez puis réessayez.',
  },
  RESERVATION_UNIT_STATE_MISMATCH: {
    ar: 'حالة الوحدة لا تطابق حالة الحجز؛ لم يتم تغيير الوحدة تلقائياً.',
    fr: 'L’état de l’unité ne correspond pas à la réservation ; aucune modification automatique n’a été effectuée.',
  },
  PROJECT_RESERVATION_ACCESS_DENIED: {
    ar: 'لا تملك صلاحية الاطلاع على حجوزات هذا المشروع.',
    fr: 'Vous n’êtes pas autorisé à consulter les réservations de ce projet.',
  },
  FORBIDDEN_PROJECT_RESERVATION_WRITE: {
    ar: 'لا تملك صلاحية إدارة حجوزات هذا المشروع.',
    fr: 'Vous n’êtes pas autorisé à gérer les réservations de ce projet.',
  },
  FORBIDDEN_ORGANIZATION_MANAGE: {
    ar: 'لا تملك صلاحية تعديل ملف المؤسسة.',
    fr: 'Vous n’avez pas l’autorisation de modifier le profil de l’organisation.',
  },
  ORG_CONCURRENCY_CONFLICT: {
    ar: 'تم تعديل ملف المؤسسة من طرف مستخدم آخر. أعد تحميل البيانات قبل الحفظ.',
    fr: 'Le profil de l’organisation a été modifié par un autre utilisateur. Rechargez les données avant l’enregistrement.',
  },
  ORG_DEFAULT_LANGUAGE_INVALID: {
    ar: 'اللغة الافتراضية يجب أن تكون العربية أو الفرنسية.',
    fr: 'La langue par défaut doit être l’arabe ou le français.',
  },
  ORG_EMAIL_INVALID: {
    ar: 'صيغة البريد الإلكتروني للمؤسسة غير صحيحة.',
    fr: 'Le format de l’adresse e-mail de l’organisation est invalide.',
  },
  ORG_WILAYA_INVALID: {
    ar: 'رمز الولاية غير صحيح. اختر ولاية من القائمة.',
    fr: 'Le code de wilaya est invalide. Sélectionnez une wilaya dans la liste.',
  },
  ORG_CAPITAL_NEGATIVE: {
    ar: 'رأس المال لا يمكن أن يكون سالبًا.',
    fr: 'Le capital social ne peut pas être négatif.',
  },
  ORG_LEGAL_NAME_REQUIRED: {
    ar: 'الاسم القانوني للمؤسسة مطلوب.',
    fr: 'La raison sociale de l’organisation est obligatoire.',
  },
  ORG_LEGAL_FORM_INVALID: {
    ar: 'الشكل القانوني للمؤسسة غير صحيح.',
    fr: 'La forme juridique de l’organisation est invalide.',
  },
  ORG_ADDRESS_REQUIRED: {
    ar: 'عنوان المقر الاجتماعي مطلوب.',
    fr: 'L’adresse du siège social est obligatoire.',
  },
  ENDPOINT_NOT_FOUND: {
    ar: 'نقطة النهاية المطلوبة غير موجودة.',
    fr: 'Le point de terminaison demandé est introuvable.',
  },
  AUTH_REQUIRED: {
    ar: 'يجب تسجيل الدخول للمتابعة.',
    fr: 'Authentification requise pour poursuivre.',
  },
  INTERNAL_ERROR: {
    ar: 'حدث خطأ داخلي غير متوقع في الخادم.',
    fr: 'Une erreur interne inattendue est survenue sur le serveur.',
  },
  VALIDATION_ERROR: {
    ar: 'البيانات المدخلة غير صالحة أو غير مكتملة.',
    fr: 'Les données saisies sont invalides ou incomplètes.',
  },
  PREVIEW_DEMO_NOT_AVAILABLE: {
    ar: 'حساب المعاينة التجريبي غير متاح في هذه البيئة.',
    fr: 'Le compte de démonstration d’aperçu n’est pas disponible dans cet environnement.',
  },
  SETUP_REQUIRED: {
    ar: 'يجب إكمال التهيئة الأولية للنظام قبل المتابعة.',
    fr: 'L’initialisation du système doit être effectuée avant de continuer.',
  },
  ORGANIZATION_NOT_FOUND: {
    ar: 'بيانات المؤسسة غير موجودة.',
    fr: 'Le profil de l’organisation est introuvable.',
  },
  SETTING_KEY_REQUIRED: {
    ar: 'مفتاح الإعداد مطلوب.',
    fr: 'La clé du paramètre est obligatoire.',
  },
  ORG_NIF_INVALID: {
    ar: 'رقم التعريف الجبائي (NIF) يجب أن يتكون من 15 إلى 20 رقماً.',
    fr: 'Le numéro d’identification fiscale (NIF) doit contenir entre 15 et 20 chiffres.',
  },
  ORG_WILAYA_NAME_REQUIRED: {
    ar: 'اسم الولاية للمؤسسة مطلوب.',
    fr: 'Le nom de la wilaya de l’organisation est obligatoire.',
  },
  ORG_WILAYA_NAME_MISMATCH: {
    ar: 'اسم الولاية لا يطابق رمز الولاية الرسمي المحدد للمؤسسة.',
    fr: 'Le nom de la wilaya ne correspond pas au code officiel sélectionné pour l’organisation.',
  },
  FORBIDDEN_AUDIT_READ: {
    ar: 'لا تملك صلاحية الاطلاع على سجل التدقيق الأمني.',
    fr: 'Vous n’êtes pas autorisé à consulter le journal d’audit.',
  },
  FORBIDDEN_USER_MANAGEMENT: {
    ar: 'لا تملك صلاحية إدارة حسابات الموظفين والأدوار.',
    fr: 'Vous n’êtes pas autorisé à gérer les comptes utilisateurs et les rôles.',
  },
  FORBIDDEN_PROJECT_CREATE: {
    ar: 'لا تملك صلاحية إنشاء مشاريع عقارية جديدة.',
    fr: 'Vous n’êtes pas autorisé à créer de nouveaux projets immobiliers.',
  },
  FORBIDDEN_PROJECT_ACCESS_ADMIN: {
    ar: 'لا تملك صلاحية إدارة أعضاء المشروع وصلاحيات الوصول إليه.',
    fr: 'Vous n’êtes pas autorisé à gérer les membres et accès de ce projet.',
  },
  USER_NOT_FOUND: {
    ar: 'حساب الموظف غير موجود.',
    fr: 'Le compte utilisateur est introuvable.',
  },
  USER_INACTIVE: {
    ar: 'تم تعطيل حساب المستخدم. تواصل مع مدير النظام.',
    fr: 'Ce compte utilisateur est désactivé. Contactez l’administrateur système.',
  },
  USER_USERNAME_INVALID: {
    ar: 'اسم المستخدم يجب أن يتكون من 3 إلى 64 حرفاً باستخدام الأحرف والأرقام و(.) أو (_) أو (-).',
    fr: 'Le nom d’utilisateur doit contenir de 3 à 64 caractères (lettres, chiffres, ".", "_" ou "-").',
  },
  USER_FULLNAME_REQUIRED: {
    ar: 'الاسم الكامل للموظف مطلوب.',
    fr: 'Le nom complet de l’utilisateur est obligatoire.',
  },
  USER_EMAIL_INVALID: {
    ar: 'عنوان البريد الإلكتروني للموظف غير صالح.',
    fr: 'L’adresse e-mail de l’utilisateur est invalide.',
  },
  USER_EMAIL_CONFLICT: {
    ar: 'عنوان البريد الإلكتروني مستخدم مسبقاً من طرف حساب آخر.',
    fr: 'Cette adresse e-mail est déjà utilisée par un autre compte.',
  },
  USER_PASSWORD_HASH_REQUIRED: {
    ar: 'كلمة المرور المشفرة مطلوبة لهذا الحساب.',
    fr: 'L’empreinte du mot de passe est obligatoire pour ce compte.',
  },
  USER_ROLE_REQUIRED: {
    ar: 'يجب إسناد دور واحد على الأقل لحساب الموظف.',
    fr: 'Au moins un rôle doit être attribué au compte utilisateur.',
  },
  ROLE_NOT_FOUND: {
    ar: 'أحد الأدوار المحددة غير موجود في النظام.',
    fr: 'L’un des rôles sélectionnés est introuvable dans le système.',
  },
  CANNOT_REVOKE_SYSTEM_ADMIN_ROLE: {
    ar: 'لا يمكن سحب صلاحية مدير النظام من الحساب الإداري الوحيد.',
    fr: 'Le rôle Administrateur Système ne peut pas être retiré au compte administrateur unique.',
  },
  SYSTEM_ADMIN_NOT_FOUND: {
    ar: 'حساب مدير النظام غير موجود.',
    fr: 'Le compte Administrateur Système est introuvable.',
  },
  SYSTEM_ADMIN_ROLE_MISSING: {
    ar: 'دور مدير النظام غير مهيأ في قاعدة البيانات.',
    fr: 'Le rôle Administrateur Système est absent de la base de données.',
  },
  PASSWORD_CHANGE_LIFETIME_INVALID: {
    ar: 'مدة صلاحية كلمة المرور المؤقتة يجب أن تكون موجبة.',
    fr: 'La durée de validité du mot de passe temporaire doit être positive.',
  },
  PROJECT_NOT_FOUND: {
    ar: 'المشروع العقاري المطلوب غير موجود.',
    fr: 'Le projet immobilier demandé est introuvable.',
  },
  PROJECT_CODE_REQUIRED: {
    ar: 'رمز المشروع مطلوب.',
    fr: 'Le code du projet est obligatoire.',
  },
  PROJECT_CODE_TOO_LONG: {
    ar: 'رمز المشروع يتجاوز الحد الأقصى المسموح به.',
    fr: 'Le code du projet dépasse la longueur maximale autorisée.',
  },
  PROJECT_NAME_REQUIRED: {
    ar: 'اسم المشروع بالعربية أو الفرنسية مطلوب.',
    fr: 'Le nom du projet en arabe ou en français est obligatoire.',
  },
  PROJECT_WILAYA_INVALID: {
    ar: 'رمز ولاية المشروع غير صالح. اختر ولاية رسمية من القائمة.',
    fr: 'Le code de wilaya du projet est invalide. Sélectionnez une wilaya officielle.',
  },
  PROJECT_WILAYA_NAME_REQUIRED: {
    ar: 'اسم ولاية المشروع مطلوب.',
    fr: 'Le nom de la wilaya du projet est obligatoire.',
  },
  PROJECT_WILAYA_NAME_MISMATCH: {
    ar: 'اسم الولاية لا يطابق رمز الولاية الرسمي المحدد للمشروع.',
    fr: 'Le nom de la wilaya ne correspond pas au code officiel sélectionné pour le projet.',
  },
  PROJECT_MUNICIPALITY_REQUIRED: {
    ar: 'اسم بلدية المشروع مطلوب.',
    fr: 'La commune du projet est obligatoire.',
  },
  PROJECT_CREATOR_REQUIRED: {
    ar: 'معرّف منشئ المشروع مطلوب.',
    fr: 'L’identifiant du créateur du projet est obligatoire.',
  },
  PROJECT_CONCURRENCY_CONFLICT: {
    ar: 'تم تعديل بيانات المشروع من طرف عملية أخرى. أعد تحميل البيانات قبل الحفظ.',
    fr: 'Les données du projet ont été modifiées par une autre opération. Rechargez les données avant d’enregistrer.',
  },
  PROJECT_FINANCIAL_ACCESS_DENIED: {
    ar: 'لا تملك صلاحية الاطلاع على البيانات المالية أو تعديل ميزانية هذا المشروع.',
    fr: 'Vous n’êtes pas autorisé à consulter ou modifier les données financières de ce projet.',
  },
  PROJECT_LAST_MANAGER_REQUIRED: {
    ar: 'يجب أن يحتفظ المشروع بمدير مشروع واحد نشط على الأقل.',
    fr: 'Le projet doit conserver au moins un chef de projet actif.',
  },
  PROJECT_MEMBER_ID_REQUIRED: {
    ar: 'معرّف الموظف مطلوب لإسناد صلاحية على المشروع.',
    fr: 'L’identifiant du membre est obligatoire pour l’affectation au projet.',
  },
  PROJECT_MEMBER_ASSIGNER_REQUIRED: {
    ar: 'معرّف المسؤول المسنِد للصلاحية مطلوب.',
    fr: 'L’identifiant du responsable effectuant l’affectation est obligatoire.',
  },
  PROJECT_MEMBER_NOT_FOUND: {
    ar: 'عضو المشروع المطلوب غير موجود.',
    fr: 'Le membre du projet demandé est introuvable.',
  },
  PROJECT_ROLE_INVALID: {
    ar: 'الدور المحدد داخل المشروع غير صالح.',
    fr: 'Le rôle sélectionné dans le projet est invalide.',
  },
  BUILDING_NOT_FOUND: {
    ar: 'العمارة المطلوبة غير موجودة ضمن هذا المشروع.',
    fr: 'Le bâtiment demandé est introuvable dans ce projet.',
  },
  BUILDING_PROJECT_REQUIRED: {
    ar: 'يجب ربط العمارة بمشروع عقاري صالح.',
    fr: 'Le bâtiment doit être rattaché à un projet immobilier valide.',
  },
  BUILDING_CREATOR_REQUIRED: {
    ar: 'معرّف منشئ العمارة مطلوب.',
    fr: 'L’identifiant du créateur du bâtiment est obligatoire.',
  },
  FLOOR_NOT_FOUND: {
    ar: 'الطابق المطلوب غير موجود ضمن هذه العمارة.',
    fr: 'L’étage demandé est introuvable dans ce bâtiment.',
  },
  FLOOR_BUILDING_REQUIRED: {
    ar: 'يجب ربط الطابق بعمارة صالحة.',
    fr: 'L’étage doit être rattaché à un bâtiment valide.',
  },
  UNIT_NOT_FOUND: {
    ar: 'الوحدة العقارية المطلوبة غير موجودة.',
    fr: 'L’unité immobilière demandée est introuvable.',
  },
  PROPERTY_UNIT_NOT_FOUND: {
    ar: 'الوحدة العقارية المحددة غير موجودة ضمن هذا المشروع.',
    fr: 'L’unité immobilière sélectionnée est introuvable dans ce projet.',
  },
  UNIT_FLOOR_REQUIRED: {
    ar: 'يجب ربط الوحدة العقارية بطابق صالح.',
    fr: 'L’unité immobilière doit être rattachée à un étage valide.',
  },
  UNIT_CREATOR_REQUIRED: {
    ar: 'معرّف منشئ الوحدة العقارية مطلوب.',
    fr: 'L’identifiant du créateur de l’unité immobilière est obligatoire.',
  },
  UNIT_NOT_AVAILABLE_FOR_RESERVATION: {
    ar: 'هذه الوحدة غير متاحة حالياً لإنشاء حجز جديد.',
    fr: 'Cette unité n’est pas disponible pour une nouvelle réservation.',
  },
  UNIT_NOT_RESERVED: {
    ar: 'الوحدة ليست في حالة حجز نشط.',
    fr: 'L’unité n’est pas en statut réservé actif.',
  },
  FILE_NAME_REQUIRED: {
    ar: 'اسم الملف مطلوب.',
    fr: 'Le nom du fichier est obligatoire.',
  },
  FILE_CONTENT_REQUIRED: {
    ar: 'محتوى الملف أو نوعه مطلوب.',
    fr: 'Le contenu ou le type du fichier est obligatoire.',
  },
  FILE_PATH_REQUIRED: {
    ar: 'المسار الداخلي لحفظ الملف مطلوب.',
    fr: 'Le chemin interne de stockage du fichier est obligatoire.',
  },
  FILE_CHECKSUM_INVALID: {
    ar: 'بصمة التحقق (SHA-256) للملف غير صالحة.',
    fr: 'L’empreinte de contrôle (SHA-256) du fichier est invalide.',
  },
  PROJECT_DOCUMENT_NOT_FOUND: {
    ar: 'وثيقة المشروع المطلوبة غير موجودة.',
    fr: 'Le document du projet demandé est introuvable.',
  },
  PROJECT_DOCUMENT_CATEGORY_FORBIDDEN: {
    ar: 'لا تملك صلاحية الاطلاع على هذه الفئة من وثائق المشروع.',
    fr: 'Vous n’êtes pas autorisé à accéder à cette catégorie de documents du projet.',
  },
  DOCUMENT_NOT_FOUND: {
    ar: 'الوثيقة المطلوبة غير موجودة.',
    fr: 'Le document demandé est introuvable.',
  },
  DOCUMENT_EMPTY: {
    ar: 'الملف المرفوع فارغ ولا يحتوي على بيانات.',
    fr: 'Le fichier téléversé est vide.',
  },
  DOCUMENT_TOO_LARGE: {
    ar: 'حجم الملف يتجاوز الحد الأقصى المسموح به.',
    fr: 'La taille du fichier dépasse la limite autorisée.',
  },
  DOCUMENT_EXTENSION_NOT_ALLOWED: {
    ar: 'امتداد الملف غير مسموح به.',
    fr: 'L’extension du fichier n’est pas autorisée.',
  },
  DOCUMENT_CATEGORY_INVALID: {
    ar: 'تصنيف الوثيقة غير صالح.',
    fr: 'La catégorie du document est invalide.',
  },
  PARTY_ID_REQUIRED: {
    ar: 'معرّف الطرف مطلوب.',
    fr: 'L’identifiant du tiers est obligatoire.',
  },
  PARTY_NOT_FOUND: {
    ar: 'الطرف المطلوب غير موجود في الدليل المركزي.',
    fr: 'Le tiers demandé est introuvable dans le répertoire central.',
  },
  PARTY_KIND_INVALID: {
    ar: 'الطبيعة القانونية للطرف غير صالحة (شخص طبيعي أو معنوي).',
    fr: 'La nature du tiers est invalide (personne physique ou morale).',
  },
  PARTY_NAME_REQUIRED: {
    ar: 'الاسم القانوني أو الكامل للطرف مطلوب.',
    fr: 'Le nom complet ou la raison sociale du tiers est obligatoire.',
  },
  PARTY_NAME_TOO_LONG: {
    ar: 'اسم الطرف يجب ألا يتجاوز 200 حرف.',
    fr: 'Le nom du tiers ne doit pas dépasser 200 caractères.',
  },
  PARTY_SEARCH_QUERY_INVALID: {
    ar: 'أدخل حرفين على الأقل للبحث في دليل الأطراف المركزي.',
    fr: 'Saisissez au moins 2 caractères pour rechercher dans le répertoire des tiers.',
  },
  PARTY_IDENTITY_MANAGE_REQUIRED: {
    ar: 'لا تملك صلاحية تعديل الهوية المركزية للأطراف.',
    fr: 'Vous n’êtes pas autorisé à modifier l’identité centrale des tiers.',
  },
  PARTY_DIRECTORY_ACCESS_DENIED: {
    ar: 'لا تملك صلاحية الاطلاع على دليل الأطراف المركزي.',
    fr: 'Vous n’êtes pas autorisé à consulter le répertoire central des tiers.',
  },
  PARTY_IDENTITY_CONFLICT: {
    ar: 'توجد هوية مركزية مسجلة مسبقاً تطابق هذه البيانات.',
    fr: 'Une identité centrale correspondant à ces données existe déjà.',
  },
  PARTY_IDENTITY_MISMATCH: {
    ar: 'بيانات الهوية المحددة لا تطابق السجل المركزي للطرف.',
    fr: 'Les données d’identité saisies ne correspondent pas au dossier central du tiers.',
  },
  PARTY_CONCURRENCY_CONFLICT: {
    ar: 'تم تعديل هوية الطرف من طرف مستخدم آخر. أعد تحميل البيانات وحاول مجدداً.',
    fr: 'L’identité du tiers a été modifiée par un autre utilisateur. Rechargez les données puis réessayez.',
  },
  CUSTOMER_PARTY_REFERENCE_INVALID: {
    ar: 'مرجع الطرف المركزي المرتبط بسجل الزبون غير صالح.',
    fr: 'La référence du tiers central liée au dossier client est invalide.',
  },
  CUSTOMER_PARTY_ALREADY_LINKED: {
    ar: 'هذا الطرف المركزي مرتبط مسبقاً بسجل زبون داخل هذا المشروع.',
    fr: 'Ce tiers central est déjà rattaché à un dossier client dans ce projet.',
  },
  RESERVATION_CANCEL_REASON_REQUIRED: {
    ar: 'سبب إلغاء الحجز مطلوب.',
    fr: 'Le motif d’annulation de la réservation est obligatoire.',
  },
};

export function translateApiError(code: string | undefined, fallbackMessage: string, lang: AppLanguage): string {
  if (code && API_ERROR_MESSAGES[code]) {
    return API_ERROR_MESSAGES[code][lang];
  }
  return fallbackMessage;
}
