# Gap review (completeness critic)

Run 2026-10-31 after all six areas were researched and fact-checked. The critic looked for missing or contradictory points that would change the verdict, then researched each gap.

## Overall take

Feasible, with no hard blockers, but only in a narrower shape than the vision implies: an independent, desktop-first architecture advisor for the international site, invite- or Turnstile-gated, built on a hand-curated and owned catalog. It should not be an anonymous public tool styled like an official Alibaba product.

The LLM loop is the most de-risked part. NDJSON ops stream with thinking off: about 2 s to first op, 3-12 s per edit. Cost is about $0.015-0.017 per warm diagram, about $0.010-0.012 per edit, and about $0.06 per five-turn session, plus $20-39 a month for keep-warm. That is affordable.

What decides success is operational and editorial:
1. Spend protection on the user's own account. Provider limits allow roughly $5k/day and budgets are monthly with lag, so app-level guards are launch blockers.
2. A golden-set evaluation with solution-architect review before any quality claim.
3. A named catalog owner. Expect 2-3 relevant changes a month, and the Terms of Use rule out automated ingestion.
4. Legal and brand hygiene: custom icons, because official ones need permission and cannot be recolored even then, plus AI-disclosure notices for the EU and Korea.

Cut or defer from v1:
- on-canvas price totals (show billing model and dated seat prices instead);
- deployable ROS/Terraform;
- 'import into CADT', since no API exists;
- targeting mainland-China users.

Korean and Chinese UIs are cheap (+9-15% tokens) if product names follow the official international nav (English in ko/ja, localized in zh) and the model emits raw UTF-8. Mobile and accessibility need a deliberate design: a tap or focus 'why' sheet, an outline view, and polite live regions. My estimate for a quality beta is 6-10 weeks for 1-2 engineers plus a designer and a part-time catalog owner. The critical path is layout and edge routing plus the evaluation set, not the model.

## Gaps

### True cost per conversation once the full catalog prefix is re-sent on every turn

**Why it matters:** Area 1 prices a follow-up edit at $0.004 by assuming a 2.3k-token prompt with 93% cache hits. Budgets, per-user quotas and the keep-warm decision all depend on this number, and the probe it came from used a 43-product mini catalog rather than the 10-24k-token production catalog.

I recomputed with Singapore list prices for qwen3.8-max ($2/M input, $6/M output, $0.17/M explicit-cache read, $2.50/M explicit-cache creation, $0.25/M implicit hit) and the measured token sizes. A diagram is about 2.0k output tokens. An edit sends about 2.1k uncached tokens of state plus history and gets 0.2-0.8k output; the main session's round-4 probe sent 4,641 prompt tokens, of which only 1,024 were cached on first use and 4,352 once the same history prefix repeated.
- New diagram, warm cache: $0.015 with a 12k-token catalog prefix, $0.017 with 24k.
- New diagram, cold (after more than 5 minutes idle): $0.043-0.073 if an explicit cache is created, $0.037-0.061 with no cache.
- Edit, warm: $0.010-0.012, not $0.004.
- One session of 1 diagram plus 4 edits: about $0.054-0.065, plus about $0.02 for an optional thinking review pass.
- Keep-warm ping every 4.5 minutes (320 per day): $0.65-1.31 per day, $20-39 per month, per model.
- The same diagram on qwen3.8-flash: about $0.001.
- Volume: 1,000 sessions a month cost about $55-65 plus keep-warm.
- The 1M-token free quota per model covers only about 14 sessions (about 73k tokens each).
Recommendations: keep the byte-stable prefix near 12k tokens, and log include_usage on every call into a cost ledger.

Sources: Area 1 F10/F9 prices (verifier: confirmed); C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/probe/summary4.txt (H1: prompt 4641, cached 1024; H2: cached 4352 with the same history prefix); Own calculation (node one-off, this session): session(1+4)=$0.054 at 12k, $0.065 at 24k; keep-warm 320 pings/day = $0.65 or $1.31 per day

### Denial-of-wallet ceiling on the user's own account, and what actually bounds it

**Why it matters:** A public, anonymous page spends the user's personal Model Studio balance. Provider rate limits are a capacity mechanism, not a spend cap.

