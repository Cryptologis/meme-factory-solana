# 🚀 COMPLETE DEPLOYMENT GUIDE - Meme Factory Launchpad
## Customized for Cryptologis Repositories

---

## 📋 Repository Information

**Solana Program:**
- Repository: https://github.com/Cryptologis/meme-factory-solana
- Branch: main

**Frontend UI:**
- Repository: https://github.com/Cryptologis/meme-factory-ui
- Branch: main

---

## 🎯 Deployment Overview

This guide covers:
1. ✅ Creating PR for Solana program fixes
2. ✅ Merging and deploying the program
3. ✅ Updating UI with new IDL
4. ✅ Testing the complete flow

**Total Time: 1-2 hours**

---

## 📦 PART 1: Solana Program PR (30 minutes)

### Prerequisites

```bash
# Make sure you have:
- Git installed and configured
- GitHub access to Cryptologis repos
- Anchor CLI installed (v0.31.1)
- Solana CLI installed
- Downloaded files from this chat
```

### Step 1: Clone Solana Repo (if needed)

```bash
# If you don't have the repo locally
git clone https://github.com/Cryptologis/meme-factory-solana.git
cd meme-factory-solana

# If you already have it
cd /path/to/meme-factory-solana
git pull origin main
```

### Step 2: Copy Downloaded Files

Download these files from this chat and place them in your `meme-factory-solana` directory:

- `lib_fixed.rs`
- `programs_cargo.toml`
- `create-pr-solana.sh`
- `ISSUES_AND_FIXES_REPORT.md`
- `ACTION_PLAN.md`
- `QUICK_REFERENCE.md`

```bash
# Verify files are present
ls -la | grep -E "lib_fixed|programs_cargo|create-pr"
```

### Step 3: Run Automated PR Script

```bash
# Make script executable
chmod +x create-pr-solana.sh

# Run the script
./create-pr-solana.sh
```

**The script will:**
1. ✅ Verify you're in the right repo
2. ✅ Update your main branch
3. ✅ Create new branch: `fix/solana-program-compatibility`
4. ✅ Backup your original files
5. ✅ Copy the fixed files to the correct location
6. ✅ Verify the build works
7. ✅ Create a detailed commit
8. ✅ Push to GitHub
9. ✅ Give you the PR link

### Step 4: Create PR on GitHub

After the script completes, you'll see:

```
📝 PR Creation URL:
   https://github.com/Cryptologis/meme-factory-solana/compare/fix/solana-program-compatibility?expand=1
```

1. Click the link or go to: https://github.com/Cryptologis/meme-factory-solana
2. You'll see "Compare & pull request" button
3. Click it
4. Review the PR details (title and description are already filled)
5. Click "Create pull request"

**PR Title (auto-filled):**
```
fix: resolve Solana program compatibility issues with frontend
```

### Step 5: Review and Merge

1. Review the changes in the PR
2. If you have team members, request their review
3. Wait for any CI checks to pass (if configured)
4. Click "Merge pull request"
5. Click "Confirm merge"
6. Optionally delete the branch

---

## 🔧 PART 2: Deploy Solana Program (15 minutes)

### Step 1: Update Local Repo

```bash
cd meme-factory-solana

# Switch to main and pull
git checkout main
git pull origin main
```

### Step 2: Verify Program ID

The program ID in the code should be:
```
FgKLBQuE6Ksctz4gjFk1BjiBCcUqmnYFy7986ecuNqLS
```

Check it matches:
```bash
# Check lib.rs
grep "declare_id" programs/*/src/lib.rs

# Check Anchor.toml
grep "meme.*chain" Anchor.toml

# Check IDL (if exists)
grep "address" target/idl/*.json
```

**If they don't match, choose one:**

**Option A: Use IDL program ID** (Recommended)
```bash
# Update lib.rs and Anchor.toml to use:
# FgKLBQuE6Ksctz4gjFk1BjiBCcUqmnYFy7986ecuNqLS
```

**Option B: Generate new ID**
```bash
# Generate new keypair
solana-keygen new -o target/deploy/meme_chain_solana-keypair.json

# Get the ID
PROGRAM_ID=$(solana address -k target/deploy/meme_chain_solana-keypair.json)

# Update lib.rs and Anchor.toml with new ID
```

### Step 3: Build

```bash
# Clean build
anchor clean
anchor build

# Verify it built successfully
ls -lh target/deploy/*.so
```

Expected output:
```
-rwxr-xr-x ... meme_chain_solana.so
```

### Step 4: Get Devnet SOL

```bash
# Check balance
solana balance --url devnet

# If less than 2 SOL, get more
solana airdrop 2 --url devnet
```

