import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";

interface DashboardCards {
  heroSection?: boolean;
  expensesPaid?: boolean;
  expensesPending?: boolean;
  expensesOverdue?: boolean;
  growth?: boolean;
  openOrders?: boolean;
  completedOrders?: boolean;
  activeClients?: boolean;
  activeWorkers?: boolean;
  recentOrders?: boolean;
}

interface UserPermissions {
  dashboard: boolean;
  serviceOrders: boolean;
  serviceOrdersEdit: boolean;
  clients: boolean;
  clientsEdit: boolean;
  financial: boolean;
  financialEdit: boolean;
  stock: boolean;
  stockEdit: boolean;
  appointments: boolean;
  appointmentsEdit: boolean;
  invoices: boolean;
  invoicesEdit: boolean;
  communication: boolean;
  communicationEdit: boolean;
  expenses: boolean;
  expensesEdit: boolean;
  workers: boolean;
  workersEdit: boolean;
  users: boolean;
  settings: boolean;
  reports: boolean;
  dashboardCards?: DashboardCards;
}

interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  status: string;
  permissions?: UserPermissions;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (user: User, password?: string) => void;
}

// Tipo para as permissões principais (excluindo permissões de edição e dashboardCards)
type MainPermissions = Omit<UserPermissions, 'serviceOrdersEdit' | 'clientsEdit' | 'financialEdit' | 'stockEdit' | 'appointmentsEdit' | 'invoicesEdit' | 'communicationEdit' | 'expensesEdit' | 'workersEdit' | 'dashboardCards'>;

const permissionLabels: Record<keyof MainPermissions, string> = {
  dashboard: "Dashboard",
  serviceOrders: "Ordens de Serviço",
  clients: "Clientes",
  financial: "Financeiro",
  stock: "Estoque",
  appointments: "Agendamentos",
  invoices: "Notas Fiscais",
  communication: "Comunicação",
  expenses: "Despesas",
  workers: "Funcionários",
  users: "Usuários",
  settings: "Configurações",
  reports: "Relatórios"
};

