# Connect an IDE to Alichitect

Open the account menu in Alichitect and choose **MCP API keys**. Give the key a name such as “Qoder laptop”, choose read-only or read/write access, and select its lifetime. Copy the secret when it appears. The list shows the identifier, permissions, expiry and last use. To rotate a key, issue a replacement, update the client, and revoke the old one. Personal keys are available to approved individual accounts.

In your IDE’s personal MCP settings, add a remote Streamable HTTP server using the URL on the key page. Send the secret in the `Authorization` header on every request. After connecting, refresh the tool list to verify your key’s scope without spending a turn. These keys work only on `/mcp`. The web app uses signed-in sessions for designs and estimates.

The key page includes JSON examples for Qoder and the VS Code user-profile format. Use your IDE’s secret store or personal settings for the actual key. The Qoder CLI configuration looks like this after substituting the key. [Qoder IDE setup](https://docs.qoder.com/user-guide/chat/model-context-protocol) · [Qoder CLI configuration](https://docs.qoder.com/cli/mcp-reference) · [VS Code MCP configuration](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)

```json
{
  "mcpServers": {
    "alichitect": {
      "type": "http",
      "url": "https://architect.alikorea-demo.com/mcp",
      "headers": { "Authorization": "Bearer <YOUR_API_KEY>" }
    }
  }
}
```

This connection uses a manually provisioned bearer credential. Clients that require an interactive OAuth flow need a separate authorization integration. [MCP authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)

## Try it

The pricing and MCP walkthrough appears once per account on the next visit to the signed-in main page, including during an existing session. If you open a saved design, the notice waits until you return to the main page. Inside the notice you can choose English, 한국어, or 中文. **Minimize to Changelog** returns focus to the Changelog link. Open it from the main page to reread dated updates and their screenshots, or replay the latest notice. The notice and changelog remember your update-language choice in this browser separately from the app language.

After connecting, the client can discover the available tools and their schemas. The MCP initialization response also supplies a short guide for the key's access level. A separate IDE skill is optional and can describe your team's preferred discovery questions or handoff process.

In the Qoder agent app, select Alichitect for a new task and describe the work you want to automate in your own language. For example, ask it to classify IT tickets, check proposed fixes in a test environment, require approval before a production change, and check inventory for shipping requests. The connector instructs the client to draft the workflow first, return the private design link, and ask about missing cost drivers such as monthly volume. Ticketing and purchasing systems can be modeled before you connect them. If the client only lists tools, ask it to call `design_solution` with your brief in workflow mode. [Qoder connector setup and tool permissions](https://docs.qoder.com/qoder/connectors)

Attach the customer’s brief or PDF in an IDE that can read it, or paste their pain point into the chat. The key page has a starter prompt you can copy. The IDE extracts the requirements and checks the source material before asking the customer for missing facts. It sends a concise brief to Alichitect, refines the design and estimate with the customer's answers, and writes the client report itself. The report should distinguish monthly and one-time costs and identify rate sources, assumptions, exclusions and open decisions.

- `design_solution` creates a cloud design or AI workflow. To revise one, supply its `designId` and current `revision`.
- `estimate_solution` accepts usage and corrections against that design revision. It returns monthly and one-time subtotals, assumptions and open questions.
- `get_design` reads the latest design without spending a turn. Read-only keys can call this tool. Model calls share the owner's web quota and concurrency rules.
- `prepare_workshop` reads the latest owned design and returns an evidence pack, discussion prompts and deck-authoring instructions. It works with both key scopes and makes no model call or account-turn charge. Supply `designId`; optionally choose `lang` (`en`, `ko`, `zh`, defaulting to the account language), `audience` (`client` by default or `alibaba` for an internal account/SA discussion), and a `meetingGoal` of up to 2,000 characters. The calling agent uses its own model and local file tools to create a standalone HTML deck; Alichitect does not generate, render, store or host it.
- `export_proposal_pdf` takes a saved `designId`, its current `revision`, and `lang` (`en`, `ko`, or `zh`). Choose `audience: "client"` (the default) for customer value and next decisions, or `audience: "alibaba"` for an internal account/SA solution brief. Ask Qoder “Make a client-facing PDF of this proposal.” Both versions use Qwen3.8 Max with high reasoning to write tailored chapters from the customer conversation, saved design and pricing. The IDE may send `narrative` as editorial notes. A new report requires a read/write key and uses the same writing allowance as a web proposal. Reports are cached separately by audience; writing can take several minutes.

The tool returns a private link immediately with status `preparing`. Open it while signed in as the design owner. The page checks progress and downloads the PDF when it is ready. If the IDE can save files, it can poll the same inputs after `retryAfterSeconds` with `includeFile: true`, then save the returned `application/pdf` resource. Downloads and repeat calls reuse the written report, pinned to its design revision. A failed job can be retried explicitly with `retryFailed: true`.

For a workshop, ask: “Use `prepare_workshop` for this design and create a local HTML discussion deck for the customer.” The key page includes a copyable example in English, Korean and Chinese. The returned snapshot includes its revision and private source URL, original request statements, proposed design and workflow, catalog evidence, assumptions, open questions and current pricing. Requirements and design notes are marked as needing validation, not automatically customer-confirmed. Outdated estimate rows and totals are withheld. The authoring brief asks for 6–10 tailored slides, preserved approval and integration boundaries, exact current cost figures and sources, clear decision states, keyboard navigation, offline operation, safe escaping of source strings and a print layout. The IDE keeps editorial control and supplies the local file.

For a change, choose a unique `requestId` of 8–64 letters, digits, hyphens or underscores. Retry with the same ID and the same inputs after a timeout. A completed request returns its original revision. For a new change, use a fresh ID and first read the current revision if needed.

The returned link opens the latest saved design for its signed-in owner. Opening it creates a labeled local copy in the browser, so browser edits and existing browser sessions stay independent of the agent's design. Apply the Worker D1 migrations when releasing the feature.
