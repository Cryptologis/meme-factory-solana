const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram } = require("@solana/web3.js");
const fs = require("fs");

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const idl = JSON.parse(fs.readFileSync("./target/idl/meme_chain.json", "utf8"));
  const programId = new PublicKey("CRJDPpTp3aayKYZCaLEYntnpP3xvwbeTDYMdu18RtHwh");
  const program = new anchor.Program(idl, programId, provider);
  
  console.log("🚀 Initializing protocol...");
  console.log("Program:", programId.toString());
  
  try {
    const tx = await program.methods
      .initializeProtocol(100, new anchor.BN(20_000_000))
      .accounts({
        authority: provider.wallet.publicKey,
        treasury: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log("✅ Success! TX:", tx);
    console.log("https://explorer.solana.com/tx/" + tx + "?cluster=devnet");
  } catch (err) {
    console.error("❌ Error:", err.message || err);
  }
}

main();
