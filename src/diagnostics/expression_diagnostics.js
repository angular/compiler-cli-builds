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
        define("@angular/compiler-cli/src/diagnostics/expression_diagnostics", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/diagnostics/expression_type", "@angular/compiler-cli/src/diagnostics/symbols"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var expression_type_1 = require("@angular/compiler-cli/src/diagnostics/expression_type");
    var symbols_1 = require("@angular/compiler-cli/src/diagnostics/symbols");
    function getTemplateExpressionDiagnostics(info) {
        var visitor = new ExpressionDiagnosticsVisitor(info, function (path, includeEvent) {
            return getExpressionScope(info, path, includeEvent);
        });
        compiler_1.templateVisitAll(visitor, info.templateAst);
        return visitor.diagnostics;
    }
    exports.getTemplateExpressionDiagnostics = getTemplateExpressionDiagnostics;
    function getExpressionDiagnostics(scope, ast, query, context) {
        if (context === void 0) { context = {}; }
        var analyzer = new expression_type_1.AstType(scope, query, context);
        analyzer.getDiagnostics(ast);
        return analyzer.diagnostics;
    }
    exports.getExpressionDiagnostics = getExpressionDiagnostics;
    function getReferences(info) {
        var result = [];
        function processReferences(references) {
            var e_1, _a;
            var _loop_1 = function (reference) {
                var type = undefined;
                if (reference.value) {
                    type = info.query.getTypeSymbol(compiler_1.tokenReference(reference.value));
                }
                result.push({
                    name: reference.name,
                    kind: 'reference',
                    type: type || info.query.getBuiltinType(symbols_1.BuiltinType.Any),
                    get definition() { return getDefinitionOf(info, reference); }
                });
            };
            try {
                for (var references_1 = tslib_1.__values(references), references_1_1 = references_1.next(); !references_1_1.done; references_1_1 = references_1.next()) {
                    var reference = references_1_1.value;
                    _loop_1(reference);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (references_1_1 && !references_1_1.done && (_a = references_1.return)) _a.call(references_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        var visitor = new /** @class */ (function (_super) {
            tslib_1.__extends(class_1, _super);
            function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            class_1.prototype.visitEmbeddedTemplate = function (ast, context) {
                _super.prototype.visitEmbeddedTemplate.call(this, ast, context);
                processReferences(ast.references);
            };
            class_1.prototype.visitElement = function (ast, context) {
                _super.prototype.visitElement.call(this, ast, context);
                processReferences(ast.references);
            };
            return class_1;
        }(compiler_1.RecursiveTemplateAstVisitor));
        compiler_1.templateVisitAll(visitor, info.templateAst);
        return result;
    }
    function getDefinitionOf(info, ast) {
        if (info.fileName) {
            var templateOffset = info.offset;
            return [{
                    fileName: info.fileName,
                    span: {
                        start: ast.sourceSpan.start.offset + templateOffset,
                        end: ast.sourceSpan.end.offset + templateOffset
                    }
                }];
        }
    }
    /**
     * Resolve the specified `variable` from the `directives` list and return the
     * corresponding symbol. If resolution fails, return the `any` type.
     * @param variable template variable to resolve
     * @param directives template context
     * @param query
     */
    function findSymbolForVariableInDirectives(variable, directives, query) {
        var e_2, _a;
        try {
            for (var directives_1 = tslib_1.__values(directives), directives_1_1 = directives_1.next(); !directives_1_1.done; directives_1_1 = directives_1.next()) {
                var d = directives_1_1.value;
                // Get the symbol table for the directive's StaticSymbol
                var table = query.getTemplateContext(d.directive.type.reference);
                if (!table) {
                    continue;
                }
                var symbol = table.get(variable.value);
                if (symbol) {
                    return symbol;
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (directives_1_1 && !directives_1_1.done && (_a = directives_1.return)) _a.call(directives_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return query.getBuiltinType(symbols_1.BuiltinType.Any);
    }
    /**
     * Resolve all variable declarations in a template by traversing the specified
     * `path`.
     * @param info
     * @param path template AST path
     */
    function getVarDeclarations(info, path) {
        var e_3, _a;
        var results = [];
        for (var current = path.head; current; current = path.childOf(current)) {
            if (!(current instanceof compiler_1.EmbeddedTemplateAst)) {
                continue;
            }
            var directives = current.directives, variables = current.variables;
            var _loop_2 = function (variable) {
                var symbol = findSymbolForVariableInDirectives(variable, directives, info.query);
                var kind = info.query.getTypeKind(symbol);
                if (kind === symbols_1.BuiltinType.Any || kind === symbols_1.BuiltinType.Unbound) {
                    // For special cases such as ngFor and ngIf, the any type is not very useful.
                    // We can do better by resolving the binding value.
                    var symbolsInScope = info.query.mergeSymbolTable([
                        info.members,
                        // Since we are traversing the AST path from head to tail, any variables
                        // that have been declared so far are also in scope.
                        info.query.createSymbolTable(results),
                    ]);
                    symbol = refinedVariableType(symbolsInScope, info.query, current);
                }
                results.push({
                    name: variable.name,
                    kind: 'variable',
                    type: symbol, get definition() { return getDefinitionOf(info, variable); },
                });
            };
            try {
                for (var variables_1 = (e_3 = void 0, tslib_1.__values(variables)), variables_1_1 = variables_1.next(); !variables_1_1.done; variables_1_1 = variables_1.next()) {
                    var variable = variables_1_1.value;
                    _loop_2(variable);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (variables_1_1 && !variables_1_1.done && (_a = variables_1.return)) _a.call(variables_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
        }
        return results;
    }
    /**
     * Resolve a more specific type for the variable in `templateElement` by inspecting
     * all variables that are in scope in the `mergedTable`. This function is a special
     * case for `ngFor` and `ngIf`. If resolution fails, return the `any` type.
     * @param mergedTable symbol table for all variables in scope
     * @param query
     * @param templateElement
     */
    function refinedVariableType(mergedTable, query, templateElement) {
        // Special case the ngFor directive
        var ngForDirective = templateElement.directives.find(function (d) {
            var name = compiler_1.identifierName(d.directive.type);
            return name == 'NgFor' || name == 'NgForOf';
        });
        if (ngForDirective) {
            var ngForOfBinding = ngForDirective.inputs.find(function (i) { return i.directiveName == 'ngForOf'; });
            if (ngForOfBinding) {
                var bindingType = new expression_type_1.AstType(mergedTable, query, {}).getType(ngForOfBinding.value);
                if (bindingType) {
                    var result = query.getElementType(bindingType);
                    if (result) {
                        return result;
                    }
                }
            }
        }
        // Special case the ngIf directive ( *ngIf="data$ | async as variable" )
        var ngIfDirective = templateElement.directives.find(function (d) { return compiler_1.identifierName(d.directive.type) === 'NgIf'; });
        if (ngIfDirective) {
            var ngIfBinding = ngIfDirective.inputs.find(function (i) { return i.directiveName === 'ngIf'; });
            if (ngIfBinding) {
                var bindingType = new expression_type_1.AstType(mergedTable, query, {}).getType(ngIfBinding.value);
                if (bindingType) {
                    return bindingType;
                }
            }
        }
        // We can't do better, return any
        return query.getBuiltinType(symbols_1.BuiltinType.Any);
    }
    function getEventDeclaration(info, includeEvent) {
        var result = [];
        if (includeEvent) {
            // TODO: Determine the type of the event parameter based on the Observable<T> or EventEmitter<T>
            // of the event.
            result = [{ name: '$event', kind: 'variable', type: info.query.getBuiltinType(symbols_1.BuiltinType.Any) }];
        }
        return result;
    }
    function getExpressionScope(info, path, includeEvent) {
        var result = info.members;
        var references = getReferences(info);
        var variables = getVarDeclarations(info, path);
        var events = getEventDeclaration(info, includeEvent);
        if (references.length || variables.length || events.length) {
            var referenceTable = info.query.createSymbolTable(references);
            var variableTable = info.query.createSymbolTable(variables);
            var eventsTable = info.query.createSymbolTable(events);
            result = info.query.mergeSymbolTable([result, referenceTable, variableTable, eventsTable]);
        }
        return result;
    }
    exports.getExpressionScope = getExpressionScope;
    var ExpressionDiagnosticsVisitor = /** @class */ (function (_super) {
        tslib_1.__extends(ExpressionDiagnosticsVisitor, _super);
        function ExpressionDiagnosticsVisitor(info, getExpressionScope) {
            var _this = _super.call(this) || this;
            _this.info = info;
            _this.getExpressionScope = getExpressionScope;
            _this.diagnostics = [];
            _this.path = new compiler_1.AstPath([]);
            return _this;
        }
        ExpressionDiagnosticsVisitor.prototype.visitDirective = function (ast, context) {
            // Override the default child visitor to ignore the host properties of a directive.
            if (ast.inputs && ast.inputs.length) {
                compiler_1.templateVisitAll(this, ast.inputs, context);
            }
        };
        ExpressionDiagnosticsVisitor.prototype.visitBoundText = function (ast) {
            this.push(ast);
            this.diagnoseExpression(ast.value, ast.sourceSpan.start.offset, false);
            this.pop();
        };
        ExpressionDiagnosticsVisitor.prototype.visitDirectiveProperty = function (ast) {
            this.push(ast);
            this.diagnoseExpression(ast.value, this.attributeValueLocation(ast), false);
            this.pop();
        };
        ExpressionDiagnosticsVisitor.prototype.visitElementProperty = function (ast) {
            this.push(ast);
            this.diagnoseExpression(ast.value, this.attributeValueLocation(ast), false);
            this.pop();
        };
        ExpressionDiagnosticsVisitor.prototype.visitEvent = function (ast) {
            this.push(ast);
            this.diagnoseExpression(ast.handler, this.attributeValueLocation(ast), true);
            this.pop();
        };
        ExpressionDiagnosticsVisitor.prototype.visitVariable = function (ast) {
            var directive = this.directiveSummary;
            if (directive && ast.value) {
                var context = this.info.query.getTemplateContext(directive.type.reference);
                if (context && !context.has(ast.value)) {
                    if (ast.value === '$implicit') {
                        this.reportError('The template context does not have an implicit value', spanOf(ast.sourceSpan));
                    }
                    else {
                        this.reportError("The template context does not define a member called '" + ast.value + "'", spanOf(ast.sourceSpan));
                    }
                }
            }
        };
        ExpressionDiagnosticsVisitor.prototype.visitElement = function (ast, context) {
            this.push(ast);
            _super.prototype.visitElement.call(this, ast, context);
            this.pop();
        };
        ExpressionDiagnosticsVisitor.prototype.visitEmbeddedTemplate = function (ast, context) {
            var previousDirectiveSummary = this.directiveSummary;
            this.push(ast);
            // Find directive that references this template
            this.directiveSummary =
                ast.directives.map(function (d) { return d.directive; }).find(function (d) { return hasTemplateReference(d.type); });
            // Process children
            _super.prototype.visitEmbeddedTemplate.call(this, ast, context);
            this.pop();
            this.directiveSummary = previousDirectiveSummary;
        };
        ExpressionDiagnosticsVisitor.prototype.attributeValueLocation = function (ast) {
            var path = compiler_1.findNode(this.info.htmlAst, ast.sourceSpan.start.offset);
            var last = path.tail;
            if (last instanceof compiler_1.Attribute && last.valueSpan) {
                return last.valueSpan.start.offset;
            }
            return ast.sourceSpan.start.offset;
        };
        ExpressionDiagnosticsVisitor.prototype.diagnoseExpression = function (ast, offset, includeEvent) {
            var _a;
            var _this = this;
            var scope = this.getExpressionScope(this.path, includeEvent);
            (_a = this.diagnostics).push.apply(_a, tslib_1.__spread(getExpressionDiagnostics(scope, ast, this.info.query, {
                event: includeEvent
            }).map(function (d) { return ({
                span: offsetSpan(d.ast.span, offset + _this.info.offset),
                kind: d.kind,
                message: d.message
            }); })));
        };
        ExpressionDiagnosticsVisitor.prototype.push = function (ast) { this.path.push(ast); };
        ExpressionDiagnosticsVisitor.prototype.pop = function () { this.path.pop(); };
        ExpressionDiagnosticsVisitor.prototype.reportError = function (message, span) {
            if (span) {
                this.diagnostics.push({ span: offsetSpan(span, this.info.offset), kind: expression_type_1.DiagnosticKind.Error, message: message });
            }
        };
        ExpressionDiagnosticsVisitor.prototype.reportWarning = function (message, span) {
            this.diagnostics.push({ span: offsetSpan(span, this.info.offset), kind: expression_type_1.DiagnosticKind.Warning, message: message });
        };
        return ExpressionDiagnosticsVisitor;
    }(compiler_1.RecursiveTemplateAstVisitor));
    function hasTemplateReference(type) {
        var e_4, _a;
        if (type.diDeps) {
            try {
                for (var _b = tslib_1.__values(type.diDeps), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var diDep = _c.value;
                    if (diDep.token && diDep.token.identifier &&
                        compiler_1.identifierName(diDep.token.identifier) == 'TemplateRef')
                        return true;
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_4) throw e_4.error; }
            }
        }
        return false;
    }
    function offsetSpan(span, amount) {
        return { start: span.start + amount, end: span.end + amount };
    }
    function spanOf(sourceSpan) {
        return { start: sourceSpan.start.offset, end: sourceSpan.end.offset };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwcmVzc2lvbl9kaWFnbm9zdGljcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvZGlhZ25vc3RpY3MvZXhwcmVzc2lvbl9kaWFnbm9zdGljcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBaVo7SUFFaloseUZBQXdHO0lBQ3hHLHlFQUE2RztJQWlCN0csU0FBZ0IsZ0NBQWdDLENBQUMsSUFBNEI7UUFFM0UsSUFBTSxPQUFPLEdBQUcsSUFBSSw0QkFBNEIsQ0FDNUMsSUFBSSxFQUFFLFVBQUMsSUFBcUIsRUFBRSxZQUFxQjtZQUN6QyxPQUFBLGtCQUFrQixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsWUFBWSxDQUFDO1FBQTVDLENBQTRDLENBQUMsQ0FBQztRQUM1RCwyQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzVDLE9BQU8sT0FBTyxDQUFDLFdBQVcsQ0FBQztJQUM3QixDQUFDO0lBUEQsNEVBT0M7SUFFRCxTQUFnQix3QkFBd0IsQ0FDcEMsS0FBa0IsRUFBRSxHQUFRLEVBQUUsS0FBa0IsRUFDaEQsT0FBMEM7UUFBMUMsd0JBQUEsRUFBQSxZQUEwQztRQUM1QyxJQUFNLFFBQVEsR0FBRyxJQUFJLHlCQUFPLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNwRCxRQUFRLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzdCLE9BQU8sUUFBUSxDQUFDLFdBQVcsQ0FBQztJQUM5QixDQUFDO0lBTkQsNERBTUM7SUFFRCxTQUFTLGFBQWEsQ0FBQyxJQUE0QjtRQUNqRCxJQUFNLE1BQU0sR0FBd0IsRUFBRSxDQUFDO1FBRXZDLFNBQVMsaUJBQWlCLENBQUMsVUFBMEI7O29DQUN4QyxTQUFTO2dCQUNsQixJQUFJLElBQUksR0FBcUIsU0FBUyxDQUFDO2dCQUN2QyxJQUFJLFNBQVMsQ0FBQyxLQUFLLEVBQUU7b0JBQ25CLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyx5QkFBYyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2lCQUNsRTtnQkFDRCxNQUFNLENBQUMsSUFBSSxDQUFDO29CQUNWLElBQUksRUFBRSxTQUFTLENBQUMsSUFBSTtvQkFDcEIsSUFBSSxFQUFFLFdBQVc7b0JBQ2pCLElBQUksRUFBRSxJQUFJLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMscUJBQVcsQ0FBQyxHQUFHLENBQUM7b0JBQ3hELElBQUksVUFBVSxLQUFLLE9BQU8sZUFBZSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQzlELENBQUMsQ0FBQzs7O2dCQVZMLEtBQXdCLElBQUEsZUFBQSxpQkFBQSxVQUFVLENBQUEsc0NBQUE7b0JBQTdCLElBQU0sU0FBUyx1QkFBQTs0QkFBVCxTQUFTO2lCQVduQjs7Ozs7Ozs7O1FBQ0gsQ0FBQztRQUVELElBQU0sT0FBTyxHQUFHO1lBQWtCLG1DQUEyQjtZQUF6Qzs7WUFTcEIsQ0FBQztZQVJDLHVDQUFxQixHQUFyQixVQUFzQixHQUF3QixFQUFFLE9BQVk7Z0JBQzFELGlCQUFNLHFCQUFxQixZQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDMUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3BDLENBQUM7WUFDRCw4QkFBWSxHQUFaLFVBQWEsR0FBZSxFQUFFLE9BQVk7Z0JBQ3hDLGlCQUFNLFlBQVksWUFBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQ2pDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNwQyxDQUFDO1lBQ0gsY0FBQztRQUFELENBQUMsQUFUbUIsQ0FBYyxzQ0FBMkIsRUFTNUQsQ0FBQztRQUVGLDJCQUFnQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFNUMsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztJQUVELFNBQVMsZUFBZSxDQUFDLElBQTRCLEVBQUUsR0FBZ0I7UUFDckUsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ2pCLElBQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDbkMsT0FBTyxDQUFDO29CQUNOLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtvQkFDdkIsSUFBSSxFQUFFO3dCQUNKLEtBQUssRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsY0FBYzt3QkFDbkQsR0FBRyxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxjQUFjO3FCQUNoRDtpQkFDRixDQUFDLENBQUM7U0FDSjtJQUNILENBQUM7SUFFRDs7Ozs7O09BTUc7SUFDSCxTQUFTLGlDQUFpQyxDQUN0QyxRQUFxQixFQUFFLFVBQTBCLEVBQUUsS0FBa0I7OztZQUN2RSxLQUFnQixJQUFBLGVBQUEsaUJBQUEsVUFBVSxDQUFBLHNDQUFBLDhEQUFFO2dCQUF2QixJQUFNLENBQUMsdUJBQUE7Z0JBQ1Ysd0RBQXdEO2dCQUN4RCxJQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ25FLElBQUksQ0FBQyxLQUFLLEVBQUU7b0JBQ1YsU0FBUztpQkFDVjtnQkFDRCxJQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDekMsSUFBSSxNQUFNLEVBQUU7b0JBQ1YsT0FBTyxNQUFNLENBQUM7aUJBQ2Y7YUFDRjs7Ozs7Ozs7O1FBQ0QsT0FBTyxLQUFLLENBQUMsY0FBYyxDQUFDLHFCQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0gsU0FBUyxrQkFBa0IsQ0FDdkIsSUFBNEIsRUFBRSxJQUFxQjs7UUFDckQsSUFBTSxPQUFPLEdBQXdCLEVBQUUsQ0FBQztRQUN4QyxLQUFLLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ3RFLElBQUksQ0FBQyxDQUFDLE9BQU8sWUFBWSw4QkFBbUIsQ0FBQyxFQUFFO2dCQUM3QyxTQUFTO2FBQ1Y7WUFDTSxJQUFBLCtCQUFVLEVBQUUsNkJBQVMsQ0FBWTtvQ0FDN0IsUUFBUTtnQkFDakIsSUFBSSxNQUFNLEdBQUcsaUNBQWlDLENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ2pGLElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUM1QyxJQUFJLElBQUksS0FBSyxxQkFBVyxDQUFDLEdBQUcsSUFBSSxJQUFJLEtBQUsscUJBQVcsQ0FBQyxPQUFPLEVBQUU7b0JBQzVELDZFQUE2RTtvQkFDN0UsbURBQW1EO29CQUNuRCxJQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDO3dCQUNqRCxJQUFJLENBQUMsT0FBTzt3QkFDWix3RUFBd0U7d0JBQ3hFLG9EQUFvRDt3QkFDcEQsSUFBSSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUM7cUJBQ3RDLENBQUMsQ0FBQztvQkFDSCxNQUFNLEdBQUcsbUJBQW1CLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7aUJBQ25FO2dCQUNELE9BQU8sQ0FBQyxJQUFJLENBQUM7b0JBQ1gsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJO29CQUNuQixJQUFJLEVBQUUsVUFBVTtvQkFDaEIsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLFVBQVUsS0FBSyxPQUFPLGVBQWUsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUMzRSxDQUFDLENBQUM7OztnQkFsQkwsS0FBdUIsSUFBQSw2QkFBQSxpQkFBQSxTQUFTLENBQUEsQ0FBQSxvQ0FBQTtvQkFBM0IsSUFBTSxRQUFRLHNCQUFBOzRCQUFSLFFBQVE7aUJBbUJsQjs7Ozs7Ozs7O1NBQ0Y7UUFDRCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNILFNBQVMsbUJBQW1CLENBQ3hCLFdBQXdCLEVBQUUsS0FBa0IsRUFBRSxlQUFvQztRQUNwRixtQ0FBbUM7UUFDbkMsSUFBTSxjQUFjLEdBQUcsZUFBZSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBQSxDQUFDO1lBQ3RELElBQU0sSUFBSSxHQUFHLHlCQUFjLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM5QyxPQUFPLElBQUksSUFBSSxPQUFPLElBQUksSUFBSSxJQUFJLFNBQVMsQ0FBQztRQUM5QyxDQUFDLENBQUMsQ0FBQztRQUNILElBQUksY0FBYyxFQUFFO1lBQ2xCLElBQU0sY0FBYyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLGFBQWEsSUFBSSxTQUFTLEVBQTVCLENBQTRCLENBQUMsQ0FBQztZQUNyRixJQUFJLGNBQWMsRUFBRTtnQkFDbEIsSUFBTSxXQUFXLEdBQUcsSUFBSSx5QkFBTyxDQUFDLFdBQVcsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDdEYsSUFBSSxXQUFXLEVBQUU7b0JBQ2YsSUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQztvQkFDakQsSUFBSSxNQUFNLEVBQUU7d0JBQ1YsT0FBTyxNQUFNLENBQUM7cUJBQ2Y7aUJBQ0Y7YUFDRjtTQUNGO1FBRUQsd0VBQXdFO1FBQ3hFLElBQU0sYUFBYSxHQUNmLGVBQWUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEseUJBQWMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLE1BQU0sRUFBM0MsQ0FBMkMsQ0FBQyxDQUFDO1FBQ3RGLElBQUksYUFBYSxFQUFFO1lBQ2pCLElBQU0sV0FBVyxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLGFBQWEsS0FBSyxNQUFNLEVBQTFCLENBQTBCLENBQUMsQ0FBQztZQUMvRSxJQUFJLFdBQVcsRUFBRTtnQkFDZixJQUFNLFdBQVcsR0FBRyxJQUFJLHlCQUFPLENBQUMsV0FBVyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNuRixJQUFJLFdBQVcsRUFBRTtvQkFDZixPQUFPLFdBQVcsQ0FBQztpQkFDcEI7YUFDRjtTQUNGO1FBRUQsaUNBQWlDO1FBQ2pDLE9BQU8sS0FBSyxDQUFDLGNBQWMsQ0FBQyxxQkFBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFFRCxTQUFTLG1CQUFtQixDQUFDLElBQTRCLEVBQUUsWUFBc0I7UUFDL0UsSUFBSSxNQUFNLEdBQXdCLEVBQUUsQ0FBQztRQUNyQyxJQUFJLFlBQVksRUFBRTtZQUNoQixnR0FBZ0c7WUFDaEcsZ0JBQWdCO1lBQ2hCLE1BQU0sR0FBRyxDQUFDLEVBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxxQkFBVyxDQUFDLEdBQUcsQ0FBQyxFQUFDLENBQUMsQ0FBQztTQUNqRztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7SUFFRCxTQUFnQixrQkFBa0IsQ0FDOUIsSUFBNEIsRUFBRSxJQUFxQixFQUFFLFlBQXFCO1FBQzVFLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDMUIsSUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLElBQU0sU0FBUyxHQUFHLGtCQUFrQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNqRCxJQUFNLE1BQU0sR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDdkQsSUFBSSxVQUFVLENBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQyxNQUFNLElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRTtZQUMxRCxJQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2hFLElBQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDOUQsSUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN6RCxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLE1BQU0sRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7U0FDNUY7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBYkQsZ0RBYUM7SUFFRDtRQUEyQyx3REFBMkI7UUFPcEUsc0NBQ1ksSUFBNEIsRUFDNUIsa0JBQWlGO1lBRjdGLFlBR0UsaUJBQU8sU0FFUjtZQUpXLFVBQUksR0FBSixJQUFJLENBQXdCO1lBQzVCLHdCQUFrQixHQUFsQixrQkFBa0IsQ0FBK0Q7WUFKN0YsaUJBQVcsR0FBMkIsRUFBRSxDQUFDO1lBTXZDLEtBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxrQkFBTyxDQUFjLEVBQUUsQ0FBQyxDQUFDOztRQUMzQyxDQUFDO1FBRUQscURBQWMsR0FBZCxVQUFlLEdBQWlCLEVBQUUsT0FBWTtZQUM1QyxtRkFBbUY7WUFDbkYsSUFBSSxHQUFHLENBQUMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO2dCQUNuQywyQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQzthQUM3QztRQUNILENBQUM7UUFFRCxxREFBYyxHQUFkLFVBQWUsR0FBaUI7WUFDOUIsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNmLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN2RSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDYixDQUFDO1FBRUQsNkRBQXNCLEdBQXRCLFVBQXVCLEdBQThCO1lBQ25ELElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDZixJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDNUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ2IsQ0FBQztRQUVELDJEQUFvQixHQUFwQixVQUFxQixHQUE0QjtZQUMvQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2YsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzVFLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNiLENBQUM7UUFFRCxpREFBVSxHQUFWLFVBQVcsR0FBa0I7WUFDM0IsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNmLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM3RSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDYixDQUFDO1FBRUQsb0RBQWEsR0FBYixVQUFjLEdBQWdCO1lBQzVCLElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztZQUN4QyxJQUFJLFNBQVMsSUFBSSxHQUFHLENBQUMsS0FBSyxFQUFFO2dCQUMxQixJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBRyxDQUFDO2dCQUMvRSxJQUFJLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFO29CQUN0QyxJQUFJLEdBQUcsQ0FBQyxLQUFLLEtBQUssV0FBVyxFQUFFO3dCQUM3QixJQUFJLENBQUMsV0FBVyxDQUNaLHNEQUFzRCxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztxQkFDckY7eUJBQU07d0JBQ0wsSUFBSSxDQUFDLFdBQVcsQ0FDWiwyREFBeUQsR0FBRyxDQUFDLEtBQUssTUFBRyxFQUNyRSxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7cUJBQzdCO2lCQUNGO2FBQ0Y7UUFDSCxDQUFDO1FBRUQsbURBQVksR0FBWixVQUFhLEdBQWUsRUFBRSxPQUFZO1lBQ3hDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDZixpQkFBTSxZQUFZLFlBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ2pDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNiLENBQUM7UUFFRCw0REFBcUIsR0FBckIsVUFBc0IsR0FBd0IsRUFBRSxPQUFZO1lBQzFELElBQU0sd0JBQXdCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDO1lBRXZELElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFZiwrQ0FBK0M7WUFDL0MsSUFBSSxDQUFDLGdCQUFnQjtnQkFDakIsR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLENBQUMsU0FBUyxFQUFYLENBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBNUIsQ0FBNEIsQ0FBRyxDQUFDO1lBRW5GLG1CQUFtQjtZQUNuQixpQkFBTSxxQkFBcUIsWUFBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFFMUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBRVgsSUFBSSxDQUFDLGdCQUFnQixHQUFHLHdCQUF3QixDQUFDO1FBQ25ELENBQUM7UUFFTyw2REFBc0IsR0FBOUIsVUFBK0IsR0FBZ0I7WUFDN0MsSUFBTSxJQUFJLEdBQUcsbUJBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN0RSxJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQ3ZCLElBQUksSUFBSSxZQUFZLG9CQUFTLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtnQkFDL0MsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7YUFDcEM7WUFDRCxPQUFPLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztRQUNyQyxDQUFDO1FBRU8seURBQWtCLEdBQTFCLFVBQTJCLEdBQVEsRUFBRSxNQUFjLEVBQUUsWUFBcUI7O1lBQTFFLGlCQVNDO1lBUkMsSUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDL0QsQ0FBQSxLQUFBLElBQUksQ0FBQyxXQUFXLENBQUEsQ0FBQyxJQUFJLDRCQUFJLHdCQUF3QixDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7Z0JBQ3ZELEtBQUssRUFBRSxZQUFZO2FBQ3BCLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDO2dCQUNKLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsTUFBTSxHQUFHLEtBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO2dCQUN2RCxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUk7Z0JBQ1osT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPO2FBQ25CLENBQUMsRUFKRyxDQUlILENBQUMsR0FBRTtRQUNwQyxDQUFDO1FBRU8sMkNBQUksR0FBWixVQUFhLEdBQWdCLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRS9DLDBDQUFHLEdBQVgsY0FBZ0IsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFMUIsa0RBQVcsR0FBbkIsVUFBb0IsT0FBZSxFQUFFLElBQW9CO1lBQ3ZELElBQUksSUFBSSxFQUFFO2dCQUNSLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUNqQixFQUFDLElBQUksRUFBRSxVQUFVLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLGdDQUFjLENBQUMsS0FBSyxFQUFFLE9BQU8sU0FBQSxFQUFDLENBQUMsQ0FBQzthQUN0RjtRQUNILENBQUM7UUFFTyxvREFBYSxHQUFyQixVQUFzQixPQUFlLEVBQUUsSUFBVTtZQUMvQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FDakIsRUFBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxnQ0FBYyxDQUFDLE9BQU8sRUFBRSxPQUFPLFNBQUEsRUFBQyxDQUFDLENBQUM7UUFDekYsQ0FBQztRQUNILG1DQUFDO0lBQUQsQ0FBQyxBQXhIRCxDQUEyQyxzQ0FBMkIsR0F3SHJFO0lBRUQsU0FBUyxvQkFBb0IsQ0FBQyxJQUF5Qjs7UUFDckQsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFOztnQkFDZixLQUFrQixJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQSxnQkFBQSw0QkFBRTtvQkFBMUIsSUFBSSxLQUFLLFdBQUE7b0JBQ1osSUFBSSxLQUFLLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsVUFBVTt3QkFDckMseUJBQWMsQ0FBQyxLQUFLLENBQUMsS0FBTyxDQUFDLFVBQVksQ0FBQyxJQUFJLGFBQWE7d0JBQzdELE9BQU8sSUFBSSxDQUFDO2lCQUNmOzs7Ozs7Ozs7U0FDRjtRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUVELFNBQVMsVUFBVSxDQUFDLElBQVUsRUFBRSxNQUFjO1FBQzVDLE9BQU8sRUFBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEdBQUcsTUFBTSxFQUFDLENBQUM7SUFDOUQsQ0FBQztJQUVELFNBQVMsTUFBTSxDQUFDLFVBQTJCO1FBQ3pDLE9BQU8sRUFBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFDLENBQUM7SUFDdEUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBU1QsIEFzdFBhdGgsIEF0dHJpYnV0ZSwgQm91bmREaXJlY3RpdmVQcm9wZXJ0eUFzdCwgQm91bmRFbGVtZW50UHJvcGVydHlBc3QsIEJvdW5kRXZlbnRBc3QsIEJvdW5kVGV4dEFzdCwgQ29tcGlsZURpcmVjdGl2ZVN1bW1hcnksIENvbXBpbGVUeXBlTWV0YWRhdGEsIERpcmVjdGl2ZUFzdCwgRWxlbWVudEFzdCwgRW1iZWRkZWRUZW1wbGF0ZUFzdCwgTm9kZSwgUGFyc2VTb3VyY2VTcGFuLCBSZWN1cnNpdmVUZW1wbGF0ZUFzdFZpc2l0b3IsIFJlZmVyZW5jZUFzdCwgVGVtcGxhdGVBc3QsIFRlbXBsYXRlQXN0UGF0aCwgVmFyaWFibGVBc3QsIGZpbmROb2RlLCBpZGVudGlmaWVyTmFtZSwgdGVtcGxhdGVWaXNpdEFsbCwgdG9rZW5SZWZlcmVuY2V9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcblxuaW1wb3J0IHtBc3RUeXBlLCBEaWFnbm9zdGljS2luZCwgRXhwcmVzc2lvbkRpYWdub3N0aWNzQ29udGV4dCwgVHlwZURpYWdub3N0aWN9IGZyb20gJy4vZXhwcmVzc2lvbl90eXBlJztcbmltcG9ydCB7QnVpbHRpblR5cGUsIERlZmluaXRpb24sIFNwYW4sIFN5bWJvbCwgU3ltYm9sRGVjbGFyYXRpb24sIFN5bWJvbFF1ZXJ5LCBTeW1ib2xUYWJsZX0gZnJvbSAnLi9zeW1ib2xzJztcblxuZXhwb3J0IGludGVyZmFjZSBEaWFnbm9zdGljVGVtcGxhdGVJbmZvIHtcbiAgZmlsZU5hbWU/OiBzdHJpbmc7XG4gIG9mZnNldDogbnVtYmVyO1xuICBxdWVyeTogU3ltYm9sUXVlcnk7XG4gIG1lbWJlcnM6IFN5bWJvbFRhYmxlO1xuICBodG1sQXN0OiBOb2RlW107XG4gIHRlbXBsYXRlQXN0OiBUZW1wbGF0ZUFzdFtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEV4cHJlc3Npb25EaWFnbm9zdGljIHtcbiAgbWVzc2FnZTogc3RyaW5nO1xuICBzcGFuOiBTcGFuO1xuICBraW5kOiBEaWFnbm9zdGljS2luZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFRlbXBsYXRlRXhwcmVzc2lvbkRpYWdub3N0aWNzKGluZm86IERpYWdub3N0aWNUZW1wbGF0ZUluZm8pOlxuICAgIEV4cHJlc3Npb25EaWFnbm9zdGljW10ge1xuICBjb25zdCB2aXNpdG9yID0gbmV3IEV4cHJlc3Npb25EaWFnbm9zdGljc1Zpc2l0b3IoXG4gICAgICBpbmZvLCAocGF0aDogVGVtcGxhdGVBc3RQYXRoLCBpbmNsdWRlRXZlbnQ6IGJvb2xlYW4pID0+XG4gICAgICAgICAgICAgICAgZ2V0RXhwcmVzc2lvblNjb3BlKGluZm8sIHBhdGgsIGluY2x1ZGVFdmVudCkpO1xuICB0ZW1wbGF0ZVZpc2l0QWxsKHZpc2l0b3IsIGluZm8udGVtcGxhdGVBc3QpO1xuICByZXR1cm4gdmlzaXRvci5kaWFnbm9zdGljcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4cHJlc3Npb25EaWFnbm9zdGljcyhcbiAgICBzY29wZTogU3ltYm9sVGFibGUsIGFzdDogQVNULCBxdWVyeTogU3ltYm9sUXVlcnksXG4gICAgY29udGV4dDogRXhwcmVzc2lvbkRpYWdub3N0aWNzQ29udGV4dCA9IHt9KTogVHlwZURpYWdub3N0aWNbXSB7XG4gIGNvbnN0IGFuYWx5emVyID0gbmV3IEFzdFR5cGUoc2NvcGUsIHF1ZXJ5LCBjb250ZXh0KTtcbiAgYW5hbHl6ZXIuZ2V0RGlhZ25vc3RpY3MoYXN0KTtcbiAgcmV0dXJuIGFuYWx5emVyLmRpYWdub3N0aWNzO1xufVxuXG5mdW5jdGlvbiBnZXRSZWZlcmVuY2VzKGluZm86IERpYWdub3N0aWNUZW1wbGF0ZUluZm8pOiBTeW1ib2xEZWNsYXJhdGlvbltdIHtcbiAgY29uc3QgcmVzdWx0OiBTeW1ib2xEZWNsYXJhdGlvbltdID0gW107XG5cbiAgZnVuY3Rpb24gcHJvY2Vzc1JlZmVyZW5jZXMocmVmZXJlbmNlczogUmVmZXJlbmNlQXN0W10pIHtcbiAgICBmb3IgKGNvbnN0IHJlZmVyZW5jZSBvZiByZWZlcmVuY2VzKSB7XG4gICAgICBsZXQgdHlwZTogU3ltYm9sfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAgIGlmIChyZWZlcmVuY2UudmFsdWUpIHtcbiAgICAgICAgdHlwZSA9IGluZm8ucXVlcnkuZ2V0VHlwZVN5bWJvbCh0b2tlblJlZmVyZW5jZShyZWZlcmVuY2UudmFsdWUpKTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgICAgbmFtZTogcmVmZXJlbmNlLm5hbWUsXG4gICAgICAgIGtpbmQ6ICdyZWZlcmVuY2UnLFxuICAgICAgICB0eXBlOiB0eXBlIHx8IGluZm8ucXVlcnkuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuQW55KSxcbiAgICAgICAgZ2V0IGRlZmluaXRpb24oKSB7IHJldHVybiBnZXREZWZpbml0aW9uT2YoaW5mbywgcmVmZXJlbmNlKTsgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgdmlzaXRvciA9IG5ldyBjbGFzcyBleHRlbmRzIFJlY3Vyc2l2ZVRlbXBsYXRlQXN0VmlzaXRvciB7XG4gICAgdmlzaXRFbWJlZGRlZFRlbXBsYXRlKGFzdDogRW1iZWRkZWRUZW1wbGF0ZUFzdCwgY29udGV4dDogYW55KTogYW55IHtcbiAgICAgIHN1cGVyLnZpc2l0RW1iZWRkZWRUZW1wbGF0ZShhc3QsIGNvbnRleHQpO1xuICAgICAgcHJvY2Vzc1JlZmVyZW5jZXMoYXN0LnJlZmVyZW5jZXMpO1xuICAgIH1cbiAgICB2aXNpdEVsZW1lbnQoYXN0OiBFbGVtZW50QXN0LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgICAgc3VwZXIudmlzaXRFbGVtZW50KGFzdCwgY29udGV4dCk7XG4gICAgICBwcm9jZXNzUmVmZXJlbmNlcyhhc3QucmVmZXJlbmNlcyk7XG4gICAgfVxuICB9O1xuXG4gIHRlbXBsYXRlVmlzaXRBbGwodmlzaXRvciwgaW5mby50ZW1wbGF0ZUFzdCk7XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gZ2V0RGVmaW5pdGlvbk9mKGluZm86IERpYWdub3N0aWNUZW1wbGF0ZUluZm8sIGFzdDogVGVtcGxhdGVBc3QpOiBEZWZpbml0aW9ufHVuZGVmaW5lZCB7XG4gIGlmIChpbmZvLmZpbGVOYW1lKSB7XG4gICAgY29uc3QgdGVtcGxhdGVPZmZzZXQgPSBpbmZvLm9mZnNldDtcbiAgICByZXR1cm4gW3tcbiAgICAgIGZpbGVOYW1lOiBpbmZvLmZpbGVOYW1lLFxuICAgICAgc3Bhbjoge1xuICAgICAgICBzdGFydDogYXN0LnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0ICsgdGVtcGxhdGVPZmZzZXQsXG4gICAgICAgIGVuZDogYXN0LnNvdXJjZVNwYW4uZW5kLm9mZnNldCArIHRlbXBsYXRlT2Zmc2V0XG4gICAgICB9XG4gICAgfV07XG4gIH1cbn1cblxuLyoqXG4gKiBSZXNvbHZlIHRoZSBzcGVjaWZpZWQgYHZhcmlhYmxlYCBmcm9tIHRoZSBgZGlyZWN0aXZlc2AgbGlzdCBhbmQgcmV0dXJuIHRoZVxuICogY29ycmVzcG9uZGluZyBzeW1ib2wuIElmIHJlc29sdXRpb24gZmFpbHMsIHJldHVybiB0aGUgYGFueWAgdHlwZS5cbiAqIEBwYXJhbSB2YXJpYWJsZSB0ZW1wbGF0ZSB2YXJpYWJsZSB0byByZXNvbHZlXG4gKiBAcGFyYW0gZGlyZWN0aXZlcyB0ZW1wbGF0ZSBjb250ZXh0XG4gKiBAcGFyYW0gcXVlcnlcbiAqL1xuZnVuY3Rpb24gZmluZFN5bWJvbEZvclZhcmlhYmxlSW5EaXJlY3RpdmVzKFxuICAgIHZhcmlhYmxlOiBWYXJpYWJsZUFzdCwgZGlyZWN0aXZlczogRGlyZWN0aXZlQXN0W10sIHF1ZXJ5OiBTeW1ib2xRdWVyeSk6IFN5bWJvbCB7XG4gIGZvciAoY29uc3QgZCBvZiBkaXJlY3RpdmVzKSB7XG4gICAgLy8gR2V0IHRoZSBzeW1ib2wgdGFibGUgZm9yIHRoZSBkaXJlY3RpdmUncyBTdGF0aWNTeW1ib2xcbiAgICBjb25zdCB0YWJsZSA9IHF1ZXJ5LmdldFRlbXBsYXRlQ29udGV4dChkLmRpcmVjdGl2ZS50eXBlLnJlZmVyZW5jZSk7XG4gICAgaWYgKCF0YWJsZSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IHN5bWJvbCA9IHRhYmxlLmdldCh2YXJpYWJsZS52YWx1ZSk7XG4gICAgaWYgKHN5bWJvbCkge1xuICAgICAgcmV0dXJuIHN5bWJvbDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHF1ZXJ5LmdldEJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLkFueSk7XG59XG5cbi8qKlxuICogUmVzb2x2ZSBhbGwgdmFyaWFibGUgZGVjbGFyYXRpb25zIGluIGEgdGVtcGxhdGUgYnkgdHJhdmVyc2luZyB0aGUgc3BlY2lmaWVkXG4gKiBgcGF0aGAuXG4gKiBAcGFyYW0gaW5mb1xuICogQHBhcmFtIHBhdGggdGVtcGxhdGUgQVNUIHBhdGhcbiAqL1xuZnVuY3Rpb24gZ2V0VmFyRGVjbGFyYXRpb25zKFxuICAgIGluZm86IERpYWdub3N0aWNUZW1wbGF0ZUluZm8sIHBhdGg6IFRlbXBsYXRlQXN0UGF0aCk6IFN5bWJvbERlY2xhcmF0aW9uW10ge1xuICBjb25zdCByZXN1bHRzOiBTeW1ib2xEZWNsYXJhdGlvbltdID0gW107XG4gIGZvciAobGV0IGN1cnJlbnQgPSBwYXRoLmhlYWQ7IGN1cnJlbnQ7IGN1cnJlbnQgPSBwYXRoLmNoaWxkT2YoY3VycmVudCkpIHtcbiAgICBpZiAoIShjdXJyZW50IGluc3RhbmNlb2YgRW1iZWRkZWRUZW1wbGF0ZUFzdCkpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjb25zdCB7ZGlyZWN0aXZlcywgdmFyaWFibGVzfSA9IGN1cnJlbnQ7XG4gICAgZm9yIChjb25zdCB2YXJpYWJsZSBvZiB2YXJpYWJsZXMpIHtcbiAgICAgIGxldCBzeW1ib2wgPSBmaW5kU3ltYm9sRm9yVmFyaWFibGVJbkRpcmVjdGl2ZXModmFyaWFibGUsIGRpcmVjdGl2ZXMsIGluZm8ucXVlcnkpO1xuICAgICAgY29uc3Qga2luZCA9IGluZm8ucXVlcnkuZ2V0VHlwZUtpbmQoc3ltYm9sKTtcbiAgICAgIGlmIChraW5kID09PSBCdWlsdGluVHlwZS5BbnkgfHwga2luZCA9PT0gQnVpbHRpblR5cGUuVW5ib3VuZCkge1xuICAgICAgICAvLyBGb3Igc3BlY2lhbCBjYXNlcyBzdWNoIGFzIG5nRm9yIGFuZCBuZ0lmLCB0aGUgYW55IHR5cGUgaXMgbm90IHZlcnkgdXNlZnVsLlxuICAgICAgICAvLyBXZSBjYW4gZG8gYmV0dGVyIGJ5IHJlc29sdmluZyB0aGUgYmluZGluZyB2YWx1ZS5cbiAgICAgICAgY29uc3Qgc3ltYm9sc0luU2NvcGUgPSBpbmZvLnF1ZXJ5Lm1lcmdlU3ltYm9sVGFibGUoW1xuICAgICAgICAgIGluZm8ubWVtYmVycyxcbiAgICAgICAgICAvLyBTaW5jZSB3ZSBhcmUgdHJhdmVyc2luZyB0aGUgQVNUIHBhdGggZnJvbSBoZWFkIHRvIHRhaWwsIGFueSB2YXJpYWJsZXNcbiAgICAgICAgICAvLyB0aGF0IGhhdmUgYmVlbiBkZWNsYXJlZCBzbyBmYXIgYXJlIGFsc28gaW4gc2NvcGUuXG4gICAgICAgICAgaW5mby5xdWVyeS5jcmVhdGVTeW1ib2xUYWJsZShyZXN1bHRzKSxcbiAgICAgICAgXSk7XG4gICAgICAgIHN5bWJvbCA9IHJlZmluZWRWYXJpYWJsZVR5cGUoc3ltYm9sc0luU2NvcGUsIGluZm8ucXVlcnksIGN1cnJlbnQpO1xuICAgICAgfVxuICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAgbmFtZTogdmFyaWFibGUubmFtZSxcbiAgICAgICAga2luZDogJ3ZhcmlhYmxlJyxcbiAgICAgICAgdHlwZTogc3ltYm9sLCBnZXQgZGVmaW5pdGlvbigpIHsgcmV0dXJuIGdldERlZmluaXRpb25PZihpbmZvLCB2YXJpYWJsZSk7IH0sXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbi8qKlxuICogUmVzb2x2ZSBhIG1vcmUgc3BlY2lmaWMgdHlwZSBmb3IgdGhlIHZhcmlhYmxlIGluIGB0ZW1wbGF0ZUVsZW1lbnRgIGJ5IGluc3BlY3RpbmdcbiAqIGFsbCB2YXJpYWJsZXMgdGhhdCBhcmUgaW4gc2NvcGUgaW4gdGhlIGBtZXJnZWRUYWJsZWAuIFRoaXMgZnVuY3Rpb24gaXMgYSBzcGVjaWFsXG4gKiBjYXNlIGZvciBgbmdGb3JgIGFuZCBgbmdJZmAuIElmIHJlc29sdXRpb24gZmFpbHMsIHJldHVybiB0aGUgYGFueWAgdHlwZS5cbiAqIEBwYXJhbSBtZXJnZWRUYWJsZSBzeW1ib2wgdGFibGUgZm9yIGFsbCB2YXJpYWJsZXMgaW4gc2NvcGVcbiAqIEBwYXJhbSBxdWVyeVxuICogQHBhcmFtIHRlbXBsYXRlRWxlbWVudFxuICovXG5mdW5jdGlvbiByZWZpbmVkVmFyaWFibGVUeXBlKFxuICAgIG1lcmdlZFRhYmxlOiBTeW1ib2xUYWJsZSwgcXVlcnk6IFN5bWJvbFF1ZXJ5LCB0ZW1wbGF0ZUVsZW1lbnQ6IEVtYmVkZGVkVGVtcGxhdGVBc3QpOiBTeW1ib2wge1xuICAvLyBTcGVjaWFsIGNhc2UgdGhlIG5nRm9yIGRpcmVjdGl2ZVxuICBjb25zdCBuZ0ZvckRpcmVjdGl2ZSA9IHRlbXBsYXRlRWxlbWVudC5kaXJlY3RpdmVzLmZpbmQoZCA9PiB7XG4gICAgY29uc3QgbmFtZSA9IGlkZW50aWZpZXJOYW1lKGQuZGlyZWN0aXZlLnR5cGUpO1xuICAgIHJldHVybiBuYW1lID09ICdOZ0ZvcicgfHwgbmFtZSA9PSAnTmdGb3JPZic7XG4gIH0pO1xuICBpZiAobmdGb3JEaXJlY3RpdmUpIHtcbiAgICBjb25zdCBuZ0Zvck9mQmluZGluZyA9IG5nRm9yRGlyZWN0aXZlLmlucHV0cy5maW5kKGkgPT4gaS5kaXJlY3RpdmVOYW1lID09ICduZ0Zvck9mJyk7XG4gICAgaWYgKG5nRm9yT2ZCaW5kaW5nKSB7XG4gICAgICBjb25zdCBiaW5kaW5nVHlwZSA9IG5ldyBBc3RUeXBlKG1lcmdlZFRhYmxlLCBxdWVyeSwge30pLmdldFR5cGUobmdGb3JPZkJpbmRpbmcudmFsdWUpO1xuICAgICAgaWYgKGJpbmRpbmdUeXBlKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHF1ZXJ5LmdldEVsZW1lbnRUeXBlKGJpbmRpbmdUeXBlKTtcbiAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBTcGVjaWFsIGNhc2UgdGhlIG5nSWYgZGlyZWN0aXZlICggKm5nSWY9XCJkYXRhJCB8IGFzeW5jIGFzIHZhcmlhYmxlXCIgKVxuICBjb25zdCBuZ0lmRGlyZWN0aXZlID1cbiAgICAgIHRlbXBsYXRlRWxlbWVudC5kaXJlY3RpdmVzLmZpbmQoZCA9PiBpZGVudGlmaWVyTmFtZShkLmRpcmVjdGl2ZS50eXBlKSA9PT0gJ05nSWYnKTtcbiAgaWYgKG5nSWZEaXJlY3RpdmUpIHtcbiAgICBjb25zdCBuZ0lmQmluZGluZyA9IG5nSWZEaXJlY3RpdmUuaW5wdXRzLmZpbmQoaSA9PiBpLmRpcmVjdGl2ZU5hbWUgPT09ICduZ0lmJyk7XG4gICAgaWYgKG5nSWZCaW5kaW5nKSB7XG4gICAgICBjb25zdCBiaW5kaW5nVHlwZSA9IG5ldyBBc3RUeXBlKG1lcmdlZFRhYmxlLCBxdWVyeSwge30pLmdldFR5cGUobmdJZkJpbmRpbmcudmFsdWUpO1xuICAgICAgaWYgKGJpbmRpbmdUeXBlKSB7XG4gICAgICAgIHJldHVybiBiaW5kaW5nVHlwZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBXZSBjYW4ndCBkbyBiZXR0ZXIsIHJldHVybiBhbnlcbiAgcmV0dXJuIHF1ZXJ5LmdldEJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLkFueSk7XG59XG5cbmZ1bmN0aW9uIGdldEV2ZW50RGVjbGFyYXRpb24oaW5mbzogRGlhZ25vc3RpY1RlbXBsYXRlSW5mbywgaW5jbHVkZUV2ZW50PzogYm9vbGVhbikge1xuICBsZXQgcmVzdWx0OiBTeW1ib2xEZWNsYXJhdGlvbltdID0gW107XG4gIGlmIChpbmNsdWRlRXZlbnQpIHtcbiAgICAvLyBUT0RPOiBEZXRlcm1pbmUgdGhlIHR5cGUgb2YgdGhlIGV2ZW50IHBhcmFtZXRlciBiYXNlZCBvbiB0aGUgT2JzZXJ2YWJsZTxUPiBvciBFdmVudEVtaXR0ZXI8VD5cbiAgICAvLyBvZiB0aGUgZXZlbnQuXG4gICAgcmVzdWx0ID0gW3tuYW1lOiAnJGV2ZW50Jywga2luZDogJ3ZhcmlhYmxlJywgdHlwZTogaW5mby5xdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5BbnkpfV07XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4cHJlc3Npb25TY29wZShcbiAgICBpbmZvOiBEaWFnbm9zdGljVGVtcGxhdGVJbmZvLCBwYXRoOiBUZW1wbGF0ZUFzdFBhdGgsIGluY2x1ZGVFdmVudDogYm9vbGVhbik6IFN5bWJvbFRhYmxlIHtcbiAgbGV0IHJlc3VsdCA9IGluZm8ubWVtYmVycztcbiAgY29uc3QgcmVmZXJlbmNlcyA9IGdldFJlZmVyZW5jZXMoaW5mbyk7XG4gIGNvbnN0IHZhcmlhYmxlcyA9IGdldFZhckRlY2xhcmF0aW9ucyhpbmZvLCBwYXRoKTtcbiAgY29uc3QgZXZlbnRzID0gZ2V0RXZlbnREZWNsYXJhdGlvbihpbmZvLCBpbmNsdWRlRXZlbnQpO1xuICBpZiAocmVmZXJlbmNlcy5sZW5ndGggfHwgdmFyaWFibGVzLmxlbmd0aCB8fCBldmVudHMubGVuZ3RoKSB7XG4gICAgY29uc3QgcmVmZXJlbmNlVGFibGUgPSBpbmZvLnF1ZXJ5LmNyZWF0ZVN5bWJvbFRhYmxlKHJlZmVyZW5jZXMpO1xuICAgIGNvbnN0IHZhcmlhYmxlVGFibGUgPSBpbmZvLnF1ZXJ5LmNyZWF0ZVN5bWJvbFRhYmxlKHZhcmlhYmxlcyk7XG4gICAgY29uc3QgZXZlbnRzVGFibGUgPSBpbmZvLnF1ZXJ5LmNyZWF0ZVN5bWJvbFRhYmxlKGV2ZW50cyk7XG4gICAgcmVzdWx0ID0gaW5mby5xdWVyeS5tZXJnZVN5bWJvbFRhYmxlKFtyZXN1bHQsIHJlZmVyZW5jZVRhYmxlLCB2YXJpYWJsZVRhYmxlLCBldmVudHNUYWJsZV0pO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmNsYXNzIEV4cHJlc3Npb25EaWFnbm9zdGljc1Zpc2l0b3IgZXh0ZW5kcyBSZWN1cnNpdmVUZW1wbGF0ZUFzdFZpc2l0b3Ige1xuICBwcml2YXRlIHBhdGg6IFRlbXBsYXRlQXN0UGF0aDtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgZGlyZWN0aXZlU3VtbWFyeSAhOiBDb21waWxlRGlyZWN0aXZlU3VtbWFyeTtcblxuICBkaWFnbm9zdGljczogRXhwcmVzc2lvbkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBpbmZvOiBEaWFnbm9zdGljVGVtcGxhdGVJbmZvLFxuICAgICAgcHJpdmF0ZSBnZXRFeHByZXNzaW9uU2NvcGU6IChwYXRoOiBUZW1wbGF0ZUFzdFBhdGgsIGluY2x1ZGVFdmVudDogYm9vbGVhbikgPT4gU3ltYm9sVGFibGUpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMucGF0aCA9IG5ldyBBc3RQYXRoPFRlbXBsYXRlQXN0PihbXSk7XG4gIH1cblxuICB2aXNpdERpcmVjdGl2ZShhc3Q6IERpcmVjdGl2ZUFzdCwgY29udGV4dDogYW55KTogYW55IHtcbiAgICAvLyBPdmVycmlkZSB0aGUgZGVmYXVsdCBjaGlsZCB2aXNpdG9yIHRvIGlnbm9yZSB0aGUgaG9zdCBwcm9wZXJ0aWVzIG9mIGEgZGlyZWN0aXZlLlxuICAgIGlmIChhc3QuaW5wdXRzICYmIGFzdC5pbnB1dHMubGVuZ3RoKSB7XG4gICAgICB0ZW1wbGF0ZVZpc2l0QWxsKHRoaXMsIGFzdC5pbnB1dHMsIGNvbnRleHQpO1xuICAgIH1cbiAgfVxuXG4gIHZpc2l0Qm91bmRUZXh0KGFzdDogQm91bmRUZXh0QXN0KTogdm9pZCB7XG4gICAgdGhpcy5wdXNoKGFzdCk7XG4gICAgdGhpcy5kaWFnbm9zZUV4cHJlc3Npb24oYXN0LnZhbHVlLCBhc3Quc291cmNlU3Bhbi5zdGFydC5vZmZzZXQsIGZhbHNlKTtcbiAgICB0aGlzLnBvcCgpO1xuICB9XG5cbiAgdmlzaXREaXJlY3RpdmVQcm9wZXJ0eShhc3Q6IEJvdW5kRGlyZWN0aXZlUHJvcGVydHlBc3QpOiB2b2lkIHtcbiAgICB0aGlzLnB1c2goYXN0KTtcbiAgICB0aGlzLmRpYWdub3NlRXhwcmVzc2lvbihhc3QudmFsdWUsIHRoaXMuYXR0cmlidXRlVmFsdWVMb2NhdGlvbihhc3QpLCBmYWxzZSk7XG4gICAgdGhpcy5wb3AoKTtcbiAgfVxuXG4gIHZpc2l0RWxlbWVudFByb3BlcnR5KGFzdDogQm91bmRFbGVtZW50UHJvcGVydHlBc3QpOiB2b2lkIHtcbiAgICB0aGlzLnB1c2goYXN0KTtcbiAgICB0aGlzLmRpYWdub3NlRXhwcmVzc2lvbihhc3QudmFsdWUsIHRoaXMuYXR0cmlidXRlVmFsdWVMb2NhdGlvbihhc3QpLCBmYWxzZSk7XG4gICAgdGhpcy5wb3AoKTtcbiAgfVxuXG4gIHZpc2l0RXZlbnQoYXN0OiBCb3VuZEV2ZW50QXN0KTogdm9pZCB7XG4gICAgdGhpcy5wdXNoKGFzdCk7XG4gICAgdGhpcy5kaWFnbm9zZUV4cHJlc3Npb24oYXN0LmhhbmRsZXIsIHRoaXMuYXR0cmlidXRlVmFsdWVMb2NhdGlvbihhc3QpLCB0cnVlKTtcbiAgICB0aGlzLnBvcCgpO1xuICB9XG5cbiAgdmlzaXRWYXJpYWJsZShhc3Q6IFZhcmlhYmxlQXN0KTogdm9pZCB7XG4gICAgY29uc3QgZGlyZWN0aXZlID0gdGhpcy5kaXJlY3RpdmVTdW1tYXJ5O1xuICAgIGlmIChkaXJlY3RpdmUgJiYgYXN0LnZhbHVlKSB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gdGhpcy5pbmZvLnF1ZXJ5LmdldFRlbXBsYXRlQ29udGV4dChkaXJlY3RpdmUudHlwZS5yZWZlcmVuY2UpICE7XG4gICAgICBpZiAoY29udGV4dCAmJiAhY29udGV4dC5oYXMoYXN0LnZhbHVlKSkge1xuICAgICAgICBpZiAoYXN0LnZhbHVlID09PSAnJGltcGxpY2l0Jykge1xuICAgICAgICAgIHRoaXMucmVwb3J0RXJyb3IoXG4gICAgICAgICAgICAgICdUaGUgdGVtcGxhdGUgY29udGV4dCBkb2VzIG5vdCBoYXZlIGFuIGltcGxpY2l0IHZhbHVlJywgc3Bhbk9mKGFzdC5zb3VyY2VTcGFuKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5yZXBvcnRFcnJvcihcbiAgICAgICAgICAgICAgYFRoZSB0ZW1wbGF0ZSBjb250ZXh0IGRvZXMgbm90IGRlZmluZSBhIG1lbWJlciBjYWxsZWQgJyR7YXN0LnZhbHVlfSdgLFxuICAgICAgICAgICAgICBzcGFuT2YoYXN0LnNvdXJjZVNwYW4pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHZpc2l0RWxlbWVudChhc3Q6IEVsZW1lbnRBc3QsIGNvbnRleHQ6IGFueSk6IHZvaWQge1xuICAgIHRoaXMucHVzaChhc3QpO1xuICAgIHN1cGVyLnZpc2l0RWxlbWVudChhc3QsIGNvbnRleHQpO1xuICAgIHRoaXMucG9wKCk7XG4gIH1cblxuICB2aXNpdEVtYmVkZGVkVGVtcGxhdGUoYXN0OiBFbWJlZGRlZFRlbXBsYXRlQXN0LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgIGNvbnN0IHByZXZpb3VzRGlyZWN0aXZlU3VtbWFyeSA9IHRoaXMuZGlyZWN0aXZlU3VtbWFyeTtcblxuICAgIHRoaXMucHVzaChhc3QpO1xuXG4gICAgLy8gRmluZCBkaXJlY3RpdmUgdGhhdCByZWZlcmVuY2VzIHRoaXMgdGVtcGxhdGVcbiAgICB0aGlzLmRpcmVjdGl2ZVN1bW1hcnkgPVxuICAgICAgICBhc3QuZGlyZWN0aXZlcy5tYXAoZCA9PiBkLmRpcmVjdGl2ZSkuZmluZChkID0+IGhhc1RlbXBsYXRlUmVmZXJlbmNlKGQudHlwZSkpICE7XG5cbiAgICAvLyBQcm9jZXNzIGNoaWxkcmVuXG4gICAgc3VwZXIudmlzaXRFbWJlZGRlZFRlbXBsYXRlKGFzdCwgY29udGV4dCk7XG5cbiAgICB0aGlzLnBvcCgpO1xuXG4gICAgdGhpcy5kaXJlY3RpdmVTdW1tYXJ5ID0gcHJldmlvdXNEaXJlY3RpdmVTdW1tYXJ5O1xuICB9XG5cbiAgcHJpdmF0ZSBhdHRyaWJ1dGVWYWx1ZUxvY2F0aW9uKGFzdDogVGVtcGxhdGVBc3QpIHtcbiAgICBjb25zdCBwYXRoID0gZmluZE5vZGUodGhpcy5pbmZvLmh0bWxBc3QsIGFzdC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCk7XG4gICAgY29uc3QgbGFzdCA9IHBhdGgudGFpbDtcbiAgICBpZiAobGFzdCBpbnN0YW5jZW9mIEF0dHJpYnV0ZSAmJiBsYXN0LnZhbHVlU3Bhbikge1xuICAgICAgcmV0dXJuIGxhc3QudmFsdWVTcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICB9XG4gICAgcmV0dXJuIGFzdC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldDtcbiAgfVxuXG4gIHByaXZhdGUgZGlhZ25vc2VFeHByZXNzaW9uKGFzdDogQVNULCBvZmZzZXQ6IG51bWJlciwgaW5jbHVkZUV2ZW50OiBib29sZWFuKSB7XG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLmdldEV4cHJlc3Npb25TY29wZSh0aGlzLnBhdGgsIGluY2x1ZGVFdmVudCk7XG4gICAgdGhpcy5kaWFnbm9zdGljcy5wdXNoKC4uLmdldEV4cHJlc3Npb25EaWFnbm9zdGljcyhzY29wZSwgYXN0LCB0aGlzLmluZm8ucXVlcnksIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudDogaW5jbHVkZUV2ZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pLm1hcChkID0+ICh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwYW46IG9mZnNldFNwYW4oZC5hc3Quc3Bhbiwgb2Zmc2V0ICsgdGhpcy5pbmZvLm9mZnNldCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtpbmQ6IGQua2luZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogZC5tZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBwdXNoKGFzdDogVGVtcGxhdGVBc3QpIHsgdGhpcy5wYXRoLnB1c2goYXN0KTsgfVxuXG4gIHByaXZhdGUgcG9wKCkgeyB0aGlzLnBhdGgucG9wKCk7IH1cblxuICBwcml2YXRlIHJlcG9ydEVycm9yKG1lc3NhZ2U6IHN0cmluZywgc3BhbjogU3Bhbnx1bmRlZmluZWQpIHtcbiAgICBpZiAoc3Bhbikge1xuICAgICAgdGhpcy5kaWFnbm9zdGljcy5wdXNoKFxuICAgICAgICAgIHtzcGFuOiBvZmZzZXRTcGFuKHNwYW4sIHRoaXMuaW5mby5vZmZzZXQpLCBraW5kOiBEaWFnbm9zdGljS2luZC5FcnJvciwgbWVzc2FnZX0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVwb3J0V2FybmluZyhtZXNzYWdlOiBzdHJpbmcsIHNwYW46IFNwYW4pIHtcbiAgICB0aGlzLmRpYWdub3N0aWNzLnB1c2goXG4gICAgICAgIHtzcGFuOiBvZmZzZXRTcGFuKHNwYW4sIHRoaXMuaW5mby5vZmZzZXQpLCBraW5kOiBEaWFnbm9zdGljS2luZC5XYXJuaW5nLCBtZXNzYWdlfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaGFzVGVtcGxhdGVSZWZlcmVuY2UodHlwZTogQ29tcGlsZVR5cGVNZXRhZGF0YSk6IGJvb2xlYW4ge1xuICBpZiAodHlwZS5kaURlcHMpIHtcbiAgICBmb3IgKGxldCBkaURlcCBvZiB0eXBlLmRpRGVwcykge1xuICAgICAgaWYgKGRpRGVwLnRva2VuICYmIGRpRGVwLnRva2VuLmlkZW50aWZpZXIgJiZcbiAgICAgICAgICBpZGVudGlmaWVyTmFtZShkaURlcC50b2tlbiAhLmlkZW50aWZpZXIgISkgPT0gJ1RlbXBsYXRlUmVmJylcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gb2Zmc2V0U3BhbihzcGFuOiBTcGFuLCBhbW91bnQ6IG51bWJlcik6IFNwYW4ge1xuICByZXR1cm4ge3N0YXJ0OiBzcGFuLnN0YXJ0ICsgYW1vdW50LCBlbmQ6IHNwYW4uZW5kICsgYW1vdW50fTtcbn1cblxuZnVuY3Rpb24gc3Bhbk9mKHNvdXJjZVNwYW46IFBhcnNlU291cmNlU3Bhbik6IFNwYW4ge1xuICByZXR1cm4ge3N0YXJ0OiBzb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCwgZW5kOiBzb3VyY2VTcGFuLmVuZC5vZmZzZXR9O1xufVxuIl19