const { app, BrowserWindow } = require('electron/main')
const path = require('node:path')

// @todo ubuntu fix
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-features', 'VaapiVideoDecoder');

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1140,
        height: 690,
        webPreferences: {}
    })

    win.loadFile('index.html')

    // dev tools
    win.webContents.openDevTools()
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
