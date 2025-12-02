# Flow - Construtor de Automação WhatsApp

Construtor visual moderno estilo Typebot/Apple, com integração Gemini AI.

## Instalação

1. Clone o repositório
2. Instale dependências:
   ```bash
   npm install
   ```

## Desenvolvimento (Electron + React)

Para rodar o app desktop em modo de desenvolvimento (com Hot Reload):

```bash
npm run electron:dev
```

Isso iniciará:
- Servidor Vite (Porta 3000)
- Servidor Backend Local (Porta 8080)
- Janela do Electron

## Configuração da IA

1. Abra o App
2. Clique no ícone de Engrenagem
3. Insira sua `Gemini API Key` (Obtenha em: aistudio.google.com)
4. Salve

## Build

Para gerar o executável final:

```bash
npm run electron:build
```
