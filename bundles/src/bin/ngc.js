#!/usr/bin/env node

      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
    
import {
  main
} from "../../chunk-OS2E3KWA.js";
import "../../chunk-JH6LNJAO.js";
import "../../chunk-ZWYEMS3M.js";
import "../../chunk-LUZ66RBH.js";
import "../../chunk-LMRFLQ2K.js";
import "../../chunk-26NO4MZH.js";
import {
  setFileSystem
} from "../../chunk-TPEB2IXF.js";
import {
  NodeJSFileSystem
} from "../../chunk-3NKMA2JO.js";
import "../../chunk-KPQ72R34.js";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/bin/ngc.mjs
import "reflect-metadata";
async function runNgcComamnd() {
  process.title = "Angular Compiler (ngc)";
  const args = process.argv.slice(2);
  setFileSystem(new NodeJSFileSystem());
  process.exitCode = main(args, void 0, void 0, void 0, void 0, void 0);
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
 * found in the LICENSE file at https://angular.dev/license
 */
//# sourceMappingURL=ngc.js.map
