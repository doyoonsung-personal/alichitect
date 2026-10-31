// Pinned constraints as data: req ops that carry regions or avoid become Constraint records in chat memory, and every
// turn's diagram and say lines are checked against them. Error-level findings go to the follow-up repair turn, so the
// model fixes the diagram and corrects its narration. Browser-safe: no Node APIs.
import type { Catalog, CatalogEntry, Constraint, Graph, GraphGroup, Op, Warning } from './types.ts';
import { findRegionMentions, foldText, regionLabel } from './regions.ts';
import type { RegionMention } from './regions.ts';

type ReqOp = Extract<Op, { t: 'req' }>;

/** At most this many constraints are kept (the newest win), as for pinned requirement texts. */
export const MAX_CONSTRAINTS = 12;

const key = (s: string): string => s.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
const uniq = (xs: readonly unknown[] | undefined): string[] => [...new Set((xs ?? []).filter((x): x is string => typeof x === 'string' && x.length > 0))];
const sameSet = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x) => b.includes(x));

function toConstraint(x: Constraint | ReqOp): Constraint | null {
  const text = typeof x.text === 'string' ? x.text.trim() : '';
  const regions = uniq(x.regions);
  const avoid = uniq(x.avoid);
  if (!text || (!regions.length && !avoid.length)) return null;
  const c: Constraint = { text };
  if (regions.length) c.regions = regions;
  if (avoid.length) c.avoid = avoid;
  return c;
}

export interface MergeResult {
  constraints: Constraint[];
  /** Pinned constraints (or their region or avoid part) a newer requirement replaced or lifted, as they were; their requirement text is no longer in force. */
  superseded: Constraint[];
  /** Constraints cut off by the cap (the oldest go first); their requirement text stays pinned, without a machine check. */
  capped: Constraint[];
}

const isRegionLift = (s: string): boolean => /^(?:regions?|residency|data[\s-]?residency)$/i.test(s.trim());

/**
 * Adds the machine-checkable form of new req ops (or constraints) to the pinned ones, and reports what they replaced.
 *   - A req without regions, avoid or lifts adds nothing.
 *   - Region pins are one topic and the newest wins: a req that carries regions replaces every earlier region list (it
 *     holds the complete set of regions now allowed), so "Tokyo is fine now" relaxes "stay in Singapore" and two
 *     residency rules can never intersect to nothing. An older constraint that also has an avoid list keeps the avoid part.
 *   - `lifts` drops pins: 'regions' drops every region list, a catalog id drops that product from the avoid lists.
 *   - Text matching a pinned constraint (ignoring case, spacing and punctuation) replaces it in place, so a restated
 *     requirement can correct its lists; the same regions and avoid lists under another wording are a duplicate and skipped.
 *   - Keeps the newest `max`. Never mutates its inputs.
 */
export function mergeConstraintsDetailed(existing: readonly Constraint[], added: ReadonlyArray<Constraint | ReqOp>, max = MAX_CONSTRAINTS): MergeResult {
  let out: Constraint[] = [];
  const superseded: Constraint[] = [];
  for (const c of existing) {
    const n = toConstraint(c);
    if (n) out.push(n);
  }
  /** Removes the regions part (all=true) and/or the listed avoid ids from every pinned constraint except `keepText`. */
  const strip = (regions: boolean, ids: ReadonlySet<string>, keepText?: string): void => {
    const next: Constraint[] = [];
    for (const o of out) {
      if (keepText !== undefined && key(o.text) === keepText) {
        next.push(o);
        continue;
      }
      const hadRegions = !!(regions && o.regions && o.regions.length);
      const avoid = (o.avoid ?? []).filter((a) => !ids.has(a));
      const lostAvoid = avoid.length !== (o.avoid ?? []).length;
      if (!hadRegions && !lostAvoid) {
        next.push(o);
        continue;
      }
      superseded.push(o);
      const kept: Constraint = { text: o.text };
      if (!hadRegions && o.regions && o.regions.length) kept.regions = o.regions;
      if (avoid.length) kept.avoid = avoid;
      if (kept.regions || kept.avoid) next.push(kept);
    }
    out = next;
  };
  for (const x of added) {
    const lifts = uniq(x.lifts);
    if (lifts.length) {
      const all = lifts.some(isRegionLift);
      const ids = new Set(lifts.filter((l) => !isRegionLift(l)));
      strip(all, ids);
    }
    const c = toConstraint(x);
    if (!c) continue;
    const same = out.some((o) => key(o.text) === key(c.text));
    if (!same && out.some((o) => sameSet(o.regions ?? [], c.regions ?? []) && sameSet(o.avoid ?? [], c.avoid ?? []))) continue;
    if (c.regions) strip(true, new Set(), key(c.text));
    const i = out.findIndex((o) => key(o.text) === key(c.text));
    if (i >= 0) out[i] = c;
    else out.push(c);
  }
  const capped = out.length > max ? out.slice(0, out.length - max) : [];
  return { constraints: out.slice(-max), superseded, capped };
}

/** mergeConstraintsDetailed, without the report. */
export function mergeConstraints(existing: readonly Constraint[], added: ReadonlyArray<Constraint | ReqOp>, max = MAX_CONSTRAINTS): Constraint[] {
  return mergeConstraintsDetailed(existing, added, max).constraints;
}

/**
 * Regions data and workloads may use: every pinned regions list must hold, so the intersection; null when none is
 * pinned. mergeConstraints keeps one region list, so an empty result only comes from memory written by an older version.
 */
export function allowedRegions(constraints: readonly Constraint[] | undefined): string[] | null {
  let allowed: string[] | null = null;
  for (const c of constraints ?? []) {
    const rs = uniq(c.regions);
    if (!rs.length) continue;
    allowed = allowed === null ? rs : allowed.filter((r) => rs.includes(r));
  }
  return allowed;
}

// ---------- product families ----------

/** Words that stand for a whole product family when a requirement rules it out ("no Kubernetes"). Lower case. */
const FAMILY_WORDS: Readonly<Record<string, readonly string[]>> = {
  kubernetes: ['kubernetes', 'k8s', 'k8', '쿠버네티스', '쿠버네티스 클러스터', '容器编排', '容器編排', 'kubernetes集群', 'k8s集群'],
};
/** The product that names its family: ruling it out (ack for Kubernetes) rules out the whole family. */
const FAMILY_ROOT: Readonly<Record<string, string>> = { kubernetes: 'ack' };

