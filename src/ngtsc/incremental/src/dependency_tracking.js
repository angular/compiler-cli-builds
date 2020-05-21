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
    exports.FileDependencyGraph = void 0;
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
        FileDependencyGraph.prototype.addDependency = function (from, on) {
            this.nodeFor(from).dependsOn.add(on.fileName);
        };
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
            // A file is logically changed if one of its dependencies has physically changed.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeV90cmFja2luZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvaW5jcmVtZW50YWwvc3JjL2RlcGVuZGVuY3lfdHJhY2tpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQU9IOzs7Ozs7Ozs7OztPQVdHO0lBQ0g7UUFBQTtZQUVVLFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBZSxDQUFDO1FBa0Z6QyxDQUFDO1FBaEZDLDJDQUFhLEdBQWIsVUFBYyxJQUFPLEVBQUUsRUFBSztZQUMxQixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2hELENBQUM7UUFFRCxtREFBcUIsR0FBckIsVUFBc0IsSUFBTyxFQUFFLFFBQXdCO1lBQ3JELElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNqRCxDQUFDO1FBRUQscURBQXVCLEdBQXZCLFVBQXdCLElBQU8sRUFBRSxFQUFLOztZQUNwQyxJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3BDLFFBQVEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUVwQyxJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDOztnQkFDaEMsS0FBa0IsSUFBQSxLQUFBLGlCQUFBLE1BQU0sQ0FBQyxTQUFTLENBQUEsZ0JBQUEsNEJBQUU7b0JBQS9CLElBQU0sR0FBRyxXQUFBO29CQUNaLFFBQVEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcs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QWlGO1lBQ2pGLEtBQWtCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsU0FBUyxDQUFBLGdCQUFBLDRCQUFFO2dCQUE3QixJQUFNLEdBQUcsV0FBQTtnQkFDWixJQUFJLGNBQWMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksY0FBYyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtvQkFDdEQsT0FBTyxJQUFJLENBQUM7aUJBQ2I7YUFDRjs7Ozs7Ozs7OztZQUVELDhFQUE4RTtZQUM5RSxLQUFrQixJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLGFBQWEsQ0FBQSxnQkFBQSw0QkFBRTtnQkFBakMsSUFBTSxHQUFHLFdBQUE7Z0JBQ1osSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQzdCLE9BQU8sSUFBSSxDQUFDO2lCQUNiO2FBQ0Y7Ozs7Ozs7OztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQU9ELElBQU0sU0FBUyxHQUFxQixJQUFJLEdBQUcsRUFBTyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtEZXBlbmRlbmN5VHJhY2tlcn0gZnJvbSAnLi4vYXBpJztcblxuLyoqXG4gKiBBbiBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgYERlcGVuZGVuY3lUcmFja2VyYCBkZXBlbmRlbmN5IGdyYXBoIEFQSS5cbiAqXG4gKiBUaGUgYEZpbGVEZXBlbmRlbmN5R3JhcGhgJ3MgcHJpbWFyeSBqb2IgaXMgdG8gZGV0ZXJtaW5lIHdoZXRoZXIgYSBnaXZlbiBmaWxlIGhhcyBcImxvZ2ljYWxseVwiXG4gKiBjaGFuZ2VkLCBnaXZlbiB0aGUgc2V0IG9mIHBoeXNpY2FsIGNoYW5nZXMgKGRpcmVjdCBjaGFuZ2VzIHRvIGZpbGVzIG9uIGRpc2spLlxuICpcbiAqIEEgZmlsZSBpcyBsb2dpY2FsbHkgY2hhbmdlZCBpZiBhdCBsZWFzdCBvbmUgb2YgdGhyZWUgY29uZGl0aW9ucyBpcyBtZXQ6XG4gKlxuICogMS4gVGhlIGZpbGUgaXRzZWxmIGhhcyBwaHlzaWNhbGx5IGNoYW5nZWQuXG4gKiAyLiBPbmUgb2YgaXRzIGRlcGVuZGVuY2llcyBoYXMgcGh5c2ljYWxseSBjaGFuZ2VkLlxuICogMy4gT25lIG9mIGl0cyByZXNvdXJjZSBkZXBlbmRlbmNpZXMgaGFzIHBoeXNpY2FsbHkgY2hhbmdlZC5cbiAqL1xuZXhwb3J0IGNsYXNzIEZpbGVEZXBlbmRlbmN5R3JhcGg8VCBleHRlbmRzIHtmaWxlTmFtZTogc3RyaW5nfSA9IHRzLlNvdXJjZUZpbGU+IGltcGxlbWVudHNcbiAgICBEZXBlbmRlbmN5VHJhY2tlcjxUPiB7XG4gIHByaXZhdGUgbm9kZXMgPSBuZXcgTWFwPFQsIEZpbGVOb2RlPigpO1xuXG4gIGFkZERlcGVuZGVuY3koZnJvbTogVCwgb246IFQpOiB2b2lkIHtcbiAgICB0aGlzLm5vZGVGb3IoZnJvbSkuZGVwZW5kc09uLmFkZChvbi5maWxlTmFtZSk7XG4gIH1cblxuICBhZGRSZXNvdXJjZURlcGVuZGVuY3koZnJvbTogVCwgcmVzb3VyY2U6IEFic29sdXRlRnNQYXRoKTogdm9pZCB7XG4gICAgdGhpcy5ub2RlRm9yKGZyb20pLnVzZXNSZXNvdXJjZXMuYWRkKHJlc291cmNlKTtcbiAgfVxuXG4gIGFkZFRyYW5zaXRpdmVEZXBlbmRlbmN5KGZyb206IFQsIG9uOiBUKTogdm9pZCB7XG4gICAgY29uc3Qgbm9kZUZyb20gPSB0aGlzLm5vZGVGb3IoZnJvbSk7XG4gICAgbm9kZUZyb20uZGVwZW5kc09uLmFkZChvbi5maWxlTmFtZSk7XG5cbiAgICBjb25zdCBub2RlT24gPSB0aGlzLm5vZGVGb3Iob24pO1xuICAgIGZvciAoY29uc3QgZGVwIG9mIG5vZGVPbi5kZXBlbmRzT24pIHtcbiAgICAgIG5vZGVGcm9tLmRlcGVuZHNPbi5hZGQoZGVwKTtcbiAgICB9XG4gIH1cblxuICBhZGRUcmFuc2l0aXZlUmVzb3VyY2VzKGZyb206IFQsIHJlc291cmNlc09mOiBUKTogdm9pZCB7XG4gICAgY29uc3Qgbm9kZUZyb20gPSB0aGlzLm5vZGVGb3IoZnJvbSk7XG4gICAgY29uc3Qgbm9kZU9uID0gdGhpcy5ub2RlRm9yKHJlc291cmNlc09mKTtcbiAgICBmb3IgKGNvbnN0IGRlcCBvZiBub2RlT24udXNlc1Jlc291cmNlcykge1xuICAgICAgbm9kZUZyb20udXNlc1Jlc291cmNlcy5hZGQoZGVwKTtcbiAgICB9XG4gIH1cblxuICBpc1N0YWxlKHNmOiBULCBjaGFuZ2VkVHNQYXRoczogU2V0PHN0cmluZz4sIGNoYW5nZWRSZXNvdXJjZXM6IFNldDxBYnNvbHV0ZUZzUGF0aD4pOiBib29sZWFuIHtcbiAgICByZXR1cm4gaXNMb2dpY2FsbHlDaGFuZ2VkKHNmLCB0aGlzLm5vZGVGb3Ioc2YpLCBjaGFuZ2VkVHNQYXRocywgRU1QVFlfU0VULCBjaGFuZ2VkUmVzb3VyY2VzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGUgdGhlIGN1cnJlbnQgZGVwZW5kZW5jeSBncmFwaCBmcm9tIGEgcHJldmlvdXMgb25lLCBpbmNvcnBvcmF0aW5nIGEgc2V0IG9mIHBoeXNpY2FsXG4gICAqIGNoYW5nZXMuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIHBlcmZvcm1zIHR3byB0YXNrczpcbiAgICpcbiAgICogMS4gRm9yIGZpbGVzIHdoaWNoIGhhdmUgbm90IGxvZ2ljYWxseSBjaGFuZ2VkLCB0aGVpciBkZXBlbmRlbmNpZXMgZnJvbSBgcHJldmlvdXNgIGFyZSBhZGRlZCB0b1xuICAgKiAgICBgdGhpc2AgZ3JhcGguXG4gICAqIDIuIEZvciBmaWxlcyB3aGljaCBoYXZlIGxvZ2ljYWxseSBjaGFuZ2VkLCB0aGV5J3JlIGFkZGVkIHRvIGEgc2V0IG9mIGxvZ2ljYWxseSBjaGFuZ2VkIGZpbGVzXG4gICAqICAgIHdoaWNoIGlzIGV2ZW50dWFsbHkgcmV0dXJuZWQuXG4gICAqXG4gICAqIEluIGVzc2VuY2UsIGZvciBidWlsZCBgbmAsIHRoaXMgbWV0aG9kIHBlcmZvcm1zOlxuICAgKlxuICAgKiBHKG4pICsgTChuKSA9IEcobiAtIDEpICsgUChuKVxuICAgKlxuICAgKiB3aGVyZTpcbiAgICpcbiAgICogRyhuKSA9IHRoZSBkZXBlbmRlbmN5IGdyYXBoIG9mIGJ1aWxkIGBuYFxuICAgKiBMKG4pID0gdGhlIGxvZ2ljYWxseSBjaGFuZ2VkIGZpbGVzIGZyb20gYnVpbGQgbiAtIDEgdG8gYnVpbGQgbi5cbiAgICogUChuKSA9IHRoZSBwaHlzaWNhbGx5IGNoYW5nZWQgZmlsZXMgZnJvbSBidWlsZCBuIC0gMSB0byBidWlsZCBuLlxuICAgKi9cbiAgdXBkYXRlV2l0aFBoeXNpY2FsQ2hhbmdlcyhcbiAgICAgIHByZXZpb3VzOiBGaWxlRGVwZW5kZW5jeUdyYXBoPFQ+LCBjaGFuZ2VkVHNQYXRoczogU2V0PHN0cmluZz4sIGRlbGV0ZWRUc1BhdGhzOiBTZXQ8c3RyaW5nPixcbiAgICAgIGNoYW5nZWRSZXNvdXJjZXM6IFNldDxBYnNvbHV0ZUZzUGF0aD4pOiBTZXQ8c3RyaW5nPiB7XG4gICAgY29uc3QgbG9naWNhbGx5Q2hhbmdlZCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gICAgZm9yIChjb25zdCBzZiBvZiBwcmV2aW91cy5ub2Rlcy5rZXlzKCkpIHtcbiAgICAgIGNvbnN0IG5vZGUgPSBwcmV2aW91cy5ub2RlRm9yKHNmKTtcbiAgICAgIGlmIChpc0xvZ2ljYWxseUNoYW5nZWQoc2YsIG5vZGUsIGNoYW5nZWRUc1BhdGhzLCBkZWxldGVkVHNQYXRocywgY2hhbmdlZFJlc291cmNlcykpIHtcbiAgICAgICAgbG9naWNhbGx5Q2hhbmdlZC5hZGQoc2YuZmlsZU5hbWUpO1xuICAgICAgfSBlbHNlIGlmICghZGVsZXRlZFRzUGF0aHMuaGFzKHNmLmZpbGVOYW1lKSkge1xuICAgICAgICB0aGlzLm5vZGVzLnNldChzZiwge1xuICAgICAgICAgIGRlcGVuZHNPbjogbmV3IFNldChub2RlLmRlcGVuZHNPbiksXG4gICAgICAgICAgdXNlc1Jlc291cmNlczogbmV3IFNldChub2RlLnVzZXNSZXNvdXJjZXMpLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbG9naWNhbGx5Q2hhbmdlZDtcbiAgfVxuXG4gIHByaXZhdGUgbm9kZUZvcihzZjogVCk6IEZpbGVOb2RlIHtcbiAgICBpZiAoIXRoaXMubm9kZXMuaGFzKHNmKSkge1xuICAgICAgdGhpcy5ub2Rlcy5zZXQoc2YsIHtcbiAgICAgICAgZGVwZW5kc09uOiBuZXcgU2V0PHN0cmluZz4oKSxcbiAgICAgICAgdXNlc1Jlc291cmNlczogbmV3IFNldDxBYnNvbHV0ZUZzUGF0aD4oKSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5ub2Rlcy5nZXQoc2YpITtcbiAgfVxufVxuXG4vKipcbiAqIERldGVybWluZSB3aGV0aGVyIGBzZmAgaGFzIGxvZ2ljYWxseSBjaGFuZ2VkLCBnaXZlbiBpdHMgZGVwZW5kZW5jaWVzIGFuZCB0aGUgc2V0IG9mIHBoeXNpY2FsbHlcbiAqIGNoYW5nZWQgZmlsZXMgYW5kIHJlc291cmNlcy5cbiAqL1xuZnVuY3Rpb24gaXNMb2dpY2FsbHlDaGFuZ2VkPFQgZXh0ZW5kcyB7ZmlsZU5hbWU6IHN0cmluZ30+KFxuICAgIHNmOiBULCBub2RlOiBGaWxlTm9kZSwgY2hhbmdlZFRzUGF0aHM6IFJlYWRvbmx5U2V0PHN0cmluZz4sIGRlbGV0ZWRUc1BhdGhzOiBSZWFkb25seVNldDxzdHJpbmc+LFxuICAgIGNoYW5nZWRSZXNvdXJjZXM6IFJlYWRvbmx5U2V0PEFic29sdXRlRnNQYXRoPik6IGJvb2xlYW4ge1xuICAvLyBBIGZpbGUgaXMgbG9naWNhbGx5IGNoYW5nZWQgaWYgaXQgaGFzIHBoeXNpY2FsbHkgY2hhbmdlZCBpdHNlbGYgKGluY2x1ZGluZyBiZWluZyBkZWxldGVkKS5cbiAgaWYgKGNoYW5nZWRUc1BhdGhzLmhhcyhzZi5maWxlTmFtZSkgfHwgZGVsZXRlZFRzUGF0aHMuaGFzKHNmLmZpbGVOYW1lKSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gQSBmaWxlIGlzIGxvZ2ljYWxseSBjaGFuZ2VkIGlmIG9uZSBvZiBpdHMgZGVwZW5kZW5jaWVzIGhhcyBwaHlzaWNhbGx5IGNoYW5nZWQuXG4gIGZvciAoY29uc3QgZGVwIG9mIG5vZGUuZGVwZW5kc09uKSB7XG4gICAgaWYgKGNoYW5nZWRUc1BhdGhzLmhhcyhkZXApIHx8IGRlbGV0ZWRUc1BhdGhzLmhhcyhkZXApKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICAvLyBBIGZpbGUgaXMgbG9naWNhbGx5IGNoYW5nZWQgaWYgb25lIG9mIGl0cyByZXNvdXJjZXMgaGFzIHBoeXNpY2FsbHkgY2hhbmdlZC5cbiAgZm9yIChjb25zdCBkZXAgb2Ygbm9kZS51c2VzUmVzb3VyY2VzKSB7XG4gICAgaWYgKGNoYW5nZWRSZXNvdXJjZXMuaGFzKGRlcCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmludGVyZmFjZSBGaWxlTm9kZSB7XG4gIGRlcGVuZHNPbjogU2V0PHN0cmluZz47XG4gIHVzZXNSZXNvdXJjZXM6IFNldDxBYnNvbHV0ZUZzUGF0aD47XG59XG5cbmNvbnN0IEVNUFRZX1NFVDogUmVhZG9ubHlTZXQ8YW55PiA9IG5ldyBTZXQ8YW55PigpO1xuIl19