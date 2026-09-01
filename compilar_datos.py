import os
import json
import struct
import time
from datetime import datetime

# Configuration
BASE_DIR = "/Users/melanigrandi/ANTY/NOTA DE VENTA"

def find_dbi_file(base_dir, candidates):
    if not os.path.exists(base_dir):
        return None
    dir_files = os.listdir(base_dir)
    for cand in candidates:
        for f in dir_files:
            if f.lower() == cand.lower():
                return os.path.join(base_dir, f)
    for cand in candidates:
        for f in dir_files:
            if cand.lower() in f.lower() and f.lower().endswith('.dbi'):
                return os.path.join(base_dir, f)
    return None

CLIENTS_DBI = find_dbi_file(BASE_DIR, ["clientessg.dbi", "clientespala.dbi", "clientes.dbi"]) or os.path.join(BASE_DIR, "CLIENTESPALA.DBI")
CONDITIONS_DBI = find_dbi_file(BASE_DIR, ["condiconessg.dbi", "condicones.dbi", "condicionsg.dbi", "condicionpala.dbi", "condicion.dbi"]) or os.path.join(BASE_DIR, "CONDICIONPALA.DBI")
DEPOSITOS_DBI = find_dbi_file(BASE_DIR, ["depositosg.dbi", "depositopala.dbi", "deposito.dbi"]) or os.path.join(BASE_DIR, "DEPOSITOPALA.DBI")
TRANSPORTES_DBI = find_dbi_file(BASE_DIR, ["transportesg.dbi", "transportepala.dbi", "transporte.dbi"]) or os.path.join(BASE_DIR, "TRANSPORTEPALA.DBI")
STOCK_DBI = find_dbi_file(BASE_DIR, ["stocksg.dbi", "stockpala.dbi", "stock.dbi"]) or os.path.join(BASE_DIR, "STOCKPALA.DBI")
VENDEDORES_DBI = find_dbi_file(BASE_DIR, ["vendedorsg.dbi", "vendedorpala.dbi", "vendedor.dbi"]) or os.path.join(BASE_DIR, "VENDEDORPALA.DBI")

TODAY = datetime(2026, 5, 27)  # App context current date

def read_dbf_records(filepath, fields_to_extract=None):
    if not os.path.exists(filepath):
        print(f"Error: file not found {filepath}")
        return []
        
    try:
        with open(filepath, 'rb') as f:
            header = f.read(32)
            if len(header) < 32:
                return []
                
            sig, yy, mm, dd, num_records, header_size, record_len = struct.unpack('<BBBBIHH', header[:12])
            
            fields = []
            while True:
                next_byte = f.read(1)
                if not next_byte or next_byte == b'\x0d':
                    break
                field_data = next_byte + f.read(31)
                if len(field_data) < 32:
                    break
                
                field_name = field_data[:11].strip(b'\x00').decode('ascii', errors='ignore').strip()
                field_type = chr(field_data[11])
                field_length = field_data[16]
                fields.append({
                    'name': field_name,
                    'type': field_type,
                    'length': field_length
                })
                
            offsets = {}
            curr = 1
            for field in fields:
                offsets[field['name']] = (curr, field['length'], field['type'])
                curr += field['length']
                
            if fields_to_extract:
                ranges = {name: (offsets[name][0], offsets[name][0]+offsets[name][1], offsets[name][2]) 
                          for name in fields_to_extract if name in offsets}
            else:
                ranges = {field['name']: (offsets[field['name']][0], offsets[field['name']][0]+offsets[field['name']][1], offsets[field['name']][2]) 
                          for field in fields}
                          
            f.seek(header_size)
            data = f.read()
            
            records = []
            ptr = 0
            while ptr + record_len <= len(data):
                rec_bytes = data[ptr:ptr+record_len]
                ptr += record_len
                
                if rec_bytes[0] == 42:  # Deleted record
                    continue
                    
                row = {}
                for name, (start, end, ftype) in ranges.items():
                    val = rec_bytes[start:end].decode('latin-1', errors='ignore').strip()
                    row[name] = val
                records.append(row)
                
            return records
    except Exception as e:
        print(f"Exception reading DBF {filepath}: {e}")
        return []

