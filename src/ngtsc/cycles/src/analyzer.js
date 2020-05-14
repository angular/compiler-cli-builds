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
        define("@angular/compiler-cli/src/ngtsc/cycles/src/analyzer", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CycleAnalyzer = void 0;
    /**
     * Analyzes a `ts.Program` for cycles.
     */
    var CycleAnalyzer = /** @class */ (function () {
        function CycleAnalyzer(importGraph) {
            this.importGraph = importGraph;
        }
        /**
         * Check whether adding an import from `from` to `to` would create a cycle in the `ts.Program`.
         */
        CycleAnalyzer.prototype.wouldCreateCycle = function (from, to) {
            // Import of 'from' -> 'to' is illegal if an edge 'to' -> 'from' already exists.
            return this.importGraph.transitiveImportsOf(to).has(from);
        };
        /**
         * Record a synthetic import from `from` to `to`.
         *
         * This is an import that doesn't exist in the `ts.Program` but will be considered as part of the
         * import graph for cycle creation.
         */
        CycleAnalyzer.prototype.recordSyntheticImport = function (from, to) {
            this.importGraph.addSyntheticImport(from, to);
        };
        return CycleAnalyzer;
    }());
    exports.CycleAnalyzer = CycleAnalyzer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl6ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2N5Y2xlcy9zcmMvYW5hbHl6ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBTUg7O09BRUc7SUFDSDtRQUNFLHVCQUFvQixXQUF3QjtZQUF4QixnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUFHLENBQUM7UUFFaEQ7O1dBRUc7UUFDSCx3Q0FBZ0IsR0FBaEIsVUFBaUIsSUFBbUIsRUFBRSxFQUFpQjtZQUNyRCxnRkFBZ0Y7WUFDaEYsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1RCxDQUFDO1FBRUQ7Ozs7O1dBS0c7UUFDSCw2Q0FBcUIsR0FBckIsVUFBc0IsSUFBbUIsRUFBRSxFQUFpQjtZQUMxRCxJQUFJLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNoRCxDQUFDO1FBQ0gsb0JBQUM7SUFBRCxDQUFDLEFBcEJELElBb0JDO0lBcEJZLHNDQUFhIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtJbXBvcnRHcmFwaH0gZnJvbSAnLi9pbXBvcnRzJztcblxuLyoqXG4gKiBBbmFseXplcyBhIGB0cy5Qcm9ncmFtYCBmb3IgY3ljbGVzLlxuICovXG5leHBvcnQgY2xhc3MgQ3ljbGVBbmFseXplciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgaW1wb3J0R3JhcGg6IEltcG9ydEdyYXBoKSB7fVxuXG4gIC8qKlxuICAgKiBDaGVjayB3aGV0aGVyIGFkZGluZyBhbiBpbXBvcnQgZnJvbSBgZnJvbWAgdG8gYHRvYCB3b3VsZCBjcmVhdGUgYSBjeWNsZSBpbiB0aGUgYHRzLlByb2dyYW1gLlxuICAgKi9cbiAgd291bGRDcmVhdGVDeWNsZShmcm9tOiB0cy5Tb3VyY2VGaWxlLCB0bzogdHMuU291cmNlRmlsZSk6IGJvb2xlYW4ge1xuICAgIC8vIEltcG9ydCBvZiAnZnJvbScgLT4gJ3RvJyBpcyBpbGxlZ2FsIGlmIGFuIGVkZ2UgJ3RvJyAtPiAnZnJvbScgYWxyZWFkeSBleGlzdHMuXG4gICAgcmV0dXJuIHRoaXMuaW1wb3J0R3JhcGgudHJhbnNpdGl2ZUltcG9ydHNPZih0bykuaGFzKGZyb20pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlY29yZCBhIHN5bnRoZXRpYyBpbXBvcnQgZnJvbSBgZnJvbWAgdG8gYHRvYC5cbiAgICpcbiAgICogVGhpcyBpcyBhbiBpbXBvcnQgdGhhdCBkb2Vzbid0IGV4aXN0IGluIHRoZSBgdHMuUHJvZ3JhbWAgYnV0IHdpbGwgYmUgY29uc2lkZXJlZCBhcyBwYXJ0IG9mIHRoZVxuICAgKiBpbXBvcnQgZ3JhcGggZm9yIGN5Y2xlIGNyZWF0aW9uLlxuICAgKi9cbiAgcmVjb3JkU3ludGhldGljSW1wb3J0KGZyb206IHRzLlNvdXJjZUZpbGUsIHRvOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgdGhpcy5pbXBvcnRHcmFwaC5hZGRTeW50aGV0aWNJbXBvcnQoZnJvbSwgdG8pO1xuICB9XG59XG4iXX0=