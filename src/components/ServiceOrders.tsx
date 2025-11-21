import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Edit, Trash2, Printer, CircleCheck, Filter, FileText } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import NewServiceOrderModal from "@/components/modals/NewServiceOrderModal";
import EditServiceOrderModal from "@/components/modals/EditServiceOrderModal";
import { useToast } from "@/hooks/use-toast";
import { ServiceOrder } from "@/contexts/AppContext";
import ValidateInvoiceDataModal from "@/components/modals/ValidateInvoiceDataModal";
import { usePermissions } from "@/hooks/usePermissions";

const ServiceOrders = () => {
  const { serviceOrders: ordensServico, clients: clientes, vehicles: veiculos, invoices: notasFiscais, getClientById: obterClientePorId, getVehicleById: obterVeiculoPorId, updateServiceOrder: atualizarOrdemServico, deleteServiceOrder: excluirOrdemServico, getServiceOrderLimitStats: obterEstatisticasLimiteOrdens, user: usuario } = useApp();
  const { isAdmin: eAdministrador, canEdit: podeEditar } = usePermissions();
  const { toast: notificacao } = useToast();
  const [termoBusca, setTermoBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("Todas");
  const [exibirModalNovaOrdem, setExibirModalNovaOrdem] = useState(false);
  const [exibirModalEditarOrdem, setExibirModalEditarOrdem] = useState(false);
  const [ordemSelecionada, setOrdemSelecionada] = useState<ServiceOrder | null>(null);
  const [exibirModalValidacao, setExibirModalValidacao] = useState(false);
  const [errosValidacao, setErrosValidacao] = useState<string[]>([]);
  const [ordemSelecionadaValidacao, setOrdemSelecionadaValidacao] = useState<ServiceOrder | null>(null);
  const [estatisticasLimite, setEstatisticasLimite] = useState<{ usado: number; disponivel: number; total: number }>({ usado: 0, disponivel: 0, total: 0 });

  useEffect(() => {
    const carregarEstatisticasLimite = async () => {
      const estatisticas = await obterEstatisticasLimiteOrdens();
      setEstatisticasLimite({
        usado: estatisticas.used,
        disponivel: estatisticas.available,
        total: estatisticas.total
      });
    };
    carregarEstatisticasLimite();
  }, [ordensServico.length]);

  const formatarIdOrdem = (identificador: string | number): string => {
    let identificadorNumerico: number;

    if (typeof identificador === 'number') {
      identificadorNumerico = identificador;
    } else {
      const numeros = identificador.replace(/\D/g, '');
      if (numeros.length > 0) {
        identificadorNumerico = parseInt(numeros.substring(0, 5), 10) || 1;
      } else {
        let valorHash = 0;
        for (let indice = 0; indice < identificador.length; indice++) {
          valorHash = ((valorHash << 5) - valorHash) + identificador.charCodeAt(indice);
          valorHash = valorHash & valorHash;
        }
        identificadorNumerico = Math.abs(valorHash) % 99999 || 1;
      }
    }

    return `OS-${String(identificadorNumerico).padStart(5, '0')}`;
  };

  const ordensComDetalhes = [...ordensServico]
    .sort((ordemA, ordemB) => {
      const dataCriacaoA = new Date(ordemA.createdAt).getTime();
      const dataCriacaoB = new Date(ordemB.createdAt).getTime();
      return dataCriacaoB - dataCriacaoA;
    })
    .map(ordem => {
      const cliente = obterClientePorId(ordem.clientId);
      const veiculo = obterVeiculoPorId(ordem.vehicleId);

      return {
        ...ordem,
        clientName: cliente?.name || 'Cliente não encontrado',
        vehicleName: veiculo ? `${veiculo.brand} ${veiculo.model} ${veiculo.year}` : 'Veículo não encontrado',
        plate: veiculo?.plate || 'N/A'
      };
    });

  const obterBadgeStatus = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    const variantes: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      "Em andamento": "default",
      "Aguardando peças": "secondary",
      "Finalizada": "outline"
    };
    return variantes[status] || "default";
  };

  const obterCorPrioridade = (prioridade: string) => {
    const cores = {
      "Alta": "text-destructive",
      "Normal": "text-muted-foreground",
      "Baixa": "text-success"
    };
    return cores[prioridade as keyof typeof cores] || "text-muted-foreground";
  };

  function normalizarTexto(texto: string): string {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  const ordensFiltradas = ordensComDetalhes.filter(ordem => {
    const buscaNormalizada = normalizarTexto(termoBusca);

    const correspondeBusca = [
      ordem.clientName,
      ordem.id,
      ordem.vehicleName,
      ordem.plate,
    ].some(campo => normalizarTexto(campo || '').includes(buscaNormalizada));

    const correspondeStatus =
      filtroStatus.toLowerCase() === "todas" ||
      ordem.status.toLowerCase() === filtroStatus.toLowerCase();

    return correspondeBusca && correspondeStatus;
  });


  const opcoesStatus = [
    { value: "Todas", label: "Todas", count: ordensComDetalhes.length },
    { value: "Em andamento", label: "Em andamento", count: ordensComDetalhes.filter(ordem => ordem.status === "Em andamento").length },
    { value: "Aguardando peças", label: "Aguardando peças", count: ordensComDetalhes.filter(ordem => ordem.status === "Aguardando peças").length },
    { value: "Finalizada", label: "Finalizada", count: ordensComDetalhes.filter(ordem => ordem.status === "Finalizada").length }
  ];

  const tratarMudancaStatus = (identificadorOrdem: string, novoStatus: 'Em andamento' | 'Aguardando peças' | 'Finalizada') => {
    atualizarOrdemServico(identificadorOrdem, { status: novoStatus });
    notificacao({
      title: "Status atualizado",
      description: `Ordem ${formatarIdOrdem(identificadorOrdem)} alterada para ${novoStatus}`,
    });
  };

  const tratarExcluirOrdem = async (identificadorOrdem: string) => {
    if (confirm('Tem certeza que deseja excluir esta ordem de serviço?')) {
      try {
        await excluirOrdemServico(identificadorOrdem);
        const estatisticas = await obterEstatisticasLimiteOrdens();
        setEstatisticasLimite({
          usado: estatisticas.used,
          disponivel: estatisticas.available,
          total: estatisticas.total
        });
        notificacao({
          title: "Ordem excluída",
          description: "Ordem de serviço removida com sucesso",
        });
      } catch (erro: any) {
        notificacao({
          title: "Erro",
          description: erro.message || "Erro ao excluir ordem",
          variant: "destructive",
        });
      }
    }
  };

  const tratarCliqueNovaOrdem = async () => {
    const estatisticas = await obterEstatisticasLimiteOrdens();
    if (estatisticas.total > 0 && estatisticas.used >= estatisticas.total) {
      notificacao({
        title: "Limite excedido",
        description: `Você está usando ${estatisticas.used} de ${estatisticas.total} ordens disponíveis. Crie mais ordens no dashboard ou delete ordens existentes.`,
        variant: "destructive",
      });
      return;
    }
    setExibirModalNovaOrdem(true);
  };

  const possuiNotaFiscal = (ordem: ServiceOrder): boolean => {
    if ((ordem as any).nfe_numero || (ordem as any).nfse_numero) {
      return true;
    }
    return notasFiscais.some(nota => nota.service_order_id === ordem.id);
  };

  const tratarEditarOrdem = (ordem: ServiceOrder) => {
    if (ordem.status === 'Finalizada') {
      notificacao({
        title: "Aviso",
        description: "Ordens finalizadas não podem ser editadas",
        variant: "destructive",
      });
      return;
    }
    setOrdemSelecionada(ordem);
    setExibirModalEditarOrdem(true);
  };

  const tratarEmitirNotaFiscal = async (ordem: ServiceOrder, dadosFormulario?: any) => {
    if (ordem.status !== 'Finalizada') {
      notificacao({
        title: "Aviso",
        description: "Apenas ordens finalizadas podem ter nota fiscal emitida",
        variant: "destructive",
      });
      return;
    }
    
    if ((ordem as any).nfe_numero || (ordem as any).nfse_numero) {
      notificacao({
        title: "Aviso",
        description: "Esta ordem já possui notas fiscais emitidas",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const URL_BASE_API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const tokenAutenticacao = localStorage.getItem('authToken');
      
      const resposta = await fetch(`${URL_BASE_API}/api/service-orders/${ordem.id}/emitir-notas`, {
        method: 'POST',
        headers: {
          'Authorization': tokenAutenticacao ? `Bearer ${tokenAutenticacao}` : '',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(dadosFormulario || {}),
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        if (resultado.error === 'Erros de validação' && resultado.erros) {
          setErrosValidacao(resultado.erros);
          setOrdemSelecionadaValidacao(ordem);
          setExibirModalValidacao(true);
          return;
        }
        throw new Error(resultado.error || 'Erro ao emitir notas fiscais');
      }

      const informacoesNotas = [];
      if (resultado.notas_emitidas?.nfe) {
        informacoesNotas.push(`NF-e nº ${resultado.notas_emitidas.nfe.numero}`);
      }
      if (resultado.notas_emitidas?.nfse) {
        informacoesNotas.push(`NFS-e nº ${resultado.notas_emitidas.nfse.numero}`);
      }

      notificacao({
        title: "Notas Fiscais Emitidas",
        description: `Notas emitidas com sucesso: ${informacoesNotas.join(' e ')}`,
      });

      window.location.reload();

    } catch (erro: any) {
      console.error('Erro ao emitir notas fiscais:', erro);
      notificacao({
        title: "Erro",
        description: erro.message || "Erro ao emitir notas fiscais",
        variant: "destructive",
      });
    }
  };

  const tratarConfirmarValidacao = async (dadosFormulario: any) => {
    if (ordemSelecionadaValidacao) {
      await tratarEmitirNotaFiscal(ordemSelecionadaValidacao, dadosFormulario);
    }
  };

  const tratarImprimirOrdem = (ordem: any) => {
    const janelaImpressao = window.open('', '_blank');
    if (!janelaImpressao) {
      notificacao({
        title: "Erro",
        description: "Não foi possível abrir a janela de impressão",
        variant: "destructive",
      });
      return;
    }

    const conteudoImpressao = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ordem de Serviço - ${formatarIdOrdem(ordem.id)}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .subtitle {
              font-size: 16px;
              color: #666;
            }
            .order-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
              margin-bottom: 30px;
            }
            .section {
              margin-bottom: 20px;
            }
            .section h3 {
              border-bottom: 1px solid #ccc;
              padding-bottom: 5px;
              margin-bottom: 10px;
              font-size: 16px;
            }
            .field {
              margin-bottom: 8px;
            }
            .label {
              font-weight: bold;
              color: #333;
            }
            .value {
              color: #666;
            }
            .service-description {
              background: #f5f5f5;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .total {
              text-align: right;
              font-size: 18px;
              font-weight: bold;
              border-top: 2px solid #333;
              padding-top: 20px;
              margin-top: 30px;
            }
            .footer {
              margin-top: 50px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Ordem de Serviço</div>
          </div>

          <div class="order-info">
            <div class="section">
              <h3>Informações da Ordem</h3>
              <div class="field">
                <span class="label">Número da OS:</span>
                <span class="value">${formatarIdOrdem(ordem.id)}</span>
              </div>
              <div class="field">
                <span class="label">Data:</span>
                <span class="value">${new Date(ordem.date).toLocaleDateString('pt-BR')}</span>
              </div>
              <div class="field">
                <span class="label">Status:</span>
                <span class="value">${ordem.status}</span>
              </div>
              <div class="field">
                <span class="label">Prioridade:</span>
                <span class="value">${ordem.priority}</span>
              </div>
              ${ordem.createdBy ? `
              <div class="field">
                <span class="label">Emitido por:</span>
                <span class="value">${ordem.createdBy}</span>
              </div>
              ` : ''}
            </div>

            <div class="section">
              <h3>Cliente</h3>
              <div class="field">
                <span class="label">Nome:</span>
                <span class="value">${ordem.clientName}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>Veículo</h3>
            <div class="field">
              <span class="label">Veículo:</span>
              <span class="value">${ordem.vehicleName}</span>
            </div>
            <div class="field">
              <span class="label">Placa:</span>
              <span class="value">${ordem.plate}</span>
            </div>
          </div>

          <div class="section">
            <h3>Serviço</h3>
            <div class="service-description">
              ${ordem.service}
            </div>
          </div>

          <div class="total">
            <span class="label">Valor Total:</span>
            <span class="value">R$ ${Number(ordem.value || 0).toFixed(2)}</span>
          </div>

          <div class="footer">
            <p>WorkFlow OS - Sistema de Gestão para Oficinas | Desenvolvido pela Ramus Digital</p>
            <p>Data de impressão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
          </div>
        </body>
      </html>
    `;

    janelaImpressao.document.write(conteudoImpressao);
    janelaImpressao.document.close();
    janelaImpressao.focus();

    janelaImpressao.onload = () => {
      janelaImpressao.print();
      janelaImpressao.close();
    };

    notificacao({
      title: "Impressão",
      description: "Abrindo ordem de serviço para impressão",
    });
  };

  const tratarFinalizarOrdem = (ordem: ServiceOrder) => {
    if (ordem.status === 'Finalizada') {
      notificacao({
        title: "Aviso",
        description: "Esta ordem já está finalizada",
        variant: "destructive",
      });
      return;
    }

    if (confirm('Tem certeza que deseja finalizar esta ordem de serviço?')) {
      atualizarOrdemServico(ordem.id, { status: 'Finalizada' });
      notificacao({
        title: "Ordem Finalizada",
        description: `Ordem ${formatarIdOrdem(ordem.id)} foi finalizada com sucesso!`,
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Ordens de Serviço</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Gerencie todas as ordens de serviço</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          {!(estatisticasLimite.usado === 0 && estatisticasLimite.total === 0) && (
            <Badge 
              variant={estatisticasLimite.usado >= estatisticasLimite.total ? "destructive" : estatisticasLimite.usado >= estatisticasLimite.total * 0.8 ? "default" : "secondary"}
              className="text-xs sm:text-sm px-3 py-1 w-fit"
            >
              {estatisticasLimite.usado} de {estatisticasLimite.total} ordens utilizadas
            </Badge>
          )}
          {podeEditar('serviceOrders') && !(usuario?.role?.toLowerCase() === 'mecanico' || usuario?.role?.toLowerCase() === 'mecânico') && (
            <Button 
              className="gap-2 w-full sm:w-auto" 
              onClick={tratarCliqueNovaOrdem}
              title="Criar nova ordem de serviço"
            >
              <Plus className="h-4 w-4" />
              Nova Ordem
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por cliente, nº da ordem de serviço, veículo ou placa..."
                value={termoBusca}
                onChange={(evento) => setTermoBusca(evento.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Filtrar por Status:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {opcoesStatus.map((opcao) => (
                <Button
                  key={opcao.value}
                  variant={filtroStatus === opcao.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFiltroStatus(opcao.value)}
                  className="text-xs"
                >
                  {opcao.label}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {opcao.count}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {ordensFiltradas.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                {termoBusca || filtroStatus !== "Todas"
                  ? "Nenhuma ordem encontrada com os filtros aplicados"
                  : "Nenhuma ordem de serviço cadastrada"}
              </p>
            </CardContent>
          </Card>
        ) : (
          ordensFiltradas.map((ordem) => (
            <Card key={ordem.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg font-semibold text-foreground flex flex-wrap items-center gap-2 sm:gap-3">
                      {formatarIdOrdem(ordem.id)}
                      <Badge variant={obterBadgeStatus(ordem.status)} className="text-xs">{ordem.status}</Badge>
                      <span className={`text-xs sm:text-sm font-normal ${obterCorPrioridade(ordem.priority)}`}>
                        Prioridade: {ordem.priority}
                      </span>
                    </CardTitle>
                    <p className="text-muted-foreground">{ordem.clientName}</p>
                    {ordem.createdBy && (
                      <p className="text-xs text-muted-foreground mt-1">Emitido por: {ordem.createdBy}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!(usuario?.role?.toLowerCase() === 'mecanico' || usuario?.role?.toLowerCase() === 'mecânico') && podeEditar('serviceOrders') && (
                      <>
                        {ordem.status !== 'Finalizada' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => tratarFinalizarOrdem(ordem)}
                            title="Finalizar ordem de serviço"
                          >
                            <CircleCheck className="h-4 w-4" />
                          </Button>
                        )}
                        {ordem.status === 'Finalizada' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => tratarEmitirNotaFiscal(ordem)}
                            title={possuiNotaFiscal(ordem) ? 'Notas fiscais já emitidas' : 'Emitir Notas Fiscais'}
                            disabled={possuiNotaFiscal(ordem)}
                            className={possuiNotaFiscal(ordem) ? 'opacity-50 text-muted-foreground' : 'text-green-600 hover:text-green-700'}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                    {podeEditar('serviceOrders') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => tratarEditarOrdem(ordem)}
                        title={ordem.status === 'Finalizada' ? 'Ordens finalizadas não podem ser editadas' : 'Editar ordem de serviço'}
                        disabled={ordem.status === 'Finalizada'}
                        className={ordem.status === 'Finalizada' ? 'opacity-50' : ''}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => tratarImprimirOrdem(ordem)}
                      title="Imprimir ordem de serviço"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    {!(usuario?.role?.toLowerCase() === 'mecanico' || usuario?.role?.toLowerCase() === 'mecânico') && podeEditar('serviceOrders') && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => tratarExcluirOrdem(ordem.id)}
                        title="Excluir ordem de serviço"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-foreground">Veículo</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{ordem.vehicleName}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Placa: {ordem.plate}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-foreground">Serviço</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{ordem.service}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs sm:text-sm font-medium text-foreground">Valor</p>
                    <p className="text-base sm:text-lg font-bold text-primary">R$ {Number(ordem.value || 0).toFixed(2)}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Data: {new Date(ordem.date).toLocaleDateString('pt-BR')}</p>
                    {ordem.editedBy && (
                      <p className="text-xs text-muted-foreground mt-1">Editado por: {ordem.editedBy}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <NewServiceOrderModal 
        open={exibirModalNovaOrdem} 
        onOpenChange={async (aberto) => {
          setExibirModalNovaOrdem(aberto);
          if (!aberto) {
            try {
              const estatisticas = await obterEstatisticasLimiteOrdens();
              setEstatisticasLimite({
                usado: estatisticas.used,
                disponivel: estatisticas.available,
                total: estatisticas.total
              });
            } catch (erro) {
              console.error('Erro ao recarregar estatísticas:', erro);
            }
          }
        }} 
      />
      <EditServiceOrderModal
        open={exibirModalEditarOrdem}
        onOpenChange={setExibirModalEditarOrdem}
        order={ordemSelecionada}
      />
      <ValidateInvoiceDataModal
        open={exibirModalValidacao}
        onOpenChange={setExibirModalValidacao}
        orderId={ordemSelecionadaValidacao?.id || ''}
        errors={errosValidacao}
        onConfirm={tratarConfirmarValidacao}
      />
    </div>
  );
};

export default ServiceOrders;