const { ipcRenderer, shell } = require('electron');
const settings = require('electron-settings');
const { dialog } = require('electron').remote;
const fs = require('fs');
const path = require('path');
const log = require('electron-log');
const cutFolderName = require(path.resolve('lib/cutfoldername'));


const dragzone = document.getElementById('dragzone'),
    resultBox = document.getElementById('result'),
    btnOpenSettings = document.getElementById('btnOpenSettings'),
    btnCloseSettings = document.getElementById('btnCloseSettings'),
    menuSettings = document.getElementById('menuSettings'),
    switches = document.getElementsByTagName('input'),
    openInBrowserLink = document.getElementsByClassName('openInBrowser'),
    btnSavepath = document.getElementById('btnSavepath'),
    wrapperSavePath = document.getElementById('wrapperSavePath'),
    folderswitch = document.getElementById('folderswitch'),
    clearlist = document.getElementById('clearlist'),
    updatecheck = document.getElementById('updatecheck'),
    suffix = document.getElementById('suffix'),
    subfolder = document.getElementById('subfolder'),
    notification = document.getElementById('notification');

/*
 * Settings
 */
let userSetting = settings.getAll();
notification.checked = userSetting.notification;
clearlist.checked = userSetting.clearlist;
updatecheck.checked = userSetting.updatecheck;
suffix.checked = userSetting.suffix;
subfolder.checked = userSetting.subfolder;


if (userSetting.folderswitch === false)
{
    folderswitch.checked = false;
    wrapperSavePath.classList.remove('d-none');
} else
{
    folderswitch.checked = true;
}

/**
 * @param {{savepath:string}} userSetting
 */
if (userSetting.savepath)
    btnSavepath.innerText = cutFolderName(userSetting.savepath[0]);

/*
 * Open filepicker
 */
dragzone.onclick = () => {
    dialog.showOpenDialog(
        {
            properties: ['openFile', 'multiSelections']
        }).then(result => {

        if (result.canceled)
        {
            return;
        }

        // Add loader
        dragzone.classList.add('is--processing');

        if (settings.get('clearlist') === true)
        {
            resultBox.innerHTML = '';
        }

        for (let f of result.filePaths)
        {
            let filename = path.parse(f).base;
            ipcRenderer.send('shrinkImage', filename, f);
        }

    }).catch(err => {
        log.error(err);
    });

};

document.ondragover = () => {
    dragzone.classList.add('drag-active');
    return false;
};

document.ondragleave = () => {
    dragzone.classList.remove('drag-active');
    return false;
};

document.ondragend = () => {
    dragzone.classList.remove('drag-active');
    return false;
};

/*
 * Action on drag drop
 */
document.ondrop = e => {
    e.preventDefault();

    let items = e.dataTransfer.items;
    for (let i = 0; i < items.length; i++)
    {
        // webkitGetAsEntry is where the magic happens
        let item = items[i].webkitGetAsEntry();
        if (item)
        {
            traverseFileTree(item);
        }
    }

    if (settings.get('clearlist'))
    {
        resultBox.innerHTML = '';
    }

    dragzone.classList.add('is--processing');
    dragzone.classList.remove('drag-active');

    return false;
};

/*
 * Choose folder for saving shrinked images
 */
btnSavepath.onclick = () => {
    dialog.showOpenDialog(
        {
            properties: ['openDirectory', 'createDirectory']
        }).then(result => {
        if (result.filePaths)
        {
            btnSavepath.innerText = cutFolderName(result.filePaths[0]);
            settings.set('savepath', result.filePaths);
        }
    }).catch(err => {
        log.error(err);
    });
};

/*
 * Save settings
 */
Array.from(switches).forEach(switchEl => {
    switchEl.onchange = e => {
        settings.set(e.target['name'], e.target['checked']);
        if (e.target['name'] === 'folderswitch')
        {
            if (!e.target['checked'])
            {
                wrapperSavePath.classList.remove('d-none');
            } else
            {
                wrapperSavePath.classList.add('d-none');
            }
        }
    };
});

/*
 * Settings menu
 */
