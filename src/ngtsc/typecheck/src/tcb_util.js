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
    function getTemplateMapping(shimSf, position, resolver) {
        var node = typescript_1.getTokenAtPosition(shimSf, position);
        var sourceLocation = findSourceLocation(node, shimSf);
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
    function findTypeCheckBlock(file, id) {
        var e_1, _a;
        try {
            for (var _b = tslib_1.__values(file.statements), _c = _b.next(); !_c.done; _c = _b.next()) {
                var stmt = _c.value;
                if (ts.isFunctionDeclaration(stmt) && getTemplateId(stmt, file) === id) {
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
     * marker comment is found up the tree, this function returns null.
     */
    function findSourceLocation(node, sourceFile) {
        // Search for comments until the TCB's function declaration is encountered.
        while (node !== undefined && !ts.isFunctionDeclaration(node)) {
            if (comments_1.hasIgnoreMarker(node, sourceFile)) {
                // There's an ignore marker on this node, so the diagnostic should not be reported.
                return null;
            }
            var span = comments_1.readSpanComment(node, sourceFile);
            if (span !== null) {
                // Once the positional information has been extracted, search further up the TCB to extract
                // the unique id that is attached with the TCB's function declaration.
                var id = getTemplateId(node, sourceFile);
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
    function getTemplateId(node, sourceFile) {
        // Walk up to the function declaration of the TCB, the file information is attached there.
        while (!ts.isFunctionDeclaration(node)) {
            if (comments_1.hasIgnoreMarker(node, sourceFile)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGNiX3V0aWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvdGNiX3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUlILCtCQUFpQztJQUVqQyxrRkFBNkQ7SUFHN0QsbUZBQTREO0lBQzVELGlGQUFnRjtJQXVCaEYsU0FBZ0IsNEJBQTRCLENBQUMsSUFBMkM7UUFDdEYsa0ZBQWtGO1FBQ2xGLGdDQUFnQztRQUNoQyxnREFBZ0Q7UUFDaEQsSUFBSSxDQUFDLGdDQUFzQixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2pDLG1EQUFtRDtZQUNuRCxPQUFPLElBQUksQ0FBQztTQUNiO2FBQU0sSUFBSSxDQUFDLHVDQUE2QixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQy9DLGdFQUFnRTtZQUNoRSxPQUFPLElBQUksQ0FBQztTQUNiO2FBQU07WUFDTCxPQUFPLEtBQUssQ0FBQztTQUNkO0lBQ0gsQ0FBQztJQWJELG9FQWFDO0lBRUQsd0RBQXdEO0lBQ3hELFNBQWdCLGtCQUFrQixDQUM5QixNQUFxQixFQUFFLFFBQWdCLEVBQUUsUUFBZ0M7UUFFM0UsSUFBTSxJQUFJLEdBQUcsK0JBQWtCLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2xELElBQU0sY0FBYyxHQUFHLGtCQUFrQixDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN4RCxJQUFJLGNBQWMsS0FBSyxJQUFJLEVBQUU7WUFDM0IsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELElBQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDN0QsSUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxFQUFFLEVB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Ii8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0Fic29sdXRlU291cmNlU3BhbiwgUGFyc2VTb3VyY2VTcGFufSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtnZXRUb2tlbkF0UG9zaXRpb259IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtGdWxsVGVtcGxhdGVNYXBwaW5nLCBTb3VyY2VMb2NhdGlvbiwgVGVtcGxhdGVJZCwgVGVtcGxhdGVTb3VyY2VNYXBwaW5nfSBmcm9tICcuLi9hcGknO1xuXG5pbXBvcnQge2hhc0lnbm9yZU1hcmtlciwgcmVhZFNwYW5Db21tZW50fSBmcm9tICcuL2NvbW1lbnRzJztcbmltcG9ydCB7Y2hlY2tJZkNsYXNzSXNFeHBvcnRlZCwgY2hlY2tJZkdlbmVyaWNUeXBlc0FyZVVuYm91bmR9IGZyb20gJy4vdHNfdXRpbCc7XG5cbi8qKlxuICogQWRhcHRlciBpbnRlcmZhY2Ugd2hpY2ggYWxsb3dzIHRoZSB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGRpYWdub3N0aWNzIGNvZGUgdG8gaW50ZXJwcmV0IG9mZnNldHNcbiAqIGluIGEgVENCIGFuZCBtYXAgdGhlbSBiYWNrIHRvIG9yaWdpbmFsIGxvY2F0aW9ucyBpbiB0aGUgdGVtcGxhdGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVTb3VyY2VSZXNvbHZlciB7XG4gIGdldFRlbXBsYXRlSWQobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IFRlbXBsYXRlSWQ7XG5cbiAgLyoqXG4gICAqIEZvciB0aGUgZ2l2ZW4gdGVtcGxhdGUgaWQsIHJldHJpZXZlIHRoZSBvcmlnaW5hbCBzb3VyY2UgbWFwcGluZyB3aGljaCBkZXNjcmliZXMgaG93IHRoZSBvZmZzZXRzXG4gICAqIGluIHRoZSB0ZW1wbGF0ZSBzaG91bGQgYmUgaW50ZXJwcmV0ZWQuXG4gICAqL1xuICBnZXRTb3VyY2VNYXBwaW5nKGlkOiBUZW1wbGF0ZUlkKTogVGVtcGxhdGVTb3VyY2VNYXBwaW5nO1xuXG4gIC8qKlxuICAgKiBDb252ZXJ0IGFuIGFic29sdXRlIHNvdXJjZSBzcGFuIGFzc29jaWF0ZWQgd2l0aCB0aGUgZ2l2ZW4gdGVtcGxhdGUgaWQgaW50byBhIGZ1bGxcbiAgICogYFBhcnNlU291cmNlU3BhbmAuIFRoZSByZXR1cm5lZCBwYXJzZSBzcGFuIGhhcyBsaW5lIGFuZCBjb2x1bW4gbnVtYmVycyBpbiBhZGRpdGlvbiB0byBvbmx5XG4gICAqIGFic29sdXRlIG9mZnNldHMgYW5kIGdpdmVzIGFjY2VzcyB0byB0aGUgb3JpZ2luYWwgdGVtcGxhdGUgc291cmNlLlxuICAgKi9cbiAgdG9QYXJzZVNvdXJjZVNwYW4oaWQ6IFRlbXBsYXRlSWQsIHNwYW46IEFic29sdXRlU291cmNlU3Bhbik6IFBhcnNlU291cmNlU3BhbnxudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVxdWlyZXNJbmxpbmVUeXBlQ2hlY2tCbG9jayhub2RlOiBDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+KTogYm9vbGVhbiB7XG4gIC8vIEluIG9yZGVyIHRvIHF1YWxpZnkgZm9yIGEgZGVjbGFyZWQgVENCIChub3QgaW5saW5lKSB0d28gY29uZGl0aW9ucyBtdXN0IGJlIG1ldDpcbiAgLy8gMSkgdGhlIGNsYXNzIG11c3QgYmUgZXhwb3J0ZWRcbiAgLy8gMikgaXQgbXVzdCBub3QgaGF2ZSBjb25zdHJhaW5lZCBnZW5lcmljIHR5cGVzXG4gIGlmICghY2hlY2tJZkNsYXNzSXNFeHBvcnRlZChub2RlKSkge1xuICAgIC8vIENvbmRpdGlvbiAxIGlzIGZhbHNlLCB0aGUgY2xhc3MgaXMgbm90IGV4cG9ydGVkLlxuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2UgaWYgKCFjaGVja0lmR2VuZXJpY1R5cGVzQXJlVW5ib3VuZChub2RlKSkge1xuICAgIC8vIENvbmRpdGlvbiAyIGlzIGZhbHNlLCB0aGUgY2xhc3MgaGFzIGNvbnN0cmFpbmVkIGdlbmVyaWMgdHlwZXNcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqIE1hcHMgYSBzaGltIHBvc2l0aW9uIGJhY2sgdG8gYSB0ZW1wbGF0ZSBsb2NhdGlvbi4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUZW1wbGF0ZU1hcHBpbmcoXG4gICAgc2hpbVNmOiB0cy5Tb3VyY2VGaWxlLCBwb3NpdGlvbjogbnVtYmVyLCByZXNvbHZlcjogVGVtcGxhdGVTb3VyY2VSZXNvbHZlcik6IEZ1bGxUZW1wbGF0ZU1hcHBpbmd8XG4gICAgbnVsbCB7XG4gIGNvbnN0IG5vZGUgPSBnZXRUb2tlbkF0UG9zaXRpb24oc2hpbVNmLCBwb3NpdGlvbik7XG4gIGNvbnN0IHNvdXJjZUxvY2F0aW9uID0gZmluZFNvdXJjZUxvY2F0aW9uKG5vZGUsIHNoaW1TZik7XG4gIGlmIChzb3VyY2VMb2NhdGlvbiA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgbWFwcGluZyA9IHJlc29sdmVyLmdldFNvdXJjZU1hcHBpbmcoc291cmNlTG9jYXRpb24uaWQpO1xuICBjb25zdCBzcGFuID0gcmVzb2x2ZXIudG9QYXJzZVNvdXJjZVNwYW4oc291cmNlTG9jYXRpb24uaWQsIHNvdXJjZUxvY2F0aW9uLnNwYW4pO1xuICBpZiAoc3BhbiA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIC8vIFRPRE8oYXRzY290dCk6IENvbnNpZGVyIGFkZGluZyBhIGNvbnRleHQgc3BhbiBieSB3YWxraW5nIHVwIGZyb20gYG5vZGVgIHVudGlsIHdlIGdldCBhXG4gIC8vIGRpZmZlcmVudCBzcGFuLlxuICByZXR1cm4ge3NvdXJjZUxvY2F0aW9uLCB0ZW1wbGF0ZVNvdXJjZU1hcHBpbmc6IG1hcHBpbmcsIHNwYW59O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmluZFR5cGVDaGVja0Jsb2NrKGZpbGU6IHRzLlNvdXJjZUZpbGUsIGlkOiBUZW1wbGF0ZUlkKTogdHMuTm9kZXxudWxsIHtcbiAgZm9yIChjb25zdCBzdG10IG9mIGZpbGUuc3RhdGVtZW50cykge1xuICAgIGlmICh0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24oc3RtdCkgJiYgZ2V0VGVtcGxhdGVJZChzdG10LCBmaWxlKSA9PT0gaWQpIHtcbiAgICAgIHJldHVybiBzdG10O1xuICAgIH1cbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBUcmF2ZXJzZXMgdXAgdGhlIEFTVCBzdGFydGluZyBmcm9tIHRoZSBnaXZlbiBub2RlIHRvIGV4dHJhY3QgdGhlIHNvdXJjZSBsb2NhdGlvbiBmcm9tIGNvbW1lbnRzXG4gKiB0aGF0IGhhdmUgYmVlbiBlbWl0dGVkIGludG8gdGhlIFRDQi4gSWYgdGhlIG5vZGUgZG9lcyBub3QgZXhpc3Qgd2l0aGluIGEgVENCLCBvciBpZiBhbiBpZ25vcmVcbiAqIG1hcmtlciBjb21tZW50IGlzIGZvdW5kIHVwIHRoZSB0cmVlLCB0aGlzIGZ1bmN0aW9uIHJldHVybnMgbnVsbC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRTb3VyY2VMb2NhdGlvbihub2RlOiB0cy5Ob2RlLCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogU291cmNlTG9jYXRpb258bnVsbCB7XG4gIC8vIFNlYXJjaCBmb3IgY29tbWVudHMgdW50aWwgdGhlIFRDQidzIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIGlzIGVuY291bnRlcmVkLlxuICB3aGlsZSAobm9kZSAhPT0gdW5kZWZpbmVkICYmICF0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICBpZiAoaGFzSWdub3JlTWFya2VyKG5vZGUsIHNvdXJjZUZpbGUpKSB7XG4gICAgICAvLyBUaGVyZSdzIGFuIGlnbm9yZSBtYXJrZXIgb24gdGhpcyBub2RlLCBzbyB0aGUgZGlhZ25vc3RpYyBzaG91bGQgbm90IGJlIHJlcG9ydGVkLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qgc3BhbiA9IHJlYWRTcGFuQ29tbWVudChub2RlLCBzb3VyY2VGaWxlKTtcbiAgICBpZiAoc3BhbiAhPT0gbnVsbCkge1xuICAgICAgLy8gT25jZSB0aGUgcG9zaXRpb25hbCBpbmZvcm1hdGlvbiBoYXMgYmVlbiBleHRyYWN0ZWQsIHNlYXJjaCBmdXJ0aGVyIHVwIHRoZSBUQ0IgdG8gZXh0cmFjdFxuICAgICAgLy8gdGhlIHVuaXF1ZSBpZCB0aGF0IGlzIGF0dGFjaGVkIHdpdGggdGhlIFRDQidzIGZ1bmN0aW9uIGRlY2xhcmF0aW9uLlxuICAgICAgY29uc3QgaWQgPSBnZXRUZW1wbGF0ZUlkKG5vZGUsIHNvdXJjZUZpbGUpO1xuICAgICAgaWYgKGlkID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtpZCwgc3Bhbn07XG4gICAgfVxuXG4gICAgbm9kZSA9IG5vZGUucGFyZW50O1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGdldFRlbXBsYXRlSWQobm9kZTogdHMuTm9kZSwgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IFRlbXBsYXRlSWR8bnVsbCB7XG4gIC8vIFdhbGsgdXAgdG8gdGhlIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIG9mIHRoZSBUQ0IsIHRoZSBmaWxlIGluZm9ybWF0aW9uIGlzIGF0dGFjaGVkIHRoZXJlLlxuICB3aGlsZSAoIXRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihub2RlKSkge1xuICAgIGlmIChoYXNJZ25vcmVNYXJrZXIobm9kZSwgc291cmNlRmlsZSkpIHtcbiAgICAgIC8vIFRoZXJlJ3MgYW4gaWdub3JlIG1hcmtlciBvbiB0aGlzIG5vZGUsIHNvIHRoZSBkaWFnbm9zdGljIHNob3VsZCBub3QgYmUgcmVwb3J0ZWQuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgbm9kZSA9IG5vZGUucGFyZW50O1xuXG4gICAgLy8gQmFpbCBvbmNlIHdlIGhhdmUgcmVhY2hlZCB0aGUgcm9vdC5cbiAgICBpZiAobm9kZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICBjb25zdCBzdGFydCA9IG5vZGUuZ2V0RnVsbFN0YXJ0KCk7XG4gIHJldHVybiB0cy5mb3JFYWNoTGVhZGluZ0NvbW1lbnRSYW5nZShzb3VyY2VGaWxlLnRleHQsIHN0YXJ0LCAocG9zLCBlbmQsIGtpbmQpID0+IHtcbiAgICBpZiAoa2luZCAhPT0gdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgY29tbWVudFRleHQgPSBzb3VyY2VGaWxlLnRleHQuc3Vic3RyaW5nKHBvcyArIDIsIGVuZCAtIDIpO1xuICAgIHJldHVybiBjb21tZW50VGV4dDtcbiAgfSkgYXMgVGVtcGxhdGVJZCB8fCBudWxsO1xufVxuIl19