/** Catalog ids tagged with a family (CatalogEntry.family). */
export function familyMembers(catalog: Catalog, family: string): string[] {
  return catalog.entries.filter((e) => e.family === family).map((e) => e.id);
}

/** The family a requirement word names ("Kubernetes", "k8s", "쿠버네티스"), if any. */
export function familyOfWord(word: string): string | undefined {
  const w = word.normalize('NFKC').trim().toLowerCase();
  for (const [family, words] of Object.entries(FAMILY_WORDS)) if (words.includes(w)) return family;
  return undefined;
}

/**
 * Expands ruled-out ids to their families: a family word is not a catalog id, and the family's root product (ACK for
 * Kubernetes) stands for the family, so "no Kubernetes" also rules out ACS, ACK One, ACK Serverless, ASM and Dify on ACK.
 * Other members (ACS alone) rule out only themselves. Keeps the order given; members follow their root.
 */
export function expandAvoid(catalog: Catalog, ids: Iterable<string>): string[] {
  const out: string[] = [];
  const add = (id: string): void => {
    if (!out.includes(id)) out.push(id);
  };
  for (const id of ids) {
    add(id);
    const fam = catalog.byId.get(id)?.family;
    const family = familyOfWord(id) ?? (fam !== undefined && FAMILY_ROOT[fam] === id ? fam : undefined);
    if (family) for (const m of familyMembers(catalog, family)) add(m);
  }
  // A family word that is not a catalog id ("k8s") is dropped once its members are in.
  return out.filter((id) => catalog.byId.has(id) || !familyOfWord(id));
}

/** Catalog ids the user ruled out, across every pinned constraint; with a catalog, each family is expanded to its members. */
export function avoidedProducts(constraints: readonly Constraint[] | undefined, catalog?: Catalog): Set<string> {
  const out = new Set<string>();
  for (const c of constraints ?? []) for (const a of uniq(c.avoid)) out.add(a);
  return catalog ? new Set(expandAvoid(catalog, out)) : out;
}

// ---------- relaxing in words only ----------

/** The rule itself is dropped: "drop the no-Kubernetes rule", "the restriction is lifted", 제한을 해제, 解除了限制. */
const LIFT_RULE =
  /\b(?:lift(?:ed|s)?|drop(?:ped|s)?|remov(?:e|ed|es)|revok(?:e|ed|es)|rescind(?:ed|s)?|waiv(?:e|ed|es)|relax(?:ed|es)?|cancel(?:l?ed|s)?|end(?:ed|s)?)\s+(?:the\s+|that\s+|this\s+|our\s+|my\s+)?(?:[\w-]+[\s-]+){0,3}(?:rule|restriction|requirement|ban|constraint|limit|limitation|pin|policy|prohibition)s?\b|\b(?:rule|restriction|requirement|ban|constraint|limit|limitation|pin|policy|prohibition)s?\s+(?:is\s+|was\s+|has\s+been\s+|are\s+|were\s+)?(?:now\s+)?(?:lifted|dropped|removed|revoked|rescinded|waived|relaxed|cancel(?:l?ed)|void|over)\b|(?:규칙|제한|금지|요건|제약|조건)\S*\s?(?:을|를|은|는|이|가)?\s?(?:해제|철회|폐지|취소|풀)|(?:해제|철회|폐지)(?:했|합|하)|(?:解除|取消|撤销|撤銷|放宽|放寬|废除|廢除)(?:了|掉)?.{0,24}(?:限制|规则|規則|要求|禁令|约束|約束|条件|條件)|(?:限制|规则|規則|要求|禁令|约束|約束)(?:已经|已經|已)?(?:解除|取消|撤销|撤銷|放宽|放寬)/i;
/** Permission: "Kubernetes is fine now", "ACK is allowed", 쿠버네티스를 써도 됩니다, 现在可以使用 Kubernetes. */
const PERMIT =
  /\b(?:fine|ok|okay|allowed?|permitted|acceptable|welcome|approved|enabled|(?:can|may|could)\s+(?:use|have|go\s+with)|go\s+ahead)\b|허용|괜찮|써도|사용해도|사용\s?가능|쓸\s?수\s?있|허락|승인|可以|允许|允許|没问题|沒問題|同意|批准|行了/i;
/** A word that forbids or limits: any of these beside a permission keeps the pin ("not allowed", "no Kubernetes", 不可以, 금지). */
const FORBID =
  /\b(?:no|not|never|avoid\w*|without|free\s+of|[a-z0-9]+-free|ban(?:s|ned)?|forbid\w*|prohibit\w*|cannot|can['’]t|don['’]t|do\s+not|disallow\w*|only\s+if|unless|except)\b|금지|불가|하지\s?(?:마|않)|없이|못|말고|쓰지|不要|不能|不可|不得|不用|不使用|禁止|无需|無需|避免|没有|沒有|别|別|勿/i;
const BENIGN_NO = /\b(?:no\s+problem|no\s+issues?|not\s+a\s+problem|not\s+an\s+issue)\b|没问题|沒問題/gi;

/**
 * Backstop for a model that relaxes a pin in words only: "Kubernetes is fine now" as a plain requirement, with no `lifts`.
 * A requirement text that names an avoided product or family (by family word, catalog id, name or alias) and either drops
 * the rule or grants permission, with no word that forbids or limits it, lifts the avoided products it names (a family
 * with its members). Texts that only mention the product ("Team knows Kubernetes"), restate the ban ("No Kubernetes
 * skills") or limit the permission ("Kubernetes only for batch jobs") lift nothing. Regions cannot be implied this way:
 * a relaxed region pin needs the complete new list, which only a req op with `regions` carries.
 */
