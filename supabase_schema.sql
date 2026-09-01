-- =============================================================================
-- SG MONTAJES — Gestión de Presupuestos
-- Schema Supabase (Postgres) pensado para alto caudal y estadísticas rápidas
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- -----------------------------------------------------------------------------
-- 1. USUARIOS + permisos configurables (1 campo por módulo actual)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Solicitante'
        CHECK (role IN ('Administrador', 'Solicitante', 'Autorizador', 'Ventas', 'Congelado')),
    rubro_defecto TEXT NOT NULL DEFAULT 'Eléctrico'
        CHECK (rubro_defecto IN ('Eléctrico', 'Mecánico')),
    vendedor_codigo TEXT DEFAULT '',
    vendedor_nombre TEXT DEFAULT '',
    activo BOOLEAN NOT NULL DEFAULT TRUE,

    -- Módulos actuales de la app
    permiso_ingresar BOOLEAN NOT NULL DEFAULT FALSE,
    permiso_autorizacion BOOLEAN NOT NULL DEFAULT FALSE,
    permiso_estado BOOLEAN NOT NULL DEFAULT FALSE,
    permiso_rechazados BOOLEAN NOT NULL DEFAULT FALSE,
    permiso_seguimiento BOOLEAN NOT NULL DEFAULT FALSE,
    permiso_config BOOLEAN NOT NULL DEFAULT FALSE,

    -- Módulos nuevos (estadísticas + base de clientes)
    permiso_estadisticas BOOLEAN NOT NULL DEFAULT FALSE,
    permiso_clientes BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios (email);
CREATE INDEX IF NOT EXISTS idx_usuarios_role ON public.usuarios (role);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON public.usuarios (activo);

