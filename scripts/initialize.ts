import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import idl from "../target/idl/meme_chain.json" assert { type: "json" };

async function initialize() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const programId = new PublicKey("CRJDPpTp3aayKYZCaLEYntnpP3xvwbeTDYMdu18RtHwh");
  const program = new anchor.Program(idl as any, programId, provider);
  
  try {
    const tx = await program.methods
      .initializeProtocol(100, new anchor.BN(20_000_000)) // 1% fee, 0.02 SOL creation fee
      .accounts({
        authority: provider.wallet.publicKey,
        treasury: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    
    console.log("✅ Protocol initialized! TX:", tx);
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

initialize();
