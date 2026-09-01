# Prompt Completo: Simulador PRESEA — Ingreso y Autorización de Pedidos

Este documento resume todas las solicitudes realizadas durante el desarrollo del simulador de pedidos comerciales PRESEA, y cómo fue resuelta cada una. El proyecto es una aplicación web estática (HTML + JS + CSS) ubicada en `/Users/melanigrandi/ANTY/NOTA DE VENTA/`.

---

## 🧱 Stack Técnico

- **Frontend**: HTML5 puro + JavaScript Vanilla + CSS custom
- **Datos**: Archivos `.js` generados desde bases de datos `.DBI` de FoxPro mediante un script Python (`compilar_datos.py`)
- **Persistencia**: `localStorage` del navegador
- **Sin backend**: Todo corre desde el sistema de archivos local del Mac (`file://`)

---

## 📋 Solicitudes y Resoluciones

---

### 1. 🔐 No podía acceder al sistema (login/carga bloqueada)

**Problema**: La pantalla de login cargaba indefinidamente o quedaba en blanco.

**Causa**: Funciones en `app.js` declaradas con sintaxis de `function expression` (`const fn = function() {}`) dentro del scope de la inicialización, lo que causaba errores de hoisting — el evento `DOMContentLoaded` intentaba llamar funciones que todavía no existían en memoria.

**Solución**: Se refactorizaron todas las funciones críticas de inicialización (login, render de menú, setup de vistas) a declaraciones estándar `function fn() {}` para garantizar hoisting completo antes de la ejecución del DOM.

---

### 2. 🚂 Transporte y Depósito: búsqueda mejorada (estilo PRESEA)

**Problema**: Los campos de Transporte y Depósito eran poco prácticos de usar — el usuario solicitó que funcionaran igual que el buscador de clientes en PRESEA: escribir y filtrar en tiempo real.

**Solución**:
- Se implementaron campos de texto con **autocomplete en tiempo real** para Depósito y Transporte.
- Al escribir, se filtra sobre los registros parseados de `DEPOSITOPALA.DBI` y `TRANSPORTEPALA.DBI`.
- Al seleccionar un registro, se almacena el objeto completo para su uso al generar el pedido.
- El diseño mantiene el estilo oscuro glassmorphism del sistema.

---

### 3. ✅❌ Modal de Autorización: Opciones de Aceptado/Rechazado con Radio Buttons

**Problema**: El usuario pedía que en el modal de autorización hubiera dos opciones claras (`Aceptado` / `Rechazado`) con radio buttons (tilde), y que el botón al pie dijera únicamente **"Aceptar"**. El campo de Motivo de Rechazo debía marcarse como **Obligatorio** y solo aparecer al seleccionar "Rechazado".

**Solución**:
- Se rediseñó el bloque de acciones del modal `tpl-modal-auth` en `index.html`.
- Se añadieron dos radio buttons: `✅ Aceptado / Autorizado` y `❌ Rechazado`.
- El campo `Motivo del Rechazo (Obligatorio)` solo se muestra con animación `fadeIn` cuando se selecciona "Rechazado".
- La función `confirmarResolucion()` valida que el motivo no esté vacío antes de permitir el rechazo.
- Un único botón **"Aceptar"** al pie ejecuta la resolución.

---

### 4. 📦 Consulta de Stock: nueva sección desde `STOCKPALA.DBI`

**Problema**: El usuario solicitó agregar una sección de consulta de stock extraída de la base de datos de FoxPro.

**Solución**:
- Se extendió `compilar_datos.py` para parsear `STOCKPALA.DBI` y generar `stock_db.js` con **3.263 artículos**.
- Se creó la vista `tpl-stock-query` con:
  - **Barra de búsqueda** por código o descripción.
  - **Filtros por Rubro y Estado**.
  - **KPIs** (total artículos, artículos con stock, artículos sin stock).
  - Tabla con código, descripción, rubro, estado y stock actual.
- La sección es accesible desde el menú lateral de todos los roles.

