
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
      const __ESM_IMPORT_META_URL__ = import.meta.url;
    
import {
  getDownlevelDecoratorsTransform
} from "./chunk-DNJHKBKU.js";
import {
  TypeScriptReflectionHost
} from "./chunk-S3QIIFH7.js";
import {
  __spreadProps,
  __spreadValues
} from "./chunk-XA5IZLLC.js";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/private/tooling.mjs
var GLOBAL_DEFS_FOR_TERSER = {
  ngDevMode: false,
  ngI18nClosureMode: false
};
var GLOBAL_DEFS_FOR_TERSER_WITH_AOT = __spreadProps(__spreadValues({}, GLOBAL_DEFS_FOR_TERSER), {
  ngJitMode: false
});
function constructorParametersDownlevelTransform(program) {
  const typeChecker = program.getTypeChecker();
  const reflectionHost = new TypeScriptReflectionHost(typeChecker);
  return getDownlevelDecoratorsTransform(typeChecker, reflectionHost, [], false, false, true);
}

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
 * found in the LICENSE file at https://angular.io/license
 */
//# sourceMappingURL=chunk-53BDKEKU.js.map
