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
        define("@angular/compiler-cli/src/ngtsc/entry_point/src/private_export_checker", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.checkForPrivateExports = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    /**
     * Produce `ts.Diagnostic`s for classes that are visible from exported types (e.g. directives
     * exposed by exported `NgModule`s) that are not themselves exported.
     *
     * This function reconciles two concepts:
     *
     * A class is Exported if it's exported from the main library `entryPoint` file.
     * A class is Visible if, via Angular semantics, a downstream consumer can import an Exported class
     * and be affected by the class in question. For example, an Exported NgModule may expose a
     * directive class to its consumers. Consumers that import the NgModule may have the directive
     * applied to elements in their templates. In this case, the directive is considered Visible.
     *
     * `checkForPrivateExports` attempts to verify that all Visible classes are Exported, and report
     * `ts.Diagnostic`s for those that aren't.
     *
     * @param entryPoint `ts.SourceFile` of the library's entrypoint, which should export the library's
     * public API.
     * @param checker `ts.TypeChecker` for the current program.
     * @param refGraph `ReferenceGraph` tracking the visibility of Angular types.
     * @returns an array of `ts.Diagnostic`s representing errors when visible classes are not exported
     * properly.
     */
    function checkForPrivateExports(entryPoint, checker, refGraph) {
        var diagnostics = [];
        // Firstly, compute the exports of the entry point. These are all the Exported classes.
        var topLevelExports = new Set();
        // Do this via `ts.TypeChecker.getExportsOfModule`.
        var moduleSymbol = checker.getSymbolAtLocation(entryPoint);
        if (moduleSymbol === undefined) {
            throw new Error("Internal error: failed to get symbol for entrypoint");
        }
        var exportedSymbols = checker.getExportsOfModule(moduleSymbol);
        // Loop through the exported symbols, de-alias if needed, and add them to `topLevelExports`.
        // TODO(alxhub): use proper iteration when build.sh is removed. (#27762)
        exportedSymbols.forEach(function (symbol) {
            if (symbol.flags & ts.SymbolFlags.Alias) {
                symbol = checker.getAliasedSymbol(symbol);
            }
            var decl = symbol.valueDeclaration;
            if (decl !== undefined) {
                topLevelExports.add(decl);
            }
        });
        // Next, go through each exported class and expand it to the set of classes it makes Visible,
        // using the `ReferenceGraph`. For each Visible class, verify that it's also Exported, and queue
        // an error if it isn't. `checkedSet` ensures only one error is queued per class.
        var checkedSet = new Set();
        // Loop through each Exported class.
        // TODO(alxhub): use proper iteration when the legacy build is removed. (#27762)
        topLevelExports.forEach(function (mainExport) {
            // Loop through each class made Visible by the Exported class.
            refGraph.transitiveReferencesOf(mainExport).forEach(function (transitiveReference) {
                // Skip classes which have already been checked.
                if (checkedSet.has(transitiveReference)) {
                    return;
                }
                checkedSet.add(transitiveReference);
                // Verify that the Visible class is also Exported.
                if (!topLevelExports.has(transitiveReference)) {
                    // This is an error, `mainExport` makes `transitiveReference` Visible, but
                    // `transitiveReference` is not Exported from the entrypoint. Construct a diagnostic to
                    // give to the user explaining the situation.
                    var descriptor = getDescriptorOfDeclaration(transitiveReference);
                    var name_1 = getNameOfDeclaration(transitiveReference);
                    // Construct the path of visibility, from `mainExport` to `transitiveReference`.
                    var visibleVia = 'NgModule exports';
                    var transitivePath = refGraph.pathFrom(mainExport, transitiveReference);
                    if (transitivePath !== null) {
                        visibleVia = transitivePath.map(function (seg) { return getNameOfDeclaration(seg); }).join(' -> ');
                    }
                    var diagnostic = (0, tslib_1.__assign)((0, tslib_1.__assign)({ category: ts.DiagnosticCategory.Error, code: (0, diagnostics_1.ngErrorCode)(diagnostics_1.ErrorCode.SYMBOL_NOT_EXPORTED), file: transitiveReference.getSourceFile() }, getPosOfDeclaration(transitiveReference)), { messageText: "Unsupported private " + descriptor + " " + name_1 + ". This " + descriptor + " is visible to consumers via " + visibleVia + ", but is not exported from the top-level library entrypoint." });
                    diagnostics.push(diagnostic);
                }
            });
        });
        return diagnostics;
    }
    exports.checkForPrivateExports = checkForPrivateExports;
    function getPosOfDeclaration(decl) {
        var node = getIdentifierOfDeclaration(decl) || decl;
        return {
            start: node.getStart(),
            length: node.getEnd() + 1 - node.getStart(),
        };
    }
    function getIdentifierOfDeclaration(decl) {
        if ((ts.isClassDeclaration(decl) || ts.isVariableDeclaration(decl) ||
            ts.isFunctionDeclaration(decl)) &&
            decl.name !== undefined && ts.isIdentifier(decl.name)) {
            return decl.name;
        }
        else {
            return null;
        }
    }
    function getNameOfDeclaration(decl) {
        var id = getIdentifierOfDeclaration(decl);
        return id !== null ? id.text : '(unnamed)';
    }
    function getDescriptorOfDeclaration(decl) {
        switch (decl.kind) {
            case ts.SyntaxKind.ClassDeclaration:
                return 'class';
            case ts.SyntaxKind.FunctionDeclaration:
                return 'function';
            case ts.SyntaxKind.VariableDeclaration:
                return 'variable';
            case ts.SyntaxKind.EnumDeclaration:
                return 'enum';
            default:
                return 'declaration';
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJpdmF0ZV9leHBvcnRfY2hlY2tlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZW50cnlfcG9pbnQvc3JjL3ByaXZhdGVfZXhwb3J0X2NoZWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQywyRUFBeUQ7SUFLekQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQXFCRztJQUNILFNBQWdCLHNCQUFzQixDQUNsQyxVQUF5QixFQUFFLE9BQXVCLEVBQUUsUUFBd0I7UUFDOUUsSUFBTSxXQUFXLEdBQW9CLEVBQUUsQ0FBQztRQUV4Qyx1RkFBdUY7UUFDdkYsSUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLEVBQW1CLENBQUM7UUFFbkQsbURBQW1EO1FBQ25ELElBQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM3RCxJQUFJLFlBQVksS0FBSyxTQUFTLEVBQUU7WUFDOUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxxREFBcUQsQ0FBQyxDQUFDO1NBQ3hFO1FBQ0QsSUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRWpFLDRGQUE0RjtRQUM1Rix3RUFBd0U7UUFDeEUsZUFBZSxDQUFDLE9BQU8sQ0FBQyxVQUFBLE1BQU07WUFDNUIsSUFBSSxNQUFNLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFO2dCQUN2QyxNQUFNLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQzNDO1lBQ0QsSUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDO1lBQ3JDLElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtnQkFDdEIsZUFB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LElBQUksQ0FBQztTQUNiO0lBQ0gsQ0FBQztJQUVELFNBQVMsb0JBQW9CLENBQUMsSUFBcUI7UUFDakQsSUFBTSxFQUFFLEdBQUcsMEJBQTBCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUMsT0FBTyxFQUFFLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUM7SUFDN0MsQ0FBQztJQUVELFNBQVMsMEJBQTBCLENBQUMsSUFBcUI7UUFDdkQsUUFBUSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ2pCLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0I7Z0JBQ2pDLE9BQU8sT0FBTyxDQUFDO1lBQ2pCLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxtQkFBbUI7Z0JBQ3BDLE9BQU8sVUFBVSxDQUFDO1lBQ3BCLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxtQkFBbUI7Z0JBQ3BDLE9BQU8sVUFBVSxDQUFDO1lBQ3BCLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxlQUFlO2dCQUNoQyxPQUFPLE1BQU0sQ0FBQztZQUNoQjtnQkFDRSxPQUFPLGFBQWEsQ0FBQztTQUN4QjtJQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXJyb3JDb2RlLCBuZ0Vycm9yQ29kZX0gZnJvbSAnLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtEZWNsYXJhdGlvbk5vZGV9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuXG5pbXBvcnQge1JlZmVyZW5jZUdyYXBofSBmcm9tICcuL3JlZmVyZW5jZV9ncmFwaCc7XG5cbi8qKlxuICogUHJvZHVjZSBgdHMuRGlhZ25vc3RpY2BzIGZvciBjbGFzc2VzIHRoYXQgYXJlIHZpc2libGUgZnJvbSBleHBvcnRlZCB0eXBlcyAoZS5nLiBkaXJlY3RpdmVzXG4gKiBleHBvc2VkIGJ5IGV4cG9ydGVkIGBOZ01vZHVsZWBzKSB0aGF0IGFyZSBub3QgdGhlbXNlbHZlcyBleHBvcnRlZC5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHJlY29uY2lsZXMgdHdvIGNvbmNlcHRzOlxuICpcbiAqIEEgY2xhc3MgaXMgRXhwb3J0ZWQgaWYgaXQncyBleHBvcnRlZCBmcm9tIHRoZSBtYWluIGxpYnJhcnkgYGVudHJ5UG9pbnRgIGZpbGUuXG4gKiBBIGNsYXNzIGlzIFZpc2libGUgaWYsIHZpYSBBbmd1bGFyIHNlbWFudGljcywgYSBkb3duc3RyZWFtIGNvbnN1bWVyIGNhbiBpbXBvcnQgYW4gRXhwb3J0ZWQgY2xhc3NcbiAqIGFuZCBiZSBhZmZlY3RlZCBieSB0aGUgY2xhc3MgaW4gcXVlc3Rpb24uIEZvciBleGFtcGxlLCBhbiBFeHBvcnRlZCBOZ01vZHVsZSBtYXkgZXhwb3NlIGFcbiAqIGRpcmVjdGl2ZSBjbGFzcyB0byBpdHMgY29uc3VtZXJzLiBDb25zdW1lcnMgdGhhdCBpbXBvcnQgdGhlIE5nTW9kdWxlIG1heSBoYXZlIHRoZSBkaXJlY3RpdmVcbiAqIGFwcGxpZWQgdG8gZWxlbWVudHMgaW4gdGhlaXIgdGVtcGxhdGVzLiBJbiB0aGlzIGNhc2UsIHRoZSBkaXJlY3RpdmUgaXMgY29uc2lkZXJlZCBWaXNpYmxlLlxuICpcbiAqIGBjaGVja0ZvclByaXZhdGVFeHBvcnRzYCBhdHRlbXB0cyB0byB2ZXJpZnkgdGhhdCBhbGwgVmlzaWJsZSBjbGFzc2VzIGFyZSBFeHBvcnRlZCwgYW5kIHJlcG9ydFxuICogYHRzLkRpYWdub3N0aWNgcyBmb3IgdGhvc2UgdGhhdCBhcmVuJ3QuXG4gKlxuICogQHBhcmFtIGVudHJ5UG9pbnQgYHRzLlNvdXJjZUZpbGVgIG9mIHRoZSBsaWJyYXJ5J3MgZW50cnlwb2ludCwgd2hpY2ggc2hvdWxkIGV4cG9ydCB0aGUgbGlicmFyeSdzXG4gKiBwdWJsaWMgQVBJLlxuICogQHBhcmFtIGNoZWNrZXIgYHRzLlR5cGVDaGVja2VyYCBmb3IgdGhlIGN1cnJlbnQgcHJvZ3JhbS5cbiAqIEBwYXJhbSByZWZHcmFwaCBgUmVmZXJlbmNlR3JhcGhgIHRyYWNraW5nIHRoZSB2aXNpYmlsaXR5IG9mIEFuZ3VsYXIgdHlwZXMuXG4gKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgdHMuRGlhZ25vc3RpY2BzIHJlcHJlc2VudGluZyBlcnJvcnMgd2hlbiB2aXNpYmxlIGNsYXNzZXMgYXJlIG5vdCBleHBvcnRlZFxuICogcHJvcGVybHkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjaGVja0ZvclByaXZhdGVFeHBvcnRzKFxuICAgIGVudHJ5UG9pbnQ6IHRzLlNvdXJjZUZpbGUsIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCByZWZHcmFwaDogUmVmZXJlbmNlR3JhcGgpOiB0cy5EaWFnbm9zdGljW10ge1xuICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG5cbiAgLy8gRmlyc3RseSwgY29tcHV0ZSB0aGUgZXhwb3J0cyBvZiB0aGUgZW50cnkgcG9pbnQuIFRoZXNlIGFyZSBhbGwgdGhlIEV4cG9ydGVkIGNsYXNzZXMuXG4gIGNvbnN0IHRvcExldmVsRXhwb3J0cyA9IG5ldyBTZXQ8RGVjbGFyYXRpb25Ob2RlPigpO1xuXG4gIC8vIERvIHRoaXMgdmlhIGB0cy5UeXBlQ2hlY2tlci5nZXRFeHBvcnRzT2ZNb2R1bGVgLlxuICBjb25zdCBtb2R1bGVTeW1ib2wgPSBjaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oZW50cnlQb2ludCk7XG4gIGlmIChtb2R1bGVTeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW50ZXJuYWwgZXJyb3I6IGZhaWxlZCB0byBnZXQgc3ltYm9sIGZvciBlbnRyeXBvaW50YCk7XG4gIH1cbiAgY29uc3QgZXhwb3J0ZWRTeW1ib2xzID0gY2hlY2tlci5nZXRFeHBvcnRzT2ZNb2R1bGUobW9kdWxlU3ltYm9sKTtcblxuICAvLyBMb29wIHRocm91Z2ggdGhlIGV4cG9ydGVkIHN5bWJvbHMsIGRlLWFsaWFzIGlmIG5lZWRlZCwgYW5kIGFkZCB0aGVtIHRvIGB0b3BMZXZlbEV4cG9ydHNgLlxuICAvLyBUT0RPKGFseGh1Yik6IHVzZSBwcm9wZXIgaXRlcmF0aW9uIHdoZW4gYnVpbGQuc2ggaXMgcmVtb3ZlZC4gKCMyNzc2MilcbiAgZXhwb3J0ZWRTeW1ib2xzLmZvckVhY2goc3ltYm9sID0+IHtcbiAgICBpZiAoc3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQWxpYXMpIHtcbiAgICAgIHN5bWJvbCA9IGNoZWNrZXIuZ2V0QWxpYXNlZFN5bWJvbChzeW1ib2wpO1xuICAgIH1cbiAgICBjb25zdCBkZWNsID0gc3ltYm9sLnZhbHVlRGVjbGFyYXRpb247XG4gICAgaWYgKGRlY2wgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdG9wTGV2ZWxFeHBvcnRzLmFkZChkZWNsKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIE5leHQsIGdvIHRocm91Z2ggZWFjaCBleHBvcnRlZCBjbGFzcyBhbmQgZXhwYW5kIGl0IHRvIHRoZSBzZXQgb2YgY2xhc3NlcyBpdCBtYWtlcyBWaXNpYmxlLFxuICAvLyB1c2luZyB0aGUgYFJlZmVyZW5jZUdyYXBoYC4gRm9yIGVhY2ggVmlzaWJsZSBjbGFzcywgdmVyaWZ5IHRoYXQgaXQncyBhbHNvIEV4cG9ydGVkLCBhbmQgcXVldWVcbiAgLy8gYW4gZXJyb3IgaWYgaXQgaXNuJ3QuIGBjaGVja2VkU2V0YCBlbnN1cmVzIG9ubHkgb25lIGVycm9yIGlzIHF1ZXVlZCBwZXIgY2xhc3MuXG4gIGNvbnN0IGNoZWNrZWRTZXQgPSBuZXcgU2V0PERlY2xhcmF0aW9uTm9kZT4oKTtcblxuICAvLyBMb29wIHRocm91Z2ggZWFjaCBFeHBvcnRlZCBjbGFzcy5cbiAgLy8gVE9ETyhhbHhodWIpOiB1c2UgcHJvcGVyIGl0ZXJhdGlvbiB3aGVuIHRoZSBsZWdhY3kgYnVpbGQgaXMgcmVtb3ZlZC4gKCMyNzc2MilcbiAgdG9wTGV2ZWxFeHBvcnRzLmZvckVhY2gobWFpbkV4cG9ydCA9PiB7XG4gICAgLy8gTG9vcCB0aHJvdWdoIGVhY2ggY2xhc3MgbWFkZSBWaXNpYmxlIGJ5IHRoZSBFeHBvcnRlZCBjbGFzcy5cbiAgICByZWZHcmFwaC50cmFuc2l0aXZlUmVmZXJlbmNlc09mKG1haW5FeHBvcnQpLmZvckVhY2godHJhbnNpdGl2ZVJlZmVyZW5jZSA9PiB7XG4gICAgICAvLyBTa2lwIGNsYXNzZXMgd2hpY2ggaGF2ZSBhbHJlYWR5IGJlZW4gY2hlY2tlZC5cbiAgICAgIGlmIChjaGVja2VkU2V0Lmhhcyh0cmFuc2l0aXZlUmVmZXJlbmNlKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjaGVja2VkU2V0LmFkZCh0cmFuc2l0aXZlUmVmZXJlbmNlKTtcblxuICAgICAgLy8gVmVyaWZ5IHRoYXQgdGhlIFZpc2libGUgY2xhc3MgaXMgYWxzbyBFeHBvcnRlZC5cbiAgICAgIGlmICghdG9wTGV2ZWxFeHBvcnRzLmhhcyh0cmFuc2l0aXZlUmVmZXJlbmNlKSkge1xuICAgICAgICAvLyBUaGlzIGlzIGFuIGVycm9yLCBgbWFpbkV4cG9ydGAgbWFrZXMgYHRyYW5zaXRpdmVSZWZlcmVuY2VgIFZpc2libGUsIGJ1dFxuICAgICAgICAvLyBgdHJhbnNpdGl2ZVJlZmVyZW5jZWAgaXMgbm90IEV4cG9ydGVkIGZyb20gdGhlIGVudHJ5cG9pbnQuIENvbnN0cnVjdCBhIGRpYWdub3N0aWMgdG9cbiAgICAgICAgLy8gZ2l2ZSB0byB0aGUgdXNlciBleHBsYWluaW5nIHRoZSBzaXR1YXRpb24uXG5cbiAgICAgICAgY29uc3QgZGVzY3JpcHRvciA9IGdldERlc2NyaXB0b3JPZkRlY2xhcmF0aW9uKHRyYW5zaXRpdmVSZWZlcmVuY2UpO1xuICAgICAgICBjb25zdCBuYW1lID0gZ2V0TmFtZU9mRGVjbGFyYXRpb24odHJhbnNpdGl2ZVJlZmVyZW5jZSk7XG5cbiAgICAgICAgLy8gQ29uc3RydWN0IHRoZSBwYXRoIG9mIHZpc2liaWxpdHksIGZyb20gYG1haW5FeHBvcnRgIHRvIGB0cmFuc2l0aXZlUmVmZXJlbmNlYC5cbiAgICAgICAgbGV0IHZpc2libGVWaWEgPSAnTmdNb2R1bGUgZXhwb3J0cyc7XG4gICAgICAgIGNvbnN0IHRyYW5zaXRpdmVQYXRoID0gcmVmR3JhcGgucGF0aEZyb20obWFpbkV4cG9ydCwgdHJhbnNpdGl2ZVJlZmVyZW5jZSk7XG4gICAgICAgIGlmICh0cmFuc2l0aXZlUGF0aCAhPT0gbnVsbCkge1xuICAgICAgICAgIHZpc2libGVWaWEgPSB0cmFuc2l0aXZlUGF0aC5tYXAoc2VnID0+IGdldE5hbWVPZkRlY2xhcmF0aW9uKHNlZykpLmpvaW4oJyAtPiAnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGRpYWdub3N0aWM6IHRzLkRpYWdub3N0aWMgPSB7XG4gICAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgICBjb2RlOiBuZ0Vycm9yQ29kZShFcnJvckNvZGUuU1lNQk9MX05PVF9FWFBPUlRFRCksXG4gICAgICAgICAgZmlsZTogdHJhbnNpdGl2ZVJlZmVyZW5jZS5nZXRTb3VyY2VGaWxlKCksXG4gICAgICAgICAgLi4uZ2V0UG9zT2ZEZWNsYXJhdGlvbih0cmFuc2l0aXZlUmVmZXJlbmNlKSxcbiAgICAgICAgICBtZXNzYWdlVGV4dDogYFVuc3VwcG9ydGVkIHByaXZhdGUgJHtkZXNjcmlwdG9yfSAke25hbWV9LiBUaGlzICR7XG4gICAgICAgICAgICAgIGRlc2NyaXB0b3J9IGlzIHZpc2libGUgdG8gY29uc3VtZXJzIHZpYSAke1xuICAgICAgICAgICAgICB2aXNpYmxlVmlhfSwgYnV0IGlzIG5vdCBleHBvcnRlZCBmcm9tIHRoZSB0b3AtbGV2ZWwgbGlicmFyeSBlbnRyeXBvaW50LmAsXG4gICAgICAgIH07XG5cbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaChkaWFnbm9zdGljKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIGRpYWdub3N0aWNzO1xufVxuXG5mdW5jdGlvbiBnZXRQb3NPZkRlY2xhcmF0aW9uKGRlY2w6IERlY2xhcmF0aW9uTm9kZSk6IHtzdGFydDogbnVtYmVyLCBsZW5ndGg6IG51bWJlcn0ge1xuICBjb25zdCBub2RlOiB0cy5Ob2RlID0gZ2V0SWRlbnRpZmllck9mRGVjbGFyYXRpb24oZGVjbCkgfHwgZGVjbDtcbiAgcmV0dXJuIHtcbiAgICBzdGFydDogbm9kZS5nZXRTdGFydCgpLFxuICAgIGxlbmd0aDogbm9kZS5nZXRFbmQoKSArIDEgLSBub2RlLmdldFN0YXJ0KCksXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldElkZW50aWZpZXJPZkRlY2xhcmF0aW9uKGRlY2w6IERlY2xhcmF0aW9uTm9kZSk6IHRzLklkZW50aWZpZXJ8bnVsbCB7XG4gIGlmICgodHMuaXNDbGFzc0RlY2xhcmF0aW9uKGRlY2wpIHx8IHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihkZWNsKSB8fFxuICAgICAgIHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihkZWNsKSkgJiZcbiAgICAgIGRlY2wubmFtZSAhPT0gdW5kZWZpbmVkICYmIHRzLmlzSWRlbnRpZmllcihkZWNsLm5hbWUpKSB7XG4gICAgcmV0dXJuIGRlY2wubmFtZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXROYW1lT2ZEZWNsYXJhdGlvbihkZWNsOiBEZWNsYXJhdGlvbk5vZGUpOiBzdHJpbmcge1xuICBjb25zdCBpZCA9IGdldElkZW50aWZpZXJPZkRlY2xhcmF0aW9uKGRlY2wpO1xuICByZXR1cm4gaWQgIT09IG51bGwgPyBpZC50ZXh0IDogJyh1bm5hbWVkKSc7XG59XG5cbmZ1bmN0aW9uIGdldERlc2NyaXB0b3JPZkRlY2xhcmF0aW9uKGRlY2w6IERlY2xhcmF0aW9uTm9kZSk6IHN0cmluZyB7XG4gIHN3aXRjaCAoZGVjbC5raW5kKSB7XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLkNsYXNzRGVjbGFyYXRpb246XG4gICAgICByZXR1cm4gJ2NsYXNzJztcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuRnVuY3Rpb25EZWNsYXJhdGlvbjpcbiAgICAgIHJldHVybiAnZnVuY3Rpb24nO1xuICAgIGNhc2UgdHMuU3ludGF4S2luZC5WYXJpYWJsZURlY2xhcmF0aW9uOlxuICAgICAgcmV0dXJuICd2YXJpYWJsZSc7XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLkVudW1EZWNsYXJhdGlvbjpcbiAgICAgIHJldHVybiAnZW51bSc7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiAnZGVjbGFyYXRpb24nO1xuICB9XG59XG4iXX0=