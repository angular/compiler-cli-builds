(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics", ["require", "exports", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
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
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
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
    var IGNORE_MARKER = 'ignore';
    /**
     * Adds a marker to the node that signifies that any errors within the node should not be reported.
     */
    function ignoreDiagnostics(node) {
        ts.addSyntheticTrailingComment(node, ts.SyntaxKind.MultiLineCommentTrivia, IGNORE_MARKER, /* hasTrailingNewLine */ false);
    }
    exports.ignoreDiagnostics = ignoreDiagnostics;
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
        // Locate the node that the diagnostic is reported on and determine its location in the source.
        var node = typescript_1.getTokenAtPosition(diagnostic.file, diagnostic.start);
        var sourceLocation = findSourceLocation(node, diagnostic.file);
        if (sourceLocation === null) {
            return null;
        }
        // Now use the external resolver to obtain the full `ParseSourceFile` of the template.
        var span = resolver.toParseSourceSpan(sourceLocation.id, sourceLocation.span);
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
                code: diagnostics_1.ngErrorCode(code), category: category, messageText: messageText,
                file: mapping.node.getSourceFile(),
                componentFile: mapping.node.getSourceFile(),
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
                code: diagnostics_1.ngErrorCode(code), messageText: messageText,
                file: sf,
                componentFile: componentSf,
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
    /**
     * Traverses up the AST starting from the given node to extract the source location from comments
     * that have been emitted into the TCB. If the node does not exist within a TCB, or if an ignore
     * marker comment is found up the tree, this function returns null.
     */
    function findSourceLocation(node, sourceFile) {
        // Search for comments until the TCB's function declaration is encountered.
        while (node !== undefined && !ts.isFunctionDeclaration(node)) {
            if (hasIgnoreMarker(node, sourceFile)) {
                // There's an ignore marker on this node, so the diagnostic should not be reported.
                return null;
            }
            var span = readSpanComment(sourceFile, node);
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
    function getTemplateId(node, sourceFile) {
        // Walk up to the function declaration of the TCB, the file information is attached there.
        while (!ts.isFunctionDeclaration(node)) {
            if (hasIgnoreMarker(node, sourceFile)) {
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
    var parseSpanComment = /^(\d+),(\d+)$/;
    function readSpanComment(sourceFile, node) {
        return ts.forEachTrailingCommentRange(sourceFile.text, node.getEnd(), function (pos, end, kind) {
            if (kind !== ts.SyntaxKind.MultiLineCommentTrivia) {
                return null;
            }
            var commentText = sourceFile.text.substring(pos + 2, end - 2);
            var match = commentText.match(parseSpanComment);
            if (match === null) {
                return null;
            }
            return new compiler_1.AbsoluteSourceSpan(+match[1], +match[2]);
        }) || null;
    }
    function hasIgnoreMarker(node, sourceFile) {
        return ts.forEachTrailingCommentRange(sourceFile.text, node.getEnd(), function (pos, end, kind) {
            if (kind !== ts.SyntaxKind.MultiLineCommentTrivia) {
                return null;
            }
            var commentText = sourceFile.text.substring(pos + 2, end - 2);
            return commentText === IGNORE_MARKER;
        }) === true;
    }
    function isTemplateDiagnostic(diagnostic) {
        return diagnostic.hasOwnProperty('componentFile') &&
            ts.isSourceFile(diagnostic.componentFile);
    }
    exports.isTemplateDiagnostic = isTemplateDiagnostic;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvZGlhZ25vc3RpY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw4Q0FBc0U7SUFDdEUsK0JBQWlDO0lBRWpDLDJFQUF5RDtJQUN6RCxrRkFBNkQ7SUFrQzdEOzs7Ozs7Ozs7T0FTRztJQUNILFNBQWdCLGtCQUFrQixDQUFDLElBQW1CO1FBQ3BELE9BQU8sRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRkQsZ0RBRUM7SUFFRCxJQUFNLGFBQWEsR0FBRyxRQUFRLENBQUM7SUFFL0I7O09BRUc7SUFDSCxTQUFnQixpQkFBaUIsQ0FBQyxJQUFhO1FBQzdDLEVBQUUsQ0FBQywyQkFBMkIsQ0FDMUIsSUFBSSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLEVBQUUsYUFBYSxFQUFFLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2pHLENBQUM7SUFIRCw4Q0FHQztJQUVEOzs7T0FHRztJQUNILFNBQWdCLGdCQUFnQixDQUFDLElBQWEsRUFBRSxJQUEwQztRQUN4RixJQUFJLFdBQW1CLENBQUM7UUFDeEIsSUFBSSxJQUFJLFlBQVksNkJBQWtCLEVBQUU7WUFDdEMsV0FBVyxHQUFNLElBQUksQ0FBQyxLQUFLLFNBQUksSUFBSSxDQUFDLEdBQUssQ0FBQztTQUMzQzthQUFNO1lBQ0wsV0FBVyxHQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxTQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBUSxDQUFDO1NBQ3pEO1FBQ0QsRUFBRSxDQUFDLDJCQUEyQixDQUMxQixJQUFJLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsRUFBRSxXQUFX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Iiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtBYnNvbHV0ZVNvdXJjZVNwYW4sIFBhcnNlU291cmNlU3Bhbn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXJyb3JDb2RlLCBuZ0Vycm9yQ29kZX0gZnJvbSAnLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtnZXRUb2tlbkF0UG9zaXRpb259IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0V4dGVybmFsVGVtcGxhdGVTb3VyY2VNYXBwaW5nLCBUZW1wbGF0ZUlkLCBUZW1wbGF0ZVNvdXJjZU1hcHBpbmd9IGZyb20gJy4vYXBpJztcblxuLyoqXG4gKiBBIGB0cy5EaWFnbm9zdGljYCB3aXRoIGFkZGl0aW9uYWwgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGRpYWdub3N0aWMgcmVsYXRlZCB0byB0ZW1wbGF0ZVxuICogdHlwZS1jaGVja2luZy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZURpYWdub3N0aWMgZXh0ZW5kcyB0cy5EaWFnbm9zdGljIHtcbiAgLyoqXG4gICAqIFRoZSBjb21wb25lbnQgd2l0aCB0aGUgdGVtcGxhdGUgdGhhdCByZXN1bHRlZCBpbiB0aGlzIGRpYWdub3N0aWMuXG4gICAqL1xuICBjb21wb25lbnRGaWxlOiB0cy5Tb3VyY2VGaWxlO1xufVxuXG4vKipcbiAqIEFkYXB0ZXIgaW50ZXJmYWNlIHdoaWNoIGFsbG93cyB0aGUgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBkaWFnbm9zdGljcyBjb2RlIHRvIGludGVycHJldCBvZmZzZXRzXG4gKiBpbiBhIFRDQiBhbmQgbWFwIHRoZW0gYmFjayB0byBvcmlnaW5hbCBsb2NhdGlvbnMgaW4gdGhlIHRlbXBsYXRlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlU291cmNlUmVzb2x2ZXIge1xuICAvKipcbiAgICogRm9yIHRoZSBnaXZlbiB0ZW1wbGF0ZSBpZCwgcmV0cmlldmUgdGhlIG9yaWdpbmFsIHNvdXJjZSBtYXBwaW5nIHdoaWNoIGRlc2NyaWJlcyBob3cgdGhlIG9mZnNldHNcbiAgICogaW4gdGhlIHRlbXBsYXRlIHNob3VsZCBiZSBpbnRlcnByZXRlZC5cbiAgICovXG4gIGdldFNvdXJjZU1hcHBpbmcoaWQ6IFRlbXBsYXRlSWQpOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmc7XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgYW4gYWJzb2x1dGUgc291cmNlIHNwYW4gYXNzb2NpYXRlZCB3aXRoIHRoZSBnaXZlbiB0ZW1wbGF0ZSBpZCBpbnRvIGEgZnVsbFxuICAgKiBgUGFyc2VTb3VyY2VTcGFuYC4gVGhlIHJldHVybmVkIHBhcnNlIHNwYW4gaGFzIGxpbmUgYW5kIGNvbHVtbiBudW1iZXJzIGluIGFkZGl0aW9uIHRvIG9ubHlcbiAgICogYWJzb2x1dGUgb2Zmc2V0cyBhbmQgZ2l2ZXMgYWNjZXNzIHRvIHRoZSBvcmlnaW5hbCB0ZW1wbGF0ZSBzb3VyY2UuXG4gICAqL1xuICB0b1BhcnNlU291cmNlU3BhbihpZDogVGVtcGxhdGVJZCwgc3BhbjogQWJzb2x1dGVTb3VyY2VTcGFuKTogUGFyc2VTb3VyY2VTcGFufG51bGw7XG59XG5cbi8qKlxuICogV3JhcHMgdGhlIG5vZGUgaW4gcGFyZW50aGVzaXMgc3VjaCB0aGF0IGluc2VydGVkIHNwYW4gY29tbWVudHMgYmVjb21lIGF0dGFjaGVkIHRvIHRoZSBwcm9wZXJcbiAqIG5vZGUuIFRoaXMgaXMgYW4gYWxpYXMgZm9yIGB0cy5jcmVhdGVQYXJlbmAgd2l0aCB0aGUgYmVuZWZpdCB0aGF0IGl0IHNpZ25pZmllcyB0aGF0IHRoZVxuICogaW5zZXJ0ZWQgcGFyZW50aGVzaXMgYXJlIGZvciBkaWFnbm9zdGljIHB1cnBvc2VzLCBub3QgZm9yIGNvcnJlY3RuZXNzIG9mIHRoZSByZW5kZXJlZCBUQ0IgY29kZS5cbiAqXG4gKiBOb3RlIHRoYXQgaXQgaXMgaW1wb3J0YW50IHRoYXQgbm9kZXMgYW5kIGl0cyBhdHRhY2hlZCBjb21tZW50IGFyZSBub3Qgd3JhcHBlZCBpbnRvIHBhcmVudGhlc2lzXG4gKiBieSBkZWZhdWx0LCBhcyBpdCBwcmV2ZW50cyBjb3JyZWN0IHRyYW5zbGF0aW9uIG9mIGUuZy4gZGlhZ25vc3RpY3MgcHJvZHVjZWQgZm9yIGluY29ycmVjdCBtZXRob2RcbiAqIGFyZ3VtZW50cy4gU3VjaCBkaWFnbm9zdGljcyB3b3VsZCB0aGVuIGJlIHByb2R1Y2VkIGZvciB0aGUgcGFyZW50aGVzaXNlZCBub2RlIHdoZXJlYXMgdGhlXG4gKiBwb3NpdGlvbmFsIGNvbW1lbnQgd291bGQgYmUgbG9jYXRlZCB3aXRoaW4gdGhhdCBub2RlLCByZXN1bHRpbmcgaW4gYSBtaXNtYXRjaC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdyYXBGb3JEaWFnbm9zdGljcyhleHByOiB0cy5FeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbiB7XG4gIHJldHVybiB0cy5jcmVhdGVQYXJlbihleHByKTtcbn1cblxuY29uc3QgSUdOT1JFX01BUktFUiA9ICdpZ25vcmUnO1xuXG4vKipcbiAqIEFkZHMgYSBtYXJrZXIgdG8gdGhlIG5vZGUgdGhhdCBzaWduaWZpZXMgdGhhdCBhbnkgZXJyb3JzIHdpdGhpbiB0aGUgbm9kZSBzaG91bGQgbm90IGJlIHJlcG9ydGVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaWdub3JlRGlhZ25vc3RpY3Mobm9kZTogdHMuTm9kZSk6IHZvaWQge1xuICB0cy5hZGRTeW50aGV0aWNUcmFpbGluZ0NvbW1lbnQoXG4gICAgICBub2RlLCB0cy5TeW50YXhLaW5kLk11bHRpTGluZUNvbW1lbnRUcml2aWEsIElHTk9SRV9NQVJLRVIsIC8qIGhhc1RyYWlsaW5nTmV3TGluZSAqLyBmYWxzZSk7XG59XG5cbi8qKlxuICogQWRkcyBhIHN5bnRoZXRpYyBjb21tZW50IHRvIHRoZSBleHByZXNzaW9uIHRoYXQgcmVwcmVzZW50cyB0aGUgcGFyc2Ugc3BhbiBvZiB0aGUgcHJvdmlkZWQgbm9kZS5cbiAqIFRoaXMgY29tbWVudCBjYW4gbGF0ZXIgYmUgcmV0cmlldmVkIGFzIHRyaXZpYSBvZiBhIG5vZGUgdG8gcmVjb3ZlciBvcmlnaW5hbCBzb3VyY2UgbG9jYXRpb25zLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYWRkUGFyc2VTcGFuSW5mbyhub2RlOiB0cy5Ob2RlLCBzcGFuOiBBYnNvbHV0ZVNvdXJjZVNwYW4gfCBQYXJzZVNvdXJjZVNwYW4pOiB2b2lkIHtcbiAgbGV0IGNvbW1lbnRUZXh0OiBzdHJpbmc7XG4gIGlmIChzcGFuIGluc3RhbmNlb2YgQWJzb2x1dGVTb3VyY2VTcGFuKSB7XG4gICAgY29tbWVudFRleHQgPSBgJHtzcGFuLnN0YXJ0fSwke3NwYW4uZW5kfWA7XG4gIH0gZWxzZSB7XG4gICAgY29tbWVudFRleHQgPSBgJHtzcGFuLnN0YXJ0Lm9mZnNldH0sJHtzcGFuLmVuZC5vZmZzZXR9YDtcbiAgfVxuICB0cy5hZGRTeW50aGV0aWNUcmFpbGluZ0NvbW1lbnQoXG4gICAgICBub2RlLCB0cy5TeW50YXhLaW5kLk11bHRpTGluZUNvbW1lbnRUcml2aWEsIGNvbW1lbnRUZXh0LCAvKiBoYXNUcmFpbGluZ05ld0xpbmUgKi8gZmFsc2UpO1xufVxuXG4vKipcbiAqIEFkZHMgYSBzeW50aGV0aWMgY29tbWVudCB0byB0aGUgZnVuY3Rpb24gZGVjbGFyYXRpb24gdGhhdCBjb250YWlucyB0aGUgdGVtcGxhdGUgaWRcbiAqIG9mIHRoZSBjbGFzcyBkZWNsYXJhdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFkZFRlbXBsYXRlSWQodGNiOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uLCBpZDogVGVtcGxhdGVJZCk6IHZvaWQge1xuICB0cy5hZGRTeW50aGV0aWNMZWFkaW5nQ29tbWVudCh0Y2IsIHRzLlN5bnRheEtpbmQuTXVsdGlMaW5lQ29tbWVudFRyaXZpYSwgaWQsIHRydWUpO1xufVxuXG4vKipcbiAqIERldGVybWluZXMgaWYgdGhlIGRpYWdub3N0aWMgc2hvdWxkIGJlIHJlcG9ydGVkLiBTb21lIGRpYWdub3N0aWNzIGFyZSBwcm9kdWNlZCBiZWNhdXNlIG9mIHRoZVxuICogd2F5IFRDQnMgYXJlIGdlbmVyYXRlZDsgdGhvc2UgZGlhZ25vc3RpY3Mgc2hvdWxkIG5vdCBiZSByZXBvcnRlZCBhcyB0eXBlIGNoZWNrIGVycm9ycyBvZiB0aGVcbiAqIHRlbXBsYXRlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2hvdWxkUmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljOiB0cy5EaWFnbm9zdGljKTogYm9vbGVhbiB7XG4gIGNvbnN0IHtjb2RlfSA9IGRpYWdub3N0aWM7XG4gIGlmIChjb2RlID09PSA2MTMzIC8qICR2YXIgaXMgZGVjbGFyZWQgYnV0IGl0cyB2YWx1ZSBpcyBuZXZlciByZWFkLiAqLykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSBlbHNlIGlmIChjb2RlID09PSA2MTk5IC8qIEFsbCB2YXJpYWJsZXMgYXJlIHVudXNlZC4gKi8pIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0gZWxzZSBpZiAoY29kZSA9PT0gMjY5NSAvKiBMZWZ0IHNpZGUgb2YgY29tbWEgb3BlcmF0b3IgaXMgdW51c2VkIGFuZCBoYXMgbm8gc2lkZSBlZmZlY3RzLiAqLykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSBlbHNlIGlmIChjb2RlID09PSA3MDA2IC8qIFBhcmFtZXRlciAnJGV2ZW50JyBpbXBsaWNpdGx5IGhhcyBhbiAnYW55JyB0eXBlLiAqLykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBBdHRlbXB0cyB0byB0cmFuc2xhdGUgYSBUeXBlU2NyaXB0IGRpYWdub3N0aWMgcHJvZHVjZWQgZHVyaW5nIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgdG8gdGhlaXJcbiAqIGxvY2F0aW9uIG9mIG9yaWdpbiwgYmFzZWQgb24gdGhlIGNvbW1lbnRzIHRoYXQgYXJlIGVtaXR0ZWQgaW4gdGhlIFRDQiBjb2RlLlxuICpcbiAqIElmIHRoZSBkaWFnbm9zdGljIGNvdWxkIG5vdCBiZSB0cmFuc2xhdGVkLCBgbnVsbGAgaXMgcmV0dXJuZWQgdG8gaW5kaWNhdGUgdGhhdCB0aGUgZGlhZ25vc3RpY1xuICogc2hvdWxkIG5vdCBiZSByZXBvcnRlZCBhdCBhbGwuIFRoaXMgcHJldmVudHMgZGlhZ25vc3RpY3MgZnJvbSBub24tVENCIGNvZGUgaW4gYSB1c2VyJ3Mgc291cmNlXG4gKiBmaWxlIGZyb20gYmVpbmcgcmVwb3J0ZWQgYXMgdHlwZS1jaGVjayBlcnJvcnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0cmFuc2xhdGVEaWFnbm9zdGljKFxuICAgIGRpYWdub3N0aWM6IHRzLkRpYWdub3N0aWMsIHJlc29sdmVyOiBUZW1wbGF0ZVNvdXJjZVJlc29sdmVyKTogdHMuRGlhZ25vc3RpY3xudWxsIHtcbiAgaWYgKGRpYWdub3N0aWMuZmlsZSA9PT0gdW5kZWZpbmVkIHx8IGRpYWdub3N0aWMuc3RhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gTG9jYXRlIHRoZSBub2RlIHRoYXQgdGhlIGRpYWdub3N0aWMgaXMgcmVwb3J0ZWQgb24gYW5kIGRldGVybWluZSBpdHMgbG9jYXRpb24gaW4gdGhlIHNvdXJjZS5cbiAgY29uc3Qgbm9kZSA9IGdldFRva2VuQXRQb3NpdGlvbihkaWFnbm9zdGljLmZpbGUsIGRpYWdub3N0aWMuc3RhcnQpO1xuICBjb25zdCBzb3VyY2VMb2NhdGlvbiA9IGZpbmRTb3VyY2VMb2NhdGlvbihub2RlLCBkaWFnbm9zdGljLmZpbGUpO1xuICBpZiAoc291cmNlTG9jYXRpb24gPT09IG51bGwpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIE5vdyB1c2UgdGhlIGV4dGVybmFsIHJlc29sdmVyIHRvIG9idGFpbiB0aGUgZnVsbCBgUGFyc2VTb3VyY2VGaWxlYCBvZiB0aGUgdGVtcGxhdGUuXG4gIGNvbnN0IHNwYW4gPSByZXNvbHZlci50b1BhcnNlU291cmNlU3Bhbihzb3VyY2VMb2NhdGlvbi5pZCwgc291cmNlTG9jYXRpb24uc3Bhbik7XG4gIGlmIChzcGFuID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBtYXBwaW5nID0gcmVzb2x2ZXIuZ2V0U291cmNlTWFwcGluZyhzb3VyY2VMb2NhdGlvbi5pZCk7XG4gIHJldHVybiBtYWtlVGVtcGxhdGVEaWFnbm9zdGljKFxuICAgICAgbWFwcGluZywgc3BhbiwgZGlhZ25vc3RpYy5jYXRlZ29yeSwgZGlhZ25vc3RpYy5jb2RlLCBkaWFnbm9zdGljLm1lc3NhZ2VUZXh0KTtcbn1cblxuLyoqXG4gKiBDb25zdHJ1Y3RzIGEgYHRzLkRpYWdub3N0aWNgIGZvciBhIGdpdmVuIGBQYXJzZVNvdXJjZVNwYW5gIHdpdGhpbiBhIHRlbXBsYXRlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFrZVRlbXBsYXRlRGlhZ25vc3RpYyhcbiAgICBtYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmcsIHNwYW46IFBhcnNlU291cmNlU3BhbiwgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeSxcbiAgICBjb2RlOiBFcnJvckNvZGUsIG1lc3NhZ2VUZXh0OiBzdHJpbmcgfCB0cy5EaWFnbm9zdGljTWVzc2FnZUNoYWluLCByZWxhdGVkTWVzc2FnZT86IHtcbiAgICAgIHRleHQ6IHN0cmluZyxcbiAgICAgIHNwYW46IFBhcnNlU291cmNlU3BhbixcbiAgICB9KTogVGVtcGxhdGVEaWFnbm9zdGljIHtcbiAgaWYgKG1hcHBpbmcudHlwZSA9PT0gJ2RpcmVjdCcpIHtcbiAgICBsZXQgcmVsYXRlZEluZm9ybWF0aW9uOiB0cy5EaWFnbm9zdGljUmVsYXRlZEluZm9ybWF0aW9uW118dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGlmIChyZWxhdGVkTWVzc2FnZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZWxhdGVkSW5mb3JtYXRpb24gPSBbe1xuICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5Lk1lc3NhZ2UsXG4gICAgICAgIGNvZGU6IDAsXG4gICAgICAgIGZpbGU6IG1hcHBpbmcubm9kZS5nZXRTb3VyY2VGaWxlKCksXG4gICAgICAgIHN0YXJ0OiByZWxhdGVkTWVzc2FnZS5zcGFuLnN0YXJ0Lm9mZnNldCxcbiAgICAgICAgbGVuZ3RoOiByZWxhdGVkTWVzc2FnZS5zcGFuLmVuZC5vZmZzZXQgLSByZWxhdGVkTWVzc2FnZS5zcGFuLnN0YXJ0Lm9mZnNldCxcbiAgICAgICAgbWVzc2FnZVRleHQ6IHJlbGF0ZWRNZXNzYWdlLnRleHQsXG4gICAgICB9XTtcbiAgICB9XG4gICAgLy8gRm9yIGRpcmVjdCBtYXBwaW5ncywgdGhlIGVycm9yIGlzIHNob3duIGlubGluZSBhcyBuZ3RzYyB3YXMgYWJsZSB0byBwaW5wb2ludCBhIHN0cmluZ1xuICAgIC8vIGNvbnN0YW50IHdpdGhpbiB0aGUgYEBDb21wb25lbnRgIGRlY29yYXRvciBmb3IgdGhlIHRlbXBsYXRlLiBUaGlzIGFsbG93cyB1cyB0byBtYXAgdGhlIGVycm9yXG4gICAgLy8gZGlyZWN0bHkgaW50byB0aGUgYnl0ZXMgb2YgdGhlIHNvdXJjZSBmaWxlLlxuICAgIHJldHVybiB7XG4gICAgICBzb3VyY2U6ICduZ3RzYycsXG4gICAgICBjb2RlOiBuZ0Vycm9yQ29kZShjb2RlKSwgY2F0ZWdvcnksIG1lc3NhZ2VUZXh0LFxuICAgICAgZmlsZTogbWFwcGluZy5ub2RlLmdldFNvdXJjZUZpbGUoKSxcbiAgICAgIGNvbXBvbmVudEZpbGU6IG1hcHBpbmcubm9kZS5nZXRTb3VyY2VGaWxlKCksXG4gICAgICBzdGFydDogc3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgICBsZW5ndGg6IHNwYW4uZW5kLm9mZnNldCAtIHNwYW4uc3RhcnQub2Zmc2V0LCByZWxhdGVkSW5mb3JtYXRpb24sXG4gICAgfTtcbiAgfSBlbHNlIGlmIChtYXBwaW5nLnR5cGUgPT09ICdpbmRpcmVjdCcgfHwgbWFwcGluZy50eXBlID09PSAnZXh0ZXJuYWwnKSB7XG4gICAgLy8gRm9yIGluZGlyZWN0IG1hcHBpbmdzICh0ZW1wbGF0ZSB3YXMgZGVjbGFyZWQgaW5saW5lLCBidXQgbmd0c2MgY291bGRuJ3QgbWFwIGl0IGRpcmVjdGx5XG4gICAgLy8gdG8gYSBzdHJpbmcgY29uc3RhbnQgaW4gdGhlIGRlY29yYXRvciksIHRoZSBjb21wb25lbnQncyBmaWxlIG5hbWUgaXMgZ2l2ZW4gd2l0aCBhIHN1ZmZpeFxuICAgIC8vIGluZGljYXRpbmcgaXQncyBub3QgdGhlIFRTIGZpbGUgYmVpbmcgZGlzcGxheWVkLCBidXQgYSB0ZW1wbGF0ZS5cbiAgICAvLyBGb3IgZXh0ZXJuYWwgdGVtb3BsYXRlcywgdGhlIEhUTUwgZmlsZW5hbWUgaXMgdXNlZC5cbiAgICBjb25zdCBjb21wb25lbnRTZiA9IG1hcHBpbmcuY29tcG9uZW50Q2xhc3MuZ2V0U291cmNlRmlsZSgpO1xuICAgIGNvbnN0IGNvbXBvbmVudE5hbWUgPSBtYXBwaW5nLmNvbXBvbmVudENsYXNzLm5hbWUudGV4dDtcbiAgICAvLyBUT0RPKGFseGh1Yik6IHJlbW92ZSBjYXN0IHdoZW4gVFMgaW4gZzMgc3VwcG9ydHMgdGhpcyBuYXJyb3dpbmcuXG4gICAgY29uc3QgZmlsZU5hbWUgPSBtYXBwaW5nLnR5cGUgPT09ICdpbmRpcmVjdCcgP1xuICAgICAgICBgJHtjb21wb25lbnRTZi5maWxlTmFtZX0gKCR7Y29tcG9uZW50TmFtZX0gdGVtcGxhdGUpYCA6XG4gICAgICAgIChtYXBwaW5nIGFzIEV4dGVybmFsVGVtcGxhdGVTb3VyY2VNYXBwaW5nKS50ZW1wbGF0ZVVybDtcbiAgICAvLyBUT0RPKGFseGh1Yik6IGludmVzdGlnYXRlIGNyZWF0aW5nIGEgZmFrZSBgdHMuU291cmNlRmlsZWAgaGVyZSBpbnN0ZWFkIG9mIGludm9raW5nIHRoZSBUU1xuICAgIC8vIHBhcnNlciBhZ2FpbnN0IHRoZSB0ZW1wbGF0ZSAoSFRNTCBpcyBqdXN0IHJlYWxseSBzeW50YWN0aWNhbGx5IGludmFsaWQgVHlwZVNjcmlwdCBjb2RlIDspLlxuICAgIC8vIEFsc28gaW52ZXN0aWdhdGUgY2FjaGluZyB0aGUgZmlsZSB0byBhdm9pZCBydW5uaW5nIHRoZSBwYXJzZXIgbXVsdGlwbGUgdGltZXMuXG4gICAgY29uc3Qgc2YgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKFxuICAgICAgICBmaWxlTmFtZSwgbWFwcGluZy50ZW1wbGF0ZSwgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCwgZmFsc2UsIHRzLlNjcmlwdEtpbmQuSlNYKTtcblxuICAgIGxldCByZWxhdGVkSW5mb3JtYXRpb246IHRzLkRpYWdub3N0aWNSZWxhdGVkSW5mb3JtYXRpb25bXSA9IFtdO1xuICAgIGlmIChyZWxhdGVkTWVzc2FnZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZWxhdGVkSW5mb3JtYXRpb24ucHVzaCh7XG4gICAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuTWVzc2FnZSxcbiAgICAgICAgY29kZTogMCxcbiAgICAgICAgZmlsZTogc2YsXG4gICAgICAgIHN0YXJ0OiByZWxhdGVkTWVzc2FnZS5zcGFuLnN0YXJ0Lm9mZnNldCxcbiAgICAgICAgbGVuZ3RoOiByZWxhdGVkTWVzc2FnZS5zcGFuLmVuZC5vZmZzZXQgLSByZWxhdGVkTWVzc2FnZS5zcGFuLnN0YXJ0Lm9mZnNldCxcbiAgICAgICAgbWVzc2FnZVRleHQ6IHJlbGF0ZWRNZXNzYWdlLnRleHQsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZWxhdGVkSW5mb3JtYXRpb24ucHVzaCh7XG4gICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5Lk1lc3NhZ2UsXG4gICAgICBjb2RlOiAwLFxuICAgICAgZmlsZTogY29tcG9uZW50U2YsXG4gICAgICAvLyBtYXBwaW5nLm5vZGUgcmVwcmVzZW50cyBlaXRoZXIgdGhlICd0ZW1wbGF0ZScgb3IgJ3RlbXBsYXRlVXJsJyBleHByZXNzaW9uLiBnZXRTdGFydCgpXG4gICAgICAvLyBhbmQgZ2V0RW5kKCkgYXJlIHVzZWQgYmVjYXVzZSB0aGV5IGRvbid0IGluY2x1ZGUgc3Vycm91bmRpbmcgd2hpdGVzcGFjZS5cbiAgICAgIHN0YXJ0OiBtYXBwaW5nLm5vZGUuZ2V0U3RhcnQoKSxcbiAgICAgIGxlbmd0aDogbWFwcGluZy5ub2RlLmdldEVuZCgpIC0gbWFwcGluZy5ub2RlLmdldFN0YXJ0KCksXG4gICAgICBtZXNzYWdlVGV4dDogYEVycm9yIG9jY3VycyBpbiB0aGUgdGVtcGxhdGUgb2YgY29tcG9uZW50ICR7Y29tcG9uZW50TmFtZX0uYCxcbiAgICB9KTtcblxuICAgIHJldHVybiB7XG4gICAgICBzb3VyY2U6ICduZ3RzYycsXG4gICAgICBjYXRlZ29yeSxcbiAgICAgIGNvZGU6IG5nRXJyb3JDb2RlKGNvZGUpLCBtZXNzYWdlVGV4dCxcbiAgICAgIGZpbGU6IHNmLFxuICAgICAgY29tcG9uZW50RmlsZTogY29tcG9uZW50U2YsXG4gICAgICBzdGFydDogc3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgICBsZW5ndGg6IHNwYW4uZW5kLm9mZnNldCAtIHNwYW4uc3RhcnQub2Zmc2V0LFxuICAgICAgLy8gU2hvdyBhIHNlY29uZGFyeSBtZXNzYWdlIGluZGljYXRpbmcgdGhlIGNvbXBvbmVudCB3aG9zZSB0ZW1wbGF0ZSBjb250YWlucyB0aGUgZXJyb3IuXG4gICAgICByZWxhdGVkSW5mb3JtYXRpb24sXG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ZWQgc291cmNlIG1hcHBpbmcgdHlwZTogJHsobWFwcGluZyBhcyB7dHlwZTogc3RyaW5nfSkudHlwZX1gKTtcbiAgfVxufVxuXG5pbnRlcmZhY2UgU291cmNlTG9jYXRpb24ge1xuICBpZDogVGVtcGxhdGVJZDtcbiAgc3BhbjogQWJzb2x1dGVTb3VyY2VTcGFuO1xufVxuXG4vKipcbiAqIFRyYXZlcnNlcyB1cCB0aGUgQVNUIHN0YXJ0aW5nIGZyb20gdGhlIGdpdmVuIG5vZGUgdG8gZXh0cmFjdCB0aGUgc291cmNlIGxvY2F0aW9uIGZyb20gY29tbWVudHNcbiAqIHRoYXQgaGF2ZSBiZWVuIGVtaXR0ZWQgaW50byB0aGUgVENCLiBJZiB0aGUgbm9kZSBkb2VzIG5vdCBleGlzdCB3aXRoaW4gYSBUQ0IsIG9yIGlmIGFuIGlnbm9yZVxuICogbWFya2VyIGNvbW1lbnQgaXMgZm91bmQgdXAgdGhlIHRyZWUsIHRoaXMgZnVuY3Rpb24gcmV0dXJucyBudWxsLlxuICovXG5mdW5jdGlvbiBmaW5kU291cmNlTG9jYXRpb24obm9kZTogdHMuTm9kZSwgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IFNvdXJjZUxvY2F0aW9ufG51bGwge1xuICAvLyBTZWFyY2ggZm9yIGNvbW1lbnRzIHVudGlsIHRoZSBUQ0IncyBmdW5jdGlvbiBkZWNsYXJhdGlvbiBpcyBlbmNvdW50ZXJlZC5cbiAgd2hpbGUgKG5vZGUgIT09IHVuZGVmaW5lZCAmJiAhdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgaWYgKGhhc0lnbm9yZU1hcmtlcihub2RlLCBzb3VyY2VGaWxlKSkge1xuICAgICAgLy8gVGhlcmUncyBhbiBpZ25vcmUgbWFya2VyIG9uIHRoaXMgbm9kZSwgc28gdGhlIGRpYWdub3N0aWMgc2hvdWxkIG5vdCBiZSByZXBvcnRlZC5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHNwYW4gPSByZWFkU3BhbkNvbW1lbnQoc291cmNlRmlsZSwgbm9kZSk7XG4gICAgaWYgKHNwYW4gIT09IG51bGwpIHtcbiAgICAgIC8vIE9uY2UgdGhlIHBvc2l0aW9uYWwgaW5mb3JtYXRpb24gaGFzIGJlZW4gZXh0cmFjdGVkLCBzZWFyY2ggZnVydGhlciB1cCB0aGUgVENCIHRvIGV4dHJhY3RcbiAgICAgIC8vIHRoZSB1bmlxdWUgaWQgdGhhdCBpcyBhdHRhY2hlZCB3aXRoIHRoZSBUQ0IncyBmdW5jdGlvbiBkZWNsYXJhdGlvbi5cbiAgICAgIGNvbnN0IGlkID0gZ2V0VGVtcGxhdGVJZChub2RlLCBzb3VyY2VGaWxlKTtcbiAgICAgIGlmIChpZCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB7aWQsIHNwYW59O1xuICAgIH1cblxuICAgIG5vZGUgPSBub2RlLnBhcmVudDtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBnZXRUZW1wbGF0ZUlkKG5vZGU6IHRzLk5vZGUsIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBUZW1wbGF0ZUlkfG51bGwge1xuICAvLyBXYWxrIHVwIHRvIHRoZSBmdW5jdGlvbiBkZWNsYXJhdGlvbiBvZiB0aGUgVENCLCB0aGUgZmlsZSBpbmZvcm1hdGlvbiBpcyBhdHRhY2hlZCB0aGVyZS5cbiAgd2hpbGUgKCF0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICBpZiAoaGFzSWdub3JlTWFya2VyKG5vZGUsIHNvdXJjZUZpbGUpKSB7XG4gICAgICAvLyBUaGVyZSdzIGFuIGlnbm9yZSBtYXJrZXIgb24gdGhpcyBub2RlLCBzbyB0aGUgZGlhZ25vc3RpYyBzaG91bGQgbm90IGJlIHJlcG9ydGVkLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIG5vZGUgPSBub2RlLnBhcmVudDtcblxuICAgIC8vIEJhaWwgb25jZSB3ZSBoYXZlIHJlYWNoZWQgdGhlIHJvb3QuXG4gICAgaWYgKG5vZGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgY29uc3Qgc3RhcnQgPSBub2RlLmdldEZ1bGxTdGFydCgpO1xuICByZXR1cm4gdHMuZm9yRWFjaExlYWRpbmdDb21tZW50UmFuZ2Uoc291cmNlRmlsZS50ZXh0LCBzdGFydCwgKHBvcywgZW5kLCBraW5kKSA9PiB7XG4gICAgaWYgKGtpbmQgIT09IHRzLlN5bnRheEtpbmQuTXVsdGlMaW5lQ29tbWVudFRyaXZpYSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGNvbW1lbnRUZXh0ID0gc291cmNlRmlsZS50ZXh0LnN1YnN0cmluZyhwb3MgKyAyLCBlbmQgLSAyKTtcbiAgICByZXR1cm4gY29tbWVudFRleHQ7XG4gIH0pIGFzIFRlbXBsYXRlSWQgfHwgbnVsbDtcbn1cblxuY29uc3QgcGFyc2VTcGFuQ29tbWVudCA9IC9eKFxcZCspLChcXGQrKSQvO1xuXG5mdW5jdGlvbiByZWFkU3BhbkNvbW1lbnQoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgbm9kZTogdHMuTm9kZSk6IEFic29sdXRlU291cmNlU3BhbnxudWxsIHtcbiAgcmV0dXJuIHRzLmZvckVhY2hUcmFpbGluZ0NvbW1lbnRSYW5nZShzb3VyY2VGaWxlLnRleHQsIG5vZGUuZ2V0RW5kKCksIChwb3MsIGVuZCwga2luZCkgPT4ge1xuICAgIGlmIChraW5kICE9PSB0cy5TeW50YXhLaW5kLk11bHRpTGluZUNvbW1lbnRUcml2aWEpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBjb21tZW50VGV4dCA9IHNvdXJjZUZpbGUudGV4dC5zdWJzdHJpbmcocG9zICsgMiwgZW5kIC0gMik7XG4gICAgY29uc3QgbWF0Y2ggPSBjb21tZW50VGV4dC5tYXRjaChwYXJzZVNwYW5Db21tZW50KTtcbiAgICBpZiAobWF0Y2ggPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgQWJzb2x1dGVTb3VyY2VTcGFuKCttYXRjaFsxXSwgK21hdGNoWzJdKTtcbiAgfSkgfHwgbnVsbDtcbn1cblxuZnVuY3Rpb24gaGFzSWdub3JlTWFya2VyKG5vZGU6IHRzLk5vZGUsIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBib29sZWFuIHtcbiAgcmV0dXJuIHRzLmZvckVhY2hUcmFpbGluZ0NvbW1lbnRSYW5nZShzb3VyY2VGaWxlLnRleHQsIG5vZGUuZ2V0RW5kKCksIChwb3MsIGVuZCwga2luZCkgPT4ge1xuICAgIGlmIChraW5kICE9PSB0cy5TeW50YXhLaW5kLk11bHRpTGluZUNvbW1lbnRUcml2aWEpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBjb21tZW50VGV4dCA9IHNvdXJjZUZpbGUudGV4dC5zdWJzdHJpbmcocG9zICsgMiwgZW5kIC0gMik7XG4gICAgcmV0dXJuIGNvbW1lbnRUZXh0ID09PSBJR05PUkVfTUFSS0VSO1xuICB9KSA9PT0gdHJ1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVGVtcGxhdGVEaWFnbm9zdGljKGRpYWdub3N0aWM6IHRzLkRpYWdub3N0aWMpOiBkaWFnbm9zdGljIGlzIFRlbXBsYXRlRGlhZ25vc3RpYyB7XG4gIHJldHVybiBkaWFnbm9zdGljLmhhc093blByb3BlcnR5KCdjb21wb25lbnRGaWxlJykgJiZcbiAgICAgIHRzLmlzU291cmNlRmlsZSgoZGlhZ25vc3RpYyBhcyBhbnkpLmNvbXBvbmVudEZpbGUpO1xufVxuIl19