// Open
btnOpenSettings.onclick = e => {
    e.preventDefault();
    menuSettings.classList.add('is--open');
};

// Close on pressing close icon
btnCloseSettings.onclick = e => {
    e.preventDefault();
    menuSettings.classList.remove('is--open');
};

// Close on pressing ESC
document.onkeyup = e => {
    if (e.key === 'Escape')
    {
        menuSettings.classList.remove('is--open');
    }
};

/*
 * Renderer process
 */
ipcRenderer.on('isShrinked', (event, path, sizeBefore, sizeAfter) => {
    const percent = Math.round((100 / sizeBefore) * (sizeBefore - sizeAfter));

    // Remove loader
    dragzone.classList.remove('is--processing');

    // Create container
    const resContainer = document.createElement('div');
    resContainer.className = 'resLine';
    resContainer.innerHTML =
        '<span>You saved ' +
        percent +
        '%. Your shrinked image is here:</span><br>';

    // Create link
    let resElement = document.createElement('a');
    resElement.setAttribute('href', '#');
    let resText = document.createTextNode(path);
    resElement.appendChild(resText);

    // Add click event
    resElement.onclick = el => {
        el.preventDefault();
        shell.showItemInFolder(path);
    };

    resContainer.appendChild(resElement);
    resultBox.prepend(resContainer);

    // Notification
    if (settings.get('notification'))
    {
        new window.Notification('Image shrinked, pal!', {
            body: path,
            silent: true
        });
    }
}).on('openSettings', () => {
    menuSettings.classList.add('is--open');
}).on('error', () => {
    // Remove loader
    dragzone.classList.remove('is--processing');
});

/*
 * Parallax background
 */
let bg = document.getElementById('background'),
    winX = window.innerWidth / 2,
    winY = window.innerHeight / 2;

// Fix window size on resize
window.onresize = () => {
    setTimeout(() => {
        winX = window.innerWidth / 2;
        winY = window.innerHeight / 2;
    }, 700);
};

// Let's do some parallax stuff
document.onmousemove = e => {
    let transX = e.clientX - winX,
        transY = e.clientY - winY,
        tiltX = transX / winY,
        tiltY = -(transY / winX),
        radius = Math.sqrt(Math.pow(tiltX, 2) + Math.pow(tiltY, 2)),
        transformX = Math.floor(tiltX * Math.PI),
        transformY = Math.floor(tiltY * Math.PI),
        degree = radius * 15,
        transform;

    transform = 'scale(1.15)';
    transform += ' rotate3d(' + tiltX + ', ' + tiltY + ', 0, ' + degree + 'deg)';
    transform += ' translate3d(' + transformX + 'px, ' + transformY + 'px, 0)';

    bg.style.transform = transform;
};

// Reset, if mouse leaves window
document.onmouseleave = () => {
    bg.style.transform = '';
};

// (opt) event, text as return value
ipcRenderer.on('updateReady', () => {
    // changes the text of the button
    const container = document.getElementById('ready');
    container.innerHTML = 'new version available!';
});

/*
 * Open external links in browser
 */
Array.from(openInBrowserLink).forEach((el) => {
    el.addEventListener('click', (event) => {
        event.preventDefault();
        shell.openExternal(el.getAttribute('href')).catch((error) => {
            log.error(error);
        });
    });
});

/**
 * Traverse down the folders and exclude files in `exclude` array
 */
function traverseFileTree(item, path)
{
    const exclude = ['.DS_Store'];
    path = path || '';
    if (item.isFile)
    {
        // Get file
        item.file(function(f) {
            if (fs.statSync(f.path).isDirectory() || exclude.includes(f.name))
            {
                dragzone.classList.remove('drag-active');

                return false;
            }
            ipcRenderer.send('shrinkImage', f.name, f.path, f.lastModified);
        });
    } else if (item.isDirectory)
    {
        // Get folder contents
        const dirReader = item.createReader();
        dirReader.readEntries(function(entries) {
            for (let i in entries)
            {
                traverseFileTree(entries[i], path + item.name + '/');
            }
        });
    }
}