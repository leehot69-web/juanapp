import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Efecto para detectar auto-login por URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlUser = params.get('user') || params.get('phone'); // Soportamos ambos por ahora
        const urlPin = params.get('pin');

        if (urlUser && urlPin) {
            setUsername(urlUser);
            setPassword(urlPin);
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

        const cleanUser = username.trim().toLowerCase().replace(/\s+/g, '_');
        if (cleanUser.length < 3) {
            toast.error('Nombre de usuario muy corto');
            setLoading(false);
            return;
        }

        const fakeEmail = `${cleanUser}@whoapp.io`;
        const cleanPassword = password.trim() || '123456';

        try {
            if (isRegistering) {
                const { data, error } = await supabase.auth.signUp({
                    email: fakeEmail,
                    password: cleanPassword,
                    options: {
                        data: {
                            full_name: username.trim(),
                            username: cleanUser
                        }
                    }
                });

                if (error) {
                    if (error.message.includes('already registered')) {
                        throw new Error('Ese usuario ya existe. Intenta otro.');
                    }
                    throw error;
                }

                if (data.session) {
                    const { user } = data.session;
                    await supabase.from('profiles').upsert({
                        id: user.id,
                        username: cleanUser,
                        full_name: username.trim(),
                        updated_at: new Date()
                    });
                    toast.success(`¡Bienvenido, ${username}!`);
                    navigate('/');
                } else {
                    toast.success('Sala creada. Haz login ahora.');
                    setIsRegistering(false);
                }
            } else {
                const { data: signInData, error } = await supabase.auth.signInWithPassword({
                    email: fakeEmail,
                    password: cleanPassword
                });

                if (error) {
                    if (error.message.includes('Invalid login credentials')) {
                        throw new Error('Usuario o clave incorrectos.');
                    }
                    throw error;
                }

                if (signInData.user) {
                    await supabase.from('profiles').upsert({
                        id: signInData.user.id,
                        username: cleanUser,
                        full_name: signInData.user.user_metadata.full_name || username.trim(),
                        updated_at: new Date()
                    });
                }

                toast.success('¡Hola de nuevo!');
                navigate('/');
            }
        } catch (error: any) {
            toast.error(error.message || 'Error de conexión');
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
                        {isRegistering ? 'Crea tu Identidad' : 'Entra a WhoApp'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-2 italic">Sin números expuestos. Chat 100% privado.</p>
                </div>

                <form onSubmit={handleAuth} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Nombre de Usuario / Sala</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black border-r border-gray-200 pr-3">@</span>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-[#25d366] outline-none transition-all font-bold text-lg dark:text-white"
                                placeholder="Ej: JuanPerez"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Pin de entrada</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-[#25d366] outline-none transition-all font-mono text-lg dark:text-white"
                            placeholder="Clave secreta"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-[#25d366] hover:bg-[#128c7e] text-white rounded-2xl font-black text-lg shadow-xl shadow-[#25d366]/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'CARGANDO...' : (isRegistering ? 'REGISTRARME' : 'ENTRAR AHORA')}
                    </button>
                </form>

                <div className="mt-8 text-center pt-6 border-t dark:border-gray-800">
                    <button
                        onClick={() => setIsRegistering(!isRegistering)}
                        className="text-[#128c7e] dark:text-[#25d366] font-bold text-sm hover:underline"
                    >
                        {isRegistering ? '¿Ya tienes usuario? Entra' : '¿No tienes usuario? Crea uno'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
