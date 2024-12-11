// src/tokens/tokenCreator.js
import { VersionedTransaction, Keypair } from '@solana/web3.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { web3Connection } from '../utils/solanaRpcClient.js';
import { getWalletKeypair } from '../wallets/walletManager.js';
import { pumpApiRequest } from '../utils/pumpApiClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tokenConfigPath = path.resolve(__dirname, '../config/token_config.json');
const tokenConfig = JSON.parse(readFileSync(tokenConfigPath, 'utf-8'));

// Файл со списком всех токенов
const tokenListPath = path.resolve(__dirname, '../data/token_list.json');

export async function createToken() {
  const creatorWallet = getWalletKeypair('dev');
  
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

  const imageBuffer = readFileSync(path.resolve(__dirname, image_path));

  const formData = new FormData();
  formData.append("file", imageBuffer, { filename: 'example.png', contentType: 'image/png' });
  formData.append("name", name);
  formData.append("symbol", symbol);
  formData.append("description", description);
  formData.append("twitter", twitter || "");
  formData.append("telegram", telegram || "");
  formData.append("website", website || "");
  formData.append("showName", showName ? "true" : "false");

  const metadataResponse = await fetch("https://pump.fun/api/ipfs", {
    method: "POST",
    body: formData
  });

  if (!metadataResponse.ok) {
    const text = await metadataResponse.text();
    throw new Error(`Metadata creation failed: ${metadataResponse.status} ${text}`);
  }

  const metadataResponseJSON = await metadataResponse.json();

  const createTxData = await pumpApiRequest('/api/trade-local', {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "publicKey": creatorWallet.publicKey.toBase58(),
      "action": "create",
      "tokenMetadata": {
        name: metadataResponseJSON.metadata.name,
        symbol: metadataResponseJSON.metadata.symbol,
        uri: metadataResponseJSON.metadataUri
      },
      "mint": mintKeypair.publicKey.toBase58(),
      "denominatedInSol": "true",
      "amount": 1, 
      "slippage": 10,
      "priorityFee": 0.0005,
      "pool": "pump"
    }),
    responseType: 'arrayBuffer'
  });

  const tx = VersionedTransaction.deserialize(new Uint8Array(createTxData));
  tx.sign([mintKeypair, creatorWallet]);
  const signature = await web3Connection.sendTransaction(tx);
  console.log("Token created! Transaction: https://solscan.io/tx/" + signature);
  console.log("Mint Address:", mintKeypair.publicKey.toBase58());

  const newRecord = {
    mint: mintKeypair.publicKey.toBase58(),
    createdAt: new Date().toISOString(),
    txSignature: signature,
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
    txSignature: signature,
    mint: mintKeypair.publicKey.toBase58()
  };
}
