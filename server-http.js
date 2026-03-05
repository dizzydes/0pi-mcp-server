#!/usr/bin/env node

/**
 * HTTP Server wrapper for 0pi MCP Server
 * Exposes MCP over HTTP using JSON-RPC for hosted deployments
 */

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;
const API_BASE_URL = process.env.OPI_API_URL || 'https://0pi.dev';

/**
 * Create shared workspace via 0pi API
 */
async function createSharedWorkspace(agent_id, data, intent = null, ttl_seconds = 7200) {
  const payload = {
    agent_id,
    data,
    intent,
    ttl_seconds,
    payload_type: typeof data === 'string' ? 'text' : 'json'
  };

  const response = await axios.post(`${API_BASE_URL}/dump`, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000
  });

  return response.data;
}

/**
 * Retrieve workspace data
 */
async function getWorkspace(workspace_id) {
  const response = await axios.get(`${API_BASE_URL}/w/${workspace_id}`, {
    timeout: 5000
  });
  
  return response.data;
}

// Tool definitions
const TOOLS = [
  {
    name: 'create_object',
    description: 'Save objects to ephemeral cloud storage - Store your reasoning state, large JSON structures, or any data to get a shareable URL. Perfect for: caching contexts before token limits, bridging multi-agent workflows, storing intermediate results, sharing data between sessions, or temporary data storage. Returns a shareable URL valid for 2 hours with auto-expiring data.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: {
          type: 'string',
          description: 'Your agent identifier (e.g., "claude-coder", "gpt-researcher")'
        },
        data: {
          description: 'The data to save - can be an object, array, or string'
        },
        intent: {
          type: 'string',
          description: 'Brief description of why you are saving this data'
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
    name: 'get_object',
    description: 'Retrieve data from cloud storage using its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        object_id: {
          type: 'string',
          description: 'The object ID (8-character identifier)'
        }
      },
      required: ['object_id']
    }
  }
];

// Create Express app
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: '0pi-mcp-server', version: '1.0.0' });
});

// MCP Server info endpoint
app.get('/', (req, res) => {
  res.json({
    name: '0pi-mcp-server',
    version: '1.0.0',
    description: 'Ephemeral shared workspace for AI agents - cache contexts, bridge multi-agent workflows',
    protocol: 'MCP over HTTP (JSON-RPC 2.0)',
    endpoints: {
      mcp: '/mcp',
      health: '/health'
    },
    tools: TOOLS.map(t => ({ name: t.name, description: t.description }))
  });
});

// Main MCP endpoint - JSON-RPC over HTTP
app.post('/mcp', async (req, res) => {
  const { jsonrpc, id, method, params } = req.body;

  console.log(`MCP Request: ${method}`, params ? JSON.stringify(params).substring(0, 100) : '');

  // Validate JSON-RPC
  if (jsonrpc !== '2.0') {
    return res.status(400).json({
      jsonrpc: '2.0',
      id: id || null,
      error: { code: -32600, message: 'Invalid Request - jsonrpc must be "2.0"' }
    });
  }

  try {
    let result;

    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: '0pi-mcp-server',
            version: '1.0.0'
          }
        };
        break;

      case 'tools/list':
        result = { tools: TOOLS };
        break;

      case 'tools/call':
        const { name, arguments: args } = params;
        
        if (name === 'create_object' || name === 'create_shared_workspace') {
          const { agent_id, data, intent, ttl_seconds = 7200 } = args;
          const result_data = await createSharedWorkspace(agent_id, data, intent, ttl_seconds);
          
          result = {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                object_id: result_data.workspace_id,
                url: result_data.url,
                expires_in: result_data.expires_in,
                message: `Object saved successfully. Share this URL: ${result_data.url}`
              }, null, 2)
            }]
          };
        } else if (name === 'get_object' || name === 'get_shared_workspace') {
          const { object_id, workspace_id } = args;
          const id = object_id || workspace_id;
          const data = await getWorkspace(id);
          
          result = {
            content: [{
              type: 'text',
              text: JSON.stringify({ success: true, data }, null, 2)
            }]
          };
        } else {
          throw new Error(`Unknown tool: ${name}`);
        }
        break;

      default:
        return res.status(400).json({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` }
        });
    }

    res.json({
      jsonrpc: '2.0',
      id,
      result
    });

  } catch (error) {
    console.error('MCP Error:', error.message);
    res.status(500).json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: error.message,
        data: { stack: error.stack }
      }
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 0pi MCP Server (HTTP/JSON-RPC) running on port ${PORT}`);
  console.log(`🔌 MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base: ${API_BASE_URL}`);
});
