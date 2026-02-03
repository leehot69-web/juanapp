import React, { useEffect, useState } from 'react';
import { adminService } from '../services/adminService';
import { FaUserCheck, FaUserTimes, FaArrowLeft, FaSync } from 'react-icons/fa';
import toast from 'react-hot-toast';

interface AdminDashboardProps {
    onClose: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = activeTab === 'pending'
                ? await adminService.getPendingUsers()
                : await adminService.getAllUsers();
            setUsers(data);
        } catch (error) {
            toast.error('Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, [activeTab]);

    const handleApprove = async (userId: string) => {
        try {
            await adminService.approveUser(userId);
            toast.success('Usuario aprobado con éxito');
            loadUsers();
        } catch (error) {
            toast.error('No se pudo aprobar al usuario');
        }
    };

    const handleDelete = async (userId: string) => {
        if (!window.confirm('¿ELIMINAR USUARIO? Esto borrará su perfil permanentemente.')) return;
        try {
            await adminService.deleteUser(userId);
            toast.success('Usuario eliminado');
            loadUsers();
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    return (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 z-[100] flex flex-col">
            <header className="h-16 bg-primary text-white flex items-center px-4 justify-between shadow-lg">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-all">
                        <FaArrowLeft size={18} />
                    </button>
                    <h1 className="font-black italic text-xl tracking-tighter uppercase font-mono">Panel de Control: JuanChat</h1>
                </div>
                <button onClick={loadUsers} className="p-2 hover:bg-white/20 rounded-full transition-all">
                    <FaSync className={loading ? 'animate-spin' : ''} />
                </button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-950">
                <div className="max-w-3xl mx-auto">
                    <div className="flex gap-4 mb-8">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-primary text-white shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-400'}`}
                        >
                            Pendientes
                        </button>
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'all' ? 'bg-primary text-white shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-400'}`}
                        >
                            Todos los Usuarios
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="font-black text-[10px] uppercase tracking-widest text-gray-400">Escaneando perfiles...</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                            <p className="text-gray-400 text-sm font-bold">No hay usuarios en esta sección.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {users.map(user => (
                                <div key={user.id} className="bg-white dark:bg-gray-900 p-4 rounded-3xl border dark:border-gray-800 flex items-center gap-4 shadow-sm">
                                    <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                                        {user.avatar_url ? (
                                            <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-primary font-black italic">{user.username?.[0]?.toUpperCase()}</div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">{user.full_name || user.username}</h3>
                                            {user.is_approved && <span className="px-2 py-0.5 bg-green-100 text-green-600 rounded-full text-[8px] font-black uppercase">Vip</span>}
                                        </div>
                                        <p className="text-[10px] font-mono text-gray-400">@{user.username}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {!user.is_approved && (
                                            <button
                                                onClick={() => handleApprove(user.id)}
                                                className="w-10 h-10 rounded-xl bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-all active:scale-90"
                                                title="Aprobar"
                                            >
                                                <FaUserCheck size={18} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(user.id)}
                                            className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all active:scale-90"
                                            title="Eliminar permanentemente"
                                        >
                                            <FaUserTimes size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
