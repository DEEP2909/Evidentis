// EvidentIS India Shared Domain Package
// Canonical product constants, types, and catalogs for the India platform.

// ============================================================
// LANGUAGE SUPPORT
// ============================================================

export const PRIMARY_LANGUAGE_CODES = ['en', 'hi', 'bn', 'ta', 'te', 'kn', 'ml', 'mr', 'gu'] as const;
export const SECONDARY_LANGUAGE_CODES = ['pa', 'or', 'as', 'ur'] as const;
export const EXTENDED_LANGUAGE_CODES = ['sa', 'sd', 'ks', 'ne', 'mai', 'kok', 'doi', 'sat', 'mni', 'brx'] as const;
export const SUPPORTED_LANGUAGE_CODES = [
  ...PRIMARY_LANGUAGE_CODES,
  ...SECONDARY_LANGUAGE_CODES,
  ...EXTENDED_LANGUAGE_CODES,
] as const;

export type PrimaryLanguageCode = typeof PRIMARY_LANGUAGE_CODES[number];
export type SecondaryLanguageCode = typeof SECONDARY_LANGUAGE_CODES[number];
export type ExtendedLanguageCode = typeof EXTENDED_LANGUAGE_CODES[number];
export type SupportedLanguageCode = typeof SUPPORTED_LANGUAGE_CODES[number];

export const RTL_LANGUAGES = ['ur', 'ks', 'sd'] as const;

export interface SupportedLanguage {
  code: SupportedLanguageCode;
  label: string;
  nativeLabel: string;
  tier: 'primary' | 'secondary' | 'extended';
  rtl: boolean;
  scripts: readonly string[];
}

export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', tier: 'primary', rtl: false, scripts: ['Latin'] },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', tier: 'primary', rtl: false, scripts: ['Devanagari'] },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', tier: 'primary', rtl: false, scripts: ['Bengali'] },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', tier: 'primary', rtl: false, scripts: ['Tamil'] },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', tier: 'primary', rtl: false, scripts: ['Telugu'] },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', tier: 'primary', rtl: false, scripts: ['Kannada'] },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം', tier: 'primary', rtl: false, scripts: ['Malayalam'] },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', tier: 'primary', rtl: false, scripts: ['Devanagari'] },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', tier: 'primary', rtl: false, scripts: ['Gujarati'] },
  { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ', tier: 'secondary', rtl: false, scripts: ['Gurmukhi'] },
  { code: 'or', label: 'Odia', nativeLabel: 'ଓଡ଼ିଆ', tier: 'secondary', rtl: false, scripts: ['Odia'] },
  { code: 'as', label: 'Assamese', nativeLabel: 'অসমীয়া', tier: 'secondary', rtl: false, scripts: ['Bengali-Assamese'] },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو', tier: 'secondary', rtl: true, scripts: ['Nastaliq'] },
  { code: 'sa', label: 'Sanskrit', nativeLabel: 'संस्कृतम्', tier: 'extended', rtl: false, scripts: ['Devanagari'] },
  { code: 'sd', label: 'Sindhi', nativeLabel: 'سنڌي', tier: 'extended', rtl: true, scripts: ['Perso-Arabic', 'Devanagari'] },
  { code: 'ks', label: 'Kashmiri', nativeLabel: 'کٲشُر', tier: 'extended', rtl: true, scripts: ['Perso-Arabic', 'Devanagari'] },
  { code: 'ne', label: 'Nepali', nativeLabel: 'नेपाली', tier: 'extended', rtl: false, scripts: ['Devanagari'] },
  { code: 'mai', label: 'Maithili', nativeLabel: 'मैथिली', tier: 'extended', rtl: false, scripts: ['Devanagari'] },
  { code: 'kok', label: 'Konkani', nativeLabel: 'कोंकणी', tier: 'extended', rtl: false, scripts: ['Devanagari', 'Roman'] },
  { code: 'doi', label: 'Dogri', nativeLabel: 'डोगरी', tier: 'extended', rtl: false, scripts: ['Devanagari'] },
  { code: 'sat', label: 'Santali', nativeLabel: 'ᱥᱟᱱᱛᱟᱲᱤ', tier: 'extended', rtl: false, scripts: ['Ol Chiki', 'Devanagari'] },
  { code: 'mni', label: 'Manipuri', nativeLabel: 'ꯃꯤꯇꯩꯂꯣꯟ', tier: 'extended', rtl: false, scripts: ['Meitei Mayek', 'Bengali'] },
  { code: 'brx', label: 'Bodo', nativeLabel: 'बड़ो', tier: 'extended', rtl: false, scripts: ['Devanagari'] },
] as const;

export const LANGUAGE_LABELS: Record<SupportedLanguageCode, string> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((language) => [language.code, language.nativeLabel])
) as Record<SupportedLanguageCode, string>;

// ============================================================
// INDIAN STATES, UTS, AND COURTS
// ============================================================

