Review task. Read-only: do not edit or create files. Repository: C:/Users/mendo/ali_catalog.

Read research/ai-workflows/PLAN.md sections D9, D10, 3 (Workflow contract: types, Semantics, Ops) and 5 (Checks). Then read these six sample workflows in research/ai-workflows/usecases/*.json: support-email-triage, multilingual-marketing-localisation, sre-incident-triage-and-rca, sales-prospect-research-outreach, claims-processing-extraction, whatsapp-line-chat-agent.

For each sample:
1. Write it as a sequence of workflow ops in the plan's contract (step, link, each, splice as needed): every step with kind, task, effect, runs, product, ai (use ids from the model table in section 6), untrusted, join, repeat, on; every link with kind, outcome, max. Keep labels short.
2. Run the section 5 checks by hand on your graph and list which fire and whether each firing is right.
3. List anything the contract cannot express without contortions, anything ambiguous in the semantics text, and any rule in D9 or section 5 that gives a wrong answer for this workflow.

End with a short list: contract changes you consider necessary (with the sample that needs each), and ones that are nice to have. Be concrete and brief; do not restate the plan.
