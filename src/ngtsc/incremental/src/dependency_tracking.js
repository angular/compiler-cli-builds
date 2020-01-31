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
        define("@angular/compiler-cli/src/ngtsc/incremental/src/dependency_tracking", ["require", "exports", "tslib"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * An implementation of the `DependencyTracker` dependency graph API.
     *
     * The `FileDependencyGraph`'s primary job is to determine whether a given file has "logically"
     * changed, given the set of physical changes (direct changes to files on disk).
     *
     * A file is logically changed if at least one of three conditions is met:
     *
     * 1. The file itself has physically changed.
     * 2. One of its dependencies has physically changed.
     * 3. One of its resource dependencies has physically changed.
     */
    var FileDependencyGraph = /** @class */ (function () {
        function FileDependencyGraph() {
            this.nodes = new Map();
        }
        FileDependencyGraph.prototype.addDependency = function (from, on) { this.nodeFor(from).dependsOn.add(on.fileName); };
        FileDependencyGraph.prototype.addResourceDependency = function (from, resource) {
            this.nodeFor(from).usesResources.add(resource);
        };
        FileDependencyGraph.prototype.addTransitiveDependency = function (from, on) {
            var e_1, _a;
            var nodeFrom = this.nodeFor(from);
            nodeFrom.dependsOn.add(on.fileName);
            var nodeOn = this.nodeFor(on);
            try {
                for (var _b = tslib_1.__values(nodeOn.dependsOn), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var dep = _c.value;
                    nodeFrom.dependsOn.add(dep);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        };
        FileDependencyGraph.prototype.addTransitiveResources = function (from, resourcesOf) {
            var e_2, _a;
            var nodeFrom = this.nodeFor(from);
            var nodeOn = this.nodeFor(resourcesOf);
            try {
                for (var _b = tslib_1.__values(nodeOn.usesResources), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var dep = _c.value;
                    nodeFrom.usesResources.add(dep);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
        };
        FileDependencyGraph.prototype.isStale = function (sf, changedTsPaths, changedResources) {
            return isLogicallyChanged(sf, this.nodeFor(sf), changedTsPaths, EMPTY_SET, changedResources);
        };
        /**
         * Update the current dependency graph from a previous one, incorporating a set of physical
         * changes.
         *
         * This method performs two tasks:
         *
         * 1. For files which have not logically changed, their dependencies from `previous` are added to
         *    `this` graph.
         * 2. For files which have logically changed, they're added to a set of logically changed files
         *    which is eventually returned.
         *
         * In essence, for build `n`, this method performs:
         *
         * G(n) + L(n) = G(n - 1) + P(n)
         *
         * where:
         *
         * G(n) = the dependency graph of build `n`
         * L(n) = the logically changed files from build n - 1 to build n.
         * P(n) = the physically changed files from build n - 1 to build n.
         */
        FileDependencyGraph.prototype.updateWithPhysicalChanges = function (previous, changedTsPaths, deletedTsPaths, changedResources) {
            var e_3, _a;
            var logicallyChanged = new Set();
            try {
                for (var _b = tslib_1.__values(previous.nodes.keys()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var sf = _c.value;
                    var node = previous.nodeFor(sf);
                    if (isLogicallyChanged(sf, node, changedTsPaths, deletedTsPaths, changedResources)) {
                        logicallyChanged.add(sf.fileName);
                    }
                    else if (!deletedTsPaths.has(sf.fileName)) {
                        this.nodes.set(sf, {
                            dependsOn: new Set(node.dependsOn),
                            usesResources: new Set(node.usesResources),
                        });
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return logicallyChanged;
        };
        FileDependencyGraph.prototype.nodeFor = function (sf) {
            if (!this.nodes.has(sf)) {
                this.nodes.set(sf, {
                    dependsOn: new Set(),
                    usesResources: new Set(),
                });
            }
            return this.nodes.get(sf);
        };
        return FileDependencyGraph;
    }());
    exports.FileDependencyGraph = FileDependencyGraph;
    /**
     * Determine whether `sf` has logically changed, given its dependencies and the set of physically
     * changed files and resources.
     */
    function isLogicallyChanged(sf, node, changedTsPaths, deletedTsPaths, changedResources) {
        var e_4, _a, e_5, _b;
        // A file is logically changed if it has physically changed itself (including being deleted).
        if (changedTsPaths.has(sf.fileName) || deletedTsPaths.has(sf.fileName)) {
            return true;
        }
        try {
            // A file is logically changed if one of its dependencies has physically cxhanged.
            for (var _c = tslib_1.__values(node.dependsOn), _d = _c.next(); !_d.done; _d = _c.next()) {
                var dep = _d.value;
                if (changedTsPaths.has(dep) || deletedTsPaths.has(dep)) {
                    return true;
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_4) throw e_4.error; }
        }
        try {
            // A file is logically changed if one of its resources has physically changed.
            for (var _e = tslib_1.__values(node.usesResources), _f = _e.next(); !_f.done; _f = _e.next()) {
                var dep = _f.value;
                if (changedResources.has(dep)) {
                    return true;
                }
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
            }
            finally { if (e_5) throw e_5.error; }
        }
        return false;
    }
    var EMPTY_SET = new Set();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeV90cmFja2luZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvaW5jcmVtZW50YWwvc3JjL2RlcGVuZGVuY3lfdHJhY2tpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBTUg7Ozs7Ozs7Ozs7O09BV0c7SUFDSDtRQUFBO1lBRVUsVUFBSyxHQUFHLElBQUksR0FBRyxFQUFlLENBQUM7UUFnRnpDLENBQUM7UUE5RUMsMkNBQWEsR0FBYixVQUFjLElBQU8sRUFBRSxFQUFLLElBQVUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdEYsbURBQXFCLEdBQXJCLFVBQXNCLElBQU8sRUFBRSxRQUFnQjtZQUM3QyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDakQsQ0FBQztRQUVELHFEQUF1QixHQUF2QixVQUF3QixJQUFPLEVBQUUsRUFBSzs7WUFDcEMsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNwQyxRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFcEMsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQzs7Z0JBQ2hDLEtBQWtCLElBQUEsS0FBQSxpQkFBQSxNQUFNLENBQUMsU0FBUyxDQUFBLGdCQUFBLDRCQUFFO29CQUEvQixJQUFNLEdBQUcsV0FBQTtvQkFDWixRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENB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O1lBQ2xGLEtBQWtCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsU0FBUyxDQUFBLGdCQUFBLDRCQUFFO2dCQUE3QixJQUFNLEdBQUcsV0FBQTtnQkFDWixJQUFJLGNBQWMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksY0FBYyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtvQkFDdEQsT0FBTyxJQUFJLENBQUM7aUJBQ2I7YUFDRjs7Ozs7Ozs7OztZQUVELDhFQUE4RTtZQUM5RSxLQUFrQixJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLGFBQWEsQ0FBQSxnQkFBQSw0QkFBRTtnQkFBakMsSUFBTSxHQUFHLFdBQUE7Z0JBQ1osSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQzdCLE9BQU8sSUFBSSxDQUFDO2lCQUNiO2FBQ0Y7Ozs7Ozs7OztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQU9ELElBQU0sU0FBUyxHQUFxQixJQUFJLEdBQUcsRUFBTyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtEZXBlbmRlbmN5VHJhY2tlcn0gZnJvbSAnLi4vYXBpJztcblxuLyoqXG4gKiBBbiBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgYERlcGVuZGVuY3lUcmFja2VyYCBkZXBlbmRlbmN5IGdyYXBoIEFQSS5cbiAqXG4gKiBUaGUgYEZpbGVEZXBlbmRlbmN5R3JhcGhgJ3MgcHJpbWFyeSBqb2IgaXMgdG8gZGV0ZXJtaW5lIHdoZXRoZXIgYSBnaXZlbiBmaWxlIGhhcyBcImxvZ2ljYWxseVwiXG4gKiBjaGFuZ2VkLCBnaXZlbiB0aGUgc2V0IG9mIHBoeXNpY2FsIGNoYW5nZXMgKGRpcmVjdCBjaGFuZ2VzIHRvIGZpbGVzIG9uIGRpc2spLlxuICpcbiAqIEEgZmlsZSBpcyBsb2dpY2FsbHkgY2hhbmdlZCBpZiBhdCBsZWFzdCBvbmUgb2YgdGhyZWUgY29uZGl0aW9ucyBpcyBtZXQ6XG4gKlxuICogMS4gVGhlIGZpbGUgaXRzZWxmIGhhcyBwaHlzaWNhbGx5IGNoYW5nZWQuXG4gKiAyLiBPbmUgb2YgaXRzIGRlcGVuZGVuY2llcyBoYXMgcGh5c2ljYWxseSBjaGFuZ2VkLlxuICogMy4gT25lIG9mIGl0cyByZXNvdXJjZSBkZXBlbmRlbmNpZXMgaGFzIHBoeXNpY2FsbHkgY2hhbmdlZC5cbiAqL1xuZXhwb3J0IGNsYXNzIEZpbGVEZXBlbmRlbmN5R3JhcGg8VCBleHRlbmRze2ZpbGVOYW1lOiBzdHJpbmd9ID0gdHMuU291cmNlRmlsZT4gaW1wbGVtZW50c1xuICAgIERlcGVuZGVuY3lUcmFja2VyPFQ+IHtcbiAgcHJpdmF0ZSBub2RlcyA9IG5ldyBNYXA8VCwgRmlsZU5vZGU+KCk7XG5cbiAgYWRkRGVwZW5kZW5jeShmcm9tOiBULCBvbjogVCk6IHZvaWQgeyB0aGlzLm5vZGVGb3IoZnJvbSkuZGVwZW5kc09uLmFkZChvbi5maWxlTmFtZSk7IH1cblxuICBhZGRSZXNvdXJjZURlcGVuZGVuY3koZnJvbTogVCwgcmVzb3VyY2U6IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMubm9kZUZvcihmcm9tKS51c2VzUmVzb3VyY2VzLmFkZChyZXNvdXJjZSk7XG4gIH1cblxuICBhZGRUcmFuc2l0aXZlRGVwZW5kZW5jeShmcm9tOiBULCBvbjogVCk6IHZvaWQge1xuICAgIGNvbnN0IG5vZGVGcm9tID0gdGhpcy5ub2RlRm9yKGZyb20pO1xuICAgIG5vZGVGcm9tLmRlcGVuZHNPbi5hZGQob24uZmlsZU5hbWUpO1xuXG4gICAgY29uc3Qgbm9kZU9uID0gdGhpcy5ub2RlRm9yKG9uKTtcbiAgICBmb3IgKGNvbnN0IGRlcCBvZiBub2RlT24uZGVwZW5kc09uKSB7XG4gICAgICBub2RlRnJvbS5kZXBlbmRzT24uYWRkKGRlcCk7XG4gICAgfVxuICB9XG5cbiAgYWRkVHJhbnNpdGl2ZVJlc291cmNlcyhmcm9tOiBULCByZXNvdXJjZXNPZjogVCk6IHZvaWQge1xuICAgIGNvbnN0IG5vZGVGcm9tID0gdGhpcy5ub2RlRm9yKGZyb20pO1xuICAgIGNvbnN0IG5vZGVPbiA9IHRoaXMubm9kZUZvcihyZXNvdXJjZXNPZik7XG4gICAgZm9yIChjb25zdCBkZXAgb2Ygbm9kZU9uLnVzZXNSZXNvdXJjZXMpIHtcbiAgICAgIG5vZGVGcm9tLnVzZXNSZXNvdXJjZXMuYWRkKGRlcCk7XG4gICAgfVxuICB9XG5cbiAgaXNTdGFsZShzZjogVCwgY2hhbmdlZFRzUGF0aHM6IFNldDxzdHJpbmc+LCBjaGFuZ2VkUmVzb3VyY2VzOiBTZXQ8c3RyaW5nPik6IGJvb2xlYW4ge1xuICAgIHJldHVybiBpc0xvZ2ljYWxseUNoYW5nZWQoc2YsIHRoaXMubm9kZUZvcihzZiksIGNoYW5nZWRUc1BhdGhzLCBFTVBUWV9TRVQsIGNoYW5nZWRSZXNvdXJjZXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZSB0aGUgY3VycmVudCBkZXBlbmRlbmN5IGdyYXBoIGZyb20gYSBwcmV2aW91cyBvbmUsIGluY29ycG9yYXRpbmcgYSBzZXQgb2YgcGh5c2ljYWxcbiAgICogY2hhbmdlcy5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgcGVyZm9ybXMgdHdvIHRhc2tzOlxuICAgKlxuICAgKiAxLiBGb3IgZmlsZXMgd2hpY2ggaGF2ZSBub3QgbG9naWNhbGx5IGNoYW5nZWQsIHRoZWlyIGRlcGVuZGVuY2llcyBmcm9tIGBwcmV2aW91c2AgYXJlIGFkZGVkIHRvXG4gICAqICAgIGB0aGlzYCBncmFwaC5cbiAgICogMi4gRm9yIGZpbGVzIHdoaWNoIGhhdmUgbG9naWNhbGx5IGNoYW5nZWQsIHRoZXkncmUgYWRkZWQgdG8gYSBzZXQgb2YgbG9naWNhbGx5IGNoYW5nZWQgZmlsZXNcbiAgICogICAgd2hpY2ggaXMgZXZlbnR1YWxseSByZXR1cm5lZC5cbiAgICpcbiAgICogSW4gZXNzZW5jZSwgZm9yIGJ1aWxkIGBuYCwgdGhpcyBtZXRob2QgcGVyZm9ybXM6XG4gICAqXG4gICAqIEcobikgKyBMKG4pID0gRyhuIC0gMSkgKyBQKG4pXG4gICAqXG4gICAqIHdoZXJlOlxuICAgKlxuICAgKiBHKG4pID0gdGhlIGRlcGVuZGVuY3kgZ3JhcGggb2YgYnVpbGQgYG5gXG4gICAqIEwobikgPSB0aGUgbG9naWNhbGx5IGNoYW5nZWQgZmlsZXMgZnJvbSBidWlsZCBuIC0gMSB0byBidWlsZCBuLlxuICAgKiBQKG4pID0gdGhlIHBoeXNpY2FsbHkgY2hhbmdlZCBmaWxlcyBmcm9tIGJ1aWxkIG4gLSAxIHRvIGJ1aWxkIG4uXG4gICAqL1xuICB1cGRhdGVXaXRoUGh5c2ljYWxDaGFuZ2VzKFxuICAgICAgcHJldmlvdXM6IEZpbGVEZXBlbmRlbmN5R3JhcGg8VD4sIGNoYW5nZWRUc1BhdGhzOiBTZXQ8c3RyaW5nPiwgZGVsZXRlZFRzUGF0aHM6IFNldDxzdHJpbmc+LFxuICAgICAgY2hhbmdlZFJlc291cmNlczogU2V0PHN0cmluZz4pOiBTZXQ8c3RyaW5nPiB7XG4gICAgY29uc3QgbG9naWNhbGx5Q2hhbmdlZCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gICAgZm9yIChjb25zdCBzZiBvZiBwcmV2aW91cy5ub2Rlcy5rZXlzKCkpIHtcbiAgICAgIGNvbnN0IG5vZGUgPSBwcmV2aW91cy5ub2RlRm9yKHNmKTtcbiAgICAgIGlmIChpc0xvZ2ljYWxseUNoYW5nZWQoc2YsIG5vZGUsIGNoYW5nZWRUc1BhdGhzLCBkZWxldGVkVHNQYXRocywgY2hhbmdlZFJlc291cmNlcykpIHtcbiAgICAgICAgbG9naWNhbGx5Q2hhbmdlZC5hZGQoc2YuZmlsZU5hbWUpO1xuICAgICAgfSBlbHNlIGlmICghZGVsZXRlZFRzUGF0aHMuaGFzKHNmLmZpbGVOYW1lKSkge1xuICAgICAgICB0aGlzLm5vZGVzLnNldChzZiwge1xuICAgICAgICAgIGRlcGVuZHNPbjogbmV3IFNldChub2RlLmRlcGVuZHNPbiksXG4gICAgICAgICAgdXNlc1Jlc291cmNlczogbmV3IFNldChub2RlLnVzZXNSZXNvdXJjZXMpLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbG9naWNhbGx5Q2hhbmdlZDtcbiAgfVxuXG4gIHByaXZhdGUgbm9kZUZvcihzZjogVCk6IEZpbGVOb2RlIHtcbiAgICBpZiAoIXRoaXMubm9kZXMuaGFzKHNmKSkge1xuICAgICAgdGhpcy5ub2Rlcy5zZXQoc2YsIHtcbiAgICAgICAgZGVwZW5kc09uOiBuZXcgU2V0PHN0cmluZz4oKSxcbiAgICAgICAgdXNlc1Jlc291cmNlczogbmV3IFNldDxzdHJpbmc+KCksXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubm9kZXMuZ2V0KHNmKSAhO1xuICB9XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIHdoZXRoZXIgYHNmYCBoYXMgbG9naWNhbGx5IGNoYW5nZWQsIGdpdmVuIGl0cyBkZXBlbmRlbmNpZXMgYW5kIHRoZSBzZXQgb2YgcGh5c2ljYWxseVxuICogY2hhbmdlZCBmaWxlcyBhbmQgcmVzb3VyY2VzLlxuICovXG5mdW5jdGlvbiBpc0xvZ2ljYWxseUNoYW5nZWQ8VCBleHRlbmRze2ZpbGVOYW1lOiBzdHJpbmd9PihcbiAgICBzZjogVCwgbm9kZTogRmlsZU5vZGUsIGNoYW5nZWRUc1BhdGhzOiBSZWFkb25seVNldDxzdHJpbmc+LCBkZWxldGVkVHNQYXRoczogUmVhZG9ubHlTZXQ8c3RyaW5nPixcbiAgICBjaGFuZ2VkUmVzb3VyY2VzOiBSZWFkb25seVNldDxzdHJpbmc+KTogYm9vbGVhbiB7XG4gIC8vIEEgZmlsZSBpcyBsb2dpY2FsbHkgY2hhbmdlZCBpZiBpdCBoYXMgcGh5c2ljYWxseSBjaGFuZ2VkIGl0c2VsZiAoaW5jbHVkaW5nIGJlaW5nIGRlbGV0ZWQpLlxuICBpZiAoY2hhbmdlZFRzUGF0aHMuaGFzKHNmLmZpbGVOYW1lKSB8fCBkZWxldGVkVHNQYXRocy5oYXMoc2YuZmlsZU5hbWUpKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBBIGZpbGUgaXMgbG9naWNhbGx5IGNoYW5nZWQgaWYgb25lIG9mIGl0cyBkZXBlbmRlbmNpZXMgaGFzIHBoeXNpY2FsbHkgY3hoYW5nZWQuXG4gIGZvciAoY29uc3QgZGVwIG9mIG5vZGUuZGVwZW5kc09uKSB7XG4gICAgaWYgKGNoYW5nZWRUc1BhdGhzLmhhcyhkZXApIHx8IGRlbGV0ZWRUc1BhdGhzLmhhcyhkZXApKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICAvLyBBIGZpbGUgaXMgbG9naWNhbGx5IGNoYW5nZWQgaWYgb25lIG9mIGl0cyByZXNvdXJjZXMgaGFzIHBoeXNpY2FsbHkgY2hhbmdlZC5cbiAgZm9yIChjb25zdCBkZXAgb2Ygbm9kZS51c2VzUmVzb3VyY2VzKSB7XG4gICAgaWYgKGNoYW5nZWRSZXNvdXJjZXMuaGFzKGRlcCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmludGVyZmFjZSBGaWxlTm9kZSB7XG4gIGRlcGVuZHNPbjogU2V0PHN0cmluZz47XG4gIHVzZXNSZXNvdXJjZXM6IFNldDxzdHJpbmc+O1xufVxuXG5jb25zdCBFTVBUWV9TRVQ6IFJlYWRvbmx5U2V0PGFueT4gPSBuZXcgU2V0PGFueT4oKTtcbiJdfQ==