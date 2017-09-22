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
var fs = require("fs");
var path = require("path");
var ts = require("typescript");
var translate_diagnostics_1 = require("../diagnostics/translate_diagnostics");
var index_1 = require("../metadata/index");
var api_1 = require("./api");
var compiler_host_1 = require("./compiler_host");
var lower_expressions_1 = require("./lower_expressions");
var node_emitter_transform_1 = require("./node_emitter_transform");
var util_1 = require("./util");
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
        var _this = this;
        this.rootNames = rootNames;
        this.options = options;
        this.host = host;
        this.oldProgram = oldProgram;
        this.summariesFromPreviousCompilations = new Map();
        this._optionsDiagnostics = [];
        var _a = ts.version.split('.'), major = _a[0], minor = _a[1];
        if (Number(major) < 2 || (Number(major) === 2 && Number(minor) < 4)) {
            throw new Error('The Angular Compiler requires TypeScript >= 2.4.');
        }
        this.oldTsProgram = oldProgram ? oldProgram.getTsProgram() : undefined;
        if (oldProgram) {
            oldProgram.getLibrarySummaries().forEach(function (_a) {
                var content = _a.content, fileName = _a.fileName;
                return _this.summariesFromPreviousCompilations.set(fileName, content);
            });
        }
        if (options.flatModuleOutFile) {
            var _b = index_1.createBundleIndexHost(options, rootNames, host), bundleHost = _b.host, indexName = _b.indexName, errors = _b.errors;
            if (errors) {
                // TODO(tbosch): once we move MetadataBundler from tsc_wrapped into compiler_cli,
                // directly create ng.Diagnostic instead of using ts.Diagnostic here.
                (_c = this._optionsDiagnostics).push.apply(_c, errors.map(function (e) { return ({
                    category: e.category,
                    messageText: e.messageText,
                    source: api_1.SOURCE,
                    code: api_1.DEFAULT_ERROR_CODE
                }); }));
            }
            else {
                rootNames.push(indexName);
                this.host = bundleHost;
            }
        }
        this.metadataCache = new lower_expressions_1.LowerMetadataCache({ quotedNames: true }, !!options.strictMetadataEmit);
        var _c;
    }
    AngularCompilerProgram.prototype.getLibrarySummaries = function () {
        var emittedLibSummaries = [];
        this.summariesFromPreviousCompilations.forEach(function (content, fileName) { return emittedLibSummaries.push({ fileName: fileName, content: content }); });
        if (this._emittedGenFiles) {
            this._emittedGenFiles.forEach(function (genFile) {
                if (genFile.srcFileUrl.endsWith('.d.ts') &&
                    genFile.genFileUrl.endsWith('.ngsummary.json')) {
                    // Note: ! is ok here as ngsummary.json files are always plain text, so genFile.source
                    // is filled.
                    emittedLibSummaries.push({ fileName: genFile.genFileUrl, content: genFile.source });
                }
            });
        }
        return emittedLibSummaries;
    };
    AngularCompilerProgram.prototype.getTsProgram = function () { return this.tsProgram; };
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
        return this.semanticDiagnostics.ts;
    };
    AngularCompilerProgram.prototype.getNgSemanticDiagnostics = function (fileName, cancellationToken) {
        return this.semanticDiagnostics.ng;
    };
    AngularCompilerProgram.prototype.loadNgStructureAsync = function () {
        var _this = this;
        if (this._analyzedModules) {
            throw new Error('Angular structure already loaded');
        }
        var _a = this._createProgramWithBasicStubs(), tmpProgram = _a.tmpProgram, analyzedFiles = _a.analyzedFiles, hostAdapter = _a.hostAdapter, rootNames = _a.rootNames;
        return this._compiler.loadFilesAsync(analyzedFiles)
            .catch(this.catchAnalysisError.bind(this))
            .then(function (analyzedModules) {
            if (_this._analyzedModules) {
                throw new Error('Angular structure loaded both synchronously and asynchronsly');
            }
            _this._updateProgramWithTypeCheckStubs(tmpProgram, analyzedModules, hostAdapter, rootNames);
        });
    };
    AngularCompilerProgram.prototype.emit = function (_a) {
        var _this = this;
        var _b = _a === void 0 ? {} : _a, _c = _b.emitFlags, emitFlags = _c === void 0 ? api_1.EmitFlags.Default : _c, cancellationToken = _b.cancellationToken, customTransformers = _b.customTransformers, _d = _b.emitCallback, emitCallback = _d === void 0 ? defaultEmitCallback : _d;
        if (emitFlags & api_1.EmitFlags.I18nBundle) {
            var locale = this.options.i18nOutLocale || null;
            var file = this.options.i18nOutFile || null;
            var format = this.options.i18nOutFormat || null;
            var bundle = this.compiler.emitMessageBundle(this.analyzedModules, locale);
            i18nExtract(format, file, this.host, this.options, bundle);
        }
        var outSrcMapping = [];
        if ((emitFlags & (api_1.EmitFlags.JS | api_1.EmitFlags.DTS | api_1.EmitFlags.Metadata | api_1.EmitFlags.Codegen)) ===
            0) {
            return { emitSkipped: true, diagnostics: [], emittedFiles: [] };
        }
        var _e = this.generateFilesForEmit(emitFlags), genFiles = _e.genFiles, genDiags = _e.genDiags;
        if (genDiags.length) {
            return {
                diagnostics: genDiags,
                emitSkipped: true,
                emittedFiles: [],
            };
        }
        // Restore the original references before we emit so TypeScript doesn't emit
        // a reference to the .d.ts file.
        var augmentedReferences = new Map();
        for (var _i = 0, _f = this.tsProgram.getSourceFiles(); _i < _f.length; _i++) {
            var sourceFile = _f[_i];
            var originalReferences = compiler_host_1.getOriginalReferences(sourceFile);
            if (originalReferences) {
                augmentedReferences.set(sourceFile, sourceFile.referencedFiles);
                sourceFile.referencedFiles = originalReferences;
            }
        }
        var emitResult;
        try {
            emitResult = emitCallback({
                program: this.tsProgram,
                host: this.host,
                options: this.options,
                writeFile: createWriteFileCallback(genFiles, this.host, outSrcMapping),
                emitOnlyDtsFiles: (emitFlags & (api_1.EmitFlags.DTS | api_1.EmitFlags.JS)) == api_1.EmitFlags.DTS,
                customTransformers: this.calculateTransforms(genFiles, customTransformers)
            });
        }
        finally {
            // Restore the references back to the augmented value to ensure that the
            // checks that TypeScript makes for project structure reuse will succeed.
            for (var _g = 0, _h = Array.from(augmentedReferences); _g < _h.length; _g++) {
                var _j = _h[_g], sourceFile = _j[0], references = _j[1];
                sourceFile.referencedFiles = references;
            }
        }
        if (!outSrcMapping.length) {
            // if no files were emitted by TypeScript, also don't emit .json files
            return emitResult;
        }
        var srcToOutPath = this.createSrcToOutPathMapper(outSrcMapping);
        if (emitFlags & api_1.EmitFlags.Codegen) {
            genFiles.forEach(function (gf) {
                if (gf.source) {
                    _this.host.writeFile(srcToOutPath(gf.genFileUrl), gf.source, false);
                }
            });
        }
        if (emitFlags & api_1.EmitFlags.Metadata) {
            this.tsProgram.getSourceFiles().forEach(function (sf) {
                if (!sf.isDeclarationFile && !util_1.GENERATED_FILES.test(sf.fileName)) {
                    var metadata = _this.metadataCache.getMetadata(sf);
                    var metadataText = JSON.stringify([metadata]);
                    _this.host.writeFile(srcToOutPath(sf.fileName.replace(/\.ts$/, '.metadata.json')), metadataText, false);
                }
            });
        }
        return emitResult;
    };
    Object.defineProperty(AngularCompilerProgram.prototype, "compiler", {
        // Private members
        get: function () {
            if (!this._compiler) {
                this.initSync();
            }
            return this._compiler;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AngularCompilerProgram.prototype, "analyzedModules", {
        get: function () {
            if (!this._analyzedModules) {
                this.initSync();
            }
            return this._analyzedModules;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AngularCompilerProgram.prototype, "structuralDiagnostics", {
        get: function () {
            if (!this._structuralDiagnostics) {
                this.initSync();
            }
            return this._structuralDiagnostics;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AngularCompilerProgram.prototype, "tsProgram", {
        get: function () {
            if (!this._tsProgram) {
                this.initSync();
            }
            return this._tsProgram;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AngularCompilerProgram.prototype, "typeCheckHost", {
        get: function () {
            if (!this._typeCheckHost) {
                this.initSync();
            }
            return this._typeCheckHost;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AngularCompilerProgram.prototype, "semanticDiagnostics", {
        get: function () {
            return this._semanticDiagnostics ||
                (this._semanticDiagnostics = this.generateSemanticDiagnostics());
        },
        enumerable: true,
        configurable: true
    });
    AngularCompilerProgram.prototype.calculateTransforms = function (genFiles, customTransformers) {
        var beforeTs = [];
        if (!this.options.disableExpressionLowering) {
            beforeTs.push(lower_expressions_1.getExpressionLoweringTransformFactory(this.metadataCache));
        }
        beforeTs.push(node_emitter_transform_1.getAngularEmitterTransformFactory(genFiles));
        if (customTransformers && customTransformers.beforeTs) {
            beforeTs.push.apply(beforeTs, customTransformers.beforeTs);
        }
        var afterTs = customTransformers ? customTransformers.afterTs : undefined;
        return { before: beforeTs, after: afterTs };
    };
    AngularCompilerProgram.prototype.createSrcToOutPathMapper = function (outSrcMappings) {
        var _this = this;
        var srcToOutPath;
        if (this.options.outDir) {
            // TODO(tbosch): talk to TypeScript team to expose their logic for calculating the `rootDir`
            // if none was specified.
            if (outSrcMappings.length === 0) {
                throw new Error("Can't calculate the rootDir without at least one outSrcMapping. ");
            }
            var firstEntry = outSrcMappings[0];
            var entrySrcDir = path.dirname(firstEntry.sourceFile.fileName);
            var entryOutDir = path.dirname(firstEntry.outFileName);
            var commonSuffix = longestCommonSuffix(entrySrcDir, entryOutDir);
            var rootDir_1 = entrySrcDir.substring(0, entrySrcDir.length - commonSuffix.length);
            srcToOutPath = function (srcFileName) {
                return path.resolve(_this.options.outDir, path.relative(rootDir_1, srcFileName));
            };
        }
        else {
            srcToOutPath = function (srcFileName) { return srcFileName; };
        }
        return srcToOutPath;
    };
    AngularCompilerProgram.prototype.initSync = function () {
        if (this._analyzedModules) {
            return;
        }
        var _a = this._createProgramWithBasicStubs(), tmpProgram = _a.tmpProgram, analyzedFiles = _a.analyzedFiles, hostAdapter = _a.hostAdapter, rootNames = _a.rootNames;
        var analyzedModules;
        try {
            analyzedModules = this._compiler.loadFilesSync(analyzedFiles);
        }
        catch (e) {
            analyzedModules = this.catchAnalysisError(e);
        }
        this._updateProgramWithTypeCheckStubs(tmpProgram, analyzedModules, hostAdapter, rootNames);
    };
    AngularCompilerProgram.prototype._createProgramWithBasicStubs = function () {
        var _this = this;
        if (this._analyzedModules) {
            throw new Error("Internal Error: already initalized!");
        }
        // Note: This is important to not produce a memory leak!
        var oldTsProgram = this.oldTsProgram;
        this.oldTsProgram = undefined;
        var analyzedFiles = [];
        var codegen = function (fileName) {
            if (_this._analyzedModules) {
                throw new Error("Internal Error: already initalized!");
            }
            var analyzedFile = _this._compiler.analyzeFile(fileName);
            analyzedFiles.push(analyzedFile);
            var debug = fileName.endsWith('application_ref.ts');
            return _this._compiler.emitBasicStubs(analyzedFile);
        };
        var hostAdapter = new compiler_host_1.TsCompilerAotCompilerTypeCheckHostAdapter(this.rootNames, this.options, this.host, this.metadataCache, codegen, this.summariesFromPreviousCompilations);
        var aotOptions = getAotCompilerOptions(this.options);
        this._compiler = compiler_1.createAotCompiler(hostAdapter, aotOptions).compiler;
        this._typeCheckHost = hostAdapter;
        this._structuralDiagnostics = [];
        var rootNames = this.rootNames.filter(function (fn) { return !util_1.GENERATED_FILES.test(fn) || !hostAdapter.isSourceFile(fn); });
        if (this.options.noResolve) {
            this.rootNames.forEach(function (rootName) {
                var sf = hostAdapter.getSourceFile(rootName, _this.options.target || ts.ScriptTarget.Latest);
                sf.referencedFiles.forEach(function (fileRef) {
                    if (util_1.GENERATED_FILES.test(fileRef.fileName)) {
                        rootNames.push(fileRef.fileName);
                    }
                });
            });
        }
        var tmpProgram = ts.createProgram(rootNames, this.options, hostAdapter, oldTsProgram);
        return { tmpProgram: tmpProgram, analyzedFiles: analyzedFiles, hostAdapter: hostAdapter, rootNames: rootNames };
    };
    AngularCompilerProgram.prototype._updateProgramWithTypeCheckStubs = function (tmpProgram, analyzedModules, hostAdapter, rootNames) {
        this._analyzedModules = analyzedModules;
        var genFiles = this._compiler.emitTypeCheckStubs(analyzedModules);
        genFiles.forEach(function (gf) { return hostAdapter.updateGeneratedFile(gf); });
        this._tsProgram = ts.createProgram(rootNames, this.options, hostAdapter, tmpProgram);
        // Note: the new ts program should be completely reusable by TypeScript as:
        // - we cache all the files in the hostAdapter
        // - new new stubs use the exactly same imports/exports as the old once (we assert that in
        // hostAdapter.updateGeneratedFile).
        if (util_1.tsStructureIsReused(tmpProgram) !== 2 /* Completely */) {
            throw new Error("Internal Error: The structure of the program changed during codegen.");
        }
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
            return emptyModules;
        }
        throw e;
    };
    // Note: this returns a ts.Diagnostic so that we
    // can return errors in a ts.EmitResult
    AngularCompilerProgram.prototype.generateFilesForEmit = function (emitFlags) {
        try {
            if (!(emitFlags & api_1.EmitFlags.Codegen)) {
                return { genFiles: [], genDiags: [] };
            }
            var genFiles = this._emittedGenFiles = this.compiler.emitAllImpls(this.analyzedModules);
            return { genFiles: genFiles, genDiags: [] };
        }
        catch (e) {
            // TODO(tbosch): check whether we can actually have syntax errors here,
            // as we already parsed the metadata and templates before to create the type check block.
            if (compiler_1.isSyntaxError(e)) {
                var genDiags = [{
                        file: undefined,
                        start: undefined,
                        length: undefined,
                        messageText: e.message,
                        category: ts.DiagnosticCategory.Error,
                        source: api_1.SOURCE,
                        code: api_1.DEFAULT_ERROR_CODE
                    }];
                return { genFiles: [], genDiags: genDiags };
            }
            throw e;
        }
    };
    AngularCompilerProgram.prototype.generateSemanticDiagnostics = function () {
        return translate_diagnostics_1.translateDiagnostics(this.typeCheckHost, this.tsProgram.getSemanticDiagnostics());
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
        fullTemplateTypeCheck: options.fullTemplateTypeCheck,
        rootDir: options.rootDir,
    };
}
function createWriteFileCallback(generatedFiles, host, outSrcMapping) {
    var genFileByFileName = new Map();
    generatedFiles.forEach(function (genFile) { return genFileByFileName.set(genFile.genFileUrl, genFile); });
    return function (fileName, data, writeByteOrderMark, onError, sourceFiles) {
        var sourceFile = sourceFiles && sourceFiles.length == 1 ? sourceFiles[0] : null;
        if (sourceFile) {
            outSrcMapping.push({ outFileName: fileName, sourceFile: sourceFile });
        }
        var isGenerated = util_1.GENERATED_FILES.test(fileName);
        if (isGenerated && sourceFile) {
            // Filter out generated files for which we didn't generate code.
            // This can happen as the stub caclulation is not completely exact.
            var genFile = genFileByFileName.get(sourceFile.fileName);
            if (!genFile || !genFile.stmts || genFile.stmts.length === 0) {
                return;
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
function longestCommonSuffix(a, b) {
    var len = 0;
    while (a.charCodeAt(a.length - 1 - len) === b.charCodeAt(b.length - 1 - len)) {
        len++;
    }
    return a.substring(a.length - len);
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