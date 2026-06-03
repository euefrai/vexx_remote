import express from 'express';
import cors from 'cors';
import { moveMouse, moveMouseAbsolute, mouseToggle, click, scroll, typeKeyboard, typeString } from './robotControl';

const app = express();
const PORT = 5050;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Endpoint de status para o frontend detectar se o agente está aberto
app.get('/status', (req, res) => {
  res.json({ status: 'active', platform: process.platform });
});

// Endpoint de controle para executar cliques e teclas remotas
app.post('/control', async (req, res) => {
  const { action, payload } = req.body;
  
  try {
    switch (action) {
      case 'mouse':
        await moveMouse(payload.deltaX, payload.deltaY);
        break;
      case 'move_absolute':
        await moveMouseAbsolute(payload.x, payload.y);
        break;
      case 'mouse_down':
        await mouseToggle('down', payload.button || 'left');
        break;
      case 'mouse_up':
        await mouseToggle('up', payload.button || 'left');
        break;
      case 'click':
        await click(payload.button || 'left');
        break;
      case 'scroll':
        await scroll(payload.deltaX || payload.dx || payload.dy, payload.deltaY || payload.dy);
        break;
      case 'keyboard':
        await typeKeyboard(payload);
        break;
      case 'type_string':
        await typeString(payload.text);
        break;
      default:
        return res.status(400).json({ error: `Ação desconhecida: ${action}` });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error(`Falha ao executar ação de controle (${action}):`, error);
    res.status(500).json({ error: error.message || 'Erro de execução' });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`VEXX Local Agent running silently at http://127.0.0.1:${PORT}`);
});
