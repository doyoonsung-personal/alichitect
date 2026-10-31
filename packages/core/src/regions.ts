// Region table: the international regions the model may use (REGIONS, the same shape prompt.ts has used since
// Phase 0), plus closed, mainland China and unconfirmed regions so that a mention of them can be detected, with
// aliases in English, Korean and Chinese. Facts come from research/findings/4-catalog-sourcing.md (2026-10-31).
// Browser-safe: no Node APIs.

/** International regions the model may use (seed catalog section D, checked 2026-10-31). Same rows and order as prompt.ts. */
export const REGIONS: ReadonlyArray<readonly [string, string]> = [
  ['Singapore', 'ap-southeast-1'],
  ['Kuala Lumpur', 'ap-southeast-3'],
  ['Johor', 'ap-southeast-8'],
  ['Jakarta', 'ap-southeast-5'],
  ['Manila', 'ap-southeast-6'],
  ['Bangkok', 'ap-southeast-7'],
  ['Tokyo', 'ap-northeast-1'],
  ['Seoul', 'ap-northeast-2'],
  ['Hong Kong', 'cn-hongkong'],
  ['Virginia', 'us-east-1'],
  ['Silicon Valley', 'us-west-1'],
  ['Mexico', 'na-south-1'],
  ['Sao Paulo', 'sa-east-1'],
  ['Frankfurt', 'eu-central-1'],
  ['London', 'eu-west-1'],
  ['Paris', 'eu-west-2'],
  ['Dubai', 'me-east-1'],
];

/** The region used when the user names none (prompt rule R13). */
export const DEFAULT_REGION = 'ap-southeast-1';

/**
 * open: in REGIONS, the model may use it. closed: Sydney and Mumbai, never use. mainland: a mainland China region
 * (cn-*), which needs a China-site account. unconfirmed: seen in metadata or news but not confirmed for the
 * international site (Amsterdam, and Riyadh, a partner region). other: a country with no Alibaba Cloud international region
 * (Taiwan, Vietnam, Canada ...), listed only so that a mention of it as a place for data can be detected; its id is
 * 'x-' plus a slug, never a real region id. Only open regions may be pinned in a constraint.
 */
export type RegionStatus = 'open' | 'closed' | 'mainland' | 'unconfirmed' | 'other';

export interface RegionInfo {
  id: string;
  /** English name; for open regions, the REGIONS name. */
  name: string;
  status: RegionStatus;
  country: string;
  /** City or area names in English, Korean and Chinese (Simplified and Traditional). */
  aliases: readonly string[];
  /** Country names. A country with one region resolves to it; a country with several resolves to all of them. */
  countryAliases: readonly string[];
}

const T = (id: string, name: string, status: RegionStatus, country: string, aliases: string[], countryAliases: string[] = []): RegionInfo => ({
  id,
  name,
  status,
  country,
  aliases: [name, ...aliases],
  countryAliases,
});

const US_NAMES = ['United States', 'USA', 'US', '미국', '美国', '美國', 'Oregon', '오리건', '俄勒冈', '俄勒岡', 'Texas', '텍사스', '德克萨斯', '德克薩斯', '得克萨斯', 'Dallas', 'Ohio', '오하이오', '俄亥俄', 'Columbus', 'Chicago', '시카고', '芝加哥', 'New York', '뉴욕', '纽约', '紐約', 'Atlanta', 'Seattle', 'Miami'];
const NORTH_AMERICA = ['North America', '북미', '北美', '北美洲'];
const EUROPE = ['Europe', 'EU', 'European Union', '유럽', '欧洲', '歐洲', '欧盟', '歐盟'];
const MIDDLE_EAST = ['Middle East', '중동', '中东', '中東'];
// "China" and the mainland names stand for the mainland regions (cn-*), not Hong Kong (中国香港 is its own, longer alias).
const MAINLAND = ['China', 'mainland China', 'China mainland', 'Chinese mainland', '중국', '중국 본토', '中国', '中國', '中国大陆', '中國大陸', '大陆', '大陸', '内地', '內地'];

/** A country with no international region (status 'other'): detection only. */
const O = (slug: string, name: string, aliases: string[]): RegionInfo => T(`x-${slug}`, name, 'other', name, aliases);

