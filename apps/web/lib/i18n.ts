'use client';

import { RTL_LANGUAGES, SUPPORTED_LANGUAGE_CODES } from '@evidentis/shared';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ============================================================================
// MASTER translation dictionary — ALL 100+ keys for every UI surface
// ============================================================================

const en = {
  // Brand
  brand: 'EvidentIS',
  tagline: 'Evidence-Based Intelligent Decision System',

  // Navigation (sidebar)
  nav_dashboard: 'Dashboard',
  nav_matters: 'Matters',
  nav_documents: 'Documents',
  nav_research: 'Research',
  nav_nyayAssist: 'Nyay Assist',
  nav_bareActs: 'Bare Acts',
  nav_templates: 'Templates',
  nav_calendar: 'Calendar',
  nav_analytics: 'Analytics',
  nav_billing: 'Billing',
  nav_privacy: 'Privacy',
  nav_admin: 'Admin Panel',

  // Legacy nav keys (backward compat — used by pages that call t("dashboard") etc.)
  dashboard: 'Dashboard',
  research: 'Research',
  bareActs: 'Bare Acts',
  templates: 'Templates',
  calendar: 'Calendar',
  billing: 'Billing',
  assistant: 'Nyay Assist',
  privacy: 'Privacy',

  // Landing / marketing
  launchIndia: 'Built for Indian advocates, law firms, and legal teams.',
  launchDetail: 'Multilingual legal workflows, Indian law research, and court-aware operations in one secure SaaS.',
  openPlatform: 'Open Platform',
  exploreWorkspace: 'Explore Workspace',

  // Shared UI
  disclaimer: 'AI assistance, not legal advice. Advocate review required.',
  loading: 'Loading…',
  redirecting: 'Redirecting…',
  send: 'Send',
  cancel: 'Cancel',
  close: 'Close',
  save: 'Save',
  delete: 'Delete',
  edit: 'Edit',
  view: 'View',
  download: 'Download',
  upload: 'Upload',
  search: 'Search',
  filter: 'Filters',
  accept: 'Accept',
  reject: 'Reject',
  submit: 'Submit',
  back: 'Back',
  next: 'Next',
  upgrade: 'Upgrade',
  logout: 'Logout',
  login: 'Login',
  register: 'Register',
  helpful: 'Helpful?',
  feedbackRecorded: 'Feedback recorded',
  whatWasWrong: 'What was wrong?',
  workspace: 'Workspace',

  // Dashboard
  dash_firmCommand: 'Firm Command Centre',
  dash_myPractice: 'My Practice Dashboard',
  dash_myWorkspace: 'My Workspace',
  dash_paralegalWorkspace: 'Paralegal Workspace',
  dash_teamActivity: 'Team Activity',
  dash_subscription: 'Subscription',
  dash_systemAlerts: 'System Alerts',
  dash_upcomingHearings: 'Upcoming Hearings',
  dash_portfolioHealth: 'Portfolio Health',
  dash_aiResearch: 'AI Research',
  dash_assignedMatters: 'My Assigned Matters',
  dash_assignedDesc: 'Matters assigned to you will appear here with hearing timelines and document statuses.',
  dash_openMatters: 'Open matters',
  dash_quickResearch: 'Quick Research',
  dash_todayTasks: "Today's Tasks",
  dash_todayTasksDesc: 'Task queue includes filing reminders, document uploads, and hearing calendar updates.',
  dash_loadingWorkspace: 'Loading workspace…',

  // Onboarding
  onboard_title: 'Get Started with EvidentIS',
  onboard_subtitle: 'Complete these steps to activate your workspace',
  onboard_inviteAdvocate: 'Invite your first advocate',
  onboard_uploadContract: 'Upload a contract',
  onboard_runAnalysis: 'Run your first AI analysis',

  // Documents
  doc_title: 'Document Intelligence Workspace',
  doc_subtitle: 'Manage uploads, AI extraction progress, and clause insights.',
  doc_uploadDocuments: 'Upload Documents',
  doc_dragDrop: 'Drag and drop files to upload',
  doc_dropHere: 'Drop files here',
  doc_fileTypes: 'Supports PDF, DOCX, DOC • Max 50MB per file',
  doc_searchDocs: 'Search documents…',
  doc_emptyTitle: 'Upload your first contract',
  doc_emptyNoMatch: 'No documents match your search',
  doc_emptyDesc: 'Drag and drop a PDF or DOCX above to start AI-powered clause extraction and risk analysis.',
  doc_emptyNoMatchDesc: 'Try a different search term or clear the filter.',
  doc_processed: 'processed',
  doc_processing: 'processing',
  doc_failed: 'failed',
  doc_document: 'Document',
  doc_matter: 'Matter',
  doc_status: 'Status',
  doc_analysis: 'Analysis',
  doc_uploaded: 'Uploaded',
  doc_actions: 'Actions',

  // Matters
  mat_title: 'Matter Management',
  mat_subtitle: 'Manage matters across courts and tribunals',
  mat_indiaOps: 'India Legal Operations',
  mat_createMatter: 'New Matter',
  mat_noMatters: 'No matters yet',
  mat_noMattersDesc: 'Create your first matter to get started.',
  mat_searchMatters: 'Search matters…',
  mat_matterDetail: 'Matter Details',

  // Matters detail tabs
  mat_tab_documents: 'Documents',
  mat_tab_clauses: 'Clauses',
  mat_tab_flags: 'Flags',
  mat_tab_obligations: 'Obligations',
  mat_tab_research: 'Research',
  mat_tab_timeline: 'Timeline',
  mat_tab_analytics: 'Analytics',

  // Research
  res_title: 'Research',
  res_subtitle: 'IndiaKanoon + Bare Acts + Matter Memory',
  res_headline: 'Research with Indian sections, judgments, and multilingual answers.',
  res_placeholder: 'Ask a legal research question…',
  res_runResearch: 'Run Research',
  res_thinking: 'Thinking…',
  res_analyzing: 'Analyzing sources',
  res_startTitle: 'Start Your Research',
  res_startDesc: 'Ask any legal question above. Nyay Assist will search Indian statutes, case law, and your matter documents to provide comprehensive answers.',
  res_sourceCitations: 'Source citations',
  res_relatedActs: 'Related acts',
  res_query: 'Query',

  // NyayAssist
  nyay_suggestedPrompts: 'Suggested prompts',
  nyay_greeting: 'Namaste. I can help with Indian legal research, clause drafting, and case-law references. Ask in your preferred language.',
  nyay_placeholder: 'Ask in any Indian language…',
  nyay_aiPowered: 'AI-Powered',
  nyay_attachmentSupport: 'Attachment support enabled for pleadings and evidence bundles',
  nyay_uploadingAttachments: 'Uploading attachment(s)…',

  // Calendar
  cal_title: 'Obligation Calendar',
  cal_subtitle: 'Track hearings, deadlines, and compliance dates.',

  // Billing
  bill_title: 'Billing & Subscription',
  bill_currentPlan: 'Current Plan',
  bill_managePlan: 'Manage Plan',

  // Templates
  tpl_title: 'Clause Templates',

  // Bare Acts
  bact_title: 'Indian Bare Acts',

  // Privacy
  priv_title: 'Privacy & DPDP',

  // Trial banner
  trial_endsIn: 'Trial ends in {{days}} day(s)',
  trial_upgradeNow: 'Upgrade now to keep your workspace running',

  // Flags
  flag_critical: 'Critical',
  flag_warning: 'Warning',
  flag_info: 'Info',
  flag_noFlags: 'No flags generated yet.',
  flag_showLower: 'Show {{count}} lower-priority flag(s)',
  flag_hideLower: 'Hide lower-priority flags',

  // Obligations
  obl_noObligations: 'No obligations extracted yet.',

  // Analytics
  analytics_title: 'Analytics',

  // AI Feedback
  ai_thumbsUp: 'Mark as helpful',
  ai_thumbsDown: 'Mark as unhelpful',
  ai_feedbackPlaceholder: 'Tell us what went wrong…',

  // Upgrade
  upgrade_title: 'Upgrade Your Plan',
  upgrade_desc: 'You have reached your usage limit. Upgrade to continue using AI features.',
  upgrade_cta: 'Upgrade Now',

  // Auth
  auth_loginTitle: 'Welcome back',
  auth_loginSubtitle: 'Sign in to your EvidentIS workspace',
  auth_registerTitle: 'Create your account',
  auth_registerSubtitle: 'Get started with EvidentIS',
  auth_forgotPassword: 'Forgot password?',
  auth_rememberMe: 'Remember me',
  auth_noAccount: "Don't have an account?",
  auth_hasAccount: 'Already have an account?',
  auth_email: 'Email',
  auth_password: 'Password',
  auth_confirmPassword: 'Confirm password',
  auth_fullName: 'Full name',

  // Shell chrome
  shell_subtitle: 'Legal Intelligence',
  shell_nyayAssistFab: 'Nyay Assist',

  // Auth flow states
  auth_signingIn: 'Signing in…',
  auth_stepCredentials: 'Credentials',
  auth_stepMFA: 'MFA',
  auth_stepAccess: 'Access',

  // Trust badges
  trust_dpdp: 'DPDP Compliant',
  trust_mfa: 'MFA Protected',
  trust_dataResidency: 'India Data Residency',

  // Auth misc
  auth_contactAdmin: 'Contact your administrator',

  // Trial CTA
  trial_upgradeCta: 'Upgrade →',

  // Login hero panel
  auth_heroTitle1: 'India-Ready Legal',
  auth_heroTitle2: 'Intelligence Platform',
  auth_heroSubtitle: 'Run multilingual legal operations with AI workflows across all Indian states and UTs.',
  auth_statLanguages: 'Languages',
  auth_statJurisdictions: 'Jurisdictions',
  auth_statAligned: 'Aligned',

  // Landing Page Features & Marquee
  landing_heroEyebrow: 'India-First Legal AI',
  landing_heroTitle1: 'Intelligent ',
  landing_heroTitle2: 'Decision',
  landing_heroTitle3: 'System',
  landing_heroSubtitle: 'EvidentIS represents a paradigm shift for Indian legal tech. Built symmetrically with the latest DPDP standards and equipped with a 36-jurisdiction neural corpus.',
  landing_ctaTrial: 'Start Free Trial',
  landing_ctaOpen: 'Open Platform',
  landing_ctaStakeholder: 'Register as a Stakeholder',
  landing_feature1Title: '{{count}}-Language UX',
  landing_feature1Desc: 'Deep integrations with BNS/BNSS translations in regional dialects.',
  landing_feature2Title: 'India Legal Corpus',
  landing_feature2Desc: 'Real-time updates to Bare acts, case-law, and eCourts matters.',
  landing_feature3Title: 'Court Operations',
  landing_feature3Desc: 'Algorithmic hearing alerts and Tribunal-aware limitation limits.',
  landing_feature4Title: 'DPDP Ready',
  landing_feature4Desc: 'India-localized data default, transparent audit and sovereign encryption.',
  landing_opFramework: 'Operational Framework',
  landing_trustedAcross: 'Trusted Across',
  landing_trialBadge: '30 Days Free — No card required',
  landing_navPlatform: 'Platform',
  landing_navWorkflows: 'Workflows',
  landing_navPricing: 'Pricing',
  landing_navSecurity: 'Security',
  landing_heroTitleMake: 'Make your legal product feel like an',
  landing_pricingOverview: 'Pricing overview',
  landing_pricingTitle: 'Choose a legal operating tier that matches your current team size and workflow depth.',
  landing_talkToSales: 'Talk to sales',
  landing_startConversation: 'Start conversation',
  landing_readyTitle: 'Ready to see the product in motion?',
  landing_readyHeading: 'Launch a trial workspace, explore the product story, or open the stakeholder portal immediately.',

  // Billing details
  bill_usageTitle: 'Usage & Collections',
  bill_documentUsage: 'Document usage',
  bill_researchUsage: 'Research usage',
  bill_teamSeats: 'Team seats',
  bill_invoicesTitle: 'Invoice History',
  bill_invoice: 'Invoice',
  bill_date: 'Date',
  bill_amount: 'Amount',

  // Admin
  admin_tab_team: 'Team Members',
  admin_tab_security: 'Security',
  admin_tab_billing: 'Billing',
  admin_tab_sso: 'SSO / SCIM',
  admin_tab_playbooks: 'Playbooks',
  admin_tab_webhooks: 'Webhooks',
  admin_teamMembers: 'Team Members',
  admin_inviteTeam: 'Invite Team Member',
  admin_role: 'Role',
  admin_sendInvite: 'Send Invite',
  admin_member: 'Member',
  admin_lastLogin: 'Last login',
  admin_securityTitle: 'Security Settings',
  admin_mfaPolicy: 'Multi-factor authentication',
  admin_sessionPolicies: 'Session policies',
  admin_sessionTimeout: 'Session timeout (minutes)',
  admin_maxFailedLogins: 'Max failed login attempts',
  admin_ssoTitle: 'Single Sign-On & SCIM',
  admin_samlConfig: 'SAML 2.0 Configuration',
  admin_currentSso: 'Current identity setup',
  admin_playbooksTitle: 'Playbooks',
  admin_createPlaybook: 'Create Playbook',
  admin_webhooksTitle: 'Webhooks',
  admin_addWebhook: 'Add Webhook',
  admin_endpoint: 'Endpoint',
  admin_events: 'Events',

  // Templates Add
  tpl_addTemplate: 'Create Template',
  tpl_addTemplateDesc: 'Design a new generative clause template.',
  tpl_categoryAll: 'all',
  tpl_langsCount: '{{count}} langs',
  tpl_features: 'Jurisdiction-aware clauses, multilingual drafts, and filing guidance available.',

  // Document Upload
  doc_uploadLimit: 'PDF, DOCX, DOC • Max 50MB per file',
};

