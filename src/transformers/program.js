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
        define("@angular/compiler-cli/src/transformers/program", ["require", "exports", "tslib", "@angular/compiler", "fs", "path", "typescript", "@angular/compiler-cli/src/diagnostics/translate_diagnostics", "@angular/compiler-cli/src/metadata/index", "@angular/compiler-cli/src/ngtsc/core/src/compiler", "@angular/compiler-cli/src/ngtsc/program", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/typescript_support", "@angular/compiler-cli/src/transformers/api", "@angular/compiler-cli/src/transformers/compiler_host", "@angular/compiler-cli/src/transformers/downlevel_decorators_transform", "@angular/compiler-cli/src/transformers/i18n", "@angular/compiler-cli/src/transformers/inline_resources", "@angular/compiler-cli/src/transformers/lower_expressions", "@angular/compiler-cli/src/transformers/metadata_cache", "@angular/compiler-cli/src/transformers/node_emitter_transform", "@angular/compiler-cli/src/transformers/r3_metadata_transform", "@angular/compiler-cli/src/transformers/r3_transform", "@angular/compiler-cli/src/transformers/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createSrcToOutPathMapper = exports.createProgram = exports.resetTempProgramHandlerForTest = exports.setTempProgramHandlerForTest = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var fs = require("fs");
    var path = require("path");
    var ts = require("typescript");
    var translate_diagnostics_1 = require("@angular/compiler-cli/src/diagnostics/translate_diagnostics");
    var metadata_1 = require("@angular/compiler-cli/src/metadata/index");
    var compiler_2 = require("@angular/compiler-cli/src/ngtsc/core/src/compiler");
    var program_1 = require("@angular/compiler-cli/src/ngtsc/program");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var typescript_support_1 = require("@angular/compiler-cli/src/typescript_support");
    var api_1 = require("@angular/compiler-cli/src/transformers/api");
    var compiler_host_1 = require("@angular/compiler-cli/src/transformers/compiler_host");
    var downlevel_decorators_transform_1 = require("@angular/compiler-cli/src/transformers/downlevel_decorators_transform");
    var i18n_1 = require("@angular/compiler-cli/src/transformers/i18n");
    var inline_resources_1 = require("@angular/compiler-cli/src/transformers/inline_resources");
    var lower_expressions_1 = require("@angular/compiler-cli/src/transformers/lower_expressions");
    var metadata_cache_1 = require("@angular/compiler-cli/src/transformers/metadata_cache");
    var node_emitter_transform_1 = require("@angular/compiler-cli/src/transformers/node_emitter_transform");
    var r3_metadata_transform_1 = require("@angular/compiler-cli/src/transformers/r3_metadata_transform");
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
    var R3_LOWER_FIELDS = (0, tslib_1.__spreadArray)((0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(LOWER_FIELDS), false), ['providers', 'imports', 'exports'], false);
    /**
     * Installs a handler for testing purposes to allow inspection of the temporary program.
     */
    var tempProgramHandlerForTest = null;
    function setTempProgramHandlerForTest(handler) {
        tempProgramHandlerForTest = handler;
    }
    exports.setTempProgramHandlerForTest = setTempProgramHandlerForTest;
    function resetTempProgramHandlerForTest() {
        tempProgramHandlerForTest = null;
    }
    exports.resetTempProgramHandlerForTest = resetTempProgramHandlerForTest;
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
            this._transformTsDiagnostics = [];
            this._isCompilingAngularCore = null;
            this.rootNames = (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(rootNames), false);
            if (!options.disableTypeScriptVersionCheck) {
                (0, typescript_support_1.verifySupportedTypeScriptVersion)();
            }
            this.oldTsProgram = oldProgram ? oldProgram.getTsProgram() : undefined;
            if (oldProgram) {
                this.oldProgramLibrarySummaries = oldProgram.getLibrarySummaries();
                this.oldProgramEmittedGeneratedFiles = oldProgram.getEmittedGeneratedFiles();
                this.oldProgramEmittedSourceFiles = oldProgram.getEmittedSourceFiles();
            }
            if (options.flatModuleOutFile) {
                var _b = (0, metadata_1.createBundleIndexHost)(options, this.rootNames, host, function () { return _this.flatModuleMetadataCache; }), bundleHost = _b.host, indexName = _b.indexName, errors = _b.errors;
                if (errors) {
                    (_a = this._optionsDiagnostics).push.apply(_a, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(errors.map(function (e) { return ({
                        category: e.category,
                        messageText: e.messageText,
                        source: api_1.SOURCE,
                        code: api_1.DEFAULT_ERROR_CODE
                    }); })), false));
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
            return (0, tslib_1.__spreadArray)((0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(this._optionsDiagnostics), false), (0, tslib_1.__read)(getNgOptionDiagnostics(this.options)), false);
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
                    diags.push.apply(diags, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(_this.tsProgram.getSemanticDiagnostics(sf, cancellationToken)), false));
                }
            });
            return diags;
        };
        AngularCompilerProgram.prototype.getNgSemanticDiagnostics = function (fileName, cancellationToken) {
            var _this = this;
            var diags = [];
            this.tsProgram.getSourceFiles().forEach(function (sf) {
                if (util_1.GENERATED_FILES.test(sf.fileName) && !sf.isDeclarationFile) {
                    diags.push.apply(diags, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(_this.tsProgram.getSemanticDiagnostics(sf, cancellationToken)), false));
                }
            });
            var ng = (0, translate_diagnostics_1.translateDiagnostics)(this.hostAdapter, diags).ng;
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
            return [];
        };
        AngularCompilerProgram.prototype.emit = function (parameters) {
            if (parameters === void 0) { parameters = {}; }
            if (this.options.enableIvy !== false) {
                throw new Error('Cannot run legacy compiler in ngtsc mode');
            }
            return this._emitRender2(parameters);
        };
        AngularCompilerProgram.prototype._emitRender2 = function (_a) {
            var e_1, _b, e_2, _c;
            var _this = this;
            var _d = _a === void 0 ? {} : _a, _e = _d.emitFlags, emitFlags = _e === void 0 ? api_1.EmitFlags.Default : _e, cancellationToken = _d.cancellationToken, customTransformers = _d.customTransformers, _f = _d.emitCallback, emitCallback = _f === void 0 ? defaultEmitCallback : _f, _g = _d.mergeEmitResultsCallback, mergeEmitResultsCallback = _g === void 0 ? mergeEmitResults : _g;
            var emitStart = Date.now();
            if (emitFlags & api_1.EmitFlags.I18nBundle) {
                var locale = this.options.i18nOutLocale || null;
                var file = this.options.i18nOutFile || null;
                var format = this.options.i18nOutFormat || null;
                var bundle = this.compiler.emitMessageBundle(this.analyzedModules, locale);
                (0, i18n_1.i18nExtract)(format, file, this.host, this.options, bundle);
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
            this._transformTsDiagnostics = [];
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
            var tsCustomTransformers = this.calculateTransforms(genFileByFileName, modules, customTransformers);
            var emitOnlyDtsFiles = (emitFlags & (api_1.EmitFlags.DTS | api_1.EmitFlags.JS)) == api_1.EmitFlags.DTS;
            // Restore the original references before we emit so TypeScript doesn't emit
            // a reference to the .d.ts file.
            var augmentedReferences = new Map();
            try {
                for (var _j = (0, tslib_1.__values)(this.tsProgram.getSourceFiles()), _k = _j.next(); !_k.done; _k = _j.next()) {
                    var sourceFile = _k.value;
                    var originalReferences = (0, compiler_host_1.getOriginalReferences)(sourceFile);
                    if (originalReferences) {
                        augmentedReferences.set(sourceFile, sourceFile.referencedFiles);
                        sourceFile.referencedFiles = originalReferences;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_k && !_k.done && (_b = _j.return)) _b.call(_j);
                }
                finally { if (e_1) throw e_1.error; }
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
                    var fileNamesToEmit = (0, tslib_1.__spreadArray)((0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(sourceFilesToEmit.map(function (sf) { return sf.fileName; })), false), (0, tslib_1.__read)(genTsFiles.map(function (gf) { return gf.genFileUrl; })), false);
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
                    for (var _l = (0, tslib_1.__values)(Array.from(augmentedReferences)), _m = _l.next(); !_m.done; _m = _l.next()) {
                        var _o = (0, tslib_1.__read)(_m.value, 2), sourceFile = _o[0], references = _o[1];
                        // TODO(chuckj): Remove any cast after updating build to 2.6
                        sourceFile.referencedFiles = references;
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_m && !_m.done && (_c = _l.return)) _c.call(_l);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            this.emittedSourceFiles = emittedSourceFiles;
            // Match behavior of tsc: only produce emit diagnostics if it would block
            // emit. If noEmitOnError is false, the emit will happen in spite of any
            // errors, so we should not report them.
            if (emitResult && this.options.noEmitOnError === true) {
                // translate the diagnostics in the emitResult as well.
                var translatedEmitDiags = (0, translate_diagnostics_1.translateDiagnostics)(this.hostAdapter, emitResult.diagnostics);
                emitResult.diagnostics = translatedEmitDiags.ts.concat(this.structuralDiagnostics.concat(translatedEmitDiags.ng).map(util_1.ngToTsDiagnostic));
            }
            if (emitResult && !outSrcMapping.length) {
                // if no files were emitted by TypeScript, also don't emit .json files
                emitResult.diagnostics =
                    emitResult.diagnostics.concat([(0, util_1.createMessageDiagnostic)("Emitted no files.")]);
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
                emitResult.diagnostics = emitResult.diagnostics.concat([(0, util_1.createMessageDiagnostic)([
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
        Object.defineProperty(AngularCompilerProgram.prototype, "isCompilingAngularCore", {
            /** Whether the program is compiling the Angular core package. */
            get: function () {
                if (this._isCompilingAngularCore !== null) {
                    return this._isCompilingAngularCore;
                }
                return this._isCompilingAngularCore = (0, compiler_2.isAngularCorePackage)(this.tsProgram);
            },
            enumerable: false,
            configurable: true
        });
        AngularCompilerProgram.prototype.calculateTransforms = function (genFiles, partialModules, customTransformers) {
            var beforeTs = [];
            var metadataTransforms = [];
            var flatModuleMetadataTransforms = [];
            var annotateForClosureCompiler = this.options.annotateForClosureCompiler || false;
            if (this.options.enableResourceInlining) {
                beforeTs.push((0, inline_resources_1.getInlineResourcesTransformFactory)(this.tsProgram, this.hostAdapter));
                var transformer = new inline_resources_1.InlineResourcesMetadataTransformer(this.hostAdapter);
                metadataTransforms.push(transformer);
                flatModuleMetadataTransforms.push(transformer);
            }
            if (!this.options.disableExpressionLowering) {
                beforeTs.push((0, lower_expressions_1.getExpressionLoweringTransformFactory)(this.loweringMetadataTransform, this.tsProgram));
                metadataTransforms.push(this.loweringMetadataTransform);
            }
            if (genFiles) {
                beforeTs.push((0, node_emitter_transform_1.getAngularEmitterTransformFactory)(genFiles, this.getTsProgram(), annotateForClosureCompiler));
            }
            if (partialModules) {
                beforeTs.push((0, r3_transform_1.getAngularClassTransformerFactory)(partialModules, annotateForClosureCompiler));
                // If we have partial modules, the cached metadata might be incorrect as it doesn't reflect
                // the partial module transforms.
                var transformer = new r3_metadata_transform_1.PartialModuleMetadataTransformer(partialModules);
                metadataTransforms.push(transformer);
                flatModuleMetadataTransforms.push(transformer);
            }
            if (customTransformers && customTransformers.beforeTs) {
                beforeTs.push.apply(beforeTs, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(customTransformers.beforeTs), false));
            }
            // If decorators should be converted to static fields (enabled by default), we set up
            // the decorator downlevel transform. Note that we set it up as last transform as that
            // allows custom transformers to strip Angular decorators without having to deal with
            // identifying static properties. e.g. it's more difficult handling `<..>.decorators`
            // or `<..>.ctorParameters` compared to the `ts.Decorator` AST nodes.
            if (this.options.annotationsAs !== 'decorators') {
                var typeChecker = this.getTsProgram().getTypeChecker();
                var reflectionHost = new reflection_1.TypeScriptReflectionHost(typeChecker);
                // Similarly to how we handled tsickle decorator downleveling in the past, we just
                // ignore diagnostics that have been collected by the transformer. These are
                // non-significant failures that shouldn't prevent apps from compiling.
                beforeTs.push((0, downlevel_decorators_transform_1.getDownlevelDecoratorsTransform)(typeChecker, reflectionHost, [], this.isCompilingAngularCore, annotateForClosureCompiler, 
                /* skipClassDecorators */ false));
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
            this._compiler = (0, compiler_1.createAotCompiler)(this._hostAdapter, aotOptions, errorCollector).compiler;
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
            var rootNames = (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(this.rootNames), false);
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
                        rootNames.push.apply(rootNames, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(_this.compiler.findGeneratedFileNames(rootName)), false));
                    }
                });
            }
            var tmpProgram = ts.createProgram(rootNames, this.options, this.hostAdapter, oldTsProgram);
            if (tempProgramHandlerForTest !== null) {
                tempProgramHandlerForTest(tmpProgram);
            }
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
            if ((0, util_1.tsStructureIsReused)(this._tsProgram) !== 2 /* Completely */) {
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
            if ((0, compiler_1.isSyntaxError)(e)) {
                this._addStructuralDiagnostics(e);
                return;
            }
            throw e;
        };
        AngularCompilerProgram.prototype._addStructuralDiagnostics = function (error) {
            var diagnostics = this._structuralDiagnostics || (this._structuralDiagnostics = []);
            if ((0, compiler_1.isSyntaxError)(error)) {
                diagnostics.push.apply(diagnostics, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(syntaxErrorToDiagnostics(error, this.tsProgram)), false));
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
                    .filter(function (genFile) { return (0, util_1.isInRootDir)(genFile.genFileUrl, _this.options); });
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
                if ((0, compiler_1.isSyntaxError)(e)) {
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
                sourceFiles = sourceFiles ? (0, tslib_1.__spreadArray)((0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(sourceFiles), false), [baseFile], false) : [baseFile];
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
    function mergeEmitResults(emitResults) {
        var e_3, _a;
        var diagnostics = [];
        var emitSkipped = false;
        var emittedFiles = [];
        try {
            for (var emitResults_1 = (0, tslib_1.__values)(emitResults), emitResults_1_1 = emitResults_1.next(); !emitResults_1_1.done; emitResults_1_1 = emitResults_1.next()) {
                var er = emitResults_1_1.value;
                diagnostics.push.apply(diagnostics, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(er.diagnostics), false));
                emitSkipped = emitSkipped || er.emitSkipped;
                emittedFiles.push.apply(emittedFiles, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)((er.emittedFiles || [])), false));
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (emitResults_1_1 && !emitResults_1_1.done && (_a = emitResults_1.return)) _a.call(emitResults_1);
            }
            finally { if (e_3) throw e_3.error; }
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
    function syntaxErrorToDiagnostics(error, program) {
        var parserErrors = (0, compiler_1.getParseErrors)(error);
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
        else if ((0, compiler_1.isFormattedError)(error)) {
            return [{
                    messageText: error.message,
                    chain: error.chain && diagnosticChainFromFormattedDiagnosticChain(error.chain),
                    category: ts.DiagnosticCategory.Error,
                    source: api_1.SOURCE,
                    code: api_1.DEFAULT_ERROR_CODE,
                    position: error.position
                }];
        }
        var ngModuleErrorData = (0, compiler_1.getMissingNgModuleMetadataErrorData)(error);
        if (ngModuleErrorData !== null) {
            // This error represents the import or export of an `NgModule` that didn't have valid metadata.
            // This _might_ happen because the NgModule in question is an Ivy-compiled library, and we want
            // to show a more useful error if that's the case.
            var ngModuleClass = getDtsClass(program, ngModuleErrorData.fileName, ngModuleErrorData.className);
            if (ngModuleClass !== null && isIvyNgModule(ngModuleClass)) {
                return [{
                        messageText: "The NgModule '" + ngModuleErrorData.className + "' in '" + ngModuleErrorData
                            .fileName + "' is imported by this compilation, but appears to be part of a library compiled for Angular Ivy. This may occur because:\n\n  1) the library was processed with 'ngcc'. Removing and reinstalling node_modules may fix this problem.\n\n  2) the library was published for Angular Ivy and v12+ applications only. Check its peer dependencies carefully and ensure that you're using a compatible version of Angular.\n\nSee https://angular.io/errors/NG6999 for more information.\n",
                        category: ts.DiagnosticCategory.Error,
                        code: api_1.DEFAULT_ERROR_CODE,
                        source: api_1.SOURCE,
                    }];
            }
        }
        // Produce a Diagnostic anyway since we know for sure `error` is a SyntaxError
        return [{
                messageText: error.message,
                category: ts.DiagnosticCategory.Error,
                code: api_1.DEFAULT_ERROR_CODE,
                source: api_1.SOURCE,
            }];
    }
    function getDtsClass(program, fileName, className) {
        var e_4, _a;
        var sf = program.getSourceFile(fileName);
        if (sf === undefined || !sf.isDeclarationFile) {
            return null;
        }
        try {
            for (var _b = (0, tslib_1.__values)(sf.statements), _c = _b.next(); !_c.done; _c = _b.next()) {
                var stmt = _c.value;
                if (!ts.isClassDeclaration(stmt)) {
                    continue;
                }
                if (stmt.name === undefined || stmt.name.text !== className) {
                    continue;
                }
                return stmt;
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_4) throw e_4.error; }
        }
        // No classes found that matched the given name.
        return null;
    }
    function isIvyNgModule(clazz) {
        var e_5, _a;
        try {
            for (var _b = (0, tslib_1.__values)(clazz.members), _c = _b.next(); !_c.done; _c = _b.next()) {
                var member = _c.value;
                if (!ts.isPropertyDeclaration(member)) {
                    continue;
                }
                if (ts.isIdentifier(member.name) && member.name.text === 'ɵmod') {
                    return true;
                }
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_5) throw e_5.error; }
        }
        // No Ivy 'ɵmod' property found.
        return false;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3JhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL3Byb2dyYW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0E7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUF3VDtJQUN4VCx1QkFBeUI7SUFDekIsMkJBQTZCO0lBQzdCLCtCQUFpQztJQUVqQyxxR0FBMEU7SUFDMUUscUVBQXFFO0lBQ3JFLDhFQUFnRTtJQUNoRSxtRUFBOEM7SUFDOUMseUVBQTZEO0lBQzdELG1GQUF1RTtJQUV2RSxrRUFBbU87SUFDbk8sc0ZBQWdIO0lBQ2hILHdIQUFpRjtJQUNqRixvRUFBbUM7SUFDbkMsNEZBQTBHO0lBQzFHLDhGQUFrRztJQUNsRyx3RkFBb0U7SUFDcEUsd0dBQTJFO0lBQzNFLHNHQUF5RTtJQUN6RSxvRkFBaUU7SUFDakUsb0VBQWdKO0lBR2hKOzs7T0FHRztJQUNILElBQU0sbUNBQW1DLEdBQUcsRUFBRSxDQUFDO0lBRy9DOztPQUVHO0lBQ0gsSUFBTSxZQUFZLEdBQUcsQ0FBQyxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFFOUU7O09BRUc7SUFDSCxJQUFNLGVBQWUsaUZBQU8sWUFBWSxZQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsU0FBUyxTQUFDLENBQUM7SUFFN0U7O09BRUc7SUFDSCxJQUFJLHlCQUF5QixHQUF5QyxJQUFJLENBQUM7SUFDM0UsU0FBZ0IsNEJBQTRCLENBQUMsT0FBc0M7UUFDakYseUJBQXlCLEdBQUcsT0FBTyxDQUFDO0lBQ3RDLENBQUM7SUFGRCxvRUFFQztJQUNELFNBQWdCLDhCQUE4QjtRQUM1Qyx5QkFBeUIsR0FBRyxJQUFJLENBQUM7SUFDbkMsQ0FBQztJQUZELHdFQUVDO0lBRUQsSUFBTSxZQUFZLEdBQXNCO1FBQ3RDLFNBQVMsRUFB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M0QsU0FBUztpQkFDVjtnQkFFRCxPQUFPLElBQUksQ0FBQzthQUNiOzs7Ozs7Ozs7UUFFRCxnREFBZ0Q7UUFDaEQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsU0FBUyxhQUFhLENBQUMsS0FBMEI7OztZQUMvQyxLQUFxQixJQUFBLEtBQUEsc0JBQUEsS0FBSyxDQUFDLE9BQU8sQ0FBQSxnQkFBQSw0QkFBRTtnQkFBL0IsSUFBTSxNQUFNLFdBQUE7Z0JBQ2YsSUFBSSxDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsRUFBRTtvQkFDckMsU0FBUztpQkFDVjtnQkFDRCxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtvQkFDL0QsT0FBTyxJQUFJLENBQUM7aUJBQ2I7YUFDRjs7Ozs7Ozs7O1FBRUQsZ0NBQWdDO1FBQ2hDLE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIlxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QW90Q29tcGlsZXIsIEFvdENvbXBpbGVyT3B0aW9ucywgY29yZSwgY3JlYXRlQW90Q29tcGlsZXIsIEZvcm1hdHRlZE1lc3NhZ2VDaGFpbiwgR2VuZXJhdGVkRmlsZSwgZ2V0TWlzc2luZ05nTW9kdWxlTWV0YWRhdGFFcnJvckRhdGEsIGdldFBhcnNlRXJyb3JzLCBpc0Zvcm1hdHRlZEVycm9yLCBpc1N5bnRheEVycm9yLCBNZXNzYWdlQnVuZGxlLCBOZ0FuYWx5emVkRmlsZVdpdGhJbmplY3RhYmxlcywgTmdBbmFseXplZE1vZHVsZXMsIFBhcnNlU291cmNlU3BhbiwgUGFydGlhbE1vZHVsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge3RyYW5zbGF0ZURpYWdub3N0aWNzfSBmcm9tICcuLi9kaWFnbm9zdGljcy90cmFuc2xhdGVfZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtjcmVhdGVCdW5kbGVJbmRleEhvc3QsIE1ldGFkYXRhQ29sbGVjdG9yfSBmcm9tICcuLi9tZXRhZGF0YSc7XG5pbXBvcnQge2lzQW5ndWxhckNvcmVQYWNrYWdlfSBmcm9tICcuLi9uZ3RzYy9jb3JlL3NyYy9jb21waWxlcic7XG5pbXBvcnQge05ndHNjUHJvZ3JhbX0gZnJvbSAnLi4vbmd0c2MvcHJvZ3JhbSc7XG5pbXBvcnQge1R5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge3ZlcmlmeVN1cHBvcnRlZFR5cGVTY3JpcHRWZXJzaW9ufSBmcm9tICcuLi90eXBlc2NyaXB0X3N1cHBvcnQnO1xuXG5pbXBvcnQge0NvbXBpbGVySG9zdCwgQ29tcGlsZXJPcHRpb25zLCBDdXN0b21UcmFuc2Zvcm1lcnMsIERFRkFVTFRfRVJST1JfQ09ERSwgRGlhZ25vc3RpYywgRGlhZ25vc3RpY01lc3NhZ2VDaGFpbiwgRW1pdEZsYWdzLCBMYXp5Um91dGUsIExpYnJhcnlTdW1tYXJ5LCBQcm9ncmFtLCBTT1VSQ0UsIFRzRW1pdENhbGxiYWNrLCBUc01lcmdlRW1pdFJlc3VsdHNDYWxsYmFja30gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtDb2RlR2VuZXJhdG9yLCBnZXRPcmlnaW5hbFJlZmVyZW5jZXMsIFRzQ29tcGlsZXJBb3RDb21waWxlclR5cGVDaGVja0hvc3RBZGFwdGVyfSBmcm9tICcuL2NvbXBpbGVyX2hvc3QnO1xuaW1wb3J0IHtnZXREb3dubGV2ZWxEZWNvcmF0b3JzVHJhbnNmb3JtfSBmcm9tICcuL2Rvd25sZXZlbF9kZWNvcmF0b3JzX3RyYW5zZm9ybSc7XG5pbXBvcnQge2kxOG5FeHRyYWN0fSBmcm9tICcuL2kxOG4nO1xuaW1wb3J0IHtnZXRJbmxpbmVSZXNvdXJjZXNUcmFuc2Zvcm1GYWN0b3J5LCBJbmxpbmVSZXNvdXJjZXNNZXRhZGF0YVRyYW5zZm9ybWVyfSBmcm9tICcuL2lubGluZV9yZXNvdXJjZXMnO1xuaW1wb3J0IHtnZXRFeHByZXNzaW9uTG93ZXJpbmdUcmFuc2Zvcm1GYWN0b3J5LCBMb3dlck1ldGFkYXRhVHJhbnNmb3JtfSBmcm9tICcuL2xvd2VyX2V4cHJlc3Npb25zJztcbmltcG9ydCB7TWV0YWRhdGFDYWNoZSwgTWV0YWRhdGFUcmFuc2Zvcm1lcn0gZnJvbSAnLi9tZXRhZGF0YV9jYWNoZSc7XG5pbXBvcnQge2dldEFuZ3VsYXJFbWl0dGVyVHJhbnNmb3JtRmFjdG9yeX0gZnJvbSAnLi9ub2RlX2VtaXR0ZXJfdHJhbnNmb3JtJztcbmltcG9ydCB7UGFydGlhbE1vZHVsZU1ldGFkYXRhVHJhbnNmb3JtZXJ9IGZyb20gJy4vcjNfbWV0YWRhdGFfdHJhbnNmb3JtJztcbmltcG9ydCB7Z2V0QW5ndWxhckNsYXNzVHJhbnNmb3JtZXJGYWN0b3J5fSBmcm9tICcuL3IzX3RyYW5zZm9ybSc7XG5pbXBvcnQge2NyZWF0ZU1lc3NhZ2VEaWFnbm9zdGljLCBEVFMsIEdFTkVSQVRFRF9GSUxFUywgaXNJblJvb3REaXIsIG5nVG9Uc0RpYWdub3N0aWMsIFN0cnVjdHVyZUlzUmV1c2VkLCBUUywgdHNTdHJ1Y3R1cmVJc1JldXNlZH0gZnJvbSAnLi91dGlsJztcblxuXG4vKipcbiAqIE1heGltdW0gbnVtYmVyIG9mIGZpbGVzIHRoYXQgYXJlIGVtaXRhYmxlIHZpYSBjYWxsaW5nIHRzLlByb2dyYW0uZW1pdFxuICogcGFzc2luZyBpbmRpdmlkdWFsIHRhcmdldFNvdXJjZUZpbGVzLlxuICovXG5jb25zdCBNQVhfRklMRV9DT1VOVF9GT1JfU0lOR0xFX0ZJTEVfRU1JVCA9IDIwO1xuXG5cbi8qKlxuICogRmllbGRzIHRvIGxvd2VyIHdpdGhpbiBtZXRhZGF0YSBpbiByZW5kZXIyIG1vZGUuXG4gKi9cbmNvbnN0IExPV0VSX0ZJRUxEUyA9IFsndXNlVmFsdWUnLCAndXNlRmFjdG9yeScsICdkYXRhJywgJ2lkJywgJ2xvYWRDaGlsZHJlbiddO1xuXG4vKipcbiAqIEZpZWxkcyB0byBsb3dlciB3aXRoaW4gbWV0YWRhdGEgaW4gcmVuZGVyMyBtb2RlLlxuICovXG5jb25zdCBSM19MT1dFUl9GSUVMRFMgPSBbLi4uTE9XRVJfRklFTERTLCAncHJvdmlkZXJzJywgJ2ltcG9ydHMnLCAnZXhwb3J0cyddO1xuXG4vKipcbiAqIEluc3RhbGxzIGEgaGFuZGxlciBmb3IgdGVzdGluZyBwdXJwb3NlcyB0byBhbGxvdyBpbnNwZWN0aW9uIG9mIHRoZSB0ZW1wb3JhcnkgcHJvZ3JhbS5cbiAqL1xubGV0IHRlbXBQcm9ncmFtSGFuZGxlckZvclRlc3Q6ICgocHJvZ3JhbTogdHMuUHJvZ3JhbSkgPT4gdm9pZCl8bnVsbCA9IG51bGw7XG5leHBvcnQgZnVuY3Rpb24gc2V0VGVtcFByb2dyYW1IYW5kbGVyRm9yVGVzdChoYW5kbGVyOiAocHJvZ3JhbTogdHMuUHJvZ3JhbSkgPT4gdm9pZCk6IHZvaWQge1xuICB0ZW1wUHJvZ3JhbUhhbmRsZXJGb3JUZXN0ID0gaGFuZGxlcjtcbn1cbmV4cG9ydCBmdW5jdGlvbiByZXNldFRlbXBQcm9ncmFtSGFuZGxlckZvclRlc3QoKTogdm9pZCB7XG4gIHRlbXBQcm9ncmFtSGFuZGxlckZvclRlc3QgPSBudWxsO1xufVxuXG5jb25zdCBlbXB0eU1vZHVsZXM6IE5nQW5hbHl6ZWRNb2R1bGVzID0ge1xuICBuZ01vZHVsZXM6IFtdLFxuICBuZ01vZHVsZUJ5UGlwZU9yRGlyZWN0aXZlOiBuZXcgTWFwKCksXG4gIGZpbGVzOiBbXVxufTtcblxuY29uc3QgZGVmYXVsdEVtaXRDYWxsYmFjazogVHNFbWl0Q2FsbGJhY2sgPSAoe1xuICBwcm9ncmFtLFxuICB0YXJnZXRTb3VyY2VGaWxlLFxuICB3cml0ZUZpbGUsXG4gIGNhbmNlbGxhdGlvblRva2VuLFxuICBlbWl0T25seUR0c0ZpbGVzLFxuICBjdXN0b21UcmFuc2Zvcm1lcnNcbn0pID0+XG4gICAgcHJvZ3JhbS5lbWl0KFxuICAgICAgICB0YXJnZXRTb3VyY2VGaWxlLCB3cml0ZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuLCBlbWl0T25seUR0c0ZpbGVzLCBjdXN0b21UcmFuc2Zvcm1lcnMpO1xuXG5jbGFzcyBBbmd1bGFyQ29tcGlsZXJQcm9ncmFtIGltcGxlbWVudHMgUHJvZ3JhbSB7XG4gIHByaXZhdGUgcm9vdE5hbWVzOiBzdHJpbmdbXTtcbiAgcHJpdmF0ZSBtZXRhZGF0YUNhY2hlOiBNZXRhZGF0YUNhY2hlO1xuICAvLyBNZXRhZGF0YSBjYWNoZSB1c2VkIGV4Y2x1c2l2ZWx5IGZvciB0aGUgZmxhdCBtb2R1bGUgaW5kZXhcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgZmxhdE1vZHVsZU1ldGFkYXRhQ2FjaGUhOiBNZXRhZGF0YUNhY2hlO1xuICBwcml2YXRlIGxvd2VyaW5nTWV0YWRhdGFUcmFuc2Zvcm06IExvd2VyTWV0YWRhdGFUcmFuc2Zvcm07XG4gIHByaXZhdGUgb2xkUHJvZ3JhbUxpYnJhcnlTdW1tYXJpZXM6IE1hcDxzdHJpbmcsIExpYnJhcnlTdW1tYXJ5Pnx1bmRlZmluZWQ7XG4gIHByaXZhdGUgb2xkUHJvZ3JhbUVtaXR0ZWRHZW5lcmF0ZWRGaWxlczogTWFwPHN0cmluZywgR2VuZXJhdGVkRmlsZT58dW5kZWZpbmVkO1xuICBwcml2YXRlIG9sZFByb2dyYW1FbWl0dGVkU291cmNlRmlsZXM6IE1hcDxzdHJpbmcsIHRzLlNvdXJjZUZpbGU+fHVuZGVmaW5lZDtcbiAgLy8gTm90ZTogVGhpcyB3aWxsIGJlIGNsZWFyZWQgb3V0IGFzIHNvb24gYXMgd2UgY3JlYXRlIHRoZSBfdHNQcm9ncmFtXG4gIHByaXZhdGUgb2xkVHNQcm9ncmFtOiB0cy5Qcm9ncmFtfHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBlbWl0dGVkTGlicmFyeVN1bW1hcmllczogTGlicmFyeVN1bW1hcnlbXXx1bmRlZmluZWQ7XG4gIHByaXZhdGUgZW1pdHRlZEdlbmVyYXRlZEZpbGVzOiBHZW5lcmF0ZWRGaWxlW118dW5kZWZpbmVkO1xuICBwcml2YXRlIGVtaXR0ZWRTb3VyY2VGaWxlczogdHMuU291cmNlRmlsZVtdfHVuZGVmaW5lZDtcblxuICAvLyBMYXppbHkgaW5pdGlhbGl6ZWQgZmllbGRzXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwcml2YXRlIF9jb21waWxlciE6IEFvdENvbXBpbGVyO1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgcHJpdmF0ZSBfaG9zdEFkYXB0ZXIhOiBUc0NvbXBpbGVyQW90Q29tcGlsZXJUeXBlQ2hlY2tIb3N0QWRhcHRlcjtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgX3RzUHJvZ3JhbSE6IHRzLlByb2dyYW07XG4gIHByaXZhdGUgX2FuYWx5emVkTW9kdWxlczogTmdBbmFseXplZE1vZHVsZXN8dW5kZWZpbmVkO1xuICBwcml2YXRlIF9hbmFseXplZEluamVjdGFibGVzOiBOZ0FuYWx5emVkRmlsZVdpdGhJbmplY3RhYmxlc1tdfHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfc3RydWN0dXJhbERpYWdub3N0aWNzOiBEaWFnbm9zdGljW118dW5kZWZpbmVkO1xuICBwcml2YXRlIF9wcm9ncmFtV2l0aFN0dWJzOiB0cy5Qcm9ncmFtfHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfb3B0aW9uc0RpYWdub3N0aWNzOiBEaWFnbm9zdGljW10gPSBbXTtcbiAgcHJpdmF0ZSBfdHJhbnNmb3JtVHNEaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICByb290TmFtZXM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPiwgcHJpdmF0ZSBvcHRpb25zOiBDb21waWxlck9wdGlvbnMsXG4gICAgICBwcml2YXRlIGhvc3Q6IENvbXBpbGVySG9zdCwgb2xkUHJvZ3JhbT86IFByb2dyYW0pIHtcbiAgICB0aGlzLnJvb3ROYW1lcyA9IFsuLi5yb290TmFtZXNdO1xuXG4gICAgaWYgKCFvcHRpb25zLmRpc2FibGVUeXBlU2NyaXB0VmVyc2lvbkNoZWNrKSB7XG4gICAgICB2ZXJpZnlTdXBwb3J0ZWRUeXBlU2NyaXB0VmVyc2lvbigpO1xuICAgIH1cblxuICAgIHRoaXMub2xkVHNQcm9ncmFtID0gb2xkUHJvZ3JhbSA/IG9sZFByb2dyYW0uZ2V0VHNQcm9ncmFtKCkgOiB1bmRlZmluZWQ7XG4gICAgaWYgKG9sZFByb2dyYW0pIHtcbiAgICAgIHRoaXMub2xkUHJvZ3JhbUxpYnJhcnlTdW1tYXJpZXMgPSBvbGRQcm9ncmFtLmdldExpYnJhcnlTdW1tYXJpZXMoKTtcbiAgICAgIHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRHZW5lcmF0ZWRGaWxlcyA9IG9sZFByb2dyYW0uZ2V0RW1pdHRlZEdlbmVyYXRlZEZpbGVzKCk7XG4gICAgICB0aGlzLm9sZFByb2dyYW1FbWl0dGVkU291cmNlRmlsZXMgPSBvbGRQcm9ncmFtLmdldEVtaXR0ZWRTb3VyY2VGaWxlcygpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmZsYXRNb2R1bGVPdXRGaWxlKSB7XG4gICAgICBjb25zdCB7aG9zdDogYnVuZGxlSG9zdCwgaW5kZXhOYW1lLCBlcnJvcnN9ID1cbiAgICAgICAgICBjcmVhdGVCdW5kbGVJbmRleEhvc3Qob3B0aW9ucywgdGhpcy5yb290TmFtZXMsIGhvc3QsICgpID0+IHRoaXMuZmxhdE1vZHVsZU1ldGFkYXRhQ2FjaGUpO1xuICAgICAgaWYgKGVycm9ycykge1xuICAgICAgICB0aGlzLl9vcHRpb25zRGlhZ25vc3RpY3MucHVzaCguLi5lcnJvcnMubWFwKGUgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBlLmNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZVRleHQ6IGUubWVzc2FnZVRleHQgYXMgc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiBTT1VSQ0UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBERUZBVUxUX0VSUk9SX0NPREVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5yb290TmFtZXMucHVzaChpbmRleE5hbWUhKTtcbiAgICAgICAgdGhpcy5ob3N0ID0gYnVuZGxlSG9zdDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmxvd2VyaW5nTWV0YWRhdGFUcmFuc2Zvcm0gPVxuICAgICAgICBuZXcgTG93ZXJNZXRhZGF0YVRyYW5zZm9ybShvcHRpb25zLmVuYWJsZUl2eSAhPT0gZmFsc2UgPyBSM19MT1dFUl9GSUVMRFMgOiBMT1dFUl9GSUVMRFMpO1xuICAgIHRoaXMubWV0YWRhdGFDYWNoZSA9IHRoaXMuY3JlYXRlTWV0YWRhdGFDYWNoZShbdGhpcy5sb3dlcmluZ01ldGFkYXRhVHJhbnNmb3JtXSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZU1ldGFkYXRhQ2FjaGUodHJhbnNmb3JtZXJzOiBNZXRhZGF0YVRyYW5zZm9ybWVyW10pIHtcbiAgICByZXR1cm4gbmV3IE1ldGFkYXRhQ2FjaGUoXG4gICAgICAgIG5ldyBNZXRhZGF0YUNvbGxlY3Rvcih7cXVvdGVkTmFtZXM6IHRydWV9KSwgISF0aGlzLm9wdGlvbnMuc3RyaWN0TWV0YWRhdGFFbWl0LFxuICAgICAgICB0cmFuc2Zvcm1lcnMpO1xuICB9XG5cbiAgZ2V0TGlicmFyeVN1bW1hcmllcygpOiBNYXA8c3RyaW5nLCBMaWJyYXJ5U3VtbWFyeT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBNYXA8c3RyaW5nLCBMaWJyYXJ5U3VtbWFyeT4oKTtcbiAgICBpZiAodGhpcy5vbGRQcm9ncmFtTGlicmFyeVN1bW1hcmllcykge1xuICAgICAgdGhpcy5vbGRQcm9ncmFtTGlicmFyeVN1bW1hcmllcy5mb3JFYWNoKChzdW1tYXJ5LCBmaWxlTmFtZSkgPT4gcmVzdWx0LnNldChmaWxlTmFtZSwgc3VtbWFyeSkpO1xuICAgIH1cbiAgICBpZiAodGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcykge1xuICAgICAgdGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcy5mb3JFYWNoKFxuICAgICAgICAgIChzdW1tYXJ5LCBmaWxlTmFtZSkgPT4gcmVzdWx0LnNldChzdW1tYXJ5LmZpbGVOYW1lLCBzdW1tYXJ5KSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnZXRFbWl0dGVkR2VuZXJhdGVkRmlsZXMoKTogTWFwPHN0cmluZywgR2VuZXJhdGVkRmlsZT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBNYXA8c3RyaW5nLCBHZW5lcmF0ZWRGaWxlPigpO1xuICAgIGlmICh0aGlzLm9sZFByb2dyYW1FbWl0dGVkR2VuZXJhdGVkRmlsZXMpIHtcbiAgICAgIHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRHZW5lcmF0ZWRGaWxlcy5mb3JFYWNoKFxuICAgICAgICAgIChnZW5GaWxlLCBmaWxlTmFtZSkgPT4gcmVzdWx0LnNldChmaWxlTmFtZSwgZ2VuRmlsZSkpO1xuICAgIH1cbiAgICBpZiAodGhpcy5lbWl0dGVkR2VuZXJhdGVkRmlsZXMpIHtcbiAgICAgIHRoaXMuZW1pdHRlZEdlbmVyYXRlZEZpbGVzLmZvckVhY2goKGdlbkZpbGUpID0+IHJlc3VsdC5zZXQoZ2VuRmlsZS5nZW5GaWxlVXJsLCBnZW5GaWxlKSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnZXRFbWl0dGVkU291cmNlRmlsZXMoKTogTWFwPHN0cmluZywgdHMuU291cmNlRmlsZT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VGaWxlPigpO1xuICAgIGlmICh0aGlzLm9sZFByb2dyYW1FbWl0dGVkU291cmNlRmlsZXMpIHtcbiAgICAgIHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRTb3VyY2VGaWxlcy5mb3JFYWNoKChzZiwgZmlsZU5hbWUpID0+IHJlc3VsdC5zZXQoZmlsZU5hbWUsIHNmKSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmVtaXR0ZWRTb3VyY2VGaWxlcykge1xuICAgICAgdGhpcy5lbWl0dGVkU291cmNlRmlsZXMuZm9yRWFjaCgoc2YpID0+IHJlc3VsdC5zZXQoc2YuZmlsZU5hbWUsIHNmKSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnZXRUc1Byb2dyYW0oKTogdHMuUHJvZ3JhbSB7XG4gICAgcmV0dXJuIHRoaXMudHNQcm9ncmFtO1xuICB9XG5cbiAgZ2V0VHNPcHRpb25EaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuKSB7XG4gICAgcmV0dXJuIHRoaXMudHNQcm9ncmFtLmdldE9wdGlvbnNEaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbik7XG4gIH1cblxuICBnZXROZ09wdGlvbkRpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOiBSZWFkb25seUFycmF5PERpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gWy4uLnRoaXMuX29wdGlvbnNEaWFnbm9zdGljcywgLi4uZ2V0TmdPcHRpb25EaWFnbm9zdGljcyh0aGlzLm9wdGlvbnMpXTtcbiAgfVxuXG4gIGdldFRzU3ludGFjdGljRGlhZ25vc3RpY3Moc291cmNlRmlsZT86IHRzLlNvdXJjZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOlxuICAgICAgUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgcmV0dXJuIHRoaXMudHNQcm9ncmFtLmdldFN5bnRhY3RpY0RpYWdub3N0aWNzKHNvdXJjZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuKTtcbiAgfVxuXG4gIGdldE5nU3RydWN0dXJhbERpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOiBSZWFkb25seUFycmF5PERpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gdGhpcy5zdHJ1Y3R1cmFsRGlhZ25vc3RpY3M7XG4gIH1cblxuICBnZXRUc1NlbWFudGljRGlhZ25vc3RpY3Moc291cmNlRmlsZT86IHRzLlNvdXJjZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOlxuICAgICAgUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgY29uc3Qgc291cmNlRmlsZXMgPSBzb3VyY2VGaWxlID8gW3NvdXJjZUZpbGVdIDogdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKTtcbiAgICBsZXQgZGlhZ3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIHNvdXJjZUZpbGVzLmZvckVhY2goc2YgPT4ge1xuICAgICAgaWYgKCFHRU5FUkFURURfRklMRVMudGVzdChzZi5maWxlTmFtZSkpIHtcbiAgICAgICAgZGlhZ3MucHVzaCguLi50aGlzLnRzUHJvZ3JhbS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKHNmLCBjYW5jZWxsYXRpb25Ub2tlbikpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBkaWFncztcbiAgfVxuXG4gIGdldE5nU2VtYW50aWNEaWFnbm9zdGljcyhmaWxlTmFtZT86IHN0cmluZywgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbik6XG4gICAgICBSZWFkb25seUFycmF5PERpYWdub3N0aWM+IHtcbiAgICBsZXQgZGlhZ3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZm9yRWFjaChzZiA9PiB7XG4gICAgICBpZiAoR0VORVJBVEVEX0ZJTEVTLnRlc3Qoc2YuZmlsZU5hbWUpICYmICFzZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICBkaWFncy5wdXNoKC4uLnRoaXMudHNQcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3Moc2YsIGNhbmNlbGxhdGlvblRva2VuKSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgY29uc3Qge25nfSA9IHRyYW5zbGF0ZURpYWdub3N0aWNzKHRoaXMuaG9zdEFkYXB0ZXIsIGRpYWdzKTtcbiAgICByZXR1cm4gbmc7XG4gIH1cblxuICBsb2FkTmdTdHJ1Y3R1cmVBc3luYygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5fYW5hbHl6ZWRNb2R1bGVzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FuZ3VsYXIgc3RydWN0dXJlIGFscmVhZHkgbG9hZGVkJyk7XG4gICAgfVxuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgY29uc3Qge3RtcFByb2dyYW0sIHNvdXJjZUZpbGVzLCB0c0ZpbGVzLCByb290TmFtZXN9ID0gdGhpcy5fY3JlYXRlUHJvZ3JhbVdpdGhCYXNpY1N0dWJzKCk7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuY29tcGlsZXIubG9hZEZpbGVzQXN5bmMoc291cmNlRmlsZXMsIHRzRmlsZXMpXG4gICAgICAgICAgICAgIC50aGVuKCh7YW5hbHl6ZWRNb2R1bGVzLCBhbmFseXplZEluamVjdGFibGVzfSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9hbmFseXplZE1vZHVsZXMpIHtcbiAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQW5ndWxhciBzdHJ1Y3R1cmUgbG9hZGVkIGJvdGggc3luY2hyb25vdXNseSBhbmQgYXN5bmNocm9ub3VzbHknKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5fdXBkYXRlUHJvZ3JhbVdpdGhUeXBlQ2hlY2tTdHVicyhcbiAgICAgICAgICAgICAgICAgICAgdG1wUHJvZ3JhbSwgYW5hbHl6ZWRNb2R1bGVzLCBhbmFseXplZEluamVjdGFibGVzLCByb290TmFtZXMpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGUgPT4gdGhpcy5fY3JlYXRlUHJvZ3JhbU9uRXJyb3IoZSkpO1xuICB9XG5cbiAgbGlzdExhenlSb3V0ZXMocm91dGU/OiBzdHJpbmcpOiBMYXp5Um91dGVbXSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgZW1pdChwYXJhbWV0ZXJzOiB7XG4gICAgZW1pdEZsYWdzPzogRW1pdEZsYWdzLFxuICAgIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4sXG4gICAgY3VzdG9tVHJhbnNmb3JtZXJzPzogQ3VzdG9tVHJhbnNmb3JtZXJzLFxuICAgIGVtaXRDYWxsYmFjaz86IFRzRW1pdENhbGxiYWNrLFxuICAgIG1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjaz86IFRzTWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrLFxuICB9ID0ge30pOiB0cy5FbWl0UmVzdWx0IHtcbiAgICBpZiAodGhpcy5vcHRpb25zLmVuYWJsZUl2eSAhPT0gZmFsc2UpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IHJ1biBsZWdhY3kgY29tcGlsZXIgaW4gbmd0c2MgbW9kZScpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fZW1pdFJlbmRlcjIocGFyYW1ldGVycyk7XG4gIH1cblxuICBwcml2YXRlIF9lbWl0UmVuZGVyMih7XG4gICAgZW1pdEZsYWdzID0gRW1pdEZsYWdzLkRlZmF1bHQsXG4gICAgY2FuY2VsbGF0aW9uVG9rZW4sXG4gICAgY3VzdG9tVHJhbnNmb3JtZXJzLFxuICAgIGVtaXRDYWxsYmFjayA9IGRlZmF1bHRFbWl0Q2FsbGJhY2ssXG4gICAgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrID0gbWVyZ2VFbWl0UmVzdWx0cyxcbiAgfToge1xuICAgIGVtaXRGbGFncz86IEVtaXRGbGFncyxcbiAgICBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuLFxuICAgIGN1c3RvbVRyYW5zZm9ybWVycz86IEN1c3RvbVRyYW5zZm9ybWVycyxcbiAgICBlbWl0Q2FsbGJhY2s/OiBUc0VtaXRDYWxsYmFjayxcbiAgICBtZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2s/OiBUc01lcmdlRW1pdFJlc3VsdHNDYWxsYmFjayxcbiAgfSA9IHt9KTogdHMuRW1pdFJlc3VsdCB7XG4gICAgY29uc3QgZW1pdFN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICBpZiAoZW1pdEZsYWdzICYgRW1pdEZsYWdzLkkxOG5CdW5kbGUpIHtcbiAgICAgIGNvbnN0IGxvY2FsZSA9IHRoaXMub3B0aW9ucy5pMThuT3V0TG9jYWxlIHx8IG51bGw7XG4gICAgICBjb25zdCBmaWxlID0gdGhpcy5vcHRpb25zLmkxOG5PdXRGaWxlIHx8IG51bGw7XG4gICAgICBjb25zdCBmb3JtYXQgPSB0aGlzLm9wdGlvbnMuaTE4bk91dEZvcm1hdCB8fCBudWxsO1xuICAgICAgY29uc3QgYnVuZGxlID0gdGhpcy5jb21waWxlci5lbWl0TWVzc2FnZUJ1bmRsZSh0aGlzLmFuYWx5emVkTW9kdWxlcywgbG9jYWxlKTtcbiAgICAgIGkxOG5FeHRyYWN0KGZvcm1hdCwgZmlsZSwgdGhpcy5ob3N0LCB0aGlzLm9wdGlvbnMsIGJ1bmRsZSk7XG4gICAgfVxuICAgIGlmICgoZW1pdEZsYWdzICYgKEVtaXRGbGFncy5KUyB8IEVtaXRGbGFncy5EVFMgfCBFbWl0RmxhZ3MuTWV0YWRhdGEgfCBFbWl0RmxhZ3MuQ29kZWdlbikpID09PVxuICAgICAgICAwKSB7XG4gICAgICByZXR1cm4ge2VtaXRTa2lwcGVkOiB0cnVlLCBkaWFnbm9zdGljczogW10sIGVtaXR0ZWRGaWxlczogW119O1xuICAgIH1cbiAgICBsZXQge2dlbkZpbGVzLCBnZW5EaWFnc30gPSB0aGlzLmdlbmVyYXRlRmlsZXNGb3JFbWl0KGVtaXRGbGFncyk7XG4gICAgaWYgKGdlbkRpYWdzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZGlhZ25vc3RpY3M6IGdlbkRpYWdzLFxuICAgICAgICBlbWl0U2tpcHBlZDogdHJ1ZSxcbiAgICAgICAgZW1pdHRlZEZpbGVzOiBbXSxcbiAgICAgIH07XG4gICAgfVxuICAgIHRoaXMuZW1pdHRlZEdlbmVyYXRlZEZpbGVzID0gZ2VuRmlsZXM7XG4gICAgY29uc3Qgb3V0U3JjTWFwcGluZzogQXJyYXk8e3NvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIG91dEZpbGVOYW1lOiBzdHJpbmd9PiA9IFtdO1xuICAgIGNvbnN0IGdlbkZpbGVCeUZpbGVOYW1lID0gbmV3IE1hcDxzdHJpbmcsIEdlbmVyYXRlZEZpbGU+KCk7XG4gICAgZ2VuRmlsZXMuZm9yRWFjaChnZW5GaWxlID0+IGdlbkZpbGVCeUZpbGVOYW1lLnNldChnZW5GaWxlLmdlbkZpbGVVcmwsIGdlbkZpbGUpKTtcbiAgICB0aGlzLmVtaXR0ZWRMaWJyYXJ5U3VtbWFyaWVzID0gW107XG4gICAgdGhpcy5fdHJhbnNmb3JtVHNEaWFnbm9zdGljcyA9IFtdO1xuICAgIGNvbnN0IGVtaXR0ZWRTb3VyY2VGaWxlcyA9IFtdIGFzIHRzLlNvdXJjZUZpbGVbXTtcbiAgICBjb25zdCB3cml0ZVRzRmlsZTogdHMuV3JpdGVGaWxlQ2FsbGJhY2sgPVxuICAgICAgICAob3V0RmlsZU5hbWUsIG91dERhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvcj8sIHNvdXJjZUZpbGVzPykgPT4ge1xuICAgICAgICAgIGNvbnN0IHNvdXJjZUZpbGUgPSBzb3VyY2VGaWxlcyAmJiBzb3VyY2VGaWxlcy5sZW5ndGggPT0gMSA/IHNvdXJjZUZpbGVzWzBdIDogbnVsbDtcbiAgICAgICAgICBsZXQgZ2VuRmlsZTogR2VuZXJhdGVkRmlsZXx1bmRlZmluZWQ7XG4gICAgICAgICAgaWYgKHNvdXJjZUZpbGUpIHtcbiAgICAgICAgICAgIG91dFNyY01hcHBpbmcucHVzaCh7b3V0RmlsZU5hbWU6IG91dEZpbGVOYW1lLCBzb3VyY2VGaWxlfSk7XG4gICAgICAgICAgICBnZW5GaWxlID0gZ2VuRmlsZUJ5RmlsZU5hbWUuZ2V0KHNvdXJjZUZpbGUuZmlsZU5hbWUpO1xuICAgICAgICAgICAgaWYgKCFzb3VyY2VGaWxlLmlzRGVjbGFyYXRpb25GaWxlICYmICFHRU5FUkFURURfRklMRVMudGVzdChzb3VyY2VGaWxlLmZpbGVOYW1lKSkge1xuICAgICAgICAgICAgICAvLyBOb3RlOiBzb3VyY2VGaWxlIGlzIHRoZSB0cmFuc2Zvcm1lZCBzb3VyY2VmaWxlLCBub3QgdGhlIG9yaWdpbmFsIG9uZSFcbiAgICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxGaWxlID0gdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZShzb3VyY2VGaWxlLmZpbGVOYW1lKTtcbiAgICAgICAgICAgICAgaWYgKG9yaWdpbmFsRmlsZSkge1xuICAgICAgICAgICAgICAgIGVtaXR0ZWRTb3VyY2VGaWxlcy5wdXNoKG9yaWdpbmFsRmlsZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy53cml0ZUZpbGUob3V0RmlsZU5hbWUsIG91dERhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvciwgZ2VuRmlsZSwgc291cmNlRmlsZXMpO1xuICAgICAgICB9O1xuXG4gICAgY29uc3QgbW9kdWxlcyA9IHRoaXMuX2FuYWx5emVkSW5qZWN0YWJsZXMgJiZcbiAgICAgICAgdGhpcy5jb21waWxlci5lbWl0QWxsUGFydGlhbE1vZHVsZXMyKHRoaXMuX2FuYWx5emVkSW5qZWN0YWJsZXMpO1xuXG4gICAgY29uc3QgdHNDdXN0b21UcmFuc2Zvcm1lcnMgPVxuICAgICAgICB0aGlzLmNhbGN1bGF0ZVRyYW5zZm9ybXMoZ2VuRmlsZUJ5RmlsZU5hbWUsIG1vZHVsZXMsIGN1c3RvbVRyYW5zZm9ybWVycyk7XG4gICAgY29uc3QgZW1pdE9ubHlEdHNGaWxlcyA9IChlbWl0RmxhZ3MgJiAoRW1pdEZsYWdzLkRUUyB8IEVtaXRGbGFncy5KUykpID09IEVtaXRGbGFncy5EVFM7XG4gICAgLy8gUmVzdG9yZSB0aGUgb3JpZ2luYWwgcmVmZXJlbmNlcyBiZWZvcmUgd2UgZW1pdCBzbyBUeXBlU2NyaXB0IGRvZXNuJ3QgZW1pdFxuICAgIC8vIGEgcmVmZXJlbmNlIHRvIHRoZSAuZC50cyBmaWxlLlxuICAgIGNvbnN0IGF1Z21lbnRlZFJlZmVyZW5jZXMgPSBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIFJlYWRvbmx5QXJyYXk8dHMuRmlsZVJlZmVyZW5jZT4+KCk7XG4gICAgZm9yIChjb25zdCBzb3VyY2VGaWxlIG9mIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGNvbnN0IG9yaWdpbmFsUmVmZXJlbmNlcyA9IGdldE9yaWdpbmFsUmVmZXJlbmNlcyhzb3VyY2VGaWxlKTtcbiAgICAgIGlmIChvcmlnaW5hbFJlZmVyZW5jZXMpIHtcbiAgICAgICAgYXVnbWVudGVkUmVmZXJlbmNlcy5zZXQoc291cmNlRmlsZSwgc291cmNlRmlsZS5yZWZlcmVuY2VkRmlsZXMpO1xuICAgICAgICBzb3VyY2VGaWxlLnJlZmVyZW5jZWRGaWxlcyA9IG9yaWdpbmFsUmVmZXJlbmNlcztcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgZ2VuVHNGaWxlczogR2VuZXJhdGVkRmlsZVtdID0gW107XG4gICAgY29uc3QgZ2VuSnNvbkZpbGVzOiBHZW5lcmF0ZWRGaWxlW10gPSBbXTtcbiAgICBnZW5GaWxlcy5mb3JFYWNoKGdmID0+IHtcbiAgICAgIGlmIChnZi5zdG10cykge1xuICAgICAgICBnZW5Uc0ZpbGVzLnB1c2goZ2YpO1xuICAgICAgfVxuICAgICAgaWYgKGdmLnNvdXJjZSkge1xuICAgICAgICBnZW5Kc29uRmlsZXMucHVzaChnZik7XG4gICAgICB9XG4gICAgfSk7XG4gICAgbGV0IGVtaXRSZXN1bHQ6IHRzLkVtaXRSZXN1bHQ7XG4gICAgbGV0IGVtaXR0ZWRVc2VyVHNDb3VudDogbnVtYmVyO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzb3VyY2VGaWxlc1RvRW1pdCA9IHRoaXMuZ2V0U291cmNlRmlsZXNGb3JFbWl0KCk7XG4gICAgICBpZiAoc291cmNlRmlsZXNUb0VtaXQgJiZcbiAgICAgICAgICAoc291cmNlRmlsZXNUb0VtaXQubGVuZ3RoICsgZ2VuVHNGaWxlcy5sZW5ndGgpIDwgTUFYX0ZJTEVfQ09VTlRfRk9SX1NJTkdMRV9GSUxFX0VNSVQpIHtcbiAgICAgICAgY29uc3QgZmlsZU5hbWVzVG9FbWl0ID1cbiAgICAgICAgICAgIFsuLi5zb3VyY2VGaWxlc1RvRW1pdC5tYXAoc2YgPT4gc2YuZmlsZU5hbWUpLCAuLi5nZW5Uc0ZpbGVzLm1hcChnZiA9PiBnZi5nZW5GaWxlVXJsKV07XG4gICAgICAgIGVtaXRSZXN1bHQgPSBtZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2soXG4gICAgICAgICAgICBmaWxlTmFtZXNUb0VtaXQubWFwKChmaWxlTmFtZSkgPT4gZW1pdFJlc3VsdCA9IGVtaXRDYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3JhbTogdGhpcy50c1Byb2dyYW0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaG9zdDogdGhpcy5ob3N0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cml0ZUZpbGU6IHdyaXRlVHNGaWxlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVtaXRPbmx5RHRzRmlsZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tVHJhbnNmb3JtZXJzOiB0c0N1c3RvbVRyYW5zZm9ybWVycyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRTb3VyY2VGaWxlOiB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpKTtcbiAgICAgICAgZW1pdHRlZFVzZXJUc0NvdW50ID0gc291cmNlRmlsZXNUb0VtaXQubGVuZ3RoO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZW1pdFJlc3VsdCA9IGVtaXRDYWxsYmFjayh7XG4gICAgICAgICAgcHJvZ3JhbTogdGhpcy50c1Byb2dyYW0sXG4gICAgICAgICAgaG9zdDogdGhpcy5ob3N0LFxuICAgICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgICB3cml0ZUZpbGU6IHdyaXRlVHNGaWxlLFxuICAgICAgICAgIGVtaXRPbmx5RHRzRmlsZXMsXG4gICAgICAgICAgY3VzdG9tVHJhbnNmb3JtZXJzOiB0c0N1c3RvbVRyYW5zZm9ybWVyc1xuICAgICAgICB9KTtcbiAgICAgICAgZW1pdHRlZFVzZXJUc0NvdW50ID0gdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5sZW5ndGggLSBnZW5Uc0ZpbGVzLmxlbmd0aDtcbiAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgLy8gUmVzdG9yZSB0aGUgcmVmZXJlbmNlcyBiYWNrIHRvIHRoZSBhdWdtZW50ZWQgdmFsdWUgdG8gZW5zdXJlIHRoYXQgdGhlXG4gICAgICAvLyBjaGVja3MgdGhhdCBUeXBlU2NyaXB0IG1ha2VzIGZvciBwcm9qZWN0IHN0cnVjdHVyZSByZXVzZSB3aWxsIHN1Y2NlZWQuXG4gICAgICBmb3IgKGNvbnN0IFtzb3VyY2VGaWxlLCByZWZlcmVuY2VzXSBvZiBBcnJheS5mcm9tKGF1Z21lbnRlZFJlZmVyZW5jZXMpKSB7XG4gICAgICAgIC8vIFRPRE8oY2h1Y2tqKTogUmVtb3ZlIGFueSBjYXN0IGFmdGVyIHVwZGF0aW5nIGJ1aWxkIHRvIDIuNlxuICAgICAgICAoc291cmNlRmlsZSBhcyBhbnkpLnJlZmVyZW5jZWRGaWxlcyA9IHJlZmVyZW5jZXM7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuZW1pdHRlZFNvdXJjZUZpbGVzID0gZW1pdHRlZFNvdXJjZUZpbGVzO1xuXG4gICAgLy8gTWF0Y2ggYmVoYXZpb3Igb2YgdHNjOiBvbmx5IHByb2R1Y2UgZW1pdCBkaWFnbm9zdGljcyBpZiBpdCB3b3VsZCBibG9ja1xuICAgIC8vIGVtaXQuIElmIG5vRW1pdE9uRXJyb3IgaXMgZmFsc2UsIHRoZSBlbWl0IHdpbGwgaGFwcGVuIGluIHNwaXRlIG9mIGFueVxuICAgIC8vIGVycm9ycywgc28gd2Ugc2hvdWxkIG5vdCByZXBvcnQgdGhlbS5cbiAgICBpZiAoZW1pdFJlc3VsdCAmJiB0aGlzLm9wdGlvbnMubm9FbWl0T25FcnJvciA9PT0gdHJ1ZSkge1xuICAgICAgLy8gdHJhbnNsYXRlIHRoZSBkaWFnbm9zdGljcyBpbiB0aGUgZW1pdFJlc3VsdCBhcyB3ZWxsLlxuICAgICAgY29uc3QgdHJhbnNsYXRlZEVtaXREaWFncyA9IHRyYW5zbGF0ZURpYWdub3N0aWNzKHRoaXMuaG9zdEFkYXB0ZXIsIGVtaXRSZXN1bHQuZGlhZ25vc3RpY3MpO1xuICAgICAgZW1pdFJlc3VsdC5kaWFnbm9zdGljcyA9IHRyYW5zbGF0ZWRFbWl0RGlhZ3MudHMuY29uY2F0KFxuICAgICAgICAgIHRoaXMuc3RydWN0dXJhbERpYWdub3N0aWNzLmNvbmNhdCh0cmFuc2xhdGVkRW1pdERpYWdzLm5nKS5tYXAobmdUb1RzRGlhZ25vc3RpYykpO1xuICAgIH1cblxuICAgIGlmIChlbWl0UmVzdWx0ICYmICFvdXRTcmNNYXBwaW5nLmxlbmd0aCkge1xuICAgICAgLy8gaWYgbm8gZmlsZXMgd2VyZSBlbWl0dGVkIGJ5IFR5cGVTY3JpcHQsIGFsc28gZG9uJ3QgZW1pdCAuanNvbiBmaWxlc1xuICAgICAgZW1pdFJlc3VsdC5kaWFnbm9zdGljcyA9XG4gICAgICAgICAgZW1pdFJlc3VsdC5kaWFnbm9zdGljcy5jb25jYXQoW2NyZWF0ZU1lc3NhZ2VEaWFnbm9zdGljKGBFbWl0dGVkIG5vIGZpbGVzLmApXSk7XG4gICAgICByZXR1cm4gZW1pdFJlc3VsdDtcbiAgICB9XG5cbiAgICBsZXQgc2FtcGxlU3JjRmlsZU5hbWU6IHN0cmluZ3x1bmRlZmluZWQ7XG4gICAgbGV0IHNhbXBsZU91dEZpbGVOYW1lOiBzdHJpbmd8dW5kZWZpbmVkO1xuICAgIGlmIChvdXRTcmNNYXBwaW5nLmxlbmd0aCkge1xuICAgICAgc2FtcGxlU3JjRmlsZU5hbWUgPSBvdXRTcmNNYXBwaW5nWzBdLnNvdXJjZUZpbGUuZmlsZU5hbWU7XG4gICAgICBzYW1wbGVPdXRGaWxlTmFtZSA9IG91dFNyY01hcHBpbmdbMF0ub3V0RmlsZU5hbWU7XG4gICAgfVxuICAgIGNvbnN0IHNyY1RvT3V0UGF0aCA9XG4gICAgICAgIGNyZWF0ZVNyY1RvT3V0UGF0aE1hcHBlcih0aGlzLm9wdGlvbnMub3V0RGlyLCBzYW1wbGVTcmNGaWxlTmFtZSwgc2FtcGxlT3V0RmlsZU5hbWUpO1xuICAgIGlmIChlbWl0RmxhZ3MgJiBFbWl0RmxhZ3MuQ29kZWdlbikge1xuICAgICAgZ2VuSnNvbkZpbGVzLmZvckVhY2goZ2YgPT4ge1xuICAgICAgICBjb25zdCBvdXRGaWxlTmFtZSA9IHNyY1RvT3V0UGF0aChnZi5nZW5GaWxlVXJsKTtcbiAgICAgICAgdGhpcy53cml0ZUZpbGUob3V0RmlsZU5hbWUsIGdmLnNvdXJjZSEsIGZhbHNlLCB1bmRlZmluZWQsIGdmKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBsZXQgbWV0YWRhdGFKc29uQ291bnQgPSAwO1xuICAgIGlmIChlbWl0RmxhZ3MgJiBFbWl0RmxhZ3MuTWV0YWRhdGEpIHtcbiAgICAgIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZm9yRWFjaChzZiA9PiB7XG4gICAgICAgIGlmICghc2YuaXNEZWNsYXJhdGlvbkZpbGUgJiYgIUdFTkVSQVRFRF9GSUxFUy50ZXN0KHNmLmZpbGVOYW1lKSkge1xuICAgICAgICAgIG1ldGFkYXRhSnNvbkNvdW50Kys7XG4gICAgICAgICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLm1ldGFkYXRhQ2FjaGUuZ2V0TWV0YWRhdGEoc2YpO1xuICAgICAgICAgIGlmIChtZXRhZGF0YSkge1xuICAgICAgICAgICAgY29uc3QgbWV0YWRhdGFUZXh0ID0gSlNPTi5zdHJpbmdpZnkoW21ldGFkYXRhXSk7XG4gICAgICAgICAgICBjb25zdCBvdXRGaWxlTmFtZSA9IHNyY1RvT3V0UGF0aChzZi5maWxlTmFtZS5yZXBsYWNlKC9cXC50c3g/JC8sICcubWV0YWRhdGEuanNvbicpKTtcbiAgICAgICAgICAgIHRoaXMud3JpdGVGaWxlKG91dEZpbGVOYW1lLCBtZXRhZGF0YVRleHQsIGZhbHNlLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgW3NmXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgY29uc3QgZW1pdEVuZCA9IERhdGUubm93KCk7XG4gICAgaWYgKGVtaXRSZXN1bHQgJiYgdGhpcy5vcHRpb25zLmRpYWdub3N0aWNzKSB7XG4gICAgICBlbWl0UmVzdWx0LmRpYWdub3N0aWNzID0gZW1pdFJlc3VsdC5kaWFnbm9zdGljcy5jb25jYXQoW2NyZWF0ZU1lc3NhZ2VEaWFnbm9zdGljKFtcbiAgICAgICAgYEVtaXR0ZWQgaW4gJHtlbWl0RW5kIC0gZW1pdFN0YXJ0fW1zYCxcbiAgICAgICAgYC0gJHtlbWl0dGVkVXNlclRzQ291bnR9IHVzZXIgdHMgZmlsZXNgLFxuICAgICAgICBgLSAke2dlblRzRmlsZXMubGVuZ3RofSBnZW5lcmF0ZWQgdHMgZmlsZXNgLFxuICAgICAgICBgLSAke2dlbkpzb25GaWxlcy5sZW5ndGggKyBtZXRhZGF0YUpzb25Db3VudH0gZ2VuZXJhdGVkIGpzb24gZmlsZXNgLFxuICAgICAgXS5qb2luKCdcXG4nKSldKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZW1pdFJlc3VsdDtcbiAgfVxuXG4gIC8vIFByaXZhdGUgbWVtYmVyc1xuICBwcml2YXRlIGdldCBjb21waWxlcigpOiBBb3RDb21waWxlciB7XG4gICAgaWYgKCF0aGlzLl9jb21waWxlcikge1xuICAgICAgdGhpcy5fY3JlYXRlQ29tcGlsZXIoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2NvbXBpbGVyITtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0IGhvc3RBZGFwdGVyKCk6IFRzQ29tcGlsZXJBb3RDb21waWxlclR5cGVDaGVja0hvc3RBZGFwdGVyIHtcbiAgICBpZiAoIXRoaXMuX2hvc3RBZGFwdGVyKSB7XG4gICAgICB0aGlzLl9jcmVhdGVDb21waWxlcigpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5faG9zdEFkYXB0ZXIhO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgYW5hbHl6ZWRNb2R1bGVzKCk6IE5nQW5hbHl6ZWRNb2R1bGVzIHtcbiAgICBpZiAoIXRoaXMuX2FuYWx5emVkTW9kdWxlcykge1xuICAgICAgdGhpcy5pbml0U3luYygpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fYW5hbHl6ZWRNb2R1bGVzITtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0IHN0cnVjdHVyYWxEaWFnbm9zdGljcygpOiBSZWFkb25seUFycmF5PERpYWdub3N0aWM+IHtcbiAgICBsZXQgZGlhZ25vc3RpY3MgPSB0aGlzLl9zdHJ1Y3R1cmFsRGlhZ25vc3RpY3M7XG4gICAgaWYgKCFkaWFnbm9zdGljcykge1xuICAgICAgdGhpcy5pbml0U3luYygpO1xuICAgICAgZGlhZ25vc3RpY3MgPSAodGhpcy5fc3RydWN0dXJhbERpYWdub3N0aWNzID0gdGhpcy5fc3RydWN0dXJhbERpYWdub3N0aWNzIHx8IFtdKTtcbiAgICB9XG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgdHNQcm9ncmFtKCk6IHRzLlByb2dyYW0ge1xuICAgIGlmICghdGhpcy5fdHNQcm9ncmFtKSB7XG4gICAgICB0aGlzLmluaXRTeW5jKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl90c1Byb2dyYW0hO1xuICB9XG5cbiAgLyoqIFdoZXRoZXIgdGhlIHByb2dyYW0gaXMgY29tcGlsaW5nIHRoZSBBbmd1bGFyIGNvcmUgcGFja2FnZS4gKi9cbiAgcHJpdmF0ZSBnZXQgaXNDb21waWxpbmdBbmd1bGFyQ29yZSgpOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5faXNDb21waWxpbmdBbmd1bGFyQ29yZSAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2lzQ29tcGlsaW5nQW5ndWxhckNvcmU7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9pc0NvbXBpbGluZ0FuZ3VsYXJDb3JlID0gaXNBbmd1bGFyQ29yZVBhY2thZ2UodGhpcy50c1Byb2dyYW0pO1xuICB9XG4gIHByaXZhdGUgX2lzQ29tcGlsaW5nQW5ndWxhckNvcmU6IGJvb2xlYW58bnVsbCA9IG51bGw7XG5cbiAgcHJpdmF0ZSBjYWxjdWxhdGVUcmFuc2Zvcm1zKFxuICAgICAgZ2VuRmlsZXM6IE1hcDxzdHJpbmcsIEdlbmVyYXRlZEZpbGU+fHVuZGVmaW5lZCwgcGFydGlhbE1vZHVsZXM6IFBhcnRpYWxNb2R1bGVbXXx1bmRlZmluZWQsXG4gICAgICBjdXN0b21UcmFuc2Zvcm1lcnM/OiBDdXN0b21UcmFuc2Zvcm1lcnMpOiB0cy5DdXN0b21UcmFuc2Zvcm1lcnMge1xuICAgIGNvbnN0IGJlZm9yZVRzOiBBcnJheTx0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT4+ID0gW107XG4gICAgY29uc3QgbWV0YWRhdGFUcmFuc2Zvcm1zOiBNZXRhZGF0YVRyYW5zZm9ybWVyW10gPSBbXTtcbiAgICBjb25zdCBmbGF0TW9kdWxlTWV0YWRhdGFUcmFuc2Zvcm1zOiBNZXRhZGF0YVRyYW5zZm9ybWVyW10gPSBbXTtcbiAgICBjb25zdCBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlciA9IHRoaXMub3B0aW9ucy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlciB8fCBmYWxzZTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZW5hYmxlUmVzb3VyY2VJbmxpbmluZykge1xuICAgICAgYmVmb3JlVHMucHVzaChnZXRJbmxpbmVSZXNvdXJjZXNUcmFuc2Zvcm1GYWN0b3J5KHRoaXMudHNQcm9ncmFtLCB0aGlzLmhvc3RBZGFwdGVyKSk7XG4gICAgICBjb25zdCB0cmFuc2Zvcm1lciA9IG5ldyBJbmxpbmVSZXNvdXJjZXNNZXRhZGF0YVRyYW5zZm9ybWVyKHRoaXMuaG9zdEFkYXB0ZXIpO1xuICAgICAgbWV0YWRhdGFUcmFuc2Zvcm1zLnB1c2godHJhbnNmb3JtZXIpO1xuICAgICAgZmxhdE1vZHVsZU1ldGFkYXRhVHJhbnNmb3Jtcy5wdXNoKHRyYW5zZm9ybWVyKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5kaXNhYmxlRXhwcmVzc2lvbkxvd2VyaW5nKSB7XG4gICAgICBiZWZvcmVUcy5wdXNoKFxuICAgICAgICAgIGdldEV4cHJlc3Npb25Mb3dlcmluZ1RyYW5zZm9ybUZhY3RvcnkodGhpcy5sb3dlcmluZ01ldGFkYXRhVHJhbnNmb3JtLCB0aGlzLnRzUHJvZ3JhbSkpO1xuICAgICAgbWV0YWRhdGFUcmFuc2Zvcm1zLnB1c2godGhpcy5sb3dlcmluZ01ldGFkYXRhVHJhbnNmb3JtKTtcbiAgICB9XG4gICAgaWYgKGdlbkZpbGVzKSB7XG4gICAgICBiZWZvcmVUcy5wdXNoKGdldEFuZ3VsYXJFbWl0dGVyVHJhbnNmb3JtRmFjdG9yeShcbiAgICAgICAgICBnZW5GaWxlcywgdGhpcy5nZXRUc1Byb2dyYW0oKSwgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIpKTtcbiAgICB9XG4gICAgaWYgKHBhcnRpYWxNb2R1bGVzKSB7XG4gICAgICBiZWZvcmVUcy5wdXNoKGdldEFuZ3VsYXJDbGFzc1RyYW5zZm9ybWVyRmFjdG9yeShwYXJ0aWFsTW9kdWxlcywgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIpKTtcblxuICAgICAgLy8gSWYgd2UgaGF2ZSBwYXJ0aWFsIG1vZHVsZXMsIHRoZSBjYWNoZWQgbWV0YWRhdGEgbWlnaHQgYmUgaW5jb3JyZWN0IGFzIGl0IGRvZXNuJ3QgcmVmbGVjdFxuICAgICAgLy8gdGhlIHBhcnRpYWwgbW9kdWxlIHRyYW5zZm9ybXMuXG4gICAgICBjb25zdCB0cmFuc2Zvcm1lciA9IG5ldyBQYXJ0aWFsTW9kdWxlTWV0YWRhdGFUcmFuc2Zvcm1lcihwYXJ0aWFsTW9kdWxlcyk7XG4gICAgICBtZXRhZGF0YVRyYW5zZm9ybXMucHVzaCh0cmFuc2Zvcm1lcik7XG4gICAgICBmbGF0TW9kdWxlTWV0YWRhdGFUcmFuc2Zvcm1zLnB1c2godHJhbnNmb3JtZXIpO1xuICAgIH1cblxuICAgIGlmIChjdXN0b21UcmFuc2Zvcm1lcnMgJiYgY3VzdG9tVHJhbnNmb3JtZXJzLmJlZm9yZVRzKSB7XG4gICAgICBiZWZvcmVUcy5wdXNoKC4uLmN1c3RvbVRyYW5zZm9ybWVycy5iZWZvcmVUcyk7XG4gICAgfVxuXG4gICAgLy8gSWYgZGVjb3JhdG9ycyBzaG91bGQgYmUgY29udmVydGVkIHRvIHN0YXRpYyBmaWVsZHMgKGVuYWJsZWQgYnkgZGVmYXVsdCksIHdlIHNldCB1cFxuICAgIC8vIHRoZSBkZWNvcmF0b3IgZG93bmxldmVsIHRyYW5zZm9ybS4gTm90ZSB0aGF0IHdlIHNldCBpdCB1cCBhcyBsYXN0IHRyYW5zZm9ybSBhcyB0aGF0XG4gICAgLy8gYWxsb3dzIGN1c3RvbSB0cmFuc2Zvcm1lcnMgdG8gc3RyaXAgQW5ndWxhciBkZWNvcmF0b3JzIHdpdGhvdXQgaGF2aW5nIHRvIGRlYWwgd2l0aFxuICAgIC8vIGlkZW50aWZ5aW5nIHN0YXRpYyBwcm9wZXJ0aWVzLiBlLmcuIGl0J3MgbW9yZSBkaWZmaWN1bHQgaGFuZGxpbmcgYDwuLj4uZGVjb3JhdG9yc2BcbiAgICAvLyBvciBgPC4uPi5jdG9yUGFyYW1ldGVyc2AgY29tcGFyZWQgdG8gdGhlIGB0cy5EZWNvcmF0b3JgIEFTVCBub2Rlcy5cbiAgICBpZiAodGhpcy5vcHRpb25zLmFubm90YXRpb25zQXMgIT09ICdkZWNvcmF0b3JzJykge1xuICAgICAgY29uc3QgdHlwZUNoZWNrZXIgPSB0aGlzLmdldFRzUHJvZ3JhbSgpLmdldFR5cGVDaGVja2VyKCk7XG4gICAgICBjb25zdCByZWZsZWN0aW9uSG9zdCA9IG5ldyBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3QodHlwZUNoZWNrZXIpO1xuICAgICAgLy8gU2ltaWxhcmx5IHRvIGhvdyB3ZSBoYW5kbGVkIHRzaWNrbGUgZGVjb3JhdG9yIGRvd25sZXZlbGluZyBpbiB0aGUgcGFzdCwgd2UganVzdFxuICAgICAgLy8gaWdub3JlIGRpYWdub3N0aWNzIHRoYXQgaGF2ZSBiZWVuIGNvbGxlY3RlZCBieSB0aGUgdHJhbnNmb3JtZXIuIFRoZXNlIGFyZVxuICAgICAgLy8gbm9uLXNpZ25pZmljYW50IGZhaWx1cmVzIHRoYXQgc2hvdWxkbid0IHByZXZlbnQgYXBwcyBmcm9tIGNvbXBpbGluZy5cbiAgICAgIGJlZm9yZVRzLnB1c2goZ2V0RG93bmxldmVsRGVjb3JhdG9yc1RyYW5zZm9ybShcbiAgICAgICAgICB0eXBlQ2hlY2tlciwgcmVmbGVjdGlvbkhvc3QsIFtdLCB0aGlzLmlzQ29tcGlsaW5nQW5ndWxhckNvcmUsIGFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyLFxuICAgICAgICAgIC8qIHNraXBDbGFzc0RlY29yYXRvcnMgKi8gZmFsc2UpKTtcbiAgICB9XG5cbiAgICBpZiAobWV0YWRhdGFUcmFuc2Zvcm1zLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMubWV0YWRhdGFDYWNoZSA9IHRoaXMuY3JlYXRlTWV0YWRhdGFDYWNoZShtZXRhZGF0YVRyYW5zZm9ybXMpO1xuICAgIH1cbiAgICBpZiAoZmxhdE1vZHVsZU1ldGFkYXRhVHJhbnNmb3Jtcy5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLmZsYXRNb2R1bGVNZXRhZGF0YUNhY2hlID0gdGhpcy5jcmVhdGVNZXRhZGF0YUNhY2hlKGZsYXRNb2R1bGVNZXRhZGF0YVRyYW5zZm9ybXMpO1xuICAgIH1cbiAgICBjb25zdCBhZnRlclRzID0gY3VzdG9tVHJhbnNmb3JtZXJzID8gY3VzdG9tVHJhbnNmb3JtZXJzLmFmdGVyVHMgOiB1bmRlZmluZWQ7XG4gICAgcmV0dXJuIHtiZWZvcmU6IGJlZm9yZVRzLCBhZnRlcjogYWZ0ZXJUc307XG4gIH1cblxuICBwcml2YXRlIGluaXRTeW5jKCkge1xuICAgIGlmICh0aGlzLl9hbmFseXplZE1vZHVsZXMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHt0bXBQcm9ncmFtLCBzb3VyY2VGaWxlcywgdHNGaWxlcywgcm9vdE5hbWVzfSA9IHRoaXMuX2NyZWF0ZVByb2dyYW1XaXRoQmFzaWNTdHVicygpO1xuICAgICAgY29uc3Qge2FuYWx5emVkTW9kdWxlcywgYW5hbHl6ZWRJbmplY3RhYmxlc30gPVxuICAgICAgICAgIHRoaXMuY29tcGlsZXIubG9hZEZpbGVzU3luYyhzb3VyY2VGaWxlcywgdHNGaWxlcyk7XG4gICAgICB0aGlzLl91cGRhdGVQcm9ncmFtV2l0aFR5cGVDaGVja1N0dWJzKFxuICAgICAgICAgIHRtcFByb2dyYW0sIGFuYWx5emVkTW9kdWxlcywgYW5hbHl6ZWRJbmplY3RhYmxlcywgcm9vdE5hbWVzKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0aGlzLl9jcmVhdGVQcm9ncmFtT25FcnJvcihlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9jcmVhdGVDb21waWxlcigpIHtcbiAgICBjb25zdCBjb2RlZ2VuOiBDb2RlR2VuZXJhdG9yID0ge1xuICAgICAgZ2VuZXJhdGVGaWxlOiAoZ2VuRmlsZU5hbWUsIGJhc2VGaWxlTmFtZSkgPT5cbiAgICAgICAgICB0aGlzLl9jb21waWxlci5lbWl0QmFzaWNTdHViKGdlbkZpbGVOYW1lLCBiYXNlRmlsZU5hbWUpLFxuICAgICAgZmluZEdlbmVyYXRlZEZpbGVOYW1lczogKGZpbGVOYW1lKSA9PiB0aGlzLl9jb21waWxlci5maW5kR2VuZXJhdGVkRmlsZU5hbWVzKGZpbGVOYW1lKSxcbiAgICB9O1xuXG4gICAgdGhpcy5faG9zdEFkYXB0ZXIgPSBuZXcgVHNDb21waWxlckFvdENvbXBpbGVyVHlwZUNoZWNrSG9zdEFkYXB0ZXIoXG4gICAgICAgIHRoaXMucm9vdE5hbWVzLCB0aGlzLm9wdGlvbnMsIHRoaXMuaG9zdCwgdGhpcy5tZXRhZGF0YUNhY2hlLCBjb2RlZ2VuLFxuICAgICAgICB0aGlzLm9sZFByb2dyYW1MaWJyYXJ5U3VtbWFyaWVzKTtcbiAgICBjb25zdCBhb3RPcHRpb25zID0gZ2V0QW90Q29tcGlsZXJPcHRpb25zKHRoaXMub3B0aW9ucyk7XG4gICAgY29uc3QgZXJyb3JDb2xsZWN0b3IgPSAodGhpcy5vcHRpb25zLmNvbGxlY3RBbGxFcnJvcnMgfHwgdGhpcy5vcHRpb25zLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjaykgP1xuICAgICAgICAoZXJyOiBhbnkpID0+IHRoaXMuX2FkZFN0cnVjdHVyYWxEaWFnbm9zdGljcyhlcnIpIDpcbiAgICAgICAgdW5kZWZpbmVkO1xuICAgIHRoaXMuX2NvbXBpbGVyID0gY3JlYXRlQW90Q29tcGlsZXIodGhpcy5faG9zdEFkYXB0ZXIsIGFvdE9wdGlvbnMsIGVycm9yQ29sbGVjdG9yKS5jb21waWxlcjtcbiAgfVxuXG4gIHByaXZhdGUgX2NyZWF0ZVByb2dyYW1XaXRoQmFzaWNTdHVicygpOiB7XG4gICAgdG1wUHJvZ3JhbTogdHMuUHJvZ3JhbSxcbiAgICByb290TmFtZXM6IHN0cmluZ1tdLFxuICAgIHNvdXJjZUZpbGVzOiBzdHJpbmdbXSxcbiAgICB0c0ZpbGVzOiBzdHJpbmdbXSxcbiAgfSB7XG4gICAgaWYgKHRoaXMuX2FuYWx5emVkTW9kdWxlcykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnRlcm5hbCBFcnJvcjogYWxyZWFkeSBpbml0aWFsaXplZCFgKTtcbiAgICB9XG4gICAgLy8gTm90ZTogVGhpcyBpcyBpbXBvcnRhbnQgdG8gbm90IHByb2R1Y2UgYSBtZW1vcnkgbGVhayFcbiAgICBjb25zdCBvbGRUc1Byb2dyYW0gPSB0aGlzLm9sZFRzUHJvZ3JhbTtcbiAgICB0aGlzLm9sZFRzUHJvZ3JhbSA9IHVuZGVmaW5lZDtcblxuICAgIGNvbnN0IGNvZGVnZW46IENvZGVHZW5lcmF0b3IgPSB7XG4gICAgICBnZW5lcmF0ZUZpbGU6IChnZW5GaWxlTmFtZSwgYmFzZUZpbGVOYW1lKSA9PlxuICAgICAgICAgIHRoaXMuY29tcGlsZXIuZW1pdEJhc2ljU3R1YihnZW5GaWxlTmFtZSwgYmFzZUZpbGVOYW1lKSxcbiAgICAgIGZpbmRHZW5lcmF0ZWRGaWxlTmFtZXM6IChmaWxlTmFtZSkgPT4gdGhpcy5jb21waWxlci5maW5kR2VuZXJhdGVkRmlsZU5hbWVzKGZpbGVOYW1lKSxcbiAgICB9O1xuXG5cbiAgICBsZXQgcm9vdE5hbWVzID0gWy4uLnRoaXMucm9vdE5hbWVzXTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmdlbmVyYXRlQ29kZUZvckxpYnJhcmllcyAhPT0gZmFsc2UpIHtcbiAgICAgIC8vIGlmIHdlIHNob3VsZCBnZW5lcmF0ZUNvZGVGb3JMaWJyYXJpZXMsIG5ldmVyIGluY2x1ZGVcbiAgICAgIC8vIGdlbmVyYXRlZCBmaWxlcyBpbiB0aGUgcHJvZ3JhbSBhcyBvdGhlcndpc2Ugd2Ugd2lsbFxuICAgICAgLy8gb3ZlcndyaXRlIHRoZW0gYW5kIHR5cGVzY3JpcHQgd2lsbCByZXBvcnQgdGhlIGVycm9yXG4gICAgICAvLyBUUzUwNTU6IENhbm5vdCB3cml0ZSBmaWxlIC4uLiBiZWNhdXNlIGl0IHdvdWxkIG92ZXJ3cml0ZSBpbnB1dCBmaWxlLlxuICAgICAgcm9vdE5hbWVzID0gcm9vdE5hbWVzLmZpbHRlcihmbiA9PiAhR0VORVJBVEVEX0ZJTEVTLnRlc3QoZm4pKTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5ub1Jlc29sdmUpIHtcbiAgICAgIHRoaXMucm9vdE5hbWVzLmZvckVhY2gocm9vdE5hbWUgPT4ge1xuICAgICAgICBpZiAodGhpcy5ob3N0QWRhcHRlci5zaG91bGRHZW5lcmF0ZUZpbGVzRm9yKHJvb3ROYW1lKSkge1xuICAgICAgICAgIHJvb3ROYW1lcy5wdXNoKC4uLnRoaXMuY29tcGlsZXIuZmluZEdlbmVyYXRlZEZpbGVOYW1lcyhyb290TmFtZSkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCB0bXBQcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbShyb290TmFtZXMsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0QWRhcHRlciwgb2xkVHNQcm9ncmFtKTtcbiAgICBpZiAodGVtcFByb2dyYW1IYW5kbGVyRm9yVGVzdCAhPT0gbnVsbCkge1xuICAgICAgdGVtcFByb2dyYW1IYW5kbGVyRm9yVGVzdCh0bXBQcm9ncmFtKTtcbiAgICB9XG4gICAgY29uc3Qgc291cmNlRmlsZXM6IHN0cmluZ1tdID0gW107XG4gICAgY29uc3QgdHNGaWxlczogc3RyaW5nW10gPSBbXTtcbiAgICB0bXBQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZm9yRWFjaChzZiA9PiB7XG4gICAgICBpZiAodGhpcy5ob3N0QWRhcHRlci5pc1NvdXJjZUZpbGUoc2YuZmlsZU5hbWUpKSB7XG4gICAgICAgIHNvdXJjZUZpbGVzLnB1c2goc2YuZmlsZU5hbWUpO1xuICAgICAgfVxuICAgICAgaWYgKFRTLnRlc3Qoc2YuZmlsZU5hbWUpICYmICFEVFMudGVzdChzZi5maWxlTmFtZSkpIHtcbiAgICAgICAgdHNGaWxlcy5wdXNoKHNmLmZpbGVOYW1lKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4ge3RtcFByb2dyYW0sIHNvdXJjZUZpbGVzLCB0c0ZpbGVzLCByb290TmFtZXN9O1xuICB9XG5cbiAgcHJpdmF0ZSBfdXBkYXRlUHJvZ3JhbVdpdGhUeXBlQ2hlY2tTdHVicyhcbiAgICAgIHRtcFByb2dyYW06IHRzLlByb2dyYW0sIGFuYWx5emVkTW9kdWxlczogTmdBbmFseXplZE1vZHVsZXMsXG4gICAgICBhbmFseXplZEluamVjdGFibGVzOiBOZ0FuYWx5emVkRmlsZVdpdGhJbmplY3RhYmxlc1tdLCByb290TmFtZXM6IHN0cmluZ1tdKSB7XG4gICAgdGhpcy5fYW5hbHl6ZWRNb2R1bGVzID0gYW5hbHl6ZWRNb2R1bGVzO1xuICAgIHRoaXMuX2FuYWx5emVkSW5qZWN0YWJsZXMgPSBhbmFseXplZEluamVjdGFibGVzO1xuICAgIHRtcFByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5mb3JFYWNoKHNmID0+IHtcbiAgICAgIGlmIChzZi5maWxlTmFtZS5lbmRzV2l0aCgnLm5nZmFjdG9yeS50cycpKSB7XG4gICAgICAgIGNvbnN0IHtnZW5lcmF0ZSwgYmFzZUZpbGVOYW1lfSA9IHRoaXMuaG9zdEFkYXB0ZXIuc2hvdWxkR2VuZXJhdGVGaWxlKHNmLmZpbGVOYW1lKTtcbiAgICAgICAgaWYgKGdlbmVyYXRlKSB7XG4gICAgICAgICAgLy8gTm90ZTogISBpcyBvayBhcyBob3N0QWRhcHRlci5zaG91bGRHZW5lcmF0ZUZpbGUgd2lsbCBhbHdheXMgcmV0dXJuIGEgYmFzZUZpbGVOYW1lXG4gICAgICAgICAgLy8gZm9yIC5uZ2ZhY3RvcnkudHMgZmlsZXMuXG4gICAgICAgICAgY29uc3QgZ2VuRmlsZSA9IHRoaXMuY29tcGlsZXIuZW1pdFR5cGVDaGVja1N0dWIoc2YuZmlsZU5hbWUsIGJhc2VGaWxlTmFtZSEpO1xuICAgICAgICAgIGlmIChnZW5GaWxlKSB7XG4gICAgICAgICAgICB0aGlzLmhvc3RBZGFwdGVyLnVwZGF0ZUdlbmVyYXRlZEZpbGUoZ2VuRmlsZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5fdHNQcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbShyb290TmFtZXMsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0QWRhcHRlciwgdG1wUHJvZ3JhbSk7XG4gICAgLy8gTm90ZTogdGhlIG5ldyB0cyBwcm9ncmFtIHNob3VsZCBiZSBjb21wbGV0ZWx5IHJldXNhYmxlIGJ5IFR5cGVTY3JpcHQgYXM6XG4gICAgLy8gLSB3ZSBjYWNoZSBhbGwgdGhlIGZpbGVzIGluIHRoZSBob3N0QWRhcHRlclxuICAgIC8vIC0gbmV3IG5ldyBzdHVicyB1c2UgdGhlIGV4YWN0bHkgc2FtZSBpbXBvcnRzL2V4cG9ydHMgYXMgdGhlIG9sZCBvbmNlICh3ZSBhc3NlcnQgdGhhdCBpblxuICAgIC8vIGhvc3RBZGFwdGVyLnVwZGF0ZUdlbmVyYXRlZEZpbGUpLlxuICAgIGlmICh0c1N0cnVjdHVyZUlzUmV1c2VkKHRoaXMuX3RzUHJvZ3JhbSkgIT09IFN0cnVjdHVyZUlzUmV1c2VkLkNvbXBsZXRlbHkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW50ZXJuYWwgRXJyb3I6IFRoZSBzdHJ1Y3R1cmUgb2YgdGhlIHByb2dyYW0gY2hhbmdlZCBkdXJpbmcgY29kZWdlbi5gKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9jcmVhdGVQcm9ncmFtT25FcnJvcihlOiBhbnkpIHtcbiAgICAvLyBTdGlsbCBmaWxsIHRoZSBhbmFseXplZE1vZHVsZXMgYW5kIHRoZSB0c1Byb2dyYW1cbiAgICAvLyBzbyB0aGF0IHdlIGRvbid0IGNhdXNlIG90aGVyIGVycm9ycyBmb3IgdXNlcnMgd2hvIGUuZy4gd2FudCB0byBlbWl0IHRoZSBuZ1Byb2dyYW0uXG4gICAgdGhpcy5fYW5hbHl6ZWRNb2R1bGVzID0gZW1wdHlNb2R1bGVzO1xuICAgIHRoaXMub2xkVHNQcm9ncmFtID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX2hvc3RBZGFwdGVyLmlzU291cmNlRmlsZSA9ICgpID0+IGZhbHNlO1xuICAgIHRoaXMuX3RzUHJvZ3JhbSA9IHRzLmNyZWF0ZVByb2dyYW0odGhpcy5yb290TmFtZXMsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0QWRhcHRlcik7XG4gICAgaWYgKGlzU3ludGF4RXJyb3IoZSkpIHtcbiAgICAgIHRoaXMuX2FkZFN0cnVjdHVyYWxEaWFnbm9zdGljcyhlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhyb3cgZTtcbiAgfVxuXG4gIHByaXZhdGUgX2FkZFN0cnVjdHVyYWxEaWFnbm9zdGljcyhlcnJvcjogRXJyb3IpIHtcbiAgICBjb25zdCBkaWFnbm9zdGljcyA9IHRoaXMuX3N0cnVjdHVyYWxEaWFnbm9zdGljcyB8fCAodGhpcy5fc3RydWN0dXJhbERpYWdub3N0aWNzID0gW10pO1xuICAgIGlmIChpc1N5bnRheEVycm9yKGVycm9yKSkge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5zeW50YXhFcnJvclRvRGlhZ25vc3RpY3MoZXJyb3IsIHRoaXMudHNQcm9ncmFtKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goe1xuICAgICAgICBtZXNzYWdlVGV4dDogZXJyb3IudG9TdHJpbmcoKSxcbiAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgc291cmNlOiBTT1VSQ0UsXG4gICAgICAgIGNvZGU6IERFRkFVTFRfRVJST1JfQ09ERVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLy8gTm90ZTogdGhpcyByZXR1cm5zIGEgdHMuRGlhZ25vc3RpYyBzbyB0aGF0IHdlXG4gIC8vIGNhbiByZXR1cm4gZXJyb3JzIGluIGEgdHMuRW1pdFJlc3VsdFxuICBwcml2YXRlIGdlbmVyYXRlRmlsZXNGb3JFbWl0KGVtaXRGbGFnczogRW1pdEZsYWdzKTpcbiAgICAgIHtnZW5GaWxlczogR2VuZXJhdGVkRmlsZVtdLCBnZW5EaWFnczogdHMuRGlhZ25vc3RpY1tdfSB7XG4gICAgdHJ5IHtcbiAgICAgIGlmICghKGVtaXRGbGFncyAmIEVtaXRGbGFncy5Db2RlZ2VuKSkge1xuICAgICAgICByZXR1cm4ge2dlbkZpbGVzOiBbXSwgZ2VuRGlhZ3M6IFtdfTtcbiAgICAgIH1cbiAgICAgIC8vIFRPRE8odGJvc2NoKTogYWxsb3cgZ2VuZXJhdGluZyBmaWxlcyB0aGF0IGFyZSBub3QgaW4gdGhlIHJvb3REaXJcbiAgICAgIC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL2lzc3Vlcy8xOTMzN1xuICAgICAgbGV0IGdlbkZpbGVzID0gdGhpcy5jb21waWxlci5lbWl0QWxsSW1wbHModGhpcy5hbmFseXplZE1vZHVsZXMpXG4gICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihnZW5GaWxlID0+IGlzSW5Sb290RGlyKGdlbkZpbGUuZ2VuRmlsZVVybCwgdGhpcy5vcHRpb25zKSk7XG4gICAgICBpZiAodGhpcy5vbGRQcm9ncmFtRW1pdHRlZEdlbmVyYXRlZEZpbGVzKSB7XG4gICAgICAgIGNvbnN0IG9sZFByb2dyYW1FbWl0dGVkR2VuZXJhdGVkRmlsZXMgPSB0aGlzLm9sZFByb2dyYW1FbWl0dGVkR2VuZXJhdGVkRmlsZXM7XG4gICAgICAgIGdlbkZpbGVzID0gZ2VuRmlsZXMuZmlsdGVyKGdlbkZpbGUgPT4ge1xuICAgICAgICAgIGNvbnN0IG9sZEdlbkZpbGUgPSBvbGRQcm9ncmFtRW1pdHRlZEdlbmVyYXRlZEZpbGVzLmdldChnZW5GaWxlLmdlbkZpbGVVcmwpO1xuICAgICAgICAgIHJldHVybiAhb2xkR2VuRmlsZSB8fCAhZ2VuRmlsZS5pc0VxdWl2YWxlbnQob2xkR2VuRmlsZSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtnZW5GaWxlcywgZ2VuRGlhZ3M6IFtdfTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyBUT0RPKHRib3NjaCk6IGNoZWNrIHdoZXRoZXIgd2UgY2FuIGFjdHVhbGx5IGhhdmUgc3ludGF4IGVycm9ycyBoZXJlLFxuICAgICAgLy8gYXMgd2UgYWxyZWFkeSBwYXJzZWQgdGhlIG1ldGFkYXRhIGFuZCB0ZW1wbGF0ZXMgYmVmb3JlIHRvIGNyZWF0ZSB0aGUgdHlwZSBjaGVjayBibG9jay5cbiAgICAgIGlmIChpc1N5bnRheEVycm9yKGUpKSB7XG4gICAgICAgIGNvbnN0IGdlbkRpYWdzOiB0cy5EaWFnbm9zdGljW10gPSBbe1xuICAgICAgICAgIGZpbGU6IHVuZGVmaW5lZCxcbiAgICAgICAgICBzdGFydDogdW5kZWZpbmVkLFxuICAgICAgICAgIGxlbmd0aDogdW5kZWZpbmVkLFxuICAgICAgICAgIG1lc3NhZ2VUZXh0OiBlLm1lc3NhZ2UsXG4gICAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgICBzb3VyY2U6IFNPVVJDRSxcbiAgICAgICAgICBjb2RlOiBERUZBVUxUX0VSUk9SX0NPREVcbiAgICAgICAgfV07XG4gICAgICAgIHJldHVybiB7Z2VuRmlsZXM6IFtdLCBnZW5EaWFnc307XG4gICAgICB9XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHVuZGVmaW5lZCBpZiBhbGwgZmlsZXMgc2hvdWxkIGJlIGVtaXR0ZWQuXG4gICAqL1xuICBwcml2YXRlIGdldFNvdXJjZUZpbGVzRm9yRW1pdCgpOiB0cy5Tb3VyY2VGaWxlW118dW5kZWZpbmVkIHtcbiAgICAvLyBUT0RPKHRib3NjaCk6IGlmIG9uZSBvZiB0aGUgZmlsZXMgY29udGFpbnMgYSBgY29uc3QgZW51bWBcbiAgICAvLyBhbHdheXMgZW1pdCBhbGwgZmlsZXMgLT4gcmV0dXJuIHVuZGVmaW5lZCFcbiAgICBsZXQgc291cmNlRmlsZXNUb0VtaXQgPSB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZpbHRlcihzZiA9PiB7XG4gICAgICByZXR1cm4gIXNmLmlzRGVjbGFyYXRpb25GaWxlICYmICFHRU5FUkFURURfRklMRVMudGVzdChzZi5maWxlTmFtZSk7XG4gICAgfSk7XG4gICAgaWYgKHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRTb3VyY2VGaWxlcykge1xuICAgICAgc291cmNlRmlsZXNUb0VtaXQgPSBzb3VyY2VGaWxlc1RvRW1pdC5maWx0ZXIoc2YgPT4ge1xuICAgICAgICBjb25zdCBvbGRGaWxlID0gdGhpcy5vbGRQcm9ncmFtRW1pdHRlZFNvdXJjZUZpbGVzIS5nZXQoc2YuZmlsZU5hbWUpO1xuICAgICAgICByZXR1cm4gc2YgIT09IG9sZEZpbGU7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHNvdXJjZUZpbGVzVG9FbWl0O1xuICB9XG5cbiAgcHJpdmF0ZSB3cml0ZUZpbGUoXG4gICAgICBvdXRGaWxlTmFtZTogc3RyaW5nLCBvdXREYXRhOiBzdHJpbmcsIHdyaXRlQnl0ZU9yZGVyTWFyazogYm9vbGVhbixcbiAgICAgIG9uRXJyb3I/OiAobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkLCBnZW5GaWxlPzogR2VuZXJhdGVkRmlsZSxcbiAgICAgIHNvdXJjZUZpbGVzPzogUmVhZG9ubHlBcnJheTx0cy5Tb3VyY2VGaWxlPikge1xuICAgIC8vIGNvbGxlY3QgZW1pdHRlZExpYnJhcnlTdW1tYXJpZXNcbiAgICBsZXQgYmFzZUZpbGU6IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkO1xuICAgIGlmIChnZW5GaWxlKSB7XG4gICAgICBiYXNlRmlsZSA9IHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGUoZ2VuRmlsZS5zcmNGaWxlVXJsKTtcbiAgICAgIGlmIChiYXNlRmlsZSkge1xuICAgICAgICBpZiAoIXRoaXMuZW1pdHRlZExpYnJhcnlTdW1tYXJpZXMpIHtcbiAgICAgICAgICB0aGlzLmVtaXR0ZWRMaWJyYXJ5U3VtbWFyaWVzID0gW107XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGdlbkZpbGUuZ2VuRmlsZVVybC5lbmRzV2l0aCgnLm5nc3VtbWFyeS5qc29uJykgJiYgYmFzZUZpbGUuZmlsZU5hbWUuZW5kc1dpdGgoJy5kLnRzJykpIHtcbiAgICAgICAgICB0aGlzLmVtaXR0ZWRMaWJyYXJ5U3VtbWFyaWVzLnB1c2goe1xuICAgICAgICAgICAgZmlsZU5hbWU6IGJhc2VGaWxlLmZpbGVOYW1lLFxuICAgICAgICAgICAgdGV4dDogYmFzZUZpbGUudGV4dCxcbiAgICAgICAgICAgIHNvdXJjZUZpbGU6IGJhc2VGaWxlLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHRoaXMuZW1pdHRlZExpYnJhcnlTdW1tYXJpZXMucHVzaCh7ZmlsZU5hbWU6IGdlbkZpbGUuZ2VuRmlsZVVybCwgdGV4dDogb3V0RGF0YX0pO1xuICAgICAgICAgIGlmICghdGhpcy5vcHRpb25zLmRlY2xhcmF0aW9uKSB7XG4gICAgICAgICAgICAvLyBJZiB3ZSBkb24ndCBlbWl0IGRlY2xhcmF0aW9ucywgc3RpbGwgcmVjb3JkIGFuIGVtcHR5IC5uZ2ZhY3RvcnkuZC50cyBmaWxlLFxuICAgICAgICAgICAgLy8gYXMgd2UgbWlnaHQgbmVlZCBpdCBsYXRlciBvbiBmb3IgcmVzb2x2aW5nIG1vZHVsZSBuYW1lcyBmcm9tIHN1bW1hcmllcy5cbiAgICAgICAgICAgIGNvbnN0IG5nRmFjdG9yeUR0cyA9XG4gICAgICAgICAgICAgICAgZ2VuRmlsZS5nZW5GaWxlVXJsLnN1YnN0cmluZygwLCBnZW5GaWxlLmdlbkZpbGVVcmwubGVuZ3RoIC0gMTUpICsgJy5uZ2ZhY3RvcnkuZC50cyc7XG4gICAgICAgICAgICB0aGlzLmVtaXR0ZWRMaWJyYXJ5U3VtbWFyaWVzLnB1c2goe2ZpbGVOYW1lOiBuZ0ZhY3RvcnlEdHMsIHRleHQ6ICcnfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKG91dEZpbGVOYW1lLmVuZHNXaXRoKCcuZC50cycpICYmIGJhc2VGaWxlLmZpbGVOYW1lLmVuZHNXaXRoKCcuZC50cycpKSB7XG4gICAgICAgICAgY29uc3QgZHRzU291cmNlRmlsZVBhdGggPSBnZW5GaWxlLmdlbkZpbGVVcmwucmVwbGFjZSgvXFwudHMkLywgJy5kLnRzJyk7XG4gICAgICAgICAgLy8gTm90ZTogRG9uJ3QgdXNlIHNvdXJjZUZpbGVzIGhlcmUgYXMgdGhlIGNyZWF0ZWQgLmQudHMgaGFzIGEgcGF0aCBpbiB0aGUgb3V0RGlyLFxuICAgICAgICAgIC8vIGJ1dCB3ZSBuZWVkIG9uZSB0aGF0IGlzIG5leHQgdG8gdGhlIC50cyBmaWxlXG4gICAgICAgICAgdGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcy5wdXNoKHtmaWxlTmFtZTogZHRzU291cmNlRmlsZVBhdGgsIHRleHQ6IG91dERhdGF9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBGaWx0ZXIgb3V0IGdlbmVyYXRlZCBmaWxlcyBmb3Igd2hpY2ggd2UgZGlkbid0IGdlbmVyYXRlIGNvZGUuXG4gICAgLy8gVGhpcyBjYW4gaGFwcGVuIGFzIHRoZSBzdHViIGNhbGN1bGF0aW9uIGlzIG5vdCBjb21wbGV0ZWx5IGV4YWN0LlxuICAgIC8vIE5vdGU6IHNvdXJjZUZpbGUgcmVmZXJzIHRvIHRoZSAubmdmYWN0b3J5LnRzIC8gLm5nc3VtbWFyeS50cyBmaWxlXG4gICAgLy8gbm9kZV9lbWl0dGVyX3RyYW5zZm9ybSBhbHJlYWR5IHNldCB0aGUgZmlsZSBjb250ZW50cyB0byBiZSBlbXB0eSxcbiAgICAvLyAgc28gdGhpcyBjb2RlIG9ubHkgbmVlZHMgdG8gc2tpcCB0aGUgZmlsZSBpZiAhYWxsb3dFbXB0eUNvZGVnZW5GaWxlcy5cbiAgICBjb25zdCBpc0dlbmVyYXRlZCA9IEdFTkVSQVRFRF9GSUxFUy50ZXN0KG91dEZpbGVOYW1lKTtcbiAgICBpZiAoaXNHZW5lcmF0ZWQgJiYgIXRoaXMub3B0aW9ucy5hbGxvd0VtcHR5Q29kZWdlbkZpbGVzICYmXG4gICAgICAgICghZ2VuRmlsZSB8fCAhZ2VuRmlsZS5zdG10cyB8fCBnZW5GaWxlLnN0bXRzLmxlbmd0aCA9PT0gMCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGJhc2VGaWxlKSB7XG4gICAgICBzb3VyY2VGaWxlcyA9IHNvdXJjZUZpbGVzID8gWy4uLnNvdXJjZUZpbGVzLCBiYXNlRmlsZV0gOiBbYmFzZUZpbGVdO1xuICAgIH1cbiAgICAvLyBUT0RPOiByZW1vdmUgYW55IHdoZW4gVFMgMi40IHN1cHBvcnQgaXMgcmVtb3ZlZC5cbiAgICB0aGlzLmhvc3Qud3JpdGVGaWxlKG91dEZpbGVOYW1lLCBvdXREYXRhLCB3cml0ZUJ5dGVPcmRlck1hcmssIG9uRXJyb3IsIHNvdXJjZUZpbGVzIGFzIGFueSk7XG4gIH1cbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUHJvZ3JhbSh7cm9vdE5hbWVzLCBvcHRpb25zLCBob3N0LCBvbGRQcm9ncmFtfToge1xuICByb290TmFtZXM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPixcbiAgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zLFxuICBob3N0OiBDb21waWxlckhvc3QsXG4gIG9sZFByb2dyYW0/OiBQcm9ncmFtXG59KTogUHJvZ3JhbSB7XG4gIGlmIChvcHRpb25zLmVuYWJsZUl2eSAhPT0gZmFsc2UpIHtcbiAgICByZXR1cm4gbmV3IE5ndHNjUHJvZ3JhbShyb290TmFtZXMsIG9wdGlvbnMsIGhvc3QsIG9sZFByb2dyYW0gYXMgTmd0c2NQcm9ncmFtIHwgdW5kZWZpbmVkKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3IEFuZ3VsYXJDb21waWxlclByb2dyYW0ocm9vdE5hbWVzLCBvcHRpb25zLCBob3N0LCBvbGRQcm9ncmFtKTtcbiAgfVxufVxuXG4vLyBDb21wdXRlIHRoZSBBb3RDb21waWxlciBvcHRpb25zXG5mdW5jdGlvbiBnZXRBb3RDb21waWxlck9wdGlvbnMob3B0aW9uczogQ29tcGlsZXJPcHRpb25zKTogQW90Q29tcGlsZXJPcHRpb25zIHtcbiAgbGV0IG1pc3NpbmdUcmFuc2xhdGlvbiA9IGNvcmUuTWlzc2luZ1RyYW5zbGF0aW9uU3RyYXRlZ3kuV2FybmluZztcblxuICBzd2l0Y2ggKG9wdGlvbnMuaTE4bkluTWlzc2luZ1RyYW5zbGF0aW9ucykge1xuICAgIGNhc2UgJ2lnbm9yZSc6XG4gICAgICBtaXNzaW5nVHJhbnNsYXRpb24gPSBjb3JlLk1pc3NpbmdUcmFuc2xhdGlvblN0cmF0ZWd5Lklnbm9yZTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgIG1pc3NpbmdUcmFuc2xhdGlvbiA9IGNvcmUuTWlzc2luZ1RyYW5zbGF0aW9uU3RyYXRlZ3kuRXJyb3I7XG4gICAgICBicmVhaztcbiAgfVxuXG4gIGxldCB0cmFuc2xhdGlvbnM6IHN0cmluZyA9ICcnO1xuXG4gIGlmIChvcHRpb25zLmkxOG5JbkZpbGUpIHtcbiAgICBpZiAoIW9wdGlvbnMuaTE4bkluTG9jYWxlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSB0cmFuc2xhdGlvbiBmaWxlICgke29wdGlvbnMuaTE4bkluRmlsZX0pIGxvY2FsZSBtdXN0IGJlIHByb3ZpZGVkLmApO1xuICAgIH1cbiAgICB0cmFuc2xhdGlvbnMgPSBmcy5yZWFkRmlsZVN5bmMob3B0aW9ucy5pMThuSW5GaWxlLCAndXRmOCcpO1xuICB9IGVsc2Uge1xuICAgIC8vIE5vIHRyYW5zbGF0aW9ucyBhcmUgcHJvdmlkZWQsIGlnbm9yZSBhbnkgZXJyb3JzXG4gICAgLy8gV2Ugc3RpbGwgZ28gdGhyb3VnaCBpMThuIHRvIHJlbW92ZSBpMThuIGF0dHJpYnV0ZXNcbiAgICBtaXNzaW5nVHJhbnNsYXRpb24gPSBjb3JlLk1pc3NpbmdUcmFuc2xhdGlvblN0cmF0ZWd5Lklnbm9yZTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgbG9jYWxlOiBvcHRpb25zLmkxOG5JbkxvY2FsZSxcbiAgICBpMThuRm9ybWF0OiBvcHRpb25zLmkxOG5JbkZvcm1hdCB8fCBvcHRpb25zLmkxOG5PdXRGb3JtYXQsXG4gICAgaTE4blVzZUV4dGVybmFsSWRzOiBvcHRpb25zLmkxOG5Vc2VFeHRlcm5hbElkcyxcbiAgICB0cmFuc2xhdGlvbnMsXG4gICAgbWlzc2luZ1RyYW5zbGF0aW9uLFxuICAgIGVuYWJsZVN1bW1hcmllc0ZvckppdDogb3B0aW9ucy5lbmFibGVTdW1tYXJpZXNGb3JKaXQsXG4gICAgcHJlc2VydmVXaGl0ZXNwYWNlczogb3B0aW9ucy5wcmVzZXJ2ZVdoaXRlc3BhY2VzLFxuICAgIGZ1bGxUZW1wbGF0ZVR5cGVDaGVjazogb3B0aW9ucy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2ssXG4gICAgYWxsb3dFbXB0eUNvZGVnZW5GaWxlczogb3B0aW9ucy5hbGxvd0VtcHR5Q29kZWdlbkZpbGVzLFxuICAgIGVuYWJsZUl2eTogb3B0aW9ucy5lbmFibGVJdnksXG4gICAgY3JlYXRlRXh0ZXJuYWxTeW1ib2xGYWN0b3J5UmVleHBvcnRzOiBvcHRpb25zLmNyZWF0ZUV4dGVybmFsU3ltYm9sRmFjdG9yeVJlZXhwb3J0cyxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0TmdPcHRpb25EaWFnbm9zdGljcyhvcHRpb25zOiBDb21waWxlck9wdGlvbnMpOiBSZWFkb25seUFycmF5PERpYWdub3N0aWM+IHtcbiAgaWYgKG9wdGlvbnMuYW5ub3RhdGlvbnNBcykge1xuICAgIHN3aXRjaCAob3B0aW9ucy5hbm5vdGF0aW9uc0FzKSB7XG4gICAgICBjYXNlICdkZWNvcmF0b3JzJzpcbiAgICAgIGNhc2UgJ3N0YXRpYyBmaWVsZHMnOlxuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBbe1xuICAgICAgICAgIG1lc3NhZ2VUZXh0OlxuICAgICAgICAgICAgICAnQW5ndWxhciBjb21waWxlciBvcHRpb25zIFwiYW5ub3RhdGlvbnNBc1wiIG9ubHkgc3VwcG9ydHMgXCJzdGF0aWMgZmllbGRzXCIgYW5kIFwiZGVjb3JhdG9yc1wiJyxcbiAgICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICAgIHNvdXJjZTogU09VUkNFLFxuICAgICAgICAgIGNvZGU6IERFRkFVTFRfRVJST1JfQ09ERVxuICAgICAgICB9XTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIFtdO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVTZXBhcmF0b3JzKHBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBwYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCBjYW4gYWRqdXN0IGEgcGF0aCBmcm9tIHNvdXJjZSBwYXRoIHRvIG91dCBwYXRoLFxuICogYmFzZWQgb24gYW4gZXhpc3RpbmcgbWFwcGluZyBmcm9tIHNvdXJjZSB0byBvdXQgcGF0aC5cbiAqXG4gKiBUT0RPKHRib3NjaCk6IHRhbGsgdG8gdGhlIFR5cGVTY3JpcHQgdGVhbSB0byBleHBvc2UgdGhlaXIgbG9naWMgZm9yIGNhbGN1bGF0aW5nIHRoZSBgcm9vdERpcmBcbiAqIGlmIG5vbmUgd2FzIHNwZWNpZmllZC5cbiAqXG4gKiBOb3RlOiBUaGlzIGZ1bmN0aW9uIHdvcmtzIG9uIG5vcm1hbGl6ZWQgcGF0aHMgZnJvbSB0eXBlc2NyaXB0IGJ1dCBzaG91bGQgYWx3YXlzIHJldHVyblxuICogUE9TSVggbm9ybWFsaXplZCBwYXRocyBmb3Igb3V0cHV0IHBhdGhzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU3JjVG9PdXRQYXRoTWFwcGVyKFxuICAgIG91dERpcjogc3RyaW5nfHVuZGVmaW5lZCwgc2FtcGxlU3JjRmlsZU5hbWU6IHN0cmluZ3x1bmRlZmluZWQsXG4gICAgc2FtcGxlT3V0RmlsZU5hbWU6IHN0cmluZ3x1bmRlZmluZWQsIGhvc3Q6IHtcbiAgICAgIGRpcm5hbWU6IHR5cGVvZiBwYXRoLmRpcm5hbWUsXG4gICAgICByZXNvbHZlOiB0eXBlb2YgcGF0aC5yZXNvbHZlLFxuICAgICAgcmVsYXRpdmU6IHR5cGVvZiBwYXRoLnJlbGF0aXZlXG4gICAgfSA9IHBhdGgpOiAoc3JjRmlsZU5hbWU6IHN0cmluZykgPT4gc3RyaW5nIHtcbiAgaWYgKG91dERpcikge1xuICAgIGxldCBwYXRoOiB7fSA9IHt9OyAgLy8gRW5zdXJlIHdlIGVycm9yIGlmIHdlIHVzZSBgcGF0aGAgaW5zdGVhZCBvZiBgaG9zdGAuXG4gICAgaWYgKHNhbXBsZVNyY0ZpbGVOYW1lID09IG51bGwgfHwgc2FtcGxlT3V0RmlsZU5hbWUgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW4ndCBjYWxjdWxhdGUgdGhlIHJvb3REaXIgd2l0aG91dCBhIHNhbXBsZSBzcmNGaWxlTmFtZSAvIG91dEZpbGVOYW1lLiBgKTtcbiAgICB9XG4gICAgY29uc3Qgc3JjRmlsZURpciA9IG5vcm1hbGl6ZVNlcGFyYXRvcnMoaG9zdC5kaXJuYW1lKHNhbXBsZVNyY0ZpbGVOYW1lKSk7XG4gICAgY29uc3Qgb3V0RmlsZURpciA9IG5vcm1hbGl6ZVNlcGFyYXRvcnMoaG9zdC5kaXJuYW1lKHNhbXBsZU91dEZpbGVOYW1lKSk7XG4gICAgaWYgKHNyY0ZpbGVEaXIgPT09IG91dEZpbGVEaXIpIHtcbiAgICAgIHJldHVybiAoc3JjRmlsZU5hbWUpID0+IHNyY0ZpbGVOYW1lO1xuICAgIH1cbiAgICAvLyBjYWxjdWxhdGUgdGhlIGNvbW1vbiBzdWZmaXgsIHN0b3BwaW5nXG4gICAgLy8gYXQgYG91dERpcmAuXG4gICAgY29uc3Qgc3JjRGlyUGFydHMgPSBzcmNGaWxlRGlyLnNwbGl0KCcvJyk7XG4gICAgY29uc3Qgb3V0RGlyUGFydHMgPSBub3JtYWxpemVTZXBhcmF0b3JzKGhvc3QucmVsYXRpdmUob3V0RGlyLCBvdXRGaWxlRGlyKSkuc3BsaXQoJy8nKTtcbiAgICBsZXQgaSA9IDA7XG4gICAgd2hpbGUgKGkgPCBNYXRoLm1pbihzcmNEaXJQYXJ0cy5sZW5ndGgsIG91dERpclBhcnRzLmxlbmd0aCkgJiZcbiAgICAgICAgICAgc3JjRGlyUGFydHNbc3JjRGlyUGFydHMubGVuZ3RoIC0gMSAtIGldID09PSBvdXREaXJQYXJ0c1tvdXREaXJQYXJ0cy5sZW5ndGggLSAxIC0gaV0pXG4gICAgICBpKys7XG4gICAgY29uc3Qgcm9vdERpciA9IHNyY0RpclBhcnRzLnNsaWNlKDAsIHNyY0RpclBhcnRzLmxlbmd0aCAtIGkpLmpvaW4oJy8nKTtcbiAgICByZXR1cm4gKHNyY0ZpbGVOYW1lKSA9PiB7XG4gICAgICAvLyBOb3RlOiBCZWZvcmUgd2UgcmV0dXJuIHRoZSBtYXBwZWQgb3V0cHV0IHBhdGgsIHdlIG5lZWQgdG8gbm9ybWFsaXplIHRoZSBwYXRoIGRlbGltaXRlcnNcbiAgICAgIC8vIGJlY2F1c2UgdGhlIG91dHB1dCBwYXRoIGlzIHVzdWFsbHkgcGFzc2VkIHRvIFR5cGVTY3JpcHQgd2hpY2ggc29tZXRpbWVzIG9ubHkgZXhwZWN0c1xuICAgICAgLy8gcG9zaXggbm9ybWFsaXplZCBwYXRocyAoZS5nLiBpZiBhIGN1c3RvbSBjb21waWxlciBob3N0IGlzIHVzZWQpXG4gICAgICByZXR1cm4gbm9ybWFsaXplU2VwYXJhdG9ycyhob3N0LnJlc29sdmUob3V0RGlyLCBob3N0LnJlbGF0aXZlKHJvb3REaXIsIHNyY0ZpbGVOYW1lKSkpO1xuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgLy8gTm90ZTogQmVmb3JlIHdlIHJldHVybiB0aGUgb3V0cHV0IHBhdGgsIHdlIG5lZWQgdG8gbm9ybWFsaXplIHRoZSBwYXRoIGRlbGltaXRlcnMgYmVjYXVzZVxuICAgIC8vIHRoZSBvdXRwdXQgcGF0aCBpcyB1c3VhbGx5IHBhc3NlZCB0byBUeXBlU2NyaXB0IHdoaWNoIG9ubHkgcGFzc2VzIGFyb3VuZCBwb3NpeFxuICAgIC8vIG5vcm1hbGl6ZWQgcGF0aHMgKGUuZy4gaWYgYSBjdXN0b20gY29tcGlsZXIgaG9zdCBpcyB1c2VkKVxuICAgIHJldHVybiAoc3JjRmlsZU5hbWUpID0+IG5vcm1hbGl6ZVNlcGFyYXRvcnMoc3JjRmlsZU5hbWUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1lcmdlRW1pdFJlc3VsdHMoZW1pdFJlc3VsdHM6IHRzLkVtaXRSZXN1bHRbXSk6IHRzLkVtaXRSZXN1bHQge1xuICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gIGxldCBlbWl0U2tpcHBlZCA9IGZhbHNlO1xuICBjb25zdCBlbWl0dGVkRmlsZXM6IHN0cmluZ1tdID0gW107XG4gIGZvciAoY29uc3QgZXIgb2YgZW1pdFJlc3VsdHMpIHtcbiAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmVyLmRpYWdub3N0aWNzKTtcbiAgICBlbWl0U2tpcHBlZCA9IGVtaXRTa2lwcGVkIHx8IGVyLmVtaXRTa2lwcGVkO1xuICAgIGVtaXR0ZWRGaWxlcy5wdXNoKC4uLihlci5lbWl0dGVkRmlsZXMgfHwgW10pKTtcbiAgfVxuICByZXR1cm4ge2RpYWdub3N0aWNzLCBlbWl0U2tpcHBlZCwgZW1pdHRlZEZpbGVzfTtcbn1cblxuZnVuY3Rpb24gZGlhZ25vc3RpY1NvdXJjZU9mU3BhbihzcGFuOiBQYXJzZVNvdXJjZVNwYW4pOiB0cy5Tb3VyY2VGaWxlIHtcbiAgLy8gRm9yIGRpYWdub3N0aWNzLCBUeXBlU2NyaXB0IG9ubHkgdXNlcyB0aGUgZmlsZU5hbWUgYW5kIHRleHQgcHJvcGVydGllcy5cbiAgLy8gVGhlIHJlZHVuZGFudCAnKCknIGFyZSBoZXJlIGlzIHRvIGF2b2lkIGhhdmluZyBjbGFuZy1mb3JtYXQgYnJlYWtpbmcgdGhlIGxpbmUgaW5jb3JyZWN0bHkuXG4gIHJldHVybiAoe2ZpbGVOYW1lOiBzcGFuLnN0YXJ0LmZpbGUudXJsLCB0ZXh0OiBzcGFuLnN0YXJ0LmZpbGUuY29udGVudH0gYXMgYW55KTtcbn1cblxuZnVuY3Rpb24gZGlhZ25vc3RpY1NvdXJjZU9mRmlsZU5hbWUoZmlsZU5hbWU6IHN0cmluZywgcHJvZ3JhbTogdHMuUHJvZ3JhbSk6IHRzLlNvdXJjZUZpbGUge1xuICBjb25zdCBzb3VyY2VGaWxlID0gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKTtcbiAgaWYgKHNvdXJjZUZpbGUpIHJldHVybiBzb3VyY2VGaWxlO1xuXG4gIC8vIElmIHdlIGFyZSByZXBvcnRpbmcgZGlhZ25vc3RpY3MgZm9yIGEgc291cmNlIGZpbGUgdGhhdCBpcyBub3QgaW4gdGhlIHByb2plY3QgdGhlbiB3ZSBuZWVkXG4gIC8vIHRvIGZha2UgYSBzb3VyY2UgZmlsZSBzbyB0aGUgZGlhZ25vc3RpYyBmb3JtYXR0aW5nIHJvdXRpbmVzIGNhbiBlbWl0IHRoZSBmaWxlIG5hbWUuXG4gIC8vIFRoZSByZWR1bmRhbnQgJygpJyBhcmUgaGVyZSBpcyB0byBhdm9pZCBoYXZpbmcgY2xhbmctZm9ybWF0IGJyZWFraW5nIHRoZSBsaW5lIGluY29ycmVjdGx5LlxuICByZXR1cm4gKHtmaWxlTmFtZSwgdGV4dDogJyd9IGFzIGFueSk7XG59XG5cblxuZnVuY3Rpb24gZGlhZ25vc3RpY0NoYWluRnJvbUZvcm1hdHRlZERpYWdub3N0aWNDaGFpbihjaGFpbjogRm9ybWF0dGVkTWVzc2FnZUNoYWluKTpcbiAgICBEaWFnbm9zdGljTWVzc2FnZUNoYWluIHtcbiAgcmV0dXJuIHtcbiAgICBtZXNzYWdlVGV4dDogY2hhaW4ubWVzc2FnZSxcbiAgICBuZXh0OiBjaGFpbi5uZXh0ICYmIGNoYWluLm5leHQubWFwKGRpYWdub3N0aWNDaGFpbkZyb21Gb3JtYXR0ZWREaWFnbm9zdGljQ2hhaW4pLFxuICAgIHBvc2l0aW9uOiBjaGFpbi5wb3NpdGlvblxuICB9O1xufVxuXG5mdW5jdGlvbiBzeW50YXhFcnJvclRvRGlhZ25vc3RpY3MoZXJyb3I6IEVycm9yLCBwcm9ncmFtOiB0cy5Qcm9ncmFtKTogRGlhZ25vc3RpY1tdIHtcbiAgY29uc3QgcGFyc2VyRXJyb3JzID0gZ2V0UGFyc2VFcnJvcnMoZXJyb3IpO1xuICBpZiAocGFyc2VyRXJyb3JzICYmIHBhcnNlckVycm9ycy5sZW5ndGgpIHtcbiAgICByZXR1cm4gcGFyc2VyRXJyb3JzLm1hcDxEaWFnbm9zdGljPihlID0+ICh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlVGV4dDogZS5jb250ZXh0dWFsTWVzc2FnZSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZTogZGlhZ25vc3RpY1NvdXJjZU9mU3BhbihlLnNwYW4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IGUuc3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZW5ndGg6IGUuc3Bhbi5lbmQub2Zmc2V0IC0gZS5zcGFuLnN0YXJ0Lm9mZnNldCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IFNPVVJDRSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IERFRkFVTFRfRVJST1JfQ09ERVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgfSBlbHNlIGlmIChpc0Zvcm1hdHRlZEVycm9yKGVycm9yKSkge1xuICAgIHJldHVybiBbe1xuICAgICAgbWVzc2FnZVRleHQ6IGVycm9yLm1lc3NhZ2UsXG4gICAgICBjaGFpbjogZXJyb3IuY2hhaW4gJiYgZGlhZ25vc3RpY0NoYWluRnJvbUZvcm1hdHRlZERpYWdub3N0aWNDaGFpbihlcnJvci5jaGFpbiksXG4gICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgc291cmNlOiBTT1VSQ0UsXG4gICAgICBjb2RlOiBERUZBVUxUX0VSUk9SX0NPREUsXG4gICAgICBwb3NpdGlvbjogZXJyb3IucG9zaXRpb25cbiAgICB9XTtcbiAgfVxuXG4gIGNvbnN0IG5nTW9kdWxlRXJyb3JEYXRhID0gZ2V0TWlzc2luZ05nTW9kdWxlTWV0YWRhdGFFcnJvckRhdGEoZXJyb3IpO1xuICBpZiAobmdNb2R1bGVFcnJvckRhdGEgIT09IG51bGwpIHtcbiAgICAvLyBUaGlzIGVycm9yIHJlcHJlc2VudHMgdGhlIGltcG9ydCBvciBleHBvcnQgb2YgYW4gYE5nTW9kdWxlYCB0aGF0IGRpZG4ndCBoYXZlIHZhbGlkIG1ldGFkYXRhLlxuICAgIC8vIFRoaXMgX21pZ2h0XyBoYXBwZW4gYmVjYXVzZSB0aGUgTmdNb2R1bGUgaW4gcXVlc3Rpb24gaXMgYW4gSXZ5LWNvbXBpbGVkIGxpYnJhcnksIGFuZCB3ZSB3YW50XG4gICAgLy8gdG8gc2hvdyBhIG1vcmUgdXNlZnVsIGVycm9yIGlmIHRoYXQncyB0aGUgY2FzZS5cbiAgICBjb25zdCBuZ01vZHVsZUNsYXNzID1cbiAgICAgICAgZ2V0RHRzQ2xhc3MocHJvZ3JhbSwgbmdNb2R1bGVFcnJvckRhdGEuZmlsZU5hbWUsIG5nTW9kdWxlRXJyb3JEYXRhLmNsYXNzTmFtZSk7XG4gICAgaWYgKG5nTW9kdWxlQ2xhc3MgIT09IG51bGwgJiYgaXNJdnlOZ01vZHVsZShuZ01vZHVsZUNsYXNzKSkge1xuICAgICAgcmV0dXJuIFt7XG4gICAgICAgIG1lc3NhZ2VUZXh0OiBgVGhlIE5nTW9kdWxlICcke25nTW9kdWxlRXJyb3JEYXRhLmNsYXNzTmFtZX0nIGluICcke1xuICAgICAgICAgICAgbmdNb2R1bGVFcnJvckRhdGFcbiAgICAgICAgICAgICAgICAuZmlsZU5hbWV9JyBpcyBpbXBvcnRlZCBieSB0aGlzIGNvbXBpbGF0aW9uLCBidXQgYXBwZWFycyB0byBiZSBwYXJ0IG9mIGEgbGlicmFyeSBjb21waWxlZCBmb3IgQW5ndWxhciBJdnkuIFRoaXMgbWF5IG9jY3VyIGJlY2F1c2U6XG5cbiAgMSkgdGhlIGxpYnJhcnkgd2FzIHByb2Nlc3NlZCB3aXRoICduZ2NjJy4gUmVtb3ZpbmcgYW5kIHJlaW5zdGFsbGluZyBub2RlX21vZHVsZXMgbWF5IGZpeCB0aGlzIHByb2JsZW0uXG5cbiAgMikgdGhlIGxpYnJhcnkgd2FzIHB1Ymxpc2hlZCBmb3IgQW5ndWxhciBJdnkgYW5kIHYxMisgYXBwbGljYXRpb25zIG9ubHkuIENoZWNrIGl0cyBwZWVyIGRlcGVuZGVuY2llcyBjYXJlZnVsbHkgYW5kIGVuc3VyZSB0aGF0IHlvdSdyZSB1c2luZyBhIGNvbXBhdGlibGUgdmVyc2lvbiBvZiBBbmd1bGFyLlxuXG5TZWUgaHR0cHM6Ly9hbmd1bGFyLmlvL2Vycm9ycy9ORzY5OTkgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG5gLFxuICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICBjb2RlOiBERUZBVUxUX0VSUk9SX0NPREUsXG4gICAgICAgIHNvdXJjZTogU09VUkNFLFxuICAgICAgfV07XG4gICAgfVxuICB9XG5cbiAgLy8gUHJvZHVjZSBhIERpYWdub3N0aWMgYW55d2F5IHNpbmNlIHdlIGtub3cgZm9yIHN1cmUgYGVycm9yYCBpcyBhIFN5bnRheEVycm9yXG4gIHJldHVybiBbe1xuICAgIG1lc3NhZ2VUZXh0OiBlcnJvci5tZXNzYWdlLFxuICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgY29kZTogREVGQVVMVF9FUlJPUl9DT0RFLFxuICAgIHNvdXJjZTogU09VUkNFLFxuICB9XTtcbn1cblxuZnVuY3Rpb24gZ2V0RHRzQ2xhc3MocHJvZ3JhbTogdHMuUHJvZ3JhbSwgZmlsZU5hbWU6IHN0cmluZywgY2xhc3NOYW1lOiBzdHJpbmcpOiB0cy5DbGFzc0RlY2xhcmF0aW9ufFxuICAgIG51bGwge1xuICBjb25zdCBzZiA9IHByb2dyYW0uZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gIGlmIChzZiA9PT0gdW5kZWZpbmVkIHx8ICFzZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGZvciAoY29uc3Qgc3RtdCBvZiBzZi5zdGF0ZW1lbnRzKSB7XG4gICAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24oc3RtdCkpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAoc3RtdC5uYW1lID09PSB1bmRlZmluZWQgfHwgc3RtdC5uYW1lLnRleHQgIT09IGNsYXNzTmFtZSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0bXQ7XG4gIH1cblxuICAvLyBObyBjbGFzc2VzIGZvdW5kIHRoYXQgbWF0Y2hlZCB0aGUgZ2l2ZW4gbmFtZS5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzSXZ5TmdNb2R1bGUoY2xheno6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgZm9yIChjb25zdCBtZW1iZXIgb2YgY2xhenoubWVtYmVycykge1xuICAgIGlmICghdHMuaXNQcm9wZXJ0eURlY2xhcmF0aW9uKG1lbWJlcikpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAodHMuaXNJZGVudGlmaWVyKG1lbWJlci5uYW1lKSAmJiBtZW1iZXIubmFtZS50ZXh0ID09PSAnybVtb2QnKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICAvLyBObyBJdnkgJ8m1bW9kJyBwcm9wZXJ0eSBmb3VuZC5cbiAgcmV0dXJuIGZhbHNlO1xufVxuIl19