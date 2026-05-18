// Recognized institutional email domains for Domain Expert credential
// verification. Same source-of-truth pattern as colleges-data.ts /
// schooling-data.ts: hardcoded TS so additions land via PR with a
// visible diff, no runtime drift.
//
// When the institutional-email verification path eventually ships
// (blocked on email infra — needs Resend or SES with SPF/DKIM on
// shishya.in), the verification flow will:
//   1. User claims affiliation with a domain in this list
//   2. We send a one-time link to user@domain
//   3. On click, we mark the credential VERIFIED via "institutional_email"
//
// Until email is wired up, this list is informational — surfaced on
// the user profile page so people see WHICH affiliations would be
// recognized once the email path opens.

export type CredentialDomain =
  | "civil-services"
  | "iit-nit-iiit"
  | "medical"
  | "iim-management"
  | "nlu-law"
  | "defence"
  | "banking"
  | "railways"
  | "teaching"
  | "research"
  | "foreign-universities";

export interface InstitutionalDomain {
  // The email domain users register with (no @ prefix).
  emailDomain: string;
  // Display label.
  institution: string;
  // Which credential domain this email proves.
  credentialDomain: CredentialDomain;
  // Free-text city / region for display.
  location?: string;
}

// Curated set. Start with the highest-prestige + highest-coverage
// domains. Add via PR as new institutions come up.
export const INSTITUTIONAL_DOMAINS: InstitutionalDomain[] = [
  // ── IIT system ───────────────────────────────────────────────────
  { emailDomain: "iitm.ac.in",     institution: "IIT Madras",      credentialDomain: "iit-nit-iiit", location: "Chennai" },
  { emailDomain: "smail.iitm.ac.in", institution: "IIT Madras (student)", credentialDomain: "iit-nit-iiit", location: "Chennai" },
  { emailDomain: "iitd.ac.in",     institution: "IIT Delhi",       credentialDomain: "iit-nit-iiit", location: "New Delhi" },
  { emailDomain: "iitb.ac.in",     institution: "IIT Bombay",      credentialDomain: "iit-nit-iiit", location: "Mumbai" },
  { emailDomain: "iitk.ac.in",     institution: "IIT Kanpur",      credentialDomain: "iit-nit-iiit", location: "Kanpur" },
  { emailDomain: "iitkgp.ac.in",   institution: "IIT Kharagpur",   credentialDomain: "iit-nit-iiit", location: "Kharagpur" },
  { emailDomain: "iitr.ac.in",     institution: "IIT Roorkee",     credentialDomain: "iit-nit-iiit", location: "Roorkee" },
  { emailDomain: "iitg.ac.in",     institution: "IIT Guwahati",    credentialDomain: "iit-nit-iiit", location: "Guwahati" },
  { emailDomain: "iith.ac.in",     institution: "IIT Hyderabad",   credentialDomain: "iit-nit-iiit", location: "Hyderabad" },
  { emailDomain: "iitbhu.ac.in",   institution: "IIT (BHU) Varanasi", credentialDomain: "iit-nit-iiit", location: "Varanasi" },
  { emailDomain: "iitism.ac.in",   institution: "IIT (ISM) Dhanbad", credentialDomain: "iit-nit-iiit", location: "Dhanbad" },
  { emailDomain: "iiti.ac.in",     institution: "IIT Indore",      credentialDomain: "iit-nit-iiit", location: "Indore" },
  { emailDomain: "iitmandi.ac.in", institution: "IIT Mandi",       credentialDomain: "iit-nit-iiit", location: "Mandi" },
  { emailDomain: "iitrpr.ac.in",   institution: "IIT Ropar",       credentialDomain: "iit-nit-iiit", location: "Rupnagar" },
  { emailDomain: "iitgn.ac.in",    institution: "IIT Gandhinagar", credentialDomain: "iit-nit-iiit", location: "Gandhinagar" },
  { emailDomain: "iitj.ac.in",     institution: "IIT Jodhpur",     credentialDomain: "iit-nit-iiit", location: "Jodhpur" },
  { emailDomain: "iitbbs.ac.in",   institution: "IIT Bhubaneswar", credentialDomain: "iit-nit-iiit", location: "Bhubaneswar" },

  // ── NIT system (sample) ──────────────────────────────────────────
  { emailDomain: "nitt.edu",       institution: "NIT Trichy",      credentialDomain: "iit-nit-iiit", location: "Tiruchirappalli" },
  { emailDomain: "nitrkl.ac.in",   institution: "NIT Rourkela",    credentialDomain: "iit-nit-iiit", location: "Rourkela" },
  { emailDomain: "nitk.edu.in",    institution: "NIT Surathkal",   credentialDomain: "iit-nit-iiit", location: "Mangaluru" },
  { emailDomain: "nitw.ac.in",     institution: "NIT Warangal",    credentialDomain: "iit-nit-iiit", location: "Warangal" },
  { emailDomain: "nitc.ac.in",     institution: "NIT Calicut",     credentialDomain: "iit-nit-iiit", location: "Kozhikode" },

  // ── IIITs ────────────────────────────────────────────────────────
  { emailDomain: "iiit.ac.in",     institution: "IIIT Hyderabad",  credentialDomain: "iit-nit-iiit", location: "Hyderabad" },
  { emailDomain: "iiita.ac.in",    institution: "IIIT Allahabad",  credentialDomain: "iit-nit-iiit", location: "Prayagraj" },
  { emailDomain: "iiitb.ac.in",    institution: "IIIT Bangalore",  credentialDomain: "iit-nit-iiit", location: "Bengaluru" },

  // ── IISc + IISERs ────────────────────────────────────────────────
  { emailDomain: "iisc.ac.in",     institution: "IISc Bangalore",  credentialDomain: "research", location: "Bengaluru" },
  { emailDomain: "iiserpune.ac.in", institution: "IISER Pune",     credentialDomain: "research", location: "Pune" },
  { emailDomain: "iiserkol.ac.in", institution: "IISER Kolkata",   credentialDomain: "research", location: "Mohanpur" },
  { emailDomain: "iisermohali.ac.in", institution: "IISER Mohali", credentialDomain: "research", location: "Mohali" },

  // ── Civil services ───────────────────────────────────────────────
  { emailDomain: "upsc.gov.in",    institution: "UPSC",            credentialDomain: "civil-services", location: "New Delhi" },
  { emailDomain: "ssc.nic.in",     institution: "SSC",             credentialDomain: "civil-services", location: "New Delhi" },
  { emailDomain: "nic.in",         institution: "Government of India (NIC)", credentialDomain: "civil-services" },
  { emailDomain: "gov.in",         institution: "Government of India", credentialDomain: "civil-services" },

  // ── AIIMS + medical ──────────────────────────────────────────────
  { emailDomain: "aiims.edu",      institution: "AIIMS Delhi",     credentialDomain: "medical", location: "New Delhi" },
  { emailDomain: "aiimsjodhpur.edu.in", institution: "AIIMS Jodhpur", credentialDomain: "medical", location: "Jodhpur" },
  { emailDomain: "pgimer.edu.in",  institution: "PGIMER Chandigarh", credentialDomain: "medical", location: "Chandigarh" },
  { emailDomain: "cmcvellore.ac.in", institution: "CMC Vellore",   credentialDomain: "medical", location: "Vellore" },
  { emailDomain: "jipmer.edu.in",  institution: "JIPMER",          credentialDomain: "medical", location: "Puducherry" },
  { emailDomain: "nimhans.ac.in",  institution: "NIMHANS",         credentialDomain: "medical", location: "Bengaluru" },

  // ── IIMs ─────────────────────────────────────────────────────────
  { emailDomain: "iima.ac.in",     institution: "IIM Ahmedabad",   credentialDomain: "iim-management", location: "Ahmedabad" },
  { emailDomain: "iimb.ac.in",     institution: "IIM Bangalore",   credentialDomain: "iim-management", location: "Bengaluru" },
  { emailDomain: "iimcal.ac.in",   institution: "IIM Calcutta",    credentialDomain: "iim-management", location: "Kolkata" },
  { emailDomain: "iiml.ac.in",     institution: "IIM Lucknow",     credentialDomain: "iim-management", location: "Lucknow" },
  { emailDomain: "iimk.ac.in",     institution: "IIM Kozhikode",   credentialDomain: "iim-management", location: "Kozhikode" },
  { emailDomain: "iimidr.ac.in",   institution: "IIM Indore",      credentialDomain: "iim-management", location: "Indore" },
  { emailDomain: "iimshillong.ac.in", institution: "IIM Shillong", credentialDomain: "iim-management", location: "Shillong" },
  { emailDomain: "iimtrichy.ac.in", institution: "IIM Trichy",     credentialDomain: "iim-management", location: "Tiruchirappalli" },
  { emailDomain: "xlri.ac.in",     institution: "XLRI Jamshedpur", credentialDomain: "iim-management", location: "Jamshedpur" },

  // ── NLUs ─────────────────────────────────────────────────────────
  { emailDomain: "nls.ac.in",      institution: "NLSIU Bangalore", credentialDomain: "nlu-law", location: "Bengaluru" },
  { emailDomain: "nludelhi.ac.in", institution: "NLU Delhi",       credentialDomain: "nlu-law", location: "New Delhi" },
  { emailDomain: "nalsar.ac.in",   institution: "NALSAR Hyderabad", credentialDomain: "nlu-law", location: "Hyderabad" },
  { emailDomain: "nujs.edu",       institution: "NUJS Kolkata",    credentialDomain: "nlu-law", location: "Kolkata" },
  { emailDomain: "gnlu.ac.in",     institution: "GNLU Gandhinagar", credentialDomain: "nlu-law", location: "Gandhinagar" },

  // ── Defence ──────────────────────────────────────────────────────
  { emailDomain: "indianarmy.nic.in", institution: "Indian Army",  credentialDomain: "defence" },
  { emailDomain: "indiannavy.nic.in", institution: "Indian Navy",  credentialDomain: "defence" },
  { emailDomain: "iaf.nic.in",     institution: "Indian Air Force", credentialDomain: "defence" },

  // ── Banking (RBI + public-sector banks) ──────────────────────────
  { emailDomain: "rbi.org.in",     institution: "Reserve Bank of India", credentialDomain: "banking" },
  { emailDomain: "sbi.co.in",      institution: "State Bank of India", credentialDomain: "banking" },
  { emailDomain: "pnb.co.in",      institution: "Punjab National Bank", credentialDomain: "banking" },

  // ── Railways ─────────────────────────────────────────────────────
  { emailDomain: "indianrailways.gov.in", institution: "Indian Railways", credentialDomain: "railways" },
  { emailDomain: "rrcb.gov.in",    institution: "RRB",             credentialDomain: "railways" },
];

