/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
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
        define("@angular/compiler-cli/src/ngtsc/indexer/src/template", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler/src/render3/r3_ast", "@angular/compiler-cli/src/ngtsc/indexer/src/api"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var r3_ast_1 = require("@angular/compiler/src/render3/r3_ast");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/indexer/src/api");
    /**
     * Visits the AST of an Angular template syntax expression, finding interesting
     * entities (variable references, etc.). Creates an array of Entities found in
     * the expression, with the location of the Entities being relative to the
     * expression.
     *
     * Visiting `text {{prop}}` will return
     * `[TopLevelIdentifier {name: 'prop', span: {start: 7, end: 11}}]`.
     */
    var ExpressionVisitor = /** @class */ (function (_super) {
        tslib_1.__extends(ExpressionVisitor, _super);
        function ExpressionVisitor(context, boundTemplate, expressionStr, absoluteOffset) {
            if (expressionStr === void 0) { expressionStr = context.sourceSpan.toString(); }
            if (absoluteOffset === void 0) { absoluteOffset = context.sourceSpan.start.offset; }
            var _this = _super.call(this) || this;
            _this.boundTemplate = boundTemplate;
            _this.expressionStr = expressionStr;
            _this.absoluteOffset = absoluteOffset;
            _this.identifiers = [];
            return _this;
        }
        /**
         * Returns identifiers discovered in an expression.
         *
         * @param ast expression AST to visit
         * @param context HTML node expression is defined in
         * @param boundTemplate bound target of the entire template, which can be used to query for the
         * entities expressions target.
         */
        ExpressionVisitor.getIdentifiers = function (ast, context, boundTemplate) {
            var visitor = new ExpressionVisitor(context, boundTemplate);
            visitor.visit(ast);
            return visitor.identifiers;
        };
        ExpressionVisitor.prototype.visit = function (ast) { ast.visit(this); };
        ExpressionVisitor.prototype.visitMethodCall = function (ast, context) {
            this.visitIdentifier(ast, api_1.IdentifierKind.Method);
            _super.prototype.visitMethodCall.call(this, ast, context);
        };
        ExpressionVisitor.prototype.visitPropertyRead = function (ast, context) {
            this.visitIdentifier(ast, api_1.IdentifierKind.Property);
            _super.prototype.visitPropertyRead.call(this, ast, context);
        };
        /**
         * Visits an identifier, adding it to the identifier store if it is useful for indexing.
         *
         * @param ast expression AST the identifier is in
         * @param kind identifier kind
         */
        ExpressionVisitor.prototype.visitIdentifier = function (ast, kind) {
            // The definition of a non-top-level property such as `bar` in `{{foo.bar}}` is currently
            // impossible to determine by an indexer and unsupported by the indexing module.
            // The indexing module also does not currently support references to identifiers declared in the
            // template itself, which have a non-null expression target.
            if (!(ast.receiver instanceof compiler_1.ImplicitReceiver) ||
                this.boundTemplate.getExpressionTarget(ast) !== null) {
                return;
            }
            // Get the location of the identifier of real interest.
            // The compiler's expression parser records the location of some expressions in a manner not
            // useful to the indexer. For example, a `MethodCall` `foo(a, b)` will record the span of the
            // entire method call, but the indexer is interested only in the method identifier.
            var localExpression = this.expressionStr.substr(ast.span.start, ast.span.end);
            if (!localExpression.includes(ast.name)) {
                throw new Error("Impossible state: \"" + ast.name + "\" not found in \"" + localExpression + "\"");
            }
            var identifierStart = ast.span.start + localExpression.indexOf(ast.name);
            // Join the relative position of the expression within a node with the absolute position
            // of the node to get the absolute position of the expression in the source code.
            var absoluteStart = this.absoluteOffset + identifierStart;
            var span = new api_1.AbsoluteSourceSpan(absoluteStart, absoluteStart + ast.name.length);
            this.identifiers.push({ name: ast.name, span: span, kind: kind, });
        };
        return ExpressionVisitor;
    }(compiler_1.RecursiveAstVisitor));
    /**
     * Visits the AST of a parsed Angular template. Discovers and stores
     * identifiers of interest, deferring to an `ExpressionVisitor` as needed.
     */
    var TemplateVisitor = /** @class */ (function (_super) {
        tslib_1.__extends(TemplateVisitor, _super);
        /**
         * Creates a template visitor for a bound template target. The bound target can be used when
         * deferred to the expression visitor to get information about the target of an expression.
         *
         * @param boundTemplate bound template target
         */
        function TemplateVisitor(boundTemplate) {
            var _this = _super.call(this) || this;
            _this.boundTemplate = boundTemplate;
            // identifiers of interest found in the template
            _this.identifiers = new Set();
            return _this;
        }
        /**
         * Visits a node in the template.
         *
         * @param node node to visit
         */
        TemplateVisitor.prototype.visit = function (node) { node.visit(this); };
        TemplateVisitor.prototype.visitAll = function (nodes) {
            var _this = this;
            nodes.forEach(function (node) { return _this.visit(node); });
        };
        /**
         * Add an identifier for an HTML element and visit its children recursively.
         *
         * @param element
         */
        TemplateVisitor.prototype.visitElement = function (element) {
            // Record the element's attributes, which an indexer can later traverse to see if any of them
            // specify a used directive on the element.
            var attributes = element.attributes.map(function (_a) {
                var name = _a.name, value = _a.value, sourceSpan = _a.sourceSpan;
                return {
                    name: name,
                    span: new api_1.AbsoluteSourceSpan(sourceSpan.start.offset, sourceSpan.end.offset),
                    kind: api_1.IdentifierKind.Attribute,
                };
            });
            var usedDirectives = this.boundTemplate.getDirectivesOfNode(element) || [];
            var name = element.name, sourceSpan = element.sourceSpan;
            // An element's source span can be of the form `<element>`, `<element />`, or
            // `<element></element>`. Only the selector is interesting to the indexer, so the source is
            // searched for the first occurrence of the element (selector) name.
            var localStr = sourceSpan.toString();
            if (!localStr.includes(name)) {
                throw new Error("Impossible state: \"" + name + "\" not found in \"" + localStr + "\"");
            }
            var start = sourceSpan.start.offset + localStr.indexOf(name);
            var elId = {
                name: name,
                span: new api_1.AbsoluteSourceSpan(start, start + name.length),
                kind: api_1.IdentifierKind.Element,
                attributes: new Set(attributes),
                usedDirectives: new Set(usedDirectives.map(function (dir) { return dir.ref.node; })),
            };
            this.identifiers.add(elId);
            this.visitAll(element.children);
            this.visitAll(element.references);
        };
        TemplateVisitor.prototype.visitTemplate = function (template) {
            this.visitAll(template.attributes);
            this.visitAll(template.children);
            this.visitAll(template.references);
            this.visitAll(template.variables);
        };
        TemplateVisitor.prototype.visitBoundText = function (text) { this.visitExpression(text); };
        /**
         * Visits a node's expression and adds its identifiers, if any, to the visitor's state.
         *
         * @param node node whose expression to visit
         */
        TemplateVisitor.prototype.visitExpression = function (node) {
            var _this = this;
            var identifiers = ExpressionVisitor.getIdentifiers(node.value, node, this.boundTemplate);
            identifiers.forEach(function (id) { return _this.identifiers.add(id); });
        };
        return TemplateVisitor;
    }(r3_ast_1.RecursiveVisitor));
    /**
     * Traverses a template AST and builds identifiers discovered in it.
     *
     * @param boundTemplate bound template target, which can be used for querying expression targets.
     * @return identifiers in template
     */
    function getTemplateIdentifiers(boundTemplate) {
        var visitor = new TemplateVisitor(boundTemplate);
        if (boundTemplate.target.template !== undefined) {
            visitor.visitAll(boundTemplate.target.template);
        }
        return visitor.identifiers;
    }
    exports.getTemplateIdentifiers = getTemplateIdentifiers;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2luZGV4ZXIvc3JjL3RlbXBsYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFvSDtJQUNwSCwrREFBc0k7SUFDdEksdUVBQStLO0lBYy9LOzs7Ozs7OztPQVFHO0lBQ0g7UUFBZ0MsNkNBQW1CO1FBR2pELDJCQUNJLE9BQWEsRUFBbUIsYUFBeUMsRUFDeEQsYUFBNkMsRUFDN0MsY0FBZ0Q7WUFEaEQsOEJBQUEsRUFBQSxnQkFBZ0IsT0FBTyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUU7WUFDN0MsK0JBQUEsRUFBQSxpQkFBaUIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTTtZQUhyRSxZQUlFLGlCQUFPLFNBQ1I7WUFKbUMsbUJBQWEsR0FBYixhQUFhLENBQTRCO1lBQ3hELG1CQUFhLEdBQWIsYUFBYSxDQUFnQztZQUM3QyxvQkFBYyxHQUFkLGNBQWMsQ0FBa0M7WUFMNUQsaUJBQVcsR0FBMkIsRUFBRSxDQUFDOztRQU9sRCxDQUFDO1FBRUQ7Ozs7Ozs7V0FPRztRQUNJLGdDQUFjLEdBQXJCLFVBQXNCLEdBQVEsRUFBRSxPQUFhLEVBQUUsYUFBeUM7WUFFdEYsSUFBTSxPQUFPLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDOUQsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNuQixPQUFPLE9BQU8sQ0FBQyxXQUFXLENBQUM7UUFDN0IsQ0FBQztRQUVELGlDQUFLLEdBQUwsVUFBTSxHQUFRLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFcEMsMkNBQWUsR0FBZixVQUFnQixHQUFlLEVB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RTlFLElBQU0sT0FBTyxHQUFHLElBQUksZUFBZSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ25ELElBQUksYUFBYSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEtBQUssU0FBUyxFQUFFO1lBQy9DLE9BQU8sQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUNqRDtRQUNELE9BQU8sT0FBTyxDQUFDLFdBQVcsQ0FBQztJQUM3QixDQUFDO0lBUEQsd0RBT0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBCb3VuZFRhcmdldCwgSW1wbGljaXRSZWNlaXZlciwgTWV0aG9kQ2FsbCwgUHJvcGVydHlSZWFkLCBSZWN1cnNpdmVBc3RWaXNpdG9yfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge0JvdW5kVGV4dCwgRWxlbWVudCwgTm9kZSwgUmVjdXJzaXZlVmlzaXRvciBhcyBSZWN1cnNpdmVUZW1wbGF0ZVZpc2l0b3IsIFRlbXBsYXRlfSBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvcmVuZGVyMy9yM19hc3QnO1xuaW1wb3J0IHtBYnNvbHV0ZVNvdXJjZVNwYW4sIEF0dHJpYnV0ZUlkZW50aWZpZXIsIEVsZW1lbnRJZGVudGlmaWVyLCBJZGVudGlmaWVyS2luZCwgTWV0aG9kSWRlbnRpZmllciwgUHJvcGVydHlJZGVudGlmaWVyLCBUZW1wbGF0ZUlkZW50aWZpZXIsIFRvcExldmVsSWRlbnRpZmllcn0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtDb21wb25lbnRNZXRhfSBmcm9tICcuL2NvbnRleHQnO1xuXG4vKipcbiAqIEEgcGFyc2VkIG5vZGUgaW4gYSB0ZW1wbGF0ZSwgd2hpY2ggbWF5IGhhdmUgYSBuYW1lIChpZiBpdCBpcyBhIHNlbGVjdG9yKSBvclxuICogYmUgYW5vbnltb3VzIChsaWtlIGEgdGV4dCBzcGFuKS5cbiAqL1xuaW50ZXJmYWNlIEhUTUxOb2RlIGV4dGVuZHMgTm9kZSB7XG4gIHRhZ05hbWU/OiBzdHJpbmc7XG4gIG5hbWU/OiBzdHJpbmc7XG59XG5cbnR5cGUgRXhwcmVzc2lvbklkZW50aWZpZXIgPSBQcm9wZXJ0eUlkZW50aWZpZXIgfCBNZXRob2RJZGVudGlmaWVyO1xuXG4vKipcbiAqIFZpc2l0cyB0aGUgQVNUIG9mIGFuIEFuZ3VsYXIgdGVtcGxhdGUgc3ludGF4IGV4cHJlc3Npb24sIGZpbmRpbmcgaW50ZXJlc3RpbmdcbiAqIGVudGl0aWVzICh2YXJpYWJsZSByZWZlcmVuY2VzLCBldGMuKS4gQ3JlYXRlcyBhbiBhcnJheSBvZiBFbnRpdGllcyBmb3VuZCBpblxuICogdGhlIGV4cHJlc3Npb24sIHdpdGggdGhlIGxvY2F0aW9uIG9mIHRoZSBFbnRpdGllcyBiZWluZyByZWxhdGl2ZSB0byB0aGVcbiAqIGV4cHJlc3Npb24uXG4gKlxuICogVmlzaXRpbmcgYHRleHQge3twcm9wfX1gIHdpbGwgcmV0dXJuXG4gKiBgW1RvcExldmVsSWRlbnRpZmllciB7bmFtZTogJ3Byb3AnLCBzcGFuOiB7c3RhcnQ6IDcsIGVuZDogMTF9fV1gLlxuICovXG5jbGFzcyBFeHByZXNzaW9uVmlzaXRvciBleHRlbmRzIFJlY3Vyc2l2ZUFzdFZpc2l0b3Ige1xuICByZWFkb25seSBpZGVudGlmaWVyczogRXhwcmVzc2lvbklkZW50aWZpZXJbXSA9IFtdO1xuXG4gIHByaXZhdGUgY29uc3RydWN0b3IoXG4gICAgICBjb250ZXh0OiBOb2RlLCBwcml2YXRlIHJlYWRvbmx5IGJvdW5kVGVtcGxhdGU6IEJvdW5kVGFyZ2V0PENvbXBvbmVudE1ldGE+LFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBleHByZXNzaW9uU3RyID0gY29udGV4dC5zb3VyY2VTcGFuLnRvU3RyaW5nKCksXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGFic29sdXRlT2Zmc2V0ID0gY29udGV4dC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBpZGVudGlmaWVycyBkaXNjb3ZlcmVkIGluIGFuIGV4cHJlc3Npb24uXG4gICAqXG4gICAqIEBwYXJhbSBhc3QgZXhwcmVzc2lvbiBBU1QgdG8gdmlzaXRcbiAgICogQHBhcmFtIGNvbnRleHQgSFRNTCBub2RlIGV4cHJlc3Npb24gaXMgZGVmaW5lZCBpblxuICAgKiBAcGFyYW0gYm91bmRUZW1wbGF0ZSBib3VuZCB0YXJnZXQgb2YgdGhlIGVudGlyZSB0ZW1wbGF0ZSwgd2hpY2ggY2FuIGJlIHVzZWQgdG8gcXVlcnkgZm9yIHRoZVxuICAgKiBlbnRpdGllcyBleHByZXNzaW9ucyB0YXJnZXQuXG4gICAqL1xuICBzdGF0aWMgZ2V0SWRlbnRpZmllcnMoYXN0OiBBU1QsIGNvbnRleHQ6IE5vZGUsIGJvdW5kVGVtcGxhdGU6IEJvdW5kVGFyZ2V0PENvbXBvbmVudE1ldGE+KTpcbiAgICAgIFRvcExldmVsSWRlbnRpZmllcltdIHtcbiAgICBjb25zdCB2aXNpdG9yID0gbmV3IEV4cHJlc3Npb25WaXNpdG9yKGNvbnRleHQsIGJvdW5kVGVtcGxhdGUpO1xuICAgIHZpc2l0b3IudmlzaXQoYXN0KTtcbiAgICByZXR1cm4gdmlzaXRvci5pZGVudGlmaWVycztcbiAgfVxuXG4gIHZpc2l0KGFzdDogQVNUKSB7IGFzdC52aXNpdCh0aGlzKTsgfVxuXG4gIHZpc2l0TWV0aG9kQ2FsbChhc3Q6IE1ldGhvZENhbGwsIGNvbnRleHQ6IHt9KSB7XG4gICAgdGhpcy52aXNpdElkZW50aWZpZXIoYXN0LCBJZGVudGlmaWVyS2luZC5NZXRob2QpO1xuICAgIHN1cGVyLnZpc2l0TWV0aG9kQ2FsbChhc3QsIGNvbnRleHQpO1xuICB9XG5cbiAgdmlzaXRQcm9wZXJ0eVJlYWQoYXN0OiBQcm9wZXJ0eVJlYWQsIGNvbnRleHQ6IHt9KSB7XG4gICAgdGhpcy52aXNpdElkZW50aWZpZXIoYXN0LCBJZGVudGlmaWVyS2luZC5Qcm9wZXJ0eSk7XG4gICAgc3VwZXIudmlzaXRQcm9wZXJ0eVJlYWQoYXN0LCBjb250ZXh0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBWaXNpdHMgYW4gaWRlbnRpZmllciwgYWRkaW5nIGl0IHRvIHRoZSBpZGVudGlmaWVyIHN0b3JlIGlmIGl0IGlzIHVzZWZ1bCBmb3IgaW5kZXhpbmcuXG4gICAqXG4gICAqIEBwYXJhbSBhc3QgZXhwcmVzc2lvbiBBU1QgdGhlIGlkZW50aWZpZXIgaXMgaW5cbiAgICogQHBhcmFtIGtpbmQgaWRlbnRpZmllciBraW5kXG4gICAqL1xuICBwcml2YXRlIHZpc2l0SWRlbnRpZmllcihcbiAgICAgIGFzdDogQVNUJntuYW1lOiBzdHJpbmcsIHJlY2VpdmVyOiBBU1R9LCBraW5kOiBFeHByZXNzaW9uSWRlbnRpZmllclsna2luZCddKSB7XG4gICAgLy8gVGhlIGRlZmluaXRpb24gb2YgYSBub24tdG9wLWxldmVsIHByb3BlcnR5IHN1Y2ggYXMgYGJhcmAgaW4gYHt7Zm9vLmJhcn19YCBpcyBjdXJyZW50bHlcbiAgICAvLyBpbXBvc3NpYmxlIHRvIGRldGVybWluZSBieSBhbiBpbmRleGVyIGFuZCB1bnN1cHBvcnRlZCBieSB0aGUgaW5kZXhpbmcgbW9kdWxlLlxuICAgIC8vIFRoZSBpbmRleGluZyBtb2R1bGUgYWxzbyBkb2VzIG5vdCBjdXJyZW50bHkgc3VwcG9ydCByZWZlcmVuY2VzIHRvIGlkZW50aWZpZXJzIGRlY2xhcmVkIGluIHRoZVxuICAgIC8vIHRlbXBsYXRlIGl0c2VsZiwgd2hpY2ggaGF2ZSBhIG5vbi1udWxsIGV4cHJlc3Npb24gdGFyZ2V0LlxuICAgIGlmICghKGFzdC5yZWNlaXZlciBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIpIHx8XG4gICAgICAgIHRoaXMuYm91bmRUZW1wbGF0ZS5nZXRFeHByZXNzaW9uVGFyZ2V0KGFzdCkgIT09IG51bGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBHZXQgdGhlIGxvY2F0aW9uIG9mIHRoZSBpZGVudGlmaWVyIG9mIHJlYWwgaW50ZXJlc3QuXG4gICAgLy8gVGhlIGNvbXBpbGVyJ3MgZXhwcmVzc2lvbiBwYXJzZXIgcmVjb3JkcyB0aGUgbG9jYXRpb24gb2Ygc29tZSBleHByZXNzaW9ucyBpbiBhIG1hbm5lciBub3RcbiAgICAvLyB1c2VmdWwgdG8gdGhlIGluZGV4ZXIuIEZvciBleGFtcGxlLCBhIGBNZXRob2RDYWxsYCBgZm9vKGEsIGIpYCB3aWxsIHJlY29yZCB0aGUgc3BhbiBvZiB0aGVcbiAgICAvLyBlbnRpcmUgbWV0aG9kIGNhbGwsIGJ1dCB0aGUgaW5kZXhlciBpcyBpbnRlcmVzdGVkIG9ubHkgaW4gdGhlIG1ldGhvZCBpZGVudGlmaWVyLlxuICAgIGNvbnN0IGxvY2FsRXhwcmVzc2lvbiA9IHRoaXMuZXhwcmVzc2lvblN0ci5zdWJzdHIoYXN0LnNwYW4uc3RhcnQsIGFzdC5zcGFuLmVuZCk7XG4gICAgaWYgKCFsb2NhbEV4cHJlc3Npb24uaW5jbHVkZXMoYXN0Lm5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEltcG9zc2libGUgc3RhdGU6IFwiJHthc3QubmFtZX1cIiBub3QgZm91bmQgaW4gXCIke2xvY2FsRXhwcmVzc2lvbn1cImApO1xuICAgIH1cbiAgICBjb25zdCBpZGVudGlmaWVyU3RhcnQgPSBhc3Quc3Bhbi5zdGFydCArIGxvY2FsRXhwcmVzc2lvbi5pbmRleE9mKGFzdC5uYW1lKTtcblxuICAgIC8vIEpvaW4gdGhlIHJlbGF0aXZlIHBvc2l0aW9uIG9mIHRoZSBleHByZXNzaW9uIHdpdGhpbiBhIG5vZGUgd2l0aCB0aGUgYWJzb2x1dGUgcG9zaXRpb25cbiAgICAvLyBvZiB0aGUgbm9kZSB0byBnZXQgdGhlIGFic29sdXRlIHBvc2l0aW9uIG9mIHRoZSBleHByZXNzaW9uIGluIHRoZSBzb3VyY2UgY29kZS5cbiAgICBjb25zdCBhYnNvbHV0ZVN0YXJ0ID0gdGhpcy5hYnNvbHV0ZU9mZnNldCArIGlkZW50aWZpZXJTdGFydDtcbiAgICBjb25zdCBzcGFuID0gbmV3IEFic29sdXRlU291cmNlU3BhbihhYnNvbHV0ZVN0YXJ0LCBhYnNvbHV0ZVN0YXJ0ICsgYXN0Lm5hbWUubGVuZ3RoKTtcblxuICAgIHRoaXMuaWRlbnRpZmllcnMucHVzaCh7IG5hbWU6IGFzdC5uYW1lLCBzcGFuLCBraW5kLCB9IGFzIEV4cHJlc3Npb25JZGVudGlmaWVyKTtcbiAgfVxufVxuXG4vKipcbiAqIFZpc2l0cyB0aGUgQVNUIG9mIGEgcGFyc2VkIEFuZ3VsYXIgdGVtcGxhdGUuIERpc2NvdmVycyBhbmQgc3RvcmVzXG4gKiBpZGVudGlmaWVycyBvZiBpbnRlcmVzdCwgZGVmZXJyaW5nIHRvIGFuIGBFeHByZXNzaW9uVmlzaXRvcmAgYXMgbmVlZGVkLlxuICovXG5jbGFzcyBUZW1wbGF0ZVZpc2l0b3IgZXh0ZW5kcyBSZWN1cnNpdmVUZW1wbGF0ZVZpc2l0b3Ige1xuICAvLyBpZGVudGlmaWVycyBvZiBpbnRlcmVzdCBmb3VuZCBpbiB0aGUgdGVtcGxhdGVcbiAgcmVhZG9ubHkgaWRlbnRpZmllcnMgPSBuZXcgU2V0PFRvcExldmVsSWRlbnRpZmllcj4oKTtcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIHRlbXBsYXRlIHZpc2l0b3IgZm9yIGEgYm91bmQgdGVtcGxhdGUgdGFyZ2V0LiBUaGUgYm91bmQgdGFyZ2V0IGNhbiBiZSB1c2VkIHdoZW5cbiAgICogZGVmZXJyZWQgdG8gdGhlIGV4cHJlc3Npb24gdmlzaXRvciB0byBnZXQgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHRhcmdldCBvZiBhbiBleHByZXNzaW9uLlxuICAgKlxuICAgKiBAcGFyYW0gYm91bmRUZW1wbGF0ZSBib3VuZCB0ZW1wbGF0ZSB0YXJnZXRcbiAgICovXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgYm91bmRUZW1wbGF0ZTogQm91bmRUYXJnZXQ8Q29tcG9uZW50TWV0YT4pIHsgc3VwZXIoKTsgfVxuXG4gIC8qKlxuICAgKiBWaXNpdHMgYSBub2RlIGluIHRoZSB0ZW1wbGF0ZS5cbiAgICpcbiAgICogQHBhcmFtIG5vZGUgbm9kZSB0byB2aXNpdFxuICAgKi9cbiAgdmlzaXQobm9kZTogSFRNTE5vZGUpIHsgbm9kZS52aXNpdCh0aGlzKTsgfVxuXG4gIHZpc2l0QWxsKG5vZGVzOiBOb2RlW10pIHsgbm9kZXMuZm9yRWFjaChub2RlID0+IHRoaXMudmlzaXQobm9kZSkpOyB9XG5cbiAgLyoqXG4gICAqIEFkZCBhbiBpZGVudGlmaWVyIGZvciBhbiBIVE1MIGVsZW1lbnQgYW5kIHZpc2l0IGl0cyBjaGlsZHJlbiByZWN1cnNpdmVseS5cbiAgICpcbiAgICogQHBhcmFtIGVsZW1lbnRcbiAgICovXG4gIHZpc2l0RWxlbWVudChlbGVtZW50OiBFbGVtZW50KSB7XG4gICAgLy8gUmVjb3JkIHRoZSBlbGVtZW50J3MgYXR0cmlidXRlcywgd2hpY2ggYW4gaW5kZXhlciBjYW4gbGF0ZXIgdHJhdmVyc2UgdG8gc2VlIGlmIGFueSBvZiB0aGVtXG4gICAgLy8gc3BlY2lmeSBhIHVzZWQgZGlyZWN0aXZlIG9uIHRoZSBlbGVtZW50LlxuICAgIGNvbnN0IGF0dHJpYnV0ZXMgPSBlbGVtZW50LmF0dHJpYnV0ZXMubWFwKCh7bmFtZSwgdmFsdWUsIHNvdXJjZVNwYW59KTogQXR0cmlidXRlSWRlbnRpZmllciA9PiB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lLFxuICAgICAgICBzcGFuOiBuZXcgQWJzb2x1dGVTb3VyY2VTcGFuKHNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0LCBzb3VyY2VTcGFuLmVuZC5vZmZzZXQpLFxuICAgICAgICBraW5kOiBJZGVudGlmaWVyS2luZC5BdHRyaWJ1dGUsXG4gICAgICB9O1xuICAgIH0pO1xuICAgIGNvbnN0IHVzZWREaXJlY3RpdmVzID0gdGhpcy5ib3VuZFRlbXBsYXRlLmdldERpcmVjdGl2ZXNPZk5vZGUoZWxlbWVudCkgfHwgW107XG4gICAgY29uc3Qge25hbWUsIHNvdXJjZVNwYW59ID0gZWxlbWVudDtcbiAgICAvLyBBbiBlbGVtZW50J3Mgc291cmNlIHNwYW4gY2FuIGJlIG9mIHRoZSBmb3JtIGA8ZWxlbWVudD5gLCBgPGVsZW1lbnQgLz5gLCBvclxuICAgIC8vIGA8ZWxlbWVudD48L2VsZW1lbnQ+YC4gT25seSB0aGUgc2VsZWN0b3IgaXMgaW50ZXJlc3RpbmcgdG8gdGhlIGluZGV4ZXIsIHNvIHRoZSBzb3VyY2UgaXNcbiAgICAvLyBzZWFyY2hlZCBmb3IgdGhlIGZpcnN0IG9jY3VycmVuY2Ugb2YgdGhlIGVsZW1lbnQgKHNlbGVjdG9yKSBuYW1lLlxuICAgIGNvbnN0IGxvY2FsU3RyID0gc291cmNlU3Bhbi50b1N0cmluZygpO1xuICAgIGlmICghbG9jYWxTdHIuaW5jbHVkZXMobmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW1wb3NzaWJsZSBzdGF0ZTogXCIke25hbWV9XCIgbm90IGZvdW5kIGluIFwiJHtsb2NhbFN0cn1cImApO1xuICAgIH1cbiAgICBjb25zdCBzdGFydCA9IHNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0ICsgbG9jYWxTdHIuaW5kZXhPZihuYW1lKTtcbiAgICBjb25zdCBlbElkOiBFbGVtZW50SWRlbnRpZmllciA9IHtcbiAgICAgIG5hbWUsXG4gICAgICBzcGFuOiBuZXcgQWJzb2x1dGVTb3VyY2VTcGFuKHN0YXJ0LCBzdGFydCArIG5hbWUubGVuZ3RoKSxcbiAgICAgIGtpbmQ6IElkZW50aWZpZXJLaW5kLkVsZW1lbnQsXG4gICAgICBhdHRyaWJ1dGVzOiBuZXcgU2V0KGF0dHJpYnV0ZXMpLFxuICAgICAgdXNlZERpcmVjdGl2ZXM6IG5ldyBTZXQodXNlZERpcmVjdGl2ZXMubWFwKGRpciA9PiBkaXIucmVmLm5vZGUpKSxcbiAgICB9O1xuICAgIHRoaXMuaWRlbnRpZmllcnMuYWRkKGVsSWQpO1xuXG4gICAgdGhpcy52aXNpdEFsbChlbGVtZW50LmNoaWxkcmVuKTtcbiAgICB0aGlzLnZpc2l0QWxsKGVsZW1lbnQucmVmZXJlbmNlcyk7XG4gIH1cbiAgdmlzaXRUZW1wbGF0ZSh0ZW1wbGF0ZTogVGVtcGxhdGUpIHtcbiAgICB0aGlzLnZpc2l0QWxsKHRlbXBsYXRlLmF0dHJpYnV0ZXMpO1xuICAgIHRoaXMudmlzaXRBbGwodGVtcGxhdGUuY2hpbGRyZW4pO1xuICAgIHRoaXMudmlzaXRBbGwodGVtcGxhdGUucmVmZXJlbmNlcyk7XG4gICAgdGhpcy52aXNpdEFsbCh0ZW1wbGF0ZS52YXJpYWJsZXMpO1xuICB9XG4gIHZpc2l0Qm91bmRUZXh0KHRleHQ6IEJvdW5kVGV4dCkgeyB0aGlzLnZpc2l0RXhwcmVzc2lvbih0ZXh0KTsgfVxuXG4gIC8qKlxuICAgKiBWaXNpdHMgYSBub2RlJ3MgZXhwcmVzc2lvbiBhbmQgYWRkcyBpdHMgaWRlbnRpZmllcnMsIGlmIGFueSwgdG8gdGhlIHZpc2l0b3IncyBzdGF0ZS5cbiAgICpcbiAgICogQHBhcmFtIG5vZGUgbm9kZSB3aG9zZSBleHByZXNzaW9uIHRvIHZpc2l0XG4gICAqL1xuICBwcml2YXRlIHZpc2l0RXhwcmVzc2lvbihub2RlOiBOb2RlJnt2YWx1ZTogQVNUfSkge1xuICAgIGNvbnN0IGlkZW50aWZpZXJzID0gRXhwcmVzc2lvblZpc2l0b3IuZ2V0SWRlbnRpZmllcnMobm9kZS52YWx1ZSwgbm9kZSwgdGhpcy5ib3VuZFRlbXBsYXRlKTtcbiAgICBpZGVudGlmaWVycy5mb3JFYWNoKGlkID0+IHRoaXMuaWRlbnRpZmllcnMuYWRkKGlkKSk7XG4gIH1cbn1cblxuLyoqXG4gKiBUcmF2ZXJzZXMgYSB0ZW1wbGF0ZSBBU1QgYW5kIGJ1aWxkcyBpZGVudGlmaWVycyBkaXNjb3ZlcmVkIGluIGl0LlxuICpcbiAqIEBwYXJhbSBib3VuZFRlbXBsYXRlIGJvdW5kIHRlbXBsYXRlIHRhcmdldCwgd2hpY2ggY2FuIGJlIHVzZWQgZm9yIHF1ZXJ5aW5nIGV4cHJlc3Npb24gdGFyZ2V0cy5cbiAqIEByZXR1cm4gaWRlbnRpZmllcnMgaW4gdGVtcGxhdGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFRlbXBsYXRlSWRlbnRpZmllcnMoYm91bmRUZW1wbGF0ZTogQm91bmRUYXJnZXQ8Q29tcG9uZW50TWV0YT4pOlxuICAgIFNldDxUb3BMZXZlbElkZW50aWZpZXI+IHtcbiAgY29uc3QgdmlzaXRvciA9IG5ldyBUZW1wbGF0ZVZpc2l0b3IoYm91bmRUZW1wbGF0ZSk7XG4gIGlmIChib3VuZFRlbXBsYXRlLnRhcmdldC50ZW1wbGF0ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdmlzaXRvci52aXNpdEFsbChib3VuZFRlbXBsYXRlLnRhcmdldC50ZW1wbGF0ZSk7XG4gIH1cbiAgcmV0dXJuIHZpc2l0b3IuaWRlbnRpZmllcnM7XG59XG4iXX0=