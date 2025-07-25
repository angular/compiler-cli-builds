
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
    

// packages/compiler-cli/src/ngtsc/logging/src/logger.js
var LogLevel;
(function(LogLevel2) {
  LogLevel2[LogLevel2["debug"] = 0] = "debug";
  LogLevel2[LogLevel2["info"] = 1] = "info";
  LogLevel2[LogLevel2["warn"] = 2] = "warn";
  LogLevel2[LogLevel2["error"] = 3] = "error";
})(LogLevel || (LogLevel = {}));

// packages/compiler-cli/src/ngtsc/logging/src/console_logger.js
var RESET = "\x1B[0m";
var RED = "\x1B[31m";
var YELLOW = "\x1B[33m";
var BLUE = "\x1B[36m";
var DEBUG = `${BLUE}Debug:${RESET}`;
var WARN = `${YELLOW}Warning:${RESET}`;
var ERROR = `${RED}Error:${RESET}`;
var ConsoleLogger = class {
  level;
  constructor(level) {
    this.level = level;
  }
  debug(...args) {
    if (this.level <= LogLevel.debug)
      console.debug(DEBUG, ...args);
  }
  info(...args) {
    if (this.level <= LogLevel.info)
      console.info(...args);
  }
  warn(...args) {
    if (this.level <= LogLevel.warn)
      console.warn(WARN, ...args);
  }
  error(...args) {
    if (this.level <= LogLevel.error)
      console.error(ERROR, ...args);
  }
};

export {
  LogLevel,
  ConsoleLogger
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
