'use strict';

const {ipcRenderer, shell} = require('electron');
const console = require('console');


let dragzone = document.getElementById('dragzone'),
    resultBox = document.getElementById('result'),
    btnOpenSettings = document.getElementById('btnOpenSettings'),
    btnCloseSettings = document.getElementById('btnCloseSettings'),
    menuSettings = document.getElementById('menuSettings'),
    switches = document.getElementsByTagName('input');

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

    for (let f of e.dataTransfer.files) {
        ipcRenderer.send('shrinkImage', f.name, f.path, f.lastModified);
    }
    dragzone.classList.remove('drag-active');

    return false;
};

switches.change = (e) => {
    console.log(e);
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
            resultBox.appendChild(resContainer);

            // Notification
            new window.Notification('Image shrinked, pal!', {
                body: path,
                silent: true
            });
        }
    )
    .on(
        'test', (event) => {
            console.log(event);
        }
    );


// Parallax background
let bg = document.getElementById('background'),
    winX = window.innerWidth / 2,
    winY = window.innerHeight / 2;

document.onmousemove = (e) => {
    let transX = e.clientX - winX;
    let transY = e.clientY - winY;
    let tiltX = (transX / winY);
    let tiltY = -(transY / winX);
    let radius = Math.sqrt(Math.pow(tiltX, 2) + Math.pow(tiltY, 2));
    let degree = (radius * 15);

    bg.style.transform = 'scale(1.15) rotate3d(' + tiltX + ', ' + tiltY + ', 0, ' + degree + 'deg)';
};

document.onmouseleave = () => {
    bg.style.transform = 'scale(1.1) rotate3d(0,0,0,0)';
};