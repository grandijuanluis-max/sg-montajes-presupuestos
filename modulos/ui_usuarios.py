import streamlit as st

from modulos.auth import PERMISO_KEYS, permisos_default_rol
from modulos.constants import MODULOS, ROLES, RUBROS
from modulos.db import get_config, get_store, set_config
from modulos.mailer import smtp_configured


def render_usuarios():
    st.header("Configuración del Sistema")
    store = get_store()
    tab_users, tab_perms, tab_mail = st.tabs(["Usuarios", "Permisos", "Correo"])

    usuarios = store.select("usuarios", order="username")

    with tab_users:
        _render_abm_usuarios(store, usuarios)
        st.divider()
        _render_tabla_usuarios(usuarios)

    with tab_perms:
        _render_permisos(store, usuarios)

    with tab_mail:
        _render_mail_config()


def _render_abm_usuarios(store, usuarios):
    modo = st.radio("Acción", ["Crear credencial", "Modificar accesos", "Bloquear / Baja"], horizontal=True)

    if modo == "Crear credencial":
        with st.form("alta_usuario"):
            c1, c2 = st.columns(2)
            username = c1.text_input("Usuario (nombre corto)").strip().lower()
            email = c2.text_input("Email corporativo").strip()
            password = c1.text_input("Contraseña temporal", type="password")
            rubro = c2.selectbox("Rubro predeterminado", RUBROS)
            role = st.selectbox("Rol inicial", [r for r in ROLES if r != "Congelado"], index=1)
            if st.form_submit_button("Crear credencial", type="primary"):
                if not username or not password or not email:
                    st.error("Usuario, email y contraseña son obligatorios.")
                    return
                if any(u.get("username") == username for u in usuarios):
                    st.error("Ese usuario ya existe.")
                    return
                row = {
                    "username": username,
                    "password": password,
                    "email": email,
                    "role": role,
                    "rubro_defecto": rubro,
                    "activo": True,
                    "vendedor_codigo": "",
                    "vendedor_nombre": "",
                    **permisos_default_rol(role),
                }
                store.insert("usuarios", row)
                st.success(f"Usuario {username} creado.")
                st.rerun()

    elif modo == "Modificar accesos":
        if not usuarios:
            st.info("No hay usuarios.")
            return
        labels = {f"{u['username']} ({u.get('email')})": u for u in usuarios}
        elegido = st.selectbox("Empleado", list(labels.keys()))
        u = labels[elegido]
        with st.form("edit_usuario"):
            c1, c2 = st.columns(2)
            username = c1.text_input("Usuario", value=u["username"])
            email = c2.text_input("Email", value=u.get("email") or "")
            password = c1.text_input("Contraseña", value=u.get("password") or "", type="password")
            rubro = c2.selectbox("Rubro", RUBROS, index=RUBROS.index(u.get("rubro_defecto") or "Eléctrico"))
            role = st.selectbox("Rol", ROLES, index=ROLES.index(u.get("role") or "Solicitante"))
            vendedor_codigo = c1.text_input("Código vendedor", value=u.get("vendedor_codigo") or "")
            vendedor_nombre = c2.text_input("Nombre vendedor", value=u.get("vendedor_nombre") or "")
            if st.form_submit_button("Guardar cambios", type="primary"):
                store.update("usuarios", {"id": u["id"]}, {
                    "username": username.strip().lower(),
                    "email": email.strip(),
                    "password": password,
                    "rubro_defecto": rubro,
                    "role": role,
                    "vendedor_codigo": vendedor_codigo,
                    "vendedor_nombre": vendedor_nombre,
                    "activo": role != "Congelado",
                })
                st.success("Credenciales actualizadas.")
                st.rerun()

    else:
        current_id = st.session_state.get("user_id")
        otros = [u for u in usuarios if u["id"] != current_id]
        if not otros:
            st.info("No hay otros usuarios para bloquear.")
            return
        labels = {f"{u['username']} — {u.get('role')}": u for u in otros}
        elegido = st.selectbox("Empleado", list(labels.keys()))
        u = labels[elegido]
        c1, c2 = st.columns(2)
        if c1.button("Congelar cuenta", use_container_width=True):
            store.update("usuarios", {"id": u["id"]}, {"role": "Congelado", "activo": False})
            st.success(f"{u['username']} congelado.")
            st.rerun()
        if c2.button("Eliminar registro", type="primary", use_container_width=True):
            store.delete("usuarios", {"id": u["id"]})
            st.success(f"{u['username']} eliminado.")
            st.rerun()


