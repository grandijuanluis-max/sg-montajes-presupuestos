"""Conexión a Supabase con fallback local SQLite para desarrollo y verificación."""

from __future__ import annotations

import json
import os
import sqlite3
import uuid
from datetime import date, datetime
from pathlib import Path
from typing import Any, Optional

import streamlit as st

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
LOCAL_DB = DATA_DIR / "local.db"

PAGE_SIZE = 1000


def _secrets_get(key: str, default=None):
    try:
        return st.secrets.get(key, default)
    except Exception:
        return default


@st.cache_resource
def _init_supabase():
    url = _secrets_get("SUPABASE_URL")
    key = _secrets_get("SUPABASE_KEY")
    if not url or not key or "TU_PROYECTO" in str(url):
        return None
    try:
        from supabase import create_client
        return create_client(url, key)
    except Exception:
        try:
            from utils.supabase_http import create_http_client
            return create_http_client(url, key)
        except Exception as exc:
            st.warning(f"No se pudo abrir Supabase, se usa base local. ({exc})")
            return None


def _sqlite_connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(LOCAL_DB, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


@st.cache_resource
def _init_sqlite() -> sqlite3.Connection:
    conn = _sqlite_connect()
    _ensure_local_schema(conn)
    return conn


def _ensure_local_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS usuarios (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'Solicitante',
            rubro_defecto TEXT NOT NULL DEFAULT 'Eléctrico',
            vendedor_codigo TEXT DEFAULT '',
            vendedor_nombre TEXT DEFAULT '',
            activo INTEGER NOT NULL DEFAULT 1,
            permiso_ingresar INTEGER NOT NULL DEFAULT 0,
            permiso_autorizacion INTEGER NOT NULL DEFAULT 0,
            permiso_estado INTEGER NOT NULL DEFAULT 0,
            permiso_rechazados INTEGER NOT NULL DEFAULT 0,
            permiso_seguimiento INTEGER NOT NULL DEFAULT 0,
            permiso_config INTEGER NOT NULL DEFAULT 0,
            permiso_estadisticas INTEGER NOT NULL DEFAULT 0,
            permiso_clientes INTEGER NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS clientes (
            id TEXT PRIMARY KEY,
            codigo TEXT UNIQUE NOT NULL,
            nombre TEXT NOT NULL,
            cuit TEXT DEFAULT '',
            telefono TEXT DEFAULT '',
            email TEXT DEFAULT '',
            condicion_id TEXT DEFAULT '',
            condicion_nombre TEXT DEFAULT '',
            deposito_id TEXT DEFAULT '',
            deposito_nombre TEXT DEFAULT '',
            transporte_id TEXT DEFAULT '',
            transporte_nombre TEXT DEFAULT '',
            vendedor_id TEXT DEFAULT '',
            vendedor_nombre TEXT DEFAULT '',
            estado TEXT DEFAULT 'ACTIVOS',
            domicilio TEXT DEFAULT '',
            localidad TEXT DEFAULT '',
            provincia TEXT DEFAULT '',
            deuda_actual REAL NOT NULL DEFAULT 0,
            origen TEXT NOT NULL DEFAULT 'manual',
            activo INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS condiciones (
            codigo TEXT NOT NULL,
            nombre TEXT NOT NULL,
            dias INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (codigo, dias)
        );
        CREATE TABLE IF NOT EXISTS depositos (
            codigo TEXT PRIMARY KEY,
            nombre TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS transportes (
            codigo TEXT PRIMARY KEY,
            nombre TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS vendedores (
            codigo TEXT PRIMARY KEY,
            nombre TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS catalogo_articulos (
            codigo TEXT PRIMARY KEY,
            detalle TEXT NOT NULL,
            rubro TEXT NOT NULL,
            subrubro TEXT DEFAULT '',
            udm TEXT DEFAULT 'c/u',
            precio REAL NOT NULL DEFAULT 0,
            stock REAL NOT NULL DEFAULT 0,
            estado TEXT DEFAULT 'ACTIVOS'
        );
        CREATE TABLE IF NOT EXISTS presupuestos (
            id TEXT PRIMARY KEY,
            numero TEXT UNIQUE NOT NULL,
            fecha TEXT DEFAULT CURRENT_TIMESTAMP,
            fecha_resolucion TEXT,
            anio INTEGER,
            mes INTEGER,
            tipo_presupuesto TEXT NOT NULL DEFAULT 'Eléctrico',
            tipo_reporte TEXT DEFAULT 'detallado',
            cliente_id TEXT DEFAULT '',
            cliente_nombre TEXT DEFAULT '',
            cuit TEXT DEFAULT '',
            telefono TEXT DEFAULT '',
            email TEXT DEFAULT '',
            vendedor_id TEXT DEFAULT '',
            vendedor_nombre TEXT DEFAULT '',
            operador TEXT DEFAULT '',
            operador_vendedor_id TEXT DEFAULT '',
            operador_vendedor_nombre TEXT DEFAULT '',
            created_by TEXT,
            importe REAL NOT NULL DEFAULT 0,
            importe_original REAL NOT NULL DEFAULT 0,
            subtotal_materiales REAL NOT NULL DEFAULT 0,
            subtotal_mano_obra REAL NOT NULL DEFAULT 0,
            condicion_id TEXT DEFAULT '',
            condicion_nombre TEXT DEFAULT '',
            deposito_id TEXT DEFAULT '',
            deposito_nombre TEXT DEFAULT '',
            transporte_id TEXT DEFAULT '',
            transporte_nombre TEXT DEFAULT '',
            is_comisionista INTEGER NOT NULL DEFAULT 0,
            tipo_nv TEXT DEFAULT '',
            tipo_entrega TEXT DEFAULT '',
            forma_pago TEXT DEFAULT '',
            motivo TEXT DEFAULT '',
            meca_denominacion TEXT DEFAULT '',
            meca_proveedor TEXT DEFAULT 'SG MONTAJES SRL',
            meca_fecha_oferta TEXT,
            meca_validez TEXT DEFAULT '5 días',
            meca_planta TEXT DEFAULT '',
            meca_nro_oc TEXT DEFAULT '',
            nro_oc TEXT DEFAULT '',
            meca_nro_ot TEXT DEFAULT '',
            meca_fecha_inicio TEXT,
            meca_duracion TEXT DEFAULT '',
            meca_fecha_fin TEXT,
            meca_propuesta TEXT DEFAULT '',
            meca_personal TEXT DEFAULT '',
            meca_exclusiones TEXT DEFAULT '',
            estado TEXT NOT NULL DEFAULT 'Enviado sin OC',
            motivo_bloqueo TEXT DEFAULT '',
            motivo_rechazo TEXT DEFAULT '',
            oc_limite_fecha TEXT,
            oc_alerta_enviada INTEGER NOT NULL DEFAULT 0,
            avance_porcentaje_acumulado REAL NOT NULL DEFAULT 0,
            monto_facturado_total REAL NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS presupuesto_items (
            id TEXT PRIMARY KEY,
            presupuesto_id TEXT NOT NULL,
            numero_presupuesto TEXT NOT NULL,
            codigo TEXT DEFAULT '',
            detalle TEXT DEFAULT '',
            rubro TEXT DEFAULT '',
            subrubro TEXT DEFAULT '',
            udm TEXT DEFAULT 'c/u',
            precio REAL NOT NULL DEFAULT 0,
            cantidad REAL NOT NULL DEFAULT 0,
            cantidad_original REAL NOT NULL DEFAULT 0,
            subtotal REAL NOT NULL DEFAULT 0,
            estado TEXT NOT NULL DEFAULT 'Pendiente',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS presupuesto_avances (
            id TEXT PRIMARY KEY,
            presupuesto_id TEXT NOT NULL,
            numero_presupuesto TEXT NOT NULL,
            fecha TEXT NOT NULL,
            porcentaje REAL NOT NULL DEFAULT 0,
            monto REAL NOT NULL DEFAULT 0,
            nro_doc TEXT DEFAULT '',
            detalle TEXT DEFAULT '',
            created_by TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS notificaciones (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            mensaje TEXT NOT NULL,
            leida INTEGER NOT NULL DEFAULT 0,
            presupuesto_numero TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS mails_enviados (
            id TEXT PRIMARY KEY,
            tipo TEXT NOT NULL,
            destinatarios TEXT NOT NULL,
            asunto TEXT NOT NULL,
            cuerpo TEXT DEFAULT '',
            presupuesto_numero TEXT DEFAULT '',
            estado_envio TEXT NOT NULL DEFAULT 'enviado',
            error TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS configuracion (
            clave TEXT PRIMARY KEY,
            valor TEXT NOT NULL,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS secuencias (
            rubro TEXT PRIMARY KEY,
            prefijo TEXT NOT NULL,
            ultimo_valor INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_p_fecha ON presupuestos (fecha);
        CREATE INDEX IF NOT EXISTS idx_p_estado ON presupuestos (estado);
        CREATE INDEX IF NOT EXISTS idx_p_tipo ON presupuestos (tipo_presupuesto);
        CREATE INDEX IF NOT EXISTS idx_p_cliente ON presupuestos (cliente_id);
        CREATE INDEX IF NOT EXISTS idx_p_cuit ON presupuestos (cuit);
        CREATE INDEX IF NOT EXISTS idx_cli_nombre ON clientes (nombre);
        CREATE INDEX IF NOT EXISTS idx_cli_cuit ON clientes (cuit);
        CREATE INDEX IF NOT EXISTS idx_items_pid ON presupuesto_items (presupuesto_id);
        """
    )
    conn.commit()
    _seed_defaults(conn)


def _seed_defaults(conn: sqlite3.Connection) -> None:
    cur = conn.execute("SELECT COUNT(*) FROM usuarios")
    if cur.fetchone()[0] == 0:
        conn.execute(
            """
            INSERT INTO usuarios (
                id, username, password, email, role, rubro_defecto, activo,
                permiso_ingresar, permiso_autorizacion, permiso_estado,
                permiso_rechazados, permiso_seguimiento, permiso_config,
                permiso_estadisticas, permiso_clientes
            ) VALUES
            (?, 'mel', '123', 'mel@sgmontajes.com.ar', 'Administrador', 'Eléctrico', 1,
             1,1,1,1,1,1,1,1),
            (?, 'ventas', '123', 'ventas@sgmontajes.com.ar', 'Solicitante', 'Eléctrico', 1,
             1,0,1,1,1,0,0,0)
            """,
            (str(uuid.uuid4()), str(uuid.uuid4())),
        )
    cur = conn.execute("SELECT COUNT(*) FROM secuencias")
    if cur.fetchone()[0] == 0:
        conn.execute("INSERT INTO secuencias (rubro, prefijo, ultimo_valor) VALUES ('Eléctrico','102-ELEC',0)")
        conn.execute("INSERT INTO secuencias (rubro, prefijo, ultimo_valor) VALUES ('Mecánico','101-MEC',0)")
    cur = conn.execute("SELECT COUNT(*) FROM configuracion WHERE clave='email_facturacion'")
    if cur.fetchone()[0] == 0:
        conn.execute(
            "INSERT INTO configuracion (clave, valor) VALUES ('email_facturacion', 'facturacion@sgmontajes.com.ar')"
        )
    conn.commit()


class _Result:
    def __init__(self, data: list):
        self.data = data


def new_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def json_safe(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, bool):
        return value
    return value


class DataStore:
    """Capa única: Supabase si hay secretos, SQLite local si no."""

    def __init__(self):
        self.supabase = _init_supabase()
        self.local = None if self.supabase is not None else _init_sqlite()
        self.backend = "supabase" if self.supabase is not None else "local"

    def select(self, table: str, filters: Optional[dict] = None, order: Optional[str] = None,
               desc: bool = False, limit: Optional[int] = None, columns: str = "*") -> list[dict]:
        filters = filters or {}
        if self.supabase is not None:
            return self._sb_select(table, filters, order, desc, limit, columns)
        return self._sql_select(table, filters, order, desc, limit)

    def insert(self, table: str, row: dict) -> dict:
        payload = dict(row)
        tables_with_id = {
            "usuarios", "clientes", "presupuestos", "presupuesto_items",
            "presupuesto_avances", "notificaciones", "mails_enviados",
        }
        if table in tables_with_id:
            payload.setdefault("id", new_id())
        if self.supabase is not None:
            resp = self.supabase.table(table).insert(payload).execute()
            return (resp.data or [payload])[0]
        cols = ", ".join(payload.keys())
        placeholders = ", ".join("?" for _ in payload)
        self.local.execute(
            f"INSERT INTO {table} ({cols}) VALUES ({placeholders})",
            [_bool_to_sql(v) for v in payload.values()],
        )
        self.local.commit()
        return payload

    def update(self, table: str, filters: dict, values: dict) -> None:
        values = dict(values)
        if table in {"usuarios", "clientes", "presupuestos", "configuracion"}:
            values["updated_at"] = now_iso()
        values.pop("id", None)
        if self.supabase is not None:
            q = self.supabase.table(table).update(values)
            for k, v in filters.items():
                q = q.eq(k, v)
            q.execute()
            return
        set_clause = ", ".join(f"{k}=?" for k in values)
        where = " AND ".join(f"{k}=?" for k in filters)
        self.local.execute(
            f"UPDATE {table} SET {set_clause} WHERE {where}",
            [_bool_to_sql(v) for v in values.values()] + list(filters.values()),
        )
        self.local.commit()

    def upsert(self, table: str, row: dict, on_conflict: str = "codigo") -> None:
        if self.supabase is not None:
            self.supabase.table(table).upsert(row, on_conflict=on_conflict).execute()
            return
        existing = self.select(table, {on_conflict: row[on_conflict]}, limit=1)
        if existing:
            self.update(table, {on_conflict: row[on_conflict]}, row)
        else:
            self.insert(table, row)

    def delete(self, table: str, filters: dict) -> None:
        if self.supabase is not None:
            q = self.supabase.table(table)
            # supabase-py delete
            q = q.delete()
            for k, v in filters.items():
                q = q.eq(k, v)
            q.execute()
            return
        where = " AND ".join(f"{k}=?" for k in filters)
        self.local.execute(f"DELETE FROM {table} WHERE {where}", list(filters.values()))
        self.local.commit()

    def fetch_all_paged(self, table: str, filters: Optional[dict] = None,
                        order: Optional[str] = None, desc: bool = False) -> list[dict]:
        """Paginación de 1000 (límite de Supabase) para alto caudal."""
        filters = filters or {}
        rows: list[dict] = []
        offset = 0
        while True:
            if self.supabase is not None:
                q = self.supabase.table(table).select("*")
                for k, v in filters.items():
                    if isinstance(v, dict):
                        op, val = next(iter(v.items()))
                        q = getattr(q, op)(k, val)
                    else:
                        q = q.eq(k, v)
                if order:
                    q = q.order(order, desc=desc)
                q = q.range(offset, offset + PAGE_SIZE - 1)
                chunk = q.execute().data or []
            else:
                chunk = self._sql_select(table, filters, order, desc, PAGE_SIZE, offset)
            rows.extend(chunk)
            if len(chunk) < PAGE_SIZE:
                break
            offset += PAGE_SIZE
        return rows

    def next_numero(self, rubro: str) -> str:
        prefijo = "102-ELEC" if rubro == "Eléctrico" else "101-MEC"
        if self.supabase is not None:
            current = self.select("secuencias", {"rubro": rubro}, limit=1)
            ultimo = int((current[0]["ultimo_valor"] if current else 0) or 0) + 1
            if current:
                self.update("secuencias", {"rubro": rubro}, {"ultimo_valor": ultimo})
            else:
                self.insert("secuencias", {"rubro": rubro, "prefijo": prefijo, "ultimo_valor": ultimo})
            return f"{prefijo}-{ultimo:04d}"
        row = self.local.execute("SELECT ultimo_valor FROM secuencias WHERE rubro=?", (rubro,)).fetchone()
        ultimo = (row["ultimo_valor"] if row else 0) + 1
        self.local.execute(
            "INSERT INTO secuencias (rubro, prefijo, ultimo_valor) VALUES (?,?,?) "
            "ON CONFLICT(rubro) DO UPDATE SET ultimo_valor=excluded.ultimo_valor",
            (rubro, prefijo, ultimo),
        )
        self.local.commit()
        return f"{prefijo}-{ultimo:04d}"

    def _sb_select(self, table, filters, order, desc, limit, columns) -> list[dict]:
        q = self.supabase.table(table).select(columns)
        for k, v in filters.items():
            if isinstance(v, dict):
                op, val = next(iter(v.items()))
                q = getattr(q, op)(k, val)
            else:
                q = q.eq(k, v)
        if order:
            q = q.order(order, desc=desc)
        if limit:
            q = q.limit(limit)
        return q.execute().data or []

    def _sql_select(self, table, filters, order, desc, limit, offset: int = 0) -> list[dict]:
        where_parts = []
        params: list[Any] = []
        for k, v in filters.items():
            if isinstance(v, dict):
                op, val = next(iter(v.items()))
                if op == "ilike":
                    where_parts.append(f"{k} LIKE ?")
                    params.append(str(val).replace("%", "%").replace("*", "%"))
                elif op == "gte":
                    where_parts.append(f"{k} >= ?")
                    params.append(val)
                elif op == "lte":
                    where_parts.append(f"{k} <= ?")
                    params.append(val)
                elif op == "in_":
                    placeholders = ",".join("?" for _ in val)
                    where_parts.append(f"{k} IN ({placeholders})")
                    params.extend(val)
                else:
                    where_parts.append(f"{k} = ?")
                    params.append(val)
            else:
                where_parts.append(f"{k} = ?")
                params.append(_bool_to_sql(v))
        sql = f"SELECT * FROM {table}"
        if where_parts:
            sql += " WHERE " + " AND ".join(where_parts)
        if order:
            sql += f" ORDER BY {order} {'DESC' if desc else 'ASC'}"
        if limit:
            sql += f" LIMIT {int(limit)} OFFSET {int(offset)}"
        cur = self.local.execute(sql, params)
        return [_row_to_dict(r) for r in cur.fetchall()]


def _bool_to_sql(v: Any) -> Any:
    if isinstance(v, bool):
        return 1 if v else 0
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    return v


def _row_to_dict(row: sqlite3.Row) -> dict:
    out = dict(row)
    for key, val in list(out.items()):
        if key.startswith("permiso_") or key in ("activo", "is_comisionista", "oc_alerta_enviada", "leida"):
            out[key] = bool(val)
    return out


def get_offline_store() -> DataStore:
    """Store SQLite sin secretos ni caché de Streamlit (scripts / tests)."""
    store = DataStore.__new__(DataStore)
    store.supabase = None
    store.local = _sqlite_connect()
    _ensure_local_schema(store.local)
    store.backend = "local"
    return store


@st.cache_resource
def get_store() -> DataStore:
    return DataStore()


def get_config(clave: str, default: str = "") -> str:
    rows = get_store().select("configuracion", {"clave": clave}, limit=1)
    if rows:
        return rows[0].get("valor") or default
    return default


def set_config(clave: str, valor: str) -> None:
    store = get_store()
    existing = store.select("configuracion", {"clave": clave}, limit=1)
    if existing:
        store.update("configuracion", {"clave": clave}, {"valor": valor})
    else:
        store.insert("configuracion", {"clave": clave, "valor": valor})
