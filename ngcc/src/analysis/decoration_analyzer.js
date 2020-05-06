(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/analysis/decoration_analyzer", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngtsc/cycles", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/scope", "@angular/compiler-cli/ngcc/src/migrations/missing_injectable_migration", "@angular/compiler-cli/ngcc/src/migrations/undecorated_child_migration", "@angular/compiler-cli/ngcc/src/migrations/undecorated_parent_migration", "@angular/compiler-cli/ngcc/src/analysis/migration_host", "@angular/compiler-cli/ngcc/src/analysis/ngcc_trait_compiler", "@angular/compiler-cli/ngcc/src/analysis/types", "@angular/compiler-cli/ngcc/src/analysis/util"], factory);
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
    var migration_host_1 = require("@angular/compiler-cli/ngcc/src/analysis/migration_host");
    var ngcc_trait_compiler_1 = require("@angular/compiler-cli/ngcc/src/analysis/ngcc_trait_compiler");
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
        NgccResourceLoader.prototype.preload = function () {
            throw new Error('Not implemented.');
        };
        NgccResourceLoader.prototype.load = function (url) {
            return this.fs.readFile(file_system_1.resolve(url));
        };
        NgccResourceLoader.prototype.resolve = function (url, containingFile) {
            return file_system_1.resolve(file_system_1.dirname(file_system_1.absoluteFrom(containingFile)), url);
        };
        return NgccResourceLoader;
    }());
    /**
     * This Analyzer will analyze the files that have decorated classes that need to be transformed.
     */
    var DecorationAnalyzer = /** @class */ (function () {
        function DecorationAnalyzer(fs, bundle, reflectionHost, referencesRegistry, diagnosticHandler, tsConfig) {
            if (diagnosticHandler === void 0) { diagnosticHandler = function () { }; }
            if (tsConfig === void 0) { tsConfig = null; }
            this.fs = fs;
            this.bundle = bundle;
            this.reflectionHost = reflectionHost;
            this.referencesRegistry = referencesRegistry;
            this.diagnosticHandler = diagnosticHandler;
            this.tsConfig = tsConfig;
            this.program = this.bundle.src.program;
            this.options = this.bundle.src.options;
            this.host = this.bundle.src.host;
            this.typeChecker = this.bundle.src.program.getTypeChecker();
            this.rootDirs = this.bundle.rootDirs;
            this.packagePath = this.bundle.entryPoint.package;
            this.isCore = this.bundle.isCore;
            this.compilerOptions = this.tsConfig !== null ? this.tsConfig.options : {};
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
                new imports_1.LogicalProjectStrategy(this.reflectionHost, new file_system_1.LogicalFileSystem(this.rootDirs, this.host)),
            ]);
            this.aliasingHost = this.bundle.entryPoint.generateDeepReexports ?
                new imports_1.PrivateExportAliasingHost(this.reflectionHost) :
                null;
            this.dtsModuleScopeResolver = new scope_1.MetadataDtsModuleScopeResolver(this.dtsMetaReader, this.aliasingHost);
            this.scopeRegistry = new scope_1.LocalModuleScopeRegistry(this.metaRegistry, this.dtsModuleScopeResolver, this.refEmitter, this.aliasingHost);
            this.fullRegistry = new metadata_1.CompoundMetadataRegistry([this.metaRegistry, this.scopeRegistry]);
            this.evaluator = new partial_evaluator_1.PartialEvaluator(this.reflectionHost, this.typeChecker, /* dependencyTracker */ null);
            this.importGraph = new cycles_1.ImportGraph(this.moduleResolver);
            this.cycleAnalyzer = new cycles_1.CycleAnalyzer(this.importGraph);
            this.injectableRegistry = new metadata_1.InjectableClassRegistry(this.reflectionHost);
            this.handlers = [
                new annotations_1.ComponentDecoratorHandler(this.reflectionHost, this.evaluator, this.fullRegistry, this.fullMetaReader, this.scopeRegistry, this.scopeRegistry, this.isCore, this.resourceManager, this.rootDirs, !!this.compilerOptions.preserveWhitespaces, 
                /* i18nUseExternalIds */ true, this.bundle.enableI18nLegacyMessageIdFormat, 
                /* i18nNormalizeLineEndingsInICUs */ false, this.moduleResolver, this.cycleAnalyzer, this.refEmitter, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, util_1.NOOP_DEPENDENCY_TRACKER, this.injectableRegistry, /* annotateForClosureCompiler */ false),
                // See the note in ngtsc about why this cast is needed.
                // clang-format off
                new annotations_1.DirectiveDecoratorHandler(this.reflectionHost, this.evaluator, this.fullRegistry, this.scopeRegistry, this.fullMetaReader, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, this.injectableRegistry, this.isCore, 
                /* annotateForClosureCompiler */ false, 
                // In ngcc we want to compile undecorated classes with Angular features. As of
                // version 10, undecorated classes that use Angular features are no longer handled
                // in ngtsc, but we want to ensure compatibility in ngcc for outdated libraries that
                // have not migrated to explicit decorators. See: https://hackmd.io/@alx/ryfYYuvzH.
                /* compileUndecoratedClassesWithAngularFeatures */ true),
                // clang-format on
                // Pipe handler must be before injectable handler in list so pipe factories are printed
                // before injectable factories (so injectable factories can delegate to them)
                new annotations_1.PipeDecoratorHandler(this.reflectionHost, this.evaluator, this.metaRegistry, this.scopeRegistry, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, this.injectableRegistry, this.isCore),
                new annotations_1.InjectableDecoratorHandler(this.reflectionHost, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, this.isCore, 
                /* strictCtorDeps */ false, this.injectableRegistry, /* errorOnDuplicateProv */ false),
                new annotations_1.NgModuleDecoratorHandler(this.reflectionHost, this.evaluator, this.fullMetaReader, this.fullRegistry, this.scopeRegistry, this.referencesRegistry, this.isCore, /* routeAnalyzer */ null, this.refEmitter, 
                /* factoryTracker */ null, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, 
                /* annotateForClosureCompiler */ false, this.injectableRegistry),
            ];
            this.compiler = new ngcc_trait_compiler_1.NgccTraitCompiler(this.handlers, this.reflectionHost);
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
            var e_1, _a, e_2, _b;
            try {
                for (var _c = tslib_1.__values(this.program.getSourceFiles()), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var sourceFile = _d.value;
                    if (!sourceFile.isDeclarationFile && util_1.isWithinPackage(this.packagePath, sourceFile)) {
                        this.compiler.analyzeFile(sourceFile);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_1) throw e_1.error; }
            }
            this.applyMigrations();
            this.compiler.resolve();
            this.reportDiagnostics();
            var decorationAnalyses = new types_1.DecorationAnalyses();
            try {
                for (var _e = tslib_1.__values(this.compiler.analyzedFiles), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var analyzedFile = _f.value;
                    var compiledFile = this.compileFile(analyzedFile);
                    decorationAnalyses.set(compiledFile.sourceFile, compiledFile);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return decorationAnalyses;
        };
        DecorationAnalyzer.prototype.applyMigrations = function () {
            var _this = this;
            var migrationHost = new migration_host_1.DefaultMigrationHost(this.reflectionHost, this.fullMetaReader, this.evaluator, this.compiler, this.bundle.entryPoint.path);
            this.migrations.forEach(function (migration) {
                _this.compiler.analyzedFiles.forEach(function (analyzedFile) {
                    var records = _this.compiler.recordsFor(analyzedFile);
                    if (records === null) {
                        throw new Error('Assertion error: file to migrate must have records.');
                    }
                    records.forEach(function (record) {
                        var addDiagnostic = function (diagnostic) {
                            if (record.metaDiagnostics === null) {
                                record.metaDiagnostics = [];
                            }
                            record.metaDiagnostics.push(diagnostic);
                        };
                        try {
                            var result = migration.apply(record.node, migrationHost);
                            if (result !== null) {
                                addDiagnostic(result);
                            }
                        }
                        catch (e) {
                            if (diagnostics_1.isFatalDiagnosticError(e)) {
                                addDiagnostic(e.toDiagnostic());
                            }
                            else {
                                throw e;
                            }
                        }
                    });
                });
            });
        };
        DecorationAnalyzer.prototype.reportDiagnostics = function () {
            this.compiler.diagnostics.forEach(this.diagnosticHandler);
        };
        DecorationAnalyzer.prototype.compileFile = function (sourceFile) {
            var e_3, _a;
            var constantPool = new compiler_1.ConstantPool();
            var records = this.compiler.recordsFor(sourceFile);
            if (records === null) {
                throw new Error('Assertion error: file to compile must have records.');
            }
            var compiledClasses = [];
            try {
                for (var records_1 = tslib_1.__values(records), records_1_1 = records_1.next(); !records_1_1.done; records_1_1 = records_1.next()) {
                    var record = records_1_1.value;
                    var compilation = this.compiler.compile(record.node, constantPool);
                    if (compilation === null) {
                        continue;
                    }
                    compiledClasses.push({
                        name: record.node.name.text,
                        decorators: this.compiler.getAllDecorators(record.node),
                        declaration: record.node,
                        compilation: compilation
                    });
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (records_1_1 && !records_1_1.done && (_a = records_1.return)) _a.call(records_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
            var reexports = this.getReexportsForSourceFile(sourceFile);
            return { constantPool: constantPool, sourceFile: sourceFile, compiledClasses: compiledClasses, reexports: reexports };
        };
        DecorationAnalyzer.prototype.getReexportsForSourceFile = function (sf) {
            var exportStatements = this.compiler.exportStatements;
            if (!exportStatements.has(sf.fileName)) {
                return [];
            }
            var exports = exportStatements.get(sf.fileName);
            var reexports = [];
            exports.forEach(function (_a, asAlias) {
                var _b = tslib_1.__read(_a, 2), fromModule = _b[0], symbolName = _b[1];
                reexports.push({ asAlias: asAlias, fromModule: fromModule, symbolName: symbolName });
            });
            return reexports;
        };
        return DecorationAnalyzer;
    }());
    exports.DecorationAnalyzer = DecorationAnalyzer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbl9hbmFseXplci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9hbmFseXNpcy9kZWNvcmF0aW9uX2FuYWx5emVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUErQztJQUkvQywyRUFBb047SUFDcE4saUVBQXFFO0lBQ3JFLDJFQUFzRTtJQUN0RSwyRUFBNkc7SUFDN0csbUVBQXdOO0lBQ3hOLHFFQUFnSztJQUNoSyx1RkFBc0U7SUFDdEUsK0RBQWtHO0lBSWxHLHVIQUFzRjtJQUN0RixxSEFBb0Y7SUFDcEYsdUhBQXNGO0lBR3RGLHlGQUFzRDtJQUN0RCxtR0FBd0Q7SUFDeEQsdUVBQXdFO0lBQ3hFLHFFQUFnRTtJQUloRTs7T0FFRztJQUNIO1FBQ0UsNEJBQW9CLEVBQWM7WUFBZCxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQ2xDLGVBQVUsR0FBRyxLQUFLLENBQUM7UUFEa0IsQ0FBQztRQUV0QyxvQ0FBTyxHQUFQO1lBQ0UsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3RDLENBQUM7UUFDRCxpQ0FBSSxHQUFKLFVBQUssR0FBVztZQUNkLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMscUJBQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLENBQUM7UUFDRCxvQ0FBTyxHQUFQLFVBQVEsR0FBVyxFQUFFLGNBQXNCO1lBQ3pDLE9BQU8scUJBQU8sQ0FBQyxxQkFBTyxDQUFDLDBCQUFZLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM3RCxDQUFDO1FBQ0gseUJBQUM7SUFBRCxDQUFDLEFBWkQsSUFZQztJQUVEOztPQUVHO0lBQ0g7UUFtRkUsNEJBQ1ksRUFBYyxFQUFVLE1BQXdCLEVBQ2hE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O3dCQUN4QixXQUFXLGFBQUE7cUJBQ1osQ0FBQyxDQUFDO2lCQUNKOzs7Ozs7Ozs7WUFFRCxJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDN0QsT0FBTyxFQUFDLFlBQVksY0FBQSxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsZUFBZSxpQkFBQSxFQUFFLFNBQVMsV0FBQSxFQUFDLENBQUM7UUFDNUUsQ0FBQztRQUVPLHNEQUF5QixHQUFqQyxVQUFrQyxFQUFpQjtZQUNqRCxJQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUM7WUFDeEQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQ3RDLE9BQU8sRUFBRSxDQUFDO2FBQ1g7WUFDRCxJQUFNLE9BQU8sR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBRSxDQUFDO1lBRW5ELElBQU0sU0FBUyxHQUFlLEVBQUUsQ0FBQztZQUNqQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQUMsRUFBd0IsRUFBRSxPQUFPO29CQUFqQywwQkFBd0IsRUFBdkIsa0JBQVUsRUFBRSxrQkFBVTtnQkFDdEMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFDLE9BQU8sU0FBQSxFQUFFLFVBQVUsWUFBQSxFQUFFLFVBQVUsWUFBQSxFQUFDLENBQUMsQ0FBQztZQUNwRCxDQUFDLENBQUMsQ0FBQztZQUNILE9BQU8sU0FBUyxDQUFDO1FBQ25CLENBQUM7UUFDSCx5QkFBQztJQUFELENBQUMsQUFwTUQsSUFvTUM7SUFwTVksZ0RBQWtCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtDb25zdGFudFBvb2x9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1BhcnNlZENvbmZpZ3VyYXRpb259IGZyb20gJy4uLy4uLy4uJztcbmltcG9ydCB7Q29tcG9uZW50RGVjb3JhdG9ySGFuZGxlciwgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlciwgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIsIE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlciwgUGlwZURlY29yYXRvckhhbmRsZXIsIFJlZmVyZW5jZXNSZWdpc3RyeSwgUmVzb3VyY2VMb2FkZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucyc7XG5pbXBvcnQge0N5Y2xlQW5hbHl6ZXIsIEltcG9ydEdyYXBofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvY3ljbGVzJztcbmltcG9ydCB7aXNGYXRhbERpYWdub3N0aWNFcnJvcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2RpYWdub3N0aWNzJztcbmltcG9ydCB7YWJzb2x1dGVGcm9tLCBkaXJuYW1lLCBGaWxlU3lzdGVtLCBMb2dpY2FsRmlsZVN5c3RlbSwgcmVzb2x2ZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7QWJzb2x1dGVNb2R1bGVTdHJhdGVneSwgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3ksIExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3ksIE1vZHVsZVJlc29sdmVyLCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSLCBQcml2YXRlRXhwb3J0QWxpYXNpbmdIb3N0LCBSZWV4cG9ydCwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ltcG9ydHMnO1xuaW1wb3J0IHtDb21wb3VuZE1ldGFkYXRhUmVhZGVyLCBDb21wb3VuZE1ldGFkYXRhUmVnaXN0cnksIER0c01ldGFkYXRhUmVhZGVyLCBJbmplY3RhYmxlQ2xhc3NSZWdpc3RyeSwgTG9jYWxNZXRhZGF0YVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvbWV0YWRhdGEnO1xuaW1wb3J0IHtQYXJ0aWFsRXZhbHVhdG9yfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksIE1ldGFkYXRhRHRzTW9kdWxlU2NvcGVSZXNvbHZlcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3Njb3BlJztcbmltcG9ydCB7RGVjb3JhdG9ySGFuZGxlcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3RyYW5zZm9ybSc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtNaWdyYXRpb259IGZyb20gJy4uL21pZ3JhdGlvbnMvbWlncmF0aW9uJztcbmltcG9ydCB7TWlzc2luZ0luamVjdGFibGVNaWdyYXRpb259IGZyb20gJy4uL21pZ3JhdGlvbnMvbWlzc2luZ19pbmplY3RhYmxlX21pZ3JhdGlvbic7XG5pbXBvcnQge1VuZGVjb3JhdGVkQ2hpbGRNaWdyYXRpb259IGZyb20gJy4uL21pZ3JhdGlvbnMvdW5kZWNvcmF0ZWRfY2hpbGRfbWlncmF0aW9uJztcbmltcG9ydCB7VW5kZWNvcmF0ZWRQYXJlbnRNaWdyYXRpb259IGZyb20gJy4uL21pZ3JhdGlvbnMvdW5kZWNvcmF0ZWRfcGFyZW50X21pZ3JhdGlvbic7XG5pbXBvcnQge0VudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5cbmltcG9ydCB7RGVmYXVsdE1pZ3JhdGlvbkhvc3R9IGZyb20gJy4vbWlncmF0aW9uX2hvc3QnO1xuaW1wb3J0IHtOZ2NjVHJhaXRDb21waWxlcn0gZnJvbSAnLi9uZ2NjX3RyYWl0X2NvbXBpbGVyJztcbmltcG9ydCB7Q29tcGlsZWRDbGFzcywgQ29tcGlsZWRGaWxlLCBEZWNvcmF0aW9uQW5hbHlzZXN9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtpc1dpdGhpblBhY2thZ2UsIE5PT1BfREVQRU5ERU5DWV9UUkFDS0VSfSBmcm9tICcuL3V0aWwnO1xuXG5cblxuLyoqXG4gKiBTaW1wbGUgY2xhc3MgdGhhdCByZXNvbHZlcyBhbmQgbG9hZHMgZmlsZXMgZGlyZWN0bHkgZnJvbSB0aGUgZmlsZXN5c3RlbS5cbiAqL1xuY2xhc3MgTmdjY1Jlc291cmNlTG9hZGVyIGltcGxlbWVudHMgUmVzb3VyY2VMb2FkZXIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGZzOiBGaWxlU3lzdGVtKSB7fVxuICBjYW5QcmVsb2FkID0gZmFsc2U7XG4gIHByZWxvYWQoKTogdW5kZWZpbmVkfFByb21pc2U8dm9pZD4ge1xuICAgIHRocm93IG5ldyBFcnJvcignTm90IGltcGxlbWVudGVkLicpO1xuICB9XG4gIGxvYWQodXJsOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmZzLnJlYWRGaWxlKHJlc29sdmUodXJsKSk7XG4gIH1cbiAgcmVzb2x2ZSh1cmw6IHN0cmluZywgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHJlc29sdmUoZGlybmFtZShhYnNvbHV0ZUZyb20oY29udGFpbmluZ0ZpbGUpKSwgdXJsKTtcbiAgfVxufVxuXG4vKipcbiAqIFRoaXMgQW5hbHl6ZXIgd2lsbCBhbmFseXplIHRoZSBmaWxlcyB0aGF0IGhhdmUgZGVjb3JhdGVkIGNsYXNzZXMgdGhhdCBuZWVkIHRvIGJlIHRyYW5zZm9ybWVkLlxuICovXG5leHBvcnQgY2xhc3MgRGVjb3JhdGlvbkFuYWx5emVyIHtcbiAgcHJpdmF0ZSBwcm9ncmFtID0gdGhpcy5idW5kbGUuc3JjLnByb2dyYW07XG4gIHByaXZhdGUgb3B0aW9ucyA9IHRoaXMuYnVuZGxlLnNyYy5vcHRpb25zO1xuICBwcml2YXRlIGhvc3QgPSB0aGlzLmJ1bmRsZS5zcmMuaG9zdDtcbiAgcHJpdmF0ZSB0eXBlQ2hlY2tlciA9IHRoaXMuYnVuZGxlLnNyYy5wcm9ncmFtLmdldFR5cGVDaGVja2VyKCk7XG4gIHByaXZhdGUgcm9vdERpcnMgPSB0aGlzLmJ1bmRsZS5yb290RGlycztcbiAgcHJpdmF0ZSBwYWNrYWdlUGF0aCA9IHRoaXMuYnVuZGxlLmVudHJ5UG9pbnQucGFja2FnZTtcbiAgcHJpdmF0ZSBpc0NvcmUgPSB0aGlzLmJ1bmRsZS5pc0NvcmU7XG4gIHByaXZhdGUgY29tcGlsZXJPcHRpb25zID0gdGhpcy50c0NvbmZpZyAhPT0gbnVsbCA/IHRoaXMudHNDb25maWcub3B0aW9ucyA6IHt9O1xuXG4gIG1vZHVsZVJlc29sdmVyID1cbiAgICAgIG5ldyBNb2R1bGVSZXNvbHZlcih0aGlzLnByb2dyYW0sIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0LCAvKiBtb2R1bGVSZXNvbHV0aW9uQ2FjaGUgKi8gbnVsbCk7XG4gIHJlc291cmNlTWFuYWdlciA9IG5ldyBOZ2NjUmVzb3VyY2VMb2FkZXIodGhpcy5mcyk7XG4gIG1ldGFSZWdpc3RyeSA9IG5ldyBMb2NhbE1ldGFkYXRhUmVnaXN0cnkoKTtcbiAgZHRzTWV0YVJlYWRlciA9IG5ldyBEdHNNZXRhZGF0YVJlYWRlcih0aGlzLnR5cGVDaGVja2VyLCB0aGlzLnJlZmxlY3Rpb25Ib3N0KTtcbiAgZnVsbE1ldGFSZWFkZXIgPSBuZXcgQ29tcG91bmRNZXRhZGF0YVJlYWRlcihbdGhpcy5tZXRhUmVnaXN0cnksIHRoaXMuZHRzTWV0YVJlYWRlcl0pO1xuICByZWZFbWl0dGVyID0gbmV3IFJlZmVyZW5jZUVtaXR0ZXIoW1xuICAgIG5ldyBMb2NhbElkZW50aWZpZXJTdHJhdGVneSgpLFxuICAgIG5ldyBBYnNvbHV0ZU1vZHVsZVN0cmF0ZWd5KFxuICAgICAgICB0aGlzLnByb2dyYW0sIHRoaXMudHlwZUNoZWNrZXIsIHRoaXMubW9kdWxlUmVzb2x2ZXIsIHRoaXMucmVmbGVjdGlvbkhvc3QpLFxuICAgIC8vIFRPRE8oYWx4aHViKTogdGhlcmUncyBubyByZWFzb24gd2h5IG5nY2MgbmVlZHMgdGhlIFwibG9naWNhbCBmaWxlIHN5c3RlbVwiIGxvZ2ljIGhlcmUsIGFzIG5nY2NcbiAgICAvLyBwcm9qZWN0cyBvbmx5IGV2ZXIgaGF2ZSBvbmUgcm9vdERpci4gSW5zdGVhZCwgbmdjYyBzaG91bGQganVzdCBzd2l0Y2ggaXRzIGVtaXR0ZWQgaW1wb3J0XG4gICAgLy8gYmFzZWQgb24gd2hldGhlciBhIGJlc3RHdWVzc093bmluZ01vZHVsZSBpcyBwcmVzZW50IGluIHRoZSBSZWZlcmVuY2UuXG4gICAgbmV3IExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3koXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIG5ldyBMb2dpY2FsRmlsZVN5c3RlbSh0aGlzLnJvb3REaXJzLCB0aGlzLmhvc3QpKSxcbiAgXSk7XG4gIGFsaWFzaW5nSG9zdCA9IHRoaXMuYnVuZGxlLmVudHJ5UG9pbnQuZ2VuZXJhdGVEZWVwUmVleHBvcnRzID9cbiAgICAgIG5ldyBQcml2YXRlRXhwb3J0QWxpYXNpbmdIb3N0KHRoaXMucmVmbGVjdGlvbkhvc3QpIDpcbiAgICAgIG51bGw7XG4gIGR0c01vZHVsZVNjb3BlUmVzb2x2ZXIgPVxuICAgICAgbmV3IE1ldGFkYXRhRHRzTW9kdWxlU2NvcGVSZXNvbHZlcih0aGlzLmR0c01ldGFSZWFkZXIsIHRoaXMuYWxpYXNpbmdIb3N0KTtcbiAgc2NvcGVSZWdpc3RyeSA9IG5ldyBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnkoXG4gICAgICB0aGlzLm1ldGFSZWdpc3RyeSwgdGhpcy5kdHNNb2R1bGVTY29wZVJlc29sdmVyLCB0aGlzLnJlZkVtaXR0ZXIsIHRoaXMuYWxpYXNpbmdIb3N0KTtcbiAgZnVsbFJlZ2lzdHJ5ID0gbmV3IENvbXBvdW5kTWV0YWRhdGFSZWdpc3RyeShbdGhpcy5tZXRhUmVnaXN0cnksIHRoaXMuc2NvcGVSZWdpc3RyeV0pO1xuICBldmFsdWF0b3IgPVxuICAgICAgbmV3IFBhcnRpYWxFdmFsdWF0b3IodGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy50eXBlQ2hlY2tlciwgLyogZGVwZW5kZW5jeVRyYWNrZXIgKi8gbnVsbCk7XG4gIGltcG9ydEdyYXBoID0gbmV3IEltcG9ydEdyYXBoKHRoaXMubW9kdWxlUmVzb2x2ZXIpO1xuICBjeWNsZUFuYWx5emVyID0gbmV3IEN5Y2xlQW5hbHl6ZXIodGhpcy5pbXBvcnRHcmFwaCk7XG4gIGluamVjdGFibGVSZWdpc3RyeSA9IG5ldyBJbmplY3RhYmxlQ2xhc3NSZWdpc3RyeSh0aGlzLnJlZmxlY3Rpb25Ib3N0KTtcbiAgaGFuZGxlcnM6IERlY29yYXRvckhhbmRsZXI8dW5rbm93biwgdW5rbm93biwgdW5rbm93bj5bXSA9IFtcbiAgICBuZXcgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgdGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5ldmFsdWF0b3IsIHRoaXMuZnVsbFJlZ2lzdHJ5LCB0aGlzLmZ1bGxNZXRhUmVhZGVyLFxuICAgICAgICB0aGlzLnNjb3BlUmVnaXN0cnksIHRoaXMuc2NvcGVSZWdpc3RyeSwgdGhpcy5pc0NvcmUsIHRoaXMucmVzb3VyY2VNYW5hZ2VyLCB0aGlzLnJvb3REaXJzLFxuICAgICAgICAhIXRoaXMuY29tcGlsZXJPcHRpb25zLnByZXNlcnZlV2hpdGVzcGFjZXMsXG4gICAgICAgIC8qIGkxOG5Vc2VFeHRlcm5hbElkcyAqLyB0cnVlLCB0aGlzLmJ1bmRsZS5lbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0LFxuICAgICAgICAvKiBpMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXMgKi8gZmFsc2UsIHRoaXMubW9kdWxlUmVzb2x2ZXIsIHRoaXMuY3ljbGVBbmFseXplcixcbiAgICAgICAgdGhpcy5yZWZFbWl0dGVyLCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSLCBOT09QX0RFUEVOREVOQ1lfVFJBQ0tFUixcbiAgICAgICAgdGhpcy5pbmplY3RhYmxlUmVnaXN0cnksIC8qIGFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyICovIGZhbHNlKSxcbiAgICAvLyBTZWUgdGhlIG5vdGUgaW4gbmd0c2MgYWJvdXQgd2h5IHRoaXMgY2FzdCBpcyBuZWVkZWQuXG4gICAgLy8gY2xhbmctZm9ybWF0IG9mZlxuICAgIG5ldyBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICB0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmV2YWx1YXRvciwgdGhpcy5mdWxsUmVnaXN0cnksIHRoaXMuc2NvcGVSZWdpc3RyeSxcbiAgICAgICAgdGhpcy5mdWxsTWV0YVJlYWRlciwgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUiwgdGhpcy5pbmplY3RhYmxlUmVnaXN0cnksIHRoaXMuaXNDb3JlLFxuICAgICAgICAvKiBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlciAqLyBmYWxzZSxcbiAgICAgICAgLy8gSW4gbmdjYyB3ZSB3YW50IHRvIGNvbXBpbGUgdW5kZWNvcmF0ZWQgY2xhc3NlcyB3aXRoIEFuZ3VsYXIgZmVhdHVyZXMuIEFzIG9mXG4gICAgICAgIC8vIHZlcnNpb24gMTAsIHVuZGVjb3JhdGVkIGNsYXNzZXMgdGhhdCB1c2UgQW5ndWxhciBmZWF0dXJlcyBhcmUgbm8gbG9uZ2VyIGhhbmRsZWRcbiAgICAgICAgLy8gaW4gbmd0c2MsIGJ1dCB3ZSB3YW50IHRvIGVuc3VyZSBjb21wYXRpYmlsaXR5IGluIG5nY2MgZm9yIG91dGRhdGVkIGxpYnJhcmllcyB0aGF0XG4gICAgICAgIC8vIGhhdmUgbm90IG1pZ3JhdGVkIHRvIGV4cGxpY2l0IGRlY29yYXRvcnMuIFNlZTogaHR0cHM6Ly9oYWNrbWQuaW8vQGFseC9yeWZZWXV2ekguXG4gICAgICAgIC8qIGNvbXBpbGVVbmRlY29yYXRlZENsYXNzZXNXaXRoQW5ndWxhckZlYXR1cmVzICovIHRydWVcbiAgICApIGFzIERlY29yYXRvckhhbmRsZXI8dW5rbm93biwgdW5rbm93biwgdW5rbm93bj4sXG4gICAgLy8gY2xhbmctZm9ybWF0IG9uXG4gICAgLy8gUGlwZSBoYW5kbGVyIG11c3QgYmUgYmVmb3JlIGluamVjdGFibGUgaGFuZGxlciBpbiBsaXN0IHNvIHBpcGUgZmFjdG9yaWVzIGFyZSBwcmludGVkXG4gICAgLy8gYmVmb3JlIGluamVjdGFibGUgZmFjdG9yaWVzIChzbyBpbmplY3RhYmxlIGZhY3RvcmllcyBjYW4gZGVsZWdhdGUgdG8gdGhlbSlcbiAgICBuZXcgUGlwZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLm1ldGFSZWdpc3RyeSwgdGhpcy5zY29wZVJlZ2lzdHJ5LFxuICAgICAgICBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSLCB0aGlzLmluamVjdGFibGVSZWdpc3RyeSwgdGhpcy5pc0NvcmUpLFxuICAgIG5ldyBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgdGhpcy5yZWZsZWN0aW9uSG9zdCwgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUiwgdGhpcy5pc0NvcmUsXG4gICAgICAgIC8qIHN0cmljdEN0b3JEZXBzICovIGZhbHNlLCB0aGlzLmluamVjdGFibGVSZWdpc3RyeSwgLyogZXJyb3JPbkR1cGxpY2F0ZVByb3YgKi8gZmFsc2UpLFxuICAgIG5ldyBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLmZ1bGxNZXRhUmVhZGVyLCB0aGlzLmZ1bGxSZWdpc3RyeSxcbiAgICAgICAgdGhpcy5zY29wZVJlZ2lzdHJ5LCB0aGlzLnJlZmVyZW5jZXNSZWdpc3RyeSwgdGhpcy5pc0NvcmUsIC8qIHJvdXRlQW5hbHl6ZXIgKi8gbnVsbCxcbiAgICAgICAgdGhpcy5yZWZFbWl0dGVyLFxuICAgICAgICAvKiBmYWN0b3J5VHJhY2tlciAqLyBudWxsLCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSLFxuICAgICAgICAvKiBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlciAqLyBmYWxzZSwgdGhpcy5pbmplY3RhYmxlUmVnaXN0cnkpLFxuICBdO1xuICBjb21waWxlciA9IG5ldyBOZ2NjVHJhaXRDb21waWxlcih0aGlzLmhhbmRsZXJzLCB0aGlzLnJlZmxlY3Rpb25Ib3N0KTtcbiAgbWlncmF0aW9uczogTWlncmF0aW9uW10gPSBbXG4gICAgbmV3IFVuZGVjb3JhdGVkUGFyZW50TWlncmF0aW9uKCksXG4gICAgbmV3IFVuZGVjb3JhdGVkQ2hpbGRNaWdyYXRpb24oKSxcbiAgICBuZXcgTWlzc2luZ0luamVjdGFibGVNaWdyYXRpb24oKSxcbiAgXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgZnM6IEZpbGVTeXN0ZW0sIHByaXZhdGUgYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlLFxuICAgICAgcHJpdmF0ZSByZWZsZWN0aW9uSG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIHJlZmVyZW5jZXNSZWdpc3RyeTogUmVmZXJlbmNlc1JlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSBkaWFnbm9zdGljSGFuZGxlcjogKGVycm9yOiB0cy5EaWFnbm9zdGljKSA9PiB2b2lkID0gKCkgPT4ge30sXG4gICAgICBwcml2YXRlIHRzQ29uZmlnOiBQYXJzZWRDb25maWd1cmF0aW9ufG51bGwgPSBudWxsKSB7fVxuXG4gIC8qKlxuICAgKiBBbmFseXplIGEgcHJvZ3JhbSB0byBmaW5kIGFsbCB0aGUgZGVjb3JhdGVkIGZpbGVzIHNob3VsZCBiZSB0cmFuc2Zvcm1lZC5cbiAgICpcbiAgICogQHJldHVybnMgYSBtYXAgb2YgdGhlIHNvdXJjZSBmaWxlcyB0byB0aGUgYW5hbHlzaXMgZm9yIHRob3NlIGZpbGVzLlxuICAgKi9cbiAgYW5hbHl6ZVByb2dyYW0oKTogRGVjb3JhdGlvbkFuYWx5c2VzIHtcbiAgICBmb3IgKGNvbnN0IHNvdXJjZUZpbGUgb2YgdGhpcy5wcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGlmICghc291cmNlRmlsZS5pc0RlY2xhcmF0aW9uRmlsZSAmJiBpc1dpdGhpblBhY2thZ2UodGhpcy5wYWNrYWdlUGF0aCwgc291cmNlRmlsZSkpIHtcbiAgICAgICAgdGhpcy5jb21waWxlci5hbmFseXplRmlsZShzb3VyY2VGaWxlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmFwcGx5TWlncmF0aW9ucygpO1xuXG4gICAgdGhpcy5jb21waWxlci5yZXNvbHZlKCk7XG5cbiAgICB0aGlzLnJlcG9ydERpYWdub3N0aWNzKCk7XG5cbiAgICBjb25zdCBkZWNvcmF0aW9uQW5hbHlzZXMgPSBuZXcgRGVjb3JhdGlvbkFuYWx5c2VzKCk7XG4gICAgZm9yIChjb25zdCBhbmFseXplZEZpbGUgb2YgdGhpcy5jb21waWxlci5hbmFseXplZEZpbGVzKSB7XG4gICAgICBjb25zdCBjb21waWxlZEZpbGUgPSB0aGlzLmNvbXBpbGVGaWxlKGFuYWx5emVkRmlsZSk7XG4gICAgICBkZWNvcmF0aW9uQW5hbHlzZXMuc2V0KGNvbXBpbGVkRmlsZS5zb3VyY2VGaWxlLCBjb21waWxlZEZpbGUpO1xuICAgIH1cbiAgICByZXR1cm4gZGVjb3JhdGlvbkFuYWx5c2VzO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFwcGx5TWlncmF0aW9ucygpOiB2b2lkIHtcbiAgICBjb25zdCBtaWdyYXRpb25Ib3N0ID0gbmV3IERlZmF1bHRNaWdyYXRpb25Ib3N0KFxuICAgICAgICB0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmZ1bGxNZXRhUmVhZGVyLCB0aGlzLmV2YWx1YXRvciwgdGhpcy5jb21waWxlcixcbiAgICAgICAgdGhpcy5idW5kbGUuZW50cnlQb2ludC5wYXRoKTtcblxuICAgIHRoaXMubWlncmF0aW9ucy5mb3JFYWNoKG1pZ3JhdGlvbiA9PiB7XG4gICAgICB0aGlzLmNvbXBpbGVyLmFuYWx5emVkRmlsZXMuZm9yRWFjaChhbmFseXplZEZpbGUgPT4ge1xuICAgICAgICBjb25zdCByZWNvcmRzID0gdGhpcy5jb21waWxlci5yZWNvcmRzRm9yKGFuYWx5emVkRmlsZSk7XG4gICAgICAgIGlmIChyZWNvcmRzID09PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBc3NlcnRpb24gZXJyb3I6IGZpbGUgdG8gbWlncmF0ZSBtdXN0IGhhdmUgcmVjb3Jkcy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlY29yZHMuZm9yRWFjaChyZWNvcmQgPT4ge1xuICAgICAgICAgIGNvbnN0IGFkZERpYWdub3N0aWMgPSAoZGlhZ25vc3RpYzogdHMuRGlhZ25vc3RpYykgPT4ge1xuICAgICAgICAgICAgaWYgKHJlY29yZC5tZXRhRGlhZ25vc3RpY3MgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVjb3JkLm1ldGFEaWFnbm9zdGljcyA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVjb3JkLm1ldGFEaWFnbm9zdGljcy5wdXNoKGRpYWdub3N0aWMpO1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gbWlncmF0aW9uLmFwcGx5KHJlY29yZC5ub2RlLCBtaWdyYXRpb25Ib3N0KTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgYWRkRGlhZ25vc3RpYyhyZXN1bHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGlmIChpc0ZhdGFsRGlhZ25vc3RpY0Vycm9yKGUpKSB7XG4gICAgICAgICAgICAgIGFkZERpYWdub3N0aWMoZS50b0RpYWdub3N0aWMoKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIHByb3RlY3RlZCByZXBvcnREaWFnbm9zdGljcygpIHtcbiAgICB0aGlzLmNvbXBpbGVyLmRpYWdub3N0aWNzLmZvckVhY2godGhpcy5kaWFnbm9zdGljSGFuZGxlcik7XG4gIH1cblxuICBwcm90ZWN0ZWQgY29tcGlsZUZpbGUoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IENvbXBpbGVkRmlsZSB7XG4gICAgY29uc3QgY29uc3RhbnRQb29sID0gbmV3IENvbnN0YW50UG9vbCgpO1xuICAgIGNvbnN0IHJlY29yZHMgPSB0aGlzLmNvbXBpbGVyLnJlY29yZHNGb3Ioc291cmNlRmlsZSk7XG4gICAgaWYgKHJlY29yZHMgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQXNzZXJ0aW9uIGVycm9yOiBmaWxlIHRvIGNvbXBpbGUgbXVzdCBoYXZlIHJlY29yZHMuJyk7XG4gICAgfVxuXG4gICAgY29uc3QgY29tcGlsZWRDbGFzc2VzOiBDb21waWxlZENsYXNzW10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgcmVjb3JkIG9mIHJlY29yZHMpIHtcbiAgICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5jb21waWxlci5jb21waWxlKHJlY29yZC5ub2RlLCBjb25zdGFudFBvb2wpO1xuICAgICAgaWYgKGNvbXBpbGF0aW9uID09PSBudWxsKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb21waWxlZENsYXNzZXMucHVzaCh7XG4gICAgICAgIG5hbWU6IHJlY29yZC5ub2RlLm5hbWUudGV4dCxcbiAgICAgICAgZGVjb3JhdG9yczogdGhpcy5jb21waWxlci5nZXRBbGxEZWNvcmF0b3JzKHJlY29yZC5ub2RlKSxcbiAgICAgICAgZGVjbGFyYXRpb246IHJlY29yZC5ub2RlLFxuICAgICAgICBjb21waWxhdGlvblxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgcmVleHBvcnRzID0gdGhpcy5nZXRSZWV4cG9ydHNGb3JTb3VyY2VGaWxlKHNvdXJjZUZpbGUpO1xuICAgIHJldHVybiB7Y29uc3RhbnRQb29sLCBzb3VyY2VGaWxlOiBzb3VyY2VGaWxlLCBjb21waWxlZENsYXNzZXMsIHJlZXhwb3J0c307XG4gIH1cblxuICBwcml2YXRlIGdldFJlZXhwb3J0c0ZvclNvdXJjZUZpbGUoc2Y6IHRzLlNvdXJjZUZpbGUpOiBSZWV4cG9ydFtdIHtcbiAgICBjb25zdCBleHBvcnRTdGF0ZW1lbnRzID0gdGhpcy5jb21waWxlci5leHBvcnRTdGF0ZW1lbnRzO1xuICAgIGlmICghZXhwb3J0U3RhdGVtZW50cy5oYXMoc2YuZmlsZU5hbWUpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGNvbnN0IGV4cG9ydHMgPSBleHBvcnRTdGF0ZW1lbnRzLmdldChzZi5maWxlTmFtZSkhO1xuXG4gICAgY29uc3QgcmVleHBvcnRzOiBSZWV4cG9ydFtdID0gW107XG4gICAgZXhwb3J0cy5mb3JFYWNoKChbZnJvbU1vZHVsZSwgc3ltYm9sTmFtZV0sIGFzQWxpYXMpID0+IHtcbiAgICAgIHJlZXhwb3J0cy5wdXNoKHthc0FsaWFzLCBmcm9tTW9kdWxlLCBzeW1ib2xOYW1lfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlZXhwb3J0cztcbiAgfVxufVxuIl19