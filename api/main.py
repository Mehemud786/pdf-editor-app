import io
import pymupdf
import streamlit as st

st.set_page_config(
    page_title="PDF Text Editor & Exporter", page_icon="📄", layout="centered"
)

st.title("📄 PDF Text Editor")
st.write(
    "Search text, replace it, and download your modified PDF instantly with"
    " one click."
)

# File uploader
uploaded_file = st.file_uploader("Upload your PDF file", type=["pdf"])

# Input fields
search_text = st.text_input("Text to Find", placeholder="e.g. Old Text")
replace_text = st.text_input("Replace With", placeholder="e.g. New Text")

if st.button("Process & Prepare Download", type="primary", use_container_width=True):
  if not uploaded_file:
    st.error("Please upload a PDF file first.")
  elif not search_text or not replace_text:
    st.error("Please enter both the search and replacement text.")
  else:
    with st.spinner("Editing PDF..."):
      # Read PDF bytes
      pdf_bytes = uploaded_file.read()
      doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")

      # Search and replace text
      found = False
      for page in doc:
        text_instances = page.search_for(search_text)
        if text_instances:
          found = True
          for inst in text_instances:
            page.add_redact_annot(inst, text=replace_text)
            page.apply_redactions()

      if not found:
        st.warning(
            f"Note: '{search_text}' was not found in the document, but the file"
            " is ready."
        )

      # Save to buffer
      output_buffer = io.BytesIO()
      doc.save(output_buffer)
      doc.close()
      output_buffer.seek(0)

      st.success("PDF edited successfully!")

      # Export / Download Button
      st.download_button(
          label="📥 Download Modified PDF",
          data=output_buffer,
          file_name="modified_document.pdf",
          mime="application/pdf",
          use_container_width=True,
      )