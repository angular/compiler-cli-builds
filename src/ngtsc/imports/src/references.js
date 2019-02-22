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
    var tslib_1 = require("tslib");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var ImportMode;
    (function (ImportMode) {
        ImportMode[ImportMode["UseExistingImport"] = 0] = "UseExistingImport";
        ImportMode[ImportMode["ForceNewImport"] = 1] = "ForceNewImport";
    })(ImportMode = exports.ImportMode || (exports.ImportMode = {}));
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
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Reference.prototype, "hasOwningModuleGuess", {
            /**
             * Whether this reference has a potential owning module or not.
             *
             * See `bestGuessOwningModule`.
             */
            get: function () { return this.bestGuessOwningModule !== null; },
            enumerable: true,
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
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Reference.prototype, "alias", {
            get: function () { return this._alias; },
            enumerable: true,
            configurable: true
        });
        /**
         * Record a `ts.Identifier` by which it's valid to refer to this node, within the context of this
         * `Reference`.
         */
        Reference.prototype.addIdentifier = function (identifier) { this.identifiers.push(identifier); };
        /**
         * Get a `ts.Identifier` within this `Reference` that can be used to refer within the context of a
         * given `ts.SourceFile`, if any.
         */
        Reference.prototype.getIdentityIn = function (context) {
            return this.identifiers.find(function (id) { return id.getSourceFile() === context; }) || null;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvaW1wb3J0cy9zcmMvcmVmZXJlbmNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFLSCxrRkFBMkQ7SUFFM0QsSUFBWSxVQUdYO0lBSEQsV0FBWSxVQUFVO1FBQ3BCLHFFQUFpQixDQUFBO1FBQ2pCLCtEQUFjLENBQUE7SUFDaEIsQ0FBQyxFQUhXLFVBQVUsR0FBVixrQkFBVSxLQUFWLGtCQUFVLFFBR3JCO0lBT0Q7Ozs7Ozs7Ozs7T0FVRztJQUNIO1FBbUJFLG1CQUFxQixJQUFPLEVBQUUscUJBQStDO1lBQS9DLHNDQUFBLEVBQUEsNEJBQStDO1lBQXhELFNBQUksR0FBSixJQUFJLENBQUc7WUFKcEIsZ0JBQVcsR0FBb0IsRUFBRSxDQUFDO1lBRWxDLFdBQU0sR0FBb0IsSUFBSSxDQUFDO1lBR3JDLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxxQkFBcUIsQ0FBQztZQUVuRCxJQUFNLEVBQUUsR0FBRyw2QkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsQyxJQUFJLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ2YsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDM0I7UUFDSCxDQUFDO1FBTUQsc0JBQUkseUNBQWtCO1lBSnRCOzs7ZUFHRztpQkFDSDtnQkFDRSxJQUFJLElBQUksQ0FBQyxxQkFBcUIsS0FBSyxJQUFJLEVBQUU7b0JBQ3ZDLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQztpQkFDN0M7cUJBQU07b0JBQ0wsT0FBTyxJQUFJLENBQUM7aUJBQ2I7WUFDSCxDQUFDOzs7V0FBQTtRQU9ELHNCQUFJLDJDQUFvQjtZQUx4Qjs7OztlQUlHO2lCQUNILGNBQXNDLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixLQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBUW5GLHNCQUFJLGdDQUFTO1lBTmI7Ozs7O2VBS0c7aUJBQ0g7Z0JBQ0UsSUFBTSxFQUFFLEdBQUcsNkJBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN2QyxPQUFPLEVBQUUsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUN0QyxDQUFDOzs7V0FBQTtRQUVELHNCQUFJLDRCQUFLO2lCQUFULGNBQStCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBR3BEOzs7V0FHRztRQUNILGlDQUFhLEdBQWIsVUFBYyxVQUF5QixJQUFVLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVyRjs7O1dBR0c7UUFDSCxpQ0FBYSxHQUFiLFVBQWMsT0FBc0I7WUFDbEMsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFBLEVBQUUsSUFBSSxPQUFBLEVBQUUsQ0FBQyxhQUFhLEVBQUUsS0FBSyxPQUFPLEVBQTlCLENBQThCLENBQUMsSUFBSSxJQUFJLENBQUM7UUFDN0UsQ0FBQztRQUVELGtDQUFjLEdBQWQsVUFBZSxLQUFpQjtZQUM5QixJQUFNLEdBQUcsR0FBRyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQ2pFLEdBQUcsQ0FBQyxXQUFXLG9CQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUN4QyxHQUFHLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztZQUNuQixPQUFPLEdBQUcsQ0FBQztRQUNiLENBQUM7UUFFRCwwQ0FBc0IsR0FBdEI7WUFDRSxJQUFNLEdBQUcsR0FBRyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQ2pFLEdBQUcsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUN6QixHQUFHLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQztZQUNyQixPQUFPLEdBQUcsQ0FBQztRQUNiLENBQUM7UUFDSCxnQkFBQztJQUFELENBQUMsQUF4RkQsSUF3RkM7SUF4RlksOEJBQVMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXhwcmVzc2lvbn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7aWRlbnRpZmllck9mTm9kZX0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmV4cG9ydCBlbnVtIEltcG9ydE1vZGUge1xuICBVc2VFeGlzdGluZ0ltcG9ydCxcbiAgRm9yY2VOZXdJbXBvcnQsXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgT3duaW5nTW9kdWxlIHtcbiAgc3BlY2lmaWVyOiBzdHJpbmc7XG4gIHJlc29sdXRpb25Db250ZXh0OiBzdHJpbmc7XG59XG5cbi8qKlxuICogQSBgdHMuTm9kZWAgcGx1cyB0aGUgY29udGV4dCBpbiB3aGljaCBpdCB3YXMgZGlzY292ZXJlZC5cbiAqXG4gKiBBIGBSZWZlcmVuY2VgIGlzIGEgcG9pbnRlciB0byBhIGB0cy5Ob2RlYCB0aGF0IHdhcyBleHRyYWN0ZWQgZnJvbSB0aGUgcHJvZ3JhbSBzb21laG93LiBJdFxuICogY29udGFpbnMgbm90IG9ubHkgdGhlIG5vZGUgaXRzZWxmLCBidXQgdGhlIGluZm9ybWF0aW9uIHJlZ2FyZGluZyBob3cgdGhlIG5vZGUgd2FzIGxvY2F0ZWQuIEluXG4gKiBwYXJ0aWN1bGFyLCBpdCBtaWdodCB0cmFjayBkaWZmZXJlbnQgaWRlbnRpZmllcnMgYnkgd2hpY2ggdGhlIG5vZGUgaXMgZXhwb3NlZCwgYXMgd2VsbCBhc1xuICogcG90ZW50aWFsbHkgYSBtb2R1bGUgc3BlY2lmaWVyIHdoaWNoIG1pZ2h0IGV4cG9zZSB0aGUgbm9kZS5cbiAqXG4gKiBUaGUgQW5ndWxhciBjb21waWxlciB1c2VzIGBSZWZlcmVuY2VgcyBpbnN0ZWFkIG9mIGB0cy5Ob2RlYHMgd2hlbiB0cmFja2luZyBjbGFzc2VzIG9yIGdlbmVyYXRpbmdcbiAqIGltcG9ydHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBSZWZlcmVuY2U8VCBleHRlbmRzIHRzLk5vZGUgPSB0cy5Ob2RlPiB7XG4gIC8qKlxuICAgKiBUaGUgY29tcGlsZXIncyBiZXN0IGd1ZXNzIGF0IGFuIGFic29sdXRlIG1vZHVsZSBzcGVjaWZpZXIgd2hpY2ggb3ducyB0aGlzIGBSZWZlcmVuY2VgLlxuICAgKlxuICAgKiBUaGlzIGlzIHVzdWFsbHkgZGV0ZXJtaW5lZCBieSB0cmFja2luZyB0aGUgaW1wb3J0IHN0YXRlbWVudHMgd2hpY2ggbGVkIHRoZSBjb21waWxlciB0byBhIGdpdmVuXG4gICAqIG5vZGUuIElmIGFueSBvZiB0aGVzZSBpbXBvcnRzIGFyZSBhYnNvbHV0ZSwgaXQncyBhbiBpbmRpY2F0aW9uIHRoYXQgdGhlIG5vZGUgYmVpbmcgaW1wb3J0ZWRcbiAgICogbWlnaHQgY29tZSBmcm9tIHRoYXQgbW9kdWxlLlxuICAgKlxuICAgKiBJdCBpcyBub3QgX2d1YXJhbnRlZWRfIHRoYXQgdGhlIG5vZGUgaW4gcXVlc3Rpb24gaXMgZXhwb3J0ZWQgZnJvbSBpdHMgYGJlc3RHdWVzc093bmluZ01vZHVsZWAgLVxuICAgKiB0aGF0IGlzIG1vc3RseSBhIGNvbnZlbnRpb24gdGhhdCBhcHBsaWVzIGluIGNlcnRhaW4gcGFja2FnZSBmb3JtYXRzLlxuICAgKlxuICAgKiBJZiBgYmVzdEd1ZXNzT3duaW5nTW9kdWxlYCBpcyBgbnVsbGAsIHRoZW4gaXQncyBsaWtlbHkgdGhlIG5vZGUgY2FtZSBmcm9tIHRoZSBjdXJyZW50IHByb2dyYW0uXG4gICAqL1xuICByZWFkb25seSBiZXN0R3Vlc3NPd25pbmdNb2R1bGU6IE93bmluZ01vZHVsZXxudWxsO1xuXG4gIHByaXZhdGUgaWRlbnRpZmllcnM6IHRzLklkZW50aWZpZXJbXSA9IFtdO1xuXG4gIHByaXZhdGUgX2FsaWFzOiBFeHByZXNzaW9ufG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IG5vZGU6IFQsIGJlc3RHdWVzc093bmluZ01vZHVsZTogT3duaW5nTW9kdWxlfG51bGwgPSBudWxsKSB7XG4gICAgdGhpcy5iZXN0R3Vlc3NPd25pbmdNb2R1bGUgPSBiZXN0R3Vlc3NPd25pbmdNb2R1bGU7XG5cbiAgICBjb25zdCBpZCA9IGlkZW50aWZpZXJPZk5vZGUobm9kZSk7XG4gICAgaWYgKGlkICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmlkZW50aWZpZXJzLnB1c2goaWQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgYmVzdCBndWVzcyBhdCB3aGljaCBtb2R1bGUgc3BlY2lmaWVyIG93bnMgdGhpcyBwYXJ0aWN1bGFyIHJlZmVyZW5jZSwgb3IgYG51bGxgIGlmIHRoZXJlXG4gICAqIGlzbid0IG9uZS5cbiAgICovXG4gIGdldCBvd25lZEJ5TW9kdWxlR3Vlc3MoKTogc3RyaW5nfG51bGwge1xuICAgIGlmICh0aGlzLmJlc3RHdWVzc093bmluZ01vZHVsZSAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuYmVzdEd1ZXNzT3duaW5nTW9kdWxlLnNwZWNpZmllcjtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhpcyByZWZlcmVuY2UgaGFzIGEgcG90ZW50aWFsIG93bmluZyBtb2R1bGUgb3Igbm90LlxuICAgKlxuICAgKiBTZWUgYGJlc3RHdWVzc093bmluZ01vZHVsZWAuXG4gICAqL1xuICBnZXQgaGFzT3duaW5nTW9kdWxlR3Vlc3MoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLmJlc3RHdWVzc093bmluZ01vZHVsZSAhPT0gbnVsbDsgfVxuXG4gIC8qKlxuICAgKiBBIG5hbWUgZm9yIHRoZSBub2RlLCBpZiBvbmUgaXMgYXZhaWxhYmxlLlxuICAgKlxuICAgKiBUaGlzIGlzIG9ubHkgc3VpdGVkIGZvciBkZWJ1Z2dpbmcuIEFueSBhY3R1YWwgcmVmZXJlbmNlcyB0byB0aGlzIG5vZGUgc2hvdWxkIGJlIG1hZGUgd2l0aFxuICAgKiBgdHMuSWRlbnRpZmllcmBzIChzZWUgYGdldElkZW50aXR5SW5gKS5cbiAgICovXG4gIGdldCBkZWJ1Z05hbWUoKTogc3RyaW5nfG51bGwge1xuICAgIGNvbnN0IGlkID0gaWRlbnRpZmllck9mTm9kZSh0aGlzLm5vZGUpO1xuICAgIHJldHVybiBpZCAhPT0gbnVsbCA/IGlkLnRleHQgOiBudWxsO1xuICB9XG5cbiAgZ2V0IGFsaWFzKCk6IEV4cHJlc3Npb258bnVsbCB7IHJldHVybiB0aGlzLl9hbGlhczsgfVxuXG5cbiAgLyoqXG4gICAqIFJlY29yZCBhIGB0cy5JZGVudGlmaWVyYCBieSB3aGljaCBpdCdzIHZhbGlkIHRvIHJlZmVyIHRvIHRoaXMgbm9kZSwgd2l0aGluIHRoZSBjb250ZXh0IG9mIHRoaXNcbiAgICogYFJlZmVyZW5jZWAuXG4gICAqL1xuICBhZGRJZGVudGlmaWVyKGlkZW50aWZpZXI6IHRzLklkZW50aWZpZXIpOiB2b2lkIHsgdGhpcy5pZGVudGlmaWVycy5wdXNoKGlkZW50aWZpZXIpOyB9XG5cbiAgLyoqXG4gICAqIEdldCBhIGB0cy5JZGVudGlmaWVyYCB3aXRoaW4gdGhpcyBgUmVmZXJlbmNlYCB0aGF0IGNhbiBiZSB1c2VkIHRvIHJlZmVyIHdpdGhpbiB0aGUgY29udGV4dCBvZiBhXG4gICAqIGdpdmVuIGB0cy5Tb3VyY2VGaWxlYCwgaWYgYW55LlxuICAgKi9cbiAgZ2V0SWRlbnRpdHlJbihjb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogdHMuSWRlbnRpZmllcnxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5pZGVudGlmaWVycy5maW5kKGlkID0+IGlkLmdldFNvdXJjZUZpbGUoKSA9PT0gY29udGV4dCkgfHwgbnVsbDtcbiAgfVxuXG4gIGNsb25lV2l0aEFsaWFzKGFsaWFzOiBFeHByZXNzaW9uKTogUmVmZXJlbmNlPFQ+IHtcbiAgICBjb25zdCByZWYgPSBuZXcgUmVmZXJlbmNlKHRoaXMubm9kZSwgdGhpcy5iZXN0R3Vlc3NPd25pbmdNb2R1bGUpO1xuICAgIHJlZi5pZGVudGlmaWVycyA9IFsuLi50aGlzLmlkZW50aWZpZXJzXTtcbiAgICByZWYuX2FsaWFzID0gYWxpYXM7XG4gICAgcmV0dXJuIHJlZjtcbiAgfVxuXG4gIGNsb25lV2l0aE5vSWRlbnRpZmllcnMoKTogUmVmZXJlbmNlPFQ+IHtcbiAgICBjb25zdCByZWYgPSBuZXcgUmVmZXJlbmNlKHRoaXMubm9kZSwgdGhpcy5iZXN0R3Vlc3NPd25pbmdNb2R1bGUpO1xuICAgIHJlZi5fYWxpYXMgPSB0aGlzLl9hbGlhcztcbiAgICByZWYuaWRlbnRpZmllcnMgPSBbXTtcbiAgICByZXR1cm4gcmVmO1xuICB9XG59XG4iXX0=