// ============================================================================
// FULL TRANSLATIONS — All 13 Indian languages
// ============================================================================

const hi: typeof en = {
  ...en,
  tagline: 'प्रमाण-आधारित बुद्धिमान निर्णय प्रणाली',
  nav_dashboard: 'डैशबोर्ड', nav_matters: 'मामले', nav_documents: 'दस्तावेज़', nav_research: 'अनुसंधान',
  nav_nyayAssist: 'न्याय असिस्ट', nav_bareActs: 'बेयर एक्ट्स', nav_templates: 'टेम्पलेट्स',
  nav_calendar: 'कैलेंडर', nav_analytics: 'विश्लेषण', nav_billing: 'बिलिंग',
  nav_privacy: 'गोपनीयता', nav_admin: 'व्यवस्थापक',
  dashboard: 'डैशबोर्ड', research: 'अनुसंधान', bareActs: 'बेयर एक्ट्स', templates: 'टेम्पलेट्स',
  calendar: 'कैलेंडर', billing: 'बिलिंग', assistant: 'न्याय असिस्ट', privacy: 'गोपनीयता',
  launchIndia: 'भारतीय अधिवक्ताओं, विधि फर्मों और कानूनी टीमों के लिए बनाया गया।',
  launchDetail: 'बहुभाषी विधिक कार्यप्रवाह, भारतीय कानून शोध और न्यायालय-आधारित संचालन एक सुरक्षित SaaS में।',
  openPlatform: 'प्लेटफ़ॉर्म खोलें', exploreWorkspace: 'वर्कस्पेस देखें',
  disclaimer: 'यह एआई सहायता है, कानूनी सलाह नहीं। अधिवक्ता समीक्षा आवश्यक है।',
  loading: 'लोड हो रहा है…', send: 'भेजें', cancel: 'रद्द करें', close: 'बंद करें',
  save: 'सहेजें', delete: 'हटाएँ', edit: 'संपादित करें', view: 'देखें', download: 'डाउनलोड',
  upload: 'अपलोड', search: 'खोजें', filter: 'फ़िल्टर', accept: 'स्वीकार करें', reject: 'अस्वीकार करें',
  submit: 'जमा करें', back: 'वापस', next: 'अगला', upgrade: 'अपग्रेड', logout: 'लॉगआउट',
  login: 'लॉगिन', register: 'पंजीकरण', workspace: 'कार्यक्षेत्र',
  helpful: 'सहायक?', feedbackRecorded: 'प्रतिक्रिया दर्ज', whatWasWrong: 'क्या गलत था?',
  dash_firmCommand: 'फर्म कमांड सेंटर', dash_myPractice: 'मेरा प्रैक्टिस डैशबोर्ड',
  dash_myWorkspace: 'मेरा वर्कस्पेस', dash_paralegalWorkspace: 'पैरालीगल वर्कस्पेस',
  dash_teamActivity: 'टीम गतिविधि', dash_subscription: 'सदस्यता',
  dash_systemAlerts: 'सिस्टम अलर्ट', dash_upcomingHearings: 'आगामी सुनवाई',
  dash_portfolioHealth: 'पोर्टफोलियो स्वास्थ्य', dash_aiResearch: 'एआई अनुसंधान',
  dash_assignedMatters: 'मेरे सौंपे गए मामले',
  dash_assignedDesc: 'आपको सौंपे गए मामले यहाँ सुनवाई समयरेखा और दस्तावेज़ स्थितियों के साथ दिखाई देंगे।',
  dash_openMatters: 'मामले खोलें', dash_quickResearch: 'त्वरित अनुसंधान',
  dash_todayTasks: 'आज के कार्य',
  dash_todayTasksDesc: 'कार्य कतार में दाखिल अनुस्मारक, दस्तावेज़ अपलोड और सुनवाई कैलेंडर अपडेट शामिल हैं।',
  dash_loadingWorkspace: 'वर्कस्पेस लोड हो रहा है…',
  onboard_title: 'EvidentIS के साथ शुरू करें', onboard_subtitle: 'अपना वर्कस्पेस सक्रिय करने के लिए इन चरणों को पूरा करें',
  onboard_inviteAdvocate: 'अपने पहले अधिवक्ता को आमंत्रित करें', onboard_uploadContract: 'एक अनुबंध अपलोड करें', onboard_runAnalysis: 'अपना पहला एआई विश्लेषण चलाएं',
  doc_title: 'दस्तावेज़ बुद्धिमता कार्यक्षेत्र', doc_subtitle: 'अपलोड, एआई निष्कर्षण प्रगति, और खंड अंतर्दृष्टि प्रबंधित करें।',
  doc_uploadDocuments: 'दस्तावेज़ अपलोड करें', doc_dragDrop: 'अपलोड करने के लिए फ़ाइलें खींचें और छोड़ें',
  doc_dropHere: 'यहाँ फ़ाइलें छोड़ें', doc_fileTypes: 'PDF, DOCX, DOC • प्रति फ़ाइल अधिकतम 50MB',
  doc_searchDocs: 'दस्तावेज़ खोजें…', doc_emptyTitle: 'अपना पहला अनुबंध अपलोड करें',
  doc_emptyNoMatch: 'कोई दस्तावेज़ आपकी खोज से मेल नहीं खाता',
  doc_emptyDesc: 'एआई-संचालित खंड निष्कर्षण शुरू करने के लिए ऊपर PDF या DOCX खींचें और छोड़ें।',
  doc_emptyNoMatchDesc: 'एक अलग खोज शब्द आज़माएं या फ़िल्टर साफ़ करें।',
  doc_processed: 'प्रसंस्कृत', doc_processing: 'प्रसंस्कृत हो रहा', doc_failed: 'विफल',
  doc_document: 'दस्तावेज़', doc_matter: 'मामला', doc_status: 'स्थिति', doc_analysis: 'विश्लेषण',
  doc_uploaded: 'अपलोड किया', doc_actions: 'कार्रवाइयाँ',
  mat_title: 'मामला प्रबंधन', mat_subtitle: 'न्यायालयों और अधिकरणों में मामलों का प्रबंधन करें', mat_indiaOps: 'भारत कानूनी संचालन',
  mat_createMatter: 'नया मामला', mat_noMatters: 'अभी तक कोई मामले नहीं', mat_noMattersDesc: 'शुरू करने के लिए अपना पहला मामला बनाएं।',
  mat_searchMatters: 'मामले खोजें…', mat_matterDetail: 'मामला विवरण',
  mat_tab_documents: 'दस्तावेज़', mat_tab_clauses: 'खंड', mat_tab_flags: 'चिह्न',
  mat_tab_obligations: 'दायित्व', mat_tab_research: 'अनुसंधान', mat_tab_timeline: 'समयरेखा', mat_tab_analytics: 'विश्लेषण',
  res_title: 'अनुसंधान', res_subtitle: 'IndiaKanoon + बेयर एक्ट्स + मामला स्मृति',
  res_headline: 'भारतीय धाराओं, निर्णयों और बहुभाषी उत्तरों के साथ अनुसंधान करें।',
  res_placeholder: 'एक कानूनी अनुसंधान प्रश्न पूछें…', res_runResearch: 'अनुसंधान चलाएं',
  res_thinking: 'सोच रहा है…', res_analyzing: 'स्रोतों का विश्लेषण',
  res_startTitle: 'अपना अनुसंधान शुरू करें', res_query: 'प्रश्न',
  res_startDesc: 'ऊपर कोई भी कानूनी प्रश्न पूछें। न्याय असिस्ट भारतीय कानून, केस लॉ और आपके मामले के दस्तावेज़ खोजेगा।',
  res_sourceCitations: 'स्रोत उद्धरण', res_relatedActs: 'संबंधित अधिनियम',
  nyay_suggestedPrompts: 'सुझावित प्रॉम्प्ट',
  nyay_greeting: 'नमस्ते। मैं भारतीय कानूनी अनुसंधान, खंड प्रारूपण और केस-लॉ संदर्भों में मदद कर सकता हूँ। अपनी पसंदीदा भाषा में पूछें।',
  nyay_placeholder: 'किसी भी भारतीय भाषा में पूछें…', nyay_aiPowered: 'एआई-संचालित',
  nyay_attachmentSupport: 'याचिकाओं और साक्ष्य बंडलों के लिए अटैचमेंट समर्थन सक्षम',
  nyay_uploadingAttachments: 'अटैचमेंट अपलोड हो रहा है…',
  cal_title: 'दायित्व कैलेंडर', cal_subtitle: 'सुनवाई, समय-सीमा और अनुपालन तिथियों को ट्रैक करें।',
  bill_title: 'बिलिंग और सदस्यता', bill_currentPlan: 'वर्तमान योजना', bill_managePlan: 'योजना प्रबंधित करें',
  tpl_title: 'खंड टेम्पलेट्स', bact_title: 'भारतीय बेयर एक्ट्स', priv_title: 'गोपनीयता और DPDP',
  trial_endsIn: 'ट्रायल {{days}} दिन में समाप्त होता है', trial_upgradeNow: 'अपना वर्कस्पेस चालू रखने के लिए अभी अपग्रेड करें',
  flag_critical: 'गंभीर', flag_warning: 'चेतावनी', flag_info: 'जानकारी', flag_noFlags: 'अभी तक कोई चिह्न नहीं बने।',
  flag_showLower: '{{count}} कम-प्राथमिकता चिह्न दिखाएं', flag_hideLower: 'कम-प्राथमिकता चिह्न छुपाएं',
  obl_noObligations: 'अभी तक कोई दायित्व निकाले नहीं गए।', analytics_title: 'विश्लेषण',
  ai_thumbsUp: 'सहायक चिह्नित करें', ai_thumbsDown: 'असहायक चिह्नित करें', ai_feedbackPlaceholder: 'बताएं क्या गलत हुआ…',
  upgrade_title: 'अपनी योजना अपग्रेड करें', upgrade_desc: 'आपकी उपयोग सीमा पूरी हो गई है। एआई सुविधाओं का उपयोग जारी रखने के लिए अपग्रेड करें।', upgrade_cta: 'अभी अपग्रेड करें',
  auth_loginTitle: 'वापस स्वागत है', auth_loginSubtitle: 'अपने EvidentIS वर्कस्पेस में साइन इन करें',
  auth_registerTitle: 'अपना खाता बनाएं', auth_registerSubtitle: 'EvidentIS के साथ शुरू करें',
  auth_forgotPassword: 'पासवर्ड भूल गए?', auth_rememberMe: 'मुझे याद रखें',
  auth_noAccount: 'खाता नहीं है?', auth_hasAccount: 'पहले से खाता है?',
  auth_email: 'ईमेल', auth_password: 'पासवर्ड', auth_confirmPassword: 'पासवर्ड की पुष्टि करें', auth_fullName: 'पूरा नाम',
  redirecting: 'पुनर्निर्देशित हो रहा है…',
  shell_subtitle: 'कानूनी बुद्धिमत्ता', shell_nyayAssistFab: 'न्याय असिस्ट',
  auth_signingIn: 'साइन इन हो रहा है…', auth_stepCredentials: 'प्रमाण-पत्र', auth_stepMFA: 'MFA', auth_stepAccess: 'पहुँच',
  trust_dpdp: 'DPDP अनुपालित', trust_mfa: 'MFA संरक्षित', trust_dataResidency: 'भारत डेटा रेसीडेंसी',
  auth_contactAdmin: 'अपने व्यवस्थापक से संपर्क करें', trial_upgradeCta: 'अपग्रेड →',
  auth_heroTitle1: 'भारत-तैयार कानूनी', auth_heroTitle2: 'बुद्धिमत्ता प्लेटफ़ॉर्म',
  auth_heroSubtitle: 'सभी भारतीय राज्यों और केंद्र शासित प्रदेशों में एआई कार्यप्रवाह के साथ बहुभाषी कानूनी संचालन चलाएं।',
  auth_statLanguages: 'भाषाएँ', auth_statJurisdictions: 'क्षेत्राधिकार', auth_statAligned: 'संरेखित',
  landing_heroEyebrow: 'भारत की पहली कानूनी एआई',
  landing_heroTitle1: 'बुद्धिमान ', landing_heroTitle2: 'निर्णय', landing_heroTitle3: 'प्रणाली',
  landing_heroSubtitle: 'EvidentIS भारतीय कानूनी तकनीक के लिए एक आदर्श बदलाव का प्रतिनिधित्व करता है। नवीनतम DPDP मानकों के साथ निर्मित और 36-क्षेत्राधिकार के तंत्रिका कोष से सुसज्जित।',
  landing_ctaTrial: 'नि:शुल्क परीक्षण शुरू करें', landing_ctaOpen: 'ओपन प्लेटफॉर्म', landing_ctaStakeholder: 'हितधारक के रूप में पंजीकरण करें',
  landing_feature1Title: '{{count}}-भाषा UX', landing_feature1Desc: 'क्षेत्रीय बोलियों में BNS/BNSS अनुवाद के साथ गहन एकीकरण।',
  landing_feature2Title: 'भारतीय कानूनी निकाय', landing_feature2Desc: 'बेयर एक्ट्स, केस-लॉ और ईकॉर्ट्स मामलों के वास्तविक समय के अपडेट।',
  landing_feature3Title: 'न्यायालय संचालन', landing_feature3Desc: 'एल्गोरिदमिक सुनवाई अलर्ट और ट्रिब्यूनल-वाकिफ़ परिसीमा सीमाएँ।',
  landing_feature4Title: 'DPDP तैयार', landing_feature4Desc: 'भारत-स्थानीय डेटा डिफ़ॉल्ट, पारदर्शी ऑडिट और संप्रभु एन्क्रिप्शन।',
  landing_opFramework: 'परिचालन ढांचा', landing_trustedAcross: 'वहां तक भरोंसा', landing_trialBadge: '30 दिन नि:शुल्क — कोई कार्ड आवश्यक नहीं',
  landing_navPlatform: 'प्लेटफ़ॉर्म', landing_navWorkflows: 'वर्कफ़्लो', landing_navPricing: 'मूल्य निर्धारण', landing_navSecurity: 'सुरक्षा',
  landing_heroTitleMake: 'अपने कानूनी उत्पाद को ऐसा महसूस कराएँ जैसे वह एक',
  landing_pricingOverview: 'मूल्य अवलोकन',
  landing_pricingTitle: 'ऐसा कानूनी संचालन स्तर चुनें जो आपकी मौजूदा टीम के आकार और कार्यप्रवाह की गहराई से मेल खाता हो।',
  landing_talkToSales: 'सेल्स से बात करें', landing_startConversation: 'बातचीत शुरू करें',
  landing_readyTitle: 'उत्पाद को क्रियाशील रूप में देखने के लिए तैयार हैं?',
  landing_readyHeading: 'ट्रायल वर्कस्पेस शुरू करें, उत्पाद कहानी देखें, या तुरंत हितधारक पोर्टल खोलें।',
  bill_usageTitle: 'उपयोग और संग्रह', bill_documentUsage: 'दस्तावेज़ उपयोग', bill_researchUsage: 'अनुसंधान उपयोग',
  bill_teamSeats: 'टीम सीटें', bill_invoicesTitle: 'चालान इतिहास', bill_invoice: 'चालान', bill_date: 'तारीख', bill_amount: 'राशि',
  admin_tab_team: 'टीम सदस्य', admin_tab_security: 'सुरक्षा', admin_tab_billing: 'बिलिंग', admin_tab_sso: 'एसएसओ / एससीआईएम',
  admin_tab_playbooks: 'प्लेबुक्स', admin_tab_webhooks: 'वेबहुक्स', admin_teamMembers: 'टीम सदस्य',
  admin_inviteTeam: 'टीम सदस्य आमंत्रित करें', admin_role: 'भूमिका', admin_sendInvite: 'आमंत्रण भेजें',
  admin_member: 'सदस्य', admin_lastLogin: 'अंतिम लॉगिन', admin_securityTitle: 'सुरक्षा सेटिंग्स',
  admin_mfaPolicy: 'मल्टी-फैक्टर प्रमाणीकरण', admin_sessionPolicies: 'सत्र नीतियाँ',
  admin_sessionTimeout: 'सत्र समयसीमा (मिनट)', admin_maxFailedLogins: 'अधिकतम विफल लॉगिन प्रयास',
  admin_ssoTitle: 'सिंगल साइन-ऑन और एससीआईएम', admin_samlConfig: 'SAML 2.0 विन्यास',
  admin_currentSso: 'वर्तमान पहचान सेटअप', admin_playbooksTitle: 'प्लेबुक्स',
  admin_createPlaybook: 'प्लेबुक बनाएं', admin_webhooksTitle: 'वेबहुक्स', admin_addWebhook: 'वेबहुक जोड़ें',
  admin_endpoint: 'एंडपॉइंट', admin_events: 'इवेंट्स',
  tpl_addTemplate: 'टेम्पलेट बनाएं', tpl_addTemplateDesc: 'एक नया जनरेटिव क्लॉज टेम्पलेट डिज़ाइन करें।',
  tpl_categoryAll: 'सभी', tpl_langsCount: '{{count}} भाषाएं', tpl_features: 'क्षेत्राधिकार-संवेदनशील खंड, बहुभाषी ड्राफ्ट, और फाइलिंग मार्गदर्शन।',
  doc_uploadLimit: 'PDF, DOCX, DOC • प्रति फ़ाइल अधिकतम 50MB',
};

