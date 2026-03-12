
import React from 'react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User | null;
  onLogout: () => void;
}

const IconDashboard = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" />
    <rect x="14" y="3" width="7" height="5" />
    <rect x="14" y="12" width="7" height="9" />
    <rect x="3" y="16" width="7" height="5" />
  </svg>
);

const IconTicket = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    <line x1="9" y1="9" x2="9" y2="15" />
    <line x1="13" y1="9" x2="13" y2="15" />
  </svg>
);

const IconCup = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
    <line x1="6" y1="2" x2="6" y2="4" />
    <line x1="10" y1="2" x2="10" y2="4" />
    <line x1="14" y1="2" x2="14" y2="4" />
  </svg>
);

const IconUpload = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
    <path d="M12 12v9" />
    <path d="m16 16-4-4-4 4" />
  </svg>
);

const IconUsers = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const CurtainIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 4h18" />
    <path d="M4 4v16a2 2 0 0 0 2 2" />
    <path d="M20 4v16a2 2 0 0 1-2 2" />
    <path d="M4 10a8 8 0 0 0 8 8 8 8 0 0 0 8-8" />
    <line x1="12" y1="4" x2="12" y2="18" />
  </svg>
);

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, currentUser, onLogout }) => {
  const tabs = [
    { id: 'dashboard', label: 'Panel', icon: <IconDashboard />, roles: ['Administrador'] },
    { id: 'mentidero', label: 'Mentidero', icon: <IconTicket />, roles: ['Administrador'] },
    { id: 'quietecita', label: 'La Quietecita', icon: <IconCup />, roles: ['Administrador'] },
    { id: 'ingestion', label: 'Cargas', icon: <IconUpload />, roles: ['Administrador', 'Operativo'] },
    { id: 'usuarios', label: 'Usuarios', icon: <IconUsers />, roles: ['Administrador'] },
  ].filter(tab => currentUser ? tab.roles.includes(currentUser.role) : false);

  return (
    <div className="min-h-screen flex flex-col pb-24">
      {/* Header Institucional con transparencia sutil */}
      <header className="bg-mentidero-bgGradientEnd/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="text-mentidero-vermilion">
                <CurtainIcon />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-serif font-bold text-white tracking-[0.1em] leading-tight">
                  La Trastienda
                </h1>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.4em] mt-0.5">
                  Mentidero OS
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[10px] text-white font-bold tracking-widest">{currentUser?.name}</span>
                <span className="text-[8px] text-mentidero-emerald font-bold uppercase tracking-[0.2em]">{currentUser?.role}</span>
              </div>
              <button 
                onClick={onLogout}
                className="text-gray-400 hover:text-mentidero-emerald transition-colors p-2"
                title="Cerrar Sesión"
              >
                <IconLogout />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Área de Contenido Principal - Fondo heredado del body */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="bg-mentidero-gray rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] min-h-[70vh] p-6 md:p-10 text-mentidero-textDark border border-white/20 overflow-hidden">
          {children}
        </div>
      </main>

      {/* Barra de Navegación Inferior unificada con el tema gris */}
      <nav className="fixed bottom-0 left-0 right-0 bg-mentidero-nav/90 backdrop-blur-xl border-t border-white/10 flex justify-around items-center h-20 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] px-4">
        <div className="max-w-xl w-full flex justify-around items-center">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center space-y-1 w-1/5 transition-all duration-300 relative ${
                  isActive ? 'text-mentidero-emerald' : 'text-gray-400'
                }`}
              >
                <div className={`mb-0.5 transform transition-transform ${isActive ? 'scale-110' : 'scale-100'}`}>
                  {tab.icon}
                </div>
                <span className={`text-[8px] font-bold uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <div className="absolute -top-6 w-8 h-1 bg-mentidero-emerald rounded-full shadow-[0_0_15px_rgba(6,95,70,0.8)]"></div>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <footer className="py-6 text-center">
        <p className="text-[9px] text-white/20 font-medium uppercase tracking-[0.4em]">
          La Trastienda &bull; Compañía Teatral Mentidero
        </p>
      </footer>
    </div>
  );
};

export default Layout;
