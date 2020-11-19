(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics", ["require", "exports", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/typecheck/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/src/tcb_util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.translateDiagnostic = exports.shouldReportDiagnostic = exports.addTemplateId = exports.addParseSpanInfo = exports.wrapForTypeChecker = exports.wrapForDiagnostics = void 0;
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/diagnostics");
    var tcb_util_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/tcb_util");
    /**
     * Wraps the node in parenthesis such that inserted span comments become attached to the proper
     * node. This is an alias for `ts.createParen` with the benefit that it signifies that the
     * inserted parenthesis are for diagnostic purposes, not for correctness of the rendered TCB code.
     *
     * Note that it is important that nodes and its attached comment are not wrapped into parenthesis
     * by default, as it prevents correct translation of e.g. diagnostics produced for incorrect method
     * arguments. Such diagnostics would then be produced for the parenthesised node whereas the
     * positional comment would be located within that node, resulting in a mismatch.
     */
    function wrapForDiagnostics(expr) {
        return ts.createParen(expr);
    }
    exports.wrapForDiagnostics = wrapForDiagnostics;
    /**
     * Wraps the node in parenthesis such that inserted span comments become attached to the proper
     * node. This is an alias for `ts.createParen` with the benefit that it signifies that the
     * inserted parenthesis are for use by the type checker, not for correctness of the rendered TCB
     * code.
     */
    function wrapForTypeChecker(expr) {
        return ts.createParen(expr);
    }
    exports.wrapForTypeChecker = wrapForTypeChecker;
    /**
     * Adds a synthetic comment to the expression that represents the parse span of the provided node.
     * This comment can later be retrieved as trivia of a node to recover original source locations.
     */
    function addParseSpanInfo(node, span) {
        var commentText;
        if (span instanceof compiler_1.AbsoluteSourceSpan) {
            commentText = span.start + "," + span.end;
        }
        else {
            commentText = span.start.offset + "," + span.end.offset;
        }
        ts.addSyntheticTrailingComment(node, ts.SyntaxKind.MultiLineCommentTrivia, commentText, /* hasTrailingNewLine */ false);
    }
    exports.addParseSpanInfo = addParseSpanInfo;
    /**
     * Adds a synthetic comment to the function declaration that contains the template id
     * of the class declaration.
     */
    function addTemplateId(tcb, id) {
        ts.addSyntheticLeadingComment(tcb, ts.SyntaxKind.MultiLineCommentTrivia, id, true);
    }
    exports.addTemplateId = addTemplateId;
    /**
     * Determines if the diagnostic should be reported. Some diagnostics are produced because of the
     * way TCBs are generated; those diagnostics should not be reported as type check errors of the
     * template.
     */
    function shouldReportDiagnostic(diagnostic) {
        var code = diagnostic.code;
        if (code === 6133 /* $var is declared but its value is never read. */) {
            return false;
        }
        else if (code === 6199 /* All variables are unused. */) {
            return false;
        }
        else if (code === 2695 /* Left side of comma operator is unused and has no side effects. */) {
            return false;
        }
        else if (code === 7006 /* Parameter '$event' implicitly has an 'any' type. */) {
            return false;
        }
        return true;
    }
    exports.shouldReportDiagnostic = shouldReportDiagnostic;
    /**
     * Attempts to translate a TypeScript diagnostic produced during template type-checking to their
     * location of origin, based on the comments that are emitted in the TCB code.
     *
     * If the diagnostic could not be translated, `null` is returned to indicate that the diagnostic
     * should not be reported at all. This prevents diagnostics from non-TCB code in a user's source
     * file from being reported as type-check errors.
     */
    function translateDiagnostic(diagnostic, resolver) {
        if (diagnostic.file === undefined || diagnostic.start === undefined) {
            return null;
        }
        var fullMapping = tcb_util_1.getTemplateMapping(diagnostic.file, diagnostic.start, resolver);
        if (fullMapping === null) {
            return null;
        }
        var sourceLocation = fullMapping.sourceLocation, templateSourceMapping = fullMapping.templateSourceMapping, span = fullMapping.span;
        return diagnostics_1.makeTemplateDiagnostic(sourceLocation.id, templateSourceMapping, span, diagnostic.category, diagnostic.code, diagnostic.messageText);
    }
    exports.translateDiagnostic = translateDiagnostic;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvZGlhZ25vc3RpY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsOENBQXNFO0lBQ3RFLCtCQUFpQztJQUVqQyxxRkFBMEU7SUFDMUUsbUZBQXNFO0lBR3RFOzs7Ozs7Ozs7T0FTRztJQUNILFNBQWdCLGtCQUFrQixDQUFDLElBQW1CO1FBQ3BELE9BQU8sRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRkQsZ0RBRUM7SUFFRDs7Ozs7T0FLRztJQUNILFNBQWdCLGtCQUFrQixDQUFDLElBQW1CO1FBQ3BELE9BQU8sRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRkQsZ0RBRUM7SUFFRDs7O09BR0c7SUFDSCxTQUFnQixnQkFBZ0IsQ0FBQyxJQUFhLEVBQUUsSUFBd0M7UUFDdEYsSUFBSSxXQUFtQixDQUFDO1FBQ3hCLElBQUksSUFBSSxZQUFZLDZCQUFrQixFQUFFO1lBQ3RDLFdBQVcsR0FBTSxJQUFJLENBQUMsS0FBSyxTQUFJLElBQUksQ0FBQyxHQUFLLENBQUM7U0FDM0M7YUFBTTtZQUNMLFdBQVcsR0FBTSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sU0FBSSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQVEsQ0FBQztTQUN6RDtRQUNELEVBQUUsQ0FBQywyQkFBMkIsQ0FDMUIsSUFBSSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLEVBQUUsV0FBVyxFQUFFLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQy9GLENBQUM7SUFURCw0Q0FTQztJQUVEOzs7T0FHRztJQUNILFNBQWdCLGFBQWEsQ0FBQyxHQUEyQixFQUFFLEVBQWM7UUFDdkUsRUFBRSxDQUFDLDBCQUEwQixDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLHNCQUFzQixFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNyRixDQUFDO0lBRkQsc0NBRUM7SUFFRDs7OztPQUlHO0lBQ0gsU0FBZ0Isc0JBQXNCLENBQUMsVUFBeUI7UUFDdkQsSUFBQSxJQUFJLEdBQUksVUFBVSxLQUFkLENBQWU7UUFDMUIsSUFBSSxJQUFJLEtBQUssSUFBSSxDQUFDLG1EQUFtRCxFQUFFO1lBQ3JFLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7YUFBTSxJQUFJLElBQUksS0FBSyxJQUFJLENBQUMsK0JBQStCLEVBQUU7WUFDeEQsT0FBTyxLQUFLLENBQUM7U0FDZDthQUFNLElBQUksSUFBSSxLQUFLLElBQUksQ0FBQyxvRUFBb0UsRUFBRTtZQUM3RixPQUFPLEtBQUssQ0FBQztTQUNkO2FBQU0sSUFBSSxJQUFJLEtBQUssSUFBSSxDQUFDLHNEQUFzRCxFQUFFO1lBQy9FLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFaRCx3REFZQztJQUVEOzs7Ozs7O09BT0c7SUFDSCxTQUFnQixtQkFBbUIsQ0FDL0IsVUFBeUIsRUFBRSxRQUFnQztRQUM3RCxJQUFJLFVBQVUsQ0FBQyxJQUFJLEtBQUssU0FBUyxJQUFJLFVBQVUsQ0FBQyxLQUFLLEtBQUssU0FBUyxFQUFFO1lBQ25FLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxJQUFNLFdBQVcsR0FBRyw2QkFBa0IsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDcEYsSUFBSSxXQUFXLEtBQUssSUFBSSxFQUFFO1lBQ3hCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFTSxJQUFBLGNBQWMsR0FBaUMsV0FBVyxlQUE1QyxFQUFFLHFCQUFxQixHQUFVLFdBQVcsc0JBQXJCLEVBQUUsSUFBSSxHQUFJLFdBQVcsS0FBZixDQUFnQjtRQUNsRSxPQUFPLG9DQUFzQixDQUN6QixjQUFjLENBQUMsRUFBRSxFQUFFLHFCQUFxQixFQUFFLElBQUksRUFBRSxVQUFVLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJLEVBQ3BGLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBZEQsa0RBY0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7QWJzb2x1dGVTb3VyY2VTcGFuLCBQYXJzZVNvdXJjZVNwYW59IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtUZW1wbGF0ZUlkfSBmcm9tICcuLi9hcGknO1xuaW1wb3J0IHttYWtlVGVtcGxhdGVEaWFnbm9zdGljLCBUZW1wbGF0ZURpYWdub3N0aWN9IGZyb20gJy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7Z2V0VGVtcGxhdGVNYXBwaW5nLCBUZW1wbGF0ZVNvdXJjZVJlc29sdmVyfSBmcm9tICcuL3RjYl91dGlsJztcblxuXG4vKipcbiAqIFdyYXBzIHRoZSBub2RlIGluIHBhcmVudGhlc2lzIHN1Y2ggdGhhdCBpbnNlcnRlZCBzcGFuIGNvbW1lbnRzIGJlY29tZSBhdHRhY2hlZCB0byB0aGUgcHJvcGVyXG4gKiBub2RlLiBUaGlzIGlzIGFuIGFsaWFzIGZvciBgdHMuY3JlYXRlUGFyZW5gIHdpdGggdGhlIGJlbmVmaXQgdGhhdCBpdCBzaWduaWZpZXMgdGhhdCB0aGVcbiAqIGluc2VydGVkIHBhcmVudGhlc2lzIGFyZSBmb3IgZGlhZ25vc3RpYyBwdXJwb3Nlcywgbm90IGZvciBjb3JyZWN0bmVzcyBvZiB0aGUgcmVuZGVyZWQgVENCIGNvZGUuXG4gKlxuICogTm90ZSB0aGF0IGl0IGlzIGltcG9ydGFudCB0aGF0IG5vZGVzIGFuZCBpdHMgYXR0YWNoZWQgY29tbWVudCBhcmUgbm90IHdyYXBwZWQgaW50byBwYXJlbnRoZXNpc1xuICogYnkgZGVmYXVsdCwgYXMgaXQgcHJldmVudHMgY29ycmVjdCB0cmFuc2xhdGlvbiBvZiBlLmcuIGRpYWdub3N0aWNzIHByb2R1Y2VkIGZvciBpbmNvcnJlY3QgbWV0aG9kXG4gKiBhcmd1bWVudHMuIFN1Y2ggZGlhZ25vc3RpY3Mgd291bGQgdGhlbiBiZSBwcm9kdWNlZCBmb3IgdGhlIHBhcmVudGhlc2lzZWQgbm9kZSB3aGVyZWFzIHRoZVxuICogcG9zaXRpb25hbCBjb21tZW50IHdvdWxkIGJlIGxvY2F0ZWQgd2l0aGluIHRoYXQgbm9kZSwgcmVzdWx0aW5nIGluIGEgbWlzbWF0Y2guXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cmFwRm9yRGlhZ25vc3RpY3MoZXhwcjogdHMuRXhwcmVzc2lvbik6IHRzLkV4cHJlc3Npb24ge1xuICByZXR1cm4gdHMuY3JlYXRlUGFyZW4oZXhwcik7XG59XG5cbi8qKlxuICogV3JhcHMgdGhlIG5vZGUgaW4gcGFyZW50aGVzaXMgc3VjaCB0aGF0IGluc2VydGVkIHNwYW4gY29tbWVudHMgYmVjb21lIGF0dGFjaGVkIHRvIHRoZSBwcm9wZXJcbiAqIG5vZGUuIFRoaXMgaXMgYW4gYWxpYXMgZm9yIGB0cy5jcmVhdGVQYXJlbmAgd2l0aCB0aGUgYmVuZWZpdCB0aGF0IGl0IHNpZ25pZmllcyB0aGF0IHRoZVxuICogaW5zZXJ0ZWQgcGFyZW50aGVzaXMgYXJlIGZvciB1c2UgYnkgdGhlIHR5cGUgY2hlY2tlciwgbm90IGZvciBjb3JyZWN0bmVzcyBvZiB0aGUgcmVuZGVyZWQgVENCXG4gKiBjb2RlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JhcEZvclR5cGVDaGVja2VyKGV4cHI6IHRzLkV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9uIHtcbiAgcmV0dXJuIHRzLmNyZWF0ZVBhcmVuKGV4cHIpO1xufVxuXG4vKipcbiAqIEFkZHMgYSBzeW50aGV0aWMgY29tbWVudCB0byB0aGUgZXhwcmVzc2lvbiB0aGF0IHJlcHJlc2VudHMgdGhlIHBhcnNlIHNwYW4gb2YgdGhlIHByb3ZpZGVkIG5vZGUuXG4gKiBUaGlzIGNvbW1lbnQgY2FuIGxhdGVyIGJlIHJldHJpZXZlZCBhcyB0cml2aWEgb2YgYSBub2RlIHRvIHJlY292ZXIgb3JpZ2luYWwgc291cmNlIGxvY2F0aW9ucy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFkZFBhcnNlU3BhbkluZm8obm9kZTogdHMuTm9kZSwgc3BhbjogQWJzb2x1dGVTb3VyY2VTcGFufFBhcnNlU291cmNlU3Bhbik6IHZvaWQge1xuICBsZXQgY29tbWVudFRleHQ6IHN0cmluZztcbiAgaWYgKHNwYW4gaW5zdGFuY2VvZiBBYnNvbHV0ZVNvdXJjZVNwYW4pIHtcbiAgICBjb21tZW50VGV4dCA9IGAke3NwYW4uc3RhcnR9LCR7c3Bhbi5lbmR9YDtcbiAgfSBlbHNlIHtcbiAgICBjb21tZW50VGV4dCA9IGAke3NwYW4uc3RhcnQub2Zmc2V0fSwke3NwYW4uZW5kLm9mZnNldH1gO1xuICB9XG4gIHRzLmFkZFN5bnRoZXRpY1RyYWlsaW5nQ29tbWVudChcbiAgICAgIG5vZGUsIHRzLlN5bnRheEtpbmQuTXVsdGlMaW5lQ29tbWVudFRyaXZpYSwgY29tbWVudFRleHQsIC8qIGhhc1RyYWlsaW5nTmV3TGluZSAqLyBmYWxzZSk7XG59XG5cbi8qKlxuICogQWRkcyBhIHN5bnRoZXRpYyBjb21tZW50IHRvIHRoZSBmdW5jdGlvbiBkZWNsYXJhdGlvbiB0aGF0IGNvbnRhaW5zIHRoZSB0ZW1wbGF0ZSBpZFxuICogb2YgdGhlIGNsYXNzIGRlY2xhcmF0aW9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYWRkVGVtcGxhdGVJZCh0Y2I6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb24sIGlkOiBUZW1wbGF0ZUlkKTogdm9pZCB7XG4gIHRzLmFkZFN5bnRoZXRpY0xlYWRpbmdDb21tZW50KHRjYiwgdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhLCBpZCwgdHJ1ZSk7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyBpZiB0aGUgZGlhZ25vc3RpYyBzaG91bGQgYmUgcmVwb3J0ZWQuIFNvbWUgZGlhZ25vc3RpY3MgYXJlIHByb2R1Y2VkIGJlY2F1c2Ugb2YgdGhlXG4gKiB3YXkgVENCcyBhcmUgZ2VuZXJhdGVkOyB0aG9zZSBkaWFnbm9zdGljcyBzaG91bGQgbm90IGJlIHJlcG9ydGVkIGFzIHR5cGUgY2hlY2sgZXJyb3JzIG9mIHRoZVxuICogdGVtcGxhdGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzaG91bGRSZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWM6IHRzLkRpYWdub3N0aWMpOiBib29sZWFuIHtcbiAgY29uc3Qge2NvZGV9ID0gZGlhZ25vc3RpYztcbiAgaWYgKGNvZGUgPT09IDYxMzMgLyogJHZhciBpcyBkZWNsYXJlZCBidXQgaXRzIHZhbHVlIGlzIG5ldmVyIHJlYWQuICovKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9IGVsc2UgaWYgKGNvZGUgPT09IDYxOTkgLyogQWxsIHZhcmlhYmxlcyBhcmUgdW51c2VkLiAqLykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSBlbHNlIGlmIChjb2RlID09PSAyNjk1IC8qIExlZnQgc2lkZSBvZiBjb21tYSBvcGVyYXRvciBpcyB1bnVzZWQgYW5kIGhhcyBubyBzaWRlIGVmZmVjdHMuICovKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9IGVsc2UgaWYgKGNvZGUgPT09IDcwMDYgLyogUGFyYW1ldGVyICckZXZlbnQnIGltcGxpY2l0bHkgaGFzIGFuICdhbnknIHR5cGUuICovKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEF0dGVtcHRzIHRvIHRyYW5zbGF0ZSBhIFR5cGVTY3JpcHQgZGlhZ25vc3RpYyBwcm9kdWNlZCBkdXJpbmcgdGVtcGxhdGUgdHlwZS1jaGVja2luZyB0byB0aGVpclxuICogbG9jYXRpb24gb2Ygb3JpZ2luLCBiYXNlZCBvbiB0aGUgY29tbWVudHMgdGhhdCBhcmUgZW1pdHRlZCBpbiB0aGUgVENCIGNvZGUuXG4gKlxuICogSWYgdGhlIGRpYWdub3N0aWMgY291bGQgbm90IGJlIHRyYW5zbGF0ZWQsIGBudWxsYCBpcyByZXR1cm5lZCB0byBpbmRpY2F0ZSB0aGF0IHRoZSBkaWFnbm9zdGljXG4gKiBzaG91bGQgbm90IGJlIHJlcG9ydGVkIGF0IGFsbC4gVGhpcyBwcmV2ZW50cyBkaWFnbm9zdGljcyBmcm9tIG5vbi1UQ0IgY29kZSBpbiBhIHVzZXIncyBzb3VyY2VcbiAqIGZpbGUgZnJvbSBiZWluZyByZXBvcnRlZCBhcyB0eXBlLWNoZWNrIGVycm9ycy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zbGF0ZURpYWdub3N0aWMoXG4gICAgZGlhZ25vc3RpYzogdHMuRGlhZ25vc3RpYywgcmVzb2x2ZXI6IFRlbXBsYXRlU291cmNlUmVzb2x2ZXIpOiBUZW1wbGF0ZURpYWdub3N0aWN8bnVsbCB7XG4gIGlmIChkaWFnbm9zdGljLmZpbGUgPT09IHVuZGVmaW5lZCB8fCBkaWFnbm9zdGljLnN0YXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCBmdWxsTWFwcGluZyA9IGdldFRlbXBsYXRlTWFwcGluZyhkaWFnbm9zdGljLmZpbGUsIGRpYWdub3N0aWMuc3RhcnQsIHJlc29sdmVyKTtcbiAgaWYgKGZ1bGxNYXBwaW5nID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCB7c291cmNlTG9jYXRpb24sIHRlbXBsYXRlU291cmNlTWFwcGluZywgc3Bhbn0gPSBmdWxsTWFwcGluZztcbiAgcmV0dXJuIG1ha2VUZW1wbGF0ZURpYWdub3N0aWMoXG4gICAgICBzb3VyY2VMb2NhdGlvbi5pZCwgdGVtcGxhdGVTb3VyY2VNYXBwaW5nLCBzcGFuLCBkaWFnbm9zdGljLmNhdGVnb3J5LCBkaWFnbm9zdGljLmNvZGUsXG4gICAgICBkaWFnbm9zdGljLm1lc3NhZ2VUZXh0KTtcbn1cbiJdfQ==