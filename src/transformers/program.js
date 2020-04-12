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
        define("@angular/compiler-cli/src/transformers/program", ["require", "exports", "tslib", "@angular/compiler", "fs", "path", "typescript", "@angular/compiler-cli/src/diagnostics/translate_diagnostics", "@angular/compiler-cli/src/metadata/index", "@angular/compiler-cli/src/ngtsc/program", "@angular/compiler-cli/src/typescript_support", "@angular/compiler-cli/src/transformers/api", "@angular/compiler-cli/src/transformers/compiler_host", "@angular/compiler-cli/src/transformers/inline_resources", "@angular/compiler-cli/src/transformers/lower_expressions", "@angular/compiler-cli/src/transformers/metadata_cache", "@angular/compiler-cli/src/transformers/node_emitter_transform", "@angular/compiler-cli/src/transformers/r3_metadata_transform", "@angular/compiler-cli/src/transformers/r3_strip_decorators", "@angular/compiler-cli/src/transformers/r3_transform", "@angular/compiler-cli/src/transformers/util"], factory);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3JhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL3Byb2dyYW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0E7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQXNaO0lBQ3RaLHVCQUF5QjtJQUN6QiwyQkFBNkI7SUFDN0IsK0JBQWlDO0lBRWpDLHFHQUF5RjtJQUN6RixxRUFBcUY7SUFDckYsbUVBQThDO0lBQzlDLG1GQUF1RTtJQUV2RSxrRUFBb1A7SUFDcFAsc0ZBQWdIO0lBQ2hILDRGQUEwRztJQUMxRyw4RkFBa0c7SUFDbEcsd0ZBQW9FO0lBQ3BFLHdHQUEyRTtJQUMzRSxzR0FBeUU7SUFDekUsa0dBQThHO0lBQzlHLG9GQUFpRTtJQUNqRSxvRUFBMko7SUFJM0o7OztPQUdHO0lBQ0gsSUFBTSxtQ0FBbUMsR0FBRyxFQUFFLENBQUM7SUFHL0M7O09BRUc7SUFDSCxJQUFNLFlBQVksR0FBRyxDQUFDLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztJQUU5RTs7T0FFRztJQUNILElBQU0sZUFBZSxvQkFBTyxZQUFZLEdBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUMsQ0FBQztJQUU3RSxJQUFNLHFCQUFxQixHQUFHO1FBQzVCLFdBQVc7UUFDWCxXQUFXO1FBQ1gsWUFBWTtRQUNaLFVBQVU7UUFDVixNQUFNO0tBQ1AsQ0FBQztJQUVGLElBQU0sWUFBWSxHQUFzQjtRQUN0QyxTQUFTLEVBQUUsRUFBRTtRQUNiLHlCQUF5QixFQUFFLElBQUksR0FBRyxFQUFFO1FBQ3BDLEtBQUssRUFBRSxFQUFFO0tBQ1YsQ0FBQztJQUVGLElBQU0sbUJBQW1CLEdBQ3JCLFVBQUMsRUFDb0I7WUFEbkIsb0JBQU8sRUFBRSxzQ0FBZ0IsRUFBRSx3QkFBUyxFQUFFLHdDQUFp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QyxLQUFLLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTTtnQkFDMUIsTUFBTSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNO2dCQUMvQyxRQUFRLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUs7Z0JBQ3JDLE1BQU0sRUFBRSxZQUFNO2dCQUNkLElBQUksRUFBRSx3QkFBa0I7YUFDekIsQ0FBQyxFQVJHLENBUUgsQ0FBQyxDQUFDO1NBQ3pDO2FBQU0sSUFBSSwyQkFBZ0IsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUNsQyxPQUFPLENBQUM7b0JBQ04sV0FBVyxFQUFFLEtBQUssQ0FBQyxPQUFPO29CQUMxQixLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUssSUFBSSwyQ0FBMkMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO29CQUM5RSxRQUFRLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUs7b0JBQ3JDLE1BQU0sRUFBRSxZQUFNO29CQUNkLElBQUksRUFBRSx3QkFBa0I7b0JBQ3hCLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUTtpQkFDekIsQ0FBQyxDQUFDO1NBQ0o7UUFDRCw4RUFBOEU7UUFDOUUsT0FBTyxDQUFDO2dCQUNOLFdBQVcsRUFBRSxLQUFLLENBQUMsT0FBTztnQkFDMUIsUUFBUSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLO2dCQUNyQyxJQUFJLEVBQUUsd0JBQWtCO2dCQUN4QixNQUFNLEVBQUUsWUFBTTthQUNmLENBQUMsQ0FBQztJQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJcbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBb3RDb21waWxlciwgQW90Q29tcGlsZXJIb3N0LCBBb3RDb21waWxlck9wdGlvbnMsIEVtaXR0ZXJWaXNpdG9yQ29udGV4dCwgRm9ybWF0dGVkTWVzc2FnZUNoYWluLCBHZW5lcmF0ZWRGaWxlLCBNZXNzYWdlQnVuZGxlLCBOZ0FuYWx5emVkRmlsZSwgTmdBbmFseXplZEZpbGVXaXRoSW5qZWN0YWJsZXMsIE5nQW5hbHl6ZWRNb2R1bGVzLCBQYXJzZVNvdXJjZVNwYW4sIFBhcnRpYWxNb2R1bGUsIFBvc2l0aW9uLCBTZXJpYWxpemVyLCBTdGF0aWNTeW1ib2wsIFR5cGVTY3JpcHRFbWl0dGVyLCBYbGlmZiwgWGxpZmYyLCBYbWIsIGNvcmUsIGNyZWF0ZUFvdENvbXBpbGVyLCBnZXRQYXJzZUVycm9ycywgaXNGb3JtYXR0ZWRFcnJvciwgaXNTeW50YXhFcnJvcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1R5cGVDaGVja0hvc3QsIHRyYW5zbGF0ZURpYWdub3N0aWNzfSBmcm9tICcuLi9kaWFnbm9zdGljcy90cmFuc2xhdGVfZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtNZXRhZGF0YUNvbGxlY3RvciwgTW9kdWxlTWV0YWRhdGEsIGNyZWF0ZUJ1bmRsZUluZGV4SG9zdH0gZnJvbSAnLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtOZ3RzY1Byb2dyYW19IGZyb20gJy4uL25ndHNjL3Byb2dyYW0nO1xuaW1wb3J0IHt2ZXJpZnlTdXBwb3J0ZWRUeXBlU2NyaXB0VmVyc2lvbn0gZnJvbSAnLi4vdHlwZXNjcmlwdF9zdXBwb3J0JztcblxuaW1wb3J0IHtDb21waWxlckhvc3QsIENvbXBpbGVyT3B0aW9ucywgQ3VzdG9tVHJhbnNmb3JtZXJzLCBERUZBVUxUX0VSUk9SX0NPREUsIERpYWdub3N0aWMsIERpYWdub3N0aWNNZXNzYWdlQ2hhaW4sIEVtaXRGbGFncywgTGF6eVJvdXRlLCBMaWJyYXJ5U3VtbWFyeSwgUHJvZ3JhbSwgU09VUkNFLCBUc0VtaXRBcmd1bWVudHMsIFRzRW1pdENhbGxiYWNrLCBUc01lcmdlRW1pdFJlc3VsdHNDYWxsYmFja30gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtDb2RlR2VuZXJhdG9yLCBUc0NvbXBpbGVyQW90Q29tcGlsZXJUeXBlQ2hlY2tIb3N0QWRhcHRlciwgZ2V0T3JpZ2luYWxSZWZlcmVuY2VzfSBmcm9tICcuL2NvbXBpbGVyX2hvc3QnO1xuaW1wb3J0IHtJbmxpbmVSZXNvdXJjZXNNZXRhZGF0YVRyYW5zZm9ybWVyLCBnZXRJbmxpbmVSZXNvdXJjZXNUcmFuc2Zvcm1GYWN0b3J5fSBmcm9tICcuL2lubGluZV9yZXNvdXJjZXMnO1xuaW1wb3J0IHtMb3dlck1ldGFkYXRhVHJhbnNmb3JtLCBnZXRFeHByZXNzaW9uTG93ZXJpbmdUcmFuc2Zvcm1GYWN0b3J5fSBmcm9tICcuL2xvd2VyX2V4cHJlc3Npb25zJztcbmltcG9ydCB7TWV0YWRhdGFDYWNoZSwgTWV0YWRhdGFUcmFuc2Zvcm1lcn0gZnJvbSAnLi9tZXRhZGF0YV9jYWNoZSc7XG5pbXBvcnQge2dldEFuZ3VsYXJFbWl0dGVyVHJhbnNmb3JtRmFjdG9yeX0gZnJvbSAnLi9ub2RlX2VtaXR0ZXJfdHJhbnNmb3JtJztcbmltcG9ydCB7UGFydGlhbE1vZHVsZU1ldGFkYXRhVHJhbnNmb3JtZXJ9IGZyb20gJy4vcjNfbWV0YWRhdGFfdHJhbnNmb3JtJztcbmltcG9ydCB7U3RyaXBEZWNvcmF0b3JzTWV0YWRhdGFUcmFuc2Zvcm1lciwgZ2V0RGVjb3JhdG9yU3RyaXBUcmFuc2Zvcm1lckZhY3Rvcnl9IGZyb20gJy4vcjNfc3RyaXBfZGVjb3JhdG9ycyc7XG5pbXBvcnQge2dldEFuZ3VsYXJDbGFzc1RyYW5zZm9ybWVyRmFjdG9yeX0gZnJvbSAnLi9yM190cmFuc2Zvcm0nO1xuaW1wb3J0IHtEVFMsIEdFTkVSQVRFRF9GSUxFUywgU3RydWN0dXJlSXNSZXVzZWQsIFRTLCBjcmVhdGVNZXNzYWdlRGlhZ25vc3RpYywgaXNJblJvb3REaXIsIG5nVG9Uc0RpYWdub3N0aWMsIHRzU3RydWN0dXJlSXNSZXVzZWQsIHVzZXJFcnJvcn0gZnJvbSAnLi91dGlsJztcblxuXG5cbi8qKlxuICogTWF4aW11bSBudW1iZXIgb2YgZmlsZXMgdGhhdCBhcmUgZW1pdGFibGUgdmlhIGNhbGxpbmcgdHMuUHJvZ3JhbS5lbWl0XG4gKiBwYXNzaW5nIGluZGl2aWR1YWwgdGFyZ2V0U291cmNlRmlsZXMuXG4gKi9cbmNvbnN0IE1BWF9GSUxFX0NPVU5UX0ZPUl9TSU5HTEVfRklMRV9FTUlUID0gMjA7XG5cblxuLyoqXG4gKiBGaWVsZHMgdG8gbG93ZXIgd2l0aGluIG1ldGFkYXRhIGluIHJlbmRlcjIgbW9kZS5cbiAqL1xuY29uc3QgTE9XRVJfRklFTERTID0gWyd1c2VWYWx1ZScsICd1c2VGYWN0b3J5JywgJ2RhdGEnLCAnaWQnLCAnbG9hZENoaWxkcmVuJ107XG5cbi8qKlxuICogRmllbGRzIHRvIGxvd2VyIHdpdGhpbiBtZXRhZGF0YSBpbiByZW5kZXIzIG1vZGUuXG4gKi9cbmNvbnN0IFIzX0xPV0VSX0ZJRUxEUyA9IFsuLi5MT1dFUl9GSUVMRFMsICdwcm92aWRlcnMnLCAnaW1wb3J0cycsICdleHBvcnRzJ107XG5cbmNvbnN0IFIzX1JFSUZJRURfREVDT1JBVE9SUyA9IFtcbiAgJ0NvbXBvbmVudCcsXG4gICdEaXJlY3RpdmUnLFxuICAnSW5qZWN0YWJsZScsXG4gICdOZ01vZHVsZScsXG4gICdQaXBlJyxcbl07XG5cbmNvbnN0IGVtcHR5TW9kdWxlczogTmdBbmFseXplZE1vZHVsZXMgPSB7XG4gIG5nTW9kdWxlczogW10sXG4gIG5nTW9kdWxlQnlQaXBlT3JEaXJlY3RpdmU6IG5ldyBNYXAoKSxcbiAgZmlsZXM6IFtdXG59O1xuXG5jb25zdCBkZWZhdWx0RW1pdENhbGxiYWNrOiBUc0VtaXRDYWxsYmFjayA9XG4gICAgKHtwcm9ncmFtLCB0YXJnZXRTb3VyY2VGaWxlLCB3cml0ZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuLCBlbWl0T25seUR0c0ZpbGVzLFxuICAgICAgY3VzdG9tVHJhbnNmb3JtZXJzfSkgPT5cbiAgICAgICAgcHJvZ3JhbS5lbWl0KFxuICAgICAgICAgICAgdGFyZ2V0U291cmNlRmlsZSwgd3JpdGVGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbiwgZW1pdE9ubHlEdHNGaWxlcywgY3VzdG9tVHJhbnNmb3JtZXJzKTtcblxuY2xhc3MgQW5ndWxhckNvbXBpbGVyUHJvZ3JhbSBpbXBsZW1lbnRzIFByb2dyYW0ge1xuICBwcml2YXRlIHJvb3ROYW1lczogc3RyaW5nW107XG4gIHByaXZhdGUgbWV0YWRhdGFDYWNoZTogTWV0YWRhdGFDYWNoZTtcbiAgLy8gTWV0YWRhdGEgY2FjaGUgdXNlZCBleGNsdXNpdmVseSBmb3IgdGhlIGZsYXQgbW9kdWxlIGluZGV4XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwcml2YXRlIGZsYXRNb2R1bGVNZXRhZGF0YUNhY2hlICE6IE1ldGFkYXRhQ2FjaGU7XG4gIHByaXZhdGUgbG93ZXJpbmdNZXRhZGF0YVRyYW5zZm9ybTogTG93ZXJNZXRhZGF0YVRyYW5zZm9ybTtcbiAgcHJpdmF0ZSBvbGRQcm9ncmFtTGlicmFyeVN1bW1hcmllczogTWFwPHN0cmluZywgTGlicmFyeVN1bW1hcnk+fHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBvbGRQcm9ncmFtRW1pdHRlZEdlbmVyYXRlZEZpbGVzOiBNYXA8c3RyaW5nLCBHZW5lcmF0ZWRGaWxlPnx1bmRlZmluZWQ7XG4gIHByaXZhdGUgb2xkUHJvZ3JhbUVtaXR0ZWRTb3VyY2VGaWxlczogTWFwPHN0cmluZywgdHMuU291cmNlRmlsZT58dW5kZWZpbmVkO1xuICAvLyBOb3RlOiBUaGlzIHdpbGwgYmUgY2xlYXJlZCBvdXQgYXMgc29vbiBhcyB3ZSBjcmVhdGUgdGhlIF90c1Byb2dyYW1cbiAgcHJpdmF0ZSBvbGRUc1Byb2dyYW06IHRzLlByb2dyYW18dW5kZWZpbmVkO1xuICBwcml2YXRlIGVtaXR0ZWRMaWJyYXJ5U3VtbWFyaWVzOiBMaWJyYXJ5U3VtbWFyeVtdfHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBlbWl0dGVkR2VuZXJhdGVkRmlsZXM6IEdlbmVyYXRlZEZpbGVbXXx1bmRlZmluZWQ7XG4gIHByaXZhdGUgZW1pdHRlZFNvdXJjZUZpbGVzOiB0cy5Tb3VyY2VGaWxlW118dW5kZWZpbmVkO1xuXG4gIC8vIExhemlseSBpbml0aWFsaXplZCBmaWVsZHNcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgX2NvbXBpbGVyICE6IEFvdENvbXBpbGVyO1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgcHJpdmF0ZSBfaG9zdEFkYXB0ZXIgITogVHNDb21waWxlckFvdENvbXBpbGVyVHlwZUNoZWNrSG9zdEFkYXB0ZXI7XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwcml2YXRlIF90c1Byb2dyYW0gITogdHMuUHJvZ3JhbTtcbiAgcHJpdmF0ZSBfYW5hbHl6ZWRNb2R1bGVzOiBOZ0FuYWx5emVkTW9kdWxlc3x1bmRlZmluZWQ7XG4gIHByaXZhdGUgX2FuYWx5emVkSW5qZWN0YWJsZXM6IE5nQW5hbHl6ZWRGaWxlV2l0aEluamVjdGFibGVzW118dW5kZWZpbmVkO1xuICBwcml2YXRlIF9zdHJ1Y3R1cmFsRGlhZ25vc3RpY3M6IERpYWdub3N0aWNbXXx1bmRlZmluZWQ7XG4gIHByaXZhdGUgX3Byb2dyYW1XaXRoU3R1YnM6IHRzLlByb2dyYW18dW5kZWZpbmVkO1xuICBwcml2YXRlIF9vcHRpb25zRGlhZ25vc3RpY3M6IERpYWdub3N0aWNbXSA9IFtdO1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgcHJpdmF0ZSBfcmVpZmllZERlY29yYXRvcnMgITogU2V0PFN0YXRpY1N5bWJvbD47XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICByb290TmFtZXM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPiwgcHJpdmF0ZSBvcHRpb25zOiBDb21waWxlck9wdGlvbnMsXG4gICAgICBwcml2YXRlIGhvc3Q6IENvbXBpbGVySG9zdCwgb2xkUHJvZ3JhbT86IFByb2dyYW0pIHtcbiAgICB0aGlzLnJvb3ROYW1lcyA9IFsuLi5yb290TmFtZXNdO1xuXG4gICAgaWYgKCFvcHRpb25zLmRpc2FibGVUeXBlU2NyaXB0VmVyc2lvbkNoZWNrKSB7XG4gICAgICB2ZXJpZnlTdXBwb3J0ZWRUeXBlU2NyaXB0VmVyc2lvbigpO1xuICAgIH1cblxuICAgIHRoaXMub2xkVHNQcm9ncmFtID0gb2xkUHJvZ3JhbSA/IG9sZFByb2dyYW0uZ2V0VHNQcm9ncmFtKCkgOiB1bmRlZmluZWQ7XG4gICAgaWYgKG9sZFByb2dyYW0pIHtcbiAgICAgIHRoaXMub2xkUHJvZ3JhbUxpYnJhcnlTdW1tYXJpZXMgPSBvbGRQcm9ncmFtLmdldExpYnJhcnlTdW1tYXJpZXMoKTtcbiAgICAgIHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRHZW5lcmF0ZWRGaWxlcyA9IG9sZFByb2dyYW0uZ2V0RW1pdHRlZEdlbmVyYXRlZEZpbGVzKCk7XG4gICAgICB0aGlzLm9sZFByb2dyYW1FbWl0dGVkU291cmNlRmlsZXMgPSBvbGRQcm9ncmFtLmdldEVtaXR0ZWRTb3VyY2VGaWxlcygpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmZsYXRNb2R1bGVPdXRGaWxlKSB7XG4gICAgICBjb25zdCB7aG9zdDogYnVuZGxlSG9zdCwgaW5kZXhOYW1lLCBlcnJvcnN9ID1cbiAgICAgICAgICBjcmVhdGVCdW5kbGVJbmRleEhvc3Qob3B0aW9ucywgdGhpcy5yb290TmFtZXMsIGhvc3QsICgpID0+IHRoaXMuZmxhdE1vZHVsZU1ldGFkYXRhQ2FjaGUpO1xuICAgICAgaWYgKGVycm9ycykge1xuICAgICAgICB0aGlzLl9vcHRpb25zRGlhZ25vc3RpY3MucHVzaCguLi5lcnJvcnMubWFwKGUgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBlLmNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZVRleHQ6IGUubWVzc2FnZVRleHQgYXMgc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiBTT1VSQ0UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBERUZBVUxUX0VSUk9SX0NPREVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5yb290TmFtZXMucHVzaChpbmRleE5hbWUgISk7XG4gICAgICAgIHRoaXMuaG9zdCA9IGJ1bmRsZUhvc3Q7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5sb3dlcmluZ01ldGFkYXRhVHJhbnNmb3JtID1cbiAgICAgICAgbmV3IExvd2VyTWV0YWRhdGFUcmFuc2Zvcm0ob3B0aW9ucy5lbmFibGVJdnkgIT09IGZhbHNlID8gUjNfTE9XRVJfRklFTERTIDogTE9XRVJfRklFTERTKTtcbiAgICB0aGlzLm1ldGFkYXRhQ2FjaGUgPSB0aGlzLmNyZWF0ZU1ldGFkYXRhQ2FjaGUoW3RoaXMubG93ZXJpbmdNZXRhZGF0YVRyYW5zZm9ybV0pO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVNZXRhZGF0YUNhY2hlKHRyYW5zZm9ybWVyczogTWV0YWRhdGFUcmFuc2Zvcm1lcltdKSB7XG4gICAgcmV0dXJuIG5ldyBNZXRhZGF0YUNhY2hlKFxuICAgICAgICBuZXcgTWV0YWRhdGFDb2xsZWN0b3Ioe3F1b3RlZE5hbWVzOiB0cnVlfSksICEhdGhpcy5vcHRpb25zLnN0cmljdE1ldGFkYXRhRW1pdCxcbiAgICAgICAgdHJhbnNmb3JtZXJzKTtcbiAgfVxuXG4gIGdldExpYnJhcnlTdW1tYXJpZXMoKTogTWFwPHN0cmluZywgTGlicmFyeVN1bW1hcnk+IHtcbiAgICBjb25zdCByZXN1bHQgPSBuZXcgTWFwPHN0cmluZywgTGlicmFyeVN1bW1hcnk+KCk7XG4gICAgaWYgKHRoaXMub2xkUHJvZ3JhbUxpYnJhcnlTdW1tYXJpZXMpIHtcbiAgICAgIHRoaXMub2xkUHJvZ3JhbUxpYnJhcnlTdW1tYXJpZXMuZm9yRWFjaCgoc3VtbWFyeSwgZmlsZU5hbWUpID0+IHJlc3VsdC5zZXQoZmlsZU5hbWUsIHN1bW1hcnkpKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZW1pdHRlZExpYnJhcnlTdW1tYXJpZXMpIHtcbiAgICAgIHRoaXMuZW1pdHRlZExpYnJhcnlTdW1tYXJpZXMuZm9yRWFjaChcbiAgICAgICAgICAoc3VtbWFyeSwgZmlsZU5hbWUpID0+IHJlc3VsdC5zZXQoc3VtbWFyeS5maWxlTmFtZSwgc3VtbWFyeSkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZ2V0RW1pdHRlZEdlbmVyYXRlZEZpbGVzKCk6IE1hcDxzdHJpbmcsIEdlbmVyYXRlZEZpbGU+IHtcbiAgICBjb25zdCByZXN1bHQgPSBuZXcgTWFwPHN0cmluZywgR2VuZXJhdGVkRmlsZT4oKTtcbiAgICBpZiAodGhpcy5vbGRQcm9ncmFtRW1pdHRlZEdlbmVyYXRlZEZpbGVzKSB7XG4gICAgICB0aGlzLm9sZFByb2dyYW1FbWl0dGVkR2VuZXJhdGVkRmlsZXMuZm9yRWFjaChcbiAgICAgICAgICAoZ2VuRmlsZSwgZmlsZU5hbWUpID0+IHJlc3VsdC5zZXQoZmlsZU5hbWUsIGdlbkZpbGUpKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZW1pdHRlZEdlbmVyYXRlZEZpbGVzKSB7XG4gICAgICB0aGlzLmVtaXR0ZWRHZW5lcmF0ZWRGaWxlcy5mb3JFYWNoKChnZW5GaWxlKSA9PiByZXN1bHQuc2V0KGdlbkZpbGUuZ2VuRmlsZVVybCwgZ2VuRmlsZSkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZ2V0RW1pdHRlZFNvdXJjZUZpbGVzKCk6IE1hcDxzdHJpbmcsIHRzLlNvdXJjZUZpbGU+IHtcbiAgICBjb25zdCByZXN1bHQgPSBuZXcgTWFwPHN0cmluZywgdHMuU291cmNlRmlsZT4oKTtcbiAgICBpZiAodGhpcy5vbGRQcm9ncmFtRW1pdHRlZFNvdXJjZUZpbGVzKSB7XG4gICAgICB0aGlzLm9sZFByb2dyYW1FbWl0dGVkU291cmNlRmlsZXMuZm9yRWFjaCgoc2YsIGZpbGVOYW1lKSA9PiByZXN1bHQuc2V0KGZpbGVOYW1lLCBzZikpO1xuICAgIH1cbiAgICBpZiAodGhpcy5lbWl0dGVkU291cmNlRmlsZXMpIHtcbiAgICAgIHRoaXMuZW1pdHRlZFNvdXJjZUZpbGVzLmZvckVhY2goKHNmKSA9PiByZXN1bHQuc2V0KHNmLmZpbGVOYW1lLCBzZikpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZ2V0VHNQcm9ncmFtKCk6IHRzLlByb2dyYW0geyByZXR1cm4gdGhpcy50c1Byb2dyYW07IH1cblxuICBnZXRUc09wdGlvbkRpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pIHtcbiAgICByZXR1cm4gdGhpcy50c1Byb2dyYW0uZ2V0T3B0aW9uc0RpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuKTtcbiAgfVxuXG4gIGdldE5nT3B0aW9uRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbik6IFJlYWRvbmx5QXJyYXk8RGlhZ25vc3RpYz4ge1xuICAgIHJldHVybiBbLi4udGhpcy5fb3B0aW9uc0RpYWdub3N0aWNzLCAuLi5nZXROZ09wdGlvbkRpYWdub3N0aWNzKHRoaXMub3B0aW9ucyldO1xuICB9XG5cbiAgZ2V0VHNTeW50YWN0aWNEaWFnbm9zdGljcyhzb3VyY2VGaWxlPzogdHMuU291cmNlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbik6XG4gICAgICBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gdGhpcy50c1Byb2dyYW0uZ2V0U3ludGFjdGljRGlhZ25vc3RpY3Moc291cmNlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4pO1xuICB9XG5cbiAgZ2V0TmdTdHJ1Y3R1cmFsRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbik6IFJlYWRvbmx5QXJyYXk8RGlhZ25vc3RpYz4ge1xuICAgIHJldHVybiB0aGlzLnN0cnVjdHVyYWxEaWFnbm9zdGljcztcbiAgfVxuXG4gIGdldFRzU2VtYW50aWNEaWFnbm9zdGljcyhzb3VyY2VGaWxlPzogdHMuU291cmNlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbik6XG4gICAgICBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHtcbiAgICBjb25zdCBzb3VyY2VGaWxlcyA9IHNvdXJjZUZpbGUgPyBbc291cmNlRmlsZV0gOiB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpO1xuICAgIGxldCBkaWFnczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gICAgc291cmNlRmlsZXMuZm9yRWFjaChzZiA9PiB7XG4gICAgICBpZiAoIUdFTkVSQVRFRF9GSUxFUy50ZXN0KHNmLmZpbGVOYW1lKSkge1xuICAgICAgICBkaWFncy5wdXNoKC4uLnRoaXMudHNQcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3Moc2YsIGNhbmNlbGxhdGlvblRva2VuKSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGRpYWdzO1xuICB9XG5cbiAgZ2V0TmdTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lPzogc3RyaW5nLCBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuKTpcbiAgICAgIFJlYWRvbmx5QXJyYXk8RGlhZ25vc3RpYz4ge1xuICAgIGxldCBkaWFnczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gICAgdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5mb3JFYWNoKHNmID0+IHtcbiAgICAgIGlmIChHRU5FUkFURURfRklMRVMudGVzdChzZi5maWxlTmFtZSkgJiYgIXNmLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICAgIGRpYWdzLnB1c2goLi4udGhpcy50c1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhzZiwgY2FuY2VsbGF0aW9uVG9rZW4pKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBjb25zdCB7bmd9ID0gdHJhbnNsYXRlRGlhZ25vc3RpY3ModGhpcy5ob3N0QWRhcHRlciwgZGlhZ3MpO1xuICAgIHJldHVybiBuZztcbiAgfVxuXG4gIGxvYWROZ1N0cnVjdHVyZUFzeW5jKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLl9hbmFseXplZE1vZHVsZXMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQW5ndWxhciBzdHJ1Y3R1cmUgYWxyZWFkeSBsb2FkZWQnKTtcbiAgICB9XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICBjb25zdCB7dG1wUHJvZ3JhbSwgc291cmNlRmlsZXMsIHRzRmlsZXMsIHJvb3ROYW1lc30gPSB0aGlzLl9jcmVhdGVQcm9ncmFtV2l0aEJhc2ljU3R1YnMoKTtcbiAgICAgICAgICByZXR1cm4gdGhpcy5jb21waWxlci5sb2FkRmlsZXNBc3luYyhzb3VyY2VGaWxlcywgdHNGaWxlcylcbiAgICAgICAgICAgICAgLnRoZW4oKHthbmFseXplZE1vZHVsZXMsIGFuYWx5emVkSW5qZWN0YWJsZXN9KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2FuYWx5emVkTW9kdWxlcykge1xuICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBbmd1bGFyIHN0cnVjdHVyZSBsb2FkZWQgYm90aCBzeW5jaHJvbm91c2x5IGFuZCBhc3luY2hyb25vdXNseScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLl91cGRhdGVQcm9ncmFtV2l0aFR5cGVDaGVja1N0dWJzKFxuICAgICAgICAgICAgICAgICAgICB0bXBQcm9ncmFtLCBhbmFseXplZE1vZHVsZXMsIGFuYWx5emVkSW5qZWN0YWJsZXMsIHJvb3ROYW1lcyk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZSA9PiB0aGlzLl9jcmVhdGVQcm9ncmFtT25FcnJvcihlKSk7XG4gIH1cblxuICBsaXN0TGF6eVJvdXRlcyhyb3V0ZT86IHN0cmluZyk6IExhenlSb3V0ZVtdIHtcbiAgICAvLyBOb3RlOiBEb24ndCBhbmFseXplZE1vZHVsZXMgaWYgYSByb3V0ZSBpcyBnaXZlblxuICAgIC8vIHRvIGJlIGZhc3QgZW5vdWdoLlxuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLmxpc3RMYXp5Um91dGVzKHJvdXRlLCByb3V0ZSA/IHVuZGVmaW5lZCA6IHRoaXMuYW5hbHl6ZWRNb2R1bGVzKTtcbiAgfVxuXG4gIGVtaXQocGFyYW1ldGVyczoge1xuICAgIGVtaXRGbGFncz86IEVtaXRGbGFncyxcbiAgICBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuLFxuICAgIGN1c3RvbVRyYW5zZm9ybWVycz86IEN1c3RvbVRyYW5zZm9ybWVycyxcbiAgICBlbWl0Q2FsbGJhY2s/OiBUc0VtaXRDYWxsYmFjayxcbiAgICBtZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2s/OiBUc01lcmdlRW1pdFJlc3VsdHNDYWxsYmFjayxcbiAgfSA9IHt9KTogdHMuRW1pdFJlc3VsdCB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5lbmFibGVJdnkgIT09IGZhbHNlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBydW4gbGVnYWN5IGNvbXBpbGVyIGluIG5ndHNjIG1vZGUnKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2VtaXRSZW5kZXIyKHBhcmFtZXRlcnMpO1xuICB9XG5cbiAgcHJpdmF0ZSBfZW1pdFJlbmRlcjMoXG4gICAgICB7XG4gICAgICAgICAgZW1pdEZsYWdzID0gRW1pdEZsYWdzLkRlZmF1bHQsIGNhbmNlbGxhdGlvblRva2VuLCBjdXN0b21UcmFuc2Zvcm1lcnMsXG4gICAgICAgICAgZW1pdENhbGxiYWNrID0gZGVmYXVsdEVtaXRDYWxsYmFjaywgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrID0gbWVyZ2VFbWl0UmVzdWx0cyxcbiAgICAgIH06IHtcbiAgICAgICAgZW1pdEZsYWdzPzogRW1pdEZsYWdzLFxuICAgICAgICBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuLFxuICAgICAgICBjdXN0b21UcmFuc2Zvcm1lcnM/OiBDdXN0b21UcmFuc2Zvcm1lcnMsXG4gICAgICAgIGVtaXRDYWxsYmFjaz86IFRzRW1pdENhbGxiYWNrLFxuICAgICAgICBtZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2s/OiBUc01lcmdlRW1pdFJlc3VsdHNDYWxsYmFjayxcbiAgICAgIH0gPSB7fSk6IHRzLkVtaXRSZXN1bHQge1xuICAgIGNvbnN0IGVtaXRTdGFydCA9IERhdGUubm93KCk7XG4gICAgaWYgKChlbWl0RmxhZ3MgJiAoRW1pdEZsYWdzLkpTIHwgRW1pdEZsYWdzLkRUUyB8IEVtaXRGbGFncy5NZXRhZGF0YSB8IEVtaXRGbGFncy5Db2RlZ2VuKSkgPT09XG4gICAgICAgIDApIHtcbiAgICAgIHJldHVybiB7ZW1pdFNraXBwZWQ6IHRydWUsIGRpYWdub3N0aWNzOiBbXSwgZW1pdHRlZEZpbGVzOiBbXX07XG4gICAgfVxuXG4gICAgLy8gYW5hbHl6ZWRNb2R1bGVzIGFuZCBhbmFseXplZEluamVjdGFibGVzIGFyZSBjcmVhdGVkIHRvZ2V0aGVyLiBJZiBvbmUgZXhpc3RzLCBzbyBkb2VzIHRoZVxuICAgIC8vIG90aGVyLlxuICAgIGNvbnN0IG1vZHVsZXMgPVxuICAgICAgICB0aGlzLmNvbXBpbGVyLmVtaXRBbGxQYXJ0aWFsTW9kdWxlcyh0aGlzLmFuYWx5emVkTW9kdWxlcywgdGhpcy5fYW5hbHl6ZWRJbmplY3RhYmxlcyAhKTtcblxuICAgIGNvbnN0IHdyaXRlVHNGaWxlOiB0cy5Xcml0ZUZpbGVDYWxsYmFjayA9XG4gICAgICAgIChvdXRGaWxlTmFtZSwgb3V0RGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yPywgc291cmNlRmlsZXM/KSA9PiB7XG4gICAgICAgICAgdGhpcy53cml0ZUZpbGUob3V0RmlsZU5hbWUsIG91dERhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvciwgdW5kZWZpbmVkLCBzb3VyY2VGaWxlcyk7XG4gICAgICAgIH07XG5cbiAgICBjb25zdCBlbWl0T25seUR0c0ZpbGVzID0gKGVtaXRGbGFncyAmIChFbWl0RmxhZ3MuRFRTIHwgRW1pdEZsYWdzLkpTKSkgPT0gRW1pdEZsYWdzLkRUUztcblxuICAgIGNvbnN0IHRzQ3VzdG9tVHJhbnNmb3JtZXJzID0gdGhpcy5jYWxjdWxhdGVUcmFuc2Zvcm1zKFxuICAgICAgICAvKiBnZW5GaWxlcyAqLyB1bmRlZmluZWQsIC8qIHBhcnRpYWxNb2R1bGVzICovIG1vZHVsZXMsXG4gICAgICAgIC8qIHN0cmlwRGVjb3JhdG9ycyAqLyB0aGlzLnJlaWZpZWREZWNvcmF0b3JzLCBjdXN0b21UcmFuc2Zvcm1lcnMpO1xuXG5cbiAgICAvLyBSZXN0b3JlIHRoZSBvcmlnaW5hbCByZWZlcmVuY2VzIGJlZm9yZSB3ZSBlbWl0IHNvIFR5cGVTY3JpcHQgZG9lc24ndCBlbWl0XG4gICAgLy8gYSByZWZlcmVuY2UgdG8gdGhlIC5kLnRzIGZpbGUuXG4gICAgY29uc3QgYXVnbWVudGVkUmVmZXJlbmNlcyA9IG5ldyBNYXA8dHMuU291cmNlRmlsZSwgUmVhZG9ubHlBcnJheTx0cy5GaWxlUmVmZXJlbmNlPj4oKTtcbiAgICBmb3IgKGNvbnN0IHNvdXJjZUZpbGUgb2YgdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgY29uc3Qgb3JpZ2luYWxSZWZlcmVuY2VzID0gZ2V0T3JpZ2luYWxSZWZlcmVuY2VzKHNvdXJjZUZpbGUpO1xuICAgICAgaWYgKG9yaWdpbmFsUmVmZXJlbmNlcykge1xuICAgICAgICBhdWdtZW50ZWRSZWZlcmVuY2VzLnNldChzb3VyY2VGaWxlLCBzb3VyY2VGaWxlLnJlZmVyZW5jZWRGaWxlcyk7XG4gICAgICAgIHNvdXJjZUZpbGUucmVmZXJlbmNlZEZpbGVzID0gb3JpZ2luYWxSZWZlcmVuY2VzO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICByZXR1cm4gZW1pdENhbGxiYWNrKHtcbiAgICAgICAgcHJvZ3JhbTogdGhpcy50c1Byb2dyYW0sXG4gICAgICAgIGhvc3Q6IHRoaXMuaG9zdCxcbiAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICB3cml0ZUZpbGU6IHdyaXRlVHNGaWxlLCBlbWl0T25seUR0c0ZpbGVzLFxuICAgICAgICBjdXN0b21UcmFuc2Zvcm1lcnM6IHRzQ3VzdG9tVHJhbnNmb3JtZXJzXG4gICAgICB9KTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgLy8gUmVzdG9yZSB0aGUgcmVmZXJlbmNlcyBiYWNrIHRvIHRoZSBhdWdtZW50ZWQgdmFsdWUgdG8gZW5zdXJlIHRoYXQgdGhlXG4gICAgICAvLyBjaGVja3MgdGhhdCBUeXBlU2NyaXB0IG1ha2VzIGZvciBwcm9qZWN0IHN0cnVjdHVyZSByZXVzZSB3aWxsIHN1Y2NlZWQuXG4gICAgICBmb3IgKGNvbnN0IFtzb3VyY2VGaWxlLCByZWZlcmVuY2VzXSBvZiBBcnJheS5mcm9tKGF1Z21lbnRlZFJlZmVyZW5jZXMpKSB7XG4gICAgICAgIC8vIFRPRE8oY2h1Y2tqKTogUmVtb3ZlIGFueSBjYXN0IGFmdGVyIHVwZGF0aW5nIGJ1aWxkIHRvIDIuNlxuICAgICAgICAoc291cmNlRmlsZSBhcyBhbnkpLnJlZmVyZW5jZWRGaWxlcyA9IHJlZmVyZW5jZXM7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfZW1pdFJlbmRlcjIoXG4gICAgICB7XG4gICAgICAgICAgZW1pdEZsYWdzID0gRW1pdEZsYWdzLkRlZmF1bHQsIGNhbmNlbGxhdGlvblRva2VuLCBjdXN0b21UcmFuc2Zvcm1lcnMsXG4gICAgICAgICAgZW1pdENhbGxiYWNrID0gZGVmYXVsdEVtaXRDYWxsYmFjaywgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrID0gbWVyZ2VFbWl0UmVzdWx0cyxcbiAgICAgIH06IHtcbiAgICAgICAgZW1pdEZsYWdzPzogRW1pdEZsYWdzLFxuICAgICAgICBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuLFxuICAgICAgICBjdXN0b21UcmFuc2Zvcm1lcnM/OiBDdXN0b21UcmFuc2Zvcm1lcnMsXG4gICAgICAgIGVtaXRDYWxsYmFjaz86IFRzRW1pdENhbGxiYWNrLFxuICAgICAgICBtZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2s/OiBUc01lcmdlRW1pdFJlc3VsdHNDYWxsYmFjayxcbiAgICAgIH0gPSB7fSk6IHRzLkVtaXRSZXN1bHQge1xuICAgIGNvbnN0IGVtaXRTdGFydCA9IERhdGUubm93KCk7XG4gICAgaWYgKGVtaXRGbGFncyAmIEVtaXRGbGFncy5JMThuQnVuZGxlKSB7XG4gICAgICBjb25zdCBsb2NhbGUgPSB0aGlzLm9wdGlvbnMuaTE4bk91dExvY2FsZSB8fCBudWxsO1xuICAgICAgY29uc3QgZmlsZSA9IHRoaXMub3B0aW9ucy5pMThuT3V0RmlsZSB8fCBudWxsO1xuICAgICAgY29uc3QgZm9ybWF0ID0gdGhpcy5vcHRpb25zLmkxOG5PdXRGb3JtYXQgfHwgbnVsbDtcbiAgICAgIGNvbnN0IGJ1bmRsZSA9IHRoaXMuY29tcGlsZXIuZW1pdE1lc3NhZ2VCdW5kbGUodGhpcy5hbmFseXplZE1vZHVsZXMsIGxvY2FsZSk7XG4gICAgICBpMThuRXh0cmFjdChmb3JtYXQsIGZpbGUsIHRoaXMuaG9zdCwgdGhpcy5vcHRpb25zLCBidW5kbGUpO1xuICAgIH1cbiAgICBpZiAoKGVtaXRGbGFncyAmIChFbWl0RmxhZ3MuSlMgfCBFbWl0RmxhZ3MuRFRTIHwgRW1pdEZsYWdzLk1ldGFkYXRhIHwgRW1pdEZsYWdzLkNvZGVnZW4pKSA9PT1cbiAgICAgICAgMCkge1xuICAgICAgcmV0dXJuIHtlbWl0U2tpcHBlZDogdHJ1ZSwgZGlhZ25vc3RpY3M6IFtdLCBlbWl0dGVkRmlsZXM6IFtdfTtcbiAgICB9XG4gICAgbGV0IHtnZW5GaWxlcywgZ2VuRGlhZ3N9ID0gdGhpcy5nZW5lcmF0ZUZpbGVzRm9yRW1pdChlbWl0RmxhZ3MpO1xuICAgIGlmIChnZW5EaWFncy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGRpYWdub3N0aWNzOiBnZW5EaWFncyxcbiAgICAgICAgZW1pdFNraXBwZWQ6IHRydWUsXG4gICAgICAgIGVtaXR0ZWRGaWxlczogW10sXG4gICAgICB9O1xuICAgIH1cbiAgICB0aGlzLmVtaXR0ZWRHZW5lcmF0ZWRGaWxlcyA9IGdlbkZpbGVzO1xuICAgIGNvbnN0IG91dFNyY01hcHBpbmc6IEFycmF5PHtzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBvdXRGaWxlTmFtZTogc3RyaW5nfT4gPSBbXTtcbiAgICBjb25zdCBnZW5GaWxlQnlGaWxlTmFtZSA9IG5ldyBNYXA8c3RyaW5nLCBHZW5lcmF0ZWRGaWxlPigpO1xuICAgIGdlbkZpbGVzLmZvckVhY2goZ2VuRmlsZSA9PiBnZW5GaWxlQnlGaWxlTmFtZS5zZXQoZ2VuRmlsZS5nZW5GaWxlVXJsLCBnZW5GaWxlKSk7XG4gICAgdGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcyA9IFtdO1xuICAgIGNvbnN0IGVtaXR0ZWRTb3VyY2VGaWxlcyA9IFtdIGFzIHRzLlNvdXJjZUZpbGVbXTtcbiAgICBjb25zdCB3cml0ZVRzRmlsZTogdHMuV3JpdGVGaWxlQ2FsbGJhY2sgPVxuICAgICAgICAob3V0RmlsZU5hbWUsIG91dERhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvcj8sIHNvdXJjZUZpbGVzPykgPT4ge1xuICAgICAgICAgIGNvbnN0IHNvdXJjZUZpbGUgPSBzb3VyY2VGaWxlcyAmJiBzb3VyY2VGaWxlcy5sZW5ndGggPT0gMSA/IHNvdXJjZUZpbGVzWzBdIDogbnVsbDtcbiAgICAgICAgICBsZXQgZ2VuRmlsZTogR2VuZXJhdGVkRmlsZXx1bmRlZmluZWQ7XG4gICAgICAgICAgaWYgKHNvdXJjZUZpbGUpIHtcbiAgICAgICAgICAgIG91dFNyY01hcHBpbmcucHVzaCh7b3V0RmlsZU5hbWU6IG91dEZpbGVOYW1lLCBzb3VyY2VGaWxlfSk7XG4gICAgICAgICAgICBnZW5GaWxlID0gZ2VuRmlsZUJ5RmlsZU5hbWUuZ2V0KHNvdXJjZUZpbGUuZmlsZU5hbWUpO1xuICAgICAgICAgICAgaWYgKCFzb3VyY2VGaWxlLmlzRGVjbGFyYXRpb25GaWxlICYmICFHRU5FUkFURURfRklMRVMudGVzdChzb3VyY2VGaWxlLmZpbGVOYW1lKSkge1xuICAgICAgICAgICAgICAvLyBOb3RlOiBzb3VyY2VGaWxlIGlzIHRoZSB0cmFuc2Zvcm1lZCBzb3VyY2VmaWxlLCBub3QgdGhlIG9yaWdpbmFsIG9uZSFcbiAgICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxGaWxlID0gdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZShzb3VyY2VGaWxlLmZpbGVOYW1lKTtcbiAgICAgICAgICAgICAgaWYgKG9yaWdpbmFsRmlsZSkge1xuICAgICAgICAgICAgICAgIGVtaXR0ZWRTb3VyY2VGaWxlcy5wdXNoKG9yaWdpbmFsRmlsZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy53cml0ZUZpbGUob3V0RmlsZU5hbWUsIG91dERhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvciwgZ2VuRmlsZSwgc291cmNlRmlsZXMpO1xuICAgICAgICB9O1xuXG4gICAgY29uc3QgbW9kdWxlcyA9IHRoaXMuX2FuYWx5emVkSW5qZWN0YWJsZXMgJiZcbiAgICAgICAgdGhpcy5jb21waWxlci5lbWl0QWxsUGFydGlhbE1vZHVsZXMyKHRoaXMuX2FuYWx5emVkSW5qZWN0YWJsZXMpO1xuXG4gICAgY29uc3QgdHNDdXN0b21UcmFuc2Zvcm1lcnMgPSB0aGlzLmNhbGN1bGF0ZVRyYW5zZm9ybXMoXG4gICAgICAgIGdlbkZpbGVCeUZpbGVOYW1lLCBtb2R1bGVzLCAvKiBzdHJpcERlY29yYXRvcnMgKi8gdW5kZWZpbmVkLCBjdXN0b21UcmFuc2Zvcm1lcnMpO1xuICAgIGNvbnN0IGVtaXRPbmx5RHRzRmlsZXMgPSAoZW1pdEZsYWdzICYgKEVtaXRGbGFncy5EVFMgfCBFbWl0RmxhZ3MuSlMpKSA9PSBFbWl0RmxhZ3MuRFRTO1xuICAgIC8vIFJlc3RvcmUgdGhlIG9yaWdpbmFsIHJlZmVyZW5jZXMgYmVmb3JlIHdlIGVtaXQgc28gVHlwZVNjcmlwdCBkb2Vzbid0IGVtaXRcbiAgICAvLyBhIHJlZmVyZW5jZSB0byB0aGUgLmQudHMgZmlsZS5cbiAgICBjb25zdCBhdWdtZW50ZWRSZWZlcmVuY2VzID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBSZWFkb25seUFycmF5PHRzLkZpbGVSZWZlcmVuY2U+PigpO1xuICAgIGZvciAoY29uc3Qgc291cmNlRmlsZSBvZiB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICBjb25zdCBvcmlnaW5hbFJlZmVyZW5jZXMgPSBnZXRPcmlnaW5hbFJlZmVyZW5jZXMoc291cmNlRmlsZSk7XG4gICAgICBpZiAob3JpZ2luYWxSZWZlcmVuY2VzKSB7XG4gICAgICAgIGF1Z21lbnRlZFJlZmVyZW5jZXMuc2V0KHNvdXJjZUZpbGUsIHNvdXJjZUZpbGUucmVmZXJlbmNlZEZpbGVzKTtcbiAgICAgICAgc291cmNlRmlsZS5yZWZlcmVuY2VkRmlsZXMgPSBvcmlnaW5hbFJlZmVyZW5jZXM7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IGdlblRzRmlsZXM6IEdlbmVyYXRlZEZpbGVbXSA9IFtdO1xuICAgIGNvbnN0IGdlbkpzb25GaWxlczogR2VuZXJhdGVkRmlsZVtdID0gW107XG4gICAgZ2VuRmlsZXMuZm9yRWFjaChnZiA9PiB7XG4gICAgICBpZiAoZ2Yuc3RtdHMpIHtcbiAgICAgICAgZ2VuVHNGaWxlcy5wdXNoKGdmKTtcbiAgICAgIH1cbiAgICAgIGlmIChnZi5zb3VyY2UpIHtcbiAgICAgICAgZ2VuSnNvbkZpbGVzLnB1c2goZ2YpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGxldCBlbWl0UmVzdWx0OiB0cy5FbWl0UmVzdWx0O1xuICAgIGxldCBlbWl0dGVkVXNlclRzQ291bnQ6IG51bWJlcjtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc291cmNlRmlsZXNUb0VtaXQgPSB0aGlzLmdldFNvdXJjZUZpbGVzRm9yRW1pdCgpO1xuICAgICAgaWYgKHNvdXJjZUZpbGVzVG9FbWl0ICYmXG4gICAgICAgICAgKHNvdXJjZUZpbGVzVG9FbWl0Lmxlbmd0aCArIGdlblRzRmlsZXMubGVuZ3RoKSA8IE1BWF9GSUxFX0NPVU5UX0ZPUl9TSU5HTEVfRklMRV9FTUlUKSB7XG4gICAgICAgIGNvbnN0IGZpbGVOYW1lc1RvRW1pdCA9XG4gICAgICAgICAgICBbLi4uc291cmNlRmlsZXNUb0VtaXQubWFwKHNmID0+IHNmLmZpbGVOYW1lKSwgLi4uZ2VuVHNGaWxlcy5tYXAoZ2YgPT4gZ2YuZ2VuRmlsZVVybCldO1xuICAgICAgICBlbWl0UmVzdWx0ID0gbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrKFxuICAgICAgICAgICAgZmlsZU5hbWVzVG9FbWl0Lm1hcCgoZmlsZU5hbWUpID0+IGVtaXRSZXN1bHQgPSBlbWl0Q2FsbGJhY2soe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyYW06IHRoaXMudHNQcm9ncmFtLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvc3Q6IHRoaXMuaG9zdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd3JpdGVGaWxlOiB3cml0ZVRzRmlsZSwgZW1pdE9ubHlEdHNGaWxlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21UcmFuc2Zvcm1lcnM6IHRzQ3VzdG9tVHJhbnNmb3JtZXJzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFNvdXJjZUZpbGU6IHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSkpO1xuICAgICAgICBlbWl0dGVkVXNlclRzQ291bnQgPSBzb3VyY2VGaWxlc1RvRW1pdC5sZW5ndGg7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbWl0UmVzdWx0ID0gZW1pdENhbGxiYWNrKHtcbiAgICAgICAgICBwcm9ncmFtOiB0aGlzLnRzUHJvZ3JhbSxcbiAgICAgICAgICBob3N0OiB0aGlzLmhvc3QsXG4gICAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICAgIHdyaXRlRmlsZTogd3JpdGVUc0ZpbGUsIGVtaXRPbmx5RHRzRmlsZXMsXG4gICAgICAgICAgY3VzdG9tVHJhbnNmb3JtZXJzOiB0c0N1c3RvbVRyYW5zZm9ybWVyc1xuICAgICAgICB9KTtcbiAgICAgICAgZW1pdHRlZFVzZXJUc0NvdW50ID0gdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5sZW5ndGggLSBnZW5Uc0ZpbGVzLmxlbmd0aDtcbiAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgLy8gUmVzdG9yZSB0aGUgcmVmZXJlbmNlcyBiYWNrIHRvIHRoZSBhdWdtZW50ZWQgdmFsdWUgdG8gZW5zdXJlIHRoYXQgdGhlXG4gICAgICAvLyBjaGVja3MgdGhhdCBUeXBlU2NyaXB0IG1ha2VzIGZvciBwcm9qZWN0IHN0cnVjdHVyZSByZXVzZSB3aWxsIHN1Y2NlZWQuXG4gICAgICBmb3IgKGNvbnN0IFtzb3VyY2VGaWxlLCByZWZlcmVuY2VzXSBvZiBBcnJheS5mcm9tKGF1Z21lbnRlZFJlZmVyZW5jZXMpKSB7XG4gICAgICAgIC8vIFRPRE8oY2h1Y2tqKTogUmVtb3ZlIGFueSBjYXN0IGFmdGVyIHVwZGF0aW5nIGJ1aWxkIHRvIDIuNlxuICAgICAgICAoc291cmNlRmlsZSBhcyBhbnkpLnJlZmVyZW5jZWRGaWxlcyA9IHJlZmVyZW5jZXM7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuZW1pdHRlZFNvdXJjZUZpbGVzID0gZW1pdHRlZFNvdXJjZUZpbGVzO1xuXG4gICAgLy8gTWF0Y2ggYmVoYXZpb3Igb2YgdHNjOiBvbmx5IHByb2R1Y2UgZW1pdCBkaWFnbm9zdGljcyBpZiBpdCB3b3VsZCBibG9ja1xuICAgIC8vIGVtaXQuIElmIG5vRW1pdE9uRXJyb3IgaXMgZmFsc2UsIHRoZSBlbWl0IHdpbGwgaGFwcGVuIGluIHNwaXRlIG9mIGFueVxuICAgIC8vIGVycm9ycywgc28gd2Ugc2hvdWxkIG5vdCByZXBvcnQgdGhlbS5cbiAgICBpZiAoZW1pdFJlc3VsdCAmJiB0aGlzLm9wdGlvbnMubm9FbWl0T25FcnJvciA9PT0gdHJ1ZSkge1xuICAgICAgLy8gdHJhbnNsYXRlIHRoZSBkaWFnbm9zdGljcyBpbiB0aGUgZW1pdFJlc3VsdCBhcyB3ZWxsLlxuICAgICAgY29uc3QgdHJhbnNsYXRlZEVtaXREaWFncyA9IHRyYW5zbGF0ZURpYWdub3N0aWNzKHRoaXMuaG9zdEFkYXB0ZXIsIGVtaXRSZXN1bHQuZGlhZ25vc3RpY3MpO1xuICAgICAgZW1pdFJlc3VsdC5kaWFnbm9zdGljcyA9IHRyYW5zbGF0ZWRFbWl0RGlhZ3MudHMuY29uY2F0KFxuICAgICAgICAgIHRoaXMuc3RydWN0dXJhbERpYWdub3N0aWNzLmNvbmNhdCh0cmFuc2xhdGVkRW1pdERpYWdzLm5nKS5tYXAobmdUb1RzRGlhZ25vc3RpYykpO1xuICAgIH1cblxuICAgIGlmIChlbWl0UmVzdWx0ICYmICFvdXRTcmNNYXBwaW5nLmxlbmd0aCkge1xuICAgICAgLy8gaWYgbm8gZmlsZXMgd2VyZSBlbWl0dGVkIGJ5IFR5cGVTY3JpcHQsIGFsc28gZG9uJ3QgZW1pdCAuanNvbiBmaWxlc1xuICAgICAgZW1pdFJlc3VsdC5kaWFnbm9zdGljcyA9XG4gICAgICAgICAgZW1pdFJlc3VsdC5kaWFnbm9zdGljcy5jb25jYXQoW2NyZWF0ZU1lc3NhZ2VEaWFnbm9zdGljKGBFbWl0dGVkIG5vIGZpbGVzLmApXSk7XG4gICAgICByZXR1cm4gZW1pdFJlc3VsdDtcbiAgICB9XG5cbiAgICBsZXQgc2FtcGxlU3JjRmlsZU5hbWU6IHN0cmluZ3x1bmRlZmluZWQ7XG4gICAgbGV0IHNhbXBsZU91dEZpbGVOYW1lOiBzdHJpbmd8dW5kZWZpbmVkO1xuICAgIGlmIChvdXRTcmNNYXBwaW5nLmxlbmd0aCkge1xuICAgICAgc2FtcGxlU3JjRmlsZU5hbWUgPSBvdXRTcmNNYXBwaW5nWzBdLnNvdXJjZUZpbGUuZmlsZU5hbWU7XG4gICAgICBzYW1wbGVPdXRGaWxlTmFtZSA9IG91dFNyY01hcHBpbmdbMF0ub3V0RmlsZU5hbWU7XG4gICAgfVxuICAgIGNvbnN0IHNyY1RvT3V0UGF0aCA9XG4gICAgICAgIGNyZWF0ZVNyY1RvT3V0UGF0aE1hcHBlcih0aGlzLm9wdGlvbnMub3V0RGlyLCBzYW1wbGVTcmNGaWxlTmFtZSwgc2FtcGxlT3V0RmlsZU5hbWUpO1xuICAgIGlmIChlbWl0RmxhZ3MgJiBFbWl0RmxhZ3MuQ29kZWdlbikge1xuICAgICAgZ2VuSnNvbkZpbGVzLmZvckVhY2goZ2YgPT4ge1xuICAgICAgICBjb25zdCBvdXRGaWxlTmFtZSA9IHNyY1RvT3V0UGF0aChnZi5nZW5GaWxlVXJsKTtcbiAgICAgICAgdGhpcy53cml0ZUZpbGUob3V0RmlsZU5hbWUsIGdmLnNvdXJjZSAhLCBmYWxzZSwgdW5kZWZpbmVkLCBnZik7XG4gICAgICB9KTtcbiAgICB9XG4gICAgbGV0IG1ldGFkYXRhSnNvbkNvdW50ID0gMDtcbiAgICBpZiAoZW1pdEZsYWdzICYgRW1pdEZsYWdzLk1ldGFkYXRhKSB7XG4gICAgICB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZvckVhY2goc2YgPT4ge1xuICAgICAgICBpZiAoIXNmLmlzRGVjbGFyYXRpb25GaWxlICYmICFHRU5FUkFURURfRklMRVMudGVzdChzZi5maWxlTmFtZSkpIHtcbiAgICAgICAgICBtZXRhZGF0YUpzb25Db3VudCsrO1xuICAgICAgICAgIGNvbnN0IG1ldGFkYXRhID0gdGhpcy5tZXRhZGF0YUNhY2hlLmdldE1ldGFkYXRhKHNmKTtcbiAgICAgICAgICBpZiAobWV0YWRhdGEpIHtcbiAgICAgICAgICAgIGNvbnN0IG1ldGFkYXRhVGV4dCA9IEpTT04uc3RyaW5naWZ5KFttZXRhZGF0YV0pO1xuICAgICAgICAgICAgY29uc3Qgb3V0RmlsZU5hbWUgPSBzcmNUb091dFBhdGgoc2YuZmlsZU5hbWUucmVwbGFjZSgvXFwudHN4PyQvLCAnLm1ldGFkYXRhLmpzb24nKSk7XG4gICAgICAgICAgICB0aGlzLndyaXRlRmlsZShvdXRGaWxlTmFtZSwgbWV0YWRhdGFUZXh0LCBmYWxzZSwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIFtzZl0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIGNvbnN0IGVtaXRFbmQgPSBEYXRlLm5vdygpO1xuICAgIGlmIChlbWl0UmVzdWx0ICYmIHRoaXMub3B0aW9ucy5kaWFnbm9zdGljcykge1xuICAgICAgZW1pdFJlc3VsdC5kaWFnbm9zdGljcyA9IGVtaXRSZXN1bHQuZGlhZ25vc3RpY3MuY29uY2F0KFtjcmVhdGVNZXNzYWdlRGlhZ25vc3RpYyhbXG4gICAgICAgIGBFbWl0dGVkIGluICR7ZW1pdEVuZCAtIGVtaXRTdGFydH1tc2AsXG4gICAgICAgIGAtICR7ZW1pdHRlZFVzZXJUc0NvdW50fSB1c2VyIHRzIGZpbGVzYCxcbiAgICAgICAgYC0gJHtnZW5Uc0ZpbGVzLmxlbmd0aH0gZ2VuZXJhdGVkIHRzIGZpbGVzYCxcbiAgICAgICAgYC0gJHtnZW5Kc29uRmlsZXMubGVuZ3RoICsgbWV0YWRhdGFKc29uQ291bnR9IGdlbmVyYXRlZCBqc29uIGZpbGVzYCxcbiAgICAgIF0uam9pbignXFxuJykpXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVtaXRSZXN1bHQ7XG4gIH1cblxuICAvLyBQcml2YXRlIG1lbWJlcnNcbiAgcHJpdmF0ZSBnZXQgY29tcGlsZXIoKTogQW90Q29tcGlsZXIge1xuICAgIGlmICghdGhpcy5fY29tcGlsZXIpIHtcbiAgICAgIHRoaXMuX2NyZWF0ZUNvbXBpbGVyKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9jb21waWxlciAhO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgaG9zdEFkYXB0ZXIoKTogVHNDb21waWxlckFvdENvbXBpbGVyVHlwZUNoZWNrSG9zdEFkYXB0ZXIge1xuICAgIGlmICghdGhpcy5faG9zdEFkYXB0ZXIpIHtcbiAgICAgIHRoaXMuX2NyZWF0ZUNvbXBpbGVyKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9ob3N0QWRhcHRlciAhO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgYW5hbHl6ZWRNb2R1bGVzKCk6IE5nQW5hbHl6ZWRNb2R1bGVzIHtcbiAgICBpZiAoIXRoaXMuX2FuYWx5emVkTW9kdWxlcykge1xuICAgICAgdGhpcy5pbml0U3luYygpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fYW5hbHl6ZWRNb2R1bGVzICE7XG4gIH1cblxuICBwcml2YXRlIGdldCBzdHJ1Y3R1cmFsRGlhZ25vc3RpY3MoKTogUmVhZG9ubHlBcnJheTxEaWFnbm9zdGljPiB7XG4gICAgbGV0IGRpYWdub3N0aWNzID0gdGhpcy5fc3RydWN0dXJhbERpYWdub3N0aWNzO1xuICAgIGlmICghZGlhZ25vc3RpY3MpIHtcbiAgICAgIHRoaXMuaW5pdFN5bmMoKTtcbiAgICAgIGRpYWdub3N0aWNzID0gKHRoaXMuX3N0cnVjdHVyYWxEaWFnbm9zdGljcyA9IHRoaXMuX3N0cnVjdHVyYWxEaWFnbm9zdGljcyB8fCBbXSk7XG4gICAgfVxuICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgfVxuXG4gIHByaXZhdGUgZ2V0IHRzUHJvZ3JhbSgpOiB0cy5Qcm9ncmFtIHtcbiAgICBpZiAoIXRoaXMuX3RzUHJvZ3JhbSkge1xuICAgICAgdGhpcy5pbml0U3luYygpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fdHNQcm9ncmFtICE7XG4gIH1cblxuICBwcml2YXRlIGdldCByZWlmaWVkRGVjb3JhdG9ycygpOiBTZXQ8U3RhdGljU3ltYm9sPiB7XG4gICAgaWYgKCF0aGlzLl9yZWlmaWVkRGVjb3JhdG9ycykge1xuICAgICAgY29uc3QgcmVmbGVjdG9yID0gdGhpcy5jb21waWxlci5yZWZsZWN0b3I7XG4gICAgICB0aGlzLl9yZWlmaWVkRGVjb3JhdG9ycyA9IG5ldyBTZXQoXG4gICAgICAgICAgUjNfUkVJRklFRF9ERUNPUkFUT1JTLm1hcChuYW1lID0+IHJlZmxlY3Rvci5maW5kRGVjbGFyYXRpb24oJ0Bhbmd1bGFyL2NvcmUnLCBuYW1lKSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcmVpZmllZERlY29yYXRvcnM7XG4gIH1cblxuICBwcml2YXRlIGNhbGN1bGF0ZVRyYW5zZm9ybXMoXG4gICAgICBnZW5GaWxlczogTWFwPHN0cmluZywgR2VuZXJhdGVkRmlsZT58dW5kZWZpbmVkLCBwYXJ0aWFsTW9kdWxlczogUGFydGlhbE1vZHVsZVtdfHVuZGVmaW5lZCxcbiAgICAgIHN0cmlwRGVjb3JhdG9yczogU2V0PFN0YXRpY1N5bWJvbD58dW5kZWZpbmVkLFxuICAgICAgY3VzdG9tVHJhbnNmb3JtZXJzPzogQ3VzdG9tVHJhbnNmb3JtZXJzKTogdHMuQ3VzdG9tVHJhbnNmb3JtZXJzIHtcbiAgICBjb25zdCBiZWZvcmVUczogQXJyYXk8dHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLlNvdXJjZUZpbGU+PiA9IFtdO1xuICAgIGNvbnN0IG1ldGFkYXRhVHJhbnNmb3JtczogTWV0YWRhdGFUcmFuc2Zvcm1lcltdID0gW107XG4gICAgY29uc3QgZmxhdE1vZHVsZU1ldGFkYXRhVHJhbnNmb3JtczogTWV0YWRhdGFUcmFuc2Zvcm1lcltdID0gW107XG4gICAgaWYgKHRoaXMub3B0aW9ucy5lbmFibGVSZXNvdXJjZUlubGluaW5nKSB7XG4gICAgICBiZWZvcmVUcy5wdXNoKGdldElubGluZVJlc291cmNlc1RyYW5zZm9ybUZhY3RvcnkodGhpcy50c1Byb2dyYW0sIHRoaXMuaG9zdEFkYXB0ZXIpKTtcbiAgICAgIGNvbnN0IHRyYW5zZm9ybWVyID0gbmV3IElubGluZVJlc291cmNlc01ldGFkYXRhVHJhbnNmb3JtZXIodGhpcy5ob3N0QWRhcHRlcik7XG4gICAgICBtZXRhZGF0YVRyYW5zZm9ybXMucHVzaCh0cmFuc2Zvcm1lcik7XG4gICAgICBmbGF0TW9kdWxlTWV0YWRhdGFUcmFuc2Zvcm1zLnB1c2godHJhbnNmb3JtZXIpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5vcHRpb25zLmRpc2FibGVFeHByZXNzaW9uTG93ZXJpbmcpIHtcbiAgICAgIGJlZm9yZVRzLnB1c2goXG4gICAgICAgICAgZ2V0RXhwcmVzc2lvbkxvd2VyaW5nVHJhbnNmb3JtRmFjdG9yeSh0aGlzLmxvd2VyaW5nTWV0YWRhdGFUcmFuc2Zvcm0sIHRoaXMudHNQcm9ncmFtKSk7XG4gICAgICBtZXRhZGF0YVRyYW5zZm9ybXMucHVzaCh0aGlzLmxvd2VyaW5nTWV0YWRhdGFUcmFuc2Zvcm0pO1xuICAgIH1cbiAgICBjb25zdCBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlciA9IHRoaXMub3B0aW9ucy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlciB8fCBmYWxzZTtcbiAgICBpZiAoZ2VuRmlsZXMpIHtcbiAgICAgIGJlZm9yZVRzLnB1c2goZ2V0QW5ndWxhckVtaXR0ZXJUcmFuc2Zvcm1GYWN0b3J5KFxuICAgICAgICAgIGdlbkZpbGVzLCB0aGlzLmdldFRzUHJvZ3JhbSgpLCBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcikpO1xuICAgIH1cbiAgICBpZiAocGFydGlhbE1vZHVsZXMpIHtcbiAgICAgIGJlZm9yZVRzLnB1c2goZ2V0QW5ndWxhckNsYXNzVHJhbnNmb3JtZXJGYWN0b3J5KHBhcnRpYWxNb2R1bGVzLCBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcikpO1xuXG4gICAgICAvLyBJZiB3ZSBoYXZlIHBhcnRpYWwgbW9kdWxlcywgdGhlIGNhY2hlZCBtZXRhZGF0YSBtaWdodCBiZSBpbmNvcnJlY3QgYXMgaXQgZG9lc24ndCByZWZsZWN0XG4gICAgICAvLyB0aGUgcGFydGlhbCBtb2R1bGUgdHJhbnNmb3Jtcy5cbiAgICAgIGNvbnN0IHRyYW5zZm9ybWVyID0gbmV3IFBhcnRpYWxNb2R1bGVNZXRhZGF0YVRyYW5zZm9ybWVyKHBhcnRpYWxNb2R1bGVzKTtcbiAgICAgIG1ldGFkYXRhVHJhbnNmb3Jtcy5wdXNoKHRyYW5zZm9ybWVyKTtcbiAgICAgIGZsYXRNb2R1bGVNZXRhZGF0YVRyYW5zZm9ybXMucHVzaCh0cmFuc2Zvcm1lcik7XG4gICAgfVxuXG4gICAgaWYgKHN0cmlwRGVjb3JhdG9ycykge1xuICAgICAgYmVmb3JlVHMucHVzaChnZXREZWNvcmF0b3JTdHJpcFRyYW5zZm9ybWVyRmFjdG9yeShcbiAgICAgICAgICBzdHJpcERlY29yYXRvcnMsIHRoaXMuY29tcGlsZXIucmVmbGVjdG9yLCB0aGlzLmdldFRzUHJvZ3JhbSgpLmdldFR5cGVDaGVja2VyKCkpKTtcbiAgICAgIGNvbnN0IHRyYW5zZm9ybWVyID1cbiAgICAgICAgICBuZXcgU3RyaXBEZWNvcmF0b3JzTWV0YWRhdGFUcmFuc2Zvcm1lcihzdHJpcERlY29yYXRvcnMsIHRoaXMuY29tcGlsZXIucmVmbGVjdG9yKTtcbiAgICAgIG1ldGFkYXRhVHJhbnNmb3Jtcy5wdXNoKHRyYW5zZm9ybWVyKTtcbiAgICAgIGZsYXRNb2R1bGVNZXRhZGF0YVRyYW5zZm9ybXMucHVzaCh0cmFuc2Zvcm1lcik7XG4gICAgfVxuXG4gICAgaWYgKGN1c3RvbVRyYW5zZm9ybWVycyAmJiBjdXN0b21UcmFuc2Zvcm1lcnMuYmVmb3JlVHMpIHtcbiAgICAgIGJlZm9yZVRzLnB1c2goLi4uY3VzdG9tVHJhbnNmb3JtZXJzLmJlZm9yZVRzKTtcbiAgICB9XG4gICAgaWYgKG1ldGFkYXRhVHJhbnNmb3Jtcy5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLm1ldGFkYXRhQ2FjaGUgPSB0aGlzLmNyZWF0ZU1ldGFkYXRhQ2FjaGUobWV0YWRhdGFUcmFuc2Zvcm1zKTtcbiAgICB9XG4gICAgaWYgKGZsYXRNb2R1bGVNZXRhZGF0YVRyYW5zZm9ybXMubGVuZ3RoID4gMCkge1xuICAgICAgdGhpcy5mbGF0TW9kdWxlTWV0YWRhdGFDYWNoZSA9IHRoaXMuY3JlYXRlTWV0YWRhdGFDYWNoZShmbGF0TW9kdWxlTWV0YWRhdGFUcmFuc2Zvcm1zKTtcbiAgICB9XG4gICAgY29uc3QgYWZ0ZXJUcyA9IGN1c3RvbVRyYW5zZm9ybWVycyA/IGN1c3RvbVRyYW5zZm9ybWVycy5hZnRlclRzIDogdW5kZWZpbmVkO1xuICAgIHJldHVybiB7YmVmb3JlOiBiZWZvcmVUcywgYWZ0ZXI6IGFmdGVyVHN9O1xuICB9XG5cbiAgcHJpdmF0ZSBpbml0U3luYygpIHtcbiAgICBpZiAodGhpcy5fYW5hbHl6ZWRNb2R1bGVzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCB7dG1wUHJvZ3JhbSwgc291cmNlRmlsZXMsIHRzRmlsZXMsIHJvb3ROYW1lc30gPSB0aGlzLl9jcmVhdGVQcm9ncmFtV2l0aEJhc2ljU3R1YnMoKTtcbiAgICAgIGNvbnN0IHthbmFseXplZE1vZHVsZXMsIGFuYWx5emVkSW5qZWN0YWJsZXN9ID1cbiAgICAgICAgICB0aGlzLmNvbXBpbGVyLmxvYWRGaWxlc1N5bmMoc291cmNlRmlsZXMsIHRzRmlsZXMpO1xuICAgICAgdGhpcy5fdXBkYXRlUHJvZ3JhbVdpdGhUeXBlQ2hlY2tTdHVicyhcbiAgICAgICAgICB0bXBQcm9ncmFtLCBhbmFseXplZE1vZHVsZXMsIGFuYWx5emVkSW5qZWN0YWJsZXMsIHJvb3ROYW1lcyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhpcy5fY3JlYXRlUHJvZ3JhbU9uRXJyb3IoZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfY3JlYXRlQ29tcGlsZXIoKSB7XG4gICAgY29uc3QgY29kZWdlbjogQ29kZUdlbmVyYXRvciA9IHtcbiAgICAgIGdlbmVyYXRlRmlsZTogKGdlbkZpbGVOYW1lLCBiYXNlRmlsZU5hbWUpID0+XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21waWxlci5lbWl0QmFzaWNTdHViKGdlbkZpbGVOYW1lLCBiYXNlRmlsZU5hbWUpLFxuICAgICAgZmluZEdlbmVyYXRlZEZpbGVOYW1lczogKGZpbGVOYW1lKSA9PiB0aGlzLl9jb21waWxlci5maW5kR2VuZXJhdGVkRmlsZU5hbWVzKGZpbGVOYW1lKSxcbiAgICB9O1xuXG4gICAgdGhpcy5faG9zdEFkYXB0ZXIgPSBuZXcgVHNDb21waWxlckFvdENvbXBpbGVyVHlwZUNoZWNrSG9zdEFkYXB0ZXIoXG4gICAgICAgIHRoaXMucm9vdE5hbWVzLCB0aGlzLm9wdGlvbnMsIHRoaXMuaG9zdCwgdGhpcy5tZXRhZGF0YUNhY2hlLCBjb2RlZ2VuLFxuICAgICAgICB0aGlzLm9sZFByb2dyYW1MaWJyYXJ5U3VtbWFyaWVzKTtcbiAgICBjb25zdCBhb3RPcHRpb25zID0gZ2V0QW90Q29tcGlsZXJPcHRpb25zKHRoaXMub3B0aW9ucyk7XG4gICAgY29uc3QgZXJyb3JDb2xsZWN0b3IgPSAodGhpcy5vcHRpb25zLmNvbGxlY3RBbGxFcnJvcnMgfHwgdGhpcy5vcHRpb25zLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjaykgP1xuICAgICAgICAoZXJyOiBhbnkpID0+IHRoaXMuX2FkZFN0cnVjdHVyYWxEaWFnbm9zdGljcyhlcnIpIDpcbiAgICAgICAgdW5kZWZpbmVkO1xuICAgIHRoaXMuX2NvbXBpbGVyID0gY3JlYXRlQW90Q29tcGlsZXIodGhpcy5faG9zdEFkYXB0ZXIsIGFvdE9wdGlvbnMsIGVycm9yQ29sbGVjdG9yKS5jb21waWxlcjtcbiAgfVxuXG4gIHByaXZhdGUgX2NyZWF0ZVByb2dyYW1XaXRoQmFzaWNTdHVicygpOiB7XG4gICAgdG1wUHJvZ3JhbTogdHMuUHJvZ3JhbSxcbiAgICByb290TmFtZXM6IHN0cmluZ1tdLFxuICAgIHNvdXJjZUZpbGVzOiBzdHJpbmdbXSxcbiAgICB0c0ZpbGVzOiBzdHJpbmdbXSxcbiAgfSB7XG4gICAgaWYgKHRoaXMuX2FuYWx5emVkTW9kdWxlcykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnRlcm5hbCBFcnJvcjogYWxyZWFkeSBpbml0aWFsaXplZCFgKTtcbiAgICB9XG4gICAgLy8gTm90ZTogVGhpcyBpcyBpbXBvcnRhbnQgdG8gbm90IHByb2R1Y2UgYSBtZW1vcnkgbGVhayFcbiAgICBjb25zdCBvbGRUc1Byb2dyYW0gPSB0aGlzLm9sZFRzUHJvZ3JhbTtcbiAgICB0aGlzLm9sZFRzUHJvZ3JhbSA9IHVuZGVmaW5lZDtcblxuICAgIGNvbnN0IGNvZGVnZW46IENvZGVHZW5lcmF0b3IgPSB7XG4gICAgICBnZW5lcmF0ZUZpbGU6IChnZW5GaWxlTmFtZSwgYmFzZUZpbGVOYW1lKSA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb21waWxlci5lbWl0QmFzaWNTdHViKGdlbkZpbGVOYW1lLCBiYXNlRmlsZU5hbWUpLFxuICAgICAgZmluZEdlbmVyYXRlZEZpbGVOYW1lczogKGZpbGVOYW1lKSA9PiB0aGlzLmNvbXBpbGVyLmZpbmRHZW5lcmF0ZWRGaWxlTmFtZXMoZmlsZU5hbWUpLFxuICAgIH07XG5cblxuICAgIGxldCByb290TmFtZXMgPSBbLi4udGhpcy5yb290TmFtZXNdO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZ2VuZXJhdGVDb2RlRm9yTGlicmFyaWVzICE9PSBmYWxzZSkge1xuICAgICAgLy8gaWYgd2Ugc2hvdWxkIGdlbmVyYXRlQ29kZUZvckxpYnJhcmllcywgbmV2ZXIgaW5jbHVkZVxuICAgICAgLy8gZ2VuZXJhdGVkIGZpbGVzIGluIHRoZSBwcm9ncmFtIGFzIG90aGVyd2lzZSB3ZSB3aWxsXG4gICAgICAvLyBvdmVyd3JpdGUgdGhlbSBhbmQgdHlwZXNjcmlwdCB3aWxsIHJlcG9ydCB0aGUgZXJyb3JcbiAgICAgIC8vIFRTNTA1NTogQ2Fubm90IHdyaXRlIGZpbGUgLi4uIGJlY2F1c2UgaXQgd291bGQgb3ZlcndyaXRlIGlucHV0IGZpbGUuXG4gICAgICByb290TmFtZXMgPSByb290TmFtZXMuZmlsdGVyKGZuID0+ICFHRU5FUkFURURfRklMRVMudGVzdChmbikpO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLm5vUmVzb2x2ZSkge1xuICAgICAgdGhpcy5yb290TmFtZXMuZm9yRWFjaChyb290TmFtZSA9PiB7XG4gICAgICAgIGlmICh0aGlzLmhvc3RBZGFwdGVyLnNob3VsZEdlbmVyYXRlRmlsZXNGb3Iocm9vdE5hbWUpKSB7XG4gICAgICAgICAgcm9vdE5hbWVzLnB1c2goLi4udGhpcy5jb21waWxlci5maW5kR2VuZXJhdGVkRmlsZU5hbWVzKHJvb3ROYW1lKSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IHRtcFByb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKHJvb3ROYW1lcywgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3RBZGFwdGVyLCBvbGRUc1Byb2dyYW0pO1xuICAgIGNvbnN0IHNvdXJjZUZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IHRzRmlsZXM6IHN0cmluZ1tdID0gW107XG4gICAgdG1wUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZvckVhY2goc2YgPT4ge1xuICAgICAgaWYgKHRoaXMuaG9zdEFkYXB0ZXIuaXNTb3VyY2VGaWxlKHNmLmZpbGVOYW1lKSkge1xuICAgICAgICBzb3VyY2VGaWxlcy5wdXNoKHNmLmZpbGVOYW1lKTtcbiAgICAgIH1cbiAgICAgIGlmIChUUy50ZXN0KHNmLmZpbGVOYW1lKSAmJiAhRFRTLnRlc3Qoc2YuZmlsZU5hbWUpKSB7XG4gICAgICAgIHRzRmlsZXMucHVzaChzZi5maWxlTmFtZSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHt0bXBQcm9ncmFtLCBzb3VyY2VGaWxlcywgdHNGaWxlcywgcm9vdE5hbWVzfTtcbiAgfVxuXG4gIHByaXZhdGUgX3VwZGF0ZVByb2dyYW1XaXRoVHlwZUNoZWNrU3R1YnMoXG4gICAgICB0bXBQcm9ncmFtOiB0cy5Qcm9ncmFtLCBhbmFseXplZE1vZHVsZXM6IE5nQW5hbHl6ZWRNb2R1bGVzLFxuICAgICAgYW5hbHl6ZWRJbmplY3RhYmxlczogTmdBbmFseXplZEZpbGVXaXRoSW5qZWN0YWJsZXNbXSwgcm9vdE5hbWVzOiBzdHJpbmdbXSkge1xuICAgIHRoaXMuX2FuYWx5emVkTW9kdWxlcyA9IGFuYWx5emVkTW9kdWxlcztcbiAgICB0aGlzLl9hbmFseXplZEluamVjdGFibGVzID0gYW5hbHl6ZWRJbmplY3RhYmxlcztcbiAgICB0bXBQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZm9yRWFjaChzZiA9PiB7XG4gICAgICBpZiAoc2YuZmlsZU5hbWUuZW5kc1dpdGgoJy5uZ2ZhY3RvcnkudHMnKSkge1xuICAgICAgICBjb25zdCB7Z2VuZXJhdGUsIGJhc2VGaWxlTmFtZX0gPSB0aGlzLmhvc3RBZGFwdGVyLnNob3VsZEdlbmVyYXRlRmlsZShzZi5maWxlTmFtZSk7XG4gICAgICAgIGlmIChnZW5lcmF0ZSkge1xuICAgICAgICAgIC8vIE5vdGU6ICEgaXMgb2sgYXMgaG9zdEFkYXB0ZXIuc2hvdWxkR2VuZXJhdGVGaWxlIHdpbGwgYWx3YXlzIHJldHVybiBhIGJhc2VGaWxlTmFtZVxuICAgICAgICAgIC8vIGZvciAubmdmYWN0b3J5LnRzIGZpbGVzLlxuICAgICAgICAgIGNvbnN0IGdlbkZpbGUgPSB0aGlzLmNvbXBpbGVyLmVtaXRUeXBlQ2hlY2tTdHViKHNmLmZpbGVOYW1lLCBiYXNlRmlsZU5hbWUgISk7XG4gICAgICAgICAgaWYgKGdlbkZpbGUpIHtcbiAgICAgICAgICAgIHRoaXMuaG9zdEFkYXB0ZXIudXBkYXRlR2VuZXJhdGVkRmlsZShnZW5GaWxlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLl90c1Byb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKHJvb3ROYW1lcywgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3RBZGFwdGVyLCB0bXBQcm9ncmFtKTtcbiAgICAvLyBOb3RlOiB0aGUgbmV3IHRzIHByb2dyYW0gc2hvdWxkIGJlIGNvbXBsZXRlbHkgcmV1c2FibGUgYnkgVHlwZVNjcmlwdCBhczpcbiAgICAvLyAtIHdlIGNhY2hlIGFsbCB0aGUgZmlsZXMgaW4gdGhlIGhvc3RBZGFwdGVyXG4gICAgLy8gLSBuZXcgbmV3IHN0dWJzIHVzZSB0aGUgZXhhY3RseSBzYW1lIGltcG9ydHMvZXhwb3J0cyBhcyB0aGUgb2xkIG9uY2UgKHdlIGFzc2VydCB0aGF0IGluXG4gICAgLy8gaG9zdEFkYXB0ZXIudXBkYXRlR2VuZXJhdGVkRmlsZSkuXG4gICAgaWYgKHRzU3RydWN0dXJlSXNSZXVzZWQodG1wUHJvZ3JhbSkgIT09IFN0cnVjdHVyZUlzUmV1c2VkLkNvbXBsZXRlbHkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW50ZXJuYWwgRXJyb3I6IFRoZSBzdHJ1Y3R1cmUgb2YgdGhlIHByb2dyYW0gY2hhbmdlZCBkdXJpbmcgY29kZWdlbi5gKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9jcmVhdGVQcm9ncmFtT25FcnJvcihlOiBhbnkpIHtcbiAgICAvLyBTdGlsbCBmaWxsIHRoZSBhbmFseXplZE1vZHVsZXMgYW5kIHRoZSB0c1Byb2dyYW1cbiAgICAvLyBzbyB0aGF0IHdlIGRvbid0IGNhdXNlIG90aGVyIGVycm9ycyBmb3IgdXNlcnMgd2hvIGUuZy4gd2FudCB0byBlbWl0IHRoZSBuZ1Byb2dyYW0uXG4gICAgdGhpcy5fYW5hbHl6ZWRNb2R1bGVzID0gZW1wdHlNb2R1bGVzO1xuICAgIHRoaXMub2xkVHNQcm9ncmFtID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX2hvc3RBZGFwdGVyLmlzU291cmNlRmlsZSA9ICgpID0+IGZhbHNlO1xuICAgIHRoaXMuX3RzUHJvZ3JhbSA9IHRzLmNyZWF0ZVByb2dyYW0odGhpcy5yb290TmFtZXMsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0QWRhcHRlcik7XG4gICAgaWYgKGlzU3ludGF4RXJyb3IoZSkpIHtcbiAgICAgIHRoaXMuX2FkZFN0cnVjdHVyYWxEaWFnbm9zdGljcyhlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhyb3cgZTtcbiAgfVxuXG4gIHByaXZhdGUgX2FkZFN0cnVjdHVyYWxEaWFnbm9zdGljcyhlcnJvcjogRXJyb3IpIHtcbiAgICBjb25zdCBkaWFnbm9zdGljcyA9IHRoaXMuX3N0cnVjdHVyYWxEaWFnbm9zdGljcyB8fCAodGhpcy5fc3RydWN0dXJhbERpYWdub3N0aWNzID0gW10pO1xuICAgIGlmIChpc1N5bnRheEVycm9yKGVycm9yKSkge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5zeW50YXhFcnJvclRvRGlhZ25vc3RpY3MoZXJyb3IpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCh7XG4gICAgICAgIG1lc3NhZ2VUZXh0OiBlcnJvci50b1N0cmluZygpLFxuICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICBzb3VyY2U6IFNPVVJDRSxcbiAgICAgICAgY29kZTogREVGQVVMVF9FUlJPUl9DT0RFXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvLyBOb3RlOiB0aGlzIHJldHVybnMgYSB0cy5EaWFnbm9zdGljIHNvIHRoYXQgd2VcbiAgLy8gY2FuIHJldHVybiBlcnJvcnMgaW4gYSB0cy5FbWl0UmVzdWx0XG4gIHByaXZhdGUgZ2VuZXJhdGVGaWxlc0ZvckVtaXQoZW1pdEZsYWdzOiBFbWl0RmxhZ3MpOlxuICAgICAge2dlbkZpbGVzOiBHZW5lcmF0ZWRGaWxlW10sIGdlbkRpYWdzOiB0cy5EaWFnbm9zdGljW119IHtcbiAgICB0cnkge1xuICAgICAgaWYgKCEoZW1pdEZsYWdzICYgRW1pdEZsYWdzLkNvZGVnZW4pKSB7XG4gICAgICAgIHJldHVybiB7Z2VuRmlsZXM6IFtdLCBnZW5EaWFnczogW119O1xuICAgICAgfVxuICAgICAgLy8gVE9ETyh0Ym9zY2gpOiBhbGxvdyBnZW5lcmF0aW5nIGZpbGVzIHRoYXQgYXJlIG5vdCBpbiB0aGUgcm9vdERpclxuICAgICAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvaXNzdWVzLzE5MzM3XG4gICAgICBsZXQgZ2VuRmlsZXMgPSB0aGlzLmNvbXBpbGVyLmVtaXRBbGxJbXBscyh0aGlzLmFuYWx5emVkTW9kdWxlcylcbiAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGdlbkZpbGUgPT4gaXNJblJvb3REaXIoZ2VuRmlsZS5nZW5GaWxlVXJsLCB0aGlzLm9wdGlvbnMpKTtcbiAgICAgIGlmICh0aGlzLm9sZFByb2dyYW1FbWl0dGVkR2VuZXJhdGVkRmlsZXMpIHtcbiAgICAgICAgY29uc3Qgb2xkUHJvZ3JhbUVtaXR0ZWRHZW5lcmF0ZWRGaWxlcyA9IHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRHZW5lcmF0ZWRGaWxlcztcbiAgICAgICAgZ2VuRmlsZXMgPSBnZW5GaWxlcy5maWx0ZXIoZ2VuRmlsZSA9PiB7XG4gICAgICAgICAgY29uc3Qgb2xkR2VuRmlsZSA9IG9sZFByb2dyYW1FbWl0dGVkR2VuZXJhdGVkRmlsZXMuZ2V0KGdlbkZpbGUuZ2VuRmlsZVVybCk7XG4gICAgICAgICAgcmV0dXJuICFvbGRHZW5GaWxlIHx8ICFnZW5GaWxlLmlzRXF1aXZhbGVudChvbGRHZW5GaWxlKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4ge2dlbkZpbGVzLCBnZW5EaWFnczogW119O1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIFRPRE8odGJvc2NoKTogY2hlY2sgd2hldGhlciB3ZSBjYW4gYWN0dWFsbHkgaGF2ZSBzeW50YXggZXJyb3JzIGhlcmUsXG4gICAgICAvLyBhcyB3ZSBhbHJlYWR5IHBhcnNlZCB0aGUgbWV0YWRhdGEgYW5kIHRlbXBsYXRlcyBiZWZvcmUgdG8gY3JlYXRlIHRoZSB0eXBlIGNoZWNrIGJsb2NrLlxuICAgICAgaWYgKGlzU3ludGF4RXJyb3IoZSkpIHtcbiAgICAgICAgY29uc3QgZ2VuRGlhZ3M6IHRzLkRpYWdub3N0aWNbXSA9IFt7XG4gICAgICAgICAgZmlsZTogdW5kZWZpbmVkLFxuICAgICAgICAgIHN0YXJ0OiB1bmRlZmluZWQsXG4gICAgICAgICAgbGVuZ3RoOiB1bmRlZmluZWQsXG4gICAgICAgICAgbWVzc2FnZVRleHQ6IGUubWVzc2FnZSxcbiAgICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICAgIHNvdXJjZTogU09VUkNFLFxuICAgICAgICAgIGNvZGU6IERFRkFVTFRfRVJST1JfQ09ERVxuICAgICAgICB9XTtcbiAgICAgICAgcmV0dXJuIHtnZW5GaWxlczogW10sIGdlbkRpYWdzfTtcbiAgICAgIH1cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdW5kZWZpbmVkIGlmIGFsbCBmaWxlcyBzaG91bGQgYmUgZW1pdHRlZC5cbiAgICovXG4gIHByaXZhdGUgZ2V0U291cmNlRmlsZXNGb3JFbWl0KCk6IHRzLlNvdXJjZUZpbGVbXXx1bmRlZmluZWQge1xuICAgIC8vIFRPRE8odGJvc2NoKTogaWYgb25lIG9mIHRoZSBmaWxlcyBjb250YWlucyBhIGBjb25zdCBlbnVtYFxuICAgIC8vIGFsd2F5cyBlbWl0IGFsbCBmaWxlcyAtPiByZXR1cm4gdW5kZWZpbmVkIVxuICAgIGxldCBzb3VyY2VGaWxlc1RvRW1pdCA9IHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZmlsdGVyKFxuICAgICAgICBzZiA9PiB7IHJldHVybiAhc2YuaXNEZWNsYXJhdGlvbkZpbGUgJiYgIUdFTkVSQVRFRF9GSUxFUy50ZXN0KHNmLmZpbGVOYW1lKTsgfSk7XG4gICAgaWYgKHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRTb3VyY2VGaWxlcykge1xuICAgICAgc291cmNlRmlsZXNUb0VtaXQgPSBzb3VyY2VGaWxlc1RvRW1pdC5maWx0ZXIoc2YgPT4ge1xuICAgICAgICBjb25zdCBvbGRGaWxlID0gdGhpcy5vbGRQcm9ncmFtRW1pdHRlZFNvdXJjZUZpbGVzICEuZ2V0KHNmLmZpbGVOYW1lKTtcbiAgICAgICAgcmV0dXJuIHNmICE9PSBvbGRGaWxlO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBzb3VyY2VGaWxlc1RvRW1pdDtcbiAgfVxuXG4gIHByaXZhdGUgd3JpdGVGaWxlKFxuICAgICAgb3V0RmlsZU5hbWU6IHN0cmluZywgb3V0RGF0YTogc3RyaW5nLCB3cml0ZUJ5dGVPcmRlck1hcms6IGJvb2xlYW4sXG4gICAgICBvbkVycm9yPzogKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCwgZ2VuRmlsZT86IEdlbmVyYXRlZEZpbGUsXG4gICAgICBzb3VyY2VGaWxlcz86IFJlYWRvbmx5QXJyYXk8dHMuU291cmNlRmlsZT4pIHtcbiAgICAvLyBjb2xsZWN0IGVtaXR0ZWRMaWJyYXJ5U3VtbWFyaWVzXG4gICAgbGV0IGJhc2VGaWxlOiB0cy5Tb3VyY2VGaWxlfHVuZGVmaW5lZDtcbiAgICBpZiAoZ2VuRmlsZSkge1xuICAgICAgYmFzZUZpbGUgPSB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGdlbkZpbGUuc3JjRmlsZVVybCk7XG4gICAgICBpZiAoYmFzZUZpbGUpIHtcbiAgICAgICAgaWYgKCF0aGlzLmVtaXR0ZWRMaWJyYXJ5U3VtbWFyaWVzKSB7XG4gICAgICAgICAgdGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcyA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChnZW5GaWxlLmdlbkZpbGVVcmwuZW5kc1dpdGgoJy5uZ3N1bW1hcnkuanNvbicpICYmIGJhc2VGaWxlLmZpbGVOYW1lLmVuZHNXaXRoKCcuZC50cycpKSB7XG4gICAgICAgICAgdGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcy5wdXNoKHtcbiAgICAgICAgICAgIGZpbGVOYW1lOiBiYXNlRmlsZS5maWxlTmFtZSxcbiAgICAgICAgICAgIHRleHQ6IGJhc2VGaWxlLnRleHQsXG4gICAgICAgICAgICBzb3VyY2VGaWxlOiBiYXNlRmlsZSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICB0aGlzLmVtaXR0ZWRMaWJyYXJ5U3VtbWFyaWVzLnB1c2goe2ZpbGVOYW1lOiBnZW5GaWxlLmdlbkZpbGVVcmwsIHRleHQ6IG91dERhdGF9KTtcbiAgICAgICAgICBpZiAoIXRoaXMub3B0aW9ucy5kZWNsYXJhdGlvbikge1xuICAgICAgICAgICAgLy8gSWYgd2UgZG9uJ3QgZW1pdCBkZWNsYXJhdGlvbnMsIHN0aWxsIHJlY29yZCBhbiBlbXB0eSAubmdmYWN0b3J5LmQudHMgZmlsZSxcbiAgICAgICAgICAgIC8vIGFzIHdlIG1pZ2h0IG5lZWQgaXQgbGF0ZXIgb24gZm9yIHJlc29sdmluZyBtb2R1bGUgbmFtZXMgZnJvbSBzdW1tYXJpZXMuXG4gICAgICAgICAgICBjb25zdCBuZ0ZhY3RvcnlEdHMgPVxuICAgICAgICAgICAgICAgIGdlbkZpbGUuZ2VuRmlsZVVybC5zdWJzdHJpbmcoMCwgZ2VuRmlsZS5nZW5GaWxlVXJsLmxlbmd0aCAtIDE1KSArICcubmdmYWN0b3J5LmQudHMnO1xuICAgICAgICAgICAgdGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcy5wdXNoKHtmaWxlTmFtZTogbmdGYWN0b3J5RHRzLCB0ZXh0OiAnJ30pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChvdXRGaWxlTmFtZS5lbmRzV2l0aCgnLmQudHMnKSAmJiBiYXNlRmlsZS5maWxlTmFtZS5lbmRzV2l0aCgnLmQudHMnKSkge1xuICAgICAgICAgIGNvbnN0IGR0c1NvdXJjZUZpbGVQYXRoID0gZ2VuRmlsZS5nZW5GaWxlVXJsLnJlcGxhY2UoL1xcLnRzJC8sICcuZC50cycpO1xuICAgICAgICAgIC8vIE5vdGU6IERvbid0IHVzZSBzb3VyY2VGaWxlcyBoZXJlIGFzIHRoZSBjcmVhdGVkIC5kLnRzIGhhcyBhIHBhdGggaW4gdGhlIG91dERpcixcbiAgICAgICAgICAvLyBidXQgd2UgbmVlZCBvbmUgdGhhdCBpcyBuZXh0IHRvIHRoZSAudHMgZmlsZVxuICAgICAgICAgIHRoaXMuZW1pdHRlZExpYnJhcnlTdW1tYXJpZXMucHVzaCh7ZmlsZU5hbWU6IGR0c1NvdXJjZUZpbGVQYXRoLCB0ZXh0OiBvdXREYXRhfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gRmlsdGVyIG91dCBnZW5lcmF0ZWQgZmlsZXMgZm9yIHdoaWNoIHdlIGRpZG4ndCBnZW5lcmF0ZSBjb2RlLlxuICAgIC8vIFRoaXMgY2FuIGhhcHBlbiBhcyB0aGUgc3R1YiBjYWxjdWxhdGlvbiBpcyBub3QgY29tcGxldGVseSBleGFjdC5cbiAgICAvLyBOb3RlOiBzb3VyY2VGaWxlIHJlZmVycyB0byB0aGUgLm5nZmFjdG9yeS50cyAvIC5uZ3N1bW1hcnkudHMgZmlsZVxuICAgIC8vIG5vZGVfZW1pdHRlcl90cmFuc2Zvcm0gYWxyZWFkeSBzZXQgdGhlIGZpbGUgY29udGVudHMgdG8gYmUgZW1wdHksXG4gICAgLy8gIHNvIHRoaXMgY29kZSBvbmx5IG5lZWRzIHRvIHNraXAgdGhlIGZpbGUgaWYgIWFsbG93RW1wdHlDb2RlZ2VuRmlsZXMuXG4gICAgY29uc3QgaXNHZW5lcmF0ZWQgPSBHRU5FUkFURURfRklMRVMudGVzdChvdXRGaWxlTmFtZSk7XG4gICAgaWYgKGlzR2VuZXJhdGVkICYmICF0aGlzLm9wdGlvbnMuYWxsb3dFbXB0eUNvZGVnZW5GaWxlcyAmJlxuICAgICAgICAoIWdlbkZpbGUgfHwgIWdlbkZpbGUuc3RtdHMgfHwgZ2VuRmlsZS5zdG10cy5sZW5ndGggPT09IDApKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChiYXNlRmlsZSkge1xuICAgICAgc291cmNlRmlsZXMgPSBzb3VyY2VGaWxlcyA/IFsuLi5zb3VyY2VGaWxlcywgYmFzZUZpbGVdIDogW2Jhc2VGaWxlXTtcbiAgICB9XG4gICAgLy8gVE9ETzogcmVtb3ZlIGFueSB3aGVuIFRTIDIuNCBzdXBwb3J0IGlzIHJlbW92ZWQuXG4gICAgdGhpcy5ob3N0LndyaXRlRmlsZShvdXRGaWxlTmFtZSwgb3V0RGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCBzb3VyY2VGaWxlcyBhcyBhbnkpO1xuICB9XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVByb2dyYW0oe3Jvb3ROYW1lcywgb3B0aW9ucywgaG9zdCwgb2xkUHJvZ3JhbX06IHtcbiAgcm9vdE5hbWVzOiBSZWFkb25seUFycmF5PHN0cmluZz4sXG4gIG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucyxcbiAgaG9zdDogQ29tcGlsZXJIb3N0LCBvbGRQcm9ncmFtPzogUHJvZ3JhbVxufSk6IFByb2dyYW0ge1xuICBpZiAob3B0aW9ucy5lbmFibGVJdnkgIT09IGZhbHNlKSB7XG4gICAgcmV0dXJuIG5ldyBOZ3RzY1Byb2dyYW0ocm9vdE5hbWVzLCBvcHRpb25zLCBob3N0LCBvbGRQcm9ncmFtIGFzIE5ndHNjUHJvZ3JhbSB8IHVuZGVmaW5lZCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG5ldyBBbmd1bGFyQ29tcGlsZXJQcm9ncmFtKHJvb3ROYW1lcywgb3B0aW9ucywgaG9zdCwgb2xkUHJvZ3JhbSk7XG4gIH1cbn1cblxuLy8gQ29tcHV0ZSB0aGUgQW90Q29tcGlsZXIgb3B0aW9uc1xuZnVuY3Rpb24gZ2V0QW90Q29tcGlsZXJPcHRpb25zKG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucyk6IEFvdENvbXBpbGVyT3B0aW9ucyB7XG4gIGxldCBtaXNzaW5nVHJhbnNsYXRpb24gPSBjb3JlLk1pc3NpbmdUcmFuc2xhdGlvblN0cmF0ZWd5Lldhcm5pbmc7XG5cbiAgc3dpdGNoIChvcHRpb25zLmkxOG5Jbk1pc3NpbmdUcmFuc2xhdGlvbnMpIHtcbiAgICBjYXNlICdpZ25vcmUnOlxuICAgICAgbWlzc2luZ1RyYW5zbGF0aW9uID0gY29yZS5NaXNzaW5nVHJhbnNsYXRpb25TdHJhdGVneS5JZ25vcmU7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdlcnJvcic6XG4gICAgICBtaXNzaW5nVHJhbnNsYXRpb24gPSBjb3JlLk1pc3NpbmdUcmFuc2xhdGlvblN0cmF0ZWd5LkVycm9yO1xuICAgICAgYnJlYWs7XG4gIH1cblxuICBsZXQgdHJhbnNsYXRpb25zOiBzdHJpbmcgPSAnJztcblxuICBpZiAob3B0aW9ucy5pMThuSW5GaWxlKSB7XG4gICAgaWYgKCFvcHRpb25zLmkxOG5JbkxvY2FsZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgdHJhbnNsYXRpb24gZmlsZSAoJHtvcHRpb25zLmkxOG5JbkZpbGV9KSBsb2NhbGUgbXVzdCBiZSBwcm92aWRlZC5gKTtcbiAgICB9XG4gICAgdHJhbnNsYXRpb25zID0gZnMucmVhZEZpbGVTeW5jKG9wdGlvbnMuaTE4bkluRmlsZSwgJ3V0ZjgnKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBObyB0cmFuc2xhdGlvbnMgYXJlIHByb3ZpZGVkLCBpZ25vcmUgYW55IGVycm9yc1xuICAgIC8vIFdlIHN0aWxsIGdvIHRocm91Z2ggaTE4biB0byByZW1vdmUgaTE4biBhdHRyaWJ1dGVzXG4gICAgbWlzc2luZ1RyYW5zbGF0aW9uID0gY29yZS5NaXNzaW5nVHJhbnNsYXRpb25TdHJhdGVneS5JZ25vcmU7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGxvY2FsZTogb3B0aW9ucy5pMThuSW5Mb2NhbGUsXG4gICAgaTE4bkZvcm1hdDogb3B0aW9ucy5pMThuSW5Gb3JtYXQgfHwgb3B0aW9ucy5pMThuT3V0Rm9ybWF0LFxuICAgIGkxOG5Vc2VFeHRlcm5hbElkczogb3B0aW9ucy5pMThuVXNlRXh0ZXJuYWxJZHMsIHRyYW5zbGF0aW9ucywgbWlzc2luZ1RyYW5zbGF0aW9uLFxuICAgIGVuYWJsZVN1bW1hcmllc0ZvckppdDogb3B0aW9ucy5lbmFibGVTdW1tYXJpZXNGb3JKaXQsXG4gICAgcHJlc2VydmVXaGl0ZXNwYWNlczogb3B0aW9ucy5wcmVzZXJ2ZVdoaXRlc3BhY2VzLFxuICAgIGZ1bGxUZW1wbGF0ZVR5cGVDaGVjazogb3B0aW9ucy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2ssXG4gICAgYWxsb3dFbXB0eUNvZGVnZW5GaWxlczogb3B0aW9ucy5hbGxvd0VtcHR5Q29kZWdlbkZpbGVzLFxuICAgIGVuYWJsZUl2eTogb3B0aW9ucy5lbmFibGVJdnksXG4gICAgY3JlYXRlRXh0ZXJuYWxTeW1ib2xGYWN0b3J5UmVleHBvcnRzOiBvcHRpb25zLmNyZWF0ZUV4dGVybmFsU3ltYm9sRmFjdG9yeVJlZXhwb3J0cyxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0TmdPcHRpb25EaWFnbm9zdGljcyhvcHRpb25zOiBDb21waWxlck9wdGlvbnMpOiBSZWFkb25seUFycmF5PERpYWdub3N0aWM+IHtcbiAgaWYgKG9wdGlvbnMuYW5ub3RhdGlvbnNBcykge1xuICAgIHN3aXRjaCAob3B0aW9ucy5hbm5vdGF0aW9uc0FzKSB7XG4gICAgICBjYXNlICdkZWNvcmF0b3JzJzpcbiAgICAgIGNhc2UgJ3N0YXRpYyBmaWVsZHMnOlxuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBbe1xuICAgICAgICAgIG1lc3NhZ2VUZXh0OlxuICAgICAgICAgICAgICAnQW5ndWxhciBjb21waWxlciBvcHRpb25zIFwiYW5ub3RhdGlvbnNBc1wiIG9ubHkgc3VwcG9ydHMgXCJzdGF0aWMgZmllbGRzXCIgYW5kIFwiZGVjb3JhdG9yc1wiJyxcbiAgICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICAgIHNvdXJjZTogU09VUkNFLFxuICAgICAgICAgIGNvZGU6IERFRkFVTFRfRVJST1JfQ09ERVxuICAgICAgICB9XTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIFtdO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVTZXBhcmF0b3JzKHBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBwYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCBjYW4gYWRqdXN0IGEgcGF0aCBmcm9tIHNvdXJjZSBwYXRoIHRvIG91dCBwYXRoLFxuICogYmFzZWQgb24gYW4gZXhpc3RpbmcgbWFwcGluZyBmcm9tIHNvdXJjZSB0byBvdXQgcGF0aC5cbiAqXG4gKiBUT0RPKHRib3NjaCk6IHRhbGsgdG8gdGhlIFR5cGVTY3JpcHQgdGVhbSB0byBleHBvc2UgdGhlaXIgbG9naWMgZm9yIGNhbGN1bGF0aW5nIHRoZSBgcm9vdERpcmBcbiAqIGlmIG5vbmUgd2FzIHNwZWNpZmllZC5cbiAqXG4gKiBOb3RlOiBUaGlzIGZ1bmN0aW9uIHdvcmtzIG9uIG5vcm1hbGl6ZWQgcGF0aHMgZnJvbSB0eXBlc2NyaXB0IGJ1dCBzaG91bGQgYWx3YXlzIHJldHVyblxuICogUE9TSVggbm9ybWFsaXplZCBwYXRocyBmb3Igb3V0cHV0IHBhdGhzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU3JjVG9PdXRQYXRoTWFwcGVyKFxuICAgIG91dERpcjogc3RyaW5nIHwgdW5kZWZpbmVkLCBzYW1wbGVTcmNGaWxlTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgIHNhbXBsZU91dEZpbGVOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQsIGhvc3Q6IHtcbiAgICAgIGRpcm5hbWU6IHR5cGVvZiBwYXRoLmRpcm5hbWUsXG4gICAgICByZXNvbHZlOiB0eXBlb2YgcGF0aC5yZXNvbHZlLFxuICAgICAgcmVsYXRpdmU6IHR5cGVvZiBwYXRoLnJlbGF0aXZlXG4gICAgfSA9IHBhdGgpOiAoc3JjRmlsZU5hbWU6IHN0cmluZykgPT4gc3RyaW5nIHtcbiAgaWYgKG91dERpcikge1xuICAgIGxldCBwYXRoOiB7fSA9IHt9OyAgLy8gRW5zdXJlIHdlIGVycm9yIGlmIHdlIHVzZSBgcGF0aGAgaW5zdGVhZCBvZiBgaG9zdGAuXG4gICAgaWYgKHNhbXBsZVNyY0ZpbGVOYW1lID09IG51bGwgfHwgc2FtcGxlT3V0RmlsZU5hbWUgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW4ndCBjYWxjdWxhdGUgdGhlIHJvb3REaXIgd2l0aG91dCBhIHNhbXBsZSBzcmNGaWxlTmFtZSAvIG91dEZpbGVOYW1lLiBgKTtcbiAgICB9XG4gICAgY29uc3Qgc3JjRmlsZURpciA9IG5vcm1hbGl6ZVNlcGFyYXRvcnMoaG9zdC5kaXJuYW1lKHNhbXBsZVNyY0ZpbGVOYW1lKSk7XG4gICAgY29uc3Qgb3V0RmlsZURpciA9IG5vcm1hbGl6ZVNlcGFyYXRvcnMoaG9zdC5kaXJuYW1lKHNhbXBsZU91dEZpbGVOYW1lKSk7XG4gICAgaWYgKHNyY0ZpbGVEaXIgPT09IG91dEZpbGVEaXIpIHtcbiAgICAgIHJldHVybiAoc3JjRmlsZU5hbWUpID0+IHNyY0ZpbGVOYW1lO1xuICAgIH1cbiAgICAvLyBjYWxjdWxhdGUgdGhlIGNvbW1vbiBzdWZmaXgsIHN0b3BwaW5nXG4gICAgLy8gYXQgYG91dERpcmAuXG4gICAgY29uc3Qgc3JjRGlyUGFydHMgPSBzcmNGaWxlRGlyLnNwbGl0KCcvJyk7XG4gICAgY29uc3Qgb3V0RGlyUGFydHMgPSBub3JtYWxpemVTZXBhcmF0b3JzKGhvc3QucmVsYXRpdmUob3V0RGlyLCBvdXRGaWxlRGlyKSkuc3BsaXQoJy8nKTtcbiAgICBsZXQgaSA9IDA7XG4gICAgd2hpbGUgKGkgPCBNYXRoLm1pbihzcmNEaXJQYXJ0cy5sZW5ndGgsIG91dERpclBhcnRzLmxlbmd0aCkgJiZcbiAgICAgICAgICAgc3JjRGlyUGFydHNbc3JjRGlyUGFydHMubGVuZ3RoIC0gMSAtIGldID09PSBvdXREaXJQYXJ0c1tvdXREaXJQYXJ0cy5sZW5ndGggLSAxIC0gaV0pXG4gICAgICBpKys7XG4gICAgY29uc3Qgcm9vdERpciA9IHNyY0RpclBhcnRzLnNsaWNlKDAsIHNyY0RpclBhcnRzLmxlbmd0aCAtIGkpLmpvaW4oJy8nKTtcbiAgICByZXR1cm4gKHNyY0ZpbGVOYW1lKSA9PiB7XG4gICAgICAvLyBOb3RlOiBCZWZvcmUgd2UgcmV0dXJuIHRoZSBtYXBwZWQgb3V0cHV0IHBhdGgsIHdlIG5lZWQgdG8gbm9ybWFsaXplIHRoZSBwYXRoIGRlbGltaXRlcnNcbiAgICAgIC8vIGJlY2F1c2UgdGhlIG91dHB1dCBwYXRoIGlzIHVzdWFsbHkgcGFzc2VkIHRvIFR5cGVTY3JpcHQgd2hpY2ggc29tZXRpbWVzIG9ubHkgZXhwZWN0c1xuICAgICAgLy8gcG9zaXggbm9ybWFsaXplZCBwYXRocyAoZS5nLiBpZiBhIGN1c3RvbSBjb21waWxlciBob3N0IGlzIHVzZWQpXG4gICAgICByZXR1cm4gbm9ybWFsaXplU2VwYXJhdG9ycyhob3N0LnJlc29sdmUob3V0RGlyLCBob3N0LnJlbGF0aXZlKHJvb3REaXIsIHNyY0ZpbGVOYW1lKSkpO1xuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgLy8gTm90ZTogQmVmb3JlIHdlIHJldHVybiB0aGUgb3V0cHV0IHBhdGgsIHdlIG5lZWQgdG8gbm9ybWFsaXplIHRoZSBwYXRoIGRlbGltaXRlcnMgYmVjYXVzZVxuICAgIC8vIHRoZSBvdXRwdXQgcGF0aCBpcyB1c3VhbGx5IHBhc3NlZCB0byBUeXBlU2NyaXB0IHdoaWNoIG9ubHkgcGFzc2VzIGFyb3VuZCBwb3NpeFxuICAgIC8vIG5vcm1hbGl6ZWQgcGF0aHMgKGUuZy4gaWYgYSBjdXN0b20gY29tcGlsZXIgaG9zdCBpcyB1c2VkKVxuICAgIHJldHVybiAoc3JjRmlsZU5hbWUpID0+IG5vcm1hbGl6ZVNlcGFyYXRvcnMoc3JjRmlsZU5hbWUpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpMThuRXh0cmFjdChcbiAgICBmb3JtYXROYW1lOiBzdHJpbmcgfCBudWxsLCBvdXRGaWxlOiBzdHJpbmcgfCBudWxsLCBob3N0OiB0cy5Db21waWxlckhvc3QsXG4gICAgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zLCBidW5kbGU6IE1lc3NhZ2VCdW5kbGUpOiBzdHJpbmdbXSB7XG4gIGZvcm1hdE5hbWUgPSBmb3JtYXROYW1lIHx8ICd4bGYnO1xuICAvLyBDaGVja3MgdGhlIGZvcm1hdCBhbmQgcmV0dXJucyB0aGUgZXh0ZW5zaW9uXG4gIGNvbnN0IGV4dCA9IGkxOG5HZXRFeHRlbnNpb24oZm9ybWF0TmFtZSk7XG4gIGNvbnN0IGNvbnRlbnQgPSBpMThuU2VyaWFsaXplKGJ1bmRsZSwgZm9ybWF0TmFtZSwgb3B0aW9ucyk7XG4gIGNvbnN0IGRzdEZpbGUgPSBvdXRGaWxlIHx8IGBtZXNzYWdlcy4ke2V4dH1gO1xuICBjb25zdCBkc3RQYXRoID0gcGF0aC5yZXNvbHZlKG9wdGlvbnMub3V0RGlyIHx8IG9wdGlvbnMuYmFzZVBhdGggISwgZHN0RmlsZSk7XG4gIGhvc3Qud3JpdGVGaWxlKGRzdFBhdGgsIGNvbnRlbnQsIGZhbHNlLCB1bmRlZmluZWQsIFtdKTtcbiAgcmV0dXJuIFtkc3RQYXRoXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGkxOG5TZXJpYWxpemUoXG4gICAgYnVuZGxlOiBNZXNzYWdlQnVuZGxlLCBmb3JtYXROYW1lOiBzdHJpbmcsIG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucyk6IHN0cmluZyB7XG4gIGNvbnN0IGZvcm1hdCA9IGZvcm1hdE5hbWUudG9Mb3dlckNhc2UoKTtcbiAgbGV0IHNlcmlhbGl6ZXI6IFNlcmlhbGl6ZXI7XG5cbiAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICBjYXNlICd4bWInOlxuICAgICAgc2VyaWFsaXplciA9IG5ldyBYbWIoKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3hsaWZmMic6XG4gICAgY2FzZSAneGxmMic6XG4gICAgICBzZXJpYWxpemVyID0gbmV3IFhsaWZmMigpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAneGxmJzpcbiAgICBjYXNlICd4bGlmZic6XG4gICAgZGVmYXVsdDpcbiAgICAgIHNlcmlhbGl6ZXIgPSBuZXcgWGxpZmYoKTtcbiAgfVxuXG4gIHJldHVybiBidW5kbGUud3JpdGUoc2VyaWFsaXplciwgZ2V0UGF0aE5vcm1hbGl6ZXIob3B0aW9ucy5iYXNlUGF0aCkpO1xufVxuXG5mdW5jdGlvbiBnZXRQYXRoTm9ybWFsaXplcihiYXNlUGF0aD86IHN0cmluZykge1xuICAvLyBub3JtYWxpemUgc291cmNlIHBhdGhzIGJ5IHJlbW92aW5nIHRoZSBiYXNlIHBhdGggYW5kIGFsd2F5cyB1c2luZyBcIi9cIiBhcyBhIHNlcGFyYXRvclxuICByZXR1cm4gKHNvdXJjZVBhdGg6IHN0cmluZykgPT4ge1xuICAgIHNvdXJjZVBhdGggPSBiYXNlUGF0aCA/IHBhdGgucmVsYXRpdmUoYmFzZVBhdGgsIHNvdXJjZVBhdGgpIDogc291cmNlUGF0aDtcbiAgICByZXR1cm4gc291cmNlUGF0aC5zcGxpdChwYXRoLnNlcCkuam9pbignLycpO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaTE4bkdldEV4dGVuc2lvbihmb3JtYXROYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBmb3JtYXQgPSBmb3JtYXROYW1lLnRvTG93ZXJDYXNlKCk7XG5cbiAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICBjYXNlICd4bWInOlxuICAgICAgcmV0dXJuICd4bWInO1xuICAgIGNhc2UgJ3hsZic6XG4gICAgY2FzZSAneGxpZic6XG4gICAgY2FzZSAneGxpZmYnOlxuICAgIGNhc2UgJ3hsZjInOlxuICAgIGNhc2UgJ3hsaWZmMic6XG4gICAgICByZXR1cm4gJ3hsZic7XG4gIH1cblxuICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIGZvcm1hdCBcIiR7Zm9ybWF0TmFtZX1cImApO1xufVxuXG5mdW5jdGlvbiBtZXJnZUVtaXRSZXN1bHRzKGVtaXRSZXN1bHRzOiB0cy5FbWl0UmVzdWx0W10pOiB0cy5FbWl0UmVzdWx0IHtcbiAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICBsZXQgZW1pdFNraXBwZWQgPSBmYWxzZTtcbiAgY29uc3QgZW1pdHRlZEZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IGVyIG9mIGVtaXRSZXN1bHRzKSB7XG4gICAgZGlhZ25vc3RpY3MucHVzaCguLi5lci5kaWFnbm9zdGljcyk7XG4gICAgZW1pdFNraXBwZWQgPSBlbWl0U2tpcHBlZCB8fCBlci5lbWl0U2tpcHBlZDtcbiAgICBlbWl0dGVkRmlsZXMucHVzaCguLi4oZXIuZW1pdHRlZEZpbGVzIHx8IFtdKSk7XG4gIH1cbiAgcmV0dXJuIHtkaWFnbm9zdGljcywgZW1pdFNraXBwZWQsIGVtaXR0ZWRGaWxlc307XG59XG5cbmZ1bmN0aW9uIGRpYWdub3N0aWNTb3VyY2VPZlNwYW4oc3BhbjogUGFyc2VTb3VyY2VTcGFuKTogdHMuU291cmNlRmlsZSB7XG4gIC8vIEZvciBkaWFnbm9zdGljcywgVHlwZVNjcmlwdCBvbmx5IHVzZXMgdGhlIGZpbGVOYW1lIGFuZCB0ZXh0IHByb3BlcnRpZXMuXG4gIC8vIFRoZSByZWR1bmRhbnQgJygpJyBhcmUgaGVyZSBpcyB0byBhdm9pZCBoYXZpbmcgY2xhbmctZm9ybWF0IGJyZWFraW5nIHRoZSBsaW5lIGluY29ycmVjdGx5LlxuICByZXR1cm4gKHsgZmlsZU5hbWU6IHNwYW4uc3RhcnQuZmlsZS51cmwsIHRleHQ6IHNwYW4uc3RhcnQuZmlsZS5jb250ZW50IH0gYXMgYW55KTtcbn1cblxuZnVuY3Rpb24gZGlhZ25vc3RpY1NvdXJjZU9mRmlsZU5hbWUoZmlsZU5hbWU6IHN0cmluZywgcHJvZ3JhbTogdHMuUHJvZ3JhbSk6IHRzLlNvdXJjZUZpbGUge1xuICBjb25zdCBzb3VyY2VGaWxlID0gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKTtcbiAgaWYgKHNvdXJjZUZpbGUpIHJldHVybiBzb3VyY2VGaWxlO1xuXG4gIC8vIElmIHdlIGFyZSByZXBvcnRpbmcgZGlhZ25vc3RpY3MgZm9yIGEgc291cmNlIGZpbGUgdGhhdCBpcyBub3QgaW4gdGhlIHByb2plY3QgdGhlbiB3ZSBuZWVkXG4gIC8vIHRvIGZha2UgYSBzb3VyY2UgZmlsZSBzbyB0aGUgZGlhZ25vc3RpYyBmb3JtYXR0aW5nIHJvdXRpbmVzIGNhbiBlbWl0IHRoZSBmaWxlIG5hbWUuXG4gIC8vIFRoZSByZWR1bmRhbnQgJygpJyBhcmUgaGVyZSBpcyB0byBhdm9pZCBoYXZpbmcgY2xhbmctZm9ybWF0IGJyZWFraW5nIHRoZSBsaW5lIGluY29ycmVjdGx5LlxuICByZXR1cm4gKHsgZmlsZU5hbWUsIHRleHQ6ICcnIH0gYXMgYW55KTtcbn1cblxuXG5mdW5jdGlvbiBkaWFnbm9zdGljQ2hhaW5Gcm9tRm9ybWF0dGVkRGlhZ25vc3RpY0NoYWluKGNoYWluOiBGb3JtYXR0ZWRNZXNzYWdlQ2hhaW4pOlxuICAgIERpYWdub3N0aWNNZXNzYWdlQ2hhaW4ge1xuICByZXR1cm4ge1xuICAgIG1lc3NhZ2VUZXh0OiBjaGFpbi5tZXNzYWdlLFxuICAgIG5leHQ6IGNoYWluLm5leHQgJiYgY2hhaW4ubmV4dC5tYXAoZGlhZ25vc3RpY0NoYWluRnJvbUZvcm1hdHRlZERpYWdub3N0aWNDaGFpbiksXG4gICAgcG9zaXRpb246IGNoYWluLnBvc2l0aW9uXG4gIH07XG59XG5cbmZ1bmN0aW9uIHN5bnRheEVycm9yVG9EaWFnbm9zdGljcyhlcnJvcjogRXJyb3IpOiBEaWFnbm9zdGljW10ge1xuICBjb25zdCBwYXJzZXJFcnJvcnMgPSBnZXRQYXJzZUVycm9ycyhlcnJvcik7XG4gIGlmIChwYXJzZXJFcnJvcnMgJiYgcGFyc2VyRXJyb3JzLmxlbmd0aCkge1xuICAgIHJldHVybiBwYXJzZXJFcnJvcnMubWFwPERpYWdub3N0aWM+KGUgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VUZXh0OiBlLmNvbnRleHR1YWxNZXNzYWdlKCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlOiBkaWFnbm9zdGljU291cmNlT2ZTcGFuKGUuc3BhbiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydDogZS5zcGFuLnN0YXJ0Lm9mZnNldCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxlbmd0aDogZS5zcGFuLmVuZC5vZmZzZXQgLSBlLnNwYW4uc3RhcnQub2Zmc2V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZTogU09VUkNFLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogREVGQVVMVF9FUlJPUl9DT0RFXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xuICB9IGVsc2UgaWYgKGlzRm9ybWF0dGVkRXJyb3IoZXJyb3IpKSB7XG4gICAgcmV0dXJuIFt7XG4gICAgICBtZXNzYWdlVGV4dDogZXJyb3IubWVzc2FnZSxcbiAgICAgIGNoYWluOiBlcnJvci5jaGFpbiAmJiBkaWFnbm9zdGljQ2hhaW5Gcm9tRm9ybWF0dGVkRGlhZ25vc3RpY0NoYWluKGVycm9yLmNoYWluKSxcbiAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICBzb3VyY2U6IFNPVVJDRSxcbiAgICAgIGNvZGU6IERFRkFVTFRfRVJST1JfQ09ERSxcbiAgICAgIHBvc2l0aW9uOiBlcnJvci5wb3NpdGlvblxuICAgIH1dO1xuICB9XG4gIC8vIFByb2R1Y2UgYSBEaWFnbm9zdGljIGFueXdheSBzaW5jZSB3ZSBrbm93IGZvciBzdXJlIGBlcnJvcmAgaXMgYSBTeW50YXhFcnJvclxuICByZXR1cm4gW3tcbiAgICBtZXNzYWdlVGV4dDogZXJyb3IubWVzc2FnZSxcbiAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgIGNvZGU6IERFRkFVTFRfRVJST1JfQ09ERSxcbiAgICBzb3VyY2U6IFNPVVJDRSxcbiAgfV07XG59XG4iXX0=