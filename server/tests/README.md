# 🧪 Testes de Integração

Testes de integração para validar conexões e funcionalidades do backend.

## 📁 Arquivos

### integration.test.js
- Testa modelo User e integração com Supabase
- Valida métodos principais (findByEmail, create, etc)
- Verifica estrutura do banco de dados

**Executar:**
```bash
node server/tests/integration.test.js
```

### supabase.test.js
- Testa conexão direta com Supabase
- Valida configuração do cliente
- Verifica autenticação e queries básicas

**Executar:**
```bash
node server/tests/supabase.test.js
```

### tactical-analyses.test.js
- Testa funcionalidades de análises táticas
- Valida criação, leitura e atualização de análises
- Testa relações com atletas e adversários

**Executar:**
```bash
node server/tests/tactical-analyses.test.js
```

## 🚀 Executar Todos os Testes

```bash
# Da raiz do projeto
npm test --prefix server

# Ou diretamente do server
cd server && npm test
```

## 📝 Requisitos

- Supabase configurado com variáveis de ambiente (.env)
- Banco de dados com migrations aplicadas
- Node.js instalado

## ⚠️ Importante

- Estes são testes de **integração**, não unitários
- Requerem conexão real com Supabase
- Use ambiente de desenvolvimento/staging, nunca produção
- Dados podem ser criados/modificados durante os testes
