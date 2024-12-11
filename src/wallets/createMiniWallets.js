// src/createMiniWallets.js
import path from 'path';
import { fileURLToPath } from 'url';
import { createMultipleWallets } from './wallets/walletManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const miniWalletsPath = path.resolve(__dirname, './config/wallets_mini.json');

async function main() {
  // Создадим 10 мини-кошельков
  createMultipleWallets(miniWalletsPath, 'mini', 10);
}

main();
