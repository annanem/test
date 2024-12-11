// src/trading/priceMonitor.js
import WebSocket from 'ws';

export class PriceMonitor {
  constructor(tokenAddress) {
    this.tokenAddress = tokenAddress;
    this.ws = null;
  }

  startMonitoring(onPriceUpdate) {
    const url = `wss://pumpportal.fun/data-api/real-time?token=${this.tokenAddress}`;
    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      console.log('PriceMonitor: Connected to real-time price feed');
    });

    this.ws.on('message', (data) => {
      const msg = JSON.parse(data);
      onPriceUpdate(msg);
    });

    this.ws.on('error', (err) => {
      console.error('PriceMonitor: WebSocket error', err);
    });

    this.ws.on('close', () => {
      console.log('PriceMonitor: Connection closed, restarting...');
      // Минимизируем задержку для быстрых реконнектов
      setTimeout(() => this.startMonitoring(onPriceUpdate), 1000);
    });
  }

  stopMonitoring() {
    if (this.ws) this.ws.close();
  }
}
