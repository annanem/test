// src/trading/tradingApi.js
import { pumpApiRequest } from '../utils/pumpApiClient.js';

export async function buyToken(tokenAddress, amount, price, buyerWallet) {
  const payload = { tokenAddress, amount, price, wallet: buyerWallet };
  const response = await pumpApiRequest('/local-trading-api/trading-api/buy', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  return response;
}

export async function sellToken(tokenAddress, amount, price, sellerWallet) {
  const payload = { tokenAddress, amount, price, wallet: sellerWallet };
  const response = await pumpApiRequest('/local-trading-api/trading-api/sell', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  return response;
}
