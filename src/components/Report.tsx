import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  Download, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  Users, 
  Wrench, 
  Package, 
  Receipt,
  Loader2,
  BarChart3,
  PieChart,
  DollarSign
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { VersionRestrictionNotice } from "@/components/VersionRestrictionNotice";

interface RelatorioOS {
  periodo: {
    inicio: string;
    fim: string;
  };
  resumo: {
    total_os: number;
    abertas: number;
    em_andamento: number;
    aguardando_pecas: number;
    finalizadas: number;
    canceladas: number;
    tempo_medio_execucao_horas: number;
    valor_total_faturado: number;
    valor_total_faturado_formatado: string;
  };
  ordens_servico: any[];
}

interface RelatorioMecanicos {
  periodo: {
    inicio: string;
    fim: string;
  };
  mecanicos: Array<{
    mecanico_id: string;
    mecanico_nome: string;
    total_os: number;
    os_finalizadas: number;
    taxa_conclusao_formatada: string;
    valor_total_formatado: string;
    ranking: number;
  }>;
  total_mecanicos: number;
}

interface RelatorioPecas {
  periodo: {
    inicio: string;
    fim: string;
  };
  resumo: {
    total_pecas_diferentes: number;
    quantidade_total_utilizada: number;
    valor_total_vendido_formatado: string;
    lucro_total_formatado: string;
    margem_lucro_percent: number;
    total_alertas_estoque: number;
  };
  top_10_pecas: any[];
  alertas_estoque: any[];
}

interface RelatorioFinanceiro {
  periodo: {
    inicio: string;
    fim: string;
  };
  resumo: {
    receita_total_formatada: string;
    receita_servicos_formatada: string;
    receita_pecas_formatada: string;
    custo_pecas_formatado: string;
    lucro_bruto_formatado: string;
    margem_lucro_formatada: string;
  };
  receita_por_tipo_servico: any[];
  receita_por_mecanico: any[];
  comparativo_mensal: any[];
}

interface RelatorioNotasFiscais {
  periodo: {
    inicio: string;
    fim: string;
  };
  resumo: {
    total_notas: number;
    valor_total_formatado: string;
  };
  notas_fiscais: any[];
}

interface RelatorioClientes {
  periodo: {
    inicio: string;
    fim: string;
  };
  resumo: {
    total_clientes: number;
    ticket_medio_geral_formatado: string;
  };
  clientes: any[];
  clientes_mais_frequentes: any[];
}

