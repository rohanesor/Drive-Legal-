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

    def do_GET(self):
        if self.path == '/health' or self.path == '/':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            # Query backend main handler for database and model checks
            health_response = handle_query(json.dumps({'action': 'health'}))
            self.wfile.write(health_response.encode('utf-8'))
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'error', 'message': 'Not Found'}).encode('utf-8'))

    def do_POST(self):
        if self.path == '/query':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length).decode('utf-8')
                
                response = handle_query(post_data)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(response.encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                error_response = json.dumps({'status': 'error', 'message': str(e)})
                self.wfile.write(error_response.encode('utf-8'))
        else:
            self.send_response(404)
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
