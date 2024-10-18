#!/usr/bin/env node

      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
    
import {
  main
} from "../../chunk-RROM4WY6.js";
import "../../chunk-EZOSQJ5D.js";
import "../../chunk-26NKUA5V.js";
import "../../chunk-APDLWLLW.js";
import "../../chunk-PGXXZYOH.js";
import "../../chunk-XSNUHRLJ.js";
import {
  NodeJSFileSystem,
  setFileSystem
} from "../../chunk-YE5ORA4V.js";
import "../../chunk-XI2RTGAL.js";

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