export const INDIAN_STATE_CODES = [
  'AP',
  'AR',
  'AS',
  'BR',
  'CT',
  'GA',
  'GJ',
  'HR',
  'HP',
  'JH',
  'KA',
  'KL',
  'MP',
  'MH',
  'MN',
  'ML',
  'MZ',
  'NL',
  'OD',
  'PB',
  'RJ',
  'SK',
  'TN',
  'TG',
  'TR',
  'UP',
  'UK',
  'WB',
  'DL',
  'JK',
  'LA',
  'CH',
  'PY',
  'AN',
  'DH',
  'LD',
] as const;

export type IndianStateCode = typeof INDIAN_STATE_CODES[number];

export const INDIAN_STATE_NAMES: Record<IndianStateCode, string> = {
  AP: 'Andhra Pradesh',
  AR: 'Arunachal Pradesh',
  AS: 'Assam',
  BR: 'Bihar',
  CT: 'Chhattisgarh',
  GA: 'Goa',
  GJ: 'Gujarat',
  HR: 'Haryana',
  HP: 'Himachal Pradesh',
  JH: 'Jharkhand',
  KA: 'Karnataka',
  KL: 'Kerala',
  MP: 'Madhya Pradesh',
  MH: 'Maharashtra',
  MN: 'Manipur',
  ML: 'Meghalaya',
  MZ: 'Mizoram',
  NL: 'Nagaland',
  OD: 'Odisha',
  PB: 'Punjab',
  RJ: 'Rajasthan',
  SK: 'Sikkim',
  TN: 'Tamil Nadu',
  TG: 'Telangana',
  TR: 'Tripura',
  UP: 'Uttar Pradesh',
  UK: 'Uttarakhand',
  WB: 'West Bengal',
  DL: 'Delhi (NCT)',
  JK: 'Jammu & Kashmir (UT)',
  LA: 'Ladakh (UT)',
  CH: 'Chandigarh (UT)',
  PY: 'Puducherry (UT)',
  AN: 'Andaman & Nicobar (UT)',
  DH: 'Dadra & Nagar Haveli and Daman & Diu (UT)',
  LD: 'Lakshadweep (UT)',
};

export const INDIAN_STATES_AND_UTS = Object.values(INDIAN_STATE_NAMES);

export const INDIAN_JURISDICTIONS = INDIAN_STATE_CODES;
export const INDIAN_JURISDICTION_NAMES = INDIAN_STATE_NAMES;

// Backward-compatible aliases while downstream modules migrate.
export const US_STATES = INDIAN_JURISDICTIONS;
export type USState = IndianStateCode;
export const US_STATE_NAMES = INDIAN_JURISDICTION_NAMES;

export type CourtLevel =
  | 'supreme_court'
  | 'high_court'
  | 'district_court'
  | 'sessions_court'
  | 'civil_court'
  | 'criminal_court'
  | 'tribunal'
  | 'consumer_forum'
  | 'lok_adalat'
  | 'arbitration_centre'
  | 'mediation_centre';

export const COURT_HIERARCHY: readonly CourtLevel[] = [
  'supreme_court',
  'high_court',
  'district_court',
  'sessions_court',
  'civil_court',
  'criminal_court',
  'tribunal',
  'consumer_forum',
  'lok_adalat',
  'arbitration_centre',
  'mediation_centre',
] as const;

export const INDIAN_HIGH_COURTS: Record<IndianStateCode, string> = {
  AP: 'High Court of Andhra Pradesh',
  AR: 'Gauhati High Court',
  AS: 'Gauhati High Court',
  BR: 'Patna High Court',
  CT: 'High Court of Chhattisgarh',
  GA: 'Bombay High Court at Goa',
  GJ: 'High Court of Gujarat',
  HR: 'Punjab and Haryana High Court',
  HP: 'High Court of Himachal Pradesh',
  JH: 'High Court of Jharkhand',
  KA: 'High Court of Karnataka',
  KL: 'High Court of Kerala',
  MP: 'High Court of Madhya Pradesh',
  MH: 'Bombay High Court',
  MN: 'High Court of Manipur',
  ML: 'High Court of Meghalaya',
  MZ: 'Gauhati High Court',
  NL: 'Gauhati High Court',
  OD: 'High Court of Orissa',
  PB: 'Punjab and Haryana High Court',
  RJ: 'Rajasthan High Court',
  SK: 'High Court of Sikkim',
  TN: 'High Court of Madras',
  TG: 'High Court for the State of Telangana',
  TR: 'High Court of Tripura',
  UP: 'High Court of Judicature at Allahabad',
  UK: 'High Court of Uttarakhand',
  WB: 'Calcutta High Court',
  DL: 'Delhi High Court',
  JK: 'High Court of Jammu & Kashmir and Ladakh',
  LA: 'High Court of Jammu & Kashmir and Ladakh',
  CH: 'Punjab and Haryana High Court',
  PY: 'High Court of Madras',
  AN: 'Calcutta High Court',
  DH: 'Bombay High Court',
  LD: 'High Court of Kerala',
};

// ============================================================
// PRODUCT AND BILLING CONSTANTS
// ============================================================

export const PLANS = ['starter', 'growth', 'professional', 'enterprise', 'custom'] as const;
export type Plan = typeof PLANS[number];

