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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNjX3BsdWdpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHNjX3BsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBSUgsNkRBQWtEO0lBRWxELDJFQUE4RDtJQUM5RCw2REFBMEM7SUFDMUMscUdBQXdFO0lBMkN4RTs7T0FFRztJQUNIO1FBY0UscUJBQW9CLFNBQWE7WUFBYixjQUFTLEdBQVQsU0FBUyxDQUFJO1lBYmpDLFNBQUksR0FBRyxPQUFPLENBQUM7WUFFUCxZQUFPLEdBQTJCLElBQUksQ0FBQztZQUN2QyxTQUFJLEdBQXdCLElBQUksQ0FBQztZQUNqQyxjQUFTLEdBQW9CLElBQUksQ0FBQztZQVV4QywyQkFBYSxDQUFDLElBQUksOEJBQWdCLEVBQUUsQ0FBQyxDQUFDO1FBQ3hDLENBQUM7UUFURCxzQkFBSSxpQ0FBUTtpQkFBWjtnQkFDRSxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssSUFBSSxFQUFFO29CQUMzQixNQUFNLElBQUksS0FBSyxDQUFDLDJEQUEyRCxDQUFDLENBQUM7aUJBQzlFO2dCQUNELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUN4QixDQUFDOzs7V0FBQTtRQU1ELDhCQUFRLEdBQVIsVUFDSSxJQUF3QyxFQUFFLFVBQTZCLEVBQ3ZFLE9BQTJCO1lBQzdCLElBQUksQ0FBQyxPQUFPLEdBQUcsc0NBQUksSUFBSSxDQUFDLFNBQVMsR0FBSyxPQUFPLENBQXNCLENBQUM7WUFDcEUsSUFBSSxDQUFDLElBQUksR0FBRyxxQkFBYyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdkYsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ25CLENBQUM7UUFFRCxzQ0FBZ0IsR0FBaEIsVUFBaUIsT0FBbUIsRUFBRSxVQUF1QjtZQUkzRCxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssSUFBSSxFQUFFO2dCQUMvQyxNQUFNLElBQUksS0FBSyxDQUFDLHdEQUF3RCxDQUFDLENBQUM7YUFDM0U7WUFDRCxJQUFNLGlCQUFpQixHQUFHLElBQUkseUNBQXFCLENBQy9DLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQ3ZFLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxpQkFBVSxDQUMzQixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLFVBQVUsRUFBRSx5QkFBa0IsQ0FBQyxDQUFDO1lBQ3pGLE9BQU87Z0JBQ0wsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0I7Z0JBQ3pELGFBQWEsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWE7YUFDNUMsQ0FBQztRQUNKLENBQUM7UUFFRCxvQ0FBYyxHQUFkLFVBQWUsSUFBb0I7WUFDakMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBRUQsMENBQW9CLEdBQXBCO1lBQ0UsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDOUMsQ0FBQztRQUVELG9DQUFjLEdBQWQ7WUFDRSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDeEMsQ0FBQztRQUVELHdDQUFrQixHQUFsQjtZQUNFLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxZQUFZLENBQUM7UUFDbEQsQ0FBQztRQUNILGtCQUFDO0lBQUQsQ0FBQyxBQTFERCxJQTBEQztJQTFEWSxrQ0FBVyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7TmdDb21waWxlciwgTmdDb21waWxlckhvc3R9IGZyb20gJy4vY29yZSc7XG5pbXBvcnQge05nQ29tcGlsZXJPcHRpb25zLCBVbmlmaWVkTW9kdWxlc0hvc3R9IGZyb20gJy4vY29yZS9hcGknO1xuaW1wb3J0IHtOb2RlSlNGaWxlU3lzdGVtLCBzZXRGaWxlU3lzdGVtfSBmcm9tICcuL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7Tk9PUF9QRVJGX1JFQ09SREVSfSBmcm9tICcuL3BlcmYnO1xuaW1wb3J0IHtSZXVzZWRQcm9ncmFtU3RyYXRlZ3l9IGZyb20gJy4vdHlwZWNoZWNrL3NyYy9hdWdtZW50ZWRfcHJvZ3JhbSc7XG5cbi8vIFRoZSBmb2xsb3dpbmcgaXMgbmVlZGVkIHRvIGZpeCBhIHRoZSBjaGlja2VuLWFuZC1lZ2cgaXNzdWUgd2hlcmUgdGhlIHN5bmMgKGludG8gZzMpIHNjcmlwdCB3aWxsXG4vLyByZWZ1c2UgdG8gYWNjZXB0IHRoaXMgZmlsZSB1bmxlc3MgdGhlIGZvbGxvd2luZyBzdHJpbmcgYXBwZWFyczpcbi8vIGltcG9ydCAqIGFzIHBsdWdpbiBmcm9tICdAYmF6ZWwvdHlwZXNjcmlwdC9pbnRlcm5hbC90c2Nfd3JhcHBlZC9wbHVnaW5fYXBpJztcblxuLyoqXG4gKiBBIGB0cy5Db21waWxlckhvc3RgIHdoaWNoIGFsc28gcmV0dXJucyBhIGxpc3Qgb2YgaW5wdXQgZmlsZXMsIG91dCBvZiB3aGljaCB0aGUgYHRzLlByb2dyYW1gXG4gKiBzaG91bGQgYmUgY3JlYXRlZC5cbiAqXG4gKiBDdXJyZW50bHkgbWlycm9yZWQgZnJvbSBAYmF6ZWwvdHlwZXNjcmlwdC9pbnRlcm5hbC90c2Nfd3JhcHBlZC9wbHVnaW5fYXBpICh3aXRoIHRoZSBuYW1pbmcgb2ZcbiAqIGBmaWxlTmFtZVRvTW9kdWxlTmFtZWAgY29ycmVjdGVkKS5cbiAqL1xuaW50ZXJmYWNlIFBsdWdpbkNvbXBpbGVySG9zdCBleHRlbmRzIHRzLkNvbXBpbGVySG9zdCwgUGFydGlhbDxVbmlmaWVkTW9kdWxlc0hvc3Q+IHtcbiAgcmVhZG9ubHkgaW5wdXRGaWxlczogUmVhZG9ubHlBcnJheTxzdHJpbmc+O1xufVxuXG4vKipcbiAqIE1pcnJvcnMgdGhlIHBsdWdpbiBpbnRlcmZhY2UgZnJvbSB0c2Nfd3JhcHBlZCB3aGljaCBpcyBjdXJyZW50bHkgdW5kZXIgYWN0aXZlIGRldmVsb3BtZW50LiBUb1xuICogZW5hYmxlIHByb2dyZXNzIHRvIGJlIG1hZGUgaW4gcGFyYWxsZWwsIHRoZSB1cHN0cmVhbSBpbnRlcmZhY2UgaXNuJ3QgaW1wbGVtZW50ZWQgZGlyZWN0bHkuXG4gKiBJbnN0ZWFkLCBgVHNjUGx1Z2luYCBoZXJlIGlzIHN0cnVjdHVyYWxseSBhc3NpZ25hYmxlIHRvIHdoYXQgdHNjX3dyYXBwZWQgZXhwZWN0cy5cbiAqL1xuaW50ZXJmYWNlIFRzY1BsdWdpbiB7XG4gIHJlYWRvbmx5IG5hbWU6IHN0cmluZztcblxuICB3cmFwSG9zdChcbiAgICAgIGhvc3Q6IHRzLkNvbXBpbGVySG9zdCZQYXJ0aWFsPFVuaWZpZWRNb2R1bGVzSG9zdD4sIGlucHV0RmlsZXM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPixcbiAgICAgIG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucyk6IFBsdWdpbkNvbXBpbGVySG9zdDtcblxuICBzZXR1cENvbXBpbGF0aW9uKHByb2dyYW06IHRzLlByb2dyYW0sIG9sZFByb2dyYW0/OiB0cy5Qcm9ncmFtKToge1xuICAgIGlnbm9yZUZvckRpYWdub3N0aWNzOiBTZXQ8dHMuU291cmNlRmlsZT4sXG4gICAgaWdub3JlRm9yRW1pdDogU2V0PHRzLlNvdXJjZUZpbGU+LFxuICB9O1xuXG4gIGdldERpYWdub3N0aWNzKGZpbGU/OiB0cy5Tb3VyY2VGaWxlKTogdHMuRGlhZ25vc3RpY1tdO1xuXG4gIGdldE9wdGlvbkRpYWdub3N0aWNzKCk6IHRzLkRpYWdub3N0aWNbXTtcblxuICBnZXROZXh0UHJvZ3JhbSgpOiB0cy5Qcm9ncmFtO1xuXG4gIGNyZWF0ZVRyYW5zZm9ybWVycygpOiB0cy5DdXN0b21UcmFuc2Zvcm1lcnM7XG59XG5cbi8qKlxuICogQSBwbHVnaW4gZm9yIGB0c2Nfd3JhcHBlZGAgd2hpY2ggYWxsb3dzIEFuZ3VsYXIgY29tcGlsYXRpb24gZnJvbSBhIHBsYWluIGB0c19saWJyYXJ5YC5cbiAqL1xuZXhwb3J0IGNsYXNzIE5nVHNjUGx1Z2luIGltcGxlbWVudHMgVHNjUGx1Z2luIHtcbiAgbmFtZSA9ICduZ3RzYyc7XG5cbiAgcHJpdmF0ZSBvcHRpb25zOiBOZ0NvbXBpbGVyT3B0aW9uc3xudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBob3N0OiBOZ0NvbXBpbGVySG9zdHxudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBfY29tcGlsZXI6IE5nQ29tcGlsZXJ8bnVsbCA9IG51bGw7XG5cbiAgZ2V0IGNvbXBpbGVyKCk6IE5nQ29tcGlsZXIge1xuICAgIGlmICh0aGlzLl9jb21waWxlciA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdMaWZlY3ljbGUgZXJyb3I6IHNldHVwQ29tcGlsYXRpb24oKSBtdXN0IGJlIGNhbGxlZCBmaXJzdC4nKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2NvbXBpbGVyO1xuICB9XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBuZ09wdGlvbnM6IHt9KSB7XG4gICAgc2V0RmlsZVN5c3RlbShuZXcgTm9kZUpTRmlsZVN5c3RlbSgpKTtcbiAgfVxuXG4gIHdyYXBIb3N0KFxuICAgICAgaG9zdDogdHMuQ29tcGlsZXJIb3N0JlVuaWZpZWRNb2R1bGVzSG9zdCwgaW5wdXRGaWxlczogcmVhZG9ubHkgc3RyaW5nW10sXG4gICAgICBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpOiBQbHVnaW5Db21waWxlckhvc3Qge1xuICAgIHRoaXMub3B0aW9ucyA9IHsuLi50aGlzLm5nT3B0aW9ucywgLi4ub3B0aW9uc30gYXMgTmdDb21waWxlck9wdGlvbnM7XG4gICAgdGhpcy5ob3N0ID0gTmdDb21waWxlckhvc3Qud3JhcChob3N0LCBpbnB1dEZpbGVzLCB0aGlzLm9wdGlvbnMsIC8qIG9sZFByb2dyYW0gKi8gbnVsbCk7XG4gICAgcmV0dXJuIHRoaXMuaG9zdDtcbiAgfVxuXG4gIHNldHVwQ29tcGlsYXRpb24ocHJvZ3JhbTogdHMuUHJvZ3JhbSwgb2xkUHJvZ3JhbT86IHRzLlByb2dyYW0pOiB7XG4gICAgaWdub3JlRm9yRGlhZ25vc3RpY3M6IFNldDx0cy5Tb3VyY2VGaWxlPixcbiAgICBpZ25vcmVGb3JFbWl0OiBTZXQ8dHMuU291cmNlRmlsZT4sXG4gIH0ge1xuICAgIGlmICh0aGlzLmhvc3QgPT09IG51bGwgfHwgdGhpcy5vcHRpb25zID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xpZmVjeWNsZSBlcnJvcjogc2V0dXBDb21waWxhdGlvbigpIGJlZm9yZSB3cmFwSG9zdCgpLicpO1xuICAgIH1cbiAgICBjb25zdCB0eXBlQ2hlY2tTdHJhdGVneSA9IG5ldyBSZXVzZWRQcm9ncmFtU3RyYXRlZ3koXG4gICAgICAgIHByb2dyYW0sIHRoaXMuaG9zdCwgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3Quc2hpbUV4dGVuc2lvblByZWZpeGVzKTtcbiAgICB0aGlzLl9jb21waWxlciA9IG5ldyBOZ0NvbXBpbGVyKFxuICAgICAgICB0aGlzLmhvc3QsIHRoaXMub3B0aW9ucywgcHJvZ3JhbSwgdHlwZUNoZWNrU3RyYXRlZ3ksIG9sZFByb2dyYW0sIE5PT1BfUEVSRl9SRUNPUkRFUik7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlnbm9yZUZvckRpYWdub3N0aWNzOiB0aGlzLl9jb21waWxlci5pZ25vcmVGb3JEaWFnbm9zdGljcyxcbiAgICAgIGlnbm9yZUZvckVtaXQ6IHRoaXMuX2NvbXBpbGVyLmlnbm9yZUZvckVtaXQsXG4gICAgfTtcbiAgfVxuXG4gIGdldERpYWdub3N0aWNzKGZpbGU/OiB0cy5Tb3VyY2VGaWxlKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlci5nZXREaWFnbm9zdGljcyhmaWxlKTtcbiAgfVxuXG4gIGdldE9wdGlvbkRpYWdub3N0aWNzKCk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgcmV0dXJuIHRoaXMuY29tcGlsZXIuZ2V0T3B0aW9uRGlhZ25vc3RpY3MoKTtcbiAgfVxuXG4gIGdldE5leHRQcm9ncmFtKCk6IHRzLlByb2dyYW0ge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLmdldE5leHRQcm9ncmFtKCk7XG4gIH1cblxuICBjcmVhdGVUcmFuc2Zvcm1lcnMoKTogdHMuQ3VzdG9tVHJhbnNmb3JtZXJzIHtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlci5wcmVwYXJlRW1pdCgpLnRyYW5zZm9ybWVycztcbiAgfVxufVxuIl19