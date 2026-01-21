const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

let mainWindow;
let scrcpyProcess = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 900,
        backgroundColor: '#0f172a',
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true, 
            contextIsolation: false 
        }
    });

    mainWindow.loadFile('index.html');
}

/**
 * Helper to get the correct path for a binary (adb or scrcpy)
 * If a custom path is set, it looks there. Otherwise, it uses the system path.
 */
function getBinaryPath(binaryName, customFolder) {
    if (customFolder) {
        const fullPath = path.join(customFolder, binaryName.endsWith('.exe') ? binaryName : `${binaryName}.exe`);
        if (fs.existsSync(fullPath)) return `"${fullPath}"`;
    }
    return binaryName; // Fallback to system PATH
}

// 1. Check if Scrcpy Binary exists
ipcMain.handle('check-scrcpy', async (event, customPath) => {
    return new Promise((resolve) => {
        const exePath = getBinaryPath('scrcpy', customPath);
        
        // If it's a quoted path (custom), check file existence directly
        if (exePath.includes('"')) {
            resolve({ found: true, message: 'Local Scrcpy Found' });
        } else {
            // Check system path via version command
            exec('scrcpy --version', (error) => {
                if (error) resolve({ found: false, message: 'Scrcpy not found' });
                else resolve({ found: true, message: 'Scrcpy ready (System)' });
            });
        }
    });
});

// 2. Get Device List (Using local ADB if custom path is set)
ipcMain.handle('get-devices', async (event, customPath) => {
    return new Promise((resolve) => {
        const adbPath = getBinaryPath('adb', customPath);

        exec(`${adbPath} devices`, (error, stdout) => {
            if (error) {
                return resolve({ error: true, message: 'ADB error. Check folder or drivers.' });
            }
            
            const lines = stdout.split('\n');
            const devices = lines
                .slice(1)
                .filter(line => line.includes('\tdevice'))
                .map(line => line.split('\t')[0].trim());
            
            resolve({ error: false, devices });
        });
    });
});

// 3. Wireless Connect
ipcMain.handle('adb-connect', async (event, { ip, customPath }) => {
    return new Promise((resolve) => {
        const adbPath = getBinaryPath('adb', customPath);
        exec(`${adbPath} connect ${ip}`, (error, stdout) => {
            if (error) resolve({ success: false, message: error.message });
            else resolve({ success: true, message: stdout.trim() });
        });
    });
});

// 4. APK Installation
ipcMain.handle('install-apk', async (event, { device, filePath, customPath }) => {
    return new Promise((resolve) => {
        if (!device) return resolve({ success: false, message: 'No device selected' });
        const adbPath = getBinaryPath('adb', customPath);
        exec(`${adbPath} -s ${device} install "${filePath}"`, (error, stdout, stderr) => {
            if (error) resolve({ success: false, message: stderr || error.message });
            else resolve({ success: true, message: stdout.trim() });
        });
    });
});

ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
    if (result.canceled) return null;
    return result.filePaths[0];
});

ipcMain.on('run-scrcpy', (event, config) => {
    if (scrcpyProcess) return;

    const args = [];
    if (config.device) args.push('-s', config.device);
    if (config.res !== "0") args.push('-m', config.res);
    args.push('-b', `${config.bitrate}M`, '--max-fps', config.fps);
    if (config.stayAwake) args.push('-w');
    if (config.turnOff) args.push('-S');
    if (!config.audioEnabled) args.push('--no-audio');
    if (config.virtualDisplay) args.push('--new-display=1920x1080');
    if (config.showTouch) args.push('-t');
    if (config.alwaysOnTop) args.push('--always-on-top');
    if (config.rotation !== "0") args.push('--rotation', config.rotation);

    // Get executable path (quoted to handle spaces in folder names)
    let executable = getBinaryPath('scrcpy', config.scrcpyPath).replace(/"/g, '');

    scrcpyProcess = spawn(executable, args);
    mainWindow.webContents.send('scrcpy-status', true);

    scrcpyProcess.stdout.on('data', data => mainWindow.webContents.send('scrcpy-log', data.toString()));
    scrcpyProcess.stderr.on('data', data => mainWindow.webContents.send('scrcpy-log', data.toString()));
    
    scrcpyProcess.on('close', (code) => {
        scrcpyProcess = null;
        if (mainWindow) {
            mainWindow.webContents.send('scrcpy-status', false);
            mainWindow.webContents.send('scrcpy-log', `Session ended (Code: ${code})`);
        }
    });
});

ipcMain.on('stop-scrcpy', () => {
    if (scrcpyProcess) scrcpyProcess.kill();
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });