"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const compiler_1 = require("@angular/compiler");
const expression_type_1 = require("./expression_type");
const symbols_1 = require("./symbols");
function getTemplateExpressionDiagnostics(info) {
    const visitor = new ExpressionDiagnosticsVisitor(info, (path, includeEvent) => getExpressionScope(info, path, includeEvent));
    compiler_1.templateVisitAll(visitor, info.templateAst);
    return visitor.diagnostics;
}
exports.getTemplateExpressionDiagnostics = getTemplateExpressionDiagnostics;
function getExpressionDiagnostics(scope, ast, query, context = {}) {
    const analyzer = new expression_type_1.AstType(scope, query, context);
    analyzer.getDiagnostics(ast);
    return analyzer.diagnostics;
}
exports.getExpressionDiagnostics = getExpressionDiagnostics;
function getReferences(info) {
    const result = [];
    function processReferences(references) {
        for (const reference of references) {
            let type = undefined;
            if (reference.value) {
                type = info.query.getTypeSymbol(compiler_1.tokenReference(reference.value));
            }
            result.push({
                name: reference.name,
                kind: 'reference',
                type: type || info.query.getBuiltinType(symbols_1.BuiltinType.Any),
                get definition() { return getDefinitionOf(info, reference); }
            });
        }
    }
    const visitor = new class extends compiler_1.RecursiveTemplateAstVisitor {
        visitEmbeddedTemplate(ast, context) {
            super.visitEmbeddedTemplate(ast, context);
            processReferences(ast.references);
        }
        visitElement(ast, context) {
            super.visitElement(ast, context);
            processReferences(ast.references);
        }
    };
    compiler_1.templateVisitAll(visitor, info.templateAst);
    return result;
}
function getDefinitionOf(info, ast) {
    if (info.fileName) {
        const templateOffset = info.offset;
        return [{
                fileName: info.fileName,
                span: {
                    start: ast.sourceSpan.start.offset + templateOffset,
                    end: ast.sourceSpan.end.offset + templateOffset
                }
            }];
    }
}
function getVarDeclarations(info, path) {
    const result = [];
    let current = path.tail;
    while (current) {
        if (current instanceof compiler_1.EmbeddedTemplateAst) {
            for (const variable of current.variables) {
                const name = variable.name;
                // Find the first directive with a context.
                const context = current.directives.map(d => info.query.getTemplateContext(d.directive.type.reference))
                    .find(c => !!c);
                // Determine the type of the context field referenced by variable.value.
                let type = undefined;
                if (context) {
                    const value = context.get(variable.value);
                    if (value) {
                        type = value.type;
                        let kind = info.query.getTypeKind(type);
                        if (kind === symbols_1.BuiltinType.Any || kind == symbols_1.BuiltinType.Unbound) {
                            // The any type is not very useful here. For special cases, such as ngFor, we can do
                            // better.
                            type = refinedVariableType(type, info, current);
                        }
                    }
                }
                if (!type) {
                    type = info.query.getBuiltinType(symbols_1.BuiltinType.Any);
                }
                result.push({
                    name,
                    kind: 'variable', type, get definition() { return getDefinitionOf(info, variable); }
                });
            }
        }
        current = path.parentOf(current);
    }
    return result;
}
function refinedVariableType(type, info, templateElement) {
    // Special case the ngFor directive
    const ngForDirective = templateElement.directives.find(d => {
        const name = compiler_1.identifierName(d.directive.type);
        return name == 'NgFor' || name == 'NgForOf';
    });
    if (ngForDirective) {
        const ngForOfBinding = ngForDirective.inputs.find(i => i.directiveName == 'ngForOf');
        if (ngForOfBinding) {
            const bindingType = new expression_type_1.AstType(info.members, info.query, {}).getType(ngForOfBinding.value);
            if (bindingType) {
                const result = info.query.getElementType(bindingType);
                if (result) {
                    return result;
                }
            }
        }
    }
    // We can't do better, return any
    return info.query.getBuiltinType(symbols_1.BuiltinType.Any);
}
function getEventDeclaration(info, includeEvent) {
    let result = [];
    if (includeEvent) {
        // TODO: Determine the type of the event parameter based on the Observable<T> or EventEmitter<T>
        // of the event.
        result = [{ name: '$event', kind: 'variable', type: info.query.getBuiltinType(symbols_1.BuiltinType.Any) }];
    }
    return result;
}
function getExpressionScope(info, path, includeEvent) {
    let result = info.members;
    const references = getReferences(info);
    const variables = getVarDeclarations(info, path);
    const events = getEventDeclaration(info, includeEvent);
    if (references.length || variables.length || events.length) {
        const referenceTable = info.query.createSymbolTable(references);
        const variableTable = info.query.createSymbolTable(variables);
        const eventsTable = info.query.createSymbolTable(events);
        result = info.query.mergeSymbolTable([result, referenceTable, variableTable, eventsTable]);
    }
    return result;
}
exports.getExpressionScope = getExpressionScope;
class ExpressionDiagnosticsVisitor extends compiler_1.RecursiveTemplateAstVisitor {
    constructor(info, getExpressionScope) {
        super();
        this.info = info;
        this.getExpressionScope = getExpressionScope;
        this.diagnostics = [];
        this.path = new compiler_1.AstPath([]);
    }
    visitDirective(ast, context) {
        // Override the default child visitor to ignore the host properties of a directive.
        if (ast.inputs && ast.inputs.length) {
            compiler_1.templateVisitAll(this, ast.inputs, context);
        }
    }
    visitBoundText(ast) {
        this.push(ast);
        this.diagnoseExpression(ast.value, ast.sourceSpan.start.offset, false);
        this.pop();
    }
    visitDirectiveProperty(ast) {
        this.push(ast);
        this.diagnoseExpression(ast.value, this.attributeValueLocation(ast), false);
        this.pop();
    }
    visitElementProperty(ast) {
        this.push(ast);
        this.diagnoseExpression(ast.value, this.attributeValueLocation(ast), false);
        this.pop();
    }
    visitEvent(ast) {
        this.push(ast);
        this.diagnoseExpression(ast.handler, this.attributeValueLocation(ast), true);
        this.pop();
    }
    visitVariable(ast) {
        const directive = this.directiveSummary;
        if (directive && ast.value) {
            const context = this.info.query.getTemplateContext(directive.type.reference);
            if (context && !context.has(ast.value)) {
                if (ast.value === '$implicit') {
                    this.reportError('The template context does not have an implicit value', spanOf(ast.sourceSpan));
                }
                else {
                    this.reportError(`The template context does not defined a member called '${ast.value}'`, spanOf(ast.sourceSpan));
                }
            }
        }
    }
    visitElement(ast, context) {
        this.push(ast);
        super.visitElement(ast, context);
        this.pop();
    }
    visitEmbeddedTemplate(ast, context) {
        const previousDirectiveSummary = this.directiveSummary;
        this.push(ast);
        // Find directive that references this template
        this.directiveSummary =
            ast.directives.map(d => d.directive).find(d => hasTemplateReference(d.type));
        // Process children
        super.visitEmbeddedTemplate(ast, context);
        this.pop();
        this.directiveSummary = previousDirectiveSummary;
    }
    attributeValueLocation(ast) {
        const path = compiler_1.findNode(this.info.htmlAst, ast.sourceSpan.start.offset);
        const last = path.tail;
        if (last instanceof compiler_1.Attribute && last.valueSpan) {
            // Add 1 for the quote.
            return last.valueSpan.start.offset + 1;
        }
        return ast.sourceSpan.start.offset;
    }
    diagnoseExpression(ast, offset, includeEvent) {
        const scope = this.getExpressionScope(this.path, includeEvent);
        this.diagnostics.push(...getExpressionDiagnostics(scope, ast, this.info.query, {
            event: includeEvent
        }).map(d => ({
            span: offsetSpan(d.ast.span, offset + this.info.offset),
            kind: d.kind,
            message: d.message
        })));
    }
    push(ast) { this.path.push(ast); }
    pop() { this.path.pop(); }
    reportError(message, span) {
        if (span) {
            this.diagnostics.push({ span: offsetSpan(span, this.info.offset), kind: expression_type_1.DiagnosticKind.Error, message });
        }
    }
    reportWarning(message, span) {
        this.diagnostics.push({ span: offsetSpan(span, this.info.offset), kind: expression_type_1.DiagnosticKind.Warning, message });
    }
}
function hasTemplateReference(type) {
    if (type.diDeps) {
        for (let diDep of type.diDeps) {
            if (diDep.token && diDep.token.identifier &&
                compiler_1.identifierName(diDep.token.identifier) == 'TemplateRef')
                return true;
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
//# sourceMappingURL=expression_diagnostics.js.map