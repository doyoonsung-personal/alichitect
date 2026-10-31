Write a short markdown section titled "## Checking the whole flow" for the README of a web app. Plain, factual, no marketing language, no emoji, no tables, under 200 words. Use only the facts below.

Facts:
- Command, run in apps/web: `node scripts/flow.mjs`. It builds the app once into a temp folder and serves it with `vite preview` on a free port in 5185-5199 (never 5173), so edits made elsewhere in the repo while it runs cannot reload a page.
- It starts a fake drawing service that streams a recorded fixture ("residency", four turns) with its original timings at 2x, so no key and no Qwen are needed.
- For each viewport (1280x720, 1366x768, 1440x900, 1536x864, 1920x1080) it saves numbered PNGs under screenshots/flow/<size>/: landing, typing, IME composition, the handoff, first card, mid-stream, done, products panel open, panel row hover, card popover, a follow-up, change-line hover, four revisions, and a nine-revision long session. In replay mode it also saves the solution map, a fatal error, a content-filtered message, and the Korean and Chinese working views.
- It also checks 390x844 so that nothing breaks (no horizontal scroll).
- It writes report.json next to the PNGs with, per size: the zoom, the smallest card title in rendered pixels, the card count, horizontal scroll, and whether Enter during an IME composition stayed on the landing.
- Flags: `--sizes 1440x900,1280x720` limits sizes; `--out <dir>`; `--no-390`; `--no-build` reuses the last build; `--dist <dir>`.