const bn: typeof en = {
  ...en,
  tagline: 'প্রমাণভিত্তিক বুদ্ধিমান সিদ্ধান্ত ব্যবস্থা',
  nav_dashboard: 'ড্যাশবোর্ড', nav_matters: 'মামলা', nav_documents: 'নথি', nav_research: 'গবেষণা',
  nav_nyayAssist: 'ন্যায় অ্যাসিস্ট', nav_bareActs: 'বেয়ার অ্যাক্টস', nav_templates: 'টেমপ্লেট',
  nav_calendar: 'ক্যালেন্ডার', nav_analytics: 'বিশ্লেষণ', nav_billing: 'বিলিং',
  nav_privacy: 'গোপনীয়তা', nav_admin: 'অ্যাডমিন প্যানেল',
  dashboard: 'ড্যাশবোর্ড', research: 'গবেষণা', bareActs: 'বেয়ার অ্যাক্টস', templates: 'টেমপ্লেট',
  calendar: 'ক্যালেন্ডার', billing: 'বিলিং', assistant: 'ন্যায় অ্যাসিস্ট', privacy: 'গোপনীয়তা',
  launchIndia: 'ভারতীয় আইনজীবী, আইন সংস্থা ও লিগ্যাল টিমের জন্য নির্মিত।',
  launchDetail: 'বহুভাষিক আইনকর্মপ্রবাহ, ভারতীয় আইন গবেষণা এবং আদালত-সচেতন অপারেশন এক সুরক্ষিত SaaS-এ।',
  openPlatform: 'প্ল্যাটফর্ম খুলুন', exploreWorkspace: 'ওয়ার্কস্পেস দেখুন',
  disclaimer: 'এটি এআই সহায়তা, আইনি পরামর্শ নয়। আইনজীবীর পর্যালোচনা প্রয়োজন।',
  loading: 'লোড হচ্ছে…', send: 'পাঠান', cancel: 'বাতিল', close: 'বন্ধ', save: 'সংরক্ষণ', delete: 'মুছুন', search: 'অনুসন্ধান', logout: 'লগআউট', login: 'লগইন', register: 'নিবন্ধন', workspace: 'ওয়ার্কস্পেস',
  dash_firmCommand: 'ফার্ম কমান্ড সেন্টার', dash_myPractice: 'আমার প্র্যাক্টিস ড্যাশবোর্ড', dash_myWorkspace: 'আমার ওয়ার্কস্পেস', dash_paralegalWorkspace: 'প্যারালিগ্যাল ওয়ার্কস্পেস',
  dash_teamActivity: 'টিম কার্যকলাপ', dash_subscription: 'সাবস্ক্রিপশন', dash_systemAlerts: 'সিস্টেম সতর্কতা',
  dash_upcomingHearings: 'আসন্ন শুনানি', dash_portfolioHealth: 'পোর্টফোলিও স্বাস্থ্য', dash_aiResearch: 'এআই গবেষণা',
  dash_assignedMatters: 'আমার নির্ধারিত মামলা', dash_assignedDesc: 'আপনাকে নির্ধারিত মামলাগুলি এখানে শুনানির সময়রেখা এবং নথির স্থিতি সহ দেখা যাবে।',
  dash_openMatters: 'মামলা খুলুন', dash_quickResearch: 'দ্রুত গবেষণা', dash_todayTasks: 'আজকের কাজ',
  dash_todayTasksDesc: 'কাজের তালিকায় ফাইলিং রিমাইন্ডার, নথি আপলোড এবং শুনানি ক্যালেন্ডার আপডেট অন্তর্ভুক্ত।', dash_loadingWorkspace: 'ওয়ার্কস্পেস লোড হচ্ছে…',
  doc_title: 'নথি বুদ্ধিমত্তা কর্মক্ষেত্র', doc_subtitle: 'আপলোড, এআই নিষ্কাশন অগ্রগতি, এবং ধারা অন্তর্দৃষ্টি পরিচালনা করুন।',
  doc_uploadDocuments: 'নথি আপলোড করুন', doc_dragDrop: 'আপলোড করতে ফাইল টেনে আনুন', doc_dropHere: 'এখানে ফাইল ড্রপ করুন',
  doc_searchDocs: 'নথি খুঁজুন…', doc_emptyTitle: 'আপনার প্রথম চুক্তি আপলোড করুন', doc_emptyNoMatch: 'কোনো নথি আপনার অনুসন্ধানের সাথে মেলেনি',
  mat_title: 'মামলা ব্যবস্থাপনা', mat_subtitle: 'আদালত এবং ট্রাইব্যুনাল জুড়ে মামলা পরিচালনা করুন', mat_indiaOps: 'ভারত আইন কার্যক্রম',
  nyay_greeting: 'নমস্কার। আমি ভারতীয় আইন গবেষণা, ধারা খসড়া এবং কেস-লও রেফারেন্সে সাহায্য করতে পারি। আপনার পছন্দের ভাষায় জিজ্ঞাসা করুন।',
  nyay_placeholder: 'যেকোনো ভারতীয় ভাষায় জিজ্ঞাসা করুন…', nyay_suggestedPrompts: 'প্রস্তাবিত প্রম্পট',
  res_headline: 'ভারতীয় ধারা, রায় এবং বহুভাষিক উত্তর দিয়ে গবেষণা করুন।', res_placeholder: 'একটি আইনি গবেষণা প্রশ্ন জিজ্ঞাসা করুন…',
  res_startTitle: 'আপনার গবেষণা শুরু করুন', cal_title: 'বাধ্যবাধকতা ক্যালেন্ডার', bill_title: 'বিলিং এবং সাবস্ক্রিপশন',
  auth_loginTitle: 'আবার স্বাগতম', auth_registerTitle: 'আপনার অ্যাকাউন্ট তৈরি করুন',
  shell_subtitle: 'আইনি বুদ্ধিমত্তা', shell_nyayAssistFab: 'ন্যায় অ্যাসিস্ট',
  auth_signingIn: 'সাইন ইন হচ্ছে…', auth_stepCredentials: 'শংসাপত্র', auth_stepMFA: 'MFA', auth_stepAccess: 'অ্যাক্সেস',
  trust_dpdp: 'DPDP অনুবর্তী', trust_mfa: 'MFA সুরক্ষিত', trust_dataResidency: 'ভারত ডেটা রেসিডেন্সি',
  auth_contactAdmin: 'আপনার প্রশাসকের সাথে যোগাযোগ করুন', trial_upgradeCta: 'আপগ্রেড →',
  auth_heroTitle1: 'ভারত-প্রস্তুত আইনি', auth_heroTitle2: 'বুদ্ধিমত্তা প্ল্যাটফর্ম',
  auth_heroSubtitle: 'সমস্ত ভারতীয় রাজ্য ও কেন্দ্রশাসিত অঞ্চল জুড়ে এআই ওয়ার্কফ্লোর মাধ্যমে বহুভাষিক আইনি কার্যক্রম পরিচালনা করুন।',
  auth_statLanguages: 'ভাষা', auth_statJurisdictions: 'এখতিয়ার', auth_statAligned: 'সামঞ্জস্যপূর্ণ',
  landing_heroEyebrow: 'ভারতের প্রথম লিগ্যাল এআই',
  landing_heroTitle1: 'বুদ্ধিমান ', landing_heroTitle2: 'সিদ্ধান্ত', landing_heroTitle3: 'ব্যবস্থা',
  landing_heroSubtitle: 'EvidentIS ভারতীয় আইনি প্রযুক্তির জন্য একটি নতুন দৃষ্টান্ত। সর্বশেষ DPDP মান অনুযায়ী তৈরি এবং 36-এখতিয়ার নিউরাল কর্পাস দিয়ে সজ্জিত।',
  landing_ctaTrial: 'বিনামূল্যে ট্রায়াল শুরু করুন', landing_ctaOpen: 'ওপেন প্ল্যাটফর্ম', landing_ctaStakeholder: 'স্টেকহোল্ডার হিসেবে নিবন্ধন করুন',
  landing_feature1Title: '{{count}}-ভাষার UX', landing_feature1Desc: 'আঞ্চলিক উপভাষায় BNS/BNSS অনুবাদের সাথে গভীর একীকরণ।',
  landing_feature2Title: 'ভারতীয় আইনি কর্পাস', landing_feature2Desc: 'বেয়ার অ্যাক্টস, কেস-ল এবং ই-কোর্ট মামলার রিয়েল-টাইম আপডেট।',
  landing_feature3Title: 'আদালতের কার্যক্রম', landing_feature3Desc: 'অ্যালগরিদমিক শুনানির সতর্কতা এবং ট্রাইব্যুনাল-সচেতন সময়সীমা।',
  landing_feature4Title: 'DPDP প্রস্তুত', landing_feature4Desc: 'ভারত-স্থানীয় ডেটা, স্বচ্ছ অডিট এবং সার্বভৌম এনক্রিপশন।',
  landing_opFramework: 'অপারেশনাল ফ্রেমওয়ার্ক', landing_trustedAcross: 'বিশ্বস্ত সর্বত্র', landing_trialBadge: '30 দিন বিনামূল্যে — কোনো কার্ডের প্রয়োজন নেই',
  tpl_addTemplate: 'টেমপ্লেট তৈরি করুন', tpl_addTemplateDesc: 'একটি নতুন জেনারেটিভ ক্লজ টেমপ্লেট ডিজাইন করুন।',
  tpl_categoryAll: 'সমস্ত', tpl_langsCount: '{{count}} ভাষা', tpl_features: 'এখতিয়ার-সচেতন ক্লজ, বহুভাষিক খসড়া এবং ফাইলিং নির্দেশিকা উপলব্ধ।',
  doc_uploadLimit: 'PDF, DOCX, DOC • ফাইল প্রতি সর্বোচ্চ 50MB',
};

