
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
    
import {
  mainNgcc
} from "../chunk-HLWHHA6H.js";
import "../chunk-B57SP4JB.js";
import {
  clearTsConfigCache
} from "../chunk-XJEQRU7K.js";
import "../chunk-COBHG3T2.js";
import "../chunk-Z2L6JES6.js";
import "../chunk-5GWLYYRD.js";
import {
  ConsoleLogger,
  LogLevel
} from "../chunk-LYJKWJUC.js";
import "../chunk-2NLFVEGY.js";
import "../chunk-PTFZECDY.js";
import "../chunk-Y3PK6A7M.js";
import {
  NodeJSFileSystem,
  setFileSystem
} from "../chunk-TBUSSXUA.js";
import "../chunk-3OSIBB62.js";
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
