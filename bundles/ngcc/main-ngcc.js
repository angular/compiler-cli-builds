#!/usr/bin/env node

      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
      const __ESM_IMPORT_META_URL__ = import.meta.url;
    
import {
  parseCommandLineOptions
} from "../chunk-4NEDYUVN.js";
import {
  mainNgcc
} from "../chunk-6VRDPXJS.js";
import "../chunk-QDWL7SZJ.js";
import "../chunk-3AGYJ2RR.js";
import "../chunk-LCD23VGR.js";
import "../chunk-YAVZZUIL.js";
import "../chunk-PBA67OV4.js";
import "../chunk-S3QIIFH7.js";
import "../chunk-SKBLJA43.js";
import "../chunk-FOIIOIVJ.js";
import "../chunk-HYTAZOQJ.js";
import "../chunk-3IV7S3VF.js";
import "../chunk-GLCRIILX.js";
import "../chunk-5VGHS4A4.js";

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
