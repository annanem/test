// src/runtokenfetcher.js
import { gmgnApiRequest } from './utils/gmgnApiClient.js';
import fs from 'fs';
import path from 'path';

const outputFilePath = path.resolve('./data/gmgn_tokens.json');

async function fetchTokens() {
  try {
    const endpoint = 'https://gmgn.ai/defi/quotation/v1/rank/sol/pump?limit=50&orderby=progress&direction=desc&pump=true';
    const data = await gmgnApiRequest(endpoint);

    // Фильтруем данные, если нужно
    const tokens = data.list.filter(token => token.marketCap > 1000000);

    // Сохраняем токены в файл
    fs.writeFileSync(outputFilePath, JSON.stringify(tokens, null, 2));
    console.log(`Fetched and saved ${tokens.length} tokens to ${outputFilePath}`);
  } catch (error) {
    console.error('Ошибка при запросе токенов:', error.message);
  }
}

fetchTokens();
