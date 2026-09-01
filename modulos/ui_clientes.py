import streamlit as st

from modulos.db import get_store


def render_clientes():
    st.header("Base de clientes")
    st.caption("Esta tabla se alimentará por automatización. Hoy se puede consultar, cargar y actualizar.")
    store = get_store()

    q = st.text_input("Buscar por nombre, CUIT o código")
    clientes = store.fetch_all_paged("clientes", order="nombre")
    if q:
        qn = q.strip().lower()
        clientes = [
            c for c in clientes
            if qn in (c.get("nombre") or "").lower()
            or qn in (c.get("cuit") or "")
            or qn in (c.get("codigo") or "")
        ]

    c1, c2, c3 = st.columns(3)
    c1.metric("Clientes", len(clientes))
    c2.metric("Activos", sum(1 for c in clientes if (c.get("estado") or "").upper() != "BAJA"))
    c3.metric("Con email", sum(1 for c in clientes if c.get("email")))

    st.dataframe(
        [{
            "Código": c.get("codigo"),
            "Nombre": c.get("nombre"),
            "CUIT": c.get("cuit"),
            "Email": c.get("email"),
            "Teléfono": c.get("telefono"),
            "Localidad": c.get("localidad"),
            "Condición": c.get("condicion_nombre"),
            "Estado": c.get("estado"),
            "Origen": c.get("origen"),
        } for c in clientes],
        use_container_width=True,
        hide_index=True,
    )

    with st.expander("Alta / actualización manual"):
        with st.form("alta_cliente"):
            c1, c2 = st.columns(2)
            codigo = c1.text_input("Código")
            nombre = c2.text_input("Razón social")
            cuit = c1.text_input("CUIT")
            email = c2.text_input("Email")
            telefono = c1.text_input("Teléfono")
            localidad = c2.text_input("Localidad")
            domicilio = c1.text_input("Domicilio")
            condicion = c2.text_input("Condición de venta")
            if st.form_submit_button("Guardar cliente", type="primary"):
                if not codigo or not nombre:
                    st.error("Código y nombre son obligatorios.")
                else:
                    store.upsert("clientes", {
                        "codigo": codigo.strip(),
                        "nombre": nombre.strip(),
                        "cuit": cuit.strip(),
                        "email": email.strip(),
                        "telefono": telefono.strip(),
                        "localidad": localidad.strip(),
                        "domicilio": domicilio.strip(),
                        "condicion_nombre": condicion.strip(),
                        "estado": "ACTIVOS",
                        "origen": "manual",
                        "activo": True,
                    }, on_conflict="codigo")
                    st.success("Cliente guardado.")
                    st.rerun()
