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
                    var diagnostic = tslib_1.__assign(tslib_1.__assign({ category: ts.DiagnosticCategory.Error, code: diagnostics_1.ngErrorCode(diagnostics_1.ErrorCode.SYMBOL_NOT_EXPORTED), file: transitiveReference.getSourceFile() }, getPosOfDeclaration(transitiveReference)), { messageText: "Unsupported private " + descriptor + " " + name_1 + ". This " + descriptor + " is visible to consumers via " + visibleVia + ", but is not exported from the top-level library entrypoint." });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJpdmF0ZV9leHBvcnRfY2hlY2tlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZW50cnlfcG9pbnQvc3JjL3ByaXZhdGVfZXhwb3J0X2NoZWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQywyRUFBeUQ7SUFJekQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQXFCRztJQUNILFNBQWdCLHNCQUFzQixDQUNsQyxVQUF5QixFQUFFLE9BQXVCLEVBQUUsUUFBd0I7UUFDOUUsSUFBTSxXQUFXLEdBQW9CLEVBQUUsQ0FBQztRQUV4Qyx1RkFBdUY7UUFDdkYsSUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFFbEQsbURBQW1EO1FBQ25ELElBQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM3RCxJQUFJLFlBQVksS0FBSyxTQUFTLEVBQUU7WUFDOUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxxREFBcUQsQ0FBQyxDQUFDO1NBQ3hFO1FBQ0QsSUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRWpFLDRGQUE0RjtRQUM1Rix3RUFBd0U7UUFDeEUsZUFBZSxDQUFDLE9BQU8sQ0FBQyxVQUFBLE1BQU07WUFDNUIsSUFBSSxNQUFNLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFO2dCQUN2QyxNQUFNLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQzNDO1lBQ0QsSUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDO1lBQ3JDLElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtnQkFDdEIsZUFB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LENBQUM7U0FDYjtJQUNILENBQUM7SUFFRCxTQUFTLG9CQUFvQixDQUFDLElBQW9CO1FBQ2hELElBQU0sRUFBRSxHQUFHLDBCQUEwQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVDLE9BQU8sRUFBRSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDO0lBQzdDLENBQUM7SUFFRCxTQUFTLDBCQUEwQixDQUFDLElBQW9CO1FBQ3RELFFBQVEsSUFBSSxDQUFDLElBQUksRUFBRTtZQUNqQixLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCO2dCQUNqQyxPQUFPLE9BQU8sQ0FBQztZQUNqQixLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsbUJBQW1CO2dCQUNwQyxPQUFPLFVBQVUsQ0FBQztZQUNwQixLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsbUJBQW1CO2dCQUNwQyxPQUFPLFVBQVUsQ0FBQztZQUNwQixLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsZUFBZTtnQkFDaEMsT0FBTyxNQUFNLENBQUM7WUFDaEI7Z0JBQ0UsT0FBTyxhQUFhLENBQUM7U0FDeEI7SUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIG5nRXJyb3JDb2RlfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5cbmltcG9ydCB7UmVmZXJlbmNlR3JhcGh9IGZyb20gJy4vcmVmZXJlbmNlX2dyYXBoJztcblxuLyoqXG4gKiBQcm9kdWNlIGB0cy5EaWFnbm9zdGljYHMgZm9yIGNsYXNzZXMgdGhhdCBhcmUgdmlzaWJsZSBmcm9tIGV4cG9ydGVkIHR5cGVzIChlLmcuIGRpcmVjdGl2ZXNcbiAqIGV4cG9zZWQgYnkgZXhwb3J0ZWQgYE5nTW9kdWxlYHMpIHRoYXQgYXJlIG5vdCB0aGVtc2VsdmVzIGV4cG9ydGVkLlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gcmVjb25jaWxlcyB0d28gY29uY2VwdHM6XG4gKlxuICogQSBjbGFzcyBpcyBFeHBvcnRlZCBpZiBpdCdzIGV4cG9ydGVkIGZyb20gdGhlIG1haW4gbGlicmFyeSBgZW50cnlQb2ludGAgZmlsZS5cbiAqIEEgY2xhc3MgaXMgVmlzaWJsZSBpZiwgdmlhIEFuZ3VsYXIgc2VtYW50aWNzLCBhIGRvd25zdHJlYW0gY29uc3VtZXIgY2FuIGltcG9ydCBhbiBFeHBvcnRlZCBjbGFzc1xuICogYW5kIGJlIGFmZmVjdGVkIGJ5IHRoZSBjbGFzcyBpbiBxdWVzdGlvbi4gRm9yIGV4YW1wbGUsIGFuIEV4cG9ydGVkIE5nTW9kdWxlIG1heSBleHBvc2UgYVxuICogZGlyZWN0aXZlIGNsYXNzIHRvIGl0cyBjb25zdW1lcnMuIENvbnN1bWVycyB0aGF0IGltcG9ydCB0aGUgTmdNb2R1bGUgbWF5IGhhdmUgdGhlIGRpcmVjdGl2ZVxuICogYXBwbGllZCB0byBlbGVtZW50cyBpbiB0aGVpciB0ZW1wbGF0ZXMuIEluIHRoaXMgY2FzZSwgdGhlIGRpcmVjdGl2ZSBpcyBjb25zaWRlcmVkIFZpc2libGUuXG4gKlxuICogYGNoZWNrRm9yUHJpdmF0ZUV4cG9ydHNgIGF0dGVtcHRzIHRvIHZlcmlmeSB0aGF0IGFsbCBWaXNpYmxlIGNsYXNzZXMgYXJlIEV4cG9ydGVkLCBhbmQgcmVwb3J0XG4gKiBgdHMuRGlhZ25vc3RpY2BzIGZvciB0aG9zZSB0aGF0IGFyZW4ndC5cbiAqXG4gKiBAcGFyYW0gZW50cnlQb2ludCBgdHMuU291cmNlRmlsZWAgb2YgdGhlIGxpYnJhcnkncyBlbnRyeXBvaW50LCB3aGljaCBzaG91bGQgZXhwb3J0IHRoZSBsaWJyYXJ5J3NcbiAqIHB1YmxpYyBBUEkuXG4gKiBAcGFyYW0gY2hlY2tlciBgdHMuVHlwZUNoZWNrZXJgIGZvciB0aGUgY3VycmVudCBwcm9ncmFtLlxuICogQHBhcmFtIHJlZkdyYXBoIGBSZWZlcmVuY2VHcmFwaGAgdHJhY2tpbmcgdGhlIHZpc2liaWxpdHkgb2YgQW5ndWxhciB0eXBlcy5cbiAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGB0cy5EaWFnbm9zdGljYHMgcmVwcmVzZW50aW5nIGVycm9ycyB3aGVuIHZpc2libGUgY2xhc3NlcyBhcmUgbm90IGV4cG9ydGVkXG4gKiBwcm9wZXJseS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrRm9yUHJpdmF0ZUV4cG9ydHMoXG4gICAgZW50cnlQb2ludDogdHMuU291cmNlRmlsZSwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsIHJlZkdyYXBoOiBSZWZlcmVuY2VHcmFwaCk6IHRzLkRpYWdub3N0aWNbXSB7XG4gIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcblxuICAvLyBGaXJzdGx5LCBjb21wdXRlIHRoZSBleHBvcnRzIG9mIHRoZSBlbnRyeSBwb2ludC4gVGhlc2UgYXJlIGFsbCB0aGUgRXhwb3J0ZWQgY2xhc3Nlcy5cbiAgY29uc3QgdG9wTGV2ZWxFeHBvcnRzID0gbmV3IFNldDx0cy5EZWNsYXJhdGlvbj4oKTtcblxuICAvLyBEbyB0aGlzIHZpYSBgdHMuVHlwZUNoZWNrZXIuZ2V0RXhwb3J0c09mTW9kdWxlYC5cbiAgY29uc3QgbW9kdWxlU3ltYm9sID0gY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGVudHJ5UG9pbnQpO1xuICBpZiAobW9kdWxlU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludGVybmFsIGVycm9yOiBmYWlsZWQgdG8gZ2V0IHN5bWJvbCBmb3IgZW50cnlwb2ludGApO1xuICB9XG4gIGNvbnN0IGV4cG9ydGVkU3ltYm9scyA9IGNoZWNrZXIuZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZVN5bWJvbCk7XG5cbiAgLy8gTG9vcCB0aHJvdWdoIHRoZSBleHBvcnRlZCBzeW1ib2xzLCBkZS1hbGlhcyBpZiBuZWVkZWQsIGFuZCBhZGQgdGhlbSB0byBgdG9wTGV2ZWxFeHBvcnRzYC5cbiAgLy8gVE9ETyhhbHhodWIpOiB1c2UgcHJvcGVyIGl0ZXJhdGlvbiB3aGVuIGJ1aWxkLnNoIGlzIHJlbW92ZWQuICgjMjc3NjIpXG4gIGV4cG9ydGVkU3ltYm9scy5mb3JFYWNoKHN5bWJvbCA9PiB7XG4gICAgaWYgKHN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLkFsaWFzKSB7XG4gICAgICBzeW1ib2wgPSBjaGVja2VyLmdldEFsaWFzZWRTeW1ib2woc3ltYm9sKTtcbiAgICB9XG4gICAgY29uc3QgZGVjbCA9IHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgIGlmIChkZWNsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRvcExldmVsRXhwb3J0cy5hZGQoZGVjbCk7XG4gICAgfVxuICB9KTtcblxuICAvLyBOZXh0LCBnbyB0aHJvdWdoIGVhY2ggZXhwb3J0ZWQgY2xhc3MgYW5kIGV4cGFuZCBpdCB0byB0aGUgc2V0IG9mIGNsYXNzZXMgaXQgbWFrZXMgVmlzaWJsZSxcbiAgLy8gdXNpbmcgdGhlIGBSZWZlcmVuY2VHcmFwaGAuIEZvciBlYWNoIFZpc2libGUgY2xhc3MsIHZlcmlmeSB0aGF0IGl0J3MgYWxzbyBFeHBvcnRlZCwgYW5kIHF1ZXVlXG4gIC8vIGFuIGVycm9yIGlmIGl0IGlzbid0LiBgY2hlY2tlZFNldGAgZW5zdXJlcyBvbmx5IG9uZSBlcnJvciBpcyBxdWV1ZWQgcGVyIGNsYXNzLlxuICBjb25zdCBjaGVja2VkU2V0ID0gbmV3IFNldDx0cy5EZWNsYXJhdGlvbj4oKTtcblxuICAvLyBMb29wIHRocm91Z2ggZWFjaCBFeHBvcnRlZCBjbGFzcy5cbiAgLy8gVE9ETyhhbHhodWIpOiB1c2UgcHJvcGVyIGl0ZXJhdGlvbiB3aGVuIHRoZSBsZWdhY3kgYnVpbGQgaXMgcmVtb3ZlZC4gKCMyNzc2MilcbiAgdG9wTGV2ZWxFeHBvcnRzLmZvckVhY2gobWFpbkV4cG9ydCA9PiB7XG4gICAgLy8gTG9vcCB0aHJvdWdoIGVhY2ggY2xhc3MgbWFkZSBWaXNpYmxlIGJ5IHRoZSBFeHBvcnRlZCBjbGFzcy5cbiAgICByZWZHcmFwaC50cmFuc2l0aXZlUmVmZXJlbmNlc09mKG1haW5FeHBvcnQpLmZvckVhY2godHJhbnNpdGl2ZVJlZmVyZW5jZSA9PiB7XG4gICAgICAvLyBTa2lwIGNsYXNzZXMgd2hpY2ggaGF2ZSBhbHJlYWR5IGJlZW4gY2hlY2tlZC5cbiAgICAgIGlmIChjaGVja2VkU2V0Lmhhcyh0cmFuc2l0aXZlUmVmZXJlbmNlKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjaGVja2VkU2V0LmFkZCh0cmFuc2l0aXZlUmVmZXJlbmNlKTtcblxuICAgICAgLy8gVmVyaWZ5IHRoYXQgdGhlIFZpc2libGUgY2xhc3MgaXMgYWxzbyBFeHBvcnRlZC5cbiAgICAgIGlmICghdG9wTGV2ZWxFeHBvcnRzLmhhcyh0cmFuc2l0aXZlUmVmZXJlbmNlKSkge1xuICAgICAgICAvLyBUaGlzIGlzIGFuIGVycm9yLCBgbWFpbkV4cG9ydGAgbWFrZXMgYHRyYW5zaXRpdmVSZWZlcmVuY2VgIFZpc2libGUsIGJ1dFxuICAgICAgICAvLyBgdHJhbnNpdGl2ZVJlZmVyZW5jZWAgaXMgbm90IEV4cG9ydGVkIGZyb20gdGhlIGVudHJ5cG9pbnQuIENvbnN0cnVjdCBhIGRpYWdub3N0aWMgdG9cbiAgICAgICAgLy8gZ2l2ZSB0byB0aGUgdXNlciBleHBsYWluaW5nIHRoZSBzaXR1YXRpb24uXG5cbiAgICAgICAgY29uc3QgZGVzY3JpcHRvciA9IGdldERlc2NyaXB0b3JPZkRlY2xhcmF0aW9uKHRyYW5zaXRpdmVSZWZlcmVuY2UpO1xuICAgICAgICBjb25zdCBuYW1lID0gZ2V0TmFtZU9mRGVjbGFyYXRpb24odHJhbnNpdGl2ZVJlZmVyZW5jZSk7XG5cbiAgICAgICAgLy8gQ29uc3RydWN0IHRoZSBwYXRoIG9mIHZpc2liaWxpdHksIGZyb20gYG1haW5FeHBvcnRgIHRvIGB0cmFuc2l0aXZlUmVmZXJlbmNlYC5cbiAgICAgICAgbGV0IHZpc2libGVWaWEgPSAnTmdNb2R1bGUgZXhwb3J0cyc7XG4gICAgICAgIGNvbnN0IHRyYW5zaXRpdmVQYXRoID0gcmVmR3JhcGgucGF0aEZyb20obWFpbkV4cG9ydCwgdHJhbnNpdGl2ZVJlZmVyZW5jZSk7XG4gICAgICAgIGlmICh0cmFuc2l0aXZlUGF0aCAhPT0gbnVsbCkge1xuICAgICAgICAgIHZpc2libGVWaWEgPSB0cmFuc2l0aXZlUGF0aC5tYXAoc2VnID0+IGdldE5hbWVPZkRlY2xhcmF0aW9uKHNlZykpLmpvaW4oJyAtPiAnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGRpYWdub3N0aWM6IHRzLkRpYWdub3N0aWMgPSB7XG4gICAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgICBjb2RlOiBuZ0Vycm9yQ29kZShFcnJvckNvZGUuU1lNQk9MX05PVF9FWFBPUlRFRCksXG4gICAgICAgICAgZmlsZTogdHJhbnNpdGl2ZVJlZmVyZW5jZS5nZXRTb3VyY2VGaWxlKCksXG4gICAgICAgICAgLi4uZ2V0UG9zT2ZEZWNsYXJhdGlvbih0cmFuc2l0aXZlUmVmZXJlbmNlKSxcbiAgICAgICAgICBtZXNzYWdlVGV4dDogYFVuc3VwcG9ydGVkIHByaXZhdGUgJHtkZXNjcmlwdG9yfSAke25hbWV9LiBUaGlzICR7XG4gICAgICAgICAgICAgIGRlc2NyaXB0b3J9IGlzIHZpc2libGUgdG8gY29uc3VtZXJzIHZpYSAke1xuICAgICAgICAgICAgICB2aXNpYmxlVmlhfSwgYnV0IGlzIG5vdCBleHBvcnRlZCBmcm9tIHRoZSB0b3AtbGV2ZWwgbGlicmFyeSBlbnRyeXBvaW50LmAsXG4gICAgICAgIH07XG5cbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaChkaWFnbm9zdGljKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIGRpYWdub3N0aWNzO1xufVxuXG5mdW5jdGlvbiBnZXRQb3NPZkRlY2xhcmF0aW9uKGRlY2w6IHRzLkRlY2xhcmF0aW9uKToge3N0YXJ0OiBudW1iZXIsIGxlbmd0aDogbnVtYmVyfSB7XG4gIGNvbnN0IG5vZGU6IHRzLk5vZGUgPSBnZXRJZGVudGlmaWVyT2ZEZWNsYXJhdGlvbihkZWNsKSB8fCBkZWNsO1xuICByZXR1cm4ge1xuICAgIHN0YXJ0OiBub2RlLmdldFN0YXJ0KCksXG4gICAgbGVuZ3RoOiBub2RlLmdldEVuZCgpICsgMSAtIG5vZGUuZ2V0U3RhcnQoKSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0SWRlbnRpZmllck9mRGVjbGFyYXRpb24oZGVjbDogdHMuRGVjbGFyYXRpb24pOiB0cy5JZGVudGlmaWVyfG51bGwge1xuICBpZiAoKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihkZWNsKSB8fCB0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oZGVjbCkgfHxcbiAgICAgICB0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24oZGVjbCkpICYmXG4gICAgICBkZWNsLm5hbWUgIT09IHVuZGVmaW5lZCAmJiB0cy5pc0lkZW50aWZpZXIoZGVjbC5uYW1lKSkge1xuICAgIHJldHVybiBkZWNsLm5hbWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0TmFtZU9mRGVjbGFyYXRpb24oZGVjbDogdHMuRGVjbGFyYXRpb24pOiBzdHJpbmcge1xuICBjb25zdCBpZCA9IGdldElkZW50aWZpZXJPZkRlY2xhcmF0aW9uKGRlY2wpO1xuICByZXR1cm4gaWQgIT09IG51bGwgPyBpZC50ZXh0IDogJyh1bm5hbWVkKSc7XG59XG5cbmZ1bmN0aW9uIGdldERlc2NyaXB0b3JPZkRlY2xhcmF0aW9uKGRlY2w6IHRzLkRlY2xhcmF0aW9uKTogc3RyaW5nIHtcbiAgc3dpdGNoIChkZWNsLmtpbmQpIHtcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuQ2xhc3NEZWNsYXJhdGlvbjpcbiAgICAgIHJldHVybiAnY2xhc3MnO1xuICAgIGNhc2UgdHMuU3ludGF4S2luZC5GdW5jdGlvbkRlY2xhcmF0aW9uOlxuICAgICAgcmV0dXJuICdmdW5jdGlvbic7XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLlZhcmlhYmxlRGVjbGFyYXRpb246XG4gICAgICByZXR1cm4gJ3ZhcmlhYmxlJztcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuRW51bURlY2xhcmF0aW9uOlxuICAgICAgcmV0dXJuICdlbnVtJztcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuICdkZWNsYXJhdGlvbic7XG4gIH1cbn1cbiJdfQ==