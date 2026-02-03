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
        // En Supabase, para borrar un usuario de auth necesitas privilegios de admin
        // Pero podemos marcar su perfil como borrado o simplemente borrar sus datos de perfil
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No autenticado');

        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', user.id);

        if (error) throw error;
        await supabase.auth.signOut();
    }
};
