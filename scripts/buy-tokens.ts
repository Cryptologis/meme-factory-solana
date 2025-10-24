import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BN from "bn.js";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MemeChain as Program;

  // Your meme PDA from the create script
  const memePDA = new PublicKey("Fs7RpdXvFRz1hm7R59k17VToKLJYe5nuujTXo1k8iBbT");

  const solAmount = new BN("100000000"); // Buy with 1 SOL
  const minTokensOut = new BN("0"); // Accept any amount for testing
  const maxSlippageBps = 500; // 5% max slippage

  console.log("💰 Buying tokens with 1 SOL...");

  const memeData = await program.account.memeToken.fetch(memePDA);
  
  const [protocolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol")],
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

  const buyerTokenAccount = await getAssociatedTokenAddress(
    mintPDA,
    provider.wallet.publicKey
  );

  const protocolData = await program.account.protocol.fetch(protocolPDA);

  try {
    const tx = await program.methods
      .buyTokens(solAmount, minTokensOut, maxSlippageBps)
      .accounts({
        protocol: protocolPDA,
        meme: memePDA,
        mint: mintPDA,
        buyerTokenAccount,
        bondingCurveVault: vaultPDA,
        buyer: provider.wallet.publicKey,
        creator: memeData.creator,
        feeRecipient: protocolData.feeRecipient,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Tokens purchased!");
    console.log("Transaction:", tx);
    console.log(`https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    // Check balance
    const connection = provider.connection;
    const balance = await connection.getTokenAccountBalance(buyerTokenAccount);
    console.log("\n💎 Your token balance:", Number(balance.value.amount) / 1e9, "tokens");

    // Show updated meme data
    const updatedMeme = await program.account.memeToken.fetch(memePDA);
    console.log("\n📊 Updated Stats:");
    console.log("Circulating Supply:", updatedMeme.circulatingSupply.div(new BN(1e9)).toString(), "tokens");
    console.log("Real SOL Reserves:", updatedMeme.realSolReserves.div(new BN(1e9)).toString(), "SOL");
    console.log("Total Volume:", updatedMeme.totalVolume.div(new BN(1e9)).toString(), "SOL");

  } catch (error: any) {
    console.error("❌ Error:", error);
    if (error.logs) {
      console.error("Logs:", error.logs);
    }
  }
}

main();
