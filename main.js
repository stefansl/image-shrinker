/* eslint-disable indent */
const {app, BrowserWindow, ipcMain, dialog} = require('electron');
const fs = require('fs');
const path = require('path');
const url = require('url');
const svgo = require('svgo');
const settings = require('electron-settings');
const execFile = require('child_process').execFile;
const mozjpeg = require('mozjpeg');
const pngquant = require('pngquant-bin');
const makeDir = require('make-dir');
// const console = require('console'); // only for dev

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
        frame: true,
        backgroundColor: '#F7F7F7',
        resizable: true,
        icon: path.join(__dirname, 'assets/icons/png/64x64.png')
    });

    // and load the index.html of the app.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

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

    require('./menu/mainmenu');
}
app.on('will-finish-launching', () => {
    app.on('open-file', (event, filePath) => {
        event.preventDefault();
        processFile(filePath, path.basename(filePath));
    });
});


app.on('ready', createWindow);

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


// Main logic
ipcMain.on(
    'shrinkImage', (event, fileName, filePath) => {
        processFile(filePath, fileName);
    }
);


let processFile = (filePath, fileName) => {
    let sizeOrig = getFileSize(filePath);

    fs.readFile(filePath, 'utf8', (err, data) => {

        if (err) {
            throw err;
        }

        app.addRecentDocument(filePath);
        let newFile = generateNewPath(filePath);

        switch (path.extname(fileName)) {

            case '.svg':
                svg.optimize(data)
                    .then(function (result) {
                        fs.writeFile(newFile, result.data, (err) => {
                            sendToRenderer(err, newFile, sizeOrig);
                        });
                    })
                    .catch(function (error) {
                        dialog(error.message);
                    });

                break;

            case '.jpg':
            case '.jpeg':
                execFile(mozjpeg, ['-outfile', newFile, filePath], (err) => {
                    sendToRenderer(err, newFile, sizeOrig);
                });

                break;

            case '.png':
                execFile(pngquant, ['-fo', newFile, filePath], (err) => {
                    sendToRenderer(err, newFile, sizeOrig);
                });

                break;

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
        dialog.showMessageBox({
            'type': 'error',
            'message': 'I\'m not able to write your new image. Sorry!'
        });
    }
};

module.exports = debug;