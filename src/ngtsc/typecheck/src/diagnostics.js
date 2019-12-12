(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
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
    function absoluteSourceSpanToSourceLocation(id, span) {
        return tslib_1.__assign({ id: id }, span);
    }
    exports.absoluteSourceSpanToSourceLocation = absoluteSourceSpanToSourceLocation;
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
    function makeTemplateDiagnostic(mapping, span, category, code, messageText, relatedMessage) {
        if (mapping.type === 'direct') {
            var relatedInformation = undefined;
            if (relatedMessage !== undefined) {
                relatedInformation = [{
                        category: ts.DiagnosticCategory.Message,
                        code: 0,
                        file: mapping.node.getSourceFile(),
                        start: relatedMessage.span.start.offset,
                        length: relatedMessage.span.end.offset - relatedMessage.span.start.offset,
                        messageText: relatedMessage.text,
                    }];
            }
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
                length: span.end.offset - span.start.offset, relatedInformation: relatedInformation,
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
            var relatedInformation = [];
            if (relatedMessage !== undefined) {
                relatedInformation.push({
                    category: ts.DiagnosticCategory.Message,
                    code: 0,
                    file: sf,
                    start: relatedMessage.span.start.offset,
                    length: relatedMessage.span.end.offset - relatedMessage.span.start.offset,
                    messageText: relatedMessage.text,
                });
            }
            relatedInformation.push({
                category: ts.DiagnosticCategory.Message,
                code: 0,
                file: componentSf,
                // mapping.node represents either the 'template' or 'templateUrl' expression. getStart()
                // and getEnd() are used because they don't include surrounding whitespace.
                start: mapping.node.getStart(),
                length: mapping.node.getEnd() - mapping.node.getStart(),
                messageText: "Error occurs in the template of component " + componentName + ".",
            });
            return {
                source: 'ngtsc',
                category: category,
                code: code,
                messageText: messageText,
                file: sf,
                start: span.start.offset,
                length: span.end.offset - span.start.offset,
                // Show a secondary message indicating the component whose template contains the error.
                relatedInformation: relatedInformation,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvZGlhZ25vc3RpY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsOENBQTJGO0lBQzNGLCtCQUFpQztJQUVqQyxrRkFBNkQ7SUFzQzdEOzs7T0FHRztJQUNILFNBQWdCLGNBQWMsQ0FBQyxJQUFlLEVBQUUsVUFBMkI7UUFDekUsSUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7UUFDdkMsT0FBcUIsRUFBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEdBQUcsTUFBTSxFQUFDLENBQUM7SUFDNUUsQ0FBQztJQUhELHdDQUdDO0lBRUQsU0FBZ0Isa0NBQWtDLENBQzlDLEVBQVUsRUFBRSxJQUF3QjtRQUN0QywwQkFBUSxFQUFFLElBQUEsSUFBSyxJQUFJLEVBQUU7SUFDdkIsQ0FBQztJQUhELGdGQUdDO0lBRUQ7Ozs7Ozs7OztPQVNHO0lBQ0gsU0FBZ0Isa0JBQWtCLENBQUMsSUFBbUI7UUFDcEQsT0FBTyxFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFGRCxnREFFQztJQUVEOzs7T0FHRztJQUNILFNBQWdCLGdCQUFnQixDQUFDLElBQWEsRUFBRSxJQUFvQztRQUNsRixJQUFJLFdBQW1CLENBQUM7UUFDeEIsSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDeEIsV0FBVyxHQUFNLElBQUksQ0FBQyxLQUFLLFNBQUksSUFBSSxDQUFDLEdBQUssQ0FBQztTQUMzQzthQUFNO1lBQ0wsV0FBVyxHQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxT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QyxHQUFHO1NBQ25CLENBQUM7SUFDSixDQUFDO0lBRUQsSUFBTSxnQkFBZ0IsR0FBRyx1QkFBdUIsQ0FBQztJQUVqRCxTQUFTLHFCQUFxQixDQUFDLFdBQW1CO1FBQ2hELElBQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUNsRCxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUU7WUFDbEIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELE9BQU8sSUFBSSxvQkFBUyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0MsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7QWJzb2x1dGVTb3VyY2VTcGFuLCBQYXJzZVNvdXJjZVNwYW4sIFBhcnNlU3BhbiwgUG9zaXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2dldFRva2VuQXRQb3NpdGlvbn0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXh0ZXJuYWxUZW1wbGF0ZVNvdXJjZU1hcHBpbmcsIFRlbXBsYXRlU291cmNlTWFwcGluZ30gZnJvbSAnLi9hcGknO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNvdXJjZUxvY2F0aW9uIHtcbiAgaWQ6IHN0cmluZztcbiAgc3RhcnQ6IG51bWJlcjtcbiAgZW5kOiBudW1iZXI7XG59XG5cbi8qKlxuICogQWRhcHRlciBpbnRlcmZhY2Ugd2hpY2ggYWxsb3dzIHRoZSB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGRpYWdub3N0aWNzIGNvZGUgdG8gaW50ZXJwcmV0IG9mZnNldHNcbiAqIGluIGEgVENCIGFuZCBtYXAgdGhlbSBiYWNrIHRvIG9yaWdpbmFsIGxvY2F0aW9ucyBpbiB0aGUgdGVtcGxhdGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGNiU291cmNlUmVzb2x2ZXIge1xuICAvKipcbiAgICogRm9yIHRoZSBnaXZlbiB0ZW1wbGF0ZSBpZCwgcmV0cmlldmUgdGhlIG9yaWdpbmFsIHNvdXJjZSBtYXBwaW5nIHdoaWNoIGRlc2NyaWJlcyBob3cgdGhlIG9mZnNldHNcbiAgICogaW4gdGhlIHRlbXBsYXRlIHNob3VsZCBiZSBpbnRlcnByZXRlZC5cbiAgICovXG4gIGdldFNvdXJjZU1hcHBpbmcoaWQ6IHN0cmluZyk6IFRlbXBsYXRlU291cmNlTWFwcGluZztcblxuICAvKipcbiAgICogQ29udmVydCBhIGxvY2F0aW9uIGV4dHJhY3RlZCBmcm9tIGEgVENCIGludG8gYSBgUGFyc2VTb3VyY2VTcGFuYCBpZiBwb3NzaWJsZS5cbiAgICovXG4gIHNvdXJjZUxvY2F0aW9uVG9TcGFuKGxvY2F0aW9uOiBTb3VyY2VMb2NhdGlvbik6IFBhcnNlU291cmNlU3BhbnxudWxsO1xufVxuXG4vKipcbiAqIEFuIGBBYnNvbHV0ZVNwYW5gIGlzIHRoZSByZXN1bHQgb2YgdHJhbnNsYXRpbmcgdGhlIGBQYXJzZVNwYW5gIG9mIGBBU1RgIHRlbXBsYXRlIGV4cHJlc3Npb24gbm9kZXNcbiAqIHRvIHRoZWlyIGFic29sdXRlIHBvc2l0aW9ucywgYXMgdGhlIGBQYXJzZVNwYW5gIGlzIGFsd2F5cyByZWxhdGl2ZSB0byB0aGUgc3RhcnQgb2YgdGhlXG4gKiBleHByZXNzaW9uLCBub3QgdGhlIGZ1bGwgdGVtcGxhdGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQWJzb2x1dGVTcGFuIHtcbiAgX19icmFuZF9fOiAnQWJzb2x1dGVTcGFuJztcbiAgc3RhcnQ6IG51bWJlcjtcbiAgZW5kOiBudW1iZXI7XG59XG5cbi8qKlxuICogVHJhbnNsYXRlcyBhIGBQYXJzZVNwYW5gIGludG8gYW4gYEFic29sdXRlU3BhbmAgYnkgaW5jb3Jwb3JhdGluZyB0aGUgbG9jYXRpb24gaW5mb3JtYXRpb24gdGhhdFxuICogdGhlIGBQYXJzZVNvdXJjZVNwYW5gIHJlcHJlc2VudHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b0Fic29sdXRlU3BhbihzcGFuOiBQYXJzZVNwYW4sIHNvdXJjZVNwYW46IFBhcnNlU291cmNlU3Bhbik6IEFic29sdXRlU3BhbiB7XG4gIGNvbnN0IG9mZnNldCA9IHNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0O1xuICByZXR1cm4gPEFic29sdXRlU3Bhbj57c3RhcnQ6IHNwYW4uc3RhcnQgKyBvZmZzZXQsIGVuZDogc3Bhbi5lbmQgKyBvZmZzZXR9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYWJzb2x1dGVTb3VyY2VTcGFuVG9Tb3VyY2VMb2NhdGlvbihcbiAgICBpZDogc3RyaW5nLCBzcGFuOiBBYnNvbHV0ZVNvdXJjZVNwYW4pOiBTb3VyY2VMb2NhdGlvbiB7XG4gIHJldHVybiB7aWQsIC4uLnNwYW59O1xufVxuXG4vKipcbiAqIFdyYXBzIHRoZSBub2RlIGluIHBhcmVudGhlc2lzIHN1Y2ggdGhhdCBpbnNlcnRlZCBzcGFuIGNvbW1lbnRzIGJlY29tZSBhdHRhY2hlZCB0byB0aGUgcHJvcGVyXG4gKiBub2RlLiBUaGlzIGlzIGFuIGFsaWFzIGZvciBgdHMuY3JlYXRlUGFyZW5gIHdpdGggdGhlIGJlbmVmaXQgdGhhdCBpdCBzaWduaWZpZXMgdGhhdCB0aGVcbiAqIGluc2VydGVkIHBhcmVudGhlc2lzIGFyZSBmb3IgZGlhZ25vc3RpYyBwdXJwb3Nlcywgbm90IGZvciBjb3JyZWN0bmVzcyBvZiB0aGUgcmVuZGVyZWQgVENCIGNvZGUuXG4gKlxuICogTm90ZSB0aGF0IGl0IGlzIGltcG9ydGFudCB0aGF0IG5vZGVzIGFuZCBpdHMgYXR0YWNoZWQgY29tbWVudCBhcmUgbm90IHdyYXBwZWQgaW50byBwYXJlbnRoZXNpc1xuICogYnkgZGVmYXVsdCwgYXMgaXQgcHJldmVudHMgY29ycmVjdCB0cmFuc2xhdGlvbiBvZiBlLmcuIGRpYWdub3N0aWNzIHByb2R1Y2VkIGZvciBpbmNvcnJlY3QgbWV0aG9kXG4gKiBhcmd1bWVudHMuIFN1Y2ggZGlhZ25vc3RpY3Mgd291bGQgdGhlbiBiZSBwcm9kdWNlZCBmb3IgdGhlIHBhcmVudGhlc2lzZWQgbm9kZSB3aGVyZWFzIHRoZVxuICogcG9zaXRpb25hbCBjb21tZW50IHdvdWxkIGJlIGxvY2F0ZWQgd2l0aGluIHRoYXQgbm9kZSwgcmVzdWx0aW5nIGluIGEgbWlzbWF0Y2guXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cmFwRm9yRGlhZ25vc3RpY3MoZXhwcjogdHMuRXhwcmVzc2lvbik6IHRzLkV4cHJlc3Npb24ge1xuICByZXR1cm4gdHMuY3JlYXRlUGFyZW4oZXhwcik7XG59XG5cbi8qKlxuICogQWRkcyBhIHN5bnRoZXRpYyBjb21tZW50IHRvIHRoZSBleHByZXNzaW9uIHRoYXQgcmVwcmVzZW50cyB0aGUgcGFyc2Ugc3BhbiBvZiB0aGUgcHJvdmlkZWQgbm9kZS5cbiAqIFRoaXMgY29tbWVudCBjYW4gbGF0ZXIgYmUgcmV0cmlldmVkIGFzIHRyaXZpYSBvZiBhIG5vZGUgdG8gcmVjb3ZlciBvcmlnaW5hbCBzb3VyY2UgbG9jYXRpb25zLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYWRkUGFyc2VTcGFuSW5mbyhub2RlOiB0cy5Ob2RlLCBzcGFuOiBBYnNvbHV0ZVNwYW4gfCBQYXJzZVNvdXJjZVNwYW4pOiB2b2lkIHtcbiAgbGV0IGNvbW1lbnRUZXh0OiBzdHJpbmc7XG4gIGlmIChpc0Fic29sdXRlU3BhbihzcGFuKSkge1xuICAgIGNvbW1lbnRUZXh0ID0gYCR7c3Bhbi5zdGFydH0sJHtzcGFuLmVuZH1gO1xuICB9IGVsc2Uge1xuICAgIGNvbW1lbnRUZXh0ID0gYCR7c3Bhbi5zdGFydC5vZmZzZXR9LCR7c3Bhbi5lbmQub2Zmc2V0fWA7XG4gIH1cbiAgdHMuYWRkU3ludGhldGljVHJhaWxpbmdDb21tZW50KFxuICAgICAgbm9kZSwgdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhLCBjb21tZW50VGV4dCxcbiAgICAgIC8qIGhhc1RyYWlsaW5nTmV3TGluZSAqLyBmYWxzZSk7XG59XG5cbmZ1bmN0aW9uIGlzQWJzb2x1dGVTcGFuKHNwYW46IEFic29sdXRlU3BhbiB8IFBhcnNlU291cmNlU3Bhbik6IHNwYW4gaXMgQWJzb2x1dGVTcGFuIHtcbiAgcmV0dXJuIHR5cGVvZiBzcGFuLnN0YXJ0ID09PSAnbnVtYmVyJztcbn1cblxuLyoqXG4gKiBBZGRzIGEgc3ludGhldGljIGNvbW1lbnQgdG8gdGhlIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIHRoYXQgY29udGFpbnMgdGhlIHNvdXJjZSBsb2NhdGlvblxuICogb2YgdGhlIGNsYXNzIGRlY2xhcmF0aW9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYWRkU291cmNlSWQodGNiOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uLCBpZDogc3RyaW5nKTogdm9pZCB7XG4gIHRzLmFkZFN5bnRoZXRpY0xlYWRpbmdDb21tZW50KHRjYiwgdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhLCBpZCwgdHJ1ZSk7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyBpZiB0aGUgZGlhZ25vc3RpYyBzaG91bGQgYmUgcmVwb3J0ZWQuIFNvbWUgZGlhZ25vc3RpY3MgYXJlIHByb2R1Y2VkIGJlY2F1c2Ugb2YgdGhlXG4gKiB3YXkgVENCcyBhcmUgZ2VuZXJhdGVkOyB0aG9zZSBkaWFnbm9zdGljcyBzaG91bGQgbm90IGJlIHJlcG9ydGVkIGFzIHR5cGUgY2hlY2sgZXJyb3JzIG9mIHRoZVxuICogdGVtcGxhdGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzaG91bGRSZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWM6IHRzLkRpYWdub3N0aWMpOiBib29sZWFuIHtcbiAgY29uc3Qge2NvZGV9ID0gZGlhZ25vc3RpYztcbiAgaWYgKGNvZGUgPT09IDYxMzMgLyogJHZhciBpcyBkZWNsYXJlZCBidXQgaXRzIHZhbHVlIGlzIG5ldmVyIHJlYWQuICovKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9IGVsc2UgaWYgKGNvZGUgPT09IDYxOTkgLyogQWxsIHZhcmlhYmxlcyBhcmUgdW51c2VkLiAqLykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSBlbHNlIGlmIChjb2RlID09PSAyNjk1IC8qIExlZnQgc2lkZSBvZiBjb21tYSBvcGVyYXRvciBpcyB1bnVzZWQgYW5kIGhhcyBubyBzaWRlIGVmZmVjdHMuICovKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9IGVsc2UgaWYgKGNvZGUgPT09IDcwMDYgLyogUGFyYW1ldGVyICckZXZlbnQnIGltcGxpY2l0bHkgaGFzIGFuICdhbnknIHR5cGUuICovKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEF0dGVtcHRzIHRvIHRyYW5zbGF0ZSBhIFR5cGVTY3JpcHQgZGlhZ25vc3RpYyBwcm9kdWNlZCBkdXJpbmcgdGVtcGxhdGUgdHlwZS1jaGVja2luZyB0byB0aGVpclxuICogbG9jYXRpb24gb2Ygb3JpZ2luLCBiYXNlZCBvbiB0aGUgY29tbWVudHMgdGhhdCBhcmUgZW1pdHRlZCBpbiB0aGUgVENCIGNvZGUuXG4gKlxuICogSWYgdGhlIGRpYWdub3N0aWMgY291bGQgbm90IGJlIHRyYW5zbGF0ZWQsIGBudWxsYCBpcyByZXR1cm5lZCB0byBpbmRpY2F0ZSB0aGF0IHRoZSBkaWFnbm9zdGljXG4gKiBzaG91bGQgbm90IGJlIHJlcG9ydGVkIGF0IGFsbC4gVGhpcyBwcmV2ZW50cyBkaWFnbm9zdGljcyBmcm9tIG5vbi1UQ0IgY29kZSBpbiBhIHVzZXIncyBzb3VyY2VcbiAqIGZpbGUgZnJvbSBiZWluZyByZXBvcnRlZCBhcyB0eXBlLWNoZWNrIGVycm9ycy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zbGF0ZURpYWdub3N0aWMoXG4gICAgZGlhZ25vc3RpYzogdHMuRGlhZ25vc3RpYywgcmVzb2x2ZXI6IFRjYlNvdXJjZVJlc29sdmVyKTogdHMuRGlhZ25vc3RpY3xudWxsIHtcbiAgaWYgKGRpYWdub3N0aWMuZmlsZSA9PT0gdW5kZWZpbmVkIHx8IGRpYWdub3N0aWMuc3RhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gTG9jYXRlIHRoZSBub2RlIHRoYXQgdGhlIGRpYWdub3N0aWMgaXMgcmVwb3J0ZWQgb24gYW5kIGRldGVybWluZSBpdHMgbG9jYXRpb24gaW4gdGhlIHNvdXJjZS5cbiAgY29uc3Qgbm9kZSA9IGdldFRva2VuQXRQb3NpdGlvbihkaWFnbm9zdGljLmZpbGUsIGRpYWdub3N0aWMuc3RhcnQpO1xuICBjb25zdCBzb3VyY2VMb2NhdGlvbiA9IGZpbmRTb3VyY2VMb2NhdGlvbihub2RlLCBkaWFnbm9zdGljLmZpbGUpO1xuICBpZiAoc291cmNlTG9jYXRpb24gPT09IG51bGwpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIE5vdyB1c2UgdGhlIGV4dGVybmFsIHJlc29sdmVyIHRvIG9idGFpbiB0aGUgZnVsbCBgUGFyc2VTb3VyY2VGaWxlYCBvZiB0aGUgdGVtcGxhdGUuXG4gIGNvbnN0IHNwYW4gPSByZXNvbHZlci5zb3VyY2VMb2NhdGlvblRvU3Bhbihzb3VyY2VMb2NhdGlvbik7XG4gIGlmIChzcGFuID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBtYXBwaW5nID0gcmVzb2x2ZXIuZ2V0U291cmNlTWFwcGluZyhzb3VyY2VMb2NhdGlvbi5pZCk7XG4gIHJldHVybiBtYWtlVGVtcGxhdGVEaWFnbm9zdGljKFxuICAgICAgbWFwcGluZywgc3BhbiwgZGlhZ25vc3RpYy5jYXRlZ29yeSwgZGlhZ25vc3RpYy5jb2RlLCBkaWFnbm9zdGljLm1lc3NhZ2VUZXh0KTtcbn1cblxuLyoqXG4gKiBDb25zdHJ1Y3RzIGEgYHRzLkRpYWdub3N0aWNgIGZvciBhIGdpdmVuIGBQYXJzZVNvdXJjZVNwYW5gIHdpdGhpbiBhIHRlbXBsYXRlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFrZVRlbXBsYXRlRGlhZ25vc3RpYyhcbiAgICBtYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmcsIHNwYW46IFBhcnNlU291cmNlU3BhbiwgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeSxcbiAgICBjb2RlOiBudW1iZXIsIG1lc3NhZ2VUZXh0OiBzdHJpbmcgfCB0cy5EaWFnbm9zdGljTWVzc2FnZUNoYWluLCByZWxhdGVkTWVzc2FnZT86IHtcbiAgICAgIHRleHQ6IHN0cmluZyxcbiAgICAgIHNwYW46IFBhcnNlU291cmNlU3BhbixcbiAgICB9KTogdHMuRGlhZ25vc3RpYyB7XG4gIGlmIChtYXBwaW5nLnR5cGUgPT09ICdkaXJlY3QnKSB7XG4gICAgbGV0IHJlbGF0ZWRJbmZvcm1hdGlvbjogdHMuRGlhZ25vc3RpY1JlbGF0ZWRJbmZvcm1hdGlvbltdfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAocmVsYXRlZE1lc3NhZ2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmVsYXRlZEluZm9ybWF0aW9uID0gW3tcbiAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5NZXNzYWdlLFxuICAgICAgICBjb2RlOiAwLFxuICAgICAgICBmaWxlOiBtYXBwaW5nLm5vZGUuZ2V0U291cmNlRmlsZSgpLFxuICAgICAgICBzdGFydDogcmVsYXRlZE1lc3NhZ2Uuc3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgICAgIGxlbmd0aDogcmVsYXRlZE1lc3NhZ2Uuc3Bhbi5lbmQub2Zmc2V0IC0gcmVsYXRlZE1lc3NhZ2Uuc3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgICAgIG1lc3NhZ2VUZXh0OiByZWxhdGVkTWVzc2FnZS50ZXh0LFxuICAgICAgfV07XG4gICAgfVxuICAgIC8vIEZvciBkaXJlY3QgbWFwcGluZ3MsIHRoZSBlcnJvciBpcyBzaG93biBpbmxpbmUgYXMgbmd0c2Mgd2FzIGFibGUgdG8gcGlucG9pbnQgYSBzdHJpbmdcbiAgICAvLyBjb25zdGFudCB3aXRoaW4gdGhlIGBAQ29tcG9uZW50YCBkZWNvcmF0b3IgZm9yIHRoZSB0ZW1wbGF0ZS4gVGhpcyBhbGxvd3MgdXMgdG8gbWFwIHRoZSBlcnJvclxuICAgIC8vIGRpcmVjdGx5IGludG8gdGhlIGJ5dGVzIG9mIHRoZSBzb3VyY2UgZmlsZS5cbiAgICByZXR1cm4ge1xuICAgICAgc291cmNlOiAnbmd0c2MnLFxuICAgICAgY29kZSxcbiAgICAgIGNhdGVnb3J5LFxuICAgICAgbWVzc2FnZVRleHQsXG4gICAgICBmaWxlOiBtYXBwaW5nLm5vZGUuZ2V0U291cmNlRmlsZSgpLFxuICAgICAgc3RhcnQ6IHNwYW4uc3RhcnQub2Zmc2V0LFxuICAgICAgbGVuZ3RoOiBzcGFuLmVuZC5vZmZzZXQgLSBzcGFuLnN0YXJ0Lm9mZnNldCwgcmVsYXRlZEluZm9ybWF0aW9uLFxuICAgIH07XG4gIH0gZWxzZSBpZiAobWFwcGluZy50eXBlID09PSAnaW5kaXJlY3QnIHx8IG1hcHBpbmcudHlwZSA9PT0gJ2V4dGVybmFsJykge1xuICAgIC8vIEZvciBpbmRpcmVjdCBtYXBwaW5ncyAodGVtcGxhdGUgd2FzIGRlY2xhcmVkIGlubGluZSwgYnV0IG5ndHNjIGNvdWxkbid0IG1hcCBpdCBkaXJlY3RseVxuICAgIC8vIHRvIGEgc3RyaW5nIGNvbnN0YW50IGluIHRoZSBkZWNvcmF0b3IpLCB0aGUgY29tcG9uZW50J3MgZmlsZSBuYW1lIGlzIGdpdmVuIHdpdGggYSBzdWZmaXhcbiAgICAvLyBpbmRpY2F0aW5nIGl0J3Mgbm90IHRoZSBUUyBmaWxlIGJlaW5nIGRpc3BsYXllZCwgYnV0IGEgdGVtcGxhdGUuXG4gICAgLy8gRm9yIGV4dGVybmFsIHRlbW9wbGF0ZXMsIHRoZSBIVE1MIGZpbGVuYW1lIGlzIHVzZWQuXG4gICAgY29uc3QgY29tcG9uZW50U2YgPSBtYXBwaW5nLmNvbXBvbmVudENsYXNzLmdldFNvdXJjZUZpbGUoKTtcbiAgICBjb25zdCBjb21wb25lbnROYW1lID0gbWFwcGluZy5jb21wb25lbnRDbGFzcy5uYW1lLnRleHQ7XG4gICAgLy8gVE9ETyhhbHhodWIpOiByZW1vdmUgY2FzdCB3aGVuIFRTIGluIGczIHN1cHBvcnRzIHRoaXMgbmFycm93aW5nLlxuICAgIGNvbnN0IGZpbGVOYW1lID0gbWFwcGluZy50eXBlID09PSAnaW5kaXJlY3QnID9cbiAgICAgICAgYCR7Y29tcG9uZW50U2YuZmlsZU5hbWV9ICgke2NvbXBvbmVudE5hbWV9IHRlbXBsYXRlKWAgOlxuICAgICAgICAobWFwcGluZyBhcyBFeHRlcm5hbFRlbXBsYXRlU291cmNlTWFwcGluZykudGVtcGxhdGVVcmw7XG4gICAgLy8gVE9ETyhhbHhodWIpOiBpbnZlc3RpZ2F0ZSBjcmVhdGluZyBhIGZha2UgYHRzLlNvdXJjZUZpbGVgIGhlcmUgaW5zdGVhZCBvZiBpbnZva2luZyB0aGUgVFNcbiAgICAvLyBwYXJzZXIgYWdhaW5zdCB0aGUgdGVtcGxhdGUgKEhUTUwgaXMganVzdCByZWFsbHkgc3ludGFjdGljYWxseSBpbnZhbGlkIFR5cGVTY3JpcHQgY29kZSA7KS5cbiAgICAvLyBBbHNvIGludmVzdGlnYXRlIGNhY2hpbmcgdGhlIGZpbGUgdG8gYXZvaWQgcnVubmluZyB0aGUgcGFyc2VyIG11bHRpcGxlIHRpbWVzLlxuICAgIGNvbnN0IHNmID0gdHMuY3JlYXRlU291cmNlRmlsZShcbiAgICAgICAgZmlsZU5hbWUsIG1hcHBpbmcudGVtcGxhdGUsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIGZhbHNlLCB0cy5TY3JpcHRLaW5kLkpTWCk7XG5cbiAgICBsZXQgcmVsYXRlZEluZm9ybWF0aW9uOiB0cy5EaWFnbm9zdGljUmVsYXRlZEluZm9ybWF0aW9uW10gPSBbXTtcbiAgICBpZiAocmVsYXRlZE1lc3NhZ2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmVsYXRlZEluZm9ybWF0aW9uLnB1c2goe1xuICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5Lk1lc3NhZ2UsXG4gICAgICAgIGNvZGU6IDAsXG4gICAgICAgIGZpbGU6IHNmLFxuICAgICAgICBzdGFydDogcmVsYXRlZE1lc3NhZ2Uuc3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgICAgIGxlbmd0aDogcmVsYXRlZE1lc3NhZ2Uuc3Bhbi5lbmQub2Zmc2V0IC0gcmVsYXRlZE1lc3NhZ2Uuc3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgICAgIG1lc3NhZ2VUZXh0OiByZWxhdGVkTWVzc2FnZS50ZXh0LFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmVsYXRlZEluZm9ybWF0aW9uLnB1c2goe1xuICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5NZXNzYWdlLFxuICAgICAgY29kZTogMCxcbiAgICAgIGZpbGU6IGNvbXBvbmVudFNmLFxuICAgICAgLy8gbWFwcGluZy5ub2RlIHJlcHJlc2VudHMgZWl0aGVyIHRoZSAndGVtcGxhdGUnIG9yICd0ZW1wbGF0ZVVybCcgZXhwcmVzc2lvbi4gZ2V0U3RhcnQoKVxuICAgICAgLy8gYW5kIGdldEVuZCgpIGFyZSB1c2VkIGJlY2F1c2UgdGhleSBkb24ndCBpbmNsdWRlIHN1cnJvdW5kaW5nIHdoaXRlc3BhY2UuXG4gICAgICBzdGFydDogbWFwcGluZy5ub2RlLmdldFN0YXJ0KCksXG4gICAgICBsZW5ndGg6IG1hcHBpbmcubm9kZS5nZXRFbmQoKSAtIG1hcHBpbmcubm9kZS5nZXRTdGFydCgpLFxuICAgICAgbWVzc2FnZVRleHQ6IGBFcnJvciBvY2N1cnMgaW4gdGhlIHRlbXBsYXRlIG9mIGNvbXBvbmVudCAke2NvbXBvbmVudE5hbWV9LmAsXG4gICAgfSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgc291cmNlOiAnbmd0c2MnLFxuICAgICAgY2F0ZWdvcnksXG4gICAgICBjb2RlLFxuICAgICAgbWVzc2FnZVRleHQsXG4gICAgICBmaWxlOiBzZixcbiAgICAgIHN0YXJ0OiBzcGFuLnN0YXJ0Lm9mZnNldCxcbiAgICAgIGxlbmd0aDogc3Bhbi5lbmQub2Zmc2V0IC0gc3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgICAvLyBTaG93IGEgc2Vjb25kYXJ5IG1lc3NhZ2UgaW5kaWNhdGluZyB0aGUgY29tcG9uZW50IHdob3NlIHRlbXBsYXRlIGNvbnRhaW5zIHRoZSBlcnJvci5cbiAgICAgIHJlbGF0ZWRJbmZvcm1hdGlvbixcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihgVW5leHBlY3RlZCBzb3VyY2UgbWFwcGluZyB0eXBlOiAkeyhtYXBwaW5nIGFzIHt0eXBlOiBzdHJpbmd9KS50eXBlfWApO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmRTb3VyY2VMb2NhdGlvbihub2RlOiB0cy5Ob2RlLCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogU291cmNlTG9jYXRpb258bnVsbCB7XG4gIC8vIFNlYXJjaCBmb3IgY29tbWVudHMgdW50aWwgdGhlIFRDQidzIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIGlzIGVuY291bnRlcmVkLlxuICB3aGlsZSAobm9kZSAhPT0gdW5kZWZpbmVkICYmICF0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICBjb25zdCBwYXJzZVNwYW4gPVxuICAgICAgICB0cy5mb3JFYWNoVHJhaWxpbmdDb21tZW50UmFuZ2Uoc291cmNlRmlsZS50ZXh0LCBub2RlLmdldEVuZCgpLCAocG9zLCBlbmQsIGtpbmQpID0+IHtcbiAgICAgICAgICBpZiAoa2luZCAhPT0gdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgY29tbWVudFRleHQgPSBzb3VyY2VGaWxlLnRleHQuc3Vic3RyaW5nKHBvcywgZW5kKTtcbiAgICAgICAgICByZXR1cm4gcGFyc2VQYXJzZVNwYW5Db21tZW50KGNvbW1lbnRUZXh0KTtcbiAgICAgICAgfSkgfHwgbnVsbDtcbiAgICBpZiAocGFyc2VTcGFuICE9PSBudWxsKSB7XG4gICAgICAvLyBPbmNlIHRoZSBwb3NpdGlvbmFsIGluZm9ybWF0aW9uIGhhcyBiZWVuIGV4dHJhY3RlZCwgc2VhcmNoIGZ1cnRoZXIgdXAgdGhlIFRDQiB0byBleHRyYWN0XG4gICAgICAvLyB0aGUgZmlsZSBpbmZvcm1hdGlvbiB0aGF0IGlzIGF0dGFjaGVkIHdpdGggdGhlIFRDQidzIGZ1bmN0aW9uIGRlY2xhcmF0aW9uLlxuICAgICAgcmV0dXJuIHRvU291cmNlTG9jYXRpb24ocGFyc2VTcGFuLCBub2RlLCBzb3VyY2VGaWxlKTtcbiAgICB9XG5cbiAgICBub2RlID0gbm9kZS5wYXJlbnQ7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gdG9Tb3VyY2VMb2NhdGlvbihcbiAgICBwYXJzZVNwYW46IFBhcnNlU3Bhbiwgbm9kZTogdHMuTm9kZSwgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IFNvdXJjZUxvY2F0aW9ufG51bGwge1xuICAvLyBXYWxrIHVwIHRvIHRoZSBmdW5jdGlvbiBkZWNsYXJhdGlvbiBvZiB0aGUgVENCLCB0aGUgZmlsZSBpbmZvcm1hdGlvbiBpcyBhdHRhY2hlZCB0aGVyZS5cbiAgbGV0IHRjYiA9IG5vZGU7XG4gIHdoaWxlICghdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKHRjYikpIHtcbiAgICB0Y2IgPSB0Y2IucGFyZW50O1xuXG4gICAgLy8gQmFpbCBvbmNlIHdlIGhhdmUgcmVhY2hlZCB0aGUgcm9vdC5cbiAgICBpZiAodGNiID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGlkID1cbiAgICAgIHRzLmZvckVhY2hMZWFkaW5nQ29tbWVudFJhbmdlKHNvdXJjZUZpbGUudGV4dCwgdGNiLmdldEZ1bGxTdGFydCgpLCAocG9zLCBlbmQsIGtpbmQpID0+IHtcbiAgICAgICAgaWYgKGtpbmQgIT09IHRzLlN5bnRheEtpbmQuTXVsdGlMaW5lQ29tbWVudFRyaXZpYSkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNvbW1lbnRUZXh0ID0gc291cmNlRmlsZS50ZXh0LnN1YnN0cmluZyhwb3MsIGVuZCk7XG4gICAgICAgIHJldHVybiBjb21tZW50VGV4dC5zdWJzdHJpbmcoMiwgY29tbWVudFRleHQubGVuZ3RoIC0gMik7XG4gICAgICB9KSB8fCBudWxsO1xuICBpZiAoaWQgPT09IG51bGwpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaWQsXG4gICAgc3RhcnQ6IHBhcnNlU3Bhbi5zdGFydCxcbiAgICBlbmQ6IHBhcnNlU3Bhbi5lbmQsXG4gIH07XG59XG5cbmNvbnN0IHBhcnNlU3BhbkNvbW1lbnQgPSAvXlxcL1xcKihcXGQrKSwoXFxkKylcXCpcXC8kLztcblxuZnVuY3Rpb24gcGFyc2VQYXJzZVNwYW5Db21tZW50KGNvbW1lbnRUZXh0OiBzdHJpbmcpOiBQYXJzZVNwYW58bnVsbCB7XG4gIGNvbnN0IG1hdGNoID0gY29tbWVudFRleHQubWF0Y2gocGFyc2VTcGFuQ29tbWVudCk7XG4gIGlmIChtYXRjaCA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBQYXJzZVNwYW4oK21hdGNoWzFdLCArbWF0Y2hbMl0pO1xufVxuIl19