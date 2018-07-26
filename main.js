const { app, nativeImage, BrowserWindow, ipcMain, dialog, shell, TouchBar } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const fs = require('fs');
const path = require('path');
const settings = require('electron-settings');
const svgo = require('svgo');
const execFile = require('child_process').execFile;
const mozjpeg = require('mozjpeg');
const pngquant = require('pngquant-bin');
const makeDir = require('make-dir');
const { TouchBarButton } = TouchBar;
const gifsicle = require('gifsicle');

/**
 * Start logging in os log
 */
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

/**
 * Init vars
 */
let svg = new svgo();
let mainWindow;
global.debug = {
    devTools: 1
};

/**
 * Create the browser window
 */
const createWindow = () => {

    /** Create the browser window. */
    mainWindow = new BrowserWindow({
        titleBarStyle: 'hidden-inset',
        width: 340,
        height: 550,
        minWidth: 340,
        minHeight: 550,
        frame: true,
        backgroundColor: '#F7F7F7',
        resizable: true,
        autoHideMenuBar: true,
        useContentSize: true,
        show: false,
        resizable: false,
        maximizable: false,
        icon: path.join(__dirname, 'assets/icons/png/64x64.png')
    });

    /** and load the index.html of the app. */
    mainWindow.loadURL(path.join('file://', __dirname, '/index.html'));

    /** Open the DevTools. */
    // global.debug.devTools === 0 || mainWindow.webContents.openDevTools();

    /**  show the window **/

    mainWindow.on('ready-to-show', () => {
        console.timeEnd('ready-to-show')
        mainWindow.show()
    })

    /** Disable windows alt-menu  **/
    mainWindow.setMenu(null)

    /** Window closed */
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    /** Default settings */
    let defaultSettings = {
        notification: true,
        folderswitch: true,
        clearlist: false,
        suffix: true,
        updatecheck: true
    };

    /** set default settings at first launch */
    if (Object.keys(settings.getAll()).length === 0) {
        settings.setAll(defaultSettings);
    }

    /** set missing settings */
    let settingsAll = settings.getAll();
    Object.keys(defaultSettings).forEach((key) => {
        if (!settingsAll.hasOwnProperty(key)) {
            settings.set(key, defaultSettings[key]);
        }
    });

    mainWindow.setTouchBar(touchBar);
    require('./menu/mainmenu');
};


/** Touchbar support */
let touchBarResult = new TouchBarButton({
    'label': 'Let me shrink some images!',
    'backgroundColor': '#000000',
    'click': () => {
        shell.showItemInFolder(settings.get('savepath')[0]);
    }
});

let touchBarIcon = new TouchBarButton({
    backgroundColor: '#000000',
    icon: nativeImage.createFromPath(path.join(__dirname, 'build/18x18@2x.png')),
    iconPosition: 'center'
});

const touchBar = new TouchBar([
    touchBarResult
]);

/** Add Touchbar icon */
touchBar.escapeItem = touchBarIcon;

app.on('will-finish-launching', () => {
    app.on('open-file', (event, filePath) => {
        event.preventDefault();
        processFile(filePath, path.basename(filePath));
    });
});

/** Start app */
app.on('ready', () => {
    createWindow();
    if (settings.get('updatecheck') === true) {
        autoUpdater.checkForUpdatesAndNotify();
    }
});


/** Quit when all windows are closed. */
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


/** when the update has been downloaded and is ready to be installed, notify the BrowserWindow */
autoUpdater.on('update-downloaded', (info) => {
    log.info(info);
    mainWindow.webContents.send('updateReady');
});


/** when receiving a quitAndInstall signal, quit and install the new version ;) */
ipcMain.on('quitAndInstall', (event, arg) => {
    log.info(event);
    log.info(arg);
    autoUpdater.quitAndInstall();
});


/** Main logic */
ipcMain.on(
    'shrinkImage', (event, fileName, filePath) => {
        processFile(filePath, fileName);
    }
);


/**
 * Shrinking the image
 * @param  {string} filePath Filepath
 * @param  {string} fileName Filename
 */
let processFile = (filePath, fileName) => {

    /** Focus window on drag */
    !mainWindow || mainWindow.focus();

    /** Change Touchbar */
    touchBarResult.label = 'I am shrinking for you';

    /** Get filesize */
    let sizeOrig = getFileSize(filePath);

    /** Process image(s) */
    fs.readFile(filePath, 'utf8', (err, data) => {

        if (err) {
            throw err;
        }

        app.addRecentDocument(filePath);
        let newFile = generateNewPath(filePath);

        switch (path.extname(fileName)) {
            case '.svg': {
                svg.optimize(data)
                    .then((result) => {
                        fs.writeFile(newFile, result.data, (err) => {
                            touchBarResult.label = 'Your shrinked image: ' + newFile;
                            sendToRenderer(err, newFile, sizeOrig);
                        });
                    })
                    .catch((error) => {
                        dialog(error.message);
                    });
                break;
            }
            case '.jpg':
            case '.jpeg': {
                execFile(mozjpeg, ['-outfile', newFile, filePath], (err) => {
                    touchBarResult.label = 'Your shrinked image: ' + newFile;

                    sendToRenderer(err, newFile, sizeOrig);
                });

                break;
            }
            case '.png': {
                execFile(pngquant, ['-fo', newFile, filePath], (err) => {
                    touchBarResult.label = 'Your shrinked image: ' + newFile;
                    sendToRenderer(err, newFile, sizeOrig);
                });
                break;
            }
            case '.gif': {
                execFile(gifsicle, ['-o', newFile, filePath, '-O=2', '-i'], err => {
                    touchBarResult.label = 'Your shrinked image: ' + newFile;
                    sendToRenderer(err, newFile, sizeOrig);
                });
                break;
            }
            default:
                mainWindow.webContents.send('error');
                dialog.showMessageBox({
                    'type': 'error',
                    'message': 'Only SVG, JPG, GIF and PNG allowed'
                });
        }
    });
};

/**
 * Generate new path to shrinked file
 * @param  {string} pathName Filepath
 * @return {object}         filepath object
 */
const generateNewPath = (pathName) => {

    let objPath = path.parse(pathName);

    if (settings.get('folderswitch') === false && typeof settings.get('savepath') !== 'undefined') {
        objPath.dir = settings.get('savepath')[0];
    }

    makeDir.sync(objPath.dir);

    /** Suffix setting */
    let suffix = settings.get('suffix') ? '.min' : '';
    objPath.base = objPath.name + suffix + objPath.ext;

    return path.format(objPath);
};

/**
 * Calculate filesize
 * @param  {string} filePath Filepath
 * @param  {boolean} mb     If true return as MB
 * @return {number}         filesize in MB or KB
 */
let getFileSize = (filePath, mb) => {
    const stats = fs.statSync(filePath);
    let fileSize = stats.size;

    if (mb) {
        fileSize = fileSize / 1024;
    }

    return fileSize;
};

/**
 * Send data to renderer script
 * @param  {string} err      Error message
 * @param  {string} newFile  New filename
 * @param  {number}  sizeOrig Original filesize
 */
let sendToRenderer = (err, newFile, sizeOrig) => {

    if (!err) {
        let sizeShrinked = getFileSize(newFile);

        mainWindow.webContents.send('isShrinked', newFile, sizeOrig, sizeShrinked);
    }
    else {
        log.error(err);
        mainWindow.webContents.send('error');
        dialog.showMessageBox({
            'type': 'error',
            'message': 'I\'m not able to write your new image. Sorry!'
        });
    }
};