export const INDIA_PLAN_CATALOG = {
  starter: {
    name: 'Starter',
    priceInPaise: 499900,
    gstRatePercent: 18,
    maxAdvocates: 3,
    maxMattersPerMonth: 25,
    maxDocumentsPerMonth: 100,
    maxResearchQueriesPerMonth: 200,
    aiTier: 'opensource',
    languages: ['en', 'hi'] as const,
    support: 'email',
  },
  growth: {
    name: 'Growth',
    priceInPaise: 1499900,
    gstRatePercent: 18,
    maxAdvocates: 15,
    maxMattersPerMonth: 100,
    maxDocumentsPerMonth: 500,
    maxResearchQueriesPerMonth: 1000,
    aiTier: 'hybrid',
    languages: PRIMARY_LANGUAGE_CODES,
    support: 'priority',
  },
  professional: {
    name: 'Professional',
    priceInPaise: 1499900,
    gstRatePercent: 18,
    maxAdvocates: 15,
    maxMattersPerMonth: 100,
    maxDocumentsPerMonth: 500,
    maxResearchQueriesPerMonth: 1000,
    aiTier: 'hybrid',
    languages: PRIMARY_LANGUAGE_CODES,
    support: 'priority',
  },
  enterprise: {
    name: 'Enterprise',
    priceInPaise: 3999900,
    gstRatePercent: 18,
    maxAdvocates: 50,
    maxMattersPerMonth: null,
    maxDocumentsPerMonth: null,
    maxResearchQueriesPerMonth: null,
    aiTier: 'premium_api',
    languages: SUPPORTED_LANGUAGE_CODES,
    support: 'dedicated',
  },
  custom: {
    name: 'Custom',
    priceInPaise: null,
    gstRatePercent: 18,
    maxAdvocates: null,
    maxMattersPerMonth: null,
    maxDocumentsPerMonth: null,
    maxResearchQueriesPerMonth: null,
    aiTier: 'premium_api',
    languages: SUPPORTED_LANGUAGE_CODES,
    support: 'dedicated',
  },
} as const;

export const SUBSCRIPTION_STATUSES = ['trial', 'active', 'past_due', 'cancelled', 'paused'] as const;
export type SubscriptionStatus = typeof SUBSCRIPTION_STATUSES[number];

export const CURRENCIES = ['INR'] as const;
export type Currency = typeof CURRENCIES[number];

// ============================================================
// USER, MATTER, AND DOCUMENT ENUMS
// ============================================================

export const ADVOCATE_ROLES = [
  'admin',
  'senior_advocate',
  'junior_advocate',
  'paralegal',
  'client',
  'attorney',
  'partner',
] as const;
export type AdvocateRole = typeof ADVOCATE_ROLES[number];

export const ATTORNEY_ROLES = ADVOCATE_ROLES;
export type AttorneyRole = AdvocateRole;

export const ATTORNEY_STATUSES = ['active', 'suspended', 'pending_invite'] as const;
export type AttorneyStatus = typeof ATTORNEY_STATUSES[number];

export const MATTER_TYPES = [
  'litigation',
  'criminal_defense',
  'civil_dispute',
  'commercial_contract',
  'corporate_advisory',
  'real_estate',
  'labour_employment',
  'family_law',
  'tax_gst',
  'insolvency',
  'consumer_dispute',
  'constitutional',
  'arbitration',
  'regulatory_compliance',
  'ma_transaction',
  'ip',
  'employment',
  'regulatory',
] as const;
export type MatterType = typeof MATTER_TYPES[number];

export const MATTER_STATUSES = ['open', 'under_review', 'closed', 'archived'] as const;
export type MatterStatus = typeof MATTER_STATUSES[number];

export const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type Priority = typeof PRIORITIES[number];

export const DOC_TYPES = [
  'contract',
  'amendment',
  'nda',
  'vakalatnama',
  'affidavit',
  'legal_notice',
  'reply_notice',
  'power_of_attorney',
  'employment_agreement',
  'rental_agreement',
  'consumer_complaint',
  'rera_complaint',
  'petition',
  'written_statement',
  'evidence_bundle',
  'case_filing',
  'other',
] as const;
export type DocType = typeof DOC_TYPES[number];

export const INGESTION_STATUSES = ['uploaded', 'scanning', 'processing', 'normalized', 'failed'] as const;
export type IngestionStatus = typeof INGESTION_STATUSES[number];

export const SECURITY_STATUSES = ['pending', 'clean', 'infected', 'quarantined'] as const;
export type SecurityStatus = typeof SECURITY_STATUSES[number];

export const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
export type RiskLevel = typeof RISK_LEVELS[number];

export const REVIEW_STATUSES = ['pending', 'approved', 'rejected', 'modified'] as const;
export type ReviewStatus = typeof REVIEW_STATUSES[number];

export const FLAG_TYPES = [
  'playbook_deviation',
  'missing_clause',
  'contradiction',
  'regulatory',
  'dpdp',
  'stamp_duty',
  'limitation',
  'gst',
  'court_deadline',
] as const;
export type FlagType = typeof FLAG_TYPES[number];

