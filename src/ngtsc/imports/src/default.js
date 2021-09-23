/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
        define("@angular/compiler-cli/src/ngtsc/imports/src/default", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DefaultImportTracker = exports.getDefaultImportDeclaration = exports.attachDefaultImportDeclaration = void 0;
    var ts = require("typescript");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var DefaultImportDeclaration = Symbol('DefaultImportDeclaration');
    /**
     * Attaches a default import declaration to `expr` to indicate the dependency of `expr` on the
     * default import.
     */
    function attachDefaultImportDeclaration(expr, importDecl) {
        expr[DefaultImportDeclaration] = importDecl;
    }
    exports.attachDefaultImportDeclaration = attachDefaultImportDeclaration;
    /**
     * Obtains the default import declaration that `expr` depends on, or `null` if there is no such
     * dependency.
     */
    function getDefaultImportDeclaration(expr) {
        var _a;
        return (_a = expr[DefaultImportDeclaration]) !== null && _a !== void 0 ? _a : null;
    }
    exports.getDefaultImportDeclaration = getDefaultImportDeclaration;
    /**
     * TypeScript has trouble with generating default imports inside of transformers for some module
     * formats. The issue is that for the statement:
     *
     * import X from 'some/module';
     * console.log(X);
     *
     * TypeScript will not use the "X" name in generated code. For normal user code, this is fine
     * because references to X will also be renamed. However, if both the import and any references are
     * added in a transformer, TypeScript does not associate the two, and will leave the "X" references
     * dangling while renaming the import variable. The generated code looks something like:
     *
     * const module_1 = require('some/module');
     * console.log(X); // now X is a dangling reference.
     *
     * Therefore, we cannot synthetically add default imports, and must reuse the imports that users
     * include. Doing this poses a challenge for imports that are only consumed in the type position in
     * the user's code. If Angular reuses the imported symbol in a value position (for example, we
     * see a constructor parameter of type Foo and try to write "inject(Foo)") we will also end up with
     * a dangling reference, as TS will elide the import because it was only used in the type position
     * originally.
     *
     * To avoid this, the compiler must "touch" the imports with `ts.getMutableClone`, and should
     * only do this for imports which are actually consumed. The `DefaultImportTracker` keeps track of
     * these imports as they're encountered and emitted, and implements a transform which can correctly
     * flag the imports as required.
     *
     * This problem does not exist for non-default imports as the compiler can easily insert
     * "import * as X" style imports for those, and the "X" identifier survives transformation.
     */
    var DefaultImportTracker = /** @class */ (function () {
        function DefaultImportTracker() {
            /**
             * A `Map` which tracks the `Set` of `ts.ImportDeclaration`s for default imports that were used in
             * a given `ts.SourceFile` and need to be preserved.
             */
            this.sourceFileToUsedImports = new Map();
        }
        DefaultImportTracker.prototype.recordUsedImport = function (importDecl) {
            var sf = (0, typescript_1.getSourceFile)(importDecl);
            // Add the default import declaration to the set of used import declarations for the file.
            if (!this.sourceFileToUsedImports.has(sf)) {
                this.sourceFileToUsedImports.set(sf, new Set());
            }
            this.sourceFileToUsedImports.get(sf).add(importDecl);
        };
        /**
         * Get a `ts.TransformerFactory` which will preserve default imports that were previously marked
         * as used.
         *
         * This transformer must run after any other transformers which call `recordUsedImport`.
         */
        DefaultImportTracker.prototype.importPreservingTransformer = function () {
            var _this = this;
            return function (context) {
                return function (sf) {
                    return _this.transformSourceFile(sf);
                };
            };
        };
        /**
         * Process a `ts.SourceFile` and replace any `ts.ImportDeclaration`s.
         */
        DefaultImportTracker.prototype.transformSourceFile = function (sf) {
            var originalSf = ts.getOriginalNode(sf);
            // Take a fast path if no import declarations need to be preserved in the file.
            if (!this.sourceFileToUsedImports.has(originalSf)) {
                return sf;
            }
            // There are declarations that need to be preserved.
            var importsToPreserve = this.sourceFileToUsedImports.get(originalSf);
            // Generate a new statement list which preserves any imports present in `importsToPreserve`.
            var statements = sf.statements.map(function (stmt) {
                if (ts.isImportDeclaration(stmt) && importsToPreserve.has(stmt)) {
                    // Preserving an import that's marked as unreferenced (type-only) is tricky in TypeScript.
                    //
                    // Various approaches have been tried, with mixed success:
                    //
                    // 1. Using `ts.updateImportDeclaration` does not cause the import to be retained.
                    //
                    // 2. Using `ts.createImportDeclaration` with the same `ts.ImportClause` causes the import
                    //    to correctly be retained, but when emitting CommonJS module format code, references
                    //    to the imported value will not match the import variable.
                    //
                    // 3. Emitting "import * as" imports instead generates the correct import variable, but
                    //    references are missing the ".default" access. This happens to work for tsickle code
                    //    with goog.module transformations as tsickle strips the ".default" anyway.
                    //
                    // 4. It's possible to trick TypeScript by setting `ts.NodeFlag.Synthesized` on the import
                    //    declaration. This causes the import to be correctly retained and generated, but can
                    //    violate invariants elsewhere in the compiler and cause crashes.
                    //
                    // 5. Using `ts.getMutableClone` seems to correctly preserve the import and correctly
                    //    generate references to the import variable across all module types.
                    //
                    // Therefore, option 5 is the one used here. It seems to be implemented as the correct way
                    // to perform option 4, which preserves all the compiler's invariants.
                    //
                    // TODO(alxhub): discuss with the TypeScript team and determine if there's a better way to
                    // deal with this issue.
                    stmt = ts.getMutableClone(stmt);
                }
                return stmt;
            });
            // Save memory - there's no need to keep these around once the transform has run for the given
            // file.
            this.sourceFileToUsedImports.delete(originalSf);
            return ts.updateSourceFileNode(sf, statements);
        };
        return DefaultImportTracker;
    }());
    exports.DefaultImportTracker = DefaultImportTracker;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvaW1wb3J0cy9zcmMvZGVmYXVsdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFFakMsa0ZBQXdEO0lBRXhELElBQU0sd0JBQXdCLEdBQUcsTUFBTSxDQUFDLDBCQUEwQixDQUFDLENBQUM7SUFNcEU7OztPQUdHO0lBQ0gsU0FBZ0IsOEJBQThCLENBQzFDLElBQThCLEVBQUUsVUFBZ0M7UUFDakUsSUFBcUMsQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLFVBQVUsQ0FBQztJQUNoRixDQUFDO0lBSEQsd0VBR0M7SUFFRDs7O09BR0c7SUFDSCxTQUFnQiwyQkFBMkIsQ0FBQyxJQUE4Qjs7UUFFeEUsT0FBTyxNQUFDLElBQXFDLENBQUMsd0JBQXdCLENBQUMsbUNBQUksSUFBSSxDQUFDO0lBQ2xGLENBQUM7SUFIRCxrRUFHQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQTZCRztJQUNIO1FBQUE7WUFDRTs7O2VBR0c7WUFDSyw0QkFBdUIsR0FBRyxJQUFJLEdBQUcsRUFBNEMsQ0FBQztRQStFeEYsQ0FBQztRQTdFQywrQ0FBZ0IsR0FBaEIsVUFBaUIsVUFBZ0M7WUFDL0MsSUFBTSxFQUFFLEdBQUcsSUFBQSwwQkFBYSxFQUFDLFVBQVUsQ0FBQyxDQUFDO1lBRXJDLDBGQUEwRjtZQUMxRixJQUFJLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDekMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxHQUFHLEVBQXdCLENBQUMsQ0FBQzthQUN2RTtZQUNELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFFLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3hELENBQUM7UUFFRDs7Ozs7V0FLRztRQUNILDBEQUEyQixHQUEzQjtZQUFBLGlCQU1DO1lBTEMsT0FBTyxVQUFDLE9BQWlDO2dCQUN2QyxPQUFPLFVBQUMsRUFBaUI7b0JBQ3ZCLE9BQU8sS0FBSSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUN0QyxDQUFDLENBQUM7WUFDSixDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQ7O1dBRUc7UUFDSyxrREFBbUIsR0FBM0IsVUFBNEIsRUFBaUI7WUFDM0MsSUFBTSxVQUFVLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQWtCLENBQUM7WUFDM0QsK0VBQStFO1lBQy9FLElBQUksQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUNqRCxPQUFPLEVBQUUsQ0FBQzthQUNYO1lBRUQsb0RBQW9EO1lBQ3BELElBQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUUsQ0FBQztZQUV4RSw0RkFBNEY7WUFDNUYsSUFBTSxVQUFVLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBQSxJQUFJO2dCQUN2QyxJQUFJLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQy9ELDBGQUEwRjtvQkFDMUYsRUFBRTtvQkFDRiwwREFBMEQ7b0JBQzFELEVBQUU7b0JBQ0Ysa0ZBQWtGO29CQUNsRixFQUFFO29CQUNGLDBGQUEwRjtvQkFDMUYseUZBQXlGO29CQUN6RiwrREFBK0Q7b0JBQy9ELEVBQUU7b0JBQ0YsdUZBQXVGO29CQUN2Rix5RkFBeUY7b0JBQ3pGLCtFQUErRTtvQkFDL0UsRUFBRTtvQkFDRiwwRkFBMEY7b0JBQzFGLHlGQUF5RjtvQkFDekYscUVBQXFFO29CQUNyRSxFQUFFO29CQUNGLHFGQUFxRjtvQkFDckYseUVBQXlFO29CQUN6RSxFQUFFO29CQUNGLDBGQUEwRjtvQkFDMUYsc0VBQXNFO29CQUN0RSxFQUFFO29CQUNGLDBGQUEwRjtvQkFDMUYsd0JBQXdCO29CQUN4QixJQUFJLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDakM7Z0JBQ0QsT0FBTyxJQUFJLENBQUM7WUFDZCxDQUFDLENBQUMsQ0FBQztZQUVILDhGQUE4RjtZQUM5RixRQUFRO1lBQ1IsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUVoRCxPQUFPLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDakQsQ0FBQztRQUNILDJCQUFDO0lBQUQsQ0FBQyxBQXBGRCxJQW9GQztJQXBGWSxvREFBb0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtXcmFwcGVkTm9kZUV4cHJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2dldFNvdXJjZUZpbGV9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5jb25zdCBEZWZhdWx0SW1wb3J0RGVjbGFyYXRpb24gPSBTeW1ib2woJ0RlZmF1bHRJbXBvcnREZWNsYXJhdGlvbicpO1xuXG5pbnRlcmZhY2UgV2l0aERlZmF1bHRJbXBvcnREZWNsYXJhdGlvbiB7XG4gIFtEZWZhdWx0SW1wb3J0RGVjbGFyYXRpb25dPzogdHMuSW1wb3J0RGVjbGFyYXRpb247XG59XG5cbi8qKlxuICogQXR0YWNoZXMgYSBkZWZhdWx0IGltcG9ydCBkZWNsYXJhdGlvbiB0byBgZXhwcmAgdG8gaW5kaWNhdGUgdGhlIGRlcGVuZGVuY3kgb2YgYGV4cHJgIG9uIHRoZVxuICogZGVmYXVsdCBpbXBvcnQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhdHRhY2hEZWZhdWx0SW1wb3J0RGVjbGFyYXRpb24oXG4gICAgZXhwcjogV3JhcHBlZE5vZGVFeHByPHVua25vd24+LCBpbXBvcnREZWNsOiB0cy5JbXBvcnREZWNsYXJhdGlvbik6IHZvaWQge1xuICAoZXhwciBhcyBXaXRoRGVmYXVsdEltcG9ydERlY2xhcmF0aW9uKVtEZWZhdWx0SW1wb3J0RGVjbGFyYXRpb25dID0gaW1wb3J0RGVjbDtcbn1cblxuLyoqXG4gKiBPYnRhaW5zIHRoZSBkZWZhdWx0IGltcG9ydCBkZWNsYXJhdGlvbiB0aGF0IGBleHByYCBkZXBlbmRzIG9uLCBvciBgbnVsbGAgaWYgdGhlcmUgaXMgbm8gc3VjaFxuICogZGVwZW5kZW5jeS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldERlZmF1bHRJbXBvcnREZWNsYXJhdGlvbihleHByOiBXcmFwcGVkTm9kZUV4cHI8dW5rbm93bj4pOiB0cy5JbXBvcnREZWNsYXJhdGlvbnxcbiAgICBudWxsIHtcbiAgcmV0dXJuIChleHByIGFzIFdpdGhEZWZhdWx0SW1wb3J0RGVjbGFyYXRpb24pW0RlZmF1bHRJbXBvcnREZWNsYXJhdGlvbl0gPz8gbnVsbDtcbn1cblxuLyoqXG4gKiBUeXBlU2NyaXB0IGhhcyB0cm91YmxlIHdpdGggZ2VuZXJhdGluZyBkZWZhdWx0IGltcG9ydHMgaW5zaWRlIG9mIHRyYW5zZm9ybWVycyBmb3Igc29tZSBtb2R1bGVcbiAqIGZvcm1hdHMuIFRoZSBpc3N1ZSBpcyB0aGF0IGZvciB0aGUgc3RhdGVtZW50OlxuICpcbiAqIGltcG9ydCBYIGZyb20gJ3NvbWUvbW9kdWxlJztcbiAqIGNvbnNvbGUubG9nKFgpO1xuICpcbiAqIFR5cGVTY3JpcHQgd2lsbCBub3QgdXNlIHRoZSBcIlhcIiBuYW1lIGluIGdlbmVyYXRlZCBjb2RlLiBGb3Igbm9ybWFsIHVzZXIgY29kZSwgdGhpcyBpcyBmaW5lXG4gKiBiZWNhdXNlIHJlZmVyZW5jZXMgdG8gWCB3aWxsIGFsc28gYmUgcmVuYW1lZC4gSG93ZXZlciwgaWYgYm90aCB0aGUgaW1wb3J0IGFuZCBhbnkgcmVmZXJlbmNlcyBhcmVcbiAqIGFkZGVkIGluIGEgdHJhbnNmb3JtZXIsIFR5cGVTY3JpcHQgZG9lcyBub3QgYXNzb2NpYXRlIHRoZSB0d28sIGFuZCB3aWxsIGxlYXZlIHRoZSBcIlhcIiByZWZlcmVuY2VzXG4gKiBkYW5nbGluZyB3aGlsZSByZW5hbWluZyB0aGUgaW1wb3J0IHZhcmlhYmxlLiBUaGUgZ2VuZXJhdGVkIGNvZGUgbG9va3Mgc29tZXRoaW5nIGxpa2U6XG4gKlxuICogY29uc3QgbW9kdWxlXzEgPSByZXF1aXJlKCdzb21lL21vZHVsZScpO1xuICogY29uc29sZS5sb2coWCk7IC8vIG5vdyBYIGlzIGEgZGFuZ2xpbmcgcmVmZXJlbmNlLlxuICpcbiAqIFRoZXJlZm9yZSwgd2UgY2Fubm90IHN5bnRoZXRpY2FsbHkgYWRkIGRlZmF1bHQgaW1wb3J0cywgYW5kIG11c3QgcmV1c2UgdGhlIGltcG9ydHMgdGhhdCB1c2Vyc1xuICogaW5jbHVkZS4gRG9pbmcgdGhpcyBwb3NlcyBhIGNoYWxsZW5nZSBmb3IgaW1wb3J0cyB0aGF0IGFyZSBvbmx5IGNvbnN1bWVkIGluIHRoZSB0eXBlIHBvc2l0aW9uIGluXG4gKiB0aGUgdXNlcidzIGNvZGUuIElmIEFuZ3VsYXIgcmV1c2VzIHRoZSBpbXBvcnRlZCBzeW1ib2wgaW4gYSB2YWx1ZSBwb3NpdGlvbiAoZm9yIGV4YW1wbGUsIHdlXG4gKiBzZWUgYSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXIgb2YgdHlwZSBGb28gYW5kIHRyeSB0byB3cml0ZSBcImluamVjdChGb28pXCIpIHdlIHdpbGwgYWxzbyBlbmQgdXAgd2l0aFxuICogYSBkYW5nbGluZyByZWZlcmVuY2UsIGFzIFRTIHdpbGwgZWxpZGUgdGhlIGltcG9ydCBiZWNhdXNlIGl0IHdhcyBvbmx5IHVzZWQgaW4gdGhlIHR5cGUgcG9zaXRpb25cbiAqIG9yaWdpbmFsbHkuXG4gKlxuICogVG8gYXZvaWQgdGhpcywgdGhlIGNvbXBpbGVyIG11c3QgXCJ0b3VjaFwiIHRoZSBpbXBvcnRzIHdpdGggYHRzLmdldE11dGFibGVDbG9uZWAsIGFuZCBzaG91bGRcbiAqIG9ubHkgZG8gdGhpcyBmb3IgaW1wb3J0cyB3aGljaCBhcmUgYWN0dWFsbHkgY29uc3VtZWQuIFRoZSBgRGVmYXVsdEltcG9ydFRyYWNrZXJgIGtlZXBzIHRyYWNrIG9mXG4gKiB0aGVzZSBpbXBvcnRzIGFzIHRoZXkncmUgZW5jb3VudGVyZWQgYW5kIGVtaXR0ZWQsIGFuZCBpbXBsZW1lbnRzIGEgdHJhbnNmb3JtIHdoaWNoIGNhbiBjb3JyZWN0bHlcbiAqIGZsYWcgdGhlIGltcG9ydHMgYXMgcmVxdWlyZWQuXG4gKlxuICogVGhpcyBwcm9ibGVtIGRvZXMgbm90IGV4aXN0IGZvciBub24tZGVmYXVsdCBpbXBvcnRzIGFzIHRoZSBjb21waWxlciBjYW4gZWFzaWx5IGluc2VydFxuICogXCJpbXBvcnQgKiBhcyBYXCIgc3R5bGUgaW1wb3J0cyBmb3IgdGhvc2UsIGFuZCB0aGUgXCJYXCIgaWRlbnRpZmllciBzdXJ2aXZlcyB0cmFuc2Zvcm1hdGlvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIERlZmF1bHRJbXBvcnRUcmFja2VyIHtcbiAgLyoqXG4gICAqIEEgYE1hcGAgd2hpY2ggdHJhY2tzIHRoZSBgU2V0YCBvZiBgdHMuSW1wb3J0RGVjbGFyYXRpb25gcyBmb3IgZGVmYXVsdCBpbXBvcnRzIHRoYXQgd2VyZSB1c2VkIGluXG4gICAqIGEgZ2l2ZW4gYHRzLlNvdXJjZUZpbGVgIGFuZCBuZWVkIHRvIGJlIHByZXNlcnZlZC5cbiAgICovXG4gIHByaXZhdGUgc291cmNlRmlsZVRvVXNlZEltcG9ydHMgPSBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIFNldDx0cy5JbXBvcnREZWNsYXJhdGlvbj4+KCk7XG5cbiAgcmVjb3JkVXNlZEltcG9ydChpbXBvcnREZWNsOiB0cy5JbXBvcnREZWNsYXJhdGlvbik6IHZvaWQge1xuICAgIGNvbnN0IHNmID0gZ2V0U291cmNlRmlsZShpbXBvcnREZWNsKTtcblxuICAgIC8vIEFkZCB0aGUgZGVmYXVsdCBpbXBvcnQgZGVjbGFyYXRpb24gdG8gdGhlIHNldCBvZiB1c2VkIGltcG9ydCBkZWNsYXJhdGlvbnMgZm9yIHRoZSBmaWxlLlxuICAgIGlmICghdGhpcy5zb3VyY2VGaWxlVG9Vc2VkSW1wb3J0cy5oYXMoc2YpKSB7XG4gICAgICB0aGlzLnNvdXJjZUZpbGVUb1VzZWRJbXBvcnRzLnNldChzZiwgbmV3IFNldDx0cy5JbXBvcnREZWNsYXJhdGlvbj4oKSk7XG4gICAgfVxuICAgIHRoaXMuc291cmNlRmlsZVRvVXNlZEltcG9ydHMuZ2V0KHNmKSEuYWRkKGltcG9ydERlY2wpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhIGB0cy5UcmFuc2Zvcm1lckZhY3RvcnlgIHdoaWNoIHdpbGwgcHJlc2VydmUgZGVmYXVsdCBpbXBvcnRzIHRoYXQgd2VyZSBwcmV2aW91c2x5IG1hcmtlZFxuICAgKiBhcyB1c2VkLlxuICAgKlxuICAgKiBUaGlzIHRyYW5zZm9ybWVyIG11c3QgcnVuIGFmdGVyIGFueSBvdGhlciB0cmFuc2Zvcm1lcnMgd2hpY2ggY2FsbCBgcmVjb3JkVXNlZEltcG9ydGAuXG4gICAqL1xuICBpbXBvcnRQcmVzZXJ2aW5nVHJhbnNmb3JtZXIoKTogdHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLlNvdXJjZUZpbGU+IHtcbiAgICByZXR1cm4gKGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCkgPT4ge1xuICAgICAgcmV0dXJuIChzZjogdHMuU291cmNlRmlsZSkgPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy50cmFuc2Zvcm1Tb3VyY2VGaWxlKHNmKTtcbiAgICAgIH07XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzIGEgYHRzLlNvdXJjZUZpbGVgIGFuZCByZXBsYWNlIGFueSBgdHMuSW1wb3J0RGVjbGFyYXRpb25gcy5cbiAgICovXG4gIHByaXZhdGUgdHJhbnNmb3JtU291cmNlRmlsZShzZjogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGUge1xuICAgIGNvbnN0IG9yaWdpbmFsU2YgPSB0cy5nZXRPcmlnaW5hbE5vZGUoc2YpIGFzIHRzLlNvdXJjZUZpbGU7XG4gICAgLy8gVGFrZSBhIGZhc3QgcGF0aCBpZiBubyBpbXBvcnQgZGVjbGFyYXRpb25zIG5lZWQgdG8gYmUgcHJlc2VydmVkIGluIHRoZSBmaWxlLlxuICAgIGlmICghdGhpcy5zb3VyY2VGaWxlVG9Vc2VkSW1wb3J0cy5oYXMob3JpZ2luYWxTZikpIHtcbiAgICAgIHJldHVybiBzZjtcbiAgICB9XG5cbiAgICAvLyBUaGVyZSBhcmUgZGVjbGFyYXRpb25zIHRoYXQgbmVlZCB0byBiZSBwcmVzZXJ2ZWQuXG4gICAgY29uc3QgaW1wb3J0c1RvUHJlc2VydmUgPSB0aGlzLnNvdXJjZUZpbGVUb1VzZWRJbXBvcnRzLmdldChvcmlnaW5hbFNmKSE7XG5cbiAgICAvLyBHZW5lcmF0ZSBhIG5ldyBzdGF0ZW1lbnQgbGlzdCB3aGljaCBwcmVzZXJ2ZXMgYW55IGltcG9ydHMgcHJlc2VudCBpbiBgaW1wb3J0c1RvUHJlc2VydmVgLlxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBzZi5zdGF0ZW1lbnRzLm1hcChzdG10ID0+IHtcbiAgICAgIGlmICh0cy5pc0ltcG9ydERlY2xhcmF0aW9uKHN0bXQpICYmIGltcG9ydHNUb1ByZXNlcnZlLmhhcyhzdG10KSkge1xuICAgICAgICAvLyBQcmVzZXJ2aW5nIGFuIGltcG9ydCB0aGF0J3MgbWFya2VkIGFzIHVucmVmZXJlbmNlZCAodHlwZS1vbmx5KSBpcyB0cmlja3kgaW4gVHlwZVNjcmlwdC5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gVmFyaW91cyBhcHByb2FjaGVzIGhhdmUgYmVlbiB0cmllZCwgd2l0aCBtaXhlZCBzdWNjZXNzOlxuICAgICAgICAvL1xuICAgICAgICAvLyAxLiBVc2luZyBgdHMudXBkYXRlSW1wb3J0RGVjbGFyYXRpb25gIGRvZXMgbm90IGNhdXNlIHRoZSBpbXBvcnQgdG8gYmUgcmV0YWluZWQuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIDIuIFVzaW5nIGB0cy5jcmVhdGVJbXBvcnREZWNsYXJhdGlvbmAgd2l0aCB0aGUgc2FtZSBgdHMuSW1wb3J0Q2xhdXNlYCBjYXVzZXMgdGhlIGltcG9ydFxuICAgICAgICAvLyAgICB0byBjb3JyZWN0bHkgYmUgcmV0YWluZWQsIGJ1dCB3aGVuIGVtaXR0aW5nIENvbW1vbkpTIG1vZHVsZSBmb3JtYXQgY29kZSwgcmVmZXJlbmNlc1xuICAgICAgICAvLyAgICB0byB0aGUgaW1wb3J0ZWQgdmFsdWUgd2lsbCBub3QgbWF0Y2ggdGhlIGltcG9ydCB2YXJpYWJsZS5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gMy4gRW1pdHRpbmcgXCJpbXBvcnQgKiBhc1wiIGltcG9ydHMgaW5zdGVhZCBnZW5lcmF0ZXMgdGhlIGNvcnJlY3QgaW1wb3J0IHZhcmlhYmxlLCBidXRcbiAgICAgICAgLy8gICAgcmVmZXJlbmNlcyBhcmUgbWlzc2luZyB0aGUgXCIuZGVmYXVsdFwiIGFjY2Vzcy4gVGhpcyBoYXBwZW5zIHRvIHdvcmsgZm9yIHRzaWNrbGUgY29kZVxuICAgICAgICAvLyAgICB3aXRoIGdvb2cubW9kdWxlIHRyYW5zZm9ybWF0aW9ucyBhcyB0c2lja2xlIHN0cmlwcyB0aGUgXCIuZGVmYXVsdFwiIGFueXdheS5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gNC4gSXQncyBwb3NzaWJsZSB0byB0cmljayBUeXBlU2NyaXB0IGJ5IHNldHRpbmcgYHRzLk5vZGVGbGFnLlN5bnRoZXNpemVkYCBvbiB0aGUgaW1wb3J0XG4gICAgICAgIC8vICAgIGRlY2xhcmF0aW9uLiBUaGlzIGNhdXNlcyB0aGUgaW1wb3J0IHRvIGJlIGNvcnJlY3RseSByZXRhaW5lZCBhbmQgZ2VuZXJhdGVkLCBidXQgY2FuXG4gICAgICAgIC8vICAgIHZpb2xhdGUgaW52YXJpYW50cyBlbHNld2hlcmUgaW4gdGhlIGNvbXBpbGVyIGFuZCBjYXVzZSBjcmFzaGVzLlxuICAgICAgICAvL1xuICAgICAgICAvLyA1LiBVc2luZyBgdHMuZ2V0TXV0YWJsZUNsb25lYCBzZWVtcyB0byBjb3JyZWN0bHkgcHJlc2VydmUgdGhlIGltcG9ydCBhbmQgY29ycmVjdGx5XG4gICAgICAgIC8vICAgIGdlbmVyYXRlIHJlZmVyZW5jZXMgdG8gdGhlIGltcG9ydCB2YXJpYWJsZSBhY3Jvc3MgYWxsIG1vZHVsZSB0eXBlcy5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gVGhlcmVmb3JlLCBvcHRpb24gNSBpcyB0aGUgb25lIHVzZWQgaGVyZS4gSXQgc2VlbXMgdG8gYmUgaW1wbGVtZW50ZWQgYXMgdGhlIGNvcnJlY3Qgd2F5XG4gICAgICAgIC8vIHRvIHBlcmZvcm0gb3B0aW9uIDQsIHdoaWNoIHByZXNlcnZlcyBhbGwgdGhlIGNvbXBpbGVyJ3MgaW52YXJpYW50cy5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gVE9ETyhhbHhodWIpOiBkaXNjdXNzIHdpdGggdGhlIFR5cGVTY3JpcHQgdGVhbSBhbmQgZGV0ZXJtaW5lIGlmIHRoZXJlJ3MgYSBiZXR0ZXIgd2F5IHRvXG4gICAgICAgIC8vIGRlYWwgd2l0aCB0aGlzIGlzc3VlLlxuICAgICAgICBzdG10ID0gdHMuZ2V0TXV0YWJsZUNsb25lKHN0bXQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0bXQ7XG4gICAgfSk7XG5cbiAgICAvLyBTYXZlIG1lbW9yeSAtIHRoZXJlJ3Mgbm8gbmVlZCB0byBrZWVwIHRoZXNlIGFyb3VuZCBvbmNlIHRoZSB0cmFuc2Zvcm0gaGFzIHJ1biBmb3IgdGhlIGdpdmVuXG4gICAgLy8gZmlsZS5cbiAgICB0aGlzLnNvdXJjZUZpbGVUb1VzZWRJbXBvcnRzLmRlbGV0ZShvcmlnaW5hbFNmKTtcblxuICAgIHJldHVybiB0cy51cGRhdGVTb3VyY2VGaWxlTm9kZShzZiwgc3RhdGVtZW50cyk7XG4gIH1cbn1cbiJdfQ==