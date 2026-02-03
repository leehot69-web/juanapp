import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { messageService, type Message } from '../services/messageService';
import { chatService } from '../services/chatService';
import { FaPaperPlane, FaSmile, FaPlus, FaArrowLeft, FaUserCircle, FaUsers, FaInfoCircle, FaPalette } from 'react-icons/fa';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

import EmojiPicker, { Theme } from 'emoji-picker-react';
import { storageService } from '../services/storageService';
import WhiteboardModal from '../components/chat/WhiteboardModal';

const ChatRoom: React.FC = () => {
    const { id: chatId } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [chatInfo, setChatInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Usar useRef para el audio para evitar que se recree en cada render
    const audioRef = useRef<HTMLAudioElement>(new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'));

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setCurrentUserId(user.id);
        });
    }, []);

    const fetchChatDetails = async () => {
        if (!chatId || !currentUserId) return;

        try {
            const { data: chatData } = await supabase
                .from('chats')
                .select('*')
                .eq('id', chatId)
                .single();

            if (chatData) {
                let displayInfo = {
                    name: chatData.name || 'Chat',
                    avatar_url: null as string | null,
                    is_group: chatData.is_group,
                    description: chatData.is_group ? 'Grupo de JuanChat' : 'Chat Privado'
                };

                if (!chatData.is_group) {
                    const participants = await chatService.getParticipants(chatId);
                    const other = participants.find((p: any) => p && p.id !== currentUserId);
                    if (other) {
                        displayInfo.name = other.full_name || other.username;
                        displayInfo.avatar_url = other.avatar_url;
                    }
                }
                setChatInfo(displayInfo);
            }
        } catch (error) {
            console.error('Error fetching chat info:', error);
        }
    };

    const loadMessages = async () => {
        if (!chatId) return;
        try {
            const msgs = await messageService.getMessages(chatId);
            setMessages(msgs);
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!chatId || !currentUserId) return;

        setLoading(true);
        fetchChatDetails();
        loadMessages();

        const subscription = messageService.subscribeToMessages(chatId, (msg) => {
            if (msg.sender_id !== currentUserId) {
                // Play sound with a small delay or gesture check
                audioRef.current.play().catch(() => {
                    console.log('Interacción necesaria para el sonido');
                });
            }
            setMessages(prev => {
                if (prev.find(m => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
        });

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [chatId, currentUserId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'auto' });
        }
    }, [messages]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !chatId) return;

        const content = newMessage.trim();
        setNewMessage('');
        setShowEmojiPicker(false);

        try {
            await messageService.sendMessage(chatId, content);
        } catch (error) {
            toast.error('Error al enviar mensaje');
            setNewMessage(content);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !chatId) return;

        setUploading(true);
        const loadingToast = toast.loading('Subiendo imagen...');

        try {
            const publicUrl = await storageService.uploadFile(file);
            await messageService.sendMessage(chatId, '', 'image', publicUrl);
            toast.success('Imagen enviada');
        } catch (error) {
            toast.error('Error al subir imagen');
            console.error(error);
        } finally {
            setUploading(false);
            toast.dismiss(loadingToast);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const onEmojiClick = (emojiData: any) => {
        setNewMessage(prev => prev + emojiData.emoji);
    };

    if (loading) return (
        <div className="h-full flex flex-col items-center justify-center bg-[#efeae2] dark:bg-gray-950">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Desprotegiendo mensajes...</p>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-[#efeae2] dark:bg-gray-950 relative overflow-hidden">
            {/* Header - Fijo arriba */}
            <header className="flex-none h-16 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b dark:border-gray-800 flex items-center px-4 gap-4 z-30 shadow-sm">
                <button
                    onClick={() => navigate('/')}
                    className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all"
                >
                    <FaArrowLeft size={18} />
                </button>

                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-green-600 flex items-center justify-center text-white shadow-md overflow-hidden border-2 border-white dark:border-gray-800">
                    {chatInfo?.avatar_url ? (
                        <img src={chatInfo.avatar_url} alt={chatInfo.name} className="w-full h-full object-cover" />
                    ) : (
                        chatInfo?.is_group ? <FaUsers size={20} /> : <FaUserCircle size={24} />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h2 className="font-black text-gray-900 dark:text-gray-100 truncate text-sm tracking-tight leading-tight">
                        {chatInfo?.name || 'Chat'}
                    </h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        <p className="text-[9px] text-green-600 dark:text-green-500 font-black uppercase tracking-widest">En línea</p>
                    </div>
                </div>

                <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                    <FaInfoCircle size={20} />
                </button>
            </header>

            {/* Messages Area - Con Scroll Independiente y altura fija */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-800 flex flex-col">
                <div className="flex justify-center mb-6 flex-none">
                    <span className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-gray-500 border dark:border-gray-700 shadow-sm">
                        Comienzo del cifrado seguro
                    </span>
                </div>

                <div className="flex-1 space-y-4">
                    {messages.map((msg, index) => {
                        const isOwn = msg.sender_id === currentUserId;
                        const prevMsg = messages[index - 1];
                        const showHeader = !isOwn && chatInfo?.is_group && (!prevMsg || prevMsg.sender_id !== msg.sender_id);

                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                            >
                                <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[70%]`}>
                                    {showHeader && (
                                        <span className="text-[10px] font-black text-primary mb-1 ml-3 uppercase tracking-tighter">
                                            {msg.profiles?.username}
                                        </span>
                                    )}
                                    <div
                                        className={`p-3 relative shadow-sm ${isOwn
                                            ? 'bg-primary text-white rounded-2xl rounded-tr-none'
                                            : 'bg-white dark:bg-gray-800 dark:text-gray-100 rounded-2xl rounded-tl-none'
                                            }`}
                                    >
                                        <div className="text-[14px] leading-relaxed break-words font-medium">
                                            {msg.type === 'image' ? (
                                                <div className="rounded-xl overflow-hidden mb-1 -m-1">
                                                    <img
                                                        src={msg.media_url}
                                                        alt="Mensaje de imagen"
                                                        className="w-full max-w-[300px] md:max-w-[400px] h-auto object-cover max-h-[500px]"
                                                        onClick={() => window.open(msg.media_url, '_blank')}
                                                    />
                                                </div>
                                            ) : (
                                                msg.content
                                            )}
                                        </div>
                                        <div className={`text-[9px] mt-1.5 font-bold flex items-center justify-end gap-1 ${isOwn ? 'text-white/60' : 'text-gray-400'
                                            }`}>
                                            {format(new Date(msg.created_at), 'HH:mm')}
                                            {isOwn && (
                                                <svg viewBox="0 0 16 11" width="11" height="8" fill="currentColor">
                                                    <path d="M15.01 1.906L14.042.938 6.124 8.857 2.356 5.09l-.968.969 4.736 4.735 8.887-8.888z"></path>
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={scrollRef} className="h-2" />
                </div>
            </div>

            {/* Emoji Picker Overlay */}
            {showEmojiPicker && (
                <div className="absolute bottom-24 left-4 z-50 animate-in slide-in-from-bottom-5 duration-300">
                    <EmojiPicker
                        onEmojiClick={onEmojiClick}
                        theme={Theme.AUTO}
                        width={300}
                        height={400}
                    />
                </div>
            )}

            {/* Input Area - Fijo abajo */}
            <div className="flex-none p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t dark:border-gray-800">
                <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-2">
                    <div className="flex gap-1 mr-1">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                            accept="image/*"
                        />
                        <button
                            type="button"
                            onClick={() => setIsWhiteboardOpen(true)}
                            className="p-2 text-gray-400 hover:text-primary transition-all active:scale-90"
                            title="Pizarra Interactiva"
                        >
                            <FaPalette size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="p-2 text-gray-400 hover:text-primary transition-all active:scale-90"
                        >
                            <FaPlus size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className={`p-2 transition-all active:scale-90 hidden sm:block ${showEmojiPicker ? 'text-primary' : 'text-gray-400 hover:text-primary'}`}
                        >
                            <FaSmile size={20} />
                        </button>
                    </div>

                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onFocus={() => setShowEmojiPicker(false)}
                        placeholder="Escribe un mensaje seguro..."
                        className="flex-1 py-3 px-5 rounded-2xl border-2 border-transparent focus:border-primary/30 bg-gray-100 dark:bg-gray-800 dark:text-white outline-none transition-all text-sm font-medium shadow-inner"
                    />

                    <button
                        type="submit"
                        disabled={!newMessage.trim() || uploading}
                        className="bg-primary text-white w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-green-600 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-90 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                    >
                        <FaPaperPlane size={16} />
                    </button>
                </form>
            </div>
            {isWhiteboardOpen && chatId && currentUserId && (
                <WhiteboardModal
                    chatId={chatId}
                    userId={currentUserId}
                    onClose={() => setIsWhiteboardOpen(false)}
                />
            )}
        </div>
    );
};

export default ChatRoom;