const ta: typeof en = {
  ...en,
  tagline: 'சான்று சார்ந்த நுண்ணறிவு தீர்மான அமைப்பு',
  nav_dashboard: 'டாஷ்போர்டு', nav_matters: 'வழக்குகள்', nav_documents: 'ஆவணங்கள்', nav_research: 'ஆராய்ச்சி',
  nav_nyayAssist: 'நியாய் அசிஸ்ட்', nav_bareActs: 'சட்ட நூல்கள்', nav_templates: 'வார்ப்புருக்கள்',
  nav_calendar: 'நாள்காட்டி', nav_analytics: 'பகுப்பாய்வு', nav_billing: 'பில்லிங்',
  nav_privacy: 'தனியுரிமை', nav_admin: 'நிர்வாகி குழு',
  dashboard: 'டாஷ்போர்டு', research: 'ஆராய்ச்சி', bareActs: 'சட்ட நூல்கள்', templates: 'வார்ப்புருக்கள்',
  calendar: 'நாள்காட்டி', billing: 'பில்லிங்', assistant: 'நியாய் அசிஸ்ட்', privacy: 'தனியுரிமை',
  launchIndia: 'இந்திய வழக்கறிஞர்கள், சட்ட நிறுவனங்கள் மற்றும் சட்ட அணிகளுக்காக உருவாக்கப்பட்டது.',
  launchDetail: 'பல்மொழி சட்ட பணிச்சுற்றுகள், இந்திய சட்ட ஆய்வு மற்றும் நீதிமன்ற சார்ந்த செயல்பாடுகள் ஒரே பாதுகாப்பான SaaS-ல்.',
  openPlatform: 'தளத்தை திறக்கவும்', exploreWorkspace: 'வேலைப்பகுதியை காண்க',
  disclaimer: 'இது ஏஐ உதவி மட்டுமே; சட்ட ஆலோசனை அல்ல. வழக்கறிஞர் மதிப்பாய்வு அவசியம்.',
  loading: 'ஏற்றுகிறது…', send: 'அனுப்பு', cancel: 'ரத்து', close: 'மூடு', search: 'தேடு', logout: 'வெளியேறு', login: 'உள்நுழைவு', workspace: 'பணியிடம்',
  dash_firmCommand: 'நிறுவன கட்டளை மையம்', dash_myPractice: 'என் பயிற்சி டாஷ்போர்டு', dash_myWorkspace: 'என் பணியிடம்',
  doc_title: 'ஆவண நுண்ணறிவு பணியிடம்', mat_title: 'வழக்கு மேலாண்மை', mat_subtitle: 'நீதிமன்றங்கள் மற்றும் தீர்ப்பாயங்கள் முழுவதும் வழக்குகளை நிர்வகிக்கவும்',
  nyay_greeting: 'வணக்கம். இந்திய சட்ட ஆராய்ச்சி, பிரிவு வரைவு மற்றும் வழக்கு சட்ட குறிப்புகளில் உதவ முடியும். உங்கள் விருப்பமான மொழியில் கேளுங்கள்.',
  nyay_placeholder: 'எந்த இந்திய மொழியிலும் கேளுங்கள்…', nyay_suggestedPrompts: 'பரிந்துரைக்கப்பட்ட கட்டளைகள்',
  res_headline: 'இந்திய பிரிவுகள், தீர்ப்புகள் மற்றும் பல்மொழி பதில்களுடன் ஆராய்ச்சி செய்யுங்கள்.',
  auth_loginTitle: 'மீண்டும் வருக', auth_registerTitle: 'உங்கள் கணக்கை உருவாக்கவும்',
};

