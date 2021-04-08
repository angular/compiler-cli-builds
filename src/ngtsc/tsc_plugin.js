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
            file_system_1.setFileSystem(new file_system_1.NodeJSFileSystem());
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
            this.options = tslib_1.__assign(tslib_1.__assign({}, this.ngOptions), options);
            this.host = core_1.NgCompilerHost.wrap(host, inputFiles, this.options, /* oldProgram */ null);
            return this.host;
        };
        NgTscPlugin.prototype.setupCompilation = function (program, oldProgram) {
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
            shims_1.untagAllTsFiles(program);
            var programDriver = new program_driver_1.TsCreateProgramDriver(program, this.host, this.options, this.host.shimExtensionPrefixes);
            var strategy = new incremental_1.PatchedProgramIncrementalBuildStrategy();
            var oldDriver = oldProgram !== undefined ? strategy.getIncrementalDriver(oldProgram) : null;
            var ticket;
            var modifiedResourceFiles = undefined;
            if (this.host.getModifiedResourceFiles !== undefined) {
                modifiedResourceFiles = this.host.getModifiedResourceFiles();
            }
            if (modifiedResourceFiles === undefined) {
                modifiedResourceFiles = new Set();
            }
            if (oldProgram === undefined || oldDriver === null) {
                ticket = core_1.freshCompilationTicket(program, this.options, strategy, programDriver, perfRecorder, 
                /* enableTemplateTypeChecker */ false, /* usePoisonedData */ false);
            }
            else {
                strategy.toNextBuildStrategy().getIncrementalDriver(oldProgram);
                ticket = core_1.incrementalFromDriverTicket(oldProgram, oldDriver, program, this.options, strategy, programDriver, modifiedResourceFiles, perfRecorder, false, false);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNjX3BsdWdpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHNjX3BsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBSUgsNkRBQTBIO0lBRTFILDJFQUE4RDtJQUM5RCwyRUFBcUU7SUFDckUsNkRBQXFEO0lBQ3JELGlGQUF1RDtJQUN2RCwrREFBd0M7SUFDeEMscUVBQTRDO0lBMkM1Qzs7T0FFRztJQUNIO1FBY0UscUJBQW9CLFNBQWE7WUFBYixjQUFTLEdBQVQsU0FBUyxDQUFJO1lBYmpDLFNBQUksR0FBRyxPQUFPLENBQUM7WUFFUCxZQUFPLEdBQTJCLElBQUksQ0FBQztZQUN2QyxTQUFJLEdBQXdCLElBQUksQ0FBQztZQUNqQyxjQUFTLEdBQW9CLElBQUksQ0FBQztZQVV4QywyQkFBYSxDQUFDLElBQUksOEJBQWdCLEVBQUUsQ0FBQyxDQUFDO1FBQ3hDLENBQUM7UUFURCxzQkFBSSxpQ0FBUTtpQkFBWjtnQkFDRSxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssSUFBSSxFQUFFO29CQUMzQixNQUFNLElBQUksS0FBSyxDQUFDLDJEQUEyRCxDQUFDLENBQUM7aUJBQzlFO2dCQUNELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUN4QixDQUFDOzs7V0FBQTtRQU1ELDhCQUFRLEdBQVIsVUFDSSxJQUFpRCxFQUFFLFVBQTZCLEVBQ2hGLE9BQTJCO1lBQzdCLDRGQUE0RjtZQUM1Rix1RkFBdUY7WUFDdkYsMkJBQTJCO1lBQzNCLElBQUksQ0FBQyxPQUFPLEdBQUcsc0NBQUksSUFBSSxDQUFDLFNBQVMsR0FBSyxPQUFPLENBQXNCLENBQUM7WUFDcEUsSUFBSSxDQUFDLElBQUksR0FBRyxxQkFBYyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxPQUFPLEVB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LElBQUksQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUM5QyxDQUFDO1FBRUQsb0NBQWMsR0FBZDtZQUNFLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQzNDLENBQUM7UUFFRCx3Q0FBa0IsR0FBbEI7WUFDRSxnR0FBZ0c7WUFDaEcsb0JBQW9CO1lBQ3BCLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxnQkFBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQzNELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxZQUFZLENBQUM7UUFDbEQsQ0FBQztRQUNILGtCQUFDO0lBQUQsQ0FBQyxBQWpHRCxJQWlHQztJQWpHWSxrQ0FBVyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtDb21waWxhdGlvblRpY2tldCwgZnJlc2hDb21waWxhdGlvblRpY2tldCwgaW5jcmVtZW50YWxGcm9tRHJpdmVyVGlja2V0LCBOZ0NvbXBpbGVyLCBOZ0NvbXBpbGVySG9zdH0gZnJvbSAnLi9jb3JlJztcbmltcG9ydCB7TmdDb21waWxlck9wdGlvbnMsIFVuaWZpZWRNb2R1bGVzSG9zdH0gZnJvbSAnLi9jb3JlL2FwaSc7XG5pbXBvcnQge05vZGVKU0ZpbGVTeXN0ZW0sIHNldEZpbGVTeXN0ZW19IGZyb20gJy4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtQYXRjaGVkUHJvZ3JhbUluY3JlbWVudGFsQnVpbGRTdHJhdGVneX0gZnJvbSAnLi9pbmNyZW1lbnRhbCc7XG5pbXBvcnQge0FjdGl2ZVBlcmZSZWNvcmRlciwgUGVyZlBoYXNlfSBmcm9tICcuL3BlcmYnO1xuaW1wb3J0IHtUc0NyZWF0ZVByb2dyYW1Ecml2ZXJ9IGZyb20gJy4vcHJvZ3JhbV9kcml2ZXInO1xuaW1wb3J0IHt1bnRhZ0FsbFRzRmlsZXN9IGZyb20gJy4vc2hpbXMnO1xuaW1wb3J0IHtPcHRpbWl6ZUZvcn0gZnJvbSAnLi90eXBlY2hlY2svYXBpJztcblxuLy8gVGhlIGZvbGxvd2luZyBpcyBuZWVkZWQgdG8gZml4IGEgdGhlIGNoaWNrZW4tYW5kLWVnZyBpc3N1ZSB3aGVyZSB0aGUgc3luYyAoaW50byBnMykgc2NyaXB0IHdpbGxcbi8vIHJlZnVzZSB0byBhY2NlcHQgdGhpcyBmaWxlIHVubGVzcyB0aGUgZm9sbG93aW5nIHN0cmluZyBhcHBlYXJzOlxuLy8gaW1wb3J0ICogYXMgcGx1Z2luIGZyb20gJ0BiYXplbC90eXBlc2NyaXB0L2ludGVybmFsL3RzY193cmFwcGVkL3BsdWdpbl9hcGknO1xuXG4vKipcbiAqIEEgYHRzLkNvbXBpbGVySG9zdGAgd2hpY2ggYWxzbyByZXR1cm5zIGEgbGlzdCBvZiBpbnB1dCBmaWxlcywgb3V0IG9mIHdoaWNoIHRoZSBgdHMuUHJvZ3JhbWBcbiAqIHNob3VsZCBiZSBjcmVhdGVkLlxuICpcbiAqIEN1cnJlbnRseSBtaXJyb3JlZCBmcm9tIEBiYXplbC90eXBlc2NyaXB0L2ludGVybmFsL3RzY193cmFwcGVkL3BsdWdpbl9hcGkgKHdpdGggdGhlIG5hbWluZyBvZlxuICogYGZpbGVOYW1lVG9Nb2R1bGVOYW1lYCBjb3JyZWN0ZWQpLlxuICovXG5pbnRlcmZhY2UgUGx1Z2luQ29tcGlsZXJIb3N0IGV4dGVuZHMgdHMuQ29tcGlsZXJIb3N0LCBQYXJ0aWFsPFVuaWZpZWRNb2R1bGVzSG9zdD4ge1xuICByZWFkb25seSBpbnB1dEZpbGVzOiBSZWFkb25seUFycmF5PHN0cmluZz47XG59XG5cbi8qKlxuICogTWlycm9ycyB0aGUgcGx1Z2luIGludGVyZmFjZSBmcm9tIHRzY193cmFwcGVkIHdoaWNoIGlzIGN1cnJlbnRseSB1bmRlciBhY3RpdmUgZGV2ZWxvcG1lbnQuIFRvXG4gKiBlbmFibGUgcHJvZ3Jlc3MgdG8gYmUgbWFkZSBpbiBwYXJhbGxlbCwgdGhlIHVwc3RyZWFtIGludGVyZmFjZSBpc24ndCBpbXBsZW1lbnRlZCBkaXJlY3RseS5cbiAqIEluc3RlYWQsIGBUc2NQbHVnaW5gIGhlcmUgaXMgc3RydWN0dXJhbGx5IGFzc2lnbmFibGUgdG8gd2hhdCB0c2Nfd3JhcHBlZCBleHBlY3RzLlxuICovXG5pbnRlcmZhY2UgVHNjUGx1Z2luIHtcbiAgcmVhZG9ubHkgbmFtZTogc3RyaW5nO1xuXG4gIHdyYXBIb3N0KFxuICAgICAgaG9zdDogdHMuQ29tcGlsZXJIb3N0JlBhcnRpYWw8VW5pZmllZE1vZHVsZXNIb3N0PiwgaW5wdXRGaWxlczogUmVhZG9ubHlBcnJheTxzdHJpbmc+LFxuICAgICAgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKTogUGx1Z2luQ29tcGlsZXJIb3N0O1xuXG4gIHNldHVwQ29tcGlsYXRpb24ocHJvZ3JhbTogdHMuUHJvZ3JhbSwgb2xkUHJvZ3JhbT86IHRzLlByb2dyYW0pOiB7XG4gICAgaWdub3JlRm9yRGlhZ25vc3RpY3M6IFNldDx0cy5Tb3VyY2VGaWxlPixcbiAgICBpZ25vcmVGb3JFbWl0OiBTZXQ8dHMuU291cmNlRmlsZT4sXG4gIH07XG5cbiAgZ2V0RGlhZ25vc3RpY3MoZmlsZT86IHRzLlNvdXJjZUZpbGUpOiB0cy5EaWFnbm9zdGljW107XG5cbiAgZ2V0T3B0aW9uRGlhZ25vc3RpY3MoKTogdHMuRGlhZ25vc3RpY1tdO1xuXG4gIGdldE5leHRQcm9ncmFtKCk6IHRzLlByb2dyYW07XG5cbiAgY3JlYXRlVHJhbnNmb3JtZXJzKCk6IHRzLkN1c3RvbVRyYW5zZm9ybWVycztcbn1cblxuLyoqXG4gKiBBIHBsdWdpbiBmb3IgYHRzY193cmFwcGVkYCB3aGljaCBhbGxvd3MgQW5ndWxhciBjb21waWxhdGlvbiBmcm9tIGEgcGxhaW4gYHRzX2xpYnJhcnlgLlxuICovXG5leHBvcnQgY2xhc3MgTmdUc2NQbHVnaW4gaW1wbGVtZW50cyBUc2NQbHVnaW4ge1xuICBuYW1lID0gJ25ndHNjJztcblxuICBwcml2YXRlIG9wdGlvbnM6IE5nQ29tcGlsZXJPcHRpb25zfG51bGwgPSBudWxsO1xuICBwcml2YXRlIGhvc3Q6IE5nQ29tcGlsZXJIb3N0fG51bGwgPSBudWxsO1xuICBwcml2YXRlIF9jb21waWxlcjogTmdDb21waWxlcnxudWxsID0gbnVsbDtcblxuICBnZXQgY29tcGlsZXIoKTogTmdDb21waWxlciB7XG4gICAgaWYgKHRoaXMuX2NvbXBpbGVyID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xpZmVjeWNsZSBlcnJvcjogc2V0dXBDb21waWxhdGlvbigpIG11c3QgYmUgY2FsbGVkIGZpcnN0LicpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fY29tcGlsZXI7XG4gIH1cblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIG5nT3B0aW9uczoge30pIHtcbiAgICBzZXRGaWxlU3lzdGVtKG5ldyBOb2RlSlNGaWxlU3lzdGVtKCkpO1xuICB9XG5cbiAgd3JhcEhvc3QoXG4gICAgICBob3N0OiB0cy5Db21waWxlckhvc3QmUGFydGlhbDxVbmlmaWVkTW9kdWxlc0hvc3Q+LCBpbnB1dEZpbGVzOiByZWFkb25seSBzdHJpbmdbXSxcbiAgICAgIG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucyk6IFBsdWdpbkNvbXBpbGVySG9zdCB7XG4gICAgLy8gVE9ETyhhbHhodWIpOiBFdmVudHVhbGx5IHRoZSBgd3JhcEhvc3QoKWAgQVBJIHdpbGwgYWNjZXB0IHRoZSBvbGQgYHRzLlByb2dyYW1gIChpZiBvbmUgaXNcbiAgICAvLyBhdmFpbGFibGUpLiBXaGVuIGl0IGRvZXMsIGl0cyBgdHMuU291cmNlRmlsZWBzIG5lZWQgdG8gYmUgcmUtdGFnZ2VkIHRvIGVuYWJsZSBwcm9wZXJcbiAgICAvLyBpbmNyZW1lbnRhbCBjb21waWxhdGlvbi5cbiAgICB0aGlzLm9wdGlvbnMgPSB7Li4udGhpcy5uZ09wdGlvbnMsIC4uLm9wdGlvbnN9IGFzIE5nQ29tcGlsZXJPcHRpb25zO1xuICAgIHRoaXMuaG9zdCA9IE5nQ29tcGlsZXJIb3N0LndyYXAoaG9zdCwgaW5wdXRGaWxlcywgdGhpcy5vcHRpb25zLCAvKiBvbGRQcm9ncmFtICovIG51bGwpO1xuICAgIHJldHVybiB0aGlzLmhvc3Q7XG4gIH1cblxuICBzZXR1cENvbXBpbGF0aW9uKHByb2dyYW06IHRzLlByb2dyYW0sIG9sZFByb2dyYW0/OiB0cy5Qcm9ncmFtKToge1xuICAgIGlnbm9yZUZvckRpYWdub3N0aWNzOiBTZXQ8dHMuU291cmNlRmlsZT4sXG4gICAgaWdub3JlRm9yRW1pdDogU2V0PHRzLlNvdXJjZUZpbGU+LFxuICB9IHtcbiAgICAvLyBUT0RPKGFseGh1Yik6IHdlIHByb3ZpZGUgYSBgUGVyZlJlY29yZGVyYCB0byB0aGUgY29tcGlsZXIsIGJ1dCBiZWNhdXNlIHdlJ3JlIG5vdCBkcml2aW5nIHRoZVxuICAgIC8vIGNvbXBpbGF0aW9uLCB0aGUgaW5mb3JtYXRpb24gY2FwdHVyZWQgd2l0aGluIGl0IGlzIGluY29tcGxldGUsIGFuZCBtYXkgbm90IGluY2x1ZGUgdGltaW5nc1xuICAgIC8vIGZvciBwaGFzZXMgc3VjaCBhcyBlbWl0LlxuICAgIC8vXG4gICAgLy8gQWRkaXRpb25hbGx5LCBub3RoaW5nIGFjdHVhbGx5IGNhcHR1cmVzIHRoZSBwZXJmIHJlc3VsdHMgaGVyZSwgc28gcmVjb3JkaW5nIHN0YXRzIGF0IGFsbCBpc1xuICAgIC8vIHNvbWV3aGF0IG1vb3QgZm9yIG5vdyA6KVxuICAgIGNvbnN0IHBlcmZSZWNvcmRlciA9IEFjdGl2ZVBlcmZSZWNvcmRlci56ZXJvZWRUb05vdygpO1xuICAgIGlmICh0aGlzLmhvc3QgPT09IG51bGwgfHwgdGhpcy5vcHRpb25zID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xpZmVjeWNsZSBlcnJvcjogc2V0dXBDb21waWxhdGlvbigpIGJlZm9yZSB3cmFwSG9zdCgpLicpO1xuICAgIH1cbiAgICB0aGlzLmhvc3QucG9zdFByb2dyYW1DcmVhdGlvbkNsZWFudXAoKTtcbiAgICB1bnRhZ0FsbFRzRmlsZXMocHJvZ3JhbSk7XG4gICAgY29uc3QgcHJvZ3JhbURyaXZlciA9IG5ldyBUc0NyZWF0ZVByb2dyYW1Ecml2ZXIoXG4gICAgICAgIHByb2dyYW0sIHRoaXMuaG9zdCwgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3Quc2hpbUV4dGVuc2lvblByZWZpeGVzKTtcbiAgICBjb25zdCBzdHJhdGVneSA9IG5ldyBQYXRjaGVkUHJvZ3JhbUluY3JlbWVudGFsQnVpbGRTdHJhdGVneSgpO1xuICAgIGNvbnN0IG9sZERyaXZlciA9IG9sZFByb2dyYW0gIT09IHVuZGVmaW5lZCA/IHN0cmF0ZWd5LmdldEluY3JlbWVudGFsRHJpdmVyKG9sZFByb2dyYW0pIDogbnVsbDtcbiAgICBsZXQgdGlja2V0OiBDb21waWxhdGlvblRpY2tldDtcblxuICAgIGxldCBtb2RpZmllZFJlc291cmNlRmlsZXM6IFNldDxzdHJpbmc+fHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAodGhpcy5ob3N0LmdldE1vZGlmaWVkUmVzb3VyY2VGaWxlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBtb2RpZmllZFJlc291cmNlRmlsZXMgPSB0aGlzLmhvc3QuZ2V0TW9kaWZpZWRSZXNvdXJjZUZpbGVzKCk7XG4gICAgfVxuICAgIGlmIChtb2RpZmllZFJlc291cmNlRmlsZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgbW9kaWZpZWRSZXNvdXJjZUZpbGVzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgfVxuXG4gICAgaWYgKG9sZFByb2dyYW0gPT09IHVuZGVmaW5lZCB8fCBvbGREcml2ZXIgPT09IG51bGwpIHtcbiAgICAgIHRpY2tldCA9IGZyZXNoQ29tcGlsYXRpb25UaWNrZXQoXG4gICAgICAgICAgcHJvZ3JhbSwgdGhpcy5vcHRpb25zLCBzdHJhdGVneSwgcHJvZ3JhbURyaXZlciwgcGVyZlJlY29yZGVyLFxuICAgICAgICAgIC8qIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIgKi8gZmFsc2UsIC8qIHVzZVBvaXNvbmVkRGF0YSAqLyBmYWxzZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0cmF0ZWd5LnRvTmV4dEJ1aWxkU3RyYXRlZ3koKS5nZXRJbmNyZW1lbnRhbERyaXZlcihvbGRQcm9ncmFtKTtcbiAgICAgIHRpY2tldCA9IGluY3JlbWVudGFsRnJvbURyaXZlclRpY2tldChcbiAgICAgICAgICBvbGRQcm9ncmFtLCBvbGREcml2ZXIsIHByb2dyYW0sIHRoaXMub3B0aW9ucywgc3RyYXRlZ3ksIHByb2dyYW1Ecml2ZXIsXG4gICAgICAgICAgbW9kaWZpZWRSZXNvdXJjZUZpbGVzLCBwZXJmUmVjb3JkZXIsIGZhbHNlLCBmYWxzZSk7XG4gICAgfVxuICAgIHRoaXMuX2NvbXBpbGVyID0gTmdDb21waWxlci5mcm9tVGlja2V0KHRpY2tldCwgdGhpcy5ob3N0KTtcbiAgICByZXR1cm4ge1xuICAgICAgaWdub3JlRm9yRGlhZ25vc3RpY3M6IHRoaXMuX2NvbXBpbGVyLmlnbm9yZUZvckRpYWdub3N0aWNzLFxuICAgICAgaWdub3JlRm9yRW1pdDogdGhpcy5fY29tcGlsZXIuaWdub3JlRm9yRW1pdCxcbiAgICB9O1xuICB9XG5cbiAgZ2V0RGlhZ25vc3RpY3MoZmlsZT86IHRzLlNvdXJjZUZpbGUpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIGlmIChmaWxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLmdldERpYWdub3N0aWNzKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLmdldERpYWdub3N0aWNzRm9yRmlsZShmaWxlLCBPcHRpbWl6ZUZvci5XaG9sZVByb2dyYW0pO1xuICB9XG5cbiAgZ2V0T3B0aW9uRGlhZ25vc3RpY3MoKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlci5nZXRPcHRpb25EaWFnbm9zdGljcygpO1xuICB9XG5cbiAgZ2V0TmV4dFByb2dyYW0oKTogdHMuUHJvZ3JhbSB7XG4gICAgcmV0dXJuIHRoaXMuY29tcGlsZXIuZ2V0Q3VycmVudFByb2dyYW0oKTtcbiAgfVxuXG4gIGNyZWF0ZVRyYW5zZm9ybWVycygpOiB0cy5DdXN0b21UcmFuc2Zvcm1lcnMge1xuICAgIC8vIFRoZSBwbHVnaW4gY29uc3VtZXIgZG9lc24ndCBrbm93IGFib3V0IG91ciBwZXJmIHRyYWNpbmcgc3lzdGVtLCBzbyB3ZSBjb25zaWRlciB0aGUgZW1pdCBwaGFzZVxuICAgIC8vIGFzIGJlZ2lubmluZyBub3cuXG4gICAgdGhpcy5jb21waWxlci5wZXJmUmVjb3JkZXIucGhhc2UoUGVyZlBoYXNlLlR5cGVTY3JpcHRFbWl0KTtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlci5wcmVwYXJlRW1pdCgpLnRyYW5zZm9ybWVycztcbiAgfVxufVxuIl19