export function impliedLifts(constraints: readonly Constraint[] | undefined, texts: readonly string[], catalog: Catalog): Array<{ text: string; lifts: string[] }> {
  const avoided = avoidedProducts(constraints);
  if (!avoided.size) return [];
  const out: Array<{ text: string; lifts: string[] }> = [];
  for (const text of texts) {
    if (typeof text !== 'string' || !text.trim()) continue;
    const folded = text.normalize('NFKC');
    const permit = LIFT_RULE.test(folded) || (PERMIT.test(folded) && !FORBID.test(folded.replace(BENIGN_NO, ' ')));
    if (!permit) continue;
    const named = new Set<string>();
    const lower = folded.toLowerCase();
    for (const [family, words] of Object.entries(FAMILY_WORDS)) {
      if (words.some((w) => (isLatinWord(w) ? new RegExp(`(?<![a-z0-9])${escapeRe(w)}(?![a-z0-9])`).test(lower) : lower.includes(w)))) {
        for (const m of familyMembers(catalog, family)) if (avoided.has(m)) named.add(m);
      }
    }
    for (const id of avoided) {
      const e = catalog.byId.get(id);
      if (!e) continue;
      for (const name of [e.id, e.name, e.short, ...(e.aliases ?? [])]) {
        const n = typeof name === 'string' ? name.normalize('NFKC').toLowerCase().trim() : '';
        if (n.length < 3) continue;
        if (isLatinWord(n) ? new RegExp(`(?<![a-z0-9])${escapeRe(n)}(?![a-z0-9])`).test(lower) : lower.includes(n)) named.add(id);
      }
    }
    if (named.size) out.push({ text, lifts: expandAvoid(catalog, named) });
  }
  return out;
}

const isLatinWord = (s: string): boolean => /^[\x00-\x7f]+$/.test(s);
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------- say lines ----------

/** Words that move, store or keep a copy of data somewhere (English, Korean, Chinese). */
const DATA_WORDS =
  /\b(?:replicat\w*|replicas?|back(?:s|ed|ing)?[\s-]?up\w*|backups?|cop(?:y|ies|ied|ying)|disaster[\s-]recovery|fail(?:s|ed|ing)?[\s-]?over\w*|migrat\w*|sync(?:s|ed|ing)?|synchroni[sz]\w*|stor(?:e|es|ed|ing|age)|standby|mirror\w*|secondary|snapshots?|archiv\w*|forward(?:s|ed|ing)?|retention|(?:send|sends|sent|sending|ship|ships|shipped|shipping|push|pushes|pushed|upload|uploads|uploaded|export|exports|exported|transfer|transfers|transferred|stream|streams|streamed)\s+(?:\w+\s+){0,3}(?:data|records|logs?|backups?|snapshots?|files|copies|archives?|events|messages|datasets?|objects?)|mov(?:e|es|ed|ing)\s+(?:\w+\s+){0,2}(?:data|records|backups|files|copies)|aggregat\w*|stream(?:s|ed|ing)?|push(?:es|ed|ing)?|ship(?:s|ped|ping)?|export\w*|ingest\w*|extract\w*|passive|located|situated|housed|hosted|deployed|maintain\w*|vault|warehouse|data[\s-]?lake|shadow|active[\s-]active|balanced|distributed|kept|keep(?:s|ing)?\s+(?:all\s+)?(?:\w+\s+){0,2}(?:data|records|backups))\b|복제|백업|복사|재해\s?복구|장애\s?조치|페일오버|마이그레이션|이관|동기화|저장|아카이브|스냅샷|보관|스탠바이|미러링|사본|전송|옮[겨기깁겼]|이전(?:했|합|하)|대기\s?(?:인스턴스|서버|DB|데이터베이스|사이트|환경|노드)|复制|複製|备份|備份|拷贝|拷貝|容灾|容災|灾备|災備|灾难恢复|災難恢復|灾难复原|災難復原|待命|待机|待機|切换到|切換到|故障转移|故障轉移|迁移|遷移|同步|存储|存儲|存放|保存|副本|备用|備用|转移|轉移|移动到|移動到|移到|传输|傳輸|归档|歸檔|备援|備援|传送|傳送|发送|發送|推送|写入|寫入|放到|放在|抽取|汇聚|匯聚|传至|傳至|传到|傳到|分发|分發|建立|维护|維護|搭建|热备|熱備|冷备|冷備|影子|数据湖|數據湖|位于|位於|设在|設在|设于|設於|建在|落地|落在|灌入|加载|加載|导入|導入|导出|導出|聚合|넘기|넘겨|아카이빙|스트리밍|전달|전환|구축|배치|분산|적재|수집|위치|호스팅|포워딩|포워드|내보내|내보낸|덤프|이중화|보조|转发|轉發|转送|镜像|鏡像|发往|發往|发到|發到|送往|送到|转至|轉至|转入|轉入|发出|發出/gi;

/** "DR" counts only in upper case (not "Dr." or an id such as dr-db). */
const DR_WORD = /\bDR\b/g;

/**
 * Phrases whose negative-looking word does not negate a data action: "without downtime", "no delay", "zero data loss",
 * "not only", 无损, 不间断, 지연 없이. They are blanked before negation is looked for, so "replicate to Tokyo without
 * downtime" is still a violation while "replication to Tokyo is disabled" is not. Same length, so positions hold.
 */
