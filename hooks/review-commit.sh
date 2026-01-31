#!/bin/bash
# Async commit review using Claude
# Called from post-commit hook

set -e

COMMIT=${1:-HEAD}
ROOT="/root/.claude"
LOG_DIR="$ROOT/logs/reviews/commits"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
COMMIT_SHORT=$(git -C "$ROOT" rev-parse --short "$COMMIT")

# Get changed files
FILES=$(git -C "$ROOT" diff-tree --no-commit-id --name-only -r "$COMMIT" | grep -E '\.(ts|tsx|js|jsx|json|md)$' || true)

if [ -z "$FILES" ]; then
    echo "No reviewable files in commit $COMMIT_SHORT"
    exit 0
fi

FILE_COUNT=$(echo "$FILES" | wc -l)
echo "Reviewing commit $COMMIT_SHORT ($FILE_COUNT files)..."

# Get commit message
COMMIT_MSG=$(git -C "$ROOT" log -1 --format="%s" "$COMMIT")

# Get diff
DIFF=$(git -C "$ROOT" diff-tree -p "$COMMIT" | head -500)

# Create review prompt
REVIEW_FILE="$LOG_DIR/review_${COMMIT_SHORT}_${TIMESTAMP}.md"

cat > "/tmp/review_prompt_$$.txt" << 'PROMPT_END'
You are a senior engineer at Anthropic reviewing this commit.

Be BRUTAL. Find every issue. Don't be polite - be direct.

Check for:
1. **Bugs** - Logic errors, edge cases, null checks
2. **Security** - Injection, secrets, auth issues
3. **Architecture** - SRP violations, coupling, abstractions
4. **Performance** - N+1, memory leaks, unnecessary work
5. **Types** - Any usage, weak typing, missing types
6. **Code quality** - Naming, complexity, duplication

For each issue:
- Severity: CRITICAL / HIGH / MEDIUM / LOW
- File and line
- What's wrong
- How to fix

Be specific. No generic advice.

PROMPT_END

echo "" >> "/tmp/review_prompt_$$txt"
echo "## Commit: $COMMIT_SHORT" >> "/tmp/review_prompt_$$.txt"
echo "## Message: $COMMIT_MSG" >> "/tmp/review_prompt_$$.txt"
echo "" >> "/tmp/review_prompt_$$.txt"
echo "## Files changed:" >> "/tmp/review_prompt_$$.txt"
echo "$FILES" >> "/tmp/review_prompt_$$.txt"
echo "" >> "/tmp/review_prompt_$$.txt"
echo "## Diff:" >> "/tmp/review_prompt_$$.txt"
echo '```diff' >> "/tmp/review_prompt_$$.txt"
echo "$DIFF" >> "/tmp/review_prompt_$$.txt"
echo '```' >> "/tmp/review_prompt_$$.txt"

# Run Claude review (if claude command available)
if command -v claude &> /dev/null; then
    PROMPT=$(cat "/tmp/review_prompt_$$.txt")

    echo "# Code Review: $COMMIT_SHORT" > "$REVIEW_FILE"
    echo "" >> "$REVIEW_FILE"
    echo "**Date:** $(date -Iseconds)" >> "$REVIEW_FILE"
    echo "**Commit:** $COMMIT_MSG" >> "$REVIEW_FILE"
    echo "**Files:** $FILE_COUNT" >> "$REVIEW_FILE"
    echo "" >> "$REVIEW_FILE"
    echo "---" >> "$REVIEW_FILE"
    echo "" >> "$REVIEW_FILE"

    # Run Claude with timeout
    timeout 120 claude --print "$PROMPT" >> "$REVIEW_FILE" 2>&1 || echo "Review timed out or failed" >> "$REVIEW_FILE"

    echo "Review saved: $REVIEW_FILE"

    # Check for critical issues and notify
    if grep -q "CRITICAL" "$REVIEW_FILE"; then
        echo "CRITICAL issues found in commit $COMMIT_SHORT!"
        # Could send Telegram notification here
    fi
else
    echo "Claude CLI not available, skipping AI review"
fi

# Cleanup
rm -f "/tmp/review_prompt_$$.txt"
