
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
      const __ESM_IMPORT_META_URL__ = import.meta.url;
    
import {
  mainNgcc
} from "../chunk-5CHRTEXL.js";
import "../chunk-QDWL7SZJ.js";
import {
  clearTsConfigCache
} from "../chunk-XHMJ6POQ.js";
import "../chunk-XDGI7TS4.js";
import "../chunk-LMCFGUUV.js";
import "../chunk-7PY7XEFH.js";
import {
  ConsoleLogger,
  LogLevel
} from "../chunk-SKBLJA43.js";
import "../chunk-ADHVDA4A.js";
import "../chunk-QBU7RUKB.js";
import {
  NodeJSFileSystem,
  setFileSystem
} from "../chunk-676MI6WZ.js";
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
