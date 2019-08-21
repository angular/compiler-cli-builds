/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/transformers/program", ["require", "exports", "tslib", "@angular/compiler", "fs", "path", "typescript", "@angular/compiler-cli/src/diagnostics/translate_diagnostics", "@angular/compiler-cli/src/diagnostics/typescript_version", "@angular/compiler-cli/src/metadata/index", "@angular/compiler-cli/src/ngtsc/program", "@angular/compiler-cli/src/transformers/api", "@angular/compiler-cli/src/transformers/compiler_host", "@angular/compiler-cli/src/transformers/inline_resources", "@angular/compiler-cli/src/transformers/lower_expressions", "@angular/compiler-cli/src/transformers/metadata_cache", "@angular/compiler-cli/src/transformers/nocollapse_hack", "@angular/compiler-cli/src/transformers/node_emitter_transform", "@angular/compiler-cli/src/transformers/r3_metadata_transform", "@angular/compiler-cli/src/transformers/r3_strip_decorators", "@angular/compiler-cli/src/transformers/r3_transform", "@angular/compiler-cli/src/transformers/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var fs = require("fs");
    var path = require("path");
    var ts = require("typescript");
    var translate_diagnostics_1 = require("@angular/compiler-cli/src/diagnostics/translate_diagnostics");
    var typescript_version_1 = require("@angular/compiler-cli/src/diagnostics/typescript_version");
    var metadata_1 = require("@angular/compiler-cli/src/metadata/index");
    var program_1 = require("@angular/compiler-cli/src/ngtsc/program");
    var api_1 = require("@angular/compiler-cli/src/transformers/api");
    var compiler_host_1 = require("@angular/compiler-cli/src/transformers/compiler_host");
    var inline_resources_1 = require("@angular/compiler-cli/src/transformers/inline_resources");
    var lower_expressions_1 = require("@angular/compiler-cli/src/transformers/lower_expressions");
    var metadata_cache_1 = require("@angular/compiler-cli/src/transformers/metadata_cache");
    var nocollapse_hack_1 = require("@angular/compiler-cli/src/transformers/nocollapse_hack");
    var node_emitter_transform_1 = require("@angular/compiler-cli/src/transformers/node_emitter_transform");
    var r3_metadata_transform_1 = require("@angular/compiler-cli/src/transformers/r3_metadata_transform");
    var r3_strip_decorators_1 = require("@angular/compiler-cli/src/transformers/r3_strip_decorators");
    var r3_transform_1 = require("@angular/compiler-cli/src/transformers/r3_transform");
    var util_1 = require("@angular/compiler-cli/src/transformers/util");
    /**
     * Maximum number of files that are emitable via calling ts.Program.emit
     * passing individual targetSourceFiles.
     */
    var MAX_FILE_COUNT_FOR_SINGLE_FILE_EMIT = 20;
    /**
     * Fields to lower within metadata in render2 mode.
     */
    var LOWER_FIELDS = ['useValue', 'useFactory', 'data', 'id', 'loadChildren'];
    /**
     * Fields to lower within metadata in render3 mode.
     */
    var R3_LOWER_FIELDS = tslib_1.__spread(LOWER_FIELDS, ['providers', 'imports', 'exports']);
    var R3_REIFIED_DECORATORS = [
        'Component',
        'Directive',
        'Injectable',
        'NgModule',
        'Pipe',
    ];
    var emptyModules = {
        ngModules: [],
        ngModuleByPipeOrDirective: new Map(),
        files: []
    };
    var defaultEmitCallback = function (_a) {
        var program = _a.program, targetSourceFile = _a.targetSourceFile, writeFile = _a.writeFile, cancellationToken = _a.cancellationToken, emitOnlyDtsFiles = _a.emitOnlyDtsFiles, customTransformers = _a.customTransformers;
        return program.emit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers);
    };
    /**
     * Minimum supported TypeScript version
     * ∀ supported typescript version v, v >= MIN_TS_VERSION
     */
    var MIN_TS_VERSION = '3.4.0';
    /**
     * Supremum of supported TypeScript versions
     * ∀ supported typescript version v, v < MAX_TS_VERSION
     * MAX_TS_VERSION is not considered as a supported TypeScript version
     */
    var MAX_TS_VERSION = '3.6.0';
    var AngularCompilerProgram = /** @class */ (function () {
        function AngularCompilerProgram(rootNames, options, host, oldProgram) {
            var _a;
            var _this = this;
            this.options = options;
            this.host = host;
            this._optionsDiagnostics = [];
            this.rootNames = tslib_1.__spread(rootNames);
            checkVersion(ts.version, MIN_TS_VERSION, MAX_TS_VERSION, options.disableTypeScriptVersionCheck);
            this.oldTsProgram = oldProgram ? oldProgram.getTsProgram() : undefined;
            if (oldProgram) {
                this.oldProgramLibrarySummaries = oldProgram.getLibrarySummaries();
                this.oldProgramEmittedGeneratedFiles = oldProgram.getEmittedGeneratedFiles();
                this.oldProgramEmittedSourceFiles = oldProgram.getEmittedSourceFiles();
            }
            if (options.flatModuleOutFile) {
                var _b = metadata_1.createBundleIndexHost(options, this.rootNames, host, function () { return _this.flatModuleMetadataCache; }), bundleHost = _b.host, indexName = _b.indexName, errors = _b.errors;
                if (errors) {
                    (_a = this._optionsDiagnostics).push.apply(_a, tslib_1.__spread(errors.map(function (e) { return ({
                        category: e.category,
                        messageText: e.messageText,
                        source: api_1.SOURCE,
                        code: api_1.DEFAULT_ERROR_CODE
                    }); })));
                }
                else {
                    this.rootNames.push(indexName);
                    this.host = bundleHost;
                }
            }
            this.loweringMetadataTransform =
                new lower_expressions_1.LowerMetadataTransform(options.enableIvy !== false ? R3_LOWER_FIELDS : LOWER_FIELDS);
            this.metadataCache = this.createMetadataCache([this.loweringMetadataTransform]);
        }
        AngularCompilerProgram.prototype.createMetadataCache = function (transformers) {
            return new metadata_cache_1.MetadataCache(new metadata_1.MetadataCollector({ quotedNames: true }), !!this.options.strictMetadataEmit, transformers);
        };
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
                this.emittedGeneratedFiles.forEach(function (genFile) { return result.set(genFile.genFileUrl, genFile); });
            }
            return result;
        };
        AngularCompilerProgram.prototype.getEmittedSourceFiles = function () {
            var result = new Map();
            if (this.oldProgramEmittedSourceFiles) {
                this.oldProgramEmittedSourceFiles.forEach(function (sf, fileName) { return result.set(fileName, sf); });
            }
            if (this.emittedSourceFiles) {
                this.emittedSourceFiles.forEach(function (sf) { return result.set(sf.fileName, sf); });
            }
            return result;
        };
        AngularCompilerProgram.prototype.getTsProgram = function () { return this.tsProgram; };
        AngularCompilerProgram.prototype.getTsOptionDiagnostics = function (cancellationToken) {
            return this.tsProgram.getOptionsDiagnostics(cancellationToken);
        };
        AngularCompilerProgram.prototype.getNgOptionDiagnostics = function (cancellationToken) {
            return tslib_1.__spread(this._optionsDiagnostics, getNgOptionDiagnostics(this.options));
        };
        AngularCompilerProgram.prototype.getTsSyntacticDiagnostics = function (sourceFile, cancellationToken) {
            return this.tsProgram.getSyntacticDiagnostics(sourceFile, cancellationToken);
        };
        AngularCompilerProgram.prototype.getNgStructuralDiagnostics = function (cancellationToken) {
            return this.structuralDiagnostics;
        };
        AngularCompilerProgram.prototype.getTsSemanticDiagnostics = function (sourceFile, cancellationToken) {
            var _this = this;
            var sourceFiles = sourceFile ? [sourceFile] : this.tsProgram.getSourceFiles();
            var diags = [];
            sourceFiles.forEach(function (sf) {
                if (!util_1.GENERATED_FILES.test(sf.fileName)) {
                    diags.push.apply(diags, tslib_1.__spread(_this.tsProgram.getSemanticDiagnostics(sf, cancellationToken)));
                }
            });
            return diags;
        };
        AngularCompilerProgram.prototype.getNgSemanticDiagnostics = function (fileName, cancellationToken) {
            var _this = this;
            var diags = [];
            this.tsProgram.getSourceFiles().forEach(function (sf) {
                if (util_1.GENERATED_FILES.test(sf.fileName) && !sf.isDeclarationFile) {
                    diags.push.apply(diags, tslib_1.__spread(_this.tsProgram.getSemanticDiagnostics(sf, cancellationToken)));
                }
            });
            var ng = translate_diagnostics_1.translateDiagnostics(this.hostAdapter, diags).ng;
            return ng;
        };
        AngularCompilerProgram.prototype.loadNgStructureAsync = function () {
            var _this = this;
            if (this._analyzedModules) {
                throw new Error('Angular structure already loaded');
            }
            return Promise.resolve()
                .then(function () {
                var _a = _this._createProgramWithBasicStubs(), tmpProgram = _a.tmpProgram, sourceFiles = _a.sourceFiles, tsFiles = _a.tsFiles, rootNames = _a.rootNames;
                return _this.compiler.loadFilesAsync(sourceFiles, tsFiles)
                    .then(function (_a) {
                    var analyzedModules = _a.analyzedModules, analyzedInjectables = _a.analyzedInjectables;
                    if (_this._analyzedModules) {
                        throw new Error('Angular structure loaded both synchronously and asynchronously');
                    }
                    _this._updateProgramWithTypeCheckStubs(tmpProgram, analyzedModules, analyzedInjectables, rootNames);
                });
            })
                .catch(function (e) { return _this._createProgramOnError(e); });
        };
        AngularCompilerProgram.prototype.listLazyRoutes = function (route) {
            // Note: Don't analyzedModules if a route is given
            // to be fast enough.
            return this.compiler.listLazyRoutes(route, route ? undefined : this.analyzedModules);
        };
        AngularCompilerProgram.prototype.emit = function (parameters) {
            if (parameters === void 0) { parameters = {}; }
            if (this.options.enableIvy !== false) {
                throw new Error('Cannot run legacy compiler in ngtsc mode');
            }
            return this._emitRender2(parameters);
        };
        AngularCompilerProgram.prototype._emitRender3 = function (_a) {
            var e_1, _b, e_2, _c;
            var _this = this;
            var _d = _a === void 0 ? {} : _a, _e = _d.emitFlags, emitFlags = _e === void 0 ? api_1.EmitFlags.Default : _e, cancellationToken = _d.cancellationToken, customTransformers = _d.customTransformers, _f = _d.emitCallback, emitCallback = _f === void 0 ? defaultEmitCallback : _f, _g = _d.mergeEmitResultsCallback, mergeEmitResultsCallback = _g === void 0 ? mergeEmitResults : _g;
            var emitStart = Date.now();
            if ((emitFlags & (api_1.EmitFlags.JS | api_1.EmitFlags.DTS | api_1.EmitFlags.Metadata | api_1.EmitFlags.Codegen)) ===
                0) {
                return { emitSkipped: true, diagnostics: [], emittedFiles: [] };
            }
            // analyzedModules and analyzedInjectables are created together. If one exists, so does the
            // other.
            var modules = this.compiler.emitAllPartialModules(this.analyzedModules, this._analyzedInjectables);
            var writeTsFile = function (outFileName, outData, writeByteOrderMark, onError, sourceFiles) {
                var sourceFile = sourceFiles && sourceFiles.length == 1 ? sourceFiles[0] : null;
                var genFile;
                if (_this.options.annotateForClosureCompiler && sourceFile &&
                    util_1.TS.test(sourceFile.fileName)) {
                    outData = nocollapse_hack_1.nocollapseHack(outData);
                }
                _this.writeFile(outFileName, outData, writeByteOrderMark, onError, undefined, sourceFiles);
            };
            var emitOnlyDtsFiles = (emitFlags & (api_1.EmitFlags.DTS | api_1.EmitFlags.JS)) == api_1.EmitFlags.DTS;
            var tsCustomTransformers = this.calculateTransforms(
            /* genFiles */ undefined, /* partialModules */ modules, 
            /* stripDecorators */ this.reifiedDecorators, customTransformers);
            // Restore the original references before we emit so TypeScript doesn't emit
            // a reference to the .d.ts file.
            var augmentedReferences = new Map();
            try {
                for (var _h = tslib_1.__values(this.tsProgram.getSourceFiles()), _j = _h.next(); !_j.done; _j = _h.next()) {
                    var sourceFile = _j.value;
                    var originalReferences = compiler_host_1.getOriginalReferences(sourceFile);
                    if (originalReferences) {
                        augmentedReferences.set(sourceFile, sourceFile.referencedFiles);
                        sourceFile.referencedFiles = originalReferences;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_j && !_j.done && (_b = _h.return)) _b.call(_h);
                }
                finally { if (e_1) throw e_1.error; }
            }
            try {
                return emitCallback({
                    program: this.tsProgram,
                    host: this.host,
                    options: this.options,
                    writeFile: writeTsFile, emitOnlyDtsFiles: emitOnlyDtsFiles,
                    customTransformers: tsCustomTransformers
                });
            }
            finally {
                try {
                    // Restore the references back to the augmented value to ensure that the
                    // checks that TypeScript makes for project structure reuse will succeed.
                    for (var _k = tslib_1.__values(Array.from(augmentedReferences)), _l = _k.next(); !_l.done; _l = _k.next()) {
                        var _m = tslib_1.__read(_l.value, 2), sourceFile = _m[0], references = _m[1];
                        // TODO(chuckj): Remove any cast after updating build to 2.6
                        sourceFile.referencedFiles = references;
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_l && !_l.done && (_c = _k.return)) _c.call(_k);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
        };
        AngularCompilerProgram.prototype._emitRender2 = function (_a) {
            var e_3, _b, e_4, _c;
            var _this = this;
            var _d = _a === void 0 ? {} : _a, _e = _d.emitFlags, emitFlags = _e === void 0 ? api_1.EmitFlags.Default : _e, cancellationToken = _d.cancellationToken, customTransformers = _d.customTransformers, _f = _d.emitCallback, emitCallback = _f === void 0 ? defaultEmitCallback : _f, _g = _d.mergeEmitResultsCallback, mergeEmitResultsCallback = _g === void 0 ? mergeEmitResults : _g;
            var emitStart = Date.now();
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
            var _h = this.generateFilesForEmit(emitFlags), genFiles = _h.genFiles, genDiags = _h.genDiags;
            if (genDiags.length) {
                return {
                    diagnostics: genDiags,
                    emitSkipped: true,
                    emittedFiles: [],
                };
            }
            this.emittedGeneratedFiles = genFiles;
            var outSrcMapping = [];
            var genFileByFileName = new Map();
            genFiles.forEach(function (genFile) { return genFileByFileName.set(genFile.genFileUrl, genFile); });
            this.emittedLibrarySummaries = [];
            var emittedSourceFiles = [];
            var writeTsFile = function (outFileName, outData, writeByteOrderMark, onError, sourceFiles) {
                var sourceFile = sourceFiles && sourceFiles.length == 1 ? sourceFiles[0] : null;
                var genFile;
                if (sourceFile) {
                    outSrcMapping.push({ outFileName: outFileName, sourceFile: sourceFile });
                    genFile = genFileByFileName.get(sourceFile.fileName);
                    if (!sourceFile.isDeclarationFile && !util_1.GENERATED_FILES.test(sourceFile.fileName)) {
                        // Note: sourceFile is the transformed sourcefile, not the original one!
                        var originalFile = _this.tsProgram.getSourceFile(sourceFile.fileName);
                        if (originalFile) {
                            emittedSourceFiles.push(originalFile);
                        }
                    }
                    if (_this.options.annotateForClosureCompiler && util_1.TS.test(sourceFile.fileName)) {
                        outData = nocollapse_hack_1.nocollapseHack(outData);
                    }
                }
                _this.writeFile(outFileName, outData, writeByteOrderMark, onError, genFile, sourceFiles);
            };
            var modules = this._analyzedInjectables &&
                this.compiler.emitAllPartialModules2(this._analyzedInjectables);
            var tsCustomTransformers = this.calculateTransforms(genFileByFileName, modules, /* stripDecorators */ undefined, customTransformers);
            var emitOnlyDtsFiles = (emitFlags & (api_1.EmitFlags.DTS | api_1.EmitFlags.JS)) == api_1.EmitFlags.DTS;
            // Restore the original references before we emit so TypeScript doesn't emit
            // a reference to the .d.ts file.
            var augmentedReferences = new Map();
            try {
                for (var _j = tslib_1.__values(this.tsProgram.getSourceFiles()), _k = _j.next(); !_k.done; _k = _j.next()) {
                    var sourceFile = _k.value;
                    var originalReferences = compiler_host_1.getOriginalReferences(sourceFile);
                    if (originalReferences) {
                        augmentedReferences.set(sourceFile, sourceFile.referencedFiles);
                        sourceFile.referencedFiles = originalReferences;
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_k && !_k.done && (_b = _j.return)) _b.call(_j);
                }
                finally { if (e_3) throw e_3.error; }
            }
            var genTsFiles = [];
            var genJsonFiles = [];
            genFiles.forEach(function (gf) {
                if (gf.stmts) {
                    genTsFiles.push(gf);
                }
                if (gf.source) {
                    genJsonFiles.push(gf);
                }
            });
            var emitResult;
            var emittedUserTsCount;
            try {
                var sourceFilesToEmit = this.getSourceFilesForEmit();
                if (sourceFilesToEmit &&
                    (sourceFilesToEmit.length + genTsFiles.length) < MAX_FILE_COUNT_FOR_SINGLE_FILE_EMIT) {
                    var fileNamesToEmit = tslib_1.__spread(sourceFilesToEmit.map(function (sf) { return sf.fileName; }), genTsFiles.map(function (gf) { return gf.genFileUrl; }));
                    emitResult = mergeEmitResultsCallback(fileNamesToEmit.map(function (fileName) { return emitResult = emitCallback({
                        program: _this.tsProgram,
                        host: _this.host,
                        options: _this.options,
                        writeFile: writeTsFile, emitOnlyDtsFiles: emitOnlyDtsFiles,
                        customTransformers: tsCustomTransformers,
                        targetSourceFile: _this.tsProgram.getSourceFile(fileName),
                    }); }));
                    emittedUserTsCount = sourceFilesToEmit.length;
                }
                else {
                    emitResult = emitCallback({
                        program: this.tsProgram,
                        host: this.host,
                        options: this.options,
                        writeFile: writeTsFile, emitOnlyDtsFiles: emitOnlyDtsFiles,
                        customTransformers: tsCustomTransformers
                    });
                    emittedUserTsCount = this.tsProgram.getSourceFiles().length - genTsFiles.length;
                }
            }
            finally {
                try {
                    // Restore the references back to the augmented value to ensure that the
                    // checks that TypeScript makes for project structure reuse will succeed.
                    for (var _l = tslib_1.__values(Array.from(augmentedReferences)), _m = _l.next(); !_m.done; _m = _l.next()) {
                        var _o = tslib_1.__read(_m.value, 2), sourceFile = _o[0], references = _o[1];
                        // TODO(chuckj): Remove any cast after updating build to 2.6
                        sourceFile.referencedFiles = references;
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_m && !_m.done && (_c = _l.return)) _c.call(_l);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
            }
            this.emittedSourceFiles = emittedSourceFiles;
            // Match behavior of tsc: only produce emit diagnostics if it would block
            // emit. If noEmitOnError is false, the emit will happen in spite of any
            // errors, so we should not report them.
            if (emitResult && this.options.noEmitOnError === true) {
                // translate the diagnostics in the emitResult as well.
                var translatedEmitDiags = translate_diagnostics_1.translateDiagnostics(this.hostAdapter, emitResult.diagnostics);
                emitResult.diagnostics = translatedEmitDiags.ts.concat(this.structuralDiagnostics.concat(translatedEmitDiags.ng).map(util_1.ngToTsDiagnostic));
            }
            if (emitResult && !outSrcMapping.length) {
                // if no files were emitted by TypeScript, also don't emit .json files
                emitResult.diagnostics =
                    emitResult.diagnostics.concat([util_1.createMessageDiagnostic("Emitted no files.")]);
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
                genJsonFiles.forEach(function (gf) {
                    var outFileName = srcToOutPath(gf.genFileUrl);
                    _this.writeFile(outFileName, gf.source, false, undefined, gf);
                });
            }
            var metadataJsonCount = 0;
            if (emitFlags & api_1.EmitFlags.Metadata) {
                this.tsProgram.getSourceFiles().forEach(function (sf) {
                    if (!sf.isDeclarationFile && !util_1.GENERATED_FILES.test(sf.fileName)) {
                        metadataJsonCount++;
                        var metadata = _this.metadataCache.getMetadata(sf);
                        if (metadata) {
                            var metadataText = JSON.stringify([metadata]);
                            var outFileName = srcToOutPath(sf.fileName.replace(/\.tsx?$/, '.metadata.json'));
                            _this.writeFile(outFileName, metadataText, false, undefined, undefined, [sf]);
                        }
                    }
                });
            }
            var emitEnd = Date.now();
            if (emitResult && this.options.diagnostics) {
                emitResult.diagnostics = emitResult.diagnostics.concat([util_1.createMessageDiagnostic([
                        "Emitted in " + (emitEnd - emitStart) + "ms",
                        "- " + emittedUserTsCount + " user ts files",
                        "- " + genTsFiles.length + " generated ts files",
                        "- " + (genJsonFiles.length + metadataJsonCount) + " generated json files",
                    ].join('\n'))]);
            }
            return emitResult;
        };
        Object.defineProperty(AngularCompilerProgram.prototype, "compiler", {
            // Private members
            get: function () {
                if (!this._compiler) {
                    this._createCompiler();
                }
                return this._compiler;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(AngularCompilerProgram.prototype, "hostAdapter", {
            get: function () {
                if (!this._hostAdapter) {
                    this._createCompiler();
                }
                return this._hostAdapter;
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
                var diagnostics = this._structuralDiagnostics;
                if (!diagnostics) {
                    this.initSync();
                    diagnostics = (this._structuralDiagnostics = this._structuralDiagnostics || []);
                }
                return diagnostics;
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
        Object.defineProperty(AngularCompilerProgram.prototype, "reifiedDecorators", {
            get: function () {
                if (!this._reifiedDecorators) {
                    var reflector_1 = this.compiler.reflector;
                    this._reifiedDecorators = new Set(R3_REIFIED_DECORATORS.map(function (name) { return reflector_1.findDeclaration('@angular/core', name); }));
                }
                return this._reifiedDecorators;
            },
            enumerable: true,
            configurable: true
        });
        AngularCompilerProgram.prototype.calculateTransforms = function (genFiles, partialModules, stripDecorators, customTransformers) {
            var beforeTs = [];
            var metadataTransforms = [];
            var flatModuleMetadataTransforms = [];
            if (this.options.enableResourceInlining) {
                beforeTs.push(inline_resources_1.getInlineResourcesTransformFactory(this.tsProgram, this.hostAdapter));
                var transformer = new inline_resources_1.InlineResourcesMetadataTransformer(this.hostAdapter);
                metadataTransforms.push(transformer);
                flatModuleMetadataTransforms.push(transformer);
            }
            if (!this.options.disableExpressionLowering) {
                beforeTs.push(lower_expressions_1.getExpressionLoweringTransformFactory(this.loweringMetadataTransform, this.tsProgram));
                metadataTransforms.push(this.loweringMetadataTransform);
            }
            if (genFiles) {
                beforeTs.push(node_emitter_transform_1.getAngularEmitterTransformFactory(genFiles, this.getTsProgram()));
            }
            if (partialModules) {
                beforeTs.push(r3_transform_1.getAngularClassTransformerFactory(partialModules));
                // If we have partial modules, the cached metadata might be incorrect as it doesn't reflect
                // the partial module transforms.
                var transformer = new r3_metadata_transform_1.PartialModuleMetadataTransformer(partialModules);
                metadataTransforms.push(transformer);
                flatModuleMetadataTransforms.push(transformer);
            }
            if (stripDecorators) {
                beforeTs.push(r3_strip_decorators_1.getDecoratorStripTransformerFactory(stripDecorators, this.compiler.reflector, this.getTsProgram().getTypeChecker()));
                var transformer = new r3_strip_decorators_1.StripDecoratorsMetadataTransformer(stripDecorators, this.compiler.reflector);
                metadataTransforms.push(transformer);
                flatModuleMetadataTransforms.push(transformer);
            }
            if (customTransformers && customTransformers.beforeTs) {
                beforeTs.push.apply(beforeTs, tslib_1.__spread(customTransformers.beforeTs));
            }
            if (metadataTransforms.length > 0) {
                this.metadataCache = this.createMetadataCache(metadataTransforms);
            }
            if (flatModuleMetadataTransforms.length > 0) {
                this.flatModuleMetadataCache = this.createMetadataCache(flatModuleMetadataTransforms);
            }
            var afterTs = customTransformers ? customTransformers.afterTs : undefined;
            return { before: beforeTs, after: afterTs };
        };
        AngularCompilerProgram.prototype.initSync = function () {
            if (this._analyzedModules) {
                return;
            }
            try {
                var _a = this._createProgramWithBasicStubs(), tmpProgram = _a.tmpProgram, sourceFiles = _a.sourceFiles, tsFiles = _a.tsFiles, rootNames = _a.rootNames;
                var _b = this.compiler.loadFilesSync(sourceFiles, tsFiles), analyzedModules = _b.analyzedModules, analyzedInjectables = _b.analyzedInjectables;
                this._updateProgramWithTypeCheckStubs(tmpProgram, analyzedModules, analyzedInjectables, rootNames);
            }
            catch (e) {
                this._createProgramOnError(e);
            }
        };
        AngularCompilerProgram.prototype._createCompiler = function () {
            var _this = this;
            var codegen = {
                generateFile: function (genFileName, baseFileName) {
                    return _this._compiler.emitBasicStub(genFileName, baseFileName);
                },
                findGeneratedFileNames: function (fileName) { return _this._compiler.findGeneratedFileNames(fileName); },
            };
            this._hostAdapter = new compiler_host_1.TsCompilerAotCompilerTypeCheckHostAdapter(this.rootNames, this.options, this.host, this.metadataCache, codegen, this.oldProgramLibrarySummaries);
            var aotOptions = getAotCompilerOptions(this.options);
            var errorCollector = (this.options.collectAllErrors || this.options.fullTemplateTypeCheck) ?
                function (err) { return _this._addStructuralDiagnostics(err); } :
                undefined;
            this._compiler = compiler_1.createAotCompiler(this._hostAdapter, aotOptions, errorCollector).compiler;
        };
        AngularCompilerProgram.prototype._createProgramWithBasicStubs = function () {
            var _this = this;
            if (this._analyzedModules) {
                throw new Error("Internal Error: already initialized!");
            }
            // Note: This is important to not produce a memory leak!
            var oldTsProgram = this.oldTsProgram;
            this.oldTsProgram = undefined;
            var codegen = {
                generateFile: function (genFileName, baseFileName) {
                    return _this.compiler.emitBasicStub(genFileName, baseFileName);
                },
                findGeneratedFileNames: function (fileName) { return _this.compiler.findGeneratedFileNames(fileName); },
            };
            var rootNames = tslib_1.__spread(this.rootNames);
            if (this.options.generateCodeForLibraries !== false) {
                // if we should generateCodeForLibraries, never include
                // generated files in the program as otherwise we will
                // overwrite them and typescript will report the error
                // TS5055: Cannot write file ... because it would overwrite input file.
                rootNames = rootNames.filter(function (fn) { return !util_1.GENERATED_FILES.test(fn); });
            }
            if (this.options.noResolve) {
                this.rootNames.forEach(function (rootName) {
                    if (_this.hostAdapter.shouldGenerateFilesFor(rootName)) {
                        rootNames.push.apply(rootNames, tslib_1.__spread(_this.compiler.findGeneratedFileNames(rootName)));
                    }
                });
            }
            var tmpProgram = ts.createProgram(rootNames, this.options, this.hostAdapter, oldTsProgram);
            var sourceFiles = [];
            var tsFiles = [];
            tmpProgram.getSourceFiles().forEach(function (sf) {
                if (_this.hostAdapter.isSourceFile(sf.fileName)) {
                    sourceFiles.push(sf.fileName);
                }
                if (util_1.TS.test(sf.fileName) && !util_1.DTS.test(sf.fileName)) {
                    tsFiles.push(sf.fileName);
                }
            });
            return { tmpProgram: tmpProgram, sourceFiles: sourceFiles, tsFiles: tsFiles, rootNames: rootNames };
        };
        AngularCompilerProgram.prototype._updateProgramWithTypeCheckStubs = function (tmpProgram, analyzedModules, analyzedInjectables, rootNames) {
            var _this = this;
            this._analyzedModules = analyzedModules;
            this._analyzedInjectables = analyzedInjectables;
            tmpProgram.getSourceFiles().forEach(function (sf) {
                if (sf.fileName.endsWith('.ngfactory.ts')) {
                    var _a = _this.hostAdapter.shouldGenerateFile(sf.fileName), generate = _a.generate, baseFileName = _a.baseFileName;
                    if (generate) {
                        // Note: ! is ok as hostAdapter.shouldGenerateFile will always return a baseFileName
                        // for .ngfactory.ts files.
                        var genFile = _this.compiler.emitTypeCheckStub(sf.fileName, baseFileName);
                        if (genFile) {
                            _this.hostAdapter.updateGeneratedFile(genFile);
                        }
                    }
                }
            });
            this._tsProgram = ts.createProgram(rootNames, this.options, this.hostAdapter, tmpProgram);
            // Note: the new ts program should be completely reusable by TypeScript as:
            // - we cache all the files in the hostAdapter
            // - new new stubs use the exactly same imports/exports as the old once (we assert that in
            // hostAdapter.updateGeneratedFile).
            if (util_1.tsStructureIsReused(tmpProgram) !== 2 /* Completely */) {
                throw new Error("Internal Error: The structure of the program changed during codegen.");
            }
        };
        AngularCompilerProgram.prototype._createProgramOnError = function (e) {
            // Still fill the analyzedModules and the tsProgram
            // so that we don't cause other errors for users who e.g. want to emit the ngProgram.
            this._analyzedModules = emptyModules;
            this.oldTsProgram = undefined;
            this._hostAdapter.isSourceFile = function () { return false; };
            this._tsProgram = ts.createProgram(this.rootNames, this.options, this.hostAdapter);
            if (compiler_1.isSyntaxError(e)) {
                this._addStructuralDiagnostics(e);
                return;
            }
            throw e;
        };
        AngularCompilerProgram.prototype._addStructuralDiagnostics = function (error) {
            var diagnostics = this._structuralDiagnostics || (this._structuralDiagnostics = []);
            if (compiler_1.isSyntaxError(error)) {
                diagnostics.push.apply(diagnostics, tslib_1.__spread(syntaxErrorToDiagnostics(error)));
            }
            else {
                diagnostics.push({
                    messageText: error.toString(),
                    category: ts.DiagnosticCategory.Error,
                    source: api_1.SOURCE,
                    code: api_1.DEFAULT_ERROR_CODE
                });
            }
        };
        // Note: this returns a ts.Diagnostic so that we
        // can return errors in a ts.EmitResult
        AngularCompilerProgram.prototype.generateFilesForEmit = function (emitFlags) {
            var _this = this;
            try {
                if (!(emitFlags & api_1.EmitFlags.Codegen)) {
                    return { genFiles: [], genDiags: [] };
                }
                // TODO(tbosch): allow generating files that are not in the rootDir
                // See https://github.com/angular/angular/issues/19337
                var genFiles = this.compiler.emitAllImpls(this.analyzedModules)
                    .filter(function (genFile) { return util_1.isInRootDir(genFile.genFileUrl, _this.options); });
                if (this.oldProgramEmittedGeneratedFiles) {
                    var oldProgramEmittedGeneratedFiles_1 = this.oldProgramEmittedGeneratedFiles;
                    genFiles = genFiles.filter(function (genFile) {
                        var oldGenFile = oldProgramEmittedGeneratedFiles_1.get(genFile.genFileUrl);
                        return !oldGenFile || !genFile.isEquivalent(oldGenFile);
                    });
                }
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
        /**
         * Returns undefined if all files should be emitted.
         */
        AngularCompilerProgram.prototype.getSourceFilesForEmit = function () {
            var _this = this;
            // TODO(tbosch): if one of the files contains a `const enum`
            // always emit all files -> return undefined!
            var sourceFilesToEmit = this.tsProgram.getSourceFiles().filter(function (sf) { return !sf.isDeclarationFile && !util_1.GENERATED_FILES.test(sf.fileName); });
            if (this.oldProgramEmittedSourceFiles) {
                sourceFilesToEmit = sourceFilesToEmit.filter(function (sf) {
                    var oldFile = _this.oldProgramEmittedSourceFiles.get(sf.fileName);
                    return sf !== oldFile;
                });
            }
            return sourceFilesToEmit;
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
                            // as we might need it later on for resolving module names from summaries.
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
            // This can happen as the stub calculation is not completely exact.
            // Note: sourceFile refers to the .ngfactory.ts / .ngsummary.ts file
            // node_emitter_transform already set the file contents to be empty,
            //  so this code only needs to skip the file if !allowEmptyCodegenFiles.
            var isGenerated = util_1.GENERATED_FILES.test(outFileName);
            if (isGenerated && !this.options.allowEmptyCodegenFiles &&
                (!genFile || !genFile.stmts || genFile.stmts.length === 0)) {
                return;
            }
            if (baseFile) {
                sourceFiles = sourceFiles ? tslib_1.__spread(sourceFiles, [baseFile]) : [baseFile];
            }
            // TODO: remove any when TS 2.4 support is removed.
            this.host.writeFile(outFileName, outData, writeByteOrderMark, onError, sourceFiles);
        };
        return AngularCompilerProgram;
    }());
    /**
     * Checks whether a given version ∈ [minVersion, maxVersion[
     * An error will be thrown if the following statements are simultaneously true:
     * - the given version ∉ [minVersion, maxVersion[,
     * - the result of the version check is not meant to be bypassed (the parameter disableVersionCheck
     * is false)
     *
     * @param version The version on which the check will be performed
     * @param minVersion The lower bound version. A valid version needs to be greater than minVersion
     * @param maxVersion The upper bound version. A valid version needs to be strictly less than
     * maxVersion
     * @param disableVersionCheck Indicates whether version check should be bypassed
     *
     * @throws Will throw an error if the following statements are simultaneously true:
     * - the given version ∉ [minVersion, maxVersion[,
     * - the result of the version check is not meant to be bypassed (the parameter disableVersionCheck
     * is false)
     */
    function checkVersion(version, minVersion, maxVersion, disableVersionCheck) {
        if ((typescript_version_1.compareVersions(version, minVersion) < 0 || typescript_version_1.compareVersions(version, maxVersion) >= 0) &&
            !disableVersionCheck) {
            throw new Error("The Angular Compiler requires TypeScript >=" + minVersion + " and <" + maxVersion + " but " + version + " was found instead.");
        }
    }
    exports.checkVersion = checkVersion;
    function createProgram(_a) {
        var rootNames = _a.rootNames, options = _a.options, host = _a.host, oldProgram = _a.oldProgram;
        if (options.enableIvy !== false) {
            return new program_1.NgtscProgram(rootNames, options, host, oldProgram);
        }
        else {
            return new AngularCompilerProgram(rootNames, options, host, oldProgram);
        }
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
            i18nFormat: options.i18nInFormat || options.i18nOutFormat,
            i18nUseExternalIds: options.i18nUseExternalIds, translations: translations, missingTranslation: missingTranslation,
            enableSummariesForJit: options.enableSummariesForJit,
            preserveWhitespaces: options.preserveWhitespaces,
            fullTemplateTypeCheck: options.fullTemplateTypeCheck,
            allowEmptyCodegenFiles: options.allowEmptyCodegenFiles,
            enableIvy: options.enableIvy,
            createExternalSymbolFactoryReexports: options.createExternalSymbolFactoryReexports,
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
    function normalizeSeparators(path) {
        return path.replace(/\\/g, '/');
    }
    /**
     * Returns a function that can adjust a path from source path to out path,
     * based on an existing mapping from source to out path.
     *
     * TODO(tbosch): talk to the TypeScript team to expose their logic for calculating the `rootDir`
     * if none was specified.
     *
     * Note: This function works on normalized paths from typescript but should always return
     * POSIX normalized paths for output paths.
     */
    function createSrcToOutPathMapper(outDir, sampleSrcFileName, sampleOutFileName, host) {
        if (host === void 0) { host = path; }
        if (outDir) {
            var path_1 = {}; // Ensure we error if we use `path` instead of `host`.
            if (sampleSrcFileName == null || sampleOutFileName == null) {
                throw new Error("Can't calculate the rootDir without a sample srcFileName / outFileName. ");
            }
            var srcFileDir = normalizeSeparators(host.dirname(sampleSrcFileName));
            var outFileDir = normalizeSeparators(host.dirname(sampleOutFileName));
            if (srcFileDir === outFileDir) {
                return function (srcFileName) { return srcFileName; };
            }
            // calculate the common suffix, stopping
            // at `outDir`.
            var srcDirParts = srcFileDir.split('/');
            var outDirParts = normalizeSeparators(host.relative(outDir, outFileDir)).split('/');
            var i = 0;
            while (i < Math.min(srcDirParts.length, outDirParts.length) &&
                srcDirParts[srcDirParts.length - 1 - i] === outDirParts[outDirParts.length - 1 - i])
                i++;
            var rootDir_1 = srcDirParts.slice(0, srcDirParts.length - i).join('/');
            return function (srcFileName) {
                // Note: Before we return the mapped output path, we need to normalize the path delimiters
                // because the output path is usually passed to TypeScript which sometimes only expects
                // posix normalized paths (e.g. if a custom compiler host is used)
                return normalizeSeparators(host.resolve(outDir, host.relative(rootDir_1, srcFileName)));
            };
        }
        else {
            // Note: Before we return the output path, we need to normalize the path delimiters because
            // the output path is usually passed to TypeScript which only passes around posix
            // normalized paths (e.g. if a custom compiler host is used)
            return function (srcFileName) { return normalizeSeparators(srcFileName); };
        }
    }
    exports.createSrcToOutPathMapper = createSrcToOutPathMapper;
    function i18nExtract(formatName, outFile, host, options, bundle) {
        formatName = formatName || 'xlf';
        // Checks the format and returns the extension
        var ext = i18nGetExtension(formatName);
        var content = i18nSerialize(bundle, formatName, options);
        var dstFile = outFile || "messages." + ext;
        var dstPath = path.resolve(options.outDir || options.basePath, dstFile);
        host.writeFile(dstPath, content, false, undefined, []);
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
        return bundle.write(serializer, getPathNormalizer(options.basePath));
    }
    exports.i18nSerialize = i18nSerialize;
    function getPathNormalizer(basePath) {
        // normalize source paths by removing the base path and always using "/" as a separator
        return function (sourcePath) {
            sourcePath = basePath ? path.relative(basePath, sourcePath) : sourcePath;
            return sourcePath.split(path.sep).join('/');
        };
    }
    function i18nGetExtension(formatName) {
        var format = formatName.toLowerCase();
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
    function mergeEmitResults(emitResults) {
        var e_5, _a;
        var diagnostics = [];
        var emitSkipped = false;
        var emittedFiles = [];
        try {
            for (var emitResults_1 = tslib_1.__values(emitResults), emitResults_1_1 = emitResults_1.next(); !emitResults_1_1.done; emitResults_1_1 = emitResults_1.next()) {
                var er = emitResults_1_1.value;
                diagnostics.push.apply(diagnostics, tslib_1.__spread(er.diagnostics));
                emitSkipped = emitSkipped || er.emitSkipped;
                emittedFiles.push.apply(emittedFiles, tslib_1.__spread((er.emittedFiles || [])));
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (emitResults_1_1 && !emitResults_1_1.done && (_a = emitResults_1.return)) _a.call(emitResults_1);
            }
            finally { if (e_5) throw e_5.error; }
        }
        return { diagnostics: diagnostics, emitSkipped: emitSkipped, emittedFiles: emittedFiles };
    }
    function diagnosticSourceOfSpan(span) {
        // For diagnostics, TypeScript only uses the fileName and text properties.
        // The redundant '()' are here is to avoid having clang-format breaking the line incorrectly.
        return { fileName: span.start.file.url, text: span.start.file.content };
    }
    function diagnosticSourceOfFileName(fileName, program) {
        var sourceFile = program.getSourceFile(fileName);
        if (sourceFile)
            return sourceFile;
        // If we are reporting diagnostics for a source file that is not in the project then we need
        // to fake a source file so the diagnostic formatting routines can emit the file name.
        // The redundant '()' are here is to avoid having clang-format breaking the line incorrectly.
        return { fileName: fileName, text: '' };
    }
    function diagnosticChainFromFormattedDiagnosticChain(chain) {
        return {
            messageText: chain.message,
            next: chain.next && diagnosticChainFromFormattedDiagnosticChain(chain.next),
            position: chain.position
        };
    }
    function syntaxErrorToDiagnostics(error) {
        var parserErrors = compiler_1.getParseErrors(error);
        if (parserErrors && parserErrors.length) {
            return parserErrors.map(function (e) { return ({
                messageText: e.contextualMessage(),
                file: diagnosticSourceOfSpan(e.span),
                start: e.span.start.offset,
                length: e.span.end.offset - e.span.start.offset,
                category: ts.DiagnosticCategory.Error,
                source: api_1.SOURCE,
                code: api_1.DEFAULT_ERROR_CODE
            }); });
        }
        else if (compiler_1.isFormattedError(error)) {
            return [{
                    messageText: error.message,
                    chain: error.chain && diagnosticChainFromFormattedDiagnosticChain(error.chain),
                    category: ts.DiagnosticCategory.Error,
                    source: api_1.SOURCE,
                    code: api_1.DEFAULT_ERROR_CODE,
                    position: error.position
                }];
        }
        // Produce a Diagnostic anyway since we know for sure `error` is a SyntaxError
        return [{
                messageText: error.message,
                category: ts.DiagnosticCategory.Error,
                code: api_1.DEFAULT_ERROR_CODE,
                source: api_1.SOURCE,
            }];
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3JhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL3Byb2dyYW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0E7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQXNaO0lBQ3RaLHVCQUF5QjtJQUN6QiwyQkFBNkI7SUFDN0IsK0JBQWlDO0lBRWpDLHFHQUF5RjtJQUN6RiwrRkFBa0U7SUFDbEUscUVBQXFGO0lBQ3JGLG1FQUE4QztJQUU5QyxrRUFBb1A7SUFDcFAsc0ZBQWdIO0lBQ2hILDRGQUEwRztJQUMxRyw4RkFBa0c7SUFDbEcsd0ZBQW9FO0lBQ3BFLDBGQUFpRDtJQUNqRCx3R0FBMkU7SUFDM0Usc0dBQXlFO0lBQ3pFLGtHQUE4RztJQUM5RyxvRkFBaUU7SUFDakUsb0VBQTJKO0lBRzNKOzs7T0FHRztJQUNILElBQU0sbUNBQW1DLEdBQUcsRUFBRSxDQUFDO0lBRy9DOztPQUVHO0lBQ0gsSUFBTSxZQUFZLEdBQUcsQ0FBQyxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFFOUU7O09BRUc7SUFDSCxJQUFNLGVBQWUsb0JBQU8sWUFBWSxHQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFDLENBQUM7SUFFN0UsSUFBTSxxQkFBcUIsR0FBRztRQUM1QixXQUFXO1FBQ1gsV0FBVztRQUNYLFlBQVk7UUFDWixVQUFVO1FBQ1YsTUFBTTtLQUNQLENBQUM7SUFFRixJQUFNLFlBQVksR0FBc0I7UUFDdEMsU0FBUyxFQUFFLEVBQUU7UUFDYix5QkFBeUIsRUFBRSxJQUFJLEdBQUcsRUFBRTtRQUNwQyxLQUFLLEVBQUUsRUFBRTtLQUNWLENBQUM7SUFFRixJQUFNLG1CQUFtQixHQUNyQixVQUFDLEVBQ29CO1lBRG5CLG9CQUFPLEVBQUUsc0NBQWdCLEVBQUUsd0JB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TUFBTTtnQkFDL0MsUUFBUSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLO2dCQUNyQyxNQUFNLEVBQUUsWUFBTTtnQkFDZCxJQUFJLEVBQUUsd0JBQWtCO2FBQ3pCLENBQUMsRUFSRyxDQVFILENBQUMsQ0FBQztTQUN6QzthQUFNLElBQUksMkJBQWdCLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDbEMsT0FBTyxDQUFDO29CQUNOLFdBQVcsRUFBRSxLQUFLLENBQUMsT0FBTztvQkFDMUIsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLLElBQUksMkNBQTJDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztvQkFDOUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLO29CQUNyQyxNQUFNLEVBQUUsWUFBTTtvQkFDZCxJQUFJLEVBQUUsd0JBQWtCO29CQUN4QixRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVE7aUJBQ3pCLENBQUMsQ0FBQztTQUNKO1FBQ0QsOEVBQThFO1FBQzlFLE9BQU8sQ0FBQztnQkFDTixXQUFXLEVBQUUsS0FBSyxDQUFDLE9BQU87Z0JBQzFCLFFBQVEsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSztnQkFDckMsSUFBSSxFQUFFLHdCQUFrQjtnQkFDeEIsTUFBTSxFQUFFLFlBQU07YUFDZixDQUFDLENBQUM7SUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QW90Q29tcGlsZXIsIEFvdENvbXBpbGVySG9zdCwgQW90Q29tcGlsZXJPcHRpb25zLCBFbWl0dGVyVmlzaXRvckNvbnRleHQsIEZvcm1hdHRlZE1lc3NhZ2VDaGFpbiwgR2VuZXJhdGVkRmlsZSwgTWVzc2FnZUJ1bmRsZSwgTmdBbmFseXplZEZpbGUsIE5nQW5hbHl6ZWRGaWxlV2l0aEluamVjdGFibGVzLCBOZ0FuYWx5emVkTW9kdWxlcywgUGFyc2VTb3VyY2VTcGFuLCBQYXJ0aWFsTW9kdWxlLCBQb3NpdGlvbiwgU2VyaWFsaXplciwgU3RhdGljU3ltYm9sLCBUeXBlU2NyaXB0RW1pdHRlciwgWGxpZmYsIFhsaWZmMiwgWG1iLCBjb3JlLCBjcmVhdGVBb3RDb21waWxlciwgZ2V0UGFyc2VFcnJvcnMsIGlzRm9ybWF0dGVkRXJyb3IsIGlzU3ludGF4RXJyb3J9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtUeXBlQ2hlY2tIb3N0LCB0cmFuc2xhdGVEaWFnbm9zdGljc30gZnJvbSAnLi4vZGlhZ25vc3RpY3MvdHJhbnNsYXRlX2RpYWdub3N0aWNzJztcbmltcG9ydCB7Y29tcGFyZVZlcnNpb25zfSBmcm9tICcuLi9kaWFnbm9zdGljcy90eXBlc2NyaXB0X3ZlcnNpb24nO1xuaW1wb3J0IHtNZXRhZGF0YUNvbGxlY3RvciwgTW9kdWxlTWV0YWRhdGEsIGNyZWF0ZUJ1bmRsZUluZGV4SG9zdH0gZnJvbSAnLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtOZ3RzY1Byb2dyYW19IGZyb20gJy4uL25ndHNjL3Byb2dyYW0nO1xuXG5pbXBvcnQge0NvbXBpbGVySG9zdCwgQ29tcGlsZXJPcHRpb25zLCBDdXN0b21UcmFuc2Zvcm1lcnMsIERFRkFVTFRfRVJST1JfQ09ERSwgRGlhZ25vc3RpYywgRGlhZ25vc3RpY01lc3NhZ2VDaGFpbiwgRW1pdEZsYWdzLCBMYXp5Um91dGUsIExpYnJhcnlTdW1tYXJ5LCBQcm9ncmFtLCBTT1VSQ0UsIFRzRW1pdEFyZ3VtZW50cywgVHNFbWl0Q2FsbGJhY2ssIFRzTWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge0NvZGVHZW5lcmF0b3IsIFRzQ29tcGlsZXJBb3RDb21waWxlclR5cGVDaGVja0hvc3RBZGFwdGVyLCBnZXRPcmlnaW5hbFJlZmVyZW5jZXN9IGZyb20gJy4vY29tcGlsZXJfaG9zdCc7XG5pbXBvcnQge0lubGluZVJlc291cmNlc01ldGFkYXRhVHJhbnNmb3JtZXIsIGdldElubGluZVJlc291cmNlc1RyYW5zZm9ybUZhY3Rvcnl9IGZyb20gJy4vaW5saW5lX3Jlc291cmNlcyc7XG5pbXBvcnQge0xvd2VyTWV0YWRhdGFUcmFuc2Zvcm0sIGdldEV4cHJlc3Npb25Mb3dlcmluZ1RyYW5zZm9ybUZhY3Rvcnl9IGZyb20gJy4vbG93ZXJfZXhwcmVzc2lvbnMnO1xuaW1wb3J0IHtNZXRhZGF0YUNhY2hlLCBNZXRhZGF0YVRyYW5zZm9ybWVyfSBmcm9tICcuL21ldGFkYXRhX2NhY2hlJztcbmltcG9ydCB7bm9jb2xsYXBzZUhhY2t9IGZyb20gJy4vbm9jb2xsYXBzZV9oYWNrJztcbmltcG9ydCB7Z2V0QW5ndWxhckVtaXR0ZXJUcmFuc2Zvcm1GYWN0b3J5fSBmcm9tICcuL25vZGVfZW1pdHRlcl90cmFuc2Zvcm0nO1xuaW1wb3J0IHtQYXJ0aWFsTW9kdWxlTWV0YWRhdGFUcmFuc2Zvcm1lcn0gZnJvbSAnLi9yM19tZXRhZGF0YV90cmFuc2Zvcm0nO1xuaW1wb3J0IHtTdHJpcERlY29yYXRvcnNNZXRhZGF0YVRyYW5zZm9ybWVyLCBnZXREZWNvcmF0b3JTdHJpcFRyYW5zZm9ybWVyRmFjdG9yeX0gZnJvbSAnLi9yM19zdHJpcF9kZWNvcmF0b3JzJztcbmltcG9ydCB7Z2V0QW5ndWxhckNsYXNzVHJhbnNmb3JtZXJGYWN0b3J5fSBmcm9tICcuL3IzX3RyYW5zZm9ybSc7XG5pbXBvcnQge0RUUywgR0VORVJBVEVEX0ZJTEVTLCBTdHJ1Y3R1cmVJc1JldXNlZCwgVFMsIGNyZWF0ZU1lc3NhZ2VEaWFnbm9zdGljLCBpc0luUm9vdERpciwgbmdUb1RzRGlhZ25vc3RpYywgdHNTdHJ1Y3R1cmVJc1JldXNlZCwgdXNlckVycm9yfSBmcm9tICcuL3V0aWwnO1xuXG5cbi8qKlxuICogTWF4aW11bSBudW1iZXIgb2YgZmlsZXMgdGhhdCBhcmUgZW1pdGFibGUgdmlhIGNhbGxpbmcgdHMuUHJvZ3JhbS5lbWl0XG4gKiBwYXNzaW5nIGluZGl2aWR1YWwgdGFyZ2V0U291cmNlRmlsZXMuXG4gKi9cbmNvbnN0IE1BWF9GSUxFX0NPVU5UX0ZPUl9TSU5HTEVfRklMRV9FTUlUID0gMjA7XG5cblxuLyoqXG4gKiBGaWVsZHMgdG8gbG93ZXIgd2l0aGluIG1ldGFkYXRhIGluIHJlbmRlcjIgbW9kZS5cbiAqL1xuY29uc3QgTE9XRVJfRklFTERTID0gWyd1c2VWYWx1ZScsICd1c2VGYWN0b3J5JywgJ2RhdGEnLCAnaWQnLCAnbG9hZENoaWxkcmVuJ107XG5cbi8qKlxuICogRmllbGRzIHRvIGxvd2VyIHdpdGhpbiBtZXRhZGF0YSBpbiByZW5kZXIzIG1vZGUuXG4gKi9cbmNvbnN0IFIzX0xPV0VSX0ZJRUxEUyA9IFsuLi5MT1dFUl9GSUVMRFMsICdwcm92aWRlcnMnLCAnaW1wb3J0cycsICdleHBvcnRzJ107XG5cbmNvbnN0IFIzX1JFSUZJRURfREVDT1JBVE9SUyA9IFtcbiAgJ0NvbXBvbmVudCcsXG4gICdEaXJlY3RpdmUnLFxuICAnSW5qZWN0YWJsZScsXG4gICdOZ01vZHVsZScsXG4gICdQaXBlJyxcbl07XG5cbmNvbnN0IGVtcHR5TW9kdWxlczogTmdBbmFseXplZE1vZHVsZXMgPSB7XG4gIG5nTW9kdWxlczogW10sXG4gIG5nTW9kdWxlQnlQaXBlT3JEaXJlY3RpdmU6IG5ldyBNYXAoKSxcbiAgZmlsZXM6IFtdXG59O1xuXG5jb25zdCBkZWZhdWx0RW1pdENhbGxiYWNrOiBUc0VtaXRDYWxsYmFjayA9XG4gICAgKHtwcm9ncmFtLCB0YXJnZXRTb3VyY2VGaWxlLCB3cml0ZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuLCBlbWl0T25seUR0c0ZpbGVzLFxuICAgICAgY3VzdG9tVHJhbnNmb3JtZXJzfSkgPT5cbiAgICAgICAgcHJvZ3JhbS5lbWl0KFxuICAgICAgICAgICAgdGFyZ2V0U291cmNlRmlsZSwgd3JpdGVGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbiwgZW1pdE9ubHlEdHNGaWxlcywgY3VzdG9tVHJhbnNmb3JtZXJzKTtcblxuLyoqXG4gKiBNaW5pbXVtIHN1cHBvcnRlZCBUeXBlU2NyaXB0IHZlcnNpb25cbiAqIOKIgCBzdXBwb3J0ZWQgdHlwZXNjcmlwdCB2ZXJzaW9uIHYsIHYgPj0gTUlOX1RTX1ZFUlNJT05cbiAqL1xuY29uc3QgTUlOX1RTX1ZFUlNJT04gPSAnMy40LjAnO1xuXG4vKipcbiAqIFN1cHJlbXVtIG9mIHN1cHBvcnRlZCBUeXBlU2NyaXB0IHZlcnNpb25zXG4gKiDiiIAgc3VwcG9ydGVkIHR5cGVzY3JpcHQgdmVyc2lvbiB2LCB2IDwgTUFYX1RTX1ZFUlNJT05cbiAqIE1BWF9UU19WRVJTSU9OIGlzIG5vdCBjb25zaWRlcmVkIGFzIGEgc3VwcG9ydGVkIFR5cGVTY3JpcHQgdmVyc2lvblxuICovXG5jb25zdCBNQVhfVFNfVkVSU0lPTiA9ICczLjYuMCc7XG5cbmNsYXNzIEFuZ3VsYXJDb21waWxlclByb2dyYW0gaW1wbGVtZW50cyBQcm9ncmFtIHtcbiAgcHJpdmF0ZSByb290TmFtZXM6IHN0cmluZ1tdO1xuICBwcml2YXRlIG1ldGFkYXRhQ2FjaGU6IE1ldGFkYXRhQ2FjaGU7XG4gIC8vIE1ldGFkYXRhIGNhY2hlIHVzZWQgZXhjbHVzaXZlbHkgZm9yIHRoZSBmbGF0IG1vZHVsZSBpbmRleFxuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgcHJpdmF0ZSBmbGF0TW9kdWxlTWV0YWRhdGFDYWNoZSAhOiBNZXRhZGF0YUNhY2hlO1xuICBwcml2YXRlIGxvd2VyaW5nTWV0YWRhdGFUcmFuc2Zvcm06IExvd2VyTWV0YWRhdGFUcmFuc2Zvcm07XG4gIHByaXZhdGUgb2xkUHJvZ3JhbUxpYnJhcnlTdW1tYXJpZXM6IE1hcDxzdHJpbmcsIExpYnJhcnlTdW1tYXJ5Pnx1bmRlZmluZWQ7XG4gIHByaXZhdGUgb2xkUHJvZ3JhbUVtaXR0ZWRHZW5lcmF0ZWRGaWxlczogTWFwPHN0cmluZywgR2VuZXJhdGVkRmlsZT58dW5kZWZpbmVkO1xuICBwcml2YXRlIG9sZFByb2dyYW1FbWl0dGVkU291cmNlRmlsZXM6IE1hcDxzdHJpbmcsIHRzLlNvdXJjZUZpbGU+fHVuZGVmaW5lZDtcbiAgLy8gTm90ZTogVGhpcyB3aWxsIGJlIGNsZWFyZWQgb3V0IGFzIHNvb24gYXMgd2UgY3JlYXRlIHRoZSBfdHNQcm9ncmFtXG4gIHByaXZhdGUgb2xkVHNQcm9ncmFtOiB0cy5Qcm9ncmFtfHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBlbWl0dGVkTGlicmFyeVN1bW1hcmllczogTGlicmFyeVN1bW1hcnlbXXx1bmRlZmluZWQ7XG4gIHByaXZhdGUgZW1pdHRlZEdlbmVyYXRlZEZpbGVzOiBHZW5lcmF0ZWRGaWxlW118dW5kZWZpbmVkO1xuICBwcml2YXRlIGVtaXR0ZWRTb3VyY2VGaWxlczogdHMuU291cmNlRmlsZVtdfHVuZGVmaW5lZDtcblxuICAvLyBMYXppbHkgaW5pdGlhbGl6ZWQgZmllbGRzXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwcml2YXRlIF9jb21waWxlciAhOiBBb3RDb21waWxlcjtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgX2hvc3RBZGFwdGVyICE6IFRzQ29tcGlsZXJBb3RDb21waWxlclR5cGVDaGVja0hvc3RBZGFwdGVyO1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgcHJpdmF0ZSBfdHNQcm9ncmFtICE6IHRzLlByb2dyYW07XG4gIHByaXZhdGUgX2FuYWx5emVkTW9kdWxlczogTmdBbmFseXplZE1vZHVsZXN8dW5kZWZpbmVkO1xuICBwcml2YXRlIF9hbmFseXplZEluamVjdGFibGVzOiBOZ0FuYWx5emVkRmlsZVdpdGhJbmplY3RhYmxlc1tdfHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfc3RydWN0dXJhbERpYWdub3N0aWNzOiBEaWFnbm9zdGljW118dW5kZWZpbmVkO1xuICBwcml2YXRlIF9wcm9ncmFtV2l0aFN0dWJzOiB0cy5Qcm9ncmFtfHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfb3B0aW9uc0RpYWdub3N0aWNzOiBEaWFnbm9zdGljW10gPSBbXTtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgX3JlaWZpZWREZWNvcmF0b3JzICE6IFNldDxTdGF0aWNTeW1ib2w+O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcm9vdE5hbWVzOiBSZWFkb25seUFycmF5PHN0cmluZz4sIHByaXZhdGUgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zLFxuICAgICAgcHJpdmF0ZSBob3N0OiBDb21waWxlckhvc3QsIG9sZFByb2dyYW0/OiBQcm9ncmFtKSB7XG4gICAgdGhpcy5yb290TmFtZXMgPSBbLi4ucm9vdE5hbWVzXTtcblxuICAgIGNoZWNrVmVyc2lvbih0cy52ZXJzaW9uLCBNSU5fVFNfVkVSU0lPTiwgTUFYX1RTX1ZFUlNJT04sIG9wdGlvbnMuZGlzYWJsZVR5cGVTY3JpcHRWZXJzaW9uQ2hlY2spO1xuXG4gICAgdGhpcy5vbGRUc1Byb2dyYW0gPSBvbGRQcm9ncmFtID8gb2xkUHJvZ3JhbS5nZXRUc1Byb2dyYW0oKSA6IHVuZGVmaW5lZDtcbiAgICBpZiAob2xkUHJvZ3JhbSkge1xuICAgICAgdGhpcy5vbGRQcm9ncmFtTGlicmFyeVN1bW1hcmllcyA9IG9sZFByb2dyYW0uZ2V0TGlicmFyeVN1bW1hcmllcygpO1xuICAgICAgdGhpcy5vbGRQcm9ncmFtRW1pdHRlZEdlbmVyYXRlZEZpbGVzID0gb2xkUHJvZ3JhbS5nZXRFbWl0dGVkR2VuZXJhdGVkRmlsZXMoKTtcbiAgICAgIHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRTb3VyY2VGaWxlcyA9IG9sZFByb2dyYW0uZ2V0RW1pdHRlZFNvdXJjZUZpbGVzKCk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuZmxhdE1vZHVsZU91dEZpbGUpIHtcbiAgICAgIGNvbnN0IHtob3N0OiBidW5kbGVIb3N0LCBpbmRleE5hbWUsIGVycm9yc30gPVxuICAgICAgICAgIGNyZWF0ZUJ1bmRsZUluZGV4SG9zdChvcHRpb25zLCB0aGlzLnJvb3ROYW1lcywgaG9zdCwgKCkgPT4gdGhpcy5mbGF0TW9kdWxlTWV0YWRhdGFDYWNoZSk7XG4gICAgICBpZiAoZXJyb3JzKSB7XG4gICAgICAgIHRoaXMuX29wdGlvbnNEaWFnbm9zdGljcy5wdXNoKC4uLmVycm9ycy5tYXAoZSA9PiAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IGUuY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlVGV4dDogZS5tZXNzYWdlVGV4dCBhcyBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IFNPVVJDRSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IERFRkFVTFRfRVJST1JfQ09ERVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnJvb3ROYW1lcy5wdXNoKGluZGV4TmFtZSAhKTtcbiAgICAgICAgdGhpcy5ob3N0ID0gYnVuZGxlSG9zdDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmxvd2VyaW5nTWV0YWRhdGFUcmFuc2Zvcm0gPVxuICAgICAgICBuZXcgTG93ZXJNZXRhZGF0YVRyYW5zZm9ybShvcHRpb25zLmVuYWJsZUl2eSAhPT0gZmFsc2UgPyBSM19MT1dFUl9GSUVMRFMgOiBMT1dFUl9GSUVMRFMpO1xuICAgIHRoaXMubWV0YWRhdGFDYWNoZSA9IHRoaXMuY3JlYXRlTWV0YWRhdGFDYWNoZShbdGhpcy5sb3dlcmluZ01ldGFkYXRhVHJhbnNmb3JtXSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZU1ldGFkYXRhQ2FjaGUodHJhbnNmb3JtZXJzOiBNZXRhZGF0YVRyYW5zZm9ybWVyW10pIHtcbiAgICByZXR1cm4gbmV3IE1ldGFkYXRhQ2FjaGUoXG4gICAgICAgIG5ldyBNZXRhZGF0YUNvbGxlY3Rvcih7cXVvdGVkTmFtZXM6IHRydWV9KSwgISF0aGlzLm9wdGlvbnMuc3RyaWN0TWV0YWRhdGFFbWl0LFxuICAgICAgICB0cmFuc2Zvcm1lcnMpO1xuICB9XG5cbiAgZ2V0TGlicmFyeVN1bW1hcmllcygpOiBNYXA8c3RyaW5nLCBMaWJyYXJ5U3VtbWFyeT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBNYXA8c3RyaW5nLCBMaWJyYXJ5U3VtbWFyeT4oKTtcbiAgICBpZiAodGhpcy5vbGRQcm9ncmFtTGlicmFyeVN1bW1hcmllcykge1xuICAgICAgdGhpcy5vbGRQcm9ncmFtTGlicmFyeVN1bW1hcmllcy5mb3JFYWNoKChzdW1tYXJ5LCBmaWxlTmFtZSkgPT4gcmVzdWx0LnNldChmaWxlTmFtZSwgc3VtbWFyeSkpO1xuICAgIH1cbiAgICBpZiAodGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcykge1xuICAgICAgdGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcy5mb3JFYWNoKFxuICAgICAgICAgIChzdW1tYXJ5LCBmaWxlTmFtZSkgPT4gcmVzdWx0LnNldChzdW1tYXJ5LmZpbGVOYW1lLCBzdW1tYXJ5KSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnZXRFbWl0dGVkR2VuZXJhdGVkRmlsZXMoKTogTWFwPHN0cmluZywgR2VuZXJhdGVkRmlsZT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBNYXA8c3RyaW5nLCBHZW5lcmF0ZWRGaWxlPigpO1xuICAgIGlmICh0aGlzLm9sZFByb2dyYW1FbWl0dGVkR2VuZXJhdGVkRmlsZXMpIHtcbiAgICAgIHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRHZW5lcmF0ZWRGaWxlcy5mb3JFYWNoKFxuICAgICAgICAgIChnZW5GaWxlLCBmaWxlTmFtZSkgPT4gcmVzdWx0LnNldChmaWxlTmFtZSwgZ2VuRmlsZSkpO1xuICAgIH1cbiAgICBpZiAodGhpcy5lbWl0dGVkR2VuZXJhdGVkRmlsZXMpIHtcbiAgICAgIHRoaXMuZW1pdHRlZEdlbmVyYXRlZEZpbGVzLmZvckVhY2goKGdlbkZpbGUpID0+IHJlc3VsdC5zZXQoZ2VuRmlsZS5nZW5GaWxlVXJsLCBnZW5GaWxlKSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnZXRFbWl0dGVkU291cmNlRmlsZXMoKTogTWFwPHN0cmluZywgdHMuU291cmNlRmlsZT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VGaWxlPigpO1xuICAgIGlmICh0aGlzLm9sZFByb2dyYW1FbWl0dGVkU291cmNlRmlsZXMpIHtcbiAgICAgIHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRTb3VyY2VGaWxlcy5mb3JFYWNoKChzZiwgZmlsZU5hbWUpID0+IHJlc3VsdC5zZXQoZmlsZU5hbWUsIHNmKSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmVtaXR0ZWRTb3VyY2VGaWxlcykge1xuICAgICAgdGhpcy5lbWl0dGVkU291cmNlRmlsZXMuZm9yRWFjaCgoc2YpID0+IHJlc3VsdC5zZXQoc2YuZmlsZU5hbWUsIHNmKSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnZXRUc1Byb2dyYW0oKTogdHMuUHJvZ3JhbSB7IHJldHVybiB0aGlzLnRzUHJvZ3JhbTsgfVxuXG4gIGdldFRzT3B0aW9uRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbikge1xuICAgIHJldHVybiB0aGlzLnRzUHJvZ3JhbS5nZXRPcHRpb25zRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4pO1xuICB9XG5cbiAgZ2V0TmdPcHRpb25EaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuKTogUmVhZG9ubHlBcnJheTxEaWFnbm9zdGljPiB7XG4gICAgcmV0dXJuIFsuLi50aGlzLl9vcHRpb25zRGlhZ25vc3RpY3MsIC4uLmdldE5nT3B0aW9uRGlhZ25vc3RpY3ModGhpcy5vcHRpb25zKV07XG4gIH1cblxuICBnZXRUc1N5bnRhY3RpY0RpYWdub3N0aWNzKHNvdXJjZUZpbGU/OiB0cy5Tb3VyY2VGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuKTpcbiAgICAgIFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIHJldHVybiB0aGlzLnRzUHJvZ3JhbS5nZXRTeW50YWN0aWNEaWFnbm9zdGljcyhzb3VyY2VGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbik7XG4gIH1cblxuICBnZXROZ1N0cnVjdHVyYWxEaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuKTogUmVhZG9ubHlBcnJheTxEaWFnbm9zdGljPiB7XG4gICAgcmV0dXJuIHRoaXMuc3RydWN0dXJhbERpYWdub3N0aWNzO1xuICB9XG5cbiAgZ2V0VHNTZW1hbnRpY0RpYWdub3N0aWNzKHNvdXJjZUZpbGU/OiB0cy5Tb3VyY2VGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuKTpcbiAgICAgIFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIGNvbnN0IHNvdXJjZUZpbGVzID0gc291cmNlRmlsZSA/IFtzb3VyY2VGaWxlXSA6IHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCk7XG4gICAgbGV0IGRpYWdzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBzb3VyY2VGaWxlcy5mb3JFYWNoKHNmID0+IHtcbiAgICAgIGlmICghR0VORVJBVEVEX0ZJTEVTLnRlc3Qoc2YuZmlsZU5hbWUpKSB7XG4gICAgICAgIGRpYWdzLnB1c2goLi4udGhpcy50c1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhzZiwgY2FuY2VsbGF0aW9uVG9rZW4pKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gZGlhZ3M7XG4gIH1cblxuICBnZXROZ1NlbWFudGljRGlhZ25vc3RpY3MoZmlsZU5hbWU/OiBzdHJpbmcsIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOlxuICAgICAgUmVhZG9ubHlBcnJheTxEaWFnbm9zdGljPiB7XG4gICAgbGV0IGRpYWdzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZvckVhY2goc2YgPT4ge1xuICAgICAgaWYgKEdFTkVSQVRFRF9GSUxFUy50ZXN0KHNmLmZpbGVOYW1lKSAmJiAhc2YuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgICAgZGlhZ3MucHVzaCguLi50aGlzLnRzUHJvZ3JhbS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKHNmLCBjYW5jZWxsYXRpb25Ub2tlbikpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGNvbnN0IHtuZ30gPSB0cmFuc2xhdGVEaWFnbm9zdGljcyh0aGlzLmhvc3RBZGFwdGVyLCBkaWFncyk7XG4gICAgcmV0dXJuIG5nO1xuICB9XG5cbiAgbG9hZE5nU3RydWN0dXJlQXN5bmMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuX2FuYWx5emVkTW9kdWxlcykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdBbmd1bGFyIHN0cnVjdHVyZSBhbHJlYWR5IGxvYWRlZCcpO1xuICAgIH1cbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcbiAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHt0bXBQcm9ncmFtLCBzb3VyY2VGaWxlcywgdHNGaWxlcywgcm9vdE5hbWVzfSA9IHRoaXMuX2NyZWF0ZVByb2dyYW1XaXRoQmFzaWNTdHVicygpO1xuICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLmxvYWRGaWxlc0FzeW5jKHNvdXJjZUZpbGVzLCB0c0ZpbGVzKVxuICAgICAgICAgICAgICAudGhlbigoe2FuYWx5emVkTW9kdWxlcywgYW5hbHl6ZWRJbmplY3RhYmxlc30pID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fYW5hbHl6ZWRNb2R1bGVzKSB7XG4gICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FuZ3VsYXIgc3RydWN0dXJlIGxvYWRlZCBib3RoIHN5bmNocm9ub3VzbHkgYW5kIGFzeW5jaHJvbm91c2x5Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuX3VwZGF0ZVByb2dyYW1XaXRoVHlwZUNoZWNrU3R1YnMoXG4gICAgICAgICAgICAgICAgICAgIHRtcFByb2dyYW0sIGFuYWx5emVkTW9kdWxlcywgYW5hbHl6ZWRJbmplY3RhYmxlcywgcm9vdE5hbWVzKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChlID0+IHRoaXMuX2NyZWF0ZVByb2dyYW1PbkVycm9yKGUpKTtcbiAgfVxuXG4gIGxpc3RMYXp5Um91dGVzKHJvdXRlPzogc3RyaW5nKTogTGF6eVJvdXRlW10ge1xuICAgIC8vIE5vdGU6IERvbid0IGFuYWx5emVkTW9kdWxlcyBpZiBhIHJvdXRlIGlzIGdpdmVuXG4gICAgLy8gdG8gYmUgZmFzdCBlbm91Z2guXG4gICAgcmV0dXJuIHRoaXMuY29tcGlsZXIubGlzdExhenlSb3V0ZXMocm91dGUsIHJvdXRlID8gdW5kZWZpbmVkIDogdGhpcy5hbmFseXplZE1vZHVsZXMpO1xuICB9XG5cbiAgZW1pdChwYXJhbWV0ZXJzOiB7XG4gICAgZW1pdEZsYWdzPzogRW1pdEZsYWdzLFxuICAgIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4sXG4gICAgY3VzdG9tVHJhbnNmb3JtZXJzPzogQ3VzdG9tVHJhbnNmb3JtZXJzLFxuICAgIGVtaXRDYWxsYmFjaz86IFRzRW1pdENhbGxiYWNrLFxuICAgIG1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjaz86IFRzTWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrLFxuICB9ID0ge30pOiB0cy5FbWl0UmVzdWx0IHtcbiAgICBpZiAodGhpcy5vcHRpb25zLmVuYWJsZUl2eSAhPT0gZmFsc2UpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IHJ1biBsZWdhY3kgY29tcGlsZXIgaW4gbmd0c2MgbW9kZScpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fZW1pdFJlbmRlcjIocGFyYW1ldGVycyk7XG4gIH1cblxuICBwcml2YXRlIF9lbWl0UmVuZGVyMyhcbiAgICAgIHtcbiAgICAgICAgICBlbWl0RmxhZ3MgPSBFbWl0RmxhZ3MuRGVmYXVsdCwgY2FuY2VsbGF0aW9uVG9rZW4sIGN1c3RvbVRyYW5zZm9ybWVycyxcbiAgICAgICAgICBlbWl0Q2FsbGJhY2sgPSBkZWZhdWx0RW1pdENhbGxiYWNrLCBtZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2sgPSBtZXJnZUVtaXRSZXN1bHRzLFxuICAgICAgfToge1xuICAgICAgICBlbWl0RmxhZ3M/OiBFbWl0RmxhZ3MsXG4gICAgICAgIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4sXG4gICAgICAgIGN1c3RvbVRyYW5zZm9ybWVycz86IEN1c3RvbVRyYW5zZm9ybWVycyxcbiAgICAgICAgZW1pdENhbGxiYWNrPzogVHNFbWl0Q2FsbGJhY2ssXG4gICAgICAgIG1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjaz86IFRzTWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrLFxuICAgICAgfSA9IHt9KTogdHMuRW1pdFJlc3VsdCB7XG4gICAgY29uc3QgZW1pdFN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICBpZiAoKGVtaXRGbGFncyAmIChFbWl0RmxhZ3MuSlMgfCBFbWl0RmxhZ3MuRFRTIHwgRW1pdEZsYWdzLk1ldGFkYXRhIHwgRW1pdEZsYWdzLkNvZGVnZW4pKSA9PT1cbiAgICAgICAgMCkge1xuICAgICAgcmV0dXJuIHtlbWl0U2tpcHBlZDogdHJ1ZSwgZGlhZ25vc3RpY3M6IFtdLCBlbWl0dGVkRmlsZXM6IFtdfTtcbiAgICB9XG5cbiAgICAvLyBhbmFseXplZE1vZHVsZXMgYW5kIGFuYWx5emVkSW5qZWN0YWJsZXMgYXJlIGNyZWF0ZWQgdG9nZXRoZXIuIElmIG9uZSBleGlzdHMsIHNvIGRvZXMgdGhlXG4gICAgLy8gb3RoZXIuXG4gICAgY29uc3QgbW9kdWxlcyA9XG4gICAgICAgIHRoaXMuY29tcGlsZXIuZW1pdEFsbFBhcnRpYWxNb2R1bGVzKHRoaXMuYW5hbHl6ZWRNb2R1bGVzLCB0aGlzLl9hbmFseXplZEluamVjdGFibGVzICEpO1xuXG4gICAgY29uc3Qgd3JpdGVUc0ZpbGU6IHRzLldyaXRlRmlsZUNhbGxiYWNrID1cbiAgICAgICAgKG91dEZpbGVOYW1lLCBvdXREYXRhLCB3cml0ZUJ5dGVPcmRlck1hcmssIG9uRXJyb3I/LCBzb3VyY2VGaWxlcz8pID0+IHtcbiAgICAgICAgICBjb25zdCBzb3VyY2VGaWxlID0gc291cmNlRmlsZXMgJiYgc291cmNlRmlsZXMubGVuZ3RoID09IDEgPyBzb3VyY2VGaWxlc1swXSA6IG51bGw7XG4gICAgICAgICAgbGV0IGdlbkZpbGU6IEdlbmVyYXRlZEZpbGV8dW5kZWZpbmVkO1xuICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIgJiYgc291cmNlRmlsZSAmJlxuICAgICAgICAgICAgICBUUy50ZXN0KHNvdXJjZUZpbGUuZmlsZU5hbWUpKSB7XG4gICAgICAgICAgICBvdXREYXRhID0gbm9jb2xsYXBzZUhhY2sob3V0RGF0YSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMud3JpdGVGaWxlKG91dEZpbGVOYW1lLCBvdXREYXRhLCB3cml0ZUJ5dGVPcmRlck1hcmssIG9uRXJyb3IsIHVuZGVmaW5lZCwgc291cmNlRmlsZXMpO1xuICAgICAgICB9O1xuXG4gICAgY29uc3QgZW1pdE9ubHlEdHNGaWxlcyA9IChlbWl0RmxhZ3MgJiAoRW1pdEZsYWdzLkRUUyB8IEVtaXRGbGFncy5KUykpID09IEVtaXRGbGFncy5EVFM7XG5cbiAgICBjb25zdCB0c0N1c3RvbVRyYW5zZm9ybWVycyA9IHRoaXMuY2FsY3VsYXRlVHJhbnNmb3JtcyhcbiAgICAgICAgLyogZ2VuRmlsZXMgKi8gdW5kZWZpbmVkLCAvKiBwYXJ0aWFsTW9kdWxlcyAqLyBtb2R1bGVzLFxuICAgICAgICAvKiBzdHJpcERlY29yYXRvcnMgKi8gdGhpcy5yZWlmaWVkRGVjb3JhdG9ycywgY3VzdG9tVHJhbnNmb3JtZXJzKTtcblxuXG4gICAgLy8gUmVzdG9yZSB0aGUgb3JpZ2luYWwgcmVmZXJlbmNlcyBiZWZvcmUgd2UgZW1pdCBzbyBUeXBlU2NyaXB0IGRvZXNuJ3QgZW1pdFxuICAgIC8vIGEgcmVmZXJlbmNlIHRvIHRoZSAuZC50cyBmaWxlLlxuICAgIGNvbnN0IGF1Z21lbnRlZFJlZmVyZW5jZXMgPSBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIFJlYWRvbmx5QXJyYXk8dHMuRmlsZVJlZmVyZW5jZT4+KCk7XG4gICAgZm9yIChjb25zdCBzb3VyY2VGaWxlIG9mIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGNvbnN0IG9yaWdpbmFsUmVmZXJlbmNlcyA9IGdldE9yaWdpbmFsUmVmZXJlbmNlcyhzb3VyY2VGaWxlKTtcbiAgICAgIGlmIChvcmlnaW5hbFJlZmVyZW5jZXMpIHtcbiAgICAgICAgYXVnbWVudGVkUmVmZXJlbmNlcy5zZXQoc291cmNlRmlsZSwgc291cmNlRmlsZS5yZWZlcmVuY2VkRmlsZXMpO1xuICAgICAgICBzb3VyY2VGaWxlLnJlZmVyZW5jZWRGaWxlcyA9IG9yaWdpbmFsUmVmZXJlbmNlcztcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGVtaXRDYWxsYmFjayh7XG4gICAgICAgIHByb2dyYW06IHRoaXMudHNQcm9ncmFtLFxuICAgICAgICBob3N0OiB0aGlzLmhvc3QsXG4gICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgd3JpdGVGaWxlOiB3cml0ZVRzRmlsZSwgZW1pdE9ubHlEdHNGaWxlcyxcbiAgICAgICAgY3VzdG9tVHJhbnNmb3JtZXJzOiB0c0N1c3RvbVRyYW5zZm9ybWVyc1xuICAgICAgfSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIC8vIFJlc3RvcmUgdGhlIHJlZmVyZW5jZXMgYmFjayB0byB0aGUgYXVnbWVudGVkIHZhbHVlIHRvIGVuc3VyZSB0aGF0IHRoZVxuICAgICAgLy8gY2hlY2tzIHRoYXQgVHlwZVNjcmlwdCBtYWtlcyBmb3IgcHJvamVjdCBzdHJ1Y3R1cmUgcmV1c2Ugd2lsbCBzdWNjZWVkLlxuICAgICAgZm9yIChjb25zdCBbc291cmNlRmlsZSwgcmVmZXJlbmNlc10gb2YgQXJyYXkuZnJvbShhdWdtZW50ZWRSZWZlcmVuY2VzKSkge1xuICAgICAgICAvLyBUT0RPKGNodWNraik6IFJlbW92ZSBhbnkgY2FzdCBhZnRlciB1cGRhdGluZyBidWlsZCB0byAyLjZcbiAgICAgICAgKHNvdXJjZUZpbGUgYXMgYW55KS5yZWZlcmVuY2VkRmlsZXMgPSByZWZlcmVuY2VzO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2VtaXRSZW5kZXIyKFxuICAgICAge1xuICAgICAgICAgIGVtaXRGbGFncyA9IEVtaXRGbGFncy5EZWZhdWx0LCBjYW5jZWxsYXRpb25Ub2tlbiwgY3VzdG9tVHJhbnNmb3JtZXJzLFxuICAgICAgICAgIGVtaXRDYWxsYmFjayA9IGRlZmF1bHRFbWl0Q2FsbGJhY2ssIG1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjayA9IG1lcmdlRW1pdFJlc3VsdHMsXG4gICAgICB9OiB7XG4gICAgICAgIGVtaXRGbGFncz86IEVtaXRGbGFncyxcbiAgICAgICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbixcbiAgICAgICAgY3VzdG9tVHJhbnNmb3JtZXJzPzogQ3VzdG9tVHJhbnNmb3JtZXJzLFxuICAgICAgICBlbWl0Q2FsbGJhY2s/OiBUc0VtaXRDYWxsYmFjayxcbiAgICAgICAgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrPzogVHNNZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2ssXG4gICAgICB9ID0ge30pOiB0cy5FbWl0UmVzdWx0IHtcbiAgICBjb25zdCBlbWl0U3RhcnQgPSBEYXRlLm5vdygpO1xuICAgIGlmIChlbWl0RmxhZ3MgJiBFbWl0RmxhZ3MuSTE4bkJ1bmRsZSkge1xuICAgICAgY29uc3QgbG9jYWxlID0gdGhpcy5vcHRpb25zLmkxOG5PdXRMb2NhbGUgfHwgbnVsbDtcbiAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLm9wdGlvbnMuaTE4bk91dEZpbGUgfHwgbnVsbDtcbiAgICAgIGNvbnN0IGZvcm1hdCA9IHRoaXMub3B0aW9ucy5pMThuT3V0Rm9ybWF0IHx8IG51bGw7XG4gICAgICBjb25zdCBidW5kbGUgPSB0aGlzLmNvbXBpbGVyLmVtaXRNZXNzYWdlQnVuZGxlKHRoaXMuYW5hbHl6ZWRNb2R1bGVzLCBsb2NhbGUpO1xuICAgICAgaTE4bkV4dHJhY3QoZm9ybWF0LCBmaWxlLCB0aGlzLmhvc3QsIHRoaXMub3B0aW9ucywgYnVuZGxlKTtcbiAgICB9XG4gICAgaWYgKChlbWl0RmxhZ3MgJiAoRW1pdEZsYWdzLkpTIHwgRW1pdEZsYWdzLkRUUyB8IEVtaXRGbGFncy5NZXRhZGF0YSB8IEVtaXRGbGFncy5Db2RlZ2VuKSkgPT09XG4gICAgICAgIDApIHtcbiAgICAgIHJldHVybiB7ZW1pdFNraXBwZWQ6IHRydWUsIGRpYWdub3N0aWNzOiBbXSwgZW1pdHRlZEZpbGVzOiBbXX07XG4gICAgfVxuICAgIGxldCB7Z2VuRmlsZXMsIGdlbkRpYWdzfSA9IHRoaXMuZ2VuZXJhdGVGaWxlc0ZvckVtaXQoZW1pdEZsYWdzKTtcbiAgICBpZiAoZ2VuRGlhZ3MubGVuZ3RoKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBkaWFnbm9zdGljczogZ2VuRGlhZ3MsXG4gICAgICAgIGVtaXRTa2lwcGVkOiB0cnVlLFxuICAgICAgICBlbWl0dGVkRmlsZXM6IFtdLFxuICAgICAgfTtcbiAgICB9XG4gICAgdGhpcy5lbWl0dGVkR2VuZXJhdGVkRmlsZXMgPSBnZW5GaWxlcztcbiAgICBjb25zdCBvdXRTcmNNYXBwaW5nOiBBcnJheTx7c291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgb3V0RmlsZU5hbWU6IHN0cmluZ30+ID0gW107XG4gICAgY29uc3QgZ2VuRmlsZUJ5RmlsZU5hbWUgPSBuZXcgTWFwPHN0cmluZywgR2VuZXJhdGVkRmlsZT4oKTtcbiAgICBnZW5GaWxlcy5mb3JFYWNoKGdlbkZpbGUgPT4gZ2VuRmlsZUJ5RmlsZU5hbWUuc2V0KGdlbkZpbGUuZ2VuRmlsZVVybCwgZ2VuRmlsZSkpO1xuICAgIHRoaXMuZW1pdHRlZExpYnJhcnlTdW1tYXJpZXMgPSBbXTtcbiAgICBjb25zdCBlbWl0dGVkU291cmNlRmlsZXMgPSBbXSBhcyB0cy5Tb3VyY2VGaWxlW107XG4gICAgY29uc3Qgd3JpdGVUc0ZpbGU6IHRzLldyaXRlRmlsZUNhbGxiYWNrID1cbiAgICAgICAgKG91dEZpbGVOYW1lLCBvdXREYXRhLCB3cml0ZUJ5dGVPcmRlck1hcmssIG9uRXJyb3I/LCBzb3VyY2VGaWxlcz8pID0+IHtcbiAgICAgICAgICBjb25zdCBzb3VyY2VGaWxlID0gc291cmNlRmlsZXMgJiYgc291cmNlRmlsZXMubGVuZ3RoID09IDEgPyBzb3VyY2VGaWxlc1swXSA6IG51bGw7XG4gICAgICAgICAgbGV0IGdlbkZpbGU6IEdlbmVyYXRlZEZpbGV8dW5kZWZpbmVkO1xuICAgICAgICAgIGlmIChzb3VyY2VGaWxlKSB7XG4gICAgICAgICAgICBvdXRTcmNNYXBwaW5nLnB1c2goe291dEZpbGVOYW1lOiBvdXRGaWxlTmFtZSwgc291cmNlRmlsZX0pO1xuICAgICAgICAgICAgZ2VuRmlsZSA9IGdlbkZpbGVCeUZpbGVOYW1lLmdldChzb3VyY2VGaWxlLmZpbGVOYW1lKTtcbiAgICAgICAgICAgIGlmICghc291cmNlRmlsZS5pc0RlY2xhcmF0aW9uRmlsZSAmJiAhR0VORVJBVEVEX0ZJTEVTLnRlc3Qoc291cmNlRmlsZS5maWxlTmFtZSkpIHtcbiAgICAgICAgICAgICAgLy8gTm90ZTogc291cmNlRmlsZSBpcyB0aGUgdHJhbnNmb3JtZWQgc291cmNlZmlsZSwgbm90IHRoZSBvcmlnaW5hbCBvbmUhXG4gICAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsRmlsZSA9IHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGUoc291cmNlRmlsZS5maWxlTmFtZSk7XG4gICAgICAgICAgICAgIGlmIChvcmlnaW5hbEZpbGUpIHtcbiAgICAgICAgICAgICAgICBlbWl0dGVkU291cmNlRmlsZXMucHVzaChvcmlnaW5hbEZpbGUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyICYmIFRTLnRlc3Qoc291cmNlRmlsZS5maWxlTmFtZSkpIHtcbiAgICAgICAgICAgICAgb3V0RGF0YSA9IG5vY29sbGFwc2VIYWNrKG91dERhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLndyaXRlRmlsZShvdXRGaWxlTmFtZSwgb3V0RGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCBnZW5GaWxlLCBzb3VyY2VGaWxlcyk7XG4gICAgICAgIH07XG5cbiAgICBjb25zdCBtb2R1bGVzID0gdGhpcy5fYW5hbHl6ZWRJbmplY3RhYmxlcyAmJlxuICAgICAgICB0aGlzLmNvbXBpbGVyLmVtaXRBbGxQYXJ0aWFsTW9kdWxlczIodGhpcy5fYW5hbHl6ZWRJbmplY3RhYmxlcyk7XG5cbiAgICBjb25zdCB0c0N1c3RvbVRyYW5zZm9ybWVycyA9IHRoaXMuY2FsY3VsYXRlVHJhbnNmb3JtcyhcbiAgICAgICAgZ2VuRmlsZUJ5RmlsZU5hbWUsIG1vZHVsZXMsIC8qIHN0cmlwRGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsIGN1c3RvbVRyYW5zZm9ybWVycyk7XG4gICAgY29uc3QgZW1pdE9ubHlEdHNGaWxlcyA9IChlbWl0RmxhZ3MgJiAoRW1pdEZsYWdzLkRUUyB8IEVtaXRGbGFncy5KUykpID09IEVtaXRGbGFncy5EVFM7XG4gICAgLy8gUmVzdG9yZSB0aGUgb3JpZ2luYWwgcmVmZXJlbmNlcyBiZWZvcmUgd2UgZW1pdCBzbyBUeXBlU2NyaXB0IGRvZXNuJ3QgZW1pdFxuICAgIC8vIGEgcmVmZXJlbmNlIHRvIHRoZSAuZC50cyBmaWxlLlxuICAgIGNvbnN0IGF1Z21lbnRlZFJlZmVyZW5jZXMgPSBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIFJlYWRvbmx5QXJyYXk8dHMuRmlsZVJlZmVyZW5jZT4+KCk7XG4gICAgZm9yIChjb25zdCBzb3VyY2VGaWxlIG9mIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGNvbnN0IG9yaWdpbmFsUmVmZXJlbmNlcyA9IGdldE9yaWdpbmFsUmVmZXJlbmNlcyhzb3VyY2VGaWxlKTtcbiAgICAgIGlmIChvcmlnaW5hbFJlZmVyZW5jZXMpIHtcbiAgICAgICAgYXVnbWVudGVkUmVmZXJlbmNlcy5zZXQoc291cmNlRmlsZSwgc291cmNlRmlsZS5yZWZlcmVuY2VkRmlsZXMpO1xuICAgICAgICBzb3VyY2VGaWxlLnJlZmVyZW5jZWRGaWxlcyA9IG9yaWdpbmFsUmVmZXJlbmNlcztcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgZ2VuVHNGaWxlczogR2VuZXJhdGVkRmlsZVtdID0gW107XG4gICAgY29uc3QgZ2VuSnNvbkZpbGVzOiBHZW5lcmF0ZWRGaWxlW10gPSBbXTtcbiAgICBnZW5GaWxlcy5mb3JFYWNoKGdmID0+IHtcbiAgICAgIGlmIChnZi5zdG10cykge1xuICAgICAgICBnZW5Uc0ZpbGVzLnB1c2goZ2YpO1xuICAgICAgfVxuICAgICAgaWYgKGdmLnNvdXJjZSkge1xuICAgICAgICBnZW5Kc29uRmlsZXMucHVzaChnZik7XG4gICAgICB9XG4gICAgfSk7XG4gICAgbGV0IGVtaXRSZXN1bHQ6IHRzLkVtaXRSZXN1bHQ7XG4gICAgbGV0IGVtaXR0ZWRVc2VyVHNDb3VudDogbnVtYmVyO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzb3VyY2VGaWxlc1RvRW1pdCA9IHRoaXMuZ2V0U291cmNlRmlsZXNGb3JFbWl0KCk7XG4gICAgICBpZiAoc291cmNlRmlsZXNUb0VtaXQgJiZcbiAgICAgICAgICAoc291cmNlRmlsZXNUb0VtaXQubGVuZ3RoICsgZ2VuVHNGaWxlcy5sZW5ndGgpIDwgTUFYX0ZJTEVfQ09VTlRfRk9SX1NJTkdMRV9GSUxFX0VNSVQpIHtcbiAgICAgICAgY29uc3QgZmlsZU5hbWVzVG9FbWl0ID1cbiAgICAgICAgICAgIFsuLi5zb3VyY2VGaWxlc1RvRW1pdC5tYXAoc2YgPT4gc2YuZmlsZU5hbWUpLCAuLi5nZW5Uc0ZpbGVzLm1hcChnZiA9PiBnZi5nZW5GaWxlVXJsKV07XG4gICAgICAgIGVtaXRSZXN1bHQgPSBtZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2soXG4gICAgICAgICAgICBmaWxlTmFtZXNUb0VtaXQubWFwKChmaWxlTmFtZSkgPT4gZW1pdFJlc3VsdCA9IGVtaXRDYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3JhbTogdGhpcy50c1Byb2dyYW0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaG9zdDogdGhpcy5ob3N0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cml0ZUZpbGU6IHdyaXRlVHNGaWxlLCBlbWl0T25seUR0c0ZpbGVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbVRyYW5zZm9ybWVyczogdHNDdXN0b21UcmFuc2Zvcm1lcnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0U291cmNlRmlsZTogdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZShmaWxlTmFtZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKSk7XG4gICAgICAgIGVtaXR0ZWRVc2VyVHNDb3VudCA9IHNvdXJjZUZpbGVzVG9FbWl0Lmxlbmd0aDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVtaXRSZXN1bHQgPSBlbWl0Q2FsbGJhY2soe1xuICAgICAgICAgIHByb2dyYW06IHRoaXMudHNQcm9ncmFtLFxuICAgICAgICAgIGhvc3Q6IHRoaXMuaG9zdCxcbiAgICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICAgICAgd3JpdGVGaWxlOiB3cml0ZVRzRmlsZSwgZW1pdE9ubHlEdHNGaWxlcyxcbiAgICAgICAgICBjdXN0b21UcmFuc2Zvcm1lcnM6IHRzQ3VzdG9tVHJhbnNmb3JtZXJzXG4gICAgICAgIH0pO1xuICAgICAgICBlbWl0dGVkVXNlclRzQ291bnQgPSB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmxlbmd0aCAtIGdlblRzRmlsZXMubGVuZ3RoO1xuICAgICAgfVxuICAgIH0gZmluYWxseSB7XG4gICAgICAvLyBSZXN0b3JlIHRoZSByZWZlcmVuY2VzIGJhY2sgdG8gdGhlIGF1Z21lbnRlZCB2YWx1ZSB0byBlbnN1cmUgdGhhdCB0aGVcbiAgICAgIC8vIGNoZWNrcyB0aGF0IFR5cGVTY3JpcHQgbWFrZXMgZm9yIHByb2plY3Qgc3RydWN0dXJlIHJldXNlIHdpbGwgc3VjY2VlZC5cbiAgICAgIGZvciAoY29uc3QgW3NvdXJjZUZpbGUsIHJlZmVyZW5jZXNdIG9mIEFycmF5LmZyb20oYXVnbWVudGVkUmVmZXJlbmNlcykpIHtcbiAgICAgICAgLy8gVE9ETyhjaHVja2opOiBSZW1vdmUgYW55IGNhc3QgYWZ0ZXIgdXBkYXRpbmcgYnVpbGQgdG8gMi42XG4gICAgICAgIChzb3VyY2VGaWxlIGFzIGFueSkucmVmZXJlbmNlZEZpbGVzID0gcmVmZXJlbmNlcztcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5lbWl0dGVkU291cmNlRmlsZXMgPSBlbWl0dGVkU291cmNlRmlsZXM7XG5cbiAgICAvLyBNYXRjaCBiZWhhdmlvciBvZiB0c2M6IG9ubHkgcHJvZHVjZSBlbWl0IGRpYWdub3N0aWNzIGlmIGl0IHdvdWxkIGJsb2NrXG4gICAgLy8gZW1pdC4gSWYgbm9FbWl0T25FcnJvciBpcyBmYWxzZSwgdGhlIGVtaXQgd2lsbCBoYXBwZW4gaW4gc3BpdGUgb2YgYW55XG4gICAgLy8gZXJyb3JzLCBzbyB3ZSBzaG91bGQgbm90IHJlcG9ydCB0aGVtLlxuICAgIGlmIChlbWl0UmVzdWx0ICYmIHRoaXMub3B0aW9ucy5ub0VtaXRPbkVycm9yID09PSB0cnVlKSB7XG4gICAgICAvLyB0cmFuc2xhdGUgdGhlIGRpYWdub3N0aWNzIGluIHRoZSBlbWl0UmVzdWx0IGFzIHdlbGwuXG4gICAgICBjb25zdCB0cmFuc2xhdGVkRW1pdERpYWdzID0gdHJhbnNsYXRlRGlhZ25vc3RpY3ModGhpcy5ob3N0QWRhcHRlciwgZW1pdFJlc3VsdC5kaWFnbm9zdGljcyk7XG4gICAgICBlbWl0UmVzdWx0LmRpYWdub3N0aWNzID0gdHJhbnNsYXRlZEVtaXREaWFncy50cy5jb25jYXQoXG4gICAgICAgICAgdGhpcy5zdHJ1Y3R1cmFsRGlhZ25vc3RpY3MuY29uY2F0KHRyYW5zbGF0ZWRFbWl0RGlhZ3MubmcpLm1hcChuZ1RvVHNEaWFnbm9zdGljKSk7XG4gICAgfVxuXG4gICAgaWYgKGVtaXRSZXN1bHQgJiYgIW91dFNyY01hcHBpbmcubGVuZ3RoKSB7XG4gICAgICAvLyBpZiBubyBmaWxlcyB3ZXJlIGVtaXR0ZWQgYnkgVHlwZVNjcmlwdCwgYWxzbyBkb24ndCBlbWl0IC5qc29uIGZpbGVzXG4gICAgICBlbWl0UmVzdWx0LmRpYWdub3N0aWNzID1cbiAgICAgICAgICBlbWl0UmVzdWx0LmRpYWdub3N0aWNzLmNvbmNhdChbY3JlYXRlTWVzc2FnZURpYWdub3N0aWMoYEVtaXR0ZWQgbm8gZmlsZXMuYCldKTtcbiAgICAgIHJldHVybiBlbWl0UmVzdWx0O1xuICAgIH1cblxuICAgIGxldCBzYW1wbGVTcmNGaWxlTmFtZTogc3RyaW5nfHVuZGVmaW5lZDtcbiAgICBsZXQgc2FtcGxlT3V0RmlsZU5hbWU6IHN0cmluZ3x1bmRlZmluZWQ7XG4gICAgaWYgKG91dFNyY01hcHBpbmcubGVuZ3RoKSB7XG4gICAgICBzYW1wbGVTcmNGaWxlTmFtZSA9IG91dFNyY01hcHBpbmdbMF0uc291cmNlRmlsZS5maWxlTmFtZTtcbiAgICAgIHNhbXBsZU91dEZpbGVOYW1lID0gb3V0U3JjTWFwcGluZ1swXS5vdXRGaWxlTmFtZTtcbiAgICB9XG4gICAgY29uc3Qgc3JjVG9PdXRQYXRoID1cbiAgICAgICAgY3JlYXRlU3JjVG9PdXRQYXRoTWFwcGVyKHRoaXMub3B0aW9ucy5vdXREaXIsIHNhbXBsZVNyY0ZpbGVOYW1lLCBzYW1wbGVPdXRGaWxlTmFtZSk7XG4gICAgaWYgKGVtaXRGbGFncyAmIEVtaXRGbGFncy5Db2RlZ2VuKSB7XG4gICAgICBnZW5Kc29uRmlsZXMuZm9yRWFjaChnZiA9PiB7XG4gICAgICAgIGNvbnN0IG91dEZpbGVOYW1lID0gc3JjVG9PdXRQYXRoKGdmLmdlbkZpbGVVcmwpO1xuICAgICAgICB0aGlzLndyaXRlRmlsZShvdXRGaWxlTmFtZSwgZ2Yuc291cmNlICEsIGZhbHNlLCB1bmRlZmluZWQsIGdmKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBsZXQgbWV0YWRhdGFKc29uQ291bnQgPSAwO1xuICAgIGlmIChlbWl0RmxhZ3MgJiBFbWl0RmxhZ3MuTWV0YWRhdGEpIHtcbiAgICAgIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZm9yRWFjaChzZiA9PiB7XG4gICAgICAgIGlmICghc2YuaXNEZWNsYXJhdGlvbkZpbGUgJiYgIUdFTkVSQVRFRF9GSUxFUy50ZXN0KHNmLmZpbGVOYW1lKSkge1xuICAgICAgICAgIG1ldGFkYXRhSnNvbkNvdW50Kys7XG4gICAgICAgICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLm1ldGFkYXRhQ2FjaGUuZ2V0TWV0YWRhdGEoc2YpO1xuICAgICAgICAgIGlmIChtZXRhZGF0YSkge1xuICAgICAgICAgICAgY29uc3QgbWV0YWRhdGFUZXh0ID0gSlNPTi5zdHJpbmdpZnkoW21ldGFkYXRhXSk7XG4gICAgICAgICAgICBjb25zdCBvdXRGaWxlTmFtZSA9IHNyY1RvT3V0UGF0aChzZi5maWxlTmFtZS5yZXBsYWNlKC9cXC50c3g/JC8sICcubWV0YWRhdGEuanNvbicpKTtcbiAgICAgICAgICAgIHRoaXMud3JpdGVGaWxlKG91dEZpbGVOYW1lLCBtZXRhZGF0YVRleHQsIGZhbHNlLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgW3NmXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgY29uc3QgZW1pdEVuZCA9IERhdGUubm93KCk7XG4gICAgaWYgKGVtaXRSZXN1bHQgJiYgdGhpcy5vcHRpb25zLmRpYWdub3N0aWNzKSB7XG4gICAgICBlbWl0UmVzdWx0LmRpYWdub3N0aWNzID0gZW1pdFJlc3VsdC5kaWFnbm9zdGljcy5jb25jYXQoW2NyZWF0ZU1lc3NhZ2VEaWFnbm9zdGljKFtcbiAgICAgICAgYEVtaXR0ZWQgaW4gJHtlbWl0RW5kIC0gZW1pdFN0YXJ0fW1zYCxcbiAgICAgICAgYC0gJHtlbWl0dGVkVXNlclRzQ291bnR9IHVzZXIgdHMgZmlsZXNgLFxuICAgICAgICBgLSAke2dlblRzRmlsZXMubGVuZ3RofSBnZW5lcmF0ZWQgdHMgZmlsZXNgLFxuICAgICAgICBgLSAke2dlbkpzb25GaWxlcy5sZW5ndGggKyBtZXRhZGF0YUpzb25Db3VudH0gZ2VuZXJhdGVkIGpzb24gZmlsZXNgLFxuICAgICAgXS5qb2luKCdcXG4nKSldKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZW1pdFJlc3VsdDtcbiAgfVxuXG4gIC8vIFByaXZhdGUgbWVtYmVyc1xuICBwcml2YXRlIGdldCBjb21waWxlcigpOiBBb3RDb21waWxlciB7XG4gICAgaWYgKCF0aGlzLl9jb21waWxlcikge1xuICAgICAgdGhpcy5fY3JlYXRlQ29tcGlsZXIoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2NvbXBpbGVyICE7XG4gIH1cblxuICBwcml2YXRlIGdldCBob3N0QWRhcHRlcigpOiBUc0NvbXBpbGVyQW90Q29tcGlsZXJUeXBlQ2hlY2tIb3N0QWRhcHRlciB7XG4gICAgaWYgKCF0aGlzLl9ob3N0QWRhcHRlcikge1xuICAgICAgdGhpcy5fY3JlYXRlQ29tcGlsZXIoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2hvc3RBZGFwdGVyICE7XG4gIH1cblxuICBwcml2YXRlIGdldCBhbmFseXplZE1vZHVsZXMoKTogTmdBbmFseXplZE1vZHVsZXMge1xuICAgIGlmICghdGhpcy5fYW5hbHl6ZWRNb2R1bGVzKSB7XG4gICAgICB0aGlzLmluaXRTeW5jKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9hbmFseXplZE1vZHVsZXMgITtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0IHN0cnVjdHVyYWxEaWFnbm9zdGljcygpOiBSZWFkb25seUFycmF5PERpYWdub3N0aWM+IHtcbiAgICBsZXQgZGlhZ25vc3RpY3MgPSB0aGlzLl9zdHJ1Y3R1cmFsRGlhZ25vc3RpY3M7XG4gICAgaWYgKCFkaWFnbm9zdGljcykge1xuICAgICAgdGhpcy5pbml0U3luYygpO1xuICAgICAgZGlhZ25vc3RpY3MgPSAodGhpcy5fc3RydWN0dXJhbERpYWdub3N0aWNzID0gdGhpcy5fc3RydWN0dXJhbERpYWdub3N0aWNzIHx8IFtdKTtcbiAgICB9XG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgdHNQcm9ncmFtKCk6IHRzLlByb2dyYW0ge1xuICAgIGlmICghdGhpcy5fdHNQcm9ncmFtKSB7XG4gICAgICB0aGlzLmluaXRTeW5jKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl90c1Byb2dyYW0gITtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0IHJlaWZpZWREZWNvcmF0b3JzKCk6IFNldDxTdGF0aWNTeW1ib2w+IHtcbiAgICBpZiAoIXRoaXMuX3JlaWZpZWREZWNvcmF0b3JzKSB7XG4gICAgICBjb25zdCByZWZsZWN0b3IgPSB0aGlzLmNvbXBpbGVyLnJlZmxlY3RvcjtcbiAgICAgIHRoaXMuX3JlaWZpZWREZWNvcmF0b3JzID0gbmV3IFNldChcbiAgICAgICAgICBSM19SRUlGSUVEX0RFQ09SQVRPUlMubWFwKG5hbWUgPT4gcmVmbGVjdG9yLmZpbmREZWNsYXJhdGlvbignQGFuZ3VsYXIvY29yZScsIG5hbWUpKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9yZWlmaWVkRGVjb3JhdG9ycztcbiAgfVxuXG4gIHByaXZhdGUgY2FsY3VsYXRlVHJhbnNmb3JtcyhcbiAgICAgIGdlbkZpbGVzOiBNYXA8c3RyaW5nLCBHZW5lcmF0ZWRGaWxlPnx1bmRlZmluZWQsIHBhcnRpYWxNb2R1bGVzOiBQYXJ0aWFsTW9kdWxlW118dW5kZWZpbmVkLFxuICAgICAgc3RyaXBEZWNvcmF0b3JzOiBTZXQ8U3RhdGljU3ltYm9sPnx1bmRlZmluZWQsXG4gICAgICBjdXN0b21UcmFuc2Zvcm1lcnM/OiBDdXN0b21UcmFuc2Zvcm1lcnMpOiB0cy5DdXN0b21UcmFuc2Zvcm1lcnMge1xuICAgIGNvbnN0IGJlZm9yZVRzOiBBcnJheTx0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT4+ID0gW107XG4gICAgY29uc3QgbWV0YWRhdGFUcmFuc2Zvcm1zOiBNZXRhZGF0YVRyYW5zZm9ybWVyW10gPSBbXTtcbiAgICBjb25zdCBmbGF0TW9kdWxlTWV0YWRhdGFUcmFuc2Zvcm1zOiBNZXRhZGF0YVRyYW5zZm9ybWVyW10gPSBbXTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmVuYWJsZVJlc291cmNlSW5saW5pbmcpIHtcbiAgICAgIGJlZm9yZVRzLnB1c2goZ2V0SW5saW5lUmVzb3VyY2VzVHJhbnNmb3JtRmFjdG9yeSh0aGlzLnRzUHJvZ3JhbSwgdGhpcy5ob3N0QWRhcHRlcikpO1xuICAgICAgY29uc3QgdHJhbnNmb3JtZXIgPSBuZXcgSW5saW5lUmVzb3VyY2VzTWV0YWRhdGFUcmFuc2Zvcm1lcih0aGlzLmhvc3RBZGFwdGVyKTtcbiAgICAgIG1ldGFkYXRhVHJhbnNmb3Jtcy5wdXNoKHRyYW5zZm9ybWVyKTtcbiAgICAgIGZsYXRNb2R1bGVNZXRhZGF0YVRyYW5zZm9ybXMucHVzaCh0cmFuc2Zvcm1lcik7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuZGlzYWJsZUV4cHJlc3Npb25Mb3dlcmluZykge1xuICAgICAgYmVmb3JlVHMucHVzaChcbiAgICAgICAgICBnZXRFeHByZXNzaW9uTG93ZXJpbmdUcmFuc2Zvcm1GYWN0b3J5KHRoaXMubG93ZXJpbmdNZXRhZGF0YVRyYW5zZm9ybSwgdGhpcy50c1Byb2dyYW0pKTtcbiAgICAgIG1ldGFkYXRhVHJhbnNmb3Jtcy5wdXNoKHRoaXMubG93ZXJpbmdNZXRhZGF0YVRyYW5zZm9ybSk7XG4gICAgfVxuICAgIGlmIChnZW5GaWxlcykge1xuICAgICAgYmVmb3JlVHMucHVzaChnZXRBbmd1bGFyRW1pdHRlclRyYW5zZm9ybUZhY3RvcnkoZ2VuRmlsZXMsIHRoaXMuZ2V0VHNQcm9ncmFtKCkpKTtcbiAgICB9XG4gICAgaWYgKHBhcnRpYWxNb2R1bGVzKSB7XG4gICAgICBiZWZvcmVUcy5wdXNoKGdldEFuZ3VsYXJDbGFzc1RyYW5zZm9ybWVyRmFjdG9yeShwYXJ0aWFsTW9kdWxlcykpO1xuXG4gICAgICAvLyBJZiB3ZSBoYXZlIHBhcnRpYWwgbW9kdWxlcywgdGhlIGNhY2hlZCBtZXRhZGF0YSBtaWdodCBiZSBpbmNvcnJlY3QgYXMgaXQgZG9lc24ndCByZWZsZWN0XG4gICAgICAvLyB0aGUgcGFydGlhbCBtb2R1bGUgdHJhbnNmb3Jtcy5cbiAgICAgIGNvbnN0IHRyYW5zZm9ybWVyID0gbmV3IFBhcnRpYWxNb2R1bGVNZXRhZGF0YVRyYW5zZm9ybWVyKHBhcnRpYWxNb2R1bGVzKTtcbiAgICAgIG1ldGFkYXRhVHJhbnNmb3Jtcy5wdXNoKHRyYW5zZm9ybWVyKTtcbiAgICAgIGZsYXRNb2R1bGVNZXRhZGF0YVRyYW5zZm9ybXMucHVzaCh0cmFuc2Zvcm1lcik7XG4gICAgfVxuXG4gICAgaWYgKHN0cmlwRGVjb3JhdG9ycykge1xuICAgICAgYmVmb3JlVHMucHVzaChnZXREZWNvcmF0b3JTdHJpcFRyYW5zZm9ybWVyRmFjdG9yeShcbiAgICAgICAgICBzdHJpcERlY29yYXRvcnMsIHRoaXMuY29tcGlsZXIucmVmbGVjdG9yLCB0aGlzLmdldFRzUHJvZ3JhbSgpLmdldFR5cGVDaGVja2VyKCkpKTtcbiAgICAgIGNvbnN0IHRyYW5zZm9ybWVyID1cbiAgICAgICAgICBuZXcgU3RyaXBEZWNvcmF0b3JzTWV0YWRhdGFUcmFuc2Zvcm1lcihzdHJpcERlY29yYXRvcnMsIHRoaXMuY29tcGlsZXIucmVmbGVjdG9yKTtcbiAgICAgIG1ldGFkYXRhVHJhbnNmb3Jtcy5wdXNoKHRyYW5zZm9ybWVyKTtcbiAgICAgIGZsYXRNb2R1bGVNZXRhZGF0YVRyYW5zZm9ybXMucHVzaCh0cmFuc2Zvcm1lcik7XG4gICAgfVxuXG4gICAgaWYgKGN1c3RvbVRyYW5zZm9ybWVycyAmJiBjdXN0b21UcmFuc2Zvcm1lcnMuYmVmb3JlVHMpIHtcbiAgICAgIGJlZm9yZVRzLnB1c2goLi4uY3VzdG9tVHJhbnNmb3JtZXJzLmJlZm9yZVRzKTtcbiAgICB9XG4gICAgaWYgKG1ldGFkYXRhVHJhbnNmb3Jtcy5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLm1ldGFkYXRhQ2FjaGUgPSB0aGlzLmNyZWF0ZU1ldGFkYXRhQ2FjaGUobWV0YWRhdGFUcmFuc2Zvcm1zKTtcbiAgICB9XG4gICAgaWYgKGZsYXRNb2R1bGVNZXRhZGF0YVRyYW5zZm9ybXMubGVuZ3RoID4gMCkge1xuICAgICAgdGhpcy5mbGF0TW9kdWxlTWV0YWRhdGFDYWNoZSA9IHRoaXMuY3JlYXRlTWV0YWRhdGFDYWNoZShmbGF0TW9kdWxlTWV0YWRhdGFUcmFuc2Zvcm1zKTtcbiAgICB9XG4gICAgY29uc3QgYWZ0ZXJUcyA9IGN1c3RvbVRyYW5zZm9ybWVycyA/IGN1c3RvbVRyYW5zZm9ybWVycy5hZnRlclRzIDogdW5kZWZpbmVkO1xuICAgIHJldHVybiB7YmVmb3JlOiBiZWZvcmVUcywgYWZ0ZXI6IGFmdGVyVHN9O1xuICB9XG5cbiAgcHJpdmF0ZSBpbml0U3luYygpIHtcbiAgICBpZiAodGhpcy5fYW5hbHl6ZWRNb2R1bGVzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCB7dG1wUHJvZ3JhbSwgc291cmNlRmlsZXMsIHRzRmlsZXMsIHJvb3ROYW1lc30gPSB0aGlzLl9jcmVhdGVQcm9ncmFtV2l0aEJhc2ljU3R1YnMoKTtcbiAgICAgIGNvbnN0IHthbmFseXplZE1vZHVsZXMsIGFuYWx5emVkSW5qZWN0YWJsZXN9ID1cbiAgICAgICAgICB0aGlzLmNvbXBpbGVyLmxvYWRGaWxlc1N5bmMoc291cmNlRmlsZXMsIHRzRmlsZXMpO1xuICAgICAgdGhpcy5fdXBkYXRlUHJvZ3JhbVdpdGhUeXBlQ2hlY2tTdHVicyhcbiAgICAgICAgICB0bXBQcm9ncmFtLCBhbmFseXplZE1vZHVsZXMsIGFuYWx5emVkSW5qZWN0YWJsZXMsIHJvb3ROYW1lcyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhpcy5fY3JlYXRlUHJvZ3JhbU9uRXJyb3IoZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfY3JlYXRlQ29tcGlsZXIoKSB7XG4gICAgY29uc3QgY29kZWdlbjogQ29kZUdlbmVyYXRvciA9IHtcbiAgICAgIGdlbmVyYXRlRmlsZTogKGdlbkZpbGVOYW1lLCBiYXNlRmlsZU5hbWUpID0+XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21waWxlci5lbWl0QmFzaWNTdHViKGdlbkZpbGVOYW1lLCBiYXNlRmlsZU5hbWUpLFxuICAgICAgZmluZEdlbmVyYXRlZEZpbGVOYW1lczogKGZpbGVOYW1lKSA9PiB0aGlzLl9jb21waWxlci5maW5kR2VuZXJhdGVkRmlsZU5hbWVzKGZpbGVOYW1lKSxcbiAgICB9O1xuXG4gICAgdGhpcy5faG9zdEFkYXB0ZXIgPSBuZXcgVHNDb21waWxlckFvdENvbXBpbGVyVHlwZUNoZWNrSG9zdEFkYXB0ZXIoXG4gICAgICAgIHRoaXMucm9vdE5hbWVzLCB0aGlzLm9wdGlvbnMsIHRoaXMuaG9zdCwgdGhpcy5tZXRhZGF0YUNhY2hlLCBjb2RlZ2VuLFxuICAgICAgICB0aGlzLm9sZFByb2dyYW1MaWJyYXJ5U3VtbWFyaWVzKTtcbiAgICBjb25zdCBhb3RPcHRpb25zID0gZ2V0QW90Q29tcGlsZXJPcHRpb25zKHRoaXMub3B0aW9ucyk7XG4gICAgY29uc3QgZXJyb3JDb2xsZWN0b3IgPSAodGhpcy5vcHRpb25zLmNvbGxlY3RBbGxFcnJvcnMgfHwgdGhpcy5vcHRpb25zLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjaykgP1xuICAgICAgICAoZXJyOiBhbnkpID0+IHRoaXMuX2FkZFN0cnVjdHVyYWxEaWFnbm9zdGljcyhlcnIpIDpcbiAgICAgICAgdW5kZWZpbmVkO1xuICAgIHRoaXMuX2NvbXBpbGVyID0gY3JlYXRlQW90Q29tcGlsZXIodGhpcy5faG9zdEFkYXB0ZXIsIGFvdE9wdGlvbnMsIGVycm9yQ29sbGVjdG9yKS5jb21waWxlcjtcbiAgfVxuXG4gIHByaXZhdGUgX2NyZWF0ZVByb2dyYW1XaXRoQmFzaWNTdHVicygpOiB7XG4gICAgdG1wUHJvZ3JhbTogdHMuUHJvZ3JhbSxcbiAgICByb290TmFtZXM6IHN0cmluZ1tdLFxuICAgIHNvdXJjZUZpbGVzOiBzdHJpbmdbXSxcbiAgICB0c0ZpbGVzOiBzdHJpbmdbXSxcbiAgfSB7XG4gICAgaWYgKHRoaXMuX2FuYWx5emVkTW9kdWxlcykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnRlcm5hbCBFcnJvcjogYWxyZWFkeSBpbml0aWFsaXplZCFgKTtcbiAgICB9XG4gICAgLy8gTm90ZTogVGhpcyBpcyBpbXBvcnRhbnQgdG8gbm90IHByb2R1Y2UgYSBtZW1vcnkgbGVhayFcbiAgICBjb25zdCBvbGRUc1Byb2dyYW0gPSB0aGlzLm9sZFRzUHJvZ3JhbTtcbiAgICB0aGlzLm9sZFRzUHJvZ3JhbSA9IHVuZGVmaW5lZDtcblxuICAgIGNvbnN0IGNvZGVnZW46IENvZGVHZW5lcmF0b3IgPSB7XG4gICAgICBnZW5lcmF0ZUZpbGU6IChnZW5GaWxlTmFtZSwgYmFzZUZpbGVOYW1lKSA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb21waWxlci5lbWl0QmFzaWNTdHViKGdlbkZpbGVOYW1lLCBiYXNlRmlsZU5hbWUpLFxuICAgICAgZmluZEdlbmVyYXRlZEZpbGVOYW1lczogKGZpbGVOYW1lKSA9PiB0aGlzLmNvbXBpbGVyLmZpbmRHZW5lcmF0ZWRGaWxlTmFtZXMoZmlsZU5hbWUpLFxuICAgIH07XG5cblxuICAgIGxldCByb290TmFtZXMgPSBbLi4udGhpcy5yb290TmFtZXNdO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZ2VuZXJhdGVDb2RlRm9yTGlicmFyaWVzICE9PSBmYWxzZSkge1xuICAgICAgLy8gaWYgd2Ugc2hvdWxkIGdlbmVyYXRlQ29kZUZvckxpYnJhcmllcywgbmV2ZXIgaW5jbHVkZVxuICAgICAgLy8gZ2VuZXJhdGVkIGZpbGVzIGluIHRoZSBwcm9ncmFtIGFzIG90aGVyd2lzZSB3ZSB3aWxsXG4gICAgICAvLyBvdmVyd3JpdGUgdGhlbSBhbmQgdHlwZXNjcmlwdCB3aWxsIHJlcG9ydCB0aGUgZXJyb3JcbiAgICAgIC8vIFRTNTA1NTogQ2Fubm90IHdyaXRlIGZpbGUgLi4uIGJlY2F1c2UgaXQgd291bGQgb3ZlcndyaXRlIGlucHV0IGZpbGUuXG4gICAgICByb290TmFtZXMgPSByb290TmFtZXMuZmlsdGVyKGZuID0+ICFHRU5FUkFURURfRklMRVMudGVzdChmbikpO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLm5vUmVzb2x2ZSkge1xuICAgICAgdGhpcy5yb290TmFtZXMuZm9yRWFjaChyb290TmFtZSA9PiB7XG4gICAgICAgIGlmICh0aGlzLmhvc3RBZGFwdGVyLnNob3VsZEdlbmVyYXRlRmlsZXNGb3Iocm9vdE5hbWUpKSB7XG4gICAgICAgICAgcm9vdE5hbWVzLnB1c2goLi4udGhpcy5jb21waWxlci5maW5kR2VuZXJhdGVkRmlsZU5hbWVzKHJvb3ROYW1lKSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IHRtcFByb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKHJvb3ROYW1lcywgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3RBZGFwdGVyLCBvbGRUc1Byb2dyYW0pO1xuICAgIGNvbnN0IHNvdXJjZUZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IHRzRmlsZXM6IHN0cmluZ1tdID0gW107XG4gICAgdG1wUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZvckVhY2goc2YgPT4ge1xuICAgICAgaWYgKHRoaXMuaG9zdEFkYXB0ZXIuaXNTb3VyY2VGaWxlKHNmLmZpbGVOYW1lKSkge1xuICAgICAgICBzb3VyY2VGaWxlcy5wdXNoKHNmLmZpbGVOYW1lKTtcbiAgICAgIH1cbiAgICAgIGlmIChUUy50ZXN0KHNmLmZpbGVOYW1lKSAmJiAhRFRTLnRlc3Qoc2YuZmlsZU5hbWUpKSB7XG4gICAgICAgIHRzRmlsZXMucHVzaChzZi5maWxlTmFtZSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHt0bXBQcm9ncmFtLCBzb3VyY2VGaWxlcywgdHNGaWxlcywgcm9vdE5hbWVzfTtcbiAgfVxuXG4gIHByaXZhdGUgX3VwZGF0ZVByb2dyYW1XaXRoVHlwZUNoZWNrU3R1YnMoXG4gICAgICB0bXBQcm9ncmFtOiB0cy5Qcm9ncmFtLCBhbmFseXplZE1vZHVsZXM6IE5nQW5hbHl6ZWRNb2R1bGVzLFxuICAgICAgYW5hbHl6ZWRJbmplY3RhYmxlczogTmdBbmFseXplZEZpbGVXaXRoSW5qZWN0YWJsZXNbXSwgcm9vdE5hbWVzOiBzdHJpbmdbXSkge1xuICAgIHRoaXMuX2FuYWx5emVkTW9kdWxlcyA9IGFuYWx5emVkTW9kdWxlcztcbiAgICB0aGlzLl9hbmFseXplZEluamVjdGFibGVzID0gYW5hbHl6ZWRJbmplY3RhYmxlcztcbiAgICB0bXBQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZm9yRWFjaChzZiA9PiB7XG4gICAgICBpZiAoc2YuZmlsZU5hbWUuZW5kc1dpdGgoJy5uZ2ZhY3RvcnkudHMnKSkge1xuICAgICAgICBjb25zdCB7Z2VuZXJhdGUsIGJhc2VGaWxlTmFtZX0gPSB0aGlzLmhvc3RBZGFwdGVyLnNob3VsZEdlbmVyYXRlRmlsZShzZi5maWxlTmFtZSk7XG4gICAgICAgIGlmIChnZW5lcmF0ZSkge1xuICAgICAgICAgIC8vIE5vdGU6ICEgaXMgb2sgYXMgaG9zdEFkYXB0ZXIuc2hvdWxkR2VuZXJhdGVGaWxlIHdpbGwgYWx3YXlzIHJldHVybiBhIGJhc2VGaWxlTmFtZVxuICAgICAgICAgIC8vIGZvciAubmdmYWN0b3J5LnRzIGZpbGVzLlxuICAgICAgICAgIGNvbnN0IGdlbkZpbGUgPSB0aGlzLmNvbXBpbGVyLmVtaXRUeXBlQ2hlY2tTdHViKHNmLmZpbGVOYW1lLCBiYXNlRmlsZU5hbWUgISk7XG4gICAgICAgICAgaWYgKGdlbkZpbGUpIHtcbiAgICAgICAgICAgIHRoaXMuaG9zdEFkYXB0ZXIudXBkYXRlR2VuZXJhdGVkRmlsZShnZW5GaWxlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLl90c1Byb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKHJvb3ROYW1lcywgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3RBZGFwdGVyLCB0bXBQcm9ncmFtKTtcbiAgICAvLyBOb3RlOiB0aGUgbmV3IHRzIHByb2dyYW0gc2hvdWxkIGJlIGNvbXBsZXRlbHkgcmV1c2FibGUgYnkgVHlwZVNjcmlwdCBhczpcbiAgICAvLyAtIHdlIGNhY2hlIGFsbCB0aGUgZmlsZXMgaW4gdGhlIGhvc3RBZGFwdGVyXG4gICAgLy8gLSBuZXcgbmV3IHN0dWJzIHVzZSB0aGUgZXhhY3RseSBzYW1lIGltcG9ydHMvZXhwb3J0cyBhcyB0aGUgb2xkIG9uY2UgKHdlIGFzc2VydCB0aGF0IGluXG4gICAgLy8gaG9zdEFkYXB0ZXIudXBkYXRlR2VuZXJhdGVkRmlsZSkuXG4gICAgaWYgKHRzU3RydWN0dXJlSXNSZXVzZWQodG1wUHJvZ3JhbSkgIT09IFN0cnVjdHVyZUlzUmV1c2VkLkNvbXBsZXRlbHkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW50ZXJuYWwgRXJyb3I6IFRoZSBzdHJ1Y3R1cmUgb2YgdGhlIHByb2dyYW0gY2hhbmdlZCBkdXJpbmcgY29kZWdlbi5gKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9jcmVhdGVQcm9ncmFtT25FcnJvcihlOiBhbnkpIHtcbiAgICAvLyBTdGlsbCBmaWxsIHRoZSBhbmFseXplZE1vZHVsZXMgYW5kIHRoZSB0c1Byb2dyYW1cbiAgICAvLyBzbyB0aGF0IHdlIGRvbid0IGNhdXNlIG90aGVyIGVycm9ycyBmb3IgdXNlcnMgd2hvIGUuZy4gd2FudCB0byBlbWl0IHRoZSBuZ1Byb2dyYW0uXG4gICAgdGhpcy5fYW5hbHl6ZWRNb2R1bGVzID0gZW1wdHlNb2R1bGVzO1xuICAgIHRoaXMub2xkVHNQcm9ncmFtID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX2hvc3RBZGFwdGVyLmlzU291cmNlRmlsZSA9ICgpID0+IGZhbHNlO1xuICAgIHRoaXMuX3RzUHJvZ3JhbSA9IHRzLmNyZWF0ZVByb2dyYW0odGhpcy5yb290TmFtZXMsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0QWRhcHRlcik7XG4gICAgaWYgKGlzU3ludGF4RXJyb3IoZSkpIHtcbiAgICAgIHRoaXMuX2FkZFN0cnVjdHVyYWxEaWFnbm9zdGljcyhlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhyb3cgZTtcbiAgfVxuXG4gIHByaXZhdGUgX2FkZFN0cnVjdHVyYWxEaWFnbm9zdGljcyhlcnJvcjogRXJyb3IpIHtcbiAgICBjb25zdCBkaWFnbm9zdGljcyA9IHRoaXMuX3N0cnVjdHVyYWxEaWFnbm9zdGljcyB8fCAodGhpcy5fc3RydWN0dXJhbERpYWdub3N0aWNzID0gW10pO1xuICAgIGlmIChpc1N5bnRheEVycm9yKGVycm9yKSkge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5zeW50YXhFcnJvclRvRGlhZ25vc3RpY3MoZXJyb3IpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCh7XG4gICAgICAgIG1lc3NhZ2VUZXh0OiBlcnJvci50b1N0cmluZygpLFxuICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICBzb3VyY2U6IFNPVVJDRSxcbiAgICAgICAgY29kZTogREVGQVVMVF9FUlJPUl9DT0RFXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvLyBOb3RlOiB0aGlzIHJldHVybnMgYSB0cy5EaWFnbm9zdGljIHNvIHRoYXQgd2VcbiAgLy8gY2FuIHJldHVybiBlcnJvcnMgaW4gYSB0cy5FbWl0UmVzdWx0XG4gIHByaXZhdGUgZ2VuZXJhdGVGaWxlc0ZvckVtaXQoZW1pdEZsYWdzOiBFbWl0RmxhZ3MpOlxuICAgICAge2dlbkZpbGVzOiBHZW5lcmF0ZWRGaWxlW10sIGdlbkRpYWdzOiB0cy5EaWFnbm9zdGljW119IHtcbiAgICB0cnkge1xuICAgICAgaWYgKCEoZW1pdEZsYWdzICYgRW1pdEZsYWdzLkNvZGVnZW4pKSB7XG4gICAgICAgIHJldHVybiB7Z2VuRmlsZXM6IFtdLCBnZW5EaWFnczogW119O1xuICAgICAgfVxuICAgICAgLy8gVE9ETyh0Ym9zY2gpOiBhbGxvdyBnZW5lcmF0aW5nIGZpbGVzIHRoYXQgYXJlIG5vdCBpbiB0aGUgcm9vdERpclxuICAgICAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvaXNzdWVzLzE5MzM3XG4gICAgICBsZXQgZ2VuRmlsZXMgPSB0aGlzLmNvbXBpbGVyLmVtaXRBbGxJbXBscyh0aGlzLmFuYWx5emVkTW9kdWxlcylcbiAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGdlbkZpbGUgPT4gaXNJblJvb3REaXIoZ2VuRmlsZS5nZW5GaWxlVXJsLCB0aGlzLm9wdGlvbnMpKTtcbiAgICAgIGlmICh0aGlzLm9sZFByb2dyYW1FbWl0dGVkR2VuZXJhdGVkRmlsZXMpIHtcbiAgICAgICAgY29uc3Qgb2xkUHJvZ3JhbUVtaXR0ZWRHZW5lcmF0ZWRGaWxlcyA9IHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRHZW5lcmF0ZWRGaWxlcztcbiAgICAgICAgZ2VuRmlsZXMgPSBnZW5GaWxlcy5maWx0ZXIoZ2VuRmlsZSA9PiB7XG4gICAgICAgICAgY29uc3Qgb2xkR2VuRmlsZSA9IG9sZFByb2dyYW1FbWl0dGVkR2VuZXJhdGVkRmlsZXMuZ2V0KGdlbkZpbGUuZ2VuRmlsZVVybCk7XG4gICAgICAgICAgcmV0dXJuICFvbGRHZW5GaWxlIHx8ICFnZW5GaWxlLmlzRXF1aXZhbGVudChvbGRHZW5GaWxlKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4ge2dlbkZpbGVzLCBnZW5EaWFnczogW119O1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIFRPRE8odGJvc2NoKTogY2hlY2sgd2hldGhlciB3ZSBjYW4gYWN0dWFsbHkgaGF2ZSBzeW50YXggZXJyb3JzIGhlcmUsXG4gICAgICAvLyBhcyB3ZSBhbHJlYWR5IHBhcnNlZCB0aGUgbWV0YWRhdGEgYW5kIHRlbXBsYXRlcyBiZWZvcmUgdG8gY3JlYXRlIHRoZSB0eXBlIGNoZWNrIGJsb2NrLlxuICAgICAgaWYgKGlzU3ludGF4RXJyb3IoZSkpIHtcbiAgICAgICAgY29uc3QgZ2VuRGlhZ3M6IHRzLkRpYWdub3N0aWNbXSA9IFt7XG4gICAgICAgICAgZmlsZTogdW5kZWZpbmVkLFxuICAgICAgICAgIHN0YXJ0OiB1bmRlZmluZWQsXG4gICAgICAgICAgbGVuZ3RoOiB1bmRlZmluZWQsXG4gICAgICAgICAgbWVzc2FnZVRleHQ6IGUubWVzc2FnZSxcbiAgICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICAgIHNvdXJjZTogU09VUkNFLFxuICAgICAgICAgIGNvZGU6IERFRkFVTFRfRVJST1JfQ09ERVxuICAgICAgICB9XTtcbiAgICAgICAgcmV0dXJuIHtnZW5GaWxlczogW10sIGdlbkRpYWdzfTtcbiAgICAgIH1cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdW5kZWZpbmVkIGlmIGFsbCBmaWxlcyBzaG91bGQgYmUgZW1pdHRlZC5cbiAgICovXG4gIHByaXZhdGUgZ2V0U291cmNlRmlsZXNGb3JFbWl0KCk6IHRzLlNvdXJjZUZpbGVbXXx1bmRlZmluZWQge1xuICAgIC8vIFRPRE8odGJvc2NoKTogaWYgb25lIG9mIHRoZSBmaWxlcyBjb250YWlucyBhIGBjb25zdCBlbnVtYFxuICAgIC8vIGFsd2F5cyBlbWl0IGFsbCBmaWxlcyAtPiByZXR1cm4gdW5kZWZpbmVkIVxuICAgIGxldCBzb3VyY2VGaWxlc1RvRW1pdCA9IHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZmlsdGVyKFxuICAgICAgICBzZiA9PiB7IHJldHVybiAhc2YuaXNEZWNsYXJhdGlvbkZpbGUgJiYgIUdFTkVSQVRFRF9GSUxFUy50ZXN0KHNmLmZpbGVOYW1lKTsgfSk7XG4gICAgaWYgKHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRTb3VyY2VGaWxlcykge1xuICAgICAgc291cmNlRmlsZXNUb0VtaXQgPSBzb3VyY2VGaWxlc1RvRW1pdC5maWx0ZXIoc2YgPT4ge1xuICAgICAgICBjb25zdCBvbGRGaWxlID0gdGhpcy5vbGRQcm9ncmFtRW1pdHRlZFNvdXJjZUZpbGVzICEuZ2V0KHNmLmZpbGVOYW1lKTtcbiAgICAgICAgcmV0dXJuIHNmICE9PSBvbGRGaWxlO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBzb3VyY2VGaWxlc1RvRW1pdDtcbiAgfVxuXG4gIHByaXZhdGUgd3JpdGVGaWxlKFxuICAgICAgb3V0RmlsZU5hbWU6IHN0cmluZywgb3V0RGF0YTogc3RyaW5nLCB3cml0ZUJ5dGVPcmRlck1hcms6IGJvb2xlYW4sXG4gICAgICBvbkVycm9yPzogKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCwgZ2VuRmlsZT86IEdlbmVyYXRlZEZpbGUsXG4gICAgICBzb3VyY2VGaWxlcz86IFJlYWRvbmx5QXJyYXk8dHMuU291cmNlRmlsZT4pIHtcbiAgICAvLyBjb2xsZWN0IGVtaXR0ZWRMaWJyYXJ5U3VtbWFyaWVzXG4gICAgbGV0IGJhc2VGaWxlOiB0cy5Tb3VyY2VGaWxlfHVuZGVmaW5lZDtcbiAgICBpZiAoZ2VuRmlsZSkge1xuICAgICAgYmFzZUZpbGUgPSB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGdlbkZpbGUuc3JjRmlsZVVybCk7XG4gICAgICBpZiAoYmFzZUZpbGUpIHtcbiAgICAgICAgaWYgKCF0aGlzLmVtaXR0ZWRMaWJyYXJ5U3VtbWFyaWVzKSB7XG4gICAgICAgICAgdGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcyA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChnZW5GaWxlLmdlbkZpbGVVcmwuZW5kc1dpdGgoJy5uZ3N1bW1hcnkuanNvbicpICYmIGJhc2VGaWxlLmZpbGVOYW1lLmVuZHNXaXRoKCcuZC50cycpKSB7XG4gICAgICAgICAgdGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcy5wdXNoKHtcbiAgICAgICAgICAgIGZpbGVOYW1lOiBiYXNlRmlsZS5maWxlTmFtZSxcbiAgICAgICAgICAgIHRleHQ6IGJhc2VGaWxlLnRleHQsXG4gICAgICAgICAgICBzb3VyY2VGaWxlOiBiYXNlRmlsZSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICB0aGlzLmVtaXR0ZWRMaWJyYXJ5U3VtbWFyaWVzLnB1c2goe2ZpbGVOYW1lOiBnZW5GaWxlLmdlbkZpbGVVcmwsIHRleHQ6IG91dERhdGF9KTtcbiAgICAgICAgICBpZiAoIXRoaXMub3B0aW9ucy5kZWNsYXJhdGlvbikge1xuICAgICAgICAgICAgLy8gSWYgd2UgZG9uJ3QgZW1pdCBkZWNsYXJhdGlvbnMsIHN0aWxsIHJlY29yZCBhbiBlbXB0eSAubmdmYWN0b3J5LmQudHMgZmlsZSxcbiAgICAgICAgICAgIC8vIGFzIHdlIG1pZ2h0IG5lZWQgaXQgbGF0ZXIgb24gZm9yIHJlc29sdmluZyBtb2R1bGUgbmFtZXMgZnJvbSBzdW1tYXJpZXMuXG4gICAgICAgICAgICBjb25zdCBuZ0ZhY3RvcnlEdHMgPVxuICAgICAgICAgICAgICAgIGdlbkZpbGUuZ2VuRmlsZVVybC5zdWJzdHJpbmcoMCwgZ2VuRmlsZS5nZW5GaWxlVXJsLmxlbmd0aCAtIDE1KSArICcubmdmYWN0b3J5LmQudHMnO1xuICAgICAgICAgICAgdGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcy5wdXNoKHtmaWxlTmFtZTogbmdGYWN0b3J5RHRzLCB0ZXh0OiAnJ30pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChvdXRGaWxlTmFtZS5lbmRzV2l0aCgnLmQudHMnKSAmJiBiYXNlRmlsZS5maWxlTmFtZS5lbmRzV2l0aCgnLmQudHMnKSkge1xuICAgICAgICAgIGNvbnN0IGR0c1NvdXJjZUZpbGVQYXRoID0gZ2VuRmlsZS5nZW5GaWxlVXJsLnJlcGxhY2UoL1xcLnRzJC8sICcuZC50cycpO1xuICAgICAgICAgIC8vIE5vdGU6IERvbid0IHVzZSBzb3VyY2VGaWxlcyBoZXJlIGFzIHRoZSBjcmVhdGVkIC5kLnRzIGhhcyBhIHBhdGggaW4gdGhlIG91dERpcixcbiAgICAgICAgICAvLyBidXQgd2UgbmVlZCBvbmUgdGhhdCBpcyBuZXh0IHRvIHRoZSAudHMgZmlsZVxuICAgICAgICAgIHRoaXMuZW1pdHRlZExpYnJhcnlTdW1tYXJpZXMucHVzaCh7ZmlsZU5hbWU6IGR0c1NvdXJjZUZpbGVQYXRoLCB0ZXh0OiBvdXREYXRhfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gRmlsdGVyIG91dCBnZW5lcmF0ZWQgZmlsZXMgZm9yIHdoaWNoIHdlIGRpZG4ndCBnZW5lcmF0ZSBjb2RlLlxuICAgIC8vIFRoaXMgY2FuIGhhcHBlbiBhcyB0aGUgc3R1YiBjYWxjdWxhdGlvbiBpcyBub3QgY29tcGxldGVseSBleGFjdC5cbiAgICAvLyBOb3RlOiBzb3VyY2VGaWxlIHJlZmVycyB0byB0aGUgLm5nZmFjdG9yeS50cyAvIC5uZ3N1bW1hcnkudHMgZmlsZVxuICAgIC8vIG5vZGVfZW1pdHRlcl90cmFuc2Zvcm0gYWxyZWFkeSBzZXQgdGhlIGZpbGUgY29udGVudHMgdG8gYmUgZW1wdHksXG4gICAgLy8gIHNvIHRoaXMgY29kZSBvbmx5IG5lZWRzIHRvIHNraXAgdGhlIGZpbGUgaWYgIWFsbG93RW1wdHlDb2RlZ2VuRmlsZXMuXG4gICAgY29uc3QgaXNHZW5lcmF0ZWQgPSBHRU5FUkFURURfRklMRVMudGVzdChvdXRGaWxlTmFtZSk7XG4gICAgaWYgKGlzR2VuZXJhdGVkICYmICF0aGlzLm9wdGlvbnMuYWxsb3dFbXB0eUNvZGVnZW5GaWxlcyAmJlxuICAgICAgICAoIWdlbkZpbGUgfHwgIWdlbkZpbGUuc3RtdHMgfHwgZ2VuRmlsZS5zdG10cy5sZW5ndGggPT09IDApKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChiYXNlRmlsZSkge1xuICAgICAgc291cmNlRmlsZXMgPSBzb3VyY2VGaWxlcyA/IFsuLi5zb3VyY2VGaWxlcywgYmFzZUZpbGVdIDogW2Jhc2VGaWxlXTtcbiAgICB9XG4gICAgLy8gVE9ETzogcmVtb3ZlIGFueSB3aGVuIFRTIDIuNCBzdXBwb3J0IGlzIHJlbW92ZWQuXG4gICAgdGhpcy5ob3N0LndyaXRlRmlsZShvdXRGaWxlTmFtZSwgb3V0RGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCBzb3VyY2VGaWxlcyBhcyBhbnkpO1xuICB9XG59XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgYSBnaXZlbiB2ZXJzaW9uIOKIiCBbbWluVmVyc2lvbiwgbWF4VmVyc2lvbltcbiAqIEFuIGVycm9yIHdpbGwgYmUgdGhyb3duIGlmIHRoZSBmb2xsb3dpbmcgc3RhdGVtZW50cyBhcmUgc2ltdWx0YW5lb3VzbHkgdHJ1ZTpcbiAqIC0gdGhlIGdpdmVuIHZlcnNpb24g4oiJIFttaW5WZXJzaW9uLCBtYXhWZXJzaW9uWyxcbiAqIC0gdGhlIHJlc3VsdCBvZiB0aGUgdmVyc2lvbiBjaGVjayBpcyBub3QgbWVhbnQgdG8gYmUgYnlwYXNzZWQgKHRoZSBwYXJhbWV0ZXIgZGlzYWJsZVZlcnNpb25DaGVja1xuICogaXMgZmFsc2UpXG4gKlxuICogQHBhcmFtIHZlcnNpb24gVGhlIHZlcnNpb24gb24gd2hpY2ggdGhlIGNoZWNrIHdpbGwgYmUgcGVyZm9ybWVkXG4gKiBAcGFyYW0gbWluVmVyc2lvbiBUaGUgbG93ZXIgYm91bmQgdmVyc2lvbi4gQSB2YWxpZCB2ZXJzaW9uIG5lZWRzIHRvIGJlIGdyZWF0ZXIgdGhhbiBtaW5WZXJzaW9uXG4gKiBAcGFyYW0gbWF4VmVyc2lvbiBUaGUgdXBwZXIgYm91bmQgdmVyc2lvbi4gQSB2YWxpZCB2ZXJzaW9uIG5lZWRzIHRvIGJlIHN0cmljdGx5IGxlc3MgdGhhblxuICogbWF4VmVyc2lvblxuICogQHBhcmFtIGRpc2FibGVWZXJzaW9uQ2hlY2sgSW5kaWNhdGVzIHdoZXRoZXIgdmVyc2lvbiBjaGVjayBzaG91bGQgYmUgYnlwYXNzZWRcbiAqXG4gKiBAdGhyb3dzIFdpbGwgdGhyb3cgYW4gZXJyb3IgaWYgdGhlIGZvbGxvd2luZyBzdGF0ZW1lbnRzIGFyZSBzaW11bHRhbmVvdXNseSB0cnVlOlxuICogLSB0aGUgZ2l2ZW4gdmVyc2lvbiDiiIkgW21pblZlcnNpb24sIG1heFZlcnNpb25bLFxuICogLSB0aGUgcmVzdWx0IG9mIHRoZSB2ZXJzaW9uIGNoZWNrIGlzIG5vdCBtZWFudCB0byBiZSBieXBhc3NlZCAodGhlIHBhcmFtZXRlciBkaXNhYmxlVmVyc2lvbkNoZWNrXG4gKiBpcyBmYWxzZSlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrVmVyc2lvbihcbiAgICB2ZXJzaW9uOiBzdHJpbmcsIG1pblZlcnNpb246IHN0cmluZywgbWF4VmVyc2lvbjogc3RyaW5nLFxuICAgIGRpc2FibGVWZXJzaW9uQ2hlY2s6IGJvb2xlYW4gfCB1bmRlZmluZWQpIHtcbiAgaWYgKChjb21wYXJlVmVyc2lvbnModmVyc2lvbiwgbWluVmVyc2lvbikgPCAwIHx8IGNvbXBhcmVWZXJzaW9ucyh2ZXJzaW9uLCBtYXhWZXJzaW9uKSA+PSAwKSAmJlxuICAgICAgIWRpc2FibGVWZXJzaW9uQ2hlY2spIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBUaGUgQW5ndWxhciBDb21waWxlciByZXF1aXJlcyBUeXBlU2NyaXB0ID49JHttaW5WZXJzaW9ufSBhbmQgPCR7bWF4VmVyc2lvbn0gYnV0ICR7dmVyc2lvbn0gd2FzIGZvdW5kIGluc3RlYWQuYCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVByb2dyYW0oe3Jvb3ROYW1lcywgb3B0aW9ucywgaG9zdCwgb2xkUHJvZ3JhbX06IHtcbiAgcm9vdE5hbWVzOiBSZWFkb25seUFycmF5PHN0cmluZz4sXG4gIG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucyxcbiAgaG9zdDogQ29tcGlsZXJIb3N0LCBvbGRQcm9ncmFtPzogUHJvZ3JhbVxufSk6IFByb2dyYW0ge1xuICBpZiAob3B0aW9ucy5lbmFibGVJdnkgIT09IGZhbHNlKSB7XG4gICAgcmV0dXJuIG5ldyBOZ3RzY1Byb2dyYW0ocm9vdE5hbWVzLCBvcHRpb25zLCBob3N0LCBvbGRQcm9ncmFtIGFzIE5ndHNjUHJvZ3JhbSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG5ldyBBbmd1bGFyQ29tcGlsZXJQcm9ncmFtKHJvb3ROYW1lcywgb3B0aW9ucywgaG9zdCwgb2xkUHJvZ3JhbSk7XG4gIH1cbn1cblxuLy8gQ29tcHV0ZSB0aGUgQW90Q29tcGlsZXIgb3B0aW9uc1xuZnVuY3Rpb24gZ2V0QW90Q29tcGlsZXJPcHRpb25zKG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucyk6IEFvdENvbXBpbGVyT3B0aW9ucyB7XG4gIGxldCBtaXNzaW5nVHJhbnNsYXRpb24gPSBjb3JlLk1pc3NpbmdUcmFuc2xhdGlvblN0cmF0ZWd5Lldhcm5pbmc7XG5cbiAgc3dpdGNoIChvcHRpb25zLmkxOG5Jbk1pc3NpbmdUcmFuc2xhdGlvbnMpIHtcbiAgICBjYXNlICdpZ25vcmUnOlxuICAgICAgbWlzc2luZ1RyYW5zbGF0aW9uID0gY29yZS5NaXNzaW5nVHJhbnNsYXRpb25TdHJhdGVneS5JZ25vcmU7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdlcnJvcic6XG4gICAgICBtaXNzaW5nVHJhbnNsYXRpb24gPSBjb3JlLk1pc3NpbmdUcmFuc2xhdGlvblN0cmF0ZWd5LkVycm9yO1xuICAgICAgYnJlYWs7XG4gIH1cblxuICBsZXQgdHJhbnNsYXRpb25zOiBzdHJpbmcgPSAnJztcblxuICBpZiAob3B0aW9ucy5pMThuSW5GaWxlKSB7XG4gICAgaWYgKCFvcHRpb25zLmkxOG5JbkxvY2FsZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgdHJhbnNsYXRpb24gZmlsZSAoJHtvcHRpb25zLmkxOG5JbkZpbGV9KSBsb2NhbGUgbXVzdCBiZSBwcm92aWRlZC5gKTtcbiAgICB9XG4gICAgdHJhbnNsYXRpb25zID0gZnMucmVhZEZpbGVTeW5jKG9wdGlvbnMuaTE4bkluRmlsZSwgJ3V0ZjgnKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBObyB0cmFuc2xhdGlvbnMgYXJlIHByb3ZpZGVkLCBpZ25vcmUgYW55IGVycm9yc1xuICAgIC8vIFdlIHN0aWxsIGdvIHRocm91Z2ggaTE4biB0byByZW1vdmUgaTE4biBhdHRyaWJ1dGVzXG4gICAgbWlzc2luZ1RyYW5zbGF0aW9uID0gY29yZS5NaXNzaW5nVHJhbnNsYXRpb25TdHJhdGVneS5JZ25vcmU7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGxvY2FsZTogb3B0aW9ucy5pMThuSW5Mb2NhbGUsXG4gICAgaTE4bkZvcm1hdDogb3B0aW9ucy5pMThuSW5Gb3JtYXQgfHwgb3B0aW9ucy5pMThuT3V0Rm9ybWF0LFxuICAgIGkxOG5Vc2VFeHRlcm5hbElkczogb3B0aW9ucy5pMThuVXNlRXh0ZXJuYWxJZHMsIHRyYW5zbGF0aW9ucywgbWlzc2luZ1RyYW5zbGF0aW9uLFxuICAgIGVuYWJsZVN1bW1hcmllc0ZvckppdDogb3B0aW9ucy5lbmFibGVTdW1tYXJpZXNGb3JKaXQsXG4gICAgcHJlc2VydmVXaGl0ZXNwYWNlczogb3B0aW9ucy5wcmVzZXJ2ZVdoaXRlc3BhY2VzLFxuICAgIGZ1bGxUZW1wbGF0ZVR5cGVDaGVjazogb3B0aW9ucy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2ssXG4gICAgYWxsb3dFbXB0eUNvZGVnZW5GaWxlczogb3B0aW9ucy5hbGxvd0VtcHR5Q29kZWdlbkZpbGVzLFxuICAgIGVuYWJsZUl2eTogb3B0aW9ucy5lbmFibGVJdnksXG4gICAgY3JlYXRlRXh0ZXJuYWxTeW1ib2xGYWN0b3J5UmVleHBvcnRzOiBvcHRpb25zLmNyZWF0ZUV4dGVybmFsU3ltYm9sRmFjdG9yeVJlZXhwb3J0cyxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0TmdPcHRpb25EaWFnbm9zdGljcyhvcHRpb25zOiBDb21waWxlck9wdGlvbnMpOiBSZWFkb25seUFycmF5PERpYWdub3N0aWM+IHtcbiAgaWYgKG9wdGlvbnMuYW5ub3RhdGlvbnNBcykge1xuICAgIHN3aXRjaCAob3B0aW9ucy5hbm5vdGF0aW9uc0FzKSB7XG4gICAgICBjYXNlICdkZWNvcmF0b3JzJzpcbiAgICAgIGNhc2UgJ3N0YXRpYyBmaWVsZHMnOlxuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBbe1xuICAgICAgICAgIG1lc3NhZ2VUZXh0OlxuICAgICAgICAgICAgICAnQW5ndWxhciBjb21waWxlciBvcHRpb25zIFwiYW5ub3RhdGlvbnNBc1wiIG9ubHkgc3VwcG9ydHMgXCJzdGF0aWMgZmllbGRzXCIgYW5kIFwiZGVjb3JhdG9yc1wiJyxcbiAgICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICAgIHNvdXJjZTogU09VUkNFLFxuICAgICAgICAgIGNvZGU6IERFRkFVTFRfRVJST1JfQ09ERVxuICAgICAgICB9XTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIFtdO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVTZXBhcmF0b3JzKHBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBwYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCBjYW4gYWRqdXN0IGEgcGF0aCBmcm9tIHNvdXJjZSBwYXRoIHRvIG91dCBwYXRoLFxuICogYmFzZWQgb24gYW4gZXhpc3RpbmcgbWFwcGluZyBmcm9tIHNvdXJjZSB0byBvdXQgcGF0aC5cbiAqXG4gKiBUT0RPKHRib3NjaCk6IHRhbGsgdG8gdGhlIFR5cGVTY3JpcHQgdGVhbSB0byBleHBvc2UgdGhlaXIgbG9naWMgZm9yIGNhbGN1bGF0aW5nIHRoZSBgcm9vdERpcmBcbiAqIGlmIG5vbmUgd2FzIHNwZWNpZmllZC5cbiAqXG4gKiBOb3RlOiBUaGlzIGZ1bmN0aW9uIHdvcmtzIG9uIG5vcm1hbGl6ZWQgcGF0aHMgZnJvbSB0eXBlc2NyaXB0IGJ1dCBzaG91bGQgYWx3YXlzIHJldHVyblxuICogUE9TSVggbm9ybWFsaXplZCBwYXRocyBmb3Igb3V0cHV0IHBhdGhzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU3JjVG9PdXRQYXRoTWFwcGVyKFxuICAgIG91dERpcjogc3RyaW5nIHwgdW5kZWZpbmVkLCBzYW1wbGVTcmNGaWxlTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgIHNhbXBsZU91dEZpbGVOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQsIGhvc3Q6IHtcbiAgICAgIGRpcm5hbWU6IHR5cGVvZiBwYXRoLmRpcm5hbWUsXG4gICAgICByZXNvbHZlOiB0eXBlb2YgcGF0aC5yZXNvbHZlLFxuICAgICAgcmVsYXRpdmU6IHR5cGVvZiBwYXRoLnJlbGF0aXZlXG4gICAgfSA9IHBhdGgpOiAoc3JjRmlsZU5hbWU6IHN0cmluZykgPT4gc3RyaW5nIHtcbiAgaWYgKG91dERpcikge1xuICAgIGxldCBwYXRoOiB7fSA9IHt9OyAgLy8gRW5zdXJlIHdlIGVycm9yIGlmIHdlIHVzZSBgcGF0aGAgaW5zdGVhZCBvZiBgaG9zdGAuXG4gICAgaWYgKHNhbXBsZVNyY0ZpbGVOYW1lID09IG51bGwgfHwgc2FtcGxlT3V0RmlsZU5hbWUgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW4ndCBjYWxjdWxhdGUgdGhlIHJvb3REaXIgd2l0aG91dCBhIHNhbXBsZSBzcmNGaWxlTmFtZSAvIG91dEZpbGVOYW1lLiBgKTtcbiAgICB9XG4gICAgY29uc3Qgc3JjRmlsZURpciA9IG5vcm1hbGl6ZVNlcGFyYXRvcnMoaG9zdC5kaXJuYW1lKHNhbXBsZVNyY0ZpbGVOYW1lKSk7XG4gICAgY29uc3Qgb3V0RmlsZURpciA9IG5vcm1hbGl6ZVNlcGFyYXRvcnMoaG9zdC5kaXJuYW1lKHNhbXBsZU91dEZpbGVOYW1lKSk7XG4gICAgaWYgKHNyY0ZpbGVEaXIgPT09IG91dEZpbGVEaXIpIHtcbiAgICAgIHJldHVybiAoc3JjRmlsZU5hbWUpID0+IHNyY0ZpbGVOYW1lO1xuICAgIH1cbiAgICAvLyBjYWxjdWxhdGUgdGhlIGNvbW1vbiBzdWZmaXgsIHN0b3BwaW5nXG4gICAgLy8gYXQgYG91dERpcmAuXG4gICAgY29uc3Qgc3JjRGlyUGFydHMgPSBzcmNGaWxlRGlyLnNwbGl0KCcvJyk7XG4gICAgY29uc3Qgb3V0RGlyUGFydHMgPSBub3JtYWxpemVTZXBhcmF0b3JzKGhvc3QucmVsYXRpdmUob3V0RGlyLCBvdXRGaWxlRGlyKSkuc3BsaXQoJy8nKTtcbiAgICBsZXQgaSA9IDA7XG4gICAgd2hpbGUgKGkgPCBNYXRoLm1pbihzcmNEaXJQYXJ0cy5sZW5ndGgsIG91dERpclBhcnRzLmxlbmd0aCkgJiZcbiAgICAgICAgICAgc3JjRGlyUGFydHNbc3JjRGlyUGFydHMubGVuZ3RoIC0gMSAtIGldID09PSBvdXREaXJQYXJ0c1tvdXREaXJQYXJ0cy5sZW5ndGggLSAxIC0gaV0pXG4gICAgICBpKys7XG4gICAgY29uc3Qgcm9vdERpciA9IHNyY0RpclBhcnRzLnNsaWNlKDAsIHNyY0RpclBhcnRzLmxlbmd0aCAtIGkpLmpvaW4oJy8nKTtcbiAgICByZXR1cm4gKHNyY0ZpbGVOYW1lKSA9PiB7XG4gICAgICAvLyBOb3RlOiBCZWZvcmUgd2UgcmV0dXJuIHRoZSBtYXBwZWQgb3V0cHV0IHBhdGgsIHdlIG5lZWQgdG8gbm9ybWFsaXplIHRoZSBwYXRoIGRlbGltaXRlcnNcbiAgICAgIC8vIGJlY2F1c2UgdGhlIG91dHB1dCBwYXRoIGlzIHVzdWFsbHkgcGFzc2VkIHRvIFR5cGVTY3JpcHQgd2hpY2ggc29tZXRpbWVzIG9ubHkgZXhwZWN0c1xuICAgICAgLy8gcG9zaXggbm9ybWFsaXplZCBwYXRocyAoZS5nLiBpZiBhIGN1c3RvbSBjb21waWxlciBob3N0IGlzIHVzZWQpXG4gICAgICByZXR1cm4gbm9ybWFsaXplU2VwYXJhdG9ycyhob3N0LnJlc29sdmUob3V0RGlyLCBob3N0LnJlbGF0aXZlKHJvb3REaXIsIHNyY0ZpbGVOYW1lKSkpO1xuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgLy8gTm90ZTogQmVmb3JlIHdlIHJldHVybiB0aGUgb3V0cHV0IHBhdGgsIHdlIG5lZWQgdG8gbm9ybWFsaXplIHRoZSBwYXRoIGRlbGltaXRlcnMgYmVjYXVzZVxuICAgIC8vIHRoZSBvdXRwdXQgcGF0aCBpcyB1c3VhbGx5IHBhc3NlZCB0byBUeXBlU2NyaXB0IHdoaWNoIG9ubHkgcGFzc2VzIGFyb3VuZCBwb3NpeFxuICAgIC8vIG5vcm1hbGl6ZWQgcGF0aHMgKGUuZy4gaWYgYSBjdXN0b20gY29tcGlsZXIgaG9zdCBpcyB1c2VkKVxuICAgIHJldHVybiAoc3JjRmlsZU5hbWUpID0+IG5vcm1hbGl6ZVNlcGFyYXRvcnMoc3JjRmlsZU5hbWUpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpMThuRXh0cmFjdChcbiAgICBmb3JtYXROYW1lOiBzdHJpbmcgfCBudWxsLCBvdXRGaWxlOiBzdHJpbmcgfCBudWxsLCBob3N0OiB0cy5Db21waWxlckhvc3QsXG4gICAgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zLCBidW5kbGU6IE1lc3NhZ2VCdW5kbGUpOiBzdHJpbmdbXSB7XG4gIGZvcm1hdE5hbWUgPSBmb3JtYXROYW1lIHx8ICd4bGYnO1xuICAvLyBDaGVja3MgdGhlIGZvcm1hdCBhbmQgcmV0dXJucyB0aGUgZXh0ZW5zaW9uXG4gIGNvbnN0IGV4dCA9IGkxOG5HZXRFeHRlbnNpb24oZm9ybWF0TmFtZSk7XG4gIGNvbnN0IGNvbnRlbnQgPSBpMThuU2VyaWFsaXplKGJ1bmRsZSwgZm9ybWF0TmFtZSwgb3B0aW9ucyk7XG4gIGNvbnN0IGRzdEZpbGUgPSBvdXRGaWxlIHx8IGBtZXNzYWdlcy4ke2V4dH1gO1xuICBjb25zdCBkc3RQYXRoID0gcGF0aC5yZXNvbHZlKG9wdGlvbnMub3V0RGlyIHx8IG9wdGlvbnMuYmFzZVBhdGggISwgZHN0RmlsZSk7XG4gIGhvc3Qud3JpdGVGaWxlKGRzdFBhdGgsIGNvbnRlbnQsIGZhbHNlLCB1bmRlZmluZWQsIFtdKTtcbiAgcmV0dXJuIFtkc3RQYXRoXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGkxOG5TZXJpYWxpemUoXG4gICAgYnVuZGxlOiBNZXNzYWdlQnVuZGxlLCBmb3JtYXROYW1lOiBzdHJpbmcsIG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucyk6IHN0cmluZyB7XG4gIGNvbnN0IGZvcm1hdCA9IGZvcm1hdE5hbWUudG9Mb3dlckNhc2UoKTtcbiAgbGV0IHNlcmlhbGl6ZXI6IFNlcmlhbGl6ZXI7XG5cbiAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICBjYXNlICd4bWInOlxuICAgICAgc2VyaWFsaXplciA9IG5ldyBYbWIoKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3hsaWZmMic6XG4gICAgY2FzZSAneGxmMic6XG4gICAgICBzZXJpYWxpemVyID0gbmV3IFhsaWZmMigpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAneGxmJzpcbiAgICBjYXNlICd4bGlmZic6XG4gICAgZGVmYXVsdDpcbiAgICAgIHNlcmlhbGl6ZXIgPSBuZXcgWGxpZmYoKTtcbiAgfVxuXG4gIHJldHVybiBidW5kbGUud3JpdGUoc2VyaWFsaXplciwgZ2V0UGF0aE5vcm1hbGl6ZXIob3B0aW9ucy5iYXNlUGF0aCkpO1xufVxuXG5mdW5jdGlvbiBnZXRQYXRoTm9ybWFsaXplcihiYXNlUGF0aD86IHN0cmluZykge1xuICAvLyBub3JtYWxpemUgc291cmNlIHBhdGhzIGJ5IHJlbW92aW5nIHRoZSBiYXNlIHBhdGggYW5kIGFsd2F5cyB1c2luZyBcIi9cIiBhcyBhIHNlcGFyYXRvclxuICByZXR1cm4gKHNvdXJjZVBhdGg6IHN0cmluZykgPT4ge1xuICAgIHNvdXJjZVBhdGggPSBiYXNlUGF0aCA/IHBhdGgucmVsYXRpdmUoYmFzZVBhdGgsIHNvdXJjZVBhdGgpIDogc291cmNlUGF0aDtcbiAgICByZXR1cm4gc291cmNlUGF0aC5zcGxpdChwYXRoLnNlcCkuam9pbignLycpO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaTE4bkdldEV4dGVuc2lvbihmb3JtYXROYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBmb3JtYXQgPSBmb3JtYXROYW1lLnRvTG93ZXJDYXNlKCk7XG5cbiAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICBjYXNlICd4bWInOlxuICAgICAgcmV0dXJuICd4bWInO1xuICAgIGNhc2UgJ3hsZic6XG4gICAgY2FzZSAneGxpZic6XG4gICAgY2FzZSAneGxpZmYnOlxuICAgIGNhc2UgJ3hsZjInOlxuICAgIGNhc2UgJ3hsaWZmMic6XG4gICAgICByZXR1cm4gJ3hsZic7XG4gIH1cblxuICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIGZvcm1hdCBcIiR7Zm9ybWF0TmFtZX1cImApO1xufVxuXG5mdW5jdGlvbiBtZXJnZUVtaXRSZXN1bHRzKGVtaXRSZXN1bHRzOiB0cy5FbWl0UmVzdWx0W10pOiB0cy5FbWl0UmVzdWx0IHtcbiAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICBsZXQgZW1pdFNraXBwZWQgPSBmYWxzZTtcbiAgY29uc3QgZW1pdHRlZEZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IGVyIG9mIGVtaXRSZXN1bHRzKSB7XG4gICAgZGlhZ25vc3RpY3MucHVzaCguLi5lci5kaWFnbm9zdGljcyk7XG4gICAgZW1pdFNraXBwZWQgPSBlbWl0U2tpcHBlZCB8fCBlci5lbWl0U2tpcHBlZDtcbiAgICBlbWl0dGVkRmlsZXMucHVzaCguLi4oZXIuZW1pdHRlZEZpbGVzIHx8IFtdKSk7XG4gIH1cbiAgcmV0dXJuIHtkaWFnbm9zdGljcywgZW1pdFNraXBwZWQsIGVtaXR0ZWRGaWxlc307XG59XG5cbmZ1bmN0aW9uIGRpYWdub3N0aWNTb3VyY2VPZlNwYW4oc3BhbjogUGFyc2VTb3VyY2VTcGFuKTogdHMuU291cmNlRmlsZSB7XG4gIC8vIEZvciBkaWFnbm9zdGljcywgVHlwZVNjcmlwdCBvbmx5IHVzZXMgdGhlIGZpbGVOYW1lIGFuZCB0ZXh0IHByb3BlcnRpZXMuXG4gIC8vIFRoZSByZWR1bmRhbnQgJygpJyBhcmUgaGVyZSBpcyB0byBhdm9pZCBoYXZpbmcgY2xhbmctZm9ybWF0IGJyZWFraW5nIHRoZSBsaW5lIGluY29ycmVjdGx5LlxuICByZXR1cm4gKHsgZmlsZU5hbWU6IHNwYW4uc3RhcnQuZmlsZS51cmwsIHRleHQ6IHNwYW4uc3RhcnQuZmlsZS5jb250ZW50IH0gYXMgYW55KTtcbn1cblxuZnVuY3Rpb24gZGlhZ25vc3RpY1NvdXJjZU9mRmlsZU5hbWUoZmlsZU5hbWU6IHN0cmluZywgcHJvZ3JhbTogdHMuUHJvZ3JhbSk6IHRzLlNvdXJjZUZpbGUge1xuICBjb25zdCBzb3VyY2VGaWxlID0gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKTtcbiAgaWYgKHNvdXJjZUZpbGUpIHJldHVybiBzb3VyY2VGaWxlO1xuXG4gIC8vIElmIHdlIGFyZSByZXBvcnRpbmcgZGlhZ25vc3RpY3MgZm9yIGEgc291cmNlIGZpbGUgdGhhdCBpcyBub3QgaW4gdGhlIHByb2plY3QgdGhlbiB3ZSBuZWVkXG4gIC8vIHRvIGZha2UgYSBzb3VyY2UgZmlsZSBzbyB0aGUgZGlhZ25vc3RpYyBmb3JtYXR0aW5nIHJvdXRpbmVzIGNhbiBlbWl0IHRoZSBmaWxlIG5hbWUuXG4gIC8vIFRoZSByZWR1bmRhbnQgJygpJyBhcmUgaGVyZSBpcyB0byBhdm9pZCBoYXZpbmcgY2xhbmctZm9ybWF0IGJyZWFraW5nIHRoZSBsaW5lIGluY29ycmVjdGx5LlxuICByZXR1cm4gKHsgZmlsZU5hbWUsIHRleHQ6ICcnIH0gYXMgYW55KTtcbn1cblxuXG5mdW5jdGlvbiBkaWFnbm9zdGljQ2hhaW5Gcm9tRm9ybWF0dGVkRGlhZ25vc3RpY0NoYWluKGNoYWluOiBGb3JtYXR0ZWRNZXNzYWdlQ2hhaW4pOlxuICAgIERpYWdub3N0aWNNZXNzYWdlQ2hhaW4ge1xuICByZXR1cm4ge1xuICAgIG1lc3NhZ2VUZXh0OiBjaGFpbi5tZXNzYWdlLFxuICAgIG5leHQ6IGNoYWluLm5leHQgJiYgZGlhZ25vc3RpY0NoYWluRnJvbUZvcm1hdHRlZERpYWdub3N0aWNDaGFpbihjaGFpbi5uZXh0KSxcbiAgICBwb3NpdGlvbjogY2hhaW4ucG9zaXRpb25cbiAgfTtcbn1cblxuZnVuY3Rpb24gc3ludGF4RXJyb3JUb0RpYWdub3N0aWNzKGVycm9yOiBFcnJvcik6IERpYWdub3N0aWNbXSB7XG4gIGNvbnN0IHBhcnNlckVycm9ycyA9IGdldFBhcnNlRXJyb3JzKGVycm9yKTtcbiAgaWYgKHBhcnNlckVycm9ycyAmJiBwYXJzZXJFcnJvcnMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHBhcnNlckVycm9ycy5tYXA8RGlhZ25vc3RpYz4oZSA9PiAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZVRleHQ6IGUuY29udGV4dHVhbE1lc3NhZ2UoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGU6IGRpYWdub3N0aWNTb3VyY2VPZlNwYW4oZS5zcGFuKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBlLnNwYW4uc3RhcnQub2Zmc2V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGVuZ3RoOiBlLnNwYW4uZW5kLm9mZnNldCAtIGUuc3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiBTT1VSQ0UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBERUZBVUxUX0VSUk9SX0NPREVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gIH0gZWxzZSBpZiAoaXNGb3JtYXR0ZWRFcnJvcihlcnJvcikpIHtcbiAgICByZXR1cm4gW3tcbiAgICAgIG1lc3NhZ2VUZXh0OiBlcnJvci5tZXNzYWdlLFxuICAgICAgY2hhaW46IGVycm9yLmNoYWluICYmIGRpYWdub3N0aWNDaGFpbkZyb21Gb3JtYXR0ZWREaWFnbm9zdGljQ2hhaW4oZXJyb3IuY2hhaW4pLFxuICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgIHNvdXJjZTogU09VUkNFLFxuICAgICAgY29kZTogREVGQVVMVF9FUlJPUl9DT0RFLFxuICAgICAgcG9zaXRpb246IGVycm9yLnBvc2l0aW9uXG4gICAgfV07XG4gIH1cbiAgLy8gUHJvZHVjZSBhIERpYWdub3N0aWMgYW55d2F5IHNpbmNlIHdlIGtub3cgZm9yIHN1cmUgYGVycm9yYCBpcyBhIFN5bnRheEVycm9yXG4gIHJldHVybiBbe1xuICAgIG1lc3NhZ2VUZXh0OiBlcnJvci5tZXNzYWdlLFxuICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgY29kZTogREVGQVVMVF9FUlJPUl9DT0RFLFxuICAgIHNvdXJjZTogU09VUkNFLFxuICB9XTtcbn1cbiJdfQ==