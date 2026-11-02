# Round B warning sweep

All 32 canonical fixtures and 189 stored designs were passed through validation and checking.
Stored designs are checked unchanged; fixture graphs are built from validated ops.
The stored records are not repaired or rewritten. `validation` reports new op warnings; `checks` reports fresh graph findings.

Reasons: `wf-bad-op` in validation drops effects on kinds other than act/tool/memory.
`wf-attach-form` rejects control-flow links touching attached nodes, and `wf-unreachable` identifies routes that depended on those links.
`wf-approval` now examines effects on every kind, including memory. `wf-cycle` no longer exempts automated edits.
The HR fixture's invalid AI decide effect was removed, so its expected `wf-decision-review` also disappears.

Every changed fixture or stored design is listed below; unlisted designs have identical warnings.

| Fixture or stored design/run/turn | Warning delta |
| --- | --- |
| hr-resume-screening-and-scheduling.json | checks ?wf-decision-review (s3) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-code-review-pr-agent#1/0 | validation +wf-bad-op (Effect on 'pr-trigger' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-cross-border-document-compliance-check#1/0 | validation +wf-bad-op (Effect on 'upload-trigger' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-employee-onboarding-helpdesk#1/0 | validation +wf-bad-op (Effect on 'retrieve' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-hr-resume-screening-and-scheduling#1/0 | validation +wf-bad-op (Effect on 'parse-cv' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-it-helpdesk-triage-and-remediation#1/0 | validation +wf-bad-op (Effect on 'retrieve' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-nl-to-sql-data-analysis#1/0 | validation +wf-bad-op (Effect on 'sql-agent' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-regulatory-change-monitoring#1/0 | validation +wf-bad-op (Effect on 'fetch' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-rule-knowledge-base#1/0 | validation +wf-bad-op (Effect on 'embed' was dropped; only act, tool and memory steps carry effects.); validation +wf-bad-op (Effect on 'retrieve' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-rule-slack#1/0 | validation +wf-bad-op (Effect on 'embed' was dropped; only act, tool and memory steps carry effects.); validation +wf-bad-op (Effect on 'retrieve' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-rule-whatsapp#1/0 | validation +wf-attach-form (decide-lookup); validation +wf-attach-form (lookup-draft); checks +wf-attach-form (decide-lookup); checks +wf-attach-form (lookup-draft); checks +wf-unreachable (draft); checks +wf-unreachable (end-reply); checks +wf-unreachable (out-guard); checks +wf-unreachable (reply) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-employee-onboarding-helpdesk#2/0 | validation +wf-bad-op (Effect on 'embed-query' was dropped; only act, tool and memory steps carry effects.); validation +wf-bad-op (Effect on 'search-handbook' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-invoice-three-way-match#2/0 | validation +wf-attach-form (agent-draft); validation +wf-attach-form (draft-approve); validation +wf-attach-form (approve-edit) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-it-helpdesk-triage-and-remediation#2/0 | validation +wf-bad-op (Effect on 'retrieve' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-kyc-customer-onboarding#2/0 | validation +wf-bad-op (Effect on 'sanctions-screen' was dropped; only act, tool and memory steps carry effects.); validation +wf-bad-op (Effect on 'risk-decide' was dropped; only act, tool and memory steps carry effects.); checks +wf-approval (risk-decide) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-regulatory-change-monitoring#2/0 | validation +wf-bad-op (Effect on 'fetch-feeds' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-rule-knowledge-base#2/0 | validation +wf-bad-op (Effect on 'embed-query' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-rule-email#2/0 | validation +wf-bad-op (Effect on 'in' was dropped; only act, tool and memory steps carry effects.); validation +wf-bad-op (Effect on 'embed' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-support-email-triage#2/0 | validation +wf-bad-op (Effect on 'embed' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-travel-itinerary-booking#2/0 | validation +wf-bad-op (Effect on 'flight-search' was dropped; only act, tool and memory steps carry effects.); validation +wf-bad-op (Effect on 'hotel-search' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-code-review-pr-agent#3/0 | validation +wf-bad-op (Effect on 'pr-trigger' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-ecommerce-product-listing-enrichment#3/0 | validation +wf-bad-op (Effect on 'in' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-ecommerce-shopping-assistant#3/0 | validation +wf-bad-op (Effect on 'search-catalog' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-enterprise-knowledge-search#3/0 | validation +wf-bad-op (Effect on 'retrieve' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-financial-report-analysis#3/0 | validation +wf-bad-op (Effect on 'pdf-in' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-inbound-support-triage-and-draft#3/0 | validation +wf-bad-op (Effect on 'fetch-tracking' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-regulatory-change-monitoring#3/0 | validation +wf-bad-op (Effect on 'retrieve-policies' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-rfp-security-questionnaire-answerer#3/0 | validation +wf-bad-op (Effect on 'embed-query' was dropped; only act, tool and memory steps carry effects.); validation +wf-bad-op (Effect on 'retrieve-policy' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-rule-knowledge-base#3/0 | validation +wf-bad-op (Effect on 'embed-query' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-rule-phone#3/0 | validation +wf-attach-form (agent-handoff); validation +wf-attach-form (handoff-end) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-rule-slack#3/0 | validation +wf-bad-op (Effect on 'embed' was dropped; only act, tool and memory steps carry effects.); validation +wf-bad-op (Effect on 'retrieve' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-rule-whatsapp#3/0 | validation +wf-bad-op (Effect on 'whatsapp-in' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-27-17-workflow-tuned-2/wf-social-listening-review-analysis#3/0 | validation +wf-bad-op (Effect on 'cluster' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-50-56-workflow-i18n-2/wf-ko-it-helpdesk-triage-and-remediation#1/0 | validation +wf-bad-op (Effect on 'retrieve' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-50-56-workflow-i18n-2/wf-ko-internal-policy-rag-assistant#1/0 | validation +wf-bad-op (Effect on 'embed' was dropped; only act, tool and memory steps carry effects.); validation +wf-bad-op (Effect on 'search' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-50-56-workflow-i18n-2/wf-ko-multilingual-marketing-localisation#1/0 | validation +wf-bad-op (Edit outcome on 'review-edit' was dropped; it must leave a human approve step.); checks +wf-bad-op (review-edit); checks +wf-cycle (review-edit) |
| 2026-11-02T16-50-56-workflow-i18n-2/wf-zh-internal-policy-rag-assistant#1/0 | validation +wf-bad-op (Effect on 'embed-query' was dropped; only act, tool and memory steps carry effects.); validation +wf-bad-op (Effect on 'search-policy' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-50-56-workflow-i18n-2/wf-zh-it-helpdesk-triage-and-remediation#1/0 | validation +wf-bad-op (Effect on 'retrieve-kb' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-50-56-workflow-i18n-2/wf-zh-kyc-customer-onboarding#1/0 | validation +wf-bad-op (Effect on 'verify-id' was dropped; only act, tool and memory steps carry effects.); validation +wf-bad-op (Effect on 'sanction-screen' was dropped; only act, tool and memory steps carry effects.); validation +wf-bad-op (Effect on 'risk-decide' was dropped; only act, tool and memory steps carry effects.); checks +wf-approval (risk-decide) |
| 2026-11-02T16-50-56-workflow-i18n-2/wf-ko-kyc-customer-onboarding#2/0 | validation +wf-bad-op (Effect on 'verify-id' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-50-56-workflow-i18n-2/wf-zh-claims-processing-extraction#2/0 | validation +wf-bad-op (Effect on 'embed-query' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-50-56-workflow-i18n-2/wf-zh-it-helpdesk-triage-and-remediation#2/0 | validation +wf-bad-op (Effect on 'retrieve-kb' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-50-56-workflow-i18n-2/wf-zh-kyc-customer-onboarding#2/0 | validation +wf-bad-op (Effect on 'screen-sanctions' was dropped; only act, tool and memory steps carry effects.); validation +wf-bad-op (Effect on 'assess-risk' was dropped; only act, tool and memory steps carry effects.); checks +wf-approval (assess-risk) |
| 2026-11-02T16-50-56-workflow-i18n-2/wf-ko-internal-policy-rag-assistant#3/0 | validation +wf-bad-op (Effect on 'retrieve' was dropped; only act, tool and memory steps carry effects.) |
| 2026-11-02T16-50-56-workflow-i18n-2/wf-zh-it-helpdesk-triage-and-remediation#3/0 | validation +wf-bad-op (Effect on 'search-kb' was dropped; only act, tool and memory steps carry effects.); validation +wf-attach-form (agent-classify); validation +wf-attach-form (agent-search); validation +wf-attach-form (search-rerank); validation +wf-attach-form (agent-sandbox); validation +wf-attach-form (approve-edit); checks +wf-attach-form (agent-sandbox); checks +wf-attach-form (agent-search); checks +wf-attach-form (approve-edit); checks +wf-attach-form (search-rerank) |
