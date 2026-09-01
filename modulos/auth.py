import streamlit as st

from modulos.constants import PERMISOS_POR_ROL
from modulos.db import get_store


PERMISO_KEYS = [
    "permiso_ingresar",
    "permiso_autorizacion",
    "permiso_estado",
    "permiso_rechazados",
    "permiso_seguimiento",
    "permiso_config",
    "permiso_estadisticas",
    "permiso_clientes",
]


def _as_bool(val) -> bool:
    if isinstance(val, str):
        return val.strip().upper() in ("TRUE", "1", "T", "SI", "SÍ")
    return bool(val)


def _apply_user(user: dict) -> None:
    st.session_state["logged_in"] = True
    st.session_state["user_id"] = user["id"]
    st.session_state["username"] = user.get("username")
    st.session_state["user_email"] = user.get("email")
    st.session_state["role"] = user.get("role")
    st.session_state["rubro_defecto"] = user.get("rubro_defecto") or "Eléctrico"
    st.session_state["vendedor_codigo"] = user.get("vendedor_codigo") or ""
    st.session_state["vendedor_nombre"] = user.get("vendedor_nombre") or ""
    for key in PERMISO_KEYS:
        st.session_state[key] = _as_bool(user.get(key, False))
    st.session_state["login_error"] = None


def check_login() -> None:
    identificador = (st.session_state.get("login_identificador") or "").strip()
    password = st.session_state.get("login_password") or ""
    if not identificador or not password:
        st.session_state["login_error"] = "Completá usuario y contraseña."
        return

    store = get_store()
    user = None
    for field in ("username", "email"):
        rows = store.select("usuarios", {field: identificador}, limit=1)
        if rows:
            user = rows[0]
            break

    if not user:
        st.session_state["login_error"] = "Usuario no encontrado."
        return
    if user.get("role") == "Congelado" or user.get("activo") is False:
        st.session_state["login_error"] = "La cuenta está bloqueada."
        return
    if user.get("password") != password:
        st.session_state["login_error"] = "Contraseña incorrecta."
        return
    _apply_user(user)


def login_form() -> None:
    store = get_store()
    st.caption(f"Motor de datos: **{store.backend}**")
    with st.form("login_form"):
        st.text_input("Usuario o email", key="login_identificador")
        st.text_input("Contraseña", type="password", key="login_password")
        st.form_submit_button("Ingresar", on_click=check_login)
    if st.session_state.get("login_error"):
        st.error(st.session_state["login_error"])
    st.caption("Usuario inicial: `mel` / `123`  ·  Ventas: `ventas` / `123`")


def logout() -> None:
    keys = ["logged_in", "user_id", "username", "user_email", "role", "rubro_defecto",
            "vendedor_codigo", "vendedor_nombre", "login_error"] + PERMISO_KEYS
    for key in keys:
        st.session_state.pop(key, None)
    st.rerun()


def tiene_permiso(clave: str) -> bool:
    if st.session_state.get("role") == "Administrador":
        return True
    return bool(st.session_state.get(clave, False))


def permisos_default_rol(role: str) -> dict:
    enabled = set(PERMISOS_POR_ROL.get(role, []))
    return {k: (k in enabled) for k in PERMISO_KEYS}
