import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { PumpFunSDK } from 'pumpdotfun-sdk';
import { getAssociatedTokenAddress, getAccount, getMint, closeAccount } from '@solana/spl-token';

const env = JSON.parse(readFileSync('./src/config/env.json', 'utf-8'));
const settings = JSON.parse(readFileSync('./src/config/settings.json', 'utf-8'));

// Пути к файлам
const tokenListPath = path.resolve('./src/data/token_list.json');
const additionalWalletsPath = path.resolve('./src/config/wallets_additional.json');
const miniWalletsPath = path.resolve('./src/config/wallets_mini.json');
const purchasesPath = path.resolve('./src/data/purchases.json');

// Подключение к RPC
const connection = new Connection(env.SOLANA_RPC_URL, "confirmed");

// ====== Функция форматирования числа без научной нотации ======
function formatNumber(num, decimals = 9) {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: false
  });
}

// Функция записи покупки в JSON — с учётом форматирования
function logPurchase(tokenAddress, spentSol, pricePerTokenSol, walletAddress) {
  const spentSolStr = formatNumber(spentSol, 9); 
  const priceStr = formatNumber(pricePerTokenSol, 9);

  const purchase = {
    tokenAddress,
    amount: spentSolStr,         // строка, потраченная сумма SOL
    pricePerTokenSol: priceStr,  // строка, SOL за 1 токен
    timestamp: new Date().toISOString(),
    walletAddress
  };

  let purchases = [];
  if (existsSync(purchasesPath)) {
    try {
      const content = readFileSync(purchasesPath, 'utf-8');
      purchases = JSON.parse(content);
      if (!Array.isArray(purchases)) {
        throw new Error('Invalid JSON format in purchases.json');
      }
    } catch (err) {
      console.error('Error reading purchases.json:', err.message);
      purchases = [];
    }
  }

  purchases.push(purchase);
  try {
    writeFileSync(purchasesPath, JSON.stringify(purchases, null, 2), 'utf-8');
    console.log(`Logged purchase: ${JSON.stringify(purchase)}`);
  } catch (err) {
    console.error('Failed to write to purchases.json:', err.message);
  }
}

// Получаем текущий токен
function getCurrentTokenMint() {
  const content = readFileSync(tokenListPath, 'utf-8');
  const tokenList = JSON.parse(content);
  if (tokenList.length === 0) throw new Error("No tokens found in token_list.json");
  return tokenList[tokenList.length - 1].mint;
}

// Загрузка последних N дополнительных кошельков
function loadLatestAdditionalWallets() {
  const content = readFileSync(additionalWalletsPath, 'utf-8');
  const wallets = JSON.parse(content);
  const count = settings.additionalWalletsToUse || 1;
  return wallets.slice(-count);
}

// Загрузка мини-кошельков
function loadMiniWallets() {
  const content = readFileSync(miniWalletsPath, 'utf-8');
  return JSON.parse(content);
}

// Узнать decimals у токена
async function getMintDecimals(mintPubkey) {
  const mintInfo = await getMint(connection, mintPubkey);
  return mintInfo.decimals;
}

// Получение баланса токенов (человеческое значение)
async function getTokenBalanceHuman(wallet, mintPubkey) {
  const decimals = await getMintDecimals(mintPubkey);
  const associatedTokenAddress = await getAssociatedTokenAddress(mintPubkey, wallet.publicKey);
  const accountInfo = await getAccount(connection, associatedTokenAddress);
  const raw = accountInfo.amount; // BigInt
  return Number(raw) / 10 ** decimals;
}

// ===== СЫРОЙ баланс (BigInt) для продажи, если хотим процент от полного баланса без учёта decimals
async function getTokenBalanceRaw(wallet, mintPubkey) {
  const associatedTokenAddress = await getAssociatedTokenAddress(mintPubkey, wallet.publicKey);
  const accountInfo = await getAccount(connection, associatedTokenAddress);
  return accountInfo.amount; // BigInt
}

// Проверка статуса транзакции (с ретраями)
async function isTransactionConfirmed(signature, retries = 5, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const tx = await connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0
      });
      if (tx && tx.meta && !tx.meta.err) {
        return true; // успех
      }
    } catch (err) {
      console.error(`Retry ${i + 1}/${retries} fetching tx [${signature}]:`, err.message);
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return false;
}

