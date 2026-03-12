
import React, { useState, useEffect } from 'react';
import { User, UserRole, UserStatus } from '../types';
import { apiService } from '../services/apiService';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Operativo');
  const [status, setStatus] = useState<UserStatus>('Activo');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getUsers();
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenModal = (user: User | null = null) => {
    setFormError(null);
    if (user) {
      setEditingUser(user);
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
      setStatus(user.status);
      setPassword(user.password || '');
      setConfirmPassword(user.password || '');
    } else {
      setEditingUser(null);
      setName('');
      setEmail('');
      setRole('Operativo');
      setStatus('Activo');
      setPassword('');
      setConfirmPassword('');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validaciones
    if (password.length < 6) {
      setFormError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Las contraseñas no coinciden.");
      return;
    }

    try {
      if (editingUser) {
        await apiService.updateUser(editingUser.id, { name, email, role, status, password });
      } else {
        await apiService.createUser({
          name: name.toUpperCase(),
          email,
          role,
          status,
          password
        });
      }
      await fetchUsers();
      setShowModal(false);
    } catch (error) {
      console.error("Error saving user:", error);
      setFormError("Error al guardar el usuario en el servidor.");
    }
  };

  const toggleStatus = async (user: User) => {
    try {
      const newStatus = user.status === 'Activo' ? 'Inactivo' : 'Activo';
      await apiService.updateUser(user.id, { status: newStatus as UserStatus });
      await fetchUsers();
    } catch (error) {
      console.error("Error toggling user status:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="border-b border-gray-200 pb-6 flex justify-between items-end">
        <div>
          <h2 className="text-xl font-serif font-bold text-mentidero-textDark tracking-[0.1em] uppercase">Usuarios</h2>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Gestión de accesos operativos</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-mentidero-emerald text-white px-7 py-3 text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg shadow-emerald-900/10 hover:bg-mentidero-emeraldHover hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 rounded-2xl"
        >
          Nuevo Usuario
        </button>
      </div>

      <div className="bg-white border border-gray-200 overflow-hidden shadow-sm rounded-[1.5rem]">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-5 text-left text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Usuario</th>
                <th className="px-4 py-5 text-left text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] w-32">Rol</th>
                <th className="px-4 py-5 text-center text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] w-32">Estado</th>
                <th className="px-6 py-5 text-right text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] w-32">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex flex-col space-y-0.5">
                      <span className="text-[10px] font-bold text-mentidero-textDark uppercase tracking-wider block leading-tight">
                        {u.name}
                      </span>
                      <span className="text-[8px] font-medium text-gray-400 tracking-widest block font-mono">
                        {u.email}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-5 whitespace-nowrap">
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter border ${u.role === 'Administrador' ? 'border-mentidero-emerald text-mentidero-emerald' : 'border-gray-300 text-gray-400'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-5 whitespace-nowrap text-center">
                    <button 
                      onClick={() => toggleStatus(u)}
                      className={`text-[8px] font-bold px-3 py-1 rounded-sm uppercase tracking-widest transition-colors ${u.status === 'Activo' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
                    >
                      {u.status}
                    </button>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-right">
                    <button 
                      onClick={() => handleOpenModal(u)}
                      className="text-mentidero-emerald hover:text-mentidero-emeraldHover font-bold uppercase tracking-widest text-[9px] underline decoration-dotted underline-offset-4"
                    >
                      Administrar
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[9px] text-gray-400 uppercase tracking-widest italic">
                    No hay usuarios registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-mentidero-gray w-full max-w-md p-8 shadow-2xl border-t-4 border-mentidero-emerald animate-in zoom-in-95 duration-200 rounded-[2rem]">
            <h3 className="text-lg font-serif font-bold text-mentidero-textDark uppercase mb-6 flex items-center">
              <span className="w-2 h-2 bg-mentidero-emerald mr-3"></span>
              Ficha de Usuario
            </h3>
            
            {formError && (
              <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-[9px] font-bold uppercase tracking-widest rounded-r-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nombre Completo</label>
                <input 
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-gray-200 px-4 py-3 text-xs focus:outline-none focus:border-mentidero-emerald rounded-xl text-mentidero-textDark transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Correo Institucional</label>
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-gray-200 px-4 py-3 text-xs focus:outline-none focus:border-mentidero-emerald rounded-xl text-mentidero-textDark transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Contraseña</label>
                  <input 
                    type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-gray-200 px-4 py-3 text-xs focus:outline-none focus:border-mentidero-emerald rounded-xl text-mentidero-textDark transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Confirmar</label>
                  <input 
                    type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white border border-gray-200 px-4 py-3 text-xs focus:outline-none focus:border-mentidero-emerald rounded-xl text-mentidero-textDark transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Rol de Sistema</label>
                  <select 
                    value={role} onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-white border border-gray-200 px-4 py-3 text-xs focus:outline-none rounded-xl text-mentidero-textDark"
                  >
                    <option value="Administrador">Administrador</option>
                    <option value="Operativo">Operativo</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Estado</label>
                  <select 
                    value={status} onChange={(e) => setStatus(e.target.value as UserStatus)}
                    className="w-full bg-white border border-gray-200 px-4 py-3 text-xs focus:outline-none rounded-xl text-mentidero-textDark"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
              </div>
              <div className="flex space-x-3 pt-6">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="flex-1 border border-gray-200 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 hover:bg-gray-50 transition-all rounded-2xl"
                >
                  Cerrar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-mentidero-emerald text-white py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-mentidero-emeraldHover transition-all shadow-lg shadow-emerald-900/10 active:scale-[0.98] rounded-2xl"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
