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
        Visitor.prototype.visitOtherNode = function (node) { return node; };
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
                visitedNode = this._visitListEntryNode(node, function (node) { return _this.visitClassDeclaration(node); });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlzaXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdXRpbC9zcmMvdmlzaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFZakM7O09BRUc7SUFDSCxlQUNJLElBQU8sRUFBRSxPQUFnQixFQUFFLE9BQWlDO1FBQzlELE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUhELHNCQUdDO0lBRUQ7OztPQUdHO0lBQ0g7UUFBQTtZQUNFOztlQUVHO1lBQ0ssWUFBTyxHQUFHLElBQUksR0FBRyxFQUEyQixDQUFDO1lBRXJEOztlQUVHO1lBQ0ssV0FBTSxHQUFHLElBQUksR0FBRyxFQUEyQixDQUFDO1FBb0Z0RCxDQUFDO1FBbEZDOzs7V0FHRztRQUNILHVDQUFxQixHQUFyQixVQUFzQixJQUF5QjtZQUU3QyxPQUFPLEVBQUMsSUFBSSxNQUFBLEVBQUMsQ0FBQztRQUNoQixDQUFDO1FBRU8scUNBQW1CLEdBQTNCLFVBQ0ksSUFBTyxFQUFFLE9BQTJEO1lBQ3RFLElBQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM3QixJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssU0FBUyxFQUFFO2dCQUMvQiw0RkFBNEY7Z0JBQzVGLHFFQUFxRTtnQkFDckUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDOUM7WUFDRCxJQUFJLE1BQU0sQ0FBQyxLQUFLLEtBQUssU0FBUyxFQUFFO2dCQUM5QixpREFBaUQ7Z0JBQ2pELElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVB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QztRQUNmLENBQUM7UUFDSCxjQUFDO0lBQUQsQ0FBQyxBQTdGRCxJQTZGQztJQTdGcUIsMEJBQU87SUErRjdCLHVCQUF1QixJQUFhO1FBQ2xDLElBQU0sS0FBSyxHQUFHLElBQXlCLENBQUM7UUFDeEMsT0FBTyxLQUFLLENBQUMsVUFBVSxLQUFLLFNBQVMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMzRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuLyoqXG4gKiBSZXN1bHQgdHlwZSBvZiB2aXNpdGluZyBhIG5vZGUgdGhhdCdzIHR5cGljYWxseSBhbiBlbnRyeSBpbiBhIGxpc3QsIHdoaWNoIGFsbG93cyBzcGVjaWZ5aW5nIHRoYXRcbiAqIG5vZGVzIHNob3VsZCBiZSBhZGRlZCBiZWZvcmUgdGhlIHZpc2l0ZWQgbm9kZSBpbiB0aGUgb3V0cHV0LlxuICovXG5leHBvcnQgdHlwZSBWaXNpdExpc3RFbnRyeVJlc3VsdDxCIGV4dGVuZHMgdHMuTm9kZSwgVCBleHRlbmRzIEI+ID0ge1xuICBub2RlOiBULFxuICBiZWZvcmU/OiBCW10sXG4gIGFmdGVyPzogQltdLFxufTtcblxuLyoqXG4gKiBWaXNpdCBhIG5vZGUgd2l0aCB0aGUgZ2l2ZW4gdmlzaXRvciBhbmQgcmV0dXJuIGEgdHJhbnNmb3JtZWQgY29weS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZpc2l0PFQgZXh0ZW5kcyB0cy5Ob2RlPihcbiAgICBub2RlOiBULCB2aXNpdG9yOiBWaXNpdG9yLCBjb250ZXh0OiB0cy5UcmFuc2Zvcm1hdGlvbkNvbnRleHQpOiBUIHtcbiAgcmV0dXJuIHZpc2l0b3IuX3Zpc2l0KG5vZGUsIGNvbnRleHQpO1xufVxuXG4vKipcbiAqIEFic3RyYWN0IGJhc2UgY2xhc3MgZm9yIHZpc2l0b3JzLCB3aGljaCBwcm9jZXNzZXMgY2VydGFpbiBub2RlcyBzcGVjaWFsbHkgdG8gYWxsb3cgaW5zZXJ0aW9uXG4gKiBvZiBvdGhlciBub2RlcyBiZWZvcmUgdGhlbS5cbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFZpc2l0b3Ige1xuICAvKipcbiAgICogTWFwcyBzdGF0ZW1lbnRzIHRvIGFuIGFycmF5IG9mIHN0YXRlbWVudHMgdGhhdCBzaG91bGQgYmUgaW5zZXJ0ZWQgYmVmb3JlIHRoZW0uXG4gICAqL1xuICBwcml2YXRlIF9iZWZvcmUgPSBuZXcgTWFwPHRzLk5vZGUsIHRzLlN0YXRlbWVudFtdPigpO1xuXG4gIC8qKlxuICAgKiBNYXBzIHN0YXRlbWVudHMgdG8gYW4gYXJyYXkgb2Ygc3RhdGVtZW50cyB0aGF0IHNob3VsZCBiZSBpbnNlcnRlZCBhZnRlciB0aGVtLlxuICAgKi9cbiAgcHJpdmF0ZSBfYWZ0ZXIgPSBuZXcgTWFwPHRzLk5vZGUsIHRzLlN0YXRlbWVudFtdPigpO1xuXG4gIC8qKlxuICAgKiBWaXNpdCBhIGNsYXNzIGRlY2xhcmF0aW9uLCByZXR1cm5pbmcgYXQgbGVhc3QgdGhlIHRyYW5zZm9ybWVkIGRlY2xhcmF0aW9uIGFuZCBvcHRpb25hbGx5IG90aGVyXG4gICAqIG5vZGVzIHRvIGluc2VydCBiZWZvcmUgdGhlIGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgdmlzaXRDbGFzc0RlY2xhcmF0aW9uKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOlxuICAgICAgVmlzaXRMaXN0RW50cnlSZXN1bHQ8dHMuU3RhdGVtZW50LCB0cy5DbGFzc0RlY2xhcmF0aW9uPiB7XG4gICAgcmV0dXJuIHtub2RlfTtcbiAgfVxuXG4gIHByaXZhdGUgX3Zpc2l0TGlzdEVudHJ5Tm9kZTxUIGV4dGVuZHMgdHMuU3RhdGVtZW50PihcbiAgICAgIG5vZGU6IFQsIHZpc2l0b3I6IChub2RlOiBUKSA9PiBWaXNpdExpc3RFbnRyeVJlc3VsdDx0cy5TdGF0ZW1lbnQsIFQ+KTogVCB7XG4gICAgY29uc3QgcmVzdWx0ID0gdmlzaXRvcihub2RlKTtcbiAgICBpZiAocmVzdWx0LmJlZm9yZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBSZWNvcmQgdGhhdCBzb21lIG5vZGVzIHNob3VsZCBiZSBpbnNlcnRlZCBiZWZvcmUgdGhlIGdpdmVuIGRlY2xhcmF0aW9uLiBUaGUgZGVjbGFyYXRpb24nc1xuICAgICAgLy8gcGFyZW50J3MgX3Zpc2l0IGNhbGwgaXMgcmVzcG9uc2libGUgZm9yIHBlcmZvcm1pbmcgdGhpcyBpbnNlcnRpb24uXG4gICAgICB0aGlzLl9iZWZvcmUuc2V0KHJlc3VsdC5ub2RlLCByZXN1bHQuYmVmb3JlKTtcbiAgICB9XG4gICAgaWYgKHJlc3VsdC5hZnRlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBTYW1lIHdpdGggbm9kZXMgdGhhdCBzaG91bGQgYmUgaW5zZXJ0ZWQgYWZ0ZXIuXG4gICAgICB0aGlzLl9hZnRlci5zZXQocmVzdWx0Lm5vZGUsIHJlc3VsdC5hZnRlcik7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQubm9kZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBWaXNpdCB0eXBlcyBvZiBub2RlcyB3aGljaCBkb24ndCBoYXZlIHRoZWlyIG93biBleHBsaWNpdCB2aXNpdG9yLlxuICAgKi9cbiAgdmlzaXRPdGhlck5vZGU8VCBleHRlbmRzIHRzLk5vZGU+KG5vZGU6IFQpOiBUIHsgcmV0dXJuIG5vZGU7IH1cblxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqL1xuICBfdmlzaXQ8VCBleHRlbmRzIHRzLk5vZGU+KG5vZGU6IFQsIGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCk6IFQge1xuICAgIC8vIEZpcnN0LCB2aXNpdCB0aGUgbm9kZS4gdmlzaXRlZE5vZGUgc3RhcnRzIG9mZiBhcyBgbnVsbGAgYnV0IHNob3VsZCBiZSBzZXQgYWZ0ZXIgdmlzaXRpbmdcbiAgICAvLyBpcyBjb21wbGV0ZWQuXG4gICAgbGV0IHZpc2l0ZWROb2RlOiBUfG51bGwgPSBudWxsO1xuXG4gICAgbm9kZSA9IHRzLnZpc2l0RWFjaENoaWxkKG5vZGUsIGNoaWxkID0+IHRoaXMuX3Zpc2l0KGNoaWxkLCBjb250ZXh0KSwgY29udGV4dCkgYXMgVDtcblxuICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIHZpc2l0ZWROb2RlID0gdGhpcy5fdmlzaXRMaXN0RW50cnlOb2RlKFxuICAgICAgICAgIG5vZGUsIChub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKSA9PiB0aGlzLnZpc2l0Q2xhc3NEZWNsYXJhdGlvbihub2RlKSkgYXMgdHlwZW9mIG5vZGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZpc2l0ZWROb2RlID0gdGhpcy52aXNpdE90aGVyTm9kZShub2RlKTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGUgdmlzaXRlZCBub2RlIGhhcyBhIGBzdGF0ZW1lbnRzYCBhcnJheSB0aGVuIHByb2Nlc3MgdGhlbSwgbWF5YmUgcmVwbGFjaW5nIHRoZSB2aXNpdGVkXG4gICAgLy8gbm9kZSBhbmQgYWRkaW5nIGFkZGl0aW9uYWwgc3RhdGVtZW50cy5cbiAgICBpZiAoaGFzU3RhdGVtZW50cyh2aXNpdGVkTm9kZSkpIHtcbiAgICAgIHZpc2l0ZWROb2RlID0gdGhpcy5fbWF5YmVQcm9jZXNzU3RhdGVtZW50cyh2aXNpdGVkTm9kZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHZpc2l0ZWROb2RlO1xuICB9XG5cbiAgcHJpdmF0ZSBfbWF5YmVQcm9jZXNzU3RhdGVtZW50czxUIGV4dGVuZHMgdHMuTm9kZSZ7c3RhdGVtZW50czogdHMuTm9kZUFycmF5PHRzLlN0YXRlbWVudD59PihcbiAgICAgIG5vZGU6IFQpOiBUIHtcbiAgICAvLyBTaG9ydGN1dCAtIGlmIGV2ZXJ5IHN0YXRlbWVudCBkb2Vzbid0IHJlcXVpcmUgbm9kZXMgdG8gYmUgcHJlcGVuZGVkIG9yIGFwcGVuZGVkLFxuICAgIC8vIHRoaXMgaXMgYSBuby1vcC5cbiAgICBpZiAobm9kZS5zdGF0ZW1lbnRzLmV2ZXJ5KHN0bXQgPT4gIXRoaXMuX2JlZm9yZS5oYXMoc3RtdCkgJiYgIXRoaXMuX2FmdGVyLmhhcyhzdG10KSkpIHtcbiAgICAgIHJldHVybiBub2RlO1xuICAgIH1cblxuICAgIC8vIFRoZXJlIGFyZSBzdGF0ZW1lbnRzIHRvIHByZXBlbmQsIHNvIGNsb25lIHRoZSBvcmlnaW5hbCBub2RlLlxuICAgIGNvbnN0IGNsb25lID0gdHMuZ2V0TXV0YWJsZUNsb25lKG5vZGUpO1xuXG4gICAgLy8gQnVpbGQgYSBuZXcgbGlzdCBvZiBzdGF0ZW1lbnRzIGFuZCBwYXRjaCBpdCBvbnRvIHRoZSBjbG9uZS5cbiAgICBjb25zdCBuZXdTdGF0ZW1lbnRzOiB0cy5TdGF0ZW1lbnRbXSA9IFtdO1xuICAgIGNsb25lLnN0YXRlbWVudHMuZm9yRWFjaChzdG10ID0+IHtcbiAgICAgIGlmICh0aGlzLl9iZWZvcmUuaGFzKHN0bXQpKSB7XG4gICAgICAgIG5ld1N0YXRlbWVudHMucHVzaCguLi4odGhpcy5fYmVmb3JlLmdldChzdG10KSAhYXMgdHMuU3RhdGVtZW50W10pKTtcbiAgICAgICAgdGhpcy5fYmVmb3JlLmRlbGV0ZShzdG10KTtcbiAgICAgIH1cbiAgICAgIG5ld1N0YXRlbWVudHMucHVzaChzdG10KTtcbiAgICAgIGlmICh0aGlzLl9hZnRlci5oYXMoc3RtdCkpIHtcbiAgICAgICAgbmV3U3RhdGVtZW50cy5wdXNoKC4uLih0aGlzLl9hZnRlci5nZXQoc3RtdCkgIWFzIHRzLlN0YXRlbWVudFtdKSk7XG4gICAgICAgIHRoaXMuX2FmdGVyLmRlbGV0ZShzdG10KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBjbG9uZS5zdGF0ZW1lbnRzID0gdHMuY3JlYXRlTm9kZUFycmF5KG5ld1N0YXRlbWVudHMsIG5vZGUuc3RhdGVtZW50cy5oYXNUcmFpbGluZ0NvbW1hKTtcbiAgICByZXR1cm4gY2xvbmU7XG4gIH1cbn1cblxuZnVuY3Rpb24gaGFzU3RhdGVtZW50cyhub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5Ob2RlJntzdGF0ZW1lbnRzOiB0cy5Ob2RlQXJyYXk8dHMuU3RhdGVtZW50Pn0ge1xuICBjb25zdCBibG9jayA9IG5vZGUgYXN7c3RhdGVtZW50cz86IGFueX07XG4gIHJldHVybiBibG9jay5zdGF0ZW1lbnRzICE9PSB1bmRlZmluZWQgJiYgQXJyYXkuaXNBcnJheShibG9jay5zdGF0ZW1lbnRzKTtcbn1cbiJdfQ==