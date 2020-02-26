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
        define("@angular/compiler-cli/src/ngtsc/tsc_plugin", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/core", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/perf"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var core_1 = require("@angular/compiler-cli/src/ngtsc/core");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
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
            enumerable: true,
            configurable: true
        });
        NgTscPlugin.prototype.wrapHost = function (host, inputFiles, options) {
            this.options = tslib_1.__assign(tslib_1.__assign({}, this.ngOptions), options);
            this.host = core_1.NgCompilerHost.wrap(host, inputFiles, this.options);
            return this.host;
        };
        NgTscPlugin.prototype.setupCompilation = function (program, oldProgram) {
            if (this.host === null || this.options === null) {
                throw new Error('Lifecycle error: setupCompilation() before wrapHost().');
            }
            this._compiler =
                new core_1.NgCompiler(this.host, this.options, program, oldProgram, perf_1.NOOP_PERF_RECORDER);
            return {
                ignoreForDiagnostics: this._compiler.ignoreForDiagnostics,
                ignoreForEmit: this._compiler.ignoreForEmit,
            };
        };
        NgTscPlugin.prototype.getDiagnostics = function (file) {
            return this.compiler.getDiagnostics(file);
        };
        NgTscPlugin.prototype.getOptionDiagnostics = function () { return this.compiler.getOptionDiagnostics(); };
        NgTscPlugin.prototype.getNextProgram = function () { return this.compiler.getNextProgram(); };
        NgTscPlugin.prototype.createTransformers = function () { return this.compiler.prepareEmit().transformers; };
        return NgTscPlugin;
    }());
    exports.NgTscPlugin = NgTscPlugin;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNjX3BsdWdpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHNjX3BsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFJSCw2REFBa0Q7SUFFbEQsMkVBQThEO0lBQzlELDZEQUEwQztJQTJDMUM7O09BRUc7SUFDSDtRQWNFLHFCQUFvQixTQUFhO1lBQWIsY0FBUyxHQUFULFNBQVMsQ0FBSTtZQWJqQyxTQUFJLEdBQUcsT0FBTyxDQUFDO1lBRVAsWUFBTyxHQUEyQixJQUFJLENBQUM7WUFDdkMsU0FBSSxHQUF3QixJQUFJLENBQUM7WUFDakMsY0FBUyxHQUFvQixJQUFJLENBQUM7WUFTTCwyQkFBYSxDQUFDLElBQUksOEJBQWdCLEVBQUUsQ0FBQyxDQUFDO1FBQUMsQ0FBQztRQVA3RSxzQkFBSSxpQ0FBUTtpQkFBWjtnQkFDRSxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssSUFBSSxFQUFFO29CQUMzQixNQUFNLElBQUksS0FBSyxDQUFDLDJEQUEyRCxDQUFDLENBQUM7aUJBQzlFO2dCQUNELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUN4QixDQUFDOzs7V0FBQTtRQUlELDhCQUFRLEdBQVIsVUFDSSxJQUF3QyxFQUFFLFVBQTZCLEVBQ3ZFLE9BQTJCO1lBQzdCLElBQUksQ0FBQyxPQUFPLEdBQUcsc0NBQUksSUFBSSxDQUFDLFNBQVMsR0FBSyxPQUFPLENBQXVCLENBQUM7WUFDckUsSUFBSSxDQUFDLElBQUksR0FBRyxxQkFBYyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNoRSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDbkIsQ0FBQztRQUVELHNDQUFnQixHQUFoQixVQUFpQixPQUFtQixFQUFFLFVBQXVCO1lBSTNELElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxJQUFJLEVBQUU7Z0JBQy9DLE1BQU0sSUFBSSxLQUFLLENBQUMsd0RBQXdELENBQUMsQ0FBQzthQUMzRTtZQUNELElBQUksQ0FBQyxTQUFTO2dCQUNWLElBQUksaUJBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSx5QkFBa0IsQ0FBQyxDQUFDO1lBQ3JGLE9BQU87Z0JBQ0wsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0I7Z0JBQ3pELGFBQWEsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWE7YUFDNUMsQ0FBQztRQUNKLENBQUM7UUFFRCxvQ0FBYyxHQUFkLFVBQWUsSUFBb0I7WUFDakMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBRUQsMENBQW9CLEdBQXBCLGNBQTBDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV4RixvQ0FBYyxHQUFkLGNBQStCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFdkUsd0NBQWtCLEdBQWxCLGNBQThDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQ2xHLGtCQUFDO0lBQUQsQ0FBQyxBQWhERCxJQWdEQztJQWhEWSxrQ0FBVyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7TmdDb21waWxlciwgTmdDb21waWxlckhvc3R9IGZyb20gJy4vY29yZSc7XG5pbXBvcnQge05nQ29tcGlsZXJPcHRpb25zLCBVbmlmaWVkTW9kdWxlc0hvc3R9IGZyb20gJy4vY29yZS9hcGknO1xuaW1wb3J0IHtOb2RlSlNGaWxlU3lzdGVtLCBzZXRGaWxlU3lzdGVtfSBmcm9tICcuL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7Tk9PUF9QRVJGX1JFQ09SREVSfSBmcm9tICcuL3BlcmYnO1xuXG4vLyBUaGUgZm9sbG93aW5nIGlzIG5lZWRlZCB0byBmaXggYSB0aGUgY2hpY2tlbi1hbmQtZWdnIGlzc3VlIHdoZXJlIHRoZSBzeW5jIChpbnRvIGczKSBzY3JpcHQgd2lsbFxuLy8gcmVmdXNlIHRvIGFjY2VwdCB0aGlzIGZpbGUgdW5sZXNzIHRoZSBmb2xsb3dpbmcgc3RyaW5nIGFwcGVhcnM6XG4vLyBpbXBvcnQgKiBhcyBwbHVnaW4gZnJvbSAnQGJhemVsL3R5cGVzY3JpcHQvaW50ZXJuYWwvdHNjX3dyYXBwZWQvcGx1Z2luX2FwaSc7XG5cbi8qKlxuICogQSBgdHMuQ29tcGlsZXJIb3N0YCB3aGljaCBhbHNvIHJldHVybnMgYSBsaXN0IG9mIGlucHV0IGZpbGVzLCBvdXQgb2Ygd2hpY2ggdGhlIGB0cy5Qcm9ncmFtYFxuICogc2hvdWxkIGJlIGNyZWF0ZWQuXG4gKlxuICogQ3VycmVudGx5IG1pcnJvcmVkIGZyb20gQGJhemVsL3R5cGVzY3JpcHQvaW50ZXJuYWwvdHNjX3dyYXBwZWQvcGx1Z2luX2FwaSAod2l0aCB0aGUgbmFtaW5nIG9mXG4gKiBgZmlsZU5hbWVUb01vZHVsZU5hbWVgIGNvcnJlY3RlZCkuXG4gKi9cbmludGVyZmFjZSBQbHVnaW5Db21waWxlckhvc3QgZXh0ZW5kcyB0cy5Db21waWxlckhvc3QsIFBhcnRpYWw8VW5pZmllZE1vZHVsZXNIb3N0PiB7XG4gIHJlYWRvbmx5IGlucHV0RmlsZXM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPjtcbn1cblxuLyoqXG4gKiBNaXJyb3JzIHRoZSBwbHVnaW4gaW50ZXJmYWNlIGZyb20gdHNjX3dyYXBwZWQgd2hpY2ggaXMgY3VycmVudGx5IHVuZGVyIGFjdGl2ZSBkZXZlbG9wbWVudC4gVG9cbiAqIGVuYWJsZSBwcm9ncmVzcyB0byBiZSBtYWRlIGluIHBhcmFsbGVsLCB0aGUgdXBzdHJlYW0gaW50ZXJmYWNlIGlzbid0IGltcGxlbWVudGVkIGRpcmVjdGx5LlxuICogSW5zdGVhZCwgYFRzY1BsdWdpbmAgaGVyZSBpcyBzdHJ1Y3R1cmFsbHkgYXNzaWduYWJsZSB0byB3aGF0IHRzY193cmFwcGVkIGV4cGVjdHMuXG4gKi9cbmludGVyZmFjZSBUc2NQbHVnaW4ge1xuICByZWFkb25seSBuYW1lOiBzdHJpbmc7XG5cbiAgd3JhcEhvc3QoXG4gICAgICBob3N0OiB0cy5Db21waWxlckhvc3QmUGFydGlhbDxVbmlmaWVkTW9kdWxlc0hvc3Q+LCBpbnB1dEZpbGVzOiBSZWFkb25seUFycmF5PHN0cmluZz4sXG4gICAgICBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpOiBQbHVnaW5Db21waWxlckhvc3Q7XG5cbiAgc2V0dXBDb21waWxhdGlvbihwcm9ncmFtOiB0cy5Qcm9ncmFtLCBvbGRQcm9ncmFtPzogdHMuUHJvZ3JhbSk6IHtcbiAgICBpZ25vcmVGb3JEaWFnbm9zdGljczogU2V0PHRzLlNvdXJjZUZpbGU+LFxuICAgIGlnbm9yZUZvckVtaXQ6IFNldDx0cy5Tb3VyY2VGaWxlPixcbiAgfTtcblxuICBnZXREaWFnbm9zdGljcyhmaWxlPzogdHMuU291cmNlRmlsZSk6IHRzLkRpYWdub3N0aWNbXTtcblxuICBnZXRPcHRpb25EaWFnbm9zdGljcygpOiB0cy5EaWFnbm9zdGljW107XG5cbiAgZ2V0TmV4dFByb2dyYW0oKTogdHMuUHJvZ3JhbTtcblxuICBjcmVhdGVUcmFuc2Zvcm1lcnMoKTogdHMuQ3VzdG9tVHJhbnNmb3JtZXJzO1xufVxuXG4vKipcbiAqIEEgcGx1Z2luIGZvciBgdHNjX3dyYXBwZWRgIHdoaWNoIGFsbG93cyBBbmd1bGFyIGNvbXBpbGF0aW9uIGZyb20gYSBwbGFpbiBgdHNfbGlicmFyeWAuXG4gKi9cbmV4cG9ydCBjbGFzcyBOZ1RzY1BsdWdpbiBpbXBsZW1lbnRzIFRzY1BsdWdpbiB7XG4gIG5hbWUgPSAnbmd0c2MnO1xuXG4gIHByaXZhdGUgb3B0aW9uczogTmdDb21waWxlck9wdGlvbnN8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgaG9zdDogTmdDb21waWxlckhvc3R8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgX2NvbXBpbGVyOiBOZ0NvbXBpbGVyfG51bGwgPSBudWxsO1xuXG4gIGdldCBjb21waWxlcigpOiBOZ0NvbXBpbGVyIHtcbiAgICBpZiAodGhpcy5fY29tcGlsZXIgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTGlmZWN5Y2xlIGVycm9yOiBzZXR1cENvbXBpbGF0aW9uKCkgbXVzdCBiZSBjYWxsZWQgZmlyc3QuJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9jb21waWxlcjtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgbmdPcHRpb25zOiB7fSkgeyBzZXRGaWxlU3lzdGVtKG5ldyBOb2RlSlNGaWxlU3lzdGVtKCkpOyB9XG5cbiAgd3JhcEhvc3QoXG4gICAgICBob3N0OiB0cy5Db21waWxlckhvc3QmVW5pZmllZE1vZHVsZXNIb3N0LCBpbnB1dEZpbGVzOiByZWFkb25seSBzdHJpbmdbXSxcbiAgICAgIG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucyk6IFBsdWdpbkNvbXBpbGVySG9zdCB7XG4gICAgdGhpcy5vcHRpb25zID0gey4uLnRoaXMubmdPcHRpb25zLCAuLi5vcHRpb25zIH0gYXMgTmdDb21waWxlck9wdGlvbnM7XG4gICAgdGhpcy5ob3N0ID0gTmdDb21waWxlckhvc3Qud3JhcChob3N0LCBpbnB1dEZpbGVzLCB0aGlzLm9wdGlvbnMpO1xuICAgIHJldHVybiB0aGlzLmhvc3Q7XG4gIH1cblxuICBzZXR1cENvbXBpbGF0aW9uKHByb2dyYW06IHRzLlByb2dyYW0sIG9sZFByb2dyYW0/OiB0cy5Qcm9ncmFtKToge1xuICAgIGlnbm9yZUZvckRpYWdub3N0aWNzOiBTZXQ8dHMuU291cmNlRmlsZT4sXG4gICAgaWdub3JlRm9yRW1pdDogU2V0PHRzLlNvdXJjZUZpbGU+LFxuICB9IHtcbiAgICBpZiAodGhpcy5ob3N0ID09PSBudWxsIHx8IHRoaXMub3B0aW9ucyA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdMaWZlY3ljbGUgZXJyb3I6IHNldHVwQ29tcGlsYXRpb24oKSBiZWZvcmUgd3JhcEhvc3QoKS4nKTtcbiAgICB9XG4gICAgdGhpcy5fY29tcGlsZXIgPVxuICAgICAgICBuZXcgTmdDb21waWxlcih0aGlzLmhvc3QsIHRoaXMub3B0aW9ucywgcHJvZ3JhbSwgb2xkUHJvZ3JhbSwgTk9PUF9QRVJGX1JFQ09SREVSKTtcbiAgICByZXR1cm4ge1xuICAgICAgaWdub3JlRm9yRGlhZ25vc3RpY3M6IHRoaXMuX2NvbXBpbGVyLmlnbm9yZUZvckRpYWdub3N0aWNzLFxuICAgICAgaWdub3JlRm9yRW1pdDogdGhpcy5fY29tcGlsZXIuaWdub3JlRm9yRW1pdCxcbiAgICB9O1xuICB9XG5cbiAgZ2V0RGlhZ25vc3RpY3MoZmlsZT86IHRzLlNvdXJjZUZpbGUpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLmdldERpYWdub3N0aWNzKGZpbGUpO1xuICB9XG5cbiAgZ2V0T3B0aW9uRGlhZ25vc3RpY3MoKTogdHMuRGlhZ25vc3RpY1tdIHsgcmV0dXJuIHRoaXMuY29tcGlsZXIuZ2V0T3B0aW9uRGlhZ25vc3RpY3MoKTsgfVxuXG4gIGdldE5leHRQcm9ncmFtKCk6IHRzLlByb2dyYW0geyByZXR1cm4gdGhpcy5jb21waWxlci5nZXROZXh0UHJvZ3JhbSgpOyB9XG5cbiAgY3JlYXRlVHJhbnNmb3JtZXJzKCk6IHRzLkN1c3RvbVRyYW5zZm9ybWVycyB7IHJldHVybiB0aGlzLmNvbXBpbGVyLnByZXBhcmVFbWl0KCkudHJhbnNmb3JtZXJzOyB9XG59XG4iXX0=