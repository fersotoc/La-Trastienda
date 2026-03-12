import { User, Transaction, LoadLog, RestaurantCut } from "../types";

const API_BASE = ""; // Use local server
const FN_BASE = "/api";
const NGROK_HEADERS = {}; 

// Mentidero / La Quietecita (GAS V15)
const GAS_BASE =
  "https://script.google.com/macros/s/AKfycby_RN3TyYySCrpdh4tCptg5oaO6bBdtc8HE1Wqa5m2ob4OP2_qAE2XKuPDIkOnQuspa/exec";

// Boletópolis (si es OTRO script, déjalo aquí)
const BOLETOPOLIS_GAS_BASE =
  "https://script.google.com/macros/s/AKfycby_RN3TyYySCrpdh4tCptg5oaO6bBdtc8HE1Wqa5m2ob4OP2_qAE2XKuPDIkOnQuspa/exec";

/**
 * Firebase/ngrok fetch (ojo: esto requiere CORS correcto del lado Firebase)
 */
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${FN_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...NGROK_HEADERS,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error (${response.status}): ${errorText || response.statusText}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) return await response.json();
  return (await response.text()) as unknown as T;
}

/**
 * GAS GET helper
 */
async function gasGet<T>(
  baseUrl: string,
  params: Record<string, string | number>
): Promise<T> {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GAS Error (${response.status}): ${errorText || response.statusText}`);
  }
  return await response.json();
}

export const apiService = {
  // Users (Local Storage)
  getUsers: () => apiFetch<User[]>("/users"),
  createUser: (user: Omit<User, "id">) =>
    apiFetch<User>("/users", { method: "POST", body: JSON.stringify(user) }),
  updateUser: (id: string, user: Partial<User>) =>
    apiFetch<User>(`/users?id=${id}`, { method: "POST", body: JSON.stringify(user) }),

  // Transactions (Mentidero / La Quietecita desde GAS)
  getTransactions: async (): Promise<any[]> => {
    const res: any = await gasGet(GAS_BASE, { action: "transactions", limit: 500 });
    if (!res?.ok) throw new Error(res?.error || "GAS ok:false");
    return Array.isArray(res.data) ? res.data : [];
  },

  // estas siguen en Local Storage (si las usas para guardar ahí)
  createTransactions: (transactions: Transaction[]) =>
    apiFetch<{ success: boolean }>("/transactions", {
      method: "POST",
      body: JSON.stringify({ transactions }),
    }),
  deleteTransaction: (id: string) =>
    apiFetch<{ success: boolean }>(`/transactions?id=${id}`, { method: "DELETE" }),

  // Load Logs (Local Storage)
  getLoadLogs: () => apiFetch<LoadLog[]>("/loadLogs"),
  createLoadLog: (log: LoadLog) =>
    apiFetch<{ success: boolean }>("/loadLogs", { method: "POST", body: JSON.stringify(log) }),
  updateLoadLog: (id: string, log: Partial<LoadLog>) =>
    apiFetch<{ success: boolean }>(`/updateLoadLog?id=${id}`, {
      method: "POST",
      body: JSON.stringify(log),
    }),

  // Cuts (Local Storage)
  getCuts: () => apiFetch<RestaurantCut[]>("/cuts"),
  createCut: (cut: RestaurantCut) =>
    apiFetch<{ success: boolean }>("/cuts", { method: "POST", body: JSON.stringify(cut) }),

  // Boletópolis (si es otro GAS, aquí)
  fetchBoletopolisTransactions: async () => {
    const res: any = await gasGet(BOLETOPOLIS_GAS_BASE, { action: "transactions", limit: 100 });
    if (!res?.ok) throw new Error(res?.error || "Boletopolis ok:false");
    return res.data || [];
  },

  fetchBoletopolis: async () => {
    const res: any = await gasGet(BOLETOPOLIS_GAS_BASE, { action: "transactions", limit: 500 });
    if (!res?.ok) throw new Error(res?.error || "Boletopolis ok:false");
    const rows = res.data || [];
    if (!Array.isArray(rows) || rows.length === 0) throw new Error("No hay transacciones Boletópolis");
    return rows;
  },

  scanBoletopolisInputs: async () => {
    // si tu script realmente soporta POST scan, apunta al BOLETOPOLIS_GAS_BASE
    const response = await fetch(BOLETOPOLIS_GAS_BASE, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "scan" }),
    });
    if (!response.ok) throw new Error("Error al escanear inputs de Boletópolis");
    return await response.json();
  },

  ingestQueuedBoletopolis: async () => {
    const response = await fetch(BOLETOPOLIS_GAS_BASE, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "ingestQueued" }),
    });
    if (!response.ok) throw new Error("Error al ingerir transacciones de Boletópolis");
    return await response.json();
  },

  processQuietecitaInputs: async () => {
    const response = await fetch(GAS_BASE, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "processQuietecita" }),
    });
    if (!response.ok) throw new Error("Error al procesar inputs de Quietecita");
    return await response.json();
  },

  // Boletópolis Server Endpoints
  getBoletopolisInbox: (modulo: string) => fetch(`/api/boletopolis/inbox?modulo=${encodeURIComponent(modulo)}`).then(r => r.json()),
  processBoletopolisFile: (filename: string) => 
    fetch("/api/boletopolis/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename })
    }).then(r => r.json()),

  // New GAS-based methods for Data Ingestion
  getInboxStatus: async (module: 'mentidero' | 'quietecita', type?: 'ventas' | 'compras') => {
    const params: any = { action: "inbox_status", module };
    if (type) params.type = type;
    return await gasGet<any>(GAS_BASE, params);
  },

  processInbox: async (module: 'mentidero' | 'quietecita', type?: 'ventas' | 'compras') => {
    const params: any = { action: "process_inbox", module };
    if (type) params.type = type;
    return await gasGet<any>(GAS_BASE, params);
  },

  getGASLoadLog: async (module: 'mentidero' | 'quietecita', limit: number = 10, type?: 'ventas' | 'compras') => {
    const params: any = { action: "load_log", module, limit };
    if (type) params.type = type;
    return await gasGet<any>(GAS_BASE, params);
  },

  getHealth: async () => {
    return await gasGet<any>(GAS_BASE, { action: "health" });
  },

  // Health check (Firebase/ngrok)
  ping: () => apiFetch<string>("/ping"),
};