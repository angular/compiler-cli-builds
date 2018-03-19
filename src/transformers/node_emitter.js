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
const ts = require("typescript");
const util_1 = require("./util");
const METHOD_THIS_NAME = 'this';
const CATCH_ERROR_NAME = 'error';
const CATCH_STACK_NAME = 'stack';
const _VALID_IDENTIFIER_RE = /^[$A-Z_][0-9A-Z_$]*$/i;
class TypeScriptNodeEmitter {
    updateSourceFile(sourceFile, stmts, preamble) {
        const converter = new _NodeEmitterVisitor();
        // [].concat flattens the result so that each `visit...` method can also return an array of
        // stmts.
        const statements = [].concat(...stmts.map(stmt => stmt.visitStatement(converter, null)).filter(stmt => stmt != null));
        const preambleStmts = [];
        if (preamble) {
            const commentStmt = this.createCommentStatement(sourceFile, preamble);
            preambleStmts.push(commentStmt);
        }
        const sourceStatements = [...preambleStmts, ...converter.getReexports(), ...converter.getImports(), ...statements];
        converter.updateSourceMap(sourceStatements);
        const newSourceFile = ts.updateSourceFileNode(sourceFile, sourceStatements);
        return [newSourceFile, converter.getNodeMap()];
    }
    /** Creates a not emitted statement containing the given comment. */
    createCommentStatement(sourceFile, comment) {
        if (comment.startsWith('/*') && comment.endsWith('*/')) {
            comment = comment.substr(2, comment.length - 4);
        }
        const commentStmt = ts.createNotEmittedStatement(sourceFile);
        ts.setSyntheticLeadingComments(commentStmt, [{ kind: ts.SyntaxKind.MultiLineCommentTrivia, text: comment, pos: -1, end: -1 }]);
        ts.setEmitFlags(commentStmt, ts.EmitFlags.CustomPrologue);
        return commentStmt;
    }
}
exports.TypeScriptNodeEmitter = TypeScriptNodeEmitter;
/**
 * Update the given source file to include the changes specified in module.
 *
 * The module parameter is treated as a partial module meaning that the statements are added to
 * the module instead of replacing the module. Also, any classes are treated as partial classes
 * and the included members are added to the class with the same name instead of a new class
 * being created.
 */
function updateSourceFile(sourceFile, module, context) {
    const converter = new _NodeEmitterVisitor();
    converter.loadExportedVariableIdentifiers(sourceFile);
    const prefixStatements = module.statements.filter(statement => !(statement instanceof compiler_1.ClassStmt));
    const classes = module.statements.filter(statement => statement instanceof compiler_1.ClassStmt);
    const classMap = new Map(classes.map(classStatement => [classStatement.name, classStatement]));
    const classNames = new Set(classes.map(classStatement => classStatement.name));
    const prefix = prefixStatements.map(statement => statement.visitStatement(converter, sourceFile));
    // Add static methods to all the classes referenced in module.
    let newStatements = sourceFile.statements.map(node => {
        if (node.kind == ts.SyntaxKind.ClassDeclaration) {
            const classDeclaration = node;
            const name = classDeclaration.name;
            if (name) {
                const classStatement = classMap.get(name.text);
                if (classStatement) {
                    classNames.delete(name.text);
                    const classMemberHolder = converter.visitDeclareClassStmt(classStatement);
                    const newMethods = classMemberHolder.members.filter(member => member.kind !== ts.SyntaxKind.Constructor);
                    const newMembers = [...classDeclaration.members, ...newMethods];
                    return ts.updateClassDeclaration(classDeclaration, 
                    /* decorators */ classDeclaration.decorators, 
                    /* modifiers */ classDeclaration.modifiers, 
                    /* name */ classDeclaration.name, 
                    /* typeParameters */ classDeclaration.typeParameters, 
                    /* heritageClauses */ classDeclaration.heritageClauses || [], 
                    /* members */ newMembers);
                }
            }
        }
        return node;
    });
    // Validate that all the classes have been generated
    classNames.size == 0 ||
        util_1.error(`${classNames.size == 1 ? 'Class' : 'Classes'} "${Array.from(classNames.keys()).join(', ')}" not generated`);
    // Add imports to the module required by the new methods
    const imports = converter.getImports();
    if (imports && imports.length) {
        // Find where the new imports should go
        const index = firstAfter(newStatements, statement => statement.kind === ts.SyntaxKind.ImportDeclaration ||
            statement.kind === ts.SyntaxKind.ImportEqualsDeclaration);
        newStatements =
            [...newStatements.slice(0, index), ...imports, ...prefix, ...newStatements.slice(index)];
    }
    else {
        newStatements = [...prefix, ...newStatements];
    }
    converter.updateSourceMap(newStatements);
    const newSourceFile = ts.updateSourceFileNode(sourceFile, newStatements);
    return [newSourceFile, converter.getNodeMap()];
}
exports.updateSourceFile = updateSourceFile;
// Return the index after the first value in `a` that doesn't match the predicate after a value that
// does or 0 if no values match.
function firstAfter(a, predicate) {
    let index = 0;
    const len = a.length;
    for (; index < len; index++) {
        const value = a[index];
        if (predicate(value))
            break;
    }
    if (index >= len)
        return 0;
    for (; index < len; index++) {
        const value = a[index];
        if (!predicate(value))
            break;
    }
    return index;
}
function escapeLiteral(value) {
    return value.replace(/(\"|\\)/g, '\\$1').replace(/(\n)|(\r)/g, function (v, n, r) {
        return n ? '\\n' : '\\r';
    });
}
function createLiteral(value) {
    if (value === null) {
        return ts.createNull();
    }
    else if (value === undefined) {
        return ts.createIdentifier('undefined');
    }
    else {
        const result = ts.createLiteral(value);
        if (ts.isStringLiteral(result) && result.text.indexOf('\\') >= 0) {
            // Hack to avoid problems cause indirectly by:
            //    https://github.com/Microsoft/TypeScript/issues/20192
            // This avoids the string escaping normally performed for a string relying on that
            // TypeScript just emits the text raw for a numeric literal.
            result.kind = ts.SyntaxKind.NumericLiteral;
            result.text = `"${escapeLiteral(result.text)}"`;
        }
        return result;
    }
}
function isExportTypeStatement(statement) {
    return !!statement.modifiers &&
        statement.modifiers.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword);
}
/**
 * Visits an output ast and produces the corresponding TypeScript synthetic nodes.
 */
