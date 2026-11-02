Implemented all scoped backend fixes. No commits made.

- Offline pass rates: tuned **113/129 → 111/129**; i18n **44/60 → 41/60**, exposing invalid attachment links and ungated effects.
- All targeted regressions and three typechecks pass.
- Full suites: root **1012/1013**, web **616/618**, worker **272/274**. Four failures passed isolated reruns; Chrome logo rendering still times out.

[Full report: item dispositions, files, tests, decisions and remaining work](eval/test/review-b-report.md)  
[Every changed fixture and stored-design warning](eval/test/review-b-warning-sweep.md)

The core C9 choice-set export is ready for the separately assigned UI integration.

Codex session ID: 01a19d6b-01bc-7281-8943-d02eda1a7e94
Resume in Codex: codex resume 01a19d6b-01bc-7281-8943-d02eda1a7e94
