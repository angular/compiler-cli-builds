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
/**
 * Maximum number of files that are emitable via calling ts.Program.emit
 * passing individual targetSourceFiles.
 */
var MAX_FILE_COUNT_FOR_SINGLE_FILE_EMIT = 20;
var emptyModules = {
    ngModules: [],
    ngModuleByPipeOrDirective: new Map(),
    files: []
};
var defaultEmitCallback = function (_a) {
    var program = _a.program, targetSourceFiles = _a.targetSourceFiles, writeFile = _a.writeFile, cancellationToken = _a.cancellationToken, emitOnlyDtsFiles = _a.emitOnlyDtsFiles, customTransformers = _a.customTransformers;
    if (targetSourceFiles) {
        var diagnostics = [];
        var emitSkipped = false;
        var emittedFiles = [];
        for (var _i = 0, targetSourceFiles_1 = targetSourceFiles; _i < targetSourceFiles_1.length; _i++) {
            var targetSourceFile = targetSourceFiles_1[_i];
            var er = program.emit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers);
            diagnostics.push.apply(diagnostics, er.diagnostics);
            emitSkipped = emitSkipped || er.emitSkipped;
            emittedFiles.push.apply(emittedFiles, er.emittedFiles);
        }
        return { diagnostics: diagnostics, emitSkipped: emitSkipped, emittedFiles: emittedFiles };
    }
    else {
        return program.emit(
        /*targetSourceFile*/ undefined, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers);
    }
};
var AngularCompilerProgram = (function () {
    function AngularCompilerProgram(rootNames, options, host, oldProgram) {
        var _this = this;
        this.rootNames = rootNames;
        this.options = options;
        this.host = host;
        this._changedFileNames = new Map();
        this._optionsDiagnostics = [];
        var _a = ts.version.split('.'), major = _a[0], minor = _a[1];
        if (Number(major) < 2 || (Number(major) === 2 && Number(minor) < 4)) {
            throw new Error('The Angular Compiler requires TypeScript >= 2.4.');
        }
        if (oldProgram) {
            if (oldProgram.getTsProgram) {
                var oldNgProgram = oldProgram;
                this.oldTsProgram = oldNgProgram.getTsProgram();
                this.oldProgramLibrarySummaries = oldNgProgram.getLibrarySummaries();
                this.oldProgramEmittedGeneratedFiles = oldNgProgram.getEmittedGeneratedFiles();
                this.oldProgramEmittedSourceFiles = oldNgProgram.getEmittedSourceFiles();
                this.oldProgramCachedFiles = {
                    getSourceFile: function (fileName) { return _this.oldProgramEmittedSourceFiles.get(fileName); },
                    getGeneratedFile: function (srcFileName, genFileName) {
                        return _this.oldProgramEmittedGeneratedFiles.get(genFileName);
                    },
                };
            }
            else {
                this.oldProgramCachedFiles = oldProgram;
            }
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
        var result = new Map();
        if (this.oldProgramLibrarySummaries) {
            this.oldProgramLibrarySummaries.forEach(function (summary, fileName) { return result.set(fileName, summary); });
        }
        if (this.emittedLibrarySummaries) {
            this.emittedLibrarySummaries.forEach(function (summary, fileName) { return result.set(summary.fileName, summary); });
        }
        return result;
    };
    AngularCompilerProgram.prototype.getEmittedGeneratedFiles = function () {
        var result = new Map();
        if (this.oldProgramEmittedGeneratedFiles) {
            this.oldProgramEmittedGeneratedFiles.forEach(function (genFile, fileName) { return result.set(fileName, genFile); });
        }
        if (this.emittedGeneratedFiles) {
            for (var _i = 0, _a = this.emittedGeneratedFiles; _i < _a.length; _i++) {
                var genFile = _a[_i];
                result.set(genFile.genFileName, genFile);
            }
        }
        return result;
    };
    AngularCompilerProgram.prototype.getEmittedSourceFiles = function () {
        var result = new Map();
        if (this.oldProgramEmittedSourceFiles) {
            this.oldProgramEmittedSourceFiles.forEach(function (sf, fileName) { return result.set(fileName, sf); });
        }
        if (this.emittedSourceFiles) {
            for (var _i = 0, _a = this.emittedSourceFiles; _i < _a.length; _i++) {
                var sf = _a[_i];
                result.set(sf.fileName, sf);
            }
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
        if (sourceFile) {
            return this.tsProgram.getSemanticDiagnostics(sourceFile, cancellationToken);
        }
        var diags = [];
        for (var _i = 0, _a = this.tsProgram.getSourceFiles(); _i < _a.length; _i++) {
            var sf = _a[_i];
            if (!util_1.GENERATED_FILES.test(sf.fileName)) {
                diags.push.apply(diags, this.tsProgram.getSemanticDiagnostics(sf, cancellationToken));
            }
        }
        return diags;
    };
    AngularCompilerProgram.prototype.getNgSemanticDiagnostics = function (genFile, cancellationToken) {
        var diags = [];
        if (genFile) {
            diags.push.apply(diags, this.tsProgram.getSemanticDiagnostics(this.tsProgram.getSourceFile(genFile.genFileName), cancellationToken));
        }
        else {
            for (var _i = 0, _a = this.tsProgram.getSourceFiles(); _i < _a.length; _i++) {
                var sf = _a[_i];
                if (util_1.GENERATED_FILES.test(sf.fileName) && !sf.isDeclarationFile) {
                    diags.push.apply(diags, this.tsProgram.getSemanticDiagnostics(sf, cancellationToken));
                }
            }
        }
        var ng = translate_diagnostics_1.translateDiagnostics(this.typeCheckHost, diags).ng;
        return ng;
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
    AngularCompilerProgram.prototype.getGeneratedFile = function (genFileName) {
        return this.generatedFilesMap.get(genFileName);
    };
    AngularCompilerProgram.prototype.getGeneratedFiles = function () { return this.generatedFiles; };
    AngularCompilerProgram.prototype.hasChanged = function (fileName) {
        if (!this.oldProgramCachedFiles) {
            return true;
        }
        var changed = this._changedFileNames.get(fileName);
        if (typeof changed === 'boolean') {
            return changed;
        }
        var genFile = this.getGeneratedFile(fileName);
        if (genFile) {
            var oldGenFile = this.oldProgramCachedFiles.getGeneratedFile(genFile.srcFileName, genFile.genFileName);
            changed = !oldGenFile || !genFile.isEquivalent(oldGenFile);
        }
        else {
            var sf = this.tsProgram.getSourceFile(fileName);
            var oldSf = this.oldProgramCachedFiles.getSourceFile(fileName);
            changed = !oldSf || sf !== oldSf;
        }
        this._changedFileNames.set(fileName, changed);
        return changed;
    };
    AngularCompilerProgram.prototype.emit = function (_a) {
        var _this = this;
        var _b = _a === void 0 ? {} : _a, targetFileNames = _b.targetFileNames, _c = _b.emitFlags, emitFlags = _c === void 0 ? api_1.EmitFlags.Default : _c, cancellationToken = _b.cancellationToken, customTransformers = _b.customTransformers, _d = _b.emitCallback, emitCallback = _d === void 0 ? defaultEmitCallback : _d;
        var emitStart = Date.now();
        if (emitFlags & api_1.EmitFlags.I18nBundle) {
            var locale = this.options.i18nOutLocale || null;
            var file = this.options.i18nOutFile || null;
            var format = this.options.i18nOutFormat || null;
            var bundle = this.compiler.emitMessageBundle(this.analyzedModules, locale);
            i18nExtract(format, file, this.host, this.options, bundle);
        }
        var emitSkippedResult = { emitSkipped: true, diagnostics: [], emittedFiles: [] };
        if ((emitFlags & (api_1.EmitFlags.JS | api_1.EmitFlags.DTS | api_1.EmitFlags.Metadata | api_1.EmitFlags.Codegen)) ===
            0) {
            return emitSkippedResult;
        }
        var _e = this.calcFilesToEmit(targetFileNames), srcFilesToEmit = _e.srcFilesToEmit, jsonFilesToEmit = _e.jsonFilesToEmit, emitAllFiles = _e.emitAllFiles;
        var outSrcMapping = [];
        var writeTsFile = function (outFileName, outData, writeByteOrderMark, onError, sourceFiles) {
            var sourceFile = sourceFiles && sourceFiles.length == 1 ? sourceFiles[0] : null;
            var genFile;
            if (sourceFile) {
                outSrcMapping.push({ outFileName: outFileName, sourceFile: sourceFile });
                if (emitFlags & api_1.EmitFlags.Codegen) {
                    genFile = _this.getGeneratedFile(sourceFile.fileName);
                }
            }
            _this.writeFile(outFileName, outData, writeByteOrderMark, onError, sourceFiles, genFile);
        };
        var tsCustomTansformers = this.calculateTransforms(customTransformers);
        var emitOnlyDtsFiles = (emitFlags & (api_1.EmitFlags.DTS | api_1.EmitFlags.JS)) == api_1.EmitFlags.DTS;
        // Restore the original references before we emit so TypeScript doesn't emit
        // a reference to the .d.ts file.
        var augmentedReferences = new Map();
        for (var _i = 0, srcFilesToEmit_1 = srcFilesToEmit; _i < srcFilesToEmit_1.length; _i++) {
            var sourceFile = srcFilesToEmit_1[_i];
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
                writeFile: writeTsFile, emitOnlyDtsFiles: emitOnlyDtsFiles,
                customTransformers: tsCustomTansformers,
                targetSourceFiles: emitAllFiles ? undefined : srcFilesToEmit,
            });
        }
        finally {
            // Restore the references back to the augmented value to ensure that the
            // checks that TypeScript makes for project structure reuse will succeed.
            for (var _f = 0, _g = Array.from(augmentedReferences); _f < _g.length; _f++) {
                var _h = _g[_f], sourceFile = _h[0], references = _h[1];
                sourceFile.referencedFiles = references;
            }
        }
        if (!outSrcMapping.length) {
            // if no files were emitted by TypeScript, also don't emit .json files
            emitResult.diagnostics.push(util_1.createMessageDiagnostic("Emitted no files."));
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
            this.emitNgSummaryJsonFiles(jsonFilesToEmit, srcToOutPath);
        }
        if (emitFlags & api_1.EmitFlags.Metadata) {
            this.emitMetadataJsonFiles(srcFilesToEmit, srcToOutPath);
        }
        var emitEnd = Date.now();
        if (this.options.diagnostics) {
            var genTsFileCount = srcFilesToEmit.filter(function (sf) { return util_1.GENERATED_FILES.test(sf.fileName); }).length;
            var genJsonCount = jsonFilesToEmit.length;
            if (emitFlags & api_1.EmitFlags.Metadata) {
                genJsonCount += genTsFileCount;
            }
            emitResult.diagnostics.push(util_1.createMessageDiagnostic([
                "Emitted in " + (emitEnd - emitStart) + "ms",
                "- " + (srcFilesToEmit.length - genTsFileCount) + " user ts files",
                "- " + genTsFileCount + " generated ts files",
                "- " + genJsonCount + " generated json files",
            ].join('\n')));
        }
        return emitResult;
    };
    AngularCompilerProgram.prototype.emitNgSummaryJsonFiles = function (jsonFilesToEmit, srcToOutPath) {
        for (var _i = 0, jsonFilesToEmit_1 = jsonFilesToEmit; _i < jsonFilesToEmit_1.length; _i++) {
            var gf = jsonFilesToEmit_1[_i];
            var outFileName = srcToOutPath(gf.genFileName);
            this.writeFile(outFileName, gf.source, false, undefined, undefined, gf);
        }
    };
    AngularCompilerProgram.prototype.emitMetadataJsonFiles = function (srcFilesToEmit, srcToOutPath) {
        for (var _i = 0, srcFilesToEmit_2 = srcFilesToEmit; _i < srcFilesToEmit_2.length; _i++) {
            var sf = srcFilesToEmit_2[_i];
            if (!util_1.GENERATED_FILES.test(sf.fileName)) {
                var metadata = this.metadataCache.getMetadata(sf);
                var metadataText = JSON.stringify([metadata]);
                var outFileName = srcToOutPath(sf.fileName.replace(/\.ts$/, '.metadata.json'));
                this.writeFile(outFileName, metadataText, false);
            }
        }
    };
    AngularCompilerProgram.prototype.calcFilesToEmit = function (targetFileNames) {
        var _this = this;
        var srcFilesToEmit;
        var jsonFilesToEmit;
        var emitAllFiles;
        if (targetFileNames) {
            emitAllFiles = false;
            srcFilesToEmit = [];
            jsonFilesToEmit = [];
            for (var _i = 0, targetFileNames_1 = targetFileNames; _i < targetFileNames_1.length; _i++) {
                var fileName = targetFileNames_1[_i];
                var sf = this.tsProgram.getSourceFile(fileName);
                if (!sf || sf.isDeclarationFile)
                    continue;
                srcFilesToEmit.push(sf);
                if (!util_1.GENERATED_FILES.test(sf.fileName)) {
                    // find the .ngsummary.json file and mark it for emit as well
                    var ngSummaryFileName = sf.fileName.replace(util_1.EXT, '') + '.ngsummary.json';
                    var ngSummaryGenFile = this.getGeneratedFile(ngSummaryFileName);
                    if (ngSummaryGenFile) {
                        jsonFilesToEmit.push(ngSummaryGenFile);
                    }
                }
            }
        }
        else {
            var changedFiles = [];
            var useChangedFiles = !!this.oldProgramCachedFiles;
            if (useChangedFiles) {
                for (var _a = 0, _b = this.tsProgram.getSourceFiles(); _a < _b.length; _a++) {
                    var sf = _b[_a];
                    if (sf.isDeclarationFile)
                        continue;
                    if (this.hasChanged(sf.fileName)) {
                        changedFiles.push(sf);
                    }
                    if (changedFiles.length > MAX_FILE_COUNT_FOR_SINGLE_FILE_EMIT) {
                        useChangedFiles = false;
                        break;
                    }
                }
            }
            if (useChangedFiles) {
                emitAllFiles = false;
                srcFilesToEmit = changedFiles;
                jsonFilesToEmit = this.getGeneratedFiles().filter(function (genFile) { return !!genFile.source && _this.hasChanged(genFile.genFileName); });
            }
            else {
                emitAllFiles = true;
                srcFilesToEmit = this.tsProgram.getSourceFiles().filter(function (sf) { return !sf.isDeclarationFile; });
                jsonFilesToEmit = this.getGeneratedFiles().filter(function (genFile) { return !!genFile.source; });
            }
        }
        return { srcFilesToEmit: srcFilesToEmit, jsonFilesToEmit: jsonFilesToEmit, emitAllFiles: emitAllFiles };
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
    Object.defineProperty(AngularCompilerProgram.prototype, "generatedFilesMap", {
        get: function () {
            if (!this._generatedFilesMap) {
                this.createGenerateFiles();
            }
            return this._generatedFilesMap;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AngularCompilerProgram.prototype, "generatedFiles", {
        get: function () {
            if (!this._generatedFilesMap) {
                this.createGenerateFiles();
            }
            return this._generatedFiles;
        },
        enumerable: true,
        configurable: true
    });
    AngularCompilerProgram.prototype.calculateTransforms = function (customTransformers) {
        var beforeTs = [];
        if (!this.options.disableExpressionLowering) {
            beforeTs.push(lower_expressions_1.getExpressionLoweringTransformFactory(this.metadataCache));
        }
        beforeTs.push(node_emitter_transform_1.getAngularEmitterTransformFactory(this));
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
            for (var _i = 0, _a = this.rootNames; _i < _a.length; _i++) {
                var rootName = _a[_i];
                if (hostAdapter.shouldGenerateFilesFor(rootName)) {
                    rootNames.push.apply(rootNames, this._compiler.findGeneratedFileNames(rootName));
                }
            }
        }
        var tmpProgram = ts.createProgram(rootNames, this.options, hostAdapter, oldTsProgram);
        var sourceFiles = [];
        for (var _b = 0, _c = tmpProgram.getSourceFiles(); _b < _c.length; _b++) {
            var sf = _c[_b];
            if (hostAdapter.isSourceFile(sf.fileName)) {
                sourceFiles.push(sf.fileName);
            }
        }
        return { tmpProgram: tmpProgram, sourceFiles: sourceFiles, hostAdapter: hostAdapter, rootNames: rootNames };
    };
    AngularCompilerProgram.prototype._updateProgramWithTypeCheckStubs = function (tmpProgram, analyzedModules, hostAdapter, rootNames) {
        this._analyzedModules = analyzedModules || emptyModules;
        if (analyzedModules) {
            for (var _i = 0, _a = tmpProgram.getSourceFiles(); _i < _a.length; _i++) {
                var sf = _a[_i];
                if (sf.fileName.endsWith('.ngfactory.ts')) {
                    var _b = hostAdapter.shouldGenerateFile(sf.fileName), generate = _b.generate, baseFileName = _b.baseFileName;
                    if (generate) {
                        // Note: ! is ok as hostAdapter.shouldGenerateFile will always return a basefileName
                        // for .ngfactory.ts files.
                        var genFile = this._compiler.emitTypeCheckStub(sf.fileName, baseFileName);
                        if (genFile) {
                            hostAdapter.updateGeneratedFile(genFile);
                        }
                    }
                }
            }
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
    AngularCompilerProgram.prototype.createGenerateFiles = function () {
        this._generatedFiles = this.compiler.emitAllImpls(this.analyzedModules);
        this._generatedFilesMap = new Map();
        for (var _i = 0, _a = this._generatedFiles; _i < _a.length; _i++) {
            var genFile = _a[_i];
            this._generatedFilesMap.set(genFile.genFileName, genFile);
        }
    };
    AngularCompilerProgram.prototype.writeFile = function (outFileName, outData, writeByteOrderMark, onError, sourceFiles, genFile) {
        var isGenerated = util_1.GENERATED_FILES.test(outFileName);
        if (!isGenerated && sourceFiles && sourceFiles.length === 1) {
            var sf = sourceFiles[0];
            if (!this.emittedSourceFiles) {
                this.emittedSourceFiles = [];
            }
            // Note: sourceFile is the transformed sourcefile, not the original one!
            this.emittedSourceFiles.push(this.tsProgram.getSourceFile(sf.fileName));
        }
        // collect emittedLibrarySummaries
        var baseFile;
        if (genFile) {
            baseFile = this.tsProgram.getSourceFile(genFile.srcFileName);
            if (baseFile) {
                if (!this.emittedLibrarySummaries) {
                    this.emittedLibrarySummaries = [];
                }
                if (genFile.genFileName.endsWith('.ngsummary.json') &&
                    baseFile.fileName.endsWith('.d.ts')) {
                    this.emittedLibrarySummaries.push({
                        fileName: baseFile.fileName,
                        text: baseFile.text,
                        sourceFile: baseFile,
                    });
                    this.emittedLibrarySummaries.push({ fileName: genFile.genFileName, text: outData });
                    if (!this.options.declaration) {
                        // If we don't emit declarations, still record an empty .ngfactory.d.ts file,
                        // as we might need it lateron for resolving module names from summaries.
                        var ngFactoryDts = genFile.genFileName.substring(0, genFile.genFileName.length - 15) +
                            '.ngfactory.d.ts';
                        this.emittedLibrarySummaries.push({ fileName: ngFactoryDts, text: '' });
                    }
                }
                else if (outFileName.endsWith('.d.ts') && baseFile.fileName.endsWith('.d.ts')) {
                    var dtsSourceFilePath = genFile.genFileName.replace(/\.ts$/, '.d.ts');
                    // Note: Don't use sourceFiles here as the created .d.ts has a path in the outDir,
                    // but we need one that is next to the .ts file
                    this.emittedLibrarySummaries.push({ fileName: dtsSourceFilePath, text: outData });
                }
            }
            if (!this.emittedGeneratedFiles) {
                this.emittedGeneratedFiles = [];
            }
            this.emittedGeneratedFiles.push(genFile);
        }
        // Filter out generated files for which we didn't generate code.
        // This can happen as the stub calculation is not completely exact.
        // Note: sourceFile refers to the .ngfactory.ts / .ngsummary.ts file
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
exports.createProgram = function (_a) {
    var rootNames = _a.rootNames, options = _a.options, host = _a.host, oldProgram = _a.oldProgram;
    return new AngularCompilerProgram(rootNames, options, host, oldProgram);
};
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
        enableSummariesForJit: options.enableSummariesForJit,
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
 * Note: This function works on normalized paths from typescript.
 *
 * @param outDir
 * @param outSrcMappings
 */
function createSrcToOutPathMapper(outDir, sampleSrcFileName, sampleOutFileName, host) {
    if (host === void 0) { host = path; }
    var srcToOutPath;
    if (outDir) {
        if (sampleSrcFileName == null || sampleOutFileName == null) {
            throw new Error("Can't calculate the rootDir without a sample srcFileName / outFileName. ");
        }
        var srcFileDir = host.dirname(sampleSrcFileName).replace(/\\/g, '/');
        var outFileDir = host.dirname(sampleOutFileName).replace(/\\/g, '/');
        if (srcFileDir === outFileDir) {
            return function (srcFileName) { return srcFileName; };
        }
        var srcDirParts = srcFileDir.split('/');
        var outDirParts = outFileDir.split('/');
        // calculate the common suffix
        var i = 0;
        while (i < Math.min(srcDirParts.length, outDirParts.length) &&
            srcDirParts[srcDirParts.length - 1 - i] === outDirParts[outDirParts.length - 1 - i])
            i++;
        var rootDir_1 = srcDirParts.slice(0, srcDirParts.length - i).join('/');
        srcToOutPath = function (srcFileName) { return host.resolve(outDir, host.relative(rootDir_1, srcFileName)); };
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