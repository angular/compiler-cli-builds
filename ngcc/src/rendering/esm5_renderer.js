(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/rendering/esm5_renderer", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/ngcc/src/host/esm5_host", "@angular/compiler-cli/ngcc/src/rendering/esm_renderer"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var esm5_host_1 = require("@angular/compiler-cli/ngcc/src/host/esm5_host");
    var esm_renderer_1 = require("@angular/compiler-cli/ngcc/src/rendering/esm_renderer");
    var Esm5Renderer = /** @class */ (function (_super) {
        tslib_1.__extends(Esm5Renderer, _super);
        function Esm5Renderer(fs, logger, host, isCore, bundle) {
            return _super.call(this, fs, logger, host, isCore, bundle) || this;
        }
        /**
         * Add the definitions to each decorated class
         */
        Esm5Renderer.prototype.addDefinitions = function (output, compiledClass, definitions) {
            var iifeBody = esm5_host_1.getIifeBody(compiledClass.declaration);
            if (!iifeBody) {
                throw new Error("Compiled class declaration is not inside an IIFE: " + compiledClass.name + " in " + compiledClass.declaration.getSourceFile().fileName);
            }
            var returnStatement = iifeBody.statements.find(ts.isReturnStatement);
            if (!returnStatement) {
                throw new Error("Compiled class wrapper IIFE does not have a return statement: " + compiledClass.name + " in " + compiledClass.declaration.getSourceFile().fileName);
            }
            var insertionPoint = returnStatement.getFullStart();
            output.appendLeft(insertionPoint, '\n' + definitions);
        };
        return Esm5Renderer;
    }(esm_renderer_1.EsmRenderer));
    exports.Esm5Renderer = Esm5Renderer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtNV9yZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9yZW5kZXJpbmcvZXNtNV9yZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFRQSwrQkFBaUM7SUFHakMsMkVBQThDO0lBSTlDLHNGQUEyQztJQUUzQztRQUFrQyx3Q0FBVztRQUMzQyxzQkFDSSxFQUFjLEVBQUUsTUFBYyxFQUFFLElBQXdCLEVBQUUsTUFBZSxFQUN6RSxNQUF3QjttQkFDMUIsa0JBQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQztRQUN6QyxDQUFDO1FBRUQ7O1dBRUc7UUFDSCxxQ0FBYyxHQUFkLFVBQWUsTUFBbUIsRUFBRSxhQUE0QixFQUFFLFdBQW1CO1lBQ25GLElBQU0sUUFBUSxHQUFHLHVCQUFXLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3hELElBQUksQ0FBQyxRQUFRLEVBQUU7Z0JBQ2IsTUFBTSxJQUFJLEtBQUssQ0FDWCx1REFBcUQsYUFBYSxDQUFDLElBQUksWUFBTyxhQUFhLENBQUMsV0FBVyxDQUFDLGFBQWEsRUFBRSxDQUFDLFFBQVUsQ0FBQyxDQUFDO2FBQ3pJO1lBRUQsSUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDdkUsSUFBSSxDQUFDLGVBQWUsRUFBRTtnQkFDcEIsTUFBTSxJQUFJLEtBQUssQ0FDWCxtRUFBaUUsYUFBYSxDQUFDLElBQUksWUFBTyxhQUFhLENBQUMsV0FBVyxDQUFDLGFBQWEsRUFBRSxDQUFDLFFBQVUsQ0FBQyxDQUFDO2FBQ3JKO1lBRUQsSUFBTSxjQUFjLEdBQUcsZUFBZSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3RELE1BQU0sQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFLElBQUksR0FBRyxXQUFXLENBQUMsQ0FBQztRQUN4RCxDQUFDO1FBQ0gsbUJBQUM7SUFBRCxDQUFDLEFBMUJELENBQWtDLDBCQUFXLEdBMEI1QztJQTFCWSxvQ0FBWSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCBNYWdpY1N0cmluZyBmcm9tICdtYWdpYy1zdHJpbmcnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge0NvbXBpbGVkQ2xhc3N9IGZyb20gJy4uL2FuYWx5c2lzL2RlY29yYXRpb25fYW5hbHl6ZXInO1xuaW1wb3J0IHtGaWxlU3lzdGVtfSBmcm9tICcuLi9maWxlX3N5c3RlbS9maWxlX3N5c3RlbSc7XG5pbXBvcnQge2dldElpZmVCb2R5fSBmcm9tICcuLi9ob3N0L2VzbTVfaG9zdCc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7RW50cnlQb2ludEJ1bmRsZX0gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnRfYnVuZGxlJztcbmltcG9ydCB7RXNtUmVuZGVyZXJ9IGZyb20gJy4vZXNtX3JlbmRlcmVyJztcblxuZXhwb3J0IGNsYXNzIEVzbTVSZW5kZXJlciBleHRlbmRzIEVzbVJlbmRlcmVyIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBmczogRmlsZVN5c3RlbSwgbG9nZ2VyOiBMb2dnZXIsIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgaXNDb3JlOiBib29sZWFuLFxuICAgICAgYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlKSB7XG4gICAgc3VwZXIoZnMsIGxvZ2dlciwgaG9zdCwgaXNDb3JlLCBidW5kbGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCB0aGUgZGVmaW5pdGlvbnMgdG8gZWFjaCBkZWNvcmF0ZWQgY2xhc3NcbiAgICovXG4gIGFkZERlZmluaXRpb25zKG91dHB1dDogTWFnaWNTdHJpbmcsIGNvbXBpbGVkQ2xhc3M6IENvbXBpbGVkQ2xhc3MsIGRlZmluaXRpb25zOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBjb25zdCBpaWZlQm9keSA9IGdldElpZmVCb2R5KGNvbXBpbGVkQ2xhc3MuZGVjbGFyYXRpb24pO1xuICAgIGlmICghaWlmZUJvZHkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgQ29tcGlsZWQgY2xhc3MgZGVjbGFyYXRpb24gaXMgbm90IGluc2lkZSBhbiBJSUZFOiAke2NvbXBpbGVkQ2xhc3MubmFtZX0gaW4gJHtjb21waWxlZENsYXNzLmRlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZX1gKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXR1cm5TdGF0ZW1lbnQgPSBpaWZlQm9keS5zdGF0ZW1lbnRzLmZpbmQodHMuaXNSZXR1cm5TdGF0ZW1lbnQpO1xuICAgIGlmICghcmV0dXJuU3RhdGVtZW50KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYENvbXBpbGVkIGNsYXNzIHdyYXBwZXIgSUlGRSBkb2VzIG5vdCBoYXZlIGEgcmV0dXJuIHN0YXRlbWVudDogJHtjb21waWxlZENsYXNzLm5hbWV9IGluICR7Y29tcGlsZWRDbGFzcy5kZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWV9YCk7XG4gICAgfVxuXG4gICAgY29uc3QgaW5zZXJ0aW9uUG9pbnQgPSByZXR1cm5TdGF0ZW1lbnQuZ2V0RnVsbFN0YXJ0KCk7XG4gICAgb3V0cHV0LmFwcGVuZExlZnQoaW5zZXJ0aW9uUG9pbnQsICdcXG4nICsgZGVmaW5pdGlvbnMpO1xuICB9XG59XG4iXX0=