
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
      const __ESM_IMPORT_META_URL__ = import.meta.url;
    
import {
  mainNgcc
} from "../chunk-CTSDWZWQ.js";
import "../chunk-QDWL7SZJ.js";
import {
  clearTsConfigCache
} from "../chunk-IUG2QCU2.js";
import "../chunk-XRCD4VXD.js";
import "../chunk-NC7BJDOB.js";
import "../chunk-7PY7XEFH.js";
import {
  ConsoleLogger,
  LogLevel
} from "../chunk-SKBLJA43.js";
import "../chunk-K2Z44JHH.js";
import "../chunk-XNYP2SFR.js";
import {
  NodeJSFileSystem,
  setFileSystem
} from "../chunk-FXU7FMZC.js";
import "../chunk-GLCRIILX.js";
import "../chunk-WQ3TNYTD.js";

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
