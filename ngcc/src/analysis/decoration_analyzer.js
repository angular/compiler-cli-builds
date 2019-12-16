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
            this.moduleResolver = new imports_1.ModuleResolver(this.program, this.options, this.host, /* moduleResolutionCache */ null);
            this.resourceManager = new NgccResourceLoader(this.fs);
            this.metaRegistry = new metadata_1.LocalMetadataRegistry();
            this.dtsMetaReader = new metadata_1.DtsMetadataReader(this.typeChecker, this.reflectionHost);
            this.fullMetaReader = new metadata_1.CompoundMetadataReader([this.metaRegistry, this.dtsMetaReader]);
            this.refEmitter = new imports_1.ReferenceEmitter([
                new imports_1.LocalIdentifierStrategy(),
                new imports_1.AbsoluteModuleStrategy(this.program, this.typeChecker, this.moduleResolver, this.reflectionHost),
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
            this.evaluator = new partial_evaluator_1.PartialEvaluator(this.reflectionHost, this.typeChecker, /* dependencyTracker */ null);
            this.importGraph = new cycles_1.ImportGraph(this.moduleResolver);
            this.cycleAnalyzer = new cycles_1.CycleAnalyzer(this.importGraph);
            this.handlers = [
                new annotations_1.ComponentDecoratorHandler(this.reflectionHost, this.evaluator, this.fullRegistry, this.fullMetaReader, this.scopeRegistry, this.scopeRegistry, this.isCore, this.resourceManager, this.rootDirs, 
                /* defaultPreserveWhitespaces */ false, 
                /* i18nUseExternalIds */ true, this.bundle.enableI18nLegacyMessageIdFormat, this.moduleResolver, this.cycleAnalyzer, this.refEmitter, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, util_1.NOOP_DEPENDENCY_TRACKER, /* annotateForClosureCompiler */ false),
                // See the note in ngtsc about why this cast is needed.
                // clang-format off
                new annotations_1.DirectiveDecoratorHandler(this.reflectionHost, this.evaluator, this.fullRegistry, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, this.isCore, /* annotateForClosureCompiler */ false),
                // clang-format on
                // Pipe handler must be before injectable handler in list so pipe factories are printed
                // before injectable factories (so injectable factories can delegate to them)
                new annotations_1.PipeDecoratorHandler(this.reflectionHost, this.evaluator, this.metaRegistry, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, this.isCore),
                new annotations_1.InjectableDecoratorHandler(this.reflectionHost, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, this.isCore, 
                /* strictCtorDeps */ false, /* errorOnDuplicateProv */ false),
                new annotations_1.NgModuleDecoratorHandler(this.reflectionHost, this.evaluator, this.fullMetaReader, this.fullRegistry, this.scopeRegistry, this.referencesRegistry, this.isCore, /* routeAnalyzer */ null, this.refEmitter, 
                /* factoryTracker */ null, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, 
                /* annotateForClosureCompiler */ false),
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
            var migrationHost = new migration_host_1.DefaultMigrationHost(this.reflectionHost, this.fullMetaReader, this.evaluator, this.handlers, this.bundle.entryPoint.path, analyzedFiles, this.diagnosticHandler);
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
            var _loop_1 = function (handler, analysis, resolution) {
                var result = handler.compile(clazz.declaration, analysis, resolution, constantPool);
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
                    var _d = _c.value, handler = _d.handler, analysis = _d.analysis, resolution = _d.resolution;
                    _loop_1(handler, analysis, resolution);
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
            var e_3, _a, e_4, _b;
            var _this = this;
            try {
                for (var _c = tslib_1.__values(analyzedFile.analyzedClasses), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var _e = _d.value, declaration = _e.declaration, matches = _e.matches;
                    try {
                        for (var matches_1 = (e_4 = void 0, tslib_1.__values(matches)), matches_1_1 = matches_1.next(); !matches_1_1.done; matches_1_1 = matches_1.next()) {
                            var match = matches_1_1.value;
                            var handler = match.handler, analysis = match.analysis;
                            if ((handler.resolve !== undefined) && analysis) {
                                var _f = handler.resolve(declaration, analysis), reexports = _f.reexports, diagnostics = _f.diagnostics, data = _f.data;
                                if (reexports !== undefined) {
                                    this.addReexports(reexports, declaration);
                                }
                                if (diagnostics !== undefined) {
                                    diagnostics.forEach(function (error) { return _this.diagnosticHandler(error); });
                                }
                                match.resolution = data;
                            }
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (matches_1_1 && !matches_1_1.done && (_b = matches_1.return)) _b.call(matches_1);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_3) throw e_3.error; }
            }
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
            var e_5, _a;
            var map = new Map();
            try {
                for (var reexports_1 = tslib_1.__values(reexports), reexports_1_1 = reexports_1.next(); !reexports_1_1.done; reexports_1_1 = reexports_1.next()) {
                    var reexport = reexports_1_1.value;
                    map.set(reexport.asAlias, [reexport.fromModule, reexport.symbolName]);
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (reexports_1_1 && !reexports_1_1.done && (_a = reexports_1.return)) _a.call(reexports_1);
                }
                finally { if (e_5) throw e_5.error; }
            }
            this.reexportMap.set(declaration, map);
        };
        return DecorationAnalyzer;
    }());
    exports.DecorationAnalyzer = DecorationAnalyzer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbl9hbmFseXplci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9hbmFseXNpcy9kZWNvcmF0aW9uX2FuYWx5emVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUErQztJQUUvQywyRUFBb047SUFDcE4saUVBQXFFO0lBQ3JFLDJFQUFzRTtJQUN0RSwyRUFBNkc7SUFDN0csbUVBQXdOO0lBQ3hOLHFFQUF1STtJQUN2SSx1RkFBc0U7SUFFdEUsK0RBQWtHO0lBSWxHLHVIQUFzRjtJQUN0RixxSEFBb0Y7SUFDcEYsdUhBQXNGO0lBRXRGLDhEQUFtQztJQUVuQyx5RkFBc0Q7SUFDdEQsdUVBQXFHO0lBQ3JHLHFFQUFtRjtJQUduRjs7T0FFRztJQUNIO1FBQ0UsNEJBQW9CLEVBQWM7WUFBZCxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQ2xDLGVBQVUsR0FBRyxLQUFLLENBQUM7UUFEa0IsQ0FBQztRQUV0QyxvQ0FBTyxHQUFQLGNBQXFDLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0UsaUNBQUksR0FBSixVQUFLLEdBQVcsSUFBWSxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLHFCQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEUsb0NBQU8sR0FBUCxVQUFRLEdBQVcsRUFBRSxjQUFzQjtZQUN6QyxPQUFPLHFCQUFPLENBQUMscUJBQU8sQ0FBQywwQkFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUNILHlCQUFDO0lBQUQsQ0FBQyxBQVJELElBUUM7SUFFRDs7T0FFRztJQUNIO1FBMEVFLDRCQUNZLEVBQWMsRUFBVSxNQUF3QixFQUNo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QUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztpQkFDdkU7Ozs7Ozs7OztZQUNELElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN6QyxDQUFDO1FBQ0gseUJBQUM7SUFBRCxDQUFDLEFBOU1ELElBOE1DO0lBOU1ZLGdEQUFrQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Q29uc3RhbnRQb29sfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7Q29tcG9uZW50RGVjb3JhdG9ySGFuZGxlciwgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlciwgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIsIE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlciwgUGlwZURlY29yYXRvckhhbmRsZXIsIFJlZmVyZW5jZXNSZWdpc3RyeSwgUmVzb3VyY2VMb2FkZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucyc7XG5pbXBvcnQge0N5Y2xlQW5hbHl6ZXIsIEltcG9ydEdyYXBofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvY3ljbGVzJztcbmltcG9ydCB7aXNGYXRhbERpYWdub3N0aWNFcnJvcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2RpYWdub3N0aWNzJztcbmltcG9ydCB7RmlsZVN5c3RlbSwgTG9naWNhbEZpbGVTeXN0ZW0sIGFic29sdXRlRnJvbSwgZGlybmFtZSwgcmVzb2x2ZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7QWJzb2x1dGVNb2R1bGVTdHJhdGVneSwgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3ksIExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3ksIE1vZHVsZVJlc29sdmVyLCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSLCBQcml2YXRlRXhwb3J0QWxpYXNpbmdIb3N0LCBSZWV4cG9ydCwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ltcG9ydHMnO1xuaW1wb3J0IHtDb21wb3VuZE1ldGFkYXRhUmVhZGVyLCBDb21wb3VuZE1ldGFkYXRhUmVnaXN0cnksIER0c01ldGFkYXRhUmVhZGVyLCBMb2NhbE1ldGFkYXRhUmVnaXN0cnl9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9tZXRhZGF0YSc7XG5pbXBvcnQge1BhcnRpYWxFdmFsdWF0b3J9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb259IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7TG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LCBNZXRhZGF0YUR0c01vZHVsZVNjb3BlUmVzb2x2ZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9zY29wZSc7XG5pbXBvcnQge0NvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy90cmFuc2Zvcm0nO1xuaW1wb3J0IHtOZ2NjQ2xhc3NTeW1ib2wsIE5nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtNaWdyYXRpb259IGZyb20gJy4uL21pZ3JhdGlvbnMvbWlncmF0aW9uJztcbmltcG9ydCB7TWlzc2luZ0luamVjdGFibGVNaWdyYXRpb259IGZyb20gJy4uL21pZ3JhdGlvbnMvbWlzc2luZ19pbmplY3RhYmxlX21pZ3JhdGlvbic7XG5pbXBvcnQge1VuZGVjb3JhdGVkQ2hpbGRNaWdyYXRpb259IGZyb20gJy4uL21pZ3JhdGlvbnMvdW5kZWNvcmF0ZWRfY2hpbGRfbWlncmF0aW9uJztcbmltcG9ydCB7VW5kZWNvcmF0ZWRQYXJlbnRNaWdyYXRpb259IGZyb20gJy4uL21pZ3JhdGlvbnMvdW5kZWNvcmF0ZWRfcGFyZW50X21pZ3JhdGlvbic7XG5pbXBvcnQge0VudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5pbXBvcnQge2lzRGVmaW5lZH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5pbXBvcnQge0RlZmF1bHRNaWdyYXRpb25Ib3N0fSBmcm9tICcuL21pZ3JhdGlvbl9ob3N0JztcbmltcG9ydCB7QW5hbHl6ZWRDbGFzcywgQW5hbHl6ZWRGaWxlLCBDb21waWxlZENsYXNzLCBDb21waWxlZEZpbGUsIERlY29yYXRpb25BbmFseXNlc30gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge05PT1BfREVQRU5ERU5DWV9UUkFDS0VSLCBhbmFseXplRGVjb3JhdG9ycywgaXNXaXRoaW5QYWNrYWdlfSBmcm9tICcuL3V0aWwnO1xuXG5cbi8qKlxuICogU2ltcGxlIGNsYXNzIHRoYXQgcmVzb2x2ZXMgYW5kIGxvYWRzIGZpbGVzIGRpcmVjdGx5IGZyb20gdGhlIGZpbGVzeXN0ZW0uXG4gKi9cbmNsYXNzIE5nY2NSZXNvdXJjZUxvYWRlciBpbXBsZW1lbnRzIFJlc291cmNlTG9hZGVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmczogRmlsZVN5c3RlbSkge31cbiAgY2FuUHJlbG9hZCA9IGZhbHNlO1xuICBwcmVsb2FkKCk6IHVuZGVmaW5lZHxQcm9taXNlPHZvaWQ+IHsgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQuJyk7IH1cbiAgbG9hZCh1cmw6IHN0cmluZyk6IHN0cmluZyB7IHJldHVybiB0aGlzLmZzLnJlYWRGaWxlKHJlc29sdmUodXJsKSk7IH1cbiAgcmVzb2x2ZSh1cmw6IHN0cmluZywgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHJlc29sdmUoZGlybmFtZShhYnNvbHV0ZUZyb20oY29udGFpbmluZ0ZpbGUpKSwgdXJsKTtcbiAgfVxufVxuXG4vKipcbiAqIFRoaXMgQW5hbHl6ZXIgd2lsbCBhbmFseXplIHRoZSBmaWxlcyB0aGF0IGhhdmUgZGVjb3JhdGVkIGNsYXNzZXMgdGhhdCBuZWVkIHRvIGJlIHRyYW5zZm9ybWVkLlxuICovXG5leHBvcnQgY2xhc3MgRGVjb3JhdGlvbkFuYWx5emVyIHtcbiAgcHJpdmF0ZSBwcm9ncmFtID0gdGhpcy5idW5kbGUuc3JjLnByb2dyYW07XG4gIHByaXZhdGUgb3B0aW9ucyA9IHRoaXMuYnVuZGxlLnNyYy5vcHRpb25zO1xuICBwcml2YXRlIGhvc3QgPSB0aGlzLmJ1bmRsZS5zcmMuaG9zdDtcbiAgcHJpdmF0ZSB0eXBlQ2hlY2tlciA9IHRoaXMuYnVuZGxlLnNyYy5wcm9ncmFtLmdldFR5cGVDaGVja2VyKCk7XG4gIHByaXZhdGUgcm9vdERpcnMgPSB0aGlzLmJ1bmRsZS5yb290RGlycztcbiAgcHJpdmF0ZSBwYWNrYWdlUGF0aCA9IHRoaXMuYnVuZGxlLmVudHJ5UG9pbnQucGFja2FnZTtcbiAgcHJpdmF0ZSBpc0NvcmUgPSB0aGlzLmJ1bmRsZS5pc0NvcmU7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBOZ01vZHVsZSBkZWNsYXJhdGlvbnMgdG8gdGhlIHJlLWV4cG9ydHMgZm9yIHRoYXQgTmdNb2R1bGUuXG4gICAqL1xuICBwcml2YXRlIHJlZXhwb3J0TWFwID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgTWFwPHN0cmluZywgW3N0cmluZywgc3RyaW5nXT4+KCk7XG4gIG1vZHVsZVJlc29sdmVyID1cbiAgICAgIG5ldyBNb2R1bGVSZXNvbHZlcih0aGlzLnByb2dyYW0sIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0LCAvKiBtb2R1bGVSZXNvbHV0aW9uQ2FjaGUgKi8gbnVsbCk7XG4gIHJlc291cmNlTWFuYWdlciA9IG5ldyBOZ2NjUmVzb3VyY2VMb2FkZXIodGhpcy5mcyk7XG4gIG1ldGFSZWdpc3RyeSA9IG5ldyBMb2NhbE1ldGFkYXRhUmVnaXN0cnkoKTtcbiAgZHRzTWV0YVJlYWRlciA9IG5ldyBEdHNNZXRhZGF0YVJlYWRlcih0aGlzLnR5cGVDaGVja2VyLCB0aGlzLnJlZmxlY3Rpb25Ib3N0KTtcbiAgZnVsbE1ldGFSZWFkZXIgPSBuZXcgQ29tcG91bmRNZXRhZGF0YVJlYWRlcihbdGhpcy5tZXRhUmVnaXN0cnksIHRoaXMuZHRzTWV0YVJlYWRlcl0pO1xuICByZWZFbWl0dGVyID0gbmV3IFJlZmVyZW5jZUVtaXR0ZXIoW1xuICAgIG5ldyBMb2NhbElkZW50aWZpZXJTdHJhdGVneSgpLFxuICAgIG5ldyBBYnNvbHV0ZU1vZHVsZVN0cmF0ZWd5KFxuICAgICAgICB0aGlzLnByb2dyYW0sIHRoaXMudHlwZUNoZWNrZXIsIHRoaXMubW9kdWxlUmVzb2x2ZXIsIHRoaXMucmVmbGVjdGlvbkhvc3QpLFxuICAgIC8vIFRPRE8oYWx4aHViKTogdGhlcmUncyBubyByZWFzb24gd2h5IG5nY2MgbmVlZHMgdGhlIFwibG9naWNhbCBmaWxlIHN5c3RlbVwiIGxvZ2ljIGhlcmUsIGFzIG5nY2NcbiAgICAvLyBwcm9qZWN0cyBvbmx5IGV2ZXIgaGF2ZSBvbmUgcm9vdERpci4gSW5zdGVhZCwgbmdjYyBzaG91bGQganVzdCBzd2l0Y2ggaXRzIGVtaXR0ZWQgaW1wb3J0XG4gICAgLy8gYmFzZWQgb24gd2hldGhlciBhIGJlc3RHdWVzc093bmluZ01vZHVsZSBpcyBwcmVzZW50IGluIHRoZSBSZWZlcmVuY2UuXG4gICAgbmV3IExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3kodGhpcy5yZWZsZWN0aW9uSG9zdCwgbmV3IExvZ2ljYWxGaWxlU3lzdGVtKHRoaXMucm9vdERpcnMpKSxcbiAgXSk7XG4gIGFsaWFzaW5nSG9zdCA9IHRoaXMuYnVuZGxlLmVudHJ5UG9pbnQuZ2VuZXJhdGVEZWVwUmVleHBvcnRzP1xuICAgICAgICAgICAgICAgICBuZXcgUHJpdmF0ZUV4cG9ydEFsaWFzaW5nSG9zdCh0aGlzLnJlZmxlY3Rpb25Ib3N0KTogbnVsbDtcbiAgZHRzTW9kdWxlU2NvcGVSZXNvbHZlciA9XG4gICAgICBuZXcgTWV0YWRhdGFEdHNNb2R1bGVTY29wZVJlc29sdmVyKHRoaXMuZHRzTWV0YVJlYWRlciwgdGhpcy5hbGlhc2luZ0hvc3QpO1xuICBzY29wZVJlZ2lzdHJ5ID0gbmV3IExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeShcbiAgICAgIHRoaXMubWV0YVJlZ2lzdHJ5LCB0aGlzLmR0c01vZHVsZVNjb3BlUmVzb2x2ZXIsIHRoaXMucmVmRW1pdHRlciwgdGhpcy5hbGlhc2luZ0hvc3QpO1xuICBmdWxsUmVnaXN0cnkgPSBuZXcgQ29tcG91bmRNZXRhZGF0YVJlZ2lzdHJ5KFt0aGlzLm1ldGFSZWdpc3RyeSwgdGhpcy5zY29wZVJlZ2lzdHJ5XSk7XG4gIGV2YWx1YXRvciA9XG4gICAgICBuZXcgUGFydGlhbEV2YWx1YXRvcih0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLnR5cGVDaGVja2VyLCAvKiBkZXBlbmRlbmN5VHJhY2tlciAqLyBudWxsKTtcbiAgaW1wb3J0R3JhcGggPSBuZXcgSW1wb3J0R3JhcGgodGhpcy5tb2R1bGVSZXNvbHZlcik7XG4gIGN5Y2xlQW5hbHl6ZXIgPSBuZXcgQ3ljbGVBbmFseXplcih0aGlzLmltcG9ydEdyYXBoKTtcbiAgaGFuZGxlcnM6IERlY29yYXRvckhhbmRsZXI8dW5rbm93biwgdW5rbm93biwgdW5rbm93bj5bXSA9IFtcbiAgICBuZXcgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgdGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5ldmFsdWF0b3IsIHRoaXMuZnVsbFJlZ2lzdHJ5LCB0aGlzLmZ1bGxNZXRhUmVhZGVyLFxuICAgICAgICB0aGlzLnNjb3BlUmVnaXN0cnksIHRoaXMuc2NvcGVSZWdpc3RyeSwgdGhpcy5pc0NvcmUsIHRoaXMucmVzb3VyY2VNYW5hZ2VyLCB0aGlzLnJvb3REaXJzLFxuICAgICAgICAvKiBkZWZhdWx0UHJlc2VydmVXaGl0ZXNwYWNlcyAqLyBmYWxzZSxcbiAgICAgICAgLyogaTE4blVzZUV4dGVybmFsSWRzICovIHRydWUsIHRoaXMuYnVuZGxlLmVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQsXG4gICAgICAgIHRoaXMubW9kdWxlUmVzb2x2ZXIsIHRoaXMuY3ljbGVBbmFseXplciwgdGhpcy5yZWZFbWl0dGVyLCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSLFxuICAgICAgICBOT09QX0RFUEVOREVOQ1lfVFJBQ0tFUiwgLyogYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIgKi8gZmFsc2UpLFxuICAgIC8vIFNlZSB0aGUgbm90ZSBpbiBuZ3RzYyBhYm91dCB3aHkgdGhpcyBjYXN0IGlzIG5lZWRlZC5cbiAgICAvLyBjbGFuZy1mb3JtYXQgb2ZmXG4gICAgbmV3IERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLmZ1bGxSZWdpc3RyeSwgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUixcbiAgICAgICAgdGhpcy5pc0NvcmUsIC8qIGFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyICovIGZhbHNlKSBhcyBEZWNvcmF0b3JIYW5kbGVyPHVua25vd24sIHVua25vd24sIHVua25vd24+LFxuICAgIC8vIGNsYW5nLWZvcm1hdCBvblxuICAgIC8vIFBpcGUgaGFuZGxlciBtdXN0IGJlIGJlZm9yZSBpbmplY3RhYmxlIGhhbmRsZXIgaW4gbGlzdCBzbyBwaXBlIGZhY3RvcmllcyBhcmUgcHJpbnRlZFxuICAgIC8vIGJlZm9yZSBpbmplY3RhYmxlIGZhY3RvcmllcyAoc28gaW5qZWN0YWJsZSBmYWN0b3JpZXMgY2FuIGRlbGVnYXRlIHRvIHRoZW0pXG4gICAgbmV3IFBpcGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICB0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmV2YWx1YXRvciwgdGhpcy5tZXRhUmVnaXN0cnksIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsXG4gICAgICAgIHRoaXMuaXNDb3JlKSxcbiAgICBuZXcgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsIHRoaXMuaXNDb3JlLFxuICAgICAgICAvKiBzdHJpY3RDdG9yRGVwcyAqLyBmYWxzZSwgLyogZXJyb3JPbkR1cGxpY2F0ZVByb3YgKi8gZmFsc2UpLFxuICAgIG5ldyBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLmZ1bGxNZXRhUmVhZGVyLCB0aGlzLmZ1bGxSZWdpc3RyeSxcbiAgICAgICAgdGhpcy5zY29wZVJlZ2lzdHJ5LCB0aGlzLnJlZmVyZW5jZXNSZWdpc3RyeSwgdGhpcy5pc0NvcmUsIC8qIHJvdXRlQW5hbHl6ZXIgKi8gbnVsbCxcbiAgICAgICAgdGhpcy5yZWZFbWl0dGVyLFxuICAgICAgICAvKiBmYWN0b3J5VHJhY2tlciAqLyBudWxsLCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSLFxuICAgICAgICAvKiBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlciAqLyBmYWxzZSksXG4gIF07XG4gIG1pZ3JhdGlvbnM6IE1pZ3JhdGlvbltdID0gW1xuICAgIG5ldyBVbmRlY29yYXRlZFBhcmVudE1pZ3JhdGlvbigpLFxuICAgIG5ldyBVbmRlY29yYXRlZENoaWxkTWlncmF0aW9uKCksXG4gICAgbmV3IE1pc3NpbmdJbmplY3RhYmxlTWlncmF0aW9uKCksXG4gIF07XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGZzOiBGaWxlU3lzdGVtLCBwcml2YXRlIGJ1bmRsZTogRW50cnlQb2ludEJ1bmRsZSxcbiAgICAgIHByaXZhdGUgcmVmbGVjdGlvbkhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgZGlhZ25vc3RpY0hhbmRsZXI6IChlcnJvcjogdHMuRGlhZ25vc3RpYykgPT4gdm9pZCA9ICgpID0+IHt9KSB7fVxuXG4gIC8qKlxuICAgKiBBbmFseXplIGEgcHJvZ3JhbSB0byBmaW5kIGFsbCB0aGUgZGVjb3JhdGVkIGZpbGVzIHNob3VsZCBiZSB0cmFuc2Zvcm1lZC5cbiAgICpcbiAgICogQHJldHVybnMgYSBtYXAgb2YgdGhlIHNvdXJjZSBmaWxlcyB0byB0aGUgYW5hbHlzaXMgZm9yIHRob3NlIGZpbGVzLlxuICAgKi9cbiAgYW5hbHl6ZVByb2dyYW0oKTogRGVjb3JhdGlvbkFuYWx5c2VzIHtcbiAgICBjb25zdCBkZWNvcmF0aW9uQW5hbHlzZXMgPSBuZXcgRGVjb3JhdGlvbkFuYWx5c2VzKCk7XG4gICAgY29uc3QgYW5hbHl6ZWRGaWxlcyA9IHRoaXMucHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKHNvdXJjZUZpbGUgPT4gaXNXaXRoaW5QYWNrYWdlKHRoaXMucGFja2FnZVBhdGgsIHNvdXJjZUZpbGUpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChzb3VyY2VGaWxlID0+IHRoaXMuYW5hbHl6ZUZpbGUoc291cmNlRmlsZSkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGlzRGVmaW5lZCk7XG5cbiAgICB0aGlzLmFwcGx5TWlncmF0aW9ucyhhbmFseXplZEZpbGVzKTtcblxuICAgIGFuYWx5emVkRmlsZXMuZm9yRWFjaChhbmFseXplZEZpbGUgPT4gdGhpcy5yZXNvbHZlRmlsZShhbmFseXplZEZpbGUpKTtcbiAgICBjb25zdCBjb21waWxlZEZpbGVzID0gYW5hbHl6ZWRGaWxlcy5tYXAoYW5hbHl6ZWRGaWxlID0+IHRoaXMuY29tcGlsZUZpbGUoYW5hbHl6ZWRGaWxlKSk7XG4gICAgY29tcGlsZWRGaWxlcy5mb3JFYWNoKFxuICAgICAgICBjb21waWxlZEZpbGUgPT4gZGVjb3JhdGlvbkFuYWx5c2VzLnNldChjb21waWxlZEZpbGUuc291cmNlRmlsZSwgY29tcGlsZWRGaWxlKSk7XG4gICAgcmV0dXJuIGRlY29yYXRpb25BbmFseXNlcztcbiAgfVxuXG4gIHByb3RlY3RlZCBhbmFseXplRmlsZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogQW5hbHl6ZWRGaWxlfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgYW5hbHl6ZWRDbGFzc2VzID0gdGhpcy5yZWZsZWN0aW9uSG9zdC5maW5kQ2xhc3NTeW1ib2xzKHNvdXJjZUZpbGUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoc3ltYm9sID0+IHRoaXMuYW5hbHl6ZUNsYXNzKHN5bWJvbCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoaXNEZWZpbmVkKTtcbiAgICByZXR1cm4gYW5hbHl6ZWRDbGFzc2VzLmxlbmd0aCA/IHtzb3VyY2VGaWxlLCBhbmFseXplZENsYXNzZXN9IDogdW5kZWZpbmVkO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFuYWx5emVDbGFzcyhzeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IEFuYWx5emVkQ2xhc3N8bnVsbCB7XG4gICAgY29uc3QgZGVjb3JhdG9ycyA9IHRoaXMucmVmbGVjdGlvbkhvc3QuZ2V0RGVjb3JhdG9yc09mU3ltYm9sKHN5bWJvbCk7XG4gICAgY29uc3QgYW5hbHl6ZWRDbGFzcyA9IGFuYWx5emVEZWNvcmF0b3JzKHN5bWJvbCwgZGVjb3JhdG9ycywgdGhpcy5oYW5kbGVycyk7XG4gICAgaWYgKGFuYWx5emVkQ2xhc3MgIT09IG51bGwgJiYgYW5hbHl6ZWRDbGFzcy5kaWFnbm9zdGljcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBmb3IgKGNvbnN0IGRpYWdub3N0aWMgb2YgYW5hbHl6ZWRDbGFzcy5kaWFnbm9zdGljcykge1xuICAgICAgICB0aGlzLmRpYWdub3N0aWNIYW5kbGVyKGRpYWdub3N0aWMpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYW5hbHl6ZWRDbGFzcztcbiAgfVxuXG4gIHByb3RlY3RlZCBhcHBseU1pZ3JhdGlvbnMoYW5hbHl6ZWRGaWxlczogQW5hbHl6ZWRGaWxlW10pOiB2b2lkIHtcbiAgICBjb25zdCBtaWdyYXRpb25Ib3N0ID0gbmV3IERlZmF1bHRNaWdyYXRpb25Ib3N0KFxuICAgICAgICB0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmZ1bGxNZXRhUmVhZGVyLCB0aGlzLmV2YWx1YXRvciwgdGhpcy5oYW5kbGVycyxcbiAgICAgICAgdGhpcy5idW5kbGUuZW50cnlQb2ludC5wYXRoLCBhbmFseXplZEZpbGVzLCB0aGlzLmRpYWdub3N0aWNIYW5kbGVyKTtcblxuICAgIHRoaXMubWlncmF0aW9ucy5mb3JFYWNoKG1pZ3JhdGlvbiA9PiB7XG4gICAgICBhbmFseXplZEZpbGVzLmZvckVhY2goYW5hbHl6ZWRGaWxlID0+IHtcbiAgICAgICAgYW5hbHl6ZWRGaWxlLmFuYWx5emVkQ2xhc3Nlcy5mb3JFYWNoKCh7ZGVjbGFyYXRpb259KSA9PiB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IG1pZ3JhdGlvbi5hcHBseShkZWNsYXJhdGlvbiwgbWlncmF0aW9uSG9zdCk7XG4gICAgICAgICAgICBpZiAocmVzdWx0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHRoaXMuZGlhZ25vc3RpY0hhbmRsZXIocmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBpZiAoaXNGYXRhbERpYWdub3N0aWNFcnJvcihlKSkge1xuICAgICAgICAgICAgICB0aGlzLmRpYWdub3N0aWNIYW5kbGVyKGUudG9EaWFnbm9zdGljKCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgY29tcGlsZUZpbGUoYW5hbHl6ZWRGaWxlOiBBbmFseXplZEZpbGUpOiBDb21waWxlZEZpbGUge1xuICAgIGNvbnN0IGNvbnN0YW50UG9vbCA9IG5ldyBDb25zdGFudFBvb2woKTtcbiAgICBjb25zdCBjb21waWxlZENsYXNzZXM6IENvbXBpbGVkQ2xhc3NbXSA9IGFuYWx5emVkRmlsZS5hbmFseXplZENsYXNzZXMubWFwKGFuYWx5emVkQ2xhc3MgPT4ge1xuICAgICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmNvbXBpbGVDbGFzcyhhbmFseXplZENsYXNzLCBjb25zdGFudFBvb2wpO1xuICAgICAgY29uc3QgZGVjbGFyYXRpb24gPSBhbmFseXplZENsYXNzLmRlY2xhcmF0aW9uO1xuICAgICAgY29uc3QgcmVleHBvcnRzOiBSZWV4cG9ydFtdID0gdGhpcy5nZXRSZWV4cG9ydHNGb3JDbGFzcyhkZWNsYXJhdGlvbik7XG4gICAgICByZXR1cm4gey4uLmFuYWx5emVkQ2xhc3MsIGNvbXBpbGF0aW9uLCByZWV4cG9ydHN9O1xuICAgIH0pO1xuICAgIHJldHVybiB7Y29uc3RhbnRQb29sLCBzb3VyY2VGaWxlOiBhbmFseXplZEZpbGUuc291cmNlRmlsZSwgY29tcGlsZWRDbGFzc2VzfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBjb21waWxlQ2xhc3MoY2xheno6IEFuYWx5emVkQ2xhc3MsIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sKTogQ29tcGlsZVJlc3VsdFtdIHtcbiAgICBjb25zdCBjb21waWxhdGlvbnM6IENvbXBpbGVSZXN1bHRbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qge2hhbmRsZXIsIGFuYWx5c2lzLCByZXNvbHV0aW9ufSBvZiBjbGF6ei5tYXRjaGVzKSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBoYW5kbGVyLmNvbXBpbGUoY2xhenouZGVjbGFyYXRpb24sIGFuYWx5c2lzLCByZXNvbHV0aW9uLCBjb25zdGFudFBvb2wpO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVzdWx0KSkge1xuICAgICAgICByZXN1bHQuZm9yRWFjaChjdXJyZW50ID0+IHtcbiAgICAgICAgICBpZiAoIWNvbXBpbGF0aW9ucy5zb21lKGNvbXBpbGF0aW9uID0+IGNvbXBpbGF0aW9uLm5hbWUgPT09IGN1cnJlbnQubmFtZSkpIHtcbiAgICAgICAgICAgIGNvbXBpbGF0aW9ucy5wdXNoKGN1cnJlbnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKCFjb21waWxhdGlvbnMuc29tZShjb21waWxhdGlvbiA9PiBjb21waWxhdGlvbi5uYW1lID09PSByZXN1bHQubmFtZSkpIHtcbiAgICAgICAgY29tcGlsYXRpb25zLnB1c2gocmVzdWx0KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNvbXBpbGF0aW9ucztcbiAgfVxuXG4gIHByb3RlY3RlZCByZXNvbHZlRmlsZShhbmFseXplZEZpbGU6IEFuYWx5emVkRmlsZSk6IHZvaWQge1xuICAgIGZvciAoY29uc3Qge2RlY2xhcmF0aW9uLCBtYXRjaGVzfSBvZiBhbmFseXplZEZpbGUuYW5hbHl6ZWRDbGFzc2VzKSB7XG4gICAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIG1hdGNoZXMpIHtcbiAgICAgICAgY29uc3Qge2hhbmRsZXIsIGFuYWx5c2lzfSA9IG1hdGNoO1xuICAgICAgICBpZiAoKGhhbmRsZXIucmVzb2x2ZSAhPT0gdW5kZWZpbmVkKSAmJiBhbmFseXNpcykge1xuICAgICAgICAgIGNvbnN0IHtyZWV4cG9ydHMsIGRpYWdub3N0aWNzLCBkYXRhfSA9IGhhbmRsZXIucmVzb2x2ZShkZWNsYXJhdGlvbiwgYW5hbHlzaXMpO1xuICAgICAgICAgIGlmIChyZWV4cG9ydHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5hZGRSZWV4cG9ydHMocmVleHBvcnRzLCBkZWNsYXJhdGlvbik7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChkaWFnbm9zdGljcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBkaWFnbm9zdGljcy5mb3JFYWNoKGVycm9yID0+IHRoaXMuZGlhZ25vc3RpY0hhbmRsZXIoZXJyb3IpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbWF0Y2gucmVzb2x1dGlvbiA9IGRhdGEgYXMgUmVhZG9ubHk8dW5rbm93bj47XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFJlZXhwb3J0c0ZvckNsYXNzKGRlY2xhcmF0aW9uOiBDbGFzc0RlY2xhcmF0aW9uPHRzLkRlY2xhcmF0aW9uPikge1xuICAgIGNvbnN0IHJlZXhwb3J0czogUmVleHBvcnRbXSA9IFtdO1xuICAgIGlmICh0aGlzLnJlZXhwb3J0TWFwLmhhcyhkZWNsYXJhdGlvbikpIHtcbiAgICAgIHRoaXMucmVleHBvcnRNYXAuZ2V0KGRlY2xhcmF0aW9uKSAhLmZvckVhY2goKFtmcm9tTW9kdWxlLCBzeW1ib2xOYW1lXSwgYXNBbGlhcykgPT4ge1xuICAgICAgICByZWV4cG9ydHMucHVzaCh7YXNBbGlhcywgZnJvbU1vZHVsZSwgc3ltYm9sTmFtZX0pO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiByZWV4cG9ydHM7XG4gIH1cblxuICBwcml2YXRlIGFkZFJlZXhwb3J0cyhyZWV4cG9ydHM6IFJlZXhwb3J0W10sIGRlY2xhcmF0aW9uOiBDbGFzc0RlY2xhcmF0aW9uPHRzLkRlY2xhcmF0aW9uPikge1xuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBbc3RyaW5nLCBzdHJpbmddPigpO1xuICAgIGZvciAoY29uc3QgcmVleHBvcnQgb2YgcmVleHBvcnRzKSB7XG4gICAgICBtYXAuc2V0KHJlZXhwb3J0LmFzQWxpYXMsIFtyZWV4cG9ydC5mcm9tTW9kdWxlLCByZWV4cG9ydC5zeW1ib2xOYW1lXSk7XG4gICAgfVxuICAgIHRoaXMucmVleHBvcnRNYXAuc2V0KGRlY2xhcmF0aW9uLCBtYXApO1xuICB9XG59XG4iXX0=