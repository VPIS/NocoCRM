import { describe, expect, it } from 'vitest';

import { inSentence } from '../../client/components/crm/api.js';

describe("a field's label inside a sentence", () => {
  it('is set apart from Chinese by a space when it starts with a Latin letter or a digit', () => {
    expect(inSentence('LinkedIn', 'zh-CN')).toBe(' LinkedIn');
    expect(inSentence('3D 模型', 'zh-CN')).toBe(' 3D 模型');
  });
  it('is left as it is in Chinese otherwise, and in English', () => {
    expect(inSentence('电话', 'zh-CN')).toBe('电话');
    expect(inSentence('LinkedIn', 'en-US')).toBe('LinkedIn');
  });
});
