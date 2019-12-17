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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvaW1wb3J0cy9zcmMvcmVmZXJlbmNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFLSCxrRkFBMkQ7SUFFM0QsSUFBWSxVQUdYO0lBSEQsV0FBWSxVQUFVO1FBQ3BCLHFFQUFpQixDQUFBO1FBQ2pCLCtEQUFjLENBQUE7SUFDaEIsQ0FBQyxFQUhXLFVBQVUsR0FBVixrQkFBVSxLQUFWLGtCQUFVLFFBR3JCO0lBT0Q7Ozs7Ozs7Ozs7T0FVRztJQUNIO1FBMkJFLG1CQUFxQixJQUFPLEVBQUUscUJBQStDO1lBQS9DLHNDQUFBLEVBQUEsNEJBQStDO1lBQXhELFNBQUksR0FBSixJQUFJLENBQUc7WUFacEIsZ0JBQVcsR0FBb0IsRUFBRSxDQUFDO1lBRTFDOzs7OztlQUtHO1lBQ0gsY0FBUyxHQUFHLEtBQUssQ0FBQztZQUVWLFdBQU0sR0FBb0IsSUFBSSxDQUFDO1lBR3JDLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxxQkFBcUIsQ0FBQztZQUVuRCxJQUFNLEVBQUUsR0FBRyw2QkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsQyxJQUFJLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ2YsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDM0I7UUFDSCxDQUFDO1FBTUQsc0JBQUkseUNBQWtCO1lBSnRCOzs7ZUFHRztpQkFDSDtnQkFDRSxJQUFJLElBQUksQ0FBQyxxQkFBcUIsS0FBSyxJQUFJLEVBQUU7b0JBQ3ZDLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQztpQkFDN0M7cUJBQU07b0JBQ0wsT0FBTyxJQUFJLENBQUM7aUJBQ2I7WUFDSCxDQUFDOzs7V0FBQTtRQU9ELHNCQUFJLDJDQUFvQjtZQUx4Qjs7OztlQUlHO2lCQUNILGNBQXNDLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixLQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBUW5GLHNCQUFJLGdDQUFTO1lBTmI7Ozs7O2VBS0c7aUJBQ0g7Z0JBQ0UsSUFBTSxFQUFFLEdBQUcsNkJBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN2QyxPQUFPLEVBQUUsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUN0QyxDQUFDOzs7V0FBQTtRQUVELHNCQUFJLDRCQUFLO2lCQUFULGNBQStCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBR3BEOzs7V0FHRztRQUNILGlDQUFhLEdBQWIsVUFBYyxVQUF5QixJQUFVLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVyRjs7O1dBR0c7UUFDSCxpQ0FBYSxHQUFiLFVBQWMsT0FBc0I7WUFDbEMsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFBLEVBQUUsSUFBSSxPQUFBLEVBQUUsQ0FBQyxhQUFhLEVBQUUsS0FBSyxPQUFPLEVBQTlCLENBQThCLENBQUMsSUFBSSxJQUFJLENBQUM7UUFDN0UsQ0FBQztRQUVEOzs7Ozs7V0FNRztRQUNILDJDQUF1QixHQUF2QixVQUF3QixJQUFtQjtZQUN6QyxJQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDaEMsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFBLEVBQUU7Z0JBQzdCLElBQUksRUFBRSxDQUFDLGFBQWEsRUFBRSxLQUFLLEVBQUUsRUFBRTtvQkFDN0IsT0FBTyxLQUFLLENBQUM7aUJBQ2Q7Z0JBRUQsK0VBQStFO2dCQUMvRSxPQUFPLEVBQUUsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUM7WUFDbEQsQ0FBQyxDQUFDO2dCQUNFLElBQUksQ0FBQztRQUNYLENBQUM7UUFFRCxrQ0FBYyxHQUFkLFVBQWUsS0FBaUI7WUFDOUIsSUFBTSxHQUFHLEdBQUcsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQztZQUNqRSxHQUFHLENBQUMsV0FBVyxvQkFBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDeEMsR0FBRyxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7WUFDbkIsT0FBTyxHQUFHLENBQUM7UUFDYixDQUFDO1FBRUQsMENBQXNCLEdBQXRCO1lBQ0UsSUFBTSxHQUFHLEdBQUcsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQztZQUNqRSxHQUFHLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDekIsR0FBRyxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUM7WUFDckIsT0FBTyxHQUFHLENBQUM7UUFDYixDQUFDO1FBQ0gsZ0JBQUM7SUFBRCxDQUFDLEFBcEhELElBb0hDO0lBcEhZLDhCQUFTIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0V4cHJlc3Npb259IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2lkZW50aWZpZXJPZk5vZGV9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5leHBvcnQgZW51bSBJbXBvcnRNb2RlIHtcbiAgVXNlRXhpc3RpbmdJbXBvcnQsXG4gIEZvcmNlTmV3SW1wb3J0LFxufVxuXG5leHBvcnQgaW50ZXJmYWNlIE93bmluZ01vZHVsZSB7XG4gIHNwZWNpZmllcjogc3RyaW5nO1xuICByZXNvbHV0aW9uQ29udGV4dDogc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgYHRzLk5vZGVgIHBsdXMgdGhlIGNvbnRleHQgaW4gd2hpY2ggaXQgd2FzIGRpc2NvdmVyZWQuXG4gKlxuICogQSBgUmVmZXJlbmNlYCBpcyBhIHBvaW50ZXIgdG8gYSBgdHMuTm9kZWAgdGhhdCB3YXMgZXh0cmFjdGVkIGZyb20gdGhlIHByb2dyYW0gc29tZWhvdy4gSXRcbiAqIGNvbnRhaW5zIG5vdCBvbmx5IHRoZSBub2RlIGl0c2VsZiwgYnV0IHRoZSBpbmZvcm1hdGlvbiByZWdhcmRpbmcgaG93IHRoZSBub2RlIHdhcyBsb2NhdGVkLiBJblxuICogcGFydGljdWxhciwgaXQgbWlnaHQgdHJhY2sgZGlmZmVyZW50IGlkZW50aWZpZXJzIGJ5IHdoaWNoIHRoZSBub2RlIGlzIGV4cG9zZWQsIGFzIHdlbGwgYXNcbiAqIHBvdGVudGlhbGx5IGEgbW9kdWxlIHNwZWNpZmllciB3aGljaCBtaWdodCBleHBvc2UgdGhlIG5vZGUuXG4gKlxuICogVGhlIEFuZ3VsYXIgY29tcGlsZXIgdXNlcyBgUmVmZXJlbmNlYHMgaW5zdGVhZCBvZiBgdHMuTm9kZWBzIHdoZW4gdHJhY2tpbmcgY2xhc3NlcyBvciBnZW5lcmF0aW5nXG4gKiBpbXBvcnRzLlxuICovXG5leHBvcnQgY2xhc3MgUmVmZXJlbmNlPFQgZXh0ZW5kcyB0cy5Ob2RlID0gdHMuTm9kZT4ge1xuICAvKipcbiAgICogVGhlIGNvbXBpbGVyJ3MgYmVzdCBndWVzcyBhdCBhbiBhYnNvbHV0ZSBtb2R1bGUgc3BlY2lmaWVyIHdoaWNoIG93bnMgdGhpcyBgUmVmZXJlbmNlYC5cbiAgICpcbiAgICogVGhpcyBpcyB1c3VhbGx5IGRldGVybWluZWQgYnkgdHJhY2tpbmcgdGhlIGltcG9ydCBzdGF0ZW1lbnRzIHdoaWNoIGxlZCB0aGUgY29tcGlsZXIgdG8gYSBnaXZlblxuICAgKiBub2RlLiBJZiBhbnkgb2YgdGhlc2UgaW1wb3J0cyBhcmUgYWJzb2x1dGUsIGl0J3MgYW4gaW5kaWNhdGlvbiB0aGF0IHRoZSBub2RlIGJlaW5nIGltcG9ydGVkXG4gICAqIG1pZ2h0IGNvbWUgZnJvbSB0aGF0IG1vZHVsZS5cbiAgICpcbiAgICogSXQgaXMgbm90IF9ndWFyYW50ZWVkXyB0aGF0IHRoZSBub2RlIGluIHF1ZXN0aW9uIGlzIGV4cG9ydGVkIGZyb20gaXRzIGBiZXN0R3Vlc3NPd25pbmdNb2R1bGVgIC1cbiAgICogdGhhdCBpcyBtb3N0bHkgYSBjb252ZW50aW9uIHRoYXQgYXBwbGllcyBpbiBjZXJ0YWluIHBhY2thZ2UgZm9ybWF0cy5cbiAgICpcbiAgICogSWYgYGJlc3RHdWVzc093bmluZ01vZHVsZWAgaXMgYG51bGxgLCB0aGVuIGl0J3MgbGlrZWx5IHRoZSBub2RlIGNhbWUgZnJvbSB0aGUgY3VycmVudCBwcm9ncmFtLlxuICAgKi9cbiAgcmVhZG9ubHkgYmVzdEd1ZXNzT3duaW5nTW9kdWxlOiBPd25pbmdNb2R1bGV8bnVsbDtcblxuICBwcml2YXRlIGlkZW50aWZpZXJzOiB0cy5JZGVudGlmaWVyW10gPSBbXTtcblxuICAvKipcbiAgICogSW5kaWNhdGVzIHRoYXQgdGhlIFJlZmVyZW5jZSB3YXMgY3JlYXRlZCBzeW50aGV0aWNhbGx5LCBub3QgYXMgYSByZXN1bHQgb2YgbmF0dXJhbCB2YWx1ZVxuICAgKiByZXNvbHV0aW9uLlxuICAgKlxuICAgKiBUaGlzIGlzIHVzZWQgdG8gYXZvaWQgbWlzaW50ZXJwcmV0aW5nIHRoZSBSZWZlcmVuY2UgaW4gY2VydGFpbiBjb250ZXh0cy5cbiAgICovXG4gIHN5bnRoZXRpYyA9IGZhbHNlO1xuXG4gIHByaXZhdGUgX2FsaWFzOiBFeHByZXNzaW9ufG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IG5vZGU6IFQsIGJlc3RHdWVzc093bmluZ01vZHVsZTogT3duaW5nTW9kdWxlfG51bGwgPSBudWxsKSB7XG4gICAgdGhpcy5iZXN0R3Vlc3NPd25pbmdNb2R1bGUgPSBiZXN0R3Vlc3NPd25pbmdNb2R1bGU7XG5cbiAgICBjb25zdCBpZCA9IGlkZW50aWZpZXJPZk5vZGUobm9kZSk7XG4gICAgaWYgKGlkICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmlkZW50aWZpZXJzLnB1c2goaWQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgYmVzdCBndWVzcyBhdCB3aGljaCBtb2R1bGUgc3BlY2lmaWVyIG93bnMgdGhpcyBwYXJ0aWN1bGFyIHJlZmVyZW5jZSwgb3IgYG51bGxgIGlmIHRoZXJlXG4gICAqIGlzbid0IG9uZS5cbiAgICovXG4gIGdldCBvd25lZEJ5TW9kdWxlR3Vlc3MoKTogc3RyaW5nfG51bGwge1xuICAgIGlmICh0aGlzLmJlc3RHdWVzc093bmluZ01vZHVsZSAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuYmVzdEd1ZXNzT3duaW5nTW9kdWxlLnNwZWNpZmllcjtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhpcyByZWZlcmVuY2UgaGFzIGEgcG90ZW50aWFsIG93bmluZyBtb2R1bGUgb3Igbm90LlxuICAgKlxuICAgKiBTZWUgYGJlc3RHdWVzc093bmluZ01vZHVsZWAuXG4gICAqL1xuICBnZXQgaGFzT3duaW5nTW9kdWxlR3Vlc3MoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLmJlc3RHdWVzc093bmluZ01vZHVsZSAhPT0gbnVsbDsgfVxuXG4gIC8qKlxuICAgKiBBIG5hbWUgZm9yIHRoZSBub2RlLCBpZiBvbmUgaXMgYXZhaWxhYmxlLlxuICAgKlxuICAgKiBUaGlzIGlzIG9ubHkgc3VpdGVkIGZvciBkZWJ1Z2dpbmcuIEFueSBhY3R1YWwgcmVmZXJlbmNlcyB0byB0aGlzIG5vZGUgc2hvdWxkIGJlIG1hZGUgd2l0aFxuICAgKiBgdHMuSWRlbnRpZmllcmBzIChzZWUgYGdldElkZW50aXR5SW5gKS5cbiAgICovXG4gIGdldCBkZWJ1Z05hbWUoKTogc3RyaW5nfG51bGwge1xuICAgIGNvbnN0IGlkID0gaWRlbnRpZmllck9mTm9kZSh0aGlzLm5vZGUpO1xuICAgIHJldHVybiBpZCAhPT0gbnVsbCA/IGlkLnRleHQgOiBudWxsO1xuICB9XG5cbiAgZ2V0IGFsaWFzKCk6IEV4cHJlc3Npb258bnVsbCB7IHJldHVybiB0aGlzLl9hbGlhczsgfVxuXG5cbiAgLyoqXG4gICAqIFJlY29yZCBhIGB0cy5JZGVudGlmaWVyYCBieSB3aGljaCBpdCdzIHZhbGlkIHRvIHJlZmVyIHRvIHRoaXMgbm9kZSwgd2l0aGluIHRoZSBjb250ZXh0IG9mIHRoaXNcbiAgICogYFJlZmVyZW5jZWAuXG4gICAqL1xuICBhZGRJZGVudGlmaWVyKGlkZW50aWZpZXI6IHRzLklkZW50aWZpZXIpOiB2b2lkIHsgdGhpcy5pZGVudGlmaWVycy5wdXNoKGlkZW50aWZpZXIpOyB9XG5cbiAgLyoqXG4gICAqIEdldCBhIGB0cy5JZGVudGlmaWVyYCB3aXRoaW4gdGhpcyBgUmVmZXJlbmNlYCB0aGF0IGNhbiBiZSB1c2VkIHRvIHJlZmVyIHdpdGhpbiB0aGUgY29udGV4dCBvZiBhXG4gICAqIGdpdmVuIGB0cy5Tb3VyY2VGaWxlYCwgaWYgYW55LlxuICAgKi9cbiAgZ2V0SWRlbnRpdHlJbihjb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogdHMuSWRlbnRpZmllcnxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5pZGVudGlmaWVycy5maW5kKGlkID0+IGlkLmdldFNvdXJjZUZpbGUoKSA9PT0gY29udGV4dCkgfHwgbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYSBgdHMuSWRlbnRpZmllcmAgZm9yIHRoaXMgYFJlZmVyZW5jZWAgdGhhdCBleGlzdHMgd2l0aGluIHRoZSBnaXZlbiBleHByZXNzaW9uLlxuICAgKlxuICAgKiBUaGlzIGlzIHZlcnkgdXNlZnVsIGZvciBwcm9kdWNpbmcgYHRzLkRpYWdub3N0aWNgcyB0aGF0IHJlZmVyZW5jZSBgUmVmZXJlbmNlYHMgdGhhdCB3ZXJlXG4gICAqIGV4dHJhY3RlZCBmcm9tIHNvbWUgbGFyZ2VyIGV4cHJlc3Npb24sIGFzIGl0IGNhbiBiZSB1c2VkIHRvIHBpbnBvaW50IHRoZSBgdHMuSWRlbnRpZmllcmAgd2l0aGluXG4gICAqIHRoZSBleHByZXNzaW9uIGZyb20gd2hpY2ggdGhlIGBSZWZlcmVuY2VgIG9yaWdpbmF0ZWQuXG4gICAqL1xuICBnZXRJZGVudGl0eUluRXhwcmVzc2lvbihleHByOiB0cy5FeHByZXNzaW9uKTogdHMuSWRlbnRpZmllcnxudWxsIHtcbiAgICBjb25zdCBzZiA9IGV4cHIuZ2V0U291cmNlRmlsZSgpO1xuICAgIHJldHVybiB0aGlzLmlkZW50aWZpZXJzLmZpbmQoaWQgPT4ge1xuICAgICAgaWYgKGlkLmdldFNvdXJjZUZpbGUoKSAhPT0gc2YpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGlzIGlkZW50aWZpZXIgaXMgYSBtYXRjaCBpZiBpdHMgcG9zaXRpb24gbGllcyB3aXRoaW4gdGhlIGdpdmVuIGV4cHJlc3Npb24uXG4gICAgICByZXR1cm4gaWQucG9zID49IGV4cHIucG9zICYmIGlkLmVuZCA8PSBleHByLmVuZDtcbiAgICB9KSB8fFxuICAgICAgICBudWxsO1xuICB9XG5cbiAgY2xvbmVXaXRoQWxpYXMoYWxpYXM6IEV4cHJlc3Npb24pOiBSZWZlcmVuY2U8VD4ge1xuICAgIGNvbnN0IHJlZiA9IG5ldyBSZWZlcmVuY2UodGhpcy5ub2RlLCB0aGlzLmJlc3RHdWVzc093bmluZ01vZHVsZSk7XG4gICAgcmVmLmlkZW50aWZpZXJzID0gWy4uLnRoaXMuaWRlbnRpZmllcnNdO1xuICAgIHJlZi5fYWxpYXMgPSBhbGlhcztcbiAgICByZXR1cm4gcmVmO1xuICB9XG5cbiAgY2xvbmVXaXRoTm9JZGVudGlmaWVycygpOiBSZWZlcmVuY2U8VD4ge1xuICAgIGNvbnN0IHJlZiA9IG5ldyBSZWZlcmVuY2UodGhpcy5ub2RlLCB0aGlzLmJlc3RHdWVzc093bmluZ01vZHVsZSk7XG4gICAgcmVmLl9hbGlhcyA9IHRoaXMuX2FsaWFzO1xuICAgIHJlZi5pZGVudGlmaWVycyA9IFtdO1xuICAgIHJldHVybiByZWY7XG4gIH1cbn1cbiJdfQ==