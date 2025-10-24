import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BN from "bn.js";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.MemeChain as Program;

  const memePDA = new PublicKey("Fs7RpdXvFRz1hm7R59k17VToKLJYe5nuujTXo1k8iBbT");
  
  const tokenAmount = new BN("1000000000000000"); // Sell 1M tokens (with 9 decimals)
  const minSolOut = new BN("0");
  const maxSlippageBps = 500;

  console.log("💸 Selling 1M tokens...");

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

  const sellerTokenAccount = await getAssociatedTokenAddress(
    mintPDA,
    provider.wallet.publicKey
  );

  const protocolData = await program.account.protocol.fetch(protocolPDA);

  try {
    const tx = await program.methods
      .sellTokens(tokenAmount, minSolOut, maxSlippageBps)
      .accounts({
        protocol: protocolPDA,
        meme: memePDA,
        mint: mintPDA,
        sellerTokenAccount,
        bondingCurveVault: vaultPDA,
        seller: provider.wallet.publicKey,
        creator: memeData.creator,
        feeRecipient: protocolData.feeRecipient,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Tokens sold!");
    console.log("Transaction:", tx);
    console.log(`https://explorer.solana.com/tx/${tx}?cluster=devnet`);

  } catch (error: any) {
    console.error("❌ Error:", error);
    if (error.logs) {
      console.error("Logs:", error.logs);
    }
  }
}

main();
