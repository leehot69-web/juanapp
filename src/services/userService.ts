import { supabase } from '../lib/supabase';

export interface Profile {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    updated_at: string;
}

export const userService = {
    async getCurrentProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) throw error;
        return data as Profile;
    },

    async searchUsers(term: string) {
        let query = supabase.from('profiles').select('*');

        if (term.trim().length >= 2) {
            query = query.or(`username.ilike.%${term}%,full_name.ilike.%${term}%`);
        } else {
            query = query.order('updated_at', { ascending: false }).limit(20);
        }

        const { data, error } = await query;
        if (error) throw error;

        const { data: { user } } = await supabase.auth.getUser();
        return (data || []).filter(p => p.id !== user?.id) as Profile[];
    },

    async getProfileById(userId: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data as Profile;
    },
    async updateProfile(updates: Partial<Profile>) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No autenticado');

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

        if (error) throw error;
    },

    async deleteAccount() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No autenticado');

        // 1. Borrar sus mensajes (evita error de clave foránea)
        await supabase
            .from('messages')
            .delete()
            .eq('sender_id', user.id);

        // 2. Borrar su participación en chats
        await supabase
            .from('chat_participants')
            .delete()
            .eq('user_id', user.id);

        // 3. Borrar el perfil público
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', user.id);

        if (error) throw error;

        // 4. Salir de la sesión (El usuario en 'auth.users' solo se puede borrar vía Admin/Dashboard)
        await supabase.auth.signOut();
    }
};
