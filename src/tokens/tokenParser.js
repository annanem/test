// src/tokens/tokenParser.js
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Параметры фильтра
const MIN_MARKET_CAP = 50000;
const MAX_MARKET_CAP = 100000;

// Предположим, что есть такой эндпоинт, который возвращает список токенов с их параметрами.
// Нужно уточнить у pumpportal.fun или в их API, какой именно эндпоинт.
// Допустим, что есть "/api/tokens" или что-то подобное. 
// Ниже — примерный вариант. Вам нужно будет адаптировать под реальный эндпоинт pumpportal.fun.

const TOKENS_ENDPOINT = "https://pumpportal.fun/api/tokens";

async function fetchTokens() {
  const response = await fetch(TOKENS_ENDPOINT);
  if (!response.ok) {
    throw new Error(`Failed to fetch tokens: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  return data; // Предположим, data — массив объектов { mint, name, symbol, description, imageUrl, marketCap, ... }
}

export async function parseTokensByMarketCap(minCap = MIN_MARKET_CAP, maxCap = MAX_MARKET_CAP) {
  const tokens = await fetchTokens();

  // Фильтруем по маркеткапу
  const filtered = tokens.filter(t => t.marketCap >= minCap && t.marketCap <= maxCap);

  // Генерируем ссылку на график
  // Формат ссылки: https://dexrabbit.com/solana/pumpfun/<MINT>
  const result = filtered.map(t => {
    return {
      name: t.name,
      symbol: t.symbol,
      description: t.description,
      imageUrl: t.imageUrl,
      chartLink: `https://dexrabbit.com/solana/pumpfun/${t.mint}`, 
      mint: t.mint,
      marketCap: t.marketCap
    };
  });

  // Сохраняем результат в файл parsed_tokens.json
  const parsedTokensPath = path.resolve(__dirname, '../data/parsed_tokens.json');
  writeFileSync(parsedTokensPath, JSON.stringify(result, null, 2), 'utf-8');

  console.log(`Found ${result.length} tokens in range ${minCap} - ${maxCap} and saved to parsed_tokens.json`);
  return result;
}
