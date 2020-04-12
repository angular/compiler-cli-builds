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
        define("@angular/compiler-cli/ngcc/src/execution/cluster/package_json_updater", ["require", "exports", "tslib", "cluster", "@angular/compiler-cli/ngcc/src/writing/package_json_updater", "@angular/compiler-cli/ngcc/src/execution/cluster/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /// <reference types="node" />
    var cluster = require("cluster");
    var package_json_updater_1 = require("@angular/compiler-cli/ngcc/src/writing/package_json_updater");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/execution/cluster/utils");
    /**
     * A `PackageJsonUpdater` that can safely handle update operations on multiple processes.
     */
    var ClusterPackageJsonUpdater = /** @class */ (function () {
        function ClusterPackageJsonUpdater(delegate) {
            this.delegate = delegate;
        }
        ClusterPackageJsonUpdater.prototype.createUpdate = function () {
            var _this = this;
            return new package_json_updater_1.PackageJsonUpdate(function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                return _this.writeChanges.apply(_this, tslib_1.__spread(args));
            });
        };
        ClusterPackageJsonUpdater.prototype.writeChanges = function (changes, packageJsonPath, preExistingParsedJson) {
            var e_1, _a;
            if (cluster.isMaster) {
                // This is the master process:
                // Actually apply the changes to the file on disk.
                return this.delegate.writeChanges(changes, packageJsonPath, preExistingParsedJson);
            }
            // This is a worker process:
            // Apply the changes in-memory (if necessary) and send a message to the master process.
            if (preExistingParsedJson) {
                try {
                    for (var changes_1 = tslib_1.__values(changes), changes_1_1 = changes_1.next(); !changes_1_1.done; changes_1_1 = changes_1.next()) {
                        var _b = tslib_1.__read(changes_1_1.value, 2), propPath = _b[0], value = _b[1];
                        if (propPath.length === 0) {
                            throw new Error("Missing property path for writing value to '" + packageJsonPath + "'.");
                        }
                        // No need to take property positioning into account for in-memory representations.
                        package_json_updater_1.applyChange(preExistingParsedJson, propPath, value, 'unimportant');
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (changes_1_1 && !changes_1_1.done && (_a = changes_1.return)) _a.call(changes_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            utils_1.sendMessageToMaster({
                type: 'update-package-json',
                packageJsonPath: packageJsonPath,
                changes: changes,
            });
        };
        return ClusterPackageJsonUpdater;
    }());
    exports.ClusterPackageJsonUpdater = ClusterPackageJsonUpdater;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZV9qc29uX3VwZGF0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZXhlY3V0aW9uL2NsdXN0ZXIvcGFja2FnZV9qc29uX3VwZGF0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOEJBQThCO0lBRTlCLGlDQUFtQztJQUluQyxvR0FBeUg7SUFFekgsZ0ZBQTRDO0lBSTVDOztPQUVHO0lBQ0g7UUFDRSxtQ0FBb0IsUUFBNEI7WUFBNUIsYUFBUSxHQUFSLFFBQVEsQ0FBb0I7UUFBRyxDQUFDO1FBRXBELGdEQUFZLEdBQVo7WUFBQSxpQkFFQztZQURDLE9BQU8sSUFBSSx3Q0FBaUIsQ0FBQztnQkFBQyxjQUFPO3FCQUFQLFVBQU8sRUFBUCxxQkFBTyxFQUFQLElBQU87b0JBQVAseUJBQU87O2dCQUFLLE9BQUEsS0FBSSxDQUFDLFlBQVksT0FBakIsS0FBSSxtQkFBaUIsSUFBSTtZQUF6QixDQUEwQixDQUFDLENBQUM7UUFDeEUsQ0FBQztRQUVELGdEQUFZLEdBQVosVUFDSSxPQUE0QixFQUFFLGVBQStCLEVBQzdELHFCQUFrQzs7WUFDcEMsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFO2dCQUNwQiw4QkFBOEI7Z0JBQzlCLGtEQUFrRDtnQkFDbEQsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsZUFBZSxFQUFFLHFCQUFxQixDQUFDLENBQUM7YUFDcEY7WUFFRCw0QkFBNEI7WUFDNUIsdUZBQXVGO1lBQ3ZGLElBQUkscUJBQXFCLEVBQUU7O29CQUN6QixLQUFnQyxJQUFBLFlBQUEsaUJBQUEsT0FBTyxDQUFBLGdDQUFBLHFEQUFFO3dCQUE5QixJQUFBLHlDQUFpQixFQUFoQixnQkFBUSxFQUFFLGFBQUs7d0JBQ3pCLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7NEJBQ3pCLE1BQU0sSUFBSSxLQUFLLENBQUMsaURBQStDLGVBQWUsT0FBSSxDQUFDLENBQUM7eUJBQ3JGO3dCQUVELG1GQUFtRjt3QkFDbkYsa0NBQVcsQ0FBQyxxQkFBcUIsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLGFBQWEsQ0FBQyxDQUFDO3FCQUNwRTs7Ozs7Ozs7O2FBQ0Y7WUFFRCwyQkFBbUIsQ0FBQztnQkFDbEIsSUFBSSxFQUFFLHFCQUFxQjtnQkFDM0IsZUFBZSxpQkFBQTtnQkFDZixPQUFPLFNBQUE7YUFDUixDQUFDLENBQUM7UUFDTCxDQUFDO1FBQ0gsZ0NBQUM7SUFBRCxDQUFDLEFBbkNELElBbUNDO0lBbkNZLDhEQUF5QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLy8vIDxyZWZlcmVuY2UgdHlwZXM9XCJub2RlXCIgLz5cblxuaW1wb3J0ICogYXMgY2x1c3RlciBmcm9tICdjbHVzdGVyJztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7SnNvbk9iamVjdH0gZnJvbSAnLi4vLi4vcGFja2FnZXMvZW50cnlfcG9pbnQnO1xuaW1wb3J0IHtQYWNrYWdlSnNvbkNoYW5nZSwgUGFja2FnZUpzb25VcGRhdGUsIFBhY2thZ2VKc29uVXBkYXRlciwgYXBwbHlDaGFuZ2V9IGZyb20gJy4uLy4uL3dyaXRpbmcvcGFja2FnZV9qc29uX3VwZGF0ZXInO1xuXG5pbXBvcnQge3NlbmRNZXNzYWdlVG9NYXN0ZXJ9IGZyb20gJy4vdXRpbHMnO1xuXG5cblxuLyoqXG4gKiBBIGBQYWNrYWdlSnNvblVwZGF0ZXJgIHRoYXQgY2FuIHNhZmVseSBoYW5kbGUgdXBkYXRlIG9wZXJhdGlvbnMgb24gbXVsdGlwbGUgcHJvY2Vzc2VzLlxuICovXG5leHBvcnQgY2xhc3MgQ2x1c3RlclBhY2thZ2VKc29uVXBkYXRlciBpbXBsZW1lbnRzIFBhY2thZ2VKc29uVXBkYXRlciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZGVsZWdhdGU6IFBhY2thZ2VKc29uVXBkYXRlcikge31cblxuICBjcmVhdGVVcGRhdGUoKTogUGFja2FnZUpzb25VcGRhdGUge1xuICAgIHJldHVybiBuZXcgUGFja2FnZUpzb25VcGRhdGUoKC4uLmFyZ3MpID0+IHRoaXMud3JpdGVDaGFuZ2VzKC4uLmFyZ3MpKTtcbiAgfVxuXG4gIHdyaXRlQ2hhbmdlcyhcbiAgICAgIGNoYW5nZXM6IFBhY2thZ2VKc29uQ2hhbmdlW10sIHBhY2thZ2VKc29uUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgICBwcmVFeGlzdGluZ1BhcnNlZEpzb24/OiBKc29uT2JqZWN0KTogdm9pZCB7XG4gICAgaWYgKGNsdXN0ZXIuaXNNYXN0ZXIpIHtcbiAgICAgIC8vIFRoaXMgaXMgdGhlIG1hc3RlciBwcm9jZXNzOlxuICAgICAgLy8gQWN0dWFsbHkgYXBwbHkgdGhlIGNoYW5nZXMgdG8gdGhlIGZpbGUgb24gZGlzay5cbiAgICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLndyaXRlQ2hhbmdlcyhjaGFuZ2VzLCBwYWNrYWdlSnNvblBhdGgsIHByZUV4aXN0aW5nUGFyc2VkSnNvbik7XG4gICAgfVxuXG4gICAgLy8gVGhpcyBpcyBhIHdvcmtlciBwcm9jZXNzOlxuICAgIC8vIEFwcGx5IHRoZSBjaGFuZ2VzIGluLW1lbW9yeSAoaWYgbmVjZXNzYXJ5KSBhbmQgc2VuZCBhIG1lc3NhZ2UgdG8gdGhlIG1hc3RlciBwcm9jZXNzLlxuICAgIGlmIChwcmVFeGlzdGluZ1BhcnNlZEpzb24pIHtcbiAgICAgIGZvciAoY29uc3QgW3Byb3BQYXRoLCB2YWx1ZV0gb2YgY2hhbmdlcykge1xuICAgICAgICBpZiAocHJvcFBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHByb3BlcnR5IHBhdGggZm9yIHdyaXRpbmcgdmFsdWUgdG8gJyR7cGFja2FnZUpzb25QYXRofScuYCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBObyBuZWVkIHRvIHRha2UgcHJvcGVydHkgcG9zaXRpb25pbmcgaW50byBhY2NvdW50IGZvciBpbi1tZW1vcnkgcmVwcmVzZW50YXRpb25zLlxuICAgICAgICBhcHBseUNoYW5nZShwcmVFeGlzdGluZ1BhcnNlZEpzb24sIHByb3BQYXRoLCB2YWx1ZSwgJ3VuaW1wb3J0YW50Jyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgc2VuZE1lc3NhZ2VUb01hc3Rlcih7XG4gICAgICB0eXBlOiAndXBkYXRlLXBhY2thZ2UtanNvbicsXG4gICAgICBwYWNrYWdlSnNvblBhdGgsXG4gICAgICBjaGFuZ2VzLFxuICAgIH0pO1xuICB9XG59XG4iXX0=