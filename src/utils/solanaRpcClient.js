// src/utils/solanaRpcClient.js
import { Connection } from '@solana/web3.js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../config/env.json');
const env = JSON.parse(readFileSync(envPath, 'utf-8'));

const rpcUrl = env.RPC_ENDPOINT;

export const web3Connection = new Connection(rpcUrl, 'confirmed');
