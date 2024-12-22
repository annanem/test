import path from 'path';
import { fundMultipleWallets } from './walletManager.js';
import { readFileSync } from 'fs';

const additionalWalletsPath = path.resolve('src/config/wallets_additional.json');
const settingsPath = path.resolve('src/config/settings.json');

function loadSettings() {
  const content = readFileSync(settingsPath, 'utf-8');
  return JSON.parse(content);
}

async function main() {
  const settings = loadSettings();
  const { minAmountSol, maxAmountSol } = settings.funder.additional;

  // Создаём объект с суммами пополнения
  const amounts = {};
  const wallets = JSON.parse(readFileSync(additionalWalletsPath, 'utf-8'));

  wallets.forEach(w => {
    const randomAmount = (Math.random() * (maxAmountSol - minAmountSol) + minAmountSol).toFixed(2);
    amounts[w.name] = parseFloat(randomAmount);
  });

  console.log('Starting to fund Additional wallets...');
  await fundMultipleWallets(additionalWalletsPath, amounts);
  console.log('Funding completed.');
}

main();
