# SG MONTAJES — Gestión de Presupuestos

Aplicación Streamlit + Supabase para la gestión de presupuestos eléctricos y mecánicos, usuarios con permisos por módulo, base de clientes y estadísticas de alto caudal.

La app HTML/JS original (`index.html` + `app.js`) se mantiene como referencia. El sistema operativo pasa a ser esta aplicación.

## Arranque local

```bash
cd /Users/juanluisgrandi/AI/SG_MONTAGES/PRESUPUESTO
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/seed_from_js.py
streamlit run app.py
```

Usuario inicial: `mel` / `123`

Sin `SUPABASE_URL` en secrets, la app usa SQLite en `data/local.db` para desarrollo.

## Supabase

1. Crear un proyecto en Supabase.
2. Ejecutar `supabase_schema.sql` en el SQL Editor.
3. Copiar `.streamlit/secrets.toml.example` a `.streamlit/secrets.toml` y completar URL + key (recomendado: `service_role` porque Streamlit corre del lado servidor).
4. Sembrar catálogos (clientes / tarifario) desde el SQL o reutilizando `scripts/seed_from_js.py` apuntando a Supabase cuando los secretos estén cargados.

Tablas principales:

- `usuarios` — credenciales + 8 permisos booleanos (6 módulos actuales + estadísticas + clientes)
- `clientes` — base lista para automatización (`origen = automatizacion`)
- `presupuestos` — un campo por dato de gestión (estado, OC, importes, obra, operador, año/mes)
- `presupuesto_items` — granularidad para estadísticas por artículo / rubro
- `presupuesto_avances` — certificación y facturación
- `mails_enviados` — auditoría de envíos

## Correo

Completar `SMTP_*` en secrets. Se envía mail al:

- guardar un presupuesto (si se tilda)
- cambiar de estado (equipo completo)
- certificar avance de obra (equipo + casilla de facturación)
- vencer la fecha límite de OC

Si SMTP no está configurado, el intento queda registrado en `mails_enviados` para reenvío.
