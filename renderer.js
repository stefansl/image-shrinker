'use strict';

const {ipcRenderer, shell} = require('electron');
const settings = require('electron-settings');
const {dialog} = require('electron').remote;
//const console = require('console');
const path = require('path');

let dragzone = document.getElementById('dragzone'),
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
    notification = document.getElementById('notification');


/*
 * Settings
 */
let userSetting = settings.getAll();
notification.checked = (true === userSetting.notification) ? true : false;
clearlist.checked = (true === userSetting.clearlist) ? true : false;
folderswitch.checked = (true === userSetting.folderswitch) ? true : false;

if (userSetting.folderswitch === false) wrapperSavePath.classList.remove('d-none');
if (userSetting.savepath) btnSavepath.innerText = userSetting.savepath;

/*
settings.watch('notification', (newValue) => {
    userSetting.notification = newValue;
});

settings.watch('clearlist', (newValue) => {
    userSetting.clearlist = newValue;
});
*/

dragzone.onclick = () => {
    dialog.showOpenDialog(
        {
            properties: ['openFile', 'multiSelections']
        },
        (item) => {
            if (!item) {
                return;
            }

            if (settings.get('clearlist') === true) {
                resultBox.innerHTML = '';
            }

            for (let f of item) {
                let filename = path.parse(f).base;
                ipcRenderer.send('shrinkImage', filename, f);
            }
        }
    );
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

document.ondrop = (e) => {
    e.preventDefault();
    // console.log(e.dataTransfer.files);
    for (let f of e.dataTransfer.files) {
        ipcRenderer.send('shrinkImage', f.name, f.path, f.lastModified);
    }

    if(settings.get('clearlist')) {
        resultBox.innerHTML = '';
    }

    dragzone.classList.remove('drag-active');

    return false;
};


Array.from(switches).forEach((switchEl) => {
    switchEl.onchange = (e) => {
        settings.set(e.target.name, e.target.checked);
        if(e.target.name === 'folderswitch' && e.target.checked === false) {
            wrapperSavePath.classList.remove('d-none');
        } else {
            wrapperSavePath.classList.add('d-none');
        }
    };
});

btnSavepath.onclick = () => {
    dialog.showOpenDialog(
        {
            properties: ['openDirectory']
        }, (path) => {
            if (typeof path !== 'undefined') {
                btnSavepath.innerText = path;
                settings.set('savepath', path);
            }
        }
    );
};

btnOpenSettings.onclick = (e) => {
    e.preventDefault();
    menuSettings.classList.add('is--open');
};
btnCloseSettings.onclick = (e) => {
    e.preventDefault();
    menuSettings.classList.remove('is--open');
};


ipcRenderer
    .on(
        'isShrinked', (event, path) => {

            // Create container
            let resContainer = document.createElement('div');
            resContainer.className = 'resLine';
            resContainer.innerHTML = '<span>Your shrinked image is here:</span><br>';

            // Create link
            let resElement = document.createElement('a');
            resElement.setAttribute('href', '#');
            let resText = document.createTextNode(path);
            resElement.appendChild(resText);

            // Add click event
            resElement.addEventListener('click', function (el) {
                el.preventDefault();
                shell.showItemInFolder(path);
            });

            resContainer.appendChild(resElement);
            resultBox.prepend(resContainer);

            // Notification
            if (settings.get('notification') === true) {
                new window.Notification('Image shrinked, pal!', {
                    body: path,
                    silent: true
                });
            }
        }
    )
    .on(
        'openSettings', () => {
            menuSettings.classList.add('is--open');
        }
    );


// Parallax background
let bg = document.getElementById('background'),
    winX = window.innerWidth / 2,
    winY = window.innerHeight / 2;

document.onmousemove = (e) => {
    let transX = e.clientX - winX,
        transY = e.clientY - winY,
        tiltX = (transX / winY),
        tiltY = -(transY / winX),
        radius = Math.sqrt(Math.pow(tiltX, 2) + Math.pow(tiltY, 2)),
        transformX = Math.floor(tiltX * Math.PI),
        transformY = Math.floor(tiltY * Math.PI),
        degree = (radius * 15),
        transform;

    transform  = 'scale(1.15)';
    transform += ' rotate3d(' + tiltX + ', ' + tiltY + ', 0, ' + degree + 'deg)';
    transform += ' translate3d(' + transformX + 'px, ' + transformY + 'px, 0)';

    bg.style.transform = transform;
};

document.onmouseleave = () => {
    bg.style.transform = '';
};


Array.from(openInBrowserLink).forEach(function(el) {
    el.onclick = (e) => {
        e.preventDefault();
        shell.openExternal(e.srcElement.offsetParent.lastElementChild.href);
    };
});