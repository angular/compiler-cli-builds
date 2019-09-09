(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
        return { start: +match[1], end: +match[2] };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvZGlhZ25vc3RpY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFRQSwrQkFBaUM7SUFFakMsa0ZBQTZEO0lBc0M3RDs7O09BR0c7SUFDSCxTQUFnQixjQUFjLENBQUMsSUFBZSxFQUFFLFVBQTJCO1FBQ3pFLElBQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO1FBQ3ZDLE9BQXFCLEVBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxHQUFHLE1BQU0sRUFBQyxDQUFDO0lBQzVFLENBQUM7SUFIRCx3Q0FHQztJQUVEOzs7Ozs7Ozs7T0FTRztJQUNILFNBQWdCLGtCQUFrQixDQUFDLElBQW1CO1FBQ3BELE9BQU8sRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRkQsZ0RBRUM7SUFFRDs7O09BR0c7SUFDSCxTQUFnQixnQkFBZ0IsQ0FBQyxJQUFhLEVBQUUsSUFBb0M7UUFDbEYsSUFBSSxXQUFtQixDQUFDO1FBQ3hCLElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3hCLFdBQVcsR0FBTSxJQUFJLENBQUMsS0FBSyxTQUFJLElBQUksQ0FBQyxHQUFLLENBQUM7U0FDM0M7YUFBTTtZQUNMLFdBQVcsR0FBTSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sU0FBSSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQVEsQ0FBQztTQUN6RDtRQUNELEVBQUUsQ0FBQywyQkFBMkIsQ0FDMUIsSUFBSSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLEVBQUUsV0FBVztRQUN2RCx3QkFBd0Is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Q0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2xELElBQUksS0FBSyxLQUFLLElBQUksRUFBRTtZQUNsQixPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsT0FBTyxFQUFDLEtBQUssRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQztJQUM1QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtQYXJzZVNvdXJjZVNwYW4sIFBhcnNlU3BhbiwgUG9zaXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2dldFRva2VuQXRQb3NpdGlvbn0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXh0ZXJuYWxUZW1wbGF0ZVNvdXJjZU1hcHBpbmcsIFRlbXBsYXRlU291cmNlTWFwcGluZ30gZnJvbSAnLi9hcGknO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNvdXJjZUxvY2F0aW9uIHtcbiAgaWQ6IHN0cmluZztcbiAgc3RhcnQ6IG51bWJlcjtcbiAgZW5kOiBudW1iZXI7XG59XG5cbi8qKlxuICogQWRhcHRlciBpbnRlcmZhY2Ugd2hpY2ggYWxsb3dzIHRoZSB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGRpYWdub3N0aWNzIGNvZGUgdG8gaW50ZXJwcmV0IG9mZnNldHNcbiAqIGluIGEgVENCIGFuZCBtYXAgdGhlbSBiYWNrIHRvIG9yaWdpbmFsIGxvY2F0aW9ucyBpbiB0aGUgdGVtcGxhdGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGNiU291cmNlUmVzb2x2ZXIge1xuICAvKipcbiAgICogRm9yIHRoZSBnaXZlbiB0ZW1wbGF0ZSBpZCwgcmV0cmlldmUgdGhlIG9yaWdpbmFsIHNvdXJjZSBtYXBwaW5nIHdoaWNoIGRlc2NyaWJlcyBob3cgdGhlIG9mZnNldHNcbiAgICogaW4gdGhlIHRlbXBsYXRlIHNob3VsZCBiZSBpbnRlcnByZXRlZC5cbiAgICovXG4gIGdldFNvdXJjZU1hcHBpbmcoaWQ6IHN0cmluZyk6IFRlbXBsYXRlU291cmNlTWFwcGluZztcblxuICAvKipcbiAgICogQ29udmVydCBhIGxvY2F0aW9uIGV4dHJhY3RlZCBmcm9tIGEgVENCIGludG8gYSBgUGFyc2VTb3VyY2VTcGFuYCBpZiBwb3NzaWJsZS5cbiAgICovXG4gIHNvdXJjZUxvY2F0aW9uVG9TcGFuKGxvY2F0aW9uOiBTb3VyY2VMb2NhdGlvbik6IFBhcnNlU291cmNlU3BhbnxudWxsO1xufVxuXG4vKipcbiAqIEFuIGBBYnNvbHV0ZVNwYW5gIGlzIHRoZSByZXN1bHQgb2YgdHJhbnNsYXRpbmcgdGhlIGBQYXJzZVNwYW5gIG9mIGBBU1RgIHRlbXBsYXRlIGV4cHJlc3Npb24gbm9kZXNcbiAqIHRvIHRoZWlyIGFic29sdXRlIHBvc2l0aW9ucywgYXMgdGhlIGBQYXJzZVNwYW5gIGlzIGFsd2F5cyByZWxhdGl2ZSB0byB0aGUgc3RhcnQgb2YgdGhlXG4gKiBleHByZXNzaW9uLCBub3QgdGhlIGZ1bGwgdGVtcGxhdGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQWJzb2x1dGVTcGFuIHtcbiAgX19icmFuZF9fOiAnQWJzb2x1dGVTcGFuJztcbiAgc3RhcnQ6IG51bWJlcjtcbiAgZW5kOiBudW1iZXI7XG59XG5cbi8qKlxuICogVHJhbnNsYXRlcyBhIGBQYXJzZVNwYW5gIGludG8gYW4gYEFic29sdXRlU3BhbmAgYnkgaW5jb3Jwb3JhdGluZyB0aGUgbG9jYXRpb24gaW5mb3JtYXRpb24gdGhhdFxuICogdGhlIGBQYXJzZVNvdXJjZVNwYW5gIHJlcHJlc2VudHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b0Fic29sdXRlU3BhbihzcGFuOiBQYXJzZVNwYW4sIHNvdXJjZVNwYW46IFBhcnNlU291cmNlU3Bhbik6IEFic29sdXRlU3BhbiB7XG4gIGNvbnN0IG9mZnNldCA9IHNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0O1xuICByZXR1cm4gPEFic29sdXRlU3Bhbj57c3RhcnQ6IHNwYW4uc3RhcnQgKyBvZmZzZXQsIGVuZDogc3Bhbi5lbmQgKyBvZmZzZXR9O1xufVxuXG4vKipcbiAqIFdyYXBzIHRoZSBub2RlIGluIHBhcmVudGhlc2lzIHN1Y2ggdGhhdCBpbnNlcnRlZCBzcGFuIGNvbW1lbnRzIGJlY29tZSBhdHRhY2hlZCB0byB0aGUgcHJvcGVyXG4gKiBub2RlLiBUaGlzIGlzIGFuIGFsaWFzIGZvciBgdHMuY3JlYXRlUGFyZW5gIHdpdGggdGhlIGJlbmVmaXQgdGhhdCBpdCBzaWduaWZpZXMgdGhhdCB0aGVcbiAqIGluc2VydGVkIHBhcmVudGhlc2lzIGFyZSBmb3IgZGlhZ25vc3RpYyBwdXJwb3Nlcywgbm90IGZvciBjb3JyZWN0bmVzcyBvZiB0aGUgcmVuZGVyZWQgVENCIGNvZGUuXG4gKlxuICogTm90ZSB0aGF0IGl0IGlzIGltcG9ydGFudCB0aGF0IG5vZGVzIGFuZCBpdHMgYXR0YWNoZWQgY29tbWVudCBhcmUgbm90IHdyYXBwZWQgaW50byBwYXJlbnRoZXNpc1xuICogYnkgZGVmYXVsdCwgYXMgaXQgcHJldmVudHMgY29ycmVjdCB0cmFuc2xhdGlvbiBvZiBlLmcuIGRpYWdub3N0aWNzIHByb2R1Y2VkIGZvciBpbmNvcnJlY3QgbWV0aG9kXG4gKiBhcmd1bWVudHMuIFN1Y2ggZGlhZ25vc3RpY3Mgd291bGQgdGhlbiBiZSBwcm9kdWNlZCBmb3IgdGhlIHBhcmVudGhlc2lzZWQgbm9kZSB3aGVyZWFzIHRoZVxuICogcG9zaXRpb25hbCBjb21tZW50IHdvdWxkIGJlIGxvY2F0ZWQgd2l0aGluIHRoYXQgbm9kZSwgcmVzdWx0aW5nIGluIGEgbWlzbWF0Y2guXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cmFwRm9yRGlhZ25vc3RpY3MoZXhwcjogdHMuRXhwcmVzc2lvbik6IHRzLkV4cHJlc3Npb24ge1xuICByZXR1cm4gdHMuY3JlYXRlUGFyZW4oZXhwcik7XG59XG5cbi8qKlxuICogQWRkcyBhIHN5bnRoZXRpYyBjb21tZW50IHRvIHRoZSBleHByZXNzaW9uIHRoYXQgcmVwcmVzZW50cyB0aGUgcGFyc2Ugc3BhbiBvZiB0aGUgcHJvdmlkZWQgbm9kZS5cbiAqIFRoaXMgY29tbWVudCBjYW4gbGF0ZXIgYmUgcmV0cmlldmVkIGFzIHRyaXZpYSBvZiBhIG5vZGUgdG8gcmVjb3ZlciBvcmlnaW5hbCBzb3VyY2UgbG9jYXRpb25zLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYWRkUGFyc2VTcGFuSW5mbyhub2RlOiB0cy5Ob2RlLCBzcGFuOiBBYnNvbHV0ZVNwYW4gfCBQYXJzZVNvdXJjZVNwYW4pOiB2b2lkIHtcbiAgbGV0IGNvbW1lbnRUZXh0OiBzdHJpbmc7XG4gIGlmIChpc0Fic29sdXRlU3BhbihzcGFuKSkge1xuICAgIGNvbW1lbnRUZXh0ID0gYCR7c3Bhbi5zdGFydH0sJHtzcGFuLmVuZH1gO1xuICB9IGVsc2Uge1xuICAgIGNvbW1lbnRUZXh0ID0gYCR7c3Bhbi5zdGFydC5vZmZzZXR9LCR7c3Bhbi5lbmQub2Zmc2V0fWA7XG4gIH1cbiAgdHMuYWRkU3ludGhldGljVHJhaWxpbmdDb21tZW50KFxuICAgICAgbm9kZSwgdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhLCBjb21tZW50VGV4dCxcbiAgICAgIC8qIGhhc1RyYWlsaW5nTmV3TGluZSAqLyBmYWxzZSk7XG59XG5cbmZ1bmN0aW9uIGlzQWJzb2x1dGVTcGFuKHNwYW46IEFic29sdXRlU3BhbiB8IFBhcnNlU291cmNlU3Bhbik6IHNwYW4gaXMgQWJzb2x1dGVTcGFuIHtcbiAgcmV0dXJuIHR5cGVvZiBzcGFuLnN0YXJ0ID09PSAnbnVtYmVyJztcbn1cblxuLyoqXG4gKiBBZGRzIGEgc3ludGhldGljIGNvbW1lbnQgdG8gdGhlIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIHRoYXQgY29udGFpbnMgdGhlIHNvdXJjZSBsb2NhdGlvblxuICogb2YgdGhlIGNsYXNzIGRlY2xhcmF0aW9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYWRkU291cmNlSWQodGNiOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uLCBpZDogc3RyaW5nKTogdm9pZCB7XG4gIHRzLmFkZFN5bnRoZXRpY0xlYWRpbmdDb21tZW50KHRjYiwgdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhLCBpZCwgdHJ1ZSk7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyBpZiB0aGUgZGlhZ25vc3RpYyBzaG91bGQgYmUgcmVwb3J0ZWQuIFNvbWUgZGlhZ25vc3RpY3MgYXJlIHByb2R1Y2VkIGJlY2F1c2Ugb2YgdGhlXG4gKiB3YXkgVENCcyBhcmUgZ2VuZXJhdGVkOyB0aG9zZSBkaWFnbm9zdGljcyBzaG91bGQgbm90IGJlIHJlcG9ydGVkIGFzIHR5cGUgY2hlY2sgZXJyb3JzIG9mIHRoZVxuICogdGVtcGxhdGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzaG91bGRSZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWM6IHRzLkRpYWdub3N0aWMpOiBib29sZWFuIHtcbiAgY29uc3Qge2NvZGV9ID0gZGlhZ25vc3RpYztcbiAgaWYgKGNvZGUgPT09IDYxMzMgLyogJHZhciBpcyBkZWNsYXJlZCBidXQgaXRzIHZhbHVlIGlzIG5ldmVyIHJlYWQuICovKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9IGVsc2UgaWYgKGNvZGUgPT09IDYxOTkgLyogQWxsIHZhcmlhYmxlcyBhcmUgdW51c2VkLiAqLykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSBlbHNlIGlmIChjb2RlID09PSAyNjk1IC8qIExlZnQgc2lkZSBvZiBjb21tYSBvcGVyYXRvciBpcyB1bnVzZWQgYW5kIGhhcyBubyBzaWRlIGVmZmVjdHMuICovKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEF0dGVtcHRzIHRvIHRyYW5zbGF0ZSBhIFR5cGVTY3JpcHQgZGlhZ25vc3RpYyBwcm9kdWNlZCBkdXJpbmcgdGVtcGxhdGUgdHlwZS1jaGVja2luZyB0byB0aGVpclxuICogbG9jYXRpb24gb2Ygb3JpZ2luLCBiYXNlZCBvbiB0aGUgY29tbWVudHMgdGhhdCBhcmUgZW1pdHRlZCBpbiB0aGUgVENCIGNvZGUuXG4gKlxuICogSWYgdGhlIGRpYWdub3N0aWMgY291bGQgbm90IGJlIHRyYW5zbGF0ZWQsIGBudWxsYCBpcyByZXR1cm5lZCB0byBpbmRpY2F0ZSB0aGF0IHRoZSBkaWFnbm9zdGljXG4gKiBzaG91bGQgbm90IGJlIHJlcG9ydGVkIGF0IGFsbC4gVGhpcyBwcmV2ZW50cyBkaWFnbm9zdGljcyBmcm9tIG5vbi1UQ0IgY29kZSBpbiBhIHVzZXIncyBzb3VyY2VcbiAqIGZpbGUgZnJvbSBiZWluZyByZXBvcnRlZCBhcyB0eXBlLWNoZWNrIGVycm9ycy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zbGF0ZURpYWdub3N0aWMoXG4gICAgZGlhZ25vc3RpYzogdHMuRGlhZ25vc3RpYywgcmVzb2x2ZXI6IFRjYlNvdXJjZVJlc29sdmVyKTogdHMuRGlhZ25vc3RpY3xudWxsIHtcbiAgaWYgKGRpYWdub3N0aWMuZmlsZSA9PT0gdW5kZWZpbmVkIHx8IGRpYWdub3N0aWMuc3RhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gTG9jYXRlIHRoZSBub2RlIHRoYXQgdGhlIGRpYWdub3N0aWMgaXMgcmVwb3J0ZWQgb24gYW5kIGRldGVybWluZSBpdHMgbG9jYXRpb24gaW4gdGhlIHNvdXJjZS5cbiAgY29uc3Qgbm9kZSA9IGdldFRva2VuQXRQb3NpdGlvbihkaWFnbm9zdGljLmZpbGUsIGRpYWdub3N0aWMuc3RhcnQpO1xuICBjb25zdCBzb3VyY2VMb2NhdGlvbiA9IGZpbmRTb3VyY2VMb2NhdGlvbihub2RlLCBkaWFnbm9zdGljLmZpbGUpO1xuICBpZiAoc291cmNlTG9jYXRpb24gPT09IG51bGwpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIE5vdyB1c2UgdGhlIGV4dGVybmFsIHJlc29sdmVyIHRvIG9idGFpbiB0aGUgZnVsbCBgUGFyc2VTb3VyY2VGaWxlYCBvZiB0aGUgdGVtcGxhdGUuXG4gIGNvbnN0IHNwYW4gPSByZXNvbHZlci5zb3VyY2VMb2NhdGlvblRvU3Bhbihzb3VyY2VMb2NhdGlvbik7XG4gIGlmIChzcGFuID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBtYXBwaW5nID0gcmVzb2x2ZXIuZ2V0U291cmNlTWFwcGluZyhzb3VyY2VMb2NhdGlvbi5pZCk7XG4gIHJldHVybiBtYWtlVGVtcGxhdGVEaWFnbm9zdGljKFxuICAgICAgbWFwcGluZywgc3BhbiwgZGlhZ25vc3RpYy5jYXRlZ29yeSwgZGlhZ25vc3RpYy5jb2RlLCBkaWFnbm9zdGljLm1lc3NhZ2VUZXh0KTtcbn1cblxuLyoqXG4gKiBDb25zdHJ1Y3RzIGEgYHRzLkRpYWdub3N0aWNgIGZvciBhIGdpdmVuIGBQYXJzZVNvdXJjZVNwYW5gIHdpdGhpbiBhIHRlbXBsYXRlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFrZVRlbXBsYXRlRGlhZ25vc3RpYyhcbiAgICBtYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmcsIHNwYW46IFBhcnNlU291cmNlU3BhbiwgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeSxcbiAgICBjb2RlOiBudW1iZXIsIG1lc3NhZ2VUZXh0OiBzdHJpbmcgfCB0cy5EaWFnbm9zdGljTWVzc2FnZUNoYWluKTogdHMuRGlhZ25vc3RpYyB7XG4gIGlmIChtYXBwaW5nLnR5cGUgPT09ICdkaXJlY3QnKSB7XG4gICAgLy8gRm9yIGRpcmVjdCBtYXBwaW5ncywgdGhlIGVycm9yIGlzIHNob3duIGlubGluZSBhcyBuZ3RzYyB3YXMgYWJsZSB0byBwaW5wb2ludCBhIHN0cmluZ1xuICAgIC8vIGNvbnN0YW50IHdpdGhpbiB0aGUgYEBDb21wb25lbnRgIGRlY29yYXRvciBmb3IgdGhlIHRlbXBsYXRlLiBUaGlzIGFsbG93cyB1cyB0byBtYXAgdGhlIGVycm9yXG4gICAgLy8gZGlyZWN0bHkgaW50byB0aGUgYnl0ZXMgb2YgdGhlIHNvdXJjZSBmaWxlLlxuICAgIHJldHVybiB7XG4gICAgICBzb3VyY2U6ICduZ3RzYycsXG4gICAgICBjb2RlLFxuICAgICAgY2F0ZWdvcnksXG4gICAgICBtZXNzYWdlVGV4dCxcbiAgICAgIGZpbGU6IG1hcHBpbmcubm9kZS5nZXRTb3VyY2VGaWxlKCksXG4gICAgICBzdGFydDogc3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgICBsZW5ndGg6IHNwYW4uZW5kLm9mZnNldCAtIHNwYW4uc3RhcnQub2Zmc2V0LFxuICAgIH07XG4gIH0gZWxzZSBpZiAobWFwcGluZy50eXBlID09PSAnaW5kaXJlY3QnIHx8IG1hcHBpbmcudHlwZSA9PT0gJ2V4dGVybmFsJykge1xuICAgIC8vIEZvciBpbmRpcmVjdCBtYXBwaW5ncyAodGVtcGxhdGUgd2FzIGRlY2xhcmVkIGlubGluZSwgYnV0IG5ndHNjIGNvdWxkbid0IG1hcCBpdCBkaXJlY3RseVxuICAgIC8vIHRvIGEgc3RyaW5nIGNvbnN0YW50IGluIHRoZSBkZWNvcmF0b3IpLCB0aGUgY29tcG9uZW50J3MgZmlsZSBuYW1lIGlzIGdpdmVuIHdpdGggYSBzdWZmaXhcbiAgICAvLyBpbmRpY2F0aW5nIGl0J3Mgbm90IHRoZSBUUyBmaWxlIGJlaW5nIGRpc3BsYXllZCwgYnV0IGEgdGVtcGxhdGUuXG4gICAgLy8gRm9yIGV4dGVybmFsIHRlbW9wbGF0ZXMsIHRoZSBIVE1MIGZpbGVuYW1lIGlzIHVzZWQuXG4gICAgY29uc3QgY29tcG9uZW50U2YgPSBtYXBwaW5nLmNvbXBvbmVudENsYXNzLmdldFNvdXJjZUZpbGUoKTtcbiAgICBjb25zdCBjb21wb25lbnROYW1lID0gbWFwcGluZy5jb21wb25lbnRDbGFzcy5uYW1lLnRleHQ7XG4gICAgLy8gVE9ETyhhbHhodWIpOiByZW1vdmUgY2FzdCB3aGVuIFRTIGluIGczIHN1cHBvcnRzIHRoaXMgbmFycm93aW5nLlxuICAgIGNvbnN0IGZpbGVOYW1lID0gbWFwcGluZy50eXBlID09PSAnaW5kaXJlY3QnID9cbiAgICAgICAgYCR7Y29tcG9uZW50U2YuZmlsZU5hbWV9ICgke2NvbXBvbmVudE5hbWV9IHRlbXBsYXRlKWAgOlxuICAgICAgICAobWFwcGluZyBhcyBFeHRlcm5hbFRlbXBsYXRlU291cmNlTWFwcGluZykudGVtcGxhdGVVcmw7XG4gICAgLy8gVE9ETyhhbHhodWIpOiBpbnZlc3RpZ2F0ZSBjcmVhdGluZyBhIGZha2UgYHRzLlNvdXJjZUZpbGVgIGhlcmUgaW5zdGVhZCBvZiBpbnZva2luZyB0aGUgVFNcbiAgICAvLyBwYXJzZXIgYWdhaW5zdCB0aGUgdGVtcGxhdGUgKEhUTUwgaXMganVzdCByZWFsbHkgc3ludGFjdGljYWxseSBpbnZhbGlkIFR5cGVTY3JpcHQgY29kZSA7KS5cbiAgICAvLyBBbHNvIGludmVzdGlnYXRlIGNhY2hpbmcgdGhlIGZpbGUgdG8gYXZvaWQgcnVubmluZyB0aGUgcGFyc2VyIG11bHRpcGxlIHRpbWVzLlxuICAgIGNvbnN0IHNmID0gdHMuY3JlYXRlU291cmNlRmlsZShcbiAgICAgICAgZmlsZU5hbWUsIG1hcHBpbmcudGVtcGxhdGUsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIGZhbHNlLCB0cy5TY3JpcHRLaW5kLkpTWCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgc291cmNlOiAnbmd0c2MnLFxuICAgICAgY2F0ZWdvcnksXG4gICAgICBjb2RlLFxuICAgICAgbWVzc2FnZVRleHQsXG4gICAgICBmaWxlOiBzZixcbiAgICAgIHN0YXJ0OiBzcGFuLnN0YXJ0Lm9mZnNldCxcbiAgICAgIGxlbmd0aDogc3Bhbi5lbmQub2Zmc2V0IC0gc3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgICAvLyBTaG93IGEgc2Vjb25kYXJ5IG1lc3NhZ2UgaW5kaWNhdGluZyB0aGUgY29tcG9uZW50IHdob3NlIHRlbXBsYXRlIGNvbnRhaW5zIHRoZSBlcnJvci5cbiAgICAgIHJlbGF0ZWRJbmZvcm1hdGlvbjogW3tcbiAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5NZXNzYWdlLFxuICAgICAgICBjb2RlOiAwLFxuICAgICAgICBmaWxlOiBjb21wb25lbnRTZixcbiAgICAgICAgLy8gbWFwcGluZy5ub2RlIHJlcHJlc2VudHMgZWl0aGVyIHRoZSAndGVtcGxhdGUnIG9yICd0ZW1wbGF0ZVVybCcgZXhwcmVzc2lvbi4gZ2V0U3RhcnQoKVxuICAgICAgICAvLyBhbmQgZ2V0RW5kKCkgYXJlIHVzZWQgYmVjYXVzZSB0aGV5IGRvbid0IGluY2x1ZGUgc3Vycm91bmRpbmcgd2hpdGVzcGFjZS5cbiAgICAgICAgc3RhcnQ6IG1hcHBpbmcubm9kZS5nZXRTdGFydCgpLFxuICAgICAgICBsZW5ndGg6IG1hcHBpbmcubm9kZS5nZXRFbmQoKSAtIG1hcHBpbmcubm9kZS5nZXRTdGFydCgpLFxuICAgICAgICBtZXNzYWdlVGV4dDogYEVycm9yIG9jY3VycyBpbiB0aGUgdGVtcGxhdGUgb2YgY29tcG9uZW50ICR7Y29tcG9uZW50TmFtZX0uYCxcbiAgICAgIH1dLFxuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIHNvdXJjZSBtYXBwaW5nIHR5cGU6ICR7KG1hcHBpbmcgYXMge3R5cGU6IHN0cmluZ30pLnR5cGV9YCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZmluZFNvdXJjZUxvY2F0aW9uKG5vZGU6IHRzLk5vZGUsIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBTb3VyY2VMb2NhdGlvbnxudWxsIHtcbiAgLy8gU2VhcmNoIGZvciBjb21tZW50cyB1bnRpbCB0aGUgVENCJ3MgZnVuY3Rpb24gZGVjbGFyYXRpb24gaXMgZW5jb3VudGVyZWQuXG4gIHdoaWxlIChub2RlICE9PSB1bmRlZmluZWQgJiYgIXRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihub2RlKSkge1xuICAgIGNvbnN0IHBhcnNlU3BhbiA9XG4gICAgICAgIHRzLmZvckVhY2hUcmFpbGluZ0NvbW1lbnRSYW5nZShzb3VyY2VGaWxlLnRleHQsIG5vZGUuZ2V0RW5kKCksIChwb3MsIGVuZCwga2luZCkgPT4ge1xuICAgICAgICAgIGlmIChraW5kICE9PSB0cy5TeW50YXhLaW5kLk11bHRpTGluZUNvbW1lbnRUcml2aWEpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBjb21tZW50VGV4dCA9IHNvdXJjZUZpbGUudGV4dC5zdWJzdHJpbmcocG9zLCBlbmQpO1xuICAgICAgICAgIHJldHVybiBwYXJzZVBhcnNlU3BhbkNvbW1lbnQoY29tbWVudFRleHQpO1xuICAgICAgICB9KSB8fCBudWxsO1xuICAgIGlmIChwYXJzZVNwYW4gIT09IG51bGwpIHtcbiAgICAgIC8vIE9uY2UgdGhlIHBvc2l0aW9uYWwgaW5mb3JtYXRpb24gaGFzIGJlZW4gZXh0cmFjdGVkLCBzZWFyY2ggZnVydGhlciB1cCB0aGUgVENCIHRvIGV4dHJhY3RcbiAgICAgIC8vIHRoZSBmaWxlIGluZm9ybWF0aW9uIHRoYXQgaXMgYXR0YWNoZWQgd2l0aCB0aGUgVENCJ3MgZnVuY3Rpb24gZGVjbGFyYXRpb24uXG4gICAgICByZXR1cm4gdG9Tb3VyY2VMb2NhdGlvbihwYXJzZVNwYW4sIG5vZGUsIHNvdXJjZUZpbGUpO1xuICAgIH1cblxuICAgIG5vZGUgPSBub2RlLnBhcmVudDtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiB0b1NvdXJjZUxvY2F0aW9uKFxuICAgIHBhcnNlU3BhbjogUGFyc2VTcGFuLCBub2RlOiB0cy5Ob2RlLCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogU291cmNlTG9jYXRpb258bnVsbCB7XG4gIC8vIFdhbGsgdXAgdG8gdGhlIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIG9mIHRoZSBUQ0IsIHRoZSBmaWxlIGluZm9ybWF0aW9uIGlzIGF0dGFjaGVkIHRoZXJlLlxuICBsZXQgdGNiID0gbm9kZTtcbiAgd2hpbGUgKCF0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24odGNiKSkge1xuICAgIHRjYiA9IHRjYi5wYXJlbnQ7XG5cbiAgICAvLyBCYWlsIG9uY2Ugd2UgaGF2ZSByZWFjaGVkIHRoZSByb290LlxuICAgIGlmICh0Y2IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgaWQgPVxuICAgICAgdHMuZm9yRWFjaExlYWRpbmdDb21tZW50UmFuZ2Uoc291cmNlRmlsZS50ZXh0LCB0Y2IuZ2V0RnVsbFN0YXJ0KCksIChwb3MsIGVuZCwga2luZCkgPT4ge1xuICAgICAgICBpZiAoa2luZCAhPT0gdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY29tbWVudFRleHQgPSBzb3VyY2VGaWxlLnRleHQuc3Vic3RyaW5nKHBvcywgZW5kKTtcbiAgICAgICAgcmV0dXJuIGNvbW1lbnRUZXh0LnN1YnN0cmluZygyLCBjb21tZW50VGV4dC5sZW5ndGggLSAyKTtcbiAgICAgIH0pIHx8IG51bGw7XG4gIGlmIChpZCA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBpZCxcbiAgICBzdGFydDogcGFyc2VTcGFuLnN0YXJ0LFxuICAgIGVuZDogcGFyc2VTcGFuLmVuZCxcbiAgfTtcbn1cblxuY29uc3QgcGFyc2VTcGFuQ29tbWVudCA9IC9eXFwvXFwqKFxcZCspLChcXGQrKVxcKlxcLyQvO1xuXG5mdW5jdGlvbiBwYXJzZVBhcnNlU3BhbkNvbW1lbnQoY29tbWVudFRleHQ6IHN0cmluZyk6IFBhcnNlU3BhbnxudWxsIHtcbiAgY29uc3QgbWF0Y2ggPSBjb21tZW50VGV4dC5tYXRjaChwYXJzZVNwYW5Db21tZW50KTtcbiAgaWYgKG1hdGNoID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICByZXR1cm4ge3N0YXJ0OiArbWF0Y2hbMV0sIGVuZDogK21hdGNoWzJdfTtcbn1cbiJdfQ==