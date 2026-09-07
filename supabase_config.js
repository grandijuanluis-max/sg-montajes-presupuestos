// ====================================================================
// CONFIGURACIÓN DE SUPABASE — SG MONTAJES SRL
// ====================================================================

// Valores por defecto (pueden ser reemplazados aquí o desde localStorage)
const DEFAULT_SUPABASE_URL = "https://amkkuwgatjcbiyrykuoy.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_I5bemh3YRuiTNkMzWyCA3A_D_aqFlNJ";

// Clave en localStorage para permitir configurar credenciales dinámicamente si se desea
const SUPABASE_CONFIG_STORAGE_KEY = 'sg_supabase_config';

function getSupabaseConfig() {
    try {
        const stored = localStorage.getItem(SUPABASE_CONFIG_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.url && parsed.anonKey) {
                return parsed;
            }
        }
    } catch (e) {
        console.warn("Error leyendo supabase config de localStorage:", e);
    }
    return {
        url: window.SUPABASE_CUSTOM_URL || DEFAULT_SUPABASE_URL,
        anonKey: window.SUPABASE_CUSTOM_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
    };
}

function saveSupabaseConfig(url, anonKey) {
    try {
        localStorage.setItem(SUPABASE_CONFIG_STORAGE_KEY, JSON.stringify({
            url: url.trim(),
            anonKey: anonKey.trim()
        }));
        return true;
    } catch (e) {
        console.error("Error guardando supabase config:", e);
        return false;
    }
}

// Inicializar cliente global de Supabase
var supabaseClient = null;

function initSupabaseClient() {
    const sdk = (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') 
        ? window.supabase 
        : (typeof supabase !== 'undefined' && supabase && typeof supabase.createClient === 'function' ? supabase : null);

    if (!sdk || typeof sdk.createClient !== 'function') {
        console.warn("Supabase SDK no está disponible en window.supabase.");
        return null;
    }
    const config = getSupabaseConfig();
    if (!config.url || !config.anonKey || config.url.includes("your-project")) {
        console.warn("Supabase no configurado con credenciales válidas.");
        return null;
    }
    try {
        if (!supabaseClient) {
            supabaseClient = sdk.createClient(config.url, config.anonKey, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true
                },
                realtime: {
                    params: {
                        eventsPerSecond: 10
                    }
                }
            });
        }
        window.supabaseDb = supabaseClient;
        return supabaseClient;
    } catch (e) {
        console.error("Error inicializando cliente Supabase:", e);
        return null;
    }
}

window.getSupabaseConfig = getSupabaseConfig;
window.saveSupabaseConfig = saveSupabaseConfig;
window.initSupabaseClient = initSupabaseClient;
