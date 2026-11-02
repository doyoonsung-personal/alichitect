The six sketches are representable as graphs, but **passing section 5 does not establish correct approval, data-flow safety, or repeat execution**. Those are the main contract gaps.

The notation below is compact op notation, not proposed new syntax. No files were changed.

**Reading the ops**

Each `S` row expands to a `step` op with these fields:

```text
S id "label" kind task effect product ai [overrides]
```

Defaults, applied to **every row**:

```text
runs=fc; untrusted=false; join=all; repeat=omitted; on=omitted
task/effect/product/ai shown as "-" are omitted, not null.
human: runs=customer
end: runs=omitted
```

Model abbreviations expand to exact section 6 IDs:

```text
F = qwen3.8-flash
P = qwen3.7-plus
M = qwen3.8-max
O = qwen-vl-ocr
E = text-embedding-v4
R = qwen3-rerank
```

Link notation expands as follows; each occurrence gets a unique `l1`, `l2`, … ID within its graph:

```text
A > B > C             two links: kind=next, outcome/max omitted
B(A,B,"condition")     kind=branch, outcome/max omitted
H(A,B,approve|reject)  kind=branch, outcome=that value, max omitted
L(A,B,"condition",n)   kind=loop, outcome omitted, max=n
X(A,B)                kind=escalate, outcome=exhausted, max omitted
```

Other link labels and outcomes are written explicitly. All steps precede their links. No `splice` is needed.

**Common checking assumptions:** Singapore, new international account, no avoid constraints, no deployment document, no automation overrides. External integrations with no catalog equivalent use `runs=customer` and omit `product`. Guard services have no separate `ai`; explicit evaluator calls do. Retrieval embeddings and reranking are separate billable steps.

### 1. Support email triage

I follow the sample’s **ask and human gate: approve drafts before sending**. Its contradictory “auto-send” branch is discussed below.

```text
S in    "Email"       trigger   -          -      eventbridge   - untrusted=true
S guard "Screen"     guard     -          -      ai-guardrails -
S route "Intent"     ai        classify   -      model-studio  F
S kb    "Help"       knowledge retrieve   -      tablestore    E
S rank  "Rank"       ai        rerank     -      model-studio  R
S draft "Draft"      ai        generate   -      model-studio  F
S check "Evidence"   ai        check      -      model-studio  P
S gate  "Quality"    decide    -          -      -             -
S human "Review"     human     approve    -      -             -
S manual "Resolve"   human     review     -      -             -
S send  "Send"       act       -          reply  direct-mail   -
S log   "Trace"      act       -          write  tablestore    -
S end   "Done"       end       -          -      -             -

in > guard > route > kb > rank > draft > check > gate
B(gate,human,"grounded")
L(gate,draft,"revise",2)
X(gate,manual)
H(human,send,approve)
H(human,log,reject)
manual > log
send > log > end
```

**Checks by hand**

- No listed structural or feasibility check fires under the stated assumptions.
- `wf-approval` correctly stays quiet: `reply` does not require approval under D9, although this workflow explicitly includes it.
- `wf-loop-exit` stays quiet: `max=2`, with an exhausted route.
- `wf-trifecta` stays quiet. The actual send path includes approval; that is reasonable here.
- Deployment checks are not applicable.

**Gaps and wrong answers**

- **D9 conflicts with the plan’s later email example.** This is a response in a user-started conversation, so its effect is `reply`, even though the transport is email. Calling it `send` merely to force approval contradicts D9’s definition.
- The sample’s automatic route conflicts with its requested approval. Adding `B(gate,send,"routine")` would bypass the requested gate yet trigger **no approval warning** with `effect=reply`. The contract needs a workflow-specific approval requirement, not just effect defaults.
- Literally, `human` approves the immediately preceding `gate` output, not `draft`. Passing the draft through `check` and `gate` is an unstated data-flow convention.
- Mixed `branch`, `loop`, and `exhausted` edges need explicit exclusivity and precedence rules. Labels alone do not define them.

### 2. Multilingual marketing localisation

