import React, { useRef, useEffect, useState } from 'react';
import { whiteboardService } from '../../services/whiteboardService';
import type { Stroke } from '../../services/whiteboardService';
import { FaEraser, FaPencilAlt, FaTrash, FaTimes, FaSave } from 'react-icons/fa';
import toast from 'react-hot-toast';

interface WhiteboardModalProps {
    chatId: string;
    userId: string;
    onClose: () => void;
}

const WhiteboardModal: React.FC<WhiteboardModalProps> = ({ chatId, userId, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#25d366');
    const [brushSize, setBrushSize] = useState(5);
    const [isEraser, setIsEraser] = useState(false);
    const [currentStroke, setCurrentStroke] = useState<{ x: number, y: number }[]>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size to window size
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - 80;

        // Load existing strokes
        const loadInitialStrokes = async () => {
            try {
                const strokes = await whiteboardService.getStrokes(chatId);
                strokes.forEach(s => drawStroke(ctx, s));
            } catch (error) {
                console.error('Error loading strokes:', error);
            }
        };

        loadInitialStrokes();

        // Subscribe to real-time changes
        const subscription = whiteboardService.subscribeToStrokes(
            chatId,
            (newStroke) => drawStroke(ctx, newStroke),
            () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                toast.success('Pizarra limpiada por otro usuario');
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [chatId]);

    const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
        if (stroke.stroke_data.length < 2) return;

        ctx.beginPath();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.brush_size;

        ctx.moveTo(stroke.stroke_data[0].x, stroke.stroke_data[0].y);
        for (let i = 1; i < stroke.stroke_data.length; i++) {
            ctx.lineTo(stroke.stroke_data[i].x, stroke.stroke_data[i].y);
        }
        ctx.stroke();
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        const pos = getPos(e);
        setCurrentStroke([pos]);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const pos = getPos(e);

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        ctx.beginPath();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = isEraser ? '#ffffff' : color; // White for eraser (assuming white bg)
        ctx.lineWidth = brushSize;

        const lastPos = currentStroke[currentStroke.length - 1];
        ctx.moveTo(lastPos.x, lastPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();

        setCurrentStroke(prev => [...prev, pos]);
    };

    const stopDrawing = async () => {
        if (!isDrawing) return;
        setIsDrawing(false);

        if (currentStroke.length > 1) {
            const newStroke: Stroke = {
                chat_id: chatId,
                user_id: userId,
                stroke_data: currentStroke,
                color: isEraser ? '#ffffff' : color,
                brush_size: brushSize
            };
            try {
                await whiteboardService.saveStroke(newStroke);
            } catch (error) {
                console.error('Error saving stroke:', error);
            }
        }
        setCurrentStroke([]);
    };

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const handleClear = async () => {
        if (window.confirm('¿Quieres limpiar toda la pizarra? Todos lo verán.')) {
            try {
                await whiteboardService.clearWhiteboard(chatId);
                const canvas = canvasRef.current;
                const ctx = canvas?.getContext('2d');
                ctx?.clearRect(0, 0, canvas?.width || 0, canvas?.height || 0);
            } catch (error) {
                toast.error('Error al limpiar');
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-white z-[60] flex flex-col overflow-hidden animate-in fade-in duration-300">
            {/* Toolbar */}
            <div className="h-20 bg-gray-50 dark:bg-gray-900 border-b flex items-center px-4 justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-all">
                        <FaTimes size={20} />
                    </button>
                    <div className="h-8 w-[1px] bg-gray-200" />

                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsEraser(false)}
                            className={`p-3 rounded-xl transition-all ${!isEraser ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}
                        >
                            <FaPencilAlt size={18} />
                        </button>
                        <button
                            onClick={() => setIsEraser(true)}
                            className={`p-3 rounded-xl transition-all ${isEraser ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}
                        >
                            <FaEraser size={18} />
                        </button>
                    </div>

                    {!isEraser && (
                        <div className="flex gap-2 ml-4">
                            {['#25d366', '#34b7f1', '#ff5252', '#ffeb3b', '#9c27b0', '#000000'].map(c => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-primary scale-125' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleClear}
                        className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Limpiar todo"
                    >
                        <FaTrash size={18} />
                    </button>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 relative bg-white touch-none">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="cursor-crosshair w-full h-full"
                />

                {/* Overlay UI hints */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest pointer-events-none">
                    Pizarra Interactiva en Vivo
                </div>
            </div>
        </div>
    );
};

export default WhiteboardModal;
