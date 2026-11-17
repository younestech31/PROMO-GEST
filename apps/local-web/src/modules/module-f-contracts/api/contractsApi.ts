import { createPlannedEndpointRejection } from "@/core/api/apiClient";

export const CONTRACTS_SUB_WORKFLOWS = [
  {
    id: 'directory',
    label: { ar: 'دليل العقود', fr: 'Répertoire des contrats' },
    state: 'PLANNED' as const,
    description: { ar: 'النظرة الموحدة لجميع ملفات العقود المرتبطة بوحدات المشروع.', fr: 'Vue centralisée des dossiers contractuels rattachés aux unités du projet.' },
    columns: [
      { ar: 'مرجع العقد', fr: 'Réf. contrat' },
      { ar: 'النظام القانوني', fr: 'Régime légal' },
      { ar: 'الوحدة', fr: 'Lot' },
      { ar: 'المقتني', fr: 'Acquéreur' },
      { ar: 'المبلغ التعاقدي (دج)', fr: 'Montant contractuel (DZD)' },
      { ar: 'الحالة', fr: 'Statut' },
    ],
    disabledActions: [{ ar: 'فتح ملف عقد جديد (المرحلة 2)', fr: 'Nouveau dossier contrat (Phase 2)' }],
  },
  {
    id: 'legal-reservation',
    label: { ar: 'عقد الحجز القانوني (FGCMPI)', fr: 'Réservation légale (FGCMPI)' },
    state: 'PLANNED' as const,
    description: { ar: 'تغطية عقود التخصيص القانونية الخاضعة لصندوق الضمان والكفالة المتبادلة.', fr: 'Contrats de réservation légale soumis à la garantie FGCMPI (Loi 11-04).' },
    columns: [
      { ar: 'مرجع الحجز القانوني', fr: 'Réf. réservation légale' },
      { ar: 'شهادة الضمان FGCMPI', fr: 'Attestation FGCMPI' },
      { ar: 'الوحدة', fr: 'Lot' },
      { ar: 'المبلغ المضمون (دج)', fr: 'Dépôt garanti (DZD)' },
      { ar: 'أجل التحويل لـ VSP', fr: 'Échéance régularisation' },
      { ar: 'الحالة', fr: 'Statut' },
    ],
    disabledActions: [{ ar: 'إصدار عقد تخصيص قانوني (مخطط)', fr: 'Émettre réservation légale (Planifié)' }],
  },
  {
    id: 'vsp-workspace',
    label: { ar: 'مساحة عقد VSP', fr: 'Espace contrat VSP' },
    state: 'PLANNED' as const,
    description: { ar: 'عقود البيع على التصاميم المرتبطة بمراحل الإنجاز وضمانات الإنهاء.', fr: 'Contrats de vente sur plans adossés aux paliers réglementaires et garanties.' },
    columns: [
      { ar: 'مرجع VSP', fr: 'Réf. contrat VSP' },
      { ar: 'المقتني والحصص', fr: 'Acquéreur(s) & quotes-parts' },
      { ar: 'الموثق المعتمد', fr: 'Notaire' },
      { ar: 'تاريخ الإشهار', fr: 'Date de publication' },
      { ar: 'القيمة الإجمالية (دج)', fr: 'Prix global (DZD)' },
      { ar: 'حالة الاعتماد', fr: 'Validation' },
    ],
    disabledActions: [{ ar: 'تحرير مشروع عقد VSP (مخطط)', fr: 'Préparer projet VSP (Planifié)' }],
  },
  {
    id: 'final-deed',
    label: { ar: 'العقد التوثيقي النهائي', fr: 'Acte authentique final' },
    state: 'PLANNED' as const,
    description: { ar: 'توثيق نقل الملكية النهائي ومحضر استلام المفاتيح بعد تسديد الرصيد.', fr: 'Enregistrement du transfert de propriété définitif et remise des clés après solde.' },
    columns: [
      { ar: 'مرجع العقد النهائي', fr: 'Réf. acte final' },
      { ar: 'رقم المحافظة العقارية', fr: 'N° conservation foncière' },
      { ar: 'الموثق', fr: 'Notaire' },
      { ar: 'وضعية تصفية الرصيد', fr: 'Solde acquitté' },
      { ar: 'محضر تسليم المفاتيح', fr: 'PV remise des clés' },
      { ar: 'الحالة', fr: 'Statut' },
    ],
    disabledActions: [{ ar: 'تسجيل عقد نهائي (مخطط)', fr: 'Enregistrer acte final (Planifié)' }],
  },
  {
    id: 'contract-details',
    label: { ar: 'تفاصيل العقد والتنازلات والشركاء', fr: 'Détails, cessions & co-acquéreurs' },
    state: 'PLANNED' as const,
    description: { ar: 'بيانات الأطراف المتعاقدة، طلبات التنازل للغير وتوزيع الحصص بين الشركاء في الاقتناء.', fr: 'Détails des parties au contrat, cessions de droits et répartition des quotes-parts co-acquéreurs.' },
    columns: [
      { ar: 'رقم الطلب', fr: 'Réf. demande' },
      { ar: 'العقد الأصلي', fr: 'Contrat source' },
      { ar: 'نوع العملية (تنازل / حصص)', fr: 'Type (Cession / Quotes-parts)' },
      { ar: 'المتنازل', fr: 'Cédant' },
      { ar: 'المتنازل له / الشركاء', fr: 'Cessionnaire / Co-acquéreurs' },
      { ar: 'قرار الموافقة التوثيقية', fr: 'Approbation' },
    ],
    disabledActions: [{ ar: 'إيداع طلب تنازل أو تعديل حصص (مخطط)', fr: 'Initier cession ou avenant parts (Planifié)' }],
  },
  {
    id: 'versions-amendments',
    label: { ar: 'الإصدارات والملاحق المحفوظة', fr: 'Versions & avenants immuables' },
    state: 'PLANNED' as const,
    description: { ar: 'أثر تاريخي غير قابل للتعديل لكل نسخة عقد أو ملحق مع بصمة الوثيقة المودعة.', fr: 'Historique immuable de chaque version et avenant avec empreinte K-Min.' },
    columns: [
      { ar: 'رقم الإصدار', fr: 'N° version' },
      { ar: 'العقد', fr: 'Contrat' },
      { ar: 'سبب التعديل', fr: 'Motif de révision' },
      { ar: 'بصمة الوثيقة (K-Min)', fr: 'Empreinte K-Min' },
      { ar: 'المحرر', fr: 'Auteur' },
      { ar: 'تاريخ الإقفال', fr: 'Date de gel' },
    ],
    disabledActions: [{ ar: 'تجميد نسخة جديدة (مخطط)', fr: 'Consigner version immuable (Planifié)' }],
  },
  {
    id: 'related-documents',
    label: { ar: 'وثائق العقد المرتبطة (K-Min)', fr: 'Documents liés au contrat (K-Min)' },
    state: 'PLANNED' as const,
    description: { ar: 'ربط النسخ الممسوحة والمصدقة والشهادات التوثيقية بملفات K-Min دون تكرار التخزين.', fr: 'Rattachement des actes numérisés et attestations notariales vers le socle K-Min.' },
    columns: [
      { ar: 'تصنيف الوثيقة', fr: 'Catégorie' },
      { ar: 'العقد المرتبط', fr: 'Contrat lié' },
      { ar: 'اسم الملف (K-Min)', fr: 'Fichier (K-Min)' },
      { ar: 'البصمة SHA-256', fr: 'Empreinte SHA-256' },
      { ar: 'تاريخ الإيداع', fr: 'Date de dépôt' },
    ],
    disabledActions: [{ ar: 'ربط وثيقة K-Min بالعقد (مخطط)', fr: 'Lier document K-Min au contrat (Planifié)' }],
  },
] as const;

export const contractsApi = {
  listContracts: (_projectId: string): Promise<never> =>
    createPlannedEndpointRejection('GET /api/projects/:projectId/contracts', 'F-Contracts'),
};
