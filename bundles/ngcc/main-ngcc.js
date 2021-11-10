#!/usr/bin/env node

      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
      const __ESM_IMPORT_META_URL__ = import.meta.url;
    
import {
  parseCommandLineOptions
} from "../chunk-UMUIU7TE.js";
import {
  mainNgcc
} from "../chunk-CJ4AAD4E.js";
import "../chunk-QDWL7SZJ.js";
import "../chunk-XUPMFYH7.js";
import "../chunk-C2E2VQZA.js";
import "../chunk-7KFXR7FV.js";
import "../chunk-PBA67OV4.js";
import "../chunk-S3QIIFH7.js";
import "../chunk-SKBLJA43.js";
import "../chunk-QL6ZC3U3.js";
import "../chunk-WYO7JO2T.js";
import "../chunk-EP5JHXG2.js";
import "../chunk-GLCRIILX.js";
import "../chunk-XA5IZLLC.js";

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
