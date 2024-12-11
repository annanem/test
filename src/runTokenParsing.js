// src/tokens/runTokenParsing.js
import { parseTokensByMarketCap } from './tokenParser.js';

async function main() {
  const tokens = await parseTokensByMarketCap(50000, 100000);
  console.log("Tokens found:", tokens);
}

main();
