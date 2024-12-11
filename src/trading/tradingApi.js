// src/tokens/jitoBundleHandler.js
import { pumpApiRequest } from '../utils/pumpApiClient.js';

export async function buyTokenInJitoBundle(tokenAddress, amount, price, buyerWallet) {
  const payload = {
    tokenAddress,
    amount,
    price,
    wallet: buyerWallet // адрес или публичный ключ покупателя
  };

  // Предположим: POST /local-trading-api/jito-bundles/buy
  const response = await pumpApiRequest('/local-trading-api/jito-bundles/buy', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  return response;  
}
