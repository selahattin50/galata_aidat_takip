
import https from 'node:https';

const apiKey = "AIzaSyD8Idy6IyeRqGjWIFInUaDhSdh7ZYjfpg0";

const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;

const req = https.request(url, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
}, (res) => {
    let chunks = '';
    res.on('data', chunk => chunks += chunk);
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        if (res.statusCode === 200) {
            console.log('API Key seems VALID (got 200 OK or similar success)');
        } else {
            console.log('API Key INVALID or ERROR:', chunks);
        }
    });
});

req.on('error', (e) => {
    console.error(e);
});

// Minimal body to trigger sign
req.write(JSON.stringify({ returnSecureToken: true }));
req.end();
