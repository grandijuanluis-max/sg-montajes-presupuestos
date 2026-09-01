// --- ESTADO INICIAL Y ALMACENAMIENTO ---
const LOCAL_STATE_KEY = 'solicitudes_pedidos_local_state';

// Filtrar clientes especiales o inactivos que tengan *, + o \ en su nombre
if (typeof clientesDB !== 'undefined') {
    const filteredClients = clientesDB.filter(c => {
        const name = c.nombre || '';
        return !name.includes('*') && !name.includes('+') && !name.includes('\\');
    });
    clientesDB.length = 0;
    for (let i = 0; i < filteredClients.length; i++) {
        clientesDB.push(filteredClients[i]);
    }
}

// Generar una cadena de fecha y hora relativa para simular el SLA
function getRelativeDateStr(hoursAgo) {
    const d = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
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

// Usuarios por defecto si la base de datos está vacía
const defaultData = {
    users: [
        { id: '1', username: 'mel', password: '123', email: 'mel@sgmontajes.com.ar', role: 'Administrador', rubro_defecto: 'Eléctrico', vendedor_codigo: '', vendedor_nombre: '' },
        { id: '2', username: 'ventas', password: '123', email: 'ventas@sgmontajes.com.ar', role: 'Solicitante', rubro_defecto: 'Eléctrico', vendedor_codigo: '101', vendedor_nombre: 'Comercial Ventas' }
    ],
    pedidos: [
        {
            id: "102-ELEC-0001",
            tipo_presupuesto: "Eléctrico",
            fecha: getRelativeDateStr(4), // hace 4 horas
            cliente_id: "2",
            cliente_nombre: "BERTOLIN JUAN CARLOS",
            cuit: "20111387282",
            telefono: "2494429099",
            email: "rl@marcelopasina.com",
            importe: 6500000.0,
            condicion_id: "3",
            condicion_nombre: "CHEQUE",
            motivo: "Pedido mensual de stock regular sucursal Tandil",
            estado: "Pendiente de Autorización",
            motivo_bloqueo: "Límite de crédito excedido: Deuda actual $0.00 + Pedido $6,500,000.00 = $6,500,000.00 superando el límite de $5,000,000.00.",
            motivo_rechazo: "",
            fecha_resolucion: ""
        },
        {
            id: "101-MEC-0001",
            tipo_presupuesto: "Mecánico",
            fecha: getRelativeDateStr(26), // hace 26 horas
            cliente_id: "8",
            cliente_nombre: "MUNT ISMAEL VICTOR MIGUEL",
            cuit: "20161952479",
            telefono: "223-4711364",
            email: "",
            importe: 420000.0,
            condicion_id: "1",
            condicion_nombre: "CONTADO EFECTIVO",
            motivo: "Compra de urgencia reposición estanterías",
            estado: "Aprobado",
            motivo_bloqueo: "",
            motivo_rechazo: "",
            fecha_resolucion: ""
        }
    ],
    notifications: [
        {
            id: "notif-1",
            userId: "1",
            message: "Presupuesto 102-ELEC-0001 ingresado.",
            read: false,
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            taskId: "102-ELEC-0001"
        }
    ],
    currentUserId: null
};

// --- CONFIGURACIÓN DE FIREBASE ---
var db = null;
try {
    const firebaseConfig = {
        projectId: "gr-nota-de-venta",
        appId: "1:161485758341:web:b276b00a70d39ff8216eec",
        storageBucket: "gr-nota-de-venta.firebasestorage.app",
        apiKey: "AIzaSyDkdLtRFY7XN7LmnrMRTTOEWBuTuc8yS7o",
        authDomain: "gr-nota-de-venta.firebaseapp.com",
        messagingSenderId: "161485758341"
    };
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        db.enablePersistence().catch(function() {});
    }
} catch(e) {
    console.warn("Firebase no disponible, usando modo offline:", e);
    db = null;
}

// Mantener la sesión localmente y sincronizada
let appData = defaultData;

