import React, { useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { FaCommentDots, FaSignOutAlt } from 'react-icons/fa';
import NewChatModal from '../chat/NewChatModal';
import ChatList from '../chat/ChatList';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const MainLayout: React.FC = () => {
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const { id } = useParams();
    const isChatActive = !!id;

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const handleChatCreated = () => {
        // Refresh chat list will be handled by the subscription in ChatList
    };

    return (
        <div className="flex h-screen bg-white dark:bg-gray-900 overflow-hidden">
            {/* Sidebar - Visible on desktop, or on mobile when no chat is active */}
            <div className={`
                ${isChatActive ? 'hidden md:flex' : 'flex'} 
                w-full md:w-[400px] border-r border-gray-200 dark:bg-gray-800 dark:border-gray-700 flex-col
            `}>
                <div className="p-4 bg-white dark:bg-gray-800 flex justify-between items-center h-16 border-b dark:border-gray-700">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-green-600 bg-clip-text text-transparent italic">
                        WhoApp
                    </h1>
                    <div className="flex gap-1">
                        <button
                            onClick={() => {
                                const link = window.location.origin;
                                navigator.clipboard.writeText(link);
                                toast.success('Link de invitación copiado');
                                window.open(`https://wa.me/?text=${encodeURIComponent('¡Hola! Únete a mi WhoApp para que chateemos: ' + link)}`, '_blank');
                            }}
                            className="p-2 text-[#25d366] hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-all"
                            title="Invitar amigos"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => {
                                supabase.auth.getUser().then(({ data }) => {
                                    const p = data.user?.email?.split('@')[0];
                                    const link = `${window.location.origin}/login?phone=${p}&pin=123456`;

                                    // Mostramos un modal o una alerta clara
                                    const confirmKey = window.confirm(
                                        "ESTO ES TU LLAVE PRIVADA.\n\n" +
                                        "No se la envíes a nadie o podrán entrar a tu cuenta.\n" +
                                        "¿Quieres copiarla para guardarla en tus notas?"
                                    );

                                    if (confirmKey) {
                                        navigator.clipboard.writeText(link);
                                        toast.success('¡Llave privada copiada!');
                                    }
                                });
                            }}
                            className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full transition-all"
                            title="Mi Llave de Acceso (Privada)"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L7 17l-1 1-1 1H3v-2l1-1 1-1 1.257-1.257A6 6 0 1118 8zm-6-4a1 1 0 100 2h.01a1 1 0 100-2H12z" clipRule="evenodd" />
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
                            onClick={handleLogout}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
                            title="Salir"
                        >
                            <FaSignOutAlt size={20} />
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
                flex-1 flex flex-col bg-[#efeae2] dark:bg-gray-900 relative
            `}>
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                        backgroundSize: '400px'
                    }}>
                </div>
                <div className="flex-1 flex flex-col relative z-10 w-full max-w-5xl mx-auto shadow-2xl">
                    <Outlet />
                </div>
            </div>

            <NewChatModal
                isOpen={isNewChatOpen}
                onClose={() => setIsNewChatOpen(false)}
                onChatCreated={handleChatCreated}
            />
        </div>
    );
};

export default MainLayout;
