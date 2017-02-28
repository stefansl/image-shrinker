
'use strict';

const {ipcRenderer} = require('electron')


var dragzone = document.getElementById('dragzone'),
    resultBox = document.getElementById('result');

dragzone.ondragover = dragzone.ondragleave = dragzone.ondragend = () => {
    return false;
};

dragzone.ondrop = (e) => {
    e.preventDefault();

    for (let f of e.dataTransfer.files) {
        ipcRenderer.send('shrinkSvg', f.name, f.path, f.lastModified);
    }

    return false;
};


ipcRenderer.on('isShrinked', (event, path) => {
    const result = `Wrote SVG to: ${path}`
    resultBox.innerHTML += '<div class="resLine">' + result + '</div>';
})