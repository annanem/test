// src/trading/runAdditionalBuy.js
import { buyWithAdditionalWallets } from './trading/tradingActions.js';
import { readFileSync } from 'fs';
import path from 'path';

const settingsPath = path.resolve('./src/config/settings.json');

// Load settings
const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
const { purchaseAmountMin, purchaseAmountMax } = settings;

async function main() {
  try {
    console.log('Starting purchases with additional wallets...');
    await buyWithAdditionalWallets({
      minAmount: purchaseAmountMin,
      maxAmount: purchaseAmountMax
    });
    console.log('Purchases completed.');
  } catch (err) {
    console.error('Error during additional wallet purchases:', err.message);
  }
}

main();
