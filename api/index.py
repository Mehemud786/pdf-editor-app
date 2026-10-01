from http.server import BaseHTTPRequestHandler
from io import BytesIO
import json
from urllib.parse import parse_qs, urlparse
from PIL import Image
import urllib.request

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Parse JSON body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            image_url = data.get('url')
            target_width = int(data.get('width', 800))

            if not image_url:
                self.send_error_response(400, "Missing 'url' parameter.")
                return

            # Download image securely from URL
            req = urllib.request.Request(
                image_url, 
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            with urllib.request.urlopen(req) as response:
                image_data = response.read()

            # Open image via Pillow
            img = Image.open(BytesIO(image_data))
            
            # Convert CMYK or palette images to RGB to prevent errors during saving
            if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                output_format = 'PNG'
            else:
                output_format = 'JPEG'
                if img.mode != 'RGB':
                    img = img.convert('RGB')

            # Calculate height proportionally to avoid any distortion/quality loss
            orig_width, orig_height = img.size
            target_height = int(orig_height * (target_width / orig_width))

            # Resize using LANCZOS filter for maximum preservation of details and sharpness
            resized_img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)

            # Save to an in-memory buffer
            output_buffer = BytesIO()
            if output_format == 'PNG':
                resized_img.save(output_buffer, format='PNG', optimize=True)
                content_type = 'image/png'
            else:
                # Quality 95+ ensures no noticeable compression artifact introduction
                resized_img.save(output_buffer, format='JPEG', quality=95, subsampling=0)
                content_type = 'image/jpeg'

            output_buffer.seek(0)

            # Send successful response back with the resized image
            self.send_response(200)
            self.send_header('Content-type', content_type)
            self.end_headers()
            self.wfile.write(output_buffer.read())

        except Exception as e:
            self.send_error_response(500, str(e))

    def send_error_response(self, code, message):
        self.send_response(code)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode('utf-8'))