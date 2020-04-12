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
        function TypeScriptNodeEmitter(annotateForClosureCompiler) {
            this.annotateForClosureCompiler = annotateForClosureCompiler;
        }
        TypeScriptNodeEmitter.prototype.updateSourceFile = function (sourceFile, stmts, preamble) {
            var converter = new NodeEmitterVisitor(this.annotateForClosureCompiler);
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
    function updateSourceFile(sourceFile, module, annotateForClosureCompiler) {
        var converter = new NodeEmitterVisitor(annotateForClosureCompiler);
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
        classNames.size == 0 || util_1.error((classNames.size == 1 ? 'Class' : 'Classes') + " \"" + Array.from(classNames.keys()).join(', ') + "\" not generated");
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
        function NodeEmitterVisitor(annotateForClosureCompiler) {
            this.annotateForClosureCompiler = annotateForClosureCompiler;
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
                /* importClause */
                ts.createImportClause(
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
            var fields = stmt.fields.map(function (field) {
                var property = ts.createProperty(
                /* decorators */ undefined, /* modifiers */ translateModifiers(field.modifiers), field.name, 
                /* questionToken */ undefined, 
                /* type */ undefined, field.initializer == null ? ts.createNull() :
                    field.initializer.visitExpression(_this, null));
                if (_this.annotateForClosureCompiler) {
                    // Closure compiler transforms the form `Service.ɵprov = X` into `Service$ɵprov = X`. To
                    // prevent this transformation, such assignments need to be annotated with @nocollapse.
                    // Note that tsickle is typically responsible for adding such annotations, however it
                    // doesn't yet handle synthetic fields added during other transformations.
                    ts.addSyntheticLeadingComment(property, ts.SyntaxKind.MultiLineCommentTrivia, '* @nocollapse ', 
                    /* hasTrailingNewLine */ false);
                }
                return property;
            });
            var getters = stmt.getters.map(function (getter) { return ts.createGetAccessor(
            /* decorators */ undefined, /* modifiers */ undefined, getter.name, /* parameters */ [], 
            /* type */ undefined, _this._visitStatements(getter.body)); });
            var constructor = (stmt.constructorMethod && [ts.createConstructor(
                /* decorators */ undefined, 
                /* modifiers */ undefined, 
                /* parameters */
                stmt.constructorMethod.params.map(function (p) { return ts.createParameter(
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
        NodeEmitterVisitor.prototype.visitTypeofExpr = function (expr) {
            var typeOf = ts.createTypeOf(expr.expr.visitExpression(this, null));
            return this.record(expr, typeOf);
        };
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
        NodeEmitterVisitor.prototype.visitLocalizedString = function (expr, context) {
            throw new Error('localized strings are not supported in pre-ivy mode.');
        };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZV9lbWl0dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy90cmFuc2Zvcm1lcnMvbm9kZV9lbWl0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUF3cUI7SUFFeHFCLCtCQUFpQztJQUVqQyxvRUFBNkI7SUFJN0IsSUFBTSxnQkFBZ0IsR0FBRyxNQUFNLENBQUM7SUFDaEMsSUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUM7SUFDakMsSUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUM7SUFDakMsSUFBTSxvQkFBb0IsR0FBRyx1QkFBdUIsQ0FBQztJQUVyRDtRQUNFLCtCQUFvQiwwQkFBbUM7WUFBbkMsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUFTO1FBQUcsQ0FBQztRQUUzRCxnREFBZ0IsR0FBaEIsVUFBaUIsVUFBeUIsRUFBRSxLQUFrQixFQUFFLFFBQWlCO1lBRS9FLElBQU0sU0FBUyxHQUFHLElBQUksa0JBQWtCLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUM7WUFDMUUsMkZBQTJGO1lBQzNGLFNBQVM7WUFDVCxJQUFNLFVBQVUsR0FBVSxFQUFFLENBQUMsTUFBTSxPQUFULEVBQUUsbUJBQ3JCLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsRUFBcEMsQ0FBb0MsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLElBQUksSUFBSSxJQUFJLEVBQVosQ0FBWSxDQUFDLEVBQUMsQ0FBQztZQUM3RixJQUFNLGFBQWEsR0FBbUIsRUFBRSxDQUFDO1lBQ3pDLElBQUksUUFBUSxFQUFFO2dCQUNaLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxVQUFV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LENBQUM7WUFDdEQsS0FBSyx1QkFBWSxDQUFDLE1BQU07Z0JBQ3RCLE9BQU8sRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1NBQ3REO1FBQ0QsT0FBTyxZQUFLLENBQUMsNEJBQTRCLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRUQsU0FBUyxrQkFBa0IsQ0FBQyxTQUFnQztRQUMxRCxPQUFPLFNBQVMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQy9FLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QXNzZXJ0Tm90TnVsbCwgQmluYXJ5T3BlcmF0b3IsIEJpbmFyeU9wZXJhdG9yRXhwciwgQnVpbHRpbk1ldGhvZCwgQnVpbHRpblZhciwgQ2FzdEV4cHIsIENsYXNzU3RtdCwgQ29tbWFFeHByLCBDb21tZW50U3RtdCwgQ29uZGl0aW9uYWxFeHByLCBEZWNsYXJlRnVuY3Rpb25TdG10LCBEZWNsYXJlVmFyU3RtdCwgRXhwcmVzc2lvblN0YXRlbWVudCwgRXhwcmVzc2lvblZpc2l0b3IsIEV4dGVybmFsRXhwciwgRXh0ZXJuYWxSZWZlcmVuY2UsIEZ1bmN0aW9uRXhwciwgSWZTdG10LCBJbnN0YW50aWF0ZUV4cHIsIEludm9rZUZ1bmN0aW9uRXhwciwgSW52b2tlTWV0aG9kRXhwciwgSlNEb2NDb21tZW50U3RtdCwgTGl0ZXJhbEFycmF5RXhwciwgTGl0ZXJhbEV4cHIsIExpdGVyYWxNYXBFeHByLCBOb3RFeHByLCBQYXJzZVNvdXJjZUZpbGUsIFBhcnNlU291cmNlU3BhbiwgUGFydGlhbE1vZHVsZSwgUmVhZEtleUV4cHIsIFJlYWRQcm9wRXhwciwgUmVhZFZhckV4cHIsIFJldHVyblN0YXRlbWVudCwgU3RhdGVtZW50LCBTdGF0ZW1lbnRWaXNpdG9yLCBTdG10TW9kaWZpZXIsIFRocm93U3RtdCwgVHJ5Q2F0Y2hTdG10LCBUeXBlb2ZFeHByLCBXcmFwcGVkTm9kZUV4cHIsIFdyaXRlS2V5RXhwciwgV3JpdGVQcm9wRXhwciwgV3JpdGVWYXJFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge0xvY2FsaXplZFN0cmluZ30gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL291dHB1dC9vdXRwdXRfYXN0JztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2Vycm9yfSBmcm9tICcuL3V0aWwnO1xuXG5leHBvcnQgaW50ZXJmYWNlIE5vZGUgeyBzb3VyY2VTcGFuOiBQYXJzZVNvdXJjZVNwYW58bnVsbDsgfVxuXG5jb25zdCBNRVRIT0RfVEhJU19OQU1FID0gJ3RoaXMnO1xuY29uc3QgQ0FUQ0hfRVJST1JfTkFNRSA9ICdlcnJvcic7XG5jb25zdCBDQVRDSF9TVEFDS19OQU1FID0gJ3N0YWNrJztcbmNvbnN0IF9WQUxJRF9JREVOVElGSUVSX1JFID0gL15bJEEtWl9dWzAtOUEtWl8kXSokL2k7XG5cbmV4cG9ydCBjbGFzcyBUeXBlU2NyaXB0Tm9kZUVtaXR0ZXIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyOiBib29sZWFuKSB7fVxuXG4gIHVwZGF0ZVNvdXJjZUZpbGUoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgc3RtdHM6IFN0YXRlbWVudFtdLCBwcmVhbWJsZT86IHN0cmluZyk6XG4gICAgICBbdHMuU291cmNlRmlsZSwgTWFwPHRzLk5vZGUsIE5vZGU+XSB7XG4gICAgY29uc3QgY29udmVydGVyID0gbmV3IE5vZGVFbWl0dGVyVmlzaXRvcih0aGlzLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyKTtcbiAgICAvLyBbXS5jb25jYXQgZmxhdHRlbnMgdGhlIHJlc3VsdCBzbyB0aGF0IGVhY2ggYHZpc2l0Li4uYCBtZXRob2QgY2FuIGFsc28gcmV0dXJuIGFuIGFycmF5IG9mXG4gICAgLy8gc3RtdHMuXG4gICAgY29uc3Qgc3RhdGVtZW50czogYW55W10gPSBbXS5jb25jYXQoXG4gICAgICAgIC4uLnN0bXRzLm1hcChzdG10ID0+IHN0bXQudmlzaXRTdGF0ZW1lbnQoY29udmVydGVyLCBudWxsKSkuZmlsdGVyKHN0bXQgPT4gc3RtdCAhPSBudWxsKSk7XG4gICAgY29uc3QgcHJlYW1ibGVTdG10czogdHMuU3RhdGVtZW50W10gPSBbXTtcbiAgICBpZiAocHJlYW1ibGUpIHtcbiAgICAgIGNvbnN0IGNvbW1lbnRTdG10ID0gdGhpcy5jcmVhdGVDb21tZW50U3RhdGVtZW50KHNvdXJjZUZpbGUsIHByZWFtYmxlKTtcbiAgICAgIHByZWFtYmxlU3RtdHMucHVzaChjb21tZW50U3RtdCk7XG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZVN0YXRlbWVudHMgPVxuICAgICAgICBbLi4ucHJlYW1ibGVTdG10cywgLi4uY29udmVydGVyLmdldFJlZXhwb3J0cygpLCAuLi5jb252ZXJ0ZXIuZ2V0SW1wb3J0cygpLCAuLi5zdGF0ZW1lbnRzXTtcbiAgICBjb252ZXJ0ZXIudXBkYXRlU291cmNlTWFwKHNvdXJjZVN0YXRlbWVudHMpO1xuICAgIGNvbnN0IG5ld1NvdXJjZUZpbGUgPSB0cy51cGRhdGVTb3VyY2VGaWxlTm9kZShzb3VyY2VGaWxlLCBzb3VyY2VTdGF0ZW1lbnRzKTtcbiAgICByZXR1cm4gW25ld1NvdXJjZUZpbGUsIGNvbnZlcnRlci5nZXROb2RlTWFwKCldO1xuICB9XG5cbiAgLyoqIENyZWF0ZXMgYSBub3QgZW1pdHRlZCBzdGF0ZW1lbnQgY29udGFpbmluZyB0aGUgZ2l2ZW4gY29tbWVudC4gKi9cbiAgY3JlYXRlQ29tbWVudFN0YXRlbWVudChzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBjb21tZW50OiBzdHJpbmcpOiB0cy5TdGF0ZW1lbnQge1xuICAgIGlmIChjb21tZW50LnN0YXJ0c1dpdGgoJy8qJykgJiYgY29tbWVudC5lbmRzV2l0aCgnKi8nKSkge1xuICAgICAgY29tbWVudCA9IGNvbW1lbnQuc3Vic3RyKDIsIGNvbW1lbnQubGVuZ3RoIC0gNCk7XG4gICAgfVxuICAgIGNvbnN0IGNvbW1lbnRTdG10ID0gdHMuY3JlYXRlTm90RW1pdHRlZFN0YXRlbWVudChzb3VyY2VGaWxlKTtcbiAgICB0cy5zZXRTeW50aGV0aWNMZWFkaW5nQ29tbWVudHMoXG4gICAgICAgIGNvbW1lbnRTdG10LFxuICAgICAgICBbe2tpbmQ6IHRzLlN5bnRheEtpbmQuTXVsdGlMaW5lQ29tbWVudFRyaXZpYSwgdGV4dDogY29tbWVudCwgcG9zOiAtMSwgZW5kOiAtMX1dKTtcbiAgICB0cy5zZXRFbWl0RmxhZ3MoY29tbWVudFN0bXQsIHRzLkVtaXRGbGFncy5DdXN0b21Qcm9sb2d1ZSk7XG4gICAgcmV0dXJuIGNvbW1lbnRTdG10O1xuICB9XG59XG5cbi8qKlxuICogVXBkYXRlIHRoZSBnaXZlbiBzb3VyY2UgZmlsZSB0byBpbmNsdWRlIHRoZSBjaGFuZ2VzIHNwZWNpZmllZCBpbiBtb2R1bGUuXG4gKlxuICogVGhlIG1vZHVsZSBwYXJhbWV0ZXIgaXMgdHJlYXRlZCBhcyBhIHBhcnRpYWwgbW9kdWxlIG1lYW5pbmcgdGhhdCB0aGUgc3RhdGVtZW50cyBhcmUgYWRkZWQgdG9cbiAqIHRoZSBtb2R1bGUgaW5zdGVhZCBvZiByZXBsYWNpbmcgdGhlIG1vZHVsZS4gQWxzbywgYW55IGNsYXNzZXMgYXJlIHRyZWF0ZWQgYXMgcGFydGlhbCBjbGFzc2VzXG4gKiBhbmQgdGhlIGluY2x1ZGVkIG1lbWJlcnMgYXJlIGFkZGVkIHRvIHRoZSBjbGFzcyB3aXRoIHRoZSBzYW1lIG5hbWUgaW5zdGVhZCBvZiBhIG5ldyBjbGFzc1xuICogYmVpbmcgY3JlYXRlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZVNvdXJjZUZpbGUoXG4gICAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgbW9kdWxlOiBQYXJ0aWFsTW9kdWxlLFxuICAgIGFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyOiBib29sZWFuKTogW3RzLlNvdXJjZUZpbGUsIE1hcDx0cy5Ob2RlLCBOb2RlPl0ge1xuICBjb25zdCBjb252ZXJ0ZXIgPSBuZXcgTm9kZUVtaXR0ZXJWaXNpdG9yKGFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyKTtcbiAgY29udmVydGVyLmxvYWRFeHBvcnRlZFZhcmlhYmxlSWRlbnRpZmllcnMoc291cmNlRmlsZSk7XG5cbiAgY29uc3QgcHJlZml4U3RhdGVtZW50cyA9IG1vZHVsZS5zdGF0ZW1lbnRzLmZpbHRlcihzdGF0ZW1lbnQgPT4gIShzdGF0ZW1lbnQgaW5zdGFuY2VvZiBDbGFzc1N0bXQpKTtcbiAgY29uc3QgY2xhc3NlcyA9XG4gICAgICBtb2R1bGUuc3RhdGVtZW50cy5maWx0ZXIoc3RhdGVtZW50ID0+IHN0YXRlbWVudCBpbnN0YW5jZW9mIENsYXNzU3RtdCkgYXMgQ2xhc3NTdG10W107XG4gIGNvbnN0IGNsYXNzTWFwID0gbmV3IE1hcChcbiAgICAgIGNsYXNzZXMubWFwPFtzdHJpbmcsIENsYXNzU3RtdF0+KGNsYXNzU3RhdGVtZW50ID0+IFtjbGFzc1N0YXRlbWVudC5uYW1lLCBjbGFzc1N0YXRlbWVudF0pKTtcbiAgY29uc3QgY2xhc3NOYW1lcyA9IG5ldyBTZXQoY2xhc3Nlcy5tYXAoY2xhc3NTdGF0ZW1lbnQgPT4gY2xhc3NTdGF0ZW1lbnQubmFtZSkpO1xuXG4gIGNvbnN0IHByZWZpeDogdHMuU3RhdGVtZW50W10gPVxuICAgICAgcHJlZml4U3RhdGVtZW50cy5tYXAoc3RhdGVtZW50ID0+IHN0YXRlbWVudC52aXNpdFN0YXRlbWVudChjb252ZXJ0ZXIsIHNvdXJjZUZpbGUpKTtcblxuICAvLyBBZGQgc3RhdGljIG1ldGhvZHMgdG8gYWxsIHRoZSBjbGFzc2VzIHJlZmVyZW5jZWQgaW4gbW9kdWxlLlxuICBsZXQgbmV3U3RhdGVtZW50cyA9IHNvdXJjZUZpbGUuc3RhdGVtZW50cy5tYXAobm9kZSA9PiB7XG4gICAgaWYgKG5vZGUua2luZCA9PSB0cy5TeW50YXhLaW5kLkNsYXNzRGVjbGFyYXRpb24pIHtcbiAgICAgIGNvbnN0IGNsYXNzRGVjbGFyYXRpb24gPSBub2RlIGFzIHRzLkNsYXNzRGVjbGFyYXRpb247XG4gICAgICBjb25zdCBuYW1lID0gY2xhc3NEZWNsYXJhdGlvbi5uYW1lO1xuICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgY29uc3QgY2xhc3NTdGF0ZW1lbnQgPSBjbGFzc01hcC5nZXQobmFtZS50ZXh0KTtcbiAgICAgICAgaWYgKGNsYXNzU3RhdGVtZW50KSB7XG4gICAgICAgICAgY2xhc3NOYW1lcy5kZWxldGUobmFtZS50ZXh0KTtcbiAgICAgICAgICBjb25zdCBjbGFzc01lbWJlckhvbGRlciA9XG4gICAgICAgICAgICAgIGNvbnZlcnRlci52aXNpdERlY2xhcmVDbGFzc1N0bXQoY2xhc3NTdGF0ZW1lbnQpIGFzIHRzLkNsYXNzRGVjbGFyYXRpb247XG4gICAgICAgICAgY29uc3QgbmV3TWV0aG9kcyA9XG4gICAgICAgICAgICAgIGNsYXNzTWVtYmVySG9sZGVyLm1lbWJlcnMuZmlsdGVyKG1lbWJlciA9PiBtZW1iZXIua2luZCAhPT0gdHMuU3ludGF4S2luZC5Db25zdHJ1Y3Rvcik7XG4gICAgICAgICAgY29uc3QgbmV3TWVtYmVycyA9IFsuLi5jbGFzc0RlY2xhcmF0aW9uLm1lbWJlcnMsIC4uLm5ld01ldGhvZHNdO1xuXG4gICAgICAgICAgcmV0dXJuIHRzLnVwZGF0ZUNsYXNzRGVjbGFyYXRpb24oXG4gICAgICAgICAgICAgIGNsYXNzRGVjbGFyYXRpb24sXG4gICAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gY2xhc3NEZWNsYXJhdGlvbi5kZWNvcmF0b3JzLFxuICAgICAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gY2xhc3NEZWNsYXJhdGlvbi5tb2RpZmllcnMsXG4gICAgICAgICAgICAgIC8qIG5hbWUgKi8gY2xhc3NEZWNsYXJhdGlvbi5uYW1lLFxuICAgICAgICAgICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyBjbGFzc0RlY2xhcmF0aW9uLnR5cGVQYXJhbWV0ZXJzLFxuICAgICAgICAgICAgICAvKiBoZXJpdGFnZUNsYXVzZXMgKi8gY2xhc3NEZWNsYXJhdGlvbi5oZXJpdGFnZUNsYXVzZXMgfHwgW10sXG4gICAgICAgICAgICAgIC8qIG1lbWJlcnMgKi8gbmV3TWVtYmVycyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5vZGU7XG4gIH0pO1xuXG4gIC8vIFZhbGlkYXRlIHRoYXQgYWxsIHRoZSBjbGFzc2VzIGhhdmUgYmVlbiBnZW5lcmF0ZWRcbiAgY2xhc3NOYW1lcy5zaXplID09IDAgfHwgZXJyb3IoYCR7Y2xhc3NOYW1lcy5zaXplID09IDEgPyAnQ2xhc3MnIDogJ0NsYXNzZXMnfSBcIiR7XG4gICAgICAgICAgQXJyYXkuZnJvbShjbGFzc05hbWVzLmtleXMoKSkuam9pbignLCAnKX1cIiBub3QgZ2VuZXJhdGVkYCk7XG5cbiAgLy8gQWRkIGltcG9ydHMgdG8gdGhlIG1vZHVsZSByZXF1aXJlZCBieSB0aGUgbmV3IG1ldGhvZHNcbiAgY29uc3QgaW1wb3J0cyA9IGNvbnZlcnRlci5nZXRJbXBvcnRzKCk7XG4gIGlmIChpbXBvcnRzICYmIGltcG9ydHMubGVuZ3RoKSB7XG4gICAgLy8gRmluZCB3aGVyZSB0aGUgbmV3IGltcG9ydHMgc2hvdWxkIGdvXG4gICAgY29uc3QgaW5kZXggPSBmaXJzdEFmdGVyKFxuICAgICAgICBuZXdTdGF0ZW1lbnRzLCBzdGF0ZW1lbnQgPT4gc3RhdGVtZW50LmtpbmQgPT09IHRzLlN5bnRheEtpbmQuSW1wb3J0RGVjbGFyYXRpb24gfHxcbiAgICAgICAgICAgIHN0YXRlbWVudC5raW5kID09PSB0cy5TeW50YXhLaW5kLkltcG9ydEVxdWFsc0RlY2xhcmF0aW9uKTtcbiAgICBuZXdTdGF0ZW1lbnRzID1cbiAgICAgICAgWy4uLm5ld1N0YXRlbWVudHMuc2xpY2UoMCwgaW5kZXgpLCAuLi5pbXBvcnRzLCAuLi5wcmVmaXgsIC4uLm5ld1N0YXRlbWVudHMuc2xpY2UoaW5kZXgpXTtcbiAgfSBlbHNlIHtcbiAgICBuZXdTdGF0ZW1lbnRzID0gWy4uLnByZWZpeCwgLi4ubmV3U3RhdGVtZW50c107XG4gIH1cblxuICBjb252ZXJ0ZXIudXBkYXRlU291cmNlTWFwKG5ld1N0YXRlbWVudHMpO1xuICBjb25zdCBuZXdTb3VyY2VGaWxlID0gdHMudXBkYXRlU291cmNlRmlsZU5vZGUoc291cmNlRmlsZSwgbmV3U3RhdGVtZW50cyk7XG5cbiAgcmV0dXJuIFtuZXdTb3VyY2VGaWxlLCBjb252ZXJ0ZXIuZ2V0Tm9kZU1hcCgpXTtcbn1cblxuLy8gUmV0dXJuIHRoZSBpbmRleCBhZnRlciB0aGUgZmlyc3QgdmFsdWUgaW4gYGFgIHRoYXQgZG9lc24ndCBtYXRjaCB0aGUgcHJlZGljYXRlIGFmdGVyIGEgdmFsdWUgdGhhdFxuLy8gZG9lcyBvciAwIGlmIG5vIHZhbHVlcyBtYXRjaC5cbmZ1bmN0aW9uIGZpcnN0QWZ0ZXI8VD4oYTogVFtdLCBwcmVkaWNhdGU6ICh2YWx1ZTogVCkgPT4gYm9vbGVhbikge1xuICBsZXQgaW5kZXggPSAwO1xuICBjb25zdCBsZW4gPSBhLmxlbmd0aDtcbiAgZm9yICg7IGluZGV4IDwgbGVuOyBpbmRleCsrKSB7XG4gICAgY29uc3QgdmFsdWUgPSBhW2luZGV4XTtcbiAgICBpZiAocHJlZGljYXRlKHZhbHVlKSkgYnJlYWs7XG4gIH1cbiAgaWYgKGluZGV4ID49IGxlbikgcmV0dXJuIDA7XG4gIGZvciAoOyBpbmRleCA8IGxlbjsgaW5kZXgrKykge1xuICAgIGNvbnN0IHZhbHVlID0gYVtpbmRleF07XG4gICAgaWYgKCFwcmVkaWNhdGUodmFsdWUpKSBicmVhaztcbiAgfVxuICByZXR1cm4gaW5kZXg7XG59XG5cbi8vIEEgcmVjb3JkZWQgbm9kZSBpcyBhIHN1YnR5cGUgb2YgdGhlIG5vZGUgdGhhdCBpcyBtYXJrZWQgYXMgYmVpbmcgcmVjb3JkZWQuIFRoaXMgaXMgdXNlZFxuLy8gdG8gZW5zdXJlIHRoYXQgTm9kZUVtaXR0ZXJWaXNpdG9yLnJlY29yZCBoYXMgYmVlbiBjYWxsZWQgb24gYWxsIG5vZGVzIHJldHVybmVkIGJ5IHRoZVxuLy8gTm9kZUVtaXR0ZXJWaXNpdG9yXG5leHBvcnQgdHlwZSBSZWNvcmRlZE5vZGU8VCBleHRlbmRzIHRzLk5vZGUgPSB0cy5Ob2RlPiA9IChUICYgeyBfX3JlY29yZGVkOiBhbnk7fSkgfCBudWxsO1xuXG5mdW5jdGlvbiBlc2NhcGVMaXRlcmFsKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdmFsdWUucmVwbGFjZSgvKFxcXCJ8XFxcXCkvZywgJ1xcXFwkMScpLnJlcGxhY2UoLyhcXG4pfChcXHIpL2csIGZ1bmN0aW9uKHYsIG4sIHIpIHtcbiAgICByZXR1cm4gbiA/ICdcXFxcbicgOiAnXFxcXHInO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlTGl0ZXJhbCh2YWx1ZTogYW55KSB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgIHJldHVybiB0cy5jcmVhdGVOdWxsKCk7XG4gIH0gZWxzZSBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB0cy5jcmVhdGVJZGVudGlmaWVyKCd1bmRlZmluZWQnKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCByZXN1bHQgPSB0cy5jcmVhdGVMaXRlcmFsKHZhbHVlKTtcbiAgICBpZiAodHMuaXNTdHJpbmdMaXRlcmFsKHJlc3VsdCkgJiYgcmVzdWx0LnRleHQuaW5kZXhPZignXFxcXCcpID49IDApIHtcbiAgICAgIC8vIEhhY2sgdG8gYXZvaWQgcHJvYmxlbXMgY2F1c2UgaW5kaXJlY3RseSBieTpcbiAgICAgIC8vICAgIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMjAxOTJcbiAgICAgIC8vIFRoaXMgYXZvaWRzIHRoZSBzdHJpbmcgZXNjYXBpbmcgbm9ybWFsbHkgcGVyZm9ybWVkIGZvciBhIHN0cmluZyByZWx5aW5nIG9uIHRoYXRcbiAgICAgIC8vIFR5cGVTY3JpcHQganVzdCBlbWl0cyB0aGUgdGV4dCByYXcgZm9yIGEgbnVtZXJpYyBsaXRlcmFsLlxuICAgICAgKHJlc3VsdCBhcyBhbnkpLmtpbmQgPSB0cy5TeW50YXhLaW5kLk51bWVyaWNMaXRlcmFsO1xuICAgICAgcmVzdWx0LnRleHQgPSBgXCIke2VzY2FwZUxpdGVyYWwocmVzdWx0LnRleHQpfVwiYDtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0V4cG9ydFR5cGVTdGF0ZW1lbnQoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQpOiBib29sZWFuIHtcbiAgcmV0dXJuICEhc3RhdGVtZW50Lm1vZGlmaWVycyAmJlxuICAgICAgc3RhdGVtZW50Lm1vZGlmaWVycy5zb21lKG1vZCA9PiBtb2Qua2luZCA9PT0gdHMuU3ludGF4S2luZC5FeHBvcnRLZXl3b3JkKTtcbn1cblxuLyoqXG4gKiBWaXNpdHMgYW4gb3V0cHV0IGFzdCBhbmQgcHJvZHVjZXMgdGhlIGNvcnJlc3BvbmRpbmcgVHlwZVNjcmlwdCBzeW50aGV0aWMgbm9kZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBOb2RlRW1pdHRlclZpc2l0b3IgaW1wbGVtZW50cyBTdGF0ZW1lbnRWaXNpdG9yLCBFeHByZXNzaW9uVmlzaXRvciB7XG4gIHByaXZhdGUgX25vZGVNYXAgPSBuZXcgTWFwPHRzLk5vZGUsIE5vZGU+KCk7XG4gIHByaXZhdGUgX2ltcG9ydHNXaXRoUHJlZml4ZXMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBwcml2YXRlIF9yZWV4cG9ydHMgPSBuZXcgTWFwPHN0cmluZywge25hbWU6IHN0cmluZywgYXM6IHN0cmluZ31bXT4oKTtcbiAgcHJpdmF0ZSBfdGVtcGxhdGVTb3VyY2VzID0gbmV3IE1hcDxQYXJzZVNvdXJjZUZpbGUsIHRzLlNvdXJjZU1hcFNvdXJjZT4oKTtcbiAgcHJpdmF0ZSBfZXhwb3J0ZWRWYXJpYWJsZUlkZW50aWZpZXJzID0gbmV3IE1hcDxzdHJpbmcsIHRzLklkZW50aWZpZXI+KCk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcjogYm9vbGVhbikge31cblxuICAvKipcbiAgICogUHJvY2VzcyB0aGUgc291cmNlIGZpbGUgYW5kIGNvbGxlY3QgZXhwb3J0ZWQgaWRlbnRpZmllcnMgdGhhdCByZWZlciB0byB2YXJpYWJsZXMuXG4gICAqXG4gICAqIE9ubHkgdmFyaWFibGVzIGFyZSBjb2xsZWN0ZWQgYmVjYXVzZSBleHBvcnRlZCBjbGFzc2VzIHN0aWxsIGV4aXN0IGluIHRoZSBtb2R1bGUgc2NvcGUgaW5cbiAgICogQ29tbW9uSlMsIHdoZXJlYXMgdmFyaWFibGVzIGhhdmUgdGhlaXIgZGVjbGFyYXRpb25zIG1vdmVkIG9udG8gdGhlIGBleHBvcnRzYCBvYmplY3QsIGFuZCBhbGxcbiAgICogcmVmZXJlbmNlcyBhcmUgdXBkYXRlZCBhY2NvcmRpbmdseS5cbiAgICovXG4gIGxvYWRFeHBvcnRlZFZhcmlhYmxlSWRlbnRpZmllcnMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIHNvdXJjZUZpbGUuc3RhdGVtZW50cy5mb3JFYWNoKHN0YXRlbWVudCA9PiB7XG4gICAgICBpZiAodHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdGF0ZW1lbnQpICYmIGlzRXhwb3J0VHlwZVN0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgICAgIHN0YXRlbWVudC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zLmZvckVhY2goZGVjbGFyYXRpb24gPT4ge1xuICAgICAgICAgIGlmICh0cy5pc0lkZW50aWZpZXIoZGVjbGFyYXRpb24ubmFtZSkpIHtcbiAgICAgICAgICAgIHRoaXMuX2V4cG9ydGVkVmFyaWFibGVJZGVudGlmaWVycy5zZXQoZGVjbGFyYXRpb24ubmFtZS50ZXh0LCBkZWNsYXJhdGlvbi5uYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgZ2V0UmVleHBvcnRzKCk6IHRzLlN0YXRlbWVudFtdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLl9yZWV4cG9ydHMuZW50cmllcygpKVxuICAgICAgICAubWFwKFxuICAgICAgICAgICAgKFtleHBvcnRlZEZpbGVQYXRoLCByZWV4cG9ydHNdKSA9PiB0cy5jcmVhdGVFeHBvcnREZWNsYXJhdGlvbihcbiAgICAgICAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLCB0cy5jcmVhdGVOYW1lZEV4cG9ydHMocmVleHBvcnRzLm1hcChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHtuYW1lLCBhc30pID0+IHRzLmNyZWF0ZUV4cG9ydFNwZWNpZmllcihuYW1lLCBhcykpKSxcbiAgICAgICAgICAgICAgICAvKiBtb2R1bGVTcGVjaWZpZXIgKi8gY3JlYXRlTGl0ZXJhbChleHBvcnRlZEZpbGVQYXRoKSkpO1xuICB9XG5cbiAgZ2V0SW1wb3J0cygpOiB0cy5TdGF0ZW1lbnRbXSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5faW1wb3J0c1dpdGhQcmVmaXhlcy5lbnRyaWVzKCkpXG4gICAgICAgIC5tYXAoXG4gICAgICAgICAgICAoW25hbWVzcGFjZSwgcHJlZml4XSkgPT4gdHMuY3JlYXRlSW1wb3J0RGVjbGFyYXRpb24oXG4gICAgICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAvKiBpbXBvcnRDbGF1c2UgKi9cbiAgICAgICAgICAgICAgICB0cy5jcmVhdGVJbXBvcnRDbGF1c2UoXG4gICAgICAgICAgICAgICAgICAgIC8qIG5hbWUgKi88dHMuSWRlbnRpZmllcj4odW5kZWZpbmVkIGFzIGFueSksXG4gICAgICAgICAgICAgICAgICAgIHRzLmNyZWF0ZU5hbWVzcGFjZUltcG9ydCh0cy5jcmVhdGVJZGVudGlmaWVyKHByZWZpeCkpKSxcbiAgICAgICAgICAgICAgICAvKiBtb2R1bGVTcGVjaWZpZXIgKi8gY3JlYXRlTGl0ZXJhbChuYW1lc3BhY2UpKSk7XG4gIH1cblxuICBnZXROb2RlTWFwKCkgeyByZXR1cm4gdGhpcy5fbm9kZU1hcDsgfVxuXG4gIHVwZGF0ZVNvdXJjZU1hcChzdGF0ZW1lbnRzOiB0cy5TdGF0ZW1lbnRbXSkge1xuICAgIGxldCBsYXN0UmFuZ2VTdGFydE5vZGU6IHRzLk5vZGV8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGxldCBsYXN0UmFuZ2VFbmROb2RlOiB0cy5Ob2RlfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBsZXQgbGFzdFJhbmdlOiB0cy5Tb3VyY2VNYXBSYW5nZXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgICBjb25zdCByZWNvcmRMYXN0U291cmNlUmFuZ2UgPSAoKSA9PiB7XG4gICAgICBpZiAobGFzdFJhbmdlICYmIGxhc3RSYW5nZVN0YXJ0Tm9kZSAmJiBsYXN0UmFuZ2VFbmROb2RlKSB7XG4gICAgICAgIGlmIChsYXN0UmFuZ2VTdGFydE5vZGUgPT0gbGFzdFJhbmdlRW5kTm9kZSkge1xuICAgICAgICAgIHRzLnNldFNvdXJjZU1hcFJhbmdlKGxhc3RSYW5nZUVuZE5vZGUsIGxhc3RSYW5nZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdHMuc2V0U291cmNlTWFwUmFuZ2UobGFzdFJhbmdlU3RhcnROb2RlLCBsYXN0UmFuZ2UpO1xuICAgICAgICAgIC8vIE9ubHkgZW1pdCB0aGUgcG9zIGZvciB0aGUgZmlyc3Qgbm9kZSBlbWl0dGVkIGluIHRoZSByYW5nZS5cbiAgICAgICAgICB0cy5zZXRFbWl0RmxhZ3MobGFzdFJhbmdlU3RhcnROb2RlLCB0cy5FbWl0RmxhZ3MuTm9UcmFpbGluZ1NvdXJjZU1hcCk7XG4gICAgICAgICAgdHMuc2V0U291cmNlTWFwUmFuZ2UobGFzdFJhbmdlRW5kTm9kZSwgbGFzdFJhbmdlKTtcbiAgICAgICAgICAvLyBPbmx5IGVtaXQgZW1pdCBlbmQgZm9yIHRoZSBsYXN0IG5vZGUgZW1pdHRlZCBpbiB0aGUgcmFuZ2UuXG4gICAgICAgICAgdHMuc2V0RW1pdEZsYWdzKGxhc3RSYW5nZUVuZE5vZGUsIHRzLkVtaXRGbGFncy5Ob0xlYWRpbmdTb3VyY2VNYXApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHZpc2l0Tm9kZSA9ICh0c05vZGU6IHRzLk5vZGUpID0+IHtcbiAgICAgIGNvbnN0IG5nTm9kZSA9IHRoaXMuX25vZGVNYXAuZ2V0KHRzTm9kZSk7XG4gICAgICBpZiAobmdOb2RlKSB7XG4gICAgICAgIGNvbnN0IHJhbmdlID0gdGhpcy5zb3VyY2VSYW5nZU9mKG5nTm9kZSk7XG4gICAgICAgIGlmIChyYW5nZSkge1xuICAgICAgICAgIGlmICghbGFzdFJhbmdlIHx8IHJhbmdlLnNvdXJjZSAhPSBsYXN0UmFuZ2Uuc291cmNlIHx8IHJhbmdlLnBvcyAhPSBsYXN0UmFuZ2UucG9zIHx8XG4gICAgICAgICAgICAgIHJhbmdlLmVuZCAhPSBsYXN0UmFuZ2UuZW5kKSB7XG4gICAgICAgICAgICByZWNvcmRMYXN0U291cmNlUmFuZ2UoKTtcbiAgICAgICAgICAgIGxhc3RSYW5nZVN0YXJ0Tm9kZSA9IHRzTm9kZTtcbiAgICAgICAgICAgIGxhc3RSYW5nZSA9IHJhbmdlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBsYXN0UmFuZ2VFbmROb2RlID0gdHNOb2RlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0cy5mb3JFYWNoQ2hpbGQodHNOb2RlLCB2aXNpdE5vZGUpO1xuICAgIH07XG4gICAgc3RhdGVtZW50cy5mb3JFYWNoKHZpc2l0Tm9kZSk7XG4gICAgcmVjb3JkTGFzdFNvdXJjZVJhbmdlKCk7XG4gIH1cblxuICBwcml2YXRlIHJlY29yZDxUIGV4dGVuZHMgdHMuTm9kZT4obmdOb2RlOiBOb2RlLCB0c05vZGU6IFR8bnVsbCk6IFJlY29yZGVkTm9kZTxUPiB7XG4gICAgaWYgKHRzTm9kZSAmJiAhdGhpcy5fbm9kZU1hcC5oYXModHNOb2RlKSkge1xuICAgICAgdGhpcy5fbm9kZU1hcC5zZXQodHNOb2RlLCBuZ05vZGUpO1xuICAgIH1cbiAgICByZXR1cm4gdHNOb2RlIGFzIFJlY29yZGVkTm9kZTxUPjtcbiAgfVxuXG4gIHByaXZhdGUgc291cmNlUmFuZ2VPZihub2RlOiBOb2RlKTogdHMuU291cmNlTWFwUmFuZ2V8bnVsbCB7XG4gICAgaWYgKG5vZGUuc291cmNlU3Bhbikge1xuICAgICAgY29uc3Qgc3BhbiA9IG5vZGUuc291cmNlU3BhbjtcbiAgICAgIGlmIChzcGFuLnN0YXJ0LmZpbGUgPT0gc3Bhbi5lbmQuZmlsZSkge1xuICAgICAgICBjb25zdCBmaWxlID0gc3Bhbi5zdGFydC5maWxlO1xuICAgICAgICBpZiAoZmlsZS51cmwpIHtcbiAgICAgICAgICBsZXQgc291cmNlID0gdGhpcy5fdGVtcGxhdGVTb3VyY2VzLmdldChmaWxlKTtcbiAgICAgICAgICBpZiAoIXNvdXJjZSkge1xuICAgICAgICAgICAgc291cmNlID0gdHMuY3JlYXRlU291cmNlTWFwU291cmNlKGZpbGUudXJsLCBmaWxlLmNvbnRlbnQsIHBvcyA9PiBwb3MpO1xuICAgICAgICAgICAgdGhpcy5fdGVtcGxhdGVTb3VyY2VzLnNldChmaWxlLCBzb3VyY2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4ge3Bvczogc3Bhbi5zdGFydC5vZmZzZXQsIGVuZDogc3Bhbi5lbmQub2Zmc2V0LCBzb3VyY2V9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRNb2RpZmllcnMoc3RtdDogU3RhdGVtZW50KSB7XG4gICAgbGV0IG1vZGlmaWVyczogdHMuTW9kaWZpZXJbXSA9IFtdO1xuICAgIGlmIChzdG10Lmhhc01vZGlmaWVyKFN0bXRNb2RpZmllci5FeHBvcnRlZCkpIHtcbiAgICAgIG1vZGlmaWVycy5wdXNoKHRzLmNyZWF0ZVRva2VuKHRzLlN5bnRheEtpbmQuRXhwb3J0S2V5d29yZCkpO1xuICAgIH1cbiAgICByZXR1cm4gbW9kaWZpZXJzO1xuICB9XG5cbiAgLy8gU3RhdGVtZW50VmlzaXRvclxuICB2aXNpdERlY2xhcmVWYXJTdG10KHN0bXQ6IERlY2xhcmVWYXJTdG10KSB7XG4gICAgaWYgKHN0bXQuaGFzTW9kaWZpZXIoU3RtdE1vZGlmaWVyLkV4cG9ydGVkKSAmJiBzdG10LnZhbHVlIGluc3RhbmNlb2YgRXh0ZXJuYWxFeHByICYmXG4gICAgICAgICFzdG10LnR5cGUpIHtcbiAgICAgIC8vIGNoZWNrIGZvciBhIHJlZXhwb3J0XG4gICAgICBjb25zdCB7bmFtZSwgbW9kdWxlTmFtZX0gPSBzdG10LnZhbHVlLnZhbHVlO1xuICAgICAgaWYgKG1vZHVsZU5hbWUpIHtcbiAgICAgICAgbGV0IHJlZXhwb3J0cyA9IHRoaXMuX3JlZXhwb3J0cy5nZXQobW9kdWxlTmFtZSk7XG4gICAgICAgIGlmICghcmVleHBvcnRzKSB7XG4gICAgICAgICAgcmVleHBvcnRzID0gW107XG4gICAgICAgICAgdGhpcy5fcmVleHBvcnRzLnNldChtb2R1bGVOYW1lLCByZWV4cG9ydHMpO1xuICAgICAgICB9XG4gICAgICAgIHJlZXhwb3J0cy5wdXNoKHtuYW1lOiBuYW1lICEsIGFzOiBzdG10Lm5hbWV9KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdmFyRGVjbExpc3QgPSB0cy5jcmVhdGVWYXJpYWJsZURlY2xhcmF0aW9uTGlzdChbdHMuY3JlYXRlVmFyaWFibGVEZWNsYXJhdGlvbihcbiAgICAgICAgdHMuY3JlYXRlSWRlbnRpZmllcihzdG10Lm5hbWUpLFxuICAgICAgICAvKiB0eXBlICovIHVuZGVmaW5lZCxcbiAgICAgICAgKHN0bXQudmFsdWUgJiYgc3RtdC52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpIHx8IHVuZGVmaW5lZCldKTtcblxuICAgIGlmIChzdG10Lmhhc01vZGlmaWVyKFN0bXRNb2RpZmllci5FeHBvcnRlZCkpIHtcbiAgICAgIC8vIE5vdGU6IFdlIG5lZWQgdG8gYWRkIGFuIGV4cGxpY2l0IHZhcmlhYmxlIGFuZCBleHBvcnQgZGVjbGFyYXRpb24gc28gdGhhdFxuICAgICAgLy8gdGhlIHZhcmlhYmxlIGNhbiBiZSByZWZlcnJlZCBpbiB0aGUgc2FtZSBmaWxlIGFzIHdlbGwuXG4gICAgICBjb25zdCB0c1ZhclN0bXQgPVxuICAgICAgICAgIHRoaXMucmVjb3JkKHN0bXQsIHRzLmNyZWF0ZVZhcmlhYmxlU3RhdGVtZW50KC8qIG1vZGlmaWVycyAqL1tdLCB2YXJEZWNsTGlzdCkpO1xuICAgICAgY29uc3QgZXhwb3J0U3RtdCA9IHRoaXMucmVjb3JkKFxuICAgICAgICAgIHN0bXQsIHRzLmNyZWF0ZUV4cG9ydERlY2xhcmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAvKmRlY29yYXRvcnMqLyB1bmRlZmluZWQsIC8qbW9kaWZpZXJzKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICB0cy5jcmVhdGVOYW1lZEV4cG9ydHMoW3RzLmNyZWF0ZUV4cG9ydFNwZWNpZmllcihzdG10Lm5hbWUsIHN0bXQubmFtZSldKSkpO1xuICAgICAgcmV0dXJuIFt0c1ZhclN0bXQsIGV4cG9ydFN0bXRdO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoc3RtdCwgdHMuY3JlYXRlVmFyaWFibGVTdGF0ZW1lbnQodGhpcy5nZXRNb2RpZmllcnMoc3RtdCksIHZhckRlY2xMaXN0KSk7XG4gIH1cblxuICB2aXNpdERlY2xhcmVGdW5jdGlvblN0bXQoc3RtdDogRGVjbGFyZUZ1bmN0aW9uU3RtdCkge1xuICAgIHJldHVybiB0aGlzLnJlY29yZChcbiAgICAgICAgc3RtdCwgdHMuY3JlYXRlRnVuY3Rpb25EZWNsYXJhdGlvbihcbiAgICAgICAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLCB0aGlzLmdldE1vZGlmaWVycyhzdG10KSxcbiAgICAgICAgICAgICAgICAgIC8qIGFzdGVyaXNrVG9rZW4gKi8gdW5kZWZpbmVkLCBzdG10Lm5hbWUsIC8qIHR5cGVQYXJhbWV0ZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgIHN0bXQucGFyYW1zLm1hcChcbiAgICAgICAgICAgICAgICAgICAgICBwID0+IHRzLmNyZWF0ZVBhcmFtZXRlcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8qIGRvdERvdERvdFRva2VuICovIHVuZGVmaW5lZCwgcC5uYW1lKSksXG4gICAgICAgICAgICAgICAgICAvKiB0eXBlICovIHVuZGVmaW5lZCwgdGhpcy5fdmlzaXRTdGF0ZW1lbnRzKHN0bXQuc3RhdGVtZW50cykpKTtcbiAgfVxuXG4gIHZpc2l0RXhwcmVzc2lvblN0bXQoc3RtdDogRXhwcmVzc2lvblN0YXRlbWVudCkge1xuICAgIHJldHVybiB0aGlzLnJlY29yZChzdG10LCB0cy5jcmVhdGVTdGF0ZW1lbnQoc3RtdC5leHByLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSkpO1xuICB9XG5cbiAgdmlzaXRSZXR1cm5TdG10KHN0bXQ6IFJldHVyblN0YXRlbWVudCkge1xuICAgIHJldHVybiB0aGlzLnJlY29yZChcbiAgICAgICAgc3RtdCwgdHMuY3JlYXRlUmV0dXJuKHN0bXQudmFsdWUgPyBzdG10LnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSA6IHVuZGVmaW5lZCkpO1xuICB9XG5cbiAgdmlzaXREZWNsYXJlQ2xhc3NTdG10KHN0bXQ6IENsYXNzU3RtdCkge1xuICAgIGNvbnN0IG1vZGlmaWVycyA9IHRoaXMuZ2V0TW9kaWZpZXJzKHN0bXQpO1xuICAgIGNvbnN0IGZpZWxkcyA9IHN0bXQuZmllbGRzLm1hcChmaWVsZCA9PiB7XG4gICAgICBjb25zdCBwcm9wZXJ0eSA9IHRzLmNyZWF0ZVByb3BlcnR5KFxuICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLCAvKiBtb2RpZmllcnMgKi8gdHJhbnNsYXRlTW9kaWZpZXJzKGZpZWxkLm1vZGlmaWVycyksXG4gICAgICAgICAgZmllbGQubmFtZSxcbiAgICAgICAgICAvKiBxdWVzdGlvblRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAvKiB0eXBlICovIHVuZGVmaW5lZCxcbiAgICAgICAgICBmaWVsZC5pbml0aWFsaXplciA9PSBudWxsID8gdHMuY3JlYXRlTnVsbCgpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmllbGQuaW5pdGlhbGl6ZXIudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKTtcblxuICAgICAgaWYgKHRoaXMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIpIHtcbiAgICAgICAgLy8gQ2xvc3VyZSBjb21waWxlciB0cmFuc2Zvcm1zIHRoZSBmb3JtIGBTZXJ2aWNlLsm1cHJvdiA9IFhgIGludG8gYFNlcnZpY2UkybVwcm92ID0gWGAuIFRvXG4gICAgICAgIC8vIHByZXZlbnQgdGhpcyB0cmFuc2Zvcm1hdGlvbiwgc3VjaCBhc3NpZ25tZW50cyBuZWVkIHRvIGJlIGFubm90YXRlZCB3aXRoIEBub2NvbGxhcHNlLlxuICAgICAgICAvLyBOb3RlIHRoYXQgdHNpY2tsZSBpcyB0eXBpY2FsbHkgcmVzcG9uc2libGUgZm9yIGFkZGluZyBzdWNoIGFubm90YXRpb25zLCBob3dldmVyIGl0XG4gICAgICAgIC8vIGRvZXNuJ3QgeWV0IGhhbmRsZSBzeW50aGV0aWMgZmllbGRzIGFkZGVkIGR1cmluZyBvdGhlciB0cmFuc2Zvcm1hdGlvbnMuXG4gICAgICAgIHRzLmFkZFN5bnRoZXRpY0xlYWRpbmdDb21tZW50KFxuICAgICAgICAgICAgcHJvcGVydHksIHRzLlN5bnRheEtpbmQuTXVsdGlMaW5lQ29tbWVudFRyaXZpYSwgJyogQG5vY29sbGFwc2UgJyxcbiAgICAgICAgICAgIC8qIGhhc1RyYWlsaW5nTmV3TGluZSAqLyBmYWxzZSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBwcm9wZXJ0eTtcbiAgICB9KTtcbiAgICBjb25zdCBnZXR0ZXJzID0gc3RtdC5nZXR0ZXJzLm1hcChcbiAgICAgICAgZ2V0dGVyID0+IHRzLmNyZWF0ZUdldEFjY2Vzc29yKFxuICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsIGdldHRlci5uYW1lLCAvKiBwYXJhbWV0ZXJzICovW10sXG4gICAgICAgICAgICAvKiB0eXBlICovIHVuZGVmaW5lZCwgdGhpcy5fdmlzaXRTdGF0ZW1lbnRzKGdldHRlci5ib2R5KSkpO1xuXG4gICAgY29uc3QgY29uc3RydWN0b3IgPVxuICAgICAgICAoc3RtdC5jb25zdHJ1Y3Rvck1ldGhvZCAmJiBbdHMuY3JlYXRlQ29uc3RydWN0b3IoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBwYXJhbWV0ZXJzICovXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG10LmNvbnN0cnVjdG9yTWV0aG9kLnBhcmFtcy5tYXAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcCA9PiB0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBkb3REb3REb3RUb2tlbiAqLyB1bmRlZmluZWQsIHAubmFtZSkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fdmlzaXRTdGF0ZW1lbnRzKHN0bXQuY29uc3RydWN0b3JNZXRob2QuYm9keSkpXSkgfHxcbiAgICAgICAgW107XG5cbiAgICAvLyBUT0RPIHtjaHVja2p9OiBEZXRlcm1pbmUgd2hhdCBzaG91bGQgYmUgZG9uZSBmb3IgYSBtZXRob2Qgd2l0aCBhIG51bGwgbmFtZS5cbiAgICBjb25zdCBtZXRob2RzID0gc3RtdC5tZXRob2RzLmZpbHRlcihtZXRob2QgPT4gbWV0aG9kLm5hbWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZCA9PiB0cy5jcmVhdGVNZXRob2QoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdHJhbnNsYXRlTW9kaWZpZXJzKG1ldGhvZC5tb2RpZmllcnMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBhc3RyaXNrVG9rZW4gKi8gdW5kZWZpbmVkLCBtZXRob2QubmFtZSAhLyogZ3VhcmRlZCBieSBmaWx0ZXIgKi8sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIHF1ZXN0aW9uVG9rZW4gKi8gdW5kZWZpbmVkLCAvKiB0eXBlUGFyYW1ldGVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZC5wYXJhbXMubWFwKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcCA9PiB0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogZG90RG90RG90VG9rZW4gKi8gdW5kZWZpbmVkLCBwLm5hbWUpKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogdHlwZSAqLyB1bmRlZmluZWQsIHRoaXMuX3Zpc2l0U3RhdGVtZW50cyhtZXRob2QuYm9keSkpKTtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIHN0bXQsIHRzLmNyZWF0ZUNsYXNzRGVjbGFyYXRpb24oXG4gICAgICAgICAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCwgbW9kaWZpZXJzLCBzdG10Lm5hbWUsIC8qIHR5cGVQYXJhbWV0ZXJzKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgc3RtdC5wYXJlbnQgJiYgW3RzLmNyZWF0ZUhlcml0YWdlQ2xhdXNlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLlN5bnRheEtpbmQuRXh0ZW5kc0tleXdvcmQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW3N0bXQucGFyZW50LnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKV0pXSB8fFxuICAgICAgICAgICAgICAgICAgICAgIFtdLFxuICAgICAgICAgICAgICAgICAgWy4uLmZpZWxkcywgLi4uZ2V0dGVycywgLi4uY29uc3RydWN0b3IsIC4uLm1ldGhvZHNdKSk7XG4gIH1cblxuICB2aXNpdElmU3RtdChzdG10OiBJZlN0bXQpIHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIHN0bXQsXG4gICAgICAgIHRzLmNyZWF0ZUlmKFxuICAgICAgICAgICAgc3RtdC5jb25kaXRpb24udmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpLCB0aGlzLl92aXNpdFN0YXRlbWVudHMoc3RtdC50cnVlQ2FzZSksXG4gICAgICAgICAgICBzdG10LmZhbHNlQ2FzZSAmJiBzdG10LmZhbHNlQ2FzZS5sZW5ndGggJiYgdGhpcy5fdmlzaXRTdGF0ZW1lbnRzKHN0bXQuZmFsc2VDYXNlKSB8fFxuICAgICAgICAgICAgICAgIHVuZGVmaW5lZCkpO1xuICB9XG5cbiAgdmlzaXRUcnlDYXRjaFN0bXQoc3RtdDogVHJ5Q2F0Y2hTdG10KTogUmVjb3JkZWROb2RlPHRzLlRyeVN0YXRlbWVudD4ge1xuICAgIHJldHVybiB0aGlzLnJlY29yZChcbiAgICAgICAgc3RtdCwgdHMuY3JlYXRlVHJ5KFxuICAgICAgICAgICAgICAgICAgdGhpcy5fdmlzaXRTdGF0ZW1lbnRzKHN0bXQuYm9keVN0bXRzKSxcbiAgICAgICAgICAgICAgICAgIHRzLmNyZWF0ZUNhdGNoQ2xhdXNlKFxuICAgICAgICAgICAgICAgICAgICAgIENBVENIX0VSUk9SX05BTUUsIHRoaXMuX3Zpc2l0U3RhdGVtZW50c1ByZWZpeChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW3RzLmNyZWF0ZVZhcmlhYmxlU3RhdGVtZW50KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt0cy5jcmVhdGVWYXJpYWJsZURlY2xhcmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIENBVENIX1NUQUNLX05BTUUsIC8qIHR5cGUgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5jcmVhdGVJZGVudGlmaWVyKENBVENIX0VSUk9SX05BTUUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5jcmVhdGVJZGVudGlmaWVyKENBVENIX1NUQUNLX05BTUUpKSldKV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0bXQuY2F0Y2hTdG10cykpLFxuICAgICAgICAgICAgICAgICAgLyogZmluYWxseUJsb2NrICovIHVuZGVmaW5lZCkpO1xuICB9XG5cbiAgdmlzaXRUaHJvd1N0bXQoc3RtdDogVGhyb3dTdG10KSB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKHN0bXQsIHRzLmNyZWF0ZVRocm93KHN0bXQuZXJyb3IudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSk7XG4gIH1cblxuICB2aXNpdENvbW1lbnRTdG10KHN0bXQ6IENvbW1lbnRTdG10LCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKSB7XG4gICAgY29uc3QgdGV4dCA9IHN0bXQubXVsdGlsaW5lID8gYCAke3N0bXQuY29tbWVudH0gYCA6IGAgJHtzdG10LmNvbW1lbnR9YDtcbiAgICByZXR1cm4gdGhpcy5jcmVhdGVDb21tZW50U3RtdCh0ZXh0LCBzdG10Lm11bHRpbGluZSwgc291cmNlRmlsZSk7XG4gIH1cblxuICB2aXNpdEpTRG9jQ29tbWVudFN0bXQoc3RtdDogSlNEb2NDb21tZW50U3RtdCwgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSkge1xuICAgIHJldHVybiB0aGlzLmNyZWF0ZUNvbW1lbnRTdG10KHN0bXQudG9TdHJpbmcoKSwgdHJ1ZSwgc291cmNlRmlsZSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUNvbW1lbnRTdG10KHRleHQ6IHN0cmluZywgbXVsdGlsaW5lOiBib29sZWFuLCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTpcbiAgICAgIHRzLk5vdEVtaXR0ZWRTdGF0ZW1lbnQge1xuICAgIGNvbnN0IGNvbW1lbnRTdG10ID0gdHMuY3JlYXRlTm90RW1pdHRlZFN0YXRlbWVudChzb3VyY2VGaWxlKTtcbiAgICBjb25zdCBraW5kID1cbiAgICAgICAgbXVsdGlsaW5lID8gdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhIDogdHMuU3ludGF4S2luZC5TaW5nbGVMaW5lQ29tbWVudFRyaXZpYTtcbiAgICB0cy5zZXRTeW50aGV0aWNMZWFkaW5nQ29tbWVudHMoY29tbWVudFN0bXQsIFt7a2luZCwgdGV4dCwgcG9zOiAtMSwgZW5kOiAtMX1dKTtcbiAgICByZXR1cm4gY29tbWVudFN0bXQ7XG4gIH1cblxuICAvLyBFeHByZXNzaW9uVmlzaXRvclxuICB2aXNpdFdyYXBwZWROb2RlRXhwcihleHByOiBXcmFwcGVkTm9kZUV4cHI8YW55PikgeyByZXR1cm4gdGhpcy5yZWNvcmQoZXhwciwgZXhwci5ub2RlKTsgfVxuXG4gIHZpc2l0VHlwZW9mRXhwcihleHByOiBUeXBlb2ZFeHByKSB7XG4gICAgY29uc3QgdHlwZU9mID0gdHMuY3JlYXRlVHlwZU9mKGV4cHIuZXhwci52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpO1xuICAgIHJldHVybiB0aGlzLnJlY29yZChleHByLCB0eXBlT2YpO1xuICB9XG5cbiAgLy8gRXhwcmVzc2lvblZpc2l0b3JcbiAgdmlzaXRSZWFkVmFyRXhwcihleHByOiBSZWFkVmFyRXhwcikge1xuICAgIHN3aXRjaCAoZXhwci5idWlsdGluKSB7XG4gICAgICBjYXNlIEJ1aWx0aW5WYXIuVGhpczpcbiAgICAgICAgcmV0dXJuIHRoaXMucmVjb3JkKGV4cHIsIHRzLmNyZWF0ZUlkZW50aWZpZXIoTUVUSE9EX1RISVNfTkFNRSkpO1xuICAgICAgY2FzZSBCdWlsdGluVmFyLkNhdGNoRXJyb3I6XG4gICAgICAgIHJldHVybiB0aGlzLnJlY29yZChleHByLCB0cy5jcmVhdGVJZGVudGlmaWVyKENBVENIX0VSUk9SX05BTUUpKTtcbiAgICAgIGNhc2UgQnVpbHRpblZhci5DYXRjaFN0YWNrOlxuICAgICAgICByZXR1cm4gdGhpcy5yZWNvcmQoZXhwciwgdHMuY3JlYXRlSWRlbnRpZmllcihDQVRDSF9TVEFDS19OQU1FKSk7XG4gICAgICBjYXNlIEJ1aWx0aW5WYXIuU3VwZXI6XG4gICAgICAgIHJldHVybiB0aGlzLnJlY29yZChleHByLCB0cy5jcmVhdGVTdXBlcigpKTtcbiAgICB9XG4gICAgaWYgKGV4cHIubmFtZSkge1xuICAgICAgcmV0dXJuIHRoaXMucmVjb3JkKGV4cHIsIHRzLmNyZWF0ZUlkZW50aWZpZXIoZXhwci5uYW1lKSk7XG4gICAgfVxuICAgIHRocm93IEVycm9yKGBVbmV4cGVjdGVkIFJlYWRWYXJFeHByIGZvcm1gKTtcbiAgfVxuXG4gIHZpc2l0V3JpdGVWYXJFeHByKGV4cHI6IFdyaXRlVmFyRXhwcik6IFJlY29yZGVkTm9kZTx0cy5CaW5hcnlFeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLCB0cy5jcmVhdGVBc3NpZ25tZW50KFxuICAgICAgICAgICAgICAgICAgdHMuY3JlYXRlSWRlbnRpZmllcihleHByLm5hbWUpLCBleHByLnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSkpO1xuICB9XG5cbiAgdmlzaXRXcml0ZUtleUV4cHIoZXhwcjogV3JpdGVLZXlFeHByKTogUmVjb3JkZWROb2RlPHRzLkJpbmFyeUV4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIGV4cHIsXG4gICAgICAgIHRzLmNyZWF0ZUFzc2lnbm1lbnQoXG4gICAgICAgICAgICB0cy5jcmVhdGVFbGVtZW50QWNjZXNzKFxuICAgICAgICAgICAgICAgIGV4cHIucmVjZWl2ZXIudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpLCBleHByLmluZGV4LnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSksXG4gICAgICAgICAgICBleHByLnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSkpO1xuICB9XG5cbiAgdmlzaXRXcml0ZVByb3BFeHByKGV4cHI6IFdyaXRlUHJvcEV4cHIpOiBSZWNvcmRlZE5vZGU8dHMuQmluYXJ5RXhwcmVzc2lvbj4ge1xuICAgIHJldHVybiB0aGlzLnJlY29yZChcbiAgICAgICAgZXhwciwgdHMuY3JlYXRlQXNzaWdubWVudChcbiAgICAgICAgICAgICAgICAgIHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKGV4cHIucmVjZWl2ZXIudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpLCBleHByLm5hbWUpLFxuICAgICAgICAgICAgICAgICAgZXhwci52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpKTtcbiAgfVxuXG4gIHZpc2l0SW52b2tlTWV0aG9kRXhwcihleHByOiBJbnZva2VNZXRob2RFeHByKTogUmVjb3JkZWROb2RlPHRzLkNhbGxFeHByZXNzaW9uPiB7XG4gICAgY29uc3QgbWV0aG9kTmFtZSA9IGdldE1ldGhvZE5hbWUoZXhwcik7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLFxuICAgICAgICB0cy5jcmVhdGVDYWxsKFxuICAgICAgICAgICAgdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoZXhwci5yZWNlaXZlci52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCksIG1ldGhvZE5hbWUpLFxuICAgICAgICAgICAgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsIGV4cHIuYXJncy5tYXAoYXJnID0+IGFyZy52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpKSk7XG4gIH1cblxuICB2aXNpdEludm9rZUZ1bmN0aW9uRXhwcihleHByOiBJbnZva2VGdW5jdGlvbkV4cHIpOiBSZWNvcmRlZE5vZGU8dHMuQ2FsbEV4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIGV4cHIsIHRzLmNyZWF0ZUNhbGwoXG4gICAgICAgICAgICAgICAgICBleHByLmZuLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSwgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICBleHByLmFyZ3MubWFwKGFyZyA9PiBhcmcudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSkpO1xuICB9XG5cbiAgdmlzaXRJbnN0YW50aWF0ZUV4cHIoZXhwcjogSW5zdGFudGlhdGVFeHByKTogUmVjb3JkZWROb2RlPHRzLk5ld0V4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIGV4cHIsIHRzLmNyZWF0ZU5ldyhcbiAgICAgICAgICAgICAgICAgIGV4cHIuY2xhc3NFeHByLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSwgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICBleHByLmFyZ3MubWFwKGFyZyA9PiBhcmcudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSkpO1xuICB9XG5cbiAgdmlzaXRMaXRlcmFsRXhwcihleHByOiBMaXRlcmFsRXhwcikgeyByZXR1cm4gdGhpcy5yZWNvcmQoZXhwciwgY3JlYXRlTGl0ZXJhbChleHByLnZhbHVlKSk7IH1cblxuICB2aXNpdExvY2FsaXplZFN0cmluZyhleHByOiBMb2NhbGl6ZWRTdHJpbmcsIGNvbnRleHQ6IGFueSkge1xuICAgIHRocm93IG5ldyBFcnJvcignbG9jYWxpemVkIHN0cmluZ3MgYXJlIG5vdCBzdXBwb3J0ZWQgaW4gcHJlLWl2eSBtb2RlLicpO1xuICB9XG5cbiAgdmlzaXRFeHRlcm5hbEV4cHIoZXhwcjogRXh0ZXJuYWxFeHByKSB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKGV4cHIsIHRoaXMuX3Zpc2l0SWRlbnRpZmllcihleHByLnZhbHVlKSk7XG4gIH1cblxuICB2aXNpdENvbmRpdGlvbmFsRXhwcihleHByOiBDb25kaXRpb25hbEV4cHIpOiBSZWNvcmRlZE5vZGU8dHMuUGFyZW50aGVzaXplZEV4cHJlc3Npb24+IHtcbiAgICAvLyBUT0RPIHtjaHVja2p9OiBSZXZpZXcgdXNlIG9mICEgb24gZmFsc2VDYXNlLiBTaG91bGQgaXQgYmUgbm9uLW51bGxhYmxlP1xuICAgIHJldHVybiB0aGlzLnJlY29yZChcbiAgICAgICAgZXhwcixcbiAgICAgICAgdHMuY3JlYXRlUGFyZW4odHMuY3JlYXRlQ29uZGl0aW9uYWwoXG4gICAgICAgICAgICBleHByLmNvbmRpdGlvbi52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCksIGV4cHIudHJ1ZUNhc2UudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpLFxuICAgICAgICAgICAgZXhwci5mYWxzZUNhc2UgIS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpKSk7XG4gIH1cblxuICB2aXNpdE5vdEV4cHIoZXhwcjogTm90RXhwcik6IFJlY29yZGVkTm9kZTx0cy5QcmVmaXhVbmFyeUV4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIGV4cHIsIHRzLmNyZWF0ZVByZWZpeChcbiAgICAgICAgICAgICAgICAgIHRzLlN5bnRheEtpbmQuRXhjbGFtYXRpb25Ub2tlbiwgZXhwci5jb25kaXRpb24udmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSk7XG4gIH1cblxuICB2aXNpdEFzc2VydE5vdE51bGxFeHByKGV4cHI6IEFzc2VydE5vdE51bGwpOiBSZWNvcmRlZE5vZGU8dHMuRXhwcmVzc2lvbj4ge1xuICAgIHJldHVybiBleHByLmNvbmRpdGlvbi52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCk7XG4gIH1cblxuICB2aXNpdENhc3RFeHByKGV4cHI6IENhc3RFeHByKTogUmVjb3JkZWROb2RlPHRzLkV4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gZXhwci52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCk7XG4gIH1cblxuICB2aXNpdEZ1bmN0aW9uRXhwcihleHByOiBGdW5jdGlvbkV4cHIpIHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIGV4cHIsIHRzLmNyZWF0ZUZ1bmN0aW9uRXhwcmVzc2lvbihcbiAgICAgICAgICAgICAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsIC8qIGFzdHJpc2tUb2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAvKiBuYW1lICovIGV4cHIubmFtZSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICBleHByLnBhcmFtcy5tYXAoXG4gICAgICAgICAgICAgICAgICAgICAgcCA9PiB0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLCAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBkb3REb3REb3RUb2tlbiAqLyB1bmRlZmluZWQsIHAubmFtZSkpLFxuICAgICAgICAgICAgICAgICAgLyogdHlwZSAqLyB1bmRlZmluZWQsIHRoaXMuX3Zpc2l0U3RhdGVtZW50cyhleHByLnN0YXRlbWVudHMpKSk7XG4gIH1cblxuICB2aXNpdEJpbmFyeU9wZXJhdG9yRXhwcihleHByOiBCaW5hcnlPcGVyYXRvckV4cHIpOlxuICAgICAgUmVjb3JkZWROb2RlPHRzLkJpbmFyeUV4cHJlc3Npb258dHMuUGFyZW50aGVzaXplZEV4cHJlc3Npb24+IHtcbiAgICBsZXQgYmluYXJ5T3BlcmF0b3I6IHRzLkJpbmFyeU9wZXJhdG9yO1xuICAgIHN3aXRjaCAoZXhwci5vcGVyYXRvcikge1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5BbmQ6XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5BbXBlcnNhbmRBbXBlcnNhbmRUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLkJpdHdpc2VBbmQ6XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5BbXBlcnNhbmRUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLkJpZ2dlcjpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkdyZWF0ZXJUaGFuVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5CaWdnZXJFcXVhbHM6XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5HcmVhdGVyVGhhbkVxdWFsc1Rva2VuO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQmluYXJ5T3BlcmF0b3IuRGl2aWRlOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuU2xhc2hUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLkVxdWFsczpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkVxdWFsc0VxdWFsc1Rva2VuO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQmluYXJ5T3BlcmF0b3IuSWRlbnRpY2FsOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuRXF1YWxzRXF1YWxzRXF1YWxzVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5Mb3dlcjpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkxlc3NUaGFuVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5Mb3dlckVxdWFsczpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkxlc3NUaGFuRXF1YWxzVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5NaW51czpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLk1pbnVzVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5Nb2R1bG86XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5QZXJjZW50VG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5NdWx0aXBseTpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkFzdGVyaXNrVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5Ob3RFcXVhbHM6XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5FeGNsYW1hdGlvbkVxdWFsc1Rva2VuO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQmluYXJ5T3BlcmF0b3IuTm90SWRlbnRpY2FsOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuRXhjbGFtYXRpb25FcXVhbHNFcXVhbHNUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLk9yOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuQmFyQmFyVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5QbHVzOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuUGx1c1Rva2VuO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBvcGVyYXRvcjogJHtleHByLm9wZXJhdG9yfWApO1xuICAgIH1cbiAgICBjb25zdCBiaW5hcnkgPSB0cy5jcmVhdGVCaW5hcnkoXG4gICAgICAgIGV4cHIubGhzLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSwgYmluYXJ5T3BlcmF0b3IsIGV4cHIucmhzLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSk7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKGV4cHIsIGV4cHIucGFyZW5zID8gdHMuY3JlYXRlUGFyZW4oYmluYXJ5KSA6IGJpbmFyeSk7XG4gIH1cblxuICB2aXNpdFJlYWRQcm9wRXhwcihleHByOiBSZWFkUHJvcEV4cHIpOiBSZWNvcmRlZE5vZGU8dHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLCB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhleHByLnJlY2VpdmVyLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSwgZXhwci5uYW1lKSk7XG4gIH1cblxuICB2aXNpdFJlYWRLZXlFeHByKGV4cHI6IFJlYWRLZXlFeHByKTogUmVjb3JkZWROb2RlPHRzLkVsZW1lbnRBY2Nlc3NFeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLFxuICAgICAgICB0cy5jcmVhdGVFbGVtZW50QWNjZXNzKFxuICAgICAgICAgICAgZXhwci5yZWNlaXZlci52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCksIGV4cHIuaW5kZXgudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSk7XG4gIH1cblxuICB2aXNpdExpdGVyYWxBcnJheUV4cHIoZXhwcjogTGl0ZXJhbEFycmF5RXhwcik6IFJlY29yZGVkTm9kZTx0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLCB0cy5jcmVhdGVBcnJheUxpdGVyYWwoZXhwci5lbnRyaWVzLm1hcChlbnRyeSA9PiBlbnRyeS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpKSk7XG4gIH1cblxuICB2aXNpdExpdGVyYWxNYXBFeHByKGV4cHI6IExpdGVyYWxNYXBFeHByKTogUmVjb3JkZWROb2RlPHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLCB0cy5jcmVhdGVPYmplY3RMaXRlcmFsKGV4cHIuZW50cmllcy5tYXAoXG4gICAgICAgICAgICAgICAgICBlbnRyeSA9PiB0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQoXG4gICAgICAgICAgICAgICAgICAgICAgZW50cnkucXVvdGVkIHx8ICFfVkFMSURfSURFTlRJRklFUl9SRS50ZXN0KGVudHJ5LmtleSkgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5jcmVhdGVMaXRlcmFsKGVudHJ5LmtleSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRyeS5rZXksXG4gICAgICAgICAgICAgICAgICAgICAgZW50cnkudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSkpKTtcbiAgfVxuXG4gIHZpc2l0Q29tbWFFeHByKGV4cHI6IENvbW1hRXhwcik6IFJlY29yZGVkTm9kZTx0cy5FeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLCBleHByLnBhcnRzLm1hcChlID0+IGUudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKVxuICAgICAgICAgICAgICAgICAgLnJlZHVjZTx0cy5FeHByZXNzaW9ufG51bGw+KFxuICAgICAgICAgICAgICAgICAgICAgIChsZWZ0LCByaWdodCkgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgbGVmdCA/IHRzLmNyZWF0ZUJpbmFyeShsZWZ0LCB0cy5TeW50YXhLaW5kLkNvbW1hVG9rZW4sIHJpZ2h0KSA6IHJpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgIG51bGwpKTtcbiAgfVxuXG4gIHByaXZhdGUgX3Zpc2l0U3RhdGVtZW50cyhzdGF0ZW1lbnRzOiBTdGF0ZW1lbnRbXSk6IHRzLkJsb2NrIHtcbiAgICByZXR1cm4gdGhpcy5fdmlzaXRTdGF0ZW1lbnRzUHJlZml4KFtdLCBzdGF0ZW1lbnRzKTtcbiAgfVxuXG4gIHByaXZhdGUgX3Zpc2l0U3RhdGVtZW50c1ByZWZpeChwcmVmaXg6IHRzLlN0YXRlbWVudFtdLCBzdGF0ZW1lbnRzOiBTdGF0ZW1lbnRbXSkge1xuICAgIHJldHVybiB0cy5jcmVhdGVCbG9jayhbXG4gICAgICAuLi5wcmVmaXgsIC4uLnN0YXRlbWVudHMubWFwKHN0bXQgPT4gc3RtdC52aXNpdFN0YXRlbWVudCh0aGlzLCBudWxsKSkuZmlsdGVyKGYgPT4gZiAhPSBudWxsKVxuICAgIF0pO1xuICB9XG5cbiAgcHJpdmF0ZSBfdmlzaXRJZGVudGlmaWVyKHZhbHVlOiBFeHRlcm5hbFJlZmVyZW5jZSk6IHRzLkV4cHJlc3Npb24ge1xuICAgIC8vIG5hbWUgY2FuIG9ubHkgYmUgbnVsbCBkdXJpbmcgSklUIHdoaWNoIG5ldmVyIGV4ZWN1dGVzIHRoaXMgY29kZS5cbiAgICBjb25zdCBtb2R1bGVOYW1lID0gdmFsdWUubW9kdWxlTmFtZSwgbmFtZSA9IHZhbHVlLm5hbWUgITtcbiAgICBsZXQgcHJlZml4SWRlbnQ6IHRzLklkZW50aWZpZXJ8bnVsbCA9IG51bGw7XG4gICAgaWYgKG1vZHVsZU5hbWUpIHtcbiAgICAgIGxldCBwcmVmaXggPSB0aGlzLl9pbXBvcnRzV2l0aFByZWZpeGVzLmdldChtb2R1bGVOYW1lKTtcbiAgICAgIGlmIChwcmVmaXggPT0gbnVsbCkge1xuICAgICAgICBwcmVmaXggPSBgaSR7dGhpcy5faW1wb3J0c1dpdGhQcmVmaXhlcy5zaXplfWA7XG4gICAgICAgIHRoaXMuX2ltcG9ydHNXaXRoUHJlZml4ZXMuc2V0KG1vZHVsZU5hbWUsIHByZWZpeCk7XG4gICAgICB9XG4gICAgICBwcmVmaXhJZGVudCA9IHRzLmNyZWF0ZUlkZW50aWZpZXIocHJlZml4KTtcbiAgICB9XG4gICAgaWYgKHByZWZpeElkZW50KSB7XG4gICAgICByZXR1cm4gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MocHJlZml4SWRlbnQsIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBpZCA9IHRzLmNyZWF0ZUlkZW50aWZpZXIobmFtZSk7XG4gICAgICBpZiAodGhpcy5fZXhwb3J0ZWRWYXJpYWJsZUlkZW50aWZpZXJzLmhhcyhuYW1lKSkge1xuICAgICAgICAvLyBJbiBvcmRlciBmb3IgdGhpcyBuZXcgaWRlbnRpZmllciBub2RlIHRvIGJlIHByb3Blcmx5IHJld3JpdHRlbiBpbiBDb21tb25KUyBvdXRwdXQsXG4gICAgICAgIC8vIGl0IG11c3QgaGF2ZSBpdHMgb3JpZ2luYWwgbm9kZSBzZXQgdG8gYSBwYXJzZWQgaW5zdGFuY2Ugb2YgdGhlIHNhbWUgaWRlbnRpZmllci5cbiAgICAgICAgdHMuc2V0T3JpZ2luYWxOb2RlKGlkLCB0aGlzLl9leHBvcnRlZFZhcmlhYmxlSWRlbnRpZmllcnMuZ2V0KG5hbWUpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBpZDtcbiAgICB9XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBnZXRNZXRob2ROYW1lKG1ldGhvZFJlZjoge25hbWU6IHN0cmluZyB8IG51bGw7IGJ1aWx0aW46IEJ1aWx0aW5NZXRob2QgfCBudWxsfSk6IHN0cmluZyB7XG4gIGlmIChtZXRob2RSZWYubmFtZSkge1xuICAgIHJldHVybiBtZXRob2RSZWYubmFtZTtcbiAgfSBlbHNlIHtcbiAgICBzd2l0Y2ggKG1ldGhvZFJlZi5idWlsdGluKSB7XG4gICAgICBjYXNlIEJ1aWx0aW5NZXRob2QuQmluZDpcbiAgICAgICAgcmV0dXJuICdiaW5kJztcbiAgICAgIGNhc2UgQnVpbHRpbk1ldGhvZC5Db25jYXRBcnJheTpcbiAgICAgICAgcmV0dXJuICdjb25jYXQnO1xuICAgICAgY2FzZSBCdWlsdGluTWV0aG9kLlN1YnNjcmliZU9ic2VydmFibGU6XG4gICAgICAgIHJldHVybiAnc3Vic2NyaWJlJztcbiAgICB9XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKCdVbmV4cGVjdGVkIG1ldGhvZCByZWZlcmVuY2UgZm9ybScpO1xufVxuXG5mdW5jdGlvbiBtb2RpZmllckZyb21Nb2RpZmllcihtb2RpZmllcjogU3RtdE1vZGlmaWVyKTogdHMuTW9kaWZpZXIge1xuICBzd2l0Y2ggKG1vZGlmaWVyKSB7XG4gICAgY2FzZSBTdG10TW9kaWZpZXIuRXhwb3J0ZWQ6XG4gICAgICByZXR1cm4gdHMuY3JlYXRlVG9rZW4odHMuU3ludGF4S2luZC5FeHBvcnRLZXl3b3JkKTtcbiAgICBjYXNlIFN0bXRNb2RpZmllci5GaW5hbDpcbiAgICAgIHJldHVybiB0cy5jcmVhdGVUb2tlbih0cy5TeW50YXhLaW5kLkNvbnN0S2V5d29yZCk7XG4gICAgY2FzZSBTdG10TW9kaWZpZXIuUHJpdmF0ZTpcbiAgICAgIHJldHVybiB0cy5jcmVhdGVUb2tlbih0cy5TeW50YXhLaW5kLlByaXZhdGVLZXl3b3JkKTtcbiAgICBjYXNlIFN0bXRNb2RpZmllci5TdGF0aWM6XG4gICAgICByZXR1cm4gdHMuY3JlYXRlVG9rZW4odHMuU3ludGF4S2luZC5TdGF0aWNLZXl3b3JkKTtcbiAgfVxuICByZXR1cm4gZXJyb3IoYHVua25vd24gc3RhdGVtZW50IG1vZGlmaWVyYCk7XG59XG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZU1vZGlmaWVycyhtb2RpZmllcnM6IFN0bXRNb2RpZmllcltdIHwgbnVsbCk6IHRzLk1vZGlmaWVyW118dW5kZWZpbmVkIHtcbiAgcmV0dXJuIG1vZGlmaWVycyA9PSBudWxsID8gdW5kZWZpbmVkIDogbW9kaWZpZXJzICEubWFwKG1vZGlmaWVyRnJvbU1vZGlmaWVyKTtcbn1cbiJdfQ==