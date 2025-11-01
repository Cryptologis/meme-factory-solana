#!/bin/bash
# Update UI with New IDL - Meme Factory UI
# Repository: https://github.com/Cryptologis/meme-factory-ui
# Run this AFTER deploying the fixed Solana program

set -e

echo "🎨 Meme Factory UI - IDL Update"
echo "================================"
echo ""
echo "Repository: https://github.com/Cryptologis/meme-factory-ui"
echo "Branch: main → update/program-idl"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Repository info
REPO_URL="https://github.com/Cryptologis/meme-factory-ui"
TARGET_BRANCH="main"
FIX_BRANCH="update/program-idl"

# Check if we're in the right repo
echo "🔍 Step 1: Verifying repository..."
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Not in a git repository${NC}"
    echo "Please navigate to your meme-factory-ui directory"
    exit 1
fi

CURRENT_REMOTE=$(git config --get remote.origin.url || echo "")
if [[ ! "$CURRENT_REMOTE" =~ "meme-factory-ui" ]]; then
    echo -e "${YELLOW}⚠️  Warning: This doesn't appear to be the meme-factory-ui repo${NC}"
    echo "Current remote: $CURRENT_REMOTE"
    read -p "Continue anyway? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        exit 1
    fi
fi

echo -e "${GREEN}✅ Repository verified${NC}"
echo ""

# Check if program is deployed
echo "⚠️  IMPORTANT: This script should be run AFTER deploying the Solana program"
echo ""
read -p "Have you deployed the updated Solana program? (y/n): " DEPLOYED
if [ "$DEPLOYED" != "y" ]; then
    echo -e "${YELLOW}⚠️  Please deploy the Solana program first!${NC}"
    echo ""
    echo "Steps to deploy:"
    echo "1. cd ../meme-factory-solana"
    echo "2. anchor build"
    echo "3. anchor deploy --provider.cluster devnet"
    echo "4. Then come back and run this script"
    exit 0
fi
echo ""

# Update main branch
echo "📥 Step 2: Updating main branch..."
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" != "$TARGET_BRANCH" ]; then
    echo "Switching to $TARGET_BRANCH..."
    git checkout $TARGET_BRANCH
fi

echo "Pulling latest changes..."
git pull origin $TARGET_BRANCH
echo -e "${GREEN}✅ Main branch updated${NC}"
echo ""

# Create fix branch
echo "🌿 Step 3: Creating update branch..."
if git show-ref --verify --quiet refs/heads/$FIX_BRANCH; then
    echo -e "${YELLOW}⚠️  Branch '$FIX_BRANCH' already exists${NC}"
    read -p "Delete and recreate it? (y/n): " RECREATE
    if [ "$RECREATE" = "y" ]; then
        git branch -D $FIX_BRANCH
        git checkout -b $FIX_BRANCH
        echo -e "${GREEN}✅ Recreated branch: $FIX_BRANCH${NC}"
    else
        git checkout $FIX_BRANCH
        echo -e "${GREEN}✅ Switched to existing branch: $FIX_BRANCH${NC}"
    fi
else
    git checkout -b $FIX_BRANCH
    echo -e "${GREEN}✅ Created new branch: $FIX_BRANCH${NC}"
fi
echo ""

# Locate IDL in UI repo
echo "🔍 Step 4: Locating IDL file in UI..."
IDL_LOCATIONS=(
    "src/lib/meme_chain.json"
    "client/src/lib/meme_chain.json"
    "src/idl/meme_chain.json"
    "lib/meme_chain.json"
)

UI_IDL_PATH=""
for loc in "${IDL_LOCATIONS[@]}"; do
    if [ -f "$loc" ]; then
        UI_IDL_PATH="$loc"
        echo -e "${GREEN}✅ Found IDL at: $UI_IDL_PATH${NC}"
        break
    fi
done

if [ -z "$UI_IDL_PATH" ]; then
    echo -e "${YELLOW}⚠️  IDL not found in common locations${NC}"
    echo "Searched:"
    for loc in "${IDL_LOCATIONS[@]}"; do
        echo "  - $loc"
    done
    echo ""
    read -p "Enter IDL path: " UI_IDL_PATH
    if [ ! -f "$UI_IDL_PATH" ]; then
        echo -e "${RED}❌ File not found: $UI_IDL_PATH${NC}"
        exit 1
    fi
fi

# Backup current IDL
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp "$UI_IDL_PATH" "$BACKUP_DIR/meme_chain.json.backup"
echo -e "${GREEN}✅ Backed up current IDL to: $BACKUP_DIR${NC}"
echo ""

# Get new IDL from Solana repo
echo "📥 Step 5: Locating new IDL from Solana repo..."
echo ""
echo "Where is your meme-factory-solana repo?"
read -p "Enter path (or press Enter if in parent directory): " SOLANA_PATH

if [ -z "$SOLANA_PATH" ]; then
    # Try parent directory
    if [ -d "../meme-factory-solana" ]; then
        SOLANA_PATH="../meme-factory-solana"
        echo "Found: $SOLANA_PATH"
    else
        echo -e "${RED}❌ Cannot find meme-factory-solana${NC}"
        echo "Please provide the full path"
        exit 1
    fi
