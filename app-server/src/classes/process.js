const util = require('util');
const exec = util.promisify(require('child_process').exec);
const execSync = require('child_process').execSync;
const spawn = require('child_process').spawn;

module.exports = new class Process {

  /**
   * @returns {log.Logger}
   */
  log() {
    if (!this._log) {
      this._log = require('loglevel').getLogger('Process');
    }
    return this._log;
  }

  /**
   * @param {string} cmd
   * @returns {string}
   */
  executeSync(cmd, options) {
    const stdout = execSync(cmd, options);
    return Buffer.from(stdout).toString().trim();
  }

  /**
   * @param {string} cmd
   * @param {import('child_process').ExecOptions} [options]
   * @returns {Promise.<string>}
   */
  async execute(cmd, options) {
    this.log().info({execute: cmd});
    const { stdout } = await exec(cmd, options);
    return stdout;
  }

  /**
   * @param {string} cmd
   * @param {Buffer|null} [stdin]
   * @param {ProcessOptions} [options]
   * @return {Promise<Buffer>}
   */
  async spawn(cmd, stdin, options) {
    const MAX_BUFFER = 16 * 1024;
    options = Object.assign({
      encoding: 'binary',
      shell: true,
      maxBuffer: MAX_BUFFER,
      ignoreErrors: false
    }, options);

    if (this.log().getLevel() > this.log().levels.DEBUG) {
      this.log().info({spawn: cmd});
    } else {
      this.log().debug({
        spawn: {
          cmd,
          stdin,
          options
        }
      });
    }

    return await new Promise((resolve, reject) => {
      let stdout = Buffer.alloc(0);
      let stderr = '';
      let timedOut = false;
      let timer = null;
      let killTimer = null;

      // With a timeout we run in our own process group so that killing it also
      // kills children of the shell (e.g. `sh -c 'scanimage ... > file'`)
      const spawnOptions = Object.assign({}, options);
      delete spawnOptions.inactivityTimeout;
      delete spawnOptions.onStderr;
      delete spawnOptions.ignoreErrors;
      if (options.inactivityTimeout > 0) {
        spawnOptions.detached = true;
      }

      const proc = spawn(cmd, [], spawnOptions);

      const kill = (signal) => {
        try {
          process.kill(spawnOptions.detached ? -proc.pid : proc.pid, signal);
        } catch (e) {
          this.log().debug(`kill(${signal}) failed: ${e.message}`);
        }
      };

      const resetTimer = () => {
        if (!(options.inactivityTimeout > 0) || timedOut) {
          return;
        }
        clearTimeout(timer);
        timer = setTimeout(() => {
          timedOut = true;
          this.log().warn(`No output for ${options.inactivityTimeout}ms, killing: ${cmd}`);
          kill('SIGTERM');
          // scanimage may hang trying to cancel a dead device
          killTimer = setTimeout(() => kill('SIGKILL'), 5000);
        }, options.inactivityTimeout);
      };
      resetTimer();

      proc.stdout.on('data', (data) => {
        stdout = Buffer.concat([stdout, data]);
        resetTimer();
      });

      proc.stderr.on('data', (data) => {
        stderr += data;
        resetTimer();
        if (options.onStderr) {
          options.onStderr(data.toString());
        }
      });

      if (!options.ignoreErrors) {
        proc.on('error', (exception) => {
          clearTimeout(timer);
          reject(new Error(`${cmd} error: ${exception.message}, stderr: ${stderr}`));
        });
      }

      proc.on('close', (code) => {
        clearTimeout(timer);
        clearTimeout(killTimer);
        this.log().trace(`close(${code}): ${cmd}`);
        if (timedOut) {
          const error = new Error(`Timed out: no response for ${Math.round(options.inactivityTimeout / 1000)}s`);
          error.code = 'ETIMEDOUT';
          reject(error);
        } else if (code !== 0 && !options.ignoreErrors) {
          // Progress output is noise in an error message
          const message = stderr.split(/[\r\n]+/)
            .filter(line => line.length > 0 && !/^Progress:/.test(line))
            .join('\n');
          reject(new Error(`${cmd} exited with code: ${code}, stderr: ${message}`));
        } else {
          resolve(stdout);
        }
      });

      if (stdin && proc.stdin) {
        proc.stdin.on('error', (err) => {
          this.log().debug(`stdin error: ${err.message}`);
        });
        proc.stdin.write(stdin);
        proc.stdin.end();
      }
    });
  }

  /**
   * @param {string[]} cmds
   * @param {Buffer|null} [stdin]
   * @param {ProcessOptions} [options]
   * @return {Promise<Buffer>}
   */
  async chain(cmds, stdin, options) {
    let stdout = null;
    for (let cmd of cmds) {
      stdout = await this.spawn(cmd, stdin, options);
      stdin = stdout;
    }
    return stdout;
  }
};
