import type {
  AppLanguage,
  CreateEmployeeRequest,
  CreateProjectRequest,
  InitializeInstallationRequest,
  LoginRequest,
} from '../types/erp';

export type ValidationErrors = Record<string, string>;

export function checkPasswordStrength(password: string): {
  valid: boolean;
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasDigit: boolean;
} {
  const minLength = password.length >= 10;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  return {
    valid: minLength && hasUpper && hasLower && hasDigit,
    minLength,
    hasUpper,
    hasLower,
    hasDigit,
  };
}

export function validateSetupRequest(
  req: InitializeInstallationRequest,
  confirmPassword: string,
  lang: AppLanguage
): ValidationErrors {
  const errors: ValidationErrors = {};
  const t = (ar: string, fr: string) => (lang === 'ar' ? ar : fr);

  if (!req.legalName.trim()) {
    errors.legalName = t('الاسم القانوني للمؤسسة مطلوب.', 'La raison sociale est obligatoire.');
  }
  if (!req.legalForm.trim()) {
    errors.legalForm = t('الشكل القانوني مطلوب.', 'La forme juridique est obligatoire.');
  }
  if (!/^([0][1-9]|[1-4]\d|5[0-8])$/.test(req.wilayaCode.trim())) {
    errors.wilayaCode = t('يرجى اختيار ولاية جزائرية صالحة (01 إلى 58).', 'Veuillez sélectionner une wilaya valide (01 à 58).');
  }
  if (!req.address.trim()) {
    errors.address = t('عنوان المقر الاجتماعي مطلوب.', 'L\'adresse du siège social est obligatoire.');
  }
  if (req.shareCapitalDzd !== undefined && req.shareCapitalDzd !== null && req.shareCapitalDzd < 0) {
    errors.shareCapitalDzd = t('رأس المال لا يمكن أن يكون سالباً.', 'Le capital social ne peut pas être négatif.');
  }
  if (req.nif && !/^\d{15,20}$/.test(req.nif.trim())) {
    errors.nif = t('رقم التعريف الجبائي (NIF) يجب أن يتكون من 15 إلى 20 رقماً.', 'Le NIF doit contenir entre 15 et 20 chiffres.');
  }
  if (!req.adminUsername.trim() || req.adminUsername.trim().length < 3) {
    errors.adminUsername = t('اسم مستخدم مدير النظام يجب أن لا يقل عن 3 أحرف.', 'L\'identifiant administrateur doit contenir au moins 3 caractères.');
  }
  if (!req.adminFullName.trim()) {
    errors.adminFullName = t('الاسم الكامل لمدير النظام مطلوب.', 'Le nom complet de l\'administrateur est obligatoire.');
  }
  if (!req.adminEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.adminEmail.trim())) {
    errors.adminEmail = t('يرجى إدخال بريد إلكتروني صحيح.', 'Veuillez saisir une adresse e-mail valide.');
  }
  const strength = checkPasswordStrength(req.adminPassword);
  if (!strength.valid) {
    errors.adminPassword = t(
      'كلمة المرور يجب أن تحتوي على 10 أحرف على الأقل، وحرف كبير وصغير ورقم.',
      'Le mot de passe doit contenir au moins 10 caractères, une majuscule, une minuscule et un chiffre.'
    );
  }
  if (req.adminPassword !== confirmPassword) {
    errors.confirmPassword = t('تأكيد كلمة المرور غير مطابق.', 'La confirmation du mot de passe ne correspond pas.');
  }

  return errors;
}

export function validateLoginRequest(req: LoginRequest, lang: AppLanguage): ValidationErrors {
  const errors: ValidationErrors = {};
  const t = (ar: string, fr: string) => (lang === 'ar' ? ar : fr);

  if (!req.usernameOrEmail.trim()) {
    errors.usernameOrEmail = t('يرجى إدخال اسم المستخدم أو البريد الإلكتروني.', 'Veuillez saisir votre identifiant ou e-mail.');
  }
  if (!req.password) {
    errors.password = t('يرجى إدخال كلمة المرور.', 'Veuillez saisir votre mot de passe.');
  }
  return errors;
}

export function validateCreateEmployee(req: CreateEmployeeRequest, lang: AppLanguage): ValidationErrors {
  const errors: ValidationErrors = {};
  const t = (ar: string, fr: string) => (lang === 'ar' ? ar : fr);

  if (!req.username.trim() || req.username.trim().length < 3) {
    errors.username = t('اسم المستخدم يجب أن يكون 3 أحرف على الأقل.', 'L\'identifiant doit contenir au moins 3 caractères.');
  }
  if (!req.fullName.trim()) {
    errors.fullName = t('الاسم الكامل للموظف مطلوب.', 'Le nom complet est obligatoire.');
  }
  if (!req.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.email.trim())) {
    errors.email = t('البريد الإلكتروني غير صالح.', 'Adresse e-mail invalide.');
  }
  if (!checkPasswordStrength(req.password).valid) {
    errors.password = t(
      'كلمة المرور يجب أن تحتوي على 10 أحرف على الأقل مع حرف كبير وصغير ورقم.',
      'Le mot de passe exige au moins 10 caractères, une majuscule, une minuscule et un chiffre.'
    );
  }
  if (req.roleCodes.length === 0) {
    errors.roleCodes = t('يجب اختيار دور وظيفي واحد على الأقل.', 'Veuillez attribuer au moins un rôle.');
  }
  if (req.roleCodes.includes('SYSTEM_ADMIN')) {
    errors.roleCodes = t('لا يمكن إنشاء أكثر من مدير نظام واحد.', 'Un seul compte Administrateur Système est autorisé.');
  }
  return errors;
}

export function validateCreateProject(req: CreateProjectRequest, lang: AppLanguage): ValidationErrors {
  const errors: ValidationErrors = {};
  const t = (ar: string, fr: string) => (lang === 'ar' ? ar : fr);

  if (!req.code.trim()) {
    errors.code = t('رمز المشروع مطلوب.', 'Le code projet est obligatoire.');
  }
  if (!req.nameAr.trim() && !req.nameFr.trim()) {
    errors.nameAr = t('اسم المشروع بالعربية أو الفرنسية مطلوب.', 'Le nom du projet (AR ou FR) est obligatoire.');
  }
  if (!/^([0][1-9]|[1-4]\d|5[0-8])$/.test(req.wilayaCode.trim())) {
    errors.wilayaCode = t('يرجى اختيار ولاية جزائرية صالحة (01 إلى 58).', 'Veuillez sélectionner une wilaya valide (01 à 58).');
  }
  if (!req.municipality.trim()) {
    errors.municipality = t('اسم البلدية مطلوب.', 'La commune est obligatoire.');
  }
  if (req.estimatedBudgetDzd < 0) {
    errors.estimatedBudgetDzd = t('الميزانية التقديرية لا يمكن أن تكون سالبة.', 'Le budget estimatif ne peut pas être négatif.');
  }
  return errors;
}
