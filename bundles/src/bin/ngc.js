#!/usr/bin/env node

      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
      const __ESM_IMPORT_META_URL__ = import.meta.url;
    
import {
  main
} from "../../chunk-SYHL33R4.js";
import "../../chunk-2ILVXH35.js";
import "../../chunk-YAVZZUIL.js";
import "../../chunk-PBA67OV4.js";
import "../../chunk-S3QIIFH7.js";
import "../../chunk-HYTAZOQJ.js";
import {
  NodeJSFileSystem,
  setFileSystem
} from "../../chunk-3IV7S3VF.js";
import "../../chunk-GLCRIILX.js";
import {
  __require,
  __toModule
} from "../../chunk-5VGHS4A4.js";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/bin/ngc.mjs
import "reflect-metadata";
async function runNgcComamnd() {
  process.title = "Angular Compiler (ngc)";
  const args = process.argv.slice(2);
  setFileSystem(new NodeJSFileSystem());
  let tsickleModule;
  try {
    tsickleModule = (await Promise.resolve().then(() => __toModule(__require("tsickle")))).default;
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
