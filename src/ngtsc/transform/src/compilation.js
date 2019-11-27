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
        define("@angular/compiler-cli/src/ngtsc/transform/src/compilation", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/transform/src/api", "@angular/compiler-cli/src/ngtsc/transform/src/declaration"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/api");
    var declaration_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/declaration");
    var EMPTY_ARRAY = [];
    /**
     * Manages a compilation of Ivy decorators into static fields across an entire ts.Program.
     *
     * The compilation is stateful - source files are analyzed and records of the operations that need
     * to be performed during the transform/emit process are maintained internally.
     */
    var IvyCompilation = /** @class */ (function () {
        /**
         * @param handlers array of `DecoratorHandler`s which will be executed against each class in the
         * program
         * @param checker TypeScript `TypeChecker` instance for the program
         * @param reflector `ReflectionHost` through which all reflection operations will be performed
         * @param coreImportsFrom a TypeScript `SourceFile` which exports symbols needed for Ivy imports
         * when compiling @angular/core, or `null` if the current program is not @angular/core. This is
         * `null` in most cases.
         */
        function IvyCompilation(handlers, reflector, importRewriter, incrementalDriver, perf, sourceToFactorySymbols, scopeRegistry, compileNonExportedClasses) {
            this.handlers = handlers;
            this.reflector = reflector;
            this.importRewriter = importRewriter;
            this.incrementalDriver = incrementalDriver;
            this.perf = perf;
            this.sourceToFactorySymbols = sourceToFactorySymbols;
            this.scopeRegistry = scopeRegistry;
            this.compileNonExportedClasses = compileNonExportedClasses;
            /**
             * Tracks classes which have been analyzed and found to have an Ivy decorator, and the
             * information recorded about them for later compilation.
             */
            this.ivyClasses = new Map();
            /**
             * Tracks factory information which needs to be generated.
             */
            /**
             * Tracks the `DtsFileTransformer`s for each TS file that needs .d.ts transformations.
             */
            this.dtsMap = new Map();
            this.reexportMap = new Map();
            this._diagnostics = [];
        }
        Object.defineProperty(IvyCompilation.prototype, "exportStatements", {
            get: function () { return this.reexportMap; },
            enumerable: true,
            configurable: true
        });
        IvyCompilation.prototype.analyzeSync = function (sf) { return this.analyze(sf, false); };
        IvyCompilation.prototype.analyzeAsync = function (sf) { return this.analyze(sf, true); };
        IvyCompilation.prototype.detectHandlersForClass = function (node) {
            var e_1, _a;
            if (!this.compileNonExportedClasses && !typescript_1.isExported(node)) {
                return null;
            }
            // The first step is to reflect the decorators.
            var classDecorators = this.reflector.getDecoratorsOfDeclaration(node);
            var ivyClass = null;
            try {
                // Look through the DecoratorHandlers to see if any are relevant.
                for (var _b = tslib_1.__values(this.handlers), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var handler = _c.value;
                    // An adapter is relevant if it matches one of the decorators on the class.
                    var detected = handler.detect(node, classDecorators);
                    if (detected === undefined) {
                        // This handler didn't match.
                        continue;
                    }
                    var isPrimaryHandler = handler.precedence === api_1.HandlerPrecedence.PRIMARY;
                    var isWeakHandler = handler.precedence === api_1.HandlerPrecedence.WEAK;
                    var match = {
                        handler: handler,
                        analyzed: null, detected: detected,
                    };
                    if (ivyClass === null) {
                        // This is the first handler to match this class. This path is a fast path through which
                        // most classes will flow.
                        ivyClass = {
                            matchedHandlers: [match],
                            hasPrimaryHandler: isPrimaryHandler,
                            hasWeakHandlers: isWeakHandler,
                        };
                        this.ivyClasses.set(node, ivyClass);
                    }
                    else {
                        // This is at least the second handler to match this class. This is a slower path that some
                        // classes will go through, which validates that the set of decorators applied to the class
                        // is valid.
                        // Validate according to rules as follows:
                        //
                        // * WEAK handlers are removed if a non-WEAK handler matches.
                        // * Only one PRIMARY handler can match at a time. Any other PRIMARY handler matching a
                        //   class with an existing PRIMARY handler is an error.
                        if (!isWeakHandler && ivyClass.hasWeakHandlers) {
                            // The current handler is not a WEAK handler, but the class has other WEAK handlers.
                            // Remove them.
                            ivyClass.matchedHandlers = ivyClass.matchedHandlers.filter(function (field) { return field.handler.precedence !== api_1.HandlerPrecedence.WEAK; });
                            ivyClass.hasWeakHandlers = false;
                        }
                        else if (isWeakHandler && !ivyClass.hasWeakHandlers) {
                            // The current handler is a WEAK handler, but the class has non-WEAK handlers already.
                            // Drop the current one.
                            continue;
                        }
                        if (isPrimaryHandler && ivyClass.hasPrimaryHandler) {
                            // The class already has a PRIMARY handler, and another one just matched.
                            this._diagnostics.push({
                                category: ts.DiagnosticCategory.Error,
                                code: Number('-99' + diagnostics_1.ErrorCode.DECORATOR_COLLISION),
                                file: typescript_1.getSourceFile(node),
                                start: node.getStart(undefined, false),
                                length: node.getWidth(),
                                messageText: 'Two incompatible decorators on class',
                            });
                            this.ivyClasses.delete(node);
                            return null;
                        }
                        // Otherwise, it's safe to accept the multiple decorators here. Update some of the metadata
                        // regarding this class.
                        ivyClass.matchedHandlers.push(match);
                        ivyClass.hasPrimaryHandler = ivyClass.hasPrimaryHandler || isPrimaryHandler;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return ivyClass;
        };
        IvyCompilation.prototype.analyze = function (sf, preanalyze) {
            var _this = this;
            var promises = [];
            var analyzeClass = function (node) {
                var e_2, _a;
                var ivyClass = _this.detectHandlersForClass(node);
                // If the class has no Ivy behavior (or had errors), skip it.
                if (ivyClass === null) {
                    return;
                }
                var _loop_1 = function (match) {
                    // The analyze() function will run the analysis phase of the handler.
                    var analyze = function () {
                        var _a;
                        var analyzeClassSpan = _this.perf.start('analyzeClass', node);
                        try {
                            match.analyzed = match.handler.analyze(node, match.detected.metadata);
                            if (match.analyzed.diagnostics !== undefined) {
                                (_a = _this._diagnostics).push.apply(_a, tslib_1.__spread(match.analyzed.diagnostics));
                            }
                            if (match.analyzed.factorySymbolName !== undefined &&
                                _this.sourceToFactorySymbols !== null &&
                                _this.sourceToFactorySymbols.has(sf.fileName)) {
                                _this.sourceToFactorySymbols.get(sf.fileName).add(match.analyzed.factorySymbolName);
                            }
                        }
                        catch (err) {
                            if (err instanceof diagnostics_1.FatalDiagnosticError) {
                                _this._diagnostics.push(err.toDiagnostic());
                            }
                            else {
                                throw err;
                            }
                        }
                        finally {
                            _this.perf.stop(analyzeClassSpan);
                        }
                    };
                    // If preanalysis was requested and a preanalysis step exists, then run preanalysis.
                    // Otherwise, skip directly to analysis.
                    if (preanalyze && match.handler.preanalyze !== undefined) {
                        // Preanalysis might return a Promise, indicating an async operation was necessary. Or it
                        // might return undefined, indicating no async step was needed and analysis can proceed
                        // immediately.
                        var preanalysis = match.handler.preanalyze(node, match.detected.metadata);
                        if (preanalysis !== undefined) {
                            // Await the results of preanalysis before running analysis.
                            promises.push(preanalysis.then(analyze));
                        }
                        else {
                            // No async preanalysis needed, skip directly to analysis.
                            analyze();
                        }
                    }
                    else {
                        // Not in preanalysis mode or not needed for this handler, skip directly to analysis.
                        analyze();
                    }
                };
                try {
                    // Loop through each matched handler that needs to be analyzed and analyze it, either
                    // synchronously or asynchronously.
                    for (var _b = tslib_1.__values(ivyClass.matchedHandlers), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var match = _c.value;
                        _loop_1(match);
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            };
            var visit = function (node) {
                // Process nodes recursively, and look for class declarations with decorators.
                if (reflection_1.isNamedClassDeclaration(node)) {
                    analyzeClass(node);
                }
                ts.forEachChild(node, visit);
            };
            visit(sf);
            if (preanalyze && promises.length > 0) {
                return Promise.all(promises).then(function () { return undefined; });
            }
            else {
                return undefined;
            }
        };
        /**
         * Feeds components discovered in the compilation to a context for indexing.
         */
        IvyCompilation.prototype.index = function (context) {
            this.ivyClasses.forEach(function (ivyClass, declaration) {
                var e_3, _a;
                try {
                    for (var _b = tslib_1.__values(ivyClass.matchedHandlers), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var match = _c.value;
                        if (match.handler.index !== undefined && match.analyzed !== null &&
                            match.analyzed.analysis !== undefined) {
                            match.handler.index(context, declaration, match.analyzed.analysis);
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
            });
        };
        IvyCompilation.prototype.resolve = function () {
            var _this = this;
            var resolveSpan = this.perf.start('resolve');
            this.ivyClasses.forEach(function (ivyClass, node) {
                var e_4, _a, e_5, _b, _c;
                try {
                    for (var _d = tslib_1.__values(ivyClass.matchedHandlers), _e = _d.next(); !_e.done; _e = _d.next()) {
                        var match = _e.value;
                        if (match.handler.resolve !== undefined && match.analyzed !== null &&
                            match.analyzed.analysis !== undefined) {
                            var resolveClassSpan = _this.perf.start('resolveClass', node);
                            try {
                                var res = match.handler.resolve(node, match.analyzed.analysis);
                                if (res.reexports !== undefined) {
                                    var fileName = node.getSourceFile().fileName;
                                    if (!_this.reexportMap.has(fileName)) {
                                        _this.reexportMap.set(fileName, new Map());
                                    }
                                    var fileReexports = _this.reexportMap.get(fileName);
                                    try {
                                        for (var _f = (e_5 = void 0, tslib_1.__values(res.reexports)), _g = _f.next(); !_g.done; _g = _f.next()) {
                                            var reexport = _g.value;
                                            fileReexports.set(reexport.asAlias, [reexport.fromModule, reexport.symbolName]);
                                        }
                                    }
                                    catch (e_5_1) { e_5 = { error: e_5_1 }; }
                                    finally {
                                        try {
                                            if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                                        }
                                        finally { if (e_5) throw e_5.error; }
                                    }
                                }
                                if (res.diagnostics !== undefined) {
                                    (_c = _this._diagnostics).push.apply(_c, tslib_1.__spread(res.diagnostics));
                                }
                            }
                            catch (err) {
                                if (err instanceof diagnostics_1.FatalDiagnosticError) {
                                    _this._diagnostics.push(err.toDiagnostic());
                                }
                                else {
                                    throw err;
                                }
                            }
                            finally {
                                _this.perf.stop(resolveClassSpan);
                            }
                        }
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
            });
            this.perf.stop(resolveSpan);
            this.recordNgModuleScopeDependencies();
        };
        IvyCompilation.prototype.recordNgModuleScopeDependencies = function () {
            var _this = this;
            var recordSpan = this.perf.start('recordDependencies');
            this.scopeRegistry.getCompilationScopes().forEach(function (scope) {
                var file = scope.declaration.getSourceFile();
                var ngModuleFile = scope.ngModule.getSourceFile();
                // A change to any dependency of the declaration causes the declaration to be invalidated,
                // which requires the NgModule to be invalidated as well.
                var deps = _this.incrementalDriver.getFileDependencies(file);
                _this.incrementalDriver.trackFileDependencies(deps, ngModuleFile);
                // A change to the NgModule file should cause the declaration itself to be invalidated.
                _this.incrementalDriver.trackFileDependency(ngModuleFile, file);
                // A change to any directive/pipe in the compilation scope should cause the declaration to be
                // invalidated.
                scope.directives.forEach(function (directive) {
                    var dirSf = directive.ref.node.getSourceFile();
                    // When a directive in scope is updated, the declaration needs to be recompiled as e.g.
                    // a selector may have changed.
                    _this.incrementalDriver.trackFileDependency(dirSf, file);
                    // When any of the dependencies of the declaration changes, the NgModule scope may be
                    // affected so a component within scope must be recompiled. Only components need to be
                    // recompiled, as directives are not dependent upon the compilation scope.
                    if (directive.isComponent) {
                        _this.incrementalDriver.trackFileDependencies(deps, dirSf);
                    }
                });
                scope.pipes.forEach(function (pipe) {
                    // When a pipe in scope is updated, the declaration needs to be recompiled as e.g.
                    // the pipe's name may have changed.
                    _this.incrementalDriver.trackFileDependency(pipe.ref.node.getSourceFile(), file);
                });
            });
            this.perf.stop(recordSpan);
        };
        IvyCompilation.prototype.typeCheck = function (context) {
            this.ivyClasses.forEach(function (ivyClass, node) {
                var e_6, _a;
                try {
                    for (var _b = tslib_1.__values(ivyClass.matchedHandlers), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var match = _c.value;
                        if (match.handler.typeCheck !== undefined && match.analyzed !== null &&
                            match.analyzed.analysis !== undefined) {
                            match.handler.typeCheck(context, node, match.analyzed.analysis);
                        }
                    }
                }
                catch (e_6_1) { e_6 = { error: e_6_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_6) throw e_6.error; }
                }
            });
        };
        /**
         * Perform a compilation operation on the given class declaration and return instructions to an
         * AST transformer if any are available.
         */
        IvyCompilation.prototype.compileIvyFieldFor = function (node, constantPool) {
            var e_7, _a;
            // Look to see whether the original node was analyzed. If not, there's nothing to do.
            var original = ts.getOriginalNode(node);
            if (!reflection_1.isNamedClassDeclaration(original) || !this.ivyClasses.has(original)) {
                return undefined;
            }
            var ivyClass = this.ivyClasses.get(original);
            var res = [];
            var _loop_2 = function (match) {
                if (match.analyzed === null || match.analyzed.analysis === undefined) {
                    return "continue";
                }
                var compileSpan = this_1.perf.start('compileClass', original);
                var compileMatchRes = match.handler.compile(node, match.analyzed.analysis, constantPool);
                this_1.perf.stop(compileSpan);
                if (Array.isArray(compileMatchRes)) {
                    compileMatchRes.forEach(function (result) {
                        if (!res.some(function (r) { return r.name === result.name; })) {
                            res.push(result);
                        }
                    });
                }
                else if (!res.some(function (result) { return result.name === compileMatchRes.name; })) {
                    res.push(compileMatchRes);
                }
            };
            var this_1 = this;
            try {
                for (var _b = tslib_1.__values(ivyClass.matchedHandlers), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var match = _c.value;
                    _loop_2(match);
                }
            }
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_7) throw e_7.error; }
            }
            // Look up the .d.ts transformer for the input file and record that at least one field was
            // generated, which will allow the .d.ts to be transformed later.
            var fileName = original.getSourceFile().fileName;
            var dtsTransformer = this.getDtsTransformer(fileName);
            dtsTransformer.recordStaticField(reflection_1.reflectNameOfDeclaration(node), res);
            // Return the instruction to the transformer so the fields will be added.
            return res.length > 0 ? res : undefined;
        };
        /**
         * Lookup the `ts.Decorator` which triggered transformation of a particular class declaration.
         */
        IvyCompilation.prototype.ivyDecoratorsFor = function (node) {
            var e_8, _a;
            var original = ts.getOriginalNode(node);
            if (!reflection_1.isNamedClassDeclaration(original) || !this.ivyClasses.has(original)) {
                return EMPTY_ARRAY;
            }
            var ivyClass = this.ivyClasses.get(original);
            var decorators = [];
            try {
                for (var _b = tslib_1.__values(ivyClass.matchedHandlers), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var match = _c.value;
                    if (match.analyzed === null || match.analyzed.analysis === undefined) {
                        continue;
                    }
                    if (match.detected.trigger !== null && ts.isDecorator(match.detected.trigger)) {
                        decorators.push(match.detected.trigger);
                    }
                }
            }
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_8) throw e_8.error; }
            }
            return decorators;
        };
        /**
         * Process a declaration file and return a transformed version that incorporates the changes
         * made to the source file.
         */
        IvyCompilation.prototype.transformedDtsFor = function (file, context) {
            // No need to transform if it's not a declarations file, or if no changes have been requested
            // to the input file.
            // Due to the way TypeScript afterDeclarations transformers work, the SourceFile path is the
            // same as the original .ts.
            // The only way we know it's actually a declaration file is via the isDeclarationFile property.
            if (!file.isDeclarationFile || !this.dtsMap.has(file.fileName)) {
                return file;
            }
            // Return the transformed source.
            return this.dtsMap.get(file.fileName).transform(file, context);
        };
        Object.defineProperty(IvyCompilation.prototype, "diagnostics", {
            get: function () { return this._diagnostics; },
            enumerable: true,
            configurable: true
        });
        IvyCompilation.prototype.getDtsTransformer = function (tsFileName) {
            if (!this.dtsMap.has(tsFileName)) {
                this.dtsMap.set(tsFileName, new declaration_1.DtsFileTransformer(this.importRewriter));
            }
            return this.dtsMap.get(tsFileName);
        };
        return IvyCompilation;
    }());
    exports.IvyCompilation = IvyCompilation;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvY29tcGlsYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBR0gsK0JBQWlDO0lBRWpDLDJFQUFrRTtJQUtsRSx5RUFBcUg7SUFHckgsa0ZBQW9FO0lBRXBFLHlFQUF1RztJQUN2Ryx5RkFBaUQ7SUFFakQsSUFBTSxXQUFXLEdBQVEsRUFBRSxDQUFDO0lBbUI1Qjs7Ozs7T0FLRztJQUNIO1FBb0JFOzs7Ozs7OztXQVFHO1FBQ0gsd0JBQ1ksUUFBc0MsRUFBVSxTQUF5QixFQUN6RSxjQUE4QixFQUFVLGlCQUFvQyxFQUM1RSxJQUFrQixFQUFVLHNCQUFxRCxFQUNqRixhQUF1QyxFQUFVLHlCQUFrQztZQUhuRixhQUFRLEdBQVIsUUFBUSxDQUE4QjtZQUFVLGNBQVMsR0FBVCxTQUFTLENBQWdCO1lBQ3pFLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtZQUFVLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7WUFDNUUsU0FBSSxHQUFKLElBQUksQ0FBYztZQUFVLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBK0I7WUFDakYsa0JBQWEsR0FBYixhQUFhLENBQTBCO1lBQVUsOEJBQXlCLEdBQXpCLHlCQUF5QixDQUFTO1lBaEMvRjs7O2VBR0c7WUFDSyxlQUFVLEdBQUcsSUFBSSxHQUFHLEVBQThCLENBQUM7WUFFM0Q7O2VBRUc7WUFFSDs7ZUFFRztZQUNLLFdBQU0sR0FBRyxJQUFJLEdBQUcsRUFBOEIsQ0FBQztZQUUvQyxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUF5QyxDQUFDO1lBQy9ELGlCQUFZLEdBQW9CLEVBQUUsQ0FBQztRQWlCM0MsQ0FBQztRQUdELHNCQUFJLDRDQUFnQjtpQkFBcEIsY0FBcUUsT0FB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LEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDaEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLElBQUksZ0NBQWtCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7YUFDMUU7WUFDRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBRyxDQUFDO1FBQ3ZDLENBQUM7UUFDSCxxQkFBQztJQUFELENBQUMsQUFuWkQsSUFtWkM7SUFuWlksd0NBQWMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29uc3RhbnRQb29sfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0ltcG9ydFJld3JpdGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7SW5jcmVtZW50YWxEcml2ZXJ9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsJztcbmltcG9ydCB7SW5kZXhpbmdDb250ZXh0fSBmcm9tICcuLi8uLi9pbmRleGVyJztcbmltcG9ydCB7UGVyZlJlY29yZGVyfSBmcm9tICcuLi8uLi9wZXJmJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgUmVmbGVjdGlvbkhvc3QsIGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uLCByZWZsZWN0TmFtZU9mRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnl9IGZyb20gJy4uLy4uL3Njb3BlJztcbmltcG9ydCB7VHlwZUNoZWNrQ29udGV4dH0gZnJvbSAnLi4vLi4vdHlwZWNoZWNrJztcbmltcG9ydCB7Z2V0U291cmNlRmlsZSwgaXNFeHBvcnRlZH0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXIsIERldGVjdFJlc3VsdCwgSGFuZGxlclByZWNlZGVuY2V9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7RHRzRmlsZVRyYW5zZm9ybWVyfSBmcm9tICcuL2RlY2xhcmF0aW9uJztcblxuY29uc3QgRU1QVFlfQVJSQVk6IGFueSA9IFtdO1xuXG4vKipcbiAqIFJlY29yZCBvZiBhbiBhZGFwdGVyIHdoaWNoIGRlY2lkZWQgdG8gZW1pdCBhIHN0YXRpYyBmaWVsZCwgYW5kIHRoZSBhbmFseXNpcyBpdCBwZXJmb3JtZWQgdG9cbiAqIHByZXBhcmUgZm9yIHRoYXQgb3BlcmF0aW9uLlxuICovXG5pbnRlcmZhY2UgTWF0Y2hlZEhhbmRsZXI8QSwgTT4ge1xuICBoYW5kbGVyOiBEZWNvcmF0b3JIYW5kbGVyPEEsIE0+O1xuICBhbmFseXplZDogQW5hbHlzaXNPdXRwdXQ8QT58bnVsbDtcbiAgZGV0ZWN0ZWQ6IERldGVjdFJlc3VsdDxNPjtcbn1cblxuaW50ZXJmYWNlIEl2eUNsYXNzIHtcbiAgbWF0Y2hlZEhhbmRsZXJzOiBNYXRjaGVkSGFuZGxlcjxhbnksIGFueT5bXTtcblxuICBoYXNXZWFrSGFuZGxlcnM6IGJvb2xlYW47XG4gIGhhc1ByaW1hcnlIYW5kbGVyOiBib29sZWFuO1xufVxuXG4vKipcbiAqIE1hbmFnZXMgYSBjb21waWxhdGlvbiBvZiBJdnkgZGVjb3JhdG9ycyBpbnRvIHN0YXRpYyBmaWVsZHMgYWNyb3NzIGFuIGVudGlyZSB0cy5Qcm9ncmFtLlxuICpcbiAqIFRoZSBjb21waWxhdGlvbiBpcyBzdGF0ZWZ1bCAtIHNvdXJjZSBmaWxlcyBhcmUgYW5hbHl6ZWQgYW5kIHJlY29yZHMgb2YgdGhlIG9wZXJhdGlvbnMgdGhhdCBuZWVkXG4gKiB0byBiZSBwZXJmb3JtZWQgZHVyaW5nIHRoZSB0cmFuc2Zvcm0vZW1pdCBwcm9jZXNzIGFyZSBtYWludGFpbmVkIGludGVybmFsbHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBJdnlDb21waWxhdGlvbiB7XG4gIC8qKlxuICAgKiBUcmFja3MgY2xhc3NlcyB3aGljaCBoYXZlIGJlZW4gYW5hbHl6ZWQgYW5kIGZvdW5kIHRvIGhhdmUgYW4gSXZ5IGRlY29yYXRvciwgYW5kIHRoZVxuICAgKiBpbmZvcm1hdGlvbiByZWNvcmRlZCBhYm91dCB0aGVtIGZvciBsYXRlciBjb21waWxhdGlvbi5cbiAgICovXG4gIHByaXZhdGUgaXZ5Q2xhc3NlcyA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgSXZ5Q2xhc3M+KCk7XG5cbiAgLyoqXG4gICAqIFRyYWNrcyBmYWN0b3J5IGluZm9ybWF0aW9uIHdoaWNoIG5lZWRzIHRvIGJlIGdlbmVyYXRlZC5cbiAgICovXG5cbiAgLyoqXG4gICAqIFRyYWNrcyB0aGUgYER0c0ZpbGVUcmFuc2Zvcm1lcmBzIGZvciBlYWNoIFRTIGZpbGUgdGhhdCBuZWVkcyAuZC50cyB0cmFuc2Zvcm1hdGlvbnMuXG4gICAqL1xuICBwcml2YXRlIGR0c01hcCA9IG5ldyBNYXA8c3RyaW5nLCBEdHNGaWxlVHJhbnNmb3JtZXI+KCk7XG5cbiAgcHJpdmF0ZSByZWV4cG9ydE1hcCA9IG5ldyBNYXA8c3RyaW5nLCBNYXA8c3RyaW5nLCBbc3RyaW5nLCBzdHJpbmddPj4oKTtcbiAgcHJpdmF0ZSBfZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG5cbiAgLyoqXG4gICAqIEBwYXJhbSBoYW5kbGVycyBhcnJheSBvZiBgRGVjb3JhdG9ySGFuZGxlcmBzIHdoaWNoIHdpbGwgYmUgZXhlY3V0ZWQgYWdhaW5zdCBlYWNoIGNsYXNzIGluIHRoZVxuICAgKiBwcm9ncmFtXG4gICAqIEBwYXJhbSBjaGVja2VyIFR5cGVTY3JpcHQgYFR5cGVDaGVja2VyYCBpbnN0YW5jZSBmb3IgdGhlIHByb2dyYW1cbiAgICogQHBhcmFtIHJlZmxlY3RvciBgUmVmbGVjdGlvbkhvc3RgIHRocm91Z2ggd2hpY2ggYWxsIHJlZmxlY3Rpb24gb3BlcmF0aW9ucyB3aWxsIGJlIHBlcmZvcm1lZFxuICAgKiBAcGFyYW0gY29yZUltcG9ydHNGcm9tIGEgVHlwZVNjcmlwdCBgU291cmNlRmlsZWAgd2hpY2ggZXhwb3J0cyBzeW1ib2xzIG5lZWRlZCBmb3IgSXZ5IGltcG9ydHNcbiAgICogd2hlbiBjb21waWxpbmcgQGFuZ3VsYXIvY29yZSwgb3IgYG51bGxgIGlmIHRoZSBjdXJyZW50IHByb2dyYW0gaXMgbm90IEBhbmd1bGFyL2NvcmUuIFRoaXMgaXNcbiAgICogYG51bGxgIGluIG1vc3QgY2FzZXMuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgaGFuZGxlcnM6IERlY29yYXRvckhhbmRsZXI8YW55LCBhbnk+W10sIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICAgIHByaXZhdGUgaW1wb3J0UmV3cml0ZXI6IEltcG9ydFJld3JpdGVyLCBwcml2YXRlIGluY3JlbWVudGFsRHJpdmVyOiBJbmNyZW1lbnRhbERyaXZlcixcbiAgICAgIHByaXZhdGUgcGVyZjogUGVyZlJlY29yZGVyLCBwcml2YXRlIHNvdXJjZVRvRmFjdG9yeVN5bWJvbHM6IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PnxudWxsLFxuICAgICAgcHJpdmF0ZSBzY29wZVJlZ2lzdHJ5OiBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksIHByaXZhdGUgY29tcGlsZU5vbkV4cG9ydGVkQ2xhc3NlczogYm9vbGVhbikge1xuICB9XG5cblxuICBnZXQgZXhwb3J0U3RhdGVtZW50cygpOiBNYXA8c3RyaW5nLCBNYXA8c3RyaW5nLCBbc3RyaW5nLCBzdHJpbmddPj4geyByZXR1cm4gdGhpcy5yZWV4cG9ydE1hcDsgfVxuXG4gIGFuYWx5emVTeW5jKHNmOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7IHJldHVybiB0aGlzLmFuYWx5emUoc2YsIGZhbHNlKTsgfVxuXG4gIGFuYWx5emVBc3luYyhzZjogdHMuU291cmNlRmlsZSk6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMuYW5hbHl6ZShzZiwgdHJ1ZSk7IH1cblxuICBwcml2YXRlIGRldGVjdEhhbmRsZXJzRm9yQ2xhc3Mobm9kZTogQ2xhc3NEZWNsYXJhdGlvbik6IEl2eUNsYXNzfG51bGwge1xuICAgIGlmICghdGhpcy5jb21waWxlTm9uRXhwb3J0ZWRDbGFzc2VzICYmICFpc0V4cG9ydGVkKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBUaGUgZmlyc3Qgc3RlcCBpcyB0byByZWZsZWN0IHRoZSBkZWNvcmF0b3JzLlxuICAgIGNvbnN0IGNsYXNzRGVjb3JhdG9ycyA9IHRoaXMucmVmbGVjdG9yLmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKG5vZGUpO1xuICAgIGxldCBpdnlDbGFzczogSXZ5Q2xhc3N8bnVsbCA9IG51bGw7XG5cbiAgICAvLyBMb29rIHRocm91Z2ggdGhlIERlY29yYXRvckhhbmRsZXJzIHRvIHNlZSBpZiBhbnkgYXJlIHJlbGV2YW50LlxuICAgIGZvciAoY29uc3QgaGFuZGxlciBvZiB0aGlzLmhhbmRsZXJzKSB7XG4gICAgICAvLyBBbiBhZGFwdGVyIGlzIHJlbGV2YW50IGlmIGl0IG1hdGNoZXMgb25lIG9mIHRoZSBkZWNvcmF0b3JzIG9uIHRoZSBjbGFzcy5cbiAgICAgIGNvbnN0IGRldGVjdGVkID0gaGFuZGxlci5kZXRlY3Qobm9kZSwgY2xhc3NEZWNvcmF0b3JzKTtcbiAgICAgIGlmIChkZXRlY3RlZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIFRoaXMgaGFuZGxlciBkaWRuJ3QgbWF0Y2guXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpc1ByaW1hcnlIYW5kbGVyID0gaGFuZGxlci5wcmVjZWRlbmNlID09PSBIYW5kbGVyUHJlY2VkZW5jZS5QUklNQVJZO1xuICAgICAgY29uc3QgaXNXZWFrSGFuZGxlciA9IGhhbmRsZXIucHJlY2VkZW5jZSA9PT0gSGFuZGxlclByZWNlZGVuY2UuV0VBSztcbiAgICAgIGNvbnN0IG1hdGNoID0ge1xuICAgICAgICBoYW5kbGVyLFxuICAgICAgICBhbmFseXplZDogbnVsbCwgZGV0ZWN0ZWQsXG4gICAgICB9O1xuXG4gICAgICBpZiAoaXZ5Q2xhc3MgPT09IG51bGwpIHtcbiAgICAgICAgLy8gVGhpcyBpcyB0aGUgZmlyc3QgaGFuZGxlciB0byBtYXRjaCB0aGlzIGNsYXNzLiBUaGlzIHBhdGggaXMgYSBmYXN0IHBhdGggdGhyb3VnaCB3aGljaFxuICAgICAgICAvLyBtb3N0IGNsYXNzZXMgd2lsbCBmbG93LlxuICAgICAgICBpdnlDbGFzcyA9IHtcbiAgICAgICAgICBtYXRjaGVkSGFuZGxlcnM6IFttYXRjaF0sXG4gICAgICAgICAgaGFzUHJpbWFyeUhhbmRsZXI6IGlzUHJpbWFyeUhhbmRsZXIsXG4gICAgICAgICAgaGFzV2Vha0hhbmRsZXJzOiBpc1dlYWtIYW5kbGVyLFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLml2eUNsYXNzZXMuc2V0KG5vZGUsIGl2eUNsYXNzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRoaXMgaXMgYXQgbGVhc3QgdGhlIHNlY29uZCBoYW5kbGVyIHRvIG1hdGNoIHRoaXMgY2xhc3MuIFRoaXMgaXMgYSBzbG93ZXIgcGF0aCB0aGF0IHNvbWVcbiAgICAgICAgLy8gY2xhc3NlcyB3aWxsIGdvIHRocm91Z2gsIHdoaWNoIHZhbGlkYXRlcyB0aGF0IHRoZSBzZXQgb2YgZGVjb3JhdG9ycyBhcHBsaWVkIHRvIHRoZSBjbGFzc1xuICAgICAgICAvLyBpcyB2YWxpZC5cblxuICAgICAgICAvLyBWYWxpZGF0ZSBhY2NvcmRpbmcgdG8gcnVsZXMgYXMgZm9sbG93czpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gKiBXRUFLIGhhbmRsZXJzIGFyZSByZW1vdmVkIGlmIGEgbm9uLVdFQUsgaGFuZGxlciBtYXRjaGVzLlxuICAgICAgICAvLyAqIE9ubHkgb25lIFBSSU1BUlkgaGFuZGxlciBjYW4gbWF0Y2ggYXQgYSB0aW1lLiBBbnkgb3RoZXIgUFJJTUFSWSBoYW5kbGVyIG1hdGNoaW5nIGFcbiAgICAgICAgLy8gICBjbGFzcyB3aXRoIGFuIGV4aXN0aW5nIFBSSU1BUlkgaGFuZGxlciBpcyBhbiBlcnJvci5cblxuICAgICAgICBpZiAoIWlzV2Vha0hhbmRsZXIgJiYgaXZ5Q2xhc3MuaGFzV2Vha0hhbmRsZXJzKSB7XG4gICAgICAgICAgLy8gVGhlIGN1cnJlbnQgaGFuZGxlciBpcyBub3QgYSBXRUFLIGhhbmRsZXIsIGJ1dCB0aGUgY2xhc3MgaGFzIG90aGVyIFdFQUsgaGFuZGxlcnMuXG4gICAgICAgICAgLy8gUmVtb3ZlIHRoZW0uXG4gICAgICAgICAgaXZ5Q2xhc3MubWF0Y2hlZEhhbmRsZXJzID0gaXZ5Q2xhc3MubWF0Y2hlZEhhbmRsZXJzLmZpbHRlcihcbiAgICAgICAgICAgICAgZmllbGQgPT4gZmllbGQuaGFuZGxlci5wcmVjZWRlbmNlICE9PSBIYW5kbGVyUHJlY2VkZW5jZS5XRUFLKTtcbiAgICAgICAgICBpdnlDbGFzcy5oYXNXZWFrSGFuZGxlcnMgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1dlYWtIYW5kbGVyICYmICFpdnlDbGFzcy5oYXNXZWFrSGFuZGxlcnMpIHtcbiAgICAgICAgICAvLyBUaGUgY3VycmVudCBoYW5kbGVyIGlzIGEgV0VBSyBoYW5kbGVyLCBidXQgdGhlIGNsYXNzIGhhcyBub24tV0VBSyBoYW5kbGVycyBhbHJlYWR5LlxuICAgICAgICAgIC8vIERyb3AgdGhlIGN1cnJlbnQgb25lLlxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzUHJpbWFyeUhhbmRsZXIgJiYgaXZ5Q2xhc3MuaGFzUHJpbWFyeUhhbmRsZXIpIHtcbiAgICAgICAgICAvLyBUaGUgY2xhc3MgYWxyZWFkeSBoYXMgYSBQUklNQVJZIGhhbmRsZXIsIGFuZCBhbm90aGVyIG9uZSBqdXN0IG1hdGNoZWQuXG4gICAgICAgICAgdGhpcy5fZGlhZ25vc3RpY3MucHVzaCh7XG4gICAgICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICAgICAgY29kZTogTnVtYmVyKCctOTknICsgRXJyb3JDb2RlLkRFQ09SQVRPUl9DT0xMSVNJT04pLFxuICAgICAgICAgICAgZmlsZTogZ2V0U291cmNlRmlsZShub2RlKSxcbiAgICAgICAgICAgIHN0YXJ0OiBub2RlLmdldFN0YXJ0KHVuZGVmaW5lZCwgZmFsc2UpLFxuICAgICAgICAgICAgbGVuZ3RoOiBub2RlLmdldFdpZHRoKCksXG4gICAgICAgICAgICBtZXNzYWdlVGV4dDogJ1R3byBpbmNvbXBhdGlibGUgZGVjb3JhdG9ycyBvbiBjbGFzcycsXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdGhpcy5pdnlDbGFzc2VzLmRlbGV0ZShub2RlKTtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE90aGVyd2lzZSwgaXQncyBzYWZlIHRvIGFjY2VwdCB0aGUgbXVsdGlwbGUgZGVjb3JhdG9ycyBoZXJlLiBVcGRhdGUgc29tZSBvZiB0aGUgbWV0YWRhdGFcbiAgICAgICAgLy8gcmVnYXJkaW5nIHRoaXMgY2xhc3MuXG4gICAgICAgIGl2eUNsYXNzLm1hdGNoZWRIYW5kbGVycy5wdXNoKG1hdGNoKTtcbiAgICAgICAgaXZ5Q2xhc3MuaGFzUHJpbWFyeUhhbmRsZXIgPSBpdnlDbGFzcy5oYXNQcmltYXJ5SGFuZGxlciB8fCBpc1ByaW1hcnlIYW5kbGVyO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBpdnlDbGFzcztcbiAgfVxuXG4gIC8qKlxuICAgKiBBbmFseXplIGEgc291cmNlIGZpbGUgYW5kIHByb2R1Y2UgZGlhZ25vc3RpY3MgZm9yIGl0IChpZiBhbnkpLlxuICAgKi9cbiAgcHJpdmF0ZSBhbmFseXplKHNmOiB0cy5Tb3VyY2VGaWxlLCBwcmVhbmFseXplOiBmYWxzZSk6IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBhbmFseXplKHNmOiB0cy5Tb3VyY2VGaWxlLCBwcmVhbmFseXplOiB0cnVlKTogUHJvbWlzZTx2b2lkPnx1bmRlZmluZWQ7XG4gIHByaXZhdGUgYW5hbHl6ZShzZjogdHMuU291cmNlRmlsZSwgcHJlYW5hbHl6ZTogYm9vbGVhbik6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkIHtcbiAgICBjb25zdCBwcm9taXNlczogUHJvbWlzZTx2b2lkPltdID0gW107XG4gICAgY29uc3QgYW5hbHl6ZUNsYXNzID0gKG5vZGU6IENsYXNzRGVjbGFyYXRpb24pOiB2b2lkID0+IHtcbiAgICAgIGNvbnN0IGl2eUNsYXNzID0gdGhpcy5kZXRlY3RIYW5kbGVyc0ZvckNsYXNzKG5vZGUpO1xuXG4gICAgICAvLyBJZiB0aGUgY2xhc3MgaGFzIG5vIEl2eSBiZWhhdmlvciAob3IgaGFkIGVycm9ycyksIHNraXAgaXQuXG4gICAgICBpZiAoaXZ5Q2xhc3MgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBMb29wIHRocm91Z2ggZWFjaCBtYXRjaGVkIGhhbmRsZXIgdGhhdCBuZWVkcyB0byBiZSBhbmFseXplZCBhbmQgYW5hbHl6ZSBpdCwgZWl0aGVyXG4gICAgICAvLyBzeW5jaHJvbm91c2x5IG9yIGFzeW5jaHJvbm91c2x5LlxuICAgICAgZm9yIChjb25zdCBtYXRjaCBvZiBpdnlDbGFzcy5tYXRjaGVkSGFuZGxlcnMpIHtcbiAgICAgICAgLy8gVGhlIGFuYWx5emUoKSBmdW5jdGlvbiB3aWxsIHJ1biB0aGUgYW5hbHlzaXMgcGhhc2Ugb2YgdGhlIGhhbmRsZXIuXG4gICAgICAgIGNvbnN0IGFuYWx5emUgPSAoKSA9PiB7XG4gICAgICAgICAgY29uc3QgYW5hbHl6ZUNsYXNzU3BhbiA9IHRoaXMucGVyZi5zdGFydCgnYW5hbHl6ZUNsYXNzJywgbm9kZSk7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG1hdGNoLmFuYWx5emVkID0gbWF0Y2guaGFuZGxlci5hbmFseXplKG5vZGUsIG1hdGNoLmRldGVjdGVkLm1ldGFkYXRhKTtcblxuICAgICAgICAgICAgaWYgKG1hdGNoLmFuYWx5emVkLmRpYWdub3N0aWNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgdGhpcy5fZGlhZ25vc3RpY3MucHVzaCguLi5tYXRjaC5hbmFseXplZC5kaWFnbm9zdGljcyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChtYXRjaC5hbmFseXplZC5mYWN0b3J5U3ltYm9sTmFtZSAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICAgICAgdGhpcy5zb3VyY2VUb0ZhY3RvcnlTeW1ib2xzICE9PSBudWxsICYmXG4gICAgICAgICAgICAgICAgdGhpcy5zb3VyY2VUb0ZhY3RvcnlTeW1ib2xzLmhhcyhzZi5maWxlTmFtZSkpIHtcbiAgICAgICAgICAgICAgdGhpcy5zb3VyY2VUb0ZhY3RvcnlTeW1ib2xzLmdldChzZi5maWxlTmFtZSkgIS5hZGQobWF0Y2guYW5hbHl6ZWQuZmFjdG9yeVN5bWJvbE5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIEZhdGFsRGlhZ25vc3RpY0Vycm9yKSB7XG4gICAgICAgICAgICAgIHRoaXMuX2RpYWdub3N0aWNzLnB1c2goZXJyLnRvRGlhZ25vc3RpYygpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5wZXJmLnN0b3AoYW5hbHl6ZUNsYXNzU3Bhbik7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIElmIHByZWFuYWx5c2lzIHdhcyByZXF1ZXN0ZWQgYW5kIGEgcHJlYW5hbHlzaXMgc3RlcCBleGlzdHMsIHRoZW4gcnVuIHByZWFuYWx5c2lzLlxuICAgICAgICAvLyBPdGhlcndpc2UsIHNraXAgZGlyZWN0bHkgdG8gYW5hbHlzaXMuXG4gICAgICAgIGlmIChwcmVhbmFseXplICYmIG1hdGNoLmhhbmRsZXIucHJlYW5hbHl6ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gUHJlYW5hbHlzaXMgbWlnaHQgcmV0dXJuIGEgUHJvbWlzZSwgaW5kaWNhdGluZyBhbiBhc3luYyBvcGVyYXRpb24gd2FzIG5lY2Vzc2FyeS4gT3IgaXRcbiAgICAgICAgICAvLyBtaWdodCByZXR1cm4gdW5kZWZpbmVkLCBpbmRpY2F0aW5nIG5vIGFzeW5jIHN0ZXAgd2FzIG5lZWRlZCBhbmQgYW5hbHlzaXMgY2FuIHByb2NlZWRcbiAgICAgICAgICAvLyBpbW1lZGlhdGVseS5cbiAgICAgICAgICBjb25zdCBwcmVhbmFseXNpcyA9IG1hdGNoLmhhbmRsZXIucHJlYW5hbHl6ZShub2RlLCBtYXRjaC5kZXRlY3RlZC5tZXRhZGF0YSk7XG4gICAgICAgICAgaWYgKHByZWFuYWx5c2lzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIEF3YWl0IHRoZSByZXN1bHRzIG9mIHByZWFuYWx5c2lzIGJlZm9yZSBydW5uaW5nIGFuYWx5c2lzLlxuICAgICAgICAgICAgcHJvbWlzZXMucHVzaChwcmVhbmFseXNpcy50aGVuKGFuYWx5emUpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTm8gYXN5bmMgcHJlYW5hbHlzaXMgbmVlZGVkLCBza2lwIGRpcmVjdGx5IHRvIGFuYWx5c2lzLlxuICAgICAgICAgICAgYW5hbHl6ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBOb3QgaW4gcHJlYW5hbHlzaXMgbW9kZSBvciBub3QgbmVlZGVkIGZvciB0aGlzIGhhbmRsZXIsIHNraXAgZGlyZWN0bHkgdG8gYW5hbHlzaXMuXG4gICAgICAgICAgYW5hbHl6ZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHZpc2l0ID0gKG5vZGU6IHRzLk5vZGUpOiB2b2lkID0+IHtcbiAgICAgIC8vIFByb2Nlc3Mgbm9kZXMgcmVjdXJzaXZlbHksIGFuZCBsb29rIGZvciBjbGFzcyBkZWNsYXJhdGlvbnMgd2l0aCBkZWNvcmF0b3JzLlxuICAgICAgaWYgKGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICAgIGFuYWx5emVDbGFzcyhub2RlKTtcbiAgICAgIH1cbiAgICAgIHRzLmZvckVhY2hDaGlsZChub2RlLCB2aXNpdCk7XG4gICAgfTtcblxuICAgIHZpc2l0KHNmKTtcblxuICAgIGlmIChwcmVhbmFseXplICYmIHByb21pc2VzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcykudGhlbigoKSA9PiB1bmRlZmluZWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBGZWVkcyBjb21wb25lbnRzIGRpc2NvdmVyZWQgaW4gdGhlIGNvbXBpbGF0aW9uIHRvIGEgY29udGV4dCBmb3IgaW5kZXhpbmcuXG4gICAqL1xuICBpbmRleChjb250ZXh0OiBJbmRleGluZ0NvbnRleHQpIHtcbiAgICB0aGlzLml2eUNsYXNzZXMuZm9yRWFjaCgoaXZ5Q2xhc3MsIGRlY2xhcmF0aW9uKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGl2eUNsYXNzLm1hdGNoZWRIYW5kbGVycykge1xuICAgICAgICBpZiAobWF0Y2guaGFuZGxlci5pbmRleCAhPT0gdW5kZWZpbmVkICYmIG1hdGNoLmFuYWx5emVkICE9PSBudWxsICYmXG4gICAgICAgICAgICBtYXRjaC5hbmFseXplZC5hbmFseXNpcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgbWF0Y2guaGFuZGxlci5pbmRleChjb250ZXh0LCBkZWNsYXJhdGlvbiwgbWF0Y2guYW5hbHl6ZWQuYW5hbHlzaXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICByZXNvbHZlKCk6IHZvaWQge1xuICAgIGNvbnN0IHJlc29sdmVTcGFuID0gdGhpcy5wZXJmLnN0YXJ0KCdyZXNvbHZlJyk7XG4gICAgdGhpcy5pdnlDbGFzc2VzLmZvckVhY2goKGl2eUNsYXNzLCBub2RlKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGl2eUNsYXNzLm1hdGNoZWRIYW5kbGVycykge1xuICAgICAgICBpZiAobWF0Y2guaGFuZGxlci5yZXNvbHZlICE9PSB1bmRlZmluZWQgJiYgbWF0Y2guYW5hbHl6ZWQgIT09IG51bGwgJiZcbiAgICAgICAgICAgIG1hdGNoLmFuYWx5emVkLmFuYWx5c2lzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjb25zdCByZXNvbHZlQ2xhc3NTcGFuID0gdGhpcy5wZXJmLnN0YXJ0KCdyZXNvbHZlQ2xhc3MnLCBub2RlKTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzID0gbWF0Y2guaGFuZGxlci5yZXNvbHZlKG5vZGUsIG1hdGNoLmFuYWx5emVkLmFuYWx5c2lzKTtcbiAgICAgICAgICAgIGlmIChyZXMucmVleHBvcnRzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcbiAgICAgICAgICAgICAgaWYgKCF0aGlzLnJlZXhwb3J0TWFwLmhhcyhmaWxlTmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlZXhwb3J0TWFwLnNldChmaWxlTmFtZSwgbmV3IE1hcDxzdHJpbmcsIFtzdHJpbmcsIHN0cmluZ10+KCkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnN0IGZpbGVSZWV4cG9ydHMgPSB0aGlzLnJlZXhwb3J0TWFwLmdldChmaWxlTmFtZSkgITtcbiAgICAgICAgICAgICAgZm9yIChjb25zdCByZWV4cG9ydCBvZiByZXMucmVleHBvcnRzKSB7XG4gICAgICAgICAgICAgICAgZmlsZVJlZXhwb3J0cy5zZXQocmVleHBvcnQuYXNBbGlhcywgW3JlZXhwb3J0LmZyb21Nb2R1bGUsIHJlZXhwb3J0LnN5bWJvbE5hbWVdKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlcy5kaWFnbm9zdGljcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIHRoaXMuX2RpYWdub3N0aWNzLnB1c2goLi4ucmVzLmRpYWdub3N0aWNzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBGYXRhbERpYWdub3N0aWNFcnJvcikge1xuICAgICAgICAgICAgICB0aGlzLl9kaWFnbm9zdGljcy5wdXNoKGVyci50b0RpYWdub3N0aWMoKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMucGVyZi5zdG9wKHJlc29sdmVDbGFzc1NwYW4pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMucGVyZi5zdG9wKHJlc29sdmVTcGFuKTtcbiAgICB0aGlzLnJlY29yZE5nTW9kdWxlU2NvcGVEZXBlbmRlbmNpZXMoKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVjb3JkTmdNb2R1bGVTY29wZURlcGVuZGVuY2llcygpIHtcbiAgICBjb25zdCByZWNvcmRTcGFuID0gdGhpcy5wZXJmLnN0YXJ0KCdyZWNvcmREZXBlbmRlbmNpZXMnKTtcbiAgICB0aGlzLnNjb3BlUmVnaXN0cnkgIS5nZXRDb21waWxhdGlvblNjb3BlcygpLmZvckVhY2goc2NvcGUgPT4ge1xuICAgICAgY29uc3QgZmlsZSA9IHNjb3BlLmRlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgIGNvbnN0IG5nTW9kdWxlRmlsZSA9IHNjb3BlLm5nTW9kdWxlLmdldFNvdXJjZUZpbGUoKTtcblxuICAgICAgLy8gQSBjaGFuZ2UgdG8gYW55IGRlcGVuZGVuY3kgb2YgdGhlIGRlY2xhcmF0aW9uIGNhdXNlcyB0aGUgZGVjbGFyYXRpb24gdG8gYmUgaW52YWxpZGF0ZWQsXG4gICAgICAvLyB3aGljaCByZXF1aXJlcyB0aGUgTmdNb2R1bGUgdG8gYmUgaW52YWxpZGF0ZWQgYXMgd2VsbC5cbiAgICAgIGNvbnN0IGRlcHMgPSB0aGlzLmluY3JlbWVudGFsRHJpdmVyLmdldEZpbGVEZXBlbmRlbmNpZXMoZmlsZSk7XG4gICAgICB0aGlzLmluY3JlbWVudGFsRHJpdmVyLnRyYWNrRmlsZURlcGVuZGVuY2llcyhkZXBzLCBuZ01vZHVsZUZpbGUpO1xuXG4gICAgICAvLyBBIGNoYW5nZSB0byB0aGUgTmdNb2R1bGUgZmlsZSBzaG91bGQgY2F1c2UgdGhlIGRlY2xhcmF0aW9uIGl0c2VsZiB0byBiZSBpbnZhbGlkYXRlZC5cbiAgICAgIHRoaXMuaW5jcmVtZW50YWxEcml2ZXIudHJhY2tGaWxlRGVwZW5kZW5jeShuZ01vZHVsZUZpbGUsIGZpbGUpO1xuXG4gICAgICAvLyBBIGNoYW5nZSB0byBhbnkgZGlyZWN0aXZlL3BpcGUgaW4gdGhlIGNvbXBpbGF0aW9uIHNjb3BlIHNob3VsZCBjYXVzZSB0aGUgZGVjbGFyYXRpb24gdG8gYmVcbiAgICAgIC8vIGludmFsaWRhdGVkLlxuICAgICAgc2NvcGUuZGlyZWN0aXZlcy5mb3JFYWNoKGRpcmVjdGl2ZSA9PiB7XG4gICAgICAgIGNvbnN0IGRpclNmID0gZGlyZWN0aXZlLnJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKTtcblxuICAgICAgICAvLyBXaGVuIGEgZGlyZWN0aXZlIGluIHNjb3BlIGlzIHVwZGF0ZWQsIHRoZSBkZWNsYXJhdGlvbiBuZWVkcyB0byBiZSByZWNvbXBpbGVkIGFzIGUuZy5cbiAgICAgICAgLy8gYSBzZWxlY3RvciBtYXkgaGF2ZSBjaGFuZ2VkLlxuICAgICAgICB0aGlzLmluY3JlbWVudGFsRHJpdmVyLnRyYWNrRmlsZURlcGVuZGVuY3koZGlyU2YsIGZpbGUpO1xuXG4gICAgICAgIC8vIFdoZW4gYW55IG9mIHRoZSBkZXBlbmRlbmNpZXMgb2YgdGhlIGRlY2xhcmF0aW9uIGNoYW5nZXMsIHRoZSBOZ01vZHVsZSBzY29wZSBtYXkgYmVcbiAgICAgICAgLy8gYWZmZWN0ZWQgc28gYSBjb21wb25lbnQgd2l0aGluIHNjb3BlIG11c3QgYmUgcmVjb21waWxlZC4gT25seSBjb21wb25lbnRzIG5lZWQgdG8gYmVcbiAgICAgICAgLy8gcmVjb21waWxlZCwgYXMgZGlyZWN0aXZlcyBhcmUgbm90IGRlcGVuZGVudCB1cG9uIHRoZSBjb21waWxhdGlvbiBzY29wZS5cbiAgICAgICAgaWYgKGRpcmVjdGl2ZS5pc0NvbXBvbmVudCkge1xuICAgICAgICAgIHRoaXMuaW5jcmVtZW50YWxEcml2ZXIudHJhY2tGaWxlRGVwZW5kZW5jaWVzKGRlcHMsIGRpclNmKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBzY29wZS5waXBlcy5mb3JFYWNoKHBpcGUgPT4ge1xuICAgICAgICAvLyBXaGVuIGEgcGlwZSBpbiBzY29wZSBpcyB1cGRhdGVkLCB0aGUgZGVjbGFyYXRpb24gbmVlZHMgdG8gYmUgcmVjb21waWxlZCBhcyBlLmcuXG4gICAgICAgIC8vIHRoZSBwaXBlJ3MgbmFtZSBtYXkgaGF2ZSBjaGFuZ2VkLlxuICAgICAgICB0aGlzLmluY3JlbWVudGFsRHJpdmVyLnRyYWNrRmlsZURlcGVuZGVuY3kocGlwZS5yZWYubm9kZS5nZXRTb3VyY2VGaWxlKCksIGZpbGUpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgdGhpcy5wZXJmLnN0b3AocmVjb3JkU3Bhbik7XG4gIH1cblxuICB0eXBlQ2hlY2soY29udGV4dDogVHlwZUNoZWNrQ29udGV4dCk6IHZvaWQge1xuICAgIHRoaXMuaXZ5Q2xhc3Nlcy5mb3JFYWNoKChpdnlDbGFzcywgbm9kZSkgPT4ge1xuICAgICAgZm9yIChjb25zdCBtYXRjaCBvZiBpdnlDbGFzcy5tYXRjaGVkSGFuZGxlcnMpIHtcbiAgICAgICAgaWYgKG1hdGNoLmhhbmRsZXIudHlwZUNoZWNrICE9PSB1bmRlZmluZWQgJiYgbWF0Y2guYW5hbHl6ZWQgIT09IG51bGwgJiZcbiAgICAgICAgICAgIG1hdGNoLmFuYWx5emVkLmFuYWx5c2lzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBtYXRjaC5oYW5kbGVyLnR5cGVDaGVjayhjb250ZXh0LCBub2RlLCBtYXRjaC5hbmFseXplZC5hbmFseXNpcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQZXJmb3JtIGEgY29tcGlsYXRpb24gb3BlcmF0aW9uIG9uIHRoZSBnaXZlbiBjbGFzcyBkZWNsYXJhdGlvbiBhbmQgcmV0dXJuIGluc3RydWN0aW9ucyB0byBhblxuICAgKiBBU1QgdHJhbnNmb3JtZXIgaWYgYW55IGFyZSBhdmFpbGFibGUuXG4gICAqL1xuICBjb21waWxlSXZ5RmllbGRGb3Iobm9kZTogdHMuRGVjbGFyYXRpb24sIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sKTogQ29tcGlsZVJlc3VsdFtdfHVuZGVmaW5lZCB7XG4gICAgLy8gTG9vayB0byBzZWUgd2hldGhlciB0aGUgb3JpZ2luYWwgbm9kZSB3YXMgYW5hbHl6ZWQuIElmIG5vdCwgdGhlcmUncyBub3RoaW5nIHRvIGRvLlxuICAgIGNvbnN0IG9yaWdpbmFsID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHR5cGVvZiBub2RlO1xuICAgIGlmICghaXNOYW1lZENsYXNzRGVjbGFyYXRpb24ob3JpZ2luYWwpIHx8ICF0aGlzLml2eUNsYXNzZXMuaGFzKG9yaWdpbmFsKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBpdnlDbGFzcyA9IHRoaXMuaXZ5Q2xhc3Nlcy5nZXQob3JpZ2luYWwpICE7XG5cbiAgICBsZXQgcmVzOiBDb21waWxlUmVzdWx0W10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgaXZ5Q2xhc3MubWF0Y2hlZEhhbmRsZXJzKSB7XG4gICAgICBpZiAobWF0Y2guYW5hbHl6ZWQgPT09IG51bGwgfHwgbWF0Y2guYW5hbHl6ZWQuYW5hbHlzaXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgY29tcGlsZVNwYW4gPSB0aGlzLnBlcmYuc3RhcnQoJ2NvbXBpbGVDbGFzcycsIG9yaWdpbmFsKTtcbiAgICAgIGNvbnN0IGNvbXBpbGVNYXRjaFJlcyA9XG4gICAgICAgICAgbWF0Y2guaGFuZGxlci5jb21waWxlKG5vZGUgYXMgQ2xhc3NEZWNsYXJhdGlvbiwgbWF0Y2guYW5hbHl6ZWQuYW5hbHlzaXMsIGNvbnN0YW50UG9vbCk7XG4gICAgICB0aGlzLnBlcmYuc3RvcChjb21waWxlU3Bhbik7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShjb21waWxlTWF0Y2hSZXMpKSB7XG4gICAgICAgIGNvbXBpbGVNYXRjaFJlcy5mb3JFYWNoKHJlc3VsdCA9PiB7XG4gICAgICAgICAgaWYgKCFyZXMuc29tZShyID0+IHIubmFtZSA9PT0gcmVzdWx0Lm5hbWUpKSB7XG4gICAgICAgICAgICByZXMucHVzaChyZXN1bHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKCFyZXMuc29tZShyZXN1bHQgPT4gcmVzdWx0Lm5hbWUgPT09IGNvbXBpbGVNYXRjaFJlcy5uYW1lKSkge1xuICAgICAgICByZXMucHVzaChjb21waWxlTWF0Y2hSZXMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIExvb2sgdXAgdGhlIC5kLnRzIHRyYW5zZm9ybWVyIGZvciB0aGUgaW5wdXQgZmlsZSBhbmQgcmVjb3JkIHRoYXQgYXQgbGVhc3Qgb25lIGZpZWxkIHdhc1xuICAgIC8vIGdlbmVyYXRlZCwgd2hpY2ggd2lsbCBhbGxvdyB0aGUgLmQudHMgdG8gYmUgdHJhbnNmb3JtZWQgbGF0ZXIuXG4gICAgY29uc3QgZmlsZU5hbWUgPSBvcmlnaW5hbC5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG4gICAgY29uc3QgZHRzVHJhbnNmb3JtZXIgPSB0aGlzLmdldER0c1RyYW5zZm9ybWVyKGZpbGVOYW1lKTtcbiAgICBkdHNUcmFuc2Zvcm1lci5yZWNvcmRTdGF0aWNGaWVsZChyZWZsZWN0TmFtZU9mRGVjbGFyYXRpb24obm9kZSkgISwgcmVzKTtcblxuICAgIC8vIFJldHVybiB0aGUgaW5zdHJ1Y3Rpb24gdG8gdGhlIHRyYW5zZm9ybWVyIHNvIHRoZSBmaWVsZHMgd2lsbCBiZSBhZGRlZC5cbiAgICByZXR1cm4gcmVzLmxlbmd0aCA+IDAgPyByZXMgOiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogTG9va3VwIHRoZSBgdHMuRGVjb3JhdG9yYCB3aGljaCB0cmlnZ2VyZWQgdHJhbnNmb3JtYXRpb24gb2YgYSBwYXJ0aWN1bGFyIGNsYXNzIGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgaXZ5RGVjb3JhdG9yc0Zvcihub2RlOiB0cy5EZWNsYXJhdGlvbik6IHRzLkRlY29yYXRvcltdIHtcbiAgICBjb25zdCBvcmlnaW5hbCA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKSBhcyB0eXBlb2Ygbm9kZTtcblxuICAgIGlmICghaXNOYW1lZENsYXNzRGVjbGFyYXRpb24ob3JpZ2luYWwpIHx8ICF0aGlzLml2eUNsYXNzZXMuaGFzKG9yaWdpbmFsKSkge1xuICAgICAgcmV0dXJuIEVNUFRZX0FSUkFZO1xuICAgIH1cbiAgICBjb25zdCBpdnlDbGFzcyA9IHRoaXMuaXZ5Q2xhc3Nlcy5nZXQob3JpZ2luYWwpICE7XG4gICAgY29uc3QgZGVjb3JhdG9yczogdHMuRGVjb3JhdG9yW10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgaXZ5Q2xhc3MubWF0Y2hlZEhhbmRsZXJzKSB7XG4gICAgICBpZiAobWF0Y2guYW5hbHl6ZWQgPT09IG51bGwgfHwgbWF0Y2guYW5hbHl6ZWQuYW5hbHlzaXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChtYXRjaC5kZXRlY3RlZC50cmlnZ2VyICE9PSBudWxsICYmIHRzLmlzRGVjb3JhdG9yKG1hdGNoLmRldGVjdGVkLnRyaWdnZXIpKSB7XG4gICAgICAgIGRlY29yYXRvcnMucHVzaChtYXRjaC5kZXRlY3RlZC50cmlnZ2VyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGVjb3JhdG9ycztcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzIGEgZGVjbGFyYXRpb24gZmlsZSBhbmQgcmV0dXJuIGEgdHJhbnNmb3JtZWQgdmVyc2lvbiB0aGF0IGluY29ycG9yYXRlcyB0aGUgY2hhbmdlc1xuICAgKiBtYWRlIHRvIHRoZSBzb3VyY2UgZmlsZS5cbiAgICovXG4gIHRyYW5zZm9ybWVkRHRzRm9yKGZpbGU6IHRzLlNvdXJjZUZpbGUsIGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCk6IHRzLlNvdXJjZUZpbGUge1xuICAgIC8vIE5vIG5lZWQgdG8gdHJhbnNmb3JtIGlmIGl0J3Mgbm90IGEgZGVjbGFyYXRpb25zIGZpbGUsIG9yIGlmIG5vIGNoYW5nZXMgaGF2ZSBiZWVuIHJlcXVlc3RlZFxuICAgIC8vIHRvIHRoZSBpbnB1dCBmaWxlLlxuICAgIC8vIER1ZSB0byB0aGUgd2F5IFR5cGVTY3JpcHQgYWZ0ZXJEZWNsYXJhdGlvbnMgdHJhbnNmb3JtZXJzIHdvcmssIHRoZSBTb3VyY2VGaWxlIHBhdGggaXMgdGhlXG4gICAgLy8gc2FtZSBhcyB0aGUgb3JpZ2luYWwgLnRzLlxuICAgIC8vIFRoZSBvbmx5IHdheSB3ZSBrbm93IGl0J3MgYWN0dWFsbHkgYSBkZWNsYXJhdGlvbiBmaWxlIGlzIHZpYSB0aGUgaXNEZWNsYXJhdGlvbkZpbGUgcHJvcGVydHkuXG4gICAgaWYgKCFmaWxlLmlzRGVjbGFyYXRpb25GaWxlIHx8ICF0aGlzLmR0c01hcC5oYXMoZmlsZS5maWxlTmFtZSkpIHtcbiAgICAgIHJldHVybiBmaWxlO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB0aGUgdHJhbnNmb3JtZWQgc291cmNlLlxuICAgIHJldHVybiB0aGlzLmR0c01hcC5nZXQoZmlsZS5maWxlTmFtZSkgIS50cmFuc2Zvcm0oZmlsZSwgY29udGV4dCk7XG4gIH1cblxuICBnZXQgZGlhZ25vc3RpY3MoKTogUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7IHJldHVybiB0aGlzLl9kaWFnbm9zdGljczsgfVxuXG4gIHByaXZhdGUgZ2V0RHRzVHJhbnNmb3JtZXIodHNGaWxlTmFtZTogc3RyaW5nKTogRHRzRmlsZVRyYW5zZm9ybWVyIHtcbiAgICBpZiAoIXRoaXMuZHRzTWFwLmhhcyh0c0ZpbGVOYW1lKSkge1xuICAgICAgdGhpcy5kdHNNYXAuc2V0KHRzRmlsZU5hbWUsIG5ldyBEdHNGaWxlVHJhbnNmb3JtZXIodGhpcy5pbXBvcnRSZXdyaXRlcikpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5kdHNNYXAuZ2V0KHRzRmlsZU5hbWUpICE7XG4gIH1cbn1cbiJdfQ==