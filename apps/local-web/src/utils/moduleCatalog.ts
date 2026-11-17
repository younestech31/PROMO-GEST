import type { AppLanguage } from '../types/erp';
import type { AppRouteState, ProjectWorkspaceSection } from './navigation';

export type ModuleCode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';

/**
 * Canonical 6-state capability taxonomy aligned across docs and UI.
 */
export type ModuleImplementationState =
  | 'IMPLEMENTED_AND_VERIFIED'
  | 'IMPLEMENTED_NOT_VERIFIED'
  | 'PARTIALLY_IMPLEMENTED'
  | 'PLANNED'
  | 'BLOCKED'
  | 'DEPRECATED';

export interface BilingualColumnSpec {
  ar: string;
  fr: string;
}

export interface ModuleSubScreenDefinition {
  id: string;
  label: Record<AppLanguage, string>;
  state: ModuleImplementationState;
  description?: Record<AppLanguage, string>;
  columns?: BilingualColumnSpec[];
  disabledActions?: BilingualColumnSpec[];
}

export interface ErpModuleDefinition {
  code: ModuleCode;
  state: ModuleImplementationState;
  title: Record<AppLanguage, string>;
  summary: Record<AppLanguage, string>;
  scopeNote: Record<AppLanguage, string>;
  subScreens: ModuleSubScreenDefinition[];
  orgTargetRoute?: AppRouteState;
  projectSection?: ProjectWorkspaceSection;
  prerequisites?: Record<AppLanguage, string>;
}

