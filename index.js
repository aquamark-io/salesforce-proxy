const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '25mb' }));

app.post('/return-individuals', async (req, res) => {
  const apiKey = process.env.AQUAMARK_API_KEY;
  const payload = req.body;

  if (!apiKey || !Array.isArray(payload) || payload.length === 0) {
    return res.status(400).json({ error: 'Missing API key or invalid payload.' });
  }

  const results = [];

  for (const fileData of payload) {
    try {
      const response = await axios.post(
        'https://aquamark-decrypt.onrender.com/watermark',
        new URLSearchParams({
          user_email: fileData.user_email,
          lender: fileData.lender
        }),
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          responseType: 'arraybuffer',
          data: {
            file: fileData.file // base64-encoded
          }
        }
      );

      const base64File = Buffer.from(response.data).toString('base64');

      results.push({
        base64: base64File,
        filename: fileData.filename || 'Aquamark.pdf'
      });

    } catch (err) {
      console.error('❌ Failed to process one file:', fileData.filename, err.message);
    }
  }

  res.status(200).json(results);
});

app.listen(PORT, () => {
  console.log(`✅ Salesforce proxy (individual watermark) running on port ${PORT}`);
});
