// src/createAdditionalWallets.js
import path from 'path';
import { fileURLToPath } from 'url';
import { createMultipleWallets } from './wallets/walletManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const additionalWalletsPath = path.resolve(__dirname, './config/wallets_additional.json');

async function main() {
  // Создадим 5 дополнительных кошельков
  createMultipleWallets(additionalWalletsPath, 'additional', 5);
}

main();
