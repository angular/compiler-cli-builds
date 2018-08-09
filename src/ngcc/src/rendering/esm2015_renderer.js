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
        Esm2015Renderer.prototype.addConstants = function (output, constants, file) {
            if (constants === '') {
                return;
            }
            var insertionPoint = file.statements.reduce(function (prev, stmt) {
                if (ts.isImportDeclaration(stmt) || ts.isImportEqualsDeclaration(stmt) ||
                    ts.isNamespaceImport(stmt)) {
                    return stmt.getEnd();
                }
                return prev;
            }, 0);
            output.appendLeft(insertionPoint, '\n' + constants + '\n');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtMjAxNV9yZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvcmVuZGVyaW5nL2VzbTIwMTVfcmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBR2pDLGtGQUFvQztJQUVwQztRQUFxQywyQ0FBUTtRQUE3Qzs7UUE0REEsQ0FBQztRQTNEQzs7V0FFRztRQUNILG9DQUFVLEdBQVYsVUFBVyxNQUFtQixFQUFFLE9BQXNDO1lBQ3BFLHdEQUF3RDtZQUN4RCxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQUEsQ0FBQyxJQUFNLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLGlCQUFlLENBQUMsQ0FBQyxFQUFFLGVBQVUsQ0FBQyxDQUFDLElBQUksU0FBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3RixDQUFDO1FBRUQsc0NBQVksR0FBWixVQUFhLE1BQW1CLEVBQUUsU0FBaUIsRUFBRSxJQUFtQjtZQUN0RSxJQUFJLFNBQVMsS0FBSyxFQUFFLEVBQUU7Z0JBQ3BCLE9BQU87YUFDUjtZQUNELElBQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFVBQUMsSUFBSSxFQUFFLElBQUk7Z0JBQ3ZELElBQUksRUFBRSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUM7b0JBQ2xFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDOUIsT0FBTyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7aUJBQ3RCO2dCQUNELE9BQU8sSUFBSSxDQUFDO1lBQ2QsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ04sTUFBTSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsSUFBSSxHQUFHLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQztRQUM3RCxDQUFDO1FBRUQ7O1dBRUc7UUFDSCx3Q0FBYyxHQUFkLFVBQWUsTUFBbUIsRUFBRSxhQUE0QixFQUFFLFdBQW1CO1lBQ25GLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUN4RSxJQUFJLENBQUMsV0FBVyxFQUFFO2dCQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLGtEQUFnRCxhQUFhLENBQUMsSUFBTSxDQUFDLENBQUM7YUFDdkY7WUFDRCxJQUFNLGNBQWMsR0FBRyxXQUFXLENBQUMsZ0JBQWtCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDL0QsTUFBTSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsSUFBSSxHQUFHLFdBQVcsQ0FBQyxDQUFDO1FBQ3hELENBQUM7UUFFRDs7V0FFRztRQUNILDBDQUFnQixHQUFoQixVQUFpQixNQUFtQixFQUFFLGtCQUEyQztZQUMvRSxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsVUFBQyxhQUFhLEVBQUUsYUFBYTtnQkFDdEQsSUFBSSxFQUFFLENBQUMsd0JBQXdCLENBQUMsYUFBYSxDQUFDLEVBQUU7b0JBQzlDLElBQU0sS0FBSyxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUM7b0JBQ3JDLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxhQUFhLENBQUMsTUFBTSxFQUFFO3dCQUN6QyxpQ0FBaUM7d0JBQ2pDLElBQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLEVBQUUsYUFBYSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7NEJBQ3BGLGFBQWEsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQzs0QkFDNUIsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDO3dCQUMzQixNQUFNLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxNQUFRLENBQUMsWUFBWSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7cUJBQzNEO3lCQUFNO3dCQUNMLGFBQWEsQ0FBQyxPQUFPLENBQUMsVUFBQSxJQUFJOzRCQUN4Qiw0QkFBNEI7NEJBQzVCLElBQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0NBQ2xFLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztnQ0FDbkIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDOzRCQUNsQixNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQzt3QkFDMUMsQ0FBQyxDQUFDLENBQUM7cUJBQ0o7aUJBQ0Y7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFDSCxzQkFBQztJQUFELENBQUMsQUE1REQsQ0FBcUMsbUJBQVEsR0E0RDVDO0lBNURZLDBDQUFlIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgTWFnaWNTdHJpbmcgZnJvbSAnbWFnaWMtc3RyaW5nJztcbmltcG9ydCB7QW5hbHl6ZWRDbGFzc30gZnJvbSAnLi4vYW5hbHl6ZXInO1xuaW1wb3J0IHtSZW5kZXJlcn0gZnJvbSAnLi9yZW5kZXJlcic7XG5cbmV4cG9ydCBjbGFzcyBFc20yMDE1UmVuZGVyZXIgZXh0ZW5kcyBSZW5kZXJlciB7XG4gIC8qKlxuICAgKiAgQWRkIHRoZSBpbXBvcnRzIGF0IHRoZSB0b3Agb2YgdGhlIGZpbGVcbiAgICovXG4gIGFkZEltcG9ydHMob3V0cHV0OiBNYWdpY1N0cmluZywgaW1wb3J0czoge25hbWU6IHN0cmluZzsgYXM6IHN0cmluZzt9W10pOiB2b2lkIHtcbiAgICAvLyBUaGUgaW1wb3J0cyBnZXQgaW5zZXJ0ZWQgYXQgdGhlIHZlcnkgdG9wIG9mIHRoZSBmaWxlLlxuICAgIGltcG9ydHMuZm9yRWFjaChpID0+IHsgb3V0cHV0LmFwcGVuZExlZnQoMCwgYGltcG9ydCAqIGFzICR7aS5hc30gZnJvbSAnJHtpLm5hbWV9JztcXG5gKTsgfSk7XG4gIH1cblxuICBhZGRDb25zdGFudHMob3V0cHV0OiBNYWdpY1N0cmluZywgY29uc3RhbnRzOiBzdHJpbmcsIGZpbGU6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBpZiAoY29uc3RhbnRzID09PSAnJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBpbnNlcnRpb25Qb2ludCA9IGZpbGUuc3RhdGVtZW50cy5yZWR1Y2UoKHByZXYsIHN0bXQpID0+IHtcbiAgICAgIGlmICh0cy5pc0ltcG9ydERlY2xhcmF0aW9uKHN0bXQpIHx8IHRzLmlzSW1wb3J0RXF1YWxzRGVjbGFyYXRpb24oc3RtdCkgfHxcbiAgICAgICAgICB0cy5pc05hbWVzcGFjZUltcG9ydChzdG10KSkge1xuICAgICAgICByZXR1cm4gc3RtdC5nZXRFbmQoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIDApO1xuICAgIG91dHB1dC5hcHBlbmRMZWZ0KGluc2VydGlvblBvaW50LCAnXFxuJyArIGNvbnN0YW50cyArICdcXG4nKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgdGhlIGRlZmluaXRpb25zIHRvIGVhY2ggZGVjb3JhdGVkIGNsYXNzXG4gICAqL1xuICBhZGREZWZpbml0aW9ucyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBhbmFseXplZENsYXNzOiBBbmFseXplZENsYXNzLCBkZWZpbml0aW9uczogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc3QgY2xhc3NTeW1ib2wgPSB0aGlzLmhvc3QuZ2V0Q2xhc3NTeW1ib2woYW5hbHl6ZWRDbGFzcy5kZWNsYXJhdGlvbik7XG4gICAgaWYgKCFjbGFzc1N5bWJvbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBbmFseXplZCBjbGFzcyBkb2VzIG5vdCBoYXZlIGEgdmFsaWQgc3ltYm9sOiAke2FuYWx5emVkQ2xhc3MubmFtZX1gKTtcbiAgICB9XG4gICAgY29uc3QgaW5zZXJ0aW9uUG9pbnQgPSBjbGFzc1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uICEuZ2V0RW5kKCk7XG4gICAgb3V0cHV0LmFwcGVuZExlZnQoaW5zZXJ0aW9uUG9pbnQsICdcXG4nICsgZGVmaW5pdGlvbnMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBzdGF0aWMgZGVjb3JhdG9yIHByb3BlcnRpZXMgZnJvbSBjbGFzc2VzXG4gICAqL1xuICByZW1vdmVEZWNvcmF0b3JzKG91dHB1dDogTWFnaWNTdHJpbmcsIGRlY29yYXRvcnNUb1JlbW92ZTogTWFwPHRzLk5vZGUsIHRzLk5vZGVbXT4pOiB2b2lkIHtcbiAgICBkZWNvcmF0b3JzVG9SZW1vdmUuZm9yRWFjaCgobm9kZXNUb1JlbW92ZSwgY29udGFpbmVyTm9kZSkgPT4ge1xuICAgICAgaWYgKHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihjb250YWluZXJOb2RlKSkge1xuICAgICAgICBjb25zdCBpdGVtcyA9IGNvbnRhaW5lck5vZGUuZWxlbWVudHM7XG4gICAgICAgIGlmIChpdGVtcy5sZW5ndGggPT09IG5vZGVzVG9SZW1vdmUubGVuZ3RoKSB7XG4gICAgICAgICAgLy8gcmVtb3ZlIGFueSB0cmFpbGluZyBzZW1pLWNvbG9uXG4gICAgICAgICAgY29uc3QgZW5kID0gKG91dHB1dC5zbGljZShjb250YWluZXJOb2RlLmdldEVuZCgpLCBjb250YWluZXJOb2RlLmdldEVuZCgpICsgMSkgPT09ICc7JykgP1xuICAgICAgICAgICAgICBjb250YWluZXJOb2RlLmdldEVuZCgpICsgMSA6XG4gICAgICAgICAgICAgIGNvbnRhaW5lck5vZGUuZ2V0RW5kKCk7XG4gICAgICAgICAgb3V0cHV0LnJlbW92ZShjb250YWluZXJOb2RlLnBhcmVudCAhLmdldEZ1bGxTdGFydCgpLCBlbmQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG5vZGVzVG9SZW1vdmUuZm9yRWFjaChub2RlID0+IHtcbiAgICAgICAgICAgIC8vIHJlbW92ZSBhbnkgdHJhaWxpbmcgY29tbWFcbiAgICAgICAgICAgIGNvbnN0IGVuZCA9IChvdXRwdXQuc2xpY2Uobm9kZS5nZXRFbmQoKSwgbm9kZS5nZXRFbmQoKSArIDEpID09PSAnLCcpID9cbiAgICAgICAgICAgICAgICBub2RlLmdldEVuZCgpICsgMSA6XG4gICAgICAgICAgICAgICAgbm9kZS5nZXRFbmQoKTtcbiAgICAgICAgICAgIG91dHB1dC5yZW1vdmUobm9kZS5nZXRGdWxsU3RhcnQoKSwgZW5kKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG4iXX0=