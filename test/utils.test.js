const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const vm = require('vm');

function loadFunction(file, marker, context) {
  const src = fs.readFileSync(file, 'utf8');
  const start = src.indexOf(marker);
  if (start === -1) throw new Error(`Marker ${marker} not found`);
  if (marker.startsWith('function')) {
    const end = src.indexOf('\n}', start) + 1;
    const snippet = src.slice(start, end + 1);
    return vm.runInNewContext('(' + snippet + ')', context);
  }
  const eq = src.indexOf('=', start) + 1;
  const end = src.indexOf('\n};', eq) + 2;
  const expr = src.slice(eq, end).trim();
  return vm.runInNewContext(expr, context);
}

function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
  } catch (err) {
    console.error('✗', name);
    console.error(err);
    process.exitCode = 1;
  }
}

const cutFolderName = loadFunction(path.join(__dirname, '..', 'renderer.js'), 'function cutFolderName', {});

test('cutFolderName keeps short path', () => {
  assert.strictEqual(cutFolderName('abc'), 'abc');
});

test('cutFolderName trims long path', () => {
  const input = 'a'.repeat(60);
  const expected = '... ' + input.slice(-48);
  assert.strictEqual(cutFolderName(input), expected);
});

function createContext(settingsStub) {
  return { path, fs, makeDir: { sync: () => {} }, settings: settingsStub };
}

const generateNewPath = loadFunction(
  path.join(__dirname, '..', 'main.js'),
  'const generateNewPath',
  createContext({
    get: key => (key === 'suffix' ? true : undefined)
  })
);

test('generateNewPath adds suffix', () => {
  const result = generateNewPath('/tmp/test.png');
  assert.strictEqual(result, path.join('/tmp', 'test.min.png'));
});

const generateNewPathAlt = loadFunction(path.join(__dirname, '..', 'main.js'), 'const generateNewPath', createContext({
  get: key => {
    if (key === 'folderswitch') return false;
    if (key === 'savepath') return ['/tmp/out'];
    if (key === 'suffix') return false;
    return undefined;
  }
}));

test('generateNewPath uses savepath when folderswitch false', () => {
  const result = generateNewPathAlt('/some/dir/img.jpg');
  assert.strictEqual(result, path.join('/tmp/out', 'img.jpg'));
});

const getFileSize = loadFunction(path.join(__dirname, '..', 'main.js'), 'let getFileSize', { fs });

test('getFileSize returns bytes', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'imgtest-'));
  const file = path.join(tmpDir, 'file');
  fs.writeFileSync(file, '12345');
  assert.strictEqual(getFileSize(file, false), 5);
  fs.unlinkSync(file);
  fs.rmdirSync(tmpDir);
});
