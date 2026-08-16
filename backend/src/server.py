from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import sys
import os

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import handle_query

class DriveLegalServer(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Structured JSON logs compatible with CloudWatch
        log_entry = {
            "timestamp": self.log_date_time_string(),
            "client_address": self.client_address[0],
            "command": self.command,
            "path": self.path,
            "status_code": args[1] if len(args) > 1 else "N/A"
        }
        print(json.dumps(log_entry), flush=True)

    def serve_static_file(self, filename, content_type, write_body=True):
        static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
        filepath = os.path.join(static_dir, filename)
        if os.path.exists(filepath) and os.path.isfile(filepath):
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.end_headers()
            if write_body:
                with open(filepath, 'rb') as f:
                    self.wfile.write(f.read())
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            if write_body:
                self.wfile.write(json.dumps({'status': 'error', 'message': f'File {filename} Not Found'}).encode('utf-8'))

    def serve_binary_file(self, filepath, write_body=True):
        if os.path.exists(filepath) and os.path.isfile(filepath):
            self.send_response(200)
            filename = os.path.basename(filepath)
            if filename.endswith('.apk'):
                self.send_header('Content-Type', 'application/vnd.android.package-archive')
            elif filename.endswith('.aab'):
                self.send_header('Content-Type', 'application/octet-stream')
            else:
                self.send_header('Content-Type', 'application/octet-stream')
            self.send_header('Content-Length', str(os.path.getsize(filepath)))
            self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
            self.end_headers()
            if write_body:
                with open(filepath, 'rb') as f:
                    while True:
                        chunk = f.read(65536)
                        if not chunk:
                            break
                        self.wfile.write(chunk)
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            if write_body:
                self.wfile.write(json.dumps({'status': 'error', 'message': 'Release File Not Found'}).encode('utf-8'))

    def do_HEAD(self):
        self.handle_get_or_head(write_body=False)

    def do_GET(self):
        self.handle_get_or_head(write_body=True)

    def handle_get_or_head(self, write_body=True):
        import time, uuid
        req_id = self.headers.get('X-Request-ID') or str(uuid.uuid4())
        start_time = time.time()
        clean_path = self.path.rstrip('/')
        if clean_path == '':
            clean_path = '/'

        if clean_path == '/health' or clean_path == '/':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('X-Request-ID', req_id)
            this_headers_done = True
            self.end_headers()
            if write_body:
                health_response = handle_query(json.dumps({'action': 'health'}))
                self.wfile.write(health_response.encode('utf-8'))
            latency_ms = round((time.time() - start_time) * 1000, 2)
            print(json.dumps({"request_id": req_id, "method": self.command, "path": clean_path, "status": 200, "latency_ms": latency_ms}), flush=True)
            
        elif clean_path == '/download':
            self.serve_static_file('download.html', 'text/html', write_body)
            
        elif clean_path == '/download/android':
            self.serve_static_file('android.html', 'text/html', write_body)
            
        elif clean_path == '/download/ios':
            self.serve_static_file('ios.html', 'text/html', write_body)
            
        elif clean_path == '/download/android-auto':
            self.serve_static_file('android_auto.html', 'text/html', write_body)
            
        elif clean_path == '/download/releases':
            self.serve_static_file('releases.html', 'text/html', write_body)
            
        elif clean_path == '/releases/latest.json':
            self.serve_static_file('latest.json', 'application/json', write_body)
            
        elif clean_path == '/releases/history.json':
            self.serve_static_file('releases.json', 'application/json', write_body)
            
        elif self.path.startswith('/download/files/'):
            filename = os.path.basename(self.path)
            static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
            filepath = os.path.join(static_dir, 'files', filename)
            self.serve_binary_file(filepath, write_body)
            
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.send_header('X-Request-ID', req_id)
            self.end_headers()
            if write_body:
                self.wfile.write(json.dumps({'status': 'error', 'message': 'Not Found'}).encode('utf-8'))

    def do_POST(self):
        import time, uuid
        req_id = self.headers.get('X-Request-ID') or str(uuid.uuid4())
        start_time = time.time()
        if self.path == '/query':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length).decode('utf-8')
                
                # Parse action for logging (do not log sensitive user text/data)
                action_name = 'unknown'
                try:
                    parsed_body = json.loads(post_data)
                    action_name = parsed_body.get('action', 'query')
                except Exception:
                    pass

                response = handle_query(post_data)
                latency_ms = round((time.time() - start_time) * 1000, 2)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('X-Request-ID', req_id)
                self.end_headers()
                self.wfile.write(response.encode('utf-8'))
                
                print(json.dumps({"request_id": req_id, "action": action_name, "status": 200, "latency_ms": latency_ms}), flush=True)
            except Exception as e:
                latency_ms = round((time.time() - start_time) * 1000, 2)
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('X-Request-ID', req_id)
                self.end_headers()
                error_response = json.dumps({'status': 'error', 'message': str(e)})
                self.wfile.write(error_response.encode('utf-8'))
                print(json.dumps({"request_id": req_id, "status": 500, "error": str(e), "latency_ms": latency_ms}), flush=True)
        else:
            self.send_response(404)
            self.send_header('X-Request-ID', req_id)
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'error', 'message': 'Not Found'}).encode('utf-8'))

def run(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, DriveLegalServer)
    print(json.dumps({"event": "server_started", "port": port}), flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    print(json.dumps({"event": "server_stopped"}), flush=True)

if __name__ == '__main__':
    # Ensure database is initialized and seeded on server startup if not present
    db_dir = os.path.join(os.path.dirname(__file__), 'data')
    db_path = os.path.join(db_dir, 'drivelegal.db')
    if not os.path.exists(db_path):
        try:
            print("Database not found. Initializing and seeding...", flush=True)
            os.makedirs(db_dir, exist_ok=True)
            from database import initialize_database
            from ingest.seed import seed_database
            initialize_database()
            seed_database()
            print("Database initialized and seeded successfully.", flush=True)
        except Exception as e:
            print(f"Error seeding database: {e}", flush=True)

    port = int(os.environ.get('PORT', 8000))
    run(port)
