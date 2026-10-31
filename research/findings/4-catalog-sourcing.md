# Sourcing and maintaining a current Alibaba Cloud International product knowledge base

Researched 2026-10-31 by one agent, then fact-checked by an independent agent that tried to refute each load-bearing claim. 20 findings; fact-check verdicts: 11 confirmed, 4 partially-true. Findings without a verdict were high-confidence and not load-bearing, so they were not re-checked.

## Summary

An accurate international catalog is feasible, but it has to be hand-curated with automated change detection. No single official feed is complete, current, correctly named and licensed for reuse. The best official sources are: (1) the help-center llms.txt index, which is live, regenerated about daily and covers 218 product doc sets; (2) the 'All products' navigation JSON on file-intl.alicdn.com, with 17 L1 and 45 L2 categories and 180 unique products, last modified 2026-08-19; and (3) the OpenAPI metadata, with 354 API product codes and an Apache-2.0 GitHub mirror updated daily. Terraform provider v2.1.0 adds resource codes. Each source lags or is noisy in its own way. OpenAPI names still say Cloud Governance Center, SDDP and Tracing Analysis. The nav omits the 2026 agent products. llms.txt descriptions are machine-written and sometimes wrong. Per-product region data is either stale (the Products-by-Regions JSON dates from Oct 2025) or misleading, because API endpoints are not the same as availability. Two constraints shape maintenance. First, the International Website Terms of Use (updated 2026-09-04) prohibit systematic retrieval and crawling to compile a database. Second, the help center's anti-bot challenge blocked 173 of 218 index fetches at 3 requests per second. Verified renames include: SLB is now the family name (the original SLB is CLB), ApsaraDB for Redis became Tair, DCDN became ESA, Log Service became SLS, MNS became SMQ, Serverless Workflow became CloudFlow, HBR became Cloud Backup, and Tracing Analysis became Managed Service for OpenTelemetry. ASK became ACK Serverless, and new serverless clusters now go to ACS. Tongyi Lingma became Qoder CN in China on 2026-05-20, and Qoder is the international product. Seven 2026 'Agentic' renames also need mapping. Several international-vs-China differences would make answers wrong:
- ICP filing: international accounts cannot file.
- Qoder CN is China-only.
- Model Studio's agent, workflow and knowledge-base features are closed to new international users.
- AgentRun and AgentBay run only in Singapore.
- The Sydney and Mumbai regions are closed.

The 176-entry seed list is about 7.3k tokens, so it fits in the cached system prompt and v1 needs no RAG. The LLM should emit catalog IDs, and the server should validate them and place nodes using rules.

## Findings

### F1 (high confidence, load-bearing)

Alibaba publishes an official LLM-oriented documentation index for the international site at https://www.alibabacloud.com/help/en/llms.txt. Its scope statement says it covers international-site products, and that portfolios, regions and billing differ from the China site. It has 21 sections, 231 entries and 218 unique product doc sets. Each entry links to a per-product llms.txt that lists every doc page with a .md link; the 45 A–C product indexes I fetched held 7,581 .md links. It is regenerated often: the Alibaba Cloud DNS entry changed between 2026-10-30 and 2026-10-31. It carries current names and lifecycle markers such as 'Deprecated', 'EOL', 'formerly' and 'end of sale'. However, the summaries are machine-written and sometimes wrong. The Agent Sandbox entry describes API Gateway. The SLB 'Product Overview' line describes Grafana. The classic API Gateway sub-index describes Captcha. The index still says 'Cloud Skills Portal' after that product's rename.

**Implication:** This is the best official source for names, scope lines and lifecycle notices, and for change detection (diff it weekly). Never publish its text automatically: a human must review every catalog change, and descriptions should be our own words.

**Fact-check:** confirmed

Fact-check sources: curl https://www.alibabacloud.com/help/en/llms.txt (HTTP 200, Date 2026-10-30 23:04 GMT): 103,520 bytes, byte-identical to the researcher's 10-31 copy. Scope line: 'Product documentation and compliance rules for the International site (alibabacloud.com); ... product portfolios, regional availability, and billing rules differ from the China site'. Purpose line: 'structured index ... for LLMs and AI Agents'.; Recount: 22 '##' headings, which are 21 product sections plus 'Available Sites and Languages'; 231 entries linking a llms.txt; 218 unique URLs.; Diff against the 2026-10-30 08:27 UTC copy (scratchpad/llms_intl.txt): only the Alibaba Cloud DNS line differs.; Errors verified on live fetches. Line 66, Agent Sandbox: 'API Gateway with Speed Edition (fully managed) and Container Edition (self-hosted on ACK)...'; the agent-sandbox sub-index header has the same text. slb/llms.txt line 9, Product Overview: 'Integrate cross-account data sources into Grafana...'. api-gateway/llms.txt line 41, the traditional API Gateway sub-index: 'configuring Captcha 2.0 CloudMonitor alert rules'. Line 268 still says 'Cloud Skills Portal', although notice ..._cloud_skills_portal_808 (2026-08-12) renamed it Cloud Agent Catalog effective 2026-08-26.; Recount of the 45 saved sub-indexes (scratchpad/dl2/llms_sub): 7,581 '.md' links. 9 of the 45 have 'Sub-Products' sections pointing to 32 nested llms.txt files, so 7,581 is a lower bound. 'end of sale' appears in sub-indexes (ACK, MyBase, Captcha), not in the top-level file. Some summaries are 'MANUAL_REVIEW: page unavailable' placeholders (8 in the CADT sub-index).

Sources: https://www.alibabacloud.com/help/en/llms.txt (curl 2026-10-31; prior copy 2026-10-30); https://www.alibabacloud.com/help/en/slb/llms.txt (2026-10-31); https://www.alibabacloud.com/help/en/api-gateway/llms.txt (2026-10-31); https://www.alibabacloud.com/help/en/lingma/llms.txt (2026-10-31)

### F2 (high confidence, load-bearing)

The international 'All products 100+' menu is a public, unauthenticated, gzip-compressed JSON of about 120 KB: https://file-intl.alicdn.com/stmt/1/alibabacloud/product/navigation_product_tree/aggregation-product/1.0/en.json. Its fields are name, productCode, entityId, url, shortDesc and pricingUrl. It has 17 L1 categories, 45 L2 categories, 216 rows and 180 unique products. Last-Modified is 2026-08-19; the /stmt/2/ variant is 2026-07-27 and lacks OpenTrek. It already shows ESA, CloudFlow, CloudOps Orchestration Service, Agentic Cloud Governance Center, AI Guardrails and 'Qoder CN'. It does not show AgentCore, AgentRun, QwenWork or Qwen Cloud. Some shortDesc values are copy errors: Security Center carries Simple Application Server's tagline.

**Implication:** Use it as the authority for the official taxonomy and canonical display names. It lags new AI products by two months or more, so supplement it with llms.txt and the notice center.

**Fact-check:** confirmed

Fact-check sources: curl stmt/1 .../aggregation-product/1.0/en.json: HTTP 200; gzip Content-Length 19,998 (120,356 bytes decoded); Last-Modified Wed, 19 Aug 2026 07:13:00 GMT; Access-Control-Allow-Origin *. stmt/2: Last-Modified Mon, 27 Jul 2026. The only entity difference is that stmt/2 lacks 'opentrek'.; Parsed counts: 17 L1 and 45 L2 categories; 199 category rows plus 17 'Featured/New Products' rows = 216; 180 unique entityIds. Rows also carry ar, categories and feature fields.; Present: 'Edge Security Acceleration(ESA)' (productCode dcdn, entityId esa), CloudFlow, CloudOps Orchestration Service, 'Agentic Cloud Governance Center (ACGC)', AI Guardrails, and 'Qoder CN' linking to /product/lingma. Zero hits for AgentCore, AgentRun, QwenWork, Qwen Cloud/qwencloud, Agent Sandbox, AgentLoop or Agent Security Center.; Security Center (productCode sas) has the shortDesc 'Run lightweight apps instantly and cost-effectively', which does not describe Security Center. Calling it SAS's tagline is plausible (the sas/SAS collision), but no SAS page with that exact line turned up (WebFetch /product/swas; web search).; Saved site JS (dl/js/psearch.js) builds the URL as 'stmt/'+(r?1:2), so a change detector must watch both variants.

Sources: https://file-intl.alicdn.com/stmt/1/alibabacloud/product/navigation_product_tree/aggregation-product/1.0/en.json (curl 2026-10-31, Last-Modified 2026-08-19); https://file-intl.alicdn.com/stmt/2/alibabacloud/product/navigation_product_tree/aggregation-product/1.0/en.json (curl 2026-10-31)

