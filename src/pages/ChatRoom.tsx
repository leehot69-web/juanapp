import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { messageService, type Message } from '../services/messageService';
import { chatService } from '../services/chatService';
import { FaPaperPlane, FaSmile, FaPlus, FaArrowLeft, FaUserCircle, FaUsers, FaInfoCircle, FaPalette, FaMicrophone, FaCamera, FaStop } from 'react-icons/fa';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';
import { storageService } from '../services/storageService';
import WhiteboardModal from '../components/chat/WhiteboardModal';

// Helper para detectar si un mensaje son solo emojis (máximo 3)
const isEmojiOnly = (text: string) => {
    const emojiRegex = /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])+$/g;
    const cleanText = text.replace(/\s/g, '');
    if (emojiRegex.test(cleanText)) {
        // Contar cuántos emojis hay (aproximado por longitud de caracteres especiales)
        const emojiCount = Array.from(cleanText).length;
        return emojiCount <= 3;
    }
    return false;
};

// Stickers 3D estilo Line/WhatsApp (usando Microsoft Fluent Emojis)
const STICKERS_3D = [
    { name: 'Risa', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Grinning%20Squinting%20Face.png' },
    { name: 'Amor', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Smiling%20Face%20with%20Heart-Eyes.png' },
    { name: 'Llanto', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Loudly%20Crying%20Face.png' },
    { name: 'Fuego', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/Fire.png' },
    { name: 'Bailando', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Man%20Dancing.png' },
    { name: 'Pensando', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Thinking%20Face.png' },
    { name: 'Sorpresa', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Astonished%20Face.png' },
    { name: 'Fiesta', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Partying%20Face.png' },
];

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
    const [recordingType, setRecordingType] = useState<'audio' | 'video' | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const videoPreviewRef = useRef<HTMLVideoElement>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<any>(null);
    const [showPlusMenu, setShowPlusMenu] = useState(false);

    const startRecording = async (type: 'audio' | 'video') => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: type === 'video'
            });

            if (type === 'video' && videoPreviewRef.current) {
                videoPreviewRef.current.srcObject = stream;
            }

            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: type === 'video' ? 'video/webm' : 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());

                const file = new File([blob], `media_${Date.now()}.${type === 'video' ? 'webm' : 'webm'}`, { type: blob.type });
                const loadingToast = toast.loading(`Enviando ${type === 'video' ? 'video' : 'audio'}...`);

                try {
                    const url = await storageService.uploadFile(file);
                    await messageService.sendMessage(chatId!, '', type, url);
                    toast.success(`${type === 'video' ? 'Video' : 'Audio'} enviado`, { id: loadingToast });
                } catch (error) {
                    toast.error('Error al enviar media', { id: loadingToast });
                }

                setRecordingType(null);
                setIsRecording(false);
            };

            recorder.start();
            setRecordingType(type);
            setIsRecording(true);
            const duration = type === 'video' ? 15 : 10;
            setTimeLeft(duration);

            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        stopRecording();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

        } catch (err) {
            toast.error('No se pudo acceder a la cámara o micrófono');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (timerRef.current) clearInterval(timerRef.current);
    };

    // Usar useRef para el audio para evitar que se recree en cada render
    const audioRef = useRef<HTMLAudioElement>(new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'));

    useEffect(() => {
        if (isWhiteboardOpen) {
            document.body.style.overflow = 'hidden';
            // No usamos position: fixed aquí porque causa saltos en móviles
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isWhiteboardOpen]);

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
                // Refrescar audio para asegurar que suena
                const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
                notificationSound.play().catch(e => console.log('Audio error:', e));

                // Notificación tipo Toast si el usuario no está mirando al fondo
                if (document.hidden) {
                    toast(`Nuevo mensaje de ${msg.profiles?.username || 'Chat'}`, { icon: '💬' });
                }
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

    const handleOpenWhiteboard = async () => {
        if (!chatId) return;
        setIsWhiteboardOpen(true);
        try {
            await messageService.sendMessage(chatId, '🎨 ha abierto la pizarra interactiva. ¡Entra para dibujar!', 'whiteboard_invite');
        } catch (error) {
            console.error('Error sending whiteboard invite:', error);
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
        <div className="flex flex-col h-full bg-[#efeae2] dark:bg-gray-950 relative overflow-hidden w-full max-w-full">
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
            <div className="flex-1 w-full overflow-y-auto px-2 sm:px-4 py-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-800 flex flex-col overflow-x-hidden min-w-0">
                <div className="flex justify-center mb-6 flex-none">
                    <span className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-gray-500 border dark:border-gray-700 shadow-sm">
                        Comienzo del cifrado seguro
                    </span>
                </div>

                <div className="w-full flex-1 space-y-4 min-w-0">
                    {messages.map((msg, index) => {
                        const isOwn = msg.sender_id === currentUserId;
                        const prevMsg = messages[index - 1];
                        const showHeader = !isOwn && chatInfo?.is_group && (!prevMsg || prevMsg.sender_id !== msg.sender_id);

                        return (
                            <div
                                key={msg.id}
                                className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                            >
                                <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[82%] sm:max-w-[75%] md:max-w-[70%] min-w-0`}>
                                    {showHeader && (
                                        <span className="text-[10px] font-black text-primary mb-1 ml-3 uppercase tracking-tighter">
                                            {msg.profiles?.username}
                                        </span>
                                    )}
                                    <div
                                        className={`p-3 relative shadow-sm ${msg.type === 'sticker'
                                            ? 'bg-transparent shadow-none'
                                            : isEmojiOnly(msg.content)
                                                ? 'bg-transparent shadow-none !p-0'
                                                : isOwn
                                                    ? 'bg-primary text-gray-900 rounded-2xl rounded-tr-none'
                                                    : 'bg-white dark:bg-gray-800 dark:text-gray-100 rounded-2xl rounded-tl-none'
                                            }`}
                                    >
                                        <div className={`leading-relaxed break-words overflow-wrap-anywhere font-medium ${isEmojiOnly(msg.content) ? 'text-5xl animate-bounce-subtle' : 'text-[14px]'
                                            }`} style={{ wordBreak: 'break-word' }}>
                                            {msg.type === 'image' ? (
                                                <div className="rounded-xl overflow-hidden mb-1 -m-1">
                                                    <img
                                                        src={msg.media_url}
                                                        alt="Mensaje de imagen"
                                                        className="w-full max-w-[300px] md:max-w-[400px] h-auto object-cover max-h-[500px]"
                                                        onClick={() => window.open(msg.media_url, '_blank')}
                                                    />
                                                </div>
                                            ) : msg.type === 'sticker' ? (
                                                <img
                                                    src={msg.media_url}
                                                    alt="Sticker"
                                                    className="w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-xl animate-bounce-subtle"
                                                />
                                            ) : msg.type === 'whiteboard_invite' ? (
                                                <div className="flex flex-col gap-2 items-center text-center py-2">
                                                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                                                        <FaPalette size={24} />
                                                    </div>
                                                    <div className="font-black text-xs uppercase tracking-widest">
                                                        Pizarra Activa
                                                    </div>
                                                    <p className="text-[10px] opacity-80">{msg.content}</p>
                                                    <button
                                                        onClick={() => setIsWhiteboardOpen(true)}
                                                        className={`mt-2 px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${isOwn ? 'bg-white text-primary' : 'bg-primary text-white'
                                                            }`}
                                                    >
                                                        Unirse ahora
                                                    </button>
                                                </div>
                                            ) : msg.type === 'video' ? (
                                                <div className="rounded-xl overflow-hidden mb-1 -m-1 bg-black aspect-video flex items-center justify-center">
                                                    <video
                                                        src={msg.media_url}
                                                        controls
                                                        className="h-full max-h-[300px] w-auto"
                                                    />
                                                </div>
                                            ) : msg.type === 'audio' ? (
                                                <div className="py-2 px-1 min-w-[200px]">
                                                    <audio src={msg.media_url} controls className="w-full h-8" />
                                                </div>
                                            ) : (
                                                msg.content
                                            )}
                                        </div>
                                        <div className={`text-[9px] mt-1.5 font-bold flex items-center justify-end gap-1 ${isOwn ? 'text-gray-900/60' : 'text-gray-400'
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

            {/* Emoji & Sticker Picker Overlay */}
            {showEmojiPicker && (
                <div className="absolute bottom-24 left-4 z-50 animate-in slide-in-from-bottom-5 duration-300 flex flex-col gap-2">
                    {/* Stickers Quick Tray */}
                    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md p-2 rounded-2xl shadow-xl flex gap-2 overflow-x-auto max-w-[350px] border border-gray-200 dark:border-gray-800">
                        {STICKERS_3D.map(sticker => (
                            <button
                                key={sticker.name}
                                onClick={async () => {
                                    if (chatId) {
                                        await messageService.sendMessage(chatId, '', 'sticker', sticker.url);
                                        setShowEmojiPicker(false);
                                    }
                                }}
                                className="w-12 h-12 flex-shrink-0 hover:scale-110 active:scale-95 transition-all p-1 bg-gray-50 dark:bg-gray-800 rounded-xl"
                            >
                                <img src={sticker.url} alt={sticker.name} className="w-full h-full object-contain" />
                            </button>
                        ))}
                    </div>

                    <EmojiPicker
                        onEmojiClick={onEmojiClick}
                        theme={Theme.AUTO}
                        emojiStyle={EmojiStyle.NATIVE}
                        width={350}
                        height={400}
                    />
                </div>
            )}

            {/* Recording Overlay */}
            {isRecording && (
                <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center text-white backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="relative w-[90%] max-w-sm aspect-video bg-gray-900 rounded-3xl overflow-hidden border-4 border-primary/50 shadow-2xl shadow-primary/20 mb-8">
                        {recordingType === 'video' ? (
                            <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center font-black text-primary text-xl tracking-[0.3em] uppercase">
                                GRABANDO AUDIO
                            </div>
                        )}
                        <div className="absolute top-4 right-4 bg-red-500 px-3 py-1 rounded-full text-[10px] font-black animate-pulse flex items-center gap-2 text-white">
                            <div className="w-2 h-2 bg-white rounded-full" /> {timeLeft}s
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={stopRecording}
                        className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-all active:scale-95 shadow-xl shadow-red-500/40 text-white"
                    >
                        <FaStop size={30} />
                    </button>
                    <p className="mt-4 font-black text-[10px] uppercase tracking-widest text-white/60">Grabando {recordingType === 'video' ? 'Video (15s)' : 'Audio (10s)'}...</p>
                </div>
            )}

            <div className="flex-none w-full p-2 sm:p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t dark:border-gray-800">
                <form onSubmit={handleSendMessage} className="w-full max-w-4xl mx-auto flex items-center gap-2">
                    <div className="flex items-center gap-0.5 sm:gap-1 relative">
                        <button
                            type="button"
                            onClick={() => setShowPlusMenu(!showPlusMenu)}
                            className={`p-2 transition-all active:scale-90 ${showPlusMenu ? 'text-primary rotate-45' : 'text-gray-500 hover:text-primary'}`}
                        >
                            <FaPlus size={18} />
                        </button>

                        {/* Menú Flotante del "+" */}
                        {showPlusMenu && (
                            <div className="absolute bottom-16 left-0 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-3xl shadow-2xl p-2 flex flex-col gap-2 min-w-[200px] animate-in slide-in-from-bottom-5 duration-200 z-50">
                                <button
                                    type="button"
                                    onClick={() => {
                                        fileInputRef.current?.click();
                                        setShowPlusMenu(false);
                                    }}
                                    className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all text-gray-600 dark:text-gray-300"
                                >
                                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                        <FaPlus size={14} />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-widest">Enviar Imagen</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        handleOpenWhiteboard();
                                        setShowPlusMenu(false);
                                    }}
                                    className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all text-gray-600 dark:text-gray-300"
                                >
                                    <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                                        <FaPalette size={14} />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-widest">Pizarra</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        startRecording('video');
                                        setShowPlusMenu(false);
                                    }}
                                    className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all text-gray-600 dark:text-gray-300"
                                >
                                    <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                                        <FaCamera size={14} />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-widest">Mensaje Video</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEmojiPicker(!showEmojiPicker);
                                        setShowPlusMenu(false);
                                    }}
                                    className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all text-gray-600 dark:text-gray-300"
                                >
                                    <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                                        <FaSmile size={14} />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-widest">Emoticones</span>
                                </button>
                            </div>
                        )}

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                            accept="image/*"
                        />

                        <button
                            type="button"
                            onClick={() => startRecording('audio')}
                            className={`p-2 transition-all active:scale-90 ${recordingType === 'audio' ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-primary'}`}
                            title="Mensaje de Voz"
                        >
                            <FaMicrophone size={18} />
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
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90 flex-shrink-0 shadow-lg border-2 ${!newMessage.trim()
                            ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 border-transparent shadow-none'
                            : 'bg-primary text-gray-950 border-primary/20 shadow-primary/40'
                            }`}
                    >
                        <FaPaperPlane size={20} className={!newMessage.trim() ? 'opacity-40' : 'opacity-100'} />
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
