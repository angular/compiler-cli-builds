(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/analysis/decoration_analyzer", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngtsc/cycles", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/scope", "@angular/compiler-cli/ngcc/src/migrations/missing_injectable_migration", "@angular/compiler-cli/ngcc/src/migrations/undecorated_child_migration", "@angular/compiler-cli/ngcc/src/migrations/undecorated_parent_migration", "@angular/compiler-cli/ngcc/src/analysis/migration_host", "@angular/compiler-cli/ngcc/src/analysis/ngcc_trait_compiler", "@angular/compiler-cli/ngcc/src/analysis/types", "@angular/compiler-cli/ngcc/src/analysis/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DecorationAnalyzer = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var compiler_1 = require("@angular/compiler");
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
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
            this.canPreprocess = false;
        }
        NgccResourceLoader.prototype.preload = function () {
            throw new Error('Not implemented.');
        };
        NgccResourceLoader.prototype.preprocessInline = function () {
            throw new Error('Not implemented.');
        };
        NgccResourceLoader.prototype.load = function (url) {
            return this.fs.readFile(this.fs.resolve(url));
        };
        NgccResourceLoader.prototype.resolve = function (url, containingFile) {
            return this.fs.resolve(this.fs.dirname(containingFile), url);
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
            this.packagePath = this.bundle.entryPoint.packagePath;
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
            this.importGraph = new cycles_1.ImportGraph(this.typeChecker, perf_1.NOOP_PERF_RECORDER);
            this.cycleAnalyzer = new cycles_1.CycleAnalyzer(this.importGraph);
            this.injectableRegistry = new metadata_1.InjectableClassRegistry(this.reflectionHost);
            this.typeCheckScopeRegistry = new scope_1.TypeCheckScopeRegistry(this.scopeRegistry, this.fullMetaReader);
            this.handlers = [
                new annotations_1.ComponentDecoratorHandler(this.reflectionHost, this.evaluator, this.fullRegistry, this.fullMetaReader, this.scopeRegistry, this.scopeRegistry, this.typeCheckScopeRegistry, new metadata_1.ResourceRegistry(), this.isCore, this.resourceManager, this.rootDirs, !!this.compilerOptions.preserveWhitespaces, 
                /* i18nUseExternalIds */ true, this.bundle.enableI18nLegacyMessageIdFormat, 
                /* usePoisonedData */ false, 
                /* i18nNormalizeLineEndingsInICUs */ false, this.moduleResolver, this.cycleAnalyzer, 0 /* UseRemoteScoping */, this.refEmitter, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, util_1.NOOP_DEPENDENCY_TRACKER, this.injectableRegistry, 
                /* semanticDepGraphUpdater */ null, !!this.compilerOptions.annotateForClosureCompiler, perf_1.NOOP_PERF_RECORDER),
                // See the note in ngtsc about why this cast is needed.
                // clang-format off
                new annotations_1.DirectiveDecoratorHandler(this.reflectionHost, this.evaluator, this.fullRegistry, this.scopeRegistry, this.fullMetaReader, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, this.injectableRegistry, this.isCore, 
                /* semanticDepGraphUpdater */ null, !!this.compilerOptions.annotateForClosureCompiler, 
                // In ngcc we want to compile undecorated classes with Angular features. As of
                // version 10, undecorated classes that use Angular features are no longer handled
                // in ngtsc, but we want to ensure compatibility in ngcc for outdated libraries that
                // have not migrated to explicit decorators. See: https://hackmd.io/@alx/ryfYYuvzH.
                /* compileUndecoratedClassesWithAngularFeatures */ true, perf_1.NOOP_PERF_RECORDER),
                // clang-format on
                // Pipe handler must be before injectable handler in list so pipe factories are printed
                // before injectable factories (so injectable factories can delegate to them)
                new annotations_1.PipeDecoratorHandler(this.reflectionHost, this.evaluator, this.metaRegistry, this.scopeRegistry, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, this.injectableRegistry, this.isCore, perf_1.NOOP_PERF_RECORDER),
                new annotations_1.InjectableDecoratorHandler(this.reflectionHost, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, this.isCore, 
                /* strictCtorDeps */ false, this.injectableRegistry, perf_1.NOOP_PERF_RECORDER, 
                /* errorOnDuplicateProv */ false),
                new annotations_1.NgModuleDecoratorHandler(this.reflectionHost, this.evaluator, this.fullMetaReader, this.fullRegistry, this.scopeRegistry, this.referencesRegistry, this.isCore, /* routeAnalyzer */ null, this.refEmitter, 
                /* factoryTracker */ null, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, !!this.compilerOptions.annotateForClosureCompiler, this.injectableRegistry, perf_1.NOOP_PERF_RECORDER),
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
                    if (!sourceFile.isDeclarationFile &&
                        util_1.isWithinPackage(this.packagePath, file_system_1.absoluteFromSourceFile(sourceFile))) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbl9hbmFseXplci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9hbmFseXNpcy9kZWNvcmF0aW9uX2FuYWx5emVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw4Q0FBK0M7SUFDL0MsNkRBQXdFO0lBSXhFLDJFQUFvTjtJQUNwTixpRUFBNEY7SUFDNUYsMkVBQXNFO0lBQ3RFLDJFQUE2RztJQUM3RyxtRUFBd047SUFFeE4scUVBQWtMO0lBQ2xMLHVGQUFzRTtJQUN0RSwrREFBMEg7SUFJMUgsdUhBQXNGO0lBQ3RGLHFIQUFvRjtJQUNwRix1SEFBc0Y7SUFHdEYseUZBQXNEO0lBQ3RELG1HQUF3RDtJQUN4RCx1RUFBd0U7SUFDeEUscUVBQWdFO0lBSWhFOztPQUVHO0lBQ0g7UUFDRSw0QkFBb0IsRUFBc0I7WUFBdEIsT0FBRSxHQUFGLEVBQUUsQ0FBb0I7WUFDMUMsZUFBVSxHQUFHLEtBQUssQ0FBQztZQUNuQixrQkFBYSxHQUFHLEtBQUssQ0FBQztRQUZ1QixDQUFDO1FBRzlDLG9DQUFPLEdBQVA7WUFDRSxNQUFNLElBQUksS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDdEMsQ0FBQztRQUNELDZDQUFnQixHQUFoQjtZQUNFLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUN0QyxDQUFDO1FBQ0QsaUNBQUksR0FBSixVQUFLLEdBQVc7WUFDZCxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDaEQsQ0FBQztRQUNELG9DQUFPLEdBQVAsVUFBUSxHQUFXLEVBQUUsY0FBc0I7WUFDekMsT0FBTyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8s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LE9BQU8sR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBRSxDQUFDO1lBRW5ELElBQU0sU0FBUyxHQUFlLEVBQUUsQ0FBQztZQUNqQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQUMsRUFBd0IsRUFBRSxPQUFPO29CQUFqQyxLQUFBLHFCQUF3QixFQUF2QixVQUFVLFFBQUEsRUFBRSxVQUFVLFFBQUE7Z0JBQ3RDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBQyxPQUFPLFNBQUEsRUFBRSxVQUFVLFlBQUEsRUFBRSxVQUFVLFlBQUEsRUFBQyxDQUFDLENBQUM7WUFDcEQsQ0FBQyxDQUFDLENBQUM7WUFDSCxPQUFPLFNBQVMsQ0FBQztRQUNuQixDQUFDO1FBQ0gseUJBQUM7SUFBRCxDQUFDLEFBL01ELElBK01DO0lBL01ZLGdEQUFrQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtDb25zdGFudFBvb2x9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7Tk9PUF9QRVJGX1JFQ09SREVSfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL3BlcmYnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7UGFyc2VkQ29uZmlndXJhdGlvbn0gZnJvbSAnLi4vLi4vLi4nO1xuaW1wb3J0IHtDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyLCBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyLCBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlciwgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyLCBQaXBlRGVjb3JhdG9ySGFuZGxlciwgUmVmZXJlbmNlc1JlZ2lzdHJ5LCBSZXNvdXJjZUxvYWRlcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2Fubm90YXRpb25zJztcbmltcG9ydCB7Q3ljbGVBbmFseXplciwgQ3ljbGVIYW5kbGluZ1N0cmF0ZWd5LCBJbXBvcnRHcmFwaH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2N5Y2xlcyc7XG5pbXBvcnQge2lzRmF0YWxEaWFnbm9zdGljRXJyb3J9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9kaWFnbm9zdGljcyc7XG5pbXBvcnQge2Fic29sdXRlRnJvbVNvdXJjZUZpbGUsIExvZ2ljYWxGaWxlU3lzdGVtLCBSZWFkb25seUZpbGVTeXN0ZW19IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0Fic29sdXRlTW9kdWxlU3RyYXRlZ3ksIExvY2FsSWRlbnRpZmllclN0cmF0ZWd5LCBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5LCBNb2R1bGVSZXNvbHZlciwgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUiwgUHJpdmF0ZUV4cG9ydEFsaWFzaW5nSG9zdCwgUmVleHBvcnQsIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9pbXBvcnRzJztcbmltcG9ydCB7U2VtYW50aWNTeW1ib2x9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9pbmNyZW1lbnRhbC9zZW1hbnRpY19ncmFwaCc7XG5pbXBvcnQge0NvbXBvdW5kTWV0YWRhdGFSZWFkZXIsIENvbXBvdW5kTWV0YWRhdGFSZWdpc3RyeSwgRHRzTWV0YWRhdGFSZWFkZXIsIEluamVjdGFibGVDbGFzc1JlZ2lzdHJ5LCBMb2NhbE1ldGFkYXRhUmVnaXN0cnksIFJlc291cmNlUmVnaXN0cnl9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9tZXRhZGF0YSc7XG5pbXBvcnQge1BhcnRpYWxFdmFsdWF0b3J9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0xvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeSwgTWV0YWRhdGFEdHNNb2R1bGVTY29wZVJlc29sdmVyLCBUeXBlQ2hlY2tTY29wZVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2Mvc2NvcGUnO1xuaW1wb3J0IHtEZWNvcmF0b3JIYW5kbGVyfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvdHJhbnNmb3JtJztcbmltcG9ydCB7TmdjY1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L25nY2NfaG9zdCc7XG5pbXBvcnQge01pZ3JhdGlvbn0gZnJvbSAnLi4vbWlncmF0aW9ucy9taWdyYXRpb24nO1xuaW1wb3J0IHtNaXNzaW5nSW5qZWN0YWJsZU1pZ3JhdGlvbn0gZnJvbSAnLi4vbWlncmF0aW9ucy9taXNzaW5nX2luamVjdGFibGVfbWlncmF0aW9uJztcbmltcG9ydCB7VW5kZWNvcmF0ZWRDaGlsZE1pZ3JhdGlvbn0gZnJvbSAnLi4vbWlncmF0aW9ucy91bmRlY29yYXRlZF9jaGlsZF9taWdyYXRpb24nO1xuaW1wb3J0IHtVbmRlY29yYXRlZFBhcmVudE1pZ3JhdGlvbn0gZnJvbSAnLi4vbWlncmF0aW9ucy91bmRlY29yYXRlZF9wYXJlbnRfbWlncmF0aW9uJztcbmltcG9ydCB7RW50cnlQb2ludEJ1bmRsZX0gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnRfYnVuZGxlJztcblxuaW1wb3J0IHtEZWZhdWx0TWlncmF0aW9uSG9zdH0gZnJvbSAnLi9taWdyYXRpb25faG9zdCc7XG5pbXBvcnQge05nY2NUcmFpdENvbXBpbGVyfSBmcm9tICcuL25nY2NfdHJhaXRfY29tcGlsZXInO1xuaW1wb3J0IHtDb21waWxlZENsYXNzLCBDb21waWxlZEZpbGUsIERlY29yYXRpb25BbmFseXNlc30gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge2lzV2l0aGluUGFja2FnZSwgTk9PUF9ERVBFTkRFTkNZX1RSQUNLRVJ9IGZyb20gJy4vdXRpbCc7XG5cblxuXG4vKipcbiAqIFNpbXBsZSBjbGFzcyB0aGF0IHJlc29sdmVzIGFuZCBsb2FkcyBmaWxlcyBkaXJlY3RseSBmcm9tIHRoZSBmaWxlc3lzdGVtLlxuICovXG5jbGFzcyBOZ2NjUmVzb3VyY2VMb2FkZXIgaW1wbGVtZW50cyBSZXNvdXJjZUxvYWRlciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZnM6IFJlYWRvbmx5RmlsZVN5c3RlbSkge31cbiAgY2FuUHJlbG9hZCA9IGZhbHNlO1xuICBjYW5QcmVwcm9jZXNzID0gZmFsc2U7XG4gIHByZWxvYWQoKTogdW5kZWZpbmVkfFByb21pc2U8dm9pZD4ge1xuICAgIHRocm93IG5ldyBFcnJvcignTm90IGltcGxlbWVudGVkLicpO1xuICB9XG4gIHByZXByb2Nlc3NJbmxpbmUoKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuICBsb2FkKHVybDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5mcy5yZWFkRmlsZSh0aGlzLmZzLnJlc29sdmUodXJsKSk7XG4gIH1cbiAgcmVzb2x2ZSh1cmw6IHN0cmluZywgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZnMucmVzb2x2ZSh0aGlzLmZzLmRpcm5hbWUoY29udGFpbmluZ0ZpbGUpLCB1cmwpO1xuICB9XG59XG5cbi8qKlxuICogVGhpcyBBbmFseXplciB3aWxsIGFuYWx5emUgdGhlIGZpbGVzIHRoYXQgaGF2ZSBkZWNvcmF0ZWQgY2xhc3NlcyB0aGF0IG5lZWQgdG8gYmUgdHJhbnNmb3JtZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBEZWNvcmF0aW9uQW5hbHl6ZXIge1xuICBwcml2YXRlIHByb2dyYW0gPSB0aGlzLmJ1bmRsZS5zcmMucHJvZ3JhbTtcbiAgcHJpdmF0ZSBvcHRpb25zID0gdGhpcy5idW5kbGUuc3JjLm9wdGlvbnM7XG4gIHByaXZhdGUgaG9zdCA9IHRoaXMuYnVuZGxlLnNyYy5ob3N0O1xuICBwcml2YXRlIHR5cGVDaGVja2VyID0gdGhpcy5idW5kbGUuc3JjLnByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcbiAgcHJpdmF0ZSByb290RGlycyA9IHRoaXMuYnVuZGxlLnJvb3REaXJzO1xuICBwcml2YXRlIHBhY2thZ2VQYXRoID0gdGhpcy5idW5kbGUuZW50cnlQb2ludC5wYWNrYWdlUGF0aDtcbiAgcHJpdmF0ZSBpc0NvcmUgPSB0aGlzLmJ1bmRsZS5pc0NvcmU7XG4gIHByaXZhdGUgY29tcGlsZXJPcHRpb25zID0gdGhpcy50c0NvbmZpZyAhPT0gbnVsbCA/IHRoaXMudHNDb25maWcub3B0aW9ucyA6IHt9O1xuXG4gIG1vZHVsZVJlc29sdmVyID1cbiAgICAgIG5ldyBNb2R1bGVSZXNvbHZlcih0aGlzLnByb2dyYW0sIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0LCAvKiBtb2R1bGVSZXNvbHV0aW9uQ2FjaGUgKi8gbnVsbCk7XG4gIHJlc291cmNlTWFuYWdlciA9IG5ldyBOZ2NjUmVzb3VyY2VMb2FkZXIodGhpcy5mcyk7XG4gIG1ldGFSZWdpc3RyeSA9IG5ldyBMb2NhbE1ldGFkYXRhUmVnaXN0cnkoKTtcbiAgZHRzTWV0YVJlYWRlciA9IG5ldyBEdHNNZXRhZGF0YVJlYWRlcih0aGlzLnR5cGVDaGVja2VyLCB0aGlzLnJlZmxlY3Rpb25Ib3N0KTtcbiAgZnVsbE1ldGFSZWFkZXIgPSBuZXcgQ29tcG91bmRNZXRhZGF0YVJlYWRlcihbdGhpcy5tZXRhUmVnaXN0cnksIHRoaXMuZHRzTWV0YVJlYWRlcl0pO1xuICByZWZFbWl0dGVyID0gbmV3IFJlZmVyZW5jZUVtaXR0ZXIoW1xuICAgIG5ldyBMb2NhbElkZW50aWZpZXJTdHJhdGVneSgpLFxuICAgIG5ldyBBYnNvbHV0ZU1vZHVsZVN0cmF0ZWd5KFxuICAgICAgICB0aGlzLnByb2dyYW0sIHRoaXMudHlwZUNoZWNrZXIsIHRoaXMubW9kdWxlUmVzb2x2ZXIsIHRoaXMucmVmbGVjdGlvbkhvc3QpLFxuICAgIC8vIFRPRE8oYWx4aHViKTogdGhlcmUncyBubyByZWFzb24gd2h5IG5nY2MgbmVlZHMgdGhlIFwibG9naWNhbCBmaWxlIHN5c3RlbVwiIGxvZ2ljIGhlcmUsIGFzIG5nY2NcbiAgICAvLyBwcm9qZWN0cyBvbmx5IGV2ZXIgaGF2ZSBvbmUgcm9vdERpci4gSW5zdGVhZCwgbmdjYyBzaG91bGQganVzdCBzd2l0Y2ggaXRzIGVtaXR0ZWQgaW1wb3J0XG4gICAgLy8gYmFzZWQgb24gd2hldGhlciBhIGJlc3RHdWVzc093bmluZ01vZHVsZSBpcyBwcmVzZW50IGluIHRoZSBSZWZlcmVuY2UuXG4gICAgbmV3IExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3koXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIG5ldyBMb2dpY2FsRmlsZVN5c3RlbSh0aGlzLnJvb3REaXJzLCB0aGlzLmhvc3QpKSxcbiAgXSk7XG4gIGFsaWFzaW5nSG9zdCA9IHRoaXMuYnVuZGxlLmVudHJ5UG9pbnQuZ2VuZXJhdGVEZWVwUmVleHBvcnRzID9cbiAgICAgIG5ldyBQcml2YXRlRXhwb3J0QWxpYXNpbmdIb3N0KHRoaXMucmVmbGVjdGlvbkhvc3QpIDpcbiAgICAgIG51bGw7XG4gIGR0c01vZHVsZVNjb3BlUmVzb2x2ZXIgPVxuICAgICAgbmV3IE1ldGFkYXRhRHRzTW9kdWxlU2NvcGVSZXNvbHZlcih0aGlzLmR0c01ldGFSZWFkZXIsIHRoaXMuYWxpYXNpbmdIb3N0KTtcbiAgc2NvcGVSZWdpc3RyeSA9IG5ldyBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnkoXG4gICAgICB0aGlzLm1ldGFSZWdpc3RyeSwgdGhpcy5kdHNNb2R1bGVTY29wZVJlc29sdmVyLCB0aGlzLnJlZkVtaXR0ZXIsIHRoaXMuYWxpYXNpbmdIb3N0KTtcbiAgZnVsbFJlZ2lzdHJ5ID0gbmV3IENvbXBvdW5kTWV0YWRhdGFSZWdpc3RyeShbdGhpcy5tZXRhUmVnaXN0cnksIHRoaXMuc2NvcGVSZWdpc3RyeV0pO1xuICBldmFsdWF0b3IgPVxuICAgICAgbmV3IFBhcnRpYWxFdmFsdWF0b3IodGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy50eXBlQ2hlY2tlciwgLyogZGVwZW5kZW5jeVRyYWNrZXIgKi8gbnVsbCk7XG4gIGltcG9ydEdyYXBoID0gbmV3IEltcG9ydEdyYXBoKHRoaXMudHlwZUNoZWNrZXIsIE5PT1BfUEVSRl9SRUNPUkRFUik7XG4gIGN5Y2xlQW5hbHl6ZXIgPSBuZXcgQ3ljbGVBbmFseXplcih0aGlzLmltcG9ydEdyYXBoKTtcbiAgaW5qZWN0YWJsZVJlZ2lzdHJ5ID0gbmV3IEluamVjdGFibGVDbGFzc1JlZ2lzdHJ5KHRoaXMucmVmbGVjdGlvbkhvc3QpO1xuICB0eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5ID0gbmV3IFR5cGVDaGVja1Njb3BlUmVnaXN0cnkodGhpcy5zY29wZVJlZ2lzdHJ5LCB0aGlzLmZ1bGxNZXRhUmVhZGVyKTtcbiAgaGFuZGxlcnM6IERlY29yYXRvckhhbmRsZXI8dW5rbm93biwgdW5rbm93biwgU2VtYW50aWNTeW1ib2x8bnVsbCwgdW5rbm93bj5bXSA9IFtcbiAgICBuZXcgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgdGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5ldmFsdWF0b3IsIHRoaXMuZnVsbFJlZ2lzdHJ5LCB0aGlzLmZ1bGxNZXRhUmVhZGVyLFxuICAgICAgICB0aGlzLnNjb3BlUmVnaXN0cnksIHRoaXMuc2NvcGVSZWdpc3RyeSwgdGhpcy50eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5LCBuZXcgUmVzb3VyY2VSZWdpc3RyeSgpLFxuICAgICAgICB0aGlzLmlzQ29yZSwgdGhpcy5yZXNvdXJjZU1hbmFnZXIsIHRoaXMucm9vdERpcnMsXG4gICAgICAgICEhdGhpcy5jb21waWxlck9wdGlvbnMucHJlc2VydmVXaGl0ZXNwYWNlcyxcbiAgICAgICAgLyogaTE4blVzZUV4dGVybmFsSWRzICovIHRydWUsIHRoaXMuYnVuZGxlLmVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQsXG4gICAgICAgIC8qIHVzZVBvaXNvbmVkRGF0YSAqLyBmYWxzZSxcbiAgICAgICAgLyogaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzICovIGZhbHNlLCB0aGlzLm1vZHVsZVJlc29sdmVyLCB0aGlzLmN5Y2xlQW5hbHl6ZXIsXG4gICAgICAgIEN5Y2xlSGFuZGxpbmdTdHJhdGVneS5Vc2VSZW1vdGVTY29waW5nLCB0aGlzLnJlZkVtaXR0ZXIsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsXG4gICAgICAgIE5PT1BfREVQRU5ERU5DWV9UUkFDS0VSLCB0aGlzLmluamVjdGFibGVSZWdpc3RyeSxcbiAgICAgICAgLyogc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIgKi8gbnVsbCwgISF0aGlzLmNvbXBpbGVyT3B0aW9ucy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcixcbiAgICAgICAgTk9PUF9QRVJGX1JFQ09SREVSKSxcblxuICAgIC8vIFNlZSB0aGUgbm90ZSBpbiBuZ3RzYyBhYm91dCB3aHkgdGhpcyBjYXN0IGlzIG5lZWRlZC5cbiAgICAvLyBjbGFuZy1mb3JtYXQgb2ZmXG4gICAgbmV3IERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLmZ1bGxSZWdpc3RyeSwgdGhpcy5zY29wZVJlZ2lzdHJ5LFxuICAgICAgICB0aGlzLmZ1bGxNZXRhUmVhZGVyLCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSLCB0aGlzLmluamVjdGFibGVSZWdpc3RyeSwgdGhpcy5pc0NvcmUsXG4gICAgICAgIC8qIHNlbWFudGljRGVwR3JhcGhVcGRhdGVyICovIG51bGwsXG4gICAgICAgICEhdGhpcy5jb21waWxlck9wdGlvbnMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIsXG4gICAgICAgIC8vIEluIG5nY2Mgd2Ugd2FudCB0byBjb21waWxlIHVuZGVjb3JhdGVkIGNsYXNzZXMgd2l0aCBBbmd1bGFyIGZlYXR1cmVzLiBBcyBvZlxuICAgICAgICAvLyB2ZXJzaW9uIDEwLCB1bmRlY29yYXRlZCBjbGFzc2VzIHRoYXQgdXNlIEFuZ3VsYXIgZmVhdHVyZXMgYXJlIG5vIGxvbmdlciBoYW5kbGVkXG4gICAgICAgIC8vIGluIG5ndHNjLCBidXQgd2Ugd2FudCB0byBlbnN1cmUgY29tcGF0aWJpbGl0eSBpbiBuZ2NjIGZvciBvdXRkYXRlZCBsaWJyYXJpZXMgdGhhdFxuICAgICAgICAvLyBoYXZlIG5vdCBtaWdyYXRlZCB0byBleHBsaWNpdCBkZWNvcmF0b3JzLiBTZWU6IGh0dHBzOi8vaGFja21kLmlvL0BhbHgvcnlmWVl1dnpILlxuICAgICAgICAvKiBjb21waWxlVW5kZWNvcmF0ZWRDbGFzc2VzV2l0aEFuZ3VsYXJGZWF0dXJlcyAqLyB0cnVlLFxuICAgICAgICBOT09QX1BFUkZfUkVDT1JERVJcbiAgICApIGFzIERlY29yYXRvckhhbmRsZXI8dW5rbm93biwgdW5rbm93biwgU2VtYW50aWNTeW1ib2x8bnVsbCx1bmtub3duPixcbiAgICAvLyBjbGFuZy1mb3JtYXQgb25cbiAgICAvLyBQaXBlIGhhbmRsZXIgbXVzdCBiZSBiZWZvcmUgaW5qZWN0YWJsZSBoYW5kbGVyIGluIGxpc3Qgc28gcGlwZSBmYWN0b3JpZXMgYXJlIHByaW50ZWRcbiAgICAvLyBiZWZvcmUgaW5qZWN0YWJsZSBmYWN0b3JpZXMgKHNvIGluamVjdGFibGUgZmFjdG9yaWVzIGNhbiBkZWxlZ2F0ZSB0byB0aGVtKVxuICAgIG5ldyBQaXBlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgdGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5ldmFsdWF0b3IsIHRoaXMubWV0YVJlZ2lzdHJ5LCB0aGlzLnNjb3BlUmVnaXN0cnksXG4gICAgICAgIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsIHRoaXMuaW5qZWN0YWJsZVJlZ2lzdHJ5LCB0aGlzLmlzQ29yZSwgTk9PUF9QRVJGX1JFQ09SREVSKSxcbiAgICBuZXcgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsIHRoaXMuaXNDb3JlLFxuICAgICAgICAvKiBzdHJpY3RDdG9yRGVwcyAqLyBmYWxzZSwgdGhpcy5pbmplY3RhYmxlUmVnaXN0cnksIE5PT1BfUEVSRl9SRUNPUkRFUixcbiAgICAgICAgLyogZXJyb3JPbkR1cGxpY2F0ZVByb3YgKi8gZmFsc2UpLFxuICAgIG5ldyBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLmZ1bGxNZXRhUmVhZGVyLCB0aGlzLmZ1bGxSZWdpc3RyeSxcbiAgICAgICAgdGhpcy5zY29wZVJlZ2lzdHJ5LCB0aGlzLnJlZmVyZW5jZXNSZWdpc3RyeSwgdGhpcy5pc0NvcmUsIC8qIHJvdXRlQW5hbHl6ZXIgKi8gbnVsbCxcbiAgICAgICAgdGhpcy5yZWZFbWl0dGVyLFxuICAgICAgICAvKiBmYWN0b3J5VHJhY2tlciAqLyBudWxsLCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSLFxuICAgICAgICAhIXRoaXMuY29tcGlsZXJPcHRpb25zLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyLCB0aGlzLmluamVjdGFibGVSZWdpc3RyeSxcbiAgICAgICAgTk9PUF9QRVJGX1JFQ09SREVSKSxcbiAgXTtcbiAgY29tcGlsZXIgPSBuZXcgTmdjY1RyYWl0Q29tcGlsZXIodGhpcy5oYW5kbGVycywgdGhpcy5yZWZsZWN0aW9uSG9zdCk7XG4gIG1pZ3JhdGlvbnM6IE1pZ3JhdGlvbltdID0gW1xuICAgIG5ldyBVbmRlY29yYXRlZFBhcmVudE1pZ3JhdGlvbigpLFxuICAgIG5ldyBVbmRlY29yYXRlZENoaWxkTWlncmF0aW9uKCksXG4gICAgbmV3IE1pc3NpbmdJbmplY3RhYmxlTWlncmF0aW9uKCksXG4gIF07XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGZzOiBSZWFkb25seUZpbGVTeXN0ZW0sIHByaXZhdGUgYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlLFxuICAgICAgcHJpdmF0ZSByZWZsZWN0aW9uSG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIHJlZmVyZW5jZXNSZWdpc3RyeTogUmVmZXJlbmNlc1JlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSBkaWFnbm9zdGljSGFuZGxlcjogKGVycm9yOiB0cy5EaWFnbm9zdGljKSA9PiB2b2lkID0gKCkgPT4ge30sXG4gICAgICBwcml2YXRlIHRzQ29uZmlnOiBQYXJzZWRDb25maWd1cmF0aW9ufG51bGwgPSBudWxsKSB7fVxuXG4gIC8qKlxuICAgKiBBbmFseXplIGEgcHJvZ3JhbSB0byBmaW5kIGFsbCB0aGUgZGVjb3JhdGVkIGZpbGVzIHNob3VsZCBiZSB0cmFuc2Zvcm1lZC5cbiAgICpcbiAgICogQHJldHVybnMgYSBtYXAgb2YgdGhlIHNvdXJjZSBmaWxlcyB0byB0aGUgYW5hbHlzaXMgZm9yIHRob3NlIGZpbGVzLlxuICAgKi9cbiAgYW5hbHl6ZVByb2dyYW0oKTogRGVjb3JhdGlvbkFuYWx5c2VzIHtcbiAgICBmb3IgKGNvbnN0IHNvdXJjZUZpbGUgb2YgdGhpcy5wcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGlmICghc291cmNlRmlsZS5pc0RlY2xhcmF0aW9uRmlsZSAmJlxuICAgICAgICAgIGlzV2l0aGluUGFja2FnZSh0aGlzLnBhY2thZ2VQYXRoLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNvdXJjZUZpbGUpKSkge1xuICAgICAgICB0aGlzLmNvbXBpbGVyLmFuYWx5emVGaWxlKHNvdXJjZUZpbGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuYXBwbHlNaWdyYXRpb25zKCk7XG5cbiAgICB0aGlzLmNvbXBpbGVyLnJlc29sdmUoKTtcblxuICAgIHRoaXMucmVwb3J0RGlhZ25vc3RpY3MoKTtcblxuICAgIGNvbnN0IGRlY29yYXRpb25BbmFseXNlcyA9IG5ldyBEZWNvcmF0aW9uQW5hbHlzZXMoKTtcbiAgICBmb3IgKGNvbnN0IGFuYWx5emVkRmlsZSBvZiB0aGlzLmNvbXBpbGVyLmFuYWx5emVkRmlsZXMpIHtcbiAgICAgIGNvbnN0IGNvbXBpbGVkRmlsZSA9IHRoaXMuY29tcGlsZUZpbGUoYW5hbHl6ZWRGaWxlKTtcbiAgICAgIGRlY29yYXRpb25BbmFseXNlcy5zZXQoY29tcGlsZWRGaWxlLnNvdXJjZUZpbGUsIGNvbXBpbGVkRmlsZSk7XG4gICAgfVxuICAgIHJldHVybiBkZWNvcmF0aW9uQW5hbHlzZXM7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXBwbHlNaWdyYXRpb25zKCk6IHZvaWQge1xuICAgIGNvbnN0IG1pZ3JhdGlvbkhvc3QgPSBuZXcgRGVmYXVsdE1pZ3JhdGlvbkhvc3QoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMuZnVsbE1ldGFSZWFkZXIsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLmNvbXBpbGVyLFxuICAgICAgICB0aGlzLmJ1bmRsZS5lbnRyeVBvaW50LnBhdGgpO1xuXG4gICAgdGhpcy5taWdyYXRpb25zLmZvckVhY2gobWlncmF0aW9uID0+IHtcbiAgICAgIHRoaXMuY29tcGlsZXIuYW5hbHl6ZWRGaWxlcy5mb3JFYWNoKGFuYWx5emVkRmlsZSA9PiB7XG4gICAgICAgIGNvbnN0IHJlY29yZHMgPSB0aGlzLmNvbXBpbGVyLnJlY29yZHNGb3IoYW5hbHl6ZWRGaWxlKTtcbiAgICAgICAgaWYgKHJlY29yZHMgPT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Fzc2VydGlvbiBlcnJvcjogZmlsZSB0byBtaWdyYXRlIG11c3QgaGF2ZSByZWNvcmRzLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVjb3Jkcy5mb3JFYWNoKHJlY29yZCA9PiB7XG4gICAgICAgICAgY29uc3QgYWRkRGlhZ25vc3RpYyA9IChkaWFnbm9zdGljOiB0cy5EaWFnbm9zdGljKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVjb3JkLm1ldGFEaWFnbm9zdGljcyA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICByZWNvcmQubWV0YURpYWdub3N0aWNzID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZWNvcmQubWV0YURpYWdub3N0aWNzLnB1c2goZGlhZ25vc3RpYyk7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBtaWdyYXRpb24uYXBwbHkocmVjb3JkLm5vZGUsIG1pZ3JhdGlvbkhvc3QpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICBhZGREaWFnbm9zdGljKHJlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGlzRmF0YWxEaWFnbm9zdGljRXJyb3IoZSkpIHtcbiAgICAgICAgICAgICAgYWRkRGlhZ25vc3RpYyhlLnRvRGlhZ25vc3RpYygpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIHJlcG9ydERpYWdub3N0aWNzKCkge1xuICAgIHRoaXMuY29tcGlsZXIuZGlhZ25vc3RpY3MuZm9yRWFjaCh0aGlzLmRpYWdub3N0aWNIYW5kbGVyKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBjb21waWxlRmlsZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogQ29tcGlsZWRGaWxlIHtcbiAgICBjb25zdCBjb25zdGFudFBvb2wgPSBuZXcgQ29uc3RhbnRQb29sKCk7XG4gICAgY29uc3QgcmVjb3JkcyA9IHRoaXMuY29tcGlsZXIucmVjb3Jkc0Zvcihzb3VyY2VGaWxlKTtcbiAgICBpZiAocmVjb3JkcyA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdBc3NlcnRpb24gZXJyb3I6IGZpbGUgdG8gY29tcGlsZSBtdXN0IGhhdmUgcmVjb3Jkcy4nKTtcbiAgICB9XG5cbiAgICBjb25zdCBjb21waWxlZENsYXNzZXM6IENvbXBpbGVkQ2xhc3NbXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCByZWNvcmQgb2YgcmVjb3Jkcykge1xuICAgICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmNvbXBpbGVyLmNvbXBpbGUocmVjb3JkLm5vZGUsIGNvbnN0YW50UG9vbCk7XG4gICAgICBpZiAoY29tcGlsYXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbXBpbGVkQ2xhc3Nlcy5wdXNoKHtcbiAgICAgICAgbmFtZTogcmVjb3JkLm5vZGUubmFtZS50ZXh0LFxuICAgICAgICBkZWNvcmF0b3JzOiB0aGlzLmNvbXBpbGVyLmdldEFsbERlY29yYXRvcnMocmVjb3JkLm5vZGUpLFxuICAgICAgICBkZWNsYXJhdGlvbjogcmVjb3JkLm5vZGUsXG4gICAgICAgIGNvbXBpbGF0aW9uXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCByZWV4cG9ydHMgPSB0aGlzLmdldFJlZXhwb3J0c0ZvclNvdXJjZUZpbGUoc291cmNlRmlsZSk7XG4gICAgcmV0dXJuIHtjb25zdGFudFBvb2wsIHNvdXJjZUZpbGU6IHNvdXJjZUZpbGUsIGNvbXBpbGVkQ2xhc3NlcywgcmVleHBvcnRzfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UmVleHBvcnRzRm9yU291cmNlRmlsZShzZjogdHMuU291cmNlRmlsZSk6IFJlZXhwb3J0W10ge1xuICAgIGNvbnN0IGV4cG9ydFN0YXRlbWVudHMgPSB0aGlzLmNvbXBpbGVyLmV4cG9ydFN0YXRlbWVudHM7XG4gICAgaWYgKCFleHBvcnRTdGF0ZW1lbnRzLmhhcyhzZi5maWxlTmFtZSkpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3QgZXhwb3J0cyA9IGV4cG9ydFN0YXRlbWVudHMuZ2V0KHNmLmZpbGVOYW1lKSE7XG5cbiAgICBjb25zdCByZWV4cG9ydHM6IFJlZXhwb3J0W10gPSBbXTtcbiAgICBleHBvcnRzLmZvckVhY2goKFtmcm9tTW9kdWxlLCBzeW1ib2xOYW1lXSwgYXNBbGlhcykgPT4ge1xuICAgICAgcmVleHBvcnRzLnB1c2goe2FzQWxpYXMsIGZyb21Nb2R1bGUsIHN5bWJvbE5hbWV9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVleHBvcnRzO1xuICB9XG59XG4iXX0=