// Cargar datos desde localStorage si existen
try {
    const local = JSON.parse(localStorage.getItem(LOCAL_STATE_KEY));
    if (local && local.users && local.users.length > 0) {
        appData.pedidos = local.pedidos || defaultData.pedidos;
        // Filtrar usuarios removidos (admin, aut, sol)
        appData.users = (local.users || defaultData.users).filter(u => !['admin', 'aut', 'sol'].includes(String(u.username).trim().toLowerCase()));
        if (appData.users.length === 0) appData.users = defaultData.users.slice();
        appData.notifications = local.notifications || defaultData.notifications;
        if (local.userPermissions) {
            appData.userPermissions = local.userPermissions;
            delete appData.userPermissions['admin'];
            delete appData.userPermissions['aut'];
            delete appData.userPermissions['sol'];
        }
        saveData();
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

function initFirebaseSync(callback) {
    if (!db) {
        if (callback) callback();
        return;
    }
    db.collection('state').doc('globalData').get().then(function(doc) {
        if (doc.exists()) {
            const data = doc.data();
            appData.pedidos = data.pedidos || [];
            appData.users = mergeUsersList(appData.users, data.users);
            appData.notifications = data.notifications || [];
            saveData();
        } else {
            db.collection('state').doc('globalData').set({
                pedidos: defaultData.pedidos,
                users: defaultData.users,
                notifications: defaultData.notifications
            });
        }
        
        // Listener en tiempo real
        db.collection('state').doc('globalData').onSnapshot(function(snapshot) {
            if (snapshot.exists()) {
                const data = snapshot.data();
                appData.pedidos = data.pedidos || [];
                appData.users = mergeUsersList(appData.users, data.users);
                appData.notifications = data.notifications || [];
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
        });

        if (callback) callback();
    }).catch(function(err) {
        console.warn("Error Firebase:", err);
        if (callback) callback();
    });
}

function getCurrentUser() {
    if (!appData || !Array.isArray(appData.users)) return null;
    return appData.users.find(u => String(u.id) === String(appData.currentUserId));
}


// Utilidades
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

function getCurrentUser() {
    return appData.users.find(u => u.id === appData.currentUserId);
}

function saveData() {
    try {
        localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(appData));
    } catch (e) {
        console.error("Error saving data to localStorage:", e);
    }
    
    // Guardar en Firestore para sincronización global
    if (window.firebase && db) {
        db.collection('state').doc('globalData').set({
            pedidos: appData.pedidos || [],
            users: appData.users || [],
            notifications: appData.notifications || []
        }).catch(err => {
            console.error("Error saving to Firestore:", err);
        });
    }
}
window.saveData = saveData;
window.saveAppData = saveData;

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

    if (!appData.currentUserId) {
        bellBadge.style.display = 'none';
        return;
    }

    const myNotifs = appData.notifications.filter(n => n.userId === appData.currentUserId || n.userId === 'all');
    const unreadCount = myNotifs.filter(n => !n.read).length;

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
        if (typeof initFirebaseSync === 'function') {
            initFirebaseSync();
        }
    } catch (e) {
        console.warn("Firebase sync bypass:", e);
    }
});

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '✉';
    if (type === 'success') icon = '✓';
    else if (type === 'error' || type === 'danger') icon = '✕';
    else if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `
        <span style="font-size: 20px; font-weight: bold; margin-right: 5px;">${icon}</span>
        <div>
            <div class="toast-title">${type.toUpperCase()}</div>
            <div class="toast-desc">${message}</div>
        </div>
    `;
    container.appendChild(toast);
    
    // Forzar reflow para animación
    setTimeout(() => toast.classList.add('show'), 50);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4500);
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
    Administrador: ['menu-ingresar', 'menu-asignaciones', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-all', 'menu-admin'],
    Solicitante: ['menu-ingresar', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-all'],
    Autorizador: ['menu-asignaciones', 'menu-estado-presupuesto', 'menu-all'],
    Ventas: ['menu-ingresar', 'menu-estado-presupuesto', 'menu-all']
};

const allAvailableModules = [
    { id: 'menu-ingresar', label: 'Gestión de Presupuestos', icon: 'fa-solid fa-pen-to-square', tpl: 'tpl-request-ped', action: initRequestView },
    { id: 'menu-asignaciones', label: 'Autorización de Presupuestos', icon: 'fa-solid fa-clipboard-check', tpl: 'tpl-assignments', action: () => initAssignmentsView('Autorizador') },
    { id: 'menu-estado-presupuesto', label: 'Estado del Presupuesto', icon: 'fa-solid fa-list-check', tpl: 'tpl-assignments', action: () => initAssignmentsView('EstadoPresupuesto') },
    { id: 'menu-rechazados', label: 'Rechazo de Presupuesto', icon: 'fa-solid fa-ban', tpl: 'tpl-assignments', action: () => initAssignmentsView('Rechazados') },
    { id: 'menu-all', label: 'Seguimiento', icon: 'fa-solid fa-clock-rotate-left', tpl: 'tpl-assignments', action: () => initAssignmentsView('Modificacion') },
    { id: 'menu-admin', label: 'Configuración', icon: 'fa-solid fa-gear', tpl: 'tpl-admin', action: initAdminView }
];

function getMenuItemsForUser(user) {
    if (!user) return [];
    if (!appData.userPermissions) {
        appData.userPermissions = {};
    }
    // Permisos individuales por nombre de usuario
    if (appData.userPermissions[user.username] && Array.isArray(appData.userPermissions[user.username])) {
        const userPerms = appData.userPermissions[user.username];
        return allAvailableModules.filter(m => userPerms.includes(m.id));
    }
    // Por defecto si no se han configurado aún
    const defaultIds = (user.username === 'admin' || user.role === 'Administrador') 
        ? allAvailableModules.map(m => m.id) 
        : (defaultMenuPermissions[user.role] || ['menu-ingresar', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-all']);
    return allAvailableModules.filter(m => defaultIds.includes(m.id));
}

function buildSidebar() {
    const user = getCurrentUser();
    if (!user) return;
    const sidebar = document.getElementById('sidebar-menu');
    sidebar.innerHTML = '';

    // Brand logo decorativo en el sidebar
    const brandDiv = document.createElement('div');
    brandDiv.style.display = 'flex';
    brandDiv.style.alignItems = 'center';
    brandDiv.style.gap = '10px';
    brandDiv.style.padding = '12px 15px';
    brandDiv.style.borderBottom = '1px solid rgba(255, 255, 255, 0.08)';
    brandDiv.style.marginBottom = '10px';
    brandDiv.innerHTML = `
        <img src="logo_sg_montajes.png" alt="SG MONTAJES Logo" style="width: auto; height: 24px; object-fit: contain;">
        <span style="font-weight: 800; font-size: 13px; letter-spacing: 0.5px; color: white;">SG <span style="font-weight: 400; color: var(--warning);">MONTAJES</span></span>
    `;
    sidebar.appendChild(brandDiv);

    // Título decorativo del menú lateral
    const titleDiv = document.createElement('div');
    titleDiv.className = 'sidebar-title';
    titleDiv.innerHTML = `<i class="fa-solid fa-bars-staggered"></i> NAVEGACIÓN`;
    sidebar.appendChild(titleDiv);

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
    
    document.getElementById('current-user-role').innerText = user.role;

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

            // Cerrar sidebar en móvil automáticamente
            if (window.innerWidth <= 900) {
                sidebar.classList.remove('open');
            }
        };
        sidebar.appendChild(a);

        // Auto-click primer item
        if (index === 0) a.click();
    });

    // Agregar selector de temas al pie de la barra lateral
    const themeContainer = document.createElement('div');
    themeContainer.className = 'theme-selector-container';
    themeContainer.innerHTML = `
        <span class="theme-label"><i class="fa-solid fa-palette"></i> Tema</span>
        <div class="theme-buttons">
            <button class="theme-btn" data-theme="cyberpunk" title="Corporativo GR (Default)" style="background: #2563eb; border: 1.5px solid #fbbf24;"></button>
            <button class="theme-btn" data-theme="midnight" title="Midnight Purple" style="background: #a855f7;"></button>
            <button class="theme-btn" data-theme="emerald" title="Emerald Credit" style="background: #10b981;"></button>
            <button class="theme-btn" data-theme="light" title="Light Glass" style="background: #0284c7; border: 1px solid rgba(255, 255, 255, 0.2);"></button>
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
    if (!btnVolver) return;
    const overlay = document.getElementById('modal-overlay');
    const hasModal = (overlay && overlay.style.display !== 'none' && overlay.innerHTML.trim().length > 0);
    const hasStepBack = (typeof currentRequestStep !== 'undefined' && currentRequestStep > 1);
    const canGoBack = hasModal || hasStepBack || (window.appNavHistory.length > 1);

    if (canGoBack) {
        btnVolver.classList.remove('disabled');
    } else {
        btnVolver.classList.add('disabled');
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
    
    overlay.innerHTML = '';
    overlay.appendChild(template.content.cloneNode(true));
    overlay.style.display = 'flex';
    if (typeof window.actualizarBotonVolver === 'function') {
        window.actualizarBotonVolver();
    }
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.innerHTML = '';
    }
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
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        return {};
    }
};

window.saveCustomItemPrice = function(codigo, price) {
    if (!codigo) return;
    const customPrices = getCustomItemPrices();
    customPrices[codigo] = parseFloat(price || 0);
    try {
        localStorage.setItem('PRESUPUESTO_CUSTOM_PRICES', JSON.stringify(customPrices));
    } catch (e) {}

    if (typeof PRESUPUESTO_MECANICO_STOCK !== 'undefined') {
        const itemM = PRESUPUESTO_MECANICO_STOCK.find(i => i.codigo === codigo);
        if (itemM) itemM.precio = parseFloat(price || 0);
    }
    if (typeof PRESUPUESTO_ELECTRICO_STOCK !== 'undefined') {
        const itemE = PRESUPUESTO_ELECTRICO_STOCK.find(i => i.codigo === codigo);
        if (itemE) itemE.precio = parseFloat(price || 0);
    }
};

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

    if (lblDenom) lblDenom.innerHTML = isElec ? '<u>Denominación del Servicio:</u>' : 'i. <u>Denominación del Servicio:</u>';
    if (lblProv) lblProv.innerHTML = isElec ? 'ii. <u>Nombre del Proveedor:</u>' : 'ii. <u>Nombre del Proveedor:</u>';
    if (lblFecha) lblFecha.innerHTML = isElec ? 'iii. <u>Fecha de Oferta:</u>' : 'iii. <u>Fecha de Oferta:</u>';
    if (lblVal) lblVal.innerHTML = isElec ? 'iv. <u>Validez de la Oferta:</u>' : 'iv. <u>Validez de la Oferta:</u>';
    if (lblPlanta) lblPlanta.innerHTML = isElec ? 'v. <u>Planta de Cargill</u>' : 'v. <u>Planta de Cargill:</u>';
    if (lblInicio) lblInicio.innerHTML = isElec ? 'vi. <u>Fecha de Inicio:</u>' : 'vi. <u>Fecha estimada de Inicio:</u>';
    if (lblDuracion) lblDuracion.innerHTML = isElec ? 'vii. <u>Numeros de OT:</u>' : 'vii. <u>Duración estimada de la Ejecución:</u>';
    if (lblFin) lblFin.innerHTML = isElec ? 'viii. <u>Plazo Máximo de Finalización:</u>' : 'viii. <u>Plazo Máximo de Finalización:</u>';

    const reqMecaPropuestaBox = document.getElementById('req-meca-propuesta-box');
    if (reqMecaPropuestaBox) {
        reqMecaPropuestaBox.style.display = isElec ? 'none' : 'flex';
    }

    if (isElec) {
        if (valDenom && !valDenom.value) valDenom.value = 'según PD';
        if (valProveedor && !valProveedor.value) valProveedor.value = 'SG Montajes S.R.L';
        if (valValidez && !valValidez.value) valValidez.value = '5 dias';
        if (valPlanta && !valPlanta.value) valPlanta.value = 'Complejo APS- PGSM';
        if (valInicio && !valInicio.value) valInicio.value = '12-ago-26';
        if (valDuracion && !valDuracion.value) valDuracion.value = 'OT-';
    } else {
        if (valDenom && valDenom.value === 'según PD') valDenom.value = '';
        if (valProveedor && (!valProveedor.value || valProveedor.value === 'SG Montajes S.R.L')) valProveedor.value = 'SG MONTAJES SRL';
        if (valValidez && (!valValidez.value || valValidez.value === '5 dias')) valValidez.value = '5 días';
        if (valPlanta && (!valPlanta.value || valPlanta.value === 'Complejo APS- PGSM')) valPlanta.value = 'APS';
        if (valInicio && !valInicio.value) valInicio.value = '12-ago-26';
        if (valDuracion && (!valDuracion.value || valDuracion.value === 'OT-')) valDuracion.value = '25-30días';
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
    pedidoItems = [];
    productoSeleccionado = null;
    actualizarTablaItemsRequerimiento();

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

    // Establecer fechas por defecto al día de hoy para Presupuestos Mecánicos/Eléctricos
    const todayStr = new Date().toISOString().substring(0, 10);
    const denomEl = document.getElementById('req-meca-denominacion');
    if (denomEl) denomEl.value = '';
    const plantaEl = document.getElementById('req-meca-planta');
    if (plantaEl && !plantaEl.value) plantaEl.value = 'VGG';
    const foEl = document.getElementById('req-meca-fecha-oferta');
    if (foEl && !foEl.value) foEl.value = todayStr;
    const fiEl = document.getElementById('req-meca-fecha-inicio');
    if (fiEl && !fiEl.value) fiEl.value = todayStr;
    const ffEl = document.getElementById('req-meca-fecha-fin');
    if (ffEl && !ffEl.value) ffEl.value = todayStr;

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
                document.getElementById('req-meca-validez')?.focus();
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

            if (fechaInicio <= fechaOferta) {
                showToast('La "vii. Fecha estimada de Inicio" debe ser obligatoriamente mayor a la "Fecha de Oferta" (día actual).', 'error');
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
            const valInicio = document.getElementById('req-meca-inicio');
            const valDuracion = document.getElementById('req-meca-duracion');
            const valPlazo = document.getElementById('req-meca-plazo-fin');
            const valPropuesta = document.getElementById('req-meca-propuesta');
            const valPersonal = document.getElementById('req-meca-personal');
            const valExclusiones = document.getElementById('req-meca-exclusiones');

            if (sDenom) sDenom.innerText = valDenom ? valDenom.value : '-';
            if (sProv) sProv.innerText = valProv ? valProv.value : '-';
            if (sFecha) sFecha.innerText = valFecha ? valFecha.value : '-';
            if (sVal) sVal.innerText = valValidez ? valValidez.value : '-';
            if (sPlanta) sPlanta.innerText = valPlanta ? valPlanta.value : '-';
            const sOc = document.getElementById('summary-meca-nro-oc');
            const valOc = document.getElementById('req-meca-nro-oc');
            if (sOc) sOc.innerText = valOc ? valOc.value : '-';
            const sOt = document.getElementById('summary-meca-nro-ot');
            const valOt = document.getElementById('req-meca-nro-ot');
            if (sOt) sOt.innerText = valOt ? valOt.value : '-';
            if (sIni) sIni.innerText = valInicio ? valInicio.value : '-';
            if (sDur) sDur.innerText = valDuracion ? valDuracion.value : '-';
            if (sPlazo) sPlazo.innerText = valPlazo ? valPlazo.value : '-';
            if (sProp) sProp.innerText = valPropuesta ? valPropuesta.value : '-';
            if (sPers) sPers.innerText = valPersonal ? valPersonal.value : '-';
            if (sExcl) sExcl.innerText = valExclusiones ? valExclusiones.value : '-';
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
                summaryItemsCount.innerText = pedidoItems.length;
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
    setVal('req-meca-planta', p.meca_planta || 'APS');
    setVal('req-meca-nro-oc', p.meca_nro_oc || '');
    setVal('req-meca-nro-ot', p.meca_nro_ot || '');
    setVal('req-meca-fecha-inicio', p.meca_fecha_inicio || '');
    setVal('req-meca-duracion', p.meca_duracion || '');
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
    setVal('req-meca-planta', p.meca_planta || 'APS');
    setVal('req-meca-nro-oc', p.meca_nro_oc || '');
    setVal('req-meca-nro-ot', p.meca_nro_ot || '');
    setVal('req-meca-fecha-inicio', p.meca_fecha_inicio || '');
    setVal('req-meca-duracion', p.meca_duracion || '');
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
    if (!clienteSeleccionado) {
        const clientVal = (document.getElementById('req-meca-cliente') && document.getElementById('req-meca-cliente').value) || 
                          (document.getElementById('req-client') && document.getElementById('req-client').value) || 
                          'CARGILL SACI';
        clienteSeleccionado = {
            codigo: '3',
            nombre: clientVal,
            cuit: '30-50679316-5',
            telefono: '',
            email: ''
        };
    }
    if (pedidoItems.length === 0) {
        showToast('El presupuesto debe contener al menos un artículo o concepto del tarifario', 'error');
        return;
    }

    openModal('tpl-modal-tipo-reporte');
}

window.confirmarConTipoReporte = function(tipoReporte) {
    closeModal();
    
    const amount = pedidoItems.reduce((sum, item) => sum + item.subtotal, 0);
    const condCode = document.getElementById('req-condition') ? document.getElementById('req-condition').value : '';
    const motivo = document.getElementById('req-reason') ? document.getElementById('req-reason').value : '';

    const depCode = depositoSeleccionado ? depositoSeleccionado.codigo : '';
    const transCode = transporteSeleccionado ? transporteSeleccionado.codigo : '';

    const conditionObj = condicionesDB.find(c => c.codigo === condCode);
    const depositoObj = depositoSeleccionado;
    const transporteObj = transporteSeleccionado;
    
    const user = getCurrentUser();
    const userVendedorId = user && user.vendedor_codigo ? user.vendedor_codigo : (clienteSeleccionado.vendedor_id || '');
    const userVendedorNombre = user && user.vendedor_nombre ? user.vendedor_nombre : (clienteSeleccionado.vendedor_nombre || '');

    const isEditing = (typeof window.pedidoEnEdicionId !== 'undefined' && window.pedidoEnEdicionId);
    let targetPedido = null;
    let targetId = '';

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
        targetPedido.items = pedidoItems.map(item => ({
            ...item,
            cantidad_original: item.cantidad,
            estado: 'Pendiente'
        }));
        
        window.pedidoEnEdicionId = null;
        saveData();
        showToast(`Presupuesto ${targetId} modificado correctamente.`, 'success');
        verDetallePedido(targetId);
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

        const newPedido = {
            id: targetId,
            fecha: new Date().toISOString().replace('T', ' ').substring(0, 19),
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
            estado: 'Enviado sin OC',
            items: pedidoItems.map(item => ({
                ...item,
                cantidad_original: item.cantidad,
                estado: 'Pendiente'
            }))
        };

        appData.pedidos.push(newPedido);
        saveData();
        showToast(`Presupuesto ${targetId} ingresado correctamente.`, 'success');
        verDetallePedido(newPedido.id);
    }

    // Resetear formulario por completo para dejar listo para cargar uno nuevo
    window.resetRequestFormComplete();
}

window.resetRequestFormComplete = function() {
    window.pedidoEnEdicionId = null;
    const formReq = document.getElementById('form-request-ped');
    if (formReq) formReq.reset();
    
    // Limpiar todos los campos de Paso 1 y Paso 3
    const idsToClear = [
        'req-meca-denominacion', 'req-meca-cliente', 'req-meca-proveedor',
        'req-meca-fecha-oferta', 'req-meca-validez', 'req-meca-planta',
        'req-meca-nro-oc', 'req-meca-nro-ot', 'req-meca-fecha-inicio',
        'req-meca-duracion', 'req-meca-fecha-fin', 'req-meca-propuesta',
        'req-meca-personal', 'req-meca-exclusiones', 'req-reason',
        'req-client', 'req-deposit', 'req-transport'
    ];
    idsToClear.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

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
    
    if (typeof window.goToRequestStep === 'function') {
        window.goToRequestStep(1);
    }

    const excelContainer = document.getElementById('mecanico-excel-container');
    if (excelContainer && typeof renderMecanicoExcelGridInContainer === 'function') {
        renderMecanicoExcelGridInContainer(excelContainer, true);
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
    } else if (mode === 'Modificacion') {
        titleEl.innerText = "✏️ Modificación de Presupuesto";
        subtitleEl.innerText = "Seleccione un presupuesto para modificar sus artículos, observaciones o condiciones.";
    } else if (mode === 'EstadoPresupuesto') {
        titleEl.innerText = "🔄 Estado del Presupuesto";
        subtitleEl.innerText = "Modifique directamente el estado del presupuesto desde el selector de la tabla.";
    } else if (mode === 'Rechazados') {
        titleEl.innerText = "❌ Rechazo de Presupuesto";
        subtitleEl.innerText = "Listado de presupuestos comerciales que fueron rechazados.";
    } else if (mode === 'Seguimiento' || mode === 'Solicitante' || mode === 'Administrador') {
        titleEl.innerText = "📋 Seguimiento";
        subtitleEl.innerText = "Historial, auditoría y consulta oficial de todos los presupuestos comerciales.";
    } else {
        titleEl.innerText = "📋 Seguimiento";
        subtitleEl.innerText = "Historial, auditoría y consulta oficial de todos los presupuestos comerciales.";
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

window.renderEditableStatusDropdown = function(p) {
    let currentEst = p.estado || 'Enviado sin OC';
    if (currentEst === 'Cargado sin orden de compra' || currentEst === 'Pendiente de Autorización' || currentEst === 'Pendiente') currentEst = 'Enviado sin OC';
    else if (currentEst === 'Cargado con orden de compra' || currentEst === 'Autorizado' || currentEst === 'Aprobado') currentEst = 'Aprobado con OC';

    const options = [
        { val: 'Enviado sin OC', label: '📤 Enviado sin OC', color: '#fde68a', bg: 'rgba(245,158,11,0.25)', border: 'rgba(245,158,11,0.6)' },
        { val: 'Aprobado sin OC', label: '⏳ Aprobado sin OC', color: '#fef08a', bg: 'rgba(234,179,8,0.25)', border: 'rgba(234,179,8,0.6)' },
        { val: 'Aprobado con OC', label: '✅ Aprobado con OC', color: '#6ee7b7', bg: 'rgba(16,185,129,0.25)', border: 'rgba(16,185,129,0.6)' },
        { val: 'Facturado Parcial', label: '🧾 Facturado Parcial', color: '#e9d5ff', bg: 'rgba(168,85,247,0.25)', border: 'rgba(168,85,247,0.6)' },
        { val: 'Facturado Total', label: '💎 Facturado Total', color: '#99f6e4', bg: 'rgba(20,184,166,0.25)', border: 'rgba(20,184,166,0.6)' },
        { val: 'Rechazado', label: '❌ Rechazado', color: '#fda4af', bg: 'rgba(244,63,94,0.25)', border: 'rgba(244,63,94,0.6)' }
    ];

    const matched = options.find(o => o.val === currentEst) || options[0];
    const optsHtml = options.map(o => `<option value="${o.val}" ${o.val === currentEst ? 'selected' : ''} style="background: #0f172a; color: white;">${o.label}</option>`).join('');

    return `
        <div onclick="event.stopPropagation()" style="display: inline-block;">
            <select onchange="cambiarEstadoPresupuesto('${p.id}', this.value)" 
                    title="Haga clic aquí para modificar el estado de este presupuesto"
                    style="background: ${matched.bg}; color: ${matched.color}; border: 1.5px solid ${matched.border}; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; cursor: pointer; outline: none; transition: all 0.2s ease; box-shadow: 0 0 8px rgba(0,0,0,0.3);">
                ${optsHtml}
            </select>
        </div>
    `;
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

    let targetPct = 0;
    if (val === 'restante') {
        targetPct = Math.max(0, 100 - currentAcc);
    } else {
        targetPct = parseFloat(val) || 0;
    }

    const inputPct = document.getElementById('avance-input-pct');
    if (inputPct) {
        inputPct.value = targetPct;
        window.onAvancePorcentajeInput(targetPct);
    }
};

window.onAvancePorcentajeInput = function(pctVal) {
    const id = window.pedidoAvanceActivoId;
    const p = appData.pedidos.find(x => x.id === id);
    if (!p) return;

    const totalAmount = parseFloat(p.importe || 0);
    const pct = parseFloat(pctVal) || 0;
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

    const pct = parseFloat(inputPct ? inputPct.value : 0);
    if (isNaN(pct) || pct <= 0) {
        showToast('Por favor ingrese un porcentaje de avance válido (mayor a 0%).', 'error');
        if (inputPct) inputPct.focus();
        return;
    }

    const fecha = inputFecha ? inputFecha.value : new Date().toISOString().substring(0, 10);
    const nroDoc = inputDoc ? inputDoc.value.trim() : '';
    const detalle = inputDetalle ? inputDetalle.value.trim() : '';

    const totalAmount = parseFloat(p.importe || 0);
    const montoHito = totalAmount * (pct / 100);

    if (!Array.isArray(p.avances)) {
        p.avances = [];
    }

    const nuevoAvance = {
        id: 'av-' + Date.now(),
        fecha: fecha,
        porcentaje: pct,
        monto: montoHito,
        nro_doc: nroDoc,
        detalle: detalle,
        timestamp: new Date().toISOString()
    };

    p.avances.push(nuevoAvance);

    // Calcular acumulado
    p.avance_porcentaje_acumulado = p.avances.reduce((sum, a) => sum + (parseFloat(a.porcentaje) || 0), 0);
    p.monto_facturado_total = p.avances.reduce((sum, a) => sum + (parseFloat(a.monto) || 0), 0);

    saveData();

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
    const notifMsg = `🏗️ ALERTA DE FACTURACIÓN: Se certificó un avance de obra del ${avance.porcentaje}% (${montoHitoStr}) para el Presupuesto ${nroPres} (${cliente}). Total acumulado a facturar: ${acumuladoStr} de ${totalPresStr}.`;

    // Enviar notificación a todos los usuarios del sistema
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
    showToast(`📧 Alerta de facturación enviada a ${emailFacturacion}: Facturar ${avance.porcentaje}% (${montoHitoStr}).`, 'info');
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

// --- CONFIGURACIÓN DE COLUMNAS REORDENABLES Y AGRUPACIÓN ---
let tableColumnOrder = ['id', 'fecha', 'cliente', 'importe', 'estado', 'accion'];
const defaultTableColumnOrder = ['id', 'fecha', 'cliente', 'importe', 'estado', 'accion'];

const tableColumnDefs = {
    id: { key: 'id', label: 'N° ID', width: '65px', align: 'left', sortable: true },
    fecha: { key: 'fecha', label: 'Fecha', width: '105px', align: 'left', sortable: true },
    cliente: { key: 'cliente', label: 'Denominación del Servicio', width: 'auto', align: 'left', sortable: true },
    importe: { key: 'importe', label: 'Importe ($)', width: '100px', align: 'right', sortable: true },
    estado: { key: 'estado', label: 'Estado', width: '130px', align: 'center', sortable: true },
    accion: { key: 'accion', label: 'Acción', width: '240px', align: 'center', sortable: false }
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

window.abrirModalAgregarVista = function() {
    showModal('tpl-modal-nueva-vista');
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
    const savedOrder = localStorage.getItem('sg_table_col_order');
    if (savedOrder) {
        const parsed = JSON.parse(savedOrder);
        if (Array.isArray(parsed) && parsed.length > 0) {
            const validCols = parsed.filter(c => defaultTableColumnOrder.includes(c) && c !== 'condicion');
            defaultTableColumnOrder.forEach(c => {
                if (!validCols.includes(c)) validCols.push(c);
            });
            tableColumnOrder = validCols;
            try { localStorage.setItem('sg_table_col_order', JSON.stringify(tableColumnOrder)); } catch(e) {}
        }
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

window.handleColDragLeave = function(e) {
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
            localStorage.setItem('sg_table_col_order', JSON.stringify(tableColumnOrder));
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
        tableSortAsc = (colKey === 'fecha' || colKey === 'id' || colKey === 'importe') ? false : true;
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

    tableColumnOrder.forEach(colKey => {
        const def = tableColumnDefs[colKey] || { key: colKey, label: colKey, width: 'auto', align: 'left', sortable: false };
        const th = document.createElement('th');
        th.className = 'draggable-col';
        th.setAttribute('data-col', colKey);
        th.setAttribute('draggable', 'true');
        
        let colWidth = def.width;
        if (viewMode === 'EstadoPresupuesto') {
            if (colKey === 'id') colWidth = '65px';
            else if (colKey === 'fecha') colWidth = '105px';
            else if (colKey === 'cliente') colWidth = '280px';
            else if (colKey === 'importe') colWidth = '115px';
            else if (colKey === 'estado') colWidth = '175px';
            else if (colKey === 'accion') colWidth = '95px';
        }
        th.style.width = colWidth;
        th.style.textAlign = def.align;
        th.title = 'Arrastrá para reordenar la columna | Clic para ordenar';

        let colLabel = def.label;
        if (colKey === 'accion' && viewMode === 'EstadoPresupuesto') {
            colLabel = 'Avance';
        }

        let sortIcon = '';
        if (def.sortable) {
            if (tableSortColumn === colKey) {
                sortIcon = tableSortAsc ? ' <span style="color: #38bdf8; font-size: 11px;">▲</span>' : ' <span style="color: #38bdf8; font-size: 11px;">▼</span>';
            } else {
                sortIcon = ' <span style="opacity: 0.25; font-size: 10px;">⇅</span>';
            }
        }

        th.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: ${def.align === 'right' ? 'flex-end' : (def.align === 'center' ? 'center' : 'flex-start')}; gap: 4px; user-select: none;">
                <span style="opacity: 0.35; font-size: 10px; cursor: grab;" title="Arrastrar para mover">⋮⋮</span>
                <span>${colLabel}</span>${sortIcon}
            </div>
        `;

        th.ondragstart = (e) => window.handleColDragStart(e, colKey);
        th.ondragover = (e) => window.handleColDragOver(e);
        th.ondragleave = (e) => window.handleColDragLeave(e);
        th.ondrop = (e) => window.handleColDrop(e, colKey);
        th.onclick = (e) => window.handleColHeaderClick(colKey);

        theadRow.appendChild(th);
    });

    if (viewMode === 'EstadoPresupuesto') {
        const thSpacer = document.createElement('th');
        thSpacer.style.width = 'auto';
        theadRow.appendChild(thSpacer);
    }
}

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
    
    // Filtrar pedidos estrictamente por rubro activo (Eléctrico vs Mecánico)
    let filtered = appData.pedidos.filter(p => {
        if (reqTipoPresupuesto) {
            const isMec = (p.tipo_presupuesto === 'Mecánico' || (p.id && (String(p.id).startsWith('101') || String(p.id).toUpperCase().includes('MEC'))));
            const pTipo = isMec ? 'Mecánico' : 'Eléctrico';
            if (pTipo !== reqTipoPresupuesto) return false;
        }
        
        if (viewMode === 'Rechazados') {
            if (p.estado !== 'Rechazado') return false;
        } else if (viewMode === 'EstadoPresupuesto') {
            if (p.estado === 'Facturado Total' || p.estado === 'Rechazado') return false;
        } else if (viewMode === 'Autorizador') {
            if (p.estado !== 'Enviado sin OC' && p.estado !== 'Aprobado sin OC' && p.estado !== 'Pendiente de Autorización' && p.estado !== 'Cargado con orden de compra' && p.estado !== 'Cargado sin orden de compra') return false;
        }

        if (statusVal) {
            let pEstNorm = p.estado;
            if (pEstNorm === 'Cargado sin orden de compra' || pEstNorm === 'Pendiente de Autorización' || pEstNorm === 'Pendiente') pEstNorm = 'Enviado sin OC';
            else if (pEstNorm === 'Cargado con orden de compra' || pEstNorm === 'Autorizado' || pEstNorm === 'Aprobado') pEstNorm = 'Aprobado con OC';
            if (pEstNorm !== statusVal) return false;
        }
        
        const pDate = p.fecha.substring(0, 10);
        if (dateFrom && pDate < dateFrom) return false;
        if (dateTo && pDate > dateTo) return false;
        
        if (searchVal) {
            const matchesText = p.cliente_nombre.toLowerCase().includes(searchVal) || 
                                p.cuit.includes(searchVal) || 
                                p.id.includes(searchVal) ||
                                p.estado.toLowerCase().includes(searchVal);
            if (!matchesText) return false;
        }
        
        return true;
    });

    // Ordenamiento dinámico según columna activa
    filtered.sort((a, b) => {
        let valA = a[tableSortColumn] || '';
        let valB = b[tableSortColumn] || '';

        if (tableSortColumn === 'importe') {
            valA = parseFloat(a.importe) || 0;
            valB = parseFloat(b.importe) || 0;
            return tableSortAsc ? valA - valB : valB - valA;
        }
        if (tableSortColumn === 'cliente') {
            valA = (a.meca_denominacion || a.motivo || a.cliente_nombre || '').toLowerCase();
            valB = (b.meca_denominacion || b.motivo || b.cliente_nombre || '').toLowerCase();
        } else if (tableSortColumn === 'id') {
            valA = parseInt(a.id, 10) || 0;
            valB = parseInt(b.id, 10) || 0;
            return tableSortAsc ? valA - valB : valB - valA;
        } else {
            valA = String(valA).toLowerCase();
            valB = String(valB).toLowerCase();
        }

        if (valA < valB) return tableSortAsc ? -1 : 1;
        if (valA > valB) return tableSortAsc ? 1 : -1;
        return 0;
    });

    const totalCols = tableColumnOrder.length + (viewMode === 'EstadoPresupuesto' ? 1 : 0);

    if (filtered.length === 0) {
        listBody.innerHTML = `<tr><td colspan="${totalCols}" style="text-align: center; color: var(--text-muted); padding: 20px;">No se encontraron presupuestos comerciales.</td></tr>`;
        return;
    }

    function formatFechaCorta(fechaStr) {
        if (!fechaStr) return '-';
        const parts = fechaStr.split(' ');
        const d = parts[0] ? parts[0].split('-') : [];
        if (d.length === 3) {
            const time = parts[1] ? parts[1].substring(0, 5) : '';
            return `${d[2]}/${d[1]}/${d[0].substring(2)} ${time}`;
        }
        return fechaStr;
    }

    function createBudgetTableRow(p) {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        
        const statusBadge = getBudgetStatusBadgeHtml(p.estado, p.oc_limite_fecha);

        let actionBtnHtml = '';
        if (viewMode === 'EstadoPresupuesto') {
            const avanceAcc = (Array.isArray(p.avances) && p.avances.length > 0) 
                ? p.avances.reduce((s, a) => s + (parseFloat(a.porcentaje) || 0), 0) 
                : (p.avance_porcentaje_acumulado || 0);

            actionBtnHtml = `
                <div style="display: flex; gap: 4px; align-items: center; justify-content: center;">
                    <button class="btn btn-sm" onclick="event.stopPropagation(); abrirModalAvanceObra('${p.id}')" style="background: ${avanceAcc > 0 ? 'rgba(13, 148, 136, 0.25)' : 'rgba(100, 116, 139, 0.2)'}; color: ${avanceAcc > 0 ? '#2dd4bf' : '#cbd5e1'}; border: 1.5px solid ${avanceAcc > 0 ? '#0d9488' : 'rgba(148, 163, 184, 0.4)'}; font-weight: 800; padding: 2px 10px; height: 26px; font-size: 11.5px; border-radius: 6px; white-space: nowrap; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;" title="Avance de Obra: Ver y registrar nuevo avance / certificado">
                        <i class="fas fa-hammer"></i> <strong>${avanceAcc}%</strong>
                    </button>
                </div>
            `;
        } else if (viewMode === 'Rechazados' || p.estado === 'Rechazado') {
            actionBtnHtml = `
                <div style="display: flex; gap: 4px; align-items: center; justify-content: center;">
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); verDetallePedido('${p.id}')" style="background: #0284c7; color: #fff; border-color: #0284c7; font-weight: bold; padding: 2px 7px; font-size: 11px; height: 26px; border-radius: 6px; white-space: nowrap;" title="Ver Planilla: Consultar el comprobante completo del presupuesto">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn btn-sm" onclick="event.stopPropagation(); crearPresupuestoBasadoEnActual('${p.id}')" style="background: #7c3aed; color: #fff; border: 1px solid #7c3aed; font-weight: bold; padding: 2px 7px; height: 26px; font-size: 11px; border-radius: 6px; white-space: nowrap;" title="Basar Presupuesto: Crear un nuevo presupuesto precompletando los datos de este">
                        <i class="fas fa-copy"></i> Basar Pres.
                    </button>
                </div>
            `;
        } else if (viewMode === 'Modificacion') {
            actionBtnHtml = `
                <div style="display: flex; gap: 4px; align-items: center; justify-content: center;">
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); verDetallePedido('${p.id}')" style="background: #0284c7; color: #fff; border-color: #0284c7; font-weight: bold; padding: 2px 7px; font-size: 11px; height: 26px; border-radius: 6px; white-space: nowrap;" title="Editar: Modificar los artículos, observaciones o condiciones del presupuesto">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-sm" onclick="event.stopPropagation(); abrirModalAvanceObra('${p.id}')" style="background: #0d9488; color: #fff; border: 1px solid #0d9488; font-weight: bold; padding: 2px 7px; height: 26px; font-size: 11px; border-radius: 6px; white-space: nowrap;" title="Avance de Obra: Registrar nuevo certificado / porcentaje de avance y notificar facturación">
                        <i class="fas fa-hammer"></i> Avance
                    </button>
                    <button class="btn btn-sm" onclick="event.stopPropagation(); crearPresupuestoBasadoEnActual('${p.id}')" style="background: #7c3aed; color: #fff; border: 1px solid #7c3aed; font-weight: bold; padding: 2px 7px; height: 26px; font-size: 11px; border-radius: 6px; white-space: nowrap;" title="Basar Presupuesto: Crear un nuevo presupuesto precompletando los datos de este">
                        <i class="fas fa-copy"></i> Basar Pres.
                    </button>
                </div>
            `;
        } else if (viewMode === 'Autorizador') {
            actionBtnHtml = `
                <div style="display: flex; gap: 4px; align-items: center; justify-content: center;">
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); verDetallePedido('${p.id}')" style="background: #0284c7; color: #fff; border-color: #0284c7; font-weight: bold; padding: 2px 7px; font-size: 11px; height: 26px; border-radius: 6px; white-space: nowrap;" title="Revisar: Ver comprobante completo para autorizar o rechazar">
                        <i class="fas fa-eye"></i> Revisar
                    </button>
                    <button class="btn btn-sm btn-success" onclick="event.stopPropagation(); autorizarPedidoRapido('${p.id}')" style="background: #10b981; color: #fff; border: 1px solid #10b981; font-weight: bold; padding: 2px 7px; height: 26px; font-size: 11px; border-radius: 6px; white-space: nowrap;" title="Autorizar Presupuesto">
                        <i class="fas fa-check"></i> Autorizar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); rechazarPedidoRapido('${p.id}')" style="background: #e11d48; color: #fff; border: 1px solid #e11d48; font-weight: bold; padding: 2px 7px; height: 26px; font-size: 11px; border-radius: 6px; white-space: nowrap;" title="Rechazar Presupuesto">
                        <i class="fas fa-times"></i> Rechazar
                    </button>
                </div>
            `;
        } else {
            actionBtnHtml = `
                <div style="display: flex; gap: 4px; align-items: center; justify-content: center;">
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); verDetallePedido('${p.id}')" style="padding: 2px 7px; font-size: 11px; height: 26px; border-radius: 6px; white-space: nowrap;" title="Ver Planilla: Consultar el comprobante completo del presupuesto">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn btn-sm" onclick="event.stopPropagation(); abrirModalAvanceObra('${p.id}')" style="background: #0d9488; color: #fff; border: 1px solid #0d9488; font-weight: bold; padding: 2px 7px; height: 26px; font-size: 11px; border-radius: 6px; white-space: nowrap;" title="Avance de Obra: Registrar nuevo certificado / porcentaje de avance y notificar facturación">
                        <i class="fas fa-hammer"></i> Avance
                    </button>
                    <button class="btn btn-sm" onclick="event.stopPropagation(); crearPresupuestoBasadoEnActual('${p.id}')" style="background: #7c3aed; color: #fff; border: 1px solid #7c3aed; font-weight: bold; padding: 2px 7px; height: 26px; font-size: 11px; border-radius: 6px; white-space: nowrap;" title="Basar Presupuesto: Crear un nuevo presupuesto precompletando los datos de este">
                        <i class="fas fa-copy"></i> Basar Pres.
                    </button>
                </div>
            `;
        }

        const isItemMec = (p.tipo_presupuesto === 'Mecánico' || (p.id && (String(p.id).startsWith('101') || String(p.id).toUpperCase().includes('MEC'))));
        const tipoPresBadge = isItemMec 
            ? `<span class="badge" style="background: rgba(6, 182, 212, 0.2); color: #22d3ee; font-size: 9.5px; padding: 1px 5px; border: 1px solid rgba(6, 182, 212, 0.4); margin-left: 4px; border-radius: 4px; font-weight: 700;">⚙️ Mec</span>`
            : `<span class="badge" style="background: rgba(234, 179, 8, 0.2); color: #fde047; font-size: 9.5px; padding: 1px 5px; border: 1px solid rgba(234, 179, 8, 0.4); margin-left: 4px; border-radius: 4px; font-weight: 700;">⚡ Elec</span>`;

        const avanceAcc = (Array.isArray(p.avances) && p.avances.length > 0) ? p.avances.reduce((s, a) => s + (parseFloat(a.porcentaje) || 0), 0) : (p.avance_porcentaje_acumulado || 0);
        const avanceBadge = (avanceAcc > 0 && viewMode !== 'EstadoPresupuesto' && viewMode !== 'Rechazados' && p.estado !== 'Rechazado')
            ? `<div style="margin-top: 2px;"><span class="badge" style="background: rgba(13, 148, 136, 0.2); color: #2dd4bf; border: 1px solid rgba(45, 212, 191, 0.4); font-size: 9.5px; padding: 1px 5px; border-radius: 4px; font-weight: 800;"><i class="fas fa-hammer"></i> ${avanceAcc}%</span></div>`
            : '';

        let cellsHtml = tableColumnOrder.map(colKey => {
            switch (colKey) {
                case 'id':
                    return `<td style="font-family: monospace; font-weight: bold; color: var(--primary); font-size: 11.5px;">${p.id}</td>`;
                case 'fecha':
                    return `<td style="font-size: 10.5px; color: var(--text-muted); white-space: nowrap;">${formatFechaCorta(p.fecha)}</td>`;
                case 'cliente':
                    return `
                        <td>
                            <div class="client-name-cell" style="line-height: 1.25;">
                                <span class="client-name" style="font-size: 11.5px; font-weight: 600; color: white;">${p.meca_denominacion || p.motivo || p.cliente_nombre} ${tipoPresBadge}</span>
                                <span class="client-id" style="font-size: 10px; color: var(--text-muted); display: block;">${p.meca_planta ? 'Planta: ' + p.meca_planta : ''} ${p.meca_nro_oc ? '| OC: ' + p.meca_nro_oc : ''}</span>
                                ${avanceBadge}
                            </div>
                        </td>`;
                case 'importe':
                    return `<td style="text-align: right; font-family: monospace; font-weight: 700; font-size: 11.5px; color: white; white-space: nowrap;">$${parseFloat(p.importe || 0).toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</td>`;
                case 'estado':
                    if (viewMode === 'EstadoPresupuesto') {
                        return `<td style="text-align: center;">${renderEditableStatusDropdown(p)}</td>`;
                    }
                    return `<td style="text-align: center;">${statusBadge}</td>`;
                case 'accion':
                    return `<td style="text-align: center;">${actionBtnHtml}</td>`;
                default:
                    return `<td>-</td>`;
            }
        }).join('');

        if (viewMode === 'EstadoPresupuesto') {
            cellsHtml += '<td style="width: auto;"></td>';
        }

        tr.innerHTML = cellsHtml;
        tr.ondblclick = () => verDetallePedido(p.id);
        return tr;
    }

    // Renderizado con o sin agrupación
    if (tableGroupBy) {
        const groups = {};
        filtered.forEach(p => {
            let grpName = 'Otros';
            if (tableGroupBy === 'estado') {
                grpName = p.estado || 'Enviado sin OC';
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
}

// 5. PLANILLA DETALLE / AUTORIZACIÓN PRESEA
let pedidoActivo = null;
let pedidoEdicionTemp = null;

window.saveTempEdits = function() {
    if (viewMode !== 'Modificacion' || !pedidoActivo) return;
    
    // Save header identification fields
    const getEditVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : null;
    };
    if (getEditVal('auth-edit-meca-denominacion') !== null) pedidoActivo.meca_denominacion = getEditVal('auth-edit-meca-denominacion');
    if (getEditVal('auth-edit-meca-cliente') !== null) pedidoActivo.cliente_nombre = getEditVal('auth-edit-meca-cliente');
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
    
    // Save items quantities and status
    const checks = document.querySelectorAll('.auth-item-check');
    const qtys = document.querySelectorAll('.auth-item-qty');
    
    if (pedidoActivo.items) {
        pedidoActivo.items.forEach((item, idx) => {
            const chk = Array.from(checks).find(c => parseInt(c.getAttribute('data-idx')) === idx);
            const qtyInput = Array.from(qtys).find(q => parseInt(q.getAttribute('data-idx')) === idx);
            
            if (chk && qtyInput) {
                const isChecked = chk.checked;
                const qty = parseFloat(qtyInput.value);
                
                item.estado = isChecked ? 'Pendiente' : 'Rechazado';
                item.cantidad = isNaN(qty) || qty <= 0 ? 0.01 : qty;
                item.subtotal = item.cantidad * item.precio;
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
            showToast('El campo "viii. Duración estimada de la Ejecución" es obligatorio.', 'error');
            return;
        }
        if (!fechaFin) {
            showToast('El campo "ix. Plazo Máximo de Finalización" es obligatorio.', 'error');
            return;
        }

        if (fechaInicio <= fechaOferta) {
            showToast('La "vii. Fecha estimada de Inicio" debe ser obligatoriamente mayor a la "Fecha de Oferta" (día actual).', 'error');
            return;
        }

        if (fechaFin <= fechaInicio) {
            showToast('El "ix. Plazo Máximo de Finalización" debe ser obligatoriamente mayor a la "Fecha estimada de Inicio".', 'error');
            return;
        }
    }

    const activeItems = pedidoActivo.items.filter(item => item.estado !== 'Rechazado');
    if (activeItems.length === 0) {
        showToast('Debe dejar al menos un artículo activo en el presupuesto.', 'error');
        return;
    }
    
    const orderIdx = appData.pedidos.findIndex(p => p.id === pedidoActivo.id);
    if (orderIdx === -1) {
        showToast('No se encontró el pedido a modificar.', 'error');
        return;
    }
    
    const newAmount = activeItems.reduce((sum, item) => sum + (item.cantidad * item.precio), 0);
    const realOrder = appData.pedidos[orderIdx];
    
    realOrder.condicion_id = pedidoActivo.condicion_id;
    realOrder.condicion_nombre = pedidoActivo.condicion_nombre;
    realOrder.deposito_id = pedidoActivo.deposito_id;
    realOrder.deposito_nombre = pedidoActivo.deposito_nombre;
    realOrder.transporte_id = pedidoActivo.transporte_id;
    realOrder.transporte_nombre = pedidoActivo.transporte_nombre;
    realOrder.motivo = pedidoActivo.motivo;
    realOrder.moneda_id = pedidoActivo.moneda_id;
    realOrder.cotizacion = pedidoActivo.cotizacion;
    
    realOrder.items = pedidoActivo.items.map(item => ({
        ...item,
        cantidad_original: item.cantidad,
        subtotal: item.cantidad * item.precio
    }));
    
    realOrder.importe = newAmount;
    realOrder.importe_original = newAmount;
    realOrder.estado = pedidoActivo.estado || "Pendiente de Autorización";
    realOrder.fecha_resolucion = "";
    realOrder.motivo_rechazo = "";
    
    saveData();
    pedidoEdicionTemp = null;
    
    showToast(`Presupuesto ${pedidoActivo.id} modificado con éxito y reiniciado a Pendiente de Autorización.`, 'success');
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

window.verDetallePedido = function(id) {
    const pedido = appData.pedidos.find(p => p.id === id);
    if (!pedido) return;
    
    if (viewMode === 'Modificacion') {
        if (!pedidoEdicionTemp || pedidoEdicionTemp.id !== id) {
            pedidoEdicionTemp = JSON.parse(JSON.stringify(pedido));
        }
        pedidoActivo = pedidoEdicionTemp;
    } else {
        pedidoActivo = pedido;
    }
    
    const p = pedidoActivo;

    openModal('tpl-modal-auth');

    if (typeof window.registrarNavegacion === 'function') {
        window.registrarNavegacion({ type: 'modal_auth', pedidoId: id, label: `Presupuesto #${id}` });
    }

    // Ocultar botón 'Basar Presupuesto' si estamos en vista de Autorización
    const btnBasarModal = document.getElementById('btn-modal-basar-presupuesto');
    if (btnBasarModal) {
        btnBasarModal.style.display = (viewMode === 'Autorizador') ? 'none' : 'inline-block';
    }

    // Ocultar botón 'Avance de Obra' si el presupuesto está Rechazado o si estamos en vista de Rechazados
    const btnAvanceModal = document.getElementById('btn-modal-avance-obra');
    if (btnAvanceModal) {
        btnAvanceModal.style.display = (viewMode === 'Rechazados' || p.estado === 'Rechazado') ? 'none' : 'inline-flex';
    }

    // Popular planilla SG MONTAJES con el código respetando 101-MEC / 102-ELEC
    document.getElementById('auth-id').innerText = formatPresupuestoCodigo(p);
    
    // Formatear fecha a DD/MM/YYYY
    let formattedDate = p.fecha;
    if (p.fecha && p.fecha.includes(' ')) {
        const parts = p.fecha.substring(0, 10).split('-');
        if (parts.length === 3) {
            formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
    }
    document.getElementById('auth-date-val').innerText = formattedDate;
    
    const authHeaderOcVal = document.getElementById('auth-header-nro-oc-val');
    if (authHeaderOcVal) authHeaderOcVal.innerText = p.meca_nro_oc || p.nro_oc || '-';
    
    const rawClient = typeof clientesDB !== 'undefined' ? clientesDB.find(c => c.codigo === p.cliente_id) : null;
    const clientCode = p.cliente_id;
    const clientName = p.cliente_nombre;
    document.getElementById('auth-client-display').innerText = `${clientCode}  ${clientName.toUpperCase()}`;
    
    document.getElementById('auth-domicilio-val').innerText = rawClient ? (rawClient.domicilio || 'XX').toUpperCase() : 'XX';
    document.getElementById('auth-localidad-val').innerText = rawClient ? (rawClient.localidad || '(2000) SANTA FE').toUpperCase() : '(2000) SANTA FE';
    document.getElementById('auth-cuit-val').innerText = p.cuit || '- 999999-9';
    document.getElementById('auth-iva-val').innerText = 'CONSUMIDOR FINAL';
    
    const authComisionistaEl = document.getElementById('auth-comisionista-val');
    if (authComisionistaEl) authComisionistaEl.innerText = p.is_comisionista ? 'SÍ' : 'NO';
    const authTipoNvEl = document.getElementById('auth-tiponv-val');
    const isDetailMec = (p.tipo_presupuesto === 'Mecánico' || (p.id && (String(p.id).startsWith('101') || String(p.id).toUpperCase().includes('MEC'))));
    const isElec = !isDetailMec;
    if (authTipoNvEl) authTipoNvEl.innerText = `${isElec ? '⚡' : '⚙️'} PRESUPUESTO ${isElec ? 'ELÉCTRICO' : 'MECÁNICO'}`;
    document.getElementById('auth-entrega-val').innerText = (p.tipo_entrega || 'RETIRA CLIENTE').toUpperCase();
    document.getElementById('auth-pago-val').innerText = (p.forma_pago || 'CONTADO').toUpperCase();
    
    // Ficha y Aclaraciones para Presupuestos Excel (Mecánico y Eléctrico)
    const mecaHeaderBox = document.getElementById('auth-mecanico-header-box');
    const mecaAclaraciones = document.getElementById('auth-mecanico-aclaraciones');
    const customerInfoBox = document.getElementById('auth-customer-info-box');
    
    const tipoStr = (p.tipo_presupuesto || '').toLowerCase();
    const isElectrical = tipoStr.includes('eléctrico') || tipoStr.includes('electrico') || (!tipoStr.includes('mecánico') && !tipoStr.includes('mecanico'));
    const isExcelFlow = true;

    if (mecaHeaderBox) {
        mecaHeaderBox.style.display = 'block';
        
        const authMecaPropuestaBox = document.getElementById('auth-meca-propuesta-box');
        if (authMecaPropuestaBox) {
            authMecaPropuestaBox.style.display = isElectrical ? 'none' : 'flex';
        }

        const devVal = p.meca_denominacion || p.motivo || 'SERVICIOS Y MONTAJES';
        
        const toISODate = (val) => {
            if (!val) return new Date().toISOString().substring(0, 10);
            if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
                const parts = val.split('/');
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            const d = new Date(val);
            if (!isNaN(d.getTime())) return d.toISOString().substring(0, 10);
            return new Date().toISOString().substring(0, 10);
        };

        const formatDisplayDate = (val) => {
            if (!val || val === '-') return '-';
            if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
                const parts = val.split('-');
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            return val;
        };

        document.getElementById('auth-meca-denominacion-val').innerText = devVal;
        const authCliEl = document.getElementById('auth-meca-cliente-val');
        if (authCliEl) authCliEl.innerText = p.cliente_nombre || 'CARGILL SACI';
        document.getElementById('auth-meca-proveedor-val').innerText = p.meca_proveedor || 'SG MONTAJES SRL';
        document.getElementById('auth-meca-oferta-val').innerText = formatDisplayDate(p.meca_fecha_oferta || p.fecha || formattedDate);
        document.getElementById('auth-meca-validez-val').innerText = p.meca_validez || '5 DÍAS';
        document.getElementById('auth-meca-planta-val').innerText = (p.meca_planta === 'PGSM') ? 'PGSM' : 'VGG';
        
        document.getElementById('auth-meca-inicio-val').innerText = formatDisplayDate(p.meca_fecha_inicio || p.fecha || formattedDate);
        document.getElementById('auth-meca-duracion-val').innerText = p.meca_duracion || '-';
        document.getElementById('auth-meca-fin-val').innerText = formatDisplayDate(p.meca_fecha_fin || '-');
        document.getElementById('auth-meca-propuesta-val').innerText = p.meca_propuesta || '-';
        document.getElementById('auth-meca-personal-val').innerText = p.meca_personal || '-';
        document.getElementById('auth-meca-exclusiones-val').innerText = p.meca_exclusiones || '-';
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
    
    const isRejectedOrder = (p.estado === 'Rechazado' || p.estado === 'Anulado' || viewMode === 'Rechazados');

    // Render condition, deposit, and transport into container elements
    if (viewMode === 'Modificacion' && !isRejectedOrder) {
        // Condition Select
        let condHtml = `<select id="auth-condition-select" onchange="saveTempEdits(); recalcAuthTotal()" style="width: 100%; font-size: 11px; padding: 4px 6px; color: white; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 4px;">`;
        const seenCodes = new Set();
        const uniqueConds = condicionesDB.filter(c => {
            if (seenCodes.has(c.codigo)) return false;
            seenCodes.add(c.codigo);
            return true;
        });
        uniqueConds.forEach(c => {
            const displayName = c.nombre ? `${c.nombre} (${c.dias} días)` : `Condición ${c.codigo} (${c.dias} días)`;
            const selectedAttr = String(c.codigo) === String(p.condicion_id) ? 'selected' : '';
            condHtml += `<option value="${c.codigo}" ${selectedAttr}>${displayName}</option>`;
        });
        condHtml += `</select>`;
        document.getElementById('auth-condition-container').innerHTML = condHtml;

        // Deposit input with search icon
        document.getElementById('auth-deposit-container').innerHTML = `
            <div style="position: relative; display: flex; align-items: center; width: 100%;">
                <input type="text" id="auth-deposit-input-edit" autocomplete="off" value="${(p.deposito_nombre || '').toUpperCase()}" style="width: 100%; padding-right: 25px; font-size: 11px; padding: 4px 6px; color: white; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 4px;">
                <i class="fas fa-search" style="position: absolute; right: 5px; color: var(--primary); cursor: pointer;" onclick="abrirRobotDepositosEdicion()"></i>
                <div id="auth-deposit-dropdown-edit" class="custom-dropdown" style="display: none; position: absolute; width: 100%; z-index: 1000; max-height: 200px; overflow-y: auto; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; margin-top: 4px; top: 100%; text-align: left;"></div>
            </div>
        `;

        // Transport input with search icon
        document.getElementById('auth-transport-container').innerHTML = `
            <div style="position: relative; display: flex; align-items: center; width: 100%;">
                <input type="text" id="auth-transport-input-edit" autocomplete="off" value="${(p.transporte_nombre || '').toUpperCase()}" style="width: 100%; padding-right: 25px; font-size: 11px; padding: 4px 6px; color: white; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 4px;">
                <i class="fas fa-search" style="position: absolute; right: 5px; color: var(--primary); cursor: pointer;" onclick="abrirRobotTransportesEdicion()"></i>
                <div id="auth-transport-dropdown-edit" class="custom-dropdown" style="display: none; position: absolute; width: 100%; z-index: 1000; max-height: 200px; overflow-y: auto; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; margin-top: 4px; top: 100%; text-align: left;"></div>
            </div>
        `;

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
        document.getElementById('auth-currency-container').innerHTML = currHtml;

    } else {
        document.getElementById('auth-condition-container').innerText = (p.condicion_nombre || 'CONTADO').toUpperCase();
        document.getElementById('auth-deposit-container').innerText = (p.deposito_nombre || '-').toUpperCase();
        document.getElementById('auth-transport-container').innerText = (p.transporte_nombre || '-').toUpperCase();
        
        let currText = 'PESOS';
        if (p.moneda_id === 2) currText = `DÓLARES (cot. ${(p.cotizacion || 1.0).toFixed(8)})`;
        else if (p.moneda_id === 60) currText = `EUROS (cot. ${(p.cotizacion || 1.0).toFixed(8)})`;
        document.getElementById('auth-currency-container').innerText = currText;
    }
    
    document.getElementById('auth-user-val').innerText = (p.operador || 'admin').toUpperCase();
    document.getElementById('auth-sla-val').innerHTML = getSLABadge(p);
    
    const itemsPanel = document.getElementById('auth-items-panel');
    const itemsListBody = document.getElementById('auth-items-list-body');
    const isPending = p.estado === 'Pendiente de Autorización' || p.estado === 'Cargado con orden de compra' || p.estado === 'Cargado sin orden de compra';
    const isEditable = (isPending || viewMode === 'Modificacion') && !isRejectedOrder;

    // Renderizar observaciones editables
    if (viewMode === 'Modificacion' && !isRejectedOrder) {
        document.getElementById('auth-reason-val').innerHTML = `
            <textarea id="auth-reason-input-edit" rows="2" style="width: 100%; margin-top: 5px; color: white; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 4px; padding: 6px 10px; font-family: inherit; font-size: 11px;" oninput="saveTempEdits()">${p.motivo || ''}</textarea>
        `;
    } else {
        document.getElementById('auth-reason-val').innerText = p.motivo || 'Sin observaciones';
    }

    // Ocultar panel de agregar productos a petición del usuario
    const addItemPanel = document.getElementById('auth-add-item-panel');
    if (addItemPanel) {
        addItemPanel.style.display = 'none';
    }

    if (itemsPanel && itemsListBody) {
        const isRejected = (p.estado === 'Rechazado' || p.estado === 'Anulado' || viewMode === 'Rechazados');
        const canEdit = (viewMode === 'Modificacion' && !isRejected);
        
        let validItems = (Array.isArray(p.items) ? p.items : []).filter(item => {
            const q = parseFloat(item.cantidad) || parseFloat(item.cantidad_original) || 0;
            const s = parseFloat(item.subtotal) || 0;
            return q > 0 || s > 0 || item.estado === 'Rechazado' || item.estado === 'Autorizado';
        });

        if (validItems.length === 0 && isRejected) {
            validItems = [{
                codigo: formatPresupuestoCodigo(p),
                detalle: (p.meca_denominacion || p.motivo || 'SERVICIOS Y MONTAJES').toUpperCase(),
                cantidad: 1,
                precio: parseFloat(p.importe) || 0,
                subtotal: parseFloat(p.importe) || 0,
                estado: 'Rechazado'
            }];
        }

        if (validItems.length > 0 || canEdit) {
            itemsPanel.style.display = 'block';
            let html = '';
            validItems.forEach((item, idx) => {
                if (canEdit) {
                    // En modo modificación, todos los artículos son editables
                    const isChecked = item.estado !== 'Rechazado';
                    const qtyVal = item.cantidad > 0 ? item.cantidad : (item.cantidad_original || 1);
                    html += `
                        <tr class="pdf-tr">
                            <td style="text-align: center; width: 35px;" class="auth-edit-col">
                                <input type="checkbox" class="auth-item-check" data-idx="${idx}" ${isChecked ? 'checked' : ''} onchange="saveTempEdits(); recalcAuthTotal()" style="width:16px; height:16px; accent-color: var(--success); cursor: pointer;">
                            </td>
                            <td class="col-code" style="font-family: monospace;">${item.codigo}</td>
                            <td><strong>${item.detalle}</strong> ${item.estado === 'Rechazado' ? '<span class="badge-pdf-rejected">EXCLUIDO</span>' : ''}</td>
                            <td class="col-qty">
                                <input type="number" class="auth-item-qty" data-idx="${idx}" value="${qtyVal}" min="0.01" step="any" onwheel="this.blur()" onkeydown="if(['e','E','+','-'].includes(event.key)) event.preventDefault();" oninput="saveTempEdits(); recalcAuthTotal()" 
                                    style="width: 65px; text-align: center; border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; padding: 2px 5px; color: white; background: rgba(15, 23, 42, 0.85); font-family: monospace; font-weight: bold;">
                            </td>
                            <td class="col-price" style="font-family: monospace;">
                                $${(parseFloat(item.precio) || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}
                            </td>
                            <td class="col-total" style="font-family: monospace; font-weight: bold;">
                                $<span class="auth-item-subtotal-val" data-idx="${idx}">${(qtyVal * (parseFloat(item.precio) || 0)).toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
                            </td>
                        </tr>
                    `;
                } else if (isPending) {
                    const isItemAutorizado = item.estado === 'Autorizado';
                    const isItemRechazado = item.estado === 'Rechazado';
                    const itemSubtotal = (typeof item.subtotal === 'number' ? item.subtotal : (item.cantidad * item.precio)) || 0;
                    if (isItemAutorizado) {
                        html += `
                            <tr class="pdf-tr resolved-item">
                                <td style="text-align: center; width: 35px;" class="auth-edit-col">
                                    <span style="color: var(--success); font-weight: bold;">✔</span>
                                </td>
                                <td class="col-code" style="font-family: monospace;">${item.codigo}</td>
                                <td><strong>${item.detalle}</strong> <span class="badge-pdf-authorized">YA AUTORIZADO</span></td>
                                <td class="col-qty" style="font-weight: bold; font-family: monospace;">${(parseFloat(item.cantidad) || 1).toFixed(2)}</td>
                                <td class="col-price" style="font-family: monospace;">$${(parseFloat(item.precio) || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                                <td class="col-total" style="font-family: monospace; font-weight: bold;">
                                    $${itemSubtotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}
                                </td>
                            </tr>
                        `;
                    } else if (isItemRechazado) {
                        html += `
                            <tr class="pdf-tr rejected-item">
                                <td style="text-align: center; width: 35px;" class="auth-edit-col">
                                    <span style="color: var(--danger); font-weight: bold;">✕</span>
                                </td>
                                <td class="col-code" style="font-family: monospace;">${item.codigo}</td>
                                <td style="text-decoration: line-through;"><strong>${item.detalle}</strong> <span class="badge-pdf-rejected">RECHAZADO</span></td>
                                <td class="col-qty" style="text-decoration: line-through; font-family: monospace;">${(parseFloat(item.cantidad_original) || parseFloat(item.cantidad) || 1).toFixed(2)}</td>
                                <td class="col-price" style="font-family: monospace;">$${(parseFloat(item.precio) || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                                <td class="col-total" style="font-family: monospace; font-weight: bold;">
                                    $${itemSubtotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}
                                </td>
                            </tr>
                        `;
                    } else {
                        html += `
                            <tr class="pdf-tr">
                                <td style="text-align: center; width: 35px;" class="auth-edit-col">
                                    <input type="checkbox" class="auth-item-check" data-idx="${idx}" checked onchange="recalcAuthTotal()" style="width:16px; height:16px; accent-color: var(--success); cursor: pointer;">
                                </td>
                                <td class="col-code" style="font-family: monospace;">${item.codigo}</td>
                                <td><strong>${item.detalle}</strong></td>
                                <td class="col-qty">
                                    <input type="number" class="auth-item-qty" data-idx="${idx}" value="${item.cantidad}" min="0.01" max="${item.cantidad_original || item.cantidad}" step="any" onwheel="this.blur()" onkeydown="if(['e','E','+','-'].includes(event.key)) event.preventDefault();" oninput="recalcAuthTotal()" 
                                        style="width: 65px; text-align: center; border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; padding: 2px 5px; color: white; background: rgba(15, 23, 42, 0.85); font-family: monospace; font-weight: bold;">
                                </td>
                                <td class="col-price" style="font-family: monospace;">
                                    $${(parseFloat(item.precio) || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}
                                </td>
                                <td class="col-total" style="font-family: monospace; font-weight: bold;">
                                    $<span class="auth-item-subtotal-val" data-idx="${idx}">${itemSubtotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
                                </td>
                            </tr>
                        `;
                    }
                } else {
                    // Detalle en solo lectura (incluyendo Presupuesto Rechazado)
                    const isItemRechazado = item.estado === 'Rechazado' || isRejected;
                    const rowClass = isItemRechazado ? 'pdf-tr rejected-item' : 'pdf-tr';
                    const badgeHtml = isItemRechazado ? ' <span class="badge-pdf-rejected" style="background: #ef4444; color: white; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; margin-left: 6px;">RECHAZADO</span>' : '';
                    
                    const qtyVal = parseFloat(item.cantidad) || parseFloat(item.cantidad_original) || 1;
                    const qtyDisplay = qtyVal.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 2});
                    const priceVal = parseFloat(item.precio) || 0;
                    const itemSubtotal = (typeof item.subtotal === 'number' ? item.subtotal : (qtyVal * priceVal)) || 0;
                    const subtotalDisplay = `$${itemSubtotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
 
                    html += `
                        <tr class="${rowClass}">
                            <td style="text-align: center; width: 35px;" class="auth-edit-col">
                                <span style="font-weight: bold; color: ${isItemRechazado ? 'var(--danger)' : 'var(--success)'};">${isItemRechazado ? '✕' : '✔'}</span>
                            </td>
                            <td class="col-code" style="font-family: monospace;">${item.codigo}</td>
                            <td><strong>${item.detalle}</strong>${badgeHtml}</td>
                            <td class="col-qty" style="font-family: monospace; text-align: center;">${qtyDisplay}</td>
                            <td class="col-price" style="font-family: monospace; text-align: right;">$${priceVal.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                            <td class="col-total" style="font-family: monospace; font-weight: 700; text-align: right;">${subtotalDisplay}</td>
                        </tr>
                    `;
                }
            });
            itemsListBody.innerHTML = html;

            // Ocultar/Mostrar columna de checkboxes tanto en th como en td de las filas recién insertadas
            const editCols = document.querySelectorAll('.auth-edit-col');
            editCols.forEach(col => {
                col.style.display = isEditable ? '' : 'none';
            });

        } else {
            itemsPanel.style.display = 'none';
            itemsListBody.innerHTML = '';
        }
    }

    window.cambiarTipoReporteEnVista = function(nuevoTipo) {
        if (pedidoActivo) {
            pedidoActivo.tipo_reporte = nuevoTipo;
            if (window.appData && Array.isArray(window.appData.pedidos)) {
                const pOrig = window.appData.pedidos.find(x => x.id === pedidoActivo.id);
                if (pOrig) pOrig.tipo_reporte = nuevoTipo;
            }
            if (typeof saveData === 'function') saveData();
            verDetallePedido(pedidoActivo.id);
        }
    };

    const isRejected = (p.estado === 'Rechazado' || p.estado === 'Anulado' || viewMode === 'Rechazados');
    const canEdit = (viewMode === 'Modificacion' && !isRejected);

    const toggleContainer = document.getElementById('auth-report-type-toggle-container');
    if (toggleContainer) {
        toggleContainer.style.display = isRejected ? 'none' : 'inline-flex';
    }

    const isResumido = (!isRejected && p.tipo_reporte === 'resumido');

    // Sync header toggle buttons
    const btnDet = document.getElementById('btn-toggle-report-detallado');
    const btnRes = document.getElementById('btn-toggle-report-resumido');
    if (btnDet && btnRes) {
        if (isResumido) {
            btnDet.style.background = 'transparent';
            btnDet.style.color = 'var(--text-muted)';
            btnRes.style.background = '#10b981';
            btnRes.style.color = 'white';
        } else {
            btnDet.style.background = '#0284c7';
            btnDet.style.color = 'white';
            btnRes.style.background = 'transparent';
            btnRes.style.color = 'var(--text-muted)';
        }
    }

    // Renderizar la Propuesta Comercial (Tarifario Detallado o Resumen Ejecutivo)
    const authMecaContainer = document.getElementById('auth-mecanico-excel-container');

    if (authMecaContainer) {
        authMecaContainer.style.display = 'block';
        if (itemsPanel) itemsPanel.style.display = 'none';

        if (isRejected) {
            authMecaContainer.innerHTML = `
                <div style="background: rgba(244,63,94,0.08); border: 1.5px solid rgba(244,63,94,0.3); border-radius: 10px; padding: 14px; margin-bottom: 15px; color: #fda4af;">
                    <div style="font-weight: 800; font-size: 14px; margin-bottom: 4px;"><i class="fas fa-times-circle"></i> PRESUPUESTO RECHAZADO</div>
                    <div style="font-size: 12px;"><strong>Motivo:</strong> ${p.motivo_rechazo || 'Presupuesto rechazado por el cliente o administración.'}</div>
                </div>
            `;
        } else if (canEdit) {
            const prevTipo = reqTipoPresupuesto;
            reqTipoPresupuesto = p.tipo_presupuesto || 'Eléctrico';
            pedidoItems = JSON.parse(JSON.stringify(p.items || []));
            renderMecanicoExcelGridInContainer(authMecaContainer, true);
            reqTipoPresupuesto = prevTipo;
        } else if (isResumido) {
            // ================= COMPROBANTE RESUMIDO =================
            const devText = (p.meca_denominacion || p.motivo || 'SERVICIOS Y MONTAJES').toUpperCase();
            const validItems = (Array.isArray(p.items) ? p.items : []).filter(it => {
                const q = parseFloat(it.cantidad) || 0;
                return q > 0 && it.estado !== 'Rechazado';
            });
            const itemsCountTotal = validItems.length > 0 ? validItems.length : 1;
            const netAmt = parseFloat(p.importe) || validItems.reduce((sum, it) => sum + (parseFloat(it.subtotal) || (parseFloat(it.cantidad) * parseFloat(it.precio)) || 0), 0);
            const ivaAmt = netAmt * 0.21;
            const totalWithIvaAmt = netAmt * 1.21;
            const subtotalStr = `$${netAmt.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            const ivaStr = `$${ivaAmt.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            const totalWithIvaStr = `$${totalWithIvaAmt.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

            authMecaContainer.innerHTML = `
                <div style="background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; overflow: hidden; color: var(--text-main); font-family: inherit; margin-bottom: 15px; text-align: left; box-shadow: var(--glass-shadow);">
                    <div style="background: rgba(16, 185, 129, 0.15); color: #34d399; font-weight: 800; font-size: 13px; padding: 10px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; justify-content: space-between; align-items: center;">
                        <span style="letter-spacing: 0.5px; font-weight: 800;"><i class="fas fa-clipboard-list"></i> PROPUESTA COMERCIAL (REPORTE RESUMIDO)</span>
                        <span style="font-size: 11px; background: rgba(16, 185, 129, 0.25); color: #34d399; padding: 2px 8px; border-radius: 4px; font-weight: 700; border: 1px solid rgba(16, 185, 129, 0.4);">Modo Resumido</span>
                    </div>
                    <div style="overflow-x: auto; padding: 10px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: var(--text-main); background: transparent;">
                            <thead>
                                <tr style="background: rgba(15, 23, 42, 0.7); border-bottom: 1px solid rgba(255, 255, 255, 0.1); font-weight: bold; text-align: left;">
                                    <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 10px; text-align: center; width: 45px; color: #ffffff !important; font-weight: 800; font-size: 12px;">#</th>
                                    <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 10px; color: #ffffff !important; font-weight: 800; font-size: 12px;">Denominación del Servicio / Obra</th>
                                    <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 10px; text-align: center; width: 150px; color: #ffffff !important; font-weight: 800; font-size: 12px;">Conceptos</th>
                                    <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 10px; text-align: right; width: 180px; color: #ffffff !important; font-weight: 800; font-size: 12px;">Importe Neto</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06); background: rgba(255, 255, 255, 0.02);">
                                    <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 12px; text-align: center; color: var(--text-muted) !important; font-family: monospace; font-weight: 800; font-size: 12px;">1</td>
                                    <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 12px; font-weight: 800; color: #ffffff !important; font-size: 13px;">${devText}</td>
                                    <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 12px; text-align: center; font-weight: 800; font-family: monospace; font-size: 13px; color: #ffffff !important;">${itemsCountTotal} conceptos</td>
                                    <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 12px; text-align: right; font-family: monospace; font-weight: 900; color: #38bdf8 !important; font-size: 14px;">${subtotalStr}</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr style="background: rgba(15, 23, 42, 0.7); font-size: 11px;">
                                    <td colspan="3" style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 7px 14px; text-align: right; color: var(--text-muted);"><strong>SUBTOTAL (NETO):</strong></td>
                                    <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 7px 14px; text-align: right; font-family: monospace; font-weight: 700; color: #ffffff;">${subtotalStr}</td>
                                </tr>
                                <tr style="background: rgba(15, 23, 42, 0.7); font-size: 11px;">
                                    <td colspan="3" style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 7px 14px; text-align: right; color: #fde047;"><strong>I.V.A. (21%):</strong></td>
                                    <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 7px 14px; text-align: right; font-family: monospace; font-weight: 700; color: #fde047;">${ivaStr}</td>
                                </tr>
                                <tr style="background: rgba(16, 185, 129, 0.15); color: #34d399; font-weight: bold; font-size: 13px; border-top: 2px solid rgba(16, 185, 129, 0.5);">
                                    <td colspan="3" style="border: 1px solid rgba(16, 185, 129, 0.2); padding: 10px 14px; text-align: right; text-transform: uppercase;"><strong>TOTAL (IVA Incluido):</strong></td>
                                    <td style="border: 1px solid rgba(16, 185, 129, 0.2); padding: 10px 14px; text-align: right; font-family: monospace; font-weight: 900; font-size: 15px; color: #34d399 !important;">${totalWithIvaStr}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            `;
        } else {
            // ================= COMPROBANTE DETALLADO =================
            const isMec = (p.tipo_presupuesto === 'Mecánico' || (p.id && (String(p.id).startsWith('101') || String(p.id).toUpperCase().includes('MEC'))));
            const catalog = isMec ? (window.presupuestoMecanicoDB || []) : (window.presupuestosCatalogDB || []);

            const validItems = (Array.isArray(p.items) ? p.items : []).filter(item => {
                const q = parseFloat(item.cantidad) || 0;
                return q > 0 && item.estado !== 'Rechazado';
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

                    const qty = parseFloat(item.cantidad) || 0;
                    const price = parseFloat(item.precio) || 0;
                    const sub = (typeof item.subtotal === 'number' ? item.subtotal : (qty * price)) || 0;
                    grandTotal += sub;

                    itemsRowsHtml += `
                        <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06); background: ${idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent'};">
                            <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 8px 10px; text-align: center; color: var(--text-muted); font-family: monospace; font-weight: 700;">${idx + 1}</td>
                            <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 8px 10px; font-family: monospace; font-weight: 700; color: #38bdf8;">${item.codigo || '-'}</td>
                            <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 8px 10px; font-weight: 600; color: #ffffff;">${item.detalle || 'Servicio'}</td>
                            <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 8px 10px; text-align: center; font-weight: 800; font-family: monospace; color: #ffffff;">${qty.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</td>
                            <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 8px 10px; text-align: center; color: var(--text-muted); font-size: 11px; text-transform: uppercase;">${udm}</td>
                            <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 8px 10px; text-align: right; font-family: monospace; color: #ffffff;">$${price.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 8px 10px; text-align: right; font-family: monospace; font-weight: 800; color: #38bdf8;">$${sub.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        </tr>
                    `;
                });
            } else {
                grandTotal = parseFloat(p.importe || 0);
                itemsRowsHtml = `
                    <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
                        <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 10px; text-align: center;">1</td>
                        <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 10px; font-family: monospace; color: #38bdf8;">${formatPresupuestoCodigo(p)}</td>
                        <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 10px; font-weight: 600; color: #ffffff;">${(p.meca_denominacion || p.motivo || 'SERVICIOS Y MONTAJES').toUpperCase()}</td>
                        <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 10px; text-align: center; font-family: monospace;">1</td>
                        <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 10px; text-align: center;">gl</td>
                        <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 10px; text-align: right; font-family: monospace;">$${grandTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                        <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 10px; text-align: right; font-family: monospace; font-weight: 800; color: #38bdf8;">$${grandTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                    </tr>
                `;
            }

            const netAmt = grandTotal || parseFloat(p.importe) || 0;
            const ivaAmt = netAmt * 0.21;
            const totalWithIvaAmt = netAmt * 1.21;
            const subtotalStr = `$${netAmt.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            const ivaStr = `$${ivaAmt.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            const totalWithIvaStr = `$${totalWithIvaAmt.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

            authMecaContainer.innerHTML = `
                <div style="background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; overflow: hidden; color: var(--text-main); font-family: inherit; margin-bottom: 15px; text-align: left; box-shadow: var(--glass-shadow);">
                    <div style="background: rgba(2, 132, 199, 0.15); color: #38bdf8; font-weight: 800; font-size: 13px; padding: 10px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; justify-content: space-between; align-items: center;">
                        <span style="letter-spacing: 0.5px; font-weight: 800;"><i class="fas fa-file-lines"></i> PROPUESTA COMERCIAL (REPORTE DETALLADO)</span>
                        <span style="font-size: 11px; background: rgba(2, 132, 199, 0.25); color: #38bdf8; padding: 2px 8px; border-radius: 4px; font-weight: 700; border: 1px solid rgba(2, 132, 199, 0.4);">Modo Detallado</span>
                    </div>
                    <div style="overflow-x: auto; padding: 10px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; color: var(--text-main); background: transparent;">
                            <thead>
                                <tr style="background: rgba(15, 23, 42, 0.7); border-bottom: 1px solid rgba(255, 255, 255, 0.1); font-weight: bold; text-align: left;">
                                    <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 8px; text-align: center; width: 40px; color: #ffffff !important; font-weight: 800;">#</th>
                                    <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 8px; width: 110px; color: #ffffff !important; font-weight: 800;">Código</th>
                                    <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 8px; color: #ffffff !important; font-weight: 800;">Detalle del Ítem / Servicio</th>
                                    <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 8px; text-align: center; width: 80px; color: #ffffff !important; font-weight: 800;">Cantidad</th>
                                    <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 8px; text-align: center; width: 75px; color: #ffffff !important; font-weight: 800;">U.D.M.</th>
                                    <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 8px; text-align: right; width: 130px; color: #ffffff !important; font-weight: 800;">Precio Unitario</th>
                                    <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 8px; text-align: right; width: 140px; color: #ffffff !important; font-weight: 800;">Precio Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsRowsHtml}
                            </tbody>
                            <tfoot>
                                <tr style="background: rgba(15, 23, 42, 0.7); font-size: 11px;">
                                    <td colspan="6" style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 7px 14px; text-align: right; color: var(--text-muted);"><strong>SUBTOTAL (NETO):</strong></td>
                                    <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 7px 14px; text-align: right; font-family: monospace; font-weight: 700; color: #ffffff;">${subtotalStr}</td>
                                </tr>
                                <tr style="background: rgba(15, 23, 42, 0.7); font-size: 11px;">
                                    <td colspan="6" style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 7px 14px; text-align: right; color: #fde047;"><strong>I.V.A. (21%):</strong></td>
                                    <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 7px 14px; text-align: right; font-family: monospace; font-weight: 700; color: #fde047;">${ivaStr}</td>
                                </tr>
                                <tr style="background: rgba(2, 132, 199, 0.15); color: #38bdf8; font-weight: bold; font-size: 13px; border-top: 2px solid rgba(2, 132, 199, 0.5);">
                                    <td colspan="6" style="border: 1px solid rgba(2, 132, 199, 0.2); padding: 10px 14px; text-align: right; text-transform: uppercase;"><strong>TOTAL (IVA Incluido):</strong></td>
                                    <td style="border: 1px solid rgba(2, 132, 199, 0.2); padding: 10px 14px; text-align: right; font-family: monospace; font-weight: 900; font-size: 15px; color: #38bdf8 !important;">${totalWithIvaStr}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            `;
        }
    }

    // Actualizar selector y badge de estado en el modal
    const statusEditGroup = document.getElementById('modal-status-edit-group');
    if (statusEditGroup) {
        statusEditGroup.style.display = canEdit ? 'flex' : 'none';
    }
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
    } else if (canEdit) {
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
    } else if (viewMode === 'Autorizador') {
        if (resolvedPanel) resolvedPanel.style.display = 'none';
        if (actionsPanel) {
            actionsPanel.style.display = 'flex';
            actionsPanel.innerHTML = `
                <div style="background: rgba(15, 23, 42, 0.85); border: 1.5px solid rgba(56, 189, 248, 0.35); border-radius: 10px; padding: 16px; width: 100%; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                    <div style="font-size: 13px; font-weight: 800; color: #38bdf8; text-transform: uppercase; margin-bottom: 12px; text-align: center; letter-spacing: 0.5px;">
                        ⚖️ Decisión de Autorización Comercial
                    </div>
                    <div style="display: flex; gap: 24px; align-items: center; justify-content: center; margin-bottom: 12px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: white; font-size: 14px; font-weight: 700;">
                            <input type="radio" name="auth-decision" value="autorizar" checked onclick="toggleAuthDecision('autorizar')" style="width: 18px; height: 18px; accent-color: #10b981;">
                            <span style="color: #6ee7b7;">✅ Aceptar / Autorizar</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: white; font-size: 14px; font-weight: 700;">
                            <input type="radio" name="auth-decision" value="rechazar" onclick="toggleAuthDecision('rechazar')" style="width: 18px; height: 18px; accent-color: #f43f5e;">
                            <span style="color: #fda4af;">❌ Rechazar Presupuesto</span>
                        </label>
                    </div>
                    <div class="form-group" id="reject-comment-group" style="display: none; animation: fadeIn 0.2s; margin-top: 10px;">
                        <label style="color: #f43f5e; font-weight: bold; font-size: 12px; display: block; margin-bottom: 4px;">Motivo del Rechazo * <span style="color: #fda4af; font-size: 11px;">(Obligatorio)</span></label>
                        <textarea id="auth-reject-reason-input" rows="2" placeholder="Ingrese el motivo por el cual rechaza el presupuesto..." style="width: 100%; border: 1.5px solid #f43f5e; background: rgba(0,0,0,0.5); color: white; border-radius: 6px; padding: 6px 10px; font-size: 12px;"></textarea>
                    </div>
                    <div style="display: flex; justify-content: center; margin-top: 12px;">
                        <button id="btn-confirm-auth" class="btn btn-success" style="font-size: 14px; padding: 10px 40px; font-weight: bold; width: 100%; background: #10b981; border-color: #10b981; cursor: pointer; box-shadow: 0 4px 12px rgba(16,185,129,0.3);" onclick="confirmarResolucion()">
                            <i class="fas fa-check-circle"></i> Confirmar Decisión
                        </button>
                    </div>
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
    
    // Domicilio de entrega
    const rawClient = typeof clientesDB !== 'undefined' ? clientesDB.find(c => c.codigo === pedidoActivo.cliente_id) : null;
    const domEl = document.getElementById('auth-delivery-domicilio');
    const locEl = document.getElementById('auth-delivery-localidad');
    if (domEl) domEl.innerText = rawClient ? (rawClient.domicilio || '-').toUpperCase() : '-';
    if (locEl) locEl.innerText = rawClient ? (rawClient.localidad || '-').toUpperCase() : '-';
    
    // Facturas pendientes
    const billsEl = document.getElementById('auth-bills-list');
    if (billsEl) {
        billsEl.innerText = generarDetalleFacturasPendientes(rawClient, currencyName);
    }
};

// 6. ANÁLISIS Y MÉTRICAS DE VENTAS
let chartPieInstance = null;
let chartBarInstance = null;

window.applyPresetDateFilterMetrics = function(preset) {
    const dtStart = document.getElementById('filter-date-start');
    const dtEnd = document.getElementById('filter-date-end');
    if (!dtStart || !dtEnd) return;
    
    const today = new Date();
    
    const formatDate = (date) => {
        return getLocalDateStr(date);
    };
    
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
    const presetSelect = document.getElementById('preset-date-filter-metrics');
    const sellerSelect = document.getElementById('filter-metrics-seller');
    
    if (dtStart && !dtStart.value) {
        const today = getLocalDateStr(new Date());
        const past30 = getLocalDateStr(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
        dtStart.value = past30;
        dtEnd.value = today;
        if (presetSelect) presetSelect.value = 'last30';
    }

    // Llenar selector de vendedores
    const currentUserForMetrics = getCurrentUser();
    const isVendedorSolicitante = currentUserForMetrics && (currentUserForMetrics.role === 'Solicitante' || currentUserForMetrics.vendedor_nombre);
    
    if (sellerSelect && typeof vendedoresDB !== 'undefined') {
        sellerSelect.innerHTML = '<option value="">Todos los Vendedores...</option>';
        vendedoresDB.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.nombre;
            opt.innerText = v.nombre;
            sellerSelect.appendChild(opt);
        });
        sellerSelect.onchange = renderMetrics;
    }
    
    // Si el usuario es Solicitante con vendedor, ocultar el selector y auto-filtrar
    if (isVendedorSolicitante && sellerSelect) {
        // Buscar el contenedor del selector y ocultarlo
        const sellerContainer = sellerSelect.closest('.form-group') || sellerSelect.closest('div[style]') || sellerSelect.parentElement;
        if (sellerContainer) sellerContainer.style.display = 'none';
    }

    const filterHandler = () => {
        if (presetSelect) presetSelect.value = 'custom';
        renderMetrics();
    };

    if (dtStart) dtStart.onchange = filterHandler;
    if (dtEnd) dtEnd.onchange = filterHandler;

    const applyBtn = document.getElementById('btn-apply-filters');
    const clearBtn = document.getElementById('btn-clear-filters');

    if (applyBtn) applyBtn.onclick = () => renderMetrics();
    if (clearBtn) {
        clearBtn.onclick = () => {
            dtStart.value = '';
            dtEnd.value = '';
            if (sellerSelect) sellerSelect.value = '';
            if (presetSelect) presetSelect.value = 'custom';
            renderMetrics();
        };
    }

    renderMetrics();
}

function renderMetrics() {
    const dateStart = document.getElementById('filter-date-start').value;
    const dateEnd = document.getElementById('filter-date-end').value;
    const sellerSelectEl = document.getElementById('filter-metrics-seller');
    let sellerSelectVal = sellerSelectEl ? sellerSelectEl.value : '';

    // Si el usuario logueado es Solicitante o tiene vendedor asignado, filtrar automáticamente por su vendedor
    const currentUser = getCurrentUser();
    const isVendedorRole = currentUser && (currentUser.role === 'Solicitante' || currentUser.vendedor_nombre);
    if (isVendedorRole) {
        if (currentUser.vendedor_nombre) {
            sellerSelectVal = currentUser.vendedor_nombre;
        }
        // Ocultar el selector de vendedor para que no pueda cambiarlo
        if (sellerSelectEl) {
            sellerSelectEl.closest('.form-group') && (sellerSelectEl.closest('.form-group').style.display = 'none');
            sellerSelectEl.parentElement && (sellerSelectEl.parentElement.style.display = 'none');
        }
    } else {
        // Para admins/autorizadores, mostrar el selector
        if (sellerSelectEl && sellerSelectEl.parentElement) {
            sellerSelectEl.parentElement.style.display = '';
        }
    }

    // Primero filtramos por fecha para las estadísticas generales y el ranking de vendedores
    let dateFiltered = appData.pedidos.filter(p => {
        const pDate = p.fecha.substring(0, 10);
        if (dateStart && pDate < dateStart) return false;
        if (dateEnd && pDate > dateEnd) return false;
        return true;
    });

    // Si el usuario logueado tiene rol Solicitante, restringir TODO su dateFiltered a su propio vendedor (o a sí mismo)
    if (currentUser && currentUser.role === 'Solicitante') {
        if (currentUser.vendedor_nombre) {
            dateFiltered = dateFiltered.filter(p => {
                const pVendedorId = p.vendedor_id || p.operador_vendedor_id || '';
                const pVendedorNombre = p.vendedor_nombre || p.operador_vendedor_nombre || '';
                if (currentUser.vendedor_codigo) {
                    return pVendedorId === currentUser.vendedor_codigo;
                } else {
                    return pVendedorNombre === currentUser.vendedor_nombre;
                }
            });
        } else {
            dateFiltered = dateFiltered.filter(p => p.operador === currentUser.username);
        }
    }

    // Luego aplicamos el filtro de vendedor (si está seleccionado alguno) para los KPIs y gráficos principales
    let filtered = dateFiltered;
    if (sellerSelectVal) {
        filtered = dateFiltered.filter(p => {
            let pSeller = p.vendedor_nombre || p.operador_vendedor_nombre;
            if (!pSeller && p.cliente_id && typeof clientesDB !== 'undefined') {
                const cli = clientesDB.find(c => c.codigo === p.cliente_id);
                if (cli) {
                    pSeller = cli.vendedor_nombre;
                }
            }
            if (!pSeller) pSeller = "Sin Vendedor";
            return pSeller === sellerSelectVal;
        });
    }

    let totalAmt = 0;
    let approvedAmt = 0;
    let pendingAmt = 0;
    let rejectedAmt = 0;

    let approvedCnt = 0;
    let pendingCnt = 0;
    let rejectedCnt = 0;

    filtered.forEach(p => {
        const amt = parseFloat(p.importe || 0.0);
        totalAmt += amt;
        
        if (p.estado === 'Aprobado' || p.estado === 'Autorizado') {
            approvedAmt += amt;
            approvedCnt++;
        } else if (p.estado === 'Pendiente de Autorización' || p.estado === 'Cargado con orden de compra' || p.estado === 'Cargado sin orden de compra') {
            pendingAmt += amt;
            pendingCnt++;
        } else if (p.estado === 'Rechazado') {
            rejectedAmt += amt;
            rejectedCnt++;
        }
    });

    // Actualizar KPIs
    document.getElementById('metric-total').innerText = filtered.length;
    document.getElementById('metric-total-amt').innerText = `$${totalAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;

    document.getElementById('metric-approved').innerText = approvedCnt;
    document.getElementById('metric-approved-amt').innerText = `$${approvedAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;

    document.getElementById('metric-pending').innerText = pendingCnt;
    document.getElementById('metric-pending-amt').innerText = `$${pendingAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;

    document.getElementById('metric-rejected').innerText = rejectedCnt;
    document.getElementById('metric-rejected-amt').innerText = `$${rejectedAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;

    // Destruir gráficos anteriores si existen
    if (chartPieInstance) chartPieInstance.destroy();
    if (chartBarInstance) chartBarInstance.destroy();

    // Gráfico de Torta (Pie)
    const ctxPie = document.getElementById('chartStatusPie');
    if (ctxPie) {
        chartPieInstance = new Chart(ctxPie, {
            type: 'pie',
            data: {
                labels: ['Aprobados', 'Retenidos', 'Rechazados'],
                datasets: [{
                    data: [approvedCnt, pendingCnt, rejectedCnt],
                    backgroundColor: ['#10b981', '#f59e0b', '#f43f5e'],
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#f8fafc' }
                    }
                }
            }
        });
    }

    // Gráfico de Barras (Bar)
    const ctxBar = document.getElementById('chartAmountBar');
    if (ctxBar) {
        chartBarInstance = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: ['Aprobados', 'Retenidos', 'Rechazados'],
                datasets: [{
                    label: 'Volumen Financiero ($)',
                    data: [approvedAmt, pendingAmt, rejectedAmt],
                    backgroundColor: ['rgba(16, 185, 129, 0.4)', 'rgba(245, 158, 11, 0.4)', 'rgba(244, 63, 94, 0.4)'],
                    borderColor: ['#10b981', '#f59e0b', '#f43f5e'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { ticks: { color: '#94a3b8' } },
                    y: { ticks: { color: '#94a3b8' } }
                }
            }
        });
    }

    // Calcular rendimiento por vendedor (basado en la fecha seleccionada)
    const sellerPerf = {};
    
    // Inicializar todos los vendedores para que aparezcan completos en la tabla
    if (typeof vendedoresDB !== 'undefined') {
        vendedoresDB.forEach(v => {
            sellerPerf[v.nombre] = {
                vendedor: v.nombre,
                pedidosAprobados: 0,
                montoAprobado: 0.0,
                pedidosTotales: 0,
                montoTotal: 0.0
            };
        });
    }
    
    dateFiltered.forEach(p => {
        let pSeller = p.vendedor_nombre;
        if (!pSeller && p.cliente_id && typeof clientesDB !== 'undefined') {
            const cli = clientesDB.find(c => c.codigo === p.cliente_id);
            if (cli) {
                pSeller = cli.vendedor_nombre;
            }
        }
        if (!pSeller) pSeller = "Sin Vendedor";
        
        if (!sellerPerf[pSeller]) {
            sellerPerf[pSeller] = {
                vendedor: pSeller,
                pedidosAprobados: 0,
                montoAprobado: 0.0,
                pedidosTotales: 0,
                montoTotal: 0.0
            };
        }
        
        const amt = parseFloat(p.importe || 0.0);
        sellerPerf[pSeller].pedidosTotales++;
        sellerPerf[pSeller].montoTotal += amt;
        
        if (p.estado === 'Aprobado' || p.estado === 'Autorizado') {
            sellerPerf[pSeller].pedidosAprobados++;
            sellerPerf[pSeller].montoAprobado += amt;
        }
    });
    
    // Renderizar la tabla de vendedores
    const sellerListBody = document.getElementById('seller-performance-list');
    if (sellerListBody) {
        sellerListBody.innerHTML = '';
        const sortedSellers = Object.values(sellerPerf).sort((a, b) => b.montoAprobado - a.montoAprobado);
        
        sortedSellers.forEach(s => {
            const tr = document.createElement('tr');
            // Resaltar la fila si coincide con el vendedor seleccionado en el filtro
            if (sellerSelectVal && s.vendedor === sellerSelectVal) {
                tr.style.background = 'rgba(6, 182, 212, 0.15)';
                tr.style.borderLeft = '4px solid var(--primary)';
            }
            tr.innerHTML = `
                <td><strong>${s.vendedor}</strong></td>
                <td style="text-align: right; font-family: monospace;">${s.pedidosAprobados}</td>
                <td style="text-align: right; font-family: monospace; font-weight: bold; color: var(--success);">$${s.montoAprobado.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: right; font-family: monospace;">${s.pedidosTotales}</td>
                <td style="text-align: right; font-family: monospace; color: var(--text-muted);">$${s.montoTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
            `;
            sellerListBody.appendChild(tr);
        });
    }
}

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

    // Si el usuario es Solicitante, restringir
    if (currentUser && currentUser.role === 'Solicitante') {
        if (currentUser.vendedor_nombre) {
            dateFiltered = dateFiltered.filter(p => {
                const pVendedorId = p.vendedor_id || p.operador_vendedor_id || '';
                const pVendedorNombre = p.vendedor_nombre || p.operador_vendedor_nombre || '';
                if (currentUser.vendedor_codigo) {
                    return pVendedorId === currentUser.vendedor_codigo;
                } else {
                    return pVendedorNombre === currentUser.vendedor_nombre;
                }
            });
        } else {
            dateFiltered = dateFiltered.filter(p => p.operador === currentUser.username);
        }
    }
    
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
                badge.innerText = 'HABILITADO';
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

// Permisos y Matriz de Sistema por Usuario
window.cargarPermisosParaUsuario = function(username) {
    if (!username) {
        const sel = document.getElementById('config-permisos-user-select');
        if (sel && sel.value) username = sel.value;
        else username = (appData.users && appData.users[0]) ? appData.users[0].username : 'mel';
    }
    if (!appData) appData = {};
    if (!appData.userPermissions) {
        appData.userPermissions = {};
    }
    
    const feedbackBanner = document.getElementById('permisos-save-feedback-banner');
    if (feedbackBanner) feedbackBanner.style.display = 'none';

    const u = (appData.users || []).find(x => x.username === username);
    const nameEl = document.getElementById('summary-perm-username');
    const roleEl = document.getElementById('summary-perm-role');
    const rubroEl = document.getElementById('summary-perm-rubro');
    const emailEl = document.getElementById('summary-perm-email');
    
    if (nameEl) nameEl.innerText = username || '-';
    if (roleEl) roleEl.innerText = u ? (u.role || 'Usuario') : (username === 'mel' ? 'Administrador' : 'Usuario');
    if (rubroEl) rubroEl.innerText = (u && u.rubro_defecto === 'Mecánico') ? '⚙️ Mecánico' : '⚡ Eléctrico';
    if (emailEl) emailEl.innerText = u ? (u.email || 'Sin email') : '-';

    let perms = appData.userPermissions[username];
    if (!perms) {
        perms = ((u && u.role === 'Administrador') || username === 'mel') 
            ? allAvailableModules.map(m => m.id) 
            : ['menu-ingresar', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-all'];
    }
    
    document.querySelectorAll('.perm-checkbox').forEach(cb => {
        cb.checked = perms.includes(cb.value);
    });

    if (typeof window.onPermisoCheckboxChange === 'function') {
        window.onPermisoCheckboxChange();
    }
};

window.seleccionarTodosPermisos = function(state) {
    document.querySelectorAll('.perm-checkbox').forEach(cb => {
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

    appData.userPermissions[username] = selected;
    saveData();

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
    
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.username === username) {
        buildSidebar();
    }
    
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
                const optText = `${u.username}${vendedorStr}${rubroStr} (${u.email || 'Sin email'}) - [${u.role}]`;
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
            } else {
                const editFormEl = document.getElementById('edit-user-form');
                if (editFormEl) editFormEl.reset();
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
                            appData.users = appData.users.filter(u => u.id !== user.id);
                            saveData();
                            showToast(`Usuario ${user.username} eliminado.`, 'success');
                            renderUsers();
                            window.fillPermissionsUserSelect();
                        } else {
                            showToast('Eliminación cancelada.', 'error');
                        }
                        deleteSelect.value = '';
                        if (deleteSelect.onchange) deleteSelect.onchange({ target: { value: '' }});
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

            saveData();
            showToast('Credenciales actualizadas exitosamente.', 'success');
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

            appData.users.push({
                id: generateId(),
                username,
                password,
                email,
                role: 'Solicitante',
                rubro_defecto,
                vendedor_codigo: '',
                vendedor_nombre: ''
            });
            
            saveData();
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

// --- LOGOUT Y LOGIN ---

// Función global de login — vinculada desde HTML (onclick) y desde startApp
window.ejecutarLoginDirecto = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();

    var userInput = document.getElementById('username');
    var passInput = document.getElementById('password');
    var userVal = userInput ? userInput.value.trim().toLowerCase() : '';
    var passVal = passInput ? passInput.value.trim() : '';

    if (!userVal) {
        showToast('Por favor ingrese su nombre de usuario', 'warning');
        return;
    }

    if (!appData) appData = { users: [], pedidos: [], notifications: [] };
    if (!Array.isArray(appData.users) || appData.users.length === 0) {
        appData.users = defaultData.users.slice();
    }

    var found = appData.users.find(function(u) {
        return String(u.username).trim().toLowerCase() === userVal;
    });

    if (!found) {
        // Permitir autoregistro o ingreso si es usuario nuevo
        found = {
            id: generateId(),
            username: userVal,
            password: passVal || '123',
            email: userVal + '@sgmontajes.com.ar',
            role: 'Solicitante',
            rubro_defecto: 'Eléctrico',
            vendedor_codigo: '',
            vendedor_nombre: ''
        };
        appData.users.push(found);
    }

    if (found.role === 'Congelado') {
        showToast('Tu cuenta está congelada. Contactá al administrador.', 'error');
        return;
    }

    if (found.password && passVal && String(found.password).trim() !== passVal) {
        showToast('Contraseña incorrecta para el usuario "' + found.username + '".', 'error');
        return;
    }

    appData.currentUserId = String(found.id);
    try { localStorage.setItem('pedidos_current_user_id', String(found.id)); } catch(err) {}
    saveData();

    reqTipoPresupuesto = found.rubro_defecto || 'Eléctrico';

    showToast('¡Bienvenido, ' + found.username + '!', 'success');
    switchView('main');
    buildSidebar();
    renderNotifications();
    if (window.checkScheduledOcAlerts) window.checkScheduledOcAlerts();

    if (userInput) userInput.value = '';
    if (passInput) passInput.value = '';
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

    // Verificar sesión guardada
    var savedUserId = null;
    try { savedUserId = localStorage.getItem('pedidos_current_user_id'); } catch(e) {}

    var userFound = savedUserId && appData.users.find(function(u) { return u.id === savedUserId; });

    if (!userFound || ['admin', 'aut', 'sol'].includes(String(userFound.username).trim().toLowerCase())) {
        // Asignar primer usuario por defecto
        userFound = appData.users[0];
        savedUserId = userFound ? userFound.id : null;
        try { if (savedUserId) localStorage.setItem('pedidos_current_user_id', savedUserId); } catch(e) {}
    }

    if (userFound) {
        appData.currentUserId = savedUserId;
        reqTipoPresupuesto = userFound.rubro_defecto || 'Eléctrico';
        switchView('main');
        buildSidebar();
        renderNotifications();
        if (window.checkScheduledOcAlerts) window.checkScheduledOcAlerts();
    } else {
        switchView('login');
    }

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
            if (confirm('¿Estás seguro de que deseas restablecer la aplicación? Esto borrará todos los pedidos ingresados localmente.')) {
                try {
                    localStorage.removeItem(LOCAL_STATE_KEY);
                    localStorage.removeItem('pedidos_current_user_id');
                    if (window.firebase && db) {
                        db.collection('state').doc('globalData').set({
                            pedidos: defaultData.pedidos,
                            users: defaultData.users,
                            notifications: defaultData.notifications
                        });
                    }
                } catch(err) {}
                showToast('Aplicación restablecida. Recargando...', 'success');
                setTimeout(function() { window.location.reload(); }, 1000);
            }
        };
    }
}

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
