#!/usr/bin/env node

      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
      const __ESM_IMPORT_META_URL__ = import.meta.url;
    
import {
  parseCommandLineOptions
} from "../chunk-QVO57CDR.js";
import {
  mainNgcc
} from "../chunk-PPWXQG65.js";
import "../chunk-DLVFMDSC.js";
import "../chunk-PPMCRK4H.js";
import "../chunk-ONRVYLCK.js";
import "../chunk-KY7HVS6H.js";
import "../chunk-OHYTYUA4.js";
import "../chunk-OFXSI6E3.js";
import "../chunk-TTNJEW7O.js";
import "../chunk-UN4WV3U4.js";
import "../chunk-IZN5U2AM.js";
import "../chunk-E7DPJFUS.js";
import "../chunk-MAF2KC4N.js";
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
