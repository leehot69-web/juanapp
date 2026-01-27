import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const searchUsers = async () => {
            setLoading(true);
            try {
                let query = supabase.from('profiles').select('*');

                if (searchTerm.trim().length >= 2) {
                    // Si el usuario busca algo específico
                    query = query.or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`);
                } else {
                    // Si no busca nada, mostramos a los últimos registrados para que se encuentren
                    query = query.order('updated_at', { ascending: false }).limit(50);
                }

                const { data, error } = await query;
                if (error) throw error;

                // No mostrarse a uno mismo en la lista
                const { data: { user } } = await supabase.auth.getUser();
                setResults((data || []).filter(p => p.id !== user?.id));
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

            // 1. Check if a chat already exists between these two users
            const { data: existingChats, error: existingError } = await supabase
                .from('chat_participants')
                .select('chat_id')
                .eq('user_id', user.id);

            if (!existingError && existingChats) {
                const chatIds = existingChats.map(c => c.chat_id);

                // Find if any of these chats also have the other user
                const { data: matchingParticipant } = await supabase
                    .from('chat_participants')
                    .select('chat_id')
                    .in('chat_id', chatIds)
                    .eq('user_id', userId)
                    .maybeSingle();

                if (matchingParticipant) {
                    toast.success('Abriendo chat existente...');
                    onChatCreated();
                    onClose();
                    navigate(`/chat/${matchingParticipant.chat_id}`);
                    return;
                }
            }

            // 2. Create new chat record
            const { data: chatData, error: chatError } = await supabase
                .from('chats')
                .insert({ is_group: false })
                .select()
                .single();

            if (chatError) throw chatError;

            // 3. Add participants
            const { error: part1Error } = await supabase
                .from('chat_participants')
                .insert([
                    { chat_id: chatData.id, user_id: user.id },
                    { chat_id: chatData.id, user_id: userId }
                ]);

            if (part1Error) {
                console.warn('Error adding participants:', part1Error);
                throw new Error("No se pudo iniciar el chat.");
            }

            toast.success('¡Chat iniciado!');
            onChatCreated();
            onClose();
            navigate(`/chat/${chatData.id}`);
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
                            placeholder="Buscar por usuario..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-transparent border-gray-100 dark:border-gray-600 rounded-2xl focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-gray-800 transition-all shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-4">
                    <div className="mb-4">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 mb-2">
                            {searchTerm ? 'Resultados de búsqueda' : 'Directorio de Usuarios'}
                        </h3>
                        {results.length === 0 && !loading && (
                            <div className="text-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                                <p className="text-sm text-gray-500">No se encontraron usuarios</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        {results.map(profile => (
                            <button
                                key={profile.id}
                                onClick={() => startChat(profile.id)}
                                disabled={creating}
                                className="w-full flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-2xl transition-all active:scale-[0.98] border border-transparent hover:border-gray-100 dark:hover:border-gray-600 group"
                            >
                                <div className="w-14 h-14 rounded-full bg-[#128c7e]/10 flex items-center justify-center text-[#128c7e] mr-4 border-2 border-white dark:border-gray-800 shadow-sm overflow-hidden group-hover:scale-110 transition-transform">
                                    {profile.avatar_url ? (
                                        <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                                    ) : (
                                        <FaUserCircle size={40} />
                                    )}
                                </div>
                                <div className="text-left flex-1">
                                    <div className="font-bold text-gray-900 dark:text-gray-100 truncate">
                                        {profile.full_name || profile.username}
                                    </div>
                                    <div className="text-xs text-gray-400 font-mono italic">
                                        @{profile.username}
                                    </div>
                                </div>
                                <div className="text-[#128c7e] opacity-0 group-hover:opacity-100 transition-opacity">
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
