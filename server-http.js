#!/usr/bin/env node

/**
 * HTTP Server wrapper for 0pi MCP Server
 * Exposes MCP over HTTP for hosted deployments (Railway, etc)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import { createServer as createHttpServer } from 'http';
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

// Create Express app
const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: '0pi-mcp-server' });
});

// SSE endpoint for MCP
app.get('/sse', async (req, res) => {
  console.log('New SSE connection');
  
  const transport = new SSEServerTransport('/message', res);
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

  // Define tools
  server.setRequestHandler('tools/list', async () => ({
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
              description: 'Brief description of why you are saving this context'
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
        description: 'Retrieve data from a shared workspace using its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: {
              type: 'string',
              description: 'The workspace ID (8-character identifier)'
            }
          },
          required: ['workspace_id']
        }
      }
    ]
  }));

  // Handle tool calls
  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === 'create_shared_workspace') {
        const { agent_id, data, intent, ttl_seconds = 7200 } = args;
        const result = await createSharedWorkspace(agent_id, data, intent, ttl_seconds);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              workspace_id: result.workspace_id,
              url: result.url,
              expires_in: result.expires_in,
              message: `Workspace created: ${result.url}`
            }, null, 2)
          }]
        };
      }

      if (name === 'get_shared_workspace') {
        const { workspace_id } = args;
        const data = await getWorkspace(workspace_id);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: true, data }, null, 2)
          }]
        };
      }

      throw new Error(`Unknown tool: ${name}`);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: false, error: error.message }, null, 2)
        }],
        isError: true
      };
    }
  });

  await server.connect(transport);
});

// POST endpoint for messages
app.post('/message', (req, res) => {
  // This is handled by the SSE transport
  res.status(200).end();
});

// Start server
const httpServer = createHttpServer(app);

httpServer.listen(PORT, () => {
  console.log(`🚀 0pi MCP Server (HTTP) running on port ${PORT}`);
  console.log(`📡 SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base: ${API_BASE_URL}`);
});