// Покупка: считаем баланс до, покупаем, считаем баланс после, возвращаем дельту
async function buyTokenWithSOL(wallet, mintStr, solAmount) {
  const mintPubkey = new PublicKey(mintStr);

  // Старый баланс (человеческое значение)
  const oldBalance = await getTokenBalanceHuman(wallet, mintPubkey);

  const sdk = new PumpFunSDK({ connection, wallet });
  const buyLamports = BigInt(Math.floor(solAmount * 1e9));

  let txResult;
  try {
    txResult = await sdk.buy(wallet, mintPubkey, buyLamports);
  } catch (err) {
    console.error(`Error calling sdk.buy:`, err.message);
    return null;
  }

  if (!txResult.success || !txResult.signature) {
    console.error(`Transaction not successful or no signature for ${mintStr}`);
    return null;
  }
  const signatureStr = txResult.signature;
  console.log(`sig: https://solscan.io/tx/${signatureStr}`);

  const confirmed = await isTransactionConfirmed(signatureStr);
  if (!confirmed) {
    console.error(`Transaction not confirmed for ${mintStr}`);
    return null;
  }

  console.log(`Bought token ${mintStr} for ${solAmount} SOL from wallet ${wallet.publicKey.toBase58()}`);

  // Новый баланс
  const newBalance = await getTokenBalanceHuman(wallet, mintPubkey);
  const boughtTokens = newBalance - oldBalance;
  console.log(`Delta tokens: old = ${oldBalance}, new = ${newBalance}, delta = ${boughtTokens}`);

  return {
    signature: signatureStr,
    boughtTokens
  };
}

// Продажа: аналог buyTokenWithSOL, но для sell
async function sellTokenAmount(wallet, mintStr, tokenAmountRaw) {
  const mintPubkey = new PublicKey(mintStr);
  const sdk = new PumpFunSDK({ connection, wallet });
  try {
    const txResult = await sdk.sell(wallet, mintPubkey, tokenAmountRaw);

    if (!txResult.success || !txResult.signature) {
      console.error(`Sell transaction failed or no signature returned for ${mintStr}`);
      return null;
    }

    const signatureStr = txResult.signature;
    console.log(`sig: https://solscan.io/tx/${signatureStr}`);

    const confirmed = await isTransactionConfirmed(signatureStr);
    if (!confirmed) {
      console.error(`Transaction not confirmed for SELL of ${mintStr}`);
      return null;
    }

    console.log(`Sold raw ${tokenAmountRaw.toString()} tokens of ${mintStr} from wallet ${wallet.publicKey.toBase58()}`);
    return signatureStr;
  } catch (err) {
    console.error(`Error selling token ${mintStr}:`, err.message);
    return null;
  }
}

// ===== Закрытие аккаунта, если баланс стал 0 (только для 100% продажи) =====
async function closeTokenAccountIfEmpty(wallet, mintPubkey) {
  // Проверяем, нулевой ли баланс
  const rawBalance = await getTokenBalanceRaw(wallet, mintPubkey);
  if (rawBalance === 0n) {
    const associatedTokenAddress = await getAssociatedTokenAddress(mintPubkey, wallet.publicKey);
    console.log(`Closing ATA: ${associatedTokenAddress.toBase58()} since balance=0`);

    try {
      await closeAccount(
        connection,
        wallet,                      // payer & authority
        associatedTokenAddress,      // tokenAccount
        wallet.publicKey,            // destination (получает остаток аренды)
        wallet.publicKey             // owner
      );
      console.log(`Account closed: ${associatedTokenAddress.toBase58()}`);
    } catch (err) {
      console.error(`Failed to close account: ${err.message}`);
    }
  }
}

// ===================== ПОКУПКА =======================

