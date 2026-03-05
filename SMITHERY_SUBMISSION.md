# Smithery Registry Submission - 0pi MCP Server

## Submission Information

Use this when submitting to https://github.com/smithery-ai/registry

### servers.json Entry

```json
{
  "name": "0pi",
  "displayName": "0pi - Free Object Storage for Agents",
  "description": "Free temporary object storage for AI agents - cache contexts, bridge multi-agent workflows, and share data between sessions. 2 hour expiry.",
  "npmPackage": "@0pi/mcp-server",
  "repository": "https://github.com/dizzydes/0pi-mcp-server",
  "homepage": "https://0pi.dev",
  "categories": ["storage", "caching", "multi-agent", "workspace"],
  "tags": [
    "temp-storage",
    "RAG",
    "storage",
    "caching",
    "database"
  ],
  "author": "Des Conlon",
  "license": "MIT"
}
```

### Pull Request Title

```
Add 0pi MCP Server - Free Storage Dump for AI Agents
```

### Pull Request Description

```markdown
## 0pi MCP Server

**Description:**
Free temporary object storage for AI agents to cache contexts, bridge multi-agent workflows, and share data between sessions.

**Use Cases:**
- 🧠 Context Caching - Offload large contexts when approaching token limits
- 🤝 Multi-Agent Bridge - Share data between different AI agents seamlessly
- 📦 Temporary Storage - 2-hour auto-expiring storage for agent content
- 🔄 Workflow Continuity - Pass intermediate results between sessions
- 🌐 Web Automation - Store DOM snapshots for multi-step workflows
- 💾 Code Sharing - Temporary storage for generated code

**Links:**
- npm: https://www.npmjs.com/package/@0pi/mcp-server
- GitHub: https://github.com/dizzydes/0pi-mcp-server
- Website: https://0pi.dev

**Installation:**
```bash
npx @0pi/mcp-server
```

**Tested with:**
- ✅ Claude Desktop
- ✅ Cline (VS Code)
- ✅ Generic MCP clients

**License:** MIT
```

## Alternative: Awesome MCP Servers Submission

For https://github.com/punkpeye/awesome-mcp-servers

Add to README.md under appropriate category:

```markdown
### Storage & Caching

#### 0pi - Dropbox for Agents
Free temporary object storage for AI agents to cache contexts, bridge multi-agent workflows, and share data between sessions. Free 2-hour auto-expiring storage.

- [npm](https://www.npmjs.com/package/@0pi/mcp-server) 
- [GitHub](https://github.com/dizzydes/0pi-mcp-server)
- [Website](https://0pi.dev)

**Use cases:** Context caching, multi-agent communication, workflow bridging
```

## Social Media Announcement Templates

### Twitter/X

```
🚀 Just launched 0pi MCP Server - Dropbox for AI Agents!

✨ Free ephemeral workspace for agents to:
• Cache large contexts before hitting limits
• Bridge multi-agent workflows seamlessly  
• Share data between sessions
• Store temporary results (2hr auto-expire)

Try it: npx @0pi/mcp-server
Docs: https://0pi.dev

#MCP #AI #Claude #Agents #LLM
```

### Discord (MCP Community)

```
Hey everyone! 👋

I just published 0pi - a free MCP server for ephemeral agent workspaces.

**Problem it solves:**
Agents hitting context limits or needing to pass data between sessions/instances.

**How it works:**
- Agents save state to cloud workspace (create_shared_workspace tool)
- Returns shareable URL valid for 2 hours
- Other agents retrieve data via workspace ID
- Data auto-expires, zero cleanup needed

**Try it:**
```bash
npx @0pi/mcp-server
```

GitHub: https://github.com/dizzydes/0pi-mcp-server
Live API: https://0pi.dev

Would love feedback! 🙏
```

### Reddit (r/ClaudeAI, r/LocalLLaMA)

```
[Tool] 0pi MCP Server - Ephemeral Workspace for AI Agents

I built a free MCP server that solves context overflow and multi-agent communication.

**Use Cases:**
- Save large contexts before hitting token limits
- Bridge data between different agent instances
- Share intermediate results in multi-step workflows
- Temporary code/data storage (auto-expires in 2hrs)

**Features:**
- Zero configuration required
- Free public API (https://0pi.dev)
- Works with Claude Desktop, Cline, any MCP client
- JSONL logging for debugging

**Installation:**
```bash
npx @0pi/mcp-server
```

**Example:**
Agent A generates research → saves to workspace → Agent B retrieves and codes from it.

GitHub: https://github.com/dizzydes/0pi-mcp-server

Happy to answer questions!
```
