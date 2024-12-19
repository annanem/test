import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// Генерация нового файла с датой и временем
const now = new Date();
const dateString = now.toISOString().split('T')[0]; // Дата в формате YYYY-MM-DD
const timeString = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // Время в формате HH-MM-SS
const tokensFilePath = path.resolve(`src/data/parsed/gmgn_tokens_${dateString}_${timeString}.json`);
const processedTokensFilePath = path.resolve(`src/data/parsed/processed_gmgn_tokens_${dateString}_${timeString}.json`);

async function fetchTokens() {
  const browser = await puppeteer.launch({ headless: false }); // Открытый браузер для диагностики
  const page = await browser.newPage();

  try {
    const targetUrl = 'https://gmgn.ai/defi/quotation/v1/rank/sol/pump?limit=350&orderby=usd_market_cap&direction=desc&pump=true';

    console.log('Navigating to GMGN API page...');
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });

    // Дожидаемся появления текстового содержимого (проверяем наличие <pre> с JSON-ответом)
    console.log('Waiting for JSON content...');
    const preSelector = 'pre';
    await page.waitForSelector(preSelector, { timeout: 10000 });

    const content = await page.evaluate(() => {
      const preElement = document.querySelector('pre');
      return preElement ? preElement.innerText : null;
    });

    if (!content) {
      throw new Error('Failed to find JSON content on the page.');
    }

    // Парсим содержимое как JSON
    let jsonData;
    try {
      jsonData = JSON.parse(content);
    } catch (err) {
      throw new Error('Failed to parse JSON content.');
    }

    console.log('Tokens fetched successfully! Saving to file...');
    // Сохраняем JSON в файл
    fs.writeFileSync(tokensFilePath, JSON.stringify(jsonData, null, 2), 'utf-8');
    console.log(`Tokens saved to ${tokensFilePath}`);

    // Теперь фильтруем токены по нужным критериям
    const processedTokens = jsonData.data.rank.filter(token => {
      // Пример фильтрации: фильтруем по объемам и рыночной капитализации
      return (
        parseFloat(token.usd_market_cap) > 10000 &&
        parseFloat(token.volume_24h) > 1000
      );
    }).map(token => ({
      name: token.name,
      symbol: token.symbol,
      description: null,
      image_path: token.logo,
      twitter: token.twitter || 'N/A',
      telegram: token.telegram || 'N/A',
      website: token.website || 'N/A',
      showName: true,
      holder_count: token.holder_count || 'N/A',
      usd_market_cap: token.usd_market_cap || 'N/A',
      volume_24h: token.volume_24h || 'N/A',
      swaps_24h: token.swaps_24h || 'N/A',
      token_link: `https://pump.fun/coin/${token.address}` // Генерируем ссылку на токен
    }));

    // Сохраняем отфильтрованные и преобразованные данные в новый файл
    fs.writeFileSync(processedTokensFilePath, JSON.stringify(processedTokens, null, 2), 'utf-8');
    console.log(`Processed tokens saved to ${processedTokensFilePath}`);

  } catch (error) {
    console.error('Error fetching tokens with Puppeteer:', error.message);
  } finally {
    await browser.close();
  }
}

fetchTokens().catch(error => console.error('Unhandled error:', error.message));
