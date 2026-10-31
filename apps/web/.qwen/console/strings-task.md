Translate new UI strings for an Alibaba Cloud architecture builder from English into Korean (ko) and Simplified Chinese (zh).

Style rules (follow strictly):
- Product UI, short, direct. Korean uses polite 합니다/해요-free neutral UI style like the examples (e.g. "Qwen 대기 중", "{s}초 만에 그리기 완료"). Chinese is concise, no 您 unless the example does.
- Keep {placeholders} exactly as written, in the same form. Keep "Qwen", product names and "Alibaba Cloud" in English.
- Glossary: requirement = 요구 사항 / 需求; held = met (충족 / 满足); revision = 리비전 / 修订; diagram = 다이어그램 / 图表; zone = 가용 영역 / 可用区; card = 카드 / 卡片; frame = 프레임 / 框; "ruled out" = 제외 / 排除; pinned = 고정 / 固定; "Qwen fixed it" = "Qwen이 ... 수정했습니다" / "Qwen 已 ... 修复".
- Existing strings for tone reference:
  rec.fixRegion ko: "{label}이(가) {regions} 밖에 그려졌습니다. Qwen이 변경 사항을 저장하기 전에 수정했습니다."
  rec.fixRegion zh: "{label} 被绘制在 {regions} 之外。Qwen 已在保存변更前修复了该问题。"
  rec.stopped ko: "중지했습니다. 다이어그램은 변경되지 않았습니다."  zh: "已停止。您的图表未更改。"
  req.broken ko: "리비전 {n}에서 충족하지 못함"  zh: "修订 {n} 中未满足"
  rec.autoFixes.other ko: "카탈로그 규칙이 배치 수정 {n}건을 적용했습니다"  zh: "目录规则已应用 {n} 项布置修复"
  composer.busy ko: "이 리비전이 끝날 때까지 기다리거나 중지하세요."  zh: "请等待此修订完成，或停止它。"

Return one JSON object: {"<key>": {"ko": "...", "zh": "..."}, ...} with exactly the keys below and nothing else.

Keys and English source:
console.label: "Revision record"
rec.logLabel: "Revisions"
rec.collapse: "Collapse revision {n}"
rec.tagLabel: "Revision {n}: show its changes on the diagram"
rec.stoppedShort: "Stopped"
rec.seconds: "{s} s"
rec.showLess: "Show less"
rec.fixing: "Fixing the diagram…"
rec.fixRegionGeneric: "Part of the diagram was drawn outside {regions}. Qwen fixed it before the change was saved."
rec.fixAvoidGeneric: "A product you ruled out was drawn. Qwen removed it before the change was saved."
req.notMet: "Not met"
req.risk: "At risk"
req.unpinLabel: "Unpin requirement: {text}"
error.http: "The drawing service returned an error ({code}). Your diagram is unchanged."
replay.instant: "Instant"
fix.attachInline: "A product drawn as a separate step was attached to its host card."
fix.zoneReplicas: "Per-zone copies were merged into one card that lists its zones."
fix.missingGroup: "A missing frame was added around its products."
fix.pathOrder: "The request path was put back in order."
fix.attachInvalid: "A product that cannot attach to its host was drawn as its own card with a connection."
fix.containment: "A card was moved into the frame it belongs in."
fix.dangling: "A connection to a card that does not exist was dropped."
fix.other: "A placement issue was corrected."
