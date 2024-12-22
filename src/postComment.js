import axios from 'axios';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

// Test wallet keys
const TEST_WALLET = {
  publicKey: 'GYXmrPRtY7QbhswX5dQtZXNB4hq7T6JTcJiJrLNotDtc',
  privateKeyBase58: '3zFeTxgudfpEnKZkAetm19Q76PbzebGqvgyECCqRWbv4ahoxDqBoWQWf1FmJcGmSYT8dwHB3WMpChexsvY4Y2yLt'
};

// Authentication process
async function authenticateWallet() {
  const { publicKey, privateKeyBase58 } = TEST_WALLET;

  try {
    console.log('Starting the authentication process...');
    const timestamp = Math.floor(Date.now() / 1000).toString(); // Use Unix timestamp
    const message = `Sign in to pump.fun: ${timestamp}`;
    console.log('Message to sign:', message);

    // Sign the message
    const secretKey = bs58.decode(privateKeyBase58);
    const signature = bs58.encode(nacl.sign.detached(new TextEncoder().encode(message), secretKey));
    console.log('Generated signature:', signature);

    const authUrl = 'https://frontend-api-v2.pump.fun/users/auth'; // Confirm endpoint
    const payload = {
      address: publicKey,
      signature,
      timestamp
    };

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };

    console.log('Request URL:', authUrl);
    console.log('Request Payload:', payload);
    console.log('Request Headers:', headers);

    // Send the authentication request
    const response = await axios.post(authUrl, payload, { headers });
    console.log('Authentication successful:', response.data);

    return response.data; // Token or response data
  } catch (error) {
    console.error('Error during authentication:', error.response?.data || error.message);
    throw error;
  }
}

(async () => {
  try {
    const authResponse = await authenticateWallet();
    console.log('Authentication response:', authResponse);

    // Continue with further actions after successful authentication
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
