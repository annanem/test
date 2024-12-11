// src/fundAdditionalWallets.js
import path from 'path';
import { fileURLToPath } from 'url';
import { fundMultipleWallets } from './wallets/walletManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const additionalWalletsPath = path.resolve(__dirname, './config/wallets_additional.json');

async function main() {
  // Пополняем additional кошельки разными суммами из funder_additional
  const amounts = {
    "additional1": 1.0,
    "additional2": 0.5,
    "additional3": 0.5,
    "additional4": 0.5,
    "additional5": 0.3
    // и так далее
  };
  await fundMultipleWallets(additionalWalletsPath, amounts);
}

main();
