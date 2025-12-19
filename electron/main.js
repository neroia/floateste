
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fork } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'WhaleFlow - WhatsApp Automation',
    icon: path.join(__dirname, '../dist/logo.png'), 
    webPreferences: {
      nodeIntegration: true, 
      contextIsolation: false, 
      webSecurity: false
    },
    autoHideMenuBar: true,
    backgroundColor: '#f5f5f7',
    show: false
  });

  // 1. Carrega Splash Screen
  const loadingUrl = path.join(__dirname, 'loading.html');
  mainWindow.loadFile(loadingUrl);
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const appUrl = 'http://localhost:3000/painel';

  // 2. Retry lógico para esperar o servidor subir
  const checkServer = async () => {
    try {
      sendToWindow('Tentando conectar ao servidor na porta 3000...');
      const response = await fetch(appUrl);
      if (response.ok) {
        sendToWindow('Servidor respondeu! Carregando aplicação...');
        console.log('[Electron] Servidor pronto. Carregando aplicação...');
        setTimeout(() => {
            mainWindow.loadURL(appUrl);
        }, 1000);
      } else {
        throw new Error('Status not ok');
      }
    } catch (err) {
      setTimeout(checkServer, 1000);
    }
  };

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function sendToWindow(msg, type = 'info') {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('server-log', { msg, type });
    }
}

function startServer() {
  let serverPath;

  if (app.isPackaged) {
    serverPath = path.join(app.getAppPath(), 'server/index.js');
  } else {
    serverPath = path.join(__dirname, '../server/index.js');
  }
  
  const userDataPath = app.getPath('userData');
  
  setTimeout(() => {
      sendToWindow(`Ambiente Packaged: ${app.isPackaged}`);
      sendToWindow(`Caminho Servidor: ${serverPath}`);
      sendToWindow(`Caminho UserData: ${userDataPath}`);
  }, 1500); 

  try {
      serverProcess = fork(serverPath, [], {
        env: { 
          ...process.env, 
          ELECTRON_RUN: 'true',
          APPDATA_PATH: userDataPath 
        },
        silent: true, 
        cwd: userDataPath 
      });

      serverProcess.stdout.on('data', (data) => {
        const str = data.toString().trim();
        console.log(`[Server]: ${str}`);
        sendToWindow(str, 'info');
      });

      serverProcess.stderr.on('data', (data) => {
        const str = data.toString().trim();
        console.error(`[Server Err]: ${str}`);
        sendToWindow(str, 'error');
      });

      serverProcess.on('error', (err) => {
          sendToWindow(`ERRO AO INICIAR PROCESSO: ${err.message}`, 'error');
      });

      serverProcess.on('exit', (code) => {
        sendToWindow(`Servidor encerrou com código ${code}`, 'error');
      });

  } catch (e) {
      setTimeout(() => sendToWindow(`EXCEPTION NO FORK: ${e.message}`, 'error'), 2000);
  }
}

// CORREÇÃO: Garante o encerramento do processo filho ao fechar
app.on('will-quit', () => {
    if (serverProcess) {
        console.log('Encerrando processo do servidor backend...');
        serverProcess.kill(); // Envia SIGTERM (capturado no index.js)
        serverProcess = null;
    }
});

app.whenReady().then(() => {
  createWindow();
  startServer();
  
  const checkInterval = setInterval(async () => {
      if (!mainWindow) { clearInterval(checkInterval); return; }
      try {
          const res = await fetch('http://localhost:3000/painel');
          if (res.ok) {
              clearInterval(checkInterval);
              mainWindow.loadURL('http://localhost:3000/painel');
          }
      } catch(e) {}
  }, 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  // Redundância para garantir o kill se will-quit não disparar
  if (serverProcess) {
    serverProcess.kill();
  }
});
