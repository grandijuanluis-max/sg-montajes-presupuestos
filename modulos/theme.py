"""Identidad visual SG MONTAJES: glass, azul, amarillo y logo original."""

from __future__ import annotations

import base64
import random
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

ROOT = Path(__file__).resolve().parent.parent
LOGO_PATH = ROOT / "logo_sg_montajes.png"
LOGO_TRANS_PATH = ROOT / "logo_sg_montajes_transparente.png"

QUOTES = [
    "La perseverancia puede transformar el fracaso en un logro extraordinario.",
    "El éxito comercial se construye con decisiones rápidas y análisis precisos.",
    "Tu dedicación de hoy determina el crecimiento de toda la organización mañana.",
    "Un cliente satisfecho es la mejor estrategia de negocios de todas.",
    "La excelencia no es un acto, es un hábito que se cultiva día a día.",
    "La mejor publicidad es la que hacen los clientes satisfechos.",
    "El servicio al cliente no es un departamento, es una actitud.",
    "La confianza de nuestros clientes se gana con transparencia, consistencia y resultados.",
    "Cada pedido es una oportunidad para superar las expectativas y consolidar una alianza.",
    "El valor de una empresa se mide por la lealtad y el éxito de quienes confían en ella.",
]

THEME_CSS = """
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

:root {
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --warning: #fbbf24;
  --success: #10b981;
  --danger: #f43f5e;
  --text-main: #ffffff;
  --text-muted: #cbd5e1;
  --glass-bg: rgba(15, 23, 42, 0.86);
  --glass-border: rgba(37, 99, 235, 0.42);
}

html, body, [data-testid="stAppViewContainer"], .stApp {
  font-family: 'Inter', system-ui, sans-serif !important;
  color: var(--text-main) !important;
}

.stApp {
  background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 48%, #0f172a 100%) !important;
  background-attachment: fixed !important;
}

[data-testid="stHeader"] { background: transparent !important; }
[data-testid="stToolbar"] { visibility: hidden; height: 0; }

[data-testid="stSidebar"] {
  background: rgba(15, 23, 42, 0.95) !important;
  border-right: 1px solid rgba(37, 99, 235, 0.35);
  box-shadow: 4px 0 24px rgba(0,0,0,0.28);
}
[data-testid="stSidebar"] * { color: #f8fafc !important; }
[data-testid="stSidebar"] .stRadio label {
  font-weight: 600 !important;
  letter-spacing: 0.2px;
}

.block-container {
  padding-top: 1.4rem !important;
  max-width: 1400px !important;
}

[data-testid="stForm"],
[data-testid="stExpander"],
[data-testid="stMetric"],
[data-testid="stDataFrame"] {
  background: var(--glass-bg) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 16px !important;
  box-shadow: 0 8px 32px rgba(0,0,0,0.25) !important;
  backdrop-filter: blur(12px);
}

[data-testid="stMetric"] { padding: 12px 16px !important; }
[data-testid="stMetricLabel"] { color: #cbd5e1 !important; }
[data-testid="stMetricValue"] { color: #fbbf24 !important; font-weight: 800 !important; }

.stTextInput input, .stNumberInput input, .stTextArea textarea,
.stSelectbox [data-baseweb="select"] > div {
  background: rgba(15, 23, 42, 0.72) !important;
  color: #ffffff !important;
  border: 1px solid rgba(37, 99, 235, 0.35) !important;
  border-radius: 8px !important;
}

.stButton > button, .stFormSubmitButton > button {
  background: #2563eb !important;
  color: #ffffff !important;
  border: none !important;
  border-radius: 8px !important;
  font-weight: 700 !important;
  letter-spacing: 0.3px !important;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35) !important;
}
.stButton > button:hover, .stFormSubmitButton > button:hover {
  background: #1d4ed8 !important;
}

h1, h2, h3 {
  color: #ffffff !important;
  font-weight: 700 !important;
  letter-spacing: 0.4px !important;
}

.sg-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.sg-brand-title {
  font-size: 26px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 1.2px;
  line-height: 1.1;
}
.sg-brand-title span {
  font-weight: 400;
  color: #fbbf24;
  letter-spacing: 1.6px;
}
.sg-subtitle {
  color: #93c5fd;
  font-size: 15px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 4px 0 10px 0;
}
.sg-quote {
  font-style: italic;
  color: #bfdbfe;
  font-size: 13px;
  text-align: center;
  margin: 0 0 14px 0;
}
.sg-login-shell {
  max-width: 460px;
  margin: 2vh auto 0 auto;
  padding: 8px 8px 4px 8px;
}
.sg-sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 2px 12px 2px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  margin-bottom: 10px;
}
.sg-sidebar-brand span {
  font-weight: 800;
  font-size: 14px;
  letter-spacing: 0.5px;
  color: #ffffff;
}
.sg-sidebar-brand span em {
  font-style: normal;
  font-weight: 400;
  color: #fbbf24;
}
.sg-user-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(37, 99, 235, 0.18);
  border: 1px solid rgba(37, 99, 235, 0.4);
  color: #93c5fd;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}
.sg-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 16px;
  margin-bottom: 18px;
  background: rgba(15, 23, 42, 0.78);
  border: 1px solid rgba(37, 99, 235, 0.35);
  border-radius: 14px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.22);
}
.sg-topbar-quote {
  flex: 1;
  text-align: center;
  font-style: italic;
  color: #60a5fa;
  font-weight: 500;
  font-size: 14px;
}
#sg-watermark {
  position: fixed;
  inset: 0;
  background-repeat: no-repeat;
  background-position: center 42%;
  background-size: 40% auto;
  opacity: 0.08;
  pointer-events: none;
  z-index: 0;
}
iframe[title="theme_inject"] { display: none !important; height: 0 !important; }
"""


