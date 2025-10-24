import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

describe("Meme Token Factory", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MemeChain as Program<any>;

  it("Initializes the protocol", async () => {
    const [protocolPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("protocol")],
      program.programId
    );

    const tx = await program.methods
      .initializeProtocol(
        100,                // 1% protocol fee (100 basis points)
        new BN(1_000_000),  // 0.001 SOL creation fee
        new BN(1_000_000_000) // 1B tokens to graduate
      )
      .accounts({
        protocol: protocolPDA,
        authority: provider.wallet.publicKey,
        feeRecipient: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Protocol initialized");
    console.log("Transaction:", tx);
    console.log("Protocol PDA:", protocolPDA.toString());

    const protocolAccount = await program.account.protocol.fetch(protocolPDA);
    console.log("Fee:", protocolAccount.protocolFeeBps, "bps");
  });
});