export const ERP_MODULE_CATALOG: readonly ErpModuleDefinition[] = [
  {
    code: 'A',
    state: 'PARTIALLY_IMPLEMENTED',
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
      { id: 'org-profile', label: { ar: 'ملف المؤسسة القانوني والجبائي', fr: 'Profil légal & fiscal' }, state: 'IMPLEMENTED_AND_VERIFIED' },
      { id: 'parties', label: { ar: 'دليل الأطراف المركزي', fr: 'Répertoire central des tiers' }, state: 'PARTIALLY_IMPLEMENTED' },
      { id: 'territorial', label: { ar: 'المرجع الإقليمي (69 ولاية / البلديات)', fr: 'Référentiel territorial (69 wilayas / communes)' }, state: 'PARTIALLY_IMPLEMENTED' },
      { id: 'users-admin', label: { ar: 'حسابات المستخدمين والأدوار', fr: 'Comptes & rôles (Admin)' }, state: 'IMPLEMENTED_AND_VERIFIED' },
      {
        id: 'employees-hr',
        label: { ar: 'سجل الموظفين (HR)', fr: 'Référentiel Employés (RH)' },
        state: 'PLANNED',
        description: {
          ar: 'فصل الملف الإداري والوظيفي للموظف عن حساب الدخول التقني (User ≠ Employee).',
          fr: 'Séparation entre le dossier administratif Employé et le compte de connexion technique (User ≠ Employee).',
        },
        columns: [
          { ar: 'رقم التعريف المهني', fr: 'Matricule' },
          { ar: 'الاسم واللقب', fr: 'Nom & Prénom' },
          { ar: 'الوظيفة / المصلحة', fr: 'Poste / Service' },
          { ar: 'الطرف المركزي المرتبط', fr: 'Tiers lié' },
          { ar: 'حساب النظام المرتبط', fr: 'Compte utilisateur lié' },
        ],
        disabledActions: [
          { ar: 'إضافة ملف موظف (مخطط)', fr: 'Créer un dossier employé (Planifié)' },
        ],
      },
    ],
  },
  {
    code: 'B',
    state: 'IMPLEMENTED_NOT_VERIFIED',
    title: {
      ar: 'ب. المشاريع العقارية وتفويض الفرق',
      fr: 'B. Projets Immobiliers & Habilitations',
    },
    summary: {
      ar: 'دليل المشاريع مع البحث والتصفية، التبديل الصريح للمشروع، مساحة المشروع، وفريق العمل.',
      fr: 'Annuaire filtré, sélecteur de projet, espace actif dédié, paramètres et équipe.',
    },
    scopeNote: {
      ar: 'الخادم وتفويض المشاريع مفعّلان ومختبران؛ شاشات التنقل الموحدة وإلغاء الحفظ المعلّق بانتظار التحقق النهائي.',
      fr: 'API projets et habilitations vérifiées ; l’enveloppe multi-projets complète attend la validation finale.',
    },
    orgTargetRoute: { kind: 'org', section: 'projects' },
    projectSection: 'settings',
    subScreens: [
      { id: 'directory', label: { ar: 'دليل المشاريع (بحث وتصفية عبر الخادم)', fr: 'Annuaire des projets (recherche serveur)' }, state: 'IMPLEMENTED_AND_VERIFIED' },
      { id: 'switcher', label: { ar: 'مبدّل المشروع الصريح', fr: 'Sélecteur explicite de projet' }, state: 'IMPLEMENTED_NOT_VERIFIED' },
      { id: 'workspace', label: { ar: 'مساحة المشروع النشط والهوية الدائمة', fr: 'Espace projet actif & bandeau d’identité' }, state: 'IMPLEMENTED_NOT_VERIFIED' },
      { id: 'team-access', label: { ar: 'إعدادات المشروع وفريق الوصول', fr: 'Paramètres & équipe projet' }, state: 'IMPLEMENTED_AND_VERIFIED' },
    ],
  },
  {
    code: 'C',
    state: 'PARTIALLY_IMPLEMENTED',
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
      { id: 'buildings', label: { ar: 'العمارات / البلوكات', fr: 'Bâtiments / Blocs' }, state: 'IMPLEMENTED_AND_VERIFIED' },
      { id: 'floors', label: { ar: 'الطوابق', fr: 'Étages' }, state: 'IMPLEMENTED_AND_VERIFIED' },
      { id: 'units', label: { ar: 'الوحدات العقارية وتفاصيلها', fr: 'Unités immobilières & détails' }, state: 'IMPLEMENTED_AND_VERIFIED' },
      { id: 'unit-file', label: { ar: 'الملف العقاري الموحد للوحدة', fr: 'Dossier unifié de l’unité' }, state: 'PLANNED' },
    ],
  },
  {
    code: 'D',
    state: 'PARTIALLY_IMPLEMENTED',
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
      { id: 'party-dir', label: { ar: 'مساحة الأطراف (المؤسسة)', fr: 'Espace Tiers (Organisation)' }, state: 'IMPLEMENTED_AND_VERIFIED' },
      { id: 'project-customers', label: { ar: 'سجل زبائن المشروع والمهتمين', fr: 'Registre clients & prospects' }, state: 'IMPLEMENTED_AND_VERIFIED' },
      { id: 'interactions', label: { ar: 'سجل الاتصالات والمتابعات', fr: 'Échanges & suivis' }, state: 'IMPLEMENTED_AND_VERIFIED' },
      { id: 'pipeline', label: { ar: 'مسار الفرص التجارية', fr: 'Pipeline commercial' }, state: 'PLANNED' },
    ],
  },
  {
    code: 'E',
    state: 'IMPLEMENTED_AND_VERIFIED',
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
      { id: 'list', label: { ar: 'قائمة الحجوزات الداخلية', fr: 'Liste des réservations internes' }, state: 'IMPLEMENTED_AND_VERIFIED' },
      { id: 'detail', label: { ar: 'تفاصيل الحجز وربط الوحدة', fr: 'Détails & unité liée' }, state: 'IMPLEMENTED_AND_VERIFIED' },
      { id: 'lifecycle', label: { ar: 'الإنشاء، الإلغاء وانتهاء الصلاحية', fr: 'Création, annulation & expiration' }, state: 'IMPLEMENTED_AND_VERIFIED' },
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
      ar: 'عقود التخصيص القانونية، عقود البيع على التصاميم (VSP)، عقود البيع النهائية، التنازلات وإصداراتها.',
      fr: 'Réservations légales, contrats VSP, actes authentiques, cessions/co-acquéreurs et versions immuables.',
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
      {
        id: 'workspace',
        label: { ar: 'مساحة العقود', fr: 'Espace contrats' },
        state: 'PLANNED',
        description: {
          ar: 'النظرة الموحدة لجميع ملفات العقود المرتبطة بوحدات المشروع.',
          fr: 'Vue centralisée des dossiers contractuels rattachés aux unités du projet.',
        },
        columns: [
          { ar: 'مرجع العقد', fr: 'Réf. contrat' },
          { ar: 'النظام القانوني', fr: 'Régime légal' },
          { ar: 'الوحدة', fr: 'Lot' },
          { ar: 'المقتني', fr: 'Acquéreur' },
          { ar: 'المبلغ التعاقدي (دج)', fr: 'Montant contractuel (DZD)' },
          { ar: 'الحالة', fr: 'Statut' },
        ],
        disabledActions: [
          { ar: 'فتح ملف عقد جديد (المرحلة 2)', fr: 'Nouveau dossier contrat (Phase 2)' },
        ],
      },
      {
        id: 'statutory-res',
        label: { ar: 'عقد الحجز القانوني (FGCMPI)', fr: 'Réservation légale (FGCMPI)' },
        state: 'PLANNED',
        description: {
          ar: 'تغطية عقود التخصيص القانونية الخاضعة لصندوق الضمان والكفالة المتبادلة.',
          fr: 'Contrats de réservation légale soumis à la garantie FGCMPI (Loi 11-04).',
        },
        columns: [
          { ar: 'مرجع الحجز القانوني', fr: 'Réf. réservation légale' },
          { ar: 'شهادة الضمان FGCMPI', fr: 'Attestation FGCMPI' },
          { ar: 'الوحدة', fr: 'Lot' },
          { ar: 'المبلغ المضمون (دج)', fr: 'Dépôt garanti (DZD)' },
          { ar: 'أجل التحويل لـ VSP', fr: 'Échéance régularisation' },
          { ar: 'الحالة', fr: 'Statut' },
        ],
        disabledActions: [
          { ar: 'إصدار عقد تخصيص قانوني (مخطط)', fr: 'Émettre réservation légale (Planifié)' },
        ],
      },
      {
        id: 'vsp',
        label: { ar: 'عقد البيع على التصاميم (VSP)', fr: 'Contrat VSP' },
        state: 'PLANNED',
        description: {
          ar: 'عقود البيع على التصاميم المرتبطة بمراحل الإنجاز وضمانات الإنهاء.',
          fr: 'Contrats de vente sur plans adossés aux paliers réglementaires et garanties.',
        },
        columns: [
          { ar: 'مرجع VSP', fr: 'Réf. contrat VSP' },
          { ar: 'المقتني والحصص', fr: 'Acquéreur(s) & quotes-parts' },
          { ar: 'الموثق المعتمد', fr: 'Notaire' },
          { ar: 'تاريخ الإشهار', fr: 'Date de publication' },
          { ar: 'القيمة الإجمالية (دج)', fr: 'Prix global (DZD)' },
          { ar: 'حالة الاعتماد', fr: 'Validation' },
        ],
        disabledActions: [
          { ar: 'تحرير مشروع عقد VSP (مخطط)', fr: 'Préparer projet VSP (Planifié)' },
        ],
      },
      {
        id: 'final-deed',
        label: { ar: 'العقد التوثيقي النهائي', fr: 'Acte authentique final' },
        state: 'PLANNED',
        description: {
          ar: 'توثيق نقل الملكية النهائي ومحضر استلام المفاتيح بعد تسديد الرصيد.',
          fr: 'Enregistrement du transfert de propriété définitif et remise des clés après solde.',
        },
        columns: [
          { ar: 'مرجع العقد النهائي', fr: 'Réf. acte final' },
          { ar: 'رقم المحافظة العقارية', fr: 'N° conservation foncière' },
          { ar: 'الموثق', fr: 'Notaire' },
          { ar: 'وضعية تصفية الرصيد', fr: 'Solde acquitté' },
          { ar: 'محضر تسليم المفاتيح', fr: 'PV remise des clés' },
          { ar: 'الحالة', fr: 'Statut' },
        ],
        disabledActions: [
          { ar: 'تسجيل عقد نهائي (مخطط)', fr: 'Enregistrer acte final (Planifié)' },
        ],
      },
      {
        id: 'transfers',
        label: { ar: 'التنازلات وتعديل الحصص (Cessions)', fr: 'Cessions, transferts & co-acquéreurs' },
        state: 'PLANNED',
        description: {
          ar: 'إدارة طلبات التنازل للغير وتوزيع الحصص بين الشركاء في الاقتناء قبل العقد النهائي.',
          fr: 'Gestion des cessions de contrat et répartition des quotes-parts co-acquéreurs.',
        },
        columns: [
          { ar: 'رقم الطلب', fr: 'Réf. demande' },
          { ar: 'العقد الأصلي', fr: 'Contrat source' },
          { ar: 'نوع العملية (تنازل / حصص)', fr: 'Type (Cession / Quotes-parts)' },
          { ar: 'المتنازل', fr: 'Cédant' },
          { ar: 'المتنازل له / الشركاء', fr: 'Cessionnaire / Co-acquéreurs' },
          { ar: 'قرار الموافقة التوثيقية', fr: 'Approbation' },
        ],
        disabledActions: [
          { ar: 'إيداع طلب تنازل أو تعديل حصص (مخطط)', fr: 'Initier cession ou avenant parts (Planifié)' },
        ],
      },
      {
        id: 'versions',
        label: { ar: 'سجل الإصدارات والملاحق', fr: 'Versions & avenants immuables' },
        state: 'PLANNED',
        description: {
          ar: 'أثر تاريخي غير قابل للتعديل لكل نسخة عقد أو ملحق مع بصمة الوثيقة المودعة.',
          fr: 'Historique immuable de chaque version et avenant avec empreinte K-Min.',
        },
        columns: [
          { ar: 'رقم الإصدار', fr: 'N° version' },
          { ar: 'العقد', fr: 'Contrat' },
          { ar: 'سبب التعديل', fr: 'Motif de révision' },
          { ar: 'بصمة الوثيقة (K-Min)', fr: 'Empreinte K-Min' },
          { ar: 'المحرر', fr: 'Auteur' },
          { ar: 'تاريخ الإقفال', fr: 'Date de gel' },
        ],
        disabledActions: [
          { ar: 'تجميد نسخة جديدة (مخطط)', fr: 'Consigner version immuable (Planifié)' },
        ],
      },
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
      {
        id: 'obligations',
        label: { ar: 'الالتزامات المالية المستحقة', fr: 'Obligations de paiement' },
        state: 'PLANNED',
        description: {
          ar: 'الالتزامات المالية المترتبة عن كل عقد معتمد وتوزيعها حسب الأقساط.',
          fr: 'Engagements financiers issus de chaque contrat validé et reste à recouvrer.',
        },
        columns: [
          { ar: 'مرجع الالتزام', fr: 'Réf. obligation' },
          { ar: 'العقد والمقتني', fr: 'Contrat & acquéreur' },
          { ar: 'إجمالي المستحق (دج)', fr: 'Montant total dû (DZD)' },
          { ar: 'المخصص بالوصولات (دج)', fr: 'Affecté (DZD)' },
          { ar: 'المتبقي (دج)', fr: 'Reste à payer (DZD)' },
          { ar: 'الوضعية', fr: 'Statut' },
        ],
        disabledActions: [
          { ar: 'إصدار التزام تعاقدي (مخطط)', fr: 'Générer obligation contractuelle (Planifié)' },
        ],
      },
      {
        id: 'installments',
        label: { ar: 'جداول الأقساط (VSP)', fr: 'Échéanciers d’appels de fonds' },
        state: 'PLANNED',
        description: {
          ar: 'تفعيل نداءات الدفع المشروطة بإثبات تقدم الأشغال وفق المرسوم 13-431.',
          fr: 'Appels de fonds conditionnés par les preuves d’avancement (Décret 13-431).',
        },
        columns: [
          { ar: 'القسط / المرحلة', fr: 'Échéance / Palier' },
          { ar: 'شاهد الأشغال المطلوب (ح)', fr: 'Jalon chantier requis (H)' },
          { ar: 'تاريخ الاستحقاق', fr: 'Date d’exigibilité' },
          { ar: 'المبلغ (دج)', fr: 'Montant (DZD)' },
          { ar: 'حساب الإيداع', fr: 'Compte destinataire' },
          { ar: 'حالة التحرير', fr: 'Statut appel' },
        ],
        disabledActions: [
          { ar: 'فتح نداء قسط بعد إثبات المرحلة (مخطط)', fr: 'Débloquer appel sur preuve jalon (Planifié)' },
        ],
      },
      {
        id: 'receipts',
        label: { ar: 'وصولات التحصيل والتخصيص', fr: 'Reçus & affectations' },
        state: 'PLANNED',
        description: {
          ar: 'تسجيل المقبوضات الفعلية بالدينار وتخصيصها دون السماح بتجاوز السقف النقدي القانوني.',
          fr: 'Saisie des encaissements DZD, justificatifs bancaires et lettrage des échéances.',
        },
        columns: [
          { ar: 'رقم الوصل', fr: 'N° reçu' },
          { ar: 'وسيلة الدفع', fr: 'Mode de paiement' },
          { ar: 'المرجع البنكي', fr: 'Réf. bancaire' },
          { ar: 'المبلغ المحصّل (دج)', fr: 'Montant encaissé (DZD)' },
          { ar: 'الأقساط المغطاة', fr: 'Échéances lettrées' },
          { ar: 'اعتماد المحاسبة', fr: 'Validation' },
        ],
        disabledActions: [
          { ar: 'تسجيل وصل تحصيل بالدينار (مخطط)', fr: 'Enregistrer encaissement DZD (Planifié)' },
        ],
      },
      {
        id: 'treasury',
        label: { ar: 'الصندوق والحسابات البنكية', fr: 'Caisse & banques (FGCMPI / Promoteur)' },
        state: 'PLANNED',
        description: {
          ar: 'متابعة حسابات الضمان المودعة لدى الصندوق وحسابات الخزينة التشغيلية للمرقي.',
          fr: 'Suivi séparé des comptes séquestre FGCMPI, comptes bancaires et caisses.',
        },
        columns: [
          { ar: 'الحساب / الصندوق', fr: 'Compte / Caisse' },
          { ar: 'التصنيف القانوني', fr: 'Nature (FGCMPI / Promoteur / Caisse)' },
          { ar: 'البنك / RIB', fr: 'Banque / RIB' },
          { ar: 'الرصيد المؤكد (دج)', fr: 'Solde rapproché (DZD)' },
          { ar: 'آخر تسوية', fr: 'Dernier rapprochement' },
          { ar: 'الحالة', fr: 'Statut' },
        ],
        disabledActions: [
          { ar: 'تنفيذ تسوية بنكية (مخطط)', fr: 'Valider rapprochement bancaire (Planifié)' },
        ],
      },
      {
        id: 'refunds',
        label: { ar: 'المرتجعات وإلغاء القيود', fr: 'Remboursements & contre-passations' },
        state: 'PLANNED',
        description: {
          ar: 'معالجة إرجاع المبالغ أو القيود العكسية بمصادقة ثنائية دون حذف الأثر المالي السابق.',
          fr: 'Traitement des remboursements et extournes par double validation sans suppression d’historique.',
        },
        columns: [
          { ar: 'مرجع العملية', fr: 'Réf. opération' },
          { ar: 'النوع (إرجاع / قيد عكسي)', fr: 'Type (Remboursement / Extourne)' },
          { ar: 'الوصل الأصلي', fr: 'Reçu d’origine' },
          { ar: 'المبرر الموثق', fr: 'Motif justifié' },
          { ar: 'المبلغ (دج)', fr: 'Montant (DZD)' },
          { ar: 'المصادقة المزدوجة', fr: 'Double approbation' },
        ],
        disabledActions: [
          { ar: 'طلب إرجاع مالي / قيد عكسي (مخطط)', fr: 'Proposer remboursement / extourne (Planifié)' },
        ],
      },
      {
        id: 'statements',
        label: { ar: 'كشف حساب المقتني', fr: 'Relevé compte acquéreur' },
        state: 'PLANNED',
        description: {
          ar: 'كشف تفصيلي زمني لالتزامات وتحصلات المقتني ورصيده النهائي بالدينار.',
          fr: 'Extrait chronologique complet des appels de fonds, règlements et solde acquéreur.',
        },
        columns: [
          { ar: 'التاريخ', fr: 'Date' },
          { ar: 'المرجع', fr: 'Pièce' },
          { ar: 'بيان العملية', fr: 'Libellé' },
          { ar: 'المستحق (دج)', fr: 'Débit / Appelé (DZD)' },
          { ar: 'المقبوض (دج)', fr: 'Crédit / Encaissé (DZD)' },
          { ar: 'الرصيد المتبقي (دج)', fr: 'Solde (DZD)' },
        ],
        disabledActions: [
          { ar: 'استخراج كشف حساب مقتني (مخطط)', fr: 'Exporter relevé acquéreur (Planifié)' },
        ],
      },
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
      {
        id: 'workstreams',
        label: { ar: 'مسارات عمل المشروع', fr: 'Axes opérationnels du projet' },
        state: 'PLANNED',
        description: {
          ar: 'تنظيم تقدم الورشة حسب العمارات والأشغال الخارجية والشبكات.',
          fr: 'Structuration du suivi de chantier par bâtiment, gros œuvre, CES et VRD.',
        },
        columns: [
          { ar: 'مسار العمل', fr: 'Axe opérationnel' },
          { ar: 'العمارة / المنطقة', fr: 'Bâtiment / Zone' },
          { ar: 'المرحلة الكبرى', fr: 'Phase majeure' },
          { ar: 'الوزن التقديري (%)', fr: 'Pondération (%)' },
          { ar: 'المشرف الميداني', fr: 'Responsable' },
          { ar: 'الحالة', fr: 'Statut' },
        ],
        disabledActions: [
          { ar: 'تحديد مسار عمل جديد (مخطط)', fr: 'Créer axe de travaux (Planifié)' },
        ],
      },
      {
        id: 'lots',
        label: { ar: 'حصص الأشغال التقنية', fr: 'Lots de travaux' },
        state: 'PLANNED',
        description: {
          ar: 'تقسيم الأشغال إلى حصص تعاقدية (حفر، خرسانة، تلبيس، كهرباء...).',
          fr: 'Découpage contractuel par corps d’état technique et suivi des budgets marchés.',
        },
        columns: [
          { ar: 'رمز الحصة', fr: 'Code lot' },
          { ar: 'التعيين التقني', fr: 'Désignation technique' },
          { ar: 'المقاول المسند له', fr: 'Entreprise titulaire' },
          { ar: 'مبلغ الصفقة (دج)', fr: 'Montant marché (DZD)' },
          { ar: 'المصادق عليه (دج)', fr: 'Cumul validé (DZD)' },
          { ar: 'الحالة', fr: 'Statut' },
        ],
        disabledActions: [
          { ar: 'إضافة حصة أشغال (مخطط)', fr: 'Créer lot technique (Planifié)' },
        ],
      },
      {
        id: 'contractors',
        label: { ar: 'المقاولون ومكاتب الدراسات', fr: 'Entreprises & maîtres d’œuvre' },
        state: 'PLANNED',
        description: {
          ar: 'ربط المقاولين ومكاتب الدراسات ومراقبة البناء CTC بدليل الأطراف المركزي.',
          fr: 'Rattachement des entreprises, BET et CTC depuis le répertoire central des tiers.',
        },
        columns: [
          { ar: 'الطرف (من الدليل المركزي)', fr: 'Tiers (Répertoire central)' },
          { ar: 'الدور التقني', fr: 'Rôle (Entreprise / BET / CTC)' },
          { ar: 'شهادة التأهيل / الاعتماد', fr: 'Qualification / Agrément' },
          { ar: 'الحصص المسندة', fr: 'Lots attribués' },
          { ar: 'الحالة', fr: 'Statut' },
        ],
        disabledActions: [
          { ar: 'إسناد مقاول أو مكتب دراسات (مخطط)', fr: 'Associer entreprise / BET (Planifié)' },
        ],
      },
      {
        id: 'progress',
        label: { ar: 'تقدم الإنجاز في الورشة', fr: 'Avancement chantier' },
        state: 'PLANNED',
        description: {
          ar: 'تسجيل نسب الإنجاز الفعلية وملاحظات الزيارات الميدانية للورشة.',
          fr: 'Relevés périodiques d’avancement physique et observations de chantier.',
        },
        columns: [
          { ar: 'تاريخ المعاينة', fr: 'Date relevé' },
          { ar: 'الحصة / البلوك', fr: 'Lot / Bâtiment' },
          { ar: 'نسبة التقدم الفعلي (%)', fr: 'Avancement physique (%)' },
          { ar: 'ملاحظات الورشة', fr: 'Observations terrain' },
          { ar: 'المهندس المعدّ', fr: 'Auteur' },
          { ar: 'المصادقة', fr: 'Validation' },
        ],
        disabledActions: [
          { ar: 'تسجيل معاينة تقدم الأشغال (مخطط)', fr: 'Saisir relevé d’avancement (Planifié)' },
        ],
      },
      {
        id: 'situations',
        label: { ar: 'القياسات ووضعيات الدفع', fr: 'Attachements & situations' },
        state: 'PLANNED',
        description: {
          ar: 'إعداد ومراجعة وضعيات أشغال المقاولين واحتساب اقتطاع الضمان.',
          fr: 'Vérification des attachements, situations mensuelles et retenues de garantie.',
        },
        columns: [
          { ar: 'رقم الوضعية', fr: 'N° situation' },
          { ar: 'الحصة والمقاول', fr: 'Lot & entreprise' },
          { ar: 'الفترة', fr: 'Période' },
          { ar: 'الصافي بعد الاقتطاع (دج)', fr: 'Net à mandater (DZD)' },
          { ar: 'محضر القياس K-Min', fr: 'Attachement K-Min' },
          { ar: 'الحالة', fr: 'Statut' },
        ],
        disabledActions: [
          { ar: 'اعتماد وضعية أشغال (مخطط)', fr: 'Valider situation de travaux (Planifié)' },
        ],
      },
      {
        id: 'milestones',
        label: { ar: 'شواهد المراحل المعتمدة', fr: 'Preuves de jalons (VSP)' },
        state: 'PLANNED',
        description: {
          ar: 'محاضر إثبات بلوغ المراحل القانونية التي تفتح استحقاق أقساط المقتنين.',
          fr: 'Procès-verbaux probants conditionnant l’ouverture des paliers financiers VSP.',
        },
        columns: [
          { ar: 'المرحلة النظامية', fr: 'Jalon VSP' },
          { ar: 'القسط المالي المرتبط (ز)', fr: 'Palier financier lié (G)' },
          { ar: 'محضر الإثبات (K-Min)', fr: 'PV justificatif (K-Min)' },
          { ar: 'المصادقة التقنية', fr: 'Signature technique' },
          { ar: 'الحالة', fr: 'Statut' },
        ],
        disabledActions: [
          { ar: 'توثيق شاهد مرحلة VSP (مخطط)', fr: 'Attester jalon avec preuve (Planifié)' },
        ],
      },
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
      ar: 'دليل الموردين، طلبات الشراء، أوامر التوريد، وصلات الاستلام، ومخزون وفواتير الموردين.',
      fr: 'Fournisseurs, demandes d’achat, commandes, livraisons, stocks et factures fournisseurs.',
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
      {
        id: 'suppliers',
        label: { ar: 'دليل الموردين', fr: 'Espace fournisseurs' },
        state: 'PLANNED',
        description: {
          ar: 'موردو مواد البناء والتجهيزات المرتبطون بالطرف المركزي والوثائق الجبائية.',
          fr: 'Fournisseurs rattachés au répertoire Tiers avec dossier fiscal vérifié.',
        },
        columns: [
          { ar: 'المورد (الطرف المركزي)', fr: 'Fournisseur (Tiers)' },
          { ar: 'التخصص', fr: 'Catégorie' },
          { ar: 'الوضعية الجبائية (NIF/RC)', fr: 'Conformité (NIF/RC)' },
          { ar: 'الطلبات الجارية', fr: 'Commandes actives' },
          { ar: 'الحالة', fr: 'Statut' },
        ],
        disabledActions: [
          { ar: 'تأهيل مورد (مخطط)', fr: 'Qualifier fournisseur (Planifié)' },
        ],
      },
      {
        id: 'pr',
        label: { ar: 'طلبات الشراء', fr: 'Demandes d’achat' },
        state: 'PLANNED',
        description: {
          ar: 'التعبير عن احتياجات الورشة والمستودع قبل إصدار أوامر الشراء.',
          fr: 'Expression des besoins chantier et validation interne avant commande.',
        },
        columns: [
          { ar: 'رقم طلب الشراء (DA)', fr: 'N° DA' },
          { ar: 'الورشة / الحصة الطالبة', fr: 'Lot / Chantier' },
          { ar: 'ملخص المواد', fr: 'Articles demandés' },
          { ar: 'تاريخ الحاجة', fr: 'Date souhaitée' },
          { ar: 'حالة الموافقة', fr: 'Approbation' },
        ],
        disabledActions: [
          { ar: 'إنشاء طلب شراء DA (مخطط)', fr: 'Créer demande d’achat (Planifié)' },
        ],
      },
      {
        id: 'po',
        label: { ar: 'أوامر الشراء', fr: 'Bons de commande' },
        state: 'PLANNED',
        description: {
          ar: 'الالتزامات التعاقدية مع الموردين ومتابعة الآجال والأسعار المتفق عليها.',
          fr: 'Engagements d’achat envers les fournisseurs et suivi des délais.',
        },
        columns: [
          { ar: 'رقم أمر الشراء (BC)', fr: 'N° BC' },
          { ar: 'طلب الشراء المرجعي', fr: 'DA source' },
          { ar: 'المورد', fr: 'Fournisseur' },
          { ar: 'القيمة الإجمالية (دج)', fr: 'Montant TTC (DZD)' },
          { ar: 'حالة التسليم', fr: 'Statut' },
        ],
        disabledActions: [
          { ar: 'إصدار أمر شراء BC (مخطط)', fr: 'Émettre bon de commande (Planifié)' },
        ],
      },
      {
        id: 'deliveries',
        label: { ar: 'وصلات الاستلام', fr: 'Réceptions & livraisons' },
        state: 'PLANNED',
        description: {
          ar: 'مراقبة الكميات المستلمة ميدانياً مقارنة بأمر الشراء وتوثيق الفروقات.',
          fr: 'Contrôle quantitatif des livraisons sur site par rapport au bon de commande.',
        },
        columns: [
          { ar: 'رقم وصل الاستلام (BL)', fr: 'N° BL' },
          { ar: 'أمر الشراء (BC)', fr: 'BC lié' },
          { ar: 'تاريخ الاستلام', fr: 'Date réception' },
          { ar: 'الكمية المستلمة / الفارق', fr: 'Qté reçue / Écart' },
          { ar: 'أمين المخزن / المهندس', fr: 'Réceptionnaire' },
        ],
        disabledActions: [
          { ar: 'تأكيد وصل استلام BL (مخطط)', fr: 'Valider réception BL (Planifié)' },
        ],
      },
      {
        id: 'inventory',
        label: { ar: 'المخزون وحركات المواد', fr: 'Stocks dépôt & chantier' },
        state: 'PLANNED',
        description: {
          ar: 'تتبع الأرصدة الحقيقية للمواد في المستودع والورشة وحركات الصرف والتحويل.',
          fr: 'Suivi des stocks disponibles en dépôt/chantier et bons de sortie ou transfert.',
        },
        columns: [
          { ar: 'رمز المادة', fr: 'Code article' },
          { ar: 'التعيين', fr: 'Désignation' },
          { ar: 'المستودع / الورشة', fr: 'Dépôt / Site' },
          { ar: 'الرصيد المتاح', fr: 'Stock disponible' },
          { ar: 'حد التنبيه', fr: 'Seuil alerte' },
        ],
        disabledActions: [
          { ar: 'تسجيل حركة مخزون (مخطط)', fr: 'Saisir mouvement de stock (Planifié)' },
        ],
      },
      {
        id: 'supplier-invoices',
        label: { ar: 'فواتير الموردين والمطابقة الثلاثية', fr: 'Factures fournisseurs & rapprochement' },
        state: 'PLANNED',
        description: {
          ar: 'المطابقة الثلاثية بين أمر الشراء (BC) ووصل الاستلام (BL) وفاتورة المورد قبل الترحيل.',
          fr: 'Contrôle 3 voies (BC / BL / Facture fournisseur) avant validation financière et SCF.',
        },
        columns: [
          { ar: 'رقم الفاتورة', fr: 'N° facture' },
          { ar: 'المورد', fr: 'Fournisseur' },
          { ar: 'مطابقة BC / BL', fr: 'Rapprochement BC / BL' },
          { ar: 'المبلغ المستحق (دج)', fr: 'Montant (DZD)' },
          { ar: 'إذن الدفع والترحيل', fr: 'Statut validation' },
        ],
        disabledActions: [
          { ar: 'مطابقة واعتماد فاتورة مورد (مخطط)', fr: 'Rapprocher facture fournisseur (Planifié)' },
        ],
      },
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
      ar: 'مدونة الحسابات SCF، اليوميات المتوازنة، الفترات، التصريحات الجبائية والقوائم المالية.',
      fr: 'Plan comptable SCF, journaux, clôtures, fiscalité algérienne et états financiers.',
    },
    scopeNote: {
      ar: 'قيد التطوير (المرحلة الخامسة) — متوقف على اعتماد خبير محاسبي جزائري لقواعد الترحيل والالتزامات الجبائية.',
      fr: 'Planifié (Phase 5) — soumis à validation préalable d’un Expert-Comptable algérien.',
    },
    projectSection: 'accounting',
    prerequisites: {
      ar: 'متطلبات مسبقة: اعتماد خبير محاسبي جزائري لقواعد SCF، ونسب الـ TVA، وIBS/TAP/IRG وفق التشريع المعمول به.',
      fr: 'Prérequis : validation Expert-Comptable pour les schémas SCF, TVA et déclarations fiscales applicables.',
    },
    subScreens: [
      {
        id: 'scf-workspace',
        label: { ar: 'دليل الحسابات SCF', fr: 'Plan de comptes SCF' },
        state: 'PLANNED',
        description: {
          ar: 'إدارة مدونة الحسابات وفق النظام المحاسبي المالي الجزائري (الأصناف 1 إلى 7).',
          fr: 'Paramétrage des comptes auxiliaires et analytiques selon les classes 1 à 7 du SCF.',
        },
        columns: [
          { ar: 'رقم الحساب SCF', fr: 'N° compte SCF' },
          { ar: 'التسمية الرسمية', fr: 'Intitulé officiel' },
          { ar: 'الصنف', fr: 'Classe (1-7)' },
          { ar: 'طبيعة الرصيد', fr: 'Sens du solde' },
          { ar: 'الحالة', fr: 'Statut' },
        ],
        disabledActions: [
          { ar: 'ضبط قواعد التوجيه SCF (مخطط)', fr: 'Configurer schéma SCF (Planifié)' },
        ],
      },
      {
        id: 'journals',
        label: { ar: 'اليوميات والقيود المزدوجة', fr: 'Journaux & écritures équilibrées' },
        state: 'PLANNED',
        description: {
          ar: 'الترحيل المتوازن التلقائي واليدوي المرتبط بالمستندات الأصلية بالدينار.',
          fr: 'Écritures comptables équilibrées (Débit = Crédit) adossées aux pièces probantes DZD.',
        },
        columns: [
          { ar: 'اليومية', fr: 'Journal' },
          { ar: 'رقم القيد / المرجع', fr: 'N° pièce' },
          { ar: 'الحساب SCF', fr: 'Compte SCF' },
          { ar: 'المدين (دج)', fr: 'Débit (DZD)' },
          { ar: 'الدائن (دج)', fr: 'Crédit (DZD)' },
          { ar: 'الفترة المحاسبية', fr: 'Période' },
        ],
        disabledActions: [
          { ar: 'تقييد حركة محاسبية (مخطط)', fr: 'Passer écriture SCF (Planifié)' },
        ],
      },
      {
        id: 'periods',
        label: { ar: 'الفترات والإقفال المحاسبي', fr: 'Périodes & clôtures comptables' },
        state: 'PLANNED',
        description: {
          ar: 'فتح وإقفال الفترات الشهرية والسنوية ومنع أي تعديل رجعي بعد الإقفال.',
          fr: 'Ouverture, contrôle d’équilibre et verrouillage irréversible des périodes.',
        },
        columns: [
          { ar: 'السنة المالية', fr: 'Exercice' },
          { ar: 'الفترة', fr: 'Période' },
          { ar: 'من / إلى', fr: 'Début / Fin' },
          { ar: 'حالة التوازن', fr: 'Contrôle équilibre' },
          { ar: 'حالة الإقفال', fr: 'Statut clôture' },
        ],
        disabledActions: [
          { ar: 'إقفال الفترة المحاسبية (مخطط)', fr: 'Clôturer période (Planifié)' },
        ],
      },
      {
        id: 'tax',
        label: { ar: 'ملف الجباية والـ TVA', fr: 'Espace fiscal & déclarations' },
        state: 'PLANNED',
        description: {
          ar: 'تجميع الأوعية والـ TVA المحصّلة والقابلة للاسترجاع لتحضير التصريحات دون افتراض نسب ثابتة مسبقاً.',
          fr: 'Préparation des assiettes TVA et déclarations selon barèmes validés par l’Expert-Comptable.',
        },
        columns: [
          { ar: 'نوع التصريح', fr: 'Nature déclaration (G50 / TVA / IBS)' },
          { ar: 'الفترة الجبائية', fr: 'Période fiscale' },
          { ar: 'الوعاء الخاضع (دج)', fr: 'Base imposable (DZD)' },
          { ar: 'المبلغ المرجعي (دج)', fr: 'TVA / Impôt calculé (DZD)' },
          { ar: 'اعتماد المحاسب', fr: 'Visa CPA' },
        ],
        disabledActions: [
          { ar: 'تحضير جدول G50 بعد اعتماد النسب (مخطط)', fr: 'Préparer état G50 (Planifié)' },
        ],
      },
      {
        id: 'financial-statements',
        label: { ar: 'القوائم المالية والديون والالتزامات', fr: 'États financiers & dettes SCF' },
        state: 'PLANNED',
        description: {
          ar: 'إنتاج الميزانية، جدول حسابات النتائج (TCR)، جدول تدفقات الخزينة، وجدول الديون وتسبيقات المقتنين.',
          fr: 'Bilan, TCR, tableau des flux de trésorerie et annexe dettes / avances acquéreurs.',
        },
        columns: [
          { ar: 'البيان المالي / الجدول', fr: 'État / Annexe SCF' },
          { ar: 'السنة / الفترة', fr: 'Exercice / Période' },
          { ar: 'التزامات وتسبيقات المقتنين', fr: 'Avances acquéreurs & dettes' },
          { ar: 'العملة', fr: 'Devise (DZD)' },
          { ar: 'حالة المصادقة', fr: 'Statut certification' },
        ],
        disabledActions: [
          { ar: 'إصدار القوائم المالية SCF (مخطط)', fr: 'Générer liasse SCF (Planifié)' },
        ],
      },
    ],
  },
  {
    code: 'K',
    state: 'PARTIALLY_IMPLEMENTED',
    title: {
      ar: 'ك. إدارة الوثائق والأرشيف',
      fr: 'K. Gestion Documentaire & Archives',
    },
    summary: {
      ar: 'رفع وتنزيل وثائق المشروع مع بصمة SHA-256 مفعّل؛ البيانات الوصفية والروابط والاحتفاظ قيد التطوير.',
      fr: 'Dépôt, liste et téléchargement SHA-256 actifs ; métadonnées, DocumentLink et rétention K-Full planifiés.',
    },
    scopeNote: {
      ar: 'الرفع والقائمة والتنزيل مع التحقق من بصمة SHA-256 مفعّل في K-Min؛ تعديل البيانات الوصفية/الأرشفة اللينة، DocumentLink، وK-Full مخططة.',
      fr: 'Upload, liste et download SHA-256 actifs (K-Min) ; mise à jour métadonnées/soft-archive, DocumentLink et rétention K-Full planifiés.',
    },
    projectSection: 'documents',
    subScreens: [
      { id: 'vault', label: { ar: 'وثائق المشروع (رفع وتنزيل SHA-256)', fr: 'Documents projet (upload/download SHA-256)' }, state: 'IMPLEMENTED_AND_VERIFIED' },
      { id: 'metadata', label: { ar: 'تحديث البيانات الوصفية والأرشفة اللينة', fr: 'Mise à jour métadonnées & soft-archive' }, state: 'PLANNED' },
      { id: 'links', label: { ar: 'الربط المهيكل (DocumentLink)', fr: 'Liens structurés (DocumentLink)' }, state: 'PLANNED' },
      { id: 'retention', label: { ar: 'سياسات الاحتفاظ والأرشفة (K-Full)', fr: 'Rétention & archivage (K-Full)' }, state: 'PLANNED' },
    ],
  },
  {
    code: 'L',
    state: 'PARTIALLY_IMPLEMENTED',
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
      { id: 'audit', label: { ar: 'سجل التدقيق الأمني (الإدارة التقنية)', fr: 'Journal d’audit (Admin technique)' }, state: 'IMPLEMENTED_AND_VERIFIED' },
      { id: 'portfolio', label: { ar: 'ملخص المشاريع المصرح بها', fr: 'Synthèse portefeuille autorisé' }, state: 'PARTIALLY_IMPLEMENTED' },
      {
        id: 'sales-rep',
        label: { ar: 'تقارير المبيعات والمخزون العقاري', fr: 'États commerciaux & stocks lots' },
        state: 'PLANNED',
        columns: [
          { ar: 'المشروع / البلوك', fr: 'Projet / Bâtiment' },
          { ar: 'الوحدات المتاحة / المحجوزة', fr: 'Lots disponibles / réservés' },
          { ar: 'نسبة التسويق', fr: 'Taux commercialisation' },
          { ar: 'حالة التصدير', fr: 'Statut export' },
        ],
      },
      {
        id: 'arrears',
        label: { ar: 'تقارير التحصيل والمتأخرات', fr: 'Recouvrement & créances échues' },
        state: 'PLANNED',
        columns: [
          { ar: 'المقتني / العقد', fr: 'Acquéreur / Contrat' },
          { ar: 'الأقساط المستحقة (دج)', fr: 'Échéances appelées (DZD)' },
          { ar: 'المحصّل (دج)', fr: 'Encaissé (DZD)' },
          { ar: 'المتأخرات وأيام التأخير', fr: 'Impayés & ancienneté' },
        ],
      },
      {
        id: 'construction-rep',
        label: { ar: 'تقارير انحرافات الأشغال والمشتريات', fr: 'Écarts chantier & achats' },
        state: 'PLANNED',
        columns: [
          { ar: 'الحصة التقنية', fr: 'Lot technique' },
          { ar: 'الميزانية التقديرية (دج)', fr: 'Budget prévu (DZD)' },
          { ar: 'الوضعيات والمشتريات (دج)', fr: 'Engagé & situations (DZD)' },
          { ar: 'الفارق (%)', fr: 'Écart (%)' },
        ],
      },
      {
        id: 'accounting-rep',
        label: { ar: 'موازين المراجعة والتقارير المحاسبية', fr: 'Balances & états comptables SCF' },
        state: 'PLANNED',
        columns: [
          { ar: 'الحساب SCF', fr: 'Compte SCF' },
          { ar: 'إجمالي المدين (دج)', fr: 'Total Débit (DZD)' },
          { ar: 'إجمالي الدائن (دج)', fr: 'Total Crédit (DZD)' },
          { ar: 'الرصيد الختامي (دج)', fr: 'Solde clôture (DZD)' },
        ],
      },
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
    case 'IMPLEMENTED_AND_VERIFIED':
      return language === 'ar' ? 'مفعّل ومعتمد' : 'Implémenté & vérifié';
    case 'IMPLEMENTED_NOT_VERIFIED':
      return language === 'ar' ? 'مفعّل (بانتظار الاعتماد)' : 'Implémenté (non vérifié)';
    case 'PARTIALLY_IMPLEMENTED':
      return language === 'ar' ? 'مفعّل جزئياً' : 'Partiellement implémenté';
    case 'PLANNED':
      return language === 'ar' ? 'مخطط / قيد التطوير' : 'Planifié / En préparation';
    case 'BLOCKED':
      return language === 'ar' ? 'معلّق / بانتظار شرط' : 'Bloqué / Prérequis manquant';
    case 'DEPRECATED':
      return language === 'ar' ? 'متوقف / ملغى' : 'Obsolète / Déprécié';
  }
}