def _data_uri(path: Path) -> str:
    if not path.exists():
        return ""
    b64 = base64.b64encode(path.read_bytes()).decode()
    suffix = path.suffix.lower().replace(".", "") or "png"
    return f"data:image/{suffix};base64,{b64}"


def logo_path() -> str:
    if LOGO_PATH.exists():
        return str(LOGO_PATH)
    return str(LOGO_TRANS_PATH)


def quote() -> str:
    if "ui_quote" not in st.session_state:
        st.session_state["ui_quote"] = random.choice(QUOTES)
    return st.session_state["ui_quote"]


def apply_theme() -> None:
    watermark = _data_uri(LOGO_PATH)
    css = THEME_CSS.replace("\\", "\\\\").replace("`", "\\`")
    components.html(
        f"""
        <script>
          const doc = window.parent.document;
          let style = doc.getElementById('sg-theme-css');
          if (!style) {{
            style = doc.createElement('style');
            style.id = 'sg-theme-css';
            doc.head.appendChild(style);
          }}
          style.innerHTML = `{css}`;
          let mark = doc.getElementById('sg-watermark');
          if (!mark) {{
            mark = doc.createElement('div');
            mark.id = 'sg-watermark';
            doc.body.appendChild(mark);
          }}
          mark.style.backgroundImage = "url('{watermark}')";
        </script>
        """,
        height=0,
    )


def render_login_header() -> None:
    c1, c2, c3 = st.columns([1, 2, 1])
    with c2:
        if Path(logo_path()).exists():
            st.image(logo_path(), width=170)
    st.markdown(
        '<div class="sg-brand"><div class="sg-brand-title">SG <span>MONTAJES</span></div>'
        '<div class="sg-subtitle">Gestión de Presupuestos</div>'
        f'<div class="sg-quote">{quote()}</div></div>',
        unsafe_allow_html=True,
    )


def close_login_header() -> None:
    return


def render_sidebar_brand(backend: str) -> None:
    st.markdown(
        '<div class="sg-sidebar-brand"><span>SG <em>MONTAJES</em></span></div>',
        unsafe_allow_html=True,
    )
    if Path(logo_path()).exists():
        st.image(logo_path(), width=132)
    st.markdown(
        f'<span class="sg-user-chip">{st.session_state.get("username")} · '
        f'{st.session_state.get("role")}</span>',
        unsafe_allow_html=True,
    )
    st.caption(f"Motor de datos: {backend}")


def render_topbar() -> None:
    st.markdown(
        f'<div class="sg-topbar"><span class="sg-brand-title" style="font-size:16px;">SG '
        f'<span>MONTAJES</span></span><div class="sg-topbar-quote">{quote()}</div>'
        f'<span class="sg-user-chip">{st.session_state.get("username")} · '
        f'{st.session_state.get("role")}</span></div>',
        unsafe_allow_html=True,
    )


MENU_ICONOS = {
    "Gestión de Presupuestos": "📝 Gestión de Presupuestos",
    "Autorización": "✅ Autorización",
    "Estado del Presupuesto": "📊 Estado del Presupuesto",
    "Rechazados": "❌ Rechazados",
    "Seguimiento": "🕒 Seguimiento",
    "Estadísticas": "📈 Estadísticas",
    "Clientes": "👥 Clientes",
    "Configuración": "⚙️ Configuración",
}
