(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/analysis/decoration_analyzer", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngtsc/cycles", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/scope", "@angular/compiler-cli/ngcc/src/migrations/missing_injectable_migration", "@angular/compiler-cli/ngcc/src/migrations/undecorated_child_migration", "@angular/compiler-cli/ngcc/src/migrations/undecorated_parent_migration", "@angular/compiler-cli/ngcc/src/utils", "@angular/compiler-cli/ngcc/src/analysis/migration_host", "@angular/compiler-cli/ngcc/src/analysis/types", "@angular/compiler-cli/ngcc/src/analysis/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var compiler_1 = require("@angular/compiler");
    var annotations_1 = require("@angular/compiler-cli/src/ngtsc/annotations");
    var cycles_1 = require("@angular/compiler-cli/src/ngtsc/cycles");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var partial_evaluator_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator");
    var scope_1 = require("@angular/compiler-cli/src/ngtsc/scope");
    var missing_injectable_migration_1 = require("@angular/compiler-cli/ngcc/src/migrations/missing_injectable_migration");
    var undecorated_child_migration_1 = require("@angular/compiler-cli/ngcc/src/migrations/undecorated_child_migration");
    var undecorated_parent_migration_1 = require("@angular/compiler-cli/ngcc/src/migrations/undecorated_parent_migration");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
    var migration_host_1 = require("@angular/compiler-cli/ngcc/src/analysis/migration_host");
    var types_1 = require("@angular/compiler-cli/ngcc/src/analysis/types");
    var util_1 = require("@angular/compiler-cli/ngcc/src/analysis/util");
    /**
     * Simple class that resolves and loads files directly from the filesystem.
     */
    var NgccResourceLoader = /** @class */ (function () {
        function NgccResourceLoader(fs) {
            this.fs = fs;
            this.canPreload = false;
        }
        NgccResourceLoader.prototype.preload = function () { throw new Error('Not implemented.'); };
        NgccResourceLoader.prototype.load = function (url) { return this.fs.readFile(file_system_1.resolve(url)); };
        NgccResourceLoader.prototype.resolve = function (url, containingFile) {
            return file_system_1.resolve(file_system_1.dirname(file_system_1.absoluteFrom(containingFile)), url);
        };
        return NgccResourceLoader;
    }());
    /**
     * This Analyzer will analyze the files that have decorated classes that need to be transformed.
     */
    var DecorationAnalyzer = /** @class */ (function () {
        function DecorationAnalyzer(fs, bundle, reflectionHost, referencesRegistry, diagnosticHandler) {
            if (diagnosticHandler === void 0) { diagnosticHandler = function () { }; }
            this.fs = fs;
            this.bundle = bundle;
            this.reflectionHost = reflectionHost;
            this.referencesRegistry = referencesRegistry;
            this.diagnosticHandler = diagnosticHandler;
            this.program = this.bundle.src.program;
            this.options = this.bundle.src.options;
            this.host = this.bundle.src.host;
            this.typeChecker = this.bundle.src.program.getTypeChecker();
            this.rootDirs = this.bundle.rootDirs;
            this.packagePath = this.bundle.entryPoint.package;
            this.isCore = this.bundle.isCore;
            /**
             * Map of NgModule declarations to the re-exports for that NgModule.
             */
            this.reexportMap = new Map();
            this.resourceManager = new NgccResourceLoader(this.fs);
            this.metaRegistry = new metadata_1.LocalMetadataRegistry();
            this.dtsMetaReader = new metadata_1.DtsMetadataReader(this.typeChecker, this.reflectionHost);
            this.fullMetaReader = new metadata_1.CompoundMetadataReader([this.metaRegistry, this.dtsMetaReader]);
            this.refEmitter = new imports_1.ReferenceEmitter([
                new imports_1.LocalIdentifierStrategy(),
                new imports_1.AbsoluteModuleStrategy(this.program, this.typeChecker, this.options, this.host, this.reflectionHost),
                // TODO(alxhub): there's no reason why ngcc needs the "logical file system" logic here, as ngcc
                // projects only ever have one rootDir. Instead, ngcc should just switch its emitted import
                // based on whether a bestGuessOwningModule is present in the Reference.
                new imports_1.LogicalProjectStrategy(this.reflectionHost, new file_system_1.LogicalFileSystem(this.rootDirs)),
            ]);
            this.aliasingHost = this.bundle.entryPoint.generateDeepReexports ?
                new imports_1.PrivateExportAliasingHost(this.reflectionHost) : null;
            this.dtsModuleScopeResolver = new scope_1.MetadataDtsModuleScopeResolver(this.dtsMetaReader, this.aliasingHost);
            this.scopeRegistry = new scope_1.LocalModuleScopeRegistry(this.metaRegistry, this.dtsModuleScopeResolver, this.refEmitter, this.aliasingHost);
            this.fullRegistry = new metadata_1.CompoundMetadataRegistry([this.metaRegistry, this.scopeRegistry]);
            this.evaluator = new partial_evaluator_1.PartialEvaluator(this.reflectionHost, this.typeChecker);
            this.moduleResolver = new imports_1.ModuleResolver(this.program, this.options, this.host);
            this.importGraph = new cycles_1.ImportGraph(this.moduleResolver);
            this.cycleAnalyzer = new cycles_1.CycleAnalyzer(this.importGraph);
            this.handlers = [
                new annotations_1.ComponentDecoratorHandler(this.reflectionHost, this.evaluator, this.fullRegistry, this.fullMetaReader, this.scopeRegistry, this.scopeRegistry, this.isCore, this.resourceManager, this.rootDirs, 
                /* defaultPreserveWhitespaces */ false, 
                /* i18nUseExternalIds */ true, /* i18nLegacyMessageIdFormat */ '', this.moduleResolver, this.cycleAnalyzer, this.refEmitter, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, 
                /* annotateForClosureCompiler */ false),
                new annotations_1.DirectiveDecoratorHandler(this.reflectionHost, this.evaluator, this.fullRegistry, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, this.isCore, /* annotateForClosureCompiler */ false),
                // Pipe handler must be before injectable handler in list so pipe factories are printed
                // before injectable factories (so injectable factories can delegate to them)
                new annotations_1.PipeDecoratorHandler(this.reflectionHost, this.evaluator, this.metaRegistry, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, this.isCore),
                new annotations_1.InjectableDecoratorHandler(this.reflectionHost, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, this.isCore, 
                /* strictCtorDeps */ false, /* errorOnDuplicateProv */ false),
                new annotations_1.NgModuleDecoratorHandler(this.reflectionHost, this.evaluator, this.fullMetaReader, this.fullRegistry, this.scopeRegistry, this.referencesRegistry, this.isCore, /* routeAnalyzer */ null, this.refEmitter, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, /* annotateForClosureCompiler */ false),
            ];
            this.migrations = [
                new undecorated_parent_migration_1.UndecoratedParentMigration(),
                new undecorated_child_migration_1.UndecoratedChildMigration(),
                new missing_injectable_migration_1.MissingInjectableMigration(),
            ];
        }
        /**
         * Analyze a program to find all the decorated files should be transformed.
         *
         * @returns a map of the source files to the analysis for those files.
         */
        DecorationAnalyzer.prototype.analyzeProgram = function () {
            var _this = this;
            var decorationAnalyses = new types_1.DecorationAnalyses();
            var analyzedFiles = this.program.getSourceFiles()
                .filter(function (sourceFile) { return util_1.isWithinPackage(_this.packagePath, sourceFile); })
                .map(function (sourceFile) { return _this.analyzeFile(sourceFile); })
                .filter(utils_1.isDefined);
            this.applyMigrations(analyzedFiles);
            analyzedFiles.forEach(function (analyzedFile) { return _this.resolveFile(analyzedFile); });
            var compiledFiles = analyzedFiles.map(function (analyzedFile) { return _this.compileFile(analyzedFile); });
            compiledFiles.forEach(function (compiledFile) { return decorationAnalyses.set(compiledFile.sourceFile, compiledFile); });
            return decorationAnalyses;
        };
        DecorationAnalyzer.prototype.analyzeFile = function (sourceFile) {
            var _this = this;
            var analyzedClasses = this.reflectionHost.findClassSymbols(sourceFile)
                .map(function (symbol) { return _this.analyzeClass(symbol); })
                .filter(utils_1.isDefined);
            return analyzedClasses.length ? { sourceFile: sourceFile, analyzedClasses: analyzedClasses } : undefined;
        };
        DecorationAnalyzer.prototype.analyzeClass = function (symbol) {
            var e_1, _a;
            var decorators = this.reflectionHost.getDecoratorsOfSymbol(symbol);
            var analyzedClass = util_1.analyzeDecorators(symbol, decorators, this.handlers);
            if (analyzedClass !== null && analyzedClass.diagnostics !== undefined) {
                try {
                    for (var _b = tslib_1.__values(analyzedClass.diagnostics), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var diagnostic = _c.value;
                        this.diagnosticHandler(diagnostic);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            return analyzedClass;
        };
        DecorationAnalyzer.prototype.applyMigrations = function (analyzedFiles) {
            var _this = this;
            var migrationHost = new migration_host_1.DefaultMigrationHost(this.reflectionHost, this.fullMetaReader, this.evaluator, this.handlers, this.bundle.entryPoint.path, analyzedFiles);
            this.migrations.forEach(function (migration) {
                analyzedFiles.forEach(function (analyzedFile) {
                    analyzedFile.analyzedClasses.forEach(function (_a) {
                        var declaration = _a.declaration;
                        try {
                            var result = migration.apply(declaration, migrationHost);
                            if (result !== null) {
                                _this.diagnosticHandler(result);
                            }
                        }
                        catch (e) {
                            if (diagnostics_1.isFatalDiagnosticError(e)) {
                                _this.diagnosticHandler(e.toDiagnostic());
                            }
                            else {
                                throw e;
                            }
                        }
                    });
                });
            });
        };
        DecorationAnalyzer.prototype.compileFile = function (analyzedFile) {
            var _this = this;
            var constantPool = new compiler_1.ConstantPool();
            var compiledClasses = analyzedFile.analyzedClasses.map(function (analyzedClass) {
                var compilation = _this.compileClass(analyzedClass, constantPool);
                var declaration = analyzedClass.declaration;
                var reexports = _this.getReexportsForClass(declaration);
                return tslib_1.__assign(tslib_1.__assign({}, analyzedClass), { compilation: compilation, reexports: reexports });
            });
            return { constantPool: constantPool, sourceFile: analyzedFile.sourceFile, compiledClasses: compiledClasses };
        };
        DecorationAnalyzer.prototype.compileClass = function (clazz, constantPool) {
            var e_2, _a;
            var compilations = [];
            var _loop_1 = function (handler, analysis) {
                var result = handler.compile(clazz.declaration, analysis, constantPool);
                if (Array.isArray(result)) {
                    result.forEach(function (current) {
                        if (!compilations.some(function (compilation) { return compilation.name === current.name; })) {
                            compilations.push(current);
                        }
                    });
                }
                else if (!compilations.some(function (compilation) { return compilation.name === result.name; })) {
                    compilations.push(result);
                }
            };
            try {
                for (var _b = tslib_1.__values(clazz.matches), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = _c.value, handler = _d.handler, analysis = _d.analysis;
                    _loop_1(handler, analysis);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return compilations;
        };
        DecorationAnalyzer.prototype.resolveFile = function (analyzedFile) {
            var _this = this;
            analyzedFile.analyzedClasses.forEach(function (_a) {
                var declaration = _a.declaration, matches = _a.matches;
                matches.forEach(function (_a) {
                    var handler = _a.handler, analysis = _a.analysis;
                    if ((handler.resolve !== undefined) && analysis) {
                        var _b = handler.resolve(declaration, analysis), reexports = _b.reexports, diagnostics = _b.diagnostics;
                        if (reexports !== undefined) {
                            _this.addReexports(reexports, declaration);
                        }
                        if (diagnostics !== undefined) {
                            diagnostics.forEach(function (error) { return _this.diagnosticHandler(error); });
                        }
                    }
                });
            });
        };
        DecorationAnalyzer.prototype.getReexportsForClass = function (declaration) {
            var reexports = [];
            if (this.reexportMap.has(declaration)) {
                this.reexportMap.get(declaration).forEach(function (_a, asAlias) {
                    var _b = tslib_1.__read(_a, 2), fromModule = _b[0], symbolName = _b[1];
                    reexports.push({ asAlias: asAlias, fromModule: fromModule, symbolName: symbolName });
                });
            }
            return reexports;
        };
        DecorationAnalyzer.prototype.addReexports = function (reexports, declaration) {
            var e_3, _a;
            var map = new Map();
            try {
                for (var reexports_1 = tslib_1.__values(reexports), reexports_1_1 = reexports_1.next(); !reexports_1_1.done; reexports_1_1 = reexports_1.next()) {
                    var reexport = reexports_1_1.value;
                    map.set(reexport.asAlias, [reexport.fromModule, reexport.symbolName]);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (reexports_1_1 && !reexports_1_1.done && (_a = reexports_1.return)) _a.call(reexports_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
            this.reexportMap.set(declaration, map);
        };
        return DecorationAnalyzer;
    }());
    exports.DecorationAnalyzer = DecorationAnalyzer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbl9hbmFseXplci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9hbmFseXNpcy9kZWNvcmF0aW9uX2FuYWx5emVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUErQztJQUUvQywyRUFBb047SUFDcE4saUVBQXFFO0lBQ3JFLDJFQUFzRTtJQUN0RSwyRUFBNkc7SUFDN0csbUVBQXdOO0lBQ3hOLHFFQUF1STtJQUN2SSx1RkFBc0U7SUFFdEUsK0RBQWtHO0lBSWxHLHVIQUFzRjtJQUN0RixxSEFBb0Y7SUFDcEYsdUhBQXNGO0lBRXRGLDhEQUFtQztJQUVuQyx5RkFBc0Q7SUFDdEQsdUVBQXFHO0lBQ3JHLHFFQUEwRDtJQUcxRDs7T0FFRztJQUNIO1FBQ0UsNEJBQW9CLEVBQWM7WUFBZCxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQ2xDLGVBQVUsR0FBRyxLQUFLLENBQUM7UUFEa0IsQ0FBQztRQUV0QyxvQ0FBTyxHQUFQLGNBQXFDLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0UsaUNBQUksR0FBSixVQUFLLEdBQVcsSUFBWSxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLHFCQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEUsb0NBQU8sR0FBUCxVQUFRLEdBQVcsRUFBRSxjQUFzQjtZQUN6QyxPQUFPLHFCQUFPLENBQUMscUJBQU8sQ0FBQywwQkFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUNILHlCQUFDO0lBQUQsQ0FBQyxBQVJELElBUUM7SUFFRDs7T0FFRztJQUNIO1FBbUVFLDRCQUNZLEVBQWMsRUFBVSxNQUF3QixFQUNo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QUFDO1FBQ0wsQ0FBQztRQUVPLGlEQUFvQixHQUE1QixVQUE2QixXQUE2QztZQUN4RSxJQUFNLFNBQVMsR0FBZSxFQUFFLENBQUM7WUFDakMsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsRUFBRTtnQkFDckMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFHLENBQUMsT0FBTyxDQUFDLFVBQUMsRUFBd0IsRUFBRSxPQUFPO3dCQUFqQywwQkFBd0IsRUFBdkIsa0JBQVUsRUFBRSxrQkFBVTtvQkFDbEUsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFDLE9BQU8sU0FBQSxFQUFFLFVBQVUsWUFBQSxFQUFFLFVBQVUsWUFBQSxFQUFDLENBQUMsQ0FBQztnQkFDcEQsQ0FBQyxDQUFDLENBQUM7YUFDSjtZQUNELE9BQU8sU0FBUyxDQUFDO1FBQ25CLENBQUM7UUFFTyx5Q0FBWSxHQUFwQixVQUFxQixTQUFxQixFQUFFLFdBQTZDOztZQUN2RixJQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBNEIsQ0FBQzs7Z0JBQ2hELEtBQXVCLElBQUEsY0FBQSxpQkFBQSxTQUFTLENBQUEsb0NBQUEsMkRBQUU7b0JBQTdCLElBQU0sUUFBUSxzQkFBQTtvQkFDakIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztpQkFDdkU7Ozs7Ozs7OztZQUNELElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN6QyxDQUFDO1FBQ0gseUJBQUM7SUFBRCxDQUFDLEFBck1ELElBcU1DO0lBck1ZLGdEQUFrQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Q29uc3RhbnRQb29sfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7Q29tcG9uZW50RGVjb3JhdG9ySGFuZGxlciwgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlciwgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIsIE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlciwgUGlwZURlY29yYXRvckhhbmRsZXIsIFJlZmVyZW5jZXNSZWdpc3RyeSwgUmVzb3VyY2VMb2FkZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucyc7XG5pbXBvcnQge0N5Y2xlQW5hbHl6ZXIsIEltcG9ydEdyYXBofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvY3ljbGVzJztcbmltcG9ydCB7aXNGYXRhbERpYWdub3N0aWNFcnJvcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2RpYWdub3N0aWNzJztcbmltcG9ydCB7RmlsZVN5c3RlbSwgTG9naWNhbEZpbGVTeXN0ZW0sIGFic29sdXRlRnJvbSwgZGlybmFtZSwgcmVzb2x2ZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7QWJzb2x1dGVNb2R1bGVTdHJhdGVneSwgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3ksIExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3ksIE1vZHVsZVJlc29sdmVyLCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSLCBQcml2YXRlRXhwb3J0QWxpYXNpbmdIb3N0LCBSZWV4cG9ydCwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ltcG9ydHMnO1xuaW1wb3J0IHtDb21wb3VuZE1ldGFkYXRhUmVhZGVyLCBDb21wb3VuZE1ldGFkYXRhUmVnaXN0cnksIER0c01ldGFkYXRhUmVhZGVyLCBMb2NhbE1ldGFkYXRhUmVnaXN0cnl9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9tZXRhZGF0YSc7XG5pbXBvcnQge1BhcnRpYWxFdmFsdWF0b3J9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb259IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7TG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LCBNZXRhZGF0YUR0c01vZHVsZVNjb3BlUmVzb2x2ZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9zY29wZSc7XG5pbXBvcnQge0NvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXIsIERldGVjdFJlc3VsdCwgSGFuZGxlclByZWNlZGVuY2V9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy90cmFuc2Zvcm0nO1xuaW1wb3J0IHtOZ2NjQ2xhc3NTeW1ib2wsIE5nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtNaWdyYXRpb259IGZyb20gJy4uL21pZ3JhdGlvbnMvbWlncmF0aW9uJztcbmltcG9ydCB7TWlzc2luZ0luamVjdGFibGVNaWdyYXRpb259IGZyb20gJy4uL21pZ3JhdGlvbnMvbWlzc2luZ19pbmplY3RhYmxlX21pZ3JhdGlvbic7XG5pbXBvcnQge1VuZGVjb3JhdGVkQ2hpbGRNaWdyYXRpb259IGZyb20gJy4uL21pZ3JhdGlvbnMvdW5kZWNvcmF0ZWRfY2hpbGRfbWlncmF0aW9uJztcbmltcG9ydCB7VW5kZWNvcmF0ZWRQYXJlbnRNaWdyYXRpb259IGZyb20gJy4uL21pZ3JhdGlvbnMvdW5kZWNvcmF0ZWRfcGFyZW50X21pZ3JhdGlvbic7XG5pbXBvcnQge0VudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5pbXBvcnQge2lzRGVmaW5lZH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5pbXBvcnQge0RlZmF1bHRNaWdyYXRpb25Ib3N0fSBmcm9tICcuL21pZ3JhdGlvbl9ob3N0JztcbmltcG9ydCB7QW5hbHl6ZWRDbGFzcywgQW5hbHl6ZWRGaWxlLCBDb21waWxlZENsYXNzLCBDb21waWxlZEZpbGUsIERlY29yYXRpb25BbmFseXNlc30gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge2FuYWx5emVEZWNvcmF0b3JzLCBpc1dpdGhpblBhY2thZ2V9IGZyb20gJy4vdXRpbCc7XG5cblxuLyoqXG4gKiBTaW1wbGUgY2xhc3MgdGhhdCByZXNvbHZlcyBhbmQgbG9hZHMgZmlsZXMgZGlyZWN0bHkgZnJvbSB0aGUgZmlsZXN5c3RlbS5cbiAqL1xuY2xhc3MgTmdjY1Jlc291cmNlTG9hZGVyIGltcGxlbWVudHMgUmVzb3VyY2VMb2FkZXIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGZzOiBGaWxlU3lzdGVtKSB7fVxuICBjYW5QcmVsb2FkID0gZmFsc2U7XG4gIHByZWxvYWQoKTogdW5kZWZpbmVkfFByb21pc2U8dm9pZD4geyB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZC4nKTsgfVxuICBsb2FkKHVybDogc3RyaW5nKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuZnMucmVhZEZpbGUocmVzb2x2ZSh1cmwpKTsgfVxuICByZXNvbHZlKHVybDogc3RyaW5nLCBjb250YWluaW5nRmlsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gcmVzb2x2ZShkaXJuYW1lKGFic29sdXRlRnJvbShjb250YWluaW5nRmlsZSkpLCB1cmwpO1xuICB9XG59XG5cbi8qKlxuICogVGhpcyBBbmFseXplciB3aWxsIGFuYWx5emUgdGhlIGZpbGVzIHRoYXQgaGF2ZSBkZWNvcmF0ZWQgY2xhc3NlcyB0aGF0IG5lZWQgdG8gYmUgdHJhbnNmb3JtZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBEZWNvcmF0aW9uQW5hbHl6ZXIge1xuICBwcml2YXRlIHByb2dyYW0gPSB0aGlzLmJ1bmRsZS5zcmMucHJvZ3JhbTtcbiAgcHJpdmF0ZSBvcHRpb25zID0gdGhpcy5idW5kbGUuc3JjLm9wdGlvbnM7XG4gIHByaXZhdGUgaG9zdCA9IHRoaXMuYnVuZGxlLnNyYy5ob3N0O1xuICBwcml2YXRlIHR5cGVDaGVja2VyID0gdGhpcy5idW5kbGUuc3JjLnByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcbiAgcHJpdmF0ZSByb290RGlycyA9IHRoaXMuYnVuZGxlLnJvb3REaXJzO1xuICBwcml2YXRlIHBhY2thZ2VQYXRoID0gdGhpcy5idW5kbGUuZW50cnlQb2ludC5wYWNrYWdlO1xuICBwcml2YXRlIGlzQ29yZSA9IHRoaXMuYnVuZGxlLmlzQ29yZTtcblxuICAvKipcbiAgICogTWFwIG9mIE5nTW9kdWxlIGRlY2xhcmF0aW9ucyB0byB0aGUgcmUtZXhwb3J0cyBmb3IgdGhhdCBOZ01vZHVsZS5cbiAgICovXG4gIHByaXZhdGUgcmVleHBvcnRNYXAgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBNYXA8c3RyaW5nLCBbc3RyaW5nLCBzdHJpbmddPj4oKTtcbiAgcmVzb3VyY2VNYW5hZ2VyID0gbmV3IE5nY2NSZXNvdXJjZUxvYWRlcih0aGlzLmZzKTtcbiAgbWV0YVJlZ2lzdHJ5ID0gbmV3IExvY2FsTWV0YWRhdGFSZWdpc3RyeSgpO1xuICBkdHNNZXRhUmVhZGVyID0gbmV3IER0c01ldGFkYXRhUmVhZGVyKHRoaXMudHlwZUNoZWNrZXIsIHRoaXMucmVmbGVjdGlvbkhvc3QpO1xuICBmdWxsTWV0YVJlYWRlciA9IG5ldyBDb21wb3VuZE1ldGFkYXRhUmVhZGVyKFt0aGlzLm1ldGFSZWdpc3RyeSwgdGhpcy5kdHNNZXRhUmVhZGVyXSk7XG4gIHJlZkVtaXR0ZXIgPSBuZXcgUmVmZXJlbmNlRW1pdHRlcihbXG4gICAgbmV3IExvY2FsSWRlbnRpZmllclN0cmF0ZWd5KCksXG4gICAgbmV3IEFic29sdXRlTW9kdWxlU3RyYXRlZ3koXG4gICAgICAgIHRoaXMucHJvZ3JhbSwgdGhpcy50eXBlQ2hlY2tlciwgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3QsIHRoaXMucmVmbGVjdGlvbkhvc3QpLFxuICAgIC8vIFRPRE8oYWx4aHViKTogdGhlcmUncyBubyByZWFzb24gd2h5IG5nY2MgbmVlZHMgdGhlIFwibG9naWNhbCBmaWxlIHN5c3RlbVwiIGxvZ2ljIGhlcmUsIGFzIG5nY2NcbiAgICAvLyBwcm9qZWN0cyBvbmx5IGV2ZXIgaGF2ZSBvbmUgcm9vdERpci4gSW5zdGVhZCwgbmdjYyBzaG91bGQganVzdCBzd2l0Y2ggaXRzIGVtaXR0ZWQgaW1wb3J0XG4gICAgLy8gYmFzZWQgb24gd2hldGhlciBhIGJlc3RHdWVzc093bmluZ01vZHVsZSBpcyBwcmVzZW50IGluIHRoZSBSZWZlcmVuY2UuXG4gICAgbmV3IExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3kodGhpcy5yZWZsZWN0aW9uSG9zdCwgbmV3IExvZ2ljYWxGaWxlU3lzdGVtKHRoaXMucm9vdERpcnMpKSxcbiAgXSk7XG4gIGFsaWFzaW5nSG9zdCA9IHRoaXMuYnVuZGxlLmVudHJ5UG9pbnQuZ2VuZXJhdGVEZWVwUmVleHBvcnRzP1xuICAgICAgICAgICAgICAgICBuZXcgUHJpdmF0ZUV4cG9ydEFsaWFzaW5nSG9zdCh0aGlzLnJlZmxlY3Rpb25Ib3N0KTogbnVsbDtcbiAgZHRzTW9kdWxlU2NvcGVSZXNvbHZlciA9XG4gICAgICBuZXcgTWV0YWRhdGFEdHNNb2R1bGVTY29wZVJlc29sdmVyKHRoaXMuZHRzTWV0YVJlYWRlciwgdGhpcy5hbGlhc2luZ0hvc3QpO1xuICBzY29wZVJlZ2lzdHJ5ID0gbmV3IExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeShcbiAgICAgIHRoaXMubWV0YVJlZ2lzdHJ5LCB0aGlzLmR0c01vZHVsZVNjb3BlUmVzb2x2ZXIsIHRoaXMucmVmRW1pdHRlciwgdGhpcy5hbGlhc2luZ0hvc3QpO1xuICBmdWxsUmVnaXN0cnkgPSBuZXcgQ29tcG91bmRNZXRhZGF0YVJlZ2lzdHJ5KFt0aGlzLm1ldGFSZWdpc3RyeSwgdGhpcy5zY29wZVJlZ2lzdHJ5XSk7XG4gIGV2YWx1YXRvciA9IG5ldyBQYXJ0aWFsRXZhbHVhdG9yKHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMudHlwZUNoZWNrZXIpO1xuICBtb2R1bGVSZXNvbHZlciA9IG5ldyBNb2R1bGVSZXNvbHZlcih0aGlzLnByb2dyYW0sIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0KTtcbiAgaW1wb3J0R3JhcGggPSBuZXcgSW1wb3J0R3JhcGgodGhpcy5tb2R1bGVSZXNvbHZlcik7XG4gIGN5Y2xlQW5hbHl6ZXIgPSBuZXcgQ3ljbGVBbmFseXplcih0aGlzLmltcG9ydEdyYXBoKTtcbiAgaGFuZGxlcnM6IERlY29yYXRvckhhbmRsZXI8YW55LCBhbnk+W10gPSBbXG4gICAgbmV3IENvbXBvbmVudERlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLmZ1bGxSZWdpc3RyeSwgdGhpcy5mdWxsTWV0YVJlYWRlcixcbiAgICAgICAgdGhpcy5zY29wZVJlZ2lzdHJ5LCB0aGlzLnNjb3BlUmVnaXN0cnksIHRoaXMuaXNDb3JlLCB0aGlzLnJlc291cmNlTWFuYWdlciwgdGhpcy5yb290RGlycyxcbiAgICAgICAgLyogZGVmYXVsdFByZXNlcnZlV2hpdGVzcGFjZXMgKi8gZmFsc2UsXG4gICAgICAgIC8qIGkxOG5Vc2VFeHRlcm5hbElkcyAqLyB0cnVlLCAvKiBpMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0ICovICcnLCB0aGlzLm1vZHVsZVJlc29sdmVyLFxuICAgICAgICB0aGlzLmN5Y2xlQW5hbHl6ZXIsIHRoaXMucmVmRW1pdHRlciwgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUixcbiAgICAgICAgLyogYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIgKi8gZmFsc2UpLFxuICAgIG5ldyBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICB0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmV2YWx1YXRvciwgdGhpcy5mdWxsUmVnaXN0cnksIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsXG4gICAgICAgIHRoaXMuaXNDb3JlLCAvKiBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlciAqLyBmYWxzZSksXG4gICAgLy8gUGlwZSBoYW5kbGVyIG11c3QgYmUgYmVmb3JlIGluamVjdGFibGUgaGFuZGxlciBpbiBsaXN0IHNvIHBpcGUgZmFjdG9yaWVzIGFyZSBwcmludGVkXG4gICAgLy8gYmVmb3JlIGluamVjdGFibGUgZmFjdG9yaWVzIChzbyBpbmplY3RhYmxlIGZhY3RvcmllcyBjYW4gZGVsZWdhdGUgdG8gdGhlbSlcbiAgICBuZXcgUGlwZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLm1ldGFSZWdpc3RyeSwgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUixcbiAgICAgICAgdGhpcy5pc0NvcmUpLFxuICAgIG5ldyBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgdGhpcy5yZWZsZWN0aW9uSG9zdCwgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUiwgdGhpcy5pc0NvcmUsXG4gICAgICAgIC8qIHN0cmljdEN0b3JEZXBzICovIGZhbHNlLCAvKiBlcnJvck9uRHVwbGljYXRlUHJvdiAqLyBmYWxzZSksXG4gICAgbmV3IE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgdGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5ldmFsdWF0b3IsIHRoaXMuZnVsbE1ldGFSZWFkZXIsIHRoaXMuZnVsbFJlZ2lzdHJ5LFxuICAgICAgICB0aGlzLnNjb3BlUmVnaXN0cnksIHRoaXMucmVmZXJlbmNlc1JlZ2lzdHJ5LCB0aGlzLmlzQ29yZSwgLyogcm91dGVBbmFseXplciAqLyBudWxsLFxuICAgICAgICB0aGlzLnJlZkVtaXR0ZXIsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsIC8qIGFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyICovIGZhbHNlKSxcbiAgXTtcbiAgbWlncmF0aW9uczogTWlncmF0aW9uW10gPSBbXG4gICAgbmV3IFVuZGVjb3JhdGVkUGFyZW50TWlncmF0aW9uKCksXG4gICAgbmV3IFVuZGVjb3JhdGVkQ2hpbGRNaWdyYXRpb24oKSxcbiAgICBuZXcgTWlzc2luZ0luamVjdGFibGVNaWdyYXRpb24oKSxcbiAgXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgZnM6IEZpbGVTeXN0ZW0sIHByaXZhdGUgYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlLFxuICAgICAgcHJpdmF0ZSByZWZsZWN0aW9uSG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIHJlZmVyZW5jZXNSZWdpc3RyeTogUmVmZXJlbmNlc1JlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSBkaWFnbm9zdGljSGFuZGxlcjogKGVycm9yOiB0cy5EaWFnbm9zdGljKSA9PiB2b2lkID0gKCkgPT4ge30pIHt9XG5cbiAgLyoqXG4gICAqIEFuYWx5emUgYSBwcm9ncmFtIHRvIGZpbmQgYWxsIHRoZSBkZWNvcmF0ZWQgZmlsZXMgc2hvdWxkIGJlIHRyYW5zZm9ybWVkLlxuICAgKlxuICAgKiBAcmV0dXJucyBhIG1hcCBvZiB0aGUgc291cmNlIGZpbGVzIHRvIHRoZSBhbmFseXNpcyBmb3IgdGhvc2UgZmlsZXMuXG4gICAqL1xuICBhbmFseXplUHJvZ3JhbSgpOiBEZWNvcmF0aW9uQW5hbHlzZXMge1xuICAgIGNvbnN0IGRlY29yYXRpb25BbmFseXNlcyA9IG5ldyBEZWNvcmF0aW9uQW5hbHlzZXMoKTtcbiAgICBjb25zdCBhbmFseXplZEZpbGVzID0gdGhpcy5wcm9ncmFtLmdldFNvdXJjZUZpbGVzKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoc291cmNlRmlsZSA9PiBpc1dpdGhpblBhY2thZ2UodGhpcy5wYWNrYWdlUGF0aCwgc291cmNlRmlsZSkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKHNvdXJjZUZpbGUgPT4gdGhpcy5hbmFseXplRmlsZShzb3VyY2VGaWxlKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoaXNEZWZpbmVkKTtcblxuICAgIHRoaXMuYXBwbHlNaWdyYXRpb25zKGFuYWx5emVkRmlsZXMpO1xuXG4gICAgYW5hbHl6ZWRGaWxlcy5mb3JFYWNoKGFuYWx5emVkRmlsZSA9PiB0aGlzLnJlc29sdmVGaWxlKGFuYWx5emVkRmlsZSkpO1xuICAgIGNvbnN0IGNvbXBpbGVkRmlsZXMgPSBhbmFseXplZEZpbGVzLm1hcChhbmFseXplZEZpbGUgPT4gdGhpcy5jb21waWxlRmlsZShhbmFseXplZEZpbGUpKTtcbiAgICBjb21waWxlZEZpbGVzLmZvckVhY2goXG4gICAgICAgIGNvbXBpbGVkRmlsZSA9PiBkZWNvcmF0aW9uQW5hbHlzZXMuc2V0KGNvbXBpbGVkRmlsZS5zb3VyY2VGaWxlLCBjb21waWxlZEZpbGUpKTtcbiAgICByZXR1cm4gZGVjb3JhdGlvbkFuYWx5c2VzO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFuYWx5emVGaWxlKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBBbmFseXplZEZpbGV8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBhbmFseXplZENsYXNzZXMgPSB0aGlzLnJlZmxlY3Rpb25Ib3N0LmZpbmRDbGFzc1N5bWJvbHMoc291cmNlRmlsZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChzeW1ib2wgPT4gdGhpcy5hbmFseXplQ2xhc3Moc3ltYm9sKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihpc0RlZmluZWQpO1xuICAgIHJldHVybiBhbmFseXplZENsYXNzZXMubGVuZ3RoID8ge3NvdXJjZUZpbGUsIGFuYWx5emVkQ2xhc3Nlc30gOiB1bmRlZmluZWQ7XG4gIH1cblxuICBwcm90ZWN0ZWQgYW5hbHl6ZUNsYXNzKHN5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTogQW5hbHl6ZWRDbGFzc3xudWxsIHtcbiAgICBjb25zdCBkZWNvcmF0b3JzID0gdGhpcy5yZWZsZWN0aW9uSG9zdC5nZXREZWNvcmF0b3JzT2ZTeW1ib2woc3ltYm9sKTtcbiAgICBjb25zdCBhbmFseXplZENsYXNzID0gYW5hbHl6ZURlY29yYXRvcnMoc3ltYm9sLCBkZWNvcmF0b3JzLCB0aGlzLmhhbmRsZXJzKTtcbiAgICBpZiAoYW5hbHl6ZWRDbGFzcyAhPT0gbnVsbCAmJiBhbmFseXplZENsYXNzLmRpYWdub3N0aWNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGZvciAoY29uc3QgZGlhZ25vc3RpYyBvZiBhbmFseXplZENsYXNzLmRpYWdub3N0aWNzKSB7XG4gICAgICAgIHRoaXMuZGlhZ25vc3RpY0hhbmRsZXIoZGlhZ25vc3RpYyk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhbmFseXplZENsYXNzO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFwcGx5TWlncmF0aW9ucyhhbmFseXplZEZpbGVzOiBBbmFseXplZEZpbGVbXSk6IHZvaWQge1xuICAgIGNvbnN0IG1pZ3JhdGlvbkhvc3QgPSBuZXcgRGVmYXVsdE1pZ3JhdGlvbkhvc3QoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMuZnVsbE1ldGFSZWFkZXIsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLmhhbmRsZXJzLFxuICAgICAgICB0aGlzLmJ1bmRsZS5lbnRyeVBvaW50LnBhdGgsIGFuYWx5emVkRmlsZXMpO1xuXG4gICAgdGhpcy5taWdyYXRpb25zLmZvckVhY2gobWlncmF0aW9uID0+IHtcbiAgICAgIGFuYWx5emVkRmlsZXMuZm9yRWFjaChhbmFseXplZEZpbGUgPT4ge1xuICAgICAgICBhbmFseXplZEZpbGUuYW5hbHl6ZWRDbGFzc2VzLmZvckVhY2goKHtkZWNsYXJhdGlvbn0pID0+IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gbWlncmF0aW9uLmFwcGx5KGRlY2xhcmF0aW9uLCBtaWdyYXRpb25Ib3N0KTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgdGhpcy5kaWFnbm9zdGljSGFuZGxlcihyZXN1bHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGlmIChpc0ZhdGFsRGlhZ25vc3RpY0Vycm9yKGUpKSB7XG4gICAgICAgICAgICAgIHRoaXMuZGlhZ25vc3RpY0hhbmRsZXIoZS50b0RpYWdub3N0aWMoKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIHByb3RlY3RlZCBjb21waWxlRmlsZShhbmFseXplZEZpbGU6IEFuYWx5emVkRmlsZSk6IENvbXBpbGVkRmlsZSB7XG4gICAgY29uc3QgY29uc3RhbnRQb29sID0gbmV3IENvbnN0YW50UG9vbCgpO1xuICAgIGNvbnN0IGNvbXBpbGVkQ2xhc3NlczogQ29tcGlsZWRDbGFzc1tdID0gYW5hbHl6ZWRGaWxlLmFuYWx5emVkQ2xhc3Nlcy5tYXAoYW5hbHl6ZWRDbGFzcyA9PiB7XG4gICAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuY29tcGlsZUNsYXNzKGFuYWx5emVkQ2xhc3MsIGNvbnN0YW50UG9vbCk7XG4gICAgICBjb25zdCBkZWNsYXJhdGlvbiA9IGFuYWx5emVkQ2xhc3MuZGVjbGFyYXRpb247XG4gICAgICBjb25zdCByZWV4cG9ydHM6IFJlZXhwb3J0W10gPSB0aGlzLmdldFJlZXhwb3J0c0ZvckNsYXNzKGRlY2xhcmF0aW9uKTtcbiAgICAgIHJldHVybiB7Li4uYW5hbHl6ZWRDbGFzcywgY29tcGlsYXRpb24sIHJlZXhwb3J0c307XG4gICAgfSk7XG4gICAgcmV0dXJuIHtjb25zdGFudFBvb2wsIHNvdXJjZUZpbGU6IGFuYWx5emVkRmlsZS5zb3VyY2VGaWxlLCBjb21waWxlZENsYXNzZXN9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGNvbXBpbGVDbGFzcyhjbGF6ejogQW5hbHl6ZWRDbGFzcywgY29uc3RhbnRQb29sOiBDb25zdGFudFBvb2wpOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uczogQ29tcGlsZVJlc3VsdFtdID0gW107XG4gICAgZm9yIChjb25zdCB7aGFuZGxlciwgYW5hbHlzaXN9IG9mIGNsYXp6Lm1hdGNoZXMpIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGhhbmRsZXIuY29tcGlsZShjbGF6ei5kZWNsYXJhdGlvbiwgYW5hbHlzaXMsIGNvbnN0YW50UG9vbCk7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShyZXN1bHQpKSB7XG4gICAgICAgIHJlc3VsdC5mb3JFYWNoKGN1cnJlbnQgPT4ge1xuICAgICAgICAgIGlmICghY29tcGlsYXRpb25zLnNvbWUoY29tcGlsYXRpb24gPT4gY29tcGlsYXRpb24ubmFtZSA9PT0gY3VycmVudC5uYW1lKSkge1xuICAgICAgICAgICAgY29tcGlsYXRpb25zLnB1c2goY3VycmVudCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoIWNvbXBpbGF0aW9ucy5zb21lKGNvbXBpbGF0aW9uID0+IGNvbXBpbGF0aW9uLm5hbWUgPT09IHJlc3VsdC5uYW1lKSkge1xuICAgICAgICBjb21waWxhdGlvbnMucHVzaChyZXN1bHQpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY29tcGlsYXRpb25zO1xuICB9XG5cbiAgcHJvdGVjdGVkIHJlc29sdmVGaWxlKGFuYWx5emVkRmlsZTogQW5hbHl6ZWRGaWxlKTogdm9pZCB7XG4gICAgYW5hbHl6ZWRGaWxlLmFuYWx5emVkQ2xhc3Nlcy5mb3JFYWNoKCh7ZGVjbGFyYXRpb24sIG1hdGNoZXN9KSA9PiB7XG4gICAgICBtYXRjaGVzLmZvckVhY2goKHtoYW5kbGVyLCBhbmFseXNpc30pID0+IHtcbiAgICAgICAgaWYgKChoYW5kbGVyLnJlc29sdmUgIT09IHVuZGVmaW5lZCkgJiYgYW5hbHlzaXMpIHtcbiAgICAgICAgICBjb25zdCB7cmVleHBvcnRzLCBkaWFnbm9zdGljc30gPSBoYW5kbGVyLnJlc29sdmUoZGVjbGFyYXRpb24sIGFuYWx5c2lzKTtcbiAgICAgICAgICBpZiAocmVleHBvcnRzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkUmVleHBvcnRzKHJlZXhwb3J0cywgZGVjbGFyYXRpb24pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZGlhZ25vc3RpY3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZGlhZ25vc3RpY3MuZm9yRWFjaChlcnJvciA9PiB0aGlzLmRpYWdub3N0aWNIYW5kbGVyKGVycm9yKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UmVleHBvcnRzRm9yQ2xhc3MoZGVjbGFyYXRpb246IENsYXNzRGVjbGFyYXRpb248dHMuRGVjbGFyYXRpb24+KSB7XG4gICAgY29uc3QgcmVleHBvcnRzOiBSZWV4cG9ydFtdID0gW107XG4gICAgaWYgKHRoaXMucmVleHBvcnRNYXAuaGFzKGRlY2xhcmF0aW9uKSkge1xuICAgICAgdGhpcy5yZWV4cG9ydE1hcC5nZXQoZGVjbGFyYXRpb24pICEuZm9yRWFjaCgoW2Zyb21Nb2R1bGUsIHN5bWJvbE5hbWVdLCBhc0FsaWFzKSA9PiB7XG4gICAgICAgIHJlZXhwb3J0cy5wdXNoKHthc0FsaWFzLCBmcm9tTW9kdWxlLCBzeW1ib2xOYW1lfSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlZXhwb3J0cztcbiAgfVxuXG4gIHByaXZhdGUgYWRkUmVleHBvcnRzKHJlZXhwb3J0czogUmVleHBvcnRbXSwgZGVjbGFyYXRpb246IENsYXNzRGVjbGFyYXRpb248dHMuRGVjbGFyYXRpb24+KSB7XG4gICAgY29uc3QgbWFwID0gbmV3IE1hcDxzdHJpbmcsIFtzdHJpbmcsIHN0cmluZ10+KCk7XG4gICAgZm9yIChjb25zdCByZWV4cG9ydCBvZiByZWV4cG9ydHMpIHtcbiAgICAgIG1hcC5zZXQocmVleHBvcnQuYXNBbGlhcywgW3JlZXhwb3J0LmZyb21Nb2R1bGUsIHJlZXhwb3J0LnN5bWJvbE5hbWVdKTtcbiAgICB9XG4gICAgdGhpcy5yZWV4cG9ydE1hcC5zZXQoZGVjbGFyYXRpb24sIG1hcCk7XG4gIH1cbn1cbiJdfQ==