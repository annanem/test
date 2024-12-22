**ПОДГОТОВКА**
node src/runcreatedevwallet.js создание дев-кошельков, рабочий код
node src/runcreateadditionalwallets.js рабочий
node src/runcreateminiwallets.js рабочий

node src/runFundDevWallet.js
node src/wallets/fundadditionalwallets.js рабочий (но проверить рандом суммы пополнения)
node src/runFundminiwallets.js

**МОНИТОРИНГ**
node src/runtokenmonitoring.js мониторит состояние токена, рабочий 
node  src/runtokenfetcher.js парсинг токенов, рабочий, но есть вопросы (и еще нудно ли вынести настройки фильтрации в сеттингс??)

**ЗАПУСК**
node src/runTokenCreation.js
node src/runadditionalbuy.js рабочий
node src/runMiniBuy.js
node src/runadditionalsell.js рабочий... подумать как добавить инфу про продажи, например, просто сохранять проданный % и учитывать его в мониторе

добавить бандлы в покупки и продажи

*генерация адресов с pump, bump*

node src/postcomment.js не рабочий
