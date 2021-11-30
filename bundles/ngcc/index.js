
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
      const __ESM_IMPORT_META_URL__ = import.meta.url;
    
import {
  mainNgcc
} from "../chunk-GYHUN7GO.js";
import "../chunk-QDWL7SZJ.js";
import {
  clearTsConfigCache
} from "../chunk-BOMCHKYQ.js";
import "../chunk-OAOOMMIL.js";
import "../chunk-7EXG6TAH.js";
import "../chunk-DNJHKBKU.js";
import "../chunk-4EDYFHXN.js";
import {
  ConsoleLogger,
  LogLevel
} from "../chunk-SKBLJA43.js";
import "../chunk-QL6ZC3U3.js";
import "../chunk-Z4HWF26S.js";
import {
  NodeJSFileSystem,
  setFileSystem
} from "../chunk-EP5JHXG2.js";
import "../chunk-GLCRIILX.js";
import "../chunk-XA5IZLLC.js";

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
