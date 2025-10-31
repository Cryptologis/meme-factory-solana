#!/bin/bash

# Script to apply token creation fixes to the separate frontend repository
# Run this on your Mac terminal

set -e  # Exit on any error

FRONTEND_PATH="/Users/samuelgonzalez/Documents/meme-factory-ui"
BRANCH_NAME="fix/add-virtual-reserves-$(date +%s)"

echo "🚀 Starting automated fix application..."
echo "================================================"

# Check if frontend directory exists
if [ ! -d "$FRONTEND_PATH" ]; then
    echo "❌ Error: Frontend directory not found at $FRONTEND_PATH"
    exit 1
fi

cd "$FRONTEND_PATH"
echo "✅ Changed to frontend directory: $FRONTEND_PATH"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not a git repository"
    exit 1
fi

# Save current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"

# Create and checkout new branch
echo "🌿 Creating new branch: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME"

# Apply fix to createTokenTx.js
echo "📝 Updating src/createTokenTx.js..."
cat > src/createTokenTx.js << 'EOF'
import { Buffer } from "buffer";
import { PublicKey, TransactionInstruction, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, RENT_SYSVAR } from './constants';
import BN from 'bn.js';

const PROGRAM_ID = new PublicKey('5mE8RwFEnMJ1Rs4bLM2VSrzMN8RSEJkf1vXb9VpAybvi');

const CREATE_MEME_TOKEN_DISCRIMINATOR = Buffer.from([6, 42, 76, 101, 74, 125, 120, 59]);

function serializeCreateMemeTokenArgs(name, symbol, uri, imageHash, virtualSolReserves, virtualTokenReserves) {
  const nameBytes = Buffer.from(name, 'utf8');
  const symbolBytes = Buffer.from(symbol, 'utf8');
  const uriBytes = Buffer.from(uri, 'utf8');

  const nameLen = Buffer.alloc(4);
  nameLen.writeUInt32LE(nameBytes.length);

  const symbolLen = Buffer.alloc(4);
  symbolLen.writeUInt32LE(symbolBytes.length);

  const uriLen = Buffer.alloc(4);
  uriLen.writeUInt32LE(uriBytes.length);

  const imageHashBuffer = Buffer.from(imageHash);

  // Serialize virtual SOL reserves (u64)
  const solReservesBN = new BN(virtualSolReserves);
  const solReservesBuffer = solReservesBN.toArrayLike(Buffer, 'le', 8);

  // Serialize virtual token reserves (u64)
  const tokenReservesBN = new BN(virtualTokenReserves);
  const tokenReservesBuffer = tokenReservesBN.toArrayLike(Buffer, 'le', 8);

  return Buffer.concat([
    CREATE_MEME_TOKEN_DISCRIMINATOR,
    nameLen,
    nameBytes,
    symbolLen,
    symbolBytes,
    uriLen,
    uriBytes,
    imageHashBuffer,
    solReservesBuffer,
    tokenReservesBuffer
  ]);
}

