# SVG Shrinker

SVGO-GUI is not maintained anymore. So I decided to rebuild it with Electron.
SVG Shrinker is a tool to cleanup SVG graphics. 

## How to use
Drag you SVG onto the SVG Shrinker window and it will saved in the same folder as reduced SVG.
The original graphic will be not replaced.

## Installation
Get the repo
```shell
git clone https://lab.clickpress.de/stefan.sl/svg-shrinker.git
```
Install dependencies
```shell
$ cd svg-shrinker
$ npm install
```
Generate your MacOS package
```shell
npm run pack-mac
```

Or just download it here:
https://github.com/stefansl/svg-shrinker/releases/download/1.0.0/SVG.Shrinker.zip

Generate your Linux package
```shell
npm run pack-linux
```