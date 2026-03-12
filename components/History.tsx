
import React from 'react';
import { SaleRecord } from '../types';

interface HistoryProps {
  records: SaleRecord[];
  onDelete: (id: string) => void;
  filterSource?: string;
}

const History: React.FC<HistoryProps> = ({ records, onDelete, filterSource }) => {
  const sameSource = (a: any, b: any) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
  const filtered = filterSource ? records.filter(r => sameSource(r.source, filterSource)) : records;
  const sortedRecords = [...filtered].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="bg-white border border-gray-200 overflow-hidden shadow-sm rounded-sm">
      <div className="px-10 py-8 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-mentidero-black">
          {filterSource ? `Bitácora: ${filterSource}` : 'Bitácora de Operaciones'}
        </h3>
        <span className="text-[9px] font-bold text-mentidero-emerald uppercase tracking-widest border border-mentidero-emerald/20 bg-mentidero-emerald/5 px-4 py-1.5 rounded-full">
          {filtered.length} Movimientos Registrados
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-white">
            <tr>
              <th className="px-10 py-6 text-left text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Fecha</th>
              <th className="px-10 py-6 text-left text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Origen</th>
              <th className="px-10 py-6 text-left text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Categoría</th>
              <th className="px-10 py-6 text-left text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Concepto</th>
              <th className="px-10 py-6 text-right text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Importe</th>
              <th className="px-10 py-6 text-right text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Gestión</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {sortedRecords.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-10 py-6 whitespace-nowrap text-xs text-gray-500 font-mono">{record.date}</td>
                <td className="px-10 py-6 whitespace-nowrap">
                  <span className={`px-4 py-1 text-[8px] font-bold tracking-[0.1em] uppercase rounded-full border ${
                    record.source === 'Mentidero' ? 'border-mentidero-emerald text-mentidero-emerald bg-mentidero-emerald/5' : 
                    record.source === 'Boletópolis' ? 'border-orange-500 text-orange-500 bg-orange-50' :
                    'border-mentidero-darkGray text-mentidero-darkGray bg-gray-50'
                  }`}>
                    {record.source}
                  </span>
                </td>
                <td className="px-10 py-6 whitespace-nowrap text-[10px] text-gray-400 italic font-serif">{record.category}</td>
                <td className="px-10 py-6 whitespace-nowrap text-[10px] text-gray-600 font-medium max-w-xs truncate">{record.description}</td>
                <td className="px-10 py-6 whitespace-nowrap text-sm text-right font-bold text-mentidero-black font-mono">
                  {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(record.amount)}
                </td>
                <td className="px-10 py-6 whitespace-nowrap text-right text-[9px]">
                  <button
                    onClick={() => onDelete(record.id)}
                    className="text-gray-300 hover:text-red-700 transition-colors font-bold uppercase tracking-widest"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {sortedRecords.length === 0 && (
              <tr>
                <td colSpan={6} className="px-10 py-24 text-center text-gray-400 uppercase tracking-[0.2em] text-[9px] font-light italic">
                  No se registran transacciones.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default History;
