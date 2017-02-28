const {app, BrowserWindow, ipcMain, dialog} = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

const url = require('url');
const SVGO = require('svgo');

var svgo = new SVGO();

let mainWindow;

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({width: 600, height: 600, frame: true,backgroundColor: '#F7F7F7'});

    // and load the index.html of the app.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));


    // Open the DevTools.
     mainWindow.webContents.openDevTools()

    mainWindow.on('closed', () => {
        mainWindow = null
    });
}


app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
})

// Main logic
ipcMain.on('shrinkSvg', (event, svgName, svgPath, svgLastModified) => {

    fs.readFile(svgPath, 'utf8', function (err, data) {

        if (err) {
            throw err;
        }

        if (!checkFileType(svgName)) {
            dialog.showMessageBox({
                'type': 'error',
                'message': 'Only SVG allowed'
            })
        } else {
            let newFile = generateNewPath(svgPath);

            svgo.optimize(data, function (result) {
                fs.writeFile(newFile, result.data, '', () => {

                })

                event.sender.send('isShrinked', newFile);
            })
        }

    })
})

let checkFileType = fileName => {
    if (fileName.split('.').pop() !== 'svg') {

        return false;
    }

    return true;
}

let generateNewPath = pathName => {
    let arrPath = pathName.split('.');
    let newPath = arrPath[0] + '.min.' + arrPath[1];

    return newPath;
}