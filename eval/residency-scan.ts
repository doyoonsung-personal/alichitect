// An independent second opinion on data residency for the eval.
//
// The product's own checker (packages/core/src/constraints.ts) was also the eval's residency assertion, so the two shared
// every blind spot. This scan shares none of its code: it has its own place-name table (drafted by qwen3.8-flash from a list
// of ids and English city names, then read and corrected by hand), its own cue words, and a simpler rule that errs towards
// flagging. It reads the diagram (region groups, node labels) and the narration (say lines, whys, edge labels).
//
//   structure: a region group, or a node, whose label names a place outside the allowed regions.
//   narration: a sentence that names such a place, holds a copy or placement cue (replicate, back up, DR, store, run on,
//              migrate, 복제, 백업, 复制, 容灾 ...), and is not negated at the place ("instead of Tokyo", "not Tokyo") or at
//              the cue ("do not replicate", "복제하지 않", "不要复制"), and does not only say where users are.
//
// It is a smoke alarm, not a proof: a hit is reviewed by hand, and a quiet scan does not show that the narration is clean.
import type { Graph } from '../packages/core/src/types.ts';

/** Place id -> names in English, Korean and Chinese. Names up to three letters are matched as upper-case whole words. */
export const PLACES: Readonly<Record<string, readonly string[]>> = {
  'ap-southeast-1': ['Singapore', 'SG', '싱가포르', '싱가폴', '新加坡', '星洲'],
  'ap-southeast-3': ['Kuala Lumpur', 'KL', 'Malaysia', '쿠알라룸푸르', '말레이시아', '吉隆坡', '马来西亚', '馬來西亞'],
  'ap-southeast-8': ['Johor', 'JB', 'Malaysia', '조호르', '말레이시아', '柔佛', '马来西亚', '馬來西亞'],
  'ap-southeast-5': ['Jakarta', 'JKT', 'Indonesia', '자카르타', '인도네시아', '雅加达', '印度尼西亚', '印度尼西亞', '印尼'],
  'ap-southeast-6': ['Manila', 'Philippines', '마닐라', '필리핀', '马尼拉', '菲律宾', '菲律賓'],
  'ap-southeast-7': ['Bangkok', 'Thailand', '방콕', '태국', '曼谷', '泰国', '泰國'],
  'ap-northeast-1': ['Tokyo', 'Osaka', 'Japan', '도쿄', '오사카', '일본', '东京', '東京', '大阪', '日本'],
  'ap-northeast-2': ['Seoul', 'Busan', 'South Korea', 'Korea', '서울', '부산', '한국', '대한민국', '首尔', '首爾', '釜山', '韩国', '韓國'],
  'cn-hongkong': ['Hong Kong', 'HK', 'HKG', '홍콩', '香港', '中国香港', '中國香港'],
  'us-east-1': ['Virginia', 'N. Virginia', 'Ashburn', 'US East', 'East US', '버지니아', '애쉬번', '弗吉尼亚', '弗吉尼亞', '阿什本'],
  'us-west-1': ['Silicon Valley', 'California', 'San Francisco', 'US West', 'West US', '실리콘밸리', '캘리포니아', '샌프란시스코', '硅谷', '矽谷', '加利福尼亚', '加利福尼亞', '旧金山', '舊金山'],
  'na-south-1': ['Mexico', '멕시코', '墨西哥'],
  'sa-east-1': ['Sao Paulo', 'São Paulo', 'Brazil', '상파울루', '브라질', '圣保罗', '聖保羅', '巴西'],
  'eu-central-1': ['Frankfurt', 'Germany', '프랑크푸르트', '독일', '法兰克福', '法蘭克福', '德国', '德國'],
  'eu-west-1': ['London', '런던', '伦敦', '倫敦'],
  'eu-west-2': ['Paris', 'France', '파리', '프랑스', '巴黎', '法国', '法國'],
  'me-east-1': ['Dubai', 'UAE', 'United Arab Emirates', '두바이', '아랍에미리트', '迪拜', '杜拜', '阿联酋', '阿聯酋'],
  'ap-southeast-2': ['Sydney', 'Australia', '시드니', '호주', '悉尼', '雪梨', '澳大利亚', '澳洲'],
  'ap-south-1': ['Mumbai', 'Hyderabad', 'Bangalore', 'Delhi', 'India', '뭄바이', '하이데라바드', '인도', '孟买', '海得拉巴', '印度'],
  'cn-hangzhou': ['Hangzhou', '항저우', '杭州'],
  'cn-shanghai': ['Shanghai', '상하이', '上海'],
  'cn-beijing': ['Beijing', '베이징', '北京'],
  'cn-shenzhen': ['Shenzhen', '선전', '深圳'],
  'cn-zhangjiakou': ['Zhangjiakou', '장자커우', '张家口', '張家口'],
  'cn-chengdu': ['Chengdu', '청두', '成都'],
  'cn-qingdao': ['Qingdao', '칭다오', '青岛', '青島'],
  'cn-huhehaote': ['Hohhot', '후허하오터', '呼和浩特'],
  'cn-wulanchabu': ['Ulanqab', '울란차부', '乌兰察布', '烏蘭察布'],
  'x-taiwan': ['Taiwan', 'Taipei', '대만', '타이베이', '台湾', '台北', '臺灣'],
  'x-vietnam': ['Vietnam', '베트남', '越南'],
  'x-canada': ['Canada', '캐나다', '加拿大'],
  'x-netherlands': ['Amsterdam', 'Netherlands', '암스테르담', '네덜란드', '阿姆斯特丹', '荷兰', '荷蘭'],
  'x-saudi': ['Riyadh', 'Saudi Arabia', '리야드', '사우디아라비아', '利雅得', '沙特阿拉伯'],
  'x-china': ['China', 'Mainland China', '중국', '中国', '中國', '中国大陆', '中國大陸', '内地', '內地'],
  'x-europe': ['Europe', 'EU', '유럽', '欧洲', '歐洲', '欧盟', '歐盟'],
  'x-uk': ['United Kingdom', 'UK', 'Britain', 'England', '영국', '英国', '英國', '英格兰', '英格蘭'],
  'x-us': ['United States', 'US', 'USA', 'America', 'North America', 'Oregon', 'Ohio', 'Texas', '미국', '북미', '텍사스', '美国', '美國', '北美', '美利坚合众国'],
};

