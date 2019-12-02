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
         * Record a change to a `package.json` property. If the ancestor objects do not yet exist in the
         * `package.json` file, they will be created.
         *
         * @param propertyPath The path of a (possibly nested) property to update.
         * @param value The new value to set the property to.
         */
        PackageJsonUpdate.prototype.addChange = function (propertyPath, value) {
            this.ensureNotApplied();
            this.changes.push([propertyPath, value]);
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
                    var _b = tslib_1.__read(changes_1_1.value, 2), propPath = _b[0], value = _b[1];
                    if (propPath.length === 0) {
                        throw new Error("Missing property path for writing value to '" + packageJsonPath + "'.");
                    }
                    applyChange(parsedJson, propPath, value);
                    if (preExistingParsedJson) {
                        applyChange(preExistingParsedJson, propPath, value);
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
    function applyChange(ctx, propPath, value) {
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
    }
    exports.applyChange = applyChange;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZV9qc29uX3VwZGF0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvd3JpdGluZy9wYWNrYWdlX2pzb25fdXBkYXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwyRUFBbUY7SUE2Q25GOzs7Ozs7T0FNRztJQUNIO1FBSUUsMkJBQW9CLGdCQUEyQztZQUEzQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQTJCO1lBSHZELFlBQU8sR0FBd0IsRUFBRSxDQUFDO1lBQ2xDLFlBQU8sR0FBRyxLQUFLLENBQUM7UUFFMEMsQ0FBQztRQUVuRTs7Ozs7O1dBTUc7UUFDSCxxQ0FBUyxHQUFULFVBQVUsWUFBc0IsRUFBRSxLQUFnQjtZQUNoRCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ3pDLE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUVEOzs7Ozs7O1dBT0c7UUFDSCx3Q0FBWSxHQUFaLFVBQWEsZUFBK0IsRUFBRSxVQUF1QjtZQUNuRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDakUsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7UUFDdEIsQ0FBQztRQUVPLDRDQUFnQixHQUF4QjtZQUNFLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtnQkFDaEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxzRUFBc0UsQ0FBQyxDQUFDO2FBQ3pGO1FBQ0gsQ0FBQztRQUNILHdCQUFDO0lBQUQsQ0FBQyxBQXRDRCxJQXNDQztJ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QkFDOUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBa0IsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsbUNBQWdDLENBQUMsQ0FBQzthQUN2RjtZQUVELEdBQUcsR0FBRyxNQUFNLENBQUM7U0FDZDtRQUVELEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxLQUFLLENBQUM7SUFDeEIsQ0FBQztJQWhCRCxrQ0FnQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTeXN0ZW0sIGRpcm5hbWV9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0pzb25PYmplY3QsIEpzb25WYWx1ZX0gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnQnO1xuXG5cbmV4cG9ydCB0eXBlIFBhY2thZ2VKc29uQ2hhbmdlID0gW3N0cmluZ1tdLCBKc29uVmFsdWVdO1xuZXhwb3J0IHR5cGUgV3JpdGVQYWNrYWdlSnNvbkNoYW5nZXNGbiA9XG4gICAgKGNoYW5nZXM6IFBhY2thZ2VKc29uQ2hhbmdlW10sIHBhY2thZ2VKc29uUGF0aDogQWJzb2x1dGVGc1BhdGgsIHBhcnNlZEpzb24/OiBKc29uT2JqZWN0KSA9PlxuICAgICAgICB2b2lkO1xuXG4vKipcbiAqIEEgdXRpbGl0eSBvYmplY3QgdGhhdCBjYW4gYmUgdXNlZCB0byBzYWZlbHkgdXBkYXRlIHZhbHVlcyBpbiBhIGBwYWNrYWdlLmpzb25gIGZpbGUuXG4gKlxuICogRXhhbXBsZSB1c2FnZTpcbiAqIGBgYHRzXG4gKiBjb25zdCB1cGRhdGVQYWNrYWdlSnNvbiA9IHBhY2thZ2VKc29uVXBkYXRlclxuICogICAgIC5jcmVhdGVVcGRhdGUoKVxuICogICAgIC5hZGRDaGFuZ2UoWyduYW1lJ10sICdwYWNrYWdlLWZvbycpXG4gKiAgICAgLmFkZENoYW5nZShbJ3NjcmlwdHMnLCAnZm9vJ10sICdlY2hvIEZPT09PLi4uJylcbiAqICAgICAuYWRkQ2hhbmdlKFsnZGVwZW5kZW5jaWVzJywgJ2JhciddLCAnMS4wLjAnKVxuICogICAgIC53cml0ZUNoYW5nZXMoJy9mb28vcGFja2FnZS5qc29uJyk7XG4gKiAgICAgLy8gb3JcbiAqICAgICAvLyAud3JpdGVDaGFuZ2VzKCcvZm9vL3BhY2thZ2UuanNvbicsIGluTWVtb3J5UGFyc2VkSnNvbik7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlSnNvblVwZGF0ZXIge1xuICAvKipcbiAgICogQ3JlYXRlIGEgYFBhY2thZ2VKc29uVXBkYXRlYCBvYmplY3QsIHdoaWNoIHByb3ZpZGVzIGEgZmx1ZW50IEFQSSBmb3IgYmF0Y2hpbmcgdXBkYXRlcyB0byBhXG4gICAqIGBwYWNrYWdlLmpzb25gIGZpbGUuIChCYXRjaGluZyB0aGUgdXBkYXRlcyBpcyB1c2VmdWwsIGJlY2F1c2UgaXQgYXZvaWQgdW5uZWNlc3NhcnkgSS9PXG4gICAqIG9wZXJhdGlvbnMuKVxuICAgKi9cbiAgY3JlYXRlVXBkYXRlKCk6IFBhY2thZ2VKc29uVXBkYXRlO1xuXG4gIC8qKlxuICAgKiBXcml0ZSBhIHNldCBvZiBjaGFuZ2VzIHRvIHRoZSBzcGVjaWZpZWQgYHBhY2thZ2UuanNvbmAgZmlsZSBhbmQgKGFuZCBvcHRpb25hbGx5IGEgcHJlLWV4aXN0aW5nLFxuICAgKiBpbi1tZW1vcnkgcmVwcmVzZW50YXRpb24gb2YgaXQpLlxuICAgKlxuICAgKiBAcGFyYW0gY2hhbmdlcyBUaGUgc2V0IG9mIGNoYW5nZXMgdG8gYXBwbHkuXG4gICAqIEBwYXJhbSBwYWNrYWdlSnNvblBhdGggVGhlIHBhdGggdG8gdGhlIGBwYWNrYWdlLmpzb25gIGZpbGUgdGhhdCBuZWVkcyB0byBiZSB1cGRhdGVkLlxuICAgKiBAcGFyYW0gcGFyc2VkSnNvbiBBIHByZS1leGlzdGluZywgaW4tbWVtb3J5IHJlcHJlc2VudGF0aW9uIG9mIHRoZSBgcGFja2FnZS5qc29uYCBmaWxlIHRoYXRcbiAgICogICAgICAgICAgICAgICAgICAgbmVlZHMgdG8gYmUgdXBkYXRlZCBhcyB3ZWxsLlxuICAgKi9cbiAgd3JpdGVDaGFuZ2VzKFxuICAgICAgY2hhbmdlczogUGFja2FnZUpzb25DaGFuZ2VbXSwgcGFja2FnZUpzb25QYXRoOiBBYnNvbHV0ZUZzUGF0aCwgcGFyc2VkSnNvbj86IEpzb25PYmplY3QpOiB2b2lkO1xufVxuXG4vKipcbiAqIEEgdXRpbGl0eSBjbGFzcyBwcm92aWRpbmcgYSBmbHVlbnQgQVBJIGZvciByZWNvcmRpbmcgbXVsdGlwbGUgY2hhbmdlcyB0byBhIGBwYWNrYWdlLmpzb25gIGZpbGVcbiAqIChhbmQgb3B0aW9uYWxseSBpdHMgaW4tbWVtb3J5IHBhcnNlZCByZXByZXNlbnRhdGlvbikuXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBzaG91bGQgZ2VuZXJhbGx5IG5vdCBiZSBpbnN0YW50aWF0ZWQgZGlyZWN0bHk7IGluc3RhbmNlcyBhcmUgaW1wbGljaXRseSBjcmVhdGVkXG4gKiAgICAgICB2aWEgYFBhY2thZ2VKc29uVXBkYXRlciNjcmVhdGVVcGRhdGUoKWAuXG4gKi9cbmV4cG9ydCBjbGFzcyBQYWNrYWdlSnNvblVwZGF0ZSB7XG4gIHByaXZhdGUgY2hhbmdlczogUGFja2FnZUpzb25DaGFuZ2VbXSA9IFtdO1xuICBwcml2YXRlIGFwcGxpZWQgPSBmYWxzZTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHdyaXRlQ2hhbmdlc0ltcGw6IFdyaXRlUGFja2FnZUpzb25DaGFuZ2VzRm4pIHt9XG5cbiAgLyoqXG4gICAqIFJlY29yZCBhIGNoYW5nZSB0byBhIGBwYWNrYWdlLmpzb25gIHByb3BlcnR5LiBJZiB0aGUgYW5jZXN0b3Igb2JqZWN0cyBkbyBub3QgeWV0IGV4aXN0IGluIHRoZVxuICAgKiBgcGFja2FnZS5qc29uYCBmaWxlLCB0aGV5IHdpbGwgYmUgY3JlYXRlZC5cbiAgICpcbiAgICogQHBhcmFtIHByb3BlcnR5UGF0aCBUaGUgcGF0aCBvZiBhIChwb3NzaWJseSBuZXN0ZWQpIHByb3BlcnR5IHRvIHVwZGF0ZS5cbiAgICogQHBhcmFtIHZhbHVlIFRoZSBuZXcgdmFsdWUgdG8gc2V0IHRoZSBwcm9wZXJ0eSB0by5cbiAgICovXG4gIGFkZENoYW5nZShwcm9wZXJ0eVBhdGg6IHN0cmluZ1tdLCB2YWx1ZTogSnNvblZhbHVlKTogdGhpcyB7XG4gICAgdGhpcy5lbnN1cmVOb3RBcHBsaWVkKCk7XG4gICAgdGhpcy5jaGFuZ2VzLnB1c2goW3Byb3BlcnR5UGF0aCwgdmFsdWVdKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBXcml0ZSB0aGUgcmVjb3JkZWQgY2hhbmdlcyB0byB0aGUgYXNzb2NpYXRlZCBgcGFja2FnZS5qc29uYCBmaWxlIChhbmQgb3B0aW9uYWxseSBhXG4gICAqIHByZS1leGlzdGluZywgaW4tbWVtb3J5IHJlcHJlc2VudGF0aW9uIG9mIGl0KS5cbiAgICpcbiAgICogQHBhcmFtIHBhY2thZ2VKc29uUGF0aCBUaGUgcGF0aCB0byB0aGUgYHBhY2thZ2UuanNvbmAgZmlsZSB0aGF0IG5lZWRzIHRvIGJlIHVwZGF0ZWQuXG4gICAqIEBwYXJhbSBwYXJzZWRKc29uIEEgcHJlLWV4aXN0aW5nLCBpbi1tZW1vcnkgcmVwcmVzZW50YXRpb24gb2YgdGhlIGBwYWNrYWdlLmpzb25gIGZpbGUgdGhhdFxuICAgKiAgICAgICAgICAgICAgICAgICBuZWVkcyB0byBiZSB1cGRhdGVkIGFzIHdlbGwuXG4gICAqL1xuICB3cml0ZUNoYW5nZXMocGFja2FnZUpzb25QYXRoOiBBYnNvbHV0ZUZzUGF0aCwgcGFyc2VkSnNvbj86IEpzb25PYmplY3QpOiB2b2lkIHtcbiAgICB0aGlzLmVuc3VyZU5vdEFwcGxpZWQoKTtcbiAgICB0aGlzLndyaXRlQ2hhbmdlc0ltcGwodGhpcy5jaGFuZ2VzLCBwYWNrYWdlSnNvblBhdGgsIHBhcnNlZEpzb24pO1xuICAgIHRoaXMuYXBwbGllZCA9IHRydWU7XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZU5vdEFwcGxpZWQoKSB7XG4gICAgaWYgKHRoaXMuYXBwbGllZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUcnlpbmcgdG8gYXBwbHkgYSBgUGFja2FnZUpzb25VcGRhdGVgIHRoYXQgaGFzIGFscmVhZHkgYmVlbiBhcHBsaWVkLicpO1xuICAgIH1cbiAgfVxufVxuXG4vKiogQSBgUGFja2FnZUpzb25VcGRhdGVyYCB0aGF0IHdyaXRlcyBkaXJlY3RseSB0byB0aGUgZmlsZS1zeXN0ZW0uICovXG5leHBvcnQgY2xhc3MgRGlyZWN0UGFja2FnZUpzb25VcGRhdGVyIGltcGxlbWVudHMgUGFja2FnZUpzb25VcGRhdGVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmczogRmlsZVN5c3RlbSkge31cblxuICBjcmVhdGVVcGRhdGUoKTogUGFja2FnZUpzb25VcGRhdGUge1xuICAgIHJldHVybiBuZXcgUGFja2FnZUpzb25VcGRhdGUoKC4uLmFyZ3MpID0+IHRoaXMud3JpdGVDaGFuZ2VzKC4uLmFyZ3MpKTtcbiAgfVxuXG4gIHdyaXRlQ2hhbmdlcyhcbiAgICAgIGNoYW5nZXM6IFBhY2thZ2VKc29uQ2hhbmdlW10sIHBhY2thZ2VKc29uUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgICBwcmVFeGlzdGluZ1BhcnNlZEpzb24/OiBKc29uT2JqZWN0KTogdm9pZCB7XG4gICAgaWYgKGNoYW5nZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIGNoYW5nZXMgdG8gd3JpdGUgdG8gJyR7cGFja2FnZUpzb25QYXRofScuYCk7XG4gICAgfVxuXG4gICAgLy8gUmVhZCBhbmQgcGFyc2UgdGhlIGBwYWNrYWdlLmpzb25gIGNvbnRlbnQuXG4gICAgLy8gTk9URTogV2UgYXJlIG5vdCB1c2luZyBgcHJlRXhpc3RpbmdQYXJzZWRKc29uYCAoZXZlbiBpZiBzcGVjaWZpZWQpIHRvIGF2b2lkIGNvcnJ1cHRpbmcgdGhlXG4gICAgLy8gICAgICAgY29udGVudCBvbiBkaXNrIGluIGNhc2UgYHByZUV4aXN0aW5nUGFyc2VkSnNvbmAgaXMgb3V0ZGF0ZWQuXG4gICAgY29uc3QgcGFyc2VkSnNvbiA9XG4gICAgICAgIHRoaXMuZnMuZXhpc3RzKHBhY2thZ2VKc29uUGF0aCkgPyBKU09OLnBhcnNlKHRoaXMuZnMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoKSkgOiB7fTtcblxuICAgIC8vIEFwcGx5IGFsbCBjaGFuZ2VzIHRvIGJvdGggdGhlIGNhbm9uaWNhbCByZXByZXNlbnRhdGlvbiAocmVhZCBmcm9tIGRpc2spIGFuZCBhbnkgcHJlLWV4aXN0aW5nLFxuICAgIC8vIGluLW1lbW9yeSByZXByZXNlbnRhdGlvbi5cbiAgICBmb3IgKGNvbnN0IFtwcm9wUGF0aCwgdmFsdWVdIG9mIGNoYW5nZXMpIHtcbiAgICAgIGlmIChwcm9wUGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHByb3BlcnR5IHBhdGggZm9yIHdyaXRpbmcgdmFsdWUgdG8gJyR7cGFja2FnZUpzb25QYXRofScuYCk7XG4gICAgICB9XG5cbiAgICAgIGFwcGx5Q2hhbmdlKHBhcnNlZEpzb24sIHByb3BQYXRoLCB2YWx1ZSk7XG5cbiAgICAgIGlmIChwcmVFeGlzdGluZ1BhcnNlZEpzb24pIHtcbiAgICAgICAgYXBwbHlDaGFuZ2UocHJlRXhpc3RpbmdQYXJzZWRKc29uLCBwcm9wUGF0aCwgdmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEVuc3VyZSB0aGUgY29udGFpbmluZyBkaXJlY3RvcnkgZXhpc3RzIChpbiBjYXNlIHRoaXMgaXMgYSBzeW50aGVzaXplZCBgcGFja2FnZS5qc29uYCBkdWUgdG8gYVxuICAgIC8vIGN1c3RvbSBjb25maWd1cmF0aW9uKSBhbmQgd3JpdGUgdGhlIHVwZGF0ZWQgY29udGVudCB0byBkaXNrLlxuICAgIHRoaXMuZnMuZW5zdXJlRGlyKGRpcm5hbWUocGFja2FnZUpzb25QYXRoKSk7XG4gICAgdGhpcy5mcy53cml0ZUZpbGUocGFja2FnZUpzb25QYXRoLCBgJHtKU09OLnN0cmluZ2lmeShwYXJzZWRKc29uLCBudWxsLCAyKX1cXG5gKTtcbiAgfVxufVxuXG4vLyBIZWxwZXJzXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlDaGFuZ2UoY3R4OiBKc29uT2JqZWN0LCBwcm9wUGF0aDogc3RyaW5nW10sIHZhbHVlOiBKc29uVmFsdWUpOiB2b2lkIHtcbiAgY29uc3QgbGFzdFByb3BJZHggPSBwcm9wUGF0aC5sZW5ndGggLSAxO1xuICBjb25zdCBsYXN0UHJvcCA9IHByb3BQYXRoW2xhc3RQcm9wSWR4XTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGxhc3RQcm9wSWR4OyBpKyspIHtcbiAgICBjb25zdCBrZXkgPSBwcm9wUGF0aFtpXTtcbiAgICBjb25zdCBuZXdDdHggPSBjdHguaGFzT3duUHJvcGVydHkoa2V5KSA/IGN0eFtrZXldIDogKGN0eFtrZXldID0ge30pO1xuXG4gICAgaWYgKCh0eXBlb2YgbmV3Q3R4ICE9PSAnb2JqZWN0JykgfHwgKG5ld0N0eCA9PT0gbnVsbCkgfHwgQXJyYXkuaXNBcnJheShuZXdDdHgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFByb3BlcnR5IHBhdGggJyR7cHJvcFBhdGguam9pbignLicpfScgZG9lcyBub3QgcG9pbnQgdG8gYW4gb2JqZWN0LmApO1xuICAgIH1cblxuICAgIGN0eCA9IG5ld0N0eDtcbiAgfVxuXG4gIGN0eFtsYXN0UHJvcF0gPSB2YWx1ZTtcbn1cbiJdfQ==