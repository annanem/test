// src/wallets/walletManager.js
import bs58 from 'bs58';
import { Keypair, SystemProgram, Transaction } from '@solana/web3.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { web3Connection } from '../utils/solanaRpcClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const walletsConfigPath = path.resolve(__dirname, '../config/wallets_config.json');
const additionalWalletsPath = path.resolve(__dirname, '../config/wallets_additional.json');
const miniWalletsPath = path.resolve(__dirname, '../config/wallets_mini.json');

// Универсальные функции загрузки/сохранения
function loadWalletFile(filePath) {
  if (!existsSync(filePath)) {
    return [];
  }
  const content = readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(content);
  } catch (e) {
    return [];
  }
}

function saveWalletFile(filePath, wallets) {
  writeFileSync(filePath, JSON.stringify(wallets, null, 2), 'utf-8');
}

function loadWalletsConfig() {
  if (!existsSync(walletsConfigPath)) {
    return {};
  }
  const content = readFileSync(walletsConfigPath, 'utf-8');
  try {
    return JSON.parse(content);
  } catch (e) {
    return {};
  }
}

function saveWalletsConfig(wallets) {
  writeFileSync(walletsConfigPath, JSON.stringify(wallets, null, 2), 'utf-8');
}

export function getWalletKeypair(walletName) {
  const wallets = loadWalletsConfig();
  if (!wallets[walletName]) {
    throw new Error(`Wallet ${walletName} not found in wallets_config.json.`);
  }
  const secretKeyBase58 = wallets[walletName].privateKeyBase58;
  const secretKey = bs58.decode(secretKeyBase58);
  return Keypair.fromSecretKey(secretKey);
}

// Функция создания основного кошелька (например dev, funder_dev, funder_additional)
export function createNewMainWallet() {
  const wallets = loadWalletsConfig();

  // Создание нового ключа
  const newKeypair = Keypair.generate();
  const base58Key = bs58.encode(newKeypair.secretKey);
  const walletName = `dev-${Date.now()}`; // Уникальное имя для нового кошелька

  // Добавляем новый кошелёк с уникальным именем
  wallets[walletName] = {
    privateKeyBase58: base58Key,
    publicKey: newKeypair.publicKey.toBase58()
  };

  // Обновляем ссылку на последний dev-кошелёк
  wallets['dev'] = wallets[walletName];

  // Сохраняем обновлённый список кошельков
  saveWalletsConfig(wallets);

  console.log(`Created new main wallet "${walletName}": ${newKeypair.publicKey.toBase58()}`);
  console.log(`Updated "dev" to point to the latest wallet: ${walletName}`);
  return wallets['dev'];
}


// Создание нескольких кошельков (additional или mini)
export function createMultipleWallets(filePath, prefix, count) {
  const existing = loadWalletFile(filePath);

  // Найти максимальный номер среди существующих кошельков
  const maxNumber = existing
    .filter(wallet => wallet.name.startsWith(prefix)) // Фильтруем кошельки с нужным префиксом
    .map(wallet => parseInt(wallet.name.replace(prefix, ''), 10)) // Извлекаем номера
    .filter(num => !isNaN(num)) // Убираем некорректные значения
    .reduce((max, num) => Math.max(max, num), 0); // Находим максимум

  // Генерируем новые кошельки с последовательными номерами
  for (let i = 1; i <= count; i++) {
    const nextNumber = maxNumber + i;
    const walletName = `${prefix}${nextNumber}`;
    const newKeypair = Keypair.generate();
    const base58Key = bs58.encode(newKeypair.secretKey);

    existing.push({
      name: walletName,
      privateKeyBase58: base58Key,
      publicKey: newKeypair.publicKey.toBase58()
    });
  }

  saveWalletFile(filePath, existing);
  console.log(`Created ${count} wallets with prefix "${prefix}" in ${filePath}`);
}


// Пополнение одного кошелька из указанных основных кошельков (funder_dev или funder_additional)
async function fundSingleWallet(funderKeypair, targetPublicKeyString, amountSol) {
  const lamports = amountSol * 1_000_000_000;
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: funderKeypair.publicKey,
      toPubkey: targetPublicKeyString,
      lamports
    })
  );
  const signature = await web3Connection.sendTransaction(transaction, [funderKeypair]);
  await web3Connection.confirmTransaction(signature, 'confirmed');
  return signature;
}

// Пополнение одного основного кошелька (dev) из funder_dev
export async function fundDevWallet(amountSol) {
  const mainWallets = loadWalletsConfig();
  if (!mainWallets['dev']) {
    throw new Error(`Dev wallet not found in configuration.`);
  }
  if (!mainWallets['funder_dev']) {
    throw new Error(`Funder_dev wallet not found in configuration.`);
  }
  const funderKeypair = getWalletKeypair('funder_dev');
  const devPublicKey = mainWallets['dev'].publicKey;
  
  const sig = await fundSingleWallet(funderKeypair, devPublicKey, amountSol);
  console.log(`Funded dev wallet with ${amountSol} SOL from funder_dev. Tx: ${sig}`);
}

// Пополнение нескольких additional или mini кошельков из funder_additional
export async function fundMultipleWallets(filePath, amountsObject) {
  const wallets = loadWalletFile(filePath);
  const mainWallets = loadWalletsConfig();
  if (!mainWallets['funder_additional']) {
    throw new Error(`Funder_additional wallet not found in configuration.`);
  }
  const funderKeypair = getWalletKeypair('funder_additional');

  for (const w of wallets) {
    const amount = amountsObject[w.name];
    if (!amount) continue; 
    const sig = await fundSingleWallet(funderKeypair, w.publicKey, amount);
    console.log(`Funded wallet ${w.name} with ${amount} SOL from funder_additional. Tx: ${sig}`);
  }
}

// Возвращает последние N кошельков из указанного файла
export function getLastGeneratedWallets(filePath, count) {
  const allWallets = loadWalletFile(filePath);
  if (count > allWallets.length) {
    console.warn(`Requested ${count} wallets, but only ${allWallets.length} exist.`);
    return allWallets;
  }
  return allWallets.slice(-count); // Берём последние N кошельков
}

