#!/usr/bin/env node

      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
      const __ESM_IMPORT_META_URL__ = import.meta.url;
    
import {
  main
} from "../../chunk-JA6DFT5T.js";
import "../../chunk-V4R3BHFY.js";
import "../../chunk-VF6SIDZK.js";
import "../../chunk-ALSLKTUB.js";
import "../../chunk-TOW3O33K.js";
import "../../chunk-DSVWG4QJ.js";
import {
  NodeJSFileSystem,
  setFileSystem
} from "../../chunk-E7DPJFUS.js";
import "../../chunk-4F26FKLW.js";
import {
  __require,
  __toESM
} from "../../chunk-NDREJTCS.js";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/bin/ngc.mjs
import "reflect-metadata";
async function runNgcComamnd() {
  process.title = "Angular Compiler (ngc)";
  const args = process.argv.slice(2);
  setFileSystem(new NodeJSFileSystem());
  let tsickleModule;
  try {
    tsickleModule = (await Promise.resolve().then(() => __toESM(__require("tsickle"), 1))).default;
  } catch {
  }
  process.exitCode = main(args, void 0, void 0, void 0, void 0, void 0, tsickleModule);
}
runNgcComamnd().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
//# sourceMappingURL=ngc.js.map
