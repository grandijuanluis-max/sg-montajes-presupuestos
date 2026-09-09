import csv
import json
import os

csv_path = '/Users/melanigrandi/ANTY/clientessg 2.csv'
js_path = '/Users/melanigrandi/ANTY/PRESUPUESTO/clientes_db.js'

clients = []
with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f, delimiter=';')
    for row in reader:
        c = {
            'codigo': str(row.get('codigo', '')),
            'nombre': str(row.get('nombre', '')),
            'cuit': str(row.get('cuit', '')),
            'telefono': str(row.get('telefono', '')),
            'email': str(row.get('email', '')),
            'condicion_id': str(row.get('condicion_id', '')),
            'condicion_nombre': str(row.get('condicion_nombre', '')),
            'domicilio': str(row.get('domicilio', '')),
            'localidad': str(row.get('localidad', '')),
            'deposito_id': '',
            'deposito_nombre': '',
            'transporte_id': '',
            'transporte_nombre': '',
            'vendedor_id': '',
            'vendedor_nombre': '',
            'estado': 'ACTIVO',
            'deuda_actual': 0,
            'facturas_mora': []
        }
        clients.append(c)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write("window.clientesDB = window.clientesDB || [];\n")
    f.write("window.clientesDB = " + json.dumps(clients, ensure_ascii=False) + ";\n")

print(f"Generated {len(clients)} clients in {js_path}")
