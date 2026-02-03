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

        // Ajustar al tamaño de la pantalla (Lienzo estático)
        const rect = canvas.parentElement?.getBoundingClientRect();
        canvas.width = rect?.width || window.innerWidth;
        canvas.height = rect?.height || (window.innerHeight - 80);

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
                if (canvas && ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            } catch (error) {
                toast.error('Error al limpiar');
            }
        }
    };

    const handleSendAsImage = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const toastId = toast.loading('Enviando dibujo al chat...');
        try {
            // Convertir canvas a blob
            const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
            const file = new File([blob], `whiteboard_${Date.now()}.png`, { type: 'image/png' });

            // Subir y enviar como mensaje de imagen
            const { messageService } = await import('../../services/messageService');
            const { storageService } = await import('../../services/storageService');

            const url = await storageService.uploadFile(file);
            await messageService.sendMessage(chatId, '', 'image', url);

            toast.success('¡Dibujo enviado!', { id: toastId });
            onClose();
        } catch (error) {
            toast.error('Error al enviar dibujo', { id: toastId });
        }
    };

    return (
        <div className="fixed inset-0 h-[100dvh] w-full bg-white z-[60] flex flex-col overflow-hidden animate-in fade-in duration-300">
            {/* Toolbar */}
            <div className="h-20 bg-gray-50 dark:bg-gray-900 border-b flex items-center px-4 justify-between shadow-sm">
                <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto scrollbar-hide py-2">
                    <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-all shrink-0">
                        <FaTimes size={18} />
                    </button>

                    <div className="flex gap-1 shrink-0">
                        <button
                            onClick={() => setIsEraser(false)}
                            className={`p-2.5 rounded-xl transition-all ${!isEraser ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}
                        >
                            <FaPencilAlt size={16} />
                        </button>
                        <button
                            onClick={() => setIsEraser(true)}
                            className={`p-2.5 rounded-xl transition-all ${isEraser ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}
                        >
                            <FaEraser size={16} />
                        </button>
                    </div>

                    {!isEraser && (
                        <div className="flex gap-1.5 px-2">
                            {[
                                '#00ff00', '#00ffff', '#ff00ff', '#ffff00', '#ffffff', '#ff4d4d'
                            ].map(c => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={`w-7 h-7 rounded-full border-2 transition-all shrink-0 ${color === c ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={handleSendAsImage}
                        className="bg-primary text-white p-2.5 sm:px-4 sm:py-2 rounded-xl flex items-center gap-2 font-black text-xs hover:bg-green-600 transition-all active:scale-95 shadow-lg shadow-primary/30"
                        title="Enviar al chat"
                    >
                        <FaSave size={16} /> <span className="hidden md:inline">ENVIAR</span>
                    </button>
                    <button
                        onClick={handleClear}
                        className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Limpiar"
                    >
                        <FaTrash size={16} />
                    </button>
                </div>
            </div>

            {/* Canvas Area (Lienzo Estático) */}
            <div className="flex-1 relative bg-[#0b141a] touch-none overflow-hidden">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="cursor-crosshair bg-[#0b141a] w-full h-full"
                    style={{
                        filter: isEraser ? 'none' : 'drop-shadow(0 0 5px currentColor)',
                    }}
                />

                {/* Overlay UI hints */}
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
                    <div className="bg-primary/20 backdrop-blur-md text-primary px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/30">
                        Pizarra en Vivo (Lienzo Fijo)
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WhiteboardModal;
