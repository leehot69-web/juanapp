import React, { useState, useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { FaCommentDots, FaUserCircle, FaDownload } from 'react-icons/fa';
import NewChatModal from '../chat/NewChatModal';
import ChatList from '../chat/ChatList';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import ProfileModal from './ProfileModal';

import AdminDashboard from '../../pages/AdminDashboard';

const MainLayout: React.FC = () => {
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [isAdminOpen, setIsAdminOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [logoClicks, setLogoClicks] = useState(0);
    const { id } = useParams();
    const isChatActive = !!id;

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setCurrentUser(user);
                // Cargar perfil para el avatar
                supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
                    if (data) setCurrentUser({ ...user, profile: data });
                });
            }
        });

        // PWA Install Prompt
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    const handleLogoClick = () => {
        const newClicks = logoClicks + 1;
        setLogoClicks(newClicks);

        if (newClicks === 5) {
            setLogoClicks(0);
            const pin = window.prompt('Introduce la clave de administración:');
            if (pin === '262626') {
                setIsAdminOpen(true);
            } else if (pin !== null) {
                toast.error('Clave incorrecta');
            }
        }
    };

    const handleChatCreated = () => {
        // Refresh chat list will be handled by the subscription in ChatList
    };

    return (
        <div className="flex h-[100dvh] bg-white dark:bg-gray-900 overflow-hidden w-full max-w-full">
            {/* Sidebar - Visible on desktop, or on mobile when no chat is active */}
            <div className={`
                ${isChatActive ? 'hidden md:flex' : 'flex'} 
                w-full md:w-[400px] border-r border-gray-200 dark:bg-gray-800 dark:border-gray-700 flex-col
            `}>
                <div className="p-4 bg-white dark:bg-gray-800 flex justify-between items-center h-16 border-b dark:border-gray-700">
                    <h1
                        onClick={handleLogoClick}
                        className="text-2xl font-bold bg-gradient-to-r from-primary to-green-600 bg-clip-text text-transparent italic cursor-pointer select-none"
                    >
                        JuanChat
                    </h1>
                    <div className="flex gap-1">
                        {deferredPrompt && (
                            <button
                                onClick={handleInstallClick}
                                className="p-2 text-primary hover:bg-primary/10 rounded-full transition-all flex items-center gap-2"
                                title="Instalar Aplicación"
                            >
                                <FaDownload size={18} />
                                <span className="hidden lg:inline text-xs font-black uppercase tracking-tighter">Instalar App</span>
                            </button>
                        )}
                        <button
                            onClick={() => {
                                const link = window.location.origin;
                                navigator.clipboard.writeText(link);
                                toast.success('Link de invitación copiado');
                                window.open(`https://wa.me/?text=${encodeURIComponent('¡Hola! Únete a mi JuanChat para que chateemos: ' + link)}`, '_blank');
                            }}
                            className="p-2 text-[#25d366] hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-all"
                            title="Invitar amigos"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setIsNewChatOpen(true)}
                            className="p-2 text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all active:scale-95"
                            title="Nuevo Chat"
                        >
                            <FaCommentDots size={22} />
                        </button>
                        <button
                            onClick={() => setIsProfileOpen(true)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-all active:scale-90"
                            title="Mi Perfil"
                        >
                            <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center border border-gray-200 dark:border-gray-700">
                                {currentUser?.profile?.avatar_url ? (
                                    <img src={currentUser.profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <FaUserCircle className="text-gray-400" size={24} />
                                )}
                            </div>
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden flex flex-col">
                    <ChatList />
                </div>
            </div>

            {/* Main Chat Area - Visible on desktop, or on mobile when a chat is active */}
            <div className={`
                ${isChatActive ? 'flex' : 'hidden md:flex'} 
                flex-1 flex flex-col bg-[#efeae2] dark:bg-gray-900 relative w-full min-w-0 overflow-hidden
            `}>
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                        backgroundSize: '400px'
                    }}>
                </div>
                <div className="flex-1 flex flex-col relative z-10 w-full md:max-w-5xl md:mx-auto md:shadow-2xl bg-white dark:bg-gray-900 overflow-hidden h-full">
                    <Outlet />
                </div>
            </div>

            <NewChatModal
                isOpen={isNewChatOpen}
                onClose={() => setIsNewChatOpen(false)}
                onChatCreated={handleChatCreated}
            />

            {isProfileOpen && (
                <ProfileModal onClose={() => setIsProfileOpen(false)} />
            )}

            {isAdminOpen && (
                <AdminDashboard onClose={() => setIsAdminOpen(false)} />
            )}
        </div>
    );
};

export default MainLayout;
