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
        define("@angular/compiler-cli/src/ngtsc/switch/src/switch", ["require", "exports", "tslib", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var IVY_SWITCH_PRE_SUFFIX = '__PRE_R3__';
    var IVY_SWITCH_POST_SUFFIX = '__POST_R3__';
    function ivySwitchTransform(_) {
        return flipIvySwitchInFile;
    }
    exports.ivySwitchTransform = ivySwitchTransform;
    function flipIvySwitchInFile(sf) {
        // To replace the statements array, it must be copied. This only needs to happen if a statement
        // must actually be replaced within the array, so the newStatements array is lazily initialized.
        var newStatements = undefined;
        // Iterate over the statements in the file.
        for (var i = 0; i < sf.statements.length; i++) {
            var statement = sf.statements[i];
            // Skip over everything that isn't a variable statement.
            if (!ts.isVariableStatement(statement) || !hasIvySwitches(statement)) {
                continue;
            }
            // This statement needs to be replaced. Check if the newStatements array needs to be lazily
            // initialized to a copy of the original statements.
            if (newStatements === undefined) {
                newStatements = tslib_1.__spread(sf.statements);
            }
            // Flip any switches in the VariableStatement. If there were any, a new statement will be
            // returned; otherwise the old statement will be.
            newStatements[i] = flipIvySwitchesInVariableStatement(statement, sf.statements);
        }
        // Only update the statements in the SourceFile if any have changed.
        if (newStatements !== undefined) {
            sf = ts.getMutableClone(sf);
            sf.statements = ts.createNodeArray(newStatements);
        }
        return sf;
    }
    /**
     * Look for the ts.Identifier of a ts.Declaration with this name.
     *
     * The real identifier is needed (rather than fabricating one) as TypeScript decides how to
     * reference this identifier based on information stored against its node in the AST, which a
     * synthetic node would not have. In particular, since the post-switch variable is often exported,
     * TypeScript needs to know this so it can write `exports.VAR` instead of just `VAR` when emitting
     * code.
     *
     * Only variable, function, and class declarations are currently searched.
     */
    function findPostSwitchIdentifier(statements, name) {
        var e_1, _a;
        try {
            for (var statements_1 = tslib_1.__values(statements), statements_1_1 = statements_1.next(); !statements_1_1.done; statements_1_1 = statements_1.next()) {
                var stmt = statements_1_1.value;
                if (ts.isVariableStatement(stmt)) {
                    var decl = stmt.declarationList.declarations.find(function (decl) { return ts.isIdentifier(decl.name) && decl.name.text === name; });
                    if (decl !== undefined) {
                        return decl.name;
                    }
                }
                else if (ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) {
                    if (stmt.name !== undefined && ts.isIdentifier(stmt.name) && stmt.name.text === name) {
                        return stmt.name;
                    }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (statements_1_1 && !statements_1_1.done && (_a = statements_1.return)) _a.call(statements_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return null;
    }
    /**
     * Flip any Ivy switches which are discovered in the given ts.VariableStatement.
     */
    function flipIvySwitchesInVariableStatement(stmt, statements) {
        var e_2, _a;
        // Build a new list of variable declarations. Specific declarations that are initialized to a
        // pre-switch identifier will be replaced with a declaration initialized to the post-switch
        // identifier.
        var newDeclarations = tslib_1.__spread(stmt.declarationList.declarations);
        for (var i = 0; i < newDeclarations.length; i++) {
            var decl = newDeclarations[i];
            // Skip declarations that aren't initialized to an identifier.
            if (decl.initializer === undefined || !ts.isIdentifier(decl.initializer)) {
                continue;
            }
            // Skip declarations that aren't Ivy switches.
            if (!decl.initializer.text.endsWith(IVY_SWITCH_PRE_SUFFIX)) {
                continue;
            }
            // Determine the name of the post-switch variable.
            var postSwitchName = decl.initializer.text.replace(IVY_SWITCH_PRE_SUFFIX, IVY_SWITCH_POST_SUFFIX);
            // Find the post-switch variable identifier. If one can't be found, it's an error. This is
            // reported as a thrown error and not a diagnostic as transformers cannot output diagnostics.
            var newIdentifier = findPostSwitchIdentifier(statements, postSwitchName);
            if (newIdentifier === null) {
                throw new Error("Unable to find identifier " + postSwitchName + " in " + stmt.getSourceFile().fileName + " for the Ivy switch.");
            }
            // Copy the identifier with updateIdentifier(). This copies the internal information which
            // allows TS to write a correct reference to the identifier.
            newIdentifier = ts.updateIdentifier(newIdentifier);
            newDeclarations[i] = ts.updateVariableDeclaration(
            /* node */ decl, 
            /* name */ decl.name, 
            /* type */ decl.type, 
            /* initializer */ newIdentifier);
            // Keeping parent pointers up to date is important for emit.
            newIdentifier.parent = newDeclarations[i];
        }
        var newDeclList = ts.updateVariableDeclarationList(
        /* declarationList */ stmt.declarationList, 
        /* declarations */ newDeclarations);
        var newStmt = ts.updateVariableStatement(
        /* statement */ stmt, 
        /* modifiers */ stmt.modifiers, 
        /* declarationList */ newDeclList);
        try {
            // Keeping parent pointers up to date is important for emit.
            for (var newDeclarations_1 = tslib_1.__values(newDeclarations), newDeclarations_1_1 = newDeclarations_1.next(); !newDeclarations_1_1.done; newDeclarations_1_1 = newDeclarations_1.next()) {
                var decl = newDeclarations_1_1.value;
                decl.parent = newDeclList;
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (newDeclarations_1_1 && !newDeclarations_1_1.done && (_a = newDeclarations_1.return)) _a.call(newDeclarations_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        newDeclList.parent = newStmt;
        newStmt.parent = stmt.parent;
        return newStmt;
    }
    /**
     * Check whether the given VariableStatement has any Ivy switch variables.
     */
    function hasIvySwitches(stmt) {
        return stmt.declarationList.declarations.some(function (decl) { return decl.initializer !== undefined && ts.isIdentifier(decl.initializer) &&
            decl.initializer.text.endsWith(IVY_SWITCH_PRE_SUFFIX); });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3dpdGNoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9zd2l0Y2gvc3JjL3N3aXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsSUFBTSxxQkFBcUIsR0FBRyxZQUFZLENBQUM7SUFDM0MsSUFBTSxzQkFBc0IsR0FBRyxhQUFhLENBQUM7SUFFN0MsU0FBZ0Isa0JBQWtCLENBQUMsQ0FBMkI7UUFDNUQsT0FBTyxtQkFBbUIsQ0FBQztJQUM3QixDQUFDO0lBRkQsZ0RBRUM7SUFFRCxTQUFTLG1CQUFtQixDQUFDLEVBQWlCO1FBQzVDLCtGQUErRjtRQUMvRixnR0FBZ0c7UUFDaEcsSUFBSSxhQUFhLEdBQTZCLFNBQVMsQ0FBQztRQUV4RCwyQ0FBMkM7UUFDM0MsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzdDLElBQU0sU0FBUyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFbkMsd0RBQXdEO1lBQ3hELElBQUksQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEVBQUU7Z0JBQ3BFLFNBQVM7YUFDVjtZQUVELDJGQUEyRjtZQUMzRixvREFBb0Q7WUFDcEQsSUFBSSxhQUFhLEtBQUssU0FBUyxFQUFFO2dCQUMvQixhQUFhLG9CQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQzthQUNwQztZQUVELHlGQUF5RjtZQUN6RixpREFBaUQ7WUFDakQsYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHLGtDQUFrQyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsVUFB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WUFBWSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUM7WUFDdkUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLEVBRGpELENBQ2lELENBQUMsQ0FBQztJQUNqRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuY29uc3QgSVZZX1NXSVRDSF9QUkVfU1VGRklYID0gJ19fUFJFX1IzX18nO1xuY29uc3QgSVZZX1NXSVRDSF9QT1NUX1NVRkZJWCA9ICdfX1BPU1RfUjNfXyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBpdnlTd2l0Y2hUcmFuc2Zvcm0oXzogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0KTogdHMuVHJhbnNmb3JtZXI8dHMuU291cmNlRmlsZT4ge1xuICByZXR1cm4gZmxpcEl2eVN3aXRjaEluRmlsZTtcbn1cblxuZnVuY3Rpb24gZmxpcEl2eVN3aXRjaEluRmlsZShzZjogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGUge1xuICAvLyBUbyByZXBsYWNlIHRoZSBzdGF0ZW1lbnRzIGFycmF5LCBpdCBtdXN0IGJlIGNvcGllZC4gVGhpcyBvbmx5IG5lZWRzIHRvIGhhcHBlbiBpZiBhIHN0YXRlbWVudFxuICAvLyBtdXN0IGFjdHVhbGx5IGJlIHJlcGxhY2VkIHdpdGhpbiB0aGUgYXJyYXksIHNvIHRoZSBuZXdTdGF0ZW1lbnRzIGFycmF5IGlzIGxhemlseSBpbml0aWFsaXplZC5cbiAgbGV0IG5ld1N0YXRlbWVudHM6IHRzLlN0YXRlbWVudFtdfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICAvLyBJdGVyYXRlIG92ZXIgdGhlIHN0YXRlbWVudHMgaW4gdGhlIGZpbGUuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc2Yuc3RhdGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHN0YXRlbWVudCA9IHNmLnN0YXRlbWVudHNbaV07XG5cbiAgICAvLyBTa2lwIG92ZXIgZXZlcnl0aGluZyB0aGF0IGlzbid0IGEgdmFyaWFibGUgc3RhdGVtZW50LlxuICAgIGlmICghdHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdGF0ZW1lbnQpIHx8ICFoYXNJdnlTd2l0Y2hlcyhzdGF0ZW1lbnQpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBUaGlzIHN0YXRlbWVudCBuZWVkcyB0byBiZSByZXBsYWNlZC4gQ2hlY2sgaWYgdGhlIG5ld1N0YXRlbWVudHMgYXJyYXkgbmVlZHMgdG8gYmUgbGF6aWx5XG4gICAgLy8gaW5pdGlhbGl6ZWQgdG8gYSBjb3B5IG9mIHRoZSBvcmlnaW5hbCBzdGF0ZW1lbnRzLlxuICAgIGlmIChuZXdTdGF0ZW1lbnRzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIG5ld1N0YXRlbWVudHMgPSBbLi4uc2Yuc3RhdGVtZW50c107XG4gICAgfVxuXG4gICAgLy8gRmxpcCBhbnkgc3dpdGNoZXMgaW4gdGhlIFZhcmlhYmxlU3RhdGVtZW50LiBJZiB0aGVyZSB3ZXJlIGFueSwgYSBuZXcgc3RhdGVtZW50IHdpbGwgYmVcbiAgICAvLyByZXR1cm5lZDsgb3RoZXJ3aXNlIHRoZSBvbGQgc3RhdGVtZW50IHdpbGwgYmUuXG4gICAgbmV3U3RhdGVtZW50c1tpXSA9IGZsaXBJdnlTd2l0Y2hlc0luVmFyaWFibGVTdGF0ZW1lbnQoc3RhdGVtZW50LCBzZi5zdGF0ZW1lbnRzKTtcbiAgfVxuXG4gIC8vIE9ubHkgdXBkYXRlIHRoZSBzdGF0ZW1lbnRzIGluIHRoZSBTb3VyY2VGaWxlIGlmIGFueSBoYXZlIGNoYW5nZWQuXG4gIGlmIChuZXdTdGF0ZW1lbnRzICE9PSB1bmRlZmluZWQpIHtcbiAgICBzZiA9IHRzLmdldE11dGFibGVDbG9uZShzZik7XG4gICAgc2Yuc3RhdGVtZW50cyA9IHRzLmNyZWF0ZU5vZGVBcnJheShuZXdTdGF0ZW1lbnRzKTtcbiAgfVxuICByZXR1cm4gc2Y7XG59XG5cbi8qKlxuICogTG9vayBmb3IgdGhlIHRzLklkZW50aWZpZXIgb2YgYSB0cy5EZWNsYXJhdGlvbiB3aXRoIHRoaXMgbmFtZS5cbiAqXG4gKiBUaGUgcmVhbCBpZGVudGlmaWVyIGlzIG5lZWRlZCAocmF0aGVyIHRoYW4gZmFicmljYXRpbmcgb25lKSBhcyBUeXBlU2NyaXB0IGRlY2lkZXMgaG93IHRvXG4gKiByZWZlcmVuY2UgdGhpcyBpZGVudGlmaWVyIGJhc2VkIG9uIGluZm9ybWF0aW9uIHN0b3JlZCBhZ2FpbnN0IGl0cyBub2RlIGluIHRoZSBBU1QsIHdoaWNoIGFcbiAqIHN5bnRoZXRpYyBub2RlIHdvdWxkIG5vdCBoYXZlLiBJbiBwYXJ0aWN1bGFyLCBzaW5jZSB0aGUgcG9zdC1zd2l0Y2ggdmFyaWFibGUgaXMgb2Z0ZW4gZXhwb3J0ZWQsXG4gKiBUeXBlU2NyaXB0IG5lZWRzIHRvIGtub3cgdGhpcyBzbyBpdCBjYW4gd3JpdGUgYGV4cG9ydHMuVkFSYCBpbnN0ZWFkIG9mIGp1c3QgYFZBUmAgd2hlbiBlbWl0dGluZ1xuICogY29kZS5cbiAqXG4gKiBPbmx5IHZhcmlhYmxlLCBmdW5jdGlvbiwgYW5kIGNsYXNzIGRlY2xhcmF0aW9ucyBhcmUgY3VycmVudGx5IHNlYXJjaGVkLlxuICovXG5mdW5jdGlvbiBmaW5kUG9zdFN3aXRjaElkZW50aWZpZXIoXG4gICAgc3RhdGVtZW50czogUmVhZG9ubHlBcnJheTx0cy5TdGF0ZW1lbnQ+LCBuYW1lOiBzdHJpbmcpOiB0cy5JZGVudGlmaWVyfG51bGwge1xuICBmb3IgKGNvbnN0IHN0bXQgb2Ygc3RhdGVtZW50cykge1xuICAgIGlmICh0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0bXQpKSB7XG4gICAgICBjb25zdCBkZWNsID0gc3RtdC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zLmZpbmQoXG4gICAgICAgICAgZGVjbCA9PiB0cy5pc0lkZW50aWZpZXIoZGVjbC5uYW1lKSAmJiBkZWNsLm5hbWUudGV4dCA9PT0gbmFtZSk7XG4gICAgICBpZiAoZGVjbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBkZWNsLm5hbWUgYXMgdHMuSWRlbnRpZmllcjtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihzdG10KSB8fCB0cy5pc0NsYXNzRGVjbGFyYXRpb24oc3RtdCkpIHtcbiAgICAgIGlmIChzdG10Lm5hbWUgIT09IHVuZGVmaW5lZCAmJiB0cy5pc0lkZW50aWZpZXIoc3RtdC5uYW1lKSAmJiBzdG10Lm5hbWUudGV4dCA9PT0gbmFtZSkge1xuICAgICAgICByZXR1cm4gc3RtdC5uYW1lO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBGbGlwIGFueSBJdnkgc3dpdGNoZXMgd2hpY2ggYXJlIGRpc2NvdmVyZWQgaW4gdGhlIGdpdmVuIHRzLlZhcmlhYmxlU3RhdGVtZW50LlxuICovXG5mdW5jdGlvbiBmbGlwSXZ5U3dpdGNoZXNJblZhcmlhYmxlU3RhdGVtZW50KFxuICAgIHN0bXQ6IHRzLlZhcmlhYmxlU3RhdGVtZW50LCBzdGF0ZW1lbnRzOiBSZWFkb25seUFycmF5PHRzLlN0YXRlbWVudD4pOiB0cy5WYXJpYWJsZVN0YXRlbWVudCB7XG4gIC8vIEJ1aWxkIGEgbmV3IGxpc3Qgb2YgdmFyaWFibGUgZGVjbGFyYXRpb25zLiBTcGVjaWZpYyBkZWNsYXJhdGlvbnMgdGhhdCBhcmUgaW5pdGlhbGl6ZWQgdG8gYVxuICAvLyBwcmUtc3dpdGNoIGlkZW50aWZpZXIgd2lsbCBiZSByZXBsYWNlZCB3aXRoIGEgZGVjbGFyYXRpb24gaW5pdGlhbGl6ZWQgdG8gdGhlIHBvc3Qtc3dpdGNoXG4gIC8vIGlkZW50aWZpZXIuXG4gIGNvbnN0IG5ld0RlY2xhcmF0aW9ucyA9IFsuLi5zdG10LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnNdO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IG5ld0RlY2xhcmF0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGRlY2wgPSBuZXdEZWNsYXJhdGlvbnNbaV07XG5cbiAgICAvLyBTa2lwIGRlY2xhcmF0aW9ucyB0aGF0IGFyZW4ndCBpbml0aWFsaXplZCB0byBhbiBpZGVudGlmaWVyLlxuICAgIGlmIChkZWNsLmluaXRpYWxpemVyID09PSB1bmRlZmluZWQgfHwgIXRzLmlzSWRlbnRpZmllcihkZWNsLmluaXRpYWxpemVyKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gU2tpcCBkZWNsYXJhdGlvbnMgdGhhdCBhcmVuJ3QgSXZ5IHN3aXRjaGVzLlxuICAgIGlmICghZGVjbC5pbml0aWFsaXplci50ZXh0LmVuZHNXaXRoKElWWV9TV0lUQ0hfUFJFX1NVRkZJWCkpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIERldGVybWluZSB0aGUgbmFtZSBvZiB0aGUgcG9zdC1zd2l0Y2ggdmFyaWFibGUuXG4gICAgY29uc3QgcG9zdFN3aXRjaE5hbWUgPVxuICAgICAgICBkZWNsLmluaXRpYWxpemVyLnRleHQucmVwbGFjZShJVllfU1dJVENIX1BSRV9TVUZGSVgsIElWWV9TV0lUQ0hfUE9TVF9TVUZGSVgpO1xuXG4gICAgLy8gRmluZCB0aGUgcG9zdC1zd2l0Y2ggdmFyaWFibGUgaWRlbnRpZmllci4gSWYgb25lIGNhbid0IGJlIGZvdW5kLCBpdCdzIGFuIGVycm9yLiBUaGlzIGlzXG4gICAgLy8gcmVwb3J0ZWQgYXMgYSB0aHJvd24gZXJyb3IgYW5kIG5vdCBhIGRpYWdub3N0aWMgYXMgdHJhbnNmb3JtZXJzIGNhbm5vdCBvdXRwdXQgZGlhZ25vc3RpY3MuXG4gICAgbGV0IG5ld0lkZW50aWZpZXIgPSBmaW5kUG9zdFN3aXRjaElkZW50aWZpZXIoc3RhdGVtZW50cywgcG9zdFN3aXRjaE5hbWUpO1xuICAgIGlmIChuZXdJZGVudGlmaWVyID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYFVuYWJsZSB0byBmaW5kIGlkZW50aWZpZXIgJHtwb3N0U3dpdGNoTmFtZX0gaW4gJHtzdG10LmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZX0gZm9yIHRoZSBJdnkgc3dpdGNoLmApO1xuICAgIH1cblxuICAgIC8vIENvcHkgdGhlIGlkZW50aWZpZXIgd2l0aCB1cGRhdGVJZGVudGlmaWVyKCkuIFRoaXMgY29waWVzIHRoZSBpbnRlcm5hbCBpbmZvcm1hdGlvbiB3aGljaFxuICAgIC8vIGFsbG93cyBUUyB0byB3cml0ZSBhIGNvcnJlY3QgcmVmZXJlbmNlIHRvIHRoZSBpZGVudGlmaWVyLlxuICAgIG5ld0lkZW50aWZpZXIgPSB0cy51cGRhdGVJZGVudGlmaWVyKG5ld0lkZW50aWZpZXIpO1xuXG4gICAgbmV3RGVjbGFyYXRpb25zW2ldID0gdHMudXBkYXRlVmFyaWFibGVEZWNsYXJhdGlvbihcbiAgICAgICAgLyogbm9kZSAqLyBkZWNsLFxuICAgICAgICAvKiBuYW1lICovIGRlY2wubmFtZSxcbiAgICAgICAgLyogdHlwZSAqLyBkZWNsLnR5cGUsXG4gICAgICAgIC8qIGluaXRpYWxpemVyICovIG5ld0lkZW50aWZpZXIpO1xuXG4gICAgLy8gS2VlcGluZyBwYXJlbnQgcG9pbnRlcnMgdXAgdG8gZGF0ZSBpcyBpbXBvcnRhbnQgZm9yIGVtaXQuXG4gICAgbmV3SWRlbnRpZmllci5wYXJlbnQgPSBuZXdEZWNsYXJhdGlvbnNbaV07XG4gIH1cblxuICBjb25zdCBuZXdEZWNsTGlzdCA9IHRzLnVwZGF0ZVZhcmlhYmxlRGVjbGFyYXRpb25MaXN0KFxuICAgICAgLyogZGVjbGFyYXRpb25MaXN0ICovIHN0bXQuZGVjbGFyYXRpb25MaXN0LFxuICAgICAgLyogZGVjbGFyYXRpb25zICovIG5ld0RlY2xhcmF0aW9ucyk7XG5cbiAgY29uc3QgbmV3U3RtdCA9IHRzLnVwZGF0ZVZhcmlhYmxlU3RhdGVtZW50KFxuICAgICAgLyogc3RhdGVtZW50ICovIHN0bXQsXG4gICAgICAvKiBtb2RpZmllcnMgKi8gc3RtdC5tb2RpZmllcnMsXG4gICAgICAvKiBkZWNsYXJhdGlvbkxpc3QgKi8gbmV3RGVjbExpc3QpO1xuXG4gIC8vIEtlZXBpbmcgcGFyZW50IHBvaW50ZXJzIHVwIHRvIGRhdGUgaXMgaW1wb3J0YW50IGZvciBlbWl0LlxuICBmb3IgKGNvbnN0IGRlY2wgb2YgbmV3RGVjbGFyYXRpb25zKSB7XG4gICAgZGVjbC5wYXJlbnQgPSBuZXdEZWNsTGlzdDtcbiAgfVxuICBuZXdEZWNsTGlzdC5wYXJlbnQgPSBuZXdTdG10O1xuICBuZXdTdG10LnBhcmVudCA9IHN0bXQucGFyZW50O1xuICByZXR1cm4gbmV3U3RtdDtcbn1cblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIHRoZSBnaXZlbiBWYXJpYWJsZVN0YXRlbWVudCBoYXMgYW55IEl2eSBzd2l0Y2ggdmFyaWFibGVzLlxuICovXG5mdW5jdGlvbiBoYXNJdnlTd2l0Y2hlcyhzdG10OiB0cy5WYXJpYWJsZVN0YXRlbWVudCkge1xuICByZXR1cm4gc3RtdC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zLnNvbWUoXG4gICAgICBkZWNsID0+IGRlY2wuaW5pdGlhbGl6ZXIgIT09IHVuZGVmaW5lZCAmJiB0cy5pc0lkZW50aWZpZXIoZGVjbC5pbml0aWFsaXplcikgJiZcbiAgICAgICAgICBkZWNsLmluaXRpYWxpemVyLnRleHQuZW5kc1dpdGgoSVZZX1NXSVRDSF9QUkVfU1VGRklYKSk7XG59XG4iXX0=