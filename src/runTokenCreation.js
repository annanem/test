// src/    .js
import { createToken } from './tokens/tokenCreator.js';

async function main() {
  try {
    const result = await createToken();
    console.log('Token creation result:', result);
  } catch (e) {
    console.error('Error creating token:', e);
  }
}

main();
