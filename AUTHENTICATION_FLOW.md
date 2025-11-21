# 🔐 Fluxo de Autenticação e Carregamento de Dados

## ✅ Como Funciona Agora

### 1. **Login do Usuário**
Quando o usuário faz login:
- `Login.tsx` usa a função `login()` do `AppContext`
- O token JWT é salvo no `localStorage`
- O estado `isAuthenticated` é atualizado para `true`
- O estado `user` é atualizado com os dados do usuário

### 2. **Carregamento Automático dos Dados**
Após o login ser bem-sucedido, o `AppContext` automaticamente:
- Detecta a mudança no estado `isAuthenticated` (via `useEffect`)
- Faz chamadas paralelas para **todos** os endpoints da API:
  - `/api/clients` - Clientes
  - `/api/vehicles` - Veículos
  - `/api/workers` - Funcionários
  - `/api/expenses` - Despesas
  - `/api/service-orders` - Ordens de Serviço
  - `/api/transactions` - Transações Financeiras
  - `/api/stock` - Itens de Estoque
  - `/api/purchase-history` - Histórico de Compras

### 3. **Renderização dos Dados**
- Todos os componentes que usam `useApp()` têm acesso aos dados carregados
- Os dados são atualizados em tempo real no estado global
- Não é necessário fazer novas chamadas de API em cada componente

## 📋 Código Relevante

### AppContext.tsx (linhas 377-441)
```typescript
useEffect(() => {
  const loadAllData = async () => {
    if (!isAuthenticated) return;

    console.log('📦 Carregando todos os dados...');
    try {
      const [
        clientsResponse,
        vehiclesResponse,
        workersResponse,
        expensesResponse,
        serviceOrdersResponse,
        transactionsResponse,
        stockResponse,
        purchasesResponse
      ] = await Promise.all([
        apiCall('/api/clients'),
        apiCall('/api/vehicles'),
        apiCall('/api/workers'),
        apiCall('/api/expenses'),
        apiCall('/api/service-orders'),
        apiCall('/api/transactions'),
        apiCall('/api/stock'),
        apiCall('/api/purchase-history'),
      ]);

      // Atualiza todos os estados
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      setWorkers(Array.isArray(workersData) ? workersData : []);
      // ... etc
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
    }
  };

  loadAllData();
}, [isAuthenticated]);
```

## 🔍 Como Verificar se os Dados Estão Sendo Carregados

### No Console do Navegador
Após fazer login, você deve ver:
```
🔐 Tentando fazer login: seu_usuario
✅ Login bem-sucedido: seu_usuario
📦 Carregando todos os dados...
📊 Dados carregados: { clients: X, vehicles: Y, workers: Z, ... }
✅ Todos os dados carregados com sucesso!
```

### No React DevTools
1. Abra o React DevTools
2. Procure pelo componente `AppProvider`
3. Verifique o estado:
   - `isAuthenticated: true`
   - `user: { id, username, email, ... }`
   - `clients: [...]`
   - `vehicles: [...]`
   - etc.

## 🛠️ Como Usar os Dados em Qualquer Componente

```typescript
import { useApp } from '@/contexts/AppContext';

function MeuComponente() {
  const { clients, vehicles, workers, expenses, stockItems } = useApp();

  return (
    <div>
      <h1>Total de Clientes: {clients.length}</h1>
      <h1>Total de Veículos: {vehicles.length}</h1>
      <h1>Total de Funcionários: {workers.length}</h1>
    </div>
  );
}
```

## 🔄 Fluxo Completo

```
[Usuário Digita Credenciais]
         ↓
[Clica em "Entrar"]
         ↓
[Login.tsx → useApp().login(username, password)]
         ↓
[AppContext faz POST /api/auth/login]
         ↓
[Backend valida e retorna token + user]
         ↓
[AppContext salva token e atualiza estados]
         ↓
[isAuthenticated = true]
         ↓
[useEffect detecta mudança]
         ↓
[Promise.all() carrega todos os dados em paralelo]
         ↓
[Estados são atualizados: clients[], vehicles[], etc]
         ↓
[App.tsx detecta isAuthenticated = true]
         ↓
[Renderiza <Index /> com todos os dados disponíveis]
         ↓
[✅ Dashboard totalmente funcional com dados do banco]
```

## 🚨 Solução de Problemas

### Dados não estão aparecendo?
1. **Verifique o console do navegador** - Procure por erros ou avisos
2. **Verifique o Network tab** - As chamadas de API estão sendo feitas?
3. **Verifique o backend** - O servidor está rodando na porta 4000?
4. **Verifique o token** - O token está sendo salvo no localStorage?
5. **Verifique o estado** - Use React DevTools para ver o estado do AppContext

### Token inválido ou expirado?
- O sistema faz logout automático se receber resposta 401/403
- Faça login novamente

### Dados não estão sincronizados?
- Use as funções CRUD do AppContext (addClient, updateClient, etc)
- Essas funções já atualizam o banco E o estado local automaticamente

## 📝 Notas Importantes

1. **Não faça chamadas de API diretamente nos componentes** - Use as funções do AppContext
2. **O token é enviado automaticamente** em todas as chamadas via header `Authorization`
3. **Os dados são carregados UMA ÚNICA VEZ** após o login
4. **Operações CRUD atualizam o estado local** sem necessidade de recarregar tudo