/** Ids that are not regions of their own (a country or bloc): an allowed region inside them makes the mention fine. */
const COVERS: Readonly<Record<string, readonly string[]>> = {
  'x-china': ['cn-hangzhou', 'cn-shanghai', 'cn-beijing', 'cn-shenzhen', 'cn-zhangjiakou', 'cn-chengdu', 'cn-qingdao', 'cn-huhehaote', 'cn-wulanchabu'],
  'x-europe': ['eu-central-1', 'eu-west-1', 'eu-west-2', 'x-netherlands', 'x-uk'],
  'x-uk': ['eu-west-1'],
  'x-us': ['us-east-1', 'us-west-1'],
};

// A region id names its own place ("a standby in ap-northeast-1").
for (const id of Object.keys(PLACES)) if (/^[a-z]{2}-[a-z]+-\d+$|^cn-hongkong$/.test(id)) (PLACES as Record<string, string[]>)[id] = [...PLACES[id], id];

const SHORT = /^[A-Z]{2,3}$/;
const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface Matcher {
  id: string;
  name: string;
  re: RegExp;
}

const MATCHERS: Matcher[] = [];
for (const [id, names] of Object.entries(PLACES)) {
  for (const name of names) {
    if (SHORT.test(name)) MATCHERS.push({ id, name, re: new RegExp(`\\b${esc(name)}\\b`, 'g') });
    else if (/^[A-Za-z]/.test(name)) MATCHERS.push({ id, name, re: new RegExp(`\\b${esc(name)}[a-z]*`, 'gi') }); // the rest of the word too: Japan -> Japanese
    else MATCHERS.push({ id, name, re: new RegExp(esc(name), 'g') });
  }
}

export interface PlaceMention {
  name: string;
  /** Every place id that lists this name ("Malaysia" is both Kuala Lumpur and Johor). */
  ids: string[];
  start: number;
  end: number;
}

