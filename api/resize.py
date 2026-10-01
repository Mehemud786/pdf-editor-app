from http.server import BaseHTTPRequestHandler
from io import BytesIO
import json
from urllib.parse import parse_qs, urlparse
from PIL import Image
import urllib.request

class handler(BaseHTTPRequestHandler):
    
    def process_request(self, image_url, target_width):
        try:
            # Download image securely from URL with a standard User-Agent to avoid blocks
            req = urllib.request.Request(
                image_url, 
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                image_data = response.read()

            # Open image via Pillow
            img = Image.open(BytesIO(image_data))
            
            # Determine format and safe color profile conversion
            if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                output_format = 'PNG'
            else:
                output_format = 'JPEG'
                if img.mode != 'RGB':
                    img = img.convert('RGB')

            # Calculate height proportionally to avoid distortion
            orig_width, orig_height = img.size
            
            # Fallback if width isn't specified or invalid
            target_width = int(target_width) if target_width else orig_width
            target_height = int(orig_height * (target_width / orig_width))

            # Resize using LANCZOS filter for top-tier quality preservation
            resized_img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)

            # Save to an in-memory buffer
            output_buffer = BytesIO()
            if output_format == 'PNG':
                resized_img.save(output_buffer, format='PNG', optimize=True)
                content_type = 'image/png'
            else:
                resized_img.save(output_buffer, format='JPEG', quality=95, subsampling=0)
                content_type = 'image/jpeg'

            output_buffer.seek(0)

            # Send successful response
            self.send_response(200)
            self.send_header('Content-type', content_type)
            self.send_header('Cache-Control', 'public, max-age=31536000, immutable')
            self.end_headers()
            self.wfile.write(output_buffer.read())

        except Exception as e:
            self.send_error_response(500, f"Image processing failed: {str(e)}")

    def do_GET(self):
        # Parse query parameters (e.g. /api/resize?url=...&width=500)
        parsed_path = urlparse(self.path)
        query_params = parse_qs(parsed_path.query)
        
        image_url = query_params.get('url', [None])[0]
        target_width = query_params.get('width', [800])[0]

        if not image_url:
            self.send_error_response(400, "Missing 'url' query parameter. Usage: ?url=YOUR_IMAGE_URL&width=800")
            return

        self.process_request(image_url, target_width)

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            image_url = data.get('url')
            target_width = data.get('width', 800)

            if not image_url:
                self.send_error_response(400, "Missing 'url' parameter in JSON body.")
                return

            self.process_request(image_url, target_width)

        except json.JSONDecodeError:
            self.send_error_response(400, "Invalid JSON body provided.")
        except Exception as e:
            self.send_error_response(500, str(e))

    def send_error_response(self, code, message):
        self.send_response(code)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode('utf-8'))