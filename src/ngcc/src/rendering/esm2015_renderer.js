(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/rendering/esm2015_renderer", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngcc/src/rendering/renderer"], factory);
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
    var renderer_1 = require("@angular/compiler-cli/src/ngcc/src/rendering/renderer");
    var Esm2015Renderer = /** @class */ (function (_super) {
        tslib_1.__extends(Esm2015Renderer, _super);
        function Esm2015Renderer() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /**
         *  Add the imports at the top of the file
         */
        Esm2015Renderer.prototype.addImports = function (output, imports) {
            // The imports get inserted at the very top of the file.
            imports.forEach(function (i) { output.appendLeft(0, "import * as " + i.as + " from '" + i.name + "';\n"); });
        };
        /**
         * Add the definitions to each decorated class
         */
        Esm2015Renderer.prototype.addDefinitions = function (output, analyzedClass, definitions) {
            var classSymbol = this.host.getClassSymbol(analyzedClass.declaration);
            if (!classSymbol) {
                throw new Error("Analyzed class does not have a valid symbol: " + analyzedClass.name);
            }
            var insertionPoint = classSymbol.valueDeclaration.getEnd();
            output.appendLeft(insertionPoint, '\n' + definitions);
        };
        /**
         * Remove static decorator properties from classes
         */
        Esm2015Renderer.prototype.removeDecorators = function (output, decoratorsToRemove) {
            decoratorsToRemove.forEach(function (nodesToRemove, containerNode) {
                if (ts.isArrayLiteralExpression(containerNode)) {
                    var items = containerNode.elements;
                    if (items.length === nodesToRemove.length) {
                        // remove any trailing semi-colon
                        var end = (output.slice(containerNode.getEnd(), containerNode.getEnd() + 1) === ';') ?
                            containerNode.getEnd() + 1 :
                            containerNode.getEnd();
                        output.remove(containerNode.parent.getFullStart(), end);
                    }
                    else {
                        nodesToRemove.forEach(function (node) {
                            // remove any trailing comma
                            var end = (output.slice(node.getEnd(), node.getEnd() + 1) === ',') ?
                                node.getEnd() + 1 :
                                node.getEnd();
                            output.remove(node.getFullStart(), end);
                        });
                    }
                }
            });
        };
        return Esm2015Renderer;
    }(renderer_1.Renderer));
    exports.Esm2015Renderer = Esm2015Renderer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtMjAxNV9yZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvcmVuZGVyaW5nL2VzbTIwMTVfcmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBR2pDLGtGQUFvQztJQUVwQztRQUFxQywyQ0FBUTtRQUE3Qzs7UUE4Q0EsQ0FBQztRQTdDQzs7V0FFRztRQUNILG9DQUFVLEdBQVYsVUFBVyxNQUFtQixFQUFFLE9BQXNDO1lBQ3BFLHdEQUF3RDtZQUN4RCxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQUEsQ0FBQyxJQUFNLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLGlCQUFlLENBQUMsQ0FBQyxFQUFFLGVBQVUsQ0FBQyxDQUFDLElBQUksU0FBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3RixDQUFDO1FBRUQ7O1dBRUc7UUFDSCx3Q0FBYyxHQUFkLFVBQWUsTUFBbUIsRUFBRSxhQUE0QixFQUFFLFdBQW1CO1lBQ25GLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUN4RSxJQUFJLENBQUMsV0FBVyxFQUFFO2dCQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLGtEQUFnRCxhQUFhLENBQUMsSUFBTSxDQUFDLENBQUM7YUFDdkY7WUFDRCxJQUFNLGNBQWMsR0FBRyxXQUFXLENBQUMsZ0JBQWtCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDL0QsTUFBTSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsSUFBSSxHQUFHLFdBQVcsQ0FBQyxDQUFDO1FBQ3hELENBQUM7UUFFRDs7V0FFRztRQUNILDBDQUFnQixHQUFoQixVQUFpQixNQUFtQixFQUFFLGtCQUEyQztZQUMvRSxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsVUFBQyxhQUFhLEVBQUUsYUFBYTtnQkFDdEQsSUFBSSxFQUFFLENBQUMsd0JBQXdCLENBQUMsYUFBYSxDQUFDLEVBQUU7b0JBQzlDLElBQU0sS0FBSyxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUM7b0JBQ3JDLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxhQUFhLENBQUMsTUFBTSxFQUFFO3dCQUN6QyxpQ0FBaUM7d0JBQ2pDLElBQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLEVBQUUsYUFBYSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7NEJBQ3BGLGFBQWEsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQzs0QkFDNUIsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDO3dCQUMzQixNQUFNLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxNQUFRLENBQUMsWUFBWSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7cUJBQzNEO3lCQUFNO3dCQUNMLGFBQWEsQ0FBQyxPQUFPLENBQUMsVUFBQSxJQUFJOzRCQUN4Qiw0QkFBNEI7NEJBQzVCLElBQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0NBQ2xFLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztnQ0FDbkIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDOzRCQUNsQixNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQzt3QkFDMUMsQ0FBQyxDQUFDLENBQUM7cUJBQ0o7aUJBQ0Y7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFDSCxzQkFBQztJQUFELENBQUMsQUE5Q0QsQ0FBcUMsbUJBQVEsR0E4QzVDO0lBOUNZLDBDQUFlIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgTWFnaWNTdHJpbmcgZnJvbSAnbWFnaWMtc3RyaW5nJztcbmltcG9ydCB7QW5hbHl6ZWRDbGFzc30gZnJvbSAnLi4vYW5hbHl6ZXInO1xuaW1wb3J0IHtSZW5kZXJlcn0gZnJvbSAnLi9yZW5kZXJlcic7XG5cbmV4cG9ydCBjbGFzcyBFc20yMDE1UmVuZGVyZXIgZXh0ZW5kcyBSZW5kZXJlciB7XG4gIC8qKlxuICAgKiAgQWRkIHRoZSBpbXBvcnRzIGF0IHRoZSB0b3Agb2YgdGhlIGZpbGVcbiAgICovXG4gIGFkZEltcG9ydHMob3V0cHV0OiBNYWdpY1N0cmluZywgaW1wb3J0czoge25hbWU6IHN0cmluZzsgYXM6IHN0cmluZzt9W10pOiB2b2lkIHtcbiAgICAvLyBUaGUgaW1wb3J0cyBnZXQgaW5zZXJ0ZWQgYXQgdGhlIHZlcnkgdG9wIG9mIHRoZSBmaWxlLlxuICAgIGltcG9ydHMuZm9yRWFjaChpID0+IHsgb3V0cHV0LmFwcGVuZExlZnQoMCwgYGltcG9ydCAqIGFzICR7aS5hc30gZnJvbSAnJHtpLm5hbWV9JztcXG5gKTsgfSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIHRoZSBkZWZpbml0aW9ucyB0byBlYWNoIGRlY29yYXRlZCBjbGFzc1xuICAgKi9cbiAgYWRkRGVmaW5pdGlvbnMob3V0cHV0OiBNYWdpY1N0cmluZywgYW5hbHl6ZWRDbGFzczogQW5hbHl6ZWRDbGFzcywgZGVmaW5pdGlvbnM6IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5ob3N0LmdldENsYXNzU3ltYm9sKGFuYWx5emVkQ2xhc3MuZGVjbGFyYXRpb24pO1xuICAgIGlmICghY2xhc3NTeW1ib2wpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQW5hbHl6ZWQgY2xhc3MgZG9lcyBub3QgaGF2ZSBhIHZhbGlkIHN5bWJvbDogJHthbmFseXplZENsYXNzLm5hbWV9YCk7XG4gICAgfVxuICAgIGNvbnN0IGluc2VydGlvblBvaW50ID0gY2xhc3NTeW1ib2wudmFsdWVEZWNsYXJhdGlvbiAhLmdldEVuZCgpO1xuICAgIG91dHB1dC5hcHBlbmRMZWZ0KGluc2VydGlvblBvaW50LCAnXFxuJyArIGRlZmluaXRpb25zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgc3RhdGljIGRlY29yYXRvciBwcm9wZXJ0aWVzIGZyb20gY2xhc3Nlc1xuICAgKi9cbiAgcmVtb3ZlRGVjb3JhdG9ycyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBkZWNvcmF0b3JzVG9SZW1vdmU6IE1hcDx0cy5Ob2RlLCB0cy5Ob2RlW10+KTogdm9pZCB7XG4gICAgZGVjb3JhdG9yc1RvUmVtb3ZlLmZvckVhY2goKG5vZGVzVG9SZW1vdmUsIGNvbnRhaW5lck5vZGUpID0+IHtcbiAgICAgIGlmICh0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oY29udGFpbmVyTm9kZSkpIHtcbiAgICAgICAgY29uc3QgaXRlbXMgPSBjb250YWluZXJOb2RlLmVsZW1lbnRzO1xuICAgICAgICBpZiAoaXRlbXMubGVuZ3RoID09PSBub2Rlc1RvUmVtb3ZlLmxlbmd0aCkge1xuICAgICAgICAgIC8vIHJlbW92ZSBhbnkgdHJhaWxpbmcgc2VtaS1jb2xvblxuICAgICAgICAgIGNvbnN0IGVuZCA9IChvdXRwdXQuc2xpY2UoY29udGFpbmVyTm9kZS5nZXRFbmQoKSwgY29udGFpbmVyTm9kZS5nZXRFbmQoKSArIDEpID09PSAnOycpID9cbiAgICAgICAgICAgICAgY29udGFpbmVyTm9kZS5nZXRFbmQoKSArIDEgOlxuICAgICAgICAgICAgICBjb250YWluZXJOb2RlLmdldEVuZCgpO1xuICAgICAgICAgIG91dHB1dC5yZW1vdmUoY29udGFpbmVyTm9kZS5wYXJlbnQgIS5nZXRGdWxsU3RhcnQoKSwgZW5kKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBub2Rlc1RvUmVtb3ZlLmZvckVhY2gobm9kZSA9PiB7XG4gICAgICAgICAgICAvLyByZW1vdmUgYW55IHRyYWlsaW5nIGNvbW1hXG4gICAgICAgICAgICBjb25zdCBlbmQgPSAob3V0cHV0LnNsaWNlKG5vZGUuZ2V0RW5kKCksIG5vZGUuZ2V0RW5kKCkgKyAxKSA9PT0gJywnKSA/XG4gICAgICAgICAgICAgICAgbm9kZS5nZXRFbmQoKSArIDEgOlxuICAgICAgICAgICAgICAgIG5vZGUuZ2V0RW5kKCk7XG4gICAgICAgICAgICBvdXRwdXQucmVtb3ZlKG5vZGUuZ2V0RnVsbFN0YXJ0KCksIGVuZCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuIl19