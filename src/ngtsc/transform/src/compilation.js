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
        function IvyCompilation(handlers, checker, reflector, importRewriter, sourceToFactorySymbols) {
            this.handlers = handlers;
            this.checker = checker;
            this.reflector = reflector;
            this.importRewriter = importRewriter;
            this.sourceToFactorySymbols = sourceToFactorySymbols;
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
                if (ts.isClassDeclaration(node)) {
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
        IvyCompilation.prototype.resolve = function () {
            var _this = this;
            this.ivyClasses.forEach(function (ivyClass, node) {
                var e_3, _a, e_4, _b;
                try {
                    for (var _c = tslib_1.__values(ivyClass.matchedHandlers), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var match = _d.value;
                        if (match.handler.resolve !== undefined && match.analyzed !== null &&
                            match.analyzed.analysis !== undefined) {
                            var res = match.handler.resolve(node, match.analyzed.analysis);
                            if (res.reexports !== undefined) {
                                var fileName = node.getSourceFile().fileName;
                                if (!_this.reexportMap.has(fileName)) {
                                    _this.reexportMap.set(fileName, new Map());
                                }
                                var fileReexports = _this.reexportMap.get(fileName);
                                try {
                                    for (var _e = tslib_1.__values(res.reexports), _f = _e.next(); !_f.done; _f = _e.next()) {
                                        var reexport = _f.value;
                                        fileReexports.set(reexport.asAlias, [reexport.fromModule, reexport.symbolName]);
                                    }
                                }
                                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                                finally {
                                    try {
                                        if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                                    }
                                    finally { if (e_4) throw e_4.error; }
                                }
                            }
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
            });
        };
        IvyCompilation.prototype.typeCheck = function (context) {
            this.ivyClasses.forEach(function (ivyClass, node) {
                var e_5, _a;
                try {
                    for (var _b = tslib_1.__values(ivyClass.matchedHandlers), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var match = _c.value;
                        if (match.handler.typeCheck !== undefined && match.analyzed !== null &&
                            match.analyzed.analysis !== undefined) {
                            match.handler.typeCheck(context, node, match.analyzed.analysis);
                        }
                    }
                }
                catch (e_5_1) { e_5 = { error: e_5_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_5) throw e_5.error; }
                }
            });
        };
        /**
         * Perform a compilation operation on the given class declaration and return instructions to an
         * AST transformer if any are available.
         */
        IvyCompilation.prototype.compileIvyFieldFor = function (node, constantPool) {
            var e_6, _a;
            // Look to see whether the original node was analyzed. If not, there's nothing to do.
            var original = ts.getOriginalNode(node);
            if (!this.ivyClasses.has(original)) {
                return undefined;
            }
            var ivyClass = this.ivyClasses.get(original);
            var res = [];
            try {
                for (var _b = tslib_1.__values(ivyClass.matchedHandlers), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var match = _c.value;
                    if (match.analyzed === null || match.analyzed.analysis === undefined) {
                        continue;
                    }
                    var compileMatchRes = match.handler.compile(node, match.analyzed.analysis, constantPool);
                    if (!Array.isArray(compileMatchRes)) {
                        res.push(compileMatchRes);
                    }
                    else {
                        res.push.apply(res, tslib_1.__spread(compileMatchRes));
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
            var e_7, _a;
            var original = ts.getOriginalNode(node);
            if (!this.ivyClasses.has(original)) {
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
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_7) throw e_7.error; }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvY29tcGlsYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBR0gsK0JBQWlDO0lBRWpDLDJFQUFrRTtJQUVsRSx5RUFBMEU7SUFFMUUsa0ZBQXdEO0lBRXhELHlFQUF1RztJQUN2Ryx5RkFBaUQ7SUFFakQsSUFBTSxXQUFXLEdBQVEsRUFBRSxDQUFDO0lBbUI1Qjs7Ozs7T0FLRztJQUNIO1FBb0JFOzs7Ozs7OztXQVFHO1FBQ0gsd0JBQ1ksUUFBc0MsRUFBVSxPQUF1QixFQUN2RSxTQUF5QixFQUFVLGNBQThCLEVBQ2pFLHNCQUFxRDtZQUZyRCxhQUFRLEdBQVIsUUFBUSxDQUE4QjtZQUFVLFlBQU8sR0FBUCxPQUFPLENBQWdCO1lBQ3ZFLGNBQVMsR0FBVCxTQUFTLENBQWdCO1lBQVUsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1lBQ2pFLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBK0I7WUEvQmpFOzs7ZUFHRztZQUNLLGVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBNEIsQ0FBQztZQUV6RDs7ZUFFRztZQUVIOztlQUVHO1lBQ0ssV0FBTSxHQUFHLElBQUksR0FBRyxFQUE4QixDQUFDO1lBRS9DLGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQXlDLENBQUM7WUFDL0QsaUJBQVksR0FBb0IsRUFBRSxDQUFDO1FBZXlCLENBQUM7UUFHckUsc0JBQUksNENBQWdCO2lCQUFwQixjQUFxRSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUUvRixvQ0FBVyxHQUFYLFVBQVksRUFBaUIsSUFBVSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDLENB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LFVBQVUsQ0FBQztRQUNwQixDQUFDO1FBRUQ7OztXQUdHO1FBQ0gsMENBQWlCLEdBQWpCLFVBQWtCLElBQW1CLEVBQUUsT0FBaUM7WUFDdEUsNkZBQTZGO1lBQzdGLHFCQUFxQjtZQUNyQiw0RkFBNEY7WUFDNUYsNEJBQTRCO1lBQzVCLCtGQUErRjtZQUMvRixJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUM5RCxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsaUNBQWlDO1lBQ2pDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDbkUsQ0FBQztRQUVELHNCQUFJLHVDQUFXO2lCQUFmLGNBQWtELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBRXJFLDBDQUFpQixHQUF6QixVQUEwQixVQUFrQjtZQUMxQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQ2hDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxJQUFJLGdDQUFrQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO2FBQzFFO1lBQ0QsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUcsQ0FBQztRQUN2QyxDQUFDO1FBQ0gscUJBQUM7SUFBRCxDQUFDLEFBL1RELElBK1RDO0lBL1RZLHdDQUFjIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbnN0YW50UG9vbCwgRXh0ZXJuYWxFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0ltcG9ydFJld3JpdGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7UmVmbGVjdGlvbkhvc3QsIHJlZmxlY3ROYW1lT2ZEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge1R5cGVDaGVja0NvbnRleHR9IGZyb20gJy4uLy4uL3R5cGVjaGVjayc7XG5pbXBvcnQge2dldFNvdXJjZUZpbGV9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0FuYWx5c2lzT3V0cHV0LCBDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyLCBEZXRlY3RSZXN1bHQsIEhhbmRsZXJQcmVjZWRlbmNlfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge0R0c0ZpbGVUcmFuc2Zvcm1lcn0gZnJvbSAnLi9kZWNsYXJhdGlvbic7XG5cbmNvbnN0IEVNUFRZX0FSUkFZOiBhbnkgPSBbXTtcblxuLyoqXG4gKiBSZWNvcmQgb2YgYW4gYWRhcHRlciB3aGljaCBkZWNpZGVkIHRvIGVtaXQgYSBzdGF0aWMgZmllbGQsIGFuZCB0aGUgYW5hbHlzaXMgaXQgcGVyZm9ybWVkIHRvXG4gKiBwcmVwYXJlIGZvciB0aGF0IG9wZXJhdGlvbi5cbiAqL1xuaW50ZXJmYWNlIE1hdGNoZWRIYW5kbGVyPEEsIE0+IHtcbiAgaGFuZGxlcjogRGVjb3JhdG9ySGFuZGxlcjxBLCBNPjtcbiAgYW5hbHl6ZWQ6IEFuYWx5c2lzT3V0cHV0PEE+fG51bGw7XG4gIGRldGVjdGVkOiBEZXRlY3RSZXN1bHQ8TT47XG59XG5cbmludGVyZmFjZSBJdnlDbGFzcyB7XG4gIG1hdGNoZWRIYW5kbGVyczogTWF0Y2hlZEhhbmRsZXI8YW55LCBhbnk+W107XG5cbiAgaGFzV2Vha0hhbmRsZXJzOiBib29sZWFuO1xuICBoYXNQcmltYXJ5SGFuZGxlcjogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBNYW5hZ2VzIGEgY29tcGlsYXRpb24gb2YgSXZ5IGRlY29yYXRvcnMgaW50byBzdGF0aWMgZmllbGRzIGFjcm9zcyBhbiBlbnRpcmUgdHMuUHJvZ3JhbS5cbiAqXG4gKiBUaGUgY29tcGlsYXRpb24gaXMgc3RhdGVmdWwgLSBzb3VyY2UgZmlsZXMgYXJlIGFuYWx5emVkIGFuZCByZWNvcmRzIG9mIHRoZSBvcGVyYXRpb25zIHRoYXQgbmVlZFxuICogdG8gYmUgcGVyZm9ybWVkIGR1cmluZyB0aGUgdHJhbnNmb3JtL2VtaXQgcHJvY2VzcyBhcmUgbWFpbnRhaW5lZCBpbnRlcm5hbGx5LlxuICovXG5leHBvcnQgY2xhc3MgSXZ5Q29tcGlsYXRpb24ge1xuICAvKipcbiAgICogVHJhY2tzIGNsYXNzZXMgd2hpY2ggaGF2ZSBiZWVuIGFuYWx5emVkIGFuZCBmb3VuZCB0byBoYXZlIGFuIEl2eSBkZWNvcmF0b3IsIGFuZCB0aGVcbiAgICogaW5mb3JtYXRpb24gcmVjb3JkZWQgYWJvdXQgdGhlbSBmb3IgbGF0ZXIgY29tcGlsYXRpb24uXG4gICAqL1xuICBwcml2YXRlIGl2eUNsYXNzZXMgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBJdnlDbGFzcz4oKTtcblxuICAvKipcbiAgICogVHJhY2tzIGZhY3RvcnkgaW5mb3JtYXRpb24gd2hpY2ggbmVlZHMgdG8gYmUgZ2VuZXJhdGVkLlxuICAgKi9cblxuICAvKipcbiAgICogVHJhY2tzIHRoZSBgRHRzRmlsZVRyYW5zZm9ybWVyYHMgZm9yIGVhY2ggVFMgZmlsZSB0aGF0IG5lZWRzIC5kLnRzIHRyYW5zZm9ybWF0aW9ucy5cbiAgICovXG4gIHByaXZhdGUgZHRzTWFwID0gbmV3IE1hcDxzdHJpbmcsIER0c0ZpbGVUcmFuc2Zvcm1lcj4oKTtcblxuICBwcml2YXRlIHJlZXhwb3J0TWFwID0gbmV3IE1hcDxzdHJpbmcsIE1hcDxzdHJpbmcsIFtzdHJpbmcsIHN0cmluZ10+PigpO1xuICBwcml2YXRlIF9kaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG5cblxuICAvKipcbiAgICogQHBhcmFtIGhhbmRsZXJzIGFycmF5IG9mIGBEZWNvcmF0b3JIYW5kbGVyYHMgd2hpY2ggd2lsbCBiZSBleGVjdXRlZCBhZ2FpbnN0IGVhY2ggY2xhc3MgaW4gdGhlXG4gICAqIHByb2dyYW1cbiAgICogQHBhcmFtIGNoZWNrZXIgVHlwZVNjcmlwdCBgVHlwZUNoZWNrZXJgIGluc3RhbmNlIGZvciB0aGUgcHJvZ3JhbVxuICAgKiBAcGFyYW0gcmVmbGVjdG9yIGBSZWZsZWN0aW9uSG9zdGAgdGhyb3VnaCB3aGljaCBhbGwgcmVmbGVjdGlvbiBvcGVyYXRpb25zIHdpbGwgYmUgcGVyZm9ybWVkXG4gICAqIEBwYXJhbSBjb3JlSW1wb3J0c0Zyb20gYSBUeXBlU2NyaXB0IGBTb3VyY2VGaWxlYCB3aGljaCBleHBvcnRzIHN5bWJvbHMgbmVlZGVkIGZvciBJdnkgaW1wb3J0c1xuICAgKiB3aGVuIGNvbXBpbGluZyBAYW5ndWxhci9jb3JlLCBvciBgbnVsbGAgaWYgdGhlIGN1cnJlbnQgcHJvZ3JhbSBpcyBub3QgQGFuZ3VsYXIvY29yZS4gVGhpcyBpc1xuICAgKiBgbnVsbGAgaW4gbW9zdCBjYXNlcy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBoYW5kbGVyczogRGVjb3JhdG9ySGFuZGxlcjxhbnksIGFueT5bXSwgcHJpdmF0ZSBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcixcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBpbXBvcnRSZXdyaXRlcjogSW1wb3J0UmV3cml0ZXIsXG4gICAgICBwcml2YXRlIHNvdXJjZVRvRmFjdG9yeVN5bWJvbHM6IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PnxudWxsKSB7fVxuXG5cbiAgZ2V0IGV4cG9ydFN0YXRlbWVudHMoKTogTWFwPHN0cmluZywgTWFwPHN0cmluZywgW3N0cmluZywgc3RyaW5nXT4+IHsgcmV0dXJuIHRoaXMucmVleHBvcnRNYXA7IH1cblxuICBhbmFseXplU3luYyhzZjogdHMuU291cmNlRmlsZSk6IHZvaWQgeyByZXR1cm4gdGhpcy5hbmFseXplKHNmLCBmYWxzZSk7IH1cblxuICBhbmFseXplQXN5bmMoc2Y6IHRzLlNvdXJjZUZpbGUpOiBQcm9taXNlPHZvaWQ+fHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLmFuYWx5emUoc2YsIHRydWUpOyB9XG5cbiAgcHJpdmF0ZSBkZXRlY3RIYW5kbGVyc0ZvckNsYXNzKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogSXZ5Q2xhc3N8bnVsbCB7XG4gICAgLy8gVGhlIGZpcnN0IHN0ZXAgaXMgdG8gcmVmbGVjdCB0aGUgZGVjb3JhdG9ycy5cbiAgICBjb25zdCBjbGFzc0RlY29yYXRvcnMgPSB0aGlzLnJlZmxlY3Rvci5nZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihub2RlKTtcbiAgICBsZXQgaXZ5Q2xhc3M6IEl2eUNsYXNzfG51bGwgPSBudWxsO1xuXG4gICAgLy8gTG9vayB0aHJvdWdoIHRoZSBEZWNvcmF0b3JIYW5kbGVycyB0byBzZWUgaWYgYW55IGFyZSByZWxldmFudC5cbiAgICBmb3IgKGNvbnN0IGhhbmRsZXIgb2YgdGhpcy5oYW5kbGVycykge1xuICAgICAgLy8gQW4gYWRhcHRlciBpcyByZWxldmFudCBpZiBpdCBtYXRjaGVzIG9uZSBvZiB0aGUgZGVjb3JhdG9ycyBvbiB0aGUgY2xhc3MuXG4gICAgICBjb25zdCBkZXRlY3RlZCA9IGhhbmRsZXIuZGV0ZWN0KG5vZGUsIGNsYXNzRGVjb3JhdG9ycyk7XG4gICAgICBpZiAoZGV0ZWN0ZWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBUaGlzIGhhbmRsZXIgZGlkbid0IG1hdGNoLlxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaXNQcmltYXJ5SGFuZGxlciA9IGhhbmRsZXIucHJlY2VkZW5jZSA9PT0gSGFuZGxlclByZWNlZGVuY2UuUFJJTUFSWTtcbiAgICAgIGNvbnN0IGlzV2Vha0hhbmRsZXIgPSBoYW5kbGVyLnByZWNlZGVuY2UgPT09IEhhbmRsZXJQcmVjZWRlbmNlLldFQUs7XG4gICAgICBjb25zdCBtYXRjaCA9IHtcbiAgICAgICAgaGFuZGxlcixcbiAgICAgICAgYW5hbHl6ZWQ6IG51bGwsIGRldGVjdGVkLFxuICAgICAgfTtcblxuICAgICAgaWYgKGl2eUNsYXNzID09PSBudWxsKSB7XG4gICAgICAgIC8vIFRoaXMgaXMgdGhlIGZpcnN0IGhhbmRsZXIgdG8gbWF0Y2ggdGhpcyBjbGFzcy4gVGhpcyBwYXRoIGlzIGEgZmFzdCBwYXRoIHRocm91Z2ggd2hpY2hcbiAgICAgICAgLy8gbW9zdCBjbGFzc2VzIHdpbGwgZmxvdy5cbiAgICAgICAgaXZ5Q2xhc3MgPSB7XG4gICAgICAgICAgbWF0Y2hlZEhhbmRsZXJzOiBbbWF0Y2hdLFxuICAgICAgICAgIGhhc1ByaW1hcnlIYW5kbGVyOiBpc1ByaW1hcnlIYW5kbGVyLFxuICAgICAgICAgIGhhc1dlYWtIYW5kbGVyczogaXNXZWFrSGFuZGxlcixcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5pdnlDbGFzc2VzLnNldChub2RlLCBpdnlDbGFzcyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBUaGlzIGlzIGF0IGxlYXN0IHRoZSBzZWNvbmQgaGFuZGxlciB0byBtYXRjaCB0aGlzIGNsYXNzLiBUaGlzIGlzIGEgc2xvd2VyIHBhdGggdGhhdCBzb21lXG4gICAgICAgIC8vIGNsYXNzZXMgd2lsbCBnbyB0aHJvdWdoLCB3aGljaCB2YWxpZGF0ZXMgdGhhdCB0aGUgc2V0IG9mIGRlY29yYXRvcnMgYXBwbGllZCB0byB0aGUgY2xhc3NcbiAgICAgICAgLy8gaXMgdmFsaWQuXG5cbiAgICAgICAgLy8gVmFsaWRhdGUgYWNjb3JkaW5nIHRvIHJ1bGVzIGFzIGZvbGxvd3M6XG4gICAgICAgIC8vXG4gICAgICAgIC8vICogV0VBSyBoYW5kbGVycyBhcmUgcmVtb3ZlZCBpZiBhIG5vbi1XRUFLIGhhbmRsZXIgbWF0Y2hlcy5cbiAgICAgICAgLy8gKiBPbmx5IG9uZSBQUklNQVJZIGhhbmRsZXIgY2FuIG1hdGNoIGF0IGEgdGltZS4gQW55IG90aGVyIFBSSU1BUlkgaGFuZGxlciBtYXRjaGluZyBhXG4gICAgICAgIC8vICAgY2xhc3Mgd2l0aCBhbiBleGlzdGluZyBQUklNQVJZIGhhbmRsZXIgaXMgYW4gZXJyb3IuXG5cbiAgICAgICAgaWYgKCFpc1dlYWtIYW5kbGVyICYmIGl2eUNsYXNzLmhhc1dlYWtIYW5kbGVycykge1xuICAgICAgICAgIC8vIFRoZSBjdXJyZW50IGhhbmRsZXIgaXMgbm90IGEgV0VBSyBoYW5kbGVyLCBidXQgdGhlIGNsYXNzIGhhcyBvdGhlciBXRUFLIGhhbmRsZXJzLlxuICAgICAgICAgIC8vIFJlbW92ZSB0aGVtLlxuICAgICAgICAgIGl2eUNsYXNzLm1hdGNoZWRIYW5kbGVycyA9IGl2eUNsYXNzLm1hdGNoZWRIYW5kbGVycy5maWx0ZXIoXG4gICAgICAgICAgICAgIGZpZWxkID0+IGZpZWxkLmhhbmRsZXIucHJlY2VkZW5jZSAhPT0gSGFuZGxlclByZWNlZGVuY2UuV0VBSyk7XG4gICAgICAgICAgaXZ5Q2xhc3MuaGFzV2Vha0hhbmRsZXJzID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNXZWFrSGFuZGxlciAmJiAhaXZ5Q2xhc3MuaGFzV2Vha0hhbmRsZXJzKSB7XG4gICAgICAgICAgLy8gVGhlIGN1cnJlbnQgaGFuZGxlciBpcyBhIFdFQUsgaGFuZGxlciwgYnV0IHRoZSBjbGFzcyBoYXMgbm9uLVdFQUsgaGFuZGxlcnMgYWxyZWFkeS5cbiAgICAgICAgICAvLyBEcm9wIHRoZSBjdXJyZW50IG9uZS5cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc1ByaW1hcnlIYW5kbGVyICYmIGl2eUNsYXNzLmhhc1ByaW1hcnlIYW5kbGVyKSB7XG4gICAgICAgICAgLy8gVGhlIGNsYXNzIGFscmVhZHkgaGFzIGEgUFJJTUFSWSBoYW5kbGVyLCBhbmQgYW5vdGhlciBvbmUganVzdCBtYXRjaGVkLlxuICAgICAgICAgIHRoaXMuX2RpYWdub3N0aWNzLnB1c2goe1xuICAgICAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgICAgIGNvZGU6IE51bWJlcignLTk5JyArIEVycm9yQ29kZS5ERUNPUkFUT1JfQ09MTElTSU9OKSxcbiAgICAgICAgICAgIGZpbGU6IGdldFNvdXJjZUZpbGUobm9kZSksXG4gICAgICAgICAgICBzdGFydDogbm9kZS5nZXRTdGFydCh1bmRlZmluZWQsIGZhbHNlKSxcbiAgICAgICAgICAgIGxlbmd0aDogbm9kZS5nZXRXaWR0aCgpLFxuICAgICAgICAgICAgbWVzc2FnZVRleHQ6ICdUd28gaW5jb21wYXRpYmxlIGRlY29yYXRvcnMgb24gY2xhc3MnLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHRoaXMuaXZ5Q2xhc3Nlcy5kZWxldGUobm9kZSk7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBPdGhlcndpc2UsIGl0J3Mgc2FmZSB0byBhY2NlcHQgdGhlIG11bHRpcGxlIGRlY29yYXRvcnMgaGVyZS4gVXBkYXRlIHNvbWUgb2YgdGhlIG1ldGFkYXRhXG4gICAgICAgIC8vIHJlZ2FyZGluZyB0aGlzIGNsYXNzLlxuICAgICAgICBpdnlDbGFzcy5tYXRjaGVkSGFuZGxlcnMucHVzaChtYXRjaCk7XG4gICAgICAgIGl2eUNsYXNzLmhhc1ByaW1hcnlIYW5kbGVyID0gaXZ5Q2xhc3MuaGFzUHJpbWFyeUhhbmRsZXIgfHwgaXNQcmltYXJ5SGFuZGxlcjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gaXZ5Q2xhc3M7XG4gIH1cblxuICAvKipcbiAgICogQW5hbHl6ZSBhIHNvdXJjZSBmaWxlIGFuZCBwcm9kdWNlIGRpYWdub3N0aWNzIGZvciBpdCAoaWYgYW55KS5cbiAgICovXG4gIHByaXZhdGUgYW5hbHl6ZShzZjogdHMuU291cmNlRmlsZSwgcHJlYW5hbHl6ZTogZmFsc2UpOiB1bmRlZmluZWQ7XG4gIHByaXZhdGUgYW5hbHl6ZShzZjogdHMuU291cmNlRmlsZSwgcHJlYW5hbHl6ZTogdHJ1ZSk6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkO1xuICBwcml2YXRlIGFuYWx5emUoc2Y6IHRzLlNvdXJjZUZpbGUsIHByZWFuYWx5emU6IGJvb2xlYW4pOiBQcm9taXNlPHZvaWQ+fHVuZGVmaW5lZCB7XG4gICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuXG4gICAgY29uc3QgYW5hbHl6ZUNsYXNzID0gKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogdm9pZCA9PiB7XG4gICAgICBjb25zdCBpdnlDbGFzcyA9IHRoaXMuZGV0ZWN0SGFuZGxlcnNGb3JDbGFzcyhub2RlKTtcblxuICAgICAgLy8gSWYgdGhlIGNsYXNzIGhhcyBubyBJdnkgYmVoYXZpb3IgKG9yIGhhZCBlcnJvcnMpLCBza2lwIGl0LlxuICAgICAgaWYgKGl2eUNsYXNzID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gTG9vcCB0aHJvdWdoIGVhY2ggbWF0Y2hlZCBoYW5kbGVyIHRoYXQgbmVlZHMgdG8gYmUgYW5hbHl6ZWQgYW5kIGFuYWx5emUgaXQsIGVpdGhlclxuICAgICAgLy8gc3luY2hyb25vdXNseSBvciBhc3luY2hyb25vdXNseS5cbiAgICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgaXZ5Q2xhc3MubWF0Y2hlZEhhbmRsZXJzKSB7XG4gICAgICAgIC8vIFRoZSBhbmFseXplKCkgZnVuY3Rpb24gd2lsbCBydW4gdGhlIGFuYWx5c2lzIHBoYXNlIG9mIHRoZSBoYW5kbGVyLlxuICAgICAgICBjb25zdCBhbmFseXplID0gKCkgPT4ge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBtYXRjaC5hbmFseXplZCA9IG1hdGNoLmhhbmRsZXIuYW5hbHl6ZShub2RlLCBtYXRjaC5kZXRlY3RlZC5tZXRhZGF0YSk7XG5cbiAgICAgICAgICAgIGlmIChtYXRjaC5hbmFseXplZC5kaWFnbm9zdGljcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIHRoaXMuX2RpYWdub3N0aWNzLnB1c2goLi4ubWF0Y2guYW5hbHl6ZWQuZGlhZ25vc3RpY3MpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobWF0Y2guYW5hbHl6ZWQuZmFjdG9yeVN5bWJvbE5hbWUgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgICAgIHRoaXMuc291cmNlVG9GYWN0b3J5U3ltYm9scyAhPT0gbnVsbCAmJlxuICAgICAgICAgICAgICAgIHRoaXMuc291cmNlVG9GYWN0b3J5U3ltYm9scy5oYXMoc2YuZmlsZU5hbWUpKSB7XG4gICAgICAgICAgICAgIHRoaXMuc291cmNlVG9GYWN0b3J5U3ltYm9scy5nZXQoc2YuZmlsZU5hbWUpICEuYWRkKG1hdGNoLmFuYWx5emVkLmZhY3RvcnlTeW1ib2xOYW1lKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIEZhdGFsRGlhZ25vc3RpY0Vycm9yKSB7XG4gICAgICAgICAgICAgIHRoaXMuX2RpYWdub3N0aWNzLnB1c2goZXJyLnRvRGlhZ25vc3RpYygpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSWYgcHJlYW5hbHlzaXMgd2FzIHJlcXVlc3RlZCBhbmQgYSBwcmVhbmFseXNpcyBzdGVwIGV4aXN0cywgdGhlbiBydW4gcHJlYW5hbHlzaXMuXG4gICAgICAgIC8vIE90aGVyd2lzZSwgc2tpcCBkaXJlY3RseSB0byBhbmFseXNpcy5cbiAgICAgICAgaWYgKHByZWFuYWx5emUgJiYgbWF0Y2guaGFuZGxlci5wcmVhbmFseXplICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBQcmVhbmFseXNpcyBtaWdodCByZXR1cm4gYSBQcm9taXNlLCBpbmRpY2F0aW5nIGFuIGFzeW5jIG9wZXJhdGlvbiB3YXMgbmVjZXNzYXJ5LiBPciBpdFxuICAgICAgICAgIC8vIG1pZ2h0IHJldHVybiB1bmRlZmluZWQsIGluZGljYXRpbmcgbm8gYXN5bmMgc3RlcCB3YXMgbmVlZGVkIGFuZCBhbmFseXNpcyBjYW4gcHJvY2VlZFxuICAgICAgICAgIC8vIGltbWVkaWF0ZWx5LlxuICAgICAgICAgIGNvbnN0IHByZWFuYWx5c2lzID0gbWF0Y2guaGFuZGxlci5wcmVhbmFseXplKG5vZGUsIG1hdGNoLmRldGVjdGVkLm1ldGFkYXRhKTtcbiAgICAgICAgICBpZiAocHJlYW5hbHlzaXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gQXdhaXQgdGhlIHJlc3VsdHMgb2YgcHJlYW5hbHlzaXMgYmVmb3JlIHJ1bm5pbmcgYW5hbHlzaXMuXG4gICAgICAgICAgICBwcm9taXNlcy5wdXNoKHByZWFuYWx5c2lzLnRoZW4oYW5hbHl6ZSkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBObyBhc3luYyBwcmVhbmFseXNpcyBuZWVkZWQsIHNraXAgZGlyZWN0bHkgdG8gYW5hbHlzaXMuXG4gICAgICAgICAgICBhbmFseXplKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIE5vdCBpbiBwcmVhbmFseXNpcyBtb2RlIG9yIG5vdCBuZWVkZWQgZm9yIHRoaXMgaGFuZGxlciwgc2tpcCBkaXJlY3RseSB0byBhbmFseXNpcy5cbiAgICAgICAgICBhbmFseXplKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgdmlzaXQgPSAobm9kZTogdHMuTm9kZSk6IHZvaWQgPT4ge1xuICAgICAgLy8gUHJvY2VzcyBub2RlcyByZWN1cnNpdmVseSwgYW5kIGxvb2sgZm9yIGNsYXNzIGRlY2xhcmF0aW9ucyB3aXRoIGRlY29yYXRvcnMuXG4gICAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICAgIGFuYWx5emVDbGFzcyhub2RlKTtcbiAgICAgIH1cbiAgICAgIHRzLmZvckVhY2hDaGlsZChub2RlLCB2aXNpdCk7XG4gICAgfTtcblxuICAgIHZpc2l0KHNmKTtcblxuICAgIGlmIChwcmVhbmFseXplICYmIHByb21pc2VzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcykudGhlbigoKSA9PiB1bmRlZmluZWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIHJlc29sdmUoKTogdm9pZCB7XG4gICAgdGhpcy5pdnlDbGFzc2VzLmZvckVhY2goKGl2eUNsYXNzLCBub2RlKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGl2eUNsYXNzLm1hdGNoZWRIYW5kbGVycykge1xuICAgICAgICBpZiAobWF0Y2guaGFuZGxlci5yZXNvbHZlICE9PSB1bmRlZmluZWQgJiYgbWF0Y2guYW5hbHl6ZWQgIT09IG51bGwgJiZcbiAgICAgICAgICAgIG1hdGNoLmFuYWx5emVkLmFuYWx5c2lzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjb25zdCByZXMgPSBtYXRjaC5oYW5kbGVyLnJlc29sdmUobm9kZSwgbWF0Y2guYW5hbHl6ZWQuYW5hbHlzaXMpO1xuICAgICAgICAgIGlmIChyZXMucmVleHBvcnRzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVOYW1lID0gbm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG4gICAgICAgICAgICBpZiAoIXRoaXMucmVleHBvcnRNYXAuaGFzKGZpbGVOYW1lKSkge1xuICAgICAgICAgICAgICB0aGlzLnJlZXhwb3J0TWFwLnNldChmaWxlTmFtZSwgbmV3IE1hcDxzdHJpbmcsIFtzdHJpbmcsIHN0cmluZ10+KCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZmlsZVJlZXhwb3J0cyA9IHRoaXMucmVleHBvcnRNYXAuZ2V0KGZpbGVOYW1lKSAhO1xuICAgICAgICAgICAgZm9yIChjb25zdCByZWV4cG9ydCBvZiByZXMucmVleHBvcnRzKSB7XG4gICAgICAgICAgICAgIGZpbGVSZWV4cG9ydHMuc2V0KHJlZXhwb3J0LmFzQWxpYXMsIFtyZWV4cG9ydC5mcm9tTW9kdWxlLCByZWV4cG9ydC5zeW1ib2xOYW1lXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICB0eXBlQ2hlY2soY29udGV4dDogVHlwZUNoZWNrQ29udGV4dCk6IHZvaWQge1xuICAgIHRoaXMuaXZ5Q2xhc3Nlcy5mb3JFYWNoKChpdnlDbGFzcywgbm9kZSkgPT4ge1xuICAgICAgZm9yIChjb25zdCBtYXRjaCBvZiBpdnlDbGFzcy5tYXRjaGVkSGFuZGxlcnMpIHtcbiAgICAgICAgaWYgKG1hdGNoLmhhbmRsZXIudHlwZUNoZWNrICE9PSB1bmRlZmluZWQgJiYgbWF0Y2guYW5hbHl6ZWQgIT09IG51bGwgJiZcbiAgICAgICAgICAgIG1hdGNoLmFuYWx5emVkLmFuYWx5c2lzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBtYXRjaC5oYW5kbGVyLnR5cGVDaGVjayhjb250ZXh0LCBub2RlLCBtYXRjaC5hbmFseXplZC5hbmFseXNpcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQZXJmb3JtIGEgY29tcGlsYXRpb24gb3BlcmF0aW9uIG9uIHRoZSBnaXZlbiBjbGFzcyBkZWNsYXJhdGlvbiBhbmQgcmV0dXJuIGluc3RydWN0aW9ucyB0byBhblxuICAgKiBBU1QgdHJhbnNmb3JtZXIgaWYgYW55IGFyZSBhdmFpbGFibGUuXG4gICAqL1xuICBjb21waWxlSXZ5RmllbGRGb3Iobm9kZTogdHMuRGVjbGFyYXRpb24sIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sKTogQ29tcGlsZVJlc3VsdFtdfHVuZGVmaW5lZCB7XG4gICAgLy8gTG9vayB0byBzZWUgd2hldGhlciB0aGUgb3JpZ2luYWwgbm9kZSB3YXMgYW5hbHl6ZWQuIElmIG5vdCwgdGhlcmUncyBub3RoaW5nIHRvIGRvLlxuICAgIGNvbnN0IG9yaWdpbmFsID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHRzLkRlY2xhcmF0aW9uO1xuICAgIGlmICghdGhpcy5pdnlDbGFzc2VzLmhhcyhvcmlnaW5hbCkpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgaXZ5Q2xhc3MgPSB0aGlzLml2eUNsYXNzZXMuZ2V0KG9yaWdpbmFsKSAhO1xuXG4gICAgbGV0IHJlczogQ29tcGlsZVJlc3VsdFtdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGl2eUNsYXNzLm1hdGNoZWRIYW5kbGVycykge1xuICAgICAgaWYgKG1hdGNoLmFuYWx5emVkID09PSBudWxsIHx8IG1hdGNoLmFuYWx5emVkLmFuYWx5c2lzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGNvbXBpbGVNYXRjaFJlcyA9IG1hdGNoLmhhbmRsZXIuY29tcGlsZShub2RlLCBtYXRjaC5hbmFseXplZC5hbmFseXNpcywgY29uc3RhbnRQb29sKTtcbiAgICAgIGlmICghQXJyYXkuaXNBcnJheShjb21waWxlTWF0Y2hSZXMpKSB7XG4gICAgICAgIHJlcy5wdXNoKGNvbXBpbGVNYXRjaFJlcyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXMucHVzaCguLi5jb21waWxlTWF0Y2hSZXMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIExvb2sgdXAgdGhlIC5kLnRzIHRyYW5zZm9ybWVyIGZvciB0aGUgaW5wdXQgZmlsZSBhbmQgcmVjb3JkIHRoYXQgYXQgbGVhc3Qgb25lIGZpZWxkIHdhc1xuICAgIC8vIGdlbmVyYXRlZCwgd2hpY2ggd2lsbCBhbGxvdyB0aGUgLmQudHMgdG8gYmUgdHJhbnNmb3JtZWQgbGF0ZXIuXG4gICAgY29uc3QgZmlsZU5hbWUgPSBvcmlnaW5hbC5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG4gICAgY29uc3QgZHRzVHJhbnNmb3JtZXIgPSB0aGlzLmdldER0c1RyYW5zZm9ybWVyKGZpbGVOYW1lKTtcbiAgICBkdHNUcmFuc2Zvcm1lci5yZWNvcmRTdGF0aWNGaWVsZChyZWZsZWN0TmFtZU9mRGVjbGFyYXRpb24obm9kZSkgISwgcmVzKTtcblxuICAgIC8vIFJldHVybiB0aGUgaW5zdHJ1Y3Rpb24gdG8gdGhlIHRyYW5zZm9ybWVyIHNvIHRoZSBmaWVsZHMgd2lsbCBiZSBhZGRlZC5cbiAgICByZXR1cm4gcmVzLmxlbmd0aCA+IDAgPyByZXMgOiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogTG9va3VwIHRoZSBgdHMuRGVjb3JhdG9yYCB3aGljaCB0cmlnZ2VyZWQgdHJhbnNmb3JtYXRpb24gb2YgYSBwYXJ0aWN1bGFyIGNsYXNzIGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgaXZ5RGVjb3JhdG9yc0Zvcihub2RlOiB0cy5EZWNsYXJhdGlvbik6IHRzLkRlY29yYXRvcltdIHtcbiAgICBjb25zdCBvcmlnaW5hbCA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKSBhcyB0cy5EZWNsYXJhdGlvbjtcblxuICAgIGlmICghdGhpcy5pdnlDbGFzc2VzLmhhcyhvcmlnaW5hbCkpIHtcbiAgICAgIHJldHVybiBFTVBUWV9BUlJBWTtcbiAgICB9XG4gICAgY29uc3QgaXZ5Q2xhc3MgPSB0aGlzLml2eUNsYXNzZXMuZ2V0KG9yaWdpbmFsKSAhO1xuICAgIGNvbnN0IGRlY29yYXRvcnM6IHRzLkRlY29yYXRvcltdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGl2eUNsYXNzLm1hdGNoZWRIYW5kbGVycykge1xuICAgICAgaWYgKG1hdGNoLmFuYWx5emVkID09PSBudWxsIHx8IG1hdGNoLmFuYWx5emVkLmFuYWx5c2lzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAobWF0Y2guZGV0ZWN0ZWQudHJpZ2dlciAhPT0gbnVsbCAmJiB0cy5pc0RlY29yYXRvcihtYXRjaC5kZXRlY3RlZC50cmlnZ2VyKSkge1xuICAgICAgICBkZWNvcmF0b3JzLnB1c2gobWF0Y2guZGV0ZWN0ZWQudHJpZ2dlcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlY29yYXRvcnM7XG4gIH1cblxuICAvKipcbiAgICogUHJvY2VzcyBhIGRlY2xhcmF0aW9uIGZpbGUgYW5kIHJldHVybiBhIHRyYW5zZm9ybWVkIHZlcnNpb24gdGhhdCBpbmNvcnBvcmF0ZXMgdGhlIGNoYW5nZXNcbiAgICogbWFkZSB0byB0aGUgc291cmNlIGZpbGUuXG4gICAqL1xuICB0cmFuc2Zvcm1lZER0c0ZvcihmaWxlOiB0cy5Tb3VyY2VGaWxlLCBjb250ZXh0OiB0cy5UcmFuc2Zvcm1hdGlvbkNvbnRleHQpOiB0cy5Tb3VyY2VGaWxlIHtcbiAgICAvLyBObyBuZWVkIHRvIHRyYW5zZm9ybSBpZiBpdCdzIG5vdCBhIGRlY2xhcmF0aW9ucyBmaWxlLCBvciBpZiBubyBjaGFuZ2VzIGhhdmUgYmVlbiByZXF1ZXN0ZWRcbiAgICAvLyB0byB0aGUgaW5wdXQgZmlsZS5cbiAgICAvLyBEdWUgdG8gdGhlIHdheSBUeXBlU2NyaXB0IGFmdGVyRGVjbGFyYXRpb25zIHRyYW5zZm9ybWVycyB3b3JrLCB0aGUgU291cmNlRmlsZSBwYXRoIGlzIHRoZVxuICAgIC8vIHNhbWUgYXMgdGhlIG9yaWdpbmFsIC50cy5cbiAgICAvLyBUaGUgb25seSB3YXkgd2Uga25vdyBpdCdzIGFjdHVhbGx5IGEgZGVjbGFyYXRpb24gZmlsZSBpcyB2aWEgdGhlIGlzRGVjbGFyYXRpb25GaWxlIHByb3BlcnR5LlxuICAgIGlmICghZmlsZS5pc0RlY2xhcmF0aW9uRmlsZSB8fCAhdGhpcy5kdHNNYXAuaGFzKGZpbGUuZmlsZU5hbWUpKSB7XG4gICAgICByZXR1cm4gZmlsZTtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdGhlIHRyYW5zZm9ybWVkIHNvdXJjZS5cbiAgICByZXR1cm4gdGhpcy5kdHNNYXAuZ2V0KGZpbGUuZmlsZU5hbWUpICEudHJhbnNmb3JtKGZpbGUsIGNvbnRleHQpO1xuICB9XG5cbiAgZ2V0IGRpYWdub3N0aWNzKCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4geyByZXR1cm4gdGhpcy5fZGlhZ25vc3RpY3M7IH1cblxuICBwcml2YXRlIGdldER0c1RyYW5zZm9ybWVyKHRzRmlsZU5hbWU6IHN0cmluZyk6IER0c0ZpbGVUcmFuc2Zvcm1lciB7XG4gICAgaWYgKCF0aGlzLmR0c01hcC5oYXModHNGaWxlTmFtZSkpIHtcbiAgICAgIHRoaXMuZHRzTWFwLnNldCh0c0ZpbGVOYW1lLCBuZXcgRHRzRmlsZVRyYW5zZm9ybWVyKHRoaXMuaW1wb3J0UmV3cml0ZXIpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZHRzTWFwLmdldCh0c0ZpbGVOYW1lKSAhO1xuICB9XG59XG4iXX0=