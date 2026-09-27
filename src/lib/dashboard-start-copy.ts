// The dashboard's no-exam block (27 Sep 2026, founder: content first) — search-free doors, never a demand to pick an exam. en / hi / te.
import { pickCopy, type CopyLocale } from "@/lib/ui-locale-copy";

export interface DashboardStartCopy {
  heading: string;
  body: string;
  ask: string;
  pickExam: string;
  doors: ReadonlyArray<{ href: string; label: string }>;
}

const HREF = ["/schooling", "/exams/entrance", "/exams/browse", "/colleges", "/scholarships", "/careers"] as const;
const mk = (labels: readonly string[]) => HREF.map((href, i) => ({ href, label: labels[i] }));

const C: Readonly<Record<CopyLocale, DashboardStartCopy>> = {
  en: {
    heading: "What do you want to study today?",
    body: "Ask Shishya any study question, or open a section. Mocks, weak-topic tracking and a daily plan start when you pick an exam — that is optional.",
    ask: "Ask Shishya →",
    pickExam: "Pick an exam (optional) →",
    doors: mk(["School", "Entrance exams", "Government exams", "Colleges", "Scholarships", "Careers"]),
  },
  hi: {
    heading: "आज क्या पढ़ना है?",
    body: "Shishya से पढ़ाई का कोई भी सवाल पूछिए, या कोई सेक्शन खोलिए। मॉक, कमज़ोर टॉपिक पर नज़र और रोज़ का प्लान तब शुरू होते हैं जब आप कोई परीक्षा चुनते हैं — यह ज़रूरी नहीं।",
    ask: "Shishya से पूछिए →",
    pickExam: "परीक्षा चुनें (वैकल्पिक) →",
    doors: mk(["स्कूल", "प्रवेश परीक्षाएँ", "सरकारी परीक्षाएँ", "कॉलेज", "छात्रवृत्ति", "करियर"]),
  },
  te: {
    heading: "ఈ రోజు ఏం చదవాలనుకుంటున్నారు?",
    body: "Shishya ని ఏ చదువు ప్రశ్న అయినా అడగండి, లేదా ఒక విభాగాన్ని తెరవండి. మాక్‌లు, బలహీన టాపిక్‌ల ట్రాకింగ్, రోజువారీ ప్లాన్ — మీరు ఒక పరీక్షను ఎంచుకున్నప్పుడు మొదలవుతాయి; అది తప్పనిసరి కాదు.",
    ask: "Shishya ని అడగండి →",
    pickExam: "పరీక్షను ఎంచుకోండి (ఐచ్ఛికం) →",
    doors: mk(["స్కూల్", "ప్రవేశ పరీక్షలు", "ప్రభుత్వ పరీక్షలు", "కాలేజీలు", "స్కాలర్‌షిప్‌లు", "కెరీర్లు"]),
  },
};

export function dashboardStartCopy(locale: string | null | undefined): DashboardStartCopy {
  return pickCopy(C, locale);
}
