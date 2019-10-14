(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics", ["require", "exports", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    /**
     * Translates a `ParseSpan` into an `AbsoluteSpan` by incorporating the location information that
     * the `ParseSourceSpan` represents.
     */
    function toAbsoluteSpan(span, sourceSpan) {
        var offset = sourceSpan.start.offset;
        return { start: span.start + offset, end: span.end + offset };
    }
    exports.toAbsoluteSpan = toAbsoluteSpan;
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
     * Adds a synthetic comment to the expression that represents the parse span of the provided node.
     * This comment can later be retrieved as trivia of a node to recover original source locations.
     */
    function addParseSpanInfo(node, span) {
        var commentText;
        if (isAbsoluteSpan(span)) {
            commentText = span.start + "," + span.end;
        }
        else {
            commentText = span.start.offset + "," + span.end.offset;
        }
        ts.addSyntheticTrailingComment(node, ts.SyntaxKind.MultiLineCommentTrivia, commentText, 
        /* hasTrailingNewLine */ false);
    }
    exports.addParseSpanInfo = addParseSpanInfo;
    function isAbsoluteSpan(span) {
        return typeof span.start === 'number';
    }
    /**
     * Adds a synthetic comment to the function declaration that contains the source location
     * of the class declaration.
     */
    function addSourceId(tcb, id) {
        ts.addSyntheticLeadingComment(tcb, ts.SyntaxKind.MultiLineCommentTrivia, id, true);
    }
    exports.addSourceId = addSourceId;
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
        // Locate the node that the diagnostic is reported on and determine its location in the source.
        var node = typescript_1.getTokenAtPosition(diagnostic.file, diagnostic.start);
        var sourceLocation = findSourceLocation(node, diagnostic.file);
        if (sourceLocation === null) {
            return null;
        }
        // Now use the external resolver to obtain the full `ParseSourceFile` of the template.
        var span = resolver.sourceLocationToSpan(sourceLocation);
        if (span === null) {
            return null;
        }
        var mapping = resolver.getSourceMapping(sourceLocation.id);
        return makeTemplateDiagnostic(mapping, span, diagnostic.category, diagnostic.code, diagnostic.messageText);
    }
    exports.translateDiagnostic = translateDiagnostic;
    /**
     * Constructs a `ts.Diagnostic` for a given `ParseSourceSpan` within a template.
     */
    function makeTemplateDiagnostic(mapping, span, category, code, messageText) {
        if (mapping.type === 'direct') {
            // For direct mappings, the error is shown inline as ngtsc was able to pinpoint a string
            // constant within the `@Component` decorator for the template. This allows us to map the error
            // directly into the bytes of the source file.
            return {
                source: 'ngtsc',
                code: code,
                category: category,
                messageText: messageText,
                file: mapping.node.getSourceFile(),
                start: span.start.offset,
                length: span.end.offset - span.start.offset,
            };
        }
        else if (mapping.type === 'indirect' || mapping.type === 'external') {
            // For indirect mappings (template was declared inline, but ngtsc couldn't map it directly
            // to a string constant in the decorator), the component's file name is given with a suffix
            // indicating it's not the TS file being displayed, but a template.
            // For external temoplates, the HTML filename is used.
            var componentSf = mapping.componentClass.getSourceFile();
            var componentName = mapping.componentClass.name.text;
            // TODO(alxhub): remove cast when TS in g3 supports this narrowing.
            var fileName = mapping.type === 'indirect' ?
                componentSf.fileName + " (" + componentName + " template)" :
                mapping.templateUrl;
            // TODO(alxhub): investigate creating a fake `ts.SourceFile` here instead of invoking the TS
            // parser against the template (HTML is just really syntactically invalid TypeScript code ;).
            // Also investigate caching the file to avoid running the parser multiple times.
            var sf = ts.createSourceFile(fileName, mapping.template, ts.ScriptTarget.Latest, false, ts.ScriptKind.JSX);
            return {
                source: 'ngtsc',
                category: category,
                code: code,
                messageText: messageText,
                file: sf,
                start: span.start.offset,
                length: span.end.offset - span.start.offset,
                // Show a secondary message indicating the component whose template contains the error.
                relatedInformation: [{
                        category: ts.DiagnosticCategory.Message,
                        code: 0,
                        file: componentSf,
                        // mapping.node represents either the 'template' or 'templateUrl' expression. getStart()
                        // and getEnd() are used because they don't include surrounding whitespace.
                        start: mapping.node.getStart(),
                        length: mapping.node.getEnd() - mapping.node.getStart(),
                        messageText: "Error occurs in the template of component " + componentName + ".",
                    }],
            };
        }
        else {
            throw new Error("Unexpected source mapping type: " + mapping.type);
        }
    }
    exports.makeTemplateDiagnostic = makeTemplateDiagnostic;
    function findSourceLocation(node, sourceFile) {
        // Search for comments until the TCB's function declaration is encountered.
        while (node !== undefined && !ts.isFunctionDeclaration(node)) {
            var parseSpan = ts.forEachTrailingCommentRange(sourceFile.text, node.getEnd(), function (pos, end, kind) {
                if (kind !== ts.SyntaxKind.MultiLineCommentTrivia) {
                    return null;
                }
                var commentText = sourceFile.text.substring(pos, end);
                return parseParseSpanComment(commentText);
            }) || null;
            if (parseSpan !== null) {
                // Once the positional information has been extracted, search further up the TCB to extract
                // the file information that is attached with the TCB's function declaration.
                return toSourceLocation(parseSpan, node, sourceFile);
            }
            node = node.parent;
        }
        return null;
    }
    function toSourceLocation(parseSpan, node, sourceFile) {
        // Walk up to the function declaration of the TCB, the file information is attached there.
        var tcb = node;
        while (!ts.isFunctionDeclaration(tcb)) {
            tcb = tcb.parent;
            // Bail once we have reached the root.
            if (tcb === undefined) {
                return null;
            }
        }
        var id = ts.forEachLeadingCommentRange(sourceFile.text, tcb.getFullStart(), function (pos, end, kind) {
            if (kind !== ts.SyntaxKind.MultiLineCommentTrivia) {
                return null;
            }
            var commentText = sourceFile.text.substring(pos, end);
            return commentText.substring(2, commentText.length - 2);
        }) || null;
        if (id === null) {
            return null;
        }
        return {
            id: id,
            start: parseSpan.start,
            end: parseSpan.end,
        };
    }
    var parseSpanComment = /^\/\*(\d+),(\d+)\*\/$/;
    function parseParseSpanComment(commentText) {
        var match = commentText.match(parseSpanComment);
        if (match === null) {
            return null;
        }
        return new compiler_1.ParseSpan(+match[1], +match[2]);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvZGlhZ25vc3RpY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw4Q0FBdUU7SUFDdkUsK0JBQWlDO0lBRWpDLGtGQUE2RDtJQXNDN0Q7OztPQUdHO0lBQ0gsU0FBZ0IsY0FBYyxDQUFDLElBQWUsRUFBRSxVQUEyQjtRQUN6RSxJQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztRQUN2QyxPQUFxQixFQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsR0FBRyxNQUFNLEVBQUMsQ0FBQztJQUM1RSxDQUFDO0lBSEQsd0NBR0M7SUFFRDs7Ozs7Ozs7O09BU0c7SUFDSCxTQUFnQixrQkFBa0IsQ0FBQyxJQUFtQjtRQUNwRCxPQUFPLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDOUIsQ0FBQztJQUZELGdEQUVDO0lBRUQ7OztPQUdHO0lBQ0gsU0FBZ0IsZ0JBQWdCLENBQUMsSUFBYSxFQUFFLElBQW9DO1FBQ2xGLElBQUksV0FBbUIsQ0FBQztRQUN4QixJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUN4QixXQUFXLEdBQU0sSUFBSSxDQUFDLEtBQUssU0FBSSxJQUFJLENBQUMsR0FBSyxDQUFDO1NBQzNDO2FBQU07WUFDTCxXQUFXLEdBQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLFNBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFRLENBQUM7U0FDekQ7UUFDRCxFQUFFLENBQUMsMkJBQTJCLENBQzFCLElBQUksRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLHNC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QU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUNsRCxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUU7WUFDbEIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELE9BQU8sSUFBSSxvQkFBUyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0MsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7UGFyc2VTb3VyY2VTcGFuLCBQYXJzZVNwYW4sIFBvc2l0aW9ufSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtnZXRUb2tlbkF0UG9zaXRpb259IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0V4dGVybmFsVGVtcGxhdGVTb3VyY2VNYXBwaW5nLCBUZW1wbGF0ZVNvdXJjZU1hcHBpbmd9IGZyb20gJy4vYXBpJztcblxuZXhwb3J0IGludGVyZmFjZSBTb3VyY2VMb2NhdGlvbiB7XG4gIGlkOiBzdHJpbmc7XG4gIHN0YXJ0OiBudW1iZXI7XG4gIGVuZDogbnVtYmVyO1xufVxuXG4vKipcbiAqIEFkYXB0ZXIgaW50ZXJmYWNlIHdoaWNoIGFsbG93cyB0aGUgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBkaWFnbm9zdGljcyBjb2RlIHRvIGludGVycHJldCBvZmZzZXRzXG4gKiBpbiBhIFRDQiBhbmQgbWFwIHRoZW0gYmFjayB0byBvcmlnaW5hbCBsb2NhdGlvbnMgaW4gdGhlIHRlbXBsYXRlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRjYlNvdXJjZVJlc29sdmVyIHtcbiAgLyoqXG4gICAqIEZvciB0aGUgZ2l2ZW4gdGVtcGxhdGUgaWQsIHJldHJpZXZlIHRoZSBvcmlnaW5hbCBzb3VyY2UgbWFwcGluZyB3aGljaCBkZXNjcmliZXMgaG93IHRoZSBvZmZzZXRzXG4gICAqIGluIHRoZSB0ZW1wbGF0ZSBzaG91bGQgYmUgaW50ZXJwcmV0ZWQuXG4gICAqL1xuICBnZXRTb3VyY2VNYXBwaW5nKGlkOiBzdHJpbmcpOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmc7XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgYSBsb2NhdGlvbiBleHRyYWN0ZWQgZnJvbSBhIFRDQiBpbnRvIGEgYFBhcnNlU291cmNlU3BhbmAgaWYgcG9zc2libGUuXG4gICAqL1xuICBzb3VyY2VMb2NhdGlvblRvU3Bhbihsb2NhdGlvbjogU291cmNlTG9jYXRpb24pOiBQYXJzZVNvdXJjZVNwYW58bnVsbDtcbn1cblxuLyoqXG4gKiBBbiBgQWJzb2x1dGVTcGFuYCBpcyB0aGUgcmVzdWx0IG9mIHRyYW5zbGF0aW5nIHRoZSBgUGFyc2VTcGFuYCBvZiBgQVNUYCB0ZW1wbGF0ZSBleHByZXNzaW9uIG5vZGVzXG4gKiB0byB0aGVpciBhYnNvbHV0ZSBwb3NpdGlvbnMsIGFzIHRoZSBgUGFyc2VTcGFuYCBpcyBhbHdheXMgcmVsYXRpdmUgdG8gdGhlIHN0YXJ0IG9mIHRoZVxuICogZXhwcmVzc2lvbiwgbm90IHRoZSBmdWxsIHRlbXBsYXRlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFic29sdXRlU3BhbiB7XG4gIF9fYnJhbmRfXzogJ0Fic29sdXRlU3Bhbic7XG4gIHN0YXJ0OiBudW1iZXI7XG4gIGVuZDogbnVtYmVyO1xufVxuXG4vKipcbiAqIFRyYW5zbGF0ZXMgYSBgUGFyc2VTcGFuYCBpbnRvIGFuIGBBYnNvbHV0ZVNwYW5gIGJ5IGluY29ycG9yYXRpbmcgdGhlIGxvY2F0aW9uIGluZm9ybWF0aW9uIHRoYXRcbiAqIHRoZSBgUGFyc2VTb3VyY2VTcGFuYCByZXByZXNlbnRzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9BYnNvbHV0ZVNwYW4oc3BhbjogUGFyc2VTcGFuLCBzb3VyY2VTcGFuOiBQYXJzZVNvdXJjZVNwYW4pOiBBYnNvbHV0ZVNwYW4ge1xuICBjb25zdCBvZmZzZXQgPSBzb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldDtcbiAgcmV0dXJuIDxBYnNvbHV0ZVNwYW4+e3N0YXJ0OiBzcGFuLnN0YXJ0ICsgb2Zmc2V0LCBlbmQ6IHNwYW4uZW5kICsgb2Zmc2V0fTtcbn1cblxuLyoqXG4gKiBXcmFwcyB0aGUgbm9kZSBpbiBwYXJlbnRoZXNpcyBzdWNoIHRoYXQgaW5zZXJ0ZWQgc3BhbiBjb21tZW50cyBiZWNvbWUgYXR0YWNoZWQgdG8gdGhlIHByb3BlclxuICogbm9kZS4gVGhpcyBpcyBhbiBhbGlhcyBmb3IgYHRzLmNyZWF0ZVBhcmVuYCB3aXRoIHRoZSBiZW5lZml0IHRoYXQgaXQgc2lnbmlmaWVzIHRoYXQgdGhlXG4gKiBpbnNlcnRlZCBwYXJlbnRoZXNpcyBhcmUgZm9yIGRpYWdub3N0aWMgcHVycG9zZXMsIG5vdCBmb3IgY29ycmVjdG5lc3Mgb2YgdGhlIHJlbmRlcmVkIFRDQiBjb2RlLlxuICpcbiAqIE5vdGUgdGhhdCBpdCBpcyBpbXBvcnRhbnQgdGhhdCBub2RlcyBhbmQgaXRzIGF0dGFjaGVkIGNvbW1lbnQgYXJlIG5vdCB3cmFwcGVkIGludG8gcGFyZW50aGVzaXNcbiAqIGJ5IGRlZmF1bHQsIGFzIGl0IHByZXZlbnRzIGNvcnJlY3QgdHJhbnNsYXRpb24gb2YgZS5nLiBkaWFnbm9zdGljcyBwcm9kdWNlZCBmb3IgaW5jb3JyZWN0IG1ldGhvZFxuICogYXJndW1lbnRzLiBTdWNoIGRpYWdub3N0aWNzIHdvdWxkIHRoZW4gYmUgcHJvZHVjZWQgZm9yIHRoZSBwYXJlbnRoZXNpc2VkIG5vZGUgd2hlcmVhcyB0aGVcbiAqIHBvc2l0aW9uYWwgY29tbWVudCB3b3VsZCBiZSBsb2NhdGVkIHdpdGhpbiB0aGF0IG5vZGUsIHJlc3VsdGluZyBpbiBhIG1pc21hdGNoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JhcEZvckRpYWdub3N0aWNzKGV4cHI6IHRzLkV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9uIHtcbiAgcmV0dXJuIHRzLmNyZWF0ZVBhcmVuKGV4cHIpO1xufVxuXG4vKipcbiAqIEFkZHMgYSBzeW50aGV0aWMgY29tbWVudCB0byB0aGUgZXhwcmVzc2lvbiB0aGF0IHJlcHJlc2VudHMgdGhlIHBhcnNlIHNwYW4gb2YgdGhlIHByb3ZpZGVkIG5vZGUuXG4gKiBUaGlzIGNvbW1lbnQgY2FuIGxhdGVyIGJlIHJldHJpZXZlZCBhcyB0cml2aWEgb2YgYSBub2RlIHRvIHJlY292ZXIgb3JpZ2luYWwgc291cmNlIGxvY2F0aW9ucy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFkZFBhcnNlU3BhbkluZm8obm9kZTogdHMuTm9kZSwgc3BhbjogQWJzb2x1dGVTcGFuIHwgUGFyc2VTb3VyY2VTcGFuKTogdm9pZCB7XG4gIGxldCBjb21tZW50VGV4dDogc3RyaW5nO1xuICBpZiAoaXNBYnNvbHV0ZVNwYW4oc3BhbikpIHtcbiAgICBjb21tZW50VGV4dCA9IGAke3NwYW4uc3RhcnR9LCR7c3Bhbi5lbmR9YDtcbiAgfSBlbHNlIHtcbiAgICBjb21tZW50VGV4dCA9IGAke3NwYW4uc3RhcnQub2Zmc2V0fSwke3NwYW4uZW5kLm9mZnNldH1gO1xuICB9XG4gIHRzLmFkZFN5bnRoZXRpY1RyYWlsaW5nQ29tbWVudChcbiAgICAgIG5vZGUsIHRzLlN5bnRheEtpbmQuTXVsdGlMaW5lQ29tbWVudFRyaXZpYSwgY29tbWVudFRleHQsXG4gICAgICAvKiBoYXNUcmFpbGluZ05ld0xpbmUgKi8gZmFsc2UpO1xufVxuXG5mdW5jdGlvbiBpc0Fic29sdXRlU3BhbihzcGFuOiBBYnNvbHV0ZVNwYW4gfCBQYXJzZVNvdXJjZVNwYW4pOiBzcGFuIGlzIEFic29sdXRlU3BhbiB7XG4gIHJldHVybiB0eXBlb2Ygc3Bhbi5zdGFydCA9PT0gJ251bWJlcic7XG59XG5cbi8qKlxuICogQWRkcyBhIHN5bnRoZXRpYyBjb21tZW50IHRvIHRoZSBmdW5jdGlvbiBkZWNsYXJhdGlvbiB0aGF0IGNvbnRhaW5zIHRoZSBzb3VyY2UgbG9jYXRpb25cbiAqIG9mIHRoZSBjbGFzcyBkZWNsYXJhdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFkZFNvdXJjZUlkKHRjYjogdHMuRnVuY3Rpb25EZWNsYXJhdGlvbiwgaWQ6IHN0cmluZyk6IHZvaWQge1xuICB0cy5hZGRTeW50aGV0aWNMZWFkaW5nQ29tbWVudCh0Y2IsIHRzLlN5bnRheEtpbmQuTXVsdGlMaW5lQ29tbWVudFRyaXZpYSwgaWQsIHRydWUpO1xufVxuXG4vKipcbiAqIERldGVybWluZXMgaWYgdGhlIGRpYWdub3N0aWMgc2hvdWxkIGJlIHJlcG9ydGVkLiBTb21lIGRpYWdub3N0aWNzIGFyZSBwcm9kdWNlZCBiZWNhdXNlIG9mIHRoZVxuICogd2F5IFRDQnMgYXJlIGdlbmVyYXRlZDsgdGhvc2UgZGlhZ25vc3RpY3Mgc2hvdWxkIG5vdCBiZSByZXBvcnRlZCBhcyB0eXBlIGNoZWNrIGVycm9ycyBvZiB0aGVcbiAqIHRlbXBsYXRlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2hvdWxkUmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljOiB0cy5EaWFnbm9zdGljKTogYm9vbGVhbiB7XG4gIGNvbnN0IHtjb2RlfSA9IGRpYWdub3N0aWM7XG4gIGlmIChjb2RlID09PSA2MTMzIC8qICR2YXIgaXMgZGVjbGFyZWQgYnV0IGl0cyB2YWx1ZSBpcyBuZXZlciByZWFkLiAqLykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSBlbHNlIGlmIChjb2RlID09PSA2MTk5IC8qIEFsbCB2YXJpYWJsZXMgYXJlIHVudXNlZC4gKi8pIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0gZWxzZSBpZiAoY29kZSA9PT0gMjY5NSAvKiBMZWZ0IHNpZGUgb2YgY29tbWEgb3BlcmF0b3IgaXMgdW51c2VkIGFuZCBoYXMgbm8gc2lkZSBlZmZlY3RzLiAqLykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBBdHRlbXB0cyB0byB0cmFuc2xhdGUgYSBUeXBlU2NyaXB0IGRpYWdub3N0aWMgcHJvZHVjZWQgZHVyaW5nIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgdG8gdGhlaXJcbiAqIGxvY2F0aW9uIG9mIG9yaWdpbiwgYmFzZWQgb24gdGhlIGNvbW1lbnRzIHRoYXQgYXJlIGVtaXR0ZWQgaW4gdGhlIFRDQiBjb2RlLlxuICpcbiAqIElmIHRoZSBkaWFnbm9zdGljIGNvdWxkIG5vdCBiZSB0cmFuc2xhdGVkLCBgbnVsbGAgaXMgcmV0dXJuZWQgdG8gaW5kaWNhdGUgdGhhdCB0aGUgZGlhZ25vc3RpY1xuICogc2hvdWxkIG5vdCBiZSByZXBvcnRlZCBhdCBhbGwuIFRoaXMgcHJldmVudHMgZGlhZ25vc3RpY3MgZnJvbSBub24tVENCIGNvZGUgaW4gYSB1c2VyJ3Mgc291cmNlXG4gKiBmaWxlIGZyb20gYmVpbmcgcmVwb3J0ZWQgYXMgdHlwZS1jaGVjayBlcnJvcnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0cmFuc2xhdGVEaWFnbm9zdGljKFxuICAgIGRpYWdub3N0aWM6IHRzLkRpYWdub3N0aWMsIHJlc29sdmVyOiBUY2JTb3VyY2VSZXNvbHZlcik6IHRzLkRpYWdub3N0aWN8bnVsbCB7XG4gIGlmIChkaWFnbm9zdGljLmZpbGUgPT09IHVuZGVmaW5lZCB8fCBkaWFnbm9zdGljLnN0YXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIExvY2F0ZSB0aGUgbm9kZSB0aGF0IHRoZSBkaWFnbm9zdGljIGlzIHJlcG9ydGVkIG9uIGFuZCBkZXRlcm1pbmUgaXRzIGxvY2F0aW9uIGluIHRoZSBzb3VyY2UuXG4gIGNvbnN0IG5vZGUgPSBnZXRUb2tlbkF0UG9zaXRpb24oZGlhZ25vc3RpYy5maWxlLCBkaWFnbm9zdGljLnN0YXJ0KTtcbiAgY29uc3Qgc291cmNlTG9jYXRpb24gPSBmaW5kU291cmNlTG9jYXRpb24obm9kZSwgZGlhZ25vc3RpYy5maWxlKTtcbiAgaWYgKHNvdXJjZUxvY2F0aW9uID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBOb3cgdXNlIHRoZSBleHRlcm5hbCByZXNvbHZlciB0byBvYnRhaW4gdGhlIGZ1bGwgYFBhcnNlU291cmNlRmlsZWAgb2YgdGhlIHRlbXBsYXRlLlxuICBjb25zdCBzcGFuID0gcmVzb2x2ZXIuc291cmNlTG9jYXRpb25Ub1NwYW4oc291cmNlTG9jYXRpb24pO1xuICBpZiAoc3BhbiA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgbWFwcGluZyA9IHJlc29sdmVyLmdldFNvdXJjZU1hcHBpbmcoc291cmNlTG9jYXRpb24uaWQpO1xuICByZXR1cm4gbWFrZVRlbXBsYXRlRGlhZ25vc3RpYyhcbiAgICAgIG1hcHBpbmcsIHNwYW4sIGRpYWdub3N0aWMuY2F0ZWdvcnksIGRpYWdub3N0aWMuY29kZSwgZGlhZ25vc3RpYy5tZXNzYWdlVGV4dCk7XG59XG5cbi8qKlxuICogQ29uc3RydWN0cyBhIGB0cy5EaWFnbm9zdGljYCBmb3IgYSBnaXZlbiBgUGFyc2VTb3VyY2VTcGFuYCB3aXRoaW4gYSB0ZW1wbGF0ZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1ha2VUZW1wbGF0ZURpYWdub3N0aWMoXG4gICAgbWFwcGluZzogVGVtcGxhdGVTb3VyY2VNYXBwaW5nLCBzcGFuOiBQYXJzZVNvdXJjZVNwYW4sIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnksXG4gICAgY29kZTogbnVtYmVyLCBtZXNzYWdlVGV4dDogc3RyaW5nIHwgdHMuRGlhZ25vc3RpY01lc3NhZ2VDaGFpbik6IHRzLkRpYWdub3N0aWMge1xuICBpZiAobWFwcGluZy50eXBlID09PSAnZGlyZWN0Jykge1xuICAgIC8vIEZvciBkaXJlY3QgbWFwcGluZ3MsIHRoZSBlcnJvciBpcyBzaG93biBpbmxpbmUgYXMgbmd0c2Mgd2FzIGFibGUgdG8gcGlucG9pbnQgYSBzdHJpbmdcbiAgICAvLyBjb25zdGFudCB3aXRoaW4gdGhlIGBAQ29tcG9uZW50YCBkZWNvcmF0b3IgZm9yIHRoZSB0ZW1wbGF0ZS4gVGhpcyBhbGxvd3MgdXMgdG8gbWFwIHRoZSBlcnJvclxuICAgIC8vIGRpcmVjdGx5IGludG8gdGhlIGJ5dGVzIG9mIHRoZSBzb3VyY2UgZmlsZS5cbiAgICByZXR1cm4ge1xuICAgICAgc291cmNlOiAnbmd0c2MnLFxuICAgICAgY29kZSxcbiAgICAgIGNhdGVnb3J5LFxuICAgICAgbWVzc2FnZVRleHQsXG4gICAgICBmaWxlOiBtYXBwaW5nLm5vZGUuZ2V0U291cmNlRmlsZSgpLFxuICAgICAgc3RhcnQ6IHNwYW4uc3RhcnQub2Zmc2V0LFxuICAgICAgbGVuZ3RoOiBzcGFuLmVuZC5vZmZzZXQgLSBzcGFuLnN0YXJ0Lm9mZnNldCxcbiAgICB9O1xuICB9IGVsc2UgaWYgKG1hcHBpbmcudHlwZSA9PT0gJ2luZGlyZWN0JyB8fCBtYXBwaW5nLnR5cGUgPT09ICdleHRlcm5hbCcpIHtcbiAgICAvLyBGb3IgaW5kaXJlY3QgbWFwcGluZ3MgKHRlbXBsYXRlIHdhcyBkZWNsYXJlZCBpbmxpbmUsIGJ1dCBuZ3RzYyBjb3VsZG4ndCBtYXAgaXQgZGlyZWN0bHlcbiAgICAvLyB0byBhIHN0cmluZyBjb25zdGFudCBpbiB0aGUgZGVjb3JhdG9yKSwgdGhlIGNvbXBvbmVudCdzIGZpbGUgbmFtZSBpcyBnaXZlbiB3aXRoIGEgc3VmZml4XG4gICAgLy8gaW5kaWNhdGluZyBpdCdzIG5vdCB0aGUgVFMgZmlsZSBiZWluZyBkaXNwbGF5ZWQsIGJ1dCBhIHRlbXBsYXRlLlxuICAgIC8vIEZvciBleHRlcm5hbCB0ZW1vcGxhdGVzLCB0aGUgSFRNTCBmaWxlbmFtZSBpcyB1c2VkLlxuICAgIGNvbnN0IGNvbXBvbmVudFNmID0gbWFwcGluZy5jb21wb25lbnRDbGFzcy5nZXRTb3VyY2VGaWxlKCk7XG4gICAgY29uc3QgY29tcG9uZW50TmFtZSA9IG1hcHBpbmcuY29tcG9uZW50Q2xhc3MubmFtZS50ZXh0O1xuICAgIC8vIFRPRE8oYWx4aHViKTogcmVtb3ZlIGNhc3Qgd2hlbiBUUyBpbiBnMyBzdXBwb3J0cyB0aGlzIG5hcnJvd2luZy5cbiAgICBjb25zdCBmaWxlTmFtZSA9IG1hcHBpbmcudHlwZSA9PT0gJ2luZGlyZWN0JyA/XG4gICAgICAgIGAke2NvbXBvbmVudFNmLmZpbGVOYW1lfSAoJHtjb21wb25lbnROYW1lfSB0ZW1wbGF0ZSlgIDpcbiAgICAgICAgKG1hcHBpbmcgYXMgRXh0ZXJuYWxUZW1wbGF0ZVNvdXJjZU1hcHBpbmcpLnRlbXBsYXRlVXJsO1xuICAgIC8vIFRPRE8oYWx4aHViKTogaW52ZXN0aWdhdGUgY3JlYXRpbmcgYSBmYWtlIGB0cy5Tb3VyY2VGaWxlYCBoZXJlIGluc3RlYWQgb2YgaW52b2tpbmcgdGhlIFRTXG4gICAgLy8gcGFyc2VyIGFnYWluc3QgdGhlIHRlbXBsYXRlIChIVE1MIGlzIGp1c3QgcmVhbGx5IHN5bnRhY3RpY2FsbHkgaW52YWxpZCBUeXBlU2NyaXB0IGNvZGUgOykuXG4gICAgLy8gQWxzbyBpbnZlc3RpZ2F0ZSBjYWNoaW5nIHRoZSBmaWxlIHRvIGF2b2lkIHJ1bm5pbmcgdGhlIHBhcnNlciBtdWx0aXBsZSB0aW1lcy5cbiAgICBjb25zdCBzZiA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUoXG4gICAgICAgIGZpbGVOYW1lLCBtYXBwaW5nLnRlbXBsYXRlLCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0LCBmYWxzZSwgdHMuU2NyaXB0S2luZC5KU1gpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHNvdXJjZTogJ25ndHNjJyxcbiAgICAgIGNhdGVnb3J5LFxuICAgICAgY29kZSxcbiAgICAgIG1lc3NhZ2VUZXh0LFxuICAgICAgZmlsZTogc2YsXG4gICAgICBzdGFydDogc3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgICBsZW5ndGg6IHNwYW4uZW5kLm9mZnNldCAtIHNwYW4uc3RhcnQub2Zmc2V0LFxuICAgICAgLy8gU2hvdyBhIHNlY29uZGFyeSBtZXNzYWdlIGluZGljYXRpbmcgdGhlIGNvbXBvbmVudCB3aG9zZSB0ZW1wbGF0ZSBjb250YWlucyB0aGUgZXJyb3IuXG4gICAgICByZWxhdGVkSW5mb3JtYXRpb246IFt7XG4gICAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuTWVzc2FnZSxcbiAgICAgICAgY29kZTogMCxcbiAgICAgICAgZmlsZTogY29tcG9uZW50U2YsXG4gICAgICAgIC8vIG1hcHBpbmcubm9kZSByZXByZXNlbnRzIGVpdGhlciB0aGUgJ3RlbXBsYXRlJyBvciAndGVtcGxhdGVVcmwnIGV4cHJlc3Npb24uIGdldFN0YXJ0KClcbiAgICAgICAgLy8gYW5kIGdldEVuZCgpIGFyZSB1c2VkIGJlY2F1c2UgdGhleSBkb24ndCBpbmNsdWRlIHN1cnJvdW5kaW5nIHdoaXRlc3BhY2UuXG4gICAgICAgIHN0YXJ0OiBtYXBwaW5nLm5vZGUuZ2V0U3RhcnQoKSxcbiAgICAgICAgbGVuZ3RoOiBtYXBwaW5nLm5vZGUuZ2V0RW5kKCkgLSBtYXBwaW5nLm5vZGUuZ2V0U3RhcnQoKSxcbiAgICAgICAgbWVzc2FnZVRleHQ6IGBFcnJvciBvY2N1cnMgaW4gdGhlIHRlbXBsYXRlIG9mIGNvbXBvbmVudCAke2NvbXBvbmVudE5hbWV9LmAsXG4gICAgICB9XSxcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihgVW5leHBlY3RlZCBzb3VyY2UgbWFwcGluZyB0eXBlOiAkeyhtYXBwaW5nIGFzIHt0eXBlOiBzdHJpbmd9KS50eXBlfWApO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmRTb3VyY2VMb2NhdGlvbihub2RlOiB0cy5Ob2RlLCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogU291cmNlTG9jYXRpb258bnVsbCB7XG4gIC8vIFNlYXJjaCBmb3IgY29tbWVudHMgdW50aWwgdGhlIFRDQidzIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIGlzIGVuY291bnRlcmVkLlxuICB3aGlsZSAobm9kZSAhPT0gdW5kZWZpbmVkICYmICF0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICBjb25zdCBwYXJzZVNwYW4gPVxuICAgICAgICB0cy5mb3JFYWNoVHJhaWxpbmdDb21tZW50UmFuZ2Uoc291cmNlRmlsZS50ZXh0LCBub2RlLmdldEVuZCgpLCAocG9zLCBlbmQsIGtpbmQpID0+IHtcbiAgICAgICAgICBpZiAoa2luZCAhPT0gdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgY29tbWVudFRleHQgPSBzb3VyY2VGaWxlLnRleHQuc3Vic3RyaW5nKHBvcywgZW5kKTtcbiAgICAgICAgICByZXR1cm4gcGFyc2VQYXJzZVNwYW5Db21tZW50KGNvbW1lbnRUZXh0KTtcbiAgICAgICAgfSkgfHwgbnVsbDtcbiAgICBpZiAocGFyc2VTcGFuICE9PSBudWxsKSB7XG4gICAgICAvLyBPbmNlIHRoZSBwb3NpdGlvbmFsIGluZm9ybWF0aW9uIGhhcyBiZWVuIGV4dHJhY3RlZCwgc2VhcmNoIGZ1cnRoZXIgdXAgdGhlIFRDQiB0byBleHRyYWN0XG4gICAgICAvLyB0aGUgZmlsZSBpbmZvcm1hdGlvbiB0aGF0IGlzIGF0dGFjaGVkIHdpdGggdGhlIFRDQidzIGZ1bmN0aW9uIGRlY2xhcmF0aW9uLlxuICAgICAgcmV0dXJuIHRvU291cmNlTG9jYXRpb24ocGFyc2VTcGFuLCBub2RlLCBzb3VyY2VGaWxlKTtcbiAgICB9XG5cbiAgICBub2RlID0gbm9kZS5wYXJlbnQ7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gdG9Tb3VyY2VMb2NhdGlvbihcbiAgICBwYXJzZVNwYW46IFBhcnNlU3Bhbiwgbm9kZTogdHMuTm9kZSwgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IFNvdXJjZUxvY2F0aW9ufG51bGwge1xuICAvLyBXYWxrIHVwIHRvIHRoZSBmdW5jdGlvbiBkZWNsYXJhdGlvbiBvZiB0aGUgVENCLCB0aGUgZmlsZSBpbmZvcm1hdGlvbiBpcyBhdHRhY2hlZCB0aGVyZS5cbiAgbGV0IHRjYiA9IG5vZGU7XG4gIHdoaWxlICghdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKHRjYikpIHtcbiAgICB0Y2IgPSB0Y2IucGFyZW50O1xuXG4gICAgLy8gQmFpbCBvbmNlIHdlIGhhdmUgcmVhY2hlZCB0aGUgcm9vdC5cbiAgICBpZiAodGNiID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGlkID1cbiAgICAgIHRzLmZvckVhY2hMZWFkaW5nQ29tbWVudFJhbmdlKHNvdXJjZUZpbGUudGV4dCwgdGNiLmdldEZ1bGxTdGFydCgpLCAocG9zLCBlbmQsIGtpbmQpID0+IHtcbiAgICAgICAgaWYgKGtpbmQgIT09IHRzLlN5bnRheEtpbmQuTXVsdGlMaW5lQ29tbWVudFRyaXZpYSkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNvbW1lbnRUZXh0ID0gc291cmNlRmlsZS50ZXh0LnN1YnN0cmluZyhwb3MsIGVuZCk7XG4gICAgICAgIHJldHVybiBjb21tZW50VGV4dC5zdWJzdHJpbmcoMiwgY29tbWVudFRleHQubGVuZ3RoIC0gMik7XG4gICAgICB9KSB8fCBudWxsO1xuICBpZiAoaWQgPT09IG51bGwpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaWQsXG4gICAgc3RhcnQ6IHBhcnNlU3Bhbi5zdGFydCxcbiAgICBlbmQ6IHBhcnNlU3Bhbi5lbmQsXG4gIH07XG59XG5cbmNvbnN0IHBhcnNlU3BhbkNvbW1lbnQgPSAvXlxcL1xcKihcXGQrKSwoXFxkKylcXCpcXC8kLztcblxuZnVuY3Rpb24gcGFyc2VQYXJzZVNwYW5Db21tZW50KGNvbW1lbnRUZXh0OiBzdHJpbmcpOiBQYXJzZVNwYW58bnVsbCB7XG4gIGNvbnN0IG1hdGNoID0gY29tbWVudFRleHQubWF0Y2gocGFyc2VTcGFuQ29tbWVudCk7XG4gIGlmIChtYXRjaCA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBQYXJzZVNwYW4oK21hdGNoWzFdLCArbWF0Y2hbMl0pO1xufVxuIl19