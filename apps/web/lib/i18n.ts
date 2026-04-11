'use client';

import { RTL_LANGUAGES, SUPPORTED_LANGUAGE_CODES } from '@evidentis/shared';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const baseTranslation = {
  brand: 'EvidentIS',
  tagline: 'Evidence-Based Intelligent Decision System',
  dashboard: 'Dashboard',
  research: 'Research',
  bareActs: 'Bare Acts',
  templates: 'Templates',
  calendar: 'Calendar',
  billing: 'Billing',
  assistant: 'Nyay Assist',
  privacy: 'Privacy',
  launchIndia: 'Built for Indian advocates, law firms, and legal teams.',
  launchDetail: 'Multilingual legal workflows, Indian law research, and court-aware operations in one secure SaaS.',
  openPlatform: 'Open Platform',
  exploreWorkspace: 'Explore Workspace',
  disclaimer: 'AI assistance, not legal advice. Advocate review required.',
};

type TranslationDictionary = {
  [Key in keyof typeof baseTranslation]: string;
};
type TranslationResource = Record<string, { translation: TranslationDictionary }>;

const resources: TranslationResource = {
  en: { translation: baseTranslation },
  hi: { translation: { brand: 'EvidentIS', tagline: 'प्रमाण-आधारित बुद्धिमान निर्णय प्रणाली', dashboard: 'डैशबोर्ड', research: 'अनुसंधान', bareActs: 'बेयर एक्ट्स', templates: 'टेम्पलेट्स', calendar: 'कैलेंडर', billing: 'बिलिंग', assistant: 'न्याय असिस्ट', privacy: 'गोपनीयता', launchIndia: 'भारतीय अधिवक्ताओं, विधि फर्मों और कानूनी टीमों के लिए बनाया गया।', launchDetail: 'बहुभाषी विधिक कार्यप्रवाह, भारतीय कानून शोध और न्यायालय-आधारित संचालन एक सुरक्षित SaaS में।', openPlatform: 'प्लेटफ़ॉर्म खोलें', exploreWorkspace: 'वर्कस्पेस देखें', disclaimer: 'यह एआई सहायता है, कानूनी सलाह नहीं। अधिवक्ता समीक्षा आवश्यक है।' } },
  bn: { translation: { brand: 'EvidentIS', tagline: 'প্রমাণভিত্তিক বুদ্ধিমান সিদ্ধান্ত ব্যবস্থা', dashboard: 'ড্যাশবোর্ড', research: 'গবেষণা', bareActs: 'বেয়ার অ্যাক্টস', templates: 'টেমপ্লেট', calendar: 'ক্যালেন্ডার', billing: 'বিলিং', assistant: 'ন্যায় অ্যাসিস্ট', privacy: 'গোপনীয়তা', launchIndia: 'ভারতীয় আইনজীবী, আইন সংস্থা ও লিগ্যাল টিমের জন্য নির্মিত।', launchDetail: 'বহুভাষিক আইনকর্মপ্রবাহ, ভারতীয় আইন গবেষণা এবং আদালত-সচেতন অপারেশন এক সুরক্ষিত SaaS-এ।', openPlatform: 'প্ল্যাটফর্ম খুলুন', exploreWorkspace: 'ওয়ার্কস্পেস দেখুন', disclaimer: 'এটি এআই সহায়তা, আইনি পরামর্শ নয়। আইনজীবীর পর্যালোচনা প্রয়োজন।' } },
  ta: { translation: { brand: 'EvidentIS', tagline: 'சான்று சார்ந்த நுண்ணறிவு தீர்மான அமைப்பு', dashboard: 'டாஷ்போர்டு', research: 'ஆராய்ச்சி', bareActs: 'சட்ட நூல்கள்', templates: 'வார்ப்புருக்கள்', calendar: 'நாள்காட்டி', billing: 'பில்லிங்', assistant: 'நியாய் அசிஸ்ட்', privacy: 'தனியுரிமை', launchIndia: 'இந்திய வழக்கறிஞர்கள், சட்ட நிறுவனங்கள் மற்றும் சட்ட அணிகளுக்காக உருவாக்கப்பட்டது.', launchDetail: 'பல்மொழி சட்ட பணிச்சுற்றுகள், இந்திய சட்ட ஆய்வு மற்றும் நீதிமன்ற சார்ந்த செயல்பாடுகள் ஒரே பாதுகாப்பான SaaS-ல்.', openPlatform: 'தளத்தை திறக்கவும்', exploreWorkspace: 'வேலைப்பகுதியை காண்க', disclaimer: 'இது ஏஐ உதவி மட்டுமே; சட்ட ஆலோசனை அல்ல. வழக்கறிஞர் மதிப்பாய்வு அவசியம்.' } },
  te: { translation: { brand: 'EvidentIS', tagline: 'సాక్ష్యాధారిత మేధస్సు నిర్ణయ వ్యవస్థ', dashboard: 'డాష్‌బోర్డ్', research: 'పరిశోధన', bareActs: 'బేర్ యాక్ట్స్', templates: 'టెంప్లేట్లు', calendar: 'క్యాలెండర్', billing: 'బిల్లింగ్', assistant: 'న్యాయ్ అసిస్ట్', privacy: 'గోప్యత', launchIndia: 'భారతీయ న్యాయవాదులు, లా ఫర్మ్‌లు మరియు లీగల్ టీమ్‌ల కోసం రూపుదిద్దింది.', launchDetail: 'బహుభాషా న్యాయ వర్క్‌ఫ్లోలు, భారతీయ చట్ట పరిశోధన, కోర్టు-ఆధారిత ఆపరేషన్లు ఒకే సురక్షిత SaaS‌లో.', openPlatform: 'ప్లాట్‌ఫారమ్ తెరవండి', exploreWorkspace: 'వర్క్‌స్పేస్ చూడండి', disclaimer: 'ఇది ఏఐ సహాయం మాత్రమే; న్యాయ సలహా కాదు. న్యాయవాది సమీక్ష అవసరం.' } },
  kn: { translation: { brand: 'EvidentIS', tagline: 'ಸಾಕ್ಷ್ಯಾಧಾರಿತ ಬುದ್ಧಿವಂತ ನಿರ್ಣಯ ವ್ಯವಸ್ಥೆ', dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', research: 'ಸಂಶೋಧನೆ', bareActs: 'ಬೇರ್ ಆಕ್ಟ್ಸ್', templates: 'ಟೆಂಪ್ಲೇಟ್‌ಗಳು', calendar: 'ಕ್ಯಾಲೆಂಡರ್', billing: 'ಬಿಲ್ಲಿಂಗ್', assistant: 'ನ್ಯಾಯ್ ಅಸಿಸ್ಟ್', privacy: 'ಗೌಪ್ಯತೆ', launchIndia: 'ಭಾರತೀಯ ವಕೀಲರು, ಕಾನೂನು ಸಂಸ್ಥೆಗಳು ಮತ್ತು ಕಾನೂನು ತಂಡಗಳಿಗಾಗಿ ನಿರ್ಮಿಸಲಾಗಿದೆ.', launchDetail: 'ಬಹುಭಾಷಾ ಕಾನೂನು ಕಾರ್ಯಪ್ರವಾಹಗಳು, ಭಾರತೀಯ ಕಾನೂನು ಸಂಶೋಧನೆ ಮತ್ತು ನ್ಯಾಯಾಲಯ-ಸಜ್ಜಿತ ಕಾರ್ಯಾಚರಣೆಗಳು ಒಂದೇ ಸುರಕ್ಷಿತ SaaS‌ನಲ್ಲಿ.', openPlatform: 'ವೇದಿಕೆ ತೆರೆಯಿರಿ', exploreWorkspace: 'ವರ್ಕ್‌ಸ್ಪೇಸ್ ಅನ್ವೇಷಿಸಿ', disclaimer: 'ಇದು ಎಐ ಸಹಾಯ ಮಾತ್ರ; ಕಾನೂನು ಸಲಹೆ ಅಲ್ಲ. ವಕೀಲರ ಪರಿಶೀಲನೆ ಅಗತ್ಯ.' } },
  ml: { translation: { brand: 'EvidentIS', tagline: 'തെളിവ് അധിഷ്ഠിത ബുദ്ധിമാനായ തീരുമാന സംവിധാനം', dashboard: 'ഡാഷ്ബോർഡ്', research: 'ഗവേഷണം', bareActs: 'ബെയർ ആക്റ്റുകൾ', templates: 'ടെംപ്ലേറ്റുകൾ', calendar: 'കലണ്ടർ', billing: 'ബില്ലിംഗ്', assistant: 'ന്യായ് അസിസ്റ്റ്', privacy: 'സ്വകാര്യത', launchIndia: 'ഇന്ത്യൻ അഭിഭാഷകർ, നിയമസ്ഥാപനങ്ങൾ, നിയമസംഘങ്ങൾ എന്നിവർക്കായി നിർമ്മിച്ചത്.', launchDetail: 'ബഹുഭാഷാ നിയമ പ്രവാഹങ്ങൾ, ഇന്ത്യൻ നിയമ ഗവേഷണം, കോടതിയോട് ബന്ധമുള്ള പ്രവർത്തനങ്ങൾ ഒറ്റ സുരക്ഷിത SaaS-ൽ.', openPlatform: 'പ്ലാറ്റ്ഫോം തുറക്കുക', exploreWorkspace: 'വർക്‌സ്‌പേസ് കാണുക', disclaimer: 'ഇത് എഐ സഹായമാണ്, നിയമോപദേശം അല്ല. അഭിഭാഷക പരിശോധന ആവശ്യമാണ്.' } },
  mr: { translation: { brand: 'EvidentIS', tagline: 'पुरावा-आधारित बुद्धिमान निर्णय प्रणाली', dashboard: 'डॅशबोर्ड', research: 'संशोधन', bareActs: 'बेअर अॅक्ट्स', templates: 'साचा', calendar: 'कॅलेंडर', billing: 'बिलिंग', assistant: 'न्याय असिस्ट', privacy: 'गोपनीयता', launchIndia: 'भारतीय वकील, लॉ फर्म आणि कायदेशीर टीमसाठी तयार केलेले.', launchDetail: 'बहुभाषिक कायदेविषयक कार्यप्रवाह, भारतीय कायदा संशोधन आणि न्यायालयसुसंगत ऑपरेशन्स एका सुरक्षित SaaS मध्ये.', openPlatform: 'प्लॅटफॉर्म उघडा', exploreWorkspace: 'वर्कस्पेस पाहा', disclaimer: 'ही एआय मदत आहे, कायदेशीर सल्ला नाही. वकील पुनरावलोकन आवश्यक आहे.' } },
  gu: { translation: { brand: 'EvidentIS', tagline: 'પુરાવા આધારિત બુદ્ધિશાળી નિર્ણય પ્રણાલી', dashboard: 'ડેશબોર્ડ', research: 'સંશોધન', bareActs: 'બેર એક્ટ્સ', templates: 'ટેમ્પલેટ્સ', calendar: 'કૅલેન્ડર', billing: 'બિલિંગ', assistant: 'ન્યાય અસિસ્ટ', privacy: 'ગોપનીયતા', launchIndia: 'ભારતીય વકીલો, કાયદા ફર્મો અને કાનૂની ટીમો માટે નિર્મિત.', launchDetail: 'બહુભાષી કાનૂની વર્કફ્લો, ભારતીય કાનૂન સંશોધન અને કોર્ટ-સજ્જ ઓપરેશન્સ એક સુરક્ષિત SaaS માં.', openPlatform: 'પ્લેટફોર્મ ખોલો', exploreWorkspace: 'વર્કસ્પેસ જુઓ', disclaimer: 'આ એઆઈ સહાય છે, કાનૂની સલાહ નથી. વકીલ સમીક્ષા જરૂરી છે.' } },
  pa: { translation: { brand: 'EvidentIS', tagline: 'ਸਬੂਤ ਆਧਾਰਿਤ ਬੁੱਧੀਮਾਨ ਫੈਸਲਾ ਪ੍ਰਣਾਲੀ', dashboard: 'ਡੈਸ਼ਬੋਰਡ', research: 'ਖੋਜ', bareActs: 'ਬੇਅਰ ਐਕਟਸ', templates: 'ਟੈਂਪਲੇਟ', calendar: 'ਕੈਲੰਡਰ', billing: 'ਬਿਲਿੰਗ', assistant: 'ਨਿਆਇ ਅਸਿਸਟ', privacy: 'ਗੋਪਨੀਯਤਾ', launchIndia: 'ਭਾਰਤੀ ਵਕੀਲਾਂ, ਲਾਅ ਫਰਮਾਂ ਅਤੇ ਕਾਨੂੰਨੀ ਟੀਮਾਂ ਲਈ ਬਣਾਇਆ ਗਿਆ।', launchDetail: 'ਬਹੁਭਾਸ਼ੀ ਕਾਨੂੰਨੀ ਵਰਕਫਲੋ, ਭਾਰਤੀ ਕਾਨੂੰਨ ਖੋਜ ਅਤੇ ਅਦਾਲਤੀ ਕਾਰਵਾਈ ਇੱਕ ਸੁਰੱਖਿਅਤ SaaS ਵਿੱਚ।', openPlatform: 'ਪਲੇਟਫਾਰਮ ਖੋਲ੍ਹੋ', exploreWorkspace: 'ਵਰਕਸਪੇਸ ਵੇਖੋ', disclaimer: 'ਇਹ ਏਆਈ ਸਹਾਇਤਾ ਹੈ, ਕਾਨੂੰਨੀ ਸਲਾਹ ਨਹੀਂ। ਵਕੀਲ ਸਮੀਖਿਆ ਲਾਜ਼ਮੀ ਹੈ।' } },
  or: { translation: { brand: 'EvidentIS', tagline: 'ପ୍ରମାଣ ଆଧାରିତ ବୁଦ୍ଧିମାନ ନିଷ୍ପତ୍ତି ପ୍ରଣାଳୀ', dashboard: 'ଡ୍ୟାଶବୋର୍ଡ', research: 'ଗବେଷଣା', bareActs: 'ବେୟାର ଆକ୍ଟ', templates: 'ଟେମ୍ପଲେଟ', calendar: 'କ୍ୟାଲେଣ୍ଡର', billing: 'ବିଲିଂ', assistant: 'ନ୍ୟାୟ ଅସିଷ୍ଟ', privacy: 'ଗୋପନୀୟତା', launchIndia: 'ଭାରତୀୟ ଅଧିବକ୍ତା, ଆଇନ ଫର୍ମ ଏବଂ ଆଇନ ଟିମ୍ ପାଇଁ ନିର୍ମିତ।', launchDetail: 'ବହୁଭାଷୀ ଆଇନି କାର୍ଯ୍ୟପ୍ରବାହ, ଭାରତୀୟ ଆଇନ ଗବେଷଣା ଏବଂ ଅଦାଲତ ସଚେତନ ଅପରେଶନ୍ସ ଏକ ସୁରକ୍ଷିତ SaaS ଭିତରେ।', openPlatform: 'ପ୍ଲାଟଫର୍ମ ଖୋଲନ୍ତୁ', exploreWorkspace: 'ୱର୍କସ୍ପେସ୍ ଦେଖନ୍ତୁ', disclaimer: 'ଏହା ଏଆଇ ସହାୟତା, ଆଇନି ପରାମର୍ଶ ନୁହେଁ। ଅଧିବକ୍ତା ସମୀକ୍ଷା ଆବଶ୍ୟକ।' } },
  as: { translation: { brand: 'EvidentIS', tagline: 'প্ৰমাণভিত্তিক বুদ্ধিমান সিদ্ধান্ত ব্যৱস্থা', dashboard: 'ডেশ্বব’ৰ্ড', research: 'গৱেষণা', bareActs: 'বেয়াৰ এক্টছ', templates: 'টেমপ্লেট', calendar: 'কেলেণ্ডাৰ', billing: 'বিলিং', assistant: 'ন্যায় অসিস্ট', privacy: 'গোপনীয়তা', launchIndia: 'ভাৰতীয় আইনজীৱী, ল’ ফাৰ্ম আৰু লিগেল টীমৰ বাবে নিৰ্মিত।', launchDetail: 'বহুভাষিক আইনগত ৱৰ্কফ্লো, ভাৰতীয় আইন গৱেষণা আৰু আদালত-সচেতন অপাৰেচন এক সুৰক্ষিত SaaS-ত।', openPlatform: 'প্লেটফৰ্ম খোলক', exploreWorkspace: 'ৱৰ্কস্পেচ চাওক', disclaimer: 'এইটো এআই সহায়, আইনী পৰামৰ্শ নহয়। আইনজীৱীৰ পৰ্যালোচনা প্ৰয়োজন।' } },
  ur: { translation: { brand: 'EvidentIS', tagline: 'ثبوت پر مبنی ذہین فیصلہ سازی نظام', dashboard: 'ڈیش بورڈ', research: 'تحقیق', bareActs: 'بیئر ایکٹس', templates: 'سانچے', calendar: 'کیلنڈر', billing: 'بلنگ', assistant: 'نیائے اسسٹ', privacy: 'رازداری', launchIndia: 'بھارتی وکلا، لاء فرمز اور قانونی ٹیموں کے لیے تیار کیا گیا۔', launchDetail: 'کثیر لسانی قانونی ورک فلو، بھارتی قانون تحقیق اور عدالت سے جڑی کارروائیاں ایک محفوظ SaaS میں۔', openPlatform: 'پلیٹ فارم کھولیں', exploreWorkspace: 'ورک اسپیس دیکھیں', disclaimer: 'یہ اے آئی معاونت ہے، قانونی مشورہ نہیں۔ وکیل کا جائزہ ضروری ہے۔' } },
};

for (const languageCode of SUPPORTED_LANGUAGE_CODES) {
  if (!resources[languageCode]) {
    resources[languageCode] = { translation: baseTranslation };
  }
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: [...SUPPORTED_LANGUAGE_CODES],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
  });
}

export const textDirectionByLanguage = Object.fromEntries(
  RTL_LANGUAGES.map((languageCode) => [languageCode, 'rtl' as const])
) as Record<string, 'ltr' | 'rtl'>;

export function getDirection(language: string) {
  return textDirectionByLanguage[language] ?? 'ltr';
}

export { i18n };
