#!/usr/bin/env node

      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
    
import {
  parseCommandLineOptions
} from "../chunk-K7P4IHT5.js";
import {
  mainNgcc
} from "../chunk-ASJVJIYL.js";
import "../chunk-B57SP4JB.js";
import "../chunk-5FFWH6ZQ.js";
import "../chunk-2CSWPGQ2.js";
import "../chunk-HNCKBB7A.js";
import "../chunk-ZF3IVDQ2.js";
import "../chunk-LYJKWJUC.js";
import "../chunk-2NLFVEGY.js";
import "../chunk-ZOI6L3RR.js";
import "../chunk-TBUSSXUA.js";
import "../chunk-YZWN2KWE.js";
import "../chunk-SRFZMXHZ.js";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/main-ngcc.mjs
process.title = "ngcc";
var startTime = Date.now();
var options = parseCommandLineOptions(process.argv.slice(2));
(async () => {
  try {
    await mainNgcc(options);
    if (options.logger) {
      const duration = Math.round((Date.now() - startTime) / 1e3);
      options.logger.debug(`Run ngcc in ${duration}s.`);
    }
    process.exitCode = 0;
  } catch (e) {
    console.error(e.stack || e.message);
    process.exit(typeof e.code === "number" ? e.code : 1);
  }
})();
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
//# sourceMappingURL=main-ngcc.js.map
