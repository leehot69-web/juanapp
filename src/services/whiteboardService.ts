import { supabase } from '../lib/supabase';

export interface Stroke {
    id?: string;
    chat_id: string;
    user_id: string;
    stroke_data: { x: number, y: number }[];
    color: string;
    brush_size: number;
}

export const whiteboardService = {
    async getStrokes(chatId: string) {
        const { data, error } = await supabase
            .from('whiteboard_strokes')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data as Stroke[];
    },

    async saveStroke(stroke: Stroke) {
        const { error } = await supabase
            .from('whiteboard_strokes')
            .insert(stroke);

        if (error) throw error;
    },

    async clearWhiteboard(chatId: string) {
        const { error } = await supabase
            .from('whiteboard_strokes')
            .delete()
            .eq('chat_id', chatId);

        if (error) throw error;
    },

    subscribeToStrokes(chatId: string, onNewStroke: (stroke: Stroke) => void, onClear: () => void) {
        return supabase
            .channel(`whiteboard:${chatId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'whiteboard_strokes',
                    filter: `chat_id=eq.${chatId}`
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        onNewStroke(payload.new as Stroke);
                    } else if (payload.eventType === 'DELETE') {
                        onClear();
                    }
                }
            )
            .subscribe();
    }
};