---

### 5. ✏️ Precios en Cero: edición de precio al cargar artículos

**Problema**: Muchos artículos traían precio `$0,00` desde la base de FoxPro porque no tenían lista de precio cargada. El vendedor no podía ingresar el precio correcto.

**Solución**:
- Se agregó el campo `#req-product-price` (Precio Unitario) en el formulario de carga de pedidos.
- Al seleccionar un artículo con el autocomplete o el buscador F6, el campo se completa con `PRECIO_1` si está disponible; si es `0`, queda editable para que el vendedor tipee el valor manualmente.
- Al presionar **"Agregar"**, se toma el precio del input en vez del precio fijo de la base.
- **Grilla editable**: Las columnas de Cantidad y Precio Unitario de la tabla de artículos cargados se convirtieron en `<input>` editables. Cambiar cualquier valor recalcula el subtotal de fila y el importe total del pedido en tiempo real.

---

### 6. 🔍 Buscador F6: Modal de Búsqueda Avanzada de Artículos (Robot de Stock)

**Problema**: El usuario quería poder buscar artículos de stock con un modal avanzado al estilo PRESEA, accesible con la tecla F6 o un botón.

**Solución**:
- Se creó el modal `tpl-modal-robot-stock` con:
  - Campo de búsqueda en tiempo real.
  - Filtro por Rubro.
  - Tabla de resultados con código, descripción, precio y stock disponible (resaltado en verde/rojo).
  - Al hacer doble clic en una fila, el artículo se selecciona y los campos del formulario se completan automáticamente.

---

### 7. ☑️ Autorización Parcial por Ítem: "Autorizar por Parte"

**Problema**: El usuario necesitaba poder autorizar solo algunos artículos de un pedido (desmarcar uno y autorizar el resto), ajustar cantidades, y que el importe del pedido se recalcule en consecuencia.

**Solución**:
- En la planilla `tpl-modal-auth` se agregaron para cada ítem:
  - Un **checkbox** (`.auth-item-check`) para incluirlo/excluirlo.
  - Un **input de cantidad** (`.auth-item-qty`) con tope en la cantidad original.
  - Un **subtotal dinámico** que se actualiza en tiempo real.
- Al pie de la tabla aparecen dos totalizadores: **Total Original** y **Monto a Autorizar**.
- La función `recalcAuthTotal()` recalcula en tiempo real con cada cambio de checkbox o cantidad.

---

### 8. 🐛 Bug: Artículo desmarcado desaparecía del pedido y se autorizaba igual

**Problema**: Al desmarcar un artículo y presionar Aceptar, el artículo desaparecía de la lista del pedido. A pesar de eso, el sistema reportaba la orden como completamente aprobada.

**Causa raíz**: Dos bugs combinados:
1. **Mutación de referencia en JavaScript**: `pedidoActivo` apuntaba al mismo objeto en memoria que `appData.pedidos[orderIdx]`. Al asignar el nuevo importe, la variable original también mutaba, por lo que la comparación `totalAmt < pedidoActivo.importe` siempre evaluaba `false`.
2. **Eliminación de ítems**: Los artículos desmarcados se excluían del array `finalItems`, desapareciendo sin dejar rastro.

**Solución**:
- Se captura `originalImporte` en una variable local **antes** de mutar `appData.pedidos[orderIdx]`.
- Los ítems desmarcados ya **no se eliminan**: se marcan con `estado: 'Pendiente'` en lugar de borrarse del array.
- Se añadieron los campos `cantidad_original` y `estado` a cada ítem para trazabilidad.

---

### 9. 🔄 Pedido que queda pendiente al autorizar parcialmente

**Problema**: Al autorizar algunos ítems y desmarcar otros, el pedido completo desaparecía de la lista de "Autorización de Pedidos" porque cambiaba a estado `"Autorizado"`.

**Solución**: Se rediseñó la lógica de `resolveOrder()`:

