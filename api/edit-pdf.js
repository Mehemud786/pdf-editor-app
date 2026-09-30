const { PDFDocument, rgb } = require('pdf-lib');

export default async function handler(req, res) {
  // Allow only POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405.end(`Method ${req.method} Not Allowed`));
  }

  try {
    // Expecting base64 string of the PDF and target text changes in JSON body
    const { pdfBase64, searchText, replaceText } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ error: 'Missing pdfBase64 in request body' });
    }

    // Convert base64 back to buffer
    const pdfBytes = Buffer.from(pdfBase64, 'base64');

    // Load the PDF using pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0]; // Target first page (or loop through pages)

    // Example modification: Draw text or overlay to simulate text change/redaction
    // Note: pdf-lib modifies vector graphics/text streams directly. 
    // For simple replacements, we can draw a white box over old text and write new text.
    
    // Draw a covering rectangle (white background mask)
    firstPage.drawRectangle({
      x: 100,
      y: 700,
      width: 200,
      height: 20,
      color: rgb(1, 1, 1), // White color
    });

    // Draw new replacement text
    firstPage.drawText(replaceText || 'Updated Text Here', {
      x: 100,
      y: 705,
      size: 12,
      color: rgb(0, 0, 0), // Black color
    });

    // Serialize the PDFDocument to bytes
    const modifiedPdfBytes = await pdfDoc.save();
    const modifiedPdfBase64 = Buffer.from(modifiedPdfBytes).toString('base64');

    return res.status(200).json({
      success: true,
      message: 'PDF edited successfully',
      pdfBase64: modifiedPdfBase64,
    });

  } catch (error) {
    console.error('Error processing PDF:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}