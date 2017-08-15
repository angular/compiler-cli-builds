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
var module_filename_resolver_1 = require("./module_filename_resolver");
exports.createModuleFilenameResolver = module_filename_resolver_1.createModuleFilenameResolver;
var program_1 = require("./program");
exports.createProgram = program_1.createProgram;
function createNgCompilerHost(_a) {
    var options = _a.options, _b = _a.tsHost, tsHost = _b === void 0 ? ts.createCompilerHost(options, true) : _b;
    var resolver = module_filename_resolver_1.createModuleFilenameResolver(tsHost, options);
    var host = Object.create(tsHost);
    host.moduleNameToFileName = resolver.moduleNameToFileName.bind(resolver);
    host.fileNameToModuleName = resolver.fileNameToModuleName.bind(resolver);
    host.getNgCanonicalFileName = resolver.getNgCanonicalFileName.bind(resolver);
    host.assumeFileExists = resolver.assumeFileExists.bind(resolver);
    // Make sure we do not `host.realpath()` from TS as we do not want to resolve symlinks.
    // https://github.com/Microsoft/TypeScript/issues/9552
    host.realpath = function (fileName) { return fileName; };
    return host;
}
exports.createNgCompilerHost = createNgCompilerHost;
//# sourceMappingURL=entry_points.js.map