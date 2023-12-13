#!/usr/bin/env node

      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
    
import {
  main
} from "../../chunk-5ZMMJQMZ.js";
import "../../chunk-X6ELQSL4.js";
import "../../chunk-2JUXNWO4.js";
import "../../chunk-72ZMP7J3.js";
import "../../chunk-YGUON63I.js";
import "../../chunk-64JBPJBS.js";
import {
  NodeJSFileSystem,
  setFileSystem
} from "../../chunk-DUY2FPLZ.js";
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
 * found in the LICENSE file at https://angular.io/license
 */
//# sourceMappingURL=ngc.js.map
