const {app, BrowserWindow, ipcMain, dialog} = require('electron');
const fs = require('fs');
const path = require('path');

const url = require('url');
const SVGO = require('svgo');
var execFile = require('child_process').execFile;
var jpegtran = require('jpegtran-bin');

let svgo = new SVGO();

let mainWindow;

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
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
    // mainWindow.webContents.openDevTools()

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
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
ipcMain.on('shrinkSvg', (event, fileName, filePath) => {

    fs.readFile(filePath, 'utf8', function (err, data) {

        if (err) {
            throw err;
        }

        let newFile = generateNewPath(filePath);
        
        switch (checkFileType(fileName)) {
            case 'svg':
                console.log('SVG, du Schwein');
                svgo.optimize(data, function (result) {
                    fs.writeFile(newFile, result.data, '', () => {});
                    event.sender.send('isShrinked', newFile);
                });
                break;
            case 'jpg':
            case 'jpeg':
                execFile(jpegtran, ['-outfile', newFile, filePath], (err) => {
                    event.sender.send('isShrinked', newFile);
                });
                break;
            case 'png':
                console.log(filePath);
                console.log(newFile);

                console.log(checkFileType(fileName) + ', du Affe!');
                imagemin([filePath], newFile, {
                    plugins: [
                        imageminJpegtran(),
                        imageminPngquant({quality: '65-80'})
                    ]
                }).then(files => {
                    event.sender.send('isShrinked', newFile);
                    //=> [{data: <Buffer 89 50 4e …>, path: 'build/images/foo.jpg'}, …]
                });
                break;
            default:
                console.log('EAT SHIT AND DIE!');
                dialog.showMessageBox({
                    'type': 'error',
                    'message': 'Only SVG, JPG and PNG allowed'
                });
        }

    });
});


const checkFileType = fileName => {
    var mime = fileName.split('.').pop();

    return mime;
};


const generateNewPath = pathName => {
    let arrPath = pathName.split('.');

    return arrPath[0] + '.min.' + arrPath[1];
};