### F3 (high confidence, load-bearing)

The OpenAPI metadata is public, unauthenticated JSON. api.alibabacloud.com/meta/v1/products.json?language=EN_US lists 354 product codes; the same file serves the international and China sites. Its fields are code, name, shortName, group, categoryName, category2Name and versions. A per-product /meta/v1/products/{code}/endpoints.json gives regionId, regionName (with 'Closed' markers), and public and VPC endpoints. The Apache-2.0 GitHub mirror aliyun/aliyun-openapi-meta (metadatas/products.json) has 355 products with regional_endpoints, and its last commit was 2026-10-30. Display names in this metadata lag the renames: 'Cloud Governance Center', 'Sensitive Data Discovery and Protection', 'Tracing Analysis', 'JVS Agent Suite', 'AI DeepSign', and 'Server Load Balancer' for CLB.

**Implication:** Use the Apache-2.0 GitHub mirror for API codes, legacy aliases and new-product detection. Do not use it for display names or availability.

**Fact-check:** confirmed

Fact-check sources: curl api.alibabacloud.com/meta/v1/products.json?language=EN_US: 354 codes, byte-identical to the 10-30 copy. api.aliyun.com/meta/v1/products.json?language=ZH_CN returns the same 354-code set, so the metadata is not specific to the international site.; Fields: code, name, description, shortName, group, versions, recommendVersions, defaultVersion, categoryName, category2Name.; Ecs endpoints.json regionName values: 'Australia (Sydney) Closed', 'India (Mumbai) Closed', 'China (Nanjing - Local Region) Closed', 'China (Fuzhou - Local Region) Closed', each with public and VPC endpoints.; GitHub API: aliyun/aliyun-openapi-meta is Apache-2.0; latest commit 6c2b5c2 at 2026-10-30T16:26:25Z. metadatas/products.json has 355 products with regional_endpoints and global_endpoint (4 extra and 3 missing codes against the API list).; Lagging names confirmed: governance 'Cloud Governance Center', Sddp 'Sensitive Data Discovery and Protection', xtrace 'Tracing Analysis', WuyingAI 'JVS Agent Suite', AIDeepSign 'AI DeepSign', Slb 'Server Load Balancer'. The llms.txt now titles the JVS and DeepSign products 'Agentic Computer' and 'DeepSynID'. Those two renames are inferred from the titles; I found no rename notice for them.

Sources: https://api.alibabacloud.com/meta/v1/products.json?language=EN_US (curl 2026-10-31, 354 codes, unchanged since 2026-10-30); https://api.alibabacloud.com/meta/v1/products/Ecs/endpoints.json?language=EN_US (prior run 2026-10-30); https://raw.githubusercontent.com/aliyun/aliyun-openapi-meta/master/metadatas/products.json (curl 2026-10-31); https://api.github.com/repos/aliyun/aliyun-openapi-meta/commits?per_page=1 (2026-10-31)

### F4 (high confidence, load-bearing)

API endpoints do not equal service availability. 111 of 354 API products have no non-mainland endpoint, yet:
- Anycast EIP's only API endpoint is cn-hangzhou, although the service has no Chinese-mainland access points.
- Model Studio's endpoints omit Tokyo, which the Model Studio regions page lists.
- ESA is a global service whose control-plane endpoints are only Singapore and Hangzhou.
Closed regions stay in the metadata with a 'Closed' suffix: Australia (Sydney) ap-southeast-2 and India (Mumbai) ap-south-1. The global-locations 'Products by Regions' JSON covers 79 regional and 23 global products and was last modified 2025-10-29, so it is stale. It still lists 'AI Coding Assistant Lingma'.

**Implication:** Curate international availability by hand, from each product's 'Supported regions' docs, for the roughly 60 products that appear in diagrams. Treat endpoint data only as a hint. Check Model Studio models at runtime with GET /models.

**Fact-check:** confirmed

Fact-check sources: I recounted from the 354 endpoint files (prior run, 10-30) and, separately, from the 10-30 GitHub mirror. Both give 112 products with no endpoint outside mainland China (cn-hongkong counted as non-mainland), 17 of which list no regional endpoint at all. The '111' figure is within one.; Eipanycast endpoints.json: only cn-hangzhou. The llms.txt Anycast EIP entry says 'Inbound-only, excludes Chinese mainland access points'. Global Accelerator (Ga) is another global service whose only endpoint is cn-hangzhou.; ModelStudio endpoints: cn-beijing, cn-hongkong, ap-southeast-1, us-east-1, eu-central-1. The second code, bailian, has cn-beijing and ap-southeast-1. Neither has ap-northeast-1, yet the regions page (Last Updated Oct 13, 2026) lists Japan (Tokyo).; ESA endpoints.json: ap-southeast-1 and cn-hangzhou only. The mirror's global_endpoint is esa.cn-hangzhou.aliyuncs.com.; curl region_deploy/0.1/en.json: Last-Modified Wed, 29 Oct 2025; 79 regional entries; includes 'AI Coding Assistant Lingma'. Its ECS entry omits ap-southeast-8, eu-west-2, eu-west-3 and sa-east-1 but still lists cn-nanjing and cn-fuzhou. Saved dl/js/preg.js shows the global-locations page fetches this file. I did not verify the '23 global' count.

Sources: https://api.alibabacloud.com/meta/v1/products/Eipanycast/endpoints.json?language=EN_US (prior run 2026-10-30); https://www.alibabacloud.com/help/en/llms.txt (Anycast EIP entry: excludes Chinese mainland access points); https://file-intl.alicdn.com/stmt/1/alibabacloud/product/region_deploy/0.1/en.json (curl 2026-10-31, Last-Modified 2025-10-29); https://www.alibabacloud.com/help/en/model-studio/regions (prior run 2026-10-30, updated 2026-10-13)

### F5 (high confidence)