const te: typeof en = {
  ...en,
  tagline: 'సాక్ష్యాధారిత మేధస్సు నిర్ణయ వ్యవస్థ',
  nav_dashboard: 'డాష్‌బోర్డ్', nav_matters: 'కేసులు', nav_documents: 'పత్రాలు', nav_research: 'పరిశోధన',
  nav_nyayAssist: 'న్యాయ్ అసిస్ట్', nav_bareActs: 'బేర్ యాక్ట్స్', nav_templates: 'టెంప్లేట్లు',
  nav_calendar: 'క్యాలెండర్', nav_analytics: 'విశ్లేషణ', nav_billing: 'బిల్లింగ్',
  nav_privacy: 'గోప్యత', nav_admin: 'అడ్మిన్ ప్యానెల్',
  dashboard: 'డాష్‌బోర్డ్', research: 'పరిశోధన', bareActs: 'బేర్ యాక్ట్స్', templates: 'టెంప్లేట్లు',
  calendar: 'క్యాలెండర్', billing: 'బిల్లింగ్', assistant: 'న్యాయ్ అసిస్ట్', privacy: 'గోప్యత',
  launchIndia: 'భారతీయ న్యాయవాదులు, లా ఫర్మ్‌లు మరియు లీగల్ టీమ్‌ల కోసం రూపుదిద్దింది.',
  launchDetail: 'బహుభాషా న్యాయ వర్క్‌ఫ్లోలు, భారతీయ చట్ట పరిశోధన, కోర్టు-ఆధారిత ఆపరేషన్లు ఒకే సురక్షిత SaaS‌లో.',
  openPlatform: 'ప్లాట్‌ఫారమ్ తెరవండి', exploreWorkspace: 'వర్క్‌స్పేస్ చూడండి',
  disclaimer: 'ఇది ఏఐ సహాయం మాత్రమే; న్యాయ సలహా కాదు. న్యాయవాది సమీక్ష అవసరం.',
  loading: 'లోడ్ అవుతోంది…', send: 'పంపు', cancel: 'రద్దు', close: 'మూసివేయి', search: 'వెతుకు', logout: 'లాగౌట్', login: 'లాగిన్', workspace: 'వర్క్‌స్పేస్',
  dash_firmCommand: 'ఫర్మ్ కమాండ్ సెంటర్', dash_myPractice: 'నా ప్రాక్టీస్ డాష్‌బోర్డ్', dash_myWorkspace: 'నా వర్క్‌స్పేస్',
  doc_title: 'డాక్యుమెంట్ ఇంటెలిజెన్స్ వర్క్‌స్పేస్', mat_title: 'కేసు నిర్వహణ',
  nyay_greeting: 'నమస్కారం. భారతీయ న్యాయ పరిశోధన, క్లాజ్ డ్రాఫ్టింగ్ మరియు కేస్-లా రిఫరెన్స్‌లలో సహాయం చేయగలను. మీ ఇష్టమైన భాషలో అడగండి.',
  nyay_placeholder: 'ఏదైనా భారతీయ భాషలో అడగండి…',
  auth_loginTitle: 'మళ్ళీ స్వాగతం', auth_registerTitle: 'మీ ఖాతాను సృష్టించండి',
};

