(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("angular/packages/compiler-cli/src/ngcc/src/rendering/renderer", ["require", "exports", "typescript", "magic-string", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/transform/src/translator"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var magic_string_1 = require("magic-string");
    var compiler_1 = require("@angular/compiler");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/translator");
    var Renderer = /** @class */ (function () {
        function Renderer() {
        }
        Renderer.prototype.renderFile = function (file) {
            var _this = this;
            var importManager = new translator_1.ImportManager(false);
            var output = new magic_string_1.default(file.sourceFile.text);
            var decoratorsToRemove = new Map();
            file.analyzedClasses.forEach(function (clazz) {
                var renderedDefinition = renderDefinitions(file.sourceFile, clazz, importManager);
                _this.addDefinitions(output, clazz, renderedDefinition);
                _this.trackDecorators(clazz.decorators, decoratorsToRemove);
            });
            this.addImports(output, importManager.getAllImports(file.sourceFile.fileName, null));
            this.removeDecorators(output, decoratorsToRemove);
            var map = output.generateMap({
                source: file.sourceFile.fileName,
                file: file.sourceFile.fileName + ".map",
                includeContent: true
            });
            return {
                file: file,
                content: output.toString(),
                map: map.toString()
            };
        };
        // Add the decorator nodes that are to be removed to a map
        // So that we can tell if we should remove the entire decorator property
        Renderer.prototype.trackDecorators = function (decorators, decoratorsToRemove) {
            decorators.forEach(function (dec) {
                var decoratorArray = dec.node.parent;
                if (!decoratorsToRemove.has(decoratorArray)) {
                    decoratorsToRemove.set(decoratorArray, [dec.node]);
                }
                else {
                    decoratorsToRemove.get(decoratorArray).push(dec.node);
                }
            });
        };
        return Renderer;
    }());
    exports.Renderer = Renderer;
    /**
     * Render the definitions as source code for the given class.
     * @param sourceFile The file containing the class to process.
     * @param clazz The class whose definitions are to be rendered.
     * @param compilation The results of analyzing the class - this is used to generate the rendered definitions.
     * @param imports An object that tracks the imports that are needed by the rendered definitions.
     */
    function renderDefinitions(sourceFile, analyzedClass, imports) {
        var printer = ts.createPrinter();
        var name = analyzedClass.declaration.name;
        var definitions = analyzedClass.compilation.map(function (c) { return c.statements
            .map(function (statement) { return translator_1.translateStatement(statement, imports); })
            .concat(translator_1.translateStatement(createAssignmentStatement(name, c.name, c.initializer), imports))
            .map(function (statement) { return printer.printNode(ts.EmitHint.Unspecified, statement, sourceFile); })
            .join('\n'); }).join('\n');
        return definitions;
    }
    /**
     * Create an Angular AST statement node that contains the assignment of the
     * compiled decorator to be applied to the class.
     * @param analyzedClass The info about the class whose statement we want to create.
     */
    function createAssignmentStatement(receiverName, propName, initializer) {
        var receiver = new compiler_1.WrappedNodeExpr(receiverName);
        return new compiler_1.WritePropExpr(receiver, propName, initializer).toStmt();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3JlbmRlcmluZy9yZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUNqQyw2Q0FBdUM7SUFDdkMsOENBQTZFO0lBRzdFLHVGQUEwRjtJQVExRjtRQUFBO1FBNkNBLENBQUM7UUE1Q0MsNkJBQVUsR0FBVixVQUFXLElBQWtCO1lBQTdCLGlCQTBCQztZQXpCQyxJQUFNLGFBQWEsR0FBRyxJQUFJLDBCQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFL0MsSUFBTSxNQUFNLEdBQUcsSUFBSSxzQkFBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDckQsSUFBTSxrQkFBa0IsR0FBRyxJQUFJLEdBQUcsRUFBc0IsQ0FBQztZQUV6RCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxVQUFBLEtBQUs7Z0JBQ2hDLElBQU0sa0JBQWtCLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsYUFBYSxDQUFDLENBQUM7Z0JBQ3BGLEtBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO2dCQUN2RCxLQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztZQUM3RCxDQUFDLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLGFBQWEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNyRixJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLGtCQUFrQixDQUFDLENBQUM7WUFFbEQsSUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQztnQkFDN0IsTUFBTSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUTtnQkFDaEMsSUFBSSxFQUFLLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxTQUFNO2dCQUN2QyxjQUFjLEVBQUUsSUFBSTthQUNyQixDQUFDLENBQUM7WUFFSCxPQUFPO2dCQUNMLElBQUksTUFBQTtnQkFDSixPQUFPLEVBQUUsTUFBTSxDQUFDLFFBQVEsRUFBRTtnQkFDMUIsR0FBRyxFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUU7YUFDcEIsQ0FBQztRQUNKLENBQUM7UUFNRCwwREFBMEQ7UUFDMUQsd0VBQXdFO1FBQzlELGtDQUFlLEdBQXpCLFVBQTBCLFVBQXVCLEVBQUUsa0JBQTJDO1lBQzVGLFVBQVUsQ0FBQyxPQUFPLENBQUMsVUFBQSxHQUFHO2dCQUNwQixJQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU8sQ0FBQztnQkFDeEMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBRTtvQkFDM0Msa0JBQWtCLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2lCQUNwRDtxQkFBTTtvQkFDTCxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDeEQ7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFDSCxlQUFDO0lBQUQsQ0FBQyxBQTdDRCxJQTZDQztJQTdDcUIsNEJBQVE7SUFnRDlCOzs7Ozs7T0FNRztJQUNILDJCQUEyQixVQUF5QixFQUFFLGFBQTRCLEVBQUUsT0FBc0I7UUFDeEcsSUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ25DLElBQU0sSUFBSSxHQUFJLGFBQWEsQ0FBQyxXQUFtQyxDQUFDLElBQUssQ0FBQztRQUN0RSxJQUFNLFdBQVcsR0FBRyxhQUFhLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsQ0FBQyxVQUFVO2FBQ2hFLEdBQUcsQ0FBQyxVQUFBLFNBQVMsSUFBSSxPQUFBLCtCQUFrQixDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsRUFBdEMsQ0FBc0MsQ0FBQzthQUN4RCxNQUFNLENBQUMsK0JBQWtCLENBQUMseUJBQXlCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2FBQzNGLEdBQUcsQ0FBQyxVQUFBLFNBQVMsSUFBSSxPQUFBLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxFQUFqRSxDQUFpRSxDQUFDO2FBQ25GLElBQUksQ0FBQyxJQUFJLENBQUMsRUFKMEMsQ0FJMUMsQ0FDWixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNiLE9BQU8sV0FBVyxDQUFDO0lBQ3JCLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsbUNBQW1DLFlBQWdDLEVBQUUsUUFBZ0IsRUFBRSxXQUF1QjtRQUM1RyxJQUFNLFFBQVEsR0FBRyxJQUFJLDBCQUFlLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDbkQsT0FBTyxJQUFJLHdCQUFhLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNyRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgTWFnaWNTdHJpbmcgZnJvbSAnbWFnaWMtc3RyaW5nJztcbmltcG9ydCB7RXhwcmVzc2lvbiwgV3JhcHBlZE5vZGVFeHByLCBXcml0ZVByb3BFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge0FuYWx5emVkQ2xhc3MsIEFuYWx5emVkRmlsZX0gZnJvbSAnLi4vYW5hbHl6ZXInO1xuaW1wb3J0IHsgRGVjb3JhdG9yIH0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvaG9zdCc7XG5pbXBvcnQge0ltcG9ydE1hbmFnZXIsIHRyYW5zbGF0ZVN0YXRlbWVudH0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvdHJhbnNmb3JtL3NyYy90cmFuc2xhdG9yJztcblxuZXhwb3J0IGludGVyZmFjZSBSZW5kZXJlZEZpbGUge1xuICBmaWxlOiBBbmFseXplZEZpbGU7XG4gIGNvbnRlbnQ6IHN0cmluZztcbiAgbWFwOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBSZW5kZXJlciB7XG4gIHJlbmRlckZpbGUoZmlsZTogQW5hbHl6ZWRGaWxlKTogUmVuZGVyZWRGaWxlIHtcbiAgICBjb25zdCBpbXBvcnRNYW5hZ2VyID0gbmV3IEltcG9ydE1hbmFnZXIoZmFsc2UpO1xuXG4gICAgY29uc3Qgb3V0cHV0ID0gbmV3IE1hZ2ljU3RyaW5nKGZpbGUuc291cmNlRmlsZS50ZXh0KTtcbiAgICBjb25zdCBkZWNvcmF0b3JzVG9SZW1vdmUgPSBuZXcgTWFwPHRzLk5vZGUsIHRzLk5vZGVbXT4oKTtcblxuICAgIGZpbGUuYW5hbHl6ZWRDbGFzc2VzLmZvckVhY2goY2xhenogPT4ge1xuICAgICAgY29uc3QgcmVuZGVyZWREZWZpbml0aW9uID0gcmVuZGVyRGVmaW5pdGlvbnMoZmlsZS5zb3VyY2VGaWxlLCBjbGF6eiwgaW1wb3J0TWFuYWdlcik7XG4gICAgICB0aGlzLmFkZERlZmluaXRpb25zKG91dHB1dCwgY2xhenosIHJlbmRlcmVkRGVmaW5pdGlvbik7XG4gICAgICB0aGlzLnRyYWNrRGVjb3JhdG9ycyhjbGF6ei5kZWNvcmF0b3JzLCBkZWNvcmF0b3JzVG9SZW1vdmUpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRJbXBvcnRzKG91dHB1dCwgaW1wb3J0TWFuYWdlci5nZXRBbGxJbXBvcnRzKGZpbGUuc291cmNlRmlsZS5maWxlTmFtZSwgbnVsbCkpO1xuICAgIHRoaXMucmVtb3ZlRGVjb3JhdG9ycyhvdXRwdXQsIGRlY29yYXRvcnNUb1JlbW92ZSk7XG5cbiAgICBjb25zdCBtYXAgPSBvdXRwdXQuZ2VuZXJhdGVNYXAoe1xuICAgICAgc291cmNlOiBmaWxlLnNvdXJjZUZpbGUuZmlsZU5hbWUsXG4gICAgICBmaWxlOiBgJHtmaWxlLnNvdXJjZUZpbGUuZmlsZU5hbWV9Lm1hcGAsXG4gICAgICBpbmNsdWRlQ29udGVudDogdHJ1ZVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGZpbGUsXG4gICAgICBjb250ZW50OiBvdXRwdXQudG9TdHJpbmcoKSxcbiAgICAgIG1hcDogbWFwLnRvU3RyaW5nKClcbiAgICB9O1xuICB9XG5cbiAgYWJzdHJhY3QgYWRkSW1wb3J0cyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBpbXBvcnRzOiB7IG5hbWU6IHN0cmluZywgYXM6IHN0cmluZyB9W10pOiB2b2lkO1xuICBhYnN0cmFjdCBhZGREZWZpbml0aW9ucyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBhbmFseXplZENsYXNzOiBBbmFseXplZENsYXNzLCBkZWZpbml0aW9uczogc3RyaW5nKTogdm9pZDtcbiAgYWJzdHJhY3QgcmVtb3ZlRGVjb3JhdG9ycyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBkZWNvcmF0b3JzVG9SZW1vdmU6IE1hcDx0cy5Ob2RlLCB0cy5Ob2RlW10+KTogdm9pZDtcblxuICAvLyBBZGQgdGhlIGRlY29yYXRvciBub2RlcyB0aGF0IGFyZSB0byBiZSByZW1vdmVkIHRvIGEgbWFwXG4gIC8vIFNvIHRoYXQgd2UgY2FuIHRlbGwgaWYgd2Ugc2hvdWxkIHJlbW92ZSB0aGUgZW50aXJlIGRlY29yYXRvciBwcm9wZXJ0eVxuICBwcm90ZWN0ZWQgdHJhY2tEZWNvcmF0b3JzKGRlY29yYXRvcnM6IERlY29yYXRvcltdLCBkZWNvcmF0b3JzVG9SZW1vdmU6IE1hcDx0cy5Ob2RlLCB0cy5Ob2RlW10+KSB7XG4gICAgZGVjb3JhdG9ycy5mb3JFYWNoKGRlYyA9PiB7XG4gICAgICBjb25zdCBkZWNvcmF0b3JBcnJheSA9IGRlYy5ub2RlLnBhcmVudCE7XG4gICAgICBpZiAoIWRlY29yYXRvcnNUb1JlbW92ZS5oYXMoZGVjb3JhdG9yQXJyYXkpKSB7XG4gICAgICAgIGRlY29yYXRvcnNUb1JlbW92ZS5zZXQoZGVjb3JhdG9yQXJyYXksIFtkZWMubm9kZV0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVjb3JhdG9yc1RvUmVtb3ZlLmdldChkZWNvcmF0b3JBcnJheSkhLnB1c2goZGVjLm5vZGUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cblxuLyoqXG4gKiBSZW5kZXIgdGhlIGRlZmluaXRpb25zIGFzIHNvdXJjZSBjb2RlIGZvciB0aGUgZ2l2ZW4gY2xhc3MuXG4gKiBAcGFyYW0gc291cmNlRmlsZSBUaGUgZmlsZSBjb250YWluaW5nIHRoZSBjbGFzcyB0byBwcm9jZXNzLlxuICogQHBhcmFtIGNsYXp6IFRoZSBjbGFzcyB3aG9zZSBkZWZpbml0aW9ucyBhcmUgdG8gYmUgcmVuZGVyZWQuXG4gKiBAcGFyYW0gY29tcGlsYXRpb24gVGhlIHJlc3VsdHMgb2YgYW5hbHl6aW5nIHRoZSBjbGFzcyAtIHRoaXMgaXMgdXNlZCB0byBnZW5lcmF0ZSB0aGUgcmVuZGVyZWQgZGVmaW5pdGlvbnMuXG4gKiBAcGFyYW0gaW1wb3J0cyBBbiBvYmplY3QgdGhhdCB0cmFja3MgdGhlIGltcG9ydHMgdGhhdCBhcmUgbmVlZGVkIGJ5IHRoZSByZW5kZXJlZCBkZWZpbml0aW9ucy5cbiAqL1xuZnVuY3Rpb24gcmVuZGVyRGVmaW5pdGlvbnMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgYW5hbHl6ZWRDbGFzczogQW5hbHl6ZWRDbGFzcywgaW1wb3J0czogSW1wb3J0TWFuYWdlcik6IHN0cmluZyB7XG4gIGNvbnN0IHByaW50ZXIgPSB0cy5jcmVhdGVQcmludGVyKCk7XG4gIGNvbnN0IG5hbWUgPSAoYW5hbHl6ZWRDbGFzcy5kZWNsYXJhdGlvbiBhcyB0cy5OYW1lZERlY2xhcmF0aW9uKS5uYW1lITtcbiAgY29uc3QgZGVmaW5pdGlvbnMgPSBhbmFseXplZENsYXNzLmNvbXBpbGF0aW9uLm1hcChjID0+IGMuc3RhdGVtZW50c1xuICAgIC5tYXAoc3RhdGVtZW50ID0+IHRyYW5zbGF0ZVN0YXRlbWVudChzdGF0ZW1lbnQsIGltcG9ydHMpKVxuICAgIC5jb25jYXQodHJhbnNsYXRlU3RhdGVtZW50KGNyZWF0ZUFzc2lnbm1lbnRTdGF0ZW1lbnQobmFtZSwgYy5uYW1lLCBjLmluaXRpYWxpemVyKSwgaW1wb3J0cykpXG4gICAgLm1hcChzdGF0ZW1lbnQgPT4gcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIHN0YXRlbWVudCwgc291cmNlRmlsZSkpXG4gICAgLmpvaW4oJ1xcbicpXG4gICkuam9pbignXFxuJyk7XG4gIHJldHVybiBkZWZpbml0aW9ucztcbn1cblxuLyoqXG4gKiBDcmVhdGUgYW4gQW5ndWxhciBBU1Qgc3RhdGVtZW50IG5vZGUgdGhhdCBjb250YWlucyB0aGUgYXNzaWdubWVudCBvZiB0aGVcbiAqIGNvbXBpbGVkIGRlY29yYXRvciB0byBiZSBhcHBsaWVkIHRvIHRoZSBjbGFzcy5cbiAqIEBwYXJhbSBhbmFseXplZENsYXNzIFRoZSBpbmZvIGFib3V0IHRoZSBjbGFzcyB3aG9zZSBzdGF0ZW1lbnQgd2Ugd2FudCB0byBjcmVhdGUuXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUFzc2lnbm1lbnRTdGF0ZW1lbnQocmVjZWl2ZXJOYW1lOiB0cy5EZWNsYXJhdGlvbk5hbWUsIHByb3BOYW1lOiBzdHJpbmcsIGluaXRpYWxpemVyOiBFeHByZXNzaW9uKSB7XG4gIGNvbnN0IHJlY2VpdmVyID0gbmV3IFdyYXBwZWROb2RlRXhwcihyZWNlaXZlck5hbWUpO1xuICByZXR1cm4gbmV3IFdyaXRlUHJvcEV4cHIocmVjZWl2ZXIsIHByb3BOYW1lLCBpbml0aWFsaXplcikudG9TdG10KCk7XG59XG4iXX0=