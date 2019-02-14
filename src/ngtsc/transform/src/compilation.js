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
            this._diagnostics = [];
        }
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
            this.ivyClasses.forEach(function (ivyClass, node) {
                var e_3, _a;
                try {
                    for (var _b = tslib_1.__values(ivyClass.matchedHandlers), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var match = _c.value;
                        if (match.handler.resolve !== undefined && match.analyzed !== null &&
                            match.analyzed.analysis !== undefined) {
                            match.handler.resolve(node, match.analyzed.analysis);
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
        IvyCompilation.prototype.typeCheck = function (context) {
            this.ivyClasses.forEach(function (ivyClass, node) {
                var e_4, _a;
                try {
                    for (var _b = tslib_1.__values(ivyClass.matchedHandlers), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var match = _c.value;
                        if (match.handler.typeCheck !== undefined && match.analyzed !== null &&
                            match.analyzed.analysis !== undefined) {
                            match.handler.typeCheck(context, node, match.analyzed.analysis);
                        }
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
            });
        };
        /**
         * Perform a compilation operation on the given class declaration and return instructions to an
         * AST transformer if any are available.
         */
        IvyCompilation.prototype.compileIvyFieldFor = function (node, constantPool) {
            var e_5, _a;
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
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_5) throw e_5.error; }
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
            var e_6, _a;
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
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_6) throw e_6.error; }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvY29tcGlsYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBR0gsK0JBQWlDO0lBRWpDLDJFQUFrRTtJQUVsRSx5RUFBMEU7SUFFMUUsa0ZBQXdEO0lBRXhELHlFQUF1RztJQUN2Ryx5RkFBaUQ7SUFFakQsSUFBTSxXQUFXLEdBQVEsRUFBRSxDQUFDO0lBbUI1Qjs7Ozs7T0FLRztJQUNIO1FBa0JFOzs7Ozs7OztXQVFHO1FBQ0gsd0JBQ1ksUUFBc0MsRUFBVSxPQUF1QixFQUN2RSxTQUF5QixFQUFVLGNBQThCLEVBQ2pFLHNCQUFxRDtZQUZyRCxhQUFRLEdBQVIsUUFBUSxDQUE4QjtZQUFVLFlBQU8sR0FBUCxPQUFPLENBQWdCO1lBQ3ZFLGNBQVMsR0FBVCxTQUFTLENBQWdCO1lBQVUsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1lBQ2pFLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBK0I7WUE3QmpFOzs7ZUFHRztZQUNLLGVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBNEIsQ0FBQztZQUV6RDs7ZUFFRztZQUVIOztlQUVHO1lBQ0ssV0FBTSxHQUFHLElBQUksR0FBRyxFQUE4QixDQUFDO1lBQy9DLGlCQUFZLEdBQW9CLEVBQUUsQ0FBQztRQWV5QixDQUFDO1FBR3JFLG9DQUFXLEdBQVgsVUFBWSxFQUFpQixJQUFVLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXhFLHFDQUFZLEdBQVosVUFBYSxFQUFpQixJQUE2QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVuRiwrQ0FB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QUNELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFHLENBQUM7UUFDdkMsQ0FBQztRQUNILHFCQUFDO0lBQUQsQ0FBQyxBQWpURCxJQWlUQztJQWpUWSx3Q0FBYyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb25zdGFudFBvb2x9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZSwgRmF0YWxEaWFnbm9zdGljRXJyb3J9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7SW1wb3J0UmV3cml0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtSZWZsZWN0aW9uSG9zdCwgcmVmbGVjdE5hbWVPZkRlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7VHlwZUNoZWNrQ29udGV4dH0gZnJvbSAnLi4vLi4vdHlwZWNoZWNrJztcbmltcG9ydCB7Z2V0U291cmNlRmlsZX0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXIsIERldGVjdFJlc3VsdCwgSGFuZGxlclByZWNlZGVuY2V9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7RHRzRmlsZVRyYW5zZm9ybWVyfSBmcm9tICcuL2RlY2xhcmF0aW9uJztcblxuY29uc3QgRU1QVFlfQVJSQVk6IGFueSA9IFtdO1xuXG4vKipcbiAqIFJlY29yZCBvZiBhbiBhZGFwdGVyIHdoaWNoIGRlY2lkZWQgdG8gZW1pdCBhIHN0YXRpYyBmaWVsZCwgYW5kIHRoZSBhbmFseXNpcyBpdCBwZXJmb3JtZWQgdG9cbiAqIHByZXBhcmUgZm9yIHRoYXQgb3BlcmF0aW9uLlxuICovXG5pbnRlcmZhY2UgTWF0Y2hlZEhhbmRsZXI8QSwgTT4ge1xuICBoYW5kbGVyOiBEZWNvcmF0b3JIYW5kbGVyPEEsIE0+O1xuICBhbmFseXplZDogQW5hbHlzaXNPdXRwdXQ8QT58bnVsbDtcbiAgZGV0ZWN0ZWQ6IERldGVjdFJlc3VsdDxNPjtcbn1cblxuaW50ZXJmYWNlIEl2eUNsYXNzIHtcbiAgbWF0Y2hlZEhhbmRsZXJzOiBNYXRjaGVkSGFuZGxlcjxhbnksIGFueT5bXTtcblxuICBoYXNXZWFrSGFuZGxlcnM6IGJvb2xlYW47XG4gIGhhc1ByaW1hcnlIYW5kbGVyOiBib29sZWFuO1xufVxuXG4vKipcbiAqIE1hbmFnZXMgYSBjb21waWxhdGlvbiBvZiBJdnkgZGVjb3JhdG9ycyBpbnRvIHN0YXRpYyBmaWVsZHMgYWNyb3NzIGFuIGVudGlyZSB0cy5Qcm9ncmFtLlxuICpcbiAqIFRoZSBjb21waWxhdGlvbiBpcyBzdGF0ZWZ1bCAtIHNvdXJjZSBmaWxlcyBhcmUgYW5hbHl6ZWQgYW5kIHJlY29yZHMgb2YgdGhlIG9wZXJhdGlvbnMgdGhhdCBuZWVkXG4gKiB0byBiZSBwZXJmb3JtZWQgZHVyaW5nIHRoZSB0cmFuc2Zvcm0vZW1pdCBwcm9jZXNzIGFyZSBtYWludGFpbmVkIGludGVybmFsbHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBJdnlDb21waWxhdGlvbiB7XG4gIC8qKlxuICAgKiBUcmFja3MgY2xhc3NlcyB3aGljaCBoYXZlIGJlZW4gYW5hbHl6ZWQgYW5kIGZvdW5kIHRvIGhhdmUgYW4gSXZ5IGRlY29yYXRvciwgYW5kIHRoZVxuICAgKiBpbmZvcm1hdGlvbiByZWNvcmRlZCBhYm91dCB0aGVtIGZvciBsYXRlciBjb21waWxhdGlvbi5cbiAgICovXG4gIHByaXZhdGUgaXZ5Q2xhc3NlcyA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIEl2eUNsYXNzPigpO1xuXG4gIC8qKlxuICAgKiBUcmFja3MgZmFjdG9yeSBpbmZvcm1hdGlvbiB3aGljaCBuZWVkcyB0byBiZSBnZW5lcmF0ZWQuXG4gICAqL1xuXG4gIC8qKlxuICAgKiBUcmFja3MgdGhlIGBEdHNGaWxlVHJhbnNmb3JtZXJgcyBmb3IgZWFjaCBUUyBmaWxlIHRoYXQgbmVlZHMgLmQudHMgdHJhbnNmb3JtYXRpb25zLlxuICAgKi9cbiAgcHJpdmF0ZSBkdHNNYXAgPSBuZXcgTWFwPHN0cmluZywgRHRzRmlsZVRyYW5zZm9ybWVyPigpO1xuICBwcml2YXRlIF9kaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG5cblxuICAvKipcbiAgICogQHBhcmFtIGhhbmRsZXJzIGFycmF5IG9mIGBEZWNvcmF0b3JIYW5kbGVyYHMgd2hpY2ggd2lsbCBiZSBleGVjdXRlZCBhZ2FpbnN0IGVhY2ggY2xhc3MgaW4gdGhlXG4gICAqIHByb2dyYW1cbiAgICogQHBhcmFtIGNoZWNrZXIgVHlwZVNjcmlwdCBgVHlwZUNoZWNrZXJgIGluc3RhbmNlIGZvciB0aGUgcHJvZ3JhbVxuICAgKiBAcGFyYW0gcmVmbGVjdG9yIGBSZWZsZWN0aW9uSG9zdGAgdGhyb3VnaCB3aGljaCBhbGwgcmVmbGVjdGlvbiBvcGVyYXRpb25zIHdpbGwgYmUgcGVyZm9ybWVkXG4gICAqIEBwYXJhbSBjb3JlSW1wb3J0c0Zyb20gYSBUeXBlU2NyaXB0IGBTb3VyY2VGaWxlYCB3aGljaCBleHBvcnRzIHN5bWJvbHMgbmVlZGVkIGZvciBJdnkgaW1wb3J0c1xuICAgKiB3aGVuIGNvbXBpbGluZyBAYW5ndWxhci9jb3JlLCBvciBgbnVsbGAgaWYgdGhlIGN1cnJlbnQgcHJvZ3JhbSBpcyBub3QgQGFuZ3VsYXIvY29yZS4gVGhpcyBpc1xuICAgKiBgbnVsbGAgaW4gbW9zdCBjYXNlcy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBoYW5kbGVyczogRGVjb3JhdG9ySGFuZGxlcjxhbnksIGFueT5bXSwgcHJpdmF0ZSBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcixcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBpbXBvcnRSZXdyaXRlcjogSW1wb3J0UmV3cml0ZXIsXG4gICAgICBwcml2YXRlIHNvdXJjZVRvRmFjdG9yeVN5bWJvbHM6IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PnxudWxsKSB7fVxuXG5cbiAgYW5hbHl6ZVN5bmMoc2Y6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHsgcmV0dXJuIHRoaXMuYW5hbHl6ZShzZiwgZmFsc2UpOyB9XG5cbiAgYW5hbHl6ZUFzeW5jKHNmOiB0cy5Tb3VyY2VGaWxlKTogUHJvbWlzZTx2b2lkPnx1bmRlZmluZWQgeyByZXR1cm4gdGhpcy5hbmFseXplKHNmLCB0cnVlKTsgfVxuXG4gIHByaXZhdGUgZGV0ZWN0SGFuZGxlcnNGb3JDbGFzcyhub2RlOiB0cy5EZWNsYXJhdGlvbik6IEl2eUNsYXNzfG51bGwge1xuICAgIC8vIFRoZSBmaXJzdCBzdGVwIGlzIHRvIHJlZmxlY3QgdGhlIGRlY29yYXRvcnMuXG4gICAgY29uc3QgY2xhc3NEZWNvcmF0b3JzID0gdGhpcy5yZWZsZWN0b3IuZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24obm9kZSk7XG4gICAgbGV0IGl2eUNsYXNzOiBJdnlDbGFzc3xudWxsID0gbnVsbDtcblxuICAgIC8vIExvb2sgdGhyb3VnaCB0aGUgRGVjb3JhdG9ySGFuZGxlcnMgdG8gc2VlIGlmIGFueSBhcmUgcmVsZXZhbnQuXG4gICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIHRoaXMuaGFuZGxlcnMpIHtcbiAgICAgIC8vIEFuIGFkYXB0ZXIgaXMgcmVsZXZhbnQgaWYgaXQgbWF0Y2hlcyBvbmUgb2YgdGhlIGRlY29yYXRvcnMgb24gdGhlIGNsYXNzLlxuICAgICAgY29uc3QgZGV0ZWN0ZWQgPSBoYW5kbGVyLmRldGVjdChub2RlLCBjbGFzc0RlY29yYXRvcnMpO1xuICAgICAgaWYgKGRldGVjdGVkID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gVGhpcyBoYW5kbGVyIGRpZG4ndCBtYXRjaC5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGlzUHJpbWFyeUhhbmRsZXIgPSBoYW5kbGVyLnByZWNlZGVuY2UgPT09IEhhbmRsZXJQcmVjZWRlbmNlLlBSSU1BUlk7XG4gICAgICBjb25zdCBpc1dlYWtIYW5kbGVyID0gaGFuZGxlci5wcmVjZWRlbmNlID09PSBIYW5kbGVyUHJlY2VkZW5jZS5XRUFLO1xuICAgICAgY29uc3QgbWF0Y2ggPSB7XG4gICAgICAgIGhhbmRsZXIsXG4gICAgICAgIGFuYWx5emVkOiBudWxsLCBkZXRlY3RlZCxcbiAgICAgIH07XG5cbiAgICAgIGlmIChpdnlDbGFzcyA9PT0gbnVsbCkge1xuICAgICAgICAvLyBUaGlzIGlzIHRoZSBmaXJzdCBoYW5kbGVyIHRvIG1hdGNoIHRoaXMgY2xhc3MuIFRoaXMgcGF0aCBpcyBhIGZhc3QgcGF0aCB0aHJvdWdoIHdoaWNoXG4gICAgICAgIC8vIG1vc3QgY2xhc3NlcyB3aWxsIGZsb3cuXG4gICAgICAgIGl2eUNsYXNzID0ge1xuICAgICAgICAgIG1hdGNoZWRIYW5kbGVyczogW21hdGNoXSxcbiAgICAgICAgICBoYXNQcmltYXJ5SGFuZGxlcjogaXNQcmltYXJ5SGFuZGxlcixcbiAgICAgICAgICBoYXNXZWFrSGFuZGxlcnM6IGlzV2Vha0hhbmRsZXIsXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuaXZ5Q2xhc3Nlcy5zZXQobm9kZSwgaXZ5Q2xhc3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVGhpcyBpcyBhdCBsZWFzdCB0aGUgc2Vjb25kIGhhbmRsZXIgdG8gbWF0Y2ggdGhpcyBjbGFzcy4gVGhpcyBpcyBhIHNsb3dlciBwYXRoIHRoYXQgc29tZVxuICAgICAgICAvLyBjbGFzc2VzIHdpbGwgZ28gdGhyb3VnaCwgd2hpY2ggdmFsaWRhdGVzIHRoYXQgdGhlIHNldCBvZiBkZWNvcmF0b3JzIGFwcGxpZWQgdG8gdGhlIGNsYXNzXG4gICAgICAgIC8vIGlzIHZhbGlkLlxuXG4gICAgICAgIC8vIFZhbGlkYXRlIGFjY29yZGluZyB0byBydWxlcyBhcyBmb2xsb3dzOlxuICAgICAgICAvL1xuICAgICAgICAvLyAqIFdFQUsgaGFuZGxlcnMgYXJlIHJlbW92ZWQgaWYgYSBub24tV0VBSyBoYW5kbGVyIG1hdGNoZXMuXG4gICAgICAgIC8vICogT25seSBvbmUgUFJJTUFSWSBoYW5kbGVyIGNhbiBtYXRjaCBhdCBhIHRpbWUuIEFueSBvdGhlciBQUklNQVJZIGhhbmRsZXIgbWF0Y2hpbmcgYVxuICAgICAgICAvLyAgIGNsYXNzIHdpdGggYW4gZXhpc3RpbmcgUFJJTUFSWSBoYW5kbGVyIGlzIGFuIGVycm9yLlxuXG4gICAgICAgIGlmICghaXNXZWFrSGFuZGxlciAmJiBpdnlDbGFzcy5oYXNXZWFrSGFuZGxlcnMpIHtcbiAgICAgICAgICAvLyBUaGUgY3VycmVudCBoYW5kbGVyIGlzIG5vdCBhIFdFQUsgaGFuZGxlciwgYnV0IHRoZSBjbGFzcyBoYXMgb3RoZXIgV0VBSyBoYW5kbGVycy5cbiAgICAgICAgICAvLyBSZW1vdmUgdGhlbS5cbiAgICAgICAgICBpdnlDbGFzcy5tYXRjaGVkSGFuZGxlcnMgPSBpdnlDbGFzcy5tYXRjaGVkSGFuZGxlcnMuZmlsdGVyKFxuICAgICAgICAgICAgICBmaWVsZCA9PiBmaWVsZC5oYW5kbGVyLnByZWNlZGVuY2UgIT09IEhhbmRsZXJQcmVjZWRlbmNlLldFQUspO1xuICAgICAgICAgIGl2eUNsYXNzLmhhc1dlYWtIYW5kbGVycyA9IGZhbHNlO1xuICAgICAgICB9IGVsc2UgaWYgKGlzV2Vha0hhbmRsZXIgJiYgIWl2eUNsYXNzLmhhc1dlYWtIYW5kbGVycykge1xuICAgICAgICAgIC8vIFRoZSBjdXJyZW50IGhhbmRsZXIgaXMgYSBXRUFLIGhhbmRsZXIsIGJ1dCB0aGUgY2xhc3MgaGFzIG5vbi1XRUFLIGhhbmRsZXJzIGFscmVhZHkuXG4gICAgICAgICAgLy8gRHJvcCB0aGUgY3VycmVudCBvbmUuXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXNQcmltYXJ5SGFuZGxlciAmJiBpdnlDbGFzcy5oYXNQcmltYXJ5SGFuZGxlcikge1xuICAgICAgICAgIC8vIFRoZSBjbGFzcyBhbHJlYWR5IGhhcyBhIFBSSU1BUlkgaGFuZGxlciwgYW5kIGFub3RoZXIgb25lIGp1c3QgbWF0Y2hlZC5cbiAgICAgICAgICB0aGlzLl9kaWFnbm9zdGljcy5wdXNoKHtcbiAgICAgICAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICAgICAgICBjb2RlOiBOdW1iZXIoJy05OScgKyBFcnJvckNvZGUuREVDT1JBVE9SX0NPTExJU0lPTiksXG4gICAgICAgICAgICBmaWxlOiBnZXRTb3VyY2VGaWxlKG5vZGUpLFxuICAgICAgICAgICAgc3RhcnQ6IG5vZGUuZ2V0U3RhcnQodW5kZWZpbmVkLCBmYWxzZSksXG4gICAgICAgICAgICBsZW5ndGg6IG5vZGUuZ2V0V2lkdGgoKSxcbiAgICAgICAgICAgIG1lc3NhZ2VUZXh0OiAnVHdvIGluY29tcGF0aWJsZSBkZWNvcmF0b3JzIG9uIGNsYXNzJyxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICB0aGlzLml2eUNsYXNzZXMuZGVsZXRlKG5vZGUpO1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gT3RoZXJ3aXNlLCBpdCdzIHNhZmUgdG8gYWNjZXB0IHRoZSBtdWx0aXBsZSBkZWNvcmF0b3JzIGhlcmUuIFVwZGF0ZSBzb21lIG9mIHRoZSBtZXRhZGF0YVxuICAgICAgICAvLyByZWdhcmRpbmcgdGhpcyBjbGFzcy5cbiAgICAgICAgaXZ5Q2xhc3MubWF0Y2hlZEhhbmRsZXJzLnB1c2gobWF0Y2gpO1xuICAgICAgICBpdnlDbGFzcy5oYXNQcmltYXJ5SGFuZGxlciA9IGl2eUNsYXNzLmhhc1ByaW1hcnlIYW5kbGVyIHx8IGlzUHJpbWFyeUhhbmRsZXI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGl2eUNsYXNzO1xuICB9XG5cbiAgLyoqXG4gICAqIEFuYWx5emUgYSBzb3VyY2UgZmlsZSBhbmQgcHJvZHVjZSBkaWFnbm9zdGljcyBmb3IgaXQgKGlmIGFueSkuXG4gICAqL1xuICBwcml2YXRlIGFuYWx5emUoc2Y6IHRzLlNvdXJjZUZpbGUsIHByZWFuYWx5emU6IGZhbHNlKTogdW5kZWZpbmVkO1xuICBwcml2YXRlIGFuYWx5emUoc2Y6IHRzLlNvdXJjZUZpbGUsIHByZWFuYWx5emU6IHRydWUpOiBQcm9taXNlPHZvaWQ+fHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBhbmFseXplKHNmOiB0cy5Tb3VyY2VGaWxlLCBwcmVhbmFseXplOiBib29sZWFuKTogUHJvbWlzZTx2b2lkPnx1bmRlZmluZWQge1xuICAgIGNvbnN0IHByb21pc2VzOiBQcm9taXNlPHZvaWQ+W10gPSBbXTtcblxuICAgIGNvbnN0IGFuYWx5emVDbGFzcyA9IChub2RlOiB0cy5EZWNsYXJhdGlvbik6IHZvaWQgPT4ge1xuICAgICAgY29uc3QgaXZ5Q2xhc3MgPSB0aGlzLmRldGVjdEhhbmRsZXJzRm9yQ2xhc3Mobm9kZSk7XG5cbiAgICAgIC8vIElmIHRoZSBjbGFzcyBoYXMgbm8gSXZ5IGJlaGF2aW9yIChvciBoYWQgZXJyb3JzKSwgc2tpcCBpdC5cbiAgICAgIGlmIChpdnlDbGFzcyA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIExvb3AgdGhyb3VnaCBlYWNoIG1hdGNoZWQgaGFuZGxlciB0aGF0IG5lZWRzIHRvIGJlIGFuYWx5emVkIGFuZCBhbmFseXplIGl0LCBlaXRoZXJcbiAgICAgIC8vIHN5bmNocm9ub3VzbHkgb3IgYXN5bmNocm9ub3VzbHkuXG4gICAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGl2eUNsYXNzLm1hdGNoZWRIYW5kbGVycykge1xuICAgICAgICAvLyBUaGUgYW5hbHl6ZSgpIGZ1bmN0aW9uIHdpbGwgcnVuIHRoZSBhbmFseXNpcyBwaGFzZSBvZiB0aGUgaGFuZGxlci5cbiAgICAgICAgY29uc3QgYW5hbHl6ZSA9ICgpID0+IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgbWF0Y2guYW5hbHl6ZWQgPSBtYXRjaC5oYW5kbGVyLmFuYWx5emUobm9kZSwgbWF0Y2guZGV0ZWN0ZWQubWV0YWRhdGEpO1xuXG4gICAgICAgICAgICBpZiAobWF0Y2guYW5hbHl6ZWQuZGlhZ25vc3RpY3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICB0aGlzLl9kaWFnbm9zdGljcy5wdXNoKC4uLm1hdGNoLmFuYWx5emVkLmRpYWdub3N0aWNzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG1hdGNoLmFuYWx5emVkLmZhY3RvcnlTeW1ib2xOYW1lICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICAgICAgICB0aGlzLnNvdXJjZVRvRmFjdG9yeVN5bWJvbHMgIT09IG51bGwgJiZcbiAgICAgICAgICAgICAgICB0aGlzLnNvdXJjZVRvRmFjdG9yeVN5bWJvbHMuaGFzKHNmLmZpbGVOYW1lKSkge1xuICAgICAgICAgICAgICB0aGlzLnNvdXJjZVRvRmFjdG9yeVN5bWJvbHMuZ2V0KHNmLmZpbGVOYW1lKSAhLmFkZChtYXRjaC5hbmFseXplZC5mYWN0b3J5U3ltYm9sTmFtZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBGYXRhbERpYWdub3N0aWNFcnJvcikge1xuICAgICAgICAgICAgICB0aGlzLl9kaWFnbm9zdGljcy5wdXNoKGVyci50b0RpYWdub3N0aWMoKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIElmIHByZWFuYWx5c2lzIHdhcyByZXF1ZXN0ZWQgYW5kIGEgcHJlYW5hbHlzaXMgc3RlcCBleGlzdHMsIHRoZW4gcnVuIHByZWFuYWx5c2lzLlxuICAgICAgICAvLyBPdGhlcndpc2UsIHNraXAgZGlyZWN0bHkgdG8gYW5hbHlzaXMuXG4gICAgICAgIGlmIChwcmVhbmFseXplICYmIG1hdGNoLmhhbmRsZXIucHJlYW5hbHl6ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gUHJlYW5hbHlzaXMgbWlnaHQgcmV0dXJuIGEgUHJvbWlzZSwgaW5kaWNhdGluZyBhbiBhc3luYyBvcGVyYXRpb24gd2FzIG5lY2Vzc2FyeS4gT3IgaXRcbiAgICAgICAgICAvLyBtaWdodCByZXR1cm4gdW5kZWZpbmVkLCBpbmRpY2F0aW5nIG5vIGFzeW5jIHN0ZXAgd2FzIG5lZWRlZCBhbmQgYW5hbHlzaXMgY2FuIHByb2NlZWRcbiAgICAgICAgICAvLyBpbW1lZGlhdGVseS5cbiAgICAgICAgICBjb25zdCBwcmVhbmFseXNpcyA9IG1hdGNoLmhhbmRsZXIucHJlYW5hbHl6ZShub2RlLCBtYXRjaC5kZXRlY3RlZC5tZXRhZGF0YSk7XG4gICAgICAgICAgaWYgKHByZWFuYWx5c2lzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIEF3YWl0IHRoZSByZXN1bHRzIG9mIHByZWFuYWx5c2lzIGJlZm9yZSBydW5uaW5nIGFuYWx5c2lzLlxuICAgICAgICAgICAgcHJvbWlzZXMucHVzaChwcmVhbmFseXNpcy50aGVuKGFuYWx5emUpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTm8gYXN5bmMgcHJlYW5hbHlzaXMgbmVlZGVkLCBza2lwIGRpcmVjdGx5IHRvIGFuYWx5c2lzLlxuICAgICAgICAgICAgYW5hbHl6ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBOb3QgaW4gcHJlYW5hbHlzaXMgbW9kZSBvciBub3QgbmVlZGVkIGZvciB0aGlzIGhhbmRsZXIsIHNraXAgZGlyZWN0bHkgdG8gYW5hbHlzaXMuXG4gICAgICAgICAgYW5hbHl6ZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHZpc2l0ID0gKG5vZGU6IHRzLk5vZGUpOiB2b2lkID0+IHtcbiAgICAgIC8vIFByb2Nlc3Mgbm9kZXMgcmVjdXJzaXZlbHksIGFuZCBsb29rIGZvciBjbGFzcyBkZWNsYXJhdGlvbnMgd2l0aCBkZWNvcmF0b3JzLlxuICAgICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgICBhbmFseXplQ2xhc3Mobm9kZSk7XG4gICAgICB9XG4gICAgICB0cy5mb3JFYWNoQ2hpbGQobm9kZSwgdmlzaXQpO1xuICAgIH07XG5cbiAgICB2aXNpdChzZik7XG5cbiAgICBpZiAocHJlYW5hbHl6ZSAmJiBwcm9taXNlcy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpLnRoZW4oKCkgPT4gdW5kZWZpbmVkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICByZXNvbHZlKCk6IHZvaWQge1xuICAgIHRoaXMuaXZ5Q2xhc3Nlcy5mb3JFYWNoKChpdnlDbGFzcywgbm9kZSkgPT4ge1xuICAgICAgZm9yIChjb25zdCBtYXRjaCBvZiBpdnlDbGFzcy5tYXRjaGVkSGFuZGxlcnMpIHtcbiAgICAgICAgaWYgKG1hdGNoLmhhbmRsZXIucmVzb2x2ZSAhPT0gdW5kZWZpbmVkICYmIG1hdGNoLmFuYWx5emVkICE9PSBudWxsICYmXG4gICAgICAgICAgICBtYXRjaC5hbmFseXplZC5hbmFseXNpcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgbWF0Y2guaGFuZGxlci5yZXNvbHZlKG5vZGUsIG1hdGNoLmFuYWx5emVkLmFuYWx5c2lzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgdHlwZUNoZWNrKGNvbnRleHQ6IFR5cGVDaGVja0NvbnRleHQpOiB2b2lkIHtcbiAgICB0aGlzLml2eUNsYXNzZXMuZm9yRWFjaCgoaXZ5Q2xhc3MsIG5vZGUpID0+IHtcbiAgICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgaXZ5Q2xhc3MubWF0Y2hlZEhhbmRsZXJzKSB7XG4gICAgICAgIGlmIChtYXRjaC5oYW5kbGVyLnR5cGVDaGVjayAhPT0gdW5kZWZpbmVkICYmIG1hdGNoLmFuYWx5emVkICE9PSBudWxsICYmXG4gICAgICAgICAgICBtYXRjaC5hbmFseXplZC5hbmFseXNpcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgbWF0Y2guaGFuZGxlci50eXBlQ2hlY2soY29udGV4dCwgbm9kZSwgbWF0Y2guYW5hbHl6ZWQuYW5hbHlzaXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUGVyZm9ybSBhIGNvbXBpbGF0aW9uIG9wZXJhdGlvbiBvbiB0aGUgZ2l2ZW4gY2xhc3MgZGVjbGFyYXRpb24gYW5kIHJldHVybiBpbnN0cnVjdGlvbnMgdG8gYW5cbiAgICogQVNUIHRyYW5zZm9ybWVyIGlmIGFueSBhcmUgYXZhaWxhYmxlLlxuICAgKi9cbiAgY29tcGlsZUl2eUZpZWxkRm9yKG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBjb25zdGFudFBvb2w6IENvbnN0YW50UG9vbCk6IENvbXBpbGVSZXN1bHRbXXx1bmRlZmluZWQge1xuICAgIC8vIExvb2sgdG8gc2VlIHdoZXRoZXIgdGhlIG9yaWdpbmFsIG5vZGUgd2FzIGFuYWx5emVkLiBJZiBub3QsIHRoZXJlJ3Mgbm90aGluZyB0byBkby5cbiAgICBjb25zdCBvcmlnaW5hbCA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKSBhcyB0cy5EZWNsYXJhdGlvbjtcbiAgICBpZiAoIXRoaXMuaXZ5Q2xhc3Nlcy5oYXMob3JpZ2luYWwpKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IGl2eUNsYXNzID0gdGhpcy5pdnlDbGFzc2VzLmdldChvcmlnaW5hbCkgITtcblxuICAgIGxldCByZXM6IENvbXBpbGVSZXN1bHRbXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBtYXRjaCBvZiBpdnlDbGFzcy5tYXRjaGVkSGFuZGxlcnMpIHtcbiAgICAgIGlmIChtYXRjaC5hbmFseXplZCA9PT0gbnVsbCB8fCBtYXRjaC5hbmFseXplZC5hbmFseXNpcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBjb21waWxlTWF0Y2hSZXMgPSBtYXRjaC5oYW5kbGVyLmNvbXBpbGUobm9kZSwgbWF0Y2guYW5hbHl6ZWQuYW5hbHlzaXMsIGNvbnN0YW50UG9vbCk7XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkoY29tcGlsZU1hdGNoUmVzKSkge1xuICAgICAgICByZXMucHVzaChjb21waWxlTWF0Y2hSZXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzLnB1c2goLi4uY29tcGlsZU1hdGNoUmVzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBMb29rIHVwIHRoZSAuZC50cyB0cmFuc2Zvcm1lciBmb3IgdGhlIGlucHV0IGZpbGUgYW5kIHJlY29yZCB0aGF0IGF0IGxlYXN0IG9uZSBmaWVsZCB3YXNcbiAgICAvLyBnZW5lcmF0ZWQsIHdoaWNoIHdpbGwgYWxsb3cgdGhlIC5kLnRzIHRvIGJlIHRyYW5zZm9ybWVkIGxhdGVyLlxuICAgIGNvbnN0IGZpbGVOYW1lID0gb3JpZ2luYWwuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICAgIGNvbnN0IGR0c1RyYW5zZm9ybWVyID0gdGhpcy5nZXREdHNUcmFuc2Zvcm1lcihmaWxlTmFtZSk7XG4gICAgZHRzVHJhbnNmb3JtZXIucmVjb3JkU3RhdGljRmllbGQocmVmbGVjdE5hbWVPZkRlY2xhcmF0aW9uKG5vZGUpICEsIHJlcyk7XG5cbiAgICAvLyBSZXR1cm4gdGhlIGluc3RydWN0aW9uIHRvIHRoZSB0cmFuc2Zvcm1lciBzbyB0aGUgZmllbGRzIHdpbGwgYmUgYWRkZWQuXG4gICAgcmV0dXJuIHJlcy5sZW5ndGggPiAwID8gcmVzIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIExvb2t1cCB0aGUgYHRzLkRlY29yYXRvcmAgd2hpY2ggdHJpZ2dlcmVkIHRyYW5zZm9ybWF0aW9uIG9mIGEgcGFydGljdWxhciBjbGFzcyBkZWNsYXJhdGlvbi5cbiAgICovXG4gIGl2eURlY29yYXRvcnNGb3Iobm9kZTogdHMuRGVjbGFyYXRpb24pOiB0cy5EZWNvcmF0b3JbXSB7XG4gICAgY29uc3Qgb3JpZ2luYWwgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkgYXMgdHMuRGVjbGFyYXRpb247XG5cbiAgICBpZiAoIXRoaXMuaXZ5Q2xhc3Nlcy5oYXMob3JpZ2luYWwpKSB7XG4gICAgICByZXR1cm4gRU1QVFlfQVJSQVk7XG4gICAgfVxuICAgIGNvbnN0IGl2eUNsYXNzID0gdGhpcy5pdnlDbGFzc2VzLmdldChvcmlnaW5hbCkgITtcbiAgICBjb25zdCBkZWNvcmF0b3JzOiB0cy5EZWNvcmF0b3JbXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBtYXRjaCBvZiBpdnlDbGFzcy5tYXRjaGVkSGFuZGxlcnMpIHtcbiAgICAgIGlmIChtYXRjaC5hbmFseXplZCA9PT0gbnVsbCB8fCBtYXRjaC5hbmFseXplZC5hbmFseXNpcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKG1hdGNoLmRldGVjdGVkLnRyaWdnZXIgIT09IG51bGwgJiYgdHMuaXNEZWNvcmF0b3IobWF0Y2guZGV0ZWN0ZWQudHJpZ2dlcikpIHtcbiAgICAgICAgZGVjb3JhdG9ycy5wdXNoKG1hdGNoLmRldGVjdGVkLnRyaWdnZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkZWNvcmF0b3JzO1xuICB9XG5cbiAgLyoqXG4gICAqIFByb2Nlc3MgYSBkZWNsYXJhdGlvbiBmaWxlIGFuZCByZXR1cm4gYSB0cmFuc2Zvcm1lZCB2ZXJzaW9uIHRoYXQgaW5jb3Jwb3JhdGVzIHRoZSBjaGFuZ2VzXG4gICAqIG1hZGUgdG8gdGhlIHNvdXJjZSBmaWxlLlxuICAgKi9cbiAgdHJhbnNmb3JtZWREdHNGb3IoZmlsZTogdHMuU291cmNlRmlsZSwgY29udGV4dDogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0KTogdHMuU291cmNlRmlsZSB7XG4gICAgLy8gTm8gbmVlZCB0byB0cmFuc2Zvcm0gaWYgaXQncyBub3QgYSBkZWNsYXJhdGlvbnMgZmlsZSwgb3IgaWYgbm8gY2hhbmdlcyBoYXZlIGJlZW4gcmVxdWVzdGVkXG4gICAgLy8gdG8gdGhlIGlucHV0IGZpbGUuXG4gICAgLy8gRHVlIHRvIHRoZSB3YXkgVHlwZVNjcmlwdCBhZnRlckRlY2xhcmF0aW9ucyB0cmFuc2Zvcm1lcnMgd29yaywgdGhlIFNvdXJjZUZpbGUgcGF0aCBpcyB0aGVcbiAgICAvLyBzYW1lIGFzIHRoZSBvcmlnaW5hbCAudHMuXG4gICAgLy8gVGhlIG9ubHkgd2F5IHdlIGtub3cgaXQncyBhY3R1YWxseSBhIGRlY2xhcmF0aW9uIGZpbGUgaXMgdmlhIHRoZSBpc0RlY2xhcmF0aW9uRmlsZSBwcm9wZXJ0eS5cbiAgICBpZiAoIWZpbGUuaXNEZWNsYXJhdGlvbkZpbGUgfHwgIXRoaXMuZHRzTWFwLmhhcyhmaWxlLmZpbGVOYW1lKSkge1xuICAgICAgcmV0dXJuIGZpbGU7XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIHRoZSB0cmFuc2Zvcm1lZCBzb3VyY2UuXG4gICAgcmV0dXJuIHRoaXMuZHRzTWFwLmdldChmaWxlLmZpbGVOYW1lKSAhLnRyYW5zZm9ybShmaWxlLCBjb250ZXh0KTtcbiAgfVxuXG4gIGdldCBkaWFnbm9zdGljcygpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHsgcmV0dXJuIHRoaXMuX2RpYWdub3N0aWNzOyB9XG5cbiAgcHJpdmF0ZSBnZXREdHNUcmFuc2Zvcm1lcih0c0ZpbGVOYW1lOiBzdHJpbmcpOiBEdHNGaWxlVHJhbnNmb3JtZXIge1xuICAgIGlmICghdGhpcy5kdHNNYXAuaGFzKHRzRmlsZU5hbWUpKSB7XG4gICAgICB0aGlzLmR0c01hcC5zZXQodHNGaWxlTmFtZSwgbmV3IER0c0ZpbGVUcmFuc2Zvcm1lcih0aGlzLmltcG9ydFJld3JpdGVyKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmR0c01hcC5nZXQodHNGaWxlTmFtZSkgITtcbiAgfVxufVxuIl19