/** Place mentions in a text, the longest name winning where names overlap. */
export function placesIn(text: string): PlaceMention[] {
  const found: PlaceMention[] = [];
  for (const m of MATCHERS) {
    m.re.lastIndex = 0;
    for (let x = m.re.exec(text); x; x = m.re.exec(text)) {
      const hit = found.find((f) => f.start === x.index && f.end === x.index + x[0].length);
      if (hit) {
        if (!hit.ids.includes(m.id)) hit.ids.push(m.id);
      } else found.push({ name: x[0], ids: [m.id], start: x.index, end: x.index + x[0].length });
    }
  }
  found.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const out: PlaceMention[] = [];
  for (const f of found) if (!out.some((o) => f.start < o.end && o.start < f.end)) out.push(f);
  return out;
}

/** Whether the allowed set covers a mention: some id it lists is allowed, or a bloc it stands for contains an allowed place. */
function allowedMention(m: PlaceMention, allowed: ReadonlySet<string>): boolean {
  return m.ids.some((id) => allowed.has(id) || (COVERS[id] ?? []).some((c) => allowed.has(c)));
}

const CUE =
  /\b(?:replicat\w*|back(?:s|ed|ing)?[\s-]?ups?\b|backups?|cop(?:y|ies|ied)|disaster|fail[\s-]?over|standby|mirror\w*|sync\w*|migrat\w*|stor(?:e|es|ed|ing|age)|archiv\w*|snapshots?|mov(?:e|es|ed|ing)|transfer\w*|send\w*|ship\w*|forward\w*|deploy\w*|host\w*|run(?:s|ning)?|placed?|replica\w*|secondary|DR|cross[\s-]region|cold)\b|복제|백업|복사|재해|장애|이전|이관|동기|저장|보관|배포|운영|호스팅|옮|전송|复制|複製|备份|備份|容灾|容災|灾备|災備|同步|迁移|遷移|存储|存儲|存放|保存|副本|部署|转移|轉移|传输|傳輸|异地|異地|放在|放到|运行|運行/i;

/** Negation at the place: instead of / not / rather than / except directly before it, 대신 / 말고 / 제외 after it, 而不是 / 除了 before it. */
const NEG_AT_PLACE_BEFORE = /(?:\b(?:instead\s+of|rather\s+than|other\s+than|not|never|except(?:\s+for)?|excluding|without|outside(?:\s+of)?|avoid(?:ing)?|no)\s+(?:the\s+|in\s+|to\s+|into\s+|at\s+)?|(?:而不是|不是|而非|并非|並非|除了|除去|避免|不要|不在|不去|禁止)\s*(?:在|到|于|於)?)$/i;
const NEG_AT_PLACE_AFTER = /^\s*(?:이|가|은|는|을|를|에|로|으로|에는)?\s*(?:대신|말고|제외|아니라|아닌|금지|불가)/;
/** Negation at the cue: a negator in the three words before it, or a negative ending after it. */
const NEG_BEFORE_CUE = /\b(?:not|never|no|don['’]?t|doesn['’]?t|won['’]?t|cannot|can['’]?t|without|avoid\w*|prevent\w*|prohibit\w*|forbid\w*|disable\w*|skip\w*|exclude\w*|block\w*|refus\w*|reject\w*|no\s+longer)\s+(?:\w+\s+){0,3}$/i;
/** A refusal or a plan not carried out, up to twelve characters before the word: 无法添加跨区域备份, 未添加东京副本. */
const ZH_REFUSE_BEFORE = /(?:无法|無法|未(?![来來])|不予)[^\s。！？，,]{0,12}$|(?:不涉及|不会涉及|不會涉及|没有涉及|沒有涉及|不包含|不含)\s*$/;
const NEG_BEFORE_CUE_CJK = /(?:不要|不会|不會|不能|不得|禁止|避免|无需|無需|不再|没有|沒有|勿|严禁|嚴禁)[^\s。！？]{0,3}$|(?:无法|無法|未(?![来來])|不予)[^\s。！？，,]{0,12}$|(?:^|\s)안\s?$/;
const NEG_AFTER_CUE = /^[^.!?。！？]{0,24}?(?:하지\s?(?:않|마|못|말)|지\s?(?:않|마세요|마십시오|못)|수\s?없|대신|말고|而不是|而非|금지|불가|제외|不会|不會|不要|不能|禁止|避免|未启用|不启用|已禁用|被禁止|\b(?:is|are|will\s+be|stays?|remains?)\s+(?:not|never|disabled|blocked|excluded|prohibited|forbidden|out\s+of\s+scope))/i;

