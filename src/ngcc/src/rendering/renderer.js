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
        Renderer.prototype.renderFile = function (file, targetPath) {
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
            var mapPath = targetPath + ".map";
            var map = output.generateMap({
                source: file.sourceFile.fileName,
                file: mapPath,
            });
            return {
                file: file,
                source: { path: targetPath, contents: output.toString() },
                map: { path: mapPath, contents: map.toString() }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3JlbmRlcmluZy9yZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUNqQyw2Q0FBdUM7SUFDdkMsOENBQTZFO0lBRzdFLHVGQUEwRjtJQWMxRjtRQUFBO1FBOENBLENBQUM7UUE3Q0MsNkJBQVUsR0FBVixVQUFXLElBQWtCLEVBQUUsVUFBa0I7WUFBakQsaUJBMkJDO1lBMUJDLElBQU0sYUFBYSxHQUFHLElBQUksMEJBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUUvQyxJQUFNLE1BQU0sR0FBRyxJQUFJLHNCQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNyRCxJQUFNLGtCQUFrQixHQUFHLElBQUksR0FBRyxFQUFzQixDQUFDO1lBRXpELElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLFVBQUEsS0FBSztnQkFDaEMsSUFBTSxrQkFBa0IsR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFDcEYsS0FBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixDQUFDLENBQUM7Z0JBQ3ZELEtBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1lBQzdELENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsYUFBYSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3JGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztZQUVsRCxJQUFNLE9BQU8sR0FBTSxVQUFVLFNBQU0sQ0FBQztZQUNwQyxJQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDO2dCQUM3QixNQUFNLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRO2dCQUNoQyxJQUFJLEVBQUUsT0FBTzthQUVkLENBQUMsQ0FBQztZQUVILE9BQU87Z0JBQ0wsSUFBSSxNQUFBO2dCQUNKLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRTtnQkFDekQsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFO2FBQ2pELENBQUM7UUFDSixDQUFDO1FBTUQsMERBQTBEO1FBQzFELHdFQUF3RTtRQUM5RCxrQ0FBZSxHQUF6QixVQUEwQixVQUF1QixFQUFFLGtCQUEyQztZQUM1RixVQUFVLENBQUMsT0FBTyxDQUFDLFVBQUEsR0FBRztnQkFDcEIsSUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFPLENBQUM7Z0JBQ3hDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEVBQUU7b0JBQzNDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztpQkFDcEQ7cUJBQU07b0JBQ0wsa0JBQWtCLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ3hEO1lBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBQ0gsZUFBQztJQUFELENBQUMsQUE5Q0QsSUE4Q0M7SUE5Q3FCLDRCQUFRO0lBaUQ5Qjs7Ozs7O09BTUc7SUFDSCwyQkFBMkIsVUFBeUIsRUFBRSxhQUE0QixFQUFFLE9BQXNCO1FBQ3hHLElBQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNuQyxJQUFNLElBQUksR0FBSSxhQUFhLENBQUMsV0FBbUMsQ0FBQyxJQUFLLENBQUM7UUFDdEUsSUFBTSxXQUFXLEdBQUcsYUFBYSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLENBQUMsVUFBVTthQUNoRSxHQUFHLENBQUMsVUFBQSxTQUFTLElBQUksT0FBQSwrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLEVBQXRDLENBQXNDLENBQUM7YUFDeEQsTUFBTSxDQUFDLCtCQUFrQixDQUFDLHlCQUF5QixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQzthQUMzRixHQUFHLENBQUMsVUFBQSxTQUFTLElBQUksT0FBQSxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUMsRUFBakUsQ0FBaUUsQ0FBQzthQUNuRixJQUFJLENBQUMsSUFBSSxDQUFDLEVBSjBDLENBSTFDLENBQ1osQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDYixPQUFPLFdBQVcsQ0FBQztJQUNyQixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILG1DQUFtQyxZQUFnQyxFQUFFLFFBQWdCLEVBQUUsV0FBdUI7UUFDNUcsSUFBTSxRQUFRLEdBQUcsSUFBSSwwQkFBZSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ25ELE9BQU8sSUFBSSx3QkFBYSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDckUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IE1hZ2ljU3RyaW5nIGZyb20gJ21hZ2ljLXN0cmluZyc7XG5pbXBvcnQge0V4cHJlc3Npb24sIFdyYXBwZWROb2RlRXhwciwgV3JpdGVQcm9wRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtBbmFseXplZENsYXNzLCBBbmFseXplZEZpbGV9IGZyb20gJy4uL2FuYWx5emVyJztcbmltcG9ydCB7IERlY29yYXRvciB9IGZyb20gJy4uLy4uLy4uL25ndHNjL2hvc3QnO1xuaW1wb3J0IHtJbXBvcnRNYW5hZ2VyLCB0cmFuc2xhdGVTdGF0ZW1lbnR9IGZyb20gJy4uLy4uLy4uL25ndHNjL3RyYW5zZm9ybS9zcmMvdHJhbnNsYXRvcic7XG5cblxuZXhwb3J0IGludGVyZmFjZSBSZW5kZXJSZXN1bHQge1xuICBmaWxlOiBBbmFseXplZEZpbGU7XG4gIHNvdXJjZTogRmlsZUluZm87XG4gIG1hcDogRmlsZUluZm87XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRmlsZUluZm8ge1xuICBwYXRoOiBzdHJpbmc7XG4gIGNvbnRlbnRzOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBSZW5kZXJlciB7XG4gIHJlbmRlckZpbGUoZmlsZTogQW5hbHl6ZWRGaWxlLCB0YXJnZXRQYXRoOiBzdHJpbmcpOiBSZW5kZXJSZXN1bHQge1xuICAgIGNvbnN0IGltcG9ydE1hbmFnZXIgPSBuZXcgSW1wb3J0TWFuYWdlcihmYWxzZSk7XG5cbiAgICBjb25zdCBvdXRwdXQgPSBuZXcgTWFnaWNTdHJpbmcoZmlsZS5zb3VyY2VGaWxlLnRleHQpO1xuICAgIGNvbnN0IGRlY29yYXRvcnNUb1JlbW92ZSA9IG5ldyBNYXA8dHMuTm9kZSwgdHMuTm9kZVtdPigpO1xuXG4gICAgZmlsZS5hbmFseXplZENsYXNzZXMuZm9yRWFjaChjbGF6eiA9PiB7XG4gICAgICBjb25zdCByZW5kZXJlZERlZmluaXRpb24gPSByZW5kZXJEZWZpbml0aW9ucyhmaWxlLnNvdXJjZUZpbGUsIGNsYXp6LCBpbXBvcnRNYW5hZ2VyKTtcbiAgICAgIHRoaXMuYWRkRGVmaW5pdGlvbnMob3V0cHV0LCBjbGF6eiwgcmVuZGVyZWREZWZpbml0aW9uKTtcbiAgICAgIHRoaXMudHJhY2tEZWNvcmF0b3JzKGNsYXp6LmRlY29yYXRvcnMsIGRlY29yYXRvcnNUb1JlbW92ZSk7XG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZEltcG9ydHMob3V0cHV0LCBpbXBvcnRNYW5hZ2VyLmdldEFsbEltcG9ydHMoZmlsZS5zb3VyY2VGaWxlLmZpbGVOYW1lLCBudWxsKSk7XG4gICAgdGhpcy5yZW1vdmVEZWNvcmF0b3JzKG91dHB1dCwgZGVjb3JhdG9yc1RvUmVtb3ZlKTtcblxuICAgIGNvbnN0IG1hcFBhdGggPSBgJHt0YXJnZXRQYXRofS5tYXBgO1xuICAgIGNvbnN0IG1hcCA9IG91dHB1dC5nZW5lcmF0ZU1hcCh7XG4gICAgICBzb3VyY2U6IGZpbGUuc291cmNlRmlsZS5maWxlTmFtZSxcbiAgICAgIGZpbGU6IG1hcFBhdGgsXG4gICAgICAvLyBpbmNsdWRlQ29udGVudDogdHJ1ZVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGZpbGUsXG4gICAgICBzb3VyY2U6IHsgcGF0aDogdGFyZ2V0UGF0aCwgY29udGVudHM6IG91dHB1dC50b1N0cmluZygpIH0sXG4gICAgICBtYXA6IHsgcGF0aDogbWFwUGF0aCwgY29udGVudHM6IG1hcC50b1N0cmluZygpIH1cbiAgICB9O1xuICB9XG5cbiAgYWJzdHJhY3QgYWRkSW1wb3J0cyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBpbXBvcnRzOiB7IG5hbWU6IHN0cmluZywgYXM6IHN0cmluZyB9W10pOiB2b2lkO1xuICBhYnN0cmFjdCBhZGREZWZpbml0aW9ucyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBhbmFseXplZENsYXNzOiBBbmFseXplZENsYXNzLCBkZWZpbml0aW9uczogc3RyaW5nKTogdm9pZDtcbiAgYWJzdHJhY3QgcmVtb3ZlRGVjb3JhdG9ycyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBkZWNvcmF0b3JzVG9SZW1vdmU6IE1hcDx0cy5Ob2RlLCB0cy5Ob2RlW10+KTogdm9pZDtcblxuICAvLyBBZGQgdGhlIGRlY29yYXRvciBub2RlcyB0aGF0IGFyZSB0byBiZSByZW1vdmVkIHRvIGEgbWFwXG4gIC8vIFNvIHRoYXQgd2UgY2FuIHRlbGwgaWYgd2Ugc2hvdWxkIHJlbW92ZSB0aGUgZW50aXJlIGRlY29yYXRvciBwcm9wZXJ0eVxuICBwcm90ZWN0ZWQgdHJhY2tEZWNvcmF0b3JzKGRlY29yYXRvcnM6IERlY29yYXRvcltdLCBkZWNvcmF0b3JzVG9SZW1vdmU6IE1hcDx0cy5Ob2RlLCB0cy5Ob2RlW10+KSB7XG4gICAgZGVjb3JhdG9ycy5mb3JFYWNoKGRlYyA9PiB7XG4gICAgICBjb25zdCBkZWNvcmF0b3JBcnJheSA9IGRlYy5ub2RlLnBhcmVudCE7XG4gICAgICBpZiAoIWRlY29yYXRvcnNUb1JlbW92ZS5oYXMoZGVjb3JhdG9yQXJyYXkpKSB7XG4gICAgICAgIGRlY29yYXRvcnNUb1JlbW92ZS5zZXQoZGVjb3JhdG9yQXJyYXksIFtkZWMubm9kZV0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVjb3JhdG9yc1RvUmVtb3ZlLmdldChkZWNvcmF0b3JBcnJheSkhLnB1c2goZGVjLm5vZGUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cblxuLyoqXG4gKiBSZW5kZXIgdGhlIGRlZmluaXRpb25zIGFzIHNvdXJjZSBjb2RlIGZvciB0aGUgZ2l2ZW4gY2xhc3MuXG4gKiBAcGFyYW0gc291cmNlRmlsZSBUaGUgZmlsZSBjb250YWluaW5nIHRoZSBjbGFzcyB0byBwcm9jZXNzLlxuICogQHBhcmFtIGNsYXp6IFRoZSBjbGFzcyB3aG9zZSBkZWZpbml0aW9ucyBhcmUgdG8gYmUgcmVuZGVyZWQuXG4gKiBAcGFyYW0gY29tcGlsYXRpb24gVGhlIHJlc3VsdHMgb2YgYW5hbHl6aW5nIHRoZSBjbGFzcyAtIHRoaXMgaXMgdXNlZCB0byBnZW5lcmF0ZSB0aGUgcmVuZGVyZWQgZGVmaW5pdGlvbnMuXG4gKiBAcGFyYW0gaW1wb3J0cyBBbiBvYmplY3QgdGhhdCB0cmFja3MgdGhlIGltcG9ydHMgdGhhdCBhcmUgbmVlZGVkIGJ5IHRoZSByZW5kZXJlZCBkZWZpbml0aW9ucy5cbiAqL1xuZnVuY3Rpb24gcmVuZGVyRGVmaW5pdGlvbnMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgYW5hbHl6ZWRDbGFzczogQW5hbHl6ZWRDbGFzcywgaW1wb3J0czogSW1wb3J0TWFuYWdlcik6IHN0cmluZyB7XG4gIGNvbnN0IHByaW50ZXIgPSB0cy5jcmVhdGVQcmludGVyKCk7XG4gIGNvbnN0IG5hbWUgPSAoYW5hbHl6ZWRDbGFzcy5kZWNsYXJhdGlvbiBhcyB0cy5OYW1lZERlY2xhcmF0aW9uKS5uYW1lITtcbiAgY29uc3QgZGVmaW5pdGlvbnMgPSBhbmFseXplZENsYXNzLmNvbXBpbGF0aW9uLm1hcChjID0+IGMuc3RhdGVtZW50c1xuICAgIC5tYXAoc3RhdGVtZW50ID0+IHRyYW5zbGF0ZVN0YXRlbWVudChzdGF0ZW1lbnQsIGltcG9ydHMpKVxuICAgIC5jb25jYXQodHJhbnNsYXRlU3RhdGVtZW50KGNyZWF0ZUFzc2lnbm1lbnRTdGF0ZW1lbnQobmFtZSwgYy5uYW1lLCBjLmluaXRpYWxpemVyKSwgaW1wb3J0cykpXG4gICAgLm1hcChzdGF0ZW1lbnQgPT4gcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIHN0YXRlbWVudCwgc291cmNlRmlsZSkpXG4gICAgLmpvaW4oJ1xcbicpXG4gICkuam9pbignXFxuJyk7XG4gIHJldHVybiBkZWZpbml0aW9ucztcbn1cblxuLyoqXG4gKiBDcmVhdGUgYW4gQW5ndWxhciBBU1Qgc3RhdGVtZW50IG5vZGUgdGhhdCBjb250YWlucyB0aGUgYXNzaWdubWVudCBvZiB0aGVcbiAqIGNvbXBpbGVkIGRlY29yYXRvciB0byBiZSBhcHBsaWVkIHRvIHRoZSBjbGFzcy5cbiAqIEBwYXJhbSBhbmFseXplZENsYXNzIFRoZSBpbmZvIGFib3V0IHRoZSBjbGFzcyB3aG9zZSBzdGF0ZW1lbnQgd2Ugd2FudCB0byBjcmVhdGUuXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUFzc2lnbm1lbnRTdGF0ZW1lbnQocmVjZWl2ZXJOYW1lOiB0cy5EZWNsYXJhdGlvbk5hbWUsIHByb3BOYW1lOiBzdHJpbmcsIGluaXRpYWxpemVyOiBFeHByZXNzaW9uKSB7XG4gIGNvbnN0IHJlY2VpdmVyID0gbmV3IFdyYXBwZWROb2RlRXhwcihyZWNlaXZlck5hbWUpO1xuICByZXR1cm4gbmV3IFdyaXRlUHJvcEV4cHIocmVjZWl2ZXIsIHByb3BOYW1lLCBpbml0aWFsaXplcikudG9TdG10KCk7XG59XG4iXX0=