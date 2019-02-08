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
        define("@angular/compiler-cli/src/ngtsc/program", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/transformers/nocollapse_hack", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngtsc/annotations/src/base_def", "@angular/compiler-cli/src/ngtsc/cycles", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/entry_point", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/resource_loader", "@angular/compiler-cli/src/ngtsc/routing", "@angular/compiler-cli/src/ngtsc/shims", "@angular/compiler-cli/src/ngtsc/switch", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/typecheck", "@angular/compiler-cli/src/ngtsc/util/src/path", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var nocollapse_hack_1 = require("@angular/compiler-cli/src/transformers/nocollapse_hack");
    var annotations_1 = require("@angular/compiler-cli/src/ngtsc/annotations");
    var base_def_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/base_def");
    var cycles_1 = require("@angular/compiler-cli/src/ngtsc/cycles");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var entry_point_1 = require("@angular/compiler-cli/src/ngtsc/entry_point");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var partial_evaluator_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var resource_loader_1 = require("@angular/compiler-cli/src/ngtsc/resource_loader");
    var routing_1 = require("@angular/compiler-cli/src/ngtsc/routing");
    var shims_1 = require("@angular/compiler-cli/src/ngtsc/shims");
    var switch_1 = require("@angular/compiler-cli/src/ngtsc/switch");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var typecheck_1 = require("@angular/compiler-cli/src/ngtsc/typecheck");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/util/src/path");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var NgtscProgram = /** @class */ (function () {
        function NgtscProgram(rootNames, options, host, oldProgram) {
            var _a;
            var _this = this;
            this.options = options;
            this.compilation = undefined;
            this.factoryToSourceInfo = null;
            this.sourceToFactorySymbols = null;
            this._coreImportsFrom = undefined;
            this._importRewriter = undefined;
            this._reflector = undefined;
            this._isCore = undefined;
            this.exportReferenceGraph = null;
            this.flatIndexGenerator = null;
            this.routeAnalyzer = null;
            this.constructionDiagnostics = [];
            this.rootDirs = [];
            if (options.rootDirs !== undefined) {
                (_a = this.rootDirs).push.apply(_a, tslib_1.__spread(options.rootDirs));
            }
            else if (options.rootDir !== undefined) {
                this.rootDirs.push(options.rootDir);
            }
            else {
                this.rootDirs.push(host.getCurrentDirectory());
            }
            this.closureCompilerEnabled = !!options.annotateForClosureCompiler;
            this.resourceManager = new resource_loader_1.HostResourceLoader(host, options);
            var shouldGenerateShims = options.allowEmptyCodegenFiles || false;
            this.host = host;
            var rootFiles = tslib_1.__spread(rootNames);
            var generators = [];
            if (shouldGenerateShims) {
                // Summary generation.
                var summaryGenerator = shims_1.SummaryGenerator.forRootFiles(rootNames);
                // Factory generation.
                var factoryGenerator = shims_1.FactoryGenerator.forRootFiles(rootNames);
                var factoryFileMap = factoryGenerator.factoryFileMap;
                this.factoryToSourceInfo = new Map();
                this.sourceToFactorySymbols = new Map();
                factoryFileMap.forEach(function (sourceFilePath, factoryPath) {
                    var moduleSymbolNames = new Set();
                    _this.sourceToFactorySymbols.set(sourceFilePath, moduleSymbolNames);
                    _this.factoryToSourceInfo.set(factoryPath, { sourceFilePath: sourceFilePath, moduleSymbolNames: moduleSymbolNames });
                });
                var factoryFileNames = Array.from(factoryFileMap.keys());
                rootFiles.push.apply(rootFiles, tslib_1.__spread(factoryFileNames, summaryGenerator.getSummaryFileNames()));
                generators.push(summaryGenerator, factoryGenerator);
            }
            var entryPoint = null;
            if (options.flatModuleOutFile !== undefined) {
                entryPoint = entry_point_1.findFlatIndexEntryPoint(rootNames);
                if (entryPoint === null) {
                    // This error message talks specifically about having a single .ts file in "files". However
                    // the actual logic is a bit more permissive. If a single file exists, that will be taken,
                    // otherwise the highest level (shortest path) "index.ts" file will be used as the flat
                    // module entry point instead. If neither of these conditions apply, the error below is
                    // given.
                    //
                    // The user is not informed about the "index.ts" option as this behavior is deprecated -
                    // an explicit entrypoint should always be specified.
                    this.constructionDiagnostics.push({
                        category: ts.DiagnosticCategory.Error,
                        code: diagnostics_1.ngErrorCode(diagnostics_1.ErrorCode.CONFIG_FLAT_MODULE_NO_INDEX),
                        file: undefined,
                        start: undefined,
                        length: undefined,
                        messageText: 'Angular compiler option "flatModuleOutFile" requires one and only one .ts file in the "files" field.',
                    });
                }
                else {
                    var flatModuleId = options.flatModuleId || null;
                    var flatModuleOutFile = path_1.normalizeSeparators(options.flatModuleOutFile);
                    this.flatIndexGenerator =
                        new entry_point_1.FlatIndexGenerator(entryPoint, flatModuleOutFile, flatModuleId);
                    generators.push(this.flatIndexGenerator);
                    rootFiles.push(this.flatIndexGenerator.flatIndexPath);
                }
            }
            if (generators.length > 0) {
                this.host = new shims_1.GeneratedShimsHostWrapper(host, generators);
            }
            this.tsProgram =
                ts.createProgram(rootFiles, options, this.host, oldProgram && oldProgram.getTsProgram());
            this.entryPoint = entryPoint !== null ? this.tsProgram.getSourceFile(entryPoint) || null : null;
            this.moduleResolver = new imports_1.ModuleResolver(this.tsProgram, options, this.host);
            this.cycleAnalyzer = new cycles_1.CycleAnalyzer(new cycles_1.ImportGraph(this.moduleResolver));
        }
        NgtscProgram.prototype.getTsProgram = function () { return this.tsProgram; };
        NgtscProgram.prototype.getTsOptionDiagnostics = function (cancellationToken) {
            return this.tsProgram.getOptionsDiagnostics(cancellationToken);
        };
        NgtscProgram.prototype.getNgOptionDiagnostics = function (cancellationToken) {
            return this.constructionDiagnostics;
        };
        NgtscProgram.prototype.getTsSyntacticDiagnostics = function (sourceFile, cancellationToken) {
            return this.tsProgram.getSyntacticDiagnostics(sourceFile, cancellationToken);
        };
        NgtscProgram.prototype.getNgStructuralDiagnostics = function (cancellationToken) {
            return [];
        };
        NgtscProgram.prototype.getTsSemanticDiagnostics = function (sourceFile, cancellationToken) {
            return this.tsProgram.getSemanticDiagnostics(sourceFile, cancellationToken);
        };
        NgtscProgram.prototype.getNgSemanticDiagnostics = function (fileName, cancellationToken) {
            var compilation = this.ensureAnalyzed();
            var diagnostics = tslib_1.__spread(compilation.diagnostics);
            if (!!this.options.fullTemplateTypeCheck) {
                var ctx = new typecheck_1.TypeCheckContext();
                compilation.typeCheck(ctx);
                diagnostics.push.apply(diagnostics, tslib_1.__spread(this.compileTypeCheckProgram(ctx)));
            }
            if (this.entryPoint !== null && this.exportReferenceGraph !== null) {
                diagnostics.push.apply(diagnostics, tslib_1.__spread(entry_point_1.checkForPrivateExports(this.entryPoint, this.tsProgram.getTypeChecker(), this.exportReferenceGraph)));
            }
            return diagnostics;
        };
        NgtscProgram.prototype.loadNgStructureAsync = function () {
            return tslib_1.__awaiter(this, void 0, void 0, function () {
                var _this = this;
                return tslib_1.__generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (this.compilation === undefined) {
                                this.compilation = this.makeCompilation();
                            }
                            return [4 /*yield*/, Promise.all(this.tsProgram.getSourceFiles()
                                    .filter(function (file) { return !file.fileName.endsWith('.d.ts'); })
                                    .map(function (file) { return _this.compilation.analyzeAsync(file); })
                                    .filter(function (result) { return result !== undefined; }))];
                        case 1:
                            _a.sent();
                            this.compilation.resolve();
                            return [2 /*return*/];
                    }
                });
            });
        };
        NgtscProgram.prototype.listLazyRoutes = function (entryRoute) {
            this.ensureAnalyzed();
            // Listing specific routes is unsupported for now, so we erroneously return
            // all lazy routes instead (which should be okay for the CLI's usage).
            return this.routeAnalyzer.listLazyRoutes();
        };
        NgtscProgram.prototype.getLibrarySummaries = function () {
            throw new Error('Method not implemented.');
        };
        NgtscProgram.prototype.getEmittedGeneratedFiles = function () {
            throw new Error('Method not implemented.');
        };
        NgtscProgram.prototype.getEmittedSourceFiles = function () {
            throw new Error('Method not implemented.');
        };
        NgtscProgram.prototype.ensureAnalyzed = function () {
            var _this = this;
            if (this.compilation === undefined) {
                this.compilation = this.makeCompilation();
                this.tsProgram.getSourceFiles()
                    .filter(function (file) { return !file.fileName.endsWith('.d.ts'); })
                    .forEach(function (file) { return _this.compilation.analyzeSync(file); });
                this.compilation.resolve();
            }
            return this.compilation;
        };
        NgtscProgram.prototype.emit = function (opts) {
            var _this = this;
            var emitCallback = opts && opts.emitCallback || defaultEmitCallback;
            var compilation = this.ensureAnalyzed();
            var writeFile = function (fileName, data, writeByteOrderMark, onError, sourceFiles) {
                if (_this.closureCompilerEnabled && fileName.endsWith('.js')) {
                    data = nocollapse_hack_1.nocollapseHack(data);
                }
                _this.host.writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles);
            };
            var customTransforms = opts && opts.customTransformers;
            var beforeTransforms = [transform_1.ivyTransformFactory(compilation, this.reflector, this.importRewriter, this.isCore)];
            var afterDeclarationsTransforms = [transform_1.declarationTransformFactory(compilation)];
            if (this.factoryToSourceInfo !== null) {
                beforeTransforms.push(shims_1.generatedFactoryTransform(this.factoryToSourceInfo, this.importRewriter));
            }
            if (this.isCore) {
                beforeTransforms.push(switch_1.ivySwitchTransform);
            }
            if (customTransforms && customTransforms.beforeTs) {
                beforeTransforms.push.apply(beforeTransforms, tslib_1.__spread(customTransforms.beforeTs));
            }
            // Run the emit, including a custom transformer that will downlevel the Ivy decorators in code.
            var emitResult = emitCallback({
                program: this.tsProgram,
                host: this.host,
                options: this.options,
                emitOnlyDtsFiles: false, writeFile: writeFile,
                customTransformers: {
                    before: beforeTransforms,
                    after: customTransforms && customTransforms.afterTs,
                    afterDeclarations: afterDeclarationsTransforms,
                },
            });
            return emitResult;
        };
        NgtscProgram.prototype.compileTypeCheckProgram = function (ctx) {
            var host = new typecheck_1.TypeCheckProgramHost(this.tsProgram, this.host, ctx);
            var auxProgram = ts.createProgram({
                host: host,
                rootNames: this.tsProgram.getRootFileNames(),
                oldProgram: this.tsProgram,
                options: this.options,
            });
            return auxProgram.getSemanticDiagnostics();
        };
        NgtscProgram.prototype.makeCompilation = function () {
            var checker = this.tsProgram.getTypeChecker();
            var refResolver = new imports_1.TsReferenceResolver(this.tsProgram, checker, this.options, this.host);
            var evaluator = new partial_evaluator_1.PartialEvaluator(this.reflector, checker, refResolver);
            var scopeRegistry = new annotations_1.SelectorScopeRegistry(checker, this.reflector, refResolver);
            // If a flat module entrypoint was specified, then track references via a `ReferenceGraph` in
            // order to produce proper diagnostics for incorrectly exported directives/pipes/etc. If there
            // is no flat module entrypoint then don't pay the cost of tracking references.
            var referencesRegistry;
            if (this.entryPoint !== null) {
                this.exportReferenceGraph = new entry_point_1.ReferenceGraph();
                referencesRegistry = new ReferenceGraphAdapter(this.exportReferenceGraph);
            }
            else {
                referencesRegistry = new annotations_1.NoopReferencesRegistry();
            }
            this.routeAnalyzer = new routing_1.NgModuleRouteAnalyzer(this.moduleResolver, evaluator);
            // Set up the IvyCompilation, which manages state for the Ivy transformer.
            var handlers = [
                new base_def_1.BaseDefDecoratorHandler(this.reflector, evaluator),
                new annotations_1.ComponentDecoratorHandler(this.reflector, evaluator, scopeRegistry, this.isCore, this.resourceManager, this.rootDirs, this.options.preserveWhitespaces || false, this.options.i18nUseExternalIds !== false, this.moduleResolver, this.cycleAnalyzer),
                new annotations_1.DirectiveDecoratorHandler(this.reflector, evaluator, scopeRegistry, this.isCore),
                new annotations_1.InjectableDecoratorHandler(this.reflector, this.isCore),
                new annotations_1.NgModuleDecoratorHandler(this.reflector, evaluator, scopeRegistry, referencesRegistry, this.isCore, this.routeAnalyzer),
                new annotations_1.PipeDecoratorHandler(this.reflector, evaluator, scopeRegistry, this.isCore),
            ];
            return new transform_1.IvyCompilation(handlers, checker, this.reflector, this.importRewriter, this.sourceToFactorySymbols);
        };
        Object.defineProperty(NgtscProgram.prototype, "reflector", {
            get: function () {
                if (this._reflector === undefined) {
                    this._reflector = new reflection_1.TypeScriptReflectionHost(this.tsProgram.getTypeChecker());
                }
                return this._reflector;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(NgtscProgram.prototype, "coreImportsFrom", {
            get: function () {
                if (this._coreImportsFrom === undefined) {
                    this._coreImportsFrom = this.isCore && getR3SymbolsFile(this.tsProgram) || null;
                }
                return this._coreImportsFrom;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(NgtscProgram.prototype, "isCore", {
            get: function () {
                if (this._isCore === undefined) {
                    this._isCore = isAngularCorePackage(this.tsProgram);
                }
                return this._isCore;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(NgtscProgram.prototype, "importRewriter", {
            get: function () {
                if (this._importRewriter === undefined) {
                    var coreImportsFrom = this.coreImportsFrom;
                    this._importRewriter = coreImportsFrom !== null ?
                        new imports_1.R3SymbolsImportRewriter(coreImportsFrom.fileName) :
                        new imports_1.NoopImportRewriter();
                }
                return this._importRewriter;
            },
            enumerable: true,
            configurable: true
        });
        return NgtscProgram;
    }());
    exports.NgtscProgram = NgtscProgram;
    var defaultEmitCallback = function (_a) {
        var program = _a.program, targetSourceFile = _a.targetSourceFile, writeFile = _a.writeFile, cancellationToken = _a.cancellationToken, emitOnlyDtsFiles = _a.emitOnlyDtsFiles, customTransformers = _a.customTransformers;
        return program.emit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers);
    };
    function mergeEmitResults(emitResults) {
        var e_1, _a;
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
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (emitResults_1_1 && !emitResults_1_1.done && (_a = emitResults_1.return)) _a.call(emitResults_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return { diagnostics: diagnostics, emitSkipped: emitSkipped, emittedFiles: emittedFiles };
    }
    /**
     * Find the 'r3_symbols.ts' file in the given `Program`, or return `null` if it wasn't there.
     */
    function getR3SymbolsFile(program) {
        return program.getSourceFiles().find(function (file) { return file.fileName.indexOf('r3_symbols.ts') >= 0; }) || null;
    }
    /**
     * Determine if the given `Program` is @angular/core.
     */
    function isAngularCorePackage(program) {
        // Look for its_just_angular.ts somewhere in the program.
        var r3Symbols = getR3SymbolsFile(program);
        if (r3Symbols === null) {
            return false;
        }
        // Look for the constant ITS_JUST_ANGULAR in that file.
        return r3Symbols.statements.some(function (stmt) {
            // The statement must be a variable declaration statement.
            if (!ts.isVariableStatement(stmt)) {
                return false;
            }
            // It must be exported.
            if (stmt.modifiers === undefined ||
                !stmt.modifiers.some(function (mod) { return mod.kind === ts.SyntaxKind.ExportKeyword; })) {
                return false;
            }
            // It must declare ITS_JUST_ANGULAR.
            return stmt.declarationList.declarations.some(function (decl) {
                // The declaration must match the name.
                if (!ts.isIdentifier(decl.name) || decl.name.text !== 'ITS_JUST_ANGULAR') {
                    return false;
                }
                // It must initialize the variable to true.
                if (decl.initializer === undefined || decl.initializer.kind !== ts.SyntaxKind.TrueKeyword) {
                    return false;
                }
                // This definition matches.
                return true;
            });
        });
    }
    var ReferenceGraphAdapter = /** @class */ (function () {
        function ReferenceGraphAdapter(graph) {
            this.graph = graph;
        }
        ReferenceGraphAdapter.prototype.add = function (source) {
            var references = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                references[_i - 1] = arguments[_i];
            }
            var e_2, _a;
            try {
                for (var references_1 = tslib_1.__values(references), references_1_1 = references_1.next(); !references_1_1.done; references_1_1 = references_1.next()) {
                    var node = references_1_1.value.node;
                    var sourceFile = node.getSourceFile();
                    if (sourceFile === undefined) {
                        sourceFile = ts.getOriginalNode(node).getSourceFile();
                    }
                    // Only record local references (not references into .d.ts files).
                    if (sourceFile === undefined || !typescript_1.isDtsPath(sourceFile.fileName)) {
                        this.graph.add(source, node);
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (references_1_1 && !references_1_1.done && (_a = references_1.return)) _a.call(references_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
        };
        return ReferenceGraphAdapter;
    }());
    exports.ReferenceGraphAdapter = ReferenceGraphAdapter;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3JhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcHJvZ3JhbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFHakMsMEZBQStEO0lBRS9ELDJFQUFrTztJQUNsTyxxRkFBbUU7SUFDbkUsaUVBQW9EO0lBQ3BELDJFQUFxRDtJQUNyRCwyRUFBa0g7SUFDbEgsbUVBQXNJO0lBQ3RJLHVGQUFxRDtJQUNyRCx5RUFBc0Q7SUFDdEQsbUZBQXFEO0lBQ3JELG1FQUFnRDtJQUNoRCwrREFBNkk7SUFDN0ksaUVBQTRDO0lBQzVDLHVFQUE2RjtJQUM3Rix1RUFBbUU7SUFDbkUsc0VBQW9EO0lBQ3BELGtGQUFnRDtJQUVoRDtRQXVCRSxzQkFDSSxTQUFnQyxFQUFVLE9BQTRCLEVBQ3RFLElBQXNCLEVBQUUsVUFBd0I7O1lBRnBELGlCQStFQztZQTlFNkMsWUFBTyxHQUFQLE9BQU8sQ0FBcUI7WUFyQmxFLGdCQUFXLEdBQTZCLFNBQVMsQ0FBQztZQUNsRCx3QkFBbUIsR0FBa0MsSUFBSSxDQUFDO1lBQzFELDJCQUFzQixHQUFrQyxJQUFJLENBQUM7WUFFN0QscUJBQWdCLEdBQWlDLFNBQVMsQ0FBQztZQUMzRCxvQkFBZSxHQUE2QixTQUFTLENBQUM7WUFDdEQsZUFBVSxHQUF1QyxTQUFTLENBQUM7WUFDM0QsWUFBTyxHQUFzQixTQUFTLENBQUM7WUFJdkMseUJBQW9CLEdBQXdCLElBQUksQ0FBQztZQUNqRCx1QkFBa0IsR0FBNEIsSUFBSSxDQUFDO1lBQ25ELGtCQUFhLEdBQStCLElBQUksQ0FBQztZQUVqRCw0QkFBdUIsR0FBb0IsRUFBRSxDQUFDO1lBUXBELElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO1lBQ25CLElBQUksT0FBTyxDQUFDLFFBQVEsS0FBSyxTQUFTLEVBQUU7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LFNBQVMsSUFBSSxDQUFDLHNCQUFTLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFO3dCQUMvRCxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7cUJBQzlCO2lCQUNGOzs7Ozs7Ozs7UUFDSCxDQUFDO1FBQ0gsNEJBQUM7SUFBRCxDQUFDLEFBaEJELElBZ0JDO0lBaEJZLHNEQUFxQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtHZW5lcmF0ZWRGaWxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0ICogYXMgYXBpIGZyb20gJy4uL3RyYW5zZm9ybWVycy9hcGknO1xuaW1wb3J0IHtub2NvbGxhcHNlSGFja30gZnJvbSAnLi4vdHJhbnNmb3JtZXJzL25vY29sbGFwc2VfaGFjayc7XG5cbmltcG9ydCB7Q29tcG9uZW50RGVjb3JhdG9ySGFuZGxlciwgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlciwgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIsIE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlciwgTm9vcFJlZmVyZW5jZXNSZWdpc3RyeSwgUGlwZURlY29yYXRvckhhbmRsZXIsIFJlZmVyZW5jZXNSZWdpc3RyeSwgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5fSBmcm9tICcuL2Fubm90YXRpb25zJztcbmltcG9ydCB7QmFzZURlZkRlY29yYXRvckhhbmRsZXJ9IGZyb20gJy4vYW5ub3RhdGlvbnMvc3JjL2Jhc2VfZGVmJztcbmltcG9ydCB7Q3ljbGVBbmFseXplciwgSW1wb3J0R3JhcGh9IGZyb20gJy4vY3ljbGVzJztcbmltcG9ydCB7RXJyb3JDb2RlLCBuZ0Vycm9yQ29kZX0gZnJvbSAnLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0ZsYXRJbmRleEdlbmVyYXRvciwgUmVmZXJlbmNlR3JhcGgsIGNoZWNrRm9yUHJpdmF0ZUV4cG9ydHMsIGZpbmRGbGF0SW5kZXhFbnRyeVBvaW50fSBmcm9tICcuL2VudHJ5X3BvaW50JztcbmltcG9ydCB7SW1wb3J0UmV3cml0ZXIsIE1vZHVsZVJlc29sdmVyLCBOb29wSW1wb3J0UmV3cml0ZXIsIFIzU3ltYm9sc0ltcG9ydFJld3JpdGVyLCBSZWZlcmVuY2UsIFRzUmVmZXJlbmNlUmVzb2x2ZXJ9IGZyb20gJy4vaW1wb3J0cyc7XG5pbXBvcnQge1BhcnRpYWxFdmFsdWF0b3J9IGZyb20gJy4vcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0hvc3RSZXNvdXJjZUxvYWRlcn0gZnJvbSAnLi9yZXNvdXJjZV9sb2FkZXInO1xuaW1wb3J0IHtOZ01vZHVsZVJvdXRlQW5hbHl6ZXJ9IGZyb20gJy4vcm91dGluZyc7XG5pbXBvcnQge0ZhY3RvcnlHZW5lcmF0b3IsIEZhY3RvcnlJbmZvLCBHZW5lcmF0ZWRTaGltc0hvc3RXcmFwcGVyLCBTaGltR2VuZXJhdG9yLCBTdW1tYXJ5R2VuZXJhdG9yLCBnZW5lcmF0ZWRGYWN0b3J5VHJhbnNmb3JtfSBmcm9tICcuL3NoaW1zJztcbmltcG9ydCB7aXZ5U3dpdGNoVHJhbnNmb3JtfSBmcm9tICcuL3N3aXRjaCc7XG5pbXBvcnQge0l2eUNvbXBpbGF0aW9uLCBkZWNsYXJhdGlvblRyYW5zZm9ybUZhY3RvcnksIGl2eVRyYW5zZm9ybUZhY3Rvcnl9IGZyb20gJy4vdHJhbnNmb3JtJztcbmltcG9ydCB7VHlwZUNoZWNrQ29udGV4dCwgVHlwZUNoZWNrUHJvZ3JhbUhvc3R9IGZyb20gJy4vdHlwZWNoZWNrJztcbmltcG9ydCB7bm9ybWFsaXplU2VwYXJhdG9yc30gZnJvbSAnLi91dGlsL3NyYy9wYXRoJztcbmltcG9ydCB7aXNEdHNQYXRofSBmcm9tICcuL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5leHBvcnQgY2xhc3MgTmd0c2NQcm9ncmFtIGltcGxlbWVudHMgYXBpLlByb2dyYW0ge1xuICBwcml2YXRlIHRzUHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgcHJpdmF0ZSByZXNvdXJjZU1hbmFnZXI6IEhvc3RSZXNvdXJjZUxvYWRlcjtcbiAgcHJpdmF0ZSBjb21waWxhdGlvbjogSXZ5Q29tcGlsYXRpb258dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBwcml2YXRlIGZhY3RvcnlUb1NvdXJjZUluZm86IE1hcDxzdHJpbmcsIEZhY3RvcnlJbmZvPnxudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBzb3VyY2VUb0ZhY3RvcnlTeW1ib2xzOiBNYXA8c3RyaW5nLCBTZXQ8c3RyaW5nPj58bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgaG9zdDogdHMuQ29tcGlsZXJIb3N0O1xuICBwcml2YXRlIF9jb3JlSW1wb3J0c0Zyb206IHRzLlNvdXJjZUZpbGV8bnVsbHx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX2ltcG9ydFJld3JpdGVyOiBJbXBvcnRSZXdyaXRlcnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX3JlZmxlY3RvcjogVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0fHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfaXNDb3JlOiBib29sZWFufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSByb290RGlyczogc3RyaW5nW107XG4gIHByaXZhdGUgY2xvc3VyZUNvbXBpbGVyRW5hYmxlZDogYm9vbGVhbjtcbiAgcHJpdmF0ZSBlbnRyeVBvaW50OiB0cy5Tb3VyY2VGaWxlfG51bGw7XG4gIHByaXZhdGUgZXhwb3J0UmVmZXJlbmNlR3JhcGg6IFJlZmVyZW5jZUdyYXBofG51bGwgPSBudWxsO1xuICBwcml2YXRlIGZsYXRJbmRleEdlbmVyYXRvcjogRmxhdEluZGV4R2VuZXJhdG9yfG51bGwgPSBudWxsO1xuICBwcml2YXRlIHJvdXRlQW5hbHl6ZXI6IE5nTW9kdWxlUm91dGVBbmFseXplcnxudWxsID0gbnVsbDtcblxuICBwcml2YXRlIGNvbnN0cnVjdGlvbkRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgcHJpdmF0ZSBtb2R1bGVSZXNvbHZlcjogTW9kdWxlUmVzb2x2ZXI7XG4gIHByaXZhdGUgY3ljbGVBbmFseXplcjogQ3ljbGVBbmFseXplcjtcblxuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcm9vdE5hbWVzOiBSZWFkb25seUFycmF5PHN0cmluZz4sIHByaXZhdGUgb3B0aW9uczogYXBpLkNvbXBpbGVyT3B0aW9ucyxcbiAgICAgIGhvc3Q6IGFwaS5Db21waWxlckhvc3QsIG9sZFByb2dyYW0/OiBhcGkuUHJvZ3JhbSkge1xuICAgIHRoaXMucm9vdERpcnMgPSBbXTtcbiAgICBpZiAob3B0aW9ucy5yb290RGlycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLnJvb3REaXJzLnB1c2goLi4ub3B0aW9ucy5yb290RGlycyk7XG4gICAgfSBlbHNlIGlmIChvcHRpb25zLnJvb3REaXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5yb290RGlycy5wdXNoKG9wdGlvbnMucm9vdERpcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucm9vdERpcnMucHVzaChob3N0LmdldEN1cnJlbnREaXJlY3RvcnkoKSk7XG4gICAgfVxuICAgIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCA9ICEhb3B0aW9ucy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcjtcbiAgICB0aGlzLnJlc291cmNlTWFuYWdlciA9IG5ldyBIb3N0UmVzb3VyY2VMb2FkZXIoaG9zdCwgb3B0aW9ucyk7XG4gICAgY29uc3Qgc2hvdWxkR2VuZXJhdGVTaGltcyA9IG9wdGlvbnMuYWxsb3dFbXB0eUNvZGVnZW5GaWxlcyB8fCBmYWxzZTtcbiAgICB0aGlzLmhvc3QgPSBob3N0O1xuICAgIGxldCByb290RmlsZXMgPSBbLi4ucm9vdE5hbWVzXTtcblxuICAgIGNvbnN0IGdlbmVyYXRvcnM6IFNoaW1HZW5lcmF0b3JbXSA9IFtdO1xuICAgIGlmIChzaG91bGRHZW5lcmF0ZVNoaW1zKSB7XG4gICAgICAvLyBTdW1tYXJ5IGdlbmVyYXRpb24uXG4gICAgICBjb25zdCBzdW1tYXJ5R2VuZXJhdG9yID0gU3VtbWFyeUdlbmVyYXRvci5mb3JSb290RmlsZXMocm9vdE5hbWVzKTtcblxuICAgICAgLy8gRmFjdG9yeSBnZW5lcmF0aW9uLlxuICAgICAgY29uc3QgZmFjdG9yeUdlbmVyYXRvciA9IEZhY3RvcnlHZW5lcmF0b3IuZm9yUm9vdEZpbGVzKHJvb3ROYW1lcyk7XG4gICAgICBjb25zdCBmYWN0b3J5RmlsZU1hcCA9IGZhY3RvcnlHZW5lcmF0b3IuZmFjdG9yeUZpbGVNYXA7XG4gICAgICB0aGlzLmZhY3RvcnlUb1NvdXJjZUluZm8gPSBuZXcgTWFwPHN0cmluZywgRmFjdG9yeUluZm8+KCk7XG4gICAgICB0aGlzLnNvdXJjZVRvRmFjdG9yeVN5bWJvbHMgPSBuZXcgTWFwPHN0cmluZywgU2V0PHN0cmluZz4+KCk7XG4gICAgICBmYWN0b3J5RmlsZU1hcC5mb3JFYWNoKChzb3VyY2VGaWxlUGF0aCwgZmFjdG9yeVBhdGgpID0+IHtcbiAgICAgICAgY29uc3QgbW9kdWxlU3ltYm9sTmFtZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgICAgdGhpcy5zb3VyY2VUb0ZhY3RvcnlTeW1ib2xzICEuc2V0KHNvdXJjZUZpbGVQYXRoLCBtb2R1bGVTeW1ib2xOYW1lcyk7XG4gICAgICAgIHRoaXMuZmFjdG9yeVRvU291cmNlSW5mbyAhLnNldChmYWN0b3J5UGF0aCwge3NvdXJjZUZpbGVQYXRoLCBtb2R1bGVTeW1ib2xOYW1lc30pO1xuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGZhY3RvcnlGaWxlTmFtZXMgPSBBcnJheS5mcm9tKGZhY3RvcnlGaWxlTWFwLmtleXMoKSk7XG4gICAgICByb290RmlsZXMucHVzaCguLi5mYWN0b3J5RmlsZU5hbWVzLCAuLi5zdW1tYXJ5R2VuZXJhdG9yLmdldFN1bW1hcnlGaWxlTmFtZXMoKSk7XG4gICAgICBnZW5lcmF0b3JzLnB1c2goc3VtbWFyeUdlbmVyYXRvciwgZmFjdG9yeUdlbmVyYXRvcik7XG4gICAgfVxuXG4gICAgbGV0IGVudHJ5UG9pbnQ6IHN0cmluZ3xudWxsID0gbnVsbDtcbiAgICBpZiAob3B0aW9ucy5mbGF0TW9kdWxlT3V0RmlsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBlbnRyeVBvaW50ID0gZmluZEZsYXRJbmRleEVudHJ5UG9pbnQocm9vdE5hbWVzKTtcbiAgICAgIGlmIChlbnRyeVBvaW50ID09PSBudWxsKSB7XG4gICAgICAgIC8vIFRoaXMgZXJyb3IgbWVzc2FnZSB0YWxrcyBzcGVjaWZpY2FsbHkgYWJvdXQgaGF2aW5nIGEgc2luZ2xlIC50cyBmaWxlIGluIFwiZmlsZXNcIi4gSG93ZXZlclxuICAgICAgICAvLyB0aGUgYWN0dWFsIGxvZ2ljIGlzIGEgYml0IG1vcmUgcGVybWlzc2l2ZS4gSWYgYSBzaW5nbGUgZmlsZSBleGlzdHMsIHRoYXQgd2lsbCBiZSB0YWtlbixcbiAgICAgICAgLy8gb3RoZXJ3aXNlIHRoZSBoaWdoZXN0IGxldmVsIChzaG9ydGVzdCBwYXRoKSBcImluZGV4LnRzXCIgZmlsZSB3aWxsIGJlIHVzZWQgYXMgdGhlIGZsYXRcbiAgICAgICAgLy8gbW9kdWxlIGVudHJ5IHBvaW50IGluc3RlYWQuIElmIG5laXRoZXIgb2YgdGhlc2UgY29uZGl0aW9ucyBhcHBseSwgdGhlIGVycm9yIGJlbG93IGlzXG4gICAgICAgIC8vIGdpdmVuLlxuICAgICAgICAvL1xuICAgICAgICAvLyBUaGUgdXNlciBpcyBub3QgaW5mb3JtZWQgYWJvdXQgdGhlIFwiaW5kZXgudHNcIiBvcHRpb24gYXMgdGhpcyBiZWhhdmlvciBpcyBkZXByZWNhdGVkIC1cbiAgICAgICAgLy8gYW4gZXhwbGljaXQgZW50cnlwb2ludCBzaG91bGQgYWx3YXlzIGJlIHNwZWNpZmllZC5cbiAgICAgICAgdGhpcy5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcy5wdXNoKHtcbiAgICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICAgIGNvZGU6IG5nRXJyb3JDb2RlKEVycm9yQ29kZS5DT05GSUdfRkxBVF9NT0RVTEVfTk9fSU5ERVgpLFxuICAgICAgICAgIGZpbGU6IHVuZGVmaW5lZCxcbiAgICAgICAgICBzdGFydDogdW5kZWZpbmVkLFxuICAgICAgICAgIGxlbmd0aDogdW5kZWZpbmVkLFxuICAgICAgICAgIG1lc3NhZ2VUZXh0OlxuICAgICAgICAgICAgICAnQW5ndWxhciBjb21waWxlciBvcHRpb24gXCJmbGF0TW9kdWxlT3V0RmlsZVwiIHJlcXVpcmVzIG9uZSBhbmQgb25seSBvbmUgLnRzIGZpbGUgaW4gdGhlIFwiZmlsZXNcIiBmaWVsZC4nLFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGZsYXRNb2R1bGVJZCA9IG9wdGlvbnMuZmxhdE1vZHVsZUlkIHx8IG51bGw7XG4gICAgICAgIGNvbnN0IGZsYXRNb2R1bGVPdXRGaWxlID0gbm9ybWFsaXplU2VwYXJhdG9ycyhvcHRpb25zLmZsYXRNb2R1bGVPdXRGaWxlKTtcbiAgICAgICAgdGhpcy5mbGF0SW5kZXhHZW5lcmF0b3IgPVxuICAgICAgICAgICAgbmV3IEZsYXRJbmRleEdlbmVyYXRvcihlbnRyeVBvaW50LCBmbGF0TW9kdWxlT3V0RmlsZSwgZmxhdE1vZHVsZUlkKTtcbiAgICAgICAgZ2VuZXJhdG9ycy5wdXNoKHRoaXMuZmxhdEluZGV4R2VuZXJhdG9yKTtcbiAgICAgICAgcm9vdEZpbGVzLnB1c2godGhpcy5mbGF0SW5kZXhHZW5lcmF0b3IuZmxhdEluZGV4UGF0aCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGdlbmVyYXRvcnMubGVuZ3RoID4gMCkge1xuICAgICAgdGhpcy5ob3N0ID0gbmV3IEdlbmVyYXRlZFNoaW1zSG9zdFdyYXBwZXIoaG9zdCwgZ2VuZXJhdG9ycyk7XG4gICAgfVxuXG4gICAgdGhpcy50c1Byb2dyYW0gPVxuICAgICAgICB0cy5jcmVhdGVQcm9ncmFtKHJvb3RGaWxlcywgb3B0aW9ucywgdGhpcy5ob3N0LCBvbGRQcm9ncmFtICYmIG9sZFByb2dyYW0uZ2V0VHNQcm9ncmFtKCkpO1xuXG4gICAgdGhpcy5lbnRyeVBvaW50ID0gZW50cnlQb2ludCAhPT0gbnVsbCA/IHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGUoZW50cnlQb2ludCkgfHwgbnVsbCA6IG51bGw7XG4gICAgdGhpcy5tb2R1bGVSZXNvbHZlciA9IG5ldyBNb2R1bGVSZXNvbHZlcih0aGlzLnRzUHJvZ3JhbSwgb3B0aW9ucywgdGhpcy5ob3N0KTtcbiAgICB0aGlzLmN5Y2xlQW5hbHl6ZXIgPSBuZXcgQ3ljbGVBbmFseXplcihuZXcgSW1wb3J0R3JhcGgodGhpcy5tb2R1bGVSZXNvbHZlcikpO1xuICB9XG5cbiAgZ2V0VHNQcm9ncmFtKCk6IHRzLlByb2dyYW0geyByZXR1cm4gdGhpcy50c1Byb2dyYW07IH1cblxuICBnZXRUc09wdGlvbkRpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW58XG4gICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkKTogUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgcmV0dXJuIHRoaXMudHNQcm9ncmFtLmdldE9wdGlvbnNEaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbik7XG4gIH1cblxuICBnZXROZ09wdGlvbkRpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW58XG4gICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkKTogUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljfGFwaS5EaWFnbm9zdGljPiB7XG4gICAgcmV0dXJuIHRoaXMuY29uc3RydWN0aW9uRGlhZ25vc3RpY3M7XG4gIH1cblxuICBnZXRUc1N5bnRhY3RpY0RpYWdub3N0aWNzKFxuICAgICAgc291cmNlRmlsZT86IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkLFxuICAgICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnx1bmRlZmluZWQpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gdGhpcy50c1Byb2dyYW0uZ2V0U3ludGFjdGljRGlhZ25vc3RpY3Moc291cmNlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4pO1xuICB9XG5cbiAgZ2V0TmdTdHJ1Y3R1cmFsRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkKTogUmVhZG9ubHlBcnJheTxhcGkuRGlhZ25vc3RpYz4ge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGdldFRzU2VtYW50aWNEaWFnbm9zdGljcyhcbiAgICAgIHNvdXJjZUZpbGU/OiB0cy5Tb3VyY2VGaWxlfHVuZGVmaW5lZCxcbiAgICAgIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW58dW5kZWZpbmVkKTogUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgcmV0dXJuIHRoaXMudHNQcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3Moc291cmNlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4pO1xuICB9XG5cbiAgZ2V0TmdTZW1hbnRpY0RpYWdub3N0aWNzKFxuICAgICAgZmlsZU5hbWU/OiBzdHJpbmd8dW5kZWZpbmVkLCBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWN8YXBpLkRpYWdub3N0aWM+IHtcbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICBjb25zdCBkaWFnbm9zdGljcyA9IFsuLi5jb21waWxhdGlvbi5kaWFnbm9zdGljc107XG4gICAgaWYgKCEhdGhpcy5vcHRpb25zLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjaykge1xuICAgICAgY29uc3QgY3R4ID0gbmV3IFR5cGVDaGVja0NvbnRleHQoKTtcbiAgICAgIGNvbXBpbGF0aW9uLnR5cGVDaGVjayhjdHgpO1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50aGlzLmNvbXBpbGVUeXBlQ2hlY2tQcm9ncmFtKGN0eCkpO1xuICAgIH1cbiAgICBpZiAodGhpcy5lbnRyeVBvaW50ICE9PSBudWxsICYmIHRoaXMuZXhwb3J0UmVmZXJlbmNlR3JhcGggIT09IG51bGwpIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4uY2hlY2tGb3JQcml2YXRlRXhwb3J0cyhcbiAgICAgICAgICB0aGlzLmVudHJ5UG9pbnQsIHRoaXMudHNQcm9ncmFtLmdldFR5cGVDaGVja2VyKCksIHRoaXMuZXhwb3J0UmVmZXJlbmNlR3JhcGgpKTtcbiAgICB9XG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgYXN5bmMgbG9hZE5nU3RydWN0dXJlQXN5bmMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuY29tcGlsYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5jb21waWxhdGlvbiA9IHRoaXMubWFrZUNvbXBpbGF0aW9uKCk7XG4gICAgfVxuICAgIGF3YWl0IFByb21pc2UuYWxsKHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihmaWxlID0+ICFmaWxlLmZpbGVOYW1lLmVuZHNXaXRoKCcuZC50cycpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKGZpbGUgPT4gdGhpcy5jb21waWxhdGlvbiAhLmFuYWx5emVBc3luYyhmaWxlKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcigocmVzdWx0KTogcmVzdWx0IGlzIFByb21pc2U8dm9pZD4gPT4gcmVzdWx0ICE9PSB1bmRlZmluZWQpKTtcbiAgICB0aGlzLmNvbXBpbGF0aW9uLnJlc29sdmUoKTtcbiAgfVxuXG4gIGxpc3RMYXp5Um91dGVzKGVudHJ5Um91dGU/OiBzdHJpbmd8dW5kZWZpbmVkKTogYXBpLkxhenlSb3V0ZVtdIHtcbiAgICB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG4gICAgLy8gTGlzdGluZyBzcGVjaWZpYyByb3V0ZXMgaXMgdW5zdXBwb3J0ZWQgZm9yIG5vdywgc28gd2UgZXJyb25lb3VzbHkgcmV0dXJuXG4gICAgLy8gYWxsIGxhenkgcm91dGVzIGluc3RlYWQgKHdoaWNoIHNob3VsZCBiZSBva2F5IGZvciB0aGUgQ0xJJ3MgdXNhZ2UpLlxuICAgIHJldHVybiB0aGlzLnJvdXRlQW5hbHl6ZXIgIS5saXN0TGF6eVJvdXRlcygpO1xuICB9XG5cbiAgZ2V0TGlicmFyeVN1bW1hcmllcygpOiBNYXA8c3RyaW5nLCBhcGkuTGlicmFyeVN1bW1hcnk+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICBnZXRFbWl0dGVkR2VuZXJhdGVkRmlsZXMoKTogTWFwPHN0cmluZywgR2VuZXJhdGVkRmlsZT4ge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIGdldEVtaXR0ZWRTb3VyY2VGaWxlcygpOiBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VGaWxlPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVBbmFseXplZCgpOiBJdnlDb21waWxhdGlvbiB7XG4gICAgaWYgKHRoaXMuY29tcGlsYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5jb21waWxhdGlvbiA9IHRoaXMubWFrZUNvbXBpbGF0aW9uKCk7XG4gICAgICB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpXG4gICAgICAgICAgLmZpbHRlcihmaWxlID0+ICFmaWxlLmZpbGVOYW1lLmVuZHNXaXRoKCcuZC50cycpKVxuICAgICAgICAgIC5mb3JFYWNoKGZpbGUgPT4gdGhpcy5jb21waWxhdGlvbiAhLmFuYWx5emVTeW5jKGZpbGUpKTtcbiAgICAgIHRoaXMuY29tcGlsYXRpb24ucmVzb2x2ZSgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5jb21waWxhdGlvbjtcbiAgfVxuXG4gIGVtaXQob3B0cz86IHtcbiAgICBlbWl0RmxhZ3M/OiBhcGkuRW1pdEZsYWdzLFxuICAgIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4sXG4gICAgY3VzdG9tVHJhbnNmb3JtZXJzPzogYXBpLkN1c3RvbVRyYW5zZm9ybWVycyxcbiAgICBlbWl0Q2FsbGJhY2s/OiBhcGkuVHNFbWl0Q2FsbGJhY2ssXG4gICAgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrPzogYXBpLlRzTWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrXG4gIH0pOiB0cy5FbWl0UmVzdWx0IHtcbiAgICBjb25zdCBlbWl0Q2FsbGJhY2sgPSBvcHRzICYmIG9wdHMuZW1pdENhbGxiYWNrIHx8IGRlZmF1bHRFbWl0Q2FsbGJhY2s7XG5cbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcblxuICAgIGNvbnN0IHdyaXRlRmlsZTogdHMuV3JpdGVGaWxlQ2FsbGJhY2sgPVxuICAgICAgICAoZmlsZU5hbWU6IHN0cmluZywgZGF0YTogc3RyaW5nLCB3cml0ZUJ5dGVPcmRlck1hcms6IGJvb2xlYW4sXG4gICAgICAgICBvbkVycm9yOiAoKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCkgfCB1bmRlZmluZWQsXG4gICAgICAgICBzb3VyY2VGaWxlczogUmVhZG9ubHlBcnJheTx0cy5Tb3VyY2VGaWxlPikgPT4ge1xuICAgICAgICAgIGlmICh0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQgJiYgZmlsZU5hbWUuZW5kc1dpdGgoJy5qcycpKSB7XG4gICAgICAgICAgICBkYXRhID0gbm9jb2xsYXBzZUhhY2soZGF0YSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuaG9zdC53cml0ZUZpbGUoZmlsZU5hbWUsIGRhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvciwgc291cmNlRmlsZXMpO1xuICAgICAgICB9O1xuXG4gICAgY29uc3QgY3VzdG9tVHJhbnNmb3JtcyA9IG9wdHMgJiYgb3B0cy5jdXN0b21UcmFuc2Zvcm1lcnM7XG4gICAgY29uc3QgYmVmb3JlVHJhbnNmb3JtcyA9XG4gICAgICAgIFtpdnlUcmFuc2Zvcm1GYWN0b3J5KGNvbXBpbGF0aW9uLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5pbXBvcnRSZXdyaXRlciwgdGhpcy5pc0NvcmUpXTtcbiAgICBjb25zdCBhZnRlckRlY2xhcmF0aW9uc1RyYW5zZm9ybXMgPSBbZGVjbGFyYXRpb25UcmFuc2Zvcm1GYWN0b3J5KGNvbXBpbGF0aW9uKV07XG5cbiAgICBpZiAodGhpcy5mYWN0b3J5VG9Tb3VyY2VJbmZvICE9PSBudWxsKSB7XG4gICAgICBiZWZvcmVUcmFuc2Zvcm1zLnB1c2goXG4gICAgICAgICAgZ2VuZXJhdGVkRmFjdG9yeVRyYW5zZm9ybSh0aGlzLmZhY3RvcnlUb1NvdXJjZUluZm8sIHRoaXMuaW1wb3J0UmV3cml0ZXIpKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuaXNDb3JlKSB7XG4gICAgICBiZWZvcmVUcmFuc2Zvcm1zLnB1c2goaXZ5U3dpdGNoVHJhbnNmb3JtKTtcbiAgICB9XG4gICAgaWYgKGN1c3RvbVRyYW5zZm9ybXMgJiYgY3VzdG9tVHJhbnNmb3Jtcy5iZWZvcmVUcykge1xuICAgICAgYmVmb3JlVHJhbnNmb3Jtcy5wdXNoKC4uLmN1c3RvbVRyYW5zZm9ybXMuYmVmb3JlVHMpO1xuICAgIH1cblxuICAgIC8vIFJ1biB0aGUgZW1pdCwgaW5jbHVkaW5nIGEgY3VzdG9tIHRyYW5zZm9ybWVyIHRoYXQgd2lsbCBkb3dubGV2ZWwgdGhlIEl2eSBkZWNvcmF0b3JzIGluIGNvZGUuXG4gICAgY29uc3QgZW1pdFJlc3VsdCA9IGVtaXRDYWxsYmFjayh7XG4gICAgICBwcm9ncmFtOiB0aGlzLnRzUHJvZ3JhbSxcbiAgICAgIGhvc3Q6IHRoaXMuaG9zdCxcbiAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgIGVtaXRPbmx5RHRzRmlsZXM6IGZhbHNlLCB3cml0ZUZpbGUsXG4gICAgICBjdXN0b21UcmFuc2Zvcm1lcnM6IHtcbiAgICAgICAgYmVmb3JlOiBiZWZvcmVUcmFuc2Zvcm1zLFxuICAgICAgICBhZnRlcjogY3VzdG9tVHJhbnNmb3JtcyAmJiBjdXN0b21UcmFuc2Zvcm1zLmFmdGVyVHMsXG4gICAgICAgIGFmdGVyRGVjbGFyYXRpb25zOiBhZnRlckRlY2xhcmF0aW9uc1RyYW5zZm9ybXMsXG4gICAgICB9LFxuICAgIH0pO1xuICAgIHJldHVybiBlbWl0UmVzdWx0O1xuICB9XG5cbiAgcHJpdmF0ZSBjb21waWxlVHlwZUNoZWNrUHJvZ3JhbShjdHg6IFR5cGVDaGVja0NvbnRleHQpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHtcbiAgICBjb25zdCBob3N0ID0gbmV3IFR5cGVDaGVja1Byb2dyYW1Ib3N0KHRoaXMudHNQcm9ncmFtLCB0aGlzLmhvc3QsIGN0eCk7XG4gICAgY29uc3QgYXV4UHJvZ3JhbSA9IHRzLmNyZWF0ZVByb2dyYW0oe1xuICAgICAgaG9zdCxcbiAgICAgIHJvb3ROYW1lczogdGhpcy50c1Byb2dyYW0uZ2V0Um9vdEZpbGVOYW1lcygpLFxuICAgICAgb2xkUHJvZ3JhbTogdGhpcy50c1Byb2dyYW0sXG4gICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgfSk7XG4gICAgcmV0dXJuIGF1eFByb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcygpO1xuICB9XG5cbiAgcHJpdmF0ZSBtYWtlQ29tcGlsYXRpb24oKTogSXZ5Q29tcGlsYXRpb24ge1xuICAgIGNvbnN0IGNoZWNrZXIgPSB0aGlzLnRzUHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuICAgIGNvbnN0IHJlZlJlc29sdmVyID0gbmV3IFRzUmVmZXJlbmNlUmVzb2x2ZXIodGhpcy50c1Byb2dyYW0sIGNoZWNrZXIsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0KTtcbiAgICBjb25zdCBldmFsdWF0b3IgPSBuZXcgUGFydGlhbEV2YWx1YXRvcih0aGlzLnJlZmxlY3RvciwgY2hlY2tlciwgcmVmUmVzb2x2ZXIpO1xuICAgIGNvbnN0IHNjb3BlUmVnaXN0cnkgPSBuZXcgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5KGNoZWNrZXIsIHRoaXMucmVmbGVjdG9yLCByZWZSZXNvbHZlcik7XG5cbiAgICAvLyBJZiBhIGZsYXQgbW9kdWxlIGVudHJ5cG9pbnQgd2FzIHNwZWNpZmllZCwgdGhlbiB0cmFjayByZWZlcmVuY2VzIHZpYSBhIGBSZWZlcmVuY2VHcmFwaGAgaW5cbiAgICAvLyBvcmRlciB0byBwcm9kdWNlIHByb3BlciBkaWFnbm9zdGljcyBmb3IgaW5jb3JyZWN0bHkgZXhwb3J0ZWQgZGlyZWN0aXZlcy9waXBlcy9ldGMuIElmIHRoZXJlXG4gICAgLy8gaXMgbm8gZmxhdCBtb2R1bGUgZW50cnlwb2ludCB0aGVuIGRvbid0IHBheSB0aGUgY29zdCBvZiB0cmFja2luZyByZWZlcmVuY2VzLlxuICAgIGxldCByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeTtcbiAgICBpZiAodGhpcy5lbnRyeVBvaW50ICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmV4cG9ydFJlZmVyZW5jZUdyYXBoID0gbmV3IFJlZmVyZW5jZUdyYXBoKCk7XG4gICAgICByZWZlcmVuY2VzUmVnaXN0cnkgPSBuZXcgUmVmZXJlbmNlR3JhcGhBZGFwdGVyKHRoaXMuZXhwb3J0UmVmZXJlbmNlR3JhcGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZWZlcmVuY2VzUmVnaXN0cnkgPSBuZXcgTm9vcFJlZmVyZW5jZXNSZWdpc3RyeSgpO1xuICAgIH1cblxuICAgIHRoaXMucm91dGVBbmFseXplciA9IG5ldyBOZ01vZHVsZVJvdXRlQW5hbHl6ZXIodGhpcy5tb2R1bGVSZXNvbHZlciwgZXZhbHVhdG9yKTtcblxuICAgIC8vIFNldCB1cCB0aGUgSXZ5Q29tcGlsYXRpb24sIHdoaWNoIG1hbmFnZXMgc3RhdGUgZm9yIHRoZSBJdnkgdHJhbnNmb3JtZXIuXG4gICAgY29uc3QgaGFuZGxlcnMgPSBbXG4gICAgICBuZXcgQmFzZURlZkRlY29yYXRvckhhbmRsZXIodGhpcy5yZWZsZWN0b3IsIGV2YWx1YXRvciksXG4gICAgICBuZXcgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgICB0aGlzLnJlZmxlY3RvciwgZXZhbHVhdG9yLCBzY29wZVJlZ2lzdHJ5LCB0aGlzLmlzQ29yZSwgdGhpcy5yZXNvdXJjZU1hbmFnZXIsXG4gICAgICAgICAgdGhpcy5yb290RGlycywgdGhpcy5vcHRpb25zLnByZXNlcnZlV2hpdGVzcGFjZXMgfHwgZmFsc2UsXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmkxOG5Vc2VFeHRlcm5hbElkcyAhPT0gZmFsc2UsIHRoaXMubW9kdWxlUmVzb2x2ZXIsIHRoaXMuY3ljbGVBbmFseXplciksXG4gICAgICBuZXcgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlcih0aGlzLnJlZmxlY3RvciwgZXZhbHVhdG9yLCBzY29wZVJlZ2lzdHJ5LCB0aGlzLmlzQ29yZSksXG4gICAgICBuZXcgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIodGhpcy5yZWZsZWN0b3IsIHRoaXMuaXNDb3JlKSxcbiAgICAgIG5ldyBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgICAgdGhpcy5yZWZsZWN0b3IsIGV2YWx1YXRvciwgc2NvcGVSZWdpc3RyeSwgcmVmZXJlbmNlc1JlZ2lzdHJ5LCB0aGlzLmlzQ29yZSxcbiAgICAgICAgICB0aGlzLnJvdXRlQW5hbHl6ZXIpLFxuICAgICAgbmV3IFBpcGVEZWNvcmF0b3JIYW5kbGVyKHRoaXMucmVmbGVjdG9yLCBldmFsdWF0b3IsIHNjb3BlUmVnaXN0cnksIHRoaXMuaXNDb3JlKSxcbiAgICBdO1xuXG4gICAgcmV0dXJuIG5ldyBJdnlDb21waWxhdGlvbihcbiAgICAgICAgaGFuZGxlcnMsIGNoZWNrZXIsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmltcG9ydFJld3JpdGVyLCB0aGlzLnNvdXJjZVRvRmFjdG9yeVN5bWJvbHMpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgcmVmbGVjdG9yKCk6IFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdCB7XG4gICAgaWYgKHRoaXMuX3JlZmxlY3RvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9yZWZsZWN0b3IgPSBuZXcgVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0KHRoaXMudHNQcm9ncmFtLmdldFR5cGVDaGVja2VyKCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcmVmbGVjdG9yO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgY29yZUltcG9ydHNGcm9tKCk6IHRzLlNvdXJjZUZpbGV8bnVsbCB7XG4gICAgaWYgKHRoaXMuX2NvcmVJbXBvcnRzRnJvbSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9jb3JlSW1wb3J0c0Zyb20gPSB0aGlzLmlzQ29yZSAmJiBnZXRSM1N5bWJvbHNGaWxlKHRoaXMudHNQcm9ncmFtKSB8fCBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fY29yZUltcG9ydHNGcm9tO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgaXNDb3JlKCk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLl9pc0NvcmUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5faXNDb3JlID0gaXNBbmd1bGFyQ29yZVBhY2thZ2UodGhpcy50c1Byb2dyYW0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5faXNDb3JlO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgaW1wb3J0UmV3cml0ZXIoKTogSW1wb3J0UmV3cml0ZXIge1xuICAgIGlmICh0aGlzLl9pbXBvcnRSZXdyaXRlciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBjb3JlSW1wb3J0c0Zyb20gPSB0aGlzLmNvcmVJbXBvcnRzRnJvbTtcbiAgICAgIHRoaXMuX2ltcG9ydFJld3JpdGVyID0gY29yZUltcG9ydHNGcm9tICE9PSBudWxsID9cbiAgICAgICAgICBuZXcgUjNTeW1ib2xzSW1wb3J0UmV3cml0ZXIoY29yZUltcG9ydHNGcm9tLmZpbGVOYW1lKSA6XG4gICAgICAgICAgbmV3IE5vb3BJbXBvcnRSZXdyaXRlcigpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5faW1wb3J0UmV3cml0ZXI7XG4gIH1cbn1cblxuY29uc3QgZGVmYXVsdEVtaXRDYWxsYmFjazogYXBpLlRzRW1pdENhbGxiYWNrID1cbiAgICAoe3Byb2dyYW0sIHRhcmdldFNvdXJjZUZpbGUsIHdyaXRlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4sIGVtaXRPbmx5RHRzRmlsZXMsXG4gICAgICBjdXN0b21UcmFuc2Zvcm1lcnN9KSA9PlxuICAgICAgICBwcm9ncmFtLmVtaXQoXG4gICAgICAgICAgICB0YXJnZXRTb3VyY2VGaWxlLCB3cml0ZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuLCBlbWl0T25seUR0c0ZpbGVzLCBjdXN0b21UcmFuc2Zvcm1lcnMpO1xuXG5mdW5jdGlvbiBtZXJnZUVtaXRSZXN1bHRzKGVtaXRSZXN1bHRzOiB0cy5FbWl0UmVzdWx0W10pOiB0cy5FbWl0UmVzdWx0IHtcbiAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICBsZXQgZW1pdFNraXBwZWQgPSBmYWxzZTtcbiAgY29uc3QgZW1pdHRlZEZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IGVyIG9mIGVtaXRSZXN1bHRzKSB7XG4gICAgZGlhZ25vc3RpY3MucHVzaCguLi5lci5kaWFnbm9zdGljcyk7XG4gICAgZW1pdFNraXBwZWQgPSBlbWl0U2tpcHBlZCB8fCBlci5lbWl0U2tpcHBlZDtcbiAgICBlbWl0dGVkRmlsZXMucHVzaCguLi4oZXIuZW1pdHRlZEZpbGVzIHx8IFtdKSk7XG4gIH1cbiAgcmV0dXJuIHtkaWFnbm9zdGljcywgZW1pdFNraXBwZWQsIGVtaXR0ZWRGaWxlc307XG59XG5cbi8qKlxuICogRmluZCB0aGUgJ3IzX3N5bWJvbHMudHMnIGZpbGUgaW4gdGhlIGdpdmVuIGBQcm9ncmFtYCwgb3IgcmV0dXJuIGBudWxsYCBpZiBpdCB3YXNuJ3QgdGhlcmUuXG4gKi9cbmZ1bmN0aW9uIGdldFIzU3ltYm9sc0ZpbGUocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IHRzLlNvdXJjZUZpbGV8bnVsbCB7XG4gIHJldHVybiBwcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZmluZChmaWxlID0+IGZpbGUuZmlsZU5hbWUuaW5kZXhPZigncjNfc3ltYm9scy50cycpID49IDApIHx8IG51bGw7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIHRoZSBnaXZlbiBgUHJvZ3JhbWAgaXMgQGFuZ3VsYXIvY29yZS5cbiAqL1xuZnVuY3Rpb24gaXNBbmd1bGFyQ29yZVBhY2thZ2UocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IGJvb2xlYW4ge1xuICAvLyBMb29rIGZvciBpdHNfanVzdF9hbmd1bGFyLnRzIHNvbWV3aGVyZSBpbiB0aGUgcHJvZ3JhbS5cbiAgY29uc3QgcjNTeW1ib2xzID0gZ2V0UjNTeW1ib2xzRmlsZShwcm9ncmFtKTtcbiAgaWYgKHIzU3ltYm9scyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIExvb2sgZm9yIHRoZSBjb25zdGFudCBJVFNfSlVTVF9BTkdVTEFSIGluIHRoYXQgZmlsZS5cbiAgcmV0dXJuIHIzU3ltYm9scy5zdGF0ZW1lbnRzLnNvbWUoc3RtdCA9PiB7XG4gICAgLy8gVGhlIHN0YXRlbWVudCBtdXN0IGJlIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gc3RhdGVtZW50LlxuICAgIGlmICghdHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdG10KSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBJdCBtdXN0IGJlIGV4cG9ydGVkLlxuICAgIGlmIChzdG10Lm1vZGlmaWVycyA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICFzdG10Lm1vZGlmaWVycy5zb21lKG1vZCA9PiBtb2Qua2luZCA9PT0gdHMuU3ludGF4S2luZC5FeHBvcnRLZXl3b3JkKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBJdCBtdXN0IGRlY2xhcmUgSVRTX0pVU1RfQU5HVUxBUi5cbiAgICByZXR1cm4gc3RtdC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zLnNvbWUoZGVjbCA9PiB7XG4gICAgICAvLyBUaGUgZGVjbGFyYXRpb24gbXVzdCBtYXRjaCB0aGUgbmFtZS5cbiAgICAgIGlmICghdHMuaXNJZGVudGlmaWVyKGRlY2wubmFtZSkgfHwgZGVjbC5uYW1lLnRleHQgIT09ICdJVFNfSlVTVF9BTkdVTEFSJykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICAvLyBJdCBtdXN0IGluaXRpYWxpemUgdGhlIHZhcmlhYmxlIHRvIHRydWUuXG4gICAgICBpZiAoZGVjbC5pbml0aWFsaXplciA9PT0gdW5kZWZpbmVkIHx8IGRlY2wuaW5pdGlhbGl6ZXIua2luZCAhPT0gdHMuU3ludGF4S2luZC5UcnVlS2V5d29yZCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICAvLyBUaGlzIGRlZmluaXRpb24gbWF0Y2hlcy5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9KTtcbn1cblxuZXhwb3J0IGNsYXNzIFJlZmVyZW5jZUdyYXBoQWRhcHRlciBpbXBsZW1lbnRzIFJlZmVyZW5jZXNSZWdpc3RyeSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZ3JhcGg6IFJlZmVyZW5jZUdyYXBoKSB7fVxuXG4gIGFkZChzb3VyY2U6IHRzLkRlY2xhcmF0aW9uLCAuLi5yZWZlcmVuY2VzOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+W10pOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IHtub2RlfSBvZiByZWZlcmVuY2VzKSB7XG4gICAgICBsZXQgc291cmNlRmlsZSA9IG5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgICAgaWYgKHNvdXJjZUZpbGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBzb3VyY2VGaWxlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgIH1cblxuICAgICAgLy8gT25seSByZWNvcmQgbG9jYWwgcmVmZXJlbmNlcyAobm90IHJlZmVyZW5jZXMgaW50byAuZC50cyBmaWxlcykuXG4gICAgICBpZiAoc291cmNlRmlsZSA9PT0gdW5kZWZpbmVkIHx8ICFpc0R0c1BhdGgoc291cmNlRmlsZS5maWxlTmFtZSkpIHtcbiAgICAgICAgdGhpcy5ncmFwaC5hZGQoc291cmNlLCBub2RlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiJdfQ==