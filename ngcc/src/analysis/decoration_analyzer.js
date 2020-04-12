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
            this.injectableRegistry = new metadata_1.InjectableClassRegistry(this.reflectionHost);
            this.handlers = [
                new annotations_1.ComponentDecoratorHandler(this.reflectionHost, this.evaluator, this.fullRegistry, this.fullMetaReader, this.scopeRegistry, this.scopeRegistry, this.isCore, this.resourceManager, this.rootDirs, !!this.compilerOptions.preserveWhitespaces, 
                /* i18nUseExternalIds */ true, this.bundle.enableI18nLegacyMessageIdFormat, this.moduleResolver, this.cycleAnalyzer, this.refEmitter, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, util_1.NOOP_DEPENDENCY_TRACKER, this.injectableRegistry, /* annotateForClosureCompiler */ false),
                // See the note in ngtsc about why this cast is needed.
                // clang-format off
                new annotations_1.DirectiveDecoratorHandler(this.reflectionHost, this.evaluator, this.fullRegistry, this.scopeRegistry, this.fullMetaReader, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, this.injectableRegistry, this.isCore, 
                /* annotateForClosureCompiler */ false),
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
        DecorationAnalyzer.prototype.reportDiagnostics = function () { this.compiler.diagnostics.forEach(this.diagnosticHandler); };
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
                        declaration: record.node, compilation: compilation
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbl9hbmFseXplci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9hbmFseXNpcy9kZWNvcmF0aW9uX2FuYWx5emVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUErQztJQUkvQywyRUFBb047SUFDcE4saUVBQXFFO0lBQ3JFLDJFQUFzRTtJQUN0RSwyRUFBNkc7SUFDN0csbUVBQXdOO0lBQ3hOLHFFQUFnSztJQUNoSyx1RkFBc0U7SUFDdEUsK0RBQWtHO0lBSWxHLHVIQUFzRjtJQUN0RixxSEFBb0Y7SUFDcEYsdUhBQXNGO0lBR3RGLHlGQUFzRDtJQUN0RCxtR0FBd0Q7SUFDeEQsdUVBQXdFO0lBQ3hFLHFFQUFnRTtJQUloRTs7T0FFRztJQUNIO1FBQ0UsNEJBQW9CLEVBQWM7WUFBZCxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQ2xDLGVBQVUsR0FBRyxLQUFLLENBQUM7UUFEa0IsQ0FBQztRQUV0QyxvQ0FBTyxHQUFQLGNBQXFDLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0UsaUNBQUksR0FBSixVQUFLLEdBQVcsSUFBWSxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLHFCQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEUsb0NBQU8sR0FBUCxVQUFRLEdBQVcsRUFBRSxjQUFzQjtZQUN6QyxPQUFPLHFCQUFPLENBQUMscUJBQU8sQ0FBQywwQkFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUNILHlCQUFDO0lBQUQsQ0FBQyxBQVJELElBUUM7SUFFRDs7T0FFRztJQUNIO1FBMEVFLDRCQUNZLEVBQWMsRUFBVSxNQUF3QixFQUNo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WSxjQUFBLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxlQUFlLGlCQUFBLEVBQUUsU0FBUyxXQUFBLEVBQUMsQ0FBQztRQUM1RSxDQUFDO1FBRU8sc0RBQXlCLEdBQWpDLFVBQWtDLEVBQWlCO1lBQ2pELElBQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQztZQUN4RCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDdEMsT0FBTyxFQUFFLENBQUM7YUFDWDtZQUNELElBQU0sT0FBTyxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFHLENBQUM7WUFFcEQsSUFBTSxTQUFTLEdBQWUsRUFBRSxDQUFDO1lBQ2pDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBQyxFQUF3QixFQUFFLE9BQU87b0JBQWpDLDBCQUF3QixFQUF2QixrQkFBVSxFQUFFLGtCQUFVO2dCQUN0QyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUMsT0FBTyxTQUFBLEVBQUUsVUFBVSxZQUFBLEVBQUUsVUFBVSxZQUFBLEVBQUMsQ0FBQyxDQUFDO1lBQ3BELENBQUMsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxTQUFTLENBQUM7UUFDbkIsQ0FBQztRQUNILHlCQUFDO0lBQUQsQ0FBQyxBQXhMRCxJQXdMQztJQXhMWSxnREFBa0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0NvbnN0YW50UG9vbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7UGFyc2VkQ29uZmlndXJhdGlvbn0gZnJvbSAnLi4vLi4vLi4nO1xuaW1wb3J0IHtDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyLCBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyLCBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlciwgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyLCBQaXBlRGVjb3JhdG9ySGFuZGxlciwgUmVmZXJlbmNlc1JlZ2lzdHJ5LCBSZXNvdXJjZUxvYWRlcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2Fubm90YXRpb25zJztcbmltcG9ydCB7Q3ljbGVBbmFseXplciwgSW1wb3J0R3JhcGh9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9jeWNsZXMnO1xuaW1wb3J0IHtpc0ZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtGaWxlU3lzdGVtLCBMb2dpY2FsRmlsZVN5c3RlbSwgYWJzb2x1dGVGcm9tLCBkaXJuYW1lLCByZXNvbHZlfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtBYnNvbHV0ZU1vZHVsZVN0cmF0ZWd5LCBMb2NhbElkZW50aWZpZXJTdHJhdGVneSwgTG9naWNhbFByb2plY3RTdHJhdGVneSwgTW9kdWxlUmVzb2x2ZXIsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsIFByaXZhdGVFeHBvcnRBbGlhc2luZ0hvc3QsIFJlZXhwb3J0LCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvaW1wb3J0cyc7XG5pbXBvcnQge0NvbXBvdW5kTWV0YWRhdGFSZWFkZXIsIENvbXBvdW5kTWV0YWRhdGFSZWdpc3RyeSwgRHRzTWV0YWRhdGFSZWFkZXIsIEluamVjdGFibGVDbGFzc1JlZ2lzdHJ5LCBMb2NhbE1ldGFkYXRhUmVnaXN0cnl9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9tZXRhZGF0YSc7XG5pbXBvcnQge1BhcnRpYWxFdmFsdWF0b3J9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0xvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeSwgTWV0YWRhdGFEdHNNb2R1bGVTY29wZVJlc29sdmVyfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2Mvc2NvcGUnO1xuaW1wb3J0IHtEZWNvcmF0b3JIYW5kbGVyfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvdHJhbnNmb3JtJztcbmltcG9ydCB7TmdjY1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L25nY2NfaG9zdCc7XG5pbXBvcnQge01pZ3JhdGlvbn0gZnJvbSAnLi4vbWlncmF0aW9ucy9taWdyYXRpb24nO1xuaW1wb3J0IHtNaXNzaW5nSW5qZWN0YWJsZU1pZ3JhdGlvbn0gZnJvbSAnLi4vbWlncmF0aW9ucy9taXNzaW5nX2luamVjdGFibGVfbWlncmF0aW9uJztcbmltcG9ydCB7VW5kZWNvcmF0ZWRDaGlsZE1pZ3JhdGlvbn0gZnJvbSAnLi4vbWlncmF0aW9ucy91bmRlY29yYXRlZF9jaGlsZF9taWdyYXRpb24nO1xuaW1wb3J0IHtVbmRlY29yYXRlZFBhcmVudE1pZ3JhdGlvbn0gZnJvbSAnLi4vbWlncmF0aW9ucy91bmRlY29yYXRlZF9wYXJlbnRfbWlncmF0aW9uJztcbmltcG9ydCB7RW50cnlQb2ludEJ1bmRsZX0gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnRfYnVuZGxlJztcblxuaW1wb3J0IHtEZWZhdWx0TWlncmF0aW9uSG9zdH0gZnJvbSAnLi9taWdyYXRpb25faG9zdCc7XG5pbXBvcnQge05nY2NUcmFpdENvbXBpbGVyfSBmcm9tICcuL25nY2NfdHJhaXRfY29tcGlsZXInO1xuaW1wb3J0IHtDb21waWxlZENsYXNzLCBDb21waWxlZEZpbGUsIERlY29yYXRpb25BbmFseXNlc30gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge05PT1BfREVQRU5ERU5DWV9UUkFDS0VSLCBpc1dpdGhpblBhY2thZ2V9IGZyb20gJy4vdXRpbCc7XG5cblxuXG4vKipcbiAqIFNpbXBsZSBjbGFzcyB0aGF0IHJlc29sdmVzIGFuZCBsb2FkcyBmaWxlcyBkaXJlY3RseSBmcm9tIHRoZSBmaWxlc3lzdGVtLlxuICovXG5jbGFzcyBOZ2NjUmVzb3VyY2VMb2FkZXIgaW1wbGVtZW50cyBSZXNvdXJjZUxvYWRlciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZnM6IEZpbGVTeXN0ZW0pIHt9XG4gIGNhblByZWxvYWQgPSBmYWxzZTtcbiAgcHJlbG9hZCgpOiB1bmRlZmluZWR8UHJvbWlzZTx2b2lkPiB7IHRocm93IG5ldyBFcnJvcignTm90IGltcGxlbWVudGVkLicpOyB9XG4gIGxvYWQodXJsOiBzdHJpbmcpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5mcy5yZWFkRmlsZShyZXNvbHZlKHVybCkpOyB9XG4gIHJlc29sdmUodXJsOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiByZXNvbHZlKGRpcm5hbWUoYWJzb2x1dGVGcm9tKGNvbnRhaW5pbmdGaWxlKSksIHVybCk7XG4gIH1cbn1cblxuLyoqXG4gKiBUaGlzIEFuYWx5emVyIHdpbGwgYW5hbHl6ZSB0aGUgZmlsZXMgdGhhdCBoYXZlIGRlY29yYXRlZCBjbGFzc2VzIHRoYXQgbmVlZCB0byBiZSB0cmFuc2Zvcm1lZC5cbiAqL1xuZXhwb3J0IGNsYXNzIERlY29yYXRpb25BbmFseXplciB7XG4gIHByaXZhdGUgcHJvZ3JhbSA9IHRoaXMuYnVuZGxlLnNyYy5wcm9ncmFtO1xuICBwcml2YXRlIG9wdGlvbnMgPSB0aGlzLmJ1bmRsZS5zcmMub3B0aW9ucztcbiAgcHJpdmF0ZSBob3N0ID0gdGhpcy5idW5kbGUuc3JjLmhvc3Q7XG4gIHByaXZhdGUgdHlwZUNoZWNrZXIgPSB0aGlzLmJ1bmRsZS5zcmMucHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuICBwcml2YXRlIHJvb3REaXJzID0gdGhpcy5idW5kbGUucm9vdERpcnM7XG4gIHByaXZhdGUgcGFja2FnZVBhdGggPSB0aGlzLmJ1bmRsZS5lbnRyeVBvaW50LnBhY2thZ2U7XG4gIHByaXZhdGUgaXNDb3JlID0gdGhpcy5idW5kbGUuaXNDb3JlO1xuICBwcml2YXRlIGNvbXBpbGVyT3B0aW9ucyA9IHRoaXMudHNDb25maWcgIT09IG51bGw/IHRoaXMudHNDb25maWcub3B0aW9uczoge307XG5cbiAgbW9kdWxlUmVzb2x2ZXIgPVxuICAgICAgbmV3IE1vZHVsZVJlc29sdmVyKHRoaXMucHJvZ3JhbSwgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3QsIC8qIG1vZHVsZVJlc29sdXRpb25DYWNoZSAqLyBudWxsKTtcbiAgcmVzb3VyY2VNYW5hZ2VyID0gbmV3IE5nY2NSZXNvdXJjZUxvYWRlcih0aGlzLmZzKTtcbiAgbWV0YVJlZ2lzdHJ5ID0gbmV3IExvY2FsTWV0YWRhdGFSZWdpc3RyeSgpO1xuICBkdHNNZXRhUmVhZGVyID0gbmV3IER0c01ldGFkYXRhUmVhZGVyKHRoaXMudHlwZUNoZWNrZXIsIHRoaXMucmVmbGVjdGlvbkhvc3QpO1xuICBmdWxsTWV0YVJlYWRlciA9IG5ldyBDb21wb3VuZE1ldGFkYXRhUmVhZGVyKFt0aGlzLm1ldGFSZWdpc3RyeSwgdGhpcy5kdHNNZXRhUmVhZGVyXSk7XG4gIHJlZkVtaXR0ZXIgPSBuZXcgUmVmZXJlbmNlRW1pdHRlcihbXG4gICAgbmV3IExvY2FsSWRlbnRpZmllclN0cmF0ZWd5KCksXG4gICAgbmV3IEFic29sdXRlTW9kdWxlU3RyYXRlZ3koXG4gICAgICAgIHRoaXMucHJvZ3JhbSwgdGhpcy50eXBlQ2hlY2tlciwgdGhpcy5tb2R1bGVSZXNvbHZlciwgdGhpcy5yZWZsZWN0aW9uSG9zdCksXG4gICAgLy8gVE9ETyhhbHhodWIpOiB0aGVyZSdzIG5vIHJlYXNvbiB3aHkgbmdjYyBuZWVkcyB0aGUgXCJsb2dpY2FsIGZpbGUgc3lzdGVtXCIgbG9naWMgaGVyZSwgYXMgbmdjY1xuICAgIC8vIHByb2plY3RzIG9ubHkgZXZlciBoYXZlIG9uZSByb290RGlyLiBJbnN0ZWFkLCBuZ2NjIHNob3VsZCBqdXN0IHN3aXRjaCBpdHMgZW1pdHRlZCBpbXBvcnRcbiAgICAvLyBiYXNlZCBvbiB3aGV0aGVyIGEgYmVzdEd1ZXNzT3duaW5nTW9kdWxlIGlzIHByZXNlbnQgaW4gdGhlIFJlZmVyZW5jZS5cbiAgICBuZXcgTG9naWNhbFByb2plY3RTdHJhdGVneSh0aGlzLnJlZmxlY3Rpb25Ib3N0LCBuZXcgTG9naWNhbEZpbGVTeXN0ZW0odGhpcy5yb290RGlycykpLFxuICBdKTtcbiAgYWxpYXNpbmdIb3N0ID0gdGhpcy5idW5kbGUuZW50cnlQb2ludC5nZW5lcmF0ZURlZXBSZWV4cG9ydHM/XG4gICAgICAgICAgICAgICAgIG5ldyBQcml2YXRlRXhwb3J0QWxpYXNpbmdIb3N0KHRoaXMucmVmbGVjdGlvbkhvc3QpOiBudWxsO1xuICBkdHNNb2R1bGVTY29wZVJlc29sdmVyID1cbiAgICAgIG5ldyBNZXRhZGF0YUR0c01vZHVsZVNjb3BlUmVzb2x2ZXIodGhpcy5kdHNNZXRhUmVhZGVyLCB0aGlzLmFsaWFzaW5nSG9zdCk7XG4gIHNjb3BlUmVnaXN0cnkgPSBuZXcgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5KFxuICAgICAgdGhpcy5tZXRhUmVnaXN0cnksIHRoaXMuZHRzTW9kdWxlU2NvcGVSZXNvbHZlciwgdGhpcy5yZWZFbWl0dGVyLCB0aGlzLmFsaWFzaW5nSG9zdCk7XG4gIGZ1bGxSZWdpc3RyeSA9IG5ldyBDb21wb3VuZE1ldGFkYXRhUmVnaXN0cnkoW3RoaXMubWV0YVJlZ2lzdHJ5LCB0aGlzLnNjb3BlUmVnaXN0cnldKTtcbiAgZXZhbHVhdG9yID1cbiAgICAgIG5ldyBQYXJ0aWFsRXZhbHVhdG9yKHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMudHlwZUNoZWNrZXIsIC8qIGRlcGVuZGVuY3lUcmFja2VyICovIG51bGwpO1xuICBpbXBvcnRHcmFwaCA9IG5ldyBJbXBvcnRHcmFwaCh0aGlzLm1vZHVsZVJlc29sdmVyKTtcbiAgY3ljbGVBbmFseXplciA9IG5ldyBDeWNsZUFuYWx5emVyKHRoaXMuaW1wb3J0R3JhcGgpO1xuICBpbmplY3RhYmxlUmVnaXN0cnkgPSBuZXcgSW5qZWN0YWJsZUNsYXNzUmVnaXN0cnkodGhpcy5yZWZsZWN0aW9uSG9zdCk7XG4gIGhhbmRsZXJzOiBEZWNvcmF0b3JIYW5kbGVyPHVua25vd24sIHVua25vd24sIHVua25vd24+W10gPSBbXG4gICAgbmV3IENvbXBvbmVudERlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLmZ1bGxSZWdpc3RyeSwgdGhpcy5mdWxsTWV0YVJlYWRlcixcbiAgICAgICAgdGhpcy5zY29wZVJlZ2lzdHJ5LCB0aGlzLnNjb3BlUmVnaXN0cnksIHRoaXMuaXNDb3JlLCB0aGlzLnJlc291cmNlTWFuYWdlciwgdGhpcy5yb290RGlycyxcbiAgICAgICAgISF0aGlzLmNvbXBpbGVyT3B0aW9ucy5wcmVzZXJ2ZVdoaXRlc3BhY2VzLFxuICAgICAgICAvKiBpMThuVXNlRXh0ZXJuYWxJZHMgKi8gdHJ1ZSwgdGhpcy5idW5kbGUuZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdCxcbiAgICAgICAgdGhpcy5tb2R1bGVSZXNvbHZlciwgdGhpcy5jeWNsZUFuYWx5emVyLCB0aGlzLnJlZkVtaXR0ZXIsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsXG4gICAgICAgIE5PT1BfREVQRU5ERU5DWV9UUkFDS0VSLCB0aGlzLmluamVjdGFibGVSZWdpc3RyeSwgLyogYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIgKi8gZmFsc2UpLFxuICAgIC8vIFNlZSB0aGUgbm90ZSBpbiBuZ3RzYyBhYm91dCB3aHkgdGhpcyBjYXN0IGlzIG5lZWRlZC5cbiAgICAvLyBjbGFuZy1mb3JtYXQgb2ZmXG4gICAgbmV3IERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLmZ1bGxSZWdpc3RyeSwgdGhpcy5zY29wZVJlZ2lzdHJ5LFxuICAgICAgICB0aGlzLmZ1bGxNZXRhUmVhZGVyLCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSLCB0aGlzLmluamVjdGFibGVSZWdpc3RyeSwgdGhpcy5pc0NvcmUsXG4gICAgICAgIC8qIGFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyICovIGZhbHNlKSBhcyBEZWNvcmF0b3JIYW5kbGVyPHVua25vd24sIHVua25vd24sIHVua25vd24+LFxuICAgIC8vIGNsYW5nLWZvcm1hdCBvblxuICAgIC8vIFBpcGUgaGFuZGxlciBtdXN0IGJlIGJlZm9yZSBpbmplY3RhYmxlIGhhbmRsZXIgaW4gbGlzdCBzbyBwaXBlIGZhY3RvcmllcyBhcmUgcHJpbnRlZFxuICAgIC8vIGJlZm9yZSBpbmplY3RhYmxlIGZhY3RvcmllcyAoc28gaW5qZWN0YWJsZSBmYWN0b3JpZXMgY2FuIGRlbGVnYXRlIHRvIHRoZW0pXG4gICAgbmV3IFBpcGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICB0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmV2YWx1YXRvciwgdGhpcy5tZXRhUmVnaXN0cnksIHRoaXMuc2NvcGVSZWdpc3RyeSxcbiAgICAgICAgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUiwgdGhpcy5pbmplY3RhYmxlUmVnaXN0cnksIHRoaXMuaXNDb3JlKSxcbiAgICBuZXcgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsIHRoaXMuaXNDb3JlLFxuICAgICAgICAvKiBzdHJpY3RDdG9yRGVwcyAqLyBmYWxzZSwgdGhpcy5pbmplY3RhYmxlUmVnaXN0cnksIC8qIGVycm9yT25EdXBsaWNhdGVQcm92ICovIGZhbHNlKSxcbiAgICBuZXcgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICB0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmV2YWx1YXRvciwgdGhpcy5mdWxsTWV0YVJlYWRlciwgdGhpcy5mdWxsUmVnaXN0cnksXG4gICAgICAgIHRoaXMuc2NvcGVSZWdpc3RyeSwgdGhpcy5yZWZlcmVuY2VzUmVnaXN0cnksIHRoaXMuaXNDb3JlLCAvKiByb3V0ZUFuYWx5emVyICovIG51bGwsXG4gICAgICAgIHRoaXMucmVmRW1pdHRlcixcbiAgICAgICAgLyogZmFjdG9yeVRyYWNrZXIgKi8gbnVsbCwgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUixcbiAgICAgICAgLyogYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIgKi8gZmFsc2UsIHRoaXMuaW5qZWN0YWJsZVJlZ2lzdHJ5KSxcbiAgXTtcbiAgY29tcGlsZXIgPSBuZXcgTmdjY1RyYWl0Q29tcGlsZXIodGhpcy5oYW5kbGVycywgdGhpcy5yZWZsZWN0aW9uSG9zdCk7XG4gIG1pZ3JhdGlvbnM6IE1pZ3JhdGlvbltdID0gW1xuICAgIG5ldyBVbmRlY29yYXRlZFBhcmVudE1pZ3JhdGlvbigpLFxuICAgIG5ldyBVbmRlY29yYXRlZENoaWxkTWlncmF0aW9uKCksXG4gICAgbmV3IE1pc3NpbmdJbmplY3RhYmxlTWlncmF0aW9uKCksXG4gIF07XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGZzOiBGaWxlU3lzdGVtLCBwcml2YXRlIGJ1bmRsZTogRW50cnlQb2ludEJ1bmRsZSxcbiAgICAgIHByaXZhdGUgcmVmbGVjdGlvbkhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgZGlhZ25vc3RpY0hhbmRsZXI6IChlcnJvcjogdHMuRGlhZ25vc3RpYykgPT4gdm9pZCA9ICgpID0+IHt9LFxuICAgICAgcHJpdmF0ZSB0c0NvbmZpZzogUGFyc2VkQ29uZmlndXJhdGlvbnxudWxsID0gbnVsbCkge31cblxuICAvKipcbiAgICogQW5hbHl6ZSBhIHByb2dyYW0gdG8gZmluZCBhbGwgdGhlIGRlY29yYXRlZCBmaWxlcyBzaG91bGQgYmUgdHJhbnNmb3JtZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIGEgbWFwIG9mIHRoZSBzb3VyY2UgZmlsZXMgdG8gdGhlIGFuYWx5c2lzIGZvciB0aG9zZSBmaWxlcy5cbiAgICovXG4gIGFuYWx5emVQcm9ncmFtKCk6IERlY29yYXRpb25BbmFseXNlcyB7XG4gICAgZm9yIChjb25zdCBzb3VyY2VGaWxlIG9mIHRoaXMucHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICBpZiAoIXNvdXJjZUZpbGUuaXNEZWNsYXJhdGlvbkZpbGUgJiYgaXNXaXRoaW5QYWNrYWdlKHRoaXMucGFja2FnZVBhdGgsIHNvdXJjZUZpbGUpKSB7XG4gICAgICAgIHRoaXMuY29tcGlsZXIuYW5hbHl6ZUZpbGUoc291cmNlRmlsZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5hcHBseU1pZ3JhdGlvbnMoKTtcblxuICAgIHRoaXMuY29tcGlsZXIucmVzb2x2ZSgpO1xuXG4gICAgdGhpcy5yZXBvcnREaWFnbm9zdGljcygpO1xuXG4gICAgY29uc3QgZGVjb3JhdGlvbkFuYWx5c2VzID0gbmV3IERlY29yYXRpb25BbmFseXNlcygpO1xuICAgIGZvciAoY29uc3QgYW5hbHl6ZWRGaWxlIG9mIHRoaXMuY29tcGlsZXIuYW5hbHl6ZWRGaWxlcykge1xuICAgICAgY29uc3QgY29tcGlsZWRGaWxlID0gdGhpcy5jb21waWxlRmlsZShhbmFseXplZEZpbGUpO1xuICAgICAgZGVjb3JhdGlvbkFuYWx5c2VzLnNldChjb21waWxlZEZpbGUuc291cmNlRmlsZSwgY29tcGlsZWRGaWxlKTtcbiAgICB9XG4gICAgcmV0dXJuIGRlY29yYXRpb25BbmFseXNlcztcbiAgfVxuXG4gIHByb3RlY3RlZCBhcHBseU1pZ3JhdGlvbnMoKTogdm9pZCB7XG4gICAgY29uc3QgbWlncmF0aW9uSG9zdCA9IG5ldyBEZWZhdWx0TWlncmF0aW9uSG9zdChcbiAgICAgICAgdGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5mdWxsTWV0YVJlYWRlciwgdGhpcy5ldmFsdWF0b3IsIHRoaXMuY29tcGlsZXIsXG4gICAgICAgIHRoaXMuYnVuZGxlLmVudHJ5UG9pbnQucGF0aCk7XG5cbiAgICB0aGlzLm1pZ3JhdGlvbnMuZm9yRWFjaChtaWdyYXRpb24gPT4ge1xuICAgICAgdGhpcy5jb21waWxlci5hbmFseXplZEZpbGVzLmZvckVhY2goYW5hbHl6ZWRGaWxlID0+IHtcbiAgICAgICAgY29uc3QgcmVjb3JkcyA9IHRoaXMuY29tcGlsZXIucmVjb3Jkc0ZvcihhbmFseXplZEZpbGUpO1xuICAgICAgICBpZiAocmVjb3JkcyA9PT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQXNzZXJ0aW9uIGVycm9yOiBmaWxlIHRvIG1pZ3JhdGUgbXVzdCBoYXZlIHJlY29yZHMuJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZWNvcmRzLmZvckVhY2gocmVjb3JkID0+IHtcbiAgICAgICAgICBjb25zdCBhZGREaWFnbm9zdGljID0gKGRpYWdub3N0aWM6IHRzLkRpYWdub3N0aWMpID0+IHtcbiAgICAgICAgICAgIGlmIChyZWNvcmQubWV0YURpYWdub3N0aWNzID09PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlY29yZC5tZXRhRGlhZ25vc3RpY3MgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlY29yZC5tZXRhRGlhZ25vc3RpY3MucHVzaChkaWFnbm9zdGljKTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IG1pZ3JhdGlvbi5hcHBseShyZWNvcmQubm9kZSwgbWlncmF0aW9uSG9zdCk7XG4gICAgICAgICAgICBpZiAocmVzdWx0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIGFkZERpYWdub3N0aWMocmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBpZiAoaXNGYXRhbERpYWdub3N0aWNFcnJvcihlKSkge1xuICAgICAgICAgICAgICBhZGREaWFnbm9zdGljKGUudG9EaWFnbm9zdGljKCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgcmVwb3J0RGlhZ25vc3RpY3MoKSB7IHRoaXMuY29tcGlsZXIuZGlhZ25vc3RpY3MuZm9yRWFjaCh0aGlzLmRpYWdub3N0aWNIYW5kbGVyKTsgfVxuXG4gIHByb3RlY3RlZCBjb21waWxlRmlsZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogQ29tcGlsZWRGaWxlIHtcbiAgICBjb25zdCBjb25zdGFudFBvb2wgPSBuZXcgQ29uc3RhbnRQb29sKCk7XG4gICAgY29uc3QgcmVjb3JkcyA9IHRoaXMuY29tcGlsZXIucmVjb3Jkc0Zvcihzb3VyY2VGaWxlKTtcbiAgICBpZiAocmVjb3JkcyA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdBc3NlcnRpb24gZXJyb3I6IGZpbGUgdG8gY29tcGlsZSBtdXN0IGhhdmUgcmVjb3Jkcy4nKTtcbiAgICB9XG5cbiAgICBjb25zdCBjb21waWxlZENsYXNzZXM6IENvbXBpbGVkQ2xhc3NbXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCByZWNvcmQgb2YgcmVjb3Jkcykge1xuICAgICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmNvbXBpbGVyLmNvbXBpbGUocmVjb3JkLm5vZGUsIGNvbnN0YW50UG9vbCk7XG4gICAgICBpZiAoY29tcGlsYXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbXBpbGVkQ2xhc3Nlcy5wdXNoKHtcbiAgICAgICAgbmFtZTogcmVjb3JkLm5vZGUubmFtZS50ZXh0LFxuICAgICAgICBkZWNvcmF0b3JzOiB0aGlzLmNvbXBpbGVyLmdldEFsbERlY29yYXRvcnMocmVjb3JkLm5vZGUpLFxuICAgICAgICBkZWNsYXJhdGlvbjogcmVjb3JkLm5vZGUsIGNvbXBpbGF0aW9uXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCByZWV4cG9ydHMgPSB0aGlzLmdldFJlZXhwb3J0c0ZvclNvdXJjZUZpbGUoc291cmNlRmlsZSk7XG4gICAgcmV0dXJuIHtjb25zdGFudFBvb2wsIHNvdXJjZUZpbGU6IHNvdXJjZUZpbGUsIGNvbXBpbGVkQ2xhc3NlcywgcmVleHBvcnRzfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UmVleHBvcnRzRm9yU291cmNlRmlsZShzZjogdHMuU291cmNlRmlsZSk6IFJlZXhwb3J0W10ge1xuICAgIGNvbnN0IGV4cG9ydFN0YXRlbWVudHMgPSB0aGlzLmNvbXBpbGVyLmV4cG9ydFN0YXRlbWVudHM7XG4gICAgaWYgKCFleHBvcnRTdGF0ZW1lbnRzLmhhcyhzZi5maWxlTmFtZSkpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3QgZXhwb3J0cyA9IGV4cG9ydFN0YXRlbWVudHMuZ2V0KHNmLmZpbGVOYW1lKSAhO1xuXG4gICAgY29uc3QgcmVleHBvcnRzOiBSZWV4cG9ydFtdID0gW107XG4gICAgZXhwb3J0cy5mb3JFYWNoKChbZnJvbU1vZHVsZSwgc3ltYm9sTmFtZV0sIGFzQWxpYXMpID0+IHtcbiAgICAgIHJlZXhwb3J0cy5wdXNoKHthc0FsaWFzLCBmcm9tTW9kdWxlLCBzeW1ib2xOYW1lfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlZXhwb3J0cztcbiAgfVxufVxuIl19