export const CREDENTIAL_DOMAIN_LABELS: Record<CredentialDomain, string> = {
  "civil-services":     "Civil Services (UPSC / state PSCs)",
  "iit-nit-iiit":       "IIT / NIT / IIIT engineering",
  "medical":            "AIIMS / JIPMER / medical institutions",
  "iim-management":     "IIM + management institutions",
  "nlu-law":            "NLU + law institutions",
  "defence":            "Defence services",
  "banking":            "Banking sector",
  "railways":           "Railways",
  "teaching":           "Teaching (TET cleared, currently teaching)",
  "research":           "Research (PhD holders, currently researching)",
  "foreign-universities": "Foreign universities (verified students/alumni)",
};

/** Look up an institutional domain by email-domain part. */
export function findInstitutionalDomain(emailDomain: string): InstitutionalDomain | undefined {
  return INSTITUTIONAL_DOMAINS.find((d) => d.emailDomain.toLowerCase() === emailDomain.toLowerCase());
}

/** Extract the domain part from a full email. */
export function extractEmailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0 || at === email.length - 1) return null;
  return email.slice(at + 1).toLowerCase();
}

/** Check if a full email matches any recognized institutional domain. */
export function isInstitutionalEmail(email: string): boolean {
  const dom = extractEmailDomain(email);
  if (!dom) return false;
  return findInstitutionalDomain(dom) !== undefined;
}
