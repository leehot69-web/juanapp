import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { chatService } from '../../services/chatService';
import { userService } from '../../services/userService';
import { FaUserCircle, FaUsers, FaSearch, FaEllipsisV } from 'react-icons/fa';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const ChatList: React.FC = () => {
    const [chats, setChats] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { id: activeChatId } = useParams();

    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const fetchChats = async () => {
        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) return;
            setCurrentUserId(currentUser.id);

            const myChats = await chatService.getMyChats();

            const enrichedChats = await Promise.all(myChats.map(async (chat) => {
                let displayInfo = {
                    name: chat.name || 'Chat',
                    avatar_url: null as string | null,
                    is_group: chat.is_group
                };

                if (!chat.is_group) {
                    const participants = await chatService.getParticipants(chat.id);
                    // Filter out the current user to get the other person
                    const other = participants.find(p => p !== null && p.id !== currentUser.id);
                    if (other) {
                        displayInfo.name = other.full_name || other.username;
                        displayInfo.avatar_url = other.avatar_url;
                    }
                }

                // Obtener último mensaje para previsualización y conteo (opcional)
                const { data: lastMsg } = await supabase
                    .from('messages')
                    .select('content, created_at, type')
                    .eq('chat_id', chat.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                return {
                    ...chat,
                    displayInfo,
                    lastMessage: lastMsg
                };
            }));

            setChats(enrichedChats.sort((a, b) => {
                const dateA = a.lastMessage?.created_at || a.created_at;
                const dateB = b.lastMessage?.created_at || b.created_at;
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            }));
        } catch (error) {
            console.error('Error fetching chats:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChats();

        // 1. Suscripción para nuevos chats/grupos
        const chatSub = supabase
            .channel('public:chat_participants')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'chat_participants' },
                () => fetchChats()
            )
            .subscribe();

        // 2. Suscripción para nuevos mensajes (notificaciones)
        const msgSub = supabase
            .channel('public:messages_global')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload) => {
                    const newMsg = payload.new;
                    // Solo si el mensaje NO es mío y NO estoy en ese chat
                    if (newMsg.sender_id !== currentUserId && newMsg.chat_id !== activeChatId) {
                        setUnreadCounts(prev => ({
                            ...prev,
                            [newMsg.chat_id]: (prev[newMsg.chat_id] || 0) + 1
                        }));

                        // Sonido global de mensaje
                        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
                        audio.play().catch(() => { });

                        // Notificación visual flotante (Toast)
                        toast('Nuevo mensaje recibido', {
                            icon: '💬',
                            duration: 3000,
                            position: 'top-right',
                            style: {
                                background: '#00ff00',
                                color: '#000',
                                fontWeight: 'bold',
                                fontSize: '12px'
                            }
                        });

                        // Vibración si es móvil
                        if ('vibrate' in navigator) navigator.vibrate(100);

                        fetchChats();
                    }
                }
            )
            .subscribe();

        // 3. Suscripción a la tabla de chats (para grupos)
        const globalChatSub = supabase
            .channel('public:chats')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'chats' },
                () => fetchChats()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(chatSub);
            supabase.removeChannel(msgSub);
            supabase.removeChannel(globalChatSub);
        };
    }, [activeChatId]);

    // Limpiar notificaciones al entrar a un chat
    useEffect(() => {
        if (activeChatId) {
            setUnreadCounts(prev => ({ ...prev, [activeChatId]: 0 }));
        }
    }, [activeChatId]);

    const filteredChats = chats.filter(chat =>
        chat.displayInfo.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4 bg-gray-50 dark:bg-gray-900/50">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Sincronizando...</p>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800">
            {/* Search Bar */}
            <div className="p-4 border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
                <div className="relative group">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors text-xs" />
                    <input
                        type="text"
                        placeholder="Buscar conversaciones..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">
                {filteredChats.length === 0 ? (
                    <div className="p-10 text-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <FaSearch size={24} />
                        </div>
                        <p className="text-sm font-bold text-gray-500">No se encontraron chats</p>
                        <p className="text-[10px] text-gray-400 mt-1">Intenta con otro nombre o crea uno nuevo</p>
                    </div>
                ) : (
                    filteredChats.map((chat) => (
                        <div
                            key={chat.id}
                            onClick={() => navigate(`/chat/${chat.id}`)}
                            className={`flex items-center p-4 cursor-pointer transition-all border-b dark:border-gray-700/50 group active:scale-[0.98] ${activeChatId === chat.id
                                ? 'bg-primary/10 border-l-4 border-l-primary'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                                } min-h-[85px]`}
                        >
                            <div className="relative">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-sm overflow-hidden border-2 border-white dark:border-gray-700 ${chat.displayInfo.is_group
                                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                    : 'bg-gradient-to-br from-green-400 to-primary'
                                    }`}>
                                    {chat.displayInfo.avatar_url ? (
                                        <img src={chat.displayInfo.avatar_url} alt={chat.displayInfo.name} className="w-full h-full object-cover" />
                                    ) : (
                                        chat.displayInfo.is_group ? <FaUsers size={28} /> : <FaUserCircle size={32} />
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full shadow-sm" />
                            </div>

                            <div className="flex-1 min-w-0 ml-4">
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className={`font-black truncate text-sm tracking-tight ${activeChatId === chat.id ? 'text-primary' : 'text-gray-900 dark:text-gray-100'
                                        }`}>
                                        {chat.displayInfo.name}
                                    </h3>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                                        {chat.created_at ? format(new Date(chat.created_at), 'HH:mm') : ''}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate pr-4">
                                        {chat.lastMessage
                                            ? (chat.lastMessage.type === 'text' ? chat.lastMessage.content : `📎 ${chat.lastMessage.type}`)
                                            : (chat.displayInfo.is_group ? 'Grupo' : 'Chat Individual')}
                                    </p>
                                    {unreadCounts[chat.id] > 0 && (
                                        <div className="bg-primary text-gray-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow-lg shadow-primary/40">
                                            {unreadCounts[chat.id]}
                                        </div>
                                    )}
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <FaEllipsisV className="text-gray-300 text-[10px]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Current User Profile */}
            <CurrentUserProfile />
        </div>
    );
};

const CurrentUserProfile: React.FC = () => {
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        userService.getCurrentProfile().then(setProfile);
    }, []);

    if (!profile) return null;

    return (
        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-green-600 p-[2px] shadow-md group">
                <div className="w-full h-full rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                    {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                    ) : (
                        <FaUserCircle size={28} className="text-primary" />
                    )}
                </div>
            </div>
            <div className="flex-1 min-w-0 ml-3">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">Tu Perfil</span>
                    <p className="font-bold text-gray-900 dark:text-gray-100 truncate text-sm tracking-tight">
                        {profile.full_name || profile.username}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono italic">@{profile.username}</p>
                </div>
            </div>
        </div>
    );
};

export default ChatList;