const Report = () => {
  const { toast } = useToast();
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  const [dataInicio, setDataInicio] = useState<Date | undefined>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date;
  });
  const [dataFim, setDataFim] = useState<Date | undefined>(() => {
    return new Date();
  });
  const [tipoRelatorio, setTipoRelatorio] = useState<string>("completo");
  const [loading, setLoading] = useState(false);
  
  // Dados dos relatórios
  const [relatorioOS, setRelatorioOS] = useState<RelatorioOS | null>(null);
  const [relatorioMecanicos, setRelatorioMecanicos] = useState<RelatorioMecanicos | null>(null);
  const [relatorioPecas, setRelatorioPecas] = useState<RelatorioPecas | null>(null);
  const [relatorioFinanceiro, setRelatorioFinanceiro] = useState<RelatorioFinanceiro | null>(null);
  const [relatorioNotasFiscais, setRelatorioNotasFiscais] = useState<RelatorioNotasFiscais | null>(null);
  const [relatorioClientes, setRelatorioClientes] = useState<RelatorioClientes | null>(null);

  const gerarRelatorio = async (tipo: string) => {
    if (!dataInicio || !dataFim) {
      toast({
        title: "Erro",
        description: "Por favor, selecione as datas de início e fim",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const endpoint = tipo === 'completo' ? '/api/reports/completo' : `/api/reports/${tipo}`;
      const dataInicioStr = format(dataInicio, 'yyyy-MM-dd');
      const dataFimStr = format(dataFim, 'yyyy-MM-dd');
      
      const response = await fetch(
        `${API_BASE}${endpoint}?data_inicio=${dataInicioStr}&data_fim=${dataFimStr}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao gerar relatório');
      }

      const data = await response.json();

      // Atualizar estado baseado no tipo
      if (tipo === 'completo') {
        setRelatorioOS(data.ordens_servico || null);
        setRelatorioMecanicos(data.mecanicos || null);
        setRelatorioPecas(data.pecas || null);
        setRelatorioFinanceiro(data.financeiro || null);
        setRelatorioNotasFiscais(data.notas_fiscais || null);
        setRelatorioClientes(data.clientes || null);
      } else {
        switch (tipo) {
          case 'os':
            setRelatorioOS(data);
            break;
          case 'mecanicos':
            setRelatorioMecanicos(data);
            break;
          case 'pecas':
            setRelatorioPecas(data);
            break;
          case 'financeiro':
            setRelatorioFinanceiro(data);
            break;
          case 'notas-fiscais':
            setRelatorioNotasFiscais(data);
            break;
          case 'clientes':
            setRelatorioClientes(data);
            break;
        }
      }

      toast({
        title: "Sucesso",
        description: "Relatório gerado com sucesso!",
      });
    } catch (error: any) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao gerar relatório",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportarRelatorio = async (formato: 'pdf' | 'excel' | 'csv') => {
    if (!dataInicio || !dataFim) {
      toast({
        title: "Erro",
        description: "Por favor, selecione as datas de início e fim",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const dataInicioStr = format(dataInicio, 'yyyy-MM-dd');
      const dataFimStr = format(dataFim, 'yyyy-MM-dd');
      const response = await fetch(
        `${API_BASE}/api/reports/completo?data_inicio=${dataInicioStr}&data_fim=${dataFimStr}&formato=${formato}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao exportar relatório' }));
        throw new Error(errorData.error || 'Erro ao exportar relatório');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Para Excel, usar .csv já que estamos retornando CSV por enquanto
      const extension = formato === 'excel' ? 'csv' : formato;
      a.download = `relatorio_${dataInicioStr}_${dataFimStr}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Sucesso",
        description: `Relatório exportado em ${formato.toUpperCase()}!`,
      });
    } catch (error: any) {
      console.error('Erro ao exportar relatório:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar relatório",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <VersionRestrictionNotice featureName="Relatórios" />
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Relatórios</h1>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros do Relatório</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Data Início</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal opacity-50 cursor-not-allowed",
                      !dataInicio && "text-muted-foreground"
                    )}
                    disabled={true}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataInicio ? (
                      format(dataInicio, "PPP", { locale: ptBR })
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataInicio}
                    onSelect={setDataInicio}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Data Fim</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal opacity-50 cursor-not-allowed",
                      !dataFim && "text-muted-foreground"
                    )}
                    disabled={true}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataFim ? (
                      format(dataFim, "PPP", { locale: ptBR })
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataFim}
                    onSelect={setDataFim}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Relatório</label>
              <Select value={tipoRelatorio} onValueChange={() => {}} disabled={true}>
                <SelectTrigger className="opacity-50 cursor-not-allowed">
                  <SelectValue placeholder="Selecione o tipo de relatório" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completo">Relatório Completo</SelectItem>
                  <SelectItem value="os">Ordens de Serviço</SelectItem>
                  <SelectItem value="mecanicos">Produtividade por Mecânico</SelectItem>
                  <SelectItem value="pecas">Peças Utilizadas</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="notas-fiscais">Notas Fiscais</SelectItem>
                  <SelectItem value="clientes">Clientes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            <Button
              onClick={() => {}}
              className="opacity-50 cursor-not-allowed w-full sm:w-auto"
              disabled={true}
            >
              <FileText className="mr-2 h-4 w-4" />
              Gerar Relatório
            </Button>
            <Button
              variant="outline"
              onClick={() => {}}
              className="opacity-50 cursor-not-allowed w-full sm:w-auto"
              disabled={true}
            >
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Exportar PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => {}}
              className="opacity-50 cursor-not-allowed w-full sm:w-auto"
              disabled={true}
            >
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Exportar Excel</span>
              <span className="sm:hidden">Excel</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => {}}
              className="opacity-50 cursor-not-allowed w-full sm:w-auto"
              disabled={true}
            >
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Exportar CSV</span>
              <span className="sm:hidden">CSV</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Relatório de Ordens de Serviço */}
      {relatorioOS && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Relatório de Ordens de Serviço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-3 sm:p-4 bg-blue-50 rounded-lg">
                <div className="text-xs sm:text-sm text-gray-600">Total de OS</div>
                <div className="text-xl sm:text-2xl font-bold">{relatorioOS.resumo.total_os}</div>
              </div>
              <div className="p-3 sm:p-4 bg-green-50 rounded-lg">
                <div className="text-xs sm:text-sm text-gray-600">Finalizadas</div>
                <div className="text-xl sm:text-2xl font-bold">{relatorioOS.resumo.finalizadas}</div>
              </div>
              <div className="p-3 sm:p-4 bg-yellow-50 rounded-lg">
                <div className="text-xs sm:text-sm text-gray-600">Em Andamento</div>
                <div className="text-xl sm:text-2xl font-bold">{relatorioOS.resumo.em_andamento}</div>
              </div>
              <div className="p-3 sm:p-4 bg-purple-50 rounded-lg">
                <div className="text-xs sm:text-sm text-gray-600">Valor Faturado</div>
                <div className="text-lg sm:text-xl md:text-2xl font-bold break-words">{relatorioOS.resumo.valor_total_faturado_formatado}</div>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Período: {relatorioOS.periodo.inicio} a {relatorioOS.periodo.fim}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relatório de Mecânicos */}
      {relatorioMecanicos && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Produtividade por Mecânico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {relatorioMecanicos.mecanicos.slice(0, 10).map((mecanico) => (
                <div key={mecanico.mecanico_id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg gap-2 sm:gap-0">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <Badge variant="outline" className="flex-shrink-0">#{mecanico.ranking}</Badge>
                    <span className="font-medium text-sm sm:text-base truncate">{mecanico.mecanico_nome}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    <span className="text-xs sm:text-sm text-gray-600">{mecanico.total_os} OS</span>
                    <span className="text-xs sm:text-sm text-gray-600">{mecanico.taxa_conclusao_formatada}</span>
                    <span className="font-bold text-sm sm:text-base">{mecanico.valor_total_formatado}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relatório de Peças */}
      {relatorioPecas && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Relatório de Peças Utilizadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div className="p-3 sm:p-4 bg-blue-50 rounded-lg">
                <div className="text-xs sm:text-sm text-gray-600">Total de Peças</div>
                <div className="text-xl sm:text-2xl font-bold">{relatorioPecas.resumo.total_pecas_diferentes}</div>
              </div>
              <div className="p-3 sm:p-4 bg-green-50 rounded-lg">
                <div className="text-xs sm:text-sm text-gray-600">Valor Vendido</div>
                <div className="text-lg sm:text-xl md:text-2xl font-bold break-words">{relatorioPecas.resumo.valor_total_vendido_formatado}</div>
              </div>
              <div className="p-3 sm:p-4 bg-purple-50 rounded-lg">
                <div className="text-xs sm:text-sm text-gray-600">Lucro Total</div>
                <div className="text-lg sm:text-xl md:text-2xl font-bold break-words">{relatorioPecas.resumo.lucro_total_formatado}</div>
              </div>
            </div>
            {relatorioPecas.resumo.total_alertas_estoque > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm font-medium text-red-800">
                  ⚠️ {relatorioPecas.resumo.total_alertas_estoque} peça(s) com estoque baixo
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Relatório Financeiro */}
      {relatorioFinanceiro && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Relatório Financeiro Consolidado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div className="p-3 sm:p-4 bg-green-50 rounded-lg">
                <div className="text-xs sm:text-sm text-gray-600">Receita Total</div>
                <div className="text-lg sm:text-xl md:text-2xl font-bold break-words">{relatorioFinanceiro.resumo.receita_total_formatada}</div>
              </div>
              <div className="p-3 sm:p-4 bg-blue-50 rounded-lg">
                <div className="text-xs sm:text-sm text-gray-600">Lucro Bruto</div>
                <div className="text-lg sm:text-xl md:text-2xl font-bold break-words">{relatorioFinanceiro.resumo.lucro_bruto_formatado}</div>
              </div>
              <div className="p-3 sm:p-4 bg-purple-50 rounded-lg">
                <div className="text-xs sm:text-sm text-gray-600">Margem de Lucro</div>
                <div className="text-lg sm:text-xl md:text-2xl font-bold break-words">{relatorioFinanceiro.resumo.margem_lucro_formatada}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relatório de Notas Fiscais */}
      {relatorioNotasFiscais && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Relatório de Notas Fiscais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 sm:p-4 bg-blue-50 rounded-lg">
                <div className="text-xs sm:text-sm text-gray-600">Total de Notas</div>
                <div className="text-xl sm:text-2xl font-bold">{relatorioNotasFiscais.resumo.total_notas}</div>
              </div>
              <div className="p-3 sm:p-4 bg-green-50 rounded-lg">
                <div className="text-xs sm:text-sm text-gray-600">Valor Total</div>
                <div className="text-lg sm:text-xl md:text-2xl font-bold break-words">{relatorioNotasFiscais.resumo.valor_total_formatado}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relatório de Clientes */}
      {relatorioClientes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Relatório de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="p-3 sm:p-4 bg-blue-50 rounded-lg">
                <div className="text-xs sm:text-sm text-gray-600">Total de Clientes</div>
                <div className="text-xl sm:text-2xl font-bold">{relatorioClientes.resumo.total_clientes}</div>
              </div>
              <div className="p-3 sm:p-4 bg-green-50 rounded-lg">
                <div className="text-xs sm:text-sm text-gray-600">Ticket Médio</div>
                <div className="text-lg sm:text-xl md:text-2xl font-bold break-words">{relatorioClientes.resumo.ticket_medio_geral_formatado}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
};

export default Report;

