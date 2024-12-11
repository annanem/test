// src/trading/runTokenMonitoring.js
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PriceMonitor } from './priceMonitor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tokenListPath = path.resolve(__dirname, '../data/token_list.json');

function getLatestTokenMint() {
  const content = readFileSync(tokenListPath, 'utf-8');
  const tokenList = JSON.parse(content);
  if (tokenList.length === 0) {
    throw new Error("No tokens found in token_list.json");
  }
  return tokenList[tokenList.length - 1].mint;
}

async function main() {
  const currentMint = getLatestTokenMint();
  console.log("Starting to monitor token:", currentMint);

  const monitor = new PriceMonitor(currentMint);
  monitor.startMonitoring((data) => {
    // data: {price, marketCap, holders, ...}
    console.log(`Price: ${data.price}, MarketCap: ${data.marketCap}, Holders: ${data.holders}`);
    // Здесь можно добавить логику принятия решения о продаже.
  });
}

main();