// Korean and Chinese names: drafted by qwen3.8-flash (place names only), then checked and corrected by hand: Johor adds
// 조호르 and 柔佛 (the draft gave only Johor Bahru); Hong Kong does not resolve through the country name 中国;
// 선전 (Shenzhen) is left out because it is also the common Korean word for "promotion"; Traditional variants added.
// Phase 1 fixes: short forms (KL, JB, HKG), places with no region of their own that stand for their country or state
// (Osaka, Busan, Ashburn, California, Hyderabad), blocs (Europe, EU, North America, Middle East) and mainland China.
export const REGION_TABLE: readonly RegionInfo[] = [
  T('ap-southeast-1', 'Singapore', 'open', 'Singapore', ['SG', '싱가포르', '싱가폴', '新加坡']),
  T('ap-southeast-3', 'Kuala Lumpur', 'open', 'Malaysia', ['KL', '쿠알라룸푸르', '吉隆坡'], ['Malaysia', '말레이시아', '马来西亚', '馬來西亞']),
  T('ap-southeast-8', 'Johor', 'open', 'Malaysia', ['JB', 'Johor Bahru', '조호르', '조호르바루', '柔佛', '新山'], ['Malaysia', '말레이시아', '马来西亚', '馬來西亞']),
  T('ap-southeast-5', 'Jakarta', 'open', 'Indonesia', ['JKT', '자카르타', '雅加达', '雅加達'], ['Indonesia', '인도네시아', '印度尼西亚', '印度尼西亞', '印尼']),
  T('ap-southeast-6', 'Manila', 'open', 'Philippines', ['마닐라', '马尼拉', '馬尼拉'], ['Philippines', '필리핀', '菲律宾', '菲律賓']),
  T('ap-southeast-7', 'Bangkok', 'open', 'Thailand', ['방콕', '曼谷'], ['Thailand', '태국', '泰国', '泰國']),
  T('ap-northeast-1', 'Tokyo', 'open', 'Japan', ['도쿄', '东京', '東京'], ['Japan', '일본', '日本', 'Osaka', '오사카', '大阪']),
  T('ap-northeast-2', 'Seoul', 'open', 'South Korea', ['서울', '首尔', '首爾'], ['South Korea', 'Korea', '한국', '대한민국', '韩国', '韓國', 'Busan', '부산', '釜山']),
  T('cn-hongkong', 'Hong Kong', 'open', 'Hong Kong', ['HK', 'HKG', 'Hongkong', '홍콩', '香港', '中国香港', '中國香港']),
  T('us-east-1', 'Virginia', 'open', 'United States', ['버지니아', '弗吉尼亚', '弗吉尼亞', '維吉尼亞', 'Ashburn'], [...US_NAMES, ...NORTH_AMERICA]),
  T('us-west-1', 'Silicon Valley', 'open', 'United States', ['실리콘밸리', '실리콘 밸리', '硅谷', '矽谷', 'California', '캘리포니아', '加州', '加利福尼亚', '加利福尼亞', 'San Francisco', '샌프란시스코', '旧金山', '舊金山'], [...US_NAMES, ...NORTH_AMERICA]),
  T('na-south-1', 'Mexico', 'open', 'Mexico', ['Queretaro', '케레타로', '克雷塔罗', '克雷塔羅'], ['멕시코', '墨西哥', ...NORTH_AMERICA]),
  T('sa-east-1', 'Sao Paulo', 'open', 'Brazil', ['상파울루', '圣保罗', '聖保羅'], ['Brazil', '브라질', '巴西']),
  T('eu-central-1', 'Frankfurt', 'open', 'Germany', ['프랑크푸르트', '法兰克福', '法蘭克福'], ['Germany', '독일', '德国', '德國', ...EUROPE]),
  T('eu-west-1', 'London', 'open', 'United Kingdom', ['런던', '伦敦', '倫敦'], ['United Kingdom', 'UK', '영국', '英国', '英國', 'Great Britain', 'Britain', 'England', ...EUROPE]),
  T('eu-west-2', 'Paris', 'open', 'France', ['파리', '巴黎'], ['France', '프랑스', '法国', '法國', ...EUROPE]),
  T('me-east-1', 'Dubai', 'open', 'United Arab Emirates', ['두바이', '迪拜', '杜拜'], ['United Arab Emirates', 'UAE', '아랍에미리트', '阿联酋', '阿聯酋', ...MIDDLE_EAST]),
  T('ap-southeast-2', 'Sydney', 'closed', 'Australia', ['시드니', '悉尼', '雪梨', 'Melbourne', '멜버른', '墨尔本', '墨爾本'], ['Australia', '호주', '澳大利亚', '澳大利亞', '澳洲']),
  T('ap-south-1', 'Mumbai', 'closed', 'India', ['뭄바이', '孟买', '孟買', 'Hyderabad', '하이데라바드', '海得拉巴', 'Bangalore', 'Bengaluru', '벵갈루루', '班加罗尔', '班加羅爾', 'New Delhi', 'Delhi', '델리', '德里', 'Chennai', '첸나이', '金奈'], ['India', '인도', '印度']),
  T('eu-west-3', 'Amsterdam', 'unconfirmed', 'Netherlands', ['암스테르담', '阿姆斯特丹'], ['Netherlands', '네덜란드', '荷兰', '荷蘭', ...EUROPE]),
  T('me-central-1', 'Riyadh', 'unconfirmed', 'Saudi Arabia', ['리야드', '利雅得', '利雅德'], ['Saudi Arabia', '사우디아라비아', '사우디', '沙特阿拉伯', '沙烏地阿拉伯', ...MIDDLE_EAST]),
  T('cn-hangzhou', 'Hangzhou', 'mainland', 'China', ['항저우', '杭州'], MAINLAND),
  T('cn-shanghai', 'Shanghai', 'mainland', 'China', ['상하이', '上海'], MAINLAND),
  T('cn-beijing', 'Beijing', 'mainland', 'China', ['베이징', '北京'], MAINLAND),
  T('cn-shenzhen', 'Shenzhen', 'mainland', 'China', ['深圳'], MAINLAND),
  T('cn-zhangjiakou', 'Zhangjiakou', 'mainland', 'China', ['장자커우', '张家口', '張家口'], MAINLAND),
  // Countries with no international region. Only for detection: a say line that sends data there breaks any pin.
  O('taiwan', 'Taiwan', ['Taipei', '대만', '타이베이', '台湾', '台灣', '台北']),
  O('vietnam', 'Vietnam', ['Hanoi', 'Ho Chi Minh City', 'Saigon', '베트남', '하노이', '越南', '河内', '河內', '胡志明']),
  O('canada', 'Canada', ['Toronto', 'Montreal', 'Vancouver', '캐나다', '토론토', '加拿大', '多伦多', '多倫多']),
  O('ireland', 'Ireland', ['Dublin', '아일랜드', '더블린', '爱尔兰', '愛爾蘭', '都柏林']),
  O('spain', 'Spain', ['Madrid', 'Barcelona', '스페인', '마드리드', '西班牙', '马德里', '馬德里']),
  O('italy', 'Italy', ['Milan', 'Rome', '이탈리아', '밀라노', '意大利', '義大利', '米兰', '米蘭']),
  O('sweden', 'Sweden', ['Stockholm', '스웨덴', '스톡홀름', '瑞典', '斯德哥尔摩', '斯德哥爾摩']),
  O('poland', 'Poland', ['Warsaw', '폴란드', '바르샤바', '波兰', '波蘭', '华沙', '華沙']),
  O('switzerland', 'Switzerland', ['Zurich', '스위스', '취리히', '瑞士', '苏黎世', '蘇黎世']),
  O('russia', 'Russia', ['Moscow', '러시아', '모스크바', '俄罗斯', '俄羅斯', '莫斯科']),
  O('turkey', 'Turkey', ['Istanbul', 'Türkiye', '튀르키예', '이스탄불', '土耳其', '伊斯坦布尔', '伊斯坦堡']),
  O('israel', 'Israel', ['Tel Aviv', '이스라엘', '텔아비브', '以色列', '特拉维夫', '特拉維夫']),
  O('egypt', 'Egypt', ['Cairo', '이집트', '카이로', '埃及', '开罗', '開羅']),
  O('south-africa', 'South Africa', ['Johannesburg', 'Cape Town', '남아프리카', '남아공', '요하네스버그', '南非', '约翰内斯堡', '約翰內斯堡']),
  O('argentina', 'Argentina', ['Buenos Aires', '아르헨티나', '부에노스아이레스', '阿根廷', '布宜诺斯艾利斯']),
  O('new-zealand', 'New Zealand', ['Auckland', '뉴질랜드', '오클랜드', '新西兰', '紐西蘭', '奥克兰', '奧克蘭']),
  O('pakistan', 'Pakistan', ['Karachi', '파키스탄', '카라치', '巴基斯坦', '卡拉奇']),
  O('bangladesh', 'Bangladesh', ['Dhaka', '방글라데시', '다카', '孟加拉', '达卡', '達卡']),
  O('sri-lanka', 'Sri Lanka', ['Colombo', '스리랑카', '콜롬보', '斯里兰卡', '斯里蘭卡', '科伦坡', '科倫坡']),
  O('qatar', 'Qatar', ['Doha', '카타르', '도하', '卡塔尔', '卡達', '多哈']),
  O('cambodia', 'Cambodia', ['Phnom Penh', '캄보디아', '프놈펜', '柬埔寨', '金边', '金邊']),
  O('mongolia', 'Mongolia', ['Ulaanbaatar', '몽골', '울란바토르', '蒙古', '乌兰巴托', '烏蘭巴托']),
];

