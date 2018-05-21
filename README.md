# Image Shrinker

Image Shrinker (prev. SVG Shrinker) is a tool to minify images and graphics using [pngquant](https://pngquant.org/), [mozjpg](https://github.com/mozilla/mozjpeg) and [SVGO](https://github.com/svg/svgo). Built with web technologies in [Electron](https://electronjs.org)

![Screenrecording Imageshrinker](https://user-images.githubusercontent.com/1564251/40296606-61863e56-5cdd-11e8-9f43-3a74c48d21a0.gif)

## How to use
Drag your image file onto the Image Shrinker window and it will saved in the same or in a predefined folder as reduced image.
The original graphic will be not replaced.

## Download and Installation on macOS
Download Image Shrinker here:  
https://github.com/stefansl/image-shrinker/releases/download/v1.3.7/image-shrinker-1.3.7.dmg

Unpack and copy or drag the app into your macOS application folder.
For uninstalling, just drop the app into the bin.

## Build your own
Get the repo
```shell
git clone https://github.com/stefansl/image-shrinker.git
```
Install dependencies
```shell
$ cd image-shrinker
$ npm install
```
Generate your macOS package
```shell
npm run pack-mac
```

Generate your Linux package
```shell
npm run pack-linux
```

## Credits
Thank you, guys!
* Electron: https://electronjs.org
* pngquant: https://pngquant.org/
* mozjpg: https://github.com/mozilla/mozjpeg
* SVGO: https://github.com/svg/svgo
* Settings framework: https://github.com/nathanbuchar/electron-settings
* Poly background: http://alssndro.github.io/trianglify-background-generator
* CSS: [Spectre Css](https://picturepan2.github.io/spectre/)
* Font: [Mozillas Fira Sans](https://github.com/mozilla/Fira)

