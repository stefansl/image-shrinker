# Image Shrinker

Image Shrinker is a tool to minify images and graphics using the best available libraries for image processing: [pngquant](https://pngquant.org/), [mozjpg](https://github.com/mozilla/mozjpeg), [SVGO](https://github.com/svg/svgo) and [Gifsicle](https://github.com/kohler/gifsicle). Built with web technologies in [Electron](https://electronjs.org)

![Screenrecording Imageshrinker](https://user-images.githubusercontent.com/1564251/40296606-61863e56-5cdd-11e8-9f43-3a74c48d21a0.gif)

## How to use
Drag your image file onto the Image Shrinker window and it will saved in the same or in a predefined folder as reduced image.
The original graphic will be not replaced.

## Download and Installation on macOS
Download Image Shrinker here:  
https://github.com/stefansl/image-shrinker/releases/download/v1.6.5/image-shrinker-1.6.5.dmg

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
electron-builder build --mac
```

Generate your Linux package
```shell
electron-builder build --linux
```

Generate your Windows package
```shell
electron-builder build --win
```

Notice: I did not test Windows and Linux. Feel free to commit a pull request.

## Credits
Thank you, guys!
* Electron: <https://electronjs.org>
* pngquant: <https://pngquant.org/>
* mozjpg: <https://github.com/mozilla/mozjpeg>
* SVGO: <https://github.com/svg/svgo>
* Settings framework: <https://github.com/nathanbuchar/electron-settings>
* Poly background: <http://alssndro.github.io/trianglify-background-generator>
* CSS: [Spectre Css](https://picturepan2.github.io/spectre/)
* Font: [Mozillas Fira Sans](https://github.com/mozilla/Fira)
* gifsicle: <https://github.com/kohler/gifsicle>