At the Tier-1 limit of 2M TPM (counted per account, input plus output, shared with every other workload on the user's account), worst-case spend is $4.00/min ($5,760/day) on uncached input. With requests capped at 2k input and 4,096 output tokens it is about $3.38/min ($4,873/day), which needs about 140 concurrent streams. Model Studio Budget Management is monthly only, set per account, workspace or API key. 'Stop Service When Budget Reached' returns 429 after 'a certain delay', bills aggregate per minute and appear 2-10 minutes after the call (about $40 overshoot at maximum burn), and the docs advise against enabling it in production. A sub-workspace per-model token limit is the real hard ceiling: at 200k TPM, worst case is about $490-580/day.
The app therefore needs its own guards before any public URL: Turnstile (free: 20 widgets, unlimited challenges, usable without other Cloudflare services); per-IP and per-device quotas; a global concurrency cap; a global daily spend breaker fed by include_usage; input caps and max_completion_tokens; and responses limited to validated ops plus length-capped 'say' text. That last guard makes the proxy worthless as a free general-purpose qwen3.8-max endpoint (OWASP LLM10 Unbounded Consumption). A workspace limit also stops abuse from starving the user's other uses of the same account quota.

Sources: https://docs.modelstudio.console.alibabacloud.com/en/model-studio/budget-management (monthly cycle; account/workspace/API-key levels; stop delay; 'not recommended for production'); https://docs.modelstudio.console.alibabacloud.com/en/model-studio/bill-query-and-cost-management (bills aggregated per minute, appear 2-10 min after the call); https://genai.owasp.org/llmrisk/llm102025-unbounded-consumption/; https://developers.cloudflare.com/turnstile/plans/; C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/flat/rate-limit.txt (line 3: account-level aggregation; TPM 'includes input and output tokens'); C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/flat/quota-management.txt (lines 6-7: separate per-model limit per workspace)

### The key-protection plan (IP allowlist) conflicts with the proposed serverless hosts

**Why it matters:** Area 1 relies on a Custom-scoped key with an allowlist of backend egress IPs. Area 6 proposes Vercel sin1, Cloudflare or Function Compute, and those differ in whether static egress exists at all.

Vercel offers static egress only through Static IPs on Pro and Enterprise, at $100 per month per project plus private data transfer, and the feature does not support the extended-max-duration beta. The Hobby plan is restricted to non-commercial personal use, and that includes deployments that produce financial gain for anyone involved, such as a paid developer. On Alibaba Cloud, a static egress means putting Function Compute in a VPC behind a NAT gateway and EIP. Temporary st- keys inherit every permission of the parent key, cannot be revoked, and would bypass server-side validation and caps, so the browser-direct option in area 6 is unsafe for a public app. Recommendation: run the Function Compute web function in Singapore in a VPC with NAT and EIP (or use Vercel Pro with Static IPs), and add:
- the key held in a secret store;
- a key-level monthly budget;
- a Custom scope limited to qwen3.8-max and qwen3.8-flash;
- scheduled rotation through the OpenAPI.

Sources: https://vercel.com/docs/networking/static-ips (Pro/Enterprise; $100/month per project; no extended max duration beta); https://vercel.com/docs/limits/fair-use-guidelines (Hobby restricted to non-commercial personal use; definition of commercial); Area 1 F13/F14 (IP allowlist; st- tokens inherit all permissions and cannot be revoked)

### Prompt injection, off-topic use, stored injection and output safety

**Why it matters:** The drawing path calls no tools, but user-controlled text still reaches the prompt and the rendered output, and every rendered page carries Alibaba product names.

Each turn the browser sends the CURRENT DIAGRAM JSON, so labels and 'why' strings become an injection channel. Share links would persist injected text that other users later continue to edit (stored injection). Other surfaces:
- runaway op or node counts that drive cost;
- XSS through labels in SVG or draw.io exports;
- defacement rendered under official product names.
Mitigations:
- The server re-canonicalizes state: catalog IDs only, labels of 40 characters or fewer, 'why' removed from state, at most about 80 nodes and 120 edges.
- User text is wrapped in delimiters, and 'say' output is length-capped.
- Every export path escapes text.
- 400 DataInspectionFailed is handled gracefully.
- A turn that yields no valid op is rejected, which also throttles off-topic misuse.
The Model Studio guardrail documentation I could find is a China-site page. It covers content-safety categories, is billed per 1,000-token check, and does not mention prompt-injection detection. Not measured: the false-positive rate of DataInspectionFailed on security-themed prompts (DDoS, attack, penetration test) and on CJK text.

Sources: C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/probe/probe4.mjs (line 33: state injected as 'CURRENT DIAGRAM:' + JSON into the user turn); https://help.aliyun.com/en/model-studio/content-security (China site: content-safety guardrail, billed per token, no injection detection described); Area 1 F20 (DataInspectionFailed); area 6 verifier (escape labels and why, cap ops)

### No method for measuring diagram correctness (golden set, metrics, solution-architect review)

**Why it matters:** The 'impeccable' bar fails on content before visuals. No area defines pass/fail, and every probe reused one SEA e-commerce prompt, in English, one run per configuration.

Two established methods fit.
- IaC-Eval (NeurIPS 2024, MIT): 458 human-curated scenarios, each a problem description plus an intent specification. The best model, GPT-4, reached only 19.36% pass@1 on Terraform.
- R2ABench (arXiv 2604.06683, April 2026): node F1, edge F1, layer accuracy, graph edit distance, orphan ratio and god-component ratio, plus an LLM judge scoring completeness, accuracy, rationality and readability. On 190 of 374 diagrams the judge agreed with human experts at kappa 0.73, against 0.82 between the two humans. Edge F1 stayed below 0.2 for all models, so relationships are the weak point, which matches the uneven wiring and orphan nodes in our probes.
Proposed harness: 60-80 prompts stratified by:
- web HA, SaaS multi-tenant, data/BI, RAG/agents, IoT, hybrid/DR and China access;
- product-need traps (Lingma, Model Studio app builder, Cloud Contact Center);
- Korean and Chinese inputs.
Each prompt gets machine-checkable assertions: must and must-not catalog IDs, a retired-name ban, containment, request-path order that depends on WAF mode, region constraints, and no orphans. Run each 3 times to measure variance, score with the LLM judge, and have 2 solution architects review at least 20% of cases plus every failure. Rerun on every catalog, prompt or model-alias change. Include multi-turn constraint retention: in the main session's own probe, dropping history turned 'avoid Kubernetes, prefer serverless' (answered with SAE) into ACK.

Sources: https://arxiv.org/html/2604.06683v1; https://proceedings.neurips.cc/paper_files/paper/2024/hash/f26b29298ae8acd94bd7e839688e329b-Abstract.html; https://github.com/autoiac-project/iac-eval; C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/probe/probe4.mjs (line 23 constraint; lines 38-39 with vs without history) and summary4.txt (H1 chose SAE, H1c chose ACK)

### Who refreshes the knowledge base, and how often

**Why it matters:** At low traffic, curation is the largest recurring cost (more than tokens). The Terms of Use forbid automated ingestion, so the catalog decays without a named owner.

In 2026 there have been roughly 2-3 catalog-relevant events a month: 7 'Agentic' renames from January to October, at least 12 AI and developer-offering changes, and at least 14 retirements. Official feeds lag: all six locales of the international nav JSON (Last-Modified 2026-08-19) still label /product/lingma 'Qoder CN', and the Korean short description still calls it an AI coding assistant. I found no RSS feed for the notice center.
Proposed cadence:
- Weekly automated diff that opens a PR: 6 nav-JSON locales, llms.txt, aliyun-openapi-meta, the Terraform registry and the Qoder pricing JSON.
- Monthly human review followed by an eval rerun.
- Event sprints after WAIC (July) and the Apsara Conference (September).
- last_verified and owner fields on every entry.
- A named catalog owner (my estimate: 1-2 days a month) and a quarterly solution-architect review of patterns.
Model Studio docs on docs.modelstudio.console.alibabacloud.com loaded without the help-center challenge in my test. The Terms of Use still apply.

Sources: https://file-intl.alicdn.com/stmt/1/alibabacloud/product/navigation_product_tree/aggregation-product/1.0/ko.json (Last-Modified Wed, 19 Aug 2026; lingma = 'Qoder CN'); Area 2 F7/F10 and area 3 F17 (rename and retirement counts; challenge pages after bulk fetches); C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/crit_tok/scripts/nav_i18n.py

### English, Chinese and Korean i18n (the user writes in Korean; every probe was English)

**Why it matters:** Naming policy, token cost and latency, layout and exports all change with language.

Alibaba's official international nav JSON exists in en, zh, tc, ja, ko and id, with 175 products each. Only Simplified Chinese localizes product names: 165 of 175 differ (for example 云服务器 ECS, 负载均衡 SLB, 边缘安全加速 ESA). Korean keeps English names for 166 of 175 (ja 168, tc 164, id 166) but localizes the short descriptions. Policy that follows: official English names in ko and ja, official zh names in Chinese, and 'why'/'say' text in the user's language.
Token cost, measured with the Qwen3.8 tokenizer (Qwen/Qwen3.8-27B) on 9 measured ops:
- Whole NDJSON lines: EN 329 tokens, KO 378 (+15%), ZH 357 (+9%), JA 370 (+12%).
- Visible text alone: KO +34%, ZH +18%, JA +28%.
- If the model emits \uXXXX escapes, the Korean ops cost 1,178 tokens (3.6x). Prompt for raw UTF-8 and test it.
Layout conflict: 45 of 175 English names exceed 28 characters, and the longest is 57 ('Certificate Management Service (Original SSL Certificate)'). That breaks area 5's fixed 200x64 cards, so the catalog needs short labels. PDF export needs CJK font subsetting. Model quality in Korean has not been tested.

Sources: https://file-intl.alicdn.com/stmt/1/alibabacloud/product/navigation_product_tree/aggregation-product/1.0/zh.json (also en/tc/ja/ko/id.json; zh-tw returns 403); https://huggingface.co/Qwen/Qwen3.8-27B/resolve/main/tokenizer.json; C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/crit_tok/scripts/tok_i18n.mjs (output: en 329 / ko 378 / zh 357 / ja 370; escaped ko 1178); C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/crit_tok/scripts/nav_i18n.py

### Mobile and responsive behaviour

**Why it matters:** The vision (input slides left into a console, canvas, panel that expands from the bottom) has no phone layout, and hover does not exist on touch screens.

React Flow supports touch: pinch and pan, plus connecting nodes by tapping two handles with enlarged handles. But area 5's performance benchmark ran on desktop headless Chrome only, CSS d transitions have no effect in Safari, and an orthogonal diagram of 20-60 nodes is unreadable at 375 px without zooming. Recommended mobile mode:
- chat first, with the diagram in a bottom sheet;
- tap to open a 'why' sheet;
- an outline/list view as the default rendering;
- reduced motion.
Measure performance on iPhone Safari and a mid-range Android phone before fixing the motion budget.

Sources: https://reactflow.dev/examples/interaction/touch-device; Area 5 F9 and its verifier (desktop-only benchmark; Safari ignores CSS d)

### Accessibility of a canvas UI

**Why it matters:** Hover-to-explain and live streaming are the core interactions, and both have defined accessibility requirements that no area addressed.

Hover explanations fall under WCAG 2.2 SC 1.4.13 (AA). They must be dismissible without moving pointer or focus (for example with Esc), hoverable and persistent, and they must also open on keyboard focus and on tap. React Flow gives focusable nodes and edges, arrow-key movement, ariaLabelConfig for localized labels, and an internal aria-live='assertive' region for node movements. Streaming adds about 1.6 ops/s, so announcements need a separate polite, batched live region (for example 'Added WAF and 2 connections'). The product panel should double as the text alternative: a structured list with placement (for example 'VPC > Zone A') and connections, cross-highlighted with the canvas. Honour prefers-reduced-motion. Test with VoiceOver and NVDA.

Sources: https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html; https://reactflow.dev/learn/advanced-use/accessibility

### Hosting and SSE timeouts on the actual network path

**Why it matters:** A turn takes 35-60 s, a measured stall lasted 125.6 s, and several common front doors cut long responses by default.

Timeouts on the candidate paths:
- Cloudflare's current docs give a Proxy Read Timeout of 125 s (HTTP 524), configurable only on Enterprise; many secondary sources still say 100 s.
- Alibaba ALB HTTP listeners: RequestTimeout defaults to 60 s (range 1-600 s, up to 3,600 s by quota) and returns 504 when the backend does not respond.
- DCDN/CDN: origin read timeout defaults to 30 s, the end-to-end cap is 150 s, and the docs recommend 60 s or less. ESA exposes an OriginReadTimeout with an undocumented maximum. Putting the SSE route behind ESA/CDN with default settings can therefore cut turns.
- Vercel Hobby is not allowed for commercial use.
Recommendations:
- Serve /api/stream from a non-CDN hostname: an FC custom domain (in Singapore, no ICP is needed) or ALB with RequestTimeout of at least 300 s.
- Flush headers immediately and send ': ping' every 10-15 s.
- Test the 125 s silent-upstream case end to end.

Sources: https://developers.cloudflare.com/fundamentals/reference/connection-limits/; https://www.alibabacloud.com/help/en/slb/application-load-balancer/developer-reference/api-alb-2020-06-16-createlistener; https://www.alibabacloud.com/help/en/edge-security-acceleration/dcdn/user-guide/configure-a-timeout-period-for-back-to-origin-requests; https://vercel.com/docs/limits/fair-use-guidelines

### Brand and icon rights for Alibaba Cloud staff, partners and independent third parties

**Why it matters:** The user's affiliation is unknown (personal email), and the answer decides the visual identity and the legal exposure.

Alibaba's official icon page (China site) sets four conditions:
- the icons are Alibaba Cloud IP;
- customers or partners need prior permission to download or use them;
- even with permission they may not change shape, color, name or proportion;
- the licence is non-exclusive, non-transferable and non-sublicensable.
What that means for each kind of operator:
- Independent third party: nominative product names only, a custom glyph system, and a non-affiliation disclaimer. Terms of Use §7.1 lists ALIBABA, ALIYUN, QWEN, QWENCLOUD and TONGYI 'and related icons and logos' as marks.
- ACPN partner: badge rights only, and only for Badge Partners. Product icons still need permission.
- Alibaba Cloud staff: can ask for permission internally, but an Alibaba-branded tool becomes official advice and goes through internal review.
The no-recolor rule also blocks dark-mode theming of official icons and contradicts area 4's 'recolors easily'. A custom icon system is needed whichever case applies.

Sources: https://cn.aliyun.com/icon/download.html (fetched; terms items 1-4); C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/legal/tou.md (§7.1 marks; §3.5 qwencloud.com Associated Platform); Area 4 F6 and its verifier (ACPN §7(b)-(d))

### Export and handoff (PNG/SVG/PDF, share links, ROS/Terraform, CADT import)

**Why it matters:** 'Open in CADT' and IaC export were proposed in area 4 but never checked against the APIs.

What is and is not possible:
- PNG and SVG come straight from the layout model. PDF needs CJK fonts.
- Share links need storage, read-only snapshots, expiry, noindex and moderation (stored injection, see the injection gap).
- CADT import is not possible through the API. BpStudio 2021-09-31 offers CreateApplication only from an existing official or private TemplateId, and ValuateTemplate/ValuateApplication only for CADT templates and apps. There is no CreateTemplate and no diagram or JSON import. Supported calling methods are the SDK and Terraform; ROS is not supported. The only programmatic text route is CADT's AI agent (cn-hangzhou, 30-120 s, 20 messages a day).
- ROS has an Architecture Editor that turns a drawn canvas into ROS or Terraform templates, but importing a template as a diagram is undocumented.
- Deployable IaC is a far larger problem: GPT-4 reached 19.36% pass@1 on IaC-Eval.
- draw.io embed mode (embed.diagrams.net, embed=1, proto=json) accepts load(xml) and export(svg/png/xml) and gives a clean 'Open in draw.io'. PDF there needs an export server.
Recommended v1: PNG, SVG and .drawio files, a Markdown bill of materials and read-only share links. Treat ROS/Terraform skeletons as a later experiment and drop 'import into CADT'.

Sources: https://api.alibabacloud.com/meta/v1/products/BPStudio/versions/2021-09-31/api-docs.json (saved at C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/crit_dl/bp_summary.txt); https://www.alibabacloud.com/help/en/cadt/developer-reference/using-openapi; https://www.alibabacloud.com/help/en/ros/user-guide/create-an-architecture-diagram-template; https://www.drawio.com/doc/faq/embed-mode; https://proceedings.neurips.cc/paper_files/paper/2024/hash/f26b29298ae8acd94bd7e839688e329b-Abstract.html

### Whether price estimates in the diagram are feasible and accurate

**Why it matters:** A dollar figure on the canvas will be read as a quote. Sizing is unknown and usage-based charges often dominate the bill.

Price estimates are feasible only as clearly labelled indicative ranges. The available sources:
- ROS GetTemplateEstimateCost needs a complete template with properties, a RegionId and an AccessKey. It returns OriginalAmount, DiscountAmount, TradeAmount, promotions and coupons (USD on the international site), and the console calls the result 'for reference only'. It covers about 70 fixed-capacity resource types, including ECS, RDS, PolarDB, ALB, NLB, CLB, WAF, NAT, EIP, OSS bucket, ACK, SAE, Kafka, RocketMQ and KMS instances. It does not cover Function Compute invocations, SLS ingestion, ESA/CDN traffic, ARMS, Security Center or Model Studio tokens.
- BSS QuerySkuPriceList returns list prices by CommodityCode and PriceEntityCode (PageSize 50 or less; currencies include USD), but needs an AccessKey and a SKU mapping.
- CADT's pricing calculator supports 10 products (China-site doc).
Recommended v1: no dollar totals on the canvas. The panel shows the billing model (PAYG, subscription or seat) and curated, dated seat prices (for example Qoder Teams $40/seat), with a link to the official calculator. The LLM never states prices. A later option is a ROS estimate for a stated reference sizing.

Sources: https://www.alibabacloud.com/help/en/ros/user-guide/estimate-resource-prices (supported types; Last Updated Sep 15, 2026); https://www.alibabacloud.com/help/en/ros/api-gettemplateestimatecost (response fields; USD on international site); https://www.alibabacloud.com/help/en/user-center/developer-reference/api-bssopenapi-2017-12-14-queryskupricelist; https://help.aliyun.com/en/cadt/user-guide/price-calculator (10 products; China site)

### Region-aware recommendations (Singapore vs mainland China, data residency)

**Why it matters:** Default advice for mainland, EU or Korean customers differs in account type, region and legal regime.

Facts the recommendations must encode:
- International accounts must complete identity verification (passport or driver's licence; a business document for companies) before buying services deployed in mainland China. ICP filing is impossible on an international account (area 2 F12). Public websites should therefore default to Hong Kong or Singapore, or the user needs a China-site account.
- Model Studio deployment scopes: Singapore = International (excludes the mainland); Frankfurt = Global or EU; Tokyo = Global or Japan; Virginia = Global or US; Global scope may run inference on the mainland. There is no Model Studio region in Seoul, so Korean data-residency needs map to Tokyo or Singapore.
- Product availability is uneven: AgentRun's only international region is Singapore, and AgentLoop runs in Hong Kong but not Singapore.
- Serving the mainland public triggers China's generative-AI Interim Measures (Art. 17 filing for services with public-opinion influence; Art. 20 action against offshore services) and the labelling measures in force since 2025-09-01.
The console needs one clarifying question (users' location, data-residency needs, which account), and per-region availability needs dated entries.

Sources: https://www.alibabacloud.com/help/en/account/user-guide/real-name-registration-faqs (Last Updated Sep 21, 2026); C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/flat/regions.txt (lines 4, 11, 95: deployment scopes per region); https://en.wikipedia.org/wiki/Interim_Measures_for_the_Management_of_Generative_AI_Services; https://www.loeb.com/en/insights/publications/2025/03/chinas-ai-labeling-measures-and-mandatory-national-standards-take-effect-september-1

### Fallback models: thinking defaults and cold caches

**Why it matters:** Area 6's stall fallback to qwen3.7-max, and any fallback in general, can recreate the silent-reasoning failure mode.

qwen3.7-max, qwen3.7-plus and qwen3.7-flash are hybrid models with thinking on by default. qwen3.7-max-preview and qwen3.7-max-2026-05-17 support only thinking mode. The error-code page says some models, for example qwen3.7-plus, reject enable_thinking=false. Caches are per model, so a fallback starts cold, which is 13.9 s to first token on a 24k prompt. A qwen3.7-max fallback therefore needs enable_thinking:false on the alias (never the snapshots) and still pays the cold start. qwen3.8-flash is the better fallback with its own keep-warm (12k tokens × $0.016/M × 320 pings ≈ $0.06/day).

Sources: C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/flat/deep-thinking.txt (lines 58-67); C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/flat/error-code.txt (lines 95-96); C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/flat/m_qwen3-7-max.txt (line 366)

### Placement rules ignore WAF access modes and VPC-attachable services

**Why it matters:** The deterministic repair rules in areas 2 and 6 (lift services out of the VPC; ESA before WAF before load balancer) would make some correct diagrams wrong.

WAF 3.0 cloud-native mode integrates as an SDK module into the ALB, MSE and FC custom-domain gateways, and as a transparent proxy for CLB, NLB and ECS. It enables protection without DNS or certificate changes; CNAME mode still exists. 'DNS → ESA → WAF → ALB' is therefore correct only in CNAME mode. The modern default is WAF attached to the ALB as a badge, and ESA has its own WAF. The area 6 verifier also found legitimate in-VPC placements (VPC-attached FC, Auto Scaling, KMS instances) and unflagged out-of-VPC databases. Rules need per-node attributes (access_mode, vpc_attached) rather than a fixed scope per product.

Sources: https://www.alibabacloud.com/help/en/web-application-firewall/latest/release-notice-of-waf-3-0 (Last Updated Sep 23, 2026); Area 6 F10 verifier correction

### AI-disclosure and privacy obligations for a public generative-AI tool

**Why it matters:** These are cheap to meet but carry fines, and no area scoped them beyond the Model Studio terms.

Obligations by jurisdiction:
- EU AI Act Art. 50 has applied since 2026-08-02: chatbot interaction disclosure, plus machine-readable marking of synthetic text and images. The grace period to 2026-12-02 covers only systems already on the market, so a new app must comply from launch. Fines reach €15M or 3% of turnover.
- Korea's AI Basic Act has been in force since 2026-01-22: advance notice of AI use and labelling of generative output, applying to foreign operators that affect Korean users. Fines reach KRW 30M after about a one-year grace period.
- China's labelling rules apply if mainland users are served.
Mitigation: a persistent 'AI-generated' notice in the console and in every export, metadata in SVG/PNG, and terms plus a privacy notice. The privacy notice must say Model Studio stores call data; its retention period is undocumented.

Sources: https://www.goodwinlaw.com/en/insights/publications/2026/08/alerts-technology-dpc-eu-ai-act-transparency-obligations-now-in-force; https://www.cooley.com/news/insight/2026/2026-01-27-south-koreas-ai-basic-act-overview-and-key-takeaways; C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/flat/p_privacy-notice.txt (line 6: stores data from model calls; no retention period)

## Contradictions between areas

- Edit cost. Area 1 F10 prices a follow-up at $0.004 (2.3k input with 93% cached). Area 6 F12 says $0.006-0.01, and area 6's verifier showed that the first follow-ups cached only 1,024 tokens. Recomputed with a 12-24k catalog prefix, a warm edit costs $0.010-0.012.
- Catalog prefix size. Area 2 puts it at about 7.3k tokens (10-12k with rules). Area 6 says 12-18k for 300 products. Area 1's cost and latency figures assume 24k. Area 3 proposes sending per-category subsets 'to keep the cache warm', but several distinct prefixes give several cold caches, the opposite of its goal. The design needs one byte-stable prefix of about 12k tokens that includes the offerings.
- Watchdogs vs cold start. Area 1 proposes an 8-10 s first-byte watchdog and area 6 proposes 12 s, but measured cold TTFT is 13.9 s with a 24k prompt. Every cold request would abort, and both the retry and the fallback model start cold too. Thresholds must depend on cache state, and keep-warm pings are needed.
- Fallback model. Area 1 picks qwen3.8-flash; area 6 picks qwen3.7-max. qwen3.7-max has thinking on by default, its 05-17 and preview snapshots are thinking-only, its cache is cold, and it costs $2.5/$7.5.
- Key protection vs hosting. Area 1's key IP allowlist requires static egress. Area 6's hosts don't provide it by default: Vercel Static IPs cost $100 per month per project (Pro and Enterprise only), Hobby is non-commercial-only, and FC needs a VPC with NAT and EIP.
- Browser-direct streaming. Area 6 F18 offers browser-direct temporary keys as an option. Area 1 F14 and the abuse model show that st- tokens inherit every permission, cannot be revoked, and bypass server-side validation and caps, so the option must be rejected for a public app.
- Placement rules. Areas 2 and 6 propose deterministic rules: lift regional services out of the VPC and use the fixed rank DNS < ESA < Anti-DDoS < WAF < LB. Area 6's verifier shows defensible in-VPC placements and unchecked reverse containment. WAF 3.0 cloud-native mode adds no DNS hop. Area 5 leaves 'inline vs badge' open.
- DNS. Area 6 repairs DNS-in-data-path into resolve edges. Area 5's lane ranks place DNS first in the request path. The verifier calls DNS-in-path a common convention.
- Model Studio vs Qwen Cloud. Area 2 F13 and area 3 F5 suggest a unified brand and the label 'Model Studio (Qwen Cloud)'. Both verifiers say Qwen Cloud is a parallel platform with no rename.
- DashScope-domain note. Area 1 applies 'no new features after 2026-09-30' to dashscope-intl; area 2's verifier says the sentence names dashscope.aliyuncs.com. In the local copy, the sentence sits in the DashScope-domain column whose Singapore example is dashscope-intl, so it is genuinely ambiguous.
- Icon recoloring. Area 4 F2 says the official glyphs 'recolor easily'. The official icon terms forbid changing shape, color, name or proportion even after permission is granted.
- CADT handoff. Area 4's approach includes handing off to CADT or 'Open in CADT if the template API works'. The BpStudio API has no import operation: CreateApplication requires an existing TemplateId, and there is no CreateTemplate.
- draw.io export. Area 4 proposes .drawio export as an 'official-looking' handoff, but the draw.io Alibaba library has no shapes for ESA, Model Studio, PAI, Qoder, KMS or the 2026 agent products (area 2 F18, area 4 F3).
- Card sizing. Area 5 uses fixed 200x64 cards, but 45 of 175 official English names exceed 28 characters, and area 6 generates 'why' and 'say' text in the user's language.
- Area 3's own claims vs its verifier. Area 3 calls AgentCore and Agentic Computer prices 'unpublished', AgentLoop 'announced' and AgentTeams 'not suitable'. Its verifier found published prices, AgentLoop live in Hong Kong, and AgentTeams to be the former name of AgentCore.
- Probe validity. Area 6 reports '0 unknown product IDs', but that was against a 43-product mini catalog. Its generic 'api_gateway' would resolve to API Gateway (Classic), which stopped new purchases on 2026-08-23 (area 2 missed risk). Validating against a stale catalog hides staleness.
- History compaction. Area 6 F14 compacts history, and its edit probes resent only the graph. The main session's round-4 probe shows that without user history the model dropped an explicit 'avoid Kubernetes' constraint and moved the app tier from SAE to ACK.
- Cloudflare timeout. Area 6 says 125 s, which matches Cloudflare's current docs. Many secondary sources still say 100 s, so budget with the official value but keep heartbeats.

## Biggest risks

- Denial-of-wallet and quota starvation on the user's own account. Provider limits allow about $4.9-5.8k/day at Tier-1 TPM. Model Studio budgets are monthly and stop with a 2-10 minute billing lag, and the quota is shared with everything else the user runs on the account. App-level guards and sub-workspace limits block launch until they exist.
- Credibility of the advice. Placement and relationship errors are systematic (in the literature, edge F1 stays below 0.2 for every model), WAF access modes and regional availability are subtle, and polished visuals make wrong diagrams look authoritative under Alibaba product names. Without a golden set and solution-architect review there is no evidence of quality.
- Catalog staleness without an owner. The catalog sees about 2-3 relevant changes a month in 2026, official feeds lag by months (the nav still says 'Qoder CN' in all six languages), and the Terms of Use prohibit automated ingestion.
- Legal and brand exposure. Icons need prior permission and cannot be recolored even with it; trademarks and non-affiliation must be handled; the Terms of Use forbid scraping; AI-disclosure duties apply in the EU (since 2026-08-02) and Korea (since 2026-01-22); China rules apply if mainland users are served.
- Latency tail and cold paths. Cold TTFT is 13.9 s at 24k tokens, a warm call stalled 125.6 s, the domain in use is the legacy one, and fallback models start cold and some think by default. With sporadic public traffic most requests are cold unless the cache is kept warm.
- Rendering quality outside the happy path. The lane grid and router are unproven for removals, replacements and moves; long and CJK labels break fixed cards; mobile and screen-reader behaviour are undesigned.
- Scope creep. On-canvas price totals, deployable ROS/Terraform and 'import into CADT' are each multi-week, low-accuracy problems (CADT has no import API; ROS can price only about 70 fixed-capacity types). Promising them puts the core at risk.

## Prototype first

- Guardrailed backend slice (2-3 days). Build a Singapore Function Compute SSE proxy using a sub-workspace key: Custom scope of qwen3.8-max and qwen3.8-flash, workspace per-model TPM limit, and an API-key monthly budget with stop-on-budget. Add Turnstile, per-IP quotas, a concurrency cap and a daily spend breaker driven by include_usage, and return validated ops only. Then measure: budget-stop overshoot on a deliberately tiny test budget, 429 behaviour, and whether cached tokens count toward TPM.
- Latency and cache matrix. Run 30+ calls each on the workspace-dedicated domain and dashscope-intl, with 12k and 24k prefixes and with explicit vs implicit caching, and record p50/p95/p99 TTFT cold and warm. Test keep-warm pings, and fallbacks to qwen3.8-flash and to qwen3.7-max with enable_thinking:false. Set the watchdog thresholds from these numbers.
- Evaluation harness before UI polish. Write 60-80 golden prompts with machine-checkable intent assertions (IDs, retired names, containment, path order by WAF mode, region, orphans), run each 3 times, add a calibrated LLM judge, and have 2 solution architects review a sample. Include multi-turn constraint retention and the Korean and Chinese inputs. Use it to fix the catalog-prefix size and the history policy.
- Rendering spike on real devices. Test the lane grid plus a libavoid-js worker with streamed adds, removals and moves (the 'run the app tier on Kubernetes' swap and 'insert WAF'), short-label cards, and WAF as a badge vs inline. Verify on desktop, iPhone Safari and a mid-range Android phone, with VoiceOver/NVDA checks of focus popovers (WCAG 1.4.13) and a polite batched live region.
- i18n and red-team pass. Run Korean and Chinese prompts end to end: assert raw UTF-8 with no \u escapes, measure tokens and latency, and use official zh names from the zh nav JSON. Run 50 adversarial inputs: security-themed prompts to measure the DataInspectionFailed false-positive rate, off-topic chat, label injection through the graph state, and oversized inputs.
- Cheap export spike. Produce SVG and PNG from the layout model, a PDF with a subset CJK font, and a .drawio export with a shape-coverage report against the catalog plus 'Open in draw.io' through embed mode. As a decision spike only, run ROS GetTemplateEstimateCost on one reference sizing to decide whether any price display is credible.