-- -----------------------------------------------------------------------------
-- 2. CLIENTES (carga inicial + futura automatización)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    cuit TEXT DEFAULT '',
    telefono TEXT DEFAULT '',
    email TEXT DEFAULT '',
    condicion_id TEXT DEFAULT '',
    condicion_nombre TEXT DEFAULT '',
    deposito_id TEXT DEFAULT '',
    deposito_nombre TEXT DEFAULT '',
    transporte_id TEXT DEFAULT '',
    transporte_nombre TEXT DEFAULT '',
    vendedor_id TEXT DEFAULT '',
    vendedor_nombre TEXT DEFAULT '',
    estado TEXT DEFAULT 'ACTIVOS',
    domicilio TEXT DEFAULT '',
    localidad TEXT DEFAULT '',
    provincia TEXT DEFAULT '',
    deuda_actual NUMERIC(18, 2) NOT NULL DEFAULT 0,
    origen TEXT NOT NULL DEFAULT 'manual'
        CHECK (origen IN ('manual', 'automatizacion', 'foxpro', 'importacion')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON public.clientes (nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_cuit ON public.clientes (cuit);
CREATE INDEX IF NOT EXISTS idx_clientes_estado ON public.clientes (estado);
CREATE INDEX IF NOT EXISTS idx_clientes_localidad ON public.clientes (localidad);
CREATE INDEX IF NOT EXISTS idx_clientes_origen ON public.clientes (origen);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre_trgm ON public.clientes USING gin (nombre gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- 3. CATÁLOGOS de apoyo
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.condiciones (
    codigo TEXT NOT NULL,
    nombre TEXT NOT NULL,
    dias INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (codigo, dias)
);

CREATE TABLE IF NOT EXISTS public.depositos (
    codigo TEXT PRIMARY KEY,
    nombre TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.transportes (
    codigo TEXT PRIMARY KEY,
    nombre TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.vendedores (
    codigo TEXT PRIMARY KEY,
    nombre TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.catalogo_articulos (
    codigo TEXT PRIMARY KEY,
    detalle TEXT NOT NULL,
    rubro TEXT NOT NULL,
    subrubro TEXT DEFAULT '',
    udm TEXT DEFAULT 'c/u',
    precio NUMERIC(18, 4) NOT NULL DEFAULT 0,
    stock NUMERIC(18, 4) NOT NULL DEFAULT 0,
    estado TEXT DEFAULT 'ACTIVOS'
);

CREATE INDEX IF NOT EXISTS idx_catalogo_rubro ON public.catalogo_articulos (rubro);
CREATE INDEX IF NOT EXISTS idx_catalogo_subrubro ON public.catalogo_articulos (subrubro);
CREATE INDEX IF NOT EXISTS idx_catalogo_detalle ON public.catalogo_articulos (detalle);

-- -----------------------------------------------------------------------------
-- 4. PRESUPUESTOS — un campo por dato de gestión (estadísticas futuras)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.presupuestos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero TEXT UNIQUE NOT NULL,

    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_resolucion DATE,
    anio INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM fecha)::INTEGER) STORED,
    mes INTEGER GENERATED ALWAYS AS (EXTRACT(MONTH FROM fecha)::INTEGER) STORED,

    tipo_presupuesto TEXT NOT NULL DEFAULT 'Eléctrico'
        CHECK (tipo_presupuesto IN ('Eléctrico', 'Mecánico')),
    tipo_reporte TEXT DEFAULT 'detallado',

    cliente_id TEXT DEFAULT '',
    cliente_nombre TEXT DEFAULT '',
    cuit TEXT DEFAULT '',
    telefono TEXT DEFAULT '',
    email TEXT DEFAULT '',

    vendedor_id TEXT DEFAULT '',
    vendedor_nombre TEXT DEFAULT '',
    operador TEXT DEFAULT '',
    operador_vendedor_id TEXT DEFAULT '',
    operador_vendedor_nombre TEXT DEFAULT '',
    created_by UUID REFERENCES public.usuarios (id),

    importe NUMERIC(18, 2) NOT NULL DEFAULT 0,
    importe_original NUMERIC(18, 2) NOT NULL DEFAULT 0,
    subtotal_materiales NUMERIC(18, 2) NOT NULL DEFAULT 0,
    subtotal_mano_obra NUMERIC(18, 2) NOT NULL DEFAULT 0,

    condicion_id TEXT DEFAULT '',
    condicion_nombre TEXT DEFAULT '',
    deposito_id TEXT DEFAULT '',
    deposito_nombre TEXT DEFAULT '',
    transporte_id TEXT DEFAULT '',
    transporte_nombre TEXT DEFAULT '',

    is_comisionista BOOLEAN NOT NULL DEFAULT FALSE,
    tipo_nv TEXT DEFAULT '',
    tipo_entrega TEXT DEFAULT '',
    forma_pago TEXT DEFAULT '',
    motivo TEXT DEFAULT '',

    meca_denominacion TEXT DEFAULT '',
    meca_proveedor TEXT DEFAULT 'SG MONTAJES SRL',
    meca_fecha_oferta DATE,
    meca_validez TEXT DEFAULT '5 días',
    meca_planta TEXT DEFAULT '',
    meca_nro_oc TEXT DEFAULT '',
    nro_oc TEXT DEFAULT '',
    meca_nro_ot TEXT DEFAULT '',
    meca_fecha_inicio DATE,
    meca_duracion TEXT DEFAULT '',
    meca_fecha_fin DATE,
    meca_propuesta TEXT DEFAULT '',
    meca_personal TEXT DEFAULT '',
    meca_exclusiones TEXT DEFAULT '',

    estado TEXT NOT NULL DEFAULT 'Enviado sin OC',
    motivo_bloqueo TEXT DEFAULT '',
    motivo_rechazo TEXT DEFAULT '',

    oc_limite_fecha DATE,
    oc_alerta_enviada BOOLEAN NOT NULL DEFAULT FALSE,

    avance_porcentaje_acumulado NUMERIC(8, 2) NOT NULL DEFAULT 0,
    monto_facturado_total NUMERIC(18, 2) NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presupuestos_fecha ON public.presupuestos (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_presupuestos_estado ON public.presupuestos (estado);
CREATE INDEX IF NOT EXISTS idx_presupuestos_tipo ON public.presupuestos (tipo_presupuesto);
CREATE INDEX IF NOT EXISTS idx_presupuestos_cliente ON public.presupuestos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_cliente_nombre ON public.presupuestos (cliente_nombre);
CREATE INDEX IF NOT EXISTS idx_presupuestos_cuit ON public.presupuestos (cuit);
CREATE INDEX IF NOT EXISTS idx_presupuestos_operador ON public.presupuestos (operador);
CREATE INDEX IF NOT EXISTS idx_presupuestos_vendedor ON public.presupuestos (vendedor_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_nro_oc ON public.presupuestos (nro_oc);
CREATE INDEX IF NOT EXISTS idx_presupuestos_anio_mes ON public.presupuestos (anio, mes);
CREATE INDEX IF NOT EXISTS idx_presupuestos_estado_fecha ON public.presupuestos (estado, fecha DESC);

-- -----------------------------------------------------------------------------
-- 5. ÍTEMS (granularidad para estadísticas por artículo / rubro / subrubro)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.presupuesto_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    presupuesto_id UUID NOT NULL REFERENCES public.presupuestos (id) ON DELETE CASCADE,
    numero_presupuesto TEXT NOT NULL,
    codigo TEXT DEFAULT '',
    detalle TEXT DEFAULT '',
    rubro TEXT DEFAULT '',
    subrubro TEXT DEFAULT '',
    udm TEXT DEFAULT 'c/u',
    precio NUMERIC(18, 4) NOT NULL DEFAULT 0,
    cantidad NUMERIC(18, 4) NOT NULL DEFAULT 0,
    cantidad_original NUMERIC(18, 4) NOT NULL DEFAULT 0,
    subtotal NUMERIC(18, 2) NOT NULL DEFAULT 0,
    estado TEXT NOT NULL DEFAULT 'Pendiente',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_presupuesto ON public.presupuesto_items (presupuesto_id);
CREATE INDEX IF NOT EXISTS idx_items_numero ON public.presupuesto_items (numero_presupuesto);
CREATE INDEX IF NOT EXISTS idx_items_codigo ON public.presupuesto_items (codigo);
CREATE INDEX IF NOT EXISTS idx_items_rubro ON public.presupuesto_items (rubro, subrubro);
CREATE INDEX IF NOT EXISTS idx_items_estado ON public.presupuesto_items (estado);

-- -----------------------------------------------------------------------------
-- 6. AVANCES DE OBRA / CERTIFICACIÓN
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.presupuesto_avances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    presupuesto_id UUID NOT NULL REFERENCES public.presupuestos (id) ON DELETE CASCADE,
    numero_presupuesto TEXT NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    porcentaje NUMERIC(8, 2) NOT NULL DEFAULT 0,
    monto NUMERIC(18, 2) NOT NULL DEFAULT 0,
    nro_doc TEXT DEFAULT '',
    detalle TEXT DEFAULT '',
    created_by TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_avances_presupuesto ON public.presupuesto_avances (presupuesto_id);
CREATE INDEX IF NOT EXISTS idx_avances_fecha ON public.presupuesto_avances (fecha);

-- -----------------------------------------------------------------------------
-- 7. NOTIFICACIONES + LOG DE MAILS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.usuarios (id) ON DELETE CASCADE,
    mensaje TEXT NOT NULL,
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    presupuesto_numero TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON public.notificaciones (user_id, leida, created_at DESC);

CREATE TABLE IF NOT EXISTS public.mails_enviados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL,
    destinatarios TEXT NOT NULL,
    asunto TEXT NOT NULL,
    cuerpo TEXT DEFAULT '',
    presupuesto_numero TEXT DEFAULT '',
    estado_envio TEXT NOT NULL DEFAULT 'enviado',
    error TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mails_tipo ON public.mails_enviados (tipo, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mails_numero ON public.mails_enviados (presupuesto_numero);

-- -----------------------------------------------------------------------------
-- 8. CONFIGURACIÓN DEL SISTEMA
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.configuracion (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.configuracion (clave, valor)
VALUES ('email_facturacion', 'facturacion@sgmontajes.com.ar')
ON CONFLICT (clave) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 9. SECUENCIAS de numeración
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.secuencias (
    rubro TEXT PRIMARY KEY,
    prefijo TEXT NOT NULL,
    ultimo_valor INTEGER NOT NULL DEFAULT 0
);

INSERT INTO public.secuencias (rubro, prefijo, ultimo_valor)
VALUES
    ('Eléctrico', '102-ELEC', 0),
    ('Mecánico', '101-MEC', 0)
ON CONFLICT (rubro) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 10. Vista agregada para estadísticas de alto caudal
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_presupuestos_resumen AS
SELECT
    anio,
    mes,
    tipo_presupuesto,
    estado,
    operador,
    vendedor_nombre,
    cliente_nombre,
    localidad,
    COUNT(*) AS cantidad,
    SUM(importe) AS importe_total,
    SUM(monto_facturado_total) AS facturado_total,
    SUM(subtotal_materiales) AS materiales_total,
    SUM(subtotal_mano_obra) AS mano_obra_total
FROM public.presupuestos p
LEFT JOIN public.clientes c ON c.codigo = p.cliente_id
GROUP BY 1, 2, 3, 4, 5, 6, 7, 8;

-- -----------------------------------------------------------------------------
-- 11. Trigger updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuarios_updated ON public.usuarios;
CREATE TRIGGER trg_usuarios_updated
    BEFORE UPDATE ON public.usuarios
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_clientes_updated ON public.clientes;
CREATE TRIGGER trg_clientes_updated
    BEFORE UPDATE ON public.clientes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_presupuestos_updated ON public.presupuestos;
CREATE TRIGGER trg_presupuestos_updated
    BEFORE UPDATE ON public.presupuestos
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 12. RLS (Streamlit usa service/anon key del servidor)
-- Ajustar en producción cuando se incorpore Auth de Supabase.
-- -----------------------------------------------------------------------------
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuesto_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuesto_avances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mails_enviados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_articulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condiciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depositos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transportes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secuencias ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'usuarios', 'clientes', 'presupuestos', 'presupuesto_items',
        'presupuesto_avances', 'notificaciones', 'mails_enviados',
        'configuracion', 'catalogo_articulos', 'condiciones',
        'depositos', 'transportes', 'vendedores', 'secuencias'
    ]
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS allow_all_%s ON public.%I', t, t);
        EXECUTE format(
            'CREATE POLICY allow_all_%s ON public.%I FOR ALL USING (true) WITH CHECK (true)',
            t, t
        );
    END LOOP;
END $$;

-- Usuario administrador inicial (cambiar clave en el primer ingreso)
INSERT INTO public.usuarios (
    username, password, email, role, rubro_defecto, activo,
    permiso_ingresar, permiso_autorizacion, permiso_estado,
    permiso_rechazados, permiso_seguimiento, permiso_config,
    permiso_estadisticas, permiso_clientes
) VALUES (
    'mel', '123', 'mel@sgmontajes.com.ar', 'Administrador', 'Eléctrico', TRUE,
    TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
), (
    'ventas', '123', 'ventas@sgmontajes.com.ar', 'Solicitante', 'Eléctrico', TRUE,
    TRUE, FALSE, TRUE, TRUE, TRUE, FALSE, FALSE, FALSE
)
ON CONFLICT (username) DO NOTHING;
