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
            get: function () { return this.moduleName; },
            enumerable: true,
            configurable: true
        });
        RouterEntryPointImpl.prototype.toString = function () { return this.filePath + "#" + this.moduleName; };
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
            var resolvedSf = this.moduleResolver.resolveModuleName(relativeFile, context);
            if (resolvedSf === null) {
                return null;
            }
            return this.fromNgModule(resolvedSf, moduleName);
        };
        RouterEntryPointManager.prototype.fromNgModule = function (sf, moduleName) {
            var absoluteFile = sf.fileName;
            var key = absoluteFile + "#" + moduleName;
            if (!this.map.has(key)) {
                this.map.set(key, new RouterEntryPointImpl(absoluteFile, moduleName));
            }
            return this.map.get(key);
        };
        return RouterEntryPointManager;
    }());
    exports.RouterEntryPointManager = RouterEntryPointManager;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3JvdXRpbmcvc3JjL3JvdXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQU1IO1FBQUE7UUFTQSxDQUFDO1FBQUQsdUJBQUM7SUFBRCxDQUFDLEFBVEQsSUFTQztJQVRxQiw0Q0FBZ0I7SUFXdEM7UUFDRSw4QkFBcUIsUUFBZ0IsRUFBVyxVQUFrQjtZQUE3QyxhQUFRLEdBQVIsUUFBUSxDQUFRO1lBQVcsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQUFHLENBQUM7UUFFdEUsc0JBQUksc0NBQUk7aUJBQVIsY0FBcUIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQzs7O1dBQUE7UUFFOUMsdUNBQVEsR0FBUixjQUFxQixPQUFVLElBQUksQ0FBQyxRQUFRLFNBQUksSUFBSSxDQUFDLFVBQVksQ0FBQyxDQUFDLENBQUM7UUFDdEUsMkJBQUM7SUFBRCxDQUFDLEFBTkQsSUFNQztJQUVEO1FBR0UsaUNBQW9CLGNBQThCO1lBQTlCLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtZQUYxQyxRQUFHLEdBQUcsSUFBSSxHQUFHLEVBQTRCLENBQUM7UUFFRyxDQUFDO1FBRXRELCtEQUE2QixHQUE3QixVQUE4QixzQkFBOEIsRUFBRSxPQUFzQjtZQUU1RSxJQUFBLHlEQUE4RCxFQUE3RCxvQkFBWSxFQUFFLGtCQUErQyxDQUFDO1lBQ3JFLElBQUksVUFBVSxLQUFLLFNBQVMsRUFBRTtnQkFDNUIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ2hGLElBQUksVUFBVSxLQUFLLElBQUksRUFBRTtnQkFDdkIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDbkQsQ0FBQztRQUVELDhDQUFZLEdBQVosVUFBYSxFQUFpQixFQUFFLFVBQWtCO1lBQ2hELElBQU0sWUFBWSxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUM7WUFDakMsSUFBTSxHQUFHLEdBQU0sWUFBWSxTQUFJLFVBQVksQ0FBQztZQUM1QyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ3RCLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLG9CQUFvQixDQUFDLFlBQVksRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDO2FBQ3ZFO1lBQ0QsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUcsQ0FBQztRQUM3QixDQUFDO1FBQ0gsOEJBQUM7SUFBRCxDQUFDLEFBMUJELElBMEJDO0lBMUJZLDBEQUF1QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7TW9kdWxlUmVzb2x2ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgUm91dGVyRW50cnlQb2ludCB7XG4gIGFic3RyYWN0IHJlYWRvbmx5IGZpbGVQYXRoOiBzdHJpbmc7XG5cbiAgYWJzdHJhY3QgcmVhZG9ubHkgbW9kdWxlTmFtZTogc3RyaW5nO1xuXG4gIC8vIEFsaWFzIG9mIG1vZHVsZU5hbWUuXG4gIGFic3RyYWN0IHJlYWRvbmx5IG5hbWU6IHN0cmluZztcblxuICBhYnN0cmFjdCB0b1N0cmluZygpOiBzdHJpbmc7XG59XG5cbmNsYXNzIFJvdXRlckVudHJ5UG9pbnRJbXBsIGltcGxlbWVudHMgUm91dGVyRW50cnlQb2ludCB7XG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGZpbGVQYXRoOiBzdHJpbmcsIHJlYWRvbmx5IG1vZHVsZU5hbWU6IHN0cmluZykge31cblxuICBnZXQgbmFtZSgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5tb2R1bGVOYW1lOyB9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHsgcmV0dXJuIGAke3RoaXMuZmlsZVBhdGh9IyR7dGhpcy5tb2R1bGVOYW1lfWA7IH1cbn1cblxuZXhwb3J0IGNsYXNzIFJvdXRlckVudHJ5UG9pbnRNYW5hZ2VyIHtcbiAgcHJpdmF0ZSBtYXAgPSBuZXcgTWFwPHN0cmluZywgUm91dGVyRW50cnlQb2ludD4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIG1vZHVsZVJlc29sdmVyOiBNb2R1bGVSZXNvbHZlcikge31cblxuICByZXNvbHZlTG9hZENoaWxkcmVuSWRlbnRpZmllcihsb2FkQ2hpbGRyZW5JZGVudGlmaWVyOiBzdHJpbmcsIGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUpOlxuICAgICAgUm91dGVyRW50cnlQb2ludHxudWxsIHtcbiAgICBjb25zdCBbcmVsYXRpdmVGaWxlLCBtb2R1bGVOYW1lXSA9IGxvYWRDaGlsZHJlbklkZW50aWZpZXIuc3BsaXQoJyMnKTtcbiAgICBpZiAobW9kdWxlTmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgcmVzb2x2ZWRTZiA9IHRoaXMubW9kdWxlUmVzb2x2ZXIucmVzb2x2ZU1vZHVsZU5hbWUocmVsYXRpdmVGaWxlLCBjb250ZXh0KTtcbiAgICBpZiAocmVzb2x2ZWRTZiA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmZyb21OZ01vZHVsZShyZXNvbHZlZFNmLCBtb2R1bGVOYW1lKTtcbiAgfVxuXG4gIGZyb21OZ01vZHVsZShzZjogdHMuU291cmNlRmlsZSwgbW9kdWxlTmFtZTogc3RyaW5nKTogUm91dGVyRW50cnlQb2ludCB7XG4gICAgY29uc3QgYWJzb2x1dGVGaWxlID0gc2YuZmlsZU5hbWU7XG4gICAgY29uc3Qga2V5ID0gYCR7YWJzb2x1dGVGaWxlfSMke21vZHVsZU5hbWV9YDtcbiAgICBpZiAoIXRoaXMubWFwLmhhcyhrZXkpKSB7XG4gICAgICB0aGlzLm1hcC5zZXQoa2V5LCBuZXcgUm91dGVyRW50cnlQb2ludEltcGwoYWJzb2x1dGVGaWxlLCBtb2R1bGVOYW1lKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm1hcC5nZXQoa2V5KSAhO1xuICB9XG59XG4iXX0=