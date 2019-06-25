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
        define("@angular/compiler-cli/src/ngtsc/indexer/src/template", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler/src/render3/r3_ast", "@angular/compiler/src/render3/r3_template_transform", "@angular/compiler/src/render3/view/i18n/meta", "@angular/compiler/src/render3/view/template", "@angular/compiler-cli/src/ngtsc/indexer/src/api"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var r3_ast_1 = require("@angular/compiler/src/render3/r3_ast");
    var r3_template_transform_1 = require("@angular/compiler/src/render3/r3_template_transform");
    var meta_1 = require("@angular/compiler/src/render3/view/i18n/meta");
    var template_1 = require("@angular/compiler/src/render3/view/template");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/indexer/src/api");
    /**
     * Updates the location of an identifier to its real anchor in a source code.
     *
     * The compiler's expression parser records the location of some expressions in a manner not
     * useful to the indexer. For example, a `MethodCall` `foo(a, b)` will record the span of the
     * entire method call, but the indexer is interested only in the method identifier.
     *
     * To remedy all this, the visitor tokenizes the template node the expression was discovered in,
     * and updates the locations of entities found during expression traversal with those of the
     * tokens.
     *
     * TODO(ayazhafiz): Think about how to handle `PropertyRead`s in `BoundAttribute`s. The Lexer
     * tokenizes the attribute as a string and ignores quotes.
     *
     * @param entities entities to update
     * @param currentNode node expression was in
     */
    function updateIdentifierSpans(identifiers, currentNode) {
        var localSpan = currentNode.sourceSpan;
        var localExpression = localSpan.toString();
        var lexedIdentifiers = new compiler_1.Lexer().tokenize(localExpression).filter(function (token) { return token.type === compiler_1.TokenType.Identifier; });
        // Join the relative position of the expression within a node with the absolute position of the
        // node to get the absolute position of the expression in the source code.
        var absoluteOffset = currentNode.sourceSpan.start.offset;
        identifiers.forEach(function (id, index) {
            var lexedId = lexedIdentifiers[index];
            if (id.name !== lexedId.strValue) {
                throw new Error('Impossible state: lexed and parsed expression should contain the same tokens.');
            }
            var start = absoluteOffset + lexedId.index;
            var absoluteSpan = new api_1.AbsoluteSourceSpan(start, start + lexedId.strValue.length);
            id.span = absoluteSpan;
        });
    }
    /**
     * Visits the AST of an Angular template syntax expression, finding interesting
     * entities (variable references, etc.). Creates an array of Entities found in
     * the expression, with the location of the Entities being relative to the
     * expression.
     *
     * Visiting `text {{prop}}` will return `[TemplateIdentifier {name: 'prop', span: {start: 7, end:
     * 11}}]`.
     */
    var ExpressionVisitor = /** @class */ (function (_super) {
        tslib_1.__extends(ExpressionVisitor, _super);
        function ExpressionVisitor(context, identifiers) {
            if (identifiers === void 0) { identifiers = []; }
            var _this = _super.call(this) || this;
            _this.identifiers = identifiers;
            _this.file = context.sourceSpan.start.file;
            return _this;
        }
        ExpressionVisitor.getIdentifiers = function (ast, context) {
            var visitor = new ExpressionVisitor(context);
            visitor.visit(ast);
            var identifiers = visitor.identifiers;
            updateIdentifierSpans(identifiers, context);
            return identifiers;
        };
        ExpressionVisitor.prototype.visit = function (ast) { ast.visit(this); };
        ExpressionVisitor.prototype.visitMethodCall = function (ast, context) {
            this.addIdentifier(ast, api_1.IdentifierKind.Method);
            _super.prototype.visitMethodCall.call(this, ast, context);
        };
        ExpressionVisitor.prototype.visitPropertyRead = function (ast, context) {
            this.addIdentifier(ast, api_1.IdentifierKind.Property);
            _super.prototype.visitPropertyRead.call(this, ast, context);
        };
        ExpressionVisitor.prototype.addIdentifier = function (ast, kind) {
            this.identifiers.push({
                name: ast.name,
                span: ast.span, kind: kind,
                file: this.file,
            });
        };
        return ExpressionVisitor;
    }(compiler_1.RecursiveAstVisitor));
    /**
     * Visits the AST of a parsed Angular template. Discovers and stores
     * identifiers of interest, deferring to an `ExpressionVisitor` as needed.
     */
    var TemplateVisitor = /** @class */ (function (_super) {
        tslib_1.__extends(TemplateVisitor, _super);
        function TemplateVisitor() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            // identifiers of interest found in the template
            _this.identifiers = new Set();
            return _this;
        }
        /**
         * Visits a node in the template.
         * @param node node to visit
         */
        TemplateVisitor.prototype.visit = function (node) { node.visit(this); };
        TemplateVisitor.prototype.visitAll = function (nodes) {
            var _this = this;
            nodes.forEach(function (node) { return _this.visit(node); });
        };
        TemplateVisitor.prototype.visitElement = function (element) {
            this.visitAll(element.attributes);
            this.visitAll(element.children);
            this.visitAll(element.references);
        };
        TemplateVisitor.prototype.visitTemplate = function (template) {
            this.visitAll(template.attributes);
            this.visitAll(template.children);
            this.visitAll(template.references);
            this.visitAll(template.variables);
        };
        TemplateVisitor.prototype.visitBoundText = function (text) { this.addIdentifiers(text); };
        /**
         * Adds identifiers to the visitor's state.
         * @param visitedEntities interesting entities to add as identifiers
         * @param curretNode node entities were discovered in
         */
        TemplateVisitor.prototype.addIdentifiers = function (node) {
            var _this = this;
            var identifiers = ExpressionVisitor.getIdentifiers(node.value, node);
            identifiers.forEach(function (id) { return _this.identifiers.add(id); });
        };
        return TemplateVisitor;
    }(r3_ast_1.RecursiveVisitor));
    /**
     * Unwraps and reparses a template, preserving whitespace and with no leading trivial characters.
     *
     * A template may previously have been parsed without preserving whitespace, and was definitely
     * parsed with leading trivial characters (see `parseTemplate` from the compiler package API).
     * Both of these are detrimental for indexing as they result in a manipulated AST not representing
     * the template source code.
     *
     * TODO(ayazhafiz): Remove once issues with `leadingTriviaChars` and `parseTemplate` are resolved.
     */
    function restoreTemplate(template, options) {
        // try to recapture the template content and URL
        // if there was nothing in the template to begin with, this is just a no-op
        if (template.length === 0) {
            return [];
        }
        var _a = template[0].sourceSpan.start.file, templateStr = _a.content, templateUrl = _a.url;
        options.preserveWhitespaces = true;
        var interpolationConfig = options.interpolationConfig, preserveWhitespaces = options.preserveWhitespaces;
        var bindingParser = template_1.makeBindingParser(interpolationConfig);
        var htmlParser = new compiler_1.HtmlParser();
        var parseResult = htmlParser.parse(templateStr, templateUrl, tslib_1.__assign({}, options, { tokenizeExpansionForms: true }));
        if (parseResult.errors && parseResult.errors.length > 0) {
            throw new Error('Impossible state: template must have been successfully parsed previously.');
        }
        var rootNodes = compiler_1.visitAll(new meta_1.I18nMetaVisitor(interpolationConfig, !preserveWhitespaces), parseResult.rootNodes);
        var _b = r3_template_transform_1.htmlAstToRender3Ast(rootNodes, bindingParser), nodes = _b.nodes, errors = _b.errors;
        if (errors && errors.length > 0) {
            throw new Error('Impossible state: template must have been successfully parsed previously.');
        }
        return nodes;
    }
    /**
     * Traverses a template AST and builds identifiers discovered in it.
     * @param template template to extract indentifiers from
     * @param options options for restoring the parsed template to a indexable state
     * @return identifiers in template
     */
    function getTemplateIdentifiers(template, options) {
        var restoredTemplate = restoreTemplate(template, options);
        var visitor = new TemplateVisitor();
        visitor.visitAll(restoredTemplate);
        return visitor.identifiers;
    }
    exports.getTemplateIdentifiers = getTemplateIdentifiers;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2luZGV4ZXIvc3JjL3RlbXBsYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUEySjtJQUMzSiwrREFBc0k7SUFDdEksNkZBQXdGO0lBQ3hGLHFFQUE2RTtJQUM3RSx3RUFBOEU7SUFDOUUsdUVBQXFHO0lBV3JHOzs7Ozs7Ozs7Ozs7Ozs7O09BZ0JHO0lBQ0gsU0FBUyxxQkFBcUIsQ0FBQyxXQUFpQyxFQUFFLFdBQWlCO1FBQ2pGLElBQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxVQUFVLENBQUM7UUFDekMsSUFBTSxlQUFlLEdBQUcsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBRTdDLElBQU0sZ0JBQWdCLEdBQ2xCLElBQUksZ0JBQUssRUFBRSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBQSxLQUFLLElBQUksT0FBQSxLQUFLLENBQUMsSUFBSSxLQUFLLG9CQUFTLENBQUMsVUFBVSxFQUFuQyxDQUFtQyxDQUFDLENBQUM7UUFFL0YsK0ZBQStGO1FBQy9GLDBFQUEwRTtRQUMxRSxJQUFNLGNBQWMsR0FBRyxXQUFXLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7UUFDM0QsV0FBVyxDQUFDLE9BQU8sQ0FBQyxVQUFDLEVBQUUsRUFBRSxLQUFLO1lBQzVCLElBQU0sT0FBTyxHQUFHLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3hDLElBQUksRUFBRSxDQUFDLElBQUksS0FBSyxPQUFPLENBQUMsUUFBUSxFQUFFO2dCQUNoQyxNQUFNLElBQUksS0FBSyxDQUNYLCtFQUErRSxDQUFDLENBQUM7YUFDdEY7WUFFRCxJQUFNLEtBQUssR0FBRyxjQUFjLEdBQUcsT0FB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bnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBIdG1sUGFyc2VyLCBMZXhlciwgTWV0aG9kQ2FsbCwgUGFyc2VTb3VyY2VGaWxlLCBQcm9wZXJ0eVJlYWQsIFJlY3Vyc2l2ZUFzdFZpc2l0b3IsIFRtcGxBc3ROb2RlLCBUb2tlblR5cGUsIHZpc2l0QWxsfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge0JvdW5kVGV4dCwgRWxlbWVudCwgTm9kZSwgUmVjdXJzaXZlVmlzaXRvciBhcyBSZWN1cnNpdmVUZW1wbGF0ZVZpc2l0b3IsIFRlbXBsYXRlfSBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvcmVuZGVyMy9yM19hc3QnO1xuaW1wb3J0IHtodG1sQXN0VG9SZW5kZXIzQXN0fSBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvcmVuZGVyMy9yM190ZW1wbGF0ZV90cmFuc2Zvcm0nO1xuaW1wb3J0IHtJMThuTWV0YVZpc2l0b3J9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9yZW5kZXIzL3ZpZXcvaTE4bi9tZXRhJztcbmltcG9ydCB7bWFrZUJpbmRpbmdQYXJzZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9yZW5kZXIzL3ZpZXcvdGVtcGxhdGUnO1xuaW1wb3J0IHtBYnNvbHV0ZVNvdXJjZVNwYW4sIElkZW50aWZpZXJLaW5kLCBSZXN0b3JlVGVtcGxhdGVPcHRpb25zLCBUZW1wbGF0ZUlkZW50aWZpZXJ9IGZyb20gJy4vYXBpJztcblxuLyoqXG4gKiBBIHBhcnNlZCBub2RlIGluIGEgdGVtcGxhdGUsIHdoaWNoIG1heSBoYXZlIGEgbmFtZSAoaWYgaXQgaXMgYSBzZWxlY3Rvcikgb3JcbiAqIGJlIGFub255bW91cyAobGlrZSBhIHRleHQgc3BhbikuXG4gKi9cbmludGVyZmFjZSBIVE1MTm9kZSBleHRlbmRzIE5vZGUge1xuICB0YWdOYW1lPzogc3RyaW5nO1xuICBuYW1lPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIGxvY2F0aW9uIG9mIGFuIGlkZW50aWZpZXIgdG8gaXRzIHJlYWwgYW5jaG9yIGluIGEgc291cmNlIGNvZGUuXG4gKlxuICogVGhlIGNvbXBpbGVyJ3MgZXhwcmVzc2lvbiBwYXJzZXIgcmVjb3JkcyB0aGUgbG9jYXRpb24gb2Ygc29tZSBleHByZXNzaW9ucyBpbiBhIG1hbm5lciBub3RcbiAqIHVzZWZ1bCB0byB0aGUgaW5kZXhlci4gRm9yIGV4YW1wbGUsIGEgYE1ldGhvZENhbGxgIGBmb28oYSwgYilgIHdpbGwgcmVjb3JkIHRoZSBzcGFuIG9mIHRoZVxuICogZW50aXJlIG1ldGhvZCBjYWxsLCBidXQgdGhlIGluZGV4ZXIgaXMgaW50ZXJlc3RlZCBvbmx5IGluIHRoZSBtZXRob2QgaWRlbnRpZmllci5cbiAqXG4gKiBUbyByZW1lZHkgYWxsIHRoaXMsIHRoZSB2aXNpdG9yIHRva2VuaXplcyB0aGUgdGVtcGxhdGUgbm9kZSB0aGUgZXhwcmVzc2lvbiB3YXMgZGlzY292ZXJlZCBpbixcbiAqIGFuZCB1cGRhdGVzIHRoZSBsb2NhdGlvbnMgb2YgZW50aXRpZXMgZm91bmQgZHVyaW5nIGV4cHJlc3Npb24gdHJhdmVyc2FsIHdpdGggdGhvc2Ugb2YgdGhlXG4gKiB0b2tlbnMuXG4gKlxuICogVE9ETyhheWF6aGFmaXopOiBUaGluayBhYm91dCBob3cgdG8gaGFuZGxlIGBQcm9wZXJ0eVJlYWRgcyBpbiBgQm91bmRBdHRyaWJ1dGVgcy4gVGhlIExleGVyXG4gKiB0b2tlbml6ZXMgdGhlIGF0dHJpYnV0ZSBhcyBhIHN0cmluZyBhbmQgaWdub3JlcyBxdW90ZXMuXG4gKlxuICogQHBhcmFtIGVudGl0aWVzIGVudGl0aWVzIHRvIHVwZGF0ZVxuICogQHBhcmFtIGN1cnJlbnROb2RlIG5vZGUgZXhwcmVzc2lvbiB3YXMgaW5cbiAqL1xuZnVuY3Rpb24gdXBkYXRlSWRlbnRpZmllclNwYW5zKGlkZW50aWZpZXJzOiBUZW1wbGF0ZUlkZW50aWZpZXJbXSwgY3VycmVudE5vZGU6IE5vZGUpIHtcbiAgY29uc3QgbG9jYWxTcGFuID0gY3VycmVudE5vZGUuc291cmNlU3BhbjtcbiAgY29uc3QgbG9jYWxFeHByZXNzaW9uID0gbG9jYWxTcGFuLnRvU3RyaW5nKCk7XG5cbiAgY29uc3QgbGV4ZWRJZGVudGlmaWVycyA9XG4gICAgICBuZXcgTGV4ZXIoKS50b2tlbml6ZShsb2NhbEV4cHJlc3Npb24pLmZpbHRlcih0b2tlbiA9PiB0b2tlbi50eXBlID09PSBUb2tlblR5cGUuSWRlbnRpZmllcik7XG5cbiAgLy8gSm9pbiB0aGUgcmVsYXRpdmUgcG9zaXRpb24gb2YgdGhlIGV4cHJlc3Npb24gd2l0aGluIGEgbm9kZSB3aXRoIHRoZSBhYnNvbHV0ZSBwb3NpdGlvbiBvZiB0aGVcbiAgLy8gbm9kZSB0byBnZXQgdGhlIGFic29sdXRlIHBvc2l0aW9uIG9mIHRoZSBleHByZXNzaW9uIGluIHRoZSBzb3VyY2UgY29kZS5cbiAgY29uc3QgYWJzb2x1dGVPZmZzZXQgPSBjdXJyZW50Tm9kZS5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldDtcbiAgaWRlbnRpZmllcnMuZm9yRWFjaCgoaWQsIGluZGV4KSA9PiB7XG4gICAgY29uc3QgbGV4ZWRJZCA9IGxleGVkSWRlbnRpZmllcnNbaW5kZXhdO1xuICAgIGlmIChpZC5uYW1lICE9PSBsZXhlZElkLnN0clZhbHVlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ0ltcG9zc2libGUgc3RhdGU6IGxleGVkIGFuZCBwYXJzZWQgZXhwcmVzc2lvbiBzaG91bGQgY29udGFpbiB0aGUgc2FtZSB0b2tlbnMuJyk7XG4gICAgfVxuXG4gICAgY29uc3Qgc3RhcnQgPSBhYnNvbHV0ZU9mZnNldCArIGxleGVkSWQuaW5kZXg7XG4gICAgY29uc3QgYWJzb2x1dGVTcGFuID0gbmV3IEFic29sdXRlU291cmNlU3BhbihzdGFydCwgc3RhcnQgKyBsZXhlZElkLnN0clZhbHVlLmxlbmd0aCk7XG4gICAgaWQuc3BhbiA9IGFic29sdXRlU3BhbjtcbiAgfSk7XG59XG5cbi8qKlxuICogVmlzaXRzIHRoZSBBU1Qgb2YgYW4gQW5ndWxhciB0ZW1wbGF0ZSBzeW50YXggZXhwcmVzc2lvbiwgZmluZGluZyBpbnRlcmVzdGluZ1xuICogZW50aXRpZXMgKHZhcmlhYmxlIHJlZmVyZW5jZXMsIGV0Yy4pLiBDcmVhdGVzIGFuIGFycmF5IG9mIEVudGl0aWVzIGZvdW5kIGluXG4gKiB0aGUgZXhwcmVzc2lvbiwgd2l0aCB0aGUgbG9jYXRpb24gb2YgdGhlIEVudGl0aWVzIGJlaW5nIHJlbGF0aXZlIHRvIHRoZVxuICogZXhwcmVzc2lvbi5cbiAqXG4gKiBWaXNpdGluZyBgdGV4dCB7e3Byb3B9fWAgd2lsbCByZXR1cm4gYFtUZW1wbGF0ZUlkZW50aWZpZXIge25hbWU6ICdwcm9wJywgc3Bhbjoge3N0YXJ0OiA3LCBlbmQ6XG4gKiAxMX19XWAuXG4gKi9cbmNsYXNzIEV4cHJlc3Npb25WaXNpdG9yIGV4dGVuZHMgUmVjdXJzaXZlQXN0VmlzaXRvciB7XG4gIHByaXZhdGUgcmVhZG9ubHkgZmlsZTogUGFyc2VTb3VyY2VGaWxlO1xuXG4gIHByaXZhdGUgY29uc3RydWN0b3IoY29udGV4dDogTm9kZSwgcmVhZG9ubHkgaWRlbnRpZmllcnM6IFRlbXBsYXRlSWRlbnRpZmllcltdID0gW10pIHtcbiAgICBzdXBlcigpO1xuXG4gICAgdGhpcy5maWxlID0gY29udGV4dC5zb3VyY2VTcGFuLnN0YXJ0LmZpbGU7XG4gIH1cblxuICBzdGF0aWMgZ2V0SWRlbnRpZmllcnMoYXN0OiBBU1QsIGNvbnRleHQ6IE5vZGUpOiBUZW1wbGF0ZUlkZW50aWZpZXJbXSB7XG4gICAgY29uc3QgdmlzaXRvciA9IG5ldyBFeHByZXNzaW9uVmlzaXRvcihjb250ZXh0KTtcbiAgICB2aXNpdG9yLnZpc2l0KGFzdCk7XG4gICAgY29uc3QgaWRlbnRpZmllcnMgPSB2aXNpdG9yLmlkZW50aWZpZXJzO1xuXG4gICAgdXBkYXRlSWRlbnRpZmllclNwYW5zKGlkZW50aWZpZXJzLCBjb250ZXh0KTtcblxuICAgIHJldHVybiBpZGVudGlmaWVycztcbiAgfVxuXG4gIHZpc2l0KGFzdDogQVNUKSB7IGFzdC52aXNpdCh0aGlzKTsgfVxuXG4gIHZpc2l0TWV0aG9kQ2FsbChhc3Q6IE1ldGhvZENhbGwsIGNvbnRleHQ6IHt9KSB7XG4gICAgdGhpcy5hZGRJZGVudGlmaWVyKGFzdCwgSWRlbnRpZmllcktpbmQuTWV0aG9kKTtcbiAgICBzdXBlci52aXNpdE1ldGhvZENhbGwoYXN0LCBjb250ZXh0KTtcbiAgfVxuXG4gIHZpc2l0UHJvcGVydHlSZWFkKGFzdDogUHJvcGVydHlSZWFkLCBjb250ZXh0OiB7fSkge1xuICAgIHRoaXMuYWRkSWRlbnRpZmllcihhc3QsIElkZW50aWZpZXJLaW5kLlByb3BlcnR5KTtcbiAgICBzdXBlci52aXNpdFByb3BlcnR5UmVhZChhc3QsIGNvbnRleHQpO1xuICB9XG5cbiAgcHJpdmF0ZSBhZGRJZGVudGlmaWVyKGFzdDogQVNUJntuYW1lOiBzdHJpbmd9LCBraW5kOiBJZGVudGlmaWVyS2luZCkge1xuICAgIHRoaXMuaWRlbnRpZmllcnMucHVzaCh7XG4gICAgICBuYW1lOiBhc3QubmFtZSxcbiAgICAgIHNwYW46IGFzdC5zcGFuLCBraW5kLFxuICAgICAgZmlsZTogdGhpcy5maWxlLFxuICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogVmlzaXRzIHRoZSBBU1Qgb2YgYSBwYXJzZWQgQW5ndWxhciB0ZW1wbGF0ZS4gRGlzY292ZXJzIGFuZCBzdG9yZXNcbiAqIGlkZW50aWZpZXJzIG9mIGludGVyZXN0LCBkZWZlcnJpbmcgdG8gYW4gYEV4cHJlc3Npb25WaXNpdG9yYCBhcyBuZWVkZWQuXG4gKi9cbmNsYXNzIFRlbXBsYXRlVmlzaXRvciBleHRlbmRzIFJlY3Vyc2l2ZVRlbXBsYXRlVmlzaXRvciB7XG4gIC8vIGlkZW50aWZpZXJzIG9mIGludGVyZXN0IGZvdW5kIGluIHRoZSB0ZW1wbGF0ZVxuICByZWFkb25seSBpZGVudGlmaWVycyA9IG5ldyBTZXQ8VGVtcGxhdGVJZGVudGlmaWVyPigpO1xuXG4gIC8qKlxuICAgKiBWaXNpdHMgYSBub2RlIGluIHRoZSB0ZW1wbGF0ZS5cbiAgICogQHBhcmFtIG5vZGUgbm9kZSB0byB2aXNpdFxuICAgKi9cbiAgdmlzaXQobm9kZTogSFRNTE5vZGUpIHsgbm9kZS52aXNpdCh0aGlzKTsgfVxuXG4gIHZpc2l0QWxsKG5vZGVzOiBOb2RlW10pIHsgbm9kZXMuZm9yRWFjaChub2RlID0+IHRoaXMudmlzaXQobm9kZSkpOyB9XG5cbiAgdmlzaXRFbGVtZW50KGVsZW1lbnQ6IEVsZW1lbnQpIHtcbiAgICB0aGlzLnZpc2l0QWxsKGVsZW1lbnQuYXR0cmlidXRlcyk7XG4gICAgdGhpcy52aXNpdEFsbChlbGVtZW50LmNoaWxkcmVuKTtcbiAgICB0aGlzLnZpc2l0QWxsKGVsZW1lbnQucmVmZXJlbmNlcyk7XG4gIH1cbiAgdmlzaXRUZW1wbGF0ZSh0ZW1wbGF0ZTogVGVtcGxhdGUpIHtcbiAgICB0aGlzLnZpc2l0QWxsKHRlbXBsYXRlLmF0dHJpYnV0ZXMpO1xuICAgIHRoaXMudmlzaXRBbGwodGVtcGxhdGUuY2hpbGRyZW4pO1xuICAgIHRoaXMudmlzaXRBbGwodGVtcGxhdGUucmVmZXJlbmNlcyk7XG4gICAgdGhpcy52aXNpdEFsbCh0ZW1wbGF0ZS52YXJpYWJsZXMpO1xuICB9XG4gIHZpc2l0Qm91bmRUZXh0KHRleHQ6IEJvdW5kVGV4dCkgeyB0aGlzLmFkZElkZW50aWZpZXJzKHRleHQpOyB9XG5cbiAgLyoqXG4gICAqIEFkZHMgaWRlbnRpZmllcnMgdG8gdGhlIHZpc2l0b3IncyBzdGF0ZS5cbiAgICogQHBhcmFtIHZpc2l0ZWRFbnRpdGllcyBpbnRlcmVzdGluZyBlbnRpdGllcyB0byBhZGQgYXMgaWRlbnRpZmllcnNcbiAgICogQHBhcmFtIGN1cnJldE5vZGUgbm9kZSBlbnRpdGllcyB3ZXJlIGRpc2NvdmVyZWQgaW5cbiAgICovXG4gIHByaXZhdGUgYWRkSWRlbnRpZmllcnMobm9kZTogTm9kZSZ7dmFsdWU6IEFTVH0pIHtcbiAgICBjb25zdCBpZGVudGlmaWVycyA9IEV4cHJlc3Npb25WaXNpdG9yLmdldElkZW50aWZpZXJzKG5vZGUudmFsdWUsIG5vZGUpO1xuICAgIGlkZW50aWZpZXJzLmZvckVhY2goaWQgPT4gdGhpcy5pZGVudGlmaWVycy5hZGQoaWQpKTtcbiAgfVxufVxuXG4vKipcbiAqIFVud3JhcHMgYW5kIHJlcGFyc2VzIGEgdGVtcGxhdGUsIHByZXNlcnZpbmcgd2hpdGVzcGFjZSBhbmQgd2l0aCBubyBsZWFkaW5nIHRyaXZpYWwgY2hhcmFjdGVycy5cbiAqXG4gKiBBIHRlbXBsYXRlIG1heSBwcmV2aW91c2x5IGhhdmUgYmVlbiBwYXJzZWQgd2l0aG91dCBwcmVzZXJ2aW5nIHdoaXRlc3BhY2UsIGFuZCB3YXMgZGVmaW5pdGVseVxuICogcGFyc2VkIHdpdGggbGVhZGluZyB0cml2aWFsIGNoYXJhY3RlcnMgKHNlZSBgcGFyc2VUZW1wbGF0ZWAgZnJvbSB0aGUgY29tcGlsZXIgcGFja2FnZSBBUEkpLlxuICogQm90aCBvZiB0aGVzZSBhcmUgZGV0cmltZW50YWwgZm9yIGluZGV4aW5nIGFzIHRoZXkgcmVzdWx0IGluIGEgbWFuaXB1bGF0ZWQgQVNUIG5vdCByZXByZXNlbnRpbmdcbiAqIHRoZSB0ZW1wbGF0ZSBzb3VyY2UgY29kZS5cbiAqXG4gKiBUT0RPKGF5YXpoYWZpeik6IFJlbW92ZSBvbmNlIGlzc3VlcyB3aXRoIGBsZWFkaW5nVHJpdmlhQ2hhcnNgIGFuZCBgcGFyc2VUZW1wbGF0ZWAgYXJlIHJlc29sdmVkLlxuICovXG5mdW5jdGlvbiByZXN0b3JlVGVtcGxhdGUodGVtcGxhdGU6IFRtcGxBc3ROb2RlW10sIG9wdGlvbnM6IFJlc3RvcmVUZW1wbGF0ZU9wdGlvbnMpOiBUbXBsQXN0Tm9kZVtdIHtcbiAgLy8gdHJ5IHRvIHJlY2FwdHVyZSB0aGUgdGVtcGxhdGUgY29udGVudCBhbmQgVVJMXG4gIC8vIGlmIHRoZXJlIHdhcyBub3RoaW5nIGluIHRoZSB0ZW1wbGF0ZSB0byBiZWdpbiB3aXRoLCB0aGlzIGlzIGp1c3QgYSBuby1vcFxuICBpZiAodGVtcGxhdGUubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIGNvbnN0IHtjb250ZW50OiB0ZW1wbGF0ZVN0ciwgdXJsOiB0ZW1wbGF0ZVVybH0gPSB0ZW1wbGF0ZVswXS5zb3VyY2VTcGFuLnN0YXJ0LmZpbGU7XG5cbiAgb3B0aW9ucy5wcmVzZXJ2ZVdoaXRlc3BhY2VzID0gdHJ1ZTtcbiAgY29uc3Qge2ludGVycG9sYXRpb25Db25maWcsIHByZXNlcnZlV2hpdGVzcGFjZXN9ID0gb3B0aW9ucztcblxuICBjb25zdCBiaW5kaW5nUGFyc2VyID0gbWFrZUJpbmRpbmdQYXJzZXIoaW50ZXJwb2xhdGlvbkNvbmZpZyk7XG4gIGNvbnN0IGh0bWxQYXJzZXIgPSBuZXcgSHRtbFBhcnNlcigpO1xuICBjb25zdCBwYXJzZVJlc3VsdCA9IGh0bWxQYXJzZXIucGFyc2UodGVtcGxhdGVTdHIsIHRlbXBsYXRlVXJsLCB7XG4gICAgLi4ub3B0aW9ucyxcbiAgICB0b2tlbml6ZUV4cGFuc2lvbkZvcm1zOiB0cnVlLFxuICB9KTtcblxuICBpZiAocGFyc2VSZXN1bHQuZXJyb3JzICYmIHBhcnNlUmVzdWx0LmVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbXBvc3NpYmxlIHN0YXRlOiB0ZW1wbGF0ZSBtdXN0IGhhdmUgYmVlbiBzdWNjZXNzZnVsbHkgcGFyc2VkIHByZXZpb3VzbHkuJyk7XG4gIH1cblxuICBjb25zdCByb290Tm9kZXMgPSB2aXNpdEFsbChcbiAgICAgIG5ldyBJMThuTWV0YVZpc2l0b3IoaW50ZXJwb2xhdGlvbkNvbmZpZywgIXByZXNlcnZlV2hpdGVzcGFjZXMpLCBwYXJzZVJlc3VsdC5yb290Tm9kZXMpO1xuXG4gIGNvbnN0IHtub2RlcywgZXJyb3JzfSA9IGh0bWxBc3RUb1JlbmRlcjNBc3Qocm9vdE5vZGVzLCBiaW5kaW5nUGFyc2VyKTtcbiAgaWYgKGVycm9ycyAmJiBlcnJvcnMubGVuZ3RoID4gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW1wb3NzaWJsZSBzdGF0ZTogdGVtcGxhdGUgbXVzdCBoYXZlIGJlZW4gc3VjY2Vzc2Z1bGx5IHBhcnNlZCBwcmV2aW91c2x5LicpO1xuICB9XG5cbiAgcmV0dXJuIG5vZGVzO1xufVxuXG4vKipcbiAqIFRyYXZlcnNlcyBhIHRlbXBsYXRlIEFTVCBhbmQgYnVpbGRzIGlkZW50aWZpZXJzIGRpc2NvdmVyZWQgaW4gaXQuXG4gKiBAcGFyYW0gdGVtcGxhdGUgdGVtcGxhdGUgdG8gZXh0cmFjdCBpbmRlbnRpZmllcnMgZnJvbVxuICogQHBhcmFtIG9wdGlvbnMgb3B0aW9ucyBmb3IgcmVzdG9yaW5nIHRoZSBwYXJzZWQgdGVtcGxhdGUgdG8gYSBpbmRleGFibGUgc3RhdGVcbiAqIEByZXR1cm4gaWRlbnRpZmllcnMgaW4gdGVtcGxhdGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFRlbXBsYXRlSWRlbnRpZmllcnMoXG4gICAgdGVtcGxhdGU6IFRtcGxBc3ROb2RlW10sIG9wdGlvbnM6IFJlc3RvcmVUZW1wbGF0ZU9wdGlvbnMpOiBTZXQ8VGVtcGxhdGVJZGVudGlmaWVyPiB7XG4gIGNvbnN0IHJlc3RvcmVkVGVtcGxhdGUgPSByZXN0b3JlVGVtcGxhdGUodGVtcGxhdGUsIG9wdGlvbnMpO1xuICBjb25zdCB2aXNpdG9yID0gbmV3IFRlbXBsYXRlVmlzaXRvcigpO1xuICB2aXNpdG9yLnZpc2l0QWxsKHJlc3RvcmVkVGVtcGxhdGUpO1xuICByZXR1cm4gdmlzaXRvci5pZGVudGlmaWVycztcbn1cbiJdfQ==