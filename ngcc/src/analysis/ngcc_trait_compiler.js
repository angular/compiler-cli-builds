(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/analysis/ngcc_trait_compiler", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/ngcc/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NgccTraitCompiler = void 0;
    var tslib_1 = require("tslib");
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
    /**
     * Specializes the `TraitCompiler` for ngcc purposes. Mainly, this includes an alternative way of
     * scanning for classes to compile using the reflection host's `findClassSymbols`, together with
     * support to inject synthetic decorators into the compilation for ad-hoc migrations that ngcc
     * performs.
     */
    var NgccTraitCompiler = /** @class */ (function (_super) {
        tslib_1.__extends(NgccTraitCompiler, _super);
        function NgccTraitCompiler(handlers, ngccReflector) {
            var _this = _super.call(this, handlers, ngccReflector, perf_1.NOOP_PERF_RECORDER, new NoIncrementalBuild(), 
            /* compileNonExportedClasses */ true, transform_1.CompilationMode.FULL, new transform_1.DtsTransformRegistry(), 
            /* semanticDepGraphUpdater */ null) || this;
            _this.ngccReflector = ngccReflector;
            return _this;
        }
        Object.defineProperty(NgccTraitCompiler.prototype, "analyzedFiles", {
            get: function () {
                return Array.from(this.fileToClasses.keys());
            },
            enumerable: false,
            configurable: true
        });
        /**
         * Analyzes the source file in search for classes to process. For any class that is found in the
         * file, a `ClassRecord` is created and the source file is included in the `analyzedFiles` array.
         */
        NgccTraitCompiler.prototype.analyzeFile = function (sf) {
            var e_1, _a;
            var ngccClassSymbols = this.ngccReflector.findClassSymbols(sf);
            try {
                for (var ngccClassSymbols_1 = tslib_1.__values(ngccClassSymbols), ngccClassSymbols_1_1 = ngccClassSymbols_1.next(); !ngccClassSymbols_1_1.done; ngccClassSymbols_1_1 = ngccClassSymbols_1.next()) {
                    var classSymbol = ngccClassSymbols_1_1.value;
                    this.analyzeClass(classSymbol.declaration.valueDeclaration, null);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (ngccClassSymbols_1_1 && !ngccClassSymbols_1_1.done && (_a = ngccClassSymbols_1.return)) _a.call(ngccClassSymbols_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return undefined;
        };
        /**
         * Associate a new synthesized decorator, which did not appear in the original source, with a
         * given class.
         * @param clazz the class to receive the new decorator.
         * @param decorator the decorator to inject.
         * @param flags optional bitwise flag to influence the compilation of the decorator.
         */
        NgccTraitCompiler.prototype.injectSyntheticDecorator = function (clazz, decorator, flags) {
            var e_2, _a;
            var migratedTraits = this.detectTraits(clazz, [decorator]);
            if (migratedTraits === null) {
                return [];
            }
            try {
                for (var migratedTraits_1 = tslib_1.__values(migratedTraits), migratedTraits_1_1 = migratedTraits_1.next(); !migratedTraits_1_1.done; migratedTraits_1_1 = migratedTraits_1.next()) {
                    var trait = migratedTraits_1_1.value;
                    this.analyzeTrait(clazz, trait, flags);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (migratedTraits_1_1 && !migratedTraits_1_1.done && (_a = migratedTraits_1.return)) _a.call(migratedTraits_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return migratedTraits;
        };
        /**
         * Returns all decorators that have been recognized for the provided class, including any
         * synthetically injected decorators.
         * @param clazz the declaration for which the decorators are returned.
         */
        NgccTraitCompiler.prototype.getAllDecorators = function (clazz) {
            var record = this.recordFor(clazz);
            if (record === null) {
                return null;
            }
            return record.traits.map(function (trait) { return trait.detected.decorator; }).filter(utils_1.isDefined);
        };
        return NgccTraitCompiler;
    }(transform_1.TraitCompiler));
    exports.NgccTraitCompiler = NgccTraitCompiler;
    var NoIncrementalBuild = /** @class */ (function () {
        function NoIncrementalBuild() {
        }
        NoIncrementalBuild.prototype.priorWorkFor = function (sf) {
            return null;
        };
        NoIncrementalBuild.prototype.priorTypeCheckingResultsFor = function () {
            return null;
        };
        NoIncrementalBuild.prototype.recordSuccessfulTypeCheck = function () { };
        return NoIncrementalBuild;
    }());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdjY190cmFpdF9jb21waWxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9hbmFseXNpcy9uZ2NjX3RyYWl0X2NvbXBpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFXQSw2REFBMkQ7SUFFM0QsdUVBQXlJO0lBRXpJLDhEQUFtQztJQUVuQzs7Ozs7T0FLRztJQUNIO1FBQXVDLDZDQUFhO1FBQ2xELDJCQUNJLFFBQTRFLEVBQ3BFLGFBQWlDO1lBRjdDLFlBR0Usa0JBQ0ksUUFBUSxFQUFFLGFBQWEsRUFBRSx5QkFBa0IsRUFBRSxJQUFJLGtCQUFrQixFQUFFO1lBQ3JFLCtCQUErQixDQUFDLElBQUksRUFBRSwyQkFBZSxDQUFDLElBQUksRUFBRSxJQUFJLGdDQUFvQixFQUFFO1lBQ3RGLDZCQUE2QixDQUFDLElBQUksQ0FBQyxTQUN4QztZQUxXLG1CQUFhLEdBQWIsYUFBYSxDQUFvQjs7UUFLN0MsQ0FBQztRQUVELHNCQUFJLDRDQUFhO2lCQUFqQjtnQkFDRSxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQy9DLENBQUM7OztXQUFBO1FBRUQ7OztXQUdHO1FBQ0gsdUNBQVcsR0FBWCxVQUFZLEVBQWlCOztZQUMzQixJQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUM7O2dCQUNqRSxLQUEwQixJQUFBLHFCQUFBLGlCQUFBLGdCQUFnQixDQUFBLGtEQUFBLGdGQUFFO29CQUF2QyxJQUFNLFdBQVcsNkJBQUE7b0JBQ3BCLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQztpQkFDbkU7Ozs7Ozs7OztZQUVELE9BQU8sU0FBUyxDQUFDO1FBQ25CLENBQUM7UUFFRDs7Ozs7O1dBTUc7UUFDSCxvREFBd0IsR0FBeEIsVUFBeUIsS0FBdUIsRUFBRSxTQUFvQixFQUFFLEtBQW9COztZQUUxRixJQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDN0QsSUFBSSxjQUFjLEtBQUssSUFBSSxFQUFFO2dCQUMzQixPQUFPLEVBQUUsQ0FBQzthQUNYOztnQkFFRCxLQUFvQixJQUFBLG1CQUFBLGlCQUFBLGNBQWMsQ0FBQSw4Q0FBQSwwRUFBRTtvQkFBL0IsSUFBTSxLQUFLLDJCQUFBO29CQUNkLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztpQkFDeEM7Ozs7Ozs7OztZQUVELE9BQU8sY0FBYyxDQUFDO1FBQ3hCLENBQUM7UUFFRDs7OztXQUlHO1FBQ0gsNENBQWdCLEdBQWhCLFVBQWlCLEtBQXVCO1lBQ3RDLElBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDckMsSUFBSSxNQUFNLEtBQUssSUFBSSxFQUFFO2dCQUNuQixPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFBLEtBQUssSUFBSSxPQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUF4QixDQUF3QixDQUFDLENBQUMsTUFBTSxDQUFDLGlCQUFTLENBQUMsQ0FBQztRQUNoRixDQUFDO1FBQ0gsd0JBQUM7SUFBRCxDQUFDLEFBN0RELENBQXVDLHlCQUFhLEdBNkRuRDtJQTdEWSw4Q0FBaUI7SUErRDlCO1FBQUE7UUFVQSxDQUFDO1FBVEMseUNBQVksR0FBWixVQUFhLEVBQWlCO1lBQzVCLE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUVELHdEQUEyQixHQUEzQjtZQUNFLE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUVELHNEQUF5QixHQUF6QixjQUFtQyxDQUFDO1FBQ3RDLHlCQUFDO0lBQUQsQ0FBQyxBQVZELElBVUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7U2VtYW50aWNTeW1ib2x9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvbmdtb2R1bGVfc2VtYW50aWNzL3NyYy9hcGknO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7SW5jcmVtZW50YWxCdWlsZH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2luY3JlbWVudGFsL2FwaSc7XG5pbXBvcnQge05PT1BfUEVSRl9SRUNPUkRFUn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3BlcmYnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBEZWNvcmF0b3J9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7Q29tcGlsYXRpb25Nb2RlLCBEZWNvcmF0b3JIYW5kbGVyLCBEdHNUcmFuc2Zvcm1SZWdpc3RyeSwgSGFuZGxlckZsYWdzLCBUcmFpdCwgVHJhaXRDb21waWxlcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3RyYW5zZm9ybSc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtpc0RlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcblxuLyoqXG4gKiBTcGVjaWFsaXplcyB0aGUgYFRyYWl0Q29tcGlsZXJgIGZvciBuZ2NjIHB1cnBvc2VzLiBNYWlubHksIHRoaXMgaW5jbHVkZXMgYW4gYWx0ZXJuYXRpdmUgd2F5IG9mXG4gKiBzY2FubmluZyBmb3IgY2xhc3NlcyB0byBjb21waWxlIHVzaW5nIHRoZSByZWZsZWN0aW9uIGhvc3QncyBgZmluZENsYXNzU3ltYm9sc2AsIHRvZ2V0aGVyIHdpdGhcbiAqIHN1cHBvcnQgdG8gaW5qZWN0IHN5bnRoZXRpYyBkZWNvcmF0b3JzIGludG8gdGhlIGNvbXBpbGF0aW9uIGZvciBhZC1ob2MgbWlncmF0aW9ucyB0aGF0IG5nY2NcbiAqIHBlcmZvcm1zLlxuICovXG5leHBvcnQgY2xhc3MgTmdjY1RyYWl0Q29tcGlsZXIgZXh0ZW5kcyBUcmFpdENvbXBpbGVyIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBoYW5kbGVyczogRGVjb3JhdG9ySGFuZGxlcjx1bmtub3duLCB1bmtub3duLCBTZW1hbnRpY1N5bWJvbHxudWxsLCB1bmtub3duPltdLFxuICAgICAgcHJpdmF0ZSBuZ2NjUmVmbGVjdG9yOiBOZ2NjUmVmbGVjdGlvbkhvc3QpIHtcbiAgICBzdXBlcihcbiAgICAgICAgaGFuZGxlcnMsIG5nY2NSZWZsZWN0b3IsIE5PT1BfUEVSRl9SRUNPUkRFUiwgbmV3IE5vSW5jcmVtZW50YWxCdWlsZCgpLFxuICAgICAgICAvKiBjb21waWxlTm9uRXhwb3J0ZWRDbGFzc2VzICovIHRydWUsIENvbXBpbGF0aW9uTW9kZS5GVUxMLCBuZXcgRHRzVHJhbnNmb3JtUmVnaXN0cnkoKSxcbiAgICAgICAgLyogc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIgKi8gbnVsbCk7XG4gIH1cblxuICBnZXQgYW5hbHl6ZWRGaWxlcygpOiB0cy5Tb3VyY2VGaWxlW10ge1xuICAgIHJldHVybiBBcnJheS5mcm9tKHRoaXMuZmlsZVRvQ2xhc3Nlcy5rZXlzKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFuYWx5emVzIHRoZSBzb3VyY2UgZmlsZSBpbiBzZWFyY2ggZm9yIGNsYXNzZXMgdG8gcHJvY2Vzcy4gRm9yIGFueSBjbGFzcyB0aGF0IGlzIGZvdW5kIGluIHRoZVxuICAgKiBmaWxlLCBhIGBDbGFzc1JlY29yZGAgaXMgY3JlYXRlZCBhbmQgdGhlIHNvdXJjZSBmaWxlIGlzIGluY2x1ZGVkIGluIHRoZSBgYW5hbHl6ZWRGaWxlc2AgYXJyYXkuXG4gICAqL1xuICBhbmFseXplRmlsZShzZjogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGNvbnN0IG5nY2NDbGFzc1N5bWJvbHMgPSB0aGlzLm5nY2NSZWZsZWN0b3IuZmluZENsYXNzU3ltYm9scyhzZik7XG4gICAgZm9yIChjb25zdCBjbGFzc1N5bWJvbCBvZiBuZ2NjQ2xhc3NTeW1ib2xzKSB7XG4gICAgICB0aGlzLmFuYWx5emVDbGFzcyhjbGFzc1N5bWJvbC5kZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uLCBudWxsKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIEFzc29jaWF0ZSBhIG5ldyBzeW50aGVzaXplZCBkZWNvcmF0b3IsIHdoaWNoIGRpZCBub3QgYXBwZWFyIGluIHRoZSBvcmlnaW5hbCBzb3VyY2UsIHdpdGggYVxuICAgKiBnaXZlbiBjbGFzcy5cbiAgICogQHBhcmFtIGNsYXp6IHRoZSBjbGFzcyB0byByZWNlaXZlIHRoZSBuZXcgZGVjb3JhdG9yLlxuICAgKiBAcGFyYW0gZGVjb3JhdG9yIHRoZSBkZWNvcmF0b3IgdG8gaW5qZWN0LlxuICAgKiBAcGFyYW0gZmxhZ3Mgb3B0aW9uYWwgYml0d2lzZSBmbGFnIHRvIGluZmx1ZW5jZSB0aGUgY29tcGlsYXRpb24gb2YgdGhlIGRlY29yYXRvci5cbiAgICovXG4gIGluamVjdFN5bnRoZXRpY0RlY29yYXRvcihjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IsIGZsYWdzPzogSGFuZGxlckZsYWdzKTpcbiAgICAgIFRyYWl0PHVua25vd24sIHVua25vd24sIFNlbWFudGljU3ltYm9sfG51bGwsIHVua25vd24+W10ge1xuICAgIGNvbnN0IG1pZ3JhdGVkVHJhaXRzID0gdGhpcy5kZXRlY3RUcmFpdHMoY2xhenosIFtkZWNvcmF0b3JdKTtcbiAgICBpZiAobWlncmF0ZWRUcmFpdHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IHRyYWl0IG9mIG1pZ3JhdGVkVHJhaXRzKSB7XG4gICAgICB0aGlzLmFuYWx5emVUcmFpdChjbGF6eiwgdHJhaXQsIGZsYWdzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbWlncmF0ZWRUcmFpdHM7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhbGwgZGVjb3JhdG9ycyB0aGF0IGhhdmUgYmVlbiByZWNvZ25pemVkIGZvciB0aGUgcHJvdmlkZWQgY2xhc3MsIGluY2x1ZGluZyBhbnlcbiAgICogc3ludGhldGljYWxseSBpbmplY3RlZCBkZWNvcmF0b3JzLlxuICAgKiBAcGFyYW0gY2xhenogdGhlIGRlY2xhcmF0aW9uIGZvciB3aGljaCB0aGUgZGVjb3JhdG9ycyBhcmUgcmV0dXJuZWQuXG4gICAqL1xuICBnZXRBbGxEZWNvcmF0b3JzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogRGVjb3JhdG9yW118bnVsbCB7XG4gICAgY29uc3QgcmVjb3JkID0gdGhpcy5yZWNvcmRGb3IoY2xhenopO1xuICAgIGlmIChyZWNvcmQgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiByZWNvcmQudHJhaXRzLm1hcCh0cmFpdCA9PiB0cmFpdC5kZXRlY3RlZC5kZWNvcmF0b3IpLmZpbHRlcihpc0RlZmluZWQpO1xuICB9XG59XG5cbmNsYXNzIE5vSW5jcmVtZW50YWxCdWlsZCBpbXBsZW1lbnRzIEluY3JlbWVudGFsQnVpbGQ8YW55LCBhbnk+IHtcbiAgcHJpb3JXb3JrRm9yKHNmOiB0cy5Tb3VyY2VGaWxlKTogYW55W118bnVsbCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBwcmlvclR5cGVDaGVja2luZ1Jlc3VsdHNGb3IoKTogbnVsbCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICByZWNvcmRTdWNjZXNzZnVsVHlwZUNoZWNrKCk6IHZvaWQge31cbn1cbiJdfQ==