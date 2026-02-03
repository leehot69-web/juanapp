import React, { useState, useRef, useEffect } from 'react';
import { userService } from '../../services/userService';
import type { Profile } from '../../services/userService';
import { storageService } from '../../services/storageService';
import { FaUserCircle, FaCamera, FaTrash, FaSignOutAlt, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

interface ProfileModalProps {
    onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const data = await userService.getCurrentProfile();
            if (data) {
                setProfile(data);
                setFullName(data.full_name || '');
                setUsername(data.username || '');
            }
        } catch (error) {
            toast.error('Error al cargar perfil');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        try {
            await userService.updateProfile({
                full_name: fullName,
                username: username.toLowerCase().replace(/\s+/g, '_')
            });
            toast.success('Perfil actualizado');
            onClose();
        } catch (error: any) {
            toast.error('Error: ' + error.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUpdating(true);
        const toastId = toast.loading('Subiendo foto...');
        try {
            const url = await storageService.uploadFile(file, 'avatars');
            await userService.updateProfile({ avatar_url: url });
            setProfile(prev => prev ? { ...prev, avatar_url: url } : null);
            toast.success('Foto actualizada', { id: toastId });
        } catch (error) {
            toast.error('Error al subir foto', { id: toastId });
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm('¿ESTÁS SEGURO? Esta acción es irreversible y se borrarán todos tus datos.')) return;

        const pin = window.prompt('Escribe "ELIMINAR" para confirmar:');
        if (pin !== 'ELIMINAR') return;

        try {
            await userService.deleteAccount();
            toast.success('Cuenta eliminada');
            window.location.href = '/login';
        } catch (error) {
            toast.error('Error al eliminar cuenta');
        }
    };

    if (loading) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <header className="p-6 flex items-center justify-between border-b dark:border-gray-800">
                    <h2 className="text-xl font-black italic">Tu Perfil</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all">
                        <FaTimes />
                    </button>
                </header>

                <div className="p-8">
                    <div className="flex flex-col items-center mb-8">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-3xl bg-gray-100 dark:bg-gray-800 overflow-hidden shadow-inner border-4 border-white dark:border-gray-800">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <FaUserCircle size={48} />
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-xl shadow-lg hover:scale-110 active:scale-90 transition-all"
                            >
                                <FaCamera size={16} />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleAvatarUpload}
                                className="hidden"
                                accept="image/*"
                            />
                        </div>
                    </div>

                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div>
                            <label className="text-xs font-black uppercase text-gray-400 ml-1">Nombre Completo</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full mt-1 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary outline-none transition-all dark:text-white"
                                placeholder="Tu nombre..."
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black uppercase text-gray-400 ml-1">Nombre de Usuario (ID)</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full mt-1 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 font-mono text-sm border-2 border-transparent focus:border-primary outline-none transition-all dark:text-white"
                                placeholder="juan_perez..."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={updating}
                            className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:bg-green-600 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {updating ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t dark:border-gray-800 flex flex-col gap-2">
                        <button
                            onClick={() => supabase.auth.signOut()}
                            className="flex items-center justify-center gap-2 w-full py-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 font-bold transition-all"
                        >
                            <FaSignOutAlt /> Cerrar Sesión
                        </button>
                        <button
                            onClick={handleDeleteAccount}
                            className="flex items-center justify-center gap-2 w-full py-3 text-red-400 hover:text-red-500 font-bold transition-all mt-4"
                        >
                            <FaTrash /> Eliminar Cuenta
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
