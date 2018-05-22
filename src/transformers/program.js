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
        define("@angular/compiler-cli/src/transformers/program", ["require", "exports", "tslib", "@angular/compiler", "fs", "path", "typescript", "@angular/compiler-cli/src/diagnostics/translate_diagnostics", "@angular/compiler-cli/src/diagnostics/typescript_version", "@angular/compiler-cli/src/metadata/index", "@angular/compiler-cli/src/ngtsc/program", "@angular/compiler-cli/src/transformers/api", "@angular/compiler-cli/src/transformers/compiler_host", "@angular/compiler-cli/src/transformers/inline_resources", "@angular/compiler-cli/src/transformers/lower_expressions", "@angular/compiler-cli/src/transformers/metadata_cache", "@angular/compiler-cli/src/transformers/node_emitter_transform", "@angular/compiler-cli/src/transformers/r3_metadata_transform", "@angular/compiler-cli/src/transformers/r3_strip_decorators", "@angular/compiler-cli/src/transformers/r3_transform", "@angular/compiler-cli/src/transformers/util"], factory);
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
    var index_1 = require("@angular/compiler-cli/src/metadata/index");
    var program_1 = require("@angular/compiler-cli/src/ngtsc/program");
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
    // Closure compiler transforms the form `Service.ngInjectableDef = X` into
    // `Service$ngInjectableDef = X`. To prevent this transformation, such assignments need to be
    // annotated with @nocollapse. Unfortunately, a bug in Typescript where comments aren't propagated
    // through the TS transformations precludes adding the comment via the AST. This workaround detects
    // the static assignments to R3 properties such as ngInjectableDef using a regex, as output files
    // are written, and applies the annotation through regex replacement.
    //
    // TODO(alxhub): clean up once fix for TS transformers lands in upstream
    //
    // Typescript reference issue: https://github.com/Microsoft/TypeScript/issues/22497
    // Pattern matching all Render3 property names.
    var R3_DEF_NAME_PATTERN = ['ngInjectableDef'].join('|');
    // Pattern matching `Identifier.property` where property is a Render3 property.
    var R3_DEF_ACCESS_PATTERN = "[^\\s\\.()[\\]]+.(" + R3_DEF_NAME_PATTERN + ")";
    // Pattern matching a source line that contains a Render3 static property assignment.
    // It declares two matching groups - one for the preceding whitespace, the second for the rest
    // of the assignment expression.
    var R3_DEF_LINE_PATTERN = "^(\\s*)(" + R3_DEF_ACCESS_PATTERN + " = .*)$";
    // Regex compilation of R3_DEF_LINE_PATTERN. Matching group 1 yields the whitespace preceding the
    // assignment, matching group 2 gives the rest of the assignment expressions.
    var R3_MATCH_DEFS = new RegExp(R3_DEF_LINE_PATTERN, 'gmu');
    // Replacement string that complements R3_MATCH_DEFS. It inserts `/** @nocollapse */` before the
    // assignment but after any indentation. Note that this will mess up any sourcemaps on this line
    // (though there shouldn't be any, since Render3 properties are synthetic).
    var R3_NOCOLLAPSE_DEFS = '$1\/** @nocollapse *\/ $2';
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
    var MIN_TS_VERSION = '2.7.2';
    /**
     * Supremum of supported TypeScript versions
     * ∀ supported typescript version v, v < MAX_TS_VERSION
     * MAX_TS_VERSION is not considered as a supported TypeScript version
     */
    var MAX_TS_VERSION = '2.9.0';
    var AngularCompilerProgram = /** @class */ (function () {
        function AngularCompilerProgram(rootNames, options, host, oldProgram) {
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
                var _a = index_1.createBundleIndexHost(options, this.rootNames, host, function () { return _this.flatModuleMetadataCache; }), bundleHost = _a.host, indexName = _a.indexName, errors = _a.errors;
                if (errors) {
                    (_b = this._optionsDiagnostics).push.apply(_b, tslib_1.__spread(errors.map(function (e) { return ({
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
                new lower_expressions_1.LowerMetadataTransform(options.enableIvy ? R3_LOWER_FIELDS : LOWER_FIELDS);
            this.metadataCache = this.createMetadataCache([this.loweringMetadataTransform]);
            var _b;
        }
        AngularCompilerProgram.prototype.createMetadataCache = function (transformers) {
            return new metadata_cache_1.MetadataCache(new index_1.MetadataCollector({ quotedNames: true }), !!this.options.strictMetadataEmit, transformers);
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
            if (this.options.enableIvy === 'ngtsc') {
                throw new Error('Cannot run legacy compiler in ngtsc mode');
            }
            return this.options.enableIvy === true ? this._emitRender3(parameters) :
                this._emitRender2(parameters);
        };
        AngularCompilerProgram.prototype._annotateR3Properties = function (contents) {
            return contents.replace(R3_MATCH_DEFS, R3_NOCOLLAPSE_DEFS);
        };
        AngularCompilerProgram.prototype._emitRender3 = function (_a) {
            var _this = this;
            var _b = _a === void 0 ? {} : _a, _c = _b.emitFlags, emitFlags = _c === void 0 ? api_1.EmitFlags.Default : _c, cancellationToken = _b.cancellationToken, customTransformers = _b.customTransformers, _d = _b.emitCallback, emitCallback = _d === void 0 ? defaultEmitCallback : _d, _e = _b.mergeEmitResultsCallback, mergeEmitResultsCallback = _e === void 0 ? mergeEmitResults : _e;
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
                    outData = _this._annotateR3Properties(outData);
                }
                _this.writeFile(outFileName, outData, writeByteOrderMark, onError, undefined, sourceFiles);
            };
            var emitOnlyDtsFiles = (emitFlags & (api_1.EmitFlags.DTS | api_1.EmitFlags.JS)) == api_1.EmitFlags.DTS;
            var tsCustomTransformers = this.calculateTransforms(
            /* genFiles */ undefined, /* partialModules */ modules, 
            /* stripDecorators */ this.reifiedDecorators, customTransformers);
            var emitResult = emitCallback({
                program: this.tsProgram,
                host: this.host,
                options: this.options,
                writeFile: writeTsFile, emitOnlyDtsFiles: emitOnlyDtsFiles,
                customTransformers: tsCustomTransformers
            });
            return emitResult;
        };
        AngularCompilerProgram.prototype._emitRender2 = function (_a) {
            var _this = this;
            var _b = _a === void 0 ? {} : _a, _c = _b.emitFlags, emitFlags = _c === void 0 ? api_1.EmitFlags.Default : _c, cancellationToken = _b.cancellationToken, customTransformers = _b.customTransformers, _d = _b.emitCallback, emitCallback = _d === void 0 ? defaultEmitCallback : _d, _e = _b.mergeEmitResultsCallback, mergeEmitResultsCallback = _e === void 0 ? mergeEmitResults : _e;
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
            var _f = this.generateFilesForEmit(emitFlags), genFiles = _f.genFiles, genDiags = _f.genDiags;
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
                        outData = _this._annotateR3Properties(outData);
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
                for (var _g = tslib_1.__values(this.tsProgram.getSourceFiles()), _h = _g.next(); !_h.done; _h = _g.next()) {
                    var sourceFile = _h.value;
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
                    if (_h && !_h.done && (_j = _g.return)) _j.call(_g);
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
                    for (var _k = tslib_1.__values(Array.from(augmentedReferences)), _l = _k.next(); !_l.done; _l = _k.next()) {
                        var _m = tslib_1.__read(_l.value, 2), sourceFile = _m[0], references = _m[1];
                        // TODO(chuckj): Remove any cast after updating build to 2.6
                        sourceFile.referencedFiles = references;
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_l && !_l.done && (_o = _k.return)) _o.call(_k);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            this.emittedSourceFiles = emittedSourceFiles;
            // Match behavior of tsc: only produce emit diagnostics if it would block
            // emit. If noEmitOnError is false, the emit will happen in spite of any
            // errors, so we should not report them.
            if (this.options.noEmitOnError === true) {
                // translate the diagnostics in the emitResult as well.
                var translatedEmitDiags = translate_diagnostics_1.translateDiagnostics(this.hostAdapter, emitResult.diagnostics);
                emitResult.diagnostics = translatedEmitDiags.ts.concat(this.structuralDiagnostics.concat(translatedEmitDiags.ng).map(util_1.ngToTsDiagnostic));
            }
            if (!outSrcMapping.length) {
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
            if (this.options.diagnostics) {
                emitResult.diagnostics = emitResult.diagnostics.concat([util_1.createMessageDiagnostic([
                        "Emitted in " + (emitEnd - emitStart) + "ms",
                        "- " + emittedUserTsCount + " user ts files",
                        "- " + genTsFiles.length + " generated ts files",
                        "- " + (genJsonFiles.length + metadataJsonCount) + " generated json files",
                    ].join('\n'))]);
            }
            return emitResult;
            var e_1, _j, e_2, _o;
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
        if (options.enableIvy === 'ngtsc') {
            return new program_1.NgtscProgram(rootNames, options, host, oldProgram);
        }
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
            enableSummariesForJit: options.enableSummariesForJit,
            preserveWhitespaces: options.preserveWhitespaces,
            fullTemplateTypeCheck: options.fullTemplateTypeCheck,
            allowEmptyCodegenFiles: options.allowEmptyCodegenFiles,
            enableIvy: options.enableIvy,
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
     * Note: This function works on normalized paths from typescript.
     *
     * @param outDir
     * @param outSrcMappings
     */
    function createSrcToOutPathMapper(outDir, sampleSrcFileName, sampleOutFileName, host) {
        if (host === void 0) { host = path; }
        var srcToOutPath;
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
            srcToOutPath = function (srcFileName) { return host.resolve(outDir, host.relative(rootDir_1, srcFileName)); };
        }
        else {
            srcToOutPath = function (srcFileName) { return srcFileName; };
        }
        return srcToOutPath;
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
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (emitResults_1_1 && !emitResults_1_1.done && (_a = emitResults_1.return)) _a.call(emitResults_1);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return { diagnostics: diagnostics, emitSkipped: emitSkipped, emittedFiles: emittedFiles };
        var e_3, _a;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3JhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL3Byb2dyYW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0E7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQXNaO0lBQ3RaLHVCQUF5QjtJQUN6QiwyQkFBNkI7SUFDN0IsK0JBQWlDO0lBRWpDLHFHQUF5RjtJQUN6RiwrRkFBa0U7SUFDbEUsa0VBQTJGO0lBQzNGLG1FQUE4QztJQUU5QyxrRUFBb1A7SUFDcFAsc0ZBQWdIO0lBQ2hILDRGQUEwRztJQUMxRyw4RkFBa0c7SUFDbEcsd0ZBQW9FO0lBQ3BFLHdHQUEyRTtJQUMzRSxzR0FBeUU7SUFDekUsa0dBQThHO0lBQzlHLG9GQUFpRTtJQUNqRSxvRUFBMko7SUFHM0osMEVBQTBFO0lBQzFFLDZGQUE2RjtJQUM3RixrR0FBa0c7SUFDbEcsbUdBQW1HO0lBQ25HLGlHQUFpRztJQUNqRyxxRUFBcUU7SUFDckUsRUFBRTtJQUNGLHdFQUF3RTtJQUN4RSxFQUFFO0lBQ0YsbUZBQW1GO0lBRW5GLCtDQUErQztJQUMvQyxJQUFNLG1CQUFtQixHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFMUQsK0VBQStFO0lBQy9FLElBQU0scUJBQXFCLEdBQUcsdUJBQXNCLG1CQUFtQixNQUFHLENBQUM7SUFFM0UscUZBQXFGO0lBQ3JGLDhGQUE4RjtJQUM5RixnQ0FBZ0M7SUFDaEMsSUFBTSxtQkFBbUIsR0FBRyxhQUFXLHFCQUFxQixZQUFTLENBQUM7SUFFdEUsaUdBQWlHO0lBQ2pHLDZFQUE2RTtJQUM3RSxJQUFNLGFBQWEsR0FBRyxJQUFJLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUU3RCxnR0FBZ0c7SUFDaEcsZ0dBQWdHO0lBQ2hHLDJFQUEyRTtJQUMz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QUFLLEVBQUUsS0FBSyxDQUFDLEtBQUssSUFBSSwyQ0FBMkMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO29CQUM5RSxRQUFRLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUs7b0JBQ3JDLE1BQU0sRUFBRSxZQUFNO29CQUNkLElBQUksRUFBRSx3QkFBa0I7b0JBQ3hCLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUTtpQkFDekIsQ0FBQyxDQUFDO1NBQ0o7UUFDRCw4RUFBOEU7UUFDOUUsT0FBTyxDQUFDO2dCQUNOLFdBQVcsRUFBRSxLQUFLLENBQUMsT0FBTztnQkFDMUIsUUFBUSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLO2dCQUNyQyxJQUFJLEVBQUUsd0JBQWtCO2dCQUN4QixNQUFNLEVBQUUsWUFBTTthQUNmLENBQUMsQ0FBQztJQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJcbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBb3RDb21waWxlciwgQW90Q29tcGlsZXJIb3N0LCBBb3RDb21waWxlck9wdGlvbnMsIEVtaXR0ZXJWaXNpdG9yQ29udGV4dCwgRm9ybWF0dGVkTWVzc2FnZUNoYWluLCBHZW5lcmF0ZWRGaWxlLCBNZXNzYWdlQnVuZGxlLCBOZ0FuYWx5emVkRmlsZSwgTmdBbmFseXplZEZpbGVXaXRoSW5qZWN0YWJsZXMsIE5nQW5hbHl6ZWRNb2R1bGVzLCBQYXJzZVNvdXJjZVNwYW4sIFBhcnRpYWxNb2R1bGUsIFBvc2l0aW9uLCBTZXJpYWxpemVyLCBTdGF0aWNTeW1ib2wsIFR5cGVTY3JpcHRFbWl0dGVyLCBYbGlmZiwgWGxpZmYyLCBYbWIsIGNvcmUsIGNyZWF0ZUFvdENvbXBpbGVyLCBnZXRQYXJzZUVycm9ycywgaXNGb3JtYXR0ZWRFcnJvciwgaXNTeW50YXhFcnJvcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1R5cGVDaGVja0hvc3QsIHRyYW5zbGF0ZURpYWdub3N0aWNzfSBmcm9tICcuLi9kaWFnbm9zdGljcy90cmFuc2xhdGVfZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtjb21wYXJlVmVyc2lvbnN9IGZyb20gJy4uL2RpYWdub3N0aWNzL3R5cGVzY3JpcHRfdmVyc2lvbic7XG5pbXBvcnQge01ldGFkYXRhQ29sbGVjdG9yLCBNb2R1bGVNZXRhZGF0YSwgY3JlYXRlQnVuZGxlSW5kZXhIb3N0fSBmcm9tICcuLi9tZXRhZGF0YS9pbmRleCc7XG5pbXBvcnQge05ndHNjUHJvZ3JhbX0gZnJvbSAnLi4vbmd0c2MvcHJvZ3JhbSc7XG5cbmltcG9ydCB7Q29tcGlsZXJIb3N0LCBDb21waWxlck9wdGlvbnMsIEN1c3RvbVRyYW5zZm9ybWVycywgREVGQVVMVF9FUlJPUl9DT0RFLCBEaWFnbm9zdGljLCBEaWFnbm9zdGljTWVzc2FnZUNoYWluLCBFbWl0RmxhZ3MsIExhenlSb3V0ZSwgTGlicmFyeVN1bW1hcnksIFByb2dyYW0sIFNPVVJDRSwgVHNFbWl0QXJndW1lbnRzLCBUc0VtaXRDYWxsYmFjaywgVHNNZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2t9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7Q29kZUdlbmVyYXRvciwgVHNDb21waWxlckFvdENvbXBpbGVyVHlwZUNoZWNrSG9zdEFkYXB0ZXIsIGdldE9yaWdpbmFsUmVmZXJlbmNlc30gZnJvbSAnLi9jb21waWxlcl9ob3N0JztcbmltcG9ydCB7SW5saW5lUmVzb3VyY2VzTWV0YWRhdGFUcmFuc2Zvcm1lciwgZ2V0SW5saW5lUmVzb3VyY2VzVHJhbnNmb3JtRmFjdG9yeX0gZnJvbSAnLi9pbmxpbmVfcmVzb3VyY2VzJztcbmltcG9ydCB7TG93ZXJNZXRhZGF0YVRyYW5zZm9ybSwgZ2V0RXhwcmVzc2lvbkxvd2VyaW5nVHJhbnNmb3JtRmFjdG9yeX0gZnJvbSAnLi9sb3dlcl9leHByZXNzaW9ucyc7XG5pbXBvcnQge01ldGFkYXRhQ2FjaGUsIE1ldGFkYXRhVHJhbnNmb3JtZXJ9IGZyb20gJy4vbWV0YWRhdGFfY2FjaGUnO1xuaW1wb3J0IHtnZXRBbmd1bGFyRW1pdHRlclRyYW5zZm9ybUZhY3Rvcnl9IGZyb20gJy4vbm9kZV9lbWl0dGVyX3RyYW5zZm9ybSc7XG5pbXBvcnQge1BhcnRpYWxNb2R1bGVNZXRhZGF0YVRyYW5zZm9ybWVyfSBmcm9tICcuL3IzX21ldGFkYXRhX3RyYW5zZm9ybSc7XG5pbXBvcnQge1N0cmlwRGVjb3JhdG9yc01ldGFkYXRhVHJhbnNmb3JtZXIsIGdldERlY29yYXRvclN0cmlwVHJhbnNmb3JtZXJGYWN0b3J5fSBmcm9tICcuL3IzX3N0cmlwX2RlY29yYXRvcnMnO1xuaW1wb3J0IHtnZXRBbmd1bGFyQ2xhc3NUcmFuc2Zvcm1lckZhY3Rvcnl9IGZyb20gJy4vcjNfdHJhbnNmb3JtJztcbmltcG9ydCB7RFRTLCBHRU5FUkFURURfRklMRVMsIFN0cnVjdHVyZUlzUmV1c2VkLCBUUywgY3JlYXRlTWVzc2FnZURpYWdub3N0aWMsIGlzSW5Sb290RGlyLCBuZ1RvVHNEaWFnbm9zdGljLCB0c1N0cnVjdHVyZUlzUmV1c2VkLCB1c2VyRXJyb3J9IGZyb20gJy4vdXRpbCc7XG5cblxuLy8gQ2xvc3VyZSBjb21waWxlciB0cmFuc2Zvcm1zIHRoZSBmb3JtIGBTZXJ2aWNlLm5nSW5qZWN0YWJsZURlZiA9IFhgIGludG9cbi8vIGBTZXJ2aWNlJG5nSW5qZWN0YWJsZURlZiA9IFhgLiBUbyBwcmV2ZW50IHRoaXMgdHJhbnNmb3JtYXRpb24sIHN1Y2ggYXNzaWdubWVudHMgbmVlZCB0byBiZVxuLy8gYW5ub3RhdGVkIHdpdGggQG5vY29sbGFwc2UuIFVuZm9ydHVuYXRlbHksIGEgYnVnIGluIFR5cGVzY3JpcHQgd2hlcmUgY29tbWVudHMgYXJlbid0IHByb3BhZ2F0ZWRcbi8vIHRocm91Z2ggdGhlIFRTIHRyYW5zZm9ybWF0aW9ucyBwcmVjbHVkZXMgYWRkaW5nIHRoZSBjb21tZW50IHZpYSB0aGUgQVNULiBUaGlzIHdvcmthcm91bmQgZGV0ZWN0c1xuLy8gdGhlIHN0YXRpYyBhc3NpZ25tZW50cyB0byBSMyBwcm9wZXJ0aWVzIHN1Y2ggYXMgbmdJbmplY3RhYmxlRGVmIHVzaW5nIGEgcmVnZXgsIGFzIG91dHB1dCBmaWxlc1xuLy8gYXJlIHdyaXR0ZW4sIGFuZCBhcHBsaWVzIHRoZSBhbm5vdGF0aW9uIHRocm91Z2ggcmVnZXggcmVwbGFjZW1lbnQuXG4vL1xuLy8gVE9ETyhhbHhodWIpOiBjbGVhbiB1cCBvbmNlIGZpeCBmb3IgVFMgdHJhbnNmb3JtZXJzIGxhbmRzIGluIHVwc3RyZWFtXG4vL1xuLy8gVHlwZXNjcmlwdCByZWZlcmVuY2UgaXNzdWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMjI0OTdcblxuLy8gUGF0dGVybiBtYXRjaGluZyBhbGwgUmVuZGVyMyBwcm9wZXJ0eSBuYW1lcy5cbmNvbnN0IFIzX0RFRl9OQU1FX1BBVFRFUk4gPSBbJ25nSW5qZWN0YWJsZURlZiddLmpvaW4oJ3wnKTtcblxuLy8gUGF0dGVybiBtYXRjaGluZyBgSWRlbnRpZmllci5wcm9wZXJ0eWAgd2hlcmUgcHJvcGVydHkgaXMgYSBSZW5kZXIzIHByb3BlcnR5LlxuY29uc3QgUjNfREVGX0FDQ0VTU19QQVRURVJOID0gYFteXFxcXHNcXFxcLigpW1xcXFxdXStcXC4oJHtSM19ERUZfTkFNRV9QQVRURVJOfSlgO1xuXG4vLyBQYXR0ZXJuIG1hdGNoaW5nIGEgc291cmNlIGxpbmUgdGhhdCBjb250YWlucyBhIFJlbmRlcjMgc3RhdGljIHByb3BlcnR5IGFzc2lnbm1lbnQuXG4vLyBJdCBkZWNsYXJlcyB0d28gbWF0Y2hpbmcgZ3JvdXBzIC0gb25lIGZvciB0aGUgcHJlY2VkaW5nIHdoaXRlc3BhY2UsIHRoZSBzZWNvbmQgZm9yIHRoZSByZXN0XG4vLyBvZiB0aGUgYXNzaWdubWVudCBleHByZXNzaW9uLlxuY29uc3QgUjNfREVGX0xJTkVfUEFUVEVSTiA9IGBeKFxcXFxzKikoJHtSM19ERUZfQUNDRVNTX1BBVFRFUk59ID0gLiopJGA7XG5cbi8vIFJlZ2V4IGNvbXBpbGF0aW9uIG9mIFIzX0RFRl9MSU5FX1BBVFRFUk4uIE1hdGNoaW5nIGdyb3VwIDEgeWllbGRzIHRoZSB3aGl0ZXNwYWNlIHByZWNlZGluZyB0aGVcbi8vIGFzc2lnbm1lbnQsIG1hdGNoaW5nIGdyb3VwIDIgZ2l2ZXMgdGhlIHJlc3Qgb2YgdGhlIGFzc2lnbm1lbnQgZXhwcmVzc2lvbnMuXG5jb25zdCBSM19NQVRDSF9ERUZTID0gbmV3IFJlZ0V4cChSM19ERUZfTElORV9QQVRURVJOLCAnZ211Jyk7XG5cbi8vIFJlcGxhY2VtZW50IHN0cmluZyB0aGF0IGNvbXBsZW1lbnRzIFIzX01BVENIX0RFRlMuIEl0IGluc2VydHMgYC8qKiBAbm9jb2xsYXBzZSAqL2AgYmVmb3JlIHRoZVxuLy8gYXNzaWdubWVudCBidXQgYWZ0ZXIgYW55IGluZGVudGF0aW9uLiBOb3RlIHRoYXQgdGhpcyB3aWxsIG1lc3MgdXAgYW55IHNvdXJjZW1hcHMgb24gdGhpcyBsaW5lXG4vLyAodGhvdWdoIHRoZXJlIHNob3VsZG4ndCBiZSBhbnksIHNpbmNlIFJlbmRlcjMgcHJvcGVydGllcyBhcmUgc3ludGhldGljKS5cbmNvbnN0IFIzX05PQ09MTEFQU0VfREVGUyA9ICckMVxcLyoqIEBub2NvbGxhcHNlICpcXC8gJDInO1xuXG4vKipcbiAqIE1heGltdW0gbnVtYmVyIG9mIGZpbGVzIHRoYXQgYXJlIGVtaXRhYmxlIHZpYSBjYWxsaW5nIHRzLlByb2dyYW0uZW1pdFxuICogcGFzc2luZyBpbmRpdmlkdWFsIHRhcmdldFNvdXJjZUZpbGVzLlxuICovXG5jb25zdCBNQVhfRklMRV9DT1VOVF9GT1JfU0lOR0xFX0ZJTEVfRU1JVCA9IDIwO1xuXG5cbi8qKlxuICogRmllbGRzIHRvIGxvd2VyIHdpdGhpbiBtZXRhZGF0YSBpbiByZW5kZXIyIG1vZGUuXG4gKi9cbmNvbnN0IExPV0VSX0ZJRUxEUyA9IFsndXNlVmFsdWUnLCAndXNlRmFjdG9yeScsICdkYXRhJywgJ2lkJywgJ2xvYWRDaGlsZHJlbiddO1xuXG4vKipcbiAqIEZpZWxkcyB0byBsb3dlciB3aXRoaW4gbWV0YWRhdGEgaW4gcmVuZGVyMyBtb2RlLlxuICovXG5jb25zdCBSM19MT1dFUl9GSUVMRFMgPSBbLi4uTE9XRVJfRklFTERTLCAncHJvdmlkZXJzJywgJ2ltcG9ydHMnLCAnZXhwb3J0cyddO1xuXG5jb25zdCBSM19SRUlGSUVEX0RFQ09SQVRPUlMgPSBbXG4gICdDb21wb25lbnQnLFxuICAnRGlyZWN0aXZlJyxcbiAgJ0luamVjdGFibGUnLFxuICAnTmdNb2R1bGUnLFxuICAnUGlwZScsXG5dO1xuXG5jb25zdCBlbXB0eU1vZHVsZXM6IE5nQW5hbHl6ZWRNb2R1bGVzID0ge1xuICBuZ01vZHVsZXM6IFtdLFxuICBuZ01vZHVsZUJ5UGlwZU9yRGlyZWN0aXZlOiBuZXcgTWFwKCksXG4gIGZpbGVzOiBbXVxufTtcblxuY29uc3QgZGVmYXVsdEVtaXRDYWxsYmFjazogVHNFbWl0Q2FsbGJhY2sgPVxuICAgICh7cHJvZ3JhbSwgdGFyZ2V0U291cmNlRmlsZSwgd3JpdGVGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbiwgZW1pdE9ubHlEdHNGaWxlcyxcbiAgICAgIGN1c3RvbVRyYW5zZm9ybWVyc30pID0+XG4gICAgICAgIHByb2dyYW0uZW1pdChcbiAgICAgICAgICAgIHRhcmdldFNvdXJjZUZpbGUsIHdyaXRlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4sIGVtaXRPbmx5RHRzRmlsZXMsIGN1c3RvbVRyYW5zZm9ybWVycyk7XG5cbi8qKlxuICogTWluaW11bSBzdXBwb3J0ZWQgVHlwZVNjcmlwdCB2ZXJzaW9uXG4gKiDiiIAgc3VwcG9ydGVkIHR5cGVzY3JpcHQgdmVyc2lvbiB2LCB2ID49IE1JTl9UU19WRVJTSU9OXG4gKi9cbmNvbnN0IE1JTl9UU19WRVJTSU9OID0gJzIuNy4yJztcblxuLyoqXG4gKiBTdXByZW11bSBvZiBzdXBwb3J0ZWQgVHlwZVNjcmlwdCB2ZXJzaW9uc1xuICog4oiAIHN1cHBvcnRlZCB0eXBlc2NyaXB0IHZlcnNpb24gdiwgdiA8IE1BWF9UU19WRVJTSU9OXG4gKiBNQVhfVFNfVkVSU0lPTiBpcyBub3QgY29uc2lkZXJlZCBhcyBhIHN1cHBvcnRlZCBUeXBlU2NyaXB0IHZlcnNpb25cbiAqL1xuY29uc3QgTUFYX1RTX1ZFUlNJT04gPSAnMi45LjAnO1xuXG5jbGFzcyBBbmd1bGFyQ29tcGlsZXJQcm9ncmFtIGltcGxlbWVudHMgUHJvZ3JhbSB7XG4gIHByaXZhdGUgcm9vdE5hbWVzOiBzdHJpbmdbXTtcbiAgcHJpdmF0ZSBtZXRhZGF0YUNhY2hlOiBNZXRhZGF0YUNhY2hlO1xuICAvLyBNZXRhZGF0YSBjYWNoZSB1c2VkIGV4Y2x1c2l2ZWx5IGZvciB0aGUgZmxhdCBtb2R1bGUgaW5kZXhcbiAgcHJpdmF0ZSBmbGF0TW9kdWxlTWV0YWRhdGFDYWNoZTogTWV0YWRhdGFDYWNoZTtcbiAgcHJpdmF0ZSBsb3dlcmluZ01ldGFkYXRhVHJhbnNmb3JtOiBMb3dlck1ldGFkYXRhVHJhbnNmb3JtO1xuICBwcml2YXRlIG9sZFByb2dyYW1MaWJyYXJ5U3VtbWFyaWVzOiBNYXA8c3RyaW5nLCBMaWJyYXJ5U3VtbWFyeT58dW5kZWZpbmVkO1xuICBwcml2YXRlIG9sZFByb2dyYW1FbWl0dGVkR2VuZXJhdGVkRmlsZXM6IE1hcDxzdHJpbmcsIEdlbmVyYXRlZEZpbGU+fHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBvbGRQcm9ncmFtRW1pdHRlZFNvdXJjZUZpbGVzOiBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VGaWxlPnx1bmRlZmluZWQ7XG4gIC8vIE5vdGU6IFRoaXMgd2lsbCBiZSBjbGVhcmVkIG91dCBhcyBzb29uIGFzIHdlIGNyZWF0ZSB0aGUgX3RzUHJvZ3JhbVxuICBwcml2YXRlIG9sZFRzUHJvZ3JhbTogdHMuUHJvZ3JhbXx1bmRlZmluZWQ7XG4gIHByaXZhdGUgZW1pdHRlZExpYnJhcnlTdW1tYXJpZXM6IExpYnJhcnlTdW1tYXJ5W118dW5kZWZpbmVkO1xuICBwcml2YXRlIGVtaXR0ZWRHZW5lcmF0ZWRGaWxlczogR2VuZXJhdGVkRmlsZVtdfHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBlbWl0dGVkU291cmNlRmlsZXM6IHRzLlNvdXJjZUZpbGVbXXx1bmRlZmluZWQ7XG5cbiAgLy8gTGF6aWx5IGluaXRpYWxpemVkIGZpZWxkc1xuICBwcml2YXRlIF9jb21waWxlcjogQW90Q29tcGlsZXI7XG4gIHByaXZhdGUgX2hvc3RBZGFwdGVyOiBUc0NvbXBpbGVyQW90Q29tcGlsZXJUeXBlQ2hlY2tIb3N0QWRhcHRlcjtcbiAgcHJpdmF0ZSBfdHNQcm9ncmFtOiB0cy5Qcm9ncmFtO1xuICBwcml2YXRlIF9hbmFseXplZE1vZHVsZXM6IE5nQW5hbHl6ZWRNb2R1bGVzfHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfYW5hbHl6ZWRJbmplY3RhYmxlczogTmdBbmFseXplZEZpbGVXaXRoSW5qZWN0YWJsZXNbXXx1bmRlZmluZWQ7XG4gIHByaXZhdGUgX3N0cnVjdHVyYWxEaWFnbm9zdGljczogRGlhZ25vc3RpY1tdfHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfcHJvZ3JhbVdpdGhTdHViczogdHMuUHJvZ3JhbXx1bmRlZmluZWQ7XG4gIHByaXZhdGUgX29wdGlvbnNEaWFnbm9zdGljczogRGlhZ25vc3RpY1tdID0gW107XG4gIHByaXZhdGUgX3JlaWZpZWREZWNvcmF0b3JzOiBTZXQ8U3RhdGljU3ltYm9sPjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJvb3ROYW1lczogUmVhZG9ubHlBcnJheTxzdHJpbmc+LCBwcml2YXRlIG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucyxcbiAgICAgIHByaXZhdGUgaG9zdDogQ29tcGlsZXJIb3N0LCBvbGRQcm9ncmFtPzogUHJvZ3JhbSkge1xuICAgIHRoaXMucm9vdE5hbWVzID0gWy4uLnJvb3ROYW1lc107XG5cbiAgICBjaGVja1ZlcnNpb24odHMudmVyc2lvbiwgTUlOX1RTX1ZFUlNJT04sIE1BWF9UU19WRVJTSU9OLCBvcHRpb25zLmRpc2FibGVUeXBlU2NyaXB0VmVyc2lvbkNoZWNrKTtcblxuICAgIHRoaXMub2xkVHNQcm9ncmFtID0gb2xkUHJvZ3JhbSA/IG9sZFByb2dyYW0uZ2V0VHNQcm9ncmFtKCkgOiB1bmRlZmluZWQ7XG4gICAgaWYgKG9sZFByb2dyYW0pIHtcbiAgICAgIHRoaXMub2xkUHJvZ3JhbUxpYnJhcnlTdW1tYXJpZXMgPSBvbGRQcm9ncmFtLmdldExpYnJhcnlTdW1tYXJpZXMoKTtcbiAgICAgIHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRHZW5lcmF0ZWRGaWxlcyA9IG9sZFByb2dyYW0uZ2V0RW1pdHRlZEdlbmVyYXRlZEZpbGVzKCk7XG4gICAgICB0aGlzLm9sZFByb2dyYW1FbWl0dGVkU291cmNlRmlsZXMgPSBvbGRQcm9ncmFtLmdldEVtaXR0ZWRTb3VyY2VGaWxlcygpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmZsYXRNb2R1bGVPdXRGaWxlKSB7XG4gICAgICBjb25zdCB7aG9zdDogYnVuZGxlSG9zdCwgaW5kZXhOYW1lLCBlcnJvcnN9ID1cbiAgICAgICAgICBjcmVhdGVCdW5kbGVJbmRleEhvc3Qob3B0aW9ucywgdGhpcy5yb290TmFtZXMsIGhvc3QsICgpID0+IHRoaXMuZmxhdE1vZHVsZU1ldGFkYXRhQ2FjaGUpO1xuICAgICAgaWYgKGVycm9ycykge1xuICAgICAgICB0aGlzLl9vcHRpb25zRGlhZ25vc3RpY3MucHVzaCguLi5lcnJvcnMubWFwKGUgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBlLmNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZVRleHQ6IGUubWVzc2FnZVRleHQgYXMgc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiBTT1VSQ0UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBERUZBVUxUX0VSUk9SX0NPREVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5yb290TmFtZXMucHVzaChpbmRleE5hbWUgISk7XG4gICAgICAgIHRoaXMuaG9zdCA9IGJ1bmRsZUhvc3Q7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5sb3dlcmluZ01ldGFkYXRhVHJhbnNmb3JtID1cbiAgICAgICAgbmV3IExvd2VyTWV0YWRhdGFUcmFuc2Zvcm0ob3B0aW9ucy5lbmFibGVJdnkgPyBSM19MT1dFUl9GSUVMRFMgOiBMT1dFUl9GSUVMRFMpO1xuICAgIHRoaXMubWV0YWRhdGFDYWNoZSA9IHRoaXMuY3JlYXRlTWV0YWRhdGFDYWNoZShbdGhpcy5sb3dlcmluZ01ldGFkYXRhVHJhbnNmb3JtXSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZU1ldGFkYXRhQ2FjaGUodHJhbnNmb3JtZXJzOiBNZXRhZGF0YVRyYW5zZm9ybWVyW10pIHtcbiAgICByZXR1cm4gbmV3IE1ldGFkYXRhQ2FjaGUoXG4gICAgICAgIG5ldyBNZXRhZGF0YUNvbGxlY3Rvcih7cXVvdGVkTmFtZXM6IHRydWV9KSwgISF0aGlzLm9wdGlvbnMuc3RyaWN0TWV0YWRhdGFFbWl0LFxuICAgICAgICB0cmFuc2Zvcm1lcnMpO1xuICB9XG5cbiAgZ2V0TGlicmFyeVN1bW1hcmllcygpOiBNYXA8c3RyaW5nLCBMaWJyYXJ5U3VtbWFyeT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBNYXA8c3RyaW5nLCBMaWJyYXJ5U3VtbWFyeT4oKTtcbiAgICBpZiAodGhpcy5vbGRQcm9ncmFtTGlicmFyeVN1bW1hcmllcykge1xuICAgICAgdGhpcy5vbGRQcm9ncmFtTGlicmFyeVN1bW1hcmllcy5mb3JFYWNoKChzdW1tYXJ5LCBmaWxlTmFtZSkgPT4gcmVzdWx0LnNldChmaWxlTmFtZSwgc3VtbWFyeSkpO1xuICAgIH1cbiAgICBpZiAodGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcykge1xuICAgICAgdGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcy5mb3JFYWNoKFxuICAgICAgICAgIChzdW1tYXJ5LCBmaWxlTmFtZSkgPT4gcmVzdWx0LnNldChzdW1tYXJ5LmZpbGVOYW1lLCBzdW1tYXJ5KSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnZXRFbWl0dGVkR2VuZXJhdGVkRmlsZXMoKTogTWFwPHN0cmluZywgR2VuZXJhdGVkRmlsZT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBNYXA8c3RyaW5nLCBHZW5lcmF0ZWRGaWxlPigpO1xuICAgIGlmICh0aGlzLm9sZFByb2dyYW1FbWl0dGVkR2VuZXJhdGVkRmlsZXMpIHtcbiAgICAgIHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRHZW5lcmF0ZWRGaWxlcy5mb3JFYWNoKFxuICAgICAgICAgIChnZW5GaWxlLCBmaWxlTmFtZSkgPT4gcmVzdWx0LnNldChmaWxlTmFtZSwgZ2VuRmlsZSkpO1xuICAgIH1cbiAgICBpZiAodGhpcy5lbWl0dGVkR2VuZXJhdGVkRmlsZXMpIHtcbiAgICAgIHRoaXMuZW1pdHRlZEdlbmVyYXRlZEZpbGVzLmZvckVhY2goKGdlbkZpbGUpID0+IHJlc3VsdC5zZXQoZ2VuRmlsZS5nZW5GaWxlVXJsLCBnZW5GaWxlKSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnZXRFbWl0dGVkU291cmNlRmlsZXMoKTogTWFwPHN0cmluZywgdHMuU291cmNlRmlsZT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VGaWxlPigpO1xuICAgIGlmICh0aGlzLm9sZFByb2dyYW1FbWl0dGVkU291cmNlRmlsZXMpIHtcbiAgICAgIHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRTb3VyY2VGaWxlcy5mb3JFYWNoKChzZiwgZmlsZU5hbWUpID0+IHJlc3VsdC5zZXQoZmlsZU5hbWUsIHNmKSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmVtaXR0ZWRTb3VyY2VGaWxlcykge1xuICAgICAgdGhpcy5lbWl0dGVkU291cmNlRmlsZXMuZm9yRWFjaCgoc2YpID0+IHJlc3VsdC5zZXQoc2YuZmlsZU5hbWUsIHNmKSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnZXRUc1Byb2dyYW0oKTogdHMuUHJvZ3JhbSB7IHJldHVybiB0aGlzLnRzUHJvZ3JhbTsgfVxuXG4gIGdldFRzT3B0aW9uRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbikge1xuICAgIHJldHVybiB0aGlzLnRzUHJvZ3JhbS5nZXRPcHRpb25zRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4pO1xuICB9XG5cbiAgZ2V0TmdPcHRpb25EaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuKTogUmVhZG9ubHlBcnJheTxEaWFnbm9zdGljPiB7XG4gICAgcmV0dXJuIFsuLi50aGlzLl9vcHRpb25zRGlhZ25vc3RpY3MsIC4uLmdldE5nT3B0aW9uRGlhZ25vc3RpY3ModGhpcy5vcHRpb25zKV07XG4gIH1cblxuICBnZXRUc1N5bnRhY3RpY0RpYWdub3N0aWNzKHNvdXJjZUZpbGU/OiB0cy5Tb3VyY2VGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuKTpcbiAgICAgIFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIHJldHVybiB0aGlzLnRzUHJvZ3JhbS5nZXRTeW50YWN0aWNEaWFnbm9zdGljcyhzb3VyY2VGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbik7XG4gIH1cblxuICBnZXROZ1N0cnVjdHVyYWxEaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuKTogUmVhZG9ubHlBcnJheTxEaWFnbm9zdGljPiB7XG4gICAgcmV0dXJuIHRoaXMuc3RydWN0dXJhbERpYWdub3N0aWNzO1xuICB9XG5cbiAgZ2V0VHNTZW1hbnRpY0RpYWdub3N0aWNzKHNvdXJjZUZpbGU/OiB0cy5Tb3VyY2VGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuKTpcbiAgICAgIFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIGNvbnN0IHNvdXJjZUZpbGVzID0gc291cmNlRmlsZSA/IFtzb3VyY2VGaWxlXSA6IHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCk7XG4gICAgbGV0IGRpYWdzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBzb3VyY2VGaWxlcy5mb3JFYWNoKHNmID0+IHtcbiAgICAgIGlmICghR0VORVJBVEVEX0ZJTEVTLnRlc3Qoc2YuZmlsZU5hbWUpKSB7XG4gICAgICAgIGRpYWdzLnB1c2goLi4udGhpcy50c1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhzZiwgY2FuY2VsbGF0aW9uVG9rZW4pKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gZGlhZ3M7XG4gIH1cblxuICBnZXROZ1NlbWFudGljRGlhZ25vc3RpY3MoZmlsZU5hbWU/OiBzdHJpbmcsIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOlxuICAgICAgUmVhZG9ubHlBcnJheTxEaWFnbm9zdGljPiB7XG4gICAgbGV0IGRpYWdzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZvckVhY2goc2YgPT4ge1xuICAgICAgaWYgKEdFTkVSQVRFRF9GSUxFUy50ZXN0KHNmLmZpbGVOYW1lKSAmJiAhc2YuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgICAgZGlhZ3MucHVzaCguLi50aGlzLnRzUHJvZ3JhbS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKHNmLCBjYW5jZWxsYXRpb25Ub2tlbikpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGNvbnN0IHtuZ30gPSB0cmFuc2xhdGVEaWFnbm9zdGljcyh0aGlzLmhvc3RBZGFwdGVyLCBkaWFncyk7XG4gICAgcmV0dXJuIG5nO1xuICB9XG5cbiAgbG9hZE5nU3RydWN0dXJlQXN5bmMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuX2FuYWx5emVkTW9kdWxlcykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdBbmd1bGFyIHN0cnVjdHVyZSBhbHJlYWR5IGxvYWRlZCcpO1xuICAgIH1cbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcbiAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHt0bXBQcm9ncmFtLCBzb3VyY2VGaWxlcywgdHNGaWxlcywgcm9vdE5hbWVzfSA9IHRoaXMuX2NyZWF0ZVByb2dyYW1XaXRoQmFzaWNTdHVicygpO1xuICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLmxvYWRGaWxlc0FzeW5jKHNvdXJjZUZpbGVzLCB0c0ZpbGVzKVxuICAgICAgICAgICAgICAudGhlbigoe2FuYWx5emVkTW9kdWxlcywgYW5hbHl6ZWRJbmplY3RhYmxlc30pID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fYW5hbHl6ZWRNb2R1bGVzKSB7XG4gICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FuZ3VsYXIgc3RydWN0dXJlIGxvYWRlZCBib3RoIHN5bmNocm9ub3VzbHkgYW5kIGFzeW5jaHJvbm91c2x5Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuX3VwZGF0ZVByb2dyYW1XaXRoVHlwZUNoZWNrU3R1YnMoXG4gICAgICAgICAgICAgICAgICAgIHRtcFByb2dyYW0sIGFuYWx5emVkTW9kdWxlcywgYW5hbHl6ZWRJbmplY3RhYmxlcywgcm9vdE5hbWVzKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChlID0+IHRoaXMuX2NyZWF0ZVByb2dyYW1PbkVycm9yKGUpKTtcbiAgfVxuXG4gIGxpc3RMYXp5Um91dGVzKHJvdXRlPzogc3RyaW5nKTogTGF6eVJvdXRlW10ge1xuICAgIC8vIE5vdGU6IERvbid0IGFuYWx5emVkTW9kdWxlcyBpZiBhIHJvdXRlIGlzIGdpdmVuXG4gICAgLy8gdG8gYmUgZmFzdCBlbm91Z2guXG4gICAgcmV0dXJuIHRoaXMuY29tcGlsZXIubGlzdExhenlSb3V0ZXMocm91dGUsIHJvdXRlID8gdW5kZWZpbmVkIDogdGhpcy5hbmFseXplZE1vZHVsZXMpO1xuICB9XG5cbiAgZW1pdChwYXJhbWV0ZXJzOiB7XG4gICAgZW1pdEZsYWdzPzogRW1pdEZsYWdzLFxuICAgIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4sXG4gICAgY3VzdG9tVHJhbnNmb3JtZXJzPzogQ3VzdG9tVHJhbnNmb3JtZXJzLFxuICAgIGVtaXRDYWxsYmFjaz86IFRzRW1pdENhbGxiYWNrLFxuICAgIG1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjaz86IFRzTWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrLFxuICB9ID0ge30pOiB0cy5FbWl0UmVzdWx0IHtcbiAgICBpZiAodGhpcy5vcHRpb25zLmVuYWJsZUl2eSA9PT0gJ25ndHNjJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgcnVuIGxlZ2FjeSBjb21waWxlciBpbiBuZ3RzYyBtb2RlJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm9wdGlvbnMuZW5hYmxlSXZ5ID09PSB0cnVlID8gdGhpcy5fZW1pdFJlbmRlcjMocGFyYW1ldGVycykgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fZW1pdFJlbmRlcjIocGFyYW1ldGVycyk7XG4gIH1cblxuICBwcml2YXRlIF9hbm5vdGF0ZVIzUHJvcGVydGllcyhjb250ZW50czogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gY29udGVudHMucmVwbGFjZShSM19NQVRDSF9ERUZTLCBSM19OT0NPTExBUFNFX0RFRlMpO1xuICB9XG5cbiAgcHJpdmF0ZSBfZW1pdFJlbmRlcjMoXG4gICAgICB7XG4gICAgICAgICAgZW1pdEZsYWdzID0gRW1pdEZsYWdzLkRlZmF1bHQsIGNhbmNlbGxhdGlvblRva2VuLCBjdXN0b21UcmFuc2Zvcm1lcnMsXG4gICAgICAgICAgZW1pdENhbGxiYWNrID0gZGVmYXVsdEVtaXRDYWxsYmFjaywgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrID0gbWVyZ2VFbWl0UmVzdWx0cyxcbiAgICAgIH06IHtcbiAgICAgICAgZW1pdEZsYWdzPzogRW1pdEZsYWdzLFxuICAgICAgICBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuLFxuICAgICAgICBjdXN0b21UcmFuc2Zvcm1lcnM/OiBDdXN0b21UcmFuc2Zvcm1lcnMsXG4gICAgICAgIGVtaXRDYWxsYmFjaz86IFRzRW1pdENhbGxiYWNrLFxuICAgICAgICBtZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2s/OiBUc01lcmdlRW1pdFJlc3VsdHNDYWxsYmFjayxcbiAgICAgIH0gPSB7fSk6IHRzLkVtaXRSZXN1bHQge1xuICAgIGNvbnN0IGVtaXRTdGFydCA9IERhdGUubm93KCk7XG4gICAgaWYgKChlbWl0RmxhZ3MgJiAoRW1pdEZsYWdzLkpTIHwgRW1pdEZsYWdzLkRUUyB8IEVtaXRGbGFncy5NZXRhZGF0YSB8IEVtaXRGbGFncy5Db2RlZ2VuKSkgPT09XG4gICAgICAgIDApIHtcbiAgICAgIHJldHVybiB7ZW1pdFNraXBwZWQ6IHRydWUsIGRpYWdub3N0aWNzOiBbXSwgZW1pdHRlZEZpbGVzOiBbXX07XG4gICAgfVxuXG4gICAgLy8gYW5hbHl6ZWRNb2R1bGVzIGFuZCBhbmFseXplZEluamVjdGFibGVzIGFyZSBjcmVhdGVkIHRvZ2V0aGVyLiBJZiBvbmUgZXhpc3RzLCBzbyBkb2VzIHRoZVxuICAgIC8vIG90aGVyLlxuICAgIGNvbnN0IG1vZHVsZXMgPVxuICAgICAgICB0aGlzLmNvbXBpbGVyLmVtaXRBbGxQYXJ0aWFsTW9kdWxlcyh0aGlzLmFuYWx5emVkTW9kdWxlcywgdGhpcy5fYW5hbHl6ZWRJbmplY3RhYmxlcyAhKTtcblxuICAgIGNvbnN0IHdyaXRlVHNGaWxlOiB0cy5Xcml0ZUZpbGVDYWxsYmFjayA9XG4gICAgICAgIChvdXRGaWxlTmFtZSwgb3V0RGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yPywgc291cmNlRmlsZXM/KSA9PiB7XG4gICAgICAgICAgY29uc3Qgc291cmNlRmlsZSA9IHNvdXJjZUZpbGVzICYmIHNvdXJjZUZpbGVzLmxlbmd0aCA9PSAxID8gc291cmNlRmlsZXNbMF0gOiBudWxsO1xuICAgICAgICAgIGxldCBnZW5GaWxlOiBHZW5lcmF0ZWRGaWxlfHVuZGVmaW5lZDtcbiAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyICYmIHNvdXJjZUZpbGUgJiZcbiAgICAgICAgICAgICAgVFMudGVzdChzb3VyY2VGaWxlLmZpbGVOYW1lKSkge1xuICAgICAgICAgICAgb3V0RGF0YSA9IHRoaXMuX2Fubm90YXRlUjNQcm9wZXJ0aWVzKG91dERhdGEpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLndyaXRlRmlsZShvdXRGaWxlTmFtZSwgb3V0RGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCB1bmRlZmluZWQsIHNvdXJjZUZpbGVzKTtcbiAgICAgICAgfTtcblxuICAgIGNvbnN0IGVtaXRPbmx5RHRzRmlsZXMgPSAoZW1pdEZsYWdzICYgKEVtaXRGbGFncy5EVFMgfCBFbWl0RmxhZ3MuSlMpKSA9PSBFbWl0RmxhZ3MuRFRTO1xuXG4gICAgY29uc3QgdHNDdXN0b21UcmFuc2Zvcm1lcnMgPSB0aGlzLmNhbGN1bGF0ZVRyYW5zZm9ybXMoXG4gICAgICAgIC8qIGdlbkZpbGVzICovIHVuZGVmaW5lZCwgLyogcGFydGlhbE1vZHVsZXMgKi8gbW9kdWxlcyxcbiAgICAgICAgLyogc3RyaXBEZWNvcmF0b3JzICovIHRoaXMucmVpZmllZERlY29yYXRvcnMsIGN1c3RvbVRyYW5zZm9ybWVycyk7XG5cbiAgICBjb25zdCBlbWl0UmVzdWx0ID0gZW1pdENhbGxiYWNrKHtcbiAgICAgIHByb2dyYW06IHRoaXMudHNQcm9ncmFtLFxuICAgICAgaG9zdDogdGhpcy5ob3N0LFxuICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgd3JpdGVGaWxlOiB3cml0ZVRzRmlsZSwgZW1pdE9ubHlEdHNGaWxlcyxcbiAgICAgIGN1c3RvbVRyYW5zZm9ybWVyczogdHNDdXN0b21UcmFuc2Zvcm1lcnNcbiAgICB9KTtcbiAgICByZXR1cm4gZW1pdFJlc3VsdDtcbiAgfVxuXG4gIHByaXZhdGUgX2VtaXRSZW5kZXIyKFxuICAgICAge1xuICAgICAgICAgIGVtaXRGbGFncyA9IEVtaXRGbGFncy5EZWZhdWx0LCBjYW5jZWxsYXRpb25Ub2tlbiwgY3VzdG9tVHJhbnNmb3JtZXJzLFxuICAgICAgICAgIGVtaXRDYWxsYmFjayA9IGRlZmF1bHRFbWl0Q2FsbGJhY2ssIG1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjayA9IG1lcmdlRW1pdFJlc3VsdHMsXG4gICAgICB9OiB7XG4gICAgICAgIGVtaXRGbGFncz86IEVtaXRGbGFncyxcbiAgICAgICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbixcbiAgICAgICAgY3VzdG9tVHJhbnNmb3JtZXJzPzogQ3VzdG9tVHJhbnNmb3JtZXJzLFxuICAgICAgICBlbWl0Q2FsbGJhY2s/OiBUc0VtaXRDYWxsYmFjayxcbiAgICAgICAgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrPzogVHNNZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2ssXG4gICAgICB9ID0ge30pOiB0cy5FbWl0UmVzdWx0IHtcbiAgICBjb25zdCBlbWl0U3RhcnQgPSBEYXRlLm5vdygpO1xuICAgIGlmIChlbWl0RmxhZ3MgJiBFbWl0RmxhZ3MuSTE4bkJ1bmRsZSkge1xuICAgICAgY29uc3QgbG9jYWxlID0gdGhpcy5vcHRpb25zLmkxOG5PdXRMb2NhbGUgfHwgbnVsbDtcbiAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLm9wdGlvbnMuaTE4bk91dEZpbGUgfHwgbnVsbDtcbiAgICAgIGNvbnN0IGZvcm1hdCA9IHRoaXMub3B0aW9ucy5pMThuT3V0Rm9ybWF0IHx8IG51bGw7XG4gICAgICBjb25zdCBidW5kbGUgPSB0aGlzLmNvbXBpbGVyLmVtaXRNZXNzYWdlQnVuZGxlKHRoaXMuYW5hbHl6ZWRNb2R1bGVzLCBsb2NhbGUpO1xuICAgICAgaTE4bkV4dHJhY3QoZm9ybWF0LCBmaWxlLCB0aGlzLmhvc3QsIHRoaXMub3B0aW9ucywgYnVuZGxlKTtcbiAgICB9XG4gICAgaWYgKChlbWl0RmxhZ3MgJiAoRW1pdEZsYWdzLkpTIHwgRW1pdEZsYWdzLkRUUyB8IEVtaXRGbGFncy5NZXRhZGF0YSB8IEVtaXRGbGFncy5Db2RlZ2VuKSkgPT09XG4gICAgICAgIDApIHtcbiAgICAgIHJldHVybiB7ZW1pdFNraXBwZWQ6IHRydWUsIGRpYWdub3N0aWNzOiBbXSwgZW1pdHRlZEZpbGVzOiBbXX07XG4gICAgfVxuICAgIGxldCB7Z2VuRmlsZXMsIGdlbkRpYWdzfSA9IHRoaXMuZ2VuZXJhdGVGaWxlc0ZvckVtaXQoZW1pdEZsYWdzKTtcbiAgICBpZiAoZ2VuRGlhZ3MubGVuZ3RoKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBkaWFnbm9zdGljczogZ2VuRGlhZ3MsXG4gICAgICAgIGVtaXRTa2lwcGVkOiB0cnVlLFxuICAgICAgICBlbWl0dGVkRmlsZXM6IFtdLFxuICAgICAgfTtcbiAgICB9XG4gICAgdGhpcy5lbWl0dGVkR2VuZXJhdGVkRmlsZXMgPSBnZW5GaWxlcztcbiAgICBjb25zdCBvdXRTcmNNYXBwaW5nOiBBcnJheTx7c291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgb3V0RmlsZU5hbWU6IHN0cmluZ30+ID0gW107XG4gICAgY29uc3QgZ2VuRmlsZUJ5RmlsZU5hbWUgPSBuZXcgTWFwPHN0cmluZywgR2VuZXJhdGVkRmlsZT4oKTtcbiAgICBnZW5GaWxlcy5mb3JFYWNoKGdlbkZpbGUgPT4gZ2VuRmlsZUJ5RmlsZU5hbWUuc2V0KGdlbkZpbGUuZ2VuRmlsZVVybCwgZ2VuRmlsZSkpO1xuICAgIHRoaXMuZW1pdHRlZExpYnJhcnlTdW1tYXJpZXMgPSBbXTtcbiAgICBjb25zdCBlbWl0dGVkU291cmNlRmlsZXMgPSBbXSBhcyB0cy5Tb3VyY2VGaWxlW107XG4gICAgY29uc3Qgd3JpdGVUc0ZpbGU6IHRzLldyaXRlRmlsZUNhbGxiYWNrID1cbiAgICAgICAgKG91dEZpbGVOYW1lLCBvdXREYXRhLCB3cml0ZUJ5dGVPcmRlck1hcmssIG9uRXJyb3I/LCBzb3VyY2VGaWxlcz8pID0+IHtcbiAgICAgICAgICBjb25zdCBzb3VyY2VGaWxlID0gc291cmNlRmlsZXMgJiYgc291cmNlRmlsZXMubGVuZ3RoID09IDEgPyBzb3VyY2VGaWxlc1swXSA6IG51bGw7XG4gICAgICAgICAgbGV0IGdlbkZpbGU6IEdlbmVyYXRlZEZpbGV8dW5kZWZpbmVkO1xuICAgICAgICAgIGlmIChzb3VyY2VGaWxlKSB7XG4gICAgICAgICAgICBvdXRTcmNNYXBwaW5nLnB1c2goe291dEZpbGVOYW1lOiBvdXRGaWxlTmFtZSwgc291cmNlRmlsZX0pO1xuICAgICAgICAgICAgZ2VuRmlsZSA9IGdlbkZpbGVCeUZpbGVOYW1lLmdldChzb3VyY2VGaWxlLmZpbGVOYW1lKTtcbiAgICAgICAgICAgIGlmICghc291cmNlRmlsZS5pc0RlY2xhcmF0aW9uRmlsZSAmJiAhR0VORVJBVEVEX0ZJTEVTLnRlc3Qoc291cmNlRmlsZS5maWxlTmFtZSkpIHtcbiAgICAgICAgICAgICAgLy8gTm90ZTogc291cmNlRmlsZSBpcyB0aGUgdHJhbnNmb3JtZWQgc291cmNlZmlsZSwgbm90IHRoZSBvcmlnaW5hbCBvbmUhXG4gICAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsRmlsZSA9IHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGUoc291cmNlRmlsZS5maWxlTmFtZSk7XG4gICAgICAgICAgICAgIGlmIChvcmlnaW5hbEZpbGUpIHtcbiAgICAgICAgICAgICAgICBlbWl0dGVkU291cmNlRmlsZXMucHVzaChvcmlnaW5hbEZpbGUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyICYmIFRTLnRlc3Qoc291cmNlRmlsZS5maWxlTmFtZSkpIHtcbiAgICAgICAgICAgICAgb3V0RGF0YSA9IHRoaXMuX2Fubm90YXRlUjNQcm9wZXJ0aWVzKG91dERhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLndyaXRlRmlsZShvdXRGaWxlTmFtZSwgb3V0RGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCBnZW5GaWxlLCBzb3VyY2VGaWxlcyk7XG4gICAgICAgIH07XG5cbiAgICBjb25zdCBtb2R1bGVzID0gdGhpcy5fYW5hbHl6ZWRJbmplY3RhYmxlcyAmJlxuICAgICAgICB0aGlzLmNvbXBpbGVyLmVtaXRBbGxQYXJ0aWFsTW9kdWxlczIodGhpcy5fYW5hbHl6ZWRJbmplY3RhYmxlcyk7XG5cbiAgICBjb25zdCB0c0N1c3RvbVRyYW5zZm9ybWVycyA9IHRoaXMuY2FsY3VsYXRlVHJhbnNmb3JtcyhcbiAgICAgICAgZ2VuRmlsZUJ5RmlsZU5hbWUsIG1vZHVsZXMsIC8qIHN0cmlwRGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsIGN1c3RvbVRyYW5zZm9ybWVycyk7XG4gICAgY29uc3QgZW1pdE9ubHlEdHNGaWxlcyA9IChlbWl0RmxhZ3MgJiAoRW1pdEZsYWdzLkRUUyB8IEVtaXRGbGFncy5KUykpID09IEVtaXRGbGFncy5EVFM7XG4gICAgLy8gUmVzdG9yZSB0aGUgb3JpZ2luYWwgcmVmZXJlbmNlcyBiZWZvcmUgd2UgZW1pdCBzbyBUeXBlU2NyaXB0IGRvZXNuJ3QgZW1pdFxuICAgIC8vIGEgcmVmZXJlbmNlIHRvIHRoZSAuZC50cyBmaWxlLlxuICAgIGNvbnN0IGF1Z21lbnRlZFJlZmVyZW5jZXMgPSBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIFJlYWRvbmx5QXJyYXk8dHMuRmlsZVJlZmVyZW5jZT4+KCk7XG4gICAgZm9yIChjb25zdCBzb3VyY2VGaWxlIG9mIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGNvbnN0IG9yaWdpbmFsUmVmZXJlbmNlcyA9IGdldE9yaWdpbmFsUmVmZXJlbmNlcyhzb3VyY2VGaWxlKTtcbiAgICAgIGlmIChvcmlnaW5hbFJlZmVyZW5jZXMpIHtcbiAgICAgICAgYXVnbWVudGVkUmVmZXJlbmNlcy5zZXQoc291cmNlRmlsZSwgc291cmNlRmlsZS5yZWZlcmVuY2VkRmlsZXMpO1xuICAgICAgICBzb3VyY2VGaWxlLnJlZmVyZW5jZWRGaWxlcyA9IG9yaWdpbmFsUmVmZXJlbmNlcztcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgZ2VuVHNGaWxlczogR2VuZXJhdGVkRmlsZVtdID0gW107XG4gICAgY29uc3QgZ2VuSnNvbkZpbGVzOiBHZW5lcmF0ZWRGaWxlW10gPSBbXTtcbiAgICBnZW5GaWxlcy5mb3JFYWNoKGdmID0+IHtcbiAgICAgIGlmIChnZi5zdG10cykge1xuICAgICAgICBnZW5Uc0ZpbGVzLnB1c2goZ2YpO1xuICAgICAgfVxuICAgICAgaWYgKGdmLnNvdXJjZSkge1xuICAgICAgICBnZW5Kc29uRmlsZXMucHVzaChnZik7XG4gICAgICB9XG4gICAgfSk7XG4gICAgbGV0IGVtaXRSZXN1bHQ6IHRzLkVtaXRSZXN1bHQ7XG4gICAgbGV0IGVtaXR0ZWRVc2VyVHNDb3VudDogbnVtYmVyO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzb3VyY2VGaWxlc1RvRW1pdCA9IHRoaXMuZ2V0U291cmNlRmlsZXNGb3JFbWl0KCk7XG4gICAgICBpZiAoc291cmNlRmlsZXNUb0VtaXQgJiZcbiAgICAgICAgICAoc291cmNlRmlsZXNUb0VtaXQubGVuZ3RoICsgZ2VuVHNGaWxlcy5sZW5ndGgpIDwgTUFYX0ZJTEVfQ09VTlRfRk9SX1NJTkdMRV9GSUxFX0VNSVQpIHtcbiAgICAgICAgY29uc3QgZmlsZU5hbWVzVG9FbWl0ID1cbiAgICAgICAgICAgIFsuLi5zb3VyY2VGaWxlc1RvRW1pdC5tYXAoc2YgPT4gc2YuZmlsZU5hbWUpLCAuLi5nZW5Uc0ZpbGVzLm1hcChnZiA9PiBnZi5nZW5GaWxlVXJsKV07XG4gICAgICAgIGVtaXRSZXN1bHQgPSBtZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2soXG4gICAgICAgICAgICBmaWxlTmFtZXNUb0VtaXQubWFwKChmaWxlTmFtZSkgPT4gZW1pdFJlc3VsdCA9IGVtaXRDYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3JhbTogdGhpcy50c1Byb2dyYW0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaG9zdDogdGhpcy5ob3N0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cml0ZUZpbGU6IHdyaXRlVHNGaWxlLCBlbWl0T25seUR0c0ZpbGVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbVRyYW5zZm9ybWVyczogdHNDdXN0b21UcmFuc2Zvcm1lcnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0U291cmNlRmlsZTogdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZShmaWxlTmFtZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKSk7XG4gICAgICAgIGVtaXR0ZWRVc2VyVHNDb3VudCA9IHNvdXJjZUZpbGVzVG9FbWl0Lmxlbmd0aDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVtaXRSZXN1bHQgPSBlbWl0Q2FsbGJhY2soe1xuICAgICAgICAgIHByb2dyYW06IHRoaXMudHNQcm9ncmFtLFxuICAgICAgICAgIGhvc3Q6IHRoaXMuaG9zdCxcbiAgICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICAgICAgd3JpdGVGaWxlOiB3cml0ZVRzRmlsZSwgZW1pdE9ubHlEdHNGaWxlcyxcbiAgICAgICAgICBjdXN0b21UcmFuc2Zvcm1lcnM6IHRzQ3VzdG9tVHJhbnNmb3JtZXJzXG4gICAgICAgIH0pO1xuICAgICAgICBlbWl0dGVkVXNlclRzQ291bnQgPSB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmxlbmd0aCAtIGdlblRzRmlsZXMubGVuZ3RoO1xuICAgICAgfVxuICAgIH0gZmluYWxseSB7XG4gICAgICAvLyBSZXN0b3JlIHRoZSByZWZlcmVuY2VzIGJhY2sgdG8gdGhlIGF1Z21lbnRlZCB2YWx1ZSB0byBlbnN1cmUgdGhhdCB0aGVcbiAgICAgIC8vIGNoZWNrcyB0aGF0IFR5cGVTY3JpcHQgbWFrZXMgZm9yIHByb2plY3Qgc3RydWN0dXJlIHJldXNlIHdpbGwgc3VjY2VlZC5cbiAgICAgIGZvciAoY29uc3QgW3NvdXJjZUZpbGUsIHJlZmVyZW5jZXNdIG9mIEFycmF5LmZyb20oYXVnbWVudGVkUmVmZXJlbmNlcykpIHtcbiAgICAgICAgLy8gVE9ETyhjaHVja2opOiBSZW1vdmUgYW55IGNhc3QgYWZ0ZXIgdXBkYXRpbmcgYnVpbGQgdG8gMi42XG4gICAgICAgIChzb3VyY2VGaWxlIGFzIGFueSkucmVmZXJlbmNlZEZpbGVzID0gcmVmZXJlbmNlcztcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5lbWl0dGVkU291cmNlRmlsZXMgPSBlbWl0dGVkU291cmNlRmlsZXM7XG5cbiAgICAvLyBNYXRjaCBiZWhhdmlvciBvZiB0c2M6IG9ubHkgcHJvZHVjZSBlbWl0IGRpYWdub3N0aWNzIGlmIGl0IHdvdWxkIGJsb2NrXG4gICAgLy8gZW1pdC4gSWYgbm9FbWl0T25FcnJvciBpcyBmYWxzZSwgdGhlIGVtaXQgd2lsbCBoYXBwZW4gaW4gc3BpdGUgb2YgYW55XG4gICAgLy8gZXJyb3JzLCBzbyB3ZSBzaG91bGQgbm90IHJlcG9ydCB0aGVtLlxuICAgIGlmICh0aGlzLm9wdGlvbnMubm9FbWl0T25FcnJvciA9PT0gdHJ1ZSkge1xuICAgICAgLy8gdHJhbnNsYXRlIHRoZSBkaWFnbm9zdGljcyBpbiB0aGUgZW1pdFJlc3VsdCBhcyB3ZWxsLlxuICAgICAgY29uc3QgdHJhbnNsYXRlZEVtaXREaWFncyA9IHRyYW5zbGF0ZURpYWdub3N0aWNzKHRoaXMuaG9zdEFkYXB0ZXIsIGVtaXRSZXN1bHQuZGlhZ25vc3RpY3MpO1xuICAgICAgZW1pdFJlc3VsdC5kaWFnbm9zdGljcyA9IHRyYW5zbGF0ZWRFbWl0RGlhZ3MudHMuY29uY2F0KFxuICAgICAgICAgIHRoaXMuc3RydWN0dXJhbERpYWdub3N0aWNzLmNvbmNhdCh0cmFuc2xhdGVkRW1pdERpYWdzLm5nKS5tYXAobmdUb1RzRGlhZ25vc3RpYykpO1xuICAgIH1cblxuICAgIGlmICghb3V0U3JjTWFwcGluZy5sZW5ndGgpIHtcbiAgICAgIC8vIGlmIG5vIGZpbGVzIHdlcmUgZW1pdHRlZCBieSBUeXBlU2NyaXB0LCBhbHNvIGRvbid0IGVtaXQgLmpzb24gZmlsZXNcbiAgICAgIGVtaXRSZXN1bHQuZGlhZ25vc3RpY3MgPVxuICAgICAgICAgIGVtaXRSZXN1bHQuZGlhZ25vc3RpY3MuY29uY2F0KFtjcmVhdGVNZXNzYWdlRGlhZ25vc3RpYyhgRW1pdHRlZCBubyBmaWxlcy5gKV0pO1xuICAgICAgcmV0dXJuIGVtaXRSZXN1bHQ7XG4gICAgfVxuXG4gICAgbGV0IHNhbXBsZVNyY0ZpbGVOYW1lOiBzdHJpbmd8dW5kZWZpbmVkO1xuICAgIGxldCBzYW1wbGVPdXRGaWxlTmFtZTogc3RyaW5nfHVuZGVmaW5lZDtcbiAgICBpZiAob3V0U3JjTWFwcGluZy5sZW5ndGgpIHtcbiAgICAgIHNhbXBsZVNyY0ZpbGVOYW1lID0gb3V0U3JjTWFwcGluZ1swXS5zb3VyY2VGaWxlLmZpbGVOYW1lO1xuICAgICAgc2FtcGxlT3V0RmlsZU5hbWUgPSBvdXRTcmNNYXBwaW5nWzBdLm91dEZpbGVOYW1lO1xuICAgIH1cbiAgICBjb25zdCBzcmNUb091dFBhdGggPVxuICAgICAgICBjcmVhdGVTcmNUb091dFBhdGhNYXBwZXIodGhpcy5vcHRpb25zLm91dERpciwgc2FtcGxlU3JjRmlsZU5hbWUsIHNhbXBsZU91dEZpbGVOYW1lKTtcbiAgICBpZiAoZW1pdEZsYWdzICYgRW1pdEZsYWdzLkNvZGVnZW4pIHtcbiAgICAgIGdlbkpzb25GaWxlcy5mb3JFYWNoKGdmID0+IHtcbiAgICAgICAgY29uc3Qgb3V0RmlsZU5hbWUgPSBzcmNUb091dFBhdGgoZ2YuZ2VuRmlsZVVybCk7XG4gICAgICAgIHRoaXMud3JpdGVGaWxlKG91dEZpbGVOYW1lLCBnZi5zb3VyY2UgISwgZmFsc2UsIHVuZGVmaW5lZCwgZ2YpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGxldCBtZXRhZGF0YUpzb25Db3VudCA9IDA7XG4gICAgaWYgKGVtaXRGbGFncyAmIEVtaXRGbGFncy5NZXRhZGF0YSkge1xuICAgICAgdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5mb3JFYWNoKHNmID0+IHtcbiAgICAgICAgaWYgKCFzZi5pc0RlY2xhcmF0aW9uRmlsZSAmJiAhR0VORVJBVEVEX0ZJTEVTLnRlc3Qoc2YuZmlsZU5hbWUpKSB7XG4gICAgICAgICAgbWV0YWRhdGFKc29uQ291bnQrKztcbiAgICAgICAgICBjb25zdCBtZXRhZGF0YSA9IHRoaXMubWV0YWRhdGFDYWNoZS5nZXRNZXRhZGF0YShzZik7XG4gICAgICAgICAgaWYgKG1ldGFkYXRhKSB7XG4gICAgICAgICAgICBjb25zdCBtZXRhZGF0YVRleHQgPSBKU09OLnN0cmluZ2lmeShbbWV0YWRhdGFdKTtcbiAgICAgICAgICAgIGNvbnN0IG91dEZpbGVOYW1lID0gc3JjVG9PdXRQYXRoKHNmLmZpbGVOYW1lLnJlcGxhY2UoL1xcLnRzeD8kLywgJy5tZXRhZGF0YS5qc29uJykpO1xuICAgICAgICAgICAgdGhpcy53cml0ZUZpbGUob3V0RmlsZU5hbWUsIG1ldGFkYXRhVGV4dCwgZmFsc2UsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBbc2ZdKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICBjb25zdCBlbWl0RW5kID0gRGF0ZS5ub3coKTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmRpYWdub3N0aWNzKSB7XG4gICAgICBlbWl0UmVzdWx0LmRpYWdub3N0aWNzID0gZW1pdFJlc3VsdC5kaWFnbm9zdGljcy5jb25jYXQoW2NyZWF0ZU1lc3NhZ2VEaWFnbm9zdGljKFtcbiAgICAgICAgYEVtaXR0ZWQgaW4gJHtlbWl0RW5kIC0gZW1pdFN0YXJ0fW1zYCxcbiAgICAgICAgYC0gJHtlbWl0dGVkVXNlclRzQ291bnR9IHVzZXIgdHMgZmlsZXNgLFxuICAgICAgICBgLSAke2dlblRzRmlsZXMubGVuZ3RofSBnZW5lcmF0ZWQgdHMgZmlsZXNgLFxuICAgICAgICBgLSAke2dlbkpzb25GaWxlcy5sZW5ndGggKyBtZXRhZGF0YUpzb25Db3VudH0gZ2VuZXJhdGVkIGpzb24gZmlsZXNgLFxuICAgICAgXS5qb2luKCdcXG4nKSldKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZW1pdFJlc3VsdDtcbiAgfVxuXG4gIC8vIFByaXZhdGUgbWVtYmVyc1xuICBwcml2YXRlIGdldCBjb21waWxlcigpOiBBb3RDb21waWxlciB7XG4gICAgaWYgKCF0aGlzLl9jb21waWxlcikge1xuICAgICAgdGhpcy5fY3JlYXRlQ29tcGlsZXIoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2NvbXBpbGVyICE7XG4gIH1cblxuICBwcml2YXRlIGdldCBob3N0QWRhcHRlcigpOiBUc0NvbXBpbGVyQW90Q29tcGlsZXJUeXBlQ2hlY2tIb3N0QWRhcHRlciB7XG4gICAgaWYgKCF0aGlzLl9ob3N0QWRhcHRlcikge1xuICAgICAgdGhpcy5fY3JlYXRlQ29tcGlsZXIoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2hvc3RBZGFwdGVyICE7XG4gIH1cblxuICBwcml2YXRlIGdldCBhbmFseXplZE1vZHVsZXMoKTogTmdBbmFseXplZE1vZHVsZXMge1xuICAgIGlmICghdGhpcy5fYW5hbHl6ZWRNb2R1bGVzKSB7XG4gICAgICB0aGlzLmluaXRTeW5jKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9hbmFseXplZE1vZHVsZXMgITtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0IHN0cnVjdHVyYWxEaWFnbm9zdGljcygpOiBSZWFkb25seUFycmF5PERpYWdub3N0aWM+IHtcbiAgICBsZXQgZGlhZ25vc3RpY3MgPSB0aGlzLl9zdHJ1Y3R1cmFsRGlhZ25vc3RpY3M7XG4gICAgaWYgKCFkaWFnbm9zdGljcykge1xuICAgICAgdGhpcy5pbml0U3luYygpO1xuICAgICAgZGlhZ25vc3RpY3MgPSAodGhpcy5fc3RydWN0dXJhbERpYWdub3N0aWNzID0gdGhpcy5fc3RydWN0dXJhbERpYWdub3N0aWNzIHx8IFtdKTtcbiAgICB9XG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgdHNQcm9ncmFtKCk6IHRzLlByb2dyYW0ge1xuICAgIGlmICghdGhpcy5fdHNQcm9ncmFtKSB7XG4gICAgICB0aGlzLmluaXRTeW5jKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl90c1Byb2dyYW0gITtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0IHJlaWZpZWREZWNvcmF0b3JzKCk6IFNldDxTdGF0aWNTeW1ib2w+IHtcbiAgICBpZiAoIXRoaXMuX3JlaWZpZWREZWNvcmF0b3JzKSB7XG4gICAgICBjb25zdCByZWZsZWN0b3IgPSB0aGlzLmNvbXBpbGVyLnJlZmxlY3RvcjtcbiAgICAgIHRoaXMuX3JlaWZpZWREZWNvcmF0b3JzID0gbmV3IFNldChcbiAgICAgICAgICBSM19SRUlGSUVEX0RFQ09SQVRPUlMubWFwKG5hbWUgPT4gcmVmbGVjdG9yLmZpbmREZWNsYXJhdGlvbignQGFuZ3VsYXIvY29yZScsIG5hbWUpKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9yZWlmaWVkRGVjb3JhdG9ycztcbiAgfVxuXG4gIHByaXZhdGUgY2FsY3VsYXRlVHJhbnNmb3JtcyhcbiAgICAgIGdlbkZpbGVzOiBNYXA8c3RyaW5nLCBHZW5lcmF0ZWRGaWxlPnx1bmRlZmluZWQsIHBhcnRpYWxNb2R1bGVzOiBQYXJ0aWFsTW9kdWxlW118dW5kZWZpbmVkLFxuICAgICAgc3RyaXBEZWNvcmF0b3JzOiBTZXQ8U3RhdGljU3ltYm9sPnx1bmRlZmluZWQsXG4gICAgICBjdXN0b21UcmFuc2Zvcm1lcnM/OiBDdXN0b21UcmFuc2Zvcm1lcnMpOiB0cy5DdXN0b21UcmFuc2Zvcm1lcnMge1xuICAgIGNvbnN0IGJlZm9yZVRzOiBBcnJheTx0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT4+ID0gW107XG4gICAgY29uc3QgbWV0YWRhdGFUcmFuc2Zvcm1zOiBNZXRhZGF0YVRyYW5zZm9ybWVyW10gPSBbXTtcbiAgICBjb25zdCBmbGF0TW9kdWxlTWV0YWRhdGFUcmFuc2Zvcm1zOiBNZXRhZGF0YVRyYW5zZm9ybWVyW10gPSBbXTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmVuYWJsZVJlc291cmNlSW5saW5pbmcpIHtcbiAgICAgIGJlZm9yZVRzLnB1c2goZ2V0SW5saW5lUmVzb3VyY2VzVHJhbnNmb3JtRmFjdG9yeSh0aGlzLnRzUHJvZ3JhbSwgdGhpcy5ob3N0QWRhcHRlcikpO1xuICAgICAgY29uc3QgdHJhbnNmb3JtZXIgPSBuZXcgSW5saW5lUmVzb3VyY2VzTWV0YWRhdGFUcmFuc2Zvcm1lcih0aGlzLmhvc3RBZGFwdGVyKTtcbiAgICAgIG1ldGFkYXRhVHJhbnNmb3Jtcy5wdXNoKHRyYW5zZm9ybWVyKTtcbiAgICAgIGZsYXRNb2R1bGVNZXRhZGF0YVRyYW5zZm9ybXMucHVzaCh0cmFuc2Zvcm1lcik7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuZGlzYWJsZUV4cHJlc3Npb25Mb3dlcmluZykge1xuICAgICAgYmVmb3JlVHMucHVzaChcbiAgICAgICAgICBnZXRFeHByZXNzaW9uTG93ZXJpbmdUcmFuc2Zvcm1GYWN0b3J5KHRoaXMubG93ZXJpbmdNZXRhZGF0YVRyYW5zZm9ybSwgdGhpcy50c1Byb2dyYW0pKTtcbiAgICAgIG1ldGFkYXRhVHJhbnNmb3Jtcy5wdXNoKHRoaXMubG93ZXJpbmdNZXRhZGF0YVRyYW5zZm9ybSk7XG4gICAgfVxuICAgIGlmIChnZW5GaWxlcykge1xuICAgICAgYmVmb3JlVHMucHVzaChnZXRBbmd1bGFyRW1pdHRlclRyYW5zZm9ybUZhY3RvcnkoZ2VuRmlsZXMsIHRoaXMuZ2V0VHNQcm9ncmFtKCkpKTtcbiAgICB9XG4gICAgaWYgKHBhcnRpYWxNb2R1bGVzKSB7XG4gICAgICBiZWZvcmVUcy5wdXNoKGdldEFuZ3VsYXJDbGFzc1RyYW5zZm9ybWVyRmFjdG9yeShwYXJ0aWFsTW9kdWxlcykpO1xuXG4gICAgICAvLyBJZiB3ZSBoYXZlIHBhcnRpYWwgbW9kdWxlcywgdGhlIGNhY2hlZCBtZXRhZGF0YSBtaWdodCBiZSBpbmNvcnJlY3QgYXMgaXQgZG9lc24ndCByZWZsZWN0XG4gICAgICAvLyB0aGUgcGFydGlhbCBtb2R1bGUgdHJhbnNmb3Jtcy5cbiAgICAgIGNvbnN0IHRyYW5zZm9ybWVyID0gbmV3IFBhcnRpYWxNb2R1bGVNZXRhZGF0YVRyYW5zZm9ybWVyKHBhcnRpYWxNb2R1bGVzKTtcbiAgICAgIG1ldGFkYXRhVHJhbnNmb3Jtcy5wdXNoKHRyYW5zZm9ybWVyKTtcbiAgICAgIGZsYXRNb2R1bGVNZXRhZGF0YVRyYW5zZm9ybXMucHVzaCh0cmFuc2Zvcm1lcik7XG4gICAgfVxuXG4gICAgaWYgKHN0cmlwRGVjb3JhdG9ycykge1xuICAgICAgYmVmb3JlVHMucHVzaChnZXREZWNvcmF0b3JTdHJpcFRyYW5zZm9ybWVyRmFjdG9yeShcbiAgICAgICAgICBzdHJpcERlY29yYXRvcnMsIHRoaXMuY29tcGlsZXIucmVmbGVjdG9yLCB0aGlzLmdldFRzUHJvZ3JhbSgpLmdldFR5cGVDaGVja2VyKCkpKTtcbiAgICAgIGNvbnN0IHRyYW5zZm9ybWVyID1cbiAgICAgICAgICBuZXcgU3RyaXBEZWNvcmF0b3JzTWV0YWRhdGFUcmFuc2Zvcm1lcihzdHJpcERlY29yYXRvcnMsIHRoaXMuY29tcGlsZXIucmVmbGVjdG9yKTtcbiAgICAgIG1ldGFkYXRhVHJhbnNmb3Jtcy5wdXNoKHRyYW5zZm9ybWVyKTtcbiAgICAgIGZsYXRNb2R1bGVNZXRhZGF0YVRyYW5zZm9ybXMucHVzaCh0cmFuc2Zvcm1lcik7XG4gICAgfVxuXG4gICAgaWYgKGN1c3RvbVRyYW5zZm9ybWVycyAmJiBjdXN0b21UcmFuc2Zvcm1lcnMuYmVmb3JlVHMpIHtcbiAgICAgIGJlZm9yZVRzLnB1c2goLi4uY3VzdG9tVHJhbnNmb3JtZXJzLmJlZm9yZVRzKTtcbiAgICB9XG4gICAgaWYgKG1ldGFkYXRhVHJhbnNmb3Jtcy5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLm1ldGFkYXRhQ2FjaGUgPSB0aGlzLmNyZWF0ZU1ldGFkYXRhQ2FjaGUobWV0YWRhdGFUcmFuc2Zvcm1zKTtcbiAgICB9XG4gICAgaWYgKGZsYXRNb2R1bGVNZXRhZGF0YVRyYW5zZm9ybXMubGVuZ3RoID4gMCkge1xuICAgICAgdGhpcy5mbGF0TW9kdWxlTWV0YWRhdGFDYWNoZSA9IHRoaXMuY3JlYXRlTWV0YWRhdGFDYWNoZShmbGF0TW9kdWxlTWV0YWRhdGFUcmFuc2Zvcm1zKTtcbiAgICB9XG4gICAgY29uc3QgYWZ0ZXJUcyA9IGN1c3RvbVRyYW5zZm9ybWVycyA/IGN1c3RvbVRyYW5zZm9ybWVycy5hZnRlclRzIDogdW5kZWZpbmVkO1xuICAgIHJldHVybiB7YmVmb3JlOiBiZWZvcmVUcywgYWZ0ZXI6IGFmdGVyVHN9O1xuICB9XG5cbiAgcHJpdmF0ZSBpbml0U3luYygpIHtcbiAgICBpZiAodGhpcy5fYW5hbHl6ZWRNb2R1bGVzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCB7dG1wUHJvZ3JhbSwgc291cmNlRmlsZXMsIHRzRmlsZXMsIHJvb3ROYW1lc30gPSB0aGlzLl9jcmVhdGVQcm9ncmFtV2l0aEJhc2ljU3R1YnMoKTtcbiAgICAgIGNvbnN0IHthbmFseXplZE1vZHVsZXMsIGFuYWx5emVkSW5qZWN0YWJsZXN9ID1cbiAgICAgICAgICB0aGlzLmNvbXBpbGVyLmxvYWRGaWxlc1N5bmMoc291cmNlRmlsZXMsIHRzRmlsZXMpO1xuICAgICAgdGhpcy5fdXBkYXRlUHJvZ3JhbVdpdGhUeXBlQ2hlY2tTdHVicyhcbiAgICAgICAgICB0bXBQcm9ncmFtLCBhbmFseXplZE1vZHVsZXMsIGFuYWx5emVkSW5qZWN0YWJsZXMsIHJvb3ROYW1lcyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhpcy5fY3JlYXRlUHJvZ3JhbU9uRXJyb3IoZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfY3JlYXRlQ29tcGlsZXIoKSB7XG4gICAgY29uc3QgY29kZWdlbjogQ29kZUdlbmVyYXRvciA9IHtcbiAgICAgIGdlbmVyYXRlRmlsZTogKGdlbkZpbGVOYW1lLCBiYXNlRmlsZU5hbWUpID0+XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21waWxlci5lbWl0QmFzaWNTdHViKGdlbkZpbGVOYW1lLCBiYXNlRmlsZU5hbWUpLFxuICAgICAgZmluZEdlbmVyYXRlZEZpbGVOYW1lczogKGZpbGVOYW1lKSA9PiB0aGlzLl9jb21waWxlci5maW5kR2VuZXJhdGVkRmlsZU5hbWVzKGZpbGVOYW1lKSxcbiAgICB9O1xuXG4gICAgdGhpcy5faG9zdEFkYXB0ZXIgPSBuZXcgVHNDb21waWxlckFvdENvbXBpbGVyVHlwZUNoZWNrSG9zdEFkYXB0ZXIoXG4gICAgICAgIHRoaXMucm9vdE5hbWVzLCB0aGlzLm9wdGlvbnMsIHRoaXMuaG9zdCwgdGhpcy5tZXRhZGF0YUNhY2hlLCBjb2RlZ2VuLFxuICAgICAgICB0aGlzLm9sZFByb2dyYW1MaWJyYXJ5U3VtbWFyaWVzKTtcbiAgICBjb25zdCBhb3RPcHRpb25zID0gZ2V0QW90Q29tcGlsZXJPcHRpb25zKHRoaXMub3B0aW9ucyk7XG4gICAgY29uc3QgZXJyb3JDb2xsZWN0b3IgPSAodGhpcy5vcHRpb25zLmNvbGxlY3RBbGxFcnJvcnMgfHwgdGhpcy5vcHRpb25zLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjaykgP1xuICAgICAgICAoZXJyOiBhbnkpID0+IHRoaXMuX2FkZFN0cnVjdHVyYWxEaWFnbm9zdGljcyhlcnIpIDpcbiAgICAgICAgdW5kZWZpbmVkO1xuICAgIHRoaXMuX2NvbXBpbGVyID0gY3JlYXRlQW90Q29tcGlsZXIodGhpcy5faG9zdEFkYXB0ZXIsIGFvdE9wdGlvbnMsIGVycm9yQ29sbGVjdG9yKS5jb21waWxlcjtcbiAgfVxuXG4gIHByaXZhdGUgX2NyZWF0ZVByb2dyYW1XaXRoQmFzaWNTdHVicygpOiB7XG4gICAgdG1wUHJvZ3JhbTogdHMuUHJvZ3JhbSxcbiAgICByb290TmFtZXM6IHN0cmluZ1tdLFxuICAgIHNvdXJjZUZpbGVzOiBzdHJpbmdbXSxcbiAgICB0c0ZpbGVzOiBzdHJpbmdbXSxcbiAgfSB7XG4gICAgaWYgKHRoaXMuX2FuYWx5emVkTW9kdWxlcykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnRlcm5hbCBFcnJvcjogYWxyZWFkeSBpbml0aWFsaXplZCFgKTtcbiAgICB9XG4gICAgLy8gTm90ZTogVGhpcyBpcyBpbXBvcnRhbnQgdG8gbm90IHByb2R1Y2UgYSBtZW1vcnkgbGVhayFcbiAgICBjb25zdCBvbGRUc1Byb2dyYW0gPSB0aGlzLm9sZFRzUHJvZ3JhbTtcbiAgICB0aGlzLm9sZFRzUHJvZ3JhbSA9IHVuZGVmaW5lZDtcblxuICAgIGNvbnN0IGNvZGVnZW46IENvZGVHZW5lcmF0b3IgPSB7XG4gICAgICBnZW5lcmF0ZUZpbGU6IChnZW5GaWxlTmFtZSwgYmFzZUZpbGVOYW1lKSA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb21waWxlci5lbWl0QmFzaWNTdHViKGdlbkZpbGVOYW1lLCBiYXNlRmlsZU5hbWUpLFxuICAgICAgZmluZEdlbmVyYXRlZEZpbGVOYW1lczogKGZpbGVOYW1lKSA9PiB0aGlzLmNvbXBpbGVyLmZpbmRHZW5lcmF0ZWRGaWxlTmFtZXMoZmlsZU5hbWUpLFxuICAgIH07XG5cblxuICAgIGxldCByb290TmFtZXMgPSBbLi4udGhpcy5yb290TmFtZXNdO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZ2VuZXJhdGVDb2RlRm9yTGlicmFyaWVzICE9PSBmYWxzZSkge1xuICAgICAgLy8gaWYgd2Ugc2hvdWxkIGdlbmVyYXRlQ29kZUZvckxpYnJhcmllcywgbmV2ZXIgaW5jbHVkZVxuICAgICAgLy8gZ2VuZXJhdGVkIGZpbGVzIGluIHRoZSBwcm9ncmFtIGFzIG90aGVyd2lzZSB3ZSB3aWxsXG4gICAgICAvLyBvdmVyd3JpdGUgdGhlbSBhbmQgdHlwZXNjcmlwdCB3aWxsIHJlcG9ydCB0aGUgZXJyb3JcbiAgICAgIC8vIFRTNTA1NTogQ2Fubm90IHdyaXRlIGZpbGUgLi4uIGJlY2F1c2UgaXQgd291bGQgb3ZlcndyaXRlIGlucHV0IGZpbGUuXG4gICAgICByb290TmFtZXMgPSByb290TmFtZXMuZmlsdGVyKGZuID0+ICFHRU5FUkFURURfRklMRVMudGVzdChmbikpO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLm5vUmVzb2x2ZSkge1xuICAgICAgdGhpcy5yb290TmFtZXMuZm9yRWFjaChyb290TmFtZSA9PiB7XG4gICAgICAgIGlmICh0aGlzLmhvc3RBZGFwdGVyLnNob3VsZEdlbmVyYXRlRmlsZXNGb3Iocm9vdE5hbWUpKSB7XG4gICAgICAgICAgcm9vdE5hbWVzLnB1c2goLi4udGhpcy5jb21waWxlci5maW5kR2VuZXJhdGVkRmlsZU5hbWVzKHJvb3ROYW1lKSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IHRtcFByb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKHJvb3ROYW1lcywgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3RBZGFwdGVyLCBvbGRUc1Byb2dyYW0pO1xuICAgIGNvbnN0IHNvdXJjZUZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IHRzRmlsZXM6IHN0cmluZ1tdID0gW107XG4gICAgdG1wUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZvckVhY2goc2YgPT4ge1xuICAgICAgaWYgKHRoaXMuaG9zdEFkYXB0ZXIuaXNTb3VyY2VGaWxlKHNmLmZpbGVOYW1lKSkge1xuICAgICAgICBzb3VyY2VGaWxlcy5wdXNoKHNmLmZpbGVOYW1lKTtcbiAgICAgIH1cbiAgICAgIGlmIChUUy50ZXN0KHNmLmZpbGVOYW1lKSAmJiAhRFRTLnRlc3Qoc2YuZmlsZU5hbWUpKSB7XG4gICAgICAgIHRzRmlsZXMucHVzaChzZi5maWxlTmFtZSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHt0bXBQcm9ncmFtLCBzb3VyY2VGaWxlcywgdHNGaWxlcywgcm9vdE5hbWVzfTtcbiAgfVxuXG4gIHByaXZhdGUgX3VwZGF0ZVByb2dyYW1XaXRoVHlwZUNoZWNrU3R1YnMoXG4gICAgICB0bXBQcm9ncmFtOiB0cy5Qcm9ncmFtLCBhbmFseXplZE1vZHVsZXM6IE5nQW5hbHl6ZWRNb2R1bGVzLFxuICAgICAgYW5hbHl6ZWRJbmplY3RhYmxlczogTmdBbmFseXplZEZpbGVXaXRoSW5qZWN0YWJsZXNbXSwgcm9vdE5hbWVzOiBzdHJpbmdbXSkge1xuICAgIHRoaXMuX2FuYWx5emVkTW9kdWxlcyA9IGFuYWx5emVkTW9kdWxlcztcbiAgICB0aGlzLl9hbmFseXplZEluamVjdGFibGVzID0gYW5hbHl6ZWRJbmplY3RhYmxlcztcbiAgICB0bXBQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZm9yRWFjaChzZiA9PiB7XG4gICAgICBpZiAoc2YuZmlsZU5hbWUuZW5kc1dpdGgoJy5uZ2ZhY3RvcnkudHMnKSkge1xuICAgICAgICBjb25zdCB7Z2VuZXJhdGUsIGJhc2VGaWxlTmFtZX0gPSB0aGlzLmhvc3RBZGFwdGVyLnNob3VsZEdlbmVyYXRlRmlsZShzZi5maWxlTmFtZSk7XG4gICAgICAgIGlmIChnZW5lcmF0ZSkge1xuICAgICAgICAgIC8vIE5vdGU6ICEgaXMgb2sgYXMgaG9zdEFkYXB0ZXIuc2hvdWxkR2VuZXJhdGVGaWxlIHdpbGwgYWx3YXlzIHJldHVybiBhIGJhc2VGaWxlTmFtZVxuICAgICAgICAgIC8vIGZvciAubmdmYWN0b3J5LnRzIGZpbGVzLlxuICAgICAgICAgIGNvbnN0IGdlbkZpbGUgPSB0aGlzLmNvbXBpbGVyLmVtaXRUeXBlQ2hlY2tTdHViKHNmLmZpbGVOYW1lLCBiYXNlRmlsZU5hbWUgISk7XG4gICAgICAgICAgaWYgKGdlbkZpbGUpIHtcbiAgICAgICAgICAgIHRoaXMuaG9zdEFkYXB0ZXIudXBkYXRlR2VuZXJhdGVkRmlsZShnZW5GaWxlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLl90c1Byb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKHJvb3ROYW1lcywgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3RBZGFwdGVyLCB0bXBQcm9ncmFtKTtcbiAgICAvLyBOb3RlOiB0aGUgbmV3IHRzIHByb2dyYW0gc2hvdWxkIGJlIGNvbXBsZXRlbHkgcmV1c2FibGUgYnkgVHlwZVNjcmlwdCBhczpcbiAgICAvLyAtIHdlIGNhY2hlIGFsbCB0aGUgZmlsZXMgaW4gdGhlIGhvc3RBZGFwdGVyXG4gICAgLy8gLSBuZXcgbmV3IHN0dWJzIHVzZSB0aGUgZXhhY3RseSBzYW1lIGltcG9ydHMvZXhwb3J0cyBhcyB0aGUgb2xkIG9uY2UgKHdlIGFzc2VydCB0aGF0IGluXG4gICAgLy8gaG9zdEFkYXB0ZXIudXBkYXRlR2VuZXJhdGVkRmlsZSkuXG4gICAgaWYgKHRzU3RydWN0dXJlSXNSZXVzZWQodG1wUHJvZ3JhbSkgIT09IFN0cnVjdHVyZUlzUmV1c2VkLkNvbXBsZXRlbHkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW50ZXJuYWwgRXJyb3I6IFRoZSBzdHJ1Y3R1cmUgb2YgdGhlIHByb2dyYW0gY2hhbmdlZCBkdXJpbmcgY29kZWdlbi5gKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9jcmVhdGVQcm9ncmFtT25FcnJvcihlOiBhbnkpIHtcbiAgICAvLyBTdGlsbCBmaWxsIHRoZSBhbmFseXplZE1vZHVsZXMgYW5kIHRoZSB0c1Byb2dyYW1cbiAgICAvLyBzbyB0aGF0IHdlIGRvbid0IGNhdXNlIG90aGVyIGVycm9ycyBmb3IgdXNlcnMgd2hvIGUuZy4gd2FudCB0byBlbWl0IHRoZSBuZ1Byb2dyYW0uXG4gICAgdGhpcy5fYW5hbHl6ZWRNb2R1bGVzID0gZW1wdHlNb2R1bGVzO1xuICAgIHRoaXMub2xkVHNQcm9ncmFtID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX2hvc3RBZGFwdGVyLmlzU291cmNlRmlsZSA9ICgpID0+IGZhbHNlO1xuICAgIHRoaXMuX3RzUHJvZ3JhbSA9IHRzLmNyZWF0ZVByb2dyYW0odGhpcy5yb290TmFtZXMsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0QWRhcHRlcik7XG4gICAgaWYgKGlzU3ludGF4RXJyb3IoZSkpIHtcbiAgICAgIHRoaXMuX2FkZFN0cnVjdHVyYWxEaWFnbm9zdGljcyhlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhyb3cgZTtcbiAgfVxuXG4gIHByaXZhdGUgX2FkZFN0cnVjdHVyYWxEaWFnbm9zdGljcyhlcnJvcjogRXJyb3IpIHtcbiAgICBjb25zdCBkaWFnbm9zdGljcyA9IHRoaXMuX3N0cnVjdHVyYWxEaWFnbm9zdGljcyB8fCAodGhpcy5fc3RydWN0dXJhbERpYWdub3N0aWNzID0gW10pO1xuICAgIGlmIChpc1N5bnRheEVycm9yKGVycm9yKSkge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5zeW50YXhFcnJvclRvRGlhZ25vc3RpY3MoZXJyb3IpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCh7XG4gICAgICAgIG1lc3NhZ2VUZXh0OiBlcnJvci50b1N0cmluZygpLFxuICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICBzb3VyY2U6IFNPVVJDRSxcbiAgICAgICAgY29kZTogREVGQVVMVF9FUlJPUl9DT0RFXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvLyBOb3RlOiB0aGlzIHJldHVybnMgYSB0cy5EaWFnbm9zdGljIHNvIHRoYXQgd2VcbiAgLy8gY2FuIHJldHVybiBlcnJvcnMgaW4gYSB0cy5FbWl0UmVzdWx0XG4gIHByaXZhdGUgZ2VuZXJhdGVGaWxlc0ZvckVtaXQoZW1pdEZsYWdzOiBFbWl0RmxhZ3MpOlxuICAgICAge2dlbkZpbGVzOiBHZW5lcmF0ZWRGaWxlW10sIGdlbkRpYWdzOiB0cy5EaWFnbm9zdGljW119IHtcbiAgICB0cnkge1xuICAgICAgaWYgKCEoZW1pdEZsYWdzICYgRW1pdEZsYWdzLkNvZGVnZW4pKSB7XG4gICAgICAgIHJldHVybiB7Z2VuRmlsZXM6IFtdLCBnZW5EaWFnczogW119O1xuICAgICAgfVxuICAgICAgLy8gVE9ETyh0Ym9zY2gpOiBhbGxvdyBnZW5lcmF0aW5nIGZpbGVzIHRoYXQgYXJlIG5vdCBpbiB0aGUgcm9vdERpclxuICAgICAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvaXNzdWVzLzE5MzM3XG4gICAgICBsZXQgZ2VuRmlsZXMgPSB0aGlzLmNvbXBpbGVyLmVtaXRBbGxJbXBscyh0aGlzLmFuYWx5emVkTW9kdWxlcylcbiAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGdlbkZpbGUgPT4gaXNJblJvb3REaXIoZ2VuRmlsZS5nZW5GaWxlVXJsLCB0aGlzLm9wdGlvbnMpKTtcbiAgICAgIGlmICh0aGlzLm9sZFByb2dyYW1FbWl0dGVkR2VuZXJhdGVkRmlsZXMpIHtcbiAgICAgICAgY29uc3Qgb2xkUHJvZ3JhbUVtaXR0ZWRHZW5lcmF0ZWRGaWxlcyA9IHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRHZW5lcmF0ZWRGaWxlcztcbiAgICAgICAgZ2VuRmlsZXMgPSBnZW5GaWxlcy5maWx0ZXIoZ2VuRmlsZSA9PiB7XG4gICAgICAgICAgY29uc3Qgb2xkR2VuRmlsZSA9IG9sZFByb2dyYW1FbWl0dGVkR2VuZXJhdGVkRmlsZXMuZ2V0KGdlbkZpbGUuZ2VuRmlsZVVybCk7XG4gICAgICAgICAgcmV0dXJuICFvbGRHZW5GaWxlIHx8ICFnZW5GaWxlLmlzRXF1aXZhbGVudChvbGRHZW5GaWxlKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4ge2dlbkZpbGVzLCBnZW5EaWFnczogW119O1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIFRPRE8odGJvc2NoKTogY2hlY2sgd2hldGhlciB3ZSBjYW4gYWN0dWFsbHkgaGF2ZSBzeW50YXggZXJyb3JzIGhlcmUsXG4gICAgICAvLyBhcyB3ZSBhbHJlYWR5IHBhcnNlZCB0aGUgbWV0YWRhdGEgYW5kIHRlbXBsYXRlcyBiZWZvcmUgdG8gY3JlYXRlIHRoZSB0eXBlIGNoZWNrIGJsb2NrLlxuICAgICAgaWYgKGlzU3ludGF4RXJyb3IoZSkpIHtcbiAgICAgICAgY29uc3QgZ2VuRGlhZ3M6IHRzLkRpYWdub3N0aWNbXSA9IFt7XG4gICAgICAgICAgZmlsZTogdW5kZWZpbmVkLFxuICAgICAgICAgIHN0YXJ0OiB1bmRlZmluZWQsXG4gICAgICAgICAgbGVuZ3RoOiB1bmRlZmluZWQsXG4gICAgICAgICAgbWVzc2FnZVRleHQ6IGUubWVzc2FnZSxcbiAgICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICAgIHNvdXJjZTogU09VUkNFLFxuICAgICAgICAgIGNvZGU6IERFRkFVTFRfRVJST1JfQ09ERVxuICAgICAgICB9XTtcbiAgICAgICAgcmV0dXJuIHtnZW5GaWxlczogW10sIGdlbkRpYWdzfTtcbiAgICAgIH1cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdW5kZWZpbmVkIGlmIGFsbCBmaWxlcyBzaG91bGQgYmUgZW1pdHRlZC5cbiAgICovXG4gIHByaXZhdGUgZ2V0U291cmNlRmlsZXNGb3JFbWl0KCk6IHRzLlNvdXJjZUZpbGVbXXx1bmRlZmluZWQge1xuICAgIC8vIFRPRE8odGJvc2NoKTogaWYgb25lIG9mIHRoZSBmaWxlcyBjb250YWlucyBhIGBjb25zdCBlbnVtYFxuICAgIC8vIGFsd2F5cyBlbWl0IGFsbCBmaWxlcyAtPiByZXR1cm4gdW5kZWZpbmVkIVxuICAgIGxldCBzb3VyY2VGaWxlc1RvRW1pdCA9IHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZmlsdGVyKFxuICAgICAgICBzZiA9PiB7IHJldHVybiAhc2YuaXNEZWNsYXJhdGlvbkZpbGUgJiYgIUdFTkVSQVRFRF9GSUxFUy50ZXN0KHNmLmZpbGVOYW1lKTsgfSk7XG4gICAgaWYgKHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRTb3VyY2VGaWxlcykge1xuICAgICAgc291cmNlRmlsZXNUb0VtaXQgPSBzb3VyY2VGaWxlc1RvRW1pdC5maWx0ZXIoc2YgPT4ge1xuICAgICAgICBjb25zdCBvbGRGaWxlID0gdGhpcy5vbGRQcm9ncmFtRW1pdHRlZFNvdXJjZUZpbGVzICEuZ2V0KHNmLmZpbGVOYW1lKTtcbiAgICAgICAgcmV0dXJuIHNmICE9PSBvbGRGaWxlO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBzb3VyY2VGaWxlc1RvRW1pdDtcbiAgfVxuXG4gIHByaXZhdGUgd3JpdGVGaWxlKFxuICAgICAgb3V0RmlsZU5hbWU6IHN0cmluZywgb3V0RGF0YTogc3RyaW5nLCB3cml0ZUJ5dGVPcmRlck1hcms6IGJvb2xlYW4sXG4gICAgICBvbkVycm9yPzogKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCwgZ2VuRmlsZT86IEdlbmVyYXRlZEZpbGUsXG4gICAgICBzb3VyY2VGaWxlcz86IFJlYWRvbmx5QXJyYXk8dHMuU291cmNlRmlsZT4pIHtcbiAgICAvLyBjb2xsZWN0IGVtaXR0ZWRMaWJyYXJ5U3VtbWFyaWVzXG4gICAgbGV0IGJhc2VGaWxlOiB0cy5Tb3VyY2VGaWxlfHVuZGVmaW5lZDtcbiAgICBpZiAoZ2VuRmlsZSkge1xuICAgICAgYmFzZUZpbGUgPSB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGdlbkZpbGUuc3JjRmlsZVVybCk7XG4gICAgICBpZiAoYmFzZUZpbGUpIHtcbiAgICAgICAgaWYgKCF0aGlzLmVtaXR0ZWRMaWJyYXJ5U3VtbWFyaWVzKSB7XG4gICAgICAgICAgdGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcyA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChnZW5GaWxlLmdlbkZpbGVVcmwuZW5kc1dpdGgoJy5uZ3N1bW1hcnkuanNvbicpICYmIGJhc2VGaWxlLmZpbGVOYW1lLmVuZHNXaXRoKCcuZC50cycpKSB7XG4gICAgICAgICAgdGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcy5wdXNoKHtcbiAgICAgICAgICAgIGZpbGVOYW1lOiBiYXNlRmlsZS5maWxlTmFtZSxcbiAgICAgICAgICAgIHRleHQ6IGJhc2VGaWxlLnRleHQsXG4gICAgICAgICAgICBzb3VyY2VGaWxlOiBiYXNlRmlsZSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICB0aGlzLmVtaXR0ZWRMaWJyYXJ5U3VtbWFyaWVzLnB1c2goe2ZpbGVOYW1lOiBnZW5GaWxlLmdlbkZpbGVVcmwsIHRleHQ6IG91dERhdGF9KTtcbiAgICAgICAgICBpZiAoIXRoaXMub3B0aW9ucy5kZWNsYXJhdGlvbikge1xuICAgICAgICAgICAgLy8gSWYgd2UgZG9uJ3QgZW1pdCBkZWNsYXJhdGlvbnMsIHN0aWxsIHJlY29yZCBhbiBlbXB0eSAubmdmYWN0b3J5LmQudHMgZmlsZSxcbiAgICAgICAgICAgIC8vIGFzIHdlIG1pZ2h0IG5lZWQgaXQgbGF0ZXIgb24gZm9yIHJlc29sdmluZyBtb2R1bGUgbmFtZXMgZnJvbSBzdW1tYXJpZXMuXG4gICAgICAgICAgICBjb25zdCBuZ0ZhY3RvcnlEdHMgPVxuICAgICAgICAgICAgICAgIGdlbkZpbGUuZ2VuRmlsZVVybC5zdWJzdHJpbmcoMCwgZ2VuRmlsZS5nZW5GaWxlVXJsLmxlbmd0aCAtIDE1KSArICcubmdmYWN0b3J5LmQudHMnO1xuICAgICAgICAgICAgdGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcy5wdXNoKHtmaWxlTmFtZTogbmdGYWN0b3J5RHRzLCB0ZXh0OiAnJ30pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChvdXRGaWxlTmFtZS5lbmRzV2l0aCgnLmQudHMnKSAmJiBiYXNlRmlsZS5maWxlTmFtZS5lbmRzV2l0aCgnLmQudHMnKSkge1xuICAgICAgICAgIGNvbnN0IGR0c1NvdXJjZUZpbGVQYXRoID0gZ2VuRmlsZS5nZW5GaWxlVXJsLnJlcGxhY2UoL1xcLnRzJC8sICcuZC50cycpO1xuICAgICAgICAgIC8vIE5vdGU6IERvbid0IHVzZSBzb3VyY2VGaWxlcyBoZXJlIGFzIHRoZSBjcmVhdGVkIC5kLnRzIGhhcyBhIHBhdGggaW4gdGhlIG91dERpcixcbiAgICAgICAgICAvLyBidXQgd2UgbmVlZCBvbmUgdGhhdCBpcyBuZXh0IHRvIHRoZSAudHMgZmlsZVxuICAgICAgICAgIHRoaXMuZW1pdHRlZExpYnJhcnlTdW1tYXJpZXMucHVzaCh7ZmlsZU5hbWU6IGR0c1NvdXJjZUZpbGVQYXRoLCB0ZXh0OiBvdXREYXRhfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gRmlsdGVyIG91dCBnZW5lcmF0ZWQgZmlsZXMgZm9yIHdoaWNoIHdlIGRpZG4ndCBnZW5lcmF0ZSBjb2RlLlxuICAgIC8vIFRoaXMgY2FuIGhhcHBlbiBhcyB0aGUgc3R1YiBjYWxjdWxhdGlvbiBpcyBub3QgY29tcGxldGVseSBleGFjdC5cbiAgICAvLyBOb3RlOiBzb3VyY2VGaWxlIHJlZmVycyB0byB0aGUgLm5nZmFjdG9yeS50cyAvIC5uZ3N1bW1hcnkudHMgZmlsZVxuICAgIC8vIG5vZGVfZW1pdHRlcl90cmFuc2Zvcm0gYWxyZWFkeSBzZXQgdGhlIGZpbGUgY29udGVudHMgdG8gYmUgZW1wdHksXG4gICAgLy8gIHNvIHRoaXMgY29kZSBvbmx5IG5lZWRzIHRvIHNraXAgdGhlIGZpbGUgaWYgIWFsbG93RW1wdHlDb2RlZ2VuRmlsZXMuXG4gICAgY29uc3QgaXNHZW5lcmF0ZWQgPSBHRU5FUkFURURfRklMRVMudGVzdChvdXRGaWxlTmFtZSk7XG4gICAgaWYgKGlzR2VuZXJhdGVkICYmICF0aGlzLm9wdGlvbnMuYWxsb3dFbXB0eUNvZGVnZW5GaWxlcyAmJlxuICAgICAgICAoIWdlbkZpbGUgfHwgIWdlbkZpbGUuc3RtdHMgfHwgZ2VuRmlsZS5zdG10cy5sZW5ndGggPT09IDApKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChiYXNlRmlsZSkge1xuICAgICAgc291cmNlRmlsZXMgPSBzb3VyY2VGaWxlcyA/IFsuLi5zb3VyY2VGaWxlcywgYmFzZUZpbGVdIDogW2Jhc2VGaWxlXTtcbiAgICB9XG4gICAgLy8gVE9ETzogcmVtb3ZlIGFueSB3aGVuIFRTIDIuNCBzdXBwb3J0IGlzIHJlbW92ZWQuXG4gICAgdGhpcy5ob3N0LndyaXRlRmlsZShvdXRGaWxlTmFtZSwgb3V0RGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCBzb3VyY2VGaWxlcyBhcyBhbnkpO1xuICB9XG59XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgYSBnaXZlbiB2ZXJzaW9uIOKIiCBbbWluVmVyc2lvbiwgbWF4VmVyc2lvbltcbiAqIEFuIGVycm9yIHdpbGwgYmUgdGhyb3duIGlmIHRoZSBmb2xsb3dpbmcgc3RhdGVtZW50cyBhcmUgc2ltdWx0YW5lb3VzbHkgdHJ1ZTpcbiAqIC0gdGhlIGdpdmVuIHZlcnNpb24g4oiJIFttaW5WZXJzaW9uLCBtYXhWZXJzaW9uWyxcbiAqIC0gdGhlIHJlc3VsdCBvZiB0aGUgdmVyc2lvbiBjaGVjayBpcyBub3QgbWVhbnQgdG8gYmUgYnlwYXNzZWQgKHRoZSBwYXJhbWV0ZXIgZGlzYWJsZVZlcnNpb25DaGVja1xuICogaXMgZmFsc2UpXG4gKlxuICogQHBhcmFtIHZlcnNpb24gVGhlIHZlcnNpb24gb24gd2hpY2ggdGhlIGNoZWNrIHdpbGwgYmUgcGVyZm9ybWVkXG4gKiBAcGFyYW0gbWluVmVyc2lvbiBUaGUgbG93ZXIgYm91bmQgdmVyc2lvbi4gQSB2YWxpZCB2ZXJzaW9uIG5lZWRzIHRvIGJlIGdyZWF0ZXIgdGhhbiBtaW5WZXJzaW9uXG4gKiBAcGFyYW0gbWF4VmVyc2lvbiBUaGUgdXBwZXIgYm91bmQgdmVyc2lvbi4gQSB2YWxpZCB2ZXJzaW9uIG5lZWRzIHRvIGJlIHN0cmljdGx5IGxlc3MgdGhhblxuICogbWF4VmVyc2lvblxuICogQHBhcmFtIGRpc2FibGVWZXJzaW9uQ2hlY2sgSW5kaWNhdGVzIHdoZXRoZXIgdmVyc2lvbiBjaGVjayBzaG91bGQgYmUgYnlwYXNzZWRcbiAqXG4gKiBAdGhyb3dzIFdpbGwgdGhyb3cgYW4gZXJyb3IgaWYgdGhlIGZvbGxvd2luZyBzdGF0ZW1lbnRzIGFyZSBzaW11bHRhbmVvdXNseSB0cnVlOlxuICogLSB0aGUgZ2l2ZW4gdmVyc2lvbiDiiIkgW21pblZlcnNpb24sIG1heFZlcnNpb25bLFxuICogLSB0aGUgcmVzdWx0IG9mIHRoZSB2ZXJzaW9uIGNoZWNrIGlzIG5vdCBtZWFudCB0byBiZSBieXBhc3NlZCAodGhlIHBhcmFtZXRlciBkaXNhYmxlVmVyc2lvbkNoZWNrXG4gKiBpcyBmYWxzZSlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrVmVyc2lvbihcbiAgICB2ZXJzaW9uOiBzdHJpbmcsIG1pblZlcnNpb246IHN0cmluZywgbWF4VmVyc2lvbjogc3RyaW5nLFxuICAgIGRpc2FibGVWZXJzaW9uQ2hlY2s6IGJvb2xlYW4gfCB1bmRlZmluZWQpIHtcbiAgaWYgKChjb21wYXJlVmVyc2lvbnModmVyc2lvbiwgbWluVmVyc2lvbikgPCAwIHx8IGNvbXBhcmVWZXJzaW9ucyh2ZXJzaW9uLCBtYXhWZXJzaW9uKSA+PSAwKSAmJlxuICAgICAgIWRpc2FibGVWZXJzaW9uQ2hlY2spIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBUaGUgQW5ndWxhciBDb21waWxlciByZXF1aXJlcyBUeXBlU2NyaXB0ID49JHttaW5WZXJzaW9ufSBhbmQgPCR7bWF4VmVyc2lvbn0gYnV0ICR7dmVyc2lvbn0gd2FzIGZvdW5kIGluc3RlYWQuYCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVByb2dyYW0oe3Jvb3ROYW1lcywgb3B0aW9ucywgaG9zdCwgb2xkUHJvZ3JhbX06IHtcbiAgcm9vdE5hbWVzOiBSZWFkb25seUFycmF5PHN0cmluZz4sXG4gIG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucyxcbiAgaG9zdDogQ29tcGlsZXJIb3N0LCBvbGRQcm9ncmFtPzogUHJvZ3JhbVxufSk6IFByb2dyYW0ge1xuICBpZiAob3B0aW9ucy5lbmFibGVJdnkgPT09ICduZ3RzYycpIHtcbiAgICByZXR1cm4gbmV3IE5ndHNjUHJvZ3JhbShyb290TmFtZXMsIG9wdGlvbnMsIGhvc3QsIG9sZFByb2dyYW0pO1xuICB9XG4gIHJldHVybiBuZXcgQW5ndWxhckNvbXBpbGVyUHJvZ3JhbShyb290TmFtZXMsIG9wdGlvbnMsIGhvc3QsIG9sZFByb2dyYW0pO1xufVxuXG4vLyBDb21wdXRlIHRoZSBBb3RDb21waWxlciBvcHRpb25zXG5mdW5jdGlvbiBnZXRBb3RDb21waWxlck9wdGlvbnMob3B0aW9uczogQ29tcGlsZXJPcHRpb25zKTogQW90Q29tcGlsZXJPcHRpb25zIHtcbiAgbGV0IG1pc3NpbmdUcmFuc2xhdGlvbiA9IGNvcmUuTWlzc2luZ1RyYW5zbGF0aW9uU3RyYXRlZ3kuV2FybmluZztcblxuICBzd2l0Y2ggKG9wdGlvbnMuaTE4bkluTWlzc2luZ1RyYW5zbGF0aW9ucykge1xuICAgIGNhc2UgJ2lnbm9yZSc6XG4gICAgICBtaXNzaW5nVHJhbnNsYXRpb24gPSBjb3JlLk1pc3NpbmdUcmFuc2xhdGlvblN0cmF0ZWd5Lklnbm9yZTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgIG1pc3NpbmdUcmFuc2xhdGlvbiA9IGNvcmUuTWlzc2luZ1RyYW5zbGF0aW9uU3RyYXRlZ3kuRXJyb3I7XG4gICAgICBicmVhaztcbiAgfVxuXG4gIGxldCB0cmFuc2xhdGlvbnM6IHN0cmluZyA9ICcnO1xuXG4gIGlmIChvcHRpb25zLmkxOG5JbkZpbGUpIHtcbiAgICBpZiAoIW9wdGlvbnMuaTE4bkluTG9jYWxlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSB0cmFuc2xhdGlvbiBmaWxlICgke29wdGlvbnMuaTE4bkluRmlsZX0pIGxvY2FsZSBtdXN0IGJlIHByb3ZpZGVkLmApO1xuICAgIH1cbiAgICB0cmFuc2xhdGlvbnMgPSBmcy5yZWFkRmlsZVN5bmMob3B0aW9ucy5pMThuSW5GaWxlLCAndXRmOCcpO1xuICB9IGVsc2Uge1xuICAgIC8vIE5vIHRyYW5zbGF0aW9ucyBhcmUgcHJvdmlkZWQsIGlnbm9yZSBhbnkgZXJyb3JzXG4gICAgLy8gV2Ugc3RpbGwgZ28gdGhyb3VnaCBpMThuIHRvIHJlbW92ZSBpMThuIGF0dHJpYnV0ZXNcbiAgICBtaXNzaW5nVHJhbnNsYXRpb24gPSBjb3JlLk1pc3NpbmdUcmFuc2xhdGlvblN0cmF0ZWd5Lklnbm9yZTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgbG9jYWxlOiBvcHRpb25zLmkxOG5JbkxvY2FsZSxcbiAgICBpMThuRm9ybWF0OiBvcHRpb25zLmkxOG5JbkZvcm1hdCB8fCBvcHRpb25zLmkxOG5PdXRGb3JtYXQsIHRyYW5zbGF0aW9ucywgbWlzc2luZ1RyYW5zbGF0aW9uLFxuICAgIGVuYWJsZVN1bW1hcmllc0ZvckppdDogb3B0aW9ucy5lbmFibGVTdW1tYXJpZXNGb3JKaXQsXG4gICAgcHJlc2VydmVXaGl0ZXNwYWNlczogb3B0aW9ucy5wcmVzZXJ2ZVdoaXRlc3BhY2VzLFxuICAgIGZ1bGxUZW1wbGF0ZVR5cGVDaGVjazogb3B0aW9ucy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2ssXG4gICAgYWxsb3dFbXB0eUNvZGVnZW5GaWxlczogb3B0aW9ucy5hbGxvd0VtcHR5Q29kZWdlbkZpbGVzLFxuICAgIGVuYWJsZUl2eTogb3B0aW9ucy5lbmFibGVJdnksXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldE5nT3B0aW9uRGlhZ25vc3RpY3Mob3B0aW9uczogQ29tcGlsZXJPcHRpb25zKTogUmVhZG9ubHlBcnJheTxEaWFnbm9zdGljPiB7XG4gIGlmIChvcHRpb25zLmFubm90YXRpb25zQXMpIHtcbiAgICBzd2l0Y2ggKG9wdGlvbnMuYW5ub3RhdGlvbnNBcykge1xuICAgICAgY2FzZSAnZGVjb3JhdG9ycyc6XG4gICAgICBjYXNlICdzdGF0aWMgZmllbGRzJzpcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gW3tcbiAgICAgICAgICBtZXNzYWdlVGV4dDpcbiAgICAgICAgICAgICAgJ0FuZ3VsYXIgY29tcGlsZXIgb3B0aW9ucyBcImFubm90YXRpb25zQXNcIiBvbmx5IHN1cHBvcnRzIFwic3RhdGljIGZpZWxkc1wiIGFuZCBcImRlY29yYXRvcnNcIicsXG4gICAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgICBzb3VyY2U6IFNPVVJDRSxcbiAgICAgICAgICBjb2RlOiBERUZBVUxUX0VSUk9SX0NPREVcbiAgICAgICAgfV07XG4gICAgfVxuICB9XG4gIHJldHVybiBbXTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplU2VwYXJhdG9ycyhwYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gcGF0aC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG59XG5cbi8qKlxuICogUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgY2FuIGFkanVzdCBhIHBhdGggZnJvbSBzb3VyY2UgcGF0aCB0byBvdXQgcGF0aCxcbiAqIGJhc2VkIG9uIGFuIGV4aXN0aW5nIG1hcHBpbmcgZnJvbSBzb3VyY2UgdG8gb3V0IHBhdGguXG4gKlxuICogVE9ETyh0Ym9zY2gpOiB0YWxrIHRvIHRoZSBUeXBlU2NyaXB0IHRlYW0gdG8gZXhwb3NlIHRoZWlyIGxvZ2ljIGZvciBjYWxjdWxhdGluZyB0aGUgYHJvb3REaXJgXG4gKiBpZiBub25lIHdhcyBzcGVjaWZpZWQuXG4gKlxuICogTm90ZTogVGhpcyBmdW5jdGlvbiB3b3JrcyBvbiBub3JtYWxpemVkIHBhdGhzIGZyb20gdHlwZXNjcmlwdC5cbiAqXG4gKiBAcGFyYW0gb3V0RGlyXG4gKiBAcGFyYW0gb3V0U3JjTWFwcGluZ3NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNyY1RvT3V0UGF0aE1hcHBlcihcbiAgICBvdXREaXI6IHN0cmluZyB8IHVuZGVmaW5lZCwgc2FtcGxlU3JjRmlsZU5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgICBzYW1wbGVPdXRGaWxlTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBob3N0OiB7XG4gICAgICBkaXJuYW1lOiB0eXBlb2YgcGF0aC5kaXJuYW1lLFxuICAgICAgcmVzb2x2ZTogdHlwZW9mIHBhdGgucmVzb2x2ZSxcbiAgICAgIHJlbGF0aXZlOiB0eXBlb2YgcGF0aC5yZWxhdGl2ZVxuICAgIH0gPSBwYXRoKTogKHNyY0ZpbGVOYW1lOiBzdHJpbmcpID0+IHN0cmluZyB7XG4gIGxldCBzcmNUb091dFBhdGg6IChzcmNGaWxlTmFtZTogc3RyaW5nKSA9PiBzdHJpbmc7XG4gIGlmIChvdXREaXIpIHtcbiAgICBsZXQgcGF0aDoge30gPSB7fTsgIC8vIEVuc3VyZSB3ZSBlcnJvciBpZiB3ZSB1c2UgYHBhdGhgIGluc3RlYWQgb2YgYGhvc3RgLlxuICAgIGlmIChzYW1wbGVTcmNGaWxlTmFtZSA9PSBudWxsIHx8IHNhbXBsZU91dEZpbGVOYW1lID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2FuJ3QgY2FsY3VsYXRlIHRoZSByb290RGlyIHdpdGhvdXQgYSBzYW1wbGUgc3JjRmlsZU5hbWUgLyBvdXRGaWxlTmFtZS4gYCk7XG4gICAgfVxuICAgIGNvbnN0IHNyY0ZpbGVEaXIgPSBub3JtYWxpemVTZXBhcmF0b3JzKGhvc3QuZGlybmFtZShzYW1wbGVTcmNGaWxlTmFtZSkpO1xuICAgIGNvbnN0IG91dEZpbGVEaXIgPSBub3JtYWxpemVTZXBhcmF0b3JzKGhvc3QuZGlybmFtZShzYW1wbGVPdXRGaWxlTmFtZSkpO1xuICAgIGlmIChzcmNGaWxlRGlyID09PSBvdXRGaWxlRGlyKSB7XG4gICAgICByZXR1cm4gKHNyY0ZpbGVOYW1lKSA9PiBzcmNGaWxlTmFtZTtcbiAgICB9XG4gICAgLy8gY2FsY3VsYXRlIHRoZSBjb21tb24gc3VmZml4LCBzdG9wcGluZ1xuICAgIC8vIGF0IGBvdXREaXJgLlxuICAgIGNvbnN0IHNyY0RpclBhcnRzID0gc3JjRmlsZURpci5zcGxpdCgnLycpO1xuICAgIGNvbnN0IG91dERpclBhcnRzID0gbm9ybWFsaXplU2VwYXJhdG9ycyhob3N0LnJlbGF0aXZlKG91dERpciwgb3V0RmlsZURpcikpLnNwbGl0KCcvJyk7XG4gICAgbGV0IGkgPSAwO1xuICAgIHdoaWxlIChpIDwgTWF0aC5taW4oc3JjRGlyUGFydHMubGVuZ3RoLCBvdXREaXJQYXJ0cy5sZW5ndGgpICYmXG4gICAgICAgICAgIHNyY0RpclBhcnRzW3NyY0RpclBhcnRzLmxlbmd0aCAtIDEgLSBpXSA9PT0gb3V0RGlyUGFydHNbb3V0RGlyUGFydHMubGVuZ3RoIC0gMSAtIGldKVxuICAgICAgaSsrO1xuICAgIGNvbnN0IHJvb3REaXIgPSBzcmNEaXJQYXJ0cy5zbGljZSgwLCBzcmNEaXJQYXJ0cy5sZW5ndGggLSBpKS5qb2luKCcvJyk7XG4gICAgc3JjVG9PdXRQYXRoID0gKHNyY0ZpbGVOYW1lKSA9PiBob3N0LnJlc29sdmUob3V0RGlyLCBob3N0LnJlbGF0aXZlKHJvb3REaXIsIHNyY0ZpbGVOYW1lKSk7XG4gIH0gZWxzZSB7XG4gICAgc3JjVG9PdXRQYXRoID0gKHNyY0ZpbGVOYW1lKSA9PiBzcmNGaWxlTmFtZTtcbiAgfVxuICByZXR1cm4gc3JjVG9PdXRQYXRoO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaTE4bkV4dHJhY3QoXG4gICAgZm9ybWF0TmFtZTogc3RyaW5nIHwgbnVsbCwgb3V0RmlsZTogc3RyaW5nIHwgbnVsbCwgaG9zdDogdHMuQ29tcGlsZXJIb3N0LFxuICAgIG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucywgYnVuZGxlOiBNZXNzYWdlQnVuZGxlKTogc3RyaW5nW10ge1xuICBmb3JtYXROYW1lID0gZm9ybWF0TmFtZSB8fCAneGxmJztcbiAgLy8gQ2hlY2tzIHRoZSBmb3JtYXQgYW5kIHJldHVybnMgdGhlIGV4dGVuc2lvblxuICBjb25zdCBleHQgPSBpMThuR2V0RXh0ZW5zaW9uKGZvcm1hdE5hbWUpO1xuICBjb25zdCBjb250ZW50ID0gaTE4blNlcmlhbGl6ZShidW5kbGUsIGZvcm1hdE5hbWUsIG9wdGlvbnMpO1xuICBjb25zdCBkc3RGaWxlID0gb3V0RmlsZSB8fCBgbWVzc2FnZXMuJHtleHR9YDtcbiAgY29uc3QgZHN0UGF0aCA9IHBhdGgucmVzb2x2ZShvcHRpb25zLm91dERpciB8fCBvcHRpb25zLmJhc2VQYXRoLCBkc3RGaWxlKTtcbiAgaG9zdC53cml0ZUZpbGUoZHN0UGF0aCwgY29udGVudCwgZmFsc2UsIHVuZGVmaW5lZCwgW10pO1xuICByZXR1cm4gW2RzdFBhdGhdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaTE4blNlcmlhbGl6ZShcbiAgICBidW5kbGU6IE1lc3NhZ2VCdW5kbGUsIGZvcm1hdE5hbWU6IHN0cmluZywgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zKTogc3RyaW5nIHtcbiAgY29uc3QgZm9ybWF0ID0gZm9ybWF0TmFtZS50b0xvd2VyQ2FzZSgpO1xuICBsZXQgc2VyaWFsaXplcjogU2VyaWFsaXplcjtcblxuICBzd2l0Y2ggKGZvcm1hdCkge1xuICAgIGNhc2UgJ3htYic6XG4gICAgICBzZXJpYWxpemVyID0gbmV3IFhtYigpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAneGxpZmYyJzpcbiAgICBjYXNlICd4bGYyJzpcbiAgICAgIHNlcmlhbGl6ZXIgPSBuZXcgWGxpZmYyKCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICd4bGYnOlxuICAgIGNhc2UgJ3hsaWZmJzpcbiAgICBkZWZhdWx0OlxuICAgICAgc2VyaWFsaXplciA9IG5ldyBYbGlmZigpO1xuICB9XG5cbiAgcmV0dXJuIGJ1bmRsZS53cml0ZShzZXJpYWxpemVyLCBnZXRQYXRoTm9ybWFsaXplcihvcHRpb25zLmJhc2VQYXRoKSk7XG59XG5cbmZ1bmN0aW9uIGdldFBhdGhOb3JtYWxpemVyKGJhc2VQYXRoPzogc3RyaW5nKSB7XG4gIC8vIG5vcm1hbGl6ZSBzb3VyY2UgcGF0aHMgYnkgcmVtb3ZpbmcgdGhlIGJhc2UgcGF0aCBhbmQgYWx3YXlzIHVzaW5nIFwiL1wiIGFzIGEgc2VwYXJhdG9yXG4gIHJldHVybiAoc291cmNlUGF0aDogc3RyaW5nKSA9PiB7XG4gICAgc291cmNlUGF0aCA9IGJhc2VQYXRoID8gcGF0aC5yZWxhdGl2ZShiYXNlUGF0aCwgc291cmNlUGF0aCkgOiBzb3VyY2VQYXRoO1xuICAgIHJldHVybiBzb3VyY2VQYXRoLnNwbGl0KHBhdGguc2VwKS5qb2luKCcvJyk7XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpMThuR2V0RXh0ZW5zaW9uKGZvcm1hdE5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGZvcm1hdCA9IGZvcm1hdE5hbWUudG9Mb3dlckNhc2UoKTtcblxuICBzd2l0Y2ggKGZvcm1hdCkge1xuICAgIGNhc2UgJ3htYic6XG4gICAgICByZXR1cm4gJ3htYic7XG4gICAgY2FzZSAneGxmJzpcbiAgICBjYXNlICd4bGlmJzpcbiAgICBjYXNlICd4bGlmZic6XG4gICAgY2FzZSAneGxmMic6XG4gICAgY2FzZSAneGxpZmYyJzpcbiAgICAgIHJldHVybiAneGxmJztcbiAgfVxuXG4gIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgZm9ybWF0IFwiJHtmb3JtYXROYW1lfVwiYCk7XG59XG5cbmZ1bmN0aW9uIG1lcmdlRW1pdFJlc3VsdHMoZW1pdFJlc3VsdHM6IHRzLkVtaXRSZXN1bHRbXSk6IHRzLkVtaXRSZXN1bHQge1xuICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gIGxldCBlbWl0U2tpcHBlZCA9IGZhbHNlO1xuICBjb25zdCBlbWl0dGVkRmlsZXM6IHN0cmluZ1tdID0gW107XG4gIGZvciAoY29uc3QgZXIgb2YgZW1pdFJlc3VsdHMpIHtcbiAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmVyLmRpYWdub3N0aWNzKTtcbiAgICBlbWl0U2tpcHBlZCA9IGVtaXRTa2lwcGVkIHx8IGVyLmVtaXRTa2lwcGVkO1xuICAgIGVtaXR0ZWRGaWxlcy5wdXNoKC4uLihlci5lbWl0dGVkRmlsZXMgfHwgW10pKTtcbiAgfVxuICByZXR1cm4ge2RpYWdub3N0aWNzLCBlbWl0U2tpcHBlZCwgZW1pdHRlZEZpbGVzfTtcbn1cblxuZnVuY3Rpb24gZGlhZ25vc3RpY1NvdXJjZU9mU3BhbihzcGFuOiBQYXJzZVNvdXJjZVNwYW4pOiB0cy5Tb3VyY2VGaWxlIHtcbiAgLy8gRm9yIGRpYWdub3N0aWNzLCBUeXBlU2NyaXB0IG9ubHkgdXNlcyB0aGUgZmlsZU5hbWUgYW5kIHRleHQgcHJvcGVydGllcy5cbiAgLy8gVGhlIHJlZHVuZGFudCAnKCknIGFyZSBoZXJlIGlzIHRvIGF2b2lkIGhhdmluZyBjbGFuZy1mb3JtYXQgYnJlYWtpbmcgdGhlIGxpbmUgaW5jb3JyZWN0bHkuXG4gIHJldHVybiAoeyBmaWxlTmFtZTogc3Bhbi5zdGFydC5maWxlLnVybCwgdGV4dDogc3Bhbi5zdGFydC5maWxlLmNvbnRlbnQgfSBhcyBhbnkpO1xufVxuXG5mdW5jdGlvbiBkaWFnbm9zdGljU291cmNlT2ZGaWxlTmFtZShmaWxlTmFtZTogc3RyaW5nLCBwcm9ncmFtOiB0cy5Qcm9ncmFtKTogdHMuU291cmNlRmlsZSB7XG4gIGNvbnN0IHNvdXJjZUZpbGUgPSBwcm9ncmFtLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICBpZiAoc291cmNlRmlsZSkgcmV0dXJuIHNvdXJjZUZpbGU7XG5cbiAgLy8gSWYgd2UgYXJlIHJlcG9ydGluZyBkaWFnbm9zdGljcyBmb3IgYSBzb3VyY2UgZmlsZSB0aGF0IGlzIG5vdCBpbiB0aGUgcHJvamVjdCB0aGVuIHdlIG5lZWRcbiAgLy8gdG8gZmFrZSBhIHNvdXJjZSBmaWxlIHNvIHRoZSBkaWFnbm9zdGljIGZvcm1hdHRpbmcgcm91dGluZXMgY2FuIGVtaXQgdGhlIGZpbGUgbmFtZS5cbiAgLy8gVGhlIHJlZHVuZGFudCAnKCknIGFyZSBoZXJlIGlzIHRvIGF2b2lkIGhhdmluZyBjbGFuZy1mb3JtYXQgYnJlYWtpbmcgdGhlIGxpbmUgaW5jb3JyZWN0bHkuXG4gIHJldHVybiAoeyBmaWxlTmFtZSwgdGV4dDogJycgfSBhcyBhbnkpO1xufVxuXG5cbmZ1bmN0aW9uIGRpYWdub3N0aWNDaGFpbkZyb21Gb3JtYXR0ZWREaWFnbm9zdGljQ2hhaW4oY2hhaW46IEZvcm1hdHRlZE1lc3NhZ2VDaGFpbik6XG4gICAgRGlhZ25vc3RpY01lc3NhZ2VDaGFpbiB7XG4gIHJldHVybiB7XG4gICAgbWVzc2FnZVRleHQ6IGNoYWluLm1lc3NhZ2UsXG4gICAgbmV4dDogY2hhaW4ubmV4dCAmJiBkaWFnbm9zdGljQ2hhaW5Gcm9tRm9ybWF0dGVkRGlhZ25vc3RpY0NoYWluKGNoYWluLm5leHQpLFxuICAgIHBvc2l0aW9uOiBjaGFpbi5wb3NpdGlvblxuICB9O1xufVxuXG5mdW5jdGlvbiBzeW50YXhFcnJvclRvRGlhZ25vc3RpY3MoZXJyb3I6IEVycm9yKTogRGlhZ25vc3RpY1tdIHtcbiAgY29uc3QgcGFyc2VyRXJyb3JzID0gZ2V0UGFyc2VFcnJvcnMoZXJyb3IpO1xuICBpZiAocGFyc2VyRXJyb3JzICYmIHBhcnNlckVycm9ycy5sZW5ndGgpIHtcbiAgICByZXR1cm4gcGFyc2VyRXJyb3JzLm1hcDxEaWFnbm9zdGljPihlID0+ICh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlVGV4dDogZS5jb250ZXh0dWFsTWVzc2FnZSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZTogZGlhZ25vc3RpY1NvdXJjZU9mU3BhbihlLnNwYW4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IGUuc3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZW5ndGg6IGUuc3Bhbi5lbmQub2Zmc2V0IC0gZS5zcGFuLnN0YXJ0Lm9mZnNldCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IFNPVVJDRSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IERFRkFVTFRfRVJST1JfQ09ERVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgfSBlbHNlIGlmIChpc0Zvcm1hdHRlZEVycm9yKGVycm9yKSkge1xuICAgIHJldHVybiBbe1xuICAgICAgbWVzc2FnZVRleHQ6IGVycm9yLm1lc3NhZ2UsXG4gICAgICBjaGFpbjogZXJyb3IuY2hhaW4gJiYgZGlhZ25vc3RpY0NoYWluRnJvbUZvcm1hdHRlZERpYWdub3N0aWNDaGFpbihlcnJvci5jaGFpbiksXG4gICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgc291cmNlOiBTT1VSQ0UsXG4gICAgICBjb2RlOiBERUZBVUxUX0VSUk9SX0NPREUsXG4gICAgICBwb3NpdGlvbjogZXJyb3IucG9zaXRpb25cbiAgICB9XTtcbiAgfVxuICAvLyBQcm9kdWNlIGEgRGlhZ25vc3RpYyBhbnl3YXkgc2luY2Ugd2Uga25vdyBmb3Igc3VyZSBgZXJyb3JgIGlzIGEgU3ludGF4RXJyb3JcbiAgcmV0dXJuIFt7XG4gICAgbWVzc2FnZVRleHQ6IGVycm9yLm1lc3NhZ2UsXG4gICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICBjb2RlOiBERUZBVUxUX0VSUk9SX0NPREUsXG4gICAgc291cmNlOiBTT1VSQ0UsXG4gIH1dO1xufVxuIl19