/** Short Latin codes that only count in upper case ("US", not the pronoun "us"; "KL", not a typo). */
const CASE_SENSITIVE = new Set(['SG', 'HK', 'HKG', 'KL', 'JB', 'JKT', 'US', 'USA', 'UK', 'UAE', 'EU']);

/** CJK words that contain a place name but mean something else (the Korean and Japanese languages, for example). */
const NOT_PLACES = ['한국어', '일본어', '중국어', '독일어', '프랑스어', '韩语', '韓語', '韩文', '韓文', '日本語', '日语', '日語', '日文', '英语', '英語', '德语', '德語', '法语', '法語'];

/** What may follow a place name and make it something else: Jakarta EE (Java), 인도 시장 (a market, or "delivery"). Lower-case alias -> lookahead source. */
const NOT_FOLLOWED: Readonly<Record<string, string>> = {
  eu: '(?!\\s*(?:regulations?|laws?|directives?|rules?|requirements?|compliance|gdpr|citizens?|data\\s+protection|규정|법|규제|지침|준수|法规|法規|法律|条例|條例)(?![A-Za-z0-9]))',
  'european union': '(?!\\s*(?:regulations?|laws?|directives?|rules?|requirements?|compliance|gdpr|citizens?|data\\s+protection)(?![A-Za-z0-9]))',
  jakarta: '(?!\\s+(?:ee|se|specifications?|specs?|servlets?|persistence|faces|mail|messaging|restful|security|batch|concurrency|validation|annotations|transactions|enterprise)(?![A-Za-z0-9]))',
  인도: '(?!\\s?(?:시장|인|하|받|적|주의|식))',
};

