const express = require('express');
const axios = require('axios');
const cors = require('cors');
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.post('/return-individuals', async (req, res) => {
  const apiKey = process.env.AQUAMARK_API_KEY;
  const payload = req.body;

  if (!apiKey || !Array.isArray(payload) || payload.length === 0) {
    return res.status(400).json({ error: 'Missing API key or invalid payload.' });
  }

  const results = [];

  for (const fileData of payload) {
    try {
      const form = new FormData();
      form.append('user_email', fileData.user_email);
      form.append('lender', fileData.lender);
      form.append('file', Buffer.from(fileData.file, 'base64'), {
        filename: fileData.filename || 'document.pdf',
        contentType: 'application/pdf'
      });

      const response = await axios.post(
        'https://aquamark-decrypt.onrender.com/watermark', // ✅ CORRECT PATH
        form,
        {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${apiKey}`
          },
          responseType: 'arraybuffer'
        }
      );

      const base64File = Buffer.from(response.data).toString('base64');

      results.push({
        base64: base64File,
        filename: fileData.filename || 'Aquamark.pdf'
      });
    } catch (err) {
      console.error('❌ Error processing file:', fileData.filename, err.message);
      results.push({
        error: `Failed: ${fileData.filename}`,
        detail: err.message
      });
    }
  }

  res.status(200).json(results);
});

app.get('/', (req, res) => {
  res.send('✅ Salesforce Proxy is running.');
});

app.listen(PORT, () => {
  console.log(`🔁 Salesforce Proxy listening on port ${PORT}`);
});
