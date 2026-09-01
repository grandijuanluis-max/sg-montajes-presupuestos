ESTADOS = [
    "Enviado sin OC",
    "Aprobado sin OC",
    "Aprobado con OC",
    "Facturado Parcial",
    "Facturado Total",
    "Rechazado",
]

ESTADOS_LEGACY = {
    "Cargado sin orden de compra": "Enviado sin OC",
    "Pendiente de Autorización": "Enviado sin OC",
    "Pendiente": "Enviado sin OC",
    "Cargado con orden de compra": "Aprobado con OC",
    "Autorizado": "Aprobado con OC",
    "Aprobado": "Aprobado con OC",
}

ROLES = ["Administrador", "Solicitante", "Autorizador", "Ventas", "Congelado"]
RUBROS = ["Eléctrico", "Mecánico"]

MODULOS = [
    ("permiso_ingresar", "Gestión de Presupuestos", "Creación y carga de presupuestos Mecánicos y Eléctricos"),
    ("permiso_autorizacion", "Autorización de Presupuestos", "Aprobar o rechazar presupuestos pendientes"),
    ("permiso_estado", "Estado del Presupuesto", "Cambio rápido de estados y registro de OC"),
    ("permiso_rechazados", "Rechazo de Presupuesto", "Bandeja exclusiva de presupuestos no aprobados"),
    ("permiso_seguimiento", "Seguimiento", "Seguimiento, historial y modificación de presupuestos"),
    ("permiso_estadisticas", "Estadísticas", "Indicadores y tableros de alto caudal"),
    ("permiso_clientes", "Clientes", "Consulta de la base de clientes"),
    ("permiso_config", "Configuración del Sistema", "Usuarios, permisos y casilla de facturación"),
]

PERMISOS_POR_ROL = {
    "Administrador": [m[0] for m in MODULOS],
    "Solicitante": ["permiso_ingresar", "permiso_estado", "permiso_rechazados", "permiso_seguimiento"],
    "Autorizador": ["permiso_autorizacion", "permiso_estado", "permiso_seguimiento"],
    "Ventas": ["permiso_ingresar", "permiso_estado", "permiso_seguimiento"],
    "Congelado": [],
}

MENU_POR_PERMISO = [
    ("permiso_ingresar", "Gestión de Presupuestos"),
    ("permiso_autorizacion", "Autorización"),
    ("permiso_estado", "Estado del Presupuesto"),
    ("permiso_rechazados", "Rechazados"),
    ("permiso_seguimiento", "Seguimiento"),
    ("permiso_estadisticas", "Estadísticas"),
    ("permiso_clientes", "Clientes"),
    ("permiso_config", "Configuración"),
]


def normalizar_estado(estado: str) -> str:
    if not estado:
        return "Enviado sin OC"
    return ESTADOS_LEGACY.get(estado, estado)
