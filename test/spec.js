const Application = require('spectron').Application;
const assert = require('assert');
const electron = require('electron');
const path = require('path');
const makedir = require('make-dir');
//const settings = require('electron-settings');
const fs = require('fs-extra');

const describe = global.describe;
const it = global.it;
const beforeEach = global.beforeEach;
const afterEach = global.afterEach;

//let userSettings = settings.getAll();
let testPath = '~/Desktop/test/spectron/My Folder';

describe('Application launch', function () {
    this.timeout(10000);

    beforeEach(() => {
        this.app = new Application({
            path: 'dist/mac/Image Shrinker.app/Contents/MacOS/Image Shrinker',
            args: [path.join(__dirname, '..')]
        });

        return this.app.start();
    });

    afterEach(() => {
        if (this.app && this.app.isRunning()) {
            return this.app.stop();
        }
    });


    it('shows an initial window', () => {
        return this.app.client.getWindowCount().then((count) => {
            assert.equal(count, 1);
            // Please note that getWindowCount() will return 2 if `dev tools` are opened.
            // assert.equal(count, 2)
        });
    });

    it('openSettings', () => {
        return this.app.client.waitUntilWindowLoaded()
            .browserWindow.getBounds()
            .click('#btnOpenSettings')
            ;
    });

    it('deleting folder, if it exists', () => {
        fs.remove(testPath, (a) => {
            return a;
        });
    });

    it('test saving in non-existent folders', () => {
        //settings.set('folderswitch', false);
        //settings.set('savepath', testPath);
    });


});