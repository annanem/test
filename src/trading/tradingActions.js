// src/trading/tradingActions.js
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { VersionedTransaction, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import fetch from 'node-fetch';
import { web3Connection } from '../utils/solanaRpcClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tokenListPath = path.resolve(__dirname, '../data/token_list.json');
const additionalWalletsPath = path.resolve(__dirname, '../config/wallets_additional.json');

/**
 * Получить текущий токен (последний созданный)
 */
function getCurrentTokenMint() {
  const content = readFileSync(tokenListPath, 'utf-8');
  const tokenList = JSON.parse(content);
  if (tokenList.length === 0) {
    throw new Error("No tokens found in token_list.json");
  }
  return tokenList[tokenList.length - 1].mint;
}

/**
 * Загрузить дополнительный кошельки
 */
function loadAdditionalWallets() {
  const content = readFileSync(additionalWalletsPath, 'utf-8');
  return JSON.parse(content); // массив объектов: {name, privateKeyBase58, publicKey}
}

/**
 * Выполнить транзакцию через pumpportal.fun/api/trade-local
 * @param {object} params 
 * @param {string} params.publicKey - Публичный ключ кошелька (string)
 * @param {string} params.action - "buy" или "sell"
 * @param {string} params.mint - адрес токена
 * @param {boolean} params.denominatedInSol - true, если amount в SOL, false если в токенах
 * @param {number|string} params.amount - количество SOL или токенов, либо процент (например "100%" при продаже)
 * @param {number} params.slippage - допустимый процент проскальзывания
 * @param {number} params.priorityFee - приоритетная комиссия
 * @param {string} [params.pool] - "pump" или "raydium"
 * @param {string} params.walletPrivateKeyBase58 - приватный ключ кошелька для подписи транзакции
 */
export async function tradeToken({
  publicKey,
  action,
  mint,
  denominatedInSol,
  amount,
  slippage,
  priorityFee,
  pool = "pump",
  walletPrivateKeyBase58
}) {
  const body = {
    publicKey,
    action,
    mint,
    denominatedInSol: denominatedInSol ? "true" : "false",
    amount,
    slippage,
    priorityFee,
    pool
  };

  const response = await fetch(`https://pumpportal.fun/api/trade-local`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (response.status === 200) {
    const data = await response.arrayBuffer();
    const tx = VersionedTransaction.deserialize(new Uint8Array(data));
    const signerKeyPair = Keypair.fromSecretKey(bs58.decode(walletPrivateKeyBase58));
    tx.sign([signerKeyPair]);
    const signature = await web3Connection.sendTransaction(tx);
    await web3Connection.confirmTransaction(signature, 'confirmed');
    console.log(`Trade ${action} executed. Tx: https://solscan.io/tx/${signature}`);
  } else {
    const text = await response.text();
    console.error(`Error executing trade (${action}):`, response.status, text);
  }
}

/**
 * Пример: покупка токена дополнительными кошельками.
 * @param {object} options
 * @param {number} options.amountTokens - сколько токенов купить (если denominatedInSol=false)
 * @param {boolean} options.denominatedInSol - true, если покупаем за SOL, false если покупаем определенное количество токенов
 * @param {number} options.slippage
 * @param {number} options.priorityFee
 * @param {string} [options.pool]
 */
export async function buyWithAdditionalWallets({ 
    denominatedInSol = false, 
    slippage = 10, 
    priorityFee = 0.00001, 
    pool = "pump",
    minAmount,
    maxAmount
  }) {
    const mint = getCurrentTokenMint();
    const wallets = loadAdditionalWallets();
  
    for (const w of wallets) {
      // Генерируем случайное количество токенов между minAmount и maxAmount
      const randomAmount = Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;
      
      console.log(`Buying token ${mint} with wallet ${w.name} (${w.publicKey}): ${randomAmount} tokens`);
      await tradeToken({
        publicKey: w.publicKey,
        action: "buy",
        mint,
        denominatedInSol,
        amount: randomAmount,
        slippage,
        priorityFee,
        pool,
        walletPrivateKeyBase58: w.privateKeyBase58
      });
    }
  }

/**
 * Пример: продажа токена дополнительными кошельками.
 * Можно указать amount как число (кол-во токенов) или процент, например "100%" для продажи всех токенов.
 * @param {object} options
 * @param {number|string} options.amount - например, 1000 или "100%" для продажи всех.
 * @param {boolean} options.denominatedInSol - Если true, сумма в SOL. Если false - в токенах.
 * @param {number} options.slippage
 * @param {number} options.priorityFee
 * @param {string} [options.pool]
 */
export async function sellWithAdditionalWallets({ amount, denominatedInSol = false, slippage = 10, priorityFee = 0.00001, pool = "pump" }) {
  const mint = getCurrentTokenMint();
  const wallets = loadAdditionalWallets();

  for (const w of wallets) {
    console.log(`Selling token ${mint} with wallet ${w.name} (${w.publicKey}), amount: ${amount}`);
    await tradeToken({
      publicKey: w.publicKey,
      action: "sell",
      mint,
      denominatedInSol,
      amount,
      slippage,
      priorityFee,
      pool,
      walletPrivateKeyBase58: w.privateKeyBase58
    });
  }
}


/**
 * Функция для покупки токена мини-кошельками.
 * @param {object} options
 * @param {number} options.amountSol - Сколько SOL тратить на покупку (по умолчанию 0.01)
 * @param {number} options.slippage - допустимый процент проскальзывания
 * @param {number} options.priorityFee - приоритетная комиссия
 * @param {string} [options.pool] - "pump" или "raydium"
 * @param {number} [options.delayMs] - задержка между транзакциями в миллисекундах (по умолчанию 1000 мс)
 */
export async function buyWithMiniWallets({
    amountSol = 0.01,
    slippage = 10,
    priorityFee = 0.00001,
    pool = "pump",
    delayMs = 1000
  }) {
    const mint = getCurrentTokenMint();
    const wallets = loadMiniWallets();
  
    for (const w of wallets) {
      console.log(`Mini wallet ${w.name} (${w.publicKey}) buying token ${mint} for ${amountSol} SOL`);
      await tradeToken({
        publicKey: w.publicKey,
        action: "buy",
        mint,
        denominatedInSol: true, // Покупаем за SOL
        amount: amountSol,
        slippage,
        priorityFee,
        pool,
        walletPrivateKeyBase58: w.privateKeyBase58
      });
  
      // Задержка перед переходом к следующему кошельку
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }