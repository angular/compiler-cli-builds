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
        var messageText;
        if (typeof diagnostic.messageText === 'string') {
            messageText = diagnostic.messageText;
        }
        else {
            messageText = diagnostic.messageText.messageText;
        }
        var mapping = resolver.getSourceMapping(sourceLocation.id);
        if (mapping.type === 'direct') {
            // For direct mappings, the error is shown inline as ngtsc was able to pinpoint a string
            // constant within the `@Component` decorator for the template. This allows us to map the error
            // directly into the bytes of the source file.
            return {
                source: 'ngtsc',
                file: mapping.node.getSourceFile(),
                start: span.start.offset,
                length: span.end.offset - span.start.offset,
                code: diagnostic.code, messageText: messageText,
                category: diagnostic.category,
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
                file: sf,
                start: span.start.offset,
                length: span.end.offset - span.start.offset,
                messageText: diagnostic.messageText,
                category: diagnostic.category,
                code: diagnostic.code,
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
    exports.translateDiagnostic = translateDiagnostic;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvZGlhZ25vc3RpY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFRQSwrQkFBaUM7SUFFakMsa0ZBQTZEO0lBc0M3RDs7O09BR0c7SUFDSCxTQUFnQixjQUFjLENBQUMsSUFBZSxFQUFFLFVBQTJCO1FBQ3pFLElBQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO1FBQ3ZDLE9BQXFCLEVBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxHQUFHLE1BQU0sRUFBQyxDQUFDO0lBQzVFLENBQUM7SUFIRCx3Q0FHQztJQUVEOzs7Ozs7Ozs7T0FTRztJQUNILFNBQWdCLGtCQUFrQixDQUFDLElBQW1CO1FBQ3BELE9BQU8sRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRkQsZ0RBRUM7SUFFRDs7O09BR0c7SUFDSCxTQUFnQixnQkFBZ0IsQ0FBQyxJQUFhLEVBQUUsSUFBb0M7UUFDbEYsSUFBSSxXQUFtQixDQUFDO1FBQ3hCLElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3hCLFdBQVcsR0FBTSxJQUFJLENBQUMsS0FBSyxTQUFJLElBQUksQ0FBQyxHQUFLLENBQUM7U0FDM0M7YUFBTTtZQUNMLFdBQVcsR0FBTSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sU0FBSSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQVEsQ0FBQztTQUN6RDtRQUNELEVBQUUsQ0FBQywyQkFBMkIsQ0FDMUIsSUFBSSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLEVBQUUsV0FBVztRQUN2RCx3QkFBd0Is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LEtBQUssR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDbEQsSUFBSSxLQUFLLEtBQUssSUFBSSxFQUFFO1lBQ2xCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxPQUFPLEVBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDO0lBQzVDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge1BhcnNlU291cmNlU3BhbiwgUGFyc2VTcGFuLCBQb3NpdGlvbn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Z2V0VG9rZW5BdFBvc2l0aW9ufSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFeHRlcm5hbFRlbXBsYXRlU291cmNlTWFwcGluZywgVGVtcGxhdGVTb3VyY2VNYXBwaW5nfSBmcm9tICcuL2FwaSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU291cmNlTG9jYXRpb24ge1xuICBpZDogc3RyaW5nO1xuICBzdGFydDogbnVtYmVyO1xuICBlbmQ6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBBZGFwdGVyIGludGVyZmFjZSB3aGljaCBhbGxvd3MgdGhlIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgZGlhZ25vc3RpY3MgY29kZSB0byBpbnRlcnByZXQgb2Zmc2V0c1xuICogaW4gYSBUQ0IgYW5kIG1hcCB0aGVtIGJhY2sgdG8gb3JpZ2luYWwgbG9jYXRpb25zIGluIHRoZSB0ZW1wbGF0ZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUY2JTb3VyY2VSZXNvbHZlciB7XG4gIC8qKlxuICAgKiBGb3IgdGhlIGdpdmVuIHRlbXBsYXRlIGlkLCByZXRyaWV2ZSB0aGUgb3JpZ2luYWwgc291cmNlIG1hcHBpbmcgd2hpY2ggZGVzY3JpYmVzIGhvdyB0aGUgb2Zmc2V0c1xuICAgKiBpbiB0aGUgdGVtcGxhdGUgc2hvdWxkIGJlIGludGVycHJldGVkLlxuICAgKi9cbiAgZ2V0U291cmNlTWFwcGluZyhpZDogc3RyaW5nKTogVGVtcGxhdGVTb3VyY2VNYXBwaW5nO1xuXG4gIC8qKlxuICAgKiBDb252ZXJ0IGEgbG9jYXRpb24gZXh0cmFjdGVkIGZyb20gYSBUQ0IgaW50byBhIGBQYXJzZVNvdXJjZVNwYW5gIGlmIHBvc3NpYmxlLlxuICAgKi9cbiAgc291cmNlTG9jYXRpb25Ub1NwYW4obG9jYXRpb246IFNvdXJjZUxvY2F0aW9uKTogUGFyc2VTb3VyY2VTcGFufG51bGw7XG59XG5cbi8qKlxuICogQW4gYEFic29sdXRlU3BhbmAgaXMgdGhlIHJlc3VsdCBvZiB0cmFuc2xhdGluZyB0aGUgYFBhcnNlU3BhbmAgb2YgYEFTVGAgdGVtcGxhdGUgZXhwcmVzc2lvbiBub2Rlc1xuICogdG8gdGhlaXIgYWJzb2x1dGUgcG9zaXRpb25zLCBhcyB0aGUgYFBhcnNlU3BhbmAgaXMgYWx3YXlzIHJlbGF0aXZlIHRvIHRoZSBzdGFydCBvZiB0aGVcbiAqIGV4cHJlc3Npb24sIG5vdCB0aGUgZnVsbCB0ZW1wbGF0ZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBYnNvbHV0ZVNwYW4ge1xuICBfX2JyYW5kX186ICdBYnNvbHV0ZVNwYW4nO1xuICBzdGFydDogbnVtYmVyO1xuICBlbmQ6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBUcmFuc2xhdGVzIGEgYFBhcnNlU3BhbmAgaW50byBhbiBgQWJzb2x1dGVTcGFuYCBieSBpbmNvcnBvcmF0aW5nIHRoZSBsb2NhdGlvbiBpbmZvcm1hdGlvbiB0aGF0XG4gKiB0aGUgYFBhcnNlU291cmNlU3BhbmAgcmVwcmVzZW50cy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvQWJzb2x1dGVTcGFuKHNwYW46IFBhcnNlU3Bhbiwgc291cmNlU3BhbjogUGFyc2VTb3VyY2VTcGFuKTogQWJzb2x1dGVTcGFuIHtcbiAgY29uc3Qgb2Zmc2V0ID0gc291cmNlU3Bhbi5zdGFydC5vZmZzZXQ7XG4gIHJldHVybiA8QWJzb2x1dGVTcGFuPntzdGFydDogc3Bhbi5zdGFydCArIG9mZnNldCwgZW5kOiBzcGFuLmVuZCArIG9mZnNldH07XG59XG5cbi8qKlxuICogV3JhcHMgdGhlIG5vZGUgaW4gcGFyZW50aGVzaXMgc3VjaCB0aGF0IGluc2VydGVkIHNwYW4gY29tbWVudHMgYmVjb21lIGF0dGFjaGVkIHRvIHRoZSBwcm9wZXJcbiAqIG5vZGUuIFRoaXMgaXMgYW4gYWxpYXMgZm9yIGB0cy5jcmVhdGVQYXJlbmAgd2l0aCB0aGUgYmVuZWZpdCB0aGF0IGl0IHNpZ25pZmllcyB0aGF0IHRoZVxuICogaW5zZXJ0ZWQgcGFyZW50aGVzaXMgYXJlIGZvciBkaWFnbm9zdGljIHB1cnBvc2VzLCBub3QgZm9yIGNvcnJlY3RuZXNzIG9mIHRoZSByZW5kZXJlZCBUQ0IgY29kZS5cbiAqXG4gKiBOb3RlIHRoYXQgaXQgaXMgaW1wb3J0YW50IHRoYXQgbm9kZXMgYW5kIGl0cyBhdHRhY2hlZCBjb21tZW50IGFyZSBub3Qgd3JhcHBlZCBpbnRvIHBhcmVudGhlc2lzXG4gKiBieSBkZWZhdWx0LCBhcyBpdCBwcmV2ZW50cyBjb3JyZWN0IHRyYW5zbGF0aW9uIG9mIGUuZy4gZGlhZ25vc3RpY3MgcHJvZHVjZWQgZm9yIGluY29ycmVjdCBtZXRob2RcbiAqIGFyZ3VtZW50cy4gU3VjaCBkaWFnbm9zdGljcyB3b3VsZCB0aGVuIGJlIHByb2R1Y2VkIGZvciB0aGUgcGFyZW50aGVzaXNlZCBub2RlIHdoZXJlYXMgdGhlXG4gKiBwb3NpdGlvbmFsIGNvbW1lbnQgd291bGQgYmUgbG9jYXRlZCB3aXRoaW4gdGhhdCBub2RlLCByZXN1bHRpbmcgaW4gYSBtaXNtYXRjaC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdyYXBGb3JEaWFnbm9zdGljcyhleHByOiB0cy5FeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbiB7XG4gIHJldHVybiB0cy5jcmVhdGVQYXJlbihleHByKTtcbn1cblxuLyoqXG4gKiBBZGRzIGEgc3ludGhldGljIGNvbW1lbnQgdG8gdGhlIGV4cHJlc3Npb24gdGhhdCByZXByZXNlbnRzIHRoZSBwYXJzZSBzcGFuIG9mIHRoZSBwcm92aWRlZCBub2RlLlxuICogVGhpcyBjb21tZW50IGNhbiBsYXRlciBiZSByZXRyaWV2ZWQgYXMgdHJpdmlhIG9mIGEgbm9kZSB0byByZWNvdmVyIG9yaWdpbmFsIHNvdXJjZSBsb2NhdGlvbnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhZGRQYXJzZVNwYW5JbmZvKG5vZGU6IHRzLk5vZGUsIHNwYW46IEFic29sdXRlU3BhbiB8IFBhcnNlU291cmNlU3Bhbik6IHZvaWQge1xuICBsZXQgY29tbWVudFRleHQ6IHN0cmluZztcbiAgaWYgKGlzQWJzb2x1dGVTcGFuKHNwYW4pKSB7XG4gICAgY29tbWVudFRleHQgPSBgJHtzcGFuLnN0YXJ0fSwke3NwYW4uZW5kfWA7XG4gIH0gZWxzZSB7XG4gICAgY29tbWVudFRleHQgPSBgJHtzcGFuLnN0YXJ0Lm9mZnNldH0sJHtzcGFuLmVuZC5vZmZzZXR9YDtcbiAgfVxuICB0cy5hZGRTeW50aGV0aWNUcmFpbGluZ0NvbW1lbnQoXG4gICAgICBub2RlLCB0cy5TeW50YXhLaW5kLk11bHRpTGluZUNvbW1lbnRUcml2aWEsIGNvbW1lbnRUZXh0LFxuICAgICAgLyogaGFzVHJhaWxpbmdOZXdMaW5lICovIGZhbHNlKTtcbn1cblxuZnVuY3Rpb24gaXNBYnNvbHV0ZVNwYW4oc3BhbjogQWJzb2x1dGVTcGFuIHwgUGFyc2VTb3VyY2VTcGFuKTogc3BhbiBpcyBBYnNvbHV0ZVNwYW4ge1xuICByZXR1cm4gdHlwZW9mIHNwYW4uc3RhcnQgPT09ICdudW1iZXInO1xufVxuXG4vKipcbiAqIEFkZHMgYSBzeW50aGV0aWMgY29tbWVudCB0byB0aGUgZnVuY3Rpb24gZGVjbGFyYXRpb24gdGhhdCBjb250YWlucyB0aGUgc291cmNlIGxvY2F0aW9uXG4gKiBvZiB0aGUgY2xhc3MgZGVjbGFyYXRpb24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhZGRTb3VyY2VJZCh0Y2I6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb24sIGlkOiBzdHJpbmcpOiB2b2lkIHtcbiAgdHMuYWRkU3ludGhldGljTGVhZGluZ0NvbW1lbnQodGNiLCB0cy5TeW50YXhLaW5kLk11bHRpTGluZUNvbW1lbnRUcml2aWEsIGlkLCB0cnVlKTtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIGlmIHRoZSBkaWFnbm9zdGljIHNob3VsZCBiZSByZXBvcnRlZC4gU29tZSBkaWFnbm9zdGljcyBhcmUgcHJvZHVjZWQgYmVjYXVzZSBvZiB0aGVcbiAqIHdheSBUQ0JzIGFyZSBnZW5lcmF0ZWQ7IHRob3NlIGRpYWdub3N0aWNzIHNob3VsZCBub3QgYmUgcmVwb3J0ZWQgYXMgdHlwZSBjaGVjayBlcnJvcnMgb2YgdGhlXG4gKiB0ZW1wbGF0ZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNob3VsZFJlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYzogdHMuRGlhZ25vc3RpYyk6IGJvb2xlYW4ge1xuICBjb25zdCB7Y29kZX0gPSBkaWFnbm9zdGljO1xuICBpZiAoY29kZSA9PT0gNjEzMyAvKiAkdmFyIGlzIGRlY2xhcmVkIGJ1dCBpdHMgdmFsdWUgaXMgbmV2ZXIgcmVhZC4gKi8pIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0gZWxzZSBpZiAoY29kZSA9PT0gNjE5OSAvKiBBbGwgdmFyaWFibGVzIGFyZSB1bnVzZWQuICovKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9IGVsc2UgaWYgKGNvZGUgPT09IDI2OTUgLyogTGVmdCBzaWRlIG9mIGNvbW1hIG9wZXJhdG9yIGlzIHVudXNlZCBhbmQgaGFzIG5vIHNpZGUgZWZmZWN0cy4gKi8pIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogQXR0ZW1wdHMgdG8gdHJhbnNsYXRlIGEgVHlwZVNjcmlwdCBkaWFnbm9zdGljIHByb2R1Y2VkIGR1cmluZyB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIHRvIHRoZWlyXG4gKiBsb2NhdGlvbiBvZiBvcmlnaW4sIGJhc2VkIG9uIHRoZSBjb21tZW50cyB0aGF0IGFyZSBlbWl0dGVkIGluIHRoZSBUQ0IgY29kZS5cbiAqXG4gKiBJZiB0aGUgZGlhZ25vc3RpYyBjb3VsZCBub3QgYmUgdHJhbnNsYXRlZCwgYG51bGxgIGlzIHJldHVybmVkIHRvIGluZGljYXRlIHRoYXQgdGhlIGRpYWdub3N0aWNcbiAqIHNob3VsZCBub3QgYmUgcmVwb3J0ZWQgYXQgYWxsLiBUaGlzIHByZXZlbnRzIGRpYWdub3N0aWNzIGZyb20gbm9uLVRDQiBjb2RlIGluIGEgdXNlcidzIHNvdXJjZVxuICogZmlsZSBmcm9tIGJlaW5nIHJlcG9ydGVkIGFzIHR5cGUtY2hlY2sgZXJyb3JzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNsYXRlRGlhZ25vc3RpYyhcbiAgICBkaWFnbm9zdGljOiB0cy5EaWFnbm9zdGljLCByZXNvbHZlcjogVGNiU291cmNlUmVzb2x2ZXIpOiB0cy5EaWFnbm9zdGljfG51bGwge1xuICBpZiAoZGlhZ25vc3RpYy5maWxlID09PSB1bmRlZmluZWQgfHwgZGlhZ25vc3RpYy5zdGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBMb2NhdGUgdGhlIG5vZGUgdGhhdCB0aGUgZGlhZ25vc3RpYyBpcyByZXBvcnRlZCBvbiBhbmQgZGV0ZXJtaW5lIGl0cyBsb2NhdGlvbiBpbiB0aGUgc291cmNlLlxuICBjb25zdCBub2RlID0gZ2V0VG9rZW5BdFBvc2l0aW9uKGRpYWdub3N0aWMuZmlsZSwgZGlhZ25vc3RpYy5zdGFydCk7XG4gIGNvbnN0IHNvdXJjZUxvY2F0aW9uID0gZmluZFNvdXJjZUxvY2F0aW9uKG5vZGUsIGRpYWdub3N0aWMuZmlsZSk7XG4gIGlmIChzb3VyY2VMb2NhdGlvbiA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gTm93IHVzZSB0aGUgZXh0ZXJuYWwgcmVzb2x2ZXIgdG8gb2J0YWluIHRoZSBmdWxsIGBQYXJzZVNvdXJjZUZpbGVgIG9mIHRoZSB0ZW1wbGF0ZS5cbiAgY29uc3Qgc3BhbiA9IHJlc29sdmVyLnNvdXJjZUxvY2F0aW9uVG9TcGFuKHNvdXJjZUxvY2F0aW9uKTtcbiAgaWYgKHNwYW4gPT09IG51bGwpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGxldCBtZXNzYWdlVGV4dDogc3RyaW5nO1xuICBpZiAodHlwZW9mIGRpYWdub3N0aWMubWVzc2FnZVRleHQgPT09ICdzdHJpbmcnKSB7XG4gICAgbWVzc2FnZVRleHQgPSBkaWFnbm9zdGljLm1lc3NhZ2VUZXh0O1xuICB9IGVsc2Uge1xuICAgIG1lc3NhZ2VUZXh0ID0gZGlhZ25vc3RpYy5tZXNzYWdlVGV4dC5tZXNzYWdlVGV4dDtcbiAgfVxuXG4gIGNvbnN0IG1hcHBpbmcgPSByZXNvbHZlci5nZXRTb3VyY2VNYXBwaW5nKHNvdXJjZUxvY2F0aW9uLmlkKTtcbiAgaWYgKG1hcHBpbmcudHlwZSA9PT0gJ2RpcmVjdCcpIHtcbiAgICAvLyBGb3IgZGlyZWN0IG1hcHBpbmdzLCB0aGUgZXJyb3IgaXMgc2hvd24gaW5saW5lIGFzIG5ndHNjIHdhcyBhYmxlIHRvIHBpbnBvaW50IGEgc3RyaW5nXG4gICAgLy8gY29uc3RhbnQgd2l0aGluIHRoZSBgQENvbXBvbmVudGAgZGVjb3JhdG9yIGZvciB0aGUgdGVtcGxhdGUuIFRoaXMgYWxsb3dzIHVzIHRvIG1hcCB0aGUgZXJyb3JcbiAgICAvLyBkaXJlY3RseSBpbnRvIHRoZSBieXRlcyBvZiB0aGUgc291cmNlIGZpbGUuXG4gICAgcmV0dXJuIHtcbiAgICAgIHNvdXJjZTogJ25ndHNjJyxcbiAgICAgIGZpbGU6IG1hcHBpbmcubm9kZS5nZXRTb3VyY2VGaWxlKCksXG4gICAgICBzdGFydDogc3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgICBsZW5ndGg6IHNwYW4uZW5kLm9mZnNldCAtIHNwYW4uc3RhcnQub2Zmc2V0LFxuICAgICAgY29kZTogZGlhZ25vc3RpYy5jb2RlLCBtZXNzYWdlVGV4dCxcbiAgICAgIGNhdGVnb3J5OiBkaWFnbm9zdGljLmNhdGVnb3J5LFxuICAgIH07XG4gIH0gZWxzZSBpZiAobWFwcGluZy50eXBlID09PSAnaW5kaXJlY3QnIHx8IG1hcHBpbmcudHlwZSA9PT0gJ2V4dGVybmFsJykge1xuICAgIC8vIEZvciBpbmRpcmVjdCBtYXBwaW5ncyAodGVtcGxhdGUgd2FzIGRlY2xhcmVkIGlubGluZSwgYnV0IG5ndHNjIGNvdWxkbid0IG1hcCBpdCBkaXJlY3RseVxuICAgIC8vIHRvIGEgc3RyaW5nIGNvbnN0YW50IGluIHRoZSBkZWNvcmF0b3IpLCB0aGUgY29tcG9uZW50J3MgZmlsZSBuYW1lIGlzIGdpdmVuIHdpdGggYSBzdWZmaXhcbiAgICAvLyBpbmRpY2F0aW5nIGl0J3Mgbm90IHRoZSBUUyBmaWxlIGJlaW5nIGRpc3BsYXllZCwgYnV0IGEgdGVtcGxhdGUuXG4gICAgLy8gRm9yIGV4dGVybmFsIHRlbW9wbGF0ZXMsIHRoZSBIVE1MIGZpbGVuYW1lIGlzIHVzZWQuXG4gICAgY29uc3QgY29tcG9uZW50U2YgPSBtYXBwaW5nLmNvbXBvbmVudENsYXNzLmdldFNvdXJjZUZpbGUoKTtcbiAgICBjb25zdCBjb21wb25lbnROYW1lID0gbWFwcGluZy5jb21wb25lbnRDbGFzcy5uYW1lLnRleHQ7XG4gICAgLy8gVE9ETyhhbHhodWIpOiByZW1vdmUgY2FzdCB3aGVuIFRTIGluIGczIHN1cHBvcnRzIHRoaXMgbmFycm93aW5nLlxuICAgIGNvbnN0IGZpbGVOYW1lID0gbWFwcGluZy50eXBlID09PSAnaW5kaXJlY3QnID9cbiAgICAgICAgYCR7Y29tcG9uZW50U2YuZmlsZU5hbWV9ICgke2NvbXBvbmVudE5hbWV9IHRlbXBsYXRlKWAgOlxuICAgICAgICAobWFwcGluZyBhcyBFeHRlcm5hbFRlbXBsYXRlU291cmNlTWFwcGluZykudGVtcGxhdGVVcmw7XG4gICAgLy8gVE9ETyhhbHhodWIpOiBpbnZlc3RpZ2F0ZSBjcmVhdGluZyBhIGZha2UgYHRzLlNvdXJjZUZpbGVgIGhlcmUgaW5zdGVhZCBvZiBpbnZva2luZyB0aGUgVFNcbiAgICAvLyBwYXJzZXIgYWdhaW5zdCB0aGUgdGVtcGxhdGUgKEhUTUwgaXMganVzdCByZWFsbHkgc3ludGFjdGljYWxseSBpbnZhbGlkIFR5cGVTY3JpcHQgY29kZSA7KS5cbiAgICAvLyBBbHNvIGludmVzdGlnYXRlIGNhY2hpbmcgdGhlIGZpbGUgdG8gYXZvaWQgcnVubmluZyB0aGUgcGFyc2VyIG11bHRpcGxlIHRpbWVzLlxuICAgIGNvbnN0IHNmID0gdHMuY3JlYXRlU291cmNlRmlsZShcbiAgICAgICAgZmlsZU5hbWUsIG1hcHBpbmcudGVtcGxhdGUsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIGZhbHNlLCB0cy5TY3JpcHRLaW5kLkpTWCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgc291cmNlOiAnbmd0c2MnLFxuICAgICAgZmlsZTogc2YsXG4gICAgICBzdGFydDogc3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgICBsZW5ndGg6IHNwYW4uZW5kLm9mZnNldCAtIHNwYW4uc3RhcnQub2Zmc2V0LFxuICAgICAgbWVzc2FnZVRleHQ6IGRpYWdub3N0aWMubWVzc2FnZVRleHQsXG4gICAgICBjYXRlZ29yeTogZGlhZ25vc3RpYy5jYXRlZ29yeSxcbiAgICAgIGNvZGU6IGRpYWdub3N0aWMuY29kZSxcbiAgICAgIC8vIFNob3cgYSBzZWNvbmRhcnkgbWVzc2FnZSBpbmRpY2F0aW5nIHRoZSBjb21wb25lbnQgd2hvc2UgdGVtcGxhdGUgY29udGFpbnMgdGhlIGVycm9yLlxuICAgICAgcmVsYXRlZEluZm9ybWF0aW9uOiBbe1xuICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5Lk1lc3NhZ2UsXG4gICAgICAgIGNvZGU6IDAsXG4gICAgICAgIGZpbGU6IGNvbXBvbmVudFNmLFxuICAgICAgICAvLyBtYXBwaW5nLm5vZGUgcmVwcmVzZW50cyBlaXRoZXIgdGhlICd0ZW1wbGF0ZScgb3IgJ3RlbXBsYXRlVXJsJyBleHByZXNzaW9uLiBnZXRTdGFydCgpXG4gICAgICAgIC8vIGFuZCBnZXRFbmQoKSBhcmUgdXNlZCBiZWNhdXNlIHRoZXkgZG9uJ3QgaW5jbHVkZSBzdXJyb3VuZGluZyB3aGl0ZXNwYWNlLlxuICAgICAgICBzdGFydDogbWFwcGluZy5ub2RlLmdldFN0YXJ0KCksXG4gICAgICAgIGxlbmd0aDogbWFwcGluZy5ub2RlLmdldEVuZCgpIC0gbWFwcGluZy5ub2RlLmdldFN0YXJ0KCksXG4gICAgICAgIG1lc3NhZ2VUZXh0OiBgRXJyb3Igb2NjdXJzIGluIHRoZSB0ZW1wbGF0ZSBvZiBjb21wb25lbnQgJHtjb21wb25lbnROYW1lfS5gLFxuICAgICAgfV0sXG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ZWQgc291cmNlIG1hcHBpbmcgdHlwZTogJHsobWFwcGluZyBhcyB7dHlwZTogc3RyaW5nfSkudHlwZX1gKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kU291cmNlTG9jYXRpb24obm9kZTogdHMuTm9kZSwgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IFNvdXJjZUxvY2F0aW9ufG51bGwge1xuICAvLyBTZWFyY2ggZm9yIGNvbW1lbnRzIHVudGlsIHRoZSBUQ0IncyBmdW5jdGlvbiBkZWNsYXJhdGlvbiBpcyBlbmNvdW50ZXJlZC5cbiAgd2hpbGUgKG5vZGUgIT09IHVuZGVmaW5lZCAmJiAhdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgY29uc3QgcGFyc2VTcGFuID1cbiAgICAgICAgdHMuZm9yRWFjaFRyYWlsaW5nQ29tbWVudFJhbmdlKHNvdXJjZUZpbGUudGV4dCwgbm9kZS5nZXRFbmQoKSwgKHBvcywgZW5kLCBraW5kKSA9PiB7XG4gICAgICAgICAgaWYgKGtpbmQgIT09IHRzLlN5bnRheEtpbmQuTXVsdGlMaW5lQ29tbWVudFRyaXZpYSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGNvbW1lbnRUZXh0ID0gc291cmNlRmlsZS50ZXh0LnN1YnN0cmluZyhwb3MsIGVuZCk7XG4gICAgICAgICAgcmV0dXJuIHBhcnNlUGFyc2VTcGFuQ29tbWVudChjb21tZW50VGV4dCk7XG4gICAgICAgIH0pIHx8IG51bGw7XG4gICAgaWYgKHBhcnNlU3BhbiAhPT0gbnVsbCkge1xuICAgICAgLy8gT25jZSB0aGUgcG9zaXRpb25hbCBpbmZvcm1hdGlvbiBoYXMgYmVlbiBleHRyYWN0ZWQsIHNlYXJjaCBmdXJ0aGVyIHVwIHRoZSBUQ0IgdG8gZXh0cmFjdFxuICAgICAgLy8gdGhlIGZpbGUgaW5mb3JtYXRpb24gdGhhdCBpcyBhdHRhY2hlZCB3aXRoIHRoZSBUQ0IncyBmdW5jdGlvbiBkZWNsYXJhdGlvbi5cbiAgICAgIHJldHVybiB0b1NvdXJjZUxvY2F0aW9uKHBhcnNlU3Bhbiwgbm9kZSwgc291cmNlRmlsZSk7XG4gICAgfVxuXG4gICAgbm9kZSA9IG5vZGUucGFyZW50O1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIHRvU291cmNlTG9jYXRpb24oXG4gICAgcGFyc2VTcGFuOiBQYXJzZVNwYW4sIG5vZGU6IHRzLk5vZGUsIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBTb3VyY2VMb2NhdGlvbnxudWxsIHtcbiAgLy8gV2FsayB1cCB0byB0aGUgZnVuY3Rpb24gZGVjbGFyYXRpb24gb2YgdGhlIFRDQiwgdGhlIGZpbGUgaW5mb3JtYXRpb24gaXMgYXR0YWNoZWQgdGhlcmUuXG4gIGxldCB0Y2IgPSBub2RlO1xuICB3aGlsZSAoIXRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbih0Y2IpKSB7XG4gICAgdGNiID0gdGNiLnBhcmVudDtcblxuICAgIC8vIEJhaWwgb25jZSB3ZSBoYXZlIHJlYWNoZWQgdGhlIHJvb3QuXG4gICAgaWYgKHRjYiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICBjb25zdCBpZCA9XG4gICAgICB0cy5mb3JFYWNoTGVhZGluZ0NvbW1lbnRSYW5nZShzb3VyY2VGaWxlLnRleHQsIHRjYi5nZXRGdWxsU3RhcnQoKSwgKHBvcywgZW5kLCBraW5kKSA9PiB7XG4gICAgICAgIGlmIChraW5kICE9PSB0cy5TeW50YXhLaW5kLk11bHRpTGluZUNvbW1lbnRUcml2aWEpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjb21tZW50VGV4dCA9IHNvdXJjZUZpbGUudGV4dC5zdWJzdHJpbmcocG9zLCBlbmQpO1xuICAgICAgICByZXR1cm4gY29tbWVudFRleHQuc3Vic3RyaW5nKDIsIGNvbW1lbnRUZXh0Lmxlbmd0aCAtIDIpO1xuICAgICAgfSkgfHwgbnVsbDtcbiAgaWYgKGlkID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGlkLFxuICAgIHN0YXJ0OiBwYXJzZVNwYW4uc3RhcnQsXG4gICAgZW5kOiBwYXJzZVNwYW4uZW5kLFxuICB9O1xufVxuXG5jb25zdCBwYXJzZVNwYW5Db21tZW50ID0gL15cXC9cXCooXFxkKyksKFxcZCspXFwqXFwvJC87XG5cbmZ1bmN0aW9uIHBhcnNlUGFyc2VTcGFuQ29tbWVudChjb21tZW50VGV4dDogc3RyaW5nKTogUGFyc2VTcGFufG51bGwge1xuICBjb25zdCBtYXRjaCA9IGNvbW1lbnRUZXh0Lm1hdGNoKHBhcnNlU3BhbkNvbW1lbnQpO1xuICBpZiAobWF0Y2ggPT09IG51bGwpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHJldHVybiB7c3RhcnQ6ICttYXRjaFsxXSwgZW5kOiArbWF0Y2hbMl19O1xufVxuIl19