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
        {role: 'zoom'},
        {type: 'separator'},
        {role: 'front'},
    ];
    
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
    
    if (global.debug.devTools === 1) {
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

