/**
 * Tracks the progress of the scan currently in flight by parsing the stderr of
 * `scanimage --progress`. There is only ever one scanner process at a time in
 * practice, so a single shared state is sufficient.
 */
module.exports = new class ScanProgress {
  constructor() {
    this.reset();
  }

  reset() {
    /** @type {ScanProgressState} */
    this.state = {
      active: false,
      progress: null,
      page: null,
      startedAt: null
    };
  }

  /**
   * @param {number} [page]
   */
  start(page) {
    this.state = {
      active: true,
      progress: null,
      page: page > 0 ? page : null,
      startedAt: Date.now()
    };
  }

  /**
   * @param {string} chunk - raw stderr output
   */
  update(chunk) {
    const pages = [...chunk.matchAll(/Scanning page (\d+)/g)];
    if (pages.length > 0) {
      this.state.page = Number.parseInt(pages[pages.length - 1][1]);
      this.state.progress = 0;
    }

    const progresses = [...chunk.matchAll(/Progress:\s*([\d.]+)%/g)];
    if (progresses.length > 0) {
      const value = Number.parseFloat(progresses[progresses.length - 1][1]);
      if (!Number.isNaN(value)) {
        this.state.progress = Math.min(100, Math.max(0, value));
      }
    }
  }

  finish() {
    this.reset();
  }

  /**
   * @returns {ScanProgressState}
   */
  read() {
    return Object.assign({}, this.state);
  }
};
