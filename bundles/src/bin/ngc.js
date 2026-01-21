#!/usr/bin/env node

      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
    
import {
  main
} from "../../chunk-PIY4QLKO.js";
import "../../chunk-3LTGCVHM.js";
import "../../chunk-H2NNUI6G.js";
import "../../chunk-I73LLMTA.js";
import "../../chunk-FROPOOFC.js";
import {
  setFileSystem
} from "../../chunk-CEBE44Q5.js";
import {
  NodeJSFileSystem
} from "../../chunk-XYYEESKY.js";
import "../../chunk-G7GFT6BU.js";

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
