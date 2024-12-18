// src/trading/priceMonitor.js
import WebSocket from 'ws';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Получаем текущую директорию для ES модулей
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Пути к файлу с покупками
const purchasesFilePath = path.resolve(__dirname, '../data/purchases.json');

// Функция для получения цены SOL/USD
async function getSolPriceUSD() {
  try {
    const response = await fetch('https://frontend-api.pump.fun/sol-price');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.solPrice) {
      return data.solPrice; // Возвращаем цену SOL
    } else {
      console.error('Unexpected API response structure:', data);
      return null;
    }
  } catch (error) {
    console.error('Error fetching SOL price:', error.message);
    return null;
  }
}

// Функция для расчета прибыли/убытка
function calculateProfitLoss(tokenAddress, currentPriceSol) {
  if (!fs.existsSync(purchasesFilePath)) return { totalInvested: 0, profit: 0, profitPercentage: 'N/A' };

  const purchases = JSON.parse(fs.readFileSync(purchasesFilePath, 'utf-8'));
  const tokenPurchases = purchases.filter(p => p.tokenAddress === tokenAddress);

  let totalInvested = 0;
  let totalTokensBought = 0;

  for (const purchase of tokenPurchases) {
    totalTokensBought += purchase.amount;
    totalInvested += purchase.amount * purchase.pricePerTokenSol;
  }

  const currentValue = totalTokensBought * currentPriceSol;
  const profit = currentValue - totalInvested;

  // Проверка, чтобы не было деления на 0
  const profitPercentage = totalInvested > 0 ? ((profit / totalInvested) * 100).toFixed(2) : '0.00';

  return { totalInvested, profit, profitPercentage };
}


export class PriceMonitor {
  constructor(tokenAddress) {
    this.tokenAddress = tokenAddress;
    this.ws = null;
  }

  startMonitoring(onPriceUpdate) {
    const url = `wss://pumpportal.fun/data-api/real-time?token=${this.tokenAddress}`;
    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      console.log('PriceMonitor: Connected to real-time price feed');
      const subscriptionMessage = JSON.stringify({
        method: 'subscribeTokenTrade',
        keys: [this.tokenAddress]
      });
      this.ws.send(subscriptionMessage);
    });

    this.ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data);

        if (
          typeof msg.marketCapSol !== 'undefined' &&
          typeof msg.vTokensInBondingCurve !== 'undefined' &&
          typeof msg.vSolInBondingCurve !== 'undefined'
        ) {
          const TOTAL_SUPPLY = 1_000_000_000;

          const priceSol = (msg.marketCapSol / TOTAL_SUPPLY).toFixed(9);
          const marketCapSol = msg.marketCapSol.toFixed(3);

          const solPriceUSD = await getSolPriceUSD();
          const priceUSD = solPriceUSD ? (priceSol * solPriceUSD).toFixed(6) : 'N/A';
          const marketCapUSD = solPriceUSD ? (msg.marketCapSol * solPriceUSD).toFixed(2) : 'N/A';

          const transactionAmountSOL = msg.tokenAmount ? (msg.tokenAmount * priceSol).toFixed(3) : 'N/A';

// Вычисляем данные о прибыли/убытке
const profitData = calculateProfitLoss(this.tokenAddress, priceSol);

// Добавляем 0.2 SOL к общим затратам вручную
const totalInvestedWithCreation = profitData.totalInvested + 0.05;
const adjustedProfit = profitData.profit - 0.05;
const profitPercentage = ((adjustedProfit / totalInvestedWithCreation) * 100).toFixed(2);

// Вывод данных в таблицу
console.table({
  'Transaction Type': msg.txType === 'buy' ? '🟩 buy' : '🟥 sell',
  'Amount (SOL)': transactionAmountSOL,
  'Price (SOL)': priceSol,
  'Price (USD)': priceUSD,
  'Market Cap (SOL)': marketCapSol,
  'Market Cap (USD)': marketCapUSD,
  'Profit/Loss (SOL)': adjustedProfit.toFixed(6),
  'Profit/Loss (%)': profitPercentage
});

const statusEmoji =
  adjustedProfit < 0 ? '🔴🔴🔴 продажа будет в минус' :
  adjustedProfit == 0 ? '🟠🟠🟠 продажа приблизительно в 0' :
  '🟢🟢🟢 профитная продажа';

console.log(statusEmoji, `(Profit/Loss: ${adjustedProfit.toFixed(6)} SOL | ${profitPercentage}%)`);

        } else {
          console.log('Data does not contain required market updates.');
        }
      } catch (err) {
        console.error('Error parsing message:', err.message);
      }
    });

    this.ws.on('error', (err) => {
      console.error('PriceMonitor: WebSocket error', err);
    });

    this.ws.on('close', () => {
      console.log('PriceMonitor: Connection closed, restarting...');
      setTimeout(() => this.startMonitoring(onPriceUpdate), 1000);
    });
  }

  stopMonitoring() {
    if (this.ws) this.ws.close();
  }
}
