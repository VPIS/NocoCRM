import { useTranslation } from '@nocobase/i18n/client';

export interface CrmSkill {
  name: string;
  title: string;
  description: string;
  content: string;
  notes: string;
  updatedAt: string | null;
  updatedByName: string | null;
}
export interface SkillList {
  skills: CrmSkill[];
  canEdit: boolean;
}

// The skills are written in English; their title and description show in
// the reader's language, keyed by that English text in the crm namespace,
// as on the AI Employee plugin's skill pages (frontmatter `i18n`).
export function useSkillDisplay(): (source: string) => string {
  const { i18n } = useTranslation('crm');
  return (source) =>
    i18n.t(source, {
      ns: 'crm',
      keySeparator: false,
      nsSeparator: false,
      defaultValue: source,
      skipInterpolation: true,
    });
}
