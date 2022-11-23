
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
      const __ESM_IMPORT_META_URL__ = import.meta.url;
    
import {
  mainNgcc
} from "../chunk-LZ6AHL2G.js";
import "../chunk-DLVFMDSC.js";
import {
  clearTsConfigCache
} from "../chunk-SZALNEID.js";
import "../chunk-AJ45MVZF.js";
import "../chunk-EUEL67MF.js";
import "../chunk-ALSLKTUB.js";
import {
  ConsoleLogger,
  LogLevel
} from "../chunk-OFXSI6E3.js";
import "../chunk-TTNJEW7O.js";
import "../chunk-TOW3O33K.js";
import "../chunk-DSVWG4QJ.js";
import {
  NodeJSFileSystem,
  setFileSystem
} from "../chunk-E7DPJFUS.js";
import "../chunk-4F26FKLW.js";
import "../chunk-NDREJTCS.js";

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
