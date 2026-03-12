
import React, { useMemo, useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { SaleRecord } from '../types';

interface CommercialConsoleProps {
  records: SaleRecord[];
}

type Period = 'today' | 'last7' | 'month' | 'range';

const CommercialConsole: React.FC<CommercialConsoleProps> = ({ records }) => {
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [period, setPeriod] = useState<Period>('range');
  const [customRange, setCustomRange] = useState({ start: '2025-02-01', end: '2026-03-11' });
  
  const [mentideroData, setMentideroData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
  const fetchData = async () => {
    setIsLoading(true);
    try {

      let url = 'https://script.google.com/macros/s/AKfycbxd_KsYSPin8296woNE4v3UBJzNh-TX4-NcojjuFpSZ9ddSBLOGs4j9DNh6XWbA7vo6/exec?action=mentidero_funciones&period=' + period;

      if (period === 'range' && customRange.start && customRange.end) {
        url += `&from=${customRange.start}&to=${customRange.end}`;
      }

      url += `&funcion=${encodeURIComponent(selectedEvent || '')}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();

      setMentideroData(data);

    } catch (error) {
      console.error("Error fetching Mentidero dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  fetchData();
}, [period, customRange, selectedEvent]);

  // Current date for filtering (based on provided local time: 2026-02-26)
  const TODAY = '2026-02-26';

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'income', direction: 'desc' });

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-gray-100 pb-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-serif font-bold text-mentidero-textDark tracking-[0.1em] uppercase">
            {selectedEvent === '' ? 'Resumen Consolidado' : (mentideroData?.funcion_actual?.funcion || 'Consola Comercial')}
          </h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {selectedEvent === '' ? 'Todas las funciones en el periodo' : (mentideroData?.funcion_actual?.fecha_funcion || 'Cargando...')}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-6">
          {/* Event Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Función</label>
            <select 
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="bg-white border border-gray-200 rounded-sm px-3 py-2 text-[10px] font-bold uppercase tracking-wider focus:outline-none focus:border-mentidero-emerald min-w-[180px]"
            >
              <option value="">Todas las funciones</option>
              {(mentideroData?.funciones_disponibles || []).map((f: any, idx: number) => (
                <option key={idx} value={f.funcion}>
                  {f.funcion}
                </option>
              ))}
            </select>
            
            {/* Debug Block - Temporary */}
       
          </div>

          {/* Period Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Periodo</label>
            <div className="flex bg-gray-50 p-1 rounded-sm border border-gray-100">
              {(['today', 'last7', 'month', 'range'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all rounded-sm ${
                    period === p 
                      ? 'bg-white text-mentidero-emerald shadow-sm' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {p === 'today' ? 'Hoy' : p === 'last7' ? '7 Días' : p === 'month' ? 'Mes' : 'Rango'}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Range Inputs */}
          {period === 'range' && (
            <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Desde</label>
                <input 
                  type="date" 
                  value={customRange.start}
                  onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                  className="bg-white border border-gray-200 rounded-sm px-2 py-1.5 text-[10px] font-bold focus:outline-none focus:border-mentidero-emerald"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Hasta</label>
                <input 
                  type="date" 
                  value={customRange.end}
                  onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                  className="bg-white border border-gray-200 rounded-sm px-2 py-1.5 text-[10px] font-bold focus:outline-none focus:border-mentidero-emerald"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPI 
          label="Ingreso Total" 
          value={mentideroData?.summary?.ingreso_total || 0} 
          isCurrency 
          color="text-mentidero-emerald" 
          bg="bg-mentidero-emerald/5"
          border="border-mentidero-emerald/20"
        />
        <KPI 
          label="Promedio por Función" 
          value={mentideroData?.summary?.promedio_por_funcion || 0} 
          isCurrency 
          color="text-indigo-600" 
          bg="bg-indigo-50"
          border="border-indigo-100"
        />
        <KPI 
          label="Promedio por Temporada" 
          value={mentideroData?.summary?.promedio_por_temporada || 0} 
          isCurrency 
          color="text-amber-600" 
          bg="bg-amber-50"
          border="border-amber-100"
        />
        <KPI 
          label="Total de Funciones" 
          value={mentideroData?.summary?.total_funciones || 0} 
          color="text-gray-900" 
          bg="bg-gray-50"
          border="border-gray-200"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-8 border border-gray-100 rounded-sm shadow-sm">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-8 text-gray-400 border-l-4 border-mentidero-emerald pl-4">Tendencia de Ingresos por Función</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mentideroData?.ingresos_por_funcion || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis 
                  dataKey="fecha_funcion" 
                  tick={{fontSize: 9, fill: '#9CA3AF'}} 
                  axisLine={false} 
                  tickLine={false}
                />
                <YAxis 
                  tick={{fontSize: 9, fill: '#9CA3AF'}} 
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip 
                  contentStyle={{borderRadius: '4px', border: '1px solid #E5E7EB', fontSize: '10px', fontWeight: 'bold'}}
                  formatter={(value: any) => [new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)]}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  iconType="circle"
                  wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: '20px' }}
                />
                <Line 
                  name="Ingreso Total"
                  type="monotone" 
                  dataKey="ingreso_total" 
                  stroke="#059669" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#059669', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary / Stats */}
        <div className="bg-white p-8 border border-gray-100 rounded-sm shadow-sm flex flex-col justify-center">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-8 text-gray-400 border-l-4 border-orange-500 pl-4">Resumen del Periodo</h3>
          <div className="space-y-6">
            <div className="flex justify-between items-end border-b border-gray-50 pb-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Promedio Diario</span>
              <span className="text-lg font-serif font-bold text-mentidero-textDark">
                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(mentideroData?.summary?.ingreso_total || 0)}
              </span>
            </div>
            <div className="flex justify-between items-end border-b border-gray-50 pb-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Promedio por Función</span>
                <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Funciones en el periodo: {mentideroData?.summary?.total_funciones || 0}</span>
              </div>
              <span className="text-lg font-serif font-bold text-mentidero-textDark">
                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(mentideroData?.summary?.promedio_por_funcion || 0)}
              </span>
            </div>
            <div className="flex justify-between items-end border-b border-gray-50 pb-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Promedio por Temporada</span>
              <span className="text-lg font-serif font-bold text-mentidero-emerald">
                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(mentideroData?.summary?.promedio_por_temporada || 0)}
              </span>
            </div>
            <div className="flex justify-between items-end border-b border-gray-50 pb-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total de Funciones</span>
              <span className="text-lg font-serif font-bold text-indigo-600">
                {mentideroData?.summary?.total_funciones || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grouped Table */}
      <div className="bg-white border border-gray-200 rounded-sm overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-mentidero-black">Resumen por Función</h3>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total Funciones: {mentideroData?.ingresos_por_funcion?.length || 0}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-white">
              <tr>
                <th className="px-8 py-4 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">Función (Fecha)</th>
                <th className="px-8 py-4 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">Obra</th>
                <th className="px-8 py-4 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">Temporada</th>
                <th className="px-8 py-4 text-right text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ingreso Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {(mentideroData?.ingresos_por_funcion || []).map((g: any, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-4">
                    <div className="text-[10px] font-bold text-mentidero-textDark uppercase">{g.funcion}</div>
                    <div className="text-[8px] font-mono text-gray-400 mt-0.5">{g.fecha_funcion}</div>
                  </td>
                  <td className="px-8 py-4 text-[10px] font-medium text-gray-600">{g.obra}</td>
                  <td className="px-8 py-4 text-[10px] font-medium text-gray-600">{g.temporada}</td>
                  <td className="px-8 py-4 text-right text-[10px] font-bold text-mentidero-textDark">
                    {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(g.ingreso_total)}
                  </td>
                </tr>
              ))}
              {(!mentideroData?.ingresos_por_funcion || mentideroData.ingresos_por_funcion.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center italic text-gray-400 text-[10px] uppercase tracking-widest">
                    No hay datos de funciones disponibles para el periodo seleccionado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detalle de Transacciones (Opcional - Oculto si no hay datos) */}
      
    </div>
  );
};

const KPI = ({ label, value, isCurrency, color, bg, border }: any) => (
  <div className={`p-6 rounded-sm border ${border} ${bg}`}>
    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
    <p className={`text-2xl font-serif font-bold ${color}`}>
      {isCurrency 
        ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
        : value
      }
    </p>
  </div>
);

export default CommercialConsole;
