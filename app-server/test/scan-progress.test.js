const assert = require('assert');
const ScanProgress = require('../src/classes/scan-progress');

describe('ScanProgress', () => {
  it('parses progress and pages', () => {
    ScanProgress.start(3);
    assert.deepStrictEqual(
      [ScanProgress.read().active, ScanProgress.read().page, ScanProgress.read().progress],
      [true, 3, null]);

    ScanProgress.update('Progress: 10.0%\rProgress: 42.5%\r');
    assert.strictEqual(ScanProgress.read().progress, 42.5);

    ScanProgress.update('Scanned page 1. (scanner status = 5)\nScanning page 2\n');
    assert.strictEqual(ScanProgress.read().page, 2);
    assert.strictEqual(ScanProgress.read().progress, 0);

    ScanProgress.finish();
    assert.strictEqual(ScanProgress.read().active, false);
  });
});
