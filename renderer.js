'use strict';

const {ipcRenderer, shell} = require('electron');


let dragzone = document.getElementById('dragzone'),
    resultBox = document.getElementById('result');

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
        ipcRenderer.send('shrinkSvg', f.name, f.path, f.lastModified);
    }
    dragzone.classList.remove('drag-active');

    return false;
};

ipcRenderer.on(
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
);