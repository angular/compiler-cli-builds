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
        define("@angular/compiler-cli/src/ngtsc/tsc_plugin", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/core", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/typecheck/src/augmented_program"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NgTscPlugin = void 0;
    var tslib_1 = require("tslib");
    var core_1 = require("@angular/compiler-cli/src/ngtsc/core");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
    var augmented_program_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/augmented_program");
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
            this.options = tslib_1.__assign(tslib_1.__assign({}, this.ngOptions), options);
            this.host = core_1.NgCompilerHost.wrap(host, inputFiles, this.options, /* oldProgram */ null);
            return this.host;
        };
        NgTscPlugin.prototype.setupCompilation = function (program, oldProgram) {
            if (this.host === null || this.options === null) {
                throw new Error('Lifecycle error: setupCompilation() before wrapHost().');
            }
            var typeCheckStrategy = new augmented_program_1.ReusedProgramStrategy(program, this.host, this.options, this.host.shimExtensionPrefixes);
            this._compiler = new core_1.NgCompiler(this.host, this.options, program, typeCheckStrategy, oldProgram, perf_1.NOOP_PERF_RECORDER);
            return {
                ignoreForDiagnostics: this._compiler.ignoreForDiagnostics,
                ignoreForEmit: this._compiler.ignoreForEmit,
            };
        };
        NgTscPlugin.prototype.getDiagnostics = function (file) {
            return this.compiler.getDiagnostics(file);
        };
        NgTscPlugin.prototype.getOptionDiagnostics = function () {
            return this.compiler.getOptionDiagnostics();
        };
        NgTscPlugin.prototype.getNextProgram = function () {
            return this.compiler.getNextProgram();
        };
        NgTscPlugin.prototype.createTransformers = function () {
            return this.compiler.prepareEmit().transformers;
        };
        return NgTscPlugin;
    }());
    exports.NgTscPlugin = NgTscPlugin;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNjX3BsdWdpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHNjX3BsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBSUgsNkRBQWtEO0lBRWxELDJFQUE4RDtJQUM5RCw2REFBMEM7SUFDMUMscUdBQXdFO0lBMkN4RTs7T0FFRztJQUNIO1FBY0UscUJBQW9CLFNBQWE7WUFBYixjQUFTLEdBQVQsU0FBUyxDQUFJO1lBYmpDLFNBQUksR0FBRyxPQUFPLENBQUM7WUFFUCxZQUFPLEdBQTJCLElBQUksQ0FBQztZQUN2QyxTQUFJLEdBQXdCLElBQUksQ0FBQztZQUNqQyxjQUFTLEdBQW9CLElBQUksQ0FBQztZQVV4QywyQkFBYSxDQUFDLElBQUksOEJBQWdCLEVBQUUsQ0FBQyxDQUFDO1FBQ3hDLENBQUM7UUFURCxzQkFBSSxpQ0FBUTtpQkFBWjtnQkFDRSxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssSUFBSSxFQUFFO29CQUMzQixNQUFNLElBQUksS0FBSyxDQUFDLDJEQUEyRCxDQUFDLENBQUM7aUJBQzlFO2dCQUNELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUN4QixDQUFDOzs7V0FBQTtRQU1ELDhCQUFRLEdBQVIsVUFDSSxJQUF3QyxFQUFFLFVBQTZCLEVBQ3ZFLE9BQTJCO1lBQzdCLElBQUksQ0FBQyxPQUFPLEdBQUcsc0NBQUksSUFBSSxDQUFDLFNBQVMsR0FBSyxPQUFPLENBQXNCLENBQUM7WUFDcEUsSUFBSSxDQUFDLElBQUksR0FBRyxxQkFBYyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdkYsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ25CLENBQUM7UUFFRCxzQ0FBZ0IsR0FBaEIsVUFBaUIsT0FBbUIsRUFBRSxVQUF1QjtZQUkzRCxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssSUFBSSxFQUFFO2dCQUMvQyxNQUFNLElBQUksS0FBSyxDQUFDLHdEQUF3RCxDQUFDLENBQUM7YUFDM0U7WUFDRCxJQUFNLGlCQUFpQixHQUFHLElBQUkseUNBQXFCLENBQy9DLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQ3ZFLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxpQkFBVSxDQUMzQixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLFVBQVUsRUFBRSx5QkFBa0IsQ0FBQyxDQUFDO1lBQ3pGLE9BQU87Z0JBQ0wsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0I7Z0JBQ3pELGFBQWEsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWE7YUFDNUMsQ0FBQztRQUNKLENBQUM7UUFFRCxvQ0FBYyxHQUFkLFVBQWUsSUFBb0I7WUFDakMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBRUQsMENBQW9CLEdBQXBCO1lBQ0UsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDOUMsQ0FBQztRQUVELG9DQUFjLEdBQWQ7WUFDRSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDeEMsQ0FBQztRQUVELHdDQUFrQixHQUFsQjtZQUNFLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxZQUFZLENBQUM7UUFDbEQsQ0FBQztRQUNILGtCQUFDO0lBQUQsQ0FBQyxBQTFERCxJQTBEQztJQTFEWSxrQ0FBVyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtOZ0NvbXBpbGVyLCBOZ0NvbXBpbGVySG9zdH0gZnJvbSAnLi9jb3JlJztcbmltcG9ydCB7TmdDb21waWxlck9wdGlvbnMsIFVuaWZpZWRNb2R1bGVzSG9zdH0gZnJvbSAnLi9jb3JlL2FwaSc7XG5pbXBvcnQge05vZGVKU0ZpbGVTeXN0ZW0sIHNldEZpbGVTeXN0ZW19IGZyb20gJy4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtOT09QX1BFUkZfUkVDT1JERVJ9IGZyb20gJy4vcGVyZic7XG5pbXBvcnQge1JldXNlZFByb2dyYW1TdHJhdGVneX0gZnJvbSAnLi90eXBlY2hlY2svc3JjL2F1Z21lbnRlZF9wcm9ncmFtJztcblxuLy8gVGhlIGZvbGxvd2luZyBpcyBuZWVkZWQgdG8gZml4IGEgdGhlIGNoaWNrZW4tYW5kLWVnZyBpc3N1ZSB3aGVyZSB0aGUgc3luYyAoaW50byBnMykgc2NyaXB0IHdpbGxcbi8vIHJlZnVzZSB0byBhY2NlcHQgdGhpcyBmaWxlIHVubGVzcyB0aGUgZm9sbG93aW5nIHN0cmluZyBhcHBlYXJzOlxuLy8gaW1wb3J0ICogYXMgcGx1Z2luIGZyb20gJ0BiYXplbC90eXBlc2NyaXB0L2ludGVybmFsL3RzY193cmFwcGVkL3BsdWdpbl9hcGknO1xuXG4vKipcbiAqIEEgYHRzLkNvbXBpbGVySG9zdGAgd2hpY2ggYWxzbyByZXR1cm5zIGEgbGlzdCBvZiBpbnB1dCBmaWxlcywgb3V0IG9mIHdoaWNoIHRoZSBgdHMuUHJvZ3JhbWBcbiAqIHNob3VsZCBiZSBjcmVhdGVkLlxuICpcbiAqIEN1cnJlbnRseSBtaXJyb3JlZCBmcm9tIEBiYXplbC90eXBlc2NyaXB0L2ludGVybmFsL3RzY193cmFwcGVkL3BsdWdpbl9hcGkgKHdpdGggdGhlIG5hbWluZyBvZlxuICogYGZpbGVOYW1lVG9Nb2R1bGVOYW1lYCBjb3JyZWN0ZWQpLlxuICovXG5pbnRlcmZhY2UgUGx1Z2luQ29tcGlsZXJIb3N0IGV4dGVuZHMgdHMuQ29tcGlsZXJIb3N0LCBQYXJ0aWFsPFVuaWZpZWRNb2R1bGVzSG9zdD4ge1xuICByZWFkb25seSBpbnB1dEZpbGVzOiBSZWFkb25seUFycmF5PHN0cmluZz47XG59XG5cbi8qKlxuICogTWlycm9ycyB0aGUgcGx1Z2luIGludGVyZmFjZSBmcm9tIHRzY193cmFwcGVkIHdoaWNoIGlzIGN1cnJlbnRseSB1bmRlciBhY3RpdmUgZGV2ZWxvcG1lbnQuIFRvXG4gKiBlbmFibGUgcHJvZ3Jlc3MgdG8gYmUgbWFkZSBpbiBwYXJhbGxlbCwgdGhlIHVwc3RyZWFtIGludGVyZmFjZSBpc24ndCBpbXBsZW1lbnRlZCBkaXJlY3RseS5cbiAqIEluc3RlYWQsIGBUc2NQbHVnaW5gIGhlcmUgaXMgc3RydWN0dXJhbGx5IGFzc2lnbmFibGUgdG8gd2hhdCB0c2Nfd3JhcHBlZCBleHBlY3RzLlxuICovXG5pbnRlcmZhY2UgVHNjUGx1Z2luIHtcbiAgcmVhZG9ubHkgbmFtZTogc3RyaW5nO1xuXG4gIHdyYXBIb3N0KFxuICAgICAgaG9zdDogdHMuQ29tcGlsZXJIb3N0JlBhcnRpYWw8VW5pZmllZE1vZHVsZXNIb3N0PiwgaW5wdXRGaWxlczogUmVhZG9ubHlBcnJheTxzdHJpbmc+LFxuICAgICAgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKTogUGx1Z2luQ29tcGlsZXJIb3N0O1xuXG4gIHNldHVwQ29tcGlsYXRpb24ocHJvZ3JhbTogdHMuUHJvZ3JhbSwgb2xkUHJvZ3JhbT86IHRzLlByb2dyYW0pOiB7XG4gICAgaWdub3JlRm9yRGlhZ25vc3RpY3M6IFNldDx0cy5Tb3VyY2VGaWxlPixcbiAgICBpZ25vcmVGb3JFbWl0OiBTZXQ8dHMuU291cmNlRmlsZT4sXG4gIH07XG5cbiAgZ2V0RGlhZ25vc3RpY3MoZmlsZT86IHRzLlNvdXJjZUZpbGUpOiB0cy5EaWFnbm9zdGljW107XG5cbiAgZ2V0T3B0aW9uRGlhZ25vc3RpY3MoKTogdHMuRGlhZ25vc3RpY1tdO1xuXG4gIGdldE5leHRQcm9ncmFtKCk6IHRzLlByb2dyYW07XG5cbiAgY3JlYXRlVHJhbnNmb3JtZXJzKCk6IHRzLkN1c3RvbVRyYW5zZm9ybWVycztcbn1cblxuLyoqXG4gKiBBIHBsdWdpbiBmb3IgYHRzY193cmFwcGVkYCB3aGljaCBhbGxvd3MgQW5ndWxhciBjb21waWxhdGlvbiBmcm9tIGEgcGxhaW4gYHRzX2xpYnJhcnlgLlxuICovXG5leHBvcnQgY2xhc3MgTmdUc2NQbHVnaW4gaW1wbGVtZW50cyBUc2NQbHVnaW4ge1xuICBuYW1lID0gJ25ndHNjJztcblxuICBwcml2YXRlIG9wdGlvbnM6IE5nQ29tcGlsZXJPcHRpb25zfG51bGwgPSBudWxsO1xuICBwcml2YXRlIGhvc3Q6IE5nQ29tcGlsZXJIb3N0fG51bGwgPSBudWxsO1xuICBwcml2YXRlIF9jb21waWxlcjogTmdDb21waWxlcnxudWxsID0gbnVsbDtcblxuICBnZXQgY29tcGlsZXIoKTogTmdDb21waWxlciB7XG4gICAgaWYgKHRoaXMuX2NvbXBpbGVyID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xpZmVjeWNsZSBlcnJvcjogc2V0dXBDb21waWxhdGlvbigpIG11c3QgYmUgY2FsbGVkIGZpcnN0LicpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fY29tcGlsZXI7XG4gIH1cblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIG5nT3B0aW9uczoge30pIHtcbiAgICBzZXRGaWxlU3lzdGVtKG5ldyBOb2RlSlNGaWxlU3lzdGVtKCkpO1xuICB9XG5cbiAgd3JhcEhvc3QoXG4gICAgICBob3N0OiB0cy5Db21waWxlckhvc3QmVW5pZmllZE1vZHVsZXNIb3N0LCBpbnB1dEZpbGVzOiByZWFkb25seSBzdHJpbmdbXSxcbiAgICAgIG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucyk6IFBsdWdpbkNvbXBpbGVySG9zdCB7XG4gICAgdGhpcy5vcHRpb25zID0gey4uLnRoaXMubmdPcHRpb25zLCAuLi5vcHRpb25zfSBhcyBOZ0NvbXBpbGVyT3B0aW9ucztcbiAgICB0aGlzLmhvc3QgPSBOZ0NvbXBpbGVySG9zdC53cmFwKGhvc3QsIGlucHV0RmlsZXMsIHRoaXMub3B0aW9ucywgLyogb2xkUHJvZ3JhbSAqLyBudWxsKTtcbiAgICByZXR1cm4gdGhpcy5ob3N0O1xuICB9XG5cbiAgc2V0dXBDb21waWxhdGlvbihwcm9ncmFtOiB0cy5Qcm9ncmFtLCBvbGRQcm9ncmFtPzogdHMuUHJvZ3JhbSk6IHtcbiAgICBpZ25vcmVGb3JEaWFnbm9zdGljczogU2V0PHRzLlNvdXJjZUZpbGU+LFxuICAgIGlnbm9yZUZvckVtaXQ6IFNldDx0cy5Tb3VyY2VGaWxlPixcbiAgfSB7XG4gICAgaWYgKHRoaXMuaG9zdCA9PT0gbnVsbCB8fCB0aGlzLm9wdGlvbnMgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTGlmZWN5Y2xlIGVycm9yOiBzZXR1cENvbXBpbGF0aW9uKCkgYmVmb3JlIHdyYXBIb3N0KCkuJyk7XG4gICAgfVxuICAgIGNvbnN0IHR5cGVDaGVja1N0cmF0ZWd5ID0gbmV3IFJldXNlZFByb2dyYW1TdHJhdGVneShcbiAgICAgICAgcHJvZ3JhbSwgdGhpcy5ob3N0LCB0aGlzLm9wdGlvbnMsIHRoaXMuaG9zdC5zaGltRXh0ZW5zaW9uUHJlZml4ZXMpO1xuICAgIHRoaXMuX2NvbXBpbGVyID0gbmV3IE5nQ29tcGlsZXIoXG4gICAgICAgIHRoaXMuaG9zdCwgdGhpcy5vcHRpb25zLCBwcm9ncmFtLCB0eXBlQ2hlY2tTdHJhdGVneSwgb2xkUHJvZ3JhbSwgTk9PUF9QRVJGX1JFQ09SREVSKTtcbiAgICByZXR1cm4ge1xuICAgICAgaWdub3JlRm9yRGlhZ25vc3RpY3M6IHRoaXMuX2NvbXBpbGVyLmlnbm9yZUZvckRpYWdub3N0aWNzLFxuICAgICAgaWdub3JlRm9yRW1pdDogdGhpcy5fY29tcGlsZXIuaWdub3JlRm9yRW1pdCxcbiAgICB9O1xuICB9XG5cbiAgZ2V0RGlhZ25vc3RpY3MoZmlsZT86IHRzLlNvdXJjZUZpbGUpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLmdldERpYWdub3N0aWNzKGZpbGUpO1xuICB9XG5cbiAgZ2V0T3B0aW9uRGlhZ25vc3RpY3MoKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlci5nZXRPcHRpb25EaWFnbm9zdGljcygpO1xuICB9XG5cbiAgZ2V0TmV4dFByb2dyYW0oKTogdHMuUHJvZ3JhbSB7XG4gICAgcmV0dXJuIHRoaXMuY29tcGlsZXIuZ2V0TmV4dFByb2dyYW0oKTtcbiAgfVxuXG4gIGNyZWF0ZVRyYW5zZm9ybWVycygpOiB0cy5DdXN0b21UcmFuc2Zvcm1lcnMge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLnByZXBhcmVFbWl0KCkudHJhbnNmb3JtZXJzO1xuICB9XG59XG4iXX0=