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
      if (!fileData.file) {
        console.error("❌ Missing file data for:", fileData.filename);
        results.push({
          error: `No file data for ${fileData.filename}`,
          filename: fileData.filename
        });
        continue;
      }

      let fileBuffer;
      try {
        fileBuffer = Buffer.from(fileData.file, 'base64');
      } catch (err) {
        console.error("❌ Failed to decode base64 for:", fileData.filename, err.message);
        results.push({
          error: `Base64 decode failed for ${fileData.filename}`,
          filename: fileData.filename
        });
        continue;
      }

      const userEmail = fileData.user_email || '1christinaduncan@gmail.com';
      const lender = fileData.lender || 'N/A';

      console.log("📨 Calling decrypt server with:", {
        filename: fileData.filename,
        user_email: userEmail,
        lender,
        fileLength: fileBuffer.length
      });

      const form = new FormData();
      form.append('user_email', userEmail);
      form.append('lender', lender);
      form.append('file', fileBuffer, {
        filename: fileData.filename || 'document.pdf',
        contentType: 'application/pdf',
        knownLength: fileBuffer.length
      });

      const response = await axios.post(
        'https://aquamark-decrypt.onrender.com/watermark',
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
      console.error('❌ Error processing file:', fileData.filename, err.response?.data || err.message);
      results.push({
        error: `Failed: ${fileData.filename}`,
        detail: err.response?.data || err.message
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
