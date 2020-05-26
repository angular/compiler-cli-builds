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
        define("@angular/compiler-cli/src/ngtsc/perf/src/noop", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NOOP_PERF_RECORDER = void 0;
    exports.NOOP_PERF_RECORDER = {
        enabled: false,
        mark: function (name, node, category, detail) { },
        start: function (name, node, category, detail) {
            return 0;
        },
        stop: function (span) { },
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9vcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcGVyZi9zcmMvbm9vcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFNVSxRQUFBLGtCQUFrQixHQUFpQjtRQUM5QyxPQUFPLEVBQUUsS0FBSztRQUNkLElBQUksRUFBRSxVQUFDLElBQVksRUFBRSxJQUFrQyxFQUFFLFFBQWlCLEVBQUUsTUFBZSxJQUM5RSxDQUFDO1FBQ2QsS0FBSyxFQUFFLFVBQUMsSUFBWSxFQUFFLElBQWtDLEVBQUUsUUFBaUIsRUFBRSxNQUFlO1lBRXRGLE9BQU8sQ0FBQyxDQUFDO1FBQ1gsQ0FBQztRQUNMLElBQUksRUFBRSxVQUFDLElBQWtCLElBQVksQ0FBQztLQUN2QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtQZXJmUmVjb3JkZXJ9IGZyb20gJy4vYXBpJztcblxuZXhwb3J0IGNvbnN0IE5PT1BfUEVSRl9SRUNPUkRFUjogUGVyZlJlY29yZGVyID0ge1xuICBlbmFibGVkOiBmYWxzZSxcbiAgbWFyazogKG5hbWU6IHN0cmluZywgbm9kZTogdHMuU291cmNlRmlsZXx0cy5EZWNsYXJhdGlvbiwgY2F0ZWdvcnk/OiBzdHJpbmcsIGRldGFpbD86IHN0cmluZyk6XG4gICAgICB2b2lkID0+IHt9LFxuICBzdGFydDogKG5hbWU6IHN0cmluZywgbm9kZTogdHMuU291cmNlRmlsZXx0cy5EZWNsYXJhdGlvbiwgY2F0ZWdvcnk/OiBzdHJpbmcsIGRldGFpbD86IHN0cmluZyk6XG4gICAgICBudW1iZXIgPT4ge1xuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH0sXG4gIHN0b3A6IChzcGFuOiBudW1iZXJ8ZmFsc2UpOiB2b2lkID0+IHt9LFxufTtcbiJdfQ==