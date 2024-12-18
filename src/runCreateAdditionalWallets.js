// src/runCreateAdditionalWallets.js
import { createMultipleWallets, getLastGeneratedWallets } from './wallets/walletManager.js';
import { readFileSync } from 'fs';
import path from 'path';

// Пути к файлам
const additionalWalletsPath = './src/config/wallets_additional.json';
const settingsPath = './src/config/settings.json';

// Загружаем настройки
const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
const countToGenerate = settings.additionalWalletsToUse; // Читаем количество из файла настроек

// Генерация новых Additional кошельков
const generateAdditionalWallets = () => {
  createMultipleWallets(additionalWalletsPath, 'additional', countToGenerate);

  // Получаем последние сгенерированные кошельки
  const latestWallets = getLastGeneratedWallets(additionalWalletsPath, countToGenerate);
  console.log(`Using the last ${countToGenerate} wallets:`);
  console.log(latestWallets);
};

// Вызываем функцию
generateAdditionalWallets();