Five locales share one repeat group. I add a **provisional three-refinement bound**: the sample’s “until CTR exceeds baseline” is otherwise unbounded.

```text
{t:each,id:locales,over:"five APAC locales"}

S in     "Brief"       trigger   -          -       eventbridge   -
S type   "Audience"    ai        classify   -       model-studio  F
S brand  "Brand rules" knowledge retrieve   -       dashvector    E
S rank   "Rank"        ai        rerank     -       model-studio  R
S master "Master"      ai        generate   -       model-studio  P
S screen "Claims"      ai        check      -       model-studio  P
S legal  "Brand review" human    approve    -       -             -
S tr     "Translate"   ai        translate  -       model-studio  F repeat=locales
S adapt  "Adapt"       ai        generate   -       model-studio  P repeat=locales
S local  "Local check" ai        check      -       model-studio  P repeat=locales
S review "Market review" human  approve    -       -             - repeat=locales
S pub    "Publish"     act       -          publish -             - repeat=locales runs=customer
S stats  "Results"     tool      -          read    -             - repeat=locales runs=customer
S goal   "Target"      decide    -          -       -             - repeat=locales
S revise "Revise"      ai        generate   -       model-studio  P repeat=locales
S stop   "Manual review" human  review     -       -             - repeat=locales
S done   "Locale done" end       -          -       -             - repeat=locales
S cancel "Cancelled"   end       -          -       -             -

in > type > brand > rank > master > screen > legal
H(legal,tr,approve)
H(legal,cancel,reject)
tr > adapt > local > review
H(review,pub,approve)
H(review,done,reject)
pub > stats > goal
B(goal,done,"target met")
L(goal,revise,"below target",3)
revise > local
X(goal,stop)
stop > done
```

**Checks by hand**

- No listed check fires.
- `wf-approval` stays quiet because every publication path passes an approval. Correct for this graph’s intended per-locale execution.
- Both approval steps have required outcomes; the refinement cycle has a bound and exhausted route.
- `wf-ai-missing`, region and mismatch checks stay quiet using the plan’s translation model rather than the sample’s absent Qwen-MT IDs.

**Gaps and wrong answers**

- `repeat` does not specify whether the five locales run concurrently, how group entry expands execution, or whether a loop counter belongs to each locale.
- There is no typed wait/window for collecting CTR/CVR. `stats` hides an asynchronous observation period in a label.
- The graph deliberately ends each locale independently. “Campaign finished after all five locales finish” lacks defined group-exit aggregation, especially when some reject and others publish.
- **Approval false negative:** removing `review` and connecting `local` directly to `pub` still passes `wf-approval`, because upstream `legal` disconnects the whole downstream graph when removed. Master approval incorrectly covers changed translations.
- The immediate-predecessor rule also makes `legal` approve a check result and `review` approve a local-check result unless those steps implicitly forward the reviewed asset.
- Section 5 has no check for the sample’s requested locale disclosure/review requirements.

### 3. SRE incident triage and RCA

The hypothesis agent chooses targeted read tools; initial collection is deterministic parallel work. Ten agent requests are a provisional bound because the sketch gives only a budget concept.

```text
S in      "Alert"     trigger   -          -      eventbridge  -
S triage  "Severity"  ai        classify   -      model-studio F
S page    "Page"      act       -          notify -            - runs=customer
S metrics "Metrics"   tool      -          read   -            - runs=customer
S logs    "Logs"      tool      -          read   -            - runs=customer untrusted=true
S traces  "Traces"    tool      -          read   -            - runs=customer untrusted=true
S extract "Evidence"  ai        extract    -      model-studio F join=all
S changes "Changes"   knowledge retrieve   -      tablestore   E
S rank    "Rank"      ai        rerank     -      model-studio R
S rca     "Hypotheses" agent    plan       -      model-studio M runs=agentrun turns=10
S query   "Query"     tool      -          read   -            - runs=customer untrusted=true on=rca
S enough  "Confidence" decide   -          -      -            -
S manual  "Investigate" human  review     -      -            -
S report  "RCA"       ai        generate   -      model-studio P
S plan    "Rollback"  ai        plan       -      model-studio M
S approve "On-call"   human     approve    -      -            -
S apply   "Apply"     act       -          admin  -            - runs=customer
S save    "Write-back" act      -          write  tablestore   -
S notify  "Notify"    act       -          notify direct-mail  -
S end     "Done"      end       -          -      -            -

in > triage > page
page > metrics
page > logs
page > traces
metrics > extract
logs > extract
traces > extract
extract > changes > rank > rca > enough
B(enough,report,"sufficient")
link enough→manual: kind=escalate, label="insufficient or budget spent",
                    outcome=exhausted, max=omitted
manual > report
report > plan > approve
H(approve,apply,approve)
H(approve,save,reject)
apply > save > notify > end
```

