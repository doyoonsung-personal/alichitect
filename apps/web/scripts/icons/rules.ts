// Rule check for the catalog -> official icon mapping. An 'exact' official row must either share a word with the
// icon (its code or the English words in its source name, against the entry's id, name and aliases), or be backed
// by a code note below that says which product the icon's Chinese name denotes. The contact sheets are the eye check.

/** Official key -> the product its source name denotes, for codes that share no word with the catalog entry. */
export const CODE_EVIDENCE: Readonly<Record<string, { id: string; why: string }>> = {
  mq: { id: 'rocketmq', why: 'mq 消息队列MQ = Message Queue (MQ), the product renamed ApsaraMQ for RocketMQ' },
  csk: { id: 'ack', why: 'csk 容器服务Kubernetes版 = Container Service for Kubernetes' },
  smartag: { id: 'sag', why: 'smartag 智能接入网关 = Smart Access Gateway' },
  hdm: { id: 'das', why: 'hdm 数据库自治服务 = Database Autonomy Service' },
  hologram: { id: 'hologres', why: 'hologram 交互式分析 = Hologres (interactive analytics)' },
  sc: { id: 'flink', why: 'sc 实时计算（流计算） = Realtime Compute for Apache Flink' },
  sas: { id: 'security-center', why: 'sas 云安全中心（态势感知） = Security Center' },
  lvwang: { id: 'content-moderation', why: 'lvwang 内容安全 = Content Moderation (Green)' },
  sos: { id: 'mss', why: 'sos 安全管家 = Managed Security Service' },
  rdc: { id: 'devops', why: 'rdc 云效 = Alibaba Cloud DevOps (Yunxiao)' },
  bccluster: { id: 'lingjun', why: 'bccluster 智能计算灵骏 = Intelligent Computing LINGJUN' },
  alimt: { id: 'machine-translation', why: 'alimt 机器翻译 = Machine Translation' },
  ice: { id: 'ims', why: 'ice 智能媒体生产 = Intelligent Media Services (formerly Intelligent Media Production)' },
  dypns: { id: 'pnvs', why: 'dypns 号码认证服务 = Phone Number Verification Service' },
  hcs_hgw: { id: 'hybrid-cloud-storage', why: 'hcs_hgw 混合云存储阵列 = Hybrid Cloud Storage array' },
  hcs_mgw: { id: 'data-transport', why: 'hcs_mgw 闪电立方 = Lightning Cube (Data Transport)' },
  hcs_sgw: { id: 'csg', why: 'hcs_sgw 云存储网关 = Cloud Storage Gateway' },
  mqc: { id: 'mobile-testing', why: 'mqc 移动测试 = Mobile Testing' },
  cds: { id: 'cassandra', why: 'cds 云数据库Cassandra版 = ApsaraDB for Cassandra' },
  dg: { id: 'database-gateway', why: 'dg 数据库网关 = Database Gateway' },
  beebot: { id: 'conversational-ai-service', why: 'beebot 智能对话机器人 = Intelligent Robot (chatbot service)' },
  pvtz: { id: 'privatezone', why: 'pvtz 云解析 PrivateZone = Alibaba Cloud DNS PrivateZone' },
  ddos_bgp: { id: 'anti-ddos-native', why: 'ddos-bgp DDoS防护包 = Anti-DDoS Origin, now Anti-DDoS Native' },
  ddos_dip: { id: 'anti-ddos-proxy', why: 'ddos-dip DDoS高防国际 = Anti-DDoS Premium (international)' },
  ens: { id: 'ens', why: 'ens 边缘节点服务 = Edge Node Service' },
  clouddesktop: { id: 'eds', why: 'clouddesktop 云桌面 = Cloud Desktop, now Elastic Desktop Service' },
};

const STOP = new Set(['service', 'services', 'cloud', 'alibaba', 'apsaradb', 'for', 'and', 'the', 'of', 'data', 'center', 'management', 'platform', 'version', 'edition', 'intelligent', 'server', 'apsaravideo', 'apsaramq']);

function words(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 2 && !STOP.has(w));
}

export interface EntryLike { id: string; name: string; aliases?: string[] }

/** True when the official icon shares a meaningful word with the entry (either direction, substring allowed). */
export function lexicalMatch(entry: EntryLike, officialKey: string, officialName: string): boolean {
  const ours = new Set([...words(entry.id), ...words(entry.name), ...(entry.aliases ?? []).flatMap(words)]);
  const compact = new Set([entry.id, entry.name, ...(entry.aliases ?? [])].map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')).filter((s) => s.length >= 2));
  const theirs = new Set([...words(officialKey.replace(/_\d+$/, '')), officialKey.replace(/_\d+$/, '').replace(/_/g, ''), ...words(officialName.replace(/[^\x00-\x7f]+/g, ' '))]);
  for (const t of theirs) {
    if (t.length < 2) continue;
    if (ours.has(t) || compact.has(t)) return true;
    for (const o of [...ours, ...compact]) if (o.length >= 3 && t.length >= 3 && (o.includes(t) || t.includes(o))) return true;
  }
  return false;
}

export function ruleCheck(entry: EntryLike, officialKey: string, officialName: string): { ok: boolean; how: string } {
  if (lexicalMatch(entry, officialKey, officialName)) return { ok: true, how: 'word overlap' };
  const ev = CODE_EVIDENCE[officialKey];
  if (ev && ev.id === entry.id) return { ok: true, how: ev.why };
  return { ok: false, how: 'no shared word and no code note' };
}