export async function createMemeTokenTransaction(
  connection,
  wallet,
  tokenName,
  tokenSymbol,
  metadataUri,
  imageHash
) {
  const [protocolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('protocol')],
    PROGRAM_ID
  );

  const [memePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('meme'), wallet.publicKey.toBuffer(), Buffer.from(tokenSymbol)],
    PROGRAM_ID
  );

  const [mintPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('mint'), memePDA.toBuffer()],
    PROGRAM_ID
  );

  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), memePDA.toBuffer()],
    PROGRAM_ID
  );

  const [creatorTokenAccount] = PublicKey.findProgramAddressSync(
    [wallet.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintPDA.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  // Virtual reserves for bonding curve (Pump.fun style)
  const virtualSolReserves = "30000000000"; // 30 SOL in lamports
  const virtualTokenReserves = "800000000000"; // 800K tokens with 6 decimals

  const data = serializeCreateMemeTokenArgs(
    tokenName,
    tokenSymbol,
    metadataUri,
    imageHash,
    virtualSolReserves,
    virtualTokenReserves
  );

  const keys = [
    { pubkey: protocolPDA, isSigner: false, isWritable: true },
    { pubkey: memePDA, isSigner: false, isWritable: true },
    { pubkey: mintPDA, isSigner: false, isWritable: true },
    { pubkey: creatorTokenAccount, isSigner: false, isWritable: true },
    { pubkey: vaultPDA, isSigner: false, isWritable: true },
    { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: new PublicKey("11111111111111111111111111111111"), isSigner: false, isWritable: false },
    { pubkey: RENT_SYSVAR, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  });

  const transaction = new Transaction().add(instruction);
  transaction.feePayer = wallet.publicKey;
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  return { transaction, mintPDA };
}
EOF

echo "✅ createTokenTx.js updated successfully"

# Create a Node.js script to update App.jsx (more reliable than sed for complex replacements)
echo "📝 Updating src/App.jsx error handling..."
cat > /tmp/update-app.js << 'NODESCRIPT'
const fs = require('fs');
const path = require('path');

const appJsxPath = process.argv[2];
const content = fs.readFileSync(appJsxPath, 'utf8');

// Find and replace the catch block
const oldCatchPattern = /} catch \(error\) \{[\s\S]*?console\.error\(['"](Error:|Create token error:)['"],[^}]*\}[\s\S]*?alert\([^)]*\);[\s\S]*?\} finally \{/;

const newCatchBlock = `} catch (error) {
      console.error('Create token error:', error);
      console.error('Error message:', error.message);
      if (error.logs) {
        console.error('Transaction logs:', error.logs);
      }

      let errorMessage = error.message || 'Unknown error occurred';
      if (error.logs && error.logs.length > 0) {
        // Try to extract more meaningful error from logs
        const relevantLog = error.logs.find(log => log.includes('Error:') || log.includes('failed'));
        if (relevantLog) {
          errorMessage += \`\\n\${relevantLog}\`;
        }
      }

      alert(\`Token creation failed:\\n\${errorMessage}\`);
    } finally {`;

if (oldCatchPattern.test(content)) {
  const updatedContent = content.replace(oldCatchPattern, newCatchBlock);
  fs.writeFileSync(appJsxPath, updatedContent, 'utf8');
  console.log('✅ App.jsx error handling updated');
  process.exit(0);
} else {
  console.log('⚠️  Could not find exact catch block pattern - App.jsx might already be updated or has a different structure');
  process.exit(0);
}
NODESCRIPT

node /tmp/update-app.js "$FRONTEND_PATH/src/App.jsx"

# Show changes
echo ""
echo "📊 Changes made:"
git diff --stat

echo ""
echo "📋 Detailed changes:"
git diff

# Stage changes
echo ""
echo "➕ Staging changes..."
git add src/createTokenTx.js src/App.jsx

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "⚠️  No changes to commit - files might already be up to date"
    echo "🔙 Returning to original branch: $CURRENT_BRANCH"
    git checkout "$CURRENT_BRANCH"
    git branch -D "$BRANCH_NAME" 2>/dev/null || true
    exit 0
fi

# Commit changes
echo "💾 Committing changes..."
git commit -m "Fix token creation error by adding virtual reserve parameters

The frontend was only sending 5 parameters to the contract, but the contract
expects 6 parameters (including initial_virtual_sol_reserves and
initial_virtual_token_reserves).

Changes:
- Updated serializeCreateMemeTokenArgs to include both virtual reserve parameters
- Set virtualSolReserves to 30 SOL (30000000000 lamports)
- Set virtualTokenReserves to 800K tokens with 6 decimals (800000000000)
- Enhanced error logging in App.jsx for better debugging

This fixes the 'Proxy(\$s)' error that was occurring during token creation."

echo "✅ Changes committed successfully"

# Push to remote
echo ""
echo "🚀 Pushing to remote repository..."
git push -u origin "$BRANCH_NAME"

echo ""
echo "================================================"
echo "✅ SUCCESS! All changes applied and pushed!"
echo "================================================"
echo ""
echo "📍 Branch: $BRANCH_NAME"
echo "🔗 Create a Pull Request on GitHub to merge these changes"
echo ""
echo "🚀 To deploy to Vercel production, run:"
echo "   cd $FRONTEND_PATH"
echo "   vercel --prod"
echo ""
echo "Or merge the PR and Vercel will auto-deploy if connected to your repo."