export const FLAG_SEVERITIES = ['info', 'warn', 'critical'] as const;
export type FlagSeverity = typeof FLAG_SEVERITIES[number];

export const FLAG_STATUSES = ['open', 'resolved', 'approved', 'rejected', 'waived'] as const;
export type FlagStatus = typeof FLAG_STATUSES[number];

export const PRACTICE_AREAS = [
  'litigation',
  'corporate',
  'commercial',
  'tax',
  'real_estate',
  'labour',
  'criminal',
  'family',
  'regulatory',
  'constitutional',
] as const;
export type PracticeArea = typeof PRACTICE_AREAS[number];

export const OBLIGATION_TYPES = [
  'payment_deadline',
  'notice_period',
  'regulatory_filing',
  'renewal_date',
  'condition_precedent',
  'deliverable',
  'court_hearing',
  'limitation_deadline',
  'client_follow_up',
  'gst_payment',
] as const;
export type ObligationType = typeof OBLIGATION_TYPES[number];

export const OBLIGATION_STATUSES = ['active', 'completed', 'waived', 'overdue'] as const;
export type ObligationStatus = typeof OBLIGATION_STATUSES[number];

export const JOB_TYPES = [
  'document.scan',
  'document.ingest',
  'clause.extract',
  'risk.assess',
  'obligation.extract',
  'obligation.remind',
  'research.query',
  'bare_act.sync',
  'ecourts.sync',
  'indiakanoon.sync',
  'notification.dispatch',
] as const;
export type JobType = typeof JOB_TYPES[number];

export const JOB_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const;
export type JobStatus = typeof JOB_STATUSES[number];

export const AI_TASK_TYPES = [
  'ocr',
  'embed',
  'extract',
  'risk',
  'research',
  'suggest',
  'obligation',
  'translation',
  'bare_act_explain',
] as const;
export type AITaskType = typeof AI_TASK_TYPES[number];

export const SSO_PROVIDER_TYPES = ['oidc', 'saml'] as const;
export type SSOProviderType = typeof SSO_PROVIDER_TYPES[number];

export const CLAUSE_TYPES = [
  'indemnity',
  'limitation_of_liability',
  'termination_for_convenience',
  'termination_for_cause',
  'governing_law',
  'jurisdiction',
  'arbitration',
  'mediation',
  'assignment',
  'confidentiality_nda',
  'ip_ownership',
  'ip_license',
  'representations_warranties',
  'force_majeure',
  'payment_terms',
  'gst_tax',
  'stamp_duty',
  'dpdp_privacy',
  'anti_corruption',
  'insurance',
  'notice_provisions',
  'entire_agreement',
  'compliance_with_laws',
  'labour_code_compliance',
  'rera_compliance',
  'consumer_protection',
] as const;
export type ClauseType = typeof CLAUSE_TYPES[number];

export const CLAUSE_TYPE_LABELS: Record<ClauseType, string> = {
  indemnity: 'Indemnity',
  limitation_of_liability: 'Limitation of Liability',
  termination_for_convenience: 'Termination for Convenience',
  termination_for_cause: 'Termination for Cause',
  governing_law: 'Governing Law',
  jurisdiction: 'Jurisdiction',
  arbitration: 'Arbitration',
  mediation: 'Mediation',
  assignment: 'Assignment',
  confidentiality_nda: 'Confidentiality / NDA',
  ip_ownership: 'IP Ownership',
  ip_license: 'IP License',
  representations_warranties: 'Representations and Warranties',
  force_majeure: 'Force Majeure',
  payment_terms: 'Payment Terms',
  gst_tax: 'GST and Tax',
  stamp_duty: 'Stamp Duty',
  dpdp_privacy: 'DPDP and Privacy',
  anti_corruption: 'Anti-Corruption',
  insurance: 'Insurance',
  notice_provisions: 'Notice Provisions',
  entire_agreement: 'Entire Agreement',
  compliance_with_laws: 'Compliance with Laws',
  labour_code_compliance: 'Labour Code Compliance',
  rera_compliance: 'RERA Compliance',
  consumer_protection: 'Consumer Protection',
};

// ============================================================
// INDIA LEGAL CATALOGS
// ============================================================

export interface LegalActReference {
  slug: string;
  title: string;
  shortTitle: string;
  year: number;
  category:
    | 'criminal'
    | 'civil'
    | 'corporate'
    | 'labour'
    | 'property'
    | 'family'
    | 'constitutional'
    | 'state';
  supersedes?: string;
}

