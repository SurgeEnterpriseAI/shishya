// Single source of truth for the 28 states + 8 UTs of India.
// Used by the StatePicker UI and the state-exams seeder. Pure data — no
// Prisma import here so it's safe to import from client-side bundles.

export interface IndianState {
  code: string;
  name: string;
  type: "state" | "ut";
  /** Native-script display name (used in StatePicker for visual richness). */
  native?: string;
}

export const INDIAN_STATES: IndianState[] = [
  // ── 28 States ──────────────────────────────────────────────────────────
  { code: "AP", name: "Andhra Pradesh",      type: "state", native: "ఆంధ్రప్రదేశ్" },
  { code: "AR", name: "Arunachal Pradesh",   type: "state" },
  { code: "AS", name: "Assam",               type: "state", native: "অসম" },
  { code: "BR", name: "Bihar",               type: "state", native: "बिहार" },
  { code: "CG", name: "Chhattisgarh",        type: "state", native: "छत्तीसगढ़" },
  { code: "GA", name: "Goa",                 type: "state", native: "गोंय" },
  { code: "GJ", name: "Gujarat",             type: "state", native: "ગુજરાત" },
  { code: "HR", name: "Haryana",             type: "state", native: "हरियाणा" },
  { code: "HP", name: "Himachal Pradesh",    type: "state", native: "हिमाचल प्रदेश" },
  { code: "JH", name: "Jharkhand",           type: "state", native: "झारखंड" },
  { code: "KA", name: "Karnataka",           type: "state", native: "ಕರ್ನಾಟಕ" },
  { code: "KL", name: "Kerala",              type: "state", native: "കേരളം" },
  { code: "MP", name: "Madhya Pradesh",      type: "state", native: "मध्य प्रदेश" },
  { code: "MH", name: "Maharashtra",         type: "state", native: "महाराष्ट्र" },
  { code: "MN", name: "Manipur",             type: "state", native: "মণিপুর" },
  { code: "ML", name: "Meghalaya",           type: "state" },
  { code: "MZ", name: "Mizoram",             type: "state" },
  { code: "NL", name: "Nagaland",            type: "state" },
  { code: "OD", name: "Odisha",              type: "state", native: "ଓଡ଼ିଶା" },
  { code: "PB", name: "Punjab",              type: "state", native: "ਪੰਜਾਬ" },
  { code: "RJ", name: "Rajasthan",           type: "state", native: "राजस्थान" },
  { code: "SK", name: "Sikkim",              type: "state" },
  { code: "TN", name: "Tamil Nadu",          type: "state", native: "தமிழ்நாடு" },
  { code: "TS", name: "Telangana",           type: "state", native: "తెలంగాణ" },
  { code: "TR", name: "Tripura",             type: "state" },
  { code: "UP", name: "Uttar Pradesh",       type: "state", native: "उत्तर प्रदेश" },
  { code: "UK", name: "Uttarakhand",         type: "state", native: "उत्तराखंड" },
  { code: "WB", name: "West Bengal",         type: "state", native: "পশ্চিমবঙ্গ" },
  // ── 8 Union Territories ────────────────────────────────────────────────
  { code: "AN", name: "Andaman & Nicobar Islands", type: "ut" },
  { code: "CH", name: "Chandigarh",          type: "ut" },
  { code: "DN", name: "Dadra & Nagar Haveli and Daman & Diu", type: "ut" },
  { code: "DL", name: "Delhi",               type: "ut", native: "दिल्ली" },
  { code: "JK", name: "Jammu & Kashmir",     type: "ut", native: "جموں و کشمیر" },
  { code: "LA", name: "Ladakh",              type: "ut" },
  { code: "LD", name: "Lakshadweep",         type: "ut" },
  { code: "PY", name: "Puducherry",          type: "ut", native: "புதுச்சேரி" },
];
