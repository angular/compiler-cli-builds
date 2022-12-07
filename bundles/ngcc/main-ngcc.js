#!/usr/bin/env node

      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
      const __ESM_IMPORT_META_URL__ = import.meta.url;
    
import {
  parseCommandLineOptions
} from "../chunk-QVO57CDR.js";
import {
  mainNgcc
} from "../chunk-4DUYFEVT.js";
import "../chunk-DLVFMDSC.js";
import "../chunk-6SQNW4B4.js";
import "../chunk-7BIXVSI3.js";
import "../chunk-QYEU7OV5.js";
import "../chunk-ALSLKTUB.js";
import "../chunk-OFXSI6E3.js";
import "../chunk-OUTDZGN7.js";
import "../chunk-TOW3O33K.js";
import "../chunk-DSVWG4QJ.js";
import "../chunk-E7DPJFUS.js";
import "../chunk-4F26FKLW.js";
import "../chunk-NDREJTCS.js";

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
