// State-level SEO/i18n helpers.
//
// Single source of truth for: ISO state code → full name → primary native
// language(s) → Hindi name. Used by /exams/[code] (per-exam SEO metadata)
// and /exams/state/[state] (state-level landing pages) so every state's
// exam set ranks for searches in BOTH English and the native language.

export interface StateInfo {
  code: string;        // ISO 3166-2 subdivision (without IN- prefix)
  name: string;        // English name
  nativeName: string;  // name in the state's primary language
  hindiName: string;   // Devanagari name for hi-belt search
  // Primary written language(s) used in that state's exam papers, in our
  // Language enum (matches prisma + i18n locales). Order = priority.
  languages: string[];
}

export const STATES: Record<string, StateInfo> = {
  AN: { code: "AN", name: "Andaman and Nicobar Islands", nativeName: "Andaman and Nicobar Islands", hindiName: "अंडमान और निकोबार द्वीप समूह", languages: ["EN", "HI"] },
  AP: { code: "AP", name: "Andhra Pradesh", nativeName: "ఆంధ్రప్రదేశ్", hindiName: "आंध्र प्रदेश", languages: ["TE", "EN", "HI"] },
  AR: { code: "AR", name: "Arunachal Pradesh", nativeName: "Arunachal Pradesh", hindiName: "अरुणाचल प्रदेश", languages: ["EN", "HI"] },
  AS: { code: "AS", name: "Assam", nativeName: "অসম", hindiName: "असम", languages: ["BN", "EN", "HI"] },
  BR: { code: "BR", name: "Bihar", nativeName: "बिहार", hindiName: "बिहार", languages: ["HI", "EN"] },
  CG: { code: "CG", name: "Chhattisgarh", nativeName: "छत्तीसगढ़", hindiName: "छत्तीसगढ़", languages: ["HI", "EN"] },
  CH: { code: "CH", name: "Chandigarh", nativeName: "ਚੰਡੀਗੜ੍ਹ", hindiName: "चंडीगढ़", languages: ["PA", "EN", "HI"] },
  DL: { code: "DL", name: "Delhi", nativeName: "दिल्ली", hindiName: "दिल्ली", languages: ["HI", "EN"] },
  DN: { code: "DN", name: "Dadra & Nagar Haveli and Daman & Diu", nativeName: "Dadra & Nagar Haveli", hindiName: "दादरा और नगर हवेली", languages: ["GU", "EN", "HI"] },
  GA: { code: "GA", name: "Goa", nativeName: "गोंय / Goa", hindiName: "गोवा", languages: ["EN", "HI"] },
  GJ: { code: "GJ", name: "Gujarat", nativeName: "ગુજરાત", hindiName: "गुजरात", languages: ["GU", "EN", "HI"] },
  HP: { code: "HP", name: "Himachal Pradesh", nativeName: "हिमाचल प्रदेश", hindiName: "हिमाचल प्रदेश", languages: ["HI", "EN"] },
  HR: { code: "HR", name: "Haryana", nativeName: "हरियाणा", hindiName: "हरियाणा", languages: ["HI", "EN"] },
  JH: { code: "JH", name: "Jharkhand", nativeName: "झारखंड", hindiName: "झारखंड", languages: ["HI", "EN"] },
  JK: { code: "JK", name: "Jammu and Kashmir", nativeName: "जम्मू और कश्मीर", hindiName: "जम्मू और कश्मीर", languages: ["HI", "EN"] },
  KA: { code: "KA", name: "Karnataka", nativeName: "ಕರ್ನಾಟಕ", hindiName: "कर्नाटक", languages: ["KN", "EN", "HI"] },
  KL: { code: "KL", name: "Kerala", nativeName: "കേരളം", hindiName: "केरल", languages: ["ML", "EN", "HI"] },
  LA: { code: "LA", name: "Ladakh", nativeName: "Ladakh", hindiName: "लद्दाख", languages: ["EN", "HI"] },
  LD: { code: "LD", name: "Lakshadweep", nativeName: "ലക്ഷദ്വീപ്", hindiName: "लक्षद्वीप", languages: ["ML", "EN", "HI"] },
  MH: { code: "MH", name: "Maharashtra", nativeName: "महाराष्ट्र", hindiName: "महाराष्ट्र", languages: ["MR", "EN", "HI"] },
  ML: { code: "ML", name: "Meghalaya", nativeName: "Meghalaya", hindiName: "मेघालय", languages: ["EN", "HI"] },
  MN: { code: "MN", name: "Manipur", nativeName: "মণিপুর", hindiName: "मणिपुर", languages: ["EN", "HI"] },
  MP: { code: "MP", name: "Madhya Pradesh", nativeName: "मध्य प्रदेश", hindiName: "मध्य प्रदेश", languages: ["HI", "EN"] },
  MZ: { code: "MZ", name: "Mizoram", nativeName: "Mizoram", hindiName: "मिज़ोरम", languages: ["EN", "HI"] },
  NL: { code: "NL", name: "Nagaland", nativeName: "Nagaland", hindiName: "नागालैंड", languages: ["EN", "HI"] },
  OD: { code: "OD", name: "Odisha", nativeName: "ଓଡ଼ିଶା", hindiName: "ओडिशा", languages: ["EN", "HI"] }, // Odia covered as future locale add
  PB: { code: "PB", name: "Punjab", nativeName: "ਪੰਜਾਬ", hindiName: "पंजाब", languages: ["PA", "EN", "HI"] },
  PY: { code: "PY", name: "Puducherry", nativeName: "புதுச்சேரி", hindiName: "पुदुचेरी", languages: ["TA", "EN", "HI"] },
  RJ: { code: "RJ", name: "Rajasthan", nativeName: "राजस्थान", hindiName: "राजस्थान", languages: ["HI", "EN"] },
  SK: { code: "SK", name: "Sikkim", nativeName: "सिक्किम", hindiName: "सिक्किम", languages: ["EN", "HI"] },
  TN: { code: "TN", name: "Tamil Nadu", nativeName: "தமிழ்நாடு", hindiName: "तमिलनाडु", languages: ["TA", "EN", "HI"] },
  TR: { code: "TR", name: "Tripura", nativeName: "ত্রিপুরা", hindiName: "त्रिपुरा", languages: ["BN", "EN", "HI"] },
  TS: { code: "TS", name: "Telangana", nativeName: "తెలంగాణ", hindiName: "तेलंगाना", languages: ["TE", "EN", "HI"] },
  UK: { code: "UK", name: "Uttarakhand", nativeName: "उत्तराखंड", hindiName: "उत्तराखंड", languages: ["HI", "EN"] },
  UP: { code: "UP", name: "Uttar Pradesh", nativeName: "उत्तर प्रदेश", hindiName: "उत्तर प्रदेश", languages: ["HI", "EN"] },
  WB: { code: "WB", name: "West Bengal", nativeName: "পশ্চিমবঙ্গ", hindiName: "पश्चिम बंगाल", languages: ["BN", "EN", "HI"] },
};

