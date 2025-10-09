const anchor = require("@coral-xyz/anchor");
const { SystemProgram, Keypair } = require("@solana/web3.js");
const fs = require("fs");

async function main() {
  // Load your wallet
  const keypairData = JSON.parse(
    fs.readFileSync("/Users/samuelgonzalez/.config/solana/my-wallet.json")
  );
  const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  // Connect to devnet
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com");
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), {});
  
  // Load your program
  const idl = JSON.parse(fs.readFileSync("./target/idl/meme_chain_solana.json"));
  const programId = new anchor.web3.PublicKey("5mE8RwFEnMJ1Rs4bLM2VSrzMN8RSEJkf1vXb9VpAybvi");
  const program = new anchor.Program(idl, programId, provider);
  
  // Create global state account
  const globalState = Keypair.generate();
  
  console.log("Initializing program...");
  console.log("Global state:", globalState.publicKey.toString());
  
  try {
    const tx = await program.methods
      .initialize()
      .accounts({
        globalState: globalState.publicKey,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([globalState])
      .rpc();
    
    console.log("✅ Program initialized!");
    console.log("Transaction:", tx);
    console.log("\nSave this global state address:", globalState.publicKey.toString());
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
