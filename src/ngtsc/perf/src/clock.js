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
        define("@angular/compiler-cli/src/ngtsc/perf/src/clock", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.timeSinceInMicros = exports.mark = void 0;
    function mark() {
        return process.hrtime();
    }
    exports.mark = mark;
    function timeSinceInMicros(mark) {
        var delta = process.hrtime(mark);
        return (delta[0] * 1000000) + Math.floor(delta[1] / 1000);
    }
    exports.timeSinceInMicros = timeSinceInMicros;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xvY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3BlcmYvc3JjL2Nsb2NrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQU9ILFNBQWdCLElBQUk7UUFDbEIsT0FBTyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDMUIsQ0FBQztJQUZELG9CQUVDO0lBRUQsU0FBZ0IsaUJBQWlCLENBQUMsSUFBWTtRQUM1QyxJQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25DLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDNUQsQ0FBQztJQUhELDhDQUdDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLyBUaGlzIGZpbGUgdXNlcyAncHJvY2Vzcydcbi8vLyA8cmVmZXJlbmNlIHR5cGVzPVwibm9kZVwiIC8+XG5cbmV4cG9ydCB0eXBlIEhyVGltZSA9IFtudW1iZXIsIG51bWJlcl07XG5cbmV4cG9ydCBmdW5jdGlvbiBtYXJrKCk6IEhyVGltZSB7XG4gIHJldHVybiBwcm9jZXNzLmhydGltZSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdGltZVNpbmNlSW5NaWNyb3MobWFyazogSHJUaW1lKTogbnVtYmVyIHtcbiAgY29uc3QgZGVsdGEgPSBwcm9jZXNzLmhydGltZShtYXJrKTtcbiAgcmV0dXJuIChkZWx0YVswXSAqIDEwMDAwMDApICsgTWF0aC5mbG9vcihkZWx0YVsxXSAvIDEwMDApO1xufVxuIl19