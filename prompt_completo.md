# 📑 Especificación y Prompt Maestro Completo: Sistema de Gestión de Presupuestos — SG MONTAJES SRL

Documento integral y prompt maestro consolidado con todos los requerimientos, reglas de negocio, flujos de trabajo, esquema de datos, arquitectura y módulos implementados para la plataforma web de **SG MONTAJES SRL (Ingeniería & Montajes Industriales)**.

---

## 🏢 1. Identidad y Propósito del Sistema

- **Empresa**: SG MONTAJES SRL — Ingeniería & Montajes Industriales • Obras Eléctricas y Mecánicas
- **Objetivo**: Sistema web empresarial para la gestión integral de cotizaciones comerciales, presupuestos técnicos, seguimiento y certificación de avances de obra, control estricto de facturación proporcional, consulta de stock PRESEA y analítica gerencial en tiempo real (Business Intelligence).
- **Acceso en Producción**: https://gr-nota-de-venta.web.app
- **Servidor Local / API**: Python 3 (`server.py` en `http://localhost:8000`)

---

## ⚙️ 2. Arquitectura y Stack Tecnológico

- **Frontend**: HTML5 Semántico + Vanilla JavaScript (ES6+ modular, reactivo, sin dependencias pesadas) + CSS3 Glassmorphism responsivo + Chart.js para visualización de métricas.
- **Backend API**: Servidor Python nativo (`server.py`) con API REST, endpoints de analítica, base de datos local SQLite/JSON, despacho SMTP corporativo y compresión de respuestas.
- **Base de Datos y Sincronización en Tiempo Real**: Supabase (PostgreSQL 15 + Supabase Realtime Channels) sincronizado bidireccionalmente con `localStorage` y catálogos estáticos compilados desde DBF (`clientes_db.js`, `condiciones_db.js`, `stock_db.js`, `vendedores_db.js`, `presupuestos_catalog_db.js`).
- **Despacho de Correos**: Servidor SMTP Corporativo oficial (`@sgmontajes.com.ar`) para el envío automático de notificaciones de avance de obra y facturación administrativa.
- **Diseño Adaptativo**: 100% responsivo para celulares, tablets, computadoras portátiles y de escritorio.

---

## ⚡ 3. Gestión de Rubros Industriales

El sistema opera bajo dos rubros principales totalmente diferenciados con correlatividades separadas:

1. **⚡ Presupuesto Eléctrico (`102-ELEC-XXXX`)**:
   - Cotización de montajes eléctricos industriales, tableros de potencia y comando, tendido de bandejas portacables, cableados de fuerza motriz, iluminación industrial y cálculo de horas hombre técnicas.
   - Catálogo de materiales eléctricos y tarifario de mano de obra especializada.

2. **⚙️ Presupuesto Mecánico (`101-MEC-XXXX`)**:
   - Cotización de montajes mecánicos pesados, estructuras metálicas, cañerías industriales, soldadura calificada, piping y mecanizados.
   - Ficha técnica completa de oferta: Denominación de la Obra/Instalación, Planta, Proveedor (SG MONTAJES SRL), Fecha de Oferta, Validez, Plazo de Ejecución, Fechas Estimadas de Inicio/Fin, N° OT, Propuesta Técnica, Personal Asignado y Cláusula de Exclusiones.

- **Conmutador de Rubro Superior**: Selector en la barra de navegación para alternar instantáneamente entre vistas Eléctrica y Mecánica sin recargar la página.
- **Denominación del Servicio Limpia**: En ambas modalidades, el campo "Denominación del Servicio" se presenta vacío por defecto listo para la carga específica de la obra.

---

## 🔄 4. Flujo y Reglas de Estados Comerciales

### 4.1. Secuencia Progresiva de Estados
El ciclo de vida comercial sigue una jerarquía estrictamente progresiva:

