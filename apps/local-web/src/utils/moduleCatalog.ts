import type { AppLanguage } from '../types/erp';
import type { AppRouteState, ProjectWorkspaceSection } from './navigation';

export type ModuleCode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';

export type ModuleImplementationState = 'IMPLEMENTED' | 'PARTIAL' | 'PLANNED';

export interface ErpModuleDefinition {
  code: ModuleCode;
  state: ModuleImplementationState;
  title: Record<AppLanguage, string>;
  summary: Record<AppLanguage, string>;
  scopeNote: Record<AppLanguage, string>;
  subScreens: Array<{
    id: string;
    label: Record<AppLanguage, string>;
    state: ModuleImplementationState;
  }>;
  orgTargetRoute?: AppRouteState;
  projectSection?: ProjectWorkspaceSection;
  prerequisites?: Record<AppLanguage, string>;
}

export const ERP_MODULE_CATALOG: readonly ErpModuleDefinition[] = [
  {
    code: 'A',
    state: 'PARTIAL',
    title: {
      ar: 'أ. المؤسسة والحوكمة والمرجع الإقليمي',
      fr: 'A. Organisation, Gouvernance & Référentiel',
    },
    summary: {
      ar: 'هوية المؤسسة القانونية والجبائية، حسابات الموظفين، ومرجع 69 ولاية.',
      fr: 'Identité légale et fiscale, comptes employés et référentiel des 69 wilayas.',
    },
    scopeNote: {
      ar: 'مفعّل للمؤسسة والولايات الـ69 والمستخدمين؛ قائمة 1,541 بلدية وسجل الموظفين HR قيد التطوير.',
      fr: 'Actif pour l’organisation, 69 wilayas et comptes ; catalogue 1 541 communes et dossier RH Employés planifiés.',
    },
    orgTargetRoute: { kind: 'org', section: 'organizationProfile' },
    subScreens: [
      { id: 'org-profile', label: { ar: 'ملف المؤسسة القانوني والجبائي', fr: 'Profil légal & fiscal' }, state: 'IMPLEMENTED' },
      { id: 'parties', label: { ar: 'دليل الأطراف المركزي', fr: 'Répertoire central des tiers' }, state: 'PARTIAL' },
      { id: 'territorial', label: { ar: 'المرجع الإقليمي (69 ولاية / البلديات)', fr: 'Référentiel territorial (69 wilayas / communes)' }, state: 'PARTIAL' },
      { id: 'users-admin', label: { ar: 'حسابات المستخدمين والأدوار', fr: 'Comptes & rôles (Admin)' }, state: 'IMPLEMENTED' },
      { id: 'employees-hr', label: { ar: 'سجل الموظفين (HR)', fr: 'Référentiel Employés (RH)' }, state: 'PLANNED' },
    ],
  },
  {
    code: 'B',
    state: 'IMPLEMENTED',
    title: {
      ar: 'ب. المشاريع العقارية وتفويض الفرق',
      fr: 'B. Projets Immobiliers & Habilitations',
    },
    summary: {
      ar: 'دليل المشاريع مع البحث والتصفية، التبديل الصريح للمشروع، مساحة المشروع، وفريق العمل.',
      fr: 'Annuaire filtré, sélecteur de projet, espace actif dédié, paramètres et équipe.',
    },
    scopeNote: {
      ar: 'مفعّل بالكامل مع فحص عضوية الخادم في كل طلب وعزل الميزانية المالية.',
      fr: 'Opérationnel avec vérification serveur par projet et cloisonnement budgétaire.',
    },
    orgTargetRoute: { kind: 'org', section: 'projects' },
    projectSection: 'settings',
    subScreens: [
      { id: 'directory', label: { ar: 'دليل المشاريع (بحث وتصفية عبر الخادم)', fr: 'Annuaire des projets (recherche serveur)' }, state: 'IMPLEMENTED' },
      { id: 'switcher', label: { ar: 'مبدّل المشروع الصريح', fr: 'Sélecteur explicite de projet' }, state: 'IMPLEMENTED' },
      { id: 'workspace', label: { ar: 'مساحة المشروع النشط والهوية الدائمة', fr: 'Espace projet actif & bandeau d’identité' }, state: 'IMPLEMENTED' },
      { id: 'team-access', label: { ar: 'إعدادات المشروع وفريق الوصول', fr: 'Paramètres & équipe projet' }, state: 'IMPLEMENTED' },
    ],
  },
  {
    code: 'C',
    state: 'IMPLEMENTED',
    title: {
      ar: 'ج. الهيكل العقاري والوحدات',
      fr: 'C. Structure Physique & Unités',
    },
    summary: {
      ar: 'العمارات، الطوابق، الوحدات العقارية، المساحات وحالات الجاهزية.',
      fr: 'Bâtiments, étages, unités immobilières, surfaces et statuts physiques.',
    },
    scopeNote: {
      ar: 'عمليات الإنشاء والتعديل وتغيير الحالة مفعلة؛ التسعير المرجعي والملف الموحد للوحدة مخططان.',
      fr: 'CRUD bâtiments/étages/unités actif ; tarification de base et fiche lot unifiée planifiées.',
    },
    projectSection: 'structure',
    subScreens: [
      { id: 'buildings', label: { ar: 'العمارات / البلوكات', fr: 'Bâtiments / Blocs' }, state: 'IMPLEMENTED' },
      { id: 'floors', label: { ar: 'الطوابق', fr: 'Étages' }, state: 'IMPLEMENTED' },
      { id: 'units', label: { ar: 'الوحدات العقارية وتفاصيلها', fr: 'Unités immobilières & détails' }, state: 'IMPLEMENTED' },
      { id: 'unit-file', label: { ar: 'الملف العقاري الموحد للوحدة', fr: 'Dossier unifié de l’unité' }, state: 'PLANNED' },
    ],
  },
  {
    code: 'D',
    state: 'PARTIAL',
    title: {
      ar: 'د. الأطراف والزبائن ومتابعة CRM',
      fr: 'D. Tiers, Clients & Suivi CRM',
    },
    summary: {
      ar: 'دليل الأطراف المركزي، سجل زبائن المشروع، المهتمون وسجل الاتصالات والمتابعات.',
      fr: 'Répertoire des tiers, registre clients projet, prospects et historique d’échanges.',
    },
    scopeNote: {
      ar: 'مفعّل للهوية المركزية وسجل زبائن المشروع؛ مسار المبيعات الكامل ونقاط الاتصال المتعددة قيد التطوير.',
      fr: 'Actif pour Tiers & Clients projet ; pipeline commercial complet et contacts multiples planifiés.',
    },
    orgTargetRoute: { kind: 'org', section: 'parties' },
    projectSection: 'customers',
    subScreens: [
      { id: 'party-dir', label: { ar: 'مساحة الأطراف (المؤسسة)', fr: 'Espace Tiers (Organisation)' }, state: 'IMPLEMENTED' },
      { id: 'project-customers', label: { ar: 'سجل زبائن المشروع والمهتمين', fr: 'Registre clients & prospects' }, state: 'IMPLEMENTED' },
      { id: 'interactions', label: { ar: 'سجل الاتصالات والمتابعات', fr: 'Échanges & suivis' }, state: 'IMPLEMENTED' },
      { id: 'pipeline', label: { ar: 'مسار الفرص التجارية', fr: 'Pipeline commercial' }, state: 'PLANNED' },
    ],
  },
  {
    code: 'E',
    state: 'IMPLEMENTED',
    title: {
      ar: 'هـ. الحجوزات الداخلية للوحدات',
      fr: 'E. Réservations Internes (Options)',
    },
    summary: {
      ar: 'تجميد داخلي مؤقت للوحدة المتاحة مع تاريخ انتهاء وسبب الإلغاء.',
      fr: 'Blocage interne temporaire d’une unité disponible avec expiration et motif d’annulation.',
    },
    scopeNote: {
      ar: 'حجز داخلي غير مالي فقط؛ لا ينشئ التزاماً قانونياً بموجب القانون 11-04 ولا يقبض أموالاً.',
      fr: 'Option interne sans flux financier ; distincte du contrat de réservation légale (Loi 11-04).',
    },
    projectSection: 'reservations',
    subScreens: [
      { id: 'list', label: { ar: 'قائمة الحجوزات الداخلية', fr: 'Liste des réservations internes' }, state: 'IMPLEMENTED' },
      { id: 'detail', label: { ar: 'تفاصيل الحجز وربط الوحدة', fr: 'Détails & unité liée' }, state: 'IMPLEMENTED' },
      { id: 'lifecycle', label: { ar: 'الإنشاء، الإلغاء وانتهاء الصلاحية', fr: 'Création, annulation & expiration' }, state: 'IMPLEMENTED' },
    ],
  },
  {
    code: 'F',
    state: 'PLANNED',
    title: {
      ar: 'و. العقود والالتزامات التوثيقية',
      fr: 'F. Contrats & Actes Notariés',
    },
    summary: {
      ar: 'عقود التخصيص القانونية، عقود البيع على التصاميم (VSP)، عقود البيع النهائية وإصداراتها.',
      fr: 'Contrats de réservation légale, contrats VSP, actes de vente finaux et versions immuables.',
    },
    scopeNote: {
      ar: 'قيد التطوير (المرحلة الثانية) — يشترط اكتمال K-Min ومصادقة قانونية/توثيقية جزائرية.',
      fr: 'Planifié (Phase 2) — requiert K-Min et validation juridique/notariale algérienne.',
    },
    projectSection: 'contracts',
    prerequisites: {
      ar: 'متطلبات مسبقة: غلق المرحلة الأولى، طبقة الوثائق K-Min، واعتماد النصوص القانونية (القانون 11-04 / المرسوم 13-431).',
      fr: 'Prérequis : clôture Phase 1, socle documentaire K-Min et validation juridique (Loi 11-04 / Décret 13-431).',
    },
    subScreens: [
      { id: 'workspace', label: { ar: 'مساحة العقود', fr: 'Espace contrats' }, state: 'PLANNED' },
      { id: 'statutory-res', label: { ar: 'عقد الحجز القانوني (FGCMPI)', fr: 'Réservation légale (FGCMPI)' }, state: 'PLANNED' },
      { id: 'vsp', label: { ar: 'عقد البيع على التصاميم (VSP)', fr: 'Contrat VSP' }, state: 'PLANNED' },
      { id: 'final-deed', label: { ar: 'العقد التوثيقي النهائي', fr: 'Acte authentique final' }, state: 'PLANNED' },
      { id: 'versions', label: { ar: 'سجل الإصدارات والملاحق', fr: 'Versions & avenants' }, state: 'PLANNED' },
    ],
  },
  {
    code: 'G',
    state: 'PLANNED',
    title: {
      ar: 'ز. الأقساط والتحصيل والخزينة (دج)',
      fr: 'G. Échéances, Encaissements & Trésorerie (DZD)',
    },
    summary: {
      ar: 'الالتزامات التعاقدية، جداول الأقساط، وصولات التحصيل، الصندوق والبنك، والرجوعات.',
      fr: 'Obligations contractuelles, échéanciers, reçus DZD, caisses/banques, remboursements et relevés.',
    },
    scopeNote: {
      ar: 'قيد التطوير (المرحلة الثانية) — فصل تام بين حساب الضمان FGCMPI وخزينة المرقي.',
      fr: 'Planifié (Phase 2) — séparation stricte entre séquestre FGCMPI et trésorerie promoteur.',
    },
    projectSection: 'finance',
    prerequisites: {
      ar: 'متطلبات مسبقة: وحدة العقود (و)، فصل الصلاحيات المحاسبية، واعتماد قواعد الضمان المالي.',
      fr: 'Prérequis : module Contrats (F), séparation des tâches financières et validation comptable.',
    },
    subScreens: [
      { id: 'obligations', label: { ar: 'الالتزامات المالية المستحقة', fr: 'Obligations de paiement' }, state: 'PLANNED' },
      { id: 'installments', label: { ar: 'جداول الأقساط (VSP)', fr: 'Échéanciers d’appels de fonds' }, state: 'PLANNED' },
      { id: 'receipts', label: { ar: 'وصولات التحصيل والتخصيص', fr: 'Reçus & affectations' }, state: 'PLANNED' },
      { id: 'treasury', label: { ar: 'الصندوق والحسابات البنكية', fr: 'Caisse & banques' }, state: 'PLANNED' },
      { id: 'refunds', label: { ar: 'المرتجعات وإلغاء القيود', fr: 'Remboursements & contre-passations' }, state: 'PLANNED' },
      { id: 'statements', label: { ar: 'كشف حساب المقتني', fr: 'Relevé compte acquéreur' }, state: 'PLANNED' },
    ],
  },
  {
    code: 'H',
    state: 'PLANNED',
    title: {
      ar: 'ح. الأشغال ومتابعة الورشة',
      fr: 'H. Chantier & Suivi des Travaux',
    },
    summary: {
      ar: 'مسارات العمل، الحصص التقنية، المقاولون، التقدم الميداني، الوضعيات وإثباتات المراحل.',
      fr: 'Flux d’avancement, lots techniques, entreprises, attachements, situations et preuves d’étapes.',
    },
    scopeNote: {
      ar: 'قيد التطوير (المرحلة الثالثة) — يغذي استحقاق أقساط VSP عبر محاضر مقبولة وموثقة.',
      fr: 'Planifié (Phase 3) — conditionne l’appel de tranches VSP via jalons acceptés et prouvés.',
    },
    projectSection: 'construction',
    prerequisites: {
      ar: 'متطلبات مسبقة: K-Min لتوثيق محاضر المعاينة والمصادقة الهندسية.',
      fr: 'Prérequis : K-Min pour l’archivage probant des constats de chantier.',
    },
    subScreens: [
      { id: 'workstreams', label: { ar: 'مسارات عمل المشروع', fr: 'Axes opérationnels du projet' }, state: 'PLANNED' },
      { id: 'lots', label: { ar: 'حصص الأشغال التقنية', fr: 'Lots de travaux' }, state: 'PLANNED' },
      { id: 'contractors', label: { ar: 'المقاولون ومكاتب الدراسات', fr: 'Entreprises & maîtres d’œuvre' }, state: 'PLANNED' },
      { id: 'progress', label: { ar: 'تقدم الإنجاز في الورشة', fr: 'Avancement chantier' }, state: 'PLANNED' },
      { id: 'situations', label: { ar: 'القياسات ووضعيات الدفع', fr: 'Attachements & situations' }, state: 'PLANNED' },
      { id: 'milestones', label: { ar: 'شواهد المراحل المعتمدة', fr: 'Preuves de jalons (VSP)' }, state: 'PLANNED' },
    ],
  },
  {
    code: 'I',
    state: 'PLANNED',
    title: {
      ar: 'ط. المشتريات والموردون والمخزون',
      fr: 'I. Achats, Fournisseurs & Stocks',
    },
    summary: {
      ar: 'دليل الموردين، طلبات الشراء، أوامر التوريد، وصلات الاستلام، ومخزون المستودع والورشة.',
      fr: 'Fournisseurs, demandes d’achat, commandes, bons de livraison et mouvements de stock.',
    },
    scopeNote: {
      ar: 'قيد التطوير (المرحلة الرابعة) — مرتبط بدليل الأطراف المركزي ومشاريع البناء.',
      fr: 'Planifié (Phase 4) — adossé au répertoire des tiers et aux chantiers.',
    },
    projectSection: 'procurement',
    prerequisites: {
      ar: 'متطلبات مسبقة: تفعيل أدوار الأطراف للموردين ووحدة متابعة الورشة.',
      fr: 'Prérequis : rôles tiers fournisseurs et suivi de chantier.',
    },
    subScreens: [
      { id: 'suppliers', label: { ar: 'دليل الموردين', fr: 'Espace fournisseurs' }, state: 'PLANNED' },
      { id: 'pr', label: { ar: 'طلبات الشراء', fr: 'Demandes d’achat' }, state: 'PLANNED' },
      { id: 'po', label: { ar: 'أوامر الشراء', fr: 'Bons de commande' }, state: 'PLANNED' },
      { id: 'deliveries', label: { ar: 'وصلات الاستلام', fr: 'Réceptions & livraisons' }, state: 'PLANNED' },
      { id: 'inventory', label: { ar: 'المخزون وحركات المواد', fr: 'Stocks dépôt & chantier' }, state: 'PLANNED' },
    ],
  },
  {
    code: 'J',
    state: 'PLANNED',
    title: {
      ar: 'ي. المحاسبة (SCF) والجباية الجزائرية',
      fr: 'J. Comptabilité SCF & Fiscalité',
    },
    summary: {
      ar: 'مدونة الحسابات SCF، اليوميات المتوازنة، الفترات المحاسبية، الرسم على القيمة المضافة والجباية.',
      fr: 'Plan comptable SCF, journaux équilibrés, exercices/périodes, TVA et fiscalité algérienne.',
    },
    scopeNote: {
      ar: 'قيد التطوير (المرحلة الخامسة) — متوقف على اعتماد خبير محاسبي جزائري لقواعد الترحيل والـ TVA.',
      fr: 'Planifié (Phase 5) — soumis à validation préalable d’un Expert-Comptable algérien.',
    },
    projectSection: 'accounting',
    prerequisites: {
      ar: 'متطلبات مسبقة: اعتماد محاسبي جزائري لقواعد SCF، TVA (9% / 19% وفق قانون المالية 2025/2026)، وIBS/TAP/IRG.',
      fr: 'Prérequis : validation Expert-Comptable pour schémas SCF, TVA (9% / 19%) et impôts.',
    },
    subScreens: [
      { id: 'scf-workspace', label: { ar: 'دليل الحسابات SCF', fr: 'Plan de comptes SCF' }, state: 'PLANNED' },
      { id: 'journals', label: { ar: 'اليوميات والقيود المزدوجة', fr: 'Journaux & écritures' }, state: 'PLANNED' },
      { id: 'periods', label: { ar: 'الفترات والإقفال المحاسبي', fr: 'Périodes & clôtures' }, state: 'PLANNED' },
      { id: 'tax', label: { ar: 'ملف الجباية والـ TVA', fr: 'Espace fiscal & TVA' }, state: 'PLANNED' },
    ],
  },
  {
    code: 'K',
    state: 'PARTIAL',
    title: {
      ar: 'ك. إدارة الوثائق والأرشيف',
      fr: 'K. Gestion Documentaire & Archives',
    },
    summary: {
      ar: 'رفع وتنزيل وثائق المشروع مع بصمة SHA-256، وتوسيع الروابط والاحتفاظ للأرشيف الكامل.',
      fr: 'Dépôt/téléchargement SHA-256 actif ; liens structurés et rétention K-Min/K-Full planifiés.',
    },
    scopeNote: {
      ar: 'الرفع والقائمة والتنزيل مع بصمة SHA-256 مفعّل؛ الروابط المهيكلة (DocumentLink) وسياسات الحفظ مخططة.',
      fr: 'Upload, liste et téléchargement SHA-256 actifs ; liens DocumentLink et rétention planifiés.',
    },
    projectSection: 'documents',
    subScreens: [
      { id: 'vault', label: { ar: 'وثائق المشروع (رفع وتنزيل SHA-256)', fr: 'Documents projet (SHA-256)' }, state: 'IMPLEMENTED' },
      { id: 'metadata', label: { ar: 'تحديث البيانات الوصفية والوسوم', fr: 'Métadonnées & indexation' }, state: 'PLANNED' },
      { id: 'links', label: { ar: 'الربط المهيكل بالسجلات التجارية والقانونية', fr: 'Liens structurés (DocumentLink)' }, state: 'PLANNED' },
      { id: 'retention', label: { ar: 'سياسات الاحتفاظ والأرشفة (K-Full)', fr: 'Rétention & archivage (K-Full)' }, state: 'PLANNED' },
    ],
  },
  {
    code: 'L',
    state: 'PARTIAL',
    title: {
      ar: 'ل. التقارير واللوحات والرقابة',
      fr: 'L. Reporting, Tableaux de Bord & Contrôle',
    },
    summary: {
      ar: 'ملخصات المحفظة المصرح بها، سجل التدقيق الأمني، وتقارير المبيعات والتحصيل والأشغال.',
      fr: 'Synthèses portefeuille autorisé, journal d’audit sécurisé et états de gestion planifiés.',
    },
    scopeNote: {
      ar: 'سجل التدقيق الأمني ومؤشرات المشاريع الفعلية مفعّلة؛ التقارير المالية والضريبية والتجارية قيد التطوير.',
      fr: 'Audit de sécurité et indicateurs réels actifs ; états commerciaux, chantiers et SCF planifiés.',
    },
    orgTargetRoute: { kind: 'org', section: 'reports' },
    projectSection: 'reports',
    subScreens: [
      { id: 'audit', label: { ar: 'سجل التدقيق الأمني (الإدارة التقنية)', fr: 'Journal d’audit (Admin technique)' }, state: 'IMPLEMENTED' },
      { id: 'portfolio', label: { ar: 'ملخص المشاريع المصرح بها', fr: 'Synthèse portefeuille autorisé' }, state: 'PARTIAL' },
      { id: 'sales-rep', label: { ar: 'تقارير المبيعات والمخزون العقاري', fr: 'États commerciaux & stocks lots' }, state: 'PLANNED' },
      { id: 'arrears', label: { ar: 'تقارير التحصيل والمتأخرات', fr: 'Recouvrement & créances échues' }, state: 'PLANNED' },
      { id: 'construction-rep', label: { ar: 'تقارير انحرافات الأشغال والمشتريات', fr: 'Écarts chantier & achats' }, state: 'PLANNED' },
      { id: 'accounting-rep', label: { ar: 'موازين المراجعة والتقارير المحاسبية', fr: 'Balances & états comptables SCF' }, state: 'PLANNED' },
    ],
  },
];

export function getModuleDefinition(code: ModuleCode): ErpModuleDefinition {
  const found = ERP_MODULE_CATALOG.find((item) => item.code === code);
  if (!found) {
    throw new Error(`Unknown ERP module code: ${code}`);
  }
  return found;
}

export function getModuleStateLabel(state: ModuleImplementationState, language: AppLanguage): string {
  switch (state) {
    case 'IMPLEMENTED':
      return language === 'ar' ? 'مفعّل' : 'Implémenté';
    case 'PARTIAL':
      return language === 'ar' ? 'مفعّل جزئياً' : 'Partiel';
    case 'PLANNED':
      return language === 'ar' ? 'مخطط / قيد التطوير' : 'Planifié / En préparation';
  }
}
