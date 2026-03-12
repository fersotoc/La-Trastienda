
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import History from './components/History';
import DataIngestion from './components/DataIngestion';
import UserManagement from './components/UserManagement';
import Login from './components/Login';
import CommercialConsole from './components/CommercialConsole';
import { Transaction, LoadLog, RestaurantCut, User, BoletopolisTransaction } from './types';
import { apiService } from './services/apiService';

const AUTH_KEY = 'trastienda_auth_session';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [boletopolisTransactions, setBoletopolisTransactions] = useState<BoletopolisTransaction[]>([]);
  const [loadLogs, setLoadLogs] = useState<LoadLog[]>([]);
  const [cuts, setCuts] = useState<RestaurantCut[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [cortesMaster, setCortesMaster] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      try {
        const savedSession = localStorage.getItem(AUTH_KEY);
        if (savedSession) setCurrentUser(JSON.parse(savedSession));

        const results = await Promise.allSettled([
          apiService.getTransactions(),
          apiService.getLoadLogs(),
          apiService.getCuts()
        ]);

        // Transactions
        if (results[0].status === 'fulfilled') {
          const transData = results[0].value;
          setTransactions(Array.isArray(transData) ? transData : []);
        } else {
          console.error("Error fetching transactions:", results[0].reason);
          setTransactions([]);
        }

        // Load Logs
        if (results[1].status === 'fulfilled') {
          setLoadLogs(results[1].value || []);
        } else {
          console.error("Error fetching load logs:", results[1].reason);
          setLoadLogs([]);
        }

        // Cuts
        if (results[2].status === 'fulfilled') {
          setCuts(results[2].value || []);
        } else {
          console.error("Error fetching cuts:", results[2].reason);
          setCuts([]);
        }
        
        // Load Boletópolis from localStorage if available
        const savedBP = localStorage.getItem('trastienda_boletopolis');
        if (savedBP) setBoletopolisTransactions(JSON.parse(savedBP));
      } catch (error) {
        console.error("Error in initApp:", error);
      } finally {
        setIsInitialized(true);
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    setActiveTab(user.role === 'Operativo' ? 'ingestion' : 'dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(AUTH_KEY);
  };

  const handleAddData = async (
    newTransactions: Omit<Transaction, 'id_transaccion' | 'id_carga'>[],
    newCut: Omit<RestaurantCut, 'id_corte' | 'id_carga'> | undefined,
    logData: Omit<LoadLog, 'id_carga'>,
    newPurchases?: any[],
    newCortesMaster?: any[]
  ) => {
    const id_carga = Math.random().toString(36).substr(2, 9);
    
    // 1. Manejo de duplicados: Buscar cargas previas para el mismo módulo y fecha operativa
    const duplicateLogs = loadLogs.filter(l => 
      l.modulo === logData.modulo && 
      l.fecha_operativa === logData.fecha_operativa && 
      l.estado === 'procesado'
    );

    let updatedLogs = [...loadLogs];
    let updatedTransactions = [...transactions];
    let updatedCuts = [...cuts];

    try {
      if (duplicateLogs.length > 0) {
        // Marcar previas como reemplazadas en el backend
        for (const log of duplicateLogs) {
          await apiService.updateLoadLog(log.id_carga, { estado: 'reemplazado' });
        }

        updatedLogs = updatedLogs.map(l => 
          (l.modulo === logData.modulo && l.fecha_operativa === logData.fecha_operativa) 
            ? { ...l, estado: 'reemplazado' } : l
        );
        
        const duplicateIds = duplicateLogs.map(l => l.id_carga);
        updatedTransactions = updatedTransactions.filter(t => !duplicateIds.includes(t.id_carga));
        updatedCuts = updatedCuts.filter(c => !duplicateIds.includes(c.id_carga));
      }

      // 2. Insertar nueva carga
      const finalLog: LoadLog = { ...logData, id_carga };
      const finalTransactions = newTransactions.map(t => ({
        ...t,
        id_transaccion: Math.random().toString(36).substr(2, 9),
        id_carga
      }));

      await apiService.createLoadLog(finalLog);
      await apiService.createTransactions(finalTransactions);
      
      let finalCut: RestaurantCut | undefined;
      if (newCut) {
        finalCut = { ...newCut, id_corte: Math.random().toString(36).substr(2, 9), id_carga };
        await apiService.createCut(finalCut);
      }

      if (newPurchases && newPurchases.length > 0) {
        setPurchases(prev => [...newPurchases, ...prev]);
      }

      if (newCortesMaster && newCortesMaster.length > 0) {
        setCortesMaster(prev => [...newCortesMaster, ...prev]);
      }

      setLoadLogs([finalLog, ...updatedLogs]);
      setTransactions([...finalTransactions, ...updatedTransactions]);
      if (finalCut) setCuts([finalCut, ...updatedCuts]);

      const purchaseMsg = newPurchases && newPurchases.length > 0 ? ` y ${newPurchases.length} compras` : "";
      const corteMsg = newCortesMaster && newCortesMaster.length > 0 ? ` y ${newCortesMaster.length} cortes` : "";
      alert(`Carga finalizada: ${finalTransactions.length} transacciones${purchaseMsg}${corteMsg} procesadas.`);
    } catch (error) {
      console.error("Error saving data to backend:", error);
      alert("Error al guardar los datos en el servidor. Por favor, intente de nuevo.");
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (confirm("¿Eliminar transacción de forma permanente?")) {
      try {
        await apiService.deleteTransaction(id);
        setTransactions(prev => prev.filter(t => t.id_transaccion !== id));
      } catch (error) {
        console.error("Error deleting transaction:", error);
        alert("Error al eliminar la transacción.");
      }
    }
  };

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#374151]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-mentidero-emerald border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-[10px] font-bold uppercase tracking-[0.5em]">Sincronizando con La Trastienda...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <Login onLogin={handleLogin} />;

  const renderContent = () => {
    const oldFormatRecords = transactions.map((t: any, idx: number) => {
      const fechaStr = String(t.fecha ?? t.fecha_compra ?? t.createdAt ?? "");
      const ts = Date.parse(fechaStr);
      
      const sourceRaw = String(t.origen ?? "").trim();
      const sourceNorm = /quietecita/i.test(sourceRaw) ? "La Quietecita" : "Mentidero";

      // Mapping commercial fields if they exist in raw data
      const event = t.funcion ?? t.Funcion ?? t.concepto ?? "";
      const income = Number(t.ingreso_a_organizador ?? t["Ingreso a organizador"] ?? t.importe ?? 0);
      const paymentType = t.tipo_de_transaccion ?? t["Tipo de transacción"] ?? t.tipo_transaccion ?? t.metodo_pago ?? "";
      const tickets = Number(t.cantidad_de_boletos ?? t["Cantidad de boletos"] ?? t.cantidad_boletos ?? 0);
      const purchaseDate = t.fecha_de_compra ?? t["Fecha de compra"] ?? t.fecha ?? t.createdAt ?? "";

      return {
        id: t.id_transaccion ? `${t.id_transaccion}_${idx}` : `gen_${idx}_${Math.random().toString(36).substr(2, 9)}`,
        date: purchaseDate,
        amount: Number(t.importe ?? income ?? 0),
        source: sourceNorm,
        category: t.categoria ?? "otro",
        description: t.concepto ?? "",
        timestamp: Number.isFinite(ts) ? ts : 0,
        event,
        income,
        paymentType,
        tickets
      };
    });
    const boletopolisRecords = boletopolisTransactions.map((t, index) => {
      const ts = Date.parse(String(t.fecha || ""));
      return {
        id: `bp_${index}`,
        date: t.fecha,
        amount: t.importe,
        source: 'Boletópolis' as any,
        category: t.categoria,
        description: t.concepto,
        timestamp: Number.isFinite(ts) ? ts : 0
      };
    });

    const allRecords = [...oldFormatRecords, ...boletopolisRecords];

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard records={allRecords} purchases={purchases} cortesMaster={cortesMaster} />;
      case 'mentidero':
        return (
          <CommercialConsole records={allRecords} />
        );
      case 'quietecita':
        return (
          <div className="animate-in fade-in duration-500">
            <Dashboard records={allRecords} filterSource="La Quietecita" purchases={purchases} cortesMaster={cortesMaster} />
          </div>
        );
      case 'ingestion':
        return (
          <DataIngestion />
        );
      case 'usuarios':
        return <UserManagement />;
      default:
        return <Dashboard records={allRecords} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} onLogout={handleLogout}>
      {renderContent()}
    </Layout>
  );
};

export default App;
