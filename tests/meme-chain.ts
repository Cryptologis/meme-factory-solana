import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";
import BN from "bn.js";

describe("meme_chain", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MemeChain as Program;
  
  console.log("Program ID:", program.programId.toString());

  it("Program loads successfully", async () => {
    assert.ok(program.programId);
    console.log("✅ Program loaded successfully");
    console.log("Program ID:", program.programId.toString());
  });

  it("Initializes protocol", async () => {
    const [protocolPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("protocol")],
      program.programId
    );

    try {
      const tx = await program.methods
        .initializeProtocol(
          100,                      // 1% protocol fee
          new BN(1_000_000),        // 0.001 SOL creation fee
          new BN(85_000_000_000)    // 85 SOL graduation threshold
        )
        .accounts({
          protocol: protocolPDA,
          authority: provider.wallet.publicKey,
          feeRecipient: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("✅ Protocol initialized");
      console.log("Transaction:", tx);
      
      const protocolAccount = await program.account.protocol.fetch(protocolPDA);
      assert.equal(protocolAccount.protocolFeeBps, 100);
      console.log("✅ Protocol fee verified:", protocolAccount.protocolFeeBps);
    } catch (error: any) {
      if (error.message.includes("already in use")) {
        console.log("⚠️  Protocol already initialized (this is OK)");
      } else {
        throw error;
      }
    }
  });
});
