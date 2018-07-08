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
            // QUESTION: Should we move the imports to after any initial comment in the file?
            // Currently the imports get inserted at the very top of the file.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtMjAxNV9yZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvcmVuZGVyaW5nL2VzbTIwMTVfcmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBR2pDLDBGQUFvQztJQVFwQztRQUFxQywyQ0FBUTtRQUE3Qzs7UUErQkEsQ0FBQztRQTlCQyx5Q0FBeUM7UUFDekMsb0NBQVUsR0FBVixVQUFXLE1BQW1CLEVBQUUsT0FBd0M7WUFDdEUsaUZBQWlGO1lBQ2pGLGtFQUFrRTtZQUNsRSxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQUEsQ0FBQztnQkFDZixNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxpQkFBZSxDQUFDLENBQUMsRUFBRSxlQUFVLENBQUMsQ0FBQyxJQUFJLFNBQU0sQ0FBQyxDQUFDO1lBQ2xFLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELDhDQUE4QztRQUM5Qyx3Q0FBYyxHQUFkLFVBQWUsTUFBbUIsRUFBRSxhQUE0QixFQUFFLFdBQW1CO1lBQ25GLElBQU0sY0FBYyxHQUFHLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQzVELE1BQU0sQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFLElBQUksR0FBRyxXQUFXLENBQUMsQ0FBQztRQUN4RCxDQUFDO1FBRUQsa0RBQWtEO1FBQ2xELDBDQUFnQixHQUFoQixVQUFpQixNQUFtQixFQUFFLGtCQUEyQztZQUMvRSxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsVUFBQyxhQUFhLEVBQUUsYUFBYTtnQkFDdEQsSUFBTSxRQUFRLEdBQUcsYUFBYSxDQUFDLFdBQVcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBakIsQ0FBaUIsQ0FBQyxDQUFDO2dCQUMvRSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssYUFBYSxDQUFDLE1BQU0sRUFBRTtvQkFDNUMsc0RBQXNEO29CQUN0RCxNQUFNLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxNQUFPLENBQUMsWUFBWSxFQUFFLEVBQUUsYUFBYSxDQUFDLE1BQU8sQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsa0RBQWtELENBQUMsQ0FBQztpQkFDNUk7cUJBQU07b0JBQ0wsYUFBYSxDQUFDLE9BQU8sQ0FBQyxVQUFBLElBQUk7d0JBQ3hCLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO29CQUNwRCxDQUFDLENBQUMsQ0FBQztpQkFDSjtZQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0gsQ0FBQztRQUVMLHNCQUFDO0lBQUQsQ0FBQyxBQS9CRCxDQUFxQyxtQkFBUSxHQStCNUM7SUEvQlksMENBQWU7SUFpQzVCLGdFQUFnRTtJQUNoRSwrQkFBK0IsYUFBNEI7UUFDekQsT0FBTyxhQUFhLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQzVDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBNYWdpY1N0cmluZyBmcm9tICdtYWdpYy1zdHJpbmcnO1xuaW1wb3J0IHtBbmFseXplZENsYXNzLCBBbmFseXplZEZpbGV9IGZyb20gJy4uL2FuYWx5emVyJztcbmltcG9ydCB7UmVuZGVyZXJ9IGZyb20gJy4vcmVuZGVyZXInO1xuXG5leHBvcnQgaW50ZXJmYWNlIFJlbmRlcmVkRmlsZSB7XG4gIGZpbGU6IEFuYWx5emVkRmlsZTtcbiAgY29udGVudDogc3RyaW5nO1xuICBtYXA6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIEVzbTIwMTVSZW5kZXJlciBleHRlbmRzIFJlbmRlcmVyIHtcbiAgLy8gQWRkIHRoZSBpbXBvcnRzIGF0IHRoZSB0b3Agb2YgdGhlIGZpbGVcbiAgYWRkSW1wb3J0cyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBpbXBvcnRzOiB7IG5hbWU6IHN0cmluZzsgYXM6IHN0cmluZzsgfVtdKTogdm9pZCB7XG4gICAgLy8gUVVFU1RJT046IFNob3VsZCB3ZSBtb3ZlIHRoZSBpbXBvcnRzIHRvIGFmdGVyIGFueSBpbml0aWFsIGNvbW1lbnQgaW4gdGhlIGZpbGU/XG4gICAgLy8gQ3VycmVudGx5IHRoZSBpbXBvcnRzIGdldCBpbnNlcnRlZCBhdCB0aGUgdmVyeSB0b3Agb2YgdGhlIGZpbGUuXG4gICAgaW1wb3J0cy5mb3JFYWNoKGkgPT4ge1xuICAgICAgb3V0cHV0LmFwcGVuZExlZnQoMCwgYGltcG9ydCAqIGFzICR7aS5hc30gZnJvbSAnJHtpLm5hbWV9JztcXG5gKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIEFkZCB0aGUgZGVmaW5pdGlvbnMgdG8gZWFjaCBkZWNvcmF0ZWQgY2xhc3NcbiAgYWRkRGVmaW5pdGlvbnMob3V0cHV0OiBNYWdpY1N0cmluZywgYW5hbHl6ZWRDbGFzczogQW5hbHl6ZWRDbGFzcywgZGVmaW5pdGlvbnM6IHN0cmluZykge1xuICAgIGNvbnN0IGluc2VydGlvblBvaW50ID0gZ2V0RW5kUG9zaXRpb25PZkNsYXNzKGFuYWx5emVkQ2xhc3MpO1xuICAgIG91dHB1dC5hcHBlbmRMZWZ0KGluc2VydGlvblBvaW50LCAnXFxuJyArIGRlZmluaXRpb25zKTtcbiAgfVxuXG4gIC8vIFJlbW92ZSBzdGF0aWMgZGVjb3JhdG9yIHByb3BlcnRpZXMgZnJvbSBjbGFzc2VzXG4gIHJlbW92ZURlY29yYXRvcnMob3V0cHV0OiBNYWdpY1N0cmluZywgZGVjb3JhdG9yc1RvUmVtb3ZlOiBNYXA8dHMuTm9kZSwgdHMuTm9kZVtdPik6IHZvaWQge1xuICAgIGRlY29yYXRvcnNUb1JlbW92ZS5mb3JFYWNoKChub2Rlc1RvUmVtb3ZlLCBjb250YWluZXJOb2RlKSA9PiB7XG4gICAgICBjb25zdCBjaGlsZHJlbiA9IGNvbnRhaW5lck5vZGUuZ2V0Q2hpbGRyZW4oKS5maWx0ZXIobm9kZSA9PiAhdHMuaXNUb2tlbihub2RlKSk7XG4gICAgICBpZiAoY2hpbGRyZW4ubGVuZ3RoID09PSBub2Rlc1RvUmVtb3ZlLmxlbmd0aCkge1xuICAgICAgICAvLyBUT0RPIGNoZWNrIHRoaXMgd29ya3MgZm9yIGRpZmZlcmVudCBkZWNvcmF0b3IgdHlwZXNcbiAgICAgICAgb3V0cHV0LnJlbW92ZShjb250YWluZXJOb2RlLnBhcmVudCEuZ2V0RnVsbFN0YXJ0KCksIGNvbnRhaW5lck5vZGUucGFyZW50IS5nZXRFbmQoKSArIDEgLyogVE9ETzogdGhpcyBpcyBoYXJkLWNvZGVkIGZvciB0aGUgc2VtaS1jb2xvbiEgKi8pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbm9kZXNUb1JlbW92ZS5mb3JFYWNoKG5vZGUgPT4ge1xuICAgICAgICAgIG91dHB1dC5yZW1vdmUobm9kZS5nZXRGdWxsU3RhcnQoKSwgbm9kZS5nZXRFbmQoKSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIH1cblxufVxuXG4vLyBGaW5kIHRoZSBwb3NpdGlvbiB3aGVyZSB0aGUgbmV3IGRlZmluaXRpb24gc2hvdWxkIGJlIGluc2VydGVkXG5mdW5jdGlvbiBnZXRFbmRQb3NpdGlvbk9mQ2xhc3MoYW5hbHl6ZWRDbGFzczogQW5hbHl6ZWRDbGFzcykge1xuICByZXR1cm4gYW5hbHl6ZWRDbGFzcy5kZWNsYXJhdGlvbi5nZXRFbmQoKTtcbn1cbiJdfQ==