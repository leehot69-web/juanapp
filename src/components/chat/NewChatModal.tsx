import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FaTimes, FaSearch, FaUserCircle, FaPaperPlane } from 'react-icons/fa';
import toast from 'react-hot-toast';

interface Profile {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
}

interface NewChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onChatCreated: () => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onChatCreated }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const searchUsers = async () => {
            if (searchTerm.trim().length < 2) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
                    .limit(10);

                if (error) throw error;
                setResults(data || []);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        const timeout = setTimeout(searchUsers, 300);
        return () => clearTimeout(timeout);
    }, [searchTerm]);

    const startChat = async (userId: string) => {
        if (creating) return;
        setCreating(true);
        const loadingToast = toast.loading('Creando chat...');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No estás autenticado");

            // 1. Create new chat record (Simplified for now)
            const { data: chatData, error: chatError } = await supabase
                .from('chats')
                .insert({ is_group: false })
                .select()
                .single();

            if (chatError) throw chatError;

            // 2. Add current user as participant (this should work with RLS)
            const { error: part1Error } = await supabase
                .from('chat_participants')
                .insert({ chat_id: chatData.id, user_id: user.id });

            if (part1Error) throw part1Error;

            // 3. Add the other user
            const { error: part2Error } = await supabase
                .from('chat_participants')
                .insert({ chat_id: chatData.id, user_id: userId });

            if (part2Error) {
                console.warn('RLS might be blocking adding other participants:', part2Error);
                // If this fails, we might need a DB trigger or function
                throw new Error("No se pudo agregar al otro usuario. Contacta al administrador.");
            }

            toast.success('¡Chat iniciado!');
            onChatCreated();
            onClose();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setCreating(false);
            toast.dismiss(loadingToast);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start md:items-center justify-center p-0 md:p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md h-full md:h-[600px] md:rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-primary text-white">
                    <div>
                        <h2 className="text-xl font-bold">Nuevo Chat</h2>
                        <p className="text-xs opacity-80">Busca a tus amigos</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <FaTimes size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="relative group">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Nombre de usuario o email..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-transparent border-gray-100 dark:border-gray-600 rounded-2xl focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-gray-800 transition-all shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-4">
                    {loading && (
                        <div className="flex flex-col items-center justify-center p-12 space-y-4">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 animate-pulse">Buscando usuarios...</p>
                        </div>
                    )}

                    {!loading && results.length === 0 && searchTerm.length >= 2 && (
                        <div className="text-center p-12 flex flex-col items-center">
                            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                                <FaSearch size={32} className="text-gray-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No se encontraron usuarios</h3>
                            <p className="text-sm text-gray-500">Intenta con otro nombre o correo</p>
                        </div>
                    )}

                    {!loading && results.length === 0 && searchTerm.length < 2 && (
                        <div className="text-center p-12 text-gray-400">
                            <p>Escribe al menos 2 letras para buscar</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        {results.map(profile => (
                            <button
                                key={profile.id}
                                onClick={() => startChat(profile.id)}
                                disabled={creating}
                                className="w-full flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-2xl transition-all active:scale-[0.98] border border-transparent hover:border-gray-100 dark:hover:border-gray-600 group"
                            >
                                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-4 border-2 border-white dark:border-gray-800 shadow-sm overflow-hidden group-hover:scale-110 transition-transform">
                                    {profile.avatar_url ? (
                                        <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                                    ) : (
                                        <FaUserCircle size={40} />
                                    )}
                                </div>
                                <div className="text-left flex-1">
                                    <div className="font-bold text-gray-900 dark:text-gray-100">{profile.username}</div>
                                    <div className="text-sm text-gray-500 truncate max-w-[200px]">{profile.full_name || 'Sin nombre completo'}</div>
                                </div>
                                <div className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                    <FaPaperPlane />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewChatModal;
