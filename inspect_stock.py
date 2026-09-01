import os
import struct
from collections import Counter

def inspect_dbf(filepath):
    if not os.path.exists(filepath):
        print(f"Error: file not found {filepath}")
        return
        
    try:
        with open(filepath, 'rb') as f:
            header = f.read(32)
            sig, yy, mm, dd, num_records, header_size, record_len = struct.unpack('<BBBBIHH', header[:12])
            
            fields = []
            while True:
                next_byte = f.read(1)
                if not next_byte or next_byte == b'\x0d':
                    break
                field_data = next_byte + f.read(31)
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
                for name in ['CODIGO', 'DETALLE', 'RUBRO', 'STOCK', 'PRECIO_1', 'ESTADO']:
                    start, length, _ = offsets[name]
                    val = rec_bytes[start:start+length].decode('latin-1', errors='ignore').strip()
                    row[name] = val
                records.append(row)
                
            print(f"Total active records in DBF: {len(records)}")
            states = Counter([r['ESTADO'] for r in records])
            print("States:", states)
            rubros = Counter([r['RUBRO'] for r in records])
            print("Top 10 Rubros:", rubros.most_common(10))
            
            pos_stock = sum(1 for r in records if float(r['STOCK'] or 0) > 0)
            print(f"Products with stock > 0: {pos_stock}")
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == '__main__':
    inspect_dbf('/Users/melanigrandi/ANTY/NOTA DE VENTA/STOCKPALA.DBI')
