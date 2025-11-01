#!/bin/bash
# Post-Deployment Verification Script
# Run this after deploying the fixed program to verify everything works

set -e

echo "🔍 Meme Chain Launchpad - Post-Deployment Verification"
echo "====================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
CLUSTER="devnet"
PROGRAM_ID=""
PROTOCOL_PDA=""

# Check if program ID is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}⚠️  No program ID provided${NC}"
    echo "Usage: ./verify-deployment.sh <PROGRAM_ID>"
    echo ""
    
    # Try to extract from lib.rs
    if [ -f "programs/meme-chain-solana/src/lib.rs" ]; then
        PROGRAM_ID=$(grep -oP 'declare_id!\("\K[^"]+' programs/meme-chain-solana/src/lib.rs || echo "")
        if [ -n "$PROGRAM_ID" ]; then
            echo -e "${BLUE}Found program ID in lib.rs: $PROGRAM_ID${NC}"
            read -p "Use this program ID? (y/n): " USE_ID
            if [ "$USE_ID" != "y" ]; then
                echo "Please provide program ID as argument"
                exit 1
            fi
        else
            echo -e "${RED}Could not extract program ID from lib.rs${NC}"
            exit 1
        fi
    else
        echo -e "${RED}lib.rs not found${NC}"
        exit 1
    fi
else
    PROGRAM_ID=$1
fi

echo ""
echo "🔑 Program ID: $PROGRAM_ID"
echo "🌐 Cluster: $CLUSTER"
echo ""

# Verify program exists
echo "=================================="
echo "Test 1: Program Deployment"
echo "=================================="
echo "Checking if program is deployed..."

if solana program show $PROGRAM_ID --url $CLUSTER > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Program is deployed on $CLUSTER${NC}"
    
    # Get program details
    PROGRAM_DATA=$(solana program show $PROGRAM_ID --url $CLUSTER)
    echo ""
    echo "Program Details:"
    echo "$PROGRAM_DATA"
    echo ""
else
    echo -e "${RED}❌ Program not found on $CLUSTER${NC}"
    echo "Please deploy first: anchor deploy --provider.cluster $CLUSTER"
    exit 1
fi

# Check IDL
echo "=================================="
echo "Test 2: IDL Verification"
echo "=================================="
echo "Checking IDL on-chain..."

if anchor idl fetch $PROGRAM_ID --provider.cluster $CLUSTER > /tmp/fetched_idl.json 2>&1; then
    echo -e "${GREEN}✅ IDL found on-chain${NC}"
    
    # Compare with local IDL
    if [ -f "target/idl/meme_chain_solana.json" ]; then
        LOCAL_HASH=$(sha256sum target/idl/meme_chain_solana.json | cut -d' ' -f1)
        REMOTE_HASH=$(sha256sum /tmp/fetched_idl.json | cut -d' ' -f1)
        
        if [ "$LOCAL_HASH" = "$REMOTE_HASH" ]; then
            echo -e "${GREEN}✅ On-chain IDL matches local IDL${NC}"
        else
            echo -e "${YELLOW}⚠️  On-chain IDL differs from local IDL${NC}"
            echo "Consider updating: anchor idl upgrade $PROGRAM_ID -f target/idl/meme_chain_solana.json --provider.cluster $CLUSTER"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  No IDL found on-chain${NC}"
    echo "Initialize IDL: anchor idl init $PROGRAM_ID -f target/idl/meme_chain_solana.json --provider.cluster $CLUSTER"
fi
echo ""

# Derive Protocol PDA
echo "=================================="
echo "Test 3: Protocol Account"
echo "=================================="
echo "Deriving protocol PDA..."

# We need a small program to derive the PDA properly
# For now, just guide the user
echo "Protocol PDA should be derived with seeds: ['protocol']"
echo ""
echo "To check protocol status, create a script:"
cat > /tmp/check-protocol.ts << 'TSEOF'
import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import idl from "./target/idl/meme_chain_solana.json";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const programId = new PublicKey(process.argv[2] || "YOUR_PROGRAM_ID");

async function checkProtocol() {
  const provider = new AnchorProvider(connection, {} as Wallet, {});
  const program = new Program(idl as any, programId, provider);

  const [protocolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol")],
    programId
  );

  console.log("Protocol PDA:", protocolPda.toString());

  try {
    const protocolData = await program.account.protocol.fetch(protocolPda);
    console.log("\n✅ Protocol is initialized!");
    console.log("\nProtocol Data:");
    console.log("- Authority:", protocolData.authority.toString());
    console.log("- Fee Recipient:", protocolData.feeRecipient.toString());
    console.log("- Protocol Fee:", protocolData.protocolFeeBps, "bps");
    console.log("- Creation Fee:", protocolData.creationFeeLamports / 1e9, "SOL");
    console.log("- Graduation Threshold:", protocolData.graduationThreshold / 1e9, "SOL");
    console.log("- Total Memes Created:", protocolData.totalMemesCreated.toString());
    console.log("- Total Volume:", protocolData.totalVolume / 1e9, "SOL");
  } catch (err) {
    console.log("\n❌ Protocol not initialized");
    console.log("Run: npx ts-node scripts/initialize-protocol.ts");
  }
}

checkProtocol().catch(console.error);
TSEOF

echo -e "${BLUE}Created /tmp/check-protocol.ts${NC}"
echo "Run: npx ts-node /tmp/check-protocol.ts $PROGRAM_ID"
echo ""

# Check wallet balance
echo "=================================="
echo "Test 4: Wallet Balance"
echo "=================================="
WALLET=$(solana address)
BALANCE=$(solana balance --url $CLUSTER 2>/dev/null | grep -oP '\d+\.\d+' || echo "0")

