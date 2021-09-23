/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
        define("@angular/compiler-cli/src/ngtsc/tsc_plugin", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/core", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/incremental", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/program_driver", "@angular/compiler-cli/src/ngtsc/shims", "@angular/compiler-cli/src/ngtsc/typecheck/api"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NgTscPlugin = void 0;
    var tslib_1 = require("tslib");
    var core_1 = require("@angular/compiler-cli/src/ngtsc/core");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var incremental_1 = require("@angular/compiler-cli/src/ngtsc/incremental");
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
    var program_driver_1 = require("@angular/compiler-cli/src/ngtsc/program_driver");
    var shims_1 = require("@angular/compiler-cli/src/ngtsc/shims");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/api");
    /**
     * A plugin for `tsc_wrapped` which allows Angular compilation from a plain `ts_library`.
     */
    var NgTscPlugin = /** @class */ (function () {
        function NgTscPlugin(ngOptions) {
            this.ngOptions = ngOptions;
            this.name = 'ngtsc';
            this.options = null;
            this.host = null;
            this._compiler = null;
            (0, file_system_1.setFileSystem)(new file_system_1.NodeJSFileSystem());
        }
        Object.defineProperty(NgTscPlugin.prototype, "compiler", {
            get: function () {
                if (this._compiler === null) {
                    throw new Error('Lifecycle error: setupCompilation() must be called first.');
                }
                return this._compiler;
            },
            enumerable: false,
            configurable: true
        });
        NgTscPlugin.prototype.wrapHost = function (host, inputFiles, options) {
            // TODO(alxhub): Eventually the `wrapHost()` API will accept the old `ts.Program` (if one is
            // available). When it does, its `ts.SourceFile`s need to be re-tagged to enable proper
            // incremental compilation.
            this.options = (0, tslib_1.__assign)((0, tslib_1.__assign)({}, this.ngOptions), options);
            this.host = core_1.NgCompilerHost.wrap(host, inputFiles, this.options, /* oldProgram */ null);
            return this.host;
        };
        NgTscPlugin.prototype.setupCompilation = function (program, oldProgram) {
            var e_1, _a;
            var _b;
            // TODO(alxhub): we provide a `PerfRecorder` to the compiler, but because we're not driving the
            // compilation, the information captured within it is incomplete, and may not include timings
            // for phases such as emit.
            //
            // Additionally, nothing actually captures the perf results here, so recording stats at all is
            // somewhat moot for now :)
            var perfRecorder = perf_1.ActivePerfRecorder.zeroedToNow();
            if (this.host === null || this.options === null) {
                throw new Error('Lifecycle error: setupCompilation() before wrapHost().');
            }
            this.host.postProgramCreationCleanup();
            (0, shims_1.untagAllTsFiles)(program);
            var programDriver = new program_driver_1.TsCreateProgramDriver(program, this.host, this.options, this.host.shimExtensionPrefixes);
            var strategy = new incremental_1.PatchedProgramIncrementalBuildStrategy();
            var oldState = oldProgram !== undefined ? strategy.getIncrementalState(oldProgram) : null;
            var ticket;
            var modifiedResourceFiles = new Set();
            if (this.host.getModifiedResourceFiles !== undefined) {
                try {
                    for (var _c = (0, tslib_1.__values)((_b = this.host.getModifiedResourceFiles()) !== null && _b !== void 0 ? _b : []), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var resourceFile = _d.value;
                        modifiedResourceFiles.add((0, file_system_1.resolve)(resourceFile));
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            if (oldProgram === undefined || oldState === null) {
                ticket = (0, core_1.freshCompilationTicket)(program, this.options, strategy, programDriver, perfRecorder, 
                /* enableTemplateTypeChecker */ false, /* usePoisonedData */ false);
            }
            else {
                strategy.toNextBuildStrategy().getIncrementalState(oldProgram);
                ticket = (0, core_1.incrementalFromStateTicket)(oldProgram, oldState, program, this.options, strategy, programDriver, modifiedResourceFiles, perfRecorder, false, false);
            }
            this._compiler = core_1.NgCompiler.fromTicket(ticket, this.host);
            return {
                ignoreForDiagnostics: this._compiler.ignoreForDiagnostics,
                ignoreForEmit: this._compiler.ignoreForEmit,
            };
        };
        NgTscPlugin.prototype.getDiagnostics = function (file) {
            if (file === undefined) {
                return this.compiler.getDiagnostics();
            }
            return this.compiler.getDiagnosticsForFile(file, api_1.OptimizeFor.WholeProgram);
        };
        NgTscPlugin.prototype.getOptionDiagnostics = function () {
            return this.compiler.getOptionDiagnostics();
        };
        NgTscPlugin.prototype.getNextProgram = function () {
            return this.compiler.getCurrentProgram();
        };
        NgTscPlugin.prototype.createTransformers = function () {
            // The plugin consumer doesn't know about our perf tracing system, so we consider the emit phase
            // as beginning now.
            this.compiler.perfRecorder.phase(perf_1.PerfPhase.TypeScriptEmit);
            return this.compiler.prepareEmit().transformers;
        };
        return NgTscPlugin;
    }());
    exports.NgTscPlugin = NgTscPlugin;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNjX3BsdWdpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHNjX3BsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBSUgsNkRBQXlIO0lBRXpILDJFQUF1RjtJQUN2RiwyRUFBcUU7SUFDckUsNkRBQXFEO0lBQ3JELGlGQUF1RDtJQUN2RCwrREFBd0M7SUFDeEMscUVBQTRDO0lBMkM1Qzs7T0FFRztJQUNIO1FBY0UscUJBQW9CLFNBQWE7WUFBYixjQUFTLEdBQVQsU0FBUyxDQUFJO1lBYmpDLFNBQUksR0FBRyxPQUFPLENBQUM7WUFFUCxZQUFPLEdBQTJCLElBQUksQ0FBQztZQUN2QyxTQUFJLEdBQXdCLElBQUksQ0FBQztZQUNqQyxjQUFTLEdBQW9CLElBQUksQ0FBQztZQVV4QyxJQUFBLDJCQUFhLEVBQUMsSUFBSSw4QkFBZ0IsRUFBRSxDQUFDLENBQUM7UUFDeEMsQ0FBQztRQVRELHNCQUFJLGlDQUFRO2lCQUFaO2dCQUNFLElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxJQUFJLEVBQUU7b0JBQzNCLE1BQU0sSUFBSSxLQUFLLENBQUMsMkRBQTJELENBQUMsQ0FBQztpQkFDOUU7Z0JBQ0QsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQ3hCLENBQUM7OztXQUFBO1FBTUQsOEJBQVEsR0FBUixVQUNJLElBQWlELEVBQUUsVUFBNkIsRUFDaEYsT0FBMkI7WUFDN0IsNEZBQTRGO1lBQzVGLHVGQUF1RjtZQUN2RiwyQkFBMkI7WUFDM0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxnREFBSSxJQUFJLENBQUMsU0FBUyxHQUFLLE9BQU8sQ0FBc0IsQ0FBQztZQUNwRSxJQUFJLENBQUMsSUFBSSxHQUFHLHFCQUFjLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLE9B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QUFRLENBQUMscUJBQXFCLENBQUMsSUFBSSxFQUFFLGlCQUFXLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDN0UsQ0FBQztRQUVELDBDQUFvQixHQUFwQjtZQUNFLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBQzlDLENBQUM7UUFFRCxvQ0FBYyxHQUFkO1lBQ0UsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDM0MsQ0FBQztRQUVELHdDQUFrQixHQUFsQjtZQUNFLGdHQUFnRztZQUNoRyxvQkFBb0I7WUFDcEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLGdCQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDM0QsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDLFlBQVksQ0FBQztRQUNsRCxDQUFDO1FBQ0gsa0JBQUM7SUFBRCxDQUFDLEFBaEdELElBZ0dDO0lBaEdZLGtDQUFXIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0NvbXBpbGF0aW9uVGlja2V0LCBmcmVzaENvbXBpbGF0aW9uVGlja2V0LCBpbmNyZW1lbnRhbEZyb21TdGF0ZVRpY2tldCwgTmdDb21waWxlciwgTmdDb21waWxlckhvc3R9IGZyb20gJy4vY29yZSc7XG5pbXBvcnQge05nQ29tcGlsZXJPcHRpb25zLCBVbmlmaWVkTW9kdWxlc0hvc3R9IGZyb20gJy4vY29yZS9hcGknO1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgTm9kZUpTRmlsZVN5c3RlbSwgcmVzb2x2ZSwgc2V0RmlsZVN5c3RlbX0gZnJvbSAnLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge1BhdGNoZWRQcm9ncmFtSW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5fSBmcm9tICcuL2luY3JlbWVudGFsJztcbmltcG9ydCB7QWN0aXZlUGVyZlJlY29yZGVyLCBQZXJmUGhhc2V9IGZyb20gJy4vcGVyZic7XG5pbXBvcnQge1RzQ3JlYXRlUHJvZ3JhbURyaXZlcn0gZnJvbSAnLi9wcm9ncmFtX2RyaXZlcic7XG5pbXBvcnQge3VudGFnQWxsVHNGaWxlc30gZnJvbSAnLi9zaGltcyc7XG5pbXBvcnQge09wdGltaXplRm9yfSBmcm9tICcuL3R5cGVjaGVjay9hcGknO1xuXG4vLyBUaGUgZm9sbG93aW5nIGlzIG5lZWRlZCB0byBmaXggYSB0aGUgY2hpY2tlbi1hbmQtZWdnIGlzc3VlIHdoZXJlIHRoZSBzeW5jIChpbnRvIGczKSBzY3JpcHQgd2lsbFxuLy8gcmVmdXNlIHRvIGFjY2VwdCB0aGlzIGZpbGUgdW5sZXNzIHRoZSBmb2xsb3dpbmcgc3RyaW5nIGFwcGVhcnM6XG4vLyBpbXBvcnQgKiBhcyBwbHVnaW4gZnJvbSAnQGJhemVsL3R5cGVzY3JpcHQvaW50ZXJuYWwvdHNjX3dyYXBwZWQvcGx1Z2luX2FwaSc7XG5cbi8qKlxuICogQSBgdHMuQ29tcGlsZXJIb3N0YCB3aGljaCBhbHNvIHJldHVybnMgYSBsaXN0IG9mIGlucHV0IGZpbGVzLCBvdXQgb2Ygd2hpY2ggdGhlIGB0cy5Qcm9ncmFtYFxuICogc2hvdWxkIGJlIGNyZWF0ZWQuXG4gKlxuICogQ3VycmVudGx5IG1pcnJvcmVkIGZyb20gQGJhemVsL3R5cGVzY3JpcHQvaW50ZXJuYWwvdHNjX3dyYXBwZWQvcGx1Z2luX2FwaSAod2l0aCB0aGUgbmFtaW5nIG9mXG4gKiBgZmlsZU5hbWVUb01vZHVsZU5hbWVgIGNvcnJlY3RlZCkuXG4gKi9cbmludGVyZmFjZSBQbHVnaW5Db21waWxlckhvc3QgZXh0ZW5kcyB0cy5Db21waWxlckhvc3QsIFBhcnRpYWw8VW5pZmllZE1vZHVsZXNIb3N0PiB7XG4gIHJlYWRvbmx5IGlucHV0RmlsZXM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPjtcbn1cblxuLyoqXG4gKiBNaXJyb3JzIHRoZSBwbHVnaW4gaW50ZXJmYWNlIGZyb20gdHNjX3dyYXBwZWQgd2hpY2ggaXMgY3VycmVudGx5IHVuZGVyIGFjdGl2ZSBkZXZlbG9wbWVudC4gVG9cbiAqIGVuYWJsZSBwcm9ncmVzcyB0byBiZSBtYWRlIGluIHBhcmFsbGVsLCB0aGUgdXBzdHJlYW0gaW50ZXJmYWNlIGlzbid0IGltcGxlbWVudGVkIGRpcmVjdGx5LlxuICogSW5zdGVhZCwgYFRzY1BsdWdpbmAgaGVyZSBpcyBzdHJ1Y3R1cmFsbHkgYXNzaWduYWJsZSB0byB3aGF0IHRzY193cmFwcGVkIGV4cGVjdHMuXG4gKi9cbmludGVyZmFjZSBUc2NQbHVnaW4ge1xuICByZWFkb25seSBuYW1lOiBzdHJpbmc7XG5cbiAgd3JhcEhvc3QoXG4gICAgICBob3N0OiB0cy5Db21waWxlckhvc3QmUGFydGlhbDxVbmlmaWVkTW9kdWxlc0hvc3Q+LCBpbnB1dEZpbGVzOiBSZWFkb25seUFycmF5PHN0cmluZz4sXG4gICAgICBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpOiBQbHVnaW5Db21waWxlckhvc3Q7XG5cbiAgc2V0dXBDb21waWxhdGlvbihwcm9ncmFtOiB0cy5Qcm9ncmFtLCBvbGRQcm9ncmFtPzogdHMuUHJvZ3JhbSk6IHtcbiAgICBpZ25vcmVGb3JEaWFnbm9zdGljczogU2V0PHRzLlNvdXJjZUZpbGU+LFxuICAgIGlnbm9yZUZvckVtaXQ6IFNldDx0cy5Tb3VyY2VGaWxlPixcbiAgfTtcblxuICBnZXREaWFnbm9zdGljcyhmaWxlPzogdHMuU291cmNlRmlsZSk6IHRzLkRpYWdub3N0aWNbXTtcblxuICBnZXRPcHRpb25EaWFnbm9zdGljcygpOiB0cy5EaWFnbm9zdGljW107XG5cbiAgZ2V0TmV4dFByb2dyYW0oKTogdHMuUHJvZ3JhbTtcblxuICBjcmVhdGVUcmFuc2Zvcm1lcnMoKTogdHMuQ3VzdG9tVHJhbnNmb3JtZXJzO1xufVxuXG4vKipcbiAqIEEgcGx1Z2luIGZvciBgdHNjX3dyYXBwZWRgIHdoaWNoIGFsbG93cyBBbmd1bGFyIGNvbXBpbGF0aW9uIGZyb20gYSBwbGFpbiBgdHNfbGlicmFyeWAuXG4gKi9cbmV4cG9ydCBjbGFzcyBOZ1RzY1BsdWdpbiBpbXBsZW1lbnRzIFRzY1BsdWdpbiB7XG4gIG5hbWUgPSAnbmd0c2MnO1xuXG4gIHByaXZhdGUgb3B0aW9uczogTmdDb21waWxlck9wdGlvbnN8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgaG9zdDogTmdDb21waWxlckhvc3R8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgX2NvbXBpbGVyOiBOZ0NvbXBpbGVyfG51bGwgPSBudWxsO1xuXG4gIGdldCBjb21waWxlcigpOiBOZ0NvbXBpbGVyIHtcbiAgICBpZiAodGhpcy5fY29tcGlsZXIgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTGlmZWN5Y2xlIGVycm9yOiBzZXR1cENvbXBpbGF0aW9uKCkgbXVzdCBiZSBjYWxsZWQgZmlyc3QuJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9jb21waWxlcjtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgbmdPcHRpb25zOiB7fSkge1xuICAgIHNldEZpbGVTeXN0ZW0obmV3IE5vZGVKU0ZpbGVTeXN0ZW0oKSk7XG4gIH1cblxuICB3cmFwSG9zdChcbiAgICAgIGhvc3Q6IHRzLkNvbXBpbGVySG9zdCZQYXJ0aWFsPFVuaWZpZWRNb2R1bGVzSG9zdD4sIGlucHV0RmlsZXM6IHJlYWRvbmx5IHN0cmluZ1tdLFxuICAgICAgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKTogUGx1Z2luQ29tcGlsZXJIb3N0IHtcbiAgICAvLyBUT0RPKGFseGh1Yik6IEV2ZW50dWFsbHkgdGhlIGB3cmFwSG9zdCgpYCBBUEkgd2lsbCBhY2NlcHQgdGhlIG9sZCBgdHMuUHJvZ3JhbWAgKGlmIG9uZSBpc1xuICAgIC8vIGF2YWlsYWJsZSkuIFdoZW4gaXQgZG9lcywgaXRzIGB0cy5Tb3VyY2VGaWxlYHMgbmVlZCB0byBiZSByZS10YWdnZWQgdG8gZW5hYmxlIHByb3BlclxuICAgIC8vIGluY3JlbWVudGFsIGNvbXBpbGF0aW9uLlxuICAgIHRoaXMub3B0aW9ucyA9IHsuLi50aGlzLm5nT3B0aW9ucywgLi4ub3B0aW9uc30gYXMgTmdDb21waWxlck9wdGlvbnM7XG4gICAgdGhpcy5ob3N0ID0gTmdDb21waWxlckhvc3Qud3JhcChob3N0LCBpbnB1dEZpbGVzLCB0aGlzLm9wdGlvbnMsIC8qIG9sZFByb2dyYW0gKi8gbnVsbCk7XG4gICAgcmV0dXJuIHRoaXMuaG9zdDtcbiAgfVxuXG4gIHNldHVwQ29tcGlsYXRpb24ocHJvZ3JhbTogdHMuUHJvZ3JhbSwgb2xkUHJvZ3JhbT86IHRzLlByb2dyYW0pOiB7XG4gICAgaWdub3JlRm9yRGlhZ25vc3RpY3M6IFNldDx0cy5Tb3VyY2VGaWxlPixcbiAgICBpZ25vcmVGb3JFbWl0OiBTZXQ8dHMuU291cmNlRmlsZT4sXG4gIH0ge1xuICAgIC8vIFRPRE8oYWx4aHViKTogd2UgcHJvdmlkZSBhIGBQZXJmUmVjb3JkZXJgIHRvIHRoZSBjb21waWxlciwgYnV0IGJlY2F1c2Ugd2UncmUgbm90IGRyaXZpbmcgdGhlXG4gICAgLy8gY29tcGlsYXRpb24sIHRoZSBpbmZvcm1hdGlvbiBjYXB0dXJlZCB3aXRoaW4gaXQgaXMgaW5jb21wbGV0ZSwgYW5kIG1heSBub3QgaW5jbHVkZSB0aW1pbmdzXG4gICAgLy8gZm9yIHBoYXNlcyBzdWNoIGFzIGVtaXQuXG4gICAgLy9cbiAgICAvLyBBZGRpdGlvbmFsbHksIG5vdGhpbmcgYWN0dWFsbHkgY2FwdHVyZXMgdGhlIHBlcmYgcmVzdWx0cyBoZXJlLCBzbyByZWNvcmRpbmcgc3RhdHMgYXQgYWxsIGlzXG4gICAgLy8gc29tZXdoYXQgbW9vdCBmb3Igbm93IDopXG4gICAgY29uc3QgcGVyZlJlY29yZGVyID0gQWN0aXZlUGVyZlJlY29yZGVyLnplcm9lZFRvTm93KCk7XG4gICAgaWYgKHRoaXMuaG9zdCA9PT0gbnVsbCB8fCB0aGlzLm9wdGlvbnMgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTGlmZWN5Y2xlIGVycm9yOiBzZXR1cENvbXBpbGF0aW9uKCkgYmVmb3JlIHdyYXBIb3N0KCkuJyk7XG4gICAgfVxuICAgIHRoaXMuaG9zdC5wb3N0UHJvZ3JhbUNyZWF0aW9uQ2xlYW51cCgpO1xuICAgIHVudGFnQWxsVHNGaWxlcyhwcm9ncmFtKTtcbiAgICBjb25zdCBwcm9ncmFtRHJpdmVyID0gbmV3IFRzQ3JlYXRlUHJvZ3JhbURyaXZlcihcbiAgICAgICAgcHJvZ3JhbSwgdGhpcy5ob3N0LCB0aGlzLm9wdGlvbnMsIHRoaXMuaG9zdC5zaGltRXh0ZW5zaW9uUHJlZml4ZXMpO1xuICAgIGNvbnN0IHN0cmF0ZWd5ID0gbmV3IFBhdGNoZWRQcm9ncmFtSW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5KCk7XG4gICAgY29uc3Qgb2xkU3RhdGUgPSBvbGRQcm9ncmFtICE9PSB1bmRlZmluZWQgPyBzdHJhdGVneS5nZXRJbmNyZW1lbnRhbFN0YXRlKG9sZFByb2dyYW0pIDogbnVsbDtcbiAgICBsZXQgdGlja2V0OiBDb21waWxhdGlvblRpY2tldDtcblxuICAgIGNvbnN0IG1vZGlmaWVkUmVzb3VyY2VGaWxlcyA9IG5ldyBTZXQ8QWJzb2x1dGVGc1BhdGg+KCk7XG4gICAgaWYgKHRoaXMuaG9zdC5nZXRNb2RpZmllZFJlc291cmNlRmlsZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZm9yIChjb25zdCByZXNvdXJjZUZpbGUgb2YgdGhpcy5ob3N0LmdldE1vZGlmaWVkUmVzb3VyY2VGaWxlcygpID8/IFtdKSB7XG4gICAgICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlcy5hZGQocmVzb2x2ZShyZXNvdXJjZUZpbGUpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAob2xkUHJvZ3JhbSA9PT0gdW5kZWZpbmVkIHx8IG9sZFN0YXRlID09PSBudWxsKSB7XG4gICAgICB0aWNrZXQgPSBmcmVzaENvbXBpbGF0aW9uVGlja2V0KFxuICAgICAgICAgIHByb2dyYW0sIHRoaXMub3B0aW9ucywgc3RyYXRlZ3ksIHByb2dyYW1Ecml2ZXIsIHBlcmZSZWNvcmRlcixcbiAgICAgICAgICAvKiBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyICovIGZhbHNlLCAvKiB1c2VQb2lzb25lZERhdGEgKi8gZmFsc2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHJhdGVneS50b05leHRCdWlsZFN0cmF0ZWd5KCkuZ2V0SW5jcmVtZW50YWxTdGF0ZShvbGRQcm9ncmFtKTtcbiAgICAgIHRpY2tldCA9IGluY3JlbWVudGFsRnJvbVN0YXRlVGlja2V0KFxuICAgICAgICAgIG9sZFByb2dyYW0sIG9sZFN0YXRlLCBwcm9ncmFtLCB0aGlzLm9wdGlvbnMsIHN0cmF0ZWd5LCBwcm9ncmFtRHJpdmVyLFxuICAgICAgICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlcywgcGVyZlJlY29yZGVyLCBmYWxzZSwgZmFsc2UpO1xuICAgIH1cbiAgICB0aGlzLl9jb21waWxlciA9IE5nQ29tcGlsZXIuZnJvbVRpY2tldCh0aWNrZXQsIHRoaXMuaG9zdCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlnbm9yZUZvckRpYWdub3N0aWNzOiB0aGlzLl9jb21waWxlci5pZ25vcmVGb3JEaWFnbm9zdGljcyxcbiAgICAgIGlnbm9yZUZvckVtaXQ6IHRoaXMuX2NvbXBpbGVyLmlnbm9yZUZvckVtaXQsXG4gICAgfTtcbiAgfVxuXG4gIGdldERpYWdub3N0aWNzKGZpbGU/OiB0cy5Tb3VyY2VGaWxlKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICBpZiAoZmlsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb21waWxlci5nZXREaWFnbm9zdGljcygpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5jb21waWxlci5nZXREaWFnbm9zdGljc0ZvckZpbGUoZmlsZSwgT3B0aW1pemVGb3IuV2hvbGVQcm9ncmFtKTtcbiAgfVxuXG4gIGdldE9wdGlvbkRpYWdub3N0aWNzKCk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgcmV0dXJuIHRoaXMuY29tcGlsZXIuZ2V0T3B0aW9uRGlhZ25vc3RpY3MoKTtcbiAgfVxuXG4gIGdldE5leHRQcm9ncmFtKCk6IHRzLlByb2dyYW0ge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLmdldEN1cnJlbnRQcm9ncmFtKCk7XG4gIH1cblxuICBjcmVhdGVUcmFuc2Zvcm1lcnMoKTogdHMuQ3VzdG9tVHJhbnNmb3JtZXJzIHtcbiAgICAvLyBUaGUgcGx1Z2luIGNvbnN1bWVyIGRvZXNuJ3Qga25vdyBhYm91dCBvdXIgcGVyZiB0cmFjaW5nIHN5c3RlbSwgc28gd2UgY29uc2lkZXIgdGhlIGVtaXQgcGhhc2VcbiAgICAvLyBhcyBiZWdpbm5pbmcgbm93LlxuICAgIHRoaXMuY29tcGlsZXIucGVyZlJlY29yZGVyLnBoYXNlKFBlcmZQaGFzZS5UeXBlU2NyaXB0RW1pdCk7XG4gICAgcmV0dXJuIHRoaXMuY29tcGlsZXIucHJlcGFyZUVtaXQoKS50cmFuc2Zvcm1lcnM7XG4gIH1cbn1cbiJdfQ==