// src/components/Settings.tsx
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Building,
  Bell,
  Save,
  FileText,
  Loader2,
  Shield,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FiscalSetting {
  id?: string;
  invoice_type: 'nfe' | 'nfse';
  default_cfop: string;
  default_operation_nature: string;
  default_icms: number;
  default_iss: number;
  default_pis: number;
  default_cofins: number;
  description?: string;
  is_active?: boolean;
}

// Componente para aba de Configurações de Notificações
const NotificationsSettingsTab = () => {
  const { toast } = useToast();
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const getAuthToken = () => localStorage.getItem('authToken') || localStorage.getItem('token');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Estados para configurações
  const [reminder24hEnabled, setReminder24hEnabled] = useState(true);
  const [appointmentConfirmationEnabled, setAppointmentConfirmationEnabled] = useState(false);
  const [reminderTemplate, setReminderTemplate] = useState('');
  const [vehicleReadyTemplate, setVehicleReadyTemplate] = useState('');
  const [serviceConfirmationTemplate, setServiceConfirmationTemplate] = useState('');
  const [pickupReminderTemplate, setPickupReminderTemplate] = useState('');
  const [workshopName, setWorkshopName] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/api/communication/settings`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const settings = result.data;
          
          setReminder24hEnabled(settings.reminder_24h_enabled?.value === 'true');
          setAppointmentConfirmationEnabled(settings.appointment_confirmation_enabled?.value === 'true');
          setReminderTemplate(settings.reminder_template?.value || '');
          setVehicleReadyTemplate(settings.vehicle_ready_template?.value || '');
          setServiceConfirmationTemplate(settings.service_confirmation_template?.value || '');
          setPickupReminderTemplate(settings.pickup_reminder_template?.value || '');
          setWorkshopName(settings.workshop_name?.value || '');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de notificações:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/api/communication/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          settings: {
            reminder_24h_enabled: reminder24hEnabled ? 'true' : 'false',
            appointment_confirmation_enabled: appointmentConfirmationEnabled ? 'true' : 'false',
            reminder_template: reminderTemplate,
            vehicle_ready_template: vehicleReadyTemplate,
            service_confirmation_template: serviceConfirmationTemplate,
            pickup_reminder_template: pickupReminderTemplate,
            workshop_name: workshopName,
          }
        }),
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Configurações salvas com sucesso!",
        });
        await loadSettings();
      } else {
        const result = await response.json();
        throw new Error(result.error || 'Erro ao salvar');
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar configurações",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando configurações...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lembretes e Notificações */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Lembretes e Notificações</CardTitle>
          <CardDescription>
            Configure como o sistema se comunica com seus clientes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2 p-4 border rounded-md">
            <Label
              htmlFor="reminder"
              className="flex flex-col space-y-1"
            >
              <span>Lembrete de Agendamento (WhatsApp)</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Enviar um lembrete automático 24h antes do serviço.
              </span>
            </Label>
            <Switch 
              id="reminder" 
              checked={reminder24hEnabled}
              onCheckedChange={setReminder24hEnabled}
            />
          </div>
          <div className="flex items-center justify-between space-x-2 p-4 border rounded-md">
            <Label
              htmlFor="confirmation"
              className="flex flex-col space-y-1"
            >
              <span>Confirmação de Agendamento</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Enviar confirmação imediata ao criar um novo agendamento.
              </span>
            </Label>
            <Switch 
              id="confirmation" 
              checked={appointmentConfirmationEnabled}
              onCheckedChange={setAppointmentConfirmationEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workshopName">
              Nome da Oficina
            </Label>
            <Input
              id="workshopName"
              value={workshopName}
              onChange={(e) => setWorkshopName(e.target.value)}
              placeholder="Ex: Oficina Mecânica Silva"
            />
            <p className="text-xs text-muted-foreground">
              Nome que será usado nos templates de mensagens (substitui [OFICINA]).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminderTemplate">
              Modelo da Mensagem de Lembrete
            </Label>
            <Textarea
              id="reminderTemplate"
              placeholder="Ex: Olá [CLIENTE], passando para lembrar do seu agendamento na [OFICINA] amanhã, dia [DATA] às [HORA] para o veículo [VEICULO]."
              className="min-h-[120px]"
              value={reminderTemplate}
              onChange={(e) => setReminderTemplate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Use as tags: [CLIENTE], [OFICINA], [DATA], [HORA], [VEICULO], [PLACA].
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={saveSettings} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Configurações
          </Button>
        </CardFooter>
      </Card>

      {/* Mensagens Rápidas */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Mensagens Rápidas</CardTitle>
          <CardDescription>
            Configure os templates das mensagens rápidas enviadas aos clientes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="vehicleReadyTemplate">
              Template: Veículo Pronto
            </Label>
            <Textarea
              id="vehicleReadyTemplate"
              placeholder="Ex: Olá [CLIENTE]! Seu veículo [VEICULO] (Placa: [PLACA]) está pronto para retirada."
              className="min-h-[100px]"
              value={vehicleReadyTemplate}
              onChange={(e) => setVehicleReadyTemplate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Use as tags: [CLIENTE], [VEICULO], [PLACA], [OFICINA].
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceConfirmationTemplate">
              Template: Confirmação de Serviço
            </Label>
            <Textarea
              id="serviceConfirmationTemplate"
              placeholder="Ex: Olá [CLIENTE]! Confirmamos o agendamento do serviço para seu veículo [VEICULO]."
              className="min-h-[100px]"
              value={serviceConfirmationTemplate}
              onChange={(e) => setServiceConfirmationTemplate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Use as tags: [CLIENTE], [VEICULO], [PLACA], [OFICINA].
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickupReminderTemplate">
              Template: Lembrete de Retirada
            </Label>
            <Textarea
              id="pickupReminderTemplate"
              placeholder="Ex: Olá [CLIENTE]! Lembrete: seu veículo [VEICULO] (Placa: [PLACA]) está aguardando retirada."
              className="min-h-[100px]"
              value={pickupReminderTemplate}
              onChange={(e) => setPickupReminderTemplate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Use as tags: [CLIENTE], [VEICULO], [PLACA], [OFICINA].
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={saveSettings} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Configurações
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

// Componente para aba de Configurações Fiscais
const FiscalSettingsTab = () => {
  const { toast } = useToast();
  
  // Estado para dados da empresa
  const [companyData, setCompanyData] = useState({
    state_registration: '',
    municipal_registration: '',
    certificate_path: '',
    certificate_password: '',
  });
  
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificateValidation, setCertificateValidation] = useState<{
    isValid: boolean | null;
    message: string;
  }>({ isValid: null, message: '' });
  
  // Estado para configurações fiscais
  const [nfeSettings, setNfeSettings] = useState<FiscalSetting>({
    invoice_type: 'nfe',
    default_cfop: '5102',
    default_operation_nature: 'Venda de mercadoria adquirida de terceiros',
    default_icms: 18,
    default_iss: 0,
    default_pis: 1.65,
    default_cofins: 7.6,
    is_active: true,
  });
  const [nfseSettings, setNfseSettings] = useState<FiscalSetting>({
    invoice_type: 'nfse',
    default_cfop: '5933',
    default_operation_nature: 'Prestação de serviço tributado pelo ISSQN',
    default_icms: 0,
    default_iss: 5,
    default_pis: 0.65,
    default_cofins: 3,
    is_active: true,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isValidatingCertificate, setIsValidatingCertificate] = useState(false);
  const [isSavingNfe, setIsSavingNfe] = useState(false);
  const [isSavingNfse, setIsSavingNfse] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const getAuthToken = () => localStorage.getItem('authToken');

  // Carregar configurações ao montar
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      
      // Carregar dados da empresa
      const companyResponse = await fetch(`${API_BASE}/api/companies`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (companyResponse.ok) {
        const companyResult = await companyResponse.json();
        if (companyResult.success && companyResult.data && companyResult.data.length > 0) {
          const company = companyResult.data[0];
          setCompanyData({
            state_registration: company.state_registration || '',
            municipal_registration: company.municipal_registration || '',
            certificate_path: company.certificate_path || '',
            certificate_password: '', // Não carregar senha por segurança
          });
        }
      }
      
      // Carregar configurações fiscais
      const fiscalResponse = await fetch(`${API_BASE}/api/fiscal-settings`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (fiscalResponse.ok) {
        const fiscalResult = await fiscalResponse.json();
        if (fiscalResult.success && fiscalResult.data) {
          const nfe = fiscalResult.data.find((s: FiscalSetting) => s.invoice_type === 'nfe');
          const nfse = fiscalResult.data.find((s: FiscalSetting) => s.invoice_type === 'nfse');
          
          if (nfe) setNfeSettings(nfe);
          if (nfse) setNfseSettings(nfse);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações fiscais:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateCertificate = async () => {
    if (!certificateFile && !companyData.certificate_path) {
      setCertificateValidation({
        isValid: false,
        message: 'Selecione um arquivo de certificado ou informe o caminho'
      });
      return;
    }

    setIsValidatingCertificate(true);
    try {
      const token = getAuthToken();
      const formData = new FormData();
      
      if (certificateFile) {
        formData.append('certificate', certificateFile);
      }
      if (companyData.certificate_password) {
        formData.append('certificate_password', companyData.certificate_password);
      }
      if (companyData.certificate_path) {
        formData.append('certificate_path', companyData.certificate_path);
      }

      const response = await fetch(`${API_BASE}/api/companies/validate-certificate`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
        credentials: 'include',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setCertificateValidation({
          isValid: true,
          message: result.message || 'Certificado válido!'
        });
        toast({
          title: "Sucesso",
          description: "Certificado validado com sucesso!",
        });
      } else {
        setCertificateValidation({
          isValid: false,
          message: result.error || 'Erro ao validar certificado'
        });
        toast({
          title: "Erro",
          description: result.error || "Erro ao validar certificado",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setCertificateValidation({
        isValid: false,
        message: error.message || 'Erro ao validar certificado'
      });
      toast({
        title: "Erro",
        description: error.message || "Erro ao validar certificado",
        variant: "destructive",
      });
    } finally {
      setIsValidatingCertificate(false);
    }
  };

  const saveCompanyData = async () => {
    setIsSavingCompany(true);
    try {
      const token = getAuthToken();
      const formData = new FormData();
      
      // Sempre enviar os campos, mesmo que vazios
      formData.append('state_registration', companyData.state_registration || '');
      formData.append('municipal_registration', companyData.municipal_registration || '');
      
      if (certificateFile) {
        formData.append('certificate', certificateFile);
      }
      if (companyData.certificate_path) {
        formData.append('certificate_path', companyData.certificate_path);
      }
      if (companyData.certificate_password) {
        formData.append('certificate_password', companyData.certificate_password);
      }

      const response = await fetch(`${API_BASE}/api/companies`, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Dados da empresa atualizados com sucesso!",
        });
        setCertificateFile(null);
        await loadSettings();
      } else {
        const result = await response.json();
        throw new Error(result.error || 'Erro ao salvar');
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar dados da empresa",
        variant: "destructive",
      });
    } finally {
      setIsSavingCompany(false);
    }
  };

  const saveSettings = async (settings: FiscalSetting, setIsSaving: (value: boolean) => void) => {
    setIsSaving(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/api/fiscal-settings`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Sucesso",
          description: `Configurações de ${settings.invoice_type.toUpperCase()} salvas com sucesso!`,
        });
        await loadSettings();
      } else {
        throw new Error('Erro ao salvar');
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações fiscais",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando configurações...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dados da Empresa - Inscrições */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Dados Fiscais da Empresa
          </CardTitle>
          <CardDescription>
            Configure as inscrições necessárias para emissão de notas fiscais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="state_registration">
                Inscrição Estadual (IE) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="state_registration"
                value={companyData.state_registration}
                onChange={(e) => setCompanyData({ ...companyData, state_registration: e.target.value })}
                placeholder="Ex: 123.456.789.012 ou ISENTO (em dev, deixe vazio para usar 'ISENTO')"
              />
              <p className="text-xs text-muted-foreground">
                Necessária para emissão de NF-e (produtos). Se isento, informe "ISENTO".
                {import.meta.env.DEV && (
                  <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                    {' '}Em desenvolvimento, deixe vazio para usar credencial falsa automaticamente.
                  </span>
                )}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="municipal_registration">
                Inscrição Municipal <span className="text-red-500">*</span>
              </Label>
              <Input
                id="municipal_registration"
                value={companyData.municipal_registration}
                onChange={(e) => setCompanyData({ ...companyData, municipal_registration: e.target.value })}
                placeholder="Ex: 12345678 (em dev, deixe vazio para usar '00000000')"
              />
              <p className="text-xs text-muted-foreground">
                Necessária para emissão de NFS-e (serviços). Informe o número fornecido pela prefeitura.
                {import.meta.env.DEV && (
                  <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                    {' '}Em desenvolvimento, deixe vazio para usar credencial falsa automaticamente.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Certificado Digital */}
          <div className="mt-6 pt-6 border-t space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5" />
              <h3 className="font-semibold text-lg">Certificado Digital A1</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Certificado digital necessário para emissão de NF-e. Em desenvolvimento, você pode usar credenciais falsas.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="certificate_file">
                  Arquivo do Certificado (.pfx ou .p12)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="certificate_file"
                    type="file"
                    accept=".pfx,.p12"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCertificateFile(file);
                        setCertificateValidation({ isValid: null, message: '' });
                      }
                    }}
                    className="cursor-pointer"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Ou informe o caminho do certificado abaixo
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="certificate_path">Caminho do Certificado (opcional)</Label>
                <Input
                  id="certificate_path"
                  value={companyData.certificate_path}
                  onChange={(e) => {
                    setCompanyData({ ...companyData, certificate_path: e.target.value });
                    setCertificateValidation({ isValid: null, message: '' });
                  }}
                  placeholder="Ex: /caminho/para/certificado.pfx ou DEV_MODE"
                />
                <p className="text-xs text-muted-foreground">
                  Em desenvolvimento, use "DEV_MODE" para credenciais falsas
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="certificate_password">Senha do Certificado</Label>
              <Input
                id="certificate_password"
                type="password"
                value={companyData.certificate_password}
                onChange={(e) => {
                  setCompanyData({ ...companyData, certificate_password: e.target.value });
                  setCertificateValidation({ isValid: null, message: '' });
                }}
                placeholder="Senha do certificado (ou 'DEV_PASSWORD' em desenvolvimento)"
              />
              <p className="text-xs text-muted-foreground">
                Em desenvolvimento, use "DEV_PASSWORD" para credenciais falsas
              </p>
            </div>

            {/* Status da Validação */}
            {certificateValidation.isValid !== null && (
              <div className={`p-3 rounded-md flex items-center gap-2 ${
                certificateValidation.isValid 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}>
                {certificateValidation.isValid ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
                <span className={`text-sm ${
                  certificateValidation.isValid 
                    ? 'text-green-800 dark:text-green-200' 
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {certificateValidation.message}
                </span>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button 
            onClick={validateCertificate} 
            disabled={isValidatingCertificate || isSavingCompany} 
            variant="outline"
            className="gap-2"
          >
            {isValidatingCertificate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            Validar Certificado
          </Button>
          <Button onClick={saveCompanyData} disabled={isSavingCompany} className="gap-2">
            {isSavingCompany ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Dados da Empresa
          </Button>
        </CardFooter>
      </Card>

      {/* Configurações NF-e */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Configurações NF-e (Nota Fiscal de Produto)</CardTitle>
          <CardDescription>
            Configure os valores padrão para emissão de notas fiscais de produtos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nfe-cfop">CFOP Padrão</Label>
              <Input
                id="nfe-cfop"
                value={nfeSettings.default_cfop}
                onChange={(e) => setNfeSettings({ ...nfeSettings, default_cfop: e.target.value })}
                placeholder="5102"
              />
              <p className="text-xs text-muted-foreground">
                Código Fiscal de Operações e Prestações
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nfe-nature">Natureza da Operação</Label>
              <Input
                id="nfe-nature"
                value={nfeSettings.default_operation_nature}
                onChange={(e) => setNfeSettings({ ...nfeSettings, default_operation_nature: e.target.value })}
                placeholder="Venda de mercadoria"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nfe-icms">ICMS (%)</Label>
              <Input
                id="nfe-icms"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={nfeSettings.default_icms}
                onChange={(e) => setNfeSettings({ ...nfeSettings, default_icms: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Imposto sobre Circulação de Mercadorias e Serviços
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nfe-pis">PIS (%)</Label>
              <Input
                id="nfe-pis"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={nfeSettings.default_pis}
                onChange={(e) => setNfeSettings({ ...nfeSettings, default_pis: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Programa de Integração Social
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nfe-cofins">COFINS (%)</Label>
              <Input
                id="nfe-cofins"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={nfeSettings.default_cofins}
                onChange={(e) => setNfeSettings({ ...nfeSettings, default_cofins: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Contribuição para o Financiamento da Seguridade Social
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={() => saveSettings(nfeSettings, setIsSavingNfe)} disabled={isSavingNfe} className="gap-2">
            {isSavingNfe ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Configurações NF-e
          </Button>
        </CardFooter>
      </Card>

      {/* Configurações NFS-e */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Configurações NFS-e (Nota Fiscal de Serviço)</CardTitle>
          <CardDescription>
            Configure os valores padrão para emissão de notas fiscais de serviços
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nfse-cfop">CFOP Padrão</Label>
              <Input
                id="nfse-cfop"
                value={nfseSettings.default_cfop}
                onChange={(e) => setNfseSettings({ ...nfseSettings, default_cfop: e.target.value })}
                placeholder="5933"
              />
              <p className="text-xs text-muted-foreground">
                Código Fiscal de Operações e Prestações
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nfse-nature">Natureza da Operação</Label>
              <Input
                id="nfse-nature"
                value={nfseSettings.default_operation_nature}
                onChange={(e) => setNfseSettings({ ...nfseSettings, default_operation_nature: e.target.value })}
                placeholder="Prestação de serviço"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nfse-iss">ISS (%)</Label>
              <Input
                id="nfse-iss"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={nfseSettings.default_iss}
                onChange={(e) => setNfseSettings({ ...nfseSettings, default_iss: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Imposto Sobre Serviços de Qualquer Natureza
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nfse-pis">PIS (%)</Label>
              <Input
                id="nfse-pis"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={nfseSettings.default_pis}
                onChange={(e) => setNfseSettings({ ...nfseSettings, default_pis: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Programa de Integração Social
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nfse-cofins">COFINS (%)</Label>
              <Input
                id="nfse-cofins"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={nfseSettings.default_cofins}
                onChange={(e) => setNfseSettings({ ...nfseSettings, default_cofins: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Contribuição para o Financiamento da Seguridade Social
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={() => saveSettings(nfseSettings, setIsSavingNfse)} disabled={isSavingNfse} className="gap-2">
            {isSavingNfse ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Configurações NFS-e
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

const Settings = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as preferências da sua oficina e do sistema
          </p>
        </div>
      </div>

      <Tabs defaultValue="fiscal" className="w-full">
        {/* Navegação das Abas */}
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 h-full md:h-10">
          <TabsTrigger value="fiscal" className="gap-2">
            <FileText className="h-4 w-4" />
            Configurações Fiscais
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
        </TabsList>

        {/* Conteúdo da Aba: Configurações Fiscais */}
        <TabsContent value="fiscal">
          <FiscalSettingsTab />
        </TabsContent>

        {/* Conteúdo da Aba: Notificações */}
        <TabsContent value="notifications">
          <NotificationsSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;