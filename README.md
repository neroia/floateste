# Flow - Construtor de Automação WhatsApp (Micro SaaS)

Construtor visual moderno estilo Typebot/Apple, com integração Gemini AI.
Aplicação Fullstack (Frontend React + Backend Node.js) pronta para deploy.

## Estrutura
- **Frontend**: React + Vite (na pasta `src` implícita)
- **Backend**: Node.js + Express (na pasta `server`)
- **API**: Integração com Gemini 2.5 Flash

## Instalação Local

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Inicie o projeto (Build + Server):
   ```bash
   npm start
   ```
   
   O sistema estará disponível em:
   - Painel: `http://localhost:3000/painel`
   - API: `http://localhost:3000/api`

## Desenvolvimento

Para desenvolver com Hot Reload no Frontend:

1. Abra um terminal e rode o Frontend (Porta 5173):
   ```bash
   npm run dev
   ```

2. Abra outro terminal e rode o Backend (Porta 3000):
   ```bash
   node server/index.js
   ```

## Configuração

1. Abra o painel (`/painel`).
2. Clique no ícone de Engrenagem.
3. Configure sua **Gemini API Key** e dados do WhatsApp.
4. As configurações ficam salvas no seu navegador.