export const CORE_INDIAN_ACTS: readonly LegalActReference[] = [
  { slug: 'constitution-of-india', title: 'Constitution of India', shortTitle: 'Constitution', year: 1950, category: 'constitutional' },
  { slug: 'bharatiya-nyaya-sanhita', title: 'Bharatiya Nyaya Sanhita', shortTitle: 'BNS', year: 2023, category: 'criminal', supersedes: 'indian-penal-code' },
  { slug: 'bharatiya-nagarik-suraksha-sanhita', title: 'Bharatiya Nagarik Suraksha Sanhita', shortTitle: 'BNSS', year: 2023, category: 'criminal', supersedes: 'code-of-criminal-procedure' },
  { slug: 'bharatiya-sakshya-adhiniyam', title: 'Bharatiya Sakshya Adhiniyam', shortTitle: 'BSA', year: 2023, category: 'criminal', supersedes: 'indian-evidence-act' },
  { slug: 'indian-penal-code', title: 'Indian Penal Code', shortTitle: 'IPC', year: 1860, category: 'criminal' },
  { slug: 'code-of-criminal-procedure', title: 'Code of Criminal Procedure', shortTitle: 'CrPC', year: 1973, category: 'criminal' },
  { slug: 'indian-evidence-act', title: 'Indian Evidence Act', shortTitle: 'Evidence Act', year: 1872, category: 'criminal' },
  { slug: 'pocso-act', title: 'Protection of Children from Sexual Offences Act', shortTitle: 'POCSO', year: 2012, category: 'criminal' },
  { slug: 'ndps-act', title: 'Narcotic Drugs and Psychotropic Substances Act', shortTitle: 'NDPS', year: 1985, category: 'criminal' },
  { slug: 'information-technology-act', title: 'Information Technology Act', shortTitle: 'IT Act', year: 2000, category: 'criminal' },
  { slug: 'code-of-civil-procedure', title: 'Code of Civil Procedure', shortTitle: 'CPC', year: 1908, category: 'civil' },
  { slug: 'indian-contract-act', title: 'Indian Contract Act', shortTitle: 'Contract Act', year: 1872, category: 'civil' },
  { slug: 'specific-relief-act', title: 'Specific Relief Act', shortTitle: 'Specific Relief Act', year: 1963, category: 'civil' },
  { slug: 'transfer-of-property-act', title: 'Transfer of Property Act', shortTitle: 'TPA', year: 1882, category: 'property' },
  { slug: 'limitation-act', title: 'Limitation Act', shortTitle: 'Limitation Act', year: 1963, category: 'civil' },
  { slug: 'registration-act', title: 'Registration Act', shortTitle: 'Registration Act', year: 1908, category: 'property' },
  { slug: 'companies-act', title: 'Companies Act', shortTitle: 'Companies Act', year: 2013, category: 'corporate' },
  { slug: 'insolvency-and-bankruptcy-code', title: 'Insolvency and Bankruptcy Code', shortTitle: 'IBC', year: 2016, category: 'corporate' },
  { slug: 'sebi-act', title: 'Securities and Exchange Board of India Act', shortTitle: 'SEBI Act', year: 1992, category: 'corporate' },
  { slug: 'competition-act', title: 'Competition Act', shortTitle: 'Competition Act', year: 2002, category: 'corporate' },
  { slug: 'fema', title: 'Foreign Exchange Management Act', shortTitle: 'FEMA', year: 1999, category: 'corporate' },
  { slug: 'cgst-act', title: 'Central Goods and Services Tax Act', shortTitle: 'CGST', year: 2017, category: 'corporate' },
  { slug: 'igst-act', title: 'Integrated Goods and Services Tax Act', shortTitle: 'IGST', year: 2017, category: 'corporate' },
  { slug: 'income-tax-act', title: 'Income Tax Act', shortTitle: 'Income Tax Act', year: 1961, category: 'corporate' },
  { slug: 'arbitration-and-conciliation-act', title: 'Arbitration and Conciliation Act', shortTitle: 'Arbitration Act', year: 1996, category: 'corporate' },
  { slug: 'industrial-disputes-act', title: 'Industrial Disputes Act', shortTitle: 'Industrial Disputes Act', year: 1947, category: 'labour' },
  { slug: 'employees-provident-fund-act', title: 'Employees Provident Fund and Miscellaneous Provisions Act', shortTitle: 'EPF Act', year: 1952, category: 'labour' },
  { slug: 'payment-of-gratuity-act', title: 'Payment of Gratuity Act', shortTitle: 'Gratuity Act', year: 1972, category: 'labour' },
  { slug: 'maternity-benefit-act', title: 'Maternity Benefit Act', shortTitle: 'Maternity Benefit Act', year: 1961, category: 'labour' },
  { slug: 'rera', title: 'Real Estate (Regulation and Development) Act', shortTitle: 'RERA', year: 2016, category: 'property' },
  { slug: 'indian-stamp-act', title: 'Indian Stamp Act', shortTitle: 'Stamp Act', year: 1899, category: 'property' },
  { slug: 'hindu-marriage-act', title: 'Hindu Marriage Act', shortTitle: 'Hindu Marriage Act', year: 1955, category: 'family' },
  { slug: 'hindu-succession-act', title: 'Hindu Succession Act', shortTitle: 'Hindu Succession Act', year: 1956, category: 'family' },
  { slug: 'muslim-personal-law-act', title: 'Muslim Personal Law (Shariat) Application Act', shortTitle: 'Muslim Personal Law Act', year: 1937, category: 'family' },
  { slug: 'special-marriage-act', title: 'Special Marriage Act', shortTitle: 'Special Marriage Act', year: 1954, category: 'family' },
  { slug: 'guardians-and-wards-act', title: 'Guardians and Wards Act', shortTitle: 'Guardians and Wards Act', year: 1890, category: 'family' },
  { slug: 'domestic-violence-act', title: 'Protection of Women from Domestic Violence Act', shortTitle: 'Domestic Violence Act', year: 2005, category: 'family' },
  { slug: 'maintenance-and-welfare-of-parents-act', title: 'Maintenance and Welfare of Parents and Senior Citizens Act', shortTitle: 'Senior Citizens Act', year: 2007, category: 'family' },
  { slug: 'rti-act', title: 'Right to Information Act', shortTitle: 'RTI Act', year: 2005, category: 'constitutional' },
  { slug: 'human-rights-act', title: 'Protection of Human Rights Act', shortTitle: 'Human Rights Act', year: 1993, category: 'constitutional' },
] as const;

