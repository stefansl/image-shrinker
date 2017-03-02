
'use strict';

const {ipcRenderer} = require('electron');


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

ipcRenderer.on('isShrinked', (event, path) => {
    const result = `<span>Wrote SVG to:</span><br>${path}`;
    resultBox.innerHTML += `<div class="resLine" data-finder="${result}">${result}</div>`;
});