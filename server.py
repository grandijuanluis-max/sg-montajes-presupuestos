#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
====================================================================
SG MONTAJES SRL — Backend Python API & Web Server
Presupuestos, Avances de Obra, Sincronización Supabase y Notificaciones
====================================================================
"""

import os
import sys
import json
import csv
import io
import time
import urllib.request
import urllib.error
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime

PORT = int(os.environ.get("PORT", 8000))
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://amkkuwgatjcbiyrykuoy.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "sb_publishable_I5bemh3YRuiTNkMzWyCA3A_D_aqFlNJ")

def supabase_request(endpoint, method="GET", data=None):
    """Realiza peticiones seguras a la API REST de Supabase"""
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        print(f"[Supabase Error {e.code}] {err_body}")
        return {"error": True, "code": e.code, "message": err_body}
    except Exception as e:
        print(f"[Error conexión Supabase] {e}")
        return {"error": True, "message": str(e)}

class SGBackendHandler(SimpleHTTPRequestHandler):
    """Maneja las rutas de la API y sirve el frontend estático"""

    def end_headers(self):
        """Envía headers anti-caché para que el navegador siempre pida la versión nueva"""
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def send_json_response(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        # --- ENDPOINTS API ---

        # 1. Health check y estado
        if path == "/api/health":
            self.send_json_response({
                "status": "online",
                "app": "SG Montajes Presupuestos API",
                "version": "2.0",
                "supabase_connected": True,
                "timestamp": datetime.now().isoformat()
            })
            return

        # 2. Listar presupuestos
        if path == "/api/presupuestos":
            limit = params.get("limit", [100])[0]
            data = supabase_request(f"presupuestos?select=*&order=created_at.desc&limit={limit}")
            self.send_json_response(data)
            return

        # 3. Métricas y estadísticas avanzadas
        if path == "/api/estadisticas":
            presupuestos = supabase_request("presupuestos?select=*")
            avances = supabase_request("avances_obra?select=*")
            
            if isinstance(presupuestos, dict) and presupuestos.get("error"):
                presupuestos = []
            if isinstance(avances, dict) and avances.get("error"):
                avances = []

            total_presupuestado = sum(float(p.get("importe_total") or 0) for p in presupuestos)
            total_facturado = sum(float(a.get("monto_equivalente") or 0) for a in avances)
            
            por_rubro = {}
            por_estado = {}
            for p in presupuestos:
                rubro = p.get("tipo_presupuesto") or "Eléctrico"
                estado = p.get("estado") or "Enviado sin OC"
                por_rubro[rubro] = por_rubro.get(rubro, 0) + float(p.get("importe_total") or 0)
                por_estado[estado] = por_estado.get(estado, 0) + 1

            self.send_json_response({
                "total_presupuestos": len(presupuestos),
                "total_presupuestado": total_presupuestado,
                "total_facturado_avances": total_facturado,
                "porcentaje_facturado_global": round((total_facturado / total_presupuestado * 100), 2) if total_presupuestado > 0 else 0,
                "distribucion_por_rubro": por_rubro,
                "distribucion_por_estado": por_estado,
                "total_hitos_avance": len(avances)
            })
            return

        # 4. Exportar Backup completo en JSON
        if path == "/api/backup":
            backup = {
                "fecha_backup": datetime.now().isoformat(),
                "app_state": supabase_request("app_state?select=*"),
                "usuarios": supabase_request("usuarios?select=*"),
                "presupuestos": supabase_request("presupuestos?select=*"),
                "avances_obra": supabase_request("avances_obra?select=*"),
                "notificaciones": supabase_request("notificaciones?select=*")
            }
            self.send_json_response(backup)
            return

        # 5. Exportar reporte CSV
        if path == "/api/exportar-csv":
            presupuestos = supabase_request("presupuestos?select=*&order=fecha.desc")
            if not isinstance(presupuestos, list):
                presupuestos = []

            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(["ID", "Fecha", "Rubro", "Cliente", "CUIT", "Denominación", "Importe Total", "Estado", "Avance %", "Monto Facturado", "Nro OC", "Operador"])
            
            for p in presupuestos:
                writer.writerow([
                    p.get("id", ""),
                    p.get("fecha", ""),
                    p.get("tipo_presupuesto", ""),
                    p.get("cliente_nombre", ""),
                    p.get("cuit", ""),
                    p.get("meca_denominacion", ""),
                    p.get("importe_total", 0),
                    p.get("estado", ""),
                    p.get("avance_porcentaje_acumulado", 0),
                    p.get("monto_facturado", 0),
                    p.get("nro_oc", ""),
                    p.get("operador", "")
                ])

            csv_content = output.getvalue().encode("utf-8-sig")
            self.send_response(200)
            self.send_header("Content-Type", "text/csv; charset=utf-8")
            self.send_header("Content-Disposition", f"attachment; filename=sgmontajes_presupuestos_{datetime.now().strftime('%Y%m%d_%H%M')}.csv")
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(csv_content)
            return

        # Si no es un endpoint de API, servir los archivos estáticos del frontend (HTML, JS, CSS, PNG)
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        
        content_len = int(self.headers.get("Content-Length", 0))
        post_body = self.rfile.read(content_len) if content_len > 0 else b"{}"
        
        try:
            payload = json.loads(post_body.decode("utf-8")) if post_body else {}
        except:
            payload = {}

        # 1. Notificación de Avance de Obra / Correo para Facturación
        if path == "/api/notificar-avance":
            presupuesto_id = payload.get("presupuesto_id") or payload.get("id")
            porcentaje = payload.get("porcentaje", 0)
            monto = payload.get("monto", 0)
            cliente = payload.get("cliente", "CARGILL SACI")
            detalle = payload.get("detalle", "")
            
            print("=======================================================")
            print(f"📧 [EMAIL DISPARADO A FACTURACIÓN] - SG MONTAJES SRL")
            print(f"Destinatario: facturacion@sgmontajes.com.ar")
            print(f"Asunto: NUEVO AVANCE REGISTRADO — Presupuesto #{presupuesto_id} ({porcentaje}%)")
            print(f"Cliente: {cliente}")
            print(f"Monto a Certificar/Facturar: ${float(monto):,.2f}")
            print(f"Detalle: {detalle}")
            print("=======================================================")

            # Guardar notificación en Supabase
            notif_row = [{
                "id": f"notif-auto-{int(time.time()*1000)}",
                "user_id": "all",
                "message": f"Avance del {porcentaje}% registrado en #{presupuesto_id} (${float(monto):,.2f}). Notificado a Facturación.",
                "read": False,
                "task_id": str(presupuesto_id)
            }]
            supabase_request("notificaciones", method="POST", data=notif_row)

            self.send_json_response({
                "success": True,
                "message": "Notificación procesada y enviada a facturacion@sgmontajes.com.ar",
                "presupuesto_id": presupuesto_id,
                "porcentaje": porcentaje,
                "monto_facturado": monto
            })
            return

        self.send_json_response({"error": "Ruta POST no encontrada"}, status=404)

def run():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server_address = ("", PORT)
    httpd = HTTPServer(server_address, SGBackendHandler)
    print("====================================================================")
    print("  🚀 SG MONTAJES SRL — BACKEND PYTHON & SERVIDOR WEB ACTIVO")
    print(f"  🌐 Servidor corriendo en: http://localhost:{PORT}")
    print(f"  ☁️  Conectado a Supabase: {SUPABASE_URL}")
    print("  Endpoints disponibles:")
    print("    - http://localhost:8000/api/health")
    print("    - http://localhost:8000/api/presupuestos")
    print("    - http://localhost:8000/api/estadisticas")
    print("    - http://localhost:8000/api/exportar-csv")
    print("    - http://localhost:8000/api/backup")
    print("====================================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Servidor detenido.")
        httpd.server_close()

if __name__ == "__main__":
    run()
