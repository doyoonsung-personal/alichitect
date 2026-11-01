# Claude as primary: 30 conversations, 43 turns (Qwen baseline: 90 conversations, 129 turns of the same cases, 2026-10-31T18-06-03-p1b-final-full)

| model | conv pass | turn pass | first op ms p50 / p90 | main stream ms p50 / p90 | turn ms p50 / p90 | cost per turn | output tokens per turn |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude-opus-5-5 (effort low) | 93% (28/30) | 95% (41/43) | 2577 / 5816 | 9318 / 17972 | 9321 / 17975 | $0.0328 | 1214 |
| qwen3.8-max | 91% (82/90) | 94% (121/129) | 1918 / 2470 | 8320 / 19045 | 8322 / 19047 | $0.0085 | 562 |

total Claude cost $1.4115 over 43 turns; cache share of prompt tokens: mean 97%

op-format: bad lines Claude 0 vs Qwen 0; format-assertion failures 0 vs 0; \u escapes 0 vs 0; turns needing a follow-up (repair/continue) 0/43 vs 0/129
language adherence (sayLang/whyLang/askLang failures): Claude 0 vs Qwen 1
asks: Claude 38 questions in 25 turns, 70 assumptions in 32 turns; Qwen (3 runs, divide by 3) 122 in 68 turns, 170 in 93 turns
backup stats: 43 whole-turn runs, ok 43, refusals 0; api errors 0

## Pre-repair warnings by code (turns)

| code | Claude | Qwen (3 runs) |
| --- | ---: | ---: |
| orphan-node | 9 | 17 |
| containment | 4 | 8 |
| constraint-region | 2 | 9 |
| attach-host-missing | 0 | 6 |
| unknown-id | 0 | 11 |
| missing-group | 0 | 1 |

## Assertions

| assertion | Claude | Qwen (same cases) |
| --- | ---: | ---: |
| askLang | 6/6 | 17/18 |
| askOptions | 5/5 | 15/15 |
| asks | 6/6 | 18/18 |
| assumes | 1/1 | 3/3 |
| attach | 2/2 | 6/6 |
| attachValid | 43/43 | 129/129 |
| chips | 0/1 | 3/3 |
| editMinimal | 10/10 | 30/30 |
| escapes | 43/43 | 129/129 |
| exclude | 15/15 | 43/45 |
| format | 43/43 | 129/129 |
| include | 52/52 | 153/156 |
| linked | 2/2 | 6/6 |
| noErrors | 43/43 | 129/129 |
| noPrices | 43/43 | 129/129 |
| noWarn | 3/3 | 9/9 |
| pathOrder | 37/37 | 114/114 |
| pins | 1/1 | 3/3 |
| placement | 1/1 | 3/3 |
| primaryRec | 5/5 | 12/15 |
| question | 1/1 | 3/3 |
| reask | 4/4 | 12/12 |
| region | 12/12 | 36/36 |
| req | 6/6 | 18/18 |
| residency | 6/6 | 18/18 |
| residencyScan | 5/6 | 18/18 |
| restore | 1/1 | 3/3 |
| retention | 17/17 | 51/51 |
| sayLang | 43/43 | 129/129 |
| scope | 4/4 | 12/12 |
| size | 15/15 | 45/45 |
| whyLang | 9/9 | 27/27 |
| zones | 1/1 | 3/3 |

## Failing conversations

- ai-07-training-residency#1
    turn 2 residencyScan: say : Hong Kong in "AgentLoop runs only in Hong Kong, so I'll use ARMS for tracing and keep answer …"; say : Hong Kong in "Managed LLM answer evaluation in Singapore: AgentLoop offers LLM judges but
- as-05-flip-internal#1
    turn 2 chips: chips: Public-facing store, new build; Moderate budget, two-zone high availability

cost per turn: min $0.0086, p50 $0.0318, p90 $0.0477, max $0.0745
stop reasons: end_turn 43
