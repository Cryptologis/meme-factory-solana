import { Buffer } from "buffer";
import { PublicKey, TransactionInstruction, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, RENT_SYSVAR } from './constants';
import BN from 'bn.js';

const PROGRAM_ID = new PublicKey('5mE8RwFEnMJ1Rs4bLM2VSrzMN8RSEJkf1vXb9VpAybvi');

const CREATE_MEME_TOKEN_DISCRIMINATOR = Buffer.from([6, 42, 76, 101, 74, 125, 120, 59]);

function serializeCreateMemeTokenArgs(name, symbol, uri, imageHash, initialSupply) {
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
  
  const supplyBN = new BN(initialSupply);
  const supplyBuffer = supplyBN.toArrayLike(Buffer, 'le', 8);
  
  return Buffer.concat([
    CREATE_MEME_TOKEN_DISCRIMINATOR,
    nameLen,
    nameBytes,
    symbolLen,
    symbolBytes,
    uriLen,
    uriBytes,
    imageHashBuffer,
    supplyBuffer
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
  
  const data = serializeCreateMemeTokenArgs(
    tokenName,
    tokenSymbol,
    metadataUri,
    imageHash,
    1000000000
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
