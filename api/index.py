import io
import pymupdf  # PyMuPDF
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import HTMLResponse, StreamingResponse

app = FastAPI()


@app.get("/", response_class=HTMLResponse)
def read_root():
  return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PDF Text Editor & Exporter</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-50 min-h-screen flex items-center justify-center p-4">
        <div class="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-slate-100">
            <div class="text-center mb-6">
                <h1 class="text-2xl font-bold text-slate-800">PDF Text Editor</h1>
                <p class="text-slate-500 text-sm mt-1">Search, replace text, and export your PDF instantly</p>
            </div>
            
            <form id="pdfForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Upload PDF File</label>
                    <input type="file" id="file" accept=".pdf" required 
                        class="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-slate-200 rounded-lg p-1"/>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Text to Find</label>
                    <input type="text" id="searchText" required placeholder="e.g. Old Text"
                        class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"/>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Replace With</label>
                    <input type="text" id="replaceText" required placeholder="e.g. New Text"
                        class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"/>
                </div>
                
                <button type="submit" id="submitBtn"
                    class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition duration-200 text-sm shadow-sm cursor-pointer">
                    Edit & Download PDF
                </button>
            </form>

            <div id="loading" class="hidden text-center mt-4">
                <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                <p class="text-slate-500 text-sm mt-2">Processing and preparing download...</p>
            </div>
        </div>

        <script>
            document.getElementById('pdfForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const fileInput = document.getElementById('file');
                const searchText = document.getElementById('searchText').value;
                const replaceText = document.getElementById('replaceText').value;
                const submitBtn = document.getElementById('submitBtn');
                const loading = document.getElementById('loading');

                if (fileInput.files.length === 0) return;

                const formData = new FormData();
                formData.append('file', fileInput.files[0]);
                formData.append('search_text', searchText);
                formData.append('replace_text', replaceText);

                submitBtn.classList.add('hidden');
                loading.classList.remove('hidden');

                try {
                    const response = await fetch('/api/edit-pdf', {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) throw new Error('Failed to process PDF file');

                    // Convert response stream into a downloadable file blob
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'modified_document.pdf';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                } catch (error) {
                    alert('Error: ' + error.message);
                } finally {
                    submitBtn.classList.remove('hidden');
                    loading.classList.add('hidden');
                }
            });
        </script>
    </body>
    </html>
    """


@app.post("/api/edit-pdf")
async def edit_pdf(
    file: UploadFile = File(...),
    search_text: str = Form(...),
    replace_text: str = Form(...),
):
  pdf_bytes = await file.read()
  doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")

  for page in doc:
    text_instances = page.search_for(search_text)
    for inst in text_instances:
      page.add_redact_annot(inst, text=replace_text)
      page.apply_redactions()

  output_buffer = io.BytesIO()
  doc.save(output_buffer)
  doc.close()
  output_buffer.seek(0)

  return StreamingResponse(
      output_buffer,
      media_type="application/pdf",
      headers={"Content-Disposition": "attachment; filename=modified.pdf"},
  )