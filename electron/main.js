// Load .env từ thư mục gốc project (Electron không tự load như Next.js)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const { app, BrowserWindow } = require('electron');
// const path = require('path');

const port = process.env.PORT || 3000;
const DEV_SERVER_URL = `http://localhost:${port}` || 3000;

console.log('PORT:', port);
console.log('DEV_SERVER_URL:', DEV_SERVER_URL);

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(DEV_SERVER_URL);

  mainWindow.webContents.on('did-fail-load', (_, code, desc) => {
    if (code === -106) {
      // ERR_CONNECTION_REFUSED
      mainWindow.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(`
        <h1>Chưa chạy Next.js</h1>
        <p>Chạy trong terminal: <code>npm run dev</code></p>
        <p>Sau đó reload cửa sổ này (Ctrl+R) hoặc mở lại app.</p>
        <p>URL: ${DEV_SERVER_URL}</p>
      `)}`
      );
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
