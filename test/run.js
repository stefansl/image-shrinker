require('./utils.test');
if (process.exitCode) {
  console.error('Tests failed');
  process.exit(process.exitCode);
} else {
  console.log('All tests passed');
}
