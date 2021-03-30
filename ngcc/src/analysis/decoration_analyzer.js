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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbl9hbmFseXplci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9hbmFseXNpcy9kZWNvcmF0aW9uX2FuYWx5emVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw4Q0FBK0M7SUFJL0MsMkVBQW9OO0lBQ3BOLGlFQUFxRTtJQUNyRSwyRUFBc0U7SUFDdEUsMkVBQTZHO0lBQzdHLG1FQUF3TjtJQUN4TixxRUFBZ0s7SUFDaEssdUZBQXNFO0lBQ3RFLCtEQUFrRztJQUlsRyx1SEFBc0Y7SUFDdEYscUhBQW9GO0lBQ3BGLHVIQUFzRjtJQUd0Rix5RkFBc0Q7SUFDdEQsbUdBQXdEO0lBQ3hELHVFQUF3RTtJQUN4RSxxRUFBZ0U7SUFJaEU7O09BRUc7SUFDSDtRQUNFLDRCQUFvQixFQUFjO1lBQWQsT0FBRSxHQUFGLEVBQUUsQ0FBWTtZQUNsQyxlQUFVLEdBQUcsS0FBSyxDQUFDO1FBRGtCLENBQUM7UUFFdEMsb0NBQU8sR0FBUDtZQUNFLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUN0QyxDQUFDO1FBQ0QsaUNBQUksR0FBSixVQUFLLEdBQVc7WUFDZCxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLHFCQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN4QyxDQUFDO1FBQ0Qsb0NBQU8sR0FBUCxVQUFRLEdBQVcsRUFBRSxjQUFzQjtZQUN6QyxPQUFPLHFCQUFPLENBQUMscUJBQU8sQ0FBQywwQkFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUNILHlCQUFDO0lBQUQsQ0FBQyxBQVpELElBWUM7SUFFRDs7T0FFRztJQUNIO1FBbUZFLDRCQUNZLEVBQWMsRUFBVSxNQUF3QixFQUNo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STt3QkFDeEIsV0FBVyxhQUFBO3FCQUNaLENBQUMsQ0FBQztpQkFDSjs7Ozs7Ozs7O1lBRUQsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzdELE9BQU8sRUFBQyxZQUFZLGNBQUEsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLGVBQWUsaUJBQUEsRUFBRSxTQUFTLFdBQUEsRUFBQyxDQUFDO1FBQzVFLENBQUM7UUFFTyxzREFBeUIsR0FBakMsVUFBa0MsRUFBaUI7WUFDakQsSUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDO1lBQ3hELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUN0QyxPQUFPLEVBQUUsQ0FBQzthQUNYO1lBQ0QsSUFBTSxPQUFPLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUUsQ0FBQztZQUVuRCxJQUFNLFNBQVMsR0FBZSxFQUFFLENBQUM7WUFDakMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFDLEVBQXdCLEVBQUUsT0FBTztvQkFBakMsS0FBQSxxQkFBd0IsRUFBdkIsVUFBVSxRQUFBLEVBQUUsVUFBVSxRQUFBO2dCQUN0QyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUMsT0FBTyxTQUFBLEVBQUUsVUFBVSxZQUFBLEVBQUUsVUFBVSxZQUFBLEVBQUMsQ0FBQyxDQUFDO1lBQ3BELENBQUMsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxTQUFTLENBQUM7UUFDbkIsQ0FBQztRQUNILHlCQUFDO0lBQUQsQ0FBQyxBQXBNRCxJQW9NQztJQXBNWSxnREFBa0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Q29uc3RhbnRQb29sfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtQYXJzZWRDb25maWd1cmF0aW9ufSBmcm9tICcuLi8uLi8uLic7XG5pbXBvcnQge0NvbXBvbmVudERlY29yYXRvckhhbmRsZXIsIERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIsIEluamVjdGFibGVEZWNvcmF0b3JIYW5kbGVyLCBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIsIFBpcGVEZWNvcmF0b3JIYW5kbGVyLCBSZWZlcmVuY2VzUmVnaXN0cnksIFJlc291cmNlTG9hZGVyfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvYW5ub3RhdGlvbnMnO1xuaW1wb3J0IHtDeWNsZUFuYWx5emVyLCBJbXBvcnRHcmFwaH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2N5Y2xlcyc7XG5pbXBvcnQge2lzRmF0YWxEaWFnbm9zdGljRXJyb3J9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9kaWFnbm9zdGljcyc7XG5pbXBvcnQge2Fic29sdXRlRnJvbSwgZGlybmFtZSwgRmlsZVN5c3RlbSwgTG9naWNhbEZpbGVTeXN0ZW0sIHJlc29sdmV9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0Fic29sdXRlTW9kdWxlU3RyYXRlZ3ksIExvY2FsSWRlbnRpZmllclN0cmF0ZWd5LCBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5LCBNb2R1bGVSZXNvbHZlciwgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUiwgUHJpdmF0ZUV4cG9ydEFsaWFzaW5nSG9zdCwgUmVleHBvcnQsIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9pbXBvcnRzJztcbmltcG9ydCB7Q29tcG91bmRNZXRhZGF0YVJlYWRlciwgQ29tcG91bmRNZXRhZGF0YVJlZ2lzdHJ5LCBEdHNNZXRhZGF0YVJlYWRlciwgSW5qZWN0YWJsZUNsYXNzUmVnaXN0cnksIExvY2FsTWV0YWRhdGFSZWdpc3RyeX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL21ldGFkYXRhJztcbmltcG9ydCB7UGFydGlhbEV2YWx1YXRvcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7TG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LCBNZXRhZGF0YUR0c01vZHVsZVNjb3BlUmVzb2x2ZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9zY29wZSc7XG5pbXBvcnQge0RlY29yYXRvckhhbmRsZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy90cmFuc2Zvcm0nO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7TWlncmF0aW9ufSBmcm9tICcuLi9taWdyYXRpb25zL21pZ3JhdGlvbic7XG5pbXBvcnQge01pc3NpbmdJbmplY3RhYmxlTWlncmF0aW9ufSBmcm9tICcuLi9taWdyYXRpb25zL21pc3NpbmdfaW5qZWN0YWJsZV9taWdyYXRpb24nO1xuaW1wb3J0IHtVbmRlY29yYXRlZENoaWxkTWlncmF0aW9ufSBmcm9tICcuLi9taWdyYXRpb25zL3VuZGVjb3JhdGVkX2NoaWxkX21pZ3JhdGlvbic7XG5pbXBvcnQge1VuZGVjb3JhdGVkUGFyZW50TWlncmF0aW9ufSBmcm9tICcuLi9taWdyYXRpb25zL3VuZGVjb3JhdGVkX3BhcmVudF9taWdyYXRpb24nO1xuaW1wb3J0IHtFbnRyeVBvaW50QnVuZGxlfSBmcm9tICcuLi9wYWNrYWdlcy9lbnRyeV9wb2ludF9idW5kbGUnO1xuXG5pbXBvcnQge0RlZmF1bHRNaWdyYXRpb25Ib3N0fSBmcm9tICcuL21pZ3JhdGlvbl9ob3N0JztcbmltcG9ydCB7TmdjY1RyYWl0Q29tcGlsZXJ9IGZyb20gJy4vbmdjY190cmFpdF9jb21waWxlcic7XG5pbXBvcnQge0NvbXBpbGVkQ2xhc3MsIENvbXBpbGVkRmlsZSwgRGVjb3JhdGlvbkFuYWx5c2VzfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7aXNXaXRoaW5QYWNrYWdlLCBOT09QX0RFUEVOREVOQ1lfVFJBQ0tFUn0gZnJvbSAnLi91dGlsJztcblxuXG5cbi8qKlxuICogU2ltcGxlIGNsYXNzIHRoYXQgcmVzb2x2ZXMgYW5kIGxvYWRzIGZpbGVzIGRpcmVjdGx5IGZyb20gdGhlIGZpbGVzeXN0ZW0uXG4gKi9cbmNsYXNzIE5nY2NSZXNvdXJjZUxvYWRlciBpbXBsZW1lbnRzIFJlc291cmNlTG9hZGVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmczogRmlsZVN5c3RlbSkge31cbiAgY2FuUHJlbG9hZCA9IGZhbHNlO1xuICBwcmVsb2FkKCk6IHVuZGVmaW5lZHxQcm9taXNlPHZvaWQ+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuICBsb2FkKHVybDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5mcy5yZWFkRmlsZShyZXNvbHZlKHVybCkpO1xuICB9XG4gIHJlc29sdmUodXJsOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiByZXNvbHZlKGRpcm5hbWUoYWJzb2x1dGVGcm9tKGNvbnRhaW5pbmdGaWxlKSksIHVybCk7XG4gIH1cbn1cblxuLyoqXG4gKiBUaGlzIEFuYWx5emVyIHdpbGwgYW5hbHl6ZSB0aGUgZmlsZXMgdGhhdCBoYXZlIGRlY29yYXRlZCBjbGFzc2VzIHRoYXQgbmVlZCB0byBiZSB0cmFuc2Zvcm1lZC5cbiAqL1xuZXhwb3J0IGNsYXNzIERlY29yYXRpb25BbmFseXplciB7XG4gIHByaXZhdGUgcHJvZ3JhbSA9IHRoaXMuYnVuZGxlLnNyYy5wcm9ncmFtO1xuICBwcml2YXRlIG9wdGlvbnMgPSB0aGlzLmJ1bmRsZS5zcmMub3B0aW9ucztcbiAgcHJpdmF0ZSBob3N0ID0gdGhpcy5idW5kbGUuc3JjLmhvc3Q7XG4gIHByaXZhdGUgdHlwZUNoZWNrZXIgPSB0aGlzLmJ1bmRsZS5zcmMucHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuICBwcml2YXRlIHJvb3REaXJzID0gdGhpcy5idW5kbGUucm9vdERpcnM7XG4gIHByaXZhdGUgcGFja2FnZVBhdGggPSB0aGlzLmJ1bmRsZS5lbnRyeVBvaW50LnBhY2thZ2U7XG4gIHByaXZhdGUgaXNDb3JlID0gdGhpcy5idW5kbGUuaXNDb3JlO1xuICBwcml2YXRlIGNvbXBpbGVyT3B0aW9ucyA9IHRoaXMudHNDb25maWcgIT09IG51bGwgPyB0aGlzLnRzQ29uZmlnLm9wdGlvbnMgOiB7fTtcblxuICBtb2R1bGVSZXNvbHZlciA9XG4gICAgICBuZXcgTW9kdWxlUmVzb2x2ZXIodGhpcy5wcm9ncmFtLCB0aGlzLm9wdGlvbnMsIHRoaXMuaG9zdCwgLyogbW9kdWxlUmVzb2x1dGlvbkNhY2hlICovIG51bGwpO1xuICByZXNvdXJjZU1hbmFnZXIgPSBuZXcgTmdjY1Jlc291cmNlTG9hZGVyKHRoaXMuZnMpO1xuICBtZXRhUmVnaXN0cnkgPSBuZXcgTG9jYWxNZXRhZGF0YVJlZ2lzdHJ5KCk7XG4gIGR0c01ldGFSZWFkZXIgPSBuZXcgRHRzTWV0YWRhdGFSZWFkZXIodGhpcy50eXBlQ2hlY2tlciwgdGhpcy5yZWZsZWN0aW9uSG9zdCk7XG4gIGZ1bGxNZXRhUmVhZGVyID0gbmV3IENvbXBvdW5kTWV0YWRhdGFSZWFkZXIoW3RoaXMubWV0YVJlZ2lzdHJ5LCB0aGlzLmR0c01ldGFSZWFkZXJdKTtcbiAgcmVmRW1pdHRlciA9IG5ldyBSZWZlcmVuY2VFbWl0dGVyKFtcbiAgICBuZXcgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3koKSxcbiAgICBuZXcgQWJzb2x1dGVNb2R1bGVTdHJhdGVneShcbiAgICAgICAgdGhpcy5wcm9ncmFtLCB0aGlzLnR5cGVDaGVja2VyLCB0aGlzLm1vZHVsZVJlc29sdmVyLCB0aGlzLnJlZmxlY3Rpb25Ib3N0KSxcbiAgICAvLyBUT0RPKGFseGh1Yik6IHRoZXJlJ3Mgbm8gcmVhc29uIHdoeSBuZ2NjIG5lZWRzIHRoZSBcImxvZ2ljYWwgZmlsZSBzeXN0ZW1cIiBsb2dpYyBoZXJlLCBhcyBuZ2NjXG4gICAgLy8gcHJvamVjdHMgb25seSBldmVyIGhhdmUgb25lIHJvb3REaXIuIEluc3RlYWQsIG5nY2Mgc2hvdWxkIGp1c3Qgc3dpdGNoIGl0cyBlbWl0dGVkIGltcG9ydFxuICAgIC8vIGJhc2VkIG9uIHdoZXRoZXIgYSBiZXN0R3Vlc3NPd25pbmdNb2R1bGUgaXMgcHJlc2VudCBpbiB0aGUgUmVmZXJlbmNlLlxuICAgIG5ldyBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5KFxuICAgICAgICB0aGlzLnJlZmxlY3Rpb25Ib3N0LCBuZXcgTG9naWNhbEZpbGVTeXN0ZW0odGhpcy5yb290RGlycywgdGhpcy5ob3N0KSksXG4gIF0pO1xuICBhbGlhc2luZ0hvc3QgPSB0aGlzLmJ1bmRsZS5lbnRyeVBvaW50LmdlbmVyYXRlRGVlcFJlZXhwb3J0cyA/XG4gICAgICBuZXcgUHJpdmF0ZUV4cG9ydEFsaWFzaW5nSG9zdCh0aGlzLnJlZmxlY3Rpb25Ib3N0KSA6XG4gICAgICBudWxsO1xuICBkdHNNb2R1bGVTY29wZVJlc29sdmVyID1cbiAgICAgIG5ldyBNZXRhZGF0YUR0c01vZHVsZVNjb3BlUmVzb2x2ZXIodGhpcy5kdHNNZXRhUmVhZGVyLCB0aGlzLmFsaWFzaW5nSG9zdCk7XG4gIHNjb3BlUmVnaXN0cnkgPSBuZXcgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5KFxuICAgICAgdGhpcy5tZXRhUmVnaXN0cnksIHRoaXMuZHRzTW9kdWxlU2NvcGVSZXNvbHZlciwgdGhpcy5yZWZFbWl0dGVyLCB0aGlzLmFsaWFzaW5nSG9zdCk7XG4gIGZ1bGxSZWdpc3RyeSA9IG5ldyBDb21wb3VuZE1ldGFkYXRhUmVnaXN0cnkoW3RoaXMubWV0YVJlZ2lzdHJ5LCB0aGlzLnNjb3BlUmVnaXN0cnldKTtcbiAgZXZhbHVhdG9yID1cbiAgICAgIG5ldyBQYXJ0aWFsRXZhbHVhdG9yKHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMudHlwZUNoZWNrZXIsIC8qIGRlcGVuZGVuY3lUcmFja2VyICovIG51bGwpO1xuICBpbXBvcnRHcmFwaCA9IG5ldyBJbXBvcnRHcmFwaCh0aGlzLm1vZHVsZVJlc29sdmVyKTtcbiAgY3ljbGVBbmFseXplciA9IG5ldyBDeWNsZUFuYWx5emVyKHRoaXMuaW1wb3J0R3JhcGgpO1xuICBpbmplY3RhYmxlUmVnaXN0cnkgPSBuZXcgSW5qZWN0YWJsZUNsYXNzUmVnaXN0cnkodGhpcy5yZWZsZWN0aW9uSG9zdCk7XG4gIGhhbmRsZXJzOiBEZWNvcmF0b3JIYW5kbGVyPHVua25vd24sIHVua25vd24sIHVua25vd24+W10gPSBbXG4gICAgbmV3IENvbXBvbmVudERlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLmZ1bGxSZWdpc3RyeSwgdGhpcy5mdWxsTWV0YVJlYWRlcixcbiAgICAgICAgdGhpcy5zY29wZVJlZ2lzdHJ5LCB0aGlzLnNjb3BlUmVnaXN0cnksIHRoaXMuaXNDb3JlLCB0aGlzLnJlc291cmNlTWFuYWdlciwgdGhpcy5yb290RGlycyxcbiAgICAgICAgISF0aGlzLmNvbXBpbGVyT3B0aW9ucy5wcmVzZXJ2ZVdoaXRlc3BhY2VzLFxuICAgICAgICAvKiBpMThuVXNlRXh0ZXJuYWxJZHMgKi8gdHJ1ZSwgdGhpcy5idW5kbGUuZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdCxcbiAgICAgICAgLyogaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzICovIGZhbHNlLCB0aGlzLm1vZHVsZVJlc29sdmVyLCB0aGlzLmN5Y2xlQW5hbHl6ZXIsXG4gICAgICAgIHRoaXMucmVmRW1pdHRlciwgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUiwgTk9PUF9ERVBFTkRFTkNZX1RSQUNLRVIsXG4gICAgICAgIHRoaXMuaW5qZWN0YWJsZVJlZ2lzdHJ5LCAvKiBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlciAqLyBmYWxzZSksXG4gICAgLy8gU2VlIHRoZSBub3RlIGluIG5ndHNjIGFib3V0IHdoeSB0aGlzIGNhc3QgaXMgbmVlZGVkLlxuICAgIC8vIGNsYW5nLWZvcm1hdCBvZmZcbiAgICBuZXcgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgdGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5ldmFsdWF0b3IsIHRoaXMuZnVsbFJlZ2lzdHJ5LCB0aGlzLnNjb3BlUmVnaXN0cnksXG4gICAgICAgIHRoaXMuZnVsbE1ldGFSZWFkZXIsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsIHRoaXMuaW5qZWN0YWJsZVJlZ2lzdHJ5LCB0aGlzLmlzQ29yZSxcbiAgICAgICAgLyogYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIgKi8gZmFsc2UsXG4gICAgICAgIC8vIEluIG5nY2Mgd2Ugd2FudCB0byBjb21waWxlIHVuZGVjb3JhdGVkIGNsYXNzZXMgd2l0aCBBbmd1bGFyIGZlYXR1cmVzLiBBcyBvZlxuICAgICAgICAvLyB2ZXJzaW9uIDEwLCB1bmRlY29yYXRlZCBjbGFzc2VzIHRoYXQgdXNlIEFuZ3VsYXIgZmVhdHVyZXMgYXJlIG5vIGxvbmdlciBoYW5kbGVkXG4gICAgICAgIC8vIGluIG5ndHNjLCBidXQgd2Ugd2FudCB0byBlbnN1cmUgY29tcGF0aWJpbGl0eSBpbiBuZ2NjIGZvciBvdXRkYXRlZCBsaWJyYXJpZXMgdGhhdFxuICAgICAgICAvLyBoYXZlIG5vdCBtaWdyYXRlZCB0byBleHBsaWNpdCBkZWNvcmF0b3JzLiBTZWU6IGh0dHBzOi8vaGFja21kLmlvL0BhbHgvcnlmWVl1dnpILlxuICAgICAgICAvKiBjb21waWxlVW5kZWNvcmF0ZWRDbGFzc2VzV2l0aEFuZ3VsYXJGZWF0dXJlcyAqLyB0cnVlXG4gICAgKSBhcyBEZWNvcmF0b3JIYW5kbGVyPHVua25vd24sIHVua25vd24sIHVua25vd24+LFxuICAgIC8vIGNsYW5nLWZvcm1hdCBvblxuICAgIC8vIFBpcGUgaGFuZGxlciBtdXN0IGJlIGJlZm9yZSBpbmplY3RhYmxlIGhhbmRsZXIgaW4gbGlzdCBzbyBwaXBlIGZhY3RvcmllcyBhcmUgcHJpbnRlZFxuICAgIC8vIGJlZm9yZSBpbmplY3RhYmxlIGZhY3RvcmllcyAoc28gaW5qZWN0YWJsZSBmYWN0b3JpZXMgY2FuIGRlbGVnYXRlIHRvIHRoZW0pXG4gICAgbmV3IFBpcGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICB0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmV2YWx1YXRvciwgdGhpcy5tZXRhUmVnaXN0cnksIHRoaXMuc2NvcGVSZWdpc3RyeSxcbiAgICAgICAgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUiwgdGhpcy5pbmplY3RhYmxlUmVnaXN0cnksIHRoaXMuaXNDb3JlKSxcbiAgICBuZXcgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsIHRoaXMuaXNDb3JlLFxuICAgICAgICAvKiBzdHJpY3RDdG9yRGVwcyAqLyBmYWxzZSwgdGhpcy5pbmplY3RhYmxlUmVnaXN0cnksIC8qIGVycm9yT25EdXBsaWNhdGVQcm92ICovIGZhbHNlKSxcbiAgICBuZXcgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICB0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmV2YWx1YXRvciwgdGhpcy5mdWxsTWV0YVJlYWRlciwgdGhpcy5mdWxsUmVnaXN0cnksXG4gICAgICAgIHRoaXMuc2NvcGVSZWdpc3RyeSwgdGhpcy5yZWZlcmVuY2VzUmVnaXN0cnksIHRoaXMuaXNDb3JlLCAvKiByb3V0ZUFuYWx5emVyICovIG51bGwsXG4gICAgICAgIHRoaXMucmVmRW1pdHRlcixcbiAgICAgICAgLyogZmFjdG9yeVRyYWNrZXIgKi8gbnVsbCwgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUixcbiAgICAgICAgLyogYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIgKi8gZmFsc2UsIHRoaXMuaW5qZWN0YWJsZVJlZ2lzdHJ5KSxcbiAgXTtcbiAgY29tcGlsZXIgPSBuZXcgTmdjY1RyYWl0Q29tcGlsZXIodGhpcy5oYW5kbGVycywgdGhpcy5yZWZsZWN0aW9uSG9zdCk7XG4gIG1pZ3JhdGlvbnM6IE1pZ3JhdGlvbltdID0gW1xuICAgIG5ldyBVbmRlY29yYXRlZFBhcmVudE1pZ3JhdGlvbigpLFxuICAgIG5ldyBVbmRlY29yYXRlZENoaWxkTWlncmF0aW9uKCksXG4gICAgbmV3IE1pc3NpbmdJbmplY3RhYmxlTWlncmF0aW9uKCksXG4gIF07XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGZzOiBGaWxlU3lzdGVtLCBwcml2YXRlIGJ1bmRsZTogRW50cnlQb2ludEJ1bmRsZSxcbiAgICAgIHByaXZhdGUgcmVmbGVjdGlvbkhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgZGlhZ25vc3RpY0hhbmRsZXI6IChlcnJvcjogdHMuRGlhZ25vc3RpYykgPT4gdm9pZCA9ICgpID0+IHt9LFxuICAgICAgcHJpdmF0ZSB0c0NvbmZpZzogUGFyc2VkQ29uZmlndXJhdGlvbnxudWxsID0gbnVsbCkge31cblxuICAvKipcbiAgICogQW5hbHl6ZSBhIHByb2dyYW0gdG8gZmluZCBhbGwgdGhlIGRlY29yYXRlZCBmaWxlcyBzaG91bGQgYmUgdHJhbnNmb3JtZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIGEgbWFwIG9mIHRoZSBzb3VyY2UgZmlsZXMgdG8gdGhlIGFuYWx5c2lzIGZvciB0aG9zZSBmaWxlcy5cbiAgICovXG4gIGFuYWx5emVQcm9ncmFtKCk6IERlY29yYXRpb25BbmFseXNlcyB7XG4gICAgZm9yIChjb25zdCBzb3VyY2VGaWxlIG9mIHRoaXMucHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICBpZiAoIXNvdXJjZUZpbGUuaXNEZWNsYXJhdGlvbkZpbGUgJiYgaXNXaXRoaW5QYWNrYWdlKHRoaXMucGFja2FnZVBhdGgsIHNvdXJjZUZpbGUpKSB7XG4gICAgICAgIHRoaXMuY29tcGlsZXIuYW5hbHl6ZUZpbGUoc291cmNlRmlsZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5hcHBseU1pZ3JhdGlvbnMoKTtcblxuICAgIHRoaXMuY29tcGlsZXIucmVzb2x2ZSgpO1xuXG4gICAgdGhpcy5yZXBvcnREaWFnbm9zdGljcygpO1xuXG4gICAgY29uc3QgZGVjb3JhdGlvbkFuYWx5c2VzID0gbmV3IERlY29yYXRpb25BbmFseXNlcygpO1xuICAgIGZvciAoY29uc3QgYW5hbHl6ZWRGaWxlIG9mIHRoaXMuY29tcGlsZXIuYW5hbHl6ZWRGaWxlcykge1xuICAgICAgY29uc3QgY29tcGlsZWRGaWxlID0gdGhpcy5jb21waWxlRmlsZShhbmFseXplZEZpbGUpO1xuICAgICAgZGVjb3JhdGlvbkFuYWx5c2VzLnNldChjb21waWxlZEZpbGUuc291cmNlRmlsZSwgY29tcGlsZWRGaWxlKTtcbiAgICB9XG4gICAgcmV0dXJuIGRlY29yYXRpb25BbmFseXNlcztcbiAgfVxuXG4gIHByb3RlY3RlZCBhcHBseU1pZ3JhdGlvbnMoKTogdm9pZCB7XG4gICAgY29uc3QgbWlncmF0aW9uSG9zdCA9IG5ldyBEZWZhdWx0TWlncmF0aW9uSG9zdChcbiAgICAgICAgdGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5mdWxsTWV0YVJlYWRlciwgdGhpcy5ldmFsdWF0b3IsIHRoaXMuY29tcGlsZXIsXG4gICAgICAgIHRoaXMuYnVuZGxlLmVudHJ5UG9pbnQucGF0aCk7XG5cbiAgICB0aGlzLm1pZ3JhdGlvbnMuZm9yRWFjaChtaWdyYXRpb24gPT4ge1xuICAgICAgdGhpcy5jb21waWxlci5hbmFseXplZEZpbGVzLmZvckVhY2goYW5hbHl6ZWRGaWxlID0+IHtcbiAgICAgICAgY29uc3QgcmVjb3JkcyA9IHRoaXMuY29tcGlsZXIucmVjb3Jkc0ZvcihhbmFseXplZEZpbGUpO1xuICAgICAgICBpZiAocmVjb3JkcyA9PT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQXNzZXJ0aW9uIGVycm9yOiBmaWxlIHRvIG1pZ3JhdGUgbXVzdCBoYXZlIHJlY29yZHMuJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZWNvcmRzLmZvckVhY2gocmVjb3JkID0+IHtcbiAgICAgICAgICBjb25zdCBhZGREaWFnbm9zdGljID0gKGRpYWdub3N0aWM6IHRzLkRpYWdub3N0aWMpID0+IHtcbiAgICAgICAgICAgIGlmIChyZWNvcmQubWV0YURpYWdub3N0aWNzID09PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlY29yZC5tZXRhRGlhZ25vc3RpY3MgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlY29yZC5tZXRhRGlhZ25vc3RpY3MucHVzaChkaWFnbm9zdGljKTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IG1pZ3JhdGlvbi5hcHBseShyZWNvcmQubm9kZSwgbWlncmF0aW9uSG9zdCk7XG4gICAgICAgICAgICBpZiAocmVzdWx0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIGFkZERpYWdub3N0aWMocmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBpZiAoaXNGYXRhbERpYWdub3N0aWNFcnJvcihlKSkge1xuICAgICAgICAgICAgICBhZGREaWFnbm9zdGljKGUudG9EaWFnbm9zdGljKCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgcmVwb3J0RGlhZ25vc3RpY3MoKSB7XG4gICAgdGhpcy5jb21waWxlci5kaWFnbm9zdGljcy5mb3JFYWNoKHRoaXMuZGlhZ25vc3RpY0hhbmRsZXIpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGNvbXBpbGVGaWxlKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBDb21waWxlZEZpbGUge1xuICAgIGNvbnN0IGNvbnN0YW50UG9vbCA9IG5ldyBDb25zdGFudFBvb2woKTtcbiAgICBjb25zdCByZWNvcmRzID0gdGhpcy5jb21waWxlci5yZWNvcmRzRm9yKHNvdXJjZUZpbGUpO1xuICAgIGlmIChyZWNvcmRzID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Fzc2VydGlvbiBlcnJvcjogZmlsZSB0byBjb21waWxlIG11c3QgaGF2ZSByZWNvcmRzLicpO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbXBpbGVkQ2xhc3NlczogQ29tcGlsZWRDbGFzc1tdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IHJlY29yZCBvZiByZWNvcmRzKSB7XG4gICAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuY29tcGlsZXIuY29tcGlsZShyZWNvcmQubm9kZSwgY29uc3RhbnRQb29sKTtcbiAgICAgIGlmIChjb21waWxhdGlvbiA9PT0gbnVsbCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29tcGlsZWRDbGFzc2VzLnB1c2goe1xuICAgICAgICBuYW1lOiByZWNvcmQubm9kZS5uYW1lLnRleHQsXG4gICAgICAgIGRlY29yYXRvcnM6IHRoaXMuY29tcGlsZXIuZ2V0QWxsRGVjb3JhdG9ycyhyZWNvcmQubm9kZSksXG4gICAgICAgIGRlY2xhcmF0aW9uOiByZWNvcmQubm9kZSxcbiAgICAgICAgY29tcGlsYXRpb25cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IHJlZXhwb3J0cyA9IHRoaXMuZ2V0UmVleHBvcnRzRm9yU291cmNlRmlsZShzb3VyY2VGaWxlKTtcbiAgICByZXR1cm4ge2NvbnN0YW50UG9vbCwgc291cmNlRmlsZTogc291cmNlRmlsZSwgY29tcGlsZWRDbGFzc2VzLCByZWV4cG9ydHN9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRSZWV4cG9ydHNGb3JTb3VyY2VGaWxlKHNmOiB0cy5Tb3VyY2VGaWxlKTogUmVleHBvcnRbXSB7XG4gICAgY29uc3QgZXhwb3J0U3RhdGVtZW50cyA9IHRoaXMuY29tcGlsZXIuZXhwb3J0U3RhdGVtZW50cztcbiAgICBpZiAoIWV4cG9ydFN0YXRlbWVudHMuaGFzKHNmLmZpbGVOYW1lKSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBjb25zdCBleHBvcnRzID0gZXhwb3J0U3RhdGVtZW50cy5nZXQoc2YuZmlsZU5hbWUpITtcblxuICAgIGNvbnN0IHJlZXhwb3J0czogUmVleHBvcnRbXSA9IFtdO1xuICAgIGV4cG9ydHMuZm9yRWFjaCgoW2Zyb21Nb2R1bGUsIHN5bWJvbE5hbWVdLCBhc0FsaWFzKSA9PiB7XG4gICAgICByZWV4cG9ydHMucHVzaCh7YXNBbGlhcywgZnJvbU1vZHVsZSwgc3ltYm9sTmFtZX0pO1xuICAgIH0pO1xuICAgIHJldHVybiByZWV4cG9ydHM7XG4gIH1cbn1cbiJdfQ==