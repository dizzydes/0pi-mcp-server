#!/bin/bash

# Comprehensive Test Suite for 0pi MCP Server
# Tests both stdio (local) and HTTP (Railway) deployments

set -e  # Exit on error

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 0pi MCP Server Test Suite"
echo "=============================="
echo ""

# Configuration
HTTP_URL="${MCP_URL:-https://mcp.0pi.dev/mcp}"
WORKSPACE_ID=""

# Helper function to test stdio
test_stdio() {
    local test_name=$1
    local payload=$2
    
    echo -e "${YELLOW}[STDIO]${NC} $test_name"
    echo "$payload" | node index.js 2>&1 | grep -v "^0pi MCP Server" | grep -v "^API Base URL" | grep -v "^Logging to"
    echo ""
}

# Helper function to test HTTP
test_http() {
    local test_name=$1
    local payload=$2
    
    echo -e "${YELLOW}[HTTP]${NC} $test_name"
    curl -s -X POST "$HTTP_URL" \
        -H "Content-Type: application/json" \
        -d "$payload"
    echo ""
    echo ""
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Part 1: MCP Protocol Compliance Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Initialize
echo -e "${GREEN}Test 1: Initialize (Protocol Handshake)${NC}"
test_stdio "Initialize request" \
    '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}'

test_http "Initialize request" \
    '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}'

# Test 2: List Tools
echo -e "${GREEN}Test 2: List Available Tools${NC}"
test_stdio "List tools" \
    '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

test_http "List tools" \
    '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Part 2: Tool Execution Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 3: Create Workspace (stdio)
echo -e "${GREEN}Test 3: Create Workspace (stdio)${NC}"
STDIO_RESPONSE=$(echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"create_shared_workspace","arguments":{"agent_id":"test-stdio","data":{"test":"stdio data","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"},"intent":"Testing stdio MCP server"}}}' | node index.js 2>&1 | grep -v "^0pi MCP Server" | grep -v "^API Base URL" | grep -v "^Logging to")

echo "$STDIO_RESPONSE"
echo ""

# Extract workspace ID from stdio response using jq if available, otherwise grep
if command -v jq &> /dev/null; then
    STDIO_WORKSPACE_ID=$(echo "$STDIO_RESPONSE" | jq -r '.result.content[0].text' | jq -r '.workspace_id')
else
    STDIO_WORKSPACE_ID=$(echo "$STDIO_RESPONSE" | grep -o 'workspace_id[^,]*' | head -1 | sed 's/.*: *"\([^"]*\)".*/\1/')
fi
echo -e "${GREEN}✓ Created stdio workspace: $STDIO_WORKSPACE_ID${NC}"
echo ""

# Test 4: Create Workspace (HTTP)
echo -e "${GREEN}Test 4: Create Workspace (HTTP)${NC}"
HTTP_RESPONSE=$(curl -s -X POST "$HTTP_URL" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"create_shared_workspace","arguments":{"agent_id":"test-http","data":{"test":"http data","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","deployment":"Railway"},"intent":"Testing HTTP MCP server"}}}')

echo "$HTTP_RESPONSE"
echo ""

# Extract workspace ID from HTTP response using jq if available, otherwise grep
if command -v jq &> /dev/null; then
    HTTP_WORKSPACE_ID=$(echo "$HTTP_RESPONSE" | jq -r '.result.content[0].text' | jq -r '.workspace_id')
else
    HTTP_WORKSPACE_ID=$(echo "$HTTP_RESPONSE" | grep -o 'workspace_id[^,]*' | head -1 | sed 's/.*: *"\([^"]*\)".*/\1/')
fi
echo -e "${GREEN}✓ Created HTTP workspace: $HTTP_WORKSPACE_ID${NC}"
echo ""

# Test 5: Retrieve Workspace (stdio)
echo -e "${GREEN}Test 5: Retrieve Workspace (stdio) - ID: $STDIO_WORKSPACE_ID${NC}"
test_stdio "Get workspace" \
    '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"get_shared_workspace","arguments":{"workspace_id":"'$STDIO_WORKSPACE_ID'"}}}'

# Test 6: Retrieve Workspace (HTTP)
echo -e "${GREEN}Test 6: Retrieve Workspace (HTTP) - ID: $HTTP_WORKSPACE_ID${NC}"
test_http "Get workspace" \
    '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"get_shared_workspace","arguments":{"workspace_id":"'$HTTP_WORKSPACE_ID'"}}}'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Part 3: Error Handling Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 7: Invalid Method
echo -e "${GREEN}Test 7: Invalid Method (should fail gracefully)${NC}"
test_http "Invalid method" \
    '{"jsonrpc":"2.0","id":7,"method":"invalid/method","params":{}}'

# Test 8: Missing Parameters
echo -e "${GREEN}Test 8: Missing Required Parameters (should fail gracefully)${NC}"
test_http "Missing agent_id" \
    '{"jsonrpc":"2.0","id":8,"method":"tools/call","params":{"name":"create_shared_workspace","arguments":{"data":"test"}}}'

# Test 9: Invalid Workspace ID
echo -e "${GREEN}Test 9: Invalid Workspace ID (should return error)${NC}"
test_http "Invalid workspace ID" \
    '{"jsonrpc":"2.0","id":9,"method":"tools/call","params":{"name":"get_shared_workspace","arguments":{"workspace_id":"invalid123"}}}'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Part 4: Deployment Health Checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 10: HTTP Health Endpoint
echo -e "${GREEN}Test 10: Health Endpoint${NC}"
echo -e "${YELLOW}[HTTP]${NC} GET https://mcp.0pi.dev/health"
curl -s https://mcp.0pi.dev/health
echo ""
echo ""

# Test 11: Server Info Endpoint
echo -e "${GREEN}Test 11: Server Info${NC}"
echo -e "${YELLOW}[HTTP]${NC} GET https://mcp.0pi.dev/"
curl -s https://mcp.0pi.dev/
echo ""
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ All tests completed!${NC}"
echo ""
echo "Workspace URLs created during testing:"
echo "  - stdio: https://0pi.dev/w/$STDIO_WORKSPACE_ID"
echo "  - HTTP:  https://0pi.dev/w/$HTTP_WORKSPACE_ID"
echo ""
echo "View logs:"
echo "  cat logs/mcp-conversations.jsonl | tail -20 | jq ."
echo ""
echo "Test HTTP endpoint manually:"
echo "  curl -X POST $HTTP_URL -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}'"
