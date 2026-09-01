"""Verifica login, alta de presupuesto, cambio de estado, avance y registro de mails."""

from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from modulos.constants import normalizar_estado
from modulos.db import get_offline_store, new_id, now_iso
from modulos.mailer import enviar_presupuesto, notificar_avance, notificar_cambio_estado


def main():
    store = get_offline_store()

    users = store.select("usuarios", {"username": "mel"}, limit=1)
    assert users, "Falta usuario mel"
    assert users[0]["permiso_config"] is True
    assert users[0]["password"] == "123"
    print("OK login/usuario administrador")

    clientes = store.select("clientes", order="nombre")
    assert clientes, "Falta sembrar clientes (python scripts/seed_from_js.py)"
    cliente = clientes[0]
    print(f"OK clientes ({len(clientes)})")

    catalogo = store.select("catalogo_articulos", {"rubro": "Eléctrico"}, limit=5)
    assert catalogo, "Falta sembrar tarifario"
    art = catalogo[0]
    print(f"OK tarifario (ej: {art['codigo']})")

    numero = store.next_numero("Eléctrico")
    total = float(art.get("precio") or 0) * 2
    saved = store.insert("presupuestos", {
        "numero": numero,
        "fecha": now_iso(),
        "anio": date.today().year,
        "mes": date.today().month,
        "tipo_presupuesto": "Eléctrico",
        "cliente_id": cliente.get("codigo"),
        "cliente_nombre": cliente.get("nombre"),
        "cuit": cliente.get("cuit"),
        "email": cliente.get("email") or "prueba@sgmontajes.com.ar",
        "operador": "mel",
        "importe": total,
        "importe_original": total,
        "estado": "Enviado sin OC",
        "meca_denominacion": "Prueba smoke",
    })
    store.insert("presupuesto_items", {
        "id": new_id(),
        "presupuesto_id": saved["id"],
        "numero_presupuesto": numero,
        "codigo": art["codigo"],
        "detalle": art["detalle"],
        "rubro": art.get("rubro") or "Eléctrico",
        "subrubro": art.get("subrubro") or "",
        "udm": art.get("udm") or "c/u",
        "precio": art.get("precio") or 0,
        "cantidad": 2,
        "cantidad_original": 2,
        "subtotal": total,
        "estado": "Pendiente",
    })
    print(f"OK alta presupuesto {numero}")

    store.update("presupuestos", {"id": saved["id"]}, {
        "estado": "Aprobado sin OC",
        "fecha_resolucion": date.today().isoformat(),
    })
    ok, msg = notificar_cambio_estado({**saved, "estado": "Aprobado sin OC"}, "Aprobado sin OC")
    print(f"OK cambio estado ({msg})")

    store.insert("presupuesto_avances", {
        "id": new_id(),
        "presupuesto_id": saved["id"],
        "numero_presupuesto": numero,
        "fecha": date.today().isoformat(),
        "porcentaje": 25,
        "monto": total * 0.25,
        "nro_doc": "AV-TEST",
        "detalle": "Hito smoke",
        "created_by": "mel",
        "created_at": now_iso(),
    })
    store.update("presupuestos", {"id": saved["id"]}, {
        "avance_porcentaje_acumulado": 25,
        "monto_facturado_total": total * 0.25,
        "estado": "Facturado Parcial",
    })
    ok, msg = notificar_avance(
        {**saved, "avance_porcentaje_acumulado": 25, "monto_facturado_total": total * 0.25},
        {"porcentaje": 25, "monto": total * 0.25},
    )
    print(f"OK avance ({msg})")

    ok, msg = enviar_presupuesto({**saved, "email": "prueba@sgmontajes.com.ar"})
    print(f"OK mail presupuesto ({msg})")

    mails = store.select("mails_enviados", order="created_at", desc=True, limit=10)
    tipos = {m["tipo"] for m in mails}
    assert "cambio_estado" in tipos
    assert "facturacion_avance" in tipos
    assert "presupuesto" in tipos
    print(f"OK auditoría mails ({len(mails)} registros, tipos={sorted(tipos)})")

    p = store.select("presupuestos", {"numero": numero}, limit=1)[0]
    assert normalizar_estado(p["estado"]) == "Facturado Parcial"
    items = store.select("presupuesto_items", {"presupuesto_id": saved["id"]})
    assert items
    print("OK consistencia final")
    print("SMOKE TEST OK")


if __name__ == "__main__":
    main()
