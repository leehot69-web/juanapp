import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface Message {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    type: 'text' | 'image' | 'audio' | 'video';
}

interface ChatState {
    activeChatId: string | null;
    messages: Message[];
    loading: boolean;
}

const initialState: ChatState = {
    activeChatId: null,
    messages: [],
    loading: false,
};

const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        setActiveChat: (state, action: PayloadAction<string | null>) => {
            state.activeChatId = action.payload;
        },
        setMessages: (state, action: PayloadAction<Message[]>) => {
            state.messages = action.payload;
        },
        addMessage: (state, action: PayloadAction<Message>) => {
            state.messages.push(action.payload);
        },
    },
});

export const { setActiveChat, setMessages, addMessage } = chatSlice.actions;
export default chatSlice.reducer;
