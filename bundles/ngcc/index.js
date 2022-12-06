
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
      const __ESM_IMPORT_META_URL__ = import.meta.url;
    
import {
  mainNgcc
} from "../chunk-PPWXQG65.js";
import "../chunk-DLVFMDSC.js";
import {
  clearTsConfigCache
} from "../chunk-PPMCRK4H.js";
import "../chunk-ONRVYLCK.js";
import "../chunk-KY7HVS6H.js";
import "../chunk-OHYTYUA4.js";
import {
  ConsoleLogger,
  LogLevel
} from "../chunk-OFXSI6E3.js";
import "../chunk-TTNJEW7O.js";
import "../chunk-UN4WV3U4.js";
import "../chunk-IZN5U2AM.js";
import {
  NodeJSFileSystem,
  setFileSystem
} from "../chunk-E7DPJFUS.js";
import "../chunk-MAF2KC4N.js";
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
