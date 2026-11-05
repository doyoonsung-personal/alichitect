# Agent task handoffs

Use one record per coordinated task or cross-session handoff. Copy [TEMPLATE.md](TEMPLATE.md) to a descriptive filename such as `2026-11-05-report-readability.md`. Do not edit the template to track live work.

The coordinating agent owns updates to the record. Workers send it their scope, findings and verification results. Update the record when ownership, interfaces, blockers or completion state changes. Small self-contained tasks do not need a record just to satisfy a process.

Read active records before overlapping work. Records are not locks, and separate checkouts may contain stale copies. Confirm ownership through available agent messaging or the task's existing coordination channel. Do not overwrite an active agent's files because its record has an old timestamp.

Use statuses `planned`, `active`, `review`, `blocked` or `done`. Use an ISO timestamp with an explicit timezone, for example `2026-11-05T15:00:00+09:00`. For a blocked task, name the missing dependency and what can still proceed. For a completed task, include commits and state whether it was deployed.

Keep records free of credentials, private customer content and raw chat transcripts. Link to durable repository evidence where possible. Mark local temporary paths as local-only. Keep completed records as useful history; do not use them as proof of current production state.

The shared conduct rules live in [AGENTS.md](../../AGENTS.md).
