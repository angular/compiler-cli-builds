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
        define("@angular/compiler-cli/src/ngtsc/imports/src/references", ["require", "exports", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
        return Reference;
    }());
    exports.Reference = Reference;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvaW1wb3J0cy9zcmMvcmVmZXJlbmNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUlILGtGQUEyRDtJQUUzRCxJQUFZLFVBR1g7SUFIRCxXQUFZLFVBQVU7UUFDcEIscUVBQWlCLENBQUE7UUFDakIsK0RBQWMsQ0FBQTtJQUNoQixDQUFDLEVBSFcsVUFBVSxHQUFWLGtCQUFVLEtBQVYsa0JBQVUsUUFHckI7SUFPRDs7Ozs7Ozs7OztPQVVHO0lBQ0g7UUFpQkUsbUJBQXFCLElBQU8sRUFBRSxxQkFBK0M7WUFBL0Msc0NBQUEsRUFBQSw0QkFBK0M7WUFBeEQsU0FBSSxHQUFKLElBQUksQ0FBRztZQUZwQixnQkFBVyxHQUFvQixFQUFFLENBQUM7WUFHeEMsSUFBSSxDQUFDLHFCQUFxQixHQUFHLHFCQUFxQixDQUFDO1lBRW5ELElBQU0sRUFBRSxHQUFHLDZCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xDLElBQUksRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDZixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUMzQjtRQUNILENBQUM7UUFNRCxzQkFBSSx5Q0FBa0I7WUFKdEI7OztlQUdHO2lCQUNIO2dCQUNFLElBQUksSUFBSSxDQUFDLHFCQUFxQixLQUFLLElBQUksRUFBRTtvQkFDdkMsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDO2lCQUM3QztxQkFBTTtvQkFDTCxPQUFPLElBQUksQ0FBQztpQkFDYjtZQUNILENBQUM7OztXQUFBO1FBT0Qsc0JBQUksMkNBQW9CO1lBTHhCOzs7O2VBSUc7aUJBQ0gsY0FBc0MsT0FBTyxJQUFJLENBQUMscUJBQXFCLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQzs7O1dBQUE7UUFRbkYsc0JBQUksZ0NBQVM7WUFOYjs7Ozs7ZUFLRztpQkFDSDtnQkFDRSxJQUFNLEVBQUUsR0FBRyw2QkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3ZDLE9BQU8sRUFBRSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ3RDLENBQUM7OztXQUFBO1FBRUQ7OztXQUdHO1FBQ0gsaUNBQWEsR0FBYixVQUFjLFVBQXlCLElBQVUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXJGOzs7V0FHRztRQUNILGlDQUFhLEdBQWIsVUFBYyxPQUFzQjtZQUNsQyxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQUEsRUFBRSxJQUFJLE9BQUEsRUFBRSxDQUFDLGFBQWEsRUFBRSxLQUFLLE9BQU8sRUFBOUIsQ0FBOEIsQ0FBQyxJQUFJLElBQUksQ0FBQztRQUM3RSxDQUFDO1FBQ0gsZ0JBQUM7SUFBRCxDQUFDLEFBckVELElBcUVDO0lBckVZLDhCQUFTIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtpZGVudGlmaWVyT2ZOb2RlfSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuZXhwb3J0IGVudW0gSW1wb3J0TW9kZSB7XG4gIFVzZUV4aXN0aW5nSW1wb3J0LFxuICBGb3JjZU5ld0ltcG9ydCxcbn1cblxuZXhwb3J0IGludGVyZmFjZSBPd25pbmdNb2R1bGUge1xuICBzcGVjaWZpZXI6IHN0cmluZztcbiAgcmVzb2x1dGlvbkNvbnRleHQ6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBIGB0cy5Ob2RlYCBwbHVzIHRoZSBjb250ZXh0IGluIHdoaWNoIGl0IHdhcyBkaXNjb3ZlcmVkLlxuICpcbiAqIEEgYFJlZmVyZW5jZWAgaXMgYSBwb2ludGVyIHRvIGEgYHRzLk5vZGVgIHRoYXQgd2FzIGV4dHJhY3RlZCBmcm9tIHRoZSBwcm9ncmFtIHNvbWVob3cuIEl0XG4gKiBjb250YWlucyBub3Qgb25seSB0aGUgbm9kZSBpdHNlbGYsIGJ1dCB0aGUgaW5mb3JtYXRpb24gcmVnYXJkaW5nIGhvdyB0aGUgbm9kZSB3YXMgbG9jYXRlZC4gSW5cbiAqIHBhcnRpY3VsYXIsIGl0IG1pZ2h0IHRyYWNrIGRpZmZlcmVudCBpZGVudGlmaWVycyBieSB3aGljaCB0aGUgbm9kZSBpcyBleHBvc2VkLCBhcyB3ZWxsIGFzXG4gKiBwb3RlbnRpYWxseSBhIG1vZHVsZSBzcGVjaWZpZXIgd2hpY2ggbWlnaHQgZXhwb3NlIHRoZSBub2RlLlxuICpcbiAqIFRoZSBBbmd1bGFyIGNvbXBpbGVyIHVzZXMgYFJlZmVyZW5jZWBzIGluc3RlYWQgb2YgYHRzLk5vZGVgcyB3aGVuIHRyYWNraW5nIGNsYXNzZXMgb3IgZ2VuZXJhdGluZ1xuICogaW1wb3J0cy5cbiAqL1xuZXhwb3J0IGNsYXNzIFJlZmVyZW5jZTxUIGV4dGVuZHMgdHMuTm9kZSA9IHRzLk5vZGU+IHtcbiAgLyoqXG4gICAqIFRoZSBjb21waWxlcidzIGJlc3QgZ3Vlc3MgYXQgYW4gYWJzb2x1dGUgbW9kdWxlIHNwZWNpZmllciB3aGljaCBvd25zIHRoaXMgYFJlZmVyZW5jZWAuXG4gICAqXG4gICAqIFRoaXMgaXMgdXN1YWxseSBkZXRlcm1pbmVkIGJ5IHRyYWNraW5nIHRoZSBpbXBvcnQgc3RhdGVtZW50cyB3aGljaCBsZWQgdGhlIGNvbXBpbGVyIHRvIGEgZ2l2ZW5cbiAgICogbm9kZS4gSWYgYW55IG9mIHRoZXNlIGltcG9ydHMgYXJlIGFic29sdXRlLCBpdCdzIGFuIGluZGljYXRpb24gdGhhdCB0aGUgbm9kZSBiZWluZyBpbXBvcnRlZFxuICAgKiBtaWdodCBjb21lIGZyb20gdGhhdCBtb2R1bGUuXG4gICAqXG4gICAqIEl0IGlzIG5vdCBfZ3VhcmFudGVlZF8gdGhhdCB0aGUgbm9kZSBpbiBxdWVzdGlvbiBpcyBleHBvcnRlZCBmcm9tIGl0cyBgYmVzdEd1ZXNzT3duaW5nTW9kdWxlYCAtXG4gICAqIHRoYXQgaXMgbW9zdGx5IGEgY29udmVudGlvbiB0aGF0IGFwcGxpZXMgaW4gY2VydGFpbiBwYWNrYWdlIGZvcm1hdHMuXG4gICAqXG4gICAqIElmIGBiZXN0R3Vlc3NPd25pbmdNb2R1bGVgIGlzIGBudWxsYCwgdGhlbiBpdCdzIGxpa2VseSB0aGUgbm9kZSBjYW1lIGZyb20gdGhlIGN1cnJlbnQgcHJvZ3JhbS5cbiAgICovXG4gIHJlYWRvbmx5IGJlc3RHdWVzc093bmluZ01vZHVsZTogT3duaW5nTW9kdWxlfG51bGw7XG5cbiAgcHJpdmF0ZSBpZGVudGlmaWVyczogdHMuSWRlbnRpZmllcltdID0gW107XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgbm9kZTogVCwgYmVzdEd1ZXNzT3duaW5nTW9kdWxlOiBPd25pbmdNb2R1bGV8bnVsbCA9IG51bGwpIHtcbiAgICB0aGlzLmJlc3RHdWVzc093bmluZ01vZHVsZSA9IGJlc3RHdWVzc093bmluZ01vZHVsZTtcblxuICAgIGNvbnN0IGlkID0gaWRlbnRpZmllck9mTm9kZShub2RlKTtcbiAgICBpZiAoaWQgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuaWRlbnRpZmllcnMucHVzaChpZCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBiZXN0IGd1ZXNzIGF0IHdoaWNoIG1vZHVsZSBzcGVjaWZpZXIgb3ducyB0aGlzIHBhcnRpY3VsYXIgcmVmZXJlbmNlLCBvciBgbnVsbGAgaWYgdGhlcmVcbiAgICogaXNuJ3Qgb25lLlxuICAgKi9cbiAgZ2V0IG93bmVkQnlNb2R1bGVHdWVzcygpOiBzdHJpbmd8bnVsbCB7XG4gICAgaWYgKHRoaXMuYmVzdEd1ZXNzT3duaW5nTW9kdWxlICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5iZXN0R3Vlc3NPd25pbmdNb2R1bGUuc3BlY2lmaWVyO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogV2hldGhlciB0aGlzIHJlZmVyZW5jZSBoYXMgYSBwb3RlbnRpYWwgb3duaW5nIG1vZHVsZSBvciBub3QuXG4gICAqXG4gICAqIFNlZSBgYmVzdEd1ZXNzT3duaW5nTW9kdWxlYC5cbiAgICovXG4gIGdldCBoYXNPd25pbmdNb2R1bGVHdWVzcygpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMuYmVzdEd1ZXNzT3duaW5nTW9kdWxlICE9PSBudWxsOyB9XG5cbiAgLyoqXG4gICAqIEEgbmFtZSBmb3IgdGhlIG5vZGUsIGlmIG9uZSBpcyBhdmFpbGFibGUuXG4gICAqXG4gICAqIFRoaXMgaXMgb25seSBzdWl0ZWQgZm9yIGRlYnVnZ2luZy4gQW55IGFjdHVhbCByZWZlcmVuY2VzIHRvIHRoaXMgbm9kZSBzaG91bGQgYmUgbWFkZSB3aXRoXG4gICAqIGB0cy5JZGVudGlmaWVyYHMgKHNlZSBgZ2V0SWRlbnRpdHlJbmApLlxuICAgKi9cbiAgZ2V0IGRlYnVnTmFtZSgpOiBzdHJpbmd8bnVsbCB7XG4gICAgY29uc3QgaWQgPSBpZGVudGlmaWVyT2ZOb2RlKHRoaXMubm9kZSk7XG4gICAgcmV0dXJuIGlkICE9PSBudWxsID8gaWQudGV4dCA6IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogUmVjb3JkIGEgYHRzLklkZW50aWZpZXJgIGJ5IHdoaWNoIGl0J3MgdmFsaWQgdG8gcmVmZXIgdG8gdGhpcyBub2RlLCB3aXRoaW4gdGhlIGNvbnRleHQgb2YgdGhpc1xuICAgKiBgUmVmZXJlbmNlYC5cbiAgICovXG4gIGFkZElkZW50aWZpZXIoaWRlbnRpZmllcjogdHMuSWRlbnRpZmllcik6IHZvaWQgeyB0aGlzLmlkZW50aWZpZXJzLnB1c2goaWRlbnRpZmllcik7IH1cblxuICAvKipcbiAgICogR2V0IGEgYHRzLklkZW50aWZpZXJgIHdpdGhpbiB0aGlzIGBSZWZlcmVuY2VgIHRoYXQgY2FuIGJlIHVzZWQgdG8gcmVmZXIgd2l0aGluIHRoZSBjb250ZXh0IG9mIGFcbiAgICogZ2l2ZW4gYHRzLlNvdXJjZUZpbGVgLCBpZiBhbnkuXG4gICAqL1xuICBnZXRJZGVudGl0eUluKGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUpOiB0cy5JZGVudGlmaWVyfG51bGwge1xuICAgIHJldHVybiB0aGlzLmlkZW50aWZpZXJzLmZpbmQoaWQgPT4gaWQuZ2V0U291cmNlRmlsZSgpID09PSBjb250ZXh0KSB8fCBudWxsO1xuICB9XG59XG4iXX0=