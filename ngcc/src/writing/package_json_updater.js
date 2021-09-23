/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
        define("@angular/compiler-cli/ngcc/src/writing/package_json_updater", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.applyChange = exports.DirectPackageJsonUpdater = exports.PackageJsonUpdate = void 0;
    var tslib_1 = require("tslib");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    /**
     * A utility class providing a fluent API for recording multiple changes to a `package.json` file
     * (and optionally its in-memory parsed representation).
     *
     * NOTE: This class should generally not be instantiated directly; instances are implicitly created
     *       via `PackageJsonUpdater#createUpdate()`.
     */
    var PackageJsonUpdate = /** @class */ (function () {
        function PackageJsonUpdate(writeChangesImpl) {
            this.writeChangesImpl = writeChangesImpl;
            this.changes = [];
            this.applied = false;
        }
        /**
         * Record a change to a `package.json` property.
         *
         * If the ancestor objects do not yet exist in the `package.json` file, they will be created. The
         * positioning of the property can also be specified. (If the property already exists, it will be
         * moved accordingly.)
         *
         * NOTE: Property positioning is only guaranteed to be respected in the serialized `package.json`
         *       file. Positioning will not be taken into account when updating in-memory representations.
         *
         * NOTE 2: Property positioning only affects the last property in `propertyPath`. Ancestor
         *         objects' positioning will not be affected.
         *
         * @param propertyPath The path of a (possibly nested) property to add/update.
         * @param value The new value to set the property to.
         * @param position The desired position for the added/updated property.
         */
        PackageJsonUpdate.prototype.addChange = function (propertyPath, value, positioning) {
            if (positioning === void 0) { positioning = 'unimportant'; }
            this.ensureNotApplied();
            this.changes.push([propertyPath, value, positioning]);
            return this;
        };
        /**
         * Write the recorded changes to the associated `package.json` file (and optionally a
         * pre-existing, in-memory representation of it).
         *
         * @param packageJsonPath The path to the `package.json` file that needs to be updated.
         * @param parsedJson A pre-existing, in-memory representation of the `package.json` file that
         *                   needs to be updated as well.
         */
        PackageJsonUpdate.prototype.writeChanges = function (packageJsonPath, parsedJson) {
            this.ensureNotApplied();
            this.writeChangesImpl(this.changes, packageJsonPath, parsedJson);
            this.applied = true;
        };
        PackageJsonUpdate.prototype.ensureNotApplied = function () {
            if (this.applied) {
                throw new Error('Trying to apply a `PackageJsonUpdate` that has already been applied.');
            }
        };
        return PackageJsonUpdate;
    }());
    exports.PackageJsonUpdate = PackageJsonUpdate;
    /** A `PackageJsonUpdater` that writes directly to the file-system. */
    var DirectPackageJsonUpdater = /** @class */ (function () {
        function DirectPackageJsonUpdater(fs) {
            this.fs = fs;
        }
        DirectPackageJsonUpdater.prototype.createUpdate = function () {
            var _this = this;
            return new PackageJsonUpdate(function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                return _this.writeChanges.apply(_this, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(args), false));
            });
        };
        DirectPackageJsonUpdater.prototype.writeChanges = function (changes, packageJsonPath, preExistingParsedJson) {
            var e_1, _a;
            if (changes.length === 0) {
                throw new Error("No changes to write to '" + packageJsonPath + "'.");
            }
            // Read and parse the `package.json` content.
            // NOTE: We are not using `preExistingParsedJson` (even if specified) to avoid corrupting the
            //       content on disk in case `preExistingParsedJson` is outdated.
            var parsedJson = this.fs.exists(packageJsonPath) ?
                JSON.parse(this.fs.readFile(packageJsonPath)) :
                {};
            try {
                // Apply all changes to both the canonical representation (read from disk) and any pre-existing,
                // in-memory representation.
                for (var changes_1 = (0, tslib_1.__values)(changes), changes_1_1 = changes_1.next(); !changes_1_1.done; changes_1_1 = changes_1.next()) {
                    var _b = (0, tslib_1.__read)(changes_1_1.value, 3), propPath = _b[0], value = _b[1], positioning = _b[2];
                    if (propPath.length === 0) {
                        throw new Error("Missing property path for writing value to '" + packageJsonPath + "'.");
                    }
                    applyChange(parsedJson, propPath, value, positioning);
                    if (preExistingParsedJson) {
                        // No need to take property positioning into account for in-memory representations.
                        applyChange(preExistingParsedJson, propPath, value, 'unimportant');
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (changes_1_1 && !changes_1_1.done && (_a = changes_1.return)) _a.call(changes_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            // Ensure the containing directory exists (in case this is a synthesized `package.json` due to a
            // custom configuration) and write the updated content to disk.
            this.fs.ensureDir((0, file_system_1.dirname)(packageJsonPath));
            this.fs.writeFile(packageJsonPath, JSON.stringify(parsedJson, null, 2) + "\n");
        };
        return DirectPackageJsonUpdater;
    }());
    exports.DirectPackageJsonUpdater = DirectPackageJsonUpdater;
    // Helpers
    function applyChange(ctx, propPath, value, positioning) {
        var lastPropIdx = propPath.length - 1;
        var lastProp = propPath[lastPropIdx];
        for (var i = 0; i < lastPropIdx; i++) {
            var key = propPath[i];
            var newCtx = ctx.hasOwnProperty(key) ? ctx[key] : (ctx[key] = {});
            if ((typeof newCtx !== 'object') || (newCtx === null) || Array.isArray(newCtx)) {
                throw new Error("Property path '" + propPath.join('.') + "' does not point to an object.");
            }
            ctx = newCtx;
        }
        ctx[lastProp] = value;
        positionProperty(ctx, lastProp, positioning);
    }
    exports.applyChange = applyChange;
    function movePropBefore(ctx, prop, isNextProp) {
        var allProps = Object.keys(ctx);
        var otherProps = allProps.filter(function (p) { return p !== prop; });
        var nextPropIdx = otherProps.findIndex(isNextProp);
        var propsToShift = (nextPropIdx === -1) ? [] : otherProps.slice(nextPropIdx);
        movePropToEnd(ctx, prop);
        propsToShift.forEach(function (p) { return movePropToEnd(ctx, p); });
    }
    function movePropToEnd(ctx, prop) {
        var value = ctx[prop];
        delete ctx[prop];
        ctx[prop] = value;
    }
    function positionProperty(ctx, prop, positioning) {
        switch (positioning) {
            case 'alphabetic':
                movePropBefore(ctx, prop, function (p) { return p > prop; });
                break;
            case 'unimportant':
                // Leave the property order unchanged; i.e. newly added properties will be last and existing
                // ones will remain in their old position.
                break;
            default:
                if ((typeof positioning !== 'object') || (positioning.before === undefined)) {
                    throw new Error("Unknown positioning (" + JSON.stringify(positioning) + ") for property '" + prop + "'.");
                }
                movePropBefore(ctx, prop, function (p) { return p === positioning.before; });
                break;
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZV9qc29uX3VwZGF0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvd3JpdGluZy9wYWNrYWdlX2pzb25fdXBkYXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsMkVBQW1GO0lBK0NuRjs7Ozs7O09BTUc7SUFDSDtRQUlFLDJCQUFvQixnQkFBMkM7WUFBM0MscUJBQWdCLEdBQWhCLGdCQUFnQixDQUEyQjtZQUh2RCxZQUFPLEdBQXdCLEVBQUUsQ0FBQztZQUNsQyxZQUFPLEdBQUcsS0FBSyxDQUFDO1FBRTBDLENBQUM7UUFFbkU7Ozs7Ozs7Ozs7Ozs7Ozs7V0FnQkc7UUFDSCxxQ0FBUyxHQUFULFVBQ0ksWUFBc0IsRUFBRSxLQUFnQixFQUN4QyxXQUEyRDtZQUEzRCw0QkFBQSxFQUFBLDJCQUEyRDtZQUM3RCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksRUFBRSxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUN0RCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFFRDs7Ozs7OztXQU9HO1FBQ0gsd0NBQVksR0FBWixVQUFhLGVBQStCLEVBQUUsVUFBdUI7WUFDbkUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsZUFBZSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ2pFLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1FBQ3RCLENBQUM7UUFFTyw0Q0FBZ0IsR0FBeEI7WUFDRSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7Z0JBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsc0VBQXNFLENB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SUFFRCxTQUFTLGFBQWEsQ0FBQyxHQUFlLEVBQUUsSUFBWTtRQUNsRCxJQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDeEIsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakIsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQztJQUNwQixDQUFDO0lBRUQsU0FBUyxnQkFBZ0IsQ0FDckIsR0FBZSxFQUFFLElBQVksRUFBRSxXQUEyQztRQUM1RSxRQUFRLFdBQVcsRUFBRTtZQUNuQixLQUFLLFlBQVk7Z0JBQ2YsY0FBYyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLEdBQUcsSUFBSSxFQUFSLENBQVEsQ0FBQyxDQUFDO2dCQUN6QyxNQUFNO1lBQ1IsS0FBSyxhQUFhO2dCQUNoQiw0RkFBNEY7Z0JBQzVGLDBDQUEwQztnQkFDMUMsTUFBTTtZQUNSO2dCQUNFLElBQUksQ0FBQyxPQUFPLFdBQVcsS0FBSyxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEtBQUssU0FBUyxDQUFDLEVBQUU7b0JBQzNFLE1BQU0sSUFBSSxLQUFLLENBQ1gsMEJBQXdCLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLHdCQUFtQixJQUFJLE9BQUksQ0FBQyxDQUFDO2lCQUNyRjtnQkFFRCxjQUFjLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsS0FBSyxXQUFXLENBQUMsTUFBTSxFQUF4QixDQUF3QixDQUFDLENBQUM7Z0JBQ3pELE1BQU07U0FDVDtJQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgZGlybmFtZSwgRmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7SnNvbk9iamVjdCwgSnNvblZhbHVlfSBmcm9tICcuLi9wYWNrYWdlcy9lbnRyeV9wb2ludCc7XG5cblxuZXhwb3J0IHR5cGUgUGFja2FnZUpzb25DaGFuZ2UgPSBbc3RyaW5nW10sIEpzb25WYWx1ZSwgUGFja2FnZUpzb25Qcm9wZXJ0eVBvc2l0aW9uaW5nXTtcbmV4cG9ydCB0eXBlIFBhY2thZ2VKc29uUHJvcGVydHlQb3NpdGlvbmluZyA9ICd1bmltcG9ydGFudCd8J2FscGhhYmV0aWMnfHtiZWZvcmU6IHN0cmluZ307XG5leHBvcnQgdHlwZSBXcml0ZVBhY2thZ2VKc29uQ2hhbmdlc0ZuID1cbiAgICAoY2hhbmdlczogUGFja2FnZUpzb25DaGFuZ2VbXSwgcGFja2FnZUpzb25QYXRoOiBBYnNvbHV0ZUZzUGF0aCwgcGFyc2VkSnNvbj86IEpzb25PYmplY3QpID0+XG4gICAgICAgIHZvaWQ7XG5cbi8qKlxuICogQSB1dGlsaXR5IG9iamVjdCB0aGF0IGNhbiBiZSB1c2VkIHRvIHNhZmVseSB1cGRhdGUgdmFsdWVzIGluIGEgYHBhY2thZ2UuanNvbmAgZmlsZS5cbiAqXG4gKiBFeGFtcGxlIHVzYWdlOlxuICogYGBgdHNcbiAqIGNvbnN0IHVwZGF0ZVBhY2thZ2VKc29uID0gcGFja2FnZUpzb25VcGRhdGVyXG4gKiAgICAgLmNyZWF0ZVVwZGF0ZSgpXG4gKiAgICAgLmFkZENoYW5nZShbJ25hbWUnXSwgJ3BhY2thZ2UtZm9vJylcbiAqICAgICAuYWRkQ2hhbmdlKFsnc2NyaXB0cycsICdmb28nXSwgJ2VjaG8gRk9PT08uLi4nLCAndW5pbXBvcnRhbnQnKVxuICogICAgIC5hZGRDaGFuZ2UoWydkZXBlbmRlbmNpZXMnLCAnYmF6J10sICcxLjAuMCcsICdhbHBoYWJldGljJylcbiAqICAgICAuYWRkQ2hhbmdlKFsnZGVwZW5kZW5jaWVzJywgJ2JhciddLCAnMi4wLjAnLCB7YmVmb3JlOiAnYmF6J30pXG4gKiAgICAgLndyaXRlQ2hhbmdlcygnL2Zvby9wYWNrYWdlLmpzb24nKTtcbiAqICAgICAvLyBvclxuICogICAgIC8vIC53cml0ZUNoYW5nZXMoJy9mb28vcGFja2FnZS5qc29uJywgaW5NZW1vcnlQYXJzZWRKc29uKTtcbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VKc29uVXBkYXRlciB7XG4gIC8qKlxuICAgKiBDcmVhdGUgYSBgUGFja2FnZUpzb25VcGRhdGVgIG9iamVjdCwgd2hpY2ggcHJvdmlkZXMgYSBmbHVlbnQgQVBJIGZvciBiYXRjaGluZyB1cGRhdGVzIHRvIGFcbiAgICogYHBhY2thZ2UuanNvbmAgZmlsZS4gKEJhdGNoaW5nIHRoZSB1cGRhdGVzIGlzIHVzZWZ1bCwgYmVjYXVzZSBpdCBhdm9pZHMgdW5uZWNlc3NhcnkgSS9PXG4gICAqIG9wZXJhdGlvbnMuKVxuICAgKi9cbiAgY3JlYXRlVXBkYXRlKCk6IFBhY2thZ2VKc29uVXBkYXRlO1xuXG4gIC8qKlxuICAgKiBXcml0ZSBhIHNldCBvZiBjaGFuZ2VzIHRvIHRoZSBzcGVjaWZpZWQgYHBhY2thZ2UuanNvbmAgZmlsZSAoYW5kIG9wdGlvbmFsbHkgYSBwcmUtZXhpc3RpbmcsXG4gICAqIGluLW1lbW9yeSByZXByZXNlbnRhdGlvbiBvZiBpdCkuXG4gICAqXG4gICAqIEBwYXJhbSBjaGFuZ2VzIFRoZSBzZXQgb2YgY2hhbmdlcyB0byBhcHBseS5cbiAgICogQHBhcmFtIHBhY2thZ2VKc29uUGF0aCBUaGUgcGF0aCB0byB0aGUgYHBhY2thZ2UuanNvbmAgZmlsZSB0aGF0IG5lZWRzIHRvIGJlIHVwZGF0ZWQuXG4gICAqIEBwYXJhbSBwYXJzZWRKc29uIEEgcHJlLWV4aXN0aW5nLCBpbi1tZW1vcnkgcmVwcmVzZW50YXRpb24gb2YgdGhlIGBwYWNrYWdlLmpzb25gIGZpbGUgdGhhdFxuICAgKiAgICAgICAgICAgICAgICAgICBuZWVkcyB0byBiZSB1cGRhdGVkIGFzIHdlbGwuXG4gICAqL1xuICB3cml0ZUNoYW5nZXMoXG4gICAgICBjaGFuZ2VzOiBQYWNrYWdlSnNvbkNoYW5nZVtdLCBwYWNrYWdlSnNvblBhdGg6IEFic29sdXRlRnNQYXRoLCBwYXJzZWRKc29uPzogSnNvbk9iamVjdCk6IHZvaWQ7XG59XG5cbi8qKlxuICogQSB1dGlsaXR5IGNsYXNzIHByb3ZpZGluZyBhIGZsdWVudCBBUEkgZm9yIHJlY29yZGluZyBtdWx0aXBsZSBjaGFuZ2VzIHRvIGEgYHBhY2thZ2UuanNvbmAgZmlsZVxuICogKGFuZCBvcHRpb25hbGx5IGl0cyBpbi1tZW1vcnkgcGFyc2VkIHJlcHJlc2VudGF0aW9uKS5cbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIHNob3VsZCBnZW5lcmFsbHkgbm90IGJlIGluc3RhbnRpYXRlZCBkaXJlY3RseTsgaW5zdGFuY2VzIGFyZSBpbXBsaWNpdGx5IGNyZWF0ZWRcbiAqICAgICAgIHZpYSBgUGFja2FnZUpzb25VcGRhdGVyI2NyZWF0ZVVwZGF0ZSgpYC5cbiAqL1xuZXhwb3J0IGNsYXNzIFBhY2thZ2VKc29uVXBkYXRlIHtcbiAgcHJpdmF0ZSBjaGFuZ2VzOiBQYWNrYWdlSnNvbkNoYW5nZVtdID0gW107XG4gIHByaXZhdGUgYXBwbGllZCA9IGZhbHNlO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgd3JpdGVDaGFuZ2VzSW1wbDogV3JpdGVQYWNrYWdlSnNvbkNoYW5nZXNGbikge31cblxuICAvKipcbiAgICogUmVjb3JkIGEgY2hhbmdlIHRvIGEgYHBhY2thZ2UuanNvbmAgcHJvcGVydHkuXG4gICAqXG4gICAqIElmIHRoZSBhbmNlc3RvciBvYmplY3RzIGRvIG5vdCB5ZXQgZXhpc3QgaW4gdGhlIGBwYWNrYWdlLmpzb25gIGZpbGUsIHRoZXkgd2lsbCBiZSBjcmVhdGVkLiBUaGVcbiAgICogcG9zaXRpb25pbmcgb2YgdGhlIHByb3BlcnR5IGNhbiBhbHNvIGJlIHNwZWNpZmllZC4gKElmIHRoZSBwcm9wZXJ0eSBhbHJlYWR5IGV4aXN0cywgaXQgd2lsbCBiZVxuICAgKiBtb3ZlZCBhY2NvcmRpbmdseS4pXG4gICAqXG4gICAqIE5PVEU6IFByb3BlcnR5IHBvc2l0aW9uaW5nIGlzIG9ubHkgZ3VhcmFudGVlZCB0byBiZSByZXNwZWN0ZWQgaW4gdGhlIHNlcmlhbGl6ZWQgYHBhY2thZ2UuanNvbmBcbiAgICogICAgICAgZmlsZS4gUG9zaXRpb25pbmcgd2lsbCBub3QgYmUgdGFrZW4gaW50byBhY2NvdW50IHdoZW4gdXBkYXRpbmcgaW4tbWVtb3J5IHJlcHJlc2VudGF0aW9ucy5cbiAgICpcbiAgICogTk9URSAyOiBQcm9wZXJ0eSBwb3NpdGlvbmluZyBvbmx5IGFmZmVjdHMgdGhlIGxhc3QgcHJvcGVydHkgaW4gYHByb3BlcnR5UGF0aGAuIEFuY2VzdG9yXG4gICAqICAgICAgICAgb2JqZWN0cycgcG9zaXRpb25pbmcgd2lsbCBub3QgYmUgYWZmZWN0ZWQuXG4gICAqXG4gICAqIEBwYXJhbSBwcm9wZXJ0eVBhdGggVGhlIHBhdGggb2YgYSAocG9zc2libHkgbmVzdGVkKSBwcm9wZXJ0eSB0byBhZGQvdXBkYXRlLlxuICAgKiBAcGFyYW0gdmFsdWUgVGhlIG5ldyB2YWx1ZSB0byBzZXQgdGhlIHByb3BlcnR5IHRvLlxuICAgKiBAcGFyYW0gcG9zaXRpb24gVGhlIGRlc2lyZWQgcG9zaXRpb24gZm9yIHRoZSBhZGRlZC91cGRhdGVkIHByb3BlcnR5LlxuICAgKi9cbiAgYWRkQ2hhbmdlKFxuICAgICAgcHJvcGVydHlQYXRoOiBzdHJpbmdbXSwgdmFsdWU6IEpzb25WYWx1ZSxcbiAgICAgIHBvc2l0aW9uaW5nOiBQYWNrYWdlSnNvblByb3BlcnR5UG9zaXRpb25pbmcgPSAndW5pbXBvcnRhbnQnKTogdGhpcyB7XG4gICAgdGhpcy5lbnN1cmVOb3RBcHBsaWVkKCk7XG4gICAgdGhpcy5jaGFuZ2VzLnB1c2goW3Byb3BlcnR5UGF0aCwgdmFsdWUsIHBvc2l0aW9uaW5nXSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogV3JpdGUgdGhlIHJlY29yZGVkIGNoYW5nZXMgdG8gdGhlIGFzc29jaWF0ZWQgYHBhY2thZ2UuanNvbmAgZmlsZSAoYW5kIG9wdGlvbmFsbHkgYVxuICAgKiBwcmUtZXhpc3RpbmcsIGluLW1lbW9yeSByZXByZXNlbnRhdGlvbiBvZiBpdCkuXG4gICAqXG4gICAqIEBwYXJhbSBwYWNrYWdlSnNvblBhdGggVGhlIHBhdGggdG8gdGhlIGBwYWNrYWdlLmpzb25gIGZpbGUgdGhhdCBuZWVkcyB0byBiZSB1cGRhdGVkLlxuICAgKiBAcGFyYW0gcGFyc2VkSnNvbiBBIHByZS1leGlzdGluZywgaW4tbWVtb3J5IHJlcHJlc2VudGF0aW9uIG9mIHRoZSBgcGFja2FnZS5qc29uYCBmaWxlIHRoYXRcbiAgICogICAgICAgICAgICAgICAgICAgbmVlZHMgdG8gYmUgdXBkYXRlZCBhcyB3ZWxsLlxuICAgKi9cbiAgd3JpdGVDaGFuZ2VzKHBhY2thZ2VKc29uUGF0aDogQWJzb2x1dGVGc1BhdGgsIHBhcnNlZEpzb24/OiBKc29uT2JqZWN0KTogdm9pZCB7XG4gICAgdGhpcy5lbnN1cmVOb3RBcHBsaWVkKCk7XG4gICAgdGhpcy53cml0ZUNoYW5nZXNJbXBsKHRoaXMuY2hhbmdlcywgcGFja2FnZUpzb25QYXRoLCBwYXJzZWRKc29uKTtcbiAgICB0aGlzLmFwcGxpZWQgPSB0cnVlO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVOb3RBcHBsaWVkKCkge1xuICAgIGlmICh0aGlzLmFwcGxpZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVHJ5aW5nIHRvIGFwcGx5IGEgYFBhY2thZ2VKc29uVXBkYXRlYCB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gYXBwbGllZC4nKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqIEEgYFBhY2thZ2VKc29uVXBkYXRlcmAgdGhhdCB3cml0ZXMgZGlyZWN0bHkgdG8gdGhlIGZpbGUtc3lzdGVtLiAqL1xuZXhwb3J0IGNsYXNzIERpcmVjdFBhY2thZ2VKc29uVXBkYXRlciBpbXBsZW1lbnRzIFBhY2thZ2VKc29uVXBkYXRlciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZnM6IEZpbGVTeXN0ZW0pIHt9XG5cbiAgY3JlYXRlVXBkYXRlKCk6IFBhY2thZ2VKc29uVXBkYXRlIHtcbiAgICByZXR1cm4gbmV3IFBhY2thZ2VKc29uVXBkYXRlKCguLi5hcmdzKSA9PiB0aGlzLndyaXRlQ2hhbmdlcyguLi5hcmdzKSk7XG4gIH1cblxuICB3cml0ZUNoYW5nZXMoXG4gICAgICBjaGFuZ2VzOiBQYWNrYWdlSnNvbkNoYW5nZVtdLCBwYWNrYWdlSnNvblBhdGg6IEFic29sdXRlRnNQYXRoLFxuICAgICAgcHJlRXhpc3RpbmdQYXJzZWRKc29uPzogSnNvbk9iamVjdCk6IHZvaWQge1xuICAgIGlmIChjaGFuZ2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBjaGFuZ2VzIHRvIHdyaXRlIHRvICcke3BhY2thZ2VKc29uUGF0aH0nLmApO1xuICAgIH1cblxuICAgIC8vIFJlYWQgYW5kIHBhcnNlIHRoZSBgcGFja2FnZS5qc29uYCBjb250ZW50LlxuICAgIC8vIE5PVEU6IFdlIGFyZSBub3QgdXNpbmcgYHByZUV4aXN0aW5nUGFyc2VkSnNvbmAgKGV2ZW4gaWYgc3BlY2lmaWVkKSB0byBhdm9pZCBjb3JydXB0aW5nIHRoZVxuICAgIC8vICAgICAgIGNvbnRlbnQgb24gZGlzayBpbiBjYXNlIGBwcmVFeGlzdGluZ1BhcnNlZEpzb25gIGlzIG91dGRhdGVkLlxuICAgIGNvbnN0IHBhcnNlZEpzb24gPSB0aGlzLmZzLmV4aXN0cyhwYWNrYWdlSnNvblBhdGgpID9cbiAgICAgICAgSlNPTi5wYXJzZSh0aGlzLmZzLnJlYWRGaWxlKHBhY2thZ2VKc29uUGF0aCkpIGFzIEpzb25PYmplY3QgOlxuICAgICAgICB7fTtcblxuICAgIC8vIEFwcGx5IGFsbCBjaGFuZ2VzIHRvIGJvdGggdGhlIGNhbm9uaWNhbCByZXByZXNlbnRhdGlvbiAocmVhZCBmcm9tIGRpc2spIGFuZCBhbnkgcHJlLWV4aXN0aW5nLFxuICAgIC8vIGluLW1lbW9yeSByZXByZXNlbnRhdGlvbi5cbiAgICBmb3IgKGNvbnN0IFtwcm9wUGF0aCwgdmFsdWUsIHBvc2l0aW9uaW5nXSBvZiBjaGFuZ2VzKSB7XG4gICAgICBpZiAocHJvcFBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBwcm9wZXJ0eSBwYXRoIGZvciB3cml0aW5nIHZhbHVlIHRvICcke3BhY2thZ2VKc29uUGF0aH0nLmApO1xuICAgICAgfVxuXG4gICAgICBhcHBseUNoYW5nZShwYXJzZWRKc29uLCBwcm9wUGF0aCwgdmFsdWUsIHBvc2l0aW9uaW5nKTtcblxuICAgICAgaWYgKHByZUV4aXN0aW5nUGFyc2VkSnNvbikge1xuICAgICAgICAvLyBObyBuZWVkIHRvIHRha2UgcHJvcGVydHkgcG9zaXRpb25pbmcgaW50byBhY2NvdW50IGZvciBpbi1tZW1vcnkgcmVwcmVzZW50YXRpb25zLlxuICAgICAgICBhcHBseUNoYW5nZShwcmVFeGlzdGluZ1BhcnNlZEpzb24sIHByb3BQYXRoLCB2YWx1ZSwgJ3VuaW1wb3J0YW50Jyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRW5zdXJlIHRoZSBjb250YWluaW5nIGRpcmVjdG9yeSBleGlzdHMgKGluIGNhc2UgdGhpcyBpcyBhIHN5bnRoZXNpemVkIGBwYWNrYWdlLmpzb25gIGR1ZSB0byBhXG4gICAgLy8gY3VzdG9tIGNvbmZpZ3VyYXRpb24pIGFuZCB3cml0ZSB0aGUgdXBkYXRlZCBjb250ZW50IHRvIGRpc2suXG4gICAgdGhpcy5mcy5lbnN1cmVEaXIoZGlybmFtZShwYWNrYWdlSnNvblBhdGgpKTtcbiAgICB0aGlzLmZzLndyaXRlRmlsZShwYWNrYWdlSnNvblBhdGgsIGAke0pTT04uc3RyaW5naWZ5KHBhcnNlZEpzb24sIG51bGwsIDIpfVxcbmApO1xuICB9XG59XG5cbi8vIEhlbHBlcnNcbmV4cG9ydCBmdW5jdGlvbiBhcHBseUNoYW5nZShcbiAgICBjdHg6IEpzb25PYmplY3QsIHByb3BQYXRoOiBzdHJpbmdbXSwgdmFsdWU6IEpzb25WYWx1ZSxcbiAgICBwb3NpdGlvbmluZzogUGFja2FnZUpzb25Qcm9wZXJ0eVBvc2l0aW9uaW5nKTogdm9pZCB7XG4gIGNvbnN0IGxhc3RQcm9wSWR4ID0gcHJvcFBhdGgubGVuZ3RoIC0gMTtcbiAgY29uc3QgbGFzdFByb3AgPSBwcm9wUGF0aFtsYXN0UHJvcElkeF07XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsYXN0UHJvcElkeDsgaSsrKSB7XG4gICAgY29uc3Qga2V5ID0gcHJvcFBhdGhbaV07XG4gICAgY29uc3QgbmV3Q3R4ID0gY3R4Lmhhc093blByb3BlcnR5KGtleSkgPyBjdHhba2V5XSA6IChjdHhba2V5XSA9IHt9KTtcblxuICAgIGlmICgodHlwZW9mIG5ld0N0eCAhPT0gJ29iamVjdCcpIHx8IChuZXdDdHggPT09IG51bGwpIHx8IEFycmF5LmlzQXJyYXkobmV3Q3R4KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBQcm9wZXJ0eSBwYXRoICcke3Byb3BQYXRoLmpvaW4oJy4nKX0nIGRvZXMgbm90IHBvaW50IHRvIGFuIG9iamVjdC5gKTtcbiAgICB9XG5cbiAgICBjdHggPSBuZXdDdHg7XG4gIH1cblxuICBjdHhbbGFzdFByb3BdID0gdmFsdWU7XG4gIHBvc2l0aW9uUHJvcGVydHkoY3R4LCBsYXN0UHJvcCwgcG9zaXRpb25pbmcpO1xufVxuXG5mdW5jdGlvbiBtb3ZlUHJvcEJlZm9yZShjdHg6IEpzb25PYmplY3QsIHByb3A6IHN0cmluZywgaXNOZXh0UHJvcDogKHA6IHN0cmluZykgPT4gYm9vbGVhbik6IHZvaWQge1xuICBjb25zdCBhbGxQcm9wcyA9IE9iamVjdC5rZXlzKGN0eCk7XG4gIGNvbnN0IG90aGVyUHJvcHMgPSBhbGxQcm9wcy5maWx0ZXIocCA9PiBwICE9PSBwcm9wKTtcbiAgY29uc3QgbmV4dFByb3BJZHggPSBvdGhlclByb3BzLmZpbmRJbmRleChpc05leHRQcm9wKTtcbiAgY29uc3QgcHJvcHNUb1NoaWZ0ID0gKG5leHRQcm9wSWR4ID09PSAtMSkgPyBbXSA6IG90aGVyUHJvcHMuc2xpY2UobmV4dFByb3BJZHgpO1xuXG4gIG1vdmVQcm9wVG9FbmQoY3R4LCBwcm9wKTtcbiAgcHJvcHNUb1NoaWZ0LmZvckVhY2gocCA9PiBtb3ZlUHJvcFRvRW5kKGN0eCwgcCkpO1xufVxuXG5mdW5jdGlvbiBtb3ZlUHJvcFRvRW5kKGN0eDogSnNvbk9iamVjdCwgcHJvcDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IHZhbHVlID0gY3R4W3Byb3BdO1xuICBkZWxldGUgY3R4W3Byb3BdO1xuICBjdHhbcHJvcF0gPSB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gcG9zaXRpb25Qcm9wZXJ0eShcbiAgICBjdHg6IEpzb25PYmplY3QsIHByb3A6IHN0cmluZywgcG9zaXRpb25pbmc6IFBhY2thZ2VKc29uUHJvcGVydHlQb3NpdGlvbmluZyk6IHZvaWQge1xuICBzd2l0Y2ggKHBvc2l0aW9uaW5nKSB7XG4gICAgY2FzZSAnYWxwaGFiZXRpYyc6XG4gICAgICBtb3ZlUHJvcEJlZm9yZShjdHgsIHByb3AsIHAgPT4gcCA+IHByb3ApO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAndW5pbXBvcnRhbnQnOlxuICAgICAgLy8gTGVhdmUgdGhlIHByb3BlcnR5IG9yZGVyIHVuY2hhbmdlZDsgaS5lLiBuZXdseSBhZGRlZCBwcm9wZXJ0aWVzIHdpbGwgYmUgbGFzdCBhbmQgZXhpc3RpbmdcbiAgICAgIC8vIG9uZXMgd2lsbCByZW1haW4gaW4gdGhlaXIgb2xkIHBvc2l0aW9uLlxuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGlmICgodHlwZW9mIHBvc2l0aW9uaW5nICE9PSAnb2JqZWN0JykgfHwgKHBvc2l0aW9uaW5nLmJlZm9yZSA9PT0gdW5kZWZpbmVkKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICBgVW5rbm93biBwb3NpdGlvbmluZyAoJHtKU09OLnN0cmluZ2lmeShwb3NpdGlvbmluZyl9KSBmb3IgcHJvcGVydHkgJyR7cHJvcH0nLmApO1xuICAgICAgfVxuXG4gICAgICBtb3ZlUHJvcEJlZm9yZShjdHgsIHByb3AsIHAgPT4gcCA9PT0gcG9zaXRpb25pbmcuYmVmb3JlKTtcbiAgICAgIGJyZWFrO1xuICB9XG59XG4iXX0=