const PEOPLE = '(?:users?|customers?|clients?|visitors?|shoppers?|consumers?|audience|traffic|requests?|people|staff|employees?|developers?|analysts?|teams?|offices?|markets?|partners?|parents?(?!\\s+(?:facilit\\w+|sites?|data\\s?cent\\w+|regions?|clusters?|databases?|db|buckets?|storage))|headquarters|HQ|subsidiar(?:y|ies)|branch(?:es)?|couriers?|riders?|drivers?|patients?|students?)';
const USERS_BEFORE = new RegExp(`\\b${PEOPLE}\\s+(?:(?:located|based|living|working)\\s+)?(?:in|from|across|within|at|of|near)\\s+(?:the\\s+)?$`, 'i');
const USERS_AFTER = new RegExp(`^(?:['’]s)?\\s+${PEOPLE}\\b`, 'i');
const PEOPLE_CJK = '(?:사용자|고객|유저|이용자|시장|트래픽|팀|직원|방문자|소비자|요청|用户|用戶|客户|客戶|使用者|市场|市場|流量|团队|團隊|员工|員工|访客|訪客|请求|請求|消费者|消費者)';
const USERS_CJK_AFTER = new RegExp(`^(?:의|에서\\s?오는|에\\s?있는|发|的|地区的|地區的)?\\s?${PEOPLE_CJK}`);
const USERS_CJK_BEFORE = /(?:来自|來自)$/;

/** Another place without naming it (checked only when exactly one region is allowed): cross-region, overseas, off-site, geo-redundant. */
const GENERIC_ELSEWHERE =
  /\b(?:cross[\s-]?region|inter[\s-]?region|overseas|abroad|offshore|off[\s-]?site|geo[\s-]?redundan\w*|another\s+(?:geography|country|region|continent)|other\s+regions|multiple\s+regions|multi[\s-]?region|global\s+(?:replication|sync\w*))\b|해외|다른\s?리전|교차\s?복제|여러\s?리전|글로벌\s?복제|여러\s?대륙|跨地域|跨区域|跨區域|异地|異地|海外|境外|跨国|跨國|全球复制/i;
const CONFINED = /\b(?:within|inside|same[\s-]region|in[\s-]region|between\s+zones|cross[\s-]zone)\b|리전\s?내|같은\s?리전|동일\s?리전|同一(?:个)?(?:区域|地域)|同城|跨可用区|(?:반출|유출|이동|전송|복제|이전)\s?(?:없이|하지\s?않|금지|차단)|without\s+(?:leaving|moving|crossing)/i;

/** Words that say the sentence refuses, cancels or switches off what it mentions; anywhere in the sentence they quiet the scan. */
const REJECTED = /\b(?:disabled?|turned\s+off|switched\s+off|out\s+of\s+scope|cancell?ed|rejected|refus\w+|decided\s+against|excluded|ruled\s+out|declined|dropped|vetoed|not\s+(?:allowed|permitted)|never\s+(?:leave|leaves|leaving)|(?:blocked|denied|prohibited|forbidden|banned|prevented)\s+(?:by|under|due|per|because)|violat\w+\s+(?:this|that|the|your|our|a)|(?:I|we)\s+(?:cannot|can['’]t|won['’]t|will\s+not)\s+(?:draw|add|place|put|create|do|replicate|copy|store|move))\b|기각|거절|거부|비활성|취소|고려\s?대상이\s?아|제외|제거|삭제|반려|不予|禁用|取消|拒绝|拒絕|驳回|駁回|不允许|不允許/i;

const SENTENCE = /(?<!\b[A-Z])\.+(?=\s|$)|[!?。！？;；\n]+/;

