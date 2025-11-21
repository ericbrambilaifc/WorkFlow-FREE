"use client";

import { useState } from "react";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

interface PropsFormularioLogin {
  onLogin: (nomeUsuario: string, senhaUsuario: string) => Promise<void>;
  loading: boolean;
  error: string;
}

export default function LoginForm({ onLogin, loading, error }: PropsFormularioLogin) {
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [senhaUsuario, setSenhaUsuario] = useState("");
  const [exibirSenha, setExibirSenha] = useState(false);

  const tratarEnvio = async () => {
    await onLogin(nomeUsuario, senhaUsuario);
  };

  const tratarTeclaPressionada = (evento: React.KeyboardEvent) => {
    if (evento.key === 'Enter') {
      tratarEnvio();
    }
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-white overflow-hidden px-4 sm:px-8 md:px-12 py-4 sm:py-12 md:py-16">
      <div className="w-full max-w-[380px] border-none mx-auto">
        <div className="flex justify-center mb-2 sm:mb-4">
          <img
            src="/logo-login.svg"
            alt="Logo WorkFlow OS"
            className="w-[80px] h-[80px] sm:w-[130px] sm:h-[130px] md:w-[150px] md:h-[150px]"
          />
        </div>

        <CardHeader className="px-0 mb-2 sm:mb-4">
          <h1 className="text-center text-[#43B2E0] text-base sm:text-xl md:text-2xl lg:text-3xl font-semibold mb-1 sm:mb-2">
            Seja bem vindo ao WorkFlow OS
          </h1>
        </CardHeader>

        <CardContent className="space-y-2 sm:space-y-4 px-0">
          <div className="relative py-0.5 sm:py-2">
            <Input
              placeholder="usuário"
              value={nomeUsuario}
              onChange={(evento) => setNomeUsuario(evento.target.value)}
              onKeyPress={tratarTeclaPressionada}
              className="pl-5 bg-[#effaff] text-[#075B7D] placeholder:text-[#075B7D] h-10 sm:h-12 rounded-3xl border border-[#d1d1d1] text-sm"
              style={{ outline: 'none', boxShadow: 'none' }}
              onFocus={(evento) => {
                evento.target.style.outline = 'none';
                evento.target.style.boxShadow = 'none';
                evento.target.style.borderColor = '#d1d1d1';
              }}
            />
          </div>

          <div className="relative py-0.5 sm:py-2">
            <Input
              placeholder="senha"
              type={exibirSenha ? "text" : "password"}
              value={senhaUsuario}
              onChange={(evento) => setSenhaUsuario(evento.target.value)}
              onKeyPress={tratarTeclaPressionada}
              className="pl-5 bg-[#effaff] text-[#075B7D] placeholder:text-[#075B7D] h-10 sm:h-12 rounded-3xl border border-[#d1d1d1] text-sm"
              style={{ outline: 'none', boxShadow: 'none' }}
              onFocus={(evento) => {
                evento.target.style.outline = 'none';
                evento.target.style.boxShadow = 'none';
                evento.target.style.borderColor = '#d1d1d1';
              }}
            />
            {exibirSenha ? (
              <EyeOff
                className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#075B7D] cursor-pointer"
                onClick={() => setExibirSenha(!exibirSenha)}
              />
            ) : (
              <Eye
                className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#075B7D] cursor-pointer"
                onClick={() => setExibirSenha(!exibirSenha)}
              />
            )}
          </div>

          {error && (
            <div className="text-red-500 text-xs sm:text-sm text-center mt-1 sm:mt-2">
              {error}
            </div>
          )}

          <div className="w-full flex justify-center items-center pt-1 sm:pt-3">
            <div className="flex justify-center w-full">
              <Button
                className="group relative bg-gradient-to-r from-[#61b1c5] to-[#43B2E0] text-white rounded-full font-semibold hover:shadow-lg active:scale-95 transition-all duration-300 ease-out overflow-hidden disabled:opacity-50 w-full sm:w-auto flex items-center justify-center"
                style={{ fontSize: '14px', padding: '12px 48px 12px 24px', letterSpacing: '0.5px' }}
                onClick={tratarEnvio}
                disabled={loading}
              >
                <span className="relative z-10 pr-2">{loading ? "Entrando..." : "Entrar"}</span>

                <div className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-all duration-300">
                  <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform duration-300" />
                </div>

                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
              </Button>
            </div>
          </div>
        </CardContent>
      </div>
    </div>
  );
}

