// src/trading/runMiniBuy.js
import { buyWithMiniWallets } from './tradingActions.js';

async function main() {
  // Покупаем за 0.01 SOL каждый мини-кошелёк с задержкой в 2000 мс (2 секунды) между транзакциями
  await buyWithMiniWallets({
    amountSol: 0.01,
    slippage: 10,
    priorityFee: 0.00001,
    pool: "pump",
    delayMs: 2000
  });
}

main();
