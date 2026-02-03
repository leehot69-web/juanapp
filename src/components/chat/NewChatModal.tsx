import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService, type Profile } from '../../services/userService';
import { chatService } from '../../services/chatService';
import { FaTimes, FaSearch, FaUserCircle, FaPaperPlane, FaUsers, FaUser, FaCheck, FaUsersCog } from 'react-icons/fa';
import toast from 'react-hot-toast';

interface NewChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onChatCreated: () => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onChatCreated }) => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<Profile[]>([]);
    const [creating, setCreating] = useState(false);

    // Group mode states
    const [mode, setMode] = useState<'individual' | 'group'>('individual');
    const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
    const [groupName, setGroupName] = useState('');

    useEffect(() => {
        if (!isOpen) return;

        const searchUsers = async () => {
            try {
                const users = await userService.searchUsers(searchTerm);
                setResults(users);
            } catch (error) {
                console.error(error);
                toast.error('Error al buscar usuarios');
            }
        };

        const timeout = setTimeout(searchUsers, 300);
        return () => clearTimeout(timeout);
    }, [searchTerm, isOpen]);

    const handleInviteAction = async (userId: string) => {
        if (mode === 'individual') {
            startIndividualChat(userId);
        } else {
            toggleUserSelection(userId);
        }
    };

    const toggleUserSelection = (userId: string) => {
        const user = results.find(u => u.id === userId);
        if (!user) return;

        setSelectedUsers(prev => {
            if (prev.find(u => u.id === userId)) {
                return prev.filter(u => u.id !== userId);
            } else {
                return [...prev, user];
            }
        });
    };

    const startIndividualChat = async (userId: string) => {
        if (creating) return;
        setCreating(true);
        const loadingToast = toast.loading('Iniciando chat...');

        try {
            const chatId = await chatService.createPersonalChat(userId);
            toast.success('¡Chat iniciado!');
            onChatCreated();
            onClose();
            navigate(`/chat/${chatId}`);
        } catch (error: any) {
            toast.error(error.message || 'Error al crear chat');
        } finally {
            setCreating(false);
            toast.dismiss(loadingToast);
        }
    };

    const createGroup = async () => {
        if (!groupName.trim()) {
            toast.error('Ingresa un nombre para el grupo');
            return;
        }
        if (selectedUsers.length === 0) {
            toast.error('Selecciona al menos un participante');
            return;
        }

        setCreating(true);
        const loadingToast = toast.loading('Creando grupo...');

        try {
            const memberIds = selectedUsers.map(u => u.id);
            const chatId = await chatService.createGroupChat(groupName.trim(), memberIds);
            toast.success('¡Grupo creado!');
            onChatCreated();
            onClose();
            navigate(`/chat/${chatId}`);
        } catch (error: any) {
            toast.error(error.message || 'Error al crear grupo');
        } finally {
            setCreating(false);
            toast.dismiss(loadingToast);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start md:items-center justify-center p-0 md:p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md h-full md:h-[650px] md:rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-primary to-green-600 text-white">
                    <div>
                        <h2 className="text-xl font-black italic tracking-tight">
                            {mode === 'individual' ? 'Nuevo Chat' : 'Nuevo Grupo'}
                        </h2>
                        <p className="text-[10px] uppercase font-bold tracking-widest opacity-80">
                            {mode === 'individual' ? 'Habla con alguien' : 'Crea una comunidad'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors active:scale-95">
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Mode Switcher */}
                <div className="flex p-2 bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-700">
                    <button
                        onClick={() => { setMode('individual'); setSelectedUsers([]); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${mode === 'individual' ? 'bg-white dark:bg-gray-800 text-primary shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800/50'}`}
                    >
                        <FaUser size={12} /> Individual
                    </button>
                    <button
                        onClick={() => setMode('group')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${mode === 'group' ? 'bg-white dark:bg-gray-800 text-primary shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800/50'}`}
                    >
                        <FaUsers size={14} /> Grupo
                    </button>
                </div>

                {/* Group Details (Only if group mode) */}
                {mode === 'group' && (
                    <div className="p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800 space-y-4">
                        <div className="relative group">
                            <FaUsersCog className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Nombre del grupo..."
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-primary focus:bg-white dark:focus:bg-gray-800 rounded-2xl outline-none transition-all text-sm font-bold shadow-inner"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                            />
                        </div>
                        {selectedUsers.length > 0 && (
                            <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                {selectedUsers.map(user => (
                                    <div key={user.id} className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase border border-primary/20">
                                        {user.username}
                                        <button onClick={() => toggleUserSelection(user.id)} className="hover:text-red-500 transition-colors">
                                            <FaTimes size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Search Bar */}
                <div className="p-4">
                    <div className="relative group">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar amigos por usuario..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-primary focus:bg-white dark:focus:bg-gray-800 rounded-2xl outline-none transition-all text-sm shadow-inner"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                    <div className="space-y-1">
                        {results.map(profile => {
                            const isSelected = selectedUsers.some(u => u.id === profile.id);
                            return (
                                <button
                                    key={profile.id}
                                    onClick={() => handleInviteAction(profile.id)}
                                    className={`w-full flex items-center p-3 rounded-2xl transition-all border-2 ${isSelected ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                                >
                                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 mr-4 border-2 border-white dark:border-gray-800 shadow-sm relative overflow-hidden">
                                        {profile.avatar_url ? (
                                            <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                                        ) : (
                                            <FaUserCircle size={32} />
                                        )}
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-primary/60 flex items-center justify-center text-white">
                                                <FaCheck size={16} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                                            {profile.full_name || profile.username}
                                        </div>
                                        <div className="text-[10px] text-gray-500 font-mono italic">
                                            @{profile.username}
                                        </div>
                                    </div>
                                    <div className={`transition-all ${isSelected ? 'text-primary' : 'text-gray-300'}`}>
                                        {mode === 'individual' ? <FaPaperPlane size={14} /> : (isSelected ? <FaCheck size={16} /> : <div className="w-4 h-4 border-2 border-gray-200 dark:border-gray-600 rounded-full" />)}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer (Group Action) */}
                {mode === 'group' && (
                    <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <button
                            onClick={createGroup}
                            disabled={creating || !groupName.trim() || selectedUsers.length === 0}
                            className="w-full py-4 bg-primary hover:bg-green-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                        >
                            Crear Grupo ({selectedUsers.length})
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewChatModal;
