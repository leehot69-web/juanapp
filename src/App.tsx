import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import MainLayout from './components/layout/MainLayout';
import ChatRoom from './pages/ChatRoom';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center">Cargando...</div>;

  if (!session) {
    return <Navigate to="/login" replace />;
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
              <div className="text-6xl mb-4 text-primary opacity-20 italic font-bold">JuanApp</div>
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
