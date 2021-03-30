/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
        define("@angular/compiler-cli/src/transformers/program", ["require", "exports", "tslib", "@angular/compiler", "fs", "path", "typescript", "@angular/compiler-cli/src/diagnostics/translate_diagnostics", "@angular/compiler-cli/src/metadata/index", "@angular/compiler-cli/src/ngtsc/program", "@angular/compiler-cli/src/typescript_support", "@angular/compiler-cli/src/transformers/api", "@angular/compiler-cli/src/transformers/compiler_host", "@angular/compiler-cli/src/transformers/inline_resources", "@angular/compiler-cli/src/transformers/lower_expressions", "@angular/compiler-cli/src/transformers/metadata_cache", "@angular/compiler-cli/src/transformers/node_emitter_transform", "@angular/compiler-cli/src/transformers/r3_metadata_transform", "@angular/compiler-cli/src/transformers/r3_strip_decorators", "@angular/compiler-cli/src/transformers/r3_transform", "@angular/compiler-cli/src/transformers/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.i18nGetExtension = exports.i18nSerialize = exports.i18nExtract = exports.createSrcToOutPathMapper = exports.createProgram = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var fs = require("fs");
    var path = require("path");
    var ts = require("typescript");
    var translate_diagnostics_1 = require("@angular/compiler-cli/src/diagnostics/translate_diagnostics");
    var metadata_1 = require("@angular/compiler-cli/src/metadata/index");
    var program_1 = require("@angular/compiler-cli/src/ngtsc/program");
    var typescript_support_1 = require("@angular/compiler-cli/src/typescript_support");
    var api_1 = require("@angular/compiler-cli/src/transformers/api");
    var compiler_host_1 = require("@angular/compiler-cli/src/transformers/compiler_host");
    var inline_resources_1 = require("@angular/compiler-cli/src/transformers/inline_resources");
    var lower_expressions_1 = require("@angular/compiler-cli/src/transformers/lower_expressions");
    var metadata_cache_1 = require("@angular/compiler-cli/src/transformers/metadata_cache");
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
    var AngularCompilerProgram = /** @class */ (function () {
        function AngularCompilerProgram(rootNames, options, host, oldProgram) {
            var _a;
            var _this = this;
            this.options = options;
            this.host = host;
            this._optionsDiagnostics = [];
            this.rootNames = tslib_1.__spread(rootNames);
            if (!options.disableTypeScriptVersionCheck) {
                typescript_support_1.verifySupportedTypeScriptVersion();
            }
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
        AngularCompilerProgram.prototype.getTsProgram = function () {
            return this.tsProgram;
        };
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
                    writeFile: writeTsFile,
                    emitOnlyDtsFiles: emitOnlyDtsFiles,
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
                        writeFile: writeTsFile,
                        emitOnlyDtsFiles: emitOnlyDtsFiles,
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
                        writeFile: writeTsFile,
                        emitOnlyDtsFiles: emitOnlyDtsFiles,
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
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AngularCompilerProgram.prototype, "hostAdapter", {
            get: function () {
                if (!this._hostAdapter) {
                    this._createCompiler();
                }
                return this._hostAdapter;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AngularCompilerProgram.prototype, "analyzedModules", {
            get: function () {
                if (!this._analyzedModules) {
                    this.initSync();
                }
                return this._analyzedModules;
            },
            enumerable: false,
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
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AngularCompilerProgram.prototype, "tsProgram", {
            get: function () {
                if (!this._tsProgram) {
                    this.initSync();
                }
                return this._tsProgram;
            },
            enumerable: false,
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
            enumerable: false,
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
            var annotateForClosureCompiler = this.options.annotateForClosureCompiler || false;
            if (genFiles) {
                beforeTs.push(node_emitter_transform_1.getAngularEmitterTransformFactory(genFiles, this.getTsProgram(), annotateForClosureCompiler));
            }
            if (partialModules) {
                beforeTs.push(r3_transform_1.getAngularClassTransformerFactory(partialModules, annotateForClosureCompiler));
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
            var sourceFilesToEmit = this.tsProgram.getSourceFiles().filter(function (sf) {
                return !sf.isDeclarationFile && !util_1.GENERATED_FILES.test(sf.fileName);
            });
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
            i18nUseExternalIds: options.i18nUseExternalIds,
            translations: translations,
            missingTranslation: missingTranslation,
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
            next: chain.next && chain.next.map(diagnosticChainFromFormattedDiagnosticChain),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3JhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL3Byb2dyYW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0E7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFzWjtJQUN0Wix1QkFBeUI7SUFDekIsMkJBQTZCO0lBQzdCLCtCQUFpQztJQUVqQyxxR0FBeUY7SUFDekYscUVBQXFGO0lBQ3JGLG1FQUE4QztJQUM5QyxtRkFBdUU7SUFFdkUsa0VBQW9QO0lBQ3BQLHNGQUFnSDtJQUNoSCw0RkFBMEc7SUFDMUcsOEZBQWtHO0lBQ2xHLHdGQUFvRTtJQUNwRSx3R0FBMkU7SUFDM0Usc0dBQXlFO0lBQ3pFLGtHQUE4RztJQUM5RyxvRkFBaUU7SUFDakUsb0VBQTJKO0lBRzNKOzs7T0FHRztJQUNILElBQU0sbUNBQW1DLEdBQUcsRUFBRSxDQUFDO0lBRy9DOztPQUVHO0lBQ0gsSUFBTSxZQUFZLEdBQUcsQ0FBQyxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFFOUU7O09BRUc7SUFDSCxJQUFNLGVBQWUsb0JBQU8sWUFBWSxHQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFDLENBQUM7SUFFN0UsSUFBTSxxQkFBcUIsR0FBRztRQUM1QixXQUFXO1FBQ1gsV0FBVztRQUNYLFlBQVk7UUFDWixVQUFVO1FBQ1YsTUFBTTtLQUNQLENBQUM7SUFFRixJQUFNLFlBQVksR0FBc0I7UUFDdEMsU0FBUyxFQUFFLEVBQUU7UUFDYix5QkFBeUIsRUFBRSxJQUFJLEdBQUcsRUFBRTtRQUNwQyxLQUFLLEVBQUUsRUFBRTtLQUNWLENBQUM7SUFFRixJQUFNLG1CQUFtQixHQUFtQixVQUFDLEVBTzVDO1lBTkMsT0FBTyxhQUFBLEVBQ1AsZ0JBQWdCLHNCQUFBLEVBQ2hCLFNBQVMs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RUFSRyxDQVFILENBQUMsQ0FBQztTQUN6QzthQUFNLElBQUksMkJBQWdCLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDbEMsT0FBTyxDQUFDO29CQUNOLFdBQVcsRUFBRSxLQUFLLENBQUMsT0FBTztvQkFDMUIsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLLElBQUksMkNBQTJDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztvQkFDOUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLO29CQUNyQyxNQUFNLEVBQUUsWUFBTTtvQkFDZCxJQUFJLEVBQUUsd0JBQWtCO29CQUN4QixRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVE7aUJBQ3pCLENBQUMsQ0FBQztTQUNKO1FBQ0QsOEVBQThFO1FBQzlFLE9BQU8sQ0FBQztnQkFDTixXQUFXLEVBQUUsS0FBSyxDQUFDLE9BQU87Z0JBQzFCLFFBQVEsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSztnQkFDckMsSUFBSSxFQUFFLHdCQUFrQjtnQkFDeEIsTUFBTSxFQUFFLFlBQU07YUFDZixDQUFDLENBQUM7SUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBb3RDb21waWxlciwgQW90Q29tcGlsZXJIb3N0LCBBb3RDb21waWxlck9wdGlvbnMsIGNvcmUsIGNyZWF0ZUFvdENvbXBpbGVyLCBFbWl0dGVyVmlzaXRvckNvbnRleHQsIEZvcm1hdHRlZE1lc3NhZ2VDaGFpbiwgR2VuZXJhdGVkRmlsZSwgZ2V0UGFyc2VFcnJvcnMsIGlzRm9ybWF0dGVkRXJyb3IsIGlzU3ludGF4RXJyb3IsIE1lc3NhZ2VCdW5kbGUsIE5nQW5hbHl6ZWRGaWxlLCBOZ0FuYWx5emVkRmlsZVdpdGhJbmplY3RhYmxlcywgTmdBbmFseXplZE1vZHVsZXMsIFBhcnNlU291cmNlU3BhbiwgUGFydGlhbE1vZHVsZSwgUG9zaXRpb24sIFNlcmlhbGl6ZXIsIFN0YXRpY1N5bWJvbCwgVHlwZVNjcmlwdEVtaXR0ZXIsIFhsaWZmLCBYbGlmZjIsIFhtYn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge3RyYW5zbGF0ZURpYWdub3N0aWNzLCBUeXBlQ2hlY2tIb3N0fSBmcm9tICcuLi9kaWFnbm9zdGljcy90cmFuc2xhdGVfZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtjcmVhdGVCdW5kbGVJbmRleEhvc3QsIE1ldGFkYXRhQ29sbGVjdG9yLCBNb2R1bGVNZXRhZGF0YX0gZnJvbSAnLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtOZ3RzY1Byb2dyYW19IGZyb20gJy4uL25ndHNjL3Byb2dyYW0nO1xuaW1wb3J0IHt2ZXJpZnlTdXBwb3J0ZWRUeXBlU2NyaXB0VmVyc2lvbn0gZnJvbSAnLi4vdHlwZXNjcmlwdF9zdXBwb3J0JztcblxuaW1wb3J0IHtDb21waWxlckhvc3QsIENvbXBpbGVyT3B0aW9ucywgQ3VzdG9tVHJhbnNmb3JtZXJzLCBERUZBVUxUX0VSUk9SX0NPREUsIERpYWdub3N0aWMsIERpYWdub3N0aWNNZXNzYWdlQ2hhaW4sIEVtaXRGbGFncywgTGF6eVJvdXRlLCBMaWJyYXJ5U3VtbWFyeSwgUHJvZ3JhbSwgU09VUkNFLCBUc0VtaXRBcmd1bWVudHMsIFRzRW1pdENhbGxiYWNrLCBUc01lcmdlRW1pdFJlc3VsdHNDYWxsYmFja30gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtDb2RlR2VuZXJhdG9yLCBnZXRPcmlnaW5hbFJlZmVyZW5jZXMsIFRzQ29tcGlsZXJBb3RDb21waWxlclR5cGVDaGVja0hvc3RBZGFwdGVyfSBmcm9tICcuL2NvbXBpbGVyX2hvc3QnO1xuaW1wb3J0IHtnZXRJbmxpbmVSZXNvdXJjZXNUcmFuc2Zvcm1GYWN0b3J5LCBJbmxpbmVSZXNvdXJjZXNNZXRhZGF0YVRyYW5zZm9ybWVyfSBmcm9tICcuL2lubGluZV9yZXNvdXJjZXMnO1xuaW1wb3J0IHtnZXRFeHByZXNzaW9uTG93ZXJpbmdUcmFuc2Zvcm1GYWN0b3J5LCBMb3dlck1ldGFkYXRhVHJhbnNmb3JtfSBmcm9tICcuL2xvd2VyX2V4cHJlc3Npb25zJztcbmltcG9ydCB7TWV0YWRhdGFDYWNoZSwgTWV0YWRhdGFUcmFuc2Zvcm1lcn0gZnJvbSAnLi9tZXRhZGF0YV9jYWNoZSc7XG5pbXBvcnQge2dldEFuZ3VsYXJFbWl0dGVyVHJhbnNmb3JtRmFjdG9yeX0gZnJvbSAnLi9ub2RlX2VtaXR0ZXJfdHJhbnNmb3JtJztcbmltcG9ydCB7UGFydGlhbE1vZHVsZU1ldGFkYXRhVHJhbnNmb3JtZXJ9IGZyb20gJy4vcjNfbWV0YWRhdGFfdHJhbnNmb3JtJztcbmltcG9ydCB7Z2V0RGVjb3JhdG9yU3RyaXBUcmFuc2Zvcm1lckZhY3RvcnksIFN0cmlwRGVjb3JhdG9yc01ldGFkYXRhVHJhbnNmb3JtZXJ9IGZyb20gJy4vcjNfc3RyaXBfZGVjb3JhdG9ycyc7XG5pbXBvcnQge2dldEFuZ3VsYXJDbGFzc1RyYW5zZm9ybWVyRmFjdG9yeX0gZnJvbSAnLi9yM190cmFuc2Zvcm0nO1xuaW1wb3J0IHtjcmVhdGVNZXNzYWdlRGlhZ25vc3RpYywgRFRTLCBHRU5FUkFURURfRklMRVMsIGlzSW5Sb290RGlyLCBuZ1RvVHNEaWFnbm9zdGljLCBTdHJ1Y3R1cmVJc1JldXNlZCwgVFMsIHRzU3RydWN0dXJlSXNSZXVzZWQsIHVzZXJFcnJvcn0gZnJvbSAnLi91dGlsJztcblxuXG4vKipcbiAqIE1heGltdW0gbnVtYmVyIG9mIGZpbGVzIHRoYXQgYXJlIGVtaXRhYmxlIHZpYSBjYWxsaW5nIHRzLlByb2dyYW0uZW1pdFxuICogcGFzc2luZyBpbmRpdmlkdWFsIHRhcmdldFNvdXJjZUZpbGVzLlxuICovXG5jb25zdCBNQVhfRklMRV9DT1VOVF9GT1JfU0lOR0xFX0ZJTEVfRU1JVCA9IDIwO1xuXG5cbi8qKlxuICogRmllbGRzIHRvIGxvd2VyIHdpdGhpbiBtZXRhZGF0YSBpbiByZW5kZXIyIG1vZGUuXG4gKi9cbmNvbnN0IExPV0VSX0ZJRUxEUyA9IFsndXNlVmFsdWUnLCAndXNlRmFjdG9yeScsICdkYXRhJywgJ2lkJywgJ2xvYWRDaGlsZHJlbiddO1xuXG4vKipcbiAqIEZpZWxkcyB0byBsb3dlciB3aXRoaW4gbWV0YWRhdGEgaW4gcmVuZGVyMyBtb2RlLlxuICovXG5jb25zdCBSM19MT1dFUl9GSUVMRFMgPSBbLi4uTE9XRVJfRklFTERTLCAncHJvdmlkZXJzJywgJ2ltcG9ydHMnLCAnZXhwb3J0cyddO1xuXG5jb25zdCBSM19SRUlGSUVEX0RFQ09SQVRPUlMgPSBbXG4gICdDb21wb25lbnQnLFxuICAnRGlyZWN0aXZlJyxcbiAgJ0luamVjdGFibGUnLFxuICAnTmdNb2R1bGUnLFxuICAnUGlwZScsXG5dO1xuXG5jb25zdCBlbXB0eU1vZHVsZXM6IE5nQW5hbHl6ZWRNb2R1bGVzID0ge1xuICBuZ01vZHVsZXM6IFtdLFxuICBuZ01vZHVsZUJ5UGlwZU9yRGlyZWN0aXZlOiBuZXcgTWFwKCksXG4gIGZpbGVzOiBbXVxufTtcblxuY29uc3QgZGVmYXVsdEVtaXRDYWxsYmFjazogVHNFbWl0Q2FsbGJhY2sgPSAoe1xuICBwcm9ncmFtLFxuICB0YXJnZXRTb3VyY2VGaWxlLFxuICB3cml0ZUZpbGUsXG4gIGNhbmNlbGxhdGlvblRva2VuLFxuICBlbWl0T25seUR0c0ZpbGVzLFxuICBjdXN0b21UcmFuc2Zvcm1lcnNcbn0pID0+XG4gICAgcHJvZ3JhbS5lbWl0KFxuICAgICAgICB0YXJnZXRTb3VyY2VGaWxlLCB3cml0ZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuLCBlbWl0T25seUR0c0ZpbGVzLCBjdXN0b21UcmFuc2Zvcm1lcnMpO1xuXG5jbGFzcyBBbmd1bGFyQ29tcGlsZXJQcm9ncmFtIGltcGxlbWVudHMgUHJvZ3JhbSB7XG4gIHByaXZhdGUgcm9vdE5hbWVzOiBzdHJpbmdbXTtcbiAgcHJpdmF0ZSBtZXRhZGF0YUNhY2hlOiBNZXRhZGF0YUNhY2hlO1xuICAvLyBNZXRhZGF0YSBjYWNoZSB1c2VkIGV4Y2x1c2l2ZWx5IGZvciB0aGUgZmxhdCBtb2R1bGUgaW5kZXhcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgZmxhdE1vZHVsZU1ldGFkYXRhQ2FjaGUhOiBNZXRhZGF0YUNhY2hlO1xuICBwcml2YXRlIGxvd2VyaW5nTWV0YWRhdGFUcmFuc2Zvcm06IExvd2VyTWV0YWRhdGFUcmFuc2Zvcm07XG4gIHByaXZhdGUgb2xkUHJvZ3JhbUxpYnJhcnlTdW1tYXJpZXM6IE1hcDxzdHJpbmcsIExpYnJhcnlTdW1tYXJ5Pnx1bmRlZmluZWQ7XG4gIHByaXZhdGUgb2xkUHJvZ3JhbUVtaXR0ZWRHZW5lcmF0ZWRGaWxlczogTWFwPHN0cmluZywgR2VuZXJhdGVkRmlsZT58dW5kZWZpbmVkO1xuICBwcml2YXRlIG9sZFByb2dyYW1FbWl0dGVkU291cmNlRmlsZXM6IE1hcDxzdHJpbmcsIHRzLlNvdXJjZUZpbGU+fHVuZGVmaW5lZDtcbiAgLy8gTm90ZTogVGhpcyB3aWxsIGJlIGNsZWFyZWQgb3V0IGFzIHNvb24gYXMgd2UgY3JlYXRlIHRoZSBfdHNQcm9ncmFtXG4gIHByaXZhdGUgb2xkVHNQcm9ncmFtOiB0cy5Qcm9ncmFtfHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBlbWl0dGVkTGlicmFyeVN1bW1hcmllczogTGlicmFyeVN1bW1hcnlbXXx1bmRlZmluZWQ7XG4gIHByaXZhdGUgZW1pdHRlZEdlbmVyYXRlZEZpbGVzOiBHZW5lcmF0ZWRGaWxlW118dW5kZWZpbmVkO1xuICBwcml2YXRlIGVtaXR0ZWRTb3VyY2VGaWxlczogdHMuU291cmNlRmlsZVtdfHVuZGVmaW5lZDtcblxuICAvLyBMYXppbHkgaW5pdGlhbGl6ZWQgZmllbGRzXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwcml2YXRlIF9jb21waWxlciE6IEFvdENvbXBpbGVyO1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgcHJpdmF0ZSBfaG9zdEFkYXB0ZXIhOiBUc0NvbXBpbGVyQW90Q29tcGlsZXJUeXBlQ2hlY2tIb3N0QWRhcHRlcjtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgX3RzUHJvZ3JhbSE6IHRzLlByb2dyYW07XG4gIHByaXZhdGUgX2FuYWx5emVkTW9kdWxlczogTmdBbmFseXplZE1vZHVsZXN8dW5kZWZpbmVkO1xuICBwcml2YXRlIF9hbmFseXplZEluamVjdGFibGVzOiBOZ0FuYWx5emVkRmlsZVdpdGhJbmplY3RhYmxlc1tdfHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfc3RydWN0dXJhbERpYWdub3N0aWNzOiBEaWFnbm9zdGljW118dW5kZWZpbmVkO1xuICBwcml2YXRlIF9wcm9ncmFtV2l0aFN0dWJzOiB0cy5Qcm9ncmFtfHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfb3B0aW9uc0RpYWdub3N0aWNzOiBEaWFnbm9zdGljW10gPSBbXTtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgX3JlaWZpZWREZWNvcmF0b3JzITogU2V0PFN0YXRpY1N5bWJvbD47XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICByb290TmFtZXM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPiwgcHJpdmF0ZSBvcHRpb25zOiBDb21waWxlck9wdGlvbnMsXG4gICAgICBwcml2YXRlIGhvc3Q6IENvbXBpbGVySG9zdCwgb2xkUHJvZ3JhbT86IFByb2dyYW0pIHtcbiAgICB0aGlzLnJvb3ROYW1lcyA9IFsuLi5yb290TmFtZXNdO1xuXG4gICAgaWYgKCFvcHRpb25zLmRpc2FibGVUeXBlU2NyaXB0VmVyc2lvbkNoZWNrKSB7XG4gICAgICB2ZXJpZnlTdXBwb3J0ZWRUeXBlU2NyaXB0VmVyc2lvbigpO1xuICAgIH1cblxuICAgIHRoaXMub2xkVHNQcm9ncmFtID0gb2xkUHJvZ3JhbSA/IG9sZFByb2dyYW0uZ2V0VHNQcm9ncmFtKCkgOiB1bmRlZmluZWQ7XG4gICAgaWYgKG9sZFByb2dyYW0pIHtcbiAgICAgIHRoaXMub2xkUHJvZ3JhbUxpYnJhcnlTdW1tYXJpZXMgPSBvbGRQcm9ncmFtLmdldExpYnJhcnlTdW1tYXJpZXMoKTtcbiAgICAgIHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRHZW5lcmF0ZWRGaWxlcyA9IG9sZFByb2dyYW0uZ2V0RW1pdHRlZEdlbmVyYXRlZEZpbGVzKCk7XG4gICAgICB0aGlzLm9sZFByb2dyYW1FbWl0dGVkU291cmNlRmlsZXMgPSBvbGRQcm9ncmFtLmdldEVtaXR0ZWRTb3VyY2VGaWxlcygpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmZsYXRNb2R1bGVPdXRGaWxlKSB7XG4gICAgICBjb25zdCB7aG9zdDogYnVuZGxlSG9zdCwgaW5kZXhOYW1lLCBlcnJvcnN9ID1cbiAgICAgICAgICBjcmVhdGVCdW5kbGVJbmRleEhvc3Qob3B0aW9ucywgdGhpcy5yb290TmFtZXMsIGhvc3QsICgpID0+IHRoaXMuZmxhdE1vZHVsZU1ldGFkYXRhQ2FjaGUpO1xuICAgICAgaWYgKGVycm9ycykge1xuICAgICAgICB0aGlzLl9vcHRpb25zRGlhZ25vc3RpY3MucHVzaCguLi5lcnJvcnMubWFwKGUgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBlLmNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZVRleHQ6IGUubWVzc2FnZVRleHQgYXMgc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiBTT1VSQ0UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBERUZBVUxUX0VSUk9SX0NPREVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5yb290TmFtZXMucHVzaChpbmRleE5hbWUhKTtcbiAgICAgICAgdGhpcy5ob3N0ID0gYnVuZGxlSG9zdDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmxvd2VyaW5nTWV0YWRhdGFUcmFuc2Zvcm0gPVxuICAgICAgICBuZXcgTG93ZXJNZXRhZGF0YVRyYW5zZm9ybShvcHRpb25zLmVuYWJsZUl2eSAhPT0gZmFsc2UgPyBSM19MT1dFUl9GSUVMRFMgOiBMT1dFUl9GSUVMRFMpO1xuICAgIHRoaXMubWV0YWRhdGFDYWNoZSA9IHRoaXMuY3JlYXRlTWV0YWRhdGFDYWNoZShbdGhpcy5sb3dlcmluZ01ldGFkYXRhVHJhbnNmb3JtXSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZU1ldGFkYXRhQ2FjaGUodHJhbnNmb3JtZXJzOiBNZXRhZGF0YVRyYW5zZm9ybWVyW10pIHtcbiAgICByZXR1cm4gbmV3IE1ldGFkYXRhQ2FjaGUoXG4gICAgICAgIG5ldyBNZXRhZGF0YUNvbGxlY3Rvcih7cXVvdGVkTmFtZXM6IHRydWV9KSwgISF0aGlzLm9wdGlvbnMuc3RyaWN0TWV0YWRhdGFFbWl0LFxuICAgICAgICB0cmFuc2Zvcm1lcnMpO1xuICB9XG5cbiAgZ2V0TGlicmFyeVN1bW1hcmllcygpOiBNYXA8c3RyaW5nLCBMaWJyYXJ5U3VtbWFyeT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBNYXA8c3RyaW5nLCBMaWJyYXJ5U3VtbWFyeT4oKTtcbiAgICBpZiAodGhpcy5vbGRQcm9ncmFtTGlicmFyeVN1bW1hcmllcykge1xuICAgICAgdGhpcy5vbGRQcm9ncmFtTGlicmFyeVN1bW1hcmllcy5mb3JFYWNoKChzdW1tYXJ5LCBmaWxlTmFtZSkgPT4gcmVzdWx0LnNldChmaWxlTmFtZSwgc3VtbWFyeSkpO1xuICAgIH1cbiAgICBpZiAodGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcykge1xuICAgICAgdGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcy5mb3JFYWNoKFxuICAgICAgICAgIChzdW1tYXJ5LCBmaWxlTmFtZSkgPT4gcmVzdWx0LnNldChzdW1tYXJ5LmZpbGVOYW1lLCBzdW1tYXJ5KSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnZXRFbWl0dGVkR2VuZXJhdGVkRmlsZXMoKTogTWFwPHN0cmluZywgR2VuZXJhdGVkRmlsZT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBNYXA8c3RyaW5nLCBHZW5lcmF0ZWRGaWxlPigpO1xuICAgIGlmICh0aGlzLm9sZFByb2dyYW1FbWl0dGVkR2VuZXJhdGVkRmlsZXMpIHtcbiAgICAgIHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRHZW5lcmF0ZWRGaWxlcy5mb3JFYWNoKFxuICAgICAgICAgIChnZW5GaWxlLCBmaWxlTmFtZSkgPT4gcmVzdWx0LnNldChmaWxlTmFtZSwgZ2VuRmlsZSkpO1xuICAgIH1cbiAgICBpZiAodGhpcy5lbWl0dGVkR2VuZXJhdGVkRmlsZXMpIHtcbiAgICAgIHRoaXMuZW1pdHRlZEdlbmVyYXRlZEZpbGVzLmZvckVhY2goKGdlbkZpbGUpID0+IHJlc3VsdC5zZXQoZ2VuRmlsZS5nZW5GaWxlVXJsLCBnZW5GaWxlKSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnZXRFbWl0dGVkU291cmNlRmlsZXMoKTogTWFwPHN0cmluZywgdHMuU291cmNlRmlsZT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VGaWxlPigpO1xuICAgIGlmICh0aGlzLm9sZFByb2dyYW1FbWl0dGVkU291cmNlRmlsZXMpIHtcbiAgICAgIHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRTb3VyY2VGaWxlcy5mb3JFYWNoKChzZiwgZmlsZU5hbWUpID0+IHJlc3VsdC5zZXQoZmlsZU5hbWUsIHNmKSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmVtaXR0ZWRTb3VyY2VGaWxlcykge1xuICAgICAgdGhpcy5lbWl0dGVkU291cmNlRmlsZXMuZm9yRWFjaCgoc2YpID0+IHJlc3VsdC5zZXQoc2YuZmlsZU5hbWUsIHNmKSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnZXRUc1Byb2dyYW0oKTogdHMuUHJvZ3JhbSB7XG4gICAgcmV0dXJuIHRoaXMudHNQcm9ncmFtO1xuICB9XG5cbiAgZ2V0VHNPcHRpb25EaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuKSB7XG4gICAgcmV0dXJuIHRoaXMudHNQcm9ncmFtLmdldE9wdGlvbnNEaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbik7XG4gIH1cblxuICBnZXROZ09wdGlvbkRpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOiBSZWFkb25seUFycmF5PERpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gWy4uLnRoaXMuX29wdGlvbnNEaWFnbm9zdGljcywgLi4uZ2V0TmdPcHRpb25EaWFnbm9zdGljcyh0aGlzLm9wdGlvbnMpXTtcbiAgfVxuXG4gIGdldFRzU3ludGFjdGljRGlhZ25vc3RpY3Moc291cmNlRmlsZT86IHRzLlNvdXJjZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOlxuICAgICAgUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgcmV0dXJuIHRoaXMudHNQcm9ncmFtLmdldFN5bnRhY3RpY0RpYWdub3N0aWNzKHNvdXJjZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuKTtcbiAgfVxuXG4gIGdldE5nU3RydWN0dXJhbERpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOiBSZWFkb25seUFycmF5PERpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gdGhpcy5zdHJ1Y3R1cmFsRGlhZ25vc3RpY3M7XG4gIH1cblxuICBnZXRUc1NlbWFudGljRGlhZ25vc3RpY3Moc291cmNlRmlsZT86IHRzLlNvdXJjZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOlxuICAgICAgUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgY29uc3Qgc291cmNlRmlsZXMgPSBzb3VyY2VGaWxlID8gW3NvdXJjZUZpbGVdIDogdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKTtcbiAgICBsZXQgZGlhZ3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIHNvdXJjZUZpbGVzLmZvckVhY2goc2YgPT4ge1xuICAgICAgaWYgKCFHRU5FUkFURURfRklMRVMudGVzdChzZi5maWxlTmFtZSkpIHtcbiAgICAgICAgZGlhZ3MucHVzaCguLi50aGlzLnRzUHJvZ3JhbS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKHNmLCBjYW5jZWxsYXRpb25Ub2tlbikpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBkaWFncztcbiAgfVxuXG4gIGdldE5nU2VtYW50aWNEaWFnbm9zdGljcyhmaWxlTmFtZT86IHN0cmluZywgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbik6XG4gICAgICBSZWFkb25seUFycmF5PERpYWdub3N0aWM+IHtcbiAgICBsZXQgZGlhZ3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZm9yRWFjaChzZiA9PiB7XG4gICAgICBpZiAoR0VORVJBVEVEX0ZJTEVTLnRlc3Qoc2YuZmlsZU5hbWUpICYmICFzZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICBkaWFncy5wdXNoKC4uLnRoaXMudHNQcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3Moc2YsIGNhbmNlbGxhdGlvblRva2VuKSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgY29uc3Qge25nfSA9IHRyYW5zbGF0ZURpYWdub3N0aWNzKHRoaXMuaG9zdEFkYXB0ZXIsIGRpYWdzKTtcbiAgICByZXR1cm4gbmc7XG4gIH1cblxuICBsb2FkTmdTdHJ1Y3R1cmVBc3luYygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5fYW5hbHl6ZWRNb2R1bGVzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FuZ3VsYXIgc3RydWN0dXJlIGFscmVhZHkgbG9hZGVkJyk7XG4gICAgfVxuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgY29uc3Qge3RtcFByb2dyYW0sIHNvdXJjZUZpbGVzLCB0c0ZpbGVzLCByb290TmFtZXN9ID0gdGhpcy5fY3JlYXRlUHJvZ3JhbVdpdGhCYXNpY1N0dWJzKCk7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuY29tcGlsZXIubG9hZEZpbGVzQXN5bmMoc291cmNlRmlsZXMsIHRzRmlsZXMpXG4gICAgICAgICAgICAgIC50aGVuKCh7YW5hbHl6ZWRNb2R1bGVzLCBhbmFseXplZEluamVjdGFibGVzfSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9hbmFseXplZE1vZHVsZXMpIHtcbiAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQW5ndWxhciBzdHJ1Y3R1cmUgbG9hZGVkIGJvdGggc3luY2hyb25vdXNseSBhbmQgYXN5bmNocm9ub3VzbHknKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5fdXBkYXRlUHJvZ3JhbVdpdGhUeXBlQ2hlY2tTdHVicyhcbiAgICAgICAgICAgICAgICAgICAgdG1wUHJvZ3JhbSwgYW5hbHl6ZWRNb2R1bGVzLCBhbmFseXplZEluamVjdGFibGVzLCByb290TmFtZXMpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGUgPT4gdGhpcy5fY3JlYXRlUHJvZ3JhbU9uRXJyb3IoZSkpO1xuICB9XG5cbiAgbGlzdExhenlSb3V0ZXMocm91dGU/OiBzdHJpbmcpOiBMYXp5Um91dGVbXSB7XG4gICAgLy8gTm90ZTogRG9uJ3QgYW5hbHl6ZWRNb2R1bGVzIGlmIGEgcm91dGUgaXMgZ2l2ZW5cbiAgICAvLyB0byBiZSBmYXN0IGVub3VnaC5cbiAgICByZXR1cm4gdGhpcy5jb21waWxlci5saXN0TGF6eVJvdXRlcyhyb3V0ZSwgcm91dGUgPyB1bmRlZmluZWQgOiB0aGlzLmFuYWx5emVkTW9kdWxlcyk7XG4gIH1cblxuICBlbWl0KHBhcmFtZXRlcnM6IHtcbiAgICBlbWl0RmxhZ3M/OiBFbWl0RmxhZ3MsXG4gICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbixcbiAgICBjdXN0b21UcmFuc2Zvcm1lcnM/OiBDdXN0b21UcmFuc2Zvcm1lcnMsXG4gICAgZW1pdENhbGxiYWNrPzogVHNFbWl0Q2FsbGJhY2ssXG4gICAgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrPzogVHNNZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2ssXG4gIH0gPSB7fSk6IHRzLkVtaXRSZXN1bHQge1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZW5hYmxlSXZ5ICE9PSBmYWxzZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgcnVuIGxlZ2FjeSBjb21waWxlciBpbiBuZ3RzYyBtb2RlJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9lbWl0UmVuZGVyMihwYXJhbWV0ZXJzKTtcbiAgfVxuXG4gIHByaXZhdGUgX2VtaXRSZW5kZXIzKHtcbiAgICBlbWl0RmxhZ3MgPSBFbWl0RmxhZ3MuRGVmYXVsdCxcbiAgICBjYW5jZWxsYXRpb25Ub2tlbixcbiAgICBjdXN0b21UcmFuc2Zvcm1lcnMsXG4gICAgZW1pdENhbGxiYWNrID0gZGVmYXVsdEVtaXRDYWxsYmFjayxcbiAgICBtZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2sgPSBtZXJnZUVtaXRSZXN1bHRzLFxuICB9OiB7XG4gICAgZW1pdEZsYWdzPzogRW1pdEZsYWdzLFxuICAgIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4sXG4gICAgY3VzdG9tVHJhbnNmb3JtZXJzPzogQ3VzdG9tVHJhbnNmb3JtZXJzLFxuICAgIGVtaXRDYWxsYmFjaz86IFRzRW1pdENhbGxiYWNrLFxuICAgIG1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjaz86IFRzTWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrLFxuICB9ID0ge30pOiB0cy5FbWl0UmVzdWx0IHtcbiAgICBjb25zdCBlbWl0U3RhcnQgPSBEYXRlLm5vdygpO1xuICAgIGlmICgoZW1pdEZsYWdzICYgKEVtaXRGbGFncy5KUyB8IEVtaXRGbGFncy5EVFMgfCBFbWl0RmxhZ3MuTWV0YWRhdGEgfCBFbWl0RmxhZ3MuQ29kZWdlbikpID09PVxuICAgICAgICAwKSB7XG4gICAgICByZXR1cm4ge2VtaXRTa2lwcGVkOiB0cnVlLCBkaWFnbm9zdGljczogW10sIGVtaXR0ZWRGaWxlczogW119O1xuICAgIH1cblxuICAgIC8vIGFuYWx5emVkTW9kdWxlcyBhbmQgYW5hbHl6ZWRJbmplY3RhYmxlcyBhcmUgY3JlYXRlZCB0b2dldGhlci4gSWYgb25lIGV4aXN0cywgc28gZG9lcyB0aGVcbiAgICAvLyBvdGhlci5cbiAgICBjb25zdCBtb2R1bGVzID1cbiAgICAgICAgdGhpcy5jb21waWxlci5lbWl0QWxsUGFydGlhbE1vZHVsZXModGhpcy5hbmFseXplZE1vZHVsZXMsIHRoaXMuX2FuYWx5emVkSW5qZWN0YWJsZXMhKTtcblxuICAgIGNvbnN0IHdyaXRlVHNGaWxlOiB0cy5Xcml0ZUZpbGVDYWxsYmFjayA9XG4gICAgICAgIChvdXRGaWxlTmFtZSwgb3V0RGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yPywgc291cmNlRmlsZXM/KSA9PiB7XG4gICAgICAgICAgdGhpcy53cml0ZUZpbGUob3V0RmlsZU5hbWUsIG91dERhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvciwgdW5kZWZpbmVkLCBzb3VyY2VGaWxlcyk7XG4gICAgICAgIH07XG5cbiAgICBjb25zdCBlbWl0T25seUR0c0ZpbGVzID0gKGVtaXRGbGFncyAmIChFbWl0RmxhZ3MuRFRTIHwgRW1pdEZsYWdzLkpTKSkgPT0gRW1pdEZsYWdzLkRUUztcblxuICAgIGNvbnN0IHRzQ3VzdG9tVHJhbnNmb3JtZXJzID0gdGhpcy5jYWxjdWxhdGVUcmFuc2Zvcm1zKFxuICAgICAgICAvKiBnZW5GaWxlcyAqLyB1bmRlZmluZWQsIC8qIHBhcnRpYWxNb2R1bGVzICovIG1vZHVsZXMsXG4gICAgICAgIC8qIHN0cmlwRGVjb3JhdG9ycyAqLyB0aGlzLnJlaWZpZWREZWNvcmF0b3JzLCBjdXN0b21UcmFuc2Zvcm1lcnMpO1xuXG5cbiAgICAvLyBSZXN0b3JlIHRoZSBvcmlnaW5hbCByZWZlcmVuY2VzIGJlZm9yZSB3ZSBlbWl0IHNvIFR5cGVTY3JpcHQgZG9lc24ndCBlbWl0XG4gICAgLy8gYSByZWZlcmVuY2UgdG8gdGhlIC5kLnRzIGZpbGUuXG4gICAgY29uc3QgYXVnbWVudGVkUmVmZXJlbmNlcyA9IG5ldyBNYXA8dHMuU291cmNlRmlsZSwgUmVhZG9ubHlBcnJheTx0cy5GaWxlUmVmZXJlbmNlPj4oKTtcbiAgICBmb3IgKGNvbnN0IHNvdXJjZUZpbGUgb2YgdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgY29uc3Qgb3JpZ2luYWxSZWZlcmVuY2VzID0gZ2V0T3JpZ2luYWxSZWZlcmVuY2VzKHNvdXJjZUZpbGUpO1xuICAgICAgaWYgKG9yaWdpbmFsUmVmZXJlbmNlcykge1xuICAgICAgICBhdWdtZW50ZWRSZWZlcmVuY2VzLnNldChzb3VyY2VGaWxlLCBzb3VyY2VGaWxlLnJlZmVyZW5jZWRGaWxlcyk7XG4gICAgICAgIHNvdXJjZUZpbGUucmVmZXJlbmNlZEZpbGVzID0gb3JpZ2luYWxSZWZlcmVuY2VzO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICByZXR1cm4gZW1pdENhbGxiYWNrKHtcbiAgICAgICAgcHJvZ3JhbTogdGhpcy50c1Byb2dyYW0sXG4gICAgICAgIGhvc3Q6IHRoaXMuaG9zdCxcbiAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICB3cml0ZUZpbGU6IHdyaXRlVHNGaWxlLFxuICAgICAgICBlbWl0T25seUR0c0ZpbGVzLFxuICAgICAgICBjdXN0b21UcmFuc2Zvcm1lcnM6IHRzQ3VzdG9tVHJhbnNmb3JtZXJzXG4gICAgICB9KTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgLy8gUmVzdG9yZSB0aGUgcmVmZXJlbmNlcyBiYWNrIHRvIHRoZSBhdWdtZW50ZWQgdmFsdWUgdG8gZW5zdXJlIHRoYXQgdGhlXG4gICAgICAvLyBjaGVja3MgdGhhdCBUeXBlU2NyaXB0IG1ha2VzIGZvciBwcm9qZWN0IHN0cnVjdHVyZSByZXVzZSB3aWxsIHN1Y2NlZWQuXG4gICAgICBmb3IgKGNvbnN0IFtzb3VyY2VGaWxlLCByZWZlcmVuY2VzXSBvZiBBcnJheS5mcm9tKGF1Z21lbnRlZFJlZmVyZW5jZXMpKSB7XG4gICAgICAgIC8vIFRPRE8oY2h1Y2tqKTogUmVtb3ZlIGFueSBjYXN0IGFmdGVyIHVwZGF0aW5nIGJ1aWxkIHRvIDIuNlxuICAgICAgICAoc291cmNlRmlsZSBhcyBhbnkpLnJlZmVyZW5jZWRGaWxlcyA9IHJlZmVyZW5jZXM7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfZW1pdFJlbmRlcjIoe1xuICAgIGVtaXRGbGFncyA9IEVtaXRGbGFncy5EZWZhdWx0LFxuICAgIGNhbmNlbGxhdGlvblRva2VuLFxuICAgIGN1c3RvbVRyYW5zZm9ybWVycyxcbiAgICBlbWl0Q2FsbGJhY2sgPSBkZWZhdWx0RW1pdENhbGxiYWNrLFxuICAgIG1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjayA9IG1lcmdlRW1pdFJlc3VsdHMsXG4gIH06IHtcbiAgICBlbWl0RmxhZ3M/OiBFbWl0RmxhZ3MsXG4gICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbixcbiAgICBjdXN0b21UcmFuc2Zvcm1lcnM/OiBDdXN0b21UcmFuc2Zvcm1lcnMsXG4gICAgZW1pdENhbGxiYWNrPzogVHNFbWl0Q2FsbGJhY2ssXG4gICAgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrPzogVHNNZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2ssXG4gIH0gPSB7fSk6IHRzLkVtaXRSZXN1bHQge1xuICAgIGNvbnN0IGVtaXRTdGFydCA9IERhdGUubm93KCk7XG4gICAgaWYgKGVtaXRGbGFncyAmIEVtaXRGbGFncy5JMThuQnVuZGxlKSB7XG4gICAgICBjb25zdCBsb2NhbGUgPSB0aGlzLm9wdGlvbnMuaTE4bk91dExvY2FsZSB8fCBudWxsO1xuICAgICAgY29uc3QgZmlsZSA9IHRoaXMub3B0aW9ucy5pMThuT3V0RmlsZSB8fCBudWxsO1xuICAgICAgY29uc3QgZm9ybWF0ID0gdGhpcy5vcHRpb25zLmkxOG5PdXRGb3JtYXQgfHwgbnVsbDtcbiAgICAgIGNvbnN0IGJ1bmRsZSA9IHRoaXMuY29tcGlsZXIuZW1pdE1lc3NhZ2VCdW5kbGUodGhpcy5hbmFseXplZE1vZHVsZXMsIGxvY2FsZSk7XG4gICAgICBpMThuRXh0cmFjdChmb3JtYXQsIGZpbGUsIHRoaXMuaG9zdCwgdGhpcy5vcHRpb25zLCBidW5kbGUpO1xuICAgIH1cbiAgICBpZiAoKGVtaXRGbGFncyAmIChFbWl0RmxhZ3MuSlMgfCBFbWl0RmxhZ3MuRFRTIHwgRW1pdEZsYWdzLk1ldGFkYXRhIHwgRW1pdEZsYWdzLkNvZGVnZW4pKSA9PT1cbiAgICAgICAgMCkge1xuICAgICAgcmV0dXJuIHtlbWl0U2tpcHBlZDogdHJ1ZSwgZGlhZ25vc3RpY3M6IFtdLCBlbWl0dGVkRmlsZXM6IFtdfTtcbiAgICB9XG4gICAgbGV0IHtnZW5GaWxlcywgZ2VuRGlhZ3N9ID0gdGhpcy5nZW5lcmF0ZUZpbGVzRm9yRW1pdChlbWl0RmxhZ3MpO1xuICAgIGlmIChnZW5EaWFncy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGRpYWdub3N0aWNzOiBnZW5EaWFncyxcbiAgICAgICAgZW1pdFNraXBwZWQ6IHRydWUsXG4gICAgICAgIGVtaXR0ZWRGaWxlczogW10sXG4gICAgICB9O1xuICAgIH1cbiAgICB0aGlzLmVtaXR0ZWRHZW5lcmF0ZWRGaWxlcyA9IGdlbkZpbGVzO1xuICAgIGNvbnN0IG91dFNyY01hcHBpbmc6IEFycmF5PHtzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBvdXRGaWxlTmFtZTogc3RyaW5nfT4gPSBbXTtcbiAgICBjb25zdCBnZW5GaWxlQnlGaWxlTmFtZSA9IG5ldyBNYXA8c3RyaW5nLCBHZW5lcmF0ZWRGaWxlPigpO1xuICAgIGdlbkZpbGVzLmZvckVhY2goZ2VuRmlsZSA9PiBnZW5GaWxlQnlGaWxlTmFtZS5zZXQoZ2VuRmlsZS5nZW5GaWxlVXJsLCBnZW5GaWxlKSk7XG4gICAgdGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcyA9IFtdO1xuICAgIGNvbnN0IGVtaXR0ZWRTb3VyY2VGaWxlcyA9IFtdIGFzIHRzLlNvdXJjZUZpbGVbXTtcbiAgICBjb25zdCB3cml0ZVRzRmlsZTogdHMuV3JpdGVGaWxlQ2FsbGJhY2sgPVxuICAgICAgICAob3V0RmlsZU5hbWUsIG91dERhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvcj8sIHNvdXJjZUZpbGVzPykgPT4ge1xuICAgICAgICAgIGNvbnN0IHNvdXJjZUZpbGUgPSBzb3VyY2VGaWxlcyAmJiBzb3VyY2VGaWxlcy5sZW5ndGggPT0gMSA/IHNvdXJjZUZpbGVzWzBdIDogbnVsbDtcbiAgICAgICAgICBsZXQgZ2VuRmlsZTogR2VuZXJhdGVkRmlsZXx1bmRlZmluZWQ7XG4gICAgICAgICAgaWYgKHNvdXJjZUZpbGUpIHtcbiAgICAgICAgICAgIG91dFNyY01hcHBpbmcucHVzaCh7b3V0RmlsZU5hbWU6IG91dEZpbGVOYW1lLCBzb3VyY2VGaWxlfSk7XG4gICAgICAgICAgICBnZW5GaWxlID0gZ2VuRmlsZUJ5RmlsZU5hbWUuZ2V0KHNvdXJjZUZpbGUuZmlsZU5hbWUpO1xuICAgICAgICAgICAgaWYgKCFzb3VyY2VGaWxlLmlzRGVjbGFyYXRpb25GaWxlICYmICFHRU5FUkFURURfRklMRVMudGVzdChzb3VyY2VGaWxlLmZpbGVOYW1lKSkge1xuICAgICAgICAgICAgICAvLyBOb3RlOiBzb3VyY2VGaWxlIGlzIHRoZSB0cmFuc2Zvcm1lZCBzb3VyY2VmaWxlLCBub3QgdGhlIG9yaWdpbmFsIG9uZSFcbiAgICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxGaWxlID0gdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZShzb3VyY2VGaWxlLmZpbGVOYW1lKTtcbiAgICAgICAgICAgICAgaWYgKG9yaWdpbmFsRmlsZSkge1xuICAgICAgICAgICAgICAgIGVtaXR0ZWRTb3VyY2VGaWxlcy5wdXNoKG9yaWdpbmFsRmlsZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy53cml0ZUZpbGUob3V0RmlsZU5hbWUsIG91dERhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvciwgZ2VuRmlsZSwgc291cmNlRmlsZXMpO1xuICAgICAgICB9O1xuXG4gICAgY29uc3QgbW9kdWxlcyA9IHRoaXMuX2FuYWx5emVkSW5qZWN0YWJsZXMgJiZcbiAgICAgICAgdGhpcy5jb21waWxlci5lbWl0QWxsUGFydGlhbE1vZHVsZXMyKHRoaXMuX2FuYWx5emVkSW5qZWN0YWJsZXMpO1xuXG4gICAgY29uc3QgdHNDdXN0b21UcmFuc2Zvcm1lcnMgPSB0aGlzLmNhbGN1bGF0ZVRyYW5zZm9ybXMoXG4gICAgICAgIGdlbkZpbGVCeUZpbGVOYW1lLCBtb2R1bGVzLCAvKiBzdHJpcERlY29yYXRvcnMgKi8gdW5kZWZpbmVkLCBjdXN0b21UcmFuc2Zvcm1lcnMpO1xuICAgIGNvbnN0IGVtaXRPbmx5RHRzRmlsZXMgPSAoZW1pdEZsYWdzICYgKEVtaXRGbGFncy5EVFMgfCBFbWl0RmxhZ3MuSlMpKSA9PSBFbWl0RmxhZ3MuRFRTO1xuICAgIC8vIFJlc3RvcmUgdGhlIG9yaWdpbmFsIHJlZmVyZW5jZXMgYmVmb3JlIHdlIGVtaXQgc28gVHlwZVNjcmlwdCBkb2Vzbid0IGVtaXRcbiAgICAvLyBhIHJlZmVyZW5jZSB0byB0aGUgLmQudHMgZmlsZS5cbiAgICBjb25zdCBhdWdtZW50ZWRSZWZlcmVuY2VzID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBSZWFkb25seUFycmF5PHRzLkZpbGVSZWZlcmVuY2U+PigpO1xuICAgIGZvciAoY29uc3Qgc291cmNlRmlsZSBvZiB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICBjb25zdCBvcmlnaW5hbFJlZmVyZW5jZXMgPSBnZXRPcmlnaW5hbFJlZmVyZW5jZXMoc291cmNlRmlsZSk7XG4gICAgICBpZiAob3JpZ2luYWxSZWZlcmVuY2VzKSB7XG4gICAgICAgIGF1Z21lbnRlZFJlZmVyZW5jZXMuc2V0KHNvdXJjZUZpbGUsIHNvdXJjZUZpbGUucmVmZXJlbmNlZEZpbGVzKTtcbiAgICAgICAgc291cmNlRmlsZS5yZWZlcmVuY2VkRmlsZXMgPSBvcmlnaW5hbFJlZmVyZW5jZXM7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IGdlblRzRmlsZXM6IEdlbmVyYXRlZEZpbGVbXSA9IFtdO1xuICAgIGNvbnN0IGdlbkpzb25GaWxlczogR2VuZXJhdGVkRmlsZVtdID0gW107XG4gICAgZ2VuRmlsZXMuZm9yRWFjaChnZiA9PiB7XG4gICAgICBpZiAoZ2Yuc3RtdHMpIHtcbiAgICAgICAgZ2VuVHNGaWxlcy5wdXNoKGdmKTtcbiAgICAgIH1cbiAgICAgIGlmIChnZi5zb3VyY2UpIHtcbiAgICAgICAgZ2VuSnNvbkZpbGVzLnB1c2goZ2YpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGxldCBlbWl0UmVzdWx0OiB0cy5FbWl0UmVzdWx0O1xuICAgIGxldCBlbWl0dGVkVXNlclRzQ291bnQ6IG51bWJlcjtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc291cmNlRmlsZXNUb0VtaXQgPSB0aGlzLmdldFNvdXJjZUZpbGVzRm9yRW1pdCgpO1xuICAgICAgaWYgKHNvdXJjZUZpbGVzVG9FbWl0ICYmXG4gICAgICAgICAgKHNvdXJjZUZpbGVzVG9FbWl0Lmxlbmd0aCArIGdlblRzRmlsZXMubGVuZ3RoKSA8IE1BWF9GSUxFX0NPVU5UX0ZPUl9TSU5HTEVfRklMRV9FTUlUKSB7XG4gICAgICAgIGNvbnN0IGZpbGVOYW1lc1RvRW1pdCA9XG4gICAgICAgICAgICBbLi4uc291cmNlRmlsZXNUb0VtaXQubWFwKHNmID0+IHNmLmZpbGVOYW1lKSwgLi4uZ2VuVHNGaWxlcy5tYXAoZ2YgPT4gZ2YuZ2VuRmlsZVVybCldO1xuICAgICAgICBlbWl0UmVzdWx0ID0gbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrKFxuICAgICAgICAgICAgZmlsZU5hbWVzVG9FbWl0Lm1hcCgoZmlsZU5hbWUpID0+IGVtaXRSZXN1bHQgPSBlbWl0Q2FsbGJhY2soe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyYW06IHRoaXMudHNQcm9ncmFtLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvc3Q6IHRoaXMuaG9zdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd3JpdGVGaWxlOiB3cml0ZVRzRmlsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbWl0T25seUR0c0ZpbGVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbVRyYW5zZm9ybWVyczogdHNDdXN0b21UcmFuc2Zvcm1lcnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0U291cmNlRmlsZTogdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZShmaWxlTmFtZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKSk7XG4gICAgICAgIGVtaXR0ZWRVc2VyVHNDb3VudCA9IHNvdXJjZUZpbGVzVG9FbWl0Lmxlbmd0aDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVtaXRSZXN1bHQgPSBlbWl0Q2FsbGJhY2soe1xuICAgICAgICAgIHByb2dyYW06IHRoaXMudHNQcm9ncmFtLFxuICAgICAgICAgIGhvc3Q6IHRoaXMuaG9zdCxcbiAgICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICAgICAgd3JpdGVGaWxlOiB3cml0ZVRzRmlsZSxcbiAgICAgICAgICBlbWl0T25seUR0c0ZpbGVzLFxuICAgICAgICAgIGN1c3RvbVRyYW5zZm9ybWVyczogdHNDdXN0b21UcmFuc2Zvcm1lcnNcbiAgICAgICAgfSk7XG4gICAgICAgIGVtaXR0ZWRVc2VyVHNDb3VudCA9IHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkubGVuZ3RoIC0gZ2VuVHNGaWxlcy5sZW5ndGg7XG4gICAgICB9XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIC8vIFJlc3RvcmUgdGhlIHJlZmVyZW5jZXMgYmFjayB0byB0aGUgYXVnbWVudGVkIHZhbHVlIHRvIGVuc3VyZSB0aGF0IHRoZVxuICAgICAgLy8gY2hlY2tzIHRoYXQgVHlwZVNjcmlwdCBtYWtlcyBmb3IgcHJvamVjdCBzdHJ1Y3R1cmUgcmV1c2Ugd2lsbCBzdWNjZWVkLlxuICAgICAgZm9yIChjb25zdCBbc291cmNlRmlsZSwgcmVmZXJlbmNlc10gb2YgQXJyYXkuZnJvbShhdWdtZW50ZWRSZWZlcmVuY2VzKSkge1xuICAgICAgICAvLyBUT0RPKGNodWNraik6IFJlbW92ZSBhbnkgY2FzdCBhZnRlciB1cGRhdGluZyBidWlsZCB0byAyLjZcbiAgICAgICAgKHNvdXJjZUZpbGUgYXMgYW55KS5yZWZlcmVuY2VkRmlsZXMgPSByZWZlcmVuY2VzO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmVtaXR0ZWRTb3VyY2VGaWxlcyA9IGVtaXR0ZWRTb3VyY2VGaWxlcztcblxuICAgIC8vIE1hdGNoIGJlaGF2aW9yIG9mIHRzYzogb25seSBwcm9kdWNlIGVtaXQgZGlhZ25vc3RpY3MgaWYgaXQgd291bGQgYmxvY2tcbiAgICAvLyBlbWl0LiBJZiBub0VtaXRPbkVycm9yIGlzIGZhbHNlLCB0aGUgZW1pdCB3aWxsIGhhcHBlbiBpbiBzcGl0ZSBvZiBhbnlcbiAgICAvLyBlcnJvcnMsIHNvIHdlIHNob3VsZCBub3QgcmVwb3J0IHRoZW0uXG4gICAgaWYgKGVtaXRSZXN1bHQgJiYgdGhpcy5vcHRpb25zLm5vRW1pdE9uRXJyb3IgPT09IHRydWUpIHtcbiAgICAgIC8vIHRyYW5zbGF0ZSB0aGUgZGlhZ25vc3RpY3MgaW4gdGhlIGVtaXRSZXN1bHQgYXMgd2VsbC5cbiAgICAgIGNvbnN0IHRyYW5zbGF0ZWRFbWl0RGlhZ3MgPSB0cmFuc2xhdGVEaWFnbm9zdGljcyh0aGlzLmhvc3RBZGFwdGVyLCBlbWl0UmVzdWx0LmRpYWdub3N0aWNzKTtcbiAgICAgIGVtaXRSZXN1bHQuZGlhZ25vc3RpY3MgPSB0cmFuc2xhdGVkRW1pdERpYWdzLnRzLmNvbmNhdChcbiAgICAgICAgICB0aGlzLnN0cnVjdHVyYWxEaWFnbm9zdGljcy5jb25jYXQodHJhbnNsYXRlZEVtaXREaWFncy5uZykubWFwKG5nVG9Uc0RpYWdub3N0aWMpKTtcbiAgICB9XG5cbiAgICBpZiAoZW1pdFJlc3VsdCAmJiAhb3V0U3JjTWFwcGluZy5sZW5ndGgpIHtcbiAgICAgIC8vIGlmIG5vIGZpbGVzIHdlcmUgZW1pdHRlZCBieSBUeXBlU2NyaXB0LCBhbHNvIGRvbid0IGVtaXQgLmpzb24gZmlsZXNcbiAgICAgIGVtaXRSZXN1bHQuZGlhZ25vc3RpY3MgPVxuICAgICAgICAgIGVtaXRSZXN1bHQuZGlhZ25vc3RpY3MuY29uY2F0KFtjcmVhdGVNZXNzYWdlRGlhZ25vc3RpYyhgRW1pdHRlZCBubyBmaWxlcy5gKV0pO1xuICAgICAgcmV0dXJuIGVtaXRSZXN1bHQ7XG4gICAgfVxuXG4gICAgbGV0IHNhbXBsZVNyY0ZpbGVOYW1lOiBzdHJpbmd8dW5kZWZpbmVkO1xuICAgIGxldCBzYW1wbGVPdXRGaWxlTmFtZTogc3RyaW5nfHVuZGVmaW5lZDtcbiAgICBpZiAob3V0U3JjTWFwcGluZy5sZW5ndGgpIHtcbiAgICAgIHNhbXBsZVNyY0ZpbGVOYW1lID0gb3V0U3JjTWFwcGluZ1swXS5zb3VyY2VGaWxlLmZpbGVOYW1lO1xuICAgICAgc2FtcGxlT3V0RmlsZU5hbWUgPSBvdXRTcmNNYXBwaW5nWzBdLm91dEZpbGVOYW1lO1xuICAgIH1cbiAgICBjb25zdCBzcmNUb091dFBhdGggPVxuICAgICAgICBjcmVhdGVTcmNUb091dFBhdGhNYXBwZXIodGhpcy5vcHRpb25zLm91dERpciwgc2FtcGxlU3JjRmlsZU5hbWUsIHNhbXBsZU91dEZpbGVOYW1lKTtcbiAgICBpZiAoZW1pdEZsYWdzICYgRW1pdEZsYWdzLkNvZGVnZW4pIHtcbiAgICAgIGdlbkpzb25GaWxlcy5mb3JFYWNoKGdmID0+IHtcbiAgICAgICAgY29uc3Qgb3V0RmlsZU5hbWUgPSBzcmNUb091dFBhdGgoZ2YuZ2VuRmlsZVVybCk7XG4gICAgICAgIHRoaXMud3JpdGVGaWxlKG91dEZpbGVOYW1lLCBnZi5zb3VyY2UhLCBmYWxzZSwgdW5kZWZpbmVkLCBnZik7XG4gICAgICB9KTtcbiAgICB9XG4gICAgbGV0IG1ldGFkYXRhSnNvbkNvdW50ID0gMDtcbiAgICBpZiAoZW1pdEZsYWdzICYgRW1pdEZsYWdzLk1ldGFkYXRhKSB7XG4gICAgICB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZvckVhY2goc2YgPT4ge1xuICAgICAgICBpZiAoIXNmLmlzRGVjbGFyYXRpb25GaWxlICYmICFHRU5FUkFURURfRklMRVMudGVzdChzZi5maWxlTmFtZSkpIHtcbiAgICAgICAgICBtZXRhZGF0YUpzb25Db3VudCsrO1xuICAgICAgICAgIGNvbnN0IG1ldGFkYXRhID0gdGhpcy5tZXRhZGF0YUNhY2hlLmdldE1ldGFkYXRhKHNmKTtcbiAgICAgICAgICBpZiAobWV0YWRhdGEpIHtcbiAgICAgICAgICAgIGNvbnN0IG1ldGFkYXRhVGV4dCA9IEpTT04uc3RyaW5naWZ5KFttZXRhZGF0YV0pO1xuICAgICAgICAgICAgY29uc3Qgb3V0RmlsZU5hbWUgPSBzcmNUb091dFBhdGgoc2YuZmlsZU5hbWUucmVwbGFjZSgvXFwudHN4PyQvLCAnLm1ldGFkYXRhLmpzb24nKSk7XG4gICAgICAgICAgICB0aGlzLndyaXRlRmlsZShvdXRGaWxlTmFtZSwgbWV0YWRhdGFUZXh0LCBmYWxzZSwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIFtzZl0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIGNvbnN0IGVtaXRFbmQgPSBEYXRlLm5vdygpO1xuICAgIGlmIChlbWl0UmVzdWx0ICYmIHRoaXMub3B0aW9ucy5kaWFnbm9zdGljcykge1xuICAgICAgZW1pdFJlc3VsdC5kaWFnbm9zdGljcyA9IGVtaXRSZXN1bHQuZGlhZ25vc3RpY3MuY29uY2F0KFtjcmVhdGVNZXNzYWdlRGlhZ25vc3RpYyhbXG4gICAgICAgIGBFbWl0dGVkIGluICR7ZW1pdEVuZCAtIGVtaXRTdGFydH1tc2AsXG4gICAgICAgIGAtICR7ZW1pdHRlZFVzZXJUc0NvdW50fSB1c2VyIHRzIGZpbGVzYCxcbiAgICAgICAgYC0gJHtnZW5Uc0ZpbGVzLmxlbmd0aH0gZ2VuZXJhdGVkIHRzIGZpbGVzYCxcbiAgICAgICAgYC0gJHtnZW5Kc29uRmlsZXMubGVuZ3RoICsgbWV0YWRhdGFKc29uQ291bnR9IGdlbmVyYXRlZCBqc29uIGZpbGVzYCxcbiAgICAgIF0uam9pbignXFxuJykpXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVtaXRSZXN1bHQ7XG4gIH1cblxuICAvLyBQcml2YXRlIG1lbWJlcnNcbiAgcHJpdmF0ZSBnZXQgY29tcGlsZXIoKTogQW90Q29tcGlsZXIge1xuICAgIGlmICghdGhpcy5fY29tcGlsZXIpIHtcbiAgICAgIHRoaXMuX2NyZWF0ZUNvbXBpbGVyKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9jb21waWxlciE7XG4gIH1cblxuICBwcml2YXRlIGdldCBob3N0QWRhcHRlcigpOiBUc0NvbXBpbGVyQW90Q29tcGlsZXJUeXBlQ2hlY2tIb3N0QWRhcHRlciB7XG4gICAgaWYgKCF0aGlzLl9ob3N0QWRhcHRlcikge1xuICAgICAgdGhpcy5fY3JlYXRlQ29tcGlsZXIoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2hvc3RBZGFwdGVyITtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0IGFuYWx5emVkTW9kdWxlcygpOiBOZ0FuYWx5emVkTW9kdWxlcyB7XG4gICAgaWYgKCF0aGlzLl9hbmFseXplZE1vZHVsZXMpIHtcbiAgICAgIHRoaXMuaW5pdFN5bmMoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2FuYWx5emVkTW9kdWxlcyE7XG4gIH1cblxuICBwcml2YXRlIGdldCBzdHJ1Y3R1cmFsRGlhZ25vc3RpY3MoKTogUmVhZG9ubHlBcnJheTxEaWFnbm9zdGljPiB7XG4gICAgbGV0IGRpYWdub3N0aWNzID0gdGhpcy5fc3RydWN0dXJhbERpYWdub3N0aWNzO1xuICAgIGlmICghZGlhZ25vc3RpY3MpIHtcbiAgICAgIHRoaXMuaW5pdFN5bmMoKTtcbiAgICAgIGRpYWdub3N0aWNzID0gKHRoaXMuX3N0cnVjdHVyYWxEaWFnbm9zdGljcyA9IHRoaXMuX3N0cnVjdHVyYWxEaWFnbm9zdGljcyB8fCBbXSk7XG4gICAgfVxuICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgfVxuXG4gIHByaXZhdGUgZ2V0IHRzUHJvZ3JhbSgpOiB0cy5Qcm9ncmFtIHtcbiAgICBpZiAoIXRoaXMuX3RzUHJvZ3JhbSkge1xuICAgICAgdGhpcy5pbml0U3luYygpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fdHNQcm9ncmFtITtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0IHJlaWZpZWREZWNvcmF0b3JzKCk6IFNldDxTdGF0aWNTeW1ib2w+IHtcbiAgICBpZiAoIXRoaXMuX3JlaWZpZWREZWNvcmF0b3JzKSB7XG4gICAgICBjb25zdCByZWZsZWN0b3IgPSB0aGlzLmNvbXBpbGVyLnJlZmxlY3RvcjtcbiAgICAgIHRoaXMuX3JlaWZpZWREZWNvcmF0b3JzID0gbmV3IFNldChcbiAgICAgICAgICBSM19SRUlGSUVEX0RFQ09SQVRPUlMubWFwKG5hbWUgPT4gcmVmbGVjdG9yLmZpbmREZWNsYXJhdGlvbignQGFuZ3VsYXIvY29yZScsIG5hbWUpKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9yZWlmaWVkRGVjb3JhdG9ycztcbiAgfVxuXG4gIHByaXZhdGUgY2FsY3VsYXRlVHJhbnNmb3JtcyhcbiAgICAgIGdlbkZpbGVzOiBNYXA8c3RyaW5nLCBHZW5lcmF0ZWRGaWxlPnx1bmRlZmluZWQsIHBhcnRpYWxNb2R1bGVzOiBQYXJ0aWFsTW9kdWxlW118dW5kZWZpbmVkLFxuICAgICAgc3RyaXBEZWNvcmF0b3JzOiBTZXQ8U3RhdGljU3ltYm9sPnx1bmRlZmluZWQsXG4gICAgICBjdXN0b21UcmFuc2Zvcm1lcnM/OiBDdXN0b21UcmFuc2Zvcm1lcnMpOiB0cy5DdXN0b21UcmFuc2Zvcm1lcnMge1xuICAgIGNvbnN0IGJlZm9yZVRzOiBBcnJheTx0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT4+ID0gW107XG4gICAgY29uc3QgbWV0YWRhdGFUcmFuc2Zvcm1zOiBNZXRhZGF0YVRyYW5zZm9ybWVyW10gPSBbXTtcbiAgICBjb25zdCBmbGF0TW9kdWxlTWV0YWRhdGFUcmFuc2Zvcm1zOiBNZXRhZGF0YVRyYW5zZm9ybWVyW10gPSBbXTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmVuYWJsZVJlc291cmNlSW5saW5pbmcpIHtcbiAgICAgIGJlZm9yZVRzLnB1c2goZ2V0SW5saW5lUmVzb3VyY2VzVHJhbnNmb3JtRmFjdG9yeSh0aGlzLnRzUHJvZ3JhbSwgdGhpcy5ob3N0QWRhcHRlcikpO1xuICAgICAgY29uc3QgdHJhbnNmb3JtZXIgPSBuZXcgSW5saW5lUmVzb3VyY2VzTWV0YWRhdGFUcmFuc2Zvcm1lcih0aGlzLmhvc3RBZGFwdGVyKTtcbiAgICAgIG1ldGFkYXRhVHJhbnNmb3Jtcy5wdXNoKHRyYW5zZm9ybWVyKTtcbiAgICAgIGZsYXRNb2R1bGVNZXRhZGF0YVRyYW5zZm9ybXMucHVzaCh0cmFuc2Zvcm1lcik7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuZGlzYWJsZUV4cHJlc3Npb25Mb3dlcmluZykge1xuICAgICAgYmVmb3JlVHMucHVzaChcbiAgICAgICAgICBnZXRFeHByZXNzaW9uTG93ZXJpbmdUcmFuc2Zvcm1GYWN0b3J5KHRoaXMubG93ZXJpbmdNZXRhZGF0YVRyYW5zZm9ybSwgdGhpcy50c1Byb2dyYW0pKTtcbiAgICAgIG1ldGFkYXRhVHJhbnNmb3Jtcy5wdXNoKHRoaXMubG93ZXJpbmdNZXRhZGF0YVRyYW5zZm9ybSk7XG4gICAgfVxuICAgIGNvbnN0IGFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyID0gdGhpcy5vcHRpb25zLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyIHx8IGZhbHNlO1xuICAgIGlmIChnZW5GaWxlcykge1xuICAgICAgYmVmb3JlVHMucHVzaChnZXRBbmd1bGFyRW1pdHRlclRyYW5zZm9ybUZhY3RvcnkoXG4gICAgICAgICAgZ2VuRmlsZXMsIHRoaXMuZ2V0VHNQcm9ncmFtKCksIGFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyKSk7XG4gICAgfVxuICAgIGlmIChwYXJ0aWFsTW9kdWxlcykge1xuICAgICAgYmVmb3JlVHMucHVzaChnZXRBbmd1bGFyQ2xhc3NUcmFuc2Zvcm1lckZhY3RvcnkocGFydGlhbE1vZHVsZXMsIGFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyKSk7XG5cbiAgICAgIC8vIElmIHdlIGhhdmUgcGFydGlhbCBtb2R1bGVzLCB0aGUgY2FjaGVkIG1ldGFkYXRhIG1pZ2h0IGJlIGluY29ycmVjdCBhcyBpdCBkb2Vzbid0IHJlZmxlY3RcbiAgICAgIC8vIHRoZSBwYXJ0aWFsIG1vZHVsZSB0cmFuc2Zvcm1zLlxuICAgICAgY29uc3QgdHJhbnNmb3JtZXIgPSBuZXcgUGFydGlhbE1vZHVsZU1ldGFkYXRhVHJhbnNmb3JtZXIocGFydGlhbE1vZHVsZXMpO1xuICAgICAgbWV0YWRhdGFUcmFuc2Zvcm1zLnB1c2godHJhbnNmb3JtZXIpO1xuICAgICAgZmxhdE1vZHVsZU1ldGFkYXRhVHJhbnNmb3Jtcy5wdXNoKHRyYW5zZm9ybWVyKTtcbiAgICB9XG5cbiAgICBpZiAoc3RyaXBEZWNvcmF0b3JzKSB7XG4gICAgICBiZWZvcmVUcy5wdXNoKGdldERlY29yYXRvclN0cmlwVHJhbnNmb3JtZXJGYWN0b3J5KFxuICAgICAgICAgIHN0cmlwRGVjb3JhdG9ycywgdGhpcy5jb21waWxlci5yZWZsZWN0b3IsIHRoaXMuZ2V0VHNQcm9ncmFtKCkuZ2V0VHlwZUNoZWNrZXIoKSkpO1xuICAgICAgY29uc3QgdHJhbnNmb3JtZXIgPVxuICAgICAgICAgIG5ldyBTdHJpcERlY29yYXRvcnNNZXRhZGF0YVRyYW5zZm9ybWVyKHN0cmlwRGVjb3JhdG9ycywgdGhpcy5jb21waWxlci5yZWZsZWN0b3IpO1xuICAgICAgbWV0YWRhdGFUcmFuc2Zvcm1zLnB1c2godHJhbnNmb3JtZXIpO1xuICAgICAgZmxhdE1vZHVsZU1ldGFkYXRhVHJhbnNmb3Jtcy5wdXNoKHRyYW5zZm9ybWVyKTtcbiAgICB9XG5cbiAgICBpZiAoY3VzdG9tVHJhbnNmb3JtZXJzICYmIGN1c3RvbVRyYW5zZm9ybWVycy5iZWZvcmVUcykge1xuICAgICAgYmVmb3JlVHMucHVzaCguLi5jdXN0b21UcmFuc2Zvcm1lcnMuYmVmb3JlVHMpO1xuICAgIH1cbiAgICBpZiAobWV0YWRhdGFUcmFuc2Zvcm1zLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMubWV0YWRhdGFDYWNoZSA9IHRoaXMuY3JlYXRlTWV0YWRhdGFDYWNoZShtZXRhZGF0YVRyYW5zZm9ybXMpO1xuICAgIH1cbiAgICBpZiAoZmxhdE1vZHVsZU1ldGFkYXRhVHJhbnNmb3Jtcy5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLmZsYXRNb2R1bGVNZXRhZGF0YUNhY2hlID0gdGhpcy5jcmVhdGVNZXRhZGF0YUNhY2hlKGZsYXRNb2R1bGVNZXRhZGF0YVRyYW5zZm9ybXMpO1xuICAgIH1cbiAgICBjb25zdCBhZnRlclRzID0gY3VzdG9tVHJhbnNmb3JtZXJzID8gY3VzdG9tVHJhbnNmb3JtZXJzLmFmdGVyVHMgOiB1bmRlZmluZWQ7XG4gICAgcmV0dXJuIHtiZWZvcmU6IGJlZm9yZVRzLCBhZnRlcjogYWZ0ZXJUc307XG4gIH1cblxuICBwcml2YXRlIGluaXRTeW5jKCkge1xuICAgIGlmICh0aGlzLl9hbmFseXplZE1vZHVsZXMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHt0bXBQcm9ncmFtLCBzb3VyY2VGaWxlcywgdHNGaWxlcywgcm9vdE5hbWVzfSA9IHRoaXMuX2NyZWF0ZVByb2dyYW1XaXRoQmFzaWNTdHVicygpO1xuICAgICAgY29uc3Qge2FuYWx5emVkTW9kdWxlcywgYW5hbHl6ZWRJbmplY3RhYmxlc30gPVxuICAgICAgICAgIHRoaXMuY29tcGlsZXIubG9hZEZpbGVzU3luYyhzb3VyY2VGaWxlcywgdHNGaWxlcyk7XG4gICAgICB0aGlzLl91cGRhdGVQcm9ncmFtV2l0aFR5cGVDaGVja1N0dWJzKFxuICAgICAgICAgIHRtcFByb2dyYW0sIGFuYWx5emVkTW9kdWxlcywgYW5hbHl6ZWRJbmplY3RhYmxlcywgcm9vdE5hbWVzKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0aGlzLl9jcmVhdGVQcm9ncmFtT25FcnJvcihlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9jcmVhdGVDb21waWxlcigpIHtcbiAgICBjb25zdCBjb2RlZ2VuOiBDb2RlR2VuZXJhdG9yID0ge1xuICAgICAgZ2VuZXJhdGVGaWxlOiAoZ2VuRmlsZU5hbWUsIGJhc2VGaWxlTmFtZSkgPT5cbiAgICAgICAgICB0aGlzLl9jb21waWxlci5lbWl0QmFzaWNTdHViKGdlbkZpbGVOYW1lLCBiYXNlRmlsZU5hbWUpLFxuICAgICAgZmluZEdlbmVyYXRlZEZpbGVOYW1lczogKGZpbGVOYW1lKSA9PiB0aGlzLl9jb21waWxlci5maW5kR2VuZXJhdGVkRmlsZU5hbWVzKGZpbGVOYW1lKSxcbiAgICB9O1xuXG4gICAgdGhpcy5faG9zdEFkYXB0ZXIgPSBuZXcgVHNDb21waWxlckFvdENvbXBpbGVyVHlwZUNoZWNrSG9zdEFkYXB0ZXIoXG4gICAgICAgIHRoaXMucm9vdE5hbWVzLCB0aGlzLm9wdGlvbnMsIHRoaXMuaG9zdCwgdGhpcy5tZXRhZGF0YUNhY2hlLCBjb2RlZ2VuLFxuICAgICAgICB0aGlzLm9sZFByb2dyYW1MaWJyYXJ5U3VtbWFyaWVzKTtcbiAgICBjb25zdCBhb3RPcHRpb25zID0gZ2V0QW90Q29tcGlsZXJPcHRpb25zKHRoaXMub3B0aW9ucyk7XG4gICAgY29uc3QgZXJyb3JDb2xsZWN0b3IgPSAodGhpcy5vcHRpb25zLmNvbGxlY3RBbGxFcnJvcnMgfHwgdGhpcy5vcHRpb25zLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjaykgP1xuICAgICAgICAoZXJyOiBhbnkpID0+IHRoaXMuX2FkZFN0cnVjdHVyYWxEaWFnbm9zdGljcyhlcnIpIDpcbiAgICAgICAgdW5kZWZpbmVkO1xuICAgIHRoaXMuX2NvbXBpbGVyID0gY3JlYXRlQW90Q29tcGlsZXIodGhpcy5faG9zdEFkYXB0ZXIsIGFvdE9wdGlvbnMsIGVycm9yQ29sbGVjdG9yKS5jb21waWxlcjtcbiAgfVxuXG4gIHByaXZhdGUgX2NyZWF0ZVByb2dyYW1XaXRoQmFzaWNTdHVicygpOiB7XG4gICAgdG1wUHJvZ3JhbTogdHMuUHJvZ3JhbSxcbiAgICByb290TmFtZXM6IHN0cmluZ1tdLFxuICAgIHNvdXJjZUZpbGVzOiBzdHJpbmdbXSxcbiAgICB0c0ZpbGVzOiBzdHJpbmdbXSxcbiAgfSB7XG4gICAgaWYgKHRoaXMuX2FuYWx5emVkTW9kdWxlcykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnRlcm5hbCBFcnJvcjogYWxyZWFkeSBpbml0aWFsaXplZCFgKTtcbiAgICB9XG4gICAgLy8gTm90ZTogVGhpcyBpcyBpbXBvcnRhbnQgdG8gbm90IHByb2R1Y2UgYSBtZW1vcnkgbGVhayFcbiAgICBjb25zdCBvbGRUc1Byb2dyYW0gPSB0aGlzLm9sZFRzUHJvZ3JhbTtcbiAgICB0aGlzLm9sZFRzUHJvZ3JhbSA9IHVuZGVmaW5lZDtcblxuICAgIGNvbnN0IGNvZGVnZW46IENvZGVHZW5lcmF0b3IgPSB7XG4gICAgICBnZW5lcmF0ZUZpbGU6IChnZW5GaWxlTmFtZSwgYmFzZUZpbGVOYW1lKSA9PlxuICAgICAgICAgIHRoaXMuY29tcGlsZXIuZW1pdEJhc2ljU3R1YihnZW5GaWxlTmFtZSwgYmFzZUZpbGVOYW1lKSxcbiAgICAgIGZpbmRHZW5lcmF0ZWRGaWxlTmFtZXM6IChmaWxlTmFtZSkgPT4gdGhpcy5jb21waWxlci5maW5kR2VuZXJhdGVkRmlsZU5hbWVzKGZpbGVOYW1lKSxcbiAgICB9O1xuXG5cbiAgICBsZXQgcm9vdE5hbWVzID0gWy4uLnRoaXMucm9vdE5hbWVzXTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmdlbmVyYXRlQ29kZUZvckxpYnJhcmllcyAhPT0gZmFsc2UpIHtcbiAgICAgIC8vIGlmIHdlIHNob3VsZCBnZW5lcmF0ZUNvZGVGb3JMaWJyYXJpZXMsIG5ldmVyIGluY2x1ZGVcbiAgICAgIC8vIGdlbmVyYXRlZCBmaWxlcyBpbiB0aGUgcHJvZ3JhbSBhcyBvdGhlcndpc2Ugd2Ugd2lsbFxuICAgICAgLy8gb3ZlcndyaXRlIHRoZW0gYW5kIHR5cGVzY3JpcHQgd2lsbCByZXBvcnQgdGhlIGVycm9yXG4gICAgICAvLyBUUzUwNTU6IENhbm5vdCB3cml0ZSBmaWxlIC4uLiBiZWNhdXNlIGl0IHdvdWxkIG92ZXJ3cml0ZSBpbnB1dCBmaWxlLlxuICAgICAgcm9vdE5hbWVzID0gcm9vdE5hbWVzLmZpbHRlcihmbiA9PiAhR0VORVJBVEVEX0ZJTEVTLnRlc3QoZm4pKTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5ub1Jlc29sdmUpIHtcbiAgICAgIHRoaXMucm9vdE5hbWVzLmZvckVhY2gocm9vdE5hbWUgPT4ge1xuICAgICAgICBpZiAodGhpcy5ob3N0QWRhcHRlci5zaG91bGRHZW5lcmF0ZUZpbGVzRm9yKHJvb3ROYW1lKSkge1xuICAgICAgICAgIHJvb3ROYW1lcy5wdXNoKC4uLnRoaXMuY29tcGlsZXIuZmluZEdlbmVyYXRlZEZpbGVOYW1lcyhyb290TmFtZSkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCB0bXBQcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbShyb290TmFtZXMsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0QWRhcHRlciwgb2xkVHNQcm9ncmFtKTtcbiAgICBjb25zdCBzb3VyY2VGaWxlczogc3RyaW5nW10gPSBbXTtcbiAgICBjb25zdCB0c0ZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgIHRtcFByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5mb3JFYWNoKHNmID0+IHtcbiAgICAgIGlmICh0aGlzLmhvc3RBZGFwdGVyLmlzU291cmNlRmlsZShzZi5maWxlTmFtZSkpIHtcbiAgICAgICAgc291cmNlRmlsZXMucHVzaChzZi5maWxlTmFtZSk7XG4gICAgICB9XG4gICAgICBpZiAoVFMudGVzdChzZi5maWxlTmFtZSkgJiYgIURUUy50ZXN0KHNmLmZpbGVOYW1lKSkge1xuICAgICAgICB0c0ZpbGVzLnB1c2goc2YuZmlsZU5hbWUpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB7dG1wUHJvZ3JhbSwgc291cmNlRmlsZXMsIHRzRmlsZXMsIHJvb3ROYW1lc307XG4gIH1cblxuICBwcml2YXRlIF91cGRhdGVQcm9ncmFtV2l0aFR5cGVDaGVja1N0dWJzKFxuICAgICAgdG1wUHJvZ3JhbTogdHMuUHJvZ3JhbSwgYW5hbHl6ZWRNb2R1bGVzOiBOZ0FuYWx5emVkTW9kdWxlcyxcbiAgICAgIGFuYWx5emVkSW5qZWN0YWJsZXM6IE5nQW5hbHl6ZWRGaWxlV2l0aEluamVjdGFibGVzW10sIHJvb3ROYW1lczogc3RyaW5nW10pIHtcbiAgICB0aGlzLl9hbmFseXplZE1vZHVsZXMgPSBhbmFseXplZE1vZHVsZXM7XG4gICAgdGhpcy5fYW5hbHl6ZWRJbmplY3RhYmxlcyA9IGFuYWx5emVkSW5qZWN0YWJsZXM7XG4gICAgdG1wUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZvckVhY2goc2YgPT4ge1xuICAgICAgaWYgKHNmLmZpbGVOYW1lLmVuZHNXaXRoKCcubmdmYWN0b3J5LnRzJykpIHtcbiAgICAgICAgY29uc3Qge2dlbmVyYXRlLCBiYXNlRmlsZU5hbWV9ID0gdGhpcy5ob3N0QWRhcHRlci5zaG91bGRHZW5lcmF0ZUZpbGUoc2YuZmlsZU5hbWUpO1xuICAgICAgICBpZiAoZ2VuZXJhdGUpIHtcbiAgICAgICAgICAvLyBOb3RlOiAhIGlzIG9rIGFzIGhvc3RBZGFwdGVyLnNob3VsZEdlbmVyYXRlRmlsZSB3aWxsIGFsd2F5cyByZXR1cm4gYSBiYXNlRmlsZU5hbWVcbiAgICAgICAgICAvLyBmb3IgLm5nZmFjdG9yeS50cyBmaWxlcy5cbiAgICAgICAgICBjb25zdCBnZW5GaWxlID0gdGhpcy5jb21waWxlci5lbWl0VHlwZUNoZWNrU3R1YihzZi5maWxlTmFtZSwgYmFzZUZpbGVOYW1lISk7XG4gICAgICAgICAgaWYgKGdlbkZpbGUpIHtcbiAgICAgICAgICAgIHRoaXMuaG9zdEFkYXB0ZXIudXBkYXRlR2VuZXJhdGVkRmlsZShnZW5GaWxlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLl90c1Byb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKHJvb3ROYW1lcywgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3RBZGFwdGVyLCB0bXBQcm9ncmFtKTtcbiAgICAvLyBOb3RlOiB0aGUgbmV3IHRzIHByb2dyYW0gc2hvdWxkIGJlIGNvbXBsZXRlbHkgcmV1c2FibGUgYnkgVHlwZVNjcmlwdCBhczpcbiAgICAvLyAtIHdlIGNhY2hlIGFsbCB0aGUgZmlsZXMgaW4gdGhlIGhvc3RBZGFwdGVyXG4gICAgLy8gLSBuZXcgbmV3IHN0dWJzIHVzZSB0aGUgZXhhY3RseSBzYW1lIGltcG9ydHMvZXhwb3J0cyBhcyB0aGUgb2xkIG9uY2UgKHdlIGFzc2VydCB0aGF0IGluXG4gICAgLy8gaG9zdEFkYXB0ZXIudXBkYXRlR2VuZXJhdGVkRmlsZSkuXG4gICAgaWYgKHRzU3RydWN0dXJlSXNSZXVzZWQodG1wUHJvZ3JhbSkgIT09IFN0cnVjdHVyZUlzUmV1c2VkLkNvbXBsZXRlbHkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW50ZXJuYWwgRXJyb3I6IFRoZSBzdHJ1Y3R1cmUgb2YgdGhlIHByb2dyYW0gY2hhbmdlZCBkdXJpbmcgY29kZWdlbi5gKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9jcmVhdGVQcm9ncmFtT25FcnJvcihlOiBhbnkpIHtcbiAgICAvLyBTdGlsbCBmaWxsIHRoZSBhbmFseXplZE1vZHVsZXMgYW5kIHRoZSB0c1Byb2dyYW1cbiAgICAvLyBzbyB0aGF0IHdlIGRvbid0IGNhdXNlIG90aGVyIGVycm9ycyBmb3IgdXNlcnMgd2hvIGUuZy4gd2FudCB0byBlbWl0IHRoZSBuZ1Byb2dyYW0uXG4gICAgdGhpcy5fYW5hbHl6ZWRNb2R1bGVzID0gZW1wdHlNb2R1bGVzO1xuICAgIHRoaXMub2xkVHNQcm9ncmFtID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX2hvc3RBZGFwdGVyLmlzU291cmNlRmlsZSA9ICgpID0+IGZhbHNlO1xuICAgIHRoaXMuX3RzUHJvZ3JhbSA9IHRzLmNyZWF0ZVByb2dyYW0odGhpcy5yb290TmFtZXMsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0QWRhcHRlcik7XG4gICAgaWYgKGlzU3ludGF4RXJyb3IoZSkpIHtcbiAgICAgIHRoaXMuX2FkZFN0cnVjdHVyYWxEaWFnbm9zdGljcyhlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhyb3cgZTtcbiAgfVxuXG4gIHByaXZhdGUgX2FkZFN0cnVjdHVyYWxEaWFnbm9zdGljcyhlcnJvcjogRXJyb3IpIHtcbiAgICBjb25zdCBkaWFnbm9zdGljcyA9IHRoaXMuX3N0cnVjdHVyYWxEaWFnbm9zdGljcyB8fCAodGhpcy5fc3RydWN0dXJhbERpYWdub3N0aWNzID0gW10pO1xuICAgIGlmIChpc1N5bnRheEVycm9yKGVycm9yKSkge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5zeW50YXhFcnJvclRvRGlhZ25vc3RpY3MoZXJyb3IpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCh7XG4gICAgICAgIG1lc3NhZ2VUZXh0OiBlcnJvci50b1N0cmluZygpLFxuICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICBzb3VyY2U6IFNPVVJDRSxcbiAgICAgICAgY29kZTogREVGQVVMVF9FUlJPUl9DT0RFXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvLyBOb3RlOiB0aGlzIHJldHVybnMgYSB0cy5EaWFnbm9zdGljIHNvIHRoYXQgd2VcbiAgLy8gY2FuIHJldHVybiBlcnJvcnMgaW4gYSB0cy5FbWl0UmVzdWx0XG4gIHByaXZhdGUgZ2VuZXJhdGVGaWxlc0ZvckVtaXQoZW1pdEZsYWdzOiBFbWl0RmxhZ3MpOlxuICAgICAge2dlbkZpbGVzOiBHZW5lcmF0ZWRGaWxlW10sIGdlbkRpYWdzOiB0cy5EaWFnbm9zdGljW119IHtcbiAgICB0cnkge1xuICAgICAgaWYgKCEoZW1pdEZsYWdzICYgRW1pdEZsYWdzLkNvZGVnZW4pKSB7XG4gICAgICAgIHJldHVybiB7Z2VuRmlsZXM6IFtdLCBnZW5EaWFnczogW119O1xuICAgICAgfVxuICAgICAgLy8gVE9ETyh0Ym9zY2gpOiBhbGxvdyBnZW5lcmF0aW5nIGZpbGVzIHRoYXQgYXJlIG5vdCBpbiB0aGUgcm9vdERpclxuICAgICAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvaXNzdWVzLzE5MzM3XG4gICAgICBsZXQgZ2VuRmlsZXMgPSB0aGlzLmNvbXBpbGVyLmVtaXRBbGxJbXBscyh0aGlzLmFuYWx5emVkTW9kdWxlcylcbiAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGdlbkZpbGUgPT4gaXNJblJvb3REaXIoZ2VuRmlsZS5nZW5GaWxlVXJsLCB0aGlzLm9wdGlvbnMpKTtcbiAgICAgIGlmICh0aGlzLm9sZFByb2dyYW1FbWl0dGVkR2VuZXJhdGVkRmlsZXMpIHtcbiAgICAgICAgY29uc3Qgb2xkUHJvZ3JhbUVtaXR0ZWRHZW5lcmF0ZWRGaWxlcyA9IHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRHZW5lcmF0ZWRGaWxlcztcbiAgICAgICAgZ2VuRmlsZXMgPSBnZW5GaWxlcy5maWx0ZXIoZ2VuRmlsZSA9PiB7XG4gICAgICAgICAgY29uc3Qgb2xkR2VuRmlsZSA9IG9sZFByb2dyYW1FbWl0dGVkR2VuZXJhdGVkRmlsZXMuZ2V0KGdlbkZpbGUuZ2VuRmlsZVVybCk7XG4gICAgICAgICAgcmV0dXJuICFvbGRHZW5GaWxlIHx8ICFnZW5GaWxlLmlzRXF1aXZhbGVudChvbGRHZW5GaWxlKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4ge2dlbkZpbGVzLCBnZW5EaWFnczogW119O1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIFRPRE8odGJvc2NoKTogY2hlY2sgd2hldGhlciB3ZSBjYW4gYWN0dWFsbHkgaGF2ZSBzeW50YXggZXJyb3JzIGhlcmUsXG4gICAgICAvLyBhcyB3ZSBhbHJlYWR5IHBhcnNlZCB0aGUgbWV0YWRhdGEgYW5kIHRlbXBsYXRlcyBiZWZvcmUgdG8gY3JlYXRlIHRoZSB0eXBlIGNoZWNrIGJsb2NrLlxuICAgICAgaWYgKGlzU3ludGF4RXJyb3IoZSkpIHtcbiAgICAgICAgY29uc3QgZ2VuRGlhZ3M6IHRzLkRpYWdub3N0aWNbXSA9IFt7XG4gICAgICAgICAgZmlsZTogdW5kZWZpbmVkLFxuICAgICAgICAgIHN0YXJ0OiB1bmRlZmluZWQsXG4gICAgICAgICAgbGVuZ3RoOiB1bmRlZmluZWQsXG4gICAgICAgICAgbWVzc2FnZVRleHQ6IGUubWVzc2FnZSxcbiAgICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICAgIHNvdXJjZTogU09VUkNFLFxuICAgICAgICAgIGNvZGU6IERFRkFVTFRfRVJST1JfQ09ERVxuICAgICAgICB9XTtcbiAgICAgICAgcmV0dXJuIHtnZW5GaWxlczogW10sIGdlbkRpYWdzfTtcbiAgICAgIH1cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdW5kZWZpbmVkIGlmIGFsbCBmaWxlcyBzaG91bGQgYmUgZW1pdHRlZC5cbiAgICovXG4gIHByaXZhdGUgZ2V0U291cmNlRmlsZXNGb3JFbWl0KCk6IHRzLlNvdXJjZUZpbGVbXXx1bmRlZmluZWQge1xuICAgIC8vIFRPRE8odGJvc2NoKTogaWYgb25lIG9mIHRoZSBmaWxlcyBjb250YWlucyBhIGBjb25zdCBlbnVtYFxuICAgIC8vIGFsd2F5cyBlbWl0IGFsbCBmaWxlcyAtPiByZXR1cm4gdW5kZWZpbmVkIVxuICAgIGxldCBzb3VyY2VGaWxlc1RvRW1pdCA9IHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZmlsdGVyKHNmID0+IHtcbiAgICAgIHJldHVybiAhc2YuaXNEZWNsYXJhdGlvbkZpbGUgJiYgIUdFTkVSQVRFRF9GSUxFUy50ZXN0KHNmLmZpbGVOYW1lKTtcbiAgICB9KTtcbiAgICBpZiAodGhpcy5vbGRQcm9ncmFtRW1pdHRlZFNvdXJjZUZpbGVzKSB7XG4gICAgICBzb3VyY2VGaWxlc1RvRW1pdCA9IHNvdXJjZUZpbGVzVG9FbWl0LmZpbHRlcihzZiA9PiB7XG4gICAgICAgIGNvbnN0IG9sZEZpbGUgPSB0aGlzLm9sZFByb2dyYW1FbWl0dGVkU291cmNlRmlsZXMhLmdldChzZi5maWxlTmFtZSk7XG4gICAgICAgIHJldHVybiBzZiAhPT0gb2xkRmlsZTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gc291cmNlRmlsZXNUb0VtaXQ7XG4gIH1cblxuICBwcml2YXRlIHdyaXRlRmlsZShcbiAgICAgIG91dEZpbGVOYW1lOiBzdHJpbmcsIG91dERhdGE6IHN0cmluZywgd3JpdGVCeXRlT3JkZXJNYXJrOiBib29sZWFuLFxuICAgICAgb25FcnJvcj86IChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQsIGdlbkZpbGU/OiBHZW5lcmF0ZWRGaWxlLFxuICAgICAgc291cmNlRmlsZXM/OiBSZWFkb25seUFycmF5PHRzLlNvdXJjZUZpbGU+KSB7XG4gICAgLy8gY29sbGVjdCBlbWl0dGVkTGlicmFyeVN1bW1hcmllc1xuICAgIGxldCBiYXNlRmlsZTogdHMuU291cmNlRmlsZXx1bmRlZmluZWQ7XG4gICAgaWYgKGdlbkZpbGUpIHtcbiAgICAgIGJhc2VGaWxlID0gdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZShnZW5GaWxlLnNyY0ZpbGVVcmwpO1xuICAgICAgaWYgKGJhc2VGaWxlKSB7XG4gICAgICAgIGlmICghdGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcykge1xuICAgICAgICAgIHRoaXMuZW1pdHRlZExpYnJhcnlTdW1tYXJpZXMgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZ2VuRmlsZS5nZW5GaWxlVXJsLmVuZHNXaXRoKCcubmdzdW1tYXJ5Lmpzb24nKSAmJiBiYXNlRmlsZS5maWxlTmFtZS5lbmRzV2l0aCgnLmQudHMnKSkge1xuICAgICAgICAgIHRoaXMuZW1pdHRlZExpYnJhcnlTdW1tYXJpZXMucHVzaCh7XG4gICAgICAgICAgICBmaWxlTmFtZTogYmFzZUZpbGUuZmlsZU5hbWUsXG4gICAgICAgICAgICB0ZXh0OiBiYXNlRmlsZS50ZXh0LFxuICAgICAgICAgICAgc291cmNlRmlsZTogYmFzZUZpbGUsXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcy5wdXNoKHtmaWxlTmFtZTogZ2VuRmlsZS5nZW5GaWxlVXJsLCB0ZXh0OiBvdXREYXRhfSk7XG4gICAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuZGVjbGFyYXRpb24pIHtcbiAgICAgICAgICAgIC8vIElmIHdlIGRvbid0IGVtaXQgZGVjbGFyYXRpb25zLCBzdGlsbCByZWNvcmQgYW4gZW1wdHkgLm5nZmFjdG9yeS5kLnRzIGZpbGUsXG4gICAgICAgICAgICAvLyBhcyB3ZSBtaWdodCBuZWVkIGl0IGxhdGVyIG9uIGZvciByZXNvbHZpbmcgbW9kdWxlIG5hbWVzIGZyb20gc3VtbWFyaWVzLlxuICAgICAgICAgICAgY29uc3QgbmdGYWN0b3J5RHRzID1cbiAgICAgICAgICAgICAgICBnZW5GaWxlLmdlbkZpbGVVcmwuc3Vic3RyaW5nKDAsIGdlbkZpbGUuZ2VuRmlsZVVybC5sZW5ndGggLSAxNSkgKyAnLm5nZmFjdG9yeS5kLnRzJztcbiAgICAgICAgICAgIHRoaXMuZW1pdHRlZExpYnJhcnlTdW1tYXJpZXMucHVzaCh7ZmlsZU5hbWU6IG5nRmFjdG9yeUR0cywgdGV4dDogJyd9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAob3V0RmlsZU5hbWUuZW5kc1dpdGgoJy5kLnRzJykgJiYgYmFzZUZpbGUuZmlsZU5hbWUuZW5kc1dpdGgoJy5kLnRzJykpIHtcbiAgICAgICAgICBjb25zdCBkdHNTb3VyY2VGaWxlUGF0aCA9IGdlbkZpbGUuZ2VuRmlsZVVybC5yZXBsYWNlKC9cXC50cyQvLCAnLmQudHMnKTtcbiAgICAgICAgICAvLyBOb3RlOiBEb24ndCB1c2Ugc291cmNlRmlsZXMgaGVyZSBhcyB0aGUgY3JlYXRlZCAuZC50cyBoYXMgYSBwYXRoIGluIHRoZSBvdXREaXIsXG4gICAgICAgICAgLy8gYnV0IHdlIG5lZWQgb25lIHRoYXQgaXMgbmV4dCB0byB0aGUgLnRzIGZpbGVcbiAgICAgICAgICB0aGlzLmVtaXR0ZWRMaWJyYXJ5U3VtbWFyaWVzLnB1c2goe2ZpbGVOYW1lOiBkdHNTb3VyY2VGaWxlUGF0aCwgdGV4dDogb3V0RGF0YX0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEZpbHRlciBvdXQgZ2VuZXJhdGVkIGZpbGVzIGZvciB3aGljaCB3ZSBkaWRuJ3QgZ2VuZXJhdGUgY29kZS5cbiAgICAvLyBUaGlzIGNhbiBoYXBwZW4gYXMgdGhlIHN0dWIgY2FsY3VsYXRpb24gaXMgbm90IGNvbXBsZXRlbHkgZXhhY3QuXG4gICAgLy8gTm90ZTogc291cmNlRmlsZSByZWZlcnMgdG8gdGhlIC5uZ2ZhY3RvcnkudHMgLyAubmdzdW1tYXJ5LnRzIGZpbGVcbiAgICAvLyBub2RlX2VtaXR0ZXJfdHJhbnNmb3JtIGFscmVhZHkgc2V0IHRoZSBmaWxlIGNvbnRlbnRzIHRvIGJlIGVtcHR5LFxuICAgIC8vICBzbyB0aGlzIGNvZGUgb25seSBuZWVkcyB0byBza2lwIHRoZSBmaWxlIGlmICFhbGxvd0VtcHR5Q29kZWdlbkZpbGVzLlxuICAgIGNvbnN0IGlzR2VuZXJhdGVkID0gR0VORVJBVEVEX0ZJTEVTLnRlc3Qob3V0RmlsZU5hbWUpO1xuICAgIGlmIChpc0dlbmVyYXRlZCAmJiAhdGhpcy5vcHRpb25zLmFsbG93RW1wdHlDb2RlZ2VuRmlsZXMgJiZcbiAgICAgICAgKCFnZW5GaWxlIHx8ICFnZW5GaWxlLnN0bXRzIHx8IGdlbkZpbGUuc3RtdHMubGVuZ3RoID09PSAwKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoYmFzZUZpbGUpIHtcbiAgICAgIHNvdXJjZUZpbGVzID0gc291cmNlRmlsZXMgPyBbLi4uc291cmNlRmlsZXMsIGJhc2VGaWxlXSA6IFtiYXNlRmlsZV07XG4gICAgfVxuICAgIC8vIFRPRE86IHJlbW92ZSBhbnkgd2hlbiBUUyAyLjQgc3VwcG9ydCBpcyByZW1vdmVkLlxuICAgIHRoaXMuaG9zdC53cml0ZUZpbGUob3V0RmlsZU5hbWUsIG91dERhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvciwgc291cmNlRmlsZXMgYXMgYW55KTtcbiAgfVxufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQcm9ncmFtKHtyb290TmFtZXMsIG9wdGlvbnMsIGhvc3QsIG9sZFByb2dyYW19OiB7XG4gIHJvb3ROYW1lczogUmVhZG9ubHlBcnJheTxzdHJpbmc+LFxuICBvcHRpb25zOiBDb21waWxlck9wdGlvbnMsXG4gIGhvc3Q6IENvbXBpbGVySG9zdCxcbiAgb2xkUHJvZ3JhbT86IFByb2dyYW1cbn0pOiBQcm9ncmFtIHtcbiAgaWYgKG9wdGlvbnMuZW5hYmxlSXZ5ICE9PSBmYWxzZSkge1xuICAgIHJldHVybiBuZXcgTmd0c2NQcm9ncmFtKHJvb3ROYW1lcywgb3B0aW9ucywgaG9zdCwgb2xkUHJvZ3JhbSBhcyBOZ3RzY1Byb2dyYW0gfCB1bmRlZmluZWQpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgQW5ndWxhckNvbXBpbGVyUHJvZ3JhbShyb290TmFtZXMsIG9wdGlvbnMsIGhvc3QsIG9sZFByb2dyYW0pO1xuICB9XG59XG5cbi8vIENvbXB1dGUgdGhlIEFvdENvbXBpbGVyIG9wdGlvbnNcbmZ1bmN0aW9uIGdldEFvdENvbXBpbGVyT3B0aW9ucyhvcHRpb25zOiBDb21waWxlck9wdGlvbnMpOiBBb3RDb21waWxlck9wdGlvbnMge1xuICBsZXQgbWlzc2luZ1RyYW5zbGF0aW9uID0gY29yZS5NaXNzaW5nVHJhbnNsYXRpb25TdHJhdGVneS5XYXJuaW5nO1xuXG4gIHN3aXRjaCAob3B0aW9ucy5pMThuSW5NaXNzaW5nVHJhbnNsYXRpb25zKSB7XG4gICAgY2FzZSAnaWdub3JlJzpcbiAgICAgIG1pc3NpbmdUcmFuc2xhdGlvbiA9IGNvcmUuTWlzc2luZ1RyYW5zbGF0aW9uU3RyYXRlZ3kuSWdub3JlO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnZXJyb3InOlxuICAgICAgbWlzc2luZ1RyYW5zbGF0aW9uID0gY29yZS5NaXNzaW5nVHJhbnNsYXRpb25TdHJhdGVneS5FcnJvcjtcbiAgICAgIGJyZWFrO1xuICB9XG5cbiAgbGV0IHRyYW5zbGF0aW9uczogc3RyaW5nID0gJyc7XG5cbiAgaWYgKG9wdGlvbnMuaTE4bkluRmlsZSkge1xuICAgIGlmICghb3B0aW9ucy5pMThuSW5Mb2NhbGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIHRyYW5zbGF0aW9uIGZpbGUgKCR7b3B0aW9ucy5pMThuSW5GaWxlfSkgbG9jYWxlIG11c3QgYmUgcHJvdmlkZWQuYCk7XG4gICAgfVxuICAgIHRyYW5zbGF0aW9ucyA9IGZzLnJlYWRGaWxlU3luYyhvcHRpb25zLmkxOG5JbkZpbGUsICd1dGY4Jyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTm8gdHJhbnNsYXRpb25zIGFyZSBwcm92aWRlZCwgaWdub3JlIGFueSBlcnJvcnNcbiAgICAvLyBXZSBzdGlsbCBnbyB0aHJvdWdoIGkxOG4gdG8gcmVtb3ZlIGkxOG4gYXR0cmlidXRlc1xuICAgIG1pc3NpbmdUcmFuc2xhdGlvbiA9IGNvcmUuTWlzc2luZ1RyYW5zbGF0aW9uU3RyYXRlZ3kuSWdub3JlO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBsb2NhbGU6IG9wdGlvbnMuaTE4bkluTG9jYWxlLFxuICAgIGkxOG5Gb3JtYXQ6IG9wdGlvbnMuaTE4bkluRm9ybWF0IHx8IG9wdGlvbnMuaTE4bk91dEZvcm1hdCxcbiAgICBpMThuVXNlRXh0ZXJuYWxJZHM6IG9wdGlvbnMuaTE4blVzZUV4dGVybmFsSWRzLFxuICAgIHRyYW5zbGF0aW9ucyxcbiAgICBtaXNzaW5nVHJhbnNsYXRpb24sXG4gICAgZW5hYmxlU3VtbWFyaWVzRm9ySml0OiBvcHRpb25zLmVuYWJsZVN1bW1hcmllc0ZvckppdCxcbiAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiBvcHRpb25zLnByZXNlcnZlV2hpdGVzcGFjZXMsXG4gICAgZnVsbFRlbXBsYXRlVHlwZUNoZWNrOiBvcHRpb25zLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjayxcbiAgICBhbGxvd0VtcHR5Q29kZWdlbkZpbGVzOiBvcHRpb25zLmFsbG93RW1wdHlDb2RlZ2VuRmlsZXMsXG4gICAgZW5hYmxlSXZ5OiBvcHRpb25zLmVuYWJsZUl2eSxcbiAgICBjcmVhdGVFeHRlcm5hbFN5bWJvbEZhY3RvcnlSZWV4cG9ydHM6IG9wdGlvbnMuY3JlYXRlRXh0ZXJuYWxTeW1ib2xGYWN0b3J5UmVleHBvcnRzLFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXROZ09wdGlvbkRpYWdub3N0aWNzKG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucyk6IFJlYWRvbmx5QXJyYXk8RGlhZ25vc3RpYz4ge1xuICBpZiAob3B0aW9ucy5hbm5vdGF0aW9uc0FzKSB7XG4gICAgc3dpdGNoIChvcHRpb25zLmFubm90YXRpb25zQXMpIHtcbiAgICAgIGNhc2UgJ2RlY29yYXRvcnMnOlxuICAgICAgY2FzZSAnc3RhdGljIGZpZWxkcyc6XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIFt7XG4gICAgICAgICAgbWVzc2FnZVRleHQ6XG4gICAgICAgICAgICAgICdBbmd1bGFyIGNvbXBpbGVyIG9wdGlvbnMgXCJhbm5vdGF0aW9uc0FzXCIgb25seSBzdXBwb3J0cyBcInN0YXRpYyBmaWVsZHNcIiBhbmQgXCJkZWNvcmF0b3JzXCInLFxuICAgICAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICAgICAgc291cmNlOiBTT1VSQ0UsXG4gICAgICAgICAgY29kZTogREVGQVVMVF9FUlJPUl9DT0RFXG4gICAgICAgIH1dO1xuICAgIH1cbiAgfVxuICByZXR1cm4gW107XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVNlcGFyYXRvcnMocGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xufVxuXG4vKipcbiAqIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IGNhbiBhZGp1c3QgYSBwYXRoIGZyb20gc291cmNlIHBhdGggdG8gb3V0IHBhdGgsXG4gKiBiYXNlZCBvbiBhbiBleGlzdGluZyBtYXBwaW5nIGZyb20gc291cmNlIHRvIG91dCBwYXRoLlxuICpcbiAqIFRPRE8odGJvc2NoKTogdGFsayB0byB0aGUgVHlwZVNjcmlwdCB0ZWFtIHRvIGV4cG9zZSB0aGVpciBsb2dpYyBmb3IgY2FsY3VsYXRpbmcgdGhlIGByb290RGlyYFxuICogaWYgbm9uZSB3YXMgc3BlY2lmaWVkLlxuICpcbiAqIE5vdGU6IFRoaXMgZnVuY3Rpb24gd29ya3Mgb24gbm9ybWFsaXplZCBwYXRocyBmcm9tIHR5cGVzY3JpcHQgYnV0IHNob3VsZCBhbHdheXMgcmV0dXJuXG4gKiBQT1NJWCBub3JtYWxpemVkIHBhdGhzIGZvciBvdXRwdXQgcGF0aHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTcmNUb091dFBhdGhNYXBwZXIoXG4gICAgb3V0RGlyOiBzdHJpbmd8dW5kZWZpbmVkLCBzYW1wbGVTcmNGaWxlTmFtZTogc3RyaW5nfHVuZGVmaW5lZCxcbiAgICBzYW1wbGVPdXRGaWxlTmFtZTogc3RyaW5nfHVuZGVmaW5lZCwgaG9zdDoge1xuICAgICAgZGlybmFtZTogdHlwZW9mIHBhdGguZGlybmFtZSxcbiAgICAgIHJlc29sdmU6IHR5cGVvZiBwYXRoLnJlc29sdmUsXG4gICAgICByZWxhdGl2ZTogdHlwZW9mIHBhdGgucmVsYXRpdmVcbiAgICB9ID0gcGF0aCk6IChzcmNGaWxlTmFtZTogc3RyaW5nKSA9PiBzdHJpbmcge1xuICBpZiAob3V0RGlyKSB7XG4gICAgbGV0IHBhdGg6IHt9ID0ge307ICAvLyBFbnN1cmUgd2UgZXJyb3IgaWYgd2UgdXNlIGBwYXRoYCBpbnN0ZWFkIG9mIGBob3N0YC5cbiAgICBpZiAoc2FtcGxlU3JjRmlsZU5hbWUgPT0gbnVsbCB8fCBzYW1wbGVPdXRGaWxlTmFtZSA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbid0IGNhbGN1bGF0ZSB0aGUgcm9vdERpciB3aXRob3V0IGEgc2FtcGxlIHNyY0ZpbGVOYW1lIC8gb3V0RmlsZU5hbWUuIGApO1xuICAgIH1cbiAgICBjb25zdCBzcmNGaWxlRGlyID0gbm9ybWFsaXplU2VwYXJhdG9ycyhob3N0LmRpcm5hbWUoc2FtcGxlU3JjRmlsZU5hbWUpKTtcbiAgICBjb25zdCBvdXRGaWxlRGlyID0gbm9ybWFsaXplU2VwYXJhdG9ycyhob3N0LmRpcm5hbWUoc2FtcGxlT3V0RmlsZU5hbWUpKTtcbiAgICBpZiAoc3JjRmlsZURpciA9PT0gb3V0RmlsZURpcikge1xuICAgICAgcmV0dXJuIChzcmNGaWxlTmFtZSkgPT4gc3JjRmlsZU5hbWU7XG4gICAgfVxuICAgIC8vIGNhbGN1bGF0ZSB0aGUgY29tbW9uIHN1ZmZpeCwgc3RvcHBpbmdcbiAgICAvLyBhdCBgb3V0RGlyYC5cbiAgICBjb25zdCBzcmNEaXJQYXJ0cyA9IHNyY0ZpbGVEaXIuc3BsaXQoJy8nKTtcbiAgICBjb25zdCBvdXREaXJQYXJ0cyA9IG5vcm1hbGl6ZVNlcGFyYXRvcnMoaG9zdC5yZWxhdGl2ZShvdXREaXIsIG91dEZpbGVEaXIpKS5zcGxpdCgnLycpO1xuICAgIGxldCBpID0gMDtcbiAgICB3aGlsZSAoaSA8IE1hdGgubWluKHNyY0RpclBhcnRzLmxlbmd0aCwgb3V0RGlyUGFydHMubGVuZ3RoKSAmJlxuICAgICAgICAgICBzcmNEaXJQYXJ0c1tzcmNEaXJQYXJ0cy5sZW5ndGggLSAxIC0gaV0gPT09IG91dERpclBhcnRzW291dERpclBhcnRzLmxlbmd0aCAtIDEgLSBpXSlcbiAgICAgIGkrKztcbiAgICBjb25zdCByb290RGlyID0gc3JjRGlyUGFydHMuc2xpY2UoMCwgc3JjRGlyUGFydHMubGVuZ3RoIC0gaSkuam9pbignLycpO1xuICAgIHJldHVybiAoc3JjRmlsZU5hbWUpID0+IHtcbiAgICAgIC8vIE5vdGU6IEJlZm9yZSB3ZSByZXR1cm4gdGhlIG1hcHBlZCBvdXRwdXQgcGF0aCwgd2UgbmVlZCB0byBub3JtYWxpemUgdGhlIHBhdGggZGVsaW1pdGVyc1xuICAgICAgLy8gYmVjYXVzZSB0aGUgb3V0cHV0IHBhdGggaXMgdXN1YWxseSBwYXNzZWQgdG8gVHlwZVNjcmlwdCB3aGljaCBzb21ldGltZXMgb25seSBleHBlY3RzXG4gICAgICAvLyBwb3NpeCBub3JtYWxpemVkIHBhdGhzIChlLmcuIGlmIGEgY3VzdG9tIGNvbXBpbGVyIGhvc3QgaXMgdXNlZClcbiAgICAgIHJldHVybiBub3JtYWxpemVTZXBhcmF0b3JzKGhvc3QucmVzb2x2ZShvdXREaXIsIGhvc3QucmVsYXRpdmUocm9vdERpciwgc3JjRmlsZU5hbWUpKSk7XG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICAvLyBOb3RlOiBCZWZvcmUgd2UgcmV0dXJuIHRoZSBvdXRwdXQgcGF0aCwgd2UgbmVlZCB0byBub3JtYWxpemUgdGhlIHBhdGggZGVsaW1pdGVycyBiZWNhdXNlXG4gICAgLy8gdGhlIG91dHB1dCBwYXRoIGlzIHVzdWFsbHkgcGFzc2VkIHRvIFR5cGVTY3JpcHQgd2hpY2ggb25seSBwYXNzZXMgYXJvdW5kIHBvc2l4XG4gICAgLy8gbm9ybWFsaXplZCBwYXRocyAoZS5nLiBpZiBhIGN1c3RvbSBjb21waWxlciBob3N0IGlzIHVzZWQpXG4gICAgcmV0dXJuIChzcmNGaWxlTmFtZSkgPT4gbm9ybWFsaXplU2VwYXJhdG9ycyhzcmNGaWxlTmFtZSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGkxOG5FeHRyYWN0KFxuICAgIGZvcm1hdE5hbWU6IHN0cmluZ3xudWxsLCBvdXRGaWxlOiBzdHJpbmd8bnVsbCwgaG9zdDogdHMuQ29tcGlsZXJIb3N0LCBvcHRpb25zOiBDb21waWxlck9wdGlvbnMsXG4gICAgYnVuZGxlOiBNZXNzYWdlQnVuZGxlKTogc3RyaW5nW10ge1xuICBmb3JtYXROYW1lID0gZm9ybWF0TmFtZSB8fCAneGxmJztcbiAgLy8gQ2hlY2tzIHRoZSBmb3JtYXQgYW5kIHJldHVybnMgdGhlIGV4dGVuc2lvblxuICBjb25zdCBleHQgPSBpMThuR2V0RXh0ZW5zaW9uKGZvcm1hdE5hbWUpO1xuICBjb25zdCBjb250ZW50ID0gaTE4blNlcmlhbGl6ZShidW5kbGUsIGZvcm1hdE5hbWUsIG9wdGlvbnMpO1xuICBjb25zdCBkc3RGaWxlID0gb3V0RmlsZSB8fCBgbWVzc2FnZXMuJHtleHR9YDtcbiAgY29uc3QgZHN0UGF0aCA9IHBhdGgucmVzb2x2ZShvcHRpb25zLm91dERpciB8fCBvcHRpb25zLmJhc2VQYXRoISwgZHN0RmlsZSk7XG4gIGhvc3Qud3JpdGVGaWxlKGRzdFBhdGgsIGNvbnRlbnQsIGZhbHNlLCB1bmRlZmluZWQsIFtdKTtcbiAgcmV0dXJuIFtkc3RQYXRoXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGkxOG5TZXJpYWxpemUoXG4gICAgYnVuZGxlOiBNZXNzYWdlQnVuZGxlLCBmb3JtYXROYW1lOiBzdHJpbmcsIG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucyk6IHN0cmluZyB7XG4gIGNvbnN0IGZvcm1hdCA9IGZvcm1hdE5hbWUudG9Mb3dlckNhc2UoKTtcbiAgbGV0IHNlcmlhbGl6ZXI6IFNlcmlhbGl6ZXI7XG5cbiAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICBjYXNlICd4bWInOlxuICAgICAgc2VyaWFsaXplciA9IG5ldyBYbWIoKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3hsaWZmMic6XG4gICAgY2FzZSAneGxmMic6XG4gICAgICBzZXJpYWxpemVyID0gbmV3IFhsaWZmMigpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAneGxmJzpcbiAgICBjYXNlICd4bGlmZic6XG4gICAgZGVmYXVsdDpcbiAgICAgIHNlcmlhbGl6ZXIgPSBuZXcgWGxpZmYoKTtcbiAgfVxuXG4gIHJldHVybiBidW5kbGUud3JpdGUoc2VyaWFsaXplciwgZ2V0UGF0aE5vcm1hbGl6ZXIob3B0aW9ucy5iYXNlUGF0aCkpO1xufVxuXG5mdW5jdGlvbiBnZXRQYXRoTm9ybWFsaXplcihiYXNlUGF0aD86IHN0cmluZykge1xuICAvLyBub3JtYWxpemUgc291cmNlIHBhdGhzIGJ5IHJlbW92aW5nIHRoZSBiYXNlIHBhdGggYW5kIGFsd2F5cyB1c2luZyBcIi9cIiBhcyBhIHNlcGFyYXRvclxuICByZXR1cm4gKHNvdXJjZVBhdGg6IHN0cmluZykgPT4ge1xuICAgIHNvdXJjZVBhdGggPSBiYXNlUGF0aCA/IHBhdGgucmVsYXRpdmUoYmFzZVBhdGgsIHNvdXJjZVBhdGgpIDogc291cmNlUGF0aDtcbiAgICByZXR1cm4gc291cmNlUGF0aC5zcGxpdChwYXRoLnNlcCkuam9pbignLycpO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaTE4bkdldEV4dGVuc2lvbihmb3JtYXROYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBmb3JtYXQgPSBmb3JtYXROYW1lLnRvTG93ZXJDYXNlKCk7XG5cbiAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICBjYXNlICd4bWInOlxuICAgICAgcmV0dXJuICd4bWInO1xuICAgIGNhc2UgJ3hsZic6XG4gICAgY2FzZSAneGxpZic6XG4gICAgY2FzZSAneGxpZmYnOlxuICAgIGNhc2UgJ3hsZjInOlxuICAgIGNhc2UgJ3hsaWZmMic6XG4gICAgICByZXR1cm4gJ3hsZic7XG4gIH1cblxuICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIGZvcm1hdCBcIiR7Zm9ybWF0TmFtZX1cImApO1xufVxuXG5mdW5jdGlvbiBtZXJnZUVtaXRSZXN1bHRzKGVtaXRSZXN1bHRzOiB0cy5FbWl0UmVzdWx0W10pOiB0cy5FbWl0UmVzdWx0IHtcbiAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICBsZXQgZW1pdFNraXBwZWQgPSBmYWxzZTtcbiAgY29uc3QgZW1pdHRlZEZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IGVyIG9mIGVtaXRSZXN1bHRzKSB7XG4gICAgZGlhZ25vc3RpY3MucHVzaCguLi5lci5kaWFnbm9zdGljcyk7XG4gICAgZW1pdFNraXBwZWQgPSBlbWl0U2tpcHBlZCB8fCBlci5lbWl0U2tpcHBlZDtcbiAgICBlbWl0dGVkRmlsZXMucHVzaCguLi4oZXIuZW1pdHRlZEZpbGVzIHx8IFtdKSk7XG4gIH1cbiAgcmV0dXJuIHtkaWFnbm9zdGljcywgZW1pdFNraXBwZWQsIGVtaXR0ZWRGaWxlc307XG59XG5cbmZ1bmN0aW9uIGRpYWdub3N0aWNTb3VyY2VPZlNwYW4oc3BhbjogUGFyc2VTb3VyY2VTcGFuKTogdHMuU291cmNlRmlsZSB7XG4gIC8vIEZvciBkaWFnbm9zdGljcywgVHlwZVNjcmlwdCBvbmx5IHVzZXMgdGhlIGZpbGVOYW1lIGFuZCB0ZXh0IHByb3BlcnRpZXMuXG4gIC8vIFRoZSByZWR1bmRhbnQgJygpJyBhcmUgaGVyZSBpcyB0byBhdm9pZCBoYXZpbmcgY2xhbmctZm9ybWF0IGJyZWFraW5nIHRoZSBsaW5lIGluY29ycmVjdGx5LlxuICByZXR1cm4gKHtmaWxlTmFtZTogc3Bhbi5zdGFydC5maWxlLnVybCwgdGV4dDogc3Bhbi5zdGFydC5maWxlLmNvbnRlbnR9IGFzIGFueSk7XG59XG5cbmZ1bmN0aW9uIGRpYWdub3N0aWNTb3VyY2VPZkZpbGVOYW1lKGZpbGVOYW1lOiBzdHJpbmcsIHByb2dyYW06IHRzLlByb2dyYW0pOiB0cy5Tb3VyY2VGaWxlIHtcbiAgY29uc3Qgc291cmNlRmlsZSA9IHByb2dyYW0uZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gIGlmIChzb3VyY2VGaWxlKSByZXR1cm4gc291cmNlRmlsZTtcblxuICAvLyBJZiB3ZSBhcmUgcmVwb3J0aW5nIGRpYWdub3N0aWNzIGZvciBhIHNvdXJjZSBmaWxlIHRoYXQgaXMgbm90IGluIHRoZSBwcm9qZWN0IHRoZW4gd2UgbmVlZFxuICAvLyB0byBmYWtlIGEgc291cmNlIGZpbGUgc28gdGhlIGRpYWdub3N0aWMgZm9ybWF0dGluZyByb3V0aW5lcyBjYW4gZW1pdCB0aGUgZmlsZSBuYW1lLlxuICAvLyBUaGUgcmVkdW5kYW50ICcoKScgYXJlIGhlcmUgaXMgdG8gYXZvaWQgaGF2aW5nIGNsYW5nLWZvcm1hdCBicmVha2luZyB0aGUgbGluZSBpbmNvcnJlY3RseS5cbiAgcmV0dXJuICh7ZmlsZU5hbWUsIHRleHQ6ICcnfSBhcyBhbnkpO1xufVxuXG5cbmZ1bmN0aW9uIGRpYWdub3N0aWNDaGFpbkZyb21Gb3JtYXR0ZWREaWFnbm9zdGljQ2hhaW4oY2hhaW46IEZvcm1hdHRlZE1lc3NhZ2VDaGFpbik6XG4gICAgRGlhZ25vc3RpY01lc3NhZ2VDaGFpbiB7XG4gIHJldHVybiB7XG4gICAgbWVzc2FnZVRleHQ6IGNoYWluLm1lc3NhZ2UsXG4gICAgbmV4dDogY2hhaW4ubmV4dCAmJiBjaGFpbi5uZXh0Lm1hcChkaWFnbm9zdGljQ2hhaW5Gcm9tRm9ybWF0dGVkRGlhZ25vc3RpY0NoYWluKSxcbiAgICBwb3NpdGlvbjogY2hhaW4ucG9zaXRpb25cbiAgfTtcbn1cblxuZnVuY3Rpb24gc3ludGF4RXJyb3JUb0RpYWdub3N0aWNzKGVycm9yOiBFcnJvcik6IERpYWdub3N0aWNbXSB7XG4gIGNvbnN0IHBhcnNlckVycm9ycyA9IGdldFBhcnNlRXJyb3JzKGVycm9yKTtcbiAgaWYgKHBhcnNlckVycm9ycyAmJiBwYXJzZXJFcnJvcnMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHBhcnNlckVycm9ycy5tYXA8RGlhZ25vc3RpYz4oZSA9PiAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZVRleHQ6IGUuY29udGV4dHVhbE1lc3NhZ2UoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGU6IGRpYWdub3N0aWNTb3VyY2VPZlNwYW4oZS5zcGFuKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBlLnNwYW4uc3RhcnQub2Zmc2V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGVuZ3RoOiBlLnNwYW4uZW5kLm9mZnNldCAtIGUuc3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiBTT1VSQ0UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBERUZBVUxUX0VSUk9SX0NPREVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gIH0gZWxzZSBpZiAoaXNGb3JtYXR0ZWRFcnJvcihlcnJvcikpIHtcbiAgICByZXR1cm4gW3tcbiAgICAgIG1lc3NhZ2VUZXh0OiBlcnJvci5tZXNzYWdlLFxuICAgICAgY2hhaW46IGVycm9yLmNoYWluICYmIGRpYWdub3N0aWNDaGFpbkZyb21Gb3JtYXR0ZWREaWFnbm9zdGljQ2hhaW4oZXJyb3IuY2hhaW4pLFxuICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgIHNvdXJjZTogU09VUkNFLFxuICAgICAgY29kZTogREVGQVVMVF9FUlJPUl9DT0RFLFxuICAgICAgcG9zaXRpb246IGVycm9yLnBvc2l0aW9uXG4gICAgfV07XG4gIH1cbiAgLy8gUHJvZHVjZSBhIERpYWdub3N0aWMgYW55d2F5IHNpbmNlIHdlIGtub3cgZm9yIHN1cmUgYGVycm9yYCBpcyBhIFN5bnRheEVycm9yXG4gIHJldHVybiBbe1xuICAgIG1lc3NhZ2VUZXh0OiBlcnJvci5tZXNzYWdlLFxuICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgY29kZTogREVGQVVMVF9FUlJPUl9DT0RFLFxuICAgIHNvdXJjZTogU09VUkNFLFxuICB9XTtcbn1cbiJdfQ==