import fs from 'fs';
import path from 'path';
import { makeRequest } from '../utils/apiClient.js';

// Путь для сохранения результатов
const outputPath = path.resolve('data/marketcapTokens.json');

// URL-адрес API Pump.fun
const BASE_URL = 'https://gmgn.ai/defi/quotation/v1/rank/sol/pump';

// Функция для запроса токенов по маркеткапу
export async function fetchTokensByMarketCap(limit = 10) {
  const url = `${BASE_URL}?limit=${limit}&orderby=marketcap&direction=desc&pump=true`;
  console.log(`Fetching tokens from: ${url}`);

  const data = await makeRequest(url);
  if (data) {
    // Сохранение данных в файл
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Successfully saved ${data.length} tokens to marketcapTokens.json`);
  } else {
    console.error('Failed to fetch token data.');
  }
}
