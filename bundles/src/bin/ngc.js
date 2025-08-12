#!/usr/bin/env node

      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
    
import {
  main
} from "../../chunk-4HW7YIBG.js";
import "../../chunk-6CT454W6.js";
import "../../chunk-OMOHQ5WA.js";
import "../../chunk-DV5EQ6QS.js";
import "../../chunk-I2BHWRAU.js";
import {
  setFileSystem
} from "../../chunk-GWZQLAGK.js";
import {
  NodeJSFileSystem
} from "../../chunk-SZY7NM6F.js";
import "../../chunk-DWRM7PIK.js";

// packages/compiler-cli/src/bin/ngc.ts
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
