import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Phone, Mail, Car, Edit, Trash2, Upload } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import NewClientModal from "@/components/modals/NewClientModal";
import NewVehicleModal from "@/components/modals/NewVehicleModal";
import EditClientModal from "@/components/modals/EditClientModal";
import EditVehicleModal from "@/components/modals/EditVehicleModal";
import { Client, Vehicle } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import * as XLSX from 'xlsx';

const Clients = () => {
  const { clients, vehicles, getVehiclesByClientId, deleteVehicle, bulkImportClients } = useApp();
  const { toast } = useToast();
  const { canEdit } = usePermissions();
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [showNewVehicleModal, setShowNewVehicleModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [showEditVehicleModal, setShowEditVehicleModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // 🔍 Log de diagnóstico EXPANDIDO
  console.log('👥 Componente Clients renderizou!', {
    totalClients: clients.length,
    isArray: Array.isArray(clients),
    clients: clients,
    searchTerm: searchTerm,
    firstClient: clients[0] || 'nenhum'
  });

  // Mapear clientes com veículos
  const clientsWithVehicles = clients.map(client => ({
    ...client,
    vehicles: getVehiclesByClientId(client.id)
  }));

  const filteredClients = clientsWithVehicles.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.cpf && client.cpf.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''))) ||
    client.vehicles.some(vehicle =>
      vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${vehicle.brand} ${vehicle.model}`.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Log adicional dos clientes filtrados
  console.log('🔍 Clientes filtrados:', {
    total: filteredClients.length,
    clientes: filteredClients.map(c => c.name)
  });

  const handleAddVehicle = (clientId: string) => {
    setSelectedClientId(clientId);
    setShowNewVehicleModal(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setShowEditClientModal(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowEditVehicleModal(true);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    deleteVehicle(vehicleId);
    toast({
      title: "Veículo removido",
      description: "Veículo removido com sucesso.",
    });
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const fixEncoding = (text: string): string => {
          if (!text || typeof text !== 'string') return text;

          const byteMap: { [key: string]: string } = {
            'Ã¡': 'á', 'Ã ': 'à', 'Ã¢': 'â', 'Ã£': 'ã', 'Ã¤': 'ä', 'Ã¥': 'å',
            'Ã©': 'é', 'Ã¨': 'è', 'Ãª': 'ê', 'Ã«': 'ë',
            'Ã­': 'í', 'Ã¬': 'ì', 'Ã®': 'î', 'Ã¯': 'ï',
            'Ã³': 'ó', 'Ã²': 'ò', 'Ã´': 'ô', 'Ãµ': 'õ', 'Ã¶': 'ö',
            'Ãº': 'ú', 'Ã¹': 'ù', 'Ã»': 'û', 'Ã¼': 'ü',
            'Ã§': 'ç', 'Ã±': 'ñ', 'Ã½': 'ý', 'Ã¿': 'ÿ',
            'Ã\x81': 'Á', 'Ã\x80': 'À', 'Ã\x82': 'Â', 'Ã\x83': 'Ã', 'Ã\x84': 'Ä', 'Ã\x85': 'Å',
            'Ã\x89': 'É', 'Ã\x88': 'È', 'Ã\x8A': 'Ê', 'Ã\x8B': 'Ë',
            'Ã\x8D': 'Í', 'Ã\x8C': 'Ì', 'Ã\x8E': 'Î', 'Ã\x8F': 'Ï',
            'Ã\x93': 'Ó', 'Ã\x92': 'Ò', 'Ã\x94': 'Ô', 'Ã\x95': 'Õ', 'Ã\x96': 'Ö',
            'Ã\x9A': 'Ú', 'Ã\x99': 'Ù', 'Ã\x9B': 'Û', 'Ã\x9C': 'Ü',
            'Ã\x87': 'Ç', 'Ã\x91': 'Ñ', 'Ã\x9D': 'Ý',
            'Â°': '°', 'Âª': 'ª', 'Âº': 'º', 'Â§': '§',
            'Â¡': '¡', 'Â¿': '¿', 'Â«': '«', 'Â»': '»',
            'Â¢': '¢', 'Â£': '£', 'Â¤': '¤', 'Â¥': '¥',
            'Â¦': '¦', 'Â¨': '¨', 'Â©': '©', 'Â®': '®',
            'Â±': '±', 'Â²': '²', 'Â³': '³', 'Âµ': 'µ',
            'Â¶': '¶', 'Â·': '·', 'Â¹': '¹', 'Â¼': '¼',
            'Â½': '½', 'Â¾': '¾', 'Ã\x97': '×', 'Ã\x9F': 'ß',
            'Ã\x9E': 'Þ', 'Ã¾': 'þ', 'Ã°': 'ð', 'Ã\x90': 'Ð',
            'Ã¦': 'æ', 'Ã\x86': 'Æ',
            'Å\x92': 'Œ', 'Å\x93': 'œ',
            'Å ': 'Š', 'Å¡': 'š',
            'Å½': 'Ž', 'Å¾': 'ž',
            'ï¿½': '', '\ufffd': '', 'Â': ''
          };

          let result = text;
          for (const [wrong, correct] of Object.entries(byteMap)) {
            if (result.includes(wrong)) {
              result = result.split(wrong).join(correct);
            }
          }
          return result;
        };

        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          toast({
            title: "Arquivo Vazio",
            description: "O arquivo não contém dados para importação.",
            variant: "destructive"
          });
          event.target.value = '';
          return;
        }

        const firstRow: any = jsonData[0];
        const columnNames = Object.keys(firstRow);

        // Mapear colunas esperadas (ajuste conforme o formato do seu arquivo)
        // Exemplo: Nome, Email, Telefone, Endereço
        const nomeCol = columnNames.find(col => 
          col.toLowerCase().includes('nome') || col.toLowerCase().includes('name')
        ) || columnNames[0];
        const emailCol = columnNames.find(col => 
          col.toLowerCase().includes('email') || col.toLowerCase().includes('e-mail')
        ) || columnNames[1];
        const telefoneCol = columnNames.find(col => 
          col.toLowerCase().includes('telefone') || col.toLowerCase().includes('phone') || col.toLowerCase().includes('fone')
        ) || columnNames[2];
        const enderecoCol = columnNames.find(col => 
          col.toLowerCase().includes('endereço') || col.toLowerCase().includes('endereco') || col.toLowerCase().includes('address')
        ) || columnNames[3];
        const cpfCol = columnNames.find(col => 
          col.toLowerCase().includes('cpf')
        );

        const importedClients = jsonData.map((row: any) => {
          const name = fixEncoding(row[nomeCol] || '');
          const email = fixEncoding(row[emailCol] || '').toLowerCase().trim();
          const phone = fixEncoding(String(row[telefoneCol] || ''));
          const cpf = cpfCol ? fixEncoding(String(row[cpfCol] || '')).replace(/\D/g, '') : '';
          const address = fixEncoding(row[enderecoCol] || '');

          return {
            name,
            email,
            phone,
            cpf,
            address
          };
        }).filter(client => client.name && client.email); // Filtrar linhas sem nome ou email

        if (importedClients.length === 0) {
          toast({
            title: "Nenhum Cliente Válido",
            description: "O arquivo não contém clientes válidos (nome e email são obrigatórios).",
            variant: "destructive"
          });
          event.target.value = '';
          return;
        }

        const result = await bulkImportClients(importedClients);

        toast({
          title: "Importação Concluída!",
          description: `${result.success} cliente(s) adicionados. ${result.errors.length} erro(s).`,
        });

        event.target.value = '';

      } catch (error) {
        console.error("Erro ao importar arquivo:", error);
        toast({
          title: "Erro na Importação",
          description: `Erro: ${error}`,
          variant: "destructive"
        });
      }
    };

    reader.onerror = () => {
      toast({
        title: "Erro ao Ler Arquivo",
        description: "Não foi possível ler o arquivo selecionado.",
        variant: "destructive"
      });
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Gerencie informações de clientes e veículos</p>
        </div>
        <div className="flex gap-2">
          <input
            id="file-upload"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileImport}
            className="hidden"
          />
          {canEdit('clients') && (
            <>
              <Button
                variant="outline"
                className="gap-2 cursor-pointer"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Upload className="h-4 w-4" />
                Importar Arquivo
              </Button>
              <Button className="gap-2 w-full sm:w-auto" onClick={() => setShowNewClientModal(true)}>
                <Plus className="h-4 w-4" />
                Novo Cliente
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nome, email, CPF ou veículo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold text-foreground">{clients.length}</div>
            <p className="text-sm text-muted-foreground">Total de Clientes</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {clientsWithVehicles.reduce((acc, client) => acc + client.vehicles.length, 0)}
            </div>
            <p className="text-sm text-muted-foreground">Veículos Cadastrados</p>
          </CardContent>
        </Card>
      </div>

      {/* Clients List */}
      <div className="grid gap-4">
        {filteredClients.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                {clients.length === 0
                  ? "Nenhum cliente cadastrado. Clique em 'Novo Cliente' para adicionar."
                  : "Nenhum cliente encontrado com os filtros aplicados."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredClients.map((client) => (
            <Card key={client.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg font-semibold text-foreground">
                      {client.name}
                    </CardTitle>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {client.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {client.phone}
                      </div>
                      {client.cpf && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">CPF:</span>
                          {client.cpf.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                        </div>
                      )}
                    </div>
                  </div>
                  {canEdit('clients') && (
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClient(client)}
                        className="w-full sm:w-auto"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleAddVehicle(client.id)} className="w-full sm:w-auto">
                        <Car className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Adicionar Veículo</span>
                        <span className="sm:hidden">Adicionar</span>
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Veículos
                    </p>
                    <div className="space-y-1">
                      {client.vehicles.map((vehicle, index) => (
                        <div key={vehicle.id} className="text-sm text-muted-foreground flex justify-between items-center">
                          {vehicle.brand} {vehicle.model} {vehicle.year} - {vehicle.plate}
                          {canEdit('clients') && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditVehicle(vehicle)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteVehicle(vehicle.id)}
                                className="text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <NewClientModal open={showNewClientModal} onOpenChange={setShowNewClientModal} />
      <NewVehicleModal
        open={showNewVehicleModal}
        onOpenChange={setShowNewVehicleModal}
        clientId={selectedClientId}
      />
      <EditClientModal
        open={showEditClientModal}
        onOpenChange={setShowEditClientModal}
        client={selectedClient}
      />
      <EditVehicleModal
        open={showEditVehicleModal}
        onOpenChange={setShowEditVehicleModal}
        vehicle={selectedVehicle}
      />
    </div>
  );
};

export default Clients;