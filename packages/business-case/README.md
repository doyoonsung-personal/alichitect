# Business-case calculation module

This package is pure TypeScript with no platform, storage, model, browser, core architecture or BD dependency. The host supplies a bounded source snapshot and customer-entered assumptions. It must display the source age and prompt for an explicit refresh when the design or estimate changes.

`validateDocument` canonicalizes and copies boundary data. All money uses USD; `null` means unknown. Missing input fields, non-finite or negative numbers, duplicate scenarios, unreasonable bounds, and stale source prices are rejected. A current estimate can still contain unknown amounts. Cost overrides require a reason. Source fingerprints are opaque comparison values, not proof that customer-entered data is correct.

`defaultInputs` provides three **illustrative hypotheses** for efficiency, not savings forecasts: conservative, expected and optimistic. Actual financial inputs start unknown. Cash realization and additional benefit start at explicit zero: staff time released is not assumed to reduce payroll or overtime.

`calculateBusinessCase` validates its argument and computes:

- Solution spend per month = accepted estimate or reasoned override + incremental recurring cost.
- Upfront investment = accepted one-time estimate or reasoned override + incremental implementation cost.
- Current baseline = non-labor operating spend + manual hours × loaded hourly cost.
- Capacity released = manual hours × efficiency; capacity value = released hours × hourly cost.
- Actual labor cash benefit = capacity value × cash realization.
- Total monthly cash benefit = non-labor spend actually retired + labor cash benefit + additional customer-entered contribution/cost avoidance.
- Net monthly cash = total cash benefit − solution spend.
- Horizon net cash = net monthly cash × horizon months − upfront investment.
- Payback = upfront investment ÷ positive net monthly cash. Unknown investment or non-positive returns produce no payback result.
- ROI = horizon net cash ÷ (upfront investment + solution spend × horizon). A zero denominator produces no ROI result.
- Break-even efficiency = the labor efficiency required to recover recurring cost and upfront cost over the horizon, after other cash benefits. A threshold above the feasible efficiency range remains visible. If non-labor benefits already cover the requirement, the threshold is zero; otherwise unavailable labor cash capacity produces no threshold.

The full baseline is never counted as savings. Customer-entered additional benefits must exclude already counted cost retirement or labor savings. Separate sensitivity deltas show the change in expected monthly net cash from efficiency falling by ten percentage points, total solution cost rising by one fifth, or additional benefit falling by one fifth. They do not add a new ROI projection.

Unknown values propagate through dependent calculations. An explicitly zero factor can establish zero even with an unknown other factor: no cash realization means no labor cash benefit, even if released hours are unknown. Calculations use unrounded intermediate amounts and round visible outputs to two decimal places.

This is an immediate, evenly recurring, undiscounted planning comparison. It does not model implementation delays, adoption ramps, inflation, taxes, financing, or discounted cash flows. It cannot verify customer evidence or determine whether a claimed benefit will be realized.

`validateExplanation` bounds AI discussion prose and rejects visible numerals, currency symbols/codes, percentages and HTML. This is an output boundary, not semantic proof of every claim. The host's model prompt must prohibit invented figures, promises or customer decisions; all numeric results come from this engine.

Run `npm test` here, or `node --test "packages/business-case/test/**/*.test.ts"` at the repository root.
