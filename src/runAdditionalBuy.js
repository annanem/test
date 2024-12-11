// src/trading/runAdditionalBuy.js
import { buyWithAdditionalWallets } from './tradingActions.js';

async function main() {
  // Каждый дополнительный кошелёк купит случайное количество токенов от 500000 до 1000000
  await buyWithAdditionalWallets({
    denominatedInSol: false,
    slippage: 10,
    priorityFee: 0.00001,
    pool: "pump",
    minAmount: 500000,
    maxAmount: 1000000
  });
}

main();
