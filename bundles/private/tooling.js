
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
    
import {
  angularJitApplicationTransform
} from "../chunk-6SNDDF7J.js";
import "../chunk-RO5VAPEI.js";
import "../chunk-I2BHWRAU.js";
import "../chunk-GWZQLAGK.js";
import "../chunk-SZY7NM6F.js";
import "../chunk-DWRM7PIK.js";

// packages/compiler-cli/private/tooling.ts
var GLOBAL_DEFS_FOR_TERSER = {
  ngDevMode: false,
  ngI18nClosureMode: false
};
var GLOBAL_DEFS_FOR_TERSER_WITH_AOT = {
  ...GLOBAL_DEFS_FOR_TERSER,
  ngJitMode: false
};
var constructorParametersDownlevelTransform = (program, isCore = false) => {
  return angularJitApplicationTransform(program, isCore);
};
export {
  GLOBAL_DEFS_FOR_TERSER,
  GLOBAL_DEFS_FOR_TERSER_WITH_AOT,
  constructorParametersDownlevelTransform
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