def _render_tabla_usuarios(usuarios):
    st.subheader("Lista de usuarios")
    if not usuarios:
        st.info("Sin usuarios.")
        return
    rows = []
    for u in usuarios:
        rows.append({
            "Usuario": u.get("username"),
            "Email": u.get("email"),
            "Rol": u.get("role"),
            "Rubro": u.get("rubro_defecto"),
            "Estado": "Congelado" if u.get("role") == "Congelado" or not u.get("activo") else "Activo",
        })
    st.dataframe(rows, use_container_width=True, hide_index=True)


def _render_permisos(store, usuarios):
    if not usuarios:
        st.info("Creá un usuario primero.")
        return
    labels = {u["username"]: u for u in usuarios}
    username = st.selectbox("Usuario a configurar", list(labels.keys()))
    u = labels[username]
    st.caption(f"Rol: **{u.get('role')}** · Email: **{u.get('email')}** · Rubro: **{u.get('rubro_defecto')}**")

    cols = st.columns(2)
    nuevos = {}
    for i, (key, titulo, desc) in enumerate(MODULOS):
        with cols[i % 2]:
            nuevos[key] = st.checkbox(titulo, value=bool(u.get(key)), help=desc, key=f"perm_{u['id']}_{key}")

    c1, c2, c3 = st.columns(3)
    if c1.button("Marcar todos"):
        store.update("usuarios", {"id": u["id"]}, {k: True for k in PERMISO_KEYS})
        st.rerun()
    if c2.button("Desmarcar todos"):
        store.update("usuarios", {"id": u["id"]}, {k: False for k in PERMISO_KEYS})
        st.rerun()
    if c3.button("Guardar permisos", type="primary"):
        store.update("usuarios", {"id": u["id"]}, nuevos)
        st.success(f"Permisos guardados para {username} ({sum(nuevos.values())} módulos).")
        if st.session_state.get("user_id") == u["id"]:
            for k, v in nuevos.items():
                st.session_state[k] = v
        st.rerun()


def _render_mail_config():
    st.subheader("Alertas por email")
    actual = get_config("email_facturacion", "facturacion@sgmontajes.com.ar")
    email = st.text_input("Casilla de facturación (avance de obra)", value=actual)
    if st.button("Guardar email de facturación", type="primary"):
        if not email.strip():
            st.error("Ingresá una casilla válida.")
        else:
            set_config("email_facturacion", email.strip())
            st.success(f"Casilla actualizada a {email.strip()}")

    if smtp_configured():
        st.success("SMTP configurado en secrets — los mails se envían de verdad.")
    else:
        st.warning("SMTP no configurado. Completá SMTP_* en `.streamlit/secrets.toml`. Los envíos quedan registrados en `mails_enviados` para reintento.")

    store = get_store()
    historial = store.select("mails_enviados", order="created_at", desc=True, limit=30)
    if historial:
        st.subheader("Últimos envíos")
        st.dataframe(
            [{
                "Fecha": m.get("created_at"),
                "Tipo": m.get("tipo"),
                "Para": m.get("destinatarios"),
                "Asunto": m.get("asunto"),
                "Estado": m.get("estado_envio"),
                "Error": m.get("error"),
            } for m in historial],
            use_container_width=True,
            hide_index=True,
        )
