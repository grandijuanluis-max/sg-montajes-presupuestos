from datetime import date

import streamlit as st

from modulos.constants import ESTADOS, normalizar_estado
from modulos.db import get_store, new_id, now_iso
from modulos.mailer import alerta_oc_vencida, enviar_presupuesto, notificar_avance, notificar_cambio_estado


def _filtrar(pedidos: list[dict], modo: str, busqueda: str) -> list[dict]:
    out = []
    for p in pedidos:
        est = normalizar_estado(p.get("estado"))
        p = {**p, "estado": est}
        if modo == "Autorizador":
            if est not in ("Enviado sin OC", "Aprobado sin OC"):
                continue
        elif modo == "Rechazados":
            if est != "Rechazado":
                continue
        elif modo == "EstadoPresupuesto":
            if est in ("Facturado Total", "Rechazado"):
                continue
        if busqueda:
            blob = " ".join([
                str(p.get("numero") or ""),
                str(p.get("cliente_nombre") or ""),
                str(p.get("cuit") or ""),
                str(p.get("meca_denominacion") or ""),
            ]).lower()
            if busqueda.lower() not in blob:
                continue
        out.append(p)
    return out


def render_listado(modo: str):
    titulos = {
        "Autorizador": "Autorización de Presupuestos",
        "EstadoPresupuesto": "Estado del Presupuesto",
        "Rechazados": "Rechazo de Presupuesto",
        "Seguimiento": "Seguimiento",
    }
    st.header(titulos.get(modo, "Presupuestos"))
    store = get_store()
    pedidos = store.fetch_all_paged("presupuestos", order="fecha", desc=True)
    _chequear_alertas_oc(store, pedidos)

    busqueda = st.text_input("Buscar por número, cliente o CUIT", key=f"q_{modo}")
    filtrados = _filtrar(pedidos, modo, busqueda)

    c1, c2, c3 = st.columns(3)
    c1.metric("Registros", len(filtrados))
    c2.metric("Importe", f"${sum(float(p.get('importe') or 0) for p in filtrados):,.2f}")
    c3.metric("Facturado", f"${sum(float(p.get('monto_facturado_total') or 0) for p in filtrados):,.2f}")

    if not filtrados:
        st.info("No hay presupuestos en esta bandeja.")
        return

    opciones = {f"{p['numero']} · {p.get('cliente_nombre')} · {p.get('estado')} · ${float(p.get('importe') or 0):,.2f}": p for p in filtrados}
    st.dataframe(
        [{
            "Número": p.get("numero"),
            "Fecha": p.get("fecha"),
            "Cliente": p.get("cliente_nombre"),
            "Tipo": p.get("tipo_presupuesto"),
            "Importe": float(p.get("importe") or 0),
            "Estado": p.get("estado"),
            "OC": p.get("nro_oc") or p.get("meca_nro_oc"),
            "Operador": p.get("operador"),
        } for p in filtrados],
        use_container_width=True,
        hide_index=True,
    )

    elegido = st.selectbox("Abrir presupuesto", list(opciones.keys()), key=f"sel_{modo}")
    p = opciones[elegido]
    _detalle(store, p, modo)


def _detalle(store, p: dict, modo: str):
    st.subheader(p.get("numero"))
    c1, c2, c3, c4 = st.columns(4)
    c1.write(f"**Cliente:** {p.get('cliente_nombre')}")
    c2.write(f"**CUIT:** {p.get('cuit')}")
    c3.write(f"**Tipo:** {p.get('tipo_presupuesto')}")
    c4.write(f"**Estado:** {p.get('estado')}")
    st.write(f"**Obra:** {p.get('meca_denominacion') or '-'} · **OC:** {p.get('meca_nro_oc') or p.get('nro_oc') or '-'}")
    if p.get("motivo_rechazo"):
        st.error(f"Motivo de rechazo: {p['motivo_rechazo']}")

    items = store.select("presupuesto_items", {"presupuesto_id": p["id"]}, order="codigo")
    if items:
        st.dataframe(
            [{
                "Código": i.get("codigo"),
                "Detalle": i.get("detalle"),
                "Cant.": i.get("cantidad"),
                "Precio": i.get("precio"),
                "Subtotal": i.get("subtotal"),
                "Estado ítem": i.get("estado"),
            } for i in items],
            use_container_width=True,
            hide_index=True,
        )

    if modo == "Autorizador":
        _acciones_autorizacion(store, p, items)
    if modo in ("EstadoPresupuesto", "Seguimiento"):
        _acciones_estado(store, p)
    if modo == "Seguimiento":
        _acciones_avance(store, p)
        if st.button("Reenviar presupuesto por mail"):
            ok, msg = enviar_presupuesto(p, extra_destinatarios=[st.session_state.get("user_email")])
            (st.success if ok else st.warning)(msg)


