import { supabase } from '../lib/supabase';

export const adminService = {
    async getPendingUsers() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('is_approved', false)
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async approveUser(userId: string) {
        const { error } = await supabase
            .from('profiles')
            .update({ is_approved: true })
            .eq('id', userId);

        if (error) throw error;
    },

    async rejectUser(userId: string) {
        // En lugar de borrar, podríamos simplemente dejarlo rechazado o borrarlo de auth
        // Por ahora lo borramos para que pueda re-intentar si fue un error
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (error) throw error;
    }
};