const BY_ID: ReadonlyMap<string, RegionInfo> = new Map(REGION_TABLE.map((r) => [r.id, r]));

export function regionInfo(id: string): RegionInfo | undefined {
  return BY_ID.get(id);
}

/** True for a region id the model may use (REGIONS). */
export function isOpenRegion(id: string): boolean {
  return BY_ID.get(id)?.status === 'open';
}

/** "Singapore (ap-southeast-1)", the label the prompt asks for on a region group; the id itself when unknown. */
export function regionLabel(id: string): string {
  const r = BY_ID.get(id);
  if (r && r.status === 'other') return `${r.name} (no Alibaba Cloud region)`;
  return r ? `${r.name} (${r.id})` : id;
}

// ---------- matching ----------

const fold = (s: string): string => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').normalize('NFC');
/** Text as the region matcher sees it (accents folded): mention offsets refer to this string. */
export const foldText = fold;
const isLatin = (s: string): boolean => /^[\x00-\x7f]+$/.test(s);
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface Pattern {
  text: string;
  ids: string[];
  kind: 'id' | 'city' | 'country';
  re: RegExp;
}

function buildPatterns(): Pattern[] {
  const map = new Map<string, Pattern>();
  const add = (text: string, id: string, kind: Pattern['kind']): void => {
    const t = fold(text);
    const key = (CASE_SENSITIVE.has(t) ? 'cs:' : 'ci:') + (CASE_SENSITIVE.has(t) ? t : t.toLowerCase()) + '|' + kind;
    const prev = map.get(key);
    if (prev) {
      if (!prev.ids.includes(id)) prev.ids.push(id);
      return;
    }
    const body = escapeRe(t).replace(/\\? /g, '[\\s-]+');
    // Latin names match as whole words; CJK names match anywhere (no spaces between words).
    const after = NOT_FOLLOWED[t.toLowerCase()] ?? '';
    const src = isLatin(t) ? `(?<![A-Za-z0-9])${body}(?![A-Za-z0-9])${after}` : body + after;
    map.set(key, { text: t, ids: [id], kind, re: new RegExp(src, CASE_SENSITIVE.has(t) ? 'g' : 'gi') });
  };
  for (const r of REGION_TABLE) {
    add(r.id, r.id, 'id');
    for (const a of r.aliases) add(a, r.id, 'city');
    for (const c of r.countryAliases) add(c, r.id, 'country');
  }
  // Longest first, so "Johor Bahru" wins over "Johor" and 인도네시아 over 인도.
  return [...map.values()].sort((a, b) => b.text.length - a.text.length);
}