**Checks by hand**

- No listed check fires.
- `wf-agent-turns` and `wf-attach-form` correctly stay quiet.
- `wf-approval` correctly accepts `apply`; removing `approve` makes it unreachable.
- `wf-trifecta` stays quiet for the approved production change.
- Internal paging and post-incident notification correctly need no D9 approval.

**Gaps and wrong answers**

- `turns` bounds model requests but does not define a distinct agent-budget-exhaustion result. The outgoing condition above is a convention.
- D10 permits agent-chosen queries but cannot specify a required sequence of “hypothesis → query → observation → verification” inside the agent. Moving these inline changes who controls the sequence.
- `join=all` works for the initial three-way fork, but correlation of join arrivals across retries or overlapping runs is unspecified.
- `notify` versus `send` depends on recipients, which are absent from the contract. I assumed internal recipients.
- If the same agent also had an attached rollback tool, approval before the agent would concern an earlier artifact; approval after it would be too late. D10’s attached-tool effect propagation detects a risk but offers no faithful tool-call approval boundary.

### 4. Sales prospect research and outreach

I retain the sketch’s `agentloop` dependency to expose its Singapore feasibility issue. Firmographics and web content are untrusted; the answer library is treated as private.

```text
S in      "Lead"       trigger   -          -     eventbridge   - untrusted=true
S dedupe  "Dedupe"     tool      -          read  -             - runs=customer
S fresh   "New lead"   decide    -          -     -             -
S mask    "Mask"       guard     -          -     ai-guardrails -
S enrich  "Enrich"     tool      -          read  -             - runs=customer untrusted=true
S research "Research" agent     plan       -     model-studio  M runs=agentrun turns=6
S site    "Site"       tool      -          read  -             - runs=customer untrusted=true on=research
S news    "News"       tool      -          read  -             - runs=customer untrusted=true on=research
S cases   "Cases"      knowledge retrieve  -     dashvector    E
S rank    "Rank"       ai        rerank    -     model-studio  R
S fit     "Fit"        ai        classify  -     model-studio  F
S eval    "Rubric"     ai        check     -     model-studio  P
S quality "Quality"   decide    -          -     agentloop     -
S manual  "Research review" human review  -     -             -
S draft   "Email set"  ai        generate  -     model-studio  P
S screen  "Screen"     guard     -          -     ai-guardrails -
S approve "Seller"     human     approve   -     -             -
S send    "Send first" act       -          send  direct-mail   -
S save    "CRM update" act       -          write -             - runs=customer
S memory  "Save research" memory -          -     tablestore    -
S end     "Done"       end       -          -     -             -

in > dedupe > fresh
B(fresh,end,"duplicate")
B(fresh,mask,"new")
mask > enrich > research > cases > rank > fit > eval > quality
B(quality,draft,"passes")
L(quality,research,"insufficient",1)
X(quality,manual)
manual > draft > screen > approve
H(approve,send,approve)
H(approve,end,reject)
send > save > memory > end
```

**Checks by hand**

- **Reused product region check: warning for `agentloop` in Singapore. Right:** section 6 says availability is not established. This is not `wf-ai-region`, which concerns models.
- All structural checks stay quiet.
- `wf-approval` and `wf-trifecta` stay quiet because every send path includes seller approval. Reasonable given the intended approval scope.
- `wf-gated-product` should **not** fire for AgentLoop merely because Singapore is uncertain; that is a different rule.

