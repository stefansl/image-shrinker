# Image Shrinker

SVGO-GUI is not maintained anymore. So I decided to rebuild it with Electron.
Image Shrinker (prev. SVG Shrinker) is a tool to minify images and graphics using [pngquant](https://pngquant.org/), [jpegtran-bin](https://github.com/imagemin/jpegtran-bin) and [SVGgo](https://github.com/svg/svgo). 

![Screenshot Imageshrinker](https://raw.githubusercontent.com/stefansl/image-shrinker/dev/assets/img/screen.min.png "Screenshot Image Shrinker")

## How to use
Drag your SVG file onto the Image Shrinker window and it will saved in the same folder as reduced SVG.
The original graphic will be not replaced.

## Download and Installation on MacOsX
Download Image Shrinker here:
https://github.com/stefansl/image-shrinker/releases/download/v1.1.0/Image.Shrinker.zip

Unpack and copy or drag the app into your MacOsX application folder.
If you want to uninstall it, just drop the app into the bin.

## Build your own
Get the repo
```shell
git clone https://lab.clickpress.de/stefan.sl/image-shrinker.git
```
Install dependencies
```shell
$ cd image-shrinker
$ npm install
```
Generate your MacOS package
```shell
npm run pack-mac
```

Generate your Linux package
```shell
npm run pack-linux
```