const kn: typeof en = {
  ...en,
  tagline: 'ಸಾಕ್ಷ್ಯಾಧಾರಿತ ಬುದ್ಧಿವಂತ ನಿರ್ಣಯ ವ್ಯವಸ್ಥೆ',
  nav_dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', nav_matters: 'ಪ್ರಕರಣಗಳು', nav_documents: 'ದಾಖಲೆಗಳು', nav_research: 'ಸಂಶೋಧನೆ',
  nav_nyayAssist: 'ನ್ಯಾಯ್ ಅಸಿಸ್ಟ್', nav_bareActs: 'ಬೇರ್ ಆಕ್ಟ್ಸ್', nav_templates: 'ಟೆಂಪ್ಲೇಟ್‌ಗಳು',
  nav_calendar: 'ಕ್ಯಾಲೆಂಡರ್', nav_analytics: 'ವಿಶ್ಲೇಷಣೆ', nav_billing: 'ಬಿಲ್ಲಿಂಗ್',
  nav_privacy: 'ಗೌಪ್ಯತೆ', nav_admin: 'ಅಡ್ಮಿನ್ ಪ್ಯಾನೆಲ್',
  dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', research: 'ಸಂಶೋಧನೆ', bareActs: 'ಬೇರ್ ಆಕ್ಟ್ಸ್', templates: 'ಟೆಂಪ್ಲೇಟ್‌ಗಳು',
  calendar: 'ಕ್ಯಾಲೆಂಡರ್', billing: 'ಬಿಲ್ಲಿಂಗ್', assistant: 'ನ್ಯಾಯ್ ಅಸಿಸ್ಟ್', privacy: 'ಗೌಪ್ಯತೆ',
  launchIndia: 'ಭಾರತೀಯ ವಕೀಲರು, ಕಾನೂನು ಸಂಸ್ಥೆಗಳು ಮತ್ತು ಕಾನೂನು ತಂಡಗಳಿಗಾಗಿ ನಿರ್ಮಿಸಲಾಗಿದೆ.',
  disclaimer: 'ಇದು ಎಐ ಸಹಾಯ ಮಾತ್ರ; ಕಾನೂನು ಸಲಹೆ ಅಲ್ಲ. ವಕೀಲರ ಪರಿಶೀಲನೆ ಅಗತ್ಯ.',
  loading: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ…', send: 'ಕಳುಹಿಸು', search: 'ಹುಡುಕು', logout: 'ಲಾಗೌಟ್', login: 'ಲಾಗಿನ್', workspace: 'ವರ್ಕ್‌ಸ್ಪೇಸ್',
  nyay_greeting: 'ನಮಸ್ಕಾರ. ಭಾರತೀಯ ಕಾನೂನು ಸಂಶೋಧನೆ, ಕ್ಲಾಜ್ ಡ್ರಾಫ್ಟಿಂಗ್ ಮತ್ತು ಕೇಸ್-ಲಾ ಉಲ್ಲೇಖಗಳಲ್ಲಿ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ನಿಮ್ಮ ಆದ್ಯತೆಯ ಭಾಷೆಯಲ್ಲಿ ಕೇಳಿ.',
  nyay_placeholder: 'ಯಾವುದೇ ಭಾರತೀಯ ಭಾಷೆಯಲ್ಲಿ ಕೇಳಿ…',
  auth_loginTitle: 'ಮತ್ತೆ ಸ್ವಾಗತ', auth_registerTitle: 'ನಿಮ್ಮ ಖಾತೆ ರಚಿಸಿ',
};

