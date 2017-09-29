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
        this.rootNames = rootNames;
        this.options = options;
        this.host = host;
        this.oldProgram = oldProgram;
        this.oldProgramLibrarySummaries = [];
        this._optionsDiagnostics = [];
        var _a = ts.version.split('.'), major = _a[0], minor = _a[1];
        if (Number(major) < 2 || (Number(major) === 2 && Number(minor) < 4)) {
            throw new Error('The Angular Compiler requires TypeScript >= 2.4.');
        }
        this.oldTsProgram = oldProgram ? oldProgram.getTsProgram() : undefined;
        if (oldProgram) {
            this.oldProgramLibrarySummaries = oldProgram.getLibrarySummaries();
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
        var result = this.oldProgramLibrarySummaries.slice();
        if (this.emittedLibrarySummaries) {
            result.push.apply(result, this.emittedLibrarySummaries);
        }
        return result;
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
        var _a = this._createProgramWithBasicStubs(), tmpProgram = _a.tmpProgram, sourceFiles = _a.sourceFiles, hostAdapter = _a.hostAdapter, rootNames = _a.rootNames;
        return this._compiler.loadFilesAsync(sourceFiles)
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
        var emittedLibrarySummaries = this.emittedLibrarySummaries = [];
        var outSrcMapping = [];
        var genFileByFileName = new Map();
        genFiles.forEach(function (genFile) { return genFileByFileName.set(genFile.genFileUrl, genFile); });
        var writeTsFile = function (outFileName, outData, writeByteOrderMark, onError, sourceFiles) {
            var sourceFile = sourceFiles && sourceFiles.length == 1 ? sourceFiles[0] : null;
            var genFile;
            if (sourceFile) {
                outSrcMapping.push({ outFileName: outFileName, sourceFile: sourceFile });
                genFile = genFileByFileName.get(sourceFile.fileName);
            }
            _this.writeFile(outFileName, outData, writeByteOrderMark, onError, genFile, sourceFiles);
        };
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
                writeFile: writeTsFile,
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
        var sampleSrcFileName;
        var sampleOutFileName;
        if (outSrcMapping.length) {
            sampleSrcFileName = outSrcMapping[0].sourceFile.fileName;
            sampleOutFileName = outSrcMapping[0].outFileName;
        }
        var srcToOutPath = createSrcToOutPathMapper(this.options.outDir, sampleSrcFileName, sampleOutFileName);
        if (emitFlags & api_1.EmitFlags.Codegen) {
            genFiles.forEach(function (gf) {
                if (gf.source) {
                    var outFileName = srcToOutPath(gf.genFileUrl);
                    _this.writeFile(outFileName, gf.source, false, undefined, gf);
                }
            });
        }
        if (emitFlags & api_1.EmitFlags.Metadata) {
            this.tsProgram.getSourceFiles().forEach(function (sf) {
                if (!sf.isDeclarationFile && !util_1.GENERATED_FILES.test(sf.fileName)) {
                    var metadata = _this.metadataCache.getMetadata(sf);
                    var metadataText = JSON.stringify([metadata]);
                    var outFileName = srcToOutPath(sf.fileName.replace(/\.ts$/, '.metadata.json'));
                    _this.writeFile(outFileName, metadataText, false, undefined, undefined, [sf]);
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
    AngularCompilerProgram.prototype.initSync = function () {
        if (this._analyzedModules) {
            return;
        }
        var _a = this._createProgramWithBasicStubs(), tmpProgram = _a.tmpProgram, sourceFiles = _a.sourceFiles, hostAdapter = _a.hostAdapter, rootNames = _a.rootNames;
        var analyzedModules;
        try {
            analyzedModules = this._compiler.loadFilesSync(sourceFiles);
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
        var codegen = {
            generateFile: function (genFileName, baseFileName) {
                return _this._compiler.emitBasicStub(genFileName, baseFileName);
            },
            findGeneratedFileNames: function (fileName) { return _this._compiler.findGeneratedFileNames(fileName); },
        };
        var hostAdapter = new compiler_host_1.TsCompilerAotCompilerTypeCheckHostAdapter(this.rootNames, this.options, this.host, this.metadataCache, codegen, this.oldProgramLibrarySummaries);
        var aotOptions = getAotCompilerOptions(this.options);
        this._compiler = compiler_1.createAotCompiler(hostAdapter, aotOptions).compiler;
        this._typeCheckHost = hostAdapter;
        this._structuralDiagnostics = [];
        var rootNames = this.rootNames.filter(function (fn) { return !util_1.GENERATED_FILES.test(fn) || !hostAdapter.isSourceFile(fn); });
        if (this.options.noResolve) {
            this.rootNames.forEach(function (rootName) {
                if (hostAdapter.shouldGenerateFilesFor(rootName)) {
                    rootNames.push.apply(rootNames, _this._compiler.findGeneratedFileNames(rootName));
                }
            });
        }
        var tmpProgram = ts.createProgram(rootNames, this.options, hostAdapter, oldTsProgram);
        var sourceFiles = [];
        tmpProgram.getSourceFiles().forEach(function (sf) {
            if (hostAdapter.isSourceFile(sf.fileName)) {
                sourceFiles.push(sf.fileName);
            }
        });
        return { tmpProgram: tmpProgram, sourceFiles: sourceFiles, hostAdapter: hostAdapter, rootNames: rootNames };
    };
    AngularCompilerProgram.prototype._updateProgramWithTypeCheckStubs = function (tmpProgram, analyzedModules, hostAdapter, rootNames) {
        var _this = this;
        this._analyzedModules = analyzedModules || emptyModules;
        if (analyzedModules) {
            tmpProgram.getSourceFiles().forEach(function (sf) {
                if (sf.fileName.endsWith('.ngfactory.ts')) {
                    var _a = hostAdapter.shouldGenerateFile(sf.fileName), generate = _a.generate, baseFileName = _a.baseFileName;
                    if (generate) {
                        // Note: ! is ok as hostAdapter.shouldGenerateFile will always return a basefileName
                        // for .ngfactory.ts files.
                        var genFile = _this._compiler.emitTypeCheckStub(sf.fileName, baseFileName);
                        if (genFile) {
                            hostAdapter.updateGeneratedFile(genFile);
                        }
                    }
                }
            });
        }
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
            return null;
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
            var genFiles = this.compiler.emitAllImpls(this.analyzedModules);
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
    AngularCompilerProgram.prototype.writeFile = function (outFileName, outData, writeByteOrderMark, onError, genFile, sourceFiles) {
        // collect emittedLibrarySummaries
        var baseFile;
        if (genFile) {
            baseFile = this.tsProgram.getSourceFile(genFile.srcFileUrl);
            if (baseFile) {
                if (!this.emittedLibrarySummaries) {
                    this.emittedLibrarySummaries = [];
                }
                if (genFile.genFileUrl.endsWith('.ngsummary.json') && baseFile.fileName.endsWith('.d.ts')) {
                    this.emittedLibrarySummaries.push({
                        fileName: baseFile.fileName,
                        text: baseFile.text,
                        sourceFile: baseFile,
                    });
                    this.emittedLibrarySummaries.push({ fileName: genFile.genFileUrl, text: outData });
                    if (!this.options.declaration) {
                        // If we don't emit declarations, still record an empty .ngfactory.d.ts file,
                        // as we might need it lateron for resolving module names from summaries.
                        var ngFactoryDts = genFile.genFileUrl.substring(0, genFile.genFileUrl.length - 15) + '.ngfactory.d.ts';
                        this.emittedLibrarySummaries.push({ fileName: ngFactoryDts, text: '' });
                    }
                }
                else if (outFileName.endsWith('.d.ts') && baseFile.fileName.endsWith('.d.ts')) {
                    var dtsSourceFilePath = genFile.genFileUrl.replace(/\.ts$/, '.d.ts');
                    // Note: Don't use sourceFiles here as the created .d.ts has a path in the outDir,
                    // but we need one that is next to the .ts file
                    this.emittedLibrarySummaries.push({ fileName: dtsSourceFilePath, text: outData });
                }
            }
        }
        // Filter out generated files for which we didn't generate code.
        // This can happen as the stub caclulation is not completely exact.
        // Note: sourceFile refers to the .ngfactory.ts / .ngsummary.ts file
        var isGenerated = util_1.GENERATED_FILES.test(outFileName);
        if (isGenerated) {
            if (!genFile || !genFile.stmts || genFile.stmts.length === 0) {
                if (this.options.allowEmptyCodegenFiles) {
                    outData = '';
                }
                else {
                    return;
                }
            }
        }
        if (baseFile) {
            sourceFiles = sourceFiles ? sourceFiles.concat([baseFile]) : [baseFile];
        }
        this.host.writeFile(outFileName, outData, writeByteOrderMark, onError, sourceFiles);
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
        allowEmptyCodegenFiles: options.allowEmptyCodegenFiles,
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
/**
 * Returns a function that can adjust a path from source path to out path,
 * based on an existing mapping from source to out path.
 *
 * TODO(tbosch): talk to the TypeScript team to expose their logic for calculating the `rootDir`
 * if none was specified.
 *
 * @param outDir
 * @param outSrcMappings
 */
function createSrcToOutPathMapper(outDir, sampleSrcFileName, sampleOutFileName) {
    var srcToOutPath;
    if (outDir) {
        if (sampleSrcFileName == null || sampleOutFileName == null) {
            throw new Error("Can't calculate the rootDir without a sample srcFileName / outFileName. ");
        }
        var srcFileDir = path.dirname(sampleSrcFileName);
        var outFileDir = path.dirname(sampleOutFileName);
        if (srcFileDir === outFileDir) {
            return function (srcFileName) { return srcFileName; };
        }
        var srcDirParts = srcFileDir.split(path.sep);
        var outDirParts = outFileDir.split(path.sep);
        // calculate the common suffix
        var i = 0;
        while (i < Math.min(srcDirParts.length, outDirParts.length) &&
            srcDirParts[srcDirParts.length - 1 - i] === outDirParts[outDirParts.length - 1 - i])
            i++;
        var rootDir_1 = srcDirParts.slice(0, srcDirParts.length - i).join(path.sep);
        srcToOutPath = function (srcFileName) { return path.resolve(outDir, path.relative(rootDir_1, srcFileName)); };
    }
    else {
        srcToOutPath = function (srcFileName) { return srcFileName; };
    }
    return srcToOutPath;
}
exports.createSrcToOutPathMapper = createSrcToOutPathMapper;
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