# Workflow evaluation cases

Run offline checks from the repository root:

```sh
node eval/check-cases.ts
node eval/run.ts --dry --cases-dir eval/cases-workflow
node --test eval/test/workflow.test.ts
```

The 32 `wf-<fixture-id>` cases preserve each canonical fixture's English ask. The
11 `wf-rule-*` cases cover product gates, inbound channels, the lethal trifecta,
reversible automation, and paired chat/email approval policies. References identify
the canonical source. Tests validate every source graph and score it against its case.

Expectations deliberately omit optional persistence, exact step counts, node IDs,
edge topology, and incidental runtime choices. Required kinds and tasks describe
capabilities requested by the user. All canonical cases require Model Studio;
WhatsApp also requires Chat App Message Service. A task can be implemented by an
AI step or an agent. Tier requirements are explicit only where the task warrants a
hard constraint (the small-model ticket classifier); other tier choices are judged.

`expect.workflow` accepts:

- `kinds`, `tasks`, `effects`: each listed value must occur.
- `tiers`: task to allowed tier array (`small`, `mid`, `large`). Every step of that
  task must name a model of an allowed tier, and the task must exist.
- `products`, `runtimes`: arrays of any-of groups, matched separately against
  `product` and `runs`. Runtime groups can include `customer`.
- `forbiddenProducts`: checked against both service and runtime fields.
- `forbiddenKinds`, `forbiddenTasks`: used to catch unnecessary approval.
- `approvals`, `boundedLoops`, `international`: default true.
- `noWarnings`: named workflow findings that must be absent in the final graph.

Approval and loop assertions rerun the production `checkWorkflow` on the repaired
workflow. Any `wf-approval` finding fails, including an informational waiver; cases
intentionally testing a waiver can disable `approvals`. Loops must have bounds and
exhausted exits, and agents must have numeric turn limits. International checks
reject unknown, China-only, restricted, legacy, retired and closed products. The
usual `noErrors` setting also checks fresh core findings and stored post-repair errors.

AgentRun's code runtime is available even though its low-code builder is gated.
Its rule case therefore requires a usable runtime and an explanation of the gate,
with product correctness also evaluated by the judge. It does not ban AgentRun.
Channel wording and product-subfeature distinctions are checked in narration and by
the judge, because the workflow contract has no dedicated connector/subfeature field.

Records store mode, before/after workflows, workflow settings and estimate inputs.
Older records without mode remain cloud records. Workflow bases use a `workflow`
graph beside the optional cloud `graph`, with optional `workflowSettings` and
`estimate`. Rescoring preserves the stored graph (no second repair), reruns the
checks, and retains `runs.orig.jsonl` as the original scoring source. Supply
`--cases-dir` when rescoring a directory whose metadata does not record it.

The workflow judge scores pattern choice, human approval, model tier fit,
international product correctness and clarity separately. Scores are retained under
`scores.workflow` and reported in summary JSON/Markdown. Compatibility fields map
pattern to completeness, product correctness to accuracy, the rounded mean of
approval/tier fit to rationality, and clarity to readability, so existing comparison
tools continue working. Cloud rubric text and parsing remain unchanged.
