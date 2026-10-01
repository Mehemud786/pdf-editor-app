from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        self.message = "Hello World from Python on Vercel!"
        self.wfile.write(self.message.encode('utf-8'))
        return