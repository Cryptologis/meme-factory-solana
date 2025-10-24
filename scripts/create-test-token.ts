import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BN from "bn.js";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MemeChain as Program;
  
  console.log("🚀 Creating test meme token...");
  console.log("Program ID:", program.programId.toString());
  console.log("Creator:", provider.wallet.publicKey.toString());

  // Token details
  const tokenName = "Doge Supreme";
  const tokenSymbol = "test7";
  const tokenUri = "https://arweave.net/test-metadata";
  const imageHash = Array(32).fill(1); // Dummy hash for testing

  // Virtual reserves (Pump.fun style)
  const virtualSolReserves = new BN("30000000000"); // 30 SOL
  const virtualTokenReserves = new BN("800000"); // 800K tokens (pump.fun style)

  // Find PDAs
  const [protocolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol")],
    program.programId
  );

  const [memePDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("meme"),
      provider.wallet.publicKey.toBuffer(),
      Buffer.from(tokenSymbol)
    ],
    program.programId
  );

  const [mintPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint"), memePDA.toBuffer()],
    program.programId
  );

  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), memePDA.toBuffer()],
    program.programId
  );

  const creatorTokenAccount = await getAssociatedTokenAddress(
    mintPDA,
    provider.wallet.publicKey
  );

  console.log("\n📍 PDAs:");
  console.log("Protocol:", protocolPDA.toString());
  console.log("Meme:", memePDA.toString());
  console.log("Mint:", mintPDA.toString());
  console.log("Vault:", vaultPDA.toString());

  try {
    const tx = await program.methods
      .createMemeToken(
        tokenName,
        tokenSymbol,
        tokenUri,
        imageHash,
        virtualSolReserves,
        virtualTokenReserves
      )
      .accounts({
        protocol: protocolPDA,
        meme: memePDA,
        mint: mintPDA,
        creatorTokenAccount,
        bondingCurveVault: vaultPDA,
        creator: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("\n✅ Token created successfully!");
    console.log("Transaction:", tx);
    console.log("View on Explorer:");
    console.log(`https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    console.log("\n🪙 Token Details:");
    console.log("Name:", tokenName);
    console.log("Symbol:", tokenSymbol);
    console.log("Mint Address:", mintPDA.toString());
    console.log("Meme PDA:", memePDA.toString());

    // Fetch and display token data
    const memeData = await program.account.memeToken.fetch(memePDA);
    console.log("\n📊 Token Info:");
    console.log("Total Supply:", memeData.totalSupply.toString());
    console.log("Virtual Token Reserves:", memeData.virtualTokenReserves.div(new BN(1e9)).toString(), "tokens");
    console.log("Virtual Token Reserves:", (memeData.virtualTokenReserves.toNumber() / 1e9).toFixed(0), "tokens");
    console.log("Starting Price:", (memeData.virtualSolReserves.toNumber() / memeData.virtualTokenReserves.toNumber() * 1e9).toFixed(10), "SOL/token");

  } catch (error: any) {
    console.error("❌ Error creating token:", error);
    if (error.logs) {
      console.error("Program logs:", error.logs);
    }
  }
}

main();