def _acciones_autorizacion(store, p, items):
    st.markdown("#### Resolución")
    decision = st.radio("Decisión", ["Aceptado / Autorizado", "Rechazado"], horizontal=True)
    motivo = ""
    if decision == "Rechazado":
        motivo = st.text_area("Motivo del rechazo (obligatorio)")
    if st.button("Aceptar resolución", type="primary"):
        if decision == "Rechazado":
            if not motivo.strip():
                st.error("El motivo de rechazo es obligatorio.")
                return
            store.update("presupuestos", {"id": p["id"]}, {
                "estado": "Rechazado",
                "motivo_rechazo": motivo.strip(),
                "fecha_resolucion": date.today().isoformat(),
            })
            for item in items:
                if item.get("estado") != "Autorizado":
                    store.update("presupuesto_items", {"id": item["id"]}, {"estado": "Rechazado", "cantidad": 0, "subtotal": 0})
            notificar_cambio_estado({**p, "motivo_rechazo": motivo}, "Rechazado")
            st.success("Presupuesto rechazado.")
        else:
            nuevo = "Aprobado con OC" if (p.get("nro_oc") or p.get("meca_nro_oc")) else "Aprobado sin OC"
            store.update("presupuestos", {"id": p["id"]}, {
                "estado": nuevo,
                "fecha_resolucion": date.today().isoformat(),
            })
            for item in items:
                store.update("presupuesto_items", {"id": item["id"]}, {"estado": "Autorizado"})
            notificar_cambio_estado({**p, "estado": nuevo}, nuevo)
            st.success(f"Presupuesto autorizado ({nuevo}).")
        st.rerun()


def _acciones_estado(store, p):
    st.markdown("#### Cambiar estado")
    actual = normalizar_estado(p.get("estado"))
    idx = ESTADOS.index(actual) if actual in ESTADOS else 0
    nuevo = st.selectbox("Nuevo estado", ESTADOS, index=idx)
    nro_oc = st.text_input("Número de OC", value=p.get("meca_nro_oc") or p.get("nro_oc") or "")
    motivo = st.text_input("Motivo de rechazo", value=p.get("motivo_rechazo") or "")
    if st.button("Guardar estado", type="primary"):
        if nuevo == "Aprobado con OC" and not nro_oc.strip():
            st.error("La OC es obligatoria para 'Aprobado con OC'.")
            return
        if nuevo == "Rechazado" and not motivo.strip():
            st.error("El motivo de rechazo es obligatorio.")
            return
        store.update("presupuestos", {"id": p["id"]}, {
            "estado": nuevo,
            "meca_nro_oc": nro_oc.strip(),
            "nro_oc": nro_oc.strip(),
            "motivo_rechazo": motivo.strip() if nuevo == "Rechazado" else p.get("motivo_rechazo") or "",
            "fecha_resolucion": date.today().isoformat(),
        })
        ok, msg = notificar_cambio_estado({**p, "meca_nro_oc": nro_oc, "nro_oc": nro_oc}, nuevo)
        st.success(f"Estado actualizado a {nuevo}.")
        st.info(msg)
        st.rerun()


def _acciones_avance(store, p):
    st.markdown("#### Avance de obra / certificación")
    avances = store.select("presupuesto_avances", {"presupuesto_id": p["id"]}, order="fecha")
    if avances:
        st.dataframe(
            [{
                "Fecha": a.get("fecha"),
                "%": a.get("porcentaje"),
                "Monto": a.get("monto"),
                "Doc": a.get("nro_doc"),
                "Detalle": a.get("detalle"),
            } for a in avances],
            use_container_width=True,
            hide_index=True,
        )
    acc = float(p.get("avance_porcentaje_acumulado") or 0)
    st.caption(f"Acumulado: {acc:.1f}% · Facturado ${float(p.get('monto_facturado_total') or 0):,.2f}")
    c1, c2, c3 = st.columns(3)
    pct = c1.number_input("Porcentaje del hito", min_value=0.0, max_value=float(max(0, 100 - acc)), value=min(25.0, max(0.0, 100 - acc)))
    fecha = c2.date_input("Fecha de certificación", value=date.today())
    nro_doc = c3.text_input("Nro. documento")
    detalle = st.text_input("Detalle del hito")
    monto = float(p.get("importe") or 0) * (pct / 100)
    st.write(f"Monto del hito: **${monto:,.2f}**")
    if st.button("Certificar avance"):
        if pct <= 0:
            st.error("Ingresá un porcentaje mayor a 0.")
            return
        store.insert("presupuesto_avances", {
            "id": new_id(),
            "presupuesto_id": p["id"],
            "numero_presupuesto": p.get("numero"),
            "fecha": fecha.isoformat(),
            "porcentaje": pct,
            "monto": monto,
            "nro_doc": nro_doc,
            "detalle": detalle,
            "created_by": st.session_state.get("username") or "",
            "created_at": now_iso(),
        })
        nuevo_acc = acc + pct
        nuevo_fact = float(p.get("monto_facturado_total") or 0) + monto
        nuevo_estado = p.get("estado")
        if nuevo_acc >= 100:
            nuevo_estado = "Facturado Total"
        elif nuevo_acc > 0:
            nuevo_estado = "Facturado Parcial"
        store.update("presupuestos", {"id": p["id"]}, {
            "avance_porcentaje_acumulado": nuevo_acc,
            "monto_facturado_total": nuevo_fact,
            "estado": nuevo_estado,
        })
        p2 = {**p, "avance_porcentaje_acumulado": nuevo_acc, "monto_facturado_total": nuevo_fact, "estado": nuevo_estado}
        ok, msg = notificar_avance(p2, {"porcentaje": pct, "monto": monto})
        st.success("Avance certificado.")
        st.info(msg)
        st.rerun()


def _chequear_alertas_oc(store, pedidos):
    hoy = date.today().isoformat()
    for p in pedidos:
        if normalizar_estado(p.get("estado")) != "Enviado sin OC":
            continue
        limite = p.get("oc_limite_fecha")
        if not limite:
            continue
        if str(limite)[:10] <= hoy and not p.get("oc_alerta_enviada"):
            alerta_oc_vencida(p)
            store.update("presupuestos", {"id": p["id"]}, {"oc_alerta_enviada": True})
