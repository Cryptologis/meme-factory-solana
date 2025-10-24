import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.MemeChain as any;
  
  const [protocolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol")],
    program.programId
  );
  
  const protocol = await program.account.protocol.fetch(protocolPDA);
  
  console.log("📊 Protocol Settings:");
  console.log("Authority:", protocol.authority.toString());
  console.log("Fee Recipient:", protocol.feeRecipient.toString());
  console.log("Protocol Fee:", protocol.protocolFeeBps / 100, "%");
  console.log("Creation Fee:", protocol.creationFeeLamports.toString(), "lamports =", 
    (Number(protocol.creationFeeLamports.toString()) / 1e9).toFixed(4), "SOL");
  console.log("Graduation Threshold:", protocol.graduationThreshold.toString(), "lamports =",
    (Number(protocol.graduationThreshold.toString()) / 1e9).toFixed(2), "SOL");
  console.log("Total Memes Created:", protocol.totalMemesCreated.toString());
  console.log("Total Volume:", protocol.totalVolume.toString(), "lamports =",
    (Number(protocol.totalVolume.toString()) / 1e9).toFixed(4), "SOL");
}

main();
