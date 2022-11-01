#!/usr/bin/env node

      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
      const __ESM_IMPORT_META_URL__ = import.meta.url;
    
import {
  parseCommandLineOptions
} from "../chunk-PKFN6ZKR.js";
import {
  mainNgcc
} from "../chunk-3KIUHCHT.js";
import "../chunk-R3C7RFJ4.js";
import "../chunk-SHFEZGDP.js";
import "../chunk-KGXXQYFO.js";
import "../chunk-RSZNB3FD.js";
import "../chunk-ZXBCBXWY.js";
import "../chunk-E7NQQTT7.js";
import "../chunk-CYVTLM4Z.js";
import "../chunk-JBW3LNWN.js";
import "../chunk-F526PAOI.js";
import "../chunk-WEEZR5JR.js";
import "../chunk-2HPI44CB.js";
import "../chunk-XYNRD7NE.js";

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
