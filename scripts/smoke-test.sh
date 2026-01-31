#!/bin/bash
#
# Smoke Test - Quick verification that key integrations work
# Run after any significant code changes
#
# Usage: ./scripts/smoke-test.sh
#

cd /root/.claude

echo "🔥 Elio Smoke Test"
echo "=================="
echo ""

PASSED=0
FAILED=0

# Helper function
test_check() {
    local name="$1"
    local cmd="$2"

    echo -n "Testing $name... "

    if eval "$cmd" > /dev/null 2>&1; then
        echo "✅ OK"
        ((PASSED++))
    else
        echo "❌ FAILED"
        ((FAILED++))
    fi
}

# Build Tests
echo "📦 Build Tests"
echo "--------------"
test_check "MCP Server build" "cd /root/.claude/mcp-server && pnpm build"

# Config Tests
echo ""
echo "🔑 Config Tests"
echo "---------------"
test_check "Supabase config" "test -f /root/.claude/secrets/supabase.json"
test_check "Telegram config" "test -f /root/.claude/secrets/telegram.json"
test_check "Notion config" "test -f /root/.claude/secrets/notion-token.json"
test_check "Perplexity config" "test -f /root/.claude/secrets/perplexity.json"

# Server Startup Test
echo ""
echo "🚀 Server Tests"
echo "---------------"
echo -n "Testing MCP Server startup... "
cd /root/.claude/mcp-server
OUTPUT=$(timeout 5 node dist/index.js 2>&1 || true)
if echo "$OUTPUT" | grep -q "Elio MCP Server"; then
    echo "✅ OK"
    ((PASSED++))
    # Extract tool count
    TOOLS=$(echo "$OUTPUT" | grep -oP '\d+ gateway tools' | grep -oP '\d+' || echo "?")
    echo "   → $TOOLS tools registered"
else
    echo "❌ FAILED"
    ((FAILED++))
fi
cd /root/.claude

# Package Tests
echo ""
echo "📦 Package Tests"
echo "----------------"
test_check "@elio/shared builds" "cd /root/.claude/packages/shared && pnpm build"
test_check "@elio/db builds" "cd /root/.claude/packages/db && pnpm build"
test_check "@elio/connectors builds" "cd /root/.claude/packages/connectors && pnpm build"

# Summary
echo ""
echo "=================="
echo "📊 Results: $PASSED passed, $FAILED failed"
echo ""

if [ $FAILED -gt 0 ]; then
    echo "❌ Some tests failed!"
    exit 1
else
    echo "✅ All tests passed!"
    exit 0
fi