export const EditUserModal = ({ isOpen, onClose, user, onSave }: EditUserModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<User | null>(null);
  const [password, setPassword] = useState("workflow");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        ...user,
        permissions: {
          ...(user.permissions || {
            dashboard: true,
            serviceOrders: false,
            serviceOrdersEdit: false,
            clients: false,
            clientsEdit: false,
            financial: false,
            financialEdit: false,
            stock: false,
            stockEdit: false,
            appointments: false,
            appointmentsEdit: false,
            invoices: false,
            invoicesEdit: false,
            communication: false,
            communicationEdit: false,
            expenses: false,
            expensesEdit: false,
            workers: false,
            workersEdit: false,
            users: false,
            settings: false,
            reports: false
          }),
          dashboardCards: {
            ...user.permissions?.dashboardCards,
            heroSection: true // Sempre obrigatório
          }
        }
      });
      setPassword("workflow");
    }
  }, [user]);

  const handlePermissionChange = (permission: keyof UserPermissions, value: boolean) => {
    if (!formData) return;
    // Usar função de atualização para garantir que o React detecte a mudança
    setFormData(prev => {
      if (!prev) {
        // Se prev for null, retornar formData atual (não deveria acontecer)
        return formData;
      }
      const currentPermissions: Partial<UserPermissions> = prev.permissions || {};
      // Criar um novo objeto de permissões para garantir que o React detecte a mudança
      const newPermissions: UserPermissions = {
        dashboard: currentPermissions.dashboard ?? false,
        serviceOrders: currentPermissions.serviceOrders ?? false,
        serviceOrdersEdit: currentPermissions.serviceOrdersEdit ?? false,
        clients: currentPermissions.clients ?? false,
        clientsEdit: currentPermissions.clientsEdit ?? false,
        financial: currentPermissions.financial ?? false,
        financialEdit: currentPermissions.financialEdit ?? false,
        stock: currentPermissions.stock ?? false,
        stockEdit: currentPermissions.stockEdit ?? false,
        appointments: currentPermissions.appointments ?? false,
        appointmentsEdit: currentPermissions.appointmentsEdit ?? false,
        invoices: currentPermissions.invoices ?? false,
        invoicesEdit: currentPermissions.invoicesEdit ?? false,
        communication: currentPermissions.communication ?? false,
        communicationEdit: currentPermissions.communicationEdit ?? false,
        expenses: currentPermissions.expenses ?? false,
        expensesEdit: currentPermissions.expensesEdit ?? false,
        workers: currentPermissions.workers ?? false,
        workersEdit: currentPermissions.workersEdit ?? false,
        users: currentPermissions.users ?? false,
        settings: currentPermissions.settings ?? false,
        reports: currentPermissions.reports ?? false,
        dashboardCards: currentPermissions.dashboardCards,
        [permission]: value // Sobrescrever a permissão específica
      };
      // Criar um novo objeto formData para forçar re-renderização
      return {
        ...prev,
        permissions: newPermissions
      };
    });
  };

  const handleSave = async () => {
    if (!formData) return;

    setLoading(true);
    try {
      // Garantir que heroSection sempre seja true antes de salvar
      const userToSave = {
        ...formData,
        permissions: {
          ...formData.permissions,
          dashboardCards: {
            ...formData.permissions?.dashboardCards,
            heroSection: true
          }
        }
      };
      await onSave(userToSave, password);
      toast({
        title: "Usuário atualizado",
        description: "Usuário, senha e permissões atualizados com sucesso",
      });
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar usuário",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!formData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[80vw] sm:max-w-[70vh] max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usuário: {formData.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="permissions">Permissões</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={mostrarSenha ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Insira sua senha"
                  />
                  {mostrarSenha ? (
                    <EyeOff
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                    />
                  ) : (
                    <Eye
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                    />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Cargo</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="mecanico">Mecânico</SelectItem>
                    <SelectItem value="recepcionista">Recepcionista</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="user">Usuário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Permissões de Acesso</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure o que o usuário pode visualizar e editar em cada módulo
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(permissionLabels).map(([key, label]) => {
                  const permissionKey = key as keyof UserPermissions;
                  const isDisabled = permissionKey === "dashboard"; // Dashboard sempre habilitado
                  
                  // Módulos que têm permissão de edição separada
                  const hasEditPermission = [
                    'serviceOrders', 'clients', 'financial', 'stock', 
                    'appointments', 'invoices', 'communication', 'expenses', 'workers'
                  ].includes(permissionKey);
                  
                  const editPermissionKey = hasEditPermission 
                    ? `${permissionKey}Edit` as keyof UserPermissions
                    : null;

                  return (
                    <div key={key} className="p-3 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor={key} className="text-sm font-medium">
                            {label}
                          </Label>
                          {isDisabled && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Sempre habilitado
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`${key}-view`} className="text-xs text-muted-foreground">
                              Visualizar
                            </Label>
                            <Switch
                              id={`${key}-view`}
                              checked={formData.permissions?.[permissionKey] === true}
                              onCheckedChange={(checked) => {
                                handlePermissionChange(permissionKey, checked);
                                // Se desabilitar visualização, desabilitar edição também
                                if (!checked && editPermissionKey) {
                                  // Usar setTimeout para garantir que as atualizações sejam processadas em ordem
                                  setTimeout(() => {
                                    handlePermissionChange(editPermissionKey, false);
                                  }, 0);
                                }
                              }}
                              disabled={isDisabled}
                            />
                          </div>
                          {hasEditPermission && (
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`${key}-edit`} className="text-xs text-muted-foreground">
                                Editar
                              </Label>
                              <Switch
                                id={`${key}-edit`}
                                checked={formData.permissions?.[editPermissionKey!] === true}
                                onCheckedChange={(checked) => {
                                  handlePermissionChange(editPermissionKey!, checked);
                                  // Se habilitar edição, habilitar visualização também
                                  if (checked && formData.permissions?.[permissionKey] !== true) {
                                    handlePermissionChange(permissionKey, true);
                                  }
                                }}
                                disabled={isDisabled || formData.permissions?.[permissionKey] !== true}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cards do Dashboard</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Selecione quais cards do dashboard este usuário pode visualizar
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'heroSection', label: 'Seção Hero' },
                  { key: 'expensesPaid', label: 'Despesas Pagas' },
                  { key: 'expensesPending', label: 'Despesas Pendentes' },
                  { key: 'expensesOverdue', label: 'Despesas Vencidas' },
                  { key: 'growth', label: 'Crescimento' },
                  { key: 'openOrders', label: 'Ordens Abertas' },
                  { key: 'completedOrders', label: 'Ordens Concluídas' },
                  { key: 'activeClients', label: 'Clientes Ativos' },
                  { key: 'activeWorkers', label: 'Funcionários Ativos' },
                  { key: 'recentOrders', label: 'Ordens Recentes' }
                ].map(({ key, label }) => {
                  const cardKey = key as keyof DashboardCards;
                  const isHeroSection = cardKey === 'heroSection';
                  const isEnabled = formData.permissions?.dashboardCards?.[cardKey] !== false;

                  return (
                    <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label htmlFor={`dashboard-${key}`} className="text-sm font-medium cursor-pointer">
                          {label}
                        </Label>
                        {isHeroSection && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Sempre habilitado
                          </p>
                        )}
                      </div>
                      <Switch
                        id={`dashboard-${key}`}
                        checked={isEnabled}
                        onCheckedChange={(checked) => {
                          if (isHeroSection) return; // Não permite alterar se for heroSection
                          setFormData(prev => {
                            if (!prev) return prev;
                            const currentCards = prev.permissions?.dashboardCards || {};
                            return {
                              ...prev,
                              permissions: {
                                ...prev.permissions,
                                dashboardCards: {
                                  ...currentCards,
                                  [cardKey]: checked
                                }
                              }
                            };
                          });
                        }}
                        disabled={isHeroSection}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

