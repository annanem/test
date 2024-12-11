// src/runCreateDevWallet.js
import { createNewWallet } from './wallets/walletManager.js';

async function main() {
  try {
    createNewWallet('dev');
  } catch (e) {
    console.error('Error creating dev wallet:', e);
  }
}

main();
