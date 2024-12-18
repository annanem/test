// src/utils/gmgnApiClient.js
import fetch from 'node-fetch';

/**
 * Выполняет запрос к GMGN API с эмуляцией браузера.
 * @param {string} endpoint - Конечная точка API.
 */
export async function gmgnApiRequest(endpoint) {
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://gmgn.ai/',
        'Origin': 'https://gmgn.ai/',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`GMGN API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } cat