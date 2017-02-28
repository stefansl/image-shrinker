const fs = require('fs');
const os = require('os');
const path = require('path');
const electron = require('electron');

// Module to control application life.
const app = electron.app;

// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;
const ipc = electron.ipcMain
const url = require('url');
const SVGO = require('svgo');

var svgo = new SVGO();

let mainWindow;

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({width: 600, height: 600});

    // and load the index.html of the app.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));


    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    mainWindow.on('closed', () => {
        mainWindow = null
    });
}


app.on('ready', () => createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
})

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
ipc.on('shrinkSvg', (event, svgName, svgPath, svgLastModified) => {

    fs.readFile(svgPath, 'utf8', function (err, data) {

        if (err || !checkFileType(svgName)) {
            throw err;

        }

        let newFile = generateNewPath(svgPath);

        svgo.optimize(data, function (result) {
            fs.writeFile(newFile, result.data, '', () => {

            })

            event.sender.send('isShrinked', newFile);
        })
    })
})

let checkFileType = fileName => {
    if (fileName.split('.').pop() !== 'svg') {
        throw 'Not SVG!'
        return false;
    }

    return true;
}

let generateNewPath = pathName => {
    let arrPath = pathName.split('.');
    let newPath = arrPath[0] + '.min.' + arrPath[1];

    return newPath;
}