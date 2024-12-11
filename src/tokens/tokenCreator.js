// src/tokens/tokenCreator.js
import { Keypair, Connection } from '@solana/web3.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AnchorProvider } from "@coral-xyz/anchor";
import { PumpFunSDK } from '../../PumpFunSDK.js'; // путь к PumpFunSDK
import { getWalletKeypair } from '../wallets/walletManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tokenConfigPath = path.resolve(__dirname, '../config/token_config.json');
const tokenConfig = JSON.parse(readFileSync(tokenConfigPath, 'utf-8'));

const tokenListPath = path.resolve(__dirname, '../data/token_list.json');

// Инициализация соединения и SDK
// Замените на ваш RPC эндпоинт (например, Helius или другой)
const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=a298442a-78f9-47b2-bed0-c2d1fca7981c", "confirmed");

export async function createToken() {
  const creatorWallet = getWalletKeypair('dev');
  const creatorKeypair = creatorWallet; // Keypair dev кошелька
  const provider = new AnchorProvider(connection, {
    publicKey: creatorKeypair.publicKey,
    signAllTransactions: async (txs) => {
      txs.forEach((tx) => tx.sign(creatorKeypair));
      return txs;
    },
    signTransaction: async (tx) => {
      tx.sign(creatorKeypair);
      return tx;
    }
  }, { commitment: "confirmed" });

  const sdk = new PumpFunSDK(provider);

  const mintKeypair = Keypair.generate();

  const {
    name,
    symbol,
    description,
    image_path,
    twitter,
    telegram,
    website,
    showName
  } = tokenConfig;

  // Преобразуем изображение в Blob для createTokenMetadata
  const imageBuffer = readFileSync(path.resolve(__dirname, image_path));
  const fileBlob = new Blob([imageBuffer], { type: 'image/png' });

  const createTokenMetadata = {
    name: name,
    symbol: symbol,
    description: description,
    file: fileBlob,
    twitter: twitter,
    telegram: telegram,
    website: website
  };

  // Создадим токен и сразу купим 1 SOL токенов для инициализации (можно менять сумму)
  const buyAmountSol = BigInt(1_000_000_000); // 1 SOL в lamports

  const createResults = await sdk.createAndBuy(
    creatorKeypair,
    mintKeypair,
    createTokenMetadata,
    buyAmountSol
  );

  console.log("Token created! Signature:", createResults.signature);
  console.log("Mint Address:", mintKeypair.publicKey.toBase58());

  const newRecord = {
    mint: mintKeypair.publicKey.toBase58(),
    createdAt: new Date().toISOString(),
    txSignature: createResults.signature,
    name,
    symbol,
    description
  };

  let tokenList = [];
  if (existsSync(tokenListPath)) {
    const content = readFileSync(tokenListPath, 'utf-8');
    try {
      tokenList = JSON.parse(content);
    } catch (e) {
      tokenList = [];
    }
  }
  tokenList.push(newRecord);
  writeFileSync(tokenListPath, JSON.stringify(tokenList, null, 2), 'utf-8');

  return {
    txSignature: createResults.signature,
    mint: mintKeypair.publicKey.toBase58()
  };
}