export interface ScanHit {
  where: 'group' | 'node' | 'say';
  ids: string[];
  /** The place names found outside the allowed regions. */
  places: string[];
  text: string;
}

const clip = (s: string, n = 80): string => (Array.from(s).length > n ? Array.from(s).slice(0, n - 1).join('') + '…' : s);

function foreignIn(text: string, allowed: ReadonlySet<string>): PlaceMention[] {
  return placesIn(text).filter((m) => !allowedMention(m, allowed));
}

/** Whether a narration sentence puts something in the foreign place it names. */
function sentenceHit(sentence: string, allowed: ReadonlySet<string>): string[] {
  const out: string[] = [];
  const foreign = foreignIn(sentence, allowed);
  const cues: RegExpExecArray[] = [];
  const re = new RegExp(CUE.source, 'gi');
  for (let x = re.exec(sentence); x; x = re.exec(sentence)) cues.push(x);
  if (!cues.length || REJECTED.test(sentence)) return out;
  const live = cues.filter((c) => !NEG_BEFORE_CUE.test(sentence.slice(0, c.index)) && !NEG_BEFORE_CUE_CJK.test(sentence.slice(0, c.index)) && !NEG_AFTER_CUE.test(sentence.slice(c.index + c[0].length)));
  if (!live.length) return out;
  if (!foreign.length) {
    if (allowed.size === 1) {
      const g = GENERIC_ELSEWHERE.exec(sentence);
      if (g && !CONFINED.test(sentence) && !ZH_REFUSE_BEFORE.test(sentence.slice(0, g.index)) && !NEG_AT_PLACE_BEFORE.test(sentence.slice(0, g.index)) && !NEG_AFTER_CUE.test(sentence.slice(g.index + g[0].length))) out.push(g[0]);
    }
    return out;
  }
  for (const m of foreign) {
    const before = sentence.slice(0, m.start);
    const after = sentence.slice(m.end);
    if (NEG_AT_PLACE_BEFORE.test(before) || NEG_AT_PLACE_AFTER.test(after) || ZH_REFUSE_BEFORE.test(before)) continue;
    if (USERS_BEFORE.test(before) || USERS_AFTER.test(after) || USERS_CJK_AFTER.test(after) || USERS_CJK_BEFORE.test(before)) continue;
    if (!out.includes(m.name)) out.push(m.name);
  }
  return out;
}

/**
 * Residency findings for one turn's final diagram and narration. `isClient(nodeId)` drops nodes for users and devices
 * (a label such as "Australian customers" says where people are). `allowed` are place ids, for example ap-southeast-1.
 */
export function scanResidency(allowed: readonly string[], graph: Graph, texts: readonly string[], isClient: (nodeId: string) => boolean = () => false): ScanHit[] {
  const ok = new Set(allowed);
  const hits: ScanHit[] = [];
  for (const g of Object.values(graph.groups ?? {})) {
    if (g.kind !== 'region') continue;
    const f = foreignIn(`${g.label} ${g.id}`, ok);
    if (f.length) hits.push({ where: 'group', ids: [g.id], places: f.map((m) => m.name), text: clip(g.label) });
  }
  for (const n of Object.values(graph.nodes ?? {})) {
    if (isClient(n.id)) continue;
    const f = foreignIn(n.label ?? '', ok);
    if (f.length) hits.push({ where: 'node', ids: [n.id], places: f.map((m) => m.name), text: clip(n.label) });
    for (const s of String(n.why ?? '').split(SENTENCE)) {
      const p = s.trim() ? sentenceHit(s, ok) : [];
      if (p.length) hits.push({ where: 'say', ids: [n.id], places: p, text: clip(s.trim()) });
    }
  }
  for (const e of Object.values(graph.edges ?? {})) {
    const p = e.label ? sentenceHit(e.label, ok) : [];
    if (p.length) hits.push({ where: 'say', ids: [e.id], places: p, text: clip(e.label ?? '') });
  }
  for (const t of texts) {
    for (const s of String(t).split(SENTENCE)) {
      const p = s.trim() ? sentenceHit(s, ok) : [];
      if (p.length) hits.push({ where: 'say', ids: [], places: p, text: clip(s.trim()) });
    }
  }
  return hits;
}
