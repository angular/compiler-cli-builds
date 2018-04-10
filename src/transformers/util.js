"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const compiler_1 = require("@angular/compiler");
const path = require("path");
const ts = require("typescript");
const api_1 = require("./api");
exports.GENERATED_FILES = /(.*?)\.(ngfactory|shim\.ngstyle|ngstyle|ngsummary)\.(js|d\.ts|ts)$/;
exports.DTS = /\.d\.ts$/;
exports.TS = /^(?!.*\.d\.ts$).*\.ts$/;
// Note: This is an internal property in TypeScript. Use it only for assertions and tests.
function tsStructureIsReused(program) {
    return program.structureIsReused;
}
exports.tsStructureIsReused = tsStructureIsReused;
function error(msg) {
    throw new Error(`Internal error: ${msg}`);
}
exports.error = error;
function userError(msg) {
    throw compiler_1.syntaxError(msg);
}
exports.userError = userError;
function createMessageDiagnostic(messageText) {
    return {
        file: undefined,
        start: undefined,
        length: undefined,
        category: ts.DiagnosticCategory.Message, messageText,
        code: api_1.DEFAULT_ERROR_CODE,
        source: api_1.SOURCE,
    };
}
exports.createMessageDiagnostic = createMessageDiagnostic;
function isInRootDir(fileName, options) {
    return !options.rootDir || pathStartsWithPrefix(options.rootDir, fileName);
}
exports.isInRootDir = isInRootDir;
function relativeToRootDirs(filePath, rootDirs) {
    if (!filePath)
        return filePath;
    for (const dir of rootDirs || []) {
        const rel = pathStartsWithPrefix(dir, filePath);
        if (rel) {
            return rel;
        }
    }
    return filePath;
}
exports.relativeToRootDirs = relativeToRootDirs;
function pathStartsWithPrefix(prefix, fullPath) {
    const rel = path.relative(prefix, fullPath);
    return rel.startsWith('..') ? null : rel;
}
/**
 * Converts a ng.Diagnostic into a ts.Diagnostic.
 * This looses some information, and also uses an incomplete object as `file`.
 *
 * I.e. only use this where the API allows only a ts.Diagnostic.
 */
function ngToTsDiagnostic(ng) {
    let file;
    let start;
    let length;
    if (ng.span) {
        // Note: We can't use a real ts.SourceFile,
        // but we can at least mirror the properties `fileName` and `text`, which
        // are mostly used for error reporting.
        file = { fileName: ng.span.start.file.url, text: ng.span.start.file.content };
        start = ng.span.start.offset;
        length = ng.span.end.offset - start;
    }
    return {
        file,
        messageText: ng.messageText,
        category: ng.category,
        code: ng.code, start, length,
    };
}
exports.ngToTsDiagnostic = ngToTsDiagnostic;
//# sourceMappingURL=util.js.map