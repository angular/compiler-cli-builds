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
                /* i18nUseExternalIds */ true, this.bundle.enableI18nLegacyMessageIdFormat, this.moduleResolver, this.cycleAnalyzer, this.refEmitter, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, 
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbl9hbmFseXplci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9hbmFseXNpcy9kZWNvcmF0aW9uX2FuYWx5emVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUErQztJQUUvQywyRUFBb047SUFDcE4saUVBQXFFO0lBQ3JFLDJFQUFzRTtJQUN0RSwyRUFBNkc7SUFDN0csbUVBQXdOO0lBQ3hOLHFFQUF1STtJQUN2SSx1RkFBc0U7SUFFdEUsK0RBQWtHO0lBSWxHLHVIQUFzRjtJQUN0RixxSEFBb0Y7SUFDcEYsdUhBQXNGO0lBRXRGLDhEQUFtQztJQUVuQyx5RkFBc0Q7SUFDdEQsdUVBQXFHO0lBQ3JHLHFFQUEwRDtJQUcxRDs7T0FFRztJQUNIO1FBQ0UsNEJBQW9CLEVBQWM7WUFBZCxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQ2xDLGVBQVUsR0FBRyxLQUFLLENBQUM7UUFEa0IsQ0FBQztRQUV0QyxvQ0FBTyxHQUFQLGNBQXFDLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0UsaUNBQUksR0FBSixVQUFLLEdBQVcsSUFBWSxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLHFCQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEUsb0NBQU8sR0FBUCxVQUFRLEdBQVcsRUFBRSxjQUFzQjtZQUN6QyxPQUFPLHFCQUFPLENBQUMscUJBQU8sQ0FBQywwQkFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUNILHlCQUFDO0lBQUQsQ0FBQyxBQVJELElBUUM7SUFFRDs7T0FFRztJQUNIO1FBbUVFLDRCQUNZLEVBQWMsRUFBVSxNQUF3QixFQUNo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QUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFTyxpREFBb0IsR0FBNUIsVUFBNkIsV0FBNkM7WUFDeEUsSUFBTSxTQUFTLEdBQWUsRUFBRSxDQUFDO1lBQ2pDLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEVBQUU7Z0JBQ3JDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBRyxDQUFDLE9BQU8sQ0FBQyxVQUFDLEVBQXdCLEVBQUUsT0FBTzt3QkFBakMsMEJBQXdCLEVBQXZCLGtCQUFVLEVBQUUsa0JBQVU7b0JBQ2xFLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBQyxPQUFPLFNBQUEsRUFBRSxVQUFVLFlBQUEsRUFBRSxVQUFVLFlBQUEsRUFBQyxDQUFDLENBQUM7Z0JBQ3BELENBQUMsQ0FBQyxDQUFDO2FBQ0o7WUFDRCxPQUFPLFNBQVMsQ0FBQztRQUNuQixDQUFDO1FBRU8seUNBQVksR0FBcEIsVUFBcUIsU0FBcUIsRUFBRSxXQUE2Qzs7WUFDdkYsSUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQTRCLENBQUM7O2dCQUNoRCxLQUF1QixJQUFBLGNBQUEsaUJBQUEsU0FBUyxDQUFBLG9DQUFBLDJEQUFFO29CQUE3QixJQUFNLFFBQVEsc0JBQUE7b0JBQ2pCLEdBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7aUJBQ3ZFOzs7Ozs7Ozs7WUFDRCxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDekMsQ0FBQztRQUNILHlCQUFDO0lBQUQsQ0FBQyxBQXJNRCxJQXFNQztJQXJNWSxnREFBa0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0NvbnN0YW50UG9vbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge0NvbXBvbmVudERlY29yYXRvckhhbmRsZXIsIERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIsIEluamVjdGFibGVEZWNvcmF0b3JIYW5kbGVyLCBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIsIFBpcGVEZWNvcmF0b3JIYW5kbGVyLCBSZWZlcmVuY2VzUmVnaXN0cnksIFJlc291cmNlTG9hZGVyfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvYW5ub3RhdGlvbnMnO1xuaW1wb3J0IHtDeWNsZUFuYWx5emVyLCBJbXBvcnRHcmFwaH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2N5Y2xlcyc7XG5pbXBvcnQge2lzRmF0YWxEaWFnbm9zdGljRXJyb3J9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0ZpbGVTeXN0ZW0sIExvZ2ljYWxGaWxlU3lzdGVtLCBhYnNvbHV0ZUZyb20sIGRpcm5hbWUsIHJlc29sdmV9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0Fic29sdXRlTW9kdWxlU3RyYXRlZ3ksIExvY2FsSWRlbnRpZmllclN0cmF0ZWd5LCBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5LCBNb2R1bGVSZXNvbHZlciwgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUiwgUHJpdmF0ZUV4cG9ydEFsaWFzaW5nSG9zdCwgUmVleHBvcnQsIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9pbXBvcnRzJztcbmltcG9ydCB7Q29tcG91bmRNZXRhZGF0YVJlYWRlciwgQ29tcG91bmRNZXRhZGF0YVJlZ2lzdHJ5LCBEdHNNZXRhZGF0YVJlYWRlciwgTG9jYWxNZXRhZGF0YVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvbWV0YWRhdGEnO1xuaW1wb3J0IHtQYXJ0aWFsRXZhbHVhdG9yfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge0xvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeSwgTWV0YWRhdGFEdHNNb2R1bGVTY29wZVJlc29sdmVyfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2Mvc2NvcGUnO1xuaW1wb3J0IHtDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvdHJhbnNmb3JtJztcbmltcG9ydCB7TmdjY0NsYXNzU3ltYm9sLCBOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7TWlncmF0aW9ufSBmcm9tICcuLi9taWdyYXRpb25zL21pZ3JhdGlvbic7XG5pbXBvcnQge01pc3NpbmdJbmplY3RhYmxlTWlncmF0aW9ufSBmcm9tICcuLi9taWdyYXRpb25zL21pc3NpbmdfaW5qZWN0YWJsZV9taWdyYXRpb24nO1xuaW1wb3J0IHtVbmRlY29yYXRlZENoaWxkTWlncmF0aW9ufSBmcm9tICcuLi9taWdyYXRpb25zL3VuZGVjb3JhdGVkX2NoaWxkX21pZ3JhdGlvbic7XG5pbXBvcnQge1VuZGVjb3JhdGVkUGFyZW50TWlncmF0aW9ufSBmcm9tICcuLi9taWdyYXRpb25zL3VuZGVjb3JhdGVkX3BhcmVudF9taWdyYXRpb24nO1xuaW1wb3J0IHtFbnRyeVBvaW50QnVuZGxlfSBmcm9tICcuLi9wYWNrYWdlcy9lbnRyeV9wb2ludF9idW5kbGUnO1xuaW1wb3J0IHtpc0RlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcblxuaW1wb3J0IHtEZWZhdWx0TWlncmF0aW9uSG9zdH0gZnJvbSAnLi9taWdyYXRpb25faG9zdCc7XG5pbXBvcnQge0FuYWx5emVkQ2xhc3MsIEFuYWx5emVkRmlsZSwgQ29tcGlsZWRDbGFzcywgQ29tcGlsZWRGaWxlLCBEZWNvcmF0aW9uQW5hbHlzZXN9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHthbmFseXplRGVjb3JhdG9ycywgaXNXaXRoaW5QYWNrYWdlfSBmcm9tICcuL3V0aWwnO1xuXG5cbi8qKlxuICogU2ltcGxlIGNsYXNzIHRoYXQgcmVzb2x2ZXMgYW5kIGxvYWRzIGZpbGVzIGRpcmVjdGx5IGZyb20gdGhlIGZpbGVzeXN0ZW0uXG4gKi9cbmNsYXNzIE5nY2NSZXNvdXJjZUxvYWRlciBpbXBsZW1lbnRzIFJlc291cmNlTG9hZGVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmczogRmlsZVN5c3RlbSkge31cbiAgY2FuUHJlbG9hZCA9IGZhbHNlO1xuICBwcmVsb2FkKCk6IHVuZGVmaW5lZHxQcm9taXNlPHZvaWQ+IHsgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQuJyk7IH1cbiAgbG9hZCh1cmw6IHN0cmluZyk6IHN0cmluZyB7IHJldHVybiB0aGlzLmZzLnJlYWRGaWxlKHJlc29sdmUodXJsKSk7IH1cbiAgcmVzb2x2ZSh1cmw6IHN0cmluZywgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHJlc29sdmUoZGlybmFtZShhYnNvbHV0ZUZyb20oY29udGFpbmluZ0ZpbGUpKSwgdXJsKTtcbiAgfVxufVxuXG4vKipcbiAqIFRoaXMgQW5hbHl6ZXIgd2lsbCBhbmFseXplIHRoZSBmaWxlcyB0aGF0IGhhdmUgZGVjb3JhdGVkIGNsYXNzZXMgdGhhdCBuZWVkIHRvIGJlIHRyYW5zZm9ybWVkLlxuICovXG5leHBvcnQgY2xhc3MgRGVjb3JhdGlvbkFuYWx5emVyIHtcbiAgcHJpdmF0ZSBwcm9ncmFtID0gdGhpcy5idW5kbGUuc3JjLnByb2dyYW07XG4gIHByaXZhdGUgb3B0aW9ucyA9IHRoaXMuYnVuZGxlLnNyYy5vcHRpb25zO1xuICBwcml2YXRlIGhvc3QgPSB0aGlzLmJ1bmRsZS5zcmMuaG9zdDtcbiAgcHJpdmF0ZSB0eXBlQ2hlY2tlciA9IHRoaXMuYnVuZGxlLnNyYy5wcm9ncmFtLmdldFR5cGVDaGVja2VyKCk7XG4gIHByaXZhdGUgcm9vdERpcnMgPSB0aGlzLmJ1bmRsZS5yb290RGlycztcbiAgcHJpdmF0ZSBwYWNrYWdlUGF0aCA9IHRoaXMuYnVuZGxlLmVudHJ5UG9pbnQucGFja2FnZTtcbiAgcHJpdmF0ZSBpc0NvcmUgPSB0aGlzLmJ1bmRsZS5pc0NvcmU7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBOZ01vZHVsZSBkZWNsYXJhdGlvbnMgdG8gdGhlIHJlLWV4cG9ydHMgZm9yIHRoYXQgTmdNb2R1bGUuXG4gICAqL1xuICBwcml2YXRlIHJlZXhwb3J0TWFwID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgTWFwPHN0cmluZywgW3N0cmluZywgc3RyaW5nXT4+KCk7XG4gIHJlc291cmNlTWFuYWdlciA9IG5ldyBOZ2NjUmVzb3VyY2VMb2FkZXIodGhpcy5mcyk7XG4gIG1ldGFSZWdpc3RyeSA9IG5ldyBMb2NhbE1ldGFkYXRhUmVnaXN0cnkoKTtcbiAgZHRzTWV0YVJlYWRlciA9IG5ldyBEdHNNZXRhZGF0YVJlYWRlcih0aGlzLnR5cGVDaGVja2VyLCB0aGlzLnJlZmxlY3Rpb25Ib3N0KTtcbiAgZnVsbE1ldGFSZWFkZXIgPSBuZXcgQ29tcG91bmRNZXRhZGF0YVJlYWRlcihbdGhpcy5tZXRhUmVnaXN0cnksIHRoaXMuZHRzTWV0YVJlYWRlcl0pO1xuICByZWZFbWl0dGVyID0gbmV3IFJlZmVyZW5jZUVtaXR0ZXIoW1xuICAgIG5ldyBMb2NhbElkZW50aWZpZXJTdHJhdGVneSgpLFxuICAgIG5ldyBBYnNvbHV0ZU1vZHVsZVN0cmF0ZWd5KFxuICAgICAgICB0aGlzLnByb2dyYW0sIHRoaXMudHlwZUNoZWNrZXIsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0LCB0aGlzLnJlZmxlY3Rpb25Ib3N0KSxcbiAgICAvLyBUT0RPKGFseGh1Yik6IHRoZXJlJ3Mgbm8gcmVhc29uIHdoeSBuZ2NjIG5lZWRzIHRoZSBcImxvZ2ljYWwgZmlsZSBzeXN0ZW1cIiBsb2dpYyBoZXJlLCBhcyBuZ2NjXG4gICAgLy8gcHJvamVjdHMgb25seSBldmVyIGhhdmUgb25lIHJvb3REaXIuIEluc3RlYWQsIG5nY2Mgc2hvdWxkIGp1c3Qgc3dpdGNoIGl0cyBlbWl0dGVkIGltcG9ydFxuICAgIC8vIGJhc2VkIG9uIHdoZXRoZXIgYSBiZXN0R3Vlc3NPd25pbmdNb2R1bGUgaXMgcHJlc2VudCBpbiB0aGUgUmVmZXJlbmNlLlxuICAgIG5ldyBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5KHRoaXMucmVmbGVjdGlvbkhvc3QsIG5ldyBMb2dpY2FsRmlsZVN5c3RlbSh0aGlzLnJvb3REaXJzKSksXG4gIF0pO1xuICBhbGlhc2luZ0hvc3QgPSB0aGlzLmJ1bmRsZS5lbnRyeVBvaW50LmdlbmVyYXRlRGVlcFJlZXhwb3J0cz9cbiAgICAgICAgICAgICAgICAgbmV3IFByaXZhdGVFeHBvcnRBbGlhc2luZ0hvc3QodGhpcy5yZWZsZWN0aW9uSG9zdCk6IG51bGw7XG4gIGR0c01vZHVsZVNjb3BlUmVzb2x2ZXIgPVxuICAgICAgbmV3IE1ldGFkYXRhRHRzTW9kdWxlU2NvcGVSZXNvbHZlcih0aGlzLmR0c01ldGFSZWFkZXIsIHRoaXMuYWxpYXNpbmdIb3N0KTtcbiAgc2NvcGVSZWdpc3RyeSA9IG5ldyBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnkoXG4gICAgICB0aGlzLm1ldGFSZWdpc3RyeSwgdGhpcy5kdHNNb2R1bGVTY29wZVJlc29sdmVyLCB0aGlzLnJlZkVtaXR0ZXIsIHRoaXMuYWxpYXNpbmdIb3N0KTtcbiAgZnVsbFJlZ2lzdHJ5ID0gbmV3IENvbXBvdW5kTWV0YWRhdGFSZWdpc3RyeShbdGhpcy5tZXRhUmVnaXN0cnksIHRoaXMuc2NvcGVSZWdpc3RyeV0pO1xuICBldmFsdWF0b3IgPSBuZXcgUGFydGlhbEV2YWx1YXRvcih0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLnR5cGVDaGVja2VyKTtcbiAgbW9kdWxlUmVzb2x2ZXIgPSBuZXcgTW9kdWxlUmVzb2x2ZXIodGhpcy5wcm9ncmFtLCB0aGlzLm9wdGlvbnMsIHRoaXMuaG9zdCk7XG4gIGltcG9ydEdyYXBoID0gbmV3IEltcG9ydEdyYXBoKHRoaXMubW9kdWxlUmVzb2x2ZXIpO1xuICBjeWNsZUFuYWx5emVyID0gbmV3IEN5Y2xlQW5hbHl6ZXIodGhpcy5pbXBvcnRHcmFwaCk7XG4gIGhhbmRsZXJzOiBEZWNvcmF0b3JIYW5kbGVyPGFueSwgYW55PltdID0gW1xuICAgIG5ldyBDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICB0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmV2YWx1YXRvciwgdGhpcy5mdWxsUmVnaXN0cnksIHRoaXMuZnVsbE1ldGFSZWFkZXIsXG4gICAgICAgIHRoaXMuc2NvcGVSZWdpc3RyeSwgdGhpcy5zY29wZVJlZ2lzdHJ5LCB0aGlzLmlzQ29yZSwgdGhpcy5yZXNvdXJjZU1hbmFnZXIsIHRoaXMucm9vdERpcnMsXG4gICAgICAgIC8qIGRlZmF1bHRQcmVzZXJ2ZVdoaXRlc3BhY2VzICovIGZhbHNlLFxuICAgICAgICAvKiBpMThuVXNlRXh0ZXJuYWxJZHMgKi8gdHJ1ZSwgdGhpcy5idW5kbGUuZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdCxcbiAgICAgICAgdGhpcy5tb2R1bGVSZXNvbHZlciwgdGhpcy5jeWNsZUFuYWx5emVyLCB0aGlzLnJlZkVtaXR0ZXIsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsXG4gICAgICAgIC8qIGFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyICovIGZhbHNlKSxcbiAgICBuZXcgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgdGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5ldmFsdWF0b3IsIHRoaXMuZnVsbFJlZ2lzdHJ5LCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSLFxuICAgICAgICB0aGlzLmlzQ29yZSwgLyogYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIgKi8gZmFsc2UpLFxuICAgIC8vIFBpcGUgaGFuZGxlciBtdXN0IGJlIGJlZm9yZSBpbmplY3RhYmxlIGhhbmRsZXIgaW4gbGlzdCBzbyBwaXBlIGZhY3RvcmllcyBhcmUgcHJpbnRlZFxuICAgIC8vIGJlZm9yZSBpbmplY3RhYmxlIGZhY3RvcmllcyAoc28gaW5qZWN0YWJsZSBmYWN0b3JpZXMgY2FuIGRlbGVnYXRlIHRvIHRoZW0pXG4gICAgbmV3IFBpcGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICB0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmV2YWx1YXRvciwgdGhpcy5tZXRhUmVnaXN0cnksIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsXG4gICAgICAgIHRoaXMuaXNDb3JlKSxcbiAgICBuZXcgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsIHRoaXMuaXNDb3JlLFxuICAgICAgICAvKiBzdHJpY3RDdG9yRGVwcyAqLyBmYWxzZSwgLyogZXJyb3JPbkR1cGxpY2F0ZVByb3YgKi8gZmFsc2UpLFxuICAgIG5ldyBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLmZ1bGxNZXRhUmVhZGVyLCB0aGlzLmZ1bGxSZWdpc3RyeSxcbiAgICAgICAgdGhpcy5zY29wZVJlZ2lzdHJ5LCB0aGlzLnJlZmVyZW5jZXNSZWdpc3RyeSwgdGhpcy5pc0NvcmUsIC8qIHJvdXRlQW5hbHl6ZXIgKi8gbnVsbCxcbiAgICAgICAgdGhpcy5yZWZFbWl0dGVyLCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSLCAvKiBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlciAqLyBmYWxzZSksXG4gIF07XG4gIG1pZ3JhdGlvbnM6IE1pZ3JhdGlvbltdID0gW1xuICAgIG5ldyBVbmRlY29yYXRlZFBhcmVudE1pZ3JhdGlvbigpLFxuICAgIG5ldyBVbmRlY29yYXRlZENoaWxkTWlncmF0aW9uKCksXG4gICAgbmV3IE1pc3NpbmdJbmplY3RhYmxlTWlncmF0aW9uKCksXG4gIF07XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGZzOiBGaWxlU3lzdGVtLCBwcml2YXRlIGJ1bmRsZTogRW50cnlQb2ludEJ1bmRsZSxcbiAgICAgIHByaXZhdGUgcmVmbGVjdGlvbkhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgZGlhZ25vc3RpY0hhbmRsZXI6IChlcnJvcjogdHMuRGlhZ25vc3RpYykgPT4gdm9pZCA9ICgpID0+IHt9KSB7fVxuXG4gIC8qKlxuICAgKiBBbmFseXplIGEgcHJvZ3JhbSB0byBmaW5kIGFsbCB0aGUgZGVjb3JhdGVkIGZpbGVzIHNob3VsZCBiZSB0cmFuc2Zvcm1lZC5cbiAgICpcbiAgICogQHJldHVybnMgYSBtYXAgb2YgdGhlIHNvdXJjZSBmaWxlcyB0byB0aGUgYW5hbHlzaXMgZm9yIHRob3NlIGZpbGVzLlxuICAgKi9cbiAgYW5hbHl6ZVByb2dyYW0oKTogRGVjb3JhdGlvbkFuYWx5c2VzIHtcbiAgICBjb25zdCBkZWNvcmF0aW9uQW5hbHlzZXMgPSBuZXcgRGVjb3JhdGlvbkFuYWx5c2VzKCk7XG4gICAgY29uc3QgYW5hbHl6ZWRGaWxlcyA9IHRoaXMucHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKHNvdXJjZUZpbGUgPT4gaXNXaXRoaW5QYWNrYWdlKHRoaXMucGFja2FnZVBhdGgsIHNvdXJjZUZpbGUpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChzb3VyY2VGaWxlID0+IHRoaXMuYW5hbHl6ZUZpbGUoc291cmNlRmlsZSkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGlzRGVmaW5lZCk7XG5cbiAgICB0aGlzLmFwcGx5TWlncmF0aW9ucyhhbmFseXplZEZpbGVzKTtcblxuICAgIGFuYWx5emVkRmlsZXMuZm9yRWFjaChhbmFseXplZEZpbGUgPT4gdGhpcy5yZXNvbHZlRmlsZShhbmFseXplZEZpbGUpKTtcbiAgICBjb25zdCBjb21waWxlZEZpbGVzID0gYW5hbHl6ZWRGaWxlcy5tYXAoYW5hbHl6ZWRGaWxlID0+IHRoaXMuY29tcGlsZUZpbGUoYW5hbHl6ZWRGaWxlKSk7XG4gICAgY29tcGlsZWRGaWxlcy5mb3JFYWNoKFxuICAgICAgICBjb21waWxlZEZpbGUgPT4gZGVjb3JhdGlvbkFuYWx5c2VzLnNldChjb21waWxlZEZpbGUuc291cmNlRmlsZSwgY29tcGlsZWRGaWxlKSk7XG4gICAgcmV0dXJuIGRlY29yYXRpb25BbmFseXNlcztcbiAgfVxuXG4gIHByb3RlY3RlZCBhbmFseXplRmlsZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogQW5hbHl6ZWRGaWxlfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgYW5hbHl6ZWRDbGFzc2VzID0gdGhpcy5yZWZsZWN0aW9uSG9zdC5maW5kQ2xhc3NTeW1ib2xzKHNvdXJjZUZpbGUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoc3ltYm9sID0+IHRoaXMuYW5hbHl6ZUNsYXNzKHN5bWJvbCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoaXNEZWZpbmVkKTtcbiAgICByZXR1cm4gYW5hbHl6ZWRDbGFzc2VzLmxlbmd0aCA/IHtzb3VyY2VGaWxlLCBhbmFseXplZENsYXNzZXN9IDogdW5kZWZpbmVkO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFuYWx5emVDbGFzcyhzeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IEFuYWx5emVkQ2xhc3N8bnVsbCB7XG4gICAgY29uc3QgZGVjb3JhdG9ycyA9IHRoaXMucmVmbGVjdGlvbkhvc3QuZ2V0RGVjb3JhdG9yc09mU3ltYm9sKHN5bWJvbCk7XG4gICAgY29uc3QgYW5hbHl6ZWRDbGFzcyA9IGFuYWx5emVEZWNvcmF0b3JzKHN5bWJvbCwgZGVjb3JhdG9ycywgdGhpcy5oYW5kbGVycyk7XG4gICAgaWYgKGFuYWx5emVkQ2xhc3MgIT09IG51bGwgJiYgYW5hbHl6ZWRDbGFzcy5kaWFnbm9zdGljcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBmb3IgKGNvbnN0IGRpYWdub3N0aWMgb2YgYW5hbHl6ZWRDbGFzcy5kaWFnbm9zdGljcykge1xuICAgICAgICB0aGlzLmRpYWdub3N0aWNIYW5kbGVyKGRpYWdub3N0aWMpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYW5hbHl6ZWRDbGFzcztcbiAgfVxuXG4gIHByb3RlY3RlZCBhcHBseU1pZ3JhdGlvbnMoYW5hbHl6ZWRGaWxlczogQW5hbHl6ZWRGaWxlW10pOiB2b2lkIHtcbiAgICBjb25zdCBtaWdyYXRpb25Ib3N0ID0gbmV3IERlZmF1bHRNaWdyYXRpb25Ib3N0KFxuICAgICAgICB0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmZ1bGxNZXRhUmVhZGVyLCB0aGlzLmV2YWx1YXRvciwgdGhpcy5oYW5kbGVycyxcbiAgICAgICAgdGhpcy5idW5kbGUuZW50cnlQb2ludC5wYXRoLCBhbmFseXplZEZpbGVzKTtcblxuICAgIHRoaXMubWlncmF0aW9ucy5mb3JFYWNoKG1pZ3JhdGlvbiA9PiB7XG4gICAgICBhbmFseXplZEZpbGVzLmZvckVhY2goYW5hbHl6ZWRGaWxlID0+IHtcbiAgICAgICAgYW5hbHl6ZWRGaWxlLmFuYWx5emVkQ2xhc3Nlcy5mb3JFYWNoKCh7ZGVjbGFyYXRpb259KSA9PiB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IG1pZ3JhdGlvbi5hcHBseShkZWNsYXJhdGlvbiwgbWlncmF0aW9uSG9zdCk7XG4gICAgICAgICAgICBpZiAocmVzdWx0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHRoaXMuZGlhZ25vc3RpY0hhbmRsZXIocmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBpZiAoaXNGYXRhbERpYWdub3N0aWNFcnJvcihlKSkge1xuICAgICAgICAgICAgICB0aGlzLmRpYWdub3N0aWNIYW5kbGVyKGUudG9EaWFnbm9zdGljKCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgY29tcGlsZUZpbGUoYW5hbHl6ZWRGaWxlOiBBbmFseXplZEZpbGUpOiBDb21waWxlZEZpbGUge1xuICAgIGNvbnN0IGNvbnN0YW50UG9vbCA9IG5ldyBDb25zdGFudFBvb2woKTtcbiAgICBjb25zdCBjb21waWxlZENsYXNzZXM6IENvbXBpbGVkQ2xhc3NbXSA9IGFuYWx5emVkRmlsZS5hbmFseXplZENsYXNzZXMubWFwKGFuYWx5emVkQ2xhc3MgPT4ge1xuICAgICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmNvbXBpbGVDbGFzcyhhbmFseXplZENsYXNzLCBjb25zdGFudFBvb2wpO1xuICAgICAgY29uc3QgZGVjbGFyYXRpb24gPSBhbmFseXplZENsYXNzLmRlY2xhcmF0aW9uO1xuICAgICAgY29uc3QgcmVleHBvcnRzOiBSZWV4cG9ydFtdID0gdGhpcy5nZXRSZWV4cG9ydHNGb3JDbGFzcyhkZWNsYXJhdGlvbik7XG4gICAgICByZXR1cm4gey4uLmFuYWx5emVkQ2xhc3MsIGNvbXBpbGF0aW9uLCByZWV4cG9ydHN9O1xuICAgIH0pO1xuICAgIHJldHVybiB7Y29uc3RhbnRQb29sLCBzb3VyY2VGaWxlOiBhbmFseXplZEZpbGUuc291cmNlRmlsZSwgY29tcGlsZWRDbGFzc2VzfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBjb21waWxlQ2xhc3MoY2xheno6IEFuYWx5emVkQ2xhc3MsIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sKTogQ29tcGlsZVJlc3VsdFtdIHtcbiAgICBjb25zdCBjb21waWxhdGlvbnM6IENvbXBpbGVSZXN1bHRbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qge2hhbmRsZXIsIGFuYWx5c2lzfSBvZiBjbGF6ei5tYXRjaGVzKSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBoYW5kbGVyLmNvbXBpbGUoY2xhenouZGVjbGFyYXRpb24sIGFuYWx5c2lzLCBjb25zdGFudFBvb2wpO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVzdWx0KSkge1xuICAgICAgICByZXN1bHQuZm9yRWFjaChjdXJyZW50ID0+IHtcbiAgICAgICAgICBpZiAoIWNvbXBpbGF0aW9ucy5zb21lKGNvbXBpbGF0aW9uID0+IGNvbXBpbGF0aW9uLm5hbWUgPT09IGN1cnJlbnQubmFtZSkpIHtcbiAgICAgICAgICAgIGNvbXBpbGF0aW9ucy5wdXNoKGN1cnJlbnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKCFjb21waWxhdGlvbnMuc29tZShjb21waWxhdGlvbiA9PiBjb21waWxhdGlvbi5uYW1lID09PSByZXN1bHQubmFtZSkpIHtcbiAgICAgICAgY29tcGlsYXRpb25zLnB1c2gocmVzdWx0KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNvbXBpbGF0aW9ucztcbiAgfVxuXG4gIHByb3RlY3RlZCByZXNvbHZlRmlsZShhbmFseXplZEZpbGU6IEFuYWx5emVkRmlsZSk6IHZvaWQge1xuICAgIGFuYWx5emVkRmlsZS5hbmFseXplZENsYXNzZXMuZm9yRWFjaCgoe2RlY2xhcmF0aW9uLCBtYXRjaGVzfSkgPT4ge1xuICAgICAgbWF0Y2hlcy5mb3JFYWNoKCh7aGFuZGxlciwgYW5hbHlzaXN9KSA9PiB7XG4gICAgICAgIGlmICgoaGFuZGxlci5yZXNvbHZlICE9PSB1bmRlZmluZWQpICYmIGFuYWx5c2lzKSB7XG4gICAgICAgICAgY29uc3Qge3JlZXhwb3J0cywgZGlhZ25vc3RpY3N9ID0gaGFuZGxlci5yZXNvbHZlKGRlY2xhcmF0aW9uLCBhbmFseXNpcyk7XG4gICAgICAgICAgaWYgKHJlZXhwb3J0cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLmFkZFJlZXhwb3J0cyhyZWV4cG9ydHMsIGRlY2xhcmF0aW9uKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGRpYWdub3N0aWNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGRpYWdub3N0aWNzLmZvckVhY2goZXJyb3IgPT4gdGhpcy5kaWFnbm9zdGljSGFuZGxlcihlcnJvcikpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGdldFJlZXhwb3J0c0ZvckNsYXNzKGRlY2xhcmF0aW9uOiBDbGFzc0RlY2xhcmF0aW9uPHRzLkRlY2xhcmF0aW9uPikge1xuICAgIGNvbnN0IHJlZXhwb3J0czogUmVleHBvcnRbXSA9IFtdO1xuICAgIGlmICh0aGlzLnJlZXhwb3J0TWFwLmhhcyhkZWNsYXJhdGlvbikpIHtcbiAgICAgIHRoaXMucmVleHBvcnRNYXAuZ2V0KGRlY2xhcmF0aW9uKSAhLmZvckVhY2goKFtmcm9tTW9kdWxlLCBzeW1ib2xOYW1lXSwgYXNBbGlhcykgPT4ge1xuICAgICAgICByZWV4cG9ydHMucHVzaCh7YXNBbGlhcywgZnJvbU1vZHVsZSwgc3ltYm9sTmFtZX0pO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiByZWV4cG9ydHM7XG4gIH1cblxuICBwcml2YXRlIGFkZFJlZXhwb3J0cyhyZWV4cG9ydHM6IFJlZXhwb3J0W10sIGRlY2xhcmF0aW9uOiBDbGFzc0RlY2xhcmF0aW9uPHRzLkRlY2xhcmF0aW9uPikge1xuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBbc3RyaW5nLCBzdHJpbmddPigpO1xuICAgIGZvciAoY29uc3QgcmVleHBvcnQgb2YgcmVleHBvcnRzKSB7XG4gICAgICBtYXAuc2V0KHJlZXhwb3J0LmFzQWxpYXMsIFtyZWV4cG9ydC5mcm9tTW9kdWxlLCByZWV4cG9ydC5zeW1ib2xOYW1lXSk7XG4gICAgfVxuICAgIHRoaXMucmVleHBvcnRNYXAuc2V0KGRlY2xhcmF0aW9uLCBtYXApO1xuICB9XG59XG4iXX0=