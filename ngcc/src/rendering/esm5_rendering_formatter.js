(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/rendering/esm5_rendering_formatter", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/ngcc/src/host/esm2015_host", "@angular/compiler-cli/ngcc/src/rendering/esm_rendering_formatter"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Esm5RenderingFormatter = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/translator");
    var esm2015_host_1 = require("@angular/compiler-cli/ngcc/src/host/esm2015_host");
    var esm_rendering_formatter_1 = require("@angular/compiler-cli/ngcc/src/rendering/esm_rendering_formatter");
    /**
     * A RenderingFormatter that works with files that use ECMAScript Module `import` and `export`
     * statements, but instead of `class` declarations it uses ES5 `function` wrappers for classes.
     */
    var Esm5RenderingFormatter = /** @class */ (function (_super) {
        (0, tslib_1.__extends)(Esm5RenderingFormatter, _super);
        function Esm5RenderingFormatter() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /**
         * Add the definitions, directly before the return statement, inside the IIFE of each decorated
         * class.
         */
        Esm5RenderingFormatter.prototype.addDefinitions = function (output, compiledClass, definitions) {
            var classSymbol = this.host.getClassSymbol(compiledClass.declaration);
            if (!classSymbol) {
                throw new Error("Compiled class \"" + compiledClass.name + "\" in \"" + compiledClass.declaration.getSourceFile()
                    .fileName + "\" does not have a valid syntax.\n" +
                    "Expected an ES5 IIFE wrapped function. But got:\n" +
                    compiledClass.declaration.getText());
            }
            var declarationStatement = (0, esm2015_host_1.getContainingStatement)(classSymbol.implementation.valueDeclaration);
            var iifeBody = declarationStatement.parent;
            if (!iifeBody || !ts.isBlock(iifeBody)) {
                throw new Error("Compiled class declaration is not inside an IIFE: " + compiledClass.name + " in " + compiledClass.declaration.getSourceFile().fileName);
            }
            var returnStatement = iifeBody.statements.find(ts.isReturnStatement);
            if (!returnStatement) {
                throw new Error("Compiled class wrapper IIFE does not have a return statement: " + compiledClass.name + " in " + compiledClass.declaration.getSourceFile().fileName);
            }
            var insertionPoint = returnStatement.getFullStart();
            output.appendLeft(insertionPoint, '\n' + definitions);
        };
        /**
         * Convert a `Statement` to JavaScript code in a format suitable for rendering by this formatter.
         *
         * @param stmt The `Statement` to print.
         * @param sourceFile A `ts.SourceFile` that provides context for the statement. See
         *     `ts.Printer#printNode()` for more info.
         * @param importManager The `ImportManager` to use for managing imports.
         *
         * @return The JavaScript code corresponding to `stmt` (in the appropriate format).
         */
        Esm5RenderingFormatter.prototype.printStatement = function (stmt, sourceFile, importManager) {
            var node = (0, translator_1.translateStatement)(stmt, importManager, { downlevelTaggedTemplates: true, downlevelVariableDeclarations: true });
            var code = this.printer.printNode(ts.EmitHint.Unspecified, node, sourceFile);
            return code;
        };
        return Esm5RenderingFormatter;
    }(esm_rendering_formatter_1.EsmRenderingFormatter));
    exports.Esm5RenderingFormatter = Esm5RenderingFormatter;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtNV9yZW5kZXJpbmdfZm9ybWF0dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3JlbmRlcmluZy9lc201X3JlbmRlcmluZ19mb3JtYXR0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQVNBLCtCQUFpQztJQUVqQyx5RUFBZ0Y7SUFFaEYsaUZBQTREO0lBRTVELDRHQUFnRTtJQUVoRTs7O09BR0c7SUFDSDtRQUE0Qyx1REFBcUI7UUFBakU7O1FBcURBLENBQUM7UUFwREM7OztXQUdHO1FBQ00sK0NBQWMsR0FBdkIsVUFBd0IsTUFBbUIsRUFBRSxhQUE0QixFQUFFLFdBQW1CO1lBRTVGLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUN4RSxJQUFJLENBQUMsV0FBVyxFQUFFO2dCQUNoQixNQUFNLElBQUksS0FBSyxDQUNYLHNCQUFtQixhQUFhLENBQUMsSUFBSSxnQkFDakMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxhQUFhLEVBQUU7cUJBQ3BDLFFBQVEsdUNBQW1DO29CQUNwRCxtREFBbUQ7b0JBQ25ELGFBQWEsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQzthQUMxQztZQUNELElBQU0sb0JBQW9CLEdBQ3RCLElBQUEscUNBQXNCLEVBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBRXhFLElBQU0sUUFBUSxHQUFHLG9CQUFvQixDQUFDLE1BQU0sQ0FBQztZQUM3QyxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDdEMsTUFBTSxJQUFJLEtBQUssQ0FBQyx1REFBcUQsYUFBYSxDQUFDLElBQUksWUFDbkYsYUFBYSxDQUFDLFdBQVcsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxRQUFVLENBQUMsQ0FBQzthQUMzRDtZQUVELElBQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQ3ZFLElBQUksQ0FBQyxlQUFlLEVBQUU7Z0JBQ3BCLE1BQU0sSUFBSSxLQUFLLENBQUMsbUVBQ1osYUFBYSxDQUFDLElBQUksWUFBTyxhQUFhLENBQUMsV0FBVyxDQUFDLGFBQWEsRUFBRSxDQUFDLFFBQVUsQ0FBQyxDQUFDO2FBQ3BGO1lBRUQsSUFBTSxjQUFjLEdBQUcsZUFBZSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3RELE1BQU0sQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFLElBQUksR0FBRyxXQUFXLENBQUMsQ0FBQztRQUN4RCxDQUFDO1FBRUQ7Ozs7Ozs7OztXQVNHO1FBQ00sK0NBQWMsR0FBdkIsVUFBd0IsSUFBZSxFQUFFLFVBQXlCLEVBQUUsYUFBNEI7WUFFOUYsSUFBTSxJQUFJLEdBQUcsSUFBQSwrQkFBa0IsRUFDM0IsSUFBSSxFQUFFLGFBQWEsRUFBRSxFQUFDLHdCQUF3QixFQUFFLElBQUksRUFBRSw2QkFBNkIsRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1lBQ2hHLElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztZQUUvRSxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFDSCw2QkFBQztJQUFELENBQUMsQUFyREQsQ0FBNEMsK0NBQXFCLEdBcURoRTtJQXJEWSx3REFBc0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7U3RhdGVtZW50fSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgTWFnaWNTdHJpbmcgZnJvbSAnbWFnaWMtc3RyaW5nJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0ltcG9ydE1hbmFnZXIsIHRyYW5zbGF0ZVN0YXRlbWVudH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3RyYW5zbGF0b3InO1xuaW1wb3J0IHtDb21waWxlZENsYXNzfSBmcm9tICcuLi9hbmFseXNpcy90eXBlcyc7XG5pbXBvcnQge2dldENvbnRhaW5pbmdTdGF0ZW1lbnR9IGZyb20gJy4uL2hvc3QvZXNtMjAxNV9ob3N0JztcblxuaW1wb3J0IHtFc21SZW5kZXJpbmdGb3JtYXR0ZXJ9IGZyb20gJy4vZXNtX3JlbmRlcmluZ19mb3JtYXR0ZXInO1xuXG4vKipcbiAqIEEgUmVuZGVyaW5nRm9ybWF0dGVyIHRoYXQgd29ya3Mgd2l0aCBmaWxlcyB0aGF0IHVzZSBFQ01BU2NyaXB0IE1vZHVsZSBgaW1wb3J0YCBhbmQgYGV4cG9ydGBcbiAqIHN0YXRlbWVudHMsIGJ1dCBpbnN0ZWFkIG9mIGBjbGFzc2AgZGVjbGFyYXRpb25zIGl0IHVzZXMgRVM1IGBmdW5jdGlvbmAgd3JhcHBlcnMgZm9yIGNsYXNzZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBFc201UmVuZGVyaW5nRm9ybWF0dGVyIGV4dGVuZHMgRXNtUmVuZGVyaW5nRm9ybWF0dGVyIHtcbiAgLyoqXG4gICAqIEFkZCB0aGUgZGVmaW5pdGlvbnMsIGRpcmVjdGx5IGJlZm9yZSB0aGUgcmV0dXJuIHN0YXRlbWVudCwgaW5zaWRlIHRoZSBJSUZFIG9mIGVhY2ggZGVjb3JhdGVkXG4gICAqIGNsYXNzLlxuICAgKi9cbiAgb3ZlcnJpZGUgYWRkRGVmaW5pdGlvbnMob3V0cHV0OiBNYWdpY1N0cmluZywgY29tcGlsZWRDbGFzczogQ29tcGlsZWRDbGFzcywgZGVmaW5pdGlvbnM6IHN0cmluZyk6XG4gICAgICB2b2lkIHtcbiAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMuaG9zdC5nZXRDbGFzc1N5bWJvbChjb21waWxlZENsYXNzLmRlY2xhcmF0aW9uKTtcbiAgICBpZiAoIWNsYXNzU3ltYm9sKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYENvbXBpbGVkIGNsYXNzIFwiJHtjb21waWxlZENsYXNzLm5hbWV9XCIgaW4gXCIke1xuICAgICAgICAgICAgICBjb21waWxlZENsYXNzLmRlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKVxuICAgICAgICAgICAgICAgICAgLmZpbGVOYW1lfVwiIGRvZXMgbm90IGhhdmUgYSB2YWxpZCBzeW50YXguXFxuYCArXG4gICAgICAgICAgYEV4cGVjdGVkIGFuIEVTNSBJSUZFIHdyYXBwZWQgZnVuY3Rpb24uIEJ1dCBnb3Q6XFxuYCArXG4gICAgICAgICAgY29tcGlsZWRDbGFzcy5kZWNsYXJhdGlvbi5nZXRUZXh0KCkpO1xuICAgIH1cbiAgICBjb25zdCBkZWNsYXJhdGlvblN0YXRlbWVudCA9XG4gICAgICAgIGdldENvbnRhaW5pbmdTdGF0ZW1lbnQoY2xhc3NTeW1ib2wuaW1wbGVtZW50YXRpb24udmFsdWVEZWNsYXJhdGlvbik7XG5cbiAgICBjb25zdCBpaWZlQm9keSA9IGRlY2xhcmF0aW9uU3RhdGVtZW50LnBhcmVudDtcbiAgICBpZiAoIWlpZmVCb2R5IHx8ICF0cy5pc0Jsb2NrKGlpZmVCb2R5KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb21waWxlZCBjbGFzcyBkZWNsYXJhdGlvbiBpcyBub3QgaW5zaWRlIGFuIElJRkU6ICR7Y29tcGlsZWRDbGFzcy5uYW1lfSBpbiAke1xuICAgICAgICAgIGNvbXBpbGVkQ2xhc3MuZGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lfWApO1xuICAgIH1cblxuICAgIGNvbnN0IHJldHVyblN0YXRlbWVudCA9IGlpZmVCb2R5LnN0YXRlbWVudHMuZmluZCh0cy5pc1JldHVyblN0YXRlbWVudCk7XG4gICAgaWYgKCFyZXR1cm5TdGF0ZW1lbnQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ29tcGlsZWQgY2xhc3Mgd3JhcHBlciBJSUZFIGRvZXMgbm90IGhhdmUgYSByZXR1cm4gc3RhdGVtZW50OiAke1xuICAgICAgICAgIGNvbXBpbGVkQ2xhc3MubmFtZX0gaW4gJHtjb21waWxlZENsYXNzLmRlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZX1gKTtcbiAgICB9XG5cbiAgICBjb25zdCBpbnNlcnRpb25Qb2ludCA9IHJldHVyblN0YXRlbWVudC5nZXRGdWxsU3RhcnQoKTtcbiAgICBvdXRwdXQuYXBwZW5kTGVmdChpbnNlcnRpb25Qb2ludCwgJ1xcbicgKyBkZWZpbml0aW9ucyk7XG4gIH1cblxuICAvKipcbiAgICogQ29udmVydCBhIGBTdGF0ZW1lbnRgIHRvIEphdmFTY3JpcHQgY29kZSBpbiBhIGZvcm1hdCBzdWl0YWJsZSBmb3IgcmVuZGVyaW5nIGJ5IHRoaXMgZm9ybWF0dGVyLlxuICAgKlxuICAgKiBAcGFyYW0gc3RtdCBUaGUgYFN0YXRlbWVudGAgdG8gcHJpbnQuXG4gICAqIEBwYXJhbSBzb3VyY2VGaWxlIEEgYHRzLlNvdXJjZUZpbGVgIHRoYXQgcHJvdmlkZXMgY29udGV4dCBmb3IgdGhlIHN0YXRlbWVudC4gU2VlXG4gICAqICAgICBgdHMuUHJpbnRlciNwcmludE5vZGUoKWAgZm9yIG1vcmUgaW5mby5cbiAgICogQHBhcmFtIGltcG9ydE1hbmFnZXIgVGhlIGBJbXBvcnRNYW5hZ2VyYCB0byB1c2UgZm9yIG1hbmFnaW5nIGltcG9ydHMuXG4gICAqXG4gICAqIEByZXR1cm4gVGhlIEphdmFTY3JpcHQgY29kZSBjb3JyZXNwb25kaW5nIHRvIGBzdG10YCAoaW4gdGhlIGFwcHJvcHJpYXRlIGZvcm1hdCkuXG4gICAqL1xuICBvdmVycmlkZSBwcmludFN0YXRlbWVudChzdG10OiBTdGF0ZW1lbnQsIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIGltcG9ydE1hbmFnZXI6IEltcG9ydE1hbmFnZXIpOlxuICAgICAgc3RyaW5nIHtcbiAgICBjb25zdCBub2RlID0gdHJhbnNsYXRlU3RhdGVtZW50KFxuICAgICAgICBzdG10LCBpbXBvcnRNYW5hZ2VyLCB7ZG93bmxldmVsVGFnZ2VkVGVtcGxhdGVzOiB0cnVlLCBkb3dubGV2ZWxWYXJpYWJsZURlY2xhcmF0aW9uczogdHJ1ZX0pO1xuICAgIGNvbnN0IGNvZGUgPSB0aGlzLnByaW50ZXIucHJpbnROb2RlKHRzLkVtaXRIaW50LlVuc3BlY2lmaWVkLCBub2RlLCBzb3VyY2VGaWxlKTtcblxuICAgIHJldHVybiBjb2RlO1xuICB9XG59XG4iXX0=