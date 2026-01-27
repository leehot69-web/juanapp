import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Efecto para detectar si viene con un link de acceso
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlPhone = params.get('phone');
        const urlPin = params.get('pin');

        if (urlPhone && urlPin) {
            setPhone(urlPhone);
            setPassword(urlPin);
            // Pequeño retraso para que el usuario vea que se autocompleta
            const timer = setTimeout(() => {
                const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
                btn?.click();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Convertimos el teléfono en un "email ficticio" para Supabase
        const cleanPhone = phone.trim().replace(/\D/g, ''); // Solo números
        if (cleanPhone.length < 8) {
            toast.error('Número de teléfono inválido');
            setLoading(false);
            return;
        }

        const fakeEmail = `${cleanPhone}@juanapp.com`;
        const cleanPassword = password.trim() || '123456';

        try {
            if (isRegistering) {
                const { data, error } = await supabase.auth.signUp({
                    email: fakeEmail,
                    password: cleanPassword,
                    options: {
                        data: {
                            full_name: cleanPhone,
                            phone_number: cleanPhone
                        }
                    }
                });

                if (error) {
                    if (error.message.includes('already registered')) {
                        throw new Error('Este número ya está registrado. Intenta Entrar.');
                    }
                    throw error;
                }

                if (data.session) {
                    toast.success('¡Número registrado! Bienvenido.');
                    navigate('/');
                } else {
                    toast.success('Cuenta creada. Ya puedes entrar.');
                    setIsRegistering(false);
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email: fakeEmail,
                    password: cleanPassword
                });

                if (error) {
                    if (error.message.includes('Invalid login credentials')) {
                        throw new Error('Número o clave incorrectos.');
                    }
                    throw error;
                }

                toast.success('¡Hola de nuevo!');
                navigate('/');
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al conectar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#075e54] dark:bg-gray-950 px-4 py-8">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 border-t-8 border-[#25d366]">
                <div className="text-center mb-10">
                    <div className="inline-block p-4 bg-[#25d366]/10 rounded-full mb-4">
                        <div className="text-5xl font-black text-[#25d366] italic">WhoApp</div>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                        {isRegistering ? 'Crea tu cuenta estilo WhatsApp' : 'Entra con tu Número'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-2">Seguro, rápido y sin complicados correos.</p>
                </div>

                <form onSubmit={handleAuth} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Número de WhatsApp</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold border-r border-gray-200 pr-3">+</span>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-[#25d366] outline-none transition-all font-mono text-lg dark:text-white"
                                placeholder="58 412 1234567"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Clave (Pin de entrada)</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-[#25d366] outline-none transition-all font-mono text-lg dark:text-white"
                            placeholder="Introduce tu PIN"
                            required
                        />
                        {!isRegistering && (
                            <p className="text-[10px] text-gray-400 mt-2 ml-1 italic">Si olvidaste tu clave, pídela al administrador.</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-[#25d366] hover:bg-[#128c7e] text-white rounded-2xl font-black text-lg shadow-xl shadow-[#25d366]/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'CONECTANDO...' : (isRegistering ? 'REGISTRARME' : 'ENTRAR AL CHAT')}
                    </button>
                </form>

                <div className="mt-8 text-center pt-6 border-t dark:border-gray-800">
                    <button
                        onClick={() => setIsRegistering(!isRegistering)}
                        className="text-[#128c7e] dark:text-[#25d366] font-bold text-sm hover:underline"
                    >
                        {isRegistering ? '¿Ya tienes cuenta? Entra aquí' : '¿No tienes cuenta aún? Regístrate gratis'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
