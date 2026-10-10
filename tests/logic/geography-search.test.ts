import { describe, expect, it } from 'vitest';
import { searchPlaces } from '../../server/providers/crm/geography.js';

// A record's region is picked by searching a province's or a country's
// name, as people write it, in either language.
describe('searchPlaces', () => {
  it('finds a Chinese province by its short name, in either language', () => {
    expect(searchPlaces('浙江', true)[0]).toEqual({
      country: 'CN',
      state: 'CN-33',
      label: '中国 浙江省',
    });
    expect(searchPlaces('zhej', false)[0]).toEqual({
      country: 'CN',
      state: 'CN-33',
      label: 'Zhejiang, China',
    });
  });

  it('lists a country before provinces that merely contain its name', () => {
    const [first] = searchPlaces('China', false);
    expect(first).toEqual({ country: 'CN', state: null, label: 'China' });
    expect(searchPlaces('德国', true)[0]).toMatchObject({
      country: 'DE',
      state: null,
    });
  });

  it('keeps to the limit and finds nothing for nothing typed', () => {
    expect(searchPlaces('a', false, 5)).toHaveLength(5);
    expect(searchPlaces('  ', false)).toEqual([]);
  });
});
