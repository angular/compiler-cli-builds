#!/usr/bin/env node

      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
    
import {
  main
} from "../../chunk-2QAG64S7.js";
import "../../chunk-WQIXB6OQ.js";
import "../../chunk-Y6BDWN32.js";
import "../../chunk-3VX2PHLU.js";
import "../../chunk-DLVYDS26.js";
import "../../chunk-ZUYMYKXC.js";
import {
  setFileSystem
} from "../../chunk-UTWH365F.js";
import {
  NodeJSFileSystem
} from "../../chunk-KWAGEHJJ.js";
import "../../chunk-IEBNHER4.js";

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
//# sourceMappingURL=ngc.js.map
