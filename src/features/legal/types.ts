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
  /** 시행일 옆에 그대로 표기하는 문서 버전(예: `v1.11`). */
  version: string;
  /** 첫 절 앞의 머리말. 줄바꿈(`\n`)을 살려 보여 준다. */
  intro?: string;
  sections: LegalSection[];
};
