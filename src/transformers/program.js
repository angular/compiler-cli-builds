"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
var compiler_1 = require("@angular/compiler");
var core_1 = require("@angular/core");
var tsc_wrapped_1 = require("@angular/tsc-wrapped");
var fs = require("fs");
var path = require("path");
var tsickle = require("tsickle");
var ts = require("typescript");
var compiler_host_1 = require("../compiler_host");
var check_types_1 = require("../diagnostics/check_types");
var api_1 = require("./api");
var lower_expressions_1 = require("./lower_expressions");
var node_emitter_transform_1 = require("./node_emitter_transform");
var GENERATED_FILES = /\.ngfactory\.js$|\.ngstyle\.js$|\.ngsummary\.js$/;
var SUMMARY_JSON_FILES = /\.ngsummary.json$/;
var emptyModules = {
    ngModules: [],
    ngModuleByPipeOrDirective: new Map(),
    files: []
};
var AngularCompilerProgram = (function () {
    function AngularCompilerProgram(rootNames, options, host, oldProgram) {
        this.rootNames = rootNames;
        this.options = options;
        this.host = host;
        this.oldProgram = oldProgram;
        this._structuralDiagnostics = [];
        this._optionsDiagnostics = [];
        if (options.flatModuleOutFile && !options.skipMetadataEmit) {
            var _a = tsc_wrapped_1.createBundleIndexHost(options, rootNames, host), bundleHost = _a.host, indexName = _a.indexName, errors = _a.errors;
            if (errors) {
                // TODO(tbosch): once we move MetadataBundler from tsc_wrapped into compiler_cli,
                // directly create ng.Diagnostic instead of using ts.Diagnostic here.
                (_b = this._optionsDiagnostics).push.apply(_b, errors.map(function (e) { return ({ category: e.category, message: e.messageText }); }));
            }
            else {
                rootNames.push(indexName);
                this.host = host = bundleHost;
            }
        }
        var oldTsProgram = oldProgram ? oldProgram.getTsProgram() : undefined;
        this.tsProgram = ts.createProgram(rootNames, options, host, oldTsProgram);
        this.srcNames =
            this.tsProgram.getSourceFiles()
                .map(function (sf) { return sf.fileName; })
                .filter(function (f) { return !f.match(/\.ngfactory\.[\w.]+$|\.ngstyle\.[\w.]+$|\.ngsummary\.[\w.]+$/); });
        this.metadataCache = new lower_expressions_1.LowerMetadataCache({ quotedNames: true }, !!options.strictMetadataEmit);
        this.aotCompilerHost = new compiler_host_1.CompilerHost(this.tsProgram, options, host, /* collectorOptions */ undefined, this.metadataCache);
        if (host.readResource) {
            this.aotCompilerHost.loadResource = host.readResource.bind(host);
        }
        var aotOptions = getAotCompilerOptions(options);
        this.compiler = compiler_1.createAotCompiler(this.aotCompilerHost, aotOptions).compiler;
        var _b;
    }
    // Program implementation
    AngularCompilerProgram.prototype.getTsProgram = function () { return this.programWithStubs; };
    AngularCompilerProgram.prototype.getTsOptionDiagnostics = function (cancellationToken) {
        return this.tsProgram.getOptionsDiagnostics(cancellationToken);
    };
    AngularCompilerProgram.prototype.getNgOptionDiagnostics = function (cancellationToken) {
        return this._optionsDiagnostics.concat(getNgOptionDiagnostics(this.options));
    };
    AngularCompilerProgram.prototype.getTsSyntacticDiagnostics = function (sourceFile, cancellationToken) {
        return this.tsProgram.getSyntacticDiagnostics(sourceFile, cancellationToken);
    };
    AngularCompilerProgram.prototype.getNgStructuralDiagnostics = function (cancellationToken) {
        return this.structuralDiagnostics;
    };
    AngularCompilerProgram.prototype.getTsSemanticDiagnostics = function (sourceFile, cancellationToken) {
        return this.programWithStubs.getSemanticDiagnostics(sourceFile, cancellationToken);
    };
    AngularCompilerProgram.prototype.getNgSemanticDiagnostics = function (fileName, cancellationToken) {
        var compilerDiagnostics = this.generatedFileDiagnostics;
        // If we have diagnostics during the parser phase the type check phase is not meaningful so skip
        // it.
        if (compilerDiagnostics && compilerDiagnostics.length)
            return compilerDiagnostics;
        return this.typeChecker.getDiagnostics(fileName, cancellationToken);
    };
    AngularCompilerProgram.prototype.loadNgStructureAsync = function () {
        var _this = this;
        return this.compiler.analyzeModulesAsync(this.rootNames)
            .catch(this.catchAnalysisError.bind(this))
            .then(function (analyzedModules) {
            if (_this._analyzedModules) {
                throw new Error('Angular structure loaded both synchronously and asynchronsly');
            }
            _this._analyzedModules = analyzedModules;
        });
    };
    AngularCompilerProgram.prototype.getLazyRoutes = function (cancellationToken) { return {}; };
    AngularCompilerProgram.prototype.emit = function (_a) {
        var _this = this;
        var _b = _a.emitFlags, emitFlags = _b === void 0 ? api_1.EmitFlags.Default : _b, cancellationToken = _a.cancellationToken;
        var emitMap = new Map();
        var tsickleCompilerHostOptions = {
            googmodule: false,
            untyped: true,
            convertIndexImportShorthand: true,
            transformDecorators: this.options.annotationsAs !== 'decorators',
            transformTypesToClosure: this.options.annotateForClosureCompiler,
        };
        var tsickleHost = {
            shouldSkipTsickleProcessing: function (fileName) { return /\.d\.ts$/.test(fileName); },
            pathToModuleName: function (context, importPath) { return ''; },
            shouldIgnoreWarningsForPath: function (filePath) { return false; },
            fileNameToModuleId: function (fileName) { return fileName; },
        };
        var expectedOut = this.options.expectedOut ?
            this.options.expectedOut.map(function (f) { return path.resolve(process.cwd(), f); }) :
            undefined;
        var result = tsickle.emitWithTsickle(this.programWithStubs, tsickleHost, tsickleCompilerHostOptions, this.host, this.options, 
        /* targetSourceFile */ undefined, createWriteFileCallback(emitFlags, this.host, this.metadataCache, emitMap, expectedOut), cancellationToken, (emitFlags & (api_1.EmitFlags.DTS | api_1.EmitFlags.JS)) == api_1.EmitFlags.DTS, this.calculateTransforms());
        this.generatedFiles.forEach(function (file) {
            // In order not to replicate the TS calculation of the out folder for files
            // derive the out location for .json files from the out location of the .ts files
            if (file.source && file.source.length && SUMMARY_JSON_FILES.test(file.genFileUrl)) {
                // If we have emitted the ngsummary.ts file, ensure the ngsummary.json file is emitted to
                // the same location.
                var emittedFile = emitMap.get(file.srcFileUrl);
                if (emittedFile) {
                    var fileName = path.join(path.dirname(emittedFile), path.basename(file.genFileUrl));
                    _this.host.writeFile(fileName, file.source, false, function (error) { });
                }
            }
        });
        // Ensure that expected output files exist.
        for (var _i = 0, _c = expectedOut || []; _i < _c.length; _i++) {
            var out = _c[_i];
            fs.appendFileSync(out, '', 'utf8');
        }
        return result;
    };
    Object.defineProperty(AngularCompilerProgram.prototype, "analyzedModules", {
        // Private members
        get: function () {
            return this._analyzedModules || (this._analyzedModules = this.analyzeModules());
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AngularCompilerProgram.prototype, "structuralDiagnostics", {
        get: function () {
            return this.analyzedModules && this._structuralDiagnostics;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AngularCompilerProgram.prototype, "stubs", {
        get: function () {
            return this._stubs || (this._stubs = this.generateStubs());
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AngularCompilerProgram.prototype, "stubFiles", {
        get: function () {
            return this._stubFiles ||
                (this._stubFiles = this.stubs.reduce(function (files, generatedFile) {
                    if (generatedFile.source || (generatedFile.stmts && generatedFile.stmts.length)) {
                        return files.concat([generatedFile.genFileUrl]);
                    }
                    return files;
                }, []));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AngularCompilerProgram.prototype, "programWithStubsHost", {
        get: function () {
            return this._programWithStubsHost || (this._programWithStubsHost = createProgramWithStubsHost(this.stubs, this.tsProgram, this.host));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AngularCompilerProgram.prototype, "programWithStubs", {
        get: function () {
            return this._programWithStubs || (this._programWithStubs = this.createProgramWithStubs());
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AngularCompilerProgram.prototype, "generatedFiles", {
        get: function () {
            return this._generatedFiles || (this._generatedFiles = this.generateFiles());
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AngularCompilerProgram.prototype, "typeChecker", {
        get: function () {
            return (this._typeChecker && !this._typeChecker.partialResults) ?
                this._typeChecker :
                (this._typeChecker = this.createTypeChecker());
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AngularCompilerProgram.prototype, "generatedFileDiagnostics", {
        get: function () {
            return this.generatedFiles && this._generatedFileDiagnostics;
        },
        enumerable: true,
        configurable: true
    });
    AngularCompilerProgram.prototype.calculateTransforms = function () {
        var beforeTs = [];
        if (!this.options.disableExpressionLowering) {
            beforeTs.push(lower_expressions_1.getExpressionLoweringTransformFactory(this.metadataCache));
        }
        if (!this.options.skipTemplateCodegen) {
            beforeTs.push(node_emitter_transform_1.getAngularEmitterTransformFactory(this.generatedFiles));
        }
        return { beforeTs: beforeTs };
    };
    AngularCompilerProgram.prototype.catchAnalysisError = function (e) {
        if (compiler_1.isSyntaxError(e)) {
            var parserErrors = compiler_1.getParseErrors(e);
            if (parserErrors && parserErrors.length) {
                this._structuralDiagnostics =
                    parserErrors.map(function (e) { return ({
                        message: e.contextualMessage(),
                        category: ts.DiagnosticCategory.Error,
                        span: e.span
                    }); });
            }
            else {
                this._structuralDiagnostics = [{ message: e.message, category: ts.DiagnosticCategory.Error }];
            }
            this._analyzedModules = emptyModules;
            return emptyModules;
        }
        throw e;
    };
    AngularCompilerProgram.prototype.analyzeModules = function () {
        try {
            return this.compiler.analyzeModulesSync(this.srcNames);
        }
        catch (e) {
            return this.catchAnalysisError(e);
        }
    };
    AngularCompilerProgram.prototype.generateStubs = function () {
        return this.options.skipTemplateCodegen ? [] :
            this.options.generateCodeForLibraries === false ?
                this.compiler.emitPartialStubs(this.analyzedModules) :
                this.compiler.emitAllStubs(this.analyzedModules);
    };
    AngularCompilerProgram.prototype.generateFiles = function () {
        try {
            // Always generate the files if requested to ensure we capture any diagnostic errors but only
            // keep the results if we are not skipping template code generation.
            var result = this.compiler.emitAllImpls(this.analyzedModules);
            return this.options.skipTemplateCodegen ? [] : result;
        }
        catch (e) {
            if (compiler_1.isSyntaxError(e)) {
                this._generatedFileDiagnostics =
                    [{ message: e.message, category: ts.DiagnosticCategory.Error }];
                return [];
            }
            throw e;
        }
    };
    AngularCompilerProgram.prototype.createTypeChecker = function () {
        return new check_types_1.TypeChecker(this.tsProgram, this.options, this.host, this.aotCompilerHost, this.options, this.analyzedModules, this.generatedFiles);
    };
    AngularCompilerProgram.prototype.createProgramWithStubs = function () {
        // If we are skipping code generation just use the original program.
        // Otherwise, create a new program that includes the stub files.
        return this.options.skipTemplateCodegen ?
            this.tsProgram :
            ts.createProgram(this.rootNames.concat(this.stubFiles), this.options, this.programWithStubsHost);
    };
    return AngularCompilerProgram;
}());
function createProgram(_a) {
    var rootNames = _a.rootNames, options = _a.options, host = _a.host, oldProgram = _a.oldProgram;
    return new AngularCompilerProgram(rootNames, options, host, oldProgram);
}
exports.createProgram = createProgram;
// Compute the AotCompiler options
function getAotCompilerOptions(options) {
    var missingTranslation = core_1.MissingTranslationStrategy.Warning;
    switch (options.i18nInMissingTranslations) {
        case 'ignore':
            missingTranslation = core_1.MissingTranslationStrategy.Ignore;
            break;
        case 'error':
            missingTranslation = core_1.MissingTranslationStrategy.Error;
            break;
    }
    var translations = '';
    if (options.i18nInFile) {
        if (!options.locale) {
            throw new Error("The translation file (" + options.i18nInFile + ") locale must be provided.");
        }
        translations = fs.readFileSync(options.i18nInFile, 'utf8');
    }
    else {
        // No translations are provided, ignore any errors
        // We still go through i18n to remove i18n attributes
        missingTranslation = core_1.MissingTranslationStrategy.Ignore;
    }
    return {
        locale: options.i18nInLocale,
        i18nFormat: options.i18nInFormat || options.i18nOutFormat, translations: translations, missingTranslation: missingTranslation,
        enableLegacyTemplate: options.enableLegacyTemplate,
        enableSummariesForJit: true,
        preserveWhitespaces: options.preserveWhitespaces,
    };
}
function writeMetadata(emitFilePath, sourceFile, metadataCache) {
    if (/\.js$/.test(emitFilePath)) {
        var path_1 = emitFilePath.replace(/\.js$/, '.metadata.json');
        // Beginning with 2.1, TypeScript transforms the source tree before emitting it.
        // We need the original, unmodified, tree which might be several levels back
        // depending on the number of transforms performed. All SourceFile's prior to 2.1
        // will appear to be the original source since they didn't include an original field.
        var collectableFile = sourceFile;
        while (collectableFile.original) {
            collectableFile = collectableFile.original;
        }
        var metadata = metadataCache.getMetadata(collectableFile);
        if (metadata) {
            var metadataText = JSON.stringify([metadata]);
            fs.writeFileSync(path_1, metadataText, { encoding: 'utf-8' });
        }
    }
}
function createWriteFileCallback(emitFlags, host, metadataCache, emitMap, expectedOut) {
    return function (fileName, data, writeByteOrderMark, onError, sourceFiles) {
        var srcFile;
        if (sourceFiles && sourceFiles.length == 1) {
            srcFile = sourceFiles[0];
            emitMap.set(srcFile.fileName, fileName);
        }
        var absFile = path.resolve(process.cwd(), fileName);
        var generatedFile = GENERATED_FILES.test(fileName);
        // Don't emit unexpected files nor empty generated files
        if ((!expectedOut || expectedOut.indexOf(absFile) > -1) && (!generatedFile || data)) {
            host.writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles);
            if (srcFile && !generatedFile && (emitFlags & api_1.EmitFlags.Metadata) != 0) {
                writeMetadata(fileName, srcFile, metadataCache);
            }
        }
    };
}
function getNgOptionDiagnostics(options) {
    if (options.annotationsAs) {
        switch (options.annotationsAs) {
            case 'decorators':
            case 'static fields':
                break;
            default:
                return [{
                        message: 'Angular compiler options "annotationsAs" only supports "static fields" and "decorators"',
                        category: ts.DiagnosticCategory.Error
                    }];
        }
    }
    return [];
}
function createProgramWithStubsHost(generatedFiles, originalProgram, originalHost) {
    return new (function () {
        function class_1() {
            var _this = this;
            this.getDefaultLibFileName = function (options) {
                return originalHost.getDefaultLibFileName(options);
            };
            this.getCurrentDirectory = function () { return originalHost.getCurrentDirectory(); };
            this.getCanonicalFileName = function (fileName) { return originalHost.getCanonicalFileName(fileName); };
            this.useCaseSensitiveFileNames = function () { return originalHost.useCaseSensitiveFileNames(); };
            this.getNewLine = function () { return originalHost.getNewLine(); };
            this.realPath = function (p) { return p; };
            this.fileExists = function (fileName) {
                return _this.generatedFiles.has(fileName) || originalHost.fileExists(fileName);
            };
            this.generatedFiles =
                new Map(generatedFiles.filter(function (g) { return g.source || (g.stmts && g.stmts.length); })
                    .map(function (g) { return [g.genFileUrl, { g: g }]; }));
            this.writeFile = originalHost.writeFile;
            if (originalHost.getDirectories) {
                this.getDirectories = function (path) { return originalHost.getDirectories(path); };
            }
            if (originalHost.directoryExists) {
                this.directoryExists = function (directoryName) { return originalHost.directoryExists(directoryName); };
            }
            if (originalHost.getCancellationToken) {
                this.getCancellationToken = function () { return originalHost.getCancellationToken(); };
            }
            if (originalHost.getDefaultLibLocation) {
                this.getDefaultLibLocation = function () { return originalHost.getDefaultLibLocation(); };
            }
            if (originalHost.trace) {
                this.trace = function (s) { return originalHost.trace(s); };
            }
        }
        class_1.prototype.getSourceFile = function (fileName, languageVersion, onError) {
            var data = this.generatedFiles.get(fileName);
            if (data) {
                return data.s || (data.s = ts.createSourceFile(fileName, data.g.source || compiler_1.toTypeScript(data.g), languageVersion));
            }
            return originalProgram.getSourceFile(fileName) ||
                originalHost.getSourceFile(fileName, languageVersion, onError);
        };
        class_1.prototype.readFile = function (fileName) {
            var data = this.generatedFiles.get(fileName);
            if (data) {
                return data.g.source || compiler_1.toTypeScript(data.g);
            }
            return originalHost.readFile(fileName);
        };
        return class_1;
    }());
}
//# sourceMappingURL=program.js.map