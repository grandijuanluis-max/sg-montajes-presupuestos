"""Envío de mails de presupuestos, cambios de estado y facturación."""

from __future__ import annotations

import smtplib
from email.message import EmailMessage
from typing import Iterable, Optional

import streamlit as st

from modulos.db import get_config, get_store, new_id, now_iso


def _secret(key: str, default=None):
    try:
        return st.secrets.get(key, default)
    except Exception:
        return default


def smtp_configured() -> bool:
    return bool(_secret("SMTP_HOST") and _secret("SMTP_USER") and _secret("SMTP_PASSWORD"))


def _send_smtp(destinatarios: list[str], asunto: str, cuerpo: str) -> tuple[bool, str]:
    host = _secret("SMTP_HOST")
    port = int(_secret("SMTP_PORT", 587) or 587)
    user = _secret("SMTP_USER")
    password = _secret("SMTP_PASSWORD")
    mail_from = _secret("SMTP_FROM") or user
    use_tls = str(_secret("SMTP_USE_TLS", True)).lower() not in ("false", "0", "no")

    msg = EmailMessage()
    msg["Subject"] = asunto
    msg["From"] = mail_from
    msg["To"] = ", ".join(destinatarios)
    msg.set_content(cuerpo)

    with smtplib.SMTP(host, port, timeout=30) as smtp:
        if use_tls:
            smtp.starttls()
        smtp.login(user, password)
        smtp.send_message(msg)
    return True, ""


def registrar_mail(tipo: str, destinatarios: Iterable[str], asunto: str, cuerpo: str,
                   numero: str = "", ok: bool = True, error: str = "") -> None:
    store = get_store()
    store.insert("mails_enviados", {
        "id": new_id(),
        "tipo": tipo,
        "destinatarios": ", ".join([d for d in destinatarios if d]),
        "asunto": asunto,
        "cuerpo": cuerpo,
        "presupuesto_numero": numero,
        "estado_envio": "enviado" if ok else "error",
        "error": error,
        "created_at": now_iso(),
    })


def enviar_mail(tipo: str, destinatarios: Iterable[str], asunto: str, cuerpo: str,
                numero: str = "") -> tuple[bool, str]:
    dest = [d.strip() for d in destinatarios if d and str(d).strip()]
    if not dest:
        registrar_mail(tipo, [], asunto, cuerpo, numero, ok=False, error="Sin destinatarios")
        return False, "No hay destinatarios de correo."

    if not smtp_configured():
        registrar_mail(tipo, dest, asunto, cuerpo, numero, ok=False, error="SMTP no configurado")
        return False, "SMTP no configurado. El mail quedó registrado para reenvío."

    try:
        _send_smtp(dest, asunto, cuerpo)
        registrar_mail(tipo, dest, asunto, cuerpo, numero, ok=True)
        return True, "Mail enviado."
    except Exception as exc:
        registrar_mail(tipo, dest, asunto, cuerpo, numero, ok=False, error=str(exc))
        return False, f"Error al enviar mail: {exc}"


def emails_equipo() -> list[str]:
    users = get_store().select("usuarios", {"activo": True})
    return [u.get("email") for u in users if u.get("email") and u.get("role") != "Congelado"]


def notificar_usuarios(mensaje: str, numero: str = "") -> None:
    store = get_store()
    for u in store.select("usuarios", {"activo": True}):
        store.insert("notificaciones", {
            "id": new_id(),
            "user_id": u["id"],
            "mensaje": mensaje,
            "leida": False,
            "presupuesto_numero": numero,
            "created_at": now_iso(),
        })


def cuerpo_presupuesto(p: dict) -> str:
    nro = p.get("numero") or p.get("id")
    oc = p.get("meca_nro_oc") or p.get("nro_oc") or "-"
    return (
        f"Hola,\n\n"
        f"Le adjuntamos los detalles del Presupuesto Nro. {nro} para su revisión:\n\n"
        f"Fecha: {p.get('fecha')}\n"
        f"Cliente: {p.get('cliente_nombre')} (CUIT: {p.get('cuit')})\n"
        f"Tipo: {p.get('tipo_presupuesto')}\n"
        f"Orden de Compra (OC): {oc}\n"
        f"Estado: {p.get('estado')}\n"
        f"Monto Total: ${float(p.get('importe') or 0):,.2f}\n\n"
        f"Atentamente,\n"
        f"SG MONTAJES S.R.L."
    )


def enviar_presupuesto(p: dict, extra_destinatarios: Optional[list[str]] = None) -> tuple[bool, str]:
    dest = []
    if p.get("email"):
        dest.append(p["email"])
    dest.extend(extra_destinatarios or [])
    nro = p.get("numero") or ""
    return enviar_mail("presupuesto", dest, f"Presupuesto Oficial SG MONTAJES Nro. {nro}", cuerpo_presupuesto(p), nro)


def notificar_cambio_estado(p: dict, nuevo_estado: str) -> tuple[bool, str]:
    nro = p.get("numero") or ""
    cliente = p.get("meca_denominacion") or p.get("cliente_nombre") or "Cliente"
    importe = float(p.get("importe") or 0)
    oc = p.get("meca_nro_oc") or p.get("nro_oc") or ""
    oc_str = f" | OC: {oc}" if oc else ""
    mensaje = (
        f"ALERTA DE ESTADO: El Presupuesto {nro} ({cliente}) cambió a "
        f"\"{nuevo_estado}\" (${importe:,.2f}{oc_str})."
    )
    notificar_usuarios(mensaje, nro)
    cuerpo = mensaje + "\n\n" + cuerpo_presupuesto({**p, "estado": nuevo_estado})
    return enviar_mail("cambio_estado", emails_equipo(), f"Cambio de estado {nro}: {nuevo_estado}", cuerpo, nro)


def notificar_avance(p: dict, avance: dict) -> tuple[bool, str]:
    nro = p.get("numero") or ""
    cliente = p.get("meca_denominacion") or p.get("cliente_nombre") or "Cliente"
    monto = float(avance.get("monto") or 0)
    pct = avance.get("porcentaje") or 0
    acc = p.get("avance_porcentaje_acumulado") or 0
    facturado = float(p.get("monto_facturado_total") or 0)
    total = float(p.get("importe") or 0)
    mensaje = (
        f"ALERTA DE FACTURACIÓN: Se certificó un avance de obra del {pct}% (${monto:,.2f}) "
        f"para el Presupuesto {nro} ({cliente}). Total acumulado a facturar: {acc}% (${facturado:,.2f}) de ${total:,.2f}."
    )
    notificar_usuarios(mensaje, nro)
    dest = emails_equipo()
    facturacion = get_config("email_facturacion", "facturacion@sgmontajes.com.ar")
    if facturacion:
        dest.append(facturacion)
    return enviar_mail("facturacion_avance", dest, f"Avance de obra {nro} — Facturar {pct}%", mensaje, nro)


def alerta_oc_vencida(p: dict) -> tuple[bool, str]:
    nro = p.get("numero") or ""
    mensaje = (
        f"ALERTA O.C.: El Presupuesto {nro} de {p.get('cliente_nombre')} superó la fecha límite "
        f"({p.get('oc_limite_fecha')}) sin recibir Orden de Compra."
    )
    notificar_usuarios(mensaje, nro)
    dest = emails_equipo()
    if p.get("email"):
        dest.append(p["email"])
    return enviar_mail("alerta_oc", dest, f"OC vencida — Presupuesto {nro}", mensaje, nro)
