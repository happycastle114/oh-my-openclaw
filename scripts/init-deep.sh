#!/usr/bin/env bash
# oh-my-openclaw: Initialize hierarchical knowledge base
# Creates workspace directory structure for wisdom accumulation

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default workspace root
WORKSPACE_ROOT="${1:-.openclaw/workspace}"

echo -e "${BLUE}=== oh-my-openclaw: Knowledge Base Initialization ===${NC}"
echo ""

# Create directory structure
directories=(
    "${WORKSPACE_ROOT}/plans"
    "${WORKSPACE_ROOT}/notepads"
    "${WORKSPACE_ROOT}/reports"
    "${WORKSPACE_ROOT}/tmp"
)

for dir in "${directories[@]}"; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        echo -e "${GREEN}[+] Created: ${dir}${NC}"
    else
        echo -e "${YELLOW}[=] Exists:  ${dir}${NC}"
    fi
done

# Create default notepad files if they don't exist
notepads=(
    "learnings.md:# Learnings\n\nAccumulated insights from project work.\n\n## Format\n\n- **[DATE]** [CONTEXT]: [LEARNING]\n"
    "decisions.md:# Decisions\n\nArchitectural and design decisions made during work.\n\n## Format\n\n- **[DATE]** [DECISION]: [RATIONALE]\n"
    "issues.md:# Issues\n\nKnown issues, blockers, and workarounds.\n\n## Format\n\n- **[DATE]** [ISSUE]: [STATUS] - [DETAILS]\n"
)

for notepad_entry in "${notepads[@]}"; do
    IFS=':' read -r filename content <<< "$notepad_entry"
    filepath="${WORKSPACE_ROOT}/notepads/${filename}"
    if [ ! -f "$filepath" ]; then
        echo -e "$content" > "$filepath"
        echo -e "${GREEN}[+] Created: ${filepath}${NC}"
    else
        echo -e "${YELLOW}[=] Exists:  ${filepath}${NC}"
    fi
done

# Create .gitkeep files for empty directories
for dir in "${WORKSPACE_ROOT}/plans" "${WORKSPACE_ROOT}/reports" "${WORKSPACE_ROOT}/tmp"; do
    gitkeep="${dir}/.gitkeep"
    if [ ! -f "$gitkeep" ]; then
        touch "$gitkeep"
    fi
done

echo ""
echo -e "${GREEN}=== Knowledge base initialized successfully ===${NC}"
echo ""
echo -e "Workspace root: ${BLUE}${WORKSPACE_ROOT}${NC}"
echo ""
echo -e "Directory structure:"
echo -e "  ${WORKSPACE_ROOT}/"
echo -e "  ├── plans/        # Prometheus planning documents"
echo -e "  ├── notepads/     # Wisdom accumulation files"
echo -e "  │   ├── learnings.md"
echo -e "  │   ├── decisions.md"
echo -e "  │   └── issues.md"
echo -e "  ├── reports/      # Agent execution reports"
echo -e "  └── tmp/          # Temporary working files"
echo ""
echo -e "${BLUE}Ready for oh-my-openclaw workflows.${NC}"
