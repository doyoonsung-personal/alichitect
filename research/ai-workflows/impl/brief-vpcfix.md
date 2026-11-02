# Fix a live cloud-diagram repair gap: attachments to a VPC node that doesn't exist

This is a bug in the live cloud path, found by the cloud eval (case `p1-vpc-no-group` in `eval/cases/10-phase1.json`, failing 3 of 3 runs on 2026-11-02).

**What happens:**
- The user describes an on-premises data centre plus a managed data layer in Singapore, with no VPC drawn as a node.
- The model draws Private Zone (`privatezone`) with `attachTo: "vpc"`. Here `vpc` is a group id, or no element at all, not a node.
- The validator warns: `'privatezone' attaches to 'vpc': host 'vpc' does not exist`.
- The repair doesn't fix it, so the `attachValid` assertion fails.

The stored records for this case are in `eval/results/2026-11-02T11-29-56-phase0a-baseline/runs.jsonl`: search for `p1-vpc-no-group`.

**Task:**
- Find where `attachTo` hosts are validated and repaired (`packages/core/src/validate.ts`: `attachFixes`, `repairGraph` and the attach checks).
- Make the deterministic repair handle an `attachTo` that names a missing host or a group id:
  - attach it to the right host if one exists by the catalog's attach rules, for example the VPC's container;
  - otherwise drop `attachTo` and draw the node inline in its scope, with a repaired warning.

  Follow how the existing repairs word and mark their warnings.
- Make the browser's mirror of the repair agree, if one exists (`apps/web`).

## Files you own
- `packages/core/src/validate.ts`;
- `packages/core/test/repairs.test.ts`, or a new test file;
- the matching `apps/web` repair-mirror file and its test, only if one exists.

## Hard constraints
- The cloud system prompt must keep sha256 `998fab223daba0a4407930f0f6f61e90cf100d7783ca4b13008636526d049313`. Don't touch `prompt.ts` or the catalog.
- Every existing test, fixture and replay stays green.

## Tests
- the three stored failing graphs from that eval run, as fixtures: after repair, no `attach-host-missing` error and no attachment to a missing host;
- a valid attachment is left alone;
- the repair is idempotent.
