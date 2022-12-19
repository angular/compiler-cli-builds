
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
    
import {
  mainNgcc
} from "../chunk-J2RT6VEF.js";
import "../chunk-B57SP4JB.js";
import {
  clearTsConfigCache
} from "../chunk-XMXUF7ND.js";
import "../chunk-VCBXVSET.js";
import "../chunk-GF4EHNOX.js";
import "../chunk-BYV3J3MV.js";
import {
  ConsoleLogger,
  LogLevel
} from "../chunk-LYJKWJUC.js";
import "../chunk-2NLFVEGY.js";
import "../chunk-GZI5O5VP.js";
import "../chunk-D25A632J.js";
import {
  NodeJSFileSystem,
  setFileSystem
} from "../chunk-TBUSSXUA.js";
import "../chunk-YZWN2KWE.js";
import "../chunk-SRFZMXHZ.js";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/index.mjs
import { dirname, join } from "path";
import { fileURLToPath } from "url";
function process(options) {
  setFileSystem(new NodeJSFileSystem());
  return mainNgcc(options);
}
var containingDirPath = dirname(fileURLToPath(import.meta.url));
var ngccMainFilePath = join(containingDirPath, "./main-ngcc.js");
export {
  ConsoleLogger,
  LogLevel,
  clearTsConfigCache,
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
