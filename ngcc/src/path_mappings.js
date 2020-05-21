(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/path_mappings", ["require", "exports", "@angular/compiler-cli/src/ngtsc/file_system"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getPathMappingsFromTsConfig = void 0;
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    /**
     * If `pathMappings` is not provided directly, then try getting it from `tsConfig`, if available.
     */
    function getPathMappingsFromTsConfig(tsConfig, projectPath) {
        if (tsConfig !== null && tsConfig.options.baseUrl !== undefined &&
            tsConfig.options.paths !== undefined) {
            return {
                baseUrl: file_system_1.resolve(projectPath, tsConfig.options.baseUrl),
                paths: tsConfig.options.paths,
            };
        }
    }
    exports.getPathMappingsFromTsConfig = getPathMappingsFromTsConfig;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0aF9tYXBwaW5ncy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9wYXRoX21hcHBpbmdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDJFQUFvRTtJQVNwRTs7T0FFRztJQUNILFNBQWdCLDJCQUEyQixDQUN2QyxRQUFrQyxFQUFFLFdBQTJCO1FBQ2pFLElBQUksUUFBUSxLQUFLLElBQUksSUFBSSxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sS0FBSyxTQUFTO1lBQzNELFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxLQUFLLFNBQVMsRUFBRTtZQUN4QyxPQUFPO2dCQUNMLE9BQU8sRUFBRSxxQkFBTyxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztnQkFDdkQsS0FBSyxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSzthQUM5QixDQUFDO1NBQ0g7SUFDSCxDQUFDO0lBVEQsa0VBU0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCByZXNvbHZlfSBmcm9tICcuLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtQYXJzZWRDb25maWd1cmF0aW9ufSBmcm9tICcuLi8uLi9zcmMvcGVyZm9ybV9jb21waWxlJztcblxuXG5leHBvcnQgdHlwZSBQYXRoTWFwcGluZ3MgPSB7XG4gIGJhc2VVcmw6IHN0cmluZyxcbiAgcGF0aHM6IHtba2V5OiBzdHJpbmddOiBzdHJpbmdbXX1cbn07XG5cbi8qKlxuICogSWYgYHBhdGhNYXBwaW5nc2AgaXMgbm90IHByb3ZpZGVkIGRpcmVjdGx5LCB0aGVuIHRyeSBnZXR0aW5nIGl0IGZyb20gYHRzQ29uZmlnYCwgaWYgYXZhaWxhYmxlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UGF0aE1hcHBpbmdzRnJvbVRzQ29uZmlnKFxuICAgIHRzQ29uZmlnOiBQYXJzZWRDb25maWd1cmF0aW9ufG51bGwsIHByb2plY3RQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IFBhdGhNYXBwaW5nc3x1bmRlZmluZWQge1xuICBpZiAodHNDb25maWcgIT09IG51bGwgJiYgdHNDb25maWcub3B0aW9ucy5iYXNlVXJsICE9PSB1bmRlZmluZWQgJiZcbiAgICAgIHRzQ29uZmlnLm9wdGlvbnMucGF0aHMgIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB7XG4gICAgICBiYXNlVXJsOiByZXNvbHZlKHByb2plY3RQYXRoLCB0c0NvbmZpZy5vcHRpb25zLmJhc2VVcmwpLFxuICAgICAgcGF0aHM6IHRzQ29uZmlnLm9wdGlvbnMucGF0aHMsXG4gICAgfTtcbiAgfVxufVxuIl19