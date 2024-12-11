// src/utils/pumpApiClient.js
import fetch from 'node-fetch';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Получим директорию текущего файла
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../config/env.json');
const env = JSON.parse(readFileSync(envPath, 'utf-8'));

const BASE_URL = env.PUMP_API_BASE_URL || 'https://pumpportal.fun';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Выполняет запрос с ретраями в случае ошибок.
 * @param {string} endpoint - конечная точка ("/api/..." и т.д.)
 * @param {object} options - опции запроса (method, headers, body)
 * @param {number} retries - количество попыток
 * @param {number} retryDelay - начальная задержка перед повторной попыткой (мс)
 */
export async function pumpApiRequest(endpoint, options = {}, retries = 3, retryDelay = 1000) {
  const url = `${BASE_URL}${endpoint}`;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      };

      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Pump API request failed: ${response.status} ${text}`);
      }

      if (options.responseType === 'arrayBuffer') {
        return response.arrayBuffer();
      }

      return response.json();
    } catch (error) {
      console.error(`pumpApiRequest error (attempt ${attempt}): ${error.message}`);
      if (attempt < retries) {
        const delay = retryDelay * Math.pow(2, attempt - 1); // экспоненциальный рост задержки
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
      } else {
        throw new Error(`Failed after ${attempt} attempts: ${error.message}`);
      }
    }
  }
}
