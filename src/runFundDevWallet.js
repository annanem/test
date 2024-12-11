// src/runFundDevWallet.js 
import { fundDevWallet } from './wallets/walletManager.js';

async function main() {
  await fundDevWallet(1.0); // Пополнить dev на 1 SOL из funder_dev, если надо 0.5 SOL, так и пишем 0.5
}

main();
