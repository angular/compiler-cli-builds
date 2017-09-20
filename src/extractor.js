"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Extract i18n messages from source code
 */
// Must be imported first, because Angular decorators throw on load.
require("reflect-metadata");
var compiler = require("@angular/compiler");
var compiler_host_1 = require("./compiler_host");
var path_mapped_compiler_host_1 = require("./path_mapped_compiler_host");
var program_1 = require("./transformers/program");
var Extractor = (function () {
    function Extractor(options, ngExtractor, host, ngCompilerHost, program) {
        this.options = options;
        this.ngExtractor = ngExtractor;
        this.host = host;
        this.ngCompilerHost = ngCompilerHost;
        this.program = program;
    }
    Extractor.prototype.extract = function (formatName, outFile) {
        var _this = this;
        return this.extractBundle().then(function (bundle) { return program_1.i18nExtract(formatName, outFile, _this.host, _this.options, bundle); });
    };
    Extractor.prototype.extractBundle = function () {
        var _this = this;
        var files = this.program.getSourceFiles().map(function (sf) { return _this.ngCompilerHost.getCanonicalFileName(sf.fileName); });
        return this.ngExtractor.extract(files);
    };
    Extractor.prototype.serialize = function (bundle, formatName) {
        return program_1.i18nSerialize(bundle, formatName, this.options);
    };
    Extractor.prototype.getExtension = function (formatName) { return program_1.i18nGetExtension(formatName); };
    Extractor.create = function (options, program, tsCompilerHost, locale, compilerHostContext, ngCompilerHost) {
        if (!ngCompilerHost) {
            var usePathMapping = !!options.rootDirs && options.rootDirs.length > 0;
            var context = compilerHostContext || new compiler_host_1.ModuleResolutionHostAdapter(tsCompilerHost);
            ngCompilerHost = usePathMapping ? new path_mapped_compiler_host_1.PathMappedCompilerHost(program, options, context) :
                new compiler_host_1.CompilerHost(program, options, context);
        }
        var ngExtractor = compiler.Extractor.create(ngCompilerHost, locale || null).extractor;
        return new Extractor(options, ngExtractor, tsCompilerHost, ngCompilerHost, program);
    };
    return Extractor;
}());
exports.Extractor = Extractor;
//# sourceMappingURL=extractor.js.map