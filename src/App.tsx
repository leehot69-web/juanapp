import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import MainLayout from './components/layout/MainLayout';
import ChatRoom from './pages/ChatRoom';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const checkApproval = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setIsApproved(data?.is_approved || false);
    } catch (e) {
      console.error('Error checking approval:', e);
      setIsApproved(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkApproval(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkApproval(session.user.id);
      } else {
        setIsApproved(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Verificando credenciales...</p>
    </div>
  );

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (isApproved === false) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#efeae2] dark:bg-gray-950 p-6 text-center">
        <div className="w-24 h-24 bg-white dark:bg-gray-900 rounded-3xl shadow-xl flex items-center justify-center mb-8 rotate-3">
          <div className="text-4xl text-primary italic font-black">Who</div>
        </div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2 italic">¡Casi listo!</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-xs text-sm font-medium leading-relaxed">
          Tu cuenta está siendo revisada por el administrador.
          Te avisaremos en cuanto puedas empezar a mensajear.
        </p>
        <div className="mt-8 flex gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-12 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={
            <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-gray-50 dark:bg-gray-800">
              <div className="text-6xl mb-4 text-primary opacity-20 italic font-bold">JuanChat</div>
              <p>Selecciona un chat para empezar a mensajear</p>
              <p className="text-xs mt-2 opacity-50">Cifrado de extremo a extremo (estilo familiar)</p>
            </div>
          } />
          <Route path="chat/:id" element={<ChatRoom />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
