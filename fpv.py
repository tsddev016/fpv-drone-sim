#!/usr/bin/env python3
"""
FPV Drone Sim 3D Pro — launcher local
Abre o simulador no navegador com um servidor HTTP simples.
Uso: python fpv.py
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import socket
from pathlib import Path

PORT = 8080
HOST = "127.0.0.1"
ENTRY = "fpv.html"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), format % args))

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()


def find_free_port(start=8080, max_tries=20):
    for port in range(start, start + max_tries):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind((HOST, port))
                return port
            except OSError:
                continue
    return start


def main():
    root = Path(__file__).resolve().parent
    os.chdir(root)

    if not (root / ENTRY).exists():
        print(f"Erro: {ENTRY} não encontrado em {root}")
        sys.exit(1)

    port = find_free_port(PORT)
    url = f"http://{HOST}:{port}/{ENTRY}"

    handler = QuietHandler
    with socketserver.TCPServer((HOST, port), handler) as httpd:
        print("=" * 50)
        print("  FPV Drone Sim 3D Pro")
        print("=" * 50)
        print(f"  Servidor: {url}")
        print("  Controles: touch, teclado ou gamepad USB/BT")
        print("  Pressione Ctrl+C para encerrar")
        print("=" * 50)

        try:
            webbrowser.open(url)
        except Exception:
            print(f"  Abra manualmente: {url}")

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nEncerrado.")
            httpd.shutdown()


if __name__ == "__main__":
    main()
