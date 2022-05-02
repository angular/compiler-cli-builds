
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
      const __ESM_IMPORT_META_URL__ = import.meta.url;
    
import {
  mainNgcc
} from "../chunk-IALMB6TV.js";
import "../chunk-R3C7RFJ4.js";
import {
  clearTsConfigCache
} from "../chunk-TZYG4U3C.js";
import "../chunk-NY7JAEMN.js";
import "../chunk-QBONCRHV.js";
import "../chunk-2IMT6JFI.js";
import {
  ConsoleLogger,
  LogLevel
} from "../chunk-LX5Q27EF.js";
import "../chunk-WGBFSDVQ.js";
import "../chunk-JDKMNZ6O.js";
import {
  NodeJSFileSystem,
  setFileSystem
} from "../chunk-T7MYRXIE.js";
import "../chunk-R4NY3TJC.js";
import "../chunk-GMSUYBZP.js";

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
