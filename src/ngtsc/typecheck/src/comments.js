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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/comments", ["require", "exports", "tslib", "@angular/compiler", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.hasExpressionIdentifier = exports.findAllMatchingNodes = exports.findFirstMatchingNode = exports.hasIgnoreMarker = exports.markIgnoreDiagnostics = exports.addExpressionIdentifier = exports.ExpressionIdentifier = exports.CommentTriviaType = exports.readSpanComment = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var parseSpanComment = /^(\d+),(\d+)$/;
    /**
     * Reads the trailing comments and finds the first match which is a span comment (i.e. 4,10) on a
     * node and returns it as an `AbsoluteSourceSpan`.
     *
     * Will return `null` if no trailing comments on the node match the expected form of a source span.
     */
    function readSpanComment(node, sourceFile) {
        if (sourceFile === void 0) { sourceFile = node.getSourceFile(); }
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
    exports.readSpanComment = readSpanComment;
    /** Used to identify what type the comment is. */
    var CommentTriviaType;
    (function (CommentTriviaType) {
        CommentTriviaType["DIAGNOSTIC"] = "D";
        CommentTriviaType["EXPRESSION_TYPE_IDENTIFIER"] = "T";
    })(CommentTriviaType = exports.CommentTriviaType || (exports.CommentTriviaType = {}));
    /** Identifies what the TCB expression is for (for example, a directive declaration). */
    var ExpressionIdentifier;
    (function (ExpressionIdentifier) {
        ExpressionIdentifier["DIRECTIVE"] = "DIR";
    })(ExpressionIdentifier = exports.ExpressionIdentifier || (exports.ExpressionIdentifier = {}));
    /** Tags the node with the given expression identifier. */
    function addExpressionIdentifier(node, identifier) {
        ts.addSyntheticTrailingComment(node, ts.SyntaxKind.MultiLineCommentTrivia, CommentTriviaType.EXPRESSION_TYPE_IDENTIFIER + ":" + identifier, 
        /* hasTrailingNewLine */ false);
    }
    exports.addExpressionIdentifier = addExpressionIdentifier;
    var IGNORE_MARKER = CommentTriviaType.DIAGNOSTIC + ":ignore";
    /**
     * Tag the `ts.Node` with an indication that any errors arising from the evaluation of the node
     * should be ignored.
     */
    function markIgnoreDiagnostics(node) {
        ts.addSyntheticTrailingComment(node, ts.SyntaxKind.MultiLineCommentTrivia, IGNORE_MARKER, /* hasTrailingNewLine */ false);
    }
    exports.markIgnoreDiagnostics = markIgnoreDiagnostics;
    /** Returns true if the node has a marker that indicates diagnostics errors should be ignored.  */
    function hasIgnoreMarker(node, sourceFile) {
        return ts.forEachTrailingCommentRange(sourceFile.text, node.getEnd(), function (pos, end, kind) {
            if (kind !== ts.SyntaxKind.MultiLineCommentTrivia) {
                return null;
            }
            var commentText = sourceFile.text.substring(pos + 2, end - 2);
            return commentText === IGNORE_MARKER;
        }) === true;
    }
    exports.hasIgnoreMarker = hasIgnoreMarker;
    function makeRecursiveVisitor(visitor) {
        function recursiveVisitor(node) {
            var res = visitor(node);
            return res !== null ? res : node.forEachChild(recursiveVisitor);
        }
        return recursiveVisitor;
    }
    function getSpanFromOptions(opts) {
        var withSpan = null;
        if (opts.withSpan !== undefined) {
            if (opts.withSpan instanceof compiler_1.AbsoluteSourceSpan) {
                withSpan = opts.withSpan;
            }
            else {
                withSpan = { start: opts.withSpan.start.offset, end: opts.withSpan.end.offset };
            }
        }
        return withSpan;
    }
    /**
     * Given a `ts.Node` with finds the first node whose matching the criteria specified
     * by the `FindOptions`.
     *
     * Returns `null` when no `ts.Node` matches the given conditions.
     */
    function findFirstMatchingNode(tcb, opts) {
        var _a;
        var withSpan = getSpanFromOptions(opts);
        var sf = tcb.getSourceFile();
        var visitor = makeRecursiveVisitor(function (node) {
            if (!opts.filter(node)) {
                return null;
            }
            if (withSpan !== null) {
                var comment = readSpanComment(node, sf);
                if (comment === null || withSpan.start !== comment.start || withSpan.end !== comment.end) {
                    return null;
                }
            }
            return node;
        });
        return (_a = tcb.forEachChild(visitor)) !== null && _a !== void 0 ? _a : null;
    }
    exports.findFirstMatchingNode = findFirstMatchingNode;
    /**
     * Given a `ts.Node` with source span comments, finds the first node whose source span comment
     * matches the given `sourceSpan`. Additionally, the `filter` function allows matching only
     * `ts.Nodes` of a given type, which provides the ability to select only matches of a given type
     * when there may be more than one.
     *
     * Returns `null` when no `ts.Node` matches the given conditions.
     */
    function findAllMatchingNodes(tcb, opts) {
        var withSpan = getSpanFromOptions(opts);
        var results = [];
        var stack = [tcb];
        var sf = tcb.getSourceFile();
        while (stack.length > 0) {
            var node = stack.pop();
            if (!opts.filter(node)) {
                stack.push.apply(stack, tslib_1.__spread(node.getChildren()));
                continue;
            }
            if (withSpan !== null) {
                var comment = readSpanComment(node, sf);
                if (comment === null || withSpan.start !== comment.start || withSpan.end !== comment.end) {
                    stack.push.apply(stack, tslib_1.__spread(node.getChildren()));
                    continue;
                }
            }
            results.push(node);
        }
        return results;
    }
    exports.findAllMatchingNodes = findAllMatchingNodes;
    function hasExpressionIdentifier(sourceFile, node, identifier) {
        return ts.forEachTrailingCommentRange(sourceFile.text, node.getEnd(), function (pos, end, kind) {
            if (kind !== ts.SyntaxKind.MultiLineCommentTrivia) {
                return false;
            }
            var commentText = sourceFile.text.substring(pos + 2, end - 2);
            return commentText === CommentTriviaType.EXPRESSION_TYPE_IDENTIFIER + ":" + identifier;
        }) || false;
    }
    exports.hasExpressionIdentifier = hasExpressionIdentifier;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvY29tbWVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFzRTtJQUN0RSwrQkFBaUM7SUFFakMsSUFBTSxnQkFBZ0IsR0FBRyxlQUFlLENBQUM7SUFFekM7Ozs7O09BS0c7SUFDSCxTQUFnQixlQUFlLENBQzNCLElBQWEsRUFBRSxVQUFnRDtRQUFoRCwyQkFBQSxFQUFBLGFBQTRCLElBQUksQ0FBQyxhQUFhLEVBQUU7UUFDakUsT0FBTyxFQUFFLENBQUMsMkJBQTJCLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsVUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUk7WUFDbkYsSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsRUFBRTtnQkFDakQsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELElBQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2hFLElBQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUNsRCxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUU7Z0JBQ2xCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxPQUFPLElBQUksNkJBQWtCLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RCxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUM7SUFDYixDQUFDO0lBZEQsMENBY0M7SUFFRCxpREFBaUQ7SUFDakQsSUFBWSxpQkFHWDtJQUhELFdBQVksaUJBQWlCO1FBQzNCLHFDQUFnQixDQUFBO1FBQ2hCLHFEQUFnQyxDQUFBO0lBQ2xDLENBQUMsRUFIVyxpQkFBaUIsR0FBakIseUJBQWlCLEtBQWpCLHlCQUFpQixRQUc1QjtJQUVELHdGQUF3RjtJQUN4RixJQUFZLG9CQUVYO0lBRkQsV0FBWSxvQkFBb0I7UUFDOUIseUNBQWlCLENBQUE7SUFDbkIsQ0FBQyxFQUZXLG9CQUFvQixHQUFwQiw0QkFBb0IsS0FBcEIsNEJBQW9CLFFBRS9CO0lBRUQsMERBQTBEO0lBQzFELFNBQWdCLHVCQUF1QixDQUFDLElBQWEsRUFBRSxVQUFnQztRQUNyRixFQUFFLENBQUMsMkJBQTJCLENBQzFCLElBQUksRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLHNCQUFzQixFQUN2QyxpQkFBaUIsQ0FBQywwQkFBMEIsU0FBSSxVQUFZO1FBQy9ELHdCQUF3QixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFMRCwwREFLQztJQUVELElBQU0sYUFBYSxHQUFNLGlCQUFpQixDQUFDLFVBQVUsWUFBUyxDQUFDO0lBRS9EOzs7T0FHRztJQUNILFNBQWdCLHFCQUFxQixDQUFDLElBQWE7UUFDakQsRUFBRSxDQUFDLDJCQUEyQixDQUMxQixJQUFJLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsRUFBRSxhQUFhLEVBQUUsd0JBQXdCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDakcsQ0FBQztJQUhELHNEQUdDO0lBRUQsa0dBQWtHO0lBQ2xHLFNBQWdCLGVBQWUsQ0FBQyxJQUFhLEVBQUUsVUFBeUI7UUFDdEUsT0FBTyxFQUFFLENBQUMsMkJBQTJCLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsVUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUk7WUFDbkYsSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsRUFBRTtnQkFDakQsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELElBQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2hFLE9BQU8sV0FBVyxLQUFLLGFBQWEsQ0FBQztRQUN2QyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBUkQsMENBUUM7SUFFRCxTQUFTLG9CQUFvQixDQUFvQixPQUFvQztRQUVuRixTQUFTLGdCQUFnQixDQUFDLElBQWE7WUFDckMsSUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFCLE9BQU8sR0FBRyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDbEUsQ0FBQztRQUNELE9BQU8sZ0JBQWdCLENBQUM7SUFDMUIsQ0FBQztJQU9ELFNBQVMsa0JBQWtCLENBQUMsSUFBMEI7UUFDcEQsSUFBSSxRQUFRLEdBQXNDLElBQUksQ0FBQztRQUN2RCxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssU0FBUyxFQUFFO1lBQy9CLElBQUksSUFBSSxDQUFDLFFBQVEsWUFBWSw2QkFBa0IsRUFBRTtnQkFDL0MsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7YUFDMUI7aUJBQU07Z0JBQ0wsUUFBUSxHQUFHLEVBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFDLENBQUM7YUFDL0U7U0FDRjtRQUNELE9BQU8sUUFBUSxDQUFDO0lBQ2xCLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILFNBQWdCLHFCQUFxQixDQUFvQixHQUFZLEVBQUUsSUFBb0I7O1FBRXpGLElBQU0sUUFBUSxHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFDLElBQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUMvQixJQUFNLE9BQU8sR0FBRyxvQkFBb0IsQ0FBSSxVQUFBLElBQUk7WUFDMUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3RCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxJQUFJLFFBQVEsS0FBSyxJQUFJLEVBQUU7Z0JBQ3JCLElBQU0sT0FBTyxHQUFHLGVBQWUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzFDLElBQUksT0FBTyxLQUFLLElBQUksSUFBSSxRQUFRLENBQUMsS0FBSyxLQUFLLE9BQU8sQ0FBQyxLQUFLLElBQUksUUFBUSxDQUFDLEdBQUcsS0FBSyxPQUFPLENBQUMsR0FBRyxFQUFFO29CQUN4RixPQUFPLElBQUksQ0FBQztpQkFDYjthQUNGO1lBQ0QsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQztRQUNILGFBQU8sR0FBRyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsbUNBQUksSUFBSSxDQUFDO0lBQzNDLENBQUM7SUFqQkQsc0RBaUJDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNILFNBQWdCLG9CQUFvQixDQUFvQixHQUFZLEVBQUUsSUFBb0I7UUFDeEYsSUFBTSxRQUFRLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDMUMsSUFBTSxPQUFPLEdBQVEsRUFBRSxDQUFDO1FBQ3hCLElBQU0sS0FBSyxHQUFjLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDL0IsSUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBRS9CLE9BQU8sS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDdkIsSUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLEdBQUcsRUFBRyxDQUFDO1lBRTFCLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUN0QixLQUFLLENBQUMsSUFBSSxPQUFWLEtBQUssbUJBQVMsSUFBSSxDQUFDLFdBQVcsRUFBRSxHQUFFO2dCQUNsQyxTQUFTO2FBQ1Y7WUFDRCxJQUFJLFFBQVEsS0FBSyxJQUFJLEVBQUU7Z0JBQ3JCLElBQU0sT0FBTyxHQUFHLGVBQWUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzFDLElBQUksT0FBTyxLQUFLLElBQUksSUFBSSxRQUFRLENBQUMsS0FBSyxLQUFLLE9BQU8sQ0FBQyxLQUFLLElBQUksUUFBUSxDQUFDLEdBQUcsS0FBSyxPQUFPLENBQUMsR0FBRyxFQUFFO29CQUN4RixLQUFLLENBQUMsSUFBSSxPQUFWLEtBQUssbUJBQVMsSUFBSSxDQUFDLFdBQVcsRUFBRSxHQUFFO29CQUNsQyxTQUFTO2lCQUNWO2FBQ0Y7WUFFRCxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3BCO1FBRUQsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztJQXpCRCxvREF5QkM7SUFFRCxTQUFnQix1QkFBdUIsQ0FDbkMsVUFBeUIsRUFBRSxJQUFhLEVBQUUsVUFBZ0M7UUFDNUUsT0FBTyxFQUFFLENBQUMsMkJBQTJCLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsVUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUk7WUFDbkYsSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsRUFBRTtnQkFDakQsT0FBTyxLQUFLLENBQUM7YUFDZDtZQUNELElBQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2hFLE9BQU8sV0FBVyxLQUFRLGlCQUFpQixDQUFDLDBCQUEwQixTQUFJLFVBQVksQ0FBQztRQUN6RixDQUFDLENBQUMsSUFBSSxLQUFLLENBQUM7SUFDZCxDQUFDO0lBVEQsMERBU0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBYnNvbHV0ZVNvdXJjZVNwYW4sIFBhcnNlU291cmNlU3Bhbn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmNvbnN0IHBhcnNlU3BhbkNvbW1lbnQgPSAvXihcXGQrKSwoXFxkKykkLztcblxuLyoqXG4gKiBSZWFkcyB0aGUgdHJhaWxpbmcgY29tbWVudHMgYW5kIGZpbmRzIHRoZSBmaXJzdCBtYXRjaCB3aGljaCBpcyBhIHNwYW4gY29tbWVudCAoaS5lLiA0LDEwKSBvbiBhXG4gKiBub2RlIGFuZCByZXR1cm5zIGl0IGFzIGFuIGBBYnNvbHV0ZVNvdXJjZVNwYW5gLlxuICpcbiAqIFdpbGwgcmV0dXJuIGBudWxsYCBpZiBubyB0cmFpbGluZyBjb21tZW50cyBvbiB0aGUgbm9kZSBtYXRjaCB0aGUgZXhwZWN0ZWQgZm9ybSBvZiBhIHNvdXJjZSBzcGFuLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZFNwYW5Db21tZW50KFxuICAgIG5vZGU6IHRzLk5vZGUsIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUgPSBub2RlLmdldFNvdXJjZUZpbGUoKSk6IEFic29sdXRlU291cmNlU3BhbnxudWxsIHtcbiAgcmV0dXJuIHRzLmZvckVhY2hUcmFpbGluZ0NvbW1lbnRSYW5nZShzb3VyY2VGaWxlLnRleHQsIG5vZGUuZ2V0RW5kKCksIChwb3MsIGVuZCwga2luZCkgPT4ge1xuICAgIGlmIChraW5kICE9PSB0cy5TeW50YXhLaW5kLk11bHRpTGluZUNvbW1lbnRUcml2aWEpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBjb21tZW50VGV4dCA9IHNvdXJjZUZpbGUudGV4dC5zdWJzdHJpbmcocG9zICsgMiwgZW5kIC0gMik7XG4gICAgY29uc3QgbWF0Y2ggPSBjb21tZW50VGV4dC5tYXRjaChwYXJzZVNwYW5Db21tZW50KTtcbiAgICBpZiAobWF0Y2ggPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgQWJzb2x1dGVTb3VyY2VTcGFuKCttYXRjaFsxXSwgK21hdGNoWzJdKTtcbiAgfSkgfHwgbnVsbDtcbn1cblxuLyoqIFVzZWQgdG8gaWRlbnRpZnkgd2hhdCB0eXBlIHRoZSBjb21tZW50IGlzLiAqL1xuZXhwb3J0IGVudW0gQ29tbWVudFRyaXZpYVR5cGUge1xuICBESUFHTk9TVElDID0gJ0QnLFxuICBFWFBSRVNTSU9OX1RZUEVfSURFTlRJRklFUiA9ICdUJyxcbn1cblxuLyoqIElkZW50aWZpZXMgd2hhdCB0aGUgVENCIGV4cHJlc3Npb24gaXMgZm9yIChmb3IgZXhhbXBsZSwgYSBkaXJlY3RpdmUgZGVjbGFyYXRpb24pLiAqL1xuZXhwb3J0IGVudW0gRXhwcmVzc2lvbklkZW50aWZpZXIge1xuICBESVJFQ1RJVkUgPSAnRElSJyxcbn1cblxuLyoqIFRhZ3MgdGhlIG5vZGUgd2l0aCB0aGUgZ2l2ZW4gZXhwcmVzc2lvbiBpZGVudGlmaWVyLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFkZEV4cHJlc3Npb25JZGVudGlmaWVyKG5vZGU6IHRzLk5vZGUsIGlkZW50aWZpZXI6IEV4cHJlc3Npb25JZGVudGlmaWVyKSB7XG4gIHRzLmFkZFN5bnRoZXRpY1RyYWlsaW5nQ29tbWVudChcbiAgICAgIG5vZGUsIHRzLlN5bnRheEtpbmQuTXVsdGlMaW5lQ29tbWVudFRyaXZpYSxcbiAgICAgIGAke0NvbW1lbnRUcml2aWFUeXBlLkVYUFJFU1NJT05fVFlQRV9JREVOVElGSUVSfToke2lkZW50aWZpZXJ9YCxcbiAgICAgIC8qIGhhc1RyYWlsaW5nTmV3TGluZSAqLyBmYWxzZSk7XG59XG5cbmNvbnN0IElHTk9SRV9NQVJLRVIgPSBgJHtDb21tZW50VHJpdmlhVHlwZS5ESUFHTk9TVElDfTppZ25vcmVgO1xuXG4vKipcbiAqIFRhZyB0aGUgYHRzLk5vZGVgIHdpdGggYW4gaW5kaWNhdGlvbiB0aGF0IGFueSBlcnJvcnMgYXJpc2luZyBmcm9tIHRoZSBldmFsdWF0aW9uIG9mIHRoZSBub2RlXG4gKiBzaG91bGQgYmUgaWdub3JlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hcmtJZ25vcmVEaWFnbm9zdGljcyhub2RlOiB0cy5Ob2RlKTogdm9pZCB7XG4gIHRzLmFkZFN5bnRoZXRpY1RyYWlsaW5nQ29tbWVudChcbiAgICAgIG5vZGUsIHRzLlN5bnRheEtpbmQuTXVsdGlMaW5lQ29tbWVudFRyaXZpYSwgSUdOT1JFX01BUktFUiwgLyogaGFzVHJhaWxpbmdOZXdMaW5lICovIGZhbHNlKTtcbn1cblxuLyoqIFJldHVybnMgdHJ1ZSBpZiB0aGUgbm9kZSBoYXMgYSBtYXJrZXIgdGhhdCBpbmRpY2F0ZXMgZGlhZ25vc3RpY3MgZXJyb3JzIHNob3VsZCBiZSBpZ25vcmVkLiAgKi9cbmV4cG9ydCBmdW5jdGlvbiBoYXNJZ25vcmVNYXJrZXIobm9kZTogdHMuTm9kZSwgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IGJvb2xlYW4ge1xuICByZXR1cm4gdHMuZm9yRWFjaFRyYWlsaW5nQ29tbWVudFJhbmdlKHNvdXJjZUZpbGUudGV4dCwgbm9kZS5nZXRFbmQoKSwgKHBvcywgZW5kLCBraW5kKSA9PiB7XG4gICAgaWYgKGtpbmQgIT09IHRzLlN5bnRheEtpbmQuTXVsdGlMaW5lQ29tbWVudFRyaXZpYSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGNvbW1lbnRUZXh0ID0gc291cmNlRmlsZS50ZXh0LnN1YnN0cmluZyhwb3MgKyAyLCBlbmQgLSAyKTtcbiAgICByZXR1cm4gY29tbWVudFRleHQgPT09IElHTk9SRV9NQVJLRVI7XG4gIH0pID09PSB0cnVlO1xufVxuXG5mdW5jdGlvbiBtYWtlUmVjdXJzaXZlVmlzaXRvcjxUIGV4dGVuZHMgdHMuTm9kZT4odmlzaXRvcjogKG5vZGU6IHRzLk5vZGUpID0+IFQgfCBudWxsKTpcbiAgICAobm9kZTogdHMuTm9kZSkgPT4gVCB8IHVuZGVmaW5lZCB7XG4gIGZ1bmN0aW9uIHJlY3Vyc2l2ZVZpc2l0b3Iobm9kZTogdHMuTm9kZSk6IFR8dW5kZWZpbmVkIHtcbiAgICBjb25zdCByZXMgPSB2aXNpdG9yKG5vZGUpO1xuICAgIHJldHVybiByZXMgIT09IG51bGwgPyByZXMgOiBub2RlLmZvckVhY2hDaGlsZChyZWN1cnNpdmVWaXNpdG9yKTtcbiAgfVxuICByZXR1cm4gcmVjdXJzaXZlVmlzaXRvcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBGaW5kT3B0aW9uczxUIGV4dGVuZHMgdHMuTm9kZT4ge1xuICBmaWx0ZXI6IChub2RlOiB0cy5Ob2RlKSA9PiBub2RlIGlzIFQ7XG4gIHdpdGhTcGFuPzogQWJzb2x1dGVTb3VyY2VTcGFufFBhcnNlU291cmNlU3Bhbjtcbn1cblxuZnVuY3Rpb24gZ2V0U3BhbkZyb21PcHRpb25zKG9wdHM6IEZpbmRPcHRpb25zPHRzLk5vZGU+KSB7XG4gIGxldCB3aXRoU3Bhbjoge3N0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyfXxudWxsID0gbnVsbDtcbiAgaWYgKG9wdHMud2l0aFNwYW4gIT09IHVuZGVmaW5lZCkge1xuICAgIGlmIChvcHRzLndpdGhTcGFuIGluc3RhbmNlb2YgQWJzb2x1dGVTb3VyY2VTcGFuKSB7XG4gICAgICB3aXRoU3BhbiA9IG9wdHMud2l0aFNwYW47XG4gICAgfSBlbHNlIHtcbiAgICAgIHdpdGhTcGFuID0ge3N0YXJ0OiBvcHRzLndpdGhTcGFuLnN0YXJ0Lm9mZnNldCwgZW5kOiBvcHRzLndpdGhTcGFuLmVuZC5vZmZzZXR9O1xuICAgIH1cbiAgfVxuICByZXR1cm4gd2l0aFNwYW47XG59XG5cbi8qKlxuICogR2l2ZW4gYSBgdHMuTm9kZWAgd2l0aCBmaW5kcyB0aGUgZmlyc3Qgbm9kZSB3aG9zZSBtYXRjaGluZyB0aGUgY3JpdGVyaWEgc3BlY2lmaWVkXG4gKiBieSB0aGUgYEZpbmRPcHRpb25zYC5cbiAqXG4gKiBSZXR1cm5zIGBudWxsYCB3aGVuIG5vIGB0cy5Ob2RlYCBtYXRjaGVzIHRoZSBnaXZlbiBjb25kaXRpb25zLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZmluZEZpcnN0TWF0Y2hpbmdOb2RlPFQgZXh0ZW5kcyB0cy5Ob2RlPih0Y2I6IHRzLk5vZGUsIG9wdHM6IEZpbmRPcHRpb25zPFQ+KTogVHxcbiAgICBudWxsIHtcbiAgY29uc3Qgd2l0aFNwYW4gPSBnZXRTcGFuRnJvbU9wdGlvbnMob3B0cyk7XG4gIGNvbnN0IHNmID0gdGNiLmdldFNvdXJjZUZpbGUoKTtcbiAgY29uc3QgdmlzaXRvciA9IG1ha2VSZWN1cnNpdmVWaXNpdG9yPFQ+KG5vZGUgPT4ge1xuICAgIGlmICghb3B0cy5maWx0ZXIobm9kZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBpZiAod2l0aFNwYW4gIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IGNvbW1lbnQgPSByZWFkU3BhbkNvbW1lbnQobm9kZSwgc2YpO1xuICAgICAgaWYgKGNvbW1lbnQgPT09IG51bGwgfHwgd2l0aFNwYW4uc3RhcnQgIT09IGNvbW1lbnQuc3RhcnQgfHwgd2l0aFNwYW4uZW5kICE9PSBjb21tZW50LmVuZCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5vZGU7XG4gIH0pO1xuICByZXR1cm4gdGNiLmZvckVhY2hDaGlsZCh2aXNpdG9yKSA/PyBudWxsO1xufVxuXG4vKipcbiAqIEdpdmVuIGEgYHRzLk5vZGVgIHdpdGggc291cmNlIHNwYW4gY29tbWVudHMsIGZpbmRzIHRoZSBmaXJzdCBub2RlIHdob3NlIHNvdXJjZSBzcGFuIGNvbW1lbnRcbiAqIG1hdGNoZXMgdGhlIGdpdmVuIGBzb3VyY2VTcGFuYC4gQWRkaXRpb25hbGx5LCB0aGUgYGZpbHRlcmAgZnVuY3Rpb24gYWxsb3dzIG1hdGNoaW5nIG9ubHlcbiAqIGB0cy5Ob2Rlc2Agb2YgYSBnaXZlbiB0eXBlLCB3aGljaCBwcm92aWRlcyB0aGUgYWJpbGl0eSB0byBzZWxlY3Qgb25seSBtYXRjaGVzIG9mIGEgZ2l2ZW4gdHlwZVxuICogd2hlbiB0aGVyZSBtYXkgYmUgbW9yZSB0aGFuIG9uZS5cbiAqXG4gKiBSZXR1cm5zIGBudWxsYCB3aGVuIG5vIGB0cy5Ob2RlYCBtYXRjaGVzIHRoZSBnaXZlbiBjb25kaXRpb25zLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZmluZEFsbE1hdGNoaW5nTm9kZXM8VCBleHRlbmRzIHRzLk5vZGU+KHRjYjogdHMuTm9kZSwgb3B0czogRmluZE9wdGlvbnM8VD4pOiBUW10ge1xuICBjb25zdCB3aXRoU3BhbiA9IGdldFNwYW5Gcm9tT3B0aW9ucyhvcHRzKTtcbiAgY29uc3QgcmVzdWx0czogVFtdID0gW107XG4gIGNvbnN0IHN0YWNrOiB0cy5Ob2RlW10gPSBbdGNiXTtcbiAgY29uc3Qgc2YgPSB0Y2IuZ2V0U291cmNlRmlsZSgpO1xuXG4gIHdoaWxlIChzdGFjay5sZW5ndGggPiAwKSB7XG4gICAgY29uc3Qgbm9kZSA9IHN0YWNrLnBvcCgpITtcblxuICAgIGlmICghb3B0cy5maWx0ZXIobm9kZSkpIHtcbiAgICAgIHN0YWNrLnB1c2goLi4ubm9kZS5nZXRDaGlsZHJlbigpKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAod2l0aFNwYW4gIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IGNvbW1lbnQgPSByZWFkU3BhbkNvbW1lbnQobm9kZSwgc2YpO1xuICAgICAgaWYgKGNvbW1lbnQgPT09IG51bGwgfHwgd2l0aFNwYW4uc3RhcnQgIT09IGNvbW1lbnQuc3RhcnQgfHwgd2l0aFNwYW4uZW5kICE9PSBjb21tZW50LmVuZCkge1xuICAgICAgICBzdGFjay5wdXNoKC4uLm5vZGUuZ2V0Q2hpbGRyZW4oKSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJlc3VsdHMucHVzaChub2RlKTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHRzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaGFzRXhwcmVzc2lvbklkZW50aWZpZXIoXG4gICAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgbm9kZTogdHMuTm9kZSwgaWRlbnRpZmllcjogRXhwcmVzc2lvbklkZW50aWZpZXIpOiBib29sZWFuIHtcbiAgcmV0dXJuIHRzLmZvckVhY2hUcmFpbGluZ0NvbW1lbnRSYW5nZShzb3VyY2VGaWxlLnRleHQsIG5vZGUuZ2V0RW5kKCksIChwb3MsIGVuZCwga2luZCkgPT4ge1xuICAgIGlmIChraW5kICE9PSB0cy5TeW50YXhLaW5kLk11bHRpTGluZUNvbW1lbnRUcml2aWEpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgY29uc3QgY29tbWVudFRleHQgPSBzb3VyY2VGaWxlLnRleHQuc3Vic3RyaW5nKHBvcyArIDIsIGVuZCAtIDIpO1xuICAgIHJldHVybiBjb21tZW50VGV4dCA9PT0gYCR7Q29tbWVudFRyaXZpYVR5cGUuRVhQUkVTU0lPTl9UWVBFX0lERU5USUZJRVJ9OiR7aWRlbnRpZmllcn1gO1xuICB9KSB8fCBmYWxzZTtcbn1cbiJdfQ==