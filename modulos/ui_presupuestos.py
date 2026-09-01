from datetime import date

import streamlit as st

from modulos.db import get_store, new_id, now_iso
from modulos.mailer import enviar_presupuesto


def _catalogo(store, rubro: str) -> list[dict]:
    rows = store.select("catalogo_articulos", {"rubro": rubro, "estado": "ACTIVOS"}, order="detalle")
    if rows:
        return rows
    # Fallback: si aún no se sembró el catálogo, no bloquea la carga
    return []


def _clientes(store) -> list[dict]:
    return store.select("clientes", order="nombre")


def _subtotales(items: list[dict], rubro: str) -> tuple[float, float, float]:
    materiales = 0.0
    mano_obra = 0.0
    total = 0.0
    for item in items:
        sub = float(item.get("subtotal") or 0)
        total += sub
        codigo = str(item.get("codigo") or "")
        if rubro == "Eléctrico" and codigo.startswith("ELE-"):
            try:
                num = int(codigo.split("-")[1])
            except Exception:
                num = 99
            if num <= 27:
                materiales += sub
            else:
                mano_obra += sub
        else:
            subrubro = (item.get("subrubro") or "").lower()
            if "mano" in subrubro or "hora" in (item.get("udm") or "").lower():
                mano_obra += sub
            else:
                materiales += sub
    return total, materiales, mano_obra