const ml: typeof en = {
  ...en,
  tagline: 'തെളിവ് അധിഷ്ഠിത ബുദ്ധിമാനായ തീരുമാന സംവിധാനം',
  nav_dashboard: 'ഡാഷ്ബോർഡ്', nav_matters: 'കേസുകൾ', nav_documents: 'രേഖകൾ', nav_research: 'ഗവേഷണം',
  nav_nyayAssist: 'ന്യായ് അസിസ്റ്റ്', nav_bareActs: 'ബെയർ ആക്റ്റുകൾ', nav_templates: 'ടെംപ്ലേറ്റുകൾ',
  nav_calendar: 'കലണ്ടർ', nav_analytics: 'വിശകലനം', nav_billing: 'ബില്ലിംഗ്',
  nav_privacy: 'സ്വകാര്യത', nav_admin: 'അഡ്മിൻ പാനൽ',
  dashboard: 'ഡാഷ്ബോർഡ്', research: 'ഗവേഷണം', bareActs: 'ബെയർ ആക്റ്റുകൾ', templates: 'ടെംപ്ലേറ്റുകൾ',
  calendar: 'കലണ്ടർ', billing: 'ബില്ലിംഗ്', assistant: 'ന്യായ് അസിസ്റ്റ്', privacy: 'സ്വകാര്യത',
  launchIndia: 'ഇന്ത്യൻ അഭിഭാഷകർ, നിയമസ്ഥാപനങ്ങൾ, നിയമസംഘങ്ങൾ എന്നിവർക്കായി നിർമ്മിച്ചത്.',
  disclaimer: 'ഇത് എഐ സഹായമാണ്, നിയമോപദേശം അല്ല. അഭിഭാഷക പരിശോധന ആവശ്യമാണ്.',
  loading: 'ലോഡ് ചെയ്യുന്നു…', send: 'അയയ്ക്കുക', search: 'തിരയുക', logout: 'ലോഗൗട്ട്', login: 'ലോഗിൻ', workspace: 'വർക്ക്‌സ്‌പേസ്',
  nyay_greeting: 'നമസ്കാരം. ഇന്ത്യൻ നിയമ ഗവേഷണം, വ്യവസ്ഥ കരട്, കേസ്-ലോ റഫറൻസുകൾ എന്നിവയിൽ സഹായിക്കാൻ കഴിയും. നിങ്ങളുടെ ഇഷ്ടമുള്ള ഭാഷയിൽ ചോദിക്കൂ.',
  nyay_placeholder: 'ഏത് ഇന്ത്യൻ ഭാഷയിലും ചോദിക്കൂ…',
  auth_loginTitle: 'വീണ്ടും സ്വാഗതം', auth_registerTitle: 'നിങ്ങളുടെ അക്കൗണ്ട് സൃഷ്ടിക്കുക',
};

const mr: typeof en = {
  ...en,
  tagline: 'पुरावा-आधारित बुद्धिमान निर्णय प्रणाली',
  nav_dashboard: 'डॅशबोर्ड', nav_matters: 'प्रकरणे', nav_documents: 'कागदपत्रे', nav_research: 'संशोधन',
  nav_nyayAssist: 'न्याय असिस्ट', nav_bareActs: 'बेअर अॅक्ट्स', nav_templates: 'साचा',
  nav_calendar: 'कॅलेंडर', nav_analytics: 'विश्लेषण', nav_billing: 'बिलिंग',
  nav_privacy: 'गोपनीयता', nav_admin: 'व्यवस्थापक',
  dashboard: 'डॅशबोर्ड', research: 'संशोधन', bareActs: 'बेअर अॅक्ट्स', templates: 'साचा',
  calendar: 'कॅलेंडर', billing: 'बिलिंग', assistant: 'न्याय असिस्ट', privacy: 'गोपनीयता',
  launchIndia: 'भारतीय वकील, लॉ फर्म आणि कायदेशीर टीमसाठी तयार केलेले.',
  disclaimer: 'ही एआय मदत आहे, कायदेशीर सल्ला नाही. वकील पुनरावलोकन आवश्यक आहे.',
  loading: 'लोड होत आहे…', send: 'पाठवा', search: 'शोधा', logout: 'लॉगआउट', login: 'लॉगिन', workspace: 'कार्यक्षेत्र',
  nyay_greeting: 'नमस्कार. भारतीय कायदा संशोधन, कलम मसुदा आणि केस-लॉ संदर्भांमध्ये मदत करू शकतो. आपल्या पसंतीच्या भाषेत विचारा.',
  nyay_placeholder: 'कोणत्याही भारतीय भाषेत विचारा…',
  auth_loginTitle: 'पुन्हा स्वागत', auth_registerTitle: 'तुमचे खाते तयार करा',
};

const gu: typeof en = {
  ...en,
  tagline: 'પુરાવા આધારિત બુદ્ધિશાળી નિર્ણય પ્રણાલી',
  nav_dashboard: 'ડેશબોર્ડ', nav_matters: 'કેસો', nav_documents: 'દસ્તાવેજો', nav_research: 'સંશોધન',
  nav_nyayAssist: 'ન્યાય અસિસ્ટ', nav_bareActs: 'બેર એક્ટ્સ', nav_templates: 'ટેમ્પલેટ્સ',
  nav_calendar: 'કૅલેન્ડર', nav_analytics: 'વિશ્લેષણ', nav_billing: 'બિલિંગ',
  nav_privacy: 'ગોપનીયતા', nav_admin: 'એડમિન પેનલ',
  dashboard: 'ડેશબોર્ડ', research: 'સંશોધન', bareActs: 'બેર એક્ટ્સ', templates: 'ટેમ્પલેટ્સ',
  calendar: 'કૅલેન્ડર', billing: 'બિલિંગ', assistant: 'ન્યાય અસિસ્ટ', privacy: 'ગોપનીયતા',
  launchIndia: 'ભારતીય વકીલો, કાયદા ફર્મો અને કાનૂની ટીમો માટે નિર્મિત.',
  disclaimer: 'આ એઆઈ સહાય છે, કાનૂની સલાહ નથી. વકીલ સમીક્ષા જરૂરી છે.',
  loading: 'લોડ થઈ રહ્યું છે…', send: 'મોકલો', search: 'શોધો', logout: 'લૉગઆઉટ', login: 'લૉગિન', workspace: 'વર્કસ્પેસ',
  nyay_greeting: 'નમસ્તે. ભારતીય કાયદા સંશોધન, કલમ ડ્રાફ્ટિંગ અને કેસ-લૉ સંદર્ભોમાં મદદ કરી શકું છું. તમારી પસંદીદા ભાષામાં પૂછો.',
  nyay_placeholder: 'કોઈપણ ભારતીય ભાષામાં પૂછો…',
  auth_loginTitle: 'ફરી સ્વાગત છે', auth_registerTitle: 'તમારું ખાતું બનાવો',
};

const pa: typeof en = {
  ...en,
  tagline: 'ਸਬੂਤ ਆਧਾਰਿਤ ਬੁੱਧੀਮਾਨ ਫੈਸਲਾ ਪ੍ਰਣਾਲੀ',
  nav_dashboard: 'ਡੈਸ਼ਬੋਰਡ', nav_matters: 'ਮਾਮਲੇ', nav_documents: 'ਦਸਤਾਵੇਜ਼', nav_research: 'ਖੋਜ',
  nav_nyayAssist: 'ਨਿਆਂ ਅਸਿਸਟ', nav_bareActs: 'ਬੇਅਰ ਐਕਟਸ', nav_templates: 'ਟੈਂਪਲੇਟ',
  nav_calendar: 'ਕੈਲੰਡਰ', nav_analytics: 'ਵਿਸ਼ਲੇਸ਼ਣ', nav_billing: 'ਬਿਲਿੰਗ',
  nav_privacy: 'ਗੋਪਨੀਯਤਾ', nav_admin: 'ਐਡਮਿਨ ਪੈਨਲ',
  dashboard: 'ਡੈਸ਼ਬੋਰਡ', research: 'ਖੋਜ', bareActs: 'ਬੇਅਰ ਐਕਟਸ', templates: 'ਟੈਂਪਲੇਟ',
  calendar: 'ਕੈਲੰਡਰ', billing: 'ਬਿਲਿੰਗ', assistant: 'ਨਿਆਂ ਅਸਿਸਟ', privacy: 'ਗੋਪਨੀਯਤਾ',
  launchIndia: 'ਭਾਰਤੀ ਵਕੀਲਾਂ, ਲਾਅ ਫਰਮਾਂ ਅਤੇ ਕਾਨੂੰਨੀ ਟੀਮਾਂ ਲਈ ਬਣਾਇਆ ਗਿਆ।',
  disclaimer: 'ਇਹ ਏਆਈ ਸਹਾਇਤਾ ਹੈ, ਕਾਨੂੰਨੀ ਸਲਾਹ ਨਹੀਂ। ਵਕੀਲ ਸਮੀਖਿਆ ਲਾਜ਼ਮੀ ਹੈ।',
  loading: 'ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…', send: 'ਭੇਜੋ', search: 'ਖੋਜੋ', logout: 'ਲੌਗਆਊਟ', login: 'ਲੌਗਇਨ', workspace: 'ਵਰਕਸਪੇਸ',
  nyay_greeting: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ। ਭਾਰਤੀ ਕਾਨੂੰਨੀ ਖੋਜ, ਧਾਰਾ ਡਰਾਫਟਿੰਗ ਅਤੇ ਕੇਸ-ਲਾਅ ਹਵਾਲਿਆਂ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ। ਆਪਣੀ ਪਸੰਦੀਦਾ ਭਾਸ਼ਾ ਵਿੱਚ ਪੁੱਛੋ।',
  nyay_placeholder: 'ਕਿਸੇ ਵੀ ਭਾਰਤੀ ਭਾਸ਼ਾ ਵਿੱਚ ਪੁੱਛੋ…',
};

