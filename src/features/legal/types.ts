export type LegalBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

export type LegalSection = {
  heading: string;
  blocks: LegalBlock[];
};

export type LegalDocument = {
  title: string;
  /** 시행일 (YYYY-MM-DD). */
  effectiveDate: string;
  version: string;
  intro?: string;
  sections: LegalSection[];
};