def render_alta_presupuesto():
    st.header("Gestión de Presupuestos")
    store = get_store()
    if "pedido_items" not in st.session_state:
        st.session_state["pedido_items"] = []

    rubro_default = st.session_state.get("rubro_defecto") or "Eléctrico"
    tipo = st.radio("Tipo de presupuesto", ["Eléctrico", "Mecánico"],
                    index=0 if rubro_default == "Eléctrico" else 1, horizontal=True)

    clientes = _clientes(store)
    condiciones = store.select("condiciones", order="nombre")
    depositos = store.select("depositos", order="nombre")

    with st.expander("1. Encabezado", expanded=True):
        c1, c2 = st.columns(2)
        nombres = [""] + [f"{c.get('codigo')} — {c.get('nombre')}" for c in clientes]
        elegido = c1.selectbox("Cliente", nombres)
        cliente = next((c for c in clientes if elegido.startswith(f"{c.get('codigo')} —")), None)
        denominacion = c2.text_input("Denominación / obra", value=(cliente.get("nombre") if cliente else ""))
        proveedor = c1.text_input("Proveedor", value="SG MONTAJES SRL")
        planta = c2.text_input("Planta", value="")
        fecha_oferta = c1.date_input("Fecha de oferta", value=date.today())
        validez = c2.text_input("Validez", value="5 días")
        nro_oc = c1.text_input("Nro. OC")
        nro_ot = c2.text_input("Nro. OT")
        usa_fechas = c1.checkbox("Cargar fechas de obra", value=False)
        fecha_inicio = c1.date_input("Fecha inicio") if usa_fechas else None
        fecha_fin = c2.date_input("Fecha fin") if usa_fechas else None
        duracion = c1.text_input("Duración")
        email_cliente = c2.text_input("Email del cliente", value=(cliente.get("email") if cliente else "") or "")
        cond_opts = [""] + [f"{c['codigo']} — {c['nombre']}" for c in condiciones]
        cond_sel = c1.selectbox("Condición", cond_opts)
        dep_opts = [""] + [f"{d['codigo']} — {d['nombre']}" for d in depositos]
        dep_sel = c2.selectbox("Depósito", dep_opts)
        motivo = st.text_area("Observaciones / motivo", height=80)
        propuesta = st.text_area("Propuesta", height=80)
        personal = st.text_area("Personal", height=60)
        exclusiones = st.text_area("Exclusiones", height=60)

    catalogo = _catalogo(store, tipo)
    with st.expander("2. Artículos / tarifario", expanded=True):
        if not catalogo:
            st.info("El catálogo aún no está cargado. Usá el alta libre o ejecutá `python scripts/seed_from_js.py`.")
        c1, c2, c3, c4 = st.columns([3, 1, 1, 1])
        labels = [f"{a['codigo']} — {a['detalle']}" for a in catalogo] if catalogo else []
        art_sel = c1.selectbox("Artículo", [""] + labels)
        qty = c2.number_input("Cantidad", min_value=0.0, value=1.0, step=1.0)
        art = next((a for a in catalogo if art_sel.startswith(f"{a['codigo']} —")), None)
        precio_def = float(art["precio"]) if art else 0.0
        precio = c3.number_input("Precio", min_value=0.0, value=precio_def, step=100.0, format="%.2f")
        if c4.button("Agregar", type="primary", use_container_width=True):
            if not art:
                st.warning("Elegí un artículo del tarifario.")
            elif float(art.get("stock") or 0) <= 0:
                st.error("Stock 0: el artículo no tiene unidades disponibles.")
            else:
                items = st.session_state["pedido_items"]
                existente = next((i for i in items if i["codigo"] == art["codigo"]), None)
                if existente:
                    existente["cantidad"] += qty
                    existente["precio"] = precio
                    existente["subtotal"] = existente["cantidad"] * existente["precio"]
                else:
                    items.append({
                        "codigo": art["codigo"],
                        "detalle": art["detalle"],
                        "rubro": art.get("rubro") or tipo,
                        "subrubro": art.get("subrubro") or "",
                        "udm": art.get("udm") or "c/u",
                        "precio": precio,
                        "cantidad": qty,
                        "cantidad_original": qty,
                        "subtotal": qty * precio,
                        "estado": "Pendiente",
                    })
                st.rerun()

        st.markdown("**Alta libre**")
        l1, l2, l3, l4 = st.columns([3, 1, 1, 1])
        det_libre = l1.text_input("Detalle libre", key="det_libre")
        qty_l = l2.number_input("Cant.", min_value=0.0, value=1.0, key="qty_libre")
        precio_l = l3.number_input("Precio libre", min_value=0.0, value=0.0, key="precio_libre")
        if l4.button("Agregar libre", use_container_width=True):
            if det_libre.strip() and qty_l > 0:
                prefix = "ELE-HS" if tipo == "Eléctrico" else "MEC-HS"
                st.session_state["pedido_items"].append({
                    "codigo": f"{prefix}-{new_id()[:4].upper()}",
                    "detalle": det_libre.strip(),
                    "rubro": tipo,
                    "subrubro": "",
                    "udm": "c/u",
                    "precio": precio_l,
                    "cantidad": qty_l,
                    "cantidad_original": qty_l,
                    "subtotal": qty_l * precio_l,
                    "estado": "Pendiente",
                })
                st.rerun()

        items = st.session_state["pedido_items"]
        if items:
            st.dataframe(
                [{
                    "Código": i["codigo"],
                    "Detalle": i["detalle"],
                    "Cantidad": i["cantidad"],
                    "Precio": i["precio"],
                    "Subtotal": i["subtotal"],
                } for i in items],
                use_container_width=True,
                hide_index=True,
            )
            if st.button("Vaciar ítems"):
                st.session_state["pedido_items"] = []
                st.rerun()

    total, materiales, mano_obra = _subtotales(st.session_state["pedido_items"], tipo)
    k1, k2, k3 = st.columns(3)
    k1.metric("Materiales", f"${materiales:,.2f}")
    k2.metric("Mano de obra", f"${mano_obra:,.2f}")
    k3.metric("Total", f"${total:,.2f}")

    enviar = st.checkbox("Enviar mail al cliente al guardar", value=bool(email_cliente))
    if st.button("Confirmar presupuesto", type="primary"):
        items = st.session_state["pedido_items"]
        if not items:
            st.error("El presupuesto debe contener al menos un artículo.")
            return
        if not cliente and not denominacion:
            st.error("Seleccioná un cliente o completá la denominación.")
            return

        numero = store.next_numero(tipo)
        cond = next((c for c in condiciones if cond_sel.startswith(f"{c['codigo']} —")), None)
        dep = next((d for d in depositos if dep_sel.startswith(f"{d['codigo']} —")), None)
        user = st.session_state.get("username") or ""
        row = {
            "numero": numero,
            "fecha": now_iso(),
            "anio": date.today().year,
            "mes": date.today().month,
            "tipo_presupuesto": tipo,
            "tipo_reporte": "detallado",
            "cliente_id": (cliente or {}).get("codigo") or "",
            "cliente_nombre": (cliente or {}).get("nombre") or denominacion,
            "cuit": (cliente or {}).get("cuit") or "",
            "telefono": (cliente or {}).get("telefono") or "",
            "email": email_cliente,
            "vendedor_id": st.session_state.get("vendedor_codigo") or (cliente or {}).get("vendedor_id") or "",
            "vendedor_nombre": st.session_state.get("vendedor_nombre") or (cliente or {}).get("vendedor_nombre") or "",
            "operador": user,
            "operador_vendedor_id": st.session_state.get("vendedor_codigo") or "",
            "operador_vendedor_nombre": st.session_state.get("vendedor_nombre") or "",
            "created_by": st.session_state.get("user_id"),
            "importe": total,
            "importe_original": total,
            "subtotal_materiales": materiales,
            "subtotal_mano_obra": mano_obra,
            "condicion_id": (cond or {}).get("codigo") or "",
            "condicion_nombre": (cond or {}).get("nombre") or "",
            "deposito_id": (dep or {}).get("codigo") or "",
            "deposito_nombre": (dep or {}).get("nombre") or "",
            "motivo": motivo,
            "meca_denominacion": denominacion,
            "meca_proveedor": proveedor,
            "meca_fecha_oferta": fecha_oferta.isoformat() if fecha_oferta else None,
            "meca_validez": validez,
            "meca_planta": planta,
            "meca_nro_oc": nro_oc,
            "nro_oc": nro_oc,
            "meca_nro_ot": nro_ot,
            "meca_fecha_inicio": fecha_inicio.isoformat() if fecha_inicio else None,
            "meca_duracion": duracion,
            "meca_fecha_fin": fecha_fin.isoformat() if fecha_fin else None,
            "meca_propuesta": propuesta,
            "meca_personal": personal,
            "meca_exclusiones": exclusiones,
            "estado": "Aprobado con OC" if nro_oc.strip() else "Enviado sin OC",
        }
        saved = store.insert("presupuestos", row)
        pid = saved.get("id")
        for item in items:
            store.insert("presupuesto_items", {
                **item,
                "id": new_id(),
                "presupuesto_id": pid,
                "numero_presupuesto": numero,
            })
        st.session_state["pedido_items"] = []
        if enviar:
            ok, msg = enviar_presupuesto(row)
            st.info(msg)
        st.success(f"Presupuesto {numero} ingresado.")
        st.rerun()