**Gaps and wrong answers**

- Attached site/news tools mean the agent **may** choose them. They do not express the sample’s requirement to research both in parallel. Required parallel searches must be inline.
- The approval’s immediate predecessor is a guard. The actual email set needs an explicit approval subject.
- The first email is sent; follow-ups are drafted only. Sending them later needs delays, response-triggered cancellation, and approval expiry/revalidation, none of which is typed.
- A memory write has no required effect, while the CRM write does. Whether `memory` reads or writes is left to its label.
- There is no private/public flag for `cases`, and no data edges from attached tools. The trifecta algorithm cannot derive its stated inputs reliably.

### 5. Claims processing and extraction

I split the sketch’s combined “payment or denial letter” into distinct effects. A proposed denial is model output; **committing** the denial is `effect=decide`.

The graph uses section 6’s `qwen-vl-ocr`, overriding the sample’s contradictory OCR trap. Uploaded files are processed together here; per-file retry would need a repeat group.

```text
S in      "Claim"      trigger   -          -      eventbridge         - untrusted=true
S mask    "Mask files" tool      -          write  data-security-center -
S ocr     "Extract"    ai        extract    -      model-studio        O
S valid   "Validate"   ai        check      -      model-studio        F
S quality "OCR quality" decide  -          -      -                   -
S manual  "Manual entry" human review     -      -                   -
S policy  "Parse policy" ai     extract    -      model-studio        P
S cover   "Coverage"   knowledge retrieve  -      tablestore          E
S rank    "Rank"       ai        rerank    -      model-studio        R
S assess  "Assess"     ai        plan      -      model-studio        M
S packet  "Decision packet" ai  generate  -      model-studio        P
S approve "Adjuster"   human     approve   -      -                   -
S route   "Disposition" decide  -          -      -                   -
S pay     "Pay"        act       -          pay    -                   - runs=customer
S deny    "Record denial" act   -          decide -                   - runs=customer
S letter  "Send denial" act     -          send   direct-mail         -
S audit   "Audit"      act       -          write  tablestore          -
S close   "Close"      act       -          write  -                   - runs=customer
S end     "Done"       end       -          -      -                   -

in > mask > ocr > valid > quality
B(quality,policy,"valid")
L(quality,ocr,"low confidence",3)
X(quality,manual)
manual > policy > cover > rank > assess > packet > approve
H(approve,route,approve)
H(approve,audit,reject)
B(route,pay,"approved payout")
B(route,deny,"approved denial")
pay > audit
deny > letter > audit > close > end
```

**Checks by hand**

- No listed workflow check fires.
- `wf-approval` accepts `pay`, `deny`, and `letter`: all are disconnected by removing `approve`. Right **only if** the reviewed packet contains the exact disposition, amount, recipient and letter.
- `wf-human-outcomes` and `wf-loop-exit` correctly stay quiet.
- `wf-ai-mismatch` stays quiet for OCR using the model table.
- Product existence does not establish that Data Security Center can perform the depicted inline file transformation; section 5 has no adequate capability check for that assumption.

**Gaps and wrong answers**

- `effect=decide` distinguishes committing a decision from merely proposing it, but this distinction should be explicit in the semantics.
- One approval covers several artifacts/actions only by convention. There is no representation of exactly what the adjuster authorized.
- D9 promises review flags for consequential decisions, but section 5 contains **no corresponding check**. This approved denial graph receives no such advisory.
- The masking step’s output and its relationship to the original upload cannot be represented. Control order alone cannot establish that only masked data reaches OCR.
- Retrying identical OCR input does not define how extraction improves. Crop, rotation, model escalation or manual correction requires explicit data/version semantics.
- Per-document retries followed by claim-level assessment need item aggregation semantics that `repeat` does not supply.

### 6. WhatsApp/LINE chat agent

