import { supabase } from '../lib/supabase';

export interface Chat {
    id: string;
    name: string | null;
    is_group: boolean;
    created_at: string;
}

export interface ChatParticipant {
    chat_id: string;
    user_id: string;
    joined_at: string;
}

export const chatService = {
    async getMyChats() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('chat_participants')
            .select(`
                chat_id,
                chats (
                    id,
                    name,
                    is_group,
                    created_at
                )
            `)
            .eq('user_id', user.id);

        if (error) throw error;
        return data.map(item => item.chats) as unknown as Chat[];
    },

    async getParticipants(chatId: string) {
        const { data, error } = await supabase
            .from('chat_participants')
            .select(`
                user_id,
                profiles (
                    id,
                    username,
                    full_name,
                    avatar_url
                )
            `)
            .eq('chat_id', chatId);

        if (error) throw error;

        return data.map(p => {
            const profile = p.profiles;
            // Handle case where profiles might be an array or a single object
            return Array.isArray(profile) ? profile[0] : profile;
        }).filter(p => !!p);
    },

    async createPersonalChat(otherUserId: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No estás autenticado');

        // Check for existing personal chat
        const { data: existingChats } = await supabase
            .from('chat_participants')
            .select('chat_id')
            .eq('user_id', user.id);

        if (existingChats) {
            const chatIds = existingChats.map(c => c.chat_id);
            const { data: matching } = await supabase
                .from('chat_participants')
                .select('chat_id')
                .in('chat_id', chatIds)
                .eq('user_id', otherUserId)
                .maybeSingle();

            if (matching) {
                // Check if this chat is indeed a personal chat (not a group where both are members)
                const { data: chatInfo } = await supabase
                    .from('chats')
                    .select('is_group')
                    .eq('id', matching.chat_id)
                    .single();

                if (chatInfo && !chatInfo.is_group) {
                    return matching.chat_id;
                }
            }
        }

        // Create new chat
        const { data: chat, error: chatError } = await supabase
            .from('chats')
            .insert({ is_group: false })
            .select()
            .single();

        if (chatError) throw chatError;

        await supabase.from('chat_participants').insert([
            { chat_id: chat.id, user_id: user.id },
            { chat_id: chat.id, user_id: otherUserId }
        ]);

        return chat.id;
    },

    async createGroupChat(name: string, members: string[]) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No estás autenticado');

        const { data: chat, error: chatError } = await supabase
            .from('chats')
            .insert({ name, is_group: true })
            .select()
            .single();

        if (chatError) throw chatError;

        const participants = [user.id, ...members].map(userId => ({
            chat_id: chat.id,
            user_id: userId
        }));

        const { error: partError } = await supabase
            .from('chat_participants')
            .insert(participants);

        if (partError) throw partError;

        return chat.id;
    }
};
