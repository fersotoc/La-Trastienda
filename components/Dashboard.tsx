import React, { useMemo, useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, ComposedChart
} from 'recharts';
import { SaleRecord, QuietecitaPurchase, QuietecitaCorteMaster } from '../types';
import { pingBackend, testWriteBackend } from '../services/geminiService';

interface DashboardProps {
  records: SaleRecord[];
  filterSource?: string;
  purchases?: QuietecitaPurchase[];
  cortesMaster?: QuietecitaCorteMaster[];
}

const COLORS = ['#059669', '#4B5563', '#9CA3AF', '#1F2937', '#10B981'];

type Period = 'today' | 'last7' | 'month' | 'range';

const Dashboard: React.FC<DashboardProps> = ({ records, filterSource, purchases = [], cortesMaster = [] }) => {
  const [period, setPeriod] = useState<Period>('range');
  const [customRange, setCustomRange] = useState({ start: '2025-12-27', end: '2026-03-11' });
  const [selectedTurnId, setSelectedTurnId] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [chartView, setChartView] = useState<'ingresos' | 'compras' | 'resultado'>('ingresos');
  const [tableView, setTableView] = useState<'ventas' | 'compras'>('ventas');

  const [quietecitaData, setQuietecitaData] = useState<{
    summary: { ingresos: number, compras: number, resultado: number },
    seriesByDay: any[],
    ventas: any[],
    compras_detalle: any[]
  } | null>(null);
  const [isLoadingQuietecita, setIsLoadingQuietecita] = useState(false);

  const [panelData, setPanelData] = useState<any>(null);
  const [isLoadingPanel, setIsLoadingPanel] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const action = filterSource === 'La Quietecita' ? 'quietecita_dashboard' : (!filterSource ? 'panel_dashboard' : null);
      if (!action) return;

      const loadingSetter = filterSource === 'La Quietecita' ? setIsLoadingQuietecita : setIsLoadingPanel;
      const dataSetter = filterSource === 'La Quietecita' ? setQuietecitaData : setPanelData;

      loadingSetter(true);
      try {
        let url = `https://script.google.com/macros/s/AKfycby_RN3TyYySCrpdh4tCptg5oaO6bBdtc8HE1Wqa5m2ob4OP2_qAE2XKuPDIkOnQuspa/exec?action=${action}&period=${period}`;
        
        if (period === 'range' && customRange.start && customRange.end) {
          url += `&from=${customRange.start}&to=${customRange.end}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        dataSetter(data);
      } catch (error) {
        console.error(`Error fetching ${action}:`, error);
      } finally {
        loadingSetter(false);
      }
    };
    fetchData();
  }, [filterSource, period, customRange]);

  const sameSource = (a: any, b: any) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

  const getDateRange = (p: Period) => {
    const now = new Date('2026-02-27T09:52:06-08:00');
    const start = new Date(now);
    const end = new Date(now);

    if (p === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (p === 'last7') {
      start.setDate(now.getDate() - 7);
    } else if (p === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else if (p === 'range') {
      return { 
        start: customRange.start ? new Date(customRange.start) : null, 
        end: customRange.end ? new Date(customRange.end) : null 
      };
    }

    return { start, end };
  };

  const isWithinRange = (dateStr: string, range: { start: Date | null, end: Date | null }) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    if (range.start && d < range.start) return false;
    if (range.end && d > range.end) return false;
    return true;
  };

  const range = useMemo(() => getDateRange(period), [period, customRange]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => isWithinRange(p.fecha_reporte, range));
  }, [purchases, range]);

  const filteredCortes = useMemo(() => {
    return cortesMaster.filter(c => {
      const inRange = isWithinRange(c.fecha_inicio_corte, range);
      const turnMatch = selectedTurnId === 'all' || c.id_turno === selectedTurnId;
      return inRange && turnMatch;
    });
  }, [cortesMaster, range, selectedTurnId]);

  const quietecitaKPIs = useMemo(() => {
    if (filterSource !== 'La Quietecita' || !quietecitaData) return null;

    const { summary, seriesByDay, ventas, compras_detalle } = quietecitaData;

    return { 
      summary,
      seriesByDay: seriesByDay || [],
      ventas: ventas || [],
      compras_detalle: compras_detalle || []
    };
  }, [filterSource, quietecitaData]);

  const filteredRecords = useMemo(() => {
    let filtered = filterSource ? records.filter(r => sameSource(r.source, filterSource)) : records;
    filtered = filtered.filter(r => isWithinRange(r.date, range));
    return filtered;
  }, [records, filterSource, range]);

  const turnOptions = useMemo(() => {
    const ids = Array.from(new Set(cortesMaster.map(c => c.id_turno))).filter(Boolean);
    return ids.sort();
  }, [cortesMaster]);

  const boletopolisTransactions = useMemo(() => {
    return filteredRecords.filter(r => sameSource(r.source, 'Boletópolis'));
  }, [filteredRecords]);

  const sortedDailySummary = useMemo(() => {
    if (!quietecitaKPIs || !quietecitaKPIs.dailyTrend) return [];
    let items = [...quietecitaKPIs.dailyTrend];
    if (sortConfig !== null) {
      items.sort((a: any, b: any) => {
        const valA = sortConfig.key === 'fecha' ? a.fecha : a[sortConfig.key];
        const valB = sortConfig.key === 'fecha' ? b.fecha : b[sortConfig.key];
        if (valA < valB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return items;
  }, [quietecitaKPIs, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const stats = useMemo(() => {
    // Normalize records for PANEL: Treat Boletópolis as Mentidero to avoid duplication
    const normalizedRecords = filteredRecords.map(r => ({
      ...r,
      source: sameSource(r.source, 'Boletópolis') ? 'Mentidero' : r.source
    }));

    const mentideroTotal = normalizedRecords.filter(r => sameSource(r.source, 'Mentidero')).reduce((sum, r) => sum + r.amount, 0);
    const quietecitaIngresos = normalizedRecords.filter(r => sameSource(r.source, 'La Quietecita')).reduce((sum, r) => sum + r.amount, 0);
    const quietecitaCompras = filteredPurchases.reduce((sum, p) => sum + (p.importe || 0), 0);
    const ingresosNetos = mentideroTotal + quietecitaIngresos - quietecitaCompras;
    
    const groupedByDateMap = normalizedRecords.reduce((acc: any, r) => {
      acc[r.date] = acc[r.date] || { date: r.date, Mentidero: 0, 'La Quietecita': 0, compras: 0, netos: 0 };
      if (sameSource(r.source, 'Mentidero')) acc[r.date].Mentidero += r.amount;
      if (sameSource(r.source, 'La Quietecita')) acc[r.date]['La Quietecita'] += r.amount;
      return acc;
    }, {});

    // Add purchases to groupedByDateMap
    filteredPurchases.forEach(p => {
      const date = p.fecha_reporte;
      if (!date) return;
      groupedByDateMap[date] = groupedByDateMap[date] || { date, Mentidero: 0, 'La Quietecita': 0, compras: 0, netos: 0 };
      groupedByDateMap[date].compras += (p.importe || 0);
    });

    // Calculate netos for each date
    Object.keys(groupedByDateMap).forEach(date => {
      const row = groupedByDateMap[date];
      row.netos = row.Mentidero + row['La Quietecita'] - row.compras;
    });

    const groupedByDate = Object.values(groupedByDateMap).sort((a: any, b: any) => a.date.localeCompare(b.date));

    const categoryData = [
      { name: 'Mentidero', value: mentideroTotal },
      { name: 'La Quietecita', value: quietecitaIngresos }
    ];

    const mentideroOnline = normalizedRecords
      .filter(r => sameSource(r.source, 'Mentidero') && (
        String(r.paymentType || "").toLowerCase().includes('visa') || 
        String(r.paymentType || "").toLowerCase().includes('mastercard') || 
        String(r.paymentType || "").toLowerCase().includes('amex')
      ))
      .reduce((sum, r) => sum + r.amount, 0);

    const mentideroLocal = normalizedRecords
      .filter(r => sameSource(r.source, 'Mentidero') && String(r.paymentType || "").toLowerCase().includes('venta directa'))
      .reduce((sum, r) => sum + r.amount, 0);

    const quietecitaTarjeta = normalizedRecords
      .filter(r => sameSource(r.source, 'La Quietecita') && (
        String(r.paymentType || "").toLowerCase().includes('tarjeta') ||
        String(r.paymentType || "").toLowerCase().includes('débito') ||
        String(r.paymentType || "").toLowerCase().includes('crédito')
      ))
      .reduce((sum, r) => sum + r.amount, 0);

    const quietecitaEfectivo = normalizedRecords
      .filter(r => sameSource(r.source, 'La Quietecita') && String(r.paymentType || "").toLowerCase().includes('efectivo'))
      .reduce((sum, r) => sum + r.amount, 0);

    return { 
      ingresosNetos, 
      mentideroTotal, 
      quietecitaIngresos, 
      quietecitaCompras, 
      groupedByDate, 
      categoryData,
      mentideroOnline,
      mentideroLocal,
      quietecitaTarjeta,
      quietecitaEfectivo
    };
  }, [filteredRecords, filteredPurchases]);

  useEffect(() => {
    let cancelled = false;

    async function runBackendSmokeTest() {
      try {
        const pong = await pingBackend();
        if (!cancelled) console.log('PING:', pong);

        const write = await testWriteBackend();
        if (!cancelled) console.log('WRITE:', write);
      } catch (e) {
        if (!cancelled) console.error('BACKEND TEST ERROR:', e);
      }
    }

    runBackendSmokeTest();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalBoletopolis = useMemo(() => {
    return boletopolisTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [boletopolisTransactions]);

  if (filteredRecords.length === 0 && filterSource && filterSource !== 'La Quietecita') {
    return (
      <div className="py-24 text-center flex flex-col items-center">
        <div className="w-20 h-20 border border-mentidero-emerald/20 flex items-center justify-center mb-8 rounded-full bg-white shadow-inner">
           <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-mentidero-emerald opacity-30">
              <path d="M2 18V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12" />
              <path d="M2 18h20" />
              <path d="M7 4v14" />
              <path d="M17 4v14" />
           </svg>
        </div>
        <h3 className="text-xl font-serif font-bold text-mentidero-textDark uppercase tracking-[0.2em]">Escenario Vacío</h3>
        <p className="text-gray-400 mt-4 text-[10px] font-bold uppercase tracking-[0.3em] max-w-sm mx-auto">
          No se detectan movimientos en la trastienda.
        </p>
      </div>
    );
  }

  if (filterSource === 'La Quietecita') {
    return (
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {/* Top Section */}
        <div className="border-b border-gray-100 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl font-serif font-bold text-mentidero-textDark tracking-[0.1em] uppercase">
              La Quietecita
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Resumen operativo</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col">
              <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Periodo</label>
              <select 
                value={period}
                onChange={(e) => setPeriod(e.target.value as Period)}
                className="bg-gray-50 border border-gray-200 text-[9px] font-bold uppercase tracking-wider px-4 py-2 rounded-xl focus:outline-none focus:border-mentidero-emerald"
              >
                <option value="today">Hoy</option>
                <option value="last7">Últimos 7 días</option>
                <option value="month">Este Mes</option>
                <option value="range">Rango Personalizado</option>
              </select>
            </div>

            {period === 'range' && (
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Inicio</label>
                  <input 
                    type="date"
                    value={customRange.start}
                    onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                    className="bg-gray-50 border border-gray-200 text-[9px] font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-mentidero-emerald"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Fin</label>
                  <input 
                    type="date"
                    value={customRange.end}
                    onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                    className="bg-gray-50 border border-gray-200 text-[9px] font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-mentidero-emerald"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* KPI Cards Row */}
        {isLoadingQuietecita || !quietecitaKPIs ? (
          <div className="flex justify-center py-12 bg-white rounded-[1.5rem] border border-gray-100">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-10 h-10 border-4 border-mentidero-emerald border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cargando datos operativos...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StatCard title="Ingresos" value={quietecitaKPIs.summary?.ingresos || 0} icon="📈" isMain />
            <StatCard title="Compras" value={quietecitaKPIs.summary?.compras || 0} icon="📉" />
            <StatCard title="Resultado" value={quietecitaKPIs.summary?.resultado || 0} icon="⚖️" />
          </div>
        )}

        {/* Chart Section */}
        <div className="bg-white p-10 shadow-sm rounded-[1.5rem] border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400 border-l-4 border-mentidero-emerald pl-4">
              {chartView === 'ingresos' ? 'Tendencia de Ingresos' : chartView === 'compras' ? 'Tendencia de Compras' : 'Resultado Operativo'}
            </h3>
            
            <div className="flex bg-gray-100 p-1 rounded-xl self-start md:self-auto">
              {(['ingresos', 'compras', 'resultado'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setChartView(view)}
                  className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${chartView === view ? 'bg-white text-mentidero-emerald shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={quietecitaKPIs?.seriesByDay || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="fecha" tick={{fontSize: 9, fill: '#9CA3AF'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 9, fill: '#9CA3AF'}} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{stroke: '#F9FAFB', strokeWidth: 2}} 
                  contentStyle={{borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                  formatter={(value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)}
                />
                {chartView === 'ingresos' && (
                  <Line type="monotone" dataKey="ingreso" name="Ingreso" stroke="#059669" strokeWidth={3} dot={{r: 4, fill: '#059669'}} activeDot={{r: 6}} />
                )}
                {chartView === 'compras' && (
                  <Line type="monotone" dataKey="compra" name="Compras" stroke="#EF4444" strokeWidth={3} dot={{r: 4, fill: '#EF4444'}} activeDot={{r: 6}} />
                )}
                {chartView === 'resultado' && (
                  <Line type="monotone" dataKey="resultado" name="Resultado" stroke="#3B82F6" strokeWidth={3} dot={{r: 4, fill: '#3B82F6'}} activeDot={{r: 6}} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Data Table Section */}
        <div className="bg-white p-10 shadow-sm rounded-[1.5rem] border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400 border-l-4 border-mentidero-emerald pl-4">
              {tableView === 'ventas' ? 'Detalle de Ventas' : 'Detalle de Compras'}
            </h3>
            
            <div className="flex bg-gray-100 p-1 rounded-xl self-start md:self-auto">
              {(['ventas', 'compras'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setTableView(view)}
                  className={`px-6 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${tableView === view ? 'bg-white text-mentidero-emerald shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            {tableView === 'ventas' ? (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-[8px] font-bold text-gray-400 uppercase tracking-widest">fecha</th>
                    <th className="px-6 py-4 text-[8px] font-bold text-gray-400 uppercase tracking-widest">concepto</th>
                    <th className="px-6 py-4 text-[8px] font-bold text-gray-400 uppercase tracking-widest">metodo_pago</th>
                    <th className="px-6 py-4 text-[8px] font-bold text-gray-400 uppercase tracking-widest text-right">importe</th>
                    <th className="px-6 py-4 text-[8px] font-bold text-gray-400 uppercase tracking-widest">archivo_origen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(quietecitaKPIs?.ventas || []).map((t: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-[9px] font-mono text-gray-500">{t.fecha}</td>
                      <td className="px-6 py-4 text-[9px] font-medium text-mentidero-textDark">{t.concepto}</td>
                      <td className="px-6 py-4 text-[9px] text-gray-500 uppercase">{t.metodo_pago}</td>
                      <td className="px-6 py-4 text-[9px] font-bold text-right text-mentidero-textDark">
                        {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(t.importe)}
                      </td>
                      <td className="px-6 py-4 text-[9px] text-gray-400 truncate max-w-[150px]" title={t.archivo_origen}>{t.archivo_origen}</td>
                    </tr>
                  ))}
                  {(!quietecitaKPIs?.ventas || quietecitaKPIs.ventas.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center italic text-gray-300 text-[9px]">No hay transacciones registradas.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-[8px] font-bold text-gray-400 uppercase tracking-widest">fecha</th>
                    <th className="px-6 py-4 text-[8px] font-bold text-gray-400 uppercase tracking-widest">articulo</th>
                    <th className="px-6 py-4 text-[8px] font-bold text-gray-400 uppercase tracking-widest">cantidad</th>
                    <th className="px-6 py-4 text-[8px] font-bold text-gray-400 uppercase tracking-widest">costo_unitario</th>
                    <th className="px-6 py-4 text-[8px] font-bold text-gray-400 uppercase tracking-widest text-right">importe</th>
                    <th className="px-6 py-4 text-[8px] font-bold text-gray-400 uppercase tracking-widest">archivo_origen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(quietecitaKPIs?.compras_detalle || []).map((t: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-[9px] font-mono text-gray-500">{t.fecha}</td>
                      <td className="px-6 py-4 text-[9px] font-medium text-mentidero-textDark">{t.articulo}</td>
                      <td className="px-6 py-4 text-[9px] text-gray-500">{t.cantidad}</td>
                      <td className="px-6 py-4 text-[9px] text-gray-500">
                        {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(t.costo_unitario)}
                      </td>
                      <td className="px-6 py-4 text-[9px] font-bold text-right text-mentidero-textDark">
                        {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(t.importe)}
                      </td>
                      <td className="px-6 py-4 text-[9px] text-gray-400 truncate max-w-[150px]" title={t.archivo_origen}>{t.archivo_origen}</td>
                    </tr>
                  ))}
                  {(!quietecitaKPIs?.compras_detalle || quietecitaKPIs.compras_detalle.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center italic text-gray-300 text-[9px]">No hay compras registradas.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="border-b border-gray-100 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-mentidero-textDark tracking-[0.1em] uppercase">
            {filterSource ? filterSource : 'Resumen Consolidado'}
          </h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Análisis Operativo Financiero</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col">
            <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Periodo</label>
            <select 
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="bg-gray-50 border border-gray-200 text-[9px] font-bold uppercase tracking-wider px-4 py-2 rounded-xl focus:outline-none focus:border-mentidero-emerald"
            >
              <option value="today">Hoy</option>
              <option value="last7">Últimos 7 días</option>
              <option value="month">Este Mes</option>
              <option value="range">Rango Personalizado</option>
            </select>
          </div>

          {period === 'range' && (
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Inicio</label>
                <input 
                  type="date"
                  value={customRange.start}
                  onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                  className="bg-gray-50 border border-gray-200 text-[9px] font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-mentidero-emerald"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Fin</label>
                <input 
                  type="date"
                  value={customRange.end}
                  onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                  className="bg-gray-50 border border-gray-200 text-[9px] font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-mentidero-emerald"
                />
              </div>
            </div>
          )}

          {filterSource === 'La Quietecita' && turnOptions.length > 0 && (
            <div className="flex flex-col">
              <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">ID Turno (Auditoría)</label>
              <select 
                value={selectedTurnId}
                onChange={(e) => setSelectedTurnId(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-[9px] font-bold uppercase tracking-wider px-4 py-2 rounded-xl focus:outline-none focus:border-mentidero-emerald"
              >
                <option value="all">Todos los turnos</option>
                {turnOptions.map(id => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Tarjetas de Estadísticas */}
      {isLoadingPanel && !filterSource ? (
        <div className="flex justify-center py-12 bg-white rounded-[1.5rem] border border-gray-100">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-10 h-10 border-4 border-mentidero-emerald border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sincronizando Panel Consolidado...</p>
          </div>
        </div>
      ) : quietecitaKPIs ? (
        <div className="space-y-8">
          {isLoadingQuietecita ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-mentidero-emerald border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <StatCard title="Ingreso Total" value={quietecitaKPIs.ingresos} icon="📈" isMain />
              <StatCard title="Ingreso Efectivo" value={quietecitaKPIs.efectivo} icon="💰" />
              <div className="p-8 rounded-[1.5rem] border border-gray-50 bg-white shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">Transacciones</p>
                  <p className="text-2xl font-serif font-bold text-mentidero-textDark">
                    {quietecitaKPIs.transacciones.toLocaleString()}
                  </p>
                </div>
                <div className="text-2xl opacity-20 text-gray-300">📊</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <StatCard title="Ingresos Netos" value={panelData?.summary?.ingresos_netos || 0} icon="💰" isMain />
          <StatCard title="Taquilla Mentidero" value={panelData?.summary?.taquilla_mentidero || 0} icon="🎟️" />
          <StatCard title="Quietecita Ingresos" value={panelData?.summary?.quietecita_ingresos || 0} icon="☕" />
          <StatCard title="Quietecita Compras" value={panelData?.summary?.quietecita_compras || 0} icon="📉" />
        </div>
      )}

      {!filterSource && !isLoadingPanel && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 -mt-4">
          <MiniStatCard title="Mentidero En Línea" value={panelData?.mini_summary?.mentidero_online || 0} color="text-indigo-600" />
          <MiniStatCard title="Mentidero Local" value={panelData?.mini_summary?.mentidero_local || 0} color="text-amber-600" />
          <MiniStatCard title="Quietecita Tarjeta" value={panelData?.mini_summary?.quietecita_tarjeta || 0} color="text-mentidero-emerald" />
          <MiniStatCard title="Quietecita Efectivo" value={panelData?.mini_summary?.quietecita_efectivo || 0} color="text-gray-600" />
        </div>
      )}

      {quietecitaKPIs && quietecitaKPIs.dailyTrend && quietecitaKPIs.dailyTrend.length > 0 && (
        <div className="bg-white p-10 shadow-sm rounded-[1.5rem] border border-gray-100">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-10 text-gray-400 border-l-4 border-mentidero-emerald pl-4">Tendencia Diaria: Ingresos</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={quietecitaKPIs.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="fecha" tick={{fontSize: 9, fill: '#9CA3AF'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 9, fill: '#9CA3AF'}} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{stroke: '#F9FAFB', strokeWidth: 2}} 
                  contentStyle={{borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                  formatter={(value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)}
                />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '30px', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px'}} />
                <Line type="monotone" dataKey="ingreso" name="Ingresos" stroke="#059669" strokeWidth={3} dot={{r: 4, fill: '#059669'}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-10">
        {quietecitaKPIs && filterSource === 'La Quietecita' && quietecitaKPIs.transactions && quietecitaKPIs.transactions.length > 0 && (
          <div className="bg-white p-10 shadow-sm rounded-[1.5rem] border border-gray-100">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-10 text-gray-400 border-l-4 border-mentidero-emerald pl-4">Transacciones Recientes</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-[8px] font-bold text-gray-400 uppercase tracking-widest">Fecha</th>
                    <th className="px-6 py-4 text-[8px] font-bold text-gray-400 uppercase tracking-widest">Concepto</th>
                    <th className="px-6 py-4 text-[8px] font-bold text-gray-400 uppercase tracking-widest">Método</th>
                    <th className="px-6 py-4 text-[8px] font-bold text-gray-400 uppercase tracking-widest text-right">Importe</th>
                    <th className="px-6 py-4 text-[8px] font-bold text-gray-400 uppercase tracking-widest">Archivo Origen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {quietecitaKPIs.transactions.map((t, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-[9px] font-mono text-gray-500">{t.fecha}</td>
                      <td className="px-6 py-4 text-[9px] font-medium text-mentidero-textDark">{t.concepto}</td>
                      <td className="px-6 py-4 text-[9px] text-gray-500 uppercase">{t.metodo_pago}</td>
                      <td className="px-6 py-4 text-[9px] font-bold text-right text-mentidero-textDark">
                        {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(t.importe)}
                      </td>
                      <td className="px-6 py-4 text-[9px] text-gray-400 truncate max-w-[150px]" title={t.archivo_origen}>{t.archivo_origen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-10 shadow-sm rounded-[1.5rem] border border-gray-100">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-10 text-gray-400 border-l-4 border-mentidero-emerald pl-4">Rendimiento Histórico: Ingresos</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={panelData?.rendimiento_historico || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="fecha" tick={{fontSize: 9, fill: '#9CA3AF'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 9, fill: '#9CA3AF'}} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#F9FAFB'}} contentStyle={{borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '30px', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px'}} />
                <Bar dataKey="mentidero" name="Mentidero" fill="#065F46" radius={[4, 4, 0, 0]} />
                <Bar dataKey="quietecita_ingresos" name="Quietecita Ingresos" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 shadow-sm rounded-[1.5rem] border border-gray-100">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-10 text-gray-400 border-l-4 border-mentidero-emerald pl-4">Distribución de Ingresos</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={panelData?.distribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ label, percent }) => `${label} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  innerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="label"
                >
                  {(panelData?.distribution || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '12px', border: '1px solid #E5E7EB'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-12 shadow-sm rounded-[2rem] border border-gray-100">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] mb-12 text-mentidero-emerald text-center">Fluctuación Financiera: Consolidado</h3>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={panelData?.fluctuacion_financiera || []}>
              <CartesianGrid strokeDasharray="1 6" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="fecha" tick={{fontSize: 9, fill: '#9CA3AF'}} axisLine={false} />
              <YAxis tick={{fontSize: 9, fill: '#9CA3AF'}} axisLine={false} />
              <Tooltip contentStyle={{backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid #E5E7EB'}} />
              <Legend iconType="circle" wrapperStyle={{paddingTop: '30px', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px'}} />
              <Line type="monotone" dataKey="mentidero" name="Mentidero" stroke="#065F46" strokeWidth={4} dot={{r: 4, fill: '#065F46'}} activeDot={{r: 6}} />
              <Line type="monotone" dataKey="quietecita_ingresos" name="Quietecita Ingresos" stroke="#9CA3AF" strokeWidth={4} dot={{r: 4, fill: '#9CA3AF'}} activeDot={{r: 6}} />
              <Line type="monotone" dataKey="ingresos_netos" name="Ingresos Netos" stroke="#10B981" strokeWidth={4} dot={{r: 4, fill: '#10B981'}} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

const StatCard = ({ title, value, icon, isMain }: { title: string, value: number, icon: string, isMain?: boolean }) => (
  <div className={`p-8 rounded-[1.5rem] border bg-white shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isMain ? 'border-l-8 border-l-mentidero-emerald' : 'border-gray-50'}`}>
    <div>
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">{title}</p>
      <p className={`text-2xl font-serif font-bold ${isMain ? 'text-mentidero-emerald' : 'text-mentidero-textDark'}`}>
        {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)}
      </p>
    </div>
    <div className={`text-2xl opacity-20 ${isMain ? 'text-mentidero-emerald' : 'text-gray-300'}`}>
      {icon}
    </div>
  </div>
);

const MiniStatCard = ({ title, value, color }: { title: string, value: number, color: string }) => (
  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-1.5">{title}</p>
    <p className={`text-lg font-serif font-bold ${color}`}>
      {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)}
    </p>
  </div>
);

export default Dashboard;
