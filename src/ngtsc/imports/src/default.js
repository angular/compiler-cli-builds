/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
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
    exports.DefaultImportTracker = exports.NOOP_DEFAULT_IMPORT_RECORDER = void 0;
    var ts = require("typescript");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    /**
     * An implementation of `DefaultImportRecorder` which does nothing.
     *
     * This is useful when default import tracking isn't required, such as when emitting .d.ts code
     * or for ngcc.
     */
    exports.NOOP_DEFAULT_IMPORT_RECORDER = {
        recordImportedIdentifier: function (id) { return void {}; },
        recordUsedIdentifier: function (id) { return void {}; },
    };
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
             * A `Map` which tracks the `Map` of default import `ts.Identifier`s to their
             * `ts.ImportDeclaration`s. These declarations are not guaranteed to be used.
             */
            this.sourceFileToImportMap = new Map();
            /**
             * A `Map` which tracks the `Set` of `ts.ImportDeclaration`s for default imports that were used in
             * a given `ts.SourceFile` and need to be preserved.
             */
            this.sourceFileToUsedImports = new Map();
        }
        DefaultImportTracker.prototype.recordImportedIdentifier = function (id, decl) {
            var sf = typescript_1.getSourceFile(id);
            if (!this.sourceFileToImportMap.has(sf)) {
                this.sourceFileToImportMap.set(sf, new Map());
            }
            this.sourceFileToImportMap.get(sf).set(id, decl);
        };
        DefaultImportTracker.prototype.recordUsedIdentifier = function (id) {
            var sf = typescript_1.getSourceFile(id);
            if (!this.sourceFileToImportMap.has(sf)) {
                // The identifier's source file has no registered default imports at all.
                return;
            }
            var identiferToDeclaration = this.sourceFileToImportMap.get(sf);
            if (!identiferToDeclaration.has(id)) {
                // The identifier isn't from a registered default import.
                return;
            }
            var decl = identiferToDeclaration.get(id);
            // Add the default import declaration to the set of used import declarations for the file.
            if (!this.sourceFileToUsedImports.has(sf)) {
                this.sourceFileToUsedImports.set(sf, new Set());
            }
            this.sourceFileToUsedImports.get(sf).add(decl);
        };
        /**
         * Get a `ts.TransformerFactory` which will preserve default imports that were previously marked
         * as used.
         *
         * This transformer must run after any other transformers which call `recordUsedIdentifier`.
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
            this.sourceFileToImportMap.delete(originalSf);
            this.sourceFileToUsedImports.delete(originalSf);
            return ts.updateSourceFileNode(sf, statements);
        };
        return DefaultImportTracker;
    }());
    exports.DefaultImportTracker = DefaultImportTracker;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvaW1wb3J0cy9zcmMvZGVmYXVsdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsa0ZBQXdEO0lBNkJ4RDs7Ozs7T0FLRztJQUNVLFFBQUEsNEJBQTRCLEdBQTBCO1FBQ2pFLHdCQUF3QixFQUFFLFVBQUMsRUFBaUIsSUFBSyxPQUFBLEtBQUksRUFBRSxFQUFOLENBQU07UUFDdkQsb0JBQW9CLEVBQUUsVUFBQyxFQUFpQixJQUFLLE9BQUEsS0FBSSxFQUFFLEVBQU4sQ0FBTTtLQUNwRCxDQUFDO0lBRUY7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09BNkJHO0lBQ0g7UUFBQTtZQUNFOzs7ZUFHRztZQUNLLDBCQUFxQixHQUN6QixJQUFJLEdBQUcsRUFBMkQsQ0FBQztZQUV2RTs7O2VBR0c7WUFDSyw0QkFBdUIsR0FBRyxJQUFJLEdBQUcsRUFBNEMsQ0FBQztRQWlHeEYsQ0FBQztRQWhHQyx1REFBd0IsR0FBeEIsVUFBeUIsRUFBaUIsRUFBRSxJQUEwQjtZQUNwRSxJQUFNLEVBQUUsR0FBRywwQkFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzdCLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO2dCQUN2QyxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLEdBQUcsRUFBdUMsQ0FBQyxDQUFDO2FBQ3BGO1lBQ0QsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3BELENBQUM7UUFFRCxtREFBb0IsR0FBcEIs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aEQsT0FBTyxFQUFFLENBQUMsb0JBQW9CLENBQUMsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ2pELENBQUM7UUFDSCwyQkFBQztJQUFELENBQUMsQUE3R0QsSUE2R0M7SUE3R1ksb0RBQW9CIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtnZXRTb3VyY2VGaWxlfSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuLyoqXG4gKiBSZWdpc3RlcnMgYW5kIHJlY29yZHMgdXNhZ2VzIG9mIGB0cy5JZGVudGlmZXJgcyB0aGF0IGNhbWUgZnJvbSBkZWZhdWx0IGltcG9ydCBzdGF0ZW1lbnRzLlxuICpcbiAqIFNlZSBgRGVmYXVsdEltcG9ydFRyYWNrZXJgIGZvciBkZXRhaWxzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIERlZmF1bHRJbXBvcnRSZWNvcmRlciB7XG4gIC8qKlxuICAgKiBSZWNvcmQgYW4gYXNzb2NpYXRpb24gYmV0d2VlbiBhIGB0cy5JZGVudGlmaWVyYCB3aGljaCBtaWdodCBiZSBlbWl0dGVkIGFuZCB0aGVcbiAgICogYHRzLkltcG9ydERlY2xhcmF0aW9uYCBmcm9tIHdoaWNoIGl0IGNhbWUuXG4gICAqXG4gICAqIEFsb25lLCB0aGlzIG1ldGhvZCBoYXMgbm8gZWZmZWN0IGFzIHRoZSBgdHMuSWRlbnRpZmllcmAgbWlnaHQgbm90IGJlIHVzZWQgaW4gdGhlIG91dHB1dC5cbiAgICogVGhlIGlkZW50aWZpZXIgbXVzdCBsYXRlciBiZSBtYXJrZWQgYXMgdXNlZCB3aXRoIGByZWNvcmRVc2VkSWRlbnRpZmllcmAgaW4gb3JkZXIgZm9yIGl0c1xuICAgKiBpbXBvcnQgdG8gYmUgcHJlc2VydmVkLlxuICAgKi9cbiAgcmVjb3JkSW1wb3J0ZWRJZGVudGlmaWVyKGlkOiB0cy5JZGVudGlmaWVyLCBkZWNsOiB0cy5JbXBvcnREZWNsYXJhdGlvbik6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIFJlY29yZCB0aGUgZmFjdCB0aGF0IHRoZSBnaXZlbiBgdHMuSWRlbnRpZmVyYCB3aWxsIGJlIGVtaXR0ZWQsIGFuZCB0aHVzIGl0c1xuICAgKiBgdHMuSW1wb3J0RGVjbGFyYXRpb25gLCBpZiBpdCB3YXMgYSBwcmV2aW91c2x5IHJlZ2lzdGVyZWQgZGVmYXVsdCBpbXBvcnQsIG11c3QgYmUgcHJlc2VydmVkLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBjYW4gYmUgY2FsbGVkIHNhZmVseSBmb3IgYW55IGB0cy5JZGVudGlmZXJgLCByZWdhcmRsZXNzIG9mIGl0cyBvcmlnaW4uIEl0IHdpbGwgb25seVxuICAgKiBoYXZlIGFuIGVmZmVjdCBpZiB0aGUgaWRlbnRpZmllciBjYW1lIGZyb20gYSBgdHMuSW1wb3J0RGVjbGFyYXRpb25gIGRlZmF1bHQgaW1wb3J0IHdoaWNoIHdhc1xuICAgKiBwcmV2aW91c2x5IHJlZ2lzdGVyZWQgd2l0aCBgcmVjb3JkSW1wb3J0ZWRJZGVudGlmaWVyYC5cbiAgICovXG4gIHJlY29yZFVzZWRJZGVudGlmaWVyKGlkOiB0cy5JZGVudGlmaWVyKTogdm9pZDtcbn1cblxuLyoqXG4gKiBBbiBpbXBsZW1lbnRhdGlvbiBvZiBgRGVmYXVsdEltcG9ydFJlY29yZGVyYCB3aGljaCBkb2VzIG5vdGhpbmcuXG4gKlxuICogVGhpcyBpcyB1c2VmdWwgd2hlbiBkZWZhdWx0IGltcG9ydCB0cmFja2luZyBpc24ndCByZXF1aXJlZCwgc3VjaCBhcyB3aGVuIGVtaXR0aW5nIC5kLnRzIGNvZGVcbiAqIG9yIGZvciBuZ2NjLlxuICovXG5leHBvcnQgY29uc3QgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUjogRGVmYXVsdEltcG9ydFJlY29yZGVyID0ge1xuICByZWNvcmRJbXBvcnRlZElkZW50aWZpZXI6IChpZDogdHMuSWRlbnRpZmllcikgPT4gdm9pZHt9LFxuICByZWNvcmRVc2VkSWRlbnRpZmllcjogKGlkOiB0cy5JZGVudGlmaWVyKSA9PiB2b2lke30sXG59O1xuXG4vKipcbiAqIFR5cGVTY3JpcHQgaGFzIHRyb3VibGUgd2l0aCBnZW5lcmF0aW5nIGRlZmF1bHQgaW1wb3J0cyBpbnNpZGUgb2YgdHJhbnNmb3JtZXJzIGZvciBzb21lIG1vZHVsZVxuICogZm9ybWF0cy4gVGhlIGlzc3VlIGlzIHRoYXQgZm9yIHRoZSBzdGF0ZW1lbnQ6XG4gKlxuICogaW1wb3J0IFggZnJvbSAnc29tZS9tb2R1bGUnO1xuICogY29uc29sZS5sb2coWCk7XG4gKlxuICogVHlwZVNjcmlwdCB3aWxsIG5vdCB1c2UgdGhlIFwiWFwiIG5hbWUgaW4gZ2VuZXJhdGVkIGNvZGUuIEZvciBub3JtYWwgdXNlciBjb2RlLCB0aGlzIGlzIGZpbmVcbiAqIGJlY2F1c2UgcmVmZXJlbmNlcyB0byBYIHdpbGwgYWxzbyBiZSByZW5hbWVkLiBIb3dldmVyLCBpZiBib3RoIHRoZSBpbXBvcnQgYW5kIGFueSByZWZlcmVuY2VzIGFyZVxuICogYWRkZWQgaW4gYSB0cmFuc2Zvcm1lciwgVHlwZVNjcmlwdCBkb2VzIG5vdCBhc3NvY2lhdGUgdGhlIHR3bywgYW5kIHdpbGwgbGVhdmUgdGhlIFwiWFwiIHJlZmVyZW5jZXNcbiAqIGRhbmdsaW5nIHdoaWxlIHJlbmFtaW5nIHRoZSBpbXBvcnQgdmFyaWFibGUuIFRoZSBnZW5lcmF0ZWQgY29kZSBsb29rcyBzb21ldGhpbmcgbGlrZTpcbiAqXG4gKiBjb25zdCBtb2R1bGVfMSA9IHJlcXVpcmUoJ3NvbWUvbW9kdWxlJyk7XG4gKiBjb25zb2xlLmxvZyhYKTsgLy8gbm93IFggaXMgYSBkYW5nbGluZyByZWZlcmVuY2UuXG4gKlxuICogVGhlcmVmb3JlLCB3ZSBjYW5ub3Qgc3ludGhldGljYWxseSBhZGQgZGVmYXVsdCBpbXBvcnRzLCBhbmQgbXVzdCByZXVzZSB0aGUgaW1wb3J0cyB0aGF0IHVzZXJzXG4gKiBpbmNsdWRlLiBEb2luZyB0aGlzIHBvc2VzIGEgY2hhbGxlbmdlIGZvciBpbXBvcnRzIHRoYXQgYXJlIG9ubHkgY29uc3VtZWQgaW4gdGhlIHR5cGUgcG9zaXRpb24gaW5cbiAqIHRoZSB1c2VyJ3MgY29kZS4gSWYgQW5ndWxhciByZXVzZXMgdGhlIGltcG9ydGVkIHN5bWJvbCBpbiBhIHZhbHVlIHBvc2l0aW9uIChmb3IgZXhhbXBsZSwgd2VcbiAqIHNlZSBhIGNvbnN0cnVjdG9yIHBhcmFtZXRlciBvZiB0eXBlIEZvbyBhbmQgdHJ5IHRvIHdyaXRlIFwiaW5qZWN0KEZvbylcIikgd2Ugd2lsbCBhbHNvIGVuZCB1cCB3aXRoXG4gKiBhIGRhbmdsaW5nIHJlZmVyZW5jZSwgYXMgVFMgd2lsbCBlbGlkZSB0aGUgaW1wb3J0IGJlY2F1c2UgaXQgd2FzIG9ubHkgdXNlZCBpbiB0aGUgdHlwZSBwb3NpdGlvblxuICogb3JpZ2luYWxseS5cbiAqXG4gKiBUbyBhdm9pZCB0aGlzLCB0aGUgY29tcGlsZXIgbXVzdCBcInRvdWNoXCIgdGhlIGltcG9ydHMgd2l0aCBgdHMuZ2V0TXV0YWJsZUNsb25lYCwgYW5kIHNob3VsZFxuICogb25seSBkbyB0aGlzIGZvciBpbXBvcnRzIHdoaWNoIGFyZSBhY3R1YWxseSBjb25zdW1lZC4gVGhlIGBEZWZhdWx0SW1wb3J0VHJhY2tlcmAga2VlcHMgdHJhY2sgb2ZcbiAqIHRoZXNlIGltcG9ydHMgYXMgdGhleSdyZSBlbmNvdW50ZXJlZCBhbmQgZW1pdHRlZCwgYW5kIGltcGxlbWVudHMgYSB0cmFuc2Zvcm0gd2hpY2ggY2FuIGNvcnJlY3RseVxuICogZmxhZyB0aGUgaW1wb3J0cyBhcyByZXF1aXJlZC5cbiAqXG4gKiBUaGlzIHByb2JsZW0gZG9lcyBub3QgZXhpc3QgZm9yIG5vbi1kZWZhdWx0IGltcG9ydHMgYXMgdGhlIGNvbXBpbGVyIGNhbiBlYXNpbHkgaW5zZXJ0XG4gKiBcImltcG9ydCAqIGFzIFhcIiBzdHlsZSBpbXBvcnRzIGZvciB0aG9zZSwgYW5kIHRoZSBcIlhcIiBpZGVudGlmaWVyIHN1cnZpdmVzIHRyYW5zZm9ybWF0aW9uLlxuICovXG5leHBvcnQgY2xhc3MgRGVmYXVsdEltcG9ydFRyYWNrZXIgaW1wbGVtZW50cyBEZWZhdWx0SW1wb3J0UmVjb3JkZXIge1xuICAvKipcbiAgICogQSBgTWFwYCB3aGljaCB0cmFja3MgdGhlIGBNYXBgIG9mIGRlZmF1bHQgaW1wb3J0IGB0cy5JZGVudGlmaWVyYHMgdG8gdGhlaXJcbiAgICogYHRzLkltcG9ydERlY2xhcmF0aW9uYHMuIFRoZXNlIGRlY2xhcmF0aW9ucyBhcmUgbm90IGd1YXJhbnRlZWQgdG8gYmUgdXNlZC5cbiAgICovXG4gIHByaXZhdGUgc291cmNlRmlsZVRvSW1wb3J0TWFwID1cbiAgICAgIG5ldyBNYXA8dHMuU291cmNlRmlsZSwgTWFwPHRzLklkZW50aWZpZXIsIHRzLkltcG9ydERlY2xhcmF0aW9uPj4oKTtcblxuICAvKipcbiAgICogQSBgTWFwYCB3aGljaCB0cmFja3MgdGhlIGBTZXRgIG9mIGB0cy5JbXBvcnREZWNsYXJhdGlvbmBzIGZvciBkZWZhdWx0IGltcG9ydHMgdGhhdCB3ZXJlIHVzZWQgaW5cbiAgICogYSBnaXZlbiBgdHMuU291cmNlRmlsZWAgYW5kIG5lZWQgdG8gYmUgcHJlc2VydmVkLlxuICAgKi9cbiAgcHJpdmF0ZSBzb3VyY2VGaWxlVG9Vc2VkSW1wb3J0cyA9IG5ldyBNYXA8dHMuU291cmNlRmlsZSwgU2V0PHRzLkltcG9ydERlY2xhcmF0aW9uPj4oKTtcbiAgcmVjb3JkSW1wb3J0ZWRJZGVudGlmaWVyKGlkOiB0cy5JZGVudGlmaWVyLCBkZWNsOiB0cy5JbXBvcnREZWNsYXJhdGlvbik6IHZvaWQge1xuICAgIGNvbnN0IHNmID0gZ2V0U291cmNlRmlsZShpZCk7XG4gICAgaWYgKCF0aGlzLnNvdXJjZUZpbGVUb0ltcG9ydE1hcC5oYXMoc2YpKSB7XG4gICAgICB0aGlzLnNvdXJjZUZpbGVUb0ltcG9ydE1hcC5zZXQoc2YsIG5ldyBNYXA8dHMuSWRlbnRpZmllciwgdHMuSW1wb3J0RGVjbGFyYXRpb24+KCkpO1xuICAgIH1cbiAgICB0aGlzLnNvdXJjZUZpbGVUb0ltcG9ydE1hcC5nZXQoc2YpIS5zZXQoaWQsIGRlY2wpO1xuICB9XG5cbiAgcmVjb3JkVXNlZElkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiB2b2lkIHtcbiAgICBjb25zdCBzZiA9IGdldFNvdXJjZUZpbGUoaWQpO1xuICAgIGlmICghdGhpcy5zb3VyY2VGaWxlVG9JbXBvcnRNYXAuaGFzKHNmKSkge1xuICAgICAgLy8gVGhlIGlkZW50aWZpZXIncyBzb3VyY2UgZmlsZSBoYXMgbm8gcmVnaXN0ZXJlZCBkZWZhdWx0IGltcG9ydHMgYXQgYWxsLlxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBpZGVudGlmZXJUb0RlY2xhcmF0aW9uID0gdGhpcy5zb3VyY2VGaWxlVG9JbXBvcnRNYXAuZ2V0KHNmKSE7XG4gICAgaWYgKCFpZGVudGlmZXJUb0RlY2xhcmF0aW9uLmhhcyhpZCkpIHtcbiAgICAgIC8vIFRoZSBpZGVudGlmaWVyIGlzbid0IGZyb20gYSByZWdpc3RlcmVkIGRlZmF1bHQgaW1wb3J0LlxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBkZWNsID0gaWRlbnRpZmVyVG9EZWNsYXJhdGlvbi5nZXQoaWQpITtcblxuICAgIC8vIEFkZCB0aGUgZGVmYXVsdCBpbXBvcnQgZGVjbGFyYXRpb24gdG8gdGhlIHNldCBvZiB1c2VkIGltcG9ydCBkZWNsYXJhdGlvbnMgZm9yIHRoZSBmaWxlLlxuICAgIGlmICghdGhpcy5zb3VyY2VGaWxlVG9Vc2VkSW1wb3J0cy5oYXMoc2YpKSB7XG4gICAgICB0aGlzLnNvdXJjZUZpbGVUb1VzZWRJbXBvcnRzLnNldChzZiwgbmV3IFNldDx0cy5JbXBvcnREZWNsYXJhdGlvbj4oKSk7XG4gICAgfVxuICAgIHRoaXMuc291cmNlRmlsZVRvVXNlZEltcG9ydHMuZ2V0KHNmKSEuYWRkKGRlY2wpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhIGB0cy5UcmFuc2Zvcm1lckZhY3RvcnlgIHdoaWNoIHdpbGwgcHJlc2VydmUgZGVmYXVsdCBpbXBvcnRzIHRoYXQgd2VyZSBwcmV2aW91c2x5IG1hcmtlZFxuICAgKiBhcyB1c2VkLlxuICAgKlxuICAgKiBUaGlzIHRyYW5zZm9ybWVyIG11c3QgcnVuIGFmdGVyIGFueSBvdGhlciB0cmFuc2Zvcm1lcnMgd2hpY2ggY2FsbCBgcmVjb3JkVXNlZElkZW50aWZpZXJgLlxuICAgKi9cbiAgaW1wb3J0UHJlc2VydmluZ1RyYW5zZm9ybWVyKCk6IHRzLlRyYW5zZm9ybWVyRmFjdG9yeTx0cy5Tb3VyY2VGaWxlPiB7XG4gICAgcmV0dXJuIChjb250ZXh0OiB0cy5UcmFuc2Zvcm1hdGlvbkNvbnRleHQpID0+IHtcbiAgICAgIHJldHVybiAoc2Y6IHRzLlNvdXJjZUZpbGUpID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMudHJhbnNmb3JtU291cmNlRmlsZShzZik7XG4gICAgICB9O1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogUHJvY2VzcyBhIGB0cy5Tb3VyY2VGaWxlYCBhbmQgcmVwbGFjZSBhbnkgYHRzLkltcG9ydERlY2xhcmF0aW9uYHMuXG4gICAqL1xuICBwcml2YXRlIHRyYW5zZm9ybVNvdXJjZUZpbGUoc2Y6IHRzLlNvdXJjZUZpbGUpOiB0cy5Tb3VyY2VGaWxlIHtcbiAgICBjb25zdCBvcmlnaW5hbFNmID0gdHMuZ2V0T3JpZ2luYWxOb2RlKHNmKSBhcyB0cy5Tb3VyY2VGaWxlO1xuICAgIC8vIFRha2UgYSBmYXN0IHBhdGggaWYgbm8gaW1wb3J0IGRlY2xhcmF0aW9ucyBuZWVkIHRvIGJlIHByZXNlcnZlZCBpbiB0aGUgZmlsZS5cbiAgICBpZiAoIXRoaXMuc291cmNlRmlsZVRvVXNlZEltcG9ydHMuaGFzKG9yaWdpbmFsU2YpKSB7XG4gICAgICByZXR1cm4gc2Y7XG4gICAgfVxuXG4gICAgLy8gVGhlcmUgYXJlIGRlY2xhcmF0aW9ucyB0aGF0IG5lZWQgdG8gYmUgcHJlc2VydmVkLlxuICAgIGNvbnN0IGltcG9ydHNUb1ByZXNlcnZlID0gdGhpcy5zb3VyY2VGaWxlVG9Vc2VkSW1wb3J0cy5nZXQob3JpZ2luYWxTZikhO1xuXG4gICAgLy8gR2VuZXJhdGUgYSBuZXcgc3RhdGVtZW50IGxpc3Qgd2hpY2ggcHJlc2VydmVzIGFueSBpbXBvcnRzIHByZXNlbnQgaW4gYGltcG9ydHNUb1ByZXNlcnZlYC5cbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gc2Yuc3RhdGVtZW50cy5tYXAoc3RtdCA9PiB7XG4gICAgICBpZiAodHMuaXNJbXBvcnREZWNsYXJhdGlvbihzdG10KSAmJiBpbXBvcnRzVG9QcmVzZXJ2ZS5oYXMoc3RtdCkpIHtcbiAgICAgICAgLy8gUHJlc2VydmluZyBhbiBpbXBvcnQgdGhhdCdzIG1hcmtlZCBhcyB1bnJlZmVyZW5jZWQgKHR5cGUtb25seSkgaXMgdHJpY2t5IGluIFR5cGVTY3JpcHQuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFZhcmlvdXMgYXBwcm9hY2hlcyBoYXZlIGJlZW4gdHJpZWQsIHdpdGggbWl4ZWQgc3VjY2VzczpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gMS4gVXNpbmcgYHRzLnVwZGF0ZUltcG9ydERlY2xhcmF0aW9uYCBkb2VzIG5vdCBjYXVzZSB0aGUgaW1wb3J0IHRvIGJlIHJldGFpbmVkLlxuICAgICAgICAvL1xuICAgICAgICAvLyAyLiBVc2luZyBgdHMuY3JlYXRlSW1wb3J0RGVjbGFyYXRpb25gIHdpdGggdGhlIHNhbWUgYHRzLkltcG9ydENsYXVzZWAgY2F1c2VzIHRoZSBpbXBvcnRcbiAgICAgICAgLy8gICAgdG8gY29ycmVjdGx5IGJlIHJldGFpbmVkLCBidXQgd2hlbiBlbWl0dGluZyBDb21tb25KUyBtb2R1bGUgZm9ybWF0IGNvZGUsIHJlZmVyZW5jZXNcbiAgICAgICAgLy8gICAgdG8gdGhlIGltcG9ydGVkIHZhbHVlIHdpbGwgbm90IG1hdGNoIHRoZSBpbXBvcnQgdmFyaWFibGUuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIDMuIEVtaXR0aW5nIFwiaW1wb3J0ICogYXNcIiBpbXBvcnRzIGluc3RlYWQgZ2VuZXJhdGVzIHRoZSBjb3JyZWN0IGltcG9ydCB2YXJpYWJsZSwgYnV0XG4gICAgICAgIC8vICAgIHJlZmVyZW5jZXMgYXJlIG1pc3NpbmcgdGhlIFwiLmRlZmF1bHRcIiBhY2Nlc3MuIFRoaXMgaGFwcGVucyB0byB3b3JrIGZvciB0c2lja2xlIGNvZGVcbiAgICAgICAgLy8gICAgd2l0aCBnb29nLm1vZHVsZSB0cmFuc2Zvcm1hdGlvbnMgYXMgdHNpY2tsZSBzdHJpcHMgdGhlIFwiLmRlZmF1bHRcIiBhbnl3YXkuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIDQuIEl0J3MgcG9zc2libGUgdG8gdHJpY2sgVHlwZVNjcmlwdCBieSBzZXR0aW5nIGB0cy5Ob2RlRmxhZy5TeW50aGVzaXplZGAgb24gdGhlIGltcG9ydFxuICAgICAgICAvLyAgICBkZWNsYXJhdGlvbi4gVGhpcyBjYXVzZXMgdGhlIGltcG9ydCB0byBiZSBjb3JyZWN0bHkgcmV0YWluZWQgYW5kIGdlbmVyYXRlZCwgYnV0IGNhblxuICAgICAgICAvLyAgICB2aW9sYXRlIGludmFyaWFudHMgZWxzZXdoZXJlIGluIHRoZSBjb21waWxlciBhbmQgY2F1c2UgY3Jhc2hlcy5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gNS4gVXNpbmcgYHRzLmdldE11dGFibGVDbG9uZWAgc2VlbXMgdG8gY29ycmVjdGx5IHByZXNlcnZlIHRoZSBpbXBvcnQgYW5kIGNvcnJlY3RseVxuICAgICAgICAvLyAgICBnZW5lcmF0ZSByZWZlcmVuY2VzIHRvIHRoZSBpbXBvcnQgdmFyaWFibGUgYWNyb3NzIGFsbCBtb2R1bGUgdHlwZXMuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRoZXJlZm9yZSwgb3B0aW9uIDUgaXMgdGhlIG9uZSB1c2VkIGhlcmUuIEl0IHNlZW1zIHRvIGJlIGltcGxlbWVudGVkIGFzIHRoZSBjb3JyZWN0IHdheVxuICAgICAgICAvLyB0byBwZXJmb3JtIG9wdGlvbiA0LCB3aGljaCBwcmVzZXJ2ZXMgYWxsIHRoZSBjb21waWxlcidzIGludmFyaWFudHMuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRPRE8oYWx4aHViKTogZGlzY3VzcyB3aXRoIHRoZSBUeXBlU2NyaXB0IHRlYW0gYW5kIGRldGVybWluZSBpZiB0aGVyZSdzIGEgYmV0dGVyIHdheSB0b1xuICAgICAgICAvLyBkZWFsIHdpdGggdGhpcyBpc3N1ZS5cbiAgICAgICAgc3RtdCA9IHRzLmdldE11dGFibGVDbG9uZShzdG10KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdG10O1xuICAgIH0pO1xuXG4gICAgLy8gU2F2ZSBtZW1vcnkgLSB0aGVyZSdzIG5vIG5lZWQgdG8ga2VlcCB0aGVzZSBhcm91bmQgb25jZSB0aGUgdHJhbnNmb3JtIGhhcyBydW4gZm9yIHRoZSBnaXZlblxuICAgIC8vIGZpbGUuXG4gICAgdGhpcy5zb3VyY2VGaWxlVG9JbXBvcnRNYXAuZGVsZXRlKG9yaWdpbmFsU2YpO1xuICAgIHRoaXMuc291cmNlRmlsZVRvVXNlZEltcG9ydHMuZGVsZXRlKG9yaWdpbmFsU2YpO1xuXG4gICAgcmV0dXJuIHRzLnVwZGF0ZVNvdXJjZUZpbGVOb2RlKHNmLCBzdGF0ZW1lbnRzKTtcbiAgfVxufVxuIl19