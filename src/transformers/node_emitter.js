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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZV9lbWl0dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy90cmFuc2Zvcm1lcnMvbm9kZV9lbWl0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUF3cUI7SUFFeHFCLCtCQUFpQztJQUVqQyxvRUFBNkI7SUFJN0IsSUFBTSxnQkFBZ0IsR0FBRyxNQUFNLENBQUM7SUFDaEMsSUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUM7SUFDakMsSUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUM7SUFDakMsSUFBTSxvQkFBb0IsR0FBRyx1QkFBdUIsQ0FBQztJQUVyRDtRQUNFLCtCQUFvQiwwQkFBbUM7WUFBbkMsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUFTO1FBQUcsQ0FBQztRQUUzRCxnREFBZ0IsR0FBaEIsVUFBaUIsVUFBeUIsRUFBRSxLQUFrQixFQUFFLFFBQWlCO1lBRS9FLElBQU0sU0FBUyxHQUFHLElBQUksa0JBQWtCLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUM7WUFDMUUsMkZBQTJGO1lBQzNGLFNBQVM7WUFDVCxJQUFNLFVBQVUsR0FBVSxFQUFFLENBQUMsTUFBTSxPQUFULEVBQUUsbUJBQ3JCLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsRUFBcEMsQ0FBb0MsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLElBQUksSUFBSSxJQUFJLEVBQVosQ0FBWSxDQUFDLEVBQUMsQ0FBQztZQUM3RixJQUFNLGFBQWEsR0FBbUIsRUFBRSxDQUFDO1lBQ3pDLElBQUksUUFBUSxFQUFFO2dCQUNaLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxVQUFV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QztZQUN0RCxLQUFLLHVCQUFZLENBQUMsTUFBTTtnQkFDdEIsT0FBTyxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUM7U0FDdEQ7UUFDRCxPQUFPLFlBQUssQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFRCxTQUFTLGtCQUFrQixDQUFDLFNBQWdDO1FBQzFELE9BQU8sU0FBUyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7SUFDL0UsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBc3NlcnROb3ROdWxsLCBCaW5hcnlPcGVyYXRvciwgQmluYXJ5T3BlcmF0b3JFeHByLCBCdWlsdGluTWV0aG9kLCBCdWlsdGluVmFyLCBDYXN0RXhwciwgQ2xhc3NTdG10LCBDb21tYUV4cHIsIENvbW1lbnRTdG10LCBDb25kaXRpb25hbEV4cHIsIERlY2xhcmVGdW5jdGlvblN0bXQsIERlY2xhcmVWYXJTdG10LCBFeHByZXNzaW9uU3RhdGVtZW50LCBFeHByZXNzaW9uVmlzaXRvciwgRXh0ZXJuYWxFeHByLCBFeHRlcm5hbFJlZmVyZW5jZSwgRnVuY3Rpb25FeHByLCBJZlN0bXQsIEluc3RhbnRpYXRlRXhwciwgSW52b2tlRnVuY3Rpb25FeHByLCBJbnZva2VNZXRob2RFeHByLCBKU0RvY0NvbW1lbnRTdG10LCBMaXRlcmFsQXJyYXlFeHByLCBMaXRlcmFsRXhwciwgTGl0ZXJhbE1hcEV4cHIsIE5vdEV4cHIsIFBhcnNlU291cmNlRmlsZSwgUGFyc2VTb3VyY2VTcGFuLCBQYXJ0aWFsTW9kdWxlLCBSZWFkS2V5RXhwciwgUmVhZFByb3BFeHByLCBSZWFkVmFyRXhwciwgUmV0dXJuU3RhdGVtZW50LCBTdGF0ZW1lbnQsIFN0YXRlbWVudFZpc2l0b3IsIFN0bXRNb2RpZmllciwgVGhyb3dTdG10LCBUcnlDYXRjaFN0bXQsIFR5cGVvZkV4cHIsIFdyYXBwZWROb2RlRXhwciwgV3JpdGVLZXlFeHByLCBXcml0ZVByb3BFeHByLCBXcml0ZVZhckV4cHJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7TG9jYWxpemVkU3RyaW5nfSBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvb3V0cHV0L291dHB1dF9hc3QnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7ZXJyb3J9IGZyb20gJy4vdXRpbCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTm9kZSB7IHNvdXJjZVNwYW46IFBhcnNlU291cmNlU3BhbnxudWxsOyB9XG5cbmNvbnN0IE1FVEhPRF9USElTX05BTUUgPSAndGhpcyc7XG5jb25zdCBDQVRDSF9FUlJPUl9OQU1FID0gJ2Vycm9yJztcbmNvbnN0IENBVENIX1NUQUNLX05BTUUgPSAnc3RhY2snO1xuY29uc3QgX1ZBTElEX0lERU5USUZJRVJfUkUgPSAvXlskQS1aX11bMC05QS1aXyRdKiQvaTtcblxuZXhwb3J0IGNsYXNzIFR5cGVTY3JpcHROb2RlRW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI6IGJvb2xlYW4pIHt9XG5cbiAgdXBkYXRlU291cmNlRmlsZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBzdG10czogU3RhdGVtZW50W10sIHByZWFtYmxlPzogc3RyaW5nKTpcbiAgICAgIFt0cy5Tb3VyY2VGaWxlLCBNYXA8dHMuTm9kZSwgTm9kZT5dIHtcbiAgICBjb25zdCBjb252ZXJ0ZXIgPSBuZXcgTm9kZUVtaXR0ZXJWaXNpdG9yKHRoaXMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIpO1xuICAgIC8vIFtdLmNvbmNhdCBmbGF0dGVucyB0aGUgcmVzdWx0IHNvIHRoYXQgZWFjaCBgdmlzaXQuLi5gIG1ldGhvZCBjYW4gYWxzbyByZXR1cm4gYW4gYXJyYXkgb2ZcbiAgICAvLyBzdG10cy5cbiAgICBjb25zdCBzdGF0ZW1lbnRzOiBhbnlbXSA9IFtdLmNvbmNhdChcbiAgICAgICAgLi4uc3RtdHMubWFwKHN0bXQgPT4gc3RtdC52aXNpdFN0YXRlbWVudChjb252ZXJ0ZXIsIG51bGwpKS5maWx0ZXIoc3RtdCA9PiBzdG10ICE9IG51bGwpKTtcbiAgICBjb25zdCBwcmVhbWJsZVN0bXRzOiB0cy5TdGF0ZW1lbnRbXSA9IFtdO1xuICAgIGlmIChwcmVhbWJsZSkge1xuICAgICAgY29uc3QgY29tbWVudFN0bXQgPSB0aGlzLmNyZWF0ZUNvbW1lbnRTdGF0ZW1lbnQoc291cmNlRmlsZSwgcHJlYW1ibGUpO1xuICAgICAgcHJlYW1ibGVTdG10cy5wdXNoKGNvbW1lbnRTdG10KTtcbiAgICB9XG4gICAgY29uc3Qgc291cmNlU3RhdGVtZW50cyA9XG4gICAgICAgIFsuLi5wcmVhbWJsZVN0bXRzLCAuLi5jb252ZXJ0ZXIuZ2V0UmVleHBvcnRzKCksIC4uLmNvbnZlcnRlci5nZXRJbXBvcnRzKCksIC4uLnN0YXRlbWVudHNdO1xuICAgIGNvbnZlcnRlci51cGRhdGVTb3VyY2VNYXAoc291cmNlU3RhdGVtZW50cyk7XG4gICAgY29uc3QgbmV3U291cmNlRmlsZSA9IHRzLnVwZGF0ZVNvdXJjZUZpbGVOb2RlKHNvdXJjZUZpbGUsIHNvdXJjZVN0YXRlbWVudHMpO1xuICAgIHJldHVybiBbbmV3U291cmNlRmlsZSwgY29udmVydGVyLmdldE5vZGVNYXAoKV07XG4gIH1cblxuICAvKiogQ3JlYXRlcyBhIG5vdCBlbWl0dGVkIHN0YXRlbWVudCBjb250YWluaW5nIHRoZSBnaXZlbiBjb21tZW50LiAqL1xuICBjcmVhdGVDb21tZW50U3RhdGVtZW50KHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIGNvbW1lbnQ6IHN0cmluZyk6IHRzLlN0YXRlbWVudCB7XG4gICAgaWYgKGNvbW1lbnQuc3RhcnRzV2l0aCgnLyonKSAmJiBjb21tZW50LmVuZHNXaXRoKCcqLycpKSB7XG4gICAgICBjb21tZW50ID0gY29tbWVudC5zdWJzdHIoMiwgY29tbWVudC5sZW5ndGggLSA0KTtcbiAgICB9XG4gICAgY29uc3QgY29tbWVudFN0bXQgPSB0cy5jcmVhdGVOb3RFbWl0dGVkU3RhdGVtZW50KHNvdXJjZUZpbGUpO1xuICAgIHRzLnNldFN5bnRoZXRpY0xlYWRpbmdDb21tZW50cyhcbiAgICAgICAgY29tbWVudFN0bXQsXG4gICAgICAgIFt7a2luZDogdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhLCB0ZXh0OiBjb21tZW50LCBwb3M6IC0xLCBlbmQ6IC0xfV0pO1xuICAgIHRzLnNldEVtaXRGbGFncyhjb21tZW50U3RtdCwgdHMuRW1pdEZsYWdzLkN1c3RvbVByb2xvZ3VlKTtcbiAgICByZXR1cm4gY29tbWVudFN0bXQ7XG4gIH1cbn1cblxuLyoqXG4gKiBVcGRhdGUgdGhlIGdpdmVuIHNvdXJjZSBmaWxlIHRvIGluY2x1ZGUgdGhlIGNoYW5nZXMgc3BlY2lmaWVkIGluIG1vZHVsZS5cbiAqXG4gKiBUaGUgbW9kdWxlIHBhcmFtZXRlciBpcyB0cmVhdGVkIGFzIGEgcGFydGlhbCBtb2R1bGUgbWVhbmluZyB0aGF0IHRoZSBzdGF0ZW1lbnRzIGFyZSBhZGRlZCB0b1xuICogdGhlIG1vZHVsZSBpbnN0ZWFkIG9mIHJlcGxhY2luZyB0aGUgbW9kdWxlLiBBbHNvLCBhbnkgY2xhc3NlcyBhcmUgdHJlYXRlZCBhcyBwYXJ0aWFsIGNsYXNzZXNcbiAqIGFuZCB0aGUgaW5jbHVkZWQgbWVtYmVycyBhcmUgYWRkZWQgdG8gdGhlIGNsYXNzIHdpdGggdGhlIHNhbWUgbmFtZSBpbnN0ZWFkIG9mIGEgbmV3IGNsYXNzXG4gKiBiZWluZyBjcmVhdGVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlU291cmNlRmlsZShcbiAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBtb2R1bGU6IFBhcnRpYWxNb2R1bGUsXG4gICAgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI6IGJvb2xlYW4pOiBbdHMuU291cmNlRmlsZSwgTWFwPHRzLk5vZGUsIE5vZGU+XSB7XG4gIGNvbnN0IGNvbnZlcnRlciA9IG5ldyBOb2RlRW1pdHRlclZpc2l0b3IoYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIpO1xuICBjb252ZXJ0ZXIubG9hZEV4cG9ydGVkVmFyaWFibGVJZGVudGlmaWVycyhzb3VyY2VGaWxlKTtcblxuICBjb25zdCBwcmVmaXhTdGF0ZW1lbnRzID0gbW9kdWxlLnN0YXRlbWVudHMuZmlsdGVyKHN0YXRlbWVudCA9PiAhKHN0YXRlbWVudCBpbnN0YW5jZW9mIENsYXNzU3RtdCkpO1xuICBjb25zdCBjbGFzc2VzID1cbiAgICAgIG1vZHVsZS5zdGF0ZW1lbnRzLmZpbHRlcihzdGF0ZW1lbnQgPT4gc3RhdGVtZW50IGluc3RhbmNlb2YgQ2xhc3NTdG10KSBhcyBDbGFzc1N0bXRbXTtcbiAgY29uc3QgY2xhc3NNYXAgPSBuZXcgTWFwKFxuICAgICAgY2xhc3Nlcy5tYXA8W3N0cmluZywgQ2xhc3NTdG10XT4oY2xhc3NTdGF0ZW1lbnQgPT4gW2NsYXNzU3RhdGVtZW50Lm5hbWUsIGNsYXNzU3RhdGVtZW50XSkpO1xuICBjb25zdCBjbGFzc05hbWVzID0gbmV3IFNldChjbGFzc2VzLm1hcChjbGFzc1N0YXRlbWVudCA9PiBjbGFzc1N0YXRlbWVudC5uYW1lKSk7XG5cbiAgY29uc3QgcHJlZml4OiB0cy5TdGF0ZW1lbnRbXSA9XG4gICAgICBwcmVmaXhTdGF0ZW1lbnRzLm1hcChzdGF0ZW1lbnQgPT4gc3RhdGVtZW50LnZpc2l0U3RhdGVtZW50KGNvbnZlcnRlciwgc291cmNlRmlsZSkpO1xuXG4gIC8vIEFkZCBzdGF0aWMgbWV0aG9kcyB0byBhbGwgdGhlIGNsYXNzZXMgcmVmZXJlbmNlZCBpbiBtb2R1bGUuXG4gIGxldCBuZXdTdGF0ZW1lbnRzID0gc291cmNlRmlsZS5zdGF0ZW1lbnRzLm1hcChub2RlID0+IHtcbiAgICBpZiAobm9kZS5raW5kID09IHRzLlN5bnRheEtpbmQuQ2xhc3NEZWNsYXJhdGlvbikge1xuICAgICAgY29uc3QgY2xhc3NEZWNsYXJhdGlvbiA9IG5vZGUgYXMgdHMuQ2xhc3NEZWNsYXJhdGlvbjtcbiAgICAgIGNvbnN0IG5hbWUgPSBjbGFzc0RlY2xhcmF0aW9uLm5hbWU7XG4gICAgICBpZiAobmFtZSkge1xuICAgICAgICBjb25zdCBjbGFzc1N0YXRlbWVudCA9IGNsYXNzTWFwLmdldChuYW1lLnRleHQpO1xuICAgICAgICBpZiAoY2xhc3NTdGF0ZW1lbnQpIHtcbiAgICAgICAgICBjbGFzc05hbWVzLmRlbGV0ZShuYW1lLnRleHQpO1xuICAgICAgICAgIGNvbnN0IGNsYXNzTWVtYmVySG9sZGVyID1cbiAgICAgICAgICAgICAgY29udmVydGVyLnZpc2l0RGVjbGFyZUNsYXNzU3RtdChjbGFzc1N0YXRlbWVudCkgYXMgdHMuQ2xhc3NEZWNsYXJhdGlvbjtcbiAgICAgICAgICBjb25zdCBuZXdNZXRob2RzID1cbiAgICAgICAgICAgICAgY2xhc3NNZW1iZXJIb2xkZXIubWVtYmVycy5maWx0ZXIobWVtYmVyID0+IG1lbWJlci5raW5kICE9PSB0cy5TeW50YXhLaW5kLkNvbnN0cnVjdG9yKTtcbiAgICAgICAgICBjb25zdCBuZXdNZW1iZXJzID0gWy4uLmNsYXNzRGVjbGFyYXRpb24ubWVtYmVycywgLi4ubmV3TWV0aG9kc107XG5cbiAgICAgICAgICByZXR1cm4gdHMudXBkYXRlQ2xhc3NEZWNsYXJhdGlvbihcbiAgICAgICAgICAgICAgY2xhc3NEZWNsYXJhdGlvbixcbiAgICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyBjbGFzc0RlY2xhcmF0aW9uLmRlY29yYXRvcnMsXG4gICAgICAgICAgICAgIC8qIG1vZGlmaWVycyAqLyBjbGFzc0RlY2xhcmF0aW9uLm1vZGlmaWVycyxcbiAgICAgICAgICAgICAgLyogbmFtZSAqLyBjbGFzc0RlY2xhcmF0aW9uLm5hbWUsXG4gICAgICAgICAgICAgIC8qIHR5cGVQYXJhbWV0ZXJzICovIGNsYXNzRGVjbGFyYXRpb24udHlwZVBhcmFtZXRlcnMsXG4gICAgICAgICAgICAgIC8qIGhlcml0YWdlQ2xhdXNlcyAqLyBjbGFzc0RlY2xhcmF0aW9uLmhlcml0YWdlQ2xhdXNlcyB8fCBbXSxcbiAgICAgICAgICAgICAgLyogbWVtYmVycyAqLyBuZXdNZW1iZXJzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbm9kZTtcbiAgfSk7XG5cbiAgLy8gVmFsaWRhdGUgdGhhdCBhbGwgdGhlIGNsYXNzZXMgaGF2ZSBiZWVuIGdlbmVyYXRlZFxuICBjbGFzc05hbWVzLnNpemUgPT0gMCB8fFxuICAgICAgZXJyb3IoXG4gICAgICAgICAgYCR7Y2xhc3NOYW1lcy5zaXplID09IDEgPyAnQ2xhc3MnIDogJ0NsYXNzZXMnfSBcIiR7QXJyYXkuZnJvbShjbGFzc05hbWVzLmtleXMoKSkuam9pbignLCAnKX1cIiBub3QgZ2VuZXJhdGVkYCk7XG5cbiAgLy8gQWRkIGltcG9ydHMgdG8gdGhlIG1vZHVsZSByZXF1aXJlZCBieSB0aGUgbmV3IG1ldGhvZHNcbiAgY29uc3QgaW1wb3J0cyA9IGNvbnZlcnRlci5nZXRJbXBvcnRzKCk7XG4gIGlmIChpbXBvcnRzICYmIGltcG9ydHMubGVuZ3RoKSB7XG4gICAgLy8gRmluZCB3aGVyZSB0aGUgbmV3IGltcG9ydHMgc2hvdWxkIGdvXG4gICAgY29uc3QgaW5kZXggPSBmaXJzdEFmdGVyKFxuICAgICAgICBuZXdTdGF0ZW1lbnRzLCBzdGF0ZW1lbnQgPT4gc3RhdGVtZW50LmtpbmQgPT09IHRzLlN5bnRheEtpbmQuSW1wb3J0RGVjbGFyYXRpb24gfHxcbiAgICAgICAgICAgIHN0YXRlbWVudC5raW5kID09PSB0cy5TeW50YXhLaW5kLkltcG9ydEVxdWFsc0RlY2xhcmF0aW9uKTtcbiAgICBuZXdTdGF0ZW1lbnRzID1cbiAgICAgICAgWy4uLm5ld1N0YXRlbWVudHMuc2xpY2UoMCwgaW5kZXgpLCAuLi5pbXBvcnRzLCAuLi5wcmVmaXgsIC4uLm5ld1N0YXRlbWVudHMuc2xpY2UoaW5kZXgpXTtcbiAgfSBlbHNlIHtcbiAgICBuZXdTdGF0ZW1lbnRzID0gWy4uLnByZWZpeCwgLi4ubmV3U3RhdGVtZW50c107XG4gIH1cblxuICBjb252ZXJ0ZXIudXBkYXRlU291cmNlTWFwKG5ld1N0YXRlbWVudHMpO1xuICBjb25zdCBuZXdTb3VyY2VGaWxlID0gdHMudXBkYXRlU291cmNlRmlsZU5vZGUoc291cmNlRmlsZSwgbmV3U3RhdGVtZW50cyk7XG5cbiAgcmV0dXJuIFtuZXdTb3VyY2VGaWxlLCBjb252ZXJ0ZXIuZ2V0Tm9kZU1hcCgpXTtcbn1cblxuLy8gUmV0dXJuIHRoZSBpbmRleCBhZnRlciB0aGUgZmlyc3QgdmFsdWUgaW4gYGFgIHRoYXQgZG9lc24ndCBtYXRjaCB0aGUgcHJlZGljYXRlIGFmdGVyIGEgdmFsdWUgdGhhdFxuLy8gZG9lcyBvciAwIGlmIG5vIHZhbHVlcyBtYXRjaC5cbmZ1bmN0aW9uIGZpcnN0QWZ0ZXI8VD4oYTogVFtdLCBwcmVkaWNhdGU6ICh2YWx1ZTogVCkgPT4gYm9vbGVhbikge1xuICBsZXQgaW5kZXggPSAwO1xuICBjb25zdCBsZW4gPSBhLmxlbmd0aDtcbiAgZm9yICg7IGluZGV4IDwgbGVuOyBpbmRleCsrKSB7XG4gICAgY29uc3QgdmFsdWUgPSBhW2luZGV4XTtcbiAgICBpZiAocHJlZGljYXRlKHZhbHVlKSkgYnJlYWs7XG4gIH1cbiAgaWYgKGluZGV4ID49IGxlbikgcmV0dXJuIDA7XG4gIGZvciAoOyBpbmRleCA8IGxlbjsgaW5kZXgrKykge1xuICAgIGNvbnN0IHZhbHVlID0gYVtpbmRleF07XG4gICAgaWYgKCFwcmVkaWNhdGUodmFsdWUpKSBicmVhaztcbiAgfVxuICByZXR1cm4gaW5kZXg7XG59XG5cbi8vIEEgcmVjb3JkZWQgbm9kZSBpcyBhIHN1YnR5cGUgb2YgdGhlIG5vZGUgdGhhdCBpcyBtYXJrZWQgYXMgYmVpbmcgcmVjb3JkZWQuIFRoaXMgaXMgdXNlZFxuLy8gdG8gZW5zdXJlIHRoYXQgTm9kZUVtaXR0ZXJWaXNpdG9yLnJlY29yZCBoYXMgYmVlbiBjYWxsZWQgb24gYWxsIG5vZGVzIHJldHVybmVkIGJ5IHRoZVxuLy8gTm9kZUVtaXR0ZXJWaXNpdG9yXG5leHBvcnQgdHlwZSBSZWNvcmRlZE5vZGU8VCBleHRlbmRzIHRzLk5vZGUgPSB0cy5Ob2RlPiA9IChUICYgeyBfX3JlY29yZGVkOiBhbnk7fSkgfCBudWxsO1xuXG5mdW5jdGlvbiBlc2NhcGVMaXRlcmFsKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdmFsdWUucmVwbGFjZSgvKFxcXCJ8XFxcXCkvZywgJ1xcXFwkMScpLnJlcGxhY2UoLyhcXG4pfChcXHIpL2csIGZ1bmN0aW9uKHYsIG4sIHIpIHtcbiAgICByZXR1cm4gbiA/ICdcXFxcbicgOiAnXFxcXHInO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlTGl0ZXJhbCh2YWx1ZTogYW55KSB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgIHJldHVybiB0cy5jcmVhdGVOdWxsKCk7XG4gIH0gZWxzZSBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB0cy5jcmVhdGVJZGVudGlmaWVyKCd1bmRlZmluZWQnKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCByZXN1bHQgPSB0cy5jcmVhdGVMaXRlcmFsKHZhbHVlKTtcbiAgICBpZiAodHMuaXNTdHJpbmdMaXRlcmFsKHJlc3VsdCkgJiYgcmVzdWx0LnRleHQuaW5kZXhPZignXFxcXCcpID49IDApIHtcbiAgICAgIC8vIEhhY2sgdG8gYXZvaWQgcHJvYmxlbXMgY2F1c2UgaW5kaXJlY3RseSBieTpcbiAgICAgIC8vICAgIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMjAxOTJcbiAgICAgIC8vIFRoaXMgYXZvaWRzIHRoZSBzdHJpbmcgZXNjYXBpbmcgbm9ybWFsbHkgcGVyZm9ybWVkIGZvciBhIHN0cmluZyByZWx5aW5nIG9uIHRoYXRcbiAgICAgIC8vIFR5cGVTY3JpcHQganVzdCBlbWl0cyB0aGUgdGV4dCByYXcgZm9yIGEgbnVtZXJpYyBsaXRlcmFsLlxuICAgICAgKHJlc3VsdCBhcyBhbnkpLmtpbmQgPSB0cy5TeW50YXhLaW5kLk51bWVyaWNMaXRlcmFsO1xuICAgICAgcmVzdWx0LnRleHQgPSBgXCIke2VzY2FwZUxpdGVyYWwocmVzdWx0LnRleHQpfVwiYDtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0V4cG9ydFR5cGVTdGF0ZW1lbnQoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQpOiBib29sZWFuIHtcbiAgcmV0dXJuICEhc3RhdGVtZW50Lm1vZGlmaWVycyAmJlxuICAgICAgc3RhdGVtZW50Lm1vZGlmaWVycy5zb21lKG1vZCA9PiBtb2Qua2luZCA9PT0gdHMuU3ludGF4S2luZC5FeHBvcnRLZXl3b3JkKTtcbn1cblxuLyoqXG4gKiBWaXNpdHMgYW4gb3V0cHV0IGFzdCBhbmQgcHJvZHVjZXMgdGhlIGNvcnJlc3BvbmRpbmcgVHlwZVNjcmlwdCBzeW50aGV0aWMgbm9kZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBOb2RlRW1pdHRlclZpc2l0b3IgaW1wbGVtZW50cyBTdGF0ZW1lbnRWaXNpdG9yLCBFeHByZXNzaW9uVmlzaXRvciB7XG4gIHByaXZhdGUgX25vZGVNYXAgPSBuZXcgTWFwPHRzLk5vZGUsIE5vZGU+KCk7XG4gIHByaXZhdGUgX2ltcG9ydHNXaXRoUHJlZml4ZXMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBwcml2YXRlIF9yZWV4cG9ydHMgPSBuZXcgTWFwPHN0cmluZywge25hbWU6IHN0cmluZywgYXM6IHN0cmluZ31bXT4oKTtcbiAgcHJpdmF0ZSBfdGVtcGxhdGVTb3VyY2VzID0gbmV3IE1hcDxQYXJzZVNvdXJjZUZpbGUsIHRzLlNvdXJjZU1hcFNvdXJjZT4oKTtcbiAgcHJpdmF0ZSBfZXhwb3J0ZWRWYXJpYWJsZUlkZW50aWZpZXJzID0gbmV3IE1hcDxzdHJpbmcsIHRzLklkZW50aWZpZXI+KCk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcjogYm9vbGVhbikge31cblxuICAvKipcbiAgICogUHJvY2VzcyB0aGUgc291cmNlIGZpbGUgYW5kIGNvbGxlY3QgZXhwb3J0ZWQgaWRlbnRpZmllcnMgdGhhdCByZWZlciB0byB2YXJpYWJsZXMuXG4gICAqXG4gICAqIE9ubHkgdmFyaWFibGVzIGFyZSBjb2xsZWN0ZWQgYmVjYXVzZSBleHBvcnRlZCBjbGFzc2VzIHN0aWxsIGV4aXN0IGluIHRoZSBtb2R1bGUgc2NvcGUgaW5cbiAgICogQ29tbW9uSlMsIHdoZXJlYXMgdmFyaWFibGVzIGhhdmUgdGhlaXIgZGVjbGFyYXRpb25zIG1vdmVkIG9udG8gdGhlIGBleHBvcnRzYCBvYmplY3QsIGFuZCBhbGxcbiAgICogcmVmZXJlbmNlcyBhcmUgdXBkYXRlZCBhY2NvcmRpbmdseS5cbiAgICovXG4gIGxvYWRFeHBvcnRlZFZhcmlhYmxlSWRlbnRpZmllcnMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIHNvdXJjZUZpbGUuc3RhdGVtZW50cy5mb3JFYWNoKHN0YXRlbWVudCA9PiB7XG4gICAgICBpZiAodHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdGF0ZW1lbnQpICYmIGlzRXhwb3J0VHlwZVN0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgICAgIHN0YXRlbWVudC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zLmZvckVhY2goZGVjbGFyYXRpb24gPT4ge1xuICAgICAgICAgIGlmICh0cy5pc0lkZW50aWZpZXIoZGVjbGFyYXRpb24ubmFtZSkpIHtcbiAgICAgICAgICAgIHRoaXMuX2V4cG9ydGVkVmFyaWFibGVJZGVudGlmaWVycy5zZXQoZGVjbGFyYXRpb24ubmFtZS50ZXh0LCBkZWNsYXJhdGlvbi5uYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgZ2V0UmVleHBvcnRzKCk6IHRzLlN0YXRlbWVudFtdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLl9yZWV4cG9ydHMuZW50cmllcygpKVxuICAgICAgICAubWFwKFxuICAgICAgICAgICAgKFtleHBvcnRlZEZpbGVQYXRoLCByZWV4cG9ydHNdKSA9PiB0cy5jcmVhdGVFeHBvcnREZWNsYXJhdGlvbihcbiAgICAgICAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLCB0cy5jcmVhdGVOYW1lZEV4cG9ydHMocmVleHBvcnRzLm1hcChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHtuYW1lLCBhc30pID0+IHRzLmNyZWF0ZUV4cG9ydFNwZWNpZmllcihuYW1lLCBhcykpKSxcbiAgICAgICAgICAgICAgICAvKiBtb2R1bGVTcGVjaWZpZXIgKi8gY3JlYXRlTGl0ZXJhbChleHBvcnRlZEZpbGVQYXRoKSkpO1xuICB9XG5cbiAgZ2V0SW1wb3J0cygpOiB0cy5TdGF0ZW1lbnRbXSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5faW1wb3J0c1dpdGhQcmVmaXhlcy5lbnRyaWVzKCkpXG4gICAgICAgIC5tYXAoXG4gICAgICAgICAgICAoW25hbWVzcGFjZSwgcHJlZml4XSkgPT4gdHMuY3JlYXRlSW1wb3J0RGVjbGFyYXRpb24oXG4gICAgICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAvKiBpbXBvcnRDbGF1c2UgKi8gdHMuY3JlYXRlSW1wb3J0Q2xhdXNlKFxuICAgICAgICAgICAgICAgICAgICAvKiBuYW1lICovPHRzLklkZW50aWZpZXI+KHVuZGVmaW5lZCBhcyBhbnkpLFxuICAgICAgICAgICAgICAgICAgICB0cy5jcmVhdGVOYW1lc3BhY2VJbXBvcnQodHMuY3JlYXRlSWRlbnRpZmllcihwcmVmaXgpKSksXG4gICAgICAgICAgICAgICAgLyogbW9kdWxlU3BlY2lmaWVyICovIGNyZWF0ZUxpdGVyYWwobmFtZXNwYWNlKSkpO1xuICB9XG5cbiAgZ2V0Tm9kZU1hcCgpIHsgcmV0dXJuIHRoaXMuX25vZGVNYXA7IH1cblxuICB1cGRhdGVTb3VyY2VNYXAoc3RhdGVtZW50czogdHMuU3RhdGVtZW50W10pIHtcbiAgICBsZXQgbGFzdFJhbmdlU3RhcnROb2RlOiB0cy5Ob2RlfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBsZXQgbGFzdFJhbmdlRW5kTm9kZTogdHMuTm9kZXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgbGV0IGxhc3RSYW5nZTogdHMuU291cmNlTWFwUmFuZ2V8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gICAgY29uc3QgcmVjb3JkTGFzdFNvdXJjZVJhbmdlID0gKCkgPT4ge1xuICAgICAgaWYgKGxhc3RSYW5nZSAmJiBsYXN0UmFuZ2VTdGFydE5vZGUgJiYgbGFzdFJhbmdlRW5kTm9kZSkge1xuICAgICAgICBpZiAobGFzdFJhbmdlU3RhcnROb2RlID09IGxhc3RSYW5nZUVuZE5vZGUpIHtcbiAgICAgICAgICB0cy5zZXRTb3VyY2VNYXBSYW5nZShsYXN0UmFuZ2VFbmROb2RlLCBsYXN0UmFuZ2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRzLnNldFNvdXJjZU1hcFJhbmdlKGxhc3RSYW5nZVN0YXJ0Tm9kZSwgbGFzdFJhbmdlKTtcbiAgICAgICAgICAvLyBPbmx5IGVtaXQgdGhlIHBvcyBmb3IgdGhlIGZpcnN0IG5vZGUgZW1pdHRlZCBpbiB0aGUgcmFuZ2UuXG4gICAgICAgICAgdHMuc2V0RW1pdEZsYWdzKGxhc3RSYW5nZVN0YXJ0Tm9kZSwgdHMuRW1pdEZsYWdzLk5vVHJhaWxpbmdTb3VyY2VNYXApO1xuICAgICAgICAgIHRzLnNldFNvdXJjZU1hcFJhbmdlKGxhc3RSYW5nZUVuZE5vZGUsIGxhc3RSYW5nZSk7XG4gICAgICAgICAgLy8gT25seSBlbWl0IGVtaXQgZW5kIGZvciB0aGUgbGFzdCBub2RlIGVtaXR0ZWQgaW4gdGhlIHJhbmdlLlxuICAgICAgICAgIHRzLnNldEVtaXRGbGFncyhsYXN0UmFuZ2VFbmROb2RlLCB0cy5FbWl0RmxhZ3MuTm9MZWFkaW5nU291cmNlTWFwKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCB2aXNpdE5vZGUgPSAodHNOb2RlOiB0cy5Ob2RlKSA9PiB7XG4gICAgICBjb25zdCBuZ05vZGUgPSB0aGlzLl9ub2RlTWFwLmdldCh0c05vZGUpO1xuICAgICAgaWYgKG5nTm9kZSkge1xuICAgICAgICBjb25zdCByYW5nZSA9IHRoaXMuc291cmNlUmFuZ2VPZihuZ05vZGUpO1xuICAgICAgICBpZiAocmFuZ2UpIHtcbiAgICAgICAgICBpZiAoIWxhc3RSYW5nZSB8fCByYW5nZS5zb3VyY2UgIT0gbGFzdFJhbmdlLnNvdXJjZSB8fCByYW5nZS5wb3MgIT0gbGFzdFJhbmdlLnBvcyB8fFxuICAgICAgICAgICAgICByYW5nZS5lbmQgIT0gbGFzdFJhbmdlLmVuZCkge1xuICAgICAgICAgICAgcmVjb3JkTGFzdFNvdXJjZVJhbmdlKCk7XG4gICAgICAgICAgICBsYXN0UmFuZ2VTdGFydE5vZGUgPSB0c05vZGU7XG4gICAgICAgICAgICBsYXN0UmFuZ2UgPSByYW5nZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbGFzdFJhbmdlRW5kTm9kZSA9IHRzTm9kZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdHMuZm9yRWFjaENoaWxkKHRzTm9kZSwgdmlzaXROb2RlKTtcbiAgICB9O1xuICAgIHN0YXRlbWVudHMuZm9yRWFjaCh2aXNpdE5vZGUpO1xuICAgIHJlY29yZExhc3RTb3VyY2VSYW5nZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSByZWNvcmQ8VCBleHRlbmRzIHRzLk5vZGU+KG5nTm9kZTogTm9kZSwgdHNOb2RlOiBUfG51bGwpOiBSZWNvcmRlZE5vZGU8VD4ge1xuICAgIGlmICh0c05vZGUgJiYgIXRoaXMuX25vZGVNYXAuaGFzKHRzTm9kZSkpIHtcbiAgICAgIHRoaXMuX25vZGVNYXAuc2V0KHRzTm9kZSwgbmdOb2RlKTtcbiAgICB9XG4gICAgcmV0dXJuIHRzTm9kZSBhcyBSZWNvcmRlZE5vZGU8VD47XG4gIH1cblxuICBwcml2YXRlIHNvdXJjZVJhbmdlT2Yobm9kZTogTm9kZSk6IHRzLlNvdXJjZU1hcFJhbmdlfG51bGwge1xuICAgIGlmIChub2RlLnNvdXJjZVNwYW4pIHtcbiAgICAgIGNvbnN0IHNwYW4gPSBub2RlLnNvdXJjZVNwYW47XG4gICAgICBpZiAoc3Bhbi5zdGFydC5maWxlID09IHNwYW4uZW5kLmZpbGUpIHtcbiAgICAgICAgY29uc3QgZmlsZSA9IHNwYW4uc3RhcnQuZmlsZTtcbiAgICAgICAgaWYgKGZpbGUudXJsKSB7XG4gICAgICAgICAgbGV0IHNvdXJjZSA9IHRoaXMuX3RlbXBsYXRlU291cmNlcy5nZXQoZmlsZSk7XG4gICAgICAgICAgaWYgKCFzb3VyY2UpIHtcbiAgICAgICAgICAgIHNvdXJjZSA9IHRzLmNyZWF0ZVNvdXJjZU1hcFNvdXJjZShmaWxlLnVybCwgZmlsZS5jb250ZW50LCBwb3MgPT4gcG9zKTtcbiAgICAgICAgICAgIHRoaXMuX3RlbXBsYXRlU291cmNlcy5zZXQoZmlsZSwgc291cmNlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHtwb3M6IHNwYW4uc3RhcnQub2Zmc2V0LCBlbmQ6IHNwYW4uZW5kLm9mZnNldCwgc291cmNlfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0TW9kaWZpZXJzKHN0bXQ6IFN0YXRlbWVudCkge1xuICAgIGxldCBtb2RpZmllcnM6IHRzLk1vZGlmaWVyW10gPSBbXTtcbiAgICBpZiAoc3RtdC5oYXNNb2RpZmllcihTdG10TW9kaWZpZXIuRXhwb3J0ZWQpKSB7XG4gICAgICBtb2RpZmllcnMucHVzaCh0cy5jcmVhdGVUb2tlbih0cy5TeW50YXhLaW5kLkV4cG9ydEtleXdvcmQpKTtcbiAgICB9XG4gICAgcmV0dXJuIG1vZGlmaWVycztcbiAgfVxuXG4gIC8vIFN0YXRlbWVudFZpc2l0b3JcbiAgdmlzaXREZWNsYXJlVmFyU3RtdChzdG10OiBEZWNsYXJlVmFyU3RtdCkge1xuICAgIGlmIChzdG10Lmhhc01vZGlmaWVyKFN0bXRNb2RpZmllci5FeHBvcnRlZCkgJiYgc3RtdC52YWx1ZSBpbnN0YW5jZW9mIEV4dGVybmFsRXhwciAmJlxuICAgICAgICAhc3RtdC50eXBlKSB7XG4gICAgICAvLyBjaGVjayBmb3IgYSByZWV4cG9ydFxuICAgICAgY29uc3Qge25hbWUsIG1vZHVsZU5hbWV9ID0gc3RtdC52YWx1ZS52YWx1ZTtcbiAgICAgIGlmIChtb2R1bGVOYW1lKSB7XG4gICAgICAgIGxldCByZWV4cG9ydHMgPSB0aGlzLl9yZWV4cG9ydHMuZ2V0KG1vZHVsZU5hbWUpO1xuICAgICAgICBpZiAoIXJlZXhwb3J0cykge1xuICAgICAgICAgIHJlZXhwb3J0cyA9IFtdO1xuICAgICAgICAgIHRoaXMuX3JlZXhwb3J0cy5zZXQobW9kdWxlTmFtZSwgcmVleHBvcnRzKTtcbiAgICAgICAgfVxuICAgICAgICByZWV4cG9ydHMucHVzaCh7bmFtZTogbmFtZSAhLCBhczogc3RtdC5uYW1lfSk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHZhckRlY2xMaXN0ID0gdHMuY3JlYXRlVmFyaWFibGVEZWNsYXJhdGlvbkxpc3QoW3RzLmNyZWF0ZVZhcmlhYmxlRGVjbGFyYXRpb24oXG4gICAgICAgIHRzLmNyZWF0ZUlkZW50aWZpZXIoc3RtdC5uYW1lKSxcbiAgICAgICAgLyogdHlwZSAqLyB1bmRlZmluZWQsXG4gICAgICAgIChzdG10LnZhbHVlICYmIHN0bXQudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSB8fCB1bmRlZmluZWQpXSk7XG5cbiAgICBpZiAoc3RtdC5oYXNNb2RpZmllcihTdG10TW9kaWZpZXIuRXhwb3J0ZWQpKSB7XG4gICAgICAvLyBOb3RlOiBXZSBuZWVkIHRvIGFkZCBhbiBleHBsaWNpdCB2YXJpYWJsZSBhbmQgZXhwb3J0IGRlY2xhcmF0aW9uIHNvIHRoYXRcbiAgICAgIC8vIHRoZSB2YXJpYWJsZSBjYW4gYmUgcmVmZXJyZWQgaW4gdGhlIHNhbWUgZmlsZSBhcyB3ZWxsLlxuICAgICAgY29uc3QgdHNWYXJTdG10ID1cbiAgICAgICAgICB0aGlzLnJlY29yZChzdG10LCB0cy5jcmVhdGVWYXJpYWJsZVN0YXRlbWVudCgvKiBtb2RpZmllcnMgKi9bXSwgdmFyRGVjbExpc3QpKTtcbiAgICAgIGNvbnN0IGV4cG9ydFN0bXQgPSB0aGlzLnJlY29yZChcbiAgICAgICAgICBzdG10LCB0cy5jcmVhdGVFeHBvcnREZWNsYXJhdGlvbihcbiAgICAgICAgICAgICAgICAgICAgLypkZWNvcmF0b3JzKi8gdW5kZWZpbmVkLCAvKm1vZGlmaWVycyovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgdHMuY3JlYXRlTmFtZWRFeHBvcnRzKFt0cy5jcmVhdGVFeHBvcnRTcGVjaWZpZXIoc3RtdC5uYW1lLCBzdG10Lm5hbWUpXSkpKTtcbiAgICAgIHJldHVybiBbdHNWYXJTdG10LCBleHBvcnRTdG10XTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKHN0bXQsIHRzLmNyZWF0ZVZhcmlhYmxlU3RhdGVtZW50KHRoaXMuZ2V0TW9kaWZpZXJzKHN0bXQpLCB2YXJEZWNsTGlzdCkpO1xuICB9XG5cbiAgdmlzaXREZWNsYXJlRnVuY3Rpb25TdG10KHN0bXQ6IERlY2xhcmVGdW5jdGlvblN0bXQpIHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIHN0bXQsIHRzLmNyZWF0ZUZ1bmN0aW9uRGVjbGFyYXRpb24oXG4gICAgICAgICAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCwgdGhpcy5nZXRNb2RpZmllcnMoc3RtdCksXG4gICAgICAgICAgICAgICAgICAvKiBhc3Rlcmlza1Rva2VuICovIHVuZGVmaW5lZCwgc3RtdC5uYW1lLCAvKiB0eXBlUGFyYW1ldGVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICBzdG10LnBhcmFtcy5tYXAoXG4gICAgICAgICAgICAgICAgICAgICAgcCA9PiB0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLCAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBkb3REb3REb3RUb2tlbiAqLyB1bmRlZmluZWQsIHAubmFtZSkpLFxuICAgICAgICAgICAgICAgICAgLyogdHlwZSAqLyB1bmRlZmluZWQsIHRoaXMuX3Zpc2l0U3RhdGVtZW50cyhzdG10LnN0YXRlbWVudHMpKSk7XG4gIH1cblxuICB2aXNpdEV4cHJlc3Npb25TdG10KHN0bXQ6IEV4cHJlc3Npb25TdGF0ZW1lbnQpIHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoc3RtdCwgdHMuY3JlYXRlU3RhdGVtZW50KHN0bXQuZXhwci52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpKTtcbiAgfVxuXG4gIHZpc2l0UmV0dXJuU3RtdChzdG10OiBSZXR1cm5TdGF0ZW1lbnQpIHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIHN0bXQsIHRzLmNyZWF0ZVJldHVybihzdG10LnZhbHVlID8gc3RtdC52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkgOiB1bmRlZmluZWQpKTtcbiAgfVxuXG4gIHZpc2l0RGVjbGFyZUNsYXNzU3RtdChzdG10OiBDbGFzc1N0bXQpIHtcbiAgICBjb25zdCBtb2RpZmllcnMgPSB0aGlzLmdldE1vZGlmaWVycyhzdG10KTtcbiAgICBjb25zdCBmaWVsZHMgPSBzdG10LmZpZWxkcy5tYXAoZmllbGQgPT4ge1xuICAgICAgY29uc3QgcHJvcGVydHkgPSB0cy5jcmVhdGVQcm9wZXJ0eShcbiAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCwgLyogbW9kaWZpZXJzICovIHRyYW5zbGF0ZU1vZGlmaWVycyhmaWVsZC5tb2RpZmllcnMpLFxuICAgICAgICAgIGZpZWxkLm5hbWUsXG4gICAgICAgICAgLyogcXVlc3Rpb25Ub2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgLyogdHlwZSAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgZmllbGQuaW5pdGlhbGl6ZXIgPT0gbnVsbCA/IHRzLmNyZWF0ZU51bGwoKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkLmluaXRpYWxpemVyLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSk7XG5cbiAgICAgIGlmICh0aGlzLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyKSB7XG4gICAgICAgIC8vIENsb3N1cmUgY29tcGlsZXIgdHJhbnNmb3JtcyB0aGUgZm9ybSBgU2VydmljZS7JtXByb3YgPSBYYCBpbnRvIGBTZXJ2aWNlJMm1cHJvdiA9IFhgLiBUb1xuICAgICAgICAvLyBwcmV2ZW50IHRoaXMgdHJhbnNmb3JtYXRpb24sIHN1Y2ggYXNzaWdubWVudHMgbmVlZCB0byBiZSBhbm5vdGF0ZWQgd2l0aCBAbm9jb2xsYXBzZS5cbiAgICAgICAgLy8gTm90ZSB0aGF0IHRzaWNrbGUgaXMgdHlwaWNhbGx5IHJlc3BvbnNpYmxlIGZvciBhZGRpbmcgc3VjaCBhbm5vdGF0aW9ucywgaG93ZXZlciBpdFxuICAgICAgICAvLyBkb2Vzbid0IHlldCBoYW5kbGUgc3ludGhldGljIGZpZWxkcyBhZGRlZCBkdXJpbmcgb3RoZXIgdHJhbnNmb3JtYXRpb25zLlxuICAgICAgICB0cy5hZGRTeW50aGV0aWNMZWFkaW5nQ29tbWVudChcbiAgICAgICAgICAgIHByb3BlcnR5LCB0cy5TeW50YXhLaW5kLk11bHRpTGluZUNvbW1lbnRUcml2aWEsICcqIEBub2NvbGxhcHNlICcsXG4gICAgICAgICAgICAvKiBoYXNUcmFpbGluZ05ld0xpbmUgKi8gZmFsc2UpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcHJvcGVydHk7XG4gICAgfSk7XG4gICAgY29uc3QgZ2V0dGVycyA9IHN0bXQuZ2V0dGVycy5tYXAoXG4gICAgICAgIGdldHRlciA9PiB0cy5jcmVhdGVHZXRBY2Nlc3NvcihcbiAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLCAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLCBnZXR0ZXIubmFtZSwgLyogcGFyYW1ldGVycyAqL1tdLFxuICAgICAgICAgICAgLyogdHlwZSAqLyB1bmRlZmluZWQsIHRoaXMuX3Zpc2l0U3RhdGVtZW50cyhnZXR0ZXIuYm9keSkpKTtcblxuICAgIGNvbnN0IGNvbnN0cnVjdG9yID1cbiAgICAgICAgKHN0bXQuY29uc3RydWN0b3JNZXRob2QgJiYgW3RzLmNyZWF0ZUNvbnN0cnVjdG9yKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogcGFyYW1ldGVycyAqLyBzdG10LmNvbnN0cnVjdG9yTWV0aG9kLnBhcmFtcy5tYXAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcCA9PiB0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBkb3REb3REb3RUb2tlbiAqLyB1bmRlZmluZWQsIHAubmFtZSkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fdmlzaXRTdGF0ZW1lbnRzKHN0bXQuY29uc3RydWN0b3JNZXRob2QuYm9keSkpXSkgfHxcbiAgICAgICAgW107XG5cbiAgICAvLyBUT0RPIHtjaHVja2p9OiBEZXRlcm1pbmUgd2hhdCBzaG91bGQgYmUgZG9uZSBmb3IgYSBtZXRob2Qgd2l0aCBhIG51bGwgbmFtZS5cbiAgICBjb25zdCBtZXRob2RzID0gc3RtdC5tZXRob2RzLmZpbHRlcihtZXRob2QgPT4gbWV0aG9kLm5hbWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZCA9PiB0cy5jcmVhdGVNZXRob2QoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdHJhbnNsYXRlTW9kaWZpZXJzKG1ldGhvZC5tb2RpZmllcnMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBhc3RyaXNrVG9rZW4gKi8gdW5kZWZpbmVkLCBtZXRob2QubmFtZSAhLyogZ3VhcmRlZCBieSBmaWx0ZXIgKi8sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIHF1ZXN0aW9uVG9rZW4gKi8gdW5kZWZpbmVkLCAvKiB0eXBlUGFyYW1ldGVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZC5wYXJhbXMubWFwKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcCA9PiB0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogZG90RG90RG90VG9rZW4gKi8gdW5kZWZpbmVkLCBwLm5hbWUpKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogdHlwZSAqLyB1bmRlZmluZWQsIHRoaXMuX3Zpc2l0U3RhdGVtZW50cyhtZXRob2QuYm9keSkpKTtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIHN0bXQsIHRzLmNyZWF0ZUNsYXNzRGVjbGFyYXRpb24oXG4gICAgICAgICAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCwgbW9kaWZpZXJzLCBzdG10Lm5hbWUsIC8qIHR5cGVQYXJhbWV0ZXJzKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgc3RtdC5wYXJlbnQgJiYgW3RzLmNyZWF0ZUhlcml0YWdlQ2xhdXNlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLlN5bnRheEtpbmQuRXh0ZW5kc0tleXdvcmQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW3N0bXQucGFyZW50LnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKV0pXSB8fFxuICAgICAgICAgICAgICAgICAgICAgIFtdLFxuICAgICAgICAgICAgICAgICAgWy4uLmZpZWxkcywgLi4uZ2V0dGVycywgLi4uY29uc3RydWN0b3IsIC4uLm1ldGhvZHNdKSk7XG4gIH1cblxuICB2aXNpdElmU3RtdChzdG10OiBJZlN0bXQpIHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIHN0bXQsXG4gICAgICAgIHRzLmNyZWF0ZUlmKFxuICAgICAgICAgICAgc3RtdC5jb25kaXRpb24udmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpLCB0aGlzLl92aXNpdFN0YXRlbWVudHMoc3RtdC50cnVlQ2FzZSksXG4gICAgICAgICAgICBzdG10LmZhbHNlQ2FzZSAmJiBzdG10LmZhbHNlQ2FzZS5sZW5ndGggJiYgdGhpcy5fdmlzaXRTdGF0ZW1lbnRzKHN0bXQuZmFsc2VDYXNlKSB8fFxuICAgICAgICAgICAgICAgIHVuZGVmaW5lZCkpO1xuICB9XG5cbiAgdmlzaXRUcnlDYXRjaFN0bXQoc3RtdDogVHJ5Q2F0Y2hTdG10KTogUmVjb3JkZWROb2RlPHRzLlRyeVN0YXRlbWVudD4ge1xuICAgIHJldHVybiB0aGlzLnJlY29yZChcbiAgICAgICAgc3RtdCwgdHMuY3JlYXRlVHJ5KFxuICAgICAgICAgICAgICAgICAgdGhpcy5fdmlzaXRTdGF0ZW1lbnRzKHN0bXQuYm9keVN0bXRzKSxcbiAgICAgICAgICAgICAgICAgIHRzLmNyZWF0ZUNhdGNoQ2xhdXNlKFxuICAgICAgICAgICAgICAgICAgICAgIENBVENIX0VSUk9SX05BTUUsIHRoaXMuX3Zpc2l0U3RhdGVtZW50c1ByZWZpeChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW3RzLmNyZWF0ZVZhcmlhYmxlU3RhdGVtZW50KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt0cy5jcmVhdGVWYXJpYWJsZURlY2xhcmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIENBVENIX1NUQUNLX05BTUUsIC8qIHR5cGUgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5jcmVhdGVJZGVudGlmaWVyKENBVENIX0VSUk9SX05BTUUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5jcmVhdGVJZGVudGlmaWVyKENBVENIX1NUQUNLX05BTUUpKSldKV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0bXQuY2F0Y2hTdG10cykpLFxuICAgICAgICAgICAgICAgICAgLyogZmluYWxseUJsb2NrICovIHVuZGVmaW5lZCkpO1xuICB9XG5cbiAgdmlzaXRUaHJvd1N0bXQoc3RtdDogVGhyb3dTdG10KSB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKHN0bXQsIHRzLmNyZWF0ZVRocm93KHN0bXQuZXJyb3IudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSk7XG4gIH1cblxuICB2aXNpdENvbW1lbnRTdG10KHN0bXQ6IENvbW1lbnRTdG10LCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKSB7XG4gICAgY29uc3QgdGV4dCA9IHN0bXQubXVsdGlsaW5lID8gYCAke3N0bXQuY29tbWVudH0gYCA6IGAgJHtzdG10LmNvbW1lbnR9YDtcbiAgICByZXR1cm4gdGhpcy5jcmVhdGVDb21tZW50U3RtdCh0ZXh0LCBzdG10Lm11bHRpbGluZSwgc291cmNlRmlsZSk7XG4gIH1cblxuICB2aXNpdEpTRG9jQ29tbWVudFN0bXQoc3RtdDogSlNEb2NDb21tZW50U3RtdCwgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSkge1xuICAgIHJldHVybiB0aGlzLmNyZWF0ZUNvbW1lbnRTdG10KHN0bXQudG9TdHJpbmcoKSwgdHJ1ZSwgc291cmNlRmlsZSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUNvbW1lbnRTdG10KHRleHQ6IHN0cmluZywgbXVsdGlsaW5lOiBib29sZWFuLCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTpcbiAgICAgIHRzLk5vdEVtaXR0ZWRTdGF0ZW1lbnQge1xuICAgIGNvbnN0IGNvbW1lbnRTdG10ID0gdHMuY3JlYXRlTm90RW1pdHRlZFN0YXRlbWVudChzb3VyY2VGaWxlKTtcbiAgICBjb25zdCBraW5kID1cbiAgICAgICAgbXVsdGlsaW5lID8gdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhIDogdHMuU3ludGF4S2luZC5TaW5nbGVMaW5lQ29tbWVudFRyaXZpYTtcbiAgICB0cy5zZXRTeW50aGV0aWNMZWFkaW5nQ29tbWVudHMoY29tbWVudFN0bXQsIFt7a2luZCwgdGV4dCwgcG9zOiAtMSwgZW5kOiAtMX1dKTtcbiAgICByZXR1cm4gY29tbWVudFN0bXQ7XG4gIH1cblxuICAvLyBFeHByZXNzaW9uVmlzaXRvclxuICB2aXNpdFdyYXBwZWROb2RlRXhwcihleHByOiBXcmFwcGVkTm9kZUV4cHI8YW55PikgeyByZXR1cm4gdGhpcy5yZWNvcmQoZXhwciwgZXhwci5ub2RlKTsgfVxuXG4gIHZpc2l0VHlwZW9mRXhwcihleHByOiBUeXBlb2ZFeHByKSB7XG4gICAgY29uc3QgdHlwZU9mID0gdHMuY3JlYXRlVHlwZU9mKGV4cHIuZXhwci52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpO1xuICAgIHJldHVybiB0aGlzLnJlY29yZChleHByLCB0eXBlT2YpO1xuICB9XG5cbiAgLy8gRXhwcmVzc2lvblZpc2l0b3JcbiAgdmlzaXRSZWFkVmFyRXhwcihleHByOiBSZWFkVmFyRXhwcikge1xuICAgIHN3aXRjaCAoZXhwci5idWlsdGluKSB7XG4gICAgICBjYXNlIEJ1aWx0aW5WYXIuVGhpczpcbiAgICAgICAgcmV0dXJuIHRoaXMucmVjb3JkKGV4cHIsIHRzLmNyZWF0ZUlkZW50aWZpZXIoTUVUSE9EX1RISVNfTkFNRSkpO1xuICAgICAgY2FzZSBCdWlsdGluVmFyLkNhdGNoRXJyb3I6XG4gICAgICAgIHJldHVybiB0aGlzLnJlY29yZChleHByLCB0cy5jcmVhdGVJZGVudGlmaWVyKENBVENIX0VSUk9SX05BTUUpKTtcbiAgICAgIGNhc2UgQnVpbHRpblZhci5DYXRjaFN0YWNrOlxuICAgICAgICByZXR1cm4gdGhpcy5yZWNvcmQoZXhwciwgdHMuY3JlYXRlSWRlbnRpZmllcihDQVRDSF9TVEFDS19OQU1FKSk7XG4gICAgICBjYXNlIEJ1aWx0aW5WYXIuU3VwZXI6XG4gICAgICAgIHJldHVybiB0aGlzLnJlY29yZChleHByLCB0cy5jcmVhdGVTdXBlcigpKTtcbiAgICB9XG4gICAgaWYgKGV4cHIubmFtZSkge1xuICAgICAgcmV0dXJuIHRoaXMucmVjb3JkKGV4cHIsIHRzLmNyZWF0ZUlkZW50aWZpZXIoZXhwci5uYW1lKSk7XG4gICAgfVxuICAgIHRocm93IEVycm9yKGBVbmV4cGVjdGVkIFJlYWRWYXJFeHByIGZvcm1gKTtcbiAgfVxuXG4gIHZpc2l0V3JpdGVWYXJFeHByKGV4cHI6IFdyaXRlVmFyRXhwcik6IFJlY29yZGVkTm9kZTx0cy5CaW5hcnlFeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLCB0cy5jcmVhdGVBc3NpZ25tZW50KFxuICAgICAgICAgICAgICAgICAgdHMuY3JlYXRlSWRlbnRpZmllcihleHByLm5hbWUpLCBleHByLnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSkpO1xuICB9XG5cbiAgdmlzaXRXcml0ZUtleUV4cHIoZXhwcjogV3JpdGVLZXlFeHByKTogUmVjb3JkZWROb2RlPHRzLkJpbmFyeUV4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIGV4cHIsXG4gICAgICAgIHRzLmNyZWF0ZUFzc2lnbm1lbnQoXG4gICAgICAgICAgICB0cy5jcmVhdGVFbGVtZW50QWNjZXNzKFxuICAgICAgICAgICAgICAgIGV4cHIucmVjZWl2ZXIudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpLCBleHByLmluZGV4LnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSksXG4gICAgICAgICAgICBleHByLnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSkpO1xuICB9XG5cbiAgdmlzaXRXcml0ZVByb3BFeHByKGV4cHI6IFdyaXRlUHJvcEV4cHIpOiBSZWNvcmRlZE5vZGU8dHMuQmluYXJ5RXhwcmVzc2lvbj4ge1xuICAgIHJldHVybiB0aGlzLnJlY29yZChcbiAgICAgICAgZXhwciwgdHMuY3JlYXRlQXNzaWdubWVudChcbiAgICAgICAgICAgICAgICAgIHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKGV4cHIucmVjZWl2ZXIudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpLCBleHByLm5hbWUpLFxuICAgICAgICAgICAgICAgICAgZXhwci52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpKTtcbiAgfVxuXG4gIHZpc2l0SW52b2tlTWV0aG9kRXhwcihleHByOiBJbnZva2VNZXRob2RFeHByKTogUmVjb3JkZWROb2RlPHRzLkNhbGxFeHByZXNzaW9uPiB7XG4gICAgY29uc3QgbWV0aG9kTmFtZSA9IGdldE1ldGhvZE5hbWUoZXhwcik7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLFxuICAgICAgICB0cy5jcmVhdGVDYWxsKFxuICAgICAgICAgICAgdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoZXhwci5yZWNlaXZlci52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCksIG1ldGhvZE5hbWUpLFxuICAgICAgICAgICAgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsIGV4cHIuYXJncy5tYXAoYXJnID0+IGFyZy52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpKSk7XG4gIH1cblxuICB2aXNpdEludm9rZUZ1bmN0aW9uRXhwcihleHByOiBJbnZva2VGdW5jdGlvbkV4cHIpOiBSZWNvcmRlZE5vZGU8dHMuQ2FsbEV4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIGV4cHIsIHRzLmNyZWF0ZUNhbGwoXG4gICAgICAgICAgICAgICAgICBleHByLmZuLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSwgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICBleHByLmFyZ3MubWFwKGFyZyA9PiBhcmcudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSkpO1xuICB9XG5cbiAgdmlzaXRJbnN0YW50aWF0ZUV4cHIoZXhwcjogSW5zdGFudGlhdGVFeHByKTogUmVjb3JkZWROb2RlPHRzLk5ld0V4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIGV4cHIsIHRzLmNyZWF0ZU5ldyhcbiAgICAgICAgICAgICAgICAgIGV4cHIuY2xhc3NFeHByLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSwgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICBleHByLmFyZ3MubWFwKGFyZyA9PiBhcmcudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSkpO1xuICB9XG5cbiAgdmlzaXRMaXRlcmFsRXhwcihleHByOiBMaXRlcmFsRXhwcikgeyByZXR1cm4gdGhpcy5yZWNvcmQoZXhwciwgY3JlYXRlTGl0ZXJhbChleHByLnZhbHVlKSk7IH1cblxuICB2aXNpdExvY2FsaXplZFN0cmluZyhleHByOiBMb2NhbGl6ZWRTdHJpbmcsIGNvbnRleHQ6IGFueSkge1xuICAgIHRocm93IG5ldyBFcnJvcignbG9jYWxpemVkIHN0cmluZ3MgYXJlIG5vdCBzdXBwb3J0ZWQgaW4gcHJlLWl2eSBtb2RlLicpO1xuICB9XG5cbiAgdmlzaXRFeHRlcm5hbEV4cHIoZXhwcjogRXh0ZXJuYWxFeHByKSB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKGV4cHIsIHRoaXMuX3Zpc2l0SWRlbnRpZmllcihleHByLnZhbHVlKSk7XG4gIH1cblxuICB2aXNpdENvbmRpdGlvbmFsRXhwcihleHByOiBDb25kaXRpb25hbEV4cHIpOiBSZWNvcmRlZE5vZGU8dHMuUGFyZW50aGVzaXplZEV4cHJlc3Npb24+IHtcbiAgICAvLyBUT0RPIHtjaHVja2p9OiBSZXZpZXcgdXNlIG9mICEgb24gZmFsc2VDYXNlLiBTaG91bGQgaXQgYmUgbm9uLW51bGxhYmxlP1xuICAgIHJldHVybiB0aGlzLnJlY29yZChcbiAgICAgICAgZXhwcixcbiAgICAgICAgdHMuY3JlYXRlUGFyZW4odHMuY3JlYXRlQ29uZGl0aW9uYWwoXG4gICAgICAgICAgICBleHByLmNvbmRpdGlvbi52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCksIGV4cHIudHJ1ZUNhc2UudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpLFxuICAgICAgICAgICAgZXhwci5mYWxzZUNhc2UgIS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpKSk7XG4gIH1cblxuICB2aXNpdE5vdEV4cHIoZXhwcjogTm90RXhwcik6IFJlY29yZGVkTm9kZTx0cy5QcmVmaXhVbmFyeUV4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIGV4cHIsIHRzLmNyZWF0ZVByZWZpeChcbiAgICAgICAgICAgICAgICAgIHRzLlN5bnRheEtpbmQuRXhjbGFtYXRpb25Ub2tlbiwgZXhwci5jb25kaXRpb24udmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSk7XG4gIH1cblxuICB2aXNpdEFzc2VydE5vdE51bGxFeHByKGV4cHI6IEFzc2VydE5vdE51bGwpOiBSZWNvcmRlZE5vZGU8dHMuRXhwcmVzc2lvbj4ge1xuICAgIHJldHVybiBleHByLmNvbmRpdGlvbi52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCk7XG4gIH1cblxuICB2aXNpdENhc3RFeHByKGV4cHI6IENhc3RFeHByKTogUmVjb3JkZWROb2RlPHRzLkV4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gZXhwci52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCk7XG4gIH1cblxuICB2aXNpdEZ1bmN0aW9uRXhwcihleHByOiBGdW5jdGlvbkV4cHIpIHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIGV4cHIsIHRzLmNyZWF0ZUZ1bmN0aW9uRXhwcmVzc2lvbihcbiAgICAgICAgICAgICAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsIC8qIGFzdHJpc2tUb2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAvKiBuYW1lICovIGV4cHIubmFtZSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICBleHByLnBhcmFtcy5tYXAoXG4gICAgICAgICAgICAgICAgICAgICAgcCA9PiB0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLCAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBkb3REb3REb3RUb2tlbiAqLyB1bmRlZmluZWQsIHAubmFtZSkpLFxuICAgICAgICAgICAgICAgICAgLyogdHlwZSAqLyB1bmRlZmluZWQsIHRoaXMuX3Zpc2l0U3RhdGVtZW50cyhleHByLnN0YXRlbWVudHMpKSk7XG4gIH1cblxuICB2aXNpdEJpbmFyeU9wZXJhdG9yRXhwcihleHByOiBCaW5hcnlPcGVyYXRvckV4cHIpOlxuICAgICAgUmVjb3JkZWROb2RlPHRzLkJpbmFyeUV4cHJlc3Npb258dHMuUGFyZW50aGVzaXplZEV4cHJlc3Npb24+IHtcbiAgICBsZXQgYmluYXJ5T3BlcmF0b3I6IHRzLkJpbmFyeU9wZXJhdG9yO1xuICAgIHN3aXRjaCAoZXhwci5vcGVyYXRvcikge1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5BbmQ6XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5BbXBlcnNhbmRBbXBlcnNhbmRUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLkJpdHdpc2VBbmQ6XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5BbXBlcnNhbmRUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLkJpZ2dlcjpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkdyZWF0ZXJUaGFuVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5CaWdnZXJFcXVhbHM6XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5HcmVhdGVyVGhhbkVxdWFsc1Rva2VuO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQmluYXJ5T3BlcmF0b3IuRGl2aWRlOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuU2xhc2hUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLkVxdWFsczpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkVxdWFsc0VxdWFsc1Rva2VuO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQmluYXJ5T3BlcmF0b3IuSWRlbnRpY2FsOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuRXF1YWxzRXF1YWxzRXF1YWxzVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5Mb3dlcjpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkxlc3NUaGFuVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5Mb3dlckVxdWFsczpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkxlc3NUaGFuRXF1YWxzVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5NaW51czpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLk1pbnVzVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5Nb2R1bG86XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5QZXJjZW50VG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5NdWx0aXBseTpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkFzdGVyaXNrVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5Ob3RFcXVhbHM6XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5FeGNsYW1hdGlvbkVxdWFsc1Rva2VuO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQmluYXJ5T3BlcmF0b3IuTm90SWRlbnRpY2FsOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuRXhjbGFtYXRpb25FcXVhbHNFcXVhbHNUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLk9yOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuQmFyQmFyVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5QbHVzOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuUGx1c1Rva2VuO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBvcGVyYXRvcjogJHtleHByLm9wZXJhdG9yfWApO1xuICAgIH1cbiAgICBjb25zdCBiaW5hcnkgPSB0cy5jcmVhdGVCaW5hcnkoXG4gICAgICAgIGV4cHIubGhzLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSwgYmluYXJ5T3BlcmF0b3IsIGV4cHIucmhzLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSk7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKGV4cHIsIGV4cHIucGFyZW5zID8gdHMuY3JlYXRlUGFyZW4oYmluYXJ5KSA6IGJpbmFyeSk7XG4gIH1cblxuICB2aXNpdFJlYWRQcm9wRXhwcihleHByOiBSZWFkUHJvcEV4cHIpOiBSZWNvcmRlZE5vZGU8dHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLCB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhleHByLnJlY2VpdmVyLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSwgZXhwci5uYW1lKSk7XG4gIH1cblxuICB2aXNpdFJlYWRLZXlFeHByKGV4cHI6IFJlYWRLZXlFeHByKTogUmVjb3JkZWROb2RlPHRzLkVsZW1lbnRBY2Nlc3NFeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLFxuICAgICAgICB0cy5jcmVhdGVFbGVtZW50QWNjZXNzKFxuICAgICAgICAgICAgZXhwci5yZWNlaXZlci52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCksIGV4cHIuaW5kZXgudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSk7XG4gIH1cblxuICB2aXNpdExpdGVyYWxBcnJheUV4cHIoZXhwcjogTGl0ZXJhbEFycmF5RXhwcik6IFJlY29yZGVkTm9kZTx0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLCB0cy5jcmVhdGVBcnJheUxpdGVyYWwoZXhwci5lbnRyaWVzLm1hcChlbnRyeSA9PiBlbnRyeS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpKSk7XG4gIH1cblxuICB2aXNpdExpdGVyYWxNYXBFeHByKGV4cHI6IExpdGVyYWxNYXBFeHByKTogUmVjb3JkZWROb2RlPHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLCB0cy5jcmVhdGVPYmplY3RMaXRlcmFsKGV4cHIuZW50cmllcy5tYXAoXG4gICAgICAgICAgICAgICAgICBlbnRyeSA9PiB0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQoXG4gICAgICAgICAgICAgICAgICAgICAgZW50cnkucXVvdGVkIHx8ICFfVkFMSURfSURFTlRJRklFUl9SRS50ZXN0KGVudHJ5LmtleSkgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5jcmVhdGVMaXRlcmFsKGVudHJ5LmtleSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRyeS5rZXksXG4gICAgICAgICAgICAgICAgICAgICAgZW50cnkudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSkpKTtcbiAgfVxuXG4gIHZpc2l0Q29tbWFFeHByKGV4cHI6IENvbW1hRXhwcik6IFJlY29yZGVkTm9kZTx0cy5FeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLCBleHByLnBhcnRzLm1hcChlID0+IGUudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKVxuICAgICAgICAgICAgICAgICAgLnJlZHVjZTx0cy5FeHByZXNzaW9ufG51bGw+KFxuICAgICAgICAgICAgICAgICAgICAgIChsZWZ0LCByaWdodCkgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgbGVmdCA/IHRzLmNyZWF0ZUJpbmFyeShsZWZ0LCB0cy5TeW50YXhLaW5kLkNvbW1hVG9rZW4sIHJpZ2h0KSA6IHJpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgIG51bGwpKTtcbiAgfVxuXG4gIHByaXZhdGUgX3Zpc2l0U3RhdGVtZW50cyhzdGF0ZW1lbnRzOiBTdGF0ZW1lbnRbXSk6IHRzLkJsb2NrIHtcbiAgICByZXR1cm4gdGhpcy5fdmlzaXRTdGF0ZW1lbnRzUHJlZml4KFtdLCBzdGF0ZW1lbnRzKTtcbiAgfVxuXG4gIHByaXZhdGUgX3Zpc2l0U3RhdGVtZW50c1ByZWZpeChwcmVmaXg6IHRzLlN0YXRlbWVudFtdLCBzdGF0ZW1lbnRzOiBTdGF0ZW1lbnRbXSkge1xuICAgIHJldHVybiB0cy5jcmVhdGVCbG9jayhbXG4gICAgICAuLi5wcmVmaXgsIC4uLnN0YXRlbWVudHMubWFwKHN0bXQgPT4gc3RtdC52aXNpdFN0YXRlbWVudCh0aGlzLCBudWxsKSkuZmlsdGVyKGYgPT4gZiAhPSBudWxsKVxuICAgIF0pO1xuICB9XG5cbiAgcHJpdmF0ZSBfdmlzaXRJZGVudGlmaWVyKHZhbHVlOiBFeHRlcm5hbFJlZmVyZW5jZSk6IHRzLkV4cHJlc3Npb24ge1xuICAgIC8vIG5hbWUgY2FuIG9ubHkgYmUgbnVsbCBkdXJpbmcgSklUIHdoaWNoIG5ldmVyIGV4ZWN1dGVzIHRoaXMgY29kZS5cbiAgICBjb25zdCBtb2R1bGVOYW1lID0gdmFsdWUubW9kdWxlTmFtZSwgbmFtZSA9IHZhbHVlLm5hbWUgITtcbiAgICBsZXQgcHJlZml4SWRlbnQ6IHRzLklkZW50aWZpZXJ8bnVsbCA9IG51bGw7XG4gICAgaWYgKG1vZHVsZU5hbWUpIHtcbiAgICAgIGxldCBwcmVmaXggPSB0aGlzLl9pbXBvcnRzV2l0aFByZWZpeGVzLmdldChtb2R1bGVOYW1lKTtcbiAgICAgIGlmIChwcmVmaXggPT0gbnVsbCkge1xuICAgICAgICBwcmVmaXggPSBgaSR7dGhpcy5faW1wb3J0c1dpdGhQcmVmaXhlcy5zaXplfWA7XG4gICAgICAgIHRoaXMuX2ltcG9ydHNXaXRoUHJlZml4ZXMuc2V0KG1vZHVsZU5hbWUsIHByZWZpeCk7XG4gICAgICB9XG4gICAgICBwcmVmaXhJZGVudCA9IHRzLmNyZWF0ZUlkZW50aWZpZXIocHJlZml4KTtcbiAgICB9XG4gICAgaWYgKHByZWZpeElkZW50KSB7XG4gICAgICByZXR1cm4gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MocHJlZml4SWRlbnQsIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBpZCA9IHRzLmNyZWF0ZUlkZW50aWZpZXIobmFtZSk7XG4gICAgICBpZiAodGhpcy5fZXhwb3J0ZWRWYXJpYWJsZUlkZW50aWZpZXJzLmhhcyhuYW1lKSkge1xuICAgICAgICAvLyBJbiBvcmRlciBmb3IgdGhpcyBuZXcgaWRlbnRpZmllciBub2RlIHRvIGJlIHByb3Blcmx5IHJld3JpdHRlbiBpbiBDb21tb25KUyBvdXRwdXQsXG4gICAgICAgIC8vIGl0IG11c3QgaGF2ZSBpdHMgb3JpZ2luYWwgbm9kZSBzZXQgdG8gYSBwYXJzZWQgaW5zdGFuY2Ugb2YgdGhlIHNhbWUgaWRlbnRpZmllci5cbiAgICAgICAgdHMuc2V0T3JpZ2luYWxOb2RlKGlkLCB0aGlzLl9leHBvcnRlZFZhcmlhYmxlSWRlbnRpZmllcnMuZ2V0KG5hbWUpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBpZDtcbiAgICB9XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBnZXRNZXRob2ROYW1lKG1ldGhvZFJlZjoge25hbWU6IHN0cmluZyB8IG51bGw7IGJ1aWx0aW46IEJ1aWx0aW5NZXRob2QgfCBudWxsfSk6IHN0cmluZyB7XG4gIGlmIChtZXRob2RSZWYubmFtZSkge1xuICAgIHJldHVybiBtZXRob2RSZWYubmFtZTtcbiAgfSBlbHNlIHtcbiAgICBzd2l0Y2ggKG1ldGhvZFJlZi5idWlsdGluKSB7XG4gICAgICBjYXNlIEJ1aWx0aW5NZXRob2QuQmluZDpcbiAgICAgICAgcmV0dXJuICdiaW5kJztcbiAgICAgIGNhc2UgQnVpbHRpbk1ldGhvZC5Db25jYXRBcnJheTpcbiAgICAgICAgcmV0dXJuICdjb25jYXQnO1xuICAgICAgY2FzZSBCdWlsdGluTWV0aG9kLlN1YnNjcmliZU9ic2VydmFibGU6XG4gICAgICAgIHJldHVybiAnc3Vic2NyaWJlJztcbiAgICB9XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKCdVbmV4cGVjdGVkIG1ldGhvZCByZWZlcmVuY2UgZm9ybScpO1xufVxuXG5mdW5jdGlvbiBtb2RpZmllckZyb21Nb2RpZmllcihtb2RpZmllcjogU3RtdE1vZGlmaWVyKTogdHMuTW9kaWZpZXIge1xuICBzd2l0Y2ggKG1vZGlmaWVyKSB7XG4gICAgY2FzZSBTdG10TW9kaWZpZXIuRXhwb3J0ZWQ6XG4gICAgICByZXR1cm4gdHMuY3JlYXRlVG9rZW4odHMuU3ludGF4S2luZC5FeHBvcnRLZXl3b3JkKTtcbiAgICBjYXNlIFN0bXRNb2RpZmllci5GaW5hbDpcbiAgICAgIHJldHVybiB0cy5jcmVhdGVUb2tlbih0cy5TeW50YXhLaW5kLkNvbnN0S2V5d29yZCk7XG4gICAgY2FzZSBTdG10TW9kaWZpZXIuUHJpdmF0ZTpcbiAgICAgIHJldHVybiB0cy5jcmVhdGVUb2tlbih0cy5TeW50YXhLaW5kLlByaXZhdGVLZXl3b3JkKTtcbiAgICBjYXNlIFN0bXRNb2RpZmllci5TdGF0aWM6XG4gICAgICByZXR1cm4gdHMuY3JlYXRlVG9rZW4odHMuU3ludGF4S2luZC5TdGF0aWNLZXl3b3JkKTtcbiAgfVxuICByZXR1cm4gZXJyb3IoYHVua25vd24gc3RhdGVtZW50IG1vZGlmaWVyYCk7XG59XG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZU1vZGlmaWVycyhtb2RpZmllcnM6IFN0bXRNb2RpZmllcltdIHwgbnVsbCk6IHRzLk1vZGlmaWVyW118dW5kZWZpbmVkIHtcbiAgcmV0dXJuIG1vZGlmaWVycyA9PSBudWxsID8gdW5kZWZpbmVkIDogbW9kaWZpZXJzICEubWFwKG1vZGlmaWVyRnJvbU1vZGlmaWVyKTtcbn1cbiJdfQ==