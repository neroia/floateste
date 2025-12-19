# WhaleFlow - Construtor de Automação WhatsApp (Micro SaaS)

Construtor visual moderno estilo Typebot/Apple, com integração Gemini AI.
Agora disponível como aplicação Desktop (Windows/Linux) e Web.

## Estrutura
- **Frontend**: React + Vite (pasta `src` implícita)
- **Backend**: Node.js + Express + WPPConnect (pasta `server`)
- **Desktop**: Electron (pasta `electron`)

## Instalação e Execução (Desenvolvimento)

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Inicie o projeto (Modo Web):
   ```bash
   npm start
   ```
   Acesse: `http://localhost:3000/painel`

## Gerar Executável (Distribuir)

Para criar o instalador para seus clientes:

### Windows (.exe)
```bash
npm run dist:win
```
O arquivo estará na pasta `dist_electron/`.

### Linux (.AppImage)
```bash
npm run dist:linux
```
O arquivo estará na pasta `dist_electron/`.

**Nota:** O software inclui o servidor interno. Ao abrir o executável, ele inicia o motor do WhatsApp automaticamente. Na primeira execução, o WPPConnect pode demorar alguns segundos para baixar o navegador Chrome necessário para a automação.