def compile():
    print("Compilando bases de datos de FoxPro a JS estáticos...")
    t0 = time.time()
    
    # 1. Cargar Condiciones de venta
    print("Leyendo condiciones...")
    conditions_list = read_dbf_records(CONDITIONS_DBI, ['CODIGO', 'NOMBRE', 'DIAS'])
    conditions_out = []
    conditions_map = {}
    for c in conditions_list:
        cond_obj = {
            'codigo': c['CODIGO'],
            'nombre': c['NOMBRE'].strip(),
            'dias': int(c['DIAS'] or 0)
        }
        conditions_out.append(cond_obj)
        conditions_map[c['CODIGO']] = cond_obj
        
    conditions_out.sort(key=lambda x: x['nombre'])

    # 2. Cargar Depósitos
    print("Leyendo depósitos...")
    depositos_list = read_dbf_records(DEPOSITOS_DBI, ['CODIGO', 'NOMBRE'])
    depositos_out = []
    depositos_map = {}
    for d in depositos_list:
        dep_obj = {
            'codigo': d['CODIGO'],
            'nombre': d['NOMBRE'].strip()
        }
        if dep_obj['codigo']:
            depositos_out.append(dep_obj)
            depositos_map[d['CODIGO']] = dep_obj
            
    depositos_out.sort(key=lambda x: x['nombre'])

    # 3. Cargar Transportes
    print("Leyendo transportes...")
    transportes_list = read_dbf_records(TRANSPORTES_DBI, ['CODIGO', 'NOMBRE'])
    transportes_out = []
    transportes_map = {}
    for t in transportes_list:
        trans_obj = {
            'codigo': t['CODIGO'],
            'nombre': t['NOMBRE'].strip()
        }
        if trans_obj['codigo']:
            transportes_out.append(trans_obj)
            transportes_map[t['CODIGO']] = trans_obj
            
    transportes_out.sort(key=lambda x: x['nombre'])

    # 3b. Cargar Vendedores
    print("Leyendo vendedores...")
    vendedores_list = read_dbf_records(VENDEDORES_DBI, ['CODIGO', 'NOMBRE', 'INACTIVO'])
    vendedores_out = []
    for v in vendedores_list:
        if v.get('INACTIVO') == 'T':
            continue
        v_obj = {
            'codigo': v['CODIGO'],
            'nombre': v['NOMBRE'].strip()
        }
        if v_obj['codigo']:
            vendedores_out.append(v_obj)
            
    vendedores_out.sort(key=lambda x: x['nombre'])

    # 4. Cargar Clientes
    print("Leyendo clientes...")
    clients_list = read_dbf_records(CLIENTS_DBI, ['CODIGO', 'NOMBRE', 'CUIT', 'TELEFONO', 'E_MAIL', 'CONDICION', 'ESTADO', 'DOMICILIO', 'LOCALIDAD', 'DEPOSITO', 'TRANSPORTE', 'VENDEDOR', 'NOM_VENDE'])
    clients_out = []
    
    for c in clients_list:
        if c.get('ESTADO') == 'BAJA':
            continue
            
        cid = c['CODIGO']
        nombre = c['NOMBRE'].strip() if c['NOMBRE'] else f"CLIENTE {cid}"
        cuit = c['CUIT'].strip()
        
        # Deuda actual y mora seteadas a valores vacíos por requerimiento
        deuda_actual = 0.0
        facturas_mora = []
        
        # CONDICION_ID
        condicion_id = c['CONDICION'].strip()
        cond_nombre = conditions_map.get(condicion_id, {}).get('nombre', f"Condición {condicion_id}")
        
        # DEPOSITO_ID
        deposito_id = c.get('DEPOSITO', '').strip()
        dep_nombre = depositos_map.get(deposito_id, {}).get('nombre', f"Depósito {deposito_id}" if deposito_id else "")
        
        # TRANSPORTE_ID
        transporte_id = c.get('TRANSPORTE', '').strip()
        trans_nombre = transportes_map.get(transporte_id, {}).get('nombre', f"Transporte {transporte_id}" if transporte_id else "")
        
        # Display ID compatible con el buscador autocomplete (Nombre - Cuit)
        display_id = f"{nombre} - {cuit}" if cuit else nombre
        
        vendedor_id = c.get('VENDEDOR', '').strip()
        vendedor_nombre = c.get('NOM_VENDE', '').strip()
        
        client_obj = {
            'id': display_id,
            'codigo': cid,
            'nombre': nombre,
            'cuit': cuit,
            'telefono': c.get('TELEFONO', '').strip(),
            'email': c.get('E_MAIL', '').strip(),
            'condicion_id': condicion_id,
            'condicion_nombre': cond_nombre,
            'deposito_id': deposito_id,
            'deposito_nombre': dep_nombre,
            'transporte_id': transporte_id,
            'transporte_nombre': trans_nombre,
            'vendedor_id': vendedor_id,
            'vendedor_nombre': vendedor_nombre,
            'estado': c.get('ESTADO', '').strip(),
            'domicilio': c.get('DOMICILIO', '').strip(),
            'localidad': c.get('LOCALIDAD', '').strip(),
            'deuda_actual': deuda_actual,
            'facturas_mora': facturas_mora
        }
        clients_out.append(client_obj)
        
    clients_out.sort(key=lambda x: x['nombre'])
    
    # 4b. Cargar Stock
    print("Leyendo stock...")
    stock_list = read_dbf_records(STOCK_DBI, ['CODIGO', 'DETALLE', 'RUBRO', 'SUBRUBRO', 'STOCK', 'PRECIO_1', 'ESTADO'])
    stock_out = []
    for s in stock_list:
        if not s.get('CODIGO'):
            continue
        try:
            stock_qty = float(s.get('STOCK') or 0.0)
        except ValueError:
            stock_qty = 0.0
            
        try:
            precio = float(s.get('PRECIO_1') or 0.0)
        except ValueError:
            precio = 0.0

        stock_obj = {
            'codigo': s['CODIGO'].strip(),
            'detalle': s['DETALLE'].strip(),
            'rubro': s['RUBRO'].strip(),
            'subrubro': s.get('SUBRUBRO', '').strip(),
            'stock': stock_qty,
            'precio': precio,
            'estado': s.get('ESTADO', '').strip()
        }
        stock_out.append(stock_obj)
        
    stock_out.sort(key=lambda x: x['detalle'])
    
    # 5. Escribir archivos JS
    print("Escribiendo condiciones_db.js...")
    with open(os.path.join(BASE_DIR, "condiciones_db.js"), "w", encoding="utf-8") as f:
        f.write("const condicionesDB = " + json.dumps(conditions_out, indent=2, ensure_ascii=False) + ";\n")
        
    print("Escribiendo depositos_db.js...")
    with open(os.path.join(BASE_DIR, "depositos_db.js"), "w", encoding="utf-8") as f:
        f.write("const depositosDB = " + json.dumps(depositos_out, indent=2, ensure_ascii=False) + ";\n")
        
    print("Escribiendo transportes_db.js...")
    with open(os.path.join(BASE_DIR, "transportes_db.js"), "w", encoding="utf-8") as f:
        f.write("const transportesDB = " + json.dumps(transportes_out, indent=2, ensure_ascii=False) + ";\n")
        
    print("Escribiendo clientes_db.js...")
    with open(os.path.join(BASE_DIR, "clientes_db.js"), "w", encoding="utf-8") as f:
        f.write("const clientesDB = " + json.dumps(clients_out, indent=2, ensure_ascii=False) + ";\n")
        
    print("Escribiendo stock_db.js...")
    with open(os.path.join(BASE_DIR, "stock_db.js"), "w", encoding="utf-8") as f:
        f.write("const stockDB = " + json.dumps(stock_out, indent=2, ensure_ascii=False) + ";\n")
        
    print("Escribiendo vendedores_db.js...")
    with open(os.path.join(BASE_DIR, "vendedores_db.js"), "w", encoding="utf-8") as f:
        f.write("const vendedoresDB = " + json.dumps(vendedores_out, indent=2, ensure_ascii=False) + ";\n")
        
    print(f"Compilación finalizada en {time.time() - t0:.2f}s.")
    print(f"Clientes compilados: {len(clients_out)}")
    print(f"Condiciones compiladas: {len(conditions_out)}")
    print(f"Depósitos compilados: {len(depositos_out)}")
    print(f"Transportes compilados: {len(transportes_out)}")
    print(f"Vendedores compilados: {len(vendedores_out)}")
    print(f"Productos compilados: {len(stock_out)}")

if __name__ == '__main__':
    compile()
