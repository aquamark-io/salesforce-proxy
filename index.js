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
      // ✅ Validate presence of user_email and base64 file
      const userEmail = fileData.user_email || '1christinaduncan@gmail.com';
      const fileBuffer = Buffer.from(fileData.file, 'base64');

      const form = new FormData();
      form.append('user_email', userEmail);
      form.append('lender', fileData.lender || 'N/A');
      form.append('file', fileBuffer, {
        filename: fileData.filename || 'document.pdf',
        contentType: 'application/pdf',
        knownLength: fileBuffer.length // ✅ Ensures proper form-data encoding
      });

      // ✅ Log what's being sent
      console.log("📨 Calling decrypt server with:", {
        user_email: userEmail,
        filename: fileData.filename,
        lender: fileData.lender,
        size: fileBuffer.length
      });

      // 🔁 Call the decrypt server
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

      // ✅ Return base64 PDF to Apex
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
