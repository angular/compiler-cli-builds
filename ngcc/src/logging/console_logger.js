(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/logging/console_logger", ["require", "exports", "tslib", "@angular/compiler-cli/ngcc/src/logging/logger"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ConsoleLogger = exports.ERROR = exports.WARN = exports.DEBUG = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var logger_1 = require("@angular/compiler-cli/ngcc/src/logging/logger");
    var RESET = '\x1b[0m';
    var RED = '\x1b[31m';
    var YELLOW = '\x1b[33m';
    var BLUE = '\x1b[36m';
    exports.DEBUG = BLUE + "Debug:" + RESET;
    exports.WARN = YELLOW + "Warning:" + RESET;
    exports.ERROR = RED + "Error:" + RESET;
    /**
     * A simple logger that outputs directly to the Console.
     *
     * The log messages can be filtered based on severity via the `logLevel`
     * constructor parameter.
     */
    var ConsoleLogger = /** @class */ (function () {
        function ConsoleLogger(level) {
            this.level = level;
        }
        ConsoleLogger.prototype.debug = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            if (this.level <= logger_1.LogLevel.debug)
                console.debug.apply(console, tslib_1.__spread([exports.DEBUG], args));
        };
        ConsoleLogger.prototype.info = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            if (this.level <= logger_1.LogLevel.info)
                console.info.apply(console, tslib_1.__spread(args));
        };
        ConsoleLogger.prototype.warn = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            if (this.level <= logger_1.LogLevel.warn)
                console.warn.apply(console, tslib_1.__spread([exports.WARN], args));
        };
        ConsoleLogger.prototype.error = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            if (this.level <= logger_1.LogLevel.error)
                console.error.apply(console, tslib_1.__spread([exports.ERROR], args));
        };
        return ConsoleLogger;
    }());
    exports.ConsoleLogger = ConsoleLogger;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc29sZV9sb2dnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvbG9nZ2luZy9jb25zb2xlX2xvZ2dlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsd0VBQTBDO0lBRTFDLElBQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQztJQUN4QixJQUFNLEdBQUcsR0FBRyxVQUFVLENBQUM7SUFDdkIsSUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDO0lBQzFCLElBQU0sSUFBSSxHQUFHLFVBQVUsQ0FBQztJQUVYLFFBQUEsS0FBSyxHQUFNLElBQUksY0FBUyxLQUFPLENBQUM7SUFDaEMsUUFBQSxJQUFJLEdBQU0sTUFBTSxnQkFBVyxLQUFPLENBQUM7SUFDbkMsUUFBQSxLQUFLLEdBQU0sR0FBRyxjQUFTLEtBQU8sQ0FBQztJQUU1Qzs7Ozs7T0FLRztJQUNIO1FBQ0UsdUJBQW1CLEtBQWU7WUFBZixVQUFLLEdBQUwsS0FBSyxDQUFVO1FBQUcsQ0FBQztRQUN0Qyw2QkFBSyxHQUFMO1lBQU0sY0FBaUI7aUJBQWpCLFVBQWlCLEVBQWpCLHFCQUFpQixFQUFqQixJQUFpQjtnQkFBakIseUJBQWlCOztZQUNyQixJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksaUJBQVEsQ0FBQyxLQUFLO2dCQUFFLE9BQU8sQ0FBQyxLQUFLLE9BQWIsT0FBTyxvQkFBTyxhQUFLLEdBQUssSUFBSSxHQUFFO1FBQ2xFLENBQUM7UUFDRCw0QkFBSSxHQUFKO1lBQUssY0FBaUI7aUJBQWpCLFVBQWlCLEVBQWpCLHFCQUFpQixFQUFqQixJQUFpQjtnQkFBakIseUJBQWlCOztZQUNwQixJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksaUJBQVEsQ0FBQyxJQUFJO2dCQUFFLE9BQU8sQ0FBQyxJQUFJLE9BQVosT0FBTyxtQkFBUyxJQUFJLEdBQUU7UUFDekQsQ0FBQztRQUNELDRCQUFJLEdBQUo7WUFBSyxjQUFpQjtpQkFBakIsVUFBaUIsRUFBakIscUJBQWlCLEVBQWpCLElBQWlCO2dCQUFqQix5QkFBaUI7O1lBQ3BCLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxpQkFBUSxDQUFDLElBQUk7Z0JBQUUsT0FBTyxDQUFDLElBQUksT0FBWixPQUFPLG9CQUFNLFlBQUksR0FBSyxJQUFJLEdBQUU7UUFDL0QsQ0FBQztRQUNELDZCQUFLLEdBQUw7WUFBTSxjQUFpQjtpQkFBakIsVUFBaUIsRUFBakIscUJBQWlCLEVBQWpCLElBQWlCO2dCQUFqQix5QkFBaUI7O1lBQ3JCLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxpQkFBUSxDQUFDLEtBQUs7Z0JBQUUsT0FBTyxDQUFDLEtBQUssT0FBYixPQUFPLG9CQUFPLGFBQUssR0FBSyxJQUFJLEdBQUU7UUFDbEUsQ0FBQztRQUNILG9CQUFDO0lBQUQsQ0FBQyxBQWRELElBY0M7SUFkWSxzQ0FBYSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7TG9nZ2VyLCBMb2dMZXZlbH0gZnJvbSAnLi9sb2dnZXInO1xuXG5jb25zdCBSRVNFVCA9ICdcXHgxYlswbSc7XG5jb25zdCBSRUQgPSAnXFx4MWJbMzFtJztcbmNvbnN0IFlFTExPVyA9ICdcXHgxYlszM20nO1xuY29uc3QgQkxVRSA9ICdcXHgxYlszNm0nO1xuXG5leHBvcnQgY29uc3QgREVCVUcgPSBgJHtCTFVFfURlYnVnOiR7UkVTRVR9YDtcbmV4cG9ydCBjb25zdCBXQVJOID0gYCR7WUVMTE9XfVdhcm5pbmc6JHtSRVNFVH1gO1xuZXhwb3J0IGNvbnN0IEVSUk9SID0gYCR7UkVEfUVycm9yOiR7UkVTRVR9YDtcblxuLyoqXG4gKiBBIHNpbXBsZSBsb2dnZXIgdGhhdCBvdXRwdXRzIGRpcmVjdGx5IHRvIHRoZSBDb25zb2xlLlxuICpcbiAqIFRoZSBsb2cgbWVzc2FnZXMgY2FuIGJlIGZpbHRlcmVkIGJhc2VkIG9uIHNldmVyaXR5IHZpYSB0aGUgYGxvZ0xldmVsYFxuICogY29uc3RydWN0b3IgcGFyYW1ldGVyLlxuICovXG5leHBvcnQgY2xhc3MgQ29uc29sZUxvZ2dlciBpbXBsZW1lbnRzIExvZ2dlciB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBsZXZlbDogTG9nTGV2ZWwpIHt9XG4gIGRlYnVnKC4uLmFyZ3M6IHN0cmluZ1tdKSB7XG4gICAgaWYgKHRoaXMubGV2ZWwgPD0gTG9nTGV2ZWwuZGVidWcpIGNvbnNvbGUuZGVidWcoREVCVUcsIC4uLmFyZ3MpO1xuICB9XG4gIGluZm8oLi4uYXJnczogc3RyaW5nW10pIHtcbiAgICBpZiAodGhpcy5sZXZlbCA8PSBMb2dMZXZlbC5pbmZvKSBjb25zb2xlLmluZm8oLi4uYXJncyk7XG4gIH1cbiAgd2FybiguLi5hcmdzOiBzdHJpbmdbXSkge1xuICAgIGlmICh0aGlzLmxldmVsIDw9IExvZ0xldmVsLndhcm4pIGNvbnNvbGUud2FybihXQVJOLCAuLi5hcmdzKTtcbiAgfVxuICBlcnJvciguLi5hcmdzOiBzdHJpbmdbXSkge1xuICAgIGlmICh0aGlzLmxldmVsIDw9IExvZ0xldmVsLmVycm9yKSBjb25zb2xlLmVycm9yKEVSUk9SLCAuLi5hcmdzKTtcbiAgfVxufVxuIl19