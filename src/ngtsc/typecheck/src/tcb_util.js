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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/tcb_util", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/typecheck/src/comments", "@angular/compiler-cli/src/ngtsc/typecheck/src/ts_util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.findSourceLocation = exports.findTypeCheckBlock = exports.getTemplateMapping = exports.requiresInlineTypeCheckBlock = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var comments_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/comments");
    var ts_util_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/ts_util");
    function requiresInlineTypeCheckBlock(node) {
        // In order to qualify for a declared TCB (not inline) two conditions must be met:
        // 1) the class must be exported
        // 2) it must not have constrained generic types
        if (!ts_util_1.checkIfClassIsExported(node)) {
            // Condition 1 is false, the class is not exported.
            return true;
        }
        else if (!ts_util_1.checkIfGenericTypesAreUnbound(node)) {
            // Condition 2 is false, the class has constrained generic types
            return true;
        }
        else {
            return false;
        }
    }
    exports.requiresInlineTypeCheckBlock = requiresInlineTypeCheckBlock;
    /** Maps a shim position back to a template location. */
    function getTemplateMapping(shimSf, position, resolver, isDiagnosticRequest) {
        var node = typescript_1.getTokenAtPosition(shimSf, position);
        var sourceLocation = findSourceLocation(node, shimSf, isDiagnosticRequest);
        if (sourceLocation === null) {
            return null;
        }
        var mapping = resolver.getSourceMapping(sourceLocation.id);
        var span = resolver.toParseSourceSpan(sourceLocation.id, sourceLocation.span);
        if (span === null) {
            return null;
        }
        // TODO(atscott): Consider adding a context span by walking up from `node` until we get a
        // different span.
        return { sourceLocation: sourceLocation, templateSourceMapping: mapping, span: span };
    }
    exports.getTemplateMapping = getTemplateMapping;
    function findTypeCheckBlock(file, id, isDiagnosticRequest) {
        var e_1, _a;
        try {
            for (var _b = tslib_1.__values(file.statements), _c = _b.next(); !_c.done; _c = _b.next()) {
                var stmt = _c.value;
                if (ts.isFunctionDeclaration(stmt) && getTemplateId(stmt, file, isDiagnosticRequest) === id) {
                    return stmt;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return null;
    }
    exports.findTypeCheckBlock = findTypeCheckBlock;
    /**
     * Traverses up the AST starting from the given node to extract the source location from comments
     * that have been emitted into the TCB. If the node does not exist within a TCB, or if an ignore
     * marker comment is found up the tree (and this is part of a diagnostic request), this function
     * returns null.
     */
    function findSourceLocation(node, sourceFile, isDiagnosticsRequest) {
        // Search for comments until the TCB's function declaration is encountered.
        while (node !== undefined && !ts.isFunctionDeclaration(node)) {
            if (comments_1.hasIgnoreForDiagnosticsMarker(node, sourceFile) && isDiagnosticsRequest) {
                // There's an ignore marker on this node, so the diagnostic should not be reported.
                return null;
            }
            var span = comments_1.readSpanComment(node, sourceFile);
            if (span !== null) {
                // Once the positional information has been extracted, search further up the TCB to extract
                // the unique id that is attached with the TCB's function declaration.
                var id = getTemplateId(node, sourceFile, isDiagnosticsRequest);
                if (id === null) {
                    return null;
                }
                return { id: id, span: span };
            }
            node = node.parent;
        }
        return null;
    }
    exports.findSourceLocation = findSourceLocation;
    function getTemplateId(node, sourceFile, isDiagnosticRequest) {
        // Walk up to the function declaration of the TCB, the file information is attached there.
        while (!ts.isFunctionDeclaration(node)) {
            if (comments_1.hasIgnoreForDiagnosticsMarker(node, sourceFile) && isDiagnosticRequest) {
                // There's an ignore marker on this node, so the diagnostic should not be reported.
                return null;
            }
            node = node.parent;
            // Bail once we have reached the root.
            if (node === undefined) {
                return null;
            }
        }
        var start = node.getFullStart();
        return ts.forEachLeadingCommentRange(sourceFile.text, start, function (pos, end, kind) {
            if (kind !== ts.SyntaxKind.MultiLineCommentTrivia) {
                return null;
            }
            var commentText = sourceFile.text.substring(pos + 2, end - 2);
            return commentText;
        }) || null;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGNiX3V0aWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvdGNiX3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUlILCtCQUFpQztJQUVqQyxrRkFBNkQ7SUFHN0QsbUZBQTBFO0lBQzFFLGlGQUFnRjtJQXVCaEYsU0FBZ0IsNEJBQTRCLENBQUMsSUFBMkM7UUFDdEYsa0ZBQWtGO1FBQ2xGLGdDQUFnQztRQUNoQyxnREFBZ0Q7UUFDaEQsSUFBSSxDQUFDLGdDQUFzQixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2pDLG1EQUFtRDtZQUNuRCxPQUFPLElBQUksQ0FBQztTQUNiO2FBQU0sSUFBSSxDQUFDLHVDQUE2QixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQy9DLGdFQUFnRTtZQUNoRSxPQUFPLElBQUksQ0FBQztTQUNiO2FBQU07WUFDTCxPQUFPLEtBQUssQ0FBQztTQUNkO0lBQ0gsQ0FBQztJQWJELG9FQWFDO0lBRUQsd0RBQXdEO0lBQ3hELFNBQWdCLGtCQUFrQixDQUM5QixNQUFxQixFQUFFLFFBQWdCLEVBQUUsUUFBZ0MsRUFDekUsbUJBQTRCO1FBQzlCLElBQU0sSUFBSSxHQUFHLCtCQUFrQixDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNsRCxJQUFNLGNBQWMsR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLG1CQUFtQixDQUFDLENBQUM7UUFDN0UsSUFBSSxjQUFjLEtBQUssSUFBSSxFQUFFO1lBQzNCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxJQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzdELElBQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxpQkFB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QUMsRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDaEUsT0FBTyxXQUFXLENBQUM7UUFDckIsQ0FBQyxDQUFlLElBQUksSUFBSSxDQUFDO0lBQzNCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBYnNvbHV0ZVNvdXJjZVNwYW4sIFBhcnNlU291cmNlU3Bhbn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL3JlZmxlY3Rpb24nO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Z2V0VG9rZW5BdFBvc2l0aW9ufSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcbmltcG9ydCB7RnVsbFRlbXBsYXRlTWFwcGluZywgU291cmNlTG9jYXRpb24sIFRlbXBsYXRlSWQsIFRlbXBsYXRlU291cmNlTWFwcGluZ30gZnJvbSAnLi4vYXBpJztcblxuaW1wb3J0IHtoYXNJZ25vcmVGb3JEaWFnbm9zdGljc01hcmtlciwgcmVhZFNwYW5Db21tZW50fSBmcm9tICcuL2NvbW1lbnRzJztcbmltcG9ydCB7Y2hlY2tJZkNsYXNzSXNFeHBvcnRlZCwgY2hlY2tJZkdlbmVyaWNUeXBlc0FyZVVuYm91bmR9IGZyb20gJy4vdHNfdXRpbCc7XG5cbi8qKlxuICogQWRhcHRlciBpbnRlcmZhY2Ugd2hpY2ggYWxsb3dzIHRoZSB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGRpYWdub3N0aWNzIGNvZGUgdG8gaW50ZXJwcmV0IG9mZnNldHNcbiAqIGluIGEgVENCIGFuZCBtYXAgdGhlbSBiYWNrIHRvIG9yaWdpbmFsIGxvY2F0aW9ucyBpbiB0aGUgdGVtcGxhdGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVTb3VyY2VSZXNvbHZlciB7XG4gIGdldFRlbXBsYXRlSWQobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IFRlbXBsYXRlSWQ7XG5cbiAgLyoqXG4gICAqIEZvciB0aGUgZ2l2ZW4gdGVtcGxhdGUgaWQsIHJldHJpZXZlIHRoZSBvcmlnaW5hbCBzb3VyY2UgbWFwcGluZyB3aGljaCBkZXNjcmliZXMgaG93IHRoZSBvZmZzZXRzXG4gICAqIGluIHRoZSB0ZW1wbGF0ZSBzaG91bGQgYmUgaW50ZXJwcmV0ZWQuXG4gICAqL1xuICBnZXRTb3VyY2VNYXBwaW5nKGlkOiBUZW1wbGF0ZUlkKTogVGVtcGxhdGVTb3VyY2VNYXBwaW5nO1xuXG4gIC8qKlxuICAgKiBDb252ZXJ0IGFuIGFic29sdXRlIHNvdXJjZSBzcGFuIGFzc29jaWF0ZWQgd2l0aCB0aGUgZ2l2ZW4gdGVtcGxhdGUgaWQgaW50byBhIGZ1bGxcbiAgICogYFBhcnNlU291cmNlU3BhbmAuIFRoZSByZXR1cm5lZCBwYXJzZSBzcGFuIGhhcyBsaW5lIGFuZCBjb2x1bW4gbnVtYmVycyBpbiBhZGRpdGlvbiB0byBvbmx5XG4gICAqIGFic29sdXRlIG9mZnNldHMgYW5kIGdpdmVzIGFjY2VzcyB0byB0aGUgb3JpZ2luYWwgdGVtcGxhdGUgc291cmNlLlxuICAgKi9cbiAgdG9QYXJzZVNvdXJjZVNwYW4oaWQ6IFRlbXBsYXRlSWQsIHNwYW46IEFic29sdXRlU291cmNlU3Bhbik6IFBhcnNlU291cmNlU3BhbnxudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVxdWlyZXNJbmxpbmVUeXBlQ2hlY2tCbG9jayhub2RlOiBDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+KTogYm9vbGVhbiB7XG4gIC8vIEluIG9yZGVyIHRvIHF1YWxpZnkgZm9yIGEgZGVjbGFyZWQgVENCIChub3QgaW5saW5lKSB0d28gY29uZGl0aW9ucyBtdXN0IGJlIG1ldDpcbiAgLy8gMSkgdGhlIGNsYXNzIG11c3QgYmUgZXhwb3J0ZWRcbiAgLy8gMikgaXQgbXVzdCBub3QgaGF2ZSBjb25zdHJhaW5lZCBnZW5lcmljIHR5cGVzXG4gIGlmICghY2hlY2tJZkNsYXNzSXNFeHBvcnRlZChub2RlKSkge1xuICAgIC8vIENvbmRpdGlvbiAxIGlzIGZhbHNlLCB0aGUgY2xhc3MgaXMgbm90IGV4cG9ydGVkLlxuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2UgaWYgKCFjaGVja0lmR2VuZXJpY1R5cGVzQXJlVW5ib3VuZChub2RlKSkge1xuICAgIC8vIENvbmRpdGlvbiAyIGlzIGZhbHNlLCB0aGUgY2xhc3MgaGFzIGNvbnN0cmFpbmVkIGdlbmVyaWMgdHlwZXNcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqIE1hcHMgYSBzaGltIHBvc2l0aW9uIGJhY2sgdG8gYSB0ZW1wbGF0ZSBsb2NhdGlvbi4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUZW1wbGF0ZU1hcHBpbmcoXG4gICAgc2hpbVNmOiB0cy5Tb3VyY2VGaWxlLCBwb3NpdGlvbjogbnVtYmVyLCByZXNvbHZlcjogVGVtcGxhdGVTb3VyY2VSZXNvbHZlcixcbiAgICBpc0RpYWdub3N0aWNSZXF1ZXN0OiBib29sZWFuKTogRnVsbFRlbXBsYXRlTWFwcGluZ3xudWxsIHtcbiAgY29uc3Qgbm9kZSA9IGdldFRva2VuQXRQb3NpdGlvbihzaGltU2YsIHBvc2l0aW9uKTtcbiAgY29uc3Qgc291cmNlTG9jYXRpb24gPSBmaW5kU291cmNlTG9jYXRpb24obm9kZSwgc2hpbVNmLCBpc0RpYWdub3N0aWNSZXF1ZXN0KTtcbiAgaWYgKHNvdXJjZUxvY2F0aW9uID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBtYXBwaW5nID0gcmVzb2x2ZXIuZ2V0U291cmNlTWFwcGluZyhzb3VyY2VMb2NhdGlvbi5pZCk7XG4gIGNvbnN0IHNwYW4gPSByZXNvbHZlci50b1BhcnNlU291cmNlU3Bhbihzb3VyY2VMb2NhdGlvbi5pZCwgc291cmNlTG9jYXRpb24uc3Bhbik7XG4gIGlmIChzcGFuID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgLy8gVE9ETyhhdHNjb3R0KTogQ29uc2lkZXIgYWRkaW5nIGEgY29udGV4dCBzcGFuIGJ5IHdhbGtpbmcgdXAgZnJvbSBgbm9kZWAgdW50aWwgd2UgZ2V0IGFcbiAgLy8gZGlmZmVyZW50IHNwYW4uXG4gIHJldHVybiB7c291cmNlTG9jYXRpb24sIHRlbXBsYXRlU291cmNlTWFwcGluZzogbWFwcGluZywgc3Bhbn07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kVHlwZUNoZWNrQmxvY2soXG4gICAgZmlsZTogdHMuU291cmNlRmlsZSwgaWQ6IFRlbXBsYXRlSWQsIGlzRGlhZ25vc3RpY1JlcXVlc3Q6IGJvb2xlYW4pOiB0cy5Ob2RlfG51bGwge1xuICBmb3IgKGNvbnN0IHN0bXQgb2YgZmlsZS5zdGF0ZW1lbnRzKSB7XG4gICAgaWYgKHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihzdG10KSAmJiBnZXRUZW1wbGF0ZUlkKHN0bXQsIGZpbGUsIGlzRGlhZ25vc3RpY1JlcXVlc3QpID09PSBpZCkge1xuICAgICAgcmV0dXJuIHN0bXQ7XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIFRyYXZlcnNlcyB1cCB0aGUgQVNUIHN0YXJ0aW5nIGZyb20gdGhlIGdpdmVuIG5vZGUgdG8gZXh0cmFjdCB0aGUgc291cmNlIGxvY2F0aW9uIGZyb20gY29tbWVudHNcbiAqIHRoYXQgaGF2ZSBiZWVuIGVtaXR0ZWQgaW50byB0aGUgVENCLiBJZiB0aGUgbm9kZSBkb2VzIG5vdCBleGlzdCB3aXRoaW4gYSBUQ0IsIG9yIGlmIGFuIGlnbm9yZVxuICogbWFya2VyIGNvbW1lbnQgaXMgZm91bmQgdXAgdGhlIHRyZWUgKGFuZCB0aGlzIGlzIHBhcnQgb2YgYSBkaWFnbm9zdGljIHJlcXVlc3QpLCB0aGlzIGZ1bmN0aW9uXG4gKiByZXR1cm5zIG51bGwuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kU291cmNlTG9jYXRpb24oXG4gICAgbm9kZTogdHMuTm9kZSwgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgaXNEaWFnbm9zdGljc1JlcXVlc3Q6IGJvb2xlYW4pOiBTb3VyY2VMb2NhdGlvbnxudWxsIHtcbiAgLy8gU2VhcmNoIGZvciBjb21tZW50cyB1bnRpbCB0aGUgVENCJ3MgZnVuY3Rpb24gZGVjbGFyYXRpb24gaXMgZW5jb3VudGVyZWQuXG4gIHdoaWxlIChub2RlICE9PSB1bmRlZmluZWQgJiYgIXRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihub2RlKSkge1xuICAgIGlmIChoYXNJZ25vcmVGb3JEaWFnbm9zdGljc01hcmtlcihub2RlLCBzb3VyY2VGaWxlKSAmJiBpc0RpYWdub3N0aWNzUmVxdWVzdCkge1xuICAgICAgLy8gVGhlcmUncyBhbiBpZ25vcmUgbWFya2VyIG9uIHRoaXMgbm9kZSwgc28gdGhlIGRpYWdub3N0aWMgc2hvdWxkIG5vdCBiZSByZXBvcnRlZC5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHNwYW4gPSByZWFkU3BhbkNvbW1lbnQobm9kZSwgc291cmNlRmlsZSk7XG4gICAgaWYgKHNwYW4gIT09IG51bGwpIHtcbiAgICAgIC8vIE9uY2UgdGhlIHBvc2l0aW9uYWwgaW5mb3JtYXRpb24gaGFzIGJlZW4gZXh0cmFjdGVkLCBzZWFyY2ggZnVydGhlciB1cCB0aGUgVENCIHRvIGV4dHJhY3RcbiAgICAgIC8vIHRoZSB1bmlxdWUgaWQgdGhhdCBpcyBhdHRhY2hlZCB3aXRoIHRoZSBUQ0IncyBmdW5jdGlvbiBkZWNsYXJhdGlvbi5cbiAgICAgIGNvbnN0IGlkID0gZ2V0VGVtcGxhdGVJZChub2RlLCBzb3VyY2VGaWxlLCBpc0RpYWdub3N0aWNzUmVxdWVzdCk7XG4gICAgICBpZiAoaWQgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4ge2lkLCBzcGFufTtcbiAgICB9XG5cbiAgICBub2RlID0gbm9kZS5wYXJlbnQ7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gZ2V0VGVtcGxhdGVJZChcbiAgICBub2RlOiB0cy5Ob2RlLCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBpc0RpYWdub3N0aWNSZXF1ZXN0OiBib29sZWFuKTogVGVtcGxhdGVJZHxudWxsIHtcbiAgLy8gV2FsayB1cCB0byB0aGUgZnVuY3Rpb24gZGVjbGFyYXRpb24gb2YgdGhlIFRDQiwgdGhlIGZpbGUgaW5mb3JtYXRpb24gaXMgYXR0YWNoZWQgdGhlcmUuXG4gIHdoaWxlICghdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgaWYgKGhhc0lnbm9yZUZvckRpYWdub3N0aWNzTWFya2VyKG5vZGUsIHNvdXJjZUZpbGUpICYmIGlzRGlhZ25vc3RpY1JlcXVlc3QpIHtcbiAgICAgIC8vIFRoZXJlJ3MgYW4gaWdub3JlIG1hcmtlciBvbiB0aGlzIG5vZGUsIHNvIHRoZSBkaWFnbm9zdGljIHNob3VsZCBub3QgYmUgcmVwb3J0ZWQuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgbm9kZSA9IG5vZGUucGFyZW50O1xuXG4gICAgLy8gQmFpbCBvbmNlIHdlIGhhdmUgcmVhY2hlZCB0aGUgcm9vdC5cbiAgICBpZiAobm9kZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICBjb25zdCBzdGFydCA9IG5vZGUuZ2V0RnVsbFN0YXJ0KCk7XG4gIHJldHVybiB0cy5mb3JFYWNoTGVhZGluZ0NvbW1lbnRSYW5nZShzb3VyY2VGaWxlLnRleHQsIHN0YXJ0LCAocG9zLCBlbmQsIGtpbmQpID0+IHtcbiAgICBpZiAoa2luZCAhPT0gdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgY29tbWVudFRleHQgPSBzb3VyY2VGaWxlLnRleHQuc3Vic3RyaW5nKHBvcyArIDIsIGVuZCAtIDIpO1xuICAgIHJldHVybiBjb21tZW50VGV4dDtcbiAgfSkgYXMgVGVtcGxhdGVJZCB8fCBudWxsO1xufVxuIl19