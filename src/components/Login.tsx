"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { User, Copy, Check } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LoginForm from "./LoginForm";

interface PropsPaginaLogin {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: PropsPaginaLogin) {
  const [carregando, setCarregando] = useState(false);
  const { login, isAuthenticated: estaAutenticado } = useApp();
  const [erro, setErro] = useState("");
  const [exibirDialogVersaoTeste, setExibirDialogVersaoTeste] = useState(false);
  const [copiado, setCopiado] = useState({ usuario: false, senha: false });

  useEffect(() => {
    setExibirDialogVersaoTeste(true);
  }, []);

  const tratarLogin = async (nomeUsuario: string, senhaUsuario: string) => {
    if (!nomeUsuario || !senhaUsuario) {
      setErro("Por favor, preencha usuário e senha");
      return;
    }

    setCarregando(true);
    setErro("");

    try {
      await login(nomeUsuario, senhaUsuario);
      setExibirDialogVersaoTeste(false);
      onLoginSuccess();
    } catch (erroLogin: any) {
      setErro(erroLogin.message || "Erro ao fazer login. Verifique suas credenciais.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <>
      <LoginForm 
        onLogin={tratarLogin}
        loading={carregando}
        error={erro}
      />

      <Dialog
        open={exibirDialogVersaoTeste}
        onOpenChange={() => {
        }}
      >
        <DialogContent
          className="max-w-[80vw] sm:max-w-[500px] md:max-w-[500px] md:mx-auto [&>button]:hidden flex flex-col"
          onInteractOutside={(evento) => evento.preventDefault()}
          onEscapeKeyDown={(evento) => evento.preventDefault()}
        >
          <div className="max-h-[60vh] overflow-y-auto overflow-x-hidden pr-2">
          <DialogHeader className="pb-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">

              <DialogTitle className="text-lg sm:text-xl text-[#43B2E0] font-semibold">
                Versão de Teste - WorkFlow OS
              </DialogTitle>



              <img
                src="/logo-login.svg"
                alt="Logo WorkFlow OS"
                className="w-8 h-8 sm:w-10 sm:h-10"
              />
            </div>

            <DialogDescription className="text-sm sm:text-base pt-2 space-y-3">
              <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                Você está acessando uma <strong>versão de demonstração</strong> do WorkFlow OS.
                Esta versão utiliza armazenamento local para fins de teste e avaliação.
              </p>

              <div className="bg-[#effaff] border border-[#43B2E0]/30 rounded-lg p-3 mt-2">
                <p className="text-xs sm:text-sm font-semibold text-[#075B7D] mb-2 flex items-center gap-2">
                  <User className="h-3 w-3 sm:h-4 sm:w-4" />
                  Use essas credenciais para acessar o sistema:
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-[#d1d1d1]">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-0.5">Usuário</p>
                      <p className="text-xs sm:text-sm font-light text-[#075B7D]">teste</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        navigator.clipboard.writeText("teste");
                        setCopiado({ ...copiado, usuario: true });
                        setTimeout(() => setCopiado({ ...copiado, usuario: false }), 2000);
                      }}
                    >
                      {copiado.usuario ? (
                        <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3 sm:h-4 sm:w-4 text-[#075B7D]" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-[#d1d1d1]">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-0.5">Senha</p>
                      <p className="text-xs sm:text-sm font-light text-[#075B7D]">workflow</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        navigator.clipboard.writeText("workflow");
                        setCopiado({ ...copiado, senha: true });
                        setTimeout(() => setCopiado({ ...copiado, senha: false }), 2000);
                      }}
                    >
                      {copiado.senha ? (
                        <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3 sm:h-4 sm:w-4 text-[#075B7D]" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg">
                <p className="text-xs sm:text-sm text-amber-800 font-medium mb-1.5">
                  ⚠️ Importante:
                </p>
                <ul className="text-xs sm:text-sm text-amber-700 space-y-0.5 list-disc list-inside">
                  <li>Os dados são armazenados localmente no seu navegador</li>
                  <li>Algumas funcionalidades podem não funcionar corretamente</li>
                  <li>Os dados podem ser perdidos ao limpar o cache do navegador</li>
                </ul>
              </div>





            </DialogDescription>
          </DialogHeader>
          </div>
          <DialogFooter className="mt-2 pt-2 flex-shrink-0">
            <Button
              onClick={() => {
                setExibirDialogVersaoTeste(false);
                if (estaAutenticado) {
                  onLoginSuccess();
                }
              }}
              className="bg-gradient-to-r bg-[#0891b2] text-white hover:bg-[#52b2d8] w-full sm:w-auto text-sm sm:text-base py-1.5 sm:py-2"
            >
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}