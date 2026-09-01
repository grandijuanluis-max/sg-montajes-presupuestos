"""Carga clientes, condiciones, depósitos y tarifario desde los .js existentes."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from modulos.db import get_offline_store, new_id  # noqa: E402


def load_js_arrays(path: Path) -> list:
    if not path.exists():
        print(f"  skip {path.name}")
        return []
    text = path.read_text(encoding="utf-8")
    matches = re.findall(r"=\s*(\[[\s\S]*?\]);", text)
    items = []
    for raw in matches:
        try:
            items.extend(json.loads(raw))
        except json.JSONDecodeError:
            continue
    return items


def main():
    store = get_offline_store()

    clientes = load_js_arrays(ROOT / "clientes_db.js")
    loaded = 0
    for c in clientes:
        codigo = str(c.get("codigo") or "").strip()
        if not codigo:
            continue
        email = c.get("email") or ""
        if str(email).isdigit():
            email = ""
        store.upsert("clientes", {
            "id": new_id(),
            "codigo": codigo,
            "nombre": c.get("nombre") or "",
            "cuit": c.get("cuit") or "",
            "telefono": c.get("telefono") or "",
            "email": email,
            "condicion_id": c.get("condicion_id") or "",
            "condicion_nombre": c.get("condicion_nombre") or "",
            "deposito_id": c.get("deposito_id") or "",
            "deposito_nombre": c.get("deposito_nombre") or "",
            "transporte_id": c.get("transporte_id") or "",
            "transporte_nombre": c.get("transporte_nombre") or "",
            "vendedor_id": c.get("vendedor_id") or "",
            "vendedor_nombre": c.get("vendedor_nombre") or "",
            "estado": c.get("estado") or "ACTIVOS",
            "domicilio": c.get("domicilio") or "",
            "localidad": c.get("localidad") or "",
            "deuda_actual": float(c.get("deuda_actual") or 0),
            "origen": "foxpro",
            "activo": True,
        }, on_conflict="codigo")
        loaded += 1
    print(f"Clientes: {loaded}")

    for c in load_js_arrays(ROOT / "condiciones_db.js"):
        store.local.execute(
            "INSERT OR REPLACE INTO condiciones (codigo, nombre, dias) VALUES (?,?,?)",
            (str(c.get("codigo")), c.get("nombre") or "", int(c.get("dias") or 0)),
        )
    store.local.commit()
    print("Condiciones OK")

    for d in load_js_arrays(ROOT / "depositos_db.js"):
        if d.get("codigo"):
            store.upsert(
                "depositos",
                {"codigo": str(d.get("codigo")), "nombre": d.get("nombre") or ""},
                on_conflict="codigo",
            )
    print("Depósitos OK")

    articulos = load_js_arrays(ROOT / "presupuestos_catalog_db.js")
    count = 0
    for a in articulos:
        if not a.get("codigo"):
            continue
        store.upsert("catalogo_articulos", {
            "codigo": a["codigo"],
            "detalle": a.get("detalle") or "",
            "rubro": a.get("rubro") or "",
            "subrubro": a.get("subrubro") or "",
            "udm": a.get("udm") or "c/u",
            "precio": float(a.get("precio") or 0),
            "stock": float(a.get("stock") or 0),
            "estado": a.get("estado") or "ACTIVOS",
        }, on_conflict="codigo")
        count += 1
    print(f"Artículos de tarifario: {count}")
    print(f"Base local: {ROOT / 'data' / 'local.db'}")


if __name__ == "__main__":
    main()
