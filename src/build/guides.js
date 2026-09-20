// Guide registry - Instruction Sheet A section 2.1. Order is significant.
export const GUIDES = [
  { order: 1, file: 'Practice_Management.md', slug: 'practice-management', title: 'Practice Management' },
  { order: 2, file: 'Trust_Accounting.md', slug: 'trust-accounting', title: 'Trust Accounting' },
  { order: 3, file: 'Anti_Money_Laundering.md', slug: 'anti-money-laundering', title: 'Anti-Money Laundering and Counter-Terrorism Financing' },
  { order: 4, file: 'Risk_Management.md', slug: 'risk-management', title: 'Risk Management' },
  { order: 5, file: 'Cyber_Security.md', slug: 'cyber-security', title: 'Cyber Security and IT' },
  { order: 6, file: 'Stress_Management.md', slug: 'stress-management', title: 'Stress Management and Wellbeing' },
  { order: 7, file: 'Tax_and_Accounting.md', slug: 'tax-and-accounting', title: 'Tax and Accounting' },
  { order: 8, file: 'Attracting_and_Selecting_Talent.md', slug: 'attracting-and-selecting-talent', title: 'Attracting and Selecting Talent' },
  { order: 9, file: 'People_Management_and_Supervision.md', slug: 'people-management-and-supervision', title: 'People Management and Effective Supervision' },
  { order: 10, file: 'Partnership_Management.md', slug: 'partnership-management', title: 'Partnership Management' },
];

// Bolded names that are treated as cross references (Sheet A rule 4.4):
// the full display titles plus the short forms used in the text.
export const CROSS_REF_NAMES = {
  'Practice Management': 'practice-management',
  'Trust Accounting': 'trust-accounting',
  'Anti-Money Laundering and Counter-Terrorism Financing': 'anti-money-laundering',
  'Anti-Money Laundering': 'anti-money-laundering',
  'Risk Management': 'risk-management',
  'Cyber Security and IT': 'cyber-security',
  'Cyber Security': 'cyber-security',
  'Stress Management and Wellbeing': 'stress-management',
  'Stress Management': 'stress-management',
  'Tax and Accounting': 'tax-and-accounting',
  'Attracting and Selecting Talent': 'attracting-and-selecting-talent',
  'People Management and Effective Supervision': 'people-management-and-supervision',
  'People Management': 'people-management-and-supervision',
  'Partnership Management': 'partnership-management',
};

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
