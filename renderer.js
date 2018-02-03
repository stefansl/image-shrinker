'use strict';

const {ipcRenderer, shell} = require('electron');
const {dialog} = require('electron').remote;
//const console = require('console');
const path = require('path');

let settings;

let dragzone = document.getElementById('dragzone'),
    resultBox = document.getElementById('result'),
    btnOpenSettings = document.getElementById('btnOpenSettings'),
    btnCloseSettings = document.getElementById('btnCloseSettings'),
    menuSettings = document.getElementById('menuSettings'),
    switches = document.getElementsByTagName('input'),
    openInBrowserLink = document.getElementsByClassName('openInBrowser');

dragzone.onclick = () => {
    dialog.showOpenDialog(
        {
            properties: ['openFile', 'multiSelections']
        },
        (item) => {
            if (!item) {
                return;
            }

            if(settings.clearResultBox) {
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

    if(settings.clearResultBox) {
        resultBox.innerHTML = '';
    }

    dragzone.classList.remove('drag-active');

    return false;
};


Array.from(switches).forEach((switchEl) => {
    switchEl.onchange = (e) => {
        // Todo: get and set settings
        // console.log(e.target.name);
        // console.log(e.target.checked);
    };
});

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
            new window.Notification('Image shrinked, pal!', {
                body: path,
                silent: true
            });
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