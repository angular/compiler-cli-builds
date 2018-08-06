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
        define("@angular/compiler-cli/src/ngtsc/transform/src/compilation", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/metadata/src/reflector", "@angular/compiler-cli/src/ngtsc/transform/src/declaration"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var reflector_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/reflector");
    var declaration_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/declaration");
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
        function IvyCompilation(handlers, checker, reflector, coreImportsFrom, sourceToFactorySymbols) {
            this.handlers = handlers;
            this.checker = checker;
            this.reflector = reflector;
            this.coreImportsFrom = coreImportsFrom;
            this.sourceToFactorySymbols = sourceToFactorySymbols;
            /**
             * Tracks classes which have been analyzed and found to have an Ivy decorator, and the
             * information recorded about them for later compilation.
             */
            this.analysis = new Map();
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
        IvyCompilation.prototype.analyze = function (sf, preanalyze) {
            var _this = this;
            var promises = [];
            var analyzeClass = function (node) {
                // The first step is to reflect the decorators.
                var decorators = _this.reflector.getDecoratorsOfDeclaration(node);
                if (decorators === null) {
                    return;
                }
                // Look through the DecoratorHandlers to see if any are relevant.
                _this.handlers.forEach(function (adapter) {
                    // An adapter is relevant if it matches one of the decorators on the class.
                    var decorator = adapter.detect(decorators);
                    if (decorator === undefined) {
                        return;
                    }
                    var completeAnalysis = function () {
                        var _a;
                        // Check for multiple decorators on the same node. Technically speaking this
                        // could be supported, but right now it's an error.
                        if (_this.analysis.has(node)) {
                            throw new Error('TODO.Diagnostic: Class has multiple Angular decorators.');
                        }
                        // Run analysis on the decorator. This will produce either diagnostics, an
                        // analysis result, or both.
                        var analysis = adapter.analyze(node, decorator);
                        if (analysis.analysis !== undefined) {
                            _this.analysis.set(node, {
                                adapter: adapter,
                                analysis: analysis.analysis, decorator: decorator,
                            });
                        }
                        if (analysis.diagnostics !== undefined) {
                            (_a = _this._diagnostics).push.apply(_a, tslib_1.__spread(analysis.diagnostics));
                        }
                        if (analysis.factorySymbolName !== undefined && _this.sourceToFactorySymbols !== null &&
                            _this.sourceToFactorySymbols.has(sf.fileName)) {
                            _this.sourceToFactorySymbols.get(sf.fileName).add(analysis.factorySymbolName);
                        }
                    };
                    if (preanalyze && adapter.preanalyze !== undefined) {
                        var preanalysis = adapter.preanalyze(node, decorator);
                        if (preanalysis !== undefined) {
                            promises.push(preanalysis.then(function () { return completeAnalysis(); }));
                        }
                        else {
                            completeAnalysis();
                        }
                    }
                    else {
                        completeAnalysis();
                    }
                });
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
        /**
         * Perform a compilation operation on the given class declaration and return instructions to an
         * AST transformer if any are available.
         */
        IvyCompilation.prototype.compileIvyFieldFor = function (node) {
            // Look to see whether the original node was analyzed. If not, there's nothing to do.
            var original = ts.getOriginalNode(node);
            if (!this.analysis.has(original)) {
                return undefined;
            }
            var op = this.analysis.get(original);
            // Run the actual compilation, which generates an Expression for the Ivy field.
            var res = op.adapter.compile(node, op.analysis);
            if (!Array.isArray(res)) {
                res = [res];
            }
            // Look up the .d.ts transformer for the input file and record that a field was generated,
            // which will allow the .d.ts to be transformed later.
            var fileName = original.getSourceFile().fileName;
            var dtsTransformer = this.getDtsTransformer(fileName);
            dtsTransformer.recordStaticField(reflector_1.reflectNameOfDeclaration(node), res);
            // Return the instruction to the transformer so the field will be added.
            return res;
        };
        /**
         * Lookup the `ts.Decorator` which triggered transformation of a particular class declaration.
         */
        IvyCompilation.prototype.ivyDecoratorFor = function (node) {
            var original = ts.getOriginalNode(node);
            if (!this.analysis.has(original)) {
                return undefined;
            }
            return this.analysis.get(original).decorator;
        };
        /**
         * Process a .d.ts source string and return a transformed version that incorporates the changes
         * made to the source file.
         */
        IvyCompilation.prototype.transformedDtsFor = function (tsFileName, dtsOriginalSource, dtsPath) {
            // No need to transform if no changes have been requested to the input file.
            if (!this.dtsMap.has(tsFileName)) {
                return dtsOriginalSource;
            }
            // Return the transformed .d.ts source.
            return this.dtsMap.get(tsFileName).transform(dtsOriginalSource, tsFileName);
        };
        Object.defineProperty(IvyCompilation.prototype, "diagnostics", {
            get: function () { return this._diagnostics; },
            enumerable: true,
            configurable: true
        });
        IvyCompilation.prototype.getDtsTransformer = function (tsFileName) {
            if (!this.dtsMap.has(tsFileName)) {
                this.dtsMap.set(tsFileName, new declaration_1.DtsFileTransformer(this.coreImportsFrom));
            }
            return this.dtsMap.get(tsFileName);
        };
        return IvyCompilation;
    }());
    exports.IvyCompilation = IvyCompilation;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvY29tcGlsYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBR2pDLG9GQUFzRTtJQUd0RSx5RkFBaUQ7SUFZakQ7Ozs7O09BS0c7SUFDSDtRQWtCRTs7Ozs7Ozs7V0FRRztRQUNILHdCQUNZLFFBQWlDLEVBQVUsT0FBdUIsRUFDbEUsU0FBeUIsRUFBVSxlQUFtQyxFQUN0RSxzQkFBcUQ7WUFGckQsYUFBUSxHQUFSLFFBQVEsQ0FBeUI7WUFBVSxZQUFPLEdBQVAsT0FBTyxDQUFnQjtZQUNsRSxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUFVLG9CQUFlLEdBQWYsZUFBZSxDQUFvQjtZQUN0RSwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQStCO1lBN0JqRTs7O2VBR0c7WUFDSyxhQUFRLEdBQUcsSUFBSSxHQUFHLEVBQTJDLENBQUM7WUFFdEU7O2VBRUc7WUFFSDs7ZUFFRztZQUNLLFdBQU0sR0FBRyxJQUFJLEdBQUcsRUFBOEIsQ0FBQztZQUMvQyxpQkFBWSxHQUFvQixFQUFFLENBQUM7UUFleUIsQ0FBQztRQUdyRSxvQ0FBVyxHQUFYLFVBQVksRUFBaUIsSUFBVSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV4RSxxQ0FBWSxHQUFaLFVBQWEsRUFBaUIsSUFBNkIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFPbkYsZ0NBQU8sR0FBZixVQUFnQixFQUFpQixFQUFFLFVBQW1CO1lBQXRELGlCQXlFQztZQXhFQyxJQUFNLFFBQVEsR0FBb0IsRUFBRSxD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biAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0RlY29yYXRvciwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL2hvc3QnO1xuaW1wb3J0IHtyZWZsZWN0TmFtZU9mRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL21ldGFkYXRhL3NyYy9yZWZsZWN0b3InO1xuXG5pbXBvcnQge0FuYWx5c2lzT3V0cHV0LCBDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge0R0c0ZpbGVUcmFuc2Zvcm1lcn0gZnJvbSAnLi9kZWNsYXJhdGlvbic7XG5cbi8qKlxuICogUmVjb3JkIG9mIGFuIGFkYXB0ZXIgd2hpY2ggZGVjaWRlZCB0byBlbWl0IGEgc3RhdGljIGZpZWxkLCBhbmQgdGhlIGFuYWx5c2lzIGl0IHBlcmZvcm1lZCB0b1xuICogcHJlcGFyZSBmb3IgdGhhdCBvcGVyYXRpb24uXG4gKi9cbmludGVyZmFjZSBFbWl0RmllbGRPcGVyYXRpb248VD4ge1xuICBhZGFwdGVyOiBEZWNvcmF0b3JIYW5kbGVyPFQ+O1xuICBhbmFseXNpczogQW5hbHlzaXNPdXRwdXQ8VD47XG4gIGRlY29yYXRvcjogRGVjb3JhdG9yO1xufVxuXG4vKipcbiAqIE1hbmFnZXMgYSBjb21waWxhdGlvbiBvZiBJdnkgZGVjb3JhdG9ycyBpbnRvIHN0YXRpYyBmaWVsZHMgYWNyb3NzIGFuIGVudGlyZSB0cy5Qcm9ncmFtLlxuICpcbiAqIFRoZSBjb21waWxhdGlvbiBpcyBzdGF0ZWZ1bCAtIHNvdXJjZSBmaWxlcyBhcmUgYW5hbHl6ZWQgYW5kIHJlY29yZHMgb2YgdGhlIG9wZXJhdGlvbnMgdGhhdCBuZWVkXG4gKiB0byBiZSBwZXJmb3JtZWQgZHVyaW5nIHRoZSB0cmFuc2Zvcm0vZW1pdCBwcm9jZXNzIGFyZSBtYWludGFpbmVkIGludGVybmFsbHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBJdnlDb21waWxhdGlvbiB7XG4gIC8qKlxuICAgKiBUcmFja3MgY2xhc3NlcyB3aGljaCBoYXZlIGJlZW4gYW5hbHl6ZWQgYW5kIGZvdW5kIHRvIGhhdmUgYW4gSXZ5IGRlY29yYXRvciwgYW5kIHRoZVxuICAgKiBpbmZvcm1hdGlvbiByZWNvcmRlZCBhYm91dCB0aGVtIGZvciBsYXRlciBjb21waWxhdGlvbi5cbiAgICovXG4gIHByaXZhdGUgYW5hbHlzaXMgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBFbWl0RmllbGRPcGVyYXRpb248YW55Pj4oKTtcblxuICAvKipcbiAgICogVHJhY2tzIGZhY3RvcnkgaW5mb3JtYXRpb24gd2hpY2ggbmVlZHMgdG8gYmUgZ2VuZXJhdGVkLlxuICAgKi9cblxuICAvKipcbiAgICogVHJhY2tzIHRoZSBgRHRzRmlsZVRyYW5zZm9ybWVyYHMgZm9yIGVhY2ggVFMgZmlsZSB0aGF0IG5lZWRzIC5kLnRzIHRyYW5zZm9ybWF0aW9ucy5cbiAgICovXG4gIHByaXZhdGUgZHRzTWFwID0gbmV3IE1hcDxzdHJpbmcsIER0c0ZpbGVUcmFuc2Zvcm1lcj4oKTtcbiAgcHJpdmF0ZSBfZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG5cbiAgLyoqXG4gICAqIEBwYXJhbSBoYW5kbGVycyBhcnJheSBvZiBgRGVjb3JhdG9ySGFuZGxlcmBzIHdoaWNoIHdpbGwgYmUgZXhlY3V0ZWQgYWdhaW5zdCBlYWNoIGNsYXNzIGluIHRoZVxuICAgKiBwcm9ncmFtXG4gICAqIEBwYXJhbSBjaGVja2VyIFR5cGVTY3JpcHQgYFR5cGVDaGVja2VyYCBpbnN0YW5jZSBmb3IgdGhlIHByb2dyYW1cbiAgICogQHBhcmFtIHJlZmxlY3RvciBgUmVmbGVjdGlvbkhvc3RgIHRocm91Z2ggd2hpY2ggYWxsIHJlZmxlY3Rpb24gb3BlcmF0aW9ucyB3aWxsIGJlIHBlcmZvcm1lZFxuICAgKiBAcGFyYW0gY29yZUltcG9ydHNGcm9tIGEgVHlwZVNjcmlwdCBgU291cmNlRmlsZWAgd2hpY2ggZXhwb3J0cyBzeW1ib2xzIG5lZWRlZCBmb3IgSXZ5IGltcG9ydHNcbiAgICogd2hlbiBjb21waWxpbmcgQGFuZ3VsYXIvY29yZSwgb3IgYG51bGxgIGlmIHRoZSBjdXJyZW50IHByb2dyYW0gaXMgbm90IEBhbmd1bGFyL2NvcmUuIFRoaXMgaXNcbiAgICogYG51bGxgIGluIG1vc3QgY2FzZXMuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgaGFuZGxlcnM6IERlY29yYXRvckhhbmRsZXI8YW55PltdLCBwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLFxuICAgICAgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIGNvcmVJbXBvcnRzRnJvbTogdHMuU291cmNlRmlsZXxudWxsLFxuICAgICAgcHJpdmF0ZSBzb3VyY2VUb0ZhY3RvcnlTeW1ib2xzOiBNYXA8c3RyaW5nLCBTZXQ8c3RyaW5nPj58bnVsbCkge31cblxuXG4gIGFuYWx5emVTeW5jKHNmOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7IHJldHVybiB0aGlzLmFuYWx5emUoc2YsIGZhbHNlKTsgfVxuXG4gIGFuYWx5emVBc3luYyhzZjogdHMuU291cmNlRmlsZSk6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMuYW5hbHl6ZShzZiwgdHJ1ZSk7IH1cblxuICAvKipcbiAgICogQW5hbHl6ZSBhIHNvdXJjZSBmaWxlIGFuZCBwcm9kdWNlIGRpYWdub3N0aWNzIGZvciBpdCAoaWYgYW55KS5cbiAgICovXG4gIHByaXZhdGUgYW5hbHl6ZShzZjogdHMuU291cmNlRmlsZSwgcHJlYW5hbHl6ZTogZmFsc2UpOiB1bmRlZmluZWQ7XG4gIHByaXZhdGUgYW5hbHl6ZShzZjogdHMuU291cmNlRmlsZSwgcHJlYW5hbHl6ZTogdHJ1ZSk6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkO1xuICBwcml2YXRlIGFuYWx5emUoc2Y6IHRzLlNvdXJjZUZpbGUsIHByZWFuYWx5emU6IGJvb2xlYW4pOiBQcm9taXNlPHZvaWQ+fHVuZGVmaW5lZCB7XG4gICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuXG4gICAgY29uc3QgYW5hbHl6ZUNsYXNzID0gKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogdm9pZCA9PiB7XG4gICAgICAvLyBUaGUgZmlyc3Qgc3RlcCBpcyB0byByZWZsZWN0IHRoZSBkZWNvcmF0b3JzLlxuICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IHRoaXMucmVmbGVjdG9yLmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKG5vZGUpO1xuICAgICAgaWYgKGRlY29yYXRvcnMgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgLy8gTG9vayB0aHJvdWdoIHRoZSBEZWNvcmF0b3JIYW5kbGVycyB0byBzZWUgaWYgYW55IGFyZSByZWxldmFudC5cbiAgICAgIHRoaXMuaGFuZGxlcnMuZm9yRWFjaChhZGFwdGVyID0+IHtcbiAgICAgICAgLy8gQW4gYWRhcHRlciBpcyByZWxldmFudCBpZiBpdCBtYXRjaGVzIG9uZSBvZiB0aGUgZGVjb3JhdG9ycyBvbiB0aGUgY2xhc3MuXG4gICAgICAgIGNvbnN0IGRlY29yYXRvciA9IGFkYXB0ZXIuZGV0ZWN0KGRlY29yYXRvcnMpO1xuICAgICAgICBpZiAoZGVjb3JhdG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjb21wbGV0ZUFuYWx5c2lzID0gKCkgPT4ge1xuICAgICAgICAgIC8vIENoZWNrIGZvciBtdWx0aXBsZSBkZWNvcmF0b3JzIG9uIHRoZSBzYW1lIG5vZGUuIFRlY2huaWNhbGx5IHNwZWFraW5nIHRoaXNcbiAgICAgICAgICAvLyBjb3VsZCBiZSBzdXBwb3J0ZWQsIGJ1dCByaWdodCBub3cgaXQncyBhbiBlcnJvci5cbiAgICAgICAgICBpZiAodGhpcy5hbmFseXNpcy5oYXMobm9kZSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVE9ETy5EaWFnbm9zdGljOiBDbGFzcyBoYXMgbXVsdGlwbGUgQW5ndWxhciBkZWNvcmF0b3JzLicpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFJ1biBhbmFseXNpcyBvbiB0aGUgZGVjb3JhdG9yLiBUaGlzIHdpbGwgcHJvZHVjZSBlaXRoZXIgZGlhZ25vc3RpY3MsIGFuXG4gICAgICAgICAgLy8gYW5hbHlzaXMgcmVzdWx0LCBvciBib3RoLlxuICAgICAgICAgIGNvbnN0IGFuYWx5c2lzID0gYWRhcHRlci5hbmFseXplKG5vZGUsIGRlY29yYXRvcik7XG5cbiAgICAgICAgICBpZiAoYW5hbHlzaXMuYW5hbHlzaXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5hbmFseXNpcy5zZXQobm9kZSwge1xuICAgICAgICAgICAgICBhZGFwdGVyLFxuICAgICAgICAgICAgICBhbmFseXNpczogYW5hbHlzaXMuYW5hbHlzaXMsIGRlY29yYXRvcixcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChhbmFseXNpcy5kaWFnbm9zdGljcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLl9kaWFnbm9zdGljcy5wdXNoKC4uLmFuYWx5c2lzLmRpYWdub3N0aWNzKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoYW5hbHlzaXMuZmFjdG9yeVN5bWJvbE5hbWUgIT09IHVuZGVmaW5lZCAmJiB0aGlzLnNvdXJjZVRvRmFjdG9yeVN5bWJvbHMgIT09IG51bGwgJiZcbiAgICAgICAgICAgICAgdGhpcy5zb3VyY2VUb0ZhY3RvcnlTeW1ib2xzLmhhcyhzZi5maWxlTmFtZSkpIHtcbiAgICAgICAgICAgIHRoaXMuc291cmNlVG9GYWN0b3J5U3ltYm9scy5nZXQoc2YuZmlsZU5hbWUpICEuYWRkKGFuYWx5c2lzLmZhY3RvcnlTeW1ib2xOYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHByZWFuYWx5emUgJiYgYWRhcHRlci5wcmVhbmFseXplICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjb25zdCBwcmVhbmFseXNpcyA9IGFkYXB0ZXIucHJlYW5hbHl6ZShub2RlLCBkZWNvcmF0b3IpO1xuICAgICAgICAgIGlmIChwcmVhbmFseXNpcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBwcm9taXNlcy5wdXNoKHByZWFuYWx5c2lzLnRoZW4oKCkgPT4gY29tcGxldGVBbmFseXNpcygpKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbXBsZXRlQW5hbHlzaXMoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29tcGxldGVBbmFseXNpcygpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgY29uc3QgdmlzaXQgPSAobm9kZTogdHMuTm9kZSk6IHZvaWQgPT4ge1xuICAgICAgLy8gUHJvY2VzcyBub2RlcyByZWN1cnNpdmVseSwgYW5kIGxvb2sgZm9yIGNsYXNzIGRlY2xhcmF0aW9ucyB3aXRoIGRlY29yYXRvcnMuXG4gICAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICAgIGFuYWx5emVDbGFzcyhub2RlKTtcbiAgICAgIH1cbiAgICAgIHRzLmZvckVhY2hDaGlsZChub2RlLCB2aXNpdCk7XG4gICAgfTtcblxuICAgIHZpc2l0KHNmKTtcblxuICAgIGlmIChwcmVhbmFseXplICYmIHByb21pc2VzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcykudGhlbigoKSA9PiB1bmRlZmluZWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQZXJmb3JtIGEgY29tcGlsYXRpb24gb3BlcmF0aW9uIG9uIHRoZSBnaXZlbiBjbGFzcyBkZWNsYXJhdGlvbiBhbmQgcmV0dXJuIGluc3RydWN0aW9ucyB0byBhblxuICAgKiBBU1QgdHJhbnNmb3JtZXIgaWYgYW55IGFyZSBhdmFpbGFibGUuXG4gICAqL1xuICBjb21waWxlSXZ5RmllbGRGb3Iobm9kZTogdHMuRGVjbGFyYXRpb24pOiBDb21waWxlUmVzdWx0W118dW5kZWZpbmVkIHtcbiAgICAvLyBMb29rIHRvIHNlZSB3aGV0aGVyIHRoZSBvcmlnaW5hbCBub2RlIHdhcyBhbmFseXplZC4gSWYgbm90LCB0aGVyZSdzIG5vdGhpbmcgdG8gZG8uXG4gICAgY29uc3Qgb3JpZ2luYWwgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkgYXMgdHMuRGVjbGFyYXRpb247XG4gICAgaWYgKCF0aGlzLmFuYWx5c2lzLmhhcyhvcmlnaW5hbCkpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IG9wID0gdGhpcy5hbmFseXNpcy5nZXQob3JpZ2luYWwpICE7XG5cbiAgICAvLyBSdW4gdGhlIGFjdHVhbCBjb21waWxhdGlvbiwgd2hpY2ggZ2VuZXJhdGVzIGFuIEV4cHJlc3Npb24gZm9yIHRoZSBJdnkgZmllbGQuXG4gICAgbGV0IHJlczogQ29tcGlsZVJlc3VsdHxDb21waWxlUmVzdWx0W10gPSBvcC5hZGFwdGVyLmNvbXBpbGUobm9kZSwgb3AuYW5hbHlzaXMpO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShyZXMpKSB7XG4gICAgICByZXMgPSBbcmVzXTtcbiAgICB9XG5cbiAgICAvLyBMb29rIHVwIHRoZSAuZC50cyB0cmFuc2Zvcm1lciBmb3IgdGhlIGlucHV0IGZpbGUgYW5kIHJlY29yZCB0aGF0IGEgZmllbGQgd2FzIGdlbmVyYXRlZCxcbiAgICAvLyB3aGljaCB3aWxsIGFsbG93IHRoZSAuZC50cyB0byBiZSB0cmFuc2Zvcm1lZCBsYXRlci5cbiAgICBjb25zdCBmaWxlTmFtZSA9IG9yaWdpbmFsLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcbiAgICBjb25zdCBkdHNUcmFuc2Zvcm1lciA9IHRoaXMuZ2V0RHRzVHJhbnNmb3JtZXIoZmlsZU5hbWUpO1xuICAgIGR0c1RyYW5zZm9ybWVyLnJlY29yZFN0YXRpY0ZpZWxkKHJlZmxlY3ROYW1lT2ZEZWNsYXJhdGlvbihub2RlKSAhLCByZXMpO1xuXG4gICAgLy8gUmV0dXJuIHRoZSBpbnN0cnVjdGlvbiB0byB0aGUgdHJhbnNmb3JtZXIgc28gdGhlIGZpZWxkIHdpbGwgYmUgYWRkZWQuXG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBMb29rdXAgdGhlIGB0cy5EZWNvcmF0b3JgIHdoaWNoIHRyaWdnZXJlZCB0cmFuc2Zvcm1hdGlvbiBvZiBhIHBhcnRpY3VsYXIgY2xhc3MgZGVjbGFyYXRpb24uXG4gICAqL1xuICBpdnlEZWNvcmF0b3JGb3Iobm9kZTogdHMuRGVjbGFyYXRpb24pOiBEZWNvcmF0b3J8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBvcmlnaW5hbCA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKSBhcyB0cy5EZWNsYXJhdGlvbjtcbiAgICBpZiAoIXRoaXMuYW5hbHlzaXMuaGFzKG9yaWdpbmFsKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5hbmFseXNpcy5nZXQob3JpZ2luYWwpICEuZGVjb3JhdG9yO1xuICB9XG5cbiAgLyoqXG4gICAqIFByb2Nlc3MgYSAuZC50cyBzb3VyY2Ugc3RyaW5nIGFuZCByZXR1cm4gYSB0cmFuc2Zvcm1lZCB2ZXJzaW9uIHRoYXQgaW5jb3Jwb3JhdGVzIHRoZSBjaGFuZ2VzXG4gICAqIG1hZGUgdG8gdGhlIHNvdXJjZSBmaWxlLlxuICAgKi9cbiAgdHJhbnNmb3JtZWREdHNGb3IodHNGaWxlTmFtZTogc3RyaW5nLCBkdHNPcmlnaW5hbFNvdXJjZTogc3RyaW5nLCBkdHNQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIC8vIE5vIG5lZWQgdG8gdHJhbnNmb3JtIGlmIG5vIGNoYW5nZXMgaGF2ZSBiZWVuIHJlcXVlc3RlZCB0byB0aGUgaW5wdXQgZmlsZS5cbiAgICBpZiAoIXRoaXMuZHRzTWFwLmhhcyh0c0ZpbGVOYW1lKSkge1xuICAgICAgcmV0dXJuIGR0c09yaWdpbmFsU291cmNlO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB0aGUgdHJhbnNmb3JtZWQgLmQudHMgc291cmNlLlxuICAgIHJldHVybiB0aGlzLmR0c01hcC5nZXQodHNGaWxlTmFtZSkgIS50cmFuc2Zvcm0oZHRzT3JpZ2luYWxTb3VyY2UsIHRzRmlsZU5hbWUpO1xuICB9XG5cbiAgZ2V0IGRpYWdub3N0aWNzKCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4geyByZXR1cm4gdGhpcy5fZGlhZ25vc3RpY3M7IH1cblxuICBwcml2YXRlIGdldER0c1RyYW5zZm9ybWVyKHRzRmlsZU5hbWU6IHN0cmluZyk6IER0c0ZpbGVUcmFuc2Zvcm1lciB7XG4gICAgaWYgKCF0aGlzLmR0c01hcC5oYXModHNGaWxlTmFtZSkpIHtcbiAgICAgIHRoaXMuZHRzTWFwLnNldCh0c0ZpbGVOYW1lLCBuZXcgRHRzRmlsZVRyYW5zZm9ybWVyKHRoaXMuY29yZUltcG9ydHNGcm9tKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmR0c01hcC5nZXQodHNGaWxlTmFtZSkgITtcbiAgfVxufVxuIl19