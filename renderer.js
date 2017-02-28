// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

'use strict';

const ipc = require('electron').ipcRenderer


var dragzone = document.getElementById('dragzone'),
    resultBox = document.getElementById('result');

dragzone.ondragover = dragzone.ondragleave = dragzone.ondragend = () => {
    return false;
};

dragzone.ondrop = (e) => {
    e.preventDefault();

    for (let f of e.dataTransfer.files) {
        console.log(f);
        ipc.send('shrinkSvg', f.name, f.path, f.lastModified);
    }

    return false;
};


ipc.on('isShrinked', (event, path) => {
    const result = `Wrote SVG to: ${path}`
    resultBox.innerHTML += '<div class="resLine">' + result + '</div>';
})