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
                usedDirectives: new Set(usedDirectives.map(function (dir) {
                    return {
                        node: dir.ref.node,
                        selector: dir.selector,
                    };
                })),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2luZGV4ZXIvc3JjL3RlbXBsYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUE2TTtJQUM3TSx1RUFBK0s7SUFjL0s7Ozs7Ozs7O09BUUc7SUFDSDtRQUFnQyw2Q0FBbUI7UUFHakQsMkJBQ0ksT0FBb0IsRUFBbUIsYUFBeUMsRUFDL0QsYUFBNkMsRUFDN0MsY0FBZ0Q7WUFEaEQsOEJBQUEsRUFBQSxnQkFBZ0IsT0FBTyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUU7WUFDN0MsK0JBQUEsRUFBQSxpQkFBaUIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTTtZQUhyRSxZQUlFLGlCQUFPLFNBQ1I7WUFKMEMsbUJBQWEsR0FBYixhQUFhLENBQTRCO1lBQy9ELG1CQUFhLEdBQWIsYUFBYSxDQUFnQztZQUM3QyxvQkFBYyxHQUFkLGNBQWMsQ0FBa0M7WUFMNUQsaUJBQVcsR0FBMkIsRUFBRSxDQUFDOztRQU9sRCxDQUFDO1FBRUQ7Ozs7Ozs7V0FPRztRQUNJLGdDQUFjLEdBQXJCLFVBQXNCLEdBQVEsRUFBRSxPQUFvQixFQUFFLGFBQXlDO1lBRTdGLElBQU0sT0FBTyxHQUFHLElBQUksaUJBQWlCLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQzlELE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbkIsT0FBTyxPQUFPLENBQUMsV0FBVyxDQUFDO1FBQzdCLENBQUM7UUFFRCxpQ0FBSyxHQUFMLFVBQU0sR0FBUSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXBDLDJDQUFlLEdBQWYsVUFBZ0IsR0FBZSxFQUFFLE9BQVc7WUFD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LEdBZ0ZwRDtJQUVEOzs7OztPQUtHO0lBQ0gsU0FBZ0Isc0JBQXNCLENBQUMsYUFBeUM7UUFFOUUsSUFBTSxPQUFPLEdBQUcsSUFBSSxlQUFlLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDbkQsSUFBSSxhQUFhLENBQUMsTUFBTSxDQUFDLFFBQVEsS0FBSyxTQUFTLEVBQUU7WUFDL0MsT0FBTyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ2pEO1FBQ0QsT0FBTyxPQUFPLENBQUMsV0FBVyxDQUFDO0lBQzdCLENBQUM7SUFQRCx3REFPQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7QVNULCBCb3VuZFRhcmdldCwgSW1wbGljaXRSZWNlaXZlciwgTWV0aG9kQ2FsbCwgUHJvcGVydHlSZWFkLCBSZWN1cnNpdmVBc3RWaXNpdG9yLCBUbXBsQXN0Qm91bmRUZXh0LCBUbXBsQXN0RWxlbWVudCwgVG1wbEFzdE5vZGUsIFRtcGxBc3RSZWN1cnNpdmVWaXNpdG9yLCBUbXBsQXN0VGVtcGxhdGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7QWJzb2x1dGVTb3VyY2VTcGFuLCBBdHRyaWJ1dGVJZGVudGlmaWVyLCBFbGVtZW50SWRlbnRpZmllciwgSWRlbnRpZmllcktpbmQsIE1ldGhvZElkZW50aWZpZXIsIFByb3BlcnR5SWRlbnRpZmllciwgVGVtcGxhdGVJZGVudGlmaWVyLCBUb3BMZXZlbElkZW50aWZpZXJ9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7Q29tcG9uZW50TWV0YX0gZnJvbSAnLi9jb250ZXh0JztcblxuLyoqXG4gKiBBIHBhcnNlZCBub2RlIGluIGEgdGVtcGxhdGUsIHdoaWNoIG1heSBoYXZlIGEgbmFtZSAoaWYgaXQgaXMgYSBzZWxlY3Rvcikgb3JcbiAqIGJlIGFub255bW91cyAobGlrZSBhIHRleHQgc3BhbikuXG4gKi9cbmludGVyZmFjZSBIVE1MTm9kZSBleHRlbmRzIFRtcGxBc3ROb2RlIHtcbiAgdGFnTmFtZT86IHN0cmluZztcbiAgbmFtZT86IHN0cmluZztcbn1cblxudHlwZSBFeHByZXNzaW9uSWRlbnRpZmllciA9IFByb3BlcnR5SWRlbnRpZmllciB8IE1ldGhvZElkZW50aWZpZXI7XG5cbi8qKlxuICogVmlzaXRzIHRoZSBBU1Qgb2YgYW4gQW5ndWxhciB0ZW1wbGF0ZSBzeW50YXggZXhwcmVzc2lvbiwgZmluZGluZyBpbnRlcmVzdGluZ1xuICogZW50aXRpZXMgKHZhcmlhYmxlIHJlZmVyZW5jZXMsIGV0Yy4pLiBDcmVhdGVzIGFuIGFycmF5IG9mIEVudGl0aWVzIGZvdW5kIGluXG4gKiB0aGUgZXhwcmVzc2lvbiwgd2l0aCB0aGUgbG9jYXRpb24gb2YgdGhlIEVudGl0aWVzIGJlaW5nIHJlbGF0aXZlIHRvIHRoZVxuICogZXhwcmVzc2lvbi5cbiAqXG4gKiBWaXNpdGluZyBgdGV4dCB7e3Byb3B9fWAgd2lsbCByZXR1cm5cbiAqIGBbVG9wTGV2ZWxJZGVudGlmaWVyIHtuYW1lOiAncHJvcCcsIHNwYW46IHtzdGFydDogNywgZW5kOiAxMX19XWAuXG4gKi9cbmNsYXNzIEV4cHJlc3Npb25WaXNpdG9yIGV4dGVuZHMgUmVjdXJzaXZlQXN0VmlzaXRvciB7XG4gIHJlYWRvbmx5IGlkZW50aWZpZXJzOiBFeHByZXNzaW9uSWRlbnRpZmllcltdID0gW107XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihcbiAgICAgIGNvbnRleHQ6IFRtcGxBc3ROb2RlLCBwcml2YXRlIHJlYWRvbmx5IGJvdW5kVGVtcGxhdGU6IEJvdW5kVGFyZ2V0PENvbXBvbmVudE1ldGE+LFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBleHByZXNzaW9uU3RyID0gY29udGV4dC5zb3VyY2VTcGFuLnRvU3RyaW5nKCksXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGFic29sdXRlT2Zmc2V0ID0gY29udGV4dC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBpZGVudGlmaWVycyBkaXNjb3ZlcmVkIGluIGFuIGV4cHJlc3Npb24uXG4gICAqXG4gICAqIEBwYXJhbSBhc3QgZXhwcmVzc2lvbiBBU1QgdG8gdmlzaXRcbiAgICogQHBhcmFtIGNvbnRleHQgSFRNTCBub2RlIGV4cHJlc3Npb24gaXMgZGVmaW5lZCBpblxuICAgKiBAcGFyYW0gYm91bmRUZW1wbGF0ZSBib3VuZCB0YXJnZXQgb2YgdGhlIGVudGlyZSB0ZW1wbGF0ZSwgd2hpY2ggY2FuIGJlIHVzZWQgdG8gcXVlcnkgZm9yIHRoZVxuICAgKiBlbnRpdGllcyBleHByZXNzaW9ucyB0YXJnZXQuXG4gICAqL1xuICBzdGF0aWMgZ2V0SWRlbnRpZmllcnMoYXN0OiBBU1QsIGNvbnRleHQ6IFRtcGxBc3ROb2RlLCBib3VuZFRlbXBsYXRlOiBCb3VuZFRhcmdldDxDb21wb25lbnRNZXRhPik6XG4gICAgICBUb3BMZXZlbElkZW50aWZpZXJbXSB7XG4gICAgY29uc3QgdmlzaXRvciA9IG5ldyBFeHByZXNzaW9uVmlzaXRvcihjb250ZXh0LCBib3VuZFRlbXBsYXRlKTtcbiAgICB2aXNpdG9yLnZpc2l0KGFzdCk7XG4gICAgcmV0dXJuIHZpc2l0b3IuaWRlbnRpZmllcnM7XG4gIH1cblxuICB2aXNpdChhc3Q6IEFTVCkgeyBhc3QudmlzaXQodGhpcyk7IH1cblxuICB2aXNpdE1ldGhvZENhbGwoYXN0OiBNZXRob2RDYWxsLCBjb250ZXh0OiB7fSkge1xuICAgIHRoaXMudmlzaXRJZGVudGlmaWVyKGFzdCwgSWRlbnRpZmllcktpbmQuTWV0aG9kKTtcbiAgICBzdXBlci52aXNpdE1ldGhvZENhbGwoYXN0LCBjb250ZXh0KTtcbiAgfVxuXG4gIHZpc2l0UHJvcGVydHlSZWFkKGFzdDogUHJvcGVydHlSZWFkLCBjb250ZXh0OiB7fSkge1xuICAgIHRoaXMudmlzaXRJZGVudGlmaWVyKGFzdCwgSWRlbnRpZmllcktpbmQuUHJvcGVydHkpO1xuICAgIHN1cGVyLnZpc2l0UHJvcGVydHlSZWFkKGFzdCwgY29udGV4dCk7XG4gIH1cblxuICAvKipcbiAgICogVmlzaXRzIGFuIGlkZW50aWZpZXIsIGFkZGluZyBpdCB0byB0aGUgaWRlbnRpZmllciBzdG9yZSBpZiBpdCBpcyB1c2VmdWwgZm9yIGluZGV4aW5nLlxuICAgKlxuICAgKiBAcGFyYW0gYXN0IGV4cHJlc3Npb24gQVNUIHRoZSBpZGVudGlmaWVyIGlzIGluXG4gICAqIEBwYXJhbSBraW5kIGlkZW50aWZpZXIga2luZFxuICAgKi9cbiAgcHJpdmF0ZSB2aXNpdElkZW50aWZpZXIoXG4gICAgICBhc3Q6IEFTVCZ7bmFtZTogc3RyaW5nLCByZWNlaXZlcjogQVNUfSwga2luZDogRXhwcmVzc2lvbklkZW50aWZpZXJbJ2tpbmQnXSkge1xuICAgIC8vIFRoZSBkZWZpbml0aW9uIG9mIGEgbm9uLXRvcC1sZXZlbCBwcm9wZXJ0eSBzdWNoIGFzIGBiYXJgIGluIGB7e2Zvby5iYXJ9fWAgaXMgY3VycmVudGx5XG4gICAgLy8gaW1wb3NzaWJsZSB0byBkZXRlcm1pbmUgYnkgYW4gaW5kZXhlciBhbmQgdW5zdXBwb3J0ZWQgYnkgdGhlIGluZGV4aW5nIG1vZHVsZS5cbiAgICAvLyBUaGUgaW5kZXhpbmcgbW9kdWxlIGFsc28gZG9lcyBub3QgY3VycmVudGx5IHN1cHBvcnQgcmVmZXJlbmNlcyB0byBpZGVudGlmaWVycyBkZWNsYXJlZCBpbiB0aGVcbiAgICAvLyB0ZW1wbGF0ZSBpdHNlbGYsIHdoaWNoIGhhdmUgYSBub24tbnVsbCBleHByZXNzaW9uIHRhcmdldC5cbiAgICBpZiAoIShhc3QucmVjZWl2ZXIgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyKSB8fFxuICAgICAgICB0aGlzLmJvdW5kVGVtcGxhdGUuZ2V0RXhwcmVzc2lvblRhcmdldChhc3QpICE9PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gR2V0IHRoZSBsb2NhdGlvbiBvZiB0aGUgaWRlbnRpZmllciBvZiByZWFsIGludGVyZXN0LlxuICAgIC8vIFRoZSBjb21waWxlcidzIGV4cHJlc3Npb24gcGFyc2VyIHJlY29yZHMgdGhlIGxvY2F0aW9uIG9mIHNvbWUgZXhwcmVzc2lvbnMgaW4gYSBtYW5uZXIgbm90XG4gICAgLy8gdXNlZnVsIHRvIHRoZSBpbmRleGVyLiBGb3IgZXhhbXBsZSwgYSBgTWV0aG9kQ2FsbGAgYGZvbyhhLCBiKWAgd2lsbCByZWNvcmQgdGhlIHNwYW4gb2YgdGhlXG4gICAgLy8gZW50aXJlIG1ldGhvZCBjYWxsLCBidXQgdGhlIGluZGV4ZXIgaXMgaW50ZXJlc3RlZCBvbmx5IGluIHRoZSBtZXRob2QgaWRlbnRpZmllci5cbiAgICBjb25zdCBsb2NhbEV4cHJlc3Npb24gPSB0aGlzLmV4cHJlc3Npb25TdHIuc3Vic3RyKGFzdC5zcGFuLnN0YXJ0LCBhc3Quc3Bhbi5lbmQpO1xuICAgIGlmICghbG9jYWxFeHByZXNzaW9uLmluY2x1ZGVzKGFzdC5uYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbXBvc3NpYmxlIHN0YXRlOiBcIiR7YXN0Lm5hbWV9XCIgbm90IGZvdW5kIGluIFwiJHtsb2NhbEV4cHJlc3Npb259XCJgKTtcbiAgICB9XG4gICAgY29uc3QgaWRlbnRpZmllclN0YXJ0ID0gYXN0LnNwYW4uc3RhcnQgKyBsb2NhbEV4cHJlc3Npb24uaW5kZXhPZihhc3QubmFtZSk7XG5cbiAgICAvLyBKb2luIHRoZSByZWxhdGl2ZSBwb3NpdGlvbiBvZiB0aGUgZXhwcmVzc2lvbiB3aXRoaW4gYSBub2RlIHdpdGggdGhlIGFic29sdXRlIHBvc2l0aW9uXG4gICAgLy8gb2YgdGhlIG5vZGUgdG8gZ2V0IHRoZSBhYnNvbHV0ZSBwb3NpdGlvbiBvZiB0aGUgZXhwcmVzc2lvbiBpbiB0aGUgc291cmNlIGNvZGUuXG4gICAgY29uc3QgYWJzb2x1dGVTdGFydCA9IHRoaXMuYWJzb2x1dGVPZmZzZXQgKyBpZGVudGlmaWVyU3RhcnQ7XG4gICAgY29uc3Qgc3BhbiA9IG5ldyBBYnNvbHV0ZVNvdXJjZVNwYW4oYWJzb2x1dGVTdGFydCwgYWJzb2x1dGVTdGFydCArIGFzdC5uYW1lLmxlbmd0aCk7XG5cbiAgICB0aGlzLmlkZW50aWZpZXJzLnB1c2goeyBuYW1lOiBhc3QubmFtZSwgc3Bhbiwga2luZCwgfSBhcyBFeHByZXNzaW9uSWRlbnRpZmllcik7XG4gIH1cbn1cblxuLyoqXG4gKiBWaXNpdHMgdGhlIEFTVCBvZiBhIHBhcnNlZCBBbmd1bGFyIHRlbXBsYXRlLiBEaXNjb3ZlcnMgYW5kIHN0b3Jlc1xuICogaWRlbnRpZmllcnMgb2YgaW50ZXJlc3QsIGRlZmVycmluZyB0byBhbiBgRXhwcmVzc2lvblZpc2l0b3JgIGFzIG5lZWRlZC5cbiAqL1xuY2xhc3MgVGVtcGxhdGVWaXNpdG9yIGV4dGVuZHMgVG1wbEFzdFJlY3Vyc2l2ZVZpc2l0b3Ige1xuICAvLyBpZGVudGlmaWVycyBvZiBpbnRlcmVzdCBmb3VuZCBpbiB0aGUgdGVtcGxhdGVcbiAgcmVhZG9ubHkgaWRlbnRpZmllcnMgPSBuZXcgU2V0PFRvcExldmVsSWRlbnRpZmllcj4oKTtcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIHRlbXBsYXRlIHZpc2l0b3IgZm9yIGEgYm91bmQgdGVtcGxhdGUgdGFyZ2V0LiBUaGUgYm91bmQgdGFyZ2V0IGNhbiBiZSB1c2VkIHdoZW5cbiAgICogZGVmZXJyZWQgdG8gdGhlIGV4cHJlc3Npb24gdmlzaXRvciB0byBnZXQgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHRhcmdldCBvZiBhbiBleHByZXNzaW9uLlxuICAgKlxuICAgKiBAcGFyYW0gYm91bmRUZW1wbGF0ZSBib3VuZCB0ZW1wbGF0ZSB0YXJnZXRcbiAgICovXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgYm91bmRUZW1wbGF0ZTogQm91bmRUYXJnZXQ8Q29tcG9uZW50TWV0YT4pIHsgc3VwZXIoKTsgfVxuXG4gIC8qKlxuICAgKiBWaXNpdHMgYSBub2RlIGluIHRoZSB0ZW1wbGF0ZS5cbiAgICpcbiAgICogQHBhcmFtIG5vZGUgbm9kZSB0byB2aXNpdFxuICAgKi9cbiAgdmlzaXQobm9kZTogSFRNTE5vZGUpIHsgbm9kZS52aXNpdCh0aGlzKTsgfVxuXG4gIHZpc2l0QWxsKG5vZGVzOiBUbXBsQXN0Tm9kZVtdKSB7IG5vZGVzLmZvckVhY2gobm9kZSA9PiB0aGlzLnZpc2l0KG5vZGUpKTsgfVxuXG4gIC8qKlxuICAgKiBBZGQgYW4gaWRlbnRpZmllciBmb3IgYW4gSFRNTCBlbGVtZW50IGFuZCB2aXNpdCBpdHMgY2hpbGRyZW4gcmVjdXJzaXZlbHkuXG4gICAqXG4gICAqIEBwYXJhbSBlbGVtZW50XG4gICAqL1xuICB2aXNpdEVsZW1lbnQoZWxlbWVudDogVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAvLyBSZWNvcmQgdGhlIGVsZW1lbnQncyBhdHRyaWJ1dGVzLCB3aGljaCBhbiBpbmRleGVyIGNhbiBsYXRlciB0cmF2ZXJzZSB0byBzZWUgaWYgYW55IG9mIHRoZW1cbiAgICAvLyBzcGVjaWZ5IGEgdXNlZCBkaXJlY3RpdmUgb24gdGhlIGVsZW1lbnQuXG4gICAgY29uc3QgYXR0cmlidXRlcyA9IGVsZW1lbnQuYXR0cmlidXRlcy5tYXAoKHtuYW1lLCB2YWx1ZSwgc291cmNlU3Bhbn0pOiBBdHRyaWJ1dGVJZGVudGlmaWVyID0+IHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIHNwYW46IG5ldyBBYnNvbHV0ZVNvdXJjZVNwYW4oc291cmNlU3Bhbi5zdGFydC5vZmZzZXQsIHNvdXJjZVNwYW4uZW5kLm9mZnNldCksXG4gICAgICAgIGtpbmQ6IElkZW50aWZpZXJLaW5kLkF0dHJpYnV0ZSxcbiAgICAgIH07XG4gICAgfSk7XG4gICAgY29uc3QgdXNlZERpcmVjdGl2ZXMgPSB0aGlzLmJvdW5kVGVtcGxhdGUuZ2V0RGlyZWN0aXZlc09mTm9kZShlbGVtZW50KSB8fCBbXTtcbiAgICBjb25zdCB7bmFtZSwgc291cmNlU3Bhbn0gPSBlbGVtZW50O1xuICAgIC8vIEFuIGVsZW1lbnQncyBzb3VyY2Ugc3BhbiBjYW4gYmUgb2YgdGhlIGZvcm0gYDxlbGVtZW50PmAsIGA8ZWxlbWVudCAvPmAsIG9yXG4gICAgLy8gYDxlbGVtZW50PjwvZWxlbWVudD5gLiBPbmx5IHRoZSBzZWxlY3RvciBpcyBpbnRlcmVzdGluZyB0byB0aGUgaW5kZXhlciwgc28gdGhlIHNvdXJjZSBpc1xuICAgIC8vIHNlYXJjaGVkIGZvciB0aGUgZmlyc3Qgb2NjdXJyZW5jZSBvZiB0aGUgZWxlbWVudCAoc2VsZWN0b3IpIG5hbWUuXG4gICAgY29uc3QgbG9jYWxTdHIgPSBzb3VyY2VTcGFuLnRvU3RyaW5nKCk7XG4gICAgaWYgKCFsb2NhbFN0ci5pbmNsdWRlcyhuYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbXBvc3NpYmxlIHN0YXRlOiBcIiR7bmFtZX1cIiBub3QgZm91bmQgaW4gXCIke2xvY2FsU3RyfVwiYCk7XG4gICAgfVxuICAgIGNvbnN0IHN0YXJ0ID0gc291cmNlU3Bhbi5zdGFydC5vZmZzZXQgKyBsb2NhbFN0ci5pbmRleE9mKG5hbWUpO1xuICAgIGNvbnN0IGVsSWQ6IEVsZW1lbnRJZGVudGlmaWVyID0ge1xuICAgICAgbmFtZSxcbiAgICAgIHNwYW46IG5ldyBBYnNvbHV0ZVNvdXJjZVNwYW4oc3RhcnQsIHN0YXJ0ICsgbmFtZS5sZW5ndGgpLFxuICAgICAga2luZDogSWRlbnRpZmllcktpbmQuRWxlbWVudCxcbiAgICAgIGF0dHJpYnV0ZXM6IG5ldyBTZXQoYXR0cmlidXRlcyksXG4gICAgICB1c2VkRGlyZWN0aXZlczogbmV3IFNldCh1c2VkRGlyZWN0aXZlcy5tYXAoZGlyID0+IHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBub2RlOiBkaXIucmVmLm5vZGUsXG4gICAgICAgICAgc2VsZWN0b3I6IGRpci5zZWxlY3RvcixcbiAgICAgICAgfTtcbiAgICAgIH0pKSxcbiAgICB9O1xuICAgIHRoaXMuaWRlbnRpZmllcnMuYWRkKGVsSWQpO1xuXG4gICAgdGhpcy52aXNpdEFsbChlbGVtZW50LmNoaWxkcmVuKTtcbiAgICB0aGlzLnZpc2l0QWxsKGVsZW1lbnQucmVmZXJlbmNlcyk7XG4gIH1cbiAgdmlzaXRUZW1wbGF0ZSh0ZW1wbGF0ZTogVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgdGhpcy52aXNpdEFsbCh0ZW1wbGF0ZS5hdHRyaWJ1dGVzKTtcbiAgICB0aGlzLnZpc2l0QWxsKHRlbXBsYXRlLmNoaWxkcmVuKTtcbiAgICB0aGlzLnZpc2l0QWxsKHRlbXBsYXRlLnJlZmVyZW5jZXMpO1xuICAgIHRoaXMudmlzaXRBbGwodGVtcGxhdGUudmFyaWFibGVzKTtcbiAgfVxuICB2aXNpdEJvdW5kVGV4dCh0ZXh0OiBUbXBsQXN0Qm91bmRUZXh0KSB7IHRoaXMudmlzaXRFeHByZXNzaW9uKHRleHQpOyB9XG5cbiAgLyoqXG4gICAqIFZpc2l0cyBhIG5vZGUncyBleHByZXNzaW9uIGFuZCBhZGRzIGl0cyBpZGVudGlmaWVycywgaWYgYW55LCB0byB0aGUgdmlzaXRvcidzIHN0YXRlLlxuICAgKlxuICAgKiBAcGFyYW0gbm9kZSBub2RlIHdob3NlIGV4cHJlc3Npb24gdG8gdmlzaXRcbiAgICovXG4gIHByaXZhdGUgdmlzaXRFeHByZXNzaW9uKG5vZGU6IFRtcGxBc3ROb2RlJnt2YWx1ZTogQVNUfSkge1xuICAgIGNvbnN0IGlkZW50aWZpZXJzID0gRXhwcmVzc2lvblZpc2l0b3IuZ2V0SWRlbnRpZmllcnMobm9kZS52YWx1ZSwgbm9kZSwgdGhpcy5ib3VuZFRlbXBsYXRlKTtcbiAgICBpZGVudGlmaWVycy5mb3JFYWNoKGlkID0+IHRoaXMuaWRlbnRpZmllcnMuYWRkKGlkKSk7XG4gIH1cbn1cblxuLyoqXG4gKiBUcmF2ZXJzZXMgYSB0ZW1wbGF0ZSBBU1QgYW5kIGJ1aWxkcyBpZGVudGlmaWVycyBkaXNjb3ZlcmVkIGluIGl0LlxuICpcbiAqIEBwYXJhbSBib3VuZFRlbXBsYXRlIGJvdW5kIHRlbXBsYXRlIHRhcmdldCwgd2hpY2ggY2FuIGJlIHVzZWQgZm9yIHF1ZXJ5aW5nIGV4cHJlc3Npb24gdGFyZ2V0cy5cbiAqIEByZXR1cm4gaWRlbnRpZmllcnMgaW4gdGVtcGxhdGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFRlbXBsYXRlSWRlbnRpZmllcnMoYm91bmRUZW1wbGF0ZTogQm91bmRUYXJnZXQ8Q29tcG9uZW50TWV0YT4pOlxuICAgIFNldDxUb3BMZXZlbElkZW50aWZpZXI+IHtcbiAgY29uc3QgdmlzaXRvciA9IG5ldyBUZW1wbGF0ZVZpc2l0b3IoYm91bmRUZW1wbGF0ZSk7XG4gIGlmIChib3VuZFRlbXBsYXRlLnRhcmdldC50ZW1wbGF0ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdmlzaXRvci52aXNpdEFsbChib3VuZFRlbXBsYXRlLnRhcmdldC50ZW1wbGF0ZSk7XG4gIH1cbiAgcmV0dXJuIHZpc2l0b3IuaWRlbnRpZmllcnM7XG59XG4iXX0=