1. `📤 Enviado sin OC` *(Nivel 1)*: Presupuesto emitido y entregado formalmente al cliente, a la espera de confirmación.
2. `⏳ Aprobado sin OC` *(Nivel 2)*: Aprobación verbal/preliminar del cliente previa a la emisión de la orden de compra.
3. `✅ Aprobado con OC` *(Nivel 3)*: Aprobación formal adjudicada. **Exige ingreso obligatorio del Número de Orden de Compra (OC)**.
4. `🧾 Facturado Parcial` *(Nivel 4)*: Facturación parcial emitida correspondiente a hitos de avance de obra certificados.
5. `💎 Facturado Total` *(Nivel 5)*: 100% del importe total facturado y obra administrativa concluida.
6. `❌ Rechazado` *(Estado Terminal)*: Oferta desestimada por el cliente. **Exige ingreso obligatorio del motivo de rechazo**.

### 4.2. 🚫 Prohibición Estricta de Retroceso de Estados
- **Los estados no pueden volver atrás**: Un presupuesto que ha alcanzado un nivel superior no puede retroceder a uno anterior (por ejemplo, `Facturado Parcial` no puede cambiar a `Aprobado con OC`, `Aprobado sin OC` ni `Enviado sin OC`).
- **En el selector desplegable**: Las opciones inferiores a la actual aparecen deshabilitadas con el indicador `🚫`.
- **En "Estado del Presupuesto"**: Los presupuestos en `💎 Facturado Total` permanecen siempre visibles en la grilla para registro histórico y auditoría contable.

---

## 🏗️ 5. Avance de Obra y Control de Facturación

### 5.1. Certificación de Avance de Obra
- Registro de hitos de avance con:
  - **% de Avance** (ingresado con coma decimal `,`, tope estricto del 100% acumulado).
  - **Fecha del Hito**.
  - **N° de Documento / Acta de Certificación**.
  - **Detalle de los trabajos ejecutados**.
- **Cálculo Automático en Pesos**: Determina en tiempo real el monto valorizado en pesos del avance ingresado respecto al monto total del presupuesto.
- **Notificación Automática por Email**: Disparo de correo de alerta a Facturación (`📄 Notificación de Avance de Obra`) cada vez que se certifica un nuevo hito.

### 5.2. Reglas de Facturación Proporcional
1. **Tope por Avance**: El `% Facturado` **nunca puede superar el % de Avance de Obra realizado**.
2. **Avance 0%**: Si el avance de obra es `0%`, está estrictamente prohibido ingresar porcentaje de facturación o cambiar el estado a `Facturado`.
3. **Facturado Total**: Para marcar un presupuesto como `Facturado Total` (100%), la obra debe tener certificado previamente el **100% de Avance de Obra**.
4. **Límite Absoluto**: Ningún porcentaje (ni de avance ni de facturación) puede exceder el **100%**.
5. **Aviso Destacado "FALTA FACTURAR"**: Si existe avance físico certificado superior al porcentaje facturado, el sistema muestra en la grilla una alerta ámbar/roja con el monto exacto listo para facturar.

---

## 📊 6. Módulo de Estadísticas y Business Intelligence (BI)

El panel analítico de control gerencial (`tpl-metrics`) opera en tiempo real con filtros por rango de fechas, rubro y operador:

### 6.1. Recuadro de KPIs (8 Indicadores Clave)
1. **Total Presupuestado**: Monto total acumulado y cantidad de cotizaciones emitidas.
2. **Total Facturado (Avances)**: Monto monetario real certificado y porcentaje global facturado.
3. 📅 **Facturado en el Mes**: Suma de facturación y avances registrados en el mes calendario en curso (ej. *Septiembre 2026*).
4. 📈 **Facturado en el Año**: Suma acumulada de facturación en el año fiscal en curso (ej. *2026*).
5. **Saldo Pendiente de Cobro**: Monto por certificar/facturar hasta completar las obras.
6. **Aprobados con OC**: Cantidad de presupuestos y volumen monetario formalmente adjudicado.
7. **⚡ Rubro Eléctrico**: Monto y cantidad de cotizaciones del sector eléctrico.
8. **⚙️ Rubro Mecánico**: Monto y cantidad de cotizaciones del sector mecánico.

