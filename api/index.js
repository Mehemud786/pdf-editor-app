const express = require('express');
const multer = require('multer');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

app.post('/api/edit-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No PDF file uploaded.');
    }

    const edits = JSON.parse(req.body.edits || '[]');
    const pdfDoc = await PDFDocument.load(req.file.buffer);
    const pages = pdfDoc.getPages();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const edit of edits) {
      const pageIndex = parseInt(edit.page, 10);
      if (pageIndex >= 0 && pageIndex < pages.length) {
        const page = pages[pageIndex];
        const { height } = page.getSize();

        const fontSize = parseFloat(edit.size || 12);
        const textWidth = edit.text.length * (fontSize * 0.55); // Approximate character width scaling
        const textHeight = fontSize * 1.2;

        const xCoord = parseFloat(edit.x);
        // Convert screen Y coordinate to PDF bottom-left coordinate system
        const yCoord = height - parseFloat(edit.y);

        // 1. Cover existing text with a clean white masking box
        page.drawRectangle({
          x: xCoord - 2,
          y: yCoord - 3,
          width: Math.max(textWidth, parseFloat(edit.width || textWidth)),
          height: textHeight,
          color: rgb(1, 1, 1), // White out old text
        });

        // 2. Draw the new replacement text
        page.drawText(edit.text, {
          x: xCoord,
          y: yCoord,
          size: fontSize,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
      }
    }

    const modifiedPdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=text-replaced-output.pdf');
    res.send(Buffer.from(modifiedPdfBytes));
  } catch (error) {
    console.error(error);
    res.status(500).send('Error replacing text in PDF.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;