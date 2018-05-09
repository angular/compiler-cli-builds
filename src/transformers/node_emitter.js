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
        define("@angular/compiler-cli/src/transformers/node_emitter", ["require", "exports", "tslib", "@angular/compiler/index", "typescript", "@angular/compiler-cli/src/transformers/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler/index");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZV9lbWl0dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy90cmFuc2Zvcm1lcnMvbm9kZV9lbWl0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILG9EQUE0cEI7SUFDNXBCLCtCQUFpQztJQUVqQyxvRUFBNkI7SUFJN0IsSUFBTSxnQkFBZ0IsR0FBRyxNQUFNLENBQUM7SUFDaEMsSUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUM7SUFDakMsSUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUM7SUFDakMsSUFBTSxvQkFBb0IsR0FBRyx1QkFBdUIsQ0FBQztJQUVyRDtRQUFBO1FBZ0NBLENBQUM7UUEvQkMsZ0RBQWdCLEdBQWhCLFVBQWlCLFVBQXlCLEVBQUUsS0FBa0IsRUFBRSxRQUFpQjtZQUUvRSxJQUFNLFNBQVMsR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUM7WUFDM0MsMkZBQTJGO1lBQzNGLFNBQVM7WUFDVCxJQUFNLFVBQVUsR0FBVSxFQUFFLENBQUMsTUFBTSxPQUFULEVBQUUsbUJBQ3JCLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsRUFBcEMsQ0FBb0MsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLElBQUksSUFBSSxJQUFJLEVBQVosQ0FBWSxDQUFDLEVBQUMsQ0FBQztZQUM3RixJQUFNLGFBQWEsR0FBbUIsRUFBRSxDQUFDO1lBQ3pDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQ2IsSUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDdEUsYUFBYSxDQUFDLElBQUksQ0FB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LENBQUMsQ0FBQztRQUN2RCxDQUFDO1FBQ0QsTUFBTSxDQUFDLFlBQUssQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFRCw0QkFBNEIsU0FBZ0M7UUFDMUQsTUFBTSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQy9FLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QXNzZXJ0Tm90TnVsbCwgQmluYXJ5T3BlcmF0b3IsIEJpbmFyeU9wZXJhdG9yRXhwciwgQnVpbHRpbk1ldGhvZCwgQnVpbHRpblZhciwgQ2FzdEV4cHIsIENsYXNzU3RtdCwgQ29tbWFFeHByLCBDb21tZW50U3RtdCwgQ29uZGl0aW9uYWxFeHByLCBEZWNsYXJlRnVuY3Rpb25TdG10LCBEZWNsYXJlVmFyU3RtdCwgRXhwcmVzc2lvblN0YXRlbWVudCwgRXhwcmVzc2lvblZpc2l0b3IsIEV4dGVybmFsRXhwciwgRXh0ZXJuYWxSZWZlcmVuY2UsIEZ1bmN0aW9uRXhwciwgSWZTdG10LCBJbnN0YW50aWF0ZUV4cHIsIEludm9rZUZ1bmN0aW9uRXhwciwgSW52b2tlTWV0aG9kRXhwciwgSlNEb2NDb21tZW50U3RtdCwgTGl0ZXJhbEFycmF5RXhwciwgTGl0ZXJhbEV4cHIsIExpdGVyYWxNYXBFeHByLCBOb3RFeHByLCBQYXJzZVNvdXJjZUZpbGUsIFBhcnNlU291cmNlU3BhbiwgUGFydGlhbE1vZHVsZSwgUmVhZEtleUV4cHIsIFJlYWRQcm9wRXhwciwgUmVhZFZhckV4cHIsIFJldHVyblN0YXRlbWVudCwgU3RhdGVtZW50LCBTdGF0ZW1lbnRWaXNpdG9yLCBTdG10TW9kaWZpZXIsIFRocm93U3RtdCwgVHJ5Q2F0Y2hTdG10LCBXcmFwcGVkTm9kZUV4cHIsIFdyaXRlS2V5RXhwciwgV3JpdGVQcm9wRXhwciwgV3JpdGVWYXJFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtlcnJvcn0gZnJvbSAnLi91dGlsJztcblxuZXhwb3J0IGludGVyZmFjZSBOb2RlIHsgc291cmNlU3BhbjogUGFyc2VTb3VyY2VTcGFufG51bGw7IH1cblxuY29uc3QgTUVUSE9EX1RISVNfTkFNRSA9ICd0aGlzJztcbmNvbnN0IENBVENIX0VSUk9SX05BTUUgPSAnZXJyb3InO1xuY29uc3QgQ0FUQ0hfU1RBQ0tfTkFNRSA9ICdzdGFjayc7XG5jb25zdCBfVkFMSURfSURFTlRJRklFUl9SRSA9IC9eWyRBLVpfXVswLTlBLVpfJF0qJC9pO1xuXG5leHBvcnQgY2xhc3MgVHlwZVNjcmlwdE5vZGVFbWl0dGVyIHtcbiAgdXBkYXRlU291cmNlRmlsZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBzdG10czogU3RhdGVtZW50W10sIHByZWFtYmxlPzogc3RyaW5nKTpcbiAgICAgIFt0cy5Tb3VyY2VGaWxlLCBNYXA8dHMuTm9kZSwgTm9kZT5dIHtcbiAgICBjb25zdCBjb252ZXJ0ZXIgPSBuZXcgTm9kZUVtaXR0ZXJWaXNpdG9yKCk7XG4gICAgLy8gW10uY29uY2F0IGZsYXR0ZW5zIHRoZSByZXN1bHQgc28gdGhhdCBlYWNoIGB2aXNpdC4uLmAgbWV0aG9kIGNhbiBhbHNvIHJldHVybiBhbiBhcnJheSBvZlxuICAgIC8vIHN0bXRzLlxuICAgIGNvbnN0IHN0YXRlbWVudHM6IGFueVtdID0gW10uY29uY2F0KFxuICAgICAgICAuLi5zdG10cy5tYXAoc3RtdCA9PiBzdG10LnZpc2l0U3RhdGVtZW50KGNvbnZlcnRlciwgbnVsbCkpLmZpbHRlcihzdG10ID0+IHN0bXQgIT0gbnVsbCkpO1xuICAgIGNvbnN0IHByZWFtYmxlU3RtdHM6IHRzLlN0YXRlbWVudFtdID0gW107XG4gICAgaWYgKHByZWFtYmxlKSB7XG4gICAgICBjb25zdCBjb21tZW50U3RtdCA9IHRoaXMuY3JlYXRlQ29tbWVudFN0YXRlbWVudChzb3VyY2VGaWxlLCBwcmVhbWJsZSk7XG4gICAgICBwcmVhbWJsZVN0bXRzLnB1c2goY29tbWVudFN0bXQpO1xuICAgIH1cbiAgICBjb25zdCBzb3VyY2VTdGF0ZW1lbnRzID1cbiAgICAgICAgWy4uLnByZWFtYmxlU3RtdHMsIC4uLmNvbnZlcnRlci5nZXRSZWV4cG9ydHMoKSwgLi4uY29udmVydGVyLmdldEltcG9ydHMoKSwgLi4uc3RhdGVtZW50c107XG4gICAgY29udmVydGVyLnVwZGF0ZVNvdXJjZU1hcChzb3VyY2VTdGF0ZW1lbnRzKTtcbiAgICBjb25zdCBuZXdTb3VyY2VGaWxlID0gdHMudXBkYXRlU291cmNlRmlsZU5vZGUoc291cmNlRmlsZSwgc291cmNlU3RhdGVtZW50cyk7XG4gICAgcmV0dXJuIFtuZXdTb3VyY2VGaWxlLCBjb252ZXJ0ZXIuZ2V0Tm9kZU1hcCgpXTtcbiAgfVxuXG4gIC8qKiBDcmVhdGVzIGEgbm90IGVtaXR0ZWQgc3RhdGVtZW50IGNvbnRhaW5pbmcgdGhlIGdpdmVuIGNvbW1lbnQuICovXG4gIGNyZWF0ZUNvbW1lbnRTdGF0ZW1lbnQoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgY29tbWVudDogc3RyaW5nKTogdHMuU3RhdGVtZW50IHtcbiAgICBpZiAoY29tbWVudC5zdGFydHNXaXRoKCcvKicpICYmIGNvbW1lbnQuZW5kc1dpdGgoJyovJykpIHtcbiAgICAgIGNvbW1lbnQgPSBjb21tZW50LnN1YnN0cigyLCBjb21tZW50Lmxlbmd0aCAtIDQpO1xuICAgIH1cbiAgICBjb25zdCBjb21tZW50U3RtdCA9IHRzLmNyZWF0ZU5vdEVtaXR0ZWRTdGF0ZW1lbnQoc291cmNlRmlsZSk7XG4gICAgdHMuc2V0U3ludGhldGljTGVhZGluZ0NvbW1lbnRzKFxuICAgICAgICBjb21tZW50U3RtdCxcbiAgICAgICAgW3traW5kOiB0cy5TeW50YXhLaW5kLk11bHRpTGluZUNvbW1lbnRUcml2aWEsIHRleHQ6IGNvbW1lbnQsIHBvczogLTEsIGVuZDogLTF9XSk7XG4gICAgdHMuc2V0RW1pdEZsYWdzKGNvbW1lbnRTdG10LCB0cy5FbWl0RmxhZ3MuQ3VzdG9tUHJvbG9ndWUpO1xuICAgIHJldHVybiBjb21tZW50U3RtdDtcbiAgfVxufVxuXG4vKipcbiAqIFVwZGF0ZSB0aGUgZ2l2ZW4gc291cmNlIGZpbGUgdG8gaW5jbHVkZSB0aGUgY2hhbmdlcyBzcGVjaWZpZWQgaW4gbW9kdWxlLlxuICpcbiAqIFRoZSBtb2R1bGUgcGFyYW1ldGVyIGlzIHRyZWF0ZWQgYXMgYSBwYXJ0aWFsIG1vZHVsZSBtZWFuaW5nIHRoYXQgdGhlIHN0YXRlbWVudHMgYXJlIGFkZGVkIHRvXG4gKiB0aGUgbW9kdWxlIGluc3RlYWQgb2YgcmVwbGFjaW5nIHRoZSBtb2R1bGUuIEFsc28sIGFueSBjbGFzc2VzIGFyZSB0cmVhdGVkIGFzIHBhcnRpYWwgY2xhc3Nlc1xuICogYW5kIHRoZSBpbmNsdWRlZCBtZW1iZXJzIGFyZSBhZGRlZCB0byB0aGUgY2xhc3Mgd2l0aCB0aGUgc2FtZSBuYW1lIGluc3RlYWQgb2YgYSBuZXcgY2xhc3NcbiAqIGJlaW5nIGNyZWF0ZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVTb3VyY2VGaWxlKFxuICAgIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIG1vZHVsZTogUGFydGlhbE1vZHVsZSxcbiAgICBjb250ZXh0OiB0cy5UcmFuc2Zvcm1hdGlvbkNvbnRleHQpOiBbdHMuU291cmNlRmlsZSwgTWFwPHRzLk5vZGUsIE5vZGU+XSB7XG4gIGNvbnN0IGNvbnZlcnRlciA9IG5ldyBOb2RlRW1pdHRlclZpc2l0b3IoKTtcbiAgY29udmVydGVyLmxvYWRFeHBvcnRlZFZhcmlhYmxlSWRlbnRpZmllcnMoc291cmNlRmlsZSk7XG5cbiAgY29uc3QgcHJlZml4U3RhdGVtZW50cyA9IG1vZHVsZS5zdGF0ZW1lbnRzLmZpbHRlcihzdGF0ZW1lbnQgPT4gIShzdGF0ZW1lbnQgaW5zdGFuY2VvZiBDbGFzc1N0bXQpKTtcbiAgY29uc3QgY2xhc3NlcyA9XG4gICAgICBtb2R1bGUuc3RhdGVtZW50cy5maWx0ZXIoc3RhdGVtZW50ID0+IHN0YXRlbWVudCBpbnN0YW5jZW9mIENsYXNzU3RtdCkgYXMgQ2xhc3NTdG10W107XG4gIGNvbnN0IGNsYXNzTWFwID0gbmV3IE1hcChcbiAgICAgIGNsYXNzZXMubWFwPFtzdHJpbmcsIENsYXNzU3RtdF0+KGNsYXNzU3RhdGVtZW50ID0+IFtjbGFzc1N0YXRlbWVudC5uYW1lLCBjbGFzc1N0YXRlbWVudF0pKTtcbiAgY29uc3QgY2xhc3NOYW1lcyA9IG5ldyBTZXQoY2xhc3Nlcy5tYXAoY2xhc3NTdGF0ZW1lbnQgPT4gY2xhc3NTdGF0ZW1lbnQubmFtZSkpO1xuXG4gIGNvbnN0IHByZWZpeDogdHMuU3RhdGVtZW50W10gPVxuICAgICAgcHJlZml4U3RhdGVtZW50cy5tYXAoc3RhdGVtZW50ID0+IHN0YXRlbWVudC52aXNpdFN0YXRlbWVudChjb252ZXJ0ZXIsIHNvdXJjZUZpbGUpKTtcblxuICAvLyBBZGQgc3RhdGljIG1ldGhvZHMgdG8gYWxsIHRoZSBjbGFzc2VzIHJlZmVyZW5jZWQgaW4gbW9kdWxlLlxuICBsZXQgbmV3U3RhdGVtZW50cyA9IHNvdXJjZUZpbGUuc3RhdGVtZW50cy5tYXAobm9kZSA9PiB7XG4gICAgaWYgKG5vZGUua2luZCA9PSB0cy5TeW50YXhLaW5kLkNsYXNzRGVjbGFyYXRpb24pIHtcbiAgICAgIGNvbnN0IGNsYXNzRGVjbGFyYXRpb24gPSBub2RlIGFzIHRzLkNsYXNzRGVjbGFyYXRpb247XG4gICAgICBjb25zdCBuYW1lID0gY2xhc3NEZWNsYXJhdGlvbi5uYW1lO1xuICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgY29uc3QgY2xhc3NTdGF0ZW1lbnQgPSBjbGFzc01hcC5nZXQobmFtZS50ZXh0KTtcbiAgICAgICAgaWYgKGNsYXNzU3RhdGVtZW50KSB7XG4gICAgICAgICAgY2xhc3NOYW1lcy5kZWxldGUobmFtZS50ZXh0KTtcbiAgICAgICAgICBjb25zdCBjbGFzc01lbWJlckhvbGRlciA9XG4gICAgICAgICAgICAgIGNvbnZlcnRlci52aXNpdERlY2xhcmVDbGFzc1N0bXQoY2xhc3NTdGF0ZW1lbnQpIGFzIHRzLkNsYXNzRGVjbGFyYXRpb247XG4gICAgICAgICAgY29uc3QgbmV3TWV0aG9kcyA9XG4gICAgICAgICAgICAgIGNsYXNzTWVtYmVySG9sZGVyLm1lbWJlcnMuZmlsdGVyKG1lbWJlciA9PiBtZW1iZXIua2luZCAhPT0gdHMuU3ludGF4S2luZC5Db25zdHJ1Y3Rvcik7XG4gICAgICAgICAgY29uc3QgbmV3TWVtYmVycyA9IFsuLi5jbGFzc0RlY2xhcmF0aW9uLm1lbWJlcnMsIC4uLm5ld01ldGhvZHNdO1xuXG4gICAgICAgICAgcmV0dXJuIHRzLnVwZGF0ZUNsYXNzRGVjbGFyYXRpb24oXG4gICAgICAgICAgICAgIGNsYXNzRGVjbGFyYXRpb24sXG4gICAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gY2xhc3NEZWNsYXJhdGlvbi5kZWNvcmF0b3JzLFxuICAgICAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gY2xhc3NEZWNsYXJhdGlvbi5tb2RpZmllcnMsXG4gICAgICAgICAgICAgIC8qIG5hbWUgKi8gY2xhc3NEZWNsYXJhdGlvbi5uYW1lLFxuICAgICAgICAgICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyBjbGFzc0RlY2xhcmF0aW9uLnR5cGVQYXJhbWV0ZXJzLFxuICAgICAgICAgICAgICAvKiBoZXJpdGFnZUNsYXVzZXMgKi8gY2xhc3NEZWNsYXJhdGlvbi5oZXJpdGFnZUNsYXVzZXMgfHwgW10sXG4gICAgICAgICAgICAgIC8qIG1lbWJlcnMgKi8gbmV3TWVtYmVycyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5vZGU7XG4gIH0pO1xuXG4gIC8vIFZhbGlkYXRlIHRoYXQgYWxsIHRoZSBjbGFzc2VzIGhhdmUgYmVlbiBnZW5lcmF0ZWRcbiAgY2xhc3NOYW1lcy5zaXplID09IDAgfHxcbiAgICAgIGVycm9yKFxuICAgICAgICAgIGAke2NsYXNzTmFtZXMuc2l6ZSA9PSAxID8gJ0NsYXNzJyA6ICdDbGFzc2VzJ30gXCIke0FycmF5LmZyb20oY2xhc3NOYW1lcy5rZXlzKCkpLmpvaW4oJywgJyl9XCIgbm90IGdlbmVyYXRlZGApO1xuXG4gIC8vIEFkZCBpbXBvcnRzIHRvIHRoZSBtb2R1bGUgcmVxdWlyZWQgYnkgdGhlIG5ldyBtZXRob2RzXG4gIGNvbnN0IGltcG9ydHMgPSBjb252ZXJ0ZXIuZ2V0SW1wb3J0cygpO1xuICBpZiAoaW1wb3J0cyAmJiBpbXBvcnRzLmxlbmd0aCkge1xuICAgIC8vIEZpbmQgd2hlcmUgdGhlIG5ldyBpbXBvcnRzIHNob3VsZCBnb1xuICAgIGNvbnN0IGluZGV4ID0gZmlyc3RBZnRlcihcbiAgICAgICAgbmV3U3RhdGVtZW50cywgc3RhdGVtZW50ID0+IHN0YXRlbWVudC5raW5kID09PSB0cy5TeW50YXhLaW5kLkltcG9ydERlY2xhcmF0aW9uIHx8XG4gICAgICAgICAgICBzdGF0ZW1lbnQua2luZCA9PT0gdHMuU3ludGF4S2luZC5JbXBvcnRFcXVhbHNEZWNsYXJhdGlvbik7XG4gICAgbmV3U3RhdGVtZW50cyA9XG4gICAgICAgIFsuLi5uZXdTdGF0ZW1lbnRzLnNsaWNlKDAsIGluZGV4KSwgLi4uaW1wb3J0cywgLi4ucHJlZml4LCAuLi5uZXdTdGF0ZW1lbnRzLnNsaWNlKGluZGV4KV07XG4gIH0gZWxzZSB7XG4gICAgbmV3U3RhdGVtZW50cyA9IFsuLi5wcmVmaXgsIC4uLm5ld1N0YXRlbWVudHNdO1xuICB9XG5cbiAgY29udmVydGVyLnVwZGF0ZVNvdXJjZU1hcChuZXdTdGF0ZW1lbnRzKTtcbiAgY29uc3QgbmV3U291cmNlRmlsZSA9IHRzLnVwZGF0ZVNvdXJjZUZpbGVOb2RlKHNvdXJjZUZpbGUsIG5ld1N0YXRlbWVudHMpO1xuXG4gIHJldHVybiBbbmV3U291cmNlRmlsZSwgY29udmVydGVyLmdldE5vZGVNYXAoKV07XG59XG5cbi8vIFJldHVybiB0aGUgaW5kZXggYWZ0ZXIgdGhlIGZpcnN0IHZhbHVlIGluIGBhYCB0aGF0IGRvZXNuJ3QgbWF0Y2ggdGhlIHByZWRpY2F0ZSBhZnRlciBhIHZhbHVlIHRoYXRcbi8vIGRvZXMgb3IgMCBpZiBubyB2YWx1ZXMgbWF0Y2guXG5mdW5jdGlvbiBmaXJzdEFmdGVyPFQ+KGE6IFRbXSwgcHJlZGljYXRlOiAodmFsdWU6IFQpID0+IGJvb2xlYW4pIHtcbiAgbGV0IGluZGV4ID0gMDtcbiAgY29uc3QgbGVuID0gYS5sZW5ndGg7XG4gIGZvciAoOyBpbmRleCA8IGxlbjsgaW5kZXgrKykge1xuICAgIGNvbnN0IHZhbHVlID0gYVtpbmRleF07XG4gICAgaWYgKHByZWRpY2F0ZSh2YWx1ZSkpIGJyZWFrO1xuICB9XG4gIGlmIChpbmRleCA+PSBsZW4pIHJldHVybiAwO1xuICBmb3IgKDsgaW5kZXggPCBsZW47IGluZGV4KyspIHtcbiAgICBjb25zdCB2YWx1ZSA9IGFbaW5kZXhdO1xuICAgIGlmICghcHJlZGljYXRlKHZhbHVlKSkgYnJlYWs7XG4gIH1cbiAgcmV0dXJuIGluZGV4O1xufVxuXG4vLyBBIHJlY29yZGVkIG5vZGUgaXMgYSBzdWJ0eXBlIG9mIHRoZSBub2RlIHRoYXQgaXMgbWFya2VkIGFzIGJlaW5nIHJlY29yZGVkLiBUaGlzIGlzIHVzZWRcbi8vIHRvIGVuc3VyZSB0aGF0IE5vZGVFbWl0dGVyVmlzaXRvci5yZWNvcmQgaGFzIGJlZW4gY2FsbGVkIG9uIGFsbCBub2RlcyByZXR1cm5lZCBieSB0aGVcbi8vIE5vZGVFbWl0dGVyVmlzaXRvclxuZXhwb3J0IHR5cGUgUmVjb3JkZWROb2RlPFQgZXh0ZW5kcyB0cy5Ob2RlID0gdHMuTm9kZT4gPSAoVCAmIHsgX19yZWNvcmRlZDogYW55O30pIHwgbnVsbDtcblxuZnVuY3Rpb24gZXNjYXBlTGl0ZXJhbCh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHZhbHVlLnJlcGxhY2UoLyhcXFwifFxcXFwpL2csICdcXFxcJDEnKS5yZXBsYWNlKC8oXFxuKXwoXFxyKS9nLCBmdW5jdGlvbih2LCBuLCByKSB7XG4gICAgcmV0dXJuIG4gPyAnXFxcXG4nIDogJ1xcXFxyJztcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUxpdGVyYWwodmFsdWU6IGFueSkge1xuICBpZiAodmFsdWUgPT09IG51bGwpIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlTnVsbCgpO1xuICB9IGVsc2UgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlSWRlbnRpZmllcigndW5kZWZpbmVkJyk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgcmVzdWx0ID0gdHMuY3JlYXRlTGl0ZXJhbCh2YWx1ZSk7XG4gICAgaWYgKHRzLmlzU3RyaW5nTGl0ZXJhbChyZXN1bHQpICYmIHJlc3VsdC50ZXh0LmluZGV4T2YoJ1xcXFwnKSA+PSAwKSB7XG4gICAgICAvLyBIYWNrIHRvIGF2b2lkIHByb2JsZW1zIGNhdXNlIGluZGlyZWN0bHkgYnk6XG4gICAgICAvLyAgICBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzIwMTkyXG4gICAgICAvLyBUaGlzIGF2b2lkcyB0aGUgc3RyaW5nIGVzY2FwaW5nIG5vcm1hbGx5IHBlcmZvcm1lZCBmb3IgYSBzdHJpbmcgcmVseWluZyBvbiB0aGF0XG4gICAgICAvLyBUeXBlU2NyaXB0IGp1c3QgZW1pdHMgdGhlIHRleHQgcmF3IGZvciBhIG51bWVyaWMgbGl0ZXJhbC5cbiAgICAgIChyZXN1bHQgYXMgYW55KS5raW5kID0gdHMuU3ludGF4S2luZC5OdW1lcmljTGl0ZXJhbDtcbiAgICAgIHJlc3VsdC50ZXh0ID0gYFwiJHtlc2NhcGVMaXRlcmFsKHJlc3VsdC50ZXh0KX1cImA7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNFeHBvcnRUeXBlU3RhdGVtZW50KHN0YXRlbWVudDogdHMuU3RhdGVtZW50KTogYm9vbGVhbiB7XG4gIHJldHVybiAhIXN0YXRlbWVudC5tb2RpZmllcnMgJiZcbiAgICAgIHN0YXRlbWVudC5tb2RpZmllcnMuc29tZShtb2QgPT4gbW9kLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXhwb3J0S2V5d29yZCk7XG59XG5cbi8qKlxuICogVmlzaXRzIGFuIG91dHB1dCBhc3QgYW5kIHByb2R1Y2VzIHRoZSBjb3JyZXNwb25kaW5nIFR5cGVTY3JpcHQgc3ludGhldGljIG5vZGVzLlxuICovXG5leHBvcnQgY2xhc3MgTm9kZUVtaXR0ZXJWaXNpdG9yIGltcGxlbWVudHMgU3RhdGVtZW50VmlzaXRvciwgRXhwcmVzc2lvblZpc2l0b3Ige1xuICBwcml2YXRlIF9ub2RlTWFwID0gbmV3IE1hcDx0cy5Ob2RlLCBOb2RlPigpO1xuICBwcml2YXRlIF9pbXBvcnRzV2l0aFByZWZpeGVzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgcHJpdmF0ZSBfcmVleHBvcnRzID0gbmV3IE1hcDxzdHJpbmcsIHtuYW1lOiBzdHJpbmcsIGFzOiBzdHJpbmd9W10+KCk7XG4gIHByaXZhdGUgX3RlbXBsYXRlU291cmNlcyA9IG5ldyBNYXA8UGFyc2VTb3VyY2VGaWxlLCB0cy5Tb3VyY2VNYXBTb3VyY2U+KCk7XG4gIHByaXZhdGUgX2V4cG9ydGVkVmFyaWFibGVJZGVudGlmaWVycyA9IG5ldyBNYXA8c3RyaW5nLCB0cy5JZGVudGlmaWVyPigpO1xuXG4gIC8qKlxuICAgKiBQcm9jZXNzIHRoZSBzb3VyY2UgZmlsZSBhbmQgY29sbGVjdCBleHBvcnRlZCBpZGVudGlmaWVycyB0aGF0IHJlZmVyIHRvIHZhcmlhYmxlcy5cbiAgICpcbiAgICogT25seSB2YXJpYWJsZXMgYXJlIGNvbGxlY3RlZCBiZWNhdXNlIGV4cG9ydGVkIGNsYXNzZXMgc3RpbGwgZXhpc3QgaW4gdGhlIG1vZHVsZSBzY29wZSBpblxuICAgKiBDb21tb25KUywgd2hlcmVhcyB2YXJpYWJsZXMgaGF2ZSB0aGVpciBkZWNsYXJhdGlvbnMgbW92ZWQgb250byB0aGUgYGV4cG9ydHNgIG9iamVjdCwgYW5kIGFsbFxuICAgKiByZWZlcmVuY2VzIGFyZSB1cGRhdGVkIGFjY29yZGluZ2x5LlxuICAgKi9cbiAgbG9hZEV4cG9ydGVkVmFyaWFibGVJZGVudGlmaWVycyhzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgc291cmNlRmlsZS5zdGF0ZW1lbnRzLmZvckVhY2goc3RhdGVtZW50ID0+IHtcbiAgICAgIGlmICh0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0YXRlbWVudCkgJiYgaXNFeHBvcnRUeXBlU3RhdGVtZW50KHN0YXRlbWVudCkpIHtcbiAgICAgICAgc3RhdGVtZW50LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnMuZm9yRWFjaChkZWNsYXJhdGlvbiA9PiB7XG4gICAgICAgICAgaWYgKHRzLmlzSWRlbnRpZmllcihkZWNsYXJhdGlvbi5uYW1lKSkge1xuICAgICAgICAgICAgdGhpcy5fZXhwb3J0ZWRWYXJpYWJsZUlkZW50aWZpZXJzLnNldChkZWNsYXJhdGlvbi5uYW1lLnRleHQsIGRlY2xhcmF0aW9uLm5hbWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBnZXRSZWV4cG9ydHMoKTogdHMuU3RhdGVtZW50W10ge1xuICAgIHJldHVybiBBcnJheS5mcm9tKHRoaXMuX3JlZXhwb3J0cy5lbnRyaWVzKCkpXG4gICAgICAgIC5tYXAoXG4gICAgICAgICAgICAoW2V4cG9ydGVkRmlsZVBhdGgsIHJlZXhwb3J0c10pID0+IHRzLmNyZWF0ZUV4cG9ydERlY2xhcmF0aW9uKFxuICAgICAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsIHRzLmNyZWF0ZU5hbWVkRXhwb3J0cyhyZWV4cG9ydHMubWFwKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoe25hbWUsIGFzfSkgPT4gdHMuY3JlYXRlRXhwb3J0U3BlY2lmaWVyKG5hbWUsIGFzKSkpLFxuICAgICAgICAgICAgICAgIC8qIG1vZHVsZVNwZWNpZmllciAqLyBjcmVhdGVMaXRlcmFsKGV4cG9ydGVkRmlsZVBhdGgpKSk7XG4gIH1cblxuICBnZXRJbXBvcnRzKCk6IHRzLlN0YXRlbWVudFtdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLl9pbXBvcnRzV2l0aFByZWZpeGVzLmVudHJpZXMoKSlcbiAgICAgICAgLm1hcChcbiAgICAgICAgICAgIChbbmFtZXNwYWNlLCBwcmVmaXhdKSA9PiB0cy5jcmVhdGVJbXBvcnREZWNsYXJhdGlvbihcbiAgICAgICAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIC8qIGltcG9ydENsYXVzZSAqLyB0cy5jcmVhdGVJbXBvcnRDbGF1c2UoXG4gICAgICAgICAgICAgICAgICAgIC8qIG5hbWUgKi88dHMuSWRlbnRpZmllcj4odW5kZWZpbmVkIGFzIGFueSksXG4gICAgICAgICAgICAgICAgICAgIHRzLmNyZWF0ZU5hbWVzcGFjZUltcG9ydCh0cy5jcmVhdGVJZGVudGlmaWVyKHByZWZpeCkpKSxcbiAgICAgICAgICAgICAgICAvKiBtb2R1bGVTcGVjaWZpZXIgKi8gY3JlYXRlTGl0ZXJhbChuYW1lc3BhY2UpKSk7XG4gIH1cblxuICBnZXROb2RlTWFwKCkgeyByZXR1cm4gdGhpcy5fbm9kZU1hcDsgfVxuXG4gIHVwZGF0ZVNvdXJjZU1hcChzdGF0ZW1lbnRzOiB0cy5TdGF0ZW1lbnRbXSkge1xuICAgIGxldCBsYXN0UmFuZ2VTdGFydE5vZGU6IHRzLk5vZGV8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGxldCBsYXN0UmFuZ2VFbmROb2RlOiB0cy5Ob2RlfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBsZXQgbGFzdFJhbmdlOiB0cy5Tb3VyY2VNYXBSYW5nZXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgICBjb25zdCByZWNvcmRMYXN0U291cmNlUmFuZ2UgPSAoKSA9PiB7XG4gICAgICBpZiAobGFzdFJhbmdlICYmIGxhc3RSYW5nZVN0YXJ0Tm9kZSAmJiBsYXN0UmFuZ2VFbmROb2RlKSB7XG4gICAgICAgIGlmIChsYXN0UmFuZ2VTdGFydE5vZGUgPT0gbGFzdFJhbmdlRW5kTm9kZSkge1xuICAgICAgICAgIHRzLnNldFNvdXJjZU1hcFJhbmdlKGxhc3RSYW5nZUVuZE5vZGUsIGxhc3RSYW5nZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdHMuc2V0U291cmNlTWFwUmFuZ2UobGFzdFJhbmdlU3RhcnROb2RlLCBsYXN0UmFuZ2UpO1xuICAgICAgICAgIC8vIE9ubHkgZW1pdCB0aGUgcG9zIGZvciB0aGUgZmlyc3Qgbm9kZSBlbWl0dGVkIGluIHRoZSByYW5nZS5cbiAgICAgICAgICB0cy5zZXRFbWl0RmxhZ3MobGFzdFJhbmdlU3RhcnROb2RlLCB0cy5FbWl0RmxhZ3MuTm9UcmFpbGluZ1NvdXJjZU1hcCk7XG4gICAgICAgICAgdHMuc2V0U291cmNlTWFwUmFuZ2UobGFzdFJhbmdlRW5kTm9kZSwgbGFzdFJhbmdlKTtcbiAgICAgICAgICAvLyBPbmx5IGVtaXQgZW1pdCBlbmQgZm9yIHRoZSBsYXN0IG5vZGUgZW1pdHRlZCBpbiB0aGUgcmFuZ2UuXG4gICAgICAgICAgdHMuc2V0RW1pdEZsYWdzKGxhc3RSYW5nZUVuZE5vZGUsIHRzLkVtaXRGbGFncy5Ob0xlYWRpbmdTb3VyY2VNYXApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHZpc2l0Tm9kZSA9ICh0c05vZGU6IHRzLk5vZGUpID0+IHtcbiAgICAgIGNvbnN0IG5nTm9kZSA9IHRoaXMuX25vZGVNYXAuZ2V0KHRzTm9kZSk7XG4gICAgICBpZiAobmdOb2RlKSB7XG4gICAgICAgIGNvbnN0IHJhbmdlID0gdGhpcy5zb3VyY2VSYW5nZU9mKG5nTm9kZSk7XG4gICAgICAgIGlmIChyYW5nZSkge1xuICAgICAgICAgIGlmICghbGFzdFJhbmdlIHx8IHJhbmdlLnNvdXJjZSAhPSBsYXN0UmFuZ2Uuc291cmNlIHx8IHJhbmdlLnBvcyAhPSBsYXN0UmFuZ2UucG9zIHx8XG4gICAgICAgICAgICAgIHJhbmdlLmVuZCAhPSBsYXN0UmFuZ2UuZW5kKSB7XG4gICAgICAgICAgICByZWNvcmRMYXN0U291cmNlUmFuZ2UoKTtcbiAgICAgICAgICAgIGxhc3RSYW5nZVN0YXJ0Tm9kZSA9IHRzTm9kZTtcbiAgICAgICAgICAgIGxhc3RSYW5nZSA9IHJhbmdlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBsYXN0UmFuZ2VFbmROb2RlID0gdHNOb2RlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0cy5mb3JFYWNoQ2hpbGQodHNOb2RlLCB2aXNpdE5vZGUpO1xuICAgIH07XG4gICAgc3RhdGVtZW50cy5mb3JFYWNoKHZpc2l0Tm9kZSk7XG4gICAgcmVjb3JkTGFzdFNvdXJjZVJhbmdlKCk7XG4gIH1cblxuICBwcml2YXRlIHJlY29yZDxUIGV4dGVuZHMgdHMuTm9kZT4obmdOb2RlOiBOb2RlLCB0c05vZGU6IFR8bnVsbCk6IFJlY29yZGVkTm9kZTxUPiB7XG4gICAgaWYgKHRzTm9kZSAmJiAhdGhpcy5fbm9kZU1hcC5oYXModHNOb2RlKSkge1xuICAgICAgdGhpcy5fbm9kZU1hcC5zZXQodHNOb2RlLCBuZ05vZGUpO1xuICAgIH1cbiAgICByZXR1cm4gdHNOb2RlIGFzIFJlY29yZGVkTm9kZTxUPjtcbiAgfVxuXG4gIHByaXZhdGUgc291cmNlUmFuZ2VPZihub2RlOiBOb2RlKTogdHMuU291cmNlTWFwUmFuZ2V8bnVsbCB7XG4gICAgaWYgKG5vZGUuc291cmNlU3Bhbikge1xuICAgICAgY29uc3Qgc3BhbiA9IG5vZGUuc291cmNlU3BhbjtcbiAgICAgIGlmIChzcGFuLnN0YXJ0LmZpbGUgPT0gc3Bhbi5lbmQuZmlsZSkge1xuICAgICAgICBjb25zdCBmaWxlID0gc3Bhbi5zdGFydC5maWxlO1xuICAgICAgICBpZiAoZmlsZS51cmwpIHtcbiAgICAgICAgICBsZXQgc291cmNlID0gdGhpcy5fdGVtcGxhdGVTb3VyY2VzLmdldChmaWxlKTtcbiAgICAgICAgICBpZiAoIXNvdXJjZSkge1xuICAgICAgICAgICAgc291cmNlID0gdHMuY3JlYXRlU291cmNlTWFwU291cmNlKGZpbGUudXJsLCBmaWxlLmNvbnRlbnQsIHBvcyA9PiBwb3MpO1xuICAgICAgICAgICAgdGhpcy5fdGVtcGxhdGVTb3VyY2VzLnNldChmaWxlLCBzb3VyY2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4ge3Bvczogc3Bhbi5zdGFydC5vZmZzZXQsIGVuZDogc3Bhbi5lbmQub2Zmc2V0LCBzb3VyY2V9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRNb2RpZmllcnMoc3RtdDogU3RhdGVtZW50KSB7XG4gICAgbGV0IG1vZGlmaWVyczogdHMuTW9kaWZpZXJbXSA9IFtdO1xuICAgIGlmIChzdG10Lmhhc01vZGlmaWVyKFN0bXRNb2RpZmllci5FeHBvcnRlZCkpIHtcbiAgICAgIG1vZGlmaWVycy5wdXNoKHRzLmNyZWF0ZVRva2VuKHRzLlN5bnRheEtpbmQuRXhwb3J0S2V5d29yZCkpO1xuICAgIH1cbiAgICByZXR1cm4gbW9kaWZpZXJzO1xuICB9XG5cbiAgLy8gU3RhdGVtZW50VmlzaXRvclxuICB2aXNpdERlY2xhcmVWYXJTdG10KHN0bXQ6IERlY2xhcmVWYXJTdG10KSB7XG4gICAgaWYgKHN0bXQuaGFzTW9kaWZpZXIoU3RtdE1vZGlmaWVyLkV4cG9ydGVkKSAmJiBzdG10LnZhbHVlIGluc3RhbmNlb2YgRXh0ZXJuYWxFeHByICYmXG4gICAgICAgICFzdG10LnR5cGUpIHtcbiAgICAgIC8vIGNoZWNrIGZvciBhIHJlZXhwb3J0XG4gICAgICBjb25zdCB7bmFtZSwgbW9kdWxlTmFtZX0gPSBzdG10LnZhbHVlLnZhbHVlO1xuICAgICAgaWYgKG1vZHVsZU5hbWUpIHtcbiAgICAgICAgbGV0IHJlZXhwb3J0cyA9IHRoaXMuX3JlZXhwb3J0cy5nZXQobW9kdWxlTmFtZSk7XG4gICAgICAgIGlmICghcmVleHBvcnRzKSB7XG4gICAgICAgICAgcmVleHBvcnRzID0gW107XG4gICAgICAgICAgdGhpcy5fcmVleHBvcnRzLnNldChtb2R1bGVOYW1lLCByZWV4cG9ydHMpO1xuICAgICAgICB9XG4gICAgICAgIHJlZXhwb3J0cy5wdXNoKHtuYW1lOiBuYW1lICEsIGFzOiBzdG10Lm5hbWV9KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdmFyRGVjbExpc3QgPSB0cy5jcmVhdGVWYXJpYWJsZURlY2xhcmF0aW9uTGlzdChbdHMuY3JlYXRlVmFyaWFibGVEZWNsYXJhdGlvbihcbiAgICAgICAgdHMuY3JlYXRlSWRlbnRpZmllcihzdG10Lm5hbWUpLFxuICAgICAgICAvKiB0eXBlICovIHVuZGVmaW5lZCxcbiAgICAgICAgKHN0bXQudmFsdWUgJiYgc3RtdC52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpIHx8IHVuZGVmaW5lZCldKTtcblxuICAgIGlmIChzdG10Lmhhc01vZGlmaWVyKFN0bXRNb2RpZmllci5FeHBvcnRlZCkpIHtcbiAgICAgIC8vIE5vdGU6IFdlIG5lZWQgdG8gYWRkIGFuIGV4cGxpY2l0IHZhcmlhYmxlIGFuZCBleHBvcnQgZGVjbGFyYXRpb24gc28gdGhhdFxuICAgICAgLy8gdGhlIHZhcmlhYmxlIGNhbiBiZSByZWZlcnJlZCBpbiB0aGUgc2FtZSBmaWxlIGFzIHdlbGwuXG4gICAgICBjb25zdCB0c1ZhclN0bXQgPVxuICAgICAgICAgIHRoaXMucmVjb3JkKHN0bXQsIHRzLmNyZWF0ZVZhcmlhYmxlU3RhdGVtZW50KC8qIG1vZGlmaWVycyAqL1tdLCB2YXJEZWNsTGlzdCkpO1xuICAgICAgY29uc3QgZXhwb3J0U3RtdCA9IHRoaXMucmVjb3JkKFxuICAgICAgICAgIHN0bXQsIHRzLmNyZWF0ZUV4cG9ydERlY2xhcmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAvKmRlY29yYXRvcnMqLyB1bmRlZmluZWQsIC8qbW9kaWZpZXJzKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICB0cy5jcmVhdGVOYW1lZEV4cG9ydHMoW3RzLmNyZWF0ZUV4cG9ydFNwZWNpZmllcihzdG10Lm5hbWUsIHN0bXQubmFtZSldKSkpO1xuICAgICAgcmV0dXJuIFt0c1ZhclN0bXQsIGV4cG9ydFN0bXRdO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoc3RtdCwgdHMuY3JlYXRlVmFyaWFibGVTdGF0ZW1lbnQodGhpcy5nZXRNb2RpZmllcnMoc3RtdCksIHZhckRlY2xMaXN0KSk7XG4gIH1cblxuICB2aXNpdERlY2xhcmVGdW5jdGlvblN0bXQoc3RtdDogRGVjbGFyZUZ1bmN0aW9uU3RtdCkge1xuICAgIHJldHVybiB0aGlzLnJlY29yZChcbiAgICAgICAgc3RtdCwgdHMuY3JlYXRlRnVuY3Rpb25EZWNsYXJhdGlvbihcbiAgICAgICAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLCB0aGlzLmdldE1vZGlmaWVycyhzdG10KSxcbiAgICAgICAgICAgICAgICAgIC8qIGFzdGVyaXNrVG9rZW4gKi8gdW5kZWZpbmVkLCBzdG10Lm5hbWUsIC8qIHR5cGVQYXJhbWV0ZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgIHN0bXQucGFyYW1zLm1hcChcbiAgICAgICAgICAgICAgICAgICAgICBwID0+IHRzLmNyZWF0ZVBhcmFtZXRlcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8qIGRvdERvdERvdFRva2VuICovIHVuZGVmaW5lZCwgcC5uYW1lKSksXG4gICAgICAgICAgICAgICAgICAvKiB0eXBlICovIHVuZGVmaW5lZCwgdGhpcy5fdmlzaXRTdGF0ZW1lbnRzKHN0bXQuc3RhdGVtZW50cykpKTtcbiAgfVxuXG4gIHZpc2l0RXhwcmVzc2lvblN0bXQoc3RtdDogRXhwcmVzc2lvblN0YXRlbWVudCkge1xuICAgIHJldHVybiB0aGlzLnJlY29yZChzdG10LCB0cy5jcmVhdGVTdGF0ZW1lbnQoc3RtdC5leHByLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSkpO1xuICB9XG5cbiAgdmlzaXRSZXR1cm5TdG10KHN0bXQ6IFJldHVyblN0YXRlbWVudCkge1xuICAgIHJldHVybiB0aGlzLnJlY29yZChcbiAgICAgICAgc3RtdCwgdHMuY3JlYXRlUmV0dXJuKHN0bXQudmFsdWUgPyBzdG10LnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSA6IHVuZGVmaW5lZCkpO1xuICB9XG5cbiAgdmlzaXREZWNsYXJlQ2xhc3NTdG10KHN0bXQ6IENsYXNzU3RtdCkge1xuICAgIGNvbnN0IG1vZGlmaWVycyA9IHRoaXMuZ2V0TW9kaWZpZXJzKHN0bXQpO1xuICAgIGNvbnN0IGZpZWxkcyA9IHN0bXQuZmllbGRzLm1hcChcbiAgICAgICAgZmllbGQgPT4gdHMuY3JlYXRlUHJvcGVydHkoXG4gICAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCwgLyogbW9kaWZpZXJzICovIHRyYW5zbGF0ZU1vZGlmaWVycyhmaWVsZC5tb2RpZmllcnMpLFxuICAgICAgICAgICAgZmllbGQubmFtZSxcbiAgICAgICAgICAgIC8qIHF1ZXN0aW9uVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgLyogdHlwZSAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICBmaWVsZC5pbml0aWFsaXplciA9PSBudWxsID8gdHMuY3JlYXRlTnVsbCgpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWVsZC5pbml0aWFsaXplci52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpKTtcbiAgICBjb25zdCBnZXR0ZXJzID0gc3RtdC5nZXR0ZXJzLm1hcChcbiAgICAgICAgZ2V0dGVyID0+IHRzLmNyZWF0ZUdldEFjY2Vzc29yKFxuICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsIGdldHRlci5uYW1lLCAvKiBwYXJhbWV0ZXJzICovW10sXG4gICAgICAgICAgICAvKiB0eXBlICovIHVuZGVmaW5lZCwgdGhpcy5fdmlzaXRTdGF0ZW1lbnRzKGdldHRlci5ib2R5KSkpO1xuXG4gICAgY29uc3QgY29uc3RydWN0b3IgPVxuICAgICAgICAoc3RtdC5jb25zdHJ1Y3Rvck1ldGhvZCAmJiBbdHMuY3JlYXRlQ29uc3RydWN0b3IoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBwYXJhbWV0ZXJzICovIHN0bXQuY29uc3RydWN0b3JNZXRob2QucGFyYW1zLm1hcChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwID0+IHRzLmNyZWF0ZVBhcmFtZXRlcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIGRvdERvdERvdFRva2VuICovIHVuZGVmaW5lZCwgcC5uYW1lKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl92aXNpdFN0YXRlbWVudHMoc3RtdC5jb25zdHJ1Y3Rvck1ldGhvZC5ib2R5KSldKSB8fFxuICAgICAgICBbXTtcblxuICAgIC8vIFRPRE8ge2NodWNran06IERldGVybWluZSB3aGF0IHNob3VsZCBiZSBkb25lIGZvciBhIG1ldGhvZCB3aXRoIGEgbnVsbCBuYW1lLlxuICAgIGNvbnN0IG1ldGhvZHMgPSBzdG10Lm1ldGhvZHMuZmlsdGVyKG1ldGhvZCA9PiBtZXRob2QubmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kID0+IHRzLmNyZWF0ZU1ldGhvZChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIG1vZGlmaWVycyAqLyB0cmFuc2xhdGVNb2RpZmllcnMobWV0aG9kLm1vZGlmaWVycyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIGFzdHJpc2tUb2tlbiAqLyB1bmRlZmluZWQsIG1ldGhvZC5uYW1lICEvKiBndWFyZGVkIGJ5IGZpbHRlciAqLyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogcXVlc3Rpb25Ub2tlbiAqLyB1bmRlZmluZWQsIC8qIHR5cGVQYXJhbWV0ZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kLnBhcmFtcy5tYXAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwID0+IHRzLmNyZWF0ZVBhcmFtZXRlcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCwgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBkb3REb3REb3RUb2tlbiAqLyB1bmRlZmluZWQsIHAubmFtZSkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiB0eXBlICovIHVuZGVmaW5lZCwgdGhpcy5fdmlzaXRTdGF0ZW1lbnRzKG1ldGhvZC5ib2R5KSkpO1xuICAgIHJldHVybiB0aGlzLnJlY29yZChcbiAgICAgICAgc3RtdCwgdHMuY3JlYXRlQ2xhc3NEZWNsYXJhdGlvbihcbiAgICAgICAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLCBtb2RpZmllcnMsIHN0bXQubmFtZSwgLyogdHlwZVBhcmFtZXRlcnMqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICBzdG10LnBhcmVudCAmJiBbdHMuY3JlYXRlSGVyaXRhZ2VDbGF1c2UoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHMuU3ludGF4S2luZC5FeHRlbmRzS2V5d29yZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbc3RtdC5wYXJlbnQudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpXSldIHx8XG4gICAgICAgICAgICAgICAgICAgICAgW10sXG4gICAgICAgICAgICAgICAgICBbLi4uZmllbGRzLCAuLi5nZXR0ZXJzLCAuLi5jb25zdHJ1Y3RvciwgLi4ubWV0aG9kc10pKTtcbiAgfVxuXG4gIHZpc2l0SWZTdG10KHN0bXQ6IElmU3RtdCkge1xuICAgIHJldHVybiB0aGlzLnJlY29yZChcbiAgICAgICAgc3RtdCxcbiAgICAgICAgdHMuY3JlYXRlSWYoXG4gICAgICAgICAgICBzdG10LmNvbmRpdGlvbi52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCksIHRoaXMuX3Zpc2l0U3RhdGVtZW50cyhzdG10LnRydWVDYXNlKSxcbiAgICAgICAgICAgIHN0bXQuZmFsc2VDYXNlICYmIHN0bXQuZmFsc2VDYXNlLmxlbmd0aCAmJiB0aGlzLl92aXNpdFN0YXRlbWVudHMoc3RtdC5mYWxzZUNhc2UpIHx8XG4gICAgICAgICAgICAgICAgdW5kZWZpbmVkKSk7XG4gIH1cblxuICB2aXNpdFRyeUNhdGNoU3RtdChzdG10OiBUcnlDYXRjaFN0bXQpOiBSZWNvcmRlZE5vZGU8dHMuVHJ5U3RhdGVtZW50PiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBzdG10LCB0cy5jcmVhdGVUcnkoXG4gICAgICAgICAgICAgICAgICB0aGlzLl92aXNpdFN0YXRlbWVudHMoc3RtdC5ib2R5U3RtdHMpLFxuICAgICAgICAgICAgICAgICAgdHMuY3JlYXRlQ2F0Y2hDbGF1c2UoXG4gICAgICAgICAgICAgICAgICAgICAgQ0FUQ0hfRVJST1JfTkFNRSwgdGhpcy5fdmlzaXRTdGF0ZW1lbnRzUHJlZml4KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbdHMuY3JlYXRlVmFyaWFibGVTdGF0ZW1lbnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW3RzLmNyZWF0ZVZhcmlhYmxlRGVjbGFyYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQ0FUQ0hfU1RBQ0tfTkFNRSwgLyogdHlwZSAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLmNyZWF0ZUlkZW50aWZpZXIoQ0FUQ0hfRVJST1JfTkFNRSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLmNyZWF0ZUlkZW50aWZpZXIoQ0FUQ0hfU1RBQ0tfTkFNRSkpKV0pXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RtdC5jYXRjaFN0bXRzKSksXG4gICAgICAgICAgICAgICAgICAvKiBmaW5hbGx5QmxvY2sgKi8gdW5kZWZpbmVkKSk7XG4gIH1cblxuICB2aXNpdFRocm93U3RtdChzdG10OiBUaHJvd1N0bXQpIHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoc3RtdCwgdHMuY3JlYXRlVGhyb3coc3RtdC5lcnJvci52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpKTtcbiAgfVxuXG4gIHZpc2l0Q29tbWVudFN0bXQoc3RtdDogQ29tbWVudFN0bXQsIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpIHtcbiAgICBjb25zdCB0ZXh0ID0gc3RtdC5tdWx0aWxpbmUgPyBgICR7c3RtdC5jb21tZW50fSBgIDogYCAke3N0bXQuY29tbWVudH1gO1xuICAgIHJldHVybiB0aGlzLmNyZWF0ZUNvbW1lbnRTdG10KHRleHQsIHN0bXQubXVsdGlsaW5lLCBzb3VyY2VGaWxlKTtcbiAgfVxuXG4gIHZpc2l0SlNEb2NDb21tZW50U3RtdChzdG10OiBKU0RvY0NvbW1lbnRTdG10LCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKSB7XG4gICAgcmV0dXJuIHRoaXMuY3JlYXRlQ29tbWVudFN0bXQoc3RtdC50b1N0cmluZygpLCB0cnVlLCBzb3VyY2VGaWxlKTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlQ29tbWVudFN0bXQodGV4dDogc3RyaW5nLCBtdWx0aWxpbmU6IGJvb2xlYW4sIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOlxuICAgICAgdHMuTm90RW1pdHRlZFN0YXRlbWVudCB7XG4gICAgY29uc3QgY29tbWVudFN0bXQgPSB0cy5jcmVhdGVOb3RFbWl0dGVkU3RhdGVtZW50KHNvdXJjZUZpbGUpO1xuICAgIGNvbnN0IGtpbmQgPVxuICAgICAgICBtdWx0aWxpbmUgPyB0cy5TeW50YXhLaW5kLk11bHRpTGluZUNvbW1lbnRUcml2aWEgOiB0cy5TeW50YXhLaW5kLlNpbmdsZUxpbmVDb21tZW50VHJpdmlhO1xuICAgIHRzLnNldFN5bnRoZXRpY0xlYWRpbmdDb21tZW50cyhjb21tZW50U3RtdCwgW3traW5kLCB0ZXh0LCBwb3M6IC0xLCBlbmQ6IC0xfV0pO1xuICAgIHJldHVybiBjb21tZW50U3RtdDtcbiAgfVxuXG4gIC8vIEV4cHJlc3Npb25WaXNpdG9yXG4gIHZpc2l0V3JhcHBlZE5vZGVFeHByKGV4cHI6IFdyYXBwZWROb2RlRXhwcjxhbnk+KSB7IHJldHVybiB0aGlzLnJlY29yZChleHByLCBleHByLm5vZGUpOyB9XG5cbiAgLy8gRXhwcmVzc2lvblZpc2l0b3JcbiAgdmlzaXRSZWFkVmFyRXhwcihleHByOiBSZWFkVmFyRXhwcikge1xuICAgIHN3aXRjaCAoZXhwci5idWlsdGluKSB7XG4gICAgICBjYXNlIEJ1aWx0aW5WYXIuVGhpczpcbiAgICAgICAgcmV0dXJuIHRoaXMucmVjb3JkKGV4cHIsIHRzLmNyZWF0ZUlkZW50aWZpZXIoTUVUSE9EX1RISVNfTkFNRSkpO1xuICAgICAgY2FzZSBCdWlsdGluVmFyLkNhdGNoRXJyb3I6XG4gICAgICAgIHJldHVybiB0aGlzLnJlY29yZChleHByLCB0cy5jcmVhdGVJZGVudGlmaWVyKENBVENIX0VSUk9SX05BTUUpKTtcbiAgICAgIGNhc2UgQnVpbHRpblZhci5DYXRjaFN0YWNrOlxuICAgICAgICByZXR1cm4gdGhpcy5yZWNvcmQoZXhwciwgdHMuY3JlYXRlSWRlbnRpZmllcihDQVRDSF9TVEFDS19OQU1FKSk7XG4gICAgICBjYXNlIEJ1aWx0aW5WYXIuU3VwZXI6XG4gICAgICAgIHJldHVybiB0aGlzLnJlY29yZChleHByLCB0cy5jcmVhdGVTdXBlcigpKTtcbiAgICB9XG4gICAgaWYgKGV4cHIubmFtZSkge1xuICAgICAgcmV0dXJuIHRoaXMucmVjb3JkKGV4cHIsIHRzLmNyZWF0ZUlkZW50aWZpZXIoZXhwci5uYW1lKSk7XG4gICAgfVxuICAgIHRocm93IEVycm9yKGBVbmV4cGVjdGVkIFJlYWRWYXJFeHByIGZvcm1gKTtcbiAgfVxuXG4gIHZpc2l0V3JpdGVWYXJFeHByKGV4cHI6IFdyaXRlVmFyRXhwcik6IFJlY29yZGVkTm9kZTx0cy5CaW5hcnlFeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLCB0cy5jcmVhdGVBc3NpZ25tZW50KFxuICAgICAgICAgICAgICAgICAgdHMuY3JlYXRlSWRlbnRpZmllcihleHByLm5hbWUpLCBleHByLnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSkpO1xuICB9XG5cbiAgdmlzaXRXcml0ZUtleUV4cHIoZXhwcjogV3JpdGVLZXlFeHByKTogUmVjb3JkZWROb2RlPHRzLkJpbmFyeUV4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIGV4cHIsXG4gICAgICAgIHRzLmNyZWF0ZUFzc2lnbm1lbnQoXG4gICAgICAgICAgICB0cy5jcmVhdGVFbGVtZW50QWNjZXNzKFxuICAgICAgICAgICAgICAgIGV4cHIucmVjZWl2ZXIudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpLCBleHByLmluZGV4LnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSksXG4gICAgICAgICAgICBleHByLnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSkpO1xuICB9XG5cbiAgdmlzaXRXcml0ZVByb3BFeHByKGV4cHI6IFdyaXRlUHJvcEV4cHIpOiBSZWNvcmRlZE5vZGU8dHMuQmluYXJ5RXhwcmVzc2lvbj4ge1xuICAgIHJldHVybiB0aGlzLnJlY29yZChcbiAgICAgICAgZXhwciwgdHMuY3JlYXRlQXNzaWdubWVudChcbiAgICAgICAgICAgICAgICAgIHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKGV4cHIucmVjZWl2ZXIudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpLCBleHByLm5hbWUpLFxuICAgICAgICAgICAgICAgICAgZXhwci52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpKTtcbiAgfVxuXG4gIHZpc2l0SW52b2tlTWV0aG9kRXhwcihleHByOiBJbnZva2VNZXRob2RFeHByKTogUmVjb3JkZWROb2RlPHRzLkNhbGxFeHByZXNzaW9uPiB7XG4gICAgY29uc3QgbWV0aG9kTmFtZSA9IGdldE1ldGhvZE5hbWUoZXhwcik7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLFxuICAgICAgICB0cy5jcmVhdGVDYWxsKFxuICAgICAgICAgICAgdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoZXhwci5yZWNlaXZlci52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCksIG1ldGhvZE5hbWUpLFxuICAgICAgICAgICAgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsIGV4cHIuYXJncy5tYXAoYXJnID0+IGFyZy52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpKSk7XG4gIH1cblxuICB2aXNpdEludm9rZUZ1bmN0aW9uRXhwcihleHByOiBJbnZva2VGdW5jdGlvbkV4cHIpOiBSZWNvcmRlZE5vZGU8dHMuQ2FsbEV4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIGV4cHIsIHRzLmNyZWF0ZUNhbGwoXG4gICAgICAgICAgICAgICAgICBleHByLmZuLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSwgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICBleHByLmFyZ3MubWFwKGFyZyA9PiBhcmcudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSkpO1xuICB9XG5cbiAgdmlzaXRJbnN0YW50aWF0ZUV4cHIoZXhwcjogSW5zdGFudGlhdGVFeHByKTogUmVjb3JkZWROb2RlPHRzLk5ld0V4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIGV4cHIsIHRzLmNyZWF0ZU5ldyhcbiAgICAgICAgICAgICAgICAgIGV4cHIuY2xhc3NFeHByLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSwgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICBleHByLmFyZ3MubWFwKGFyZyA9PiBhcmcudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSkpO1xuICB9XG5cbiAgdmlzaXRMaXRlcmFsRXhwcihleHByOiBMaXRlcmFsRXhwcikgeyByZXR1cm4gdGhpcy5yZWNvcmQoZXhwciwgY3JlYXRlTGl0ZXJhbChleHByLnZhbHVlKSk7IH1cblxuICB2aXNpdEV4dGVybmFsRXhwcihleHByOiBFeHRlcm5hbEV4cHIpIHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoZXhwciwgdGhpcy5fdmlzaXRJZGVudGlmaWVyKGV4cHIudmFsdWUpKTtcbiAgfVxuXG4gIHZpc2l0Q29uZGl0aW9uYWxFeHByKGV4cHI6IENvbmRpdGlvbmFsRXhwcik6IFJlY29yZGVkTm9kZTx0cy5QYXJlbnRoZXNpemVkRXhwcmVzc2lvbj4ge1xuICAgIC8vIFRPRE8ge2NodWNran06IFJldmlldyB1c2Ugb2YgISBvbiBmYWxzZUNhc2UuIFNob3VsZCBpdCBiZSBub24tbnVsbGFibGU/XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLFxuICAgICAgICB0cy5jcmVhdGVQYXJlbih0cy5jcmVhdGVDb25kaXRpb25hbChcbiAgICAgICAgICAgIGV4cHIuY29uZGl0aW9uLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSwgZXhwci50cnVlQ2FzZS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCksXG4gICAgICAgICAgICBleHByLmZhbHNlQ2FzZSAhLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSkpKTtcbiAgfVxuXG4gIHZpc2l0Tm90RXhwcihleHByOiBOb3RFeHByKTogUmVjb3JkZWROb2RlPHRzLlByZWZpeFVuYXJ5RXhwcmVzc2lvbj4ge1xuICAgIHJldHVybiB0aGlzLnJlY29yZChcbiAgICAgICAgZXhwciwgdHMuY3JlYXRlUHJlZml4KFxuICAgICAgICAgICAgICAgICAgdHMuU3ludGF4S2luZC5FeGNsYW1hdGlvblRva2VuLCBleHByLmNvbmRpdGlvbi52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpKTtcbiAgfVxuXG4gIHZpc2l0QXNzZXJ0Tm90TnVsbEV4cHIoZXhwcjogQXNzZXJ0Tm90TnVsbCk6IFJlY29yZGVkTm9kZTx0cy5FeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIGV4cHIuY29uZGl0aW9uLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKTtcbiAgfVxuXG4gIHZpc2l0Q2FzdEV4cHIoZXhwcjogQ2FzdEV4cHIpOiBSZWNvcmRlZE5vZGU8dHMuRXhwcmVzc2lvbj4ge1xuICAgIHJldHVybiBleHByLnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKTtcbiAgfVxuXG4gIHZpc2l0RnVuY3Rpb25FeHByKGV4cHI6IEZ1bmN0aW9uRXhwcikge1xuICAgIHJldHVybiB0aGlzLnJlY29yZChcbiAgICAgICAgZXhwciwgdHMuY3JlYXRlRnVuY3Rpb25FeHByZXNzaW9uKFxuICAgICAgICAgICAgICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCwgLyogYXN0cmlza1Rva2VuICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgIC8qIG5hbWUgKi8gZXhwci5uYW1lIHx8IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgIC8qIHR5cGVQYXJhbWV0ZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgIGV4cHIucGFyYW1zLm1hcChcbiAgICAgICAgICAgICAgICAgICAgICBwID0+IHRzLmNyZWF0ZVBhcmFtZXRlcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8qIGRvdERvdERvdFRva2VuICovIHVuZGVmaW5lZCwgcC5uYW1lKSksXG4gICAgICAgICAgICAgICAgICAvKiB0eXBlICovIHVuZGVmaW5lZCwgdGhpcy5fdmlzaXRTdGF0ZW1lbnRzKGV4cHIuc3RhdGVtZW50cykpKTtcbiAgfVxuXG4gIHZpc2l0QmluYXJ5T3BlcmF0b3JFeHByKGV4cHI6IEJpbmFyeU9wZXJhdG9yRXhwcik6XG4gICAgICBSZWNvcmRlZE5vZGU8dHMuQmluYXJ5RXhwcmVzc2lvbnx0cy5QYXJlbnRoZXNpemVkRXhwcmVzc2lvbj4ge1xuICAgIGxldCBiaW5hcnlPcGVyYXRvcjogdHMuQmluYXJ5T3BlcmF0b3I7XG4gICAgc3dpdGNoIChleHByLm9wZXJhdG9yKSB7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLkFuZDpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkFtcGVyc2FuZEFtcGVyc2FuZFRva2VuO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQmluYXJ5T3BlcmF0b3IuQml0d2lzZUFuZDpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkFtcGVyc2FuZFRva2VuO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQmluYXJ5T3BlcmF0b3IuQmlnZ2VyOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuR3JlYXRlclRoYW5Ub2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLkJpZ2dlckVxdWFsczpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkdyZWF0ZXJUaGFuRXF1YWxzVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5EaXZpZGU6XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5TbGFzaFRva2VuO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQmluYXJ5T3BlcmF0b3IuRXF1YWxzOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuRXF1YWxzRXF1YWxzVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5JZGVudGljYWw6XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5FcXVhbHNFcXVhbHNFcXVhbHNUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLkxvd2VyOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuTGVzc1RoYW5Ub2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLkxvd2VyRXF1YWxzOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuTGVzc1RoYW5FcXVhbHNUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLk1pbnVzOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuTWludXNUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLk1vZHVsbzpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLlBlcmNlbnRUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLk11bHRpcGx5OlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuQXN0ZXJpc2tUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLk5vdEVxdWFsczpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uRXF1YWxzVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5Ob3RJZGVudGljYWw6XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5FeGNsYW1hdGlvbkVxdWFsc0VxdWFsc1Rva2VuO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQmluYXJ5T3BlcmF0b3IuT3I6XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5CYXJCYXJUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLlBsdXM6XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5QbHVzVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIG9wZXJhdG9yOiAke2V4cHIub3BlcmF0b3J9YCk7XG4gICAgfVxuICAgIGNvbnN0IGJpbmFyeSA9IHRzLmNyZWF0ZUJpbmFyeShcbiAgICAgICAgZXhwci5saHMudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpLCBiaW5hcnlPcGVyYXRvciwgZXhwci5yaHMudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKTtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoZXhwciwgZXhwci5wYXJlbnMgPyB0cy5jcmVhdGVQYXJlbihiaW5hcnkpIDogYmluYXJ5KTtcbiAgfVxuXG4gIHZpc2l0UmVhZFByb3BFeHByKGV4cHI6IFJlYWRQcm9wRXhwcik6IFJlY29yZGVkTm9kZTx0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIGV4cHIsIHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKGV4cHIucmVjZWl2ZXIudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpLCBleHByLm5hbWUpKTtcbiAgfVxuXG4gIHZpc2l0UmVhZEtleUV4cHIoZXhwcjogUmVhZEtleUV4cHIpOiBSZWNvcmRlZE5vZGU8dHMuRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIGV4cHIsXG4gICAgICAgIHRzLmNyZWF0ZUVsZW1lbnRBY2Nlc3MoXG4gICAgICAgICAgICBleHByLnJlY2VpdmVyLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSwgZXhwci5pbmRleC52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpKTtcbiAgfVxuXG4gIHZpc2l0TGl0ZXJhbEFycmF5RXhwcihleHByOiBMaXRlcmFsQXJyYXlFeHByKTogUmVjb3JkZWROb2RlPHRzLkFycmF5TGl0ZXJhbEV4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIGV4cHIsIHRzLmNyZWF0ZUFycmF5TGl0ZXJhbChleHByLmVudHJpZXMubWFwKGVudHJ5ID0+IGVudHJ5LnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSkpKTtcbiAgfVxuXG4gIHZpc2l0TGl0ZXJhbE1hcEV4cHIoZXhwcjogTGl0ZXJhbE1hcEV4cHIpOiBSZWNvcmRlZE5vZGU8dHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIGV4cHIsIHRzLmNyZWF0ZU9iamVjdExpdGVyYWwoZXhwci5lbnRyaWVzLm1hcChcbiAgICAgICAgICAgICAgICAgIGVudHJ5ID0+IHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudChcbiAgICAgICAgICAgICAgICAgICAgICBlbnRyeS5xdW90ZWQgfHwgIV9WQUxJRF9JREVOVElGSUVSX1JFLnRlc3QoZW50cnkua2V5KSA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRzLmNyZWF0ZUxpdGVyYWwoZW50cnkua2V5KSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGVudHJ5LmtleSxcbiAgICAgICAgICAgICAgICAgICAgICBlbnRyeS52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpKSkpO1xuICB9XG5cbiAgdmlzaXRDb21tYUV4cHIoZXhwcjogQ29tbWFFeHByKTogUmVjb3JkZWROb2RlPHRzLkV4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIGV4cHIsIGV4cHIucGFydHMubWFwKGUgPT4gZS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpXG4gICAgICAgICAgICAgICAgICAucmVkdWNlPHRzLkV4cHJlc3Npb258bnVsbD4oXG4gICAgICAgICAgICAgICAgICAgICAgKGxlZnQsIHJpZ2h0KSA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICBsZWZ0ID8gdHMuY3JlYXRlQmluYXJ5KGxlZnQsIHRzLlN5bnRheEtpbmQuQ29tbWFUb2tlbiwgcmlnaHQpIDogcmlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgbnVsbCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBfdmlzaXRTdGF0ZW1lbnRzKHN0YXRlbWVudHM6IFN0YXRlbWVudFtdKTogdHMuQmxvY2sge1xuICAgIHJldHVybiB0aGlzLl92aXNpdFN0YXRlbWVudHNQcmVmaXgoW10sIHN0YXRlbWVudHMpO1xuICB9XG5cbiAgcHJpdmF0ZSBfdmlzaXRTdGF0ZW1lbnRzUHJlZml4KHByZWZpeDogdHMuU3RhdGVtZW50W10sIHN0YXRlbWVudHM6IFN0YXRlbWVudFtdKSB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZUJsb2NrKFtcbiAgICAgIC4uLnByZWZpeCwgLi4uc3RhdGVtZW50cy5tYXAoc3RtdCA9PiBzdG10LnZpc2l0U3RhdGVtZW50KHRoaXMsIG51bGwpKS5maWx0ZXIoZiA9PiBmICE9IG51bGwpXG4gICAgXSk7XG4gIH1cblxuICBwcml2YXRlIF92aXNpdElkZW50aWZpZXIodmFsdWU6IEV4dGVybmFsUmVmZXJlbmNlKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgLy8gbmFtZSBjYW4gb25seSBiZSBudWxsIGR1cmluZyBKSVQgd2hpY2ggbmV2ZXIgZXhlY3V0ZXMgdGhpcyBjb2RlLlxuICAgIGNvbnN0IG1vZHVsZU5hbWUgPSB2YWx1ZS5tb2R1bGVOYW1lLCBuYW1lID0gdmFsdWUubmFtZSAhO1xuICAgIGxldCBwcmVmaXhJZGVudDogdHMuSWRlbnRpZmllcnxudWxsID0gbnVsbDtcbiAgICBpZiAobW9kdWxlTmFtZSkge1xuICAgICAgbGV0IHByZWZpeCA9IHRoaXMuX2ltcG9ydHNXaXRoUHJlZml4ZXMuZ2V0KG1vZHVsZU5hbWUpO1xuICAgICAgaWYgKHByZWZpeCA9PSBudWxsKSB7XG4gICAgICAgIHByZWZpeCA9IGBpJHt0aGlzLl9pbXBvcnRzV2l0aFByZWZpeGVzLnNpemV9YDtcbiAgICAgICAgdGhpcy5faW1wb3J0c1dpdGhQcmVmaXhlcy5zZXQobW9kdWxlTmFtZSwgcHJlZml4KTtcbiAgICAgIH1cbiAgICAgIHByZWZpeElkZW50ID0gdHMuY3JlYXRlSWRlbnRpZmllcihwcmVmaXgpO1xuICAgIH1cbiAgICBpZiAocHJlZml4SWRlbnQpIHtcbiAgICAgIHJldHVybiB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhwcmVmaXhJZGVudCwgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGlkID0gdHMuY3JlYXRlSWRlbnRpZmllcihuYW1lKTtcbiAgICAgIGlmICh0aGlzLl9leHBvcnRlZFZhcmlhYmxlSWRlbnRpZmllcnMuaGFzKG5hbWUpKSB7XG4gICAgICAgIC8vIEluIG9yZGVyIGZvciB0aGlzIG5ldyBpZGVudGlmaWVyIG5vZGUgdG8gYmUgcHJvcGVybHkgcmV3cml0dGVuIGluIENvbW1vbkpTIG91dHB1dCxcbiAgICAgICAgLy8gaXQgbXVzdCBoYXZlIGl0cyBvcmlnaW5hbCBub2RlIHNldCB0byBhIHBhcnNlZCBpbnN0YW5jZSBvZiB0aGUgc2FtZSBpZGVudGlmaWVyLlxuICAgICAgICB0cy5zZXRPcmlnaW5hbE5vZGUoaWQsIHRoaXMuX2V4cG9ydGVkVmFyaWFibGVJZGVudGlmaWVycy5nZXQobmFtZSkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGlkO1xuICAgIH1cbiAgfVxufVxuXG5cbmZ1bmN0aW9uIGdldE1ldGhvZE5hbWUobWV0aG9kUmVmOiB7bmFtZTogc3RyaW5nIHwgbnVsbDsgYnVpbHRpbjogQnVpbHRpbk1ldGhvZCB8IG51bGx9KTogc3RyaW5nIHtcbiAgaWYgKG1ldGhvZFJlZi5uYW1lKSB7XG4gICAgcmV0dXJuIG1ldGhvZFJlZi5uYW1lO1xuICB9IGVsc2Uge1xuICAgIHN3aXRjaCAobWV0aG9kUmVmLmJ1aWx0aW4pIHtcbiAgICAgIGNhc2UgQnVpbHRpbk1ldGhvZC5CaW5kOlxuICAgICAgICByZXR1cm4gJ2JpbmQnO1xuICAgICAgY2FzZSBCdWlsdGluTWV0aG9kLkNvbmNhdEFycmF5OlxuICAgICAgICByZXR1cm4gJ2NvbmNhdCc7XG4gICAgICBjYXNlIEJ1aWx0aW5NZXRob2QuU3Vic2NyaWJlT2JzZXJ2YWJsZTpcbiAgICAgICAgcmV0dXJuICdzdWJzY3JpYmUnO1xuICAgIH1cbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoJ1VuZXhwZWN0ZWQgbWV0aG9kIHJlZmVyZW5jZSBmb3JtJyk7XG59XG5cbmZ1bmN0aW9uIG1vZGlmaWVyRnJvbU1vZGlmaWVyKG1vZGlmaWVyOiBTdG10TW9kaWZpZXIpOiB0cy5Nb2RpZmllciB7XG4gIHN3aXRjaCAobW9kaWZpZXIpIHtcbiAgICBjYXNlIFN0bXRNb2RpZmllci5FeHBvcnRlZDpcbiAgICAgIHJldHVybiB0cy5jcmVhdGVUb2tlbih0cy5TeW50YXhLaW5kLkV4cG9ydEtleXdvcmQpO1xuICAgIGNhc2UgU3RtdE1vZGlmaWVyLkZpbmFsOlxuICAgICAgcmV0dXJuIHRzLmNyZWF0ZVRva2VuKHRzLlN5bnRheEtpbmQuQ29uc3RLZXl3b3JkKTtcbiAgICBjYXNlIFN0bXRNb2RpZmllci5Qcml2YXRlOlxuICAgICAgcmV0dXJuIHRzLmNyZWF0ZVRva2VuKHRzLlN5bnRheEtpbmQuUHJpdmF0ZUtleXdvcmQpO1xuICAgIGNhc2UgU3RtdE1vZGlmaWVyLlN0YXRpYzpcbiAgICAgIHJldHVybiB0cy5jcmVhdGVUb2tlbih0cy5TeW50YXhLaW5kLlN0YXRpY0tleXdvcmQpO1xuICB9XG4gIHJldHVybiBlcnJvcihgdW5rbm93biBzdGF0ZW1lbnQgbW9kaWZpZXJgKTtcbn1cblxuZnVuY3Rpb24gdHJhbnNsYXRlTW9kaWZpZXJzKG1vZGlmaWVyczogU3RtdE1vZGlmaWVyW10gfCBudWxsKTogdHMuTW9kaWZpZXJbXXx1bmRlZmluZWQge1xuICByZXR1cm4gbW9kaWZpZXJzID09IG51bGwgPyB1bmRlZmluZWQgOiBtb2RpZmllcnMgIS5tYXAobW9kaWZpZXJGcm9tTW9kaWZpZXIpO1xufVxuIl19