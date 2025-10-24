import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.MemeChain as any;
  
  console.log("🔍 Your wallet:", provider.wallet.publicKey.toString());
  console.log("\n📋 Fetching all your tokens...\n");
  
  // Get all meme token accounts
  const memes = await program.account.memeToken.all();
  
  const myTokens = memes.filter(m => m.account.creator.toString() === provider.wallet.publicKey.toString());
  
  console.log(`Found ${myTokens.length} tokens created by you:\n`);
  
  myTokens.forEach((token, i) => {
    console.log(`${i + 1}. ${token.account.name} (${token.account.symbol})`);
    console.log(`   Mint: ${token.account.mint.toString()}`);
    console.log(`   PDA: ${token.publicKey.toString()}`);
    console.log(`   Total Supply: ${token.account.totalSupply.toString()}`);
    console.log(`   Graduated: ${token.account.isGraduated}`);
    console.log("");
  });
}

main();
