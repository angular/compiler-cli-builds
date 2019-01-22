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
        define("@angular/compiler-cli/src/ngtsc/routing/src/analyzer", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/routing/src/lazy", "@angular/compiler-cli/src/ngtsc/routing/src/route"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var lazy_1 = require("@angular/compiler-cli/src/ngtsc/routing/src/lazy");
    var route_1 = require("@angular/compiler-cli/src/ngtsc/routing/src/route");
    var NgModuleRouteAnalyzer = /** @class */ (function () {
        function NgModuleRouteAnalyzer(moduleResolver, evaluator) {
            this.evaluator = evaluator;
            this.modules = new Map();
            this.entryPointManager = new route_1.RouterEntryPointManager(moduleResolver);
        }
        NgModuleRouteAnalyzer.prototype.add = function (sourceFile, moduleName, imports, exports, providers) {
            var key = sourceFile.fileName + "#" + moduleName;
            if (this.modules.has(key)) {
                throw new Error("Double route analyzing " + key);
            }
            this.modules.set(key, {
                sourceFile: sourceFile, moduleName: moduleName, imports: imports, exports: exports, providers: providers,
            });
        };
        NgModuleRouteAnalyzer.prototype.listLazyRoutes = function () {
            var e_1, _a;
            var routes = [];
            try {
                for (var _b = tslib_1.__values(Array.from(this.modules.keys())), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var key = _c.value;
                    var data = this.modules.get(key);
                    var entryPoints = lazy_1.scanForRouteEntryPoints(data.sourceFile, data.moduleName, data, this.entryPointManager, this.evaluator);
                    routes.push.apply(routes, tslib_1.__spread(entryPoints.map(function (entryPoint) { return ({
                        route: entryPoint.loadChildren,
                        module: entryPoint.from,
                        referencedModule: entryPoint.resolvedTo,
                    }); })));
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return routes;
        };
        return NgModuleRouteAnalyzer;
    }());
    exports.NgModuleRouteAnalyzer = NgModuleRouteAnalyzer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl6ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3JvdXRpbmcvc3JjL2FuYWx5emVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQU9ILHlFQUErQztJQUMvQywyRUFBZ0Q7SUFnQmhEO1FBSUUsK0JBQVksY0FBOEIsRUFBVSxTQUEyQjtZQUEzQixjQUFTLEdBQVQsU0FBUyxDQUFrQjtZQUh2RSxZQUFPLEdBQUcsSUFBSSxHQUFHLEVBQWdDLENBQUM7WUFJeEQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksK0JBQXVCLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDdkUsQ0FBQztRQUVELG1DQUFHLEdBQUgsVUFBSSxVQUF5QixFQUFFLFVBQWtCLEVBQUUsT0FBMkIsRUFDMUUsT0FBMkIsRUFBRSxTQUE2QjtZQUM1RCxJQUFNLEdBQUcsR0FBTSxVQUFVLENBQUMsUUFBUSxTQUFJLFVBQVksQ0FBQztZQUNuRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUN6QixNQUFNLElBQUksS0FBSyxDQUFDLDRCQUEwQixHQUFLLENBQUMsQ0FBQzthQUNsRDtZQUNELElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUNaLEdBQUcsRUFBRTtnQkFDSSxVQUFVLFlBQUEsRUFBRSxVQUFVLFlBQUEsRUFBRSxPQUFPLFNBQUEsRUFBRSxPQUFPLFNBQUEsRUFBRSxTQUFTLFdBQUE7YUFDdEQsQ0FBQyxDQUFDO1FBQ2QsQ0FBQztRQUVELDhDQUFjLEdBQWQ7O1lBQ0UsSUFBTSxNQUFNLEdBQWdCLEVBQUUsQ0FBQzs7Z0JBQy9CLEtBQWtCLElBQUEsS0FBQSxpQkFBQSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBOUMsSUFBTSxHQUFHLFdBQUE7b0JBQ1osSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFHLENBQUM7b0JBQ3JDLElBQU0sV0FBVyxHQUFHLDhCQUF1QixDQUN2QyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBQ3BGLE1BQU0sQ0FBQyxJQUFJLE9BQVgsTUFBTSxtQkFBUyxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQUEsVUFBVSxJQUFJLE9BQUEsQ0FBQzt3QkFDYixLQUFLLEVBQUUsVUFBVSxDQUFDLFlBQVk7d0JBQzlCLE1BQU0sRUFBRSxVQUFVLENBQUMsSUFBSTt3QkFDdkIsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLFVBQVU7cUJBQ3hDLENBQUMsRUFKWSxDQUlaLENBQUMsR0FBRTtpQkFDckM7Ozs7Ozs7OztZQUNELE9BQU8sTUFBTSxDQUFDO1FBQ2hCLENBQUM7UUFDSCw0QkFBQztJQUFELENBQUMsQUFsQ0QsSUFrQ0M7SUFsQ1ksc0RBQXFCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtNb2R1bGVSZXNvbHZlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge1BhcnRpYWxFdmFsdWF0b3J9IGZyb20gJy4uLy4uL3BhcnRpYWxfZXZhbHVhdG9yJztcblxuaW1wb3J0IHtzY2FuRm9yUm91dGVFbnRyeVBvaW50c30gZnJvbSAnLi9sYXp5JztcbmltcG9ydCB7Um91dGVyRW50cnlQb2ludE1hbmFnZXJ9IGZyb20gJy4vcm91dGUnO1xuXG5leHBvcnQgaW50ZXJmYWNlIE5nTW9kdWxlUmF3Um91dGVEYXRhIHtcbiAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZTtcbiAgbW9kdWxlTmFtZTogc3RyaW5nO1xuICBpbXBvcnRzOiB0cy5FeHByZXNzaW9ufG51bGw7XG4gIGV4cG9ydHM6IHRzLkV4cHJlc3Npb258bnVsbDtcbiAgcHJvdmlkZXJzOiB0cy5FeHByZXNzaW9ufG51bGw7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGF6eVJvdXRlIHtcbiAgcm91dGU6IHN0cmluZztcbiAgbW9kdWxlOiB7bmFtZTogc3RyaW5nLCBmaWxlUGF0aDogc3RyaW5nfTtcbiAgcmVmZXJlbmNlZE1vZHVsZToge25hbWU6IHN0cmluZywgZmlsZVBhdGg6IHN0cmluZ307XG59XG5cbmV4cG9ydCBjbGFzcyBOZ01vZHVsZVJvdXRlQW5hbHl6ZXIge1xuICBwcml2YXRlIG1vZHVsZXMgPSBuZXcgTWFwPHN0cmluZywgTmdNb2R1bGVSYXdSb3V0ZURhdGE+KCk7XG4gIHByaXZhdGUgZW50cnlQb2ludE1hbmFnZXI6IFJvdXRlckVudHJ5UG9pbnRNYW5hZ2VyO1xuXG4gIGNvbnN0cnVjdG9yKG1vZHVsZVJlc29sdmVyOiBNb2R1bGVSZXNvbHZlciwgcHJpdmF0ZSBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IpIHtcbiAgICB0aGlzLmVudHJ5UG9pbnRNYW5hZ2VyID0gbmV3IFJvdXRlckVudHJ5UG9pbnRNYW5hZ2VyKG1vZHVsZVJlc29sdmVyKTtcbiAgfVxuXG4gIGFkZChzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBtb2R1bGVOYW1lOiBzdHJpbmcsIGltcG9ydHM6IHRzLkV4cHJlc3Npb258bnVsbCxcbiAgICAgIGV4cG9ydHM6IHRzLkV4cHJlc3Npb258bnVsbCwgcHJvdmlkZXJzOiB0cy5FeHByZXNzaW9ufG51bGwpOiB2b2lkIHtcbiAgICBjb25zdCBrZXkgPSBgJHtzb3VyY2VGaWxlLmZpbGVOYW1lfSMke21vZHVsZU5hbWV9YDtcbiAgICBpZiAodGhpcy5tb2R1bGVzLmhhcyhrZXkpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYERvdWJsZSByb3V0ZSBhbmFseXppbmcgJHtrZXl9YCk7XG4gICAgfVxuICAgIHRoaXMubW9kdWxlcy5zZXQoXG4gICAgICAgIGtleSwge1xuICAgICAgICAgICAgICAgICBzb3VyY2VGaWxlLCBtb2R1bGVOYW1lLCBpbXBvcnRzLCBleHBvcnRzLCBwcm92aWRlcnMsXG4gICAgICAgICAgICAgfSk7XG4gIH1cblxuICBsaXN0TGF6eVJvdXRlcygpOiBMYXp5Um91dGVbXSB7XG4gICAgY29uc3Qgcm91dGVzOiBMYXp5Um91dGVbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qga2V5IG9mIEFycmF5LmZyb20odGhpcy5tb2R1bGVzLmtleXMoKSkpIHtcbiAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLm1vZHVsZXMuZ2V0KGtleSkgITtcbiAgICAgIGNvbnN0IGVudHJ5UG9pbnRzID0gc2NhbkZvclJvdXRlRW50cnlQb2ludHMoXG4gICAgICAgICAgZGF0YS5zb3VyY2VGaWxlLCBkYXRhLm1vZHVsZU5hbWUsIGRhdGEsIHRoaXMuZW50cnlQb2ludE1hbmFnZXIsIHRoaXMuZXZhbHVhdG9yKTtcbiAgICAgIHJvdXRlcy5wdXNoKC4uLmVudHJ5UG9pbnRzLm1hcChlbnRyeVBvaW50ID0+ICh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3V0ZTogZW50cnlQb2ludC5sb2FkQ2hpbGRyZW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2R1bGU6IGVudHJ5UG9pbnQuZnJvbSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlZmVyZW5jZWRNb2R1bGU6IGVudHJ5UG9pbnQucmVzb2x2ZWRUbyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSkpO1xuICAgIH1cbiAgICByZXR1cm4gcm91dGVzO1xuICB9XG59XG4iXX0=