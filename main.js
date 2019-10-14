const { app, nativeImage, BrowserWindow, ipcMain, dialog, TouchBar } = require(
    'electron');
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
    devTools: 0
};

/**
 * Create the browser window
 */
const createWindow = () => {

    /** Create the browser window. */
    mainWindow = new BrowserWindow({
        titleBarStyle: 'hiddenInset',
        width: 340,
        height: 550,
        minWidth: 340,
        minHeight: 550,
        frame: false,
        backgroundColor: '#F7F7F7',
        resizable: true,
        show: false,
        icon: path.join(__dirname, 'assets/icons/png/64x64.png'),
        webPreferences: {
            nodeIntegration: true
        }
    });

    /** show it when it's ready */
    mainWindow.on('ready-to-show', () => {
        mainWindow.show();
    });

    /** and load the index.html of the app. */
    mainWindow.loadURL(path.join('file://', __dirname, '/index.html')).then(
        () => {
            /** Open the DevTools. */
            global.debug.devTools === 0 ||
            mainWindow.webContents.openDevTools();
        }
    ).catch(
        (error) => {
            log.error(error);
        }
    );

    /** Open the DevTools. */
    global.debug.devTools === 0 || mainWindow.webContents.openDevTools();

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
        updatecheck: true,
        subfolder: false,
    };

    /** set missing settings */
    Object.keys(defaultSettings).filter((setting) => {
        if (!settings.has(setting)) {
            settings.set(setting, defaultSettings[setting]);
        }
    });

    mainWindow.setTouchBar(touchBar);
    require('./menu/mainmenu');
};

/** Touchbar support */
let touchBarResult = new TouchBarButton({
    label: 'Let me shrink some images!',
    backgroundColor: '#000000',
    click: () => {
        dialog.showOpenDialog({
            properties: ['openFile', 'multiSelections']
        }).then(result => {
            if (result.canceled)
            {
                return;
            }
            for (let filePath of result.filePaths)
            {
                processFile(filePath, path.basename(filePath));
            }
        }).catch(err => {
            log.error(err);
        });
    }
});

let touchBarIcon = new TouchBarButton({
    backgroundColor: '#000000',
    'icon': nativeImage.createFromPath(path.join(__dirname, 'assets/icons/png/16x16.png')),
    iconPosition: 'center'
});

const touchBar = new TouchBar({
    items: [
        touchBarResult
    ]
});

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
    if (settings.get('updatecheck') === true)
    {
        autoUpdater.checkForUpdatesAndNotify().catch((error) => {
            log.error(error);
        });
    }
});

/** Quit when all windows are closed. */
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
    {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null)
    {
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
    let sizeOrig = getFileSize(filePath, false);

    /** Process image(s) */
    fs.readFile(filePath, 'utf8', (err, data) => {

        if (err)
        {
            throw err;
        }

        app.addRecentDocument(filePath);
        let newFile = generateNewPath(filePath);

        switch (path.extname(fileName).toLowerCase())
        {
            case '.svg':
            {
                svg.optimize(data).then((result) => {
                    fs.writeFile(newFile, result.data, (err) => {
                        touchBarResult.label = 'Your shrinked image: ' +
                            newFile;

                        sendToRenderer(err, newFile, sizeOrig);
                    });
                }).catch((error) => {
                    dialog(error.message);
                });
                break;
            }
            case '.jpg':
            case '.jpeg':
            {
                // Create temp file from original
                let origFile;
                let addTmpFile = !settings.get('suffix') && !settings.get('subfolder');

                if (addTmpFile) {
                    origFile = newFile + '.tmp';
                    fs.copyFileSync(filePath, origFile);
                }else {
                    origFile = filePath;
                }

                //
                execFile(mozjpeg, ['-outfile', newFile, origFile], (err) => {
                    // Delete tmp file
                    !addTmpFile || fs.unlinkSync(origFile);

                    touchBarResult.label = 'Your shrinked image: ' + newFile;
                    sendToRenderer(err, newFile, sizeOrig);
                });

                break;
            }
            case '.png':
            {
                execFile(pngquant, ['-fo', newFile, filePath], (err) => {
                    touchBarResult.label = 'Your shrinked image: ' + newFile;
                    sendToRenderer(err, newFile, sizeOrig);
                });
                break;
            }
            case '.gif':
            {
                execFile(gifsicle, ['-o', newFile, filePath, '-O=2', '-i'],
                    err => {
                        touchBarResult.label = 'Your shrinked image: ' +
                            newFile;
                        sendToRenderer(err, newFile, sizeOrig);
                    });
                break;
            }
            default:
                mainWindow.webContents.send('error');
                dialog.showMessageBox({
                    'type': 'error',
                    'message': 'Only PNG SVG, JPG and GIF allowed'
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
    if (settings.get('subfolder'))
    {
        objPath.dir = objPath.dir + '/minified';
    }

    if (settings.get('folderswitch') === false &&
        typeof settings.get('savepath') !== 'undefined')
    {
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

    if (mb)
    {
        fileSize = fileSize / 1024;
    }

    return fileSize;
};

/**
 * Send data to renderer script
 * @param  {object} err      Error message
 * @param  {string} newFile  New filename
 * @param  {number}  sizeOrig Original filesize
 */
let sendToRenderer = (err, newFile, sizeOrig) => {

    if (!err)
    {
        let sizeShrinked = getFileSize(newFile, false);

        mainWindow.webContents.send(
            'isShrinked',
            newFile,
            sizeOrig,
            sizeShrinked
        );
    } else
    {
        log.error(err);
        mainWindow.webContents.send('error');
        dialog.showMessageBox({
            'type': 'error',
            'message': 'I\'m not able to write your new image. Sorry! Error: ' + err
        });
    }
};
