import pandas as pd
import streamlit as st

from modulos.constants import normalizar_estado
from modulos.db import get_store


def render_estadisticas():
    st.header("Estadísticas")
    st.caption("Consultas paginadas sobre Supabase / SQLite, listas para alto caudal.")
    store = get_store()

    presupuestos = store.fetch_all_paged("presupuestos", order="fecha", desc=True)
    items = store.fetch_all_paged("presupuesto_items")
    if not presupuestos:
        st.info("Todavía no hay presupuestos cargados.")
        return

    df = pd.DataFrame(presupuestos)
    df["estado"] = df["estado"].map(normalizar_estado)
    df["importe"] = pd.to_numeric(df.get("importe"), errors="coerce").fillna(0)
    df["monto_facturado_total"] = pd.to_numeric(df.get("monto_facturado_total"), errors="coerce").fillna(0)
    df["fecha"] = pd.to_datetime(df.get("fecha"), errors="coerce")
    if "anio" not in df.columns or df["anio"].isna().all():
        df["anio"] = df["fecha"].dt.year
    if "mes" not in df.columns or df["mes"].isna().all():
        df["mes"] = df["fecha"].dt.month

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Presupuestos", len(df))
    c2.metric("Importe total", f"${df['importe'].sum():,.2f}")
    c3.metric("Facturado", f"${df['monto_facturado_total'].sum():,.2f}")
    c4.metric("Ticket promedio", f"${df['importe'].mean():,.2f}")

    col_a, col_b = st.columns(2)
    with col_a:
        st.subheader("Por estado")
        st.dataframe(
            df.groupby("estado", dropna=False).agg(cantidad=("numero", "count"), importe=("importe", "sum")).reset_index(),
            use_container_width=True,
            hide_index=True,
        )
    with col_b:
        st.subheader("Por tipo")
        st.dataframe(
            df.groupby("tipo_presupuesto", dropna=False).agg(cantidad=("numero", "count"), importe=("importe", "sum")).reset_index(),
            use_container_width=True,
            hide_index=True,
        )

    st.subheader("Evolución mensual")
    mensual = (
        df.dropna(subset=["anio", "mes"])
        .groupby(["anio", "mes"])
        .agg(cantidad=("numero", "count"), importe=("importe", "sum"), facturado=("monto_facturado_total", "sum"))
        .reset_index()
        .sort_values(["anio", "mes"])
    )
    if not mensual.empty:
        mensual["periodo"] = mensual["anio"].astype(int).astype(str) + "-" + mensual["mes"].astype(int).astype(str).str.zfill(2)
        st.bar_chart(mensual.set_index("periodo")[["importe", "facturado"]])
        st.dataframe(mensual, use_container_width=True, hide_index=True)

    st.subheader("Top clientes")
    top = (
        df.groupby("cliente_nombre", dropna=False)
        .agg(cantidad=("numero", "count"), importe=("importe", "sum"))
        .reset_index()
        .sort_values("importe", ascending=False)
        .head(15)
    )
    st.dataframe(top, use_container_width=True, hide_index=True)

    if items:
        dfi = pd.DataFrame(items)
        dfi["subtotal"] = pd.to_numeric(dfi.get("subtotal"), errors="coerce").fillna(0)
        st.subheader("Por rubro / subrubro (ítems)")
        st.dataframe(
            dfi.groupby(["rubro", "subrubro"], dropna=False)
            .agg(lineas=("codigo", "count"), importe=("subtotal", "sum"))
            .reset_index()
            .sort_values("importe", ascending=False),
            use_container_width=True,
            hide_index=True,
        )

    st.download_button(
        "Descargar presupuestos CSV",
        df.to_csv(index=False).encode("utf-8"),
        file_name="presupuestos.csv",
        mime="text/csv",
    )
