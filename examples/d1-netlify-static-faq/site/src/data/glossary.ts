export interface GlossaryTerm {
  token: string;
  href: string;
  expansion: string;
}

export const glossary: readonly GlossaryTerm[] = [
  {
    token: 'FAQ',
    href: 'https://www.irs.gov/faqs',
    expansion: 'frequently asked questions',
  },
  {
    token: 'EIN',
    href: 'https://www.irs.gov/businesses/small-businesses-self-employed/employer-id-numbers',
    expansion: 'employer identification number',
  },
  {
    token: 'ID',
    href: 'https://www.irs.gov/tin/taxpayer-identification-numbers-tin',
    expansion: 'identification',
  },
  {
    token: 'IRS',
    href: 'https://www.irs.gov/about-irs',
    expansion: 'Internal Revenue Service',
  },
  {
    token: 'LLC',
    href: 'https://www.irs.gov/businesses/small-businesses-self-employed/limited-liability-company-llc',
    expansion: 'limited liability company',
  },
  {
    token: 'SSN',
    href: 'https://www.irs.gov/tin/taxpayer-identification-numbers-tin',
    expansion: 'Social Security number',
  },
  {
    token: 'ITIN',
    href: 'https://www.irs.gov/individuals/individual-taxpayer-identification-number',
    expansion: 'individual taxpayer identification number',
  },
  {
    token: 'TIN',
    href: 'https://www.irs.gov/tin/taxpayer-identification-numbers-tin',
    expansion: 'taxpayer identification number',
  },
];
