(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/analysis/decoration_analyzer", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngtsc/cycles", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/path", "@angular/compiler-cli/src/ngtsc/scope", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/ngcc/src/utils"], factory);
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
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var partial_evaluator_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/path");
    var scope_1 = require("@angular/compiler-cli/src/ngtsc/scope");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
    exports.DecorationAnalyses = Map;
    /**
     * Simple class that resolves and loads files directly from the filesystem.
     */
    var NgccResourceLoader = /** @class */ (function () {
        function NgccResourceLoader(fs) {
            this.fs = fs;
            this.canPreload = false;
        }
        NgccResourceLoader.prototype.preload = function () { throw new Error('Not implemented.'); };
        NgccResourceLoader.prototype.load = function (url) { return this.fs.readFile(path_1.AbsoluteFsPath.resolve(url)); };
        NgccResourceLoader.prototype.resolve = function (url, containingFile) {
            return path_1.AbsoluteFsPath.resolve(path_1.AbsoluteFsPath.dirname(path_1.AbsoluteFsPath.from(containingFile)), url);
        };
        return NgccResourceLoader;
    }());
    /**
     * This Analyzer will analyze the files that have decorated classes that need to be transformed.
     */
    var DecorationAnalyzer = /** @class */ (function () {
        function DecorationAnalyzer(fs, program, options, host, typeChecker, reflectionHost, referencesRegistry, rootDirs, isCore) {
            this.fs = fs;
            this.program = program;
            this.options = options;
            this.host = host;
            this.typeChecker = typeChecker;
            this.reflectionHost = reflectionHost;
            this.referencesRegistry = referencesRegistry;
            this.rootDirs = rootDirs;
            this.isCore = isCore;
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
                new imports_1.LogicalProjectStrategy(this.typeChecker, new path_1.LogicalFileSystem(this.rootDirs)),
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
                new annotations_1.ComponentDecoratorHandler(this.reflectionHost, this.evaluator, this.fullRegistry, this.fullMetaReader, this.scopeRegistry, this.isCore, this.resourceManager, this.rootDirs, 
                /* defaultPreserveWhitespaces */ false, 
                /* i18nUseExternalIds */ true, this.moduleResolver, this.cycleAnalyzer, this.refEmitter, imports_1.NOOP_DEFAULT_IMPORT_RECORDER),
                new annotations_1.DirectiveDecoratorHandler(this.reflectionHost, this.evaluator, this.fullRegistry, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, this.isCore),
                new annotations_1.InjectableDecoratorHandler(this.reflectionHost, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, this.isCore, 
                /* strictCtorDeps */ false),
                new annotations_1.NgModuleDecoratorHandler(this.reflectionHost, this.evaluator, this.fullRegistry, this.scopeRegistry, this.referencesRegistry, this.isCore, /* routeAnalyzer */ null, this.refEmitter, imports_1.NOOP_DEFAULT_IMPORT_RECORDER),
                new annotations_1.PipeDecoratorHandler(this.reflectionHost, this.evaluator, this.metaRegistry, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, this.isCore),
            ];
        }
        /**
         * Analyze a program to find all the decorated files should be transformed.
         *
         * @returns a map of the source files to the analysis for those files.
         */
        DecorationAnalyzer.prototype.analyzeProgram = function () {
            var _this = this;
            var decorationAnalyses = new exports.DecorationAnalyses();
            var analysedFiles = this.program.getSourceFiles()
                .map(function (sourceFile) { return _this.analyzeFile(sourceFile); })
                .filter(utils_1.isDefined);
            analysedFiles.forEach(function (analysedFile) { return _this.resolveFile(analysedFile); });
            var compiledFiles = analysedFiles.map(function (analysedFile) { return _this.compileFile(analysedFile); });
            compiledFiles.forEach(function (compiledFile) { return decorationAnalyses.set(compiledFile.sourceFile, compiledFile); });
            return decorationAnalyses;
        };
        DecorationAnalyzer.prototype.analyzeFile = function (sourceFile) {
            var _this = this;
            var decoratedClasses = this.reflectionHost.findDecoratedClasses(sourceFile);
            return decoratedClasses.length ? {
                sourceFile: sourceFile,
                analyzedClasses: decoratedClasses.map(function (clazz) { return _this.analyzeClass(clazz); }).filter(utils_1.isDefined)
            } :
                undefined;
        };
        DecorationAnalyzer.prototype.analyzeClass = function (clazz) {
            var e_1, _a, e_2, _b;
            var matchingHandlers = this.handlers
                .map(function (handler) {
                var detected = handler.detect(clazz.declaration, clazz.decorators);
                return { handler: handler, detected: detected };
            })
                .filter(isMatchingHandler);
            if (matchingHandlers.length === 0) {
                return null;
            }
            var detections = [];
            var hasWeakHandler = false;
            var hasNonWeakHandler = false;
            var hasPrimaryHandler = false;
            try {
                for (var matchingHandlers_1 = tslib_1.__values(matchingHandlers), matchingHandlers_1_1 = matchingHandlers_1.next(); !matchingHandlers_1_1.done; matchingHandlers_1_1 = matchingHandlers_1.next()) {
                    var _c = matchingHandlers_1_1.value, handler = _c.handler, detected = _c.detected;
                    if (hasNonWeakHandler && handler.precedence === transform_1.HandlerPrecedence.WEAK) {
                        continue;
                    }
                    else if (hasWeakHandler && handler.precedence !== transform_1.HandlerPrecedence.WEAK) {
                        // Clear all the WEAK handlers from the list of matches.
                        detections.length = 0;
                    }
                    if (hasPrimaryHandler && handler.precedence === transform_1.HandlerPrecedence.PRIMARY) {
                        throw new Error("TODO.Diagnostic: Class has multiple incompatible Angular decorators.");
                    }
                    detections.push({ handler: handler, detected: detected });
                    if (handler.precedence === transform_1.HandlerPrecedence.WEAK) {
                        hasWeakHandler = true;
                    }
                    else if (handler.precedence === transform_1.HandlerPrecedence.SHARED) {
                        hasNonWeakHandler = true;
                    }
                    else if (handler.precedence === transform_1.HandlerPrecedence.PRIMARY) {
                        hasNonWeakHandler = true;
                        hasPrimaryHandler = true;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (matchingHandlers_1_1 && !matchingHandlers_1_1.done && (_a = matchingHandlers_1.return)) _a.call(matchingHandlers_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var matches = [];
            var allDiagnostics = [];
            try {
                for (var detections_1 = tslib_1.__values(detections), detections_1_1 = detections_1.next(); !detections_1_1.done; detections_1_1 = detections_1.next()) {
                    var _d = detections_1_1.value, handler = _d.handler, detected = _d.detected;
                    var _e = handler.analyze(clazz.declaration, detected.metadata), analysis = _e.analysis, diagnostics = _e.diagnostics;
                    if (diagnostics !== undefined) {
                        allDiagnostics.push.apply(allDiagnostics, tslib_1.__spread(diagnostics));
                    }
                    matches.push({ handler: handler, analysis: analysis });
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (detections_1_1 && !detections_1_1.done && (_b = detections_1.return)) _b.call(detections_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return tslib_1.__assign({}, clazz, { matches: matches, diagnostics: allDiagnostics.length > 0 ? allDiagnostics : undefined });
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
            var e_3, _a;
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
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
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
    function isMatchingHandler(handler) {
        return !!handler.detected;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbl9hbmFseXplci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9hbmFseXNpcy9kZWNvcmF0aW9uX2FuYWx5emVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUErQztJQUcvQywyRUFBNk87SUFDN08saUVBQXFFO0lBQ3JFLG1FQUFtTDtJQUNuTCxxRUFBdUk7SUFDdkksdUZBQXNFO0lBQ3RFLDZEQUEwRTtJQUMxRSwrREFBa0c7SUFDbEcsdUVBQThHO0lBSTlHLDhEQUFtQztJQXFCdEIsUUFBQSxrQkFBa0IsR0FBRyxHQUFHLENBQUM7SUFPdEM7O09BRUc7SUFDSDtRQUNFLDRCQUFvQixFQUFjO1lBQWQsT0FBRSxHQUFGLEVBQUUsQ0FBWTtZQUNsQyxlQUFVLEdBQUcsS0FBSyxDQUFDO1FBRGtCLENBQUM7UUFFdEMsb0NBQU8sR0FBUCxjQUFxQyxNQUFNLElBQUksS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNFLGlDQUFJLEdBQUosVUFBSyxHQUFXLElBQVksT0FBTyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxxQkFBYyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRixvQ0FBTyxHQUFQLFVBQVEsR0FBVyxFQUFFLGNBQXNCO1lBQ3pDLE9BQU8scUJBQWMsQ0FBQyxPQUFPLENBQUMscUJBQWMsQ0FBQyxPQUFPLENBQUMscUJBQWMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNsRyxDQUFDO1FBQ0gseUJBQUM7SUFBRCxDQUFDLEFBUkQsSUFRQztJQUVEOztPQUVHO0lBQ0g7UUE4Q0UsNEJBQ1ksRUFBYyxFQUFVLE9BQW1CLEVBQVUsT0FB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QUFRLENBQUMsQ0FBQztxQkFDeEM7Z0JBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFDSCx5QkFBQztJQUFELENBQUMsQUFoS0QsSUFnS0M7SUFoS1ksZ0RBQWtCO0lBa0svQixTQUFTLGlCQUFpQixDQUFPLE9BQXVDO1FBRXRFLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUM7SUFDNUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Q29uc3RhbnRQb29sfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtCYXNlRGVmRGVjb3JhdG9ySGFuZGxlciwgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlciwgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlciwgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIsIE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlciwgUGlwZURlY29yYXRvckhhbmRsZXIsIFJlZmVyZW5jZXNSZWdpc3RyeSwgUmVzb3VyY2VMb2FkZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucyc7XG5pbXBvcnQge0N5Y2xlQW5hbHl6ZXIsIEltcG9ydEdyYXBofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvY3ljbGVzJztcbmltcG9ydCB7QWJzb2x1dGVNb2R1bGVTdHJhdGVneSwgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3ksIExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3ksIE1vZHVsZVJlc29sdmVyLCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSLCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvaW1wb3J0cyc7XG5pbXBvcnQge0NvbXBvdW5kTWV0YWRhdGFSZWFkZXIsIENvbXBvdW5kTWV0YWRhdGFSZWdpc3RyeSwgRHRzTWV0YWRhdGFSZWFkZXIsIExvY2FsTWV0YWRhdGFSZWdpc3RyeX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL21ldGFkYXRhJztcbmltcG9ydCB7UGFydGlhbEV2YWx1YXRvcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIExvZ2ljYWxGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcGF0aCc7XG5pbXBvcnQge0xvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeSwgTWV0YWRhdGFEdHNNb2R1bGVTY29wZVJlc29sdmVyfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2Mvc2NvcGUnO1xuaW1wb3J0IHtDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyLCBEZXRlY3RSZXN1bHQsIEhhbmRsZXJQcmVjZWRlbmNlfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvdHJhbnNmb3JtJztcbmltcG9ydCB7RmlsZVN5c3RlbX0gZnJvbSAnLi4vZmlsZV9zeXN0ZW0vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtEZWNvcmF0ZWRDbGFzc30gZnJvbSAnLi4vaG9zdC9kZWNvcmF0ZWRfY2xhc3MnO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7aXNEZWZpbmVkfSBmcm9tICcuLi91dGlscyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQW5hbHl6ZWRGaWxlIHtcbiAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZTtcbiAgYW5hbHl6ZWRDbGFzc2VzOiBBbmFseXplZENsYXNzW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQW5hbHl6ZWRDbGFzcyBleHRlbmRzIERlY29yYXRlZENsYXNzIHtcbiAgZGlhZ25vc3RpY3M/OiB0cy5EaWFnbm9zdGljW107XG4gIG1hdGNoZXM6IHtoYW5kbGVyOiBEZWNvcmF0b3JIYW5kbGVyPGFueSwgYW55PjsgYW5hbHlzaXM6IGFueTt9W107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZWRDbGFzcyBleHRlbmRzIEFuYWx5emVkQ2xhc3MgeyBjb21waWxhdGlvbjogQ29tcGlsZVJlc3VsdFtdOyB9XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZWRGaWxlIHtcbiAgY29tcGlsZWRDbGFzc2VzOiBDb21waWxlZENsYXNzW107XG4gIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGU7XG4gIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sO1xufVxuXG5leHBvcnQgdHlwZSBEZWNvcmF0aW9uQW5hbHlzZXMgPSBNYXA8dHMuU291cmNlRmlsZSwgQ29tcGlsZWRGaWxlPjtcbmV4cG9ydCBjb25zdCBEZWNvcmF0aW9uQW5hbHlzZXMgPSBNYXA7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWF0Y2hpbmdIYW5kbGVyPEEsIE0+IHtcbiAgaGFuZGxlcjogRGVjb3JhdG9ySGFuZGxlcjxBLCBNPjtcbiAgZGV0ZWN0ZWQ6IE07XG59XG5cbi8qKlxuICogU2ltcGxlIGNsYXNzIHRoYXQgcmVzb2x2ZXMgYW5kIGxvYWRzIGZpbGVzIGRpcmVjdGx5IGZyb20gdGhlIGZpbGVzeXN0ZW0uXG4gKi9cbmNsYXNzIE5nY2NSZXNvdXJjZUxvYWRlciBpbXBsZW1lbnRzIFJlc291cmNlTG9hZGVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmczogRmlsZVN5c3RlbSkge31cbiAgY2FuUHJlbG9hZCA9IGZhbHNlO1xuICBwcmVsb2FkKCk6IHVuZGVmaW5lZHxQcm9taXNlPHZvaWQ+IHsgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQuJyk7IH1cbiAgbG9hZCh1cmw6IHN0cmluZyk6IHN0cmluZyB7IHJldHVybiB0aGlzLmZzLnJlYWRGaWxlKEFic29sdXRlRnNQYXRoLnJlc29sdmUodXJsKSk7IH1cbiAgcmVzb2x2ZSh1cmw6IHN0cmluZywgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIEFic29sdXRlRnNQYXRoLnJlc29sdmUoQWJzb2x1dGVGc1BhdGguZGlybmFtZShBYnNvbHV0ZUZzUGF0aC5mcm9tKGNvbnRhaW5pbmdGaWxlKSksIHVybCk7XG4gIH1cbn1cblxuLyoqXG4gKiBUaGlzIEFuYWx5emVyIHdpbGwgYW5hbHl6ZSB0aGUgZmlsZXMgdGhhdCBoYXZlIGRlY29yYXRlZCBjbGFzc2VzIHRoYXQgbmVlZCB0byBiZSB0cmFuc2Zvcm1lZC5cbiAqL1xuZXhwb3J0IGNsYXNzIERlY29yYXRpb25BbmFseXplciB7XG4gIHJlc291cmNlTWFuYWdlciA9IG5ldyBOZ2NjUmVzb3VyY2VMb2FkZXIodGhpcy5mcyk7XG4gIG1ldGFSZWdpc3RyeSA9IG5ldyBMb2NhbE1ldGFkYXRhUmVnaXN0cnkoKTtcbiAgZHRzTWV0YVJlYWRlciA9IG5ldyBEdHNNZXRhZGF0YVJlYWRlcih0aGlzLnR5cGVDaGVja2VyLCB0aGlzLnJlZmxlY3Rpb25Ib3N0KTtcbiAgZnVsbE1ldGFSZWFkZXIgPSBuZXcgQ29tcG91bmRNZXRhZGF0YVJlYWRlcihbdGhpcy5tZXRhUmVnaXN0cnksIHRoaXMuZHRzTWV0YVJlYWRlcl0pO1xuICByZWZFbWl0dGVyID0gbmV3IFJlZmVyZW5jZUVtaXR0ZXIoW1xuICAgIG5ldyBMb2NhbElkZW50aWZpZXJTdHJhdGVneSgpLFxuICAgIG5ldyBBYnNvbHV0ZU1vZHVsZVN0cmF0ZWd5KFxuICAgICAgICB0aGlzLnByb2dyYW0sIHRoaXMudHlwZUNoZWNrZXIsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0LCB0aGlzLnJlZmxlY3Rpb25Ib3N0KSxcbiAgICAvLyBUT0RPKGFseGh1Yik6IHRoZXJlJ3Mgbm8gcmVhc29uIHdoeSBuZ2NjIG5lZWRzIHRoZSBcImxvZ2ljYWwgZmlsZSBzeXN0ZW1cIiBsb2dpYyBoZXJlLCBhcyBuZ2NjXG4gICAgLy8gcHJvamVjdHMgb25seSBldmVyIGhhdmUgb25lIHJvb3REaXIuIEluc3RlYWQsIG5nY2Mgc2hvdWxkIGp1c3Qgc3dpdGNoIGl0cyBlbWl0dGVkIGltcG9ydFxuICAgIC8vIGJhc2VkIG9uIHdoZXRoZXIgYSBiZXN0R3Vlc3NPd25pbmdNb2R1bGUgaXMgcHJlc2VudCBpbiB0aGUgUmVmZXJlbmNlLlxuICAgIG5ldyBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5KHRoaXMudHlwZUNoZWNrZXIsIG5ldyBMb2dpY2FsRmlsZVN5c3RlbSh0aGlzLnJvb3REaXJzKSksXG4gIF0pO1xuICBkdHNNb2R1bGVTY29wZVJlc29sdmVyID1cbiAgICAgIG5ldyBNZXRhZGF0YUR0c01vZHVsZVNjb3BlUmVzb2x2ZXIodGhpcy5kdHNNZXRhUmVhZGVyLCAvKiBhbGlhc0dlbmVyYXRvciAqLyBudWxsKTtcbiAgc2NvcGVSZWdpc3RyeSA9IG5ldyBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnkoXG4gICAgICB0aGlzLm1ldGFSZWdpc3RyeSwgdGhpcy5kdHNNb2R1bGVTY29wZVJlc29sdmVyLCB0aGlzLnJlZkVtaXR0ZXIsIC8qIGFsaWFzR2VuZXJhdG9yICovIG51bGwpO1xuICBmdWxsUmVnaXN0cnkgPSBuZXcgQ29tcG91bmRNZXRhZGF0YVJlZ2lzdHJ5KFt0aGlzLm1ldGFSZWdpc3RyeSwgdGhpcy5zY29wZVJlZ2lzdHJ5XSk7XG4gIGV2YWx1YXRvciA9IG5ldyBQYXJ0aWFsRXZhbHVhdG9yKHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMudHlwZUNoZWNrZXIpO1xuICBtb2R1bGVSZXNvbHZlciA9IG5ldyBNb2R1bGVSZXNvbHZlcih0aGlzLnByb2dyYW0sIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0KTtcbiAgaW1wb3J0R3JhcGggPSBuZXcgSW1wb3J0R3JhcGgodGhpcy5tb2R1bGVSZXNvbHZlcik7XG4gIGN5Y2xlQW5hbHl6ZXIgPSBuZXcgQ3ljbGVBbmFseXplcih0aGlzLmltcG9ydEdyYXBoKTtcbiAgaGFuZGxlcnM6IERlY29yYXRvckhhbmRsZXI8YW55LCBhbnk+W10gPSBbXG4gICAgbmV3IEJhc2VEZWZEZWNvcmF0b3JIYW5kbGVyKHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLmlzQ29yZSksXG4gICAgbmV3IENvbXBvbmVudERlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLmZ1bGxSZWdpc3RyeSwgdGhpcy5mdWxsTWV0YVJlYWRlcixcbiAgICAgICAgdGhpcy5zY29wZVJlZ2lzdHJ5LCB0aGlzLmlzQ29yZSwgdGhpcy5yZXNvdXJjZU1hbmFnZXIsIHRoaXMucm9vdERpcnMsXG4gICAgICAgIC8qIGRlZmF1bHRQcmVzZXJ2ZVdoaXRlc3BhY2VzICovIGZhbHNlLFxuICAgICAgICAvKiBpMThuVXNlRXh0ZXJuYWxJZHMgKi8gdHJ1ZSwgdGhpcy5tb2R1bGVSZXNvbHZlciwgdGhpcy5jeWNsZUFuYWx5emVyLCB0aGlzLnJlZkVtaXR0ZXIsXG4gICAgICAgIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIpLFxuICAgIG5ldyBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICB0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmV2YWx1YXRvciwgdGhpcy5mdWxsUmVnaXN0cnksIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsXG4gICAgICAgIHRoaXMuaXNDb3JlKSxcbiAgICBuZXcgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsIHRoaXMuaXNDb3JlLFxuICAgICAgICAvKiBzdHJpY3RDdG9yRGVwcyAqLyBmYWxzZSksXG4gICAgbmV3IE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgdGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5ldmFsdWF0b3IsIHRoaXMuZnVsbFJlZ2lzdHJ5LCB0aGlzLnNjb3BlUmVnaXN0cnksXG4gICAgICAgIHRoaXMucmVmZXJlbmNlc1JlZ2lzdHJ5LCB0aGlzLmlzQ29yZSwgLyogcm91dGVBbmFseXplciAqLyBudWxsLCB0aGlzLnJlZkVtaXR0ZXIsXG4gICAgICAgIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIpLFxuICAgIG5ldyBQaXBlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgdGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5ldmFsdWF0b3IsIHRoaXMubWV0YVJlZ2lzdHJ5LCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSLFxuICAgICAgICB0aGlzLmlzQ29yZSksXG4gIF07XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGZzOiBGaWxlU3lzdGVtLCBwcml2YXRlIHByb2dyYW06IHRzLlByb2dyYW0sIHByaXZhdGUgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zLFxuICAgICAgcHJpdmF0ZSBob3N0OiB0cy5Db21waWxlckhvc3QsIHByaXZhdGUgdHlwZUNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLFxuICAgICAgcHJpdmF0ZSByZWZsZWN0aW9uSG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIHJlZmVyZW5jZXNSZWdpc3RyeTogUmVmZXJlbmNlc1JlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSByb290RGlyczogQWJzb2x1dGVGc1BhdGhbXSwgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4pIHt9XG5cbiAgLyoqXG4gICAqIEFuYWx5emUgYSBwcm9ncmFtIHRvIGZpbmQgYWxsIHRoZSBkZWNvcmF0ZWQgZmlsZXMgc2hvdWxkIGJlIHRyYW5zZm9ybWVkLlxuICAgKlxuICAgKiBAcmV0dXJucyBhIG1hcCBvZiB0aGUgc291cmNlIGZpbGVzIHRvIHRoZSBhbmFseXNpcyBmb3IgdGhvc2UgZmlsZXMuXG4gICAqL1xuICBhbmFseXplUHJvZ3JhbSgpOiBEZWNvcmF0aW9uQW5hbHlzZXMge1xuICAgIGNvbnN0IGRlY29yYXRpb25BbmFseXNlcyA9IG5ldyBEZWNvcmF0aW9uQW5hbHlzZXMoKTtcbiAgICBjb25zdCBhbmFseXNlZEZpbGVzID0gdGhpcy5wcm9ncmFtLmdldFNvdXJjZUZpbGVzKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoc291cmNlRmlsZSA9PiB0aGlzLmFuYWx5emVGaWxlKHNvdXJjZUZpbGUpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihpc0RlZmluZWQpO1xuICAgIGFuYWx5c2VkRmlsZXMuZm9yRWFjaChhbmFseXNlZEZpbGUgPT4gdGhpcy5yZXNvbHZlRmlsZShhbmFseXNlZEZpbGUpKTtcbiAgICBjb25zdCBjb21waWxlZEZpbGVzID0gYW5hbHlzZWRGaWxlcy5tYXAoYW5hbHlzZWRGaWxlID0+IHRoaXMuY29tcGlsZUZpbGUoYW5hbHlzZWRGaWxlKSk7XG4gICAgY29tcGlsZWRGaWxlcy5mb3JFYWNoKFxuICAgICAgICBjb21waWxlZEZpbGUgPT4gZGVjb3JhdGlvbkFuYWx5c2VzLnNldChjb21waWxlZEZpbGUuc291cmNlRmlsZSwgY29tcGlsZWRGaWxlKSk7XG4gICAgcmV0dXJuIGRlY29yYXRpb25BbmFseXNlcztcbiAgfVxuXG4gIHByb3RlY3RlZCBhbmFseXplRmlsZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogQW5hbHl6ZWRGaWxlfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgZGVjb3JhdGVkQ2xhc3NlcyA9IHRoaXMucmVmbGVjdGlvbkhvc3QuZmluZERlY29yYXRlZENsYXNzZXMoc291cmNlRmlsZSk7XG4gICAgcmV0dXJuIGRlY29yYXRlZENsYXNzZXMubGVuZ3RoID8ge1xuICAgICAgc291cmNlRmlsZSxcbiAgICAgIGFuYWx5emVkQ2xhc3NlczogZGVjb3JhdGVkQ2xhc3Nlcy5tYXAoY2xhenogPT4gdGhpcy5hbmFseXplQ2xhc3MoY2xhenopKS5maWx0ZXIoaXNEZWZpbmVkKVxuICAgIH0gOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZDtcbiAgfVxuXG4gIHByb3RlY3RlZCBhbmFseXplQ2xhc3MoY2xheno6IERlY29yYXRlZENsYXNzKTogQW5hbHl6ZWRDbGFzc3xudWxsIHtcbiAgICBjb25zdCBtYXRjaGluZ0hhbmRsZXJzID0gdGhpcy5oYW5kbGVyc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChoYW5kbGVyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGV0ZWN0ZWQgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlci5kZXRlY3QoY2xhenouZGVjbGFyYXRpb24sIGNsYXp6LmRlY29yYXRvcnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge2hhbmRsZXIsIGRldGVjdGVkfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGlzTWF0Y2hpbmdIYW5kbGVyKTtcblxuICAgIGlmIChtYXRjaGluZ0hhbmRsZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGRldGVjdGlvbnM6IHtoYW5kbGVyOiBEZWNvcmF0b3JIYW5kbGVyPGFueSwgYW55PiwgZGV0ZWN0ZWQ6IERldGVjdFJlc3VsdDxhbnk+fVtdID0gW107XG4gICAgbGV0IGhhc1dlYWtIYW5kbGVyOiBib29sZWFuID0gZmFsc2U7XG4gICAgbGV0IGhhc05vbldlYWtIYW5kbGVyOiBib29sZWFuID0gZmFsc2U7XG4gICAgbGV0IGhhc1ByaW1hcnlIYW5kbGVyOiBib29sZWFuID0gZmFsc2U7XG5cbiAgICBmb3IgKGNvbnN0IHtoYW5kbGVyLCBkZXRlY3RlZH0gb2YgbWF0Y2hpbmdIYW5kbGVycykge1xuICAgICAgaWYgKGhhc05vbldlYWtIYW5kbGVyICYmIGhhbmRsZXIucHJlY2VkZW5jZSA9PT0gSGFuZGxlclByZWNlZGVuY2UuV0VBSykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH0gZWxzZSBpZiAoaGFzV2Vha0hhbmRsZXIgJiYgaGFuZGxlci5wcmVjZWRlbmNlICE9PSBIYW5kbGVyUHJlY2VkZW5jZS5XRUFLKSB7XG4gICAgICAgIC8vIENsZWFyIGFsbCB0aGUgV0VBSyBoYW5kbGVycyBmcm9tIHRoZSBsaXN0IG9mIG1hdGNoZXMuXG4gICAgICAgIGRldGVjdGlvbnMubGVuZ3RoID0gMDtcbiAgICAgIH1cbiAgICAgIGlmIChoYXNQcmltYXJ5SGFuZGxlciAmJiBoYW5kbGVyLnByZWNlZGVuY2UgPT09IEhhbmRsZXJQcmVjZWRlbmNlLlBSSU1BUlkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUT0RPLkRpYWdub3N0aWM6IENsYXNzIGhhcyBtdWx0aXBsZSBpbmNvbXBhdGlibGUgQW5ndWxhciBkZWNvcmF0b3JzLmApO1xuICAgICAgfVxuXG4gICAgICBkZXRlY3Rpb25zLnB1c2goe2hhbmRsZXIsIGRldGVjdGVkfSk7XG4gICAgICBpZiAoaGFuZGxlci5wcmVjZWRlbmNlID09PSBIYW5kbGVyUHJlY2VkZW5jZS5XRUFLKSB7XG4gICAgICAgIGhhc1dlYWtIYW5kbGVyID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoaGFuZGxlci5wcmVjZWRlbmNlID09PSBIYW5kbGVyUHJlY2VkZW5jZS5TSEFSRUQpIHtcbiAgICAgICAgaGFzTm9uV2Vha0hhbmRsZXIgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChoYW5kbGVyLnByZWNlZGVuY2UgPT09IEhhbmRsZXJQcmVjZWRlbmNlLlBSSU1BUlkpIHtcbiAgICAgICAgaGFzTm9uV2Vha0hhbmRsZXIgPSB0cnVlO1xuICAgICAgICBoYXNQcmltYXJ5SGFuZGxlciA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgbWF0Y2hlczoge2hhbmRsZXI6IERlY29yYXRvckhhbmRsZXI8YW55LCBhbnk+LCBhbmFseXNpczogYW55fVtdID0gW107XG4gICAgY29uc3QgYWxsRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qge2hhbmRsZXIsIGRldGVjdGVkfSBvZiBkZXRlY3Rpb25zKSB7XG4gICAgICBjb25zdCB7YW5hbHlzaXMsIGRpYWdub3N0aWNzfSA9IGhhbmRsZXIuYW5hbHl6ZShjbGF6ei5kZWNsYXJhdGlvbiwgZGV0ZWN0ZWQubWV0YWRhdGEpO1xuICAgICAgaWYgKGRpYWdub3N0aWNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgYWxsRGlhZ25vc3RpY3MucHVzaCguLi5kaWFnbm9zdGljcyk7XG4gICAgICB9XG4gICAgICBtYXRjaGVzLnB1c2goe2hhbmRsZXIsIGFuYWx5c2lzfSk7XG4gICAgfVxuICAgIHJldHVybiB7Li4uY2xhenosIG1hdGNoZXMsIGRpYWdub3N0aWNzOiBhbGxEaWFnbm9zdGljcy5sZW5ndGggPiAwID8gYWxsRGlhZ25vc3RpY3MgOiB1bmRlZmluZWR9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGNvbXBpbGVGaWxlKGFuYWx5emVkRmlsZTogQW5hbHl6ZWRGaWxlKTogQ29tcGlsZWRGaWxlIHtcbiAgICBjb25zdCBjb25zdGFudFBvb2wgPSBuZXcgQ29uc3RhbnRQb29sKCk7XG4gICAgY29uc3QgY29tcGlsZWRDbGFzc2VzOiBDb21waWxlZENsYXNzW10gPSBhbmFseXplZEZpbGUuYW5hbHl6ZWRDbGFzc2VzLm1hcChhbmFseXplZENsYXNzID0+IHtcbiAgICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5jb21waWxlQ2xhc3MoYW5hbHl6ZWRDbGFzcywgY29uc3RhbnRQb29sKTtcbiAgICAgIHJldHVybiB7Li4uYW5hbHl6ZWRDbGFzcywgY29tcGlsYXRpb259O1xuICAgIH0pO1xuICAgIHJldHVybiB7Y29uc3RhbnRQb29sLCBzb3VyY2VGaWxlOiBhbmFseXplZEZpbGUuc291cmNlRmlsZSwgY29tcGlsZWRDbGFzc2VzfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBjb21waWxlQ2xhc3MoY2xheno6IEFuYWx5emVkQ2xhc3MsIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sKTogQ29tcGlsZVJlc3VsdFtdIHtcbiAgICBjb25zdCBjb21waWxhdGlvbnM6IENvbXBpbGVSZXN1bHRbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qge2hhbmRsZXIsIGFuYWx5c2lzfSBvZiBjbGF6ei5tYXRjaGVzKSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBoYW5kbGVyLmNvbXBpbGUoY2xhenouZGVjbGFyYXRpb24sIGFuYWx5c2lzLCBjb25zdGFudFBvb2wpO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVzdWx0KSkge1xuICAgICAgICBjb21waWxhdGlvbnMucHVzaCguLi5yZXN1bHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tcGlsYXRpb25zLnB1c2gocmVzdWx0KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNvbXBpbGF0aW9ucztcbiAgfVxuXG4gIHByb3RlY3RlZCByZXNvbHZlRmlsZShhbmFseXplZEZpbGU6IEFuYWx5emVkRmlsZSk6IHZvaWQge1xuICAgIGFuYWx5emVkRmlsZS5hbmFseXplZENsYXNzZXMuZm9yRWFjaCgoe2RlY2xhcmF0aW9uLCBtYXRjaGVzfSkgPT4ge1xuICAgICAgbWF0Y2hlcy5mb3JFYWNoKCh7aGFuZGxlciwgYW5hbHlzaXN9KSA9PiB7XG4gICAgICAgIGlmICgoaGFuZGxlci5yZXNvbHZlICE9PSB1bmRlZmluZWQpICYmIGFuYWx5c2lzKSB7XG4gICAgICAgICAgaGFuZGxlci5yZXNvbHZlKGRlY2xhcmF0aW9uLCBhbmFseXNpcyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzTWF0Y2hpbmdIYW5kbGVyPEEsIE0+KGhhbmRsZXI6IFBhcnRpYWw8TWF0Y2hpbmdIYW5kbGVyPEEsIE0+Pik6XG4gICAgaGFuZGxlciBpcyBNYXRjaGluZ0hhbmRsZXI8QSwgTT4ge1xuICByZXR1cm4gISFoYW5kbGVyLmRldGVjdGVkO1xufVxuIl19