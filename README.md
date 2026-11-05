# Alichitect

Alichitect helps turn customer requirements into Alibaba Cloud architecture proposals and AI workflows. It includes guided discovery, design conversations, solution cost estimates, PDF reports and authenticated MCP access for other agents.

## Working with AI agents

**All AI contributors must read [AGENTS.md](AGENTS.md) before making changes.** It is the shared working agreement for commit explanations, collaboration, file ownership, validation and release reporting. Keep these rules in one place rather than copying them into provider-specific files.

[CLAUDE.md](CLAUDE.md) points to the same agreement and holds additional implementation notes. For any agent that does not discover repository instructions, include this in its startup/task instructions:

> Read and follow the repository's AGENTS.md before starting. Check the current Git state, relevant implementation notes in CLAUDE.md and active task records under docs/agent-handoffs. Coordinate file ownership before overlapping edits, explain every commit, and report validation and deployment status accurately.

Use a [task handoff record](docs/agent-handoffs/README.md) when multiple agents or separate sessions share a task. These files help agents coordinate; they do not enforce locks or replace review.

## Repository map

| Path | Purpose |
| --- | --- |
| [packages/core](packages/core/README.md) | Shared contracts, catalog, design logic, pricing and report authoring |
| [apps/web](apps/web/README.md) | Web interface, diagrams and PDF rendering |
| [apps/server](apps/server) | Local development API |
| [apps/worker](apps/worker) | Hosted application, accounts, storage and MCP |
| [docs/MCP.md](docs/MCP.md) | MCP connection and tool usage |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Deployment and operational instructions |
| [docs/BD_MEETING_BRIEF_PLAN.md](docs/BD_MEETING_BRIEF_PLAN.md) | Proposed optional BD meeting brief: implementation, isolation and removal plan |
| [docs/BUSINESS_CASE.md](docs/BUSINESS_CASE.md) | Optional business-case worksheet: calculations, enabling, independent integration and removal |

From the repository root, `npm test` runs the core, eval and local-server tests. Web and Worker checks run from their respective directories; see [AGENTS.md](AGENTS.md#6-verify-the-change-you-are-handing-over) and the module documentation. A successful local build does not mean the changes have been deployed.
