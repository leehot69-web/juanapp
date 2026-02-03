import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Profile {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
}

export interface Message {
    id: string;
    chat_id: string;
    content: string;
    sender_id: string;
    created_at: string;
    type: 'text' | 'image' | 'audio' | 'video' | 'file';
    profiles?: {
        username: string;
        avatar_url: string;
        full_name: string;
    };
}

export interface Chat {
    id: string;
    name: string | null;
    is_group: boolean;
    created_at: string;
    last_message?: string;
    last_message_time?: string;
}

interface ChatState {
    activeChatId: string | null;
    activeChatInfo: Chat | null;
    messages: Message[];
    loading: boolean;
    error: string | null;
}

const initialState: ChatState = {
    activeChatId: null,
    activeChatInfo: null,
    messages: [],
    loading: false,
    error: null,
};

const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        setActiveChat: (state, action: PayloadAction<{ id: string | null; info: Chat | null }>) => {
            state.activeChatId = action.payload.id;
            state.activeChatInfo = action.payload.info;
            state.messages = []; // Clear messages when switching chats
        },
        setMessages: (state, action: PayloadAction<Message[]>) => {
            state.messages = action.payload;
            state.loading = false;
        },
        addMessage: (state, action: PayloadAction<Message>) => {
            // Avoid duplicate messages if subscription and fetch overlap
            if (!state.messages.find(m => m.id === action.payload.id)) {
                state.messages.push(action.payload);
            }
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
            state.loading = false;
        }
    },
});

export const { setActiveChat, setMessages, addMessage, setLoading, setError } = chatSlice.actions;
export default chatSlice.reducer;
