Implemented [32 fixtures](C:/Users/mendo/ali_catalog/packages/core/test/fixtures/workflows) and [workflow-samples.test.ts](C:/Users/mendo/ali_catalog/packages/core/test/workflow-samples.test.ts). Only the permitted paths were edited; no commit.

- **Counts:** 8 fixtures per source file; 537 nodes, 628 links, 4 repeat groups. Largest fixture: 22 nodes / 28 links.
- **Expectations:** 28 empty; four expect `wf-decision-review`: HR screening, KYC, and both claims workflows.
- **Checker issues:** none identified through source review; no TODO tests currently.
- **Execution:** Node, tests, and TypeScript were **not run**, as instructed. Passing status remains unverified.

The test validates and applies every op with one context per sample, ends the turn, repairs the graph, and checks exact final code sets, error severity, invalid references/ops, and caps. It also checks coverage against all 32 source sketches.

Cross-check differences:

| Sample | Differences from `contract-walk.md` |
|---|---|
| All six | Reranking uses `knowledge`; explicit approval subjects and applicable edit routes added; sensitive inputs marked private/untrusted. Labels shortened to the validator’s 40-character limit. Redundant default joins omitted. |
| Support email | Email effect is `send`; reviewer can return the draft for editing. |
| Marketing | Locale group explicitly parallel; edits return to master/local generation. Performance revisions pass through adaptation before local review, keeping the approval subject consistent. |
| SRE | Evidence and change records marked private; mitigation approval names the plan and supports editing. Parallel collection and `join: all` retained. |
| Sales | Required site/news research moved from optional attachments into parallel inline tools with a join. Retry repeats enrichment/search. AgentLoop retained; no unsupported region warning invented. |
| Claims | Unestablished DSC file transformation replaced with a customer redaction service. Explicit packet approval/editing added; committed denial expects the decision-review advisory. |
| WhatsApp/LINE | Private conversation/order data marked explicitly. Customer-operated takeover and one-message-per-run scope retained; no AgentCore channel assumption. |

Material sketch corrections include:

- **Claims:** separate payouts, committed denials, and letters; FNOL adds bounded evidence requests and approval after translation.
- **HR/KYC:** approval covers newly generated invitations/status messages; consequential decisions carry explicit effects. KYC conservatively reviews every account decision.
- **Localisation/listings/RFP:** explicit repeat groups; document localisation conservatively reviews every locale.
- **Voice/chat/tutor/onboarding:** persisted state separates conversational runs; partner inbound voice replaces the telephony assumption; administrative fulfilment requires approval. Tutor conservatively reviews each hint.
- **IT/travel/PR/SRE:** sandbox work is separated from privileged execution; required searches and specialist reviews use parallel paths and joins.
- **Invoice:** explicit PO/receipt retrieval and deterministic three-way matching preserve the exact-match posting route.
- **SQL/financial analysis:** deterministic execution and arithmetic remain separate from model analysis.
- **Regulatory/disruption monitoring:** recurring events use persisted state rather than unbounded in-run loops.
- **Shopping:** customer personalization replaces unavailable AIREC.
- **Meeting notes:** CRM changes and follow-up email have separate approvals.

Across the fixtures, actions formerly hidden in terminal nodes now have explicit effects, and model-backed tasks use catalog model IDs.

Codex session ID: 01a19c74-109e-7dc3-9f82-7c359252e237
Resume in Codex: codex resume 01a19c74-109e-7dc3-9f82-7c359252e237
