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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3dpdGNoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9zd2l0Y2gvc3JjL3N3aXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsSUFBTSxxQkFBcUIsR0FBRyxZQUFZLENBQUM7SUFDM0MsSUFBTSxzQkFBc0IsR0FBRyxhQUFhLENBQUM7SUFFN0MsU0FBZ0Isa0JBQWtCLENBQUMsQ0FBMkI7UUFDNUQsT0FBTyxtQkFBbUIsQ0FBQztJQUM3QixDQUFDO0lBRkQsZ0RBRUM7SUFFRCxTQUFTLG1CQUFtQixDQUFDLEVBQWlCO1FBQzVDLCtGQUErRjtRQUMvRixnR0FBZ0c7UUFDaEcsSUFBSSxhQUFhLEdBQTZCLFNBQVMsQ0FBQztRQUV4RCwyQ0FBMkM7UUFDM0MsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzdDLElBQU0sU0FBUyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFbkMsd0RBQXdEO1lBQ3hELElBQUksQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEVBQUU7Z0JBQ3BFLFNBQVM7YUFDVjtZQUVELDJGQUEyRjtZQUMzRixvREFBb0Q7WUFDcEQsSUFBSSxhQUFhLEtBQUssU0FBUyxFQUFFO2dCQUMvQixhQUFhLG9CQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQzthQUNwQztZQUVELHlGQUF5RjtZQUN6RixpREFBaUQ7WUFDakQsYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHLGtDQUFrQyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsVUFB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Q0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLEVBRGpELENBQ2lELENBQUMsQ0FBQztJQUNqRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuY29uc3QgSVZZX1NXSVRDSF9QUkVfU1VGRklYID0gJ19fUFJFX1IzX18nO1xuY29uc3QgSVZZX1NXSVRDSF9QT1NUX1NVRkZJWCA9ICdfX1BPU1RfUjNfXyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBpdnlTd2l0Y2hUcmFuc2Zvcm0oXzogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0KTogdHMuVHJhbnNmb3JtZXI8dHMuU291cmNlRmlsZT4ge1xuICByZXR1cm4gZmxpcEl2eVN3aXRjaEluRmlsZTtcbn1cblxuZnVuY3Rpb24gZmxpcEl2eVN3aXRjaEluRmlsZShzZjogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGUge1xuICAvLyBUbyByZXBsYWNlIHRoZSBzdGF0ZW1lbnRzIGFycmF5LCBpdCBtdXN0IGJlIGNvcGllZC4gVGhpcyBvbmx5IG5lZWRzIHRvIGhhcHBlbiBpZiBhIHN0YXRlbWVudFxuICAvLyBtdXN0IGFjdHVhbGx5IGJlIHJlcGxhY2VkIHdpdGhpbiB0aGUgYXJyYXksIHNvIHRoZSBuZXdTdGF0ZW1lbnRzIGFycmF5IGlzIGxhemlseSBpbml0aWFsaXplZC5cbiAgbGV0IG5ld1N0YXRlbWVudHM6IHRzLlN0YXRlbWVudFtdfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICAvLyBJdGVyYXRlIG92ZXIgdGhlIHN0YXRlbWVudHMgaW4gdGhlIGZpbGUuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc2Yuc3RhdGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHN0YXRlbWVudCA9IHNmLnN0YXRlbWVudHNbaV07XG5cbiAgICAvLyBTa2lwIG92ZXIgZXZlcnl0aGluZyB0aGF0IGlzbid0IGEgdmFyaWFibGUgc3RhdGVtZW50LlxuICAgIGlmICghdHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdGF0ZW1lbnQpIHx8ICFoYXNJdnlTd2l0Y2hlcyhzdGF0ZW1lbnQpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBUaGlzIHN0YXRlbWVudCBuZWVkcyB0byBiZSByZXBsYWNlZC4gQ2hlY2sgaWYgdGhlIG5ld1N0YXRlbWVudHMgYXJyYXkgbmVlZHMgdG8gYmUgbGF6aWx5XG4gICAgLy8gaW5pdGlhbGl6ZWQgdG8gYSBjb3B5IG9mIHRoZSBvcmlnaW5hbCBzdGF0ZW1lbnRzLlxuICAgIGlmIChuZXdTdGF0ZW1lbnRzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIG5ld1N0YXRlbWVudHMgPSBbLi4uc2Yuc3RhdGVtZW50c107XG4gICAgfVxuXG4gICAgLy8gRmxpcCBhbnkgc3dpdGNoZXMgaW4gdGhlIFZhcmlhYmxlU3RhdGVtZW50LiBJZiB0aGVyZSB3ZXJlIGFueSwgYSBuZXcgc3RhdGVtZW50IHdpbGwgYmVcbiAgICAvLyByZXR1cm5lZDsgb3RoZXJ3aXNlIHRoZSBvbGQgc3RhdGVtZW50IHdpbGwgYmUuXG4gICAgbmV3U3RhdGVtZW50c1tpXSA9IGZsaXBJdnlTd2l0Y2hlc0luVmFyaWFibGVTdGF0ZW1lbnQoc3RhdGVtZW50LCBzZi5zdGF0ZW1lbnRzKTtcbiAgfVxuXG4gIC8vIE9ubHkgdXBkYXRlIHRoZSBzdGF0ZW1lbnRzIGluIHRoZSBTb3VyY2VGaWxlIGlmIGFueSBoYXZlIGNoYW5nZWQuXG4gIGlmIChuZXdTdGF0ZW1lbnRzICE9PSB1bmRlZmluZWQpIHtcbiAgICBzZi5zdGF0ZW1lbnRzID0gdHMuY3JlYXRlTm9kZUFycmF5KG5ld1N0YXRlbWVudHMpO1xuICB9XG4gIHJldHVybiBzZjtcbn1cblxuLyoqXG4gKiBMb29rIGZvciB0aGUgdHMuSWRlbnRpZmllciBvZiBhIHRzLkRlY2xhcmF0aW9uIHdpdGggdGhpcyBuYW1lLlxuICpcbiAqIFRoZSByZWFsIGlkZW50aWZpZXIgaXMgbmVlZGVkIChyYXRoZXIgdGhhbiBmYWJyaWNhdGluZyBvbmUpIGFzIFR5cGVTY3JpcHQgZGVjaWRlcyBob3cgdG9cbiAqIHJlZmVyZW5jZSB0aGlzIGlkZW50aWZpZXIgYmFzZWQgb24gaW5mb3JtYXRpb24gc3RvcmVkIGFnYWluc3QgaXRzIG5vZGUgaW4gdGhlIEFTVCwgd2hpY2ggYVxuICogc3ludGhldGljIG5vZGUgd291bGQgbm90IGhhdmUuIEluIHBhcnRpY3VsYXIsIHNpbmNlIHRoZSBwb3N0LXN3aXRjaCB2YXJpYWJsZSBpcyBvZnRlbiBleHBvcnRlZCxcbiAqIFR5cGVTY3JpcHQgbmVlZHMgdG8ga25vdyB0aGlzIHNvIGl0IGNhbiB3cml0ZSBgZXhwb3J0cy5WQVJgIGluc3RlYWQgb2YganVzdCBgVkFSYCB3aGVuIGVtaXR0aW5nXG4gKiBjb2RlLlxuICpcbiAqIE9ubHkgdmFyaWFibGUsIGZ1bmN0aW9uLCBhbmQgY2xhc3MgZGVjbGFyYXRpb25zIGFyZSBjdXJyZW50bHkgc2VhcmNoZWQuXG4gKi9cbmZ1bmN0aW9uIGZpbmRQb3N0U3dpdGNoSWRlbnRpZmllcihcbiAgICBzdGF0ZW1lbnRzOiBSZWFkb25seUFycmF5PHRzLlN0YXRlbWVudD4sIG5hbWU6IHN0cmluZyk6IHRzLklkZW50aWZpZXJ8bnVsbCB7XG4gIGZvciAoY29uc3Qgc3RtdCBvZiBzdGF0ZW1lbnRzKSB7XG4gICAgaWYgKHRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoc3RtdCkpIHtcbiAgICAgIGNvbnN0IGRlY2wgPSBzdG10LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnMuZmluZChcbiAgICAgICAgICBkZWNsID0+IHRzLmlzSWRlbnRpZmllcihkZWNsLm5hbWUpICYmIGRlY2wubmFtZS50ZXh0ID09PSBuYW1lKTtcbiAgICAgIGlmIChkZWNsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIGRlY2wubmFtZSBhcyB0cy5JZGVudGlmaWVyO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKHN0bXQpIHx8IHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihzdG10KSkge1xuICAgICAgaWYgKHN0bXQubmFtZSAhPT0gdW5kZWZpbmVkICYmIHRzLmlzSWRlbnRpZmllcihzdG10Lm5hbWUpICYmIHN0bXQubmFtZS50ZXh0ID09PSBuYW1lKSB7XG4gICAgICAgIHJldHVybiBzdG10Lm5hbWU7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIEZsaXAgYW55IEl2eSBzd2l0Y2hlcyB3aGljaCBhcmUgZGlzY292ZXJlZCBpbiB0aGUgZ2l2ZW4gdHMuVmFyaWFibGVTdGF0ZW1lbnQuXG4gKi9cbmZ1bmN0aW9uIGZsaXBJdnlTd2l0Y2hlc0luVmFyaWFibGVTdGF0ZW1lbnQoXG4gICAgc3RtdDogdHMuVmFyaWFibGVTdGF0ZW1lbnQsIHN0YXRlbWVudHM6IFJlYWRvbmx5QXJyYXk8dHMuU3RhdGVtZW50Pik6IHRzLlZhcmlhYmxlU3RhdGVtZW50IHtcbiAgLy8gQnVpbGQgYSBuZXcgbGlzdCBvZiB2YXJpYWJsZSBkZWNsYXJhdGlvbnMuIFNwZWNpZmljIGRlY2xhcmF0aW9ucyB0aGF0IGFyZSBpbml0aWFsaXplZCB0byBhXG4gIC8vIHByZS1zd2l0Y2ggaWRlbnRpZmllciB3aWxsIGJlIHJlcGxhY2VkIHdpdGggYSBkZWNsYXJhdGlvbiBpbml0aWFsaXplZCB0byB0aGUgcG9zdC1zd2l0Y2hcbiAgLy8gaWRlbnRpZmllci5cbiAgY29uc3QgbmV3RGVjbGFyYXRpb25zID0gWy4uLnN0bXQuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9uc107XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbmV3RGVjbGFyYXRpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgZGVjbCA9IG5ld0RlY2xhcmF0aW9uc1tpXTtcblxuICAgIC8vIFNraXAgZGVjbGFyYXRpb25zIHRoYXQgYXJlbid0IGluaXRpYWxpemVkIHRvIGFuIGlkZW50aWZpZXIuXG4gICAgaWYgKGRlY2wuaW5pdGlhbGl6ZXIgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNJZGVudGlmaWVyKGRlY2wuaW5pdGlhbGl6ZXIpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBTa2lwIGRlY2xhcmF0aW9ucyB0aGF0IGFyZW4ndCBJdnkgc3dpdGNoZXMuXG4gICAgaWYgKCFkZWNsLmluaXRpYWxpemVyLnRleHQuZW5kc1dpdGgoSVZZX1NXSVRDSF9QUkVfU1VGRklYKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gRGV0ZXJtaW5lIHRoZSBuYW1lIG9mIHRoZSBwb3N0LXN3aXRjaCB2YXJpYWJsZS5cbiAgICBjb25zdCBwb3N0U3dpdGNoTmFtZSA9XG4gICAgICAgIGRlY2wuaW5pdGlhbGl6ZXIudGV4dC5yZXBsYWNlKElWWV9TV0lUQ0hfUFJFX1NVRkZJWCwgSVZZX1NXSVRDSF9QT1NUX1NVRkZJWCk7XG5cbiAgICAvLyBGaW5kIHRoZSBwb3N0LXN3aXRjaCB2YXJpYWJsZSBpZGVudGlmaWVyLiBJZiBvbmUgY2FuJ3QgYmUgZm91bmQsIGl0J3MgYW4gZXJyb3IuIFRoaXMgaXNcbiAgICAvLyByZXBvcnRlZCBhcyBhIHRocm93biBlcnJvciBhbmQgbm90IGEgZGlhZ25vc3RpYyBhcyB0cmFuc2Zvcm1lcnMgY2Fubm90IG91dHB1dCBkaWFnbm9zdGljcy5cbiAgICBsZXQgbmV3SWRlbnRpZmllciA9IGZpbmRQb3N0U3dpdGNoSWRlbnRpZmllcihzdGF0ZW1lbnRzLCBwb3N0U3dpdGNoTmFtZSk7XG4gICAgaWYgKG5ld0lkZW50aWZpZXIgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgVW5hYmxlIHRvIGZpbmQgaWRlbnRpZmllciAke3Bvc3RTd2l0Y2hOYW1lfSBpbiAke3N0bXQuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lfSBmb3IgdGhlIEl2eSBzd2l0Y2guYCk7XG4gICAgfVxuXG4gICAgLy8gQ29weSB0aGUgaWRlbnRpZmllciB3aXRoIHVwZGF0ZUlkZW50aWZpZXIoKS4gVGhpcyBjb3BpZXMgdGhlIGludGVybmFsIGluZm9ybWF0aW9uIHdoaWNoXG4gICAgLy8gYWxsb3dzIFRTIHRvIHdyaXRlIGEgY29ycmVjdCByZWZlcmVuY2UgdG8gdGhlIGlkZW50aWZpZXIuXG4gICAgbmV3SWRlbnRpZmllciA9IHRzLnVwZGF0ZUlkZW50aWZpZXIobmV3SWRlbnRpZmllcik7XG5cbiAgICBuZXdEZWNsYXJhdGlvbnNbaV0gPSB0cy51cGRhdGVWYXJpYWJsZURlY2xhcmF0aW9uKFxuICAgICAgICAvKiBub2RlICovIGRlY2wsXG4gICAgICAgIC8qIG5hbWUgKi8gZGVjbC5uYW1lLFxuICAgICAgICAvKiB0eXBlICovIGRlY2wudHlwZSxcbiAgICAgICAgLyogaW5pdGlhbGl6ZXIgKi8gbmV3SWRlbnRpZmllcik7XG5cbiAgICAvLyBLZWVwaW5nIHBhcmVudCBwb2ludGVycyB1cCB0byBkYXRlIGlzIGltcG9ydGFudCBmb3IgZW1pdC5cbiAgICBuZXdJZGVudGlmaWVyLnBhcmVudCA9IG5ld0RlY2xhcmF0aW9uc1tpXTtcbiAgfVxuXG4gIGNvbnN0IG5ld0RlY2xMaXN0ID0gdHMudXBkYXRlVmFyaWFibGVEZWNsYXJhdGlvbkxpc3QoXG4gICAgICAvKiBkZWNsYXJhdGlvbkxpc3QgKi8gc3RtdC5kZWNsYXJhdGlvbkxpc3QsXG4gICAgICAvKiBkZWNsYXJhdGlvbnMgKi8gbmV3RGVjbGFyYXRpb25zKTtcblxuICBjb25zdCBuZXdTdG10ID0gdHMudXBkYXRlVmFyaWFibGVTdGF0ZW1lbnQoXG4gICAgICAvKiBzdGF0ZW1lbnQgKi8gc3RtdCxcbiAgICAgIC8qIG1vZGlmaWVycyAqLyBzdG10Lm1vZGlmaWVycyxcbiAgICAgIC8qIGRlY2xhcmF0aW9uTGlzdCAqLyBuZXdEZWNsTGlzdCk7XG5cbiAgLy8gS2VlcGluZyBwYXJlbnQgcG9pbnRlcnMgdXAgdG8gZGF0ZSBpcyBpbXBvcnRhbnQgZm9yIGVtaXQuXG4gIGZvciAoY29uc3QgZGVjbCBvZiBuZXdEZWNsYXJhdGlvbnMpIHtcbiAgICBkZWNsLnBhcmVudCA9IG5ld0RlY2xMaXN0O1xuICB9XG4gIG5ld0RlY2xMaXN0LnBhcmVudCA9IG5ld1N0bXQ7XG4gIG5ld1N0bXQucGFyZW50ID0gc3RtdC5wYXJlbnQ7XG4gIHJldHVybiBuZXdTdG10O1xufVxuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgdGhlIGdpdmVuIFZhcmlhYmxlU3RhdGVtZW50IGhhcyBhbnkgSXZ5IHN3aXRjaCB2YXJpYWJsZXMuXG4gKi9cbmZ1bmN0aW9uIGhhc0l2eVN3aXRjaGVzKHN0bXQ6IHRzLlZhcmlhYmxlU3RhdGVtZW50KSB7XG4gIHJldHVybiBzdG10LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnMuc29tZShcbiAgICAgIGRlY2wgPT4gZGVjbC5pbml0aWFsaXplciAhPT0gdW5kZWZpbmVkICYmIHRzLmlzSWRlbnRpZmllcihkZWNsLmluaXRpYWxpemVyKSAmJlxuICAgICAgICAgIGRlY2wuaW5pdGlhbGl6ZXIudGV4dC5lbmRzV2l0aChJVllfU1dJVENIX1BSRV9TVUZGSVgpKTtcbn1cbiJdfQ==