I model **one inbound message per run**, with conversation state spanning runs. This avoids inventing a finite bound for a customer conversation.

The unspecified “act” branch hands off; it does not silently acquire a financial or administrative permission.

```text
S in      "Message"    trigger   -          -      chatapp       - untrusted=true
S memory  "History"    memory    -          -      tablestore    -
S intent  "Intent"     ai        classify   -      model-studio  F
S kb      "Help"       knowledge retrieve   -      tablestore    E
S order   "Order"      tool      -          read   -             - runs=customer
S rank    "Rank"       ai        rerank     -      model-studio  R
S draft   "Reply"      ai        generate   -      model-studio  F
S guard   "Screen"     guard     -          -      ai-guardrails -
S plan    "Route advice" ai     plan       -      model-studio  P
S route   "Route"      decide    -          -      -             -
S human   "Handoff"    human     takeover   -      -             -
S reply   "Send reply" act       -          reply  chatapp       -
S save    "Save turn"  act       -          write  tablestore    -
S end     "Done"       end       -          -      -             -

in > memory > intent > kb > order > rank > draft > guard > plan > route
B(route,reply,"safe answer")
link route→human: kind=escalate, label="stuck, blocked, or action needed",
                  outcome/max omitted
reply > save
human > save > end
```

**Checks by hand**

- No listed check fires.
- `wf-approval` correctly stays quiet for ordinary replies.
- `wf-human-outcomes` correctly does not demand approve/reject outcomes from `takeover`.
- `wf-trifecta` stays quiet because `reply` is not an approval-requiring effect. **That is a false negative:** inbound untrusted content, private conversation/order information, and outbound communication coexist.
- No loop checks fire because a subsequent message starts another run.

**Gaps and wrong answers**

- D9 requires a guard and human escalation for replies, but section 5 has no check enforcing either. Deleting both controls would still pass its approval policy checks.
- The contract cannot express “human now owns this conversation; suppress future bot responses.” A takeover node alone does not define cross-run ownership.
- The sample’s streaming scan cannot be faithfully represented by a simple guard-before-send chain. That chain describes buffered output; chunk release and cancellation are absent.
- Branch and escalation exclusivity is unspecified. The intended interpretation here is one route only.
- Using an explicit bounded conversational loop would change the sample’s meaning; per-message runs need documented session semantics instead.

**Necessary changes**

- **Approval scope and freshness:** bind approval to artifact/version and authorized actions; validate approved outcomes, not just removed-node reachability. Needed by **marketing, claims, sales, support**, and attached SRE actions.
- **Workflow-specific approval requirements and reply policy:** preserve requested approval independently of effect defaults; enforce guard/escalation requirements; classify email by conversation context. Needed by **support and chat**.
- **Minimal data-flow/trust metadata:** represent private data, artifact propagation and egress independently of approval requirements. Fix trifecta detection for `reply`. Needed by **chat, sales, claims**.
- **Execution semantics:** define mixed-edge selection, retry-count meaning, per-item loop counters, repeat entry/exit and join correlation. Needed by **marketing, support, claims and SRE**.
- **Session/wait semantics:** represent ownership after takeover and asynchronous feedback or scheduled follow-ups. Needed by **chat, marketing and sales**.
- **Complete promised checks:** consequential-decision advisory and service capability validation. Needed by **claims**.
- **Safe `splice`:** preserve branch conditions, approval outcomes and loop bounds, or reject non-`next` targets. Its current unconditional replacement with two `next` links would corrupt approval and retry edges in these workflows.

**Nice to have**

- Typed approval packets and reusable review/retry patterns — **claims, marketing, support**.
- Explicit agent completion/budget-exhaustion ports and required-versus-optional tools — **SRE, sales**.
- Streaming release/cancellation semantics — **chat**, if streaming is in scope.
- First-class scheduled follow-up sequences and campaign metrics windows — **sales, marketing**.

Codex session ID: 01a19bed-01c6-7de3-9357-bf3b11fc64ba
Resume in Codex: codex resume 01a19bed-01c6-7de3-9357-bf3b11fc64ba
