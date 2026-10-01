const express = require('express');
const multer = require('multer');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// PDF modification endpoint
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

        // Optional: Draw a white rectangle to cover/mask original text
        if (edit.mask) {
          page.drawRectangle({
            x: parseFloat(edit.x),
            y: height - parseFloat(edit.y) - parseFloat(edit.height || 15),
            width: parseFloat(edit.width || 100),
            height: parseFloat(edit.height || 15),
            color: rgb(1, 1, 1), // White mask
          });
        }

        // Draw new replacement text
        page.drawText(edit.text, {
          x: parseFloat(edit.x),
          y: height - parseFloat(edit.y), // PDF coordinates start from bottom-left
          size: parseFloat(edit.size || 12),
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
      }
    }

    const modifiedPdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=edited-output.pdf');
    res.send(Buffer.from(modifiedPdfBytes));
  } catch (error) {
    console.error(error);
    res.status(500).send('Error processing PDF editing.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;