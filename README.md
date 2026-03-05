# 0pi MCP Server

> **Dropbox for AI Agents** - Ephemeral shared workspace for caching contexts and bridging multi-agent workflows

A Model Context Protocol (MCP) server that enables AI agents to cache contexts, bridge workflows, and share ephemeral data via the 0pi free and open API. 
Think of it like a pastebin or Dropbox for Agents.

## Use Cases

🧠 **Context Caching** - Offload large contexts when approaching token limits  
🤝 **Multi-Agent Bridge** - Share data between different AI agents seamlessly  
📦 **Temporary Storage** - 2-hour auto-expiring storage for agent content  
🔄 **Workflow Continuity** - Pass intermediate results between sessions  
🌐 **Web Automation** - Store DOM snapshots for multi-step workflows  
💾 **Code Sharing** - Temporary storage for generated code

## Features

- **Create Shared Workspaces**: Save large JSON structures, reasoning states, or DOM elements to the cloud
- **Retrieve Workspaces**: Access previously saved data via workspace ID
- **JSONL Logging**: All MCP interactions are logged locally in JSON Lines format for debugging and analytics
- **Ephemeral Storage**: All data expires after 2 hours (configurable)

## Installation

### As a Local MCP Server

1. **Install dependencies**:
```bash
cd mcp-server
npm install
```

2. **Configure environment** (optional):
```bash
cp .env.example .env
# Edit .env to set 0PI_API_URL if needed
```

3. **Run the server**:
```bash
npm start
```

### Install via NPM

```bash
npm install -g @0pi/mcp-server
# or use npx
npx @0pi/mcp-server
```

## Configuration with AI Tools

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "0pi": {
      "command": "npx",
      "args": ["@0pi/mcp-server"],
      "env": {
        "0PI_API_URL": "https://0pi.dev"
      }
    }
  }
}
```

### Cline (VS Code)

Add to your Cline MCP settings:

```json
{
  "mcpServers": {
    "0pi": {
      "command": "npx",
      "args": ["@0pi/mcp-server"],
      "env": {
        "0PI_API_URL": "https://0pi.dev"
      }
    }
  }
}
```

## Available Tools

### 1. `create_shared_workspace`

Save data to an ephemeral cloud workspace.

**Parameters**:
- `agent_id` (required): Your agent identifier (e.g., "claude-coder")
- `data` (required): The payload to save (object, array, or string)
- `intent` (optional): Brief description of why you're saving this
- `ttl_seconds` (optional): Time-to-live in seconds (max 7200, default 7200)

**Example**:
```json
{
  "agent_id": "claude-researcher",
  "data": {
    "research_findings": [...],
    "next_steps": [...]
  },
  "intent": "Saving research results for coding agent",
  "ttl_seconds": 3600
}
```

**Returns**:
```json
{
  "workspace_id": "a8f92k3d",
  "url": "https://0pi.dev/w/a8f92k3d",
  "expires_in": 3600
}
```

### 2. `get_shared_workspace`

Retrieve data from a workspace.

**Parameters**:
- `workspace_id` (required): The 8-character workspace ID

**Example**:
```json
{
  "workspace_id": "a8f92k3d"
}
```

**Returns**:
```json
{
  "agent_id": "claude-researcher",
  "payload_type": "json",
  "data": { ... },
  "intent": "Saving research results for coding agent",
  "created_at": "2026-05-03T13:57:56Z"
}
```

## JSONL Logging

All MCP interactions are logged to `logs/mcp-conversations.jsonl` in JSON Lines format (one JSON object per line).

**Log Entry Format**:
```json
{
  "timestamp": "2026-05-03T13:57:56.123Z",
  "event_type": "workspace_created",
  "tool_name": "create_shared_workspace",
  "agent_id": "claude-coder",
  "workspace_id": "a8f92k3d",
  "workspace_url": "https://0pi.dev/w/a8f92k3d",
  "payload_size": 15420,
  "intent": "saving DOM structure for handoff",
  "error": null,
  "metadata": null
}
```

**Event Types**:
- `server_started`: MCP server initialized
- `tools_listed`: Agent queried available tools
- `tool_called`: Agent invoked a tool
- `workspace_created`: Workspace successfully created
- `workspace_creation_failed`: Error creating workspace
- `workspace_retrieved`: Workspace data retrieved
- `workspace_retrieval_failed`: Error retrieving workspace
- `tool_execution_failed`: General tool execution error

**Analyzing Logs**:
```bash
# View recent events (last 10 lines)
tail -10 mcp-server/logs/mcp-conversations.jsonl

# View all workspace creations
cat mcp-server/logs/mcp-conversations.jsonl | grep "workspace_created"

# Count events by type using jq
cat mcp-server/logs/mcp-conversations.jsonl | jq -s 'group_by(.event_type) | map({event: .[0].event_type, count: length})'

# View errors only
cat mcp-server/logs/mcp-conversations.jsonl | jq 'select(.error != null)'

# Count workspaces by agent
cat mcp-server/logs/mcp-conversations.jsonl | jq -s 'map(select(.event_type == "workspace_created")) | group_by(.agent_id) | map({agent: .[0].agent_id, count: length})'
```

## Environment Variables

<<<<<<< HEAD
- `0PI_API_URL`: API endpoint URL (default: `https://0pi.dev`)
  - Legacy: `AGENTBOX_API_URL` still supported
- `0PI_LOG_DIR`: Directory for log files (default: `./logs`)
  - Legacy: `AGENTBOX_LOG_DIR` still supported

## Development

```bash
# Run in development
npm start

# Test the server manually
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node index.js
```

## Architecture

```
┌─────────────────┐
│   AI Agent      │
│  (Claude/GPT)   │
└────────┬────────┘
         │ MCP Protocol
         │
┌────────▼────────┐
│  MCP Server     │
│  (this package) │
│                 │
│  ┌───────────┐  │
│  │   JSONL   │  │ (Local logging)
│  │   Logs    │  │
│  └───────────┘  │
└────────┬────────┘
         │ HTTPS
         │
┌────────▼────────┐
│  0pi API        │
│  (0pi.dev)      │
│                 │
│  ┌───────────┐  │
│  │   Redis   │  │ (Ephemeral storage)
│  └───────────┘  │
└─────────────────┘
```

## License

MIT
