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
        define("@angular/compiler-cli/src/transformers/node_emitter", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/transformers/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var util_1 = require("@angular/compiler-cli/src/transformers/util");
    var METHOD_THIS_NAME = 'this';
    var CATCH_ERROR_NAME = 'error';
    var CATCH_STACK_NAME = 'stack';
    var _VALID_IDENTIFIER_RE = /^[$A-Z_][0-9A-Z_$]*$/i;
    var TypeScriptNodeEmitter = /** @class */ (function () {
        function TypeScriptNodeEmitter() {
        }
        TypeScriptNodeEmitter.prototype.updateSourceFile = function (sourceFile, stmts, preamble) {
            var converter = new NodeEmitterVisitor();
            // [].concat flattens the result so that each `visit...` method can also return an array of
            // stmts.
            var statements = [].concat.apply([], tslib_1.__spread(stmts.map(function (stmt) { return stmt.visitStatement(converter, null); }).filter(function (stmt) { return stmt != null; })));
            var preambleStmts = [];
            if (preamble) {
                var commentStmt = this.createCommentStatement(sourceFile, preamble);
                preambleStmts.push(commentStmt);
            }
            var sourceStatements = tslib_1.__spread(preambleStmts, converter.getReexports(), converter.getImports(), statements);
            converter.updateSourceMap(sourceStatements);
            var newSourceFile = ts.updateSourceFileNode(sourceFile, sourceStatements);
            return [newSourceFile, converter.getNodeMap()];
        };
        /** Creates a not emitted statement containing the given comment. */
        TypeScriptNodeEmitter.prototype.createCommentStatement = function (sourceFile, comment) {
            if (comment.startsWith('/*') && comment.endsWith('*/')) {
                comment = comment.substr(2, comment.length - 4);
            }
            var commentStmt = ts.createNotEmittedStatement(sourceFile);
            ts.setSyntheticLeadingComments(commentStmt, [{ kind: ts.SyntaxKind.MultiLineCommentTrivia, text: comment, pos: -1, end: -1 }]);
            ts.setEmitFlags(commentStmt, ts.EmitFlags.CustomPrologue);
            return commentStmt;
        };
        return TypeScriptNodeEmitter;
    }());
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
        var converter = new NodeEmitterVisitor();
        converter.loadExportedVariableIdentifiers(sourceFile);
        var prefixStatements = module.statements.filter(function (statement) { return !(statement instanceof compiler_1.ClassStmt); });
        var classes = module.statements.filter(function (statement) { return statement instanceof compiler_1.ClassStmt; });
        var classMap = new Map(classes.map(function (classStatement) { return [classStatement.name, classStatement]; }));
        var classNames = new Set(classes.map(function (classStatement) { return classStatement.name; }));
        var prefix = prefixStatements.map(function (statement) { return statement.visitStatement(converter, sourceFile); });
        // Add static methods to all the classes referenced in module.
        var newStatements = sourceFile.statements.map(function (node) {
            if (node.kind == ts.SyntaxKind.ClassDeclaration) {
                var classDeclaration = node;
                var name = classDeclaration.name;
                if (name) {
                    var classStatement = classMap.get(name.text);
                    if (classStatement) {
                        classNames.delete(name.text);
                        var classMemberHolder = converter.visitDeclareClassStmt(classStatement);
                        var newMethods = classMemberHolder.members.filter(function (member) { return member.kind !== ts.SyntaxKind.Constructor; });
                        var newMembers = tslib_1.__spread(classDeclaration.members, newMethods);
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
            util_1.error((classNames.size == 1 ? 'Class' : 'Classes') + " \"" + Array.from(classNames.keys()).join(', ') + "\" not generated");
        // Add imports to the module required by the new methods
        var imports = converter.getImports();
        if (imports && imports.length) {
            // Find where the new imports should go
            var index = firstAfter(newStatements, function (statement) { return statement.kind === ts.SyntaxKind.ImportDeclaration ||
                statement.kind === ts.SyntaxKind.ImportEqualsDeclaration; });
            newStatements = tslib_1.__spread(newStatements.slice(0, index), imports, prefix, newStatements.slice(index));
        }
        else {
            newStatements = tslib_1.__spread(prefix, newStatements);
        }
        converter.updateSourceMap(newStatements);
        var newSourceFile = ts.updateSourceFileNode(sourceFile, newStatements);
        return [newSourceFile, converter.getNodeMap()];
    }
    exports.updateSourceFile = updateSourceFile;
    // Return the index after the first value in `a` that doesn't match the predicate after a value that
    // does or 0 if no values match.
    function firstAfter(a, predicate) {
        var index = 0;
        var len = a.length;
        for (; index < len; index++) {
            var value = a[index];
            if (predicate(value))
                break;
        }
        if (index >= len)
            return 0;
        for (; index < len; index++) {
            var value = a[index];
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
            var result = ts.createLiteral(value);
            if (ts.isStringLiteral(result) && result.text.indexOf('\\') >= 0) {
                // Hack to avoid problems cause indirectly by:
                //    https://github.com/Microsoft/TypeScript/issues/20192
                // This avoids the string escaping normally performed for a string relying on that
                // TypeScript just emits the text raw for a numeric literal.
                result.kind = ts.SyntaxKind.NumericLiteral;
                result.text = "\"" + escapeLiteral(result.text) + "\"";
            }
            return result;
        }
    }
    function isExportTypeStatement(statement) {
        return !!statement.modifiers &&
            statement.modifiers.some(function (mod) { return mod.kind === ts.SyntaxKind.ExportKeyword; });
    }
    /**
     * Visits an output ast and produces the corresponding TypeScript synthetic nodes.
     */
    var NodeEmitterVisitor = /** @class */ (function () {
        function NodeEmitterVisitor() {
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
        NodeEmitterVisitor.prototype.loadExportedVariableIdentifiers = function (sourceFile) {
            var _this = this;
            sourceFile.statements.forEach(function (statement) {
                if (ts.isVariableStatement(statement) && isExportTypeStatement(statement)) {
                    statement.declarationList.declarations.forEach(function (declaration) {
                        if (ts.isIdentifier(declaration.name)) {
                            _this._exportedVariableIdentifiers.set(declaration.name.text, declaration.name);
                        }
                    });
                }
            });
        };
        NodeEmitterVisitor.prototype.getReexports = function () {
            return Array.from(this._reexports.entries())
                .map(function (_a) {
                var _b = tslib_1.__read(_a, 2), exportedFilePath = _b[0], reexports = _b[1];
                return ts.createExportDeclaration(
                /* decorators */ undefined, 
                /* modifiers */ undefined, ts.createNamedExports(reexports.map(function (_a) {
                    var name = _a.name, as = _a.as;
                    return ts.createExportSpecifier(name, as);
                })), 
                /* moduleSpecifier */ createLiteral(exportedFilePath));
            });
        };
        NodeEmitterVisitor.prototype.getImports = function () {
            return Array.from(this._importsWithPrefixes.entries())
                .map(function (_a) {
                var _b = tslib_1.__read(_a, 2), namespace = _b[0], prefix = _b[1];
                return ts.createImportDeclaration(
                /* decorators */ undefined, 
                /* modifiers */ undefined, 
                /* importClause */ ts.createImportClause(
                /* name */ undefined, ts.createNamespaceImport(ts.createIdentifier(prefix))), 
                /* moduleSpecifier */ createLiteral(namespace));
            });
        };
        NodeEmitterVisitor.prototype.getNodeMap = function () { return this._nodeMap; };
        NodeEmitterVisitor.prototype.updateSourceMap = function (statements) {
            var _this = this;
            var lastRangeStartNode = undefined;
            var lastRangeEndNode = undefined;
            var lastRange = undefined;
            var recordLastSourceRange = function () {
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
            var visitNode = function (tsNode) {
                var ngNode = _this._nodeMap.get(tsNode);
                if (ngNode) {
                    var range = _this.sourceRangeOf(ngNode);
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
        };
        NodeEmitterVisitor.prototype.record = function (ngNode, tsNode) {
            if (tsNode && !this._nodeMap.has(tsNode)) {
                this._nodeMap.set(tsNode, ngNode);
            }
            return tsNode;
        };
        NodeEmitterVisitor.prototype.sourceRangeOf = function (node) {
            if (node.sourceSpan) {
                var span = node.sourceSpan;
                if (span.start.file == span.end.file) {
                    var file = span.start.file;
                    if (file.url) {
                        var source = this._templateSources.get(file);
                        if (!source) {
                            source = ts.createSourceMapSource(file.url, file.content, function (pos) { return pos; });
                            this._templateSources.set(file, source);
                        }
                        return { pos: span.start.offset, end: span.end.offset, source: source };
                    }
                }
            }
            return null;
        };
        NodeEmitterVisitor.prototype.getModifiers = function (stmt) {
            var modifiers = [];
            if (stmt.hasModifier(compiler_1.StmtModifier.Exported)) {
                modifiers.push(ts.createToken(ts.SyntaxKind.ExportKeyword));
            }
            return modifiers;
        };
        // StatementVisitor
        NodeEmitterVisitor.prototype.visitDeclareVarStmt = function (stmt) {
            if (stmt.hasModifier(compiler_1.StmtModifier.Exported) && stmt.value instanceof compiler_1.ExternalExpr &&
                !stmt.type) {
                // check for a reexport
                var _a = stmt.value.value, name = _a.name, moduleName = _a.moduleName;
                if (moduleName) {
                    var reexports = this._reexports.get(moduleName);
                    if (!reexports) {
                        reexports = [];
                        this._reexports.set(moduleName, reexports);
                    }
                    reexports.push({ name: name, as: stmt.name });
                    return null;
                }
            }
            var varDeclList = ts.createVariableDeclarationList([ts.createVariableDeclaration(ts.createIdentifier(stmt.name), 
                /* type */ undefined, (stmt.value && stmt.value.visitExpression(this, null)) || undefined)]);
            if (stmt.hasModifier(compiler_1.StmtModifier.Exported)) {
                // Note: We need to add an explicit variable and export declaration so that
                // the variable can be referred in the same file as well.
                var tsVarStmt = this.record(stmt, ts.createVariableStatement(/* modifiers */ [], varDeclList));
                var exportStmt = this.record(stmt, ts.createExportDeclaration(
                /*decorators*/ undefined, /*modifiers*/ undefined, ts.createNamedExports([ts.createExportSpecifier(stmt.name, stmt.name)])));
                return [tsVarStmt, exportStmt];
            }
            return this.record(stmt, ts.createVariableStatement(this.getModifiers(stmt), varDeclList));
        };
        NodeEmitterVisitor.prototype.visitDeclareFunctionStmt = function (stmt) {
            return this.record(stmt, ts.createFunctionDeclaration(
            /* decorators */ undefined, this.getModifiers(stmt), 
            /* asteriskToken */ undefined, stmt.name, /* typeParameters */ undefined, stmt.params.map(function (p) { return ts.createParameter(
            /* decorators */ undefined, /* modifiers */ undefined, 
            /* dotDotDotToken */ undefined, p.name); }), 
            /* type */ undefined, this._visitStatements(stmt.statements)));
        };
        NodeEmitterVisitor.prototype.visitExpressionStmt = function (stmt) {
            return this.record(stmt, ts.createStatement(stmt.expr.visitExpression(this, null)));
        };
        NodeEmitterVisitor.prototype.visitReturnStmt = function (stmt) {
            return this.record(stmt, ts.createReturn(stmt.value ? stmt.value.visitExpression(this, null) : undefined));
        };
        NodeEmitterVisitor.prototype.visitDeclareClassStmt = function (stmt) {
            var _this = this;
            var modifiers = this.getModifiers(stmt);
            var fields = stmt.fields.map(function (field) { return ts.createProperty(
            /* decorators */ undefined, /* modifiers */ translateModifiers(field.modifiers), field.name, 
            /* questionToken */ undefined, 
            /* type */ undefined, field.initializer == null ? ts.createNull() :
                field.initializer.visitExpression(_this, null)); });
            var getters = stmt.getters.map(function (getter) { return ts.createGetAccessor(
            /* decorators */ undefined, /* modifiers */ undefined, getter.name, /* parameters */ [], 
            /* type */ undefined, _this._visitStatements(getter.body)); });
            var constructor = (stmt.constructorMethod && [ts.createConstructor(
                /* decorators */ undefined, 
                /* modifiers */ undefined, 
                /* parameters */ stmt.constructorMethod.params.map(function (p) { return ts.createParameter(
                /* decorators */ undefined, 
                /* modifiers */ undefined, 
                /* dotDotDotToken */ undefined, p.name); }), this._visitStatements(stmt.constructorMethod.body))]) ||
                [];
            // TODO {chuckj}: Determine what should be done for a method with a null name.
            var methods = stmt.methods.filter(function (method) { return method.name; })
                .map(function (method) { return ts.createMethod(
            /* decorators */ undefined, 
            /* modifiers */ translateModifiers(method.modifiers), 
            /* astriskToken */ undefined, method.name /* guarded by filter */, 
            /* questionToken */ undefined, /* typeParameters */ undefined, method.params.map(function (p) { return ts.createParameter(
            /* decorators */ undefined, /* modifiers */ undefined, 
            /* dotDotDotToken */ undefined, p.name); }), 
            /* type */ undefined, _this._visitStatements(method.body)); });
            return this.record(stmt, ts.createClassDeclaration(
            /* decorators */ undefined, modifiers, stmt.name, /* typeParameters*/ undefined, stmt.parent && [ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [stmt.parent.visitExpression(this, null)])] ||
                [], tslib_1.__spread(fields, getters, constructor, methods)));
        };
        NodeEmitterVisitor.prototype.visitIfStmt = function (stmt) {
            return this.record(stmt, ts.createIf(stmt.condition.visitExpression(this, null), this._visitStatements(stmt.trueCase), stmt.falseCase && stmt.falseCase.length && this._visitStatements(stmt.falseCase) ||
                undefined));
        };
        NodeEmitterVisitor.prototype.visitTryCatchStmt = function (stmt) {
            return this.record(stmt, ts.createTry(this._visitStatements(stmt.bodyStmts), ts.createCatchClause(CATCH_ERROR_NAME, this._visitStatementsPrefix([ts.createVariableStatement(
                /* modifiers */ undefined, [ts.createVariableDeclaration(CATCH_STACK_NAME, /* type */ undefined, ts.createPropertyAccess(ts.createIdentifier(CATCH_ERROR_NAME), ts.createIdentifier(CATCH_STACK_NAME)))])], stmt.catchStmts)), 
            /* finallyBlock */ undefined));
        };
        NodeEmitterVisitor.prototype.visitThrowStmt = function (stmt) {
            return this.record(stmt, ts.createThrow(stmt.error.visitExpression(this, null)));
        };
        NodeEmitterVisitor.prototype.visitCommentStmt = function (stmt, sourceFile) {
            var text = stmt.multiline ? " " + stmt.comment + " " : " " + stmt.comment;
            return this.createCommentStmt(text, stmt.multiline, sourceFile);
        };
        NodeEmitterVisitor.prototype.visitJSDocCommentStmt = function (stmt, sourceFile) {
            return this.createCommentStmt(stmt.toString(), true, sourceFile);
        };
        NodeEmitterVisitor.prototype.createCommentStmt = function (text, multiline, sourceFile) {
            var commentStmt = ts.createNotEmittedStatement(sourceFile);
            var kind = multiline ? ts.SyntaxKind.MultiLineCommentTrivia : ts.SyntaxKind.SingleLineCommentTrivia;
            ts.setSyntheticLeadingComments(commentStmt, [{ kind: kind, text: text, pos: -1, end: -1 }]);
            return commentStmt;
        };
        // ExpressionVisitor
        NodeEmitterVisitor.prototype.visitWrappedNodeExpr = function (expr) { return this.record(expr, expr.node); };
        // ExpressionVisitor
        NodeEmitterVisitor.prototype.visitReadVarExpr = function (expr) {
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
            throw Error("Unexpected ReadVarExpr form");
        };
        NodeEmitterVisitor.prototype.visitWriteVarExpr = function (expr) {
            return this.record(expr, ts.createAssignment(ts.createIdentifier(expr.name), expr.value.visitExpression(this, null)));
        };
        NodeEmitterVisitor.prototype.visitWriteKeyExpr = function (expr) {
            return this.record(expr, ts.createAssignment(ts.createElementAccess(expr.receiver.visitExpression(this, null), expr.index.visitExpression(this, null)), expr.value.visitExpression(this, null)));
        };
        NodeEmitterVisitor.prototype.visitWritePropExpr = function (expr) {
            return this.record(expr, ts.createAssignment(ts.createPropertyAccess(expr.receiver.visitExpression(this, null), expr.name), expr.value.visitExpression(this, null)));
        };
        NodeEmitterVisitor.prototype.visitInvokeMethodExpr = function (expr) {
            var _this = this;
            var methodName = getMethodName(expr);
            return this.record(expr, ts.createCall(ts.createPropertyAccess(expr.receiver.visitExpression(this, null), methodName), 
            /* typeArguments */ undefined, expr.args.map(function (arg) { return arg.visitExpression(_this, null); })));
        };
        NodeEmitterVisitor.prototype.visitInvokeFunctionExpr = function (expr) {
            var _this = this;
            return this.record(expr, ts.createCall(expr.fn.visitExpression(this, null), /* typeArguments */ undefined, expr.args.map(function (arg) { return arg.visitExpression(_this, null); })));
        };
        NodeEmitterVisitor.prototype.visitInstantiateExpr = function (expr) {
            var _this = this;
            return this.record(expr, ts.createNew(expr.classExpr.visitExpression(this, null), /* typeArguments */ undefined, expr.args.map(function (arg) { return arg.visitExpression(_this, null); })));
        };
        NodeEmitterVisitor.prototype.visitLiteralExpr = function (expr) { return this.record(expr, createLiteral(expr.value)); };
        NodeEmitterVisitor.prototype.visitExternalExpr = function (expr) {
            return this.record(expr, this._visitIdentifier(expr.value));
        };
        NodeEmitterVisitor.prototype.visitConditionalExpr = function (expr) {
            // TODO {chuckj}: Review use of ! on falseCase. Should it be non-nullable?
            return this.record(expr, ts.createParen(ts.createConditional(expr.condition.visitExpression(this, null), expr.trueCase.visitExpression(this, null), expr.falseCase.visitExpression(this, null))));
        };
        NodeEmitterVisitor.prototype.visitNotExpr = function (expr) {
            return this.record(expr, ts.createPrefix(ts.SyntaxKind.ExclamationToken, expr.condition.visitExpression(this, null)));
        };
        NodeEmitterVisitor.prototype.visitAssertNotNullExpr = function (expr) {
            return expr.condition.visitExpression(this, null);
        };
        NodeEmitterVisitor.prototype.visitCastExpr = function (expr) {
            return expr.value.visitExpression(this, null);
        };
        NodeEmitterVisitor.prototype.visitFunctionExpr = function (expr) {
            return this.record(expr, ts.createFunctionExpression(
            /* modifiers */ undefined, /* astriskToken */ undefined, 
            /* name */ expr.name || undefined, 
            /* typeParameters */ undefined, expr.params.map(function (p) { return ts.createParameter(
            /* decorators */ undefined, /* modifiers */ undefined, 
            /* dotDotDotToken */ undefined, p.name); }), 
            /* type */ undefined, this._visitStatements(expr.statements)));
        };
        NodeEmitterVisitor.prototype.visitBinaryOperatorExpr = function (expr) {
            var binaryOperator;
            switch (expr.operator) {
                case compiler_1.BinaryOperator.And:
                    binaryOperator = ts.SyntaxKind.AmpersandAmpersandToken;
                    break;
                case compiler_1.BinaryOperator.BitwiseAnd:
                    binaryOperator = ts.SyntaxKind.AmpersandToken;
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
                    throw new Error("Unknown operator: " + expr.operator);
            }
            var binary = ts.createBinary(expr.lhs.visitExpression(this, null), binaryOperator, expr.rhs.visitExpression(this, null));
            return this.record(expr, expr.parens ? ts.createParen(binary) : binary);
        };
        NodeEmitterVisitor.prototype.visitReadPropExpr = function (expr) {
            return this.record(expr, ts.createPropertyAccess(expr.receiver.visitExpression(this, null), expr.name));
        };
        NodeEmitterVisitor.prototype.visitReadKeyExpr = function (expr) {
            return this.record(expr, ts.createElementAccess(expr.receiver.visitExpression(this, null), expr.index.visitExpression(this, null)));
        };
        NodeEmitterVisitor.prototype.visitLiteralArrayExpr = function (expr) {
            var _this = this;
            return this.record(expr, ts.createArrayLiteral(expr.entries.map(function (entry) { return entry.visitExpression(_this, null); })));
        };
        NodeEmitterVisitor.prototype.visitLiteralMapExpr = function (expr) {
            var _this = this;
            return this.record(expr, ts.createObjectLiteral(expr.entries.map(function (entry) { return ts.createPropertyAssignment(entry.quoted || !_VALID_IDENTIFIER_RE.test(entry.key) ?
                ts.createLiteral(entry.key) :
                entry.key, entry.value.visitExpression(_this, null)); })));
        };
        NodeEmitterVisitor.prototype.visitCommaExpr = function (expr) {
            var _this = this;
            return this.record(expr, expr.parts.map(function (e) { return e.visitExpression(_this, null); })
                .reduce(function (left, right) {
                return left ? ts.createBinary(left, ts.SyntaxKind.CommaToken, right) : right;
            }, null));
        };
        NodeEmitterVisitor.prototype._visitStatements = function (statements) {
            return this._visitStatementsPrefix([], statements);
        };
        NodeEmitterVisitor.prototype._visitStatementsPrefix = function (prefix, statements) {
            var _this = this;
            return ts.createBlock(tslib_1.__spread(prefix, statements.map(function (stmt) { return stmt.visitStatement(_this, null); }).filter(function (f) { return f != null; })));
        };
        NodeEmitterVisitor.prototype._visitIdentifier = function (value) {
            // name can only be null during JIT which never executes this code.
            var moduleName = value.moduleName, name = value.name;
            var prefixIdent = null;
            if (moduleName) {
                var prefix = this._importsWithPrefixes.get(moduleName);
                if (prefix == null) {
                    prefix = "i" + this._importsWithPrefixes.size;
                    this._importsWithPrefixes.set(moduleName, prefix);
                }
                prefixIdent = ts.createIdentifier(prefix);
            }
            if (prefixIdent) {
                return ts.createPropertyAccess(prefixIdent, name);
            }
            else {
                var id = ts.createIdentifier(name);
                if (this._exportedVariableIdentifiers.has(name)) {
                    // In order for this new identifier node to be properly rewritten in CommonJS output,
                    // it must have its original node set to a parsed instance of the same identifier.
                    ts.setOriginalNode(id, this._exportedVariableIdentifiers.get(name));
                }
                return id;
            }
        };
        return NodeEmitterVisitor;
    }());
    exports.NodeEmitterVisitor = NodeEmitterVisitor;
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
        return util_1.error("unknown statement modifier");
    }
    function translateModifiers(modifiers) {
        return modifiers == null ? undefined : modifiers.map(modifierFromModifier);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZV9lbWl0dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy90cmFuc2Zvcm1lcnMvbm9kZV9lbWl0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUE0cEI7SUFDNXBCLCtCQUFpQztJQUVqQyxvRUFBNkI7SUFJN0IsSUFBTSxnQkFBZ0IsR0FBRyxNQUFNLENBQUM7SUFDaEMsSUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUM7SUFDakMsSUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUM7SUFDakMsSUFBTSxvQkFBb0IsR0FBRyx1QkFBdUIsQ0FBQztJQUVyRDtRQUFBO1FBZ0NBLENBQUM7UUEvQkMsZ0RBQWdCLEdBQWhCLFVBQWlCLFVBQXlCLEVBQUUsS0FBa0IsRUFBRSxRQUFpQjtZQUUvRSxJQUFNLFNBQVMsR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUM7WUFDM0MsMkZBQTJGO1lBQzNGLFNBQVM7WUFDVCxJQUFNLFVBQVUsR0FBVSxFQUFFLENBQUMsTUFBTSxPQUFULEVBQUUsbUJBQ3JCLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsRUFBcEMsQ0FBb0MsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLElBQUksSUFBSSxJQUFJLEVBQVosQ0FBWSxDQUFDLEVBQUMsQ0FBQztZQUM3RixJQUFNLGFBQWEsR0FBbUIsRUFBRSxDQUFDO1lBQ3pDLElBQUksUUFBUSxFQUFFO2dCQUNaLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQ3RFLGFBQWEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7YUFD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QkFBWSxDQUFDLEtBQUs7Z0JBQ3JCLE9BQU8sRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3BELEtBQUssdUJBQVksQ0FBQyxPQUFPO2dCQUN2QixPQUFPLEVBQUUsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUN0RCxLQUFLLHVCQUFZLENBQUMsTUFBTTtnQkFDdEIsT0FBTyxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUM7U0FDdEQ7UUFDRCxPQUFPLFlBQUssQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFRCw0QkFBNEIsU0FBZ0M7UUFDMUQsT0FBTyxTQUFTLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQztJQUMvRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0Fzc2VydE5vdE51bGwsIEJpbmFyeU9wZXJhdG9yLCBCaW5hcnlPcGVyYXRvckV4cHIsIEJ1aWx0aW5NZXRob2QsIEJ1aWx0aW5WYXIsIENhc3RFeHByLCBDbGFzc1N0bXQsIENvbW1hRXhwciwgQ29tbWVudFN0bXQsIENvbmRpdGlvbmFsRXhwciwgRGVjbGFyZUZ1bmN0aW9uU3RtdCwgRGVjbGFyZVZhclN0bXQsIEV4cHJlc3Npb25TdGF0ZW1lbnQsIEV4cHJlc3Npb25WaXNpdG9yLCBFeHRlcm5hbEV4cHIsIEV4dGVybmFsUmVmZXJlbmNlLCBGdW5jdGlvbkV4cHIsIElmU3RtdCwgSW5zdGFudGlhdGVFeHByLCBJbnZva2VGdW5jdGlvbkV4cHIsIEludm9rZU1ldGhvZEV4cHIsIEpTRG9jQ29tbWVudFN0bXQsIExpdGVyYWxBcnJheUV4cHIsIExpdGVyYWxFeHByLCBMaXRlcmFsTWFwRXhwciwgTm90RXhwciwgUGFyc2VTb3VyY2VGaWxlLCBQYXJzZVNvdXJjZVNwYW4sIFBhcnRpYWxNb2R1bGUsIFJlYWRLZXlFeHByLCBSZWFkUHJvcEV4cHIsIFJlYWRWYXJFeHByLCBSZXR1cm5TdGF0ZW1lbnQsIFN0YXRlbWVudCwgU3RhdGVtZW50VmlzaXRvciwgU3RtdE1vZGlmaWVyLCBUaHJvd1N0bXQsIFRyeUNhdGNoU3RtdCwgV3JhcHBlZE5vZGVFeHByLCBXcml0ZUtleUV4cHIsIFdyaXRlUHJvcEV4cHIsIFdyaXRlVmFyRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7ZXJyb3J9IGZyb20gJy4vdXRpbCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTm9kZSB7IHNvdXJjZVNwYW46IFBhcnNlU291cmNlU3BhbnxudWxsOyB9XG5cbmNvbnN0IE1FVEhPRF9USElTX05BTUUgPSAndGhpcyc7XG5jb25zdCBDQVRDSF9FUlJPUl9OQU1FID0gJ2Vycm9yJztcbmNvbnN0IENBVENIX1NUQUNLX05BTUUgPSAnc3RhY2snO1xuY29uc3QgX1ZBTElEX0lERU5USUZJRVJfUkUgPSAvXlskQS1aX11bMC05QS1aXyRdKiQvaTtcblxuZXhwb3J0IGNsYXNzIFR5cGVTY3JpcHROb2RlRW1pdHRlciB7XG4gIHVwZGF0ZVNvdXJjZUZpbGUoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgc3RtdHM6IFN0YXRlbWVudFtdLCBwcmVhbWJsZT86IHN0cmluZyk6XG4gICAgICBbdHMuU291cmNlRmlsZSwgTWFwPHRzLk5vZGUsIE5vZGU+XSB7XG4gICAgY29uc3QgY29udmVydGVyID0gbmV3IE5vZGVFbWl0dGVyVmlzaXRvcigpO1xuICAgIC8vIFtdLmNvbmNhdCBmbGF0dGVucyB0aGUgcmVzdWx0IHNvIHRoYXQgZWFjaCBgdmlzaXQuLi5gIG1ldGhvZCBjYW4gYWxzbyByZXR1cm4gYW4gYXJyYXkgb2ZcbiAgICAvLyBzdG10cy5cbiAgICBjb25zdCBzdGF0ZW1lbnRzOiBhbnlbXSA9IFtdLmNvbmNhdChcbiAgICAgICAgLi4uc3RtdHMubWFwKHN0bXQgPT4gc3RtdC52aXNpdFN0YXRlbWVudChjb252ZXJ0ZXIsIG51bGwpKS5maWx0ZXIoc3RtdCA9PiBzdG10ICE9IG51bGwpKTtcbiAgICBjb25zdCBwcmVhbWJsZVN0bXRzOiB0cy5TdGF0ZW1lbnRbXSA9IFtdO1xuICAgIGlmIChwcmVhbWJsZSkge1xuICAgICAgY29uc3QgY29tbWVudFN0bXQgPSB0aGlzLmNyZWF0ZUNvbW1lbnRTdGF0ZW1lbnQoc291cmNlRmlsZSwgcHJlYW1ibGUpO1xuICAgICAgcHJlYW1ibGVTdG10cy5wdXNoKGNvbW1lbnRTdG10KTtcbiAgICB9XG4gICAgY29uc3Qgc291cmNlU3RhdGVtZW50cyA9XG4gICAgICAgIFsuLi5wcmVhbWJsZVN0bXRzLCAuLi5jb252ZXJ0ZXIuZ2V0UmVleHBvcnRzKCksIC4uLmNvbnZlcnRlci5nZXRJbXBvcnRzKCksIC4uLnN0YXRlbWVudHNdO1xuICAgIGNvbnZlcnRlci51cGRhdGVTb3VyY2VNYXAoc291cmNlU3RhdGVtZW50cyk7XG4gICAgY29uc3QgbmV3U291cmNlRmlsZSA9IHRzLnVwZGF0ZVNvdXJjZUZpbGVOb2RlKHNvdXJjZUZpbGUsIHNvdXJjZVN0YXRlbWVudHMpO1xuICAgIHJldHVybiBbbmV3U291cmNlRmlsZSwgY29udmVydGVyLmdldE5vZGVNYXAoKV07XG4gIH1cblxuICAvKiogQ3JlYXRlcyBhIG5vdCBlbWl0dGVkIHN0YXRlbWVudCBjb250YWluaW5nIHRoZSBnaXZlbiBjb21tZW50LiAqL1xuICBjcmVhdGVDb21tZW50U3RhdGVtZW50KHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIGNvbW1lbnQ6IHN0cmluZyk6IHRzLlN0YXRlbWVudCB7XG4gICAgaWYgKGNvbW1lbnQuc3RhcnRzV2l0aCgnLyonKSAmJiBjb21tZW50LmVuZHNXaXRoKCcqLycpKSB7XG4gICAgICBjb21tZW50ID0gY29tbWVudC5zdWJzdHIoMiwgY29tbWVudC5sZW5ndGggLSA0KTtcbiAgICB9XG4gICAgY29uc3QgY29tbWVudFN0bXQgPSB0cy5jcmVhdGVOb3RFbWl0dGVkU3RhdGVtZW50KHNvdXJjZUZpbGUpO1xuICAgIHRzLnNldFN5bnRoZXRpY0xlYWRpbmdDb21tZW50cyhcbiAgICAgICAgY29tbWVudFN0bXQsXG4gICAgICAgIFt7a2luZDogdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhLCB0ZXh0OiBjb21tZW50LCBwb3M6IC0xLCBlbmQ6IC0xfV0pO1xuICAgIHRzLnNldEVtaXRGbGFncyhjb21tZW50U3RtdCwgdHMuRW1pdEZsYWdzLkN1c3RvbVByb2xvZ3VlKTtcbiAgICByZXR1cm4gY29tbWVudFN0bXQ7XG4gIH1cbn1cblxuLyoqXG4gKiBVcGRhdGUgdGhlIGdpdmVuIHNvdXJjZSBmaWxlIHRvIGluY2x1ZGUgdGhlIGNoYW5nZXMgc3BlY2lmaWVkIGluIG1vZHVsZS5cbiAqXG4gKiBUaGUgbW9kdWxlIHBhcmFtZXRlciBpcyB0cmVhdGVkIGFzIGEgcGFydGlhbCBtb2R1bGUgbWVhbmluZyB0aGF0IHRoZSBzdGF0ZW1lbnRzIGFyZSBhZGRlZCB0b1xuICogdGhlIG1vZHVsZSBpbnN0ZWFkIG9mIHJlcGxhY2luZyB0aGUgbW9kdWxlLiBBbHNvLCBhbnkgY2xhc3NlcyBhcmUgdHJlYXRlZCBhcyBwYXJ0aWFsIGNsYXNzZXNcbiAqIGFuZCB0aGUgaW5jbHVkZWQgbWVtYmVycyBhcmUgYWRkZWQgdG8gdGhlIGNsYXNzIHdpdGggdGhlIHNhbWUgbmFtZSBpbnN0ZWFkIG9mIGEgbmV3IGNsYXNzXG4gKiBiZWluZyBjcmVhdGVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlU291cmNlRmlsZShcbiAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBtb2R1bGU6IFBhcnRpYWxNb2R1bGUsXG4gICAgY29udGV4dDogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0KTogW3RzLlNvdXJjZUZpbGUsIE1hcDx0cy5Ob2RlLCBOb2RlPl0ge1xuICBjb25zdCBjb252ZXJ0ZXIgPSBuZXcgTm9kZUVtaXR0ZXJWaXNpdG9yKCk7XG4gIGNvbnZlcnRlci5sb2FkRXhwb3J0ZWRWYXJpYWJsZUlkZW50aWZpZXJzKHNvdXJjZUZpbGUpO1xuXG4gIGNvbnN0IHByZWZpeFN0YXRlbWVudHMgPSBtb2R1bGUuc3RhdGVtZW50cy5maWx0ZXIoc3RhdGVtZW50ID0+ICEoc3RhdGVtZW50IGluc3RhbmNlb2YgQ2xhc3NTdG10KSk7XG4gIGNvbnN0IGNsYXNzZXMgPVxuICAgICAgbW9kdWxlLnN0YXRlbWVudHMuZmlsdGVyKHN0YXRlbWVudCA9PiBzdGF0ZW1lbnQgaW5zdGFuY2VvZiBDbGFzc1N0bXQpIGFzIENsYXNzU3RtdFtdO1xuICBjb25zdCBjbGFzc01hcCA9IG5ldyBNYXAoXG4gICAgICBjbGFzc2VzLm1hcDxbc3RyaW5nLCBDbGFzc1N0bXRdPihjbGFzc1N0YXRlbWVudCA9PiBbY2xhc3NTdGF0ZW1lbnQubmFtZSwgY2xhc3NTdGF0ZW1lbnRdKSk7XG4gIGNvbnN0IGNsYXNzTmFtZXMgPSBuZXcgU2V0KGNsYXNzZXMubWFwKGNsYXNzU3RhdGVtZW50ID0+IGNsYXNzU3RhdGVtZW50Lm5hbWUpKTtcblxuICBjb25zdCBwcmVmaXg6IHRzLlN0YXRlbWVudFtdID1cbiAgICAgIHByZWZpeFN0YXRlbWVudHMubWFwKHN0YXRlbWVudCA9PiBzdGF0ZW1lbnQudmlzaXRTdGF0ZW1lbnQoY29udmVydGVyLCBzb3VyY2VGaWxlKSk7XG5cbiAgLy8gQWRkIHN0YXRpYyBtZXRob2RzIHRvIGFsbCB0aGUgY2xhc3NlcyByZWZlcmVuY2VkIGluIG1vZHVsZS5cbiAgbGV0IG5ld1N0YXRlbWVudHMgPSBzb3VyY2VGaWxlLnN0YXRlbWVudHMubWFwKG5vZGUgPT4ge1xuICAgIGlmIChub2RlLmtpbmQgPT0gdHMuU3ludGF4S2luZC5DbGFzc0RlY2xhcmF0aW9uKSB7XG4gICAgICBjb25zdCBjbGFzc0RlY2xhcmF0aW9uID0gbm9kZSBhcyB0cy5DbGFzc0RlY2xhcmF0aW9uO1xuICAgICAgY29uc3QgbmFtZSA9IGNsYXNzRGVjbGFyYXRpb24ubmFtZTtcbiAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgIGNvbnN0IGNsYXNzU3RhdGVtZW50ID0gY2xhc3NNYXAuZ2V0KG5hbWUudGV4dCk7XG4gICAgICAgIGlmIChjbGFzc1N0YXRlbWVudCkge1xuICAgICAgICAgIGNsYXNzTmFtZXMuZGVsZXRlKG5hbWUudGV4dCk7XG4gICAgICAgICAgY29uc3QgY2xhc3NNZW1iZXJIb2xkZXIgPVxuICAgICAgICAgICAgICBjb252ZXJ0ZXIudmlzaXREZWNsYXJlQ2xhc3NTdG10KGNsYXNzU3RhdGVtZW50KSBhcyB0cy5DbGFzc0RlY2xhcmF0aW9uO1xuICAgICAgICAgIGNvbnN0IG5ld01ldGhvZHMgPVxuICAgICAgICAgICAgICBjbGFzc01lbWJlckhvbGRlci5tZW1iZXJzLmZpbHRlcihtZW1iZXIgPT4gbWVtYmVyLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuQ29uc3RydWN0b3IpO1xuICAgICAgICAgIGNvbnN0IG5ld01lbWJlcnMgPSBbLi4uY2xhc3NEZWNsYXJhdGlvbi5tZW1iZXJzLCAuLi5uZXdNZXRob2RzXTtcblxuICAgICAgICAgIHJldHVybiB0cy51cGRhdGVDbGFzc0RlY2xhcmF0aW9uKFxuICAgICAgICAgICAgICBjbGFzc0RlY2xhcmF0aW9uLFxuICAgICAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIGNsYXNzRGVjbGFyYXRpb24uZGVjb3JhdG9ycyxcbiAgICAgICAgICAgICAgLyogbW9kaWZpZXJzICovIGNsYXNzRGVjbGFyYXRpb24ubW9kaWZpZXJzLFxuICAgICAgICAgICAgICAvKiBuYW1lICovIGNsYXNzRGVjbGFyYXRpb24ubmFtZSxcbiAgICAgICAgICAgICAgLyogdHlwZVBhcmFtZXRlcnMgKi8gY2xhc3NEZWNsYXJhdGlvbi50eXBlUGFyYW1ldGVycyxcbiAgICAgICAgICAgICAgLyogaGVyaXRhZ2VDbGF1c2VzICovIGNsYXNzRGVjbGFyYXRpb24uaGVyaXRhZ2VDbGF1c2VzIHx8IFtdLFxuICAgICAgICAgICAgICAvKiBtZW1iZXJzICovIG5ld01lbWJlcnMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBub2RlO1xuICB9KTtcblxuICAvLyBWYWxpZGF0ZSB0aGF0IGFsbCB0aGUgY2xhc3NlcyBoYXZlIGJlZW4gZ2VuZXJhdGVkXG4gIGNsYXNzTmFtZXMuc2l6ZSA9PSAwIHx8XG4gICAgICBlcnJvcihcbiAgICAgICAgICBgJHtjbGFzc05hbWVzLnNpemUgPT0gMSA/ICdDbGFzcycgOiAnQ2xhc3Nlcyd9IFwiJHtBcnJheS5mcm9tKGNsYXNzTmFtZXMua2V5cygpKS5qb2luKCcsICcpfVwiIG5vdCBnZW5lcmF0ZWRgKTtcblxuICAvLyBBZGQgaW1wb3J0cyB0byB0aGUgbW9kdWxlIHJlcXVpcmVkIGJ5IHRoZSBuZXcgbWV0aG9kc1xuICBjb25zdCBpbXBvcnRzID0gY29udmVydGVyLmdldEltcG9ydHMoKTtcbiAgaWYgKGltcG9ydHMgJiYgaW1wb3J0cy5sZW5ndGgpIHtcbiAgICAvLyBGaW5kIHdoZXJlIHRoZSBuZXcgaW1wb3J0cyBzaG91bGQgZ29cbiAgICBjb25zdCBpbmRleCA9IGZpcnN0QWZ0ZXIoXG4gICAgICAgIG5ld1N0YXRlbWVudHMsIHN0YXRlbWVudCA9PiBzdGF0ZW1lbnQua2luZCA9PT0gdHMuU3ludGF4S2luZC5JbXBvcnREZWNsYXJhdGlvbiB8fFxuICAgICAgICAgICAgc3RhdGVtZW50LmtpbmQgPT09IHRzLlN5bnRheEtpbmQuSW1wb3J0RXF1YWxzRGVjbGFyYXRpb24pO1xuICAgIG5ld1N0YXRlbWVudHMgPVxuICAgICAgICBbLi4ubmV3U3RhdGVtZW50cy5zbGljZSgwLCBpbmRleCksIC4uLmltcG9ydHMsIC4uLnByZWZpeCwgLi4ubmV3U3RhdGVtZW50cy5zbGljZShpbmRleCldO1xuICB9IGVsc2Uge1xuICAgIG5ld1N0YXRlbWVudHMgPSBbLi4ucHJlZml4LCAuLi5uZXdTdGF0ZW1lbnRzXTtcbiAgfVxuXG4gIGNvbnZlcnRlci51cGRhdGVTb3VyY2VNYXAobmV3U3RhdGVtZW50cyk7XG4gIGNvbnN0IG5ld1NvdXJjZUZpbGUgPSB0cy51cGRhdGVTb3VyY2VGaWxlTm9kZShzb3VyY2VGaWxlLCBuZXdTdGF0ZW1lbnRzKTtcblxuICByZXR1cm4gW25ld1NvdXJjZUZpbGUsIGNvbnZlcnRlci5nZXROb2RlTWFwKCldO1xufVxuXG4vLyBSZXR1cm4gdGhlIGluZGV4IGFmdGVyIHRoZSBmaXJzdCB2YWx1ZSBpbiBgYWAgdGhhdCBkb2Vzbid0IG1hdGNoIHRoZSBwcmVkaWNhdGUgYWZ0ZXIgYSB2YWx1ZSB0aGF0XG4vLyBkb2VzIG9yIDAgaWYgbm8gdmFsdWVzIG1hdGNoLlxuZnVuY3Rpb24gZmlyc3RBZnRlcjxUPihhOiBUW10sIHByZWRpY2F0ZTogKHZhbHVlOiBUKSA9PiBib29sZWFuKSB7XG4gIGxldCBpbmRleCA9IDA7XG4gIGNvbnN0IGxlbiA9IGEubGVuZ3RoO1xuICBmb3IgKDsgaW5kZXggPCBsZW47IGluZGV4KyspIHtcbiAgICBjb25zdCB2YWx1ZSA9IGFbaW5kZXhdO1xuICAgIGlmIChwcmVkaWNhdGUodmFsdWUpKSBicmVhaztcbiAgfVxuICBpZiAoaW5kZXggPj0gbGVuKSByZXR1cm4gMDtcbiAgZm9yICg7IGluZGV4IDwgbGVuOyBpbmRleCsrKSB7XG4gICAgY29uc3QgdmFsdWUgPSBhW2luZGV4XTtcbiAgICBpZiAoIXByZWRpY2F0ZSh2YWx1ZSkpIGJyZWFrO1xuICB9XG4gIHJldHVybiBpbmRleDtcbn1cblxuLy8gQSByZWNvcmRlZCBub2RlIGlzIGEgc3VidHlwZSBvZiB0aGUgbm9kZSB0aGF0IGlzIG1hcmtlZCBhcyBiZWluZyByZWNvcmRlZC4gVGhpcyBpcyB1c2VkXG4vLyB0byBlbnN1cmUgdGhhdCBOb2RlRW1pdHRlclZpc2l0b3IucmVjb3JkIGhhcyBiZWVuIGNhbGxlZCBvbiBhbGwgbm9kZXMgcmV0dXJuZWQgYnkgdGhlXG4vLyBOb2RlRW1pdHRlclZpc2l0b3JcbmV4cG9ydCB0eXBlIFJlY29yZGVkTm9kZTxUIGV4dGVuZHMgdHMuTm9kZSA9IHRzLk5vZGU+ID0gKFQgJiB7IF9fcmVjb3JkZWQ6IGFueTt9KSB8IG51bGw7XG5cbmZ1bmN0aW9uIGVzY2FwZUxpdGVyYWwodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB2YWx1ZS5yZXBsYWNlKC8oXFxcInxcXFxcKS9nLCAnXFxcXCQxJykucmVwbGFjZSgvKFxcbil8KFxccikvZywgZnVuY3Rpb24odiwgbiwgcikge1xuICAgIHJldHVybiBuID8gJ1xcXFxuJyA6ICdcXFxccic7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVMaXRlcmFsKHZhbHVlOiBhbnkpIHtcbiAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZU51bGwoKTtcbiAgfSBlbHNlIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZUlkZW50aWZpZXIoJ3VuZGVmaW5lZCcpO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IHJlc3VsdCA9IHRzLmNyZWF0ZUxpdGVyYWwodmFsdWUpO1xuICAgIGlmICh0cy5pc1N0cmluZ0xpdGVyYWwocmVzdWx0KSAmJiByZXN1bHQudGV4dC5pbmRleE9mKCdcXFxcJykgPj0gMCkge1xuICAgICAgLy8gSGFjayB0byBhdm9pZCBwcm9ibGVtcyBjYXVzZSBpbmRpcmVjdGx5IGJ5OlxuICAgICAgLy8gICAgaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy8yMDE5MlxuICAgICAgLy8gVGhpcyBhdm9pZHMgdGhlIHN0cmluZyBlc2NhcGluZyBub3JtYWxseSBwZXJmb3JtZWQgZm9yIGEgc3RyaW5nIHJlbHlpbmcgb24gdGhhdFxuICAgICAgLy8gVHlwZVNjcmlwdCBqdXN0IGVtaXRzIHRoZSB0ZXh0IHJhdyBmb3IgYSBudW1lcmljIGxpdGVyYWwuXG4gICAgICAocmVzdWx0IGFzIGFueSkua2luZCA9IHRzLlN5bnRheEtpbmQuTnVtZXJpY0xpdGVyYWw7XG4gICAgICByZXN1bHQudGV4dCA9IGBcIiR7ZXNjYXBlTGl0ZXJhbChyZXN1bHQudGV4dCl9XCJgO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzRXhwb3J0VHlwZVN0YXRlbWVudChzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IGJvb2xlYW4ge1xuICByZXR1cm4gISFzdGF0ZW1lbnQubW9kaWZpZXJzICYmXG4gICAgICBzdGF0ZW1lbnQubW9kaWZpZXJzLnNvbWUobW9kID0+IG1vZC5raW5kID09PSB0cy5TeW50YXhLaW5kLkV4cG9ydEtleXdvcmQpO1xufVxuXG4vKipcbiAqIFZpc2l0cyBhbiBvdXRwdXQgYXN0IGFuZCBwcm9kdWNlcyB0aGUgY29ycmVzcG9uZGluZyBUeXBlU2NyaXB0IHN5bnRoZXRpYyBub2Rlcy5cbiAqL1xuZXhwb3J0IGNsYXNzIE5vZGVFbWl0dGVyVmlzaXRvciBpbXBsZW1lbnRzIFN0YXRlbWVudFZpc2l0b3IsIEV4cHJlc3Npb25WaXNpdG9yIHtcbiAgcHJpdmF0ZSBfbm9kZU1hcCA9IG5ldyBNYXA8dHMuTm9kZSwgTm9kZT4oKTtcbiAgcHJpdmF0ZSBfaW1wb3J0c1dpdGhQcmVmaXhlcyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIHByaXZhdGUgX3JlZXhwb3J0cyA9IG5ldyBNYXA8c3RyaW5nLCB7bmFtZTogc3RyaW5nLCBhczogc3RyaW5nfVtdPigpO1xuICBwcml2YXRlIF90ZW1wbGF0ZVNvdXJjZXMgPSBuZXcgTWFwPFBhcnNlU291cmNlRmlsZSwgdHMuU291cmNlTWFwU291cmNlPigpO1xuICBwcml2YXRlIF9leHBvcnRlZFZhcmlhYmxlSWRlbnRpZmllcnMgPSBuZXcgTWFwPHN0cmluZywgdHMuSWRlbnRpZmllcj4oKTtcblxuICAvKipcbiAgICogUHJvY2VzcyB0aGUgc291cmNlIGZpbGUgYW5kIGNvbGxlY3QgZXhwb3J0ZWQgaWRlbnRpZmllcnMgdGhhdCByZWZlciB0byB2YXJpYWJsZXMuXG4gICAqXG4gICAqIE9ubHkgdmFyaWFibGVzIGFyZSBjb2xsZWN0ZWQgYmVjYXVzZSBleHBvcnRlZCBjbGFzc2VzIHN0aWxsIGV4aXN0IGluIHRoZSBtb2R1bGUgc2NvcGUgaW5cbiAgICogQ29tbW9uSlMsIHdoZXJlYXMgdmFyaWFibGVzIGhhdmUgdGhlaXIgZGVjbGFyYXRpb25zIG1vdmVkIG9udG8gdGhlIGBleHBvcnRzYCBvYmplY3QsIGFuZCBhbGxcbiAgICogcmVmZXJlbmNlcyBhcmUgdXBkYXRlZCBhY2NvcmRpbmdseS5cbiAgICovXG4gIGxvYWRFeHBvcnRlZFZhcmlhYmxlSWRlbnRpZmllcnMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIHNvdXJjZUZpbGUuc3RhdGVtZW50cy5mb3JFYWNoKHN0YXRlbWVudCA9PiB7XG4gICAgICBpZiAodHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdGF0ZW1lbnQpICYmIGlzRXhwb3J0VHlwZVN0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgICAgIHN0YXRlbWVudC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zLmZvckVhY2goZGVjbGFyYXRpb24gPT4ge1xuICAgICAgICAgIGlmICh0cy5pc0lkZW50aWZpZXIoZGVjbGFyYXRpb24ubmFtZSkpIHtcbiAgICAgICAgICAgIHRoaXMuX2V4cG9ydGVkVmFyaWFibGVJZGVudGlmaWVycy5zZXQoZGVjbGFyYXRpb24ubmFtZS50ZXh0LCBkZWNsYXJhdGlvbi5uYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgZ2V0UmVleHBvcnRzKCk6IHRzLlN0YXRlbWVudFtdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLl9yZWV4cG9ydHMuZW50cmllcygpKVxuICAgICAgICAubWFwKFxuICAgICAgICAgICAgKFtleHBvcnRlZEZpbGVQYXRoLCByZWV4cG9ydHNdKSA9PiB0cy5jcmVhdGVFeHBvcnREZWNsYXJhdGlvbihcbiAgICAgICAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLCB0cy5jcmVhdGVOYW1lZEV4cG9ydHMocmVleHBvcnRzLm1hcChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHtuYW1lLCBhc30pID0+IHRzLmNyZWF0ZUV4cG9ydFNwZWNpZmllcihuYW1lLCBhcykpKSxcbiAgICAgICAgICAgICAgICAvKiBtb2R1bGVTcGVjaWZpZXIgKi8gY3JlYXRlTGl0ZXJhbChleHBvcnRlZEZpbGVQYXRoKSkpO1xuICB9XG5cbiAgZ2V0SW1wb3J0cygpOiB0cy5TdGF0ZW1lbnRbXSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5faW1wb3J0c1dpdGhQcmVmaXhlcy5lbnRyaWVzKCkpXG4gICAgICAgIC5tYXAoXG4gICAgICAgICAgICAoW25hbWVzcGFjZSwgcHJlZml4XSkgPT4gdHMuY3JlYXRlSW1wb3J0RGVjbGFyYXRpb24oXG4gICAgICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAvKiBpbXBvcnRDbGF1c2UgKi8gdHMuY3JlYXRlSW1wb3J0Q2xhdXNlKFxuICAgICAgICAgICAgICAgICAgICAvKiBuYW1lICovPHRzLklkZW50aWZpZXI+KHVuZGVmaW5lZCBhcyBhbnkpLFxuICAgICAgICAgICAgICAgICAgICB0cy5jcmVhdGVOYW1lc3BhY2VJbXBvcnQodHMuY3JlYXRlSWRlbnRpZmllcihwcmVmaXgpKSksXG4gICAgICAgICAgICAgICAgLyogbW9kdWxlU3BlY2lmaWVyICovIGNyZWF0ZUxpdGVyYWwobmFtZXNwYWNlKSkpO1xuICB9XG5cbiAgZ2V0Tm9kZU1hcCgpIHsgcmV0dXJuIHRoaXMuX25vZGVNYXA7IH1cblxuICB1cGRhdGVTb3VyY2VNYXAoc3RhdGVtZW50czogdHMuU3RhdGVtZW50W10pIHtcbiAgICBsZXQgbGFzdFJhbmdlU3RhcnROb2RlOiB0cy5Ob2RlfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBsZXQgbGFzdFJhbmdlRW5kTm9kZTogdHMuTm9kZXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgbGV0IGxhc3RSYW5nZTogdHMuU291cmNlTWFwUmFuZ2V8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gICAgY29uc3QgcmVjb3JkTGFzdFNvdXJjZVJhbmdlID0gKCkgPT4ge1xuICAgICAgaWYgKGxhc3RSYW5nZSAmJiBsYXN0UmFuZ2VTdGFydE5vZGUgJiYgbGFzdFJhbmdlRW5kTm9kZSkge1xuICAgICAgICBpZiAobGFzdFJhbmdlU3RhcnROb2RlID09IGxhc3RSYW5nZUVuZE5vZGUpIHtcbiAgICAgICAgICB0cy5zZXRTb3VyY2VNYXBSYW5nZShsYXN0UmFuZ2VFbmROb2RlLCBsYXN0UmFuZ2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRzLnNldFNvdXJjZU1hcFJhbmdlKGxhc3RSYW5nZVN0YXJ0Tm9kZSwgbGFzdFJhbmdlKTtcbiAgICAgICAgICAvLyBPbmx5IGVtaXQgdGhlIHBvcyBmb3IgdGhlIGZpcnN0IG5vZGUgZW1pdHRlZCBpbiB0aGUgcmFuZ2UuXG4gICAgICAgICAgdHMuc2V0RW1pdEZsYWdzKGxhc3RSYW5nZVN0YXJ0Tm9kZSwgdHMuRW1pdEZsYWdzLk5vVHJhaWxpbmdTb3VyY2VNYXApO1xuICAgICAgICAgIHRzLnNldFNvdXJjZU1hcFJhbmdlKGxhc3RSYW5nZUVuZE5vZGUsIGxhc3RSYW5nZSk7XG4gICAgICAgICAgLy8gT25seSBlbWl0IGVtaXQgZW5kIGZvciB0aGUgbGFzdCBub2RlIGVtaXR0ZWQgaW4gdGhlIHJhbmdlLlxuICAgICAgICAgIHRzLnNldEVtaXRGbGFncyhsYXN0UmFuZ2VFbmROb2RlLCB0cy5FbWl0RmxhZ3MuTm9MZWFkaW5nU291cmNlTWFwKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCB2aXNpdE5vZGUgPSAodHNOb2RlOiB0cy5Ob2RlKSA9PiB7XG4gICAgICBjb25zdCBuZ05vZGUgPSB0aGlzLl9ub2RlTWFwLmdldCh0c05vZGUpO1xuICAgICAgaWYgKG5nTm9kZSkge1xuICAgICAgICBjb25zdCByYW5nZSA9IHRoaXMuc291cmNlUmFuZ2VPZihuZ05vZGUpO1xuICAgICAgICBpZiAocmFuZ2UpIHtcbiAgICAgICAgICBpZiAoIWxhc3RSYW5nZSB8fCByYW5nZS5zb3VyY2UgIT0gbGFzdFJhbmdlLnNvdXJjZSB8fCByYW5nZS5wb3MgIT0gbGFzdFJhbmdlLnBvcyB8fFxuICAgICAgICAgICAgICByYW5nZS5lbmQgIT0gbGFzdFJhbmdlLmVuZCkge1xuICAgICAgICAgICAgcmVjb3JkTGFzdFNvdXJjZVJhbmdlKCk7XG4gICAgICAgICAgICBsYXN0UmFuZ2VTdGFydE5vZGUgPSB0c05vZGU7XG4gICAgICAgICAgICBsYXN0UmFuZ2UgPSByYW5nZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbGFzdFJhbmdlRW5kTm9kZSA9IHRzTm9kZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdHMuZm9yRWFjaENoaWxkKHRzTm9kZSwgdmlzaXROb2RlKTtcbiAgICB9O1xuICAgIHN0YXRlbWVudHMuZm9yRWFjaCh2aXNpdE5vZGUpO1xuICAgIHJlY29yZExhc3RTb3VyY2VSYW5nZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSByZWNvcmQ8VCBleHRlbmRzIHRzLk5vZGU+KG5nTm9kZTogTm9kZSwgdHNOb2RlOiBUfG51bGwpOiBSZWNvcmRlZE5vZGU8VD4ge1xuICAgIGlmICh0c05vZGUgJiYgIXRoaXMuX25vZGVNYXAuaGFzKHRzTm9kZSkpIHtcbiAgICAgIHRoaXMuX25vZGVNYXAuc2V0KHRzTm9kZSwgbmdOb2RlKTtcbiAgICB9XG4gICAgcmV0dXJuIHRzTm9kZSBhcyBSZWNvcmRlZE5vZGU8VD47XG4gIH1cblxuICBwcml2YXRlIHNvdXJjZVJhbmdlT2Yobm9kZTogTm9kZSk6IHRzLlNvdXJjZU1hcFJhbmdlfG51bGwge1xuICAgIGlmIChub2RlLnNvdXJjZVNwYW4pIHtcbiAgICAgIGNvbnN0IHNwYW4gPSBub2RlLnNvdXJjZVNwYW47XG4gICAgICBpZiAoc3Bhbi5zdGFydC5maWxlID09IHNwYW4uZW5kLmZpbGUpIHtcbiAgICAgICAgY29uc3QgZmlsZSA9IHNwYW4uc3RhcnQuZmlsZTtcbiAgICAgICAgaWYgKGZpbGUudXJsKSB7XG4gICAgICAgICAgbGV0IHNvdXJjZSA9IHRoaXMuX3RlbXBsYXRlU291cmNlcy5nZXQoZmlsZSk7XG4gICAgICAgICAgaWYgKCFzb3VyY2UpIHtcbiAgICAgICAgICAgIHNvdXJjZSA9IHRzLmNyZWF0ZVNvdXJjZU1hcFNvdXJjZShmaWxlLnVybCwgZmlsZS5jb250ZW50LCBwb3MgPT4gcG9zKTtcbiAgICAgICAgICAgIHRoaXMuX3RlbXBsYXRlU291cmNlcy5zZXQoZmlsZSwgc291cmNlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHtwb3M6IHNwYW4uc3RhcnQub2Zmc2V0LCBlbmQ6IHNwYW4uZW5kLm9mZnNldCwgc291cmNlfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0TW9kaWZpZXJzKHN0bXQ6IFN0YXRlbWVudCkge1xuICAgIGxldCBtb2RpZmllcnM6IHRzLk1vZGlmaWVyW10gPSBbXTtcbiAgICBpZiAoc3RtdC5oYXNNb2RpZmllcihTdG10TW9kaWZpZXIuRXhwb3J0ZWQpKSB7XG4gICAgICBtb2RpZmllcnMucHVzaCh0cy5jcmVhdGVUb2tlbih0cy5TeW50YXhLaW5kLkV4cG9ydEtleXdvcmQpKTtcbiAgICB9XG4gICAgcmV0dXJuIG1vZGlmaWVycztcbiAgfVxuXG4gIC8vIFN0YXRlbWVudFZpc2l0b3JcbiAgdmlzaXREZWNsYXJlVmFyU3RtdChzdG10OiBEZWNsYXJlVmFyU3RtdCkge1xuICAgIGlmIChzdG10Lmhhc01vZGlmaWVyKFN0bXRNb2RpZmllci5FeHBvcnRlZCkgJiYgc3RtdC52YWx1ZSBpbnN0YW5jZW9mIEV4dGVybmFsRXhwciAmJlxuICAgICAgICAhc3RtdC50eXBlKSB7XG4gICAgICAvLyBjaGVjayBmb3IgYSByZWV4cG9ydFxuICAgICAgY29uc3Qge25hbWUsIG1vZHVsZU5hbWV9ID0gc3RtdC52YWx1ZS52YWx1ZTtcbiAgICAgIGlmIChtb2R1bGVOYW1lKSB7XG4gICAgICAgIGxldCByZWV4cG9ydHMgPSB0aGlzLl9yZWV4cG9ydHMuZ2V0KG1vZHVsZU5hbWUpO1xuICAgICAgICBpZiAoIXJlZXhwb3J0cykge1xuICAgICAgICAgIHJlZXhwb3J0cyA9IFtdO1xuICAgICAgICAgIHRoaXMuX3JlZXhwb3J0cy5zZXQobW9kdWxlTmFtZSwgcmVleHBvcnRzKTtcbiAgICAgICAgfVxuICAgICAgICByZWV4cG9ydHMucHVzaCh7bmFtZTogbmFtZSAhLCBhczogc3RtdC5uYW1lfSk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHZhckRlY2xMaXN0ID0gdHMuY3JlYXRlVmFyaWFibGVEZWNsYXJhdGlvbkxpc3QoW3RzLmNyZWF0ZVZhcmlhYmxlRGVjbGFyYXRpb24oXG4gICAgICAgIHRzLmNyZWF0ZUlkZW50aWZpZXIoc3RtdC5uYW1lKSxcbiAgICAgICAgLyogdHlwZSAqLyB1bmRlZmluZWQsXG4gICAgICAgIChzdG10LnZhbHVlICYmIHN0bXQudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSB8fCB1bmRlZmluZWQpXSk7XG5cbiAgICBpZiAoc3RtdC5oYXNNb2RpZmllcihTdG10TW9kaWZpZXIuRXhwb3J0ZWQpKSB7XG4gICAgICAvLyBOb3RlOiBXZSBuZWVkIHRvIGFkZCBhbiBleHBsaWNpdCB2YXJpYWJsZSBhbmQgZXhwb3J0IGRlY2xhcmF0aW9uIHNvIHRoYXRcbiAgICAgIC8vIHRoZSB2YXJpYWJsZSBjYW4gYmUgcmVmZXJyZWQgaW4gdGhlIHNhbWUgZmlsZSBhcyB3ZWxsLlxuICAgICAgY29uc3QgdHNWYXJTdG10ID1cbiAgICAgICAgICB0aGlzLnJlY29yZChzdG10LCB0cy5jcmVhdGVWYXJpYWJsZVN0YXRlbWVudCgvKiBtb2RpZmllcnMgKi9bXSwgdmFyRGVjbExpc3QpKTtcbiAgICAgIGNvbnN0IGV4cG9ydFN0bXQgPSB0aGlzLnJlY29yZChcbiAgICAgICAgICBzdG10LCB0cy5jcmVhdGVFeHBvcnREZWNsYXJhdGlvbihcbiAgICAgICAgICAgICAgICAgICAgLypkZWNvcmF0b3JzKi8gdW5kZWZpbmVkLCAvKm1vZGlmaWVycyovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgdHMuY3JlYXRlTmFtZWRFeHBvcnRzKFt0cy5jcmVhdGVFeHBvcnRTcGVjaWZpZXIoc3RtdC5uYW1lLCBzdG10Lm5hbWUpXSkpKTtcbiAgICAgIHJldHVybiBbdHNWYXJTdG10LCBleHBvcnRTdG10XTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKHN0bXQsIHRzLmNyZWF0ZVZhcmlhYmxlU3RhdGVtZW50KHRoaXMuZ2V0TW9kaWZpZXJzKHN0bXQpLCB2YXJEZWNsTGlzdCkpO1xuICB9XG5cbiAgdmlzaXREZWNsYXJlRnVuY3Rpb25TdG10KHN0bXQ6IERlY2xhcmVGdW5jdGlvblN0bXQpIHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIHN0bXQsIHRzLmNyZWF0ZUZ1bmN0aW9uRGVjbGFyYXRpb24oXG4gICAgICAgICAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCwgdGhpcy5nZXRNb2RpZmllcnMoc3RtdCksXG4gICAgICAgICAgICAgICAgICAvKiBhc3Rlcmlza1Rva2VuICovIHVuZGVmaW5lZCwgc3RtdC5uYW1lLCAvKiB0eXBlUGFyYW1ldGVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICBzdG10LnBhcmFtcy5tYXAoXG4gICAgICAgICAgICAgICAgICAgICAgcCA9PiB0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLCAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBkb3REb3REb3RUb2tlbiAqLyB1bmRlZmluZWQsIHAubmFtZSkpLFxuICAgICAgICAgICAgICAgICAgLyogdHlwZSAqLyB1bmRlZmluZWQsIHRoaXMuX3Zpc2l0U3RhdGVtZW50cyhzdG10LnN0YXRlbWVudHMpKSk7XG4gIH1cblxuICB2aXNpdEV4cHJlc3Npb25TdG10KHN0bXQ6IEV4cHJlc3Npb25TdGF0ZW1lbnQpIHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoc3RtdCwgdHMuY3JlYXRlU3RhdGVtZW50KHN0bXQuZXhwci52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpKTtcbiAgfVxuXG4gIHZpc2l0UmV0dXJuU3RtdChzdG10OiBSZXR1cm5TdGF0ZW1lbnQpIHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIHN0bXQsIHRzLmNyZWF0ZVJldHVybihzdG10LnZhbHVlID8gc3RtdC52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkgOiB1bmRlZmluZWQpKTtcbiAgfVxuXG4gIHZpc2l0RGVjbGFyZUNsYXNzU3RtdChzdG10OiBDbGFzc1N0bXQpIHtcbiAgICBjb25zdCBtb2RpZmllcnMgPSB0aGlzLmdldE1vZGlmaWVycyhzdG10KTtcbiAgICBjb25zdCBmaWVsZHMgPSBzdG10LmZpZWxkcy5tYXAoXG4gICAgICAgIGZpZWxkID0+IHRzLmNyZWF0ZVByb3BlcnR5KFxuICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsIC8qIG1vZGlmaWVycyAqLyB0cmFuc2xhdGVNb2RpZmllcnMoZmllbGQubW9kaWZpZXJzKSxcbiAgICAgICAgICAgIGZpZWxkLm5hbWUsXG4gICAgICAgICAgICAvKiBxdWVzdGlvblRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIC8qIHR5cGUgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgZmllbGQuaW5pdGlhbGl6ZXIgPT0gbnVsbCA/IHRzLmNyZWF0ZU51bGwoKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmllbGQuaW5pdGlhbGl6ZXIudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSk7XG4gICAgY29uc3QgZ2V0dGVycyA9IHN0bXQuZ2V0dGVycy5tYXAoXG4gICAgICAgIGdldHRlciA9PiB0cy5jcmVhdGVHZXRBY2Nlc3NvcihcbiAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLCAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLCBnZXR0ZXIubmFtZSwgLyogcGFyYW1ldGVycyAqL1tdLFxuICAgICAgICAgICAgLyogdHlwZSAqLyB1bmRlZmluZWQsIHRoaXMuX3Zpc2l0U3RhdGVtZW50cyhnZXR0ZXIuYm9keSkpKTtcblxuICAgIGNvbnN0IGNvbnN0cnVjdG9yID1cbiAgICAgICAgKHN0bXQuY29uc3RydWN0b3JNZXRob2QgJiYgW3RzLmNyZWF0ZUNvbnN0cnVjdG9yKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogcGFyYW1ldGVycyAqLyBzdG10LmNvbnN0cnVjdG9yTWV0aG9kLnBhcmFtcy5tYXAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcCA9PiB0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBkb3REb3REb3RUb2tlbiAqLyB1bmRlZmluZWQsIHAubmFtZSkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fdmlzaXRTdGF0ZW1lbnRzKHN0bXQuY29uc3RydWN0b3JNZXRob2QuYm9keSkpXSkgfHxcbiAgICAgICAgW107XG5cbiAgICAvLyBUT0RPIHtjaHVja2p9OiBEZXRlcm1pbmUgd2hhdCBzaG91bGQgYmUgZG9uZSBmb3IgYSBtZXRob2Qgd2l0aCBhIG51bGwgbmFtZS5cbiAgICBjb25zdCBtZXRob2RzID0gc3RtdC5tZXRob2RzLmZpbHRlcihtZXRob2QgPT4gbWV0aG9kLm5hbWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZCA9PiB0cy5jcmVhdGVNZXRob2QoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdHJhbnNsYXRlTW9kaWZpZXJzKG1ldGhvZC5tb2RpZmllcnMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBhc3RyaXNrVG9rZW4gKi8gdW5kZWZpbmVkLCBtZXRob2QubmFtZSAhLyogZ3VhcmRlZCBieSBmaWx0ZXIgKi8sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIHF1ZXN0aW9uVG9rZW4gKi8gdW5kZWZpbmVkLCAvKiB0eXBlUGFyYW1ldGVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZC5wYXJhbXMubWFwKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcCA9PiB0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogZG90RG90RG90VG9rZW4gKi8gdW5kZWZpbmVkLCBwLm5hbWUpKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogdHlwZSAqLyB1bmRlZmluZWQsIHRoaXMuX3Zpc2l0U3RhdGVtZW50cyhtZXRob2QuYm9keSkpKTtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIHN0bXQsIHRzLmNyZWF0ZUNsYXNzRGVjbGFyYXRpb24oXG4gICAgICAgICAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCwgbW9kaWZpZXJzLCBzdG10Lm5hbWUsIC8qIHR5cGVQYXJhbWV0ZXJzKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgc3RtdC5wYXJlbnQgJiYgW3RzLmNyZWF0ZUhlcml0YWdlQ2xhdXNlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLlN5bnRheEtpbmQuRXh0ZW5kc0tleXdvcmQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW3N0bXQucGFyZW50LnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKV0pXSB8fFxuICAgICAgICAgICAgICAgICAgICAgIFtdLFxuICAgICAgICAgICAgICAgICAgWy4uLmZpZWxkcywgLi4uZ2V0dGVycywgLi4uY29uc3RydWN0b3IsIC4uLm1ldGhvZHNdKSk7XG4gIH1cblxuICB2aXNpdElmU3RtdChzdG10OiBJZlN0bXQpIHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIHN0bXQsXG4gICAgICAgIHRzLmNyZWF0ZUlmKFxuICAgICAgICAgICAgc3RtdC5jb25kaXRpb24udmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpLCB0aGlzLl92aXNpdFN0YXRlbWVudHMoc3RtdC50cnVlQ2FzZSksXG4gICAgICAgICAgICBzdG10LmZhbHNlQ2FzZSAmJiBzdG10LmZhbHNlQ2FzZS5sZW5ndGggJiYgdGhpcy5fdmlzaXRTdGF0ZW1lbnRzKHN0bXQuZmFsc2VDYXNlKSB8fFxuICAgICAgICAgICAgICAgIHVuZGVmaW5lZCkpO1xuICB9XG5cbiAgdmlzaXRUcnlDYXRjaFN0bXQoc3RtdDogVHJ5Q2F0Y2hTdG10KTogUmVjb3JkZWROb2RlPHRzLlRyeVN0YXRlbWVudD4ge1xuICAgIHJldHVybiB0aGlzLnJlY29yZChcbiAgICAgICAgc3RtdCwgdHMuY3JlYXRlVHJ5KFxuICAgICAgICAgICAgICAgICAgdGhpcy5fdmlzaXRTdGF0ZW1lbnRzKHN0bXQuYm9keVN0bXRzKSxcbiAgICAgICAgICAgICAgICAgIHRzLmNyZWF0ZUNhdGNoQ2xhdXNlKFxuICAgICAgICAgICAgICAgICAgICAgIENBVENIX0VSUk9SX05BTUUsIHRoaXMuX3Zpc2l0U3RhdGVtZW50c1ByZWZpeChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW3RzLmNyZWF0ZVZhcmlhYmxlU3RhdGVtZW50KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt0cy5jcmVhdGVWYXJpYWJsZURlY2xhcmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIENBVENIX1NUQUNLX05BTUUsIC8qIHR5cGUgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5jcmVhdGVJZGVudGlmaWVyKENBVENIX0VSUk9SX05BTUUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5jcmVhdGVJZGVudGlmaWVyKENBVENIX1NUQUNLX05BTUUpKSldKV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0bXQuY2F0Y2hTdG10cykpLFxuICAgICAgICAgICAgICAgICAgLyogZmluYWxseUJsb2NrICovIHVuZGVmaW5lZCkpO1xuICB9XG5cbiAgdmlzaXRUaHJvd1N0bXQoc3RtdDogVGhyb3dTdG10KSB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKHN0bXQsIHRzLmNyZWF0ZVRocm93KHN0bXQuZXJyb3IudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSk7XG4gIH1cblxuICB2aXNpdENvbW1lbnRTdG10KHN0bXQ6IENvbW1lbnRTdG10LCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKSB7XG4gICAgY29uc3QgdGV4dCA9IHN0bXQubXVsdGlsaW5lID8gYCAke3N0bXQuY29tbWVudH0gYCA6IGAgJHtzdG10LmNvbW1lbnR9YDtcbiAgICByZXR1cm4gdGhpcy5jcmVhdGVDb21tZW50U3RtdCh0ZXh0LCBzdG10Lm11bHRpbGluZSwgc291cmNlRmlsZSk7XG4gIH1cblxuICB2aXNpdEpTRG9jQ29tbWVudFN0bXQoc3RtdDogSlNEb2NDb21tZW50U3RtdCwgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSkge1xuICAgIHJldHVybiB0aGlzLmNyZWF0ZUNvbW1lbnRTdG10KHN0bXQudG9TdHJpbmcoKSwgdHJ1ZSwgc291cmNlRmlsZSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUNvbW1lbnRTdG10KHRleHQ6IHN0cmluZywgbXVsdGlsaW5lOiBib29sZWFuLCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTpcbiAgICAgIHRzLk5vdEVtaXR0ZWRTdGF0ZW1lbnQge1xuICAgIGNvbnN0IGNvbW1lbnRTdG10ID0gdHMuY3JlYXRlTm90RW1pdHRlZFN0YXRlbWVudChzb3VyY2VGaWxlKTtcbiAgICBjb25zdCBraW5kID1cbiAgICAgICAgbXVsdGlsaW5lID8gdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhIDogdHMuU3ludGF4S2luZC5TaW5nbGVMaW5lQ29tbWVudFRyaXZpYTtcbiAgICB0cy5zZXRTeW50aGV0aWNMZWFkaW5nQ29tbWVudHMoY29tbWVudFN0bXQsIFt7a2luZCwgdGV4dCwgcG9zOiAtMSwgZW5kOiAtMX1dKTtcbiAgICByZXR1cm4gY29tbWVudFN0bXQ7XG4gIH1cblxuICAvLyBFeHByZXNzaW9uVmlzaXRvclxuICB2aXNpdFdyYXBwZWROb2RlRXhwcihleHByOiBXcmFwcGVkTm9kZUV4cHI8YW55PikgeyByZXR1cm4gdGhpcy5yZWNvcmQoZXhwciwgZXhwci5ub2RlKTsgfVxuXG4gIC8vIEV4cHJlc3Npb25WaXNpdG9yXG4gIHZpc2l0UmVhZFZhckV4cHIoZXhwcjogUmVhZFZhckV4cHIpIHtcbiAgICBzd2l0Y2ggKGV4cHIuYnVpbHRpbikge1xuICAgICAgY2FzZSBCdWlsdGluVmFyLlRoaXM6XG4gICAgICAgIHJldHVybiB0aGlzLnJlY29yZChleHByLCB0cy5jcmVhdGVJZGVudGlmaWVyKE1FVEhPRF9USElTX05BTUUpKTtcbiAgICAgIGNhc2UgQnVpbHRpblZhci5DYXRjaEVycm9yOlxuICAgICAgICByZXR1cm4gdGhpcy5yZWNvcmQoZXhwciwgdHMuY3JlYXRlSWRlbnRpZmllcihDQVRDSF9FUlJPUl9OQU1FKSk7XG4gICAgICBjYXNlIEJ1aWx0aW5WYXIuQ2F0Y2hTdGFjazpcbiAgICAgICAgcmV0dXJuIHRoaXMucmVjb3JkKGV4cHIsIHRzLmNyZWF0ZUlkZW50aWZpZXIoQ0FUQ0hfU1RBQ0tfTkFNRSkpO1xuICAgICAgY2FzZSBCdWlsdGluVmFyLlN1cGVyOlxuICAgICAgICByZXR1cm4gdGhpcy5yZWNvcmQoZXhwciwgdHMuY3JlYXRlU3VwZXIoKSk7XG4gICAgfVxuICAgIGlmIChleHByLm5hbWUpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlY29yZChleHByLCB0cy5jcmVhdGVJZGVudGlmaWVyKGV4cHIubmFtZSkpO1xuICAgIH1cbiAgICB0aHJvdyBFcnJvcihgVW5leHBlY3RlZCBSZWFkVmFyRXhwciBmb3JtYCk7XG4gIH1cblxuICB2aXNpdFdyaXRlVmFyRXhwcihleHByOiBXcml0ZVZhckV4cHIpOiBSZWNvcmRlZE5vZGU8dHMuQmluYXJ5RXhwcmVzc2lvbj4ge1xuICAgIHJldHVybiB0aGlzLnJlY29yZChcbiAgICAgICAgZXhwciwgdHMuY3JlYXRlQXNzaWdubWVudChcbiAgICAgICAgICAgICAgICAgIHRzLmNyZWF0ZUlkZW50aWZpZXIoZXhwci5uYW1lKSwgZXhwci52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpKTtcbiAgfVxuXG4gIHZpc2l0V3JpdGVLZXlFeHByKGV4cHI6IFdyaXRlS2V5RXhwcik6IFJlY29yZGVkTm9kZTx0cy5CaW5hcnlFeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLFxuICAgICAgICB0cy5jcmVhdGVBc3NpZ25tZW50KFxuICAgICAgICAgICAgdHMuY3JlYXRlRWxlbWVudEFjY2VzcyhcbiAgICAgICAgICAgICAgICBleHByLnJlY2VpdmVyLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSwgZXhwci5pbmRleC52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpLFxuICAgICAgICAgICAgZXhwci52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpKTtcbiAgfVxuXG4gIHZpc2l0V3JpdGVQcm9wRXhwcihleHByOiBXcml0ZVByb3BFeHByKTogUmVjb3JkZWROb2RlPHRzLkJpbmFyeUV4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIGV4cHIsIHRzLmNyZWF0ZUFzc2lnbm1lbnQoXG4gICAgICAgICAgICAgICAgICB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhleHByLnJlY2VpdmVyLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSwgZXhwci5uYW1lKSxcbiAgICAgICAgICAgICAgICAgIGV4cHIudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSk7XG4gIH1cblxuICB2aXNpdEludm9rZU1ldGhvZEV4cHIoZXhwcjogSW52b2tlTWV0aG9kRXhwcik6IFJlY29yZGVkTm9kZTx0cy5DYWxsRXhwcmVzc2lvbj4ge1xuICAgIGNvbnN0IG1ldGhvZE5hbWUgPSBnZXRNZXRob2ROYW1lKGV4cHIpO1xuICAgIHJldHVybiB0aGlzLnJlY29yZChcbiAgICAgICAgZXhwcixcbiAgICAgICAgdHMuY3JlYXRlQ2FsbChcbiAgICAgICAgICAgIHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKGV4cHIucmVjZWl2ZXIudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpLCBtZXRob2ROYW1lKSxcbiAgICAgICAgICAgIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkLCBleHByLmFyZ3MubWFwKGFyZyA9PiBhcmcudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSkpO1xuICB9XG5cbiAgdmlzaXRJbnZva2VGdW5jdGlvbkV4cHIoZXhwcjogSW52b2tlRnVuY3Rpb25FeHByKTogUmVjb3JkZWROb2RlPHRzLkNhbGxFeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLCB0cy5jcmVhdGVDYWxsKFxuICAgICAgICAgICAgICAgICAgZXhwci5mbi52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCksIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgZXhwci5hcmdzLm1hcChhcmcgPT4gYXJnLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSkpKTtcbiAgfVxuXG4gIHZpc2l0SW5zdGFudGlhdGVFeHByKGV4cHI6IEluc3RhbnRpYXRlRXhwcik6IFJlY29yZGVkTm9kZTx0cy5OZXdFeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLCB0cy5jcmVhdGVOZXcoXG4gICAgICAgICAgICAgICAgICBleHByLmNsYXNzRXhwci52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCksIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgZXhwci5hcmdzLm1hcChhcmcgPT4gYXJnLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSkpKTtcbiAgfVxuXG4gIHZpc2l0TGl0ZXJhbEV4cHIoZXhwcjogTGl0ZXJhbEV4cHIpIHsgcmV0dXJuIHRoaXMucmVjb3JkKGV4cHIsIGNyZWF0ZUxpdGVyYWwoZXhwci52YWx1ZSkpOyB9XG5cbiAgdmlzaXRFeHRlcm5hbEV4cHIoZXhwcjogRXh0ZXJuYWxFeHByKSB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKGV4cHIsIHRoaXMuX3Zpc2l0SWRlbnRpZmllcihleHByLnZhbHVlKSk7XG4gIH1cblxuICB2aXNpdENvbmRpdGlvbmFsRXhwcihleHByOiBDb25kaXRpb25hbEV4cHIpOiBSZWNvcmRlZE5vZGU8dHMuUGFyZW50aGVzaXplZEV4cHJlc3Npb24+IHtcbiAgICAvLyBUT0RPIHtjaHVja2p9OiBSZXZpZXcgdXNlIG9mICEgb24gZmFsc2VDYXNlLiBTaG91bGQgaXQgYmUgbm9uLW51bGxhYmxlP1xuICAgIHJldHVybiB0aGlzLnJlY29yZChcbiAgICAgICAgZXhwcixcbiAgICAgICAgdHMuY3JlYXRlUGFyZW4odHMuY3JlYXRlQ29uZGl0aW9uYWwoXG4gICAgICAgICAgICBleHByLmNvbmRpdGlvbi52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCksIGV4cHIudHJ1ZUNhc2UudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpLFxuICAgICAgICAgICAgZXhwci5mYWxzZUNhc2UgIS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpKSk7XG4gIH1cblxuICB2aXNpdE5vdEV4cHIoZXhwcjogTm90RXhwcik6IFJlY29yZGVkTm9kZTx0cy5QcmVmaXhVbmFyeUV4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIGV4cHIsIHRzLmNyZWF0ZVByZWZpeChcbiAgICAgICAgICAgICAgICAgIHRzLlN5bnRheEtpbmQuRXhjbGFtYXRpb25Ub2tlbiwgZXhwci5jb25kaXRpb24udmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSk7XG4gIH1cblxuICB2aXNpdEFzc2VydE5vdE51bGxFeHByKGV4cHI6IEFzc2VydE5vdE51bGwpOiBSZWNvcmRlZE5vZGU8dHMuRXhwcmVzc2lvbj4ge1xuICAgIHJldHVybiBleHByLmNvbmRpdGlvbi52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCk7XG4gIH1cblxuICB2aXNpdENhc3RFeHByKGV4cHI6IENhc3RFeHByKTogUmVjb3JkZWROb2RlPHRzLkV4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gZXhwci52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCk7XG4gIH1cblxuICB2aXNpdEZ1bmN0aW9uRXhwcihleHByOiBGdW5jdGlvbkV4cHIpIHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIGV4cHIsIHRzLmNyZWF0ZUZ1bmN0aW9uRXhwcmVzc2lvbihcbiAgICAgICAgICAgICAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsIC8qIGFzdHJpc2tUb2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAvKiBuYW1lICovIGV4cHIubmFtZSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICBleHByLnBhcmFtcy5tYXAoXG4gICAgICAgICAgICAgICAgICAgICAgcCA9PiB0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLCAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBkb3REb3REb3RUb2tlbiAqLyB1bmRlZmluZWQsIHAubmFtZSkpLFxuICAgICAgICAgICAgICAgICAgLyogdHlwZSAqLyB1bmRlZmluZWQsIHRoaXMuX3Zpc2l0U3RhdGVtZW50cyhleHByLnN0YXRlbWVudHMpKSk7XG4gIH1cblxuICB2aXNpdEJpbmFyeU9wZXJhdG9yRXhwcihleHByOiBCaW5hcnlPcGVyYXRvckV4cHIpOlxuICAgICAgUmVjb3JkZWROb2RlPHRzLkJpbmFyeUV4cHJlc3Npb258dHMuUGFyZW50aGVzaXplZEV4cHJlc3Npb24+IHtcbiAgICBsZXQgYmluYXJ5T3BlcmF0b3I6IHRzLkJpbmFyeU9wZXJhdG9yO1xuICAgIHN3aXRjaCAoZXhwci5vcGVyYXRvcikge1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5BbmQ6XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5BbXBlcnNhbmRBbXBlcnNhbmRUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLkJpdHdpc2VBbmQ6XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5BbXBlcnNhbmRUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLkJpZ2dlcjpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkdyZWF0ZXJUaGFuVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5CaWdnZXJFcXVhbHM6XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5HcmVhdGVyVGhhbkVxdWFsc1Rva2VuO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQmluYXJ5T3BlcmF0b3IuRGl2aWRlOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuU2xhc2hUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLkVxdWFsczpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkVxdWFsc0VxdWFsc1Rva2VuO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQmluYXJ5T3BlcmF0b3IuSWRlbnRpY2FsOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuRXF1YWxzRXF1YWxzRXF1YWxzVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5Mb3dlcjpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkxlc3NUaGFuVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5Mb3dlckVxdWFsczpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkxlc3NUaGFuRXF1YWxzVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5NaW51czpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLk1pbnVzVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5Nb2R1bG86XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5QZXJjZW50VG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5NdWx0aXBseTpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkFzdGVyaXNrVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5Ob3RFcXVhbHM6XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5FeGNsYW1hdGlvbkVxdWFsc1Rva2VuO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQmluYXJ5T3BlcmF0b3IuTm90SWRlbnRpY2FsOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuRXhjbGFtYXRpb25FcXVhbHNFcXVhbHNUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLk9yOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuQmFyQmFyVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5QbHVzOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuUGx1c1Rva2VuO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBvcGVyYXRvcjogJHtleHByLm9wZXJhdG9yfWApO1xuICAgIH1cbiAgICBjb25zdCBiaW5hcnkgPSB0cy5jcmVhdGVCaW5hcnkoXG4gICAgICAgIGV4cHIubGhzLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSwgYmluYXJ5T3BlcmF0b3IsIGV4cHIucmhzLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSk7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKGV4cHIsIGV4cHIucGFyZW5zID8gdHMuY3JlYXRlUGFyZW4oYmluYXJ5KSA6IGJpbmFyeSk7XG4gIH1cblxuICB2aXNpdFJlYWRQcm9wRXhwcihleHByOiBSZWFkUHJvcEV4cHIpOiBSZWNvcmRlZE5vZGU8dHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLCB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhleHByLnJlY2VpdmVyLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSwgZXhwci5uYW1lKSk7XG4gIH1cblxuICB2aXNpdFJlYWRLZXlFeHByKGV4cHI6IFJlYWRLZXlFeHByKTogUmVjb3JkZWROb2RlPHRzLkVsZW1lbnRBY2Nlc3NFeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLFxuICAgICAgICB0cy5jcmVhdGVFbGVtZW50QWNjZXNzKFxuICAgICAgICAgICAgZXhwci5yZWNlaXZlci52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCksIGV4cHIuaW5kZXgudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSk7XG4gIH1cblxuICB2aXNpdExpdGVyYWxBcnJheUV4cHIoZXhwcjogTGl0ZXJhbEFycmF5RXhwcik6IFJlY29yZGVkTm9kZTx0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLCB0cy5jcmVhdGVBcnJheUxpdGVyYWwoZXhwci5lbnRyaWVzLm1hcChlbnRyeSA9PiBlbnRyeS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpKSk7XG4gIH1cblxuICB2aXNpdExpdGVyYWxNYXBFeHByKGV4cHI6IExpdGVyYWxNYXBFeHByKTogUmVjb3JkZWROb2RlPHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLCB0cy5jcmVhdGVPYmplY3RMaXRlcmFsKGV4cHIuZW50cmllcy5tYXAoXG4gICAgICAgICAgICAgICAgICBlbnRyeSA9PiB0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQoXG4gICAgICAgICAgICAgICAgICAgICAgZW50cnkucXVvdGVkIHx8ICFfVkFMSURfSURFTlRJRklFUl9SRS50ZXN0KGVudHJ5LmtleSkgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5jcmVhdGVMaXRlcmFsKGVudHJ5LmtleSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRyeS5rZXksXG4gICAgICAgICAgICAgICAgICAgICAgZW50cnkudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSkpKTtcbiAgfVxuXG4gIHZpc2l0Q29tbWFFeHByKGV4cHI6IENvbW1hRXhwcik6IFJlY29yZGVkTm9kZTx0cy5FeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLCBleHByLnBhcnRzLm1hcChlID0+IGUudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKVxuICAgICAgICAgICAgICAgICAgLnJlZHVjZTx0cy5FeHByZXNzaW9ufG51bGw+KFxuICAgICAgICAgICAgICAgICAgICAgIChsZWZ0LCByaWdodCkgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgbGVmdCA/IHRzLmNyZWF0ZUJpbmFyeShsZWZ0LCB0cy5TeW50YXhLaW5kLkNvbW1hVG9rZW4sIHJpZ2h0KSA6IHJpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgIG51bGwpKTtcbiAgfVxuXG4gIHByaXZhdGUgX3Zpc2l0U3RhdGVtZW50cyhzdGF0ZW1lbnRzOiBTdGF0ZW1lbnRbXSk6IHRzLkJsb2NrIHtcbiAgICByZXR1cm4gdGhpcy5fdmlzaXRTdGF0ZW1lbnRzUHJlZml4KFtdLCBzdGF0ZW1lbnRzKTtcbiAgfVxuXG4gIHByaXZhdGUgX3Zpc2l0U3RhdGVtZW50c1ByZWZpeChwcmVmaXg6IHRzLlN0YXRlbWVudFtdLCBzdGF0ZW1lbnRzOiBTdGF0ZW1lbnRbXSkge1xuICAgIHJldHVybiB0cy5jcmVhdGVCbG9jayhbXG4gICAgICAuLi5wcmVmaXgsIC4uLnN0YXRlbWVudHMubWFwKHN0bXQgPT4gc3RtdC52aXNpdFN0YXRlbWVudCh0aGlzLCBudWxsKSkuZmlsdGVyKGYgPT4gZiAhPSBudWxsKVxuICAgIF0pO1xuICB9XG5cbiAgcHJpdmF0ZSBfdmlzaXRJZGVudGlmaWVyKHZhbHVlOiBFeHRlcm5hbFJlZmVyZW5jZSk6IHRzLkV4cHJlc3Npb24ge1xuICAgIC8vIG5hbWUgY2FuIG9ubHkgYmUgbnVsbCBkdXJpbmcgSklUIHdoaWNoIG5ldmVyIGV4ZWN1dGVzIHRoaXMgY29kZS5cbiAgICBjb25zdCBtb2R1bGVOYW1lID0gdmFsdWUubW9kdWxlTmFtZSwgbmFtZSA9IHZhbHVlLm5hbWUgITtcbiAgICBsZXQgcHJlZml4SWRlbnQ6IHRzLklkZW50aWZpZXJ8bnVsbCA9IG51bGw7XG4gICAgaWYgKG1vZHVsZU5hbWUpIHtcbiAgICAgIGxldCBwcmVmaXggPSB0aGlzLl9pbXBvcnRzV2l0aFByZWZpeGVzLmdldChtb2R1bGVOYW1lKTtcbiAgICAgIGlmIChwcmVmaXggPT0gbnVsbCkge1xuICAgICAgICBwcmVmaXggPSBgaSR7dGhpcy5faW1wb3J0c1dpdGhQcmVmaXhlcy5zaXplfWA7XG4gICAgICAgIHRoaXMuX2ltcG9ydHNXaXRoUHJlZml4ZXMuc2V0KG1vZHVsZU5hbWUsIHByZWZpeCk7XG4gICAgICB9XG4gICAgICBwcmVmaXhJZGVudCA9IHRzLmNyZWF0ZUlkZW50aWZpZXIocHJlZml4KTtcbiAgICB9XG4gICAgaWYgKHByZWZpeElkZW50KSB7XG4gICAgICByZXR1cm4gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MocHJlZml4SWRlbnQsIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBpZCA9IHRzLmNyZWF0ZUlkZW50aWZpZXIobmFtZSk7XG4gICAgICBpZiAodGhpcy5fZXhwb3J0ZWRWYXJpYWJsZUlkZW50aWZpZXJzLmhhcyhuYW1lKSkge1xuICAgICAgICAvLyBJbiBvcmRlciBmb3IgdGhpcyBuZXcgaWRlbnRpZmllciBub2RlIHRvIGJlIHByb3Blcmx5IHJld3JpdHRlbiBpbiBDb21tb25KUyBvdXRwdXQsXG4gICAgICAgIC8vIGl0IG11c3QgaGF2ZSBpdHMgb3JpZ2luYWwgbm9kZSBzZXQgdG8gYSBwYXJzZWQgaW5zdGFuY2Ugb2YgdGhlIHNhbWUgaWRlbnRpZmllci5cbiAgICAgICAgdHMuc2V0T3JpZ2luYWxOb2RlKGlkLCB0aGlzLl9leHBvcnRlZFZhcmlhYmxlSWRlbnRpZmllcnMuZ2V0KG5hbWUpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBpZDtcbiAgICB9XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBnZXRNZXRob2ROYW1lKG1ldGhvZFJlZjoge25hbWU6IHN0cmluZyB8IG51bGw7IGJ1aWx0aW46IEJ1aWx0aW5NZXRob2QgfCBudWxsfSk6IHN0cmluZyB7XG4gIGlmIChtZXRob2RSZWYubmFtZSkge1xuICAgIHJldHVybiBtZXRob2RSZWYubmFtZTtcbiAgfSBlbHNlIHtcbiAgICBzd2l0Y2ggKG1ldGhvZFJlZi5idWlsdGluKSB7XG4gICAgICBjYXNlIEJ1aWx0aW5NZXRob2QuQmluZDpcbiAgICAgICAgcmV0dXJuICdiaW5kJztcbiAgICAgIGNhc2UgQnVpbHRpbk1ldGhvZC5Db25jYXRBcnJheTpcbiAgICAgICAgcmV0dXJuICdjb25jYXQnO1xuICAgICAgY2FzZSBCdWlsdGluTWV0aG9kLlN1YnNjcmliZU9ic2VydmFibGU6XG4gICAgICAgIHJldHVybiAnc3Vic2NyaWJlJztcbiAgICB9XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKCdVbmV4cGVjdGVkIG1ldGhvZCByZWZlcmVuY2UgZm9ybScpO1xufVxuXG5mdW5jdGlvbiBtb2RpZmllckZyb21Nb2RpZmllcihtb2RpZmllcjogU3RtdE1vZGlmaWVyKTogdHMuTW9kaWZpZXIge1xuICBzd2l0Y2ggKG1vZGlmaWVyKSB7XG4gICAgY2FzZSBTdG10TW9kaWZpZXIuRXhwb3J0ZWQ6XG4gICAgICByZXR1cm4gdHMuY3JlYXRlVG9rZW4odHMuU3ludGF4S2luZC5FeHBvcnRLZXl3b3JkKTtcbiAgICBjYXNlIFN0bXRNb2RpZmllci5GaW5hbDpcbiAgICAgIHJldHVybiB0cy5jcmVhdGVUb2tlbih0cy5TeW50YXhLaW5kLkNvbnN0S2V5d29yZCk7XG4gICAgY2FzZSBTdG10TW9kaWZpZXIuUHJpdmF0ZTpcbiAgICAgIHJldHVybiB0cy5jcmVhdGVUb2tlbih0cy5TeW50YXhLaW5kLlByaXZhdGVLZXl3b3JkKTtcbiAgICBjYXNlIFN0bXRNb2RpZmllci5TdGF0aWM6XG4gICAgICByZXR1cm4gdHMuY3JlYXRlVG9rZW4odHMuU3ludGF4S2luZC5TdGF0aWNLZXl3b3JkKTtcbiAgfVxuICByZXR1cm4gZXJyb3IoYHVua25vd24gc3RhdGVtZW50IG1vZGlmaWVyYCk7XG59XG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZU1vZGlmaWVycyhtb2RpZmllcnM6IFN0bXRNb2RpZmllcltdIHwgbnVsbCk6IHRzLk1vZGlmaWVyW118dW5kZWZpbmVkIHtcbiAgcmV0dXJuIG1vZGlmaWVycyA9PSBudWxsID8gdW5kZWZpbmVkIDogbW9kaWZpZXJzICEubWFwKG1vZGlmaWVyRnJvbU1vZGlmaWVyKTtcbn1cbiJdfQ==