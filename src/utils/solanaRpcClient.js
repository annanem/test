import { Connection } from '@solana/web3.js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем настройки из env.json
const envPath = path.resolve(__dirname, '../config/env.json');
let rpcUrl;
try {
  const env = JSON.parse(readFileSync(envPath, 'utf-8'));
  rpcUrl = env.SOLANA_RPC_URL; // Используем SOLANA_RPC_URL вместо RPC_ENDPOINT
} catch (e) {
  throw new Error(`Error loading env.json: ${e.message}`);
}

// Проверяем, что RPC-URL корректен
if (!rpcUrl || !rpcUrl.startsWith('http')) {
  throw new Error('Invalid or missing SOLANA_RPC_URL in env.json. Ensure it is a valid HTTP/HTTPS URL.');
}

// Экспорт соединения
export const web3Connection = new Connection(rpcUrl, 'confirmed');
