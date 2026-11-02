I'll research this systematically, starting with the major builder tools' node vocabularies.

# How agentic workflows are drawn: notations, builder tools, and a recommended vocabulary

Research date: 2026-11-02. All facts below come from web searches performed today; each is followed by its source URL. Items I could not verify from a primary source are marked **unconfirmed**; items found only on `aliyun.com` / `help.aliyun.com` are marked **China site only**.

---

## 0. Freshness alerts (things that change the catalog, none of which contradict the 2026-10-31 facts)

| Finding | Detail | Source |
|---|---|---|
| **OpenAI Agent Builder is being shut down** | Deprecated 2026-06-03; "OpenAI is deprecating Agent Builder… scheduled to shut down on November 30, 2026" — 28 days from today. Export to Agents SDK code is offered but the export is lossy per third parties. ChatKit and the Agents SDK remain. | [https://developers.openai.com/api/docs/guides/agent-builder](https://developers.openai.com/api/docs/guides/agent-builder), [https://openai.com/index/introducing-agentkit/](https://openai.com/index/introducing-agentkit/), [https://twitterapi.io/blog/openai-agent-builder](https://twitterapi.io/blog/openai-agent-builder), [https://www.sim.ai/comparisons/openai-agentkit](https://www.sim.ai/comparisons/openai-agentkit) |
| **Microsoft prompt flow (the Azure AI Foundry visual DAG) retires 2027-04-20** | "Prompt flow in Microsoft Foundry and Azure Machine Learning will be retired on April 20, 2027… no longer recommended for new development"; migration target is Microsoft Agent Framework. | [https://learn.microsoft.com/en-us/azure/foundry-classic/concepts/prompt-flow](https://learn.microsoft.com/en-us/azure/foundry-classic/concepts/prompt-flow), [https://learn.microsoft.com/en-us/azure/foundry-classic/how-to/prompt-flow-migration-overview](https://learn.microsoft.com/en-us/azure/foundry-classic/how-to/prompt-flow-migration-overview), [https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/prompt-flow-is-being-retired/4513587](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/prompt-flow-is-being-retired/4513587) |
| Foundry Agent Service **classic** deprecated (retires 2027-03-31); Azure OpenAI Assistants API retires 2026-08-26 | Reported by a Microsoft staff answer and a practitioner write-up — **not confirmed on an official lifecycle page**. | [https://learn.microsoft.com/en-za/answers/questions/5934023/will-azure-ai-agents-sdk-foundry-agent-service-cla](https://learn.microsoft.com/en-za/answers/questions/5934023/will-azure-ai-agents-sdk-foundry-agent-service-cla), [https://www.beri.net/article/assistants-api-august-26-shutdown-openai-responses-vs-azure-foundry-agents](https://www.beri.net/article/assistants-api-august-26-shutdown-openai-responses-vs-azure-foundry-agents) |
| **Google renamed "Vertex AI Agent Designer" → "Workflow Builder"** and it is GA in Gemini Enterprise | Google Cloud release notes: "Workflow Builder (formerly known as Agent Designer) is generally available (GA) in Gemini Enterprise." GA date 2026-09-03 per a third-party guide (**unconfirmed** officially). | [https://docs.cloud.google.com/release-notes](https://docs.cloud.google.com/release-notes), [https://www.workspaceblog.in/blog/gemini-enterprise-workflow-builder-guide/](https://www.workspaceblog.in/blog/gemini-enterprise-workflow-builder-guide/) |
| **Google ADK deprecated SequentialAgent / ParallelAgent / LoopAgent** in favour of a graph-based `Workflow` engine | "SequentialAgent, ParallelAgent, and LoopAgent are all deprecated in favour of Workflow and will be removed in a future version." | [https://github.com/google/adk-python/blob/main/.agents/skills/adk-agent-builder/references/multi-agent.md](https://github.com/google/adk-python/blob/main/.agents/skills/adk-agent-builder/references/multi-agent.md), [https://medium.com/google-cloud/google-adk-2-collaborative-multi-agent-patterns-a-practical-guide-5c696ba556d2](https://medium.com/google-cloud/google-adk-2-collaborative-multi-agent-patterns-a-practical-guide-5c696ba556d2) |
| **Alibaba PAI-LangStudio retires 2027-03-09**; workflow apps migrate to Model Studio workflow apps | "Due to a product strategy adjustment, PAI-LangStudio will be retired on March 9, 2027 at 16:00"; "You can migrate LangStudio workflow apps to Model Studio workflow apps"; "The Model Studio DSL cannot directly import the LangStudio flow." | [https://www.alibabacloud.com/help/en/pai/create-a-code-based-application](https://www.alibabacloud.com/help/en/pai/create-a-code-based-application), [https://www.alibabacloud.com/help/en/pai/product-overview/pai-langstudio-feature-retirement-and-migration-guide](https://www.alibabacloud.com/help/en/pai/product-overview/pai-langstudio-feature-retirement-and-migration-guide) |
| **Model Studio now documents a "Flow Agent" visual platform** with Agent Creation, Agent Group and Memory nodes | "Flow Agent is a visual application development platform from Alibaba Cloud Model Studio. It supports building, debugging, and publishing agent…" — **China site only** (`help.aliyun.com/en`). Singapore availability of Flow Agent: **unconfirmed**. | [https://help.aliyun.com/en/model-studio/flow-agent-introduction](https://help.aliyun.com/en/model-studio/flow-agent-introduction) |
| The Singapore application restriction you verified on 2026-10-31 is **still published** on the international site | "Only users who created Alibaba Cloud Model Studio applications in the Singapore region before April 21, 2025 can call the…" (appears on the intl workflow-application, agent-application and knowledge-base pages). | [https://www.alibabacloud.com/help/en/model-studio/workflow-application](https://www.alibabacloud.com/help/en/model-studio/workflow-application), [https://www.alibabacloud.com/help/en/model-studio/single-agent-application](https://www.alibabacloud.com/help/en/model-studio/single-agent-application) |
| **Alibaba AgentRun has a low-code visual "Flow Agent" canvas** (in addition to no-code Quick Create and high-code) | "You use the visual flow canvas to drag and drop nodes, connect them into a workflow, and then run a test execution"; "Flow orchestration is a core component of the AgentRun service that supports visual orchestration and version management." | [https://www.alibabacloud.com/help/en/agentrun/quick-start-to-low-code-agent-creation-1](https://www.alibabacloud.com/help/en/agentrun/quick-start-to-low-code-agent-creation-1), [https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-createflow](https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-createflow) |
| **Dify added a Human Input node (v1.13.0)** — pause/approve/edit/reroute inside a workflow | "Dify v1.13.0 adds a Human Input node so workflows can pause for human review and resume with approved, edited, or rerouted decisions"; forms now support dropdowns/file uploads and "approve/reject/escalate". | [https://dify.ai/blog/the-human-input-node-bringing-human-judgment-into-automated-workflows](https://dify.ai/blog/the-human-input-node-bringing-human-judgment-into-automated-workflows), [https://docs.dify.ai/en/cloud/use-dify/nodes/human-input](https://docs.dify.ai/en/cloud/use-dify/nodes/human-input), [https://dify.ai/blog/dify-s-official-cli-difyctl-ships](https://dify.ai/blog/dify-s-official-cli-difyctl-ships) |

---

## 1. Node-type comparison across tools

### Table 1A — AI / model / integration nodes

| Tool | Trigger or start | LLM call | Agent (autonomous, tool-using) | Tool or HTTP call | Knowledge retrieval | Memory |
|---|---|---|---|---|---|---|
| **n8n** | Trigger nodes: Webhook ([https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook)), Chat Trigger for AI/chat workflows ([https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.chattrigger](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.chattrigger)), Form ([https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.form](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.form)), n8n Trigger ([https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.n8ntrigger](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.n8ntrigger)) | "Chat Model" is a **sub-node**, not a step ([https://docs.n8n.io/key-concept-glossary](https://docs.n8n.io/key-concept-glossary)) | AI Agent root node: "Connect a chat model and one or more tools, and the agent decides which tools to call" ([https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent)); Tools Agent variant ([https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent)) | Tools attach via the tool connector on the agent node ([https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent)) | Vector-store nodes exist as sub-nodes (cluster nodes) ([https://docs.n8n.io/build/integrate-ai/langchain-in-n8n](https://docs.n8n.io/build/integrate-ai/langchain-in-n8n)) | Memory sub-node ("Attach a memory sub-node so that users can have an ongoing conversation… Memory doesn't persist between sessions") ([https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent)); Chat Memory Manager node ([https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorymanager](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorymanager)) |
| **Dify** | Start / User Input ([https://docs.dify.ai/en/cloud/use-dify/nodes/user-input](https://docs.dify.ai/en/cloud/use-dify/nodes/user-input)); **Trigger** = "a type of Start node that lets your workflow run automatically on a schedule or in response to events" ([https://docs.dify.ai/en/cloud/use-dify/nodes/trigger/overview](https://docs.dify.ai/en/cloud/use-dify/nodes/trigger/overview)); Webhook Trigger ([https://docs.dify.ai/en/cloud/use-dify/nodes/trigger/webhook-trigger](https://docs.dify.ai/en/cloud/use-dify/nodes/trigger/webhook-trigger)); Integration (plugin) Trigger ([https://docs.dify.ai/en/cloud/use-dify/nodes/trigger/plugin-trigger](https://docs.dify.ai/en/cloud/use-dify/nodes/trigger/plugin-trigger)) | LLM node ([https://docs.dify.ai/en/cloud/use-dify/nodes/llm](https://docs.dify.ai/en/cloud/use-dify/nodes/llm)) | Agent node: "gives your LLM autonomous control over tools, enabling it to iteratively decide which tools to use and when"; strategies Function Calling and ReAct ([https://docs.dify.ai/en/cloud/use-dify/nodes/agent](https://docs.dify.ai/en/cloud/use-dify/nodes/agent)) | HTTP Request node ([https://docs.dify.ai/en/cloud/use-dify/nodes/http-request](https://docs.dify.ai/en/cloud/use-dify/nodes/http-request)); Tool node ([https://docs.dify.ai/en/cloud/use-dify/nodes/tools](https://docs.dify.ai/en/cloud/use-dify/nodes/tools)) | Knowledge Retrieval ([https://docs.dify.ai/en/cloud/use-dify/nodes/knowledge-retrieval](https://docs.dify.ai/en/cloud/use-dify/nodes/knowledge-retrieval)) | Chatflow has conversation variables and "enable memory in LLM nodes" ([https://docs.dify.ai/en/learn/key-concepts](https://docs.dify.ai/en/learn/key-concepts)); Variable Assigner writes conversation variables ([https://docs.dify.ai/en/cloud/use-dify/nodes/variable-assigner](https://docs.dify.ai/en/cloud/use-dify/nodes/variable-assigner)) |
| **Coze / Coze Studio** | Start node ([https://www.coze.com/open/docs/guides/workflow](https://www.coze.com/open/docs/guides/workflow)); workflow and chatflow are separate app types ([https://www.coze.com/open/docs/guides/workflow_and_chatflow](https://www.coze.com/open/docs/guides/workflow_and_chatflow)) | LLM node ([https://www.coze.com/open/docs/guides/llm_node](https://www.coze.com/open/docs/guides/llm_node)); LLM batch processing ([https://www.coze.com/open/docs/guides/llm_batch](https://www.coze.com/open/docs/guides/llm_batch)) | Agents configure plugins/knowledge at agent level; "Multi-agent mode" canvas with jump conditions ([https://www.coze.com/open/docs/guides/agent_knowledge](https://www.coze.com/open/docs/guides/agent_knowledge), [https://cozehq.medium.com/building-an-all-in-one-personal-assistant-with-cozes-multi-agent-mode-e0f695137edf](https://cozehq.medium.com/building-an-all-in-one-personal-assistant-with-cozes-multi-agent-mode-e0f695137edf) — third party) | Plugin node: "a plugin is a collection of tools, each of which is an invokable API" ([https://www.coze.com/open/docs/guides/plugin_node](https://www.coze.com/open/docs/guides/plugin_node)) | Knowledge base retrieval node ([https://www.coze.com/open/docs/guides/knowledge_node](https://www.coze.com/open/docs/guides/knowledge_node)) | Variables + Variable assign node ([https://www.coze.com/open/docs/guides/variable](https://www.coze.com/open/docs/guides/variable), [https://www.coze.com/open/docs/guides/variable_assign_node](https://www.coze.com/open/docs/guides/variable_assign_node)) |
| **LangGraph / LangGraph Studio** | Entry point: "Which node to call first when user input arrives" ([https://docs.langchain.com/oss/python/langgraph/graph-api](https://docs.langchain.com/oss/python/langgraph/graph-api)) | Not a node type — "Nodes and Edges are nothing more than functions—they can contain an LLM or just good ol' code" ([https://docs.langchain.com/oss/python/langgraph/graph-api](https://docs.langchain.com/oss/python/langgraph/graph-api)) | Agent = the graph itself, incl. cycles ([https://www.langchain.com/blog/langgraph](https://www.langchain.com/blog/langgraph)) | Tools are nodes/functions ([https://docs.langchain.com/oss/python/langgraph/graph-api](https://docs.langchain.com/oss/python/langgraph/graph-api)) | Retrieval expressed as a node (no dedicated primitive) — **unconfirmed** as a first-class type | Checkpointer/state gives memory; time travel granularity depends on subgraph checkpointing ([https://docs.langchain.com/oss/python/langgraph/use-time-travel](https://docs.langchain.com/oss/python/langgraph/use-time-travel)) |
| **Langflow** | Components; flows start from an input/trigger component ([https://docs.langflow.org/concepts-components](https://docs.langflow.org/concepts-components)) | LLM components feed the Agent's model input ([https://docs.langflow.org/components-agents](https://docs.langflow.org/components-agents)) | Agent component "defines the behavior and capabilities of AI agents… multiple LLM providers, tool calling, and custom instructions" ([https://docs.langflow.org/agents](https://docs.langflow.org/agents), [https://docs.langflow.org/components-agents](https://docs.langflow.org/components-agents)) | Any component with **Tool Mode** enabled connects to the Agent's Tools input ([https://docs.langflow.org/agents-tools](https://docs.langflow.org/agents-tools)) | Vector-store/retriever components attach to agents ([https://docs.langflow.org/concepts-components](https://docs.langflow.org/concepts-components)) | Memory components (chat memory) attach to agents ([https://docs.langflow.org/agents](https://docs.langflow.org/agents)) |
| **Flowise** | Start node ([https://docs.flowiseai.com/using-flowise/agentflowv2](https://docs.flowiseai.com/using-flowise/agentflowv2)) | LLM node ([https://docs.flowiseai.com/using-flowise/agentflowv1/sequential-agents](https://docs.flowiseai.com/using-flowise/agentflowv1/sequential-agents)) | Agent node — "the LLM dynamically chooses a tool" ([https://docs.flowiseai.com/using-flowise/agentflowv2](https://docs.flowiseai.com/using-flowise/agentflowv2)); agents are "systems that use an LLM as a reasoning engine to determine which actions to take" ([https://docs.flowiseai.com/integrations/langchain/agents](https://docs.flowiseai.com/integrations/langchain/agents)) | Tool node, HTTP node, Custom Tool ([https://docs.flowiseai.com/integrations/langchain/tools/custom-tool](https://docs.flowiseai.com/integrations/langchain/tools/custom-tool), [https://docs.flowiseai.com/tutorials/tools-and-mcp](https://docs.flowiseai.com/tutorials/tools-and-mcp)) | Retriever node ([https://docs.flowiseai.com/using-flowise/agentflowv2](https://docs.flowiseai.com/using-flowise/agentflowv2)); knowledge sources in agent-as-tool tutorial ([https://docs.flowiseai.com/tutorials/agent-as-tool](https://docs.flowiseai.com/tutorials/agent-as-tool)) | Chat memory in Chatflows; AgentFlow V2 keeps **Flow State** ([https://docs.flowiseai.com/using-flowise/agentflowv2](https://docs.flowiseai.com/using-flowise/agentflowv2)) |
| **OpenAI Agent Builder (AgentKit)** — *shuts down 2026-11-30* | Start node (per templates) ([https://developers.openai.com/api/docs/guides/agent-builder](https://developers.openai.com/api/docs/guides/agent-builder)) | Agent node wraps the model call ([https://developers.openai.com/api/docs/guides/node-reference](https://developers.openai.com/api/docs/guides/node-reference)) | Agent node with a **Tools** property ([https://cobusgreyling.substack.com/p/openai-agent-builder](https://cobusgreyling.substack.com/p/openai-agent-builder) — third party) | MCP node ([https://composio.dev/content/openai-agent-builder-step-by-step-guide-to-building-ai-agents-with-mcp](https://composio.dev/content/openai-agent-builder-step-by-step-guide-to-building-ai-agents-with-mcp) — third party); Guardrail node ([https://developers.openai.com/api/docs/guides/node-reference](https://developers.openai.com/api/docs/guides/node-reference)) | File-search style retrieval existed as a node but was replaced by MCP tools ([https://www.udemy.com/course/master-openai-agent-builder-n8n-workflow-automation/](https://www.udemy.com/course/master-openai-agent-builder-n8n-workflow-automation/) — third party, **unconfirmed**) | **Set State** node writes workflow state ([https://developers.openai.com/api/docs/guides/node-reference](https://developers.openai.com/api/docs/guides/node-reference)) |
| **Google ADK Visual Builder / Vertex AI "Workflow Builder"** | Canvas with a default start node ([https://hiviewsolutions.com/blog/build-an-agent-with-gemini/](https://hiviewsolutions.com/blog/build-an-agent-with-gemini/) — third party) | LlmAgent has a model field ([https://adk.dev/agents/llm-agents/](https://adk.dev/agents/llm-agents/)) | Nodes represent agents (root/sub); edges show delegation; tools appear as connected icons ([https://medium.com/google-cloud/building-ai-agents-visually-with-google-adk-visual-agent-builder-bb441e59a78c](https://medium.com/google-cloud/building-ai-agents-visually-with-google-adk-visual-agent-builder-bb441e59a78c) — third party) | Pre-wired tools: Google Search, URL context, Vertex AI Search (RAG) ([https://discuss.google.dev/t/introducing-vertex-ai-agent-designer-in-agent-builder/299224](https://discuss.google.dev/t/introducing-vertex-ai-agent-designer-in-agent-builder/299224)) | Vertex AI Search as RAG tool ([https://discuss.google.dev/t/introducing-vertex-ai-agent-designer-in-agent-builder/299224](https://discuss.google.dev/t/introducing-vertex-ai-agent-designer-in-agent-builder/299224)) | Session/state in ADK; Agent Studio canvas manages "agent reasoning loops" ([https://docs.cloud.google.com/gemini-enterprise-agent-platform/overview](https://docs.cloud.google.com/gemini-enterprise-agent-platform/overview)) |
| **Microsoft Copilot Studio** | Topic **Trigger** node auto-inserted ([https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-create-edit-topics](https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-create-edit-topics)); triggers configured per topic ([https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-triggers](https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-triggers)) | No per-node LLM node; generative model set at agent level, availability varies by region ([https://learn.microsoft.com/en-us/microsoft-copilot-studio/prompt-model-availability](https://learn.microsoft.com/en-us/microsoft-copilot-studio/prompt-model-availability)) | Generative orchestration lets one agent orchestrate "other agents, topics, tools, and knowledge sources" ([https://learn.microsoft.com/en-us/microsoft-copilot-studio/advanced-generative-actions](https://learn.microsoft.com/en-us/microsoft-copilot-studio/advanced-generative-actions)) | "Add node (+) → Add a tool"; tool tabs by type ([https://learn.microsoft.com/en-us/microsoft-copilot-studio/add-tools-custom-agent](https://learn.microsoft.com/en-us/microsoft-copilot-studio/add-tools-custom-agent)) | **Generative answers** node searches and summarizes knowledge sources ([https://learn.microsoft.com/en-us/microsoft-copilot-studio/nlu-boost-node](https://learn.microsoft.com/en-us/microsoft-copilot-studio/nlu-boost-node)); knowledge at agent or topic level ([https://learn.microsoft.com/en-us/microsoft-copilot-studio/knowledge-copilot-studio](https://learn.microsoft.com/en-us/microsoft-copilot-studio/knowledge-copilot-studio)) | Agent-level conversation memory (**unconfirmed** as a drawable node) |
| **Microsoft Foundry prompt flow → Agent Framework** | Flow input node (`flow.dag.yaml` inputs) ([https://learn.microsoft.com/en-us/azure/foundry-classic/concepts/prompt-flow](https://learn.microsoft.com/en-us/azure/foundry-classic/concepts/prompt-flow)) | LLM tool, Prompt tool ([https://learn.microsoft.com/en-us/azure/foundry-classic/concepts/prompt-flow](https://learn.microsoft.com/en-us/azure/foundry-classic/concepts/prompt-flow), [https://learn.microsoft.com/en-us/azure/machine-learning/promptflow/tools-reference/llm-tool?view=azureml-api-2](https://learn.microsoft.com/en-us/azure/machine-learning/promptflow/tools-reference/llm-tool?view=azureml-api-2)) | Agent Framework: agents are executors in a graph ([https://learn.microsoft.com/en-us/agent-framework/overview/](https://learn.microsoft.com/en-us/agent-framework/overview/)) | Python tool and custom tool packages ([https://learn.microsoft.com/en-us/azure/machine-learning/promptflow/tools-reference/overview?view=azureml-api-2](https://learn.microsoft.com/en-us/azure/machine-learning/promptflow/tools-reference/overview?view=azureml-api-2)) | Index Lookup tool (Azure AI Search, Faiss, Pinecone) ([https://learn.microsoft.com/en-us/azure/foundry-classic/how-to/prompt-flow-tools/index-lookup-tool](https://learn.microsoft.com/en-us/azure/foundry-classic/how-to/prompt-flow-tools/index-lookup-tool)) | State shared across executors ([https://learn.microsoft.com/en-us/agent-framework/concepts/workflows/state](https://learn.microsoft.com/en-us/agent-framework/concepts/workflows/state)) |
| **AWS Bedrock Flows** | Flow input ([https://docs.aws.amazon.com/bedrock/latest/userguide/key-definitions-flow.html](https://docs.aws.amazon.com/bedrock/latest/userguide/key-definitions-flow.html)) | **Prompt node** (inline prompt or managed prompt) ([https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html](https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html), [https://docs.aws.amazon.com/bedrock/latest/userguide/flows.html](https://docs.aws.amazon.com/bedrock/latest/userguide/flows.html)) | **Agent node** invokes a Bedrock agent; supports multi-turn conversation ([https://docs.aws.amazon.com/bedrock/latest/userguide/key-definitions-flow.html](https://docs.aws.amazon.com/bedrock/latest/userguide/key-definitions-flow.html), [https://aws.amazon.com/blogs/machine-learning/introducing-multi-turn-conversation-with-an-agent-node-for-amazon-bedrock-flows-preview/](https://aws.amazon.com/blogs/machine-learning/introducing-multi-turn-conversation-with-an-agent-node-for-amazon-bedrock-flows-preview/)) | Lambda node, inline code node, S3 retrieval/storage, Lex node ([https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html](https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html), [https://blog.stackademic.com/amazon-bedrock-flows-from-agentic-ai-to-end-to-end-solution-e5a2e9ffdd86](https://blog.stackademic.com/amazon-bedrock-flows-from-agentic-ai-to-end-to-end-solution-e5a2e9ffdd86) — third party) | **Knowledge base node** ([https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html](https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html)) | Not a node type; agent memory lives in AgentCore Memory ([https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html)) |
| **AWS Bedrock AgentCore** | Not a canvas product: "agentic platform for building, deploying, and operating… agents… using any framework" ([https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html)) | Model-agnostic runtime ([https://github.com/awslabs/agentcore-samples](https://github.com/awslabs/agentcore-samples)) | Runtime hosts agent/tool code in microVMs ([https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-how-it-works.html](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-how-it-works.html)) | Gateway "connect to MCP servers and convert APIs and lambda to MCP compatible tools" ([https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-core-concepts.html](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-core-concepts.html)) | No managed retrieval node; Memory/Gateway/Browser/Code Interpreter are services ([https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html)) | AgentCore Memory service ([https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html)) |
| **Zapier Agents** | Trigger section: "+ Add trigger" ([https://help.zapier.com/hc/en-us/articles/45394909914381-Set-up-your-agent-s-trigger](https://help.zapier.com/hc/en-us/articles/45394909914381-Set-up-your-agent-s-trigger)) | Model not user-selectable per step (**unconfirmed**) | Agent = instructions + trigger + knowledge + actions, configured in panels, **not a node canvas** ([https://help.zapier.com/hc/en-us/articles/24393442652557-Build-an-agent-in-Zapier-Agents](https://help.zapier.com/hc/en-us/articles/24393442652557-Build-an-agent-in-Zapier-Agents)) | "Add actions to give your agent tools to automate tasks" ([https://help.zapier.com/hc/en-us/articles/24393442652557-Build-an-agent-in-Zapier-Agents](https://help.zapier.com/hc/en-us/articles/24393442652557-Build-an-agent-in-Zapier-Agents)) | "Knowledge sources… enable the agent to make advanced queries" ([https://help.zapier.com/hc/en-us/articles/24569690575117-Add-your-own-data-to-an-agent](https://help.zapier.com/hc/en-us/articles/24569690575117-Add-your-own-data-to-an-agent)) | No explicit memory node (**unconfirmed**) |
| **Alibaba Model Studio (workflow application / Flow Agent)** | Start and End nodes ([https://www.alibabacloud.com/help/en/model-studio/workflow-application](https://www.alibabacloud.com/help/en/model-studio/workflow-application); node docs **China site only**: [https://help.aliyun.com/en/model-studio/workflow/start-end-node](https://help.aliyun.com/en/model-studio/workflow/start-end-node)) | Large Language Model (LLM) node ([https://help.aliyun.com/en/model-studio/workflow/llm-node](https://help.aliyun.com/en/model-studio/workflow/llm-node) — **China site only**; described on intl at [https://www.alibabacloud.com/help/en/model-studio/workflow-application](https://www.alibabacloud.com/help/en/model-studio/workflow-application)) | **Agent Creation node** ("natively supports tool invocation: it allows configuration of knowledge bases and plugins, enabling retrieval-augmented…") and **Agent Group node** ([https://help.aliyun.com/en/model-studio/workflow/agent-create-node](https://help.aliyun.com/en/model-studio/workflow/agent-create-node), [https://help.aliyun.com/en/model-studio/workflow/agent-group-node](https://help.aliyun.com/en/model-studio/workflow/agent-group-node) — **China site only**) | API node, Function Compute node, Script node, Plugin node, **MCP node**, AppFlow node, Application Component node, Data Connector node ([https://help.aliyun.com/en/model-studio/workflow/mcp-node](https://help.aliyun.com/en/model-studio/workflow/mcp-node), [https://help.aliyun.com/en/model-studio/workflow-application/](https://help.aliyun.com/en/model-studio/workflow-application/) — **China site only**; plugin/API/FC described on intl: [https://www.alibabacloud.com/help/en/model-studio/workflow-application](https://www.alibabacloud.com/help/en/model-studio/workflow-application)) | Knowledge Base node = RAG ([https://www.alibabacloud.com/help/en/model-studio/workflow-application](https://www.alibabacloud.com/help/en/model-studio/workflow-application), [https://help.aliyun.com/en/model-studio/workflow/knowledge-base-node](https://help.aliyun.com/en/model-studio/workflow/knowledge-base-node) — **China site only**) | **Memory node**: "Adds and retrieves memories on a memory store within a workflow" ([https://help.aliyun.com/en/model-studio/workflow/memory-node](https://help.aliyun.com/en/model-studio/workflow/memory-node) — **China site only**) |
| **Alibaba AgentRun (Flow Agent)** | Start node with declared input fields ([https://help.aliyun.com/en/agentrun/call-flow-agent-using-ai-gateway-1](https://help.aliyun.com/en/agentrun/call-flow-agent-using-ai-gateway-1) — **China site only**; intl quickstart: [https://www.alibabacloud.com/help/doc-detail/3049290.html](https://www.alibabacloud.com/help/doc-detail/3049290.html)) | LLM node with its own configuration panel ([https://www.alibabacloud.com/help/doc-detail/3049289.html](https://www.alibabacloud.com/help/doc-detail/3049289.html)) | No-code Quick Create = "selecting a model, writing a prompt, and configuring tools and a sandbox" ([https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun](https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun)) | Tools/MCP via Agent Toolkit ([https://api.alibabacloud.com/api/AgentRun/2025-09-10](https://api.alibabacloud.com/api/AgentRun/2025-09-10)) | Knowledge base integration with Model Studio and RAGFlow ([https://www.alibabacloud.com/help/en/agentrun/knowledge-base-integration-guide](https://www.alibabacloud.com/help/en/agentrun/knowledge-base-integration-guide)) | Memory module in AgentRun ([https://www.alibabacloud.com/help/en/agentrun/using-session-state-in-langchain-1.md](https://www.alibabacloud.com/help/en/agentrun/using-session-state-in-langchain-1.md)) |
| **Alibaba PAI-LangStudio** (retiring 2027-03-09) | Start node "marks where execution begins and declares the input parameters" ([https://www.alibabacloud.com/help/en/pai/node-reference](https://www.alibabacloud.com/help/en/pai/node-reference)) | LLM node ([https://www.alibabacloud.com/help/en/pai/node-reference](https://www.alibabacloud.com/help/en/pai/node-reference)) | Node families include "flow control, LLMs, agents, data retrieval, document parsing, speech recognition, and Python" ([https://www.alibabacloud.com/help/en/pai/node-reference](https://www.alibabacloud.com/help/en/pai/node-reference)) | Python nodes and other tools ([https://www.alibabacloud.com/help/en/pai/application-flow-development/](https://www.alibabacloud.com/help/en/pai/application-flow-development/)) | Data retrieval nodes: "Index lookup. Retrieves knowledge…" ([https://www.alibabacloud.com/help/en/pai/data-retrieval-node](https://www.alibabacloud.com/help/en/pai/data-retrieval-node)); knowledge base from OSS ([https://www.alibabacloud.com/help/en/pai/knowledge-base-management](https://www.alibabacloud.com/help/en/pai/knowledge-base-management)) | **unconfirmed** |

### Table 1B — Control-flow nodes

| Tool | Condition / router | Loop / iteration | Parallel branches | Human input / approval | Code | Sub-workflow / sub-agent | Variable / aggregator | End / output |
|---|---|---|---|---|---|---|---|---|
| **n8n** | IF/Switch flow-logic nodes and the AI Text Classifier; cluster nodes documented at [https://docs.n8n.io/key-concept-glossary](https://docs.n8n.io/key-concept-glossary) (specific node pages **unconfirmed** in this research) | Loop Over Items (Split in Batches) ([https://docs.n8n.io/build/flow-logic/loop](https://docs.n8n.io/build/flow-logic/loop), [https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.splitinbatches](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.splitinbatches)) | Multiple outputs/branches; Merge node ([https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.merge](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.merge)) | Wait node pauses until webhook/form resume ([https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait)); Slack "Send and Wait for Response" approvals ([https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.slack/approvals](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.slack/approvals)); Chat node human-in-the-loop actions ([https://www.linkedin.com/posts/n8n_the-chat-node-now-supports-human-in-the-loop-activity-7424376235612585984-Z_sb](https://www.linkedin.com/posts/n8n_the-chat-node-now-supports-human-in-the-loop-activity-7424376235612585984-Z_sb)) | Code node (implied by "AI Agent Code Tool" usage, [https://community.n8n.io/t/ai-agent-code-tool-how-to-use-data-from-other-nodes/149566](https://community.n8n.io/t/ai-agent-code-tool-how-to-use-data-from-other-nodes/149566)); official Code node page **unconfirmed** here | Execute Sub-workflow Trigger / "Break workflows into smaller parts" ([https://docs.n8n.io/build/flow-logic/break-workflows-into-smaller-parts](https://docs.n8n.io/build/flow-logic/break-workflows-into-smaller-parts)); **AI Agent Tool** sub-node = agent-as-tool ([https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolaiagent](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolaiagent)) | Merge node ([https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.merge](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.merge)) | Last node's output; n8n Agents are published and reachable via chat/channels/schedules ([https://docs.n8n.io/build/build-and-manage-agents](https://docs.n8n.io/build/build-and-manage-agents)) |
| **Dify** | If-Else ([https://docs.dify.ai/en/cloud/use-dify/nodes/ifelse](https://docs.dify.ai/en/cloud/use-dify/nodes/ifelse)); Question Classifier routes conversation by intent ([https://docs.dify.ai/en/cloud/use-dify/nodes/question-classifier](https://docs.dify.ai/en/cloud/use-dify/nodes/question-classifier)) | **Iteration** (arrays, sequential or parallel) ([https://docs.dify.ai/en/cloud/use-dify/nodes/iteration](https://docs.dify.ai/en/cloud/use-dify/nodes/iteration)); **Loop** ("each cycle builds on the results of the previous one") ([https://docs.dify.ai/en/cloud/use-dify/nodes/loop](https://docs.dify.ai/en/cloud/use-dify/nodes/loop)) | "you can arrange nodes in series or in parallel" ([https://docs.dify.ai/en/cloud/use-dify/build/orchestrate-node](https://docs.dify.ai/en/cloud/use-dify/build/orchestrate-node)); Variable Aggregator is for **exclusive** branches and "does not combine outputs from multiple" parallel paths ([https://docs.dify.ai/en/cloud/use-dify/nodes/variable-aggregator](https://docs.dify.ai/en/cloud/use-dify/nodes/variable-aggregator)) | **Human Input** node pauses the run and delivers a form ([https://docs.dify.ai/en/cloud/use-dify/nodes/human-input](https://docs.dify.ai/en/cloud/use-dify/nodes/human-input)); enterprise variant "pauses workflows at key points to deliver a customizable request form" ([https://enterprise-docs.dify.ai/en/3.2.x/use/nodes/human-input](https://enterprise-docs.dify.ai/en/3.2.x/use/nodes/human-input)) | Code node with retry settings ([https://docs.dify.ai/en/cloud/use-dify/nodes/code](https://docs.dify.ai/en/cloud/use-dify/nodes/code)) | Workflow-as-tool / agent node inside workflows ([https://dify.ai/blog/dify-agent-node-introduction-when-workflows-learn-autonomous-reasoning](https://dify.ai/blog/dify-agent-node-introduction-when-workflows-learn-autonomous-reasoning)); "How to Let Your Agent Call Dify Workflows Directly" ([https://dify.ai/blog/how-to-let-your-agent-call-dify-workflows-directly](https://dify.ai/blog/how-to-let-your-agent-call-dify-workflows-directly)) | Variable Aggregator, Variable Assigner, Template, List Operator, Document Extractor, Parameter Extractor ([https://docs.dify.ai/en/cloud/use-dify/nodes/variable-aggregator](https://docs.dify.ai/en/cloud/use-dify/nodes/variable-aggregator), [https://docs.dify.ai/en/cloud/use-dify/nodes/list-operator](https://docs.dify.ai/en/cloud/use-dify/nodes/list-operator), [https://docs.dify.ai/en/cloud/use-dify/nodes/doc-extractor](https://docs.dify.ai/en/cloud/use-dify/nodes/doc-extractor), [https://docs.dify.ai/en/cloud/use-dify/nodes/parameter-extractor](https://docs.dify.ai/en/cloud/use-dify/nodes/parameter-extractor)) | **Output** node (workflows) vs **Answer** node (chatflows) ([https://docs.dify.ai/en/cloud/use-dify/nodes/output](https://docs.dify.ai/en/cloud/use-dify/nodes/output), [https://docs.dify.ai/en/cloud/use-dify/nodes/answer](https://docs.dify.ai/en/cloud/use-dify/nodes/answer)) |
| **Coze** | Condition node; Intent recognition node routes by detected intent ([https://www.coze.com/open/docs/guides/intent_recognition_node](https://www.coze.com/open/docs/guides/intent_recognition_node)) | Loop node ("repeatedly operate a series of tasks until a…") ([https://www.coze.com/open/docs/guides/loop_node](https://www.coze.com/open/docs/guides/loop_node)); LLM batch processing ([https://www.coze.com/open/docs/guides/llm_batch](https://www.coze.com/open/docs/guides/llm_batch)) | Branching via Condition/Intent nodes; **Variable merge node** "merge the output results of all branches" ([https://www.coze.com/open/docs/guides/variable_merge_node](https://www.coze.com/open/docs/guides/variable_merge_node)) | **Question node** "proactively collect user information and capture user intents" ([https://www.coze.com/open/docs/guides/question_node](https://www.coze.com/open/docs/guides/question_node)) | Code node with in-IDE editing ([https://www.coze.com/open/docs/guides/code_node](https://www.coze.com/open/docs/guides/code_node)) | **Workflow node** = nested workflow as a step ([https://www.coze.com/open/docs/guides/workflow_node](https://www.coze.com/open/docs/guides/workflow_node)) | Variable assign / Variable merge nodes ([https://www.coze.com/open/docs/guides/variable_assign_node](https://www.coze.com/open/docs/guides/variable_assign_node), [https://www.coze.com/open/docs/guides/variable_merge_node](https://www.coze.com/open/docs/guides/variable_merge_node)) | End node; message nodes (Send/Edit/Delete/Query message list) ([https://www.coze.com/open/docs/guides/edit_message](https://www.coze.com/open/docs/guides/edit_message)) |
| **LangGraph** | Conditional edges: "Call a function to determine which node(s) to go to next"; conditional entry ([https://docs.langchain.com/oss/python/langgraph/graph-api](https://docs.langchain.com/oss/python/langgraph/graph-api)) | Cycles are the point of LangGraph ([https://www.langchain.com/blog/langgraph](https://www.langchain.com/blog/langgraph)) | **Send API** for map-reduce/dynamic fan-out ([https://docs.langchain.com/oss/python/langgraph/use-graph-api](https://docs.langchain.com/oss/python/langgraph/use-graph-api), [https://reference.langchain.com/python/langgraph/types/Send](https://reference.langchain.com/python/langgraph/types/Send)) | **interrupt()** pauses for external input; decisions approve / edit / reject / respond ([https://docs.langchain.com/oss/python/langgraph/interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts), [https://docs.langchain.com/oss/python/langchain/human-in-the-loop](https://docs.langchain.com/oss/python/langchain/human-in-the-loop)) | Nodes are arbitrary functions ([https://docs.langchain.com/oss/python/langgraph/graph-api](https://docs.langchain.com/oss/python/langgraph/graph-api)) | Subgraph used as a node ([https://docs.langchain.com/oss/python/langgraph/use-subgraphs](https://docs.langchain.com/oss/python/langgraph/use-subgraphs)); **Command** for handoffs ([https://www.langchain.com/blog/command-a-new-tool-for-multi-agent-architectures-in-langgraph](https://www.langchain.com/blog/command-a-new-tool-for-multi-agent-architectures-in-langgraph)) | Shared, reduced state ([https://docs.langchain.com/oss/python/langgraph/graph-api](https://docs.langchain.com/oss/python/langgraph/graph-api)) | Graph return value / output schema ([https://docs.langchain.com/oss/python/langgraph/use-graph-api](https://docs.langchain.com/oss/python/langgraph/use-graph-api)) |
| **Langflow** | Logic/branching components ([https://docs.langflow.org/concepts-components](https://docs.langflow.org/concepts-components)) | Loop components exist in agent templates (**unconfirmed** as a named component) | Grouping of related components; multiple branches ([https://docs.langflow.org/concepts-components](https://docs.langflow.org/concepts-components)) | Human-in-the-loop via chat input components (**unconfirmed**) | Python-customizable components ([https://alain-airom.medium.com/building-custom-components-in-langflow-%EF%B8%8F-def27d0c913a](https://alain-airom.medium.com/building-custom-components-in-langflow-%EF%B8%8F-def27d0c913a) — third party) | Agent-as-tool / sub-agent components ([https://docs.langflow.org/agents-tools](https://docs.langflow.org/agents-tools)) | Component output handles/ports with typed colors ([https://docs.langflow.org/concepts-components](https://docs.langflow.org/concepts-components)) | Output/response components (**unconfirmed** as a distinct type) |
| **Flowise (AgentFlow V2)** | **Condition** (rule-based) and **Condition Agent** ("AI-driven dynamic branching") ([https://docs.flowiseai.com/using-flowise/agentflowv2](https://docs.flowiseai.com/using-flowise/agentflowv2)) | **Iteration** and **Loop** nodes ([https://codewithkg.com/topics/flowise/](https://codewithkg.com/topics/flowise/) — third-party enumeration of the docs node reference; loop improvement request: [https://github.com/FlowiseAI/Flowise/issues/4653](https://github.com/FlowiseAI/Flowise/issues/4653)) | Multiple outgoing branches from Condition; example "Start → LLM → Loop → HTTP" ([https://docs.flowiseai.com/tutorials/structured-output](https://docs.flowiseai.com/tutorials/structured-output)) | **Human** node / human-in-the-loop ([https://codewithkg.com/topics/flowise/](https://codewithkg.com/topics/flowise/), [https://www.youtube.com/watch?v=w3wAhZHIGFQ](https://www.youtube.com/watch?v=w3wAhZHIGFQ) — third party) | **Custom Function** node ([https://github.com/FlowiseAI/Flowise/issues/4653](https://github.com/FlowiseAI/Flowise/issues/4653)) | **Execute Flow** node re-runs an entire sub-flow ([https://github.com/FlowiseAI/Flowise/issues/4653](https://github.com/FlowiseAI/Flowise/issues/4653)); Agent-as-tool pattern ([https://docs.flowiseai.com/tutorials/agent-as-tool](https://docs.flowiseai.com/tutorials/agent-as-tool)) | **Flow State** variables ([https://docs.flowiseai.com/using-flowise/agentflowv2](https://docs.flowiseai.com/using-flowise/agentflowv2)) | **Direct Reply** node ([https://codewithkg.com/topics/flowise/](https://codewithkg.com/topics/flowise/)) |
| **OpenAI Agent Builder** | **If-Else** node ([https://developers.openai.com/api/docs/guides/node-reference](https://developers.openai.com/api/docs/guides/node-reference)) | **While** loop node ([https://developers.openai.com/api/docs/guides/node-reference](https://developers.openai.com/api/docs/guides/node-reference)) | Parallel branches off If-Else/While (**unconfirmed** as a distinct parallel construct) | **User approval** node ([https://culturro.com/blog/openai-agent-builder/](https://culturro.com/blog/openai-agent-builder/) — third party; node categories also listed at [https://medium.com/ai-software-engineer/i-tested-openais-agent-kit-so-you-don-t-have-to-here-s-your-first-practical-guide-agent-kit-5416bb6fa485](https://medium.com/ai-software-engineer/i-tested-openais-agent-kit-so-you-don-t-have-to-here-s-your-first-practical-guide-agent-kit-5416bb6fa485)) | **Transform** node reshapes data ([https://culturro.com/blog/openai-agent-builder/](https://culturro.com/blog/openai-agent-builder/)) | Multi-agent workflows on one canvas ([https://openai.com/index/introducing-agentkit/](https://openai.com/index/introducing-agentkit/)); Agents SDK: handoffs + agents-as-tools ([https://developers.openai.com/api/docs/guides/agents/orchestration](https://developers.openai.com/api/docs/guides/agents/orchestration)) | **Set State** node ([https://developers.openai.com/api/docs/guides/node-reference](https://developers.openai.com/api/docs/guides/node-reference)) | Output/terminal node (**unconfirmed** name) |
| **Google ADK / Workflow Builder** | Conditional routing inside LlmAgent + Workflow graph ([https://adk.dev/workflows/](https://adk.dev/workflows/)) | Loop workflow agent "executes its sub-agents in a loop for a specified number of iterations or until a termination condition" ([https://adk.dev/agents/workflow-agents/loop-agents/](https://adk.dev/agents/workflow-agents/loop-agents/)) | Parallel workflow agent "executes its sub-agents concurrently" ([https://adk.dev/agents/workflow-agents/parallel-agents/](https://adk.dev/agents/workflow-agents/parallel-agents/)); TS Workflow has `JoinNode` barriers ([https://dev.to/raju_dandigam/multi-agent-does-not-mean-parallel-safe-workflows-with-google-adk-3j3](https://dev.to/raju_dandigam/multi-agent-does-not-mean-parallel-safe-workflows-with-google-adk-3j3) — third party) | Human-in-the-loop not a canvas node (**unconfirmed**) | Custom tools generated as Python by the Visual Builder ([https://adk.dev/visual-builder/](https://adk.dev/visual-builder/)) | Sub-agents on canvas; export whole flow to ADK code ([https://discuss.google.dev/t/introducing-vertex-ai-agent-designer-in-agent-builder/299224](https://discuss.google.dev/t/introducing-vertex-ai-agent-designer-in-agent-builder/299224)) | Shared session state (**unconfirmed** as a node) | Canvas root agent output; export to ADK ([https://adk.dev/visual-builder/](https://adk.dev/visual-builder/)) |
| **Copilot Studio** | Condition node ([https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-using-conditions](https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-using-conditions)) | No native loop node in topics; loops handled in agent flows (**unconfirmed**) | Agent flows for deterministic/parallel automation ([https://learn.microsoft.com/en-us/microsoft-copilot-studio/flows-overview](https://learn.microsoft.com/en-us/microsoft-copilot-studio/flows-overview)) | Question node + Adaptive Card node collect user responses ([https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-ask-with-adaptive-card](https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-ask-with-adaptive-card)) | Tools/actions added per node ([https://learn.microsoft.com/en-us/microsoft-copilot-studio/add-tools-custom-agent](https://learn.microsoft.com/en-us/microsoft-copilot-studio/add-tools-custom-agent)) | "Go to another topic"; child agents in generative orchestration ([https://microsoft.github.io/agent-academy/recruit/07-add-new-topic-with-trigger/](https://microsoft.github.io/agent-academy/recruit/07-add-new-topic-with-trigger/), [https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/generative-orchestration](https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/generative-orchestration)) | Variable nodes ([https://microsoft.github.io/agent-academy/recruit/07-add-new-topic-with-trigger/](https://microsoft.github.io/agent-academy/recruit/07-add-new-topic-with-trigger/)) | Message node / end of topic ([https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-send-message](https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-send-message)) |
| **Microsoft Agent Framework (successor to prompt flow)** | Conditional edges between executors ([https://learn.microsoft.com/en-us/agent-framework/workflows/](https://learn.microsoft.com/en-us/agent-framework/workflows/)) | Graph-based workflows with cycles ([https://learn.microsoft.com/en-us/agent-framework/overview/](https://learn.microsoft.com/en-us/agent-framework/overview/)) | **Concurrent** orchestration (fan-out) ([https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/](https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/)) | Human input capability listed among workflow capabilities ([https://learn.microsoft.com/en-us/agent-framework/workflows/](https://learn.microsoft.com/en-us/agent-framework/workflows/)) | Function executors (**unconfirmed** naming) | **Sequential / Handoff / Group chat / Magentic** orchestrations ([https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/](https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/)); handoff = "developer declares a graph of agents and the directed edges between them" ([https://devblogs.microsoft.com/agent-framework/a-tour-of-handoff-orchestration-pattern/](https://devblogs.microsoft.com/agent-framework/a-tour-of-handoff-orchestration-pattern/)) | Shared State across executors ([https://learn.microsoft.com/en-us/agent-framework/concepts/workflows/state](https://learn.microsoft.com/en-us/agent-framework/concepts/workflows/state)) | Workflow output; visualization via `ToMermaidString()` / `ToDotString()` ([https://learn.microsoft.com/en-us/agent-framework/workflows/visualization](https://learn.microsoft.com/en-us/agent-framework/workflows/visualization)) |
| **AWS Bedrock Flows** | **Condition** node with multiple inputs ([https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html](https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html)); quota: 5 condition nodes per flow ([https://docs.aws.amazon.com/general/latest/gr/bedrock.html](https://docs.aws.amazon.com/general/latest/gr/bedrock.html)) | **Iterator** + **Collector** nodes; **DoWhile** loop node ([https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html](https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html), [https://aws.amazon.com/blogs/machine-learning/dowhile-loops-now-supported-in-amazon-bedrock-flows/](https://aws.amazon.com/blogs/machine-learning/dowhile-loops-now-supported-in-amazon-bedrock-flows/)) | Iterator fans out items; collector "returns them as an array"; collector quota = 1 per flow ([https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html](https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html), [https://docs.aws.amazon.com/general/latest/gr/bedrock.html](https://docs.aws.amazon.com/general/latest/gr/bedrock.html)) | No native approval node; long-running async flows up to 24 h enable external waits ([https://docs.aws.amazon.com/bedrock/latest/userguide/flows-create-async.html](https://docs.aws.amazon.com/bedrock/latest/userguide/flows-create-async.html)) | **Inline code** node ([https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html](https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html)) | Agent node calls a Bedrock agent; multi-agent via supervisor/collaborator agents ([https://docs.aws.amazon.com/bedrock/latest/userguide/agents-multi-agent-collaboration.html](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-multi-agent-collaboration.html)); agent-node quota 20/flow ([https://docs.aws.amazon.com/general/latest/gr/bedrock.html](https://docs.aws.amazon.com/general/latest/gr/bedrock.html)) | Flow variables/inputs per node ([https://docs.aws.amazon.com/bedrock/latest/userguide/key-definitions-flow.html](https://docs.aws.amazon.com/bedrock/latest/userguide/key-definitions-flow.html)) | **Flow output** node "returns the final result for each input in a different response" ([https://docs.aws.amazon.com/sagemaker-unified-studio/latest/userguide/nodes.html](https://docs.aws.amazon.com/sagemaker-unified-studio/latest/userguide/nodes.html)) |
| **Zapier Agents** | Not drawn — agent decides from instructions ([https://help.zapier.com/hc/en-us/articles/24593355420429-Best-practices-for-working-with-Zapier-Agents](https://help.zapier.com/hc/en-us/articles/24593355420429-Best-practices-for-working-with-Zapier-Agents)) | n/a | n/a | n/a (approval must be built as an action) (**unconfirmed**) | n/a | Agents can call Zaps as actions ([https://zapier.com/blog/zapier-agents-guide/](https://zapier.com/blog/zapier-agents-guide/)) | n/a | n/a |
| **Alibaba Model Studio** | **Conditional Logic node** ([https://help.aliyun.com/en/model-studio/workflow/conditional-node](https://help.aliyun.com/en/model-studio/workflow/conditional-node) — **China site only**); **Intent Classification node** "matches input text against configured intent descriptions and routes execution" ([https://help.aliyun.com/en/model-studio/workflow/intent-node](https://help.aliyun.com/en/model-studio/workflow/intent-node) — **China site only**) | **Loop node** runs a sub-canvas "loop body"; Batch Processing nodes are not allowed inside the loop body; no cross-boundary dragging ([https://help.aliyun.com/en/model-studio/workflow/loop-node](https://help.aliyun.com/en/model-studio/workflow/loop-node) — **China site only**) | **Batch Processing node** "supports concurrent execution across multiple elements" vs serial Loop ([https://help.aliyun.com/en/model-studio/workflow/batch-node](https://help.aliyun.com/en/model-studio/workflow/batch-node) — **China site only**); intl page instructs "Add a large model node to the batch node" ([https://www.alibabacloud.com/help/en/model-studio/workflow-application](https://www.alibabacloud.com/help/en/model-studio/workflow-application)) | Workflow apps are recommended for "managing multi-step approval flows" ([https://www.alibabacloud.com/help/en/model-studio/application-introduction](https://www.alibabacloud.com/help/en/model-studio/application-introduction)); no dedicated human-approval node found → **unconfirmed** | **Script node** ([https://help.aliyun.com/en/model-studio/workflow-application/](https://help.aliyun.com/en/model-studio/workflow-application/) — **China site only**) | **Application Component node** (published agent/workflow as a component) ([https://help.aliyun.com/en/model-studio/workflow/component-node](https://help.aliyun.com/en/model-studio/workflow/component-node), [https://help.aliyun.com/en/model-studio/use-agent-or-workflow-as-component](https://help.aliyun.com/en/model-studio/use-agent-or-workflow-as-component) — **China site only**); **Agent Group node** = multi-agent ([https://help.aliyun.com/en/model-studio/workflow/agent-group-node](https://help.aliyun.com/en/model-studio/workflow/agent-group-node) — **China site only**) | **Variable Processing node** ([https://help.aliyun.com/en/model-studio/workflow/variable-processing-node](https://help.aliyun.com/en/model-studio/workflow/variable-processing-node) — **China site only**) | **End node** + **Process Output node** ("output specified content at any point during workflow execution—not only as the final output") ([https://help.aliyun.com/en/model-studio/workflow/process-output-node](https://help.aliyun.com/en/model-studio/workflow/process-output-node) — **China site only**) |

---

## 2. How each tool shows an agent's tools, and how it shows model choice

**Two competing conventions** — this is the single most important drawing decision for the app.

| Convention | Tools | How tools are shown | How model choice is shown |
|---|---|---|---|
| **Attached (sub-nodes / ports)** | n8n, Langflow, Flowise (chatflow), ADK Visual Builder, Copilot Studio (agent-level) | n8n: the AI Agent is a **root node** "that you extend with sub-nodes, such as a chat model, tools, [memory]" ([https://docs.n8n.io/key-concept-glossary](https://docs.n8n.io/key-concept-glossary)); "Click the tool connector on the AI Agent node" ([https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent)). Langflow: "Connect the custom component's tool output to the Agent component's Tools input" ([https://docs.langflow.org/agents-tools](https://docs.langflow.org/agents-tools)). ADK canvas: "tools appear as connected icons" ([https://medium.com/google-cloud/building-ai-agents-visually-with-google-adk-visual-agent-builder-bb441e59a78c](https://medium.com/google-cloud/building-ai-agents-visually-with-google-adk-visual-agent-builder-bb441e59a78c) — third party). Copilot Studio: tools are added at **agent level**, "Add node (+) → Add a tool" ([https://learn.microsoft.com/en-us/microsoft-copilot-studio/add-tools-custom-agent](https://learn.microsoft.com/en-us/microsoft-copilot-studio/add-tools-custom-agent)). | n8n: the model is itself a **sub-node** (Chat Model) attached to the agent, so the model is a separate visual object, not a dropdown on the agent ([https://docs.n8n.io/key-concept-glossary](https://docs.n8n.io/key-concept-glossary)); multiple Chat Model nodes can coexist in one workflow ([https://blog.n8n.io/production-ai-playbook-deterministic-steps-ai-steps/](https://blog.n8n.io/production-ai-playbook-deterministic-steps-ai-steps/)). Langflow: "The LLM specified in the Agent…" component ([https://docs.langflow.org/components-agents](https://docs.langflow.org/components-agents)). ADK: per-agent `model` on LlmAgent ([https://adk.dev/agents/llm-agents/](https://adk.dev/agents/llm-agents/)). |
| **Inline (a step in the sequence)** | Dify, Coze, Bedrock Flows, OpenAI Agent Builder, Model Studio, AgentRun Flow, prompt flow, Flowise AgentFlow V2 | Dify: **Tool node** and **Agent node** are steps on the canvas ([https://docs.dify.ai/en/cloud/use-dify/nodes/tools](https://docs.dify.ai/en/cloud/use-dify/nodes/tools), [https://docs.dify.ai/en/cloud/use-dify/nodes/agent](https://docs.dify.ai/en/cloud/use-dify/nodes/agent)). Coze: **Plugin node** "invoke a plugin in a workflow to run specified tools" ([https://www.coze.com/open/docs/guides/plugin_node](https://www.coze.com/open/docs/guides/plugin_node)). Bedrock: Lambda / inline code / S3 / Lex / agent / knowledge base nodes are peers in the flow ([https://docs.aws.amazon.com/bedrock/latest/userguide/key-definitions-flow.html](https://docs.aws.amazon.com/bedrock/latest/userguide/key-definitions-flow.html)). Model Studio: Plugin / API / Function Compute / MCP / Script nodes ([https://help.aliyun.com/en/model-studio/workflow/mcp-node](https://help.aliyun.com/en/model-studio/workflow/mcp-node) — **China site only**). | Model is a **property of the LLM-type node**: Dify LLM node "sends prompts to your configured models" ([https://docs.dify.ai/en/cloud/use-dify/nodes/llm](https://docs.dify.ai/en/cloud/use-dify/nodes/llm)); Question Classifier and Parameter Extractor are also model-backed nodes ([https://docs.dify.ai/en/cloud/use-dify/nodes/question-classifier](https://docs.dify.ai/en/cloud/use-dify/nodes/question-classifier), [https://docs.dify.ai/en/cloud/use-dify/nodes/parameter-extractor](https://docs.dify.ai/en/cloud/use-dify/nodes/parameter-extractor)). Model Studio LLM node "invokes a large language model… from configured prompts and model parameters" ([https://help.aliyun.com/en/model-studio/workflow/llm-node](https://help.aliyun.com/en/model-studio/workflow/llm-node) — **China site only**); Knowledge Base node has a "Model configuration" list for the node ([https://www.alibabacloud.com/help/tr/model-studio/rag-knowledge-base](https://www.alibabacloud.com/help/tr/model-studio/rag-knowledge-base)). Bedrock prompt nodes reference a foundation model / prompt (inference parameters are a separate Bedrock concept: [https://docs.aws.amazon.com/bedrock/latest/userguide/inference-parameters.html](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-parameters.html)). Copilot Studio is the exception: the model is chosen **once per agent**, with per-region model availability ([https://learn.microsoft.com/en-us/microsoft-copilot-studio/prompt-model-availability](https://learn.microsoft.com/en-us/microsoft-copilot-studio/prompt-model-availability)). |

Notes that matter for the app:

- n8n's agent loop is *inside* one node: "The n8n AI Agent node is a loop where a chat model chooses and calls tools; it repeats until the model answers without requesting a tool" ([https://www.activepieces.com/blog/n8n-ai-agent-node-explained-tools-memory-cost](https://www.activepieces.com/blog/n8n-ai-agent-node-explained-tools-memory-cost) — competitor blog, third party). So a faithful n8n-style diagram has **one agent box with N attached tool boxes and no loop edge drawn**.
- Tool count has cost consequences, which pre-sales will be asked about: "Each tool you attach to an AI Agent node is re-billed every turn" ([https://community.n8n.io/t/each-tool-you-attach-to-an-ai-agent-node-is-re-billed-every-turn-some-numbers-i-measured/304536?tl=es](https://community.n8n.io/t/each-tool-you-attach-to-an-ai-agent-node-is-re-billed-every-turn-some-numbers-i-measured/304536?tl=es) — community measurement, third party).
- Sub-agent-as-tool is now a first-class node in n8n: "The AI Agent Tool node allows a root-level agent in your workflow to call other agents as tools to simplify multi-agent orchestration" ([https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolaiagent](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolaiagent)). Flowise has an equivalent Agent-as-tool tutorial ([https://docs.flowiseai.com/tutorials/agent-as-tool](https://docs.flowiseai.com/tutorials/agent-as-tool)).
- Dify exposes the agent's *strategy* as a visible property: Function Calling vs ReAct ([https://docs.dify.ai/en/cloud/use-dify/nodes/agent](https://docs.dify.ai/en/cloud/use-dify/nodes/agent), [https://enterprise-docs.dify.ai/en/3.2.x/use/workflow/node/agent](https://enterprise-docs.dify.ai/en/3.2.x/use/workflow/node/agent)). Strategy choice affects which models work — "Some AI models (like Gemini 2.0 with ReAct strategy) don't support…" ([https://github.com/langgenius/dify/discussions/24278](https://github.com/langgenius/dify/discussions/24278)).
- Alibaba's Model Studio separates **Agent Creation** (one agent, tools+KB inline) from **Agent Group** (several published agents coordinated by a decision model) ([https://help.aliyun.com/en/model-studio/workflow/agent-create-node](https://help.aliyun.com/en/model-studio/workflow/agent-create-node), [https://help.aliyun.com/en/model-studio/workflow/agent-group-node](https://help.aliyun.com/en/model-studio/workflow/agent-group-node) — **China site only**). That maps cleanly onto "single agent" vs "supervisor + specialists" in a diagram.

---

## 3. Loops, retries, parallel branches, handoffs

### 3.1 Loops / iteration — three distinct visual idioms

| Idiom | Tools | Evidence |
|---|---|---|
| **Container node with an inner sub-canvas** (loop body drawn *inside* a box) | Alibaba Model Studio Loop node ("orchestrates loop logic via a dedicated sub-canvas (the loop body)"; Batch Processing nodes not allowed inside; no cross-boundary dragging) ([https://help.aliyun.com/en/model-studio/workflow/loop-node](https://help.aliyun.com/en/model-studio/workflow/loop-node) — **China site only**); Dify Iteration and Loop ([https://docs.dify.ai/en/cloud/use-dify/nodes/iteration](https://docs.dify.ai/en/cloud/use-dify/nodes/iteration), [https://docs.dify.ai/en/cloud/use-dify/nodes/loop](https://docs.dify.ai/en/cloud/use-dify/nodes/loop)); Flowise Iteration/Loop ([https://github.com/FlowiseAI/Flowise/issues/4653](https://github.com/FlowiseAI/Flowise/issues/4653)) | as cited |
| **Paired fan-out/fan-in nodes** (iterator → … → collector) | Bedrock Flows: iterator "takes an array and iteratively returns its items"; collector "takes an iterated input, in addition to the size that the array will be, and returns them as an array"; also a **DoWhile** loop node ([https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html](https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html), [https://aws.amazon.com/blogs/machine-learning/dowhile-loops-now-supported-in-amazon-bedrock-flows/](https://aws.amazon.com/blogs/machine-learning/dowhile-loops-now-supported-in-amazon-bedrock-flows/)) | as cited |
| **Back-edge (cycle) on the graph** | LangGraph cycles ([https://www.langchain.com/blog/langgraph](https://www.langchain.com/blog/langgraph)); n8n Loop Over Items routes output back to the loop node ([https://docs.n8n.io/build/flow-logic/loop](https://docs.n8n.io/build/flow-logic/loop)); Camunda BPMN agent loop built from an ad-hoc sub-process plus gateways ([https://docs.camunda.io/docs/components/connectors/out-of-the-box-connectors/agentic-ai-aiagent/](https://docs.camunda.io/docs/components/connectors/out-of-the-box-connectors/agentic-ai-aiagent/)); ADK LoopAgent ([https://adk.dev/agents/workflow-agents/loop-agents/](https://adk.dev/agents/workflow-agents/loop-agents/)) | as cited |

Batch vs loop is a distinction both Dify and Alibaba make explicitly and that customers understand: Dify Iteration processes arrays element-wise, Loop repeats while building on the previous cycle ([https://docs.dify.ai/en/cloud/use-dify/nodes/loop](https://docs.dify.ai/en/cloud/use-dify/nodes/loop)); Model Studio's Batch Processing node "supports concurrent execution across multiple elements" while Loop is serial ([https://help.aliyun.com/en/model-studio/workflow/batch-node](https://help.aliyun.com/en/model-studio/workflow/batch-node) — **China site only**).

### 3.2 Retries and error paths

| Tool | Mechanism | Source |
|---|---|---|
| n8n | Node-level **Retry On Fail** (maxTries + wait) for transient failures; **On Error** = Continue / Continue (using error output); workflow-level **error workflow** triggered by an **Error Trigger** node | [https://community.n8n.io/t/best-practice-for-centralized-error-handling-and-retry-from-failed-step-in-production-workflows/300785](https://community.n8n.io/t/best-practice-for-centralized-error-handling-and-retry-from-failed-step-in-production-workflows/300785), [https://github.com/n8n-io/n8n/issues/10763](https://github.com/n8n-io/n8n/issues/10763), [https://docs.n8n.io/build/flow-logic/handle-errors-gracefully](https://docs.n8n.io/build/flow-logic/handle-errors-gracefully), [https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.errortrigger](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.errortrigger) |
| Dify | Per-node error handling: LLM node "Set maximum retry attempts, intervals between retries, and backoff multipliers"; HTTP/Code nodes retry up to 10 times with intervals ≤ 5000 ms; "Loop nodes always stop immediately when any child node fails" | [https://docs.dify.ai/en/cloud/use-dify/nodes/llm](https://docs.dify.ai/en/cloud/use-dify/nodes/llm), [https://docs.dify.ai/en/cloud/use-dify/nodes/http-request](https://docs.dify.ai/en/cloud/use-dify/nodes/http-request), [https://docs.dify.ai/en/cloud/use-dify/nodes/code](https://docs.dify.ai/en/cloud/use-dify/nodes/code), [https://docs.dify.ai/en/cloud/use-dify/build/predefined-error-handling-logic](https://docs.dify.ai/en/cloud/use-dify/build/predefined-error-handling-logic) |
| Dify (gap) | Agent node has **no** built-in exception branch: "Currently, Dify does not support built-in exception branches or custom error handling for Agent Node" | [https://github.com/langgenius/dify/discussions/26638](https://github.com/langgenius/dify/discussions/26638) |
| Bedrock Flows | Visual node validation instead of retry semantics: green = valid node configuration, red = invalid; guardrails attachable to prompt/knowledge-base nodes | [https://aws.amazon.com/blogs/machine-learning/amazon-bedrock-flows-is-now-generally-available-with-enhanced-safety-and-traceability/](https://aws.amazon.com/blogs/machine-learning/amazon-bedrock-flows-is-now-generally-available-with-enhanced-safety-and-traceability/), [https://dev.to/aws-builders/amazon-bedrock-flows-now-generally-available-with-enhanced-safety-and-traceability-4e0d](https://dev.to/aws-builders/amazon-bedrock-flows-now-generally-available-with-enhanced-safety-and-traceability-4e0d) |
| LangGraph / Agent Framework | Retries are code/config, not a drawn node; Agent Framework adds checkpoints as a workflow capability | [https://learn.microsoft.com/en-us/agent-framework/workflows/](https://learn.microsoft.com/en-us/agent-framework/workflows/) |
| BPMN (Camunda) | Retry/compensation expressed with standard BPMN events and boundary timers around the agent activity | [https://camunda.com/blog/2025/03/essential-agentic-patterns-ai-agents-bpmn/](https://camunda.com/blog/2025/03/essential-agentic-patterns-ai-agents-bpmn/) |

### 3.3 Parallel branches

- Dify: nodes can be arranged "in series or in parallel" ([https://docs.dify.ai/en/cloud/use-dify/build/orchestrate-node](https://docs.dify.ai/en/cloud/use-dify/build/orchestrate-node)); Iteration can run elements "sequentially or in parallel" ([https://docs.dify.ai/en/cloud/use-dify/nodes/iteration](https://docs.dify.ai/en/cloud/use-dify/nodes/iteration)); **but** Variable Aggregator is for exclusive branches only ([https://docs.dify.ai/en/cloud/use-dify/nodes/variable-aggregator](https://docs.dify.ai/en/cloud/use-dify/nodes/variable-aggregator)) — a real trap when drawing parallel joins.
- LangGraph: `Send` API for map-reduce / dynamic fan-out ([https://docs.langchain.com/oss/python/langgraph/use-graph-api](https://docs.langchain.com/oss/python/langgraph/use-graph-api)); best practice is "Use Send for dynamic fan-out, Command for update+route" ([https://forum.langchain.com/t/best-practices-for-parallel-nodes-fanouts/1900](https://forum.langchain.com/t/best-practices-for-parallel-nodes-fanouts/1900)).
- Bedrock Flows: iterator → (parallel item processing) → collector, with only **1 collector per flow** ([https://docs.aws.amazon.com/general/latest/gr/bedrock.html](https://docs.aws.amazon.com/general/latest/gr/bedrock.html)).
- ADK: ParallelAgent runs sub-agents concurrently ([https://adk.dev/agents/workflow-agents/parallel-agents/](https://adk.dev/agents/workflow-agents/parallel-agents/)); ADK 2 replaces it with a graph Workflow that can express "two independent branches and a join barrier" ([https://dev.to/raju_dandigam/multi-agent-does-not-mean-parallel-safe-workflows-with-google-adk-3j3](https://dev.to/raju_dandigam/multi-agent-does-not-mean-parallel-safe-workflows-with-google-adk-3j3) — third party).
- Microsoft: **Concurrent** orchestration pattern ([https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/](https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/)); Azure Architecture Center documents sequential, concurrent, group chat, handoff and magentic patterns with diagrams ([https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)).
- Alibaba Model Studio: Batch Processing node = concurrency ([https://help.aliyun.com/en/model-studio/workflow/batch-node](https://help.aliyun.com/en/model-studio/workflow/batch-node) — **China site only**).

### 3.4 Handoffs between agents

| Pattern | Where documented | Source |
|---|---|---|
| **Explicit directed edge between agents** (handoff) | LangGraph `Command` ("specify any other node in the graph to jump to"); Microsoft Agent Framework handoff ("The developer declares a graph of agents and the directed edges between them"); LangChain names four multi-agent patterns: "subagents, skills, handoffs, and routers" | [https://www.langchain.com/blog/command-a-new-tool-for-multi-agent-architectures-in-langgraph](https://www.langchain.com/blog/command-a-new-tool-for-multi-agent-architectures-in-langgraph), [https://devblogs.microsoft.com/agent-framework/a-tour-of-handoff-orchestration-pattern/](https://devblogs.microsoft.com/agent-framework/a-tour-of-handoff-orchestration-pattern/), [https://www.langchain.com/blog/choosing-the-right-multi-agent-architecture](https://www.langchain.com/blog/choosing-the-right-multi-agent-architecture) |
| **Agent-as-tool (orchestrator calls specialist, keeps control)** | OpenAI Agents SDK "handoffs and agents-as-tools"; n8n AI Agent Tool; Flowise agent-as-tool | [https://developers.openai.com/api/docs/guides/agents/orchestration](https://developers.openai.com/api/docs/guides/agents/orchestration), [https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolaiagent](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolaiagent), [https://docs.flowiseai.com/tutorials/agent-as-tool](https://docs.flowiseai.com/tutorials/agent-as-tool) |
| **Supervisor + collaborators** | Bedrock: "When you invoke the supervisor agent, it automatically creates and executes a plan across a set of collaborator agents and routes relevant requests"; AWS best-practice post: "A supervisor agent determines user intent and delegates to specialist agents. Peer…" | [https://docs.aws.amazon.com/bedrock/latest/userguide/agents-multi-agent-collaboration.html](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-multi-agent-collaboration.html), [https://aws.amazon.com/blogs/machine-learning/ai-agents-in-enterprises-best-practices-with-amazon-bedrock-agentcore/](https://aws.amazon.com/blogs/machine-learning/ai-agents-in-enterprises-best-practices-with-amazon-bedrock-agentcore/) |
| **Decision-model-routed agent group** | Alibaba Model Studio Agent Group node: "compose multiple published agent applications into a coordinated group. A decision-making model…" | [https://help.aliyun.com/en/model-studio/workflow/agent-group-node](https://help.aliyun.com/en/model-studio/workflow/agent-group-node) — **China site only** |
| **Jump conditions on an agent canvas** | Coze multi-agent mode: "On the agent canvas, give it a prompt and some jump conditions to connect to the other nodes" | [https://cozehq.medium.com/building-an-all-in-one-personal-assistant-with-cozes-multi-agent-mode-e0f695137edf](https://cozehq.medium.com/building-an-all-in-one-personal-assistant-with-cozes-multi-agent-mode-e0f695137edf) — third party |
| **Hierarchical delegation via subgraph** | LangGraph subgraph-as-node; Studio can navigate parent/child graphs | [https://docs.langchain.com/oss/python/langgraph/use-subgraphs](https://docs.langchain.com/oss/python/langgraph/use-subgraphs), [https://docs.langchain.com/langsmith/studio](https://docs.langchain.com/langsmith/studio) |

**Drawing pitfall to encode as a rule:** LangGraph Studio cannot render `Command`-based routing unless destinations are declared — "all Command-inferred edges are invisible, making it impossible to understand the flow in LangGraph Studio" ([https://github.com/langchain-ai/langgraph/issues/2965](https://github.com/langchain-ai/langgraph/issues/2965)); "to show edges on the graph when using Command, you need to specify all the nodes it can send to" ([https://forum.langchain.com/t/visualizing-graph-when-using-command-object-without-edges/760](https://forum.langchain.com/t/visualizing-graph-when-using-command-object-without-edges/760)); Studio also "can get confused with Command + nested subgraph work" ([https://forum.langchain.com/t/langsmith-ui-stuck-in-router-node-when-not-not-invoking-subgraph-from-router-node/3990](https://forum.langchain.com/t/langsmith-ui-stuck-in-router-node-when-not-not-invoking-subgraph-from-router-node/3990)). Lesson: **every implicit route must still be drawn as an explicit labelled edge.**

---

## 4. Layout: direction, auto-layout algorithms, readability

### 4.1 Direction

| Tool | Direction | Source |
|---|---|---|
| n8n | Left→right is mandatory; a feature request explicitly asks to "escape the mandatory Left-to-Right (LTR) horizontal constraint" | [https://community.n8n.io/t/dynamic-node-layouts-native-vertical-orientation-label-positioning/296484?tl=en](https://community.n8n.io/t/dynamic-node-layouts-native-vertical-orientation-label-positioning/296484?tl=en) |
| Copilot Studio topics | Top→bottom vertical node list inside a topic ("Copilot Studio automatically inserts a Trigger node and a blank Message node"; nodes added "under the node after which you want…") | [https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-create-edit-topics](https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-create-edit-topics), [https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-send-message](https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-send-message) |
| Dify, Coze, Model Studio, AgentRun, Bedrock Flows, Langflow, Flowise, ADK/Workflow Builder | Horizontal canvas with drag-and-drop nodes; explicit direction statements **not found in vendor docs** → direction is *observed*, treat as **unconfirmed** in docs | Dify "orchestration canvas" ([https://docs.dify.ai/en/learn/tutorials/workflow-101/lesson-02](https://docs.dify.ai/en/learn/tutorials/workflow-101/lesson-02)); Coze "visual canvas… dragging and dropping nodes" ([https://www.coze.com/open/docs/guides/workflow](https://www.coze.com/open/docs/guides/workflow)); Bedrock "Flow builder… drag and drop nodes" ([https://docs.aws.amazon.com/bedrock/latest/userguide/key-definitions-flow.html](https://docs.aws.amazon.com/bedrock/latest/userguide/key-definitions-flow.html)); Model Studio "Drag a LLM node from the left-side pane to the canvas" ([https://www.alibabacloud.com/help/en/model-studio/workflow-application](https://www.alibabacloud.com/help/en/model-studio/workflow-application)); AgentRun "drag and drop nodes" ([https://www.alibabacloud.com/help/en/agentrun/quick-start-to-low-code-agent-creation-1](https://www.alibabacloud.com/help/en/agentrun/quick-start-to-low-code-agent-creation-1)) |
| Zapier Agents | No graph at all — panel-based configuration (trigger / instructions / knowledge / actions) | [https://help.zapier.com/hc/en-us/articles/24393442652557-Build-an-agent-in-Zapier-Agents](https://help.zapier.com/hc/en-us/articles/24393442652557-Build-an-agent-in-Zapier-Agents) |

### 4.2 Auto-layout engines

- The de-facto stack for React-based builders is **dagre** or **ELK (elkjs)**: React Flow's own layouting guide says "Dagre is a simple library for layouting directed graphs. It has minimal configuration options and a focus on speed over choosing the most [optimal layout]" and "Good alternatives to dagre are d3-hierarchy or elkjs if you are looking for a more advanced layouting library" ([https://reactflow.dev/learn/layouting/layouting](https://reactflow.dev/learn/layouting/layouting), [https://reactflow.dev/examples/layout/dagre](https://reactflow.dev/examples/layout/dagre)). The auto-layout example demonstrates "dagre, d3-hierarchy, or elkjs" ([https://reactflow.dev/examples/layout/auto-layout](https://reactflow.dev/examples/layout/auto-layout)).
- **ELK Layered** is the Sugiyama-style algorithm: "Arranges as many edges as possible into one direction by placing nodes into subsequent layers"; nodes are layered then reordered "such that the number of edge crossings is minimized" ([https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html)). It exposes ~140 layout options for spacing, edges and nodes ([https://rtsys.informatik.uni-kiel.de/~biblio/downloads/papers/arxiv23c.pdf](https://rtsys.informatik.uni-kiel.de/~biblio/downloads/papers/arxiv23c.pdf)), including a dedicated crossing-minimization strategy ([https://eclipse.dev/elk/reference/options/org-eclipse-elk-layered-crossingMinimization-strategy.html](https://eclipse.dev/elk/reference/options/org-eclipse-elk-layered-crossingMinimization-strategy.html), [https://eclipse.dev/elk/blog/posts/2025/25-08-21-layered.html](https://eclipse.dev/elk/blog/posts/2025/25-08-21-layered.html)).
- Practical pipeline recipe (measure real node sizes in two passes, treat the graph as the single source of truth): Stately's "React Flow + ELK: automatic layout cookbook" ([https://stately.ai/docs/packages/graph/react-flow-elk-pipeline](https://stately.ai/docs/packages/graph/react-flow-elk-pipeline)).
- Known failure modes worth designing around: dagre/ELK mis-order nodes when a node has multiple handles/ports ([https://github.com/xyflow/xyflow/discussions/4248](https://github.com/xyflow/xyflow/discussions/4248)), re-layout after inserting a node mid-chain ([https://github.com/xyflow/xyflow/discussions/4251](https://github.com/xyflow/xyflow/discussions/4251)), and dagre's tendency to reorder sibling nodes ([https://github.com/dagrejs/dagre/issues/359](https://github.com/dagrejs/dagre/issues/359)).
- **Which builder uses which engine is not published by the vendors.** Confirmed only for Langflow: its own repo states the frontend uses "@xyflow/react for graph visualization" ([https://github.com/langflow-ai/langflow/blob/main/AGENTS.md](https://github.com/langflow-ai/langflow/blob/main/AGENTS.md)). Dify's and Flowise's canvas libraries and layout engines: **unconfirmed**.
- n8n has auto-arrange in the editor (right-click canvas → "Auto-arrange") per a third-party guide ([https://www.scribd.com/document/977046857/The-Ultimate-n8n-Starter-Guide](https://www.scribd.com/document/977046857/The-Ultimate-n8n-Starter-Guide) — third party); the n8n editor changelog references auto-layout behavior ("Prevent group frames from overlapping during auto-layout") ([https://classic.yarnpkg.com/en/package/n8n-editor-ui](https://classic.yarnpkg.com/en/package/n8n-editor-ui)). An official n8n auto-layout doc page was **not found**.
- Text-first export is a real pattern: Microsoft Agent Framework workflows export to **Mermaid or Graphviz** via `ToMermaidString()` / `ToDotString()` ([https://learn.microsoft.com/en-us/agent-framework/workflows/visualization](https://learn.microsoft.com/en-us/agent-framework/workflows/visualization)); LangGraph graphs render as Mermaid ([https://www.krishnaik.in/ai-tutorials/langgraph/draw-mermaid](https://www.krishnaik.in/ai-tutorials/langgraph/draw-mermaid) — third party). If you emit Mermaid, beware: subgraph `direction` is frequently ignored/unsupported ([https://github.com/mermaid-js/mermaid/issues/6438](https://github.com/mermaid-js/mermaid/issues/6438), [https://github.com/mermaid-js/mermaid/issues/6785](https://github.com/mermaid-js/mermaid/issues/6785)).

### 4.3 Keeping large graphs readable

| Technique | Evidence |
|---|---|
| **MiniMap** for bird's-eye navigation, "especially for larger flows" | [https://reactflow.dev/learn/concepts/built-in-components](https://reactflow.dev/learn/concepts/built-in-components), [https://reactflow.dev/api-reference/components/minimap](https://reactflow.dev/api-reference/components/minimap) |
| **Grouping / sub-flows** (nested graphs, group nodes) | [https://reactflow.dev/examples/grouping/sub-flows](https://reactflow.dev/examples/grouping/sub-flows) |
| **Sticky notes as visual stage banners** in n8n ("Drag sticky notes behind nodes. You can use this to visually group nodes") | [https://docs.n8n.io/build/understand-workflows/workflow-components/add-notes-and-documentation](https://docs.n8n.io/build/understand-workflows/workflow-components/add-notes-and-documentation); community practice of one sticky per logical stage: [https://community.n8n.io/t/how-to-make-your-canvas-beautiful-informational-and-professional/301934?tl=en](https://community.n8n.io/t/how-to-make-your-canvas-beautiful-informational-and-professional/301934?tl=en) |
| **Split into sub-workflows** (n8n: select nodes → "Create sub-workflow"; Execute Sub-workflow Trigger) | [https://docs.n8n.io/build/flow-logic/break-workflows-into-smaller-parts](https://docs.n8n.io/build/flow-logic/break-workflows-into-smaller-parts), [https://community.n8n.io/t/how-to-use-sub-workflows-in-n8-when-to-use-examples/257577?tl=en](https://community.n8n.io/t/how-to-use-sub-workflows-in-n8-when-to-use-examples/257577?tl=en) |
| **Collapse a sub-graph into one node** (LangGraph subgraph-as-node; Flowise Execute Flow; Coze nested Workflow node; Model Studio Application Component node) | [https://docs.langchain.com/oss/python/langgraph/use-subgraphs](https://docs.langchain.com/oss/python/langgraph/use-subgraphs), [https://github.com/FlowiseAI/Flowise/issues/4653](https://github.com/FlowiseAI/Flowise/issues/4653), [https://www.coze.com/open/docs/guides/workflow_node](https://www.coze.com/open/docs/guides/workflow_node), [https://help.aliyun.com/en/model-studio/workflow/component-node](https://help.aliyun.com/en/model-studio/workflow/component-node) (**China site only**) |
| **Hard node caps force decomposition**: Coze 1000 nodes/workflow; Bedrock Flows 20 agent nodes, 5 condition nodes, 1 collector per flow | [https://www.coze.com/open/docs/guides/workflow_limits](https://www.coze.com/open/docs/guides/workflow_limits), [https://docs.aws.amazon.com/general/latest/gr/bedrock.html](https://docs.aws.amazon.com/general/latest/gr/bedrock.html) |
| **Progressive disclosure**: Dify argues for a visual canvas that "deepens as users grow", starting from simple workflows ([https://dify.ai/blog/why-a-reliable-visual-agentic-workflow-matters](https://dify.ai/blog/why-a-reliable-visual-agentic-workflow-matters)); GitHub's engineering team argues canvases "make state explicit and persistent. Humans can inspect and guide" ([https://github.blog/ai-and-ml/github-copilot/how-canvases-make-agentic-workflows-visible-steerable-and-cost-efficient/](https://github.blog/ai-and-ml/github-copilot/how-canvases-make-agentic-workflows-visible-steerable-and-cost-efficient/)) |
| **BPMN container for agent tools** — one ad-hoc sub-process box holds the agent's tool set, so tools don't clutter the top-level process: "The agent logic is contained within the AI Task Agent activity and the tools it has access to is displayed with an ad-hoc sub-process" | [https://camunda.com/blog/2025/05/benefits-bpmn-ai-agents/](https://camunda.com/blog/2025/05/benefits-bpmn-ai-agents/), [https://docs.camunda.io/docs/components/connectors/out-of-the-box-connectors/agentic-ai-aiagent-tool-definitions/](https://docs.camunda.io/docs/components/connectors/out-of-the-box-connectors/agentic-ai-aiagent-tool-definitions/) |

### 4.4 Published notations (BPMN and vendor reference architectures)

- **Camunda/BPMN for agents**: "An AI agent is an automation within Camunda that leverages ad-hoc subprocesses to perform one or more tasks with non-deterministic behavior" ([https://camunda.com/blog/2025/02/building-ai-agent-camunda/](https://camunda.com/blog/2025/02/building-ai-agent-camunda/)); the agent loop is an "AI Agent Task connector… with a multi-instance ad-hoc sub-process and gateways" ([https://docs.camunda.io/docs/components/connectors/out-of-the-box-connectors/agentic-ai-aiagent/](https://docs.camunda.io/docs/components/connectors/out-of-the-box-connectors/agentic-ai-aiagent/)); a tool is "a single BPMN element, or a flow of BPMN elements, inside an ad-hoc sub-process that an LLM can choose to invoke" ([https://docs.camunda.io/docs/components/connectors/out-of-the-box-connectors/agentic-ai-aiagent-tool-definitions/](https://docs.camunda.io/docs/components/connectors/out-of-the-box-connectors/agentic-ai-aiagent-tool-definitions/)); BPMN ad-hoc subprocess semantics = contained activities "Executed in any order, Executed several times, or [omitted]" ([https://camunda.com/bpmn/reference/](https://camunda.com/bpmn/reference/)); 7 agentic patterns including ReAct, tool use, RAG and self-reflection ([https://www.classcentral.com/course/youtube-7-patterns-for-building-better-ai-agents-using-bpmn-in-camunda/474598](https://www.classcentral.com/course/youtube-7-patterns-for-building-better-ai-agents-using-bpmn-in-camunda/474598), [https://camunda.com/blog/2025/03/essential-agentic-patterns-ai-agents-bpmn/](https://camunda.com/blog/2025/03/essential-agentic-patterns-ai-agents-bpmn/)).
- **Academic BPMN extension for human–agent workflows**: Ait-Mimoune Fonolla et al., *Towards Modeling Human-Agentic Collaborative Workflows: A BPMN Extension* (arXiv:2412.05958) — "Our extension covers both the formalization of the new metamodeling concepts required and the proposal of a BPMN-like graphical notation" ([https://arxiv.org/abs/2412.05958](https://arxiv.org/abs/2412.05958), [https://arxiv.org/html/2412.05958v1](https://arxiv.org/html/2412.05958v1)); implemented in Sirius with a public tool ([https://github.com/besser-pearl/agentic-bpmn](https://github.com/besser-pearl/agentic-bpmn), [https://modeling-languages.com/modeling-human-agent-collaborative-workflows-extending-bpmn/](https://modeling-languages.com/modeling-human-agent-collaborative-workflows-extending-bpmn/)).
- **BPMN + multi-agent + RAG methodology**: Tebourbi et al., *BPMN-Based Design of Multi-Agent Systems* (MDPI Information 16(9):809, 2025) — "BPMN is used to define and structure the high-level learning workflow, where each task represents a discrete…" ([https://www.mdpi.com/2078-2489/16/9/809](https://www.mdpi.com/2078-2489/16/9/809)).
- **LLM-authored BPMN**: *BPMN Assistant: An LLM-Based Approach to Business [Process Modeling]* ([https://arxiv.org/html/2509.24592v1](https://arxiv.org/html/2509.24592v1)).
- **Vendor reference-architecture diagrams** worth mirroring: Anthropic's five workflow patterns plus the augmented LLM (prompt chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer) ([https://www.anthropic.com/research/building-effective-agents](https://www.anthropic.com/research/building-effective-agents)); Azure Architecture Center orchestration patterns with diagrams ([https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)); AWS "Guidance for Multi-Agent Orchestration on AWS" architecture diagram (AgentCore orchestrating specialist agents) ([https://docs.aws.amazon.com/solutions/multi-agent-orchestration-on-aws/](https://docs.aws.amazon.com/solutions/multi-agent-orchestration-on-aws/)); Google's 8 multi-agent patterns in ADK ([https://developers.googleblog.com/developers-guide-to-multi-agent-patterns-in-adk/](https://developers.googleblog.com/developers-guide-to-multi-agent-patterns-in-adk/)); LangChain's four patterns — subagents, skills, handoffs, routers ([https://www.langchain.com/blog/choosing-the-right-multi-agent-architecture](https://www.langchain.com/blog/choosing-the-right-multi-agent-architecture)).

---

## 5. Natural-language → workflow: what they generate and where they fail

| Product | What the NL feature generates | Known weaknesses / limits |
|---|---|---|
| **n8n AI Workflow Builder → n8n Assistant** | "create, refine, and debug workflows using natural language descriptions of your goals" ([https://docs.n8n.io/build/ways-of-building-workflows/ai-workflow-builder](https://docs.n8n.io/build/ways-of-building-workflows/ai-workflow-builder)); the Assistant is "a new chat-based agent that lives right inside n8n and builds workflows for you from plain language" and **supersedes the AI Workflow Builder** ([https://blog.n8n.io/introducing-n8n-assistant/](https://blog.n8n.io/introducing-n8n-assistant/), [https://community.n8n.io/t/introducing-the-ai-assistant-the-workflow-building-agent-inside-n8n/302667](https://community.n8n.io/t/introducing-the-ai-assistant-the-workflow-building-agent-inside-n8n/302667)); it builds visibly on canvas and **asks the user for permission** ([https://docs.n8n.io/build-your-first-workflow](https://docs.n8n.io/build-your-first-workflow)); selected nodes appear as chat chips and sync with canvas selection ([https://docs.n8n.io/changelog/release-notes](https://docs.n8n.io/changelog/release-notes)); credentials are never sent to the AI ([https://community.n8n.io/t/introducing-the-ai-assistant-the-workflow-building-agent-inside-n8n/302667](https://community.n8n.io/t/introducing-the-ai-assistant-the-workflow-building-agent-inside-n8n/302667)); self-hosted users must bring their own AI provider ([https://docs.n8n.io/build-your-first-workflow](https://docs.n8n.io/build-your-first-workflow)); the related "Ask n8n AI" assistant is Cloud-only ([https://docs.n8n.io/build/ways-of-building-workflows/use-the-ai-assistant](https://docs.n8n.io/build/ways-of-building-workflows/use-the-ai-assistant)) | Credentials still have to be filled in by the human; n8n docs steer users to focused prompts "For the best results, ask focused questions" ([https://docs.n8n.io/build/ways-of-building-workflows/use-the-ai-assistant](https://docs.n8n.io/build/ways-of-building-workflows/use-the-ai-assistant)) |
| **Copilot Studio "describe it"** | "you can describe what you want your agent to do in your own words" ([https://learn.microsoft.com/en-us/microsoft-copilot-studio/fundamentals-get-started](https://learn.microsoft.com/en-us/microsoft-copilot-studio/fundamentals-get-started)); "To author topics, you can describe what you want and have AI create the [topic]" ([https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-create-edit-topics](https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-create-edit-topics)); "Create agent flows using natural language. Describe the overall flow you want your agent to follow, and Copilot Studio generates it for you" ([https://learn.microsoft.com/en-us/microsoft-copilot-studio/nlu-gpt-overview](https://learn.microsoft.com/en-us/microsoft-copilot-studio/nlu-gpt-overview)); at the top level "Describe the business goal… Copilot Studio determines the right combination of agents and workflows" ([https://learn.microsoft.com/en-us/microsoft-copilot-studio/fundamentals-what-is-copilot-studio](https://learn.microsoft.com/en-us/microsoft-copilot-studio/fundamentals-what-is-copilot-studio)) | Practitioner reports are blunt: "The agent building chat says they're added but they're not. This is normal. The describe it to build it function isn't very good" ([https://www.reddit.com/r/copilotstudio/comments/1tjqrwl/license_issues_on_agents/](https://www.reddit.com/r/copilotstudio/comments/1tjqrwl/license_issues_on_agents/)) |
| **Google — Agent Studio / Workflow Builder / ADK Visual Builder** | "Agent Studio directly launches the agent builder work in the agent designer canvas, **pre-populating the agent flow and configuration based on your prompt**" ([https://docs.cloud.google.com/gemini-enterprise-agent-platform/agent-studio/design-agents](https://docs.cloud.google.com/gemini-enterprise-agent-platform/agent-studio/design-agents)); ADK Visual Builder has "An AI assistant to help you build agents using natural language" ([https://github.com/google/adk-python/discussions/3428](https://github.com/google/adk-python/discussions/3428)) that "handles clarifying questions… and generates complete project [files]" ([https://www.theunwindai.com/p/google-adk-visual-agent-builder](https://www.theunwindai.com/p/google-adk-visual-agent-builder) — third party); output is Agent Config YAML + Python for custom tools ([https://adk.dev/visual-builder/](https://adk.dev/visual-builder/)); it "converts plain English descriptions into working AI agents" ([https://www.codecademy.com/article/google-adk-visual-agent-builder-build-your-first-ai-agent](https://www.codecademy.com/article/google-adk-visual-agent-builder-build-your-first-ai-agent) — third party) | Generated artifacts are code/YAML, so correctness is verified by running, not by reading a diagram ([https://adk.dev/visual-builder/](https://adk.dev/visual-builder/)) |
| **Zapier Agents** | "In plain language, describe what you want your agent to do. Our prompt assistant will auto-enhance your instructions" ([https://zapier.com/blog/zapier-agents-guide/](https://zapier.com/blog/zapier-agents-guide/)) | Generates *instructions*, not a workflow graph — nothing to diagram ([https://help.zapier.com/hc/en-us/articles/24393442652557-Build-an-agent-in-Zapier-Agents](https://help.zapier.com/hc/en-us/articles/24393442652557-Build-an-agent-in-Zapier-Agents)) |
| **OpenAI Agent Builder** | Templates + drag-and-drop node canvas ([https://developers.openai.com/api/docs/guides/agent-builder](https://developers.openai.com/api/docs/guides/agent-builder)) | Product is deprecated and shuts down 2026-11-30; export to Agents SDK code is lossy per third parties ([https://developers.openai.com/api/docs/guides/agent-builder](https://developers.openai.com/api/docs/guides/agent-builder), [https://www.sim.ai/comparisons/openai-agentkit](https://www.sim.ai/comparisons/openai-agentkit)) |
| **Dify** | No first-party NL→canvas generator found in docs; a community "Workflow Skill" generates importable Dify DSL from natural language ([https://github.com/langgenius/dify/discussions/34916](https://github.com/langgenius/dify/discussions/34916)) | Treat as **unconfirmed** for the product itself |
| **Bedrock Flows** | No NL-generation feature documented ([https://docs.aws.amazon.com/bedrock/latest/userguide/flows.html](https://docs.aws.amazon.com/bedrock/latest/userguide/flows.html)) | **unconfirmed / absent** |
| **Alibaba Model Studio / AgentRun** | No NL→workflow-canvas generator found; AgentRun's low-code path is drag-and-drop ([https://www.alibabacloud.com/help/en/agentrun/quick-start-to-low-code-agent-creation-1](https://www.alibabacloud.com/help/en/agentrun/quick-start-to-low-code-agent-creation-1)) | **unconfirmed / absent** — this is whitespace for your app |

### The best public evidence on NL→workflow failure rates

**Chat2Workflow: A Benchmark for Generating Executable Visual Workflows with Natural Language** (arXiv:2604.19667, 2026, ZJU; benchmark targets Dify-style DSL):

- It measures both a **pass rate** and a **resolve rate** for each task ([https://arxiv.org/html/2604.19667v2](https://arxiv.org/html/2604.19667v2)).
- Best model reaches only **46.55% resolve rate**; "All models exhibit a lower resolve rate than pass rate" ([https://arxiv.org/html/2604.19667v2](https://arxiv.org/html/2604.19667v2)).
- Largest average pass-vs-resolve gap: **20.96% (GLM-4.6)**, with a task-specific gap of 43% ([https://www.emergentmind.com/topics/chat2workflow](https://www.emergentmind.com/topics/chat2workflow)).
- Their agentic framework adds only **up to 6.05%** resolve-rate improvement — "the remaining performance gap highlights executable workflow generation as a key [open problem]" ([https://arxiv.org/html/2604.19667v2](https://arxiv.org/html/2604.19667v2), [https://arxiv.org/abs/2604.19667](https://arxiv.org/abs/2604.19667)).
- Benchmark spans six domains and includes multi-turn interaction ([https://arxiv.org/html/2604.19667v1](https://arxiv.org/html/2604.19667v1), [https://huggingface.co/papers/2604.19667](https://huggingface.co/papers/2604.19667)).
- Failure taxonomy includes node-type choice and branching-node handling ([https://huggingface.co/datasets/zjunlp/Chat2Workflow-Evaluation/blob/3044d64dcca2966c038ac208d3e28aa4300ab7c9/README.md](https://huggingface.co/datasets/zjunlp/Chat2Workflow-Evaluation/blob/3044d64dcca2966c038ac208d3e28aa4300ab7c9/README.md)).

**Implication for your app:** generate a *reviewable diagram* first, not an executable artifact. "Pass" (structurally valid) is much easier than "resolve" (does what the user meant), so the diagram + a confirm loop is the mitigation the benchmark effectively endorses. n8n's Assistant already does the same thing: it asks permission while building on canvas ([https://docs.n8n.io/build-your-first-workflow](https://docs.n8n.io/build-your-first-workflow)).

---

## 6. Recommended minimal node & edge vocabulary

Design constraints used: (a) must be recognizable to users of n8n/Dify/Coze/Bedrock Flows/Copilot Studio; (b) must be drawable by a chat-driven generator without ambiguity (Chat2Workflow shows node-type confusion is a top failure mode — [https://arxiv.org/html/2604.19667v2](https://arxiv.org/html/2604.19667v2)); (c) must be readable by a business reader in a proposal export; (d) every implicit decision must become an explicit labelled edge (LangGraph Studio lesson — [https://github.com/langchain-ai/langgraph/issues/2965](https://github.com/langchain-ai/langgraph/issues/2965)).

### 10 node kinds

| # | Node kind | One-line justification | Closest precedent |
|---|---|---|---|
| 1 | **Trigger** | Every builder separates "what starts this" from "what it does"; without it the diagram can't answer "when does this run?" | n8n trigger nodes ([https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook)); Dify Trigger = "a type of Start node… on a schedule or in response to events" ([https://docs.dify.ai/en/cloud/use-dify/nodes/trigger/overview](https://docs.dify.ai/en/cloud/use-dify/nodes/trigger/overview)); Zapier trigger ([https://help.zapier.com/hc/en-us/articles/45394909914381-Set-up-your-agent-s-trigger](https://help.zapier.com/hc/en-us/articles/45394909914381-Set-up-your-agent-s-trigger)) |
| 2 | **Model call (LLM step)** | The most common node in every tool, and the one that carries cost — it must be visible so token estimates can hang off it | Dify LLM ([https://docs.dify.ai/en/cloud/use-dify/nodes/llm](https://docs.dify.ai/en/cloud/use-dify/nodes/llm)); Model Studio LLM node ([https://help.aliyun.com/en/model-studio/workflow/llm-node](https://help.aliyun.com/en/model-studio/workflow/llm-node) — **China site only**); Bedrock prompt node ([https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html](https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html)) |
| 3 | **Agent (model + tools, loops internally)** | Customers say "agent" and mean a self-directing box; drawing its loop as a badge (not edges) matches n8n/Bedrock/Dify and keeps the picture small | n8n AI Agent ([https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent)); Bedrock agent node ([https://docs.aws.amazon.com/bedrock/latest/userguide/key-definitions-flow.html](https://docs.aws.amazon.com/bedrock/latest/userguide/key-definitions-flow.html)); Model Studio Agent Creation node ([https://help.aliyun.com/en/model-studio/workflow/agent-create-node](https://help.aliyun.com/en/model-studio/workflow/agent-create-node) — **China site only**) |
| 4 | **Tool / API action** | The thing that touches the customer's systems; pre-sales must show it because it drives integration effort and permissions | Coze plugin node ([https://www.coze.com/open/docs/guides/plugin_node](https://www.coze.com/open/docs/guides/plugin_node)); Dify HTTP/Tool ([https://docs.dify.ai/en/cloud/use-dify/nodes/http-request](https://docs.dify.ai/en/cloud/use-dify/nodes/http-request)); AgentCore Gateway MCP tools ([https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-core-concepts.html](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-core-concepts.html)); Model Studio API/MCP/Function Compute nodes ([https://help.aliyun.com/en/model-studio/workflow/mcp-node](https://help.aliyun.com/en/model-studio/workflow/mcp-node) — **China site only**) |
| 5 | **Knowledge retrieval (RAG)** | Answers "where does it get our facts?" — the #1 enterprise objection; every tool has a dedicated node for it | Dify Knowledge Retrieval ([https://docs.dify.ai/en/cloud/use-dify/nodes/knowledge-retrieval](https://docs.dify.ai/en/cloud/use-dify/nodes/knowledge-retrieval)); Bedrock knowledge base node ([https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html](https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html)); Copilot Studio generative answers ([https://learn.microsoft.com/en-us/microsoft-copilot-studio/nlu-boost-node](https://learn.microsoft.com/en-us/microsoft-copilot-studio/nlu-boost-node)); Model Studio Knowledge Base node ([https://www.alibabacloud.com/help/en/model-studio/workflow-application](https://www.alibabacloud.com/help/en/model-studio/workflow-application)) |
| 6 | **Decision / router** | Routing is where business readers engage ("routine vs needs a human"); both rule-based and model-based routers must be one shape with a label | Dify If-Else + Question Classifier ([https://docs.dify.ai/en/cloud/use-dify/nodes/ifelse](https://docs.dify.ai/en/cloud/use-dify/nodes/ifelse), [https://docs.dify.ai/en/cloud/use-dify/nodes/question-classifier](https://docs.dify.ai/en/cloud/use-dify/nodes/question-classifier)); Flowise Condition vs Condition Agent ([https://docs.flowiseai.com/using-flowise/agentflowv2](https://docs.flowiseai.com/using-flowise/agentflowv2)); Model Studio Conditional Logic + Intent Classification ([https://help.aliyun.com/en/model-studio/workflow/intent-node](https://help.aliyun.com/en/model-studio/workflow/intent-node) — **China site only**); Bedrock condition node ([https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html](https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html)) |
| 7 | **Loop / for-each (container)** | Retry-until-good and per-item processing are the two agentic loops; a container box beats a back-edge for readability and matches Model Studio's sub-canvas loop body | Model Studio Loop node ([https://help.aliyun.com/en/model-studio/workflow/loop-node](https://help.aliyun.com/en/model-studio/workflow/loop-node) — **China site only**); Dify Iteration/Loop ([https://docs.dify.ai/en/cloud/use-dify/nodes/iteration](https://docs.dify.ai/en/cloud/use-dify/nodes/iteration)); Bedrock iterator+collector ([https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html](https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html)) |
| 8 | **Human step (ask / approve)** | The deal-closer for support-email use cases; now a first-class node in Dify, Flowise and OpenAI, and an interrupt in LangGraph | Dify Human Input ([https://docs.dify.ai/en/cloud/use-dify/nodes/human-input](https://docs.dify.ai/en/cloud/use-dify/nodes/human-input)); LangGraph interrupt with approve/edit/reject/respond ([https://docs.langchain.com/oss/python/langchain/human-in-the-loop](https://docs.langchain.com/oss/python/langchain/human-in-the-loop)); n8n Wait + Slack approvals ([https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait), [https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.slack/approvals](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.slack/approvals)); OpenAI User approval node ([https://culturro.com/blog/openai-agent-builder/](https://culturro.com/blog/openai-agent-builder/)) |
| 9 | **Sub-agent / sub-workflow (collapsed box)** | The only proven way to keep multi-agent diagrams small; every mature tool has a collapse mechanism | LangGraph subgraph-as-node ([https://docs.langchain.com/oss/python/langgraph/use-subgraphs](https://docs.langchain.com/oss/python/langgraph/use-subgraphs)); n8n sub-workflow ([https://docs.n8n.io/build/flow-logic/break-workflows-into-smaller-parts](https://docs.n8n.io/build/flow-logic/break-workflows-into-smaller-parts)); Coze nested workflow node ([https://www.coze.com/open/docs/guides/workflow_node](https://www.coze.com/open/docs/guides/workflow_node)); Flowise Execute Flow ([https://github.com/FlowiseAI/Flowise/issues/4653](https://github.com/FlowiseAI/Flowise/issues/4653)); Model Studio Application Component / Agent Group ([https://help.aliyun.com/en/model-studio/workflow/agent-group-node](https://help.aliyun.com/en/model-studio/workflow/agent-group-node) — **China site only**) |
| 10 | **Output / reply** | Business readers need an explicit "this is what the customer/agent receives"; Dify even splits Output (API) from Answer (chat), a distinction worth keeping as a node *attribute* | Dify Output vs Answer ([https://docs.dify.ai/en/cloud/use-dify/nodes/output](https://docs.dify.ai/en/cloud/use-dify/nodes/output), [https://docs.dify.ai/en/cloud/use-dify/nodes/answer](https://docs.dify.ai/en/cloud/use-dify/nodes/answer)); Bedrock flow output node ([https://docs.aws.amazon.com/sagemaker-unified-studio/latest/userguide/nodes.html](https://docs.aws.amazon.com/sagemaker-unified-studio/latest/userguide/nodes.html)); Model Studio Process Output node ([https://help.aliyun.com/en/model-studio/workflow/process-output-node](https://help.aliyun.com/en/model-studio/workflow/process-output-node) — **China site only**) |

**Deliberately excluded, and where they go instead:**

| Concept | Where it lives | Why not a node |
|---|---|---|
| Code / script / data transform | A **variant badge on Tool** ("code", "script", "transform") | Present in Dify Code ([https://docs.dify.ai/en/cloud/use-dify/nodes/code](https://docs.dify.ai/en/cloud/use-dify/nodes/code)), Bedrock inline code ([https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html](https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html)), OpenAI Transform ([https://developers.openai.com/api/docs/guides/node-reference](https://developers.openai.com/api/docs/guides/node-reference)), Model Studio Script node — but it reads as plumbing, not as a business step |
| Memory | A **badge on Agent** (short-term / long-term) + optional side-car box | n8n draws memory as a sub-node ([https://docs.n8n.io/key-concept-glossary](https://docs.n8n.io/key-concept-glossary)); Model Studio has a Memory node ([https://help.aliyun.com/en/model-studio/workflow/memory-node](https://help.aliyun.com/en/model-studio/workflow/memory-node) — **China site only**); AgentCore Memory is a service ([https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html)) — as a top-level node it confuses business readers |
| Guardrail / safety check | A **badge on Decision or Agent** | OpenAI Guardrail node ([https://developers.openai.com/api/docs/guides/node-reference](https://developers.openai.com/api/docs/guides/node-reference)); Bedrock guardrails attach *to* prompt/knowledge-base nodes rather than being steps ([https://aws.amazon.com/blogs/machine-learning/amazon-bedrock-flows-is-now-generally-available-with-enhanced-safety-and-traceability/](https://aws.amazon.com/blogs/machine-learning/amazon-bedrock-flows-is-now-generally-available-with-enhanced-safety-and-traceability/)) |
| Variable aggregator / merge | An **edge join**, shown as a small merge dot | Dify's aggregator only works for exclusive branches ([https://docs.dify.ai/en/cloud/use-dify/nodes/variable-aggregator](https://docs.dify.ai/en/cloud/use-dify/nodes/variable-aggregator)); Coze has a Variable merge node ([https://www.coze.com/open/docs/guides/variable_merge_node](https://www.coze.com/open/docs/guides/variable_merge_node)); Bedrock uses a collector node ([https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html](https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html)) — a full box overstates its importance |
| Parallel fan-out | **Multiple labelled edges** from one node + a join dot | Matches Dify series/parallel ([https://docs.dify.ai/en/cloud/use-dify/build/orchestrate-node](https://docs.dify.ai/en/cloud/use-dify/build/orchestrate-node)) and LangGraph Send ([https://docs.langchain.com/oss/python/langgraph/use-graph-api](https://docs.langchain.com/oss/python/langgraph/use-graph-api)) |

### Edge vocabulary (4 kinds)

| Edge | Meaning | Precedent |
|---|---|---|
| **Solid arrow, unlabelled** | Sequence / data flow | n8n connections pass "data from one node's output to another node's input" ([https://docs.n8n.io/build/understand-workflows/workflow-components/connect-nodes-together](https://docs.n8n.io/build/understand-workflows/workflow-components/connect-nodes-together)) |
| **Solid arrow + condition label** | Branch outcome ("routine", "needs human", "else") | Bedrock condition node inputs ([https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html](https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html)); Copilot Studio condition branches ([https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-using-conditions](https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-using-conditions)) |
| **Dashed arrow into the side of an Agent box** | Attachment, not sequence: tool / model / memory / knowledge bound to the agent | n8n sub-node connectors ([https://docs.n8n.io/key-concept-glossary](https://docs.n8n.io/key-concept-glossary)); Langflow tool output → Agent Tools input ([https://docs.langflow.org/agents-tools](https://docs.langflow.org/agents-tools)) |
| **Dotted arrow + "waits for"** | Control passes to a human or to another agent and comes back | LangGraph interrupt/resume ([https://docs.langchain.com/oss/python/langgraph/interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)); Microsoft handoff edges ([https://devblogs.microsoft.com/agent-framework/a-tour-of-handoff-orchestration-pattern/](https://devblogs.microsoft.com/agent-framework/a-tour-of-handoff-orchestration-pattern/)) |

### Layout rules to encode

1. **Left→right, layered** (ELK Layered / dagre class): matches n8n's mandatory LTR ([https://community.n8n.io/t/dynamic-node-layouts-native-vertical-orientation-label-positioning/296484?tl=en](https://community.n8n.io/t/dynamic-node-layouts-native-vertical-orientation-label-positioning/296484?tl=en)) and React Flow's documented options ([https://reactflow.dev/learn/layouting/layouting](https://reactflow.dev/learn/layouting/layouting)); ELK minimizes edge crossings ([https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html)).
2. **Attachments hang below the agent** (n8n sub-node convention) so the main path stays a single horizontal spine ([https://docs.n8n.io/key-concept-glossary](https://docs.n8n.io/key-concept-glossary)).
3. **Loops are containers**, not back-edges, unless the loop is the agent's own reasoning loop (then it's a badge) ([https://help.aliyun.com/en/model-studio/workflow/loop-node](https://help.aliyun.com/en/model-studio/workflow/loop-node) — **China site only**; [https://docs.dify.ai/en/cloud/use-dify/nodes/iteration](https://docs.dify.ai/en/cloud/use-dify/nodes/iteration)).
4. **Cap top-level nodes around 12–20** and collapse the rest into sub-workflow boxes; Bedrock enforces 20 agent nodes and 5 condition nodes per flow, Coze caps at 1000 nodes ([https://docs.aws.amazon.com/general/latest/gr/bedrock.html](https://docs.aws.amazon.com/general/latest/gr/bedrock.html), [https://www.coze.com/open/docs/guides/workflow_limits](https://www.coze.com/open/docs/guides/workflow_limits)).
5. **Always draw implicit routes.** Never emit an agent whose possible next steps aren't edges ([https://github.com/langchain-ai/langgraph/issues/2965](https://github.com/langchain-ai/langgraph/issues/2965)).
6. **Provide a minimap + group banners** for anything over ~15 nodes ([https://reactflow.dev/api-reference/components/minimap](https://reactflow.dev/api-reference/components/minimap), [https://docs.n8n.io/build/understand-workflows/workflow-components/add-notes-and-documentation](https://docs.n8n.io/build/understand-workflows/workflow-components/add-notes-and-documentation)).
7. **Offer a Mermaid/Graphviz text export** for proposals and diffing, but do not rely on Mermaid subgraph direction ([https://learn.microsoft.com/en-us/agent-framework/workflows/visualization](https://learn.microsoft.com/en-us/agent-framework/workflows/visualization), [https://github.com/mermaid-js/mermaid/issues/6785](https://github.com/mermaid-js/mermaid/issues/6785)).
8. **Show the model as a small label on every model-backed node** (model call, decision-by-LLM, agent) — that is how Dify, Model Studio and ADK expose it, and it is what a cost estimate must attach to ([https://docs.dify.ai/en/cloud/use-dify/nodes/llm](https://docs.dify.ai/en/cloud/use-dify/nodes/llm), [https://help.aliyun.com/en/model-studio/workflow/llm-node](https://help.aliyun.com/en/model-studio/workflow/llm-node) — **China site only**, [https://adk.dev/agents/llm-agents/](https://adk.dev/agents/llm-agents/)).

---

## 7. Crosswalk: node kind → Alibaba Cloud product (for the catalog)

Only products whose pages I could open today are listed. Region caveats from your 2026-10-31 verification are repeated where the docs restate them.

| Diagram element | Alibaba Cloud product / feature | Source |
|---|---|---|
| Model call | Model Studio model APIs (Qwen and third-party models); Singapore region has independent endpoints, API keys and model lists | [https://www.alibabacloud.com/help/en/model-studio/models](https://www.alibabacloud.com/help/en/model-studio/models), [https://www.alibabacloud.com/help/en/model-studio/singapore-regional-access-information](https://www.alibabacloud.com/help/en/model-studio/singapore-regional-access-information) |
| Knowledge retrieval | Model Studio knowledge base (RAG) — drag a Knowledge Base node onto the workflow canvas | [https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base](https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base), [https://www.alibabacloud.com/help/en/model-studio/workflow-application](https://www.alibabacloud.com/help/en/model-studio/workflow-application) |
| Agent (no-code) | Model Studio **agent applications** ("connect an LLM to external tools and knowledge bases without code") — restricted: only accounts that created Singapore applications before 2025-04-21 can call the application APIs | [https://www.alibabacloud.com/help/en/model-studio/single-agent-application](https://www.alibabacloud.com/help/en/model-studio/single-agent-application), [https://www.alibabacloud.com/help/en/model-studio/application-introduction](https://www.alibabacloud.com/help/en/model-studio/application-introduction) |
| Workflow (no-code) | Model Studio **workflow applications** — same Singapore restriction; node set: Start/End, Conditional Logic, Loop, Batch Processing, Process Output, LLM, Knowledge Base, Intent Classification, Parameter Extraction, Multimodal Generation, Agent Creation, Agent Group, Variable Processing, Memory, API, Function Compute, Script, Plugin, MCP, AppFlow, Application Component, Data Connector | [https://www.alibabacloud.com/help/en/model-studio/workflow-application](https://www.alibabacloud.com/help/en/model-studio/workflow-application) (intl); node catalogue **China site only**: [https://help.aliyun.com/en/model-studio/workflow-application/](https://help.aliyun.com/en/model-studio/workflow-application/), [https://help.aliyun.com/en/model-studio/workflow/introduction](https://help.aliyun.com/en/model-studio/workflow/introduction) |
| Sub-agent / multi-agent | Model Studio **Agent Group node** — "compose multiple published agent applications into a coordinated group. A decision-making model…" (**China site only**) | [https://help.aliyun.com/en/model-studio/workflow/agent-group-node](https://help.aliyun.com/en/model-studio/workflow/agent-group-node) |
| Agent runtime (pro-code) | **AgentRun**: serverless runtime powered by Function Compute; no-code Quick Create, high-code (code), low-code **Flow Agent** on a visual canvas; Python/Node.js/Java runtimes, sandbox supports 50+ languages | [https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun](https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun), [https://www.alibabacloud.com/help/en/agentrun/quick-start-to-low-code-agent-creation-1](https://www.alibabacloud.com/help/en/agentrun/quick-start-to-low-code-agent-creation-1), [https://www.alibabacloud.com/help/en/functioncompute/create-agent-by-code-high-code](https://www.alibabacloud.com/help/en/functioncompute/create-agent-by-code-high-code) |
| Tool / MCP gateway, memory, knowledge for pro-code agents | **AgentCore** — "unified platform for building, governing, and executing enterprise AI agents… three core [layers]"; building layer "unifies runtime sandbox, memory store, knowledge base, model services, and gateway"; AgentCore SDK manages "models, MCP tools, Skills, memory, and credentials" | [https://www.alibabacloud.com/en/product/agentcore?_p_lc=1](https://www.alibabacloud.com/en/product/agentcore?_p_lc=1), [https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview](https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview), [https://www.alibabacloud.com/help/en/agentcore/agentcore-sdk-overview](https://www.alibabacloud.com/help/en/agentcore/agentcore-sdk-overview) |
| Observability badge on the diagram | **AgentLoop** — "non-intrusive, end-to-end collection of observability data, including traces, metrics, and logs"; OpenTelemetry-based full-chain tracing | [https://www.alibabacloud.com/en/product/agentloop?_p_lc=1](https://www.alibabacloud.com/en/product/agentloop?_p_lc=1), [https://www.alibabacloud.com/help/en/agentloop/product-overview/what-is-agentloop](https://www.alibabacloud.com/help/en/agentloop/product-overview/what-is-agentloop), [https://www.alibabacloud.com/blog/what-does-alibaba-clouds-agent-infra-look-like_603177](https://www.alibabacloud.com/blog/what-does-alibaba-clouds-agent-infra-look-like_603177) |
| Code / script step | Model Studio Script node (**China site only**) or Function Compute node ([https://help.aliyun.com/en/model-studio/workflow/fc-node](https://help.aliyun.com/en/model-studio/workflow/fc-node)); AgentRun sandbox workspaces | [https://www.alibabacloud.com/blog/giving-your-ai-agent-a-disposable-workspace-with-alibaba-cloud-agentrun_603324](https://www.alibabacloud.com/blog/giving-your-ai-agent-a-disposable-workspace-with-alibaba-cloud-agentrun_603324) |
| Legacy visual builder to avoid recommending | **PAI-LangStudio** — retires 2027-03-09; node reference covers flow control, LLMs, agents, data retrieval, document parsing, speech recognition, Python | [https://www.alibabacloud.com/help/en/pai/node-reference](https://www.alibabacloud.com/help/en/pai/node-reference), [https://www.alibabacloud.com/help/en/pai/create-a-code-based-application](https://www.alibabacloud.com/help/en/pai/create-a-code-based-application) |
| "Workflow vs agent" decision framing to reuse in proposals | Alibaba Cloud blog: "Should This Workflow Be an Agent? A Three-Question Test"; "When a workflow earns an agent, build it code-first. AgentRun is Alibaba Cloud's agent infrastructure platform" | [https://www.alibabacloud.com/blog/603614](https://www.alibabacloud.com/blog/603614) |

---

## 8. Gaps and unconfirmed items

| Item | Status |
|---|---|
| Whether Model Studio **Flow Agent** (and its Agent Creation / Agent Group / Memory nodes) is available to international Singapore accounts | **unconfirmed** — docs found only at `help.aliyun.com/en` (**China site only**); the intl site still presents "agent applications" and "workflow applications" plus the pre-2025-04-21 Singapore restriction ([https://www.alibabacloud.com/help/en/model-studio/application-introduction](https://www.alibabacloud.com/help/en/model-studio/application-introduction)) |
| Full node list of **AgentRun Flow Agent** (beyond Start and LLM nodes) | **unconfirmed** — only the quickstart, AI-Gateway mapping doc and a VPC-endpoint doc surfaced ([https://www.alibabacloud.com/help/doc-detail/3049290.html](https://www.alibabacloud.com/help/doc-detail/3049290.html), [https://www.alibabacloud.com/help/doc-detail/3049289.html](https://www.alibabacloud.com/help/doc-detail/3049289.html)) |
| Exact auto-layout engine inside Dify, Coze, Flowise, Bedrock Flows, Model Studio | **unconfirmed** (no vendor doc). Only Langflow's use of `@xyflow/react` is stated in its repo ([https://github.com/langflow-ai/langflow/blob/main/AGENTS.md](https://github.com/langflow-ai/langflow/blob/main/AGENTS.md)) |
| Whether Bedrock AgentCore has any visual flow builder | **No evidence found**; docs describe Runtime/Gateway/Memory/Identity/Browser/Code Interpreter/Observability as services ([https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html)) |
| Exact names/limits of OpenAI Agent Builder's node set from the official node reference | Partially **unconfirmed** — the official node-reference page exists ([https://developers.openai.com/api/docs/guides/node-reference](https://developers.openai.com/api/docs/guides/node-reference)) but the enumerated categories (If-Else, While, User approval, Transform, Set State, Guardrail, MCP) came from third-party write-ups ([https://culturro.com/blog/openai-agent-builder/](https://culturro.com/blog/openai-agent-builder/), [https://medium.com/ai-software-engineer/i-tested-openais-agent-kit-so-you-don-t-have-to-here-s-your-first-practical-guide-agent-kit-5416bb6fa485](https://medium.com/ai-software-engineer/i-tested-openais-agent-kit-so-you-don-t-have-to-here-s-your-first-practical-guide-agent-kit-5416bb6fa485)) |
| Copilot Studio loop/parallel primitives inside topics | **unconfirmed** — topics expose Message, Question, Adaptive Card, Condition, Variable, Tool, Generative Answers, Go-to-topic ([https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-create-edit-topics](https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-create-edit-topics), [https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-ask-with-adaptive-card](https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-ask-with-adaptive-card)); iteration lives in agent flows ([https://learn.microsoft.com/en-us/microsoft-copilot-studio/flows-overview](https://learn.microsoft.com/en-us/microsoft-copilot-studio/flows-overview)) |
| Zapier Agents per-step model choice | **unconfirmed** — docs describe instructions/trigger/knowledge/actions only ([https://help.zapier.com/hc/en-us/articles/24393442652557-Build-an-agent-in-Zapier-Agents](https://help.zapier.com/hc/en-us/articles/24393442652557-Build-an-agent-in-Zapier-Agents)) |
| Whether Google's "Workflow Builder" GA date is 2026-09-03 | **China-site-equivalent caveat**: only a third-party guide states the date; Google's release notes state GA without a date in the snippet ([https://docs.cloud.google.com/release-notes](https://docs.cloud.google.com/release-notes), [https://www.workspaceblog.in/blog/gemini-enterprise-workflow-builder-guide/](https://www.workspaceblog.in/blog/gemini-enterprise-workflow-builder-guide/)) |

---

## Searches run (199)

- n8n AI Agent node documentation sub-nodes chat model memory tool
- Dify workflow node types list documentation chatflow
- LangGraph Studio graph visualization documentation
- Coze Studio workflow node types documentation
- Langflow components list documentation agent tools
- Flowise nodes documentation agentflow chatflow
- OpenAI AgentKit Agent Builder visual canvas documentation
- AWS Bedrock Flows visual workflow builder announcement
- Amazon Bedrock AgentCore components documentation
- Google ADK visual workflow builder Agent Designer
- Microsoft Copilot Studio "describe it to build it" agent creation
- Zapier Agents documentation how agents work steps
- Amazon Bedrock Flows node types prompt knowledge base lambda condition foreach collector inline code
- docs.dify.ai nodes iteration loop question classifier variable aggregator list operator
- Coze workflow nodes list LLM knowledge plugin code choice loop intent recognition
- Flowise AgentFlow V2 node reference Start Agent LLM Tool Retriever Human Condition Execute Flow
- Copilot Studio topics agents actions triggers node types documentation
- Azure AI Foundry prompt flow visual editor node types LLM tool
- docs.aws.amazon.com bedrock flows-nodes iterator node collector node nested foreach
- OpenAI Agent Builder node types guardrails conditional while loop agent node docs
- Dify Agent node documentation tools strategy function calling ReAct model
- n8n AI Agent node connected tools sub-nodes root node documentation how tools attach
- LangGraph conditional edges Command handoff subgraph visualization docs
- React Flow auto layout dagre elkjs workflow diagram direction left to right
- Alibaba Cloud Model Studio workflow application nodes alibabacloud.com help
- Alibaba Cloud Model Studio agent application AgentCore documentation international
- 阿里云百炼 智能体应用 工作流应用 节点 开始 大模型 判断 循环
- BPMN notation for LLM agent workflows paper
- agent workflow diagram notation BPMN extension AI agents research 2025
- n8n AI workflow builder natural language generate workflow limitations
- alibabacloud.com model studio workflow application node types start end large model knowledge base plugin conditional loop batch
- Alibaba Cloud AgentCore components Runtime Gateway Memory Observability Skills
- Google ADK SequentialAgent ParallelAgent LoopAgent multi-agent hierarchy docs
- Azure AI Foundry Agent Service multi-agent orchestration supervisor patterns documentation
- Copilot Studio multiagent orchestration agent flows generative orchestration documentation
- Zapier Agents instructions knowledge actions how an agent is built help.zapier.com
- adk.dev workflows Workflow agent node types sequential parallel loop escalation
- Vertex AI Agent Designer canvas node types subagents tools export ADK code
- Amazon Bedrock Flows limits node types list prompt agent knowledge base retrieval lambda condition return
- Camunda essential agentic patterns BPMN ad-hoc sub-process multi-instance human in the loop
- modeling-languages BPMN extension human agent collaborative workflows notation elements
- n8n docs AI Workflow Builder limitations what it generates nodes credentials
- alibabacloud.com PAI workflow node reference Start LLM knowledge retrieval condition loop
- Dify workflow node list Start End LLM Knowledge Retrieval Question Classifier IF/ELSE Code Template Variable Aggregator Parameter Extractor HTTP Request Tool Agent
- Flowise AgentFlow V2 nodes reference Start LLM Agent Tool Retriever Condition ConditionAgent HTTP ExecuteFlow DirectReply
- Copilot Studio node types message question condition action generative answers agent set variable list
- LangGraph Studio visualize graph nodes edges subgraphs human in the loop time travel docs.langchain.com
- n8n AI Agent node chat model sub-node connector memory tool root node cluster nodes docs
- Alibaba PAI LangStudio retirement migration Model Studio workflow apps node mapping
- PAI LangStudio workflow node reference LLM node condition node loop node batch node script node
- n8n dagre layout node view automatic node placement github source
- Dify workflow canvas auto layout dagre elkjs node position algorithm github
- Langflow Flowise React Flow dagre arrange nodes auto layout button
- Azure prompt flow tool node types index lookup intent python prompt combine serp evaluate
- OpenAI Agent Builder node reference "While Loop" "Guardrail" "Set State" "Transform" "If-Else" "MCP"
- Flowise AgentFlow V2 "Condition Agent" "Execute Flow" "Direct Reply" "Custom Tool" "Human" node reference
- Bedrock Flows node types "agent node" "retrieval node" "Lex node" "S3 node" "return node" "guardrail"
- 百炼 工作流应用 节点 大模型节点 知识库节点 意图分类节点 脚本转换节点 流程输出节点 批量节点 循环节点 条件判断节点
- Coze workflow node "LLM" "Knowledge" "Plugin" "Code" "Choice" "Loop" "Intent recognition" "Message" node types list
- Copilot Studio "add node" types message question condition action agent flow nodes list
- alibabacloud.com help en model-studio workflow "intent classification" node "parameter extraction" "loop" "batch"
- alibabacloud.com help en model-studio "large model node" OR "knowledge base node" workflow node documentation
- alibabacloud.com PAI node reference "LLM node" "conditional judgment" "loop" LangStudio application flow
- alibabacloud.com AgentCore product page build govern execute enterprise AI agents layers
- Alibaba Cloud AgentRun documentation Function Compute agent runtime
- Alibaba Cloud AgentLoop observability trace span agent evaluation documentation
- alibabacloud.com help en agentrun flow agent visual flow canvas nodes drag drop create
- Model Studio workflow "Script Conversion Node" OR "Multimodal Generation Node" OR "Process Output Node" OR "Plugin Node" alibabacloud
- AgentRun Alibaba "Flow" nodes LLM knowledge base MCP tool condition loop agent node
- help.aliyun.com model-studio workflow nodes list start end conditional loop batch process output large language model knowledge base intent parameter extraction multimodal API MCP data connector
- Model Studio workflow application agent orchestration node multi-agent alibabacloud.com
- Alibaba Cloud Model Studio application introduction agent vs workflow visual node orchestration
- alibabacloud.com "Agent Group Node" Model Studio workflow multi-agent
- alibabacloud.com help en agentrun flow node types LLM knowledge base condition loop create flow agent
- Model Studio application Singapore region availability workflow apps restricted accounts created before 2025-04-21
- elkjs layered algorithm options direction DOWN RIGHT spacing React Flow layouting docs
- reactflow.dev learn layouting layouting overview dagre elk d3-dag recommendations
- n8n workflow large graph readability sub-workflow execute workflow node grouping sticky notes docs
- developers.openai.com node reference Agent Builder "user approval" "while" "if-else" "guardrail" "transform" "set state" nodes
- n8n AI Transform AI Classifier node choose model docs flow logic
- LangGraph draw_mermaid get_graph visualization docs nodes edges diagram
- alibabacloud.com help en model-studio flow-agent-introduction Flow Agent visual application development
- Model Studio "Agent Creation Node" documentation alibaba
- Copilot Studio agent flows Power Automate designer actions vertical list documentation
- docs.n8n.io advanced-ai cluster nodes root nodes sub-nodes concepts AI agent
- docs.dify.ai nodes overview list all node types LLM agent knowledge retrieval HTTP request code template variable aggregator
- Coze workflow node types official documentation start end LLM knowledge plugin workflow code choice loop intent message variable image
- alibabacloud.com/help/en/model-studio/workflow memory-node AgentRun
- Amazon Bedrock AgentCore multi-agent collaboration supervisor routing documentation
- Langflow components categories agent tools vector store prompts logic docs.langflow.org
- arxiv 2412.05958 Towards Modeling Human-Agentic Collaborative Workflows BPMN extension constructs agentic task
- Camunda 7 agentic patterns BPMN AI agents list ad-hoc subprocess multi-instance boundary timer
- langflow dagre arrange nodes github auto layout Flowise elkjs
- Dify generate workflow from natural language description AI feature
- Amazon Bedrock Flows generate flow using AI natural language
- Copilot Studio describe it to build it official documentation create agent from description limitations
- docs.n8n.io "AI Workflow Builder" availability plan generate workflow prompt example templates limitations
- adk.dev visual-builder node types agent tool sub-agent canvas generate from description
- docs.langchain.com langsmith studio graph view table view subgraphs streaming
- agentpatternscatalog.org agent patterns catalog notations Flowise n8n LangGraph
- help.zapier.com build an agent Zapier Agents instructions knowledge actions triggers activities
- learn.microsoft.com copilot studio create agent from description Copilot generative AI "describe"
- docs.flowiseai.com agentflowv2 "Start" "LLM" "Agent" "Tool" "Retriever" "Condition" "Condition Agent" "HTTP" "Custom Tool" "Custom Function" "Execute Flow" "Direct Reply" "Human" "Sticky Note" node
- docs.dify.ai "Workflow & Chatflow" node types list start end answer LLM agent knowledge retrieval
- coze workflow node reference "Start" "End" "Large model" "Knowledge" "Plugin" "Code" "Choice" "Loop" "Intent recognition"
- docs.aws.amazon.com bedrock flows quotas limits nodes per flow
- cloud.google.com Vertex AI Agent Designer documentation canvas agents subagents preview
- n8n release notes auto arrange nodes layout feature changelog
- docs.aws.amazon.com general gr bedrock "(Flows)" nodes per flow quota prompt condition iterator collector
- Flowise AgentFlow V2 node reference list Iteration Loop Human Input Direct Reply Sticky Note Execute Flow Custom Function
- Azure prompt flow deprecated Foundry classic replacement agent service 2026
- n8n release notes editor "auto layout" OR "auto-arrange" nodes feature
- LangGraph Send API parallel map-reduce dynamic fan-out docs.langchain.com
- LangGraph interrupt human in the loop approve reject edit state docs
- "Agentflow V2" Flowise "Start" "LLM" "Agent" "Tool" "Retriever" "Condition" "Condition Agent" "HTTP" "Custom Tool" "Execute Flow" "Direct Reply" "Human" nodes documentation
- "docs.n8n.io" auto-arrange nodes canvas editor right click
- Bedrock Flows "return node" "collector node" "iterator node" "condition node" guardrail apply node types
- coze.com open docs workflow nodes start end large model knowledge plugin workflow code choice loop intent recognition message
- learn.microsoft.com copilot studio authoring-create-edit-topics node types message question condition action variable adaptive card
- adk.dev visual builder agent node tool node sub-agent node canvas elements generate
- docs.n8n.io build your first workflow AI workflow builder permission nodes generated
- Zapier Agents activities knowledge actions trigger instructions agent builder canvas
- Microsoft Foundry Agent Service multi-agent orchestration handoff sequential concurrent group chat patterns docs
- Anthropic building effective agents prompt chaining routing parallelization orchestrator-workers evaluator-optimizer diagrams
- coze.com open docs guides "choice node" "loop node" "code node" "knowledge node" workflow
- langflow github dagre elkjs auto layout arrange flow
- adk.dev visual-builder AI Assistant generate agents from natural language description canvas node types
- Microsoft Agent Framework workflow visualization mermaid graph docs learn.microsoft.com
- agentpatternscatalog.org patterns list router orchestrator workers evaluator optimizer
- docs.n8n.io node settings retry on fail error workflow continue on fail
- Dify node error handling retry configuration docs.dify.ai
- n8n "Send and Wait for Response" approval Slack node docs human in the loop
- n8n Agent Builder docs.n8n.io agents
- Dify workflow node list "Question Classifier" "Parameter Extractor" "Template" "Document Extractor" "List Operator" "Tool"
- Coze workflow "Choice node" "Message node" "End node" "Code node" "Knowledge node" documentation
- arxiv 2604.19667 benchmark generating executable visual workflows Dify Chat2Workflow results accuracy
- coze.com open docs guides "choice node" OR "code node" OR "knowledge node" OR "message node" workflow
- Copilot Studio topic node types "Set a variable" "Go to another topic" "Add a tool" "Generative Answers" "Agent"
- OpenAI Agent Builder deprecated shutdown November 2026 AgentKit changelog
- OpenAI AgentKit Agent Builder availability regions pricing enterprise
- OpenAI Agent Builder generate workflow from natural language prompt description feature
- Chat2Workflow arxiv resolve rate node type edge errors Dify workflow generation benchmark findings
- coze.com open docs "Start node" "End node" "Large model node" "Knowledge base node" "Plugin node" "Workflow node" "Code node" "Condition node" "Variable merge node"
- docs.n8n.io build-and-manage-agents n8n Agents instructions model tools knowledge
- AgentRun Alibaba "Flow" agent node types LLM node knowledge base node condition iteration alibabacloud.com
- Model Studio agent application components model prompt knowledge base plugins long-term memory alibabacloud.com
- Alibaba Cloud Model Studio agent group node decision-making model multi-agent coordination
- docs.n8n.io connections data flows left to right nodes outputs inputs
- docs.dify.ai workflow canvas nodes edges left to right orchestration logic overview
- docs.modelstudio.console.alibabacloud.com workflow node reference LLM knowledge base intent classification
- alibabacloud.com AgentRun "Flow Agent" quick start node types start LLM knowledge base end
- coze-studio github wiki workflow node types list frontend backend LLM knowledge plugin code condition loop
- LangGraph Studio graph view rendering limitations Command edges path not shown forum
- alibabacloud.com agentrun create flow agent nodes "LLM" "Knowledge Base" "Start" "End" "Condition" drag drop low-code
- Model Studio Flow Agent supported regions Singapore availability
- cloud.google.com Vertex AI Agent Designer documentation node types canvas agents subagents tools preview Gemini Enterprise
- Bedrock Flows visual builder node validation green background traceability GA blog
- Amazon Bedrock Flows long-running execution 24 hours asynchronous preview
- Bedrock AgentCore code first no visual builder framework agnostic runtime gateway memory identity browser code interpreter observability
- "AgentRun" flow low-code node "LLM node" OR "Knowledge base node" OR "Start node" Alibaba Cloud Function Compute
- docs.cloud.google.com gemini-enterprise-agent-platform agent designer canvas nodes subagents tools
- Gemini Enterprise Agent Studio visual canvas reasoning loops workflows node types
- Model Studio Flow Agent alibabacloud.com help en flow-agent-introduction visual application development agent workflow
- Alibaba Cloud Model Studio Singapore region application development availability 2026
- Alibaba Cloud Model Studio "Agent 2.0" OR "Flow Agent" new version workflow agent creation node
- docs.cloud.google.com "Agent Designer" build agent canvas node types subagent tool
- alibabacloud.com help en agentrun flow nodes reference LLM node knowledge base node plugin node condition
- help.zapier.com Zapier Agents "Add actions" "knowledge sources" "trigger" agent configuration no canvas
- ELK layered algorithm edge crossing minimization node placement strategies documentation
- React Flow minimap grouping subflows panel large graph readability documentation
- Mermaid flowchart subgraph direction layout limitations automatic
- docs.n8n.io Loop Over Items node split in batches loop documentation
- OpenAI Agents SDK handoffs documentation agents as tools
- Microsoft Agent Framework handoff orchestration executor edges documentation
- Dify workflow trigger node webhook schedule docs.dify.ai
- docs.flowiseai.com agentflowv2 node reference list "LLM" "Agent" "Tool" "Retriever" "Condition" "Human" "Execute Flow"
- Coze multi-agent mode agent as tool jump between agents documentation
- docs.n8n.io "AI Workflow Builder" "credentials" generate nodes "example" what it can and cannot do
- Chat2Workflow resolve rate pass rate error categories node type edge connection missing parameters
- learn.microsoft.com nlu-gpt-overview AI-based agent authoring Copilot Studio create topics agent flows natural language limitations preview
- docs.cloud.google.com agent-studio design-agents prompt canvas agent flow nodes tools subagents
- Zapier Agents natural language instructions prompt assistant auto-enhance weaknesses
- Dify workflow node "Human Input" v1.13.0 pause approve edit reroute blog
- docs.n8n.io "left to right" workflow nodes data direction canvas
- Alibaba Cloud Model Studio agent orchestration application merged into workflow application multi-agent
- Bedrock Flows flow builder left to right canvas orientation console screenshot documentation
- Dify workflow canvas left to right direction node layout horizontal
- docs.aws.amazon.com bedrock flows prompt node select model foundation model inference configuration temperature
- docs.n8n.io trigger nodes list schedule webhook chat trigger manual
- docs.dify.ai End node workflow output variables Answer node chatflow
- docs.n8n.io Wait node resume webhook form approval human in the loop
- docs.flowiseai.com agentflowv2 LLM node chat model configuration Agent node tools
- Dify why a reliable visual agentic workflow matters canvas readability blog
- "alibabacloud.com/help/en/model-studio/flow-agent" Flow Agent overview
- Model Studio Flow Agent overview visual application development platform agent workflow applications types
- alibabacloud.com help en agentrun what-is-agentrun low-code quick create agent flow high-code
- langflow github package.json "reactflow" OR "@xyflow/react" dependency
- dify github web package.json "@xyflow/react" react flow workflow canvas
- Flowise github package.json reactflow dependency ui

## Sources returned by search (1276)

- https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent
- https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent
- https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorymanager
- https://www.reddit.com/r/n8n/comments/1uzlmn9/how_to_use_the_simple_memory_node_in_n8n_ai_agent/
- https://www.activepieces.com/blog/n8n-ai-agent-node-explained-tools-memory-cost
- https://community.n8n.io/t/chat-memory-mongodb-and-new-conversations/309298?tl=en
- https://www.youtube.com/watch?v=yzvLfHb0nqE
- https://www.mongodb.com/docs/atlas/ai-integrations/n8n/build-ai-agent/
- https://community.n8n.io/t/ai-agent-node-is-not-displaying-the-expected-tool-chat-and-memory-inputs-and-looks-different/123569
- https://medium.com/@jdevesa27/how-to-build-agents-with-n8n-46aab3f05a6a
- https://docs.dify.ai/en/learn/key-concepts
- https://docs.dify.ai/en/cloud/use-dify/build/workflow-chatflow
- https://docs.dify.ai/en/cloud/use-dify/nodes/answer
- https://github.com/langgenius/dify/issues/24883
- https://www.youtube.com/watch?v=r2_TfU9d1Cg
- https://note.com/npaka/n/n74d706ea225b?hl=en
- https://docs.dify.ai/en/cloud/use-dify/nodes/user-input
- https://dify.ai/blog/dify-agent-node-introduction-when-workflows-learn-autonomous-reasoning
- https://github.com/langgenius/dify/discussions/26150
- https://dify.ai/
- https://docs.langchain.com/langsmith/studio
- https://docs.langchain.com/oss/python/langgraph/studio
- https://www.langchain.com/blog/langgraph-studio-the-first-agent-ide
- https://docs.langchain.com/oss/python/langgraph/graph-api
- https://www.youtube.com/watch?v=T9qYg_WFfQo
- https://marketplace.visualstudio.com/items?itemName=smazee.langgraph-visualizer
- https://www.ibm.com/think/topics/langgraph
- https://langfuse.com/changelog/2025-02-14-trace-graph-view
- https://docs.langchain.com/oss/python/langgraph/use-graph-api
- https://www.coze.com/open/docs/guides/workflow
- https://github.com/coze-dev/coze-studio/wiki/10.-Add-new-workflow-node-types-(frontend)
- https://www.coze.com/open/docs/guides/workflow_node
- https://www.youtube.com/watch?v=kRAObpzYH9g
- https://github.com/coze-dev/coze-studio/wiki/11.-Add-new-workflow-node-types-(backend)
- https://www.coze.com/open/docs/guides/plugin_node
- https://baike.baidu.com/en/item/Coze%20Workflow/6046400
- https://ai-tldr.dev/tools/coze-studio/
- https://www.coze.com/open/docs/guides/workflow_limits
- https://jimmysong.io/blog/open-source-ai-agent-workflow-comparison/
- https://docs.langflow.org/agents-tools
- https://docs.langflow.org/agents
- https://docs.langflow.org/concepts-components
- https://docs.langflow.org/components-agents
- https://github.com/langflow-ai/langflow/discussions/3668
- https://alain-airom.medium.com/building-custom-components-in-langflow-%EF%B8%8F-def27d0c913a
- https://docs.langflow.org/bundles-codeagents
- https://www.youtube.com/watch?v=Zy2UvggGxno
- https://www.langflow.org/blog/langflow-1-7/
- https://app.thetestingacademy.com/blog/langflow-chains-agents
- https://docs.flowiseai.com/using-flowise/agentflowv2
- https://docs.flowiseai.com/
- https://github.com/FlowiseAI/Flowise/discussions/3013
- https://www.youtube.com/watch?v=9TaRksXuLWY
- https://docs.flowiseai.com/using-flowise/agentflowv1/sequential-agents
- https://www.agentpatternscatalog.org/landing/compositions/flowise/
- https://flowiseai.com/
- https://www.youtube.com/watch?v=YEs-ossypsk
- https://github.com/FlowiseAI/Flowise/issues/5949
- https://www.anygen.io/showcase/flowise-ai/index.html
- https://openai.com/index/introducing-agentkit/
- https://developers.openai.com/api/docs/guides/agent-builder
- https://www.youtube.com/watch?v=kLd7nSkDxig
- https://metaflow.life/blog/how-i-built-an-ai-agent-using-openai-agentkit-in-minutes
- https://community.openai.com/t/how-to-get-started-with-agent-builder/1361280
- https://medium.com/@creativeaininja/openais-agentkit-your-practical-guide-to-building-ai-agents-a28b30ef1f05
- https://www.youtube.com/watch?v=BK4d3WMBKRE&vl=en-US
- https://composio.dev/content/openai-agent-builder-step-by-step-guide-to-building-ai-agents-with-mcp
- https://voltagent.dev/blog/open-ai-agent-builder/
- https://reflektlab.ai/blog/openai-agent-builder/
- https://aws.amazon.com/bedrock/flows/
- https://aws.amazon.com/blogs/machine-learning/amazon-bedrock-flows-is-now-generally-available-with-enhanced-safety-and-traceability/
- https://www.youtube.com/watch?v=h9cyC6eQnBo
- https://dev.to/aws-builders/amazon-bedrock-flows-now-generally-available-with-enhanced-safety-and-traceability-4e0d
- https://aws.amazon.com/blogs/machine-learning/long-running-execution-flows-now-supported-in-amazon-bedrock-flows-in-public-preview/
- https://aws.amazon.com/video/watch/f555df58129/
- https://builder.aws.com/content/2phMjQ0bqWMg4PBwejBs1uf4YQE/supercharging-amazon-bedrock-flows-with-aws-multi-agent-orchestrator
- https://codingdoneraitt.com/blog/bedrock-flows
- https://docs.aws.amazon.com/bedrock/latest/userguide/flows.html
- https://www.youtube.com/watch?v=GvhWpnxac5Q
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html
- https://aws.amazon.com/bedrock/agentcore/
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-core-concepts.html
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-how-it-works.html
- https://joudwawad.medium.com/aws-bedrock-agentcore-deep-dive-6822e4071774
- https://docs.aws.amazon.com/bedrock-agentcore/
- https://omidsaffari.com/blog/bedrock-agentcore
- https://dev.to/aws-heroes/amazon-bedrock-agentcore-runtime-part-1-introduction-e5i
- https://docs.aws.amazon.com/marketplace/latest/userguide/bedrock-agentcore-runtime.html
- https://builder.aws.com/content/2tm1vxZc4plE6goZTSzJ7nppmpo/amazon-bedrock-agentcore
- https://adk.dev/visual-builder/
- https://medium.com/google-cloud/building-ai-agents-visually-with-google-adk-visual-agent-builder-bb441e59a78c
- https://github.com/google/adk-python/discussions/3428
- https://www.youtube.com/watch?v=oC_E979Ih-M
- https://discuss.google.dev/t/introducing-vertex-ai-agent-designer-in-agent-builder/299224
- https://www.codecademy.com/article/google-adk-visual-agent-builder-build-your-first-ai-agent
- https://cloud.google.com/products/gemini-enterprise-agent-platform
- https://www.linkedin.com/pulse/google-adk-meets-no-code-visual-agent-builder-gemini-kartik-marwah-xdrlc
- https://codelabs.developers.google.com/codelabs/create-low-code-agent-with-ADK-visual-builder
- https://www.datacamp.com/tutorial/google-adk-visual-agent-builder-tutorial-with-demo-project
- https://www.reddit.com/r/copilotstudio/comments/1tjqrwl/license_issues_on_agents/
- https://open-exam-prep.com/study-guides/azure-pl-200/ch16-ai-exam-strategy/copilot-studio-generative-ai
- https://www.excelgoodies.nl/power-automate-course-netherlands
- https://zapier.com/blog/zapier-agents-guide/
- https://zapier.com/
- https://help.zapier.com/hc/en-us/articles/24393442652557-Build-an-agent-in-Zapier-Agents
- https://zapier.com/blog/ai-agent/
- https://www.linkedin.com/posts/blaketoliver_why-ai-agents-fail-the-memory-problem-most-activity-7370821571088916480-JY4P
- https://www.therundown.ai/tools/zapier-agents
- https://www.mindstudio.ai/blog/zapier-ai-agents-business-workflow-automation
- https://www.youtube.com/watch?v=avQMU1yJkyY
- https://zapier.com/agents
- https://www.nocodefinder.com/blog-posts/zapier-agents-guide
- https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/key-definitions-flow.html
- https://aws.amazon.com/blogs/machine-learning/inline-code-nodes-now-supported-in-amazon-bedrock-flows-in-public-preview/
- https://www.youtube.com/watch?v=rwIE8Yw5yyw
- https://repost.aws/questions/QUJg-VTBECQ9KCU4MGFeDroA/amazon-bedrock-s-flow-builder-conditional-node-always-defaulting-to-false
- https://blog.stackademic.com/amazon-bedrock-flows-from-agentic-ai-to-end-to-end-solution-e5a2e9ffdd86
- https://github.com/aws-samples/amazon-bedrock-serverless-prompt-chaining
- https://serverlessland.com/blog/dowhile-loops-now-supported-in-amazon-bedrock-flows---artificial-intelligence
- https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_FlowNodeConfiguration.html
- https://www.exam-labs.com/blog/amazon-aws-aip-c01-amazon-bedrock-flows
- https://docs.dify.ai/en/cloud/use-dify/nodes/variable-aggregator
- https://docs.dify.ai/en/cloud/use-dify/nodes/loop
- https://docs.dify.ai/en/cloud/use-dify/nodes/ifelse
- https://github.com/langgenius/dify/discussions/30457
- https://docs.dify.ai/en/cloud/use-dify/nodes/iteration
- https://www.youtube.com/watch?v=xxFOOMYnj_g
- https://docs.dify.ai/en/cloud/use-dify/nodes/question-classifier
- https://x.com/dify_ai/status/1903011106022625554
- https://www.youtube.com/watch?v=MFO-ulJeY74
- https://docs.dify.ai/en/cloud/use-dify/nodes/variable-assigner
- https://www.coze.com/open/docs/guides/intent_recognition_node
- https://www.coze.com/open/docs/guides/workflow_and_chatflow
- https://www.coze.com/open/docs/guides/agent_knowledge
- https://www.coze.com/open/docs/guides/llm_node
- https://x.com/CozeHQ/status/1817056534733738448?lang=bg
- https://www.youtube.com/watch?v=w3wAhZHIGFQ&vl=en
- https://github.com/FlowiseAI/Flowise/issues/4653
- https://jacar.es/en/flowise-low-code-self-hosted-agents/
- https://www.reddit.com/r/Agentic_AI_For_Devs/comments/1kqqubz/flowise_agentflow_v2_multiagent_slack_automation/
- https://medium.com/@ShawnBasquiat/agentflow-v2-deep-dive-state-tools-and-orchestration-14c197fdbf3a
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-create-edit-topics
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/knowledge-copilot-studio
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-triggers
- https://www.youtube.com/watch?v=TwxCiyuwwuk
- https://learn.microsoft.com/en-us/answers/questions/5620653/copilot-studio-generative-nodes-jumping-between-to
- https://www.reddit.com/r/copilotstudio/comments/1ux2pjp/triggers_in_new_copilot_studio_agents/
- https://nidhig631.medium.com/understanding-the-topics-section-in-microsoft-copilot-studio-43e818564e18
- https://learn.microsoft.com/en-us/shows/copilot-studio-agent-academy/add-a-new-topic-with-trigger-and-nodes
- https://www.digitalbricks.ai/blog-posts/understanding-generative-orchestration-topic-triggers-in-copilot-studio
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-topic-management
- https://learn.microsoft.com/en-us/azure/foundry-classic/concepts/prompt-flow
- https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/tools-reference/llm-tool?view=azureml-api-2
- https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/concept-flows?view=azureml-api-2
- https://www.youtube.com/watch?v=twr7JyZogFo
- https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/how-to-integrate-with-llm-app-devops?view=azureml-api-2
- https://blog.stackademic.com/promptflow-in-azure-ai-foundry-a4a60fc8aea7
- https://www.linkedin.com/pulse/stop-writing-monolithic-ai-scripts-build-prompt-flows-feroz-khan-sd4lc
- https://learn.microsoft.com/en-us/azure/foundry-classic/how-to/flow-tune-prompts-using-variants
- https://ougabriel.medium.com/azure-ai-prompt-and-agent-versioning-in-azure-ai-foundry-using-prompt-flow-flow-yaml-variants-68a091dc5f15
- https://www.facebook.com/fb-answers/what-is-prompt-flow-in-azure-ai-foundry/
- https://docs.aws.amazon.com/sagemaker-unified-studio/latest/userguide/nodes.html
- https://www.youtube.com/watch?v=72atY5uagJg
- https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_IteratorFlowNodeConfiguration.html
- https://repost.aws/questions/QUxeeB7e1kS7ecBU5zuXTlrA/amazon-bedrock-issues-with-hitting-the-20-node-limit
- https://aws.amazon.com/blogs/machine-learning/dowhile-loops-now-supported-in-amazon-bedrock-flows/
- https://dev.to/aws-builders/understanding-amazon-bedrocks-new-feature-flows-1ohd
- https://developers.openai.com/api/docs/guides/node-reference
- https://www.youtube.com/watch?v=zGlC91JTK0o&vl=en
- https://www.linkedin.com/pulse/introducing-openai-agent-builder-dennis-layton-c120c
- https://community.openai.com/t/agent-builder-while-loop-transform-and-set-state-an-example/1362386
- https://cobusgreyling.substack.com/p/openai-agent-builder
- https://dev.to/composiodev/openai-agent-builder-step-by-step-guide-to-building-agents-with-mcp-3m5
- https://www.reddit.com/r/weeklyhow/comments/1o24aar/build_chatgpt_agents_using_agent_builder/
- https://www.youtube.com/watch?v=97hrxrcnjKo
- https://www.vellum.ai/blog/openais-agent-builder-explained
- https://docs.dify.ai/en/cloud/use-dify/nodes/agent
- https://github.com/langgenius/dify/discussions/24278
- https://enterprise-docs.dify.ai/en/3.2.x/use/workflow/node/agent
- https://x.com/dify_ai/status/1877625782593532263
- https://enterprise-docs.dify.ai/en/3.13.x/use/nodes/agent
- https://github.com/langgenius/dify/issues/29026
- https://tech-insider.org/dify-tutorial-ai-agent-rag-workflow-2026/
- https://dev.to/_cbd692d476c5faf3b61bcf/dify-agentic-workflow-platform-5-hidden-uses-of-the-145k-star-open-source-ai-stack-56ai
- https://community.n8n.io/t/ai-agent-tools-error/312839?tl=en
- https://community.n8n.io/t/need-help-getting-started-with-multi-agent-setup-ai-agent-node-as-tool-to-ai-agent-node/189029?tl=en
- https://www.reddit.com/r/n8n/comments/1liond2/dont_use_ai_agent_node_in_n8n/
- https://community.n8n.io/t/each-tool-you-attach-to-an-ai-agent-node-is-re-billed-every-turn-some-numbers-i-measured/304536?tl=es
- https://community.n8n.io/t/best-practice-for-building-ai-agent-tools-built-in-nodes-or-call-workflow/114224?tl=en
- https://www.youtube.com/watch?v=sHQQloMG-Fc
- https://www.langchain.com/blog/command-a-new-tool-for-multi-agent-architectures-in-langgraph
- https://www.scaler.com/topics/building-agents-in-langgraph/
- https://www.youtube.com/watch?v=DF_dZcguV84
- https://forum.langchain.com/t/visualizing-graph-when-using-command-object-without-edges/760
- https://medium.com/mitb-for-all/a-second-look-at-langgraph-when-command-sends-becomes-common-sense-720a851cf8a8
- https://shafiqulai.github.io/blogs/blog_10.html
- https://ai.plainenglish.io/ai-agents-xii-langgraph-graph-based-framework-b7b74e1fa5df
- https://futureagi.com/blog/what-is-langgraph-2026/
- https://github.com/langchain-ai/langgraph/issues/4394
- https://reactflow.dev/examples/layout/elkjs
- https://medium.com/@armanaryanpour/auto-layout-positioning-in-react-flow-using-elkjs-eclipse-layout-kernel-with-typescript-and-6389a2cc0119
- https://github.com/xyflow/xyflow/discussions/2788
- https://www.youtube.com/watch?v=bm-96sfOOtQ
- https://ncoughlin.com/posts/react-flow-dagre-custom-nodes
- https://reactflow.dev/learn/layouting/layouting
- https://stately.ai/docs/packages/graph/react-flow-elk-pipeline
- https://dashbouquet.com/blog/web-development/building-a-simple-diagram-by-using-elkjs-and-react-flow
- https://github.com/DylanMerigaud/react-flow-auto-layout
- https://svelteflow.dev/examples/layout/elkjs
- https://www.alibabacloud.com/help/en/model-studio/workflow-application
- https://www.alibabacloud.com/help/en/model-studio/application-introduction
- https://www.alibabacloud.com/help/en/model-studio/faq-about-alibaba-cloud-model-studio
- https://www.alibabacloud.com/help/en/model-studio/single-agent-application
- https://www.alibabacloud.com/
- https://help.aliyun.com/en/model-studio/workflow/introduction
- https://www.youtube.com/watch?v=QmB2qxcQx88&vl=en-US
- https://www.alibabacloud.com/blog/one-key-one-cli-%E2%80%94-manage-your-alibaba-cloud-model-studio-token-plan-from-terminal-or-ai-agent_603453
- https://www.alibabacloud.com/blog/setting-up-an-ai-chatbot-for-marketing-automation-with-alibaba-cloud-model-studio_603115
- https://www.alibabacloud.com/blog/introducing-alibaba-cloud-model-studio_601390
- https://www.alibabacloud.com/en/product/agentcore?_p_lc=1
- https://www.alibabacloud.com/help/en/agentcore/connect-the-refined-knowledge-base-in-the-agentcore.md
- https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio
- https://www.alibabacloud.com/help/en/agentcore/agentcore-sdk-overview
- https://help.aliyun.com/en/model-studio/faq-about-alibaba-cloud-model-studio
- https://ai-sdk.dev/providers/ai-sdk-providers/alibaba
- https://www.alibabacloud.com/blog/what-makes-alibaba-cloud%E2%80%99s-newly-released-agentcore-different_603627
- https://help.aliyun.com/zh/model-studio/workflow-application/
- https://www.alibabacloud.com/help/zh/model-studio/workflow-application
- https://www.aliyun.com/product/news/27058
- https://www.aliyun.com/product/bailian
- https://developer.aliyun.com/article/1665003
- https://blog.csdn.net/qq_33271461/article/details/162893955
- https://developer.aliyun.com/ask/695452
- https://juejin.cn/post/7631766522941538314
- https://help.aliyun.com/zh/model-studio/use-agent-or-workflow-as-component
- https://www.alibabacloud.com/help/zh/model-studio/single-agent-application
- https://www.researchgate.net/publication/395892067_BPMN-Based_Design_of_Multi-Agent_Systems_Personalized_Language_Learning_Workflow_Automation_with_RAG-Enhanced_Knowledge_Access
- https://modeling-languages.com/modeling-human-agent-collaborative-workflows-extending-bpmn/
- https://www.preprints.org/manuscript/202507.1291
- https://www.youtube.com/watch?v=-TU2v6CooQ0
- https://github.com/microsoft/agent-framework/discussions/2532
- https://orbilu.uni.lu/handle/10993/65941
- https://ba-copilot.com/agentic-workflow
- https://www.flowable.com/blog/engineering/bpmn-is-dead-now
- https://www.mdpi.com/2078-2489/16/9/809
- https://arxiv.org/html/2509.24592v1
- https://camunda.com/blog/2025/03/essential-agentic-patterns-ai-agents-bpmn/
- https://medium.com/@pedrorobledobpm/leveraging-bpmn-2-0-to-model-ai-agents-and-challenges-towards-the-necessary-bpmn-3-0-b4fd3b904256
- https://mastra.ai/articles/ai-agent-workflows
- https://docs.n8n.io/build/ways-of-building-workflows/ai-workflow-builder
- https://n8n.io/ai-agents/
- https://www.reddit.com/r/n8n/comments/1nxp0m3/i_built_a_tool_that_turns_natural_language_into/
- https://community.n8n.io/t/introducing-the-ai-assistant-the-workflow-building-agent-inside-n8n/302667
- https://www.youtube.com/watch?v=TDHFkKSTJ30&vl=en
- https://www.aifire.co/p/n8n-s-new-ai-workflow-builder-the-future-of-ai-automation
- https://community.n8n.io/t/introducing-ai-workflow-builder-beta/204919?tl=en
- https://www.jotform.com/ai/agents/n8n-ai-agent-workflow-example/
- https://community.n8n.io/t/building-an-ai-policy-layer-for-n8n-workflows-looking-for-feedback/303687
- https://www.ijert.org/automation-builder-natural-language-driven-workflow-generation-using-large-language-model-and-n8n-ijertv15is050297
- https://help.aliyun.com/en/model-studio/workflow-application/
- https://www.alibabacloud.com/help/tr/model-studio/rag-knowledge-base
- https://www.alibabacloud.com/help/en/pai/node-reference
- https://www.facebook.com/alibabacloud/videos/model-studio-finalmp4/874348851197500/
- https://www.alibabacloud.com/help/en/model-studio/application-calling-guide
- https://www.youtube.com/watch?v=wWQgawUPr1k
- https://dev.to/aws-heroes/amazon-bedrock-agentcore-runtime-part-8-agentcore-memory-observability-32pc
- https://www.devoteam.com/expert-view/amazon-bedrock-agentcore/
- https://www.datadoghq.com/blog/agentic-ai-llm-observability-bedrock-agentcore/
- https://devopsity.com/blog/amazon-bedrock-agentcore-architecture-components-and-pricing/
- https://www.sumologic.com/help/docs/integrations/amazon-aws/amazon-bedrock-agentcore/
- https://www.elastic.co/observability-labs/blog/llm-agentic-ai-observability-amazon-bedrock-agentcore
- https://codelabs.developers.google.com/codelabs/production-ready-ai-with-gc/3-developing-agents/build-a-multi-agent-system-with-adk
- https://developers.googleblog.com/developers-guide-to-multi-agent-patterns-in-adk/
- https://cloud.google.com/blog/topics/developers-practitioners/building-collaborative-ai-a-developers-guide-to-multi-agent-systems-with-adk
- https://medium.com/google-cloud/google-adk-2-collaborative-multi-agent-patterns-a-practical-guide-5c696ba556d2
- https://adk.dev/workflows/
- https://www.youtube.com/watch?v=8uI7oJckxb8
- https://arjunprabhulal.com/adk-multi-agent-systems/
- https://github.com/google/adk-python/blob/main/.agents/skills/adk-agent-builder/references/multi-agent.md
- https://aipractitioner.substack.com/p/google-adk-explained-building-multi
- https://blog.nashtechglobal.com/coordinating-multiple-agents-with-google-adk/
- https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns
- https://learn.microsoft.com/en-us/training/modules/aaai-implement-multi-agent-orchestration-azure-ai-foundry/
- https://azure.microsoft.com/en-us/products/ai-foundry/agent-service
- https://www.youtube.com/watch?v=DfkOwKUyYRc
- https://www.reddit.com/r/AZURE/comments/1mbmhl9/azure_ai_foundry_struggling_with_system_prompts/
- https://azure.github.io/AppService/2025/11/04/app-service-agent-framework-part-3.html
- https://jannikreinhard.com/microsoft-foundry-multi-agent-orchestration/
- https://learn.microsoft.com/en-us/answers/questions/5681772/lab-develop-a-multi-agent-solution-with-microsoft
- https://github.com/Azure-Samples/multi-agent-orchestration-workshop
- https://mojoauth.com/blog/azure-ai-foundry-agent-service-launches-multi-agent-orchestration
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/advanced-generative-actions
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/generative-orchestration
- https://www.microsoft.com/en-us/copilot/blog/copilot-studio/new-and-improved-multi-agent-orchestration-connected-experiences-and-faster-prompt-iteration/
- https://holgerimbery.blog/copilot-studio-orchestration-part1
- https://www.reddit.com/r/copilotstudio/comments/1rxgeoi/how_to_use_multiagent_orchestration_or_is_it_just/
- https://www.youtube.com/watch?v=QTuuoUg8Hpg
- https://community.powerplatform.com/forums/thread/details/?threadid=f9baf83a-2adb-f011-8544-00224826f06d
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/flows-overview
- https://www.linkedin.com/pulse/designing-multi-agent-copilots-flows-generative-microsoft-wali-nwiyf
- https://www.youtube.com/watch?v=xtPlDde4Yv0
- https://help.zapier.com/hc/en-us/articles/24593355420429-Best-practices-for-working-with-Zapier-Agents
- https://help.zapier.com/hc/en-us/articles/24569690575117-Add-your-own-data-to-an-agent
- https://zapier.com/blog/how-to-create-ai-agents/
- https://www.nocode.mba/articles/zapier-central-ai-agents
- https://www.youtube.com/watch?v=dauD92CUT18
- https://adk.dev/agents/workflow-agents/parallel-agents/
- https://adk.dev/agents/workflow-agents/loop-agents/
- https://dev.to/raju_dandigam/multi-agent-does-not-mean-parallel-safe-workflows-with-google-adk-3j3
- https://github.com/google/adk-python/discussions/3714
- https://adk.dev/agents/workflow-agents/
- https://adk.dev/agents/custom-agents/
- https://www.youtube.com/watch?v=nOrXIDbTwvw
- https://www.linkedin.com/posts/ivan-nardini_vertexai-genai-llms-activity-7408899284882042880-xMgO
- https://medium.com/google-cloud/ai-agent-designer-in-the-google-cloud-console-google-adk-agent-development-kit-6cdb4a9da1eb
- https://www.linkedin.com/posts/shubhamsaboo_drag-drop-ai-agent-designer-is-now-in-preview-activity-7410521605870841856-G8ye
- https://www.reddit.com/r/googlecloud/comments/1pt8lsq/introducing_vertex_ai_agent_designer_in_agent/
- https://docs.datahub.com/docs/dev-guides/agent-context/google-vertex-ai
- https://www.workspaceblog.in/blog/agent-studio-no-code-ai-agents-guide/
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/overview
- https://cloud.google.com/blog/products/ai-machine-learning/build-and-manage-multi-system-agents-with-vertex-ai
- https://www.youtube.com/watch?v=NxjbtiSvCc0
- https://www.youtube.com/watch?v=PSPJJEJQyXg
- https://www.reddit.com/r/aws/comments/1f2s1rl/anyone_use_bedrock_prompt_flow/
- https://gerardo.dev/en/bedrock-flows.html
- https://www.skillsdirectory.com/skills/adaptationio-bedrock-flows
- https://camunda.com/platform/modeler/agents/
- https://docs.camunda.io/docs/components/connectors/out-of-the-box-connectors/agentic-ai-aiagent/
- https://camunda.com/blog/2025/05/step-by-step-guide-ai-task-agents-camunda/
- https://camunda.com/blog/2025/11/designing-ai-agents-in-camunda-ai-agent-task-connector-with-loop/
- https://theintermediatecatchevent.substack.com/p/agentic-orchestration-with-camunda
- https://www.youtube.com/watch?v=wM56OhMSty8
- https://camunda.com/bpmn/reference/
- https://arxiv.org/html/2606.27188v1
- https://camunda.com/agentic-orchestration-faq/
- https://arxiv.org/abs/2412.05958
- https://www.researchgate.net/publication/395351897_Towards_Modeling_Human-Agentic_Collaborative_Workflows_A_BPMN_Extension
- https://github.com/besser-pearl/agentic-bpmn
- https://ademait.es/papers/seaa25-ademait-bpmn.pdf
- https://www.themoonlight.io/en/review/towards-modeling-human-agentic-collaborative-workflows-a-bpmn-extension
- https://www.bp-3.com/blog/bpmn-examples-courtesy-of-camunda
- https://modeling-languages.com/tag/bpmn/
- https://docs.n8n.io/build/understand-workflows/create-and-edit-credentials
- https://docs.n8n.io/integrations/builtin/credentials
- https://technoparticles.com/how-beginners-build-n8n-ai-workflows-n8n-assistant
- https://www.reddit.com/r/n8nbusinessautomation/comments/1q5d8s2/i_built_an_n8n_ai_agent_workflow_to_generate/
- https://docs.n8n.io/administer/manage-credentials/end-user-credentials
- https://www.youtube.com/watch?v=hiwxNQXentE
- https://medium.com/@sankalpkhawade/building-custom-nodes-in-n8n-a-complete-developers-guide-0ddafe1558ca
- https://www.reddit.com/r/n8n/comments/1m6dn1w/i_found_a_way_to_use_dynamic_credentials_in_n8n/
- https://www.alibabacloud.com/help/en/pai/product-overview/pai-langstudio-feature-retirement-and-migration-guide
- https://www.alibabacloud.com/help/en/pai/knowledge-base-management
- https://www.alibabacloud.com/blog/600577
- https://www.alibabacloud.com/blog/fine-tuning-ai-models-on-alibaba-cloud-pai-a-practical-guide_603422
- https://www.alibabacloud.com/help/en/pai/data-retrieval-node
- https://www.alibabacloud.com/blog/what-is-the-newly-released-agentloop-by-alibaba-cloud_603378
- https://www.youtube.com/watch?v=gVXUQIhyOCo
- https://help.aliyun.com/en/pai/product-overview/pai-langstudio-feature-retirement-and-migration-guide
- https://www.alibabacloud.com/help/en/pai/create-a-workflow-application
- https://docs.dify.ai/en/cloud/use-dify/nodes/knowledge-retrieval
- https://www.youtube.com/watch?v=8RNmUKMTVKs
- https://enterprise-docs.dify.ai/en/3.13.x/use/nodes/human-input
- https://github.com/langgenius/dify/issues/30696
- https://medium.com/@researchgraph/getting-started-with-dify-no-code-ai-application-development-52c98aef48f7
- https://www.youtube.com/watch?v=Y5BuJjViloE
- https://lobehub.com/skills/neversight-skills_feed-dify-workflow-skills
- https://www.youtube.com/watch?v=GPsKnsYJPiI&vl=en
- https://docs.flowiseai.com/tutorials/agent-as-tool
- https://medium.com/@onlineproxypmm/mastering-agent-flows-v2-and-mcp-in-flowise-f56a48acefc4
- https://www.youtube.com/watch?v=SLVVDUIbIBE&vl=en
- https://codewithkg.com/topics/flowise/
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/nlu-boost-node
- https://learn.microsoft.com/en-us/answers/questions/5989106/copilot-studio-with-generative-answer-node-always
- https://www.youtube.com/watch?v=W53TE5EtBQg
- https://community.powerplatform.com/forums/thread/details/?threadid=7a3cb3e5-4057-f011-877a-7c1e525b40c7
- https://learn.microsoft.com/en-us/answers/questions/5730823/edit-knowledge-base-briefly-appears-during-testing
- https://www.matthewdevaney.com/question-nodes-vs-topic-inputs-in-copilot-studio/
- https://www.reddit.com/r/copilotstudio/comments/1hnp5gz/contextualized_follow_up_questions_and_storing_of/
- https://docs.langchain.com/oss/python/langgraph/use-time-travel
- https://docs.langchain.com/oss/python/langgraph/use-subgraphs
- https://shafiqulai.github.io/blogs/blog_13.html
- https://pub.towardsai.net/langgraph-human-in-the-loop-pausing-reviewing-and-rewinding-your-agent-4028bd05b049
- https://www.langchain.com/langgraph
- https://www.youtube.com/watch?v=gm-WaPTFQqM
- https://www.langchain.com/blog/langgraph
- https://www.codingshuttle.com/blogs/building-deep-agents-with-lang-chain-and-lang-graph-a-hands-on-tutorial/?srsltid=AYCX9vJHy-FiwIgqijAZ0kPoFA477n1UROu-B-cToZz7R1CKyiNXkPdp
- https://medium.com/@sitabjapal03/langgraph-part-4-human-in-the-loop-for-reliable-ai-workflows-aa4cc175bce4
- https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/common-issues
- https://community.n8n.io/t/memorysync-chat-memory-a-community-node-that-keeps-n8n-ai-agent-conversations-across-restarts/323809
- https://www.youtube.com/watch?v=1J5vQA3zYFw
- https://getflowkit.fr/en/blog/debuter-nodes-ia-n8n
- https://community.n8n.io/t/i-updated-my-n8n-and-cant-find-the-langchain-node-is-they-a-substitte-or-was-it-removed/301746
- https://www.alibabacloud.com/help/en/pai/langstudio-overview/
- https://www.alibabacloud.com/help/en/pai/create-a-code-based-application
- https://www.alibabacloud.com/help/en/pai/application-flow-development/
- https://www.youtube.com/watch?v=VKJnpO7MtDQ
- https://davidokeyode.medium.com/step-by-step-guide-connect-ai-models-in-alibaba-cloud-model-studio-with-openclaw-ada70b6977cb
- https://www.youtube.com/watch?v=gfqytnlfx2s
- https://www.youtube.com/watch?v=HGUe8p7yUqg
- https://docs.docsgpt.cloud/Agents/nodes
- https://langwatch.ai/docs/workflows/building-a-workflow
- https://pub.towardsai.net/intro-to-ai-agents-and-langgraph-b795521d67d7
- https://www.youtube.com/watch?v=FVuv5MPBzPI
- https://blog.gopenai.com/langgraph-tutorial-part-1-build-a-simple-agent-workflow-in-python-18a5c6b8e34a
- https://sii.pl/blog/en/the-human-in-the-loop-concept-human-involvement-in-ai-agents-decision-making-processes-with-langgraph/
- https://docs.oracle.com/en/cloud/saas/fusion-ai/26c/aiaas/nodes-in-workflows.html
- https://github.com/dagrejs/dagre
- https://github.com/xyflow/xyflow/discussions/4251
- https://github.com/dagrejs/dagre/issues/258
- https://github.com/dagrejs/dagre/issues/359
- https://reactflow.dev/examples/layout/dagre
- https://github.com/xyflow/xyflow/discussions/4184
- https://github.com/xyflow/xyflow/discussions/2968
- https://svelteflow.dev/examples/layout/dagre
- https://github.com/Comfy-Org/ComfyUI/discussions/1547
- https://community.n8n.io/t/auto-layout-nodes-please-got-created/44603?tl=en
- https://github.com/xyflow/xyflow/discussions/4248
- https://github.com/bcakmakoglu/vue-flow/discussions/61
- https://github.com/xyflow/xyflow/discussions/4271
- https://www.reddit.com/r/reactjs/comments/1salpzf/how_to_automatically_position_nodes_in_a_react/
- https://github.com/kieler/elkjs/issues/122
- https://reactflow.dev/examples/layout/auto-layout
- https://github.com/xyflow/xyflow/issues/1113
- https://reactflow.dev/examples
- https://stackoverflow.com/questions/63734566/react-flow-chart-automatic-layout
- https://github.com/xyflow/xyflow/discussions/3218
- https://learn.microsoft.com/en-us/azure/foundry-classic/how-to/prompt-flow-tools/index-lookup-tool
- https://www.linkedin.com/learning/build-with-ai-building-prompt-flows-with-azure-ai-foundry/use-your-data-in-prompt-flow
- https://www.youtube.com/watch?v=TyORQKo9NU0
- https://www.marvik.ai/blog/building-a-rag-based-chatbot-with-azures-prompt-flow
- https://github.com/microsoft/promptflow/issues/3107
- https://www.preciofishbone.com/knowledge-hub/prompt-flow-azure-ai-foundry/
- https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/tools-reference/overview?view=azureml-api-2
- https://azure.github.io/slm-innovator-lab/3_3_2_evaluation/
- https://ritz7.ai/blog/how-to-use-openai-agent-builder
- https://github.com/panaversity/learn-agentic-ai-from-low-code-to-code/blob/main/04_no_code_agents/readme.md
- https://medium.com/ai-software-engineer/i-tested-openais-agent-kit-so-you-don-t-have-to-here-s-your-first-practical-guide-agent-kit-5416bb6fa485
- https://www.udemy.com/course/master-openai-agent-builder-low-code-ai-projects-workflow/?srsltid=AYCX9vIbXi3ldd2V_9paZN7VtPRCWyNpnFkDxWdt2czQ7NheFG4ASXNA
- https://www.udemy.com/course/master-openai-agent-builder-n8n-workflow-automation/?srsltid=AYCX9vJ9TXPeOZmUiYn9b5DdoQfcMvUhWq8uhLizZnMFEc5AiZ4OjgvM
- https://repost.aws/questions/QURXfgMTs7TWGkEibSGZO7MQ/amazon-bedrock-flow-flow-builder-lex-node
- https://docs.rs/aws-sdk-bedrockagent/latest/aws_sdk_bedrockagent/types/index.html
- https://medium.com/storm-reply/llm-workflows-on-aws-amazon-bedrock-prompt-flows-4ffa174ec26e
- https://repost.aws/questions/QUqIs5H3PGTrie0JHD1cTT3w/multi-turn-conversation-with-an-agent-node-for-amazon-bedrock-flows
- https://www.scribd.com/document/973711889/Amazon-Bedrock-User-Guide-flow
- https://help.aliyun.com/zh/model-studio/workflow/introduction
- https://help.aliyun.com/zh/model-studio/workflow/knowledge-base-node
- https://www.53ai.com/news/LargeLanguageModel/2025061352913.html
- https://allinprogram.com/archives/bai-lian-da-mo-xing-gong-zuo-liu-ying-yong-kai-fa-fen-xiang
- https://www.coze.com/open/docs/guides/features
- https://www.coze.com/open/docs/guides/terms_of_service
- https://eastaiai.com/en/article/4306
- https://github.com/kimtth/azure-openai-llm-notes/blob/main/section/x_llm_apps.md
- https://www.msfconsole.cn/
- https://github.com/aymericdamien/topdeeplearning
- https://download.bibis.ir/Books/Artificial-Intelligence/RAG/2026/RAG%20from%20First%20Principles%20-%20Engineering%20retrieval-augmented%20generation%20systems%20with%20Python,%20LangChain,%20and%20LlamaIndex%20(Jia%20Huang)_bibis.ir.pdf
- https://github.com/erbanku/stars
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-using-conditions
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-ask-a-question
- https://microsoft.github.io/agent-academy/recruit/07-add-new-topic-with-trigger/
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-send-message
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/advanced-entities-slot-filling
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/add-tools-custom-agent
- https://app.studyraid.com/en/read/122002/5661189/using-message-nodes-for-simple-responses
- https://note.com/quick_pipit7468/n/n7de4c4f60b76?hl=en
- https://www.alibabacloud.com/help/id/model-studio/workflow-application
- https://help.aliyun.com/en/model-studio/workflow/intent-node
- https://help.aliyun.com/en/model-studio/workflow/parameter-extraction-node
- https://help.aliyun.com/en/model-studio/workflow/loop-node
- https://help.aliyun.com/en/model-studio/workflow/batch-node
- https://help.aliyun.com/en/model-studio/workflow/conditional-node
- https://help.aliyun.com/en/model-studio/workflow/api-node
- https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base
- https://help.aliyun.com/en/model-studio/workflow/knowledge-base-node
- https://www.alibabacloud.com/help/en/dataworks/user-guide/large-model-node
- https://www.alibabacloud.com/help/en/dataworks/user-guide/use-models
- https://www.alibabacloud.com/help/en/agentrun/authorize-ram-users-to-use-agenrun
- https://github.com/datawhalechina/hello-agents/blob/main/docs/chapter5/Chapter5-Building-Agents-with-Low-Code-Platforms.md
- https://www.facebook.com/alibabacloud/posts/the-distance-between-a-working-prototype-and-an-agent-you-can-run-in-production-/1575386554633431/
- https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview
- https://www.alibabacloud.com/blog/what-does-alibaba-clouds-agent-infra-look-like_603177
- https://builder.aws.com/content/3CwHozu5zp3UUsCWW4qL0eQMfMN/before-you-ship-ai-agents-at-enterprise-scale-get-the-foundations-right
- https://www.youtube.com/watch?v=N7FGbBq1mI4&vl=en
- https://www.alibabacloud.com/blog/alibaba-cloud-al-agent-security-solution%E2%80%94%E2%80%94security-risks-and-mitigations-for-enterprise-ai-agent-adoption_603175
- https://www.linkedin.com/pulse/what-makes-alibaba-clouds-newly-released-agentcore-q6q5e
- https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun
- https://www.alibabacloud.com/help/en/agentrun/start-using/
- https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-struct-agentruntime
- https://www.alibabacloud.com/blog/giving-your-ai-agent-a-disposable-workspace-with-alibaba-cloud-agentrun_603324
- https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-updateagentruntimeinput
- https://www.alibabacloud.com/help/en/agentrun/quickly-create-agent-no-code
- https://api.alibabacloud.com/api/AgentRun/2025-09-10
- https://www.alibabacloud.com/help/en/functioncompute/create-agent-by-code-high-code
- https://help.aliyun.com/en/agentrun/quick-start-to-low-code-agent-creation-1
- https://www.alibabacloud.com/en/product/agentloop?_p_lc=1
- https://www.alibabacloud.com/help/en/agentloop/product-overview/what-is-agentloop
- https://www.alibabacloud.com/help/en/agentloop/agentloop-quickstart-whole-process-practice
- https://langfuse.com/blog/2024-07-ai-agent-observability-with-langfuse
- https://mlflow.org/articles/what-is-agent-observability-a-2026-developer-guide/
- https://github.com/aliyun/alibabacloud-aiops-skills/blob/master/skills/aiml/agentloop/alibabacloud-agentloop-evaluation/SKILL.md
- https://www.truefoundry.com/blog/ai-agent-observability
- https://openobserve.ai/ai-observability/
- https://www.alibabacloud.com/help/doc-detail/3049290.html
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/interface-overview
- https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-createflow
- https://www.linkedin.com/top-content/artificial-intelligence/ai-workflow-enhancement/build-ai-automation-with-drag-and-drop/
- https://www.youtube.com/watch?v=yAj4CwsWUBk
- https://help.aliyun.com/en/model-studio/workflow/agent-group-node
- https://www.reddit.com/r/LLMDevs/comments/1ig52az/whats_the_best_draganddrop_way_to_build_ai_agents/
- https://www.drupalforge.org/blog/visual-ai-agent-workflows-are-coming-drupal-try-flowdrop-ui-agents-drupalforge
- https://community.n8n.io/t/how-to-create-ai-agent-using-alibaba-llm-qwen-plus/248502?tl=en
- https://help.aliyun.com/en/model-studio/workflow/multimodal-generation-node
- https://www.alibabacloud.com/help/en/model-studio/plugins
- https://help.aliyun.com/en/model-studio/workflow/process-output-node
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/plugins
- https://help.aliyun.com/en/model-studio/workflow/plugin-node
- https://tuxcare.com/cve-tracker/cve/details/cve-2026-84947/?product=php-wasm-xdebug-bridge&context=3-1-57
- https://docs.oracle.com/en/database/oracle/agent-factory/26.4/paias/agent-builder-components.html
- https://github.com/omerbsezer/Fast-LLM-Agent-MCP
- https://dev.to/mir_mursalin_ankur/graphify-code-review-graph-build-a-self-updating-knowledge-graph-for-claude-code-and-other-ai-j1m
- https://www.linkedin.com/posts/anthony-alcaraz-b80763155_most-companies-are-building-autonomous-agents-activity-7380165774834888704-6Itd
- https://eastondev.com/blog/en/posts/ai/20261021-openai-agents-sdk-vs-langgraph-practical-review/
- https://help.aliyun.com/en/model-studio/workflow/mcp-node
- https://help.aliyun.com/en/model-studio/workflow/llm-node
- https://github.com/modelstudioai/cli
- https://www.alibabacloud.com/blog/achieve-manus-in-a-dozen-lines-of-code-a-quick-preview-of-spring-ai-alibaba-graph_602455
- https://www.alibabacloud.com/blog/603243
- https://www.alibabacloud.com/blog/from-models-to-agents-how-alibaba-cloud-qwen-is-reshaping-workplace-collaboration_603518
- https://help.aliyun.com/en/model-studio/flow-agent-introduction
- https://www.reddit.com/r/ClaudeWorkflows/comments/1xdq33i/workflow_multiagent_llm_orchestration_for/
- https://www.alibabacloud.com/blog/configuration-driven-dynamic-agent-architecture-network-achieving-efficient-orchestration-dynamic-updates-and-intelligent-governance_602564
- https://docs.oracle.com/en/cloud/saas/readiness/common/26c/common26c/26C-common-wn-f50327.htm
- https://www.youtube.com/watch?v=k2DlzuZAOW8
- https://www.alibabacloud.com/blog/603614
- https://slashdot.org/software/comparison/01.AI-vs-Alibaba-Cloud-Model-Studio/
- https://alibaba-cloud.medium.com/developing-multimodal-services-using-qwen-and-model-studio-ab9eb3b91459
- https://help.aliyun.com/en/model-studio/workflow/start-end-node
- https://help.aliyun.com/en/model-studio/workflow/variable-processing-node
- https://help.aliyun.com/en/model-studio/workflow/component-node
- https://www.alibabacloud.com/help/en/agentrun/knowledge-base-integration-guide-1
- https://help.aliyun.com/en/agentrun/knowledge-base-integration-guide
- https://www.youtube.com/watch?v=cFHJYdSJzPA
- https://www.alibabacloud.com/blog/designing-enterprise-ai-agent-architectures-with-alibaba-cloud_603528
- https://www.alibabacloud.com/help/en/model-studio/application-data/
- https://help.aliyun.com/en/model-studio/regions
- https://www.alibabacloud.com/help/en/model-studio/build-knowledge-base-qa-assistant-without-coding
- https://superpowerdaily.com/posts/runway-launches-app-studio-to-turn-creative-workflows-into-shareable-no-code-apps
- https://www.mindstudio.ai/blog/ai-workflow-survives-government-model-bans
- https://try-qwen-ai.com/api/alibaba-cloud/
- https://github.com/kieler/elkjs/issues/362
- https://reactflow.dev/examples/layout/elkjs-multiple-handles
- https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html
- https://stackoverflow.com/questions/77498509/elk-layered-algorithm-with-svelteflow
- https://rtsys.informatik.uni-kiel.de/~biblio/downloads/papers/arxiv23c.pdf
- https://flow.foblex.com/examples/elkjs-layout
- https://www.reddit.com/r/reactjs/comments/1isgvhu/looking_for_recommendations_for_react_library_for/
- https://stackoverflow.com/questions/79213552/my-react-flow-dag-looking-funny-after-dagre-layouting
- https://docs.n8n.io/build/understand-workflows/workflow-components/add-notes-and-documentation
- https://community.n8n.io/t/group-nodes-with-sticky-notes-too-got-created/60440?tl=en
- https://docs.n8n.io/build/flow-logic/break-workflows-into-smaller-parts
- https://www.youtube.com/watch?v=xr05Ie_Hkyg
- https://www.reddit.com/r/n8n/comments/1tntfys/how_do_you_keep_n8n_flows_readable_once_they_pass/
- https://community.n8n.io/t/how-to-make-your-canvas-beautiful-informational-and-professional/301934?tl=en
- https://optimizesmart.com/blog/modularizing-n8n-workflows-build-smarter-workflows/
- https://community.n8n.io/t/how-to-use-sub-workflows-in-n8-when-to-use-examples/257577?tl=en
- https://community.n8n.io/t/how-can-i-organize-big-workflow-so-they-don-t-become-mess/230027/4?tl=en
- https://culturro.com/blog/openai-agent-builder/
- https://www.majus.org/blog/chatkit-day-one/
- https://www.udemy.com/course/master-openai-agent-builder-low-code-ai-projects-workflow/?srsltid=AYCX9vK9nBTAu9koF0kjAA02IQsb3GizJ4qhCr1AJ3dUy22DwVxrax3D
- https://quilltap.ai/features/
- https://www.udemy.com/course/master-openai-agent-builder-n8n-workflow-automation/?srsltid=AYCX9vIseH0zW216NA3xNQaXIwOo3jTMz5h7LKqHha28HsZ-t185pm68
- https://lilys.ai/en/notes/openai-agent-builder-20251017/openai-agent-builder-walkthrough-n8n
- https://lilys.ai/ar/notes/ai-agent-20260204/openai-agent-builder-website-integration
- https://lilys.ai/zh/notes/openai-agent-builder-20260208/openai-agent-builder-guide-n8n
- https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.aitransform
- https://www.reddit.com/r/n8n/comments/1u7iffo/which_ai_model_has_been_the_best_for_generating/
- https://community.n8n.io/t/how-to-set-up-document-classification-in-n8n-2-nodes-no-code/290813?tl=en
- https://www.youtube.com/watch?v=zieOwVaYe1E
- https://hatchworks.com/blog/ai-agents/n8n-ai-agent/
- https://community.n8n.io/t/text-classifier-node-add-fallback-ai-model-support-and-stronger-classification-mechanisms/287651?tl=en
- https://www.youtube.com/watch?v=GuaKeDS6UKU
- https://community.n8n.io/t/n8n-community-node-jev-classification-route-items-by-category-with-calibrated-confidence-built-for-high-volume/315339?tl=en
- https://www.sovyn.com/blog/n8n-ai-agent
- https://medium.com/@josephamyexson/langgraph-visualization-with-get-graph-ffa45366d6cb
- https://www.krishnaik.in/ai-tutorials/langgraph/draw-mermaid
- https://stackoverflow.com/questions/79769461/langgraph-subgraphs-vizualization
- https://pub.towardsai.net/langgraph-beginner-to-advance-part-2-hello-world-graph-in-langgraph-15d278841645
- https://www.baihezi.com/mirrors/langgraph/how-tos/visualization/index.html
- https://www.youtube.com/watch?v=Xn7pPopFK1s
- https://shafiqulai.github.io/blogs/blog_8.html
- https://www.alibabacloud.com/en/product/modelstudio?_p_lc=1
- https://www.alibabacloud.com/blog/experience-the-power-of-ai-with-alibaba-cloud-model-studio_601353
- https://www.youtube.com/watch?v=gO174prdB8c
- https://help.aliyun.com/en/model-studio/workflow/agent-create-node
- https://help.aliyun.com/en/model-studio/workflow/fc-node
- https://help.aliyun.com/en/model-studio/workflow/memory-node
- https://www.youtube.com/watch?v=bCQGte09-Ko
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/flow-designer
- https://www.reddit.com/r/copilotstudio/comments/1o3yzr9/trigger_agent_via_power_automate_flow/
- https://rishonapowerplatform.com/2025/12/31/using-the-copilot-studio-agent-flow-designer-tips-and-tricks-for-beginners/
- https://community.powerplatform.com/forums/thread/details/?threadid=af1dd5bb-7402-f111-8406-7c1e521a8fe1
- https://www.youtube.com/watch?v=JqcxylzMSFY
- https://www.microsoft.com/en-us/copilot/blog/copilot-studio/introducing-agent-flows-transforming-automation-with-ai-first-workflows/
- https://pwmather.wordpress.com/2026/06/09/how-to-build-a-microsoft-365-copilot-studio-agent-to-find-power-automate-flows-part-1/
- https://powerplatformtrainings.com/2025/04/14/copilot-agent-flow-vs-power-automate-flow-key-differences-you-should-know/
- https://docs.n8n.io/build/integrate-ai/langchain-in-n8n
- https://docs.n8n.io/key-concept-glossary
- https://www.youtube.com/watch?v=kEtYJOijCBM
- https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolaiagent
- https://www.automationarchitects.ai/blog/building-an-n8n-ai-agent-node-practical-steps-for-2026
- https://www.digitalapplied.com/blog/n8n-70-ai-nodes-langchain-agent-workflows-open-source
- https://www.skool.com/ai-automation-society/learning-what-exactly-is-a-sub-node-in-n8n?p=87dcdec3
- https://docs.dify.ai/en/cloud/use-dify/nodes/llm
- https://docs.dify.ai/en/cloud/use-dify/nodes/http-request
- https://blog.elest.io/dify-on-elestio-build-custom-ai-agents-with-rag-workflows-and-tool-calling/
- https://www.coze.com/open/docs/guides/variable_assign_node
- https://www.coze.com/open/docs/guides/variable
- https://www.youtube.com/watch?v=x2z9dQEEQq0
- https://www.alibabacloud.com/help/en/agentrun/using-session-state-in-langchain-1.md
- https://www.alibabacloud.com/help/en/model-studio/api-bailian-2023-12-29-overview.md
- https://www.alibabacloud.com/help/en/agentrun/knowledge-base-integration-guide
- https://docs.aws.amazon.com/bedrock/latest/userguide/agents-multi-agent-collaboration.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/create-multi-agent-collaboration.html
- https://aws.amazon.com/blogs/machine-learning/build-multi-agent-site-reliability-engineering-assistants-with-amazon-bedrock-agentcore/
- https://builder.aws.com/content/3DCax04M9o7gBpAMttstsLjmPUD/multi-agent-architecture-patterns-with-amazon-bedrock-agentcore-runtime
- https://docs.aws.amazon.com/solutions/multi-agent-orchestration-on-aws/
- https://www.youtube.com/watch?v=R0eY5lpyWOo
- https://repost.aws/questions/QUjHE9cIctRT65NvjHC_Wt6Q/avoiding-incorrect-routing-in-bedrock-multi-agent-collaboration
- https://github.com/aws-samples/sample-multiagent-orchestration-on-agentcore-for-education
- https://aws.amazon.com/blogs/machine-learning/ai-agents-in-enterprises-best-practices-with-amazon-bedrock-agentcore/
- https://levelup.gitconnected.com/amazon-bedrock-multi-agent-collaborations-c914b27ad5f2
- https://docs.langflow.org/
- https://www.langflow.org/
- https://www.ibm.com/think/topics/langflow
- https://medium.com/@ravisat/langflow-from-prompt-experiments-to-production-agentic-workflows-a46405210a22
- https://www.theregister.com/special-features/2026/01/28/how-to-build-an-ai-agent-using-langflow/4258892
- https://www.langflow.org/blog/the-complete-guide-to-choosing-an-ai-agent-framework-in-2025/
- https://cohorte.co/blog/langflow-a-visual-guide-to-building-llm-apps-with-langchain
- https://arxiv.org/html/2412.05958v1
- https://www.alphaxiv.org/abs/2412.05958
- https://www.alphaxiv.org/zh/abs/2412.05958
- https://arxiv.org/html/2505.00753v2
- https://camunda.com/blog/2025/02/building-ai-agent-camunda/
- https://www.classcentral.com/course/youtube-7-patterns-for-building-better-ai-agents-using-bpmn-in-camunda-474598
- https://camunda.com/blog/2025/04/an-advanced-ad-hoc-sub-process-tutorial/
- https://camunda.com/blog/2025/05/benefits-bpmn-ai-agents/
- https://docs.camunda.io/docs/components/connectors/out-of-the-box-connectors/agentic-ai-aiagent-tool-definitions/
- https://github.com/xyflow/xyflow/discussions/2981
- https://github.com/langgenius/dify/discussions/34916
- https://docs.dify.ai/en/quick-start
- https://www.gptbots.ai/blog/dify-ai
- https://bennycheung.github.io/dify-your-weekend-genai-magics
- https://dify.ai/blog
- https://dl.acm.org/doi/10.1145/3786554.3786574
- https://www.linkedin.com/posts/rajistics_build-genai-agentic-workflows-without-writing-activity-7309709166812504064-eSEN
- https://dev.to/aws/multi-turn-conversations-with-amazon-bedrock-flows-57do
- https://www.doit.com/blog/amazon-bedrock-flow-the-easiest-way-to-build-ai-workflows-no-code-needed
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/fundamentals-what-is-copilot-studio
- https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/agent-builder
- https://learn.microsoft.com/en-us/shows/mastering-copilot-studio/create-first-agent-copilot-studio
- https://www.microsoft.com/en-us/copilot/products/copilot-studio
- https://www.reddit.com/r/microsoft_365_copilot/comments/1teyxfu/ive_been_building_copilot_studio_agents_for/
- https://www.youtube.com/watch?v=zpct8UbP9Ag
- https://learn.microsoft.com/en-us/answers/questions/5765629/hi-i-want-to-create-a-ai-agent-in-m365-and-have-co
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/fundamentals-get-started
- https://mtccrm.com/microsoft-copilot-studio-a-complete-guide-to-building-ai-agents/
- https://docs.n8n.io/build/ways-of-building-workflows/use-the-ai-assistant
- https://uibakery.io/blog/what-is-n8n
- https://docs.n8n.io/changelog/release-notes
- https://contractorplus.app/blog/best-workflow-automation-software-contractors
- https://hatchworks.com/blog/ai-agents/n8n-guide/
- https://max-productive.ai/blog/n8n-ai-workflow-builder-launch-natural-language-automation/
- https://www.facebook.com/groups/1129871225741454/posts/1243714521023790/
- https://www.facebook.com/rengatechnologies/posts/ai-agent-workflow-automation-in-n8n-a-visual-breakdown-of-an-automated-n8n-workf/1044795991709296/
- https://adk.dev/
- https://adk.dev/agents/llm-agents/
- https://www.guvi.in/blog/google-adk-visual-agent-builder/
- https://www.youtube.com/watch?v=ZGnI9z8CGwI
- https://docs.langchain.com/oss/javascript/langgraph/use-subgraphs
- https://docs.langchain.com/oss/python/langgraph/streaming
- https://docs.langchain.com/oss/python/langgraph/frontend/graph-execution
- https://forum.langchain.com/t/how-do-i-view-the-state-of-a-subgraph-with-a-persistent-sub-thread/1083
- https://www.agentpatternscatalog.org/landing/compositions/langgraph/
- https://www.zenml.io/blog/langgraph-vs-n8n
- https://www.langchain.com/blog/choosing-the-right-multi-agent-architecture
- https://www.reddit.com/r/n8n/comments/1sx7a4c/langgraph_n8n_in_the_same_project_bad_practice_or/
- https://www.agentpatternscatalog.org/frameworks/langgraph/
- https://www.youtube.com/watch?v=CsX5Hm4E5pk
- https://pub.towardsai.net/aria-langgraph-agent-skills-mcp-for-n8n-workflows-8facbb6731f4
- https://help.zapier.com/hc/en-us/articles/45394909914381-Set-up-your-agent-s-trigger
- https://www.xray.tech/post/ai-agents-zapier
- https://www.youtube.com/watch?v=UTRTZMwElWg
- https://learn.microsoft.com/en-us/answers/a/13010294
- https://www.microsoft.com/en-us/copilot/resources/agents
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/nlu-gpt-overview
- https://www.reddit.com/r/copilotstudio/comments/1jkoc4g/whats_the_difference_between_the_two_ways_of/
- https://www.microsoft.com/en-us/copilot/blog/copilot-studio/new-and-improved-agent-evaluations-computer-use-and-advanced-maker-training/
- https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/agent-builder-build-agents
- https://github.com/FlowiseAI/Flowise/discussions/5316
- https://docs.flowiseai.com/integrations/langchain/tools/custom-tool
- https://stackoverflow.com/questions/77583111/how-can-i-use-returned-value-from-custom-tool-in-openai-function-agents-system-m
- https://docs.flowiseai.com/tutorials/tools-and-mcp
- https://docs.dify.ai/en/cloud/use-dify/knowledge/integrate-knowledge-within-application
- https://github.com/langgenius/dify/releases
- https://dify-enterprise-docs.mintlify.app/en/3.6.x/use/nodes/user-input
- https://arxiv.org/html/2610.18092v1
- https://docs.dify.ai/en/cloud/use-dify/knowledge/knowledge-pipeline/knowledge-pipeline-orchestration
- https://docs.aws.amazon.com/bedrock/latest/userguide/quotas.html
- https://docs.aws.amazon.com/general/latest/gr/bedrock.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/quotas-runtime.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/quotas-mantle.html
- https://awsfundamentals.com/limits/bedrock
- https://aws.amazon.com/about-aws/whats-new/2026/5/amazon-bedrock-service-quotas/
- https://builder.aws.com/content/2sriOc6gRp9WJFGFYL9f9GweZOq/scaling-with-amazon-bedrock-a-practical-guide-on-managing-service-quotas-and-throughput
- https://www.westloop.io/post/removed-requests-per-minute-rpm-quotas-amazon-bedrock-no-longer-enforces-requests-per-minute-rpm-quotas-on-the-bedrock-runtime-or-bedrock-mantle-endpoints-throttling-is-now-governed-by-token-based-quotas-rpm-rows-have-been-removed-from-the-amazon-bedrock-q
- https://codelabs.developers.google.com/devsite/codelabs/building-ai-agents-vertexai
- https://console.cloud.google.com/vertex-ai/agents/agent-garden
- https://www.youtube.com/watch?v=IwFRsq6EQY8
- https://uibakery.io/blog/vertex-ai-agent-builder
- https://community.n8n.io/t/node-auto-arrange/6762?tl=en
- https://docs.n8n.io/changelog
- https://releasebot.io/updates/n8n
- https://www.getorchestra.io/guides/n8n-latest-version
- https://github.com/n8n-io/n8n/releases
- https://community.n8n.io/t/monitor-n8n-releases-and-get-notifications-for-new-versions/225265?tl=en
- https://www.runxbuild.com/blog/n8n-releases/
- https://medium.com/@databytoufik/n8n-2-0-what-actually-changed-for-workflow-builders-68faedd3bb0a
- https://docs.aws.amazon.com/cli/latest/reference/bedrock-agent/get-flow.html
- https://aws.amazon.com/blogs/machine-learning/introducing-multi-turn-conversation-with-an-agent-node-for-amazon-bedrock-flows-preview/
- https://www.reddit.com/r/flowise/comments/1bpgta5/flowise_help_for_beginners/
- https://docs.flowiseai.com/tutorials/structured-output
- https://learn.microsoft.com/en-za/answers/questions/5934023/will-azure-ai-agents-sdk-foundry-agent-service-cla
- https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/prompt-flow-is-being-retired/4513587
- https://learn.microsoft.com/en-us/azure/foundry-classic/how-to/prompt-flow-migration-overview
- https://www.reddit.com/r/AZURE/comments/1p5pz2k/azure_foundry_update/
- https://learn.microsoft.com/en-us/answers/questions/5876573/how-do-i-check-if-my-agent-in-foundry-is-using-azu
- https://www.linkedin.com/posts/dennestorres_prompt-flow-is-dead-the-replacement-isnt-activity-7454698049400000512-pOgN
- https://learn.microsoft.com/en-us/answers/questions/2277870/azure-ai-foundry-missing-prompt-flow-option
- https://www.beri.net/article/assistants-api-august-26-shutdown-openai-responses-vs-azure-foundry-agents
- https://warnov.github.io/posts/Prompt-Flow-not-Available-in-Azure-AI-Foundry-Projects/
- https://community.n8n.io/latest?no_definitions=true&page=79&tl=de
- https://github.com/eros1sh/n8n-workflow-agent
- https://www.scribd.com/document/977046857/The-Ultimate-n8n-Starter-Guide
- https://classic.yarnpkg.com/en/package/n8n-editor-ui
- https://reactflow.dev/
- https://www.proxyhorizon.com/blog/n8n-review
- https://news.ycombinator.com/item?id=21191676
- https://www.npmjs.com/package/@marktoflow/gui
- https://zernio.com/blog/whatsapp-workflows
- https://grafloria.com/demos/interaction/n8n-workflow.html
- https://forum.langchain.com/t/best-practices-for-parallel-nodes-fanouts/1900
- https://machinelearningplus.com/gen-ai/langgraph-map-reduce-parallel-execution/
- https://aipractitioner.substack.com/p/scaling-langgraph-agents-parallelization
- https://medium.com/ai-engineering-bootcamp/map-reduce-with-the-send-api-in-langgraph-29b92078b47d
- https://forum.langchain.com/t/for-parallel-execution-in-node-should-i-use-the-functional-api/3812
- https://www.youtube.com/watch?v=JQznvlSatPQ
- https://reference.langchain.com/python/langgraph/types/Send
- https://dev.to/sreeni5018/leveraging-langgraphs-send-api-for-dynamic-and-parallel-workflow-execution-4pgd
- https://github.com/langchain-ai/langgraph/issues/3380
- https://docs.langchain.com/oss/python/langgraph/interrupts
- https://docs.langchain.com/oss/python/langchain/human-in-the-loop
- https://docs.langchain.com/oss/python/deepagents/human-in-the-loop
- https://www.reddit.com/r/LangChain/comments/1s6qidj/how_i_implemented_humanintheloop_with_langgraphs/
- https://www.youtube.com/watch?v=6t7YJcEFUIY
- https://dev.to/jamesbmour/interrupts-and-commands-in-langgraph-building-human-in-the-loop-workflows-4ngl
- https://turion.ai/blog/langgraph-human-in-the-loop-interrupt-tutorial/
- https://medium.com/@areebahmed575/langgraphs-interrupt-function-the-simpler-way-to-build-human-in-the-loop-agents-faef98891a92
- https://www.langchain.com/blog/making-it-easier-to-build-human-in-the-loop-agents-with-interrupt
- https://www.youtube.com/watch?v=4cQWJViybAQ
- https://medium.com/codetodeploy/n8n-the-complete-guide-to-open-source-workflow-automation-331b92ec7068
- https://docs.n8n.io/build-your-first-workflow
- https://docs.n8n.io/build/manage-workflows/configure-workflow-settings
- https://www.freelo.io/en/help/n8n-integration-automate-your-work-habits
- https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.form
- https://www.getpassionfruit.com/blog/how-to-build-your-first-ai-workflow-with-n8n-beginners-guide
- https://github.com/aws-samples/amazon-bedrock-flows-samples/blob/main/RELEASE_NOTES.md
- https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/bedrockagent_flow
- https://context7.com/websites/coze_cn_guides
- https://www.coze.com/open/docs/guides/app_quickstart1
- https://www.openagentskill.com/skills/coze-dev-coze-loop
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-ask-with-adaptive-card
- https://community.powerplatform.com/forums/thread/details/?threadid=7d9e086e-4865-f111-a826-7ced8dcd2411
- https://www.reddit.com/r/copilotstudio/comments/1p647qx/copilot_studio_adaptive_card_keeps_reappearing/
- https://www.youtube.com/watch?v=HkdUSMqmPoA
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/nlu-authoring
- https://nextm365.com/blog/microsoft-copilot-studio-adaptive-cards-explained-day-32
- https://learn.microsoft.com/en-gb/answers/questions/5612929/post-adaptive-card-and-wait-for-a-response-has-dif
- https://medium.com/@tam.tamanna18/creating-multi-agent-systems-with-adk-visual-builder-1c7cc69532f3
- https://www.theunwindai.com/p/google-adk-visual-agent-builder
- https://www.facebook.com/groups/evolutionunleashedai/posts/10020800941300900/
- https://thenewstack.io/build-n8n-ai-workflow/
- https://community.n8n.io/t/create-a-workflow-by-n8n-public-rest-api/143898?tl=en
- https://www.youtube.com/watch?v=_A80xAMOyxk
- https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/agent-builder
- https://www.linkedin.com/posts/charlie-hills_zapierpartner-activity-7439989004663451648-wJHR
- https://zapier.com/blog/improve-ai-agents/
- https://learn.microsoft.com/en-us/answers/questions/5825913/azure-ai-foundry-workflow-feature-parallel-agents
- https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/
- https://dev.to/suhas_mallesh/multi-agent-orchestration-on-azure-workflow-patterns-with-agent-framework-and-terraform-5ge1
- https://learn.microsoft.com/en-us/answers/questions/5570736/how-to-run-connected-agents-in-parallel
- https://learn.microsoft.com/en-us/answers/questions/5869509/sequential-workflow-in-foundry-how-to-show-only-th
- https://www.anthropic.com/research/building-effective-agents
- https://medium.com/@vasundra.srinivasan/building-effective-ai-agents-a-practical-application-92e1e1537f64
- https://pub.towardsai.net/agent-workflow-patterns-beyond-anthropics-playbook-1bd76a48d63d
- https://www.youtube.com/watch?v=vGueJIZWLL8
- https://aimultiple.com/building-ai-agents
- https://blog.devgenius.io/why-anthropics-building-effective-agents-raises-the-bar-and-which-agent-patterns-to-avoid-e60a143940df
- https://www.linkedin.com/pulse/anthropics-guide-building-effective-ai-agents-mehdi-mirzapour-phd-5nahf
- https://www.aihero.dev/building-effective-agents
- https://agentpatterns.ai/patterns/agent-design/anthropic-effective-agents-framework/
- https://www.scribd.com/document/815697890/Building-Effective-AI-Agents-1735257949
- https://www.coze.com/open/docs/guides/question_node
- https://www.youtube.com/watch?v=_ocwK9iJhq4
- https://www.coze.com/open/docs/guides/loop_node
- https://github.com/Foblex/f-flow/issues/190
- https://github.com/xyflow/xyflow/discussions/4185
- https://www.coursera.org/articles/how-to-use-google-adk
- https://www.linkedin.com/posts/ranand12_build-your-first-google-adk-agent-agent-activity-7394734681134354433-B2tP
- https://learn.microsoft.com/en-us/agent-framework/workflows/visualization
- https://learn.microsoft.com/nb-no/agent-framework/workflows/visualization
- https://learn.microsoft.com/en-us/agent-framework/overview/
- https://chadadams.com/building-and-visualizing-agent-workflows-ef096e655f69
- https://learn.microsoft.com/fi-fi/shows/azure-friday/orchestrate-your-agents-with-microsoft-agent-framework
- https://www.youtube.com/watch?v=fuP3Yiu0mCo
- https://learn.microsoft.com/en-us/agent-framework/workflows/
- https://cohorte.co/blog/designing-graph-native-ai-workflows-with-microsoft-agent-framework
- https://learn.microsoft.com/en-us/agent-framework/concepts/workflows/state
- https://medium.com/@sainitesh/seeing-how-ai-thinks-visualizing-agent-workflows-with-workflowviz-using-microsoft-agent-framework-cdf49fd583dd
- https://www.linkedin.com/pulse/langgraph-routing-orchestrator-worker-evaluator-optimizer-yash-sarode-qqbcc
- https://aws.plainenglish.io/5-workflow-design-patterns-for-building-reliable-agentic-ai-systems-a789cfa3bf10
- https://pub.towardsai.net/5-design-patterns-in-agentic-ai-workflow-c972c83f77e4
- https://www.heyuan110.com/posts/ai/2026-02-26-multi-agent-orchestration/
- https://medium.com/@sathishkraju/the-ai-agentic-workflow-patterns-that-actually-matter-in-2026-08955ac6f398
- https://levelup.gitconnected.com/your-multi-agent-system-works-in-a-demo-production-is-a-different-story-2f8ff6350664
- https://claudecertificationguide.com/ccdv-f/learn/1-agents-workflows/1-3-agent-patterns-frameworks
- https://docs.n8n.io/build/flow-logic/handle-errors-gracefully
- https://community.n8n.io/t/best-practice-for-centralized-error-handling-and-retry-from-failed-step-in-production-workflows/300785?tl=en
- https://community.n8n.io/t/restart-workflow-from-specific-node/800?tl=en
- https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.errortrigger
- https://github.com/n8n-io/n8n/issues/10763
- https://community.n8n.io/t/execute-workflow-with-retry-on-fail-option-is-on-always-output-error/52922?tl=en
- https://dev.to/ciphernutz/n8n-error-handling-best-practices-stop-letting-silent-failures-break-your-business-1j8h
- https://community.n8n.io/t/http-request-node-retry-on-fail-feature/59538?tl=en
- https://community.n8n.io/t/continue-processing-remaining-items-even-on-error/3271?tl=ar
- https://community.n8n.io/t/retry-on-fail-error-but-it-worked/56919?tl=ar
- https://docs.dify.ai/en/cloud/use-dify/build/predefined-error-handling-logic
- https://github.com/langgenius/dify/discussions/26638
- https://docs.dify.ai/en/cloud/use-dify/nodes/code
- https://github.com/langgenius/dify/discussions/6968
- https://docs.dify.ai/en/self-host/deploy/configuration/environments
- https://issues.ecosyste.ms/hosts/GitHub/repositories/langgenius%2Fdify/issues?page=75&per_page=100
- https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.slack/approvals
- https://community.n8n.io/t/human-in-the-loop-with-slack/284892?tl=en
- https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.slack
- https://community.n8n.io/t/include-slack-message-information-in-sendandwait-response-output/115173?tl=en
- https://community.n8n.io/t/slack-webhook-approving-and-waiting-simultaneously/93187?tl=en
- https://operantsolo.com/n8n-human-in-the-loop-tutorial/
- https://community.n8n.io/t/slack-wait-send-and-wait-for-approval-options/67411?tl=en
- https://humangent.io/blog/n8n-slack-approval-workflow
- https://community.n8n.io/t/best-pattern-for-syncing-n8n-executions-into-an-external-proof-and-approval-log/311106?tl=en
- https://www.linkedin.com/posts/n8n_the-chat-node-now-supports-human-in-the-loop-activity-7424376235612585984-Z_sb
- https://n8n.io/integrations/agent/
- https://community.n8n.io/t/introducing-n8n-agents-a-new-way-to-build-agents-you-set-up-once-and-use-anywhere/306323?tl=en
- https://docs.n8n.io/build/build-and-manage-agents
- https://www.reddit.com/r/AI_Agents/comments/1l4v9zw/everyone_says_you_can_build_ai_agents_in_n8n_but/
- https://n8n.io/
- https://docs.dify.ai/en/cloud/use-dify/nodes/parameter-extractor
- https://github.com/r-hashi01/skills-to-dify-workflow/blob/main/skills/skills-to-dify-workflow/SKILL.md
- https://huggingface.co/datasets/zjunlp/Chat2Workflow-Evaluation/commit/6d07f622132707f9a5a196d44696fce756f329ae
- https://docs.dify.ai/en/cloud/use-dify/nodes/doc-extractor
- https://arxiv.org/html/2604.19667v2
- https://docs.dify.ai/en/cloud/use-dify/nodes/list-operator
- https://docs.dify.ai/en/cloud/use-dify/nodes/tools
- https://www.reddit.com/r/n8n/comments/1jiuq7h/how_do_you_figure_out_which_node_is_the_most/
- https://community.n8n.io/t/ai-agent-code-tool-how-to-use-data-from-other-nodes/149566?tl=en
- https://www.coze.com/open/docs/developer_guides/nodejs_overview
- https://www.youtube.com/watch?v=LOTsPJplHnA
- https://arxiv.org/abs/2604.19667
- https://huggingface.co/papers/2604.19667
- https://github.com/zjunlp/Chat2Workflow
- https://arxiv.org/html/2604.19667v1
- https://www.researchgate.net/publication/404059522_Chat2Workflow_A_Benchmark_for_Generating_Executable_Visual_Workflows_with_Natural_Language
- https://tldr.takara.ai/p/2604.19667
- https://huggingface.co/datasets/zjunlp/Chat2Workflow-Evaluation/blob/3044d64dcca2966c038ac208d3e28aa4300ab7c9/README.md
- https://dify.ai/blog/dify-ai-workflow
- https://www.coze.com/open/docs/guides/edit_message
- https://www.coze.com/open/docs/guides
- https://www.coze.com/open/docs/guides/announcement_decommissioning
- https://www.coze.com/open/docs/guides/code_node
- https://www.coze.com/open/docs/guides/llm_batch
- https://www.coze.com/open/docs/guides/larkbase
- https://www.coze.com/open/docs/guides/coze_store
- https://microsoft.github.io/agent-academy/operative/11-obtain-user-feedback/
- https://vladtalkstech.com/apl-6006-study-guide-build-an-agent-in-microsoft-copilot-studio/
- https://d365goddess.com/learn-how-to-enable-customer-intent-for-custom-agents-in-copilot-studio/
- https://www.scribd.com/document/989237149/Microsoft-Copilot-Studio
- https://d365goddess.com/let-your-custom-agent-search-knowledge-articles-in-dynamics-365/
- https://taskjuice.ai/blog/openai-agent-builder-shutdown
- https://hidekazu-konishi.com/entry/openai_agent_builder_evals_and_reusable_prompts_shutdown.html
- https://agentintellect.net/agentkit/
- https://omidsaffari.com/blog/openai-agentkit-shutdown-migration
- https://www.sim.ai/comparisons/openai-agentkit
- https://twitterapi.io/blog/openai-agent-builder
- https://imisofts.com/blog/openai-agent-builder-shutdown/
- https://we.inc/blog/openai-agent-builder-shutdown-what-it-means
- https://kanerika.com/blogs/openai-agentkit/
- https://www.linkedin.com/posts/jmkmba_ad-zapierpartner-sponsored-activity-7381319902579712000-ciqY
- https://thenewstack.io/openai-launches-a-no-code-agent-builder/
- https://www.reddit.com/r/ChatGPTPro/comments/1nzqm7z/openai_just_dropped_agentkit_a_draganddrop_ai/
- https://myaskai.com/blog/ai-customer-service-openai-agent-builder-2026
- https://www.digitalapplied.com/blog/openai-agentkit-complete-guide
- https://www.dataslayer.ai/blog/agent-builder-openais-new-ai-agent-tool-explained
- https://openai.com/academy/workspace-agents/
- https://github.com/azlan-dev/natural-language-ai-agent-builder
- https://medium.com/data-and-beyond/openai-agent-builder-a-complete-walkthrough-to-building-your-first-ai-agent-581bcd742226
- https://openai.com/solutions/use-case/agents/
- https://www.emergentmind.com/papers/2604.19667
- https://www.emergentmind.com/topics/chat2workflow
- https://ribbitribbit.co/paper/arxiv.2604.19667-Chat2Workflow-A-Benchmark-for-Generating-Executable-Visual-Workflows
- https://huggingface.co/papers?q=workflow%20graphs
- https://arxiv.org/pdf/2508.01186
- https://www.coze.com/open/docs/guides/variable_merge_node
- https://www.coze.com/open/docs/guides/knowledge_node
- https://docs.n8n.io/
- https://www.pondhouse-data.com/blog/ai-agents-with-n8n
- https://www.youtube.com/watch?v=zr98hNrBjCE
- https://www.linkedin.com/learning/build-ai-agents-with-n8n/adding-new-tools-to-the-agent-27422089
- https://www.alibabacloud.com/help/en/model-studio/error-code
- https://arxiv.org/html/2607.06273v1
- https://www.sim.ai/comparisons/n8n
- https://github.com/VoltAgent/awesome-openclaw-skills/blob/main/categories/coding-agents-and-ides.md
- https://pages.awscloud.com/rs/112-TZM-766/images/26-APAC-en-US-omdia-other-ardm-agentic-ai-development-platform-in-asia-and-oceania-reprint.pdf?version=1&trk=5629f7ca-87c3-4795-a6f3-7e634468f9a3&sc_channel=el
- https://openreview.net/pdf?id=BnmVJgdyoK
- https://help.aliyun.com/en/model-studio/single-agent-application
- https://www.alibabacloud.com/help/en/model-studio/start-using/
- https://docs.bailian.console.aliyun.com/en/model-studio/single-agent-application
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/application-component-api-reference
- https://help.aliyun.com/en/model-studio/application-introduction
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/application-introduction
- https://www.alibabacloud.com/blog/designing-multi-agent-enterprise-systems-with-alibaba-cloud_603591
- https://www.ibm.com/think/topics/multi-agent-collaboration
- https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.merge
- https://docs.n8n.io/build/work-with-data
- https://docs.n8n.io/build/understand-workflows/workflow-components/connect-nodes-together
- https://community.n8n.io/t/how-to-access-the-outputs-of-a-multi-output-node/2113?tl=en
- https://www.youtube.com/watch?v=p9hvlFKKnII
- https://medium.com/@syrom_85473/a-practical-n8n-workflow-example-from-a-to-z-part-2-aggregating-newsletter-summaries-in-a-688f30f69352
- https://docs.n8n.io/build/work-with-data/understand-n8ns-data-structure
- https://www.hesham.us/n8n-encyclopedia/connections-and-data-flow
- https://www.linkedin.com/pulse/how-data-moves-through-n8n-workflow-ologun-tofunmi-onbuf
- https://docs.dify.ai/en/learn/tutorials/workflow-101/lesson-02
- https://docs.dify.ai/en/cloud/use-dify/build/orchestrate-node
- https://github.com/langgenius/dify/discussions/26138
- https://x.com/dify_ai/status/1991798385347793384
- https://www.youtube.com/watch?v=dJ34OU_JY7Y
- https://memo.d.foundation/breakdown/dify
- https://neo4j.com/videos/nodes-ai-2026-from-ai-workflows-to-graph-native-reasoning-a-dify-plugin-for-querying-neo4j/
- https://www.alibabacloud.com/help/en/agentrun/quick-start-to-low-code-agent-creation-1
- https://help.aliyun.com/en/agentrun/quick-start-to-low-code-agent-creation
- https://help.aliyun.com/en/agentrun/create-agent-through-flow-low-code-1/
- https://github.com/coze-dev/coze-studio
- https://github.com/coze-dev/coze-studio/wiki/4.-Plugin-Configuration
- https://github.com/coze-dev/coze-studio/wiki/7.-Development-Standards
- https://forum.langchain.com/t/langsmith-ui-stuck-in-router-node-when-not-not-invoking-subgraph-from-router-node/3990
- https://github.com/langchain-ai/langgraph/issues/2965
- https://www.workflowbuilder.io/blog/langgraph-studio-guide
- https://forum.langchain.com/t/langsmith-studio-not-showing-state-schema/2371
- https://stackoverflow.com/questions/79654297/conditional-edge-in-langgraph-is-not-working-as-expected
- https://forum.langchain.com/t/studio-not-recognizing-my-custom-inputs/1108
- https://python.plainenglish.io/mastering-langgraph-studio-how-to-visualize-debug-and-accelerate-your-ai-agent-workflows-e3c2424ec3b9
- https://github.com/bytedance/deer-flow?ref=bookmrks.io
- https://www.elastic.co/docs/release-notes/cloud-serverless
- https://arxiv.org/html/2610.13455v1
- https://classic.yarnpkg.com/en/package/@n8n/n8n-nodes-langchain
- https://awesome-pi.site/extensions/
- https://media.rss.com/ai-fire-daily/feed.xml
- https://htek.dev/articles/all-agent-harnesses-live-comparison
- https://github.com/THU-MAIC/OpenMAIC/blob/main/CHANGELOG.md
- https://krakowiak.eu/news
- https://www.alibabacloud.com/help/en/model-studio/regions
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/prompt-model-availability
- https://docs.oracle.com/iaas/Content/generative-ai/regions-without-local-on-demand-model-hosting.htm
- https://docs.aws.amazon.com/bedrock/latest/userguide/flows-supported.html
- https://modelavailability.com/platforms/gcp/regions/asia-southeast1
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/machine-learning/general/locations
- https://vietnamnews.vn/media-outreach/1656172/alibaba-cloud-announces-new-availability-zones-and-global-investment-to-fuel-ai-innovation.html
- https://www.alibabacloud.com/help/en/model-studio/singapore-regional-access-information
- https://superpowerdaily.com/posts/oracle-brings-ai-model-access-to-30-more-cloud-regions-and-adds-agent-workspaces
- https://www.facebook.com/mcpcio/videos/if-youre-building-with-ai-coding-agents-on-aws-this-ones-worth-paying-attention-/1120532050443964/
- https://codelabs.developers.google.com/vertexai-gws-agents
- https://docs.cloud.google.com/gemini-enterprise-agent-platform
- https://www.youtube.com/watch?v=8rlNdKywldQ&vl=en
- https://medium.com/@fahey_james/google-clouds-visual-ai-agents-mark-the-beginning-of-the-enterprise-agent-era-6f0c050233ac
- https://www.facebook.com/googlecloud/videos/the-agent-designer-tool-in-geminienterprise-in-preview-lets-you-build-or-edit-an/2500816083706133/
- https://thecloudcollective.es/en/blog-entries/gemini-enterprise-agent-platform
- https://aws-news.com/article/2024-11-22-amazon-bedrock-flows-is-now-generally-available-with-enhanced-safety-and-traceability
- https://tutorialsdojo.com/amazon-bedrock-flows-cheat-sheet/
- https://docs.aws.amazon.com/bedrock/latest/userguide/flows-create-async.html
- https://aws-news.com/article/2025-07-11-long-running-execution-flows-now-supported-in-amazon-bedrock-flows-in-public-preview
- https://serverlessland.com/blog/long-running-execution-flows-now-supported-in-amazon-bedrock-flows-in-public-preview---artificial-intelligence
- https://aws.amazon.com/about-aws/whats-new/2025/06/amazon-bedrock-flows-preview-persistent-long-running-execution-inline-code-support/
- https://www.youtube.com/watch?v=wizEw5a4gvM
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-long-run.html
- https://www.linkedin.com/posts/stephen-abbot_huge-thanks-to-john-marciniak-for-sharing-activity-7350873830841569280-j5IH
- https://github.com/awslabs/agentcore-samples
- https://www.youtube.com/watch?v=wzIQDPFQx30
- https://repost.aws/questions/QUjkf4WbikQ6WrpuH9sppjnw/bedrock-agents-vs-bedrock-agentcore
- https://dev.to/prime_1/comment/3159j
- https://rywalker.com/research/agentcore-code-interpreter
- https://builder.aws.com/content/3BAe8mzNa6NOtEwXVmMNkXyhugc/running-ai-agents-on-eks-vs-amazon-bedrock-agentcore-a-well-architected-perspective
- https://help.aliyun.com/en/agentrun/call-flow-agent-using-ai-gateway-1
- https://www.alibabacloud.com/help/doc-detail/3049289.html
- https://www.alibabacloud.com/blog/599832
- https://cloud.google.com/gemini-enterprise/agents
- https://codelabs.developers.google.com/next26/dev-keynote/gemini-enterprise
- https://www.youtube.com/watch?v=eIBrvOUbufY
- https://medium.com/@adnanmasood/where-agents-live-part-3-gemini-enterprise-agent-platform-on-google-cloud-ae148b3c0c98
- https://console.cloud.google.com/agent-platform/studio/multimodal
- https://www.facebook.com/googlecloud/videos/agent-designer-in-geminienterprise-allows-you-to-orchestrate-complex-automations/789313627063039/
- https://hiviewsolutions.com/blog/build-an-agent-with-gemini/
- https://www.facebook.com/googlecloud/videos/introducing-gemini-enterprise-agent-platformour-new-comprehensive-platform-to-bu/935618199107712/
- https://medium.com/google-cloud/tutorial-series-gemini-enterprise-agent-platform-part-1-platform-foundations-your-first-4f014ea3517d
- https://www.youtube.com/watch?v=BFtkDiJYYHk
- https://discuss.ai.google.dev/t/architecting-multi-agent-systems-autonomous-workflows-with-google-ai-studio-and-gemini/89598
- https://www.mindstudio.ai/blog/gemini-enterprise-agent-platform-business-automation
- https://techcommunity.microsoft.com/blog/azurearchitectureblog/building-ai-agents-workflow-first-vs-code-first-vs-hybrid/4466788
- https://www.alibabacloud.com/blog/603278
- https://help.aliyun.com/en/model-studio/what-is-model-studio
- https://www.alibabacloud.com/help/en/model-studio/models
- https://www.alizila.com/alibaba-cloud-announced-the-latest-ai-models-tools-and-infrastructure-available-to-drive-more-efficient-global-ai-community/
- https://freellmapihub.com/p/alibaba-model-studio
- https://www.alibabacloud.com/en/global-locations?_p_lc=1
- https://www.developersdigest.tech/models/fine-tuning/alibaba-model-studio
- https://www.alibabacloud.com/help/doc-detail/3049292.html
- https://medium.com/jin-system-architect/alibaba-cloud-may-not-be-selling-an-agent-builder-at-all-da8012e939c3
- https://www.alibabacloud.com/help/id/agentrun/quick-start-to-low-code-agent-creation
- https://www.alibabacloud.com/help/pt-br/doc-detail/3049290.html
- https://github.com/alibaba/spring-ai-alibaba/releases
- https://www.alibabacloud.com/help/es/doc-detail/3049290.html
- https://www.linkedin.com/pulse/ai-weekly-news-updates-samuel-chima-98yvf
- https://blog.netmind.ai/
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/agent-studio/design-agents
- https://medium.com/google-cloud/build-an-ai-helper-in-5-minutes-an-easy-guide-to-google-clouds-agent-designer-a47909be15b8
- https://docs.cloud.google.com/release-notes
- https://codelabs.developers.google.com/codelabs/ge/bumble-workshop
- https://www.linkedin.com/posts/shubhamsaboo_five-guides-for-agent-platform-activity-7459428855934607360-ROCA
- https://jonjones.ai/ai/vertex-ai-agent-builder-operator-guide-2026/
- https://atalupadhyay.wordpress.com/2026/09/28/google-cloud-professional-agentic-architect-certification-exam/
- https://www.workspaceblog.in/blog/gemini-enterprise-workflow-builder-guide/
- https://medium.com/google-cloud/tutorial-getting-started-with-google-antigravity-b5cc74c103c2
- https://www.alibabacloud.com/help/tr/model-studio/workflow-application
- https://www.alibabacloud.com/help/doc-detail/2985842.html
- https://app.thetestingacademy.com/blog/n8n-ai-nodes-explained
- https://zapier.com/blog/context-engineering/
- https://www.kimi.ai/resources/no-code-ai-agent
- https://www.taskade.com/blog/ai-agent-platforms
- https://www.aiprofind.com/blog/how-to-use-zapier-agents-to-answer-every-new-lead-in-minutes
- https://www.linkedin.com/top-content/artificial-intelligence/developing-ai-agents/ai-studio-for-designing-ai-agents/
- https://aiagentics.io/compare/best-no-code-ai-agent-builders
- https://yourgpt.ai/blog/comparison/crisp-chat-alternatives
- https://www.university-365.com/post/zapier-workflow-automation-and-ai-orchestration-on-three-separate-meters
- https://www.facebook.com/groups/1170770881280670/posts/1312983590392731/
- https://www.linkedin.com/posts/tripledart-digital_windsurfs-strategy-activity-7330827185324220416-h24I
- https://eclipse.dev/elk/reference/options/org-eclipse-elk-layered-crossingMinimization-strategy.html
- https://eclipse.dev/elk/blog/posts/2025/25-08-21-layered.html
- https://github.com/kieler/elkjs/issues/203
- https://arxiv.org/pdf/2311.00533
- https://stackoverflow.com/questions/66786313/keep-edges-seperated
- https://blog.obeosoft.com/how-to-define-your-own-elk-layout-and-use-it-in-sirius-desktop
- https://reactflow.dev/examples/grouping/sub-flows
- https://reactflow.dev/learn/concepts/built-in-components
- https://reactflow.dev/api-reference/components/minimap
- https://github.com/xyflow/xyflow/issues/5575
- https://www.yfiles.com/resources/how-to/layout-algorithms-for-reactflow.html
- https://reactflow.dev/api-reference/react-flow
- https://www.reddit.com/r/react/comments/zroa2v/is_anyone_familiar_with_subflows_in_reactflow/
- https://www.singlestore.com/blog/refactoring-singlestores-visual-explain-to-use-react-flow/
- https://www.npmjs.com/package/reactflow
- https://github.com/mermaid-js/mermaid/issues/6438
- https://stackoverflow.com/questions/71803509/mermaid-subgraphs-laid-out-inconsistently
- https://mermaid.ai/open-source/syntax/flowchart.html
- https://blogs.reliablepenguin.com/2025/12/26/flowcharts-beyond-the-basics-with-mermaid
- https://www.devtoolsdaily.com/mermaid/how-to/subgraph-direction/
- https://miro.com/mermaid-diagram/flowchart/
- https://www.facebook.com/fb-answers/mermaid-flowchart-subgraph-direction-tb-documentation/
- https://github.com/mermaid-js/mermaid/issues/6785
- https://emersonbottero.github.io/mermaid-docs/syntax/flowchart.html
- https://mdview.io/s/mermaid-subgraph-examples
- https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.splitinbatches
- https://docs.n8n.io/build/flow-logic/loop
- https://community.n8n.io/t/loop-over-items-only-processing-partial-batch-workflow-completes-early-without-errors/218973?tl=en
- https://www.reddit.com/r/n8n/comments/1qxsvbs/help_needed_regarding_loop_over_items_split_into/
- https://www.youtube.com/watch?v=qGrG_lRFulw
- https://community.n8n.io/t/how-to-handle-loops-in-n8n/225055?tl=en
- https://community.n8n.io/t/loop-through-items-and-invoke-exec-node-on-each/8210?tl=en
- https://latenode.com/blog/n8n-loop-over-items-node-documentation
- https://community.n8n.io/t/noob-question-loop-end-executed-for-each-item/119188
- https://www.hostinger.com/tutorials/how-to-loop-over-items-in-n8n/
- https://openai.github.io/openai-agents-python/
- https://developers.openai.com/api/docs/guides/agents
- https://www.youtube.com/watch?v=LuarehusOWU&vl=en-US
- https://developers.openai.com/api/docs/guides/agents/orchestration
- https://community.openai.com/t/agents-sdk-looping-handoffs/1256231
- https://medium.com/@johnidouglasmarangon/building-multi-agents-with-openai-agent-sdk-8dd9ecfb7663
- https://towardsdatascience.com/hands-on-with-agents-sdk-multi-agent-collaboration/
- https://openai.github.io/openai-agents-python/agents/
- https://community.openai.com/t/openai-agents-handoff-implementation/1370797
- https://www.facebook.com/fb-answers/openai-agents-sdk-orchestration-handoffs-guardrails-documentation/
- https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/handoff
- https://devblogs.microsoft.com/agent-framework/a-tour-of-handoff-orchestration-pattern/
- https://medium.com/@junewine/multi-agent-rag-with-handoff-orchestration-6f8763c94e6d
- https://github.com/microsoft/agent-framework/issues/4786
- https://arafattehsin.com/blog/agent-orchestration-patterns-part-5/
- https://www.lukaswalter.dev/posts/agentframework_1_12/
- https://learn.microsoft.com/en-us/semantic-kernel/frameworks/agent/agent-orchestration/handoff
- https://singhrajeev.com/2026/01/18/microsoft-agent-framework-workflows-the-next-step-in-building-intelligent-multi-agent-ai-systems/
- https://docs.dify.ai/en/cloud/use-dify/nodes/trigger/overview
- https://dify.ai/blog/which-trigger-should-i-use-a-beginner-s-guide-to-starting-dify-workflows
- https://www.youtube.com/watch?v=iyZ6-D_2qfk
- https://dify.ai/blog/introducing-trigger
- https://github.com/langgenius/dify/discussions/32389
- https://docs.dify.ai/en/cloud/use-dify/nodes/trigger/webhook-trigger
- https://apis.io/asyncapis/dify/dify-events/
- https://docs.dify.ai/en/cloud/use-dify/nodes/trigger/plugin-trigger
- https://www.linkedin.com/posts/langgenius_dify-workflow-trigger-is-now-available-activity-7397564176111452160-c7RW
- https://www.youtube.com/watch?v=l00ZB2ZaVO0
- https://code.visualstudio.com/blogs/2026/02/05/multi-agent-development
- https://www.reddit.com/r/ClaudeAI/comments/1lfimy8/any_tips_on_multi_agent_for_the_same_project_with/
- https://cozehq.medium.com/building-an-all-in-one-personal-assistant-with-cozes-multi-agent-mode-e0f695137edf
- https://cursor.com/help/ai-features/multi-agent
- https://www.facebook.com/groups/claudeaicommunity/posts/1261684892665342/
- https://platform.claude.com/docs/en/managed-agents/agent-setup
- https://apito.ai/en/blog/tools/coze-3-agent-collaboration/
- https://arxiv.org/html/2606.15376v1
- https://github.com/zed-industries/zed/discussions/24028
- https://www.getorchestra.io/knowledge-hub/data-tools/n8n-ai-workflow-builder
- https://blog.n8n.io/introducing-n8n-assistant/
- https://github.com/muid-nihal/n8n-ai-builder/blob/master/INSTRUCTIONS.md
- https://www.facebook.com/groups/aifire.co/posts/1764473657491269/
- https://blog.n8n.io/production-ai-playbook-deterministic-steps-ai-steps/
- https://leanware.co/insights/n8n-openai-integration
- https://www.facebook.com/n8nio/posts/the-chat-node-now-supports-human-in-the-loop-actions-v25-in-agentic-workflows-pa/1414560897133538/
- https://github.com/langflow-ai/langflow/issues/8869
- https://www.youtube.com/watch?v=1T-NLUaiXsM
- https://docs.pingidentity.com/davinci/flows/davinci_node_properties.html
- https://www.youtube.com/watch?v=2pSSr38DwcY
- https://cinapex.pro/davinci-resolve-nodes-guide/
- https://answers.laserfiche.com/questions/80642/Workflows-terminated-message-submission-rate
- https://experienceleague.adobe.com/en/docs/experience-platform/landing/troubleshooting
- https://www.acquisition.gov/far/52.216-19
- https://www.ssa.gov/OP_Home/cfr20/404/404-1569a.htm
- https://www.cga.ct.gov/2025/pub/chap_926.htm
- https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=50742
- https://pubmed.ncbi.nlm.nih.gov/17346604/
- https://legislature.idaho.gov/statutesrules/idstat/title5/t5ch2/sect5-219/
- https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-max-or-ultra-plan
- https://issues.org/limits-of-data-nguyen/
- https://legislature.maine.gov/statutes/17-a/title17-asec8.html
- https://www.youtube.com/watch?v=LCLxvYAmUcE&vl=en
- https://medium.com/google-cloud/cx-agent-studio-architecture-deep-dive-root-agents-sub-agents-tools-and-the-agentic-paradigm-1203ca2ddafe
- https://www.skills.google/focuses/63564?parent=catalog
- https://workspace.google.com/studio/
- https://www.linkedin.com/posts/charlie-hills_step-by-step-guide-how-to-create-ai-agents-activity-7373656934253662209-PjYp
- https://growwstacks.com/blog/zapier-agents-no-code-ai-automation/
- https://zapier.com/blog/zapier-agents-pods-dashboards/
- https://dify.ai/blog/the-human-input-node-bringing-human-judgment-into-automated-workflows
- https://dify.ai/blog/how-to-let-your-agent-call-dify-workflows-directly
- https://dify.ai/blog/dify-s-official-cli-difyctl-ships
- https://trpc-group.github.io/trpc-agent-go/graph/
- https://www.sim.ai/library/langgraph-alternatives
- https://www.facebook.com/startupdisrupt/posts/-enterprise-ai-messy-fragmented-and-hard-to-scaleat-innovationsunited2025-apoco-/1341269131332794/
- https://www.ayautomate.com/blog/best-open-source-ai-agent-frameworks
- https://www.facebook.com/datasciencewizards/posts/enterprise-ai-doesnt-become-enterprise-ready-simply-because-more-models-copilots/1480628917418381/
- https://medium.com/@Jason-Han/stop-reading-n8n-workflows-node-by-node-theres-a-better-way-4e44878d91b7
- https://www.getorchestra.io/guides/n8n-skills
- https://www.aifire.co/p/the-14-essential-n8n-nodes-for-any-automation-workflow
- https://developer.amd.com/playbooks/n8n-automation-gpt-oss/
- https://www.facebook.com/groups/n8ndevelopers/posts/1740843613164261/
- https://customermates.com/en/blog/n8n-for-beginners-build-your-first-workflow
- https://www.linkedin.com/posts/paschal-nweke_automation-customersupport-activity-7512210185143250945-GL57
- https://qynzoo.com/blog-make-vs-n8n.html
- https://max-productive.ai/ai-tools/n8n/
- https://www.facebook.com/alibabacloud/posts/ai-can-do-more-than-generate-ideas-it-can-get-work-donediscover-how-agent-applic/1574339894738097/
- https://www.reddit.com/r/ClaudeWorkflows/comments/1x7jka2/workflow_multiagent_ai_orchestration_for_game/
- https://community.latenode.com/t/what-does-it-actually-look-like-to-coordinate-multiple-ai-agents-on-a-single-complex-workflow/54396
- https://www.zenml.io/llmops-database/building-a-data-centric-multi-agent-platform-for-enterprise-ai
- https://www.facebook.com/groups/vibecodinglife/posts/2070860106835849/
- https://www.youtube.com/watch?v=QfjCsYJv_DE
- https://builder.aws.com/content/3LGhl8Uh6HLfFSXpUe6REe6Ejt3/chaining-steps-with-amazon-bedrock-flows
- https://www.linkedin.com/posts/trevorsull_intro-to-amazon-bedrock-prompt-flow-builder-activity-7231732260914216960-bpY6
- https://github.com/aws-samples/amazon-bedrock-flows-samples
- https://xobito.com/docs/flows/builder
- https://community.n8n.io/t/dynamic-node-layouts-native-vertical-orientation-label-positioning/296484?tl=en
- https://github.com/OpenFn/lightning/issues/3124
- https://community.openfn.org/t/allow-free-position-of-nodes-in-a-workflow/719
- https://community.alteryx.com/discussion/548446/this-feature-that-you-didnt-know-about-will-change-your-life
- https://www.workflowbuilder.io/compare/dify
- https://dify.ai/blog/why-a-reliable-visual-agentic-workflow-matters
- https://docs.aws.amazon.com/bedrock/latest/userguide/inference-parameters.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html
- https://www.promptfoo.dev/docs/providers/aws-bedrock/
- https://www.youtube.com/watch?v=f1Y1iuJ-1mI
- https://codesignal.com/learn/courses/basics-of-genai-foundation-models-with-amazon-bedrock/lessons/configuring-bedrock-responses
- https://trailhead.salesforce.com/content/learn/modules/amazon-bedrock-foundation-models/explore-foundation-models-in-amazon-bedrock
- https://caylent.com/blog/amazon-bedrock-everything-you-need-to-know
- https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-use.html
- https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook
- https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.chattrigger
- https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.n8ntrigger
- https://community.n8n.io/t/two-trigger-node-seems-like-it-only-execute-one-at-a-time/190143?tl=en
- https://www.youtube.com/watch?v=vu8pVoqIYTQ
- https://www.reddit.com/r/n8n/comments/1nssamn/change_chat_trigger_url/
- https://www.hesham.us/n8n-encyclopedia/triggers
- https://medium.com/@jovial_brass_otter_147/introduction-to-developing-an-n8n-trigger-node-1a286bbd0abd
- https://www.facebook.com/fb-answers/n8n-manual-trigger-node-name/
- https://www.c-sharpcorner.com/article/types-of-triggers-in-n8n?srsltid=AYCX9vL1yEY0meKWEu5UaM9qmX_ygsLzrIbzzSZbU8mGdGJXvsLngu0j
- https://docs.dify.ai/en/cloud/use-dify/nodes/output
- https://github.com/langgenius/dify/discussions/5992
- https://docs.dify.ai/en/cloud/use-dify/nodes/human-input
- https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait
- https://community.n8n.io/t/wait-node-vs-human-in-the-loop-node/259594?tl=en
- https://www.customjs.space/blog/n8n-human-in-the-loop
- https://community.n8n.io/t/human-in-the-loop-time-to-disconnect/120118?tl=en
- https://mpiresolutions.com/lp/n8n/n8n-human-in-the-loop/
- https://community.n8n.io/t/n8n-wait-node-does-not-support-manual-click-resume-in-the-workflow-only/258181?tl=de
- https://www.youtube.com/watch?v=82HaEkA025M
- https://community.n8n.io/t/how-to-add-real-human-approval-to-an-n8n-ai-workflow/303584?tl=en
- https://www.reddit.com/r/n8n/comments/1q4l31s/wait_node_is_underrated_for_building_resilient/
- https://community.n8n.io/t/option-to-be-able-to-force-a-wait-node-via-webhook-when-not-set-to-resume-on-webhook-call/307455?tl=en
- https://github.com/FlowiseAI/Flowise/issues/4719
- https://docs.flowiseai.com/integrations/langchain/agents
- https://x.com/dify_ai/status/1979042534501306407
- https://www.linkedin.com/posts/anne-zhu-b44211ba_agenticworkflow-aiapplication-dify-activity-7386249019678892032-iEGc
- https://evomap.ai/blog/dify-agent-vs-workflow-difference
- https://github.com/agno-agi/agno/discussions/5970
- https://www.getdynamiq.ai/post/best-dify-alternatives-for-ai-workflow-automation
- https://github.blog/ai-and-ml/github-copilot/how-canvases-make-agentic-workflows-visible-steerable-and-cost-efficient/
- https://flow-like.com/compare/flow-like-vs-dify
- https://blog.sandbase.ai/dify-ai-platform-explained-2026/
- https://help.aliyun.com/en/model-studio/flow-agent-api-overview
- https://www.alibabacloud.com/help/en/model-studio/cli/quickstart
- https://www.reddit.com/r/copilotstudio/comments/1kn7ln6/what_the_hell_is_the_difference_between_agent/
- https://agic.it/en/insights/agent-flows-copilot-studio
- https://www.facebook.com/groups/developerkaki/posts/2444577925888106/
- https://powergi.net/blog/agent-flows-in-copilot-studio/
- https://edvaldoguimaraes.com.br/2026/09/11/understanding-microsoft-copilot-studio-agents-workflows-and-harnesses/
- https://www.linkedin.com/pulse/introducing-deep-reasoning-agent-flows-copilot-studio-charles-lamanna-n1zxc
- https://www.youtube.com/watch?v=EIvbi99G9RE
- https://www.alibabacloud.com/help/en/agentrun/call-flow-agent-using-ai-gateway-1.md
- https://www.facebook.com/alibabacloud/videos/ai-can-do-more-than-generate-ideas-it-can-get-work-donediscover-how-agent-applic/4530527223888382/
- https://github.com/nirajdubey007/langFlow/blob/main/PROJECT_ANALYSIS.md
- https://reactflow.dev/learn/troubleshooting/common-errors
- https://github.com/langflow-ai/langflow/blob/main/AGENTS.md
- https://github.com/mattreid1/langflow
- https://github.com/ABAPPLO/LangFlow_Canvas/blob/main/CLAUDE.md
- https://www.instagram.com/p/DbmDjvkEbi-/
- https://codevetter.com/unpack/langflow
- https://www.instagram.com/reel/DeLkqUQj2Ok/
- https://www.workflowbuilder.io/blog/from-react-flow-to-workflow-builder
- https://reactflow.dev/showcase
- https://github.com/dspraneeth07/Flow_OS
- https://github.com/uhub/awesome-actionscript-sorted/blob/master/README.md
- https://github.com/devhimanshuu/Agent-Studio
- https://www.workflowbuilder.io/blog/best-workflow-builder-sdks-for-react
- https://github.com/tanimon/awesome-stars
- https://www.linkedin.com/posts/lumyslinski_opensource-medtech-healthtech-activity-7495777847673020416-UjAE
- https://github.com/skyfe79/Awesome
- https://openclawai.io/skills/productivity
- https://github.com/wbkd/react-flow-docs/blob/main/package.json
- https://github.com/xyflow/xyflow
- https://github.com/FlowiseAI/Flowise/issues/3757
- https://github.com/FlowiseAI/Flowise/blob/main/package.json
- https://www.npmjs.com/package/flowise-react-json-view?activeTab=dependencies
- https://github.com/topics/reactflow-example
- https://github.com/FlowiseAI/Flowise/issues/2390
- https://www.youtube.com/watch?v=GjIumLrN2Zs