export interface LegalTemplateReference {
  id: string;
  name: string;
  category: string;
  applicableActs: readonly string[];
  minimumLanguages: readonly SupportedLanguageCode[];
}

export const LEGAL_TEMPLATE_LIBRARY: readonly LegalTemplateReference[] = [
  { id: 'nda', name: 'Non-Disclosure Agreement', category: 'commercial', applicableActs: ['indian-contract-act'], minimumLanguages: ['en', 'hi'] },
  { id: 'mou', name: 'Memorandum of Understanding', category: 'commercial', applicableActs: ['indian-contract-act'], minimumLanguages: ['en', 'hi'] },
  { id: 'general-poa', name: 'General Power of Attorney', category: 'property', applicableActs: ['powers-of-attorney-act', 'registration-act'], minimumLanguages: ['en', 'hi'] },
  { id: 'specific-poa', name: 'Specific Power of Attorney', category: 'property', applicableActs: ['powers-of-attorney-act', 'registration-act'], minimumLanguages: ['en', 'hi'] },
  { id: 'vakalatnama', name: 'Vakalatnama', category: 'litigation', applicableActs: ['advocates-act'], minimumLanguages: ['en', 'hi'] },
  { id: 'affidavit', name: 'Affidavit', category: 'litigation', applicableActs: ['bharatiya-sakshya-adhiniyam'], minimumLanguages: ['en', 'hi'] },
  { id: 'section-80-notice', name: 'Legal Notice under Section 80 CPC', category: 'litigation', applicableActs: ['code-of-civil-procedure'], minimumLanguages: ['en', 'hi'] },
  { id: 'rental-agreement', name: 'Rental Agreement', category: 'property', applicableActs: ['transfer-of-property-act', 'indian-stamp-act'], minimumLanguages: ['en', 'hi'] },
  { id: 'employment-agreement', name: 'Employment Agreement', category: 'labour', applicableActs: ['industrial-disputes-act'], minimumLanguages: ['en', 'hi'] },
  { id: 'consumer-complaint', name: 'Consumer Forum Complaint', category: 'consumer', applicableActs: ['consumer-protection-act'], minimumLanguages: ['en', 'hi'] },
  { id: 'rera-complaint', name: 'RERA Complaint', category: 'property', applicableActs: ['rera'], minimumLanguages: ['en', 'hi'] },
] as const;

// ============================================================
// SECURITY AND PLATFORM DEFAULTS
// ============================================================

export const PASSWORD_RULES = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/tiff',
] as const;
export type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number];

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
export const MAX_BATCH_SIZE_BYTES = 200 * 1024 * 1024;

export const RATE_LIMITS = {
  auth: { requests: 10, windowMinutes: 15 },
  otp: { requests: 6, windowMinutes: 15 },
  upload: { requests: 20, windowMinutes: 60 },
  research: { requests: 120, windowMinutes: 60 },
  ecourts: { requests: 240, windowMinutes: 60 },
  general: { requests: 1000, windowMinutes: 60 },
} as const;

// ============================================================
// CORE INTERFACES
// ============================================================

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  region: string;
  barCouncilState: IndianStateCode | null;
  barState: IndianStateCode | null;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date | null;
  razorpayCustomerId: string | null;
  paddleCustomerId?: string | null;
  logoUrl: string | null;
  settings: Record<string, unknown>;
  gstin: string | null;
  preferredLanguage: SupportedLanguageCode;
  currency: Currency;
  dpdpConsentGivenAt: Date | null;
  dpdpConsentIp: string | null;
  createdAt: Date;
}

export interface Advocate {
  id: string;
  tenantId: string;
  email: string;
  displayName: string;
  role: AdvocateRole;
  practiceGroup: string | null;
  barCouncilEnrollmentNumber: string | null;
  barNumber: string | null;
  barCouncilState: IndianStateCode | null;
  barState: IndianStateCode | null;
  bciEnrollmentNumber: string | null;
  phoneNumber: string | null;
  mfaEnabled: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  preferredLanguage: SupportedLanguageCode;
  status: AttorneyStatus;
  createdAt: Date;
}

