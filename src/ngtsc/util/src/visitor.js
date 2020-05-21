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
        define("@angular/compiler-cli/src/ngtsc/util/src/visitor", ["require", "exports", "tslib", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Visitor = exports.visit = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    /**
     * Visit a node with the given visitor and return a transformed copy.
     */
    function visit(node, visitor, context) {
        return visitor._visit(node, context);
    }
    exports.visit = visit;
    /**
     * Abstract base class for visitors, which processes certain nodes specially to allow insertion
     * of other nodes before them.
     */
    var Visitor = /** @class */ (function () {
        function Visitor() {
            /**
             * Maps statements to an array of statements that should be inserted before them.
             */
            this._before = new Map();
            /**
             * Maps statements to an array of statements that should be inserted after them.
             */
            this._after = new Map();
        }
        /**
         * Visit a class declaration, returning at least the transformed declaration and optionally other
         * nodes to insert before the declaration.
         */
        Visitor.prototype.visitClassDeclaration = function (node) {
            return { node: node };
        };
        Visitor.prototype._visitListEntryNode = function (node, visitor) {
            var result = visitor(node);
            if (result.before !== undefined) {
                // Record that some nodes should be inserted before the given declaration. The declaration's
                // parent's _visit call is responsible for performing this insertion.
                this._before.set(result.node, result.before);
            }
            if (result.after !== undefined) {
                // Same with nodes that should be inserted after.
                this._after.set(result.node, result.after);
            }
            return result.node;
        };
        /**
         * Visit types of nodes which don't have their own explicit visitor.
         */
        Visitor.prototype.visitOtherNode = function (node) {
            return node;
        };
        /**
         * @internal
         */
        Visitor.prototype._visit = function (node, context) {
            var _this = this;
            // First, visit the node. visitedNode starts off as `null` but should be set after visiting
            // is completed.
            var visitedNode = null;
            node = ts.visitEachChild(node, function (child) { return _this._visit(child, context); }, context);
            if (ts.isClassDeclaration(node)) {
                visitedNode =
                    this._visitListEntryNode(node, function (node) { return _this.visitClassDeclaration(node); });
            }
            else {
                visitedNode = this.visitOtherNode(node);
            }
            // If the visited node has a `statements` array then process them, maybe replacing the visited
            // node and adding additional statements.
            if (hasStatements(visitedNode)) {
                visitedNode = this._maybeProcessStatements(visitedNode);
            }
            return visitedNode;
        };
        Visitor.prototype._maybeProcessStatements = function (node) {
            var _this = this;
            // Shortcut - if every statement doesn't require nodes to be prepended or appended,
            // this is a no-op.
            if (node.statements.every(function (stmt) { return !_this._before.has(stmt) && !_this._after.has(stmt); })) {
                return node;
            }
            // There are statements to prepend, so clone the original node.
            var clone = ts.getMutableClone(node);
            // Build a new list of statements and patch it onto the clone.
            var newStatements = [];
            clone.statements.forEach(function (stmt) {
                if (_this._before.has(stmt)) {
                    newStatements.push.apply(newStatements, tslib_1.__spread(_this._before.get(stmt)));
                    _this._before.delete(stmt);
                }
                newStatements.push(stmt);
                if (_this._after.has(stmt)) {
                    newStatements.push.apply(newStatements, tslib_1.__spread(_this._after.get(stmt)));
                    _this._after.delete(stmt);
                }
            });
            clone.statements = ts.createNodeArray(newStatements, node.statements.hasTrailingComma);
            return clone;
        };
        return Visitor;
    }());
    exports.Visitor = Visitor;
    function hasStatements(node) {
        var block = node;
        return block.statements !== undefined && Array.isArray(block.statements);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlzaXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdXRpbC9zcmMvdmlzaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBWWpDOztPQUVHO0lBQ0gsU0FBZ0IsS0FBSyxDQUNqQixJQUFPLEVBQUUsT0FBZ0IsRUFBRSxPQUFpQztRQUM5RCxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFIRCxzQkFHQztJQUVEOzs7T0FHRztJQUNIO1FBQUE7WUFDRTs7ZUFFRztZQUNLLFlBQU8sR0FBRyxJQUFJLEdBQUcsRUFBMkIsQ0FBQztZQUVyRDs7ZUFFRztZQUNLLFdBQU0sR0FBRyxJQUFJLEdBQUcsRUFBMkIsQ0FBQztRQXVGdEQsQ0FBQztRQXJGQzs7O1dBR0c7UUFDSCx1Q0FBcUIsR0FBckIsVUFBc0IsSUFBeUI7WUFFN0MsT0FBTyxFQUFDLElBQUksTUFBQSxFQUFDLENBQUM7UUFDaEIsQ0FBQztRQUVPLHFDQUFtQixHQUEzQixVQUNJLElBQU8sRUFBRSxPQUEyRDtZQUN0RSxJQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0IsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLFNBQVMsRUFBRTtnQkFDL0IsNEZBQTRGO2dCQUM1RixxRUFBcUU7Z0JBQ3JFLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQzlDO1lBQ0QsSUFBSSxNQUFNLENBQUMsS0FBSyxLQUFLLFNBQVMsRUFBRTtnQkFDOUIsaURBQWlEO2dCQUNqRCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFN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LE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUNILGNBQUM7SUFBRCxDQUFDLEFBaEdELElBZ0dDO0lBaEdxQiwwQkFBTztJQWtHN0IsU0FBUyxhQUFhLENBQUMsSUFBYTtRQUNsQyxJQUFNLEtBQUssR0FBRyxJQUEwQixDQUFDO1FBQ3pDLE9BQU8sS0FBSyxDQUFDLFVBQVUsS0FBSyxTQUFTLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDM0UsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbi8qKlxuICogUmVzdWx0IHR5cGUgb2YgdmlzaXRpbmcgYSBub2RlIHRoYXQncyB0eXBpY2FsbHkgYW4gZW50cnkgaW4gYSBsaXN0LCB3aGljaCBhbGxvd3Mgc3BlY2lmeWluZyB0aGF0XG4gKiBub2RlcyBzaG91bGQgYmUgYWRkZWQgYmVmb3JlIHRoZSB2aXNpdGVkIG5vZGUgaW4gdGhlIG91dHB1dC5cbiAqL1xuZXhwb3J0IHR5cGUgVmlzaXRMaXN0RW50cnlSZXN1bHQ8QiBleHRlbmRzIHRzLk5vZGUsIFQgZXh0ZW5kcyBCPiA9IHtcbiAgbm9kZTogVCxcbiAgYmVmb3JlPzogQltdLFxuICBhZnRlcj86IEJbXSxcbn07XG5cbi8qKlxuICogVmlzaXQgYSBub2RlIHdpdGggdGhlIGdpdmVuIHZpc2l0b3IgYW5kIHJldHVybiBhIHRyYW5zZm9ybWVkIGNvcHkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB2aXNpdDxUIGV4dGVuZHMgdHMuTm9kZT4oXG4gICAgbm9kZTogVCwgdmlzaXRvcjogVmlzaXRvciwgY29udGV4dDogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0KTogVCB7XG4gIHJldHVybiB2aXNpdG9yLl92aXNpdChub2RlLCBjb250ZXh0KTtcbn1cblxuLyoqXG4gKiBBYnN0cmFjdCBiYXNlIGNsYXNzIGZvciB2aXNpdG9ycywgd2hpY2ggcHJvY2Vzc2VzIGNlcnRhaW4gbm9kZXMgc3BlY2lhbGx5IHRvIGFsbG93IGluc2VydGlvblxuICogb2Ygb3RoZXIgbm9kZXMgYmVmb3JlIHRoZW0uXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBWaXNpdG9yIHtcbiAgLyoqXG4gICAqIE1hcHMgc3RhdGVtZW50cyB0byBhbiBhcnJheSBvZiBzdGF0ZW1lbnRzIHRoYXQgc2hvdWxkIGJlIGluc2VydGVkIGJlZm9yZSB0aGVtLlxuICAgKi9cbiAgcHJpdmF0ZSBfYmVmb3JlID0gbmV3IE1hcDx0cy5Ob2RlLCB0cy5TdGF0ZW1lbnRbXT4oKTtcblxuICAvKipcbiAgICogTWFwcyBzdGF0ZW1lbnRzIHRvIGFuIGFycmF5IG9mIHN0YXRlbWVudHMgdGhhdCBzaG91bGQgYmUgaW5zZXJ0ZWQgYWZ0ZXIgdGhlbS5cbiAgICovXG4gIHByaXZhdGUgX2FmdGVyID0gbmV3IE1hcDx0cy5Ob2RlLCB0cy5TdGF0ZW1lbnRbXT4oKTtcblxuICAvKipcbiAgICogVmlzaXQgYSBjbGFzcyBkZWNsYXJhdGlvbiwgcmV0dXJuaW5nIGF0IGxlYXN0IHRoZSB0cmFuc2Zvcm1lZCBkZWNsYXJhdGlvbiBhbmQgb3B0aW9uYWxseSBvdGhlclxuICAgKiBub2RlcyB0byBpbnNlcnQgYmVmb3JlIHRoZSBkZWNsYXJhdGlvbi5cbiAgICovXG4gIHZpc2l0Q2xhc3NEZWNsYXJhdGlvbihub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTpcbiAgICAgIFZpc2l0TGlzdEVudHJ5UmVzdWx0PHRzLlN0YXRlbWVudCwgdHMuQ2xhc3NEZWNsYXJhdGlvbj4ge1xuICAgIHJldHVybiB7bm9kZX07XG4gIH1cblxuICBwcml2YXRlIF92aXNpdExpc3RFbnRyeU5vZGU8VCBleHRlbmRzIHRzLlN0YXRlbWVudD4oXG4gICAgICBub2RlOiBULCB2aXNpdG9yOiAobm9kZTogVCkgPT4gVmlzaXRMaXN0RW50cnlSZXN1bHQ8dHMuU3RhdGVtZW50LCBUPik6IFQge1xuICAgIGNvbnN0IHJlc3VsdCA9IHZpc2l0b3Iobm9kZSk7XG4gICAgaWYgKHJlc3VsdC5iZWZvcmUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gUmVjb3JkIHRoYXQgc29tZSBub2RlcyBzaG91bGQgYmUgaW5zZXJ0ZWQgYmVmb3JlIHRoZSBnaXZlbiBkZWNsYXJhdGlvbi4gVGhlIGRlY2xhcmF0aW9uJ3NcbiAgICAgIC8vIHBhcmVudCdzIF92aXNpdCBjYWxsIGlzIHJlc3BvbnNpYmxlIGZvciBwZXJmb3JtaW5nIHRoaXMgaW5zZXJ0aW9uLlxuICAgICAgdGhpcy5fYmVmb3JlLnNldChyZXN1bHQubm9kZSwgcmVzdWx0LmJlZm9yZSk7XG4gICAgfVxuICAgIGlmIChyZXN1bHQuYWZ0ZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gU2FtZSB3aXRoIG5vZGVzIHRoYXQgc2hvdWxkIGJlIGluc2VydGVkIGFmdGVyLlxuICAgICAgdGhpcy5fYWZ0ZXIuc2V0KHJlc3VsdC5ub2RlLCByZXN1bHQuYWZ0ZXIpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0Lm5vZGU7XG4gIH1cblxuICAvKipcbiAgICogVmlzaXQgdHlwZXMgb2Ygbm9kZXMgd2hpY2ggZG9uJ3QgaGF2ZSB0aGVpciBvd24gZXhwbGljaXQgdmlzaXRvci5cbiAgICovXG4gIHZpc2l0T3RoZXJOb2RlPFQgZXh0ZW5kcyB0cy5Ob2RlPihub2RlOiBUKTogVCB7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqL1xuICBfdmlzaXQ8VCBleHRlbmRzIHRzLk5vZGU+KG5vZGU6IFQsIGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCk6IFQge1xuICAgIC8vIEZpcnN0LCB2aXNpdCB0aGUgbm9kZS4gdmlzaXRlZE5vZGUgc3RhcnRzIG9mZiBhcyBgbnVsbGAgYnV0IHNob3VsZCBiZSBzZXQgYWZ0ZXIgdmlzaXRpbmdcbiAgICAvLyBpcyBjb21wbGV0ZWQuXG4gICAgbGV0IHZpc2l0ZWROb2RlOiBUfG51bGwgPSBudWxsO1xuXG4gICAgbm9kZSA9IHRzLnZpc2l0RWFjaENoaWxkKG5vZGUsIGNoaWxkID0+IHRoaXMuX3Zpc2l0KGNoaWxkLCBjb250ZXh0KSwgY29udGV4dCkgYXMgVDtcblxuICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIHZpc2l0ZWROb2RlID1cbiAgICAgICAgICB0aGlzLl92aXNpdExpc3RFbnRyeU5vZGUoXG4gICAgICAgICAgICAgIG5vZGUsIChub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKSA9PiB0aGlzLnZpc2l0Q2xhc3NEZWNsYXJhdGlvbihub2RlKSkgYXMgdHlwZW9mIG5vZGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZpc2l0ZWROb2RlID0gdGhpcy52aXNpdE90aGVyTm9kZShub2RlKTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGUgdmlzaXRlZCBub2RlIGhhcyBhIGBzdGF0ZW1lbnRzYCBhcnJheSB0aGVuIHByb2Nlc3MgdGhlbSwgbWF5YmUgcmVwbGFjaW5nIHRoZSB2aXNpdGVkXG4gICAgLy8gbm9kZSBhbmQgYWRkaW5nIGFkZGl0aW9uYWwgc3RhdGVtZW50cy5cbiAgICBpZiAoaGFzU3RhdGVtZW50cyh2aXNpdGVkTm9kZSkpIHtcbiAgICAgIHZpc2l0ZWROb2RlID0gdGhpcy5fbWF5YmVQcm9jZXNzU3RhdGVtZW50cyh2aXNpdGVkTm9kZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHZpc2l0ZWROb2RlO1xuICB9XG5cbiAgcHJpdmF0ZSBfbWF5YmVQcm9jZXNzU3RhdGVtZW50czxUIGV4dGVuZHMgdHMuTm9kZSZ7c3RhdGVtZW50czogdHMuTm9kZUFycmF5PHRzLlN0YXRlbWVudD59PihcbiAgICAgIG5vZGU6IFQpOiBUIHtcbiAgICAvLyBTaG9ydGN1dCAtIGlmIGV2ZXJ5IHN0YXRlbWVudCBkb2Vzbid0IHJlcXVpcmUgbm9kZXMgdG8gYmUgcHJlcGVuZGVkIG9yIGFwcGVuZGVkLFxuICAgIC8vIHRoaXMgaXMgYSBuby1vcC5cbiAgICBpZiAobm9kZS5zdGF0ZW1lbnRzLmV2ZXJ5KHN0bXQgPT4gIXRoaXMuX2JlZm9yZS5oYXMoc3RtdCkgJiYgIXRoaXMuX2FmdGVyLmhhcyhzdG10KSkpIHtcbiAgICAgIHJldHVybiBub2RlO1xuICAgIH1cblxuICAgIC8vIFRoZXJlIGFyZSBzdGF0ZW1lbnRzIHRvIHByZXBlbmQsIHNvIGNsb25lIHRoZSBvcmlnaW5hbCBub2RlLlxuICAgIGNvbnN0IGNsb25lID0gdHMuZ2V0TXV0YWJsZUNsb25lKG5vZGUpO1xuXG4gICAgLy8gQnVpbGQgYSBuZXcgbGlzdCBvZiBzdGF0ZW1lbnRzIGFuZCBwYXRjaCBpdCBvbnRvIHRoZSBjbG9uZS5cbiAgICBjb25zdCBuZXdTdGF0ZW1lbnRzOiB0cy5TdGF0ZW1lbnRbXSA9IFtdO1xuICAgIGNsb25lLnN0YXRlbWVudHMuZm9yRWFjaChzdG10ID0+IHtcbiAgICAgIGlmICh0aGlzLl9iZWZvcmUuaGFzKHN0bXQpKSB7XG4gICAgICAgIG5ld1N0YXRlbWVudHMucHVzaCguLi4odGhpcy5fYmVmb3JlLmdldChzdG10KSEgYXMgdHMuU3RhdGVtZW50W10pKTtcbiAgICAgICAgdGhpcy5fYmVmb3JlLmRlbGV0ZShzdG10KTtcbiAgICAgIH1cbiAgICAgIG5ld1N0YXRlbWVudHMucHVzaChzdG10KTtcbiAgICAgIGlmICh0aGlzLl9hZnRlci5oYXMoc3RtdCkpIHtcbiAgICAgICAgbmV3U3RhdGVtZW50cy5wdXNoKC4uLih0aGlzLl9hZnRlci5nZXQoc3RtdCkhIGFzIHRzLlN0YXRlbWVudFtdKSk7XG4gICAgICAgIHRoaXMuX2FmdGVyLmRlbGV0ZShzdG10KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBjbG9uZS5zdGF0ZW1lbnRzID0gdHMuY3JlYXRlTm9kZUFycmF5KG5ld1N0YXRlbWVudHMsIG5vZGUuc3RhdGVtZW50cy5oYXNUcmFpbGluZ0NvbW1hKTtcbiAgICByZXR1cm4gY2xvbmU7XG4gIH1cbn1cblxuZnVuY3Rpb24gaGFzU3RhdGVtZW50cyhub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5Ob2RlJntzdGF0ZW1lbnRzOiB0cy5Ob2RlQXJyYXk8dHMuU3RhdGVtZW50Pn0ge1xuICBjb25zdCBibG9jayA9IG5vZGUgYXMge3N0YXRlbWVudHM/OiBhbnl9O1xuICByZXR1cm4gYmxvY2suc3RhdGVtZW50cyAhPT0gdW5kZWZpbmVkICYmIEFycmF5LmlzQXJyYXkoYmxvY2suc3RhdGVtZW50cyk7XG59XG4iXX0=