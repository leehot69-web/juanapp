import { supabase } from '../lib/supabase';

export interface Message {
    id: string;
    chat_id: string;
    sender_id: string;
    content: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'whiteboard_invite';
    media_url?: string;
    created_at: string;
    profiles?: {
        username: string;
        avatar_url: string;
        full_name: string;
    }
}

export const messageService = {
    async getMessages(chatId: string) {
        const { data, error } = await supabase
            .from('messages')
            .select('*, profiles(username, avatar_url, full_name)')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data as unknown as Message[];
    },

    async sendMessage(chatId: string, content: string, type: string = 'text', mediaUrl?: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No estás autenticado');

        const { data, error } = await supabase
            .from('messages')
            .insert({
                chat_id: chatId,
                sender_id: user.id,
                content,
                type,
                media_url: mediaUrl
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    subscribeToMessages(chatId: string, callback: (message: Message) => void) {
        return supabase
            .channel(`messages:${chatId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `chat_id=eq.${chatId}`
                },
                async (payload) => {
                    // Fetch full message with profile info
                    const { data, error } = await supabase
                        .from('messages')
                        .select('*, profiles(username, avatar_url, full_name)')
                        .eq('id', payload.new.id)
                        .single();

                    if (!error && data) {
                        callback(data as unknown as Message);
                    }
                }
            )
            .subscribe();
    }
};
