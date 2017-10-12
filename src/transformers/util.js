"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var api_1 = require("./api");
exports.GENERATED_FILES = /(.*?)\.(ngfactory|shim\.ngstyle|ngstyle|ngsummary)\.(js|d\.ts|ts)$/;
exports.EXT = /(\.ts|\.d\.ts|\.js|\.jsx|\.tsx)$/;
// Note: This is an internal property in TypeScript. Use it only for assertions and tests.
function tsStructureIsReused(program) {
    return program.structureIsReused;
}
exports.tsStructureIsReused = tsStructureIsReused;
function createMessageDiagnostic(messageText) {
    return {
        file: undefined,
        start: undefined,
        length: undefined,
        category: ts.DiagnosticCategory.Message, messageText: messageText,
        code: api_1.DEFAULT_ERROR_CODE,
        source: api_1.SOURCE,
    };
}
exports.createMessageDiagnostic = createMessageDiagnostic;
function isGeneratedFile(fileName) {
    return exports.GENERATED_FILES.test(fileName);
}
exports.isGeneratedFile = isGeneratedFile;
//# sourceMappingURL=util.js.map