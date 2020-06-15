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
        define("@angular/compiler-cli/src/ngtsc/incremental/src/strategy", ["require", "exports", "@angular/compiler-cli/src/ngtsc/incremental/src/state"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PatchedProgramIncrementalBuildStrategy = exports.TrackedIncrementalBuildStrategy = exports.NoopIncrementalBuildStrategy = void 0;
    var state_1 = require("@angular/compiler-cli/src/ngtsc/incremental/src/state");
    /**
     * A noop implementation of `IncrementalBuildStrategy` which neither returns nor tracks any
     * incremental data.
     */
    var NoopIncrementalBuildStrategy = /** @class */ (function () {
        function NoopIncrementalBuildStrategy() {
        }
        NoopIncrementalBuildStrategy.prototype.getIncrementalDriver = function () {
            return null;
        };
        NoopIncrementalBuildStrategy.prototype.setIncrementalDriver = function () { };
        return NoopIncrementalBuildStrategy;
    }());
    exports.NoopIncrementalBuildStrategy = NoopIncrementalBuildStrategy;
    /**
     * Tracks an `IncrementalDriver` within the strategy itself.
     */
    var TrackedIncrementalBuildStrategy = /** @class */ (function () {
        function TrackedIncrementalBuildStrategy() {
            this.previous = null;
            this.next = null;
        }
        TrackedIncrementalBuildStrategy.prototype.getIncrementalDriver = function () {
            return this.next !== null ? this.next : this.previous;
        };
        TrackedIncrementalBuildStrategy.prototype.setIncrementalDriver = function (driver) {
            this.next = driver;
        };
        TrackedIncrementalBuildStrategy.prototype.toNextBuildStrategy = function () {
            var strategy = new TrackedIncrementalBuildStrategy();
            strategy.previous = this.next;
            return strategy;
        };
        return TrackedIncrementalBuildStrategy;
    }());
    exports.TrackedIncrementalBuildStrategy = TrackedIncrementalBuildStrategy;
    /**
     * Manages the `IncrementalDriver` associated with a `ts.Program` by monkey-patching it onto the
     * program under `SYM_INCREMENTAL_DRIVER`.
     */
    var PatchedProgramIncrementalBuildStrategy = /** @class */ (function () {
        function PatchedProgramIncrementalBuildStrategy() {
        }
        PatchedProgramIncrementalBuildStrategy.prototype.getIncrementalDriver = function (program) {
            var driver = program[SYM_INCREMENTAL_DRIVER];
            if (driver === undefined || !(driver instanceof state_1.IncrementalDriver)) {
                return null;
            }
            return driver;
        };
        PatchedProgramIncrementalBuildStrategy.prototype.setIncrementalDriver = function (driver, program) {
            program[SYM_INCREMENTAL_DRIVER] = driver;
        };
        return PatchedProgramIncrementalBuildStrategy;
    }());
    exports.PatchedProgramIncrementalBuildStrategy = PatchedProgramIncrementalBuildStrategy;
    /**
     * Symbol under which the `IncrementalDriver` is stored on a `ts.Program`.
     *
     * The TS model of incremental compilation is based around reuse of a previous `ts.Program` in the
     * construction of a new one. The `NgCompiler` follows this abstraction - passing in a previous
     * `ts.Program` is sufficient to trigger incremental compilation. This previous `ts.Program` need
     * not be from an Angular compilation (that is, it need not have been created from `NgCompiler`).
     *
     * If it is, though, Angular can benefit from reusing previous analysis work. This reuse is managed
     * by the `IncrementalDriver`, which is inherited from the old program to the new program. To
     * support this behind the API of passing an old `ts.Program`, the `IncrementalDriver` is stored on
     * the `ts.Program` under this symbol.
     */
    var SYM_INCREMENTAL_DRIVER = Symbol('NgIncrementalDriver');
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyYXRlZ3kuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2luY3JlbWVudGFsL3NyYy9zdHJhdGVneS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCwrRUFBMEM7SUFtQjFDOzs7T0FHRztJQUNIO1FBQUE7UUFNQSxDQUFDO1FBTEMsMkRBQW9CLEdBQXBCO1lBQ0UsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBRUQsMkRBQW9CLEdBQXBCLGNBQThCLENBQUM7UUFDakMsbUNBQUM7SUFBRCxDQUFDLEFBTkQsSUFNQztJQU5ZLG9FQUE0QjtJQVF6Qzs7T0FFRztJQUNIO1FBQUE7WUFDVSxhQUFRLEdBQTJCLElBQUksQ0FBQztZQUN4QyxTQUFJLEdBQTJCLElBQUksQ0FBQztRQWU5QyxDQUFDO1FBYkMsOERBQW9CLEdBQXBCO1lBQ0UsT0FBTyxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUN4RCxDQUFDO1FBRUQsOERBQW9CLEdBQXBCLFVBQXFCLE1BQXlCO1lBQzVDLElBQUksQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLENBQUM7UUFFRCw2REFBbUIsR0FBbkI7WUFDRSxJQUFNLFFBQVEsR0FBRyxJQUFJLCtCQUErQixFQUFFLENBQUM7WUFDdkQsUUFBUSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQzlCLE9BQU8sUUFBUSxDQUFDO1FBQ2xCLENBQUM7UUFDSCxzQ0FBQztJQUFELENBQUMsQUFqQkQsSUFpQkM7SUFqQlksMEVBQStCO0lBbUI1Qzs7O09BR0c7SUFDSDtRQUFBO1FBWUEsQ0FBQztRQVhDLHFFQUFvQixHQUFwQixVQUFxQixPQUFtQjtZQUN0QyxJQUFNLE1BQU0sR0FBSSxPQUFlLENBQUMsc0JBQXNCLENBQUMsQ0FBQztZQUN4RCxJQUFJLE1BQU0sS0FBSyxTQUFTLElBQUksQ0FBQyxDQUFDLE1BQU0sWUFBWSx5QkFBaUIsQ0FBQyxFQUFFO2dCQUNsRSxPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQztRQUVELHFFQUFvQixHQUFwQixVQUFxQixNQUF5QixFQUFFLE9BQW1CO1lBQ2hFLE9BQWUsQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLE1BQU0sQ0FBQztRQUNwRCxDQUFDO1FBQ0gsNkNBQUM7SUFBRCxDQUFDLEFBWkQsSUFZQztJQVpZLHdGQUFzQztJQWVuRDs7Ozs7Ozs7Ozs7O09BWUc7SUFDSCxJQUFNLHNCQUFzQixHQUFHLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtJbmNyZW1lbnRhbERyaXZlcn0gZnJvbSAnLi9zdGF0ZSc7XG5cbi8qKlxuICogU3RyYXRlZ3kgdXNlZCB0byBtYW5hZ2UgdGhlIGFzc29jaWF0aW9uIGJldHdlZW4gYSBgdHMuUHJvZ3JhbWAgYW5kIHRoZSBgSW5jcmVtZW50YWxEcml2ZXJgIHdoaWNoXG4gKiByZXByZXNlbnRzIHRoZSByZXVzYWJsZSBBbmd1bGFyIHBhcnQgb2YgaXRzIGNvbXBpbGF0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEluY3JlbWVudGFsQnVpbGRTdHJhdGVneSB7XG4gIC8qKlxuICAgKiBEZXRlcm1pbmUgdGhlIEFuZ3VsYXIgYEluY3JlbWVudGFsRHJpdmVyYCBmb3IgdGhlIGdpdmVuIGB0cy5Qcm9ncmFtYCwgaWYgb25lIGlzIGF2YWlsYWJsZS5cbiAgICovXG4gIGdldEluY3JlbWVudGFsRHJpdmVyKHByb2dyYW06IHRzLlByb2dyYW0pOiBJbmNyZW1lbnRhbERyaXZlcnxudWxsO1xuXG4gIC8qKlxuICAgKiBBc3NvY2lhdGUgdGhlIGdpdmVuIGBJbmNyZW1lbnRhbERyaXZlcmAgd2l0aCB0aGUgZ2l2ZW4gYHRzLlByb2dyYW1gIGFuZCBtYWtlIGl0IGF2YWlsYWJsZSB0b1xuICAgKiBmdXR1cmUgY29tcGlsYXRpb25zLlxuICAgKi9cbiAgc2V0SW5jcmVtZW50YWxEcml2ZXIoZHJpdmVyOiBJbmNyZW1lbnRhbERyaXZlciwgcHJvZ3JhbTogdHMuUHJvZ3JhbSk6IHZvaWQ7XG59XG5cbi8qKlxuICogQSBub29wIGltcGxlbWVudGF0aW9uIG9mIGBJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3lgIHdoaWNoIG5laXRoZXIgcmV0dXJucyBub3IgdHJhY2tzIGFueVxuICogaW5jcmVtZW50YWwgZGF0YS5cbiAqL1xuZXhwb3J0IGNsYXNzIE5vb3BJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3kgaW1wbGVtZW50cyBJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3kge1xuICBnZXRJbmNyZW1lbnRhbERyaXZlcigpOiBudWxsIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHNldEluY3JlbWVudGFsRHJpdmVyKCk6IHZvaWQge31cbn1cblxuLyoqXG4gKiBUcmFja3MgYW4gYEluY3JlbWVudGFsRHJpdmVyYCB3aXRoaW4gdGhlIHN0cmF0ZWd5IGl0c2VsZi5cbiAqL1xuZXhwb3J0IGNsYXNzIFRyYWNrZWRJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3kgaW1wbGVtZW50cyBJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3kge1xuICBwcml2YXRlIHByZXZpb3VzOiBJbmNyZW1lbnRhbERyaXZlcnxudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBuZXh0OiBJbmNyZW1lbnRhbERyaXZlcnxudWxsID0gbnVsbDtcblxuICBnZXRJbmNyZW1lbnRhbERyaXZlcigpOiBJbmNyZW1lbnRhbERyaXZlcnxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5uZXh0ICE9PSBudWxsID8gdGhpcy5uZXh0IDogdGhpcy5wcmV2aW91cztcbiAgfVxuXG4gIHNldEluY3JlbWVudGFsRHJpdmVyKGRyaXZlcjogSW5jcmVtZW50YWxEcml2ZXIpOiB2b2lkIHtcbiAgICB0aGlzLm5leHQgPSBkcml2ZXI7XG4gIH1cblxuICB0b05leHRCdWlsZFN0cmF0ZWd5KCk6IFRyYWNrZWRJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3kge1xuICAgIGNvbnN0IHN0cmF0ZWd5ID0gbmV3IFRyYWNrZWRJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3koKTtcbiAgICBzdHJhdGVneS5wcmV2aW91cyA9IHRoaXMubmV4dDtcbiAgICByZXR1cm4gc3RyYXRlZ3k7XG4gIH1cbn1cblxuLyoqXG4gKiBNYW5hZ2VzIHRoZSBgSW5jcmVtZW50YWxEcml2ZXJgIGFzc29jaWF0ZWQgd2l0aCBhIGB0cy5Qcm9ncmFtYCBieSBtb25rZXktcGF0Y2hpbmcgaXQgb250byB0aGVcbiAqIHByb2dyYW0gdW5kZXIgYFNZTV9JTkNSRU1FTlRBTF9EUklWRVJgLlxuICovXG5leHBvcnQgY2xhc3MgUGF0Y2hlZFByb2dyYW1JbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3kgaW1wbGVtZW50cyBJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3kge1xuICBnZXRJbmNyZW1lbnRhbERyaXZlcihwcm9ncmFtOiB0cy5Qcm9ncmFtKTogSW5jcmVtZW50YWxEcml2ZXJ8bnVsbCB7XG4gICAgY29uc3QgZHJpdmVyID0gKHByb2dyYW0gYXMgYW55KVtTWU1fSU5DUkVNRU5UQUxfRFJJVkVSXTtcbiAgICBpZiAoZHJpdmVyID09PSB1bmRlZmluZWQgfHwgIShkcml2ZXIgaW5zdGFuY2VvZiBJbmNyZW1lbnRhbERyaXZlcikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gZHJpdmVyO1xuICB9XG5cbiAgc2V0SW5jcmVtZW50YWxEcml2ZXIoZHJpdmVyOiBJbmNyZW1lbnRhbERyaXZlciwgcHJvZ3JhbTogdHMuUHJvZ3JhbSk6IHZvaWQge1xuICAgIChwcm9ncmFtIGFzIGFueSlbU1lNX0lOQ1JFTUVOVEFMX0RSSVZFUl0gPSBkcml2ZXI7XG4gIH1cbn1cblxuXG4vKipcbiAqIFN5bWJvbCB1bmRlciB3aGljaCB0aGUgYEluY3JlbWVudGFsRHJpdmVyYCBpcyBzdG9yZWQgb24gYSBgdHMuUHJvZ3JhbWAuXG4gKlxuICogVGhlIFRTIG1vZGVsIG9mIGluY3JlbWVudGFsIGNvbXBpbGF0aW9uIGlzIGJhc2VkIGFyb3VuZCByZXVzZSBvZiBhIHByZXZpb3VzIGB0cy5Qcm9ncmFtYCBpbiB0aGVcbiAqIGNvbnN0cnVjdGlvbiBvZiBhIG5ldyBvbmUuIFRoZSBgTmdDb21waWxlcmAgZm9sbG93cyB0aGlzIGFic3RyYWN0aW9uIC0gcGFzc2luZyBpbiBhIHByZXZpb3VzXG4gKiBgdHMuUHJvZ3JhbWAgaXMgc3VmZmljaWVudCB0byB0cmlnZ2VyIGluY3JlbWVudGFsIGNvbXBpbGF0aW9uLiBUaGlzIHByZXZpb3VzIGB0cy5Qcm9ncmFtYCBuZWVkXG4gKiBub3QgYmUgZnJvbSBhbiBBbmd1bGFyIGNvbXBpbGF0aW9uICh0aGF0IGlzLCBpdCBuZWVkIG5vdCBoYXZlIGJlZW4gY3JlYXRlZCBmcm9tIGBOZ0NvbXBpbGVyYCkuXG4gKlxuICogSWYgaXQgaXMsIHRob3VnaCwgQW5ndWxhciBjYW4gYmVuZWZpdCBmcm9tIHJldXNpbmcgcHJldmlvdXMgYW5hbHlzaXMgd29yay4gVGhpcyByZXVzZSBpcyBtYW5hZ2VkXG4gKiBieSB0aGUgYEluY3JlbWVudGFsRHJpdmVyYCwgd2hpY2ggaXMgaW5oZXJpdGVkIGZyb20gdGhlIG9sZCBwcm9ncmFtIHRvIHRoZSBuZXcgcHJvZ3JhbS4gVG9cbiAqIHN1cHBvcnQgdGhpcyBiZWhpbmQgdGhlIEFQSSBvZiBwYXNzaW5nIGFuIG9sZCBgdHMuUHJvZ3JhbWAsIHRoZSBgSW5jcmVtZW50YWxEcml2ZXJgIGlzIHN0b3JlZCBvblxuICogdGhlIGB0cy5Qcm9ncmFtYCB1bmRlciB0aGlzIHN5bWJvbC5cbiAqL1xuY29uc3QgU1lNX0lOQ1JFTUVOVEFMX0RSSVZFUiA9IFN5bWJvbCgnTmdJbmNyZW1lbnRhbERyaXZlcicpO1xuIl19