export function stateInfo(code: string | null | undefined): StateInfo | null {
  if (!code) return null;
  return STATES[code] ?? null;
}

// URL slug for state index pages (/exams/state/<slug>).
// "Tamil Nadu" -> "tamil-nadu", "Madhya Pradesh" -> "madhya-pradesh".
export function stateSlug(code: string): string {
  const info = STATES[code];
  if (!info) return code.toLowerCase();
  return info.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Resolve a slug back to its state code. Used by /exams/state/[slug]/page.tsx.
export function stateCodeFromSlug(slug: string): string | null {
  for (const [code, info] of Object.entries(STATES)) {
    if (stateSlug(code) === slug) return code;
  }
  return null;
}

// Human-readable language name from our enum code (matches Language enum
// in prisma + locales in src/lib/i18n.ts but those are lowercased).
const LANG_NAMES: Record<string, { en: string; native: string }> = {
  EN: { en: "English",   native: "English" },
  HI: { en: "Hindi",     native: "हिन्दी" },
  TE: { en: "Telugu",    native: "తెలుగు" },
  TA: { en: "Tamil",     native: "தமிழ்" },
  KN: { en: "Kannada",   native: "ಕನ್ನಡ" },
  ML: { en: "Malayalam", native: "മലയാളം" },
  MR: { en: "Marathi",   native: "मराठी" },
  BN: { en: "Bengali",   native: "বাংলা" },
  GU: { en: "Gujarati",  native: "ગુજરાતી" },
  PA: { en: "Punjabi",   native: "ਪੰਜਾਬੀ" },
};

export function languageName(code: string): { en: string; native: string } {
  return LANG_NAMES[code] ?? { en: code, native: code };
}

// Join language names for SEO copy: ["TA","EN","HI"] -> "Tamil, English and Hindi"
export function languageList(codes: string[]): string {
  const names = codes.map((c) => languageName(c).en);
  if (names.length === 0) return "English";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
