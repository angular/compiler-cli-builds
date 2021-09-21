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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/completion", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler/src/compiler", "@angular/compiler/src/render3/r3_ast", "typescript", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/compiler-cli/src/ngtsc/typecheck/src/comments"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CompletionEngine = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var compiler_2 = require("@angular/compiler/src/compiler");
    var r3_ast_1 = require("@angular/compiler/src/render3/r3_ast");
    var ts = require("typescript");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/api");
    var comments_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/comments");
    /**
     * Powers autocompletion for a specific component.
     *
     * Internally caches autocompletion results, and must be discarded if the component template or
     * surrounding TS program have changed.
     */
    var CompletionEngine = /** @class */ (function () {
        function CompletionEngine(tcb, data, shimPath) {
            this.tcb = tcb;
            this.data = data;
            this.shimPath = shimPath;
            /**
             * Cache of completions for various levels of the template, including the root template (`null`).
             * Memoizes `getTemplateContextCompletions`.
             */
            this.templateContextCache = new Map();
            this.expressionCompletionCache = new Map();
            // Find the component completion expression within the TCB. This looks like: `ctx. /* ... */;`
            var globalRead = comments_1.findFirstMatchingNode(this.tcb, {
                filter: ts.isPropertyAccessExpression,
                withExpressionIdentifier: comments_1.ExpressionIdentifier.COMPONENT_COMPLETION
            });
            if (globalRead !== null) {
                this.componentContext = {
                    shimPath: this.shimPath,
                    // `globalRead.name` is an empty `ts.Identifier`, so its start position immediately follows
                    // the `.` in `ctx.`. TS autocompletion APIs can then be used to access completion results
                    // for the component context.
                    positionInShimFile: globalRead.name.getStart(),
                };
            }
            else {
                this.componentContext = null;
            }
        }
        /**
         * Get global completions within the given template context and AST node.
         *
         * @param context the given template context - either a `TmplAstTemplate` embedded view, or `null`
         *     for the root
         * template context.
         * @param node the given AST node
         */
        CompletionEngine.prototype.getGlobalCompletions = function (context, node) {
            if (this.componentContext === null) {
                return null;
            }
            var templateContext = this.getTemplateContextCompletions(context);
            if (templateContext === null) {
                return null;
            }
            var nodeContext = null;
            if (node instanceof compiler_2.EmptyExpr) {
                var nodeLocation = comments_1.findFirstMatchingNode(this.tcb, {
                    filter: ts.isIdentifier,
                    withSpan: node.sourceSpan,
                });
                if (nodeLocation !== null) {
                    nodeContext = {
                        shimPath: this.shimPath,
                        positionInShimFile: nodeLocation.getStart(),
                    };
                }
            }
            if (node instanceof compiler_2.PropertyRead && node.receiver instanceof compiler_2.ImplicitReceiver) {
                var nodeLocation = comments_1.findFirstMatchingNode(this.tcb, {
                    filter: ts.isPropertyAccessExpression,
                    withSpan: node.sourceSpan,
                });
                if (nodeLocation) {
                    nodeContext = {
                        shimPath: this.shimPath,
                        positionInShimFile: nodeLocation.getStart(),
                    };
                }
            }
            return {
                componentContext: this.componentContext,
                templateContext: templateContext,
                nodeContext: nodeContext,
            };
        };
        CompletionEngine.prototype.getExpressionCompletionLocation = function (expr) {
            if (this.expressionCompletionCache.has(expr)) {
                return this.expressionCompletionCache.get(expr);
            }
            // Completion works inside property reads and method calls.
            var tsExpr = null;
            if (expr instanceof compiler_2.PropertyRead || expr instanceof compiler_2.PropertyWrite) {
                // Non-safe navigation operations are trivial: `foo.bar` or `foo.bar()`
                tsExpr = comments_1.findFirstMatchingNode(this.tcb, {
                    filter: ts.isPropertyAccessExpression,
                    withSpan: expr.nameSpan,
                });
            }
            else if (expr instanceof compiler_2.SafePropertyRead) {
                // Safe navigation operations are a little more complex, and involve a ternary. Completion
                // happens in the "true" case of the ternary.
                var ternaryExpr = comments_1.findFirstMatchingNode(this.tcb, {
                    filter: ts.isParenthesizedExpression,
                    withSpan: expr.sourceSpan,
                });
                if (ternaryExpr === null || !ts.isConditionalExpression(ternaryExpr.expression)) {
                    return null;
                }
                var whenTrue = ternaryExpr.expression.whenTrue;
                if (ts.isPropertyAccessExpression(whenTrue)) {
                    tsExpr = whenTrue;
                }
                else if (ts.isCallExpression(whenTrue) && ts.isPropertyAccessExpression(whenTrue.expression)) {
                    tsExpr = whenTrue.expression;
                }
            }
            if (tsExpr === null) {
                return null;
            }
            var res = {
                shimPath: this.shimPath,
                positionInShimFile: tsExpr.name.getEnd(),
            };
            this.expressionCompletionCache.set(expr, res);
            return res;
        };
        CompletionEngine.prototype.getLiteralCompletionLocation = function (expr) {
            if (this.expressionCompletionCache.has(expr)) {
                return this.expressionCompletionCache.get(expr);
            }
            var tsExpr = null;
            if (expr instanceof r3_ast_1.TextAttribute) {
                var strNode = comments_1.findFirstMatchingNode(this.tcb, {
                    filter: ts.isParenthesizedExpression,
                    withSpan: expr.sourceSpan,
                });
                if (strNode !== null && ts.isStringLiteral(strNode.expression)) {
                    tsExpr = strNode.expression;
                }
            }
            else {
                tsExpr = comments_1.findFirstMatchingNode(this.tcb, {
                    filter: function (n) {
                        return ts.isStringLiteral(n) || ts.isNumericLiteral(n);
                    },
                    withSpan: expr.sourceSpan,
                });
            }
            if (tsExpr === null) {
                return null;
            }
            var positionInShimFile = tsExpr.getEnd();
            if (ts.isStringLiteral(tsExpr)) {
                // In the shimFile, if `tsExpr` is a string, the position should be in the quotes.
                positionInShimFile -= 1;
            }
            var res = {
                shimPath: this.shimPath,
                positionInShimFile: positionInShimFile,
            };
            this.expressionCompletionCache.set(expr, res);
            return res;
        };
        /**
         * Get global completions within the given template context - either a `TmplAstTemplate` embedded
         * view, or `null` for the root context.
         */
        CompletionEngine.prototype.getTemplateContextCompletions = function (context) {
            var e_1, _a;
            if (this.templateContextCache.has(context)) {
                return this.templateContextCache.get(context);
            }
            var templateContext = new Map();
            try {
                // The bound template already has details about the references and variables in scope in the
                // `context` template - they just need to be converted to `Completion`s.
                for (var _b = tslib_1.__values(this.data.boundTarget.getEntitiesInTemplateScope(context)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var node = _c.value;
                    if (node instanceof compiler_1.TmplAstReference) {
                        templateContext.set(node.name, {
                            kind: api_1.CompletionKind.Reference,
                            node: node,
                        });
                    }
                    else {
                        templateContext.set(node.name, {
                            kind: api_1.CompletionKind.Variable,
                            node: node,
                        });
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
            this.templateContextCache.set(context, templateContext);
            return templateContext;
        };
        return CompletionEngine;
    }());
    exports.CompletionEngine = CompletionEngine;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jb21wbGV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBb0U7SUFDcEUsMkRBQThKO0lBQzlKLCtEQUFtRTtJQUNuRSwrQkFBaUM7SUFHakMscUVBQStHO0lBRS9HLG1GQUF1RTtJQUd2RTs7Ozs7T0FLRztJQUNIO1FBY0UsMEJBQW9CLEdBQVksRUFBVSxJQUFrQixFQUFVLFFBQXdCO1lBQTFFLFFBQUcsR0FBSCxHQUFHLENBQVM7WUFBVSxTQUFJLEdBQUosSUFBSSxDQUFjO1lBQVUsYUFBUSxHQUFSLFFBQVEsQ0FBZ0I7WUFYOUY7OztlQUdHO1lBQ0sseUJBQW9CLEdBQ3hCLElBQUksR0FBRyxFQUE2RSxDQUFDO1lBRWpGLDhCQUF5QixHQUM3QixJQUFJLEdBQUcsRUFBOEUsQ0FBQztZQUl4Riw4RkFBOEY7WUFDOUYsSUFBTSxVQUFVLEdBQUcsZ0NBQXFCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtnQkFDakQsTUFBTSxFQUFFLEVBQUUsQ0FBQywwQkFBMEI7Z0JBQ3JDLHdCQUF3QixFQUFFLCtCQUFvQixDQUFDLG9CQUFvQjthQUNwRSxDQUFDLENBQUM7WUFFSCxJQUFJLFVBQVUsS0FBSyxJQUFJLEVBQUU7Z0JBQ3ZCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRztvQkFDdEIsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO29CQUN2QiwyRkFBMkY7b0JBQzNGLDBGQUEwRjtvQkFDMUYsNkJBQTZCO29CQUM3QixrQkFBa0IsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRTtpQkFDL0MsQ0FBQzthQUNIO2lCQUFNO2dCQUNMLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJ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Z0JBQ3hFLEtBQW1CLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBekUsSUFBTSxJQUFJLFdBQUE7b0JBQ2IsSUFBSSxJQUFJLFlBQVksMkJBQWdCLEVBQUU7d0JBQ3BDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTs0QkFDN0IsSUFBSSxFQUFFLG9CQUFjLENBQUMsU0FBUzs0QkFDOUIsSUFBSSxNQUFBO3lCQUNMLENBQUMsQ0FBQztxQkFDSjt5QkFBTTt3QkFDTCxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7NEJBQzdCLElBQUksRUFBRSxvQkFBYyxDQUFDLFFBQVE7NEJBQzdCLElBQUksTUFBQTt5QkFDTCxDQUFDLENBQUM7cUJBQ0o7aUJBQ0Y7Ozs7Ozs7OztZQUVELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1lBQ3hELE9BQU8sZUFBZSxDQUFDO1FBQ3pCLENBQUM7UUFDSCx1QkFBQztJQUFELENBQUMsQUE1TUQsSUE0TUM7SUE1TVksNENBQWdCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7VG1wbEFzdFJlZmVyZW5jZSwgVG1wbEFzdFRlbXBsYXRlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge0FTVCwgRW1wdHlFeHByLCBJbXBsaWNpdFJlY2VpdmVyLCBMaXRlcmFsUHJpbWl0aXZlLCBQcm9wZXJ0eVJlYWQsIFByb3BlcnR5V3JpdGUsIFNhZmVQcm9wZXJ0eVJlYWQsIFRtcGxBc3ROb2RlfSBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvY29tcGlsZXInO1xuaW1wb3J0IHtUZXh0QXR0cmlidXRlfSBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvcmVuZGVyMy9yM19hc3QnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7Q29tcGxldGlvbktpbmQsIEdsb2JhbENvbXBsZXRpb24sIFJlZmVyZW5jZUNvbXBsZXRpb24sIFNoaW1Mb2NhdGlvbiwgVmFyaWFibGVDb21wbGV0aW9ufSBmcm9tICcuLi9hcGknO1xuXG5pbXBvcnQge0V4cHJlc3Npb25JZGVudGlmaWVyLCBmaW5kRmlyc3RNYXRjaGluZ05vZGV9IGZyb20gJy4vY29tbWVudHMnO1xuaW1wb3J0IHtUZW1wbGF0ZURhdGF9IGZyb20gJy4vY29udGV4dCc7XG5cbi8qKlxuICogUG93ZXJzIGF1dG9jb21wbGV0aW9uIGZvciBhIHNwZWNpZmljIGNvbXBvbmVudC5cbiAqXG4gKiBJbnRlcm5hbGx5IGNhY2hlcyBhdXRvY29tcGxldGlvbiByZXN1bHRzLCBhbmQgbXVzdCBiZSBkaXNjYXJkZWQgaWYgdGhlIGNvbXBvbmVudCB0ZW1wbGF0ZSBvclxuICogc3Vycm91bmRpbmcgVFMgcHJvZ3JhbSBoYXZlIGNoYW5nZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb21wbGV0aW9uRW5naW5lIHtcbiAgcHJpdmF0ZSBjb21wb25lbnRDb250ZXh0OiBTaGltTG9jYXRpb258bnVsbDtcblxuICAvKipcbiAgICogQ2FjaGUgb2YgY29tcGxldGlvbnMgZm9yIHZhcmlvdXMgbGV2ZWxzIG9mIHRoZSB0ZW1wbGF0ZSwgaW5jbHVkaW5nIHRoZSByb290IHRlbXBsYXRlIChgbnVsbGApLlxuICAgKiBNZW1vaXplcyBgZ2V0VGVtcGxhdGVDb250ZXh0Q29tcGxldGlvbnNgLlxuICAgKi9cbiAgcHJpdmF0ZSB0ZW1wbGF0ZUNvbnRleHRDYWNoZSA9XG4gICAgICBuZXcgTWFwPFRtcGxBc3RUZW1wbGF0ZXxudWxsLCBNYXA8c3RyaW5nLCBSZWZlcmVuY2VDb21wbGV0aW9ufFZhcmlhYmxlQ29tcGxldGlvbj4+KCk7XG5cbiAgcHJpdmF0ZSBleHByZXNzaW9uQ29tcGxldGlvbkNhY2hlID1cbiAgICAgIG5ldyBNYXA8UHJvcGVydHlSZWFkfFNhZmVQcm9wZXJ0eVJlYWR8TGl0ZXJhbFByaW1pdGl2ZXxUZXh0QXR0cmlidXRlLCBTaGltTG9jYXRpb24+KCk7XG5cblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHRjYjogdHMuTm9kZSwgcHJpdmF0ZSBkYXRhOiBUZW1wbGF0ZURhdGEsIHByaXZhdGUgc2hpbVBhdGg6IEFic29sdXRlRnNQYXRoKSB7XG4gICAgLy8gRmluZCB0aGUgY29tcG9uZW50IGNvbXBsZXRpb24gZXhwcmVzc2lvbiB3aXRoaW4gdGhlIFRDQi4gVGhpcyBsb29rcyBsaWtlOiBgY3R4LiAvKiAuLi4gKi87YFxuICAgIGNvbnN0IGdsb2JhbFJlYWQgPSBmaW5kRmlyc3RNYXRjaGluZ05vZGUodGhpcy50Y2IsIHtcbiAgICAgIGZpbHRlcjogdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24sXG4gICAgICB3aXRoRXhwcmVzc2lvbklkZW50aWZpZXI6IEV4cHJlc3Npb25JZGVudGlmaWVyLkNPTVBPTkVOVF9DT01QTEVUSU9OXG4gICAgfSk7XG5cbiAgICBpZiAoZ2xvYmFsUmVhZCAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5jb21wb25lbnRDb250ZXh0ID0ge1xuICAgICAgICBzaGltUGF0aDogdGhpcy5zaGltUGF0aCxcbiAgICAgICAgLy8gYGdsb2JhbFJlYWQubmFtZWAgaXMgYW4gZW1wdHkgYHRzLklkZW50aWZpZXJgLCBzbyBpdHMgc3RhcnQgcG9zaXRpb24gaW1tZWRpYXRlbHkgZm9sbG93c1xuICAgICAgICAvLyB0aGUgYC5gIGluIGBjdHguYC4gVFMgYXV0b2NvbXBsZXRpb24gQVBJcyBjYW4gdGhlbiBiZSB1c2VkIHRvIGFjY2VzcyBjb21wbGV0aW9uIHJlc3VsdHNcbiAgICAgICAgLy8gZm9yIHRoZSBjb21wb25lbnQgY29udGV4dC5cbiAgICAgICAgcG9zaXRpb25JblNoaW1GaWxlOiBnbG9iYWxSZWFkLm5hbWUuZ2V0U3RhcnQoKSxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY29tcG9uZW50Q29udGV4dCA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCBnbG9iYWwgY29tcGxldGlvbnMgd2l0aGluIHRoZSBnaXZlbiB0ZW1wbGF0ZSBjb250ZXh0IGFuZCBBU1Qgbm9kZS5cbiAgICpcbiAgICogQHBhcmFtIGNvbnRleHQgdGhlIGdpdmVuIHRlbXBsYXRlIGNvbnRleHQgLSBlaXRoZXIgYSBgVG1wbEFzdFRlbXBsYXRlYCBlbWJlZGRlZCB2aWV3LCBvciBgbnVsbGBcbiAgICogICAgIGZvciB0aGUgcm9vdFxuICAgKiB0ZW1wbGF0ZSBjb250ZXh0LlxuICAgKiBAcGFyYW0gbm9kZSB0aGUgZ2l2ZW4gQVNUIG5vZGVcbiAgICovXG4gIGdldEdsb2JhbENvbXBsZXRpb25zKGNvbnRleHQ6IFRtcGxBc3RUZW1wbGF0ZXxudWxsLCBub2RlOiBBU1R8VG1wbEFzdE5vZGUpOiBHbG9iYWxDb21wbGV0aW9uXG4gICAgICB8bnVsbCB7XG4gICAgaWYgKHRoaXMuY29tcG9uZW50Q29udGV4dCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgdGVtcGxhdGVDb250ZXh0ID0gdGhpcy5nZXRUZW1wbGF0ZUNvbnRleHRDb21wbGV0aW9ucyhjb250ZXh0KTtcbiAgICBpZiAodGVtcGxhdGVDb250ZXh0ID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBsZXQgbm9kZUNvbnRleHQ6IFNoaW1Mb2NhdGlvbnxudWxsID0gbnVsbDtcbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIEVtcHR5RXhwcikge1xuICAgICAgY29uc3Qgbm9kZUxvY2F0aW9uID0gZmluZEZpcnN0TWF0Y2hpbmdOb2RlKHRoaXMudGNiLCB7XG4gICAgICAgIGZpbHRlcjogdHMuaXNJZGVudGlmaWVyLFxuICAgICAgICB3aXRoU3Bhbjogbm9kZS5zb3VyY2VTcGFuLFxuICAgICAgfSk7XG4gICAgICBpZiAobm9kZUxvY2F0aW9uICE9PSBudWxsKSB7XG4gICAgICAgIG5vZGVDb250ZXh0ID0ge1xuICAgICAgICAgIHNoaW1QYXRoOiB0aGlzLnNoaW1QYXRoLFxuICAgICAgICAgIHBvc2l0aW9uSW5TaGltRmlsZTogbm9kZUxvY2F0aW9uLmdldFN0YXJ0KCksXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBQcm9wZXJ0eVJlYWQgJiYgbm9kZS5yZWNlaXZlciBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIpIHtcbiAgICAgIGNvbnN0IG5vZGVMb2NhdGlvbiA9IGZpbmRGaXJzdE1hdGNoaW5nTm9kZSh0aGlzLnRjYiwge1xuICAgICAgICBmaWx0ZXI6IHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uLFxuICAgICAgICB3aXRoU3Bhbjogbm9kZS5zb3VyY2VTcGFuLFxuICAgICAgfSk7XG4gICAgICBpZiAobm9kZUxvY2F0aW9uKSB7XG4gICAgICAgIG5vZGVDb250ZXh0ID0ge1xuICAgICAgICAgIHNoaW1QYXRoOiB0aGlzLnNoaW1QYXRoLFxuICAgICAgICAgIHBvc2l0aW9uSW5TaGltRmlsZTogbm9kZUxvY2F0aW9uLmdldFN0YXJ0KCksXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGNvbXBvbmVudENvbnRleHQ6IHRoaXMuY29tcG9uZW50Q29udGV4dCxcbiAgICAgIHRlbXBsYXRlQ29udGV4dCxcbiAgICAgIG5vZGVDb250ZXh0LFxuICAgIH07XG4gIH1cblxuICBnZXRFeHByZXNzaW9uQ29tcGxldGlvbkxvY2F0aW9uKGV4cHI6IFByb3BlcnR5UmVhZHxQcm9wZXJ0eVdyaXRlfFNhZmVQcm9wZXJ0eVJlYWQpOiBTaGltTG9jYXRpb25cbiAgICAgIHxudWxsIHtcbiAgICBpZiAodGhpcy5leHByZXNzaW9uQ29tcGxldGlvbkNhY2hlLmhhcyhleHByKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZXhwcmVzc2lvbkNvbXBsZXRpb25DYWNoZS5nZXQoZXhwcikhO1xuICAgIH1cblxuICAgIC8vIENvbXBsZXRpb24gd29ya3MgaW5zaWRlIHByb3BlcnR5IHJlYWRzIGFuZCBtZXRob2QgY2FsbHMuXG4gICAgbGV0IHRzRXhwcjogdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGlmIChleHByIGluc3RhbmNlb2YgUHJvcGVydHlSZWFkIHx8IGV4cHIgaW5zdGFuY2VvZiBQcm9wZXJ0eVdyaXRlKSB7XG4gICAgICAvLyBOb24tc2FmZSBuYXZpZ2F0aW9uIG9wZXJhdGlvbnMgYXJlIHRyaXZpYWw6IGBmb28uYmFyYCBvciBgZm9vLmJhcigpYFxuICAgICAgdHNFeHByID0gZmluZEZpcnN0TWF0Y2hpbmdOb2RlKHRoaXMudGNiLCB7XG4gICAgICAgIGZpbHRlcjogdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24sXG4gICAgICAgIHdpdGhTcGFuOiBleHByLm5hbWVTcGFuLFxuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmIChleHByIGluc3RhbmNlb2YgU2FmZVByb3BlcnR5UmVhZCkge1xuICAgICAgLy8gU2FmZSBuYXZpZ2F0aW9uIG9wZXJhdGlvbnMgYXJlIGEgbGl0dGxlIG1vcmUgY29tcGxleCwgYW5kIGludm9sdmUgYSB0ZXJuYXJ5LiBDb21wbGV0aW9uXG4gICAgICAvLyBoYXBwZW5zIGluIHRoZSBcInRydWVcIiBjYXNlIG9mIHRoZSB0ZXJuYXJ5LlxuICAgICAgY29uc3QgdGVybmFyeUV4cHIgPSBmaW5kRmlyc3RNYXRjaGluZ05vZGUodGhpcy50Y2IsIHtcbiAgICAgICAgZmlsdGVyOiB0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uLFxuICAgICAgICB3aXRoU3BhbjogZXhwci5zb3VyY2VTcGFuLFxuICAgICAgfSk7XG4gICAgICBpZiAodGVybmFyeUV4cHIgPT09IG51bGwgfHwgIXRzLmlzQ29uZGl0aW9uYWxFeHByZXNzaW9uKHRlcm5hcnlFeHByLmV4cHJlc3Npb24pKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgY29uc3Qgd2hlblRydWUgPSB0ZXJuYXJ5RXhwci5leHByZXNzaW9uLndoZW5UcnVlO1xuXG4gICAgICBpZiAodHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24od2hlblRydWUpKSB7XG4gICAgICAgIHRzRXhwciA9IHdoZW5UcnVlO1xuICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICB0cy5pc0NhbGxFeHByZXNzaW9uKHdoZW5UcnVlKSAmJiB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbih3aGVuVHJ1ZS5leHByZXNzaW9uKSkge1xuICAgICAgICB0c0V4cHIgPSB3aGVuVHJ1ZS5leHByZXNzaW9uO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0c0V4cHIgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHJlczogU2hpbUxvY2F0aW9uID0ge1xuICAgICAgc2hpbVBhdGg6IHRoaXMuc2hpbVBhdGgsXG4gICAgICBwb3NpdGlvbkluU2hpbUZpbGU6IHRzRXhwci5uYW1lLmdldEVuZCgpLFxuICAgIH07XG4gICAgdGhpcy5leHByZXNzaW9uQ29tcGxldGlvbkNhY2hlLnNldChleHByLCByZXMpO1xuICAgIHJldHVybiByZXM7XG4gIH1cblxuICBnZXRMaXRlcmFsQ29tcGxldGlvbkxvY2F0aW9uKGV4cHI6IExpdGVyYWxQcmltaXRpdmV8VGV4dEF0dHJpYnV0ZSk6IFNoaW1Mb2NhdGlvbnxudWxsIHtcbiAgICBpZiAodGhpcy5leHByZXNzaW9uQ29tcGxldGlvbkNhY2hlLmhhcyhleHByKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZXhwcmVzc2lvbkNvbXBsZXRpb25DYWNoZS5nZXQoZXhwcikhO1xuICAgIH1cblxuICAgIGxldCB0c0V4cHI6IHRzLlN0cmluZ0xpdGVyYWx8dHMuTnVtZXJpY0xpdGVyYWx8bnVsbCA9IG51bGw7XG5cbiAgICBpZiAoZXhwciBpbnN0YW5jZW9mIFRleHRBdHRyaWJ1dGUpIHtcbiAgICAgIGNvbnN0IHN0ck5vZGUgPSBmaW5kRmlyc3RNYXRjaGluZ05vZGUodGhpcy50Y2IsIHtcbiAgICAgICAgZmlsdGVyOiB0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uLFxuICAgICAgICB3aXRoU3BhbjogZXhwci5zb3VyY2VTcGFuLFxuICAgICAgfSk7XG4gICAgICBpZiAoc3RyTm9kZSAhPT0gbnVsbCAmJiB0cy5pc1N0cmluZ0xpdGVyYWwoc3RyTm9kZS5leHByZXNzaW9uKSkge1xuICAgICAgICB0c0V4cHIgPSBzdHJOb2RlLmV4cHJlc3Npb247XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRzRXhwciA9IGZpbmRGaXJzdE1hdGNoaW5nTm9kZSh0aGlzLnRjYiwge1xuICAgICAgICBmaWx0ZXI6IChuOiB0cy5Ob2RlKTogbiBpcyB0cy5OdW1lcmljTGl0ZXJhbCB8IHRzLlN0cmluZ0xpdGVyYWwgPT5cbiAgICAgICAgICAgIHRzLmlzU3RyaW5nTGl0ZXJhbChuKSB8fCB0cy5pc051bWVyaWNMaXRlcmFsKG4pLFxuICAgICAgICB3aXRoU3BhbjogZXhwci5zb3VyY2VTcGFuLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRzRXhwciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgbGV0IHBvc2l0aW9uSW5TaGltRmlsZSA9IHRzRXhwci5nZXRFbmQoKTtcbiAgICBpZiAodHMuaXNTdHJpbmdMaXRlcmFsKHRzRXhwcikpIHtcbiAgICAgIC8vIEluIHRoZSBzaGltRmlsZSwgaWYgYHRzRXhwcmAgaXMgYSBzdHJpbmcsIHRoZSBwb3NpdGlvbiBzaG91bGQgYmUgaW4gdGhlIHF1b3Rlcy5cbiAgICAgIHBvc2l0aW9uSW5TaGltRmlsZSAtPSAxO1xuICAgIH1cbiAgICBjb25zdCByZXM6IFNoaW1Mb2NhdGlvbiA9IHtcbiAgICAgIHNoaW1QYXRoOiB0aGlzLnNoaW1QYXRoLFxuICAgICAgcG9zaXRpb25JblNoaW1GaWxlLFxuICAgIH07XG4gICAgdGhpcy5leHByZXNzaW9uQ29tcGxldGlvbkNhY2hlLnNldChleHByLCByZXMpO1xuICAgIHJldHVybiByZXM7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGdsb2JhbCBjb21wbGV0aW9ucyB3aXRoaW4gdGhlIGdpdmVuIHRlbXBsYXRlIGNvbnRleHQgLSBlaXRoZXIgYSBgVG1wbEFzdFRlbXBsYXRlYCBlbWJlZGRlZFxuICAgKiB2aWV3LCBvciBgbnVsbGAgZm9yIHRoZSByb290IGNvbnRleHQuXG4gICAqL1xuICBwcml2YXRlIGdldFRlbXBsYXRlQ29udGV4dENvbXBsZXRpb25zKGNvbnRleHQ6IFRtcGxBc3RUZW1wbGF0ZXxudWxsKTpcbiAgICAgIE1hcDxzdHJpbmcsIFJlZmVyZW5jZUNvbXBsZXRpb258VmFyaWFibGVDb21wbGV0aW9uPnxudWxsIHtcbiAgICBpZiAodGhpcy50ZW1wbGF0ZUNvbnRleHRDYWNoZS5oYXMoY29udGV4dCkpIHtcbiAgICAgIHJldHVybiB0aGlzLnRlbXBsYXRlQ29udGV4dENhY2hlLmdldChjb250ZXh0KSE7XG4gICAgfVxuXG4gICAgY29uc3QgdGVtcGxhdGVDb250ZXh0ID0gbmV3IE1hcDxzdHJpbmcsIFJlZmVyZW5jZUNvbXBsZXRpb258VmFyaWFibGVDb21wbGV0aW9uPigpO1xuXG4gICAgLy8gVGhlIGJvdW5kIHRlbXBsYXRlIGFscmVhZHkgaGFzIGRldGFpbHMgYWJvdXQgdGhlIHJlZmVyZW5jZXMgYW5kIHZhcmlhYmxlcyBpbiBzY29wZSBpbiB0aGVcbiAgICAvLyBgY29udGV4dGAgdGVtcGxhdGUgLSB0aGV5IGp1c3QgbmVlZCB0byBiZSBjb252ZXJ0ZWQgdG8gYENvbXBsZXRpb25gcy5cbiAgICBmb3IgKGNvbnN0IG5vZGUgb2YgdGhpcy5kYXRhLmJvdW5kVGFyZ2V0LmdldEVudGl0aWVzSW5UZW1wbGF0ZVNjb3BlKGNvbnRleHQpKSB7XG4gICAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RSZWZlcmVuY2UpIHtcbiAgICAgICAgdGVtcGxhdGVDb250ZXh0LnNldChub2RlLm5hbWUsIHtcbiAgICAgICAgICBraW5kOiBDb21wbGV0aW9uS2luZC5SZWZlcmVuY2UsXG4gICAgICAgICAgbm9kZSxcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0ZW1wbGF0ZUNvbnRleHQuc2V0KG5vZGUubmFtZSwge1xuICAgICAgICAgIGtpbmQ6IENvbXBsZXRpb25LaW5kLlZhcmlhYmxlLFxuICAgICAgICAgIG5vZGUsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMudGVtcGxhdGVDb250ZXh0Q2FjaGUuc2V0KGNvbnRleHQsIHRlbXBsYXRlQ29udGV4dCk7XG4gICAgcmV0dXJuIHRlbXBsYXRlQ29udGV4dDtcbiAgfVxufVxuIl19