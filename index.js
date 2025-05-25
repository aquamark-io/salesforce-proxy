const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { PDFDocument, rgb } = require('pdf-lib');
const { Readable } = require('stream');
const https = require('https');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT || 3000;

const hologramUrl = 'https://aquamark.io/hologram.png';
const logoBucket = 'https://dvzmnikrvkvgragzhrof.supabase.co/storage/v1/object/public/logos';

app.post('/watermark', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const lender = req.body.lender || 'lender';
    const underwriter = req.body.underwriter || 'underwriter';
    const logoPath = req.body.logoUrl;

    if (!file || !logoPath) {
      return res.status(400).json({ error: 'Missing file or logo URL' });
    }

    // Decrypt via external Render service if needed
    let decryptedBuffer = file.buffer;
    try {
      const decryptRes = await axios.post('https://aquamark-decrypt.onrender.com/decrypt', file.buffer, {
        headers: { 'Content-Type': 'application/pdf' },
        responseType: 'arraybuffer',
        timeout: 15000,
      });
      decryptedBuffer = Buffer.from(decryptRes.data);
    } catch (err) {
      console.warn('Decryption skipped or failed:', err.message);
    }

    // Load PDF
    const pdfDoc = await PDFDocument.load(decryptedBuffer);
    const logoImg = await axios.get(logoPath, { responseType: 'arraybuffer' });
    const hologramImg = await axios.get(hologramUrl, { responseType: 'arraybuffer' });

    const logo = await pdfDoc.embedPng(logoImg.data);
    const hologram = await pdfDoc.embedPng(hologramImg.data);

    const pages = pdfDoc.getPages();
    for (const page of pages) {
      const { width, height } = page.getSize();

      const tileSpacing = 150;
      for (let x = -width; x < width * 2; x += tileSpacing) {
        for (let y = -height; y < height * 2; y += tileSpacing) {
          page.drawImage(logo, {
            x: x,
            y: y,
            width: 100,
            height: 100,
            rotate: degrees(45),
            opacity: 0.15,
          });
        }
      }

      page.drawImage(hologram, {
        x: width - 120,
        y: 20,
        width: 100,
        height: 100,
        opacity: 0.4,
      });

      page.drawText(`Underwriter: ${underwriter}`, {
        x: 20,
        y: 20,
        size: 10,
        color: rgb(0.3, 0.3, 0.3),
      });

      page.drawText(`Lender: ${lender}`, {
        x: 20,
        y: 10,
        size: 10,
        color: rgb(0.3, 0.3, 0.3),
      });
    }

    const finalPdfBytes = await pdfDoc.save();

    // Preserve original filename + lender
    const originalName = file.originalname || 'document.pdf';
    const baseName = path.parse(originalName).name;
    const finalFileName = `${baseName} - ${lender}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${finalFileName}"`);
    res.send(finalPdfBytes);
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function degrees(angle) {
  return (angle * Math.PI) / 180;
}

app.get('/', (req, res) => {
  res.send('Aquamark watermarking server is running.');
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
