// src/tokens/tokenParser.js
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { createWriteStream } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Путь к settings.json
const settingsPath = path.resolve(__dirname, '../config/settings.json');
const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));

// Параметры берем из settings
const { minMarketCap, maxMarketCap } = settings;

const parsedTokensPath = path.resolve(__dirname, '../data/parsed_tokens.json');
const imagesDir = path.resolve(__dirname, '../data/images');

// Предполагаемый эндпоинт получения списка токенов
const TOKENS_ENDPOINT = "https://pumpportal.fun/api/tokens";

async function fetchTokens() {
  const response = await fetch(TOKENS_ENDPOINT);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch tokens: ${response.status} ${text}`);
  }
  const data = await response.json();
  return data;
}

function filterTokens(tokens, minMC, maxMC) {
  return tokens.filter(t => t.marketCap >= minMC && t.marketCap <= maxMC);
}

async function downloadImage(url, filePath) {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to download image: ${resp.status} ${await resp.text()}`);
  }
  const fileStream = createWriteStream(filePath);
  return new Promise((resolve, reject) => {
    resp.body.pipe(fileStream);
    resp.body.on("error", reject);
    fileStream.on("finish", resolve);
  });
}

export async function parseTokensByMarketCap() {
  const tokens = await fetchTokens();
  const filtered = filterTokens(tokens, minMarketCap, maxMarketCap);

  let result = [];
  for (const token of filtered) {
    const mint = token.mint;
    const imageUrl = token.imageUrl;
    const ext = path.extname(new URL(imageUrl).pathname) || '.png'; 
    const imageFileName = `${mint}${ext}`;
    const imageFilePath = path.join(imagesDir, imageFileName);

    try {
      await downloadImage(imageUrl, imageFilePath);
    } catch (e) {
      console.error(`Failed to download image for ${mint}:`, e);
    }

    result.push({
      mint: mint,
      name: token.name,
      symbol: token.symbol,
      description: token.description,
      originalImageUrl: imageUrl,
      localImageFile: imageFileName,
      marketCap: token.marketCap
    });
  }

  let existing = [];
  if (existsSync(parsedTokensPath)) {
    const content = readFileSync(parsedTokensPath, 'utf-8');
    try {
      existing = JSON.parse(content);
    } catch (e) {
      existing = [];
    }
  }

  // Перезапишем файл новыми данными
  writeFileSync(parsedTokensPath, JSON.stringify(result, null, 2), 'utf-8');

  console.log(`Found ${result.length} tokens in range ${minMarketCap} - ${maxMarketCap} and saved to parsed_tokens.json`);
  return result;
}
