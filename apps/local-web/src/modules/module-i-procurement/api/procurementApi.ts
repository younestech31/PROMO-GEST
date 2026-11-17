import { createPlannedEndpointRejection } from "@/core/api/apiClient";

export const PROCUREMENT_SUB_WORKFLOWS = [
  {
    id: 'suppliers',
    label: { ar: 'دليل الموردين', fr: 'Espace fournisseurs' },
    state: 'PLANNED' as const,
    description: { ar: 'موردو مواد البناء والتجهيزات المرتبطون بالطرف المركزي والوثائق الجبائية.', fr: 'Fournisseurs rattachés au répertoire Tiers avec dossier fiscal vérifié.' },
    columns: [
      { ar: 'المورد (الطرف المركزي)', fr: 'Fournisseur (Tiers)' },
      { ar: 'التخصص', fr: 'Catégorie' },
      { ar: 'الوضعية الجبائية (NIF/RC)', fr: 'Conformité (NIF/RC)' },
      { ar: 'الطلبات الجارية', fr: 'Commandes actives' },
      { ar: 'الحالة', fr: 'Statut' },
    ],
    disabledActions: [{ ar: 'تأهيل مورد (مخطط)', fr: 'Qualifier fournisseur (Planifié)' }],
  },
  {
    id: 'purchase-requests',
    label: { ar: 'طلبات الشراء (DA)', fr: 'Demandes d’achat (DA)' },
    state: 'PLANNED' as const,
    description: { ar: 'التعبير عن احتياجات الورشة والمستودع قبل إصدار أوامر الشراء.', fr: 'Expression des besoins chantier et validation interne avant commande.' },
    columns: [
      { ar: 'رقم طلب الشراء (DA)', fr: 'N° DA' },
      { ar: 'الورشة / الحصة الطالبة', fr: 'Lot / Chantier' },
      { ar: 'ملخص المواد', fr: 'Articles demandés' },
      { ar: 'تاريخ الحاجة', fr: 'Date souhaitée' },
      { ar: 'حالة الموافقة', fr: 'Approbation' },
    ],
    disabledActions: [{ ar: 'إنشاء طلب شراء DA (مخطط)', fr: 'Créer demande d’achat (Planifié)' }],
  },
  {
    id: 'purchase-orders',
    label: { ar: 'أوامر الشراء (BC)', fr: 'Bons de commande (BC)' },
    state: 'PLANNED' as const,
    description: { ar: 'الالتزامات التعاقدية مع الموردين ومتابعة الآجال والأسعار المتفق عليها.', fr: 'Engagements d’achat envers les fournisseurs et suivi des délais.' },
    columns: [
      { ar: 'رقم أمر الشراء (BC)', fr: 'N° BC' },
      { ar: 'طلب الشراء المرجعي', fr: 'DA source' },
      { ar: 'المورد', fr: 'Fournisseur' },
      { ar: 'القيمة الإجمالية (دج)', fr: 'Montant TTC (DZD)' },
      { ar: 'حالة التسليم', fr: 'Statut' },
    ],
    disabledActions: [{ ar: 'إصدار أمر شراء BC (مخطط)', fr: 'Émettre bon de commande (Planifié)' }],
  },
  {
    id: 'deliveries',
    label: { ar: 'وصلات الاستلام (BL)', fr: 'Réceptions & livraisons (BL)' },
    state: 'PLANNED' as const,
    description: { ar: 'مراقبة الكميات المستلمة ميدانياً مقارنة بأمر الشراء وتوثيق الفروقات.', fr: 'Contrôle quantitatif des livraisons sur site par rapport au bon de commande.' },
    columns: [
      { ar: 'رقم وصل الاستلام (BL)', fr: 'N° BL' },
      { ar: 'أمر الشراء (BC)', fr: 'BC lié' },
      { ar: 'تاريخ الاستلام', fr: 'Date réception' },
      { ar: 'الكمية المستلمة / الفارق', fr: 'Qté reçue / Écart' },
      { ar: 'أمين المخزن / المهندس', fr: 'Réceptionnaire' },
    ],
    disabledActions: [{ ar: 'تأكيد وصل استلام BL (مخطط)', fr: 'Valider réception BL (Planifié)' }],
  },
  {
    id: 'inventory',
    label: { ar: 'المخزون وحركات المواد', fr: 'Stocks & mouvements' },
    state: 'PLANNED' as const,
    description: { ar: 'تتبع الأرصدة الحقيقية للمواد في المستودع والورشة وحركات الصرف والتحويل.', fr: 'Suivi des stocks disponibles en dépôt/chantier et bons de sortie ou transfert.' },
    columns: [
      { ar: 'رمز المادة', fr: 'Code article' },
      { ar: 'التعيين', fr: 'Désignation' },
      { ar: 'المستودع / الورشة', fr: 'Dépôt / Site' },
      { ar: 'الرصيد المتاح', fr: 'Stock disponible' },
      { ar: 'حد التنبيه', fr: 'Seuil alerte' },
    ],
    disabledActions: [{ ar: 'تسجيل حركة مخزون (مخطط)', fr: 'Saisir mouvement de stock (Planifié)' }],
  },
  {
    id: 'supplier-invoices',
    label: { ar: 'فواتير الموردين والمطابقة الثلاثية', fr: 'Factures fournisseurs & rapprochement' },
    state: 'PLANNED' as const,
    description: { ar: 'المطابقة الثلاثية بين أمر الشراء (BC) ووصل الاستلام (BL) وفاتورة المورد قبل الترحيل.', fr: 'Contrôle 3 voies (BC / BL / Facture fournisseur) avant validation financière et SCF.' },
    columns: [
      { ar: 'رقم الفاتورة', fr: 'N° facture' },
      { ar: 'المورد', fr: 'Fournisseur' },
      { ar: 'مطابقة BC / BL', fr: 'Rapprochement BC / BL' },
      { ar: 'المبلغ المستحق (دج)', fr: 'Montant (DZD)' },
      { ar: 'إذن الدفع والترحيل', fr: 'Statut validation' },
    ],
    disabledActions: [{ ar: 'مطابقة واعتماد فاتورة مورد (مخطط)', fr: 'Rapprocher facture fournisseur (Planifié)' }],
  },
] as const;

export const procurementApi = {
  listProcurement: (_projectId: string): Promise<never> =>
    createPlannedEndpointRejection('GET /api/projects/:projectId/procurement', 'I-Procurement'),
};
