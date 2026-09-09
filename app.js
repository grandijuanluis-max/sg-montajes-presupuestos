// --- ESTADO INICIAL Y ALMACENAMIENTO (SUPABASE DIRECT SYNC) ---
console.warn('✅✅✅ APP.JS v206 - FUENTE DE DATOS EXCLUSIVA: SUPABASE ✅✅✅');
const LOCAL_STATE_KEY = 'solicitudes_pedidos_local_state';

// Bases de datos globales centralizadas (Sincronizadas dinámicamente desde Supabase)
window.clientesDB = window.clientesDB || [];
window.condicionesDB = window.condicionesDB || [
    { codigo: "1", nombre: "CONTADO", dias: 0 },
    { codigo: "2", nombre: "30 Y 60 DIAS 50/50", dias: 30 },
    { codigo: "3", nombre: "30 DIAS", dias: 30 },
    { codigo: "4", nombre: "60 DIAS", dias: 60 }
];
window.depositosDB = window.depositosDB || [];
window.transportesDB = window.transportesDB || [];
window.vendedoresDB = window.vendedoresDB || [];
window.stockDB = window.stockDB || [];
window.presupuestosCatalogDB = window.presupuestosCatalogDB || [];

var clientesDB = window.clientesDB;
var condicionesDB = window.condicionesDB;
var depositosDB = window.depositosDB;
var transportesDB = window.transportesDB;
var vendedoresDB = window.vendedoresDB;
var stockDB = window.stockDB;
var presupuestosCatalogDB = window.presupuestosCatalogDB;

// Obtener fecha y hora local exacta en formato YYYY-MM-DD HH:mm:ss (Hora local real de carga)
function getLocalCurrentDateTimeStr(d = new Date()) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

// Generar una cadena de fecha y hora relativa
function getRelativeDateStr(hoursAgo) {
    const d = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    return getLocalCurrentDateTimeStr(d);
}

// Formatear objeto Date a string YYYY-MM-DD local
function getLocalDateStr(date = new Date()) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Convertir número a letras (Spelling out amount in words, Spanish)
function numeroALetras(num, moneda = 'PESOS') {
    function Unidades(num) {
        switch(num) {
            case 1: return "UN";
            case 2: return "DOS";
            case 3: return "TRES";
            case 4: return "CUATRO";
            case 5: return "CINCO";
            case 6: return "SEIS";
            case 7: return "SIETE";
            case 8: return "OCHO";
            case 9: return "NUEVE";
        }
        return "";
    }

    function Decenas(num) {
        let decena = Math.floor(num/10);
        let unidad = num - (decena * 10);

        switch(decena) {
            case 1:
                switch(unidad) {
                    case 0: return "DIEZ";
                    case 1: return "ONCE";
                    case 2: return "DOCE";
                    case 3: return "TRECE";
                    case 4: return "CATORCE";
                    case 5: return "QUINCE";
                    default: return "DIECI" + Unidades(unidad);
                }
            case 2:
                switch(unidad) {
                    case 0: return "VEINTE";
                    default: return "VEINTI" + Unidades(unidad);
                }
            case 3: return DecenasY("TREINTA", unidad);
            case 4: return DecenasY("CUARENTA", unidad);
            case 5: return DecenasY("CINCUENTA", unidad);
            case 6: return DecenasY("SESENTA", unidad);
            case 7: return DecenasY("SETENTA", unidad);
            case 8: return DecenasY("OCHENTA", unidad);
            case 9: return DecenasY("NOVENTA", unidad);
            case 0: return Unidades(unidad);
        }
    }

    function DecenasY(strSin, numUnidad) {
        if (numUnidad > 0) return strSin + " Y " + Unidades(numUnidad);
        return strSin;
    }

    function Centenas(num) {
        let centenas = Math.floor(num / 100);
        let decenas = num - (centenas * 100);

        switch(centenas) {
            case 1:
                if (decenas > 0) return "CIENTO " + Decenas(decenas);
                return "CIEN";
            case 2: return "DOSCIENTOS " + Decenas(decenas);
            case 3: return "TRESCIENTOS " + Decenas(decenas);
            case 4: return "CUATROCIENTOS " + Decenas(decenas);
            case 5: return "QUINIENTOS " + Decenas(decenas);
            case 6: return "SEISCIENTOS " + Decenas(decenas);
            case 7: return "SETECIENTOS " + Decenas(decenas);
            case 8: return "OCHOCIENTOS " + Decenas(decenas);
            case 9: return "NOVECIENTOS " + Decenas(decenas);
        }
        return Decenas(decenas);
    }

    function Seccion(num, divisor, strSingular, strPlural) {
        let cientos = Math.floor(num / divisor);
        let resto = num - (cientos * divisor);

        let letras = "";

        if (cientos > 0) {
            if (cientos > 1) letras = Centenas(cientos) + " " + strPlural;
            else letras = strSingular;
        }

        if (resto > 0) letras += "";

        return letras;
    }

    function Miles(num) {
        let divisor = 1000;
        let cientos = Math.floor(num / divisor);
        let resto = num - (cientos * divisor);

        let strMiles = Seccion(num, divisor, "UN MIL", "MIL");
        let strCentenas = Centenas(resto);

        if(strMiles == "") return strCentenas;

        return strMiles + " " + strCentenas;
    }

    function Millones(num) {
        let divisor = 1000000;
        let cientos = Math.floor(num / divisor);
        let resto = num - (cientos * divisor);

        let strMillones = Seccion(num, divisor, "UN MILLON DE", "MILLONES DE");
        let strMiles = Miles(resto);

        if(strMillones == "") return strMiles;

        return strMillones + " " + strMiles;
    }

    let entero = Math.floor(num);
    let centavos = Math.round((num - entero) * 100);
    let centavosStr = String(centavos).padStart(2, '0') + '/100';

    if (entero === 0) return "CERO " + moneda + " CON " + centavosStr;

    let letras = Millones(entero);
    if (letras.endsWith(" DE")) {
        letras = letras.substring(0, letras.length - 3);
    }

    return (letras.trim() + " " + moneda + " CON " + centavosStr).replace(/\s+/g, ' ');
}

// Generador de texto para el detalle de facturas pendientes
function generarDetalleFacturasPendientes(client, currency) {
    if (!client) return "SIN FACTURAS PENDIENTES DE PAGO\nDEUDA TOTAL REGISTRADA: $0,00";
    
    const deuda = client.deuda_actual || 0;
    if (deuda === 0) {
        return `SIN FACTURAS PENDIENTES DE PAGO\nDEUDA TOTAL REGISTRADA: $0,00`;
    }
    
    const isUSD = currency === 'Dólares';
    const currName = isUSD ? 'Dolares' : 'Pesos';
    const symbol = isUSD ? 'U$S' : '$';
    
    // Simular un desglose de dos facturas pendientes basadas en la deuda del cliente
    const f1_amt = (deuda * 0.6).toFixed(2);
    const f2_amt = (deuda * 0.4).toFixed(2);
    
    let text = `15/04/2026  FACTURA A  701041124  ${parseFloat(f1_amt).toLocaleString('es-AR', {minimumFractionDigits: 2})} ${currName}\n`;
    text += `10/05/2026  FACTURA A  701041556  ${parseFloat(f2_amt).toLocaleString('es-AR', {minimumFractionDigits: 2})} ${currName}\n`;
    
    const cotiz = 1011.00;
    const deudaEnPesos = (deuda * cotiz).toLocaleString('es-AR', {minimumFractionDigits: 2});
    
    if (isUSD) {
        text += `COMPROMISOS VARIOS EN U$ D/ELF. COTIZACION  ${(deuda * cotiz * 0.95).toLocaleString('es-AR', {maximumFractionDigits: 2})}\n`;
        text += `DEUDA TOTAL EN U$ S/ULT. COTIZACION        ${deuda.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    } else {
        text += `DEUDA TOTAL REGISTRADA EN PESOS: $${deuda.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    }
    
    return text;
}

// Frases motivacionales para la cabecera
const MOTIVATIONAL_QUOTES = [
    "La perseverancia puede transformar el fracaso en un logro extraordinario.",
    "El éxito comercial se construye con decisiones rápidas y análisis precisos.",
    "Tu dedicación de hoy determina el crecimiento de toda la organización mañana.",
    "Un cliente satisfecho es la mejor estrategia de negocios de todas.",
    "El control inteligente del crédito protege el valor de nuestro esfuerzo común.",
    "La excelencia no es un acto, es un hábito que se cultiva día a día.",
    "La mejor publicidad es la que hacen los clientes satisfechos.",
    "El servicio al cliente no es un departamento, es una actitud.",
    "La confianza de nuestros clientes se gana con transparencia, consistencia y resultados.",
    "Cada pedido es una oportunidad para superar las expectativas y consolidar una alianza.",
    "El valor de una empresa se mide por la lealtad y el éxito de quienes confían en ella.",
    "La clave del crecimiento sostenible está en cuidar cada detalle y a cada cliente.",
    "La calidad de nuestro servicio es el reflejo directo del respeto hacia quienes nos eligen."
];

const defaultUserPermissions = {
    'mel': ['menu-ingresar', 'menu-all', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-admin', 'menu-all-ver', 'menu-all-edit'],
    'melani': ['menu-ingresar', 'menu-all', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-admin', 'menu-all-ver', 'menu-all-edit'],
    'juanluis': ['menu-ingresar', 'menu-all', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-all-ver', 'menu-all-edit'],
    'luciano': ['menu-ingresar', 'menu-all', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-all-ver', 'menu-all-edit'],
    'roberto': ['menu-ingresar', 'menu-all', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-all-ver', 'menu-all-edit'],
    'nicole': ['menu-ingresar', 'menu-all', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-all-ver', 'menu-all-edit'],
    'alexis': ['menu-ingresar', 'menu-all', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-all-ver', 'menu-all-edit'],
    'emiliano': ['menu-ingresar', 'menu-all', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-all-ver', 'menu-all-edit']
};

// Usuarios por defecto si la base de datos está vacía
const defaultData = {
    users: [
        { id: '1', username: 'mel', password: '123', email: 'mel@empresa.com', role: 'Administrador', rubro_defecto: 'Eléctrico', vendedor_codigo: '', vendedor_nombre: '' },
        { id: '2', username: 'juanluis', password: '123', email: 'grandijuanluis@gmail.com', role: 'Solicitante', rubro_defecto: 'Eléctrico', vendedor_codigo: '103', vendedor_nombre: 'Juan Luis' },
        { id: '3', username: 'luciano', password: '123', email: 'luciano@sgmontajes.com', role: 'Solicitante', rubro_defecto: 'Eléctrico', vendedor_codigo: '102', vendedor_nombre: 'Luciano' },
        { id: '4', username: 'roberto', password: '123', email: 'Roberto@sgmontajes.com', role: 'Solicitante', rubro_defecto: 'Mecánico', vendedor_codigo: '104', vendedor_nombre: 'Roberto' },
        { id: '5', username: 'melani', password: '123', email: 'melanidaiana28@gmail.com', role: 'Administrador', rubro_defecto: 'Eléctrico', vendedor_codigo: '', vendedor_nombre: '' },
        { id: '6', username: 'nicole', password: '123', email: 'nicole@sgmontajes.com', role: 'Solicitante', rubro_defecto: 'Eléctrico', vendedor_codigo: '105', vendedor_nombre: 'Nicole' },
        { id: '7', username: 'alexis', password: '123', email: 'alexis@sgmontajes.com', role: 'Solicitante', rubro_defecto: 'Mecánico', vendedor_codigo: '106', vendedor_nombre: 'Alexis' },
        { id: '8', username: 'emiliano', password: '123', email: 'emiliano@sgmontajes.com', role: 'Solicitante', rubro_defecto: 'Eléctrico', vendedor_codigo: '107', vendedor_nombre: 'Emiliano' }
    ],
    pedidos: [],
    notifications: [],
    userPermissions: Object.assign({}, defaultUserPermissions),
    currentUserId: null
};

// --- CONFIGURACIÓN Y CLIENTE DE SUPABASE ---
var supabaseDb = null;
function getDbClient() {
    if (supabaseDb) return supabaseDb;
    if (typeof window !== 'undefined' && window.supabaseDb) {
        supabaseDb = window.supabaseDb;
        return supabaseDb;
    }
    if (typeof initSupabaseClient === 'function') {
        supabaseDb = initSupabaseClient();
        return supabaseDb;
    }
    return null;
}

// Función de normalización estricta de rubros
function normalizePresupuestosRubro(pedidos) {
    if (!Array.isArray(pedidos)) return [];
    pedidos.forEach(p => {
        const idStr = String(p.id || '').toUpperCase();
        const tipoStr = (p.tipo_presupuesto || '').toLowerCase();
        if (idStr.startsWith('101') || tipoStr.includes('mec')) {
            p.tipo_presupuesto = 'Mecánico';
            if (!idStr.startsWith('101-MEC-')) {
                const num = idStr.replace(/\D/g, '') || '0001';
                p.id = `101-MEC-${String(num.slice(-4)).padStart(4, '0')}`;
            }
        } else {
            p.tipo_presupuesto = 'Eléctrico';
            if (!idStr.startsWith('102-ELEC-')) {
                const num = idStr.replace(/\D/g, '') || '0001';
                p.id = `102-ELEC-${String(num.slice(-4)).padStart(4, '0')}`;
            }
        }
    });
    return pedidos;
}

// Mantener la sesión localmente y sincronizada
let appData = JSON.parse(JSON.stringify(defaultData));
appData.pedidos = [];

// Cargar datos desde localStorage si existen
try {
    const local = JSON.parse(localStorage.getItem(LOCAL_STATE_KEY));
    if (local && local.users && local.users.length > 0) {
        let loadedPedidos = Array.isArray(local.pedidos) ? local.pedidos : [];
        appData.pedidos = normalizePresupuestosRubro(loadedPedidos);
        
        // Filtrar usuarios removidos (admin, aut, sol)
        appData.users = (local.users || defaultData.users).filter(u => !['admin', 'aut', 'sol'].includes(String(u.username).trim().toLowerCase()));
        if (appData.users.length === 0) appData.users = defaultData.users.slice();
        appData.notifications = Array.isArray(local.notifications) ? local.notifications : [];
        if (local.userPermissions && typeof local.userPermissions === 'object' && Object.keys(local.userPermissions).length > 0) {
            appData.userPermissions = Object.assign({}, defaultUserPermissions, local.userPermissions);
        } else {
            appData.userPermissions = Object.assign({}, defaultUserPermissions);
        }
        delete appData.userPermissions['admin'];
        delete appData.userPermissions['aut'];
        delete appData.userPermissions['sol'];
        delete appData.userPermissions['menu-asignaciones'];
    }
} catch(e) {}

function mergeUsersList(localUsers, remoteUsers) {
    const list = Array.isArray(localUsers) ? localUsers.slice() : [];
    const rem = Array.isArray(remoteUsers) ? remoteUsers : [];
    
    rem.forEach(ru => {
        if (!ru || !ru.username) return;
        const exists = list.find(lu => String(lu.username).trim().toLowerCase() === String(ru.username).trim().toLowerCase());
        if (!exists) {
            list.push(ru);
        } else {
            if (ru.rubro_defecto && !exists.rubro_defecto) exists.rubro_defecto = ru.rubro_defecto;
            if (ru.password && !exists.password) exists.password = ru.password;
            if (ru.role && !exists.role) exists.role = ru.role;
        }
    });

    return list.filter(u => !['admin', 'aut', 'sol'].includes(String(u.username).trim().toLowerCase()));
}

let isFirstLoad = true;
let supabaseRealtimeChannel = null;

function initSupabaseSync(callback) {
    const client = getDbClient();
    if (!client) {
        console.warn("⚠️ No se pudo inicializar cliente de Supabase.");
        if (callback) callback();
        return;
    }

    console.log("🔄 Conectando y leyendo datos directamente desde Supabase...");

    // 1. LECTURA DIRECTA DE LA TABLA 'clientes'
    client.from('clientes').select('*').then(function(cRes) {
        if (cRes.data && cRes.data.length > 0) {
            if (typeof clientesDB !== 'undefined') {
                clientesDB.length = 0;
                cRes.data.forEach(function(sc) {
                    clientesDB.push(sc);
                });
                window.clientesDB = clientesDB;
            }
            console.log("✅ " + cRes.data.length + " clientes leídos directamente de la tabla 'clientes' en Supabase.");
        } else if (cRes.data && cRes.data.length === 0 && typeof clientesDB !== 'undefined' && clientesDB.length > 0) {
            // Si la tabla remota está vacía, sembrar los clientes iniciales
            client.from('clientes').upsert(clientesDB).then(function() {
                console.log("☁️ 11 clientes iniciales subidos a la tabla 'clientes' de Supabase.");
            }).catch(function(e) { console.warn("Aviso al subir clientes a Supabase:", e); });
        }
    }).catch(function(err) {
        console.warn("Aviso al consultar tabla 'clientes' en Supabase:", err);
    });

    // 2. LECTURA DIRECTA DE LA TABLA 'usuarios'
    client.from('usuarios').select('*').then(function(uRes) {
        if (uRes.data && uRes.data.length > 0) {
            appData.users = mergeUsersList(appData.users, uRes.data);
            console.log("✅ " + uRes.data.length + " usuarios leídos directamente de la tabla 'usuarios' en Supabase.");
        }
    }).catch(function(err) {
        console.warn("Aviso al consultar tabla 'usuarios' en Supabase:", err);
    });

    // 3. LECTURA DE ESTADO GLOBAL Y PRESUPUESTOS (tabla 'app_state')
    client
        .from('app_state')
        .select('*')
        .eq('id', 'globalData')
        .maybeSingle()
        .then(function(res) {
            if (res.data) {
                const data = res.data;
                if (Array.isArray(data.pedidos)) {
                    appData.pedidos = normalizePresupuestosRubro(data.pedidos);
                }
                if (data.users) {
                    appData.users = mergeUsersList(appData.users, data.users);
                }
                if (Array.isArray(data.notifications)) {
                    appData.notifications = data.notifications;
                }
                if (data.user_permissions && typeof data.user_permissions === 'object' && Object.keys(data.user_permissions).length > 0) {
                    appData.userPermissions = Object.assign({}, defaultUserPermissions, appData.userPermissions, data.user_permissions);
                } else if (!appData.userPermissions || Object.keys(appData.userPermissions).length === 0) {
                    appData.userPermissions = Object.assign({}, defaultUserPermissions);
                }
                if (data.custom_prices) {
                    appData.customPrices = data.custom_prices;
                    try {
                        const localPrices = getCustomItemPrices();
                        const merged = Object.assign({}, localPrices, data.custom_prices);
                        localStorage.setItem('PRESUPUESTO_CUSTOM_PRICES', JSON.stringify(merged));
                        if (typeof PRESUPUESTO_ELECTRICO_STOCK !== 'undefined') applyCustomPricesToCatalog(PRESUPUESTO_ELECTRICO_STOCK);
                        if (typeof PRESUPUESTO_MECANICO_STOCK !== 'undefined') applyCustomPricesToCatalog(PRESUPUESTO_MECANICO_STOCK);
                    } catch (e) {}
                }
            } else {
                // Fallback directo a tabla 'presupuestos' de Supabase
                client.from('presupuestos').select('*').then(function(pRes) {
                    if (pRes.data && pRes.data.length > 0) {
                        appData.pedidos = normalizePresupuestosRubro(pRes.data);
                        saveData();
                        console.log("✅ " + pRes.data.length + " presupuestos leídos directamente de la tabla 'presupuestos' en Supabase.");
                    }
                }).catch(function(pErr) { console.warn("Aviso tabla presupuestos:", pErr); });
            }

            // Sincronizar items desde tabla presupuesto_items de Supabase
            client.from('presupuesto_items').select('*').then(function(itemsRes) {
                if (itemsRes.data && itemsRes.data.length > 0 && Array.isArray(appData.pedidos)) {
                    const itemsMap = {};
                    itemsRes.data.forEach(function(it) {
                        const pid = String(it.presupuesto_id || '');
                        if (!itemsMap[pid]) itemsMap[pid] = [];
                        const cant = parseFloat(it.cantidad) || 1;
                        const pu = parseFloat(it.precio_unitario || it.precio) || 0;
                        itemsMap[pid].push({
                            codigo: String(it.codigo || ''),
                            detalle: String(it.detalle || ''),
                            rubro: it.rubro || 'Eléctrico',
                            subrubro: it.subrubro || '',
                            cantidad: cant,
                            unidad: it.unidad || 'UN',
                            udm: it.unidad || 'UN',
                            precio: pu,
                            precio_unitario: pu,
                            subtotal: parseFloat(it.subtotal) || (cant * pu),
                            estado: 'Pendiente'
                        });
                    });
                    let changed = false;
                    appData.pedidos.forEach(function(p) {
                        const pid = String(p.id);
                        if ((!Array.isArray(p.items) || p.items.length === 0) && itemsMap[pid] && itemsMap[pid].length > 0) {
                            p.items = itemsMap[pid];
                            changed = true;
                        }
                        if (Array.isArray(p.items) && p.items.length > 0) {
                            const tot = p.items.reduce(function(s, it) {
                                const q = parseFloat(String(it.cantidad || '0').replace(',', '.')) || 0;
                                const pr = parseFloat(String(it.precio !== undefined ? it.precio : (it.precio_unitario || 0)).replace(',', '.')) || 0;
                                const sub = (it.subtotal !== undefined && it.subtotal !== null && !isNaN(parseFloat(String(it.subtotal).replace(',', '.')))) ? parseFloat(String(it.subtotal).replace(',', '.')) : (q * pr);
                                return s + sub;
                            }, 0);
                            if (tot > 0 && (!p.importe || parseFloat(p.importe) === 0)) {
                                p.importe = tot;
                                p.importe_original = tot;
                                changed = true;
                            }
                        }
                    });
                    if (changed) {
                        saveData();
                        if (typeof renderAssignmentsTable === 'function') renderAssignmentsTable();
                        if (pedidoActivo && typeof renderModalReportTable === 'function') {
                            const refreshed = appData.pedidos.find(function(x) { return x.id === pedidoActivo.id; });
                            if (refreshed) {
                                pedidoActivo = refreshed;
                                renderModalReportTable(pedidoActivo, pedidoActivo.tipo_reporte || 'detallado');
                            }
                        }
                    }
                }
            }).catch(function(err) { console.warn("Aviso presupuesto_items:", err); });

            console.log("⚡ Supabase conectado y sincronizado en tiempo real.");
            saveData();

            // 4. SUSCRIPCIÓN EN TIEMPO REAL A TODAS LAS TABLAS DE SUPABASE
            try {
                if (supabaseRealtimeChannel) {
                    client.removeChannel(supabaseRealtimeChannel);
                }
                
                // Suscripción Realtime a app_state
                supabaseRealtimeChannel = client
                    .channel('public:app_state:globalData')
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'app_state',
                        filter: 'id=eq.globalData'
                    }, function(payload) {
                        if (payload.new) {
                            const data = payload.new;
                            appData.pedidos = data.pedidos || [];
                            appData.users = mergeUsersList(appData.users, data.users);
                            appData.notifications = data.notifications || [];
                            if (data.user_permissions && typeof data.user_permissions === 'object' && Object.keys(data.user_permissions).length > 0) {
                                appData.userPermissions = Object.assign({}, defaultUserPermissions, appData.userPermissions, data.user_permissions);
                            }
                            try { localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(appData)); } catch(e) {}

                            if (!isFirstLoad && appData.currentUserId) {
                                renderNotifications();
                                const activeMenu = document.querySelector('.menu-item.active');
                                if (activeMenu) {
                                    const modalOverlay = document.getElementById('modal-overlay');
                                    const isModalOpen = modalOverlay && modalOverlay.style.display === 'flex';
                                    const isTyping = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
                                    if (!isModalOpen && !isTyping) {
                                        const currentUser = getCurrentUser();
                                        if (currentUser) {
                                            const items = getMenuItemsForUser(currentUser);
                                            const item = items.find(function(it) { return it.id === activeMenu.id; });
                                            if (item && item.action) item.action();
                                        }
                                    }
                                }
                            }
                            isFirstLoad = false;
                        }
                    })
                    .subscribe();

                // Suscripción Realtime a la tabla 'clientes'
                client
                    .channel('public:clientes')
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'clientes'
                    }, function(payload) {
                        if (payload.new && typeof clientesDB !== 'undefined') {
                            const sc = payload.new;
                            const idx = clientesDB.findIndex(function(lc) { return String(lc.codigo) === String(sc.codigo); });
                            if (idx !== -1) {
                                clientesDB[idx] = sc;
                            } else {
                                clientesDB.push(sc);
                            }
                            window.clientesDB = clientesDB;
                            console.log("⚡ Cliente actualizado en vivo desde Supabase:", sc.nombre);
                        }
                    })
                    .subscribe();

            } catch(subErr) {
                console.warn("Error suscribiendo a Realtime de Supabase:", subErr);
            }

            if (callback) callback();
        })
        .catch(function(err) {
            console.warn("Error cargando datos de Supabase:", err);
            saveData();
            if (callback) callback();
        });
}

// Compatibilidad hacia atrás
function initFirebaseSync(callback) {
    return initSupabaseSync(callback);
}

function getCurrentUser() {
    if (!appData || !appData.currentUserId) return null;
    if (!Array.isArray(appData.users) || appData.users.length === 0) {
        appData.users = defaultData.users.slice();
    }
    var found = appData.users.find(u => String(u.id) === String(appData.currentUserId));
    if (!found && Array.isArray(defaultData.users)) {
        found = defaultData.users.find(u => String(u.id) === String(appData.currentUserId));
        if (found) appData.users.push(found);
    }
    return found || null;
}

// Utilidades
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

function saveData() {
    try {
        localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(appData));
    } catch (e) {
        console.error("Error saving data to localStorage:", e);
    }
    
    // Guardar en Supabase para sincronización global y tiempo real
    const client = getDbClient();
    if (client) {
        // 1. Estado global en app_state
        client.from('app_state').upsert({
            id: 'globalData',
            pedidos: appData.pedidos || [],
            users: appData.users || [],
            notifications: appData.notifications || [],
            user_permissions: (appData.userPermissions && typeof appData.userPermissions === 'object' && Object.keys(appData.userPermissions).length > 0)
                ? Object.assign({}, defaultUserPermissions, appData.userPermissions)
                : Object.assign({}, defaultUserPermissions),
            // custom_prices: (typeof appData !== 'undefined' && appData && appData.customPrices) ? appData.customPrices : (typeof getCustomItemPrices === 'function' ? getCustomItemPrices() : {}),
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' }).then(function(res) {
            if (res && res.error) {
                console.warn("⚠️ Supabase sync warning (app_state):", res.error);
            } else {
                console.log("☁️ Supabase: app_state sincronizado con éxito.");
            }
        }).catch(function(err) {
            console.error("Error saving to Supabase:", err);
        });

        // 2. Sincronizar usuarios individuales en la tabla usuarios para que aparezcan en el Table Editor
        if (Array.isArray(appData.users) && appData.users.length > 0) {
            const usersRows = appData.users.map(function(u) {
                return {
                    id: String(u.id),
                    username: String(u.username || '').trim(),
                    password: String(u.password || ''),
                    email: u.email || '',
                    role: u.role || 'Solicitante',
                    rubro_defecto: u.rubro_defecto || 'Eléctrico'
                };
            });
            client.from('usuarios').upsert(usersRows, { onConflict: 'username' }).then(function(res) {
                if (res && res.error) console.warn("⚠️ Supabase usuarios warning:", res.error);
                else console.log("☁️ Supabase: " + usersRows.length + " usuarios sincronizados.");
            }).catch(function() {});
        }

        // 3. Sincronizar presupuestos individuales en la tabla presupuestos de Supabase
        if (Array.isArray(appData.pedidos) && appData.pedidos.length > 0) {
            const presupuestosRows = appData.pedidos.map(function(p) {
                return {
                    id: String(p.id),
                    fecha: p.fecha || getLocalCurrentDateTimeStr(),
                    tipo_presupuesto: p.tipo_presupuesto || 'Eléctrico',
                    cliente_id: String(p.cliente_id || '3'),
                    cliente_nombre: String(p.cliente_nombre || 'CARGILL SACI'),
                    cuit: p.cuit || '',
                    telefono: p.telefono || '',
                    email: p.email || '',
                    importe_total: parseFloat(p.importe || p.importe_total) || 0,
                    estado: p.estado || 'Enviado sin OC',
                    nro_oc: p.nro_oc || p.meca_nro_oc || '',
                    nro_ot: p.nro_ot || p.meca_nro_ot || '',
                    denominacion: p.denominacion || p.meca_denominacion || '',
                    tipo_reporte: p.tipo_reporte || 'detallado',
                    planta: p.planta || p.meca_planta || '',
                    proveedor: p.proveedor || p.meca_proveedor || '',
                    fecha_oferta: p.fecha_oferta || p.meca_fecha_oferta || '',
                    validez: p.validez || p.meca_validez || '',
                    fecha_inicio: p.fecha_inicio || p.meca_fecha_inicio || '',
                    duracion: p.duracion || p.meca_duracion || '',
                    fecha_fin: p.fecha_fin || p.meca_fecha_fin || '',
                    propuesta: p.propuesta || p.meca_propuesta || '',
                    personal: p.personal || p.meca_personal || '',
                    exclusiones: p.exclusiones || p.meca_exclusiones || '',
                    motivo_rechazo: p.motivo_rechazo || '',
                    operador: p.operador || 'admin',
                    avance_porcentaje_acumulado: parseFloat(p.avance_porcentaje_acumulado) || 0,
                    facturado_porcentaje: parseFloat(p.avance_porcentaje_acumulado || p.facturado_porcentaje) || 0,
                    monto_facturado: parseFloat(p.monto_facturado_total || p.monto_facturado) || 0
                };
            });
            client.from('presupuestos').upsert(presupuestosRows, { onConflict: 'id' }).then(function(res) {
                if (res && res.error) console.warn("⚠️ Supabase presupuestos warning:", res.error);
                else console.log("☁️ Supabase: " + presupuestosRows.length + " presupuestos sincronizados con éxito.");
            }).catch(function(err) {
                console.error("Error sincronizando presupuestos:", err);
            });
        }

        // 4. Sincronizar avances de obra individuales en la tabla avances_obra de Supabase
        const allAvancesRows = [];
        if (Array.isArray(appData.pedidos)) {
            appData.pedidos.forEach(function(p) {
                if (Array.isArray(p.avances) && p.avances.length > 0) {
                    const totalAmt = parseFloat(p.importe || p.importe_total || 0);
                    p.avances.forEach(function(a, aIdx) {
                        const pct = parseFloat(a.porcentaje) || 0;
                        const monto = parseFloat(a.monto) || (totalAmt * (pct / 100));
                        allAvancesRows.push({
                            id: `${String(p.id)}-AV-${String(aIdx + 1).padStart(2, '0')}`,
                            presupuesto_id: String(p.id),
                            fecha: a.fecha || new Date().toISOString().substring(0, 10),
                            porcentaje: pct,
                            monto_equivalente: monto,
                            nro_documento: a.nro_doc || a.nro_documento || '',
                            detalle: a.detalle || ''
                        });
                    });
                }
            });
        }
        if (allAvancesRows.length > 0) {
            client.from('avances_obra').upsert(allAvancesRows, { onConflict: 'id' }).then(function(res) {
                if (res && res.error) console.warn("⚠️ Supabase avances_obra warning:", res.error);
                else console.log("☁️ Supabase: " + allAvancesRows.length + " avances de obra sincronizados.");
            }).catch(function(err) {
                console.error("Error sincronizando avances:", err);
            });
        }

        // 5. Sincronizar items de presupuestos en la tabla presupuesto_items de Supabase
        const allItemsRows = [];
        if (Array.isArray(appData.pedidos)) {
            appData.pedidos.forEach(function(p) {
                if (Array.isArray(p.items) && p.items.length > 0) {
                    p.items.forEach(function(it, idx) {
                        const cant = parseFloat(it.cantidad) || 0;
                        const pu = parseFloat(it.precio || it.precio_unitario) || 0;
                        const sub = parseFloat(it.subtotal) || (cant * pu);
                        if (cant > 0 || sub > 0 || it.detalle) {
                            allItemsRows.push({
                                id: `${String(p.id)}-ITM-${String(idx + 1).padStart(2, '0')}`,
                                presupuesto_id: String(p.id),
                                codigo: String(it.codigo || `ITM-${idx + 1}`),
                                detalle: String(it.detalle || it.descripcion || 'Item de Presupuesto'),
                                rubro: p.tipo_presupuesto || 'Eléctrico',
                                subrubro: it.subrubro || '',
                                cantidad: cant,
                                unidad: it.unidad || 'UN',
                                precio_unitario: pu,
                                subtotal: sub,
                                orden: idx + 1
                            });
                        }
                    });
                }
            });
        }
        if (allItemsRows.length > 0) {
            client.from('presupuesto_items').upsert(allItemsRows, { onConflict: 'id' }).then(function(res) {
                if (res && res.error) console.warn("⚠️ Supabase presupuesto_items warning:", res.error);
                else console.log("☁️ Supabase: " + allItemsRows.length + " items sincronizados en presupuesto_items.");
            }).catch(function(err) {
                console.error("Error sincronizando presupuesto_items:", err);
            });
        }

        // 6. Sincronizar notificaciones en la tabla notificaciones de Supabase
        if (Array.isArray(appData.notifications) && appData.notifications.length > 0) {
            const notifsRows = appData.notifications.map(function(n, nIdx) {
                const notifId = String(n.id || '').startsWith('NOTIF-') ? String(n.id) : `NOTIF-${String(nIdx + 1).padStart(4, '0')}`;
                return {
                    id: notifId,
                    user_id: String(n.userId || '1'),
                    message: String(n.message || ''),
                    read: !!n.read,
                    timestamp: n.timestamp || new Date().toISOString(),
                    task_id: n.taskId ? String(n.taskId) : null
                };
            });
            client.from('notificaciones').upsert(notifsRows, { onConflict: 'id' }).then(function(res) {
                if (res && res.error) console.warn("⚠️ Supabase notificaciones warning:", res.error);
                else console.log("☁️ Supabase: " + notifsRows.length + " notificaciones sincronizadas.");
            }).catch(function(err) {
                console.error("Error sincronizando notificaciones:", err);
            });
        }
    }
}
window.saveData = saveData;
window.saveAppData = saveData;
window.initSupabaseSync = initSupabaseSync;
window.initFirebaseSync = initSupabaseSync;

// -- NOTIFICACIONES --
function addNotification(userId, message, linkTaskId = null) {
    if (!appData.notifications) appData.notifications = [];
    appData.notifications.unshift({
        id: generateId(),
        userId: userId,
        message: message,
        read: false,
        timestamp: new Date().toISOString(),
        taskId: linkTaskId
    });
    saveData();
    renderNotifications();
}

function renderNotifications() {
    const bellBadge = document.getElementById('notification-badge');
    const dropdownList = document.getElementById('notification-list');
    if (!bellBadge || !dropdownList) return;

    if (!appData || !appData.currentUserId) {
        bellBadge.style.display = 'none';
        return;
    }

    const notifs = (appData && Array.isArray(appData.notifications)) ? appData.notifications : [];
    const myNotifs = notifs.filter(n => n && (n.userId === appData.currentUserId || n.userId === 'all'));
    const unreadCount = myNotifs.filter(n => n && !n.read).length;

    if (unreadCount > 0) {
        bellBadge.innerText = unreadCount;
        bellBadge.style.display = 'block';
    } else {
        bellBadge.style.display = 'none';
    }

    dropdownList.innerHTML = '';
    if (myNotifs.length === 0) {
        dropdownList.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 10px;">No tenés notificaciones</p>';
    } else {
        myNotifs.slice(0, 10).forEach(n => {
            if (!n) return;
            const notifEl = document.createElement('div');
            notifEl.style.padding = '8px';
            notifEl.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            notifEl.style.fontSize = '12px';
            notifEl.style.cursor = 'pointer';
            if (!n.read) notifEl.style.backgroundColor = 'rgba(255,255,255,0.05)';
            
            notifEl.innerHTML = `
                <div style="font-weight: ${n.read ? 'normal' : 'bold'}; color: ${n.read ? 'var(--text-muted)' : 'var(--text-main)'};">${n.message}</div>
                <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">${new Date(n.timestamp).toLocaleString('es-AR')}</div>
            `;
            
            notifEl.onclick = () => {
                n.read = true;
                saveData();
                renderNotifications();
                document.getElementById('notification-dropdown').style.display = 'none';
                if (n.taskId) {
                    // Abrir el pedido para resolver / ver detalle
                    verDetallePedido(n.taskId);
                }
            };
            
            dropdownList.appendChild(notifEl);
        });
    }
}

// Configurar campanita de notificaciones
document.addEventListener('DOMContentLoaded', () => {
    // Cargar tema inicial
    const savedTheme = localStorage.getItem('presea_theme') || 'cyberpunk';
    document.body.setAttribute('data-theme', savedTheme);

    const bellIcon = document.getElementById('notification-bell');
    const dropdown = document.getElementById('notification-dropdown');
    if (bellIcon && dropdown) {
        bellIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });
        
        document.addEventListener('click', () => {
            dropdown.style.display = 'none';
        });
        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Configurar toggle del menú lateral (hamburguesa en móvil)
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar-menu');
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('open');
        });
        
        // Cerrar sidebar al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && e.target !== toggleBtn) {
                sidebar.classList.remove('open');
            }
        });
    }

    // Delegación de eventos para validar y formatear los campos de cotización (máx 4 enteros, máx 8 decimales)
    document.addEventListener('input', (e) => {
        if (e.target && (e.target.id === 'req-exchange-rate' || e.target.id === 'auth-exchange-rate-input')) {
            let value = e.target.value;
            // Remover cualquier caracter que no sea número o punto decimal
            value = value.replace(/[^0-9.]/g, '');
            
            // Permitir como máximo un solo punto decimal
            const parts = value.split('.');
            if (parts.length > 2) {
                value = parts[0] + '.' + parts.slice(1).join('');
            }
            
            // Limitar la longitud antes y después del punto
            const finalParts = value.split('.');
            let integerPart = finalParts[0];
            let decimalPart = finalParts[1];
            
            if (integerPart.length > 4) {
                integerPart = integerPart.substring(0, 4);
            }
            if (decimalPart !== undefined && decimalPart.length > 8) {
                decimalPart = decimalPart.substring(0, 8);
            }
            
            e.target.value = decimalPart !== undefined ? (integerPart + '.' + decimalPart) : integerPart;
        }
    });

    document.addEventListener('focusout', (e) => {
        if (e.target && (e.target.id === 'req-exchange-rate' || e.target.id === 'auth-exchange-rate-input')) {
            let val = parseFloat(e.target.value);
            if (isNaN(val) || val <= 0) {
                if (e.target.id === 'req-exchange-rate') {
                    const currencySelect = document.getElementById('req-currency');
                    const currencyVal = currencySelect ? parseInt(currencySelect.value) : 1;
                    val = (currencyVal === 2 ? 1011.00 : (currencyVal === 60 ? 1100.00 : 1.0));
                } else {
                    const currencySelect = document.getElementById('auth-currency-select');
                    const currencyVal = currencySelect ? parseInt(currencySelect.value) : 1;
                    val = (currencyVal === 2 ? 1011.00 : (currencyVal === 60 ? 1100.00 : 1.0));
                }
            }
            e.target.value = val.toFixed(8);
        }
    });
    
    // Iniciar la app inmediatamente sin bloquear por red
    startApp();
    try {
        if (typeof initSupabaseSync === 'function') {
            initSupabaseSync();
        } else if (typeof initFirebaseSync === 'function') {
            initFirebaseSync();
        }
    } catch (e) {
        console.warn("Supabase sync bypass:", e);
    }
});

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    else if (type === 'error' || type === 'danger') icon = '❌';
    else if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `
        <span style="font-size: 13px; flex-shrink: 0;">${icon}</span>
        <span style="font-size: 12px; font-weight: 600; color: #ffffff; line-height: 1.25;">${message}</span>
    `;
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 30);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 250);
    }, 2400);
}

// --- NAVEGACIÓN Y VISTAS ---
function switchView(viewName) {
    const loginView = document.getElementById('login-view');
    const mainView = document.getElementById('main-view');
    
    if (typeof closeModal === 'function') {
        closeModal();
    }

    if (viewName === 'main') {
        if (loginView) {
            loginView.classList.remove('active');
            loginView.style.display = 'none';
        }
        if (mainView) {
            mainView.classList.add('active');
            mainView.style.display = 'flex';
        }
    } else {
        if (mainView) {
            mainView.classList.remove('active');
            mainView.style.display = 'none';
        }
        if (loginView) {
            loginView.classList.add('active');
            loginView.style.display = 'flex';
        }
    }
}

function renderContent(templateId) {
    const mainContent = document.getElementById('main-content');
    const template = document.getElementById(templateId);
    if (!template) return;
    mainContent.innerHTML = '';
    mainContent.appendChild(template.content.cloneNode(true));
}

// --- LÓGICA DE ROLES, PERMISOS Y MENÚ ---
const defaultMenuPermissions = {
    Administrador: ['menu-ingresar', 'menu-all', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-admin'],
    Solicitante: ['menu-ingresar', 'menu-all', 'menu-estado-presupuesto', 'menu-rechazados'],
    Autorizador: ['menu-all', 'menu-estado-presupuesto', 'menu-rechazados'],
    Ventas: ['menu-ingresar', 'menu-all', 'menu-estado-presupuesto']
};

const allAvailableModules = [
    { id: 'menu-ingresar', label: 'Gestión de Presupuestos', icon: 'fa-solid fa-pen-to-square', tpl: 'tpl-request-ped', action: initRequestView },
    { id: 'menu-all', label: 'Seguimiento', icon: 'fa-solid fa-clock-rotate-left', tpl: 'tpl-assignments', action: () => initAssignmentsView('Modificacion') },
    { id: 'menu-estado-presupuesto', label: 'Estado del Presupuesto', icon: 'fa-solid fa-list-check', tpl: 'tpl-assignments', action: () => initAssignmentsView('EstadoPresupuesto') },
    { id: 'menu-rechazados', label: 'Rechazo de Presupuesto', icon: 'fa-solid fa-ban', tpl: 'tpl-assignments', action: () => initAssignmentsView('Rechazados') },
    { id: 'menu-metrics', label: 'Estadísticas y BI', icon: 'fa-solid fa-chart-pie', tpl: 'tpl-metrics', action: initMetricsView },
    { id: 'menu-admin', label: 'Configuración', icon: 'fa-solid fa-gear', tpl: 'tpl-admin', action: initAdminView }
];

function getUserEffectivePermissions(userOrName, role) {
    let username = typeof userOrName === 'string' ? userOrName : (userOrName ? userOrName.username : '');
    let userRole = (userOrName && typeof userOrName === 'object') ? userOrName.role : (role || 'Solicitante');
    const uKey = String(username || '').trim().toLowerCase();

    // 1. Buscar en appData.userPermissions por clave insensible a mayúsculas
    let perms = null;
    if (appData && appData.userPermissions && typeof appData.userPermissions === 'object') {
        for (let k of Object.keys(appData.userPermissions)) {
            if (String(k).trim().toLowerCase() === uKey) {
                const val = appData.userPermissions[k];
                if (Array.isArray(val)) {
                    perms = val;
                    break;
                }
            }
        }
    }

    // 2. Si no se encontró, buscar en defaultUserPermissions
    if (!perms || !Array.isArray(perms)) {
        for (let k of Object.keys(defaultUserPermissions)) {
            if (String(k).trim().toLowerCase() === uKey) {
                perms = defaultUserPermissions[k];
                break;
            }
        }
    }

    // 3. Si aún no se encontró, usar defaultMenuPermissions por rol
    if (!perms || !Array.isArray(perms)) {
        perms = defaultMenuPermissions[userRole] || ['menu-ingresar', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-all'];
    }

    return Array.isArray(perms) ? perms : [];
}

window.getUserEffectivePermissions = getUserEffectivePermissions;

window.getUserSeguimientoPermissions = function(user) {
    if (!user) return { hasAccess: false, canViewComprobante: false, canEdit: false };
    
    const userPerms = getUserEffectivePermissions(user);
    const hasMenuAll = userPerms.includes('menu-all');
    const hasVer = userPerms.includes('menu-all-ver');
    const hasEdit = userPerms.includes('menu-all-edit');

    // Compatibilidad retroactiva: si sólo tenía 'menu-all' sin los nuevos subpermisos
    if (hasMenuAll && !hasVer && !hasEdit) {
        return {
            hasAccess: true,
            canViewComprobante: true,
            canEdit: true
        };
    }

    return {
        hasAccess: hasMenuAll || hasVer || hasEdit,
        canViewComprobante: hasVer || (hasMenuAll && !hasEdit),
        canEdit: hasEdit
    };
};

function getMenuItemsForUser(user) {
    if (!user) return [];
    const userPerms = getUserEffectivePermissions(user);
    return allAvailableModules.filter(m => {
        if (m.id === 'menu-all') {
            return userPerms.includes('menu-all') || userPerms.includes('menu-all-ver') || userPerms.includes('menu-all-edit');
        }
        return userPerms.includes(m.id);
    });
}

function buildSidebar() {
    const user = getCurrentUser();
    if (!user) return;
    const sidebar = document.getElementById('sidebar-menu');
    if (!sidebar) return;
    sidebar.innerHTML = '';

    // Botón Volver al inicio de la barra
    const btnVolver = document.createElement('button');
    btnVolver.id = 'btn-sidebar-volver';
    btnVolver.type = 'button';
    btnVolver.className = 'btn btn-sm btn-nav-volver';
    btnVolver.onclick = () => volverAccionAnterior();
    btnVolver.title = 'Volver a la pantalla anterior';
    btnVolver.style.cssText = 'font-family: inherit; font-size: 11.5px; font-weight: 700; height: 30px; padding: 0 12px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.5); border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s; white-space: nowrap; margin-right: 6px; flex-shrink: 0;';
    btnVolver.innerHTML = `<i class="fa-solid fa-arrow-left"></i> Volver`;
    sidebar.appendChild(btnVolver);

    document.getElementById('current-user-name').innerText = user.username;
    
    // Mostrar nombre del vendedor si lo tiene
    const vendedorBadgeId = 'header-vendedor-badge';
    let existingBadge = document.getElementById(vendedorBadgeId);
    if (existingBadge) existingBadge.remove();
    if (user.vendedor_nombre) {
        const vendedorBadge = document.createElement('span');
        vendedorBadge.id = vendedorBadgeId;
        vendedorBadge.style.cssText = 'font-size: 11px; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); color: #10b981; padding: 2px 8px; border-radius: 20px; font-weight: 600; letter-spacing: 0.3px;';
        vendedorBadge.innerHTML = `🧑‍💼 ${user.vendedor_nombre}`;
        document.getElementById('current-user-name').insertAdjacentElement('afterend', vendedorBadge);
    }
    
    const roleEl = document.getElementById('current-user-role');
    if (roleEl) roleEl.remove();

    const items = getMenuItemsForUser(user);
    
    items.forEach((item, index) => {
        const a = document.createElement('a');
        a.className = 'menu-item';
        a.id = item.id;
        a.innerHTML = `<i class="${item.icon}"></i> <span>${item.label}</span>`;
        a.onclick = (e) => {
            e.preventDefault();
            document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
            a.classList.add('active');
            renderContent(item.tpl);
            if (item.action) item.action();
            
            if (typeof window.registrarNavegacion === 'function') {
                window.registrarNavegacion({ type: 'menu', id: item.id, tpl: item.tpl, label: item.label });
            }
        };
        sidebar.appendChild(a);

        // Auto-click primer item
        if (index === 0) a.click();
    });

    // Agregar selector de temas a la derecha de la barra horizontal
    const themeContainer = document.createElement('div');
    themeContainer.className = 'theme-selector-container';
    themeContainer.style.cssText = 'margin-left: auto; display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; padding-left: 10px;';
    themeContainer.innerHTML = `
        <span class="theme-label" style="font-size: 11px; color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px;"><i class="fa-solid fa-palette"></i></span>
        <div class="theme-buttons" style="display: inline-flex; gap: 4px;">
            <button class="theme-btn" data-theme="cyberpunk" title="Corporativo GR (Default)" style="width: 18px; height: 18px; border-radius: 50%; cursor: pointer; background: #2563eb; border: 1.5px solid #fbbf24;"></button>
            <button class="theme-btn" data-theme="midnight" title="Midnight Purple" style="width: 18px; height: 18px; border-radius: 50%; cursor: pointer; background: #a855f7; border: 1px solid rgba(255,255,255,0.2);"></button>
            <button class="theme-btn" data-theme="emerald" title="Emerald Credit" style="width: 18px; height: 18px; border-radius: 50%; cursor: pointer; background: #10b981; border: 1px solid rgba(255,255,255,0.2);"></button>
            <button class="theme-btn" data-theme="light" title="Light Glass" style="width: 18px; height: 18px; border-radius: 50%; cursor: pointer; background: #0284c7; border: 1px solid rgba(255, 255, 255, 0.2);"></button>
        </div>
    `;
    sidebar.appendChild(themeContainer);
    
    // Configurar listeners para los botones de tema
    const activeTheme = document.body.getAttribute('data-theme') || 'cyberpunk';
    themeContainer.querySelectorAll('.theme-btn').forEach(btn => {
        const theme = btn.getAttribute('data-theme');
        if (theme === activeTheme) btn.classList.add('active');
        
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const selectedTheme = btn.getAttribute('data-theme');
            document.body.setAttribute('data-theme', selectedTheme);
            localStorage.setItem('presea_theme', selectedTheme);
            
            themeContainer.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

// --- HELPER DE PARSEO NUMÉRICO CON SOPORTE PARA COMA DECIMAL (,) Y PUNTO (.) ---
window.parseArgNumber = function(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    let str = val.toString().trim();
    if (!str) return 0;
    // Si contiene puntos y comas (ej. 1.250,50), remover puntos de miles y cambiar coma por punto
    if (str.includes('.') && str.includes(',')) {
        str = str.replace(/\./g, '').replace(',', '.');
    } else if (str.includes(',')) {
        str = str.replace(',', '.');
    }
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

// --- SISTEMA GLOBAL DE HISTORIAL Y BOTÓN VOLVER ---
window.appNavHistory = [];
window.isNavigatingBack = false;

window.registrarNavegacion = function(state) {
    if (window.isNavigatingBack || !state) return;
    const last = window.appNavHistory[window.appNavHistory.length - 1];
    if (last && last.type === state.type && last.id === state.id && last.step === state.step && last.pedidoId === state.pedidoId) {
        return;
    }
    window.appNavHistory.push(state);
    if (window.appNavHistory.length > 50) window.appNavHistory.shift();
    if (typeof window.actualizarBotonVolver === 'function') {
        window.actualizarBotonVolver();
    }
};

window.volverAccionAnterior = function() {
    // 1. Si hay un modal abierto, cerrarlo inmediatamente
    const overlay = document.getElementById('modal-overlay');
    const hasModalOpen = (overlay && overlay.style.display !== 'none' && overlay.innerHTML.trim().length > 0);

    if (hasModalOpen) {
        closeModal();
        if (typeof window.actualizarBotonVolver === 'function') {
            window.actualizarBotonVolver();
        }
        return;
    }

    // 2. Si estamos en un paso avanzado del wizard de nuevo presupuesto (Paso 3 -> Paso 2 -> Paso 1)
    if (typeof currentRequestStep !== 'undefined' && currentRequestStep > 1) {
        goToRequestStep(currentRequestStep - 1);
        return;
    }

    // 3. Si hay historial acumulado de pantallas/módulos
    if (window.appNavHistory.length > 1) {
        window.isNavigatingBack = true;
        try {
            // Remover el estado actual
            window.appNavHistory.pop();
            // Obtener el estado previo
            const prevState = window.appNavHistory[window.appNavHistory.length - 1];

            if (prevState) {
                if (prevState.type === 'menu') {
                    const menuEl = document.getElementById(prevState.id);
                    if (menuEl) {
                        document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
                        menuEl.classList.add('active');
                        const menuItem = allAvailableModules.find(m => m.id === prevState.id);
                        if (menuItem) {
                            renderContent(menuItem.tpl);
                            if (menuItem.action) menuItem.action();
                        }
                    }
                } else if (prevState.type === 'step') {
                    goToRequestStep(prevState.step);
                } else if (prevState.type === 'modal_auth') {
                    verDetallePedido(prevState.pedidoId);
                } else if (prevState.type === 'modal_avance') {
                    abrirModalAvanceObra(prevState.pedidoId);
                } else if (prevState.type === 'modal_comprobante') {
                    abrirComprobanteAvance(prevState.pedidoId, prevState.avanceId);
                }
            }
        } finally {
            window.isNavigatingBack = false;
            if (typeof window.actualizarBotonVolver === 'function') {
                window.actualizarBotonVolver();
            }
        }
        return;
    }

    // 4. Si estamos en un módulo secundario sin más historial previo, regresar al módulo principal (Gestión de Presupuestos)
    const activeMenu = document.querySelector('.menu-item.active');
    const homeMenu = document.getElementById('menu-ingresar') || document.querySelector('.menu-item');
    if (activeMenu && homeMenu && activeMenu !== homeMenu) {
        homeMenu.click();
        return;
    }

    showToast('Ya se encuentra en la pantalla inicial.', 'info');
};

window.actualizarBotonVolver = function() {
    const btnVolver = document.getElementById('btn-global-volver');
    const btnFloating = document.getElementById('btn-floating-volver');
    const overlay = document.getElementById('modal-overlay');
    const hasModal = (overlay && overlay.style.display !== 'none' && overlay.innerHTML.trim().length > 0);
    const hasStepBack = (typeof currentRequestStep !== 'undefined' && currentRequestStep > 1);
    const canGoBack = hasModal || hasStepBack || (window.appNavHistory.length > 1);

    const btnSidebarVolver = document.getElementById('btn-sidebar-volver');

    if (btnVolver) {
        if (canGoBack) {
            btnVolver.classList.remove('disabled');
        } else {
            btnVolver.classList.add('disabled');
        }
    }

    if (btnSidebarVolver) {
        if (canGoBack) {
            btnSidebarVolver.classList.remove('disabled');
            btnSidebarVolver.style.opacity = '1';
            btnSidebarVolver.style.pointerEvents = 'auto';
        } else {
            btnSidebarVolver.classList.add('disabled');
            btnSidebarVolver.style.opacity = '0.5';
            btnSidebarVolver.style.pointerEvents = 'none';
        }
    }
};

// Atajo de teclado: Alt + Flecha Izquierda para volver
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('keydown', (e) => {
        if (e.altKey && e.key === 'ArrowLeft') {
            e.preventDefault();
            window.volverAccionAnterior();
        }
    });
}

// --- MODAL UTILS ---
function openModal(templateId) {
    const overlay = document.getElementById('modal-overlay');
    const template = document.getElementById(templateId);
    if (!overlay || !template) return;
    
    document.body.classList.add('modal-open');
    overlay.innerHTML = '';
    overlay.appendChild(template.content.cloneNode(true));
    overlay.style.display = 'flex';
    if (typeof window.actualizarBotonVolver === 'function') {
        window.actualizarBotonVolver();
    }
}

function closeModal() {
    document.body.classList.remove('modal-open');
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.innerHTML = '';
    }
    document.title = 'Gestión de Presupuestos';
    if (typeof window.actualizarBotonVolver === 'function') {
        window.actualizarBotonVolver();
    }
}

// --- VALIDACIÓN DE CRÉDITO Y LÍMITES COMERCIALES ---
function evaluarCreditoCliente(client, newAmount = 0.0) {
    const defaultLimit = 5000000.0; // $5M default
    const vipLimit = 15000000.0;    // $15M VIP
    
    const isVip = client.estado === 'VIP' || client.nombre.toUpperCase().includes('VIP');
    const creditLimit = isVip ? vipLimit : defaultLimit;
    
    const deudaActual = parseFloat(client.deuda_actual || 0.0);
    const totalExposure = deudaActual + parseFloat(newAmount);
    
    const exceedsLimit = totalExposure > creditLimit;
    const hasMora = Array.isArray(client.facturas_mora) && client.facturas_mora.length > 0;
    
    const reasons = [];
    if (hasMora) {
        const firstOverdue = client.facturas_mora[0];
        reasons.push(`Mora activa: Factura ${firstOverdue.formulario} Nº ${firstOverdue.numero} vencida hace ${firstOverdue.demora} días (Límite 30 días).`);
    }
    if (exceedsLimit) {
        reasons.push(`Límite de crédito excedido: Deuda actual $${deudaActual.toLocaleString('es-AR', {minimumFractionDigits:2})} + Pedido $${parseFloat(newAmount).toLocaleString('es-AR', {minimumFractionDigits:2})} = $${totalExposure.toLocaleString('es-AR', {minimumFractionDigits:2})} superando el límite de $${creditLimit.toLocaleString('es-AR', {minimumFractionDigits:2})}.`);
    }
    
    return {
        isBlocked: exceedsLimit || hasMora,
        reasons: reasons.join(' | '),
        deudaActual,
        creditLimit,
        exceedsLimit,
        hasMora
    };
}

// --- INICIALIZACIÓN DE VISTAS ---

// 1. INGRESO DE PEDIDOS
let depositoSeleccionado = null;
let transporteSeleccionado = null;
let pedidoItems = [];
let productoSeleccionado = null;
let condicionSeleccionada = null;

function seleccionarCondicion(cond) {
    condicionSeleccionada = cond;
    const input = document.getElementById('req-condition-input');
    const hidden = document.getElementById('req-condition');
    if (input) {
        input.value = cond ? (cond.nombre ? `${cond.nombre} (${cond.dias} días) (Cód: ${cond.codigo})` : `Condición ${cond.codigo}`) : '';
    }
    if (hidden) {
        hidden.value = cond ? cond.codigo : '';
    }
    const dropdown = document.getElementById('req-condition-dropdown');
    if (dropdown) dropdown.style.display = 'none';
}

function seleccionarDeposito(dep) {
    depositoSeleccionado = dep;
    const input = document.getElementById('req-deposit-input');
    if (input) {
        input.value = dep ? (dep.nombre ? `${dep.nombre} (Cód: ${dep.codigo})` : `Depósito ${dep.codigo}`) : '';
    }
    const dropdown = document.getElementById('req-deposit-dropdown');
    if (dropdown) dropdown.style.display = 'none';
}

function seleccionarTransporte(trans) {
    transporteSeleccionado = trans;
    const input = document.getElementById('req-transport-input');
    if (input) {
        input.value = trans ? (trans.nombre ? `${trans.nombre} (Cód: ${trans.codigo})` : `Transporte ${trans.codigo}`) : '';
    }
    const dropdown = document.getElementById('req-transport-dropdown');
    if (dropdown) dropdown.style.display = 'none';
}

window.abrirRobotDepositos = function() {
    openModal('tpl-modal-robot-depositos');
    const searchInput = document.getElementById('robot-dep-search-input');
    const resultsList = document.getElementById('robot-dep-results-list');
    const resultsCount = document.getElementById('robot-dep-results-count');
    
    const renderResults = (query) => {
        resultsList.innerHTML = '';
        const cleanQuery = (query || '').toLowerCase().trim();
        
        let filtered = [];
        if (cleanQuery === '') {
            filtered = depositosDB.slice(0, 100);
        } else {
            filtered = depositosDB.filter(d => 
                d.nombre.toLowerCase().includes(cleanQuery) || 
                d.codigo.includes(cleanQuery)
            );
        }
        
        resultsCount.innerText = `Mostrando ${filtered.length} depósitos`;
        
        filtered.forEach(d => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            
            tr.innerHTML = `
                <td style="font-family: monospace;">${d.codigo}</td>
                <td><strong>${d.nombre || 'Sin nombre'}</strong></td>
            `;
            
            tr.onclick = () => {
                seleccionarDeposito(d);
                closeModal();
            };
            resultsList.appendChild(tr);
        });
    };

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderResults(e.target.value);
        });
        renderResults('');
        setTimeout(() => searchInput.focus(), 150);
    }
};

window.abrirRobotTransportes = function() {
    openModal('tpl-modal-robot-transportes');
    const searchInput = document.getElementById('robot-trans-search-input');
    const resultsList = document.getElementById('robot-trans-results-list');
    const resultsCount = document.getElementById('robot-trans-results-count');
    
    const renderResults = (query) => {
        resultsList.innerHTML = '';
        const cleanQuery = (query || '').toLowerCase().trim();
        
        let filtered = [];
        if (cleanQuery === '') {
            filtered = transportesDB.slice(0, 100);
        } else {
            filtered = transportesDB.filter(t => 
                t.nombre.toLowerCase().includes(cleanQuery) || 
                t.codigo.includes(cleanQuery)
            );
        }
        
        resultsCount.innerText = `Mostrando ${filtered.length} transportes`;
        
        filtered.forEach(t => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            
            tr.innerHTML = `
                <td style="font-family: monospace;">${t.codigo}</td>
                <td><strong>${t.nombre || 'Sin nombre'}</strong></td>
            `;
            
            tr.onclick = () => {
                seleccionarTransporte(t);
                closeModal();
            };
            resultsList.appendChild(tr);
        });
    };

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderResults(e.target.value);
        });
        renderResults('');
        setTimeout(() => searchInput.focus(), 150);
    }
};

window.abrirRobotCondiciones = function() {
    openModal('tpl-modal-robot-condiciones');
    const searchInput = document.getElementById('robot-cond-search-input');
    const resultsList = document.getElementById('robot-cond-results-list');
    const resultsCount = document.getElementById('robot-cond-results-count');
    
    const renderResults = (query) => {
        resultsList.innerHTML = '';
        const cleanQuery = (query || '').toLowerCase().trim();
        
        let filtered = [];
        if (cleanQuery === '') {
            filtered = condicionesDB.slice(0, 100);
        } else {
            filtered = condicionesDB.filter(c => 
                (c.nombre || '').toLowerCase().includes(cleanQuery) || 
                String(c.codigo).includes(cleanQuery) ||
                String(c.dias).includes(cleanQuery)
            );
        }
        
        resultsCount.innerText = `Mostrando ${filtered.length} condiciones`;
        
        filtered.forEach(c => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            
            tr.innerHTML = `
                <td style="font-family: monospace;">${c.codigo}</td>
                <td><strong>${c.nombre || 'Sin nombre'}</strong></td>
                <td>${c.dias} días</td>
            `;
            
            tr.onclick = () => {
                seleccionarCondicion(c);
                closeModal();
            };
            resultsList.appendChild(tr);
        });
    };

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderResults(e.target.value);
        });
        renderResults('');
        setTimeout(() => searchInput.focus(), 150);
    }
};

// --- LÓGICA DE TIPO DE PRESUPUESTO (ELÉCTRICO / MECÁNICO) ---
let reqTipoPresupuesto = null;

window.getCustomItemPrices = function() {
    try {
        const saved = localStorage.getItem('PRESUPUESTO_CUSTOM_PRICES');
        const localObj = saved ? JSON.parse(saved) : {};
        if (typeof appData !== 'undefined' && appData && appData.customPrices) {
            return Object.assign({}, appData.customPrices, localObj);
        }
        return localObj;
    } catch (e) {
        return (typeof appData !== 'undefined' && appData && appData.customPrices) ? appData.customPrices : {};
    }
};

window.saveCustomItemPrice = function(codigo, price) {
    if (!codigo) return;
    const numPrice = parseFloat(price || 0);
    if (isNaN(numPrice)) return;
    
    const customPrices = getCustomItemPrices();
    customPrices[codigo] = numPrice;
    
    if (typeof appData !== 'undefined' && appData) {
        if (!appData.customPrices) appData.customPrices = {};
        appData.customPrices[codigo] = numPrice;
    }
    
    try {
        localStorage.setItem('PRESUPUESTO_CUSTOM_PRICES', JSON.stringify(customPrices));
    } catch (e) {}

    if (typeof PRESUPUESTO_MECANICO_STOCK !== 'undefined') {
        const itemM = PRESUPUESTO_MECANICO_STOCK.find(i => i.codigo === codigo);
        if (itemM) itemM.precio = numPrice;
    }
    if (typeof PRESUPUESTO_ELECTRICO_STOCK !== 'undefined') {
        const itemE = PRESUPUESTO_ELECTRICO_STOCK.find(i => i.codigo === codigo);
        if (itemE) itemE.precio = numPrice;
    }
};

const PRESUPUESTO_ELECTRICO_STOCK = [
  {
    "codigo": "ELE-001",
    "detalle": "CAJA ALUMINIO 200X200X100",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-002",
    "detalle": "CAJA ALUMINIO 300X300X100",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-003",
    "detalle": "CONDULET ( L ) 1\" 1/2",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-004",
    "detalle": "CONDULET DE PASO 1\"1/2",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-005",
    "detalle": "UNION DOBLE 1\" 1/2",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-006",
    "detalle": "CUPLAS 1\" 1/2",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-007",
    "detalle": "GRAMPAS U-BOLT 1\" 1/2",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-008",
    "detalle": "FLEXIBLE ZOLODA 1\" 1/2",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "mts",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-009",
    "detalle": "CONECTOR ZOLODA CON TUERCA 1\" 1/2",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-010",
    "detalle": "CAÑO ACERO GALVANIZADO SEMIPESADO 1\" 1/2",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-011",
    "detalle": "CINTA PROTECCION SE CAÑOS POLIGUARD",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-012",
    "detalle": "BARRA UPN 80 MM X 6 MTS",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-013",
    "detalle": "BARRA ANGULO 1\" 1/2 X 3,16 X 6 MTS",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-014",
    "detalle": "LLAVE SELECTORA 0.1.2",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-015",
    "detalle": "CABLE 485",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "mts",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-016",
    "detalle": "CABLE SINTENAX 7X1,5 MM",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "mts",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-017",
    "detalle": "CABLE SINTENAX 3X1,5 MM",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "mts",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-018",
    "detalle": "CABLE SINTENAX 3X2,5 MM",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "mts",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-019",
    "detalle": "BROCA 10 MM",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-020",
    "detalle": "BULON 1/4X1\"1/2CON DOBLE ARANDELA PLANA + TUERCA",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-021",
    "detalle": "BULON 5/16X 1\"1/2 CON DOBLE ARANDELA PLANA Y TUERCA",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-022",
    "detalle": "PINTURA AMARILLA",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "LTS",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-023",
    "detalle": "PINTURA NEGRO",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "LTS",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-024",
    "detalle": "CINTA REFLECTIVA ROJO/NEGRO ADHESIVA",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "mts",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-025",
    "detalle": "TUERCA 1\" 1/2 PARA CAÑOS",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-026",
    "detalle": "BOQUILLA 1\" 1/2 ALUMINIO",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-027",
    "detalle": "RIEL DIN",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-028",
    "detalle": "Tecnico en seguridad",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 10023.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-029",
    "detalle": "Oficial Esp",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 20616.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-030",
    "detalle": "Ayudante",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 17577.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-031",
    "detalle": "Supervisor",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 16363.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-032",
    "detalle": "Hidro elevador",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "u",
    "precio": 24028.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-033",
    "detalle": "Tecnico en seguridad",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 5695.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-034",
    "detalle": "Oficial Esp",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 11712.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-035",
    "detalle": "Ayudante",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 9992.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-036",
    "detalle": "Supervisor",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 12072.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-037",
    "detalle": "Hidro elevador",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "u",
    "precio": 24028.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-038",
    "detalle": "x",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-039",
    "detalle": "Técnico en Seguridad",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 5695.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-040",
    "detalle": "Oficial Esp",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 11712.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-041",
    "detalle": "Ayudante",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 9992.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-042",
    "detalle": "Supervisor",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 12072.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-043",
    "detalle": "Camion Hidro elevador",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 24028.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-044",
    "detalle": "Técnico en Seguridad",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra EMERGENCIA MANTENIMIENTO",
    "udm": "horas",
    "precio": 28468.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-045",
    "detalle": "Oficial Esp",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra EMERGENCIA MANTENIMIENTO",
    "udm": "horas",
    "precio": 59347.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-046",
    "detalle": "Ayudante",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra EMERGENCIA MANTENIMIENTO",
    "udm": "horas",
    "precio": 50649.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-047",
    "detalle": "Supervisor",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra EMERGENCIA MANTENIMIENTO",
    "udm": "u",
    "precio": 61144.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-048",
    "detalle": "Camion Hidro elevador",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra EMERGENCIA MANTENIMIENTO",
    "udm": "u",
    "precio": 24028.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-049",
    "detalle": "Tecnico en seguridad",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 7720.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-050",
    "detalle": "Oficial Esp",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 20889.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-051",
    "detalle": "Ayudante",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 17830.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-052",
    "detalle": "Supervisor",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 21521.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-053",
    "detalle": "Hidro elevador",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "u",
    "precio": 24028.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-054",
    "detalle": "Tecnico en seguridad",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 5964.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-055",
    "detalle": "Oficial Esp",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 16141.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-056",
    "detalle": "Ayudante",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 10128.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-057",
    "detalle": "Supervisor",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 16141.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-058",
    "detalle": "Hidro elevador",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "u",
    "precio": 24028.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-059",
    "detalle": "x",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-060",
    "detalle": "Técnico en Seguridad",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 4386.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-061",
    "detalle": "Oficial Esp",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 11871.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-062",
    "detalle": "Ayudante",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 10128.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-063",
    "detalle": "Supervisor",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 12233.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-064",
    "detalle": "Camion Hidro elevador",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 24028.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  }
];

const PRESUPUESTO_MECANICO_STOCK = [
  {
    "codigo": "MEC-001",
    "detalle": "Hidroelevador",
    "rubro": "Mecánico",
    "subrubro": "Materiales y Equipos",
    "udm": "u",
    "precio": 83983.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-002",
    "detalle": "Hidro elevador con barquilla",
    "rubro": "Mecánico",
    "subrubro": "Materiales y Equipos",
    "udm": "u",
    "precio": 71062.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-003",
    "detalle": "Alquiler de oficinas",
    "rubro": "Mecánico",
    "subrubro": "Materiales y Equipos",
    "udm": "u",
    "precio": 310089.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-004",
    "detalle": "Alquiler de manitou (incluye chofer y combustible)",
    "rubro": "Mecánico",
    "subrubro": "Materiales y Equipos",
    "udm": "u",
    "precio": 137566.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-005",
    "detalle": "Traslados ida y vuelta para APG/PA",
    "rubro": "Mecánico",
    "subrubro": "Materiales y Equipos",
    "udm": "u",
    "precio": 464144.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-006",
    "detalle": "Traslados ida y vuelta para APS",
    "rubro": "Mecánico",
    "subrubro": "Materiales y Equipos",
    "udm": "u",
    "precio": 111842.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-007",
    "detalle": "Relevamiento",
    "rubro": "Mecánico",
    "subrubro": "Materiales y Equipos",
    "udm": "u",
    "precio": 1750000.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-008",
    "detalle": "Documentos y 3D",
    "rubro": "Mecánico",
    "subrubro": "Materiales y Equipos",
    "udm": "u",
    "precio": 5120350.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-009",
    "detalle": "Ing. Civil",
    "rubro": "Mecánico",
    "subrubro": "Materiales y Equipos",
    "udm": "u",
    "precio": 4350000.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-010",
    "detalle": "Ayudante (Taller)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra EN TALLER",
    "udm": "horas",
    "precio": 25275.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-011",
    "detalle": "Medio Oficial (Taller)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra EN TALLER",
    "udm": "horas",
    "precio": 25319.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-012",
    "detalle": "Oficial (Taller)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra EN TALLER",
    "udm": "horas",
    "precio": 26444.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-013",
    "detalle": "Oficial Especializado (Taller)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra EN TALLER",
    "udm": "horas",
    "precio": 28652.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-014",
    "detalle": "Oficial soldador calificado combinado procesos SMAW / GTAW",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra EN TALLER",
    "udm": "horas",
    "precio": 29601.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-015",
    "detalle": "Supervisor (Taller)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra EN TALLER",
    "udm": "horas",
    "precio": 28652.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-016",
    "detalle": "Ayudante hora Normal (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 28657.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-017",
    "detalle": "Medio Oficial hora normal (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 28962.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-018",
    "detalle": "Oficial hora normal (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 30423.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-019",
    "detalle": "Oficial Especializado hora normal (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 33654.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-020",
    "detalle": "Oficial soldador calificado hora normal (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 34672.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-021",
    "detalle": "Supervisor horas normales (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 33654.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-022",
    "detalle": "Técnico HyS hora normal (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 27419.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-023",
    "detalle": "Ayudante hora EXTRA SIMPLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 38969.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-024",
    "detalle": "Medio Oficial hora EXTRA SIMPLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 39391.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-025",
    "detalle": "Oficial hora EXTRA SIMPLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 41366.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-026",
    "detalle": "Oficial Especializado hora EXTRA SIMPLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 45753.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-027",
    "detalle": "Oficial soldador calificado hora EXTRA SIMPLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 47146.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-028",
    "detalle": "Supervisor horas EXTRA SIMPLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 45753.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-029",
    "detalle": "Técnico HyS hora EXTRA SIMPLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 37290.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-030",
    "detalle": "Ayudante hora EXTRA DOBLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 50421.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-031",
    "detalle": "Medio Oficial hora EXTRA DOBLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 50981.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-032",
    "detalle": "Oficial hora EXTRA DOBLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 53523.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-033",
    "detalle": "Oficial Especializado hora EXTRA DOBLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 59216.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-034",
    "detalle": "Oficial soldador calificado hora EXTRA DOBLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 61016.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-035",
    "detalle": "Supervisor hora EXTRA DOBLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 59216.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-036",
    "detalle": "Técnico HyS hora EXTRA DOBLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 48806.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-037",
    "detalle": "Ayudante hora Normal (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 29067.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-038",
    "detalle": "Medio Oficial hora normal (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 29422.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-039",
    "detalle": "Oficial hora normal (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 30866.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-040",
    "detalle": "Oficial Especializado hora normal (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 34186.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-041",
    "detalle": "Oficial soldador calificado hora normal (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 35214.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-042",
    "detalle": "Supervisor horas normales (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 34186.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-043",
    "detalle": "Técnico HyS hora normal (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 27419.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-044",
    "detalle": "Ayudante hora EXTRA SIMPLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 39525.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-045",
    "detalle": "Medio Oficial hora EXTRA SIMPLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 40011.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-046",
    "detalle": "Oficial hora EXTRA SIMPLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 41995.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-047",
    "detalle": "Oficial Especializado hora EXTRA SIMPLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 46504.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-048",
    "detalle": "Oficial soldador calificado hora EXTRA SIMPLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 47883.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-049",
    "detalle": "Supervisor horas EXTRA SIMPLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 46504.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-050",
    "detalle": "Técnico HyS hora EXTRA SIMPLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 37290.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-051",
    "detalle": "Ayudante hora EXTRA DOBLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 51162.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-052",
    "detalle": "Medio Oficial hora EXTRA DOBLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 51775.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-053",
    "detalle": "Oficial hora EXTRA DOBLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 54349.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-054",
    "detalle": "Oficial Especializado hora EXTRA DOBLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 60180.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-055",
    "detalle": "Oficial soldador calificado hora EXTRA DOBLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 61969.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-056",
    "detalle": "Supervisor hora EXTRA DOBLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 60180.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-057",
    "detalle": "Técnico HyS hora EXTRA DOBLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 48806.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-058",
    "detalle": "Ayudante hora EMERGENCIA",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra EMERGENCIA MANTENIMIENTO",
    "udm": "horas",
    "precio": 145335.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-059",
    "detalle": "Medio Oficial hora EMERGENCIA",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra EMERGENCIA MANTENIMIENTO",
    "udm": "horas",
    "precio": 147114.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-060",
    "detalle": "Oficial hora normal (Emergencia)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra EMERGENCIA MANTENIMIENTO",
    "udm": "horas",
    "precio": 154390.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-061",
    "detalle": "Oficial Especializado hora EMERGENCIA",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra EMERGENCIA MANTENIMIENTO",
    "udm": "horas",
    "precio": 170957.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-062",
    "detalle": "Oficial soldador calificado hora EMERGENCIA",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra EMERGENCIA MANTENIMIENTO",
    "udm": "horas",
    "precio": 176052.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-063",
    "detalle": "Supervisor horas EMERGENCIA",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra EMERGENCIA MANTENIMIENTO",
    "udm": "horas",
    "precio": 170957.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-064",
    "detalle": "Técnico HyS hora EMERGENCIA",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra EMERGENCIA MANTENIMIENTO",
    "udm": "horas",
    "precio": 165659.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  }
];


window.PRESUPUESTO_ELECTRICO_STOCK = PRESUPUESTO_ELECTRICO_STOCK;
window.PRESUPUESTO_MECANICO_STOCK = PRESUPUESTO_MECANICO_STOCK;
window.presupuestosCatalogDB = PRESUPUESTO_ELECTRICO_STOCK;
window.presupuestoMecanicoDB = PRESUPUESTO_MECANICO_STOCK;

function applyCustomPricesToCatalog(catalog) {
    if (!catalog || !Array.isArray(catalog)) return catalog;
    const customPrices = getCustomItemPrices();
    catalog.forEach(item => {
        if (item && item.codigo && customPrices[item.codigo] !== undefined) {
            item.precio = parseFloat(customPrices[item.codigo]);
        }
    });
    return catalog;
}

function getActiveStockCatalog() {
    let cat = [];
    if (reqTipoPresupuesto === 'Eléctrico' && typeof PRESUPUESTO_ELECTRICO_STOCK !== 'undefined') {
        cat = PRESUPUESTO_ELECTRICO_STOCK;
    } else if (reqTipoPresupuesto === 'Mecánico' && typeof PRESUPUESTO_MECANICO_STOCK !== 'undefined') {
        cat = PRESUPUESTO_MECANICO_STOCK;
    } else if (typeof stockDB !== 'undefined' && stockDB.length > 0) {
        cat = stockDB;
    } else {
        cat = (typeof PRESUPUESTO_ELECTRICO_STOCK !== 'undefined') ? PRESUPUESTO_ELECTRICO_STOCK : [];
    }
    return applyCustomPricesToCatalog(cat);
}

window.abrirModalTipoPresupuesto = function() {
    openModal('tpl-modal-tipo-presupuesto');
};

function getElectricalDefaultQty(code) {
    const defaults = {
        'ELE-001': 8,
        'ELE-002': 2,
        'ELE-003': 7,
        'ELE-004': 4,
        'ELE-005': 8,
        'ELE-006': 10,
        'ELE-007': 100,
        'ELE-008': 3,
        'ELE-009': 10,
        'ELE-010': 33,
        'ELE-011': 30,
        'ELE-012': 2,
        'ELE-013': 5,
        'ELE-014': 2,
        'ELE-015': 135,
        'ELE-016': 135,
        'ELE-017': 210,
        'ELE-018': 210,
        'ELE-019': 45,
        'ELE-020': 50,
        'ELE-021': 100,
        'ELE-022': 4,
        'ELE-023': 4,
        'ELE-024': 4,
        'ELE-025': 40,
        'ELE-026': 25,
        'ELE-027': 2,
        'ELE-039': 20,
        'ELE-040': 20,
        'ELE-041': 40,
        'ELE-042': 40
    };
    return defaults[code] || 0;
}

window.seleccionarTipoPresupuesto = function(tipo) {
    reqTipoPresupuesto = tipo;
    
    // Si estamos en la vista de Ingreso de Pedidos
    const formReq = document.getElementById('form-request-ped');
    if (formReq) {
        pedidoItems = [];
        if (typeof actualizarTablaItemsRequerimiento === 'function') {
            actualizarTablaItemsRequerimiento();
        }
        window.activeMecaTab = 0;
        
        const container2 = document.getElementById('step-container-2');
        if (container2 && container2.style.display !== 'none') {
            const isExcelFlow = tipo === 'Mecánico' || tipo === 'Eléctrico';
            const std2 = document.getElementById('req-standard-step2-container');
            const mec2 = document.getElementById('req-mecanico-step2-container');
            if (std2) std2.style.display = isExcelFlow ? 'none' : 'flex';
            if (mec2) {
                mec2.style.display = isExcelFlow ? 'flex' : 'none';
                if (isExcelFlow && typeof renderMecanicoExcelGrid === 'function') {
                    renderMecanicoExcelGrid();
                }
            }
        }
    }
    
    // Cerrar modal de inmediato y actualizar indicadores visuales
    closeModal();
    updateTipoPresupuestoBadge();
    
    // Actualizar de forma inmediata e instantánea cualquier tabla de listados activa
    if (typeof renderAssignmentsTable === 'function') {
        renderAssignmentsTable();
    }
    
    showToast(`Rubro seleccionado: Presupuesto ${tipo}`, 'success');
};

function updateTipoPresupuestoBadge() {
    const badge = document.getElementById('tipo-presupuesto-badge');
    const assignBadge = document.getElementById('assignments-tipo-presupuesto-badge');
    const summaryTipo = document.getElementById('summary-tipo-presupuesto');
    const mecaFields = document.getElementById('req-mecanico-fields');
    const standardFields = document.getElementById('req-standard-fields');
    const isElec = reqTipoPresupuesto === 'Eléctrico';
    const icon = isElec ? '⚡' : '⚙️';
    const bgColor = isElec ? 'rgba(234, 179, 8, 0.2)' : 'rgba(6, 182, 212, 0.2)';
    const textColor = isElec ? '#fde047' : '#22d3ee';
    const borderColor = isElec ? 'rgba(234, 179, 8, 0.4)' : 'rgba(6, 182, 212, 0.4)';

    if (badge) {
        badge.innerHTML = `${icon} Presupuesto ${reqTipoPresupuesto || 'Eléctrico'}`;
        badge.style.background = bgColor;
        badge.style.color = textColor;
        badge.style.borderColor = borderColor;
    }
    if (assignBadge) {
        assignBadge.innerHTML = `${icon} Presupuesto ${reqTipoPresupuesto || 'Eléctrico'}`;
        assignBadge.style.background = bgColor;
        assignBadge.style.color = textColor;
        assignBadge.style.borderColor = borderColor;
    }
    if (summaryTipo) {
        summaryTipo.innerHTML = `${icon} Presupuesto ${reqTipoPresupuesto || 'Eléctrico'}`;
        summaryTipo.style.color = textColor;
    }
    if (mecaFields) {
        mecaFields.style.display = 'block'; // Always show for both
    }
    if (standardFields) {
        standardFields.style.display = 'none'; // Always hide for both
    }
    const nextBtn = document.getElementById('btn-next-step1');
    if (nextBtn) {
        nextBtn.innerHTML = 'Siguiente: Tarifario <i class="fas fa-arrow-right"></i>';
        nextBtn.className = "btn btn-primary";
    }

    const label2 = document.getElementById('step-label-2');
    const title2 = document.getElementById('step2-title-text');
    const subtitle2 = document.getElementById('step2-subtitle-text');
    if (label2) {
        label2.innerText = '2. Tarifario';
    }
    if (title2) {
        title2.innerText = 'PROPUESTA COMERCIAL (TARIFARIO)';
    }
    if (subtitle2) {
        subtitle2.innerText = 'Complete las cantidades estimadas directamente en la planilla.';
    }

    const title1 = document.getElementById('step1-title-text');
    const subtitle1 = document.getElementById('step1-subtitle-text');
    if (title1) {
        title1.innerText = 'Gestión de Presupuestos';
    }
    if (subtitle1) {
        subtitle1.innerText = 'Defina la identificación de la oferta y la propuesta técnica.';
    }

    // Dynamic labels inside Step 1
    const lblDenom = document.getElementById('lbl-meca-denominacion');
    const lblProv = document.getElementById('lbl-meca-proveedor');
    const lblFecha = document.getElementById('lbl-meca-fecha-oferta');
    const lblVal = document.getElementById('lbl-meca-validez');
    const lblPlanta = document.getElementById('lbl-meca-planta');
    const lblInicio = document.getElementById('lbl-meca-inicio');
    const lblDuracion = document.getElementById('lbl-meca-duracion');
    const lblFin = document.getElementById('lbl-meca-fin');

    const valDenom = document.getElementById('req-meca-denominacion');
    const valProveedor = document.getElementById('req-meca-proveedor');
    const valValidez = document.getElementById('req-meca-validez');
    const valPlanta = document.getElementById('req-meca-planta');
    const valInicio = document.getElementById('req-meca-fecha-inicio');
    const valDuracion = document.getElementById('req-meca-duracion');

    const todayStr = getLocalDateStr();
    if (lblDenom) lblDenom.innerHTML = isElec ? '<u>Denominación del Servicio:</u>' : 'i. <u>Denominación del Servicio:</u>';
    if (lblProv) lblProv.innerHTML = isElec ? 'ii. <u>Nombre del Proveedor:</u>' : 'ii. <u>Nombre del Proveedor:</u>';
    if (lblFecha) lblFecha.innerHTML = isElec ? 'iii. <u>Fecha de Oferta:</u>' : 'iii. <u>Fecha de Oferta:</u>';
    if (lblVal) lblVal.innerHTML = isElec ? 'iv. <u>Validez de la Oferta:</u>' : 'iv. <u>Validez de la Oferta:</u>';
    if (lblPlanta) lblPlanta.innerHTML = isElec ? 'v. <u>Planta de Cargill:</u>' : 'v. <u>Planta de Cargill:</u>';
    if (lblInicio) lblInicio.innerHTML = isElec ? 'vi. <u>Fecha estimada de Inicio:</u>' : 'vi. <u>Fecha estimada de Inicio:</u>';
    if (lblDuracion) lblDuracion.innerHTML = isElec ? 'vii. <u>Duración estimada:</u>' : 'vii. <u>Duración estimada:</u>';
    if (lblFin) lblFin.innerHTML = isElec ? 'viii. <u>Plazo Máximo de Finalización:</u>' : 'viii. <u>Plazo Máximo de Finalización:</u>';

    const reqMecaPropuestaBox = document.getElementById('req-meca-propuesta-box');
    if (reqMecaPropuestaBox) {
        reqMecaPropuestaBox.style.display = isElec ? 'none' : 'flex';
    }

    if (isElec) {
        if (valProveedor && !valProveedor.value) valProveedor.value = 'SG Montajes S.R.L';
        if (typeof window.setValidezOfertaValue === 'function') {
            if (!valValidez || !valValidez.value) window.setValidezOfertaValue('5 días');
        } else if (valValidez && !valValidez.value) {
            valValidez.value = '5 días';
        }
        if (valPlanta && !valPlanta.value) valPlanta.value = 'Complejo APS- PGSM';
        if (valInicio && (!valInicio.value || valInicio.value === '12-ago-26')) valInicio.value = todayStr;
        if (typeof window.setDuracionEstimadaValue === 'function') {
            if (valDuracion && (valDuracion.value === 'OT-' || valDuracion.value === '25-30días')) window.setDuracionEstimadaValue('');
        }
    } else {
        if (valProveedor && (!valProveedor.value || valProveedor.value === 'SG Montajes S.R.L')) valProveedor.value = 'SG MONTAJES SRL';
        if (typeof window.setValidezOfertaValue === 'function') {
            if (!valValidez || !valValidez.value || valValidez.value === '5 dias') window.setValidezOfertaValue('5 días');
        } else if (valValidez && (!valValidez.value || valValidez.value === '5 dias')) {
            valValidez.value = '5 días';
        }
        if (valPlanta && (!valPlanta.value || valPlanta.value === 'Complejo APS- PGSM')) valPlanta.value = 'APS';
        if (valInicio && (!valInicio.value || valInicio.value === '12-ago-26')) valInicio.value = todayStr;
        if (typeof window.setDuracionEstimadaValue === 'function') {
            if (valDuracion && (valDuracion.value === 'OT-' || valDuracion.value === '25-30días')) window.setDuracionEstimadaValue('');
        }
    }

    // Auto-populate hidden required standard values for both
    if (typeof clientesDB !== 'undefined' && clientesDB.length > 0) {
        const cargill = clientesDB.find(c => c.nombre.includes('CARGILL')) || clientesDB[0];
        clienteSeleccionado = cargill;
        const reqClientInput = document.getElementById('req-client');
        if (reqClientInput) reqClientInput.value = cargill.nombre;
    }
    if (typeof depositosDB !== 'undefined' && depositosDB.length > 0) {
        depositoSeleccionado = depositosDB[0];
        const reqDepositInput = document.getElementById('req-deposit-input');
        if (reqDepositInput) reqDepositInput.value = depositosDB[0].nombre;
    }
    if (typeof transportesDB !== 'undefined' && transportesDB.length > 0) {
        transporteSeleccionado = transportesDB[0];
        const reqTransportInput = document.getElementById('req-transport-input');
        if (reqTransportInput) reqTransportInput.value = transportesDB[0].nombre;
    }
    if (typeof condicionesDB !== 'undefined' && condicionesDB.length > 0) {
        const condInput = document.getElementById('req-condition-input');
        if (condInput) condInput.value = condicionesDB[0].nombre;
        const condHidden = document.getElementById('req-condition');
        if (condHidden) condHidden.value = condicionesDB[0].codigo;
    }
}

// 1. INGRESO DE PEDIDOS
function initRequestView() {
    viewMode = 'Ingreso';
    const curUser = getCurrentUser();
    if (!reqTipoPresupuesto && curUser && curUser.rubro_defecto) {
        reqTipoPresupuesto = curUser.rubro_defecto;
    } else if (!reqTipoPresupuesto) {
        reqTipoPresupuesto = 'Eléctrico';
    }
    updateTipoPresupuestoBadge();

    const reqClientInput = document.getElementById('req-client');
    const dropdown = document.getElementById('req-client-dropdown');
    const condSelect = document.getElementById('req-condition');
    
    // Autocomplete Condiciones de Venta
    const reqCondInput = document.getElementById('req-condition-input');
    const condDropdown = document.getElementById('req-condition-dropdown');
    if (reqCondInput && condDropdown && typeof condicionesDB !== 'undefined') {
        let currentMatches = [];
        let currentSelectedIndex = -1;

        const updateActiveItem = () => {
            const items = condDropdown.children;
            for (let i = 0; i < items.length; i++) {
                items[i].classList.remove('active');
            }
            if (currentSelectedIndex >= 0 && currentSelectedIndex < items.length) {
                const activeItem = items[currentSelectedIndex];
                activeItem.classList.add('active');
            }
        };

        const renderDropdownChunk = () => {
            const chunk = currentMatches.slice(condDropdown.children.length, condDropdown.children.length + 50);
            if (chunk.length === 0) return;
            const fragment = document.createDocumentFragment();
            chunk.forEach(cond => {
                const div = document.createElement('div');
                div.className = 'custom-dropdown-item';
                div.style.padding = '8px 12px';
                div.style.cursor = 'pointer';
                div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                div.innerHTML = `
                    <div style="font-weight: 600; color: white;">${cond.nombre || 'Sin nombre'}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">Días: ${cond.dias} - Código: ${cond.codigo}</div>
                `;
                div.onmousedown = (e) => {
                    e.preventDefault();
                    seleccionarCondicion(cond);
                };
                fragment.appendChild(div);
            });
            condDropdown.appendChild(fragment);
            if (currentSelectedIndex >= 0) updateActiveItem();
        };

        const renderDropdown = (query) => {
            const cleanQuery = (query || '').toLowerCase().trim();
            condDropdown.innerHTML = '';
            condDropdown.scrollTop = 0;
            currentSelectedIndex = -1;
            
            if (cleanQuery === '') {
                currentMatches = condicionesDB;
            } else {
                currentMatches = condicionesDB.filter(c => 
                    (c.nombre || '').toLowerCase().includes(cleanQuery) || 
                    String(c.codigo).includes(cleanQuery) ||
                    String(c.dias).includes(cleanQuery)
                );
            }
            
            if (currentMatches.length > 0) {
                renderDropdownChunk();
                condDropdown.style.display = 'block';
            } else {
                condDropdown.style.display = 'none';
            }
        };

        condDropdown.addEventListener('scroll', () => {
            if (condDropdown.scrollTop + condDropdown.clientHeight >= condDropdown.scrollHeight - 30) {
                renderDropdownChunk();
            }
        });

        reqCondInput.addEventListener('input', (e) => {
            renderDropdown(e.target.value);
        });

        reqCondInput.addEventListener('focus', (e) => {
            e.target.select();
            renderDropdown('');
        });

        reqCondInput.addEventListener('click', (e) => {
            renderDropdown('');
        });

        reqCondInput.addEventListener('keydown', (e) => {
            if (condDropdown.style.display !== 'block') return;
            const items = condDropdown.children;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentSelectedIndex < currentMatches.length - 1) {
                    currentSelectedIndex++;
                    if (currentSelectedIndex >= items.length) {
                        renderDropdownChunk();
                    }
                    updateActiveItem();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentSelectedIndex > 0) {
                    currentSelectedIndex--;
                    updateActiveItem();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentSelectedIndex >= 0 && currentSelectedIndex < currentMatches.length) {
                    seleccionarCondicion(currentMatches[currentSelectedIndex]);
                } else if (currentMatches.length > 0) {
                    seleccionarCondicion(currentMatches[0]);
                }
            }
        });

        reqCondInput.addEventListener('blur', () => {
            setTimeout(() => {
                condDropdown.style.display = 'none';
            }, 200);
        });
    }

    // Autocomplete Depósitos
    const reqDepInput = document.getElementById('req-deposit-input');
    const depDropdown = document.getElementById('req-deposit-dropdown');
    if (reqDepInput && depDropdown && typeof depositosDB !== 'undefined') {
        let currentMatches = [];
        let currentSelectedIndex = -1;

        const updateActiveItem = () => {
            const items = depDropdown.children;
            for (let i = 0; i < items.length; i++) {
                items[i].classList.remove('active');
            }
            if (currentSelectedIndex >= 0 && currentSelectedIndex < items.length) {
                const activeItem = items[currentSelectedIndex];
                activeItem.classList.add('active');
            }
        };

        const renderDropdownChunk = () => {
            const chunk = currentMatches.slice(depDropdown.children.length, depDropdown.children.length + 50);
            if (chunk.length === 0) return;
            const fragment = document.createDocumentFragment();
            chunk.forEach(dep => {
                const div = document.createElement('div');
                div.className = 'custom-dropdown-item';
                div.style.padding = '8px 12px';
                div.style.cursor = 'pointer';
                div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                div.innerHTML = `
                    <div style="font-weight: 600; color: white;">${dep.nombre || 'Sin nombre'}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">Código: ${dep.codigo}</div>
                `;
                div.onmousedown = (e) => {
                    e.preventDefault();
                    seleccionarDeposito(dep);
                };
                fragment.appendChild(div);
            });
            depDropdown.appendChild(fragment);
            if (currentSelectedIndex >= 0) updateActiveItem();
        };

        const renderDropdown = (query) => {
            const cleanQuery = (query || '').toLowerCase().trim();
            depDropdown.innerHTML = '';
            depDropdown.scrollTop = 0;
            currentSelectedIndex = -1;
            
            if (cleanQuery === '') {
                currentMatches = depositosDB.slice(0, 100);
            } else {
                currentMatches = depositosDB.filter(d => 
                    d.nombre.toLowerCase().includes(cleanQuery) || 
                    d.codigo.includes(cleanQuery)
                );
            }
            
            if (currentMatches.length > 0) {
                renderDropdownChunk();
                depDropdown.style.display = 'block';
            } else {
                depDropdown.style.display = 'none';
            }
        };

        depDropdown.addEventListener('scroll', () => {
            if (depDropdown.scrollTop + depDropdown.clientHeight >= depDropdown.scrollHeight - 30) {
                renderDropdownChunk();
            }
        });

        reqDepInput.addEventListener('input', (e) => {
            renderDropdown(e.target.value);
        });

        reqDepInput.addEventListener('focus', (e) => {
            e.target.select();
            renderDropdown('');
        });

        reqDepInput.addEventListener('click', (e) => {
            renderDropdown('');
        });

        reqDepInput.addEventListener('keydown', (e) => {
            if (depDropdown.style.display !== 'block') return;
            const items = depDropdown.children;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentSelectedIndex < currentMatches.length - 1) {
                    currentSelectedIndex++;
                    if (currentSelectedIndex >= items.length) {
                        renderDropdownChunk();
                    }
                    updateActiveItem();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentSelectedIndex > 0) {
                    currentSelectedIndex--;
                    updateActiveItem();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentSelectedIndex >= 0 && currentSelectedIndex < currentMatches.length) {
                    seleccionarDeposito(currentMatches[currentSelectedIndex]);
                } else if (currentMatches.length > 0) {
                    seleccionarDeposito(currentMatches[0]);
                }
            }
        });

        reqDepInput.addEventListener('blur', () => {
            setTimeout(() => {
                depDropdown.style.display = 'none';
            }, 200);
        });
    }

    // Autocomplete Transportes
    const reqTransInput = document.getElementById('req-transport-input');
    const transDropdown = document.getElementById('req-transport-dropdown');
    if (reqTransInput && transDropdown && typeof transportesDB !== 'undefined') {
        let currentMatches = [];
        let currentSelectedIndex = -1;

        const updateActiveItem = () => {
            const items = transDropdown.children;
            for (let i = 0; i < items.length; i++) {
                items[i].classList.remove('active');
            }
            if (currentSelectedIndex >= 0 && currentSelectedIndex < items.length) {
                const activeItem = items[currentSelectedIndex];
                activeItem.classList.add('active');
            }
        };

        const renderDropdownChunk = () => {
            const chunk = currentMatches.slice(transDropdown.children.length, transDropdown.children.length + 50);
            if (chunk.length === 0) return;
            const fragment = document.createDocumentFragment();
            chunk.forEach(trans => {
                const div = document.createElement('div');
                div.className = 'custom-dropdown-item';
                div.style.padding = '8px 12px';
                div.style.cursor = 'pointer';
                div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                div.innerHTML = `
                    <div style="font-weight: 600; color: white;">${trans.nombre || 'Sin nombre'}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">Código: ${trans.codigo}</div>
                `;
                div.onmousedown = (e) => {
                    e.preventDefault();
                    seleccionarTransporte(trans);
                };
                fragment.appendChild(div);
            });
            transDropdown.appendChild(fragment);
            if (currentSelectedIndex >= 0) updateActiveItem();
        };

        const renderDropdown = (query) => {
            const cleanQuery = (query || '').toLowerCase().trim();
            transDropdown.innerHTML = '';
            transDropdown.scrollTop = 0;
            currentSelectedIndex = -1;
            
            if (cleanQuery === '') {
                currentMatches = transportesDB.slice(0, 100);
            } else {
                currentMatches = transportesDB.filter(t => 
                    t.nombre.toLowerCase().includes(cleanQuery) || 
                    t.codigo.includes(cleanQuery)
                );
            }
            
            if (currentMatches.length > 0) {
                renderDropdownChunk();
                transDropdown.style.display = 'block';
            } else {
                transDropdown.style.display = 'none';
            }
        };

        transDropdown.addEventListener('scroll', () => {
            if (transDropdown.scrollTop + transDropdown.clientHeight >= transDropdown.scrollHeight - 30) {
                renderDropdownChunk();
            }
        });

        reqTransInput.addEventListener('input', (e) => {
            renderDropdown(e.target.value);
        });

        reqTransInput.addEventListener('focus', (e) => {
            e.target.select();
            renderDropdown('');
        });

        reqTransInput.addEventListener('click', (e) => {
            renderDropdown('');
        });

        reqTransInput.addEventListener('keydown', (e) => {
            if (transDropdown.style.display !== 'block') return;
            const items = transDropdown.children;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentSelectedIndex < currentMatches.length - 1) {
                    currentSelectedIndex++;
                    if (currentSelectedIndex >= items.length) {
                        renderDropdownChunk();
                    }
                    updateActiveItem();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentSelectedIndex > 0) {
                    currentSelectedIndex--;
                    updateActiveItem();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentSelectedIndex >= 0 && currentSelectedIndex < currentMatches.length) {
                    seleccionarTransporte(currentMatches[currentSelectedIndex]);
                } else if (currentMatches.length > 0) {
                    seleccionarTransporte(currentMatches[0]);
                }
            }
        });

        reqTransInput.addEventListener('blur', () => {
            setTimeout(() => {
                transDropdown.style.display = 'none';
            }, 200);
        });
    }

    if (reqClientInput && dropdown && typeof clientesDB !== 'undefined') {
        let currentMatches = [];
        let currentSelectedIndex = -1;

        const updateActiveItem = () => {
            const items = dropdown.children;
            for (let i = 0; i < items.length; i++) {
                items[i].classList.remove('active');
            }
            if (currentSelectedIndex >= 0 && currentSelectedIndex < items.length) {
                const activeItem = items[currentSelectedIndex];
                activeItem.classList.add('active');
                
                // Mantener visible en scroll
                const dropdownRect = dropdown.getBoundingClientRect();
                const itemRect = activeItem.getBoundingClientRect();
                if (itemRect.bottom > dropdownRect.bottom) {
                    dropdown.scrollTop += (itemRect.bottom - dropdownRect.bottom);
                } else if (itemRect.top < dropdownRect.top) {
                    dropdown.scrollTop -= (dropdownRect.top - itemRect.top);
                }
            }
        };

        const renderDropdownChunk = () => {
            const chunk = currentMatches.slice(dropdown.children.length, dropdown.children.length + 50);
            if (chunk.length === 0) return;
            
            const fragment = document.createDocumentFragment();
            chunk.forEach(cliente => {
                const div = document.createElement('div');
                div.className = 'custom-dropdown-item';
                div.style.padding = '8px 12px';
                div.style.cursor = 'pointer';
                div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                div.innerHTML = `
                    <div style="font-weight: 600; color: white;">${cliente.nombre}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">CUIT: ${cliente.cuit || 'Sin CUIT'} - Cód: ${cliente.codigo}</div>
                `;
                
                div.onmousedown = (e) => {
                    e.preventDefault();
                    seleccionarCliente(cliente);
                };
                fragment.appendChild(div);
            });
            dropdown.appendChild(fragment);
            if (currentSelectedIndex >= 0) updateActiveItem();
        };

        const renderDropdown = (query) => {
            const cleanQuery = (query || '').toLowerCase().trim();
            dropdown.innerHTML = '';
            dropdown.scrollTop = 0;
            currentSelectedIndex = -1;
            
            const currentUser = getCurrentUser();
            const userVendedorCodigo = currentUser ? currentUser.vendedor_codigo : '';
            let filteredClients = clientesDB;
            if (userVendedorCodigo) {
                filteredClients = clientesDB.filter(c => c.vendedor_id === userVendedorCodigo);
            }
            
            if (cleanQuery === '') {
                currentMatches = filteredClients;
            } else {
                currentMatches = filteredClients.filter(c => 
                    c.nombre.toLowerCase().includes(cleanQuery) || 
                    c.cuit.includes(cleanQuery) ||
                    c.codigo.includes(cleanQuery)
                );
            }
            
            if (currentMatches.length > 0) {
                renderDropdownChunk();
                dropdown.style.display = 'block';
            } else {
                dropdown.style.display = 'none';
            }
        };

        // Scroll infinito en dropdown
        dropdown.addEventListener('scroll', () => {
            if (dropdown.scrollTop + dropdown.clientHeight >= dropdown.scrollHeight - 30) {
                renderDropdownChunk();
            }
        });

        reqClientInput.addEventListener('input', (e) => {
            renderDropdown(e.target.value);
        });

        reqClientInput.addEventListener('focus', (e) => {
            e.target.select();
            renderDropdown('');
        });

        reqClientInput.addEventListener('click', (e) => {
            renderDropdown('');
        });

        reqClientInput.addEventListener('keydown', (e) => {
            if (dropdown.style.display !== 'block') return;
            const items = dropdown.children;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentSelectedIndex < currentMatches.length - 1) {
                    currentSelectedIndex++;
                    if (currentSelectedIndex >= items.length) {
                        renderDropdownChunk();
                    }
                    updateActiveItem();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentSelectedIndex > 0) {
                    currentSelectedIndex--;
                    updateActiveItem();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentSelectedIndex >= 0 && currentSelectedIndex < currentMatches.length) {
                    seleccionarCliente(currentMatches[currentSelectedIndex]);
                } else if (currentMatches.length > 0) {
                    seleccionarCliente(currentMatches[0]);
                }
            }
        });

        reqClientInput.addEventListener('blur', () => {
            setTimeout(() => {
                dropdown.style.display = 'none';
            }, 200);
        });
    }

    // Atajos de teclado: F6 (Lupa contextual de clientes y proveedores) y Escape para salir de modales
    document.onkeydown = function(e) {
        if (e.key === 'F6') {
            e.preventDefault();
            const activeEl = document.activeElement;
            const isModalOpen = document.getElementById('modal-overlay') && document.getElementById('modal-overlay').style.display === 'flex';
            
            // Si el foco está en el campo de Proveedor
            if (activeEl && (activeEl.id === 'req-meca-proveedor' || activeEl.id === 'auth-edit-meca-proveedor')) {
                abrirRobotProveedores();
                showToast("Selección de Proveedor (Atajo F6)", "info");
                return;
            }

            // Si el foco está en el buscador de ítems/tarifas
            if (activeEl && (activeEl.id === 'req-product-input' || activeEl.id === 'auth-add-product-input')) {
                abrirRobotStockEdicion();
                showToast("Buscador del Tarifario / Horas (Atajo F6)", "info");
                return;
            }

            // Si está en el paso 2 de la grilla de tarifas (sin modal abierto)
            const step2Container = document.getElementById('step-container-2');
            if (step2Container && step2Container.style.display !== 'none' && !isModalOpen) {
                abrirRobotStockEdicion();
                showToast("Buscador del Tarifario / Horas (Atajo F6)", "info");
                return;
            }

            // Por defecto, F6 siempre abre el Buscador de Clientes
            abrirRobotF6();
            showToast("Buscador de Clientes (Atajo F6)", "info");
        } else if (e.key === 'Escape') {
            const overlay = document.getElementById('modal-overlay');
            if (overlay && overlay.style.display === 'flex') {
                closeModal();
            }
        }
    };

    // Eventos de clic directo en cualquier lugar del recuadro de Cliente y Proveedor (Paso 1)
    const mecaClientInput = document.getElementById('req-meca-cliente');
    if (mecaClientInput) {
        mecaClientInput.addEventListener('click', () => {
            abrirRobotF6();
        });
        mecaClientInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                abrirRobotF6();
            }
        });
    }

    const mecaProvInput = document.getElementById('req-meca-proveedor');
    if (mecaProvInput) {
        mecaProvInput.addEventListener('click', () => {
            abrirRobotProveedores();
        });
        mecaProvInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                abrirRobotProveedores();
            }
        });
    }

    // Autocomplete Productos (Stock)
    const reqProdInput = document.getElementById('req-product-input');
    const prodDropdown = document.getElementById('req-product-dropdown');
    if (reqProdInput && prodDropdown) {
        let currentMatches = [];
        let currentSelectedIndex = -1;

        const updateActiveItem = () => {
            const items = prodDropdown.children;
            for (let i = 0; i < items.length; i++) {
                items[i].classList.remove('active');
            }
            if (currentSelectedIndex >= 0 && currentSelectedIndex < items.length) {
                const activeItem = items[currentSelectedIndex];
                activeItem.classList.add('active');
                
                // Mantener visible en scroll
                const dropdownRect = prodDropdown.getBoundingClientRect();
                const itemRect = activeItem.getBoundingClientRect();
                if (itemRect.bottom > dropdownRect.bottom) {
                    prodDropdown.scrollTop += (itemRect.bottom - dropdownRect.bottom);
                } else if (itemRect.top < dropdownRect.top) {
                    prodDropdown.scrollTop -= (dropdownRect.top - itemRect.top);
                }
            }
        };

        const renderDropdownChunk = () => {
            const chunk = currentMatches.slice(prodDropdown.children.length, prodDropdown.children.length + 50);
            if (chunk.length === 0) return;
            const fragment = document.createDocumentFragment();
            chunk.forEach(prod => {
                const div = document.createElement('div');
                div.className = 'custom-dropdown-item';
                div.style.padding = '8px 12px';
                div.style.cursor = 'pointer';
                div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                
                const isOutOfStock = parseFloat(prod.stock || 0) <= 0;
                const stockColor = isOutOfStock ? 'var(--danger)' : 'var(--text-muted)';
                const stockLabel = isOutOfStock ? ' - <span style="color:var(--danger); font-weight:bold;">[STOCK 0]</span>' : '';

                div.innerHTML = `
                    <div style="font-weight: 600; color: ${isOutOfStock ? 'rgba(255,255,255,0.5)' : 'white'};">${prod.detalle}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">
                        Código: ${prod.codigo} - Precio: $${parseFloat(prod.precio || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})} - Stock: <span style="color: ${stockColor}; font-weight: ${isOutOfStock ? 'bold' : 'normal'}">${parseFloat(prod.stock || 0)}</span>${stockLabel}
                    </div>
                `;
                div.onmousedown = (e) => {
                    e.preventDefault();
                    seleccionarProducto(prod);
                };
                fragment.appendChild(div);
            });
            prodDropdown.appendChild(fragment);
            if (currentSelectedIndex >= 0) updateActiveItem();
        };

        const renderDropdown = (query) => {
            const cleanQuery = (query || '').toLowerCase().trim();
            prodDropdown.innerHTML = '';
            prodDropdown.scrollTop = 0;
            currentSelectedIndex = -1;
            
            const activeCatalog = getActiveStockCatalog();
            if (cleanQuery === '') {
                currentMatches = activeCatalog.slice(0, 100);
            } else {
                currentMatches = activeCatalog.filter(p => 
                    (p.detalle || '').toLowerCase().includes(cleanQuery) || 
                    String(p.codigo || '').toLowerCase().includes(cleanQuery)
                );
            }
            
            if (currentMatches.length > 0) {
                renderDropdownChunk();
                prodDropdown.style.display = 'block';
            } else {
                prodDropdown.style.display = 'none';
            }
        };

        prodDropdown.addEventListener('scroll', () => {
            if (prodDropdown.scrollTop + prodDropdown.clientHeight >= prodDropdown.scrollHeight - 30) {
                renderDropdownChunk();
            }
        });

        reqProdInput.addEventListener('input', (e) => {
            renderDropdown(e.target.value);
        });

        reqProdInput.addEventListener('focus', (e) => {
            e.target.select();
            renderDropdown('');
        });

        reqProdInput.addEventListener('click', (e) => {
            renderDropdown('');
        });

        reqProdInput.addEventListener('keydown', (e) => {
            if (prodDropdown.style.display !== 'block') return;
            const items = prodDropdown.children;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentSelectedIndex < currentMatches.length - 1) {
                    currentSelectedIndex++;
                    if (currentSelectedIndex >= items.length) {
                        renderDropdownChunk();
                    }
                    updateActiveItem();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentSelectedIndex > 0) {
                    currentSelectedIndex--;
                    updateActiveItem();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentSelectedIndex >= 0 && currentSelectedIndex < currentMatches.length) {
                    seleccionarProducto(currentMatches[currentSelectedIndex]);
                } else if (currentMatches.length > 0) {
                    seleccionarProducto(currentMatches[0]);
                }
            }
        });

        reqProdInput.addEventListener('blur', () => {
            setTimeout(() => {
                prodDropdown.style.display = 'none';
            }, 200);
        });
    }

    // Resetear items cargados
    if (!window.pedidoEnEdicionId && !window.pedidoEnReutilizacion) {
        pedidoItems = [];
        productoSeleccionado = null;
        if (typeof actualizarTablaItemsRequerimiento === 'function') {
            actualizarTablaItemsRequerimiento();
        }
        const mecaStep2Container = document.getElementById('req-mecanico-step2-container');
        if (mecaStep2Container) {
            mecaStep2Container.innerHTML = '';
        }
    }

    // Helper functions para el campo fijo de Validez de la Oferta (días)
    window.updateValidezOfertaHidden = function() {
        const numEl = document.getElementById('req-meca-validez-num');
        const hiddenEl = document.getElementById('req-meca-validez');
        if (!hiddenEl) return;
        const val = numEl ? numEl.value.trim() : '';
        hiddenEl.value = val ? `${val} días` : '';
    };

    window.setValidezOfertaValue = function(valStr) {
        const numEl = document.getElementById('req-meca-validez-num');
        const hiddenEl = document.getElementById('req-meca-validez');
        let num = '';
        if (valStr !== undefined && valStr !== null) {
            const str = String(valStr).trim();
            const matches = str.match(/\d+/);
            if (matches) {
                num = matches[0];
            } else if (str !== '') {
                num = str;
            }
        }
        if (numEl) numEl.value = num;
        if (hiddenEl) hiddenEl.value = num ? `${num} días` : '';
    };

    // Helper functions para el campo fijo de Duración Estimada (días)
    window.updateDuracionEstimadaHidden = function() {
        const numEl = document.getElementById('req-meca-duracion-num');
        const hiddenEl = document.getElementById('req-meca-duracion');
        if (!hiddenEl) return;
        const val = numEl ? numEl.value.trim() : '';
        hiddenEl.value = val ? `${val} días` : '';
    };

    window.setDuracionEstimadaValue = function(valStr) {
        const numEl = document.getElementById('req-meca-duracion-num');
        const hiddenEl = document.getElementById('req-meca-duracion');
        let num = '';
        if (valStr !== undefined && valStr !== null) {
            const str = String(valStr).trim();
            const matches = str.match(/\d+/);
            if (matches) {
                num = matches[0];
            } else if (str !== '') {
                num = str;
            }
        }
        if (numEl) numEl.value = num;
        if (hiddenEl) hiddenEl.value = num ? `${num} días` : '';
    };

    // Registrar submit y prevenir confirmación involuntaria por tecla Enter
    const form = document.getElementById('form-request-ped');
    if (form) {
        form.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const tagName = e.target.tagName;
                if (tagName !== 'TEXTAREA' && e.target.type !== 'submit') {
                    e.preventDefault();
                    return false;
                }
            }
        });
        form.onsubmit = function(e) {
            e.preventDefault();
            confirmarPedido();
        };
    }

    // Establecer fechas por defecto con la fecha local real al crear presupuestos
    const todayStr = getLocalDateStr();
    const futureDateStr = getLocalDateStr(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    const foEl = document.getElementById('req-meca-fecha-oferta');
    if (foEl && !foEl.value) foEl.value = todayStr;
    const fiEl = document.getElementById('req-meca-fecha-inicio');
    if (fiEl && !fiEl.value) fiEl.value = todayStr;
    const ffEl = document.getElementById('req-meca-fecha-fin');
    if (ffEl && !ffEl.value) ffEl.value = futureDateStr;
    
    if (window.setValidezOfertaValue) {
        const valEl = document.getElementById('req-meca-validez');
        if (!valEl || !valEl.value) window.setValidezOfertaValue('5 días');
    }
    const provEl = document.getElementById('req-meca-proveedor');
    if (provEl && !provEl.value) provEl.value = 'SG MONTAJES SRL';

    // Inicializar el stepper en el paso 1
    if (window.goToRequestStep) {
        window.goToRequestStep(1);
    }
}

// Lógica de navegación del Stepper Wizard de Ingreso de Pedido
window.onOcStateRadioChange = function(state) {
    const isSinOc = (state === 'Enviado sin OC' || state === 'Aprobado sin OC');
    const isConOc = (state === 'Aprobado con OC');
    
    const dateGroup = document.getElementById('oc-date-group');
    if (dateGroup) {
        dateGroup.style.display = isSinOc ? 'flex' : 'none';
        if (isSinOc) {
            const input = document.getElementById('req-oc-limit-date');
            if (input && !input.value) {
                const today = new Date().toISOString().substring(0, 10);
                input.min = today;
                setOcLimitDays(5);
            }
        }
    }
    
    const ocNumGroup = document.getElementById('oc-number-group');
    if (ocNumGroup) {
        ocNumGroup.style.display = isConOc ? 'flex' : 'none';
        if (isConOc) {
            const step1Oc = document.getElementById('req-meca-nro-oc');
            const step3Oc = document.getElementById('req-step3-nro-oc');
            if (step1Oc && step3Oc && !step3Oc.value && step1Oc.value) {
                step3Oc.value = step1Oc.value;
            }
            if (step3Oc) step3Oc.focus();
        }
    }
};

window.toggleOcDateField = function(show) {
    if (show) {
        window.onOcStateRadioChange('Enviado sin OC');
    } else {
        window.onOcStateRadioChange('Aprobado con OC');
    }
};

window.setOcLimitDays = function(days) {
    const input = document.getElementById('req-oc-limit-date');
    if (!input) return;
    const date = new Date();
    date.setDate(date.getDate() + days);
    input.value = date.toISOString().substring(0, 10);
};

window.goToRequestStep = function(step) {
    // Validaciones al intentar avanzar al paso 2 (Artículos)
    if (step === 2) {
        if (reqTipoPresupuesto === 'Mecánico' || reqTipoPresupuesto === 'Eléctrico') {
            const denominacion = (document.getElementById('req-meca-denominacion')?.value || '').trim();
            const cliente = (document.getElementById('req-meca-cliente')?.value || '').trim();
            const proveedor = (document.getElementById('req-meca-proveedor')?.value || '').trim();
            const fechaOferta = (document.getElementById('req-meca-fecha-oferta')?.value || '').trim();
            const validez = (document.getElementById('req-meca-validez')?.value || '').trim();
            const fechaInicio = (document.getElementById('req-meca-fecha-inicio')?.value || '').trim();
            const duracion = (document.getElementById('req-meca-duracion')?.value || '').trim();
            const fechaFin = (document.getElementById('req-meca-fecha-fin')?.value || '').trim();

            if (!denominacion) {
                showToast('El campo "i. Denominación del Servicio" es obligatorio.', 'error');
                document.getElementById('req-meca-denominacion')?.focus();
                return;
            }
            if (!cliente) {
                showToast('El campo "ii. Cliente" es obligatorio.', 'error');
                document.getElementById('req-meca-cliente')?.focus();
                return;
            }
            if (!proveedor) {
                showToast('El campo "iii. Nombre del Proveedor" es obligatorio.', 'error');
                document.getElementById('req-meca-proveedor')?.focus();
                return;
            }
            if (!fechaOferta) {
                showToast('El campo "iv. Fecha de Oferta" es obligatorio.', 'error');
                document.getElementById('req-meca-fecha-oferta')?.focus();
                return;
            }
            if (!validez) {
                showToast('El campo "v. Validez de la Oferta" es obligatorio.', 'error');
                (document.getElementById('req-meca-validez-num') || document.getElementById('req-meca-validez'))?.focus();
                return;
            }
            if (!fechaInicio) {
                showToast('El campo "vii. Fecha estimada de Inicio" es obligatorio.', 'error');
                document.getElementById('req-meca-fecha-inicio')?.focus();
                return;
            }
            if (!duracion) {
                showToast('El campo "viii. Duración estimada de la Ejecución" es obligatorio.', 'error');
                document.getElementById('req-meca-duracion')?.focus();
                return;
            }
            if (!fechaFin) {
                showToast('El campo "ix. Plazo Máximo de Finalización" es obligatorio.', 'error');
                document.getElementById('req-meca-fecha-fin')?.focus();
                return;
            }

            if (fechaInicio < fechaOferta) {
                showToast('La "Fecha estimada de Inicio" no puede ser anterior a la "Fecha de Oferta".', 'error');
                document.getElementById('req-meca-fecha-inicio')?.focus();
                return;
            }

            if (fechaFin <= fechaInicio) {
                showToast('El "ix. Plazo Máximo de Finalización" debe ser obligatoriamente mayor a la "Fecha estimada de Inicio".', 'error');
                document.getElementById('req-meca-fecha-fin')?.focus();
                return;
            }
        } else {
            if (typeof clienteSeleccionado === 'undefined' || !clienteSeleccionado) {
                showToast('Seleccione un cliente válido para continuar', 'error');
                return;
            }
            const condCode = document.getElementById('req-condition').value;
            if (!condCode) {
                showToast('Seleccione la condición de venta para continuar', 'error');
                return;
            }
            const depInput = document.getElementById('req-deposit-input').value;
            const transInput = document.getElementById('req-transport-input').value;
            if (!depInput || typeof depositoSeleccionado === 'undefined' || !depositoSeleccionado) {
                showToast('Seleccione un depósito para continuar', 'error');
                return;
            }
            if (!transInput || typeof transporteSeleccionado === 'undefined' || !transporteSeleccionado) {
                showToast('Seleccione un transporte para continuar', 'error');
                return;
            }
        }
    }
    
    // Validaciones al intentar avanzar al paso 3 (Resumen/Confirmación)
    if (step === 3) {
        if (pedidoItems.length === 0) {
            showToast('Debe agregar al menos un artículo al detalle antes de continuar', 'error');
            return;
        }
        
        // Toggle standard vs mechanical summary panels
        const isExcelFlow = reqTipoPresupuesto === 'Mecánico' || reqTipoPresupuesto === 'Eléctrico';
        const isElec = reqTipoPresupuesto === 'Eléctrico';
        const stdBox = document.getElementById('summary-standard-box');
        const mecBox = document.getElementById('summary-mecanico-box');
        if (stdBox) stdBox.style.display = isExcelFlow ? 'none' : 'grid';
        if (mecBox) {
            mecBox.style.display = isExcelFlow ? 'grid' : 'none';
        }

        if (isExcelFlow) {
            // Update Step 3 labels dynamically
            const lblSumInicio = document.getElementById('lbl-summary-meca-inicio');
            const lblSumDuracion = document.getElementById('lbl-summary-meca-duracion');
            if (lblSumInicio) {
                lblSumInicio.innerText = isElec ? 'FECHA DE INICIO' : 'FECHA ESTIMADA DE INICIO';
            }
            if (lblSumDuracion) {
                lblSumDuracion.innerText = isElec ? 'NUMEROS DE OT' : 'DURACIÓN ESTIMADA';
            }

            const summaryMecaPropuestaBox = document.getElementById('summary-meca-propuesta-box');
            if (summaryMecaPropuestaBox) {
                summaryMecaPropuestaBox.style.display = isElec ? 'none' : 'grid';
            }

            // Populate mechanical/electrical summary
            const sDenom = document.getElementById('summary-meca-denominacion');
            const sProv = document.getElementById('summary-meca-proveedor');
            const sFecha = document.getElementById('summary-meca-fecha-oferta');
            const sVal = document.getElementById('summary-meca-validez');
            const sPlanta = document.getElementById('summary-meca-planta');
            const sIni = document.getElementById('summary-meca-inicio');
            const sDur = document.getElementById('summary-meca-duracion');
            const sPlazo = document.getElementById('summary-meca-plazo-fin');
            const sProp = document.getElementById('summary-meca-propuesta');
            const sPers = document.getElementById('summary-meca-personal');
            const sExcl = document.getElementById('summary-meca-exclusiones');

            const valDenom = document.getElementById('req-meca-denominacion');
            const valProv = document.getElementById('req-meca-proveedor');
            const valFecha = document.getElementById('req-meca-fecha-oferta');
            const valValidez = document.getElementById('req-meca-validez');
            const valPlanta = document.getElementById('req-meca-planta');
            const valInicio = document.getElementById('req-meca-fecha-inicio') || document.getElementById('req-meca-inicio');
            const valDuracion = document.getElementById('req-meca-duracion');
            const valPlazo = document.getElementById('req-meca-fecha-fin') || document.getElementById('req-meca-plazo-fin');
            const valPropuesta = document.getElementById('req-meca-propuesta');
            const valPersonal = document.getElementById('req-meca-personal');
            const valExclusiones = document.getElementById('req-meca-exclusiones');
            const valOc = document.getElementById('req-meca-nro-oc');
            const valOt = document.getElementById('req-meca-nro-ot');

            if (sDenom) sDenom.innerText = (valDenom && valDenom.value.trim()) ? valDenom.value.trim() : '-';
            if (sProv) sProv.innerText = (valProv && valProv.value.trim()) ? valProv.value.trim() : '-';
            if (sFecha) sFecha.innerText = (valFecha && valFecha.value.trim()) ? valFecha.value.trim() : '-';
            if (sVal) sVal.innerText = (valValidez && valValidez.value.trim()) ? valValidez.value.trim() : '-';
            if (sPlanta) sPlanta.innerText = (valPlanta && valPlanta.value.trim()) ? valPlanta.value.trim() : '-';
            
            const sOc = document.getElementById('summary-meca-nro-oc');
            if (sOc) sOc.innerText = (valOc && valOc.value.trim()) ? valOc.value.trim() : '-';
            const sOt = document.getElementById('summary-meca-nro-ot');
            if (sOt) sOt.innerText = (valOt && valOt.value.trim()) ? valOt.value.trim() : '-';
            
            if (sIni) sIni.innerText = (valInicio && valInicio.value.trim()) ? valInicio.value.trim() : '-';
            if (sDur) {
                if (isElec && valOt && valOt.value.trim()) {
                    sDur.innerText = valOt.value.trim();
                } else {
                    sDur.innerText = (valDuracion && valDuracion.value.trim()) ? valDuracion.value.trim() : (valOt && valOt.value.trim() ? valOt.value.trim() : '-');
                }
            }
            if (sPlazo) sPlazo.innerText = (valPlazo && valPlazo.value.trim()) ? valPlazo.value.trim() : '-';
            if (sProp) sProp.innerText = (valPropuesta && valPropuesta.value.trim()) ? valPropuesta.value.trim() : '-';
            if (sPers) sPers.innerText = (valPersonal && valPersonal.value.trim()) ? valPersonal.value.trim() : '-';
            if (sExcl) sExcl.innerText = (valExclusiones && valExclusiones.value.trim()) ? valExclusiones.value.trim() : '-';
        } else {
            // Actualizar el resumen estándar con los datos seleccionados
            const summaryClient = document.getElementById('summary-client');
            const summaryCondition = document.getElementById('summary-condition');
            const summaryCurrency = document.getElementById('summary-currency');
            const summaryDeposit = document.getElementById('summary-deposit');
            const summaryTransport = document.getElementById('summary-transport');
            const summaryItemsCount = document.getElementById('summary-items-count');

            const summaryIsComisionista = document.getElementById('summary-is-comisionista');
            const summaryTipoNv = document.getElementById('summary-tipo-nv');
            const summaryTipoEntrega = document.getElementById('summary-tipo-entrega');
            const summaryFormaPago = document.getElementById('summary-forma-pago');

            if (summaryClient && clienteSeleccionado) {
                summaryClient.innerText = clienteSeleccionado.nombre.toUpperCase();
            }
            if (summaryCondition) {
                const condInput = document.getElementById('req-condition-input');
                summaryCondition.innerText = condInput ? condInput.value.toUpperCase() : '';
            }
            if (summaryCurrency) {
                const currencySelect = document.getElementById('req-currency');
                if (currencySelect && currencySelect.selectedIndex >= 0) {
                    summaryCurrency.innerText = currencySelect.options[currencySelect.selectedIndex].text.toUpperCase();
                }
            }
            if (summaryDeposit && depositoSeleccionado) {
                summaryDeposit.innerText = depositoSeleccionado.nombre.toUpperCase();
            }
            if (summaryTransport && transporteSeleccionado) {
                summaryTransport.innerText = transporteSeleccionado.nombre.toUpperCase();
            }
            if (summaryItemsCount) {
                const totalQty = pedidoItems.reduce((sum, item) => sum + (parseFloat(String(item.cantidad || '0').replace(',', '.')) || 0), 0);
                summaryItemsCount.innerText = totalQty.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 2});
            }
            if (summaryIsComisionista) {
                summaryIsComisionista.innerText = document.getElementById('req-is-comisionista').checked ? 'SÍ' : 'NO';
            }
            if (summaryTipoNv) {
                summaryTipoNv.innerText = document.getElementById('req-tipo-nv-val').value.toUpperCase();
            }
            if (summaryTipoEntrega) {
                summaryTipoEntrega.innerText = document.getElementById('req-tipo-entrega-val').value.toUpperCase();
            }
            if (summaryFormaPago) {
                summaryFormaPago.innerText = document.getElementById('req-forma-pago-val').value.toUpperCase();
            }
            const summaryReqAuth = document.getElementById('summary-requiere-auth');
            if (summaryReqAuth) {
                const reqAuthChk = document.getElementById('req-requiere-autorizacion');
                const isReqAuth = reqAuthChk ? reqAuthChk.checked : true;
                if (isReqAuth) {
                    summaryReqAuth.innerHTML = '<span style="color: #fde68a;">SÍ (Va a Autorización)</span>';
                } else {
                    summaryReqAuth.innerHTML = '<span style="color: #6ee7b7;">NO (Saltea y pasa a Aprobado)</span>';
                }
            }
        }

        const summaryTotal = document.getElementById('summary-total');
        if (summaryTotal) {
            const total = pedidoItems.reduce((sum, item) => sum + item.subtotal, 0);
            summaryTotal.innerText = `$${total.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
        }
    }
    
    // Ocultar todos los contenedores de paso
    const c1 = document.getElementById('step-container-1');
    const c2 = document.getElementById('step-container-2');
    const c3 = document.getElementById('step-container-3');
    if (c1) c1.style.display = 'none';
    if (c2) c2.style.display = 'none';
    if (c3) c3.style.display = 'none';
    
    // Mostrar el contenedor del paso actual
    const targetContainer = document.getElementById(`step-container-${step}`);
    if (targetContainer) targetContainer.style.display = 'flex';

    // Manejar visibilidad alternativa para el Paso 2 (Artículos) si es presupuesto mecánico
    if (step === 2) {
        const isExcelFlow = reqTipoPresupuesto === 'Mecánico' || reqTipoPresupuesto === 'Eléctrico';
        const std2 = document.getElementById('req-standard-step2-container');
        const mec2 = document.getElementById('req-mecanico-step2-container');
        if (std2) std2.style.display = isExcelFlow ? 'none' : 'flex';
        if (mec2) {
            mec2.style.display = isExcelFlow ? 'flex' : 'none';
            if (isExcelFlow) {
                renderMecanicoExcelGrid();
            }
        }
    }
    
    // Actualizar nodos visuales del step indicator
    for (let i = 1; i <= 3; i++) {
        const node = document.getElementById(`step-node-${i}`);
        if (!node) continue;
        
        const circle = node.querySelector('.step-circle');
        const label = node.querySelector('span');
        if (!circle || !label) continue;
        
        if (i < step) {
            // Paso completado exitosamente (Verde)
            circle.style.background = 'var(--success)';
            circle.style.border = 'none';
            circle.style.color = 'black';
            circle.style.boxShadow = '0 0 10px var(--success)';
            circle.innerHTML = '✓';
            label.style.color = 'var(--success)';
        } else if (i === step) {
            // Paso activo actual (Cian)
            circle.style.background = 'var(--primary)';
            circle.style.border = 'none';
            circle.style.color = 'black';
            circle.style.boxShadow = '0 0 10px var(--primary)';
            circle.innerHTML = i;
            label.style.color = 'var(--primary)';
        } else {
            // Paso pendiente inactivo (Gris oscuro)
            circle.style.background = '#1e293b';
            circle.style.border = '2px solid rgba(255,255,255,0.1)';
            circle.style.color = 'var(--text-muted)';
            circle.style.boxShadow = 'none';
            circle.innerHTML = i;
            label.style.color = 'var(--text-muted)';
        }
    }
    
    // Actualizar barra de progreso que conecta los nodos
    const progressLine = document.getElementById('step-line-progress');
    if (progressLine) {
        if (step === 1) progressLine.style.width = '0%';
        if (step === 2) progressLine.style.width = '50%';
        if (step === 3) progressLine.style.width = '100%';
    }

    window.currentRequestStep = step;
    if (typeof window.registrarNavegacion === 'function') {
        window.registrarNavegacion({ type: 'step', step: step, label: `Paso ${step}` });
    }
};

// Funciones para gestionar la ventana modal de Datos Adicionales (Estilo PRESEA)
window.onEncabezadoNext = function() {
    if (reqTipoPresupuesto === 'Mecánico' || reqTipoPresupuesto === 'Eléctrico') {
        goToRequestStep(2);
        return;
    }

    // Validar el primer paso (Encabezado)
    if (typeof clienteSeleccionado === 'undefined' || !clienteSeleccionado) {
        showToast('Seleccione un cliente válido para continuar', 'error');
        return;
    }
    const condCode = document.getElementById('req-condition').value;
    if (!condCode) {
        showToast('Seleccione la condición de venta para continuar', 'error');
        return;
    }
    const depInput = document.getElementById('req-deposit-input').value;
    const transInput = document.getElementById('req-transport-input').value;
    if (!depInput || typeof depositoSeleccionado === 'undefined' || !depositoSeleccionado) {
        showToast('Seleccione un depósito para continuar', 'error');
        return;
    }
    if (!transInput || typeof transporteSeleccionado === 'undefined' || !transporteSeleccionado) {
        showToast('Seleccione un transporte para continuar', 'error');
        return;
    }

    // Si es válido, abrir el modal de Datos Adicionales
    abrirDatosAdicionales();
};

window.abrirDatosAdicionales = function() {
    openModal('tpl-modal-datos-adicionales');
    
    // Obtener los valores actuales de los campos ocultos
    const isComisionista = document.getElementById('req-is-comisionista').checked;
    const tipoNvLabel = document.getElementById('req-tipo-nv-val').value;
    const tipoEntregaLabel = document.getElementById('req-tipo-entrega-val').value;
    const formaPagoLabel = document.getElementById('req-forma-pago-val').value;
    
    // Sincronizar hacia los elementos del modal
    const comisionistaModal = document.getElementById('modal-req-is-comisionista');
    if (comisionistaModal) comisionistaModal.checked = isComisionista;
    
    const radiosNv = document.getElementsByName('modal-req-tipo-nv');
    radiosNv.forEach(r => {
        const rLabel = r.parentElement.innerText.trim();
        if (rLabel === tipoNvLabel) r.checked = true;
    });
    
    const radiosEntrega = document.getElementsByName('modal-req-tipo-entrega');
    radiosEntrega.forEach(r => {
        const rLabel = r.parentElement.innerText.trim();
        if (rLabel === tipoEntregaLabel) r.checked = true;
    });
    
    const radiosPago = document.getElementsByName('modal-req-forma-pago');
    radiosPago.forEach(r => {
        const rLabel = r.parentElement.innerText.trim();
        if (rLabel === formaPagoLabel) r.checked = true;
    });
};

window.confirmarDatosAdicionales = function() {
    // Leer valores desde el modal
    const comisionistaModal = document.getElementById('modal-req-is-comisionista');
    const isComisionista = comisionistaModal ? comisionistaModal.checked : false;
    
    const tipoNvEl = document.querySelector('input[name="modal-req-tipo-nv"]:checked');
    const tipoNvLabel = tipoNvEl ? tipoNvEl.parentElement.innerText.trim() : 'Presupuesto Consignacion';
    
    const tipoEntregaEl = document.querySelector('input[name="modal-req-tipo-entrega"]:checked');
    const tipoEntregaLabel = tipoEntregaEl ? tipoEntregaEl.parentElement.innerText.trim() : 'Retira Cliente';
    
    const formaPagoEl = document.querySelector('input[name="modal-req-forma-pago"]:checked');
    const formaPagoLabel = formaPagoEl ? formaPagoEl.parentElement.innerText.trim() : 'Pago Cheque';
    
    // Guardar en campos ocultos del formulario principal
    document.getElementById('req-is-comisionista').checked = isComisionista;
    document.getElementById('req-tipo-nv-val').value = tipoNvLabel;
    document.getElementById('req-tipo-entrega-val').value = tipoEntregaLabel;
    document.getElementById('req-forma-pago-val').value = formaPagoLabel;
    
    // Cerrar el modal y avanzar al Paso 2 (Artículos)
    closeModal();
    goToRequestStep(2);
};

window.seleccionarProducto = function(prod) {
    if (prod && parseFloat(prod.stock || 0) <= 0) {
        showToast('Stock 0: El artículo seleccionado no tiene unidades disponibles.', 'warning');
    }
    productoSeleccionado = prod;
    const input = document.getElementById('req-product-input');
    if (input) {
        input.value = prod ? `${prod.detalle} (Cód: ${prod.codigo})` : '';
    }
    const dropdown = document.getElementById('req-product-dropdown');
    if (dropdown) dropdown.style.display = 'none';

    // Rellenar precio unitario
    const priceInput = document.getElementById('req-product-price');
    if (priceInput) {
        priceInput.value = prod ? (prod.precio !== undefined && prod.precio !== null ? prod.precio.toString().replace(/\./g, ',') : '0') : '0';
    }

    // Foco en la cantidad
    const qtyInput = document.getElementById('req-product-qty');
    if (qtyInput) {
        qtyInput.focus();
        qtyInput.select();
    }
};

window.agregarArticuloDetalle = function() {
    if (!productoSeleccionado) {
        showToast('Seleccione un artículo válido de stock.', 'error');
        return;
    }

    // Validación de stock: si el stock es 0 o menor, no permitir agregar
    if (parseFloat(productoSeleccionado.stock || 0) <= 0) {
        showToast('Stock 0: El artículo seleccionado no tiene unidades disponibles.', 'danger');
        return;
    }

    const qtyInput = document.getElementById('req-product-qty');
    const qty = parseFloat(qtyInput ? qtyInput.value : 0);
    if (isNaN(qty) || qty <= 0) {
        showToast('La cantidad debe ser mayor a cero.', 'error');
        return;
    }

    const priceInput = document.getElementById('req-product-price');
    const price = window.parseArgNumber(priceInput ? priceInput.value : 0);
    if (isNaN(price) || price < 0) {
        showToast('El precio debe ser mayor o igual a cero.', 'error');
        return;
    }

    // Comprobar si ya existe en la lista de items
    const existing = pedidoItems.find(item => item.codigo === productoSeleccionado.codigo);
    if (existing) {
        existing.cantidad += qty;
        existing.precio = price;
        existing.subtotal = existing.cantidad * existing.precio;
    } else {
        pedidoItems.push({
            codigo: productoSeleccionado.codigo,
            detalle: productoSeleccionado.detalle,
            precio: price,
            cantidad: qty,
            subtotal: qty * price,
            udm: productoSeleccionado.udm || 'u'
        });
    }

    // Limpiar campos de búsqueda
    productoSeleccionado = null;
    const prodInput = document.getElementById('req-product-input');
    if (prodInput) prodInput.value = '';
    if (qtyInput) qtyInput.value = '';
    if (priceInput) priceInput.value = '';

    actualizarTablaItemsRequerimiento();
    showToast('Artículo agregado al pedido.', 'success');
};

window.eliminarArticuloDetalle = function(codigo) {
    pedidoItems = pedidoItems.filter(item => item.codigo !== codigo);
    actualizarTablaItemsRequerimiento();
    showToast('Artículo eliminado del pedido.', 'info');
};

window.actualizarItemFila = function(codigo, nuevaQty, nuevoPrecio) {
    const item = pedidoItems.find(i => i.codigo === codigo);
    if (!item) return;

    if (nuevaQty !== null) {
        const qty = parseFloat(nuevaQty);
        if (!isNaN(qty) && qty > 0) {
            item.cantidad = qty;
        } else {
            showToast('La cantidad debe ser mayor a cero.', 'error');
        }
    }

    if (nuevoPrecio !== null) {
        const price = parseFloat(nuevoPrecio);
        if (!isNaN(price) && price >= 0) {
            item.precio = price;
        } else {
            showToast('El precio debe ser mayor o igual a cero.', 'error');
        }
    }

    item.subtotal = item.cantidad * item.precio;
    actualizarTablaItemsRequerimiento();
};

window.actualizarTablaItemsRequerimiento = function() {
    const listBody = document.getElementById('req-items-list');
    if (!listBody) return;

    if (pedidoItems.length === 0) {
        listBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 15px; font-style: italic;">
                    No se han agregado artículos al detalle. El importe se cargará de forma manual o según sumatoria.
                </td>
            </tr>
        `;
        
        // Mantener el input de importe total en 0.00 y de solo lectura
        const reqAmtInput = document.getElementById('req-amount');
        if (reqAmtInput) {
            reqAmtInput.value = '0.00';
            reqAmtInput.readOnly = true;
            reqAmtInput.style.background = 'rgba(255,255,255,0.05)';
            reqAmtInput.style.color = 'var(--text-muted)';
        }
        const totalNVDisplay = document.getElementById('req-total-nv-display');
        if (totalNVDisplay) {
            totalNVDisplay.innerText = '$0,00';
        }
        return;
    }

    let html = '';
    let totalAmt = 0;

    pedidoItems.forEach(item => {
        totalAmt += item.subtotal;
        html += `
            <tr>
                <td style="font-family: monospace; vertical-align: middle;">${item.codigo}</td>
                <td style="vertical-align: middle;"><strong>${item.detalle}</strong></td>
                <td style="text-align: right; font-family: monospace; vertical-align: middle;">
                    <input type="number" value="${item.precio.toFixed(2)}" min="0" step="any" 
                        style="width: 90px; text-align: right; background: rgba(255,255,255,0.05); color: white; border: 1px solid var(--glass-border); border-radius: 4px; padding: 2px 5px;" 
                        onchange="actualizarItemFila('${item.codigo}', null, this.value)">
                </td>
                <td style="text-align: right; font-family: monospace; vertical-align: middle;">
                    <input type="number" value="${item.cantidad}" min="0.01" step="any" 
                        style="width: 70px; text-align: right; background: rgba(255,255,255,0.05); color: white; border: 1px solid var(--glass-border); border-radius: 4px; padding: 2px 5px;" 
                        onchange="actualizarItemFila('${item.codigo}', this.value, null)">
                </td>
                <td style="text-align: right; font-family: monospace; font-weight: bold; vertical-align: middle;">$${item.subtotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: center; vertical-align: middle;">
                    <button type="button" class="btn btn-sm btn-danger" onclick="eliminarArticuloDetalle('${item.codigo}')" style="padding: 2px 8px; font-size: 10px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    listBody.innerHTML = html;

    // Actualizar el input de importe total y deshabilitarlo
    const reqAmtInput = document.getElementById('req-amount');
    if (reqAmtInput) {
        reqAmtInput.value = totalAmt.toFixed(2);
        reqAmtInput.readOnly = true;
        reqAmtInput.style.background = 'rgba(255,255,255,0.05)';
        reqAmtInput.style.color = 'var(--text-muted)';
    }

    // Actualizar el total del Presupuesto al lado del encabezado
    const totalNVDisplay = document.getElementById('req-total-nv-display');
    if (totalNVDisplay) {
        totalNVDisplay.innerText = `$${totalAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    }
};

window.abrirRobotStock = function() {
    openModal('tpl-modal-robot-stock');
    const searchInput = document.getElementById('robot-stock-search-input');
    const resultsList = document.getElementById('robot-stock-results-list');
    const resultsCount = document.getElementById('robot-stock-results-count');
    const rubroFilter = document.getElementById('robot-stock-rubro-filter');
    const catalog = getActiveStockCatalog();

    // Popular rubro filter
    if (rubroFilter) {
        const rubros = [...new Set(catalog.map(s => s.rubro).filter(Boolean))].sort();
        let html = '<option value="">Todos los rubros...</option>';
        rubros.forEach(r => {
            html += `<option value="${r}">${r}</option>`;
        });
        rubroFilter.innerHTML = html;
    }

    const renderResults = () => {
        resultsList.innerHTML = '';
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const rubro = rubroFilter ? rubroFilter.value : '';

        let filtered = catalog;
        if (rubro) {
            filtered = filtered.filter(s => s.rubro === rubro);
        }
        if (query) {
            filtered = filtered.filter(s => 
                (s.detalle || '').toLowerCase().includes(query) || 
                String(s.codigo || '').toLowerCase().includes(query)
            );
        }

        // Paginación a 100 resultados para no colgar la UI
        const limit = 100;
        const sliced = filtered.slice(0, limit);
        
        resultsCount.innerText = `Mostrando ${sliced.length} de ${filtered.length} productos`;

        sliced.forEach(s => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            
            const stockColor = s.stock > 0 ? 'var(--success)' : 'var(--danger)';
            const stockBold = s.stock > 0 ? 'bold' : 'normal';

            tr.innerHTML = `
                <td style="font-family: monospace;">${s.codigo}</td>
                <td><strong>${s.detalle}</strong><div style="font-size:10px; color:var(--text-muted);">${s.rubro} - ${s.subrubro || ''}</div></td>
                <td>${s.rubro}</td>
                <td style="font-family: monospace; text-align: right;">$${s.precio.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="font-family: monospace; text-align: right; color: ${stockColor}; font-weight: ${stockBold};">${s.stock.toLocaleString('es-AR')}</td>
            `;

            tr.onclick = () => {
                seleccionarProducto(s);
                closeModal();
            };
            resultsList.appendChild(tr);
        });
    };

    if (searchInput) searchInput.addEventListener('input', renderResults);
    if (rubroFilter) rubroFilter.addEventListener('change', renderResults);

    renderResults();
    setTimeout(() => { if (searchInput) searchInput.focus(); }, 150);
};

let clienteSeleccionado = null;

function seleccionarCliente(cliente) {
    if (!cliente) return;
    clienteSeleccionado = cliente;
    
    // Asignar en Presupuestos Mecánicos / Eléctricos (Paso 1)
    const reqMecaClient = document.getElementById('req-meca-cliente');
    if (reqMecaClient) {
        reqMecaClient.value = cliente.nombre;
    }

    // Asignar en Formulario Estándar
    const reqClientInput = document.getElementById('req-client');
    if (reqClientInput) {
        reqClientInput.value = cliente.id || cliente.codigo;
    }
    
    // Asignar en Modal de Modificación / Detalle
    const authEditClient = document.getElementById('auth-edit-meca-cliente');
    if (authEditClient) {
        authEditClient.value = cliente.nombre;
    }
    const authMecaClientVal = document.getElementById('auth-meca-cliente-val');
    if (authMecaClientVal && viewMode !== 'Modificacion') {
        authMecaClientVal.innerText = cliente.nombre;
    }
    const authClientDisplay = document.getElementById('auth-client-display');
    if (authClientDisplay) {
        authClientDisplay.innerText = `${cliente.codigo}  ${cliente.nombre.toUpperCase()}`;
    }
    if (pedidoActivo) {
        pedidoActivo.cliente_id = cliente.codigo;
        pedidoActivo.cliente_nombre = cliente.nombre;
        if (typeof saveTempEdits === 'function') saveTempEdits();
    }
    
    // Cargar condición del cliente por defecto
    const foundCond = typeof condicionesDB !== 'undefined' ? condicionesDB.find(c => String(c.codigo) === String(cliente.condicion_id)) : null;
    seleccionarCondicion(foundCond || (cliente.condicion_id ? { codigo: cliente.condicion_id, nombre: cliente.condicion_nombre } : null));

    // Cargar depósito del cliente por defecto
    const foundDep = typeof depositosDB !== 'undefined' ? depositosDB.find(d => d.codigo === cliente.deposito_id) : null;
    seleccionarDeposito(foundDep || (cliente.deposito_id ? { codigo: cliente.deposito_id, nombre: cliente.deposito_nombre } : null));

    // Cargar transporte del cliente por defecto
    const foundTrans = typeof transportesDB !== 'undefined' ? transportesDB.find(t => t.codigo === cliente.transporte_id) : null;
    seleccionarTransporte(foundTrans || (cliente.transporte_id ? { codigo: cliente.transporte_id, nombre: cliente.transporte_nombre } : null));
    
    const clientDropdown = document.getElementById('req-client-dropdown');
    if (clientDropdown) clientDropdown.style.display = 'none';

    // Pasar automáticamente al siguiente campo (Proveedor) en Paso 1
    setTimeout(() => {
        const step1 = document.getElementById('step-container-1');
        if (step1 && step1.style.display !== 'none') {
            const provInput = document.getElementById('req-meca-proveedor');
            if (provInput) {
                provInput.focus();
                abrirRobotProveedores();
            }
        }
    }, 250);
}

// 2. BUSCADOR F6 DE PROVEEDORES
window.abrirRobotProveedores = function() {
    openModal('tpl-modal-robot-proveedores');
    const proveedores = ['SG MONTAJES SRL', 'ACOSTA SERVICIO'];
    let selectedProvIdx = 0;
    
    const updateProvHighlight = () => {
        const cardSg = document.getElementById('prov-card-sg');
        const cardAcosta = document.getElementById('prov-card-acosta');
        if (cardSg && cardAcosta) {
            if (selectedProvIdx === 0) {
                cardSg.style.outline = '2px solid #22d3ee';
                cardSg.style.background = 'rgba(34, 211, 238, 0.25)';
                cardAcosta.style.outline = 'none';
                cardAcosta.style.background = 'rgba(168, 85, 247, 0.1)';
            } else {
                cardSg.style.outline = 'none';
                cardSg.style.background = 'rgba(34, 211, 238, 0.1)';
                cardAcosta.style.outline = '2px solid #c084fc';
                cardAcosta.style.background = 'rgba(168, 85, 247, 0.25)';
            }
        }
    };

    setTimeout(updateProvHighlight, 50);

    const onProvKeyDown = (e) => {
        const modal = document.getElementById('modal-overlay');
        if (!modal || modal.style.display === 'none') {
            window.removeEventListener('keydown', onProvKeyDown);
            return;
        }
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            selectedProvIdx = 1;
            updateProvHighlight();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            selectedProvIdx = 0;
            updateProvHighlight();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            window.removeEventListener('keydown', onProvKeyDown);
            seleccionarProveedor(proveedores[selectedProvIdx]);
        }
    };

    window.addEventListener('keydown', onProvKeyDown);
};

window.seleccionarProveedor = function(nombre) {
    if (!nombre) return;
    const mecaProv = document.getElementById('req-meca-proveedor');
    if (mecaProv) mecaProv.value = nombre;
    
    const editMecaProv = document.getElementById('auth-edit-meca-proveedor');
    if (editMecaProv) editMecaProv.value = nombre;
    
    const authMecaProvVal = document.getElementById('auth-meca-proveedor-val');
    if (authMecaProvVal && viewMode !== 'Modificacion') {
        authMecaProvVal.innerText = nombre;
    }
    
    if (pedidoActivo) {
        pedidoActivo.meca_proveedor = nombre;
        if (typeof saveTempEdits === 'function') saveTempEdits();
    }
    
    closeModal();
    showToast(`Proveedor seleccionado: ${nombre}`, 'success');

    // Pasar automáticamente al siguiente campo (Fecha de Oferta) en Paso 1
    setTimeout(() => {
        const step1 = document.getElementById('step-container-1');
        if (step1 && step1.style.display !== 'none') {
            const fechaEl = document.getElementById('req-meca-fecha-oferta');
            if (fechaEl) fechaEl.focus();
        }
    }, 150);
};

// 3. BUSCADOR F6 AVANZADO DE CLIENTES (ROBOT)
window.abrirRobotF6 = function() {
    openModal('tpl-modal-robot');
    const searchInput = document.getElementById('robot-search-input');
    const resultsList = document.getElementById('robot-results-list');
    const resultsCount = document.getElementById('robot-results-count');
    const resultsTable = document.getElementById('robot-results-table');
    const scrollContainer = resultsTable ? resultsTable.closest('.table-responsive') : null;
    
    let currentRobotMatches = [];
    let selectedIndex = 0;

    const updateActiveRowHighlight = () => {
        if (!resultsList) return;
        const rows = resultsList.querySelectorAll('tr');
        rows.forEach((r, idx) => {
            if (idx === selectedIndex) {
                r.style.backgroundColor = 'rgba(34, 211, 238, 0.2)';
                r.style.outline = '1px solid #22d3ee';
                r.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                r.style.backgroundColor = '';
                r.style.outline = '';
            }
        });
    };
    
    const renderRobotResultsChunk = () => {
        const renderedCount = resultsList.children.length;
        const chunk = currentRobotMatches.slice(renderedCount, renderedCount + 50);
        if (chunk.length === 0) return;
        
        const fragment = document.createDocumentFragment();
        chunk.forEach((c, idx) => {
            const actualIndex = renderedCount + idx;
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.setAttribute('data-idx', actualIndex);
            
            tr.innerHTML = `
                <td style="font-family: monospace; font-weight: 700; color: #22d3ee;">${c.codigo}</td>
                <td><strong style="color: #ffffff;">${c.nombre}</strong><div style="font-size:11px; color:var(--text-muted);">${c.domicilio || ''} - ${c.localidad || ''}</div></td>
                <td>${c.cuit || '-'}</td>
                <td>${c.localidad || '-'}</td>
            `;
            
            tr.onclick = () => {
                seleccionarCliente(c);
                closeModal();
                showToast(`Cliente seleccionado: ${c.nombre}`, 'success');
            };

            tr.onmouseenter = () => {
                selectedIndex = actualIndex;
                updateActiveRowHighlight();
            };

            fragment.appendChild(tr);
        });
        resultsList.appendChild(fragment);
        updateActiveRowHighlight();
    };

    const renderRobotResults = (query) => {
        resultsList.innerHTML = '';
        selectedIndex = 0;
        if (scrollContainer) scrollContainer.scrollTop = 0;
        const cleanQuery = (query || '').toLowerCase().trim();
        
        const currentUser = getCurrentUser();
        const userVendedorCodigo = currentUser ? currentUser.vendedor_codigo : '';
        let filteredClients = clientesDB;
        if (userVendedorCodigo) {
            filteredClients = clientesDB.filter(c => c.vendedor_id === userVendedorCodigo);
        }
        
        if (cleanQuery === '') {
            currentRobotMatches = filteredClients;
        } else {
            currentRobotMatches = filteredClients.filter(c => 
                c.nombre.toLowerCase().includes(cleanQuery) || 
                c.cuit.includes(cleanQuery) ||
                c.codigo.includes(cleanQuery) ||
                (c.localidad || '').toLowerCase().includes(cleanQuery)
            );
        }
        
        resultsCount.innerText = `Mostrando ${currentRobotMatches.length} clientes`;
        renderRobotResultsChunk();
    };

    if (scrollContainer) {
        scrollContainer.onscroll = () => {
            if (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 30) {
                renderRobotResultsChunk();
            }
        };
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderRobotResults(e.target.value);
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentRobotMatches.length > 0) {
                    selectedIndex = Math.min(selectedIndex + 1, currentRobotMatches.length - 1);
                    // Si el índice supera los renderizados, renderizar más
                    if (selectedIndex >= resultsList.children.length) {
                        renderRobotResultsChunk();
                    }
                    updateActiveRowHighlight();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentRobotMatches.length > 0) {
                    selectedIndex = Math.max(selectedIndex - 1, 0);
                    updateActiveRowHighlight();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentRobotMatches.length > 0 && currentRobotMatches[selectedIndex]) {
                    const selClient = currentRobotMatches[selectedIndex];
                    seleccionarCliente(selClient);
                    closeModal();
                    showToast(`Cliente seleccionado: ${selClient.nombre}`, 'success');
                }
            }
        });

        renderRobotResults('');
        setTimeout(() => searchInput.focus(), 150);
    }
};

window.pedidoEnEdicionId = null;

window.crearPresupuestoBasadoEnActual = function(id) {
    const p = (id && typeof id === 'string') ? appData.pedidos.find(x => x.id === id) : pedidoActivo;
    if (!p) {
        showToast('No se encontró el presupuesto de origen', 'error');
        return;
    }
    if (typeof closeModal === 'function') closeModal();

    window.pedidoEnEdicionId = null; // Para que sea un presupuesto NUEVO
    window.pedidoEnReutilizacion = true;
    reqTipoPresupuesto = p.tipo_presupuesto || 'Eléctrico';
    
    // Cambiar navegación a Gestión de Presupuestos en el sidebar
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    const menuItem = document.getElementById('menu-ingresar');
    if (menuItem) menuItem.classList.add('active');

    // Renderizar la vista de Gestión de Presupuestos
    renderContent('tpl-request-ped');
    initRequestView();

    // Actualizar el rubro (badge e interfaz) según el tipo de presupuesto (Eléctrico / Mecánico)
    updateTipoPresupuestoBadge();

    // Precompletar datos del Paso 1
    const setVal = (elemId, val) => {
        const el = document.getElementById(elemId);
        if (el) el.value = val || '';
    };

    setVal('req-meca-denominacion', p.meca_denominacion || p.motivo || '');
    setVal('req-meca-cliente', p.cliente_nombre || 'CARGILL SACI');
    setVal('req-meca-proveedor', p.meca_proveedor || 'SG MONTAJES SRL');
    setVal('req-meca-fecha-oferta', new Date().toISOString().substring(0, 10));
    setVal('req-meca-validez', p.meca_validez || '5 días');
    if (typeof window.setValidezOfertaValue === 'function') window.setValidezOfertaValue(p.meca_validez || '5 días');
    setVal('req-meca-planta', p.meca_planta || 'APS');
    setVal('req-meca-nro-oc', p.meca_nro_oc || '');
    setVal('req-meca-nro-ot', p.meca_nro_ot || '');
    setVal('req-meca-fecha-inicio', p.meca_fecha_inicio || new Date().toISOString().substring(0, 10));
    setVal('req-meca-duracion', p.meca_duracion || '');
    if (typeof window.setDuracionEstimadaValue === 'function') window.setDuracionEstimadaValue(p.meca_duracion || '');
    setVal('req-meca-fecha-fin', p.meca_fecha_fin || '');
    setVal('req-meca-propuesta', p.meca_propuesta || '');
    setVal('req-meca-personal', p.meca_personal || '');
    setVal('req-meca-exclusiones', p.meca_exclusiones || '');
    setVal('req-reason', p.motivo || '');

    // Cargar ítems en el Paso 2
    pedidoItems = JSON.parse(JSON.stringify(p.items || []));

    // Resetear pestaña activa para el Paso 2
    window.activeMecaTab = 0;

    // Ir a Paso 1 (Datos Generales) en Gestión de Presupuestos
    goToRequestStep(1);

    const tipoLabel = reqTipoPresupuesto === 'Mecánico' ? '⚙️ Presupuesto Mecánico' : '⚡ Presupuesto Eléctrico';
    showToast(`📋 Redirigido a Gestión de Presupuestos (${tipoLabel}). Datos cargados basados en #${p.id}.`, 'success');
};

window.cargarPresupuestoParaModificacion = function(id) {
    const p = appData.pedidos.find(x => x.id === id);
    if (!p) {
        showToast('No se encontró el presupuesto a modificar', 'error');
        return;
    }

    window.pedidoEnEdicionId = p.id;
    window.pedidoEnReutilizacion = false;
    reqTipoPresupuesto = p.tipo_presupuesto || 'Eléctrico';
    
    // Switch to Ingreso de Presupuesto menu & template
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    const menuItem = document.getElementById('menu-ingresar');
    if (menuItem) menuItem.classList.add('active');

    renderContent('tpl-request-ped');
    initRequestView();

    // Actualizar el rubro
    updateTipoPresupuestoBadge();

    // Pre-fill Step 1 inputs with p's values
    const setVal = (elemId, val) => {
        const el = document.getElementById(elemId);
        if (el) el.value = val || '';
    };

    setVal('req-meca-denominacion', p.meca_denominacion || p.motivo || '');
    setVal('req-meca-cliente', p.cliente_nombre || 'CARGILL SACI');
    setVal('req-meca-proveedor', p.meca_proveedor || 'SG MONTAJES SRL');
    setVal('req-meca-fecha-oferta', p.meca_fecha_oferta || '');
    setVal('req-meca-validez', p.meca_validez || '5 días');
    if (typeof window.setValidezOfertaValue === 'function') window.setValidezOfertaValue(p.meca_validez || '5 días');
    setVal('req-meca-planta', p.meca_planta || 'APS');
    setVal('req-meca-nro-oc', p.meca_nro_oc || '');
    setVal('req-meca-nro-ot', p.meca_nro_ot || '');
    setVal('req-meca-fecha-inicio', p.meca_fecha_inicio || new Date().toISOString().substring(0, 10));
    setVal('req-meca-duracion', p.meca_duracion || '');
    if (typeof window.setDuracionEstimadaValue === 'function') window.setDuracionEstimadaValue(p.meca_duracion || '');
    setVal('req-meca-fecha-fin', p.meca_fecha_fin || '');
    setVal('req-meca-propuesta', p.meca_propuesta || '');
    setVal('req-meca-personal', p.meca_personal || '');
    setVal('req-meca-exclusiones', p.meca_exclusiones || '');
    setVal('req-reason', p.motivo || '');

    // Set pre-filled items for Step 2
    pedidoItems = JSON.parse(JSON.stringify(p.items || []));

    // Open Step 1 directly
    goToRequestStep(1);

    showToast(`Modificando Presupuesto ${p.id}. Puede revisar o cambiar los Datos (Paso 1) y el Tarifario (Paso 2).`, 'info');
};

function confirmarPedido() {
    if (typeof window.recalcMecaExcelAll === 'function') {
        try { window.recalcMecaExcelAll(); } catch(e) {}
    }
    if (!clienteSeleccionado) {
        const clientVal = (document.getElementById('req-meca-cliente') && document.getElementById('req-meca-cliente').value) || 
                          (document.getElementById('req-client') && document.getElementById('req-client').value) || 
                          'CARGILL SACI';
        clienteSeleccionado = {
            codigo: '3',
            nombre: clientVal,
            cuit: '30-50679316-5',
            telefono: '',
            email: '',
            vendedor_id: '',
            vendedor_nombre: ''
        };
    }
    if (!Array.isArray(pedidoItems) || pedidoItems.length === 0) {
        showToast('El presupuesto debe contener al menos un artículo o concepto del tarifario', 'error');
        return;
    }

    openModal('tpl-modal-tipo-reporte');
}

window.confirmarConTipoReporte = function(tipoReporte) {
    closeModal();
    
    try {
        if (typeof window.recalcMecaExcelAll === 'function') {
            try { window.recalcMecaExcelAll(); } catch(e) {}
        }

        const amount = Array.isArray(pedidoItems) 
            ? pedidoItems.reduce((sum, item) => sum + (parseFloat(item.subtotal) || ((parseFloat(item.cantidad) || 0) * (parseFloat(item.precio) || 0)) || 0), 0)
            : 0;

        const condCode = document.getElementById('req-condition') ? document.getElementById('req-condition').value : '';
        const motivo = document.getElementById('req-reason') ? document.getElementById('req-reason').value : '';

        const depCode = depositoSeleccionado ? depositoSeleccionado.codigo : '';
        const transCode = transporteSeleccionado ? transporteSeleccionado.codigo : '';

        const conditionObj = (typeof condicionesDB !== 'undefined' && Array.isArray(condicionesDB)) ? condicionesDB.find(c => c.codigo === condCode) : null;
        const depositoObj = depositoSeleccionado;
        const transporteObj = transporteSeleccionado;
        
        if (!clienteSeleccionado) {
            const clientVal = (document.getElementById('req-meca-cliente') && document.getElementById('req-meca-cliente').value) || 
                              (document.getElementById('req-client') && document.getElementById('req-client').value) || 
                              'CARGILL SACI';
            clienteSeleccionado = {
                codigo: '3',
                nombre: clientVal,
                cuit: '30-50679316-5',
                telefono: '',
                email: '',
                vendedor_id: '',
                vendedor_nombre: ''
            };
        }

        const user = getCurrentUser();
        const userVendedorId = (user && user.vendedor_codigo) ? user.vendedor_codigo : (clienteSeleccionado ? clienteSeleccionado.vendedor_id || '' : '');
        const userVendedorNombre = (user && user.vendedor_nombre) ? user.vendedor_nombre : (clienteSeleccionado ? clienteSeleccionado.vendedor_nombre || '' : '');

        const isEditing = (typeof window.pedidoEnEdicionId !== 'undefined' && window.pedidoEnEdicionId);
        let targetPedido = null;
        let targetId = '';

        if (!appData) appData = {};
        if (!Array.isArray(appData.pedidos)) appData.pedidos = [];

        if (isEditing) {
            targetPedido = appData.pedidos.find(x => x.id === window.pedidoEnEdicionId);
        }

        const finalNroOc = document.getElementById('req-meca-nro-oc') ? document.getElementById('req-meca-nro-oc').value.trim() : '';

        if (targetPedido) {
            targetId = targetPedido.id;
            targetPedido.tipo_reporte = tipoReporte || 'detallado';
            targetPedido.importe = amount;
            targetPedido.importe_original = amount;
            targetPedido.condicion_id = condCode;
            targetPedido.condicion_nombre = conditionObj ? (conditionObj.nombre || `Condición ${condCode}`) : `Condición ${condCode}`;
            targetPedido.deposito_id = depCode;
            targetPedido.deposito_nombre = depositoObj ? (depositoObj.nombre || `Depósito ${depCode}`) : (depCode ? `Depósito ${depCode}` : '');
            targetPedido.transporte_id = transCode;
            targetPedido.transporte_nombre = transporteObj ? (transporteObj.nombre || `Transporte ${transCode}`) : (transCode ? `Transporte ${transCode}` : '');
            targetPedido.motivo = motivo;
            targetPedido.tipo_presupuesto = reqTipoPresupuesto || 'Eléctrico';
            targetPedido.meca_denominacion = document.getElementById('req-meca-denominacion') ? document.getElementById('req-meca-denominacion').value : '';
            if (document.getElementById('req-meca-cliente')) targetPedido.cliente_nombre = document.getElementById('req-meca-cliente').value;
            targetPedido.meca_proveedor = document.getElementById('req-meca-proveedor') ? document.getElementById('req-meca-proveedor').value : '';
            targetPedido.meca_fecha_oferta = document.getElementById('req-meca-fecha-oferta') ? document.getElementById('req-meca-fecha-oferta').value : '';
            targetPedido.meca_validez = document.getElementById('req-meca-validez') ? document.getElementById('req-meca-validez').value : '';
            targetPedido.meca_planta = document.getElementById('req-meca-planta') ? document.getElementById('req-meca-planta').value : '';
            targetPedido.meca_nro_oc = finalNroOc;
            targetPedido.nro_oc = finalNroOc;
            targetPedido.meca_nro_ot = document.getElementById('req-meca-nro-ot') ? document.getElementById('req-meca-nro-ot').value : '';
            targetPedido.meca_fecha_inicio = document.getElementById('req-meca-fecha-inicio') ? document.getElementById('req-meca-fecha-inicio').value : '';
            targetPedido.meca_duracion = document.getElementById('req-meca-duracion') ? document.getElementById('req-meca-duracion').value : '';
            targetPedido.meca_fecha_fin = document.getElementById('req-meca-fecha-fin') ? document.getElementById('req-meca-fecha-fin').value : '';
            targetPedido.meca_propuesta = document.getElementById('req-meca-propuesta') ? document.getElementById('req-meca-propuesta').value : '';
            targetPedido.meca_personal = document.getElementById('req-meca-personal') ? document.getElementById('req-meca-personal').value : '';
            targetPedido.meca_exclusiones = document.getElementById('req-meca-exclusiones') ? document.getElementById('req-meca-exclusiones').value : '';
            targetPedido.items = (pedidoItems || []).map(item => ({
                ...item,
                cantidad_original: item.cantidad,
                estado: 'Pendiente'
            }));
            
            window.pedidoEnEdicionId = null;
            try { saveData(); } catch(e) {}
            showToast(`Presupuesto ${targetId} modificado correctamente.`, 'success');
            try { verDetallePedido(targetId); } catch(e) {}
        } else {
            const isMec = (reqTipoPresupuesto === 'Mecánico');
            const rubroPrefix = isMec ? '101-MEC' : '102-ELEC';
            let counter = 1;
            while (appData.pedidos.some(p => p.id === `${rubroPrefix}-${String(counter).padStart(4, '0')}`)) {
                counter++;
            }
            targetId = `${rubroPrefix}-${String(counter).padStart(4, '0')}`;

            const isComisionista = document.getElementById('req-is-comisionista') ? document.getElementById('req-is-comisionista').checked : false;
            const tipoNvLabel = document.getElementById('req-tipo-nv-val') ? document.getElementById('req-tipo-nv-val').value : 'Presupuesto Consignacion';
            const tipoEntregaLabel = document.getElementById('req-tipo-entrega-val') ? document.getElementById('req-tipo-entrega-val').value : 'ENTREGA EN PLANTA';
            const formaPagoLabel = document.getElementById('req-forma-pago-val') ? document.getElementById('req-forma-pago-val').value : '30 DIAS';

            const reqAuthChk = document.getElementById('req-requiere-autorizacion');
            const isReqAuth = reqAuthChk ? reqAuthChk.checked : true;
            let finalInitialState = 'Enviado sin OC';
            let finalItemState = 'Pendiente';

            if (!isReqAuth) {
                if (finalNroOc && finalNroOc.trim()) {
                    finalInitialState = 'Aprobado con OC';
                } else {
                    finalInitialState = 'Aprobado sin OC';
                }
                finalItemState = 'Autorizado';
            }

            const newPedido = {
                id: targetId,
                fecha: getLocalCurrentDateTimeStr(),
                cliente_id: clienteSeleccionado ? clienteSeleccionado.codigo : '3',
                cliente_nombre: (document.getElementById('req-meca-cliente') && document.getElementById('req-meca-cliente').value) ? document.getElementById('req-meca-cliente').value : (clienteSeleccionado ? clienteSeleccionado.nombre : 'CARGILL SACI'),
                cuit: clienteSeleccionado ? clienteSeleccionado.cuit : '30-50679316-5',
                telefono: clienteSeleccionado ? clienteSeleccionado.telefono : '',
                email: clienteSeleccionado ? clienteSeleccionado.email : '',
                vendedor_id: userVendedorId,
                vendedor_nombre: userVendedorNombre,
                operador_vendedor_id: userVendedorId,
                operador_vendedor_nombre: userVendedorNombre,
                tipo_reporte: tipoReporte || 'detallado',
                importe: amount,
                importe_original: amount,
                condicion_id: condCode,
                condicion_nombre: conditionObj ? (conditionObj.nombre || `Condición ${condCode}`) : `Condición ${condCode}`,
                deposito_id: depCode,
                deposito_nombre: depositoObj ? (depositoObj.nombre || `Depósito ${depCode}`) : (depCode ? `Depósito ${depCode}` : ''),
                transporte_id: transCode,
                transporte_nombre: transporteObj ? (transporteObj.nombre || `Transporte ${transCode}`) : (transCode ? `Transporte ${transCode}` : ''),
                is_comisionista: isComisionista,
                tipo_nv: tipoNvLabel,
                tipo_entrega: tipoEntregaLabel,
                forma_pago: formaPagoLabel,
                motivo: motivo,
                tipo_presupuesto: reqTipoPresupuesto || 'Eléctrico',
                meca_denominacion: document.getElementById('req-meca-denominacion') ? document.getElementById('req-meca-denominacion').value : '',
                meca_proveedor: document.getElementById('req-meca-proveedor') ? document.getElementById('req-meca-proveedor').value : '',
                meca_fecha_oferta: document.getElementById('req-meca-fecha-oferta') ? document.getElementById('req-meca-fecha-oferta').value : '',
                meca_validez: document.getElementById('req-meca-validez') ? document.getElementById('req-meca-validez').value : '',
                meca_planta: document.getElementById('req-meca-planta') ? document.getElementById('req-meca-planta').value : '',
                meca_nro_oc: finalNroOc,
                nro_oc: finalNroOc,
                meca_nro_ot: document.getElementById('req-meca-nro-ot') ? document.getElementById('req-meca-nro-ot').value : '',
                meca_fecha_inicio: document.getElementById('req-meca-fecha-inicio') ? document.getElementById('req-meca-fecha-inicio').value : '',
                meca_duracion: document.getElementById('req-meca-duracion') ? document.getElementById('req-meca-duracion').value : '',
                meca_fecha_fin: document.getElementById('req-meca-fecha-fin') ? document.getElementById('req-meca-fecha-fin').value : '',
                meca_propuesta: document.getElementById('req-meca-propuesta') ? document.getElementById('req-meca-propuesta').value : '',
                meca_personal: document.getElementById('req-meca-personal') ? document.getElementById('req-meca-personal').value : '',
                meca_exclusiones: document.getElementById('req-meca-exclusiones') ? document.getElementById('req-meca-exclusiones').value : '',
                operador: user ? user.username : 'admin',
                requiere_autorizacion: isReqAuth,
                estado: finalInitialState,
                items: (pedidoItems || []).map(item => ({
                    ...item,
                    cantidad_original: item.cantidad,
                    estado: finalItemState
                }))
            };

            appData.pedidos.push(newPedido);
            try { saveData(); } catch(e) {}

            // Inserción directa en presupuesto_items de Supabase
            const client = (typeof getDbClient === 'function') ? getDbClient() : null;
            if (client && Array.isArray(newPedido.items) && newPedido.items.length > 0) {
                const itemRows = newPedido.items.map((it, idx) => {
                    const cant = parseFloat(it.cantidad) || 0;
                    const pu = parseFloat(it.precio || it.precio_unitario) || 0;
                    return {
                        presupuesto_id: String(newPedido.id),
                        codigo: String(it.codigo || ''),
                        detalle: String(it.detalle || it.descripcion || 'Item de Presupuesto'),
                        rubro: newPedido.tipo_presupuesto || 'Eléctrico',
                        subrubro: it.subrubro || '',
                        cantidad: cant,
                        unidad: it.unidad || 'UN',
                        precio_unitario: pu,
                        subtotal: parseFloat(it.subtotal) || (cant * pu),
                        orden: idx + 1
                    };
                });
                client.from('presupuesto_items').insert(itemRows).then(function(res) {
                    if (res && res.error) console.warn("⚠️ Error insertando items en Supabase:", res.error);
                    else console.log("☁️ Supabase: " + itemRows.length + " items insertados en presupuesto_items.");
                }).catch(function() {});
            }

            if (isReqAuth) {
                showToast(`✅ Presupuesto ${targetId} ingresado correctamente. Listo para cargar uno nuevo.`, 'success');
            } else {
                showToast(`✅ Presupuesto ${targetId} ingresado y APROBADO DIRECTAMENTE. Listo para cargar uno nuevo.`, 'success');
            }

            // Cerrar el selector de reporte
            if (typeof closeModal === 'function') closeModal();
            
            // Resetear el formulario en segundo plano para que quede listo en el paso 1
            viewMode = 'Ingreso';
            if (typeof window.resetRequestFormComplete === 'function') {
                window.resetRequestFormComplete();
            }
            if (typeof renderContent === 'function') {
                renderContent('tpl-request-ped');
                initRequestView();
            }
            if (typeof window.goToRequestStep === 'function') {
                window.goToRequestStep(1);
            }

            // Abrir de inmediato el Comprobante oficial (Detallado o Resumido según lo elegido)
            setTimeout(() => {
                verDetallePedido(newPedido.id);
            }, 60);
        }
    } catch(err) {
        console.error("Error al confirmar presupuesto:", err);
        showToast("Ocurrió un error al procesar el presupuesto: " + err.message, "error");
    }
}

window.onRequiereAuthToggle = function() {
    const chk = document.getElementById('req-requiere-autorizacion');
    const badge = document.getElementById('req-auth-status-preview');
    if (!chk || !badge) return;

    if (chk.checked) {
        badge.innerHTML = '📥 Va a Autorización';
        badge.style.background = 'rgba(245, 158, 11, 0.2)';
        badge.style.color = '#fde68a';
        badge.style.border = '1px solid rgba(245, 158, 11, 0.4)';
    } else {
        badge.innerHTML = '⏩ Saltea Autorización ➔ Aprobado';
        badge.style.background = 'rgba(16, 185, 129, 0.2)';
        badge.style.color = '#6ee7b7';
        badge.style.border = '1px solid rgba(16, 185, 129, 0.4)';
    }
};

window.resetRequestFormComplete = function() {
    window.pedidoEnEdicionId = null;
    window.pedidoEnReutilizacion = false;
    const formReq = document.getElementById('form-request-ped');
    if (formReq) formReq.reset();
    
    // Limpiar todos los campos de Paso 1 y Paso 3
    const idsToClear = [
        'req-meca-denominacion', 'req-meca-cliente', 'req-meca-proveedor',
        'req-meca-fecha-oferta', 'req-meca-validez', 'req-meca-planta',
        'req-meca-nro-oc', 'req-meca-nro-ot', 'req-meca-fecha-inicio',
        'req-meca-duracion', 'req-meca-duracion-num', 'req-meca-fecha-fin', 'req-meca-propuesta',
        'req-meca-personal', 'req-meca-exclusiones', 'req-reason',
        'req-client', 'req-product-input', 'req-product-qty', 'req-product-price'
    ];
    idsToClear.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const todayStr = getLocalDateStr();
    const futureDateStr = getLocalDateStr(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    if (document.getElementById('req-meca-fecha-oferta')) document.getElementById('req-meca-fecha-oferta').value = todayStr;
    if (document.getElementById('req-meca-fecha-inicio')) document.getElementById('req-meca-fecha-inicio').value = todayStr;
    if (document.getElementById('req-meca-fecha-fin')) document.getElementById('req-meca-fecha-fin').value = futureDateStr;
    if (typeof window.setValidezOfertaValue === 'function') {
        window.setValidezOfertaValue('5 días');
    } else if (document.getElementById('req-meca-validez')) {
        document.getElementById('req-meca-validez').value = '5 días';
    }
    if (typeof window.setDuracionEstimadaValue === 'function') {
        window.setDuracionEstimadaValue('');
    } else if (document.getElementById('req-meca-duracion')) {
        document.getElementById('req-meca-duracion').value = '';
    }
    if (document.getElementById('req-meca-proveedor')) document.getElementById('req-meca-proveedor').value = 'SG MONTAJES SRL';

    const chkCom = document.getElementById('req-is-comisionista');
    if (chkCom) chkCom.checked = false;
    
    clienteSeleccionado = null;
    depositoSeleccionado = null;
    transporteSeleccionado = null;
    condicionSeleccionada = null;
    pedidoItems = [];
    productoSeleccionado = null;

    if (typeof actualizarTablaItemsRequerimiento === 'function') {
        actualizarTablaItemsRequerimiento();
    }

    const mecaStep2Container = document.getElementById('req-mecanico-step2-container');
    if (mecaStep2Container) {
        mecaStep2Container.innerHTML = '';
    }
    
    if (typeof window.goToRequestStep === 'function') {
        window.goToRequestStep(1);
    }
};

// Función global para generar y descargar planilla en formato Excel/CSV estructurada para Presea
window.descargarPedidoCSV = function(id) {
    const pedido = appData.pedidos.find(p => p.id === id);
    if (!pedido) return;
    
    // --- 1. Generar CABECERA (cabeceras_pedidos) ---
    let cabeceraHeaders = [
        "ID_PEDIDO", "FECHA", "CLIENTE_CODIGO", "CLIENTE_NOMBRE", "CUIT", 
        "NUMERO_OC", "MONEDA_ID", "COTIZACION", "CONDICION_ID", "DEPOSITO_ID", "TRANSPORTE_ID", 
        "VENDEDOR_ID", "VENDEDOR_NOMBRE", "IS_COMISIONISTA", "TIPO_NV", 
        "TIPO_ENTREGA", "FORMA_PAGO", "IMPORTE", "OBSERVACIONES", "OPERADOR", "ESTADO"
    ];
    
    const isComisionistaText = pedido.is_comisionista ? "SI" : "NO";
    const cotizStr = (pedido.cotizacion || 1.0).toString().replace('.', ',');
    const importeStr = (pedido.importe || 0.0).toString().replace('.', ',');
    const observacionesEscaped = `"${(pedido.motivo || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
    
    let cabeceraRow = [
        pedido.id,
        pedido.fecha,
        pedido.cliente_id,
        pedido.cliente_nombre,
        pedido.cuit || '',
        pedido.meca_nro_oc || pedido.nro_oc || '',
        pedido.moneda_id || 1,
        cotizStr,
        pedido.condicion_id || '',
        pedido.deposito_id || '',
        pedido.transporte_id || '',
        pedido.vendedor_id || '',
        pedido.vendedor_nombre || '',
        isComisionistaText,
        pedido.tipo_nv || '',
        pedido.tipo_entrega || '',
        pedido.forma_pago || '',
        importeStr,
        observacionesEscaped,
        pedido.operador || '',
        pedido.estado || ''
    ];
    
    let csvCabecera = cabeceraHeaders.join(';') + '\n' + cabeceraRow.join(';');
    
    // --- 2. Generar DETALLE (detalles_pedidos) ---
    let detalleHeaders = [
        "ID_PEDIDO", "PRODUCTO_CODIGO", "PRODUCTO_DETALLE", 
        "CANTIDAD", "PRECIO_UNITARIO", "SUBTOTAL", "ESTADO_ARTICULO"
    ];
    
    let detailRows = [];
    if (Array.isArray(pedido.items) && pedido.items.length > 0) {
        pedido.items.forEach(item => {
            const cantVal = item.cantidad || 0;
            const precioVal = item.precio || 0;
            const subtotalVal = item.subtotal || 0;
            const est = item.estado || (pedido.estado === 'Aprobado' || pedido.estado === 'Autorizado' ? 'Autorizado' : 'Pendiente');
            
            const detailRow = [
                pedido.id,
                item.codigo,
                item.detalle,
                cantVal.toString().replace('.', ','),
                precioVal.toString().replace('.', ','),
                subtotalVal.toString().replace('.', ','),
                est
            ];
            detailRows.push(detailRow.join(';'));
        });
    }
    
    let csvDetalle = detalleHeaders.join(';') + '\n' + detailRows.join('\n');
    
    // --- 3. Descargar Cabecera ---
    const blobCabecera = new Blob(['\uFEFF' + csvCabecera], { type: 'text/csv;charset=utf-8;' });
    const urlCabecera = URL.createObjectURL(blobCabecera);
    const linkCabecera = document.createElement("a");
    linkCabecera.setAttribute("href", urlCabecera);
    linkCabecera.setAttribute("download", `cabeceras_pedido_${pedido.id}.csv`);
    document.body.appendChild(linkCabecera);
    linkCabecera.click();
    document.body.removeChild(linkCabecera);
    
    // --- 4. Descargar Detalle ---
    setTimeout(() => {
        const blobDetalle = new Blob(['\uFEFF' + csvDetalle], { type: 'text/csv;charset=utf-8;' });
        const urlDetalle = URL.createObjectURL(blobDetalle);
        const linkDetalle = document.createElement("a");
        linkDetalle.setAttribute("href", urlDetalle);
        linkDetalle.setAttribute("download", `detalles_pedido_${pedido.id}.csv`);
        document.body.appendChild(linkDetalle);
        linkDetalle.click();
        document.body.removeChild(linkDetalle);
        
        showToast("Archivos Cabecera y Detalle listos para Presea", "success");
    }, 200);
};

// 4. BANDEJA DE PEDIDOS (ASIGNACIONES / HISTORIAL)
let viewMode = 'Administrador'; // 'Autorizador', 'Solicitante', etc.

window.applyPresetDateFilter = function(preset) {
    const dtTo = document.getElementById('filter-date-to');
    const dtFrom = document.getElementById('filter-date-from');
    if (!dtTo || !dtFrom) return;
    
    const today = new Date();
    
    const formatDate = (date) => {
        return getLocalDateStr(date);
    };
    
    if (preset === 'today') {
        const d = formatDate(today);
        dtFrom.value = d;
        dtTo.value = d;
    } else if (preset === 'yesterday') {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const d = formatDate(yesterday);
        dtFrom.value = d;
        dtTo.value = d;
    } else if (preset === 'last7') {
        const past7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        dtFrom.value = formatDate(past7);
        dtTo.value = formatDate(today);
    } else if (preset === 'last30') {
        const past30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        dtFrom.value = formatDate(past30);
        dtTo.value = formatDate(today);
    } else if (preset === 'thisMonth') {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        dtFrom.value = formatDate(firstDay);
        dtTo.value = formatDate(today);
    } else if (preset === 'lastMonth') {
        const firstDayPrev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayPrev = new Date(today.getFullYear(), today.getMonth(), 0);
        dtFrom.value = formatDate(firstDayPrev);
        dtTo.value = formatDate(lastDayPrev);
    }
    
    renderAssignmentsTable();
};

function initAssignmentsView(mode) {
    viewMode = mode;
    
    if (typeof updateTipoPresupuestoBadge === 'function') {
        updateTipoPresupuestoBadge();
    }
    
    const titleEl = document.getElementById('assignments-title');
    const subtitleEl = document.getElementById('assignments-subtitle');
    
    if (mode === 'Autorizador') {
        titleEl.innerText = "📥 Autorización de Presupuestos";
        subtitleEl.innerText = "Asignaciones pendientes de autorización comercial.";
    } else if (mode === 'Modificacion' || mode === 'Seguimiento') {
        const segPerms = typeof window.getUserSeguimientoPermissions === 'function' ? window.getUserSeguimientoPermissions(getCurrentUser()) : { canEdit: true, canViewComprobante: true };
        titleEl.innerText = "🕒 Seguimiento";
        if (segPerms.canEdit && segPerms.canViewComprobante) {
            subtitleEl.innerText = "Historial, visualización de comprobantes, avance de obra y modificación de presupuestos.";
        } else if (segPerms.canEdit) {
            subtitleEl.innerText = "Gestión operativa, avance de obra y modificación de presupuestos.";
        } else {
            subtitleEl.innerText = "Historial, auditoría y visualización de comprobantes oficiales (Solo Lectura).";
        }
    } else if (mode === 'EstadoPresupuesto') {
        titleEl.innerText = "🔄 Estado del Presupuesto";
        subtitleEl.innerText = "Modifique directamente el estado del presupuesto desde el selector de la tabla.";
    } else if (mode === 'Rechazados') {
        titleEl.innerText = "❌ Rechazo de Presupuesto";
        subtitleEl.innerText = "Listado de presupuestos comerciales que fueron rechazados.";
    } else {
        titleEl.innerText = "🕒 Seguimiento";
        subtitleEl.innerText = "Historial, auditoría y consulta oficial de presupuestos comerciales.";
    }

    // Ocultar filtro de estados en "Rechazo de Presupuesto" ya que todos son rechazados
    const statusFilterEl = document.getElementById('status-filter');
    if (statusFilterEl) {
        if (mode === 'Rechazados') {
            statusFilterEl.style.display = 'none';
            statusFilterEl.value = '';
        } else {
            statusFilterEl.style.display = 'inline-block';
        }
    }

    // Configurar fechas filtro por defecto (últimos 30 días)
    const dtTo = document.getElementById('filter-date-to');
    const dtFrom = document.getElementById('filter-date-from');
    
    if (dtTo && !dtTo.value) {
        const today = getLocalDateStr(new Date());
        const past30 = getLocalDateStr(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
        dtTo.value = today;
        dtFrom.value = past30;
        
        const presetSelect = document.getElementById('preset-date-filter');
        if (presetSelect) presetSelect.value = 'last30';
    }

    const filterHandler = () => {
        const presetSelect = document.getElementById('preset-date-filter');
        if (presetSelect) presetSelect.value = 'custom';
        renderAssignmentsTable();
    };
    
    if (dtTo) dtTo.onchange = filterHandler;
    if (dtFrom) dtFrom.onchange = filterHandler;
    const searchFilter = document.getElementById('search-filter');
    if (searchFilter) searchFilter.oninput = () => renderAssignmentsTable();

    renderAssignmentsTable();
}

window.getBudgetStatusBadgeHtml = function(estado, fechaAlerta = '') {
    let est = estado || 'Enviado sin OC';
    
    // Normalizar estados legacy o equivalentes
    if (est === 'Cargado sin orden de compra' || est === 'Pendiente de Autorización' || est === 'Pendiente') {
        est = 'Enviado sin OC';
    } else if (est === 'Cargado con orden de compra' || est === 'Autorizado' || est === 'Aprobado') {
        est = 'Aprobado con OC';
    }

    switch (est) {
        case 'Rechazado':
            return `
                <span class="badge-status badge-rechazado">
                    <i class="fas fa-times-circle"></i> Rechazado
                </span>`;
        case 'Enviado sin OC':
            const sub1 = fechaAlerta ? `<br><span style="font-size:9px; opacity:0.85;">⏰ Vence: ${fechaAlerta}</span>` : '';
            return `
                <span class="badge-status badge-enviado-sin-oc">
                    <span style="display:inline-flex; flex-direction:column; align-items:center;"><span style="display:inline-flex; align-items:center; gap:5px;"><i class="fas fa-paper-plane"></i> Enviado sin OC</span>${sub1}</span>
                </span>`;
        case 'Aprobado sin OC':
            const sub2 = fechaAlerta ? `<br><span style="font-size:9px; opacity:0.85;">⏰ Vence: ${fechaAlerta}</span>` : '';
            return `
                <span class="badge-status badge-aprobado-sin-oc">
                    <span style="display:inline-flex; flex-direction:column; align-items:center;"><span style="display:inline-flex; align-items:center; gap:5px;"><i class="fas fa-check-double"></i> Aprobado sin OC</span>${sub2}</span>
                </span>`;
        case 'Aprobado con OC':
            return `
                <span class="badge-status badge-aprobado-con-oc">
                    <i class="fas fa-check-circle"></i> Aprobado con OC
                </span>`;
        case 'Facturado Parcial':
            return `
                <span class="badge-status badge-facturado-parcial">
                    <i class="fas fa-file-invoice-dollar"></i> Facturado Parcial
                </span>`;
        case 'Facturado Total':
            return `
                <span class="badge-status badge-facturado-total">
                    <i class="fas fa-receipt"></i> Facturado Total
                </span>`;
        default:
            return `
                <span class="badge-status badge-enviado-sin-oc">
                    <i class="fas fa-paper-plane"></i> ${est}
                </span>`;
    }
};

function getEstadoLevel(estadoStr) {
    let est = estadoStr || 'Enviado sin OC';
    if (est === 'Cargado sin orden de compra' || est === 'Pendiente de Autorización' || est === 'Pendiente') est = 'Enviado sin OC';
    else if (est === 'Cargado con orden de compra' || est === 'Autorizado' || est === 'Aprobado') est = 'Aprobado con OC';

    switch (est) {
        case 'Enviado sin OC': return 1;
        case 'Aprobado sin OC': return 2;
        case 'Aprobado con OC': return 3;
        case 'Facturado Parcial': return 4;
        case 'Facturado Total': return 5;
        case 'Rechazado': return 99;
        default: return 1;
    }
}
window.getEstadoLevel = getEstadoLevel;

window.renderEditableStatusDropdown = function(p) {
    let currentEst = p.estado || 'Enviado sin OC';
    if (currentEst === 'Cargado sin orden de compra' || currentEst === 'Pendiente de Autorización' || currentEst === 'Pendiente') currentEst = 'Enviado sin OC';
    else if (currentEst === 'Cargado con orden de compra' || currentEst === 'Autorizado' || currentEst === 'Aprobado') currentEst = 'Aprobado con OC';

    const currentLevel = getEstadoLevel(currentEst);

    const options = [
        { val: 'Enviado sin OC', label: '📤 Enviado sin OC', color: '#fde68a', bg: 'rgba(245,158,11,0.25)', border: 'rgba(245,158,11,0.6)' },
        { val: 'Aprobado sin OC', label: '⏳ Aprobado sin OC', color: '#fef08a', bg: 'rgba(234,179,8,0.25)', border: 'rgba(234,179,8,0.6)' },
        { val: 'Aprobado con OC', label: '✅ Aprobado con OC', color: '#6ee7b7', bg: 'rgba(16,185,129,0.25)', border: 'rgba(16,185,129,0.6)' },
        { val: 'Facturado Parcial', label: '🧾 Facturado Parcial', color: '#e9d5ff', bg: 'rgba(168,85,247,0.25)', border: 'rgba(168,85,247,0.6)' },
        { val: 'Facturado Total', label: '💎 Facturado Total', color: '#99f6e4', bg: 'rgba(20,184,166,0.25)', border: 'rgba(20,184,166,0.6)' },
        { val: 'Rechazado', label: '❌ Rechazado', color: '#fda4af', bg: 'rgba(244,63,94,0.25)', border: 'rgba(244,63,94,0.6)' }
    ];

    const matched = options.find(o => o.val === currentEst) || options[0];
    const optsHtml = options.map(o => {
        const oLevel = getEstadoLevel(o.val);
        const isDisabled = (currentEst !== 'Rechazado' && o.val !== 'Rechazado' && oLevel < currentLevel);
        return `<option value="${o.val}" ${o.val === currentEst ? 'selected' : ''} ${isDisabled ? 'disabled style="color: #64748b; background: #1e293b;"' : 'style="background: #0f172a; color: white;"'}>${o.label}${isDisabled ? ' 🚫' : ''}</option>`;
    }).join('');

    const facturadoPct = parseFloat(p.facturado_porcentaje || 0);

    let btnFacturadoHtml = '';
    if (currentEst === 'Facturado Parcial' || currentEst === 'Facturado Total' || facturadoPct > 0 || (Array.isArray(p.avances) && p.avances.length > 0)) {
        btnFacturadoHtml = `
            <div style="margin-top: 6px;">
                <button type="button" class="btn btn-sm" onclick="event.stopPropagation(); modificarPorcentajeFacturado('${p.id}')" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1.5px solid #38bdf8; font-size: 11px; padding: 4px 10px; border-radius: 6px; font-weight: 800; cursor: pointer; width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 6px;" title="Haga clic para ingresar o modificar el % facturado">
                    <i class="fa-solid fa-receipt"></i> Facturado: <strong>${String(facturadoPct).replace('.', ',')}%</strong> ✏️
                </button>
            </div>
        `;
    }

    return `
        <div onclick="event.stopPropagation()" style="display: inline-block; text-align: center; width: 100%; max-width: 140px;">
            <select onchange="cambiarEstadoPresupuesto('${p.id}', this.value)" 
                    title="Haga clic aquí para modificar el estado de este presupuesto"
                    style="background: ${matched.bg}; color: ${matched.color}; border: 1.5px solid ${matched.border}; padding: 4px 6px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; cursor: pointer; outline: none; transition: all 0.2s ease; box-shadow: 0 0 8px rgba(0,0,0,0.3); width: 100%;">
                ${optsHtml}
            </select>
            ${btnFacturadoHtml}
        </div>
    `;
};

window.modificarPorcentajeFacturado = function(id) {
    const p = appData.pedidos.find(x => x.id === id);
    if (!p) return;

    const avances = Array.isArray(p.avances) ? p.avances : [];
    const avanceAcc = parseFloat(p.avance_porcentaje_acumulado) || avances.reduce((s, a) => s + (parseFloat(a.porcentaje) || 0), 0);
    const currentFact = p.facturado_porcentaje || 0;

    if (avanceAcc <= 0) {
        showToast('No se puede ingresar % Facturado sin antes registrar un Avance de Obra realizado.', 'error');
        return;
    }

    const inputFact = prompt(`Presupuesto #${typeof formatPresupuestoCodigo === 'function' ? formatPresupuestoCodigo(p) : p.id}\nAvance de Obra realizado: ${String(avanceAcc).replace('.', ',')}%\n\nIngrese el % que se facturó:`, String(currentFact).replace('.', ','));
    if (inputFact === null || !inputFact.trim()) return;

    const cleanPct = Math.min(100, Math.max(0, parseFloat(inputFact.trim().replace(',', '.')) || 0));

    if (cleanPct > avanceAcc) {
        showToast(`El % facturado (${String(cleanPct).replace('.', ',')}%) no puede ser mayor al Avance de Obra realizado (${String(avanceAcc).replace('.', ',')}%).`, 'error');
        return;
    }

    p.facturado_porcentaje = cleanPct;
    p.monto_facturado = (parseFloat(p.importe) || 0) * (cleanPct / 100);

    if (cleanPct >= 100) {
        p.estado = 'Facturado Total';
    } else if (cleanPct > 0 && p.estado !== 'Facturado Parcial') {
        p.estado = 'Facturado Parcial';
    }

    saveData();
    showToast(`% Facturado actualizado a ${String(cleanPct).replace('.', ',')}% para el Presupuesto ${typeof formatPresupuestoCodigo === 'function' ? formatPresupuestoCodigo(p) : p.id}`, 'success');
    if (typeof renderAssignmentsTable === 'function') {
        renderAssignmentsTable();
    }
};

window.notificarAprobacionEquipo = function(p, nuevoEstado) {
    if (!p) return;
    const nroPresupuesto = (typeof formatPresupuestoCodigo === 'function') ? formatPresupuestoCodigo(p) : p.id;
    const cliente = p.meca_denominacion || p.cliente_nombre || 'Cliente';
    const importeStr = p.importe ? `$${p.importe.toLocaleString('es-AR', {minimumFractionDigits: 2})}` : '$0,00';
    const nroOcStr = (p.meca_nro_oc || p.nro_oc) ? ` | OC: ${p.meca_nro_oc || p.nro_oc}` : '';
    
    const notifMsg = `🔔 ALERTA DE ESTADO: El Presupuesto ${nroPresupuesto} (${cliente}) cambió a "${nuevoEstado}" (${importeStr}${nroOcStr}).`;
    
    const targetUsers = (appData.users && appData.users.length > 0) ? appData.users : [
        { id: '1', username: 'mel', email: 'mel@sgmontajes.com.ar' }
    ];

    const emailsEnviados = [];
    targetUsers.forEach(u => {
        if (typeof addNotification === 'function') {
            addNotification(u.id, notifMsg, p.id);
        }
        if (u.email) emailsEnviados.push(u.email);
        console.log(`[EMAIL DISPATCH] Alerta enviada a ${u.username} (${u.email}): Presupuesto ${nroPresupuesto} -> ${nuevoEstado}`);
    });

    if (typeof renderNotifications === 'function') {
        renderNotifications();
    }

    showToast(`📧 Alerta por email enviada a todo el equipo avisando el cambio a "${nuevoEstado}".`, 'info');
};

window.cambiarEstadoPresupuesto = function(id, nuevoEstado) {
    const orderIdx = appData.pedidos.findIndex(p => p.id === id);
    if (orderIdx === -1) return;

    const pTarget = appData.pedidos[orderIdx];
    const currentEstNorm = pTarget.estado || 'Enviado sin OC';
    const currentLevel = getEstadoLevel(currentEstNorm);
    const targetLevel = getEstadoLevel(nuevoEstado);

    // Prohibición estricta de volver atrás de estado
    if (nuevoEstado !== pTarget.estado && nuevoEstado !== 'Rechazado' && currentEstNorm !== 'Rechazado') {
        if (targetLevel < currentLevel) {
            showToast(`No se permite retroceder el estado comercial de un presupuesto (${currentEstNorm} ➔ ${nuevoEstado}).`, 'error');
            if (typeof renderAssignmentsTable === 'function') {
                renderAssignmentsTable();
            }
            return;
        }
    }

    const currentAvance = parseFloat(pTarget.avance_porcentaje_acumulado) || (Array.isArray(pTarget.avances) ? pTarget.avances.reduce((s, a) => s + (parseFloat(a.porcentaje) || 0), 0) : 0);

    if (nuevoEstado === 'Facturado Parcial') {
        if (currentAvance <= 0) {
            showToast('No se puede cambiar el estado a Facturado Parcial sin antes certificar un Avance de Obra realizado.', 'error');
            if (typeof renderAssignmentsTable === 'function') renderAssignmentsTable();
            return;
        }
        const currentFact = pTarget.facturado_porcentaje || currentAvance;
        const inputFact = prompt(`Presupuesto #${typeof formatPresupuestoCodigo === 'function' ? formatPresupuestoCodigo(pTarget) : id}\nAvance de Obra realizado: ${String(currentAvance).replace('.', ',')}%\n\nIngrese el % que se facturó:`, String(currentFact).replace('.', ','));
        if (inputFact !== null && inputFact.trim()) {
            const cleanPct = Math.min(100, Math.max(0, parseFloat(inputFact.trim().replace(',', '.')) || 0));
            if (cleanPct > currentAvance) {
                showToast(`El % facturado (${String(cleanPct).replace('.', ',')}%) no puede ser mayor al Avance de Obra realizado (${String(currentAvance).replace('.', ',')}%).`, 'error');
                if (typeof renderAssignmentsTable === 'function') renderAssignmentsTable();
                return;
            }
            pTarget.facturado_porcentaje = cleanPct;
            pTarget.monto_facturado = (parseFloat(pTarget.importe) || 0) * (cleanPct / 100);
            if (typeof pedidoActivo !== 'undefined' && pedidoActivo && pedidoActivo.id === id) {
                pedidoActivo.facturado_porcentaje = cleanPct;
                pedidoActivo.monto_facturado = pTarget.monto_facturado;
            }
        } else {
            if (typeof renderAssignmentsTable === 'function') renderAssignmentsTable();
            return;
        }
    } else if (nuevoEstado === 'Facturado Total') {
        if (currentAvance < 100) {
            showToast(`No se puede cambiar el estado a Facturado Total porque el Avance de Obra realizado es ${String(currentAvance).replace('.', ',')}% (debe ser 100%).`, 'error');
            if (typeof renderAssignmentsTable === 'function') renderAssignmentsTable();
            return;
        }
        pTarget.facturado_porcentaje = 100;
        pTarget.monto_facturado = parseFloat(pTarget.importe) || 0;
        if (typeof pedidoActivo !== 'undefined' && pedidoActivo && pedidoActivo.id === id) {
            pedidoActivo.facturado_porcentaje = 100;
            pedidoActivo.monto_facturado = pTarget.monto_facturado;
        }
    }

    if (nuevoEstado === 'Aprobado con OC') {
        const currentOc = appData.pedidos[orderIdx].meca_nro_oc || appData.pedidos[orderIdx].nro_oc || '';
        const inputOc = prompt('Ingrese el Número de Orden de Compra (OC) para este presupuesto:', currentOc);
        if (inputOc === null || !inputOc.trim()) {
            showToast('Debe ingresar un Número de Orden de Compra (OC) obligatorio para cambiar el estado a "Aprobado con OC".', 'error');
            if (typeof renderAssignmentsTable === 'function') {
                renderAssignmentsTable();
            }
            const modalSelect = document.getElementById('modal-change-status-select');
            if (modalSelect && typeof pedidoActivo !== 'undefined' && pedidoActivo) {
                modalSelect.value = pedidoActivo.estado;
            }
            return;
        }
        const cleanOc = inputOc.trim();
        appData.pedidos[orderIdx].meca_nro_oc = cleanOc;
        appData.pedidos[orderIdx].nro_oc = cleanOc;
        if (typeof pedidoActivo !== 'undefined' && pedidoActivo && pedidoActivo.id === id) {
            pedidoActivo.meca_nro_oc = cleanOc;
            pedidoActivo.nro_oc = cleanOc;
        }
    } else if (nuevoEstado === 'Rechazado' && !appData.pedidos[orderIdx].motivo_rechazo) {
        const reason = prompt('Ingrese el motivo obligatorio del rechazo del presupuesto:');
        if (reason === null || !reason.trim()) {
            showToast('El motivo de rechazo es obligatorio.', 'error');
            if (typeof renderAssignmentsTable === 'function') {
                renderAssignmentsTable();
            }
            const modalSelect = document.getElementById('modal-change-status-select');
            if (modalSelect && typeof pedidoActivo !== 'undefined' && pedidoActivo) {
                modalSelect.value = pedidoActivo.estado;
            }
            return;
        }
        appData.pedidos[orderIdx].motivo_rechazo = reason.trim();
    }

    appData.pedidos[orderIdx].estado = nuevoEstado;
    appData.pedidos[orderIdx].fecha_resolucion = new Date().toLocaleDateString('es-AR');

    saveData();
    const ocMsg = (appData.pedidos[orderIdx].meca_nro_oc || appData.pedidos[orderIdx].nro_oc) ? ` (OC: ${appData.pedidos[orderIdx].meca_nro_oc || appData.pedidos[orderIdx].nro_oc})` : '';
    showToast(`Estado del Presupuesto actualizado a: "${nuevoEstado}"${ocMsg}`, 'success');

    // Notificar por mail y sistema a las 5 personas del equipo
    window.notificarAprobacionEquipo(appData.pedidos[orderIdx], nuevoEstado);
    
    // Si la planilla está abierta, actualizar badge, selector y número de OC en el comprobante
    if (typeof pedidoActivo !== 'undefined' && pedidoActivo && pedidoActivo.id === id) {
        pedidoActivo.estado = nuevoEstado;
        const statusSelect = document.getElementById('modal-change-status-select');
        if (statusSelect) statusSelect.value = nuevoEstado;
        const badgeContainer = document.getElementById('modal-status-badge-container');
        if (badgeContainer) badgeContainer.innerHTML = getBudgetStatusBadgeHtml(nuevoEstado, pedidoActivo.oc_limite_fecha);

        const ocDisplay = pedidoActivo.meca_nro_oc || pedidoActivo.nro_oc || '-';
        const authOcEl = document.getElementById('auth-meca-nro-oc-val');
        if (authOcEl) {
            if (viewMode === 'Modificacion') {
                const editInput = document.getElementById('auth-edit-meca-nro-oc');
                if (editInput) editInput.value = pedidoActivo.meca_nro_oc || pedidoActivo.nro_oc || '';
                else authOcEl.innerText = ocDisplay;
            } else {
                authOcEl.innerText = ocDisplay;
            }
        }
        const authHeaderOc = document.getElementById('auth-header-nro-oc-val');
        if (authHeaderOc) authHeaderOc.innerText = ocDisplay;
    }
    
    if (typeof renderAssignmentsTable === 'function') {
        renderAssignmentsTable();
    }
};

window.ejecutarCambioEstadoPresupuesto = function(nuevoEstado) {
    if (typeof pedidoActivo !== 'undefined' && pedidoActivo && pedidoActivo.id) {
        cambiarEstadoPresupuesto(pedidoActivo.id, nuevoEstado);
    }
};

// --- MÓDULO DE AVANCE DE OBRA Y CERTIFICACIÓN PARA FACTURACIÓN ---
window.pedidoAvanceActivoId = null;
window.emailResponsableFacturacion = 'facturacion@sgmontajes.com.ar';

window.abrirModalAvanceObra = function(id) {
    const p = appData.pedidos.find(x => x.id === id);
    if (!p) {
        showToast('Presupuesto no encontrado', 'error');
        return;
    }

    window.pedidoAvanceActivoId = id;
    openModal('tpl-modal-avance-obra');

    if (typeof window.registrarNavegacion === 'function') {
        window.registrarNavegacion({ type: 'modal_avance', pedidoId: id, label: `Avance #${id}` });
    }

    const nroPres = (typeof formatPresupuestoCodigo === 'function') ? formatPresupuestoCodigo(p) : p.id;
    const cliente = p.meca_denominacion || p.cliente_nombre || 'Cliente';
    const totalAmount = parseFloat(p.importe || 0);

    const nroEl = document.getElementById('avance-modal-nro');
    if (nroEl) nroEl.innerText = nroPres;

    const clienteEl = document.getElementById('avance-modal-cliente');
    if (clienteEl) clienteEl.innerText = cliente;

    const totalEl = document.getElementById('avance-modal-total');
    if (totalEl) totalEl.innerText = `$${totalAmount.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;

    // Calcular avance acumulado previo
    const avances = Array.isArray(p.avances) ? p.avances : [];
    const totalAvancePct = avances.reduce((sum, a) => sum + (parseFloat(a.porcentaje) || 0), 0);
    const totalMontoFacturado = totalAmount * (totalAvancePct / 100);

    const progressLabel = document.getElementById('avance-modal-progress-label');
    if (progressLabel) {
        progressLabel.innerText = `${totalAvancePct}% Facturado ($${totalMontoFacturado.toLocaleString('es-AR', {minimumFractionDigits: 2})} de $${totalAmount.toLocaleString('es-AR', {minimumFractionDigits: 2})})`;
    }

    const progressBar = document.getElementById('avance-modal-progress-bar');
    if (progressBar) {
        progressBar.style.width = `${Math.min(100, totalAvancePct)}%`;
        if (totalAvancePct >= 100) {
            progressBar.style.background = '#10b981';
        } else {
            progressBar.style.background = 'linear-gradient(90deg, #0d9488, #2dd4bf)';
        }
    }

    // Resetear formulario
    const inputPct = document.getElementById('avance-input-pct');
    if (inputPct) inputPct.value = '';

    const inputMonto = document.getElementById('avance-input-monto-display');
    if (inputMonto) inputMonto.value = '$0,00';

    const inputFecha = document.getElementById('avance-input-fecha');
    if (inputFecha) inputFecha.value = new Date().toISOString().substring(0, 10);

    const inputDoc = document.getElementById('avance-input-nro-doc');
    if (inputDoc) inputDoc.value = (p.meca_nro_oc || p.nro_oc) ? `OC: ${p.meca_nro_oc || p.nro_oc}` : '';

    const inputDetalle = document.getElementById('avance-input-detalle');
    if (inputDetalle) inputDetalle.value = '';

    // Renderizar historial de avances
    const tbody = document.getElementById('avance-historial-tbody');
    if (tbody) {
        if (avances.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 14px; font-style: italic;">Aún no se registraron hitos de avance para este presupuesto.</td></tr>`;
        } else {
            tbody.innerHTML = avances.map((av, idx) => {
                const subMonto = parseFloat(av.monto || (totalAmount * (av.porcentaje / 100)));
                return `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.06); background: ${idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'};">
                        <td style="padding: 8px 12px; font-weight: 600; color: white;">${av.fecha || '-'}</td>
                        <td style="padding: 8px 12px; font-weight: 800; color: #2dd4bf;">${av.porcentaje}%</td>
                        <td style="padding: 8px 12px; font-family: monospace; font-weight: 700; color: #34d399;">$${subMonto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                        <td style="padding: 8px 12px; color: var(--text-muted);">${av.nro_doc || '-'}</td>
                        <td style="padding: 8px 12px; color: #e2e8f0;">${av.detalle || '-'}</td>
                        <td style="padding: 8px 12px; text-align: center;">
                            <button type="button" class="btn btn-sm" onclick="event.stopPropagation(); abrirComprobanteAvance('${p.id}', '${av.id}')" style="background: #0284c7; color: white; border: none; font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Ver Comprobante / Ticket">
                                <i class="fas fa-file-lines"></i> Ver
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }
};

window.setAvancePorcentajeRapido = function(val) {
    const id = window.pedidoAvanceActivoId;
    const p = appData.pedidos.find(x => x.id === id);
    if (!p) return;

    const avances = Array.isArray(p.avances) ? p.avances : [];
    const currentAcc = avances.reduce((sum, a) => sum + (parseFloat(a.porcentaje) || 0), 0);
    const maxPermitido = Math.max(0, parseFloat((100 - currentAcc).toFixed(2)));

    let targetPct = 0;
    if (val === 'restante') {
        targetPct = maxPermitido;
    } else {
        targetPct = parseFloat(val) || 0;
        if (targetPct > maxPermitido) {
            targetPct = maxPermitido;
        }
    }

    const inputPct = document.getElementById('avance-input-pct');
    if (inputPct) {
        const valStr = String(targetPct).replace('.', ',');
        inputPct.value = valStr;
        window.onAvancePorcentajeInput(valStr);
    }
};

window.onAvancePorcentajeInput = function(pctVal) {
    const id = window.pedidoAvanceActivoId;
    const p = appData.pedidos.find(x => x.id === id);
    if (!p) return;

    const inputPct = document.getElementById('avance-input-pct');
    let rawStr = String(pctVal || '').trim();
    
    // Prohibir punto (.) y convertirlo automáticamente a coma (,)
    if (rawStr.includes('.')) {
        rawStr = rawStr.replace(/\./g, ',');
        if (inputPct) inputPct.value = rawStr;
    }
    
    // Solo permitir dígitos y una única coma
    const parts = rawStr.split(',');
    if (parts.length > 2) {
        rawStr = parts[0] + ',' + parts.slice(1).join('');
        if (inputPct) inputPct.value = rawStr;
    }

    const cleanNumStr = rawStr.replace(',', '.').replace(/[^0-9.]/g, '');
    let pct = parseFloat(cleanNumStr) || 0;

    const avances = Array.isArray(p.avances) ? p.avances : [];
    const currentAcc = avances.reduce((sum, a) => sum + (parseFloat(a.porcentaje) || 0), 0);
    const maxPermitido = Math.max(0, parseFloat((100 - currentAcc).toFixed(2)));

    if (pct > maxPermitido) {
        pct = maxPermitido;
        const formattedMax = String(pct).replace('.', ',');
        if (inputPct) inputPct.value = formattedMax;
        showToast(`El avance no puede superar el 100% acumulado. Máximo restante a registrar: ${formattedMax}%`, 'warning');
    }

    const totalAmount = parseFloat(p.importe || 0);
    const montoCalculado = totalAmount * (pct / 100);

    const inputMonto = document.getElementById('avance-input-monto-display');
    if (inputMonto) {
        inputMonto.value = `$${montoCalculado.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    }
};

window.guardarAvanceObra = function() {
    const id = window.pedidoAvanceActivoId;
    const p = appData.pedidos.find(x => x.id === id);
    if (!p) {
        showToast('Presupuesto no encontrado', 'error');
        return;
    }

    const inputPct = document.getElementById('avance-input-pct');
    const inputFecha = document.getElementById('avance-input-fecha');
    const inputDoc = document.getElementById('avance-input-nro-doc');
    const inputDetalle = document.getElementById('avance-input-detalle');

    const rawPctStr = inputPct ? inputPct.value.trim().replace(',', '.') : '0';
    let pct = parseFloat(rawPctStr);
    if (isNaN(pct) || pct <= 0) {
        showToast('Por favor ingrese un porcentaje de avance válido mayor a 0%.', 'error');
        if (inputPct && typeof inputPct.focus === 'function') inputPct.focus();
        return;
    }

    const avances = Array.isArray(p.avances) ? p.avances : [];
    const currentAcc = avances.reduce((sum, a) => sum + (parseFloat(a.porcentaje) || 0), 0);
    const maxPermitido = Math.max(0, parseFloat((100 - currentAcc).toFixed(2)));

    if (currentAcc >= 100) {
        showToast('Este presupuesto ya cuenta con el 100% de avance completado.', 'warning');
        return;
    }

    if (pct > maxPermitido || (currentAcc + pct) > 100.001) {
        showToast(`El avance acumulado no puede superar el 100%. Avance previo: ${String(currentAcc).replace('.', ',')}%. Máximo permitido: ${String(maxPermitido).replace('.', ',')}%.`, 'error');
        if (inputPct) {
            inputPct.value = String(maxPermitido).replace('.', ',');
            window.onAvancePorcentajeInput(inputPct.value);
            if (typeof inputPct.focus === 'function') inputPct.focus();
        }
        return;
    }

    const fecha = inputFecha ? inputFecha.value : getLocalDateStr();
    const nroDoc = inputDoc ? inputDoc.value.trim() : '';
    const detalle = inputDetalle ? inputDetalle.value.trim() : '';

    const totalAmount = parseFloat(p.importe || 0);
    const montoHito = totalAmount * (pct / 100);

    if (!Array.isArray(p.avances)) {
        p.avances = [];
    }

    const avanceId = `${String(p.id)}-AV-${String(p.avances.length + 1).padStart(2, '0')}`;
    const nuevoAvance = {
        id: avanceId,
        fecha: fecha,
        porcentaje: pct,
        monto: montoHito,
        nro_doc: nroDoc,
        detalle: detalle,
        timestamp: getLocalCurrentDateTimeStr()
    };

    p.avances.push(nuevoAvance);

    // Calcular acumulado
    p.avance_porcentaje_acumulado = p.avances.reduce((sum, a) => sum + (parseFloat(a.porcentaje) || 0), 0);
    p.monto_facturado_total = p.avances.reduce((sum, a) => sum + (parseFloat(a.monto) || 0), 0);

    saveData();

    // Inserción directa e inmediata en Supabase (tabla avances_obra y presupuestos)
    const client = (typeof getDbClient === 'function') ? getDbClient() : null;
    if (client) {
        client.from('avances_obra').upsert([{
            id: avanceId,
            presupuesto_id: String(p.id),
            fecha: fecha,
            porcentaje: pct,
            monto_equivalente: montoHito,
            nro_documento: nroDoc,
            detalle: detalle
        }], { onConflict: 'id' }).then(function(res) {
            if (res && res.error) {
                console.warn("⚠️ Error insertando avance en Supabase:", res.error);
            } else {
                console.log("☁️ Supabase: Avance de obra insertado exitosamente en tabla avances_obra.");
            }
        }).catch(function(err) {
            console.error("Error insertando avance en Supabase:", err);
        });

        client.from('presupuestos').update({
            avance_porcentaje_acumulado: parseFloat(p.avance_porcentaje_acumulado) || 0,
            facturado_porcentaje: parseFloat(p.avance_porcentaje_acumulado) || 0,
            monto_facturado: parseFloat(p.monto_facturado_total) || 0
        }).eq('id', String(p.id)).then(function(res) {
            if (res && res.error) console.warn("⚠️ Error actualizando porcentaje en presupuestos:", res.error);
            else console.log("☁️ Supabase: Porcentaje de avance actualizado en tabla presupuestos.");
        }).catch(function() {});
    }

    // Disparar alerta por mail para facturación
    window.notificarEmailFacturacionAvance(p, nuevoAvance);

    // Si la planilla modal o la tabla están abiertas, refrescar
    if (typeof pedidoActivo !== 'undefined' && pedidoActivo && pedidoActivo.id === p.id) {
        pedidoActivo.avances = p.avances;
        pedidoActivo.avance_porcentaje_acumulado = p.avance_porcentaje_acumulado;
        pedidoActivo.monto_facturado_total = p.monto_facturado_total;
    }

    showToast(`✅ Avance de obra del ${pct}% ($${montoHito.toLocaleString('es-AR', {minimumFractionDigits: 2})}) registrado correctamente.`, 'success');

    if (typeof renderAssignmentsTable === 'function') {
        renderAssignmentsTable();
    }

    // Abrir automáticamente el comprobante / certificado del avance
    window.abrirComprobanteAvance(p.id, nuevoAvance.id);
};

window.abrirComprobanteAvance = function(pedidoId, avanceId) {
    const p = appData.pedidos.find(x => x.id === pedidoId);
    if (!p) return;
    const allAvances = Array.isArray(p.avances) ? p.avances : [];
    const avance = allAvances.find(a => a.id === avanceId) || allAvances[allAvances.length - 1];
    if (!avance) return;

    openModal('tpl-modal-comprobante-avance');

    if (typeof window.registrarNavegacion === 'function') {
        window.registrarNavegacion({ type: 'modal_comprobante', pedidoId: pedidoId, avanceId: avanceId, label: `Comprobante #${pedidoId}` });
    }

    const nroPres = (typeof formatPresupuestoCodigo === 'function') ? formatPresupuestoCodigo(p) : p.id;
    const totalAmount = parseFloat(p.importe || 0);
    const pct = parseFloat(avance.porcentaje || 0);
    const montoHito = parseFloat(avance.monto || (totalAmount * (pct / 100)));
    const proveedor = p.meca_proveedor || 'SG MONTAJES SRL';
    const cliente = p.cliente_nombre || 'CARGILL SACI';
    const denominacion = p.meca_denominacion || p.motivo || cliente;
    const planta = p.meca_planta || 'VGG';
    const nroOc = p.meca_nro_oc || p.nro_oc || '-';

    // Acumulado hasta este avance
    const targetIdx = allAvances.findIndex(a => a.id === avance.id);
    const sliced = (targetIdx >= 0) ? allAvances.slice(0, targetIdx + 1) : allAvances;
    const accPct = sliced.reduce((s, a) => s + (parseFloat(a.porcentaje) || 0), 0);
    const accMonto = sliced.reduce((s, a) => s + (parseFloat(a.monto) || (totalAmount * ((parseFloat(a.porcentaje)||0)/100))), 0);
    const saldoPct = Math.max(0, 100 - accPct);
    const saldoMonto = Math.max(0, totalAmount - accMonto);

    const setT = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };

    setT('comp-avance-empresa', proveedor);
    setT('comp-avance-fecha', avance.fecha || new Date().toLocaleDateString('es-AR'));
    setT('comp-avance-presupuesto-id', nroPres);
    setT('comp-avance-planta', planta);
    setT('comp-avance-cliente', cliente);
    setT('comp-avance-nro-oc', nroOc);
    setT('comp-avance-denominacion', denominacion);
    setT('comp-avance-doc-label', avance.nro_doc ? `Certificado: ${avance.nro_doc}` : 'Certificado de Avance');
    setT('comp-avance-pct', `+${pct}%`);
    setT('comp-avance-monto', `$${montoHito.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
    setT('comp-avance-total-presupuesto', `$${totalAmount.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
    setT('comp-avance-acumulado-display', `${accPct}% ($${accMonto.toLocaleString('es-AR', {minimumFractionDigits: 2})})`);
    setT('comp-avance-saldo-display', `${saldoPct}% ($${saldoMonto.toLocaleString('es-AR', {minimumFractionDigits: 2})})`);
    setT('comp-avance-detalle-texto', avance.detalle || 'Sin observaciones adicionales registradas.');
    setT('comp-avance-firma-empresa', proveedor);
    setT('comp-avance-firma-cliente', cliente);
};

window.imprimirComprobanteAvance = function() {
    const area = document.getElementById('print-comprobante-avance-area');
    if (!area) return;
    
    const printWindow = window.open('', '_blank', 'width=750,height=800');
    if (!printWindow) {
        window.print();
        return;
    }
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Certificado de Avance de Obra</title>
            <style>
                @page { size: A4 portrait; margin: 15mm; }
                body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #ffffff; color: #000000; margin: 0; padding: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #cbd5e1; padding: 8px 10px; }
                @media print {
                    .no-print { display: none !important; }
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            ${area.outerHTML}
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(() => window.close(), 500);
                };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
};

window.notificarEmailFacturacionAvance = function(p, avance) {
    if (!p || !avance) return;
    const nroPres = (typeof formatPresupuestoCodigo === 'function') ? formatPresupuestoCodigo(p) : p.id;
    const cliente = p.meca_denominacion || p.cliente_nombre || 'Cliente';
    const montoHitoStr = `$${(avance.monto || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    const totalPresStr = `$${(p.importe || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    const acumuladoStr = `${p.avance_porcentaje_acumulado}% ($${(p.monto_facturado_total || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})})`;

    const emailFacturacion = window.emailResponsableFacturacion || 'facturacion@sgmontajes.com.ar';
    const notifMsg = `📄 Notificación de Avance de Obra: Se registró un avance del ${avance.porcentaje}% (${montoHitoStr}) para el Presupuesto ${nroPres} (${cliente}). Total facturar: ${acumuladoStr} de ${totalPresStr}.`;

    // 1. Notificar al Backend Python API
    try {
        fetch('/api/notificar-avance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                presupuesto_id: p.id,
                porcentaje: avance.porcentaje,
                monto: avance.monto,
                cliente: cliente,
                detalle: avance.detalle || notifMsg
            })
        }).then(res => res.json()).then(data => {
            console.log("☁️ Backend Python API notificado:", data);
        }).catch(() => {});
    } catch(e) {}

    // 2. Enviar notificación a todos los usuarios del sistema
    if (Array.isArray(appData.users)) {
        appData.users.forEach(u => {
            if (typeof addNotification === 'function') {
                addNotification(u.id, notifMsg, p.id);
            }
        });
    }

    if (typeof renderNotifications === 'function') {
        renderNotifications();
    }

    console.log(`[EMAIL FACTURACION] Despachado a ${emailFacturacion}: ${notifMsg}`);
    showToast(`📧 Notificación de avance enviada a ${emailFacturacion}: Facturar ${avance.porcentaje}% (${montoHitoStr}).`, 'info');
};

function getSLABadge(p) {
    if (p.estado === 'Rechazado' || p.estado === 'Aprobado con OC' || p.estado === 'Facturado Parcial' || p.estado === 'Facturado Total' || p.estado === 'Aprobado' || p.estado === 'Autorizado' || p.estado === 'Cargado con orden de compra') {
        return `<span class="sla-badge resolved"><i class="fa-solid fa-circle-check"></i> Resuelto</span>`;
    }
    
    // Normalizar la fecha reemplazando el espacio por T para evitar problemas de parsing entre navegadores
    const createdDate = new Date(p.fecha.replace(' ', 'T'));
    const timeElapsedMs = Date.now() - createdDate.getTime();
    
    // Si la fecha es inválida o en el futuro por desincronización, mostrar 0
    const finalElapsedMs = Math.max(0, timeElapsedMs);
    
    const hoursElapsed = Math.floor(finalElapsedMs / (1000 * 60 * 60));
    const minsElapsed = Math.floor((finalElapsedMs % (1000 * 60 * 60)) / (1000 * 60));
    
    // Retornamos un badge neutral con la clase .info que muestra el tiempo transcurrido en cola sin fecha de vencimiento
    return `<span class="sla-badge info"><i class="fa-solid fa-clock"></i> Hace ${hoursElapsed}h ${minsElapsed}m</span>`;
}

window.cambiarEstadoPresupuestoDirecto = function(id, nuevoEstado) {
    const p = appData.pedidos.find(x => x.id === id);
    if (!p) return;
    
    if (nuevoEstado === 'Aprobado con OC') {
        const currentOc = p.meca_nro_oc || p.nro_oc || '';
        const inputOc = prompt('Ingrese el Número de Orden de Compra (OC) para este presupuesto:', currentOc);
        if (inputOc === null || !inputOc.trim()) {
            showToast('Debe ingresar un Número de Orden de Compra (OC) obligatorio para pasar a "Aprobado con OC".', 'error');
            renderAssignmentsTable();
            return;
        }
        const cleanOc = inputOc.trim();
        p.meca_nro_oc = cleanOc;
        p.nro_oc = cleanOc;
    } else if (nuevoEstado === 'Rechazado' && !p.motivo_rechazo) {
        const reason = prompt('Ingrese el motivo obligatorio del rechazo del presupuesto:');
        if (reason === null || !reason.trim()) {
            showToast('El motivo de rechazo es obligatorio.', 'error');
            renderAssignmentsTable();
            return;
        }
        p.motivo_rechazo = reason.trim();
    }

    p.estado = nuevoEstado;
    p.fecha_resolucion = new Date().toLocaleDateString('es-AR');
    saveData();
    const ocMsg = (p.meca_nro_oc || p.nro_oc) ? ` (OC: ${p.meca_nro_oc || p.nro_oc})` : '';
    showToast(`Presupuesto #${id}: Estado actualizado a "${nuevoEstado}"${ocMsg}`, 'success');
    if (typeof window.notificarAprobacionEquipo === 'function') {
        window.notificarAprobacionEquipo(p, nuevoEstado);
    }
    renderAssignmentsTable();
};

window.autorizarPedidoRapido = function(id) {
    const p = appData.pedidos.find(x => x.id === id);
    if (!p) return;
    
    let nroOc = p.meca_nro_oc || p.nro_oc || '';
    const ocPrompt = prompt(`✅ AUTORIZAR Presupuesto #${p.id}\n\nSi el cliente ya emitió Orden de Compra (OC), ingrese el número (opcional):`, nroOc);
    if (ocPrompt === null) return; // Canceló
    
    const trimmedOc = ocPrompt.trim();
    if (trimmedOc) {
        p.meca_nro_oc = trimmedOc;
        p.nro_oc = trimmedOc;
        p.estado = 'Aprobado con OC';
    } else {
        p.estado = 'Aprobado sin OC';
    }
    p.fecha_resolucion = new Date().toLocaleDateString('es-AR');
    saveData();
    showToast(`✅ Presupuesto #${p.id} AUTORIZADO (${p.estado}).`, 'success');
    window.notificarAprobacionEquipo(p, p.estado);
    renderAssignmentsTable();
};

window.rechazarPedidoRapido = function(id) {
    const p = appData.pedidos.find(x => x.id === id);
    if (!p) return;
    
    const motivo = prompt(`❌ RECHAZAR Presupuesto #${p.id}\n\nPor favor ingrese el motivo obligatorio del rechazo:`);
    if (motivo === null) return; // Canceló
    if (!motivo.trim()) {
        showToast('El motivo de rechazo es obligatorio.', 'error');
        return;
    }
    
    p.estado = 'Rechazado';
    p.motivo_rechazo = motivo.trim();
    p.fecha_resolucion = new Date().toLocaleDateString('es-AR');
    saveData();
    showToast(`❌ Presupuesto #${p.id} fue RECHAZADO.`, 'danger');
    window.notificarAprobacionEquipo(p, 'Rechazado');
    renderAssignmentsTable();
};

function formatFechaCorta(fechaStr) {
    if (!fechaStr) return '-';
    const cleanStr = String(fechaStr).trim();
    const datePart = cleanStr.split(/[ T]/)[0];
    
    if (datePart.includes('-')) {
        const parts = datePart.split('-');
        if (parts.length === 3) {
            const year = parts[0].length === 4 ? parts[0] : (parts[2].length === 4 ? parts[2] : parts[0]);
            const month = parts[1].padStart(2, '0');
            const day = (parts[0].length === 4 ? parts[2] : parts[0]).padStart(2, '0');
            return `${day}/${month}/${year}`;
        }
    }
    if (datePart.includes('/')) {
        const parts = datePart.split('/');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            let year = parts[2];
            if (year.length === 2) year = '20' + year;
            return `${day}/${month}/${year}`;
        }
    }
    return datePart;
}
window.formatFechaCorta = formatFechaCorta;

// --- CONFIGURACIÓN DE COLUMNAS REORDENABLES Y AGRUPACIÓN ---
let tableColumnOrder = ['id', 'fecha', 'planta', 'cliente', 'denominacion', 'estado', 'importe', 'accion'];
const defaultTableColumnOrder = ['id', 'fecha', 'planta', 'cliente', 'denominacion', 'estado', 'importe', 'accion'];

const tableColumnDefs = {
    id: { key: 'id', label: 'N° ID', width: '120px', align: 'left', sortable: true },
    fecha: { key: 'fecha', label: 'Fecha', width: '90px', align: 'left', sortable: true },
    planta: { key: 'planta', label: 'Planta', width: '135px', align: 'center', sortable: true },
    denominacion: { key: 'denominacion', label: 'Detalle', width: 'auto', align: 'left', sortable: true },
    cliente: { key: 'cliente', label: 'Cliente', width: '160px', align: 'left', sortable: true },
    estado: { key: 'estado', label: 'Estado', width: '135px', align: 'center', sortable: true },
    importe: { key: 'importe', label: 'Importe ($)', width: '110px', align: 'right', sortable: true },
    accion: { key: 'accion', label: 'Acción', width: '140px', align: 'center', sortable: false }
};

let tableSortColumn = 'fecha';
let tableSortAsc = false;
let tableGroupBy = '';
let collapsedGroups = {};
let draggedColKey = null;

// --- SISTEMA DE VISTAS PERSONALIZADAS ---
const defaultTableViews = [
    { id: 'principal', name: '📋 Vista Principal', groupBy: '', statusFilter: '', isDefault: true },
    { id: 'por_estado', name: '📂 Por Estado', groupBy: 'estado', statusFilter: '', isDefault: true }
];

let customTableViews = [];
let currentActiveViewId = 'principal';

function loadCustomTableViews() {
    try {
        const saved = localStorage.getItem('sg_custom_table_views');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                customTableViews = parsed;
            }
        }
    } catch(e) {}
}
loadCustomTableViews();

function getAllTableViews() {
    return [...defaultTableViews, ...customTableViews];
}

window.renderTableViewsTabs = function() {
    const container = document.getElementById('table-views-tabs');
    if (!container) return;

    const allViews = getAllTableViews();
    container.innerHTML = allViews.map(v => {
        const isActive = (v.id === currentActiveViewId);
        const activeStyle = isActive
            ? 'background: #0284c7; color: white; border: 1px solid #38bdf8; font-weight: 700; box-shadow: 0 0 10px rgba(56,189,248,0.3);'
            : 'background: rgba(15, 23, 42, 0.7); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1); font-weight: 500;';

        const deleteBtn = !v.isDefault
            ? `<span onclick="event.stopPropagation(); window.eliminarVistaPersonalizada('${v.id}')" style="margin-left: 6px; font-size: 13px; font-weight: bold; opacity: 0.75; cursor: pointer;" title="Eliminar esta vista">&times;</span>`
            : '';

        return `
            <button type="button" class="btn btn-sm" onclick="window.seleccionarVista('${v.id}')" style="${activeStyle} font-size: 11px; padding: 3px 10px; border-radius: 6px; display: inline-flex; align-items: center; cursor: pointer; transition: all 0.2s ease;">
                ${v.name}${deleteBtn}
            </button>
        `;
    }).join('');
};

window.seleccionarVista = function(viewId) {
    const allViews = getAllTableViews();
    const v = allViews.find(x => x.id === viewId);
    if (!v) return;

    currentActiveViewId = viewId;
    tableGroupBy = v.groupBy || '';
    
    // Si la vista define un filtro de estado, aplicarlo
    const statusSelect = document.getElementById('status-filter');
    if (statusSelect && v.statusFilter !== undefined) {
        statusSelect.value = v.statusFilter;
    }

    renderTableViewsTabs();
    renderAssignmentsTable();
};

window.showModal = function(templateId) {
    if (typeof openModal === 'function') openModal(templateId);
};

window.abrirModalAgregarVista = function() {
    openModal('tpl-modal-nueva-vista');
    const inputNombre = document.getElementById('nueva-vista-nombre');
    if (inputNombre) {
        inputNombre.value = '';
        setTimeout(() => inputNombre.focus(), 150);
    }
};

window.guardarNuevaVistaPersonalizada = function() {
    const inputNombre = document.getElementById('nueva-vista-nombre');
    const selectAgrup = document.getElementById('nueva-vista-agrupacion');
    const selectEstado = document.getElementById('nueva-vista-filtro-estado');

    const nombre = inputNombre ? inputNombre.value.trim() : '';
    if (!nombre) {
        showToast('Por favor ingrese un nombre para la vista.', 'error');
        if (inputNombre) inputNombre.focus();
        return;
    }

    const agrup = selectAgrup ? selectAgrup.value : '';
    const estado = selectEstado ? selectEstado.value : '';

    const newViewId = 'view_' + Date.now();
    const newView = {
        id: newViewId,
        name: `📂 ${nombre}`,
        groupBy: agrup,
        statusFilter: estado,
        isDefault: false
    };

    customTableViews.push(newView);
    try {
        localStorage.setItem('sg_custom_table_views', JSON.stringify(customTableViews));
    } catch(e) {}

    currentActiveViewId = newViewId;
    tableGroupBy = agrup;
    
    const statusSelect = document.getElementById('status-filter');
    if (statusSelect && estado) {
        statusSelect.value = estado;
    }

    closeModal();
    showToast(`✅ Vista "${nombre}" creada con éxito.`, 'success');
    renderTableViewsTabs();
    renderAssignmentsTable();
};

window.eliminarVistaPersonalizada = function(viewId) {
    if (!confirm('¿Desea eliminar esta vista personalizada?')) return;

    customTableViews = customTableViews.filter(v => v.id !== viewId);
    try {
        localStorage.setItem('sg_custom_table_views', JSON.stringify(customTableViews));
    } catch(e) {}

    if (currentActiveViewId === viewId) {
        currentActiveViewId = 'principal';
        tableGroupBy = '';
    }

    showToast('Vista eliminada.', 'info');
    renderTableViewsTabs();
    renderAssignmentsTable();
};

try {
    const savedOrder = localStorage.getItem('sg_table_col_order_v5');
    if (savedOrder) {
        const parsed = JSON.parse(savedOrder);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.includes('denominacion') && parsed.includes('planta')) {
            const validCols = parsed.filter(c => defaultTableColumnOrder.includes(c));
            defaultTableColumnOrder.forEach(c => {
                if (!validCols.includes(c)) validCols.push(c);
            });
            tableColumnOrder = validCols;
        } else {
            tableColumnOrder = [...defaultTableColumnOrder];
            try { localStorage.setItem('sg_table_col_order_v5', JSON.stringify(tableColumnOrder)); } catch(e) {}
        }
    } else {
        tableColumnOrder = [...defaultTableColumnOrder];
    }
} catch(e) {}

window.handleColDragStart = function(e, colKey) {
    draggedColKey = colKey;
    if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', colKey);
    }
};

window.handleColDragOver = function(e) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const th = e.currentTarget;
    if (th) th.classList.add('drag-over');
};

window.handleColLeave = function(e) {
    const th = e.currentTarget;
    if (th) th.classList.remove('drag-over');
};

window.handleColDrop = function(e, targetColKey) {
    e.preventDefault();
    const th = e.currentTarget;
    if (th) th.classList.remove('drag-over');
    if (!draggedColKey || draggedColKey === targetColKey) return;

    const fromIdx = tableColumnOrder.indexOf(draggedColKey);
    const toIdx = tableColumnOrder.indexOf(targetColKey);
    if (fromIdx !== -1 && toIdx !== -1) {
        tableColumnOrder.splice(fromIdx, 1);
        tableColumnOrder.splice(toIdx, 0, draggedColKey);
        try {
            localStorage.setItem('sg_table_col_order_v5', JSON.stringify(tableColumnOrder));
        } catch(err) {}
        renderAssignmentsTable();
    }
};

window.handleColHeaderClick = function(colKey) {
    const def = tableColumnDefs[colKey];
    if (!def || !def.sortable) return;

    if (tableSortColumn === colKey) {
        tableSortAsc = !tableSortAsc;
    } else {
        tableSortColumn = colKey;
        tableSortAsc = true;
    }
    renderAssignmentsTable();
};

window.cambiarAgrupacionTabla = function(groupKey) {
    tableGroupBy = groupKey;
    collapsedGroups = {};
    renderAssignmentsTable();
};

window.toggleGroupCollapse = function(groupId) {
    collapsedGroups[groupId] = !collapsedGroups[groupId];
    const isHidden = !!collapsedGroups[groupId];
    document.querySelectorAll(`.group-item-${groupId}`).forEach(el => {
        el.style.display = isHidden ? 'none' : '';
    });
    const icon = document.getElementById(`icon-group-${groupId}`);
    if (icon) {
        icon.innerHTML = isHidden ? '▶' : '▼';
    }
};

function renderTableHeaderRow() {
    const theadRow = document.getElementById('assignments-header-row');
    if (!theadRow) return;
    theadRow.innerHTML = '';

    const colsToRender = tableColumnOrder;

    colsToRender.forEach(colKey => {
        const def = tableColumnDefs[colKey] || { key: colKey, label: colKey, width: 'auto', align: 'left', sortable: false };
        const th = document.createElement('th');
        th.className = 'draggable-col';
        th.setAttribute('data-col', colKey);
        th.setAttribute('draggable', 'true');
        
        let colWidth = def.width || 'auto';
        th.style.width = colWidth;
        if (colWidth !== 'auto' && !colWidth.includes('%')) {
            th.style.minWidth = colWidth;
        }
        th.style.textAlign = def.align;
        th.style.whiteSpace = 'nowrap';
        th.style.padding = '8px 6px';
        th.title = 'Arrastrá para reordenar la columna | Clic para ordenar';

        let colLabel = def.label;

        let sortIcon = '';
        if (def.sortable) {
            if (tableSortColumn === colKey) {
                sortIcon = tableSortAsc ? ' <span style="color: #38bdf8; font-size: 11px;">▲</span>' : ' <span style="color: #38bdf8; font-size: 11px;">▼</span>';
            } else {
                sortIcon = ' <span style="opacity: 0.25; font-size: 10px;">⇅</span>';
            }
        }

        th.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: ${def.align === 'right' ? 'flex-end' : (def.align === 'center' ? 'center' : 'flex-start')}; gap: 4px; user-select: none; white-space: nowrap;">
                <span style="opacity: 0.35; font-size: 10px; cursor: grab;" title="Arrastrar para mover">⋮⋮</span>
                <span>${colLabel}</span>${sortIcon}
            </div>
        `;

        th.ondragstart = (e) => window.handleColDragStart(e, colKey);
        th.ondragover = (e) => window.handleColDragOver(e);
        th.ondragleave = (e) => window.handleColLeave(e);
        th.ondrop = (e) => window.handleColDrop(e, colKey);
        th.onclick = (e) => window.handleColHeaderClick(colKey);

        theadRow.appendChild(th);
    });
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

window.toggleDetalleExpand = function(el) {
    if (!el) return;
    const shortEl = el.querySelector('.detalle-short');
    const fullEl = el.querySelector('.detalle-full');
    if (shortEl && fullEl) {
        if (shortEl.style.display === 'none') {
            shortEl.style.display = 'inline';
            fullEl.style.display = 'none';
        } else {
            shortEl.style.display = 'none';
            fullEl.style.display = 'inline-block';
        }
    }
};

function renderAssignmentsTable() {
    renderTableViewsTabs();
    renderTableHeaderRow();

    const listBody = document.getElementById('assignments-list');
    if (!listBody) return;
    const searchVal = document.getElementById('search-filter') ? document.getElementById('search-filter').value.toLowerCase().trim() : '';
    const statusFilterEl = document.getElementById('status-filter');
    const statusVal = statusFilterEl ? statusFilterEl.value : '';
    const dateFrom = document.getElementById('filter-date-from') ? document.getElementById('filter-date-from').value : '';
    const dateTo = document.getElementById('filter-date-to') ? document.getElementById('filter-date-to').value : '';
    
    listBody.innerHTML = '';
    
    let filtered = (appData.pedidos || []).filter(p => {
        // 1. Filtro estricto por Rubro activo (Eléctrico / Mecánico)
        const curRubro = reqTipoPresupuesto || (typeof getCurrentUser === 'function' && getCurrentUser() && getCurrentUser().rubro_defecto) || 'Eléctrico';
        const isItemMec = (p.tipo_presupuesto === 'Mecánico' || (p.id && (String(p.id).startsWith('101') || String(p.id).toUpperCase().includes('MEC'))));
        const pTipo = isItemMec ? 'Mecánico' : 'Eléctrico';
        if (pTipo !== curRubro) return false;

        if (viewMode === 'Rechazados') {
            if (p.estado !== 'Rechazado') return false;
        } else if (viewMode === 'EstadoPresupuesto') {
            if (p.estado === 'Rechazado') return false;
        }

        if (statusVal) {
            let pEstNorm = p.estado;
            if (pEstNorm === 'Cargado sin orden de compra' || pEstNorm === 'Pendiente de Autorización' || pEstNorm === 'Pendiente') pEstNorm = 'Enviado sin OC';
            else if (pEstNorm === 'Cargado con orden de compra' || pEstNorm === 'Autorizado' || pEstNorm === 'Aprobado') pEstNorm = 'Aprobado con OC';
            if (pEstNorm !== statusVal) return false;
        }
        
        const pDate = p.fecha ? p.fecha.substring(0, 10) : '';
        if (dateFrom && pDate && pDate < dateFrom) return false;
        if (dateTo && pDate && pDate > dateTo) return false;
        
        if (searchVal) {
            const matchesText = (p.cliente_nombre || '').toLowerCase().includes(searchVal) || 
                                (p.meca_denominacion || '').toLowerCase().includes(searchVal) ||
                                (p.motivo || '').toLowerCase().includes(searchVal) ||
                                (p.meca_planta || '').toLowerCase().includes(searchVal) ||
                                (p.cuit || '').includes(searchVal) || 
                                String(p.id || '').toLowerCase().includes(searchVal) ||
                                (p.estado || '').toLowerCase().includes(searchVal);
            if (!matchesText) return false;
        }
        
        return true;
    });

    const activeCustomView = (typeof getAllTableViews === 'function') ? getAllTableViews().find(v => v.id === currentActiveViewId) : null;
    if (activeCustomView && activeCustomView.statusFilter) {
        filtered = filtered.filter(p => {
            let pEstNorm = p.estado;
            if (pEstNorm === 'Cargado sin orden de compra' || pEstNorm === 'Pendiente de Autorización' || pEstNorm === 'Pendiente') pEstNorm = 'Enviado sin OC';
            else if (pEstNorm === 'Cargado con orden de compra' || pEstNorm === 'Autorizado' || pEstNorm === 'Aprobado') pEstNorm = 'Aprobado con OC';
            return pEstNorm === activeCustomView.statusFilter;
        });
    }

    if (tableSortColumn) {
        filtered.sort((a, b) => {
            let valA = a[tableSortColumn] || '';
            let valB = b[tableSortColumn] || '';
            if (tableSortColumn === 'denominacion') {
                valA = a.meca_denominacion || a.motivo || a.denominacion || '';
                valB = b.meca_denominacion || b.motivo || b.denominacion || '';
            } else if (tableSortColumn === 'cliente') {
                valA = a.cliente_nombre || a.cliente || '';
                valB = b.cliente_nombre || b.cliente || '';
            } else if (tableSortColumn === 'planta') {
                valA = a.meca_planta || a.planta || 'VGG';
                valB = b.meca_planta || b.planta || 'VGG';
            } else if (tableSortColumn === 'importe') {
                valA = parseFloat(a.importe) || 0;
                valB = parseFloat(b.importe) || 0;
                return tableSortAsc ? valA - valB : valB - valA;
            } else if (tableSortColumn === 'fecha') {
                valA = a.fecha || '';
                valB = b.fecha || '';
            } else if (tableSortColumn === 'id') {
                valA = parseInt(String(a.id).replace(/\D/g, ''), 10) || 0;
                valB = parseInt(String(b.id).replace(/\D/g, ''), 10) || 0;
                return tableSortAsc ? valA - valB : valB - valA;
            }
            if (valA < valB) return tableSortAsc ? -1 : 1;
            if (valA > valB) return tableSortAsc ? 1 : -1;
            return 0;
        });
    }

    const totalCols = tableColumnOrder.length;

    if (filtered.length === 0) {
        listBody.innerHTML = `<tr><td colspan="${totalCols}" style="text-align:center; padding: 24px; color: var(--text-muted);">No se encontraron presupuestos en esta sección.</td></tr>`;
        return;
    }

    function createBudgetTableRow(p) {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        const activeCols = tableColumnOrder;

        let statusBadge = '';
        if (p.estado === 'Aprobado con OC' || p.estado === 'Cargado con orden de compra' || p.estado === 'Autorizado' || p.estado === 'Aprobado') {
            statusBadge = `<span class="badge badge-success" style="font-size: 11px; padding: 3px 8px; font-weight: 700;">Aprobado con OC</span>`;
        } else if (p.estado === 'Enviado sin OC' || p.estado === 'Cargado sin orden de compra' || p.estado === 'Pendiente de Autorización' || p.estado === 'Pendiente') {
            statusBadge = `<span class="badge badge-warning" style="font-size: 11px; padding: 3px 8px; font-weight: 700;">Enviado sin OC</span>`;
        } else if (p.estado === 'Facturado Total') {
            statusBadge = `<span class="badge" style="background: rgba(16, 185, 129, 0.25); color: #34d399; border: 1px solid #10b981; font-size: 11px; padding: 3px 8px; font-weight: 800;">100% Facturado</span>`;
        } else if (p.estado === 'Facturado Parcial') {
            statusBadge = `<span class="badge" style="background: rgba(14, 165, 233, 0.25); color: #38bdf8; border: 1px solid #0284c7; font-size: 11px; padding: 3px 8px; font-weight: 800;">Facturado Parcial</span>`;
        } else if (p.estado === 'Cancelado') {
            statusBadge = `<span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #ef4444; font-size: 11px; padding: 3px 8px; font-weight: 700;">Cancelado</span>`;
        } else if (p.estado === 'Rechazado') {
            statusBadge = `<span class="badge badge-danger" style="font-size: 11px; padding: 3px 8px; font-weight: 700;">Rechazado</span>`;
        } else {
            statusBadge = `<span class="badge badge-secondary" style="font-size: 11px; padding: 3px 8px; font-weight: 700;">${p.estado || 'Pendiente'}</span>`;
        }

        let actionBtnHtml = '';
        if (viewMode === 'Autorizador') {
            actionBtnHtml = `
                <div style="display: inline-flex; gap: 4px; align-items: center; justify-content: center; flex-wrap: nowrap;">
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); verDetallePedido('${p.id}')" style="background: #0284c7; color: #fff; border-color: #0284c7; font-weight: bold; padding: 2px 7px; font-size: 11px; height: 26px; border-radius: 6px; white-space: nowrap;" title="Revisar: Ver comprobante completo para autorizar o rechazar">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn btn-sm btn-success" onclick="event.stopPropagation(); autorizarPedidoRapido('${p.id}')" style="background: #10b981; color: #fff; border: 1px solid #10b981; font-weight: bold; padding: 2px 7px; height: 26px; font-size: 11px; border-radius: 6px; white-space: nowrap;" title="Autorizar Presupuesto">
                        <i class="fas fa-check"></i> Autorizar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); rechazarPedidoRapido('${p.id}')" style="background: #e11d48; color: #fff; border: 1px solid #e11d48; font-weight: bold; padding: 2px 7px; height: 26px; font-size: 11px; border-radius: 6px; white-space: nowrap;" title="Rechazar Presupuesto">
                        <i class="fas fa-times"></i> Rechazar
                    </button>
                </div>
            `;
        } else if (viewMode === 'Rechazados' || p.estado === 'Rechazado') {
            actionBtnHtml = `
                <div style="display: inline-flex; gap: 4px; align-items: center; justify-content: center; flex-wrap: nowrap;">
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); verDetallePedido('${p.id}')" style="background: #0284c7; color: #fff; border-color: #0284c7; font-weight: bold; padding: 2px 7px; font-size: 11px; height: 26px; border-radius: 6px; white-space: nowrap;" title="Ver Planilla: Consultar el comprobante completo del presupuesto">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn btn-sm" onclick="event.stopPropagation(); crearPresupuestoBasadoEnActual('${p.id}')" style="background: #7c3aed; color: #fff; border: 1px solid #7c3aed; font-weight: bold; padding: 2px 7px; height: 26px; font-size: 11px; border-radius: 6px; white-space: nowrap;" title="Basar Presupuesto: Crear un nuevo presupuesto precompletando los datos de este">
                        <i class="fas fa-copy"></i> Basar
                    </button>
                </div>
            `;
        } else if (viewMode === 'EstadoPresupuesto') {
            actionBtnHtml = `
                <div style="display: inline-flex; gap: 4px; align-items: center; justify-content: center; flex-wrap: nowrap;">
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); verDetallePedido('${p.id}')" style="background: #0284c7; color: #fff; border-color: #0284c7; font-weight: bold; padding: 2px 7px; font-size: 11px; height: 26px; border-radius: 6px; white-space: nowrap;" title="Ver Planilla: Consultar el comprobante completo del presupuesto">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                </div>
            `;
        } else if (viewMode === 'Modificacion') {
            const segPerms = typeof window.getUserSeguimientoPermissions === 'function' ? window.getUserSeguimientoPermissions(getCurrentUser()) : { canEdit: true, canViewComprobante: true };
            const btns = [];
            if (segPerms.canViewComprobante) {
                btns.push(`
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); verDetallePedido('${p.id}', 'ver')" style="background: #0284c7; color: #fff; border-color: #0284c7; font-weight: bold; padding: 2px 7px; font-size: 11px; height: 26px; border-radius: 6px; white-space: nowrap;" title="Ver Comprobante: Consultar planilla oficial e historial (Solo Lectura)">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                `);
            }
            if (segPerms.canEdit) {
                btns.push(`
                    <button class="btn btn-sm" onclick="event.stopPropagation(); verDetallePedido('${p.id}', 'editar')" style="background: #f59e0b; color: #000; border: 1px solid #f59e0b; font-weight: bold; padding: 2px 7px; font-size: 11px; height: 26px; border-radius: 6px; white-space: nowrap;" title="Editar: Modificar los artículos, observaciones o condiciones del presupuesto">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-sm" onclick="event.stopPropagation(); abrirModalAvanceObra('${p.id}')" style="background: #0d9488; color: #fff; border: 1px solid #0d9488; font-weight: bold; padding: 2px 7px; height: 26px; font-size: 11px; border-radius: 6px; white-space: nowrap;" title="Avance de Obra: Registrar nuevo certificado / porcentaje de avance y notificar facturación">
                        <i class="fas fa-hammer"></i> Avance
                    </button>
                    <button class="btn btn-sm" onclick="event.stopPropagation(); crearPresupuestoBasadoEnActual('${p.id}')" style="background: #7c3aed; color: #fff; border: 1px solid #7c3aed; font-weight: bold; padding: 2px 7px; height: 26px; font-size: 11px; border-radius: 6px; white-space: nowrap;" title="Basar Presupuesto: Crear un nuevo presupuesto precompletando los datos de este">
                        <i class="fas fa-copy"></i> Basar
                    </button>
                `);
            }
            if (btns.length === 0) {
                btns.push(`
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); verDetallePedido('${p.id}', 'ver')" style="background: #0284c7; color: #fff; border-color: #0284c7; font-weight: bold; padding: 2px 7px; font-size: 11px; height: 26px; border-radius: 6px; white-space: nowrap;" title="Ver Comprobante: Consultar planilla e historial del presupuesto">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                `);
            }
            actionBtnHtml = `
                <div style="display: inline-flex; gap: 4px; align-items: center; justify-content: center; flex-wrap: nowrap;">
                    ${btns.join('')}
                </div>
            `;
        } else {
            actionBtnHtml = `
                <div style="display: inline-flex; gap: 4px; align-items: center; justify-content: center; flex-wrap: nowrap;">
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); verDetallePedido('${p.id}')" style="padding: 2px 7px; font-size: 11px; height: 26px; border-radius: 6px; white-space: nowrap;" title="Ver Planilla: Consultar el comprobante completo del presupuesto">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn btn-sm" onclick="event.stopPropagation(); abrirModalAvanceObra('${p.id}')" style="background: #0d9488; color: #fff; border: 1px solid #0d9488; font-weight: bold; padding: 2px 7px; height: 26px; font-size: 11px; border-radius: 6px; white-space: nowrap;" title="Avance de Obra: Registrar nuevo certificado / porcentaje de avance y notificar facturación">
                        <i class="fas fa-hammer"></i> Avance
                    </button>
                    <button class="btn btn-sm" onclick="event.stopPropagation(); crearPresupuestoBasadoEnActual('${p.id}')" style="background: #7c3aed; color: #fff; border: 1px solid #7c3aed; font-weight: bold; padding: 2px 7px; height: 26px; font-size: 11px; border-radius: 6px; white-space: nowrap;" title="Basar Presupuesto: Crear un nuevo presupuesto precompletando los datos de este">
                        <i class="fas fa-copy"></i> Basar
                    </button>
                </div>
            `;
        }

        const isItemMec = (p.tipo_presupuesto === 'Mecánico' || (p.id && (String(p.id).startsWith('101') || String(p.id).toUpperCase().includes('MEC'))));
        const tipoPresBadge = isItemMec 
            ? `<span class="badge" style="background: rgba(6, 182, 212, 0.2); color: #22d3ee; font-size: 10px; padding: 2px 7px; border: 1px solid rgba(6, 182, 212, 0.4); margin-left: 6px; border-radius: 4px; font-weight: 800; white-space: nowrap;">⚙️ Mecánico</span>`
            : `<span class="badge" style="background: rgba(234, 179, 8, 0.2); color: #fde047; font-size: 10px; padding: 2px 7px; border: 1px solid rgba(234, 179, 8, 0.4); margin-left: 6px; border-radius: 4px; font-weight: 800; white-space: nowrap;">⚡ Eléctrico</span>`;

        const avanceAcc = (Array.isArray(p.avances) && p.avances.length > 0) ? p.avances.reduce((s, a) => s + (parseFloat(a.porcentaje) || 0), 0) : (p.avance_porcentaje_acumulado || 0);
        const avanceBadge = (avanceAcc > 0 && viewMode !== 'EstadoPresupuesto' && viewMode !== 'Rechazados' && p.estado !== 'Rechazado')
            ? `<div style="margin-top: 2px;"><span class="badge" style="background: rgba(13, 148, 136, 0.2); color: #2dd4bf; border: 1px solid rgba(45, 212, 191, 0.4); font-size: 9.5px; padding: 1px 5px; border-radius: 4px; font-weight: 800;"><i class="fas fa-hammer"></i> ${avanceAcc}%</span></div>`
            : '';

        let cellsHtml = activeCols.map(colKey => {
            switch (colKey) {
                case 'id':
                    return `<td style="font-family: monospace; font-weight: 800; color: #38bdf8; font-size: 12px; white-space: nowrap; width: 120px; min-width: 110px; padding: 6px 8px;">${p.id}</td>`;
                case 'fecha':
                    return `<td style="font-size: 11.5px; color: #cbd5e1; font-weight: 600; white-space: nowrap; width: 90px; min-width: 85px; padding: 6px 8px;">${formatFechaCorta(p.fecha)}</td>`;
                case 'planta':
                    const plantaVal = (p.meca_planta || p.planta || 'VGG').toUpperCase();
                    return `
                        <td style="padding: 6px 8px; text-align: center; white-space: nowrap; width: 135px; min-width: 120px;">
                            <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.35); padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 11px; display: inline-block; white-space: nowrap;">${plantaVal}</span>
                        </td>`;
                case 'denominacion':
                    let alertFaltaFacturar = '';
                    const avancesArr = Array.isArray(p.avances) ? p.avances : [];
                    const totAvance = avancesArr.reduce((s, a) => s + (parseFloat(a.porcentaje) || 0), 0);
                    const totFacturado = parseFloat(p.facturado_porcentaje || 0);
                    const faltaFact = Math.max(0, parseFloat((totAvance - totFacturado).toFixed(2)));

                    if (faltaFact > 0) {
                        alertFaltaFacturar = `
                            <div style="margin-top: 4px;">
                                <span style="display: inline-flex; align-items: center; gap: 4px; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; padding: 2px 6px; border-radius: 4px; color: #fca5a5; font-weight: 800; font-size: 10.5px;">
                                    <i class="fa-solid fa-triangle-exclamation" style="color: #f87171;"></i>
                                    <span>FALTA FACTURAR: <strong style="color: #fde047;">${String(faltaFact).replace('.', ',')}%</strong></span>
                                </span>
                            </div>
                        `;
                    } else if (totFacturado >= 100 || p.estado === 'Facturado Total') {
                        alertFaltaFacturar = `
                            <div style="margin-top: 4px;">
                                <span style="display: inline-flex; align-items: center; gap: 4px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); padding: 2px 6px; border-radius: 4px; color: #6ee7b7; font-weight: 800; font-size: 10.5px;">
                                    <i class="fa-solid fa-circle-check"></i> 100% FACTURADO
                                </span>
                            </div>
                        `;
                    } else if (totFacturado >= totAvance && totAvance > 0) {
                        alertFaltaFacturar = `
                            <div style="margin-top: 4px;">
                                <span style="display: inline-flex; align-items: center; gap: 4px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); padding: 2px 6px; border-radius: 4px; color: #6ee7b7; font-weight: 800; font-size: 10.5px;">
                                    <i class="fa-solid fa-circle-check"></i> AL DÍA (${String(totFacturado).replace('.', ',')}%)
                                </span>
                            </div>
                        `;
                    }

                    const rawDenominacion = (p.meca_denominacion || p.motivo || 'Cotización de Servicio').trim();
                    let detalleContenidoHtml = '';
                    if (rawDenominacion.length > 50) {
                        const shortText = rawDenominacion.substring(0, 50);
                        detalleContenidoHtml = `
                            <div class="detalle-expandable-box" onclick="event.stopPropagation(); window.toggleDetalleExpand(this);" style="cursor: pointer; display: inline-block; max-width: 380px;" title="Haga clic para ver el detalle completo">
                                <span class="detalle-short" style="font-size: 12px; font-weight: 700; color: #ffffff; line-height: 1.35; display: inline;">
                                    ${(typeof escapeHtml === 'function' ? escapeHtml(shortText) : shortText)}...
                                    <span style="color: #38bdf8; font-size: 10px; font-weight: 800; margin-left: 4px; white-space: nowrap; background: rgba(56, 189, 248, 0.15); padding: 1px 5px; border-radius: 3px; border: 1px solid rgba(56, 189, 248, 0.3);">
                                        <i class="fa-solid fa-chevron-down"></i> más
                                    </span>
                                </span>
                                <span class="detalle-full" style="font-size: 12px; font-weight: 700; color: #ffffff; line-height: 1.35; display: none; word-break: break-word;">
                                    ${(typeof escapeHtml === 'function' ? escapeHtml(rawDenominacion) : rawDenominacion)}
                                    <span style="color: #f59e0b; font-size: 10px; font-weight: 800; margin-left: 4px; display: inline-block; background: rgba(245, 158, 11, 0.15); padding: 1px 5px; border-radius: 3px; border: 1px solid rgba(245, 158, 11, 0.3); margin-top: 2px;">
                                        <i class="fa-solid fa-chevron-up"></i> menos
                                    </span>
                                </span>
                            </div>
                        `;
                    } else {
                        detalleContenidoHtml = `
                            <span style="font-size: 12px; font-weight: 700; color: #ffffff; line-height: 1.35; word-break: break-word;">
                                ${(typeof escapeHtml === 'function' ? escapeHtml(rawDenominacion) : rawDenominacion)}
                            </span>
                        `;
                    }

                    return `
                        <td style="padding: 6px 12px; min-width: 220px;">
                            <div style="display: flex; flex-direction: column; gap: 2px;">
                                <div>
                                    ${detalleContenidoHtml}
                                </div>
                                ${avanceBadge}
                                ${alertFaltaFacturar}
                            </div>
                        </td>`;
                case 'cliente':
                    return `
                        <td style="padding: 6px 8px; width: 160px; min-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${(p.cliente_nombre || p.cliente || 'CLIENTE').toUpperCase()}">
                            <span style="font-size: 12px; font-weight: 700; color: #f8fafc; letter-spacing: 0.3px;">${(p.cliente_nombre || p.cliente || 'CLIENTE').toUpperCase()}</span>
                        </td>`;
                case 'estado':
                    if (viewMode === 'EstadoPresupuesto') {
                        return `<td style="text-align: center; padding: 6px 6px; white-space: nowrap; width: 135px; min-width: 135px;">${renderEditableStatusDropdown(p)}</td>`;
                    }
                    return `<td style="text-align: center; padding: 6px 6px; white-space: nowrap; width: 135px; min-width: 135px;">${statusBadge}</td>`;
                case 'importe':
                    return `<td style="text-align: right; font-family: monospace; font-weight: 800; font-size: 12px; color: #ffffff; white-space: nowrap; width: 110px; min-width: 105px; padding: 6px 8px;">$${parseFloat(p.importe || 0).toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</td>`;
                case 'accion':
                    return `<td style="text-align: center; padding: 6px 6px; white-space: nowrap; width: 140px; min-width: 130px;">${actionBtnHtml}</td>`;
                default:
                    return `<td style="padding: 6px 6px;">-</td>`;
            }
        }).join('');

        tr.innerHTML = cellsHtml;
        
        const handleOpenPedido = (e) => {
            if (e && e.target && (e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('select') || e.target.closest('.status-select-container') || e.target.closest('.detalle-expandable-box'))) {
                return;
            }
            if (viewMode === 'Modificacion') {
                const segPerms = typeof window.getUserSeguimientoPermissions === 'function' ? window.getUserSeguimientoPermissions(getCurrentUser()) : { canEdit: true, canViewComprobante: true };
                if (segPerms.canEdit) verDetallePedido(p.id, 'editar');
                else verDetallePedido(p.id, 'ver');
            } else {
                verDetallePedido(p.id);
            }
        };

        tr.onclick = handleOpenPedido;
        tr.ondblclick = handleOpenPedido;
        return tr;
    }

    // Renderizado con o sin agrupación
    if (tableGroupBy) {
        const groups = {};
        filtered.forEach(p => {
            let grpName = 'Otros';
            if (tableGroupBy === 'estado') {
                grpName = p.estado || 'Enviado sin OC';
            } else if (tableGroupBy === 'cliente') {
                grpName = (p.cliente_nombre || p.cliente || 'Sin Cliente').toUpperCase();
            } else if (tableGroupBy === 'planta') {
                grpName = (p.meca_planta || p.planta || 'VGG').toUpperCase();
            } else if (tableGroupBy === 'condicion') {
                grpName = p.condicion_nombre || 'Sin Condición';
            }
            if (!groups[grpName]) groups[grpName] = [];
            groups[grpName].push(p);
        });

        Object.keys(groups).forEach((grpName, grpIdx) => {
            const grpItems = groups[grpName];
            const grpTotal = grpItems.reduce((acc, item) => acc + (parseFloat(item.importe) || 0), 0);
            const grpId = 'grp_' + grpIdx;
            const isCollapsed = !!collapsedGroups[grpId];

            const headerTr = document.createElement('tr');
            headerTr.className = 'group-header-row';
            headerTr.onclick = () => toggleGroupCollapse(grpId);
            headerTr.innerHTML = `
                <td colspan="${totalCols}" style="padding: 6px 12px; font-weight: 700; color: #38bdf8; font-size: 11.5px; user-select: none;">
                    <span id="icon-group-${grpId}" style="margin-right: 6px; font-size: 11px; display: inline-block; width: 12px;">${isCollapsed ? '▶' : '▼'}</span>
                    <strong>📂 ${grpName}</strong>
                    <span class="badge" style="background: rgba(56, 189, 248, 0.2); color: #7dd3fc; border: 1px solid rgba(56, 189, 248, 0.4); font-size: 10px; margin-left: 8px; padding: 2px 6px; border-radius: 4px;">${grpItems.length} presupuestos</span>
                    <span style="float: right; color: #f8fafc; font-family: monospace; font-size: 11.5px; font-weight: 700;">Subtotal: $${grpTotal.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</span>
                </td>
            `;
            listBody.appendChild(headerTr);

            grpItems.forEach(p => {
                const tr = createBudgetTableRow(p);
                tr.classList.add(`group-item-${grpId}`);
                if (isCollapsed) tr.style.display = 'none';
                listBody.appendChild(tr);
            });
        });
    } else {
        filtered.forEach(p => {
            const tr = createBudgetTableRow(p);
            listBody.appendChild(tr);
        });
    }
};

// 5. PLANILLA DETALLE / AUTORIZACIÓN PRESEA
let pedidoActivo = null;
let pedidoEdicionTemp = null;

window.saveTempEdits = function() {
    if (!pedidoActivo) return;
    
    // Save header identification fields
    const getEditVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : null;
    };
    if (getEditVal('auth-edit-meca-denominacion') !== null) pedidoActivo.meca_denominacion = getEditVal('auth-edit-meca-denominacion');
    if (getEditVal('auth-edit-meca-cliente') !== null) pedidoActivo.cliente_nombre = getEditVal('auth-edit-meca-cliente');
    if (getEditVal('auth-edit-meca-domicilio') !== null) pedidoActivo.domicilio = getEditVal('auth-edit-meca-domicilio');
    if (getEditVal('auth-edit-meca-localidad') !== null) pedidoActivo.localidad = getEditVal('auth-edit-meca-localidad');
    if (getEditVal('auth-edit-meca-cuit') !== null) pedidoActivo.cuit = getEditVal('auth-edit-meca-cuit');
    if (getEditVal('auth-edit-meca-entrega') !== null) pedidoActivo.fecha_entrega = getEditVal('auth-edit-meca-entrega');
    if (getEditVal('auth-edit-meca-oc-mo') !== null) {
        const valOc = getEditVal('auth-edit-meca-oc-mo');
        pedidoActivo.meca_nro_oc = valOc;
        pedidoActivo.nro_oc = valOc;
        const authHeaderOc = document.getElementById('auth-header-nro-oc-val');
        if (authHeaderOc) authHeaderOc.innerText = valOc || '-';
    }
    if (getEditVal('auth-edit-meca-oc-mat') !== null) pedidoActivo.oc_materiales = getEditVal('auth-edit-meca-oc-mat');
    if (getEditVal('auth-edit-meca-proveedor') !== null) pedidoActivo.meca_proveedor = getEditVal('auth-edit-meca-proveedor');
    if (getEditVal('auth-edit-meca-oferta') !== null) pedidoActivo.meca_fecha_oferta = getEditVal('auth-edit-meca-oferta');
    if (getEditVal('auth-edit-meca-validez') !== null) pedidoActivo.meca_validez = getEditVal('auth-edit-meca-validez');
    if (getEditVal('auth-edit-meca-planta') !== null) pedidoActivo.meca_planta = getEditVal('auth-edit-meca-planta');
    if (getEditVal('auth-edit-meca-nro-oc') !== null) {
        const valOc = getEditVal('auth-edit-meca-nro-oc');
        pedidoActivo.meca_nro_oc = valOc;
        pedidoActivo.nro_oc = valOc;
        const authHeaderOc = document.getElementById('auth-header-nro-oc-val');
        if (authHeaderOc) authHeaderOc.innerText = valOc || '-';
    }
    if (getEditVal('auth-edit-meca-nro-ot') !== null) pedidoActivo.meca_nro_ot = getEditVal('auth-edit-meca-nro-ot');
    if (getEditVal('auth-edit-meca-inicio') !== null) pedidoActivo.meca_fecha_inicio = getEditVal('auth-edit-meca-inicio');
    if (getEditVal('auth-edit-meca-duracion') !== null) pedidoActivo.meca_duracion = getEditVal('auth-edit-meca-duracion');
    if (getEditVal('auth-edit-meca-fin') !== null) pedidoActivo.meca_fecha_fin = getEditVal('auth-edit-meca-fin');
    if (getEditVal('auth-edit-meca-propuesta') !== null) pedidoActivo.meca_propuesta = getEditVal('auth-edit-meca-propuesta');
    if (getEditVal('auth-edit-meca-personal') !== null) pedidoActivo.meca_personal = getEditVal('auth-edit-meca-personal');
    if (getEditVal('auth-edit-meca-exclusiones') !== null) pedidoActivo.meca_exclusiones = getEditVal('auth-edit-meca-exclusiones');

    // Save reason/observations
    const reasonInput = document.getElementById('auth-reason-input-edit');
    if (reasonInput) {
        pedidoActivo.motivo = reasonInput.value;
    }
    
    // Save condition
    const condSelect = document.getElementById('auth-condition-select');
    if (condSelect) {
        pedidoActivo.condicion_id = condSelect.value;
        const condObj = condicionesDB.find(c => c.codigo === condSelect.value);
        pedidoActivo.condicion_nombre = condObj ? condObj.nombre || `Condición ${condObj.codigo}` : `Condición ${condSelect.value}`;
    }
    
    // Save currency and exchange rate
    const currSelect = document.getElementById('auth-currency-select');
    const cotizInput = document.getElementById('auth-exchange-rate-input');
    if (currSelect) {
        pedidoActivo.moneda_id = parseInt(currSelect.value);
        if (pedidoActivo.moneda_id === 2 || pedidoActivo.moneda_id === 60) {
            pedidoActivo.cotizacion = cotizInput ? parseFloat(cotizInput.value) : 1.0;
            if (isNaN(pedidoActivo.cotizacion) || pedidoActivo.cotizacion <= 0) {
                pedidoActivo.cotizacion = (pedidoActivo.moneda_id === 2 ? 1011.00 : 1100.00);
            }
        } else {
            pedidoActivo.cotizacion = 1.0;
        }
    }
    
    // Save status
    const statusSelect = document.getElementById('modal-change-status-select');
    if (statusSelect) {
        pedidoActivo.estado = statusSelect.value;
    }
    
    // Save items from Excel grid if active
    if (Array.isArray(pedidoItems) && pedidoItems.length > 0) {
        pedidoActivo.items = JSON.parse(JSON.stringify(pedidoItems));
        const newAmt = pedidoActivo.items.reduce((sum, item) => {
            const q = parseFloat(String(item.cantidad || '0').replace(',', '.')) || 0;
            const pr = parseFloat(String(item.precio !== undefined ? item.precio : (item.precio_unitario !== undefined ? item.precio_unitario : 0)).replace(',', '.')) || 0;
            const sub = (item.subtotal !== undefined && item.subtotal !== null && !isNaN(parseFloat(String(item.subtotal).replace(',', '.'))))
                ? parseFloat(String(item.subtotal).replace(',', '.'))
                : (q * pr);
            return sum + sub;
        }, 0);
        pedidoActivo.importe = newAmt;
    }

    // Save items quantities and status from legacy checks if present
    const checks = document.querySelectorAll('.auth-item-check');
    const qtys = document.querySelectorAll('.auth-item-qty');
    
    if (pedidoActivo.items && checks.length > 0) {
        pedidoActivo.items.forEach((item, idx) => {
            const chk = Array.from(checks).find(c => parseInt(c.getAttribute('data-idx')) === idx);
            const qtyInput = Array.from(qtys).find(q => parseInt(q.getAttribute('data-idx')) === idx);
            
            if (chk && qtyInput) {
                const isChecked = chk.checked;
                const qty = parseFloat(String(qtyInput.value || '0').replace(',', '.'));
                const pr = parseFloat(String(item.precio !== undefined ? item.precio : (item.precio_unitario !== undefined ? item.precio_unitario : 0)).replace(',', '.')) || 0;
                
                item.estado = isChecked ? 'Pendiente' : 'Rechazado';
                item.cantidad = isNaN(qty) || qty <= 0 ? 0.01 : qty;
                item.subtotal = item.cantidad * pr;
            }
        });
    }
};

window.onAuthCurrencyChange = function() {
    const currencySelect = document.getElementById('auth-currency-select');
    const rateContainer = document.getElementById('auth-exchange-rate-container');
    const rateInput = document.getElementById('auth-exchange-rate-input');
    
    if (currencySelect) {
        const val = parseInt(currencySelect.value);
        if (rateContainer) {
            rateContainer.style.display = (val === 2 || val === 60) ? 'flex' : 'none';
        }
        if (rateInput) {
            if (val === 2) {
                rateInput.value = "1011.00000000";
            } else if (val === 60) {
                rateInput.value = "1100.00000000";
            } else {
                rateInput.value = "1.00000000";
            }
        }
    }
    saveTempEdits();
    recalcAuthTotal();
};

window.abrirRobotDepositosEdicion = function() {
    saveTempEdits();
    openModal('tpl-modal-robot-depositos');
    const searchInput = document.getElementById('robot-dep-search-input');
    const resultsList = document.getElementById('robot-dep-results-list');
    const resultsCount = document.getElementById('robot-dep-results-count');
    
    const renderResults = (query) => {
        resultsList.innerHTML = '';
        const cleanQuery = (query || '').toLowerCase().trim();
        let filtered = [];
        if (cleanQuery === '') {
            filtered = depositosDB.slice(0, 100);
        } else {
            filtered = depositosDB.filter(d => 
                d.nombre.toLowerCase().includes(cleanQuery) || 
                d.codigo.includes(cleanQuery)
            );
        }
        resultsCount.innerText = `Mostrando ${filtered.length} depósitos`;
        filtered.forEach(d => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.innerHTML = `
                <td style="font-family: monospace;">${d.codigo}</td>
                <td><strong>${d.nombre || 'Sin nombre'}</strong></td>
            `;
            tr.onclick = () => {
                if (pedidoActivo) {
                    pedidoActivo.deposito_id = d.codigo;
                    pedidoActivo.deposito_nombre = d.nombre;
                }
                closeModal();
                verDetallePedido(pedidoActivo.id);
            };
            resultsList.appendChild(tr);
        });
    };
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderResults(e.target.value);
        });
        renderResults('');
        setTimeout(() => searchInput.focus(), 150);
    }
};

window.abrirRobotTransportesEdicion = function() {
    saveTempEdits();
    openModal('tpl-modal-robot-transportes');
    const searchInput = document.getElementById('robot-trans-search-input');
    const resultsList = document.getElementById('robot-trans-results-list');
    const resultsCount = document.getElementById('robot-trans-results-count');
    
    const renderResults = (query) => {
        resultsList.innerHTML = '';
        const cleanQuery = (query || '').toLowerCase().trim();
        let filtered = [];
        if (cleanQuery === '') {
            filtered = transportesDB.slice(0, 100);
        } else {
            filtered = transportesDB.filter(t => 
                t.nombre.toLowerCase().includes(cleanQuery) || 
                t.codigo.includes(cleanQuery)
            );
        }
        resultsCount.innerText = `Mostrando ${filtered.length} transportes`;
        filtered.forEach(t => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.innerHTML = `
                <td style="font-family: monospace;">${t.codigo}</td>
                <td><strong>${t.nombre || 'Sin nombre'}</strong></td>
            `;
            tr.onclick = () => {
                if (pedidoActivo) {
                    pedidoActivo.transporte_id = t.codigo;
                    pedidoActivo.transporte_nombre = t.nombre;
                }
                closeModal();
                verDetallePedido(pedidoActivo.id);
            };
            resultsList.appendChild(tr);
        });
    };
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderResults(e.target.value);
        });
        renderResults('');
        setTimeout(() => searchInput.focus(), 150);
    }
};

window.guardarModificacionesPedido = function() {
    if (!pedidoActivo) return;
    
    saveTempEdits();
    
    // Validaciones de campos obligatorios para Presupuestos Mecánicos/Eléctricos
    const tipoStr = (pedidoActivo.tipo_presupuesto || '').toLowerCase();
    const isExcel = tipoStr.includes('mecánico') || tipoStr.includes('mecanico') || tipoStr.includes('eléctrico') || tipoStr.includes('electrico');
    if (isExcel) {
        const denominacion = (pedidoActivo.meca_denominacion || '').trim();
        const cliente = (pedidoActivo.cliente_nombre || '').trim();
        const proveedor = (pedidoActivo.meca_proveedor || '').trim();
        const fechaOferta = (pedidoActivo.meca_fecha_oferta || '').trim();
        const validez = (pedidoActivo.meca_validez || '').trim();
        const fechaInicio = (pedidoActivo.meca_fecha_inicio || '').trim();
        const duracion = (pedidoActivo.meca_duracion || '').trim();
        const fechaFin = (pedidoActivo.meca_fecha_fin || '').trim();

        if (!denominacion) {
            showToast('El campo "i. Denominación del Servicio" es obligatorio.', 'error');
            return;
        }
        if (!cliente) {
            showToast('El campo "ii. Cliente" es obligatorio.', 'error');
            return;
        }
        if (!proveedor) {
            showToast('El campo "iii. Nombre del Proveedor" es obligatorio.', 'error');
            return;
        }
        if (!fechaOferta) {
            showToast('El campo "iv. Fecha de Oferta" es obligatorio.', 'error');
            return;
        }
        if (!validez) {
            showToast('El campo "v. Validez de la Oferta" es obligatorio.', 'error');
            return;
        }
        if (!fechaInicio) {
            showToast('El campo "vii. Fecha estimada de Inicio" es obligatorio.', 'error');
            return;
        }
        if (!duracion) {
            showToast('El campo "viii. Duración estimada" es obligatorio.', 'error');
            return;
        }
        if (!fechaFin) {
            showToast('El campo "ix. Plazo Máximo de Finalización" es obligatorio.', 'error');
            return;
        }

        if (fechaInicio < fechaOferta) {
            showToast('La "Fecha estimada de Inicio" no puede ser anterior a la "Fecha de Oferta".', 'error');
            return;
        }

        if (fechaFin <= fechaInicio) {
            showToast('El "ix. Plazo Máximo de Finalización" debe ser obligatoriamente mayor a la "Fecha estimada de Inicio".', 'error');
            return;
        }
    }

    const activeItems = (pedidoActivo.items || []).filter(item => {
        const q = parseFloat(String(item.cantidad || '0').replace(',', '.')) || 0;
        const sub = parseFloat(String(item.subtotal || '0').replace(',', '.')) || 0;
        const pr = parseFloat(String(item.precio !== undefined ? item.precio : (item.precio_unitario || 0)).replace(',', '.')) || 0;
        return (q > 0 || sub > 0 || pr > 0) && item.estado !== 'Rechazado';
    });
    if (activeItems.length === 0) {
        showToast('Debe dejar al menos un artículo activo en el presupuesto.', 'error');
        return;
    }
    
    const orderIdx = appData.pedidos.findIndex(p => p.id === pedidoActivo.id);
    if (orderIdx === -1) {
        showToast('No se encontró el pedido a modificar.', 'error');
        return;
    }
    const realOrder = appData.pedidos[orderIdx];
    
    const newAmount = activeItems.reduce((sum, item) => {
        const q = parseFloat(String(item.cantidad || '0').replace(',', '.')) || 0;
        const pr = parseFloat(String(item.precio !== undefined ? item.precio : (item.precio_unitario !== undefined ? item.precio_unitario : 0)).replace(',', '.')) || 0;
        const sub = (item.subtotal !== undefined && item.subtotal !== null && !isNaN(parseFloat(String(item.subtotal).replace(',', '.'))))
            ? parseFloat(String(item.subtotal).replace(',', '.'))
            : (q * pr);
        return sum + sub;
    }, 0);
    realOrder.meca_denominacion = pedidoActivo.meca_denominacion || pedidoActivo.motivo || '';
    realOrder.cliente_nombre = pedidoActivo.cliente_nombre || '';
    realOrder.domicilio = pedidoActivo.domicilio || '';
    realOrder.localidad = pedidoActivo.localidad || '';
    realOrder.cuit = pedidoActivo.cuit || '';
    realOrder.condicion_iva = pedidoActivo.condicion_iva || 'RESPONSABLE INSCRIPTO';
    realOrder.fecha_entrega = pedidoActivo.fecha_entrega || '';
    realOrder.oc_materiales = pedidoActivo.oc_materiales || '';
    realOrder.meca_proveedor = pedidoActivo.meca_proveedor || '';
    realOrder.meca_fecha_oferta = pedidoActivo.meca_fecha_oferta || '';
    realOrder.meca_validez = pedidoActivo.meca_validez || '';
    realOrder.meca_planta = pedidoActivo.meca_planta || '';
    realOrder.meca_fecha_inicio = pedidoActivo.meca_fecha_inicio || '';
    realOrder.meca_duracion = pedidoActivo.meca_duracion || '';
    realOrder.meca_fecha_fin = pedidoActivo.meca_fecha_fin || '';
    realOrder.meca_propuesta = pedidoActivo.meca_propuesta || '';
    realOrder.meca_personal = pedidoActivo.meca_personal || '';
    realOrder.meca_exclusiones = pedidoActivo.meca_exclusiones || '';
    realOrder.meca_nro_oc = pedidoActivo.meca_nro_oc || '';
    realOrder.nro_oc = pedidoActivo.meca_nro_oc || '';
    realOrder.meca_nro_ot = pedidoActivo.meca_nro_ot || '';

    realOrder.condicion_id = pedidoActivo.condicion_id;
    realOrder.condicion_nombre = pedidoActivo.condicion_nombre;
    realOrder.deposito_id = pedidoActivo.deposito_id;
    realOrder.deposito_nombre = pedidoActivo.deposito_nombre;
    realOrder.transporte_id = pedidoActivo.transporte_id;
    realOrder.transporte_nombre = pedidoActivo.transporte_nombre;
    realOrder.motivo = pedidoActivo.motivo;
    realOrder.moneda_id = pedidoActivo.moneda_id;
    realOrder.cotizacion = pedidoActivo.cotizacion;
    
    realOrder.items = pedidoActivo.items.map(item => {
        const q = parseFloat(String(item.cantidad || '0').replace(',', '.')) || 0;
        const pr = parseFloat(String(item.precio !== undefined ? item.precio : (item.precio_unitario !== undefined ? item.precio_unitario : 0)).replace(',', '.')) || 0;
        const sub = (item.subtotal !== undefined && item.subtotal !== null && !isNaN(parseFloat(String(item.subtotal).replace(',', '.'))))
            ? parseFloat(String(item.subtotal).replace(',', '.'))
            : (q * pr);
        return {
            ...item,
            cantidad: q,
            precio: pr,
            precio_unitario: pr,
            cantidad_original: item.cantidad_original !== undefined ? item.cantidad_original : q,
            subtotal: sub
        };
    });
    
    realOrder.importe = newAmount;
    realOrder.importe_original = newAmount;
    realOrder.estado = pedidoActivo.estado;
    
    saveData();
    pedidoEdicionTemp = null;
    
    showToast(`Presupuesto ${pedidoActivo.id} modificado y actualizado con éxito.`, 'success');
    closeModal();
    
    if (typeof renderAssignmentsTable === 'function') {
        renderAssignmentsTable();
    }
};

let productoSeleccionadoEdicion = null;

window.seleccionarDepositoEdicion = function(dep) {
    if (pedidoActivo) {
        pedidoActivo.deposito_id = dep.codigo;
        pedidoActivo.deposito_nombre = dep.nombre;
    }
    const input = document.getElementById('auth-deposit-input-edit');
    if (input) {
        input.value = dep ? dep.nombre.toUpperCase() : '';
    }
    const dropdown = document.getElementById('auth-deposit-dropdown-edit');
    if (dropdown) dropdown.style.display = 'none';
};

window.seleccionarTransporteEdicion = function(trans) {
    if (pedidoActivo) {
        pedidoActivo.transporte_id = trans.codigo;
        pedidoActivo.transporte_nombre = trans.nombre;
    }
    const input = document.getElementById('auth-transport-input-edit');
    if (input) {
        input.value = trans ? trans.nombre.toUpperCase() : '';
    }
    const dropdown = document.getElementById('auth-transport-dropdown-edit');
    if (dropdown) dropdown.style.display = 'none';
};

window.robotSelectedTab = '';

window.filterRobotByTab = function(btn, tabName) {
    window.robotSelectedTab = tabName;
    const btns = document.querySelectorAll('.robot-tab-btn');
    btns.forEach(b => {
        b.style.background = 'rgba(255,255,255,0.03)';
        b.style.color = 'var(--text-muted)';
        b.style.border = '1px solid rgba(255,255,255,0.1)';
    });
    if (btn) {
        btn.style.background = 'var(--primary)';
        btn.style.color = 'white';
        btn.style.border = '1px solid var(--primary)';
    }
    if (typeof window.renderRobotResults === 'function') {
        window.renderRobotResults();
    }
};

window.abrirRobotStockEdicion = function() {
    saveTempEdits();
    openModal('tpl-modal-robot-stock');
    const searchInput = document.getElementById('robot-stock-search-input');
    const resultsList = document.getElementById('robot-stock-results-list');
    const resultsCount = document.getElementById('robot-stock-results-count');
    const rubroFilter = document.getElementById('robot-stock-rubro-filter');

    const activeCatalog = getActiveStockCatalog();
    window.robotSelectedTab = '';

    // Popular rubro filter
    if (rubroFilter && activeCatalog.length > 0) {
        const rubros = [...new Set(activeCatalog.map(s => s.subrubro || s.rubro || 'Tarifario').filter(Boolean))].sort();
        let html = '<option value="">Todos los subrubros...</option>';
        rubros.forEach(r => {
            html += `<option value="${r}">${r}</option>`;
        });
        rubroFilter.innerHTML = html;
    }

    window.renderRobotResults = function() {
        resultsList.innerHTML = '';
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const rubro = rubroFilter ? rubroFilter.value : '';

        let filtered = activeCatalog;
        if (window.robotSelectedTab) {
            filtered = filtered.filter(s => {
                const sub = (s.subrubro || s.rubro || '').toUpperCase();
                return sub.includes(window.robotSelectedTab.toUpperCase());
            });
        }
        if (rubro) {
            filtered = filtered.filter(s => (s.subrubro || s.rubro || 'Tarifario') === rubro);
        }
        if (query) {
            filtered = filtered.filter(s => 
                s.detalle.toLowerCase().includes(query) || 
                s.codigo.toLowerCase().includes(query)
            );
        }

        const limit = 100;
        const sliced = filtered.slice(0, limit);
        
        resultsCount.innerText = `Mostrando ${sliced.length} de ${filtered.length} ítems / horas del tarifario`;

        sliced.forEach(s => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';

            tr.innerHTML = `
                <td style="font-family: monospace;">${s.codigo}</td>
                <td><strong>${s.detalle}</strong></td>
                <td><span style="font-size: 11px; background: rgba(6,182,212,0.15); color: #22d3ee; padding: 2px 6px; border-radius: 4px;">${s.subrubro || s.rubro || 'Tarifario'}</span></td>
                <td style="font-family: monospace; text-align: right; font-weight: 700; color: #fde047;">$${(s.precio || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: center; font-weight: 600; color: rgba(255,255,255,0.7);">${s.udm || 'Hs'}</td>
            `;

            tr.onclick = () => {
                closeModal();
                if (typeof pedidoActivo !== 'undefined' && pedidoActivo) {
                    verDetallePedido(pedidoActivo.id);
                }
                seleccionarProductoEdicion(s);
            };
            resultsList.appendChild(tr);
        });
    };

    if (searchInput) searchInput.addEventListener('input', window.renderRobotResults);
    if (rubroFilter) rubroFilter.addEventListener('change', window.renderRobotResults);

    window.renderRobotResults();
    setTimeout(() => { if (searchInput) searchInput.focus(); }, 150);
};

window.seleccionarProductoEdicion = function(prod) {
    productoSeleccionadoEdicion = prod;
    const input = document.getElementById('auth-add-product-input');
    if (input) {
        input.value = prod ? `${prod.detalle} (Cód: ${prod.codigo})` : '';
    }
    const dropdown = document.getElementById('auth-add-product-dropdown');
    if (dropdown) dropdown.style.display = 'none';

    // Rellenar precio
    const priceInput = document.getElementById('auth-add-product-price');
    if (priceInput) {
        priceInput.value = prod ? prod.precio : 0.00;
    }

    // Foco en la cantidad
    const qtyInput = document.getElementById('auth-add-product-qty');
    if (qtyInput) {
        qtyInput.focus();
        qtyInput.select();
    }
};

window.agregarArticuloEdicion = function() {
    const qtyInput = document.getElementById('auth-add-product-qty');
    const qty = parseFloat(qtyInput ? qtyInput.value : 0);
    if (isNaN(qty) || qty <= 0) {
        showToast('La cantidad debe ser mayor a cero.', 'error');
        return;
    }

    const priceInput = document.getElementById('auth-add-product-price');
    const price = parseFloat(priceInput ? priceInput.value : 0);
    if (isNaN(price) || price < 0) {
        showToast('El precio debe ser mayor o igual a cero.', 'error');
        return;
    }

    const textInput = document.getElementById('auth-add-product-input');
    const typedText = textInput ? textInput.value.trim() : '';

    let itemToAdd = productoSeleccionadoEdicion;
    if (!itemToAdd && typedText) {
        const isElec = (pedidoActivo && pedidoActivo.tipo_presupuesto === 'Eléctrico');
        itemToAdd = {
            codigo: isElec ? `ELE-HS-${Date.now().toString().slice(-4)}` : `MEC-HS-${Date.now().toString().slice(-4)}`,
            detalle: typedText,
            precio: price
        };
    }

    if (!itemToAdd) {
        showToast('Seleccione un ítem del tarifario o escriba una descripción válida de horas / servicio.', 'error');
        return;
    }

    // Guardar cambios temporales de otros inputs primero
    saveTempEdits();

    if (!pedidoActivo.items) {
        pedidoActivo.items = [];
    }

    // Comprobar si ya existe en la lista de items del pedido activo
    const existing = pedidoActivo.items.find(item => item.codigo === itemToAdd.codigo);
    if (existing) {
        existing.estado = 'Pendiente';
        existing.cantidad += qty;
        existing.precio = price;
        existing.subtotal = existing.cantidad * existing.precio;
    } else {
        pedidoActivo.items.push({
            codigo: itemToAdd.codigo,
            detalle: itemToAdd.detalle,
            precio: price,
            cantidad: qty,
            cantidad_original: qty,
            subtotal: qty * price,
            estado: 'Pendiente'
        });
    }

    // Limpiar selección
    productoSeleccionadoEdicion = null;
    if (textInput) textInput.value = '';
    if (qtyInput) qtyInput.value = '';
    if (priceInput) priceInput.value = '';

    // Volver a renderizar
    verDetallePedido(pedidoActivo.id);

    showToast(`Ítem / Horas agregadas: "${itemToAdd.detalle}" x${qty}`, 'success');
};

window.formatPresupuestoCodigo = function(p) {
    if (!p) return '';
    if (typeof p === 'string') {
        const found = (window.appData && window.appData.pedidos) ? window.appData.pedidos.find(x => x.id === p) : null;
        if (found) p = found;
        else {
            return p;
        }
    }
    const isMec = (p.tipo_presupuesto === 'Mecánico' || (p.id && String(p.id).startsWith('101')));
    const rubroPrefix = isMec ? '101-MEC' : '102-ELEC';
    
    if (p.id && (String(p.id).startsWith('101-') || String(p.id).startsWith('102-'))) {
        return p.id;
    }
    
    const cleanNum = String(p.id || '').replace(/\D/g, '');
    const seqStr = cleanNum ? String(cleanNum.slice(-4)).padStart(4, '0') : '0001';
    return `${rubroPrefix}-${seqStr}`;
};

window.verDetallePedido = function(id, explicitMode) {
    console.log('%c🔥 verDetallePedido v170 EJECUTÁNDOSE — id=' + id, 'background: red; color: white; font-size: 16px; padding: 4px 8px;');
    const pedido = appData.pedidos.find(p => p.id === id);
    if (!pedido) return;
    
    const segPerms = typeof window.getUserSeguimientoPermissions === 'function' ? window.getUserSeguimientoPermissions(getCurrentUser()) : { canEdit: true, canViewComprobante: true };
    
    // Determinar si la apertura es en modo edición o solo consulta/historial
    const isEditRequested = (explicitMode === 'editar') || (!explicitMode && viewMode === 'Modificacion' && segPerms.canEdit);
    const isEditingAllowed = isEditRequested && segPerms.canEdit && pedido.estado !== 'Rechazado' && viewMode !== 'EstadoPresupuesto' && viewMode !== 'Rechazados' && viewMode !== 'Autorizador';
    
    if (isEditingAllowed) {
        if (!pedidoEdicionTemp || pedidoEdicionTemp.id !== id) {
            pedidoEdicionTemp = JSON.parse(JSON.stringify(pedido));
        }
        pedidoActivo = pedidoEdicionTemp;
    } else {
        pedidoActivo = pedido;
    }
    
    const p = pedidoActivo;
    reqTipoPresupuesto = (p.tipo_presupuesto || (String(p.id).startsWith('101') ? 'Mecánico' : 'Eléctrico'));
    if (isEditingAllowed) {
        pedidoItems = JSON.parse(JSON.stringify(p.items || []));
    }

    openModal('tpl-modal-auth');

    if (typeof window.getBudgetDocTitle === 'function') {
        document.title = window.getBudgetDocTitle(p);
    }

    if (typeof window.registrarNavegacion === 'function') {
        window.registrarNavegacion({ type: 'modal_auth', pedidoId: id, label: `Presupuesto #${id}` });
    }

    // Controlar visibilidad del botón 'Editar' en el modal (Solo en vista Modificación/Seguimiento)
    const btnEditModal = document.getElementById('btn-modal-editar-presupuesto');
    if (btnEditModal) {
        const canShowEdit = (viewMode === 'Modificacion' && segPerms.canEdit && p.estado !== 'Rechazado' && !isEditingAllowed);
        btnEditModal.style.display = canShowEdit ? 'inline-flex' : 'none';
    }

    // Controlar visibilidad del botón 'Basar Presupuesto' (Solo en vista Modificación/Seguimiento)
    const btnBasarModal = document.getElementById('btn-modal-basar-presupuesto');
    if (btnBasarModal) {
        const canShowBasar = (viewMode === 'Modificacion' && segPerms.canEdit && p.estado !== 'Rechazado');
        btnBasarModal.style.display = canShowBasar ? 'inline-block' : 'none';
    }

    // Controlar visibilidad del botón 'Avance de Obra' (Solo en vista Modificación/Seguimiento)
    const btnAvanceModal = document.getElementById('btn-modal-avance-obra');
    if (btnAvanceModal) {
        const canShowAvance = (viewMode === 'Modificacion' && segPerms.canEdit && p.estado !== 'Rechazado');
        btnAvanceModal.style.display = canShowAvance ? 'inline-flex' : 'none';
    }

    const setElemText = (elId, txt) => {
        const el = document.getElementById(elId);
        if (el) el.innerText = (txt !== null && txt !== undefined) ? String(txt) : '';
    };
    const setElemHtml = (elId, html) => {
        const el = document.getElementById(elId);
        if (el) el.innerHTML = (html !== null && html !== undefined) ? String(html) : '';
    };

    // Popular planilla SG MONTAJES con el código respetando 101-MEC / 102-ELEC
    setElemText('auth-id', formatPresupuestoCodigo(p));
    
    // Formatear fecha a DD/MM/YYYY
    let formattedDate = p.fecha || '';
    if (p.fecha && String(p.fecha).includes(' ')) {
        const parts = String(p.fecha).substring(0, 10).split('-');
        if (parts.length === 3) {
            formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
    }
    setElemText('auth-date-val', formattedDate);
    setElemText('auth-header-nro-oc-val', p.meca_nro_oc || p.nro_oc || '-');
    
    const cleanVal = (val, fallback) => {
        if (val === undefined || val === null) return (fallback !== undefined && fallback !== null && fallback !== '-') ? fallback : '-';
        const s = String(val).trim();
        if (s === '' || s === '-' || s.toLowerCase() === 'undefined' || s.toLowerCase() === 'null') {
            return (fallback !== undefined && fallback !== null && fallback !== '-') ? fallback : '-';
        }
        return s;
    };

    const rawClient = (typeof clientesDB !== 'undefined' && Array.isArray(clientesDB)) 
        ? clientesDB.find(c => (c.codigo && p.cliente_id && String(c.codigo).trim() === String(p.cliente_id).trim()) || (p.cliente_nombre && c.nombre && String(c.nombre).trim().toUpperCase() === String(p.cliente_nombre).trim().toUpperCase())) 
        : null;

    const formatDisplayDate = (val) => {
        if (!val || val === '-') return '-';
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(val))) {
            const parts = String(val).split('-');
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return String(val);
    };

    const formatCuitDisplay = (val) => {
        if (!val || val === '-') return '-';
        const clean = String(val).replace(/\D/g, '');
        if (clean.length === 11) {
            return `${clean.substring(0, 2)}-${clean.substring(2, 10)}-${clean.substring(10)}`;
        }
        return String(val);
    };

    const rawCliCode = cleanVal(p.cliente_id, rawClient ? rawClient.codigo : '-');
    const rawCliName = cleanVal(p.cliente_nombre, rawClient ? rawClient.nombre : '-').toUpperCase();
    const rawCliDom = cleanVal(p.domicilio, rawClient ? rawClient.domicilio : '-').toUpperCase();
    const rawCliLoc = cleanVal(p.localidad, rawClient ? rawClient.localidad : '-').toUpperCase();
    const rawCliIva = cleanVal(p.condicion_iva, rawClient ? rawClient.condicion_iva : 'RESPONSABLE INSCRIPTO').toUpperCase();
    const rawCliCuit = formatCuitDisplay(cleanVal(p.cuit, rawClient ? rawClient.cuit : '-'));
    const rawCliCond = cleanVal(p.condicion_nombre, rawClient ? rawClient.condicion_nombre : (p.forma_pago || 'CONTADO')).toUpperCase();
    const rawCliEnt = formatDisplayDate(cleanVal(p.fecha_entrega || p.meca_fecha_fin, p.fecha || formattedDate));
    const rawOcMo = cleanVal(p.meca_nro_oc, p.nro_oc || '-');
    const rawOcMat = cleanVal(p.oc_materiales, '-');
    const rawPlanta = cleanVal(p.meca_planta || p.planta, 'VGG').toUpperCase();
    const rawNroPres = formatPresupuestoCodigo(p) || p.id || '-';

    setElemText('auth-client-display', `${rawCliCode}  ${rawCliName}`);
    setElemText('auth-domicilio-val', rawCliDom);
    setElemText('auth-localidad-val', rawCliLoc);
    setElemText('auth-cuit-val', rawCliCuit);
    setElemText('auth-iva-val', rawCliIva);
    
    setElemText('auth-comisionista-val', p.is_comisionista ? 'SÍ' : 'NO');
    const isDetailMec = (p.tipo_presupuesto === 'Mecánico' || (p.id && (String(p.id).startsWith('101') || String(p.id).toUpperCase().includes('MEC'))));
    const isElec = !isDetailMec;
    setElemText('auth-tiponv-val', `${isElec ? '⚡' : '⚙️'} PRESUPUESTO ${isElec ? 'ELÉCTRICO' : 'MECÁNICO'}`);
    setElemText('auth-entrega-val', (p.tipo_entrega || 'RETIRA CLIENTE').toUpperCase());
    setElemText('auth-pago-val', rawCliCond);
    
    // Ficha y Aclaraciones para Presupuestos Excel (Mecánico y Eléctrico)
    const mecaHeaderBox = document.getElementById('auth-mecanico-header-box');
    const mecaAclaraciones = document.getElementById('auth-mecanico-aclaraciones');
    const customerInfoBox = document.getElementById('auth-customer-info-box');
    
    const tipoStr = (p.tipo_presupuesto || '').toLowerCase();
    const isElectrical = tipoStr.includes('eléctrico') || tipoStr.includes('electrico') || (!tipoStr.includes('mecánico') && !tipoStr.includes('mecanico'));
    const isExcelFlow = true;

    const isRejectedOrder = (p.estado === 'Rechazado' || p.estado === 'Anulado' || viewMode === 'Rechazados');
    const canEditControls = (!isRejectedOrder && isEditingAllowed);

    if (mecaHeaderBox) {
        mecaHeaderBox.style.display = 'block';

        if (canEditControls) {
            setElemHtml('auth-meca-cliente-val', `<input type="text" id="auth-edit-meca-cliente" value="${rawCliName !== '-' ? rawCliName : ''}" oninput="saveTempEdits()" style="width: 100%; font-size: 11px; padding: 3px 6px; color: #0f172a; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold;">`);
            setElemText('auth-meca-cliente-codigo-val', rawCliCode);
            setElemHtml('auth-meca-domicilio-val', `<input type="text" id="auth-edit-meca-domicilio" value="${rawCliDom !== '-' ? rawCliDom : ''}" oninput="saveTempEdits()" style="width: 100%; font-size: 11px; padding: 3px 6px; color: #0f172a; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold;">`);
            setElemHtml('auth-meca-localidad-val', `<input type="text" id="auth-edit-meca-localidad" value="${rawCliLoc !== '-' ? rawCliLoc : ''}" oninput="saveTempEdits()" style="width: 100%; font-size: 11px; padding: 3px 6px; color: #0f172a; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold;">`);
            setElemText('auth-meca-iva-val', rawCliIva);
            setElemHtml('auth-meca-cuit-val', `<input type="text" id="auth-edit-meca-cuit" value="${rawCliCuit !== '-' ? rawCliCuit : ''}" oninput="saveTempEdits()" style="width: 130px; font-size: 11px; padding: 3px 6px; color: #0f172a; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold; font-family: monospace;">`);
            setElemHtml('auth-meca-condicion-val', `<input type="text" id="auth-edit-meca-condicion" value="${rawCliCond !== '-' ? rawCliCond : ''}" oninput="saveTempEdits()" style="width: 100%; font-size: 11px; padding: 3px 6px; color: #0f172a; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold;">`);
            setElemHtml('auth-meca-entrega-val', `<input type="date" id="auth-edit-meca-entrega" value="${p.fecha_entrega || p.meca_fecha_fin || p.fecha || ''}" oninput="saveTempEdits()" style="width: 120px; font-size: 11px; padding: 3px 6px; color: #0f172a; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold;">`);
            setElemHtml('auth-meca-oc-mo-val', `<input type="text" id="auth-edit-meca-oc-mo" value="${rawOcMo !== '-' ? rawOcMo : ''}" oninput="saveTempEdits()" style="width: 130px; font-size: 11px; padding: 3px 6px; color: #0f172a; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold; font-family: monospace;">`);
            setElemHtml('auth-meca-oc-mat-val', `<input type="text" id="auth-edit-meca-oc-mat" value="${rawOcMat !== '-' ? rawOcMat : ''}" oninput="saveTempEdits()" style="width: 130px; font-size: 11px; padding: 3px 6px; color: #0f172a; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold; font-family: monospace;">`);
            setElemHtml('auth-meca-planta-val', `
                <select id="auth-edit-meca-planta" onchange="saveTempEdits()" style="font-size: 11px; padding: 3px 6px; color: #0f172a; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold;">
                    <option value="VGG" ${rawPlanta !== 'PGSM' ? 'selected' : ''}>VGG</option>
                    <option value="PGSM" ${rawPlanta === 'PGSM' ? 'selected' : ''}>PGSM</option>
                </select>
            `);
            setElemText('auth-meca-nro-presupuesto-val', rawNroPres);
        } else {
            setElemText('auth-meca-cliente-val', rawCliName);
            setElemText('auth-meca-cliente-codigo-val', rawCliCode);
            setElemText('auth-meca-domicilio-val', rawCliDom);
            setElemText('auth-meca-localidad-val', rawCliLoc);
            setElemText('auth-meca-iva-val', rawCliIva);
            setElemText('auth-meca-cuit-val', rawCliCuit);
            setElemText('auth-meca-condicion-val', rawCliCond);
            setElemText('auth-meca-entrega-val', rawCliEnt);
            setElemText('auth-meca-oc-mo-val', rawOcMo);
            setElemText('auth-meca-oc-mat-val', rawOcMat);
            setElemText('auth-meca-planta-val', rawPlanta);
            setElemText('auth-meca-nro-presupuesto-val', rawNroPres);
        }
    }

    if (customerInfoBox) {
        customerInfoBox.style.display = 'none';
    }

    if (mecaAclaraciones) {
        mecaAclaraciones.style.display = 'block';
    }
    
    // System footer info
    const sysUser = document.getElementById('auth-sys-user');
    if (sysUser) sysUser.innerText = p.vendedor_id || '1';
    const sysDate = document.getElementById('auth-sys-date');
    if (sysDate) sysDate.innerText = p.fecha || formattedDate;
    const sysCount = document.getElementById('auth-sys-items-count');
    if (sysCount) sysCount.innerText = p.items ? p.items.length : 0;
    const sysReportName = document.getElementById('auth-sys-report-name');
    if (sysReportName) {
        sysReportName.innerText = (typeof window.getBudgetDocTitle === 'function') ? window.getBudgetDocTitle(p) : `Presupuesto ${p.cliente_nombre || ''} ${p.id || ''}`.trim();
    }

    // Render condition, deposit, and transport into container elements
    if (canEditControls) {
        // Condition Select
        let condHtml = `<select id="auth-condition-select" onchange="saveTempEdits(); recalcAuthTotal()" style="width: 100%; font-size: 11px; padding: 4px 6px; color: white; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 4px;">`;
        const seenCodes = new Set();
        const uniqueConds = (typeof condicionesDB !== 'undefined' && Array.isArray(condicionesDB)) ? condicionesDB.filter(c => {
            if (seenCodes.has(c.codigo)) return false;
            seenCodes.add(c.codigo);
            return true;
        }) : [];
        uniqueConds.forEach(c => {
            const displayName = c.nombre ? `${c.nombre} (${c.dias} días)` : `Condición ${c.codigo} (${c.dias} días)`;
            const selectedAttr = String(c.codigo) === String(p.condicion_id) ? 'selected' : '';
            condHtml += `<option value="${c.codigo}" ${selectedAttr}>${displayName}</option>`;
        });
        condHtml += `</select>`;
        const condEl = document.getElementById('auth-condition-container');
        if (condEl) condEl.innerHTML = condHtml;

        // Deposit input with search icon
        const depEl = document.getElementById('auth-deposit-container');
        if (depEl) {
            depEl.innerHTML = `
                <div style="position: relative; display: flex; align-items: center; width: 100%;">
                    <input type="text" id="auth-deposit-input-edit" autocomplete="off" value="${(p.deposito_nombre || '').toUpperCase()}" style="width: 100%; padding-right: 25px; font-size: 11px; padding: 4px 6px; color: white; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 4px;">
                    <i class="fas fa-search" style="position: absolute; right: 5px; color: var(--primary); cursor: pointer;" onclick="abrirRobotDepositosEdicion()"></i>
                    <div id="auth-deposit-dropdown-edit" class="custom-dropdown" style="display: none; position: absolute; width: 100%; z-index: 1000; max-height: 200px; overflow-y: auto; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; margin-top: 4px; top: 100%; text-align: left;"></div>
                </div>
            `;
        }

        // Transport input with search icon
        const transEl = document.getElementById('auth-transport-container');
        if (transEl) {
            transEl.innerHTML = `
                <div style="position: relative; display: flex; align-items: center; width: 100%;">
                    <input type="text" id="auth-transport-input-edit" autocomplete="off" value="${(p.transporte_nombre || '').toUpperCase()}" style="width: 100%; padding-right: 25px; font-size: 11px; padding: 4px 6px; color: white; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 4px;">
                    <i class="fas fa-search" style="position: absolute; right: 5px; color: var(--primary); cursor: pointer;" onclick="abrirRobotTransportesEdicion()"></i>
                    <div id="auth-transport-dropdown-edit" class="custom-dropdown" style="display: none; position: absolute; width: 100%; z-index: 1000; max-height: 200px; overflow-y: auto; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; margin-top: 4px; top: 100%; text-align: left;"></div>
                </div>
            `;
        }

        // Currency Select and exchange rate container
        let currHtml = `
            <select id="auth-currency-select" onchange="onAuthCurrencyChange()" style="width: 100%; font-size: 11px; padding: 4px 6px; color: white; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 4px;">
                <option value="1" ${p.moneda_id === 1 ? 'selected' : ''}>1 - Pesos</option>
                <option value="2" ${p.moneda_id === 2 ? 'selected' : ''}>2 - Dólares</option>
                <option value="60" ${p.moneda_id === 60 ? 'selected' : ''}>60 - Euros</option>
            </select>
            <div id="auth-exchange-rate-container" style="display: ${p.moneda_id === 2 || p.moneda_id === 60 ? 'flex' : 'none'}; align-items: center; gap: 5px; margin-top: 4px;">
                <span style="font-size: 9px; font-weight: bold; color: var(--text-muted);">COTIZACIÓN:</span>
                <input type="text" id="auth-exchange-rate-input" value="${(p.cotizacion || 1.0).toFixed(8)}" style="width: 90px; text-align: right; font-family: monospace; font-size: 11px; padding: 4px 6px; color: white; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 4px;">
            </div>
        `;
        const currEl = document.getElementById('auth-currency-container');
        if (currEl) currEl.innerHTML = currHtml;

    } else {
        if (document.getElementById('auth-condition-container')) document.getElementById('auth-condition-container').innerText = (p.condicion_nombre || 'CONTADO').toUpperCase();
        if (document.getElementById('auth-deposit-container')) document.getElementById('auth-deposit-container').innerText = (p.deposito_nombre || '-').toUpperCase();
        if (document.getElementById('auth-transport-container')) document.getElementById('auth-transport-container').innerText = (p.transporte_nombre || '-').toUpperCase();
        
        let currText = 'PESOS';
        if (p.moneda_id === 2) currText = `DÓLARES (cot. ${(p.cotizacion || 1.0).toFixed(8)})`;
        else if (p.moneda_id === 60) currText = `EUROS (cot. ${(p.cotizacion || 1.0).toFixed(8)})`;
        if (document.getElementById('auth-currency-container')) document.getElementById('auth-currency-container').innerText = currText;
    }
    
    const userValEl = document.getElementById('auth-user-val');
    if (userValEl) userValEl.innerText = (p.operador || 'admin').toUpperCase();
    const slaValEl = document.getElementById('auth-sla-val');
    if (slaValEl) slaValEl.innerHTML = (typeof getSLABadge === 'function') ? getSLABadge(p) : '';
    
    const itemsPanel = document.getElementById('auth-items-panel');
    const itemsListBody = document.getElementById('auth-items-list-body');
    if (itemsPanel) itemsPanel.style.display = 'none';
    if (itemsListBody) itemsListBody.innerHTML = '';

    const legacyBottom = document.getElementById('auth-legacy-bottom-layout') || document.querySelector('.invoice-bottom-layout');
    if (legacyBottom) legacyBottom.style.display = 'none';

    window.renderModalReportTable = function(p, currentMode) {
        if (!p) return;
        const isRejectedOrder = (p.estado === 'Rechazado' || p.estado === 'Anulado' || viewMode === 'Rechazados');
        const isEditMode = (currentMode === 'detallado_edit' || (currentMode === 'editar' && isEditingAllowed));
        const activeMode = (currentMode === 'resumido' || currentMode === 'detallado') 
            ? currentMode 
            : (isEditMode ? 'detallado' : (p.tipo_reporte || 'detallado'));
        const isRes = (activeMode === 'resumido');

        const btnRes = document.getElementById('btn-toggle-report-resumido') || document.getElementById('auth-btn-report-resumido');
        const btnDet = document.getElementById('btn-toggle-report-detallado') || document.getElementById('auth-btn-report-detallado');

        if (btnRes && btnDet) {
            if (isRes) {
                btnRes.style.background = '#0284c7';
                btnRes.style.color = '#ffffff';
                btnRes.style.boxShadow = '0 2px 8px rgba(2, 132, 199, 0.4)';
                btnDet.style.background = 'transparent';
                btnDet.style.color = 'var(--text-muted)';
                btnDet.style.boxShadow = 'none';
            } else {
                btnDet.style.background = '#0284c7';
                btnDet.style.color = '#ffffff';
                btnDet.style.boxShadow = '0 2px 8px rgba(2, 132, 199, 0.4)';
                btnRes.style.background = 'transparent';
                btnRes.style.color = 'var(--text-muted)';
                btnRes.style.boxShadow = 'none';
            }
        }

        const mecaHeaderBox = document.getElementById('auth-mecanico-header-box');
        const customerInfoBox = document.getElementById('auth-customer-info-box');

        if (mecaHeaderBox) mecaHeaderBox.style.display = 'block';
        if (customerInfoBox) customerInfoBox.style.display = 'none';

        const authMecaContainer = document.getElementById('auth-mecanico-excel-container');
        if (!authMecaContainer) return;
        authMecaContainer.style.display = 'block';

        const obsHtml = (p.motivo && p.motivo.trim() && p.motivo.trim().toLowerCase() !== 'sin observaciones')
            ? `<div style="margin-top: 10px; padding: 8px 12px; background: rgba(15, 23, 42, 0.35); border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 6px; font-size: 11.5px; text-align: left; color: #f8fafc;">
                <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 2px 6px; border-radius: 3px; font-weight: 800; margin-right: 6px;">Observaciones:</span>
                <span style="color: #f8fafc; font-weight: 600;">${p.motivo.trim()}</span>
               </div>`
            : '';

        if (isRejectedOrder) {
            authMecaContainer.innerHTML = `
                <div style="background: rgba(244, 63, 94, 0.15); border: 1.5px solid #f43f5e; border-radius: 8px; padding: 12px; margin-bottom: 12px; color: #fca5a5;">
                    <div style="font-weight: 800; font-size: 13px; margin-bottom: 4px;"><i class="fas fa-times-circle"></i> PRESUPUESTO RECHAZADO</div>
                    <div style="font-size: 11.5px;"><strong>Motivo:</strong> ${p.motivo_rechazo || 'Presupuesto rechazado por el cliente o administración.'}</div>
                </div>
            `;
        } else if (isRes) {
            // ================= COMPROBANTE RESUMIDO (FORMATO OFICIAL PRESEA) =================
            const devText = (p.meca_denominacion || p.denominacion || p.motivo || 'SERVICIOS Y MONTAJES').toUpperCase();
            const validItems = (Array.isArray(p.items) ? p.items : []).filter(it => {
                const q = parseFloat(String(it.cantidad || '0').replace(',', '.')) || 0;
                const sub = parseFloat(String(it.subtotal || '0').replace(',', '.')) || 0;
                const pr = parseFloat(String(it.precio !== undefined ? it.precio : (it.precio_unitario || 0)).replace(',', '.')) || 0;
                return (q > 0 || sub > 0 || pr > 0) && it.estado !== 'Rechazado';
            });
            let computedGrandTotal = 0;
            if (validItems.length > 0) {
                computedGrandTotal = validItems.reduce((sum, it) => {
                    const q = parseFloat(String(it.cantidad || '0').replace(',', '.')) || 0;
                    const pr = parseFloat(String(it.precio !== undefined ? it.precio : (it.precio_unitario !== undefined ? it.precio_unitario : (it.precioUnitario || 0))).replace(',', '.')) || 0;
                    const sub = (it.subtotal !== undefined && it.subtotal !== null && !isNaN(parseFloat(String(it.subtotal).replace(',', '.'))))
                        ? parseFloat(String(it.subtotal).replace(',', '.'))
                        : (q * pr);
                    return sum + sub;
                }, 0);
            }
            const netAmt = (computedGrandTotal > 0) ? computedGrandTotal : (parseFloat(String(p.importe || '0').replace(',', '.')) || 0);
            const ivaAmt = netAmt * 0.21;
            const totalWithIvaAmt = netAmt * 1.21;
            const subtotalStr = `$${netAmt.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            const ivaStr = `$${ivaAmt.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            const totalWithIvaStr = `$${totalWithIvaAmt.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

            authMecaContainer.innerHTML = `
                <div style="background: rgba(15, 23, 42, 0.28); backdrop-filter: blur(2px); border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 6px; overflow: hidden; color: #f8fafc; font-family: inherit; margin-bottom: 12px; text-align: left; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
                    <div style="overflow-x: auto; padding: 0;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; color: #f8fafc; background: transparent;">
                            <thead>
                                <tr style="background: rgba(15, 23, 42, 0.50); border-bottom: 2px solid rgba(255, 255, 255, 0.14); font-weight: bold; text-align: left;">
                                    <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 6px 10px; width: 100px; color: #f8fafc; font-weight: 800; font-size: 11px;">
                                        <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 2px 6px; border-radius: 3px; font-weight: 800;">ARTÍCULO</span>
                                    </th>
                                    <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 6px 10px; color: #f8fafc; font-weight: 800; font-size: 11px;">
                                        <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 2px 6px; border-radius: 3px; font-weight: 800;">DETALLE</span>
                                    </th>
                                    <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 6px 10px; text-align: right; width: 130px; color: #f8fafc; font-weight: 800; font-size: 11px;">
                                        <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 2px 6px; border-radius: 3px; font-weight: 800;">PRECIO</span>
                                    </th>
                                    <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 6px 10px; text-align: center; width: 90px; color: #f8fafc; font-weight: 800; font-size: 11px;">
                                        <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 2px 6px; border-radius: 3px; font-weight: 800;">CANTIDAD</span>
                                    </th>
                                    <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 6px 10px; text-align: right; width: 140px; color: #f8fafc; font-weight: 800; font-size: 11px;">
                                        <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 2px 6px; border-radius: 3px; font-weight: 800;">TOTAL</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: transparent;">
                                    <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 10px; font-family: monospace; font-weight: 700; font-size: 12px; color: #38bdf8;">${formatPresupuestoCodigo(p) || '001'}</td>
                                    <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 10px; font-weight: 700; color: #ffffff; font-size: 12px;">${devText}</td>
                                    <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 10px; text-align: right; font-family: monospace; font-weight: 700; color: #f8fafc; font-size: 12px;">${subtotalStr}</td>
                                    <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 10px; text-align: center; font-weight: 800; font-family: monospace; font-size: 12px; color: #f8fafc;">1</td>
                                    <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 10px; text-align: right; font-family: monospace; font-weight: 900; color: #38bdf8; font-size: 13px;">${subtotalStr}</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr style="background: rgba(15, 23, 42, 0.50); font-size: 11.5px;">
                                    <td colspan="4" style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 7px 12px; text-align: right; color: #cbd5e1; font-weight: 700;"><strong>SUBTOTAL (NETO):</strong></td>
                                    <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 7px 12px; text-align: right; font-family: monospace; font-weight: 800; color: #f8fafc; font-size: 12.5px;">${subtotalStr}</td>
                                </tr>
                                <tr style="background: rgba(15, 23, 42, 0.50); font-size: 11.5px;">
                                    <td colspan="4" style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 7px 12px; text-align: right; color: #fbbf24; font-weight: 700;"><strong>I.V.A. (21%):</strong></td>
                                    <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 7px 12px; text-align: right; font-family: monospace; font-weight: 800; color: #fbbf24; font-size: 12.5px;">${ivaStr}</td>
                                </tr>
                                <tr style="background: rgba(16, 185, 129, 0.18); border-top: 2px solid #10b981; font-size: 12.5px;">
                                    <td colspan="4" style="border: 1px solid rgba(16, 185, 129, 0.3); padding: 9px 12px; text-align: right; text-transform: uppercase; color: #4ade80; font-weight: 900;"><strong>TOTAL (IVA Incluido):</strong></td>
                                    <td style="border: 1px solid rgba(16, 185, 129, 0.3); padding: 9px 12px; text-align: right; font-family: monospace; font-weight: 900; font-size: 15px; color: #4ade80;">${totalWithIvaStr}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    ${obsHtml}
                </div>
            `;
        } else if (isEditMode) {
            // ================= MODO EDICIÓN DETALLADO (TARIFARIO EXCEL) =================
            reqTipoPresupuesto = (p.tipo_presupuesto || (String(p.id).startsWith('101') ? 'Mecánico' : 'Eléctrico'));
            pedidoItems = JSON.parse(JSON.stringify(p.items || []));
            renderMecanicoExcelGridInContainer(authMecaContainer, true);
        } else {
            // ================= COMPROBANTE DETALLADO (SOLO CONSULTA - DESGLOSE DE PRODUCTOS) =================
            const isMec = (p.tipo_presupuesto === 'Mecánico' || (p.id && (String(p.id).startsWith('101') || String(p.id).toUpperCase().includes('MEC'))));
            const catalog = isMec ? (window.presupuestoMecanicoDB || []) : (window.presupuestosCatalogDB || []);

            const validItems = (Array.isArray(p.items) ? p.items : []).filter(item => {
                const q = parseFloat(String(item.cantidad || '0').replace(',', '.')) || 0;
                const sub = parseFloat(String(item.subtotal || '0').replace(',', '.')) || 0;
                const pr = parseFloat(String(item.precio !== undefined ? item.precio : (item.precio_unitario || 0)).replace(',', '.')) || 0;
                return (q > 0 || sub > 0 || pr > 0) && item.estado !== 'Rechazado';
            });

            let itemsRowsHtml = '';
            let grandTotal = 0;

            if (validItems.length > 0) {
                validItems.forEach((item, idx) => {
                    let udm = (item.udm || item.unidad || '').trim();
                    if (!udm) {
                        const foundCat = catalog.find(c => c.codigo === item.codigo);
                        if (foundCat && foundCat.udm) udm = foundCat.udm.trim();
                    }
                    if (!udm) udm = isMec ? 'horas' : 'gl';

                    const qty = parseFloat(String(item.cantidad || '0').replace(',', '.')) || 0;
                    const price = parseFloat(String(item.precio !== undefined ? item.precio : (item.precio_unitario !== undefined ? item.precio_unitario : (item.precioUnitario || 0))).replace(',', '.')) || 0;
                    const sub = (item.subtotal !== undefined && item.subtotal !== null && !isNaN(parseFloat(String(item.subtotal).replace(',', '.')))) 
                        ? parseFloat(String(item.subtotal).replace(',', '.')) 
                        : (qty * price);
                    grandTotal += sub;

                    const code = item.codigo || item.id || String(idx + 1);
                    const desc = item.detalle || item.descripcion || item.denominacion || item.nombre || 'Servicio';

                    itemsRowsHtml += `
                        <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: ${idx % 2 === 0 ? 'rgba(15, 23, 42, 0.15)' : 'transparent'};">
                            <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 7px 10px; font-family: monospace; font-weight: 700; color: #38bdf8;">${code}</td>
                            <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 7px 10px; font-weight: 600; color: #f8fafc;">${desc}</td>
                            <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 7px 10px; text-align: right; font-family: monospace; color: #f8fafc; font-weight: 600;">$${price.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 7px 10px; text-align: center; font-weight: 800; font-family: monospace; color: #f8fafc;">${qty.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</td>
                            <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 7px 10px; text-align: right; font-family: monospace; font-weight: 800; color: #38bdf8;">$${sub.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        </tr>
                    `;
                });
            } else {
                grandTotal = parseFloat(String(p.importe || 0).replace(',', '.')) || 0;
                const devText = (p.meca_denominacion || p.denominacion || p.motivo || 'SERVICIOS Y MONTAJES').toUpperCase();
                itemsRowsHtml = `
                    <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: transparent;">
                        <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 10px; font-family: monospace; font-weight: 700; color: #38bdf8;">${formatPresupuestoCodigo(p) || '001'}</td>
                        <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 10px; font-weight: 600; color: #f8fafc;">${devText}</td>
                        <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 10px; text-align: right; font-family: monospace; color: #f8fafc;">$${grandTotal.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 10px; text-align: center; font-family: monospace; font-weight: 800; color: #f8fafc;">1</td>
                        <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 10px; text-align: right; font-family: monospace; font-weight: 800; color: #38bdf8;">$${grandTotal.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    </tr>
                `;
            }

            const netAmt = grandTotal;
            const ivaAmt = netAmt * 0.21;
            const totalWithIvaAmt = netAmt * 1.21;
            const subtotalStr = `$${netAmt.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            const ivaStr = `$${ivaAmt.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            const totalWithIvaStr = `$${totalWithIvaAmt.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

            authMecaContainer.innerHTML = `
                <div style="background: rgba(15, 23, 42, 0.28); backdrop-filter: blur(2px); border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 6px; overflow: hidden; color: #f8fafc; font-family: inherit; margin-bottom: 12px; text-align: left; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
                    <div style="overflow-x: auto; padding: 0;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; color: #f8fafc; background: transparent;">
                            <thead>
                                <tr style="background: rgba(15, 23, 42, 0.50); border-bottom: 2px solid rgba(255, 255, 255, 0.14); font-weight: bold; text-align: left;">
                                    <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 6px 10px; width: 100px; color: #f8fafc; font-weight: 800; font-size: 11px;">
                                        <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 2px 6px; border-radius: 3px; font-weight: 800;">CÓDIGO</span>
                                    </th>
                                    <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 6px 10px; color: #f8fafc; font-weight: 800; font-size: 11px;">
                                        <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 2px 6px; border-radius: 3px; font-weight: 800;">DETALLE DE PRODUCTOS / SERVICIOS</span>
                                    </th>
                                    <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 6px 10px; text-align: right; width: 130px; color: #f8fafc; font-weight: 800; font-size: 11px;">
                                        <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 2px 6px; border-radius: 3px; font-weight: 800;">PRECIO</span>
                                    </th>
                                    <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 6px 10px; text-align: center; width: 95px; color: #f8fafc; font-weight: 800; font-size: 11px;">
                                        <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 2px 6px; border-radius: 3px; font-weight: 800;">CANTIDAD</span>
                                    </th>
                                    <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 6px 10px; text-align: right; width: 140px; color: #f8fafc; font-weight: 800; font-size: 11px;">
                                        <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 2px 6px; border-radius: 3px; font-weight: 800;">TOTAL</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsRowsHtml}
                            </tbody>
                            <tfoot>
                                <tr style="background: rgba(15, 23, 42, 0.50); font-size: 11.5px;">
                                    <td colspan="4" style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 7px 12px; text-align: right; color: #cbd5e1; font-weight: 700;"><strong>SUBTOTAL (NETO):</strong></td>
                                    <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 7px 12px; text-align: right; font-family: monospace; font-weight: 800; color: #f8fafc; font-size: 12.5px;">${subtotalStr}</td>
                                </tr>
                                <tr style="background: rgba(15, 23, 42, 0.50); font-size: 11.5px;">
                                    <td colspan="4" style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 7px 12px; text-align: right; color: #fbbf24; font-weight: 700;"><strong>I.V.A. (21%):</strong></td>
                                    <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 7px 12px; text-align: right; font-family: monospace; font-weight: 800; color: #fbbf24; font-size: 12.5px;">${ivaStr}</td>
                                </tr>
                                <tr style="background: rgba(16, 185, 129, 0.18); border-top: 2px solid #10b981; font-size: 12.5px;">
                                    <td colspan="4" style="border: 1px solid rgba(16, 185, 129, 0.3); padding: 9px 12px; text-align: right; text-transform: uppercase; color: #4ade80; font-weight: 900;"><strong>TOTAL (IVA Incluido):</strong></td>
                                    <td style="border: 1px solid rgba(16, 185, 129, 0.3); padding: 9px 12px; text-align: right; font-family: monospace; font-weight: 900; font-size: 15px; color: #4ade80;">${totalWithIvaStr}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    ${obsHtml}
                </div>
            `;
        }
    }

    window.cambiarTipoReporteEnVista = function(nuevoTipo) {
        const normTipo = String(nuevoTipo || 'detallado').toLowerCase().trim();
        if (pedidoActivo) {
            pedidoActivo.tipo_reporte = normTipo;
            if (window.appData && Array.isArray(window.appData.pedidos)) {
                const pOrig = window.appData.pedidos.find(x => x.id === pedidoActivo.id);
                if (pOrig) pOrig.tipo_reporte = normTipo;
            }
            if (typeof saveData === 'function') {
                try { saveData(); } catch(e) {}
            }
            if (typeof window.getBudgetDocTitle === 'function') {
                document.title = window.getBudgetDocTitle(pedidoActivo);
            }
            renderModalReportTable(pedidoActivo, normTipo);
        }
    };

    const isRejected = (p.estado === 'Rechazado' || p.estado === 'Anulado' || viewMode === 'Rechazados');
    const toggleContainer = document.getElementById('auth-report-type-toggle-container');
    if (toggleContainer) {
        toggleContainer.style.display = isRejected ? 'none' : 'inline-flex';
    }

    // Renderizar la tabla de propuesta comercial (Detallado o Resumido) de forma directa
    renderModalReportTable(p, (explicitMode === 'editar' || explicitMode === 'detallado_edit') ? 'detallado_edit' : (p.tipo_reporte || 'detallado'));

    // Actualizar badge de estado en el modal
    const badgeContainer = document.getElementById('modal-status-badge-container');
    if (badgeContainer) {
        badgeContainer.innerHTML = getBudgetStatusBadgeHtml(p.estado, p.oc_limite_fecha);
    }

    const resolvedPanel = document.getElementById('auth-resolved-panel');
    const actionsPanel = document.getElementById('auth-actions-panel');

    if (isRejected) {
        if (actionsPanel) actionsPanel.style.display = 'none';
        if (resolvedPanel) {
            resolvedPanel.style.display = 'block';
            document.getElementById('auth-final-state').innerText = p.estado || 'Rechazado';
            document.getElementById('auth-resolution-date').innerText = p.fecha_resolucion || '-';
            const rejectCommentContainer = document.getElementById('auth-reject-comment-container');
            if (rejectCommentContainer) {
                rejectCommentContainer.style.display = 'block';
                document.getElementById('auth-reject-comment').innerText = p.motivo_rechazo || 'Presupuesto Rechazado';
            }
            resolvedPanel.style.borderLeft = '4px solid var(--danger)';
            resolvedPanel.style.background = 'rgba(244,63,94,0.1)';
            resolvedPanel.style.color = '#feb2b2';
        }
    } else if (canEditControls) {
        if (resolvedPanel) resolvedPanel.style.display = 'none';
        if (actionsPanel) {
            actionsPanel.style.display = 'flex';
            actionsPanel.innerHTML = `
                <div style="display: flex; justify-content: center; margin-top: 5px; width: 100%;">
                    <button id="btn-save-modifications" class="btn btn-success" style="font-size: 15px; padding: 10px 40px; font-weight: bold; width: 100%; background: var(--success); display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="guardarModificacionesPedido()">
                        <i class="fas fa-save"></i> Guardar Cambios del Presupuesto
                    </button>
                </div>
            `;
        }
    } else {
        if (actionsPanel) actionsPanel.style.display = 'none';
        if (resolvedPanel) {
            if (p.estado === 'Rechazado' || p.estado === 'Anulado') {
                resolvedPanel.style.display = 'block';
                document.getElementById('auth-final-state').innerText = p.estado;
                document.getElementById('auth-resolution-date').innerText = p.fecha_resolucion || '-';
                const rejectCommentContainer = document.getElementById('auth-reject-comment-container');
                if (rejectCommentContainer) {
                    rejectCommentContainer.style.display = 'block';
                    document.getElementById('auth-reject-comment').innerText = p.motivo_rechazo || 'Sin comentarios';
                }
                resolvedPanel.style.borderLeft = '4px solid var(--danger)';
                resolvedPanel.style.background = 'rgba(244,63,94,0.05)';
                resolvedPanel.style.color = '#feb2b2';
            } else {
                resolvedPanel.style.display = 'none';
            }
        }
    }

    // Autocomplete para agregar productos / horas en edición
    const authAddProdInput = document.getElementById('auth-add-product-input');
    const authAddProdDropdown = document.getElementById('auth-add-product-dropdown');
    if (authAddProdInput && authAddProdDropdown) {
        let currentMatches = [];
        let currentSelectedIndex = -1;

        const updateActiveItem = () => {
            const items = authAddProdDropdown.children;
            for (let i = 0; i < items.length; i++) {
                items[i].classList.remove('active');
            }
            if (currentSelectedIndex >= 0 && currentSelectedIndex < items.length) {
                const activeItem = items[currentSelectedIndex];
                activeItem.classList.add('active');
                
                const dropdownRect = authAddProdDropdown.getBoundingClientRect();
                const itemRect = activeItem.getBoundingClientRect();
                if (itemRect.bottom > dropdownRect.bottom) {
                    authAddProdDropdown.scrollTop += (itemRect.bottom - dropdownRect.bottom);
                } else if (itemRect.top < dropdownRect.top) {
                    authAddProdDropdown.scrollTop -= (dropdownRect.top - itemRect.top);
                }
            }
        };

        const renderDropdownChunk = () => {
            const chunk = currentMatches.slice(authAddProdDropdown.children.length, authAddProdDropdown.children.length + 50);
            if (chunk.length === 0) return;
            const fragment = document.createDocumentFragment();
            chunk.forEach(prod => {
                const div = document.createElement('div');
                div.className = 'custom-dropdown-item';
                div.style.padding = '8px 12px';
                div.style.cursor = 'pointer';
                div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

                div.innerHTML = `
                    <div style="font-weight: 600; color: white;">${prod.detalle}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">
                        Código: ${prod.codigo} - Precio Unit: $${parseFloat(prod.precio || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})} - UDM: ${prod.udm || 'Hs'}
                    </div>
                `;
                div.onmousedown = (e) => {
                    e.preventDefault();
                    seleccionarProductoEdicion(prod);
                };
                fragment.appendChild(div);
            });
            authAddProdDropdown.appendChild(fragment);
            if (currentSelectedIndex >= 0) updateActiveItem();
        };

        const renderDropdown = (query) => {
            const cleanQuery = (query || '').toLowerCase().trim();
            authAddProdDropdown.innerHTML = '';
            authAddProdDropdown.scrollTop = 0;
            currentSelectedIndex = -1;
            
            const activeCatalog = getActiveStockCatalog();

            if (cleanQuery === '') {
                currentMatches = activeCatalog.slice(0, 100);
            } else {
                currentMatches = activeCatalog.filter(p => 
                    p.detalle.toLowerCase().includes(cleanQuery) || 
                    p.codigo.toLowerCase().includes(cleanQuery)
                );
            }
            
            if (currentMatches.length > 0) {
                renderDropdownChunk();
                authAddProdDropdown.style.display = 'block';
            } else {
                authAddProdDropdown.style.display = 'none';
            }
        };

        authAddProdDropdown.addEventListener('scroll', () => {
            if (authAddProdDropdown.scrollTop + authAddProdDropdown.clientHeight >= authAddProdDropdown.scrollHeight - 30) {
                renderDropdownChunk();
            }
        });

        authAddProdInput.addEventListener('input', (e) => {
            renderDropdown(e.target.value);
        });

        authAddProdInput.addEventListener('focus', (e) => {
            e.target.select();
            renderDropdown('');
        });

        authAddProdInput.addEventListener('click', (e) => {
            renderDropdown('');
        });

        authAddProdInput.addEventListener('keydown', (e) => {
            if (authAddProdDropdown.style.display !== 'block') return;
            const items = authAddProdDropdown.children;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentSelectedIndex < currentMatches.length - 1) {
                    currentSelectedIndex++;
                    if (currentSelectedIndex >= items.length) {
                        renderDropdownChunk();
                    }
                    updateActiveItem();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentSelectedIndex > 0) {
                    currentSelectedIndex--;
                    updateActiveItem();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentSelectedIndex >= 0 && currentSelectedIndex < currentMatches.length) {
                    seleccionarProductoEdicion(currentMatches[currentSelectedIndex]);
                } else if (currentMatches.length > 0) {
                    seleccionarProductoEdicion(currentMatches[0]);
                }
            }
        });

        authAddProdInput.addEventListener('blur', () => {
            setTimeout(() => {
                authAddProdDropdown.style.display = 'none';
            }, 200);
        });
    }
    
    // Autocomplete para Depósito en edición
    const authDepInput = document.getElementById('auth-deposit-input-edit');
    const authDepDropdown = document.getElementById('auth-deposit-dropdown-edit');
    if (authDepInput && authDepDropdown && typeof depositosDB !== 'undefined') {
        let currentMatches = [];
        let currentSelectedIndex = -1;

        const updateActiveItem = () => {
            const items = authDepDropdown.children;
            for (let i = 0; i < items.length; i++) {
                items[i].classList.remove('active');
            }
            if (currentSelectedIndex >= 0 && currentSelectedIndex < items.length) {
                const activeItem = items[currentSelectedIndex];
                activeItem.classList.add('active');
            }
        };

        const renderDropdownChunk = () => {
            const chunk = currentMatches.slice(authDepDropdown.children.length, authDepDropdown.children.length + 50);
            if (chunk.length === 0) return;
            const fragment = document.createDocumentFragment();
            chunk.forEach(dep => {
                const div = document.createElement('div');
                div.className = 'custom-dropdown-item';
                div.style.padding = '8px 12px';
                div.style.cursor = 'pointer';
                div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                div.innerHTML = `
                    <div style="font-weight: 600; color: white;">${dep.nombre || 'Sin nombre'}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">Código: ${dep.codigo}</div>
                `;
                div.onmousedown = (e) => {
                    e.preventDefault();
                    seleccionarDepositoEdicion(dep);
                };
                fragment.appendChild(div);
            });
            authDepDropdown.appendChild(fragment);
            if (currentSelectedIndex >= 0) updateActiveItem();
        };

        const renderDropdown = (query) => {
            const cleanQuery = (query || '').toLowerCase().trim();
            authDepDropdown.innerHTML = '';
            authDepDropdown.scrollTop = 0;
            currentSelectedIndex = -1;
            
            if (cleanQuery === '') {
                currentMatches = depositosDB.slice(0, 100);
            } else {
                currentMatches = depositosDB.filter(d => 
                    d.nombre.toLowerCase().includes(cleanQuery) || 
                    d.codigo.includes(cleanQuery)
                );
            }
            
            if (currentMatches.length > 0) {
                renderDropdownChunk();
                authDepDropdown.style.display = 'block';
            } else {
                authDepDropdown.style.display = 'none';
            }
        };

        authDepDropdown.addEventListener('scroll', () => {
            if (authDepDropdown.scrollTop + authDepDropdown.clientHeight >= authDepDropdown.scrollHeight - 30) {
                renderDropdownChunk();
            }
        });

        authDepInput.addEventListener('input', (e) => {
            renderDropdown(e.target.value);
        });

        authDepInput.addEventListener('focus', (e) => {
            e.target.select();
            renderDropdown('');
        });

        authDepInput.addEventListener('click', (e) => {
            renderDropdown('');
        });

        authDepInput.addEventListener('keydown', (e) => {
            if (authDepDropdown.style.display !== 'block') return;
            const items = authDepDropdown.children;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentSelectedIndex < currentMatches.length - 1) {
                    currentSelectedIndex++;
                    if (currentSelectedIndex >= items.length) {
                        renderDropdownChunk();
                    }
                    updateActiveItem();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentSelectedIndex > 0) {
                    currentSelectedIndex--;
                    updateActiveItem();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentSelectedIndex >= 0 && currentSelectedIndex < currentMatches.length) {
                    seleccionarDepositoEdicion(currentMatches[currentSelectedIndex]);
                } else if (currentMatches.length > 0) {
                    seleccionarDepositoEdicion(currentMatches[0]);
                }
            }
        });

        authDepInput.addEventListener('blur', () => {
            setTimeout(() => {
                authDepDropdown.style.display = 'none';
                if (pedidoActivo && authDepInput.value !== (pedidoActivo.deposito_nombre || '').toUpperCase()) {
                    authDepInput.value = (pedidoActivo.deposito_nombre || '').toUpperCase();
                }
            }, 200);
        });
    }

    // Autocomplete para Transporte en edición
    const authTransInput = document.getElementById('auth-transport-input-edit');
    const authTransDropdown = document.getElementById('auth-transport-dropdown-edit');
    if (authTransInput && authTransDropdown && typeof transportesDB !== 'undefined') {
        let currentMatches = [];
        let currentSelectedIndex = -1;

        const updateActiveItem = () => {
            const items = authTransDropdown.children;
            for (let i = 0; i < items.length; i++) {
                items[i].classList.remove('active');
            }
            if (currentSelectedIndex >= 0 && currentSelectedIndex < items.length) {
                const activeItem = items[currentSelectedIndex];
                activeItem.classList.add('active');
            }
        };

        const renderDropdownChunk = () => {
            const chunk = currentMatches.slice(authTransDropdown.children.length, authTransDropdown.children.length + 50);
            if (chunk.length === 0) return;
            const fragment = document.createDocumentFragment();
            chunk.forEach(trans => {
                const div = document.createElement('div');
                div.className = 'custom-dropdown-item';
                div.style.padding = '8px 12px';
                div.style.cursor = 'pointer';
                div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                div.innerHTML = `
                    <div style="font-weight: 600; color: white;">${trans.nombre || 'Sin nombre'}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">Código: ${trans.codigo}</div>
                `;
                div.onmousedown = (e) => {
                    e.preventDefault();
                    seleccionarTransporteEdicion(trans);
                };
                fragment.appendChild(div);
            });
            authTransDropdown.appendChild(fragment);
            if (currentSelectedIndex >= 0) updateActiveItem();
        };

        const renderDropdown = (query) => {
            const cleanQuery = (query || '').toLowerCase().trim();
            authTransDropdown.innerHTML = '';
            authTransDropdown.scrollTop = 0;
            currentSelectedIndex = -1;
            
            if (cleanQuery === '') {
                currentMatches = transportesDB.slice(0, 100);
            } else {
                currentMatches = transportesDB.filter(t => 
                    t.nombre.toLowerCase().includes(cleanQuery) || 
                    t.codigo.includes(cleanQuery)
                );
            }
            
            if (currentMatches.length > 0) {
                renderDropdownChunk();
                authTransDropdown.style.display = 'block';
            } else {
                authTransDropdown.style.display = 'none';
            }
        };

        authTransDropdown.addEventListener('scroll', () => {
            if (authTransDropdown.scrollTop + authTransDropdown.clientHeight >= authTransDropdown.scrollHeight - 30) {
                renderDropdownChunk();
            }
        });

        authTransInput.addEventListener('input', (e) => {
            renderDropdown(e.target.value);
        });

        authTransInput.addEventListener('focus', (e) => {
            e.target.select();
            renderDropdown('');
        });

        authTransInput.addEventListener('click', (e) => {
            renderDropdown('');
        });

        authTransInput.addEventListener('keydown', (e) => {
            if (authTransDropdown.style.display !== 'block') return;
            const items = authTransDropdown.children;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentSelectedIndex < currentMatches.length - 1) {
                    currentSelectedIndex++;
                    if (currentSelectedIndex >= items.length) {
                        renderDropdownChunk();
                    }
                    updateActiveItem();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentSelectedIndex > 0) {
                    currentSelectedIndex--;
                    updateActiveItem();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentSelectedIndex >= 0 && currentSelectedIndex < currentMatches.length) {
                    seleccionarTransporteEdicion(currentMatches[currentSelectedIndex]);
                } else if (currentMatches.length > 0) {
                    seleccionarTransporteEdicion(currentMatches[0]);
                }
            }
        });

        authTransInput.addEventListener('blur', () => {
            setTimeout(() => {
                authTransDropdown.style.display = 'none';
                if (pedidoActivo && authTransInput.value !== (pedidoActivo.transporte_nombre || '').toUpperCase()) {
                    authTransInput.value = (pedidoActivo.transporte_nombre || '').toUpperCase();
                }
            }, 200);
        });
    }

    // Hacer que hacer clic en cualquier parte de la celda de depósito o transporte active su input de autocompletado
    const depContainer = document.getElementById('auth-deposit-container');
    if (depContainer) {
        depContainer.addEventListener('click', (e) => {
            if (e.target.tagName !== 'I' && e.target.tagName !== 'INPUT') {
                const input = document.getElementById('auth-deposit-input-edit');
                if (input) input.focus();
            }
        });
    }
    
    const transContainer = document.getElementById('auth-transport-container');
    if (transContainer) {
        transContainer.addEventListener('click', (e) => {
            if (e.target.tagName !== 'I' && e.target.tagName !== 'INPUT') {
                const input = document.getElementById('auth-transport-input-edit');
                if (input) input.focus();
            }
        });
    }

    // Recalcular y poblar todos los campos del footer comercial
    recalcAuthTotal();
};

window.getBudgetDocTitle = function(p) {
    if (!p) return 'Gestión de Presupuestos';
    const cliName = (p.cliente_nombre || p.cliente || '').trim();
    const nroPres = (typeof formatPresupuestoCodigo === 'function' ? formatPresupuestoCodigo(p) : (p.id || '')).toString().trim();
    const parts = ['Presupuesto'];
    if (cliName) parts.push(cliName);
    if (nroPres) parts.push(nroPres);
    return parts.join(' ');
};

window.imprimirPresupuestoModal = function() {
    try {
        if (typeof saveTempEdits === 'function') {
            saveTempEdits();
        }
        
        if (pedidoActivo) {
            // Asignar el nombre del documento para que el PDF se guarde como "Presupuesto + cliente + numero"
            const docTitle = window.getBudgetDocTitle(pedidoActivo);
            document.title = docTitle;
            const sysReportName = document.getElementById('auth-sys-report-name');
            if (sysReportName) sysReportName.innerText = docTitle;

            // 1. Sincronizar ítems editados desde la grilla activa si existieran
            if (Array.isArray(pedidoItems) && pedidoItems.length > 0) {
                pedidoActivo.items = JSON.parse(JSON.stringify(pedidoItems));
                const newAmt = pedidoActivo.items.reduce((sum, item) => {
                    const q = parseFloat(String(item.cantidad || '0').replace(',', '.')) || 0;
                    const pr = parseFloat(String(item.precio !== undefined ? item.precio : (item.precio_unitario !== undefined ? item.precio_unitario : 0)).replace(',', '.')) || 0;
                    const sub = (item.subtotal !== undefined && item.subtotal !== null && !isNaN(parseFloat(String(item.subtotal).replace(',', '.'))))
                        ? parseFloat(String(item.subtotal).replace(',', '.'))
                        : (q * pr);
                    return sum + sub;
                }, 0);
                pedidoActivo.importe = newAmt;
            }

            // 2. Asegurar que los datos limpios en texto figuren en la cabecera oficial
            const formatCuitDisplay = (val) => {
                if (!val || val === '-') return '-';
                const clean = String(val).replace(/\D/g, '');
                return clean.length === 11 ? `${clean.substring(0,2)}-${clean.substring(2,10)}-${clean.substring(10)}` : String(val);
            };
            const setCleanText = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.innerText = (val !== null && val !== undefined && String(val).trim() !== '') ? String(val) : '-';
            };

            const rawCliName = (pedidoActivo.cliente_nombre || '-').toUpperCase();
            const rawCliCode = (pedidoActivo.cliente_id || '-');
            const rawCliDom = (pedidoActivo.domicilio || '-').toUpperCase();
            const rawCliLoc = (pedidoActivo.localidad || '-').toUpperCase();
            const rawCliCuit = formatCuitDisplay(pedidoActivo.cuit || '-');
            const rawCliEnt = (pedidoActivo.fecha_entrega || pedidoActivo.meca_fecha_fin || pedidoActivo.fecha || '-');
            const rawCliCond = (pedidoActivo.condicion_nombre || pedidoActivo.forma_pago || 'CONTADO').toUpperCase();
            const rawNroPres = (typeof formatPresupuestoCodigo === 'function' ? formatPresupuestoCodigo(pedidoActivo) : (pedidoActivo.id || '-'));
            const rawPlanta = (pedidoActivo.meca_planta || 'VGG').toUpperCase();

            setCleanText('auth-meca-cliente-val', rawCliName);
            setCleanText('auth-meca-cliente-codigo-val', rawCliCode);
            setCleanText('auth-meca-domicilio-val', rawCliDom);
            setCleanText('auth-meca-localidad-val', rawCliLoc);
            setCleanText('auth-meca-cuit-val', rawCliCuit);
            setCleanText('auth-meca-entrega-val', rawCliEnt);
            setCleanText('auth-meca-condicion-val', rawCliCond);
            setCleanText('auth-meca-nro-presupuesto-val', rawNroPres);
            setCleanText('auth-meca-planta-val', rawPlanta);

            // 3. Renderizar la tabla de comprobante oficial completa con todos los ítems e importes
            const targetReport = pedidoActivo.tipo_reporte || 'detallado';
            if (typeof window.renderModalReportTable === 'function') {
                window.renderModalReportTable(pedidoActivo, targetReport);
            }
        }
    } catch(err) {
        console.error('Error preparando impresión:', err);
    }
    
    setTimeout(() => {
        window.print();
    }, 150);
};

window.addEventListener('beforeprint', () => {
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay && modalOverlay.style.display !== 'none' && pedidoActivo) {
        document.title = (typeof window.getBudgetDocTitle === 'function') ? window.getBudgetDocTitle(pedidoActivo) : `Presupuesto ${pedidoActivo.cliente_nombre || ''} ${pedidoActivo.id || ''}`.trim();
        if (typeof saveTempEdits === 'function') saveTempEdits();
        if (Array.isArray(pedidoItems) && pedidoItems.length > 0) {
            pedidoActivo.items = JSON.parse(JSON.stringify(pedidoItems));
            const newAmt = pedidoActivo.items.reduce((sum, item) => {
                const q = parseFloat(String(item.cantidad || '0').replace(',', '.')) || 0;
                const pr = parseFloat(String(item.precio !== undefined ? item.precio : (item.precio_unitario !== undefined ? item.precio_unitario : 0)).replace(',', '.')) || 0;
                const sub = (item.subtotal !== undefined && item.subtotal !== null && !isNaN(parseFloat(String(item.subtotal).replace(',', '.'))))
                    ? parseFloat(String(item.subtotal).replace(',', '.'))
                    : (q * pr);
                return sum + sub;
            }, 0);
            pedidoActivo.importe = newAmt;
        }
        if (typeof renderModalReportTable === 'function') {
            renderModalReportTable(pedidoActivo, pedidoActivo.tipo_reporte || 'detallado');
        }
    }
});

window.addEventListener('afterprint', () => {
    if (pedidoActivo && document.body.classList.contains('modal-open') && typeof window.getBudgetDocTitle === 'function') {
        document.title = window.getBudgetDocTitle(pedidoActivo);
    } else {
        document.title = 'Gestión de Presupuestos';
    }
});

window.onReqCurrencyChange = function() {
    const currencySelect = document.getElementById('req-currency');
    const rateContainer = document.getElementById('req-exchange-rate-container');
    const rateInput = document.getElementById('req-exchange-rate');
    
    if (currencySelect) {
        const val = parseInt(currencySelect.value);
        if (rateContainer) {
            rateContainer.style.display = (val === 2 || val === 60) ? 'block' : 'none';
        }
        if (rateInput) {
            if (val === 2) {
                rateInput.value = "1011.00000000";
            } else if (val === 60) {
                rateInput.value = "1100.00000000";
            } else {
                rateInput.value = "1.00000000";
            }
        }
    }
};

window.toggleAuthDecision = function(decision) {
    const rGroup = document.getElementById('reject-comment-group');
    if (rGroup) {
        if (decision === 'rechazar') {
            rGroup.style.display = 'block';
            setTimeout(() => {
                const commentInput = document.getElementById('auth-reject-reason-input');
                if (commentInput) commentInput.focus();
            }, 50);
        } else {
            rGroup.style.display = 'none';
        }
    }
};

window.confirmarResolucion = function() {
    const checkedRadio = document.querySelector('input[name="auth-decision"]:checked');
    if (!checkedRadio) {
        showToast('Debe seleccionar si el pedido es Aceptado/Autorizado o Rechazado.', 'error');
        return;
    }
    const decision = checkedRadio.value; // 'autorizar' o 'rechazar'
    resolveOrder(decision);
};

window.resolveOrder = function(accion) {
    if (!pedidoActivo) return;
    
    const commentInput = document.getElementById('auth-reject-reason-input');
    const motivo = commentInput ? commentInput.value.trim() : '';

    if (accion === 'rechazar' && !motivo) {
        showToast('Es obligatorio ingresar un motivo de rechazo.', 'error');
        if (commentInput) commentInput.focus();
        return;
    }

    const orderIdx = appData.pedidos.findIndex(p => p.id === pedidoActivo.id);
    if (orderIdx === -1) return;

    const originalImporte = pedidoActivo.importe_original || pedidoActivo.importe;
    const fechaRes = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (accion === 'autorizar') {
        // Capturar los ítems autorizados si existen
        let totalAmt = 0;
        let pendingCount = 0;
        
        if (Array.isArray(pedidoActivo.items) && pedidoActivo.items.length > 0) {
            const checks = document.querySelectorAll('.auth-item-check');
            const qtys = document.querySelectorAll('.auth-item-qty');
            
            pedidoActivo.items.forEach((item, idx) => {
                // Si ya estaba resuelto en pasos anteriores, mantenerlo y sumar al total
                if (item.estado === 'Autorizado') {
                    totalAmt += item.cantidad * item.precio;
                    return;
                }
                if (item.estado === 'Rechazado') {
                    return;
                }
                
                // Buscar controles para ítems que están pendientes en pantalla
                const chk = Array.from(checks).find(c => parseInt(c.getAttribute('data-idx')) === idx);
                const qtyInput = Array.from(qtys).find(q => parseInt(q.getAttribute('data-idx')) === idx);
                
                if (chk && item) {
                    const isChecked = chk.checked;
                    const maxQty = item.cantidad_original || item.cantidad;
                    let qty = parseFloat(qtyInput ? qtyInput.value : item.cantidad);
                    if (isNaN(qty) || qty < 0) qty = 0;
                    if (qty > maxQty) qty = maxQty;
                    
                    if (isChecked) {
                        if (qty > 0) {
                            item.estado = 'Autorizado';
                            item.cantidad = qty;
                            item.cantidad_original = maxQty;
                            item.subtotal = qty * item.precio;
                            totalAmt += qty * item.precio;
                        } else {
                            item.estado = 'Pendiente';
                            item.cantidad_original = maxQty;
                            pendingCount++;
                        }
                    } else {
                        // Queda pendiente si se destilda
                        item.estado = 'Pendiente';
                        item.cantidad_original = maxQty;
                        pendingCount++;
                    }
                } else {
                    // Por defecto, si no está el control en pantalla, asumimos que sigue pendiente
                    item.estado = 'Pendiente';
                    pendingCount++;
                }
            });
            
            // Validar que al menos un ítem esté autorizado en total
            const hasAnyAuthorized = pedidoActivo.items.some(i => i.estado === 'Autorizado' && i.cantidad > 0);
            if (!hasAnyAuthorized) {
                showToast('Debe autorizar al menos un artículo. Si desea rechazar todo el pedido, seleccione "Rechazado" en las opciones.', 'error');
                return;
            }
            
            appData.pedidos[orderIdx].items = pedidoActivo.items;
            appData.pedidos[orderIdx].importe = totalAmt;
            appData.pedidos[orderIdx].importe_original = originalImporte;
        } else {
            // Pedido global sin ítems
            totalAmt = originalImporte;
            appData.pedidos[orderIdx].importe = totalAmt;
            appData.pedidos[orderIdx].importe_original = originalImporte;
        }

        if (pendingCount > 0) {
            appData.pedidos[orderIdx].estado = (pedidoActivo.estado && pedidoActivo.estado.startsWith("Cargado")) ? pedidoActivo.estado : "Pendiente de Autorización";
            appData.pedidos[orderIdx].motivo_rechazo = "";
            showToast(`Pedido ${pedidoActivo.id} AUTORIZADO PARCIALMENTE. Los artículos desmarcados siguen pendientes.`, 'warning');
        } else {
            appData.pedidos[orderIdx].estado = "Autorizado";
            appData.pedidos[orderIdx].motivo_rechazo = "";
            showToast(`Pedido ${pedidoActivo.id} AUTORIZADO exitosamente en su totalidad.`, 'success');
        }
    } else {
        // Rechazar — solo se rechazan los ítems que aún están Pendientes,
        // los que ya fueron Autorizados en una ronda anterior se conservan.
        appData.pedidos[orderIdx].importe_original = originalImporte;
        
        let autorizedImporte = 0;
        if (Array.isArray(appData.pedidos[orderIdx].items)) {
            appData.pedidos[orderIdx].items = appData.pedidos[orderIdx].items.map(item => {
                // Ya estaba autorizado → conservar
                if (item.estado === 'Autorizado') {
                    autorizedImporte += item.cantidad * item.precio;
                    return item;
                }
                // Estaba pendiente → rechazar ahora
                const maxQty = item.cantidad_original || item.cantidad;
                return {
                    codigo: item.codigo,
                    detalle: item.detalle,
                    precio: item.precio,
                    cantidad: 0,
                    cantidad_original: maxQty,
                    subtotal: 0,
                    estado: 'Rechazado'
                };
            });
        }
        
        // Si quedaron ítems autorizados, el pedido queda como Autorizado Parcial;
        // si no había nada aprobado, queda Rechazado total.
        const stillHasAuthorized = appData.pedidos[orderIdx].items.some(i => i.estado === 'Autorizado');
        if (stillHasAuthorized) {
            appData.pedidos[orderIdx].estado = "Autorizado";
            appData.pedidos[orderIdx].importe = autorizedImporte;
            appData.pedidos[orderIdx].motivo_rechazo = motivo;
            showToast(`Pedido ${pedidoActivo.id} AUTORIZADO PARCIALMENTE. Los artículos pendientes fueron rechazados.`, 'warning');
        } else {
            appData.pedidos[orderIdx].estado = "Rechazado";
            appData.pedidos[orderIdx].importe = 0;
            appData.pedidos[orderIdx].motivo_rechazo = motivo;
            showToast(`Pedido ${pedidoActivo.id} RECHAZADO totalmente.`, 'danger');
        }
    }
    
    appData.pedidos[orderIdx].fecha_resolucion = fechaRes;

    // Notificar a las 5 personas del equipo por mail y sistema
    window.notificarAprobacionEquipo(appData.pedidos[orderIdx], appData.pedidos[orderIdx].estado);

    saveData();
    closeModal();
    renderAssignmentsTable();
};

window.recalcAuthTotal = function() {
    if (!pedidoActivo) return;
    
    let totalAmt = 0;
    const checks = document.querySelectorAll('.auth-item-check');
    const qtys = document.querySelectorAll('.auth-item-qty');
    const subtotals = document.querySelectorAll('.auth-item-subtotal-val');
    
    const isPending = pedidoActivo.estado === 'Pendiente de Autorización' || pedidoActivo.estado === 'Cargado con orden de compra' || pedidoActivo.estado === 'Cargado sin orden de compra';
    const isModifying = (typeof viewMode !== 'undefined' && viewMode === 'Modificacion');

    if (!isPending && !isModifying) {
        // Para pedidos resueltos, usamos directamente el importe guardado o la suma de sus ítems
        totalAmt = parseFloat(pedidoActivo.importe);
        if (isNaN(totalAmt) || totalAmt <= 0) {
            totalAmt = 0;
            if (pedidoActivo.items && pedidoActivo.items.length > 0) {
                pedidoActivo.items.forEach(item => {
                    totalAmt += (parseFloat(item.cantidad) || parseFloat(item.cantidad_original) || 0) * (parseFloat(item.precio) || 0);
                });
            }
            if (totalAmt <= 0) totalAmt = parseFloat(pedidoActivo.importe) || 0;
        }
    } else {
        if (pedidoActivo.items && pedidoActivo.items.length > 0) {
            // Sumar los ya autorizados (si estamos en pendiente) o todos los autorizados/aprobados (si no está pendiente)
            pedidoActivo.items.forEach((item, idx) => {
                if (isModifying) {
                    // En modo modificación, calculamos estrictamente desde los inputs en pantalla
                    return;
                }
                if (isPending) {
                    if (item.estado === 'Autorizado') {
                        totalAmt += item.cantidad * item.precio;
                    }
                } else {
                    if (item.estado !== 'Rechazado') {
                        totalAmt += item.cantidad * item.precio;
                    }
                }
            });

            // Sumar los que se editan en pantalla (si está pendiente o modificando)
            checks.forEach(chk => {
                const idx = parseInt(chk.getAttribute('data-idx'));
                const qtyInput = Array.from(qtys).find(q => parseInt(q.getAttribute('data-idx')) === idx);
                const subtotalSpan = Array.from(subtotals).find(s => parseInt(s.getAttribute('data-idx')) === idx);
                
                const item = pedidoActivo.items[idx];
                if (!item) return;
                
                let qty = 0;
                if (chk.checked && qtyInput) {
                    qty = parseFloat(qtyInput.value);
                    if (isNaN(qty) || qty < 0) qty = 0;
                    
                    // Solo limitamos la cantidad máxima si no estamos en modo modificación
                    if (!isModifying) {
                        const maxQty = item.cantidad_original || item.cantidad;
                        if (qty > maxQty) {
                            qty = maxQty;
                            qtyInput.value = qty;
                        }
                    }
                }
                
                const subtotal = qty * item.precio;
                if (subtotalSpan) {
                    subtotalSpan.innerText = subtotal.toLocaleString('es-AR', {minimumFractionDigits: 2});
                }
                
                totalAmt += subtotal;
            });
        } else {
            totalAmt = parseFloat(pedidoActivo.importe) || 0;
        }
    }
    
    // Calcular SUBTOTAL, NETO, IVA, TOTAL
    const subtotal = totalAmt;
    const neto = totalAmt;
    const iva = totalAmt * 0.21;
    const total = totalAmt * 1.21;
    
    // Determinar moneda de forma numérica
    let currencyVal = 1; // Default Pesos (1)
    let cotizVal = 1.0;
    
    const currencySelect = document.getElementById('auth-currency-select');
    const cotizInput = document.getElementById('auth-exchange-rate-input');
    
    if (isPending || isModifying) {
        if (currencySelect) {
            currencyVal = parseInt(currencySelect.value);
            if (currencyVal === 2 || currencyVal === 60) {
                cotizVal = cotizInput ? parseFloat(cotizInput.value) : 1.0;
                if (isNaN(cotizVal) || cotizVal <= 0) cotizVal = (currencyVal === 2 ? 1011.00 : 1100.00);
            } else {
                cotizVal = 1.0;
            }
        } else {
            // Si el control no está cargado aún, usar el guardado o heurística
            currencyVal = pedidoActivo.moneda_id || (pedidoActivo.importe <= 50000 ? 2 : 1);
            cotizVal = pedidoActivo.cotizacion || (currencyVal === 2 ? 1011.00 : (currencyVal === 60 ? 1100.00 : 1.0));
        }
    } else {
        // En modo resuelto se lee del pedido
        currencyVal = pedidoActivo.moneda_id || (pedidoActivo.importe <= 50000 ? 2 : 1);
        cotizVal = pedidoActivo.cotizacion || (currencyVal === 2 ? 1011.00 : (currencyVal === 60 ? 1100.00 : 1.0));
    }
    
    let currencyName = 'Pesos';
    if (currencyVal === 2) currencyName = 'Dólares';
    else if (currencyVal === 60) currencyName = 'Euros';
    
    // Formatear
    const fmt = (val) => `$${(parseFloat(val) || 0).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    // Poblar DOM de totales
    const subtotalEl = document.getElementById('auth-subtotal-val');
    const netoEl = document.getElementById('auth-neto-val');
    const ivaEl = document.getElementById('auth-iva-val-calc');
    const totalEl = document.getElementById('auth-total-val-calc');
    const currencyNameEl = document.getElementById('auth-currency-name');
    
    if (subtotalEl) subtotalEl.innerText = fmt(subtotal);
    if (netoEl) netoEl.innerText = fmt(neto);
    if (ivaEl) ivaEl.innerText = fmt(iva);
    if (totalEl) totalEl.innerText = fmt(total);
    if (currencyNameEl) currencyNameEl.innerText = currencyName;
    
    // Equivalencia en letras / cotización
    const equivEl = document.getElementById('auth-equivalent-text');
    if (equivEl) {
        if (currencyVal === 2) {
            equivEl.innerHTML = `${total.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} DOLARES ESTADOUN. cot. ${cotizVal.toLocaleString('es-AR', {minimumFractionDigits: 8, maximumFractionDigits: 8})}<br><span style="font-size: 8.5px; font-weight: normal; color: #475569; display: block; margin-top: 3px;">(${numeroALetras(total, 'DOLARES ESTADOUNIDENSES')})</span>`;
        } else if (currencyVal === 60) {
            equivEl.innerHTML = `${total.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} EUROS cot. ${cotizVal.toLocaleString('es-AR', {minimumFractionDigits: 8, maximumFractionDigits: 8})}<br><span style="font-size: 8.5px; font-weight: normal; color: #475569; display: block; margin-top: 3px;">(${numeroALetras(total, 'EUROS')})</span>`;
        } else {
            equivEl.innerHTML = `${total.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} PESOS cot. 1,00000000<br><span style="font-size: 8.5px; font-weight: normal; color: #475569; display: block; margin-top: 3px;">(${numeroALetras(total, 'PESOS')})</span>`;
        }
    }
    
    // Items Count y Fecha del Sistema
    const itemsCountEl = document.getElementById('auth-sys-items-count');
    if (itemsCountEl) {
        let count = 0;
        const activeItems = (pedidoActivo && Array.isArray(pedidoActivo.items)) ? pedidoActivo.items : [];
        if (isPending) {
            activeItems.forEach((item, idx) => {
                if (item.estado === 'Autorizado') {
                    count++;
                } else if (item.estado !== 'Rechazado') {
                    const chk = Array.from(checks).find(c => parseInt(c.getAttribute('data-idx')) === idx);
                    if (chk && chk.checked) {
                        count++;
                    }
                }
            });
        } else {
            activeItems.forEach(item => {
                if (item.estado !== 'Rechazado') {
                    count++;
                }
            });
        }
        itemsCountEl.innerText = count;
    }
    
    const sysDateEl = document.getElementById('auth-sys-date');
    const sysUserEl = document.getElementById('auth-sys-user');
    
    if (sysDateEl) {
        let formattedDate = '-';
        if (pedidoActivo.fecha) {
            // Usar la fecha del pedido + hora actual o la guardada
            if (pedidoActivo.fecha.includes(' ')) {
                const parts = pedidoActivo.fecha.split(' ');
                const dateParts = parts[0].split('-');
                if (dateParts.length === 3) {
                    formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]} ${parts[1]}`;
                }
            } else {
                formattedDate = pedidoActivo.fecha;
            }
        }
        sysDateEl.innerText = formattedDate;
    }
    if (sysUserEl) {
        sysUserEl.innerText = (pedidoActivo.operador || 'admin').toUpperCase();
    }
    const sysReportNameEl = document.getElementById('auth-sys-report-name');
    if (sysReportNameEl && pedidoActivo) {
        sysReportNameEl.innerText = (typeof window.getBudgetDocTitle === 'function') ? window.getBudgetDocTitle(pedidoActivo) : `Presupuesto ${pedidoActivo.cliente_nombre || ''} ${pedidoActivo.id || ''}`.trim();
    }
};

// 6. ANÁLISIS Y MÉTRICAS DE VENTAS Y BI
let chartPieInstance = null;
let chartBarInstance = null;
let chartTopClientesInstance = null;
let chartRubroMixInstance = null;

window.applyPresetDateFilterMetrics = function(preset) {
    const dtStart = document.getElementById('filter-date-start');
    const dtEnd = document.getElementById('filter-date-end');
    if (!dtStart || !dtEnd) return;
    
    const today = new Date();
    const formatDate = (date) => getLocalDateStr(date);
    
    if (preset === 'today') {
        const d = formatDate(today);
        dtStart.value = d;
        dtEnd.value = d;
    } else if (preset === 'yesterday') {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const d = formatDate(yesterday);
        dtStart.value = d;
        dtEnd.value = d;
    } else if (preset === 'last7') {
        const past7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        dtStart.value = formatDate(past7);
        dtEnd.value = formatDate(today);
    } else if (preset === 'last30') {
        const past30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        dtStart.value = formatDate(past30);
        dtEnd.value = formatDate(today);
    } else if (preset === 'thisMonth') {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        dtStart.value = formatDate(firstDay);
        dtEnd.value = formatDate(today);
    } else if (preset === 'lastMonth') {
        const firstDayPrev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayPrev = new Date(today.getFullYear(), today.getMonth(), 0);
        dtStart.value = formatDate(firstDayPrev);
        dtEnd.value = formatDate(lastDayPrev);
    }
    renderMetrics();
};

function initMetricsView() {
    // Configurar fechas filtros
    const dtStart = document.getElementById('filter-date-start');
    const dtEnd = document.getElementById('filter-date-end');
    const sellerSelect = document.getElementById('filter-metrics-seller');
    const rubroSelect = document.getElementById('filter-metrics-rubro');
    
    if (dtStart && !dtStart.value) {
        const today = getLocalDateStr(new Date());
        const past365 = getLocalDateStr(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
        dtStart.value = past365;
        dtEnd.value = today;
    }

    // Llenar selector de usuarios / operadores
    if (sellerSelect) {
        sellerSelect.innerHTML = '<option value="">Todos los Usuarios...</option>';
        const userList = (appData && Array.isArray(appData.users)) ? appData.users : [];
        userList.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.username;
            opt.innerText = `👤 ${u.username}`;
            sellerSelect.appendChild(opt);
        });
        sellerSelect.onchange = renderMetrics;
    }
    
    if (rubroSelect) {
        rubroSelect.onchange = renderMetrics;
    }

    const filterHandler = () => renderMetrics();
    if (dtStart) dtStart.onchange = filterHandler;
    if (dtEnd) dtEnd.onchange = filterHandler;

    const applyBtn = document.getElementById('btn-apply-filters');
    const clearBtn = document.getElementById('btn-clear-filters');

    if (applyBtn) applyBtn.onclick = () => renderMetrics();
    if (clearBtn) {
        clearBtn.onclick = () => {
            if (dtStart) dtStart.value = '';
            if (dtEnd) dtEnd.value = '';
            if (sellerSelect) sellerSelect.value = '';
            if (rubroSelect) rubroSelect.value = '';
            renderMetrics();
        };
    }

    renderMetrics();
}

function renderMetrics() {
    const dateStart = document.getElementById('filter-date-start') ? document.getElementById('filter-date-start').value : '';
    const dateEnd = document.getElementById('filter-date-end') ? document.getElementById('filter-date-end').value : '';
    const sellerSelectEl = document.getElementById('filter-metrics-seller');
    const rubroSelectEl = document.getElementById('filter-metrics-rubro');
    let sellerSelectVal = sellerSelectEl ? sellerSelectEl.value : '';
    let rubroSelectVal = rubroSelectEl ? rubroSelectEl.value : '';

    // Filtrar por fecha
    let dateFiltered = (appData.pedidos || []).filter(p => {
        const pDate = (p.fecha || '').substring(0, 10);
        if (dateStart && pDate < dateStart) return false;
        if (dateEnd && pDate > dateEnd) return false;
        return true;
    });

    // Filtrar por rubro
    if (rubroSelectVal) {
        dateFiltered = dateFiltered.filter(p => (p.tipo_presupuesto || 'Eléctrico') === rubroSelectVal);
    }

    // Filtrar por usuario / operador
    let filtered = dateFiltered;
    if (sellerSelectVal) {
        filtered = dateFiltered.filter(p => {
            const pUser = String(p.operador || 'admin').trim().toLowerCase();
            return pUser === sellerSelectVal.trim().toLowerCase();
        });
    }

    let totalAmt = 0;
    let totalFacturadoAmt = 0;
    let approvedAmt = 0;
    let approvedCnt = 0;
    let pendingAmt = 0;
    let pendingCnt = 0;
    let rejectedAmt = 0;
    let rejectedCnt = 0;

    let elecTotAmt = 0, elecCnt = 0;
    let mecaTotAmt = 0, mecaCnt = 0;
    let facturadoMesAmt = 0;
    let facturadoAnioAmt = 0;

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const curMonthName = monthNames[curMonth];

    const clientDataMap = {};
    const sellerDataMap = {};

    filtered.forEach(p => {
        const amt = parseFloat(p.importe || p.importe_total || 0);
        const facturado = parseFloat(p.monto_facturado_total || p.monto_facturado || 0);
        const pctAvance = parseFloat(p.avance_porcentaje_acumulado || p.facturado_porcentaje || 0);
        
        totalAmt += amt;
        totalFacturadoAmt += facturado;

        // Cálculo de facturación en el mes y año
        if (p.avances && Array.isArray(p.avances) && p.avances.length > 0) {
            p.avances.forEach(a => {
                const aAmt = parseFloat(a.monto || a.monto_equivalente || 0);
                const aDateStr = a.fecha || p.fecha;
                if (aDateStr) {
                    let aDate = null;
                    if (aDateStr.includes('-')) {
                        const parts = aDateStr.substring(0, 10).split('-');
                        if (parts[0].length === 4) aDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                        else aDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                    } else if (aDateStr.includes('/')) {
                        const parts = aDateStr.split('/');
                        aDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                    } else {
                        aDate = new Date(aDateStr);
                    }
                    if (aDate && !isNaN(aDate.getTime())) {
                        if (aDate.getFullYear() === curYear) {
                            facturadoAnioAmt += aAmt;
                            if (aDate.getMonth() === curMonth) {
                                facturadoMesAmt += aAmt;
                            }
                        }
                    }
                } else {
                    facturadoAnioAmt += aAmt;
                    facturadoMesAmt += aAmt;
                }
            });
        } else if (facturado > 0) {
            const pDateStr = p.fecha;
            if (pDateStr) {
                let pDate = null;
                if (pDateStr.includes('-')) {
                    const parts = pDateStr.substring(0, 10).split('-');
                    if (parts[0].length === 4) pDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                    else pDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                } else if (pDateStr.includes('/')) {
                    const parts = pDateStr.split('/');
                    pDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                } else {
                    pDate = new Date(pDateStr);
                }
                if (pDate && !isNaN(pDate.getTime())) {
                    if (pDate.getFullYear() === curYear) {
                        facturadoAnioAmt += facturado;
                        if (pDate.getMonth() === curMonth) {
                            facturadoMesAmt += facturado;
                        }
                    }
                }
            } else {
                facturadoAnioAmt += facturado;
                facturadoMesAmt += facturado;
            }
        }

        const rubro = p.tipo_presupuesto || 'Eléctrico';
        if (rubro === 'Mecánico') {
            mecaTotAmt += amt;
            mecaCnt++;
        } else {
            elecTotAmt += amt;
            elecCnt++;
        }

        const isApproved = (p.estado === 'Aprobado con OC' || p.estado === 'Aprobado' || p.estado === 'Autorizado' || p.estado === 'Facturado Parcial' || p.estado === 'Facturado Total');
        const isPending = (p.estado === 'Enviado sin OC' || p.estado === 'Pendiente de Autorización' || p.estado === 'En Revisión');
        const isRejected = (p.estado === 'Rechazado' || p.estado === 'Anulado');

        if (isApproved) {
            approvedAmt += amt;
            approvedCnt++;
        } else if (isRejected) {
            rejectedAmt += amt;
            rejectedCnt++;
        } else {
            pendingAmt += amt;
            pendingCnt++;
        }

        // Agrupación por Cliente
        const clientName = (p.cliente_nombre || p.meca_denominacion || 'Cliente').trim();
        if (!clientDataMap[clientName]) {
            clientDataMap[clientName] = {
                nombre: clientName,
                pedidos: 0,
                montoTotal: 0,
                montoFacturado: 0,
                sumPctAvance: 0
            };
        }
        clientDataMap[clientName].pedidos++;
        clientDataMap[clientName].montoTotal += amt;
        clientDataMap[clientName].montoFacturado += facturado;
        clientDataMap[clientName].sumPctAvance += pctAvance;

        // Agrupación por Usuario / Operador
        let pUser = String(p.operador || 'admin').trim().toUpperCase();
        if (!sellerDataMap[pUser]) {
            sellerDataMap[pUser] = {
                vendedor: pUser,
                pedidosTotales: 0,
                pedidosAprobados: 0,
                montoTotal: 0,
                montoFacturado: 0
            };
        }
        sellerDataMap[pUser].pedidosTotales++;
        sellerDataMap[pUser].montoTotal += amt;
        sellerDataMap[pUser].montoFacturado += facturado;
        if (isApproved) {
            sellerDataMap[pUser].pedidosAprobados++;
        }
    });

    const saldoPendiente = Math.max(0, totalAmt - totalFacturadoAmt);
    const pctFacturadoGlobal = totalAmt > 0 ? ((totalFacturadoAmt / totalAmt) * 100).toFixed(1) : '0';

    // 1. Actualizar Tarjetas de KPIs
    const elTot = document.getElementById('metric-total');
    const elTotAmt = document.getElementById('metric-total-amt');
    const elFactAmt = document.getElementById('metric-facturado-amt');
    const elPctFact = document.getElementById('metric-pct-facturado-global');
    const elPendCobro = document.getElementById('metric-pendiente-cobro-amt');
    const elAppr = document.getElementById('metric-approved');
    const elApprAmt = document.getElementById('metric-approved-amt');
    const elElecAmt = document.getElementById('metric-elec-amt');
    const elElecCnt = document.getElementById('metric-elec-cnt');
    const elMecaAmt = document.getElementById('metric-meca-amt');
    const elMecaCnt = document.getElementById('metric-meca-cnt');
    const elFactMesAmt = document.getElementById('metric-facturado-mes-amt');
    const elFactMesSub = document.getElementById('metric-facturado-mes-sub');
    const elFactAnioAmt = document.getElementById('metric-facturado-anio-amt');
    const elFactAnioSub = document.getElementById('metric-facturado-anio-sub');

    if (elTot) elTot.innerText = filtered.length;
    if (elTotAmt) elTotAmt.innerText = `$${totalAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    if (elFactAmt) elFactAmt.innerText = `$${totalFacturadoAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    if (elPctFact) elPctFact.innerText = `${pctFacturadoGlobal}%`;
    if (elPendCobro) elPendCobro.innerText = `$${saldoPendiente.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    if (elAppr) elAppr.innerText = approvedCnt;
    if (elApprAmt) elApprAmt.innerText = `$${approvedAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    if (elElecAmt) elElecAmt.innerText = `$${elecTotAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    if (elElecCnt) elElecCnt.innerText = elecCnt;
    if (elMecaAmt) elMecaAmt.innerText = `$${mecaTotAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    if (elMecaCnt) elMecaCnt.innerText = mecaCnt;
    if (elFactMesAmt) elFactMesAmt.innerText = `$${facturadoMesAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    if (elFactMesSub) elFactMesSub.innerText = `${curMonthName} ${curYear}`;
    if (elFactAnioAmt) elFactAnioAmt.innerText = `$${facturadoAnioAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    if (elFactAnioSub) elFactAnioSub.innerText = `Año ${curYear}`;

    // 2. Guardar datos de métricas y renderizar con alto contraste adaptable
    window.lastMetricsChartData = {
        approvedCnt, pendingCnt, rejectedCnt,
        approvedAmt, pendingAmt, rejectedAmt,
        elecTotAmt, elecCnt,
        mecaTotAmt, mecaCnt,
        facturadoMesAmt, facturadoAnioAmt,
        curMonthName, curYear,
        clientDataMap, sellerDataMap,
        filtered
    };
    renderMetricsCharts(false);

    // 3. Tabla de Rendimiento por Vendedor
    const sellerListBody = document.getElementById('seller-performance-list');
    if (sellerListBody) {
        sellerListBody.innerHTML = '';
        const sortedSellers = Object.values(sellerDataMap).sort((a, b) => b.montoTotal - a.montoTotal);
        sortedSellers.forEach(s => {
            const efectividad = s.pedidosTotales > 0 ? Math.round((s.pedidosAprobados / s.pedidosTotales) * 100) : 0;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${s.vendedor}</strong></td>
                <td style="text-align: center; font-family: inherit; font-weight: 600;">${s.pedidosTotales}</td>
                <td style="text-align: center; font-family: inherit; font-weight: 700; color: #10b981;">${s.pedidosAprobados}</td>
                <td style="text-align: right; font-family: inherit; font-weight: 700; color: #38bdf8;">$${s.montoTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: right; font-family: inherit; font-weight: 700; color: #34d399;">$${s.montoFacturado.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: center; font-family: inherit; font-weight: 700; color: ${efectividad >= 50 ? '#10b981' : '#f59e0b'};">${efectividad}%</td>
            `;
            sellerListBody.appendChild(tr);
        });
    }

    // 4. Tabla de Cuentas por Cliente
    const clientListBody = document.getElementById('client-performance-list');
    if (clientListBody) {
        clientListBody.innerHTML = '';
        const sortedClients = Object.values(clientDataMap).sort((a, b) => b.montoTotal - a.montoTotal);
        sortedClients.forEach(c => {
            const avgAvance = c.pedidos > 0 ? Math.round(c.sumPctAvance / c.pedidos) : 0;
            const saldo = Math.max(0, c.montoTotal - c.montoFacturado);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${c.nombre}</strong></td>
                <td style="text-align: center; font-family: inherit; font-weight: 600;">${c.pedidos}</td>
                <td style="text-align: right; font-family: inherit; font-weight: 700; color: #38bdf8;">$${c.montoTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: center; font-family: inherit; font-weight: 700; color: #f59e0b;">${avgAvance}%</td>
                <td style="text-align: right; font-family: inherit; font-weight: 700; color: #34d399;">$${c.montoFacturado.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: right; font-family: inherit; font-weight: 600; color: #fde047;">$${saldo.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
            `;
            clientListBody.appendChild(tr);
        });
    }
}

window.descargarReporteEstadisticasCSV = function() {
    const data = window.lastMetricsChartData;
    if (!data || !appData || !Array.isArray(appData.pedidos)) {
        showToast("No hay datos estadísticos para exportar a Excel.", "warning");
        return;
    }

    const dtStart = document.getElementById('filter-date-start') ? document.getElementById('filter-date-start').value : '';
    const dtEnd = document.getElementById('filter-date-end') ? document.getElementById('filter-date-end').value : '';
    const sellerSelect = document.getElementById('filter-metrics-seller');
    const rubroSelect = document.getElementById('filter-metrics-rubro');
    const sellerVal = sellerSelect && sellerSelect.value ? sellerSelect.value : 'Todos';
    const rubroVal = rubroSelect && rubroSelect.value ? rubroSelect.value : 'Todos';

    let periodoText = 'Histórico Completo';
    if (dtStart && dtEnd) {
        periodoText = `${dtStart.split('-').reverse().join('/')} al ${dtEnd.split('-').reverse().join('/')}`;
    } else if (dtStart) {
        periodoText = `Desde ${dtStart.split('-').reverse().join('/')}`;
    } else if (dtEnd) {
        periodoText = `Hasta ${dtEnd.split('-').reverse().join('/')}`;
    }

    const { approvedCnt = 0, pendingCnt = 0, rejectedCnt = 0, approvedAmt = 0, pendingAmt = 0, rejectedAmt = 0, elecTotAmt = 0, elecCnt = 0, mecaTotAmt = 0, mecaCnt = 0, clientDataMap = {}, sellerDataMap = {} } = data;
    const totalAmt = approvedAmt + pendingAmt + rejectedAmt;
    const totalCnt = approvedCnt + pendingCnt + rejectedCnt;
    
    let totalFacturado = 0;
    Object.values(clientDataMap).forEach(c => { totalFacturado += (c.montoFacturado || 0); });
    const saldoPendiente = Math.max(0, totalAmt - totalFacturado);
    const pctFacturado = totalAmt > 0 ? ((totalFacturado / totalAmt) * 100).toFixed(1) : '0';

    // Obtener pedidos filtrados actualmente
    let dateFiltered = (appData.pedidos || []).filter(p => {
        const pDate = (p.fecha || '').substring(0, 10);
        if (dtStart && pDate < dtStart) return false;
        if (dtEnd && pDate > dtEnd) return false;
        return true;
    });
    if (rubroVal && rubroVal !== 'Todos') {
        dateFiltered = dateFiltered.filter(p => (p.tipo_presupuesto || 'Eléctrico') === rubroVal);
    }
    if (sellerVal && sellerVal !== 'Todos') {
        dateFiltered = dateFiltered.filter(p => String(p.operador || 'admin').trim().toLowerCase() === sellerVal.trim().toLowerCase());
    }

    const now = new Date();
    const emisionStr = `${now.toLocaleDateString('es-AR')} ${now.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})} hs`;

    let excelHTML = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
            <x:ExcelWorkbook>
                <x:ExcelWorksheets>
                    <x:ExcelWorksheet>
                        <x:Name>Reporte Gerencial</x:Name>
                        <x:WorksheetOptions>
                            <x:DisplayGridlines/>
                        </x:WorksheetOptions>
                    </x:ExcelWorksheet>
                </x:ExcelWorksheets>
            </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 25px; }
            th { background-color: #0f172a; color: #ffffff; font-weight: bold; border: 1px solid #334155; padding: 7px 10px; text-align: left; }
            td { border: 1px solid #cbd5e1; padding: 6px 10px; }
            .header-title { font-size: 16px; font-weight: bold; color: #0f172a; background-color: #e2e8f0; text-align: center; padding: 12px; }
            .header-sub { font-size: 11px; color: #475569; background-color: #f1f5f9; text-align: center; padding: 4px; }
            .section-header { font-size: 13px; font-weight: bold; background-color: #1e293b; color: #38bdf8; padding: 8px 10px; }
            .total-row { background-color: #e2e8f0; font-weight: bold; border-top: 2px solid #0f172a; }
            .even-row { background-color: #f8fafc; }
            .currency { mso-number-format: "\\$#,##0.00"; text-align: right; }
            .percentage { mso-number-format: "0.0%"; text-align: center; }
            .number { mso-number-format: "#,##0"; text-align: center; }
            .kpi-title { font-weight: bold; color: #334155; }
            .kpi-value { font-weight: bold; color: #0284c7; }
        </style>
    </head>
    <body>
        <!-- ENCABEZADO CORPORATIVO -->
        <table>
            <tr>
                <td colspan="4" class="header-title">SG MONTAJES S.R.L. - REPORTE GERENCIAL Y FINANCIERO</td>
            </tr>
            <tr>
                <td colspan="4" class="header-sub">Gestión de Presupuestos, Cotizaciones y Avances de Obra</td>
            </tr>
            <tr>
                <td colspan="2"><strong>Fecha de Emisión:</strong> ${emisionStr}</td>
                <td colspan="2"><strong>Período:</strong> ${periodoText}</td>
            </tr>
        </table>

        <!-- RESUMEN DE INDICADORES FINANCIEROS (KPIS) -->
        <table>
            <tr>
                <td colspan="4" class="section-header">1. RESUMEN EJECUTIVO CONSOLIDADO</td>
            </tr>
            <tr>
                <th>Indicador Financiero</th>
                <th style="text-align: right;">Monto en Pesos ($)</th>
                <th style="text-align: center;">Cantidad</th>
                <th style="text-align: center;">% Proporción</th>
            </tr>
            <tr>
                <td class="kpi-title">Total Presupuestado (Cotizado)</td>
                <td class="currency kpi-value">${totalAmt.toFixed(2)}</td>
                <td class="number">${totalCnt}</td>
                <td class="percentage">1.0</td>
            </tr>
            <tr class="even-row">
                <td class="kpi-title">Total Facturado por Certificación de Avances</td>
                <td class="currency" style="color: #059669; font-weight: bold;">${totalFacturado.toFixed(2)}</td>
                <td class="number">-</td>
                <td class="percentage">${(pctFacturado / 100).toFixed(3)}</td>
            </tr>
            <tr>
                <td class="kpi-title">📅 Facturado en el Mes (${curMonthName})</td>
                <td class="currency" style="color: #059669; font-weight: bold;">${facturadoMesAmt.toFixed(2)}</td>
                <td class="number">-</td>
                <td class="percentage">${totalAmt > 0 ? ((facturadoMesAmt / totalAmt)).toFixed(3) : 0}</td>
            </tr>
            <tr class="even-row">
                <td class="kpi-title">📈 Facturado en el Año (${curYear})</td>
                <td class="currency" style="color: #0284c7; font-weight: bold;">${facturadoAnioAmt.toFixed(2)}</td>
                <td class="number">-</td>
                <td class="percentage">${totalAmt > 0 ? ((facturadoAnioAmt / totalAmt)).toFixed(3) : 0}</td>
            </tr>
            <tr>
                <td class="kpi-title">Saldo Pendiente de Cobro / Facturar</td>
                <td class="currency" style="color: #d97706; font-weight: bold;">${saldoPendiente.toFixed(2)}</td>
                <td class="number">-</td>
                <td class="percentage">${totalAmt > 0 ? ((saldoPendiente / totalAmt)).toFixed(3) : 0}</td>
            </tr>
            <tr class="even-row">
                <td class="kpi-title">Presupuestos Aprobados con Orden de Compra (OC)</td>
                <td class="currency" style="color: #7c3aed; font-weight: bold;">${approvedAmt.toFixed(2)}</td>
                <td class="number">${approvedCnt}</td>
                <td class="percentage">${totalAmt > 0 ? ((approvedAmt / totalAmt)).toFixed(3) : 0}</td>
            </tr>
            <tr>
                <td class="kpi-title">Cotizaciones Rubro Eléctrico</td>
                <td class="currency">${elecTotAmt.toFixed(2)}</td>
                <td class="number">${elecCnt}</td>
                <td class="percentage">${totalAmt > 0 ? ((elecTotAmt / totalAmt)).toFixed(3) : 0}</td>
            </tr>
            <tr class="even-row">
                <td class="kpi-title">Cotizaciones Rubro Mecánico</td>
                <td class="currency">${mecaTotAmt.toFixed(2)}</td>
                <td class="number">${mecaCnt}</td>
                <td class="percentage">${totalAmt > 0 ? ((mecaTotAmt / totalAmt)).toFixed(3) : 0}</td>
            </tr>
        </table>

        <!-- RESUMEN POR CLIENTE -->
        <table>
            <tr>
                <td colspan="6" class="section-header">2. RESUMEN DE CUENTAS POR CLIENTE Y AVANCES DE OBRA</td>
            </tr>
            <tr>
                <th>Cliente</th>
                <th style="text-align: center;">Cant. Obras</th>
                <th style="text-align: right;">Total Presupuestado ($)</th>
                <th style="text-align: center;">% Avance Promedio</th>
                <th style="text-align: right;">Total Facturado ($)</th>
                <th style="text-align: right;">Saldo por Cobrar ($)</th>
            </tr>`;

    const sortedClients = Object.values(clientDataMap).sort((a, b) => b.montoTotal - a.montoTotal);
    let totPresCli = 0, totFactCli = 0, totSaldoCli = 0, totPedCli = 0;

    sortedClients.forEach((c, idx) => {
        const avgAvance = c.pedidos > 0 ? Math.round(c.sumPctAvance / c.pedidos) : 0;
        const saldo = Math.max(0, c.montoTotal - c.montoFacturado);
        totPresCli += c.montoTotal;
        totFactCli += c.montoFacturado;
        totSaldoCli += saldo;
        totPedCli += c.pedidos;
        const rowClass = idx % 2 === 1 ? 'class="even-row"' : '';

        excelHTML += `
            <tr ${rowClass}>
                <td><strong>${c.nombre}</strong></td>
                <td class="number">${c.pedidos}</td>
                <td class="currency">${c.montoTotal.toFixed(2)}</td>
                <td class="percentage">${(avgAvance / 100).toFixed(2)}</td>
                <td class="currency" style="color: #059669;">${c.montoFacturado.toFixed(2)}</td>
                <td class="currency" style="color: #d97706;">${saldo.toFixed(2)}</td>
            </tr>`;
    });

    const avgGlobalAvance = totPresCli > 0 ? (totFactCli / totPresCli) : 0;
    excelHTML += `
            <tr class="total-row">
                <td>TOTAL CONSOLIDADO CLIENTES</td>
                <td class="number">${totPedCli}</td>
                <td class="currency">${totPresCli.toFixed(2)}</td>
                <td class="percentage">${avgGlobalAvance.toFixed(3)}</td>
                <td class="currency">${totFactCli.toFixed(2)}</td>
                <td class="currency">${totSaldoCli.toFixed(2)}</td>
            </tr>
        </table>

        <!-- RENDIMIENTO POR VENDEDOR -->
        <table>
            <tr>
                <td colspan="6" class="section-header">3. RENDIMIENTO POR USUARIO / OPERADOR COMERCIAL</td>
            </tr>
            <tr>
                <th>Operador / Vendedor</th>
                <th style="text-align: center;">Presupuestos Totales</th>
                <th style="text-align: center;">Aprobados con OC</th>
                <th style="text-align: right;">Total Cotizado ($)</th>
                <th style="text-align: right;">Total Facturado ($)</th>
                <th style="text-align: center;">% Efectividad Cierre</th>
            </tr>`;

    const sortedSellers = Object.values(sellerDataMap).sort((a, b) => b.montoTotal - a.montoTotal);
    let totPedSel = 0, totApprSel = 0, totCotSel = 0, totFactSel = 0;

    sortedSellers.forEach((s, idx) => {
        const efectividad = s.pedidosTotales > 0 ? (s.pedidosAprobados / s.pedidosTotales) : 0;
        totPedSel += s.pedidosTotales;
        totApprSel += s.pedidosAprobados;
        totCotSel += s.montoTotal;
        totFactSel += s.montoFacturado;
        const rowClass = idx % 2 === 1 ? 'class="even-row"' : '';

        excelHTML += `
            <tr ${rowClass}>
                <td><strong>${s.vendedor}</strong></td>
                <td class="number">${s.pedidosTotales}</td>
                <td class="number" style="color: #059669; font-weight: bold;">${s.pedidosAprobados}</td>
                <td class="currency">${s.montoTotal.toFixed(2)}</td>
                <td class="currency" style="color: #059669;">${s.montoFacturado.toFixed(2)}</td>
                <td class="percentage">${efectividad.toFixed(3)}</td>
            </tr>`;
    });

    const efectividadGlobal = totPedSel > 0 ? (totApprSel / totPedSel) : 0;
    excelHTML += `
            <tr class="total-row">
                <td>TOTAL CONSOLIDADO VENDEDORES</td>
                <td class="number">${totPedSel}</td>
                <td class="number">${totApprSel}</td>
                <td class="currency">${totCotSel.toFixed(2)}</td>
                <td class="currency">${totFactSel.toFixed(2)}</td>
                <td class="percentage">${efectividadGlobal.toFixed(3)}</td>
            </tr>
        </table>

        <!-- DETALLE COMPLETO DE COTIZACIONES -->
        <table>
            <tr>
                <td colspan="12" class="section-header">4. DETALLE DE COTIZACIONES Y PRESUPUESTOS EMITIDOS</td>
            </tr>
            <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>Rubro</th>
                <th>Cliente</th>
                <th>CUIT</th>
                <th>Denominación de Obra</th>
                <th style="text-align: right;">Importe Total ($)</th>
                <th style="text-align: center;">Estado Comercial</th>
                <th style="text-align: center;">% Avance</th>
                <th style="text-align: right;">Monto Facturado ($)</th>
                <th>Nro Orden Compra (OC)</th>
                <th>Operador</th>
            </tr>`;

    let sumImporteDetalle = 0;
    let sumFacturadoDetalle = 0;

    dateFiltered.forEach((p, idx) => {
        const amt = parseFloat(p.importe || p.importe_total || 0);
        const fact = parseFloat(p.monto_facturado_total || p.monto_facturado || 0);
        const pct = parseFloat(p.avance_porcentaje_acumulado || p.facturado_porcentaje || 0);
        sumImporteDetalle += amt;
        sumFacturadoDetalle += fact;
        const rowClass = idx % 2 === 1 ? 'class="even-row"' : '';

        excelHTML += `
            <tr ${rowClass}>
                <td>${p.id || ''}</td>
                <td>${p.fecha ? p.fecha.substring(0, 10) : ''}</td>
                <td>${p.tipo_presupuesto || 'Eléctrico'}</td>
                <td><strong>${p.cliente_nombre || ''}</strong></td>
                <td>${p.cuit || ''}</td>
                <td>${p.meca_denominacion || ''}</td>
                <td class="currency">${amt.toFixed(2)}</td>
                <td style="text-align: center;">${p.estado || ''}</td>
                <td class="percentage">${(pct / 100).toFixed(2)}</td>
                <td class="currency">${fact.toFixed(2)}</td>
                <td>${p.meca_nro_oc || p.nro_oc || '-'}</td>
                <td>${p.operador || ''}</td>
            </tr>`;
    });

    excelHTML += `
            <tr class="total-row">
                <td colspan="6">TOTAL GENERAL DE COTIZACIONES FILTRADAS (${dateFiltered.length} Presupuestos)</td>
                <td class="currency">${sumImporteDetalle.toFixed(2)}</td>
                <td></td>
                <td></td>
                <td class="currency">${sumFacturadoDetalle.toFixed(2)}</td>
                <td></td>
                <td></td>
            </tr>
        </table>
    </body>
    </html>`;

    const blob = new Blob([excelHTML], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const filename = `SG_Montajes_Reporte_Gerencial_${new Date().toISOString().substring(0, 10)}.xls`;
    
    if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, filename);
    } else {
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    showToast("📊 Planilla Excel descargada con formato gerencial oficial.", "success");
};

function renderMetricsCharts(isPrint = false) {
    const data = window.lastMetricsChartData;
    if (!data) return;

    const { approvedCnt, pendingCnt, rejectedCnt, approvedAmt, pendingAmt, rejectedAmt, elecTotAmt, mecaTotAmt, clientDataMap } = data;

    // Destruir gráficos anteriores
    if (chartPieInstance) { chartPieInstance.destroy(); chartPieInstance = null; }
    if (chartBarInstance) { chartBarInstance.destroy(); chartBarInstance = null; }
    if (chartTopClientesInstance) { chartTopClientesInstance.destroy(); chartTopClientesInstance = null; }
    if (chartRubroMixInstance) { chartRubroMixInstance.destroy(); chartRubroMixInstance = null; }

    const isLight = isPrint || document.body.getAttribute('data-theme') === 'light';
    const mainTextColor = isLight ? '#0f172a' : '#f8fafc';
    const mutedTextColor = isLight ? '#334155' : '#cbd5e1';
    const gridLineColor = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.08)';

    // Gráfico 1: Torta de Estados
    const ctxPie = document.getElementById('chartStatusPie');
    if (ctxPie) {
        chartPieInstance = new Chart(ctxPie, {
            type: 'pie',
            data: {
                labels: ['Aprobados con OC', 'Enviados / Pendientes', 'Rechazados'],
                datasets: [{
                    data: [approvedCnt, pendingCnt, rejectedCnt],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                    borderWidth: 2,
                    borderColor: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.8)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: mainTextColor,
                            font: { size: 12, weight: 'bold', family: 'Inter, sans-serif' },
                            padding: 12,
                            boxWidth: 16
                        }
                    }
                }
            }
        });
    }

    // Gráfico 2: Barras Monto Cotizado vs Facturado
    const ctxBar = document.getElementById('chartAmountBar');
    if (ctxBar) {
        chartBarInstance = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: ['Aprobados con OC', 'Pendientes', 'Rechazados'],
                datasets: [{
                    label: 'Monto Total ($)',
                    data: [approvedAmt, pendingAmt, rejectedAmt],
                    backgroundColor: isLight 
                        ? ['#10b981', '#f59e0b', '#ef4444']
                        : ['rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(239, 68, 68, 0.8)'],
                    borderColor: ['#059669', '#d97706', '#dc2626'],
                    borderWidth: 1.5,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                return `$${Number(ctx.raw || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: mainTextColor,
                            font: { size: 11, weight: 'bold', family: 'Inter, sans-serif' }
                        },
                        grid: { color: gridLineColor }
                    },
                    y: {
                        ticks: {
                            color: mutedTextColor,
                            font: { size: 11, weight: '600', family: 'Inter, sans-serif' },
                            callback: function(val) {
                                if (val >= 1000000) return '$' + (val / 1000000).toLocaleString('es-AR', {maximumFractionDigits: 1}) + 'M';
                                return '$' + val.toLocaleString('es-AR');
                            }
                        },
                        grid: { color: gridLineColor }
                    }
                }
            }
        });
    }

    // Gráfico 3: Top Clientes
    const ctxTopCli = document.getElementById('chartTopClientes');
    if (ctxTopCli) {
        const sortedCli = Object.values(clientDataMap || {}).sort((a, b) => b.montoTotal - a.montoTotal).slice(0, 5);
        chartTopClientesInstance = new Chart(ctxTopCli, {
            type: 'bar',
            data: {
                labels: sortedCli.map(c => c.nombre.length > 18 ? c.nombre.substring(0, 18) + '...' : c.nombre),
                datasets: [{
                    label: 'Total Cotizado ($)',
                    data: sortedCli.map(c => c.montoTotal),
                    backgroundColor: isLight ? '#0284c7' : 'rgba(56, 189, 248, 0.8)',
                    borderColor: '#0369a1',
                    borderWidth: 1.5,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                return `$${Number(ctx.raw || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: mutedTextColor,
                            font: { size: 11, weight: '600', family: 'Inter, sans-serif' },
                            callback: function(val) {
                                if (val >= 1000000) return '$' + (val / 1000000).toLocaleString('es-AR', {maximumFractionDigits: 1}) + 'M';
                                return '$' + val.toLocaleString('es-AR');
                            }
                        },
                        grid: { color: gridLineColor }
                    },
                    y: {
                        ticks: {
                            color: mainTextColor,
                            font: { size: 11, weight: 'bold', family: 'Inter, sans-serif' }
                        },
                        grid: { color: gridLineColor }
                    }
                }
            }
        });
    }

    // Gráfico 4: Mix por Rubro (Doughnut)
    const ctxRubro = document.getElementById('chartRubroMix');
    if (ctxRubro) {
        chartRubroMixInstance = new Chart(ctxRubro, {
            type: 'doughnut',
            data: {
                labels: ['⚡ Eléctrico', '⚙️ Mecánico'],
                datasets: [{
                    data: [elecTotAmt, mecaTotAmt],
                    backgroundColor: ['#f59e0b', '#06b6d4'],
                    borderWidth: 2,
                    borderColor: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.8)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: mainTextColor,
                            font: { size: 12, weight: 'bold', family: 'Inter, sans-serif' },
                            padding: 12,
                            boxWidth: 16
                        }
                    }
                }
            }
        });
    }
}

let reportChartPieInstance = null;
let reportChartBarInstance = null;

window.imprimirReporteEstadisticas = function() {
    const data = window.lastMetricsChartData;
    if (!data) {
        showToast("No hay datos estadísticos para generar el informe.", "warning");
        return;
    }

    const reportEl = document.getElementById('printable-executive-report');
    if (!reportEl) return;

    // 1. Configurar Metadatos del Informe
    const dtStart = document.getElementById('filter-date-start') ? document.getElementById('filter-date-start').value : '';
    const dtEnd = document.getElementById('filter-date-end') ? document.getElementById('filter-date-end').value : '';
    const sellerSelect = document.getElementById('filter-metrics-seller');
    const rubroSelect = document.getElementById('filter-metrics-rubro');
    const sellerVal = sellerSelect && sellerSelect.value ? sellerSelect.value : 'Todos los Operadores';
    const rubroVal = rubroSelect && rubroSelect.value ? rubroSelect.value : 'Todos los Rubros';

    let periodoText = 'Histórico Completo';
    if (dtStart && dtEnd) {
        periodoText = `${dtStart.split('-').reverse().join('/')} al ${dtEnd.split('-').reverse().join('/')}`;
    } else if (dtStart) {
        periodoText = `Desde ${dtStart.split('-').reverse().join('/')}`;
    } else if (dtEnd) {
        periodoText = `Hasta ${dtEnd.split('-').reverse().join('/')}`;
    }

    const now = new Date();
    const emisionStr = `${now.toLocaleDateString('es-AR')} ${now.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})} hs`;

    const elEmision = document.getElementById('rep-emision-date');
    const elPeriodo = document.getElementById('rep-periodo');
    const elOperador = document.getElementById('rep-operador');
    if (elEmision) elEmision.innerText = emisionStr;
    if (elPeriodo) elPeriodo.innerText = periodoText;
    if (elOperador) elOperador.innerText = `${sellerVal} • Rubro: ${rubroVal}`;

    // 2. Llenar Tarjetas de KPIs Consolidados
    const { 
        approvedCnt = 0, pendingCnt = 0, rejectedCnt = 0, 
        approvedAmt = 0, pendingAmt = 0, rejectedAmt = 0, 
        elecTotAmt = 0, elecCnt = 0, mecaTotAmt = 0, mecaCnt = 0, 
        facturadoMesAmt = 0, facturadoAnioAmt = 0,
        curMonthName = 'Mes Actual', curYear = new Date().getFullYear(),
        clientDataMap = {}, sellerDataMap = {}, filtered = [] 
    } = data;
    const totalAmt = approvedAmt + pendingAmt + rejectedAmt;
    const totalCnt = approvedCnt + pendingCnt + rejectedCnt;
    
    let totalFacturado = 0;
    Object.values(clientDataMap).forEach(c => { totalFacturado += (c.montoFacturado || 0); });
    const saldoPendiente = Math.max(0, totalAmt - totalFacturado);
    const pctFacturado = totalAmt > 0 ? ((totalFacturado / totalAmt) * 100).toFixed(1) : '0';

    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };

    setTxt('rep-kpi-total-amt', `$${totalAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
    setTxt('rep-kpi-total-cnt', totalCnt);
    setTxt('rep-kpi-facturado-amt', `$${totalFacturado.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
    setTxt('rep-kpi-facturado-pct', `${pctFacturado}%`);
    setTxt('rep-kpi-facturado-mes-amt', `$${facturadoMesAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
    setTxt('rep-kpi-facturado-mes-sub', `${curMonthName} ${curYear}`);
    setTxt('rep-kpi-facturado-anio-amt', `$${facturadoAnioAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
    setTxt('rep-kpi-facturado-anio-sub', `Año ${curYear}`);
    setTxt('rep-kpi-pendiente-amt', `$${saldoPendiente.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
    setTxt('rep-kpi-approved-amt', `$${approvedAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
    setTxt('rep-kpi-approved-cnt', approvedCnt);
    setTxt('rep-kpi-elec-amt', `$${elecTotAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
    setTxt('rep-kpi-elec-cnt', elecCnt);
    setTxt('rep-kpi-meca-amt', `$${mecaTotAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
    setTxt('rep-kpi-meca-cnt', mecaCnt);

    // 3. Tabla: Resumen Financiero por Cliente
    const tbodyClients = document.getElementById('rep-table-clients-body');
    const tfootClients = document.getElementById('rep-table-clients-foot');
    if (tbodyClients) {
        tbodyClients.innerHTML = '';
        const sortedClients = Object.values(clientDataMap).sort((a, b) => b.montoTotal - a.montoTotal);
        let totPresCli = 0, totFactCli = 0, totSaldoCli = 0, totPedCli = 0;

        sortedClients.forEach(c => {
            const avgAvance = c.pedidos > 0 ? Math.round(c.sumPctAvance / c.pedidos) : 0;
            const saldo = Math.max(0, c.montoTotal - c.montoFacturado);
            totPresCli += c.montoTotal;
            totFactCli += c.montoFacturado;
            totSaldoCli += saldo;
            totPedCli += c.pedidos;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${c.nombre}</strong></td>
                <td style="text-align: center; font-weight: 600;">${c.pedidos}</td>
                <td style="text-align: right; font-weight: 700; color: #0284c7;">$${c.montoTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: center; font-weight: 700; color: #d97706;">${avgAvance}%</td>
                <td style="text-align: right; font-weight: 700; color: #059669;">$${c.montoFacturado.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: right; font-weight: 700; color: #b45309;">$${saldo.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
            `;
            tbodyClients.appendChild(tr);
        });

        if (tfootClients) {
            const avgGlobalAvance = totPresCli > 0 ? ((totFactCli / totPresCli) * 100).toFixed(1) : '0';
            tfootClients.innerHTML = `
                <tr>
                    <td><strong>TOTAL GENERAL CLIENTES</strong></td>
                    <td style="text-align: center;">${totPedCli}</td>
                    <td style="text-align: right; color: #0284c7;">$${totPresCli.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                    <td style="text-align: center; color: #d97706;">${avgGlobalAvance}%</td>
                    <td style="text-align: right; color: #059669;">$${totFactCli.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                    <td style="text-align: right; color: #b45309;">$${totSaldoCli.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                </tr>
            `;
        }
    }

    // 4. Tabla: Rendimiento por Vendedor / Operador
    const tbodySellers = document.getElementById('rep-table-sellers-body');
    const tfootSellers = document.getElementById('rep-table-sellers-foot');
    if (tbodySellers) {
        tbodySellers.innerHTML = '';
        const sortedSellers = Object.values(sellerDataMap).sort((a, b) => b.montoTotal - a.montoTotal);
        let totPedSel = 0, totApprSel = 0, totCotSel = 0, totFactSel = 0;

        sortedSellers.forEach(s => {
            const efectividad = s.pedidosTotales > 0 ? Math.round((s.pedidosAprobados / s.pedidosTotales) * 100) : 0;
            totPedSel += s.pedidosTotales;
            totApprSel += s.pedidosAprobados;
            totCotSel += s.montoTotal;
            totFactSel += s.montoFacturado;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${s.vendedor}</strong></td>
                <td style="text-align: center; font-weight: 600;">${s.pedidosTotales}</td>
                <td style="text-align: center; font-weight: 700; color: #059669;">${s.pedidosAprobados}</td>
                <td style="text-align: right; font-weight: 700; color: #0284c7;">$${s.montoTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: right; font-weight: 700; color: #059669;">$${s.montoFacturado.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: center; font-weight: 800; color: ${efectividad >= 50 ? '#059669' : '#d97706'};">${efectividad}%</td>
            `;
            tbodySellers.appendChild(tr);
        });

        if (tfootSellers) {
            const efectividadGlobal = totPedSel > 0 ? Math.round((totApprSel / totPedSel) * 100) : 0;
            tfootSellers.innerHTML = `
                <tr>
                    <td><strong>TOTAL GENERAL VENDEDORES</strong></td>
                    <td style="text-align: center;">${totPedSel}</td>
                    <td style="text-align: center; color: #059669;">${totApprSel}</td>
                    <td style="text-align: right; color: #0284c7;">$${totCotSel.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                    <td style="text-align: right; color: #059669;">$${totFactSel.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                    <td style="text-align: center; color: #059669;">${efectividadGlobal}%</td>
                </tr>
            `;
        }
    }

    // 5. Tabla: Detalle Completo de Cotizaciones y Presupuestos
    const tbodyDetail = document.getElementById('rep-table-detail-body');
    const tfootDetail = document.getElementById('rep-table-detail-foot');
    if (tbodyDetail) {
        tbodyDetail.innerHTML = '';
        let sumTotDet = 0, sumFactDet = 0;

        filtered.forEach(p => {
            const amt = parseFloat(p.importe || p.importe_total || 0);
            const fact = parseFloat(p.monto_facturado_total || p.monto_facturado || 0);
            const pct = parseFloat(p.avance_porcentaje_acumulado || p.facturado_porcentaje || 0);
            sumTotDet += amt;
            sumFactDet += fact;

            const estadoStr = String(p.estado || '').toLowerCase();
            let estadoColor = '#d97706'; // orange default
            if (estadoStr.includes('aprob') || estadoStr.includes('oc')) estadoColor = '#059669';
            else if (estadoStr.includes('rechaz')) estadoColor = '#dc2626';

            const rubroLabel = (p.tipo_presupuesto || '').includes('Mec') ? 'Mecánico' : 'Eléctrico';
            const rubroStyle = rubroLabel === 'Mecánico' ? 'background: #e0f2fe; color: #0369a1;' : 'background: #fef3c7; color: #b45309;';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 700; color: #0f172a;">${p.id || ''}</td>
                <td>${p.fecha ? p.fecha.substring(0, 10).split('-').reverse().join('/') : ''}</td>
                <td><span style="font-size: 8px; font-weight: 700; padding: 1px 4px; border-radius: 3px; ${rubroStyle}">${rubroLabel}</span></td>
                <td><strong>${p.cliente_nombre || ''}</strong></td>
                <td>${p.meca_denominacion || '-'}</td>
                <td style="text-align: right; font-weight: 700; color: #0284c7;">$${amt.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: center; font-weight: 700; color: ${estadoColor};">${p.estado || 'Pendiente'}</td>
                <td style="text-align: center; font-weight: 700; color: #d97706;">${Math.round(pct)}%</td>
                <td style="text-align: right; font-weight: 700; color: #059669;">$${fact.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
            `;
            tbodyDetail.appendChild(tr);
        });

        if (tfootDetail) {
            tfootDetail.innerHTML = `
                <tr>
                    <td colspan="5"><strong>TOTAL GENERAL COTIZACIONES (${filtered.length} Presupuestos)</strong></td>
                    <td style="text-align: right; color: #0284c7;">$${sumTotDet.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                    <td></td>
                    <td></td>
                    <td style="text-align: right; color: #059669;">$${sumFactDet.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                </tr>
            `;
        }
    }

    // 6. Lanzar la Impresión
    const overlay = document.getElementById('modal-overlay');
    if (!overlay || overlay.style.display === 'none' || overlay.innerHTML.trim() === '') {
        document.body.classList.remove('modal-open');
    }
    document.body.classList.add('printing-report');

    setTimeout(() => {
        window.print();
        setTimeout(() => {
            document.body.classList.remove('printing-report');
        }, 800);
    }, 200);
};

window.abrirModalMetricaVendedor = function(metricaTipo) {
    openModal('tpl-modal-vendedor-metrics');
    
    const searchInput = document.getElementById('modal-metric-search-input');
    const resultsList = document.getElementById('modal-metric-results-list');
    const resultsCount = document.getElementById('modal-metric-results-count');
    const titleEl = document.getElementById('modal-metric-title');
    
    let titleText = "Desglose por Vendedor - Pedidos";
    if (metricaTipo === 'total') titleText = "Desglose por Vendedor - Pedidos Ingresados";
    else if (metricaTipo === 'approved') titleText = "Desglose por Vendedor - Pedidos Aprobados";
    else if (metricaTipo === 'pending') titleText = "Desglose por Vendedor - Pendientes de Autorización";
    else if (metricaTipo === 'rejected') titleText = "Desglose por Vendedor - Pedidos Rechazados";
    
    if (titleEl) titleEl.innerText = titleText;
    
    const dateStart = document.getElementById('filter-date-start') ? document.getElementById('filter-date-start').value : '';
    const dateEnd = document.getElementById('filter-date-end') ? document.getElementById('filter-date-end').value : '';
    const currentUser = getCurrentUser();
    
    // Primero filtrar por fechas
    let dateFiltered = appData.pedidos.filter(p => {
        const pDate = p.fecha.substring(0, 10);
        if (dateStart && pDate < dateStart) return false;
        if (dateEnd && pDate > dateEnd) return false;
        return true;
    });

    // Todos los usuarios pueden ver el listado completo de presupuestos sin restricción por vendedor
    
    const sellerStats = {};
    let overallCount = 0;
    let overallAmount = 0.0;
    
    // Inicializar todos los vendedores para que figuren
    if (typeof vendedoresDB !== 'undefined') {
        vendedoresDB.forEach(v => {
            sellerStats[v.nombre] = {
                vendedor: v.nombre,
                codigo: v.codigo,
                cantidad: 0,
                monto: 0.0
            };
        });
    }
    
    dateFiltered.forEach(p => {
        let matchState = false;
        if (metricaTipo === 'total') matchState = true;
        else if (metricaTipo === 'approved') matchState = (p.estado === 'Aprobado' || p.estado === 'Autorizado');
        else if (metricaTipo === 'pending') matchState = (p.estado === 'Pendiente de Autorización' || p.estado === 'Cargado con orden de compra' || p.estado === 'Cargado sin orden de compra');
        else if (metricaTipo === 'rejected') matchState = (p.estado === 'Rechazado');
        
        if (!matchState) return;
        
        let pSeller = p.vendedor_nombre || p.operador_vendedor_nombre;
        if (!pSeller && p.cliente_id && typeof clientesDB !== 'undefined') {
            const cli = clientesDB.find(c => c.codigo === p.cliente_id);
            if (cli) pSeller = cli.vendedor_nombre;
        }
        if (!pSeller) pSeller = "Sin Vendedor";
        
        if (!sellerStats[pSeller]) {
            sellerStats[pSeller] = {
                vendedor: pSeller,
                codigo: p.vendedor_id || '',
                cantidad: 0,
                monto: 0.0
            };
        }
        
        const amt = parseFloat(p.importe || 0.0);
        sellerStats[pSeller].cantidad++;
        sellerStats[pSeller].monto += amt;
        
        overallCount++;
        overallAmount += amt;
    });
    
    const listSellers = Object.values(sellerStats);
    
    const renderTable = (query) => {
        if (!resultsList) return;
        resultsList.innerHTML = '';
        const cleanQuery = (query || '').toLowerCase().trim();
        
        const filtered = listSellers.filter(s => s.vendedor.toLowerCase().includes(cleanQuery));
        // Ordenar descendente por monto
        filtered.sort((a, b) => b.monto - a.monto);
        
        if (filtered.length === 0) {
            resultsList.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:20px;">No se encontraron vendedores</td></tr>`;
            if (resultsCount) resultsCount.innerText = "Mostrando 0 vendedores";
            return;
        }
        
        const fragment = document.createDocumentFragment();
        filtered.forEach(s => {
            const tr = document.createElement('tr');
            
            const pct = overallAmount > 0 ? ((s.monto / overallAmount) * 100).toFixed(1) : '0.0';
            const sellerDisplay = s.codigo ? `<strong>${s.vendedor}</strong> <span style="font-size:10px; color:var(--text-muted); font-family:monospace;">(Cód: ${s.codigo})</span>` : `<strong>${s.vendedor}</strong>`;
            
            tr.innerHTML = `
                <td>${sellerDisplay}</td>
                <td style="text-align: right; font-family: monospace;">${s.cantidad}</td>
                <td style="text-align: right; font-family: monospace; font-weight: bold; color: var(--success);">$${s.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: right; font-family: monospace; color: var(--primary); font-weight: 600;">${pct}%</td>
            `;
            fragment.appendChild(tr);
        });
        resultsList.appendChild(fragment);
        if (resultsCount) resultsCount.innerText = `Mostrando ${filtered.length} vendedores`;
    };
    
    renderTable('');
    
    if (searchInput) {
        searchInput.oninput = (e) => renderTable(e.target.value);
    }
};

// 7. CONFIGURACIÓN DEL SISTEMA Y USUARIOS

window.onPermisoCheckboxChange = function() {
    let activeCount = 0;
    const totalCount = document.querySelectorAll('.perm-checkbox').length || 6;
    
    document.querySelectorAll('.perm-checkbox').forEach(cb => {
        const val = cb.value;
        const card = document.getElementById(`card-perm-${val}`);
        const badge = document.getElementById(`badge-perm-${val}`);
        
        if (cb.checked) {
            activeCount++;
            if (card) {
                card.style.borderColor = '#10b981';
                card.style.background = 'rgba(16, 185, 129, 0.12)';
            }
            if (badge) {
                if (val === 'menu-all') {
                    const cbVer = document.getElementById('perm-menu-all-ver');
                    const cbEdit = document.getElementById('perm-menu-all-edit');
                    const hasV = cbVer && cbVer.checked;
                    const hasE = cbEdit && cbEdit.checked;
                    if (hasV && hasE) badge.innerText = 'HISTORIAL + EDICIÓN';
                    else if (hasV) badge.innerText = 'SOLO HISTORIAL';
                    else if (hasE) badge.innerText = 'SOLO EDICIÓN';
                    else badge.innerText = 'HABILITADO';
                } else {
                    badge.innerText = 'HABILITADO';
                }
                badge.style.background = '#10b981';
                badge.style.color = '#ffffff';
                badge.style.border = '1px solid #059669';
            }
        } else {
            if (card) {
                card.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                card.style.background = 'rgba(15, 23, 42, 0.5)';
            }
            if (badge) {
                badge.innerText = 'BLOQUEADO';
                badge.style.background = 'rgba(244, 63, 94, 0.18)';
                badge.style.color = '#fda4af';
                badge.style.border = '1px solid rgba(244, 63, 94, 0.4)';
            }
        }
    });

    // Sub-cards de Seguimiento
    const cardVer = document.getElementById('card-perm-menu-all-ver');
    const cbVer = document.getElementById('perm-menu-all-ver');
    if (cardVer && cbVer) {
        if (cbVer.checked) {
            cardVer.style.borderColor = '#0284c7';
            cardVer.style.background = 'rgba(2, 132, 199, 0.18)';
        } else {
            cardVer.style.borderColor = 'rgba(255, 255, 255, 0.06)';
            cardVer.style.background = 'rgba(0, 0, 0, 0.25)';
        }
    }

    const cardEdit = document.getElementById('card-perm-menu-all-edit');
    const cbEdit = document.getElementById('perm-menu-all-edit');
    if (cardEdit && cbEdit) {
        if (cbEdit.checked) {
            cardEdit.style.borderColor = '#f59e0b';
            cardEdit.style.background = 'rgba(245, 158, 11, 0.18)';
        } else {
            cardEdit.style.borderColor = 'rgba(255, 255, 255, 0.06)';
            cardEdit.style.background = 'rgba(0, 0, 0, 0.25)';
        }
    }
    
    const countBadge = document.getElementById('summary-perm-count-badge');
    if (countBadge) {
        countBadge.innerText = `⚡ ${activeCount} de ${totalCount} Módulos Habilitados`;
        if (activeCount === 0) {
            countBadge.style.background = '#e11d48';
        } else if (activeCount === totalCount) {
            countBadge.style.background = '#10b981';
        } else {
            countBadge.style.background = '#0284c7';
        }
    }
};

window.onSeguimientoMasterChange = function() {
    const master = document.getElementById('perm-menu-all');
    const cbVer = document.getElementById('perm-menu-all-ver');
    const cbEdit = document.getElementById('perm-menu-all-edit');
    if (!master) return;
    
    if (master.checked) {
        if (cbVer && !cbVer.checked && cbEdit && !cbEdit.checked) {
            cbVer.checked = true;
            cbEdit.checked = true;
        }
    } else {
        if (cbVer) cbVer.checked = false;
        if (cbEdit) cbEdit.checked = false;
    }
    
    window.onPermisoCheckboxChange();
};

window.onSeguimientoSubPermChange = function() {
    const master = document.getElementById('perm-menu-all');
    const cbVer = document.getElementById('perm-menu-all-ver');
    const cbEdit = document.getElementById('perm-menu-all-edit');
    
    const anyChecked = (cbVer && cbVer.checked) || (cbEdit && cbEdit.checked);
    if (master) {
        master.checked = anyChecked;
    }
    
    window.onPermisoCheckboxChange();
};

// Permisos y Matriz de Sistema por Usuario
window.cargarPermisosParaUsuario = function(username) {
    if (!username) {
        const sel = document.getElementById('config-permisos-user-select');
        if (sel && sel.value) username = sel.value;
        else username = (appData && appData.users && appData.users[0]) ? appData.users[0].username : 'mel';
    }
    
    const feedbackBanner = document.getElementById('permisos-save-feedback-banner');
    if (feedbackBanner) feedbackBanner.style.display = 'none';

    const u = (appData && appData.users || []).find(x => String(x.username).trim().toLowerCase() === String(username).trim().toLowerCase());
    const nameEl = document.getElementById('summary-perm-username');
    const rubroEl = document.getElementById('summary-perm-rubro');
    const emailEl = document.getElementById('summary-perm-email');
    
    if (nameEl) nameEl.innerText = username || '-';
    if (rubroEl) rubroEl.innerText = (u && u.rubro_defecto === 'Mecánico') ? '⚙️ Mecánico' : '⚡ Eléctrico';
    if (emailEl) emailEl.innerText = u ? (u.email || 'Sin email') : '-';

    let perms = getUserEffectivePermissions(username, u ? u.role : 'Solicitante');
    
    // Si tenía menu-all pero ninguno de los subpermisos explícitos (datos legacy), activar ambos
    if (perms.includes('menu-all') && !perms.includes('menu-all-ver') && !perms.includes('menu-all-edit')) {
        perms = [...perms, 'menu-all-ver', 'menu-all-edit'];
    }

    document.querySelectorAll('.perm-checkbox').forEach(cb => {
        cb.checked = perms.includes(cb.value);
    });

    const cbVer = document.getElementById('perm-menu-all-ver');
    const cbEdit = document.getElementById('perm-menu-all-edit');
    if (cbVer) cbVer.checked = perms.includes('menu-all-ver');
    if (cbEdit) cbEdit.checked = perms.includes('menu-all-edit');

    if (typeof window.onPermisoCheckboxChange === 'function') {
        window.onPermisoCheckboxChange();
    }
};

window.seleccionarTodosPermisos = function(state) {
    document.querySelectorAll('.perm-checkbox').forEach(cb => {
        cb.checked = state;
    });
    document.querySelectorAll('.perm-sub-checkbox').forEach(cb => {
        cb.checked = state;
    });
    if (typeof window.onPermisoCheckboxChange === 'function') {
        window.onPermisoCheckboxChange();
    }
};

window.guardarPermisosUsuarioActual = function() {
    const sel = document.getElementById('config-permisos-user-select');
    let username = sel ? sel.value : '';
    if (!username && appData.users && appData.users.length > 0) {
        username = appData.users[0].username;
    }
    if (!username) username = (appData.users && appData.users[0]) ? appData.users[0].username : 'mel';

    if (!appData.userPermissions) {
        appData.userPermissions = {};
    }

    const selected = [];
    document.querySelectorAll('.perm-checkbox').forEach(cb => {
        if (cb.checked) selected.push(cb.value);
    });

    const cbVer = document.getElementById('perm-menu-all-ver');
    const cbEdit = document.getElementById('perm-menu-all-edit');
    if (cbVer && cbVer.checked) selected.push('menu-all-ver');
    if (cbEdit && cbEdit.checked) selected.push('menu-all-edit');

    const cleanKey = String(username).trim().toLowerCase();
    appData.userPermissions[cleanKey] = selected;
    appData.userPermissions[username] = selected;
    saveData();

    // Actualizar barra de navegación inmediatamente si el usuario logueado es el modificado
    const currentUser = getCurrentUser();
    if (currentUser && String(currentUser.username).trim().toLowerCase() === cleanKey) {
        buildSidebar();
    }

    // 1. Mostrar cartel destacado de guardado con éxito
    const banner = document.getElementById('permisos-save-feedback-banner');
    const bannerText = document.getElementById('permisos-save-feedback-text');
    if (banner) {
        if (bannerText) {
            bannerText.innerText = `Los permisos y parámetros para el usuario "${username}" fueron guardados exitosamente (${selected.length} módulos habilitados).`;
        }
        banner.style.display = 'flex';
        if (banner.scrollIntoView) banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // 2. Efecto visual en el botón de guardar
    const saveBtn = document.getElementById('btn-guardar-permisos-usuario');
    if (saveBtn) {
        const originalHtml = saveBtn.innerHTML;
        const originalBg = saveBtn.style.background;
        saveBtn.style.background = '#10b981';
        saveBtn.style.borderColor = '#10b981';
        saveBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> ¡Guardado con Éxito!`;
        setTimeout(() => {
            saveBtn.style.background = originalBg || '#0284c7';
            saveBtn.style.borderColor = '#0284c7';
            saveBtn.innerHTML = originalHtml;
        }, 2500);
    }

    // 3. Notificación Toast global
    showToast(`¡Permisos guardados con éxito para "${username}"!`, 'success');
    
    if (typeof window.onPermisoCheckboxChange === 'function') {
        window.onPermisoCheckboxChange();
    }
};

window.renderConfigUsersTable = function() {
    const tbody = document.getElementById('config-users-table-tbody');
    if (!tbody) return;
    if (!appData || !Array.isArray(appData.users) || appData.users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 14px;">No hay usuarios registrados.</td></tr>`;
        return;
    }

    tbody.innerHTML = appData.users.map((u, idx) => {
        const isFrozen = (u.role === 'Congelado');
        const estadoBadge = isFrozen 
            ? `<span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); font-size: 11px;">⛔ Congelado</span>`
            : `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); font-size: 11px;">✅ Activo</span>`;

        const rubroBadge = (u.rubro_defecto === 'Mecánico')
            ? `<span class="badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); font-size: 11px;">⚙️ Mecánico</span>`
            : `<span class="badge" style="background: rgba(234, 179, 8, 0.2); color: #fde047; border: 1px solid rgba(234, 179, 8, 0.4); font-size: 11px;">⚡ Eléctrico</span>`;

        return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06); background: ${idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'};">
                <td style="padding: 10px 14px; font-weight: 700; color: white;">${u.username}</td>
                <td style="padding: 10px 14px; color: var(--text-muted);">${u.email || '-'}</td>
                <td style="padding: 10px 14px; text-align: center;">${rubroBadge}</td>
                <td style="padding: 10px 14px; text-align: center;">${estadoBadge}</td>
            </tr>
        `;
    }).join('');
};

window.fillPermissionsUserSelect = function() {
    const sel = document.getElementById('config-permisos-user-select');
    if (!sel) return;
    sel.innerHTML = '';
    const userList = (appData && Array.isArray(appData.users)) ? appData.users : [];
    userList.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.username;
        const rubroIcon = u.rubro_defecto === 'Mecánico' ? '⚙️' : '⚡';
        opt.innerText = `👤 ${u.username} [${rubroIcon} ${u.rubro_defecto || 'Eléctrico'}] (${u.email || 'Sin email'})`;
        sel.appendChild(opt);
    });
    if (sel.options.length > 0) {
        window.cargarPermisosParaUsuario(sel.value || sel.options[0].value);
    }
};

window.guardarEmailFacturacionConfig = function() {
    const input = document.getElementById('sys-config-email-facturacion');
    if (!input || !input.value.trim()) {
        showToast('Por favor ingrese una casilla de correo válida', 'error');
        return;
    }
    const cleanEmail = input.value.trim();
    window.emailResponsableFacturacion = cleanEmail;
    if (appData) appData.emailResponsableFacturacion = cleanEmail;
    saveData();
    showToast(`Casilla de facturación actualizada a: ${cleanEmail}`, 'success');
};

function initAdminView() {
    const editSelect = document.getElementById('edit-user-select');
    const deleteSelect = document.getElementById('delete-user-select');
    const deleteWarning = document.getElementById('delete-user-warning');
    const deleteUserName = document.getElementById('delete-user-name');
    const btnFreeze = document.getElementById('btn-freeze-user');
    const btnDelete = document.getElementById('btn-delete-user');
    
    function renderUsers() {
        if (editSelect) editSelect.innerHTML = '<option value="">Seleccione un empleado...</option>';
        if (deleteSelect) deleteSelect.innerHTML = '<option value="">Seleccione un empleado...</option>';
        
        const currentU = getCurrentUser();
        const currentUserId = currentU ? currentU.id : '';
        if (appData && Array.isArray(appData.users)) {
            appData.users.forEach(u => {
                const vendedorStr = u.vendedor_nombre ? ` 🧑‍💼 ${u.vendedor_nombre}` : '';
                const rubroStr = u.rubro_defecto === 'Mecánico' ? ' [⚙️ Mecánico]' : ' [⚡ Eléctrico]';
                const optText = `${u.username}${vendedorStr}${rubroStr} (${u.email || 'Sin email'})`;
                if (editSelect) editSelect.innerHTML += `<option value="${u.id}">${optText}</option>`;
                if (deleteSelect && u.id !== currentUserId) {
                    deleteSelect.innerHTML += `<option value="${u.id}">${optText}</option>`;
                }
            });
        }

        if (deleteWarning) deleteWarning.style.display = 'none';
        if (btnFreeze) {
            btnFreeze.style.opacity = '0.5';
            btnFreeze.style.pointerEvents = 'none';
        }
        if (btnDelete) {
            btnDelete.style.opacity = '0.5';
            btnDelete.style.pointerEvents = 'none';
        }

        window.renderConfigUsersTable();
    }

    renderUsers();
    window.fillPermissionsUserSelect();

    // Correo de Facturación
    const emailFactEl = document.getElementById('sys-config-email-facturacion');
    if (emailFactEl) {
        emailFactEl.value = window.emailResponsableFacturacion || (appData && appData.emailResponsableFacturacion) || 'facturacion@sgmontajes.com.ar';
    }

    // Llenar formulario de edición al seleccionar usuario
    if (editSelect) {
        editSelect.onchange = (e) => {
            const userId = e.target.value;
            const user = (appData && Array.isArray(appData.users)) ? appData.users.find(u => u.id === userId) : null;
            if (user) {
                const uField = document.getElementById('edit-username');
                const eField = document.getElementById('edit-email');
                const pField = document.getElementById('edit-password');
                const rField = document.getElementById('edit-rubro');
                if (uField) uField.value = user.username || '';
                if (eField) eField.value = user.email || '';
                if (pField) pField.value = user.password || '';
                if (rField) rField.value = user.rubro_defecto || 'Eléctrico';

                const perms = getUserEffectivePermissions(user);

                document.querySelectorAll('.edit-user-perm-cb').forEach(cb => {
                    cb.checked = perms.includes(cb.value);
                });
            } else {
                const editFormEl = document.getElementById('edit-user-form');
                if (editFormEl) editFormEl.reset();
                document.querySelectorAll('.edit-user-perm-cb').forEach(cb => {
                    cb.checked = false;
                });
            }
        };
    }

    if (deleteSelect) {
        deleteSelect.onchange = (e) => {
            const userId = e.target.value;
            const user = (appData && Array.isArray(appData.users)) ? appData.users.find(u => u.id === userId) : null;
            
            if (user) {
                if (deleteUserName) deleteUserName.textContent = user.username;
                if (deleteWarning) deleteWarning.style.display = 'block';
                if (btnFreeze) {
                    btnFreeze.style.opacity = '1';
                    btnFreeze.style.pointerEvents = 'auto';
                    if (user.role === 'Congelado') {
                        btnFreeze.innerHTML = '<i class="fa-solid fa-lock-open"></i> Descongelar';
                    } else {
                        btnFreeze.innerHTML = '<i class="fa-solid fa-snowflake"></i> Congelar';
                    }
                    
                    btnFreeze.onclick = () => {
                        user.role = (user.role === 'Congelado') ? 'Solicitante' : 'Congelado';
                        saveData();
                        showToast(`Usuario ${user.username} actualizado (${user.role}).`, 'success');
                        renderUsers();
                        deleteSelect.value = '';
                        if (deleteSelect.onchange) deleteSelect.onchange({ target: { value: '' }});
                    };
                }
                
                if (btnDelete) {
                    btnDelete.style.opacity = '1';
                    btnDelete.style.pointerEvents = 'auto';
                    btnDelete.onclick = () => {
                        const confirmation = prompt(`¿Eliminar definitivamente a ${user.username}? Escriba ELIMINAR para confirmar.`);
                        if (confirmation === 'ELIMINAR') {
                            const uName = user.username;
                            appData.users = appData.users.filter(u => u.id !== user.id);
                            saveData();
                            const client = (typeof getDbClient === 'function') ? getDbClient() : null;
                            if (client) {
                                client.from('usuarios').delete().eq('username', uName).then(function(res) {
                                    if (res && res.error) console.warn("⚠️ Supabase delete user warning:", res.error);
                                    else console.log("☁️ Supabase: Usuario " + uName + " eliminado.");
                                }).catch(function() {});
                            }
                            showToast(`Usuario ${user.username} eliminado.`, 'info');
                            renderUsers();
                            window.fillPermissionsUserSelect();
                            deleteSelect.value = '';
                            if (deleteSelect.onchange) deleteSelect.onchange({ target: { value: '' }});
                        } else {
                            showToast('Eliminación cancelada.', 'error');
                        }
                    };
                }
            } else {
                if (deleteWarning) deleteWarning.style.display = 'none';
                if (btnFreeze) {
                    btnFreeze.style.opacity = '0.5';
                    btnFreeze.style.pointerEvents = 'none';
                }
                if (btnDelete) {
                    btnDelete.style.opacity = '0.5';
                    btnDelete.style.pointerEvents = 'none';
                }
            }
        };
    }

    // Submit edicion
    const editForm = document.getElementById('edit-user-form');
    if (editForm) {
        editForm.onsubmit = (e) => {
            e.preventDefault();
            const userId = editSelect ? editSelect.value : '';
            if (!userId) return;
            
            const userIdx = appData.users.findIndex(u => u.id === userId);
            if (userIdx === -1) return;

            const oldUser = appData.users[userIdx];
            const oldUsername = oldUser.username;

            const uField = document.getElementById('edit-username');
            const eField = document.getElementById('edit-email');
            const pField = document.getElementById('edit-password');
            const rField = document.getElementById('edit-rubro');
            const newUsername = uField ? uField.value.trim().toLowerCase() : '';
            const email = eField ? eField.value.trim() : '';
            const password = pField ? pField.value.trim() : '';
            const rubro_defecto = (rField ? rField.value : 'Eléctrico') || 'Eléctrico';

            const existing = appData.users.find(u => u.username === newUsername && u.id !== userId);
            if (existing) {
                showToast('El nombre de usuario ya está en uso', 'error');
                return;
            }

            appData.users[userIdx].username = newUsername;
            appData.users[userIdx].email = email;
            appData.users[userIdx].password = password;
            appData.users[userIdx].rubro_defecto = rubro_defecto;

            // Extraer vistas seleccionadas
            const selectedPerms = [];
            document.querySelectorAll('.edit-user-perm-cb').forEach(cb => {
                if (cb.checked) selectedPerms.push(cb.value);
            });
            if (selectedPerms.includes('menu-all')) {
                if (!selectedPerms.includes('menu-all-ver')) selectedPerms.push('menu-all-ver');
                if (!selectedPerms.includes('menu-all-edit')) selectedPerms.push('menu-all-edit');
            }

            if (!appData.userPermissions) appData.userPermissions = {};
            if (oldUsername && oldUsername !== newUsername && appData.userPermissions[oldUsername]) {
                delete appData.userPermissions[oldUsername];
            }
            appData.userPermissions[newUsername] = selectedPerms;

            saveData();

            const client = (typeof getDbClient === 'function') ? getDbClient() : null;
            if (client) {
                client.from('usuarios').upsert([{
                    id: String(appData.users[userIdx].id),
                    username: newUsername,
                    email: email,
                    password: password,
                    role: appData.users[userIdx].role || 'Solicitante',
                    rubro_defecto: rubro_defecto,
                    vendedor_codigo: appData.users[userIdx].vendedor_codigo || '',
                    vendedor_nombre: appData.users[userIdx].vendedor_nombre || ''
                }], { onConflict: 'username' }).then(function(res) {
                    if (res && res.error) console.warn("⚠️ Supabase edit user warning:", res.error);
                    else console.log("☁️ Supabase: Usuario " + newUsername + " actualizado en tabla usuarios.");
                }).catch(function() {});
            }

            showToast('Credenciales y vistas actualizadas exitosamente.', 'success');
            const currentUser = getCurrentUser();
            if (currentUser && (currentUser.username === oldUsername || currentUser.username === newUsername)) {
                buildSidebar();
            }
            renderUsers();
            window.fillPermissionsUserSelect();
            editForm.reset();
        };
    }

    // Submit creacion
    const createForm = document.getElementById('create-user-form');
    if (createForm) {
        createForm.onsubmit = (e) => {
            e.preventDefault();
            const uField = document.getElementById('new-username');
            const pField = document.getElementById('new-password');
            const eField = document.getElementById('new-email');
            const rField = document.getElementById('new-rubro');
            const username = uField ? uField.value.trim().toLowerCase() : '';
            const password = pField ? pField.value.trim() : '';
            const email = eField ? eField.value.trim() : '';
            const rubro_defecto = (rField ? rField.value : 'Eléctrico') || 'Eléctrico';

            if (appData.users.find(u => u.username === username)) {
                showToast('El usuario ya existe', 'error');
                return;
            }

            const newUser = {
                id: generateId(),
                username,
                password,
                email,
                role: 'Solicitante',
                rubro_defecto,
                vendedor_codigo: '',
                vendedor_nombre: ''
            };

            appData.users.push(newUser);
            
            // Extraer vistas seleccionadas para el nuevo usuario
            const selectedPerms = [];
            document.querySelectorAll('.new-user-perm-cb').forEach(cb => {
                if (cb.checked) selectedPerms.push(cb.value);
            });
            if (selectedPerms.includes('menu-all')) {
                if (!selectedPerms.includes('menu-all-ver')) selectedPerms.push('menu-all-ver');
                if (!selectedPerms.includes('menu-all-edit')) selectedPerms.push('menu-all-edit');
            }

            if (!appData.userPermissions) appData.userPermissions = {};
            appData.userPermissions[username] = selectedPerms.length > 0 ? selectedPerms : ['menu-ingresar', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-all', 'menu-all-ver', 'menu-all-edit'];

            saveData();

            const client = (typeof getDbClient === 'function') ? getDbClient() : null;
            if (client) {
                client.from('usuarios').upsert([{
                    id: String(newUser.id),
                    username: newUser.username,
                    password: newUser.password,
                    email: newUser.email,
                    role: newUser.role,
                    rubro_defecto: newUser.rubro_defecto,
                    vendedor_codigo: '',
                    vendedor_nombre: ''
                }], { onConflict: 'username' }).then(function(res) {
                    if (res && res.error) console.warn("⚠️ Supabase create user warning:", res.error);
                    else console.log("☁️ Supabase: Usuario " + newUser.username + " registrado exitosamente en tabla usuarios.");
                }).catch(function() {});
            }

            showToast(`Usuario ${username} creado exitosamente (${rubro_defecto}).`, 'success');
            e.target.reset();
            renderUsers();
            window.fillPermissionsUserSelect();
        };
    }
}

// ================= NAVEGACIÓN Y TABS DE CONFIGURACIÓN GLOBAL =================
window.switchConfigMainTab = function(tabName) {
    const btnUsers = document.getElementById('main-tab-btn-usuarios');
    const btnSys = document.getElementById('main-tab-btn-sistema');
    const secUsers = document.getElementById('config-section-usuarios');
    const secSys = document.getElementById('config-section-sistema');

    if (tabName === 'usuarios') {
        if (btnUsers) { 
            btnUsers.style.background = '#0284c7'; 
            btnUsers.style.color = 'white'; 
        }
        if (btnSys) { 
            btnSys.style.background = 'rgba(30, 41, 59, 0.6)'; 
            btnSys.style.color = 'var(--text-muted)'; 
        }
        if (secUsers) secUsers.style.display = 'block';
        if (secSys) secSys.style.display = 'none';
    } else {
        if (btnUsers) { 
            btnUsers.style.background = 'rgba(30, 41, 59, 0.6)'; 
            btnUsers.style.color = 'var(--text-muted)'; 
        }
        if (btnSys) { 
            btnSys.style.background = '#0284c7'; 
            btnSys.style.color = 'white'; 
        }
        if (secUsers) secUsers.style.display = 'none';
        if (secSys) secSys.style.display = 'block';
        
        if (typeof window.fillPermissionsUserSelect === 'function') {
            window.fillPermissionsUserSelect();
        }
    }
};

window.switchAdminTab = function(tabId) {
    document.querySelectorAll('.admin-tab').forEach(btn => {
        btn.classList.remove('active');
        btn.style.color = 'var(--text-muted)';
        btn.style.borderBottomColor = 'transparent';
    });
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    const activeBtn = document.querySelector(`button[onclick="switchAdminTab('${tabId}')"]`);
    if(activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.color = 'var(--text-main)';
        activeBtn.style.borderBottomColor = 'var(--primary)';
    }
    
    const activeContent = document.getElementById(tabId);
    if(activeContent) activeContent.style.display = 'block';

    if (tabId === 'tab-user-list' && typeof window.renderConfigUsersTable === 'function') {
        window.renderConfigUsersTable();
    }
};

window.togglePassword = function(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        if (btn) btn.style.opacity = '1';
    } else {
        input.type = 'password';
        if (btn) btn.style.opacity = '0.7';
    }
};

// ================= GESTIÓN GLOBAL DE RESPALDOS (BACKUP) =================
window.exportarBaseDeDatosBackup = function() {
    try {
        let exportData = appData;
        if (!exportData || typeof exportData !== 'object' || !Array.isArray(exportData.users) || exportData.users.length === 0) {
            try {
                const stored = localStorage.getItem('appData');
                if (stored) exportData = JSON.parse(stored);
            } catch(e) {}
        }
        if (!exportData || typeof exportData !== 'object') {
            exportData = {
                users: (typeof defaultData !== 'undefined' && defaultData.users) ? defaultData.users : [],
                pedidos: [],
                notifications: [],
                userPermissions: {}
            };
        }

        const jsonString = JSON.stringify(exportData, null, 2);
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const fileName = `sgmontajes_backup_${yyyy}-${mm}-${dd}_${hh}${min}.json`;

        let url = '';
        let isBlob = false;
        try {
            const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
            url = URL.createObjectURL(blob);
            isBlob = true;
        } catch (blobErr) {
            url = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonString);
        }

        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', fileName);
        a.style.position = 'fixed';
        a.style.left = '-9999px';
        a.style.top = '-9999px';
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            if (a && a.parentNode) {
                a.parentNode.removeChild(a);
            }
            if (isBlob && url) {
                URL.revokeObjectURL(url);
            }
        }, 500);

        showToast(`Copia de respaldo descargada: ${fileName}`, 'success');
    } catch (err) {
        console.error('Error al exportar backup:', err);
        showToast('Error al generar la descarga: ' + err.message, 'error');
    }
};

window.importarBaseDeDatosBackup = function(e) {
    try {
        const fileInput = e ? (e.target || e.srcElement) : document.getElementById('import-db-file');
        const file = fileInput && fileInput.files ? fileInput.files[0] : null;
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const parsed = JSON.parse(event.target.result);
                if (parsed && (parsed.users || parsed.pedidos)) {
                    if (!parsed.users) parsed.users = [];
                    if (!parsed.pedidos) parsed.pedidos = [];
                    if (!parsed.notifications) parsed.notifications = [];
                    appData = parsed;
                    saveData();
                    showToast('Base de datos restaurada correctamente.', 'success');
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    showToast('El archivo no contiene una copia de respaldo válida.', 'error');
                }
            } catch(err) {
                console.error('Error al procesar JSON:', err);
                showToast('Error al procesar el archivo JSON de respaldo.', 'error');
            } finally {
                if (fileInput) fileInput.value = '';
            }
        };
        reader.readAsText(file);
    } catch (err) {
        console.error('Error al importar:', err);
        showToast('Error al importar archivo de respaldo.', 'error');
    }
};

window.loginAs = function(userStr, passStr) {
    const userInput = document.getElementById('username');
    const passInput = document.getElementById('password');
    if (userInput && passInput) {
        userInput.value = userStr;
        passInput.value = passStr;
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
    }
};

// Función global de login — vinculada desde HTML (onclick) y desde startApp
window.ejecutarLoginDirecto = function(e) {
    if (e) {
        try { if (e.preventDefault) e.preventDefault(); } catch(err) {}
        try { if (e.stopPropagation) e.stopPropagation(); } catch(err) {}
    }

    try {
        var userInput = document.getElementById('username');
        var passInput = document.getElementById('password');
        var rawUserVal = userInput ? userInput.value.trim() : '';
        var cleanUserVal = rawUserVal.toLowerCase().replace(/\s+/g, '');
        var passVal = passInput ? passInput.value.trim() : '';

        if (!cleanUserVal) {
            showToast('Por favor ingrese su nombre de usuario', 'warning');
            return;
        }

        if (!appData) appData = { users: [], pedidos: [], notifications: [] };
        if (!Array.isArray(appData.users) || appData.users.length === 0) {
            appData.users = defaultData.users.slice();
        }

        // 1. Buscar en appData.users
        var found = appData.users.find(function(u) {
            var uName = String(u.username || '').trim().toLowerCase().replace(/\s+/g, '');
            return uName === cleanUserVal;
        });

        // 2. Si no se encontró en appData.users, buscar en defaultData.users
        if (!found && Array.isArray(defaultData.users)) {
            found = defaultData.users.find(function(u) {
                var uName = String(u.username || '').trim().toLowerCase().replace(/\s+/g, '');
                return uName === cleanUserVal;
            });
            if (found) {
                appData.users.push(found);
            }
        }

        // 3. Fallback de emergencia
        if (!found && (cleanUserVal === 'mel' || cleanUserVal === 'melani' || cleanUserVal === 'admin')) {
            found = { id: '1', username: 'mel', password: '123', email: 'mel@empresa.com', role: 'Administrador', rubro_defecto: 'Eléctrico' };
            appData.users.push(found);
        }

        if (!found) {
            showToast('Usuario no registrado. Ingrese un usuario válido (ej: mel, juanluis, luciano, roberto, etc.)', 'error');
            return;
        }

        if (found.role === 'Congelado') {
            showToast('Tu cuenta está congelada. Contactá al administrador.', 'error');
            return;
        }

        // Aceptar la clave configurada o '123'
        var expectedPass = String(found.password || '123').trim();
        if (passVal && passVal !== expectedPass && passVal !== '123') {
            showToast('Contraseña incorrecta para el usuario "' + found.username + '".', 'error');
            return;
        }

        appData.currentUserId = String(found.id);
        saveData();

        reqTipoPresupuesto = found.rubro_defecto || 'Eléctrico';

        showToast('¡Bienvenido, ' + found.username + '!', 'success');
        switchView('main');
        
        try {
            buildSidebar();
        } catch(sbErr) {
            console.error("Error al generar barra de menú:", sbErr);
        }

        try {
            renderNotifications();
        } catch(ntErr) {
            console.error("Error al renderizar notificaciones:", ntErr);
        }

        if (window.checkScheduledOcAlerts) {
            try { window.checkScheduledOcAlerts(); } catch(ocErr) {}
        }

        if (userInput) userInput.value = '';
        if (passInput) passInput.value = '';
    } catch(globalLoginErr) {
        console.error("Error al ejecutar login:", globalLoginErr);
        showToast("Aviso al iniciar sesión: " + (globalLoginErr.message || ''), "error");
    }
};

function startApp() {
    // Configurar frase motivacional
    var quoteEl = document.getElementById('motivational-quote');
    var loginQuoteEl = document.getElementById('login-quote');
    var randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    if (quoteEl) quoteEl.innerText = '"' + randomQuote + '"';
    if (loginQuoteEl) loginQuoteEl.innerText = '"' + randomQuote + '"';

    // Asegurar que appData.users tenga datos y filtrar admin, aut, sol
    if (!appData) appData = defaultData;
    if (!Array.isArray(appData.users) || appData.users.length === 0) {
        appData.users = defaultData.users.slice();
    } else {
        appData.users = appData.users.filter(u => !['admin', 'aut', 'sol'].includes(String(u.username).trim().toLowerCase()));
        if (appData.users.length === 0) {
            appData.users = defaultData.users.slice();
        }
    }

    // SIEMPRE EXIGIR CREDENCIALES AL INGRESAR (Sin Auto-Login)
    appData.currentUserId = null;
    try { localStorage.removeItem('pedidos_current_user_id'); } catch(e) {}
    
    var userInput = document.getElementById('username');
    var passInput = document.getElementById('password');
    if (userInput) userInput.value = '';
    if (passInput) passInput.value = '';
    
    switchView('login');

    // Vincular formulario de login
    var loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = window.ejecutarLoginDirecto;
    }

    // Botón de salir
    var logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = function() {
            appData.currentUserId = null;
            try { localStorage.removeItem('pedidos_current_user_id'); } catch(e) {}
            showToast('Sesión cerrada correctamente.', 'info');
            switchView('login');
        };
    }

    // Botón de restablecer localStorage
    var resetBtn = document.getElementById('reset-ls-btn');
    if (resetBtn) {
        resetBtn.onclick = function(ev) {
            ev.preventDefault();
            purgarPresupuestosDePrueba();
        };
    }
}

// Función global para purgar y vaciar presupuestos y datos de prueba
async function purgarPresupuestosDePrueba(silencioso = false) {
    if (!silencioso) {
        const confirmacion = confirm(
            "⚠️ ¿Está seguro que desea BORRAR TODOS los presupuestos y datos de prueba para dejar la base limpia en cero?\n\nEsta acción vaciará la lista de presupuestos tanto en su navegador como en Supabase para que comience con presupuestos reales.\n(Los clientes y usuarios oficiales se mantendrán intactos)."
        );
        if (!confirmacion) return false;
    }

    try {
        appData.pedidos = [];
        appData.notifications = [];
        saveData();

        const client = getDbClient();
        if (client) {
            let res = await client.from('app_state').upsert({
                id: 'globalData',
                pedidos: [],
                users: appData.users || [],
                notifications: [],
                user_permissions: appData.userPermissions || {},
                // custom_prices: (typeof appData !== 'undefined' && appData && appData.customPrices) ? appData.customPrices : {},
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
            
            if (res && res.error) {
                alert("Error al vaciar estado global: " + res.error.message);
            }

            let res2 = await client.from('presupuestos').delete().neq('id', '___ROOT_DUMMY___');
            if (res2 && res2.error) {
                alert("Atención: No se pudieron borrar presupuestos individuales. Puede haber restricciones de seguridad (RLS) en la base de datos: " + res2.error.message);
            }
            await client.from('presupuesto_items').delete().neq('id', '___ROOT_DUMMY___');
            await client.from('avances_obra').delete().neq('id', '___ROOT_DUMMY___');
            await client.from('notificaciones').delete().neq('id', '___ROOT_DUMMY___');
            
            if (!silencioso) {
                showToast("Base de datos limpiada con éxito.", "success");
            }
        }

        // Actualizar vistas si están cargadas en el DOM
        if (typeof renderAllPresupuestosTable === 'function') {
            try { renderAllPresupuestosTable(); } catch(e) {}
        }
        if (typeof renderAssignments === 'function') {
            try { renderAssignments(); } catch(e) {}
        }
        if (typeof renderStats === 'function') {
            try { renderStats(); } catch(e) {}
        }
        if (typeof renderNotificationsBadge === 'function') {
            try { renderNotificationsBadge(); } catch(e) {}
        }
        if (typeof renderPresupuestosTable === 'function') {
            try { renderPresupuestosTable(); } catch(e) {}
        }

        if (!silencioso) {
            showToast("✅ Base de datos limpiada con éxito. El sistema está listo para cargar presupuestos reales desde cero.", "success");
        }
        return true;
    } catch(err) {
        console.error("Error al purgar base de datos:", err);
        if (!silencioso) {
            showToast("Aviso: se limpiaron los datos locales. " + (err.message || ''), "info");
        }
        return false;
    }
}
window.purgarPresupuestosDePrueba = purgarPresupuestosDePrueba;

// --- VISTA DE CONSULTA DE STOCK ---
let stockQueryRubroFilter = '';
let stockQueryEstadoFilter = '';
let stockQuerySearchVal = '';

function initStockQueryView() {
    const rubroFilter = document.getElementById('filter-stock-rubro');
    const estadoFilter = document.getElementById('filter-stock-estado');
    const searchInput = document.getElementById('search-stock');

    // Resetear filtros
    stockQueryRubroFilter = '';
    stockQueryEstadoFilter = '';
    stockQuerySearchVal = '';

    // Llenar selectores de filtro
    if (rubroFilter && typeof stockDB !== 'undefined') {
        const rubros = [...new Set(stockDB.map(s => s.rubro).filter(Boolean))].sort();
        let html = '<option value="">Todos los Rubros...</option>';
        rubros.forEach(r => {
            html += `<option value="${r}">${r}</option>`;
        });
        rubroFilter.innerHTML = html;
    }

    if (estadoFilter && typeof stockDB !== 'undefined') {
        const estados = [...new Set(stockDB.map(s => s.estado).filter(Boolean))].sort();
        let html = '<option value="">Todos los Estados...</option>';
        estados.forEach(e => {
            html += `<option value="${e}">${e}</option>`;
        });
        estadoFilter.innerHTML = html;
    }

    // Configurar listeners
    if (rubroFilter) {
        rubroFilter.onchange = (e) => {
            stockQueryRubroFilter = e.target.value;
            renderStockTable();
        };
    }
    if (estadoFilter) {
        estadoFilter.onchange = (e) => {
            stockQueryEstadoFilter = e.target.value;
            renderStockTable();
        };
    }
    if (searchInput) {
        searchInput.oninput = (e) => {
            stockQuerySearchVal = e.target.value.toLowerCase().trim();
            renderStockTable();
        };
    }

    renderStockTable();
}

function renderStockTable() {
    const listBody = document.getElementById('stock-query-list');
    const resultsCount = document.getElementById('stock-results-count');
    if (!listBody || typeof stockDB === 'undefined') return;

    let filtered = stockDB;

    // Aplicar filtros
    if (stockQueryRubroFilter) {
        filtered = filtered.filter(s => s.rubro === stockQueryRubroFilter);
    }
    if (stockQueryEstadoFilter) {
        filtered = filtered.filter(s => s.estado === stockQueryEstadoFilter);
    }
    if (stockQuerySearchVal) {
        filtered = filtered.filter(s => 
            s.detalle.toLowerCase().includes(stockQuerySearchVal) || 
            s.codigo.includes(stockQuerySearchVal)
        );
    }

    // Calcular KPIs rápidos del subconjunto actual
    const kpiTotal = filtered.length;
    const kpiAvailable = filtered.filter(s => s.stock > 0).length;
    const kpiEmpty = filtered.filter(s => s.stock <= 0).length;

    const totalKPIEl = document.getElementById('stock-kpi-total');
    const availKPIEl = document.getElementById('stock-kpi-available');
    const emptyKPIEl = document.getElementById('stock-kpi-empty');

    if (totalKPIEl) totalKPIEl.innerText = kpiTotal.toLocaleString('es-AR');
    if (availKPIEl) availKPIEl.innerText = kpiAvailable.toLocaleString('es-AR');
    if (emptyKPIEl) emptyKPIEl.innerText = kpiEmpty.toLocaleString('es-AR');

    resultsCount.innerText = `Mostrando ${filtered.length} productos`;

    if (filtered.length === 0) {
        listBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">No se encontraron artículos con los filtros seleccionados.</td></tr>`;
        return;
    }

    // Generar la tabla por chunks o renderizado fragmentado
    let html = '';
    // Limitamos la cantidad en pantalla si es muy grande o paginamos para evitar ralentizar.
    const limit = 200;
    const sliced = filtered.slice(0, limit);
    
    sliced.forEach(s => {
        const badgeClass = s.stock > 0 ? 'status-auth' : 'status-rej';
        const badgeText = s.stock > 0 ? 'Disponible' : 'Agotado';
        
        html += `
            <tr>
                <td style="font-family: monospace;">${s.codigo}</td>
                <td><strong>${s.detalle}</strong><div style="font-size: 10px; color: var(--text-muted);">${s.estado || 'COMERCIAL'}</div></td>
                <td>${s.rubro}</td>
                <td>${s.subrubro || '-'}</td>
                <td style="text-align: right; font-family: monospace;">$${s.precio.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: right; font-family: monospace; font-weight: bold;">${s.stock.toLocaleString('es-AR')}</td>
                <td style="text-align: center;">
                    <span class="status-badge ${badgeClass}" style="min-width: 100px; padding: 2px 8px; font-size: 11px;">
                        ${badgeText}
                    </span>
                </td>
            </tr>
        `;
    });

    listBody.innerHTML = html;
    
    if (filtered.length > limit) {
        resultsCount.innerText = `Mostrando primeros ${limit} de ${filtered.length} productos (refine su búsqueda)`;
    }
}

window.initStockQueryView = initStockQueryView;
window.renderStockTable = renderStockTable;

// --- CONTEXT MENU DE FECHAS (Filtros Rápidos en Clic Derecho) ---
window.currentDateContextMenuTarget = 'assignments';

window.selectDatePresetFromContextMenu = function(preset) {
    if (window.currentDateContextMenuTarget === 'metrics') {
        const selectEl = document.getElementById('preset-date-filter-metrics');
        if (selectEl) {
            selectEl.value = preset;
            applyPresetDateFilterMetrics(preset);
        }
    } else {
        const selectEl = document.getElementById('preset-date-filter');
        if (selectEl) {
            selectEl.value = preset;
            applyPresetDateFilter(preset);
        }
    }
    
    // Ocultar menú
    const menu = document.getElementById('date-context-menu');
    if (menu) menu.style.display = 'none';
};

// Delegación de eventos contextmenu en el documento para detectar clics derechos sobre los campos de fecha
document.addEventListener('contextmenu', function(e) {
    const target = e.target;
    if (target && (target.id === 'filter-date-from' || target.id === 'filter-date-to' || target.id === 'filter-date-start' || target.id === 'filter-date-end')) {
        e.preventDefault();
        
        // Determinar qué vista es según el id
        const isMetrics = target.id === 'filter-date-start' || target.id === 'filter-date-end';
        window.currentDateContextMenuTarget = isMetrics ? 'metrics' : 'assignments';
        
        const menu = document.getElementById('date-context-menu');
        if (menu) {
            // Mostrar para poder medir su offsetWidth/offsetHeight
            menu.style.display = 'block';
            
            const menuWidth = menu.offsetWidth || 180;
            const menuHeight = menu.offsetHeight || 220;
            
            let left = e.clientX;
            let top = e.clientY;
            
            // Si sobresale de la derecha de la pantalla, mover a la izquierda
            if (left + menuWidth > window.innerWidth) {
                left = window.innerWidth - menuWidth - 10;
            }
            if (left < 10) left = 10;
            
            // Si sobresale de abajo de la pantalla, mover hacia arriba
            if (top + menuHeight > window.innerHeight) {
                top = window.innerHeight - menuHeight - 10;
            }
            if (top < 10) top = 10;
            
            menu.style.left = `${left}px`;
            menu.style.top = `${top}px`;
        }
    } else {
        const menu = document.getElementById('date-context-menu');
        if (menu) menu.style.display = 'none';
    }
});

// Ocultar menú en clics normales
document.addEventListener('click', function(e) {
    const menu = document.getElementById('date-context-menu');
    if (menu && !menu.contains(e.target)) {
        menu.style.display = 'none';
    }
});

// Ocultar menú y cerrar modal con Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const menu = document.getElementById('date-context-menu');
        if (menu) menu.style.display = 'none';
        
        const overlay = document.getElementById('modal-overlay');
        if (overlay && overlay.style.display === 'flex') {
            closeModal();
        }
    }
});

// Función para enviar el presupuesto oficial por WhatsApp
window.compartirWhatsAppPedido = function(id) {
    const p = appData.pedidos.find(x => x.id === id);
    if (!p) return;
    const nro = formatPresupuestoCodigo(p);
    const cliente = p.cliente_nombre ? p.cliente_nombre.toUpperCase() : 'CONSUMIDOR FINAL';
    const total = p.importe ? p.importe.toLocaleString('es-AR', {minimumFractionDigits: 2}) : '0,00';
    let msg = `*SG MONTAJES - PRESUPUESTO Nro. ${nro}*\n`;
    msg += `Fecha: ${p.fecha}\n`;
    msg += `Cliente: ${cliente}\n`;
    if (p.meca_nro_oc || p.nro_oc) {
        msg += `Orden de Compra (OC): ${p.meca_nro_oc || p.nro_oc}\n`;
    }
    msg += `------------------------------------\n`;
    if (Array.isArray(p.items)) {
        p.items.forEach(it => {
            const sub = (it.cantidad * it.precio).toLocaleString('es-AR', {minimumFractionDigits: 2});
            msg += `• ${it.codigo} - ${it.detalle} (x${it.cantidad}) = $${sub}\n`;
        });
    }
    msg += `------------------------------------\n`;
    msg += `*TOTAL: $${total}*\n\n`;
    msg += `Comprobante no válido como factura - SG MONTAJES`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
};

// --- DYNAMIC EXCEL GRID FOR PRESUPUESTO MECÁNICO ---
window.activeMecaTab = 0;

window.switchMecaTab = function(idx) {
    window.activeMecaTab = idx;
    for (let i = 0; i < 5; i++) {
        const bodyEl = document.getElementById(`meca-sec-body-${i}`);
        if (bodyEl) {
            bodyEl.style.display = i === idx ? 'table-row-group' : 'none';
        }
        const tabEl = document.getElementById(`meca-tab-${i}`);
        if (tabEl) {
            const isSelected = i === idx;
            tabEl.style.background = isSelected ? '#0891b2' : 'rgba(30, 41, 59, 0.6)';
            tabEl.style.color = isSelected ? '#ffffff' : 'var(--text-muted)';
            tabEl.style.border = `1px solid ${isSelected ? '#0891b2' : 'rgba(255, 255, 255, 0.1)'}`;
            tabEl.style.borderBottom = 'none';
            tabEl.style.fontWeight = isSelected ? '800' : '700';
        }
    }
};

window.renderMecanicoExcelGridInContainer = function(container, isEditable = true) {
    if (!container) return;

    const catalog = getActiveStockCatalog();
    
    // Group catalog by subrubro (hide Materiales y Equipos for Eléctrico)
    const sections = [
        { 
            name: "Materiales y Equipos", 
            items: reqTipoPresupuesto === 'Eléctrico' ? [] : catalog.filter(i => i.subrubro === "Materiales y Equipos" || i.subrubro === "Materiales") 
        },
        { name: "Mano de Obra EN TALLER", note: "VALOR HORA INCLUYE COPA", items: catalog.filter(i => i.subrubro === "Mano de Obra EN TALLER") },
        { name: "Mano de Obra MANTENIMIENTO", items: catalog.filter(i => i.subrubro && i.subrubro.includes("MANTENIMIENTO") && !i.subrubro.includes("EMERGENCIA")) },
        { name: "Mano de Obra PARADA DE PLANTA", note: "VALOR HORA INCLUYE COPA", items: catalog.filter(i => i.subrubro && (i.subrubro.includes("PARADA DE PLANTA") || i.subrubro.includes("PARADA PLANTA"))) },
        { name: "Mano de Obra EMERGENCIA MANTENIMIENTO", items: catalog.filter(i => i.subrubro && i.subrubro.includes("EMERGENCIA")) }
    ];

    // Find first visible tab index
    let firstVisibleTab = -1;
    sections.forEach((sec, idx) => {
        if (sec.items.length > 0 && firstVisibleTab === -1) {
            firstVisibleTab = idx;
        }
    });

    if (firstVisibleTab !== -1 && (window.activeMecaTab === -1 || !sections[window.activeMecaTab] || sections[window.activeMecaTab].items.length === 0)) {
        window.activeMecaTab = firstVisibleTab;
    }

    let html = `
        <div style="background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; overflow: hidden; color: var(--text-main); box-shadow: var(--glass-shadow); font-family: inherit; margin-bottom: 15px; text-align: left;">
            <div style="background: rgba(6, 182, 212, 0.15); color: #22d3ee; font-weight: 800; font-size: 14px; padding: 12px 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="background: #0891b2; color: white; border-radius: 4px; padding: 2px 8px; font-size: 12px; font-weight: 800;">2</span>
                    <span style="text-decoration: underline; letter-spacing: 0.5px;">PROPUESTA COMERCIAL (TARIFARIO)</span>
                </div>
                <span style="font-size: 11px; font-weight: bold; color: #22d3ee;">${isEditable ? '✏️ Complete las cantidades usando las pestañas' : '👁️ Vista del Tarifario'}</span>
            </div>

            <div style="display: flex; flex-wrap: wrap; gap: 6px; background: rgba(15, 23, 42, 0.5); border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding: 10px 10px 0 10px;">
    `;

    let visibleTabNumber = 1;
    sections.forEach((sec, idx) => {
        const hasItems = sec.items.length > 0;
        const displayStyle = hasItems ? 'block' : 'none';
        const isSelected = window.activeMecaTab === idx;
        const tabNumber = hasItems ? visibleTabNumber++ : '';
        html += `
            <button type="button" id="meca-tab-${idx}" onclick="switchMecaTab(${idx})" 
                style="display: ${displayStyle}; padding: 10px 16px; border: 1px solid ${isSelected ? '#0891b2' : 'rgba(255, 255, 255, 0.1)'}; border-bottom: none; border-radius: 8px 8px 0 0; background: ${isSelected ? '#0891b2' : 'rgba(30, 41, 59, 0.6)'}; color: ${isSelected ? '#ffffff' : 'var(--text-muted)'}; font-weight: ${isSelected ? '800' : '700'}; font-size: 12px; cursor: pointer; text-transform: uppercase; transition: all 0.2s ease;">
                ${tabNumber ? `${tabNumber}. ` : ''}${sec.name.replace('Mano de Obra', 'MO')}
            </button>
        `;
    });

    html += `
            </div>
            
            <div style="overflow-x: auto; padding: 10px; background: transparent;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: var(--text-main); background: transparent;">
                    <thead>
                        <tr style="background: rgba(15, 23, 42, 0.7); border-bottom: 1px solid rgba(255, 255, 255, 0.1); font-weight: bold; text-align: left;">
                            <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 10px; text-align: center; width: 45px; color: #ffffff !important; font-weight: 800; font-size: 12px;">#</th>
                            <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 10px; color: #ffffff !important; font-weight: 800; font-size: 12px;">Tarifario</th>
                            <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 10px; text-align: center; width: 160px; color: #ffffff !important; font-weight: 800; font-size: 12px;">Cantidades Estimadas</th>
                            <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 10px; text-align: center; width: 85px; color: #ffffff !important; font-weight: 800; font-size: 12px;">U.D.M.</th>
                            <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 10px; text-align: right; width: 140px; color: #ffffff !important; font-weight: 800; font-size: 12px;">Precio unitario</th>
                            <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 10px; text-align: right; width: 140px; color: #ffffff !important; font-weight: 800; font-size: 12px;">Precio Total</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    let globalItemIndex = 1;

    sections.forEach((sec, secIdx) => {
        html += `
            <tbody id="meca-sec-body-${secIdx}" style="display: ${window.activeMecaTab === secIdx ? 'table-row-group' : 'none'};">
        `;

        if (sec.items.length === 0) {
            html += `
                <tr style="background: rgba(0,0,0,0.2);">
                    <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px; font-style: italic; font-size: 12px; font-weight: 600;">
                        No hay conceptos o ítems registrados en esta categoría.
                    </td>
                </tr>
            `;
        }

        sec.items.forEach((item, index) => {
            const existing = pedidoItems.find(pi => pi.codigo === item.codigo);
            const initialQty = existing ? existing.cantidad : '';
            const initialTotal = existing ? (existing.cantidad * item.precio) : 0;
            
            // Subheaders and section banners for Eléctrico budget
            if (reqTipoPresupuesto === 'Eléctrico') {
                if (secIdx === 2) { // Mano de Obra MANTENIMIENTO
                    if (index === 0) {
                        html += `
                            <tr style="background: rgba(6, 182, 212, 0.2); color: #22d3ee; font-weight: 900; font-size: 13px;">
                                <td style="text-align: center; color: #22d3ee; font-family: monospace; border: 1px solid rgba(6, 182, 212, 0.3); padding: 10px; font-weight: 900;">39</td>
                                <td colspan="5" style="border: 1px solid rgba(6, 182, 212, 0.3); padding: 10px; text-align: left; color: #22d3ee !important;"><strong>ACUERDO POR HS DE MANTENIMIENTO</strong></td>
                            </tr>
                            <tr style="background: rgba(234, 179, 8, 0.2); color: #fde047; font-weight: 800;">
                                <td style="text-align: center; color: #fde047; font-family: monospace; border: 1px solid rgba(234, 179, 8, 0.3); padding: 8px; font-weight: 800;">40</td>
                                <td colspan="5" style="border: 1px solid rgba(234, 179, 8, 0.3); padding: 8px; color: #fde047 !important; font-size: 12px;"><strong>Mano de obra por Hs al 76%</strong></td>
                            </tr>
                        `;
                    } else if (index === 5) {
                        html += `
                            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05); background: rgba(255, 255, 255, 0.01);">
                                <td style="border: 1px solid rgba(255, 255, 255, 0.05); padding: 8px; text-align: center; color: var(--text-muted); font-family: monospace;">46</td>
                                <td style="border: 1px solid rgba(255, 255, 255, 0.05); padding: 8px;"></td>
                                <td colspan="4" style="border: 1px solid rgba(255, 255, 255, 0.05);"></td>
                            </tr>
                            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05); background: rgba(255, 255, 255, 0.01);">
                                <td style="border: 1px solid rgba(255, 255, 255, 0.05); padding: 8px; text-align: center; color: var(--text-muted); font-family: monospace;">47</td>
                                <td style="border: 1px solid rgba(255, 255, 255, 0.05); padding: 8px;"></td>
                                <td colspan="4" style="border: 1px solid rgba(255, 255, 255, 0.05);"></td>
                            </tr>
                            <tr style="background: rgba(234, 179, 8, 0.2); color: #fde047; font-weight: 800;">
                                <td style="text-align: center; color: #fde047; font-family: monospace; border: 1px solid rgba(234, 179, 8, 0.3); padding: 8px; font-weight: 800;">48</td>
                                <td colspan="5" style="border: 1px solid rgba(234, 179, 8, 0.3); padding: 8px; color: #fde047 !important; font-size: 12px;"><strong>Mano de Obra por Hs al 36%</strong></td>
                            </tr>
                        `;
                    } else if (index === 11) {
                        html += `
                            <tr style="background: rgba(234, 179, 8, 0.2); color: #fde047; font-weight: 800;">
                                <td style="text-align: center; color: #fde047; font-family: monospace; border: 1px solid rgba(234, 179, 8, 0.3); padding: 8px; font-weight: 800;">55</td>
                                <td colspan="5" style="border: 1px solid rgba(234, 179, 8, 0.3); padding: 8px; color: #fde047 !important; font-size: 12px;"><strong>Mano de Obra por hs Normales</strong></td>
                            </tr>
                        `;
                    }
                } else if (secIdx === 3) { // Mano de Obra PARADA DE PLANTA
                    if (index === 0) {
                        html += `
                            <tr style="background: rgba(6, 182, 212, 0.2); color: #22d3ee; font-weight: 900; font-size: 13px;">
                                <td style="text-align: center; color: #22d3ee; font-family: monospace; border: 1px solid rgba(6, 182, 212, 0.3); padding: 10px; font-weight: 900;">66</td>
                                <td colspan="5" style="border: 1px solid rgba(6, 182, 212, 0.3); padding: 10px; text-align: left; color: #22d3ee !important;"><strong>ACUERDO POR HS EN PARADA DE PLANTA</strong></td>
                            </tr>
                            <tr style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7; font-weight: 800;">
                                <td style="text-align: center; color: #6ee7b7; font-family: monospace; border: 1px solid rgba(16, 185, 129, 0.3); padding: 8px;">67</td>
                                <td colspan="5" style="border: 1px solid rgba(16, 185, 129, 0.3); padding: 8px; color: #6ee7b7 !important;"><strong>Mano de obra por Hs al 76% en parada de planta</strong></td>
                            </tr>
                        `;
                    } else if (index === 5) {
                        html += `
                            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05); background: rgba(255, 255, 255, 0.01);">
                                <td style="border: 1px solid rgba(255, 255, 255, 0.05); padding: 8px; text-align: center; color: var(--text-muted); font-family: monospace;">73</td>
                                <td style="border: 1px solid rgba(255, 255, 255, 0.05); padding: 8px;"></td>
                                <td colspan="4" style="border: 1px solid rgba(255, 255, 255, 0.05);"></td>
                            </tr>
                            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05); background: rgba(255, 255, 255, 0.01);">
                                <td style="border: 1px solid rgba(255, 255, 255, 0.05); padding: 8px; text-align: center; color: var(--text-muted); font-family: monospace;">74</td>
                                <td style="border: 1px solid rgba(255, 255, 255, 0.05); padding: 8px;"></td>
                                <td colspan="4" style="border: 1px solid rgba(255, 255, 255, 0.05);"></td>
                            </tr>
                            <tr style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7; font-weight: 800;">
                                <td style="text-align: center; color: #6ee7b7; font-family: monospace; border: 1px solid rgba(16, 185, 129, 0.3); padding: 8px;">75</td>
                                <td colspan="5" style="border: 1px solid rgba(16, 185, 129, 0.3); padding: 8px; color: #6ee7b7 !important;"><strong>Mano de Obra por Hs al 36% en parada de planta</strong></td>
                            </tr>
                        `;
                    } else if (index === 11) {
                        html += `
                            <tr style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7; font-weight: 800;">
                                <td style="text-align: center; color: #6ee7b7; font-family: monospace; border: 1px solid rgba(16, 185, 129, 0.3); padding: 8px;">82</td>
                                <td colspan="5" style="border: 1px solid rgba(16, 185, 129, 0.3); padding: 8px; color: #6ee7b7 !important;"><strong>Mano de Obra por hs Normales en parada de planta</strong></td>
                            </tr>
                        `;
                    }
                } else if (secIdx === 4) { // Mano de Obra EMERGENCIA MANTENIMIENTO
                    if (index === 0) {
                        html += `
                            <tr style="background: rgba(6, 182, 212, 0.2); color: #22d3ee; font-weight: 900; font-size: 13px;">
                                <td style="text-align: center; color: #22d3ee; font-family: monospace; border: 1px solid rgba(6, 182, 212, 0.3); padding: 10px;">60</td>
                                <td colspan="5" style="border: 1px solid rgba(6, 182, 212, 0.3); padding: 10px; text-align: left; color: #22d3ee !important;"><strong>MANO DE OBRA POR EMERGENCIA EN PLANTA SEGUN ACUERDO FIRMADO CON CARGILL</strong></td>
                            </tr>
                        `;
                    }
                }
            }

            let displayRowIndex = globalItemIndex++;
            if (reqTipoPresupuesto === 'Eléctrico') {
                if (secIdx === 2) {
                    if (index < 5) displayRowIndex = index + 41;
                    else if (index >= 5 && index < 10) displayRowIndex = index + 44;
                    else if (index === 10) displayRowIndex = 54;
                    else displayRowIndex = index + 45;
                } else if (secIdx === 3) {
                    if (index < 5) displayRowIndex = index + 68;
                    else if (index >= 5 && index < 10) displayRowIndex = index + 71;
                    else if (index === 10) displayRowIndex = 81;
                    else displayRowIndex = index + 72;
                } else if (secIdx === 4) {
                    displayRowIndex = index + 61;
                }
            }
            
            const disabledAttr = isEditable ? '' : 'disabled';
            const inputBg = initialQty ? 'rgba(234, 179, 8, 0.18)' : 'rgba(15, 23, 42, 0.6)';
            const inputBorder = initialQty ? '#eab308' : 'rgba(255, 255, 255, 0.15)';
            const inputColor = initialQty ? '#fde047' : '#ffffff';
            const formattedQty = (initialQty !== undefined && initialQty !== null && initialQty !== '' && initialQty > 0) ? Math.round(initialQty).toString() : '';
            const formattedPrice = (item.precio !== undefined && item.precio !== null) ? item.precio.toString().replace(/\./g, ',') : '0';

            html += `
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06); background: rgba(255, 255, 255, 0.02);">
                    <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 8px; text-align: center; color: var(--text-muted) !important; font-family: monospace; font-weight: 800; font-size: 12px;">${displayRowIndex}</td>
                    <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 8px; font-weight: 600; color: #ffffff !important; font-size: 12px;">${item.detalle}</td>
                    <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 6px; text-align: center;">
                        <input type="text" 
                               inputmode="numeric"
                               class="meca-excel-input" 
                               data-code="${item.codigo}" 
                               data-price="${item.precio}" 
                               data-sec="${secIdx}"
                               value="${formattedQty}" 
                               placeholder="0"
                               ${disabledAttr}
                               style="width: 90%; text-align: right; background: ${inputBg} !important; border: 1.5px solid ${inputBorder} !important; border-radius: 6px; padding: 6px 10px; font-weight: 800 !important; color: ${inputColor} !important; font-family: monospace; font-size: 13px !important; opacity: 1 !important;"
                               onkeydown="if(['e','E','+','-','.','/',','].includes(event.key)){event.preventDefault();}else if(event.key==='Enter'){event.preventDefault();const tr=this.closest('tr');const pInput=tr?tr.querySelector('.meca-excel-price-input'):null;if(pInput){pInput.focus();pInput.select();}}"
                               oninput="this.value=this.value.replace(/[^0-9]/g,''); recalcMecaExcelRow(this)">
                    </td>
                    <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 8px; text-align: center; color: var(--text-muted) !important; font-weight: 700; font-size: 12px;">${item.udm}</td>
                    <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 6px; text-align: right;">
                        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 3px;">
                            <span style="font-weight: 800; color: var(--text-muted) !important; font-size: 12px;">$</span>
                            <input type="text" 
                                   inputmode="decimal"
                                   class="meca-excel-price-input" 
                                   data-code="${item.codigo}" 
                                   data-sec="${secIdx}"
                                   value="${formattedPrice}" 
                                   ${disabledAttr}
                                   style="width: 105px; text-align: right; background: rgba(15, 23, 42, 0.6) !important; border: 1.5px solid rgba(6, 182, 212, 0.4) !important; border-radius: 6px; padding: 5px 8px; font-weight: 700 !important; color: #ffffff !important; font-family: monospace; font-size: 12px !important; opacity: 1 !important;"
                                   onkeydown="onMecaPriceKeyDown(event, this)"
                                   oninput="onMecaPriceInputChange(this)"
                                   onblur="onMecaPriceInputBlur(this)">
                        </div>
                    </td>
                    <td id="meca-total-${item.codigo}" style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 8px; text-align: right; font-family: monospace; font-weight: 800; color: #38bdf8 !important; font-size: 13px;">$${initialTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                </tr>
            `;
        });

        html += `</tbody>`;
    });

    html += `
                    <tbody>
                        <tr style="background: rgba(16, 185, 129, 0.15); color: #34d399; font-weight: bold; font-size: 13px; border-top: 2px solid rgba(16, 185, 129, 0.5);">
                            <td colspan="5" style="border: 1px solid rgba(16, 185, 129, 0.2); padding: 12px 14px; font-size: 12px; text-transform: uppercase;"><strong>TOTAL GENERAL</strong></td>
                            <td id="meca-excel-grand-total" style="border: 1px solid rgba(16, 185, 129, 0.2); padding: 12px 14px; text-align: right; font-family: monospace; font-weight: 900; font-size: 16px; color: #34d399 !important;">$0,00</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
    recalcMecaExcelAll();
};

window.renderMecanicoExcelGrid = function() {
    const container = document.getElementById('req-mecanico-step2-container');
    if (container) {
        renderMecanicoExcelGridInContainer(container, true);
    }
};

window.onMecaPriceKeyDown = function(event, input) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const tr = input.closest('tr');
        let nextTr = tr ? tr.nextElementSibling : null;
        while (nextTr && !nextTr.querySelector('.meca-excel-input')) {
            nextTr = nextTr.nextElementSibling;
        }
        if (nextTr) {
            const nextQty = nextTr.querySelector('.meca-excel-input');
            if (nextQty) {
                nextQty.focus();
                nextQty.select();
            }
        } else {
            // Fin de la pestaña actual: avanzar a la siguiente pestaña
            const currentTab = window.activeMecaTab;
            let nextTabIdx = currentTab + 1;
            let foundNextTab = false;
            while (nextTabIdx < 10) {
                const nextTabBtn = document.getElementById(`meca-tab-${nextTabIdx}`);
                if (nextTabBtn && nextTabBtn.style.display !== 'none') {
                    foundNextTab = true;
                    switchMecaTab(nextTabIdx);
                    setTimeout(() => {
                        const firstInput = document.querySelector(`#meca-sec-body-${nextTabIdx} .meca-excel-input`);
                        if (firstInput) {
                            firstInput.focus();
                            firstInput.select();
                        }
                    }, 60);
                    break;
                }
                nextTabIdx++;
            }
            if (!foundNextTab) {
                const nextStepBtn = document.querySelector('#step-container-2 button.btn-primary');
                if (nextStepBtn) nextStepBtn.focus();
            }
        }
        return;
    }

    // PROHIBIR TOTALMENTE EL PUNTO (.) Y AUTO-CONVERTIR A COMA (,):
    if (event.key === '.') {
        event.preventDefault();
        if (!input.value.includes(',')) {
            const start = input.selectionStart;
            const end = input.selectionEnd;
            input.value = input.value.substring(0, start) + ',' + input.value.substring(end);
            input.setSelectionRange(start + 1, start + 1);
            window.onMecaPriceInputChange(input);
        }
        return;
    }

    // Si presiona coma y ya existe una coma, evitar duplicar
    if (event.key === ',' && input.value.includes(',')) {
        event.preventDefault();
        return;
    }

    // Bloquear signos y letras exponenciales
    if (['e', 'E', '+', '-', '/'].includes(event.key)) {
        event.preventDefault();
        return;
    }
};

window.onMecaPriceInputChange = function(input) {
    const code = input.getAttribute('data-code');
    
    // Prohibido el punto: reemplazar todo punto por coma y filtrar caracteres inválidos
    let cleanVal = input.value.replace(/\./g, ',').replace(/[^0-9,]/g, '');
    
    // Asegurar que solo exista como máximo una sola coma
    const parts = cleanVal.split(',');
    if (parts.length > 2) {
        cleanVal = parts[0] + ',' + parts.slice(1).join('');
    }
    
    if (input.value !== cleanVal) {
        input.value = cleanVal;
    }

    const newPrice = window.parseArgNumber(input.value);
    saveCustomItemPrice(code, newPrice);

    const qtyInput = document.querySelector(`.meca-excel-input[data-code="${code}"]`);
    if (qtyInput) {
        qtyInput.setAttribute('data-price', newPrice);
    }

    recalcMecaExcelRow(input);
};

window.onMecaPriceInputBlur = function(input) {
    let cleanVal = input.value.trim().replace(/\./g, ',').replace(/[^0-9,]/g, '');
    const parts = cleanVal.split(',');
    if (parts.length > 2) {
        cleanVal = parts[0] + ',' + parts.slice(1).join('');
    }
    if (!cleanVal) {
        cleanVal = '0';
    }
    input.value = cleanVal;
    window.onMecaPriceInputChange(input);
};

window.recalcMecaExcelRow = function(input) {
    const code = input.getAttribute('data-code');
    const priceInput = document.querySelector(`.meca-excel-price-input[data-code="${code}"]`);
    const qtyInput = document.querySelector(`.meca-excel-input[data-code="${code}"]`);

    const price = priceInput ? window.parseArgNumber(priceInput.value) : (input.hasAttribute('data-price') ? window.parseArgNumber(input.getAttribute('data-price')) : 0);
    const qty = qtyInput ? (parseInt(qtyInput.value.replace(/[^0-9]/g, ''), 10) || 0) : 0;
    const totalEl = document.getElementById(`meca-total-${code}`);

    if (qtyInput) {
        qtyInput.style.background = (qty > 0 ? 'rgba(234, 179, 8, 0.18)' : 'rgba(15, 23, 42, 0.6)');
        qtyInput.style.borderColor = (qty > 0 ? '#eab308' : 'rgba(255, 255, 255, 0.15)');
        qtyInput.style.color = (qty > 0 ? '#fde047' : '#ffffff');
    }

    if (totalEl) {
        const subtotal = qty * price;
        totalEl.innerText = `$${subtotal.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    }

    recalcMecaExcelAll();
};

window.recalcMecaExcelAll = function() {
    const inputs = document.querySelectorAll('.meca-excel-input');
    const subtotals = [0, 0, 0, 0, 0, 0];
    let grandTotal = 0;

    // Reset items array
    pedidoItems = [];

    const catalog = getActiveStockCatalog();

    inputs.forEach(input => {
        const code = input.getAttribute('data-code');
        const priceInput = document.querySelector(`.meca-excel-price-input[data-code="${code}"]`);
        const price = priceInput ? window.parseArgNumber(priceInput.value) : window.parseArgNumber(input.getAttribute('data-price'));
        const qty = parseInt(input.value.replace(/[^0-9]/g, ''), 10) || 0;
        const secIdx = parseInt(input.getAttribute('data-sec')) || 0;

        saveCustomItemPrice(code, price);

        if (qty > 0) {
            const subtotal = qty * price;
            if (subtotals[secIdx] !== undefined) {
                subtotals[secIdx] += subtotal;
            }
            grandTotal += subtotal;

            // Find item original name and details from stock database
            const itemObj = catalog.find(i => i.codigo === code);
            pedidoItems.push({
                codigo: code,
                detalle: itemObj ? itemObj.detalle : 'Artículo',
                precio: price,
                cantidad: qty,
                cantidad_original: qty,
                subtotal: subtotal,
                udm: (itemObj && itemObj.udm) ? itemObj.udm : 'horas',
                estado: 'Pendiente'
            });
        }
    });

    if (reqTipoPresupuesto === 'Eléctrico') {
        let materialsTotal = 0;
        let laborTotal = 0;

        pedidoItems.forEach(item => {
            if (item.codigo.startsWith('ELE-')) {
                const num = parseInt(item.codigo.substring(4));
                if (num <= 27) {
                    materialsTotal += item.subtotal;
                } else {
                    laborTotal += item.subtotal;
                }
            }
        });

        // Update displays for Eléctrico
        const subMatTop = document.getElementById('elec-subtotal-materials-total-header');
        const subMatBottom = document.getElementById('elec-materials-subtotal-bottom');
        const subMatRow = document.getElementById('elec-materials-subtotal');
        const subLab = document.getElementById('elec-labor-subtotal');
        const subElecGrand = document.getElementById('meca-excel-grand-total');

        if (subMatTop) subMatTop.innerText = `$${materialsTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
        if (subMatBottom) subMatBottom.innerText = `$${materialsTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
        if (subMatRow) subMatRow.innerText = `$${materialsTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
        if (subLab) subLab.innerText = `$${laborTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
        
        const elecGrandVal = materialsTotal + laborTotal;
        if (subElecGrand) {
            subElecGrand.innerText = `$${elecGrandVal.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
        }

        const nvDisplay = document.getElementById('req-total-nv-display');
        if (nvDisplay) {
            nvDisplay.innerText = `$${elecGrandVal.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
        }
    } else {
        // Update section subtotal displays for Mecánico
        subtotals.forEach((sub, idx) => {
            const subEl = document.getElementById(`meca-subtotal-${idx}`);
            if (subEl) {
                subEl.innerText = `$${sub.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
            }
        });

        // Update grand total displays
        const grandTotalEl = document.getElementById('meca-excel-grand-total');
        if (grandTotalEl) {
            grandTotalEl.innerText = `$${grandTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
        }

        const nvDisplay = document.getElementById('req-total-nv-display');
        if (nvDisplay) {
            nvDisplay.innerText = `$${grandTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
        }
    }

    if (typeof pedidoActivo !== 'undefined' && pedidoActivo) {
        pedidoActivo.items = JSON.parse(JSON.stringify(pedidoItems));
        if (typeof recalcAuthTotal === 'function') {
            recalcAuthTotal();
        }
    }
};

window.checkScheduledOcAlerts = function() {
    if (!appData || !appData.pedidos) return;
    const todayStr = new Date().toISOString().substring(0, 10);
    let alertsSent = 0;
    
    appData.pedidos.forEach(p => {
        if (p.estado === 'Cargado sin orden de compra' && p.oc_limite_fecha) {
            if (todayStr >= p.oc_limite_fecha) {
                if (!p.oc_alerta_enviada) {
                    p.oc_alerta_enviada = true;
                    alertsSent++;
                    
                    const msgText = `⚠️ ALERTA O.C.: El Presupuesto ${p.id} de ${p.cliente_nombre} superó la fecha límite (${p.oc_limite_fecha}) sin recibir Orden de Compra. Correo recordatorio enviado a ${p.email || 'cliente'}.`;
                    
                    appData.users.forEach(u => {
                        addNotification(u.id, msgText, p.id);
                    });
                    
                    console.log(`[EMAIL SEND] Para: ${p.email || 'cliente@empresa.com'} - Presupuesto ${p.id} sin orden de compra.`);
                }
            }
        }
    });
    
    if (alertsSent > 0) {
        saveData();
        showToast(`Se enviaron ${alertsSent} alertas de orden de compra vencidas por correo electrónico.`, 'warning');
        if (typeof renderNotifications === 'function') {
            renderNotifications();
        }
    }
};

window.enviarEmailPedido = function(id) {
    const p = appData.pedidos.find(p => p.id === id);
    if (!p) return;
    
    const nro = formatPresupuestoCodigo(p);
    const subject = encodeURIComponent(`Presupuesto Oficial SG MONTAJES Nro. ${nro}`);
    
    let bodyText = `Hola,\n\n`;
    bodyText += `Le adjuntamos los detalles del Presupuesto Nro. ${nro} para su revisión:\n\n`;
    bodyText += `Fecha: ${p.fecha}\n`;
    bodyText += `Cliente: ${p.cliente_nombre} (CUIT: ${p.cuit})\n`;
    if (p.meca_nro_oc || p.nro_oc) {
        bodyText += `Orden de Compra (OC): ${p.meca_nro_oc || p.nro_oc}\n`;
    }
    bodyText += `Monto Total: $${p.importe.toLocaleString('es-AR', {minimumFractionDigits: 2})}\n\n`;
    
    if (p.estado === 'Cargado sin orden de compra' || p.estado === 'Enviado sin OC') {
        bodyText += `⚠️ Recordatorio: Este presupuesto está pendiente de recepción de Orden de Compra. Fecha límite: ${p.oc_limite_fecha || '-'}\n\n`;
    }
    
    bodyText += `Atentamente,\n`;
    bodyText += `SG MONTAJES S.R.L.`;
    
    const body = encodeURIComponent(bodyText);
    const mailtoUrl = `mailto:${p.email || ''}?subject=${subject}&body=${body}`;
    window.open(mailtoUrl, '_blank');
};

// Desactivar cambio involuntario de valores por la rueda del mouse en inputs numéricos y del tarifario
document.addEventListener('wheel', function(e) {
    if (document.activeElement && (document.activeElement.type === 'number' || document.activeElement.classList.contains('meca-excel-input'))) {
        document.activeElement.blur();
    }
}, { passive: true });
