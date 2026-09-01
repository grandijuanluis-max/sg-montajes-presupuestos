import streamlit as st

st.set_page_config(
    page_title="SG MONTAJES — Presupuestos",
    page_icon="logo_sg_montajes.png",
    layout="wide",
    initial_sidebar_state="expanded",
)

from modulos.auth import login_form, logout, tiene_permiso
from modulos.constants import MENU_POR_PERMISO
from modulos.db import get_store
from modulos.theme import MENU_ICONOS, apply_theme, render_sidebar_brand, render_topbar
from modulos.ui_clientes import render_clientes
from modulos.ui_estadisticas import render_estadisticas
from modulos.ui_listados import render_listado
from modulos.ui_presupuestos import render_alta_presupuesto
from modulos.ui_usuarios import render_usuarios


def main():
    apply_theme()

    if "logged_in" not in st.session_state:
        st.session_state["logged_in"] = False

    if not st.session_state["logged_in"]:
        login_form()
        return

    store = get_store()
    with st.sidebar:
        render_sidebar_brand(store.backend)
        st.divider()

        menu = [label for clave, label in MENU_POR_PERMISO if tiene_permiso(clave)]
        if not menu:
            st.warning("Sin módulos habilitados.")
            seleccion = None
        else:
            visible = [MENU_ICONOS.get(m, m) for m in menu]
            elegido = st.radio("Navegación", visible, label_visibility="collapsed")
            seleccion = next((m for m in menu if MENU_ICONOS.get(m, m) == elegido), elegido)

        st.divider()
        if st.button("Cerrar sesión"):
            logout()

    render_topbar()

    if seleccion == "Gestión de Presupuestos":
        render_alta_presupuesto()
    elif seleccion == "Autorización":
        render_listado("Autorizador")
    elif seleccion == "Estado del Presupuesto":
        render_listado("EstadoPresupuesto")
    elif seleccion == "Rechazados":
        render_listado("Rechazados")
    elif seleccion == "Seguimiento":
        render_listado("Seguimiento")
    elif seleccion == "Estadísticas":
        render_estadisticas()
    elif seleccion == "Clientes":
        render_clientes()
    elif seleccion == "Configuración":
        render_usuarios()


if __name__ == "__main__":
    main()
