import iso from 'iso-3166-2';

// ISO 3166-2 ships English subdivision names only; the CRM is bilingual, so
// China's 34 subdivisions carry a Chinese label. Other countries fall back to
// the ISO name in both locales.
const chineseSubdivisions: Record<string, string> = {
  'CN-11': '北京市',
  'CN-12': '天津市',
  'CN-13': '河北省',
  'CN-14': '山西省',
  'CN-15': '内蒙古自治区',
  'CN-21': '辽宁省',
  'CN-22': '吉林省',
  'CN-23': '黑龙江省',
  'CN-31': '上海市',
  'CN-32': '江苏省',
  'CN-33': '浙江省',
  'CN-34': '安徽省',
  'CN-35': '福建省',
  'CN-36': '江西省',
  'CN-37': '山东省',
  'CN-41': '河南省',
  'CN-42': '湖北省',
  'CN-43': '湖南省',
  'CN-44': '广东省',
  'CN-45': '广西壮族自治区',
  'CN-46': '海南省',
  'CN-50': '重庆市',
  'CN-51': '四川省',
  'CN-52': '贵州省',
  'CN-53': '云南省',
  'CN-54': '西藏自治区',
  'CN-61': '陕西省',
  'CN-62': '甘肃省',
  'CN-63': '青海省',
  'CN-64': '宁夏回族自治区',
  'CN-65': '新疆维吾尔自治区',
  'CN-71': '台湾省',
  'CN-91': '香港特别行政区',
  'CN-92': '澳门特别行政区',
};

export interface Subdivision {
  code: string;
  name: string;
  chineseName?: string;
}

export const countryCodes: string[] = Object.keys(iso.data).sort();

export function subdivisions(country: string): Subdivision[] {
  const entry = iso.data[country];
  if (!entry) return [];
  return Object.entries(entry.sub)
    .map(([code, value]) => ({
      code,
      name: value.name,
      ...(chineseSubdivisions[code]
        ? { chineseName: chineseSubdivisions[code] }
        : {}),
    }))
    .sort((left, right) => left.code.localeCompare(right.code));
}

export function isCountry(code: string): boolean {
  return Object.hasOwn(iso.data, code);
}

export function isSubdivision(country: string, code: string): boolean {
  const entry = iso.data[country];
  return Boolean(entry && Object.hasOwn(entry.sub, code));
}

// A place's name as people shorten it: "浙江" for 浙江省, "Zhejiang" for
// "Zhejiang Sheng".
const strip = (name: string): string =>
  name
    .toLowerCase()
    .replace(/(省|市|自治区|特别行政区|壮族|回族|维吾尔)/g, '')
    .replace(/\s+(province|municipality|sheng|shi)$/u, '')
    .trim();

// A subdivision given by name rather than code — "江西省", "江西", "Jiangxi" —
// resolved to its ISO code, or undefined when nothing matches. Model output
// and imports name places the way people do, not by code.
export function subdivisionCode(
  country: string,
  value: string,
): string | undefined {
  const wanted = value.trim().toLowerCase();
  if (!wanted) return undefined;
  for (const item of subdivisions(country)) {
    const names = [item.code, item.name, item.chineseName ?? ''];
    if (names.some((n) => n.toLowerCase() === wanted)) return item.code;
    if (names.slice(1).some((n) => n && strip(n) === strip(value)))
      return item.code;
  }
  return undefined;
}

// An address without the region the record already names in its own
// fields: "江西省新余市高新区西城大道" with the province and city filled
// becomes "高新区西城大道", and "1 Main St, Springfield, IL, United States"
// with city, state and country becomes "1 Main St". Only what leads (or,
// comma-separated, trails) the address is taken off, the region's names as
// the record holds them or written the usual ways; an address that is
// nothing but the region comes back empty.
export function streetAddress(
  address: string,
  region: { country?: string; state?: string; city?: string },
): string {
  const names = new Set<string>();
  const add = (name: string | undefined): void => {
    const value = name?.trim();
    if (value) names.add(value);
  };
  const country = region.country?.trim().toUpperCase();
  if (country) {
    add(iso.data[country]?.name);
    add(country);
    if (country === 'CN')
      ['中国', '中华人民共和国', 'China', 'PRC'].forEach(add);
    const state = subdivisions(country).find(
      (item) =>
        item.code === region.state ||
        item.name === region.state ||
        item.chineseName === region.state,
    );
    for (const name of [state?.name, state?.chineseName]) {
      add(name);
      add(name?.replace(/(省|市|自治区|特别行政区|壮族|回族|维吾尔)/g, ''));
    }
  }
  add(region.city);
  add(region.city?.replace(/(市|区|县)$/u, ''));
  if (region.city && !/(市|区|县)$/u.test(region.city)) add(`${region.city}市`);
  const ordered = [...names].sort((a, b) => b.length - a.length);
  const separators = /^[\s,，、]+|[\s,，、]+$/gu;
  let rest = address.trim();
  for (let changed = true; changed;) {
    changed = false;
    rest = rest.replace(separators, '');
    for (const name of ordered)
      if (rest.toLowerCase().startsWith(name.toLowerCase())) {
        rest = rest.slice(name.length);
        changed = true;
        break;
      }
  }
  // Western order: the region trails, comma-separated.
  const parts = rest.split(/\s*[,，]\s*/u);
  while (
    parts.length > 1 &&
    ordered.some((name) => name.toLowerCase() === parts.at(-1)!.toLowerCase())
  )
    parts.pop();
  return parts.join(', ').replace(separators, '');
}

// The provinces and countries whose name, in English or Chinese, contains
// what was typed, for a record's region: a province with its country, a
// country alone; those whose name starts with it first, at most `limit`.
export interface PlaceMatch {
  country: string;
  state: string | null;
  label: string;
}
export function searchPlaces(
  query: string,
  chinese: boolean,
  limit = 10,
): PlaceMatch[] {
  const wanted = strip(query);
  if (!wanted) return [];
  const displays = {
    en: new Intl.DisplayNames(['en'], { type: 'region' }),
    'zh-CN': new Intl.DisplayNames(['zh-CN'], { type: 'region' }),
  };
  const names = (code: string, language: 'en' | 'zh-CN'): string => {
    try {
      return displays[language].of(code) ?? code;
    } catch {
      return code;
    }
  };
  const ranked: { rank: number; match: PlaceMatch }[] = [];
  const rank = (candidates: string[]): number => {
    const bare = candidates.filter(Boolean).map(strip);
    if (bare.some((n) => n.startsWith(wanted))) return 0;
    if (bare.some((n) => n.includes(wanted))) return 1;
    return -1;
  };
  for (const country of countryCodes) {
    const countryName = names(country, chinese ? 'zh-CN' : 'en');
    const countryRank = rank([
      names(country, 'en'),
      names(country, 'zh-CN'),
      country,
    ]);
    if (countryRank >= 0)
      ranked.push({
        rank: countryRank,
        match: { country, state: null, label: countryName },
      });
    for (const item of subdivisions(country)) {
      const itemRank = rank([item.name, item.chineseName ?? '']);
      if (itemRank < 0) continue;
      const itemName = chinese ? (item.chineseName ?? item.name) : item.name;
      ranked.push({
        // A province ranks after a country of the same standing.
        rank: itemRank + 0.5,
        match: {
          country,
          state: item.code,
          label: chinese
            ? `${countryName} ${itemName}`
            : `${itemName}, ${countryName}`,
        },
      });
    }
  }
  return ranked
    .sort((left, right) => left.rank - right.rank)
    .slice(0, limit)
    .map((entry) => entry.match);
}
