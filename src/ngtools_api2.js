"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const perform_compile_1 = require("./perform_compile");
const compiler_host_1 = require("./transformers/compiler_host");
const program_1 = require("./transformers/program");
var EmitFlags;
(function (EmitFlags) {
    EmitFlags[EmitFlags["DTS"] = 1] = "DTS";
    EmitFlags[EmitFlags["JS"] = 2] = "JS";
    EmitFlags[EmitFlags["Metadata"] = 4] = "Metadata";
    EmitFlags[EmitFlags["I18nBundle"] = 8] = "I18nBundle";
    EmitFlags[EmitFlags["Codegen"] = 16] = "Codegen";
    EmitFlags[EmitFlags["Default"] = 19] = "Default";
    EmitFlags[EmitFlags["All"] = 31] = "All";
})(EmitFlags = exports.EmitFlags || (exports.EmitFlags = {}));
// Wrapper for createProgram.
function createProgram({ rootNames, options, host, oldProgram }) {
    return program_1.createProgram({ rootNames, options, host, oldProgram: oldProgram });
}
exports.createProgram = createProgram;
// Wrapper for createCompilerHost.
function createCompilerHost({ options, tsHost = ts.createCompilerHost(options, true) }) {
    return compiler_host_1.createCompilerHost({ options, tsHost });
}
exports.createCompilerHost = createCompilerHost;
function formatDiagnostics(diags) {
    return perform_compile_1.formatDiagnostics(diags);
}
exports.formatDiagnostics = formatDiagnostics;
//# sourceMappingURL=ngtools_api2.js.map