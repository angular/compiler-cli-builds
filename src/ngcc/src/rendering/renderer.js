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
    /**
     * A base-class for rendering an `AnalyzedClass`.
     * Package formats have output files that must be rendered differently,
     * Concrete sub-classes must implement the `addImports`, `addDefinitions` and
     * `removeDecorators` abstract methods.
     */
    var Renderer = /** @class */ (function () {
        function Renderer() {
        }
        /**
         * Render the source code and source-map for an Analyzed file.
         * @param file The analyzed file to render.
         * @param targetPath The absolute path where the rendered file will be written.
         */
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
            // QUESTION: do we need to remove contructor param metadata and property decorators?
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3JlbmRlcmluZy9yZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUNqQyw2Q0FBdUM7SUFDdkMsOENBQTZFO0lBRzdFLHVGQUEwRjtJQWtDMUY7Ozs7O09BS0c7SUFDSDtRQUFBO1FBb0RBLENBQUM7UUFuREM7Ozs7V0FJRztRQUNILDZCQUFVLEdBQVYsVUFBVyxJQUFrQixFQUFFLFVBQWtCO1lBQWpELGlCQTRCQztZQTNCQyxJQUFNLGFBQWEsR0FBRyxJQUFJLDBCQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFL0MsSUFBTSxNQUFNLEdBQUcsSUFBSSxzQkFBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDckQsSUFBTSxrQkFBa0IsR0FBRyxJQUFJLEdBQUcsRUFBc0IsQ0FBQztZQUV6RCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxVQUFBLEtBQUs7Z0JBQ2hDLElBQU0sa0JBQWtCLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsYUFBYSxDQUFDLENBQUM7Z0JBQ3BGLEtBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO2dCQUN2RCxLQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztZQUM3RCxDQUFDLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLGFBQWEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZ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bCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgTWFnaWNTdHJpbmcgZnJvbSAnbWFnaWMtc3RyaW5nJztcbmltcG9ydCB7RXhwcmVzc2lvbiwgV3JhcHBlZE5vZGVFeHByLCBXcml0ZVByb3BFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge0FuYWx5emVkQ2xhc3MsIEFuYWx5emVkRmlsZX0gZnJvbSAnLi4vYW5hbHl6ZXInO1xuaW1wb3J0IHsgRGVjb3JhdG9yIH0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvaG9zdCc7XG5pbXBvcnQge0ltcG9ydE1hbmFnZXIsIHRyYW5zbGF0ZVN0YXRlbWVudH0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvdHJhbnNmb3JtL3NyYy90cmFuc2xhdG9yJztcblxuLyoqXG4gKiBUaGUgcmVzdWx0cyBvZiByZW5kZXJpbmcgYW4gYW5hbHl6ZWQgZmlsZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZW5kZXJSZXN1bHQge1xuICAvKipcbiAgICogVGhlIGZpbGUgdGhhdCBoYXMgYmVlbiByZW5kZXJlZC5cbiAgICovXG4gIGZpbGU6IEFuYWx5emVkRmlsZTtcbiAgLyoqXG4gICAqIFRoZSByZW5kZXJlZCBzb3VyY2UgZmlsZS5cbiAgICovXG4gIHNvdXJjZTogRmlsZUluZm87XG4gIC8qKlxuICAgKiBUaGUgcmVuZGVyZWQgc291cmNlIG1hcCBmaWxlLlxuICAgKi9cbiAgbWFwOiBGaWxlSW5mbztcbn1cblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBhYm91dCBhIGZpbGUgdGhhdCBoYXMgYmVlbiByZW5kZXJlZC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBGaWxlSW5mbyB7XG4gIC8qKlxuICAgKiBQYXRoIHRvIHdoZXJlIHRoZSBmaWxlIHNob3VsZCBiZSB3cml0dGVuLlxuICAgKi9cbiAgcGF0aDogc3RyaW5nO1xuICAvKipcbiAgICogVGhlIGNvbnRlbnRzIG9mIHRoZSBmaWxlIHRvIGJlIGJlIHdyaXR0ZW4uXG4gICAqL1xuICBjb250ZW50czogc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgYmFzZS1jbGFzcyBmb3IgcmVuZGVyaW5nIGFuIGBBbmFseXplZENsYXNzYC5cbiAqIFBhY2thZ2UgZm9ybWF0cyBoYXZlIG91dHB1dCBmaWxlcyB0aGF0IG11c3QgYmUgcmVuZGVyZWQgZGlmZmVyZW50bHksXG4gKiBDb25jcmV0ZSBzdWItY2xhc3NlcyBtdXN0IGltcGxlbWVudCB0aGUgYGFkZEltcG9ydHNgLCBgYWRkRGVmaW5pdGlvbnNgIGFuZFxuICogYHJlbW92ZURlY29yYXRvcnNgIGFic3RyYWN0IG1ldGhvZHMuXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBSZW5kZXJlciB7XG4gIC8qKlxuICAgKiBSZW5kZXIgdGhlIHNvdXJjZSBjb2RlIGFuZCBzb3VyY2UtbWFwIGZvciBhbiBBbmFseXplZCBmaWxlLlxuICAgKiBAcGFyYW0gZmlsZSBUaGUgYW5hbHl6ZWQgZmlsZSB0byByZW5kZXIuXG4gICAqIEBwYXJhbSB0YXJnZXRQYXRoIFRoZSBhYnNvbHV0ZSBwYXRoIHdoZXJlIHRoZSByZW5kZXJlZCBmaWxlIHdpbGwgYmUgd3JpdHRlbi5cbiAgICovXG4gIHJlbmRlckZpbGUoZmlsZTogQW5hbHl6ZWRGaWxlLCB0YXJnZXRQYXRoOiBzdHJpbmcpOiBSZW5kZXJSZXN1bHQge1xuICAgIGNvbnN0IGltcG9ydE1hbmFnZXIgPSBuZXcgSW1wb3J0TWFuYWdlcihmYWxzZSk7XG5cbiAgICBjb25zdCBvdXRwdXQgPSBuZXcgTWFnaWNTdHJpbmcoZmlsZS5zb3VyY2VGaWxlLnRleHQpO1xuICAgIGNvbnN0IGRlY29yYXRvcnNUb1JlbW92ZSA9IG5ldyBNYXA8dHMuTm9kZSwgdHMuTm9kZVtdPigpO1xuXG4gICAgZmlsZS5hbmFseXplZENsYXNzZXMuZm9yRWFjaChjbGF6eiA9PiB7XG4gICAgICBjb25zdCByZW5kZXJlZERlZmluaXRpb24gPSByZW5kZXJEZWZpbml0aW9ucyhmaWxlLnNvdXJjZUZpbGUsIGNsYXp6LCBpbXBvcnRNYW5hZ2VyKTtcbiAgICAgIHRoaXMuYWRkRGVmaW5pdGlvbnMob3V0cHV0LCBjbGF6eiwgcmVuZGVyZWREZWZpbml0aW9uKTtcbiAgICAgIHRoaXMudHJhY2tEZWNvcmF0b3JzKGNsYXp6LmRlY29yYXRvcnMsIGRlY29yYXRvcnNUb1JlbW92ZSk7XG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZEltcG9ydHMob3V0cHV0LCBpbXBvcnRNYW5hZ2VyLmdldEFsbEltcG9ydHMoZmlsZS5zb3VyY2VGaWxlLmZpbGVOYW1lLCBudWxsKSk7XG4gICAgLy8gUVVFU1RJT046IGRvIHdlIG5lZWQgdG8gcmVtb3ZlIGNvbnRydWN0b3IgcGFyYW0gbWV0YWRhdGEgYW5kIHByb3BlcnR5IGRlY29yYXRvcnM/XG4gICAgdGhpcy5yZW1vdmVEZWNvcmF0b3JzKG91dHB1dCwgZGVjb3JhdG9yc1RvUmVtb3ZlKTtcblxuICAgIGNvbnN0IG1hcFBhdGggPSBgJHt0YXJnZXRQYXRofS5tYXBgO1xuICAgIGNvbnN0IG1hcCA9IG91dHB1dC5nZW5lcmF0ZU1hcCh7XG4gICAgICBzb3VyY2U6IGZpbGUuc291cmNlRmlsZS5maWxlTmFtZSxcbiAgICAgIGZpbGU6IG1hcFBhdGgsXG4gICAgICAvLyBpbmNsdWRlQ29udGVudDogdHJ1ZSAgLy8gVE9ETzogZG8gd2UgbmVlZCB0byBpbmNsdWRlIHRoZSBzb3VyY2U/XG4gICAgfSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgZmlsZSxcbiAgICAgIHNvdXJjZTogeyBwYXRoOiB0YXJnZXRQYXRoLCBjb250ZW50czogb3V0cHV0LnRvU3RyaW5nKCkgfSxcbiAgICAgIG1hcDogeyBwYXRoOiBtYXBQYXRoLCBjb250ZW50czogbWFwLnRvU3RyaW5nKCkgfVxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgYWJzdHJhY3QgYWRkSW1wb3J0cyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBpbXBvcnRzOiB7IG5hbWU6IHN0cmluZywgYXM6IHN0cmluZyB9W10pOiB2b2lkO1xuICBwcm90ZWN0ZWQgYWJzdHJhY3QgYWRkRGVmaW5pdGlvbnMob3V0cHV0OiBNYWdpY1N0cmluZywgYW5hbHl6ZWRDbGFzczogQW5hbHl6ZWRDbGFzcywgZGVmaW5pdGlvbnM6IHN0cmluZyk6IHZvaWQ7XG4gIHByb3RlY3RlZCBhYnN0cmFjdCByZW1vdmVEZWNvcmF0b3JzKG91dHB1dDogTWFnaWNTdHJpbmcsIGRlY29yYXRvcnNUb1JlbW92ZTogTWFwPHRzLk5vZGUsIHRzLk5vZGVbXT4pOiB2b2lkO1xuXG4gIC8vIEFkZCB0aGUgZGVjb3JhdG9yIG5vZGVzIHRoYXQgYXJlIHRvIGJlIHJlbW92ZWQgdG8gYSBtYXBcbiAgLy8gU28gdGhhdCB3ZSBjYW4gdGVsbCBpZiB3ZSBzaG91bGQgcmVtb3ZlIHRoZSBlbnRpcmUgZGVjb3JhdG9yIHByb3BlcnR5XG4gIHByb3RlY3RlZCB0cmFja0RlY29yYXRvcnMoZGVjb3JhdG9yczogRGVjb3JhdG9yW10sIGRlY29yYXRvcnNUb1JlbW92ZTogTWFwPHRzLk5vZGUsIHRzLk5vZGVbXT4pIHtcbiAgICBkZWNvcmF0b3JzLmZvckVhY2goZGVjID0+IHtcbiAgICAgIGNvbnN0IGRlY29yYXRvckFycmF5ID0gZGVjLm5vZGUucGFyZW50ITtcbiAgICAgIGlmICghZGVjb3JhdG9yc1RvUmVtb3ZlLmhhcyhkZWNvcmF0b3JBcnJheSkpIHtcbiAgICAgICAgZGVjb3JhdG9yc1RvUmVtb3ZlLnNldChkZWNvcmF0b3JBcnJheSwgW2RlYy5ub2RlXSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWNvcmF0b3JzVG9SZW1vdmUuZ2V0KGRlY29yYXRvckFycmF5KSEucHVzaChkZWMubm9kZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuXG4vKipcbiAqIFJlbmRlciB0aGUgZGVmaW5pdGlvbnMgYXMgc291cmNlIGNvZGUgZm9yIHRoZSBnaXZlbiBjbGFzcy5cbiAqIEBwYXJhbSBzb3VyY2VGaWxlIFRoZSBmaWxlIGNvbnRhaW5pbmcgdGhlIGNsYXNzIHRvIHByb2Nlc3MuXG4gKiBAcGFyYW0gY2xhenogVGhlIGNsYXNzIHdob3NlIGRlZmluaXRpb25zIGFyZSB0byBiZSByZW5kZXJlZC5cbiAqIEBwYXJhbSBjb21waWxhdGlvbiBUaGUgcmVzdWx0cyBvZiBhbmFseXppbmcgdGhlIGNsYXNzIC0gdGhpcyBpcyB1c2VkIHRvIGdlbmVyYXRlIHRoZSByZW5kZXJlZCBkZWZpbml0aW9ucy5cbiAqIEBwYXJhbSBpbXBvcnRzIEFuIG9iamVjdCB0aGF0IHRyYWNrcyB0aGUgaW1wb3J0cyB0aGF0IGFyZSBuZWVkZWQgYnkgdGhlIHJlbmRlcmVkIGRlZmluaXRpb25zLlxuICovXG5mdW5jdGlvbiByZW5kZXJEZWZpbml0aW9ucyhzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBhbmFseXplZENsYXNzOiBBbmFseXplZENsYXNzLCBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKTogc3RyaW5nIHtcbiAgY29uc3QgcHJpbnRlciA9IHRzLmNyZWF0ZVByaW50ZXIoKTtcbiAgY29uc3QgbmFtZSA9IChhbmFseXplZENsYXNzLmRlY2xhcmF0aW9uIGFzIHRzLk5hbWVkRGVjbGFyYXRpb24pLm5hbWUhO1xuICBjb25zdCBkZWZpbml0aW9ucyA9IGFuYWx5emVkQ2xhc3MuY29tcGlsYXRpb24ubWFwKGMgPT4gYy5zdGF0ZW1lbnRzXG4gICAgLm1hcChzdGF0ZW1lbnQgPT4gdHJhbnNsYXRlU3RhdGVtZW50KHN0YXRlbWVudCwgaW1wb3J0cykpXG4gICAgLmNvbmNhdCh0cmFuc2xhdGVTdGF0ZW1lbnQoY3JlYXRlQXNzaWdubWVudFN0YXRlbWVudChuYW1lLCBjLm5hbWUsIGMuaW5pdGlhbGl6ZXIpLCBpbXBvcnRzKSlcbiAgICAubWFwKHN0YXRlbWVudCA9PiBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgc3RhdGVtZW50LCBzb3VyY2VGaWxlKSlcbiAgICAuam9pbignXFxuJylcbiAgKS5qb2luKCdcXG4nKTtcbiAgcmV0dXJuIGRlZmluaXRpb25zO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhbiBBbmd1bGFyIEFTVCBzdGF0ZW1lbnQgbm9kZSB0aGF0IGNvbnRhaW5zIHRoZSBhc3NpZ25tZW50IG9mIHRoZVxuICogY29tcGlsZWQgZGVjb3JhdG9yIHRvIGJlIGFwcGxpZWQgdG8gdGhlIGNsYXNzLlxuICogQHBhcmFtIGFuYWx5emVkQ2xhc3MgVGhlIGluZm8gYWJvdXQgdGhlIGNsYXNzIHdob3NlIHN0YXRlbWVudCB3ZSB3YW50IHRvIGNyZWF0ZS5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlQXNzaWdubWVudFN0YXRlbWVudChyZWNlaXZlck5hbWU6IHRzLkRlY2xhcmF0aW9uTmFtZSwgcHJvcE5hbWU6IHN0cmluZywgaW5pdGlhbGl6ZXI6IEV4cHJlc3Npb24pIHtcbiAgY29uc3QgcmVjZWl2ZXIgPSBuZXcgV3JhcHBlZE5vZGVFeHByKHJlY2VpdmVyTmFtZSk7XG4gIHJldHVybiBuZXcgV3JpdGVQcm9wRXhwcihyZWNlaXZlciwgcHJvcE5hbWUsIGluaXRpYWxpemVyKS50b1N0bXQoKTtcbn1cbiJdfQ==