const BENIGN: readonly RegExp[] = [
  /\bnever\s+(?:lose|lost|loses|losing|miss|fail|break|corrupt)\b/gi,
  /\bno[\s-]+(?:downtime|delays?|latency|lag|interruptions?|disruptions?|data[\s-]loss|loss|gaps?|impact|manual\s+\w+|extra\s+\w+|problem|worries)\b/gi,
  /\bnot\s+(?:only|just|merely)\b/gi,
  /\bnon[\s-]?stop\b/gi,
  /\bwithout\s+(?:any\s+|a\s+|an\s+|the\s+)?(?:downtime|delays?|interruptions?|disruptions?|data[\s-]loss|loss|gaps?|impact|latency|lag|waiting|hassle|manual\s+\w+|human\s+\w+|extra\s+\w+|code\s+changes|changes)\b/gi,
  /\bzero[\s-]+(?:downtime|data[\s-]loss|loss)\b/gi,
  /\b(?:do|does|did|will|would|can|could|should)(?:\s+not|n['’]t)\s+(?:need|require|cause|incur|add|affect|impact|interrupt|break|lose|block|slow|delay|take)\b/gi,
  /(?:지연|끊김|중단|손실|다운타임|수동\s?작업|수동|장애|중복|오류|문제|걱정|추가\s?비용)\s?(?:없이도|없이|없는|없음)/g,
  /不如|与其|與其|不间断|不間斷|无中断|無中斷|无间断|無間斷|不中断|不中斷|不停机|不停機|无损|無損|无缝|無縫|零停机|零停機|无停机|無停機|没有延迟地?|沒有延遲地?|无延迟|無延遲|无感知?|無感知?|不仅|不僅|不但|不只|不光|不止|不同|不影响|不影響|不丢失|不丟失|不会丢失|不會丟失|不会中断|不會中斷|无需人工|無需人工|无需手动|無需手動|无数据丢失|無數據丟失/g,
];
const blank = (clause: string): string => BENIGN.reduce((s, re) => s.replace(re, (m) => ' '.repeat(m.length)), clause);

// Negation that binds to a data word. English: a negator in the few words before it, or a negative predicate after it.
const EN_NEG_BEFORE =
  /\b(?:not|never|no|none|nor|cannot|can['’]?t|won['’]?t|don['’]?t|doesn['’]?t|didn['’]?t|isn['’]?t|aren['’]?t|wasn['’]?t|weren['’]?t|shouldn['’]?t|without|avoid\w*|refrain\w*|prevent\w*|forbid\w*|prohibit\w*|disabl\w*|skip\w*|exclud\w*|declin\w*|refus\w*|reject\w*|block(?:s|ed|ing)?(?!\s+(?:storage|device|devices|volume|volumes|level|size|chain|store|stores))|disallow\w*|cancel\w*|no\s+longer|unable\s+to|bann?(?:ed|ing|s)|stop(?:s|ped|ping)?)\b/i;
/** "instead of replicating", "rather than copying": the contrast directly before the verb. "...in Virginia instead of Singapore for DR" does not negate DR. */
const INSTEAD_BEFORE = /\b(?:instead\s+of|rather\s+than)\s+(?:\w+\s+)?$/i;
const EN_NEG_AFTER =
  /\b(?:(?:is|are|was|were|be|been|being|gets?|got|remains?|stays?|has\s+been|have\s+been|will\s+be|would\s+be)\s+(?:\w+\s+){0,4}(?:not|never|disabled|turned\s+off|switched\s+off|off|excluded|out\s+of\s+scope|ruled\s+out|blocked|refused|rejected|prohibited|forbidden|banned|cancell?ed|dropped|unavailable|unsupported|prevented|denied|skipped|omitted|removed|declined)|(?:will|would|do|does|did|can|could|should|shall|may|might|must)\s+not|(?:won|don|doesn|didn|can|isn|aren|wasn|weren|shouldn|wouldn|couldn)['’]?t|cannot|never|not\s+(?:allowed|permitted|used|needed|required|configured|enabled|applicable|supported|part|included|in\s+scope|planned|happen\w*|done)|no\s+longer|out\s+of\s+scope|(?:blocked|refused|rejected|denied|prohibited|forbidden|banned|declined|disallowed|vetoed)\s+(?:by|under|due|per|because)|(?:violate|breach|contravene)s?|(?:still|only)\s+(?:under\s+review|being\s+(?:reviewed|considered|evaluated|discussed)))\b/i;
// Korean puts the negation after the verb (복제하지 않습니다, 복제 금지), so look right after the data word.
const KO_NEG_AFTER =
  /^[가-힣]{0,4}\s?(?:[가-힣]{1,3}\s?)?(?:하지|지)\s?(?:않|마|못|말)|^[을를은는이가도]?\s?없(?:이|는|음|습니다|어요|다)|^.{0,14}?(?:꺼져|꺼진|폐기|철회|제거|삭제|없애|없앴|방지|막았|막아|계획에\s?없|[가-힣]{0,4}려면|위반|안\s?됩니다|불가능|검토\s?(?:만|중|했|하였)|고려\s?중|논의\s?중|거절|기각|보류|반려|철회|수\s?없|대신|말고|아니라|아닌|결코|절대로?|전혀|금지|불가|비활성|제외|해제|취소|중단|중지|차단|거부|미지원|범위\s?밖|범위에\s?(?:포함되지|없)|아닙니다|아니에요|필요\s?(?:가\s?)?없|필요하지|사용하지|지원하지|수행하지|허용되지|포함되지)/;
const KO_NEG_BEFORE = /(?:^|\s)(?:안|못)\s?$/;
// A Korean clause ends with its predicate, so a strong negative ending governs every data word before it.
const KO_NEG_TAIL = /(?:하지\s?(?:않|마|못|말)|지\s?(?:않|마세요|마십시오|못)|수\s?없|(?:결코|절대로?|전혀)\s?없|위반|검토\s?(?:만|중|했|하였)|고려\s?중|논의\s?중|거절|기각|보류|반려|철회|제거|삭제|방지|금지|불가|비활성|제외|취소|해제|중단|중지|차단|거부|미지원|아닙니다|아니에요)[^가-힣]*[가-힣]{0,6}[^가-힣]*$/;
// Chinese puts it before the verb (不要复制, 禁止跨地域同步, 无需异地备份) or states it after (已禁用, 不在范围内).
const ZH_NEG_BEFORE =
  /(?:不要|不会|不會|不能|不得|不可|不应|不應|不再|不|没有|沒有|没|沒|无需|無需|无须|無須|无法|無法|无|無|未(?![来來])|勿|禁止|避免|严禁|嚴禁|拒绝|拒絕|取消|停止|关闭|關閉|禁用|停用)/;
// Strong negators reach further (禁止将任何客户数据的副本放置在...): sixteen characters instead of eight.
const ZH_NEG_STRONG = /(?:不会|不會|不能|不可以|不再|不予|不支持|不支援|禁止|避免|严禁|嚴禁|拒绝|拒絕|取消|停止|关闭|關閉|禁用|停用|不要|无需|無需|无法|無法)/;
const ZH_NEG_AFTER = /^.{0,12}?(?:仅考虑|僅考慮|仅评估|僅評估|暂不|暫不|尚未|还未|還未|仍在评估|仍在評估|而非|而不是|取代|已?(?:禁用|停用|关闭|關閉|取消)|不在|未啟用|未启用|不支持|不支援|不予|不做|不需要|不必|不需|范围外|範圍外|不适用|不適用|不涉及|並未|并未|不採用|不采用|不允许|不允許|不启用|不啟用|被禁止|已禁止|不使用|不会发生|不會發生)/;

/** A clause that rejects what the clause before it proposed ("but rejected immediately", "decided against it", "we confirmed everything stays in Seoul"). */
const REJECT_NEXT =
  /^\s*(?:(?:but|and|so|yet|though|however|although)\s+)?(?:(?:we|it|they|i|that|this|which|the\s+\w+)\s+)?(?:(?:was|were|is|are|got|been|has\s+been|have\s+been)\s+)?(?:\w+ly\s+)?(?:turned\s+off|switched\s+off|shut\s+down|scrapped|axed|abandoned|decided\s+against|chose\s+not|(?:contains?|carr(?:y|ies)|includ\w+)\s+no\s+(?:customer|personal|user|real)|(?:with|has|have)\s+no\s+(?:customer|personal|user)\s+data|without\s+(?:any\s+)?(?:customer|personal|user)\s+data|(?:does|do)\s+not\s+(?:include|contain|carry)|(?:chose|decided|opted)\s+to\s+(?:keep|stay|remain)|(?:kept|keeping|keep)\s+(?:everything|all|it|the\s+data|data)\s+(?:local|in|inside)|opted\s+(?:against|not)|rejected|declined|dropped|shelved|cancell?ed|ruled\s+out|vetoed|postponed|deferred|abandoned|put\s+on\s+hold|denied|refused|blocked|prohibited|forbidden|(?:\w+\s+){0,3}forced\s+us\s+to\s+(?:keep|stay)|confirmed\s+(?:that\s+)?(?:everything|all|it|the\s+data|data)\s+(?:should\s+|would\s+|will\s+)?(?:stays?|remains?|be\s+kept|be\s+stored))\b/i;

/** The same in Korean and Chinese: the clause after "but" refuses, cancels or confines the plan ("但最终否决了该方案", "최종적으로 철회되었습니다", "싱가포르 단일 리전으로 결정"). */
const REJECT_NEXT_CJK =
  /^\s*[^。！？.!?]{0,10}?(?:没有采纳|沒有採納|未采纳|未採納|不采纳|不採納|否决|否決|取消|放弃|放棄|拒绝|拒絕|驳回|駁回|搁置|擱置|撤销|撤銷|作罢|不予|不批准|未批准|不通过|未通过|지\s?않|未采用|未採用|不采用|不採用|未被采用|未实施|未實施|不实施|未落实|不包含|不含|不涉及|不包括|不携带|不攜帶|철회|기각|거절|보류|반려|폐기|수용할\s?수\s?없|수용하지|허용되지|불가능|단일\s?리전|유지하기로|고수하기로|에서만|한정|로\s?제한)/;

/** A clause that is only a negation ("but will not", "not that"): it negates the clause before it. */
const BARE_NEG =
  /^\s*(?:(?:but|and|so|yet|though|however|although)\s+)?(?:(?:we|it|they|i|that|this|which)\s+)?(?:(?:will|would|do|does|did|can|could|shall|should)\s+)?(?:not|never|n['’]t|won['’]t|don['’]t|doesn['’]t|cannot|can['’]t)\b(?:\s+\w+){0,3}\s*$/i;

/** "Another region" without naming one: an error with a data word when exactly one region is allowed. */
const CROSS_REGION =
  /\b(?:cross[\s-]?region|inter[\s-]?region|multi[\s-]?region|second\s+(?:region|country|site|location|geograph\w+)|another region|other regions?|different regions?|secondary region|standby region|DR region|remote regions?|geo[\s-]?(?:redundan\w*|replicat\w*|distribut\w*)|geographically\s+(?:redundant|distributed|separate\w*)|off[\s-]?site|another\s+(?:country|geograph\w+|continent|data\s?cent(?:er|re)|site)|different\s+(?:country|countries|geograph\w+|continent|data\s?cent(?:er|re))|other\s+(?:countries|geograph\w+|continents)|overseas|abroad|offshore|secondary\s+(?:site|data\s?cent(?:er|re)|location)|multi[\s-]?site|global\s+(?:replication|backup|sync|distribution)|(?:across|in|to)\s+(?:all|every|multiple|several|many)\s+regions)\b|모든\s?리전|여러\s?리전|전\s?세계|全球(?:复制|複製|同步|多地域)|所有(?:区域|地域|區域)|교차\s?리전|리전\s?간|다른\s?(?:리전|지역|국가|나라|대륙)|두 번째 리전|원격\s?(?:리전|지역|사이트)|해외|오프\s?사이트|지리(?:적)?\s?(?:중복|이중화|분산|복제)|글로벌\s?복제|跨地域|跨区域|跨區域|跨国|跨國|异地|異地|另一个地域|另一個地域|第二地域|不同地域|不同地区|不同地區|另一个区域|另一個區域|另一个地区|另一個地區|其他地域|其他区域|其它地域|海外|境外|国外|國外|地理冗余|地理冗餘|地理分布|多地域/i;

/** The clause says the copy stays inside one region (between zones, 同一区域, 동일 리전), so "cross-region" or 异地 there is the contrast, not the plan. */
const SAME_REGION = /\b(?:never\s+leaves?\s+the\s+(?:country|region)|does\s+not\s+leave|without\s+leaving|same[\s-]region|within\s+(?:the\s+)?(?:same\s+)?(?:region|singapore)|inside\s+(?:the\s+)?(?:same\s+)?region|cross[\s-]zone|multi[\s-]?az|between\s+zones)\b|리전\s?내|(?:반출|유출|이동|전송)\s?없이|동일\s?리전|같은\s?리전|동일\s?지역|가용\s?영역\s?간|(?<!不)同一(?:个)?(?:区域|地域|地区|區域|地區)|(?<!不)同(?:区域|地域|地区|區域|地區)|同城|跨可用区|跨可用區|可用区之间|可用區之間/i;

/** The first cross-region phrase in a clause that the clause does not negate or confine to one region; `blank`ed text is used for negation. */
function crossRegionIn(clause: string): boolean {
  if (SAME_REGION.test(clause)) return false;
  const re = new RegExp(CROSS_REGION.source, 'gi');
  const s = blank(clause);
  for (let m = re.exec(clause); m; m = re.exec(clause)) {
    const before = s.slice(0, m.index);
    const after = s.slice(m.index + m[0].length);
    const negated =
      EN_NEG_BEFORE.test(before.split(/\s+/).filter(Boolean).slice(-4).join(' ')) ||
      INSTEAD_BEFORE.test(before) ||
      ZH_NEG_BEFORE.test(before.trimEnd().slice(-10)) ||
      ZH_NEG_STRONG.test(before.trimEnd().slice(-16)) ||
      KO_NEG_BEFORE.test(before) ||
      KO_NEG_AFTER.test(after.slice(0, 18)) ||
      ZH_NEG_AFTER.test(after.slice(0, 16));
    if (!negated) return true;
  }
  return false;
}

/** A place named only to say where people are (users in Japan, 日本的使用者), not where data goes. */
const PEOPLE_EN = '(?:parents?(?!\\s+(?:facilit\\w+|sites?|data\\s?cent\\w+|regions?|clusters?|databases?|db|buckets?|storage))|head\\s*offices?|headquarters|HQ|subsidiar(?:y|ies)|branch(?:es)?|affiliates?|users?|customers?|clients?|visitors?|shoppers?|consumers?|audience|traffic|requests?|people|staff|employees?|developers?|analysts?|workers?|teams?|offices?|markets?|population|partners?)';
const USERS_BEFORE = new RegExp(`\\b${PEOPLE_EN}\\s+(?:(?:located\\s+|based\\s+|living\\s+|working\\s+)?(?:in|from|across|within|at|of|near)\\s+)(?:the\\s+)?$`, 'i');
const USERS_AFTER = new RegExp(`^(?:['’]s)?\\s+${PEOPLE_EN}\\b`, 'i');
const USERS_AFTER_CJK = /^(?:의|에서\s?오는|에\s?있는|발|쪽|지역|현지|的|地区的|地區的|境内的|境內的)?\s?(?:사용자|고객|유저|이용자|시장|트래픽|팀|직원|방문자|소비자|요청|거래처|파트너|用户|用戶|客户|客戶|使用者|市场|市場|流量|团队|團隊|员工|員工|访客|訪客|请求|請求|消费者|消費者)/;
const USERS_BEFORE_CJK = /(?:来自|來自|(?:客户端?|客戶端?|用户端?|用戶端?|员工|員工|团队|團隊|办公室|辦公室|分公司|总部|總部|访客|訪客)(?:位于|位於|在|设在|設在|都在|多在))$/;

/**
 * A region named only to be ruled out ("instead of Tokyo", "not Seoul", "而不是东京", "도쿄 대신"): the contrast, not the
 * plan. The negator must touch the region name; "do not replicate to Tokyo" is handled by the data word's own negation.
 */
const REGION_RULED_BEFORE = /(?:\b(?:instead\s+of|rather\s+than|other\s+than|not|except(?:\s+for)?|excluding|as\s+opposed\s+to|versus|vs\.?)\s+(?:the\s+|in\s+|to\s+|into\s+|at\s+)?|(?:而不是|不是|而非|并非|並非|除了|除去|而不)\s*(?:在|到|于|於)?)$/i;
const REGION_RULED_AFTER = /^\s*(?:이|가|은|는|을|를|에|로|으로)?\s*(?:대신|말고|아니라|아닌|제외)/;

function ruledOut(clause: string, m: RegionMention): boolean {
  const folded = foldText(clause);
  return REGION_RULED_BEFORE.test(folded.slice(0, m.start)) || REGION_RULED_AFTER.test(folded.slice(m.end));
}

function userLocation(clause: string, m: RegionMention): boolean {
  const folded = foldText(clause);
  const before = folded.slice(0, m.start);
  const after = folded.slice(m.end);
  return USERS_BEFORE.test(before) || USERS_BEFORE_CJK.test(before) || USERS_AFTER.test(after) || USERS_AFTER_CJK.test(after);
}

// A full stop after a single capital letter is an abbreviation ("N. Virginia", "U.S. East"), not a sentence end.
const SENTENCE = /(?<!\b[A-Z])\.+|[!?。！？;；\n]+/;
const CLAUSE = /[,，、:：]|(?<=[었았였했])(?:고|으며)\s|\s(?:but|while|whereas|although|though|however|so|yet)\s|\s[-–—]\s|(?<=[가-힣])(?:지만|으나)\s|(?:但是|但|不过|不過|然而|可是)/i;

/** The sentence after a question that answers it "yes": the question was a plan ("Do we need a backup in Tokyo? Absolutely, it is configured."). */
const AFFIRM =
  /^\s*(?:yes|yeah|yep|absolutely|correct|right|indeed|sure|certainly|confirmed(?![,:]?\s+(?:no|not|never)\b)|of\s+course|that['’]?s\s+(?:right|correct|the\s+plan)|맞습니다|맞아요|네[,，]?|예[,，]|그렇습니다|그렇게\s?(?:진행|하겠)|是的|是啊|已执行|已執行|已完成|已配置|对[,，]|對[,，]|没错|沒錯|确实|確實|正确|正確)/i;

/** Sentences of a text, each with whether it is a question ("Should we move cold data to Sydney?" asks; it places nothing). */
function sentencesOf(text: string): Array<[string, boolean]> {
  const out: Array<[string, boolean]> = [];
  const re = new RegExp(SENTENCE.source, 'g');
  let from = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    out.push([text.slice(from, m.index), /[?？]/.test(m[0])]);
    from = m.index + m[0].length;
  }
  out.push([text.slice(from), false]);
  for (let i = 0; i + 1 < out.length; i++) if (out[i][1] && AFFIRM.test(out[i + 1][0])) out[i][1] = false;
  return out;
}

export interface SayFinding {
  severity: 'error' | 'warn';
  /** Region ids named in the clause that are outside the allowed regions. */
  regions: string[];
  /** The clause that names them. */
  clause: string;
  /** The data-moving word found in the clause, if any. */
  verb?: string;
  negated: boolean;
  /** The clause sends data to "another region" without naming it (checked only when exactly one region is allowed). */
  crossRegion?: boolean;
}

interface DataHit {
  word: string;
  negated: boolean;
  index: number;
}

/** Conjunctions that start a new action: a negation after one does not reach back over it. */
const SPLIT_ACTION = /\b(?:and|then|also|plus)\b|和|并且|並且|而且|并|及|및|그리고/i;

/** Every data-moving word in a clause, each marked negated or not (negation binds to the word it is next to). */
function dataHits(clause: string, nextBare: boolean): DataHit[] {
  const s = blank(clause);
  const tailNeg = KO_NEG_TAIL.test(s.slice(-26));
  const hits: DataHit[] = [];
  for (const re of [DATA_WORDS, DR_WORD]) {
    re.lastIndex = 0;
    for (let m = re.exec(s); m; m = re.exec(s)) {
      const before = s.slice(0, m.index);
      const after = s.slice(m.index + m[0].length);
      const words = before.split(/\s+/).filter(Boolean).slice(-6).join(' ');
      const negated =
        nextBare ||
        tailNeg ||
        EN_NEG_BEFORE.test(words + ' ' + m[0]) || // the data word itself is tested too: "block storage" is a noun phrase, not a negation
        INSTEAD_BEFORE.test(before) ||
        ZH_NEG_BEFORE.test(before.trimEnd().slice(-10)) ||
        ZH_NEG_STRONG.test(before.trimEnd().slice(-16)) ||
        KO_NEG_BEFORE.test(before) ||
        EN_NEG_AFTER.test(after.split(/\s+/).slice(0, 9).join(' ')) ||
        KO_NEG_AFTER.test(after.slice(0, 18)) ||
        ZH_NEG_AFTER.test(after.slice(0, 16));
      hits.push({ word: m[0], negated, index: m.index });
    }
  }
  hits.sort((a, b) => a.index - b.index);
  // "Backups are never replicated to Tokyo": the noun before the negated verb is negated with it, unless a new
  // action ("and") sits between them ("back up to Seoul and do not replicate to Tokyo" still backs up to Seoul).
  // A negator reaches forward over the data words that follow it in the same action ("avoid storing copies of ...").
  for (let i = 1; i < hits.length; i++) {
    if (hits[i].negated || !hits[i - 1].negated) continue;
    if (!SPLIT_ACTION.test(s.slice(hits[i - 1].index + hits[i - 1].word.length, hits[i].index))) hits[i].negated = true;
  }
  for (let i = hits.length - 2; i >= 0; i--) {
    if (hits[i].negated || !hits[i + 1].negated) continue;
    const from = hits[i].index + hits[i].word.length;
    const to = hits[i + 1].index;
    if (!SPLIT_ACTION.test(s.slice(from, to))) hits[i].negated = true;
  }
  return hits;
}

/**
 * Foreign-region mentions in one say line (or a why or edge label). A clause that names a region outside `allowed`
 * and holds a data-moving word (replicate, back up, copy, DR, failover, migrate, sync, store, standby, mirror, or the
 * Korean and Chinese equivalents) that is not negated is an error; any other foreign mention is a warn. A country
 * counts as foreign only when none of its regions is allowed, and a place named only for where users are is no
 * mention. Negation must bind to the data word ("do not replicate", "복제하지 않습니다", "不要复制", "replication is
 * disabled"); an adverb such as "without downtime" or "지연 없이" does not negate. When exactly one region is allowed,
 * a clause that sends data to another region without being specific ("cross-region replication", "a geo-redundant copy",
 * "offsite backup in another country") is an error too, whether or not it also names the allowed region.
 */
export function sayRegionFindings(text: string, allowed: readonly string[]): SayFinding[] {
  if (typeof text !== 'string' || !text.trim()) return [];
  const ok = new Set(allowed);
  const out: SayFinding[] = [];
  for (const [sentence, question] of sentencesOf(text)) {
    const clauses = sentence.split(CLAUSE).filter((c) => c && c.trim());
    for (let i = 0; i < clauses.length; i++) {
      const clause = clauses[i];
      const stripped = blank(clause);
      const nextBare =
        i + 1 < clauses.length &&
        ((BARE_NEG.test(blank(clauses[i + 1])) && !dataHits(clauses[i + 1], false).length && !findRegionMentions(clauses[i + 1]).length) || REJECT_NEXT.test(blank(clauses[i + 1])) || REJECT_NEXT_CJK.test(clauses[i + 1]));
      const foreign: string[] = [];
      const placed: string[] = []; // foreign places that are only where users are: a warn at most
      for (const m of findRegionMentions(clause)) {
        if (m.ids.some((id) => ok.has(id))) continue;
        const into = userLocation(clause, m) || ruledOut(clause, m) ? placed : foreign;
        for (const id of m.ids) if (!into.includes(id)) into.push(id);
      }
      const hits = dataHits(clause, nextBare);
      const live = hits.find((h) => !h.negated);
      const v = live ?? hits[0];
      const negated = hits.length > 0 ? !live : BARE_NEG.test(stripped) || EN_NEG_BEFORE.test(stripped) || ZH_NEG_BEFORE.test(stripped.slice(0, 6));
      if (!foreign.length) {
        if (allowed.length === 1 && live && !question && crossRegionIn(clause)) {
          out.push({ severity: 'error', regions: [], clause: clause.trim(), verb: live.word, negated: false, crossRegion: true });
        } else if (placed.length) {
          out.push({ severity: 'warn', regions: placed, clause: clause.trim(), negated });
        }
        continue;
      }
      const f: SayFinding = { severity: live && !question ? 'error' : 'warn', regions: foreign, clause: clause.trim(), negated };
      if (v) f.verb = v.word;
      out.push(f);
    }
  }
  return out;
}

// ---------- the check ----------

function W(code: Warning['code'], ids: string[], msg: string, severity: Warning['severity']): Warning {
  return { code, ids: [...new Set(ids.filter((x) => typeof x === 'string' && x.length > 0))], msg, severity, repaired: false };
}

const has = (r: object, k: string): boolean => Object.prototype.hasOwnProperty.call(r, k);
const clip = (s: string, n = 90): string => (Array.from(s).length > n ? Array.from(s).slice(0, n - 1).join('') + '…' : s);

function chainHas(g: Graph, groupId: string | null, target: string): boolean {
  let cur = groupId;
  for (let i = 0; cur !== null && i < 32; i++) {
    if (cur === target) return true;
    const grp: GraphGroup | undefined = has(g.groups, cur) ? g.groups[cur] : undefined;
    cur = grp ? grp.parent : null;
  }
  return false;
}

function entryOf(catalog: Catalog, product: string): CatalogEntry | undefined {
  try {
    return catalog.byId.get(product) ?? catalog.resolve(product).entry;
  } catch {
    return undefined;
  }
}

/**
 * Checks a graph and the turn's say lines against pinned constraints. Region constraints (the intersection of every
 * pinned regions list): a region group whose label names only other regions, and the nodes in it, are an error; so is
 * a region group that names no region at all when exactly one region is allowed and the diagram holds a second region
 * group (a "DR Region" is another region whatever its label says); a node whose label names another region is an error;
 * a say line, why or edge label that pairs another region with a data-moving word is an error, and any other mention
 * of another region in a say line is a warn. Pinned lists that do not overlap are reported once, as a warn, and no
 * region finding follows. Avoid constraints (families expanded through the catalog): a node or rec whose product the
 * user ruled out is an error. Nothing is changed; every warning has repaired: false.
 */
export function checkConstraints(graph: Graph, says: readonly string[], constraints: readonly Constraint[], catalog: Catalog): Warning[] {
  const out: Warning[] = [];
  const allowed = allowedRegions(constraints);
  const avoid = avoidedProducts(constraints, catalog);
  const nodes = Object.values(graph.nodes ?? {});
  if (allowed && !allowed.length) {
    const pinned = constraints.filter((c) => c.regions && c.regions.length).map((c) => `"${c.text}"`).join(', ');
    out.push(W('constraint-region', [], `the pinned region lists do not overlap (${pinned}), so no region can be checked; unpin the older residency requirement`, 'warn'));
  } else if (allowed) {
    const pinned = constraints.filter((c) => c.regions && c.regions.length).map((c) => `"${c.text}"`).join(', ');
    const where = allowed.map(regionLabel).join(', ');
    const rule = `the pinned regions are ${where} (${pinned})`;
    const ok = new Set(allowed);
    const foreignIn = (text: string): string[] => {
      const ids: string[] = [];
      for (const m of findRegionMentions(text)) if (!m.ids.some((id) => ok.has(id))) for (const id of m.ids) if (!ids.includes(id)) ids.push(id);
      return ids;
    };
    const flagged = new Set<string>();
    const regionGroups = Object.values(graph.groups ?? {}).filter((g) => g.kind === 'region');
    const namesAllowed = (g: GraphGroup): boolean => findRegionMentions(`${g.label} ${g.id}`).some((m) => m.ids.some((id) => ok.has(id)));
    const unnamed = regionGroups.filter((g) => !findRegionMentions(`${g.label} ${g.id}`).length);
    // One allowed region and a second region group: a group that names no region is the extra one when another group
    // names the allowed region; with none naming it, the first group is the primary and the others are extra.
    const extra = new Set<string>();
    if (allowed.length === 1 && regionGroups.length > 1) {
      const anchored = regionGroups.some(namesAllowed);
      unnamed.forEach((g, i) => {
        if (anchored || i > 0) extra.add(g.id);
      });
    }
    for (const grp of regionGroups) {
      const named = findRegionMentions(`${grp.label} ${grp.id}`);
      const isExtra = extra.has(grp.id);
      if (!isExtra && (!named.length || named.some((m) => m.ids.some((id) => ok.has(id))))) continue;
      const inside = nodes.filter((n) => chainHas(graph, n.group, grp.id)).map((n) => n.id);
      for (const id of inside) flagged.add(id);
      if (isExtra) {
        out.push(W('constraint-region', [grp.id, ...inside], `region group '${grp.id}' (${grp.label}) names no region, but it is a second region group and the pinned region is ${where}${inside.length ? `; it holds ${inside.join(', ')}` : ''}; ${rule}`, 'error'));
        continue;
      }
      const regions = [...new Set(named.flatMap((m) => m.ids))].map(regionLabel).join(', ');
      out.push(W('constraint-region', [grp.id, ...inside], `region group '${grp.id}' (${grp.label}) is in ${regions}${inside.length ? ` and holds ${inside.join(', ')}` : ''}; ${rule}`, 'error'));
    }
    for (const n of nodes) {
      if (flagged.has(n.id)) continue;
      const named = foreignIn(n.label);
      if (named.length) {
        out.push(W('constraint-region', [n.id], `'${n.id}' is labelled "${clip(n.label)}", which places it in ${named.map(regionLabel).join(', ')}; ${rule}`, 'error'));
        continue;
      }
      for (const f of sayRegionFindings(n.why ?? '', allowed)) {
        if (f.severity !== 'error') continue;
        out.push(W('constraint-region', [n.id], `the why of '${n.id}' says "${clip(f.clause)}" (${f.verb} to ${f.regions.length ? f.regions.map(regionLabel).join(', ') : 'another region'}); ${rule}`, 'error'));
      }
    }
    for (const e of Object.values(graph.edges ?? {})) {
      for (const f of sayRegionFindings(e.label ?? '', allowed)) {
        if (f.severity !== 'error') continue;
        out.push(W('constraint-region', [e.id], `edge '${e.id}' is labelled "${clip(e.label ?? '')}" (${f.verb} to ${f.regions.length ? f.regions.map(regionLabel).join(', ') : 'another region'}); ${rule}`, 'error'));
      }
    }
    for (const s of says) {
      for (const f of sayRegionFindings(s, allowed)) {
        const regions = f.regions.map(regionLabel).join(', ');
        const msg = f.crossRegion
          ? `a say line sends data to another region ("${f.verb}"): "${clip(f.clause)}"; ${rule}. Correct the narration and keep data in the pinned region`
          : f.severity === 'error'
            ? `a say line pairs ${regions} with "${f.verb}": "${clip(f.clause)}"; ${rule}. Correct the narration and keep data in the pinned regions`
            : `a say line names ${regions}: "${clip(f.clause)}"; ${rule}`;
        out.push(W('constraint-region', [], msg, f.severity));
      }
    }
  }
  if (avoid.size) {
    const texts = constraints.filter((c) => c.avoid && c.avoid.length).map((c) => `"${c.text}"`).join(', ');
    const ruled = (product: string): string | undefined => {
      if (avoid.has(product)) return product;
      const e = entryOf(catalog, product);
      return e && avoid.has(e.id) ? e.id : undefined;
    };
    for (const n of nodes) {
      const id = ruled(n.product);
      if (id) out.push(W('constraint-avoid', [n.id], `'${n.id}' uses ${id}, which the user ruled out (${texts}); replace or remove it`, 'error'));
    }
    for (const r of graph.recs ?? []) {
      const id = ruled(r.product);
      if (id) out.push(W('constraint-avoid', [r.product], `rec '${r.product}' is a product the user ruled out (${texts}); remove it`, 'error'));
    }
  }
  return out;
}

/** checkConstraints in the object form llm.ts RunTurnOptions.checkConstraints takes. */
export function constraintChecker(input: { graph: Graph; says: readonly string[]; constraints: readonly Constraint[]; catalog: Catalog }): Warning[] {
  return checkConstraints(input.graph, input.says, input.constraints, input.catalog);
}
