const { app, BrowserWindow, ipcMain, dialog } = require('electron/main')
const path = require('node:path')

// @todo ubuntu fix
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-features', 'VaapiVideoDecoder');

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1140,
        height: 855,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    win.loadFile('index.html')
}

// Handle file open dialog
ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Audio Files', extensions: ['mp3', 'wav', 'flac', 'm4a', 'ogg'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    })
    if (!canceled) {
        return filePaths[0]
    }
    return null
})

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
