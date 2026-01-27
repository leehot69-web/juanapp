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
                        JuanApp
                    </h1>
                    <div className="flex gap-1">
                        <button
                            onClick={() => {
                                supabase.auth.getUser().then(({ data }) => {
                                    const p = data.user?.email?.split('@')[0];
                                    const link = `${window.location.origin}/login?phone=${p}&pin=123456`;
                                    navigator.clipboard.writeText(link);
                                    toast.success('¡Link de acceso copiado!');
                                    window.open(`https://wa.me/?text=${encodeURIComponent('Hola! Entra a mi chat usando este link directo: ' + link)}`, '_blank');
                                });
                            }}
                            className="p-2 text-[#128c7e] hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all"
                            title="Compartir mi acceso"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
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
