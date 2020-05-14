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
                return _this.writeChanges.apply(_this, tslib_1.__spread(args));
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
            var parsedJson = this.fs.exists(packageJsonPath) ? JSON.parse(this.fs.readFile(packageJsonPath)) : {};
            try {
                // Apply all changes to both the canonical representation (read from disk) and any pre-existing,
                // in-memory representation.
                for (var changes_1 = tslib_1.__values(changes), changes_1_1 = changes_1.next(); !changes_1_1.done; changes_1_1 = changes_1.next()) {
                    var _b = tslib_1.__read(changes_1_1.value, 3), propPath = _b[0], value = _b[1], positioning = _b[2];
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
            this.fs.ensureDir(file_system_1.dirname(packageJsonPath));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZV9qc29uX3VwZGF0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvd3JpdGluZy9wYWNrYWdlX2pzb25fdXBkYXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsMkVBQW1GO0lBK0NuRjs7Ozs7O09BTUc7SUFDSDtRQUlFLDJCQUFvQixnQkFBMkM7WUFBM0MscUJBQWdCLEdBQWhCLGdCQUFnQixDQUEyQjtZQUh2RCxZQUFPLEdBQXdCLEVBQUUsQ0FBQztZQUNsQyxZQUFPLEdBQUcsS0FBSyxDQUFDO1FBRTBDLENBQUM7UUFFbkU7Ozs7Ozs7Ozs7Ozs7Ozs7V0FnQkc7UUFDSCxxQ0FBUyxHQUFULFVBQ0ksWUFBc0IsRUFBRSxLQUFnQixFQUN4QyxXQUEyRDtZQUEzRCw0QkFBQSxFQUFBLDJCQUEyRDtZQUM3RCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksRUFBRSxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUN0RCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFFRDs7Ozs7OztXQU9HO1FBQ0gsd0NBQVksR0FBWixVQUFhLGVBQStCLEVBQUUsVUFBdUI7WUFDbkUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsZUFBZSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ2pFLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1FBQ3RCLENBQUM7UUFFTyw0Q0FBZ0IsR0FBeEI7WUFDRSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7Z0JBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsc0VBQXNFLENB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UyxhQUFhLENBQUMsR0FBZSxFQUFFLElBQVk7UUFDbEQsSUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hCLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pCLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUM7SUFDcEIsQ0FBQztJQUVELFNBQVMsZ0JBQWdCLENBQ3JCLEdBQWUsRUFBRSxJQUFZLEVBQUUsV0FBMkM7UUFDNUUsUUFBUSxXQUFXLEVBQUU7WUFDbkIsS0FBSyxZQUFZO2dCQUNmLGNBQWMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxHQUFHLElBQUksRUFBUixDQUFRLENBQUMsQ0FBQztnQkFDekMsTUFBTTtZQUNSLEtBQUssYUFBYTtnQkFDaEIsNEZBQTRGO2dCQUM1RiwwQ0FBMEM7Z0JBQzFDLE1BQU07WUFDUjtnQkFDRSxJQUFJLENBQUMsT0FBTyxXQUFXLEtBQUssUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxLQUFLLFNBQVMsQ0FBQyxFQUFFO29CQUMzRSxNQUFNLElBQUksS0FBSyxDQUNYLDBCQUF3QixJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyx3QkFBbUIsSUFBSSxPQUFJLENBQUMsQ0FBQztpQkFDckY7Z0JBRUQsY0FBYyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLEtBQUssV0FBVyxDQUFDLE1BQU0sRUFBeEIsQ0FBd0IsQ0FBQyxDQUFDO2dCQUN6RCxNQUFNO1NBQ1Q7SUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBkaXJuYW1lLCBGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtKc29uT2JqZWN0LCBKc29uVmFsdWV9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50JztcblxuXG5leHBvcnQgdHlwZSBQYWNrYWdlSnNvbkNoYW5nZSA9IFtzdHJpbmdbXSwgSnNvblZhbHVlLCBQYWNrYWdlSnNvblByb3BlcnR5UG9zaXRpb25pbmddO1xuZXhwb3J0IHR5cGUgUGFja2FnZUpzb25Qcm9wZXJ0eVBvc2l0aW9uaW5nID0gJ3VuaW1wb3J0YW50J3wnYWxwaGFiZXRpYyd8e2JlZm9yZTogc3RyaW5nfTtcbmV4cG9ydCB0eXBlIFdyaXRlUGFja2FnZUpzb25DaGFuZ2VzRm4gPVxuICAgIChjaGFuZ2VzOiBQYWNrYWdlSnNvbkNoYW5nZVtdLCBwYWNrYWdlSnNvblBhdGg6IEFic29sdXRlRnNQYXRoLCBwYXJzZWRKc29uPzogSnNvbk9iamVjdCkgPT5cbiAgICAgICAgdm9pZDtcblxuLyoqXG4gKiBBIHV0aWxpdHkgb2JqZWN0IHRoYXQgY2FuIGJlIHVzZWQgdG8gc2FmZWx5IHVwZGF0ZSB2YWx1ZXMgaW4gYSBgcGFja2FnZS5qc29uYCBmaWxlLlxuICpcbiAqIEV4YW1wbGUgdXNhZ2U6XG4gKiBgYGB0c1xuICogY29uc3QgdXBkYXRlUGFja2FnZUpzb24gPSBwYWNrYWdlSnNvblVwZGF0ZXJcbiAqICAgICAuY3JlYXRlVXBkYXRlKClcbiAqICAgICAuYWRkQ2hhbmdlKFsnbmFtZSddLCAncGFja2FnZS1mb28nKVxuICogICAgIC5hZGRDaGFuZ2UoWydzY3JpcHRzJywgJ2ZvbyddLCAnZWNobyBGT09PTy4uLicsICd1bmltcG9ydGFudCcpXG4gKiAgICAgLmFkZENoYW5nZShbJ2RlcGVuZGVuY2llcycsICdiYXonXSwgJzEuMC4wJywgJ2FscGhhYmV0aWMnKVxuICogICAgIC5hZGRDaGFuZ2UoWydkZXBlbmRlbmNpZXMnLCAnYmFyJ10sICcyLjAuMCcsIHtiZWZvcmU6ICdiYXonfSlcbiAqICAgICAud3JpdGVDaGFuZ2VzKCcvZm9vL3BhY2thZ2UuanNvbicpO1xuICogICAgIC8vIG9yXG4gKiAgICAgLy8gLndyaXRlQ2hhbmdlcygnL2Zvby9wYWNrYWdlLmpzb24nLCBpbk1lbW9yeVBhcnNlZEpzb24pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZUpzb25VcGRhdGVyIHtcbiAgLyoqXG4gICAqIENyZWF0ZSBhIGBQYWNrYWdlSnNvblVwZGF0ZWAgb2JqZWN0LCB3aGljaCBwcm92aWRlcyBhIGZsdWVudCBBUEkgZm9yIGJhdGNoaW5nIHVwZGF0ZXMgdG8gYVxuICAgKiBgcGFja2FnZS5qc29uYCBmaWxlLiAoQmF0Y2hpbmcgdGhlIHVwZGF0ZXMgaXMgdXNlZnVsLCBiZWNhdXNlIGl0IGF2b2lkcyB1bm5lY2Vzc2FyeSBJL09cbiAgICogb3BlcmF0aW9ucy4pXG4gICAqL1xuICBjcmVhdGVVcGRhdGUoKTogUGFja2FnZUpzb25VcGRhdGU7XG5cbiAgLyoqXG4gICAqIFdyaXRlIGEgc2V0IG9mIGNoYW5nZXMgdG8gdGhlIHNwZWNpZmllZCBgcGFja2FnZS5qc29uYCBmaWxlIChhbmQgb3B0aW9uYWxseSBhIHByZS1leGlzdGluZyxcbiAgICogaW4tbWVtb3J5IHJlcHJlc2VudGF0aW9uIG9mIGl0KS5cbiAgICpcbiAgICogQHBhcmFtIGNoYW5nZXMgVGhlIHNldCBvZiBjaGFuZ2VzIHRvIGFwcGx5LlxuICAgKiBAcGFyYW0gcGFja2FnZUpzb25QYXRoIFRoZSBwYXRoIHRvIHRoZSBgcGFja2FnZS5qc29uYCBmaWxlIHRoYXQgbmVlZHMgdG8gYmUgdXBkYXRlZC5cbiAgICogQHBhcmFtIHBhcnNlZEpzb24gQSBwcmUtZXhpc3RpbmcsIGluLW1lbW9yeSByZXByZXNlbnRhdGlvbiBvZiB0aGUgYHBhY2thZ2UuanNvbmAgZmlsZSB0aGF0XG4gICAqICAgICAgICAgICAgICAgICAgIG5lZWRzIHRvIGJlIHVwZGF0ZWQgYXMgd2VsbC5cbiAgICovXG4gIHdyaXRlQ2hhbmdlcyhcbiAgICAgIGNoYW5nZXM6IFBhY2thZ2VKc29uQ2hhbmdlW10sIHBhY2thZ2VKc29uUGF0aDogQWJzb2x1dGVGc1BhdGgsIHBhcnNlZEpzb24/OiBKc29uT2JqZWN0KTogdm9pZDtcbn1cblxuLyoqXG4gKiBBIHV0aWxpdHkgY2xhc3MgcHJvdmlkaW5nIGEgZmx1ZW50IEFQSSBmb3IgcmVjb3JkaW5nIG11bHRpcGxlIGNoYW5nZXMgdG8gYSBgcGFja2FnZS5qc29uYCBmaWxlXG4gKiAoYW5kIG9wdGlvbmFsbHkgaXRzIGluLW1lbW9yeSBwYXJzZWQgcmVwcmVzZW50YXRpb24pLlxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3Mgc2hvdWxkIGdlbmVyYWxseSBub3QgYmUgaW5zdGFudGlhdGVkIGRpcmVjdGx5OyBpbnN0YW5jZXMgYXJlIGltcGxpY2l0bHkgY3JlYXRlZFxuICogICAgICAgdmlhIGBQYWNrYWdlSnNvblVwZGF0ZXIjY3JlYXRlVXBkYXRlKClgLlxuICovXG5leHBvcnQgY2xhc3MgUGFja2FnZUpzb25VcGRhdGUge1xuICBwcml2YXRlIGNoYW5nZXM6IFBhY2thZ2VKc29uQ2hhbmdlW10gPSBbXTtcbiAgcHJpdmF0ZSBhcHBsaWVkID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSB3cml0ZUNoYW5nZXNJbXBsOiBXcml0ZVBhY2thZ2VKc29uQ2hhbmdlc0ZuKSB7fVxuXG4gIC8qKlxuICAgKiBSZWNvcmQgYSBjaGFuZ2UgdG8gYSBgcGFja2FnZS5qc29uYCBwcm9wZXJ0eS5cbiAgICpcbiAgICogSWYgdGhlIGFuY2VzdG9yIG9iamVjdHMgZG8gbm90IHlldCBleGlzdCBpbiB0aGUgYHBhY2thZ2UuanNvbmAgZmlsZSwgdGhleSB3aWxsIGJlIGNyZWF0ZWQuIFRoZVxuICAgKiBwb3NpdGlvbmluZyBvZiB0aGUgcHJvcGVydHkgY2FuIGFsc28gYmUgc3BlY2lmaWVkLiAoSWYgdGhlIHByb3BlcnR5IGFscmVhZHkgZXhpc3RzLCBpdCB3aWxsIGJlXG4gICAqIG1vdmVkIGFjY29yZGluZ2x5LilcbiAgICpcbiAgICogTk9URTogUHJvcGVydHkgcG9zaXRpb25pbmcgaXMgb25seSBndWFyYW50ZWVkIHRvIGJlIHJlc3BlY3RlZCBpbiB0aGUgc2VyaWFsaXplZCBgcGFja2FnZS5qc29uYFxuICAgKiAgICAgICBmaWxlLiBQb3NpdGlvbmluZyB3aWxsIG5vdCBiZSB0YWtlbiBpbnRvIGFjY291bnQgd2hlbiB1cGRhdGluZyBpbi1tZW1vcnkgcmVwcmVzZW50YXRpb25zLlxuICAgKlxuICAgKiBOT1RFIDI6IFByb3BlcnR5IHBvc2l0aW9uaW5nIG9ubHkgYWZmZWN0cyB0aGUgbGFzdCBwcm9wZXJ0eSBpbiBgcHJvcGVydHlQYXRoYC4gQW5jZXN0b3JcbiAgICogICAgICAgICBvYmplY3RzJyBwb3NpdGlvbmluZyB3aWxsIG5vdCBiZSBhZmZlY3RlZC5cbiAgICpcbiAgICogQHBhcmFtIHByb3BlcnR5UGF0aCBUaGUgcGF0aCBvZiBhIChwb3NzaWJseSBuZXN0ZWQpIHByb3BlcnR5IHRvIGFkZC91cGRhdGUuXG4gICAqIEBwYXJhbSB2YWx1ZSBUaGUgbmV3IHZhbHVlIHRvIHNldCB0aGUgcHJvcGVydHkgdG8uXG4gICAqIEBwYXJhbSBwb3NpdGlvbiBUaGUgZGVzaXJlZCBwb3NpdGlvbiBmb3IgdGhlIGFkZGVkL3VwZGF0ZWQgcHJvcGVydHkuXG4gICAqL1xuICBhZGRDaGFuZ2UoXG4gICAgICBwcm9wZXJ0eVBhdGg6IHN0cmluZ1tdLCB2YWx1ZTogSnNvblZhbHVlLFxuICAgICAgcG9zaXRpb25pbmc6IFBhY2thZ2VKc29uUHJvcGVydHlQb3NpdGlvbmluZyA9ICd1bmltcG9ydGFudCcpOiB0aGlzIHtcbiAgICB0aGlzLmVuc3VyZU5vdEFwcGxpZWQoKTtcbiAgICB0aGlzLmNoYW5nZXMucHVzaChbcHJvcGVydHlQYXRoLCB2YWx1ZSwgcG9zaXRpb25pbmddKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBXcml0ZSB0aGUgcmVjb3JkZWQgY2hhbmdlcyB0byB0aGUgYXNzb2NpYXRlZCBgcGFja2FnZS5qc29uYCBmaWxlIChhbmQgb3B0aW9uYWxseSBhXG4gICAqIHByZS1leGlzdGluZywgaW4tbWVtb3J5IHJlcHJlc2VudGF0aW9uIG9mIGl0KS5cbiAgICpcbiAgICogQHBhcmFtIHBhY2thZ2VKc29uUGF0aCBUaGUgcGF0aCB0byB0aGUgYHBhY2thZ2UuanNvbmAgZmlsZSB0aGF0IG5lZWRzIHRvIGJlIHVwZGF0ZWQuXG4gICAqIEBwYXJhbSBwYXJzZWRKc29uIEEgcHJlLWV4aXN0aW5nLCBpbi1tZW1vcnkgcmVwcmVzZW50YXRpb24gb2YgdGhlIGBwYWNrYWdlLmpzb25gIGZpbGUgdGhhdFxuICAgKiAgICAgICAgICAgICAgICAgICBuZWVkcyB0byBiZSB1cGRhdGVkIGFzIHdlbGwuXG4gICAqL1xuICB3cml0ZUNoYW5nZXMocGFja2FnZUpzb25QYXRoOiBBYnNvbHV0ZUZzUGF0aCwgcGFyc2VkSnNvbj86IEpzb25PYmplY3QpOiB2b2lkIHtcbiAgICB0aGlzLmVuc3VyZU5vdEFwcGxpZWQoKTtcbiAgICB0aGlzLndyaXRlQ2hhbmdlc0ltcGwodGhpcy5jaGFuZ2VzLCBwYWNrYWdlSnNvblBhdGgsIHBhcnNlZEpzb24pO1xuICAgIHRoaXMuYXBwbGllZCA9IHRydWU7XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZU5vdEFwcGxpZWQoKSB7XG4gICAgaWYgKHRoaXMuYXBwbGllZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUcnlpbmcgdG8gYXBwbHkgYSBgUGFja2FnZUpzb25VcGRhdGVgIHRoYXQgaGFzIGFscmVhZHkgYmVlbiBhcHBsaWVkLicpO1xuICAgIH1cbiAgfVxufVxuXG4vKiogQSBgUGFja2FnZUpzb25VcGRhdGVyYCB0aGF0IHdyaXRlcyBkaXJlY3RseSB0byB0aGUgZmlsZS1zeXN0ZW0uICovXG5leHBvcnQgY2xhc3MgRGlyZWN0UGFja2FnZUpzb25VcGRhdGVyIGltcGxlbWVudHMgUGFja2FnZUpzb25VcGRhdGVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmczogRmlsZVN5c3RlbSkge31cblxuICBjcmVhdGVVcGRhdGUoKTogUGFja2FnZUpzb25VcGRhdGUge1xuICAgIHJldHVybiBuZXcgUGFja2FnZUpzb25VcGRhdGUoKC4uLmFyZ3MpID0+IHRoaXMud3JpdGVDaGFuZ2VzKC4uLmFyZ3MpKTtcbiAgfVxuXG4gIHdyaXRlQ2hhbmdlcyhcbiAgICAgIGNoYW5nZXM6IFBhY2thZ2VKc29uQ2hhbmdlW10sIHBhY2thZ2VKc29uUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgICBwcmVFeGlzdGluZ1BhcnNlZEpzb24/OiBKc29uT2JqZWN0KTogdm9pZCB7XG4gICAgaWYgKGNoYW5nZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIGNoYW5nZXMgdG8gd3JpdGUgdG8gJyR7cGFja2FnZUpzb25QYXRofScuYCk7XG4gICAgfVxuXG4gICAgLy8gUmVhZCBhbmQgcGFyc2UgdGhlIGBwYWNrYWdlLmpzb25gIGNvbnRlbnQuXG4gICAgLy8gTk9URTogV2UgYXJlIG5vdCB1c2luZyBgcHJlRXhpc3RpbmdQYXJzZWRKc29uYCAoZXZlbiBpZiBzcGVjaWZpZWQpIHRvIGF2b2lkIGNvcnJ1cHRpbmcgdGhlXG4gICAgLy8gICAgICAgY29udGVudCBvbiBkaXNrIGluIGNhc2UgYHByZUV4aXN0aW5nUGFyc2VkSnNvbmAgaXMgb3V0ZGF0ZWQuXG4gICAgY29uc3QgcGFyc2VkSnNvbiA9XG4gICAgICAgIHRoaXMuZnMuZXhpc3RzKHBhY2thZ2VKc29uUGF0aCkgPyBKU09OLnBhcnNlKHRoaXMuZnMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoKSkgOiB7fTtcblxuICAgIC8vIEFwcGx5IGFsbCBjaGFuZ2VzIHRvIGJvdGggdGhlIGNhbm9uaWNhbCByZXByZXNlbnRhdGlvbiAocmVhZCBmcm9tIGRpc2spIGFuZCBhbnkgcHJlLWV4aXN0aW5nLFxuICAgIC8vIGluLW1lbW9yeSByZXByZXNlbnRhdGlvbi5cbiAgICBmb3IgKGNvbnN0IFtwcm9wUGF0aCwgdmFsdWUsIHBvc2l0aW9uaW5nXSBvZiBjaGFuZ2VzKSB7XG4gICAgICBpZiAocHJvcFBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBwcm9wZXJ0eSBwYXRoIGZvciB3cml0aW5nIHZhbHVlIHRvICcke3BhY2thZ2VKc29uUGF0aH0nLmApO1xuICAgICAgfVxuXG4gICAgICBhcHBseUNoYW5nZShwYXJzZWRKc29uLCBwcm9wUGF0aCwgdmFsdWUsIHBvc2l0aW9uaW5nKTtcblxuICAgICAgaWYgKHByZUV4aXN0aW5nUGFyc2VkSnNvbikge1xuICAgICAgICAvLyBObyBuZWVkIHRvIHRha2UgcHJvcGVydHkgcG9zaXRpb25pbmcgaW50byBhY2NvdW50IGZvciBpbi1tZW1vcnkgcmVwcmVzZW50YXRpb25zLlxuICAgICAgICBhcHBseUNoYW5nZShwcmVFeGlzdGluZ1BhcnNlZEpzb24sIHByb3BQYXRoLCB2YWx1ZSwgJ3VuaW1wb3J0YW50Jyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRW5zdXJlIHRoZSBjb250YWluaW5nIGRpcmVjdG9yeSBleGlzdHMgKGluIGNhc2UgdGhpcyBpcyBhIHN5bnRoZXNpemVkIGBwYWNrYWdlLmpzb25gIGR1ZSB0byBhXG4gICAgLy8gY3VzdG9tIGNvbmZpZ3VyYXRpb24pIGFuZCB3cml0ZSB0aGUgdXBkYXRlZCBjb250ZW50IHRvIGRpc2suXG4gICAgdGhpcy5mcy5lbnN1cmVEaXIoZGlybmFtZShwYWNrYWdlSnNvblBhdGgpKTtcbiAgICB0aGlzLmZzLndyaXRlRmlsZShwYWNrYWdlSnNvblBhdGgsIGAke0pTT04uc3RyaW5naWZ5KHBhcnNlZEpzb24sIG51bGwsIDIpfVxcbmApO1xuICB9XG59XG5cbi8vIEhlbHBlcnNcbmV4cG9ydCBmdW5jdGlvbiBhcHBseUNoYW5nZShcbiAgICBjdHg6IEpzb25PYmplY3QsIHByb3BQYXRoOiBzdHJpbmdbXSwgdmFsdWU6IEpzb25WYWx1ZSxcbiAgICBwb3NpdGlvbmluZzogUGFja2FnZUpzb25Qcm9wZXJ0eVBvc2l0aW9uaW5nKTogdm9pZCB7XG4gIGNvbnN0IGxhc3RQcm9wSWR4ID0gcHJvcFBhdGgubGVuZ3RoIC0gMTtcbiAgY29uc3QgbGFzdFByb3AgPSBwcm9wUGF0aFtsYXN0UHJvcElkeF07XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsYXN0UHJvcElkeDsgaSsrKSB7XG4gICAgY29uc3Qga2V5ID0gcHJvcFBhdGhbaV07XG4gICAgY29uc3QgbmV3Q3R4ID0gY3R4Lmhhc093blByb3BlcnR5KGtleSkgPyBjdHhba2V5XSA6IChjdHhba2V5XSA9IHt9KTtcblxuICAgIGlmICgodHlwZW9mIG5ld0N0eCAhPT0gJ29iamVjdCcpIHx8IChuZXdDdHggPT09IG51bGwpIHx8IEFycmF5LmlzQXJyYXkobmV3Q3R4KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBQcm9wZXJ0eSBwYXRoICcke3Byb3BQYXRoLmpvaW4oJy4nKX0nIGRvZXMgbm90IHBvaW50IHRvIGFuIG9iamVjdC5gKTtcbiAgICB9XG5cbiAgICBjdHggPSBuZXdDdHg7XG4gIH1cblxuICBjdHhbbGFzdFByb3BdID0gdmFsdWU7XG4gIHBvc2l0aW9uUHJvcGVydHkoY3R4LCBsYXN0UHJvcCwgcG9zaXRpb25pbmcpO1xufVxuXG5mdW5jdGlvbiBtb3ZlUHJvcEJlZm9yZShjdHg6IEpzb25PYmplY3QsIHByb3A6IHN0cmluZywgaXNOZXh0UHJvcDogKHA6IHN0cmluZykgPT4gYm9vbGVhbik6IHZvaWQge1xuICBjb25zdCBhbGxQcm9wcyA9IE9iamVjdC5rZXlzKGN0eCk7XG4gIGNvbnN0IG90aGVyUHJvcHMgPSBhbGxQcm9wcy5maWx0ZXIocCA9PiBwICE9PSBwcm9wKTtcbiAgY29uc3QgbmV4dFByb3BJZHggPSBvdGhlclByb3BzLmZpbmRJbmRleChpc05leHRQcm9wKTtcbiAgY29uc3QgcHJvcHNUb1NoaWZ0ID0gKG5leHRQcm9wSWR4ID09PSAtMSkgPyBbXSA6IG90aGVyUHJvcHMuc2xpY2UobmV4dFByb3BJZHgpO1xuXG4gIG1vdmVQcm9wVG9FbmQoY3R4LCBwcm9wKTtcbiAgcHJvcHNUb1NoaWZ0LmZvckVhY2gocCA9PiBtb3ZlUHJvcFRvRW5kKGN0eCwgcCkpO1xufVxuXG5mdW5jdGlvbiBtb3ZlUHJvcFRvRW5kKGN0eDogSnNvbk9iamVjdCwgcHJvcDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IHZhbHVlID0gY3R4W3Byb3BdO1xuICBkZWxldGUgY3R4W3Byb3BdO1xuICBjdHhbcHJvcF0gPSB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gcG9zaXRpb25Qcm9wZXJ0eShcbiAgICBjdHg6IEpzb25PYmplY3QsIHByb3A6IHN0cmluZywgcG9zaXRpb25pbmc6IFBhY2thZ2VKc29uUHJvcGVydHlQb3NpdGlvbmluZyk6IHZvaWQge1xuICBzd2l0Y2ggKHBvc2l0aW9uaW5nKSB7XG4gICAgY2FzZSAnYWxwaGFiZXRpYyc6XG4gICAgICBtb3ZlUHJvcEJlZm9yZShjdHgsIHByb3AsIHAgPT4gcCA+IHByb3ApO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAndW5pbXBvcnRhbnQnOlxuICAgICAgLy8gTGVhdmUgdGhlIHByb3BlcnR5IG9yZGVyIHVuY2hhbmdlZDsgaS5lLiBuZXdseSBhZGRlZCBwcm9wZXJ0aWVzIHdpbGwgYmUgbGFzdCBhbmQgZXhpc3RpbmdcbiAgICAgIC8vIG9uZXMgd2lsbCByZW1haW4gaW4gdGhlaXIgb2xkIHBvc2l0aW9uLlxuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGlmICgodHlwZW9mIHBvc2l0aW9uaW5nICE9PSAnb2JqZWN0JykgfHwgKHBvc2l0aW9uaW5nLmJlZm9yZSA9PT0gdW5kZWZpbmVkKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICBgVW5rbm93biBwb3NpdGlvbmluZyAoJHtKU09OLnN0cmluZ2lmeShwb3NpdGlvbmluZyl9KSBmb3IgcHJvcGVydHkgJyR7cHJvcH0nLmApO1xuICAgICAgfVxuXG4gICAgICBtb3ZlUHJvcEJlZm9yZShjdHgsIHByb3AsIHAgPT4gcCA9PT0gcG9zaXRpb25pbmcuYmVmb3JlKTtcbiAgICAgIGJyZWFrO1xuICB9XG59XG4iXX0=