const or: typeof en = {
  ...en,
  tagline: 'ପ୍ରମାଣ ଆଧାରିତ ବୁଦ୍ଧିମାନ ନିଷ୍ପତ୍ତି ପ୍ରଣାଳୀ',
  nav_dashboard: 'ଡ୍ୟାଶବୋର୍ଡ', nav_matters: 'ମାମଲା', nav_documents: 'ଡକ୍ୟୁମେଣ୍ଟ', nav_research: 'ଗବେଷଣା',
  nav_nyayAssist: 'ନ୍ୟାୟ ଅସିଷ୍ଟ', nav_bareActs: 'ବେୟାର ଆକ୍ଟ', nav_templates: 'ଟେମ୍ପଲେଟ',
  nav_calendar: 'କ୍ୟାଲେଣ୍ଡର', nav_analytics: 'ବିଶ୍ଳେଷଣ', nav_billing: 'ବିଲିଂ',
  nav_privacy: 'ଗୋପନୀୟତା', nav_admin: 'ଆଡ୍‌ମିନ୍ ପ୍ୟାନେଲ',
  dashboard: 'ଡ୍ୟାଶବୋର୍ଡ', research: 'ଗବେଷଣା', bareActs: 'ବେୟାର ଆକ୍ଟ', templates: 'ଟେମ୍ପଲେଟ',
  calendar: 'କ୍ୟାଲେଣ୍ଡର', billing: 'ବିଲିଂ', assistant: 'ନ୍ୟାୟ ଅସିଷ୍ଟ', privacy: 'ଗୋପନୀୟତା',
  launchIndia: 'ଭାରତୀୟ ଅଧିବକ୍ତା, ଆଇନ ଫର୍ମ ଏବଂ ଆଇନ ଟିମ୍ ପାଇଁ ନିର୍ମିତ।',
  disclaimer: 'ଏହା ଏଆଇ ସହାୟତା, ଆଇନି ପରାମର୍ଶ ନୁହେଁ। ଅଧିବକ୍ତା ସମୀକ୍ଷା ଆବଶ୍ୟକ।',
  loading: 'ଲୋଡ ହେଉଛି…', send: 'ପଠାନ୍ତୁ', search: 'ଖୋଜନ୍ତୁ', logout: 'ଲଗଆଉଟ', login: 'ଲଗଇନ', workspace: 'ୱର୍କସ୍ପେସ୍',
  nyay_greeting: 'ନମସ୍କାର। ଭାରତୀୟ ଆଇନ ଗବେଷଣା, ଧାରା ଡ୍ରାଫ୍ଟିଂ ଏବଂ କେସ-ଲ ରେଫରେନ୍ସରେ ସାହାଯ୍ୟ କରିପାରିବି। ଆପଣଙ୍କ ପସନ୍ଦର ଭାଷାରେ ପଚାରନ୍ତୁ।',
  nyay_placeholder: 'ଯେକୌଣସି ଭାରତୀୟ ଭାଷାରେ ପଚାରନ୍ତୁ…',
};

const as_: typeof en = {
  ...en,
  tagline: 'প্ৰমাণভিত্তিক বুদ্ধিমান সিদ্ধান্ত ব্যৱস্থা',
  nav_dashboard: 'ডেশ্বব\'ৰ্ড', nav_matters: 'গোচৰ', nav_documents: 'নথি', nav_research: 'গৱেষণা',
  nav_nyayAssist: 'ন্যায় অসিস্ট', nav_bareActs: 'বেয়াৰ এক্টছ', nav_templates: 'টেমপ্লেট',
  nav_calendar: 'কেলেণ্ডাৰ', nav_analytics: 'বিশ্লেষণ', nav_billing: 'বিলিং',
  nav_privacy: 'গোপনীয়তা', nav_admin: 'এডমিন পেনেল',
  dashboard: 'ডেশ্বব\'ৰ্ড', research: 'গৱেষণা', bareActs: 'বেয়াৰ এক্টছ', templates: 'টেমপ্লেট',
  calendar: 'কেলেণ্ডাৰ', billing: 'বিলিং', assistant: 'ন্যায় অসিস্ট', privacy: 'গোপনীয়তা',
  launchIndia: 'ভাৰতীয় আইনজীৱী, ল\' ফাৰ্ম আৰু লিগেল টীমৰ বাবে নিৰ্মিত।',
  disclaimer: 'এইটো এআই সহায়, আইনী পৰামৰ্শ নহয়। আইনজীৱীৰ পৰ্যালোচনা প্ৰয়োজন।',
  loading: 'লোড হৈ আছে…', send: 'পঠিয়াওক', search: 'সন্ধান কৰক', logout: 'লগআউট', login: 'লগইন', workspace: 'ৱৰ্কস্পেচ',
  nyay_greeting: 'নমস্কাৰ। ভাৰতীয় আইন গৱেষণা, ধাৰা খচৰা আৰু কেচ-ল\' ৰেফাৰেন্সত সহায় কৰিব পাৰোঁ। আপোনাৰ পছন্দৰ ভাষাত সুধিব।',
  nyay_placeholder: 'যিকোনো ভাৰতীয় ভাষাত সুধিব…',
};

const ur: typeof en = {
  ...en,
  tagline: 'ثبوت پر مبنی ذہین فیصلہ سازی نظام',
  nav_dashboard: 'ڈیش بورڈ', nav_matters: 'مقدمات', nav_documents: 'دستاویزات', nav_research: 'تحقیق',
  nav_nyayAssist: 'نیائے اسسٹ', nav_bareActs: 'بیئر ایکٹس', nav_templates: 'سانچے',
  nav_calendar: 'کیلنڈر', nav_analytics: 'تجزیات', nav_billing: 'بلنگ',
  nav_privacy: 'رازداری', nav_admin: 'ایڈمن پینل',
  dashboard: 'ڈیش بورڈ', research: 'تحقیق', bareActs: 'بیئر ایکٹس', templates: 'سانچے',
  calendar: 'کیلنڈر', billing: 'بلنگ', assistant: 'نیائے اسسٹ', privacy: 'رازداری',
  launchIndia: 'بھارتی وکلا، لاء فرمز اور قانونی ٹیموں کے لیے تیار کیا گیا۔',
  disclaimer: 'یہ اے آئی معاونت ہے، قانونی مشورہ نہیں۔ وکیل کا جائزہ ضروری ہے۔',
  loading: 'لوڈ ہو رہا ہے…', send: 'بھیجیں', search: 'تلاش کریں', logout: 'لاگ آؤٹ', login: 'لاگ ان', workspace: 'ورکسپیس',
  nyay_greeting: 'السلام علیکم۔ بھارتی قانونی تحقیق، شق کی تیاری اور کیس لا حوالہ میں مدد کر سکتا ہوں۔ اپنی پسندیدہ زبان میں پوچھیں۔',
  nyay_placeholder: 'کسی بھی بھارتی زبان میں پوچھیں…',
};

// ============================================================================
// Build resources
// ============================================================================

type TranslationDictionary = typeof en;
type TranslationResource = Record<string, { translation: TranslationDictionary }>;

const resources: TranslationResource = {
  en: { translation: en },
  hi: { translation: hi },
  bn: { translation: bn },
  ta: { translation: ta },
  te: { translation: te },
  kn: { translation: kn },
  ml: { translation: ml },
  mr: { translation: mr },
  gu: { translation: gu },
  pa: { translation: pa },
  or: { translation: or },
  as: { translation: as_ },
  ur: { translation: ur },
};

// Fill remaining languages (extended tier) with English fallback
for (const languageCode of SUPPORTED_LANGUAGE_CODES) {
  if (!resources[languageCode]) {
    resources[languageCode] = { translation: en };
  }
}

// ── Persistence: save/load language from localStorage ──
function getStoredLanguage(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('evidentis_language') || 'en';
  }
  return 'en';
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: getStoredLanguage(),
    fallbackLng: 'en',
    supportedLngs: [...SUPPORTED_LANGUAGE_CODES],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
  });

  // Persist language changes to localStorage
  i18n.on('languageChanged', (lng: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('evidentis_language', lng);
      // Update html dir and lang attributes
      document.documentElement.lang = lng;
      document.documentElement.dir = getDirection(lng);
    }
  });
}

export const textDirectionByLanguage = Object.fromEntries(
  RTL_LANGUAGES.map((languageCode) => [languageCode, 'rtl' as const])
) as Record<string, 'ltr' | 'rtl'>;

export function getDirection(language: string) {
  return textDirectionByLanguage[language] ?? 'ltr';
}

export { i18n };
