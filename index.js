// index.js
const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));

app.post('/watermark', async (req, res) => {
  try {
    const { user_email, file, lender } = req.body;

    if (!user_email || !file) {
      return res.status(400).json({ error: 'Missing user_email or file' });
    }

    // Convert base64 to binary Buffer
    const buffer = Buffer.from(file, 'base64');

    // Build multipart form
    const FormData = require('form-data');
    const form = new FormData();
    form.append('user_email', user_email);
    form.append('lender', lender || 'Salesforce');
    form.append('file', buffer, {
      filename: 'file.pdf',
      contentType: 'application/pdf'
    });

    const apiRes = await axios.post('https://aquamark-decrypt.onrender.com/watermark', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: 'Bearer aqua-api-watermark-10182013040420111015'
      },
      responseType: 'arraybuffer'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.send(apiRes.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong', detail: err.message });
  }
});

app.listen(port, () => {
  console.log(`Salesforce Proxy listening on port ${port}`);
});
app.post('/batch-watermark', async (req, res) => {
  try {
    const payloads = req.body;

    if (!Array.isArray(payloads) || payloads.length === 0) {
      return res.status(400).json({ error: 'Payload must be a non-empty array' });
    }

    const axios = require('axios');
    const FormData = require('form-data');
    const JSZip = require('jszip');

    const zip = new JSZip();

    for (const entry of payloads) {
      const { user_email, file, lender } = entry;
      if (!user_email || !file || !lender) continue;

      const buffer = Buffer.from(file, 'base64');
      const form = new FormData();
      form.append('user_email', user_email);
      form.append('lender', lender);
      form.append('file', buffer, {
        filename: 'file.pdf',
        contentType: 'application/pdf'
      });

      const result = await axios.post('https://aquamark-decrypt.onrender.com/watermark', form, {
        headers: {
          ...form.getHeaders(),
          Authorization: 'Bearer aqua-api-watermark-10182013040420111015'
        },
        responseType: 'arraybuffer'
      });

     const filename = req.body.filename || `Aquamark - ${lender}.pdf`;
form.append('file', buffer, {
  filename,
  contentType: 'application/pdf'
});
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=aquamark_files.zip');
    res.send(zipBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Batch processing failed', detail: err.message });
  }
});
