import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { readFileSync } from "fs";

async function initialize() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const programId = new PublicKey("JDmuP2KvxCfRi1biCd3LKJAuycx5pBuHF6WYVf9sGL7M");
  const idlJson = JSON.parse(readFileSync("./target/idl/meme_chain.json", "utf8"));
  const program = new anchor.Program(idlJson, programId, provider);
  
  const [protocolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol")],
    programId
  );
  
  console.log("Program ID:", programId.toString());
  console.log("Protocol PDA:", protocolPda.toString());
  console.log("Authority:", provider.wallet.publicKey.toString());
  
  try {
    // Check if already initialized
    const protocolAccount = await program.account.protocol.fetch(protocolPda);
    console.log("✅ Protocol already initialized!");
    console.log("Fee recipient:", protocolAccount.feeRecipient.toString());
    console.log("Fee BPS:", protocolAccount.feeBps.toString());
  } catch (e) {
    console.log("❌ Protocol not initialized, initializing now...");
    
    const tx = await program.methods
      .initializeProtocol()
      .accounts({
        protocol: protocolPda,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    
    console.log("✅ Protocol initialized! TX:", tx);
    console.log("🔗 https://explorer.solana.com/tx/" + tx + "?cluster=devnet");
  }
}

initialize().catch(console.error);
