const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT || 3000;

app.post('/watermark', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const lender = req.body.lender;
    const user_email = req.body.user_email;
    const filename = req.body.filename;

    if (!file || !lender || !user_email || !filename) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Prepare payload for decrypt server
    const payload = [
      {
        user_email,
        lender,
        file: file.buffer.toString('base64'),
        filename
      }
    ];

    const decryptResponse = await axios.post(
      'https://aquamark-decrypt.onrender.com/batch-watermark',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.AQUAMARK_API_KEY}`
        },
        timeout: 30000
      }
    );

    const result = decryptResponse.data[0];
    if (!result || !result.base64 || !result.filename) {
      throw new Error('Invalid response from decrypt server');
    }

    const pdfBuffer = Buffer.from(result.base64, 'base64');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('❌ Proxy Error:', err.message);
    res.status(500).json({ error: 'Proxy failed: ' + err.message });
  }
});

app.get('/', (req, res) => {
  res.send('Aquamark proxy is live.');
});

app.listen(PORT, () => {
  console.log(`✅ Salesforce proxy running on port ${PORT}`);
});
