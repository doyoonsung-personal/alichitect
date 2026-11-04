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

After connecting, the client can discover the available tools and their schemas. The MCP initialization response also supplies a short guide for the key's access level. A separate IDE skill is optional and can describe your team's preferred discovery questions or handoff process.

Ask the agent: “Design an Alibaba Cloud deployment for our two Linux web servers in Singapore. Our database stays with its current provider. Then ask for the inputs you need to price it.”

- `design_solution` creates a cloud design or AI workflow. To revise one, supply its `designId` and current `revision`.
- `estimate_solution` accepts usage and corrections against that design revision. It returns monthly and one-time subtotals, assumptions and open questions.
- `get_design` reads the latest design without spending a turn. Read-only keys can call this tool. Model calls share the owner's web quota and concurrency rules.

For a change, choose a unique `requestId` of 8–64 letters, digits, hyphens or underscores. Retry with the same ID and the same inputs after a timeout. A completed request returns its original revision. For a new change, use a fresh ID and first read the current revision if needed.

The returned link opens the latest saved design for its signed-in owner. Opening it creates a labeled local copy in the browser, so browser edits and existing browser sessions stay independent of the agent's design. Apply the Worker D1 migrations when releasing the feature.