const PATTERNS = buildPatterns();

export interface RegionMention {
  /** Region ids the words name: one for a city or region id, every region of the country for a country name. */
  ids: string[];
  kind: 'id' | 'city' | 'country';
  start: number;
  end: number;
  text: string;
}

/** Every region mention in free text (say lines, labels, requirements), in text order. Overlapping matches keep the longest. */
export function findRegionMentions(text: string): RegionMention[] {
  if (typeof text !== 'string' || !text) return [];
  const s = fold(text);
  const taken: boolean[] = new Array(s.length).fill(false);
  for (const w of NOT_PLACES) {
    for (let i = s.indexOf(w); i >= 0; i = s.indexOf(w, i + w.length)) for (let k = i; k < i + w.length; k++) taken[k] = true;
  }
  const out: RegionMention[] = [];
  for (const p of PATTERNS) {
    p.re.lastIndex = 0;
    for (let m = p.re.exec(s); m; m = p.re.exec(s)) {
      const start = m.index;
      const end = start + m[0].length;
      let free = true;
      for (let k = start; k < end; k++) if (taken[k]) free = false;
      if (!free) continue;
      for (let k = start; k < end; k++) taken[k] = true;
      out.push({ ids: p.ids.slice(), kind: p.kind, start, end, text: m[0] });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Region ids mentioned in free text, deduplicated, in order of first mention (a country adds all of its regions). */
export function regionMentions(text: string): string[] {
  const out: string[] = [];
  for (const m of findRegionMentions(text)) for (const id of m.ids) if (!out.includes(id)) out.push(id);
  return out;
}

function exact(text: string): RegionMention['ids'] | null {
  const t = fold(text.trim());
  if (!t) return null;
  const lower = t.toLowerCase();
  for (const p of PATTERNS) {
    if (CASE_SENSITIVE.has(p.text) ? p.text.toLowerCase() === lower : p.text.toLowerCase() === lower) return p.ids.slice();
  }
  return null;
}

/**
 * The region id that a name, alias or id stands for: "Singapore", "싱가포르", "新加坡", "ap-southeast-1",
 * "Singapore (ap-southeast-1)" and "Japan" give one id. Ambiguous names ("Malaysia", "US") and unknown text give null.
 * Closed, mainland and unconfirmed regions resolve too; check isOpenRegion() before using one.
 */
export function resolveRegion(text: unknown): string | null {
  if (typeof text !== 'string') return null;
  const whole = exact(text);
  if (whole) return whole.length === 1 ? whole[0] : null;
  const ids = regionMentions(text);
  return ids.length === 1 ? ids[0] : null;
}

/** Like resolveRegion, but a country with several regions gives all of them ("Malaysia" -> Kuala Lumpur and Johor). */
export function resolveRegions(text: unknown): string[] {
  if (typeof text !== 'string') return [];
  const whole = exact(text);
  if (whole) return whole;
  return regionMentions(text);
}
