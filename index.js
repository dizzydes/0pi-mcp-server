#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get __dirname equivalent for ESM (will be undefined in CJS transpiled code)
let __filename, __dirname;
try {
  __filename = fileURLToPath(import.meta.url);
  __dirname = dirname(__filename);
} catch (e) {
  // Running in transpiled mode (Smithery scan), skip file path resolution
  __dirname = process.cwd();
}

// Configuration
const API_BASE_URL = process.env.OPI_API_URL || process.env.AGENTBOX_API_URL || 'https://0pi.dev';
const LOG_DIR = process.env.OPI_LOG_DIR || process.env.AGENTBOX_LOG_DIR || (__dirname ? join(__dirname, 'logs') : './logs');
const LOG_FILE = LOG_DIR ? join(LOG_DIR, 'mcp-conversations.jsonl') : null;

// Ensure log directory exists (only if LOG_FILE is defined)
if (LOG_FILE && !existsSync(LOG_DIR)) {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
  } catch (e) {
    // Skip in sandbox mode
  }
}

/**
 * Log an MCP conversation event to JSONL file
 */
function logEvent(eventType, data = {}) {
  // Skip logging if no LOG_FILE (sandbox mode)
  if (!LOG_FILE) return;
  
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event_type: eventType,
    tool_name: data.tool_name || null,
    agent_id: data.agent_id || null,
    workspace_id: data.workspace_id || null,
    workspace_url: data.workspace_url || null,
    payload_size: data.payload_size || null,
    intent: data.intent || null,
    error: data.error || null,
    metadata: data.metadata || null
  };
  
  try {
    appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n');
  } catch (err) {
    // Silently fail in sandbox mode
  }
}

/**
 * Create shared workspace via 0pi API
 */
async function createSharedWorkspace(agent_id, data, intent = null, ttl_seconds = 7200) {
  try {
    const payload = {
      agent_id,
      data,
      intent,
      ttl_seconds,
      payload_type: typeof data === 'string' ? 'text' : 'json'
    };

    const payloadSize = JSON.stringify(payload).length;

    const response = await axios.post(`${API_BASE_URL}/dump`, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    // Log successful workspace creation
    logEvent('workspace_created', {
      tool_name: 'create_shared_workspace',
      agent_id,
      workspace_id: response.data.workspace_id,
      workspace_url: response.data.url,
      payload_size: payloadSize,
      intent
    });

    return response.data;
  } catch (error) {
    // Log error
    logEvent('workspace_creation_failed', {
      tool_name: 'create_shared_workspace',
      agent_id,
      error: error.message,
      metadata: { stack: error.stack }
    });

    throw new Error(`Failed to create workspace: ${error.message}`);
  }
}

/**
 * Retrieve workspace data
 */
async function getWorkspace(workspace_id) {
  try {
    const response = await axios.get(`${API_BASE_URL}/w/${workspace_id}`, {
      timeout: 5000
    });

    // Log successful retrieval
    logEvent('workspace_retrieved', {
      tool_name: 'get_shared_workspace',
      workspace_id
    });

    return response.data;
  } catch (error) {
    // Log error
    logEvent('workspace_retrieval_failed', {
      tool_name: 'get_shared_workspace',
      workspace_id,
      error: error.message
    });

    if (error.response?.status === 404) {
      throw new Error('Workspace not found or expired');
    }
    throw new Error(`Failed to retrieve workspace: ${error.message}`);
  }
}

/**
 * Create and configure the MCP server
 */
function createServer(options = {}) {
  const isSandbox = options.sandbox || false;
  
  const server = new Server(
    {
      name: '0pi-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    if (!isSandbox) {
      logEvent('tools_listed');
    }
    
    return {
    tools: [
      {
        name: 'create_shared_workspace',
        description: 'Cache & share agent contexts - Save your current reasoning state, large JSON structures, or DOM elements to an ephemeral cloud workspace. Perfect for: caching large contexts before token limits, bridging multi-agent workflows, storing intermediate results, sharing data between sessions, or temporary code/data storage. Returns a shareable URL valid for 2 hours with auto-expiring data.',
        inputSchema: {
          type: 'object',
          properties: {
            agent_id: {
              type: 'string',
              description: 'Your agent identifier (e.g., "claude-coder", "gpt-researcher")'
            },
            data: {
              description: 'The payload to save - can be an object, array, or string'
            },
            intent: {
              type: 'string',
              description: 'Brief description of why you are saving this context (helps with debugging and analytics)'
            },
            ttl_seconds: {
              type: 'number',
              description: 'Time-to-live in seconds (max 7200 = 2 hours)',
              default: 7200
            }
          },
          required: ['agent_id', 'data']
        }
      },
      {
        name: 'get_shared_workspace',
        description: 'Retrieve data from a shared workspace using its ID. Use this to read data that another agent (or yourself) saved previously.',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: {
              type: 'string',
              description: 'The workspace ID (8-character identifier from the workspace URL)'
            }
          },
          required: ['workspace_id']
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  logEvent('tool_called', {
    tool_name: name,
    metadata: { arguments: args }
  });

  try {
    if (name === 'create_shared_workspace') {
      const { agent_id, data, intent, ttl_seconds = 7200 } = args;

      if (!agent_id || !data) {
        throw new Error('agent_id and data are required');
      }

      const result = await createSharedWorkspace(agent_id, data, intent, ttl_seconds);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              workspace_id: result.workspace_id,
              url: result.url,
              expires_in: result.expires_in,
              message: `Workspace created successfully. Share this URL with other agents: ${result.url}`
            }, null, 2)
          }
        ]
      };
    }

    if (name === 'get_shared_workspace') {
      const { workspace_id } = args;

      if (!workspace_id) {
        throw new Error('workspace_id is required');
      }

      const data = await getWorkspace(workspace_id);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: data
            }, null, 2)
          }
        ]
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    logEvent('tool_execution_failed', {
      tool_name: name,
      error: error.message,
      metadata: { arguments: args }
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message
          }, null, 2)
        }
      ],
      isError: true
    };
  }
});

  return server;
}

/**
 * Create a sandbox server for Smithery scanning
 * This allows Smithery to inspect capabilities without needing real API access
 */
export function createSandboxServer() {
  return createServer({ sandbox: true });
}

// Start the server
async function main() {
  const server = createServer();
  
  logEvent('server_started', {
    metadata: { api_base_url: API_BASE_URL, log_file: LOG_FILE }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('0pi MCP Server running on stdio');
  console.error(`API Base URL: ${API_BASE_URL}`);
  console.error(`Logging to: ${LOG_FILE}`);
}

main().catch((error) => {
  logEvent('server_error', {
    error: error.message,
    metadata: { stack: error.stack }
  });
  console.error('Server error:', error);
  process.exit(1);
});
