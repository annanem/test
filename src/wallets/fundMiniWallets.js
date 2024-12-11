// src/fundMiniWallets.js
import path from 'path';
import { fileURLToPath } from 'url';
import { fundMultipleWallets } from './wallets/walletManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const miniWalletsPath = path.resolve(__dirname, './config/wallets_mini.json');

async function main() {
  // Пополняем mini кошельки, например mini1..mini10, по 0.01 SOL каждую
  const amounts = {};
  for (let i = 1; i <= 10; i++) {
    amounts[`mini${i}`] = 0.01;
  }

  await fundMultipleWallets(miniWalletsPath, amounts);
}

main();
