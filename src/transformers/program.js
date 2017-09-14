"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var compiler_1 = require("@angular/compiler");
var fs = require("fs");
var path = require("path");
var ts = require("typescript");
var compiler_host_1 = require("../compiler_host");
var check_types_1 = require("../diagnostics/check_types");
var index_1 = require("../metadata/index");
var api_1 = require("./api");
var lower_expressions_1 = require("./lower_expressions");
var node_emitter_transform_1 = require("./node_emitter_transform");
var GENERATED_FILES = /(.*?)\.(ngfactory|shim\.ngstyle|ngstyle|ngsummary)\.(js|d\.ts|ts)$/;
var emptyModules = {
    ngModules: [],
    ngModuleByPipeOrDirective: new Map(),
    files: []
};
var defaultEmitCallback = function (_a) {
    var program = _a.program, targetSourceFile = _a.targetSourceFile, writeFile = _a.writeFile, cancellationToken = _a.cancellationToken, emitOnlyDtsFiles = _a.emitOnlyDtsFiles, customTransformers = _a.customTransformers;
    return program.emit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers);
};
var AngularCompilerProgram = (function () {
    function AngularCompilerProgram(rootNames, options, host, oldProgram) {
        this.rootNames = rootNames;
        this.options = options;
        this.host = host;
        this._structuralDiagnostics = [];
        this._optionsDiagnostics = [];
        if (options.flatModuleOutFile) {
            var _a = index_1.createBundleIndexHost(options, rootNames, host), bundleHost = _a.host, indexName = _a.indexName, errors = _a.errors;
            if (errors) {
                // TODO(tbosch): once we move MetadataBundler from tsc_wrapped into compiler_cli,
                // directly create ng.Diagnostic instead of using ts.Diagnostic here.
                (_b = this._optionsDiagnostics).push.apply(_b, errors.map(function (e) { return ({
                    category: e.category,
                    messageText: e.messageText,
                    source: api_1.SOURCE,
                    code: api_1.DEFAULT_ERROR_CODE
                }); }));
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
        this.aotCompilerHost =
            new AotCompilerHostImpl(this.tsProgram, options, host, this.metadataCache);
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
    AngularCompilerProgram.prototype.emit = function (_a) {
        var _b = _a.emitFlags, emitFlags = _b === void 0 ? api_1.EmitFlags.Default : _b, cancellationToken = _a.cancellationToken, customTransformers = _a.customTransformers, _c = _a.emitCallback, emitCallback = _c === void 0 ? defaultEmitCallback : _c;
        if (emitFlags & api_1.EmitFlags.I18nBundle) {
            var locale = this.options.i18nOutLocale || null;
            var file = this.options.i18nOutFile || null;
            var format = this.options.i18nOutFormat || null;
            var bundle = this.compiler.emitMessageBundle(this.analyzedModules, locale);
            i18nExtract(format, file, this.host, this.options, bundle);
        }
        if (emitFlags & (api_1.EmitFlags.JS | api_1.EmitFlags.DTS | api_1.EmitFlags.Metadata | api_1.EmitFlags.Summary)) {
            return emitCallback({
                program: this.programWithStubs,
                host: this.host,
                options: this.options,
                targetSourceFile: undefined,
                writeFile: createWriteFileCallback(emitFlags, this.host, this.metadataCache, this.generatedFiles),
                cancellationToken: cancellationToken,
                emitOnlyDtsFiles: (emitFlags & (api_1.EmitFlags.DTS | api_1.EmitFlags.JS)) == api_1.EmitFlags.DTS,
                customTransformers: this.calculateTransforms(customTransformers)
            });
        }
        return { emitSkipped: true, diagnostics: [], emittedFiles: [] };
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
    AngularCompilerProgram.prototype.calculateTransforms = function (customTransformers) {
        var beforeTs = [];
        if (!this.options.disableExpressionLowering) {
            beforeTs.push(lower_expressions_1.getExpressionLoweringTransformFactory(this.metadataCache));
        }
        if (!this.options.skipTemplateCodegen) {
            beforeTs.push(node_emitter_transform_1.getAngularEmitterTransformFactory(this.generatedFiles));
        }
        if (customTransformers && customTransformers.beforeTs) {
            beforeTs.push.apply(beforeTs, customTransformers.beforeTs);
        }
        var afterTs = customTransformers ? customTransformers.afterTs : undefined;
        return { before: beforeTs, after: afterTs };
    };
    AngularCompilerProgram.prototype.catchAnalysisError = function (e) {
        if (compiler_1.isSyntaxError(e)) {
            var parserErrors = compiler_1.getParseErrors(e);
            if (parserErrors && parserErrors.length) {
                this._structuralDiagnostics =
                    parserErrors.map(function (e) { return ({
                        messageText: e.contextualMessage(),
                        category: ts.DiagnosticCategory.Error,
                        span: e.span,
                        source: api_1.SOURCE,
                        code: api_1.DEFAULT_ERROR_CODE
                    }); });
            }
            else {
                this._structuralDiagnostics = [{
                        messageText: e.message,
                        category: ts.DiagnosticCategory.Error,
                        source: api_1.SOURCE,
                        code: api_1.DEFAULT_ERROR_CODE
                    }];
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
        return this.options.skipTemplateCodegen ? [] : this.compiler.emitAllStubs(this.analyzedModules);
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
                this._generatedFileDiagnostics = [{
                        messageText: e.message,
                        category: ts.DiagnosticCategory.Error,
                        source: api_1.SOURCE,
                        code: api_1.DEFAULT_ERROR_CODE
                    }];
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
var AotCompilerHostImpl = (function (_super) {
    __extends(AotCompilerHostImpl, _super);
    function AotCompilerHostImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    AotCompilerHostImpl.prototype.moduleNameToFileName = function (m, containingFile) {
        return this.context.moduleNameToFileName(m, containingFile);
    };
    AotCompilerHostImpl.prototype.fileNameToModuleName = function (importedFile, containingFile) {
        return this.context.fileNameToModuleName(importedFile, containingFile);
    };
    AotCompilerHostImpl.prototype.resourceNameToFileName = function (resourceName, containingFile) {
        return this.context.resourceNameToFileName(resourceName, containingFile);
    };
    AotCompilerHostImpl.prototype.toSummaryFileName = function (fileName, referringSrcFileName) {
        return this.context.toSummaryFileName(fileName, referringSrcFileName);
    };
    AotCompilerHostImpl.prototype.fromSummaryFileName = function (fileName, referringLibFileName) {
        return this.context.fromSummaryFileName(fileName, referringLibFileName);
    };
    return AotCompilerHostImpl;
}(compiler_host_1.BaseAotCompilerHost));
function createProgram(_a) {
    var rootNames = _a.rootNames, options = _a.options, host = _a.host, oldProgram = _a.oldProgram;
    return new AngularCompilerProgram(rootNames, options, host, oldProgram);
}
exports.createProgram = createProgram;
// Compute the AotCompiler options
function getAotCompilerOptions(options) {
    var missingTranslation = compiler_1.core.MissingTranslationStrategy.Warning;
    switch (options.i18nInMissingTranslations) {
        case 'ignore':
            missingTranslation = compiler_1.core.MissingTranslationStrategy.Ignore;
            break;
        case 'error':
            missingTranslation = compiler_1.core.MissingTranslationStrategy.Error;
            break;
    }
    var translations = '';
    if (options.i18nInFile) {
        if (!options.i18nInLocale) {
            throw new Error("The translation file (" + options.i18nInFile + ") locale must be provided.");
        }
        translations = fs.readFileSync(options.i18nInFile, 'utf8');
    }
    else {
        // No translations are provided, ignore any errors
        // We still go through i18n to remove i18n attributes
        missingTranslation = compiler_1.core.MissingTranslationStrategy.Ignore;
    }
    return {
        locale: options.i18nInLocale,
        i18nFormat: options.i18nInFormat || options.i18nOutFormat, translations: translations, missingTranslation: missingTranslation,
        enableLegacyTemplate: options.enableLegacyTemplate,
        enableSummariesForJit: true,
        preserveWhitespaces: options.preserveWhitespaces,
    };
}
function writeMetadata(host, emitFilePath, sourceFile, metadataCache, onError) {
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
            host.writeFile(path_1, metadataText, false, onError, [sourceFile]);
        }
    }
}
function writeNgSummaryJson(host, emitFilePath, sourceFile, generatedFilesByName, onError) {
    // Note: some files have an empty .ngfactory.js/.d.ts file but still need
    // .ngsummary.json files (e.g. directives / pipes).
    // We write the ngSummary when we try to emit the .ngfactory.js files
    // and not the regular .js files as the latter are not emitted when
    // we generate code for a npm library which ships .js / .d.ts / .metadata.json files.
    if (/\.ngfactory.js$/.test(emitFilePath)) {
        var emitPath = emitFilePath.replace(/\.ngfactory\.js$/, '.ngsummary.json');
        var genFilePath = sourceFile.fileName.replace(/\.ngfactory\.ts$/, '.ngsummary.json');
        var genFile = generatedFilesByName.get(genFilePath);
        if (genFile) {
            host.writeFile(emitPath, genFile.source, false, onError, [sourceFile]);
        }
    }
}
function createWriteFileCallback(emitFlags, host, metadataCache, generatedFiles) {
    var generatedFilesByName = new Map();
    generatedFiles.forEach(function (f) { return generatedFilesByName.set(f.genFileUrl, f); });
    return function (fileName, data, writeByteOrderMark, onError, sourceFiles) {
        var sourceFile = sourceFiles && sourceFiles.length == 1 ? sourceFiles[0] : null;
        if (sourceFile) {
            var isGenerated = GENERATED_FILES.test(fileName);
            if (isGenerated) {
                writeNgSummaryJson(host, fileName, sourceFile, generatedFilesByName, onError);
            }
            if (!isGenerated && (emitFlags & api_1.EmitFlags.Metadata)) {
                writeMetadata(host, fileName, sourceFile, metadataCache, onError);
            }
            if (isGenerated) {
                var genFile = generatedFilesByName.get(sourceFile.fileName);
                if (!genFile || !genFile.stmts || !genFile.stmts.length) {
                    // Don't emit empty generated files
                    return;
                }
            }
        }
        host.writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles);
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
                        messageText: 'Angular compiler options "annotationsAs" only supports "static fields" and "decorators"',
                        category: ts.DiagnosticCategory.Error,
                        source: api_1.SOURCE,
                        code: api_1.DEFAULT_ERROR_CODE
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
function i18nExtract(formatName, outFile, host, options, bundle) {
    formatName = formatName || 'null';
    // Checks the format and returns the extension
    var ext = i18nGetExtension(formatName);
    var content = i18nSerialize(bundle, formatName, options);
    var dstFile = outFile || "messages." + ext;
    var dstPath = path.resolve(options.outDir || options.basePath, dstFile);
    host.writeFile(dstPath, content, false);
    return [dstPath];
}
exports.i18nExtract = i18nExtract;
function i18nSerialize(bundle, formatName, options) {
    var format = formatName.toLowerCase();
    var serializer;
    switch (format) {
        case 'xmb':
            serializer = new compiler_1.Xmb();
            break;
        case 'xliff2':
        case 'xlf2':
            serializer = new compiler_1.Xliff2();
            break;
        case 'xlf':
        case 'xliff':
        default:
            serializer = new compiler_1.Xliff();
    }
    return bundle.write(serializer, function (sourcePath) {
        return options.basePath ? path.relative(options.basePath, sourcePath) : sourcePath;
    });
}
exports.i18nSerialize = i18nSerialize;
function i18nGetExtension(formatName) {
    var format = (formatName || 'xlf').toLowerCase();
    switch (format) {
        case 'xmb':
            return 'xmb';
        case 'xlf':
        case 'xlif':
        case 'xliff':
        case 'xlf2':
        case 'xliff2':
            return 'xlf';
    }
    throw new Error("Unsupported format \"" + formatName + "\"");
}
exports.i18nGetExtension = i18nGetExtension;
//# sourceMappingURL=program.js.map