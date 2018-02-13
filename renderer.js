const {ipcRenderer, shell} = require('electron');
const settings = require('electron-settings');
const {dialog} = require('electron').remote;
const fs = require('fs');
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
    //suffix = document.getElementById('suffix');

/*
 * Settings
 */
let userSetting = settings.getAll();
notification.checked = userSetting.notification;
clearlist.checked = userSetting.clearlist;

if (userSetting.folderswitch === false) {
    folderswitch.checked = false;
    wrapperSavePath.classList.remove('d-none');
} else {
    folderswitch.checked = true;
}
if (userSetting.savepath) btnSavepath.innerText = userSetting.savepath;


/*
 * Open filepicker
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

            // Add loader
            dragzone.classList.add('is--processing');
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


/*
 * Action on drag drop
 */
document.ondrop = (e) => {
    e.preventDefault();

    for (let f of e.dataTransfer.files) {
        if (fs.statSync(f.path).isDirectory()) {
            dragzone.classList.remove('drag-active');

            return false;
        }

        ipcRenderer.send('shrinkImage', f.name, f.path, f.lastModified);
    }

    if(settings.get('clearlist')) {
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
            properties: ['openDirectory']
        }, (path) => {
            if (typeof path !== 'undefined') {
                btnSavepath.innerText = path;
                settings.set('savepath', path);
            }
        }
    );
};


/*
 * Save settings
 */
Array.from(switches).forEach((switchEl) => {
    switchEl.onchange = (e) => {
        settings.set(e.target.name, e.target.checked);
        if(e.target.name === 'folderswitch') {
            if (e.target.checked === false) {
                wrapperSavePath.classList.remove('d-none');
            } else {
                wrapperSavePath.classList.add('d-none');
            }
        }
    };
});


/*
 * Settings menu
 */
btnOpenSettings.onclick = (e) => {
    e.preventDefault();
    menuSettings.classList.add('is--open');
};
btnCloseSettings.onclick = (e) => {
    e.preventDefault();
    menuSettings.classList.remove('is--open');
};


/*
 * Renderer process
 */
ipcRenderer
    .on(
        'isShrinked', (event, path, sizeBefore, sizeAfter) => {

            let percent = Math.round(100 / sizeBefore * sizeAfter);

            // Remove loader
            dragzone.classList.remove('is--processing');

            // Create container
            let resContainer = document.createElement('div');
            resContainer.className = 'resLine';
            resContainer.innerHTML = '<span>You saved ' + percent + '%. Your shrinked image is here:</span><br>';

            // Create link
            let resElement = document.createElement('a');
            resElement.setAttribute('href', '#');
            let resText = document.createTextNode(path);
            resElement.appendChild(resText);

            // Add click event
            resElement.onclick = (el) => {
                el.preventDefault();
                shell.showItemInFolder(path);
            };

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


/*
 * Parallax background
 */
let bg = document.getElementById('background'),
    winX = window.innerWidth / 2,
    winY = window.innerHeight / 2;

// Fix window size on resize
window.onresize = () => {
    setTimeout(()=>{
        winX = window.innerWidth / 2;
        winY = window.innerHeight / 2;
    }, 700);
};

// Let's do some parallax stuff
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

// Reset, if mouse leaves window
document.onmouseleave = () => {
    bg.style.transform = '';
};


/*
 * Open external links in browser
 */
Array.from(openInBrowserLink).forEach((el) => {
    el.onclick = (e) => {
        e.preventDefault();
        shell.openExternal(e.srcElement.offsetParent.lastElementChild.href);
    };
});

// TEST ResizeObserver
const chromeVersion = process.versions.chrome.split('.',1)[0];
if (chromeVersion > 64) {
    const ro = new ResizeObserver( entries => {
        for (const entry of entries) {
            const cr = entry.contentRect;
            console.log('Element:', entry.target);
            console.log(`Element size: ${cr.width}px × ${cr.height}px`);
            console.log(`Element padding: ${cr.top}px ; ${cr.left}px`);
        }
    });

    // Observe one or multiple elements
    ro.observe(document);
}


