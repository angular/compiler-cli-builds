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
        define("@angular/compiler-cli/src/ngtsc/entry_point/src/reference_graph", ["require", "exports", "tslib"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ReferenceGraph = void 0;
    var tslib_1 = require("tslib");
    var ReferenceGraph = /** @class */ (function () {
        function ReferenceGraph() {
            this.references = new Map();
        }
        ReferenceGraph.prototype.add = function (from, to) {
            if (!this.references.has(from)) {
                this.references.set(from, new Set());
            }
            this.references.get(from).add(to);
        };
        ReferenceGraph.prototype.transitiveReferencesOf = function (target) {
            var set = new Set();
            this.collectTransitiveReferences(set, target);
            return set;
        };
        ReferenceGraph.prototype.pathFrom = function (source, target) {
            return this.collectPathFrom(source, target, new Set());
        };
        ReferenceGraph.prototype.collectPathFrom = function (source, target, seen) {
            var _this = this;
            if (source === target) {
                // Looking for a path from the target to itself - that path is just the target. This is the
                // "base case" of the search.
                return [target];
            }
            else if (seen.has(source)) {
                // The search has already looked through this source before.
                return null;
            }
            // Consider outgoing edges from `source`.
            seen.add(source);
            if (!this.references.has(source)) {
                // There are no outgoing edges from `source`.
                return null;
            }
            else {
                // Look through the outgoing edges of `source`.
                // TODO(alxhub): use proper iteration when the legacy build is removed. (#27762)
                var candidatePath_1 = null;
                this.references.get(source).forEach(function (edge) {
                    // Early exit if a path has already been found.
                    if (candidatePath_1 !== null) {
                        return;
                    }
                    // Look for a path from this outgoing edge to `target`.
                    var partialPath = _this.collectPathFrom(edge, target, seen);
                    if (partialPath !== null) {
                        // A path exists from `edge` to `target`. Insert `source` at the beginning.
                        candidatePath_1 = tslib_1.__spread([source], partialPath);
                    }
                });
                return candidatePath_1;
            }
        };
        ReferenceGraph.prototype.collectTransitiveReferences = function (set, decl) {
            var _this = this;
            if (this.references.has(decl)) {
                // TODO(alxhub): use proper iteration when the legacy build is removed. (#27762)
                this.references.get(decl).forEach(function (ref) {
                    if (!set.has(ref)) {
                        set.add(ref);
                        _this.collectTransitiveReferences(set, ref);
                    }
                });
            }
        };
        return ReferenceGraph;
    }());
    exports.ReferenceGraph = ReferenceGraph;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlX2dyYXBoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9lbnRyeV9wb2ludC9zcmMvcmVmZXJlbmNlX2dyYXBoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFJSDtRQUFBO1lBQ1UsZUFBVSxHQUFHLElBQUksR0FBRyxFQUFhLENBQUM7UUFrRTVDLENBQUM7UUFoRUMsNEJBQUcsR0FBSCxVQUFJLElBQU8sRUFBRSxFQUFLO1lBQ2hCLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDOUIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQzthQUN0QztZQUNELElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNyQyxDQUFDO1FBRUQsK0NBQXNCLEdBQXRCLFVBQXVCLE1BQVM7WUFDOUIsSUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQUssQ0FBQztZQUN6QixJQUFJLENBQUMsMkJBQTJCLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQzlDLE9BQU8sR0FBRyxDQUFDO1FBQ2IsQ0FBQztRQUVELGlDQUFRLEdBQVIsVUFBUyxNQUFTLEVBQUUsTUFBUztZQUMzQixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDekQsQ0FBQztRQUVPLHdDQUFlLEdBQXZCLFVBQXdCLE1BQVMsRUFBRSxNQUFTLEVBQUUsSUFBWTtZQUExRCxpQkFrQ0M7WUFqQ0MsSUFBSSxNQUFNLEtBQUssTUFBTSxFQUFFO2dCQUNyQiwyRkFBMkY7Z0JBQzNGLDZCQUE2QjtnQkFDN0IsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQ2pCO2lCQUFNLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDM0IsNERBQTREO2dCQUM1RCxPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QseUNBQXlDO1lBQ3pDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFakIsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUNoQyw2Q0FBNkM7Z0JBQzdDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7aUJBQU07Z0JBQ0wsK0NBQStDO2dCQUMvQyxnRkFBZ0Y7Z0JBQ2hGLElBQUksZUFBYSxHQUFhLElBQUksQ0FBQztnQkFDbkMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFFLENBQUMsT0FBTyxDQUFDLFVBQUEsSUFBSTtvQkFDdkMsK0NBQStDO29CQUMvQyxJQUFJLGVBQWEsS0FBSyxJQUFJLEVBQUU7d0JBQzFCLE9BQU87cUJBQ1I7b0JBQ0QsdURBQXVEO29CQUN2RCxJQUFNLFdBQVcsR0FBRyxLQUFJLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQzdELElBQUksV0FBVyxLQUFLLElBQUksRUFBRTt3QkFDeEIsMkVBQTJFO3dCQUMzRSxlQUFhLHFCQUFJLE1BQU0sR0FBSyxXQUFXLENBQUMsQ0FBQztxQkFDMUM7Z0JBQ0gsQ0FBQyxDQUFDLENBQUM7Z0JBRUgsT0FBTyxlQUFhLENBQUM7YUFDdEI7UUFDSCxDQUFDO1FBRU8sb0RBQTJCLEdBQW5DLFVBQW9DLEdBQVcsRUFBRSxJQUFPO1lBQXhELGlCQVVDO1lBVEMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDN0IsZ0ZBQWdGO2dCQUNoRixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQyxPQUFPLENBQUMsVUFBQSxHQUFHO29CQUNwQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTt3QkFDakIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDYixLQUFJLENBQUMsMkJBQTJCLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO3FCQUM1QztnQkFDSCxDQUFDLENBQUMsQ0FBQzthQUNKO1FBQ0gsQ0FBQztRQUNILHFCQUFDO0lBQUQsQ0FBQyxBQW5FRCxJQW1FQztJQW5FWSx3Q0FBYyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmV4cG9ydCBjbGFzcyBSZWZlcmVuY2VHcmFwaDxUID0gdHMuRGVjbGFyYXRpb24+IHtcbiAgcHJpdmF0ZSByZWZlcmVuY2VzID0gbmV3IE1hcDxULCBTZXQ8VD4+KCk7XG5cbiAgYWRkKGZyb206IFQsIHRvOiBUKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLnJlZmVyZW5jZXMuaGFzKGZyb20pKSB7XG4gICAgICB0aGlzLnJlZmVyZW5jZXMuc2V0KGZyb20sIG5ldyBTZXQoKSk7XG4gICAgfVxuICAgIHRoaXMucmVmZXJlbmNlcy5nZXQoZnJvbSkhLmFkZCh0byk7XG4gIH1cblxuICB0cmFuc2l0aXZlUmVmZXJlbmNlc09mKHRhcmdldDogVCk6IFNldDxUPiB7XG4gICAgY29uc3Qgc2V0ID0gbmV3IFNldDxUPigpO1xuICAgIHRoaXMuY29sbGVjdFRyYW5zaXRpdmVSZWZlcmVuY2VzKHNldCwgdGFyZ2V0KTtcbiAgICByZXR1cm4gc2V0O1xuICB9XG5cbiAgcGF0aEZyb20oc291cmNlOiBULCB0YXJnZXQ6IFQpOiBUW118bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuY29sbGVjdFBhdGhGcm9tKHNvdXJjZSwgdGFyZ2V0LCBuZXcgU2V0KCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBjb2xsZWN0UGF0aEZyb20oc291cmNlOiBULCB0YXJnZXQ6IFQsIHNlZW46IFNldDxUPik6IFRbXXxudWxsIHtcbiAgICBpZiAoc291cmNlID09PSB0YXJnZXQpIHtcbiAgICAgIC8vIExvb2tpbmcgZm9yIGEgcGF0aCBmcm9tIHRoZSB0YXJnZXQgdG8gaXRzZWxmIC0gdGhhdCBwYXRoIGlzIGp1c3QgdGhlIHRhcmdldC4gVGhpcyBpcyB0aGVcbiAgICAgIC8vIFwiYmFzZSBjYXNlXCIgb2YgdGhlIHNlYXJjaC5cbiAgICAgIHJldHVybiBbdGFyZ2V0XTtcbiAgICB9IGVsc2UgaWYgKHNlZW4uaGFzKHNvdXJjZSkpIHtcbiAgICAgIC8vIFRoZSBzZWFyY2ggaGFzIGFscmVhZHkgbG9va2VkIHRocm91Z2ggdGhpcyBzb3VyY2UgYmVmb3JlLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIC8vIENvbnNpZGVyIG91dGdvaW5nIGVkZ2VzIGZyb20gYHNvdXJjZWAuXG4gICAgc2Vlbi5hZGQoc291cmNlKTtcblxuICAgIGlmICghdGhpcy5yZWZlcmVuY2VzLmhhcyhzb3VyY2UpKSB7XG4gICAgICAvLyBUaGVyZSBhcmUgbm8gb3V0Z29pbmcgZWRnZXMgZnJvbSBgc291cmNlYC5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBMb29rIHRocm91Z2ggdGhlIG91dGdvaW5nIGVkZ2VzIG9mIGBzb3VyY2VgLlxuICAgICAgLy8gVE9ETyhhbHhodWIpOiB1c2UgcHJvcGVyIGl0ZXJhdGlvbiB3aGVuIHRoZSBsZWdhY3kgYnVpbGQgaXMgcmVtb3ZlZC4gKCMyNzc2MilcbiAgICAgIGxldCBjYW5kaWRhdGVQYXRoOiBUW118bnVsbCA9IG51bGw7XG4gICAgICB0aGlzLnJlZmVyZW5jZXMuZ2V0KHNvdXJjZSkhLmZvckVhY2goZWRnZSA9PiB7XG4gICAgICAgIC8vIEVhcmx5IGV4aXQgaWYgYSBwYXRoIGhhcyBhbHJlYWR5IGJlZW4gZm91bmQuXG4gICAgICAgIGlmIChjYW5kaWRhdGVQYXRoICE9PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIExvb2sgZm9yIGEgcGF0aCBmcm9tIHRoaXMgb3V0Z29pbmcgZWRnZSB0byBgdGFyZ2V0YC5cbiAgICAgICAgY29uc3QgcGFydGlhbFBhdGggPSB0aGlzLmNvbGxlY3RQYXRoRnJvbShlZGdlLCB0YXJnZXQsIHNlZW4pO1xuICAgICAgICBpZiAocGFydGlhbFBhdGggIT09IG51bGwpIHtcbiAgICAgICAgICAvLyBBIHBhdGggZXhpc3RzIGZyb20gYGVkZ2VgIHRvIGB0YXJnZXRgLiBJbnNlcnQgYHNvdXJjZWAgYXQgdGhlIGJlZ2lubmluZy5cbiAgICAgICAgICBjYW5kaWRhdGVQYXRoID0gW3NvdXJjZSwgLi4ucGFydGlhbFBhdGhdO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIGNhbmRpZGF0ZVBhdGg7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjb2xsZWN0VHJhbnNpdGl2ZVJlZmVyZW5jZXMoc2V0OiBTZXQ8VD4sIGRlY2w6IFQpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5yZWZlcmVuY2VzLmhhcyhkZWNsKSkge1xuICAgICAgLy8gVE9ETyhhbHhodWIpOiB1c2UgcHJvcGVyIGl0ZXJhdGlvbiB3aGVuIHRoZSBsZWdhY3kgYnVpbGQgaXMgcmVtb3ZlZC4gKCMyNzc2MilcbiAgICAgIHRoaXMucmVmZXJlbmNlcy5nZXQoZGVjbCkhLmZvckVhY2gocmVmID0+IHtcbiAgICAgICAgaWYgKCFzZXQuaGFzKHJlZikpIHtcbiAgICAgICAgICBzZXQuYWRkKHJlZik7XG4gICAgICAgICAgdGhpcy5jb2xsZWN0VHJhbnNpdGl2ZVJlZmVyZW5jZXMoc2V0LCByZWYpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==