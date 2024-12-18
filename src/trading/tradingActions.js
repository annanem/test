// src/trading/tradingActions.js
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider } from "@coral-xyz/anchor";
import bs58 from 'bs58';
import { PumpFunSDK } from '../../PumpFunSDK.js'; // путь к вашему SDK
import { getOrCreateAssociatedTokenAccount, getAccount } from '@solana/spl-token'; // для баланса токенов

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tokenListPath = path.resolve(__dirname, '../data/token_list.json');
const additionalWalletsPath = path.resolve(__dirname, '../config/wallets_additional.json');
const miniWalletsPath = path.resolve(__dirname, '../config/wallets_mini.json');

// Настраиваем RPC соединение
const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=a298442a-78f9-47b2-bed0-c2d1fca7981c", "confirmed");

// Функция для создания provider и keypair из base58 ключа
function createProviderFromWalletBase58(secretKeyBase58) {
  const secretKey = bs58.decode(secretKeyBase58);
  const keypair = Keypair.fromSecretKey(secretKey);
  const provider = new AnchorProvider(
    connection,
    {
      publicKey: keypair.publicKey,
      signAllTransactions: async (txs) => {
        txs.forEach(tx => tx.sign(keypair));
        return txs;
      },
      signTransaction: async (tx) => {
        tx.sign(keypair);
        return tx;
      }
    },
    { commitment: "confirmed" }
  );
  return { provider, keypair };
}

function getCurrentTokenMint() {
  const content = readFileSync(tokenListPath, 'utf-8');
  const tokenList = JSON.parse(content);
  if (tokenList.length === 0) {
    throw new Error("No tokens found in token_list.json");
  }
  return tokenList[tokenList.length - 1].mint;
}

function loadAdditionalWallets() {
  const content = readFileSync(additionalWalletsPath, 'utf-8');
  return JSON.parse(content);
}

function loadMiniWallets() {
  const content = readFileSync(miniWalletsPath, 'utf-8');
  return JSON.parse(content);
}

// Получение баланса токенов кошелька
async function getTokenBalance(pubkey, mint) {
  const mintPubkey = new PublicKey(mint);
  const ata = await getOrCreateAssociatedTokenAccount(connection, Keypair.generate(), mintPubkey, pubkey);
  const accountInfo = await getAccount(connection, ata.address);
  return accountInfo.amount; // BigInt количества токенов
}

// Покупка токена (в SOL)
async function buyTokenWithSOL(keypair, mint, solAmount) {
  // solAmount — число (например 0.5 для 0.5 SOL)
  const sdk = new PumpFunSDK(createProviderFromWalletBase58(bs58.encode(keypair.secretKey)).provider);
  const buyAmountLamports = BigInt(Math.floor(solAmount * 1e9));
  await sdk.buy(keypair, new PublicKey(mint), buyAmountLamports);
  console.log(`Bought token ${mint} for ${solAmount} SOL from wallet ${keypair.publicKey.toBase58()}`);
}

// Продажа токенов
async function sellTokenAmount(keypair, mint, tokenAmount) {
  // tokenAmount — BigInt количества токенов для продажи
  const sdk = new PumpFunSDK(createProviderFromWalletBase58(bs58.encode(keypair.secretKey)).provider);
  await sdk.sell(keypair, new PublicKey(mint), tokenAmount);
  console.log(`Sold ${tokenAmount.toString()} tokens of ${mint} from wallet ${keypair.publicKey.toBase58()}`);
}

export async function buyWithAdditionalWallets({ 
  minAmount,
  maxAmount
}) {
  // Покупаем всегда в SOL и задаём случайное число между min и max SOL
  const mint = getCurrentTokenMint();
  const wallets = loadAdditionalWallets();

  for (const w of wallets) {
    const secretKey = bs58.decode(w.privateKeyBase58);
    const keypair = Keypair.fromSecretKey(secretKey);
    const randomAmount = Math.random() * (maxAmount - minAmount) + minAmount;
    // Покупаем за randomAmount SOL
    await buyTokenWithSOL(keypair, mint, randomAmount);
  }
}

export async function sellWithAdditionalWallets({ amount }) {
  // amount может быть числом или строкой с процентом.
  // Если число, продаём столько токенов.
  // Если "100%", продаём все токены.
  const mint = getCurrentTokenMint();
  const wallets = loadAdditionalWallets();

  for (const w of wallets) {
    const secretKey = bs58.decode(w.privateKeyBase58);
    const keypair = Keypair.fromSecretKey(secretKey);
    let tokenAmountToSell;

    if (typeof amount === 'string' && amount.endsWith('%')) {
      const percent = parseInt(amount.replace('%', ''), 10);
      const balance = await getTokenBalance(keypair.publicKey, mint);
      tokenAmountToSell = (balance * BigInt(percent)) / 100n;
    } else {
      // amount — число токенов
      tokenAmountToSell = BigInt(amount);
    }

    await sellTokenAmount(keypair, mint, tokenAmountToSell);
  }
}

export async function buyWithMiniWallets({
  amountSol = 0.01,
  delayMs = 1000
}) {
  const mint = getCurrentTokenMint();
  const wallets = loadMiniWallets();

  for (const w of wallets) {
    const secretKey = bs58.decode(w.privateKeyBase58);
    const keypair = Keypair.fromSecretKey(secretKey);

    await buyTokenWithSOL(keypair, mint, amountSol);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}
