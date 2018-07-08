(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("angular/packages/compiler-cli/src/ngcc/src/rendering/esm2015_renderer", ["require", "exports", "tslib", "typescript", "angular/packages/compiler-cli/src/ngcc/src/rendering/renderer"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var renderer_1 = require("angular/packages/compiler-cli/src/ngcc/src/rendering/renderer");
    var Esm2015Renderer = /** @class */ (function (_super) {
        tslib_1.__extends(Esm2015Renderer, _super);
        function Esm2015Renderer() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        // Add the imports at the top of the file
        Esm2015Renderer.prototype.addImports = function (output, imports) {
            imports.forEach(function (i) {
                output.appendLeft(0, "import * as " + i.as + " from '" + i.name + "';\n");
            });
        };
        // Add the definitions to each decorated class
        Esm2015Renderer.prototype.addDefinitions = function (output, analyzedClass, definitions) {
            var insertionPoint = getEndPositionOfClass(analyzedClass);
            output.appendLeft(insertionPoint, '\n' + definitions);
        };
        // Remove static decorator properties from classes
        Esm2015Renderer.prototype.removeDecorators = function (output, decoratorsToRemove) {
            decoratorsToRemove.forEach(function (nodesToRemove, containerNode) {
                var children = containerNode.getChildren().filter(function (node) { return !ts.isToken(node); });
                if (children.length === nodesToRemove.length) {
                    // TODO check this works for different decorator types
                    output.remove(containerNode.parent.getFullStart(), containerNode.parent.getEnd() + 1 /* TODO: this is hard-coded for the semi-colon! */);
                }
                else {
                    nodesToRemove.forEach(function (node) {
                        output.remove(node.getFullStart(), node.getEnd());
                    });
                }
            });
        };
        return Esm2015Renderer;
    }(renderer_1.Renderer));
    exports.Esm2015Renderer = Esm2015Renderer;
    // Find the position where the new definition should be inserted
    function getEndPositionOfClass(analyzedClass) {
        return analyzedClass.declaration.getEnd();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtMjAxNV9yZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvcmVuZGVyaW5nL2VzbTIwMTVfcmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBR2pDLDBGQUFvQztJQVFwQztRQUFxQywyQ0FBUTtRQUE3Qzs7UUE2QkEsQ0FBQztRQTVCQyx5Q0FBeUM7UUFDekMsb0NBQVUsR0FBVixVQUFXLE1BQW1CLEVBQUUsT0FBd0M7WUFDdEUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFBLENBQUM7Z0JBQ2YsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsaUJBQWUsQ0FBQyxDQUFDLEVBQUUsZUFBVSxDQUFDLENBQUMsSUFBSSxTQUFNLENBQUMsQ0FBQztZQUNsRSxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCw4Q0FBOEM7UUFDOUMsd0NBQWMsR0FBZCxVQUFlLE1BQW1CLEVBQUUsYUFBNEIsRUFBRSxXQUFtQjtZQUNuRixJQUFNLGNBQWMsR0FBRyxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUM1RCxNQUFNLENBQUMsVUFBVSxDQUFDLGNBQWMsRUFBRSxJQUFJLEdBQUcsV0FBVyxDQUFDLENBQUM7UUFDeEQsQ0FBQztRQUVELGtEQUFrRDtRQUNsRCwwQ0FBZ0IsR0FBaEIsVUFBaUIsTUFBbUIsRUFBRSxrQkFBMkM7WUFDL0Usa0JBQWtCLENBQUMsT0FBTyxDQUFDLFVBQUMsYUFBYSxFQUFFLGFBQWE7Z0JBQ3RELElBQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQWpCLENBQWlCLENBQUMsQ0FBQztnQkFDL0UsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLGFBQWEsQ0FBQyxNQUFNLEVBQUU7b0JBQzVDLHNEQUFzRDtvQkFDdEQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsTUFBTyxDQUFDLFlBQVksRUFBRSxFQUFFLGFBQWEsQ0FBQyxNQUFPLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLGtEQUFrRCxDQUFDLENBQUM7aUJBQzVJO3FCQUFNO29CQUNMLGFBQWEsQ0FBQyxPQUFPLENBQUMsVUFBQSxJQUFJO3dCQUN4QixNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztvQkFDcEQsQ0FBQyxDQUFDLENBQUM7aUJBQ0o7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNILENBQUM7UUFFTCxzQkFBQztJQUFELENBQUMsQUE3QkQsQ0FBcUMsbUJBQVEsR0E2QjVDO0lBN0JZLDBDQUFlO0lBK0I1QixnRUFBZ0U7SUFDaEUsK0JBQStCLGFBQTRCO1FBQ3pELE9BQU8sYUFBYSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUM1QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgTWFnaWNTdHJpbmcgZnJvbSAnbWFnaWMtc3RyaW5nJztcbmltcG9ydCB7QW5hbHl6ZWRDbGFzcywgQW5hbHl6ZWRGaWxlfSBmcm9tICcuLi9hbmFseXplcic7XG5pbXBvcnQge1JlbmRlcmVyfSBmcm9tICcuL3JlbmRlcmVyJztcblxuZXhwb3J0IGludGVyZmFjZSBSZW5kZXJlZEZpbGUge1xuICBmaWxlOiBBbmFseXplZEZpbGU7XG4gIGNvbnRlbnQ6IHN0cmluZztcbiAgbWFwOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBFc20yMDE1UmVuZGVyZXIgZXh0ZW5kcyBSZW5kZXJlciB7XG4gIC8vIEFkZCB0aGUgaW1wb3J0cyBhdCB0aGUgdG9wIG9mIHRoZSBmaWxlXG4gIGFkZEltcG9ydHMob3V0cHV0OiBNYWdpY1N0cmluZywgaW1wb3J0czogeyBuYW1lOiBzdHJpbmc7IGFzOiBzdHJpbmc7IH1bXSk6IHZvaWQge1xuICAgIGltcG9ydHMuZm9yRWFjaChpID0+IHtcbiAgICAgIG91dHB1dC5hcHBlbmRMZWZ0KDAsIGBpbXBvcnQgKiBhcyAke2kuYXN9IGZyb20gJyR7aS5uYW1lfSc7XFxuYCk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBBZGQgdGhlIGRlZmluaXRpb25zIHRvIGVhY2ggZGVjb3JhdGVkIGNsYXNzXG4gIGFkZERlZmluaXRpb25zKG91dHB1dDogTWFnaWNTdHJpbmcsIGFuYWx5emVkQ2xhc3M6IEFuYWx5emVkQ2xhc3MsIGRlZmluaXRpb25zOiBzdHJpbmcpIHtcbiAgICBjb25zdCBpbnNlcnRpb25Qb2ludCA9IGdldEVuZFBvc2l0aW9uT2ZDbGFzcyhhbmFseXplZENsYXNzKTtcbiAgICBvdXRwdXQuYXBwZW5kTGVmdChpbnNlcnRpb25Qb2ludCwgJ1xcbicgKyBkZWZpbml0aW9ucyk7XG4gIH1cblxuICAvLyBSZW1vdmUgc3RhdGljIGRlY29yYXRvciBwcm9wZXJ0aWVzIGZyb20gY2xhc3Nlc1xuICByZW1vdmVEZWNvcmF0b3JzKG91dHB1dDogTWFnaWNTdHJpbmcsIGRlY29yYXRvcnNUb1JlbW92ZTogTWFwPHRzLk5vZGUsIHRzLk5vZGVbXT4pOiB2b2lkIHtcbiAgICBkZWNvcmF0b3JzVG9SZW1vdmUuZm9yRWFjaCgobm9kZXNUb1JlbW92ZSwgY29udGFpbmVyTm9kZSkgPT4ge1xuICAgICAgY29uc3QgY2hpbGRyZW4gPSBjb250YWluZXJOb2RlLmdldENoaWxkcmVuKCkuZmlsdGVyKG5vZGUgPT4gIXRzLmlzVG9rZW4obm9kZSkpO1xuICAgICAgaWYgKGNoaWxkcmVuLmxlbmd0aCA9PT0gbm9kZXNUb1JlbW92ZS5sZW5ndGgpIHtcbiAgICAgICAgLy8gVE9ETyBjaGVjayB0aGlzIHdvcmtzIGZvciBkaWZmZXJlbnQgZGVjb3JhdG9yIHR5cGVzXG4gICAgICAgIG91dHB1dC5yZW1vdmUoY29udGFpbmVyTm9kZS5wYXJlbnQhLmdldEZ1bGxTdGFydCgpLCBjb250YWluZXJOb2RlLnBhcmVudCEuZ2V0RW5kKCkgKyAxIC8qIFRPRE86IHRoaXMgaXMgaGFyZC1jb2RlZCBmb3IgdGhlIHNlbWktY29sb24hICovKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5vZGVzVG9SZW1vdmUuZm9yRWFjaChub2RlID0+IHtcbiAgICAgICAgICBvdXRwdXQucmVtb3ZlKG5vZGUuZ2V0RnVsbFN0YXJ0KCksIG5vZGUuZ2V0RW5kKCkpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB9XG5cbn1cblxuLy8gRmluZCB0aGUgcG9zaXRpb24gd2hlcmUgdGhlIG5ldyBkZWZpbml0aW9uIHNob3VsZCBiZSBpbnNlcnRlZFxuZnVuY3Rpb24gZ2V0RW5kUG9zaXRpb25PZkNsYXNzKGFuYWx5emVkQ2xhc3M6IEFuYWx5emVkQ2xhc3MpIHtcbiAgcmV0dXJuIGFuYWx5emVkQ2xhc3MuZGVjbGFyYXRpb24uZ2V0RW5kKCk7XG59XG4iXX0=