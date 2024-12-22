// src/trading/runAdditionalSell.js
import { sellWithAdditionalWallets } from './trading/tradingActions.js';

async function main() {
  // Продаем все токены ("100%") с каждого additional кошелька.
  // denominatedInSol=false, значит указываем процент от токенов.
  await sellWithAdditionalWallets({
    amount: "100%",
    denominatedInSol: false,
    slippage: 10,
    priorityFee: 0.00001,
    pool: "pump"
  });
}

main();
