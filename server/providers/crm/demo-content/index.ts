import { enUS } from './en-US.js';
import type { DemoContent } from './types.js';
import { zhCN } from './zh-CN.js';

export type { DemoContent, DemoCity, DemoSeat } from './types.js';

// The languages the demo dataset can be imported in.
export type DemoLanguage = 'zh-CN' | 'en-US';

export const demoLanguages: readonly DemoLanguage[] = ['zh-CN', 'en-US'];

const contents: Record<DemoLanguage, DemoContent> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

export function demoContent(language: DemoLanguage): DemoContent {
  return contents[language];
}
