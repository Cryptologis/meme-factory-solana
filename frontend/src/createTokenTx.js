import { Buffer } from "buffer";
import { PublicKey, TransactionInstruction, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, RENT_SYSVAR } from './constants';
import BN from 'bn.js';

const PROGRAM_ID = new PublicKey('5mE8RwFEnMJ1Rs4bLM2VSrzMN8RSEJkf1vXb9VpAybvi');

const CREATE_MEME_TOKEN_DISCRIMINATOR = Buffer.from([6, 42, 76, 101, 74, 125, 120, 59]);

function serializeCreateMemeTokenArgs(name, symbol, uri, imageHash, virtualSolReserves, virtualTokenReserves) {
  const nameBytes = Buffer.from(name, 'utf8');
  const symbolBytes = Buffer.from(symbol, 'utf8');
  const uriBytes = Buffer.from(uri, 'utf8');

  const nameLen = Buffer.alloc(4);
  nameLen.writeUInt32LE(nameBytes.length);

  const symbolLen = Buffer.alloc(4);
  symbolLen.writeUInt32LE(symbolBytes.length);

  const uriLen = Buffer.alloc(4);
  uriLen.writeUInt32LE(uriBytes.length);

  const imageHashBuffer = Buffer.from(imageHash);

  // Serialize virtual SOL reserves (u64)
  const virtualSolBN = new BN(virtualSolReserves);
  const virtualSolBuffer = virtualSolBN.toArrayLike(Buffer, 'le', 8);

  // Serialize virtual token reserves (u64)
  const virtualTokenBN = new BN(virtualTokenReserves);
  const virtualTokenBuffer = virtualTokenBN.toArrayLike(Buffer, 'le', 8);

  return Buffer.concat([
    CREATE_MEME_TOKEN_DISCRIMINATOR,
    nameLen,
    nameBytes,
    symbolLen,
    symbolBytes,
    uriLen,
    uriBytes,
    imageHashBuffer,
    virtualSolBuffer,
    virtualTokenBuffer
  ]);
}

export async function createMemeTokenTransaction(
  connection,
  wallet,
  tokenName,
  tokenSymbol,
  metadataUri,
  imageHash
) {
  const [protocolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('protocol')],
    PROGRAM_ID
  );
  
  const [memePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('meme'), wallet.publicKey.toBuffer(), Buffer.from(tokenSymbol)],
    PROGRAM_ID
  );
  
  const [mintPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('mint'), memePDA.toBuffer()],
    PROGRAM_ID
  );
  
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), memePDA.toBuffer()],
    PROGRAM_ID
  );
  
  const [creatorTokenAccount] = PublicKey.findProgramAddressSync(
    [wallet.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintPDA.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  // Pump.fun-style virtual reserves for bonding curve
  // Virtual SOL: 30 SOL (creates initial pricing)
  const VIRTUAL_SOL_RESERVES = 30_000_000_000; // 30 SOL in lamports
  // Virtual Token: 1.073 billion tokens (with 9 decimals)
  const VIRTUAL_TOKEN_RESERVES = 1_073_000_000_000_000_000n; // 1.073B tokens

  const data = serializeCreateMemeTokenArgs(
    tokenName,
    tokenSymbol,
    metadataUri,
    imageHash,
    VIRTUAL_SOL_RESERVES,
    VIRTUAL_TOKEN_RESERVES.toString()
  );
  
  const keys = [
    { pubkey: protocolPDA, isSigner: false, isWritable: true },
    { pubkey: memePDA, isSigner: false, isWritable: true },
    { pubkey: mintPDA, isSigner: false, isWritable: true },
    { pubkey: creatorTokenAccount, isSigner: false, isWritable: true },
    { pubkey: vaultPDA, isSigner: false, isWritable: true },
    { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: new PublicKey("11111111111111111111111111111111"), isSigner: false, isWritable: false },
    { pubkey: RENT_SYSVAR, isSigner: false, isWritable: false },
  ];
  
  const instruction = new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  });
  
  const transaction = new Transaction().add(instruction);
  transaction.feePayer = wallet.publicKey;
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  
  return { transaction, mintPDA };
}
