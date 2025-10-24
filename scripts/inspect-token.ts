import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.MemeChain as any;
  
  const memePDA = new PublicKey("Fs7RpdXvFRz1hm7R59k17VToKLJYe5nuujTXo1k8iBbT");
  
  const memeData = await program.account.memeToken.fetch(memePDA);
  
  console.log("📊 Token Reserves:");
  console.log("Virtual SOL Reserves:", memeData.virtualSolReserves.toString(), "lamports");
  console.log("Virtual Token Reserves:", memeData.virtualTokenReserves.toString(), "raw");
  console.log("Real SOL Reserves:", memeData.realSolReserves.toString(), "lamports");
  console.log("Real Token Reserves:", memeData.realTokenReserves.toString(), "raw");
  console.log("\nTotal Supply:", memeData.totalSupply.toString());
}

main();