- Ahora evalúa si quedan ítems en estado `"Pendiente"` luego de la aprobación parcial.
- **Si hay ítems pendientes** → el estado del pedido sigue siendo `"Pendiente de Autorización"` y **permanece en la lista de pendientes**.
- **Si todos los ítems fueron resueltos** → el pedido pasa a `"Autorizado"` y sale de la cola.
- Los ítems ya aprobados en una ronda anterior se muestran bloqueados (solo lectura, fondo verde con etiqueta "YA AUTORIZADO") cuando el autorizador vuelve a abrir la planilla.

---

### 10. 🏷️ Badge decía "Retenido" en lugar de "Pendiente"

**Problema**: El texto del badge de estado en la tabla de pedidos decía **"Retenido"** pero debía decir **"Pendiente"**.

**Solución**: Cambio puntual en `renderAssignmentsTable()` en `app.js`: la condición `p.estado === 'Pendiente de Autorización'` ahora genera el badge con el texto `Pendiente`.

---

### 11. 🔄 Bug: Al rechazar ítems pendientes, se rechazaban también los ya autorizados

**Problema**: Si en un pedido parcialmente aprobado (con ítems en `"Autorizado"` de una ronda anterior), el autorizador seleccionaba "Rechazado" para los ítems pendientes restantes, el sistema pisaba **todos** los ítems (incluyendo los ya autorizados) con estado `"Rechazado"`.

**Solución**: Se modificó el bloque `rechazar` en `resolveOrder()`:
- Se itera el array de ítems del pedido.
- Los ítems que ya tienen `estado === 'Autorizado'` se **conservan tal cual** y su importe se suma al total del pedido.
- Solo los ítems que siguen en estado `"Pendiente"` se marcan como `"Rechazado"` con cantidad `0` y subtotal `$0,00`.
- Si al final quedan ítems autorizados → el pedido cierra como **"Autorizado"** (parcial).
- Si ningún ítem fue aprobado → el pedido cierra como **"Rechazado"** total.

---

### 12. 🏢 Rebranding a GR_CONSULTING y Formatos de Cotización/Presupuesto (NV)

**Problema**: Se requería quitar la identidad anterior de Barenbrug Palaversich por GR_CONSULTING, establecer una regla estricta de 12 dígitos (4 enteros, 8 decimales) para cotización y 9 dígitos fijos para el número secuencial del Presupuesto, y cambiar los datos del reporte a la sucursal de Rosario.

**Solución**:
- Reemplazo completo de logos y texto de Barenbrug Palaversich por **GR_CONSULTING** con logo y fondo premium.
- Validación de input en cotizaciones para limitar la escritura a un máximo de 12 caracteres (4 enteros, 8 decimales), autocompletando a 8 decimales al perder foco.
- Formateo estricto del número de Presupuesto a 9 dígitos secuenciales con prefijo `7000` (ej: `700008215`).
- Cambio del pie de reporte a: Rosario, Santa Fe (Av. del Rosario 5678, Tel: 3412723904, Fax: 3412723904).

---

### 13. ✏️ Modificación Completa del Presupuesto (Condición, Moneda, Depósito, Transporte y Cantidades)

**Problema**: El usuario requería poder modificar todo en un Presupuesto: condición, moneda, depósito, transporte y cantidad de artículos.

**Solución**:
- Se creó una sección y programa **"Modificación de Presupuesto"**.
- Se implementó un buffer de edición (`pedidoEdicionTemp`) para almacenar los cambios intermedios de forma segura.
- Los datos fijos se convirtieron en campos editables en modo Modificación (Select para Condición y Moneda con cotización, e inputs de cantidades para artículos).
- Se añadieron botones de lupa para Depósito y Transporte que abren buscadores avanzados F6 (`abrirRobotDepositosEdicion` / `abrirRobotTransportesEdicion`), registran la selección en el buffer y refrescan el modal de detalle sin perder cambios previos.
- Al guardar los cambios, se recalcula el importe total, se actualizan cantidades y estados de ítems, el estado del Presupuesto se restablece a `"Pendiente de Autorización"`, y se persiste en `localStorage`.

