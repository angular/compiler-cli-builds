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
        define("@angular/compiler-cli/src/ngtsc/routing/src/route", ["require", "exports", "tslib"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.entryPointKeyFor = exports.RouterEntryPointManager = exports.RouterEntryPoint = void 0;
    var tslib_1 = require("tslib");
    var RouterEntryPoint = /** @class */ (function () {
        function RouterEntryPoint() {
        }
        return RouterEntryPoint;
    }());
    exports.RouterEntryPoint = RouterEntryPoint;
    var RouterEntryPointImpl = /** @class */ (function () {
        function RouterEntryPointImpl(filePath, moduleName) {
            this.filePath = filePath;
            this.moduleName = moduleName;
        }
        Object.defineProperty(RouterEntryPointImpl.prototype, "name", {
            get: function () {
                return this.moduleName;
            },
            enumerable: false,
            configurable: true
        });
        // For debugging purposes.
        RouterEntryPointImpl.prototype.toString = function () {
            return "RouterEntryPoint(name: " + this.name + ", filePath: " + this.filePath + ")";
        };
        return RouterEntryPointImpl;
    }());
    var RouterEntryPointManager = /** @class */ (function () {
        function RouterEntryPointManager(moduleResolver) {
            this.moduleResolver = moduleResolver;
            this.map = new Map();
        }
        RouterEntryPointManager.prototype.resolveLoadChildrenIdentifier = function (loadChildrenIdentifier, context) {
            var _a = tslib_1.__read(loadChildrenIdentifier.split('#'), 2), relativeFile = _a[0], moduleName = _a[1];
            if (moduleName === undefined) {
                return null;
            }
            var resolvedSf = this.moduleResolver.resolveModule(relativeFile, context.fileName);
            if (resolvedSf === null) {
                return null;
            }
            return this.fromNgModule(resolvedSf, moduleName);
        };
        RouterEntryPointManager.prototype.fromNgModule = function (sf, moduleName) {
            var key = entryPointKeyFor(sf.fileName, moduleName);
            if (!this.map.has(key)) {
                this.map.set(key, new RouterEntryPointImpl(sf.fileName, moduleName));
            }
            return this.map.get(key);
        };
        return RouterEntryPointManager;
    }());
    exports.RouterEntryPointManager = RouterEntryPointManager;
    function entryPointKeyFor(filePath, moduleName) {
        // Drop the extension to be compatible with how cli calls `listLazyRoutes(entryRoute)`.
        return filePath.replace(/\.tsx?$/i, '') + "#" + moduleName;
    }
    exports.entryPointKeyFor = entryPointKeyFor;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3JvdXRpbmcvc3JjL3JvdXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFNSDtRQUFBO1FBT0EsQ0FBQztRQUFELHVCQUFDO0lBQUQsQ0FBQyxBQVBELElBT0M7SUFQcUIsNENBQWdCO0lBU3RDO1FBQ0UsOEJBQXFCLFFBQWdCLEVBQVcsVUFBa0I7WUFBN0MsYUFBUSxHQUFSLFFBQVEsQ0FBUTtZQUFXLGVBQVUsR0FBVixVQUFVLENBQVE7UUFBRyxDQUFDO1FBRXRFLHNCQUFJLHNDQUFJO2lCQUFSO2dCQUNFLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUN6QixDQUFDOzs7V0FBQTtRQUVELDBCQUEwQjtRQUMxQix1Q0FBUSxHQUFSO1lBQ0UsT0FBTyw0QkFBMEIsSUFBSSxDQUFDLElBQUksb0JBQWUsSUFBSSxDQUFDLFFBQVEsTUFBRyxDQUFDO1FBQzVFLENBQUM7UUFDSCwyQkFBQztJQUFELENBQUMsQUFYRCxJQVdDO0lBRUQ7UUFHRSxpQ0FBb0IsY0FBOEI7WUFBOUIsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1lBRjFDLFFBQUcsR0FBRyxJQUFJLEdBQUcsRUFBNEIsQ0FBQztRQUVHLENBQUM7UUFFdEQsK0RBQTZCLEdBQTdCLFVBQThCLHNCQUE4QixFQUFFLE9BQXNCO1lBRTVFLElBQUEsS0FBQSxlQUE2QixzQkFBc0IsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUEsRUFBN0QsWUFBWSxRQUFBLEVBQUUsVUFBVSxRQUFxQyxDQUFDO1lBQ3JFLElBQUksVUFBVSxLQUFLLFNBQVMsRUFBRTtnQkFDNUIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDckYsSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFO2dCQUN2QixPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNuRCxDQUFDO1FBRUQsOENBQVksR0FBWixVQUFhLEVBQWlCLEVBQUUsVUFBa0I7WUFDaEQsSUFBTSxHQUFHLEdBQUcsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUN0RCxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ3RCLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQzthQUN0RTtZQUNELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFFLENBQUM7UUFDNUIsQ0FBQztRQUNILDhCQUFDO0lBQUQsQ0FBQyxBQXpCRCxJQXlCQztJQXpCWSwwREFBdUI7SUEyQnBDLFNBQWdCLGdCQUFnQixDQUFDLFFBQWdCLEVBQUUsVUFBa0I7UUFDbkUsdUZBQXVGO1FBQ3ZGLE9BQVUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLFNBQUksVUFBWSxDQUFDO0lBQzdELENBQUM7SUFIRCw0Q0FHQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7TW9kdWxlUmVzb2x2ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgUm91dGVyRW50cnlQb2ludCB7XG4gIGFic3RyYWN0IHJlYWRvbmx5IGZpbGVQYXRoOiBzdHJpbmc7XG5cbiAgYWJzdHJhY3QgcmVhZG9ubHkgbW9kdWxlTmFtZTogc3RyaW5nO1xuXG4gIC8vIEFsaWFzIG9mIG1vZHVsZU5hbWUgZm9yIGNvbXBhdGliaWxpdHkgd2l0aCB3aGF0IGBuZ3Rvb2xzX2FwaWAgcmV0dXJuZWQuXG4gIGFic3RyYWN0IHJlYWRvbmx5IG5hbWU6IHN0cmluZztcbn1cblxuY2xhc3MgUm91dGVyRW50cnlQb2ludEltcGwgaW1wbGVtZW50cyBSb3V0ZXJFbnRyeVBvaW50IHtcbiAgY29uc3RydWN0b3IocmVhZG9ubHkgZmlsZVBhdGg6IHN0cmluZywgcmVhZG9ubHkgbW9kdWxlTmFtZTogc3RyaW5nKSB7fVxuXG4gIGdldCBuYW1lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMubW9kdWxlTmFtZTtcbiAgfVxuXG4gIC8vIEZvciBkZWJ1Z2dpbmcgcHVycG9zZXMuXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBSb3V0ZXJFbnRyeVBvaW50KG5hbWU6ICR7dGhpcy5uYW1lfSwgZmlsZVBhdGg6ICR7dGhpcy5maWxlUGF0aH0pYDtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgUm91dGVyRW50cnlQb2ludE1hbmFnZXIge1xuICBwcml2YXRlIG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBSb3V0ZXJFbnRyeVBvaW50PigpO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgbW9kdWxlUmVzb2x2ZXI6IE1vZHVsZVJlc29sdmVyKSB7fVxuXG4gIHJlc29sdmVMb2FkQ2hpbGRyZW5JZGVudGlmaWVyKGxvYWRDaGlsZHJlbklkZW50aWZpZXI6IHN0cmluZywgY29udGV4dDogdHMuU291cmNlRmlsZSk6XG4gICAgICBSb3V0ZXJFbnRyeVBvaW50fG51bGwge1xuICAgIGNvbnN0IFtyZWxhdGl2ZUZpbGUsIG1vZHVsZU5hbWVdID0gbG9hZENoaWxkcmVuSWRlbnRpZmllci5zcGxpdCgnIycpO1xuICAgIGlmIChtb2R1bGVOYW1lID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCByZXNvbHZlZFNmID0gdGhpcy5tb2R1bGVSZXNvbHZlci5yZXNvbHZlTW9kdWxlKHJlbGF0aXZlRmlsZSwgY29udGV4dC5maWxlTmFtZSk7XG4gICAgaWYgKHJlc29sdmVkU2YgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5mcm9tTmdNb2R1bGUocmVzb2x2ZWRTZiwgbW9kdWxlTmFtZSk7XG4gIH1cblxuICBmcm9tTmdNb2R1bGUoc2Y6IHRzLlNvdXJjZUZpbGUsIG1vZHVsZU5hbWU6IHN0cmluZyk6IFJvdXRlckVudHJ5UG9pbnQge1xuICAgIGNvbnN0IGtleSA9IGVudHJ5UG9pbnRLZXlGb3Ioc2YuZmlsZU5hbWUsIG1vZHVsZU5hbWUpO1xuICAgIGlmICghdGhpcy5tYXAuaGFzKGtleSkpIHtcbiAgICAgIHRoaXMubWFwLnNldChrZXksIG5ldyBSb3V0ZXJFbnRyeVBvaW50SW1wbChzZi5maWxlTmFtZSwgbW9kdWxlTmFtZSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5tYXAuZ2V0KGtleSkhO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlbnRyeVBvaW50S2V5Rm9yKGZpbGVQYXRoOiBzdHJpbmcsIG1vZHVsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIC8vIERyb3AgdGhlIGV4dGVuc2lvbiB0byBiZSBjb21wYXRpYmxlIHdpdGggaG93IGNsaSBjYWxscyBgbGlzdExhenlSb3V0ZXMoZW50cnlSb3V0ZSlgLlxuICByZXR1cm4gYCR7ZmlsZVBhdGgucmVwbGFjZSgvXFwudHN4PyQvaSwgJycpfSMke21vZHVsZU5hbWV9YDtcbn1cbiJdfQ==