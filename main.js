/* eslint-disable indent */
const {app, BrowserWindow, ipcMain, dialog, TouchBar} = require('electron');
const {autoUpdater} = require('electron-updater');
const log = require('electron-log');
const fs = require('fs');
const path = require('path');
const settings = require('electron-settings');
const svgo = require('svgo');
const spawn = require('child_process').spawn;
const mozjpeg = require('mozjpeg');
const pngquant = require('pngquant-bin');
const makeDir = require('make-dir');
const {TouchBarButton} = TouchBar;

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

let svg = new svgo();

// let userSettings = {};

let debug = 0;
let mainWindow;

function createWindow() {

    // Create the browser window.
    mainWindow = new BrowserWindow({
        titleBarStyle: 'hidden-inset',
        width: 340,
        height: 550,
        minWidth: 340,
        minHeight: 550,
        frame: true,
        backgroundColor: '#F7F7F7',
        resizable: true,
        icon: path.join(__dirname, 'assets/icons/png/64x64.png')
    });

    // and load the index.html of the app.
    mainWindow.loadURL(path.join('file://', __dirname, '/index.html'));

    // Open the DevTools.
    if (debug === 1) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    let defaultSettings = {
        notification: true,
        folderswitch: true,
        clearlist: false,
        suffix: true
    };

    // set default settings at first launch
    if (Object.keys(settings.getAll()).length === 0) {
        settings.setAll(defaultSettings);
    }
    mainWindow.setTouchBar(touchBar);
    require('./menu/mainmenu');
}

let touchBarResult = new TouchBarButton({
    'label': 'Let me shrink some images!',
    'backgroundColor': '#000000',
    'icon': 'assets/icons/png/32x32.png',
    'iconPosition': 'left',

});

const touchBar = new TouchBar([
    touchBarResult
]);

app.on('will-finish-launching', () => {
    app.on('open-file', (event, filePath) => {
        event.preventDefault();
        processFile(filePath, path.basename(filePath));
    });
});

app.on('ready', () => {
        createWindow();
        autoUpdater.checkForUpdatesAndNotify()
            .then((result) => {
                log.info('Checking for update: ' + result);
            });
    }
);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// when the update has been downloaded and is ready to be installed, notify the BrowserWindow
autoUpdater.on('update-downloaded', (info) => {
    log.info(info);
    mainWindow.webContents.send('updateReady');
});

// when receiving a quitAndInstall signal, quit and install the new version ;)
ipcMain.on('quitAndInstall', (event, arg) => {
    log.info(event);
    log.info(arg);
    autoUpdater.quitAndInstall();
});

// Main logic
ipcMain.on(
    'shrinkImage', (event, fileName, filePath) => {
        processFile(filePath, fileName);
    }
);


let processFile = (filePath, fileName) => {

    touchBarResult.label = 'I am shrinking for you';

    let sizeOrig = getFileSize(filePath);

    fs.readFile(filePath, 'utf8', (err, data) => {

        if (err) {
            throw err;
        }

        app.addRecentDocument(filePath);
        let newFile = generateNewPath(filePath);

        switch (path.extname(fileName)) {
            case '.svg': {
                svg.optimize(data)
                    .then(function (result) {
                        fs.writeFile(newFile, result.data, (err) => {
                            result.label = 'Your shrinked image: ' + newFile;
                            sendToRenderer(err, newFile, sizeOrig);
                        });
                    })
                    .catch(function (error) {
                        dialog(error.message);
                    });
                break;
            }
            case '.jpg':
            case '.jpeg': {
                let jpg = spawn(mozjpeg, ['-outfile', newFile, filePath]);
                jpg.stdout.on('data', (data) => {
                    log.info('stdout: ' + data.toString());
                });
                jpg.on('close', () => {
                    touchBarResult.label = 'Your shrinked image: ' + newFile;
                    sendToRenderer(err, newFile, sizeOrig);
                });
                jpg.on('exit', (code) => {
                    log.info('child process exited with code ' + code.toString());
                });

                break;
            }
            case '.png': {
                let png = spawn(pngquant, ['-fo', newFile, filePath]);
                png.stdout.on('data', (data) => {
                    log.info('stdout: ' + data.toString());
                });
                png.on('close', () => {
                    touchBarResult.label = 'Your shrinked image: ' + newFile;
                    sendToRenderer(err, newFile, sizeOrig);
                });
                png.on('exit', (code) => {
                    log.info('child process exited with code ' + code.toString());
                });
                break;
            }
            default:
                dialog.showMessageBox({
                    'type': 'error',
                    'message': 'Only SVG, JPG and PNG allowed'
                });
        }
    });
};

const generateNewPath = (pathName) => {

    let objPath = path.parse(pathName);

    if (settings.get('folderswitch') === false && typeof settings.get('savepath') !== 'undefined') {
        objPath.dir = settings.get('savepath')[0];
    }

    makeDir.sync(objPath.dir);

    // Suffix setting
    let suffix;
    if (settings.get('suffix') === true) {
        suffix = '.min' + objPath.ext;
    } else {
        suffix = objPath.ext;
    }

    objPath.base = objPath.name + suffix;

    return path.format(objPath);
};


let getFileSize = (filePath, mb) => {
    const stats = fs.statSync(filePath);
    let fileSize = stats.size;

    if (mb) {
        fileSize = fileSize / 1024;
    }

    return fileSize;
};


let sendToRenderer = (err, newFile, sizeOrig) => {

    if (!err) {
        let sizeShrinked = getFileSize(newFile);

        mainWindow.webContents.send('isShrinked', newFile, sizeOrig, sizeShrinked);
    }
    else {
        log.error(err);
        dialog.showMessageBox({
            'type': 'error',
            'message': 'I\'m not able to write your new image. Sorry!'
        });
    }
};

module.exports = debug;