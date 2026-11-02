# Adversarial review (read-only)

Read-only: do not edit or create files. Never stop to ask.

Repository: this worktree, a checkout of C:/Users/mendo/ali_catalog. You may run `node --test <files>` and `node -e` scripts to demonstrate findings, but write no files except under your system temp folder.

**Review target:** TARGET

**The design it implements:** BRIEF, plus `research/ai-workflows/PLAN.md`.

Hunt for real defects:
- wrong results on plausible input, and crashes on hostile input;
- non-determinism;
- broken invariants the brief or plan requires;
- false gates: tests that pass without checking what they claim;
- anything that would hurt the cloud path or the hidden-backend rules (never naming the backend model or vendor on the wire or in prompts).

**For each finding:**
- severity (high, medium or low);
- file:line;
- a minimal concrete input, with the wrong and expected results;
- the fix.

Report only findings you demonstrated, either by running a command or by an exact trace. Finish with the brief items you checked and found correct.
