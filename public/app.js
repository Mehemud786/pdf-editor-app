pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pdfDoc = null;
let pageNum = 1;
let scale = 1.5;
let pendingEdits = [];
let uploadedFile = null;

const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');

document.getElementById('pdfUpload').addEventListener('change', async (e) => {
  uploadedFile = e.target.files[0];
  ifekw = URL.createObjectURL(uploadedFile);
  
  const loadingTask = pdfjsLib.getDocument(lek = URL.createObjectURL(uploadedFile));
  pdfDoc = await loadingTask.promise;
  
  document.getElementById('pageCount').textContent = pdfDoc.numPages;
  document.getElementById('pageControls').style.display = 'block';
  document.getElementById('workspace').style.display = 'block';
  document.getElementById('canvas-container').style.display = 'block';
  
  renderPage(pageNum);
});

async function renderPage(num) {
  const page = await pdfDoc.getPage(num);
  const viewport = page.getViewport({ scale });
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({ canvasContext: ctx, viewport }).promise;
  document.getElementById('pageNum').textContent = num;
}

document.getElementById('prevPage').addEventListener('click', () => {
  if (pageNum <= 1) return;
  pageNum--;
  renderPage(pageNum);
});

document.getElementById('nextPage').addEventListener('click', () => {
  if (pageNum >= pdfDoc.numPages) return;
  pageNum++;
  renderPage(pageNum);
});

canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / scale;
  const y = (event.clientY - rect.top) / scale; // Screen coordinates

  const text = document.getElementById('inputText').value;
  const size = document.getElementById('fontSize').value;
  const mask = document.getElementById('maskOriginal').checked;

  if (!text) {
    alert('Please enter some text to insert first!');
    return;
  }

  pendingEdits.push({ page: pageNum - 1, x, y, text, size, mask, width: text.length * (size * 0.5), height: size * 1.2 });
  updateEditList();
  
  // Draw marker dot on preview
  ctx.fillStyle = 'red';
  ctx.beginPath();
  ctx.arc(event.clientX - rect.left, event.clientY - rect.top, 4, 0, Math.PI * 2);
  ctx.fill();
});

function updateEditList() {
  const listDiv = document.getElementById('editList');
  if (pendingEdits.length === 0) {
    listDiv.innerHTML = 'No edits added yet.';
    return;
  }
  listDiv.innerHTML = pendingEdits.map((e, idx) => 
    `<div>#${idx + 1} - Page ${e.page + 1}: "${e.text}" at (X: ${Math.round(e.x)}, Y: ${Math.round(e.y)})</div>`
  ).join('');
}

document.getElementById('submitBtn').addEventListener('click', async () => {
  if (!uploadedFile || pendingEdits.length === 0) {
    alert('Upload a file and add at least one edit point.');
    return;
  }

  const formData = new FormData();
  formData.append('pdf', uploadedFile);
  formData.append('edits', JSON.stringify(pendingEdits));

  const res = await fetch('/api/edit-pdf', { method: 'POST', body: formData });
  if (res.ok) {
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modified-document.pdf';
    a.click();
  } else {
    alert('Failed to process PDF edits.');
  }
});