export type Attorney = Advocate;

export interface Matter {
  id: string;
  tenantId: string;
  matterCode: string;
  matterName: string;
  matterType: MatterType;
  clientName: string;
  counterpartyName: string | null;
  governingLawState: IndianStateCode | null;
  status: MatterStatus;
  priority: Priority;
  healthScore: number;
  leadAdvocateId: string | null;
  leadAttorneyId: string | null;
  targetCloseDate: Date | null;
  valueInPaise: number | null;
  dealValueCents?: number | null;
  notes: string | null;
  tags: string[];
  courtName: string | null;
  caseType: string | null;
  cnrNumber: string | null;
  clientPhone: string | null;
  clientPreferredLanguage: SupportedLanguageCode | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  tenantId: string;
  matterId: string;
  sourceName: string;
  mimeType: string;
  docType: DocType;
  ingestionStatus: IngestionStatus;
  securityStatus: SecurityStatus;
  fileUri: string | null;
  sha256: string;
  normalizedText: string | null;
  pageCount: number | null;
  wordCount: number | null;
  ocrEngine: string | null;
  ocrConfidence: number | null;
  privilegeScore: number;
  language: SupportedLanguageCode;
  extractionModel: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentChunk {
  id: string;
  tenantId: string;
  documentId: string;
  chunkIndex: number;
  textContent: string;
  pageFrom: number | null;
  pageTo: number | null;
  embedding: number[] | null;
  modelVersion: string;
  createdAt: Date;
}

export interface RiskFactor {
  factor: string;
  severity: RiskLevel;
  description: string;
}

export interface Clause {
  id: string;
  tenantId: string;
  documentId: string;
  clauseType: ClauseType | string;
  heading: string | null;
  textExcerpt: string;
  pageFrom: number | null;
  pageTo: number | null;
  riskLevel: RiskLevel;
  confidence: number;
  riskFactors: RiskFactor[];
  extractionModel: string | null;
  reviewerStatus: ReviewStatus;
  reviewerId: string | null;
  reviewedAt: Date | null;
  reviewerNote: string | null;
  createdAt: Date;
}

export interface Flag {
  id: string;
  tenantId: string;
  matterId: string;
  documentId: string | null;
  clauseId: string | null;
  flagType: FlagType | string;
  severity: FlagSeverity;
  reason: string;
  playbookRule: string | null;
  recommendedFix: string | null;
  status: FlagStatus;
  assignedTo: string | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  resolutionNote: string | null;
  assessmentModel: string | null;
  createdAt: Date;
}

export interface PlaybookRule {
  id: string;
  clauseType: ClauseType | string;
  condition: string;
  severity: FlagSeverity;
  description: string;
}

export interface Playbook {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  practiceArea: PracticeArea | null;
  rules: PlaybookRule[];
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
}

export interface Obligation {
  id: string;
  tenantId: string;
  matterId: string;
  documentId: string | null;
  clauseId: string | null;
  obligationType: ObligationType | string;
  party: string | null;
  description: string;
  deadlineDate: Date | null;
  deadlineText: string | null;
  noticeDays: number | null;
  recurrenceRule: string | null;
  status: ObligationStatus;
  assignedTo: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface ClauseSuggestion {
  id: string;
  tenantId: string;
  clauseId: string;
  flagId: string | null;
  suggestedText: string;
  rationale: string;
  riskLevelAfterFix: RiskLevel;
  modelName: string;
  status: 'pending' | 'accepted' | 'rejected';
  acceptedBy: string | null;
  acceptedAt: Date | null;
  createdAt: Date;
}

export interface BareAct {
  id: string;
  title: string;
  shortTitle: string;
  year: number;
  actNumber: string | null;
  jurisdiction: string;
  language: SupportedLanguageCode;
  isActive: boolean;
  replacedByActId: string | null;
  fullTextUrl: string | null;
}

export interface BareActSection {
  id: string;
  actId: string;
  sectionNumber: string;
  sectionTitle: string | null;
  sectionText: string;
  subsections: Record<string, unknown>[];
  crossReferences: string[];
  tags: string[];
  embedding: number[] | null;
}

export interface CaseCitation {
  id: string;
  tenantId: string;
  citationNumber: string;
  court: string;
  judgmentDate: Date | null;
  parties: Record<string, unknown>;
  actsCited: string[];
  sectionsCited: string[];
  summary: string;
  fullTextUrl: string | null;
  embedding: number[] | null;
  language: SupportedLanguageCode;
}

export interface SavedJudgment {
  id: string;
  tenantId: string;
  matterId: string | null;
  caseCitationId: string;
  notes: string | null;
  savedBy: string | null;
  createdAt: Date;
}

export interface CourtCase {
  id: string;
  tenantId: string;
  matterId: string | null;
  cnrNumber: string;
  courtName: string;
  courtComplex: string | null;
  caseType: string | null;
  filingDate: Date | null;
  currentStatus: string | null;
  nextHearingDate: Date | null;
  lastSyncedAt: Date | null;
}

export interface HearingDate {
  id: string;
  tenantId: string;
  courtCaseId: string;
  matterId: string | null;
  hearingDate: Date;
  purpose: string | null;
  result: string | null;
  nextDate: Date | null;
  advocateId: string | null;
  notes: string | null;
}

export interface LegalTemplate {
  id: string;
  name: string;
  category: string;
  jurisdiction: string;
  applicableActs: string[];
  language: SupportedLanguageCode;
  templateContent: string;
  variables: Record<string, unknown>;
  isActive: boolean;
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitAmountPaise: number;
  totalAmountPaise: number;
}

export interface GstBreakdown {
  id: string;
  invoiceId: string;
  sacCode: string;
  gstRatePercent: number;
  taxableAmountPaise: number;
  cgstAmountPaise: number;
  sgstAmountPaise: number;
  igstAmountPaise: number;
}

export interface Invoice {
  id: string;
  tenantId: string;
  matterId: string | null;
  clientName: string;
  clientGstin: string | null;
  firmGstin: string | null;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  subtotalPaise: number;
  gstRate: number;
  gstAmountPaise: number;
  totalPaise: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  razorpayPaymentId: string | null;
  createdBy: string | null;
}

export interface Notification {
  id: string;
  tenantId: string;
  advocateId: string | null;
  channel: 'email' | 'sms' | 'whatsapp' | 'in_app';
  type: 'hearing_reminder' | 'deadline' | 'payment' | 'cause_list' | 'privacy';
  content: string;
  language: SupportedLanguageCode;
  sentAt: Date | null;
  status: 'pending' | 'sent' | 'failed' | 'read';
}

export interface PrivacyRequest {
  id: string;
  tenantId: string;
  advocateId: string | null;
  requestType: 'information' | 'correction' | 'erasure' | 'grievance' | 'nomination';
  status: 'open' | 'processing' | 'completed' | 'rejected';
  details: string | null;
  createdAt: Date;
}

export interface Citation {
  documentId: string;
  documentName: string;
  pageFrom: number;
  pageTo: number;
  excerpt: string;
  relevanceScore: number;
}

export interface ResearchHistory {
  id: string;
  tenantId: string;
  matterId: string | null;
  attorneyId: string | null;
  question: string;
  answer: string;
  citations: Citation[];
  modelVersion: string | null;
  tokensUsed: number | null;
  responseTimeMs: number | null;
  createdAt: Date;
}

export interface AuditEvent {
  id: string;
  tenantId: string;
  actorAttorneyId: string | null;
  actorApiKeyId: string | null;
  eventType: string;
  objectType: string | null;
  objectId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface WorkflowJob {
  id: string;
  tenantId: string | null;
  jobType: JobType;
  status: JobStatus;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  attempts: number;
  maxAttempts: number;
  errorMessage: string | null;
  lockedBy: string | null;
  lockedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

// ============================================================
// API TYPES
// ============================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface LoginRequest {
  email?: string;
  phoneNumber?: string;
  password?: string;
  otp?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  mfaRequired?: boolean;
  mfaSessionToken?: string;
  advocate: Advocate;
  attorney?: Advocate;
}

export interface MatterCreateRequest {
  matterCode: string;
  matterName: string;
  matterType: MatterType;
  clientName: string;
  counterpartyName?: string;
  governingLawState?: IndianStateCode;
  priority?: Priority;
  leadAdvocateId?: string;
  leadAttorneyId?: string;
  targetCloseDate?: string;
  valueInPaise?: number;
  notes?: string;
  tags?: string[];
  courtName?: string;
  caseType?: string;
  cnrNumber?: string;
  clientPhone?: string;
  clientPreferredLanguage?: SupportedLanguageCode;
}

export interface DocumentUploadResponse {
  id: string;
  sourceName: string;
  ingestionStatus: IngestionStatus;
  securityStatus: SecurityStatus;
}

export interface ResearchQueryRequest {
  question: string;
  matterId?: string;
  maxResults?: number;
  language?: SupportedLanguageCode;
}

export interface ResearchQueryResponse {
  id: string;
  answer: string;
  citations: Citation[];
  tokensUsed: number;
  responseTimeMs: number;
}

// ============================================================
// WEBSOCKET EVENTS
// ============================================================

export interface WSDocumentStatusEvent {
  type: 'document.status';
  documentId: string;
  status: IngestionStatus;
  tenantId: string;
}

export interface WSFlagCreatedEvent {
  type: 'flag.created';
  matterId: string;
  flagId: string;
  severity: FlagSeverity;
  tenantId: string;
}

export interface WSResearchCompleteEvent {
  type: 'research.complete';
  queryId: string;
  answer: string;
  citations: Citation[];
  tenantId: string;
}

export interface WSHearingReminderEvent {
  type: 'hearing.reminder';
  courtCaseId: string;
  hearingDate: string;
  tenantId: string;
}

export type WSEvent =
  | WSDocumentStatusEvent
  | WSFlagCreatedEvent
  | WSResearchCompleteEvent
  | WSHearingReminderEvent;
