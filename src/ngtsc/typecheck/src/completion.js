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
            var globalRead = (0, comments_1.findFirstMatchingNode)(this.tcb, {
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
                var nodeLocation = (0, comments_1.findFirstMatchingNode)(this.tcb, {
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
                var nodeLocation = (0, comments_1.findFirstMatchingNode)(this.tcb, {
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
                tsExpr = (0, comments_1.findFirstMatchingNode)(this.tcb, {
                    filter: ts.isPropertyAccessExpression,
                    withSpan: expr.nameSpan,
                });
            }
            else if (expr instanceof compiler_2.SafePropertyRead) {
                // Safe navigation operations are a little more complex, and involve a ternary. Completion
                // happens in the "true" case of the ternary.
                var ternaryExpr = (0, comments_1.findFirstMatchingNode)(this.tcb, {
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
                var strNode = (0, comments_1.findFirstMatchingNode)(this.tcb, {
                    filter: ts.isParenthesizedExpression,
                    withSpan: expr.sourceSpan,
                });
                if (strNode !== null && ts.isStringLiteral(strNode.expression)) {
                    tsExpr = strNode.expression;
                }
            }
            else {
                tsExpr = (0, comments_1.findFirstMatchingNode)(this.tcb, {
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
                for (var _b = (0, tslib_1.__values)(this.data.boundTarget.getEntitiesInTemplateScope(context)), _c = _b.next(); !_c.done; _c = _b.next()) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jb21wbGV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBb0U7SUFDcEUsMkRBQThKO0lBQzlKLCtEQUFtRTtJQUNuRSwrQkFBaUM7SUFHakMscUVBQStHO0lBRS9HLG1GQUF1RTtJQUd2RTs7Ozs7T0FLRztJQUNIO1FBY0UsMEJBQW9CLEdBQVksRUFBVSxJQUFrQixFQUFVLFFBQXdCO1lBQTFFLFFBQUcsR0FBSCxHQUFHLENBQVM7WUFBVSxTQUFJLEdBQUosSUFBSSxDQUFjO1lBQVUsYUFBUSxHQUFSLFFBQVEsQ0FBZ0I7WUFYOUY7OztlQUdHO1lBQ0sseUJBQW9CLEdBQ3hCLElBQUksR0FBRyxFQUE2RSxDQUFDO1lBRWpGLDhCQUF5QixHQUM3QixJQUFJLEdBQUcsRUFBOEUsQ0FBQztZQUl4Riw4RkFBOEY7WUFDOUYsSUFBTSxVQUFVLEdBQUcsSUFBQSxnQ0FBcUIsRUFBQyxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUNqRCxNQUFNLEVBQUUsRUFBRSxDQUFDLDBCQUEwQjtnQkFDckMsd0JBQXdCLEVBQUUsK0JBQW9CLENBQUMsb0JBQW9CO2FBQ3BFLENBQUMsQ0FBQztZQUVILElBQUksVUFBVSxLQUFLLElBQUksRUFBRTtnQkFDdkIsSUFBSSxDQUFDLGdCQUFnQixHQUFHO29CQUN0QixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7b0JBQ3ZCLDJGQUEyRjtvQkFDM0YsMEZBQTBGO29CQUMxRiw2QkFBNkI7b0JBQzdCLGtCQUFrQixFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFO2lCQUMvQyxDQUFDO2FBQ0g7aUJBQU07Z0JBQ0wsSUFBSSxDQUFDLGdCQUFnQixHQUFH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LENBQUM7O2dCQUVsRiw0RkFBNEY7Z0JBQzVGLHdFQUF3RTtnQkFDeEUsS0FBbUIsSUFBQSxLQUFBLHNCQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxDQUFBLGdCQUFBLDRCQUFFO29CQUF6RSxJQUFNLElBQUksV0FBQTtvQkFDYixJQUFJLElBQUksWUFBWSwyQkFBZ0IsRUFBRTt3QkFDcEMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFOzRCQUM3QixJQUFJLEVBQUUsb0JBQWMsQ0FBQyxTQUFTOzRCQUM5QixJQUFJLE1BQUE7eUJBQ0wsQ0FBQyxDQUFDO3FCQUNKO3lCQUFNO3dCQUNMLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTs0QkFDN0IsSUFBSSxFQUFFLG9CQUFjLENBQUMsUUFBUTs0QkFDN0IsSUFBSSxNQUFBO3lCQUNMLENBQUMsQ0FBQztxQkFDSjtpQkFDRjs7Ozs7Ozs7O1lBRUQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUM7WUFDeEQsT0FBTyxlQUFlLENBQUM7UUFDekIsQ0FBQztRQUNILHVCQUFDO0lBQUQsQ0FBQyxBQTVNRCxJQTRNQztJQTVNWSw0Q0FBZ0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtUbXBsQXN0UmVmZXJlbmNlLCBUbXBsQXN0VGVtcGxhdGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7QVNULCBFbXB0eUV4cHIsIEltcGxpY2l0UmVjZWl2ZXIsIExpdGVyYWxQcmltaXRpdmUsIFByb3BlcnR5UmVhZCwgUHJvcGVydHlXcml0ZSwgU2FmZVByb3BlcnR5UmVhZCwgVG1wbEFzdE5vZGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9jb21waWxlcic7XG5pbXBvcnQge1RleHRBdHRyaWJ1dGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9yZW5kZXIzL3IzX2FzdCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtDb21wbGV0aW9uS2luZCwgR2xvYmFsQ29tcGxldGlvbiwgUmVmZXJlbmNlQ29tcGxldGlvbiwgU2hpbUxvY2F0aW9uLCBWYXJpYWJsZUNvbXBsZXRpb259IGZyb20gJy4uL2FwaSc7XG5cbmltcG9ydCB7RXhwcmVzc2lvbklkZW50aWZpZXIsIGZpbmRGaXJzdE1hdGNoaW5nTm9kZX0gZnJvbSAnLi9jb21tZW50cyc7XG5pbXBvcnQge1RlbXBsYXRlRGF0YX0gZnJvbSAnLi9jb250ZXh0JztcblxuLyoqXG4gKiBQb3dlcnMgYXV0b2NvbXBsZXRpb24gZm9yIGEgc3BlY2lmaWMgY29tcG9uZW50LlxuICpcbiAqIEludGVybmFsbHkgY2FjaGVzIGF1dG9jb21wbGV0aW9uIHJlc3VsdHMsIGFuZCBtdXN0IGJlIGRpc2NhcmRlZCBpZiB0aGUgY29tcG9uZW50IHRlbXBsYXRlIG9yXG4gKiBzdXJyb3VuZGluZyBUUyBwcm9ncmFtIGhhdmUgY2hhbmdlZC5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbXBsZXRpb25FbmdpbmUge1xuICBwcml2YXRlIGNvbXBvbmVudENvbnRleHQ6IFNoaW1Mb2NhdGlvbnxudWxsO1xuXG4gIC8qKlxuICAgKiBDYWNoZSBvZiBjb21wbGV0aW9ucyBmb3IgdmFyaW91cyBsZXZlbHMgb2YgdGhlIHRlbXBsYXRlLCBpbmNsdWRpbmcgdGhlIHJvb3QgdGVtcGxhdGUgKGBudWxsYCkuXG4gICAqIE1lbW9pemVzIGBnZXRUZW1wbGF0ZUNvbnRleHRDb21wbGV0aW9uc2AuXG4gICAqL1xuICBwcml2YXRlIHRlbXBsYXRlQ29udGV4dENhY2hlID1cbiAgICAgIG5ldyBNYXA8VG1wbEFzdFRlbXBsYXRlfG51bGwsIE1hcDxzdHJpbmcsIFJlZmVyZW5jZUNvbXBsZXRpb258VmFyaWFibGVDb21wbGV0aW9uPj4oKTtcblxuICBwcml2YXRlIGV4cHJlc3Npb25Db21wbGV0aW9uQ2FjaGUgPVxuICAgICAgbmV3IE1hcDxQcm9wZXJ0eVJlYWR8U2FmZVByb3BlcnR5UmVhZHxMaXRlcmFsUHJpbWl0aXZlfFRleHRBdHRyaWJ1dGUsIFNoaW1Mb2NhdGlvbj4oKTtcblxuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGNiOiB0cy5Ob2RlLCBwcml2YXRlIGRhdGE6IFRlbXBsYXRlRGF0YSwgcHJpdmF0ZSBzaGltUGF0aDogQWJzb2x1dGVGc1BhdGgpIHtcbiAgICAvLyBGaW5kIHRoZSBjb21wb25lbnQgY29tcGxldGlvbiBleHByZXNzaW9uIHdpdGhpbiB0aGUgVENCLiBUaGlzIGxvb2tzIGxpa2U6IGBjdHguIC8qIC4uLiAqLztgXG4gICAgY29uc3QgZ2xvYmFsUmVhZCA9IGZpbmRGaXJzdE1hdGNoaW5nTm9kZSh0aGlzLnRjYiwge1xuICAgICAgZmlsdGVyOiB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbixcbiAgICAgIHdpdGhFeHByZXNzaW9uSWRlbnRpZmllcjogRXhwcmVzc2lvbklkZW50aWZpZXIuQ09NUE9ORU5UX0NPTVBMRVRJT05cbiAgICB9KTtcblxuICAgIGlmIChnbG9iYWxSZWFkICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmNvbXBvbmVudENvbnRleHQgPSB7XG4gICAgICAgIHNoaW1QYXRoOiB0aGlzLnNoaW1QYXRoLFxuICAgICAgICAvLyBgZ2xvYmFsUmVhZC5uYW1lYCBpcyBhbiBlbXB0eSBgdHMuSWRlbnRpZmllcmAsIHNvIGl0cyBzdGFydCBwb3NpdGlvbiBpbW1lZGlhdGVseSBmb2xsb3dzXG4gICAgICAgIC8vIHRoZSBgLmAgaW4gYGN0eC5gLiBUUyBhdXRvY29tcGxldGlvbiBBUElzIGNhbiB0aGVuIGJlIHVzZWQgdG8gYWNjZXNzIGNvbXBsZXRpb24gcmVzdWx0c1xuICAgICAgICAvLyBmb3IgdGhlIGNvbXBvbmVudCBjb250ZXh0LlxuICAgICAgICBwb3NpdGlvbkluU2hpbUZpbGU6IGdsb2JhbFJlYWQubmFtZS5nZXRTdGFydCgpLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb21wb25lbnRDb250ZXh0ID0gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0IGdsb2JhbCBjb21wbGV0aW9ucyB3aXRoaW4gdGhlIGdpdmVuIHRlbXBsYXRlIGNvbnRleHQgYW5kIEFTVCBub2RlLlxuICAgKlxuICAgKiBAcGFyYW0gY29udGV4dCB0aGUgZ2l2ZW4gdGVtcGxhdGUgY29udGV4dCAtIGVpdGhlciBhIGBUbXBsQXN0VGVtcGxhdGVgIGVtYmVkZGVkIHZpZXcsIG9yIGBudWxsYFxuICAgKiAgICAgZm9yIHRoZSByb290XG4gICAqIHRlbXBsYXRlIGNvbnRleHQuXG4gICAqIEBwYXJhbSBub2RlIHRoZSBnaXZlbiBBU1Qgbm9kZVxuICAgKi9cbiAgZ2V0R2xvYmFsQ29tcGxldGlvbnMoY29udGV4dDogVG1wbEFzdFRlbXBsYXRlfG51bGwsIG5vZGU6IEFTVHxUbXBsQXN0Tm9kZSk6IEdsb2JhbENvbXBsZXRpb25cbiAgICAgIHxudWxsIHtcbiAgICBpZiAodGhpcy5jb21wb25lbnRDb250ZXh0ID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCB0ZW1wbGF0ZUNvbnRleHQgPSB0aGlzLmdldFRlbXBsYXRlQ29udGV4dENvbXBsZXRpb25zKGNvbnRleHQpO1xuICAgIGlmICh0ZW1wbGF0ZUNvbnRleHQgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGxldCBub2RlQ29udGV4dDogU2hpbUxvY2F0aW9ufG51bGwgPSBudWxsO1xuICAgIGlmIChub2RlIGluc3RhbmNlb2YgRW1wdHlFeHByKSB7XG4gICAgICBjb25zdCBub2RlTG9jYXRpb24gPSBmaW5kRmlyc3RNYXRjaGluZ05vZGUodGhpcy50Y2IsIHtcbiAgICAgICAgZmlsdGVyOiB0cy5pc0lkZW50aWZpZXIsXG4gICAgICAgIHdpdGhTcGFuOiBub2RlLnNvdXJjZVNwYW4sXG4gICAgICB9KTtcbiAgICAgIGlmIChub2RlTG9jYXRpb24gIT09IG51bGwpIHtcbiAgICAgICAgbm9kZUNvbnRleHQgPSB7XG4gICAgICAgICAgc2hpbVBhdGg6IHRoaXMuc2hpbVBhdGgsXG4gICAgICAgICAgcG9zaXRpb25JblNoaW1GaWxlOiBub2RlTG9jYXRpb24uZ2V0U3RhcnQoKSxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFByb3BlcnR5UmVhZCAmJiBub2RlLnJlY2VpdmVyIGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlcikge1xuICAgICAgY29uc3Qgbm9kZUxvY2F0aW9uID0gZmluZEZpcnN0TWF0Y2hpbmdOb2RlKHRoaXMudGNiLCB7XG4gICAgICAgIGZpbHRlcjogdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24sXG4gICAgICAgIHdpdGhTcGFuOiBub2RlLnNvdXJjZVNwYW4sXG4gICAgICB9KTtcbiAgICAgIGlmIChub2RlTG9jYXRpb24pIHtcbiAgICAgICAgbm9kZUNvbnRleHQgPSB7XG4gICAgICAgICAgc2hpbVBhdGg6IHRoaXMuc2hpbVBhdGgsXG4gICAgICAgICAgcG9zaXRpb25JblNoaW1GaWxlOiBub2RlTG9jYXRpb24uZ2V0U3RhcnQoKSxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgY29tcG9uZW50Q29udGV4dDogdGhpcy5jb21wb25lbnRDb250ZXh0LFxuICAgICAgdGVtcGxhdGVDb250ZXh0LFxuICAgICAgbm9kZUNvbnRleHQsXG4gICAgfTtcbiAgfVxuXG4gIGdldEV4cHJlc3Npb25Db21wbGV0aW9uTG9jYXRpb24oZXhwcjogUHJvcGVydHlSZWFkfFByb3BlcnR5V3JpdGV8U2FmZVByb3BlcnR5UmVhZCk6IFNoaW1Mb2NhdGlvblxuICAgICAgfG51bGwge1xuICAgIGlmICh0aGlzLmV4cHJlc3Npb25Db21wbGV0aW9uQ2FjaGUuaGFzKGV4cHIpKSB7XG4gICAgICByZXR1cm4gdGhpcy5leHByZXNzaW9uQ29tcGxldGlvbkNhY2hlLmdldChleHByKSE7XG4gICAgfVxuXG4gICAgLy8gQ29tcGxldGlvbiB3b3JrcyBpbnNpZGUgcHJvcGVydHkgcmVhZHMgYW5kIG1ldGhvZCBjYWxscy5cbiAgICBsZXQgdHNFeHByOiB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgaWYgKGV4cHIgaW5zdGFuY2VvZiBQcm9wZXJ0eVJlYWQgfHwgZXhwciBpbnN0YW5jZW9mIFByb3BlcnR5V3JpdGUpIHtcbiAgICAgIC8vIE5vbi1zYWZlIG5hdmlnYXRpb24gb3BlcmF0aW9ucyBhcmUgdHJpdmlhbDogYGZvby5iYXJgIG9yIGBmb28uYmFyKClgXG4gICAgICB0c0V4cHIgPSBmaW5kRmlyc3RNYXRjaGluZ05vZGUodGhpcy50Y2IsIHtcbiAgICAgICAgZmlsdGVyOiB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbixcbiAgICAgICAgd2l0aFNwYW46IGV4cHIubmFtZVNwYW4sXG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKGV4cHIgaW5zdGFuY2VvZiBTYWZlUHJvcGVydHlSZWFkKSB7XG4gICAgICAvLyBTYWZlIG5hdmlnYXRpb24gb3BlcmF0aW9ucyBhcmUgYSBsaXR0bGUgbW9yZSBjb21wbGV4LCBhbmQgaW52b2x2ZSBhIHRlcm5hcnkuIENvbXBsZXRpb25cbiAgICAgIC8vIGhhcHBlbnMgaW4gdGhlIFwidHJ1ZVwiIGNhc2Ugb2YgdGhlIHRlcm5hcnkuXG4gICAgICBjb25zdCB0ZXJuYXJ5RXhwciA9IGZpbmRGaXJzdE1hdGNoaW5nTm9kZSh0aGlzLnRjYiwge1xuICAgICAgICBmaWx0ZXI6IHRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24sXG4gICAgICAgIHdpdGhTcGFuOiBleHByLnNvdXJjZVNwYW4sXG4gICAgICB9KTtcbiAgICAgIGlmICh0ZXJuYXJ5RXhwciA9PT0gbnVsbCB8fCAhdHMuaXNDb25kaXRpb25hbEV4cHJlc3Npb24odGVybmFyeUV4cHIuZXhwcmVzc2lvbikpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICBjb25zdCB3aGVuVHJ1ZSA9IHRlcm5hcnlFeHByLmV4cHJlc3Npb24ud2hlblRydWU7XG5cbiAgICAgIGlmICh0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbih3aGVuVHJ1ZSkpIHtcbiAgICAgICAgdHNFeHByID0gd2hlblRydWU7XG4gICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgIHRzLmlzQ2FsbEV4cHJlc3Npb24od2hlblRydWUpICYmIHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKHdoZW5UcnVlLmV4cHJlc3Npb24pKSB7XG4gICAgICAgIHRzRXhwciA9IHdoZW5UcnVlLmV4cHJlc3Npb247XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRzRXhwciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzOiBTaGltTG9jYXRpb24gPSB7XG4gICAgICBzaGltUGF0aDogdGhpcy5zaGltUGF0aCxcbiAgICAgIHBvc2l0aW9uSW5TaGltRmlsZTogdHNFeHByLm5hbWUuZ2V0RW5kKCksXG4gICAgfTtcbiAgICB0aGlzLmV4cHJlc3Npb25Db21wbGV0aW9uQ2FjaGUuc2V0KGV4cHIsIHJlcyk7XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIGdldExpdGVyYWxDb21wbGV0aW9uTG9jYXRpb24oZXhwcjogTGl0ZXJhbFByaW1pdGl2ZXxUZXh0QXR0cmlidXRlKTogU2hpbUxvY2F0aW9ufG51bGwge1xuICAgIGlmICh0aGlzLmV4cHJlc3Npb25Db21wbGV0aW9uQ2FjaGUuaGFzKGV4cHIpKSB7XG4gICAgICByZXR1cm4gdGhpcy5leHByZXNzaW9uQ29tcGxldGlvbkNhY2hlLmdldChleHByKSE7XG4gICAgfVxuXG4gICAgbGV0IHRzRXhwcjogdHMuU3RyaW5nTGl0ZXJhbHx0cy5OdW1lcmljTGl0ZXJhbHxudWxsID0gbnVsbDtcblxuICAgIGlmIChleHByIGluc3RhbmNlb2YgVGV4dEF0dHJpYnV0ZSkge1xuICAgICAgY29uc3Qgc3RyTm9kZSA9IGZpbmRGaXJzdE1hdGNoaW5nTm9kZSh0aGlzLnRjYiwge1xuICAgICAgICBmaWx0ZXI6IHRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24sXG4gICAgICAgIHdpdGhTcGFuOiBleHByLnNvdXJjZVNwYW4sXG4gICAgICB9KTtcbiAgICAgIGlmIChzdHJOb2RlICE9PSBudWxsICYmIHRzLmlzU3RyaW5nTGl0ZXJhbChzdHJOb2RlLmV4cHJlc3Npb24pKSB7XG4gICAgICAgIHRzRXhwciA9IHN0ck5vZGUuZXhwcmVzc2lvbjtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdHNFeHByID0gZmluZEZpcnN0TWF0Y2hpbmdOb2RlKHRoaXMudGNiLCB7XG4gICAgICAgIGZpbHRlcjogKG46IHRzLk5vZGUpOiBuIGlzIHRzLk51bWVyaWNMaXRlcmFsIHwgdHMuU3RyaW5nTGl0ZXJhbCA9PlxuICAgICAgICAgICAgdHMuaXNTdHJpbmdMaXRlcmFsKG4pIHx8IHRzLmlzTnVtZXJpY0xpdGVyYWwobiksXG4gICAgICAgIHdpdGhTcGFuOiBleHByLnNvdXJjZVNwYW4sXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAodHNFeHByID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBsZXQgcG9zaXRpb25JblNoaW1GaWxlID0gdHNFeHByLmdldEVuZCgpO1xuICAgIGlmICh0cy5pc1N0cmluZ0xpdGVyYWwodHNFeHByKSkge1xuICAgICAgLy8gSW4gdGhlIHNoaW1GaWxlLCBpZiBgdHNFeHByYCBpcyBhIHN0cmluZywgdGhlIHBvc2l0aW9uIHNob3VsZCBiZSBpbiB0aGUgcXVvdGVzLlxuICAgICAgcG9zaXRpb25JblNoaW1GaWxlIC09IDE7XG4gICAgfVxuICAgIGNvbnN0IHJlczogU2hpbUxvY2F0aW9uID0ge1xuICAgICAgc2hpbVBhdGg6IHRoaXMuc2hpbVBhdGgsXG4gICAgICBwb3NpdGlvbkluU2hpbUZpbGUsXG4gICAgfTtcbiAgICB0aGlzLmV4cHJlc3Npb25Db21wbGV0aW9uQ2FjaGUuc2V0KGV4cHIsIHJlcyk7XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgZ2xvYmFsIGNvbXBsZXRpb25zIHdpdGhpbiB0aGUgZ2l2ZW4gdGVtcGxhdGUgY29udGV4dCAtIGVpdGhlciBhIGBUbXBsQXN0VGVtcGxhdGVgIGVtYmVkZGVkXG4gICAqIHZpZXcsIG9yIGBudWxsYCBmb3IgdGhlIHJvb3QgY29udGV4dC5cbiAgICovXG4gIHByaXZhdGUgZ2V0VGVtcGxhdGVDb250ZXh0Q29tcGxldGlvbnMoY29udGV4dDogVG1wbEFzdFRlbXBsYXRlfG51bGwpOlxuICAgICAgTWFwPHN0cmluZywgUmVmZXJlbmNlQ29tcGxldGlvbnxWYXJpYWJsZUNvbXBsZXRpb24+fG51bGwge1xuICAgIGlmICh0aGlzLnRlbXBsYXRlQ29udGV4dENhY2hlLmhhcyhjb250ZXh0KSkge1xuICAgICAgcmV0dXJuIHRoaXMudGVtcGxhdGVDb250ZXh0Q2FjaGUuZ2V0KGNvbnRleHQpITtcbiAgICB9XG5cbiAgICBjb25zdCB0ZW1wbGF0ZUNvbnRleHQgPSBuZXcgTWFwPHN0cmluZywgUmVmZXJlbmNlQ29tcGxldGlvbnxWYXJpYWJsZUNvbXBsZXRpb24+KCk7XG5cbiAgICAvLyBUaGUgYm91bmQgdGVtcGxhdGUgYWxyZWFkeSBoYXMgZGV0YWlscyBhYm91dCB0aGUgcmVmZXJlbmNlcyBhbmQgdmFyaWFibGVzIGluIHNjb3BlIGluIHRoZVxuICAgIC8vIGBjb250ZXh0YCB0ZW1wbGF0ZSAtIHRoZXkganVzdCBuZWVkIHRvIGJlIGNvbnZlcnRlZCB0byBgQ29tcGxldGlvbmBzLlxuICAgIGZvciAoY29uc3Qgbm9kZSBvZiB0aGlzLmRhdGEuYm91bmRUYXJnZXQuZ2V0RW50aXRpZXNJblRlbXBsYXRlU2NvcGUoY29udGV4dCkpIHtcbiAgICAgIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdFJlZmVyZW5jZSkge1xuICAgICAgICB0ZW1wbGF0ZUNvbnRleHQuc2V0KG5vZGUubmFtZSwge1xuICAgICAgICAgIGtpbmQ6IENvbXBsZXRpb25LaW5kLlJlZmVyZW5jZSxcbiAgICAgICAgICBub2RlLFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRlbXBsYXRlQ29udGV4dC5zZXQobm9kZS5uYW1lLCB7XG4gICAgICAgICAga2luZDogQ29tcGxldGlvbktpbmQuVmFyaWFibGUsXG4gICAgICAgICAgbm9kZSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy50ZW1wbGF0ZUNvbnRleHRDYWNoZS5zZXQoY29udGV4dCwgdGVtcGxhdGVDb250ZXh0KTtcbiAgICByZXR1cm4gdGVtcGxhdGVDb250ZXh0O1xuICB9XG59XG4iXX0=