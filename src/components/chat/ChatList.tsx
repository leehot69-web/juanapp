import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import { FaUserCircle, FaCommentDots } from 'react-icons/fa';

interface Chat {
    id: string;
    name: string;
    is_group: boolean;
    last_message?: string;
    last_message_time?: string;
    other_user?: {
        username: string;
        avatar_url: string;
    };
}

const ChatList: React.FC = () => {
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { id: activeChatId } = useParams();

    const fetchChats = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Complex query to get chats with participants and last message
            // Simplified for now: Get chats where user is participant
            const { data, error } = await supabase
                .from('chat_participants')
                .select(`
          chat_id,
          chats (
            id,
            name,
            is_group
          )
        `)
                .eq('user_id', user.id);

            if (error) throw error;

            const formattedChats: Chat[] = await Promise.all((data || []).map(async (item: any) => {
                const chat = item.chats;

                // If not a group, find the other participant's name
                let otherUser = null;
                if (!chat.is_group) {
                    const { data: participants } = await supabase
                        .from('chat_participants')
                        .select(`
              user_id,
              profiles (username, avatar_url)
            `)
                        .eq('chat_id', chat.id)
                        .neq('user_id', user.id)
                        .single();

                    if (participants) {
                        otherUser = (participants as any).profiles;
                    }
                }

                return {
                    id: chat.id,
                    name: chat.name || otherUser?.username || 'Chat',
                    is_group: chat.is_group,
                    other_user: otherUser
                };
            }));

            setChats(formattedChats);
        } catch (error) {
            console.error('Error fetching chats:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChats();

        // Subscribe to new messages or chat changes
        const subscription = supabase
            .channel('public:chat_participants')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_participants' }, () => {
                fetchChats();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    if (loading) return <div className="p-4 text-center text-gray-500">Cargando chats...</div>;

    if (chats.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 dark:bg-gray-800/50">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                    <FaCommentDots size={40} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Sin chats</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[200px]">
                    Haz clic en el icono superior para iniciar una conversación.
                </p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            {chats.map((chat) => (
                <div
                    key={chat.id}
                    onClick={() => navigate(`/chat/${chat.id}`)}
                    className={`flex items-center p-3 cursor-pointer hover:bg-gray-100 transition-colors border-b dark:hover:bg-gray-700 dark:border-gray-700 ${activeChatId === chat.id ? 'bg-gray-200 dark:bg-gray-600' : ''
                        }`}
                >
                    <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 mr-3 overflow-hidden shadow-sm">
                        {chat.other_user?.avatar_url ? (
                            <img src={chat.other_user.avatar_url} alt={chat.name} className="w-full h-full object-cover" />
                        ) : (
                            <FaUserCircle size={32} />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                {chat.name}
                            </h3>
                            <span className="text-xs text-gray-500">
                                {chat.last_message_time || ''}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {chat.last_message || 'Haz clic para chatear'}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ChatList;
