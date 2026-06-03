# VEXX Remote

Uma plataforma remota moderna de acesso à tela e controle remoto com foco em baixa latência, UX premium e arquitetura preparada para um produto real.

## Estrutura

- `frontend/` - Aplicação React + Vite + Tailwind + WebRTC
- `backend/` - API Node.js + Express + Socket.IO + controle remoto

## Como rodar

1. Instale dependências:
   ```bash
   npm install
   ```
2. Inicie em desenvolvimento:
   ```bash
   npm run dev
   ```
3. Acesse o frontend em `http://localhost:5173` e o backend em `http://localhost:4000`.

## Como funciona

- Host cria sessão e compartilha tela via `getDisplayMedia`
- Cliente entra com código, recebe stream WebRTC e envia comandos pelo Socket.IO
- Backend coordena sinais WebRTC, gerencia sessões e distribui eventos de controle

## Observações

- O controle remoto em desktops depende de bibliotecas nativas. O servidor inclui abstração com `@nut-tree/nut-js`.
- O projeto está preparado para futuras adições como transferência de arquivos, áudio remoto, múltiplos monitores e chat.