// Покупка дополнительными кошельками
export async function buyWithAdditionalWallets({ minAmount, maxAmount }) {
  const mintStr = getCurrentTokenMint();
  const wallets = loadLatestAdditionalWallets();
  console.log('Active wallets for purchase:', wallets);

  for (const w of wallets) {
    const keypair = Keypair.fromSecretKey(bs58.decode(w.privateKeyBase58));

    const randomAmountSol = Math.random() * (maxAmount - minAmount) + minAmount;
    const result = await buyTokenWithSOL(keypair, mintStr, randomAmountSol);

    if (!result) {
      console.error(`Purchase failed for wallet ${keypair.publicKey.toBase58()}`);
      continue;
    }
    const { boughtTokens } = result;
    if (boughtTokens <= 0) {
      console.warn(`Bought tokens = 0, oldBalance ~= newBalance. Possibly no delta.`);
      continue;
    }

    const pricePerTokenSol = randomAmountSol / boughtTokens;
    logPurchase(
      mintStr,
      randomAmountSol,  // потрачено SOL
      pricePerTokenSol, // SOL за токен
      keypair.publicKey.toBase58()
    );
  }
}

// Покупка мини-кошельками
export async function buyWithMiniWallets({ amountSol = 0.01, delayMs = 1000 }) {
  const mintStr = getCurrentTokenMint();
  const wallets = loadMiniWallets();

  for (const w of wallets) {
    const keypair = Keypair.fromSecretKey(bs58.decode(w.privateKeyBase58));

    const result = await buyTokenWithSOL(keypair, mintStr, amountSol);
    if (!result) {
      console.error(`Purchase failed for wallet ${w.name || keypair.publicKey.toBase58()}`);
    } else {
      const { boughtTokens } = result;
      if (boughtTokens > 0) {
        const pricePerTokenSol = amountSol / boughtTokens;
        logPurchase(mintStr, amountSol, pricePerTokenSol, keypair.publicKey.toBase58());
      } else {
        console.warn(`No token delta for mini wallet ${w.name || keypair.publicKey.toBase58()}`);
      }
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}

// ===================== ПРОДАЖА =======================

// Продажа дополнительными кошельками
export async function sellWithAdditionalWallets({ amount }) {
  const mintStr = getCurrentTokenMint();
  const wallets = loadLatestAdditionalWallets();
  const mintPubkey = new PublicKey(mintStr);

  for (const w of wallets) {
    const keypair = Keypair.fromSecretKey(bs58.decode(w.privateKeyBase58));

    let tokenAmountToSell;
    if (typeof amount === 'string' && amount.endsWith('%')) {
      const percent = parseInt(amount.replace('%', ''), 10);
      const balanceRaw = await getTokenBalanceRaw(keypair, mintPubkey);
      tokenAmountToSell = (balanceRaw * BigInt(percent)) / 100n;
    } else {
      tokenAmountToSell = BigInt(amount);
    }

    const txSignature = await sellTokenAmount(keypair, mintStr, tokenAmountToSell);
    if (!txSignature) {
      console.error(`Sell failed for wallet ${keypair.publicKey.toBase58()}`);
      continue;
    }

    // Если продаём "100%", пробуем закрыть аккаунт (если баланс=0)
    if (typeof amount === 'string' && amount.endsWith('%')) {
      const percent = parseInt(amount.replace('%', ''), 10);
      if (percent === 100) {
        await closeTokenAccountIfEmpty(keypair, mintPubkey);
      }
    }
  }
}

// Продажа мини-кошельками
export async function sellWithMiniWallets({ amount }) {
  const mintStr = getCurrentTokenMint();
  const wallets = loadMiniWallets();
  const mintPubkey = new PublicKey(mintStr);

  for (const w of wallets) {
    const keypair = Keypair.fromSecretKey(bs58.decode(w.privateKeyBase58));

    let tokenAmountToSell;
    if (typeof amount === 'string' && amount.endsWith('%')) {
      const percent = parseInt(amount.replace('%', ''), 10);
      const balanceRaw = await getTokenBalanceRaw(keypair, mintPubkey);
      tokenAmountToSell = (balanceRaw * BigInt(percent)) / 100n;
    } else {
      tokenAmountToSell = BigInt(amount);
    }

    const txSignature = await sellTokenAmount(keypair, mintStr, tokenAmountToSell);
    if (!txSignature) {
      console.error(`Sell failed for wallet ${w.name || keypair.publicKey.toBase58()}`);
      continue;
    }

    // Если "100%", закрываем аккаунт, если пустой
    if (typeof amount === 'string' && amount.endsWith('%')) {
      const percent = parseInt(amount.replace('%', ''), 10);
      if (percent === 100) {
        await closeTokenAccountIfEmpty(keypair, mintPubkey);
      }
    }
  }
}
