/* eslint-disable indent */
const {app, BrowserWindow, ipcMain, dialog} = require('electron');
const fs = require('fs');
const path = require('path');
const url = require('url');
const svgo = require('svgo');
const execFile = require('child_process').execFile;
const mozjpeg = require('mozjpeg');
const pngquant = require('pngquant-bin');
// const console = require('console'); // only for dev

let svg = new svgo();

const debug = 0;
let mainWindow;

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        titleBarStyle: 'hidden-inset',
        width: 300,
        height: 400,
        frame: true,
        backgroundColor: '#F7F7F7',
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


    require('./menu/mainmenu');

}


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

        fs.readFile(filePath, 'utf8', function (err, data) {

            if (err) {
                throw err;
            }

            let newFile = generateNewPath(filePath);

            switch (checkFileType(fileName)) {

                case 'svg':
                    svg.optimize(data)
                        .then(function (result) {
                            fs.writeFile(newFile, result.data, '', () => {
                            });
                            event.sender.send('isShrinked', newFile);
                        })
                        .catch(function (error) {
                            dialog(error.message);
                        });

                    break;

                case 'jpg':
                case 'jpeg':
                    execFile(mozjpeg, ['-outfile', newFile, filePath], () => {
                        event.sender.send('isShrinked', newFile);
                    });

                    break;

                case 'png':
                    execFile(pngquant, ['-o', newFile, filePath], () => {
                        event.sender.send('isShrinked', newFile);
                    });

                    break;

                default:
                    dialog.showMessageBox({
                        'type': 'error',
                        'message': 'Only SVG, JPG and PNG allowed'
                    });
            }
        });
    }
);


const checkFileType = fileName => {
    return fileName.split('.').pop();
};


const generateNewPath = pathName => {
    let arrPath = pathName.split('.');

    return arrPath[0] + '.min.' + arrPath[1];
};


module.exports = debug;