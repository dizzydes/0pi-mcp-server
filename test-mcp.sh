#!/bin/bash

# Test script for 0pi MCP Server

echo "🧪 Testing 0pi MCP Server"
echo ""

# Test 1: List tools
echo "📋 Test 1: Listing available tools..."
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node index.js 2>&1 | grep -v "^0pi MCP Server" | grep -v "^API Base URL" | grep -v "^Logging to"

echo ""
echo "---"
echo ""

# Test 2: Create workspace
echo "📤 Test 2: Creating workspace..."
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"create_shared_workspace","arguments":{"agent_id":"test-agent","data":{"message":"Hello 0pi!"},"intent":"Testing MCP"}}}' | node index.js 2>&1 | grep -v "^0pi MCP Server" | grep -v "^API Base URL" | grep -v "^Logging to" | grep -v "^\[DEBUG\]"

echo ""
echo ""
echo "✅ Check logs: cat logs/mcp-conversations.jsonl | tail -5"