### Step 5: Deploy to Devnet

```bash
# Deploy the program
anchor deploy --provider.cluster devnet

# Expected output:
# Program Id: FgKLBQuE6Ksctz4gjFk1BjiBCcUqmnYFy7986ecuNqLS
# Deploy success
```

### Step 6: Upload/Update IDL

```bash
PROGRAM_ID="FgKLBQuE6Ksctz4gjFk1BjiBCcUqmnYFy7986ecuNqLS"

# If first time
anchor idl init $PROGRAM_ID -f target/idl/meme_chain_solana.json --provider.cluster devnet

# If updating existing
anchor idl upgrade $PROGRAM_ID -f target/idl/meme_chain_solana.json --provider.cluster devnet
```

### Step 7: Verify Deployment

```bash
# Check program exists
solana program show $PROGRAM_ID --url devnet

# Expected: Shows program data, owner, etc.
```

**✅ Solana Program is now deployed!**

---

## 🎨 PART 3: Update UI (15 minutes)

### Step 1: Navigate to UI Repo

```bash
cd /path/to/meme-factory-ui

# Or clone if needed
cd ..
git clone https://github.com/Cryptologis/meme-factory-ui.git
cd meme-factory-ui
```

### Step 2: Run UI Update Script

Copy the `update-ui-idl.sh` script to your UI directory:

```bash
# Make executable
chmod +x update-ui-idl.sh

# Run it (it will ask for the path to Solana repo)
./update-ui-idl.sh
```

**When prompted:**
- "Have you deployed the updated Solana program?" → Answer `y`
- "Enter path to Solana repo" → Enter path like `../meme-factory-solana`

The script will:
1. ✅ Create branch: `update/program-idl`
2. ✅ Backup old IDL
3. ✅ Copy new IDL from Solana repo
4. ✅ Commit and push changes
5. ✅ Give you PR link

### Step 3: Create UI PR

Visit the link provided:
```
https://github.com/Cryptologis/meme-factory-ui/compare/update/program-idl?expand=1
```

1. Click "Compare & pull request"
2. Review the changes
3. Create the PR
4. Merge it

---

## 🧪 PART 4: Testing (30 minutes)

### Step 1: Initialize Protocol