echo "Wallet: $WALLET"
echo "Balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 0.5" | bc -l) )); then
    echo -e "${YELLOW}⚠️  Low balance for testing${NC}"
    echo "Get more: solana airdrop 1 --url $CLUSTER"
else
    echo -e "${GREEN}✅ Sufficient balance for testing${NC}"
fi
echo ""

# Verify build artifacts
echo "=================================="
echo "Test 5: Build Artifacts"
echo "=================================="

ARTIFACTS_OK=true

if [ ! -f "target/deploy/meme_chain_solana.so" ]; then
    echo -e "${RED}❌ Missing: target/deploy/meme_chain_solana.so${NC}"
    ARTIFACTS_OK=false
else
    echo -e "${GREEN}✅ Found: target/deploy/meme_chain_solana.so${NC}"
fi

if [ ! -f "target/idl/meme_chain_solana.json" ]; then
    echo -e "${RED}❌ Missing: target/idl/meme_chain_solana.json${NC}"
    ARTIFACTS_OK=false
else
    echo -e "${GREEN}✅ Found: target/idl/meme_chain_solana.json${NC}"
fi

if [ ! -f "target/deploy/meme_chain_solana-keypair.json" ]; then
    echo -e "${YELLOW}⚠️  Missing: target/deploy/meme_chain_solana-keypair.json${NC}"
else
    KEYPAIR_PROGRAM_ID=$(solana address -k target/deploy/meme_chain_solana-keypair.json)
    echo -e "${GREEN}✅ Found keypair${NC}"
    
    if [ "$KEYPAIR_PROGRAM_ID" = "$PROGRAM_ID" ]; then
        echo -e "${GREEN}✅ Keypair matches program ID${NC}"
    else
        echo -e "${RED}❌ Keypair mismatch!${NC}"
        echo "   Keypair: $KEYPAIR_PROGRAM_ID"
        echo "   Expected: $PROGRAM_ID"
        ARTIFACTS_OK=false
    fi
fi

if [ "$ARTIFACTS_OK" = false ]; then
    echo ""
    echo -e "${YELLOW}Build with: anchor build${NC}"
fi
echo ""

# Check frontend IDL
echo "=================================="
echo "Test 6: Frontend Integration"
echo "=================================="

FRONTEND_IDL="client/src/lib/meme_chain.json"

if [ -f "$FRONTEND_IDL" ]; then
    echo -e "${GREEN}✅ Found: $FRONTEND_IDL${NC}"
    
    FRONTEND_PROGRAM_ID=$(grep -oP '"address":\s*"\K[^"]+' "$FRONTEND_IDL")
    echo "Frontend program ID: $FRONTEND_PROGRAM_ID"
    
    if [ "$FRONTEND_PROGRAM_ID" = "$PROGRAM_ID" ]; then
        echo -e "${GREEN}✅ Frontend IDL matches deployed program${NC}"
    else
        echo -e "${RED}❌ Frontend IDL mismatch!${NC}"
        echo "Update with: cp target/idl/meme_chain_solana.json $FRONTEND_IDL"
    fi
else
    echo -e "${YELLOW}⚠️  Frontend IDL not found at $FRONTEND_IDL${NC}"
    echo "Copy IDL: cp target/idl/meme_chain_solana.json $FRONTEND_IDL"
fi
echo ""

# Summary
echo "=================================="
echo "📊 Verification Summary"
echo "=================================="
echo ""

ALL_GOOD=true

if solana program show $PROGRAM_ID --url $CLUSTER > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Program deployed${NC}"
else
    echo -e "${RED}❌ Program not deployed${NC}"
    ALL_GOOD=false
fi

if [ "$ARTIFACTS_OK" = true ]; then
    echo -e "${GREEN}✅ Build artifacts present${NC}"
else
    echo -e "${RED}❌ Build artifacts missing${NC}"
    ALL_GOOD=false
fi

if [ -f "$FRONTEND_IDL" ]; then
    echo -e "${GREEN}✅ Frontend IDL updated${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend IDL needs update${NC}"
fi

echo ""
echo "=================================="
echo "🎯 Next Steps"
echo "=================================="
echo ""

if [ "$ALL_GOOD" = true ]; then
    echo "✨ Deployment verified! Ready for testing."
    echo ""
    echo "1. Initialize protocol (if not done):"
    echo "   npx ts-node scripts/initialize-protocol.ts"
    echo ""
    echo "2. Create test token:"
    echo "   npx ts-node scripts/create-token.ts"
    echo ""
    echo "3. Test buying (wait 60s after creation):"
    echo "   npx ts-node scripts/buy-tokens.ts"
    echo ""
    echo "4. Test selling (wait 1s after buy):"
    echo "   npx ts-node scripts/sell-tokens.ts"
    echo ""
    echo "5. Verify fees:"
    echo "   npx ts-node scripts/check-fees.ts"
else
    echo "⚠️  Some issues found. Please resolve before testing."
    echo ""
    echo "Common fixes:"
    echo "- Deploy: anchor deploy --provider.cluster $CLUSTER"
    echo "- Build: anchor build"
    echo "- Update IDL: cp target/idl/meme_chain_solana.json $FRONTEND_IDL"
fi
echo ""

# Transaction explorer
echo "=================================="
echo "🔗 Useful Links"
echo "=================================="
echo ""
echo "Program Explorer:"
echo "  https://explorer.solana.com/address/$PROGRAM_ID?cluster=$CLUSTER"
echo ""
echo "Wallet Explorer:"
echo "  https://explorer.solana.com/address/$WALLET?cluster=$CLUSTER"
echo ""

echo "✅ Verification complete!"
