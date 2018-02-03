const {app, Menu} = require('electron');
const {debug} = require('../main');

const template = [
    {
        label: 'Edit',
        submenu: [
            {
                label: 'Reload',
                accelerator: 'Cmd+R',
                role: 'reload'
            }
        ]
    },
    {
        role: 'window',
        submenu: [
            {role: 'minimize'},
            {role: 'close'}
        ]
    }
];

if (process.platform === 'darwin') {
    template.unshift({
        label: app.getName(),
        submenu: [
            {role: 'about'},
            {type: 'separator'},
            {
                label: 'Preferences',
                click: (item, focusedWindow) => {
                    focusedWindow.webContents.send('openSettings');
                },
                accelerator: 'Cmd+,',
            },

            {type: 'separator'},
            {role: 'quit'}
        ]
    });

    // Window menu
    template[2].submenu = [
        {role: 'minimize'},
        // {role: 'zoom'}, Todo: fix parallax
        {type: 'separator'},
        {role: 'front'},
    ];

    if (debug === 1) {
        template[2].submenu.push(
            {type: 'separator'},
            {
                label: 'Open Dev-Tools',
                click: (item, focusedWindow) => {
                    if (focusedWindow)
                        focusedWindow.toggleDevTools();
                }
            }
        );
    }
}

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);