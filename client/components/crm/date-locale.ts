import type { Locale } from 'date-fns';
import { enUS, zhCN, zhTW } from 'date-fns/locale';
import {
  enUS as dayEnUS,
  zhCN as dayZhCN,
  zhTW as dayZhTW,
  type DayPickerLocale,
} from 'react-day-picker/locale';

// The calendars' and date formats' language for each language the pages
// offer (client/locales/index.ts), English for any other.
const DATE_LOCALES: Record<string, Locale> = {
  'en-US': enUS,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
};
export const dateLocale = (language: string): Locale =>
  DATE_LOCALES[language] ?? enUS;

// The same for the day picker's own locales, which carry its labels too.
const DAY_PICKER_LOCALES: Record<string, DayPickerLocale> = {
  'en-US': dayEnUS,
  'zh-CN': dayZhCN,
  'zh-TW': dayZhTW,
};
export const dayPickerLocale = (language: string): DayPickerLocale =>
  DAY_PICKER_LOCALES[language] ?? dayEnUS;