---

### 14. ❌ Presupuestos Rechazados

**Problema**: El usuario solicitó un historial/vista específica donde se guarden y listen los Presupuestos rechazados.

**Solución**:
- Se añadió la opción **"Rechazo de Presupuesto"** al menú lateral de todos los roles.
- Si el rol es Solicitante, filtra para mostrar solo sus propios Presupuestos rechazados; para Administrador y Autorizador se muestran todos.
- Al abrir un Presupuesto rechazado, se presenta en modo de solo lectura (estilo Presea) destacada en rojo con el motivo de rechazo ingresado por el autorizador.

---

### 15. 🚫 Validación de Stock 0

**Problema**: Si un artículo seleccionado tiene stock de 0, el sistema no debería permitir agregarlo a la lista de detalles ni realizar el Presupuesto, y debe figurar un cartel o advertencia que diga "Stock 0".

**Solución**:
- Se modificó `agregarArticuloDetalle` en `app.js` para validar si el artículo de stock seleccionado tiene stock menor o igual a `0`. En tal caso, bloquea la adición y lanza un cartel toast de error de tipo `'danger'` con el texto: *"Stock 0: El artículo seleccionado no tiene unidades disponibles."*.
- Se añadió una advertencia inmediata al seleccionar el producto (`seleccionarProducto` en `app.js`) mediante un toast de tipo `'warning'` para notificar al usuario de forma proactiva.
- Se mejoró visualmente el listado de autocompletado de productos (`renderDropdownChunk` en `app.js`), de modo que aquellos ítems con stock de `0` aparecen atenuados, con el stock en rojo y con una etiqueta explícita de `[STOCK 0]`.

---

## 📁 Archivos Modificados

| Archivo | Tipo de cambio |
|---|---|
| [`app.js`](file:///Users/melanigrandi/ANTY/NOTA%20DE%20VENTA/app.js) | Lógica: login, modales, buffer de edición, lupas de edición F6, guardado de Presupuestos, filtros de vistas y validaciones de stock |
| [`index.html`](file:///Users/melanigrandi/ANTY/NOTA%20DE%20VENTA/index.html) | HTML: Containers para campos dinámicos editables (condición, moneda, depósito, transporte) en modal de detalle |
| [`styles.css`](file:///Users/melanigrandi/ANTY/NOTA%20DE%20VENTA/styles.css) | Estilos: logo GR_CONSULTING, fondos oscuros premium, badges de estado |
| [`compilar_datos.py`](file:///Users/melanigrandi/ANTY/NOTA%20DE%20VENTA/compilar_datos.py) | Parser FoxPro de bases de datos FoxPro a JS estáticos |

---

## 🏁 Estado Final del Sistema

- ✅ Login funcional para 4 roles: Administrador, Autorizador, Solicitante
- ✅ Carga de pedidos con búsqueda de clientes, depósito, transporte y artículos
- ✅ Precios y cantidades editables por el vendedor al cargar artículos
- ✅ Rebranding completo a GR_CONSULTING y datos de reporte actualizados a sucursal Rosario
- ✅ Control estricto de números de Presupuesto (9 dígitos) y cotización (12 caracteres en total, 8 decimales)
- ✅ Edición completa de cabecera de Presupuesto (Condición, Moneda, Depósito, Transporte) y cantidades de artículos
- ✅ Buscador F6 de artículos, depósitos y transportistas en edición
- ✅ Sección para ver el listado de Presupuestos Rechazados con motivo de rechazo
- ✅ Autorización parcial por ítem con tildado/destildado individual
- ✅ Recálculo dinámico de totales en tiempo real
- ✅ Persistencia local mediante `localStorage`
- ✅ Consulta de stock con filtros por rubro y estado
- ✅ Descarga de planilla CSV por pedido
- ✅ Validación y bloqueo estricto con aviso "Stock 0" para artículos sin stock disponible

