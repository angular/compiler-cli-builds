
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
      const __ESM_IMPORT_META_URL__ = import.meta.url;
    
import {
  mainNgcc
} from "../chunk-IXTHC2NT.js";
import "../chunk-QDWL7SZJ.js";
import {
  clearTsConfigCache
} from "../chunk-KYAHF24O.js";
import "../chunk-NU5UC7J7.js";
import "../chunk-YAVZZUIL.js";
import "../chunk-PBA67OV4.js";
import "../chunk-S3QIIFH7.js";
import {
  ConsoleLogger,
  LogLevel
} from "../chunk-SKBLJA43.js";
import "../chunk-FOIIOIVJ.js";
import "../chunk-HYTAZOQJ.js";
import {
  NodeJSFileSystem,
  setFileSystem
} from "../chunk-3IV7S3VF.js";
import "../chunk-GLCRIILX.js";
import "../chunk-5VGHS4A4.js";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/index.mjs
import { dirname, join } from "path";
import { fileURLToPath } from "url";
function process(options) {
  setFileSystem(new NodeJSFileSystem());
  return mainNgcc(options);
}
var containingDirPath = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(__ESM_IMPORT_META_URL__));
var ngccMainFilePath = join(containingDirPath, "./main-ngcc.js");
export {
  ConsoleLogger,
  LogLevel,
  clearTsConfigCache,
  containingDirPath,
  ngccMainFilePath,
  process
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
//# sourceMappingURL=index.js.map
