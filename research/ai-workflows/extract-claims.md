You are given a research report (Markdown) written by another model. Extract its load-bearing claims so that a fact-checker can verify them against the cited pages.

A load-bearing claim is a specific, checkable statement that the app would rely on, for example:
- a product or model exists, has a given id or name, or is GA, preview, deprecated or retired;
- a price, discount, limit, quota, context window or token count;
- a region or international availability statement (including "China site only");
- a feature exists or does not exist (for example "the Responses API supports remote MCP servers");
- a published metric or figure (for example "resolution rate rose 40%");
- a pattern definition or recommendation attributed to a named source (for example "Anthropic recommends starting with workflows").

Skip general explanations, opinions and anything without a checkable fact.

Return JSON only, in this shape:
{"claims": [{"id": "c1", "claim": "one sentence, self-contained, with the exact figure or name", "url": "the URL the report cites for it, or null", "topic": "short label such as 'qwen3.8-flash price' or 'AgentCore channels'", "kind": "alibaba" or "general", "weight": "high" or "medium"}]}

Rules:
- "alibaba" means the claim is about an Alibaba Cloud product, model, price, region or feature; everything else is "general".
- "high" weight: prices, regions, availability, status, existence of a product or feature, and model ids. "medium": the rest.
- Keep the report's own URL exactly as written. If one sentence holds several facts with different URLs, split it.
- Include claims the report marks "unconfirmed" or "China site only", and keep that marking in the claim text.
- At most 120 claims; if there are more, keep all "high" ones first.