The other candidate sources are unusable or stale:
- The robots.txt sitemap (www.alibabacloud.com/sitemaps/sitemap.xml) redirects to a not-found page.
- The /product page's embedded product blob lists 201 products with stale names (Batch Compute, Dynamic Content Delivery Network, Serverless Workflow, Operation Orchestration Service).
- Help-center JSON endpoints (/help/json/product.json, mainMenu.json) are disallowed by robots.txt (Disallow: /*.json).
- The pricing calculator is a JS app with no public data feed. Prices and orderable products are available only through authenticated BSS OpenAPI calls (QueryProductList, GetPayAsYouGoPrice, GetSubscriptionPrice, DescribePricingModule).
- /product/product-mapping (the AWS/Azure/GCP mapping) renders empty server-side.

**Implication:** Exclude these from the pipeline. Prices would need the user's AccessKey and BSS OpenAPI, which is not needed for v1.

Sources: https://www.alibabacloud.com/robots.txt (prior run 2026-10-30); https://www.alibabacloud.com/product (prior run 2026-10-30); https://www.alibabacloud.com/pricing-calculator (prior run 2026-10-30); https://api.alibabacloud.com/meta/v1/products/BssOpenApi/versions/2017-12-14/api-docs.json (prior run 2026-10-30); https://www.alibabacloud.com/product/product-mapping (WebFetch 2026-10-31, no table)

### F6 (high confidence, load-bearing)

The Alibaba Cloud International Website Terms of Use (Last Updated 2026-09-04) prohibit:
- 2.3(a): copying, re-publishing or commercially exploiting Materials;
- 2.3(b): systematically retrieving Materials to compile a database, 'whether through robots, spiders, automatic devices or manual processes';
- 2.4(e): conducting any crawling, scraping or data-mining.
The llms.txt describes itself as an index 'for LLMs and AI Agents' but grants no reuse licence. 'QWEN', 'QWENCLOUD' and 'TONGYI' are registered marks.

**Implication:** Do not mirror or bulk-ingest the docs. Keep a small catalog of facts written in our own words, with links back to the docs. Use the Apache-2.0 OpenAPI mirror and the MPL-2.0 Terraform data for codes. Limit automation to low-volume change detection. Get legal sign-off or Alibaba's permission before going further.

**Fact-check:** confirmed

Fact-check sources: curl of the ToU .md URL listed in the legal llms.txt (.../legal/latest/alibaba-cloud-international-website-terms-of-use-alibaba-cloud-international-website-terms-of-use.md) returns server-rendered HTML with the full text and 'Last Updated:Sep 04, 2026'.; 2.3(a): 'copy, reproduce, download, re-publish, sell, distribute, resell or commercially exploit any ... Materials'. 2.3(b): 'systematically retrieve Materials ... to create or compile ... a collection, compilation, database or directory (whether through robots, spiders, automatic devices or manual processes)'. 2.3(e) bars use 'for a purpose not expressly permitted'. 2.4(e): 'conduct any crawling, scraping or data-mining of any System', where System means systems related to the Alibaba Cloud Platform.; 7.1 lists 'QWEN', 'QWENCLOUD', 'TONGYI' and their related icons and logos as registered trade marks. 7.2 counts 'database rights' as intellectual property.; The live llms.txt has no licence or permission text, only the purpose line 'for LLMs and AI Agents'. The China-site robots.txt (saved fc1031/help_aliyun_robots.txt) says 'Agent-optimized docs are available through /llms.txt'. The international robots.txt does not mention llms.txt.

Sources: https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-terms-of-use-alibaba-cloud-international-website-terms-of-use (saved copy fetched 2026-10-30 and read 2026-10-31; the live page is JS-rendered and WebFetch returned empty); https://www.alibabacloud.com/help/en/llms.txt (2026-10-31)

### F7 (high confidence, load-bearing)

I fetched the 218 per-product llms.txt files at 3 requests per second from one IP, without spoofing. The first 45 succeeded. The other 173 returned HTTP 200 with a JavaScript anti-bot challenge (a redirect to .../_____tmd_____/punish?x5secdata=...) instead of content. An earlier single fetch of the same SLB index had worked.

**Implication:** Maintenance jobs must be change-detection only, with at most about 10 requests per run, spaced 5 s or more apart. They must detect challenge bodies and back off, and must never try to solve or bypass the challenge. Daily-volume automation should rely on GitHub, the Terraform registry and the single nav JSON.

**Fact-check:** confirmed

Fact-check sources: scratchpad/dl2/curl_sub.log: 218 lines, all HTTP 200. The first 45 (account ... cen) are real indexes; the other 173 are 982-999-byte bodies. llms_sub/ holds only those 45 files, and none contains the challenge marker.; Challenge bodies saved in dl2/lifecycle_lines.txt and fresh_ms/md_tool-calls.md: '<script>... window.location.replace(.../_____tmd_____/punish?x5secdata=...)'. The _config_ object carries action 'captcha', and the redirect host is help.aliyun.com.; File timestamps: account at 07:37:29 to cen at 07:38:00 KST, so 45 files in about 31 s; the run ended 07:39:18. The '3 rps' setting is not recorded in curl_cfg.txt.; Other agents on the same IP were challenged from 07:38:01 until at least 07:42:03 KST, on Model Studio pages on both alibabacloud.com and help.aliyun.com. The block applies to the whole IP.; My spaced single fetches at about 08:04-08:08 KST returned real content: ecs llms.txt (438,775 bytes), slb, api-gateway and lingma llms.txt, and the ToU. The block is transient.

Sources: https://www.alibabacloud.com/help/en/slb/llms.txt (2026-10-31, first fetch OK, bulk fetch challenged); https://www.alibabacloud.com/help/en/ecs/llms.txt (2026-10-31, challenged)

### F8 (high confidence)

Today the international site markets 180 unique products in its menu. The 17 L1 categories are: Computing, Container, Storage, Networking & CDN, Security, Middleware, Database, Analytics Computing, AI & Machine Learning, Media Services, Enterprise Services & Cloud Communication, Domain Names and Websites, End User Computing, Serverless, Developer Tools, Migration & O&M Management, and Apsara Stack. They contain 45 L2 categories. The site documents 218 product doc sets in llms.txt, which adds IoT Platform plus non-product sections. The OpenAPI metadata exposes 354 API product codes, shared with the China site.

**Implication:** Use the 17 L1 and 45 L2 categories as the official taxonomy for panel grouping. A curated set of 150-200 products covers the useful surface.

Sources: https://file-intl.alicdn.com/stmt/1/alibabacloud/product/navigation_product_tree/aggregation-product/1.0/en.json (2026-10-31); https://www.alibabacloud.com/help/en/llms.txt (2026-10-31); https://api.alibabacloud.com/meta/v1/products.json?language=EN_US (2026-10-31)

### F9 (high confidence, load-bearing)

Verified core renames, each from an official source:
- 'SLB' now names the whole load-balancer family (ALB, NLB, GWLB, CLB); the original SLB is now Classic Load Balancer (announcement page updated 2024-10-08).
- ApsaraDB for Redis became Tair (Redis® OSS-Compatible), merged 2024-09-27 per the China-site notice; the international nav and API name agree.
- DCDN became Edge Security Acceleration; the product page heading reads 'Edge Security Acceleration (Original DCDN)'.
- Log Service became Simple Log Service; Message Service (MNS) became Simple Message Queue, labelled '(formerly MNS)'.
- Serverless Workflow (FnF) became CloudFlow.
- Hybrid Backup Recovery became Cloud Backup (code hbr).
- Tracing Analysis became Managed Service for OpenTelemetry (code xtrace).
- Machine Learning Platform for AI became Platform for AI (PAI).
- Operation Orchestration Service became CloudOps Orchestration Service.
- SSL Certificates became Certificate Management Service ('Original SSL Certificate').
- SDDP became Data Security Center ('Original SDDP').
- ASK became ACK Serverless on 2023-07-31; ACK Serverless cluster creation was deprecated on 2025-02-17 in favour of ACS.
- API Gateway (Classic) shuts down on 2027-09-21; users must migrate to Cloud-native API Gateway.
- Legacy GTM reached end-of-sale on 2026-06-30 and reaches end-of-service on 2026-12-31; the successor is GTM 3.0.
- Content Moderation is now the moderation layer of AI Guardrails.
- DRDS was brand-upgraded to PolarDB-X (medium confidence).
- Anti-DDoS Origin is now Anti-DDoS Native (medium confidence).

**Implication:** The knowledge base needs an alias table, provided in the artifacts. It should normalize user and LLM input (SLB, Redis, DCDN, Log Service, MNS, Lingma and so on) to the current product IDs.

**Fact-check:** confirmed

Fact-check sources: WebFetch slb/product-overview/announcement-name-change-in-slb (Last Updated Oct 08, 2024): 'Server Load Balancer (SLB) is renamed as Classic Load Balancer (CLB)'; 'SLB now refers to the entire load balancer product family'. GWLB is named in the llms.txt SLB entry, not on this page.; WebFetch of the China-site Redis notice (help.aliyun.com): '云数据库Redis版与云原生内存数据库Tair已于2024年09月27日合并为云数据库 Tair（兼容 Redis）'. The international nav and the OpenAPI R-kvstore code both use 'Tair (Redis® OSS-Compatible)'.; WebFetch /product/esa: heading 'Edge Security Acceleration (Original DCDN)'. A legacy 'Original DCDN Console' and the OpenAPI code dcdn ('Dynamic Route for CDN') still exist.; WebFetch ACK pages: 'ASK is officially renamed as ACK Serverless on July 31, 2023'. From February 17, 2025, ACK Serverless no longer allows cluster creation, but only for users who never created one; existing clusters and creation within quotas are unaffected (Last Updated Jun 25, 2026).; WebFetch API Gateway end-of-service page (Last Updated Sep 01, 2026): new purchases discontinued 2026-08-23, subscription renewals end 2027-03-21, all services shut down 2027-09-21. It covers both API Gateway (Classic) and MSE Cloud-native Gateway.; WebFetch GTM notice (published Dec 22, 2025): legacy GTM (alidns_gtm_intl) end of sale June 30, 2026; full termination December 31, 2026 00:00 UTC+8; successor GTM 3.0.; WebFetch /product/ai_guardrails: 'three-layer protection architecture: Content Moderation - Dynamic Defense - Model Health'. Content Moderation is still listed separately in the nav (lvwang) and the OpenAPI (Green).; WebFetch polardb-for-xscale/brand-upgrade-2 (Jan 21, 2022): 'Distributed Relational Database Services (DRDS) has been upgraded to PolarDB-X'. The anti-ddos-origin what-is page (Last Updated Oct 09, 2026) is headed 'What is Anti-DDoS Native?'; I found no rename notice.; The nav and llms.txt show Simple Log Service (SLS), 'Simple Message Queue (formerly MNS)', 'CloudFlow (formerly Serverless Workflow/FnF)', Cloud Backup (hbr), Managed Service for OpenTelemetry (xtrace), Platform for AI (PAI), CloudOps Orchestration Service, 'Certificate Management Service (Original SSL Certificate)' and 'Data Security Center (Original SDDP)'.

Sources: https://www.alibabacloud.com/help/en/slb/product-overview/announcement-name-change-in-slb (WebFetch 2026-10-31); https://www.alibabacloud.com/help/en/slb/classic-load-balancer/product-overview/what-is-clb (2026-10-31); https://www.alibabacloud.com/product/esa (prior run 2026-10-30); https://help.aliyun.com/zh/redis/product-overview/notice-apsaradb-for-redis-and-tair-have-been-merged (prior run 2026-10-30, China site); https://www.alibabacloud.com/help/en/api-gateway/traditional-api-gateway/product-overview/end-of-service-the-original-api-gateway-and-mse-cloud-native-gateway (curl 2026-10-31, meta description); https://www.alibabacloud.com/en/notice/endoflife_announcement_for_alibaba_cloud_dns_global_traffic_manager_legacy_version_651?_p_lc=1 (WebFetch 2026-10-31); https://www.alibabacloud.com/product/ai_guardrails (WebFetch 2026-10-31); https://www.alibabacloud.com/help/en/ack/llms.txt (2026-10-31); https://www.alibabacloud.com/help/en/llms.txt (2026-10-31)

### F10 (high confidence)

Seven 2026 'Agentic' or AI renames were announced in official notices:
- Threat Analysis and Response (CTDR) became Agentic SOC, inside Security Center, on 2026-01-15.
- Cloud Governance Center became Agentic Cloud Governance Center on 2026-06-24.
- Cloud Skills Portal became Cloud Agent Catalog on 2026-08-26.
- Multi-agent Governance and Collaboration Platform became AgentCore on 2026-08-28.
- JVS Agent Suite became Agentic Computer on 2026-09-07.
- ANOLISA became Agentic OS on 2026-09-10.
- AI DeepSign became DeepSynID on 2026-10-10.

**Implication:** Renames are frequent: 7 in 10 months, all in the AI and agent area. The notice center has to be in the weekly review loop.

Sources: https://www.alibabacloud.com/en/notice/product_changeannouncement_of_name_change_for_security_center_ctdr_66a?_p_lc=1 (prior run 2026-10-30); https://www.alibabacloud.com/en/notice/product_change_name_changes_of_alibaba_clouds_cloud_governance_center_77e?_p_lc=1 (prior run); https://www.alibabacloud.com/en/notice/product_change_name_changes_of_alibaba_clouds_multiagent_governance_and_collaboration_platform_82d?_p_lc=1 (prior run); https://www.alibabacloud.com/en/notice/product_change_name_changes_of_alibaba_clouds_anolisa_852?_p_lc=1 (prior run); https://www.alibabacloud.com/en/notice/product_change_name_changes_of_alibaba_clouds_cloud_skills_portal_808?_p_lc=1 (prior run); https://www.alibabacloud.com/en/notice/product_change_name_changes_of_alibaba_clouds_jvs_agent_suite_83b?_p_lc=1 (prior run); https://www.alibabacloud.com/help/en/ai-deepsign/llms.txt (2026-10-31)

### F11 (high confidence, load-bearing)

'Tongyi Lingma' now maps to two different products:
- China: Qoder CN. AI Coding Assistant Lingma was renamed at 23:00 CST on 2026-05-20. It is China-hosted, offers GLM, DeepSeek, Kimi and MiniMax models, and is priced per seat in CNY.
- International: Qoder. alibabacloud.com/product/lingma now presents 'Qoder – Agentic Coding For Enterprise'. Teams costs USD 40 per seat per month with 3,000 credits per seat. Enterprise costs USD 20 per seat per month plus a separately billed shared credit pool. Its 'Subscribe Now' buttons go to the Alibaba Cloud Marketplace. qoder.com sells individual plans: Free, Lite USD 10, Pro USD 20, Pro+ USD 60 and Ultra USD 200.
Two cross-links are stale: the international nav still labels /product/lingma 'Qoder CN', and the Qoder CN llms.txt says 'For the international version, see Lingma'.

**Implication:** Alias Lingma, Tongyi Lingma and 通义灵码 to Qoder for international users, and flag Qoder CN as China-only. This directly fixes the live-probe failure.

**Fact-check:** confirmed

Fact-check sources: WebFetch notice product_change_name_changes_of_alibaba_clouds_ai_coding_assistant_lingma_75e: published May 07, 2026 on alibabacloud.com/en. The change takes effect 'at 23:00 CST (UTC+8) on May 20, 2026'; 'AI Coding Assistant Lingma will be changed to Qoder CN'.; Live lingma/llms.txt: 'Qoder CN is an AI coding agent suite for the China market, built on GLM, DeepSeek, Kimi, and MiniMax models ... For the international version, see Lingma'. Its subscription entry cites ¥59–¥169/mo and 'Buy at qoder.com.cn'.; WebFetch /product/lingma: title 'Qoder: Agentic Coding for Enterprise AI Development'. Teams costs $40/seat/month with 3,000 Credits per seat. Enterprise costs $20/seat/month with a 'Shared Credits pool ... seats don't include Credits; Credits are billed separately'. 'Subscribe Now' goes to marketplace.alibabacloud.com/products/201076001/...; WebFetch docs.qoder.com/account/pricing: Free $0; Lite $10 (1,000 credits); Pro $20 (2,000); Pro+ $60 (6,000); Ultra $200 (20,000).; The nav JSON still labels /product/lingma 'Qoder CN', with the shortDesc 'An AI coding assistant that helps developers code faster and more easily'.

Sources: https://www.alibabacloud.com/product/lingma (WebFetch 2026-10-31); https://www.alibabacloud.com/help/en/lingma/llms.txt (2026-10-31); https://www.alibabacloud.com/en/notice/product_change_name_changes_of_alibaba_clouds_ai_coding_assistant_lingma_75e?_p_lc=1 (prior run 2026-10-30); https://docs.qoder.com/account/pricing (prior run 2026-10-30)

### F12 (high confidence, load-bearing)

The Alibaba Cloud international site does not support ICP filing. To file, a user must register a China-site (aliyun.com) account. ICP filing applies only to servers in the Chinese mainland, and the filing system is Chinese-only. GoChina ICP Filing Assistant is the paid alternative.

**Implication:** Default international users to non-mainland regions such as Singapore or Hong Kong. Recommending any cn-* region for a public website must trigger an ICP and China-account warning.

**Fact-check:** confirmed

Fact-check sources: WebFetch icp-filing-application-for-enterprises-outside-the-chinese-mainland (Last Updated May 22, 2026): 'Alibaba Cloud International site does not support ICP filing.'; 'To submit a filing, register an Alibaba Cloud China site account.'; 'ICP filing applies only to servers located in the Chinese mainland.'; 'The ICP filing application system is available only in Chinese.'; That page names GoChina ICP Filing Assistant as an alternative but does not say it is paid. A search snippet from GoChina's billing docs says each payment 'activates a one-off service', so it is a paid service.; llms.txt ICP Filing entry: 'websites/apps whose domains resolve to Alibaba Cloud servers in the Chinese mainland'.

Sources: https://www.alibabacloud.com/help/en/icp-filing/basic-icp-service/product-overview/icp-filing-application-for-enterprises-outside-the-chinese-mainland (WebFetch 2026-10-31, updated 2026-05-22); https://www.alibabacloud.com/help/en/llms.txt (ICP Filing entry, 2026-10-31)

### F13 (high confidence, load-bearing)

Model Studio specifics on the international site that change recommendations:
- API keys and model lists are per region: Singapore, Hong Kong, Tokyo, Frankfurt and Virginia, plus Beijing on the China side.
- The Application Development tab and the application, knowledge-base and prompt APIs (agent apps, workflow apps, RAG knowledge base) are available only to users who created applications in Singapore before 2025-04-21 (docs updated 2026-10-11).
- The regions page (updated 2026-10-13) says the DashScope domain will not support new features after 2026-09-30, and recommends workspace-dedicated domains such as {WorkspaceId}.ap-southeast-1.maas.aliyuncs.com.
- Qwen Cloud (qwencloud.com) is a new international brand, launched 2026-05-26 in Singapore, with endpoints at *.maas.qwencloudapi.com. Its relationship to Model Studio is not officially documented; only LiteLLM docs claim the brands were unified.

**Implication:** Never recommend Model Studio knowledge bases or agent apps to new international users. For RAG, use the Model Studio API with Milvus, AnalyticDB PostgreSQL, OpenSearch or Elasticsearch, plus FC, SAE or AgentRun. Pass the DashScope-domain deprecation note to the Model Studio workstream.

**Fact-check:** partially-true. Bullets 1-3 are confirmed on the live pages: the regions page was updated 2026-10-13 and application-introduction 2026-10-11. The regions-page sentence reads 'The DashScope domain (dashscope.aliyuncs.com) will no longer support new features after September 30, 2026'. It names the China domain, so applying it to dashscope-intl is an inference. DashScope domains have a 600 s timeout, against 3,600 s for workspace-dedicated domains, and do not exist in Frankfurt, Tokyo or Virginia. The app restriction covers the Application Development tab and the 'application data, knowledge base, and prompt engineering APIs'. Bullet 4 is partly wrong. Qwen Cloud's link to Alibaba Cloud accounts is officially documented: ToU §3.5 (2026-09-04) makes qwencloud.com an 'Associated Platform' with unified login and account sync. Qwen Cloud docs also mirror Model Studio's six regions, workspaces and deployment scopes, with base URLs {region}.maas.qwencloudapi.com. What remains undocumented is whether keys, quotas and billing are shared with Model Studio. The 2026-05-26 Singapore launch is confirmed (blog dated 2026-05-28).

Fact-check sources: WebFetch model-studio/regions (Last Updated Oct 13, 2026). Regions: Beijing, Singapore, Frankfurt, Tokyo, Hong Kong, Virginia; 'Each region has its own endpoint, API Key, and model list'. The DashScope-domain sentence is quoted verbatim in the correction. The DashScope domain is 'Not supported' in Frankfurt, Tokyo and Virginia. Timeouts: 3,600 s workspace-dedicated, 600 s DashScope.; WebFetch model-studio/application-introduction (Last Updated Oct 11, 2026): 'Only users who created Alibaba Cloud Model Studio applications in the Singapore region before April 21, 2025' can access the Application Development tab and call the application data, knowledge base and prompt engineering APIs.; WebFetch of the Qwen Cloud launch blog: published May 28, 2026; launched May 26, 2026 in Singapore. It does not explain the relationship to Model Studio.; Live ToU §3.5: qwencloud.com is an 'Associated Platform' with a 'unified login and unified account experience', and account data is synchronized across platforms.; Saved docs.qwencloud.com regions page (factcheck_ai/qc_regions.md): the same 6 regions, workspaces and deployment scopes as Model Studio; example base URL ap-southeast-1.maas.qwencloudapi.com.

Sources: https://www.alibabacloud.com/help/en/model-studio/application-introduction (saved copy fetched 2026-10-30, Last Updated 2026-10-11); https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base (saved copy, Last Updated 2026-10-11); https://www.alibabacloud.com/help/en/model-studio/regions (prior run 2026-10-30); https://www.alibabacloud.com/blog/alibaba-cloud-launches-qwen-cloud-for-global-markets_603191 (prior run 2026-10-30); https://docs.litellm.ai/docs/providers/qwencloud (search result only, not opened)

### F14 (medium confidence)

International regions as of 2026-10-31: Singapore ap-southeast-1, Kuala Lumpur ap-southeast-3, Johor ap-southeast-8 (2026), Jakarta ap-southeast-5, Manila ap-southeast-6, Bangkok ap-southeast-7, Tokyo ap-northeast-1, Seoul ap-northeast-2, Hong Kong cn-hongkong, Virginia us-east-1, Silicon Valley us-west-1, Mexico (Querétaro) na-south-1 (2025), São Paulo sa-east-1 (2026), Frankfurt eu-central-1, London eu-west-1, Paris eu-west-2 (2026), Amsterdam eu-west-3 (opened 2026-10-29), Dubai me-east-1, and Riyadh me-central-1 (a partner region). Sydney and Mumbai are marked Closed. The Nanjing and Fuzhou local regions are closing down. 'US (Atlanta)' us-southeast-1 appears only in the OpenAPI ECS endpoint metadata.

**Implication:** Ship a curated international region list and never suggest Sydney or Mumbai. The Amsterdam ID and Atlanta still need confirmation.

**Fact-check:** partially-true. The 19-region list matches the live global-locations page. That page shows Johor 2026, Paris 2026, São Paulo 2026, Mexico (Querétaro) 2025 and Riyadh as a 'Partner Region'. Amsterdam (eu-west-3) is confirmed by the official blog of 2026-10-29 but is not yet on global-locations, which still shows 31 regions and 106 AZs against the official 32 and 109. The Atlanta sub-claim is wrong: US (Atlanta) us-southeast-1 appears in more than the ECS endpoint metadata. The ACS Regions doc (updated 2026-06-02) lists 'US Southeast 1 (Atlanta)', the SLS and Auto Scaling endpoint docs list it, and the GitHub mirror shows us-southeast-1 endpoints for 35 products. It is missing only from global-locations, so a region model should include it, perhaps flagged as limited. Nanjing and Fuzhou are tagged 'Closing Down' in docs and 'Closed' in API metadata.

Fact-check sources: WebFetch global-locations: 31 regions and 106 AZs. Non-mainland regions shown: Singapore, Bangkok, Kuala Lumpur, Johor (2026), Jakarta, Manila, Tokyo, Seoul, Virginia, Silicon Valley, Mexico (Querétaro, 2025), Frankfurt, London, Dubai, SAU (Riyadh, Partner Region), Hong Kong, Paris (2026), São Paulo (2026). Not shown: Amsterdam, Atlanta, Sydney, Mumbai.; WebFetch alibabacloud.com/blog/alibaba-cloud-launches-first-public-cloud-region-in-the-netherlands_603704: Amsterdam region launched 29 Oct 2026 with two data centres; 'Alibaba Cloud's global infrastructure now spans 109 availability zones across 32 regions'.; WebFetch cs/product-overview/open-service-area (ACS, Last Updated Jun 02, 2026) lists 'US Southeast 1 (Atlanta): us-southeast-1'. Search snippets show it in the SLS and Auto Scaling endpoint docs and in Cloud Firewall's supported regions. The GitHub mirror has us-southeast-1 endpoints for 35 products, including ACS, ALB, ACK, CEN, CMS, ACR, MongoDB and EAS.; Ecs endpoints.json lists 'Netherlands(Amsterdam)' eu-west-3, 'Brazil (Sau Paulo)' sa-east-1, 'Mexico' na-south-1 and 'US（Atlanta）', plus Closed markers for Sydney, Mumbai, Nanjing and Fuzhou. A search snippet shows the regions doc tagging Nanjing and Fuzhou 'Closing Down'.

Sources: https://www.alibabacloud.com/global-locations (prior run 2026-10-30: 31 regions, 106 zones); https://api.alibabacloud.com/meta/v1/products/Ecs/endpoints.json?language=EN_US (prior run 2026-10-30); https://www.techzine.eu/news/infrastructure/145376/alibaba-cloud-opens-first-cloud-region-in-the-netherlands/ (prior run 2026-10-30)

### F15 (medium confidence)

Several 2026 agent products are international but narrow. AgentRun's English docs (updated 2026-08-22) list Singapore as the only international region. AgentBay runs in Singapore. Qwen Cloud's Token Plan can be bought and used only in Singapore. The Amsterdam launch announced Agent Security Center, ACS Agent Sandbox, AI Guardrails 2.0, Agentic SOC and STAROps for that region. Some products listed on the international site have only mainland API endpoints: Chatbot (beebot), Quick Audience, Dataphin and Alibaba Cloud DevOps.

**Implication:** AI-product catalog entries need explicit international region lists. Products whose endpoints are China-only should be dropped or flagged. The seed list leaves out Chatbot, Quick Audience and Dataphin, and flags DevOps.

**Fact-check:** partially-true. Several parts are confirmed. AgentRun's only international region is Singapore (docs updated 2026-08-22). AgentBay is 'Deployed in Singapore'. The Token Plan 'can be purchased and used only in the Singapore region'. Chatbot, Quick Audience, Dataphin and DevOps are all on the international nav but have mainland-only API endpoints. The Amsterdam part needs a correction. The 2026-10-29 blog says Alibaba 'plans to bring' ACS Agent Sandbox, Agent Security Center, 'AI Security Guardrails 2.0', Agentic SOC and STAROps to the region, so they are planned and not available. As of 2026-10-30 only 9 products had eu-west-3 endpoints: ActionTrail, Anti-DDoS, ECS, ESS, NLB, PrivateLink, Tablestore, VPC and Workorder.

Fact-check sources: WebFetch agentrun/open-service-area (Last Updated Aug 22, 2026): cn-hangzhou, cn-shanghai, cn-beijing, cn-shenzhen, ap-southeast-1. The AgentRun endpoints.json matches.; WebFetch /en/product/agentbay: 'Deployed in Singapore'.; WebFetch docs.qwencloud.com/token-plan/overview: 'Token Plan can be purchased and used only in the Singapore region.'; WebFetch of the Amsterdam blog: the company 'plans to bring a suite of agentic AI services to the region'. That suite is ACS Agent Sandbox, Agent Security Center, AI Security Guardrails 2.0, Agentic SOC and STAROps, all planned.; endpoints.json: Chatbot cn-shanghai only; retailadvqa cn-zhangjiakou, cn-shenzhen and cn-shanghai; dataphin-public 5 mainland regions; devops cn-hangzhou only. The nav lists all four (beebot, retailadvqa, dataphin, rdc).

Sources: https://www.alibabacloud.com/help/en/agentrun/open-service-area (prior run search result, 2026-10-30); https://www.alibabacloud.com/en/product/agentbay (prior run 2026-10-30); https://docs.qwencloud.com/token-plan/overview (prior run 2026-10-30); https://api.alibabacloud.com/meta/v1/products.json?language=EN_US (2026-10-31)

### F16 (high confidence, load-bearing)

Names differ between sources, and each source lags differently:
- Tracing Analysis (OpenAPI) vs Managed Service for OpenTelemetry (nav).
- 'Log Service (SLS)' and 'Classic Load Balancer (SLB)' (Terraform subcategories) vs Simple Log Service and CLB.
- Cloud Skills Portal (llms.txt) vs Cloud Agent Catalog (notice).
- Vector Retrieval Service for Milvus (nav) vs ApsaraDB for Milvus (llms.txt).
- 'Qoder CN' (nav label) vs 'Qoder' (page).
- 'SAS' is both Simple Application Server's acronym and Security Center's API code.
Terraform provider v2.1.0 (published 2026-10-22, MPL-2.0) has 1,233 resource docs, 814 data sources and 148 subcategories.

**Implication:** Each catalog entry stores one canonical name plus aliases. Name precedence: newest notice, then nav, then llms.txt title, then OpenAPI, then Terraform. The LLM must output catalog IDs, never free-text names.

**Fact-check:** partially-true. Most name-divergence examples hold. The Milvus example is mis-stated: both the nav and the llms.txt title the product 'Vector Retrieval Service for Milvus', and only the llms.txt summary says 'ApsaraDB for Milvus'. The cited registry entry for v2.1.0 (published 2026-10-22T12:07:48Z, MPL-2.0) lists 1,224 resources, 810 data sources and 150 subcategories. The researcher's 1,233, 814 and 148 come from the GitHub master tree, not the published release.

Fact-check sources: curl registry.terraform.io/v1/providers/aliyun/alicloud: version 2.1.0, published_at 2026-10-22T12:07:48Z. Docs list 1,224 resources, 810 data-sources and 150 subcategories. The GitHub repo license is MPL-2.0. The prior run's master-tree files (dl/tf_r.json, tf_d.json, tf_subcats.txt) give 1,233, 814 and 148.; Terraform subcategories include 'Log Service (SLS)', 'Classic Load Balancer (SLB)', 'Hybrid Backup Recovery (HBR)', 'Operation Orchestration Service (OOS)', 'Serverless Workflow (FnF)', 'Message Service' and 'Data Security Center (SDDP)'.; WebFetch of the Cloud Skills Portal notice (published 2026-08-12): 'Cloud Skills Portal will be changed to Cloud Agent Catalog', effective 2026-08-26 00:00 CST. llms.txt line 268 still reads 'Cloud Skills Portal'.; xtrace is named 'Tracing Analysis' in OpenAPI and 'Managed Service for OpenTelemetry' in the nav. The nav says 'Qoder CN' while the page says 'Qoder'. 'Simple Application Server (SAS)' uses code swas, while Security Center's code is sas in both the nav and OpenAPI.

Sources: https://registry.terraform.io/v1/providers/aliyun/alicloud (2026-10-31); https://github.com/aliyun/terraform-provider-alicloud (prior run sparse clone 2026-10-30); https://file-intl.alicdn.com/stmt/1/alibabacloud/product/navigation_product_tree/aggregation-product/1.0/en.json (2026-10-31)

### F17 (high confidence, load-bearing)

The 176-line seed list is about 29k characters, roughly 7.3k tokens at 4 characters per token. With the placement rules and about 12 patterns, the full grounding block is about 10-12k tokens. That is under the 24k-token system prompt already measured with implicit cache at 1.0-2.8 s warm time to first token.

**Implication:** v1 can put the whole catalog in the cached system prompt. It needs no vector search or RAG over Alibaba docs, which also limits the terms-of-use exposure.

**Fact-check:** confirmed

Fact-check sources: wc on scratchpad/kb_seed.txt: 176 lines, 29,390 characters. 29,390/4 gives 7.35k tokens; a crude word-plus-punctuation estimate gives about 7.8k.; I could not check the 10-12k total for rules plus 12 patterns; it is a projection. Even at a pessimistic 3 chars/token the seed is about 9.8k tokens, well under the measured 24k-token prompt.

Sources: C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/kb_seed.txt (local computation 2026-10-31)

### F18 (high confidence)

draw.io's Apache-2.0 Alibaba Cloud palette has 273 shapes. None cover ESA, ACS, Model Studio, PAI, Tair, Milvus, GWLB, KMS, CPFS, Grafana or any 2026 agent product, and it uses old names such as oos_operation_orchestration_service and sddp_sensitive_data_protection.

**Implication:** The catalog's icon field needs custom icons or category-glyph fallbacks. This is a cross-reference for the assets workstream.

Sources: https://raw.githubusercontent.com/jgraph/drawio/dev/src/main/webapp/js/diagramly/sidebar/Sidebar-AlibabaCloud.js (prior run 2026-10-30; shape list re-read 2026-10-31)

### F19 (high confidence)

Products to exclude or mark retired:
- AIRec: end of marketing 2026-01-03, end of service 2027-01-03; replaced by OpenSearch AIRec.
- GraphCompute: end of service 2027-01-03.
- ID Verification Global: offline 2026-04-30.
- Mobile Testing: switched off on the international site 2026-04-01.
- ApsaraDB for Cassandra: discontinuation notice dated 2023-10-17.
- Time Series Database: EOL, no new purchases.
- ApsaraDB for OceanBase: marked Deprecated on the international site (moving to the Marketplace channel).
- Database Gateway: deprecated.
- ACK dedicated clusters: end of sale 2024-08-21.
- ACK Edge: no new clusters from 2026-09-03.
- ARMS Basic Edition: discontinued 2026-10-15.
- Pay-by-specification CLB: end of sale 2026-01-01.
- Anti-DDoS Native 2.0 pay-as-you-go: no new purchases from 2026-06-20.
- Hybrid Cloud Storage: sales end 2026-02-01 (from a search summary).
The international nav still lists AIRec, Hybrid Cloud Storage and ApsaraDB for HBase.

**Implication:** The validator must reject these products as recommendations and map them to their successors.

Sources: https://www.alibabacloud.com/en/notice/product_change_announcement_of_product_retirement_for_airec_627?_p_lc=1 (prior run); https://www.alibabacloud.com/en/notice/product_change_announcement_of_product_retirement_for_graphcompute_626?_p_lc=1 (prior run); https://www.alibabacloud.com/en/notice/announcement_of_product_delisting_for_id_verification_global_48e?_p_lc=1 (prior run); https://www.alibabacloud.com/en/notice/notice_on_mobile_testing_discontinuation_46a?_p_lc=1 (prior run); https://www.alibabacloud.com/help/en/arms/llms.txt (2026-10-31); https://www.alibabacloud.com/help/en/anti-ddos/llms.txt (2026-10-31); https://www.alibabacloud.com/help/en/apsaradb-for-cassandra/llms.txt (2026-10-31); https://www.alibabacloud.com/help/en/apsaradb-for-oceanbase/llms.txt (2026-10-31)

### F20 (medium confidence)

Alibaba's Architecture Center lists 33 reference architectures, several of them dated (they cite Batch Compute and Log Service). Cloud Architect Design Tools (CADT), Alibaba's visual architecture design tool with an AI assistant, is the closest first-party prior art.

**Implication:** Pairings and patterns must be written by hand. A seed set is in the artifacts.

**Fact-check:** confirmed

Fact-check sources: WebFetch architecture/ref-architecture/index: 33 entries, including 'Use Batch Compute for Third-generation Genome Sequencing and Assembly' and 'Use Log Service to Collect, Process, and Analyze Logs from Multiple Cloud Platforms'. Other dated entries: 'Migrate MySQL databases to Apsara PolarDB' and 'S/4 HANA 1909'. No dates are shown.; The llms.txt CADT entry and the saved CADT sub-index say: 'Describe your requirements in natural language and let CADT generate a cloud architecture diagram automatically'.; A saved copy of an official Agent Skill 'alibabacloud-cadt-arch-draw' (scratchpad/recheck/cadt_skill.md, from aliyun/alibabacloud-aiops-skills, pushed 2026-10-30) shows CADT's AI agent is callable through 'aliyun bpstudio execute-operation-sync --service-type ai_agent' (SendMessage and ListMessage, cn-hangzhou, 30-120 s per diagram). It supports sessionId reuse for iterative edits.

Sources: https://www.alibabacloud.com/architecture/ref-architecture/index (prior run 2026-10-30); https://www.alibabacloud.com/help/en/llms.txt (CADT entry, 2026-10-31)

## Blockers raised

- **major**: The International Website Terms of Use (2.3(a), 2.3(b), 2.4(e); updated 2026-09-04) prohibit copying Materials, systematically compiling a database from them by robots or manual processes, and crawling, scraping or data-mining. llms.txt grants no reuse licence. **Mitigation:** Ship a hand-curated catalog of roughly 180 entries containing facts (names, codes, categories, statuses) and our own one-line descriptions, with links back to the docs; copy no doc text. Take codes from the Apache-2.0 aliyun-openapi-meta mirror and MPL-2.0 Terraform data. Limit automation to about 10 requests a week for change detection, reviewed by a human. Get legal sign-off, or ask Alibaba through the user's account or partner channel for permission to use llms.txt content. Do not build RAG over a downloaded doc corpus.
- **major**: No authoritative, current, machine-readable matrix of international regions per product exists. Products-by-Regions JSON is from 2025-10-29 and covers only 79 products. API endpoint lists are not the same as availability (Anycast EIP, Model Studio and ESA are counterexamples). **Mitigation:** Curate international region lists for the roughly 60 products that appear in diagrams from each product's 'Supported regions' docs, refresh them quarterly, and record a checked_at date. Have the UI say 'verify region in console' for anything else. Get Model Studio models at runtime from GET /models with the user's key. Default to ap-southeast-1.
- **minor**: The help center returns an anti-bot JavaScript challenge with HTTP status 200. In testing, it hit 173 of 218 per-product index requests at 3 requests per second. **Mitigation:** Fetch only for change detection: the single llms.txt index weekly, and sub-indexes only for products that changed, spaced 5 s or more apart. Detect the challenge marker (_____tmd_____/punish) and back off. Never solve or bypass the challenge. Rely on GitHub, the Terraform registry and the single nav JSON for the daily signals.
- **minor**: Names and descriptions disagree across official sources, and some official summaries are wrong. Examples: the llms.txt Agent Sandbox and SLB entries, Security Center's nav tagline, and stale cross-links for Qoder CN and Lingma. **Mitigation:** Keep an alias table and a name-precedence rule. Have a human review every catalog diff. Add CI tests asserting canonical names for known renames (for example, no 'Tongyi Lingma', 'DCDN' or 'Log Service' in outputs).
- **minor**: Model Studio agent and workflow apps and its knowledge base are closed to international accounts that did not create apps before 2025-04-21. The DashScope domain stopped receiving new features after 2026-09-30. **Mitigation:** Encode both as catalog constraints. RAG patterns use the Model Studio API plus vector stores (Milvus, AnalyticDB PostgreSQL, OpenSearch). Pass the domain note to the Model Studio workstream, which may need the workspace-dedicated endpoint.
- **minor**: No official or open icon set covers ESA, ACS, Model Studio, PAI, Tair, Milvus or the 2026 agent products. **Mitigation:** Store an icon ID with a fallback category glyph in the catalog; the assets workstream supplies the custom set.

## Fact-checker: severity notes

- Terms of Use (major): I agree it is major as a legal and commercial exposure, but it does not prevent the build. I verified the live text (Last Updated 2026-09-04). The mitigation is weaker than presented: 2.3(b) explicitly covers 'manual processes', 2.3(a) also bans 'download', 2.3(e) bars any use not expressly permitted, and 7.2 lists 'database rights'. A hand-curated catalog compiled from site Materials is therefore not outside the clauses by itself. The safe legs are facts in our own words, the Apache-2.0 aliyun-openapi-meta and MPL-2.0 Terraform data, and written permission. Alibaba's own signals of intended agent use (llms.txt 'for LLMs and AI Agents'; the help.aliyun.com robots.txt pointing agents to llms.txt) lower the risk of user-initiated runtime lookups but are not a licence. If the user is Alibaba staff or a partner, asking for permission probably resolves the issue.
- No authoritative region matrix (major): I agree, and it is worse than stated. global-locations shows 31 regions and 106 AZs, against the official 32 and 109 after Amsterdam. It also omits US (Atlanta) us-southeast-1, which the ACS, SLS and Auto Scaling docs list and 35 products expose endpoints for. Per-product docs and endpoints contradict each other: the ACS Regions doc omits Johor, while the ACS API (acc) has ap-southeast-8. The mitigation is right (curated lists with checked_at, 'verify in console', ap-southeast-1 default). It should add us-southeast-1 and eu-west-3 with 'limited catalog' flags.
- Anti-bot challenge (minor): I agree minor for an offline, human-reviewed pipeline. The block is rate-triggered, applies to the whole IP and is transient. The bulk run also blocked other agents' Model Studio doc fetches on alibabacloud.com and help.aliyun.com from 07:38 until at least 07:42 KST. My spaced single fetches about 25 minutes later succeeded. The challenge config declares action 'captcha', so it must never be automated around. It would become major if the product fetched docs at runtime from a server IP, so the runtime should not depend on the help center.
- Name and summary disagreements (minor): I agree minor, but there are more cases than listed. The llms.txt titles 'Agentic Cloud Governance Center' but its summary says 'AI Cloud Governance Center'. It also titles products 'DeepSynID' and 'Agentic Computer' while their summaries say 'AI DeepSign' and 'JVS agent suite'. ESA's nav productCode is 'dcdn', DevOps is 'rdc' in the nav but 'devops' in the API, and Model Studio has two API codes. A stable internal slug plus a crosswalk table is needed, not only an alias list.
- Model Studio apps, knowledge base and DashScope domain (minor): minor for the build, but it constrains what the app may recommend. The catalog must not suggest Model Studio agent or workflow apps, the knowledge base, or the Responses file_search tool (which needs a knowledge base) to new international users. The DashScope note matters for the app itself. The DashScope domain has a 600 s request timeout, against 3,600 s on the workspace-dedicated domain, and thinking runs over 300 s have already been observed.
- Icons (minor): technically minor. ToU 7.1 covers 'related icons and logos', though, so reusing Alibaba icons is also an IP and permission question, not only a coverage gap.

## Fact-checker: missed risks

- API Gateway (Classic) and MSE Cloud-native Gateway stopped new purchases on 2026-08-23 00:00 UTC+8. Subscription renewals end 2027-03-21 and both shut down on 2027-09-21. Only Cloud-native API Gateway and AI Gateway are valid in new designs, yet the llms.txt MSE entry still advertises its cloud-native gateway.
- Legacy Lingma and Tongyi Lingma subscriptions, now 'Qoder CN (formerly Lingma)', stopped new purchases on 2026-09-15 22:00 UTC+8. Renewals end 2027-04-15 and service ends 2027-09-15, with migration to Qoder CN (Full Suite) (notice updated 2026-10-20). Recommending any Lingma SKU is wrong today.
- US (Atlanta) us-southeast-1 is an official public region in the ACS, SLS, Auto Scaling and Cloud Firewall docs, with endpoints for 35 products, but it is absent from global-locations.
- Amsterdam eu-west-3 (2026-10-29) is also missing from global-locations, and only 9 products had endpoints there on 2026-10-30.
- The China site's English mirror (help.aliyun.com/en, listed in llms.txt as 'China Site (English)') ranks high in web search, and several of my searches returned it. Its pages describe China-site availability and pricing, so every KB refresh must filter sources by host.
- Code collisions beyond SAS: ESA's nav productCode is 'dcdn', while OpenAPI has separate ESA and dcdn ('Dynamic Route for CDN') codes. DevOps is 'rdc' in the nav but 'devops' in the API. Model Studio has two API codes: bailian (Beijing, Singapore) and ModelStudio (Beijing, Hong Kong, Singapore, Virginia, Frankfurt). The OpenAPI product list is identical for the China and international sites, so it says nothing about which site sells what.
- Several global services have only a cn-hangzhou API endpoint: Global Accelerator (Ga), Anycast EIP and RAM IMS. Another 17 API products list no regional endpoint at all. Availability must never be inferred from endpoint lists.
- Legacy or overlapping products are still listed: the nav shows 'Global Traffic Manager (GTM)' (legacy GTM ends service 2026-12-31; successor GTM 3.0), Content Moderation is still sold separately (nav lvwang, API Green), and the legacy DCDN console and API remain. The catalog needs lifecycle states (active, legacy, no new purchases, end of service), not just a rename table.
- ACK Serverless: the 2025-02-17 creation ban applies only to accounts that never created a cluster, and existing users can still create within quotas. Encode it as 'not for new designs; use ACS' rather than 'deprecated'.
- ToU §3.5 (2026-09-04) officially ties qwencloud.com to Alibaba Cloud accounts (unified login and account sync), and Qwen Cloud docs mirror Model Studio's six-region workspace model. The user's account may extend to Qwen Cloud, and the KB should state both brands' scope.
- First-party prior art and competitor: an official Agent Skill (alibabacloud-cadt-arch-draw) exposes CADT's AI agent through 'aliyun bpstudio execute-operation-sync --service-type ai_agent' (cn-hangzhou, 30-120 s per diagram, sessionId for iterative edits). This is text-to-architecture as an API, beyond the CADT console. I saw it in a saved copy only, and the repo has no licence.
- Bulk fetching from a shared IP degrades other workstreams: the 07:37 KST bulk run triggered CAPTCHAs for other agents on both doc sites for at least 4 minutes. Any refresh crawl must run separately, slowly, and never alongside interactive research.
- Generator artifacts in the llms.txt files: 'MANUAL_REVIEW: page unavailable' placeholders (8 in the CADT sub-index alone) and nested Sub-Products indexes (9 of 45 sampled, 32 nested files). Summaries can't be trusted verbatim, and .md link counts are lower bounds.

## Recommended approach

Build the knowledge base as a versioned, hand-curated catalog in the repo, as YAML or JSON. Start from the 176-line seed list, the alias map, the placement rules, the schema and the patterns in the artifacts field. Treat the official sources as change signals, not as content to mirror.

1) Structure. Keep four collections:
- product: about 180 entries. Each has a stable ID, canonical international name, aliases, kind, status and lifecycle, official L1/L2 category, site (intl/cn/both), and international regions with source and checked date. Diagram fields: icon, tier, place, container rules, request-path rank, multi-AZ. Grounding fields: purpose in our own words, use_when, avoid_when, facts with sources, and user intents. Hover fields: a default 'why' and per-role templates. Relations: pairs_with (typed), alternatives with 'choose when', and requires. References: product URL, docs llms.txt URL, API code, Terraform prefix, nav code.
- offering: product-need answers such as Qoder Teams/Enterprise, QwenWork, the Model Studio Coding/Token Plans, Qwen Cloud, AgentBay and AI Guardrails, each with intents and a not-for flag (for example, Qoder CN is not for international users).
- pattern: about 12 hand-written reference compositions.
- rule: placement and ordering invariants.

2) Grounding at runtime. Put the whole compact catalog (about 7-12k tokens) into the cached system prompt; the probe showed a 24k-token prompt warms to a 1-2.8 s time to first token. The model must emit product IDs, never free-text names. The server will:
- normalize aliases (SLB, Redis, DCDN, Lingma and so on);
- reject unknown or retired IDs and suggest the successor;
- auto-fix placement deterministically: regional managed services such as Model Studio, SLS, ARMS, CloudMonitor, Security Center, OSS and Quick BI are moved outside the VPC; request-path rank enforces DNS, then ESA/CDN/GA, then Anti-DDoS Proxy, then WAF, then LB or API gateway, then compute, cache and database; EBS, EIP and certificates become attachments, not nodes.
This deterministic step removes the placement errors seen in the probe. For hover text, the LLM writes instance-specific 'why' text constrained by the catalog's purpose and use_when; default_why is the fallback.

3) International correctness. Default to ap-southeast-1 (Singapore). Never propose cn-* mainland regions for public websites without an ICP and China-site-account warning. Never propose the closed Sydney or Mumbai regions. Mark Qoder CN as China-only. Encode the Model Studio application-development restriction. Keep per-product international region lists for diagram products only, checked quarterly against each product's 'Supported regions' doc. Read Model Studio models live with GET /models using the user's key.

4) Maintenance pipeline. Run a weekly CI job with no more than about 10 polite requests and a human-reviewed PR as output. It should:
- diff the nav JSON at file-intl.alicdn.com (taxonomy and display names);
- diff /help/en/llms.txt (names, 'Deprecated' and 'EOL' markers, new entries);
- fetch the per-product llms.txt only for products that changed, at least 5 s apart, detecting the _____tmd_____ challenge and backing off;
- diff github.com/aliyun/aliyun-openapi-meta metadatas/products.json, which is Apache-2.0 (new or removed codes, regional endpoints);
- check the Terraform registry's alicloud version and, on a new release, diff its doc subcategories;
- open a manual checklist item to review the Service Notices list at alibabacloud.com/en/notice/intl/list for '[Product Change]' renames and retirements; there were 7 renames in the last 10 months.
Name precedence when sources disagree: newest notice, then nav, then llms.txt title, then OpenAPI name, then Terraform subcategory; keep all the others as aliases. Add CI tests that fail if outputs contain retired names (Tongyi Lingma, DCDN, Log Service, ApsaraDB for Redis, MNS, Serverless Workflow, HBR, Tracing Analysis, ASK, API Gateway (Classic) for new designs).

5) Legal. Get sign-off on the terms of use before any automated ingestion. Until then, the pipeline produces diffs only, and humans write the catalog text.

Working files for the build:
- seed list: C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/kb_seed.txt
- parsed international nav (180 products): C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/kb_nav_unique.txt
- OpenAPI endpoint summary: C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/kb_ep_compact.txt
- live llms.txt copy: C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/dl2/llms_en_live.txt
- 45 fetched sub-indexes: C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/dl2/llms_sub/
- mined lifecycle lines: C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/dl2/lifecycle_lines.txt

## Open questions

- Legal: does the user have Alibaba Cloud partner, employee or written permission to reuse help-center or llms.txt content? Without it, catalog text must stay hand-written and automation limited to change detection.
- Is Qwen Cloud (qwencloud.com, launched 2026-05-26) replacing the Model Studio brand outside mainland China, or running alongside it? This decides which name the LLM-platform node shows. Only third-party docs (LiteLLM) claim the brands were unified.
- Model Studio: will the application-development features (agent apps, workflow apps, knowledge base) reopen for new international accounts? Will the build need the workspace-dedicated endpoint now that the DashScope domain stopped getting new features after 2026-09-30? Both questions are for the Model Studio workstream.
- Qoder (international): who operates qoder.com? A prior-run search summary named a Singapore entity, but this is unverified. Is the Alibaba Cloud Marketplace listing the recommended purchase path for teams on the international site?
- Confirm the Netherlands region ID (eu-west-3 appears in the OpenAPI ECS endpoints) and whether 'US (Atlanta)' us-southeast-1 is a real or upcoming public region.
- Smart Access Gateway and ApsaraDB for HBase: no end-of-sale notice was found, but both look legacy. Should the catalog mark them 'legacy, avoid for new designs' (the seed list currently does)?
- Exact rename dates for Anti-DDoS Origin to Native and for Message Queue for Apache RocketMQ/Kafka to ApsaraMQ. Both renames are evidenced only by mixed naming in docs.
- Should the catalog cover China-site users at all? The user's key works only on dashscope-intl, so the recommendation is international-only with China items flagged.
- Which roughly 60 products need curated per-region international availability for v1? Proposal: everything with place in vpc, region or edge in the seed list.