fi

NEW_IDL_PATH="$SOLANA_PATH/target/idl/meme_chain_solana.json"

if [ ! -f "$NEW_IDL_PATH" ]; then
    echo -e "${RED}❌ New IDL not found at: $NEW_IDL_PATH${NC}"
    echo ""
    echo "Make sure you've built the Solana program:"
    echo "  cd $SOLANA_PATH"
    echo "  anchor build"
    exit 1
fi

echo -e "${GREEN}✅ Found new IDL: $NEW_IDL_PATH${NC}"
echo ""

# Show changes
echo "📊 Step 6: Comparing IDLs..."
if [ -f "$UI_IDL_PATH" ]; then
    OLD_PROGRAM_ID=$(grep -oP '"address":\s*"\K[^"]+' "$UI_IDL_PATH" || echo "not found")
    NEW_PROGRAM_ID=$(grep -oP '"address":\s*"\K[^"]+' "$NEW_IDL_PATH" || echo "not found")
    
    echo "Old Program ID: $OLD_PROGRAM_ID"
    echo "New Program ID: $NEW_PROGRAM_ID"
    
    if [ "$OLD_PROGRAM_ID" != "$NEW_PROGRAM_ID" ]; then
        echo -e "${YELLOW}⚠️  Program ID has changed!${NC}"
        echo "This means you'll need to update any hardcoded program IDs in your UI code"
    fi
fi
echo ""

# Copy new IDL
echo "📋 Step 7: Copying new IDL..."
cp "$NEW_IDL_PATH" "$UI_IDL_PATH"
echo -e "${GREEN}✅ Copied new IDL to: $UI_IDL_PATH${NC}"
echo ""

# Check for hardcoded program IDs
echo "🔍 Step 8: Checking for hardcoded program IDs..."
HARDCODED_IDS=$(grep -rn "declare_id\|Program ID\|program_id\|PROGRAM_ID" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null | grep -v "node_modules" || echo "")

if [ -n "$HARDCODED_IDS" ]; then
    echo -e "${YELLOW}⚠️  Found potential hardcoded program IDs:${NC}"
    echo "$HARDCODED_IDS"
    echo ""
    echo "You may need to update these manually"
else
    echo -e "${GREEN}✅ No obvious hardcoded program IDs found${NC}"
fi
echo ""

# Stage changes
echo "📦 Step 9: Staging changes..."
git add "$UI_IDL_PATH"
echo ""
echo "Changes staged:"
git diff --staged --stat
echo ""

# Create commit
cat > /tmp/ui_commit.txt << 'EOF'
chore: update program IDL to match deployed Solana program

Updates the IDL to reflect the compatibility fixes made to the Solana program.
This ensures the UI can properly interact with the updated program.

## Changes

- Updated IDL with corrected struct definitions
- PDA seeds now match deployed program
- All account structures updated
- Type definitions synchronized

## Related

- Solana PR: fix/solana-program-compatibility
- Deployed program with compatibility fixes

## Testing

- [ ] Verify program ID matches deployed program
- [ ] Test token creation from UI
- [ ] Test buy/sell transactions
- [ ] Verify all wallet interactions work

This update is required for the UI to work with the newly deployed program.
EOF

echo "Commit message:"
echo "==============="
cat /tmp/ui_commit.txt
echo "==============="
echo ""

read -p "Commit with this message? (y/n): " COMMIT
if [ "$COMMIT" = "y" ]; then
    git commit -F /tmp/ui_commit.txt
    echo -e "${GREEN}✅ Changes committed!${NC}"
else
    echo "Commit cancelled. Commit manually with:"
    echo "  git commit -F /tmp/ui_commit.txt"
    exit 0
fi
echo ""

# Push
echo "🚀 Step 10: Pushing to GitHub..."
read -p "Push branch to GitHub? (y/n): " PUSH
if [ "$PUSH" = "y" ]; then
    git push -u origin $FIX_BRANCH
    echo -e "${GREEN}✅ Branch pushed!${NC}"
else
    echo "Branch not pushed. Push manually with:"
    echo "  git push -u origin $FIX_BRANCH"
    exit 0
fi
echo ""

# Success
echo "=========================================="
echo "✨ UI Update Complete!"
echo "=========================================="
echo ""
echo "📊 Summary:"
echo "   Repository: meme-factory-ui"
echo "   Branch: $FIX_BRANCH"
echo "   Updated: $UI_IDL_PATH"
echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. Create Pull Request:"
echo "   Visit: $REPO_URL/compare/$FIX_BRANCH?expand=1"
echo ""
echo "2. Review and merge the PR"
echo ""
echo "3. Test the UI with the updated program:"
echo "   - Connect wallet"
echo "   - Create test token"
echo "   - Buy tokens (wait 60s after creation)"
echo "   - Sell tokens (wait 1s after buy)"
echo ""
echo "📝 PR Creation URL:"
echo "   ${REPO_URL}/compare/${FIX_BRANCH}?expand=1"
echo ""
echo "✅ All done!"
