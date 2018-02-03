const {app, Menu} = require('electron');

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
                    focusedWindow.webContents.send('test');
                },
                accelerator: 'Cmd+,',
            },
            {role: 'quit'}
        ]
    });

    // Window menu
    template[2].submenu = [
        {role: 'minimize'},
        {role: 'zoom'},
        {type: 'separator'},
        {role: 'front'},
    ];
}

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);