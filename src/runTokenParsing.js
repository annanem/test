// src/runTokenParsing.js
import { parseTokensByMarketCap } from './tokens/tokenParser.js';

async function main() {
  try {
    const result = await parseTokensByMarketCap();
    console.log("Parsing completed. Result:", result);
  } catch (e) {
    console.error("Error parsing tokens:", e);
  }
}

main();
