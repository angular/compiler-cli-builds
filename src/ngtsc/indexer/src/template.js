(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/indexer/src/template", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/indexer/src/api"], factory);
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
    }(compiler_1.TmplAstRecursiveVisitor));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2luZGV4ZXIvc3JjL3RlbXBsYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUE2TTtJQUM3TSx1RUFBK0s7SUFjL0s7Ozs7Ozs7O09BUUc7SUFDSDtRQUFnQyw2Q0FBbUI7UUFHakQsMkJBQ0ksT0FBb0IsRUFBbUIsYUFBeUMsRUFDL0QsYUFBNkMsRUFDN0MsY0FBZ0Q7WUFEaEQsOEJBQUEsRUFBQSxnQkFBZ0IsT0FBTyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUU7WUFDN0MsK0JBQUEsRUFBQSxpQkFBaUIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTTtZQUhyRSxZQUlFLGlCQUFPLFNBQ1I7WUFKMEMsbUJBQWEsR0FBYixhQUFhLENBQTRCO1lBQy9ELG1CQUFhLEdBQWIsYUFBYSxDQUFnQztZQUM3QyxvQkFBYyxHQUFkLGNBQWMsQ0FBa0M7WUFMNUQsaUJBQVcsR0FBMkIsRUFBRSxDQUFDOztRQU9sRCxDQUFDO1FBRUQ7Ozs7Ozs7V0FPRztRQUNJLGdDQUFjLEdBQXJCLFVBQXNCLEdBQVEsRUFBRSxPQUFvQixFQUFFLGFBQXlDO1lBRTdGLElBQU0sT0FBTyxHQUFHLElBQUksaUJBQWlCLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQzlELE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbkIsT0FBTyxPQUFPLENBQUMsV0FBVyxDQUFDO1FBQzdCLENBQUM7UUFFRCxpQ0FBSyxHQUFMLFVBQU0sR0FBUSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXBDLDJDQUFlLEdBQWYsVUFBZ0IsR0FBZSxFQUFFLE9BQVc7WUFD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T0FBTyxHQUFHLElBQUksZUFBZSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ25ELElBQUksYUFBYSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEtBQUssU0FBUyxFQUFFO1lBQy9DLE9BQU8sQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUNqRDtRQUNELE9BQU8sT0FBTyxDQUFDLFdBQVcsQ0FBQztJQUM3QixDQUFDO0lBUEQsd0RBT0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0FTVCwgQm91bmRUYXJnZXQsIEltcGxpY2l0UmVjZWl2ZXIsIE1ldGhvZENhbGwsIFByb3BlcnR5UmVhZCwgUmVjdXJzaXZlQXN0VmlzaXRvciwgVG1wbEFzdEJvdW5kVGV4dCwgVG1wbEFzdEVsZW1lbnQsIFRtcGxBc3ROb2RlLCBUbXBsQXN0UmVjdXJzaXZlVmlzaXRvciwgVG1wbEFzdFRlbXBsYXRlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge0Fic29sdXRlU291cmNlU3BhbiwgQXR0cmlidXRlSWRlbnRpZmllciwgRWxlbWVudElkZW50aWZpZXIsIElkZW50aWZpZXJLaW5kLCBNZXRob2RJZGVudGlmaWVyLCBQcm9wZXJ0eUlkZW50aWZpZXIsIFRlbXBsYXRlSWRlbnRpZmllciwgVG9wTGV2ZWxJZGVudGlmaWVyfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge0NvbXBvbmVudE1ldGF9IGZyb20gJy4vY29udGV4dCc7XG5cbi8qKlxuICogQSBwYXJzZWQgbm9kZSBpbiBhIHRlbXBsYXRlLCB3aGljaCBtYXkgaGF2ZSBhIG5hbWUgKGlmIGl0IGlzIGEgc2VsZWN0b3IpIG9yXG4gKiBiZSBhbm9ueW1vdXMgKGxpa2UgYSB0ZXh0IHNwYW4pLlxuICovXG5pbnRlcmZhY2UgSFRNTE5vZGUgZXh0ZW5kcyBUbXBsQXN0Tm9kZSB7XG4gIHRhZ05hbWU/OiBzdHJpbmc7XG4gIG5hbWU/OiBzdHJpbmc7XG59XG5cbnR5cGUgRXhwcmVzc2lvbklkZW50aWZpZXIgPSBQcm9wZXJ0eUlkZW50aWZpZXIgfCBNZXRob2RJZGVudGlmaWVyO1xuXG4vKipcbiAqIFZpc2l0cyB0aGUgQVNUIG9mIGFuIEFuZ3VsYXIgdGVtcGxhdGUgc3ludGF4IGV4cHJlc3Npb24sIGZpbmRpbmcgaW50ZXJlc3RpbmdcbiAqIGVudGl0aWVzICh2YXJpYWJsZSByZWZlcmVuY2VzLCBldGMuKS4gQ3JlYXRlcyBhbiBhcnJheSBvZiBFbnRpdGllcyBmb3VuZCBpblxuICogdGhlIGV4cHJlc3Npb24sIHdpdGggdGhlIGxvY2F0aW9uIG9mIHRoZSBFbnRpdGllcyBiZWluZyByZWxhdGl2ZSB0byB0aGVcbiAqIGV4cHJlc3Npb24uXG4gKlxuICogVmlzaXRpbmcgYHRleHQge3twcm9wfX1gIHdpbGwgcmV0dXJuXG4gKiBgW1RvcExldmVsSWRlbnRpZmllciB7bmFtZTogJ3Byb3AnLCBzcGFuOiB7c3RhcnQ6IDcsIGVuZDogMTF9fV1gLlxuICovXG5jbGFzcyBFeHByZXNzaW9uVmlzaXRvciBleHRlbmRzIFJlY3Vyc2l2ZUFzdFZpc2l0b3Ige1xuICByZWFkb25seSBpZGVudGlmaWVyczogRXhwcmVzc2lvbklkZW50aWZpZXJbXSA9IFtdO1xuXG4gIHByaXZhdGUgY29uc3RydWN0b3IoXG4gICAgICBjb250ZXh0OiBUbXBsQXN0Tm9kZSwgcHJpdmF0ZSByZWFkb25seSBib3VuZFRlbXBsYXRlOiBCb3VuZFRhcmdldDxDb21wb25lbnRNZXRhPixcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgZXhwcmVzc2lvblN0ciA9IGNvbnRleHQuc291cmNlU3Bhbi50b1N0cmluZygpLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBhYnNvbHV0ZU9mZnNldCA9IGNvbnRleHQuc291cmNlU3Bhbi5zdGFydC5vZmZzZXQpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgaWRlbnRpZmllcnMgZGlzY292ZXJlZCBpbiBhbiBleHByZXNzaW9uLlxuICAgKlxuICAgKiBAcGFyYW0gYXN0IGV4cHJlc3Npb24gQVNUIHRvIHZpc2l0XG4gICAqIEBwYXJhbSBjb250ZXh0IEhUTUwgbm9kZSBleHByZXNzaW9uIGlzIGRlZmluZWQgaW5cbiAgICogQHBhcmFtIGJvdW5kVGVtcGxhdGUgYm91bmQgdGFyZ2V0IG9mIHRoZSBlbnRpcmUgdGVtcGxhdGUsIHdoaWNoIGNhbiBiZSB1c2VkIHRvIHF1ZXJ5IGZvciB0aGVcbiAgICogZW50aXRpZXMgZXhwcmVzc2lvbnMgdGFyZ2V0LlxuICAgKi9cbiAgc3RhdGljIGdldElkZW50aWZpZXJzKGFzdDogQVNULCBjb250ZXh0OiBUbXBsQXN0Tm9kZSwgYm91bmRUZW1wbGF0ZTogQm91bmRUYXJnZXQ8Q29tcG9uZW50TWV0YT4pOlxuICAgICAgVG9wTGV2ZWxJZGVudGlmaWVyW10ge1xuICAgIGNvbnN0IHZpc2l0b3IgPSBuZXcgRXhwcmVzc2lvblZpc2l0b3IoY29udGV4dCwgYm91bmRUZW1wbGF0ZSk7XG4gICAgdmlzaXRvci52aXNpdChhc3QpO1xuICAgIHJldHVybiB2aXNpdG9yLmlkZW50aWZpZXJzO1xuICB9XG5cbiAgdmlzaXQoYXN0OiBBU1QpIHsgYXN0LnZpc2l0KHRoaXMpOyB9XG5cbiAgdmlzaXRNZXRob2RDYWxsKGFzdDogTWV0aG9kQ2FsbCwgY29udGV4dDoge30pIHtcbiAgICB0aGlzLnZpc2l0SWRlbnRpZmllcihhc3QsIElkZW50aWZpZXJLaW5kLk1ldGhvZCk7XG4gICAgc3VwZXIudmlzaXRNZXRob2RDYWxsKGFzdCwgY29udGV4dCk7XG4gIH1cblxuICB2aXNpdFByb3BlcnR5UmVhZChhc3Q6IFByb3BlcnR5UmVhZCwgY29udGV4dDoge30pIHtcbiAgICB0aGlzLnZpc2l0SWRlbnRpZmllcihhc3QsIElkZW50aWZpZXJLaW5kLlByb3BlcnR5KTtcbiAgICBzdXBlci52aXNpdFByb3BlcnR5UmVhZChhc3QsIGNvbnRleHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFZpc2l0cyBhbiBpZGVudGlmaWVyLCBhZGRpbmcgaXQgdG8gdGhlIGlkZW50aWZpZXIgc3RvcmUgaWYgaXQgaXMgdXNlZnVsIGZvciBpbmRleGluZy5cbiAgICpcbiAgICogQHBhcmFtIGFzdCBleHByZXNzaW9uIEFTVCB0aGUgaWRlbnRpZmllciBpcyBpblxuICAgKiBAcGFyYW0ga2luZCBpZGVudGlmaWVyIGtpbmRcbiAgICovXG4gIHByaXZhdGUgdmlzaXRJZGVudGlmaWVyKFxuICAgICAgYXN0OiBBU1Qme25hbWU6IHN0cmluZywgcmVjZWl2ZXI6IEFTVH0sIGtpbmQ6IEV4cHJlc3Npb25JZGVudGlmaWVyWydraW5kJ10pIHtcbiAgICAvLyBUaGUgZGVmaW5pdGlvbiBvZiBhIG5vbi10b3AtbGV2ZWwgcHJvcGVydHkgc3VjaCBhcyBgYmFyYCBpbiBge3tmb28uYmFyfX1gIGlzIGN1cnJlbnRseVxuICAgIC8vIGltcG9zc2libGUgdG8gZGV0ZXJtaW5lIGJ5IGFuIGluZGV4ZXIgYW5kIHVuc3VwcG9ydGVkIGJ5IHRoZSBpbmRleGluZyBtb2R1bGUuXG4gICAgLy8gVGhlIGluZGV4aW5nIG1vZHVsZSBhbHNvIGRvZXMgbm90IGN1cnJlbnRseSBzdXBwb3J0IHJlZmVyZW5jZXMgdG8gaWRlbnRpZmllcnMgZGVjbGFyZWQgaW4gdGhlXG4gICAgLy8gdGVtcGxhdGUgaXRzZWxmLCB3aGljaCBoYXZlIGEgbm9uLW51bGwgZXhwcmVzc2lvbiB0YXJnZXQuXG4gICAgaWYgKCEoYXN0LnJlY2VpdmVyIGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlcikgfHxcbiAgICAgICAgdGhpcy5ib3VuZFRlbXBsYXRlLmdldEV4cHJlc3Npb25UYXJnZXQoYXN0KSAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEdldCB0aGUgbG9jYXRpb24gb2YgdGhlIGlkZW50aWZpZXIgb2YgcmVhbCBpbnRlcmVzdC5cbiAgICAvLyBUaGUgY29tcGlsZXIncyBleHByZXNzaW9uIHBhcnNlciByZWNvcmRzIHRoZSBsb2NhdGlvbiBvZiBzb21lIGV4cHJlc3Npb25zIGluIGEgbWFubmVyIG5vdFxuICAgIC8vIHVzZWZ1bCB0byB0aGUgaW5kZXhlci4gRm9yIGV4YW1wbGUsIGEgYE1ldGhvZENhbGxgIGBmb28oYSwgYilgIHdpbGwgcmVjb3JkIHRoZSBzcGFuIG9mIHRoZVxuICAgIC8vIGVudGlyZSBtZXRob2QgY2FsbCwgYnV0IHRoZSBpbmRleGVyIGlzIGludGVyZXN0ZWQgb25seSBpbiB0aGUgbWV0aG9kIGlkZW50aWZpZXIuXG4gICAgY29uc3QgbG9jYWxFeHByZXNzaW9uID0gdGhpcy5leHByZXNzaW9uU3RyLnN1YnN0cihhc3Quc3Bhbi5zdGFydCwgYXN0LnNwYW4uZW5kKTtcbiAgICBpZiAoIWxvY2FsRXhwcmVzc2lvbi5pbmNsdWRlcyhhc3QubmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW1wb3NzaWJsZSBzdGF0ZTogXCIke2FzdC5uYW1lfVwiIG5vdCBmb3VuZCBpbiBcIiR7bG9jYWxFeHByZXNzaW9ufVwiYCk7XG4gICAgfVxuICAgIGNvbnN0IGlkZW50aWZpZXJTdGFydCA9IGFzdC5zcGFuLnN0YXJ0ICsgbG9jYWxFeHByZXNzaW9uLmluZGV4T2YoYXN0Lm5hbWUpO1xuXG4gICAgLy8gSm9pbiB0aGUgcmVsYXRpdmUgcG9zaXRpb24gb2YgdGhlIGV4cHJlc3Npb24gd2l0aGluIGEgbm9kZSB3aXRoIHRoZSBhYnNvbHV0ZSBwb3NpdGlvblxuICAgIC8vIG9mIHRoZSBub2RlIHRvIGdldCB0aGUgYWJzb2x1dGUgcG9zaXRpb24gb2YgdGhlIGV4cHJlc3Npb24gaW4gdGhlIHNvdXJjZSBjb2RlLlxuICAgIGNvbnN0IGFic29sdXRlU3RhcnQgPSB0aGlzLmFic29sdXRlT2Zmc2V0ICsgaWRlbnRpZmllclN0YXJ0O1xuICAgIGNvbnN0IHNwYW4gPSBuZXcgQWJzb2x1dGVTb3VyY2VTcGFuKGFic29sdXRlU3RhcnQsIGFic29sdXRlU3RhcnQgKyBhc3QubmFtZS5sZW5ndGgpO1xuXG4gICAgdGhpcy5pZGVudGlmaWVycy5wdXNoKHsgbmFtZTogYXN0Lm5hbWUsIHNwYW4sIGtpbmQsIH0gYXMgRXhwcmVzc2lvbklkZW50aWZpZXIpO1xuICB9XG59XG5cbi8qKlxuICogVmlzaXRzIHRoZSBBU1Qgb2YgYSBwYXJzZWQgQW5ndWxhciB0ZW1wbGF0ZS4gRGlzY292ZXJzIGFuZCBzdG9yZXNcbiAqIGlkZW50aWZpZXJzIG9mIGludGVyZXN0LCBkZWZlcnJpbmcgdG8gYW4gYEV4cHJlc3Npb25WaXNpdG9yYCBhcyBuZWVkZWQuXG4gKi9cbmNsYXNzIFRlbXBsYXRlVmlzaXRvciBleHRlbmRzIFRtcGxBc3RSZWN1cnNpdmVWaXNpdG9yIHtcbiAgLy8gaWRlbnRpZmllcnMgb2YgaW50ZXJlc3QgZm91bmQgaW4gdGhlIHRlbXBsYXRlXG4gIHJlYWRvbmx5IGlkZW50aWZpZXJzID0gbmV3IFNldDxUb3BMZXZlbElkZW50aWZpZXI+KCk7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSB0ZW1wbGF0ZSB2aXNpdG9yIGZvciBhIGJvdW5kIHRlbXBsYXRlIHRhcmdldC4gVGhlIGJvdW5kIHRhcmdldCBjYW4gYmUgdXNlZCB3aGVuXG4gICAqIGRlZmVycmVkIHRvIHRoZSBleHByZXNzaW9uIHZpc2l0b3IgdG8gZ2V0IGluZm9ybWF0aW9uIGFib3V0IHRoZSB0YXJnZXQgb2YgYW4gZXhwcmVzc2lvbi5cbiAgICpcbiAgICogQHBhcmFtIGJvdW5kVGVtcGxhdGUgYm91bmQgdGVtcGxhdGUgdGFyZ2V0XG4gICAqL1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGJvdW5kVGVtcGxhdGU6IEJvdW5kVGFyZ2V0PENvbXBvbmVudE1ldGE+KSB7IHN1cGVyKCk7IH1cblxuICAvKipcbiAgICogVmlzaXRzIGEgbm9kZSBpbiB0aGUgdGVtcGxhdGUuXG4gICAqXG4gICAqIEBwYXJhbSBub2RlIG5vZGUgdG8gdmlzaXRcbiAgICovXG4gIHZpc2l0KG5vZGU6IEhUTUxOb2RlKSB7IG5vZGUudmlzaXQodGhpcyk7IH1cblxuICB2aXNpdEFsbChub2RlczogVG1wbEFzdE5vZGVbXSkgeyBub2Rlcy5mb3JFYWNoKG5vZGUgPT4gdGhpcy52aXNpdChub2RlKSk7IH1cblxuICAvKipcbiAgICogQWRkIGFuIGlkZW50aWZpZXIgZm9yIGFuIEhUTUwgZWxlbWVudCBhbmQgdmlzaXQgaXRzIGNoaWxkcmVuIHJlY3Vyc2l2ZWx5LlxuICAgKlxuICAgKiBAcGFyYW0gZWxlbWVudFxuICAgKi9cbiAgdmlzaXRFbGVtZW50KGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50KSB7XG4gICAgLy8gUmVjb3JkIHRoZSBlbGVtZW50J3MgYXR0cmlidXRlcywgd2hpY2ggYW4gaW5kZXhlciBjYW4gbGF0ZXIgdHJhdmVyc2UgdG8gc2VlIGlmIGFueSBvZiB0aGVtXG4gICAgLy8gc3BlY2lmeSBhIHVzZWQgZGlyZWN0aXZlIG9uIHRoZSBlbGVtZW50LlxuICAgIGNvbnN0IGF0dHJpYnV0ZXMgPSBlbGVtZW50LmF0dHJpYnV0ZXMubWFwKCh7bmFtZSwgdmFsdWUsIHNvdXJjZVNwYW59KTogQXR0cmlidXRlSWRlbnRpZmllciA9PiB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lLFxuICAgICAgICBzcGFuOiBuZXcgQWJzb2x1dGVTb3VyY2VTcGFuKHNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0LCBzb3VyY2VTcGFuLmVuZC5vZmZzZXQpLFxuICAgICAgICBraW5kOiBJZGVudGlmaWVyS2luZC5BdHRyaWJ1dGUsXG4gICAgICB9O1xuICAgIH0pO1xuICAgIGNvbnN0IHVzZWREaXJlY3RpdmVzID0gdGhpcy5ib3VuZFRlbXBsYXRlLmdldERpcmVjdGl2ZXNPZk5vZGUoZWxlbWVudCkgfHwgW107XG4gICAgY29uc3Qge25hbWUsIHNvdXJjZVNwYW59ID0gZWxlbWVudDtcbiAgICAvLyBBbiBlbGVtZW50J3Mgc291cmNlIHNwYW4gY2FuIGJlIG9mIHRoZSBmb3JtIGA8ZWxlbWVudD5gLCBgPGVsZW1lbnQgLz5gLCBvclxuICAgIC8vIGA8ZWxlbWVudD48L2VsZW1lbnQ+YC4gT25seSB0aGUgc2VsZWN0b3IgaXMgaW50ZXJlc3RpbmcgdG8gdGhlIGluZGV4ZXIsIHNvIHRoZSBzb3VyY2UgaXNcbiAgICAvLyBzZWFyY2hlZCBmb3IgdGhlIGZpcnN0IG9jY3VycmVuY2Ugb2YgdGhlIGVsZW1lbnQgKHNlbGVjdG9yKSBuYW1lLlxuICAgIGNvbnN0IGxvY2FsU3RyID0gc291cmNlU3Bhbi50b1N0cmluZygpO1xuICAgIGlmICghbG9jYWxTdHIuaW5jbHVkZXMobmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW1wb3NzaWJsZSBzdGF0ZTogXCIke25hbWV9XCIgbm90IGZvdW5kIGluIFwiJHtsb2NhbFN0cn1cImApO1xuICAgIH1cbiAgICBjb25zdCBzdGFydCA9IHNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0ICsgbG9jYWxTdHIuaW5kZXhPZihuYW1lKTtcbiAgICBjb25zdCBlbElkOiBFbGVtZW50SWRlbnRpZmllciA9IHtcbiAgICAgIG5hbWUsXG4gICAgICBzcGFuOiBuZXcgQWJzb2x1dGVTb3VyY2VTcGFuKHN0YXJ0LCBzdGFydCArIG5hbWUubGVuZ3RoKSxcbiAgICAgIGtpbmQ6IElkZW50aWZpZXJLaW5kLkVsZW1lbnQsXG4gICAgICBhdHRyaWJ1dGVzOiBuZXcgU2V0KGF0dHJpYnV0ZXMpLFxuICAgICAgdXNlZERpcmVjdGl2ZXM6IG5ldyBTZXQodXNlZERpcmVjdGl2ZXMubWFwKGRpciA9PiBkaXIucmVmLm5vZGUpKSxcbiAgICB9O1xuICAgIHRoaXMuaWRlbnRpZmllcnMuYWRkKGVsSWQpO1xuXG4gICAgdGhpcy52aXNpdEFsbChlbGVtZW50LmNoaWxkcmVuKTtcbiAgICB0aGlzLnZpc2l0QWxsKGVsZW1lbnQucmVmZXJlbmNlcyk7XG4gIH1cbiAgdmlzaXRUZW1wbGF0ZSh0ZW1wbGF0ZTogVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgdGhpcy52aXNpdEFsbCh0ZW1wbGF0ZS5hdHRyaWJ1dGVzKTtcbiAgICB0aGlzLnZpc2l0QWxsKHRlbXBsYXRlLmNoaWxkcmVuKTtcbiAgICB0aGlzLnZpc2l0QWxsKHRlbXBsYXRlLnJlZmVyZW5jZXMpO1xuICAgIHRoaXMudmlzaXRBbGwodGVtcGxhdGUudmFyaWFibGVzKTtcbiAgfVxuICB2aXNpdEJvdW5kVGV4dCh0ZXh0OiBUbXBsQXN0Qm91bmRUZXh0KSB7IHRoaXMudmlzaXRFeHByZXNzaW9uKHRleHQpOyB9XG5cbiAgLyoqXG4gICAqIFZpc2l0cyBhIG5vZGUncyBleHByZXNzaW9uIGFuZCBhZGRzIGl0cyBpZGVudGlmaWVycywgaWYgYW55LCB0byB0aGUgdmlzaXRvcidzIHN0YXRlLlxuICAgKlxuICAgKiBAcGFyYW0gbm9kZSBub2RlIHdob3NlIGV4cHJlc3Npb24gdG8gdmlzaXRcbiAgICovXG4gIHByaXZhdGUgdmlzaXRFeHByZXNzaW9uKG5vZGU6IFRtcGxBc3ROb2RlJnt2YWx1ZTogQVNUfSkge1xuICAgIGNvbnN0IGlkZW50aWZpZXJzID0gRXhwcmVzc2lvblZpc2l0b3IuZ2V0SWRlbnRpZmllcnMobm9kZS52YWx1ZSwgbm9kZSwgdGhpcy5ib3VuZFRlbXBsYXRlKTtcbiAgICBpZGVudGlmaWVycy5mb3JFYWNoKGlkID0+IHRoaXMuaWRlbnRpZmllcnMuYWRkKGlkKSk7XG4gIH1cbn1cblxuLyoqXG4gKiBUcmF2ZXJzZXMgYSB0ZW1wbGF0ZSBBU1QgYW5kIGJ1aWxkcyBpZGVudGlmaWVycyBkaXNjb3ZlcmVkIGluIGl0LlxuICpcbiAqIEBwYXJhbSBib3VuZFRlbXBsYXRlIGJvdW5kIHRlbXBsYXRlIHRhcmdldCwgd2hpY2ggY2FuIGJlIHVzZWQgZm9yIHF1ZXJ5aW5nIGV4cHJlc3Npb24gdGFyZ2V0cy5cbiAqIEByZXR1cm4gaWRlbnRpZmllcnMgaW4gdGVtcGxhdGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFRlbXBsYXRlSWRlbnRpZmllcnMoYm91bmRUZW1wbGF0ZTogQm91bmRUYXJnZXQ8Q29tcG9uZW50TWV0YT4pOlxuICAgIFNldDxUb3BMZXZlbElkZW50aWZpZXI+IHtcbiAgY29uc3QgdmlzaXRvciA9IG5ldyBUZW1wbGF0ZVZpc2l0b3IoYm91bmRUZW1wbGF0ZSk7XG4gIGlmIChib3VuZFRlbXBsYXRlLnRhcmdldC50ZW1wbGF0ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdmlzaXRvci52aXNpdEFsbChib3VuZFRlbXBsYXRlLnRhcmdldC50ZW1wbGF0ZSk7XG4gIH1cbiAgcmV0dXJuIHZpc2l0b3IuaWRlbnRpZmllcnM7XG59XG4iXX0=