import urllib.request
import urllib.error
import json
import csv

url = "https://amkkuwgatjcbiyrykuoy.supabase.co/rest/v1/clientes"
headers = {
    "apikey": "sb_publishable_I5bemh3YRuiTNkMzWyCA3A_D_aqFlNJ",
    "Authorization": "Bearer sb_publishable_I5bemh3YRuiTNkMzWyCA3A_D_aqFlNJ",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

csv_path = '/Users/melanigrandi/ANTY/clientessg 2.csv'
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

data = json.dumps(clients).encode('utf-8')
req = urllib.request.Request(url, data=data, headers=headers, method='POST')

try:
    with urllib.request.urlopen(req) as response:
        print(f"Status Code: {response.getcode()}")
        print("Clients successfully upserted to Supabase!")
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")

