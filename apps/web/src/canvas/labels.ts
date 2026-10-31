// The few words the canvas prints that strings.json does not carry (frame names the layout writes in English, the
// legend, the zoom value, accessible names). Reviewed against the glossary in strings.json; first drafted by Qwen
// (qwen3.8-flash) and corrected by hand: revision = 리비전/修订, zones = 가용 영역/可用区, region = 리전/地域.
// Kept local so the canvas track does not edit the shared strings file; the inspection pass may merge these keys there.
import type { Lang, Vars } from '../i18n/t.ts';

const T = {
  'lane.storage': { en: 'Storage', ko: '스토리지', zh: '存储' },
  'lane.ai': { en: 'AI', ko: 'AI', zh: 'AI' },
  'lane.analytics': { en: 'Analytics', ko: '분석', zh: '分析' },
  'lane.integration': { en: 'Integration', ko: '통합', zh: '集成' },
  'lane.compute': { en: 'Compute', ko: '컴퓨팅', zh: '计算' },
  'lane.ops': { en: 'Operations', ko: '운영', zh: '运维' },
  'lane.security': { en: 'Security', ko: '보안', zh: '安全' },
  'lane.network': { en: 'Network', ko: '네트워크', zh: '网络' },
  'frame.region': { en: 'Region', ko: '리전', zh: '地域' },
  'frame.vpc': { en: 'VPC', ko: 'VPC', zh: 'VPC' },
  'frame.internet': { en: 'Internet', ko: '인터넷', zh: '互联网' },
  'frame.onprem': { en: 'On-premises', ko: '온프레미스', zh: '本地' },
  'frame.global': { en: 'Global', ko: '글로벌', zh: '全球' },
  'frame.zone': { en: 'Zone {letter}', ko: '가용 영역 {letter}', zh: '可用区 {letter}' },
  'legend.path': { en: 'Request path', ko: '요청 경로', zh: '请求路径' },
  'conn.heading': { en: 'Connections', ko: '연결', zh: '连接' },
  'zoom.value': { en: 'Zoom {value}', ko: '배율 {value}', zh: '缩放 {value}' },
  'zoom.floor': { en: 'Below the readable size', ko: '읽을 수 있는 크기 이하', zh: '低于可读大小' },
  'badge.on': { en: '{badge} on {host}', ko: '{host}에 적용된 {badge}', zh: '{badge}（附加于 {host}）' },
  'card.zones': { en: 'zones {list}', ko: '가용 영역 {list}', zh: '可用区 {list}' },
  'card.caution': { en: 'Lifecycle note', ko: '수명 주기 안내', zh: '生命周期说明' },
  'card.revTag': { en: 'Revision {n}', ko: '리비전 {n}', zh: '修订 {n}' },
  'card.building': { en: 'Added in this revision', ko: '이 리비전에서 추가됨', zh: '本次修订新增' },
  'canvas.keys': { en: 'Arrow keys move between products. Enter opens details. F fits the diagram.', ko: '화살표 키로 제품 사이를 이동하고, Enter로 상세 정보를 엽니다. F로 다이어그램을 화면에 맞춥니다.', zh: '用方向键在产品间移动，按 Enter 打开详情，按 F 适应视图。' },
  'pop.lifecycle.preview': { en: 'In preview.', ko: '미리보기 단계입니다.', zh: '预览阶段。' },
  'pop.lifecycle.legacy': { en: 'Legacy product.', ko: '레거시 제품입니다.', zh: '旧版产品。' },
  'pop.lifecycle.noNew': { en: 'No longer sold to new customers.', ko: '신규 고객에게는 판매하지 않습니다.', zh: '不再向新客户销售。' },
  'pop.lifecycle.retired': { en: 'Retired.', ko: '판매가 종료되었습니다.', zh: '已停售。' },
  'pop.lifecycle.chinaOnly': { en: 'Sold only on the China site.', ko: '중국 사이트에서만 판매합니다.', zh: '仅在中国站销售。' },
  'pop.lifecycle.restricted': { en: 'Available after an application is approved.', ko: '신청 승인 후 사용할 수 있습니다.', zh: '需申请并通过审批后使用。' },
  'pop.lifecycle.announced': { en: 'Announced, not yet sold.', ko: '발표되었으며 아직 판매 전입니다.', zh: '已发布，暂未销售。' },
} as const;

export type LabelKey = keyof typeof T;

export function label(lang: Lang, key: LabelKey, vars?: Vars): string {
  const row = T[key];
  const tpl: string = row[lang] ?? row.en;
  return vars ? tpl.replace(/\{(\w+)\}/g, (m, k: string) => (Object.hasOwn(vars, k) ? String(vars[k]) : m)) : tpl;
}

/** The shelf lane label for a layout lane id ('storage', 'ops' ...), or undefined when the lane has no local name. */
export function laneLabelKey(lane: string): LabelKey | undefined {
  const k = `lane.${lane}`;
  return Object.hasOwn(T, k) ? (k as LabelKey) : undefined;
}
