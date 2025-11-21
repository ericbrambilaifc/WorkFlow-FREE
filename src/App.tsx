import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { useState, useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./components/Login";

const clienteConsulta = new QueryClient();

const RotasApp = () => {
  const { isAuthenticated: estaAutenticado, isLoading: estaCarregando, logout: fazerLogout } = useApp();
  const [exibirPainel, setExibirPainel] = useState(false);

  const tratarSucessoLogin = () => {
    console.log('✅ Login bem-sucedido! Dados serão carregados automaticamente.');
    setExibirPainel(true);
  };

  useEffect(() => {
    if (!estaAutenticado) {
      setExibirPainel(false);
    }
  }, [estaAutenticado]);

  const tratarLogout = async () => {
    try {
      await fazerLogout();
      console.log('✅ Logout realizado com sucesso!');
    } catch (erro) {
      console.error('❌ Erro ao fazer logout:', erro);
    }
  };

  if (estaCarregando) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={
            estaAutenticado && exibirPainel ? <Index onLogout={tratarLogout} /> : <LoginPage onLoginSuccess={tratarSucessoLogin} />
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            estaAutenticado && exibirPainel ? <Index onLogout={tratarLogout} /> : <Navigate to="/" replace />
          } 
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={clienteConsulta}>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <RotasApp />
        </TooltipProvider>
      </AppProvider>
    </QueryClientProvider>
  );
};

export default App;
