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
        function IvyCompilation(handlers, checker, reflector, coreImportsFrom) {
            this.handlers = handlers;
            this.checker = checker;
            this.reflector = reflector;
            this.coreImportsFrom = coreImportsFrom;
            /**
             * Tracks classes which have been analyzed and found to have an Ivy decorator, and the
             * information recorded about them for later compilation.
             */
            this.analysis = new Map();
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
        IvyCompilation.prototype.transformedDtsFor = function (tsFileName, dtsOriginalSource) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvY29tcGlsYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBR2pDLG9GQUFzRTtJQUd0RSx5RkFBaUQ7SUFZakQ7Ozs7O09BS0c7SUFDSDtRQWNFOzs7Ozs7OztXQVFHO1FBQ0gsd0JBQ1ksUUFBaUMsRUFBVSxPQUF1QixFQUNsRSxTQUF5QixFQUFVLGVBQW1DO1lBRHRFLGFBQVEsR0FBUixRQUFRLENBQXlCO1lBQVUsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7WUFDbEUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFBVSxvQkFBZSxHQUFmLGVBQWUsQ0FBb0I7WUF4QmxGOzs7ZUFHRztZQUNLLGFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBMkMsQ0FBQztZQUV0RTs7ZUFFRztZQUNLLFdBQU0sR0FBRyxJQUFJLEdBQUcsRUFBOEIsQ0FBQztZQUMvQyxpQkFBWSxHQUFvQixFQUFFLENBQUM7UUFjMEMsQ0FBQztRQUd0RixvQ0FBVyxHQUFYLFVBQVksRUFBaUIsSUFBVSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV4RSxxQ0FBWSxHQUFaLFVBQWEsRUFBaUIsSUFBNkIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFPbkYsZ0NBQU8sR0FBZixVQUFnQixFQUFpQixFQUFFLFVBQW1CO1lBQXRELGlCQW9FQztZQW5FQyxJQUFNLFFBQVEsR0FBb0IsRUFBRSxDQUFDO1lBRXJDLElBQU0sWUFBWSxHQUFHLFVBQUMsSUFBb0I7Z0JBQ3hDLCtDQUErQztnQkFDL0Ms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QyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDaEMsT0FBTyxpQkFBaUIsQ0FBQzthQUMxQjtZQUVELHVDQUF1QztZQUN2QyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBRyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNoRixDQUFDO1FBRUQsc0JBQUksdUNBQVc7aUJBQWYsY0FBa0QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQzs7O1dBQUE7UUFFckUsMENBQWlCLEdBQXpCLFVBQTBCLFVBQWtCO1lBQzFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDaEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLElBQUksZ0NBQWtCLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7YUFDM0U7WUFDRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBRyxDQUFDO1FBQ3ZDLENBQUM7UUFDSCxxQkFBQztJQUFELENBQUMsQUF6S0QsSUF5S0M7SUF6S1ksd0NBQWMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0RlY29yYXRvciwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL2hvc3QnO1xuaW1wb3J0IHtyZWZsZWN0TmFtZU9mRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL21ldGFkYXRhL3NyYy9yZWZsZWN0b3InO1xuXG5pbXBvcnQge0FuYWx5c2lzT3V0cHV0LCBDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge0R0c0ZpbGVUcmFuc2Zvcm1lcn0gZnJvbSAnLi9kZWNsYXJhdGlvbic7XG5cbi8qKlxuICogUmVjb3JkIG9mIGFuIGFkYXB0ZXIgd2hpY2ggZGVjaWRlZCB0byBlbWl0IGEgc3RhdGljIGZpZWxkLCBhbmQgdGhlIGFuYWx5c2lzIGl0IHBlcmZvcm1lZCB0b1xuICogcHJlcGFyZSBmb3IgdGhhdCBvcGVyYXRpb24uXG4gKi9cbmludGVyZmFjZSBFbWl0RmllbGRPcGVyYXRpb248VD4ge1xuICBhZGFwdGVyOiBEZWNvcmF0b3JIYW5kbGVyPFQ+O1xuICBhbmFseXNpczogQW5hbHlzaXNPdXRwdXQ8VD47XG4gIGRlY29yYXRvcjogRGVjb3JhdG9yO1xufVxuXG4vKipcbiAqIE1hbmFnZXMgYSBjb21waWxhdGlvbiBvZiBJdnkgZGVjb3JhdG9ycyBpbnRvIHN0YXRpYyBmaWVsZHMgYWNyb3NzIGFuIGVudGlyZSB0cy5Qcm9ncmFtLlxuICpcbiAqIFRoZSBjb21waWxhdGlvbiBpcyBzdGF0ZWZ1bCAtIHNvdXJjZSBmaWxlcyBhcmUgYW5hbHl6ZWQgYW5kIHJlY29yZHMgb2YgdGhlIG9wZXJhdGlvbnMgdGhhdCBuZWVkXG4gKiB0byBiZSBwZXJmb3JtZWQgZHVyaW5nIHRoZSB0cmFuc2Zvcm0vZW1pdCBwcm9jZXNzIGFyZSBtYWludGFpbmVkIGludGVybmFsbHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBJdnlDb21waWxhdGlvbiB7XG4gIC8qKlxuICAgKiBUcmFja3MgY2xhc3NlcyB3aGljaCBoYXZlIGJlZW4gYW5hbHl6ZWQgYW5kIGZvdW5kIHRvIGhhdmUgYW4gSXZ5IGRlY29yYXRvciwgYW5kIHRoZVxuICAgKiBpbmZvcm1hdGlvbiByZWNvcmRlZCBhYm91dCB0aGVtIGZvciBsYXRlciBjb21waWxhdGlvbi5cbiAgICovXG4gIHByaXZhdGUgYW5hbHlzaXMgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBFbWl0RmllbGRPcGVyYXRpb248YW55Pj4oKTtcblxuICAvKipcbiAgICogVHJhY2tzIHRoZSBgRHRzRmlsZVRyYW5zZm9ybWVyYHMgZm9yIGVhY2ggVFMgZmlsZSB0aGF0IG5lZWRzIC5kLnRzIHRyYW5zZm9ybWF0aW9ucy5cbiAgICovXG4gIHByaXZhdGUgZHRzTWFwID0gbmV3IE1hcDxzdHJpbmcsIER0c0ZpbGVUcmFuc2Zvcm1lcj4oKTtcbiAgcHJpdmF0ZSBfZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG5cbiAgLyoqXG4gICAqIEBwYXJhbSBoYW5kbGVycyBhcnJheSBvZiBgRGVjb3JhdG9ySGFuZGxlcmBzIHdoaWNoIHdpbGwgYmUgZXhlY3V0ZWQgYWdhaW5zdCBlYWNoIGNsYXNzIGluIHRoZVxuICAgKiBwcm9ncmFtXG4gICAqIEBwYXJhbSBjaGVja2VyIFR5cGVTY3JpcHQgYFR5cGVDaGVja2VyYCBpbnN0YW5jZSBmb3IgdGhlIHByb2dyYW1cbiAgICogQHBhcmFtIHJlZmxlY3RvciBgUmVmbGVjdGlvbkhvc3RgIHRocm91Z2ggd2hpY2ggYWxsIHJlZmxlY3Rpb24gb3BlcmF0aW9ucyB3aWxsIGJlIHBlcmZvcm1lZFxuICAgKiBAcGFyYW0gY29yZUltcG9ydHNGcm9tIGEgVHlwZVNjcmlwdCBgU291cmNlRmlsZWAgd2hpY2ggZXhwb3J0cyBzeW1ib2xzIG5lZWRlZCBmb3IgSXZ5IGltcG9ydHNcbiAgICogd2hlbiBjb21waWxpbmcgQGFuZ3VsYXIvY29yZSwgb3IgYG51bGxgIGlmIHRoZSBjdXJyZW50IHByb2dyYW0gaXMgbm90IEBhbmd1bGFyL2NvcmUuIFRoaXMgaXNcbiAgICogYG51bGxgIGluIG1vc3QgY2FzZXMuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgaGFuZGxlcnM6IERlY29yYXRvckhhbmRsZXI8YW55PltdLCBwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLFxuICAgICAgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIGNvcmVJbXBvcnRzRnJvbTogdHMuU291cmNlRmlsZXxudWxsKSB7fVxuXG5cbiAgYW5hbHl6ZVN5bmMoc2Y6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHsgcmV0dXJuIHRoaXMuYW5hbHl6ZShzZiwgZmFsc2UpOyB9XG5cbiAgYW5hbHl6ZUFzeW5jKHNmOiB0cy5Tb3VyY2VGaWxlKTogUHJvbWlzZTx2b2lkPnx1bmRlZmluZWQgeyByZXR1cm4gdGhpcy5hbmFseXplKHNmLCB0cnVlKTsgfVxuXG4gIC8qKlxuICAgKiBBbmFseXplIGEgc291cmNlIGZpbGUgYW5kIHByb2R1Y2UgZGlhZ25vc3RpY3MgZm9yIGl0IChpZiBhbnkpLlxuICAgKi9cbiAgcHJpdmF0ZSBhbmFseXplKHNmOiB0cy5Tb3VyY2VGaWxlLCBwcmVhbmFseXplOiBmYWxzZSk6IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBhbmFseXplKHNmOiB0cy5Tb3VyY2VGaWxlLCBwcmVhbmFseXplOiB0cnVlKTogUHJvbWlzZTx2b2lkPnx1bmRlZmluZWQ7XG4gIHByaXZhdGUgYW5hbHl6ZShzZjogdHMuU291cmNlRmlsZSwgcHJlYW5hbHl6ZTogYm9vbGVhbik6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkIHtcbiAgICBjb25zdCBwcm9taXNlczogUHJvbWlzZTx2b2lkPltdID0gW107XG5cbiAgICBjb25zdCBhbmFseXplQ2xhc3MgPSAobm9kZTogdHMuRGVjbGFyYXRpb24pOiB2b2lkID0+IHtcbiAgICAgIC8vIFRoZSBmaXJzdCBzdGVwIGlzIHRvIHJlZmxlY3QgdGhlIGRlY29yYXRvcnMuXG4gICAgICBjb25zdCBkZWNvcmF0b3JzID0gdGhpcy5yZWZsZWN0b3IuZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24obm9kZSk7XG4gICAgICBpZiAoZGVjb3JhdG9ycyA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICAvLyBMb29rIHRocm91Z2ggdGhlIERlY29yYXRvckhhbmRsZXJzIHRvIHNlZSBpZiBhbnkgYXJlIHJlbGV2YW50LlxuICAgICAgdGhpcy5oYW5kbGVycy5mb3JFYWNoKGFkYXB0ZXIgPT4ge1xuICAgICAgICAvLyBBbiBhZGFwdGVyIGlzIHJlbGV2YW50IGlmIGl0IG1hdGNoZXMgb25lIG9mIHRoZSBkZWNvcmF0b3JzIG9uIHRoZSBjbGFzcy5cbiAgICAgICAgY29uc3QgZGVjb3JhdG9yID0gYWRhcHRlci5kZXRlY3QoZGVjb3JhdG9ycyk7XG4gICAgICAgIGlmIChkZWNvcmF0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvbXBsZXRlQW5hbHlzaXMgPSAoKSA9PiB7XG4gICAgICAgICAgLy8gQ2hlY2sgZm9yIG11bHRpcGxlIGRlY29yYXRvcnMgb24gdGhlIHNhbWUgbm9kZS4gVGVjaG5pY2FsbHkgc3BlYWtpbmcgdGhpc1xuICAgICAgICAgIC8vIGNvdWxkIGJlIHN1cHBvcnRlZCwgYnV0IHJpZ2h0IG5vdyBpdCdzIGFuIGVycm9yLlxuICAgICAgICAgIGlmICh0aGlzLmFuYWx5c2lzLmhhcyhub2RlKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUT0RPLkRpYWdub3N0aWM6IENsYXNzIGhhcyBtdWx0aXBsZSBBbmd1bGFyIGRlY29yYXRvcnMuJyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gUnVuIGFuYWx5c2lzIG9uIHRoZSBkZWNvcmF0b3IuIFRoaXMgd2lsbCBwcm9kdWNlIGVpdGhlciBkaWFnbm9zdGljcywgYW5cbiAgICAgICAgICAvLyBhbmFseXNpcyByZXN1bHQsIG9yIGJvdGguXG4gICAgICAgICAgY29uc3QgYW5hbHlzaXMgPSBhZGFwdGVyLmFuYWx5emUobm9kZSwgZGVjb3JhdG9yKTtcblxuICAgICAgICAgIGlmIChhbmFseXNpcy5hbmFseXNpcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLmFuYWx5c2lzLnNldChub2RlLCB7XG4gICAgICAgICAgICAgIGFkYXB0ZXIsXG4gICAgICAgICAgICAgIGFuYWx5c2lzOiBhbmFseXNpcy5hbmFseXNpcywgZGVjb3JhdG9yLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGFuYWx5c2lzLmRpYWdub3N0aWNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMuX2RpYWdub3N0aWNzLnB1c2goLi4uYW5hbHlzaXMuZGlhZ25vc3RpY3MpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAocHJlYW5hbHl6ZSAmJiBhZGFwdGVyLnByZWFuYWx5emUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNvbnN0IHByZWFuYWx5c2lzID0gYWRhcHRlci5wcmVhbmFseXplKG5vZGUsIGRlY29yYXRvcik7XG4gICAgICAgICAgaWYgKHByZWFuYWx5c2lzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHByb21pc2VzLnB1c2gocHJlYW5hbHlzaXMudGhlbigoKSA9PiBjb21wbGV0ZUFuYWx5c2lzKCkpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29tcGxldGVBbmFseXNpcygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb21wbGV0ZUFuYWx5c2lzKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBjb25zdCB2aXNpdCA9IChub2RlOiB0cy5Ob2RlKTogdm9pZCA9PiB7XG4gICAgICAvLyBQcm9jZXNzIG5vZGVzIHJlY3Vyc2l2ZWx5LCBhbmQgbG9vayBmb3IgY2xhc3MgZGVjbGFyYXRpb25zIHdpdGggZGVjb3JhdG9ycy5cbiAgICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgICAgYW5hbHl6ZUNsYXNzKG5vZGUpO1xuICAgICAgfVxuICAgICAgdHMuZm9yRWFjaENoaWxkKG5vZGUsIHZpc2l0KTtcbiAgICB9O1xuXG4gICAgdmlzaXQoc2YpO1xuXG4gICAgaWYgKHByZWFuYWx5emUgJiYgcHJvbWlzZXMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKCgpID0+IHVuZGVmaW5lZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFBlcmZvcm0gYSBjb21waWxhdGlvbiBvcGVyYXRpb24gb24gdGhlIGdpdmVuIGNsYXNzIGRlY2xhcmF0aW9uIGFuZCByZXR1cm4gaW5zdHJ1Y3Rpb25zIHRvIGFuXG4gICAqIEFTVCB0cmFuc2Zvcm1lciBpZiBhbnkgYXJlIGF2YWlsYWJsZS5cbiAgICovXG4gIGNvbXBpbGVJdnlGaWVsZEZvcihub2RlOiB0cy5EZWNsYXJhdGlvbik6IENvbXBpbGVSZXN1bHRbXXx1bmRlZmluZWQge1xuICAgIC8vIExvb2sgdG8gc2VlIHdoZXRoZXIgdGhlIG9yaWdpbmFsIG5vZGUgd2FzIGFuYWx5emVkLiBJZiBub3QsIHRoZXJlJ3Mgbm90aGluZyB0byBkby5cbiAgICBjb25zdCBvcmlnaW5hbCA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKSBhcyB0cy5EZWNsYXJhdGlvbjtcbiAgICBpZiAoIXRoaXMuYW5hbHlzaXMuaGFzKG9yaWdpbmFsKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3Qgb3AgPSB0aGlzLmFuYWx5c2lzLmdldChvcmlnaW5hbCkgITtcblxuICAgIC8vIFJ1biB0aGUgYWN0dWFsIGNvbXBpbGF0aW9uLCB3aGljaCBnZW5lcmF0ZXMgYW4gRXhwcmVzc2lvbiBmb3IgdGhlIEl2eSBmaWVsZC5cbiAgICBsZXQgcmVzOiBDb21waWxlUmVzdWx0fENvbXBpbGVSZXN1bHRbXSA9IG9wLmFkYXB0ZXIuY29tcGlsZShub2RlLCBvcC5hbmFseXNpcyk7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHJlcykpIHtcbiAgICAgIHJlcyA9IFtyZXNdO1xuICAgIH1cblxuICAgIC8vIExvb2sgdXAgdGhlIC5kLnRzIHRyYW5zZm9ybWVyIGZvciB0aGUgaW5wdXQgZmlsZSBhbmQgcmVjb3JkIHRoYXQgYSBmaWVsZCB3YXMgZ2VuZXJhdGVkLFxuICAgIC8vIHdoaWNoIHdpbGwgYWxsb3cgdGhlIC5kLnRzIHRvIGJlIHRyYW5zZm9ybWVkIGxhdGVyLlxuICAgIGNvbnN0IGZpbGVOYW1lID0gb3JpZ2luYWwuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICAgIGNvbnN0IGR0c1RyYW5zZm9ybWVyID0gdGhpcy5nZXREdHNUcmFuc2Zvcm1lcihmaWxlTmFtZSk7XG4gICAgZHRzVHJhbnNmb3JtZXIucmVjb3JkU3RhdGljRmllbGQocmVmbGVjdE5hbWVPZkRlY2xhcmF0aW9uKG5vZGUpICEsIHJlcyk7XG5cbiAgICAvLyBSZXR1cm4gdGhlIGluc3RydWN0aW9uIHRvIHRoZSB0cmFuc2Zvcm1lciBzbyB0aGUgZmllbGQgd2lsbCBiZSBhZGRlZC5cbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgLyoqXG4gICAqIExvb2t1cCB0aGUgYHRzLkRlY29yYXRvcmAgd2hpY2ggdHJpZ2dlcmVkIHRyYW5zZm9ybWF0aW9uIG9mIGEgcGFydGljdWxhciBjbGFzcyBkZWNsYXJhdGlvbi5cbiAgICovXG4gIGl2eURlY29yYXRvckZvcihub2RlOiB0cy5EZWNsYXJhdGlvbik6IERlY29yYXRvcnx1bmRlZmluZWQge1xuICAgIGNvbnN0IG9yaWdpbmFsID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHRzLkRlY2xhcmF0aW9uO1xuICAgIGlmICghdGhpcy5hbmFseXNpcy5oYXMob3JpZ2luYWwpKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmFuYWx5c2lzLmdldChvcmlnaW5hbCkgIS5kZWNvcmF0b3I7XG4gIH1cblxuICAvKipcbiAgICogUHJvY2VzcyBhIC5kLnRzIHNvdXJjZSBzdHJpbmcgYW5kIHJldHVybiBhIHRyYW5zZm9ybWVkIHZlcnNpb24gdGhhdCBpbmNvcnBvcmF0ZXMgdGhlIGNoYW5nZXNcbiAgICogbWFkZSB0byB0aGUgc291cmNlIGZpbGUuXG4gICAqL1xuICB0cmFuc2Zvcm1lZER0c0Zvcih0c0ZpbGVOYW1lOiBzdHJpbmcsIGR0c09yaWdpbmFsU291cmNlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIC8vIE5vIG5lZWQgdG8gdHJhbnNmb3JtIGlmIG5vIGNoYW5nZXMgaGF2ZSBiZWVuIHJlcXVlc3RlZCB0byB0aGUgaW5wdXQgZmlsZS5cbiAgICBpZiAoIXRoaXMuZHRzTWFwLmhhcyh0c0ZpbGVOYW1lKSkge1xuICAgICAgcmV0dXJuIGR0c09yaWdpbmFsU291cmNlO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB0aGUgdHJhbnNmb3JtZWQgLmQudHMgc291cmNlLlxuICAgIHJldHVybiB0aGlzLmR0c01hcC5nZXQodHNGaWxlTmFtZSkgIS50cmFuc2Zvcm0oZHRzT3JpZ2luYWxTb3VyY2UsIHRzRmlsZU5hbWUpO1xuICB9XG5cbiAgZ2V0IGRpYWdub3N0aWNzKCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4geyByZXR1cm4gdGhpcy5fZGlhZ25vc3RpY3M7IH1cblxuICBwcml2YXRlIGdldER0c1RyYW5zZm9ybWVyKHRzRmlsZU5hbWU6IHN0cmluZyk6IER0c0ZpbGVUcmFuc2Zvcm1lciB7XG4gICAgaWYgKCF0aGlzLmR0c01hcC5oYXModHNGaWxlTmFtZSkpIHtcbiAgICAgIHRoaXMuZHRzTWFwLnNldCh0c0ZpbGVOYW1lLCBuZXcgRHRzRmlsZVRyYW5zZm9ybWVyKHRoaXMuY29yZUltcG9ydHNGcm9tKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmR0c01hcC5nZXQodHNGaWxlTmFtZSkgITtcbiAgfVxufVxuIl19