class _NodeEmitterVisitor {
    constructor() {
        this._nodeMap = new Map();
        this._importsWithPrefixes = new Map();
        this._reexports = new Map();
        this._templateSources = new Map();
        this._exportedVariableIdentifiers = new Map();
    }
    /**
     * Process the source file and collect exported identifiers that refer to variables.
     *
     * Only variables are collected because exported classes still exist in the module scope in
     * CommonJS, whereas variables have their declarations moved onto the `exports` object, and all
     * references are updated accordingly.
     */
    loadExportedVariableIdentifiers(sourceFile) {
        sourceFile.statements.forEach(statement => {
            if (ts.isVariableStatement(statement) && isExportTypeStatement(statement)) {
                statement.declarationList.declarations.forEach(declaration => {
                    if (ts.isIdentifier(declaration.name)) {
                        this._exportedVariableIdentifiers.set(declaration.name.text, declaration.name);
                    }
                });
            }
        });
    }
    getReexports() {
        return Array.from(this._reexports.entries())
            .map(([exportedFilePath, reexports]) => ts.createExportDeclaration(
        /* decorators */ undefined, 
        /* modifiers */ undefined, ts.createNamedExports(reexports.map(({ name, as }) => ts.createExportSpecifier(name, as))), 
        /* moduleSpecifier */ createLiteral(exportedFilePath)));
    }
    getImports() {
        return Array.from(this._importsWithPrefixes.entries())
            .map(([namespace, prefix]) => ts.createImportDeclaration(
        /* decorators */ undefined, 
        /* modifiers */ undefined, 
        /* importClause */ ts.createImportClause(
        /* name */ undefined, ts.createNamespaceImport(ts.createIdentifier(prefix))), 
        /* moduleSpecifier */ createLiteral(namespace)));
    }
    getNodeMap() { return this._nodeMap; }
    updateSourceMap(statements) {
        let lastRangeStartNode = undefined;
        let lastRangeEndNode = undefined;
        let lastRange = undefined;
        const recordLastSourceRange = () => {
            if (lastRange && lastRangeStartNode && lastRangeEndNode) {
                if (lastRangeStartNode == lastRangeEndNode) {
                    ts.setSourceMapRange(lastRangeEndNode, lastRange);
                }
                else {
                    ts.setSourceMapRange(lastRangeStartNode, lastRange);
                    // Only emit the pos for the first node emitted in the range.
                    ts.setEmitFlags(lastRangeStartNode, ts.EmitFlags.NoTrailingSourceMap);
                    ts.setSourceMapRange(lastRangeEndNode, lastRange);
                    // Only emit emit end for the last node emitted in the range.
                    ts.setEmitFlags(lastRangeEndNode, ts.EmitFlags.NoLeadingSourceMap);
                }
            }
        };
        const visitNode = (tsNode) => {
            const ngNode = this._nodeMap.get(tsNode);
            if (ngNode) {
                const range = this.sourceRangeOf(ngNode);
                if (range) {
                    if (!lastRange || range.source != lastRange.source || range.pos != lastRange.pos ||
                        range.end != lastRange.end) {
                        recordLastSourceRange();
                        lastRangeStartNode = tsNode;
                        lastRange = range;
                    }
                    lastRangeEndNode = tsNode;
                }
            }
            ts.forEachChild(tsNode, visitNode);
        };
        statements.forEach(visitNode);
        recordLastSourceRange();
    }
    record(ngNode, tsNode) {
        if (tsNode && !this._nodeMap.has(tsNode)) {
            this._nodeMap.set(tsNode, ngNode);
        }
        return tsNode;
    }
    sourceRangeOf(node) {
        if (node.sourceSpan) {
            const span = node.sourceSpan;
            if (span.start.file == span.end.file) {
                const file = span.start.file;
                if (file.url) {
                    let source = this._templateSources.get(file);
                    if (!source) {
                        source = ts.createSourceMapSource(file.url, file.content, pos => pos);
                        this._templateSources.set(file, source);
                    }
                    return { pos: span.start.offset, end: span.end.offset, source };
                }
            }
        }
        return null;
    }
    getModifiers(stmt) {
        let modifiers = [];
        if (stmt.hasModifier(compiler_1.StmtModifier.Exported)) {
            modifiers.push(ts.createToken(ts.SyntaxKind.ExportKeyword));
        }
        return modifiers;
    }
    // StatementVisitor
    visitDeclareVarStmt(stmt) {
        if (stmt.hasModifier(compiler_1.StmtModifier.Exported) && stmt.value instanceof compiler_1.ExternalExpr &&
            !stmt.type) {
            // check for a reexport
            const { name, moduleName } = stmt.value.value;
            if (moduleName) {
                let reexports = this._reexports.get(moduleName);
                if (!reexports) {
                    reexports = [];
                    this._reexports.set(moduleName, reexports);
                }
                reexports.push({ name: name, as: stmt.name });
                return null;
            }
        }
        const varDeclList = ts.createVariableDeclarationList([ts.createVariableDeclaration(ts.createIdentifier(stmt.name), 
            /* type */ undefined, (stmt.value && stmt.value.visitExpression(this, null)) || undefined)]);
        if (stmt.hasModifier(compiler_1.StmtModifier.Exported)) {
            // Note: We need to add an explicit variable and export declaration so that
            // the variable can be referred in the same file as well.
            const tsVarStmt = this.record(stmt, ts.createVariableStatement(/* modifiers */ [], varDeclList));
            const exportStmt = this.record(stmt, ts.createExportDeclaration(
            /*decorators*/ undefined, /*modifiers*/ undefined, ts.createNamedExports([ts.createExportSpecifier(stmt.name, stmt.name)])));
            return [tsVarStmt, exportStmt];
        }
        return this.record(stmt, ts.createVariableStatement(this.getModifiers(stmt), varDeclList));
    }
    visitDeclareFunctionStmt(stmt) {
        return this.record(stmt, ts.createFunctionDeclaration(
        /* decorators */ undefined, this.getModifiers(stmt), 
        /* asteriskToken */ undefined, stmt.name, /* typeParameters */ undefined, stmt.params.map(p => ts.createParameter(
        /* decorators */ undefined, /* modifiers */ undefined, 
        /* dotDotDotToken */ undefined, p.name)), 
        /* type */ undefined, this._visitStatements(stmt.statements)));
    }
    visitExpressionStmt(stmt) {
        return this.record(stmt, ts.createStatement(stmt.expr.visitExpression(this, null)));
    }
    visitReturnStmt(stmt) {
        return this.record(stmt, ts.createReturn(stmt.value ? stmt.value.visitExpression(this, null) : undefined));
    }
    visitDeclareClassStmt(stmt) {
        const modifiers = this.getModifiers(stmt);
        const fields = stmt.fields.map(field => ts.createProperty(
        /* decorators */ undefined, /* modifiers */ translateModifiers(field.modifiers), field.name, 
        /* questionToken */ undefined, 
        /* type */ undefined, field.initializer == null ? ts.createNull() :
            field.initializer.visitExpression(this, null)));
        const getters = stmt.getters.map(getter => ts.createGetAccessor(
        /* decorators */ undefined, /* modifiers */ undefined, getter.name, /* parameters */ [], 
        /* type */ undefined, this._visitStatements(getter.body)));
        const constructor = (stmt.constructorMethod && [ts.createConstructor(
            /* decorators */ undefined, 
            /* modifiers */ undefined, 
            /* parameters */ stmt.constructorMethod.params.map(p => ts.createParameter(
            /* decorators */ undefined, 
            /* modifiers */ undefined, 
            /* dotDotDotToken */ undefined, p.name)), this._visitStatements(stmt.constructorMethod.body))]) ||
            [];
        // TODO {chuckj}: Determine what should be done for a method with a null name.
        const methods = stmt.methods.filter(method => method.name)
            .map(method => ts.createMethod(
        /* decorators */ undefined, 
        /* modifiers */ translateModifiers(method.modifiers), 
        /* astriskToken */ undefined, method.name /* guarded by filter */, 
        /* questionToken */ undefined, /* typeParameters */ undefined, method.params.map(p => ts.createParameter(
        /* decorators */ undefined, /* modifiers */ undefined, 
        /* dotDotDotToken */ undefined, p.name)), 
        /* type */ undefined, this._visitStatements(method.body)));
        return this.record(stmt, ts.createClassDeclaration(
        /* decorators */ undefined, modifiers, stmt.name, /* typeParameters*/ undefined, stmt.parent && [ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [stmt.parent.visitExpression(this, null)])] ||
            [], [...fields, ...getters, ...constructor, ...methods]));
    }
    visitIfStmt(stmt) {
        return this.record(stmt, ts.createIf(stmt.condition.visitExpression(this, null), this._visitStatements(stmt.trueCase), stmt.falseCase && stmt.falseCase.length && this._visitStatements(stmt.falseCase) ||
            undefined));
    }
    visitTryCatchStmt(stmt) {
        return this.record(stmt, ts.createTry(this._visitStatements(stmt.bodyStmts), ts.createCatchClause(CATCH_ERROR_NAME, this._visitStatementsPrefix([ts.createVariableStatement(
            /* modifiers */ undefined, [ts.createVariableDeclaration(CATCH_STACK_NAME, /* type */ undefined, ts.createPropertyAccess(ts.createIdentifier(CATCH_ERROR_NAME), ts.createIdentifier(CATCH_STACK_NAME)))])], stmt.catchStmts)), 
        /* finallyBlock */ undefined));
    }
    visitThrowStmt(stmt) {
        return this.record(stmt, ts.createThrow(stmt.error.visitExpression(this, null)));
    }
    visitCommentStmt(stmt, sourceFile) {
        const text = stmt.multiline ? ` ${stmt.comment} ` : ` ${stmt.comment}`;
        return this.createCommentStmt(text, stmt.multiline, sourceFile);
    }
    visitJSDocCommentStmt(stmt, sourceFile) {
        return this.createCommentStmt(stmt.toString(), true, sourceFile);
    }
    createCommentStmt(text, multiline, sourceFile) {
        const commentStmt = ts.createNotEmittedStatement(sourceFile);
        const kind = multiline ? ts.SyntaxKind.MultiLineCommentTrivia : ts.SyntaxKind.SingleLineCommentTrivia;
        ts.setSyntheticLeadingComments(commentStmt, [{ kind, text, pos: -1, end: -1 }]);
        return commentStmt;
    }
    // ExpressionVisitor
    visitReadVarExpr(expr) {
        switch (expr.builtin) {
            case compiler_1.BuiltinVar.This:
                return this.record(expr, ts.createIdentifier(METHOD_THIS_NAME));
            case compiler_1.BuiltinVar.CatchError:
                return this.record(expr, ts.createIdentifier(CATCH_ERROR_NAME));
            case compiler_1.BuiltinVar.CatchStack:
                return this.record(expr, ts.createIdentifier(CATCH_STACK_NAME));
            case compiler_1.BuiltinVar.Super:
                return this.record(expr, ts.createSuper());
        }
        if (expr.name) {
            return this.record(expr, ts.createIdentifier(expr.name));
        }
        throw Error(`Unexpected ReadVarExpr form`);
    }
    visitWriteVarExpr(expr) {
        return this.record(expr, ts.createAssignment(ts.createIdentifier(expr.name), expr.value.visitExpression(this, null)));
    }
    visitWriteKeyExpr(expr) {
        return this.record(expr, ts.createAssignment(ts.createElementAccess(expr.receiver.visitExpression(this, null), expr.index.visitExpression(this, null)), expr.value.visitExpression(this, null)));
    }
    visitWritePropExpr(expr) {
        return this.record(expr, ts.createAssignment(ts.createPropertyAccess(expr.receiver.visitExpression(this, null), expr.name), expr.value.visitExpression(this, null)));
    }
    visitInvokeMethodExpr(expr) {
        const methodName = getMethodName(expr);
        return this.record(expr, ts.createCall(ts.createPropertyAccess(expr.receiver.visitExpression(this, null), methodName), 
        /* typeArguments */ undefined, expr.args.map(arg => arg.visitExpression(this, null))));
    }
    visitInvokeFunctionExpr(expr) {
        return this.record(expr, ts.createCall(expr.fn.visitExpression(this, null), /* typeArguments */ undefined, expr.args.map(arg => arg.visitExpression(this, null))));
    }
    visitInstantiateExpr(expr) {
        return this.record(expr, ts.createNew(expr.classExpr.visitExpression(this, null), /* typeArguments */ undefined, expr.args.map(arg => arg.visitExpression(this, null))));
    }
    visitLiteralExpr(expr) { return this.record(expr, createLiteral(expr.value)); }
    visitExternalExpr(expr) {
        return this.record(expr, this._visitIdentifier(expr.value));
    }
    visitConditionalExpr(expr) {
        // TODO {chuckj}: Review use of ! on falseCase. Should it be non-nullable?
        return this.record(expr, ts.createParen(ts.createConditional(expr.condition.visitExpression(this, null), expr.trueCase.visitExpression(this, null), expr.falseCase.visitExpression(this, null))));
    }
    visitNotExpr(expr) {
        return this.record(expr, ts.createPrefix(ts.SyntaxKind.ExclamationToken, expr.condition.visitExpression(this, null)));
    }
    visitAssertNotNullExpr(expr) {
        return expr.condition.visitExpression(this, null);
    }
    visitCastExpr(expr) {
        return expr.value.visitExpression(this, null);
    }
    visitFunctionExpr(expr) {
        return this.record(expr, ts.createFunctionExpression(
        /* modifiers */ undefined, /* astriskToken */ undefined, 
        /* name */ expr.name || undefined, 
        /* typeParameters */ undefined, expr.params.map(p => ts.createParameter(
        /* decorators */ undefined, /* modifiers */ undefined, 
        /* dotDotDotToken */ undefined, p.name)), 
        /* type */ undefined, this._visitStatements(expr.statements)));
    }
    visitBinaryOperatorExpr(expr) {
        let binaryOperator;
        switch (expr.operator) {
            case compiler_1.BinaryOperator.And:
                binaryOperator = ts.SyntaxKind.AmpersandAmpersandToken;
                break;
            case compiler_1.BinaryOperator.Bigger:
                binaryOperator = ts.SyntaxKind.GreaterThanToken;
                break;
            case compiler_1.BinaryOperator.BiggerEquals:
                binaryOperator = ts.SyntaxKind.GreaterThanEqualsToken;
                break;
            case compiler_1.BinaryOperator.Divide:
                binaryOperator = ts.SyntaxKind.SlashToken;
                break;
            case compiler_1.BinaryOperator.Equals:
                binaryOperator = ts.SyntaxKind.EqualsEqualsToken;
                break;
            case compiler_1.BinaryOperator.Identical:
                binaryOperator = ts.SyntaxKind.EqualsEqualsEqualsToken;
                break;
            case compiler_1.BinaryOperator.Lower:
                binaryOperator = ts.SyntaxKind.LessThanToken;
                break;
            case compiler_1.BinaryOperator.LowerEquals:
                binaryOperator = ts.SyntaxKind.LessThanEqualsToken;
                break;
            case compiler_1.BinaryOperator.Minus:
                binaryOperator = ts.SyntaxKind.MinusToken;
                break;
            case compiler_1.BinaryOperator.Modulo:
                binaryOperator = ts.SyntaxKind.PercentToken;
                break;
            case compiler_1.BinaryOperator.Multiply:
                binaryOperator = ts.SyntaxKind.AsteriskToken;
                break;
            case compiler_1.BinaryOperator.NotEquals:
                binaryOperator = ts.SyntaxKind.ExclamationEqualsToken;
                break;
            case compiler_1.BinaryOperator.NotIdentical:
                binaryOperator = ts.SyntaxKind.ExclamationEqualsEqualsToken;
                break;
            case compiler_1.BinaryOperator.Or:
                binaryOperator = ts.SyntaxKind.BarBarToken;
                break;
            case compiler_1.BinaryOperator.Plus:
                binaryOperator = ts.SyntaxKind.PlusToken;
                break;
            default:
                throw new Error(`Unknown operator: ${expr.operator}`);
        }
        return this.record(expr, ts.createParen(ts.createBinary(expr.lhs.visitExpression(this, null), binaryOperator, expr.rhs.visitExpression(this, null))));
    }
    visitReadPropExpr(expr) {
        return this.record(expr, ts.createPropertyAccess(expr.receiver.visitExpression(this, null), expr.name));
    }
    visitReadKeyExpr(expr) {
        return this.record(expr, ts.createElementAccess(expr.receiver.visitExpression(this, null), expr.index.visitExpression(this, null)));
    }
    visitLiteralArrayExpr(expr) {
        return this.record(expr, ts.createArrayLiteral(expr.entries.map(entry => entry.visitExpression(this, null))));
    }
    visitLiteralMapExpr(expr) {
        return this.record(expr, ts.createObjectLiteral(expr.entries.map(entry => ts.createPropertyAssignment(entry.quoted || !_VALID_IDENTIFIER_RE.test(entry.key) ?
            ts.createLiteral(entry.key) :
            entry.key, entry.value.visitExpression(this, null)))));
    }
    visitCommaExpr(expr) {
        return this.record(expr, expr.parts.map(e => e.visitExpression(this, null))
            .reduce((left, right) => left ? ts.createBinary(left, ts.SyntaxKind.CommaToken, right) : right, null));
    }
    _visitStatements(statements) {
        return this._visitStatementsPrefix([], statements);
    }
    _visitStatementsPrefix(prefix, statements) {
        return ts.createBlock([
            ...prefix, ...statements.map(stmt => stmt.visitStatement(this, null)).filter(f => f != null)
        ]);
    }
    _visitIdentifier(value) {
        // name can only be null during JIT which never executes this code.
        const moduleName = value.moduleName, name = value.name;
        let prefixIdent = null;
        if (moduleName) {
            let prefix = this._importsWithPrefixes.get(moduleName);
            if (prefix == null) {
                prefix = `i${this._importsWithPrefixes.size}`;
                this._importsWithPrefixes.set(moduleName, prefix);
            }
            prefixIdent = ts.createIdentifier(prefix);
        }
        if (prefixIdent) {
            return ts.createPropertyAccess(prefixIdent, name);
        }
        else {
            const id = ts.createIdentifier(name);
            if (this._exportedVariableIdentifiers.has(name)) {
                // In order for this new identifier node to be properly rewritten in CommonJS output,
                // it must have its original node set to a parsed instance of the same identifier.
                ts.setOriginalNode(id, this._exportedVariableIdentifiers.get(name));
            }
            return id;
        }
    }
}
function getMethodName(methodRef) {
    if (methodRef.name) {
        return methodRef.name;
    }
    else {
        switch (methodRef.builtin) {
            case compiler_1.BuiltinMethod.Bind:
                return 'bind';
            case compiler_1.BuiltinMethod.ConcatArray:
                return 'concat';
            case compiler_1.BuiltinMethod.SubscribeObservable:
                return 'subscribe';
        }
    }
    throw new Error('Unexpected method reference form');
}
function modifierFromModifier(modifier) {
    switch (modifier) {
        case compiler_1.StmtModifier.Exported:
            return ts.createToken(ts.SyntaxKind.ExportKeyword);
        case compiler_1.StmtModifier.Final:
            return ts.createToken(ts.SyntaxKind.ConstKeyword);
        case compiler_1.StmtModifier.Private:
            return ts.createToken(ts.SyntaxKind.PrivateKeyword);
        case compiler_1.StmtModifier.Static:
            return ts.createToken(ts.SyntaxKind.StaticKeyword);
    }
    return util_1.error(`unknown statement modifier`);
}
function translateModifiers(modifiers) {
    return modifiers == null ? undefined : modifiers.map(modifierFromModifier);
}
//# sourceMappingURL=node_emitter.js.map