Create a script `scripts/initialize-protocol.ts` in the Solana repo:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.MemeChainSolana as Program;

  const [protocolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol")],
    program.programId
  );

  console.log("Initializing protocol...");
  console.log("Protocol PDA:", protocolPda.toString());

  try {
    const tx = await program.methods
      .initializeProtocol(
        50,                    // 0.5% protocol fee (50 basis points)
        1_000_000,            // 0.001 SOL creation fee
        85_000_000_000_000    // 85 SOL graduation threshold
      )
      .accounts({
        protocol: protocolPda,
        authority: provider.wallet.publicKey,
        feeRecipient: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Protocol initialized!");
    console.log("Transaction:", tx);
    console.log(`View: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
  } catch (err: any) {
    if (err.message.includes("already in use")) {
      console.log("ℹ️  Protocol already initialized");
    } else {
      throw err;
    }
  }
}

main().catch(console.error);
```

Run it:
```bash
cd meme-factory-solana
npx ts-node scripts/initialize-protocol.ts
```

### Step 2: Create Test Token

Create `scripts/create-test-token.ts`:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.MemeChainSolana as Program;

  // Unique symbol for testing
  const symbol = "TEST" + Date.now().toString().slice(-4);
  console.log("Creating token with symbol:", symbol);

  // Derive PDAs
  const [memePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("meme"), Buffer.from(symbol)],
    program.programId
  );

  const [mintPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint"), memePda.toBuffer()],
    program.programId
  );

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), memePda.toBuffer()],
    program.programId
  );

  const [protocolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol")],
    program.programId
  );

  const creatorTokenAccount = await getAssociatedTokenAddress(
    mintPda,
    provider.wallet.publicKey
  );

  // Create unique image hash (not all zeros)
  const imageHash = Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 256)
  );

  console.log("Creating token...");
  
  const tx = await program.methods
    .createMemeToken(
      "Test Meme Coin",
      symbol,
      "https://example.com/metadata.json",
      imageHash,
      new anchor.BN(30_000_000_000),      // 30 SOL virtual reserves
      new anchor.BN(800_000_000_000_000)  // 800M tokens
    )
    .accounts({
      protocol: protocolPda,
      meme: memePda,
      mint: mintPda,
      creatorTokenAccount: creatorTokenAccount,
      bondingCurveVault: vaultPda,
      creator: provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
    })
    .rpc();

  console.log("✅ Token created!");
  console.log("Transaction:", tx);
  console.log("Symbol:", symbol);
  console.log("Mint:", mintPda.toString());
  console.log(`View: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
  console.log("");
  console.log("⏳ Wait 60 seconds before buying (launch cooldown)");
}

main().catch(console.error);
```

Run it:
```bash
npx ts-node scripts/create-test-token.ts

# Wait 60 seconds for launch cooldown!
```

### Step 3: Test Buy

Create `scripts/test-buy.ts`:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.MemeChainSolana as Program;

  // Use the symbol from your test token
  const symbol = "TEST1234"; // Replace with your actual symbol
  
  // Derive PDAs
  const [memePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("meme"), Buffer.from(symbol)],
    program.programId
  );

  const [mintPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint"), memePda.toBuffer()],
    program.programId
  );

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), memePda.toBuffer()],
    program.programId
  );

  const [protocolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol")],
    program.programId
  );

  const buyerTokenAccount = await getAssociatedTokenAddress(
    mintPda,
    provider.wallet.publicKey
  );

  // Fetch meme data
  const memeData = await program.account.memeToken.fetch(memePda);
  const protocolData = await program.account.protocol.fetch(protocolPda);

  console.log("Buying tokens...");
  console.log("SOL amount: 0.1");
  
  const tx = await program.methods
    .buyTokens(
      new anchor.BN(100_000_000),  // 0.1 SOL
      new anchor.BN(0),            // min tokens (0 for testing)
      500                          // 5% max slippage
    )
    .accounts({
      protocol: protocolPda,
      meme: memePda,
      mint: mintPda,
      buyerTokenAccount: buyerTokenAccount,
      bondingCurveVault: vaultPda,
      buyer: provider.wallet.publicKey,
      creator: memeData.creator,
      feeRecipient: protocolData.feeRecipient,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log("✅ Tokens purchased!");
  console.log("Transaction:", tx);
  console.log(`View: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
}

main().catch(console.error);
```

Run it:
```bash
# Make sure 60 seconds have passed since token creation!
npx ts-node scripts/test-buy.ts
```

### Step 4: Test Anti-Bot Features

**Test Trade Cooldown:**
```bash
# Buy twice rapidly (second should fail)
npx ts-node scripts/test-buy.ts
npx ts-node scripts/test-buy.ts  # Should error: "Trade too fast"
```

**Test Launch Cooldown:**
```bash
# Create token and try to buy immediately (should fail)
npx ts-node scripts/create-test-token.ts
npx ts-node scripts/test-buy.ts  # Should error: "Launch cooldown active"
```

---

## ✅ Success Checklist

### Solana Program
- [ ] PR created and merged
- [ ] Program built successfully
- [ ] Program deployed to devnet
- [ ] IDL uploaded on-chain
- [ ] Protocol initialized
- [ ] Test token created
- [ ] Buy transaction works (after 60s)
- [ ] Anti-bot features trigger correctly

### Frontend UI
- [ ] PR created and merged
- [ ] New IDL copied to UI
- [ ] Program ID matches deployed program
- [ ] UI can connect wallet
- [ ] UI can create tokens
- [ ] UI can buy/sell tokens

---

## 🔗 Quick Links

**Solana Program:**
- Repo: https://github.com/Cryptologis/meme-factory-solana
- PR: https://github.com/Cryptologis/meme-factory-solana/pulls

**Frontend UI:**
- Repo: https://github.com/Cryptologis/meme-factory-ui
- PR: https://github.com/Cryptologis/meme-factory-ui/pulls

**Solana Explorer (Devnet):**
- Program: https://explorer.solana.com/address/FgKLBQuE6Ksctz4gjFk1BjiBCcUqmnYFy7986ecuNqLS?cluster=devnet

---

## 🆘 Troubleshooting

### "InvalidSeeds" Error
- You're using old code
- Solution: Make sure PR is merged and you pulled latest

### "Build Failed"
- Missing dependencies
- Solution: `anchor clean && anchor build`

### "Account Not Found"
- Protocol not initialized
- Solution: Run `initialize-protocol.ts`

### "Trade Too Fast" Error
- ✅ This is GOOD! Anti-bot working
- Wait 1 second between trades

### "Launch Cooldown Active"
- ✅ This is GOOD! Anti-sniping working
- Wait 60 seconds after token creation

---

## 🎉 You're Done!

Your Anti-PVP/Anti-Bundling/Anti-Bot launchpad is now:
- ✅ 100% compatible with frontend
- ✅ Deployed to devnet
- ✅ Ready for testing
- ✅ Anti-bot features active

**Next: Test thoroughly on devnet before mainnet!**
