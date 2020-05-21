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
            /* compileNonExportedClasses */ true, new transform_1.DtsTransformRegistry()) || this;
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
        return NoIncrementalBuild;
    }());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdjY190cmFpdF9jb21waWxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9hbmFseXNpcy9uZ2NjX3RyYWl0X2NvbXBpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFVQSw2REFBMkQ7SUFFM0QsdUVBQXdIO0lBRXhILDhEQUFtQztJQUVuQzs7Ozs7T0FLRztJQUNIO1FBQXVDLDZDQUFhO1FBQ2xELDJCQUNJLFFBQXVELEVBQy9DLGFBQWlDO1lBRjdDLFlBR0Usa0JBQ0ksUUFBUSxFQUFFLGFBQWEsRUFBRSx5QkFBa0IsRUFBRSxJQUFJLGtCQUFrQixFQUFFO1lBQ3JFLCtCQUErQixDQUFDLElBQUksRUFBRSxJQUFJLGdDQUFvQixFQUFFLENBQUMsU0FDdEU7WUFKVyxtQkFBYSxHQUFiLGFBQWEsQ0FBb0I7O1FBSTdDLENBQUM7UUFFRCxzQkFBSSw0Q0FBYTtpQkFBakI7Z0JBQ0UsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUMvQyxDQUFDOzs7V0FBQTtRQUVEOzs7V0FHRztRQUNILHVDQUFXLEdBQVgsVUFBWSxFQUFpQjs7WUFDM0IsSUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFDOztnQkFDakUsS0FBMEIsSUFBQSxxQkFBQSxpQkFBQSxnQkFBZ0IsQ0FBQSxrREFBQSxnRkFBRTtvQkFBdkMsSUFBTSxXQUFXLDZCQUFBO29CQUNwQixJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUM7aUJBQ25FOzs7Ozs7Ozs7WUFFRCxPQUFPLFNBQVMsQ0FBQztRQUNuQixDQUFDO1FBRUQ7Ozs7OztXQU1HO1FBQ0gsb0RBQXdCLEdBQXhCLFVBQXlCLEtBQXVCLEVBQUUsU0FBb0IsRUFBRSxLQUFvQjs7WUFFMUYsSUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQzdELElBQUksY0FBYyxLQUFLLElBQUksRUFBRTtnQkFDM0IsT0FBTyxFQUFFLENBQUM7YUFDWDs7Z0JBRUQsS0FBb0IsSUFBQSxtQkFBQSxpQkFBQSxjQUFjLENBQUEsOENBQUEsMEVBQUU7b0JBQS9CLElBQU0sS0FBSywyQkFBQTtvQkFDZCxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7aUJBQ3hDOzs7Ozs7Ozs7WUFFRCxPQUFPLGNBQWMsQ0FBQztRQUN4QixDQUFDO1FBRUQ7Ozs7V0FJRztRQUNILDRDQUFnQixHQUFoQixVQUFpQixLQUF1QjtZQUN0QyxJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3JDLElBQUksTUFBTSxLQUFLLElBQUksRUFBRTtnQkFDbkIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBQSxLQUFLLElBQUksT0FBQSxLQUFLLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBeEIsQ0FBd0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxpQkFBUyxDQUFDLENBQUM7UUFDaEYsQ0FBQztRQUNILHdCQUFDO0lBQUQsQ0FBQyxBQTVERCxDQUF1Qyx5QkFBYSxHQTREbkQ7SUE1RFksOENBQWlCO0lBOEQ5QjtRQUFBO1FBUUEsQ0FBQztRQVBDLHlDQUFZLEdBQVosVUFBYSxFQUFpQjtZQUM1QixPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFFRCx3REFBMkIsR0FBM0I7WUFDRSxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFDSCx5QkFBQztJQUFELENBQUMsQUFSRCxJQVFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7SW5jcmVtZW50YWxCdWlsZH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2luY3JlbWVudGFsL2FwaSc7XG5pbXBvcnQge05PT1BfUEVSRl9SRUNPUkRFUn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3BlcmYnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBEZWNvcmF0b3J9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7RGVjb3JhdG9ySGFuZGxlciwgRHRzVHJhbnNmb3JtUmVnaXN0cnksIEhhbmRsZXJGbGFncywgVHJhaXQsIFRyYWl0Q29tcGlsZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy90cmFuc2Zvcm0nO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7aXNEZWZpbmVkfSBmcm9tICcuLi91dGlscyc7XG5cbi8qKlxuICogU3BlY2lhbGl6ZXMgdGhlIGBUcmFpdENvbXBpbGVyYCBmb3IgbmdjYyBwdXJwb3Nlcy4gTWFpbmx5LCB0aGlzIGluY2x1ZGVzIGFuIGFsdGVybmF0aXZlIHdheSBvZlxuICogc2Nhbm5pbmcgZm9yIGNsYXNzZXMgdG8gY29tcGlsZSB1c2luZyB0aGUgcmVmbGVjdGlvbiBob3N0J3MgYGZpbmRDbGFzc1N5bWJvbHNgLCB0b2dldGhlciB3aXRoXG4gKiBzdXBwb3J0IHRvIGluamVjdCBzeW50aGV0aWMgZGVjb3JhdG9ycyBpbnRvIHRoZSBjb21waWxhdGlvbiBmb3IgYWQtaG9jIG1pZ3JhdGlvbnMgdGhhdCBuZ2NjXG4gKiBwZXJmb3Jtcy5cbiAqL1xuZXhwb3J0IGNsYXNzIE5nY2NUcmFpdENvbXBpbGVyIGV4dGVuZHMgVHJhaXRDb21waWxlciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgaGFuZGxlcnM6IERlY29yYXRvckhhbmRsZXI8dW5rbm93biwgdW5rbm93biwgdW5rbm93bj5bXSxcbiAgICAgIHByaXZhdGUgbmdjY1JlZmxlY3RvcjogTmdjY1JlZmxlY3Rpb25Ib3N0KSB7XG4gICAgc3VwZXIoXG4gICAgICAgIGhhbmRsZXJzLCBuZ2NjUmVmbGVjdG9yLCBOT09QX1BFUkZfUkVDT1JERVIsIG5ldyBOb0luY3JlbWVudGFsQnVpbGQoKSxcbiAgICAgICAgLyogY29tcGlsZU5vbkV4cG9ydGVkQ2xhc3NlcyAqLyB0cnVlLCBuZXcgRHRzVHJhbnNmb3JtUmVnaXN0cnkoKSk7XG4gIH1cblxuICBnZXQgYW5hbHl6ZWRGaWxlcygpOiB0cy5Tb3VyY2VGaWxlW10ge1xuICAgIHJldHVybiBBcnJheS5mcm9tKHRoaXMuZmlsZVRvQ2xhc3Nlcy5rZXlzKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFuYWx5emVzIHRoZSBzb3VyY2UgZmlsZSBpbiBzZWFyY2ggZm9yIGNsYXNzZXMgdG8gcHJvY2Vzcy4gRm9yIGFueSBjbGFzcyB0aGF0IGlzIGZvdW5kIGluIHRoZVxuICAgKiBmaWxlLCBhIGBDbGFzc1JlY29yZGAgaXMgY3JlYXRlZCBhbmQgdGhlIHNvdXJjZSBmaWxlIGlzIGluY2x1ZGVkIGluIHRoZSBgYW5hbHl6ZWRGaWxlc2AgYXJyYXkuXG4gICAqL1xuICBhbmFseXplRmlsZShzZjogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGNvbnN0IG5nY2NDbGFzc1N5bWJvbHMgPSB0aGlzLm5nY2NSZWZsZWN0b3IuZmluZENsYXNzU3ltYm9scyhzZik7XG4gICAgZm9yIChjb25zdCBjbGFzc1N5bWJvbCBvZiBuZ2NjQ2xhc3NTeW1ib2xzKSB7XG4gICAgICB0aGlzLmFuYWx5emVDbGFzcyhjbGFzc1N5bWJvbC5kZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uLCBudWxsKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIEFzc29jaWF0ZSBhIG5ldyBzeW50aGVzaXplZCBkZWNvcmF0b3IsIHdoaWNoIGRpZCBub3QgYXBwZWFyIGluIHRoZSBvcmlnaW5hbCBzb3VyY2UsIHdpdGggYVxuICAgKiBnaXZlbiBjbGFzcy5cbiAgICogQHBhcmFtIGNsYXp6IHRoZSBjbGFzcyB0byByZWNlaXZlIHRoZSBuZXcgZGVjb3JhdG9yLlxuICAgKiBAcGFyYW0gZGVjb3JhdG9yIHRoZSBkZWNvcmF0b3IgdG8gaW5qZWN0LlxuICAgKiBAcGFyYW0gZmxhZ3Mgb3B0aW9uYWwgYml0d2lzZSBmbGFnIHRvIGluZmx1ZW5jZSB0aGUgY29tcGlsYXRpb24gb2YgdGhlIGRlY29yYXRvci5cbiAgICovXG4gIGluamVjdFN5bnRoZXRpY0RlY29yYXRvcihjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IsIGZsYWdzPzogSGFuZGxlckZsYWdzKTpcbiAgICAgIFRyYWl0PHVua25vd24sIHVua25vd24sIHVua25vd24+W10ge1xuICAgIGNvbnN0IG1pZ3JhdGVkVHJhaXRzID0gdGhpcy5kZXRlY3RUcmFpdHMoY2xhenosIFtkZWNvcmF0b3JdKTtcbiAgICBpZiAobWlncmF0ZWRUcmFpdHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IHRyYWl0IG9mIG1pZ3JhdGVkVHJhaXRzKSB7XG4gICAgICB0aGlzLmFuYWx5emVUcmFpdChjbGF6eiwgdHJhaXQsIGZsYWdzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbWlncmF0ZWRUcmFpdHM7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhbGwgZGVjb3JhdG9ycyB0aGF0IGhhdmUgYmVlbiByZWNvZ25pemVkIGZvciB0aGUgcHJvdmlkZWQgY2xhc3MsIGluY2x1ZGluZyBhbnlcbiAgICogc3ludGhldGljYWxseSBpbmplY3RlZCBkZWNvcmF0b3JzLlxuICAgKiBAcGFyYW0gY2xhenogdGhlIGRlY2xhcmF0aW9uIGZvciB3aGljaCB0aGUgZGVjb3JhdG9ycyBhcmUgcmV0dXJuZWQuXG4gICAqL1xuICBnZXRBbGxEZWNvcmF0b3JzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogRGVjb3JhdG9yW118bnVsbCB7XG4gICAgY29uc3QgcmVjb3JkID0gdGhpcy5yZWNvcmRGb3IoY2xhenopO1xuICAgIGlmIChyZWNvcmQgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiByZWNvcmQudHJhaXRzLm1hcCh0cmFpdCA9PiB0cmFpdC5kZXRlY3RlZC5kZWNvcmF0b3IpLmZpbHRlcihpc0RlZmluZWQpO1xuICB9XG59XG5cbmNsYXNzIE5vSW5jcmVtZW50YWxCdWlsZCBpbXBsZW1lbnRzIEluY3JlbWVudGFsQnVpbGQ8YW55LCBhbnk+IHtcbiAgcHJpb3JXb3JrRm9yKHNmOiB0cy5Tb3VyY2VGaWxlKTogYW55W118bnVsbCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBwcmlvclR5cGVDaGVja2luZ1Jlc3VsdHNGb3IoKTogbnVsbCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cbiJdfQ==