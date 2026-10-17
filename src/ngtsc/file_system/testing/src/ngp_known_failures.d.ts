/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
/**
 * Known NGP (`packages/ngp`) compiler gaps when running the shared `ngtsc`, `typecheck`,
 * `extended/test/checks`, and `compliance` test suites.
 *
 * By default in `NG_COMPILER_BACKEND=ngp` mode, specs listed here are marked pending (`xit`)
 * so that CI targets (`ngtsc_ngp`, `test_ngp`, `full_ngp`, `local_ngp`) remain green and prevent
 * regressions on already-supported behavior.
 *
 * Set `NGP_RUN_KNOWN_FAILURES=1` in the environment to execute all known-failing specs without
 * skipping.
 *
 * Tracked compiler gap categories & GitHub issues (https://github.com/alxhub/ng-hybrid-preprocessor):
 * - Extended Template Diagnostics (NG8101-NG8117): #673, #675, #676, #677
 * - Template Type-Checking (TCB) & Host Binding Type-Checking: #678-#683, #694-#696
 * - Angular Diagnostic Error Codes (NG1xxx-NG11xxx): #684-#692
 * - Decorator Metadata Type-Checking: #693
 * - Compiler Pipeline Features (HMR, local compilation, declaration-only emission,
 *   setClassDebugInfo, incremental compilation, Xi18n, ComponentIndex, TemplateTypeChecker API)
 */
export declare function isNgpSkipEnabled(): boolean;
export declare function shouldSkipInNgp(fullSpecName: string): boolean;
export declare function shouldSkipComplianceInNgp(mode: string, relativePath: string, description: string): boolean;
