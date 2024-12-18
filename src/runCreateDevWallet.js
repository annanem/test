// src/runCreateDevWallet.js
import { createNewMainWallet } from './wallets/walletManager.js';

async function main() {
  try {
    createNewMainWallet('dev');
  } catch (e) {
    console.error('Error creating dev wallet:', e);
  }
}

main();
