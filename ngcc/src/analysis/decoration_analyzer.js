(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/analysis/decoration_analyzer", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngtsc/cycles", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/scope", "@angular/compiler-cli/ngcc/src/utils", "@angular/compiler-cli/ngcc/src/analysis/migration_host", "@angular/compiler-cli/ngcc/src/analysis/types", "@angular/compiler-cli/ngcc/src/analysis/util"], factory);
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
                new imports_1.LogicalProjectStrategy(this.typeChecker, new file_system_1.LogicalFileSystem(this.rootDirs)),
            ]);
            this.dtsModuleScopeResolver = new scope_1.MetadataDtsModuleScopeResolver(this.dtsMetaReader, /* aliasGenerator */ null);
            this.scopeRegistry = new scope_1.LocalModuleScopeRegistry(this.metaRegistry, this.dtsModuleScopeResolver, this.refEmitter, /* aliasGenerator */ null);
            this.fullRegistry = new metadata_1.CompoundMetadataRegistry([this.metaRegistry, this.scopeRegistry]);
            this.evaluator = new partial_evaluator_1.PartialEvaluator(this.reflectionHost, this.typeChecker);
            this.moduleResolver = new imports_1.ModuleResolver(this.program, this.options, this.host);
            this.importGraph = new cycles_1.ImportGraph(this.moduleResolver);
            this.cycleAnalyzer = new cycles_1.CycleAnalyzer(this.importGraph);
            this.handlers = [
                new annotations_1.BaseDefDecoratorHandler(this.reflectionHost, this.evaluator, this.isCore),
                new annotations_1.ComponentDecoratorHandler(this.reflectionHost, this.evaluator, this.fullRegistry, this.fullMetaReader, this.scopeRegistry, this.scopeRegistry, this.isCore, this.resourceManager, this.rootDirs, 
                /* defaultPreserveWhitespaces */ false, 
                /* i18nUseExternalIds */ true, this.moduleResolver, this.cycleAnalyzer, this.refEmitter, imports_1.NOOP_DEFAULT_IMPORT_RECORDER),
                new annotations_1.DirectiveDecoratorHandler(this.reflectionHost, this.evaluator, this.fullRegistry, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, this.isCore),
                new annotations_1.InjectableDecoratorHandler(this.reflectionHost, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, this.isCore, 
                /* strictCtorDeps */ false),
                new annotations_1.NgModuleDecoratorHandler(this.reflectionHost, this.evaluator, this.fullMetaReader, this.fullRegistry, this.scopeRegistry, this.referencesRegistry, this.isCore, /* routeAnalyzer */ null, this.refEmitter, imports_1.NOOP_DEFAULT_IMPORT_RECORDER),
                new annotations_1.PipeDecoratorHandler(this.reflectionHost, this.evaluator, this.metaRegistry, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, this.isCore),
            ];
            this.migrations = [];
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
            var migrationHost = new migration_host_1.DefaultMigrationHost(this.reflectionHost, this.fullMetaReader, this.evaluator, this.handlers, analyzedFiles);
            analyzedFiles.forEach(function (analyzedFile) { return _this.migrateFile(migrationHost, analyzedFile); });
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
        DecorationAnalyzer.prototype.migrateFile = function (migrationHost, analyzedFile) {
            var _this = this;
            analyzedFile.analyzedClasses.forEach(function (_a) {
                var declaration = _a.declaration;
                _this.migrations.forEach(function (migration) {
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
        };
        DecorationAnalyzer.prototype.compileFile = function (analyzedFile) {
            var _this = this;
            var constantPool = new compiler_1.ConstantPool();
            var compiledClasses = analyzedFile.analyzedClasses.map(function (analyzedClass) {
                var compilation = _this.compileClass(analyzedClass, constantPool);
                return tslib_1.__assign({}, analyzedClass, { compilation: compilation });
            });
            return { constantPool: constantPool, sourceFile: analyzedFile.sourceFile, compiledClasses: compiledClasses };
        };
        DecorationAnalyzer.prototype.compileClass = function (clazz, constantPool) {
            var e_2, _a;
            var compilations = [];
            try {
                for (var _b = tslib_1.__values(clazz.matches), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = _c.value, handler = _d.handler, analysis = _d.analysis;
                    var result = handler.compile(clazz.declaration, analysis, constantPool);
                    if (Array.isArray(result)) {
                        compilations.push.apply(compilations, tslib_1.__spread(result));
                    }
                    else {
                        compilations.push(result);
                    }
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
            analyzedFile.analyzedClasses.forEach(function (_a) {
                var declaration = _a.declaration, matches = _a.matches;
                matches.forEach(function (_a) {
                    var handler = _a.handler, analysis = _a.analysis;
                    if ((handler.resolve !== undefined) && analysis) {
                        handler.resolve(declaration, analysis);
                    }
                });
            });
        };
        return DecorationAnalyzer;
    }());
    exports.DecorationAnalyzer = DecorationAnalyzer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbl9hbmFseXplci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9hbmFseXNpcy9kZWNvcmF0aW9uX2FuYWx5emVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUErQztJQUUvQywyRUFBNk87SUFDN08saUVBQXFFO0lBQ3JFLDJFQUFzRTtJQUN0RSwyRUFBNkc7SUFDN0csbUVBQW1MO0lBQ25MLHFFQUF1STtJQUN2SSx1RkFBc0U7SUFDdEUsK0RBQWtHO0lBS2xHLDhEQUFtQztJQUNuQyx5RkFBc0Q7SUFDdEQsdUVBQXFHO0lBQ3JHLHFFQUEwRDtJQUUxRDs7T0FFRztJQUNIO1FBQ0UsNEJBQW9CLEVBQWM7WUFBZCxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQ2xDLGVBQVUsR0FBRyxLQUFLLENBQUM7UUFEa0IsQ0FBQztRQUV0QyxvQ0FBTyxHQUFQLGNBQXFDLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0UsaUNBQUksR0FBSixVQUFLLEdBQVcsSUFBWSxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLHFCQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEUsb0NBQU8sR0FBUCxVQUFRLEdBQVcsRUFBRSxjQUFzQjtZQUN6QyxPQUFPLHFCQUFPLENBQUMscUJBQU8sQ0FBQywwQkFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUNILHlCQUFDO0lBQUQsQ0FBQyxBQVJELElBUUM7SUFFRDs7T0FFRztJQUNIO1FBc0RFLDRCQUNZLEVBQWMsRUFBVSxNQUF3QixFQUNoRCxjQUFrQyxFQUFVLGtCQUFzQyxFQUNsRixpQkFBNEQ7WUFBNUQs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LEtBQW9CLEVBQUUsWUFBMEI7O1lBQ3JFLElBQU0sWUFBWSxHQUFvQixFQUFFLENBQUM7O2dCQUN6QyxLQUFrQyxJQUFBLEtBQUEsaUJBQUEsS0FBSyxDQUFDLE9BQU8sQ0FBQSxnQkFBQSw0QkFBRTtvQkFBdEMsSUFBQSxhQUFtQixFQUFsQixvQkFBTyxFQUFFLHNCQUFRO29CQUMzQixJQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO29CQUMxRSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7d0JBQ3pCLFlBQVksQ0FBQyxJQUFJLE9BQWpCLFlBQVksbUJBQVMsTUFBTSxHQUFFO3FCQUM5Qjt5QkFBTTt3QkFDTCxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO3FCQUMzQjtpQkFDRjs7Ozs7Ozs7O1lBQ0QsT0FBTyxZQUFZLENBQUM7UUFDdEIsQ0FBQztRQUVTLHdDQUFXLEdBQXJCLFVBQXNCLFlBQTBCO1lBQzlDLFlBQVksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLFVBQUMsRUFBc0I7b0JBQXJCLDRCQUFXLEVBQUUsb0JBQU87Z0JBQ3pELE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBQyxFQUFtQjt3QkFBbEIsb0JBQU8sRUFBRSxzQkFBUTtvQkFDakMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEtBQUssU0FBUyxDQUFDLElBQUksUUFBUSxFQUFFO3dCQUMvQyxPQUFPLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQztxQkFDeEM7Z0JBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFDSCx5QkFBQztJQUFELENBQUMsQUFwSkQsSUFvSkM7SUFwSlksZ0RBQWtCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtDb25zdGFudFBvb2x9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtCYXNlRGVmRGVjb3JhdG9ySGFuZGxlciwgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlciwgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlciwgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIsIE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlciwgUGlwZURlY29yYXRvckhhbmRsZXIsIFJlZmVyZW5jZXNSZWdpc3RyeSwgUmVzb3VyY2VMb2FkZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucyc7XG5pbXBvcnQge0N5Y2xlQW5hbHl6ZXIsIEltcG9ydEdyYXBofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvY3ljbGVzJztcbmltcG9ydCB7aXNGYXRhbERpYWdub3N0aWNFcnJvcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2RpYWdub3N0aWNzJztcbmltcG9ydCB7RmlsZVN5c3RlbSwgTG9naWNhbEZpbGVTeXN0ZW0sIGFic29sdXRlRnJvbSwgZGlybmFtZSwgcmVzb2x2ZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7QWJzb2x1dGVNb2R1bGVTdHJhdGVneSwgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3ksIExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3ksIE1vZHVsZVJlc29sdmVyLCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSLCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvaW1wb3J0cyc7XG5pbXBvcnQge0NvbXBvdW5kTWV0YWRhdGFSZWFkZXIsIENvbXBvdW5kTWV0YWRhdGFSZWdpc3RyeSwgRHRzTWV0YWRhdGFSZWFkZXIsIExvY2FsTWV0YWRhdGFSZWdpc3RyeX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL21ldGFkYXRhJztcbmltcG9ydCB7UGFydGlhbEV2YWx1YXRvcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7TG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LCBNZXRhZGF0YUR0c01vZHVsZVNjb3BlUmVzb2x2ZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9zY29wZSc7XG5pbXBvcnQge0NvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXIsIERldGVjdFJlc3VsdCwgSGFuZGxlclByZWNlZGVuY2V9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy90cmFuc2Zvcm0nO1xuaW1wb3J0IHtOZ2NjQ2xhc3NTeW1ib2wsIE5nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtNaWdyYXRpb24sIE1pZ3JhdGlvbkhvc3R9IGZyb20gJy4uL21pZ3JhdGlvbnMvbWlncmF0aW9uJztcbmltcG9ydCB7RW50cnlQb2ludEJ1bmRsZX0gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnRfYnVuZGxlJztcbmltcG9ydCB7aXNEZWZpbmVkfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge0RlZmF1bHRNaWdyYXRpb25Ib3N0fSBmcm9tICcuL21pZ3JhdGlvbl9ob3N0JztcbmltcG9ydCB7QW5hbHl6ZWRDbGFzcywgQW5hbHl6ZWRGaWxlLCBDb21waWxlZENsYXNzLCBDb21waWxlZEZpbGUsIERlY29yYXRpb25BbmFseXNlc30gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge2FuYWx5emVEZWNvcmF0b3JzLCBpc1dpdGhpblBhY2thZ2V9IGZyb20gJy4vdXRpbCc7XG5cbi8qKlxuICogU2ltcGxlIGNsYXNzIHRoYXQgcmVzb2x2ZXMgYW5kIGxvYWRzIGZpbGVzIGRpcmVjdGx5IGZyb20gdGhlIGZpbGVzeXN0ZW0uXG4gKi9cbmNsYXNzIE5nY2NSZXNvdXJjZUxvYWRlciBpbXBsZW1lbnRzIFJlc291cmNlTG9hZGVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmczogRmlsZVN5c3RlbSkge31cbiAgY2FuUHJlbG9hZCA9IGZhbHNlO1xuICBwcmVsb2FkKCk6IHVuZGVmaW5lZHxQcm9taXNlPHZvaWQ+IHsgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQuJyk7IH1cbiAgbG9hZCh1cmw6IHN0cmluZyk6IHN0cmluZyB7IHJldHVybiB0aGlzLmZzLnJlYWRGaWxlKHJlc29sdmUodXJsKSk7IH1cbiAgcmVzb2x2ZSh1cmw6IHN0cmluZywgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHJlc29sdmUoZGlybmFtZShhYnNvbHV0ZUZyb20oY29udGFpbmluZ0ZpbGUpKSwgdXJsKTtcbiAgfVxufVxuXG4vKipcbiAqIFRoaXMgQW5hbHl6ZXIgd2lsbCBhbmFseXplIHRoZSBmaWxlcyB0aGF0IGhhdmUgZGVjb3JhdGVkIGNsYXNzZXMgdGhhdCBuZWVkIHRvIGJlIHRyYW5zZm9ybWVkLlxuICovXG5leHBvcnQgY2xhc3MgRGVjb3JhdGlvbkFuYWx5emVyIHtcbiAgcHJpdmF0ZSBwcm9ncmFtID0gdGhpcy5idW5kbGUuc3JjLnByb2dyYW07XG4gIHByaXZhdGUgb3B0aW9ucyA9IHRoaXMuYnVuZGxlLnNyYy5vcHRpb25zO1xuICBwcml2YXRlIGhvc3QgPSB0aGlzLmJ1bmRsZS5zcmMuaG9zdDtcbiAgcHJpdmF0ZSB0eXBlQ2hlY2tlciA9IHRoaXMuYnVuZGxlLnNyYy5wcm9ncmFtLmdldFR5cGVDaGVja2VyKCk7XG4gIHByaXZhdGUgcm9vdERpcnMgPSB0aGlzLmJ1bmRsZS5yb290RGlycztcbiAgcHJpdmF0ZSBwYWNrYWdlUGF0aCA9IHRoaXMuYnVuZGxlLmVudHJ5UG9pbnQucGFja2FnZTtcbiAgcHJpdmF0ZSBpc0NvcmUgPSB0aGlzLmJ1bmRsZS5pc0NvcmU7XG4gIHJlc291cmNlTWFuYWdlciA9IG5ldyBOZ2NjUmVzb3VyY2VMb2FkZXIodGhpcy5mcyk7XG4gIG1ldGFSZWdpc3RyeSA9IG5ldyBMb2NhbE1ldGFkYXRhUmVnaXN0cnkoKTtcbiAgZHRzTWV0YVJlYWRlciA9IG5ldyBEdHNNZXRhZGF0YVJlYWRlcih0aGlzLnR5cGVDaGVja2VyLCB0aGlzLnJlZmxlY3Rpb25Ib3N0KTtcbiAgZnVsbE1ldGFSZWFkZXIgPSBuZXcgQ29tcG91bmRNZXRhZGF0YVJlYWRlcihbdGhpcy5tZXRhUmVnaXN0cnksIHRoaXMuZHRzTWV0YVJlYWRlcl0pO1xuICByZWZFbWl0dGVyID0gbmV3IFJlZmVyZW5jZUVtaXR0ZXIoW1xuICAgIG5ldyBMb2NhbElkZW50aWZpZXJTdHJhdGVneSgpLFxuICAgIG5ldyBBYnNvbHV0ZU1vZHVsZVN0cmF0ZWd5KFxuICAgICAgICB0aGlzLnByb2dyYW0sIHRoaXMudHlwZUNoZWNrZXIsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0LCB0aGlzLnJlZmxlY3Rpb25Ib3N0KSxcbiAgICAvLyBUT0RPKGFseGh1Yik6IHRoZXJlJ3Mgbm8gcmVhc29uIHdoeSBuZ2NjIG5lZWRzIHRoZSBcImxvZ2ljYWwgZmlsZSBzeXN0ZW1cIiBsb2dpYyBoZXJlLCBhcyBuZ2NjXG4gICAgLy8gcHJvamVjdHMgb25seSBldmVyIGhhdmUgb25lIHJvb3REaXIuIEluc3RlYWQsIG5nY2Mgc2hvdWxkIGp1c3Qgc3dpdGNoIGl0cyBlbWl0dGVkIGltcG9ydFxuICAgIC8vIGJhc2VkIG9uIHdoZXRoZXIgYSBiZXN0R3Vlc3NPd25pbmdNb2R1bGUgaXMgcHJlc2VudCBpbiB0aGUgUmVmZXJlbmNlLlxuICAgIG5ldyBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5KHRoaXMudHlwZUNoZWNrZXIsIG5ldyBMb2dpY2FsRmlsZVN5c3RlbSh0aGlzLnJvb3REaXJzKSksXG4gIF0pO1xuICBkdHNNb2R1bGVTY29wZVJlc29sdmVyID1cbiAgICAgIG5ldyBNZXRhZGF0YUR0c01vZHVsZVNjb3BlUmVzb2x2ZXIodGhpcy5kdHNNZXRhUmVhZGVyLCAvKiBhbGlhc0dlbmVyYXRvciAqLyBudWxsKTtcbiAgc2NvcGVSZWdpc3RyeSA9IG5ldyBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnkoXG4gICAgICB0aGlzLm1ldGFSZWdpc3RyeSwgdGhpcy5kdHNNb2R1bGVTY29wZVJlc29sdmVyLCB0aGlzLnJlZkVtaXR0ZXIsIC8qIGFsaWFzR2VuZXJhdG9yICovIG51bGwpO1xuICBmdWxsUmVnaXN0cnkgPSBuZXcgQ29tcG91bmRNZXRhZGF0YVJlZ2lzdHJ5KFt0aGlzLm1ldGFSZWdpc3RyeSwgdGhpcy5zY29wZVJlZ2lzdHJ5XSk7XG4gIGV2YWx1YXRvciA9IG5ldyBQYXJ0aWFsRXZhbHVhdG9yKHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMudHlwZUNoZWNrZXIpO1xuICBtb2R1bGVSZXNvbHZlciA9IG5ldyBNb2R1bGVSZXNvbHZlcih0aGlzLnByb2dyYW0sIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0KTtcbiAgaW1wb3J0R3JhcGggPSBuZXcgSW1wb3J0R3JhcGgodGhpcy5tb2R1bGVSZXNvbHZlcik7XG4gIGN5Y2xlQW5hbHl6ZXIgPSBuZXcgQ3ljbGVBbmFseXplcih0aGlzLmltcG9ydEdyYXBoKTtcbiAgaGFuZGxlcnM6IERlY29yYXRvckhhbmRsZXI8YW55LCBhbnk+W10gPSBbXG4gICAgbmV3IEJhc2VEZWZEZWNvcmF0b3JIYW5kbGVyKHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLmlzQ29yZSksXG4gICAgbmV3IENvbXBvbmVudERlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLmZ1bGxSZWdpc3RyeSwgdGhpcy5mdWxsTWV0YVJlYWRlcixcbiAgICAgICAgdGhpcy5zY29wZVJlZ2lzdHJ5LCB0aGlzLnNjb3BlUmVnaXN0cnksIHRoaXMuaXNDb3JlLCB0aGlzLnJlc291cmNlTWFuYWdlciwgdGhpcy5yb290RGlycyxcbiAgICAgICAgLyogZGVmYXVsdFByZXNlcnZlV2hpdGVzcGFjZXMgKi8gZmFsc2UsXG4gICAgICAgIC8qIGkxOG5Vc2VFeHRlcm5hbElkcyAqLyB0cnVlLCB0aGlzLm1vZHVsZVJlc29sdmVyLCB0aGlzLmN5Y2xlQW5hbHl6ZXIsIHRoaXMucmVmRW1pdHRlcixcbiAgICAgICAgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUiksXG4gICAgbmV3IERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLmZ1bGxSZWdpc3RyeSwgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUixcbiAgICAgICAgdGhpcy5pc0NvcmUpLFxuICAgIG5ldyBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgdGhpcy5yZWZsZWN0aW9uSG9zdCwgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUiwgdGhpcy5pc0NvcmUsXG4gICAgICAgIC8qIHN0cmljdEN0b3JEZXBzICovIGZhbHNlKSxcbiAgICBuZXcgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICB0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmV2YWx1YXRvciwgdGhpcy5mdWxsTWV0YVJlYWRlciwgdGhpcy5mdWxsUmVnaXN0cnksXG4gICAgICAgIHRoaXMuc2NvcGVSZWdpc3RyeSwgdGhpcy5yZWZlcmVuY2VzUmVnaXN0cnksIHRoaXMuaXNDb3JlLCAvKiByb3V0ZUFuYWx5emVyICovIG51bGwsXG4gICAgICAgIHRoaXMucmVmRW1pdHRlciwgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUiksXG4gICAgbmV3IFBpcGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICB0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmV2YWx1YXRvciwgdGhpcy5tZXRhUmVnaXN0cnksIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsXG4gICAgICAgIHRoaXMuaXNDb3JlKSxcbiAgXTtcbiAgbWlncmF0aW9uczogTWlncmF0aW9uW10gPSBbXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgZnM6IEZpbGVTeXN0ZW0sIHByaXZhdGUgYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlLFxuICAgICAgcHJpdmF0ZSByZWZsZWN0aW9uSG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIHJlZmVyZW5jZXNSZWdpc3RyeTogUmVmZXJlbmNlc1JlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSBkaWFnbm9zdGljSGFuZGxlcjogKGVycm9yOiB0cy5EaWFnbm9zdGljKSA9PiB2b2lkID0gKCkgPT4ge30pIHt9XG5cbiAgLyoqXG4gICAqIEFuYWx5emUgYSBwcm9ncmFtIHRvIGZpbmQgYWxsIHRoZSBkZWNvcmF0ZWQgZmlsZXMgc2hvdWxkIGJlIHRyYW5zZm9ybWVkLlxuICAgKlxuICAgKiBAcmV0dXJucyBhIG1hcCBvZiB0aGUgc291cmNlIGZpbGVzIHRvIHRoZSBhbmFseXNpcyBmb3IgdGhvc2UgZmlsZXMuXG4gICAqL1xuICBhbmFseXplUHJvZ3JhbSgpOiBEZWNvcmF0aW9uQW5hbHlzZXMge1xuICAgIGNvbnN0IGRlY29yYXRpb25BbmFseXNlcyA9IG5ldyBEZWNvcmF0aW9uQW5hbHlzZXMoKTtcbiAgICBjb25zdCBhbmFseXplZEZpbGVzID0gdGhpcy5wcm9ncmFtLmdldFNvdXJjZUZpbGVzKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoc291cmNlRmlsZSA9PiBpc1dpdGhpblBhY2thZ2UodGhpcy5wYWNrYWdlUGF0aCwgc291cmNlRmlsZSkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKHNvdXJjZUZpbGUgPT4gdGhpcy5hbmFseXplRmlsZShzb3VyY2VGaWxlKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoaXNEZWZpbmVkKTtcbiAgICBjb25zdCBtaWdyYXRpb25Ib3N0ID0gbmV3IERlZmF1bHRNaWdyYXRpb25Ib3N0KFxuICAgICAgICB0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmZ1bGxNZXRhUmVhZGVyLCB0aGlzLmV2YWx1YXRvciwgdGhpcy5oYW5kbGVycywgYW5hbHl6ZWRGaWxlcyk7XG4gICAgYW5hbHl6ZWRGaWxlcy5mb3JFYWNoKGFuYWx5emVkRmlsZSA9PiB0aGlzLm1pZ3JhdGVGaWxlKG1pZ3JhdGlvbkhvc3QsIGFuYWx5emVkRmlsZSkpO1xuICAgIGFuYWx5emVkRmlsZXMuZm9yRWFjaChhbmFseXplZEZpbGUgPT4gdGhpcy5yZXNvbHZlRmlsZShhbmFseXplZEZpbGUpKTtcbiAgICBjb25zdCBjb21waWxlZEZpbGVzID0gYW5hbHl6ZWRGaWxlcy5tYXAoYW5hbHl6ZWRGaWxlID0+IHRoaXMuY29tcGlsZUZpbGUoYW5hbHl6ZWRGaWxlKSk7XG4gICAgY29tcGlsZWRGaWxlcy5mb3JFYWNoKFxuICAgICAgICBjb21waWxlZEZpbGUgPT4gZGVjb3JhdGlvbkFuYWx5c2VzLnNldChjb21waWxlZEZpbGUuc291cmNlRmlsZSwgY29tcGlsZWRGaWxlKSk7XG4gICAgcmV0dXJuIGRlY29yYXRpb25BbmFseXNlcztcbiAgfVxuXG4gIHByb3RlY3RlZCBhbmFseXplRmlsZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogQW5hbHl6ZWRGaWxlfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgYW5hbHl6ZWRDbGFzc2VzID0gdGhpcy5yZWZsZWN0aW9uSG9zdC5maW5kQ2xhc3NTeW1ib2xzKHNvdXJjZUZpbGUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoc3ltYm9sID0+IHRoaXMuYW5hbHl6ZUNsYXNzKHN5bWJvbCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoaXNEZWZpbmVkKTtcbiAgICByZXR1cm4gYW5hbHl6ZWRDbGFzc2VzLmxlbmd0aCA/IHtzb3VyY2VGaWxlLCBhbmFseXplZENsYXNzZXN9IDogdW5kZWZpbmVkO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFuYWx5emVDbGFzcyhzeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IEFuYWx5emVkQ2xhc3N8bnVsbCB7XG4gICAgY29uc3QgZGVjb3JhdG9ycyA9IHRoaXMucmVmbGVjdGlvbkhvc3QuZ2V0RGVjb3JhdG9yc09mU3ltYm9sKHN5bWJvbCk7XG4gICAgY29uc3QgYW5hbHl6ZWRDbGFzcyA9IGFuYWx5emVEZWNvcmF0b3JzKHN5bWJvbCwgZGVjb3JhdG9ycywgdGhpcy5oYW5kbGVycyk7XG4gICAgaWYgKGFuYWx5emVkQ2xhc3MgIT09IG51bGwgJiYgYW5hbHl6ZWRDbGFzcy5kaWFnbm9zdGljcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBmb3IgKGNvbnN0IGRpYWdub3N0aWMgb2YgYW5hbHl6ZWRDbGFzcy5kaWFnbm9zdGljcykge1xuICAgICAgICB0aGlzLmRpYWdub3N0aWNIYW5kbGVyKGRpYWdub3N0aWMpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYW5hbHl6ZWRDbGFzcztcbiAgfVxuXG4gIHByb3RlY3RlZCBtaWdyYXRlRmlsZShtaWdyYXRpb25Ib3N0OiBNaWdyYXRpb25Ib3N0LCBhbmFseXplZEZpbGU6IEFuYWx5emVkRmlsZSk6IHZvaWQge1xuICAgIGFuYWx5emVkRmlsZS5hbmFseXplZENsYXNzZXMuZm9yRWFjaCgoe2RlY2xhcmF0aW9ufSkgPT4ge1xuICAgICAgdGhpcy5taWdyYXRpb25zLmZvckVhY2gobWlncmF0aW9uID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCByZXN1bHQgPSBtaWdyYXRpb24uYXBwbHkoZGVjbGFyYXRpb24sIG1pZ3JhdGlvbkhvc3QpO1xuICAgICAgICAgIGlmIChyZXN1bHQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuZGlhZ25vc3RpY0hhbmRsZXIocmVzdWx0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoaXNGYXRhbERpYWdub3N0aWNFcnJvcihlKSkge1xuICAgICAgICAgICAgdGhpcy5kaWFnbm9zdGljSGFuZGxlcihlLnRvRGlhZ25vc3RpYygpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIGNvbXBpbGVGaWxlKGFuYWx5emVkRmlsZTogQW5hbHl6ZWRGaWxlKTogQ29tcGlsZWRGaWxlIHtcbiAgICBjb25zdCBjb25zdGFudFBvb2wgPSBuZXcgQ29uc3RhbnRQb29sKCk7XG4gICAgY29uc3QgY29tcGlsZWRDbGFzc2VzOiBDb21waWxlZENsYXNzW10gPSBhbmFseXplZEZpbGUuYW5hbHl6ZWRDbGFzc2VzLm1hcChhbmFseXplZENsYXNzID0+IHtcbiAgICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5jb21waWxlQ2xhc3MoYW5hbHl6ZWRDbGFzcywgY29uc3RhbnRQb29sKTtcbiAgICAgIHJldHVybiB7Li4uYW5hbHl6ZWRDbGFzcywgY29tcGlsYXRpb259O1xuICAgIH0pO1xuICAgIHJldHVybiB7Y29uc3RhbnRQb29sLCBzb3VyY2VGaWxlOiBhbmFseXplZEZpbGUuc291cmNlRmlsZSwgY29tcGlsZWRDbGFzc2VzfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBjb21waWxlQ2xhc3MoY2xheno6IEFuYWx5emVkQ2xhc3MsIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sKTogQ29tcGlsZVJlc3VsdFtdIHtcbiAgICBjb25zdCBjb21waWxhdGlvbnM6IENvbXBpbGVSZXN1bHRbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qge2hhbmRsZXIsIGFuYWx5c2lzfSBvZiBjbGF6ei5tYXRjaGVzKSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBoYW5kbGVyLmNvbXBpbGUoY2xhenouZGVjbGFyYXRpb24sIGFuYWx5c2lzLCBjb25zdGFudFBvb2wpO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVzdWx0KSkge1xuICAgICAgICBjb21waWxhdGlvbnMucHVzaCguLi5yZXN1bHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tcGlsYXRpb25zLnB1c2gocmVzdWx0KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNvbXBpbGF0aW9ucztcbiAgfVxuXG4gIHByb3RlY3RlZCByZXNvbHZlRmlsZShhbmFseXplZEZpbGU6IEFuYWx5emVkRmlsZSk6IHZvaWQge1xuICAgIGFuYWx5emVkRmlsZS5hbmFseXplZENsYXNzZXMuZm9yRWFjaCgoe2RlY2xhcmF0aW9uLCBtYXRjaGVzfSkgPT4ge1xuICAgICAgbWF0Y2hlcy5mb3JFYWNoKCh7aGFuZGxlciwgYW5hbHlzaXN9KSA9PiB7XG4gICAgICAgIGlmICgoaGFuZGxlci5yZXNvbHZlICE9PSB1bmRlZmluZWQpICYmIGFuYWx5c2lzKSB7XG4gICAgICAgICAgaGFuZGxlci5yZXNvbHZlKGRlY2xhcmF0aW9uLCBhbmFseXNpcyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG59XG4iXX0=