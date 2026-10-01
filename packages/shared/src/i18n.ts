/**
 * App text in the four languages members can choose (members.language: en, gu, hi, ur).
 * Religious and Jamaat terms (Khums, Sehme Imam, Sehme Sadaat, Lawajam, Marja') are kept as members say them.
 * Translations are a first draft: a native speaker on the committee should review them before launch.
 */
export type Lang = 'en' | 'gu' | 'hi' | 'ur';

export const LANGUAGES: { code: Lang; name: string; english: string }[] = [
  { code: 'en', name: 'English', english: 'English' },
  { code: 'gu', name: 'ગુજરાતી', english: 'Gujarati' },
  { code: 'hi', name: 'हिन्दी', english: 'Hindi' },
  { code: 'ur', name: 'اردو', english: 'Urdu' },
];

/** Urdu is written right to left. */
export const isRtl = (lang: Lang) => lang === 'ur';

type Entry = Record<Lang, string>;

export const STRINGS = {
  // Tabs
  'tab.home': { en: 'Home', gu: 'હોમ', hi: 'होम', ur: 'ہوم' },
  'tab.services': { en: 'Services', gu: 'સેવાઓ', hi: 'सेवाएँ', ur: 'خدمات' },
  'tab.give': { en: 'Give', gu: 'દાન', hi: 'दान', ur: 'عطیہ' },
  'tab.learn': { en: 'Learn', gu: 'શીખો', hi: 'सीखें', ur: 'سیکھیں' },

  // Banners
  'home.salaam': { en: 'Salaam', gu: 'સલામ', hi: 'सलाम', ur: 'سلام' },
  'home.salaamName': { en: 'Salaam, {name}', gu: 'સલામ, {name}', hi: 'सलाम, {name}', ur: 'سلام، {name}' },
  'home.intro': {
    en: 'Everything from the Jamaat in one place.',
    gu: 'જમાતની દરેક સેવા એક જ જગ્યાએ.',
    hi: 'जमात की हर सेवा एक ही जगह।',
    ur: 'جماعت کی ہر خدمت ایک ہی جگہ۔',
  },
  'services.intro': {
    en: 'Apply once and track every step. Your details are only seen by the assigned committee.',
    gu: 'એક વાર અરજી કરો અને દરેક પગલું જુઓ. તમારી વિગતો ફક્ત નિયુક્ત કમિટી જ જુએ છે.',
    hi: 'एक बार आवेदन करें और हर कदम देखें। आपकी जानकारी केवल नियुक्त कमेटी देखती है।',
    ur: 'ایک بار درخواست دیں اور ہر مرحلہ دیکھیں۔ آپ کی تفصیلات صرف مقرر کمیٹی دیکھتی ہے۔',
  },
  'give.intro': {
    en: "Every rupee goes through the Jamaat's account and is recorded.",
    gu: 'દરેક રૂપિયો જમાતના ખાતામાંથી જાય છે અને નોંધાય છે.',
    hi: 'हर रुपया जमात के खाते से जाता है और दर्ज होता है।',
    ur: 'ہر روپیہ جماعت کے کھاتے سے جاتا ہے اور درج ہوتا ہے۔',
  },
  'learn.intro': {
    en: 'Answers come only from Jamaat-approved texts, with the source shown.',
    gu: 'જવાબો ફક્ત જમાતે મંજૂર કરેલા લખાણોમાંથી, સ્ત્રોત સાથે.',
    hi: 'जवाब केवल जमात द्वारा स्वीकृत लेखों से, स्रोत के साथ।',
    ur: 'جوابات صرف جماعت کی منظور شدہ تحریروں سے، حوالے کے ساتھ۔',
  },
  'login.intro': {
    en: 'Sign in to KS1J, or create an account if you are new.',
    gu: 'KS1J માં સાઇન ઇન કરો, અથવા નવા હો તો ખાતું બનાવો.',
    hi: 'KS1J में साइन इन करें, या नए हैं तो खाता बनाएँ।',
    ur: 'KS1J میں سائن اِن کریں، یا نئے ہیں تو اکاؤنٹ بنائیں۔',
  },
  'login.signIn': { en: 'Sign in', gu: 'સાઇન ઇન કરો', hi: 'साइन इन करें', ur: 'سائن اِن کریں' },
  'login.create': { en: 'Create an account', gu: 'ખાતું બનાવો', hi: 'खाता बनाएँ', ur: 'اکاؤنٹ بنائیں' },
  'login.browse': { en: 'See cases without signing in', gu: 'સાઇન ઇન વગર કેસ જુઓ', hi: 'बिना साइन इन के केस देखें', ur: 'سائن اِن کے بغیر کیس دیکھیں' },
  'login.email': { en: 'Email', gu: 'ઇમેઇલ', hi: 'ईमेल', ur: 'ای میل' },
  'login.password': { en: 'Password', gu: 'પાસવર્ડ', hi: 'पासवर्ड', ur: 'پاس ورڈ' },
  'common.signOut': { en: 'Sign out', gu: 'સાઇન આઉટ', hi: 'साइन आउट', ur: 'سائن آؤٹ' },
  'common.comingSoon': { en: 'Coming soon', gu: 'જલ્દી આવે છે', hi: 'जल्द आ रहा है', ur: 'جلد آ رہا ہے' },
  'common.language': { en: 'Language', gu: 'ભાષા', hi: 'भाषा', ur: 'زبان' },

  // Section labels
  'sec.updates': { en: 'Updates for you', gu: 'તમારા માટે સમાચાર', hi: 'आपके लिए अपडेट', ur: 'آپ کے لیے اطلاعات' },
  'sec.forYou': { en: 'For you', gu: 'તમારા માટે', hi: 'आपके लिए', ur: 'آپ کے لیے' },
  'sec.announcements': { en: 'Announcements', gu: 'જાહેરાતો', hi: 'घोषणाएँ', ur: 'اعلانات' },
  'sec.quick': { en: 'Quick actions', gu: 'ઝડપી કામ', hi: 'जल्दी के काम', ur: 'فوری کام' },
  'sec.apply': { en: 'Apply', gu: 'અરજી', hi: 'आवेदन', ur: 'درخواست' },
  'sec.account': { en: 'Your account', gu: 'તમારું ખાતું', hi: 'आपका खाता', ur: 'آپ کا اکاؤنٹ' },
  'sec.emergency': { en: 'Emergency', gu: 'કટોકટી', hi: 'आपातकाल', ur: 'ہنگامی' },
  'sec.khums': { en: 'Khums', gu: 'ખુમ્સ', hi: 'ख़ुम्स', ur: 'خمس' },
  'sec.support': { en: 'Support a case', gu: 'કેસને મદદ કરો', hi: 'किसी केस की मदद करें', ur: 'کسی کیس کی مدد کریں' },
  'sec.dues': { en: 'Dues', gu: 'લવાઝમ', hi: 'लवाज़म', ur: 'لوازم' },
  'sec.ask': { en: 'Ask', gu: 'પૂછો', hi: 'पूछें', ur: 'پوچھیں' },
  'sec.study': { en: 'Study', gu: 'અભ્યાસ', hi: 'पढ़ाई', ur: 'مطالعہ' },
  'sec.careers': { en: 'Careers', gu: 'કારકિર્દી', hi: 'करियर', ur: 'روزگار' },

  // Home cards
  'card.apply.t': { en: 'Apply for help', gu: 'મદદ માટે અરજી કરો', hi: 'मदद के लिए आवेदन करें', ur: 'مدد کے لیے درخواست دیں' },
  'card.apply.d': {
    en: 'Medical, education, ration or a scholarship.',
    gu: 'તબીબી, શિક્ષણ, રેશન અથવા શિષ્યવૃત્તિ.',
    hi: 'इलाज, पढ़ाई, राशन या छात्रवृत्ति।',
    ur: 'علاج، تعلیم، راشن یا وظیفہ۔',
  },
  'card.supportSadaat.t': { en: 'Support a Sadaat case', gu: 'સાદાત કેસને મદદ કરો', hi: 'सादात केस की मदद करें', ur: 'سادات کیس کی مدد کریں' },
  'card.supportSadaat.d': {
    en: 'Verified needs. Sehme Sadaat goes only here.',
    gu: 'ચકાસાયેલી જરૂરિયાતો. સહમે સાદાત ફક્ત અહીં જાય છે.',
    hi: 'जाँची गई ज़रूरतें। सहमे सादात सिर्फ़ यहीं जाता है।',
    ur: 'تصدیق شدہ ضرورتیں۔ سہمِ سادات صرف یہیں جاتا ہے۔',
  },
  'card.payKhums.t': { en: 'Pay Khums or Lawajam', gu: 'ખુમ્સ અથવા લવાઝમ ભરો', hi: 'ख़ुम्स या लवाज़म भरें', ur: 'خمس یا لوازم ادا کریں' },
  'card.payKhums.d': {
    en: 'Calculate, pay and download receipts.',
    gu: 'ગણતરી કરો, ચૂકવો અને રસીદ મેળવો.',
    hi: 'हिसाब लगाएँ, भुगतान करें और रसीद लें।',
    ur: 'حساب لگائیں، ادا کریں اور رسید لیں۔',
  },
  'card.noNews.t': { en: 'No announcements yet', gu: 'હજી કોઈ જાહેરાત નથી', hi: 'अभी कोई घोषणा नहीं', ur: 'ابھی کوئی اعلان نہیں' },
  'card.noNews.d': { en: 'Jamaat news will appear here.', gu: 'જમાતના સમાચાર અહીં દેખાશે.', hi: 'जमात की खबरें यहाँ दिखेंगी।', ur: 'جماعت کی خبریں یہاں نظر آئیں گی۔' },

  // Services cards
  'card.welfare.t': { en: 'Welfare assistance', gu: 'સહાય', hi: 'सहायता', ur: 'امداد' },
  'card.welfare.d': {
    en: 'Medical, education or ration support. Tell us the need and track your case.',
    gu: 'તબીબી, શિક્ષણ અથવા રેશન મદદ. જરૂરિયાત જણાવો અને તમારો કેસ જુઓ.',
    hi: 'इलाज, पढ़ाई या राशन में मदद। ज़रूरत बताएँ और अपना केस देखें।',
    ur: 'علاج، تعلیم یا راشن میں مدد۔ ضرورت بتائیں اور اپنا کیس دیکھیں۔',
  },
  'card.scholarship.t': { en: 'Scholarship', gu: 'શિષ્યવૃત્તિ', hi: 'छात्रवृत्ति', ur: 'وظیفہ' },
  'card.scholarship.d': {
    en: 'Fees paid directly to your school or college once approved.',
    gu: 'મંજૂરી પછી ફી સીધી તમારી શાળા કે કોલેજને ચૂકવાય છે.',
    hi: 'मंज़ूरी के बाद फ़ीस सीधे आपके स्कूल या कॉलेज को दी जाती है।',
    ur: 'منظوری کے بعد فیس براہِ راست آپ کے اسکول یا کالج کو دی جاتی ہے۔',
  },
  'card.loan.t': { en: 'Education loan', gu: 'શિક્ષણ લોન', hi: 'शिक्षा ऋण', ur: 'تعلیمی قرض' },
  'card.loan.d': {
    en: 'Interest-free. Agree a monthly EMI with your family; repayment starts after a grace period.',
    gu: 'વ્યાજ વગર. પરિવાર સાથે માસિક હપ્તો નક્કી કરો; ચુકવણી થોડા સમય પછી શરૂ થાય છે.',
    hi: 'बिना ब्याज। परिवार के साथ मासिक किस्त तय करें; अदायगी कुछ समय बाद शुरू होती है।',
    ur: 'بغیر سود۔ گھر والوں کے ساتھ ماہانہ قسط طے کریں؛ ادائیگی کچھ مدت بعد شروع ہوتی ہے۔',
  },
  'card.applications.t': { en: 'My applications', gu: 'મારી અરજીઓ', hi: 'मेरे आवेदन', ur: 'میری درخواستیں' },
  'card.applications.d': {
    en: 'See where each request is, step by step.',
    gu: 'દરેક અરજી ક્યાં પહોંચી છે, પગલે પગલે જુઓ.',
    hi: 'हर आवेदन कहाँ तक पहुँचा, कदम-दर-कदम देखें।',
    ur: 'ہر درخواست کہاں تک پہنچی، قدم بہ قدم دیکھیں۔',
  },
  'card.profile.t': { en: 'Profile and household', gu: 'પ્રોફાઇલ અને પરિવાર', hi: 'प्रोफ़ाइल और परिवार', ur: 'پروفائل اور گھرانہ' },
  'card.profile.d': {
    en: 'Your membership details, family members and app language.',
    gu: 'તમારી સભ્યપદ વિગતો, પરિવારના સભ્યો અને એપની ભાષા.',
    hi: 'आपकी सदस्यता, परिवार के सदस्य और ऐप की भाषा।',
    ur: 'آپ کی رکنیت، گھر کے افراد اور ایپ کی زبان۔',
  },
  'card.blood.t': { en: 'Blood donors (SOS)', gu: 'રક્તદાતા (SOS)', hi: 'रक्तदाता (SOS)', ur: 'خون دینے والے (SOS)' },
  'card.blood.d': { en: 'Find matching donors nearby.', gu: 'નજીકના યોગ્ય દાતા શોધો.', hi: 'पास के मेल खाते दाता खोजें।', ur: 'قریب کے موزوں عطیہ دہندگان تلاش کریں۔' },

  // Give cards
  'card.khumsFull.t': { en: 'Full Khums calculator', gu: 'પૂરું ખુમ્સ કેલ્ક્યુલેટર', hi: 'पूरा ख़ुम्स कैलकुलेटर', ur: 'مکمل خمس کیلکولیٹر' },
  'card.khumsFull.d': {
    en: 'Set your year-end, save your calculation, track what is left to pay.',
    gu: 'તમારું વર્ષાંત નક્કી કરો, ગણતરી સાચવો, બાકી રકમ જુઓ.',
    hi: 'अपना साल का अंत तय करें, हिसाब सहेजें, बाकी रकम देखें।',
    ur: 'اپنا سال کا اختتام طے کریں، حساب محفوظ کریں، باقی رقم دیکھیں۔',
  },
  'card.payImam.t': { en: 'Pay Sehme Imam', gu: 'સહમે ઇમામ ચૂકવો', hi: 'सहमे इमाम अदा करें', ur: 'سہمِ امام ادا کریں' },
  'card.payImam.d': {
    en: "Goes only to institutions holding ijazah from a Marja'.",
    gu: 'ફક્ત મરજાની ઇજાઝત ધરાવતી સંસ્થાઓને જાય છે.',
    hi: 'सिर्फ़ मरजा की इजाज़त वाली संस्थाओं को जाता है।',
    ur: 'صرف مرجع کا اجازہ رکھنے والے اداروں کو جاتا ہے۔',
  },
  'card.paySadaat.t': { en: 'Pay Sehme Sadaat', gu: 'સહમે સાદાત ચૂકવો', hi: 'सहमे सादात अदा करें', ur: 'سہمِ سادات ادا کریں' },
  'card.paySadaat.d': {
    en: 'Goes only to verified Sadaat (Syed) cases. Pick a case to give.',
    gu: 'ફક્ત ચકાસાયેલા સાદાત (સૈયદ) કેસોને. આપવા માટે કેસ પસંદ કરો.',
    hi: 'सिर्फ़ जाँचे गए सादात (सैयद) केस को। देने के लिए केस चुनें।',
    ur: 'صرف تصدیق شدہ سادات (سید) کیسوں کو۔ دینے کے لیے کیس چنیں۔',
  },
  'card.sadaatCases.t': { en: 'Sadaat cases', gu: 'સાદાત કેસ', hi: 'सादात केस', ur: 'سادات کیس' },
  'card.nonSadaatCases.t': { en: 'Non-Sadaat cases', gu: 'બિન-સાદાત કેસ', hi: 'गैर-सादात केस', ur: 'غیر سادات کیس' },
  'card.cases.d': {
    en: 'Verified needs, approved by two Jamaat admins.',
    gu: 'ચકાસાયેલી જરૂરિયાતો, જમાતના બે અધિકારીઓએ મંજૂર કરેલી.',
    hi: 'जाँची गई ज़रूरतें, जमात के दो अधिकारियों ने मंज़ूर कीं।',
    ur: 'تصدیق شدہ ضرورتیں، جماعت کے دو منتظمین نے منظور کیں۔',
  },
  'card.lawajam.t': { en: 'Lawajam', gu: 'લવાઝમ', hi: 'लवाज़म', ur: 'لوازم' },
  'card.lawajam.d': {
    en: 'See what is due, pay and see receipts.',
    gu: 'બાકી રકમ જુઓ, ચૂકવો અને રસીદ જુઓ.',
    hi: 'बकाया देखें, भुगतान करें और रसीद देखें।',
    ur: 'واجب رقم دیکھیں، ادا کریں اور رسید دیکھیں۔',
  },

  // Learn cards
  'card.helpdesk.t': { en: 'Jamaat helpdesk', gu: 'જમાત હેલ્પડેસ્ક', hi: 'जमात हेल्पडेस्क', ur: 'جماعت ہیلپ ڈیسک' },
  'card.helpdesk.d': {
    en: 'Ask about loans, applications, giving and dues. Answers show their source.',
    gu: 'લોન, અરજીઓ, દાન અને લવાઝમ વિશે પૂછો. જવાબમાં સ્ત્રોત દેખાય છે.',
    hi: 'ऋण, आवेदन, दान और लवाज़म के बारे में पूछें। जवाब में स्रोत दिखता है।',
    ur: 'قرض، درخواستوں، عطیات اور لوازم کے بارے میں پوچھیں۔ جواب میں حوالہ دکھتا ہے۔',
  },
  'card.history.t': { en: 'History of the Jamaat', gu: 'જમાતનો ઇતિહાસ', hi: 'जमात का इतिहास', ur: 'جماعت کی تاریخ' },
  'card.history.d': { en: 'Our story, heritage and milestones.', gu: 'આપણી વાર્તા, વારસો અને સીમાચિહ્નો.', hi: 'हमारी कहानी, विरासत और उपलब्धियाँ।', ur: 'ہماری کہانی، ورثہ اور سنگِ میل۔' },
  'card.madressa.t': { en: 'eMadressa', gu: 'ઇ-મદ્રેસા', hi: 'ई-मदरसा', ur: 'ای-مدرسہ' },
  'card.madressa.d': {
    en: 'Online madressa lessons and progress for your children.',
    gu: 'તમારા બાળકો માટે ઓનલાઇન મદ્રેસા પાઠ અને પ્રગતિ.',
    hi: 'आपके बच्चों के लिए ऑनलाइन मदरसा पाठ और प्रगति।',
    ur: 'آپ کے بچوں کے لیے آن لائن مدرسہ اسباق اور پیش رفت۔',
  },
  'card.leap.t': { en: 'Jobs & Careers (LEAP)', gu: 'નોકરી અને કારકિર્દી (LEAP)', hi: 'नौकरी और करियर (LEAP)', ur: 'ملازمت اور روزگار (LEAP)' },
  'card.leap.d': {
    en: "Opens LEAP, the Jamaat's careers initiative.",
    gu: 'જમાતની કારકિર્દી પહેલ LEAP ખોલે છે.',
    hi: 'जमात की करियर पहल LEAP खोलता है।',
    ur: 'جماعت کا روزگار منصوبہ LEAP کھولتا ہے۔',
  },

  // Khums
  'khums.guidance': {
    en: "This is a guide only. Confirm with your Marja' or the Jamaat's alim.",
    gu: 'આ ફક્ત માર્ગદર્શન છે. તમારા મરજા અથવા જમાતના આલિમ સાથે ખાતરી કરો.',
    hi: 'यह सिर्फ़ मार्गदर्शन है। अपने मरजा या जमात के आलिम से पुष्टि करें।',
    ur: 'یہ صرف رہنمائی ہے۔ اپنے مرجع یا جماعت کے عالم سے تصدیق کریں۔',
  },
  'khums.estimate': { en: 'Khums estimate', gu: 'ખુમ્સ અંદાજ', hi: 'ख़ुम्स अनुमान', ur: 'خمس کا اندازہ' },
  'khums.savings': {
    en: 'Savings left at your Khums year-end',
    gu: 'ખુમ્સ વર્ષના અંતે બચેલી બચત',
    hi: 'ख़ुम्स साल के अंत में बची बचत',
    ur: 'خمس کے سال کے آخر میں بچی ہوئی رقم',
  },
  'khums.due': { en: 'Khums due (20%)', gu: 'ભરવાનું ખુમ્સ (20%)', hi: 'देय ख़ुम्स (20%)', ur: 'واجب خمس (20%)' },
  'khums.imam': { en: 'Sehme Imam', gu: 'સહમે ઇમામ', hi: 'सहमे इमाम', ur: 'سہمِ امام' },
  'khums.sadaat': { en: 'Sehme Sadaat', gu: 'સહમે સાદાત', hi: 'सहमे सादात', ur: 'سہمِ سادات' },

  // Profile
  'profile.title': { en: 'Profile and household', gu: 'પ્રોફાઇલ અને પરિવાર', hi: 'प्रोफ़ाइल और परिवार', ur: 'پروفائل اور گھرانہ' },
  'profile.you': { en: 'Your details', gu: 'તમારી વિગતો', hi: 'आपकी जानकारी', ur: 'آپ کی تفصیلات' },
  'profile.name': { en: 'Name', gu: 'નામ', hi: 'नाम', ur: 'نام' },
  'profile.phone': { en: 'Mobile', gu: 'મોબાઇલ', hi: 'मोबाइल', ur: 'موبائل' },
  'profile.area': { en: 'Area', gu: 'વિસ્તાર', hi: 'इलाक़ा', ur: 'علاقہ' },
  'profile.jamaatNo': { en: 'Jamaat number', gu: 'જમાત નંબર', hi: 'जमात नंबर', ur: 'جماعت نمبر' },
  'profile.membership': { en: 'Membership', gu: 'સભ્યપદ', hi: 'सदस्यता', ur: 'رکنیت' },
  'profile.verified': { en: 'Verified by the Jamaat', gu: 'જમાતે ચકાસેલું', hi: 'जमात द्वारा सत्यापित', ur: 'جماعت سے تصدیق شدہ' },
  'profile.waiting': { en: 'Waiting for a Jamaat verifier', gu: 'જમાતના ચકાસણીકર્તાની રાહ', hi: 'जमात के सत्यापनकर्ता का इंतज़ार', ur: 'جماعت کے تصدیق کنندہ کا انتظار' },
  'profile.household': { en: 'Your household', gu: 'તમારો પરિવાર', hi: 'आपका परिवार', ur: 'آپ کا گھرانہ' },
  'profile.me': { en: 'you', gu: 'તમે', hi: 'आप', ur: 'آپ' },
  'profile.noHousehold': {
    en: 'Not linked to a household yet. A Jamaat verifier links you when they confirm your membership.',
    gu: 'હજી પરિવાર સાથે જોડાયેલું નથી. જમાતના ચકાસણીકર્તા સભ્યપદ પુષ્ટિ કરે ત્યારે જોડશે.',
    hi: 'अभी परिवार से नहीं जुड़ा। जमात के सत्यापनकर्ता सदस्यता की पुष्टि करते समय जोड़ेंगे।',
    ur: 'ابھی گھرانے سے نہیں جڑا۔ جماعت کا تصدیق کنندہ رکنیت کی تصدیق کے وقت جوڑے گا۔',
  },
  'profile.languageHint': {
    en: 'The app menus change straight away. Notices from the Jamaat stay in the language they were written in.',
    gu: 'એપના મેનુ તરત બદલાય છે. જમાતની સૂચનાઓ જે ભાષામાં લખાઈ તે જ ભાષામાં રહે છે.',
    hi: 'ऐप के मेनू तुरंत बदल जाते हैं। जमात की सूचनाएँ उसी भाषा में रहती हैं जिसमें लिखी गईं।',
    ur: 'ایپ کے مینو فوراً بدل جاتے ہیں۔ جماعت کی اطلاعات اسی زبان میں رہتی ہیں جس میں لکھی گئیں۔',
  },

  // Receipts
  'receipt.view': { en: 'View receipt', gu: 'રસીદ જુઓ', hi: 'रसीद देखें', ur: 'رسید دیکھیں' },
} as const satisfies Record<string, Entry>;

export type StringKey = keyof typeof STRINGS;

/** Text for a key in a language, with {name}-style values filled in. Falls back to English. */
export function translate(lang: Lang, key: StringKey, vars?: Record<string, string>): string {
  const entry: Entry = STRINGS[key];
  let text = entry[lang] || entry.en;
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, v);
  return text;
}

export const asLang = (value: string | null | undefined): Lang =>
  value === 'gu' || value === 'hi' || value === 'ur' ? value : 'en';
