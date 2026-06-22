export const VISA_GROUPS = {
  'Employment-Based': [
    'H-1B', 'H-1B1', 'H-1B Transfer', 'H-1B Cap Exempt', 'H-1B Extension',
    'H-2B', 'H-3', 'L-1A', 'L-1B', 'L Blanket', 'O-1A', 'O-1B', 'O-2',
    'P-1A', 'P-1B', 'P-2', 'P-3', 'TN', 'E-3', 'EB-1A', 'EB-1B', 'EB-1C',
    'EB-2 PERM', 'EB-2 NIW', 'EB-3', 'EB-3 PERM', 'AC21 Portability',
    'PERM Audit Defense', 'J-1', 'J-1 Waiver', 'F-1 OPT/STEM OPT',
    'E-1', 'E-2', 'EB-5'
  ],
  'Investor': ['E-1', 'E-2', 'EB-5'],
  'Family & Marriage': [
    'K-1', 'K-3', 'CR-1/IR-1', 'IR-2/CR-2', 'I-130', 'I-485', 'Consular Processing'
  ],
  'Green Card & Citizenship': [
    'I-751', 'I-131', 'PERM', 'Green Card & Naturalization', 'Naturalization'
  ],
  'Humanitarian': [
    'Asylum', 'VAWA', 'U Visa', 'TPS', 'N-400', 'Appeals to AAO or BIA',
    'Advance Parole/Travel Documents', 'Employment-Based Green Cards'
  ]
} as const

export const INDUSTRIES = [
  'Tech', 'AI/Machine Learning', 'Life Sciences/Bio-Tech', 'Academics',
  'Healthcare/Pharma', 'Medical Professionals', 'Entrepreneurs/Founders',
  'Artists/Performers', 'Cultural', 'Fashion/Design', 'Sports/Athletes',
  'Influencers/Social Media', 'Engineering (Non-Tech)', 'Social Impact/Non-Profits',
  'Financial Services', 'Family Immigration', 'Marriage Immigration', 'Energy',
  'Architecture/Urban Planning'
] as const

export const CASE_STRENGTHS = ['Strong', 'Medium', 'Weak'] as const

export const CASE_CAPABILITIES = [
  'RFEs', 'Complex RFEs', 'NOIDs', 'Legal Questions', 'Rush Cases'
] as const

export const ALL_VISAS = [
  ...new Set([
    ...VISA_GROUPS['Employment-Based'],
    ...VISA_GROUPS['Investor'],
    ...VISA_GROUPS['Family & Marriage'],
    ...VISA_GROUPS['Green Card & Citizenship'],
    ...VISA_GROUPS['Humanitarian']
  ])
]

export const VISA_CATEGORIES = Object.keys(VISA_GROUPS) as (keyof typeof VISA_GROUPS)[]
