
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { apiService } from '../services/apiService';

interface LoginProps {
  onLogin: (user: User) => void;
}

const CurtainIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 4h18" />
    <path d="M4 4v16a2 2 0 0 0 2 2" />
    <path d="M20 4v16a2 2 0 0 1-2 2" />
    <path d="M4 10a8 8 0 0 0 8 8 8 8 0 0 0 8-8" />
    <line x1="12" y1="4" x2="12" y2="18" />
  </svg>
);

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isTestMode, setIsTestMode] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await apiService.getUsers();
        setUsers(data || []);
      } catch (err) {
        console.error("Error fetching users for login:", err);
      }
    };
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isTestMode) {
        // ACCESO DIRECTO EN MODO PRUEBA
        const mockUser: User = {
          id: 'usr_demo',
          name: 'ADMIN PRUEBA',
          email: 'demo@mentidero.mx',
          role: 'Administrador',
          status: 'Activo'
        };
        onLogin(mockUser);
        return;
      }

      // VALIDACIÓN REAL CONTRA TABLA DE USUARIOS (FETCHED FROM BACKEND)
      // Refetch just in case
      const currentUsers = await apiService.getUsers();
      
      const foundUser = currentUsers.find(u => 
        u.email.toLowerCase() === email.toLowerCase() && 
        u.password === password
      );

      if (foundUser) {
        if (foundUser.status === 'Inactivo') {
          setError("Esta cuenta se encuentra desactivada. Contacte al administrador.");
          return;
        }
        onLogin(foundUser);
      } else {
        setError("Credenciales incorrectas. Verifique sus datos.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Error de conexión con el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#374151]">
      {/* Fondo con degradado gris medio profundo */}
      <div 
        className="absolute inset-0 z-0" 
        style={{
          background: 'radial-gradient(circle at 50% 50%, #4B5563 0%, #1F2937 100%)',
        }}
      />

      {/* Ola inferior en blanco puro sutil */}
      <div className="absolute bottom-0 left-0 w-full z-0 overflow-hidden leading-[0]">
        <svg viewBox="0 0 1440 320" className="relative block w-full h-[35vh] opacity-[0.08]">
          <path 
            fill="#FFFFFF" 
            fillOpacity="1" 
            d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,197.3C1248,213,1344,203,1392,197.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          ></path>
        </svg>
      </div>
      
      <div className="max-w-md w-full relative z-10 px-6 animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 border border-white/20 text-white mb-6 shadow-2xl backdrop-blur-sm">
            <CurtainIcon />
          </div>
          <h1 className="text-4xl font-serif font-bold text-white tracking-tight drop-shadow-md">
            La Trastienda
          </h1>
          <div className="flex items-center justify-center space-x-2 mt-4">
            <div className="h-px w-6 bg-white/20"></div>
            <p className="text-gray-300 text-[10px] font-bold uppercase tracking-[0.4em]">
              Entorno de Gestión
            </p>
            <div className="h-px w-6 bg-white/20"></div>
          </div>
        </div>

        <form 
          onSubmit={handleSubmit} 
          className="bg-white p-10 md:p-12 rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] space-y-8 border border-white/50 relative overflow-hidden"
        >
          {/* Sutil brillo decorativo interno */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-mentidero-emerald/5 blur-3xl -mr-16 -mt-16 pointer-events-none rounded-full"></div>

          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-[10px] font-bold uppercase tracking-widest animate-in fade-in slide-in-from-top-2 duration-300">
              {error}
            </div>
          )}

          <div className={`space-y-6 relative z-10 transition-opacity duration-300 ${isTestMode ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'}`}>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">
                Correo Institucional
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@mentidero.mx"
                disabled={isTestMode}
                className="w-full bg-gray-50 border border-gray-100 px-6 py-4 text-sm text-gray-800 focus:outline-none focus:border-mentidero-emerald focus:bg-white transition-all rounded-2xl placeholder:text-gray-300"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">
                Contraseña
              </label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isTestMode}
                className="w-full bg-gray-50 border border-gray-100 px-6 py-4 text-sm text-gray-800 focus:outline-none focus:border-mentidero-emerald focus:bg-white transition-all rounded-2xl placeholder:text-gray-300"
              />
            </div>
          </div>

          <div className="space-y-6 pt-2">
            {/* Toggle de Modo Prueba */}
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Modo Prueba</span>
                <span className="text-[8px] text-gray-400 uppercase tracking-widest">Acceso sin credenciales</span>
              </div>
              <button 
                type="button"
                onClick={() => setIsTestMode(!isTestMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isTestMode ? 'bg-mentidero-emerald' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isTestMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <button 
              type="submit"
              className="w-full bg-gradient-to-b from-mentidero-emerald to-mentidero-emeraldHover text-white py-5 text-[11px] font-bold uppercase tracking-[0.3em] shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all duration-300 rounded-2xl"
            >
              Entrar al Sistema
            </button>
            
            {isTestMode && (
              <p className="text-center text-[9px] text-emerald-600 font-bold uppercase tracking-widest opacity-80 animate-pulse">
                ● Bypass activo: Click para entrar directamente
              </p>
            )}
          </div>

          <div className="text-center pt-2 opacity-60">
            <p className="text-[9px] text-gray-400 uppercase tracking-[0.2em] leading-relaxed font-semibold">
              Sistema de Control &bull; Mentidero 2025
            </p>
          </div>
        </form>
      </div>

      {/* Sutil firma de marca en la esquina */}
      <div className="absolute bottom-8 right-8 text-white/10 text-[10px] font-bold tracking-[0.5em] uppercase pointer-events-none hidden md:block">
        La Trastienda OS v2.2
      </div>
    </div>
  );
};

export default Login;
