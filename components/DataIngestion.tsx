
import React, { useState, useEffect } from 'react';
import { BusinessSource } from '../types';
import { apiService } from '../services/apiService';

interface InboxFile {
  name: string;
  size?: number;
  createdTime?: string;
}

interface GASLoadLog {
  timestamp: string;
  archivo: string;
  estado: string;
  filas: number | string;
  detalle: string;
}

const DataIngestion: React.FC = () => {
  const [modulo, setModulo] = useState<'mentidero' | 'quietecita'>('mentidero');
  const [tipo, setTipo] = useState<'ventas' | 'compras'>('ventas');
  const [inboxFiles, setInboxFiles] = useState<InboxFile[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [logs, setLogs] = useState<GASLoadLog[]>([]);
  
  const fechaOperativa = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // Reset tipo to ventas if switching to mentidero
    if (modulo === 'mentidero') {
      setTipo('ventas');
    }
    fetchData();
  }, [modulo, tipo]);

  const fetchData = async () => {
    setLoadingInbox(true);
    try {
      // Fetch Inbox Status
      const inboxRes = await apiService.getInboxStatus(modulo, modulo === 'quietecita' ? tipo : undefined);
      
      if (inboxRes?.ok && Array.isArray(inboxRes.files)) {
        setInboxFiles(inboxRes.files);
      } else {
        setInboxFiles([]);
      }

      // Fetch Load Logs
      const logsRes = await apiService.getGASLoadLog(modulo, 10, modulo === 'quietecita' ? tipo : undefined);
      if (logsRes?.ok && Array.isArray(logsRes.rows)) {
        // Ensure rows are ordered by timestamp descending
        const sortedLogs = [...logsRes.rows].sort((a, b) => {
          const dateA = new Date(a.timestamp).getTime();
          const dateB = new Date(b.timestamp).getTime();
          return dateB - dateA;
        });
        setLogs(sortedLogs);
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setLogs([]);
      setInboxFiles([]);
    } finally {
      setLoadingInbox(false);
    }
  };

  const handleProcess = async () => {
    if (inboxFiles.length === 0) return;
    
    setProcessing(true);
    try {
      const result = await apiService.processInbox(modulo, modulo === 'quietecita' ? tipo : undefined);
      
      if (result?.ok) {
        // Refresh data after processing
        await fetchData();
      } else {
        alert(`Error al procesar: ${result?.error || 'Error desconocido'}`);
      }
    } catch (err: any) {
      console.error("Error processing files:", err);
      alert(`Error de red: ${err.message || 'Fallo en proceso'}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-6">
      {/* 1. HEADER */}
      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-8">
          <div className="space-y-1">
            <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest ml-1">Módulo activo</label>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button 
                onClick={() => setModulo('mentidero')}
                className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${modulo === 'mentidero' ? 'bg-white text-mentidero-emerald shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Mentidero
              </button>
              <button 
                onClick={() => setModulo('quietecita')}
                className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${modulo === 'quietecita' ? 'bg-white text-mentidero-emerald shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Quietecita
              </button>
            </div>
          </div>
        </div>

        {modulo === 'quietecita' && (
          <div className="space-y-1">
            <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest ml-1">Tipo de archivo</label>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button 
                onClick={() => setTipo('ventas')}
                className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${tipo === 'ventas' ? 'bg-white text-mentidero-emerald shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Ventas
              </button>
              <button 
                onClick={() => setTipo('compras')}
                className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${tipo === 'compras' ? 'bg-white text-mentidero-emerald shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Compras
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest ml-1">Fecha operativa</label>
          <div className="bg-gray-50 border border-gray-100 px-6 py-2.5 rounded-xl text-[11px] font-mono font-bold text-mentidero-textDark">
            {fechaOperativa}
          </div>
        </div>
      </div>

      {/* 2. ARCHIVOS EN INBOX */}
      <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-mentidero-emerald"></div>
        
        <div className="mb-10 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-serif font-bold text-mentidero-textDark tracking-tight">Archivos en Inbox</h2>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.4em] mt-1">Monitor de archivos pendientes</p>
          </div>
          <button 
            onClick={fetchData} 
            disabled={loadingInbox}
            className="text-mentidero-emerald hover:rotate-180 transition-transform duration-500 disabled:opacity-30 p-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </button>
        </div>

        <div className="space-y-8">
          <div className="bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${inboxFiles.length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-gray-300'}`}></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  {loadingInbox ? 'Escaneando...' : inboxFiles.length === 0 ? 'Inbox vacío' : `${inboxFiles.length} ${inboxFiles.length === 1 ? 'archivo pendiente' : 'archivos pendientes'}`}
                </span>
              </div>
            </div>

            {inboxFiles.length > 0 && (
              <div className="space-y-3 mb-8">
                {inboxFiles.map((file) => (
                  <div key={file.name} className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-mentidero-emerald">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-mentidero-textDark">{file.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button 
              onClick={handleProcess}
              disabled={inboxFiles.length === 0 || processing}
              className={`w-full py-6 rounded-[1.5rem] text-[12px] font-bold uppercase tracking-[0.3em] transition-all duration-500 ${
                inboxFiles.length > 0 && !processing
                ? 'bg-mentidero-emerald text-white shadow-lg shadow-emerald-200 hover:scale-[1.02] active:scale-[0.98]' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {processing ? 'Procesando...' : 'PROCESAR ARCHIVOS'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. LOG DE PROCESAMIENTO */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-10 py-8 border-b border-gray-50 flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400 border-l-4 border-mentidero-emerald pl-4">Log de procesamiento</h3>
          <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Últimas 10 ejecuciones</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Archivo</th>
                <th className="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Estado</th>
                <th className="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Filas</th>
                <th className="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-[10px] font-mono text-gray-400 whitespace-nowrap">{log.timestamp}</td>
                  <td className="px-6 py-4 text-[10px] font-bold text-mentidero-textDark max-w-[200px] truncate">{log.archivo}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                      log.estado.toLowerCase().includes('error') || log.estado.toLowerCase().includes('fallo')
                      ? 'bg-red-50 text-red-500 border-red-100' 
                      : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    }`}>
                      {log.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[10px] font-bold text-gray-500">{log.filas}</td>
                  <td className="px-6 py-4 text-[10px] text-gray-400 max-w-[250px] truncate">{log.detalle}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <p className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.3em]">No hay actividad reciente</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataIngestion;
