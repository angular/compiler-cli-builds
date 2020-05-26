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
        define("@angular/compiler-cli/src/ngtsc/imports/src/references", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Reference = void 0;
    var tslib_1 = require("tslib");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    /**
     * A `ts.Node` plus the context in which it was discovered.
     *
     * A `Reference` is a pointer to a `ts.Node` that was extracted from the program somehow. It
     * contains not only the node itself, but the information regarding how the node was located. In
     * particular, it might track different identifiers by which the node is exposed, as well as
     * potentially a module specifier which might expose the node.
     *
     * The Angular compiler uses `Reference`s instead of `ts.Node`s when tracking classes or generating
     * imports.
     */
    var Reference = /** @class */ (function () {
        function Reference(node, bestGuessOwningModule) {
            if (bestGuessOwningModule === void 0) { bestGuessOwningModule = null; }
            this.node = node;
            this.identifiers = [];
            /**
             * Indicates that the Reference was created synthetically, not as a result of natural value
             * resolution.
             *
             * This is used to avoid misinterpreting the Reference in certain contexts.
             */
            this.synthetic = false;
            this._alias = null;
            this.bestGuessOwningModule = bestGuessOwningModule;
            var id = typescript_1.identifierOfNode(node);
            if (id !== null) {
                this.identifiers.push(id);
            }
        }
        Object.defineProperty(Reference.prototype, "ownedByModuleGuess", {
            /**
             * The best guess at which module specifier owns this particular reference, or `null` if there
             * isn't one.
             */
            get: function () {
                if (this.bestGuessOwningModule !== null) {
                    return this.bestGuessOwningModule.specifier;
                }
                else {
                    return null;
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Reference.prototype, "hasOwningModuleGuess", {
            /**
             * Whether this reference has a potential owning module or not.
             *
             * See `bestGuessOwningModule`.
             */
            get: function () {
                return this.bestGuessOwningModule !== null;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Reference.prototype, "debugName", {
            /**
             * A name for the node, if one is available.
             *
             * This is only suited for debugging. Any actual references to this node should be made with
             * `ts.Identifier`s (see `getIdentityIn`).
             */
            get: function () {
                var id = typescript_1.identifierOfNode(this.node);
                return id !== null ? id.text : null;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Reference.prototype, "alias", {
            get: function () {
                return this._alias;
            },
            enumerable: false,
            configurable: true
        });
        /**
         * Record a `ts.Identifier` by which it's valid to refer to this node, within the context of this
         * `Reference`.
         */
        Reference.prototype.addIdentifier = function (identifier) {
            this.identifiers.push(identifier);
        };
        /**
         * Get a `ts.Identifier` within this `Reference` that can be used to refer within the context of a
         * given `ts.SourceFile`, if any.
         */
        Reference.prototype.getIdentityIn = function (context) {
            return this.identifiers.find(function (id) { return id.getSourceFile() === context; }) || null;
        };
        /**
         * Get a `ts.Identifier` for this `Reference` that exists within the given expression.
         *
         * This is very useful for producing `ts.Diagnostic`s that reference `Reference`s that were
         * extracted from some larger expression, as it can be used to pinpoint the `ts.Identifier` within
         * the expression from which the `Reference` originated.
         */
        Reference.prototype.getIdentityInExpression = function (expr) {
            var sf = expr.getSourceFile();
            return this.identifiers.find(function (id) {
                if (id.getSourceFile() !== sf) {
                    return false;
                }
                // This identifier is a match if its position lies within the given expression.
                return id.pos >= expr.pos && id.end <= expr.end;
            }) ||
                null;
        };
        /**
         * Given the 'container' expression from which this `Reference` was extracted, produce a
         * `ts.Expression` to use in a diagnostic which best indicates the position within the container
         * expression that generated the `Reference`.
         *
         * For example, given a `Reference` to the class 'Bar' and the containing expression:
         * `[Foo, Bar, Baz]`, this function would attempt to return the `ts.Identifier` for `Bar` within
         * the array. This could be used to produce a nice diagnostic context:
         *
         * ```text
         * [Foo, Bar, Baz]
         *       ~~~
         * ```
         *
         * If no specific node can be found, then the `fallback` expression is used, which defaults to the
         * entire containing expression.
         */
        Reference.prototype.getOriginForDiagnostics = function (container, fallback) {
            if (fallback === void 0) { fallback = container; }
            var id = this.getIdentityInExpression(container);
            return id !== null ? id : fallback;
        };
        Reference.prototype.cloneWithAlias = function (alias) {
            var ref = new Reference(this.node, this.bestGuessOwningModule);
            ref.identifiers = tslib_1.__spread(this.identifiers);
            ref._alias = alias;
            return ref;
        };
        Reference.prototype.cloneWithNoIdentifiers = function () {
            var ref = new Reference(this.node, this.bestGuessOwningModule);
            ref._alias = this._alias;
            ref.identifiers = [];
            return ref;
        };
        return Reference;
    }());
    exports.Reference = Reference;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvaW1wb3J0cy9zcmMvcmVmZXJlbmNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBS0gsa0ZBQTJEO0lBTzNEOzs7Ozs7Ozs7O09BVUc7SUFDSDtRQTJCRSxtQkFBcUIsSUFBTyxFQUFFLHFCQUErQztZQUEvQyxzQ0FBQSxFQUFBLDRCQUErQztZQUF4RCxTQUFJLEdBQUosSUFBSSxDQUFHO1lBWnBCLGdCQUFXLEdBQW9CLEVBQUUsQ0FBQztZQUUxQzs7Ozs7ZUFLRztZQUNILGNBQVMsR0FBRyxLQUFLLENBQUM7WUFFVixXQUFNLEdBQW9CLElBQUksQ0FBQztZQUdyQyxJQUFJLENBQUMscUJBQXFCLEdBQUcscUJBQXFCLENBQUM7WUFFbkQsSUFBTSxFQUFFLEdBQUcsNkJBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEMsSUFBSSxFQUFFLEtBQUssSUFBSSxFQUFFO2dCQUNmLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQzNCO1FBQ0gsQ0FBQztRQU1ELHNCQUFJLHlDQUFrQjtZQUp0Qjs7O2VBR0c7aUJBQ0g7Z0JBQ0UsSUFBSSxJQUFJLENBQUMscUJBQXFCLEtBQUssSUFBSSxFQUFFO29CQUN2QyxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUM7aUJBQzdDO3FCQUFNO29CQUNMLE9BQU8sSUFBSSxDQUFDO2lCQUNiO1lBQ0gsQ0FBQzs7O1dBQUE7UUFPRCxzQkFBSSwyQ0FBb0I7WUFMeEI7Ozs7ZUFJRztpQkFDSDtnQkFDRSxPQUFPLElBQUksQ0FBQyxxQkFBcUIsS0FBSyxJQUFJLENBQUM7WUFDN0MsQ0FBQzs7O1dBQUE7UUFRRCxzQkFBSSxnQ0FBUztZQU5iOzs7OztlQUtHO2lCQUNIO2dCQUNFLElBQU0sRUFBRSxHQUFHLDZCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDdkMsT0FBTyxFQUFFLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDdEMsQ0FBQzs7O1dBQUE7UUFFRCxzQkFBSSw0QkFBSztpQkFBVDtnQkFDRSxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDckIsQ0FBQzs7O1dBQUE7UUFHRDs7O1dBR0c7UUFDSCxpQ0FBYSxHQUFiLFVBQWMsVUFBeUI7WUFDckMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDcEMsQ0FBQztRQUVEOzs7V0FHRztRQUNILGlDQUFhLEdBQWIsVUFBYyxPQUFzQjtZQUNsQyxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQUEsRUFBRSxJQUFJLE9BQUEsRUFBRSxDQUFDLGFBQWEsRUFBRSxLQUFLLE9BQU8sRUFBOUIsQ0FBOEIsQ0FBQyxJQUFJLElBQUksQ0FBQztRQUM3RSxDQUFDO1FBRUQ7Ozs7OztXQU1HO1FBQ0gsMkNBQXVCLEdBQXZCLFVBQXdCLElBQW1CO1lBQ3pDLElBQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNoQyxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQUEsRUFBRTtnQkFDN0IsSUFBSSxFQUFFLENBQUMsYUFBYSxFQUFFLEtBQUssRUFBRSxFQUFFO29CQUM3QixPQUFPLEtBQUssQ0FBQztpQkFDZDtnQkFFRCwrRUFBK0U7Z0JBQy9FLE9BQU8sRUFBRSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQztZQUNsRCxDQUFDLENBQUM7Z0JBQ0UsSUFBSSxDQUFDO1FBQ1gsQ0FBQztRQUVEOzs7Ozs7Ozs7Ozs7Ozs7O1dBZ0JHO1FBQ0gsMkNBQXVCLEdBQXZCLFVBQXdCLFNBQXdCLEVBQUUsUUFBbUM7WUFBbkMseUJBQUEsRUFBQSxvQkFBbUM7WUFFbkYsSUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ25ELE9BQU8sRUFBRSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFDckMsQ0FBQztRQUVELGtDQUFjLEdBQWQsVUFBZSxLQUFpQjtZQUM5QixJQUFNLEdBQUcsR0FBRyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQ2pFLEdBQUcsQ0FBQyxXQUFXLG9CQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUN4QyxHQUFHLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztZQUNuQixPQUFPLEdBQUcsQ0FBQztRQUNiLENBQUM7UUFFRCwwQ0FBc0IsR0FBdEI7WUFDRSxJQUFNLEdBQUcsR0FBRyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQ2pFLEdBQUcsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUN6QixHQUFHLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQztZQUNyQixPQUFPLEdBQUcsQ0FBQztRQUNiLENBQUM7UUFDSCxnQkFBQztJQUFELENBQUMsQUFqSkQsSUFpSkM7SUFqSlksOEJBQVMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXhwcmVzc2lvbn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7aWRlbnRpZmllck9mTm9kZX0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgT3duaW5nTW9kdWxlIHtcbiAgc3BlY2lmaWVyOiBzdHJpbmc7XG4gIHJlc29sdXRpb25Db250ZXh0OiBzdHJpbmc7XG59XG5cbi8qKlxuICogQSBgdHMuTm9kZWAgcGx1cyB0aGUgY29udGV4dCBpbiB3aGljaCBpdCB3YXMgZGlzY292ZXJlZC5cbiAqXG4gKiBBIGBSZWZlcmVuY2VgIGlzIGEgcG9pbnRlciB0byBhIGB0cy5Ob2RlYCB0aGF0IHdhcyBleHRyYWN0ZWQgZnJvbSB0aGUgcHJvZ3JhbSBzb21laG93LiBJdFxuICogY29udGFpbnMgbm90IG9ubHkgdGhlIG5vZGUgaXRzZWxmLCBidXQgdGhlIGluZm9ybWF0aW9uIHJlZ2FyZGluZyBob3cgdGhlIG5vZGUgd2FzIGxvY2F0ZWQuIEluXG4gKiBwYXJ0aWN1bGFyLCBpdCBtaWdodCB0cmFjayBkaWZmZXJlbnQgaWRlbnRpZmllcnMgYnkgd2hpY2ggdGhlIG5vZGUgaXMgZXhwb3NlZCwgYXMgd2VsbCBhc1xuICogcG90ZW50aWFsbHkgYSBtb2R1bGUgc3BlY2lmaWVyIHdoaWNoIG1pZ2h0IGV4cG9zZSB0aGUgbm9kZS5cbiAqXG4gKiBUaGUgQW5ndWxhciBjb21waWxlciB1c2VzIGBSZWZlcmVuY2VgcyBpbnN0ZWFkIG9mIGB0cy5Ob2RlYHMgd2hlbiB0cmFja2luZyBjbGFzc2VzIG9yIGdlbmVyYXRpbmdcbiAqIGltcG9ydHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBSZWZlcmVuY2U8VCBleHRlbmRzIHRzLk5vZGUgPSB0cy5Ob2RlPiB7XG4gIC8qKlxuICAgKiBUaGUgY29tcGlsZXIncyBiZXN0IGd1ZXNzIGF0IGFuIGFic29sdXRlIG1vZHVsZSBzcGVjaWZpZXIgd2hpY2ggb3ducyB0aGlzIGBSZWZlcmVuY2VgLlxuICAgKlxuICAgKiBUaGlzIGlzIHVzdWFsbHkgZGV0ZXJtaW5lZCBieSB0cmFja2luZyB0aGUgaW1wb3J0IHN0YXRlbWVudHMgd2hpY2ggbGVkIHRoZSBjb21waWxlciB0byBhIGdpdmVuXG4gICAqIG5vZGUuIElmIGFueSBvZiB0aGVzZSBpbXBvcnRzIGFyZSBhYnNvbHV0ZSwgaXQncyBhbiBpbmRpY2F0aW9uIHRoYXQgdGhlIG5vZGUgYmVpbmcgaW1wb3J0ZWRcbiAgICogbWlnaHQgY29tZSBmcm9tIHRoYXQgbW9kdWxlLlxuICAgKlxuICAgKiBJdCBpcyBub3QgX2d1YXJhbnRlZWRfIHRoYXQgdGhlIG5vZGUgaW4gcXVlc3Rpb24gaXMgZXhwb3J0ZWQgZnJvbSBpdHMgYGJlc3RHdWVzc093bmluZ01vZHVsZWAgLVxuICAgKiB0aGF0IGlzIG1vc3RseSBhIGNvbnZlbnRpb24gdGhhdCBhcHBsaWVzIGluIGNlcnRhaW4gcGFja2FnZSBmb3JtYXRzLlxuICAgKlxuICAgKiBJZiBgYmVzdEd1ZXNzT3duaW5nTW9kdWxlYCBpcyBgbnVsbGAsIHRoZW4gaXQncyBsaWtlbHkgdGhlIG5vZGUgY2FtZSBmcm9tIHRoZSBjdXJyZW50IHByb2dyYW0uXG4gICAqL1xuICByZWFkb25seSBiZXN0R3Vlc3NPd25pbmdNb2R1bGU6IE93bmluZ01vZHVsZXxudWxsO1xuXG4gIHByaXZhdGUgaWRlbnRpZmllcnM6IHRzLklkZW50aWZpZXJbXSA9IFtdO1xuXG4gIC8qKlxuICAgKiBJbmRpY2F0ZXMgdGhhdCB0aGUgUmVmZXJlbmNlIHdhcyBjcmVhdGVkIHN5bnRoZXRpY2FsbHksIG5vdCBhcyBhIHJlc3VsdCBvZiBuYXR1cmFsIHZhbHVlXG4gICAqIHJlc29sdXRpb24uXG4gICAqXG4gICAqIFRoaXMgaXMgdXNlZCB0byBhdm9pZCBtaXNpbnRlcnByZXRpbmcgdGhlIFJlZmVyZW5jZSBpbiBjZXJ0YWluIGNvbnRleHRzLlxuICAgKi9cbiAgc3ludGhldGljID0gZmFsc2U7XG5cbiAgcHJpdmF0ZSBfYWxpYXM6IEV4cHJlc3Npb258bnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgbm9kZTogVCwgYmVzdEd1ZXNzT3duaW5nTW9kdWxlOiBPd25pbmdNb2R1bGV8bnVsbCA9IG51bGwpIHtcbiAgICB0aGlzLmJlc3RHdWVzc093bmluZ01vZHVsZSA9IGJlc3RHdWVzc093bmluZ01vZHVsZTtcblxuICAgIGNvbnN0IGlkID0gaWRlbnRpZmllck9mTm9kZShub2RlKTtcbiAgICBpZiAoaWQgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuaWRlbnRpZmllcnMucHVzaChpZCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBiZXN0IGd1ZXNzIGF0IHdoaWNoIG1vZHVsZSBzcGVjaWZpZXIgb3ducyB0aGlzIHBhcnRpY3VsYXIgcmVmZXJlbmNlLCBvciBgbnVsbGAgaWYgdGhlcmVcbiAgICogaXNuJ3Qgb25lLlxuICAgKi9cbiAgZ2V0IG93bmVkQnlNb2R1bGVHdWVzcygpOiBzdHJpbmd8bnVsbCB7XG4gICAgaWYgKHRoaXMuYmVzdEd1ZXNzT3duaW5nTW9kdWxlICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5iZXN0R3Vlc3NPd25pbmdNb2R1bGUuc3BlY2lmaWVyO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogV2hldGhlciB0aGlzIHJlZmVyZW5jZSBoYXMgYSBwb3RlbnRpYWwgb3duaW5nIG1vZHVsZSBvciBub3QuXG4gICAqXG4gICAqIFNlZSBgYmVzdEd1ZXNzT3duaW5nTW9kdWxlYC5cbiAgICovXG4gIGdldCBoYXNPd25pbmdNb2R1bGVHdWVzcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5iZXN0R3Vlc3NPd25pbmdNb2R1bGUgIT09IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogQSBuYW1lIGZvciB0aGUgbm9kZSwgaWYgb25lIGlzIGF2YWlsYWJsZS5cbiAgICpcbiAgICogVGhpcyBpcyBvbmx5IHN1aXRlZCBmb3IgZGVidWdnaW5nLiBBbnkgYWN0dWFsIHJlZmVyZW5jZXMgdG8gdGhpcyBub2RlIHNob3VsZCBiZSBtYWRlIHdpdGhcbiAgICogYHRzLklkZW50aWZpZXJgcyAoc2VlIGBnZXRJZGVudGl0eUluYCkuXG4gICAqL1xuICBnZXQgZGVidWdOYW1lKCk6IHN0cmluZ3xudWxsIHtcbiAgICBjb25zdCBpZCA9IGlkZW50aWZpZXJPZk5vZGUodGhpcy5ub2RlKTtcbiAgICByZXR1cm4gaWQgIT09IG51bGwgPyBpZC50ZXh0IDogbnVsbDtcbiAgfVxuXG4gIGdldCBhbGlhcygpOiBFeHByZXNzaW9ufG51bGwge1xuICAgIHJldHVybiB0aGlzLl9hbGlhcztcbiAgfVxuXG5cbiAgLyoqXG4gICAqIFJlY29yZCBhIGB0cy5JZGVudGlmaWVyYCBieSB3aGljaCBpdCdzIHZhbGlkIHRvIHJlZmVyIHRvIHRoaXMgbm9kZSwgd2l0aGluIHRoZSBjb250ZXh0IG9mIHRoaXNcbiAgICogYFJlZmVyZW5jZWAuXG4gICAqL1xuICBhZGRJZGVudGlmaWVyKGlkZW50aWZpZXI6IHRzLklkZW50aWZpZXIpOiB2b2lkIHtcbiAgICB0aGlzLmlkZW50aWZpZXJzLnB1c2goaWRlbnRpZmllcik7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGEgYHRzLklkZW50aWZpZXJgIHdpdGhpbiB0aGlzIGBSZWZlcmVuY2VgIHRoYXQgY2FuIGJlIHVzZWQgdG8gcmVmZXIgd2l0aGluIHRoZSBjb250ZXh0IG9mIGFcbiAgICogZ2l2ZW4gYHRzLlNvdXJjZUZpbGVgLCBpZiBhbnkuXG4gICAqL1xuICBnZXRJZGVudGl0eUluKGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUpOiB0cy5JZGVudGlmaWVyfG51bGwge1xuICAgIHJldHVybiB0aGlzLmlkZW50aWZpZXJzLmZpbmQoaWQgPT4gaWQuZ2V0U291cmNlRmlsZSgpID09PSBjb250ZXh0KSB8fCBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhIGB0cy5JZGVudGlmaWVyYCBmb3IgdGhpcyBgUmVmZXJlbmNlYCB0aGF0IGV4aXN0cyB3aXRoaW4gdGhlIGdpdmVuIGV4cHJlc3Npb24uXG4gICAqXG4gICAqIFRoaXMgaXMgdmVyeSB1c2VmdWwgZm9yIHByb2R1Y2luZyBgdHMuRGlhZ25vc3RpY2BzIHRoYXQgcmVmZXJlbmNlIGBSZWZlcmVuY2VgcyB0aGF0IHdlcmVcbiAgICogZXh0cmFjdGVkIGZyb20gc29tZSBsYXJnZXIgZXhwcmVzc2lvbiwgYXMgaXQgY2FuIGJlIHVzZWQgdG8gcGlucG9pbnQgdGhlIGB0cy5JZGVudGlmaWVyYCB3aXRoaW5cbiAgICogdGhlIGV4cHJlc3Npb24gZnJvbSB3aGljaCB0aGUgYFJlZmVyZW5jZWAgb3JpZ2luYXRlZC5cbiAgICovXG4gIGdldElkZW50aXR5SW5FeHByZXNzaW9uKGV4cHI6IHRzLkV4cHJlc3Npb24pOiB0cy5JZGVudGlmaWVyfG51bGwge1xuICAgIGNvbnN0IHNmID0gZXhwci5nZXRTb3VyY2VGaWxlKCk7XG4gICAgcmV0dXJuIHRoaXMuaWRlbnRpZmllcnMuZmluZChpZCA9PiB7XG4gICAgICBpZiAoaWQuZ2V0U291cmNlRmlsZSgpICE9PSBzZikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIC8vIFRoaXMgaWRlbnRpZmllciBpcyBhIG1hdGNoIGlmIGl0cyBwb3NpdGlvbiBsaWVzIHdpdGhpbiB0aGUgZ2l2ZW4gZXhwcmVzc2lvbi5cbiAgICAgIHJldHVybiBpZC5wb3MgPj0gZXhwci5wb3MgJiYgaWQuZW5kIDw9IGV4cHIuZW5kO1xuICAgIH0pIHx8XG4gICAgICAgIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gdGhlICdjb250YWluZXInIGV4cHJlc3Npb24gZnJvbSB3aGljaCB0aGlzIGBSZWZlcmVuY2VgIHdhcyBleHRyYWN0ZWQsIHByb2R1Y2UgYVxuICAgKiBgdHMuRXhwcmVzc2lvbmAgdG8gdXNlIGluIGEgZGlhZ25vc3RpYyB3aGljaCBiZXN0IGluZGljYXRlcyB0aGUgcG9zaXRpb24gd2l0aGluIHRoZSBjb250YWluZXJcbiAgICogZXhwcmVzc2lvbiB0aGF0IGdlbmVyYXRlZCB0aGUgYFJlZmVyZW5jZWAuXG4gICAqXG4gICAqIEZvciBleGFtcGxlLCBnaXZlbiBhIGBSZWZlcmVuY2VgIHRvIHRoZSBjbGFzcyAnQmFyJyBhbmQgdGhlIGNvbnRhaW5pbmcgZXhwcmVzc2lvbjpcbiAgICogYFtGb28sIEJhciwgQmF6XWAsIHRoaXMgZnVuY3Rpb24gd291bGQgYXR0ZW1wdCB0byByZXR1cm4gdGhlIGB0cy5JZGVudGlmaWVyYCBmb3IgYEJhcmAgd2l0aGluXG4gICAqIHRoZSBhcnJheS4gVGhpcyBjb3VsZCBiZSB1c2VkIHRvIHByb2R1Y2UgYSBuaWNlIGRpYWdub3N0aWMgY29udGV4dDpcbiAgICpcbiAgICogYGBgdGV4dFxuICAgKiBbRm9vLCBCYXIsIEJhel1cbiAgICogICAgICAgfn5+XG4gICAqIGBgYFxuICAgKlxuICAgKiBJZiBubyBzcGVjaWZpYyBub2RlIGNhbiBiZSBmb3VuZCwgdGhlbiB0aGUgYGZhbGxiYWNrYCBleHByZXNzaW9uIGlzIHVzZWQsIHdoaWNoIGRlZmF1bHRzIHRvIHRoZVxuICAgKiBlbnRpcmUgY29udGFpbmluZyBleHByZXNzaW9uLlxuICAgKi9cbiAgZ2V0T3JpZ2luRm9yRGlhZ25vc3RpY3MoY29udGFpbmVyOiB0cy5FeHByZXNzaW9uLCBmYWxsYmFjazogdHMuRXhwcmVzc2lvbiA9IGNvbnRhaW5lcik6XG4gICAgICB0cy5FeHByZXNzaW9uIHtcbiAgICBjb25zdCBpZCA9IHRoaXMuZ2V0SWRlbnRpdHlJbkV4cHJlc3Npb24oY29udGFpbmVyKTtcbiAgICByZXR1cm4gaWQgIT09IG51bGwgPyBpZCA6IGZhbGxiYWNrO1xuICB9XG5cbiAgY2xvbmVXaXRoQWxpYXMoYWxpYXM6IEV4cHJlc3Npb24pOiBSZWZlcmVuY2U8VD4ge1xuICAgIGNvbnN0IHJlZiA9IG5ldyBSZWZlcmVuY2UodGhpcy5ub2RlLCB0aGlzLmJlc3RHdWVzc093bmluZ01vZHVsZSk7XG4gICAgcmVmLmlkZW50aWZpZXJzID0gWy4uLnRoaXMuaWRlbnRpZmllcnNdO1xuICAgIHJlZi5fYWxpYXMgPSBhbGlhcztcbiAgICByZXR1cm4gcmVmO1xuICB9XG5cbiAgY2xvbmVXaXRoTm9JZGVudGlmaWVycygpOiBSZWZlcmVuY2U8VD4ge1xuICAgIGNvbnN0IHJlZiA9IG5ldyBSZWZlcmVuY2UodGhpcy5ub2RlLCB0aGlzLmJlc3RHdWVzc093bmluZ01vZHVsZSk7XG4gICAgcmVmLl9hbGlhcyA9IHRoaXMuX2FsaWFzO1xuICAgIHJlZi5pZGVudGlmaWVycyA9IFtdO1xuICAgIHJldHVybiByZWY7XG4gIH1cbn1cbiJdfQ==