### 6.2. Visualizaciones Gráficas Interactivas (Chart.js)
1. **Distribución por Estado Comercial**: Gráfico de torta con cantidades de aprobados, pendientes y rechazados.
2. **Monto Total vs Facturado por Estado**: Gráfico de barras comparativo de volumen financiero.
3. **Top 5 Clientes en Cotización**: Gráfico de barras horizontal con las 5 cuentas de mayor volumen cotizado.
4. **Mix de Rubros (Eléctrico vs Mecánico)**: Gráfico de dona con la participación porcentual de cada división.

### 6.3. Tablas Analíticas de Rendimiento
- **Rendimiento por Usuario / Operador**: Presupuestos emitidos, aprobados con OC, monto cotizado, total facturado y **% de Efectividad Comercial**.
- **Resumen Financiero por Cliente**: Cotizaciones por cliente, volumen total, avance promedio, facturación acumulada y saldo pendiente.

---

## 🖨️ 7. Reporte Impreso Oficial Gerencial (PDF / Impresión)

Diseñado para presentación formal gerencial con inicio directo en la **Hoja 1** (sin hojas en blanco):

- **Encabezado Oficial**: Logo de SG MONTAJES SRL, fecha y hora de emisión, período analizado y filtros activos (Operador y Rubro).
- **Sección 1: Indicadores Financieros Clave (KPIs)**: Grilla de 8 tarjetas ejecutivas con tipografía nítida y legible.
- **Sección 2: Resumen Financiero por Cliente**: Tabla completa de clientes con fila de **TOTAL GENERAL CLIENTES**.
- **Sección 3: Rendimiento por Vendedor / Operador**: Tabla con cotizaciones, aprobaciones, montos y **% de efectividad comercial**, con fila de **TOTAL GENERAL VENDEDORES**.
- **Sección 4: Detalle Completo de Cotizaciones**: Listado completo de presupuestos filtrados (ID, Fecha, Rubro, Cliente, Obra, Importe Total, Estado Comercial con badges de color, % Avance y Facturado) con fila de **TOTAL GENERAL COTIZACIONES**.
- **Paginación Inteligente**: Encabezados de tabla repetibles en cada hoja (`thead { display: table-header-group; }`).

---

## 📑 8. Exportación de Planilla Excel Profesional (`.xls`)

Generador nativo de hojas de cálculo Microsoft Excel (`.xls`) con estilos corporativos y formato numérico oficial:

- **Estructura Multi-Tabla**:
  1. **Encabezado y Metadatos**: Fecha de emisión, período y filtros aplicados.
  2. **Tabla 1: Resumen Ejecutivo Consolidado**: 8 KPIs con formato de moneda (`$ #,##0.00`), porcentajes y totales.
  3. **Tabla 2: Resumen de Cuentas por Cliente**: Presupuestos, total cotizado, % avance, total facturado y saldo por cobrar.
  4. **Tabla 3: Rendimiento por Usuario / Operador**: Efectividad de cierre, montos cotizados y facturados.
  5. **Tabla 4: Detalle de Cotizaciones y Presupuestos**: ID, Fecha, Rubro, Cliente, CUIT, Obra, Importe, Estado, % Avance, Facturado, N° OC y Operador.

---

## 👁️ 9. Confección y Visualización de Comprobantes (Detallado y Resumido)

- **Carga Continua de Presupuestos**: Al pulsar "Confirmar y Cargar", el sistema guarda la oferta e inmediatamente reinicia el formulario en blanco para permitir la carga ágil del siguiente presupuesto.
- **Comprobante Detallado**: Muestra el desglose técnico ítem por ítem con precios unitarios, cantidades, IVA y subtotales.
- **Comprobante Resumido**: Muestra la oferta comercial condensada en una única línea resumen con denominación de la obra, neto, IVA (21%) y total final.
- **Alternancia Rápida**: Selector superior con cambio instantáneo entre ambas modalidades.
- **Opciones de Emisión**: Impresión en A4 con membrete oficial, envío directo por WhatsApp y despacho por correo electrónico.

---

## 📦 10. Consulta de Stock e Inventario PRESEA

- Módulo dedicado para la búsqueda en tiempo real de artículos y materiales.
- Filtros por código, descripción, rubro y subrubro.
- Indicadores visuales de stock físico existente y disponibilidad comercial inmediata.

---

## 👥 11. Usuarios, Permisos y Seguridad

- **Usuarios Registrados**:
  - `mel` (Administrador — Rubro Eléctrico)
  - `juanluis` (Solicitante — Rubro Eléctrico)
  - `luciano` (Solicitante — Rubro Eléctrico)
  - `roberto` (Solicitante — Rubro Mecánico)
  - `melani` (Administrador — Rubro Eléctrico)
  - `nicole` (Solicitante — Rubro Eléctrico)
  - `alexis` (Solicitante — Rubro Mecánico)
  - `emiliano` (Solicitante — Rubro Eléctrico)

- **Parámetros de Seguridad por Usuario**:
  - `Visualizar Comprobante / Historial`: Consulta en modo lectura y auditoría (`[ 👁️ Ver ]`).
  - `Editar y Avance de Obra`: Modificación de datos, avance de obra y basar presupuesto (`[ ✏️ Editar ]`, `[ 🔨 Avance ]`, `[ 📑 Basar Pres. ]`).
- **Limpieza de Datos**: Eliminación total de conceptos obsoletos de *Depósito*, *Transporte* y *Vendedores externos*.

---

## 🗄️ 12. Esquema de Base de Datos en Supabase (PostgreSQL)

```sql
-- TABLA: USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'Solicitante',
    rubro_defecto TEXT NOT NULL DEFAULT 'Eléctrico',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- TABLA: PRESUPUESTOS
CREATE TABLE IF NOT EXISTS presupuestos (
    id TEXT PRIMARY KEY,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    tipo_presupuesto TEXT NOT NULL,
    cliente_id TEXT NOT NULL,
    cliente_nombre TEXT NOT NULL,
    cuit TEXT,
    telefono TEXT,
    email TEXT,
    importe NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    estado TEXT NOT NULL DEFAULT 'Enviado sin OC',
    nro_oc TEXT,
    motivo_rechazo TEXT,
    operador TEXT NOT NULL,
    condicion_venta TEXT,
    moneda_id INT DEFAULT 1,
    cotizacion NUMERIC(15, 8) DEFAULT 1.00000000,
    
    -- Campos Ficha Mecánica / Identificación de la Oferta
    meca_denominacion TEXT,
    meca_proveedor TEXT,
    meca_fecha_oferta TEXT,
    meca_validez TEXT,
    meca_planta TEXT,
    meca_nro_oc TEXT,
    meca_nro_ot TEXT,
    meca_fecha_inicio TEXT,
    meca_duracion TEXT,
    meca_fecha_fin TEXT,
    meca_propuesta TEXT,
    meca_personal TEXT,
    meca_exclusiones TEXT,
    
    -- Avance y Facturación
    avance_porcentaje_acumulado NUMERIC(5, 2) DEFAULT 0.00,
    facturado_porcentaje NUMERIC(5, 2) DEFAULT 0.00,
    monto_facturado NUMERIC(15, 2) DEFAULT 0.00,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- TABLA: ITEMS DE PRESUPUESTO
CREATE TABLE IF NOT EXISTS presupuesto_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    presupuesto_id TEXT REFERENCES presupuestos(id) ON DELETE CASCADE,
    codigo TEXT,
    detalle TEXT NOT NULL,
    rubro TEXT,
    subrubro TEXT,
    cantidad NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unidad TEXT DEFAULT 'UN',
    precio_unitario NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    orden INT DEFAULT 0
);

-- TABLA: AVANCES DE OBRA
CREATE TABLE IF NOT EXISTS avances_obra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    presupuesto_id TEXT REFERENCES presupuestos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    porcentaje NUMERIC(5, 2) NOT NULL,
    monto_equivalente NUMERIC(15, 2) NOT NULL,
    nro_documento TEXT,
    detalle TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- TABLA: APP STATE (SINCRONIZACIÓN GLOBAL)
CREATE TABLE IF NOT EXISTS app_state (
    id TEXT PRIMARY KEY DEFAULT 'global_config',
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- PUBLICACIÓN TIEMPO REAL
ALTER PUBLICATION supabase_realtime ADD TABLE presupuestos, presupuesto_items, avances_obra, app_state;
```
