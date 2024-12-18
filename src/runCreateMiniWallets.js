// runGenerateMiniWallets.js
import { createMultipleWallets, getLastGeneratedWallets } from './wallets/walletManager.js';
import { readFileSync } from 'fs';
import path from 'path';

// Пути к файлам
const miniWalletsPath = './src/config/wallets_mini.json';
const settingsPath = './src/config/settings.json';

// Загружаем настройки
const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
const countToGenerate = settings.miniWalletsToUse; // Читаем количество из файла настроек

// Генерация новых Mini кошельков
const generateMiniWallets = () => {
  createMultipleWallets(miniWalletsPath, 'mini', countToGenerate);

  // Получаем последние сгенерированные кошельки
  const latestWallets = getLastGeneratedWallets(miniWalletsPath, countToGenerate);
  console.log(`Using the last ${countToGenerate} wallets:`);
  console.log(latestWallets);
};

// Вызываем функцию
generateMiniWallets();

