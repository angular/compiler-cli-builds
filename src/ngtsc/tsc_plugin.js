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
        define("@angular/compiler-cli/src/ngtsc/tsc_plugin", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/core", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/incremental", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/typecheck/src/augmented_program"], factory);
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
            this._compiler = new core_1.NgCompiler(this.host, this.options, program, typeCheckStrategy, new incremental_1.PatchedProgramIncrementalBuildStrategy(), oldProgram, perf_1.NOOP_PERF_RECORDER);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNjX3BsdWdpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHNjX3BsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBSUgsNkRBQWtEO0lBRWxELDJFQUE4RDtJQUM5RCwyRUFBcUU7SUFDckUsNkRBQTBDO0lBQzFDLHFHQUF3RTtJQTJDeEU7O09BRUc7SUFDSDtRQWNFLHFCQUFvQixTQUFhO1lBQWIsY0FBUyxHQUFULFNBQVMsQ0FBSTtZQWJqQyxTQUFJLEdBQUcsT0FBTyxDQUFDO1lBRVAsWUFBTyxHQUEyQixJQUFJLENBQUM7WUFDdkMsU0FBSSxHQUF3QixJQUFJLENBQUM7WUFDakMsY0FBUyxHQUFvQixJQUFJLENBQUM7WUFVeEMsMkJBQWEsQ0FBQyxJQUFJLDhCQUFnQixFQUFFLENBQUMsQ0FBQztRQUN4QyxDQUFDO1FBVEQsc0JBQUksaUNBQVE7aUJBQVo7Z0JBQ0UsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLElBQUksRUFBRTtvQkFDM0IsTUFBTSxJQUFJLEtBQUssQ0FBQywyREFBMkQsQ0FBQyxDQUFDO2lCQUM5RTtnQkFDRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDeEIsQ0FBQzs7O1dBQUE7UUFNRCw4QkFBUSxHQUFSLFVBQ0ksSUFBd0MsRUFBRSxVQUE2QixFQUN2RSxPQUEyQjtZQUM3QixJQUFJLENBQUMsT0FBTyxHQUFHLHNDQUFJLElBQUksQ0FBQyxTQUFTLEdBQUssT0FBTyxDQUFzQixDQUFDO1lBQ3BFLElBQUksQ0FBQyxJQUFJLEdBQUcscUJBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZGLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztRQUNuQixDQUFDO1FBRUQsc0NBQWdCLEdBQWhCLFVBQWlCLE9BQW1CLEVBQUUsVUFBdUI7WUFJM0QsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLElBQUksRUFBRTtnQkFDL0MsTUFBTSxJQUFJLEtBQUssQ0FBQyx3REFBd0QsQ0FBQyxDQUFDO2FBQzNFO1lBQ0QsSUFBTSxpQkFBaUIsR0FBRyxJQUFJLHlDQUFxQixDQUMvQyxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQztZQUN2RSxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksaUJBQVUsQ0FDM0IsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFDbkQsSUFBSSxvREFBc0MsRUFBRSxFQUFFLFVBQVUsRUFBRSx5QkFBa0IsQ0FBQyxDQUFDO1lBQ2xGLE9BQU87Z0JBQ0wsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0I7Z0JBQ3pELGFBQWEsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWE7YUFDNUMsQ0FBQztRQUNKLENBQUM7UUFFRCxvQ0FBYyxHQUFkLFVBQWUsSUFBb0I7WUFDakMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBRUQsMENBQW9CLEdBQXBCO1lBQ0UsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDOUMsQ0FBQztRQUVELG9DQUFjLEdBQWQ7WUFDRSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDeEMsQ0FBQztRQUVELHdDQUFrQixHQUFsQjtZQUNFLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxZQUFZLENBQUM7UUFDbEQsQ0FBQztRQUNILGtCQUFDO0lBQUQsQ0FBQyxBQTNERCxJQTJEQztJQTNEWSxrQ0FBVyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtOZ0NvbXBpbGVyLCBOZ0NvbXBpbGVySG9zdH0gZnJvbSAnLi9jb3JlJztcbmltcG9ydCB7TmdDb21waWxlck9wdGlvbnMsIFVuaWZpZWRNb2R1bGVzSG9zdH0gZnJvbSAnLi9jb3JlL2FwaSc7XG5pbXBvcnQge05vZGVKU0ZpbGVTeXN0ZW0sIHNldEZpbGVTeXN0ZW19IGZyb20gJy4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtQYXRjaGVkUHJvZ3JhbUluY3JlbWVudGFsQnVpbGRTdHJhdGVneX0gZnJvbSAnLi9pbmNyZW1lbnRhbCc7XG5pbXBvcnQge05PT1BfUEVSRl9SRUNPUkRFUn0gZnJvbSAnLi9wZXJmJztcbmltcG9ydCB7UmV1c2VkUHJvZ3JhbVN0cmF0ZWd5fSBmcm9tICcuL3R5cGVjaGVjay9zcmMvYXVnbWVudGVkX3Byb2dyYW0nO1xuXG4vLyBUaGUgZm9sbG93aW5nIGlzIG5lZWRlZCB0byBmaXggYSB0aGUgY2hpY2tlbi1hbmQtZWdnIGlzc3VlIHdoZXJlIHRoZSBzeW5jIChpbnRvIGczKSBzY3JpcHQgd2lsbFxuLy8gcmVmdXNlIHRvIGFjY2VwdCB0aGlzIGZpbGUgdW5sZXNzIHRoZSBmb2xsb3dpbmcgc3RyaW5nIGFwcGVhcnM6XG4vLyBpbXBvcnQgKiBhcyBwbHVnaW4gZnJvbSAnQGJhemVsL3R5cGVzY3JpcHQvaW50ZXJuYWwvdHNjX3dyYXBwZWQvcGx1Z2luX2FwaSc7XG5cbi8qKlxuICogQSBgdHMuQ29tcGlsZXJIb3N0YCB3aGljaCBhbHNvIHJldHVybnMgYSBsaXN0IG9mIGlucHV0IGZpbGVzLCBvdXQgb2Ygd2hpY2ggdGhlIGB0cy5Qcm9ncmFtYFxuICogc2hvdWxkIGJlIGNyZWF0ZWQuXG4gKlxuICogQ3VycmVudGx5IG1pcnJvcmVkIGZyb20gQGJhemVsL3R5cGVzY3JpcHQvaW50ZXJuYWwvdHNjX3dyYXBwZWQvcGx1Z2luX2FwaSAod2l0aCB0aGUgbmFtaW5nIG9mXG4gKiBgZmlsZU5hbWVUb01vZHVsZU5hbWVgIGNvcnJlY3RlZCkuXG4gKi9cbmludGVyZmFjZSBQbHVnaW5Db21waWxlckhvc3QgZXh0ZW5kcyB0cy5Db21waWxlckhvc3QsIFBhcnRpYWw8VW5pZmllZE1vZHVsZXNIb3N0PiB7XG4gIHJlYWRvbmx5IGlucHV0RmlsZXM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPjtcbn1cblxuLyoqXG4gKiBNaXJyb3JzIHRoZSBwbHVnaW4gaW50ZXJmYWNlIGZyb20gdHNjX3dyYXBwZWQgd2hpY2ggaXMgY3VycmVudGx5IHVuZGVyIGFjdGl2ZSBkZXZlbG9wbWVudC4gVG9cbiAqIGVuYWJsZSBwcm9ncmVzcyB0byBiZSBtYWRlIGluIHBhcmFsbGVsLCB0aGUgdXBzdHJlYW0gaW50ZXJmYWNlIGlzbid0IGltcGxlbWVudGVkIGRpcmVjdGx5LlxuICogSW5zdGVhZCwgYFRzY1BsdWdpbmAgaGVyZSBpcyBzdHJ1Y3R1cmFsbHkgYXNzaWduYWJsZSB0byB3aGF0IHRzY193cmFwcGVkIGV4cGVjdHMuXG4gKi9cbmludGVyZmFjZSBUc2NQbHVnaW4ge1xuICByZWFkb25seSBuYW1lOiBzdHJpbmc7XG5cbiAgd3JhcEhvc3QoXG4gICAgICBob3N0OiB0cy5Db21waWxlckhvc3QmUGFydGlhbDxVbmlmaWVkTW9kdWxlc0hvc3Q+LCBpbnB1dEZpbGVzOiBSZWFkb25seUFycmF5PHN0cmluZz4sXG4gICAgICBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpOiBQbHVnaW5Db21waWxlckhvc3Q7XG5cbiAgc2V0dXBDb21waWxhdGlvbihwcm9ncmFtOiB0cy5Qcm9ncmFtLCBvbGRQcm9ncmFtPzogdHMuUHJvZ3JhbSk6IHtcbiAgICBpZ25vcmVGb3JEaWFnbm9zdGljczogU2V0PHRzLlNvdXJjZUZpbGU+LFxuICAgIGlnbm9yZUZvckVtaXQ6IFNldDx0cy5Tb3VyY2VGaWxlPixcbiAgfTtcblxuICBnZXREaWFnbm9zdGljcyhmaWxlPzogdHMuU291cmNlRmlsZSk6IHRzLkRpYWdub3N0aWNbXTtcblxuICBnZXRPcHRpb25EaWFnbm9zdGljcygpOiB0cy5EaWFnbm9zdGljW107XG5cbiAgZ2V0TmV4dFByb2dyYW0oKTogdHMuUHJvZ3JhbTtcblxuICBjcmVhdGVUcmFuc2Zvcm1lcnMoKTogdHMuQ3VzdG9tVHJhbnNmb3JtZXJzO1xufVxuXG4vKipcbiAqIEEgcGx1Z2luIGZvciBgdHNjX3dyYXBwZWRgIHdoaWNoIGFsbG93cyBBbmd1bGFyIGNvbXBpbGF0aW9uIGZyb20gYSBwbGFpbiBgdHNfbGlicmFyeWAuXG4gKi9cbmV4cG9ydCBjbGFzcyBOZ1RzY1BsdWdpbiBpbXBsZW1lbnRzIFRzY1BsdWdpbiB7XG4gIG5hbWUgPSAnbmd0c2MnO1xuXG4gIHByaXZhdGUgb3B0aW9uczogTmdDb21waWxlck9wdGlvbnN8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgaG9zdDogTmdDb21waWxlckhvc3R8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgX2NvbXBpbGVyOiBOZ0NvbXBpbGVyfG51bGwgPSBudWxsO1xuXG4gIGdldCBjb21waWxlcigpOiBOZ0NvbXBpbGVyIHtcbiAgICBpZiAodGhpcy5fY29tcGlsZXIgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTGlmZWN5Y2xlIGVycm9yOiBzZXR1cENvbXBpbGF0aW9uKCkgbXVzdCBiZSBjYWxsZWQgZmlyc3QuJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9jb21waWxlcjtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgbmdPcHRpb25zOiB7fSkge1xuICAgIHNldEZpbGVTeXN0ZW0obmV3IE5vZGVKU0ZpbGVTeXN0ZW0oKSk7XG4gIH1cblxuICB3cmFwSG9zdChcbiAgICAgIGhvc3Q6IHRzLkNvbXBpbGVySG9zdCZVbmlmaWVkTW9kdWxlc0hvc3QsIGlucHV0RmlsZXM6IHJlYWRvbmx5IHN0cmluZ1tdLFxuICAgICAgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKTogUGx1Z2luQ29tcGlsZXJIb3N0IHtcbiAgICB0aGlzLm9wdGlvbnMgPSB7Li4udGhpcy5uZ09wdGlvbnMsIC4uLm9wdGlvbnN9IGFzIE5nQ29tcGlsZXJPcHRpb25zO1xuICAgIHRoaXMuaG9zdCA9IE5nQ29tcGlsZXJIb3N0LndyYXAoaG9zdCwgaW5wdXRGaWxlcywgdGhpcy5vcHRpb25zLCAvKiBvbGRQcm9ncmFtICovIG51bGwpO1xuICAgIHJldHVybiB0aGlzLmhvc3Q7XG4gIH1cblxuICBzZXR1cENvbXBpbGF0aW9uKHByb2dyYW06IHRzLlByb2dyYW0sIG9sZFByb2dyYW0/OiB0cy5Qcm9ncmFtKToge1xuICAgIGlnbm9yZUZvckRpYWdub3N0aWNzOiBTZXQ8dHMuU291cmNlRmlsZT4sXG4gICAgaWdub3JlRm9yRW1pdDogU2V0PHRzLlNvdXJjZUZpbGU+LFxuICB9IHtcbiAgICBpZiAodGhpcy5ob3N0ID09PSBudWxsIHx8IHRoaXMub3B0aW9ucyA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdMaWZlY3ljbGUgZXJyb3I6IHNldHVwQ29tcGlsYXRpb24oKSBiZWZvcmUgd3JhcEhvc3QoKS4nKTtcbiAgICB9XG4gICAgY29uc3QgdHlwZUNoZWNrU3RyYXRlZ3kgPSBuZXcgUmV1c2VkUHJvZ3JhbVN0cmF0ZWd5KFxuICAgICAgICBwcm9ncmFtLCB0aGlzLmhvc3QsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0LnNoaW1FeHRlbnNpb25QcmVmaXhlcyk7XG4gICAgdGhpcy5fY29tcGlsZXIgPSBuZXcgTmdDb21waWxlcihcbiAgICAgICAgdGhpcy5ob3N0LCB0aGlzLm9wdGlvbnMsIHByb2dyYW0sIHR5cGVDaGVja1N0cmF0ZWd5LFxuICAgICAgICBuZXcgUGF0Y2hlZFByb2dyYW1JbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3koKSwgb2xkUHJvZ3JhbSwgTk9PUF9QRVJGX1JFQ09SREVSKTtcbiAgICByZXR1cm4ge1xuICAgICAgaWdub3JlRm9yRGlhZ25vc3RpY3M6IHRoaXMuX2NvbXBpbGVyLmlnbm9yZUZvckRpYWdub3N0aWNzLFxuICAgICAgaWdub3JlRm9yRW1pdDogdGhpcy5fY29tcGlsZXIuaWdub3JlRm9yRW1pdCxcbiAgICB9O1xuICB9XG5cbiAgZ2V0RGlhZ25vc3RpY3MoZmlsZT86IHRzLlNvdXJjZUZpbGUpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLmdldERpYWdub3N0aWNzKGZpbGUpO1xuICB9XG5cbiAgZ2V0T3B0aW9uRGlhZ25vc3RpY3MoKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlci5nZXRPcHRpb25EaWFnbm9zdGljcygpO1xuICB9XG5cbiAgZ2V0TmV4dFByb2dyYW0oKTogdHMuUHJvZ3JhbSB7XG4gICAgcmV0dXJuIHRoaXMuY29tcGlsZXIuZ2V0TmV4dFByb2dyYW0oKTtcbiAgfVxuXG4gIGNyZWF0ZVRyYW5zZm9ybWVycygpOiB0cy5DdXN0b21UcmFuc2Zvcm1lcnMge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLnByZXBhcmVFbWl0KCkudHJhbnNmb3JtZXJzO1xuICB9XG59XG4iXX0=