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

The pricing and MCP walkthrough appears once after sign-in. Inside the notice you can choose English, 한국어, or 中文. **Minimize to Changelog** returns focus to the Changelog link. Open it from the main page to reread dated updates and their screenshots, or replay the latest notice. The notice and changelog remember your update-language choice in this browser separately from the app language.

After connecting, the client can discover the available tools and their schemas. The MCP initialization response also supplies a short guide for the key's access level. A separate IDE skill is optional and can describe your team's preferred discovery questions or handoff process.

Attach the customer’s brief or PDF in an IDE that can read it, or paste their pain point into the chat. The key page has a starter prompt you can copy. The IDE extracts the requirements and checks the source material before asking the customer for missing facts. It sends a concise brief to Alichitect, refines the design and estimate with the customer's answers, and writes the client report itself. The report should distinguish monthly and one-time costs and identify rate sources, assumptions, exclusions and open decisions.

- `design_solution` creates a cloud design or AI workflow. To revise one, supply its `designId` and current `revision`.
- `estimate_solution` accepts usage and corrections against that design revision. It returns monthly and one-time subtotals, assumptions and open questions.
- `get_design` reads the latest design without spending a turn. Read-only keys can call this tool. Model calls share the owner's web quota and concurrency rules.

For a change, choose a unique `requestId` of 8–64 letters, digits, hyphens or underscores. Retry with the same ID and the same inputs after a timeout. A completed request returns its original revision. For a new change, use a fresh ID and first read the current revision if needed.

The returned link opens the latest saved design for its signed-in owner. Opening it creates a labeled local copy in the browser, so browser edits and existing browser sessions stay independent of the agent's design. Apply the Worker D1 migrations when releasing the feature.
