import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FaPaperPlane, FaSmile, FaPlus, FaArrowLeft, FaUserCircle } from 'react-icons/fa';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Message {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    type: string;
    profiles: {
        username: string;
    };
}

const ChatRoom: React.FC = () => {
    const { id: chatId } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [chatInfo, setChatInfo] = useState<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setCurrentUserId(user.id);
        };
        getUser();
    }, []);

    const fetchChatInfo = async () => {
        if (!chatId || !currentUserId) return;

        try {
            // Get chat details and other participant
            const { data: chatData } = await supabase
                .from('chats')
                .select('*')
                .eq('id', chatId)
                .single();

            if (chatData) {
                if (!chatData.is_group) {
                    const { data: participants, error } = await supabase
                        .from('chat_participants')
                        .select('user_id, profiles(username, avatar_url)')
                        .eq('chat_id', chatId)
                        .neq('user_id', currentUserId)
                        .maybeSingle();

                    if (participants && (participants as any).profiles) {
                        const prof = (participants as any).profiles;
                        setChatInfo({
                            name: prof.username?.split('@')[0] || 'Usuario',
                            avatar_url: prof.avatar_url
                        });
                    } else {
                        // Si no hay perfil, al menos mostramos algo para que no se quede en blanco
                        setChatInfo({ name: 'Chat Privado' });
                    }
                } else {
                    setChatInfo({ name: chatData.name || 'Grupo', is_group: true });
                }
            }
        } catch (e) {
            setChatInfo({ name: 'Conversación' });
        }
    };

    const fetchMessages = async () => {
        if (!chatId) return;
        const { data, error } = await supabase
            .from('messages')
            .select('*, profiles(username)')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });

        if (!error && data) {
            setMessages(data as any);
        }
    };

    useEffect(() => {
        fetchMessages();
        fetchChatInfo();

        const channel = supabase
            .channel(`chat:${chatId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `chat_id=eq.${chatId}`
            }, () => {
                fetchMessages();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [chatId, currentUserId]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !chatId || !currentUserId) return;

        const messageContent = newMessage;
        setNewMessage('');

        const { error } = await supabase
            .from('messages')
            .insert([
                {
                    chat_id: chatId,
                    sender_id: currentUserId,
                    content: messageContent,
                    type: 'text'
                }
            ]);

        if (error) {
            console.error('Error sending message:', error);
            toast.error('Error al enviar mensaje');
        }
    };

    return (
        <div className="flex flex-col h-full bg-transparent">
            {/* Header */}
            <div className="h-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b dark:border-gray-700 flex items-center px-4 gap-3 sticky top-0 z-20">
                <button
                    onClick={() => navigate('/')}
                    className="md:hidden p-2 -ml-2 text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                    <FaArrowLeft size={20} />
                </button>
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 overflow-hidden">
                    {chatInfo?.avatar_url ? (
                        <img src={chatInfo.avatar_url} alt={chatInfo.name} className="w-full h-full object-cover" />
                    ) : (
                        <FaUserCircle size={28} />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-gray-900 dark:text-gray-100 truncate">
                        {chatInfo?.name || 'Cargando...'}
                    </h2>
                    <p className="text-[10px] text-green-500 font-medium">en línea</p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                    const isOwn = msg.sender_id === currentUserId;
                    return (
                        <div
                            key={msg.id}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                        >
                            <div
                                className={`max-w-[85%] md:max-w-[70%] p-3 rounded-2xl shadow-sm relative ${isOwn
                                    ? 'bg-primary text-white rounded-tr-none'
                                    : 'bg-white dark:bg-gray-800 dark:text-gray-100 rounded-tl-none'
                                    }`}
                            >
                                {!isOwn && (
                                    <div className="text-[10px] text-primary font-bold mb-1">
                                        {msg.profiles?.username}
                                    </div>
                                )}
                                <div className="text-[15px] leading-relaxed break-words">{msg.content}</div>
                                <div className={`text-[10px] mt-1 text-right opacity-60`}>
                                    {format(new Date(msg.created_at), 'HH:mm')}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollRef} className="h-4" />
            </div>

            {/* Input Area */}
            <form onSubmit={sendMessage} className="p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md flex items-center gap-3 border-t dark:border-gray-700">
                <button type="button" className="text-gray-400 hover:text-primary transition-colors">
                    <FaSmile size={22} />
                </button>
                <button type="button" className="text-gray-400 hover:text-primary transition-colors">
                    <FaPlus size={20} />
                </button>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 py-3 px-4 rounded-2xl border-none focus:ring-2 focus:ring-primary/50 dark:bg-gray-700 dark:text-white bg-white shadow-inner transition-all"
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-primary text-white p-3 rounded-full hover:bg-green-600 transition-all hover:shadow-lg active:scale-90 disabled:opacity-50"
                >
                    <FaPaperPlane size={18} />
                </button>
            </form>
        </div>
    );
};

export default ChatRoom;
