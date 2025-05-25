const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '25mb' }));

app.post('/return-individuals', async (req, res) => {
  try {
    const apiKey = process.env.AQUAMARK_API_KEY;
    const batchPayload = req.body;

    if (!apiKey || !Array.isArray(batchPayload) || batchPayload.length === 0) {
      return res.status(400).json({ error: 'Missing API key or invalid payload.' });
    }

    // Forward batch to decrypt server
    const decryptRes = await axios.post(
      'https://aquamark-decrypt.onrender.com/batch-watermark',
      batchPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        timeout: 60000
      }
    );

    const results = decryptRes.data;

    if (!Array.isArray(results) || results.length === 0) {
      return res.status(502).json({ error: 'Decrypt server returned no results.' });
    }

    // Respond with processed list of { filename, base64 }
    res.status(200).json(results);
  } catch (err) {
    console.error('❌ Proxy batch error:', err.message);
    res.status(500).json({ error: 'Proxy failed: ' + err.message });
  }
});

app.get('/', (req, res) => {
  res.send('Aquamark Salesforce proxy is running.');
});

app.listen(PORT, () => {
  console.log(`✅ Salesforce proxy running on port ${PORT}`);
});
