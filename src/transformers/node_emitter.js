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
    exports.NodeEmitterVisitor = exports.updateSourceFile = exports.TypeScriptNodeEmitter = void 0;
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
                /* importClause */
                ts.createImportClause(
                /* name */ undefined, ts.createNamespaceImport(ts.createIdentifier(prefix))), 
                /* moduleSpecifier */ createLiteral(namespace));
            });
        };
        NodeEmitterVisitor.prototype.getNodeMap = function () {
            return this._nodeMap;
        };
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
            /* decorators */ undefined, modifiers, stmt.name, /* typeParameters*/ undefined, stmt.parent &&
                [ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [stmt.parent.visitExpression(this, null)])] ||
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
        NodeEmitterVisitor.prototype.visitWrappedNodeExpr = function (expr) {
            return this.record(expr, expr.node);
        };
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
        NodeEmitterVisitor.prototype.visitLiteralExpr = function (expr) {
            return this.record(expr, createLiteral(expr.value));
        };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZV9lbWl0dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy90cmFuc2Zvcm1lcnMvbm9kZV9lbWl0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBd3FCO0lBRXhxQiwrQkFBaUM7SUFFakMsb0VBQTZCO0lBTTdCLElBQU0sZ0JBQWdCLEdBQUcsTUFBTSxDQUFDO0lBQ2hDLElBQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDO0lBQ2pDLElBQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDO0lBQ2pDLElBQU0sb0JBQW9CLEdBQUcsdUJBQXVCLENBQUM7SUFFckQ7UUFDRSwrQkFBb0IsMEJBQW1DO1lBQW5DLCtCQUEwQixHQUExQiwwQkFBMEIsQ0FBUztRQUFHLENBQUM7UUFFM0QsZ0RBQWdCLEdBQWhCLFVBQWlCLFVBQXlCLEVBQUUsS0FBa0IsRUFBRSxRQUFpQjtZQUUvRSxJQUFNLFNBQVMsR0FBRyxJQUFJLGtCQUFrQixDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1lBQzFFLDJGQUEyRjtZQUMzRixTQUFTO1lBQ1QsSUFBTSxVQUFVLEdBQVUsRUFBRSxDQUFDLE1BQU0sT0FBVCxFQUFFLG1CQUNyQixLQUFLLENBQUMsR0FBRyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLEVBQXBDLENBQW9DLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxJQUFJLElBQUksSUFBSSxFQUFaLENBQVksQ0FBQyxFQUFDLENBQUM7WUFDN0YsSUFBTSxhQUFhLEdBQW1CLEVBQUUsQ0FBQztZQUN6QyxJQUFJLFFBQVEsRUFBRTtnQkFDWixJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsVUFB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LHVCQUFZLENBQUMsT0FBTztnQkFDdkIsT0FBTyxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDdEQsS0FBSyx1QkFBWSxDQUFDLE1BQU07Z0JBQ3RCLE9BQU8sRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1NBQ3REO1FBQ0QsT0FBTyxZQUFLLENBQUMsNEJBQTRCLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRUQsU0FBUyxrQkFBa0IsQ0FBQyxTQUE4QjtRQUN4RCxPQUFPLFNBQVMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBVSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQzlFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QXNzZXJ0Tm90TnVsbCwgQmluYXJ5T3BlcmF0b3IsIEJpbmFyeU9wZXJhdG9yRXhwciwgQnVpbHRpbk1ldGhvZCwgQnVpbHRpblZhciwgQ2FzdEV4cHIsIENsYXNzU3RtdCwgQ29tbWFFeHByLCBDb21tZW50U3RtdCwgQ29uZGl0aW9uYWxFeHByLCBEZWNsYXJlRnVuY3Rpb25TdG10LCBEZWNsYXJlVmFyU3RtdCwgRXhwcmVzc2lvblN0YXRlbWVudCwgRXhwcmVzc2lvblZpc2l0b3IsIEV4dGVybmFsRXhwciwgRXh0ZXJuYWxSZWZlcmVuY2UsIEZ1bmN0aW9uRXhwciwgSWZTdG10LCBJbnN0YW50aWF0ZUV4cHIsIEludm9rZUZ1bmN0aW9uRXhwciwgSW52b2tlTWV0aG9kRXhwciwgSlNEb2NDb21tZW50U3RtdCwgTGl0ZXJhbEFycmF5RXhwciwgTGl0ZXJhbEV4cHIsIExpdGVyYWxNYXBFeHByLCBOb3RFeHByLCBQYXJzZVNvdXJjZUZpbGUsIFBhcnNlU291cmNlU3BhbiwgUGFydGlhbE1vZHVsZSwgUmVhZEtleUV4cHIsIFJlYWRQcm9wRXhwciwgUmVhZFZhckV4cHIsIFJldHVyblN0YXRlbWVudCwgU3RhdGVtZW50LCBTdGF0ZW1lbnRWaXNpdG9yLCBTdG10TW9kaWZpZXIsIFRocm93U3RtdCwgVHJ5Q2F0Y2hTdG10LCBUeXBlb2ZFeHByLCBXcmFwcGVkTm9kZUV4cHIsIFdyaXRlS2V5RXhwciwgV3JpdGVQcm9wRXhwciwgV3JpdGVWYXJFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge0xvY2FsaXplZFN0cmluZ30gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL291dHB1dC9vdXRwdXRfYXN0JztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2Vycm9yfSBmcm9tICcuL3V0aWwnO1xuXG5leHBvcnQgaW50ZXJmYWNlIE5vZGUge1xuICBzb3VyY2VTcGFuOiBQYXJzZVNvdXJjZVNwYW58bnVsbDtcbn1cblxuY29uc3QgTUVUSE9EX1RISVNfTkFNRSA9ICd0aGlzJztcbmNvbnN0IENBVENIX0VSUk9SX05BTUUgPSAnZXJyb3InO1xuY29uc3QgQ0FUQ0hfU1RBQ0tfTkFNRSA9ICdzdGFjayc7XG5jb25zdCBfVkFMSURfSURFTlRJRklFUl9SRSA9IC9eWyRBLVpfXVswLTlBLVpfJF0qJC9pO1xuXG5leHBvcnQgY2xhc3MgVHlwZVNjcmlwdE5vZGVFbWl0dGVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcjogYm9vbGVhbikge31cblxuICB1cGRhdGVTb3VyY2VGaWxlKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIHN0bXRzOiBTdGF0ZW1lbnRbXSwgcHJlYW1ibGU/OiBzdHJpbmcpOlxuICAgICAgW3RzLlNvdXJjZUZpbGUsIE1hcDx0cy5Ob2RlLCBOb2RlPl0ge1xuICAgIGNvbnN0IGNvbnZlcnRlciA9IG5ldyBOb2RlRW1pdHRlclZpc2l0b3IodGhpcy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcik7XG4gICAgLy8gW10uY29uY2F0IGZsYXR0ZW5zIHRoZSByZXN1bHQgc28gdGhhdCBlYWNoIGB2aXNpdC4uLmAgbWV0aG9kIGNhbiBhbHNvIHJldHVybiBhbiBhcnJheSBvZlxuICAgIC8vIHN0bXRzLlxuICAgIGNvbnN0IHN0YXRlbWVudHM6IGFueVtdID0gW10uY29uY2F0KFxuICAgICAgICAuLi5zdG10cy5tYXAoc3RtdCA9PiBzdG10LnZpc2l0U3RhdGVtZW50KGNvbnZlcnRlciwgbnVsbCkpLmZpbHRlcihzdG10ID0+IHN0bXQgIT0gbnVsbCkpO1xuICAgIGNvbnN0IHByZWFtYmxlU3RtdHM6IHRzLlN0YXRlbWVudFtdID0gW107XG4gICAgaWYgKHByZWFtYmxlKSB7XG4gICAgICBjb25zdCBjb21tZW50U3RtdCA9IHRoaXMuY3JlYXRlQ29tbWVudFN0YXRlbWVudChzb3VyY2VGaWxlLCBwcmVhbWJsZSk7XG4gICAgICBwcmVhbWJsZVN0bXRzLnB1c2goY29tbWVudFN0bXQpO1xuICAgIH1cbiAgICBjb25zdCBzb3VyY2VTdGF0ZW1lbnRzID1cbiAgICAgICAgWy4uLnByZWFtYmxlU3RtdHMsIC4uLmNvbnZlcnRlci5nZXRSZWV4cG9ydHMoKSwgLi4uY29udmVydGVyLmdldEltcG9ydHMoKSwgLi4uc3RhdGVtZW50c107XG4gICAgY29udmVydGVyLnVwZGF0ZVNvdXJjZU1hcChzb3VyY2VTdGF0ZW1lbnRzKTtcbiAgICBjb25zdCBuZXdTb3VyY2VGaWxlID0gdHMudXBkYXRlU291cmNlRmlsZU5vZGUoc291cmNlRmlsZSwgc291cmNlU3RhdGVtZW50cyk7XG4gICAgcmV0dXJuIFtuZXdTb3VyY2VGaWxlLCBjb252ZXJ0ZXIuZ2V0Tm9kZU1hcCgpXTtcbiAgfVxuXG4gIC8qKiBDcmVhdGVzIGEgbm90IGVtaXR0ZWQgc3RhdGVtZW50IGNvbnRhaW5pbmcgdGhlIGdpdmVuIGNvbW1lbnQuICovXG4gIGNyZWF0ZUNvbW1lbnRTdGF0ZW1lbnQoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgY29tbWVudDogc3RyaW5nKTogdHMuU3RhdGVtZW50IHtcbiAgICBpZiAoY29tbWVudC5zdGFydHNXaXRoKCcvKicpICYmIGNvbW1lbnQuZW5kc1dpdGgoJyovJykpIHtcbiAgICAgIGNvbW1lbnQgPSBjb21tZW50LnN1YnN0cigyLCBjb21tZW50Lmxlbmd0aCAtIDQpO1xuICAgIH1cbiAgICBjb25zdCBjb21tZW50U3RtdCA9IHRzLmNyZWF0ZU5vdEVtaXR0ZWRTdGF0ZW1lbnQoc291cmNlRmlsZSk7XG4gICAgdHMuc2V0U3ludGhldGljTGVhZGluZ0NvbW1lbnRzKFxuICAgICAgICBjb21tZW50U3RtdCxcbiAgICAgICAgW3traW5kOiB0cy5TeW50YXhLaW5kLk11bHRpTGluZUNvbW1lbnRUcml2aWEsIHRleHQ6IGNvbW1lbnQsIHBvczogLTEsIGVuZDogLTF9XSk7XG4gICAgdHMuc2V0RW1pdEZsYWdzKGNvbW1lbnRTdG10LCB0cy5FbWl0RmxhZ3MuQ3VzdG9tUHJvbG9ndWUpO1xuICAgIHJldHVybiBjb21tZW50U3RtdDtcbiAgfVxufVxuXG4vKipcbiAqIFVwZGF0ZSB0aGUgZ2l2ZW4gc291cmNlIGZpbGUgdG8gaW5jbHVkZSB0aGUgY2hhbmdlcyBzcGVjaWZpZWQgaW4gbW9kdWxlLlxuICpcbiAqIFRoZSBtb2R1bGUgcGFyYW1ldGVyIGlzIHRyZWF0ZWQgYXMgYSBwYXJ0aWFsIG1vZHVsZSBtZWFuaW5nIHRoYXQgdGhlIHN0YXRlbWVudHMgYXJlIGFkZGVkIHRvXG4gKiB0aGUgbW9kdWxlIGluc3RlYWQgb2YgcmVwbGFjaW5nIHRoZSBtb2R1bGUuIEFsc28sIGFueSBjbGFzc2VzIGFyZSB0cmVhdGVkIGFzIHBhcnRpYWwgY2xhc3Nlc1xuICogYW5kIHRoZSBpbmNsdWRlZCBtZW1iZXJzIGFyZSBhZGRlZCB0byB0aGUgY2xhc3Mgd2l0aCB0aGUgc2FtZSBuYW1lIGluc3RlYWQgb2YgYSBuZXcgY2xhc3NcbiAqIGJlaW5nIGNyZWF0ZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVTb3VyY2VGaWxlKFxuICAgIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIG1vZHVsZTogUGFydGlhbE1vZHVsZSxcbiAgICBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcjogYm9vbGVhbik6IFt0cy5Tb3VyY2VGaWxlLCBNYXA8dHMuTm9kZSwgTm9kZT5dIHtcbiAgY29uc3QgY29udmVydGVyID0gbmV3IE5vZGVFbWl0dGVyVmlzaXRvcihhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcik7XG4gIGNvbnZlcnRlci5sb2FkRXhwb3J0ZWRWYXJpYWJsZUlkZW50aWZpZXJzKHNvdXJjZUZpbGUpO1xuXG4gIGNvbnN0IHByZWZpeFN0YXRlbWVudHMgPSBtb2R1bGUuc3RhdGVtZW50cy5maWx0ZXIoc3RhdGVtZW50ID0+ICEoc3RhdGVtZW50IGluc3RhbmNlb2YgQ2xhc3NTdG10KSk7XG4gIGNvbnN0IGNsYXNzZXMgPVxuICAgICAgbW9kdWxlLnN0YXRlbWVudHMuZmlsdGVyKHN0YXRlbWVudCA9PiBzdGF0ZW1lbnQgaW5zdGFuY2VvZiBDbGFzc1N0bXQpIGFzIENsYXNzU3RtdFtdO1xuICBjb25zdCBjbGFzc01hcCA9IG5ldyBNYXAoXG4gICAgICBjbGFzc2VzLm1hcDxbc3RyaW5nLCBDbGFzc1N0bXRdPihjbGFzc1N0YXRlbWVudCA9PiBbY2xhc3NTdGF0ZW1lbnQubmFtZSwgY2xhc3NTdGF0ZW1lbnRdKSk7XG4gIGNvbnN0IGNsYXNzTmFtZXMgPSBuZXcgU2V0KGNsYXNzZXMubWFwKGNsYXNzU3RhdGVtZW50ID0+IGNsYXNzU3RhdGVtZW50Lm5hbWUpKTtcblxuICBjb25zdCBwcmVmaXg6IHRzLlN0YXRlbWVudFtdID1cbiAgICAgIHByZWZpeFN0YXRlbWVudHMubWFwKHN0YXRlbWVudCA9PiBzdGF0ZW1lbnQudmlzaXRTdGF0ZW1lbnQoY29udmVydGVyLCBzb3VyY2VGaWxlKSk7XG5cbiAgLy8gQWRkIHN0YXRpYyBtZXRob2RzIHRvIGFsbCB0aGUgY2xhc3NlcyByZWZlcmVuY2VkIGluIG1vZHVsZS5cbiAgbGV0IG5ld1N0YXRlbWVudHMgPSBzb3VyY2VGaWxlLnN0YXRlbWVudHMubWFwKG5vZGUgPT4ge1xuICAgIGlmIChub2RlLmtpbmQgPT0gdHMuU3ludGF4S2luZC5DbGFzc0RlY2xhcmF0aW9uKSB7XG4gICAgICBjb25zdCBjbGFzc0RlY2xhcmF0aW9uID0gbm9kZSBhcyB0cy5DbGFzc0RlY2xhcmF0aW9uO1xuICAgICAgY29uc3QgbmFtZSA9IGNsYXNzRGVjbGFyYXRpb24ubmFtZTtcbiAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgIGNvbnN0IGNsYXNzU3RhdGVtZW50ID0gY2xhc3NNYXAuZ2V0KG5hbWUudGV4dCk7XG4gICAgICAgIGlmIChjbGFzc1N0YXRlbWVudCkge1xuICAgICAgICAgIGNsYXNzTmFtZXMuZGVsZXRlKG5hbWUudGV4dCk7XG4gICAgICAgICAgY29uc3QgY2xhc3NNZW1iZXJIb2xkZXIgPVxuICAgICAgICAgICAgICBjb252ZXJ0ZXIudmlzaXREZWNsYXJlQ2xhc3NTdG10KGNsYXNzU3RhdGVtZW50KSBhcyB0cy5DbGFzc0RlY2xhcmF0aW9uO1xuICAgICAgICAgIGNvbnN0IG5ld01ldGhvZHMgPVxuICAgICAgICAgICAgICBjbGFzc01lbWJlckhvbGRlci5tZW1iZXJzLmZpbHRlcihtZW1iZXIgPT4gbWVtYmVyLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuQ29uc3RydWN0b3IpO1xuICAgICAgICAgIGNvbnN0IG5ld01lbWJlcnMgPSBbLi4uY2xhc3NEZWNsYXJhdGlvbi5tZW1iZXJzLCAuLi5uZXdNZXRob2RzXTtcblxuICAgICAgICAgIHJldHVybiB0cy51cGRhdGVDbGFzc0RlY2xhcmF0aW9uKFxuICAgICAgICAgICAgICBjbGFzc0RlY2xhcmF0aW9uLFxuICAgICAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIGNsYXNzRGVjbGFyYXRpb24uZGVjb3JhdG9ycyxcbiAgICAgICAgICAgICAgLyogbW9kaWZpZXJzICovIGNsYXNzRGVjbGFyYXRpb24ubW9kaWZpZXJzLFxuICAgICAgICAgICAgICAvKiBuYW1lICovIGNsYXNzRGVjbGFyYXRpb24ubmFtZSxcbiAgICAgICAgICAgICAgLyogdHlwZVBhcmFtZXRlcnMgKi8gY2xhc3NEZWNsYXJhdGlvbi50eXBlUGFyYW1ldGVycyxcbiAgICAgICAgICAgICAgLyogaGVyaXRhZ2VDbGF1c2VzICovIGNsYXNzRGVjbGFyYXRpb24uaGVyaXRhZ2VDbGF1c2VzIHx8IFtdLFxuICAgICAgICAgICAgICAvKiBtZW1iZXJzICovIG5ld01lbWJlcnMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBub2RlO1xuICB9KTtcblxuICAvLyBWYWxpZGF0ZSB0aGF0IGFsbCB0aGUgY2xhc3NlcyBoYXZlIGJlZW4gZ2VuZXJhdGVkXG4gIGNsYXNzTmFtZXMuc2l6ZSA9PSAwIHx8XG4gICAgICBlcnJvcihgJHtjbGFzc05hbWVzLnNpemUgPT0gMSA/ICdDbGFzcycgOiAnQ2xhc3Nlcyd9IFwiJHtcbiAgICAgICAgICBBcnJheS5mcm9tKGNsYXNzTmFtZXMua2V5cygpKS5qb2luKCcsICcpfVwiIG5vdCBnZW5lcmF0ZWRgKTtcblxuICAvLyBBZGQgaW1wb3J0cyB0byB0aGUgbW9kdWxlIHJlcXVpcmVkIGJ5IHRoZSBuZXcgbWV0aG9kc1xuICBjb25zdCBpbXBvcnRzID0gY29udmVydGVyLmdldEltcG9ydHMoKTtcbiAgaWYgKGltcG9ydHMgJiYgaW1wb3J0cy5sZW5ndGgpIHtcbiAgICAvLyBGaW5kIHdoZXJlIHRoZSBuZXcgaW1wb3J0cyBzaG91bGQgZ29cbiAgICBjb25zdCBpbmRleCA9IGZpcnN0QWZ0ZXIoXG4gICAgICAgIG5ld1N0YXRlbWVudHMsXG4gICAgICAgIHN0YXRlbWVudCA9PiBzdGF0ZW1lbnQua2luZCA9PT0gdHMuU3ludGF4S2luZC5JbXBvcnREZWNsYXJhdGlvbiB8fFxuICAgICAgICAgICAgc3RhdGVtZW50LmtpbmQgPT09IHRzLlN5bnRheEtpbmQuSW1wb3J0RXF1YWxzRGVjbGFyYXRpb24pO1xuICAgIG5ld1N0YXRlbWVudHMgPVxuICAgICAgICBbLi4ubmV3U3RhdGVtZW50cy5zbGljZSgwLCBpbmRleCksIC4uLmltcG9ydHMsIC4uLnByZWZpeCwgLi4ubmV3U3RhdGVtZW50cy5zbGljZShpbmRleCldO1xuICB9IGVsc2Uge1xuICAgIG5ld1N0YXRlbWVudHMgPSBbLi4ucHJlZml4LCAuLi5uZXdTdGF0ZW1lbnRzXTtcbiAgfVxuXG4gIGNvbnZlcnRlci51cGRhdGVTb3VyY2VNYXAobmV3U3RhdGVtZW50cyk7XG4gIGNvbnN0IG5ld1NvdXJjZUZpbGUgPSB0cy51cGRhdGVTb3VyY2VGaWxlTm9kZShzb3VyY2VGaWxlLCBuZXdTdGF0ZW1lbnRzKTtcblxuICByZXR1cm4gW25ld1NvdXJjZUZpbGUsIGNvbnZlcnRlci5nZXROb2RlTWFwKCldO1xufVxuXG4vLyBSZXR1cm4gdGhlIGluZGV4IGFmdGVyIHRoZSBmaXJzdCB2YWx1ZSBpbiBgYWAgdGhhdCBkb2Vzbid0IG1hdGNoIHRoZSBwcmVkaWNhdGUgYWZ0ZXIgYSB2YWx1ZSB0aGF0XG4vLyBkb2VzIG9yIDAgaWYgbm8gdmFsdWVzIG1hdGNoLlxuZnVuY3Rpb24gZmlyc3RBZnRlcjxUPihhOiBUW10sIHByZWRpY2F0ZTogKHZhbHVlOiBUKSA9PiBib29sZWFuKSB7XG4gIGxldCBpbmRleCA9IDA7XG4gIGNvbnN0IGxlbiA9IGEubGVuZ3RoO1xuICBmb3IgKDsgaW5kZXggPCBsZW47IGluZGV4KyspIHtcbiAgICBjb25zdCB2YWx1ZSA9IGFbaW5kZXhdO1xuICAgIGlmIChwcmVkaWNhdGUodmFsdWUpKSBicmVhaztcbiAgfVxuICBpZiAoaW5kZXggPj0gbGVuKSByZXR1cm4gMDtcbiAgZm9yICg7IGluZGV4IDwgbGVuOyBpbmRleCsrKSB7XG4gICAgY29uc3QgdmFsdWUgPSBhW2luZGV4XTtcbiAgICBpZiAoIXByZWRpY2F0ZSh2YWx1ZSkpIGJyZWFrO1xuICB9XG4gIHJldHVybiBpbmRleDtcbn1cblxuLy8gQSByZWNvcmRlZCBub2RlIGlzIGEgc3VidHlwZSBvZiB0aGUgbm9kZSB0aGF0IGlzIG1hcmtlZCBhcyBiZWluZyByZWNvcmRlZC4gVGhpcyBpcyB1c2VkXG4vLyB0byBlbnN1cmUgdGhhdCBOb2RlRW1pdHRlclZpc2l0b3IucmVjb3JkIGhhcyBiZWVuIGNhbGxlZCBvbiBhbGwgbm9kZXMgcmV0dXJuZWQgYnkgdGhlXG4vLyBOb2RlRW1pdHRlclZpc2l0b3JcbmV4cG9ydCB0eXBlIFJlY29yZGVkTm9kZTxUIGV4dGVuZHMgdHMuTm9kZSA9IHRzLk5vZGU+ID0gKFQme1xuICBfX3JlY29yZGVkOiBhbnk7XG59KXxudWxsO1xuXG5mdW5jdGlvbiBlc2NhcGVMaXRlcmFsKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdmFsdWUucmVwbGFjZSgvKFxcXCJ8XFxcXCkvZywgJ1xcXFwkMScpLnJlcGxhY2UoLyhcXG4pfChcXHIpL2csIGZ1bmN0aW9uKHYsIG4sIHIpIHtcbiAgICByZXR1cm4gbiA/ICdcXFxcbicgOiAnXFxcXHInO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlTGl0ZXJhbCh2YWx1ZTogYW55KSB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgIHJldHVybiB0cy5jcmVhdGVOdWxsKCk7XG4gIH0gZWxzZSBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB0cy5jcmVhdGVJZGVudGlmaWVyKCd1bmRlZmluZWQnKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCByZXN1bHQgPSB0cy5jcmVhdGVMaXRlcmFsKHZhbHVlKTtcbiAgICBpZiAodHMuaXNTdHJpbmdMaXRlcmFsKHJlc3VsdCkgJiYgcmVzdWx0LnRleHQuaW5kZXhPZignXFxcXCcpID49IDApIHtcbiAgICAgIC8vIEhhY2sgdG8gYXZvaWQgcHJvYmxlbXMgY2F1c2UgaW5kaXJlY3RseSBieTpcbiAgICAgIC8vICAgIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMjAxOTJcbiAgICAgIC8vIFRoaXMgYXZvaWRzIHRoZSBzdHJpbmcgZXNjYXBpbmcgbm9ybWFsbHkgcGVyZm9ybWVkIGZvciBhIHN0cmluZyByZWx5aW5nIG9uIHRoYXRcbiAgICAgIC8vIFR5cGVTY3JpcHQganVzdCBlbWl0cyB0aGUgdGV4dCByYXcgZm9yIGEgbnVtZXJpYyBsaXRlcmFsLlxuICAgICAgKHJlc3VsdCBhcyBhbnkpLmtpbmQgPSB0cy5TeW50YXhLaW5kLk51bWVyaWNMaXRlcmFsO1xuICAgICAgcmVzdWx0LnRleHQgPSBgXCIke2VzY2FwZUxpdGVyYWwocmVzdWx0LnRleHQpfVwiYDtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0V4cG9ydFR5cGVTdGF0ZW1lbnQoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQpOiBib29sZWFuIHtcbiAgcmV0dXJuICEhc3RhdGVtZW50Lm1vZGlmaWVycyAmJlxuICAgICAgc3RhdGVtZW50Lm1vZGlmaWVycy5zb21lKG1vZCA9PiBtb2Qua2luZCA9PT0gdHMuU3ludGF4S2luZC5FeHBvcnRLZXl3b3JkKTtcbn1cblxuLyoqXG4gKiBWaXNpdHMgYW4gb3V0cHV0IGFzdCBhbmQgcHJvZHVjZXMgdGhlIGNvcnJlc3BvbmRpbmcgVHlwZVNjcmlwdCBzeW50aGV0aWMgbm9kZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBOb2RlRW1pdHRlclZpc2l0b3IgaW1wbGVtZW50cyBTdGF0ZW1lbnRWaXNpdG9yLCBFeHByZXNzaW9uVmlzaXRvciB7XG4gIHByaXZhdGUgX25vZGVNYXAgPSBuZXcgTWFwPHRzLk5vZGUsIE5vZGU+KCk7XG4gIHByaXZhdGUgX2ltcG9ydHNXaXRoUHJlZml4ZXMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBwcml2YXRlIF9yZWV4cG9ydHMgPSBuZXcgTWFwPHN0cmluZywge25hbWU6IHN0cmluZywgYXM6IHN0cmluZ31bXT4oKTtcbiAgcHJpdmF0ZSBfdGVtcGxhdGVTb3VyY2VzID0gbmV3IE1hcDxQYXJzZVNvdXJjZUZpbGUsIHRzLlNvdXJjZU1hcFNvdXJjZT4oKTtcbiAgcHJpdmF0ZSBfZXhwb3J0ZWRWYXJpYWJsZUlkZW50aWZpZXJzID0gbmV3IE1hcDxzdHJpbmcsIHRzLklkZW50aWZpZXI+KCk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcjogYm9vbGVhbikge31cblxuICAvKipcbiAgICogUHJvY2VzcyB0aGUgc291cmNlIGZpbGUgYW5kIGNvbGxlY3QgZXhwb3J0ZWQgaWRlbnRpZmllcnMgdGhhdCByZWZlciB0byB2YXJpYWJsZXMuXG4gICAqXG4gICAqIE9ubHkgdmFyaWFibGVzIGFyZSBjb2xsZWN0ZWQgYmVjYXVzZSBleHBvcnRlZCBjbGFzc2VzIHN0aWxsIGV4aXN0IGluIHRoZSBtb2R1bGUgc2NvcGUgaW5cbiAgICogQ29tbW9uSlMsIHdoZXJlYXMgdmFyaWFibGVzIGhhdmUgdGhlaXIgZGVjbGFyYXRpb25zIG1vdmVkIG9udG8gdGhlIGBleHBvcnRzYCBvYmplY3QsIGFuZCBhbGxcbiAgICogcmVmZXJlbmNlcyBhcmUgdXBkYXRlZCBhY2NvcmRpbmdseS5cbiAgICovXG4gIGxvYWRFeHBvcnRlZFZhcmlhYmxlSWRlbnRpZmllcnMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIHNvdXJjZUZpbGUuc3RhdGVtZW50cy5mb3JFYWNoKHN0YXRlbWVudCA9PiB7XG4gICAgICBpZiAodHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdGF0ZW1lbnQpICYmIGlzRXhwb3J0VHlwZVN0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgICAgIHN0YXRlbWVudC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zLmZvckVhY2goZGVjbGFyYXRpb24gPT4ge1xuICAgICAgICAgIGlmICh0cy5pc0lkZW50aWZpZXIoZGVjbGFyYXRpb24ubmFtZSkpIHtcbiAgICAgICAgICAgIHRoaXMuX2V4cG9ydGVkVmFyaWFibGVJZGVudGlmaWVycy5zZXQoZGVjbGFyYXRpb24ubmFtZS50ZXh0LCBkZWNsYXJhdGlvbi5uYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgZ2V0UmVleHBvcnRzKCk6IHRzLlN0YXRlbWVudFtdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLl9yZWV4cG9ydHMuZW50cmllcygpKVxuICAgICAgICAubWFwKFxuICAgICAgICAgICAgKFtleHBvcnRlZEZpbGVQYXRoLCByZWV4cG9ydHNdKSA9PiB0cy5jcmVhdGVFeHBvcnREZWNsYXJhdGlvbihcbiAgICAgICAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIHRzLmNyZWF0ZU5hbWVkRXhwb3J0cyhcbiAgICAgICAgICAgICAgICAgICAgcmVleHBvcnRzLm1hcCgoe25hbWUsIGFzfSkgPT4gdHMuY3JlYXRlRXhwb3J0U3BlY2lmaWVyKG5hbWUsIGFzKSkpLFxuICAgICAgICAgICAgICAgIC8qIG1vZHVsZVNwZWNpZmllciAqLyBjcmVhdGVMaXRlcmFsKGV4cG9ydGVkRmlsZVBhdGgpKSk7XG4gIH1cblxuICBnZXRJbXBvcnRzKCk6IHRzLlN0YXRlbWVudFtdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLl9pbXBvcnRzV2l0aFByZWZpeGVzLmVudHJpZXMoKSlcbiAgICAgICAgLm1hcChcbiAgICAgICAgICAgIChbbmFtZXNwYWNlLCBwcmVmaXhdKSA9PiB0cy5jcmVhdGVJbXBvcnREZWNsYXJhdGlvbihcbiAgICAgICAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIC8qIGltcG9ydENsYXVzZSAqL1xuICAgICAgICAgICAgICAgIHRzLmNyZWF0ZUltcG9ydENsYXVzZShcbiAgICAgICAgICAgICAgICAgICAgLyogbmFtZSAqLzx0cy5JZGVudGlmaWVyPih1bmRlZmluZWQgYXMgYW55KSxcbiAgICAgICAgICAgICAgICAgICAgdHMuY3JlYXRlTmFtZXNwYWNlSW1wb3J0KHRzLmNyZWF0ZUlkZW50aWZpZXIocHJlZml4KSkpLFxuICAgICAgICAgICAgICAgIC8qIG1vZHVsZVNwZWNpZmllciAqLyBjcmVhdGVMaXRlcmFsKG5hbWVzcGFjZSkpKTtcbiAgfVxuXG4gIGdldE5vZGVNYXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX25vZGVNYXA7XG4gIH1cblxuICB1cGRhdGVTb3VyY2VNYXAoc3RhdGVtZW50czogdHMuU3RhdGVtZW50W10pIHtcbiAgICBsZXQgbGFzdFJhbmdlU3RhcnROb2RlOiB0cy5Ob2RlfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBsZXQgbGFzdFJhbmdlRW5kTm9kZTogdHMuTm9kZXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgbGV0IGxhc3RSYW5nZTogdHMuU291cmNlTWFwUmFuZ2V8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gICAgY29uc3QgcmVjb3JkTGFzdFNvdXJjZVJhbmdlID0gKCkgPT4ge1xuICAgICAgaWYgKGxhc3RSYW5nZSAmJiBsYXN0UmFuZ2VTdGFydE5vZGUgJiYgbGFzdFJhbmdlRW5kTm9kZSkge1xuICAgICAgICBpZiAobGFzdFJhbmdlU3RhcnROb2RlID09IGxhc3RSYW5nZUVuZE5vZGUpIHtcbiAgICAgICAgICB0cy5zZXRTb3VyY2VNYXBSYW5nZShsYXN0UmFuZ2VFbmROb2RlLCBsYXN0UmFuZ2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRzLnNldFNvdXJjZU1hcFJhbmdlKGxhc3RSYW5nZVN0YXJ0Tm9kZSwgbGFzdFJhbmdlKTtcbiAgICAgICAgICAvLyBPbmx5IGVtaXQgdGhlIHBvcyBmb3IgdGhlIGZpcnN0IG5vZGUgZW1pdHRlZCBpbiB0aGUgcmFuZ2UuXG4gICAgICAgICAgdHMuc2V0RW1pdEZsYWdzKGxhc3RSYW5nZVN0YXJ0Tm9kZSwgdHMuRW1pdEZsYWdzLk5vVHJhaWxpbmdTb3VyY2VNYXApO1xuICAgICAgICAgIHRzLnNldFNvdXJjZU1hcFJhbmdlKGxhc3RSYW5nZUVuZE5vZGUsIGxhc3RSYW5nZSk7XG4gICAgICAgICAgLy8gT25seSBlbWl0IGVtaXQgZW5kIGZvciB0aGUgbGFzdCBub2RlIGVtaXR0ZWQgaW4gdGhlIHJhbmdlLlxuICAgICAgICAgIHRzLnNldEVtaXRGbGFncyhsYXN0UmFuZ2VFbmROb2RlLCB0cy5FbWl0RmxhZ3MuTm9MZWFkaW5nU291cmNlTWFwKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCB2aXNpdE5vZGUgPSAodHNOb2RlOiB0cy5Ob2RlKSA9PiB7XG4gICAgICBjb25zdCBuZ05vZGUgPSB0aGlzLl9ub2RlTWFwLmdldCh0c05vZGUpO1xuICAgICAgaWYgKG5nTm9kZSkge1xuICAgICAgICBjb25zdCByYW5nZSA9IHRoaXMuc291cmNlUmFuZ2VPZihuZ05vZGUpO1xuICAgICAgICBpZiAocmFuZ2UpIHtcbiAgICAgICAgICBpZiAoIWxhc3RSYW5nZSB8fCByYW5nZS5zb3VyY2UgIT0gbGFzdFJhbmdlLnNvdXJjZSB8fCByYW5nZS5wb3MgIT0gbGFzdFJhbmdlLnBvcyB8fFxuICAgICAgICAgICAgICByYW5nZS5lbmQgIT0gbGFzdFJhbmdlLmVuZCkge1xuICAgICAgICAgICAgcmVjb3JkTGFzdFNvdXJjZVJhbmdlKCk7XG4gICAgICAgICAgICBsYXN0UmFuZ2VTdGFydE5vZGUgPSB0c05vZGU7XG4gICAgICAgICAgICBsYXN0UmFuZ2UgPSByYW5nZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbGFzdFJhbmdlRW5kTm9kZSA9IHRzTm9kZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdHMuZm9yRWFjaENoaWxkKHRzTm9kZSwgdmlzaXROb2RlKTtcbiAgICB9O1xuICAgIHN0YXRlbWVudHMuZm9yRWFjaCh2aXNpdE5vZGUpO1xuICAgIHJlY29yZExhc3RTb3VyY2VSYW5nZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSByZWNvcmQ8VCBleHRlbmRzIHRzLk5vZGU+KG5nTm9kZTogTm9kZSwgdHNOb2RlOiBUfG51bGwpOiBSZWNvcmRlZE5vZGU8VD4ge1xuICAgIGlmICh0c05vZGUgJiYgIXRoaXMuX25vZGVNYXAuaGFzKHRzTm9kZSkpIHtcbiAgICAgIHRoaXMuX25vZGVNYXAuc2V0KHRzTm9kZSwgbmdOb2RlKTtcbiAgICB9XG4gICAgcmV0dXJuIHRzTm9kZSBhcyBSZWNvcmRlZE5vZGU8VD47XG4gIH1cblxuICBwcml2YXRlIHNvdXJjZVJhbmdlT2Yobm9kZTogTm9kZSk6IHRzLlNvdXJjZU1hcFJhbmdlfG51bGwge1xuICAgIGlmIChub2RlLnNvdXJjZVNwYW4pIHtcbiAgICAgIGNvbnN0IHNwYW4gPSBub2RlLnNvdXJjZVNwYW47XG4gICAgICBpZiAoc3Bhbi5zdGFydC5maWxlID09IHNwYW4uZW5kLmZpbGUpIHtcbiAgICAgICAgY29uc3QgZmlsZSA9IHNwYW4uc3RhcnQuZmlsZTtcbiAgICAgICAgaWYgKGZpbGUudXJsKSB7XG4gICAgICAgICAgbGV0IHNvdXJjZSA9IHRoaXMuX3RlbXBsYXRlU291cmNlcy5nZXQoZmlsZSk7XG4gICAgICAgICAgaWYgKCFzb3VyY2UpIHtcbiAgICAgICAgICAgIHNvdXJjZSA9IHRzLmNyZWF0ZVNvdXJjZU1hcFNvdXJjZShmaWxlLnVybCwgZmlsZS5jb250ZW50LCBwb3MgPT4gcG9zKTtcbiAgICAgICAgICAgIHRoaXMuX3RlbXBsYXRlU291cmNlcy5zZXQoZmlsZSwgc291cmNlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHtwb3M6IHNwYW4uc3RhcnQub2Zmc2V0LCBlbmQ6IHNwYW4uZW5kLm9mZnNldCwgc291cmNlfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0TW9kaWZpZXJzKHN0bXQ6IFN0YXRlbWVudCkge1xuICAgIGxldCBtb2RpZmllcnM6IHRzLk1vZGlmaWVyW10gPSBbXTtcbiAgICBpZiAoc3RtdC5oYXNNb2RpZmllcihTdG10TW9kaWZpZXIuRXhwb3J0ZWQpKSB7XG4gICAgICBtb2RpZmllcnMucHVzaCh0cy5jcmVhdGVUb2tlbih0cy5TeW50YXhLaW5kLkV4cG9ydEtleXdvcmQpKTtcbiAgICB9XG4gICAgcmV0dXJuIG1vZGlmaWVycztcbiAgfVxuXG4gIC8vIFN0YXRlbWVudFZpc2l0b3JcbiAgdmlzaXREZWNsYXJlVmFyU3RtdChzdG10OiBEZWNsYXJlVmFyU3RtdCkge1xuICAgIGlmIChzdG10Lmhhc01vZGlmaWVyKFN0bXRNb2RpZmllci5FeHBvcnRlZCkgJiYgc3RtdC52YWx1ZSBpbnN0YW5jZW9mIEV4dGVybmFsRXhwciAmJlxuICAgICAgICAhc3RtdC50eXBlKSB7XG4gICAgICAvLyBjaGVjayBmb3IgYSByZWV4cG9ydFxuICAgICAgY29uc3Qge25hbWUsIG1vZHVsZU5hbWV9ID0gc3RtdC52YWx1ZS52YWx1ZTtcbiAgICAgIGlmIChtb2R1bGVOYW1lKSB7XG4gICAgICAgIGxldCByZWV4cG9ydHMgPSB0aGlzLl9yZWV4cG9ydHMuZ2V0KG1vZHVsZU5hbWUpO1xuICAgICAgICBpZiAoIXJlZXhwb3J0cykge1xuICAgICAgICAgIHJlZXhwb3J0cyA9IFtdO1xuICAgICAgICAgIHRoaXMuX3JlZXhwb3J0cy5zZXQobW9kdWxlTmFtZSwgcmVleHBvcnRzKTtcbiAgICAgICAgfVxuICAgICAgICByZWV4cG9ydHMucHVzaCh7bmFtZTogbmFtZSEsIGFzOiBzdG10Lm5hbWV9KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdmFyRGVjbExpc3QgPSB0cy5jcmVhdGVWYXJpYWJsZURlY2xhcmF0aW9uTGlzdChbdHMuY3JlYXRlVmFyaWFibGVEZWNsYXJhdGlvbihcbiAgICAgICAgdHMuY3JlYXRlSWRlbnRpZmllcihzdG10Lm5hbWUpLFxuICAgICAgICAvKiB0eXBlICovIHVuZGVmaW5lZCxcbiAgICAgICAgKHN0bXQudmFsdWUgJiYgc3RtdC52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpIHx8IHVuZGVmaW5lZCldKTtcblxuICAgIGlmIChzdG10Lmhhc01vZGlmaWVyKFN0bXRNb2RpZmllci5FeHBvcnRlZCkpIHtcbiAgICAgIC8vIE5vdGU6IFdlIG5lZWQgdG8gYWRkIGFuIGV4cGxpY2l0IHZhcmlhYmxlIGFuZCBleHBvcnQgZGVjbGFyYXRpb24gc28gdGhhdFxuICAgICAgLy8gdGhlIHZhcmlhYmxlIGNhbiBiZSByZWZlcnJlZCBpbiB0aGUgc2FtZSBmaWxlIGFzIHdlbGwuXG4gICAgICBjb25zdCB0c1ZhclN0bXQgPVxuICAgICAgICAgIHRoaXMucmVjb3JkKHN0bXQsIHRzLmNyZWF0ZVZhcmlhYmxlU3RhdGVtZW50KC8qIG1vZGlmaWVycyAqL1tdLCB2YXJEZWNsTGlzdCkpO1xuICAgICAgY29uc3QgZXhwb3J0U3RtdCA9IHRoaXMucmVjb3JkKFxuICAgICAgICAgIHN0bXQsXG4gICAgICAgICAgdHMuY3JlYXRlRXhwb3J0RGVjbGFyYXRpb24oXG4gICAgICAgICAgICAgIC8qZGVjb3JhdG9ycyovIHVuZGVmaW5lZCwgLyptb2RpZmllcnMqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgIHRzLmNyZWF0ZU5hbWVkRXhwb3J0cyhbdHMuY3JlYXRlRXhwb3J0U3BlY2lmaWVyKHN0bXQubmFtZSwgc3RtdC5uYW1lKV0pKSk7XG4gICAgICByZXR1cm4gW3RzVmFyU3RtdCwgZXhwb3J0U3RtdF07XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlY29yZChzdG10LCB0cy5jcmVhdGVWYXJpYWJsZVN0YXRlbWVudCh0aGlzLmdldE1vZGlmaWVycyhzdG10KSwgdmFyRGVjbExpc3QpKTtcbiAgfVxuXG4gIHZpc2l0RGVjbGFyZUZ1bmN0aW9uU3RtdChzdG10OiBEZWNsYXJlRnVuY3Rpb25TdG10KSB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBzdG10LFxuICAgICAgICB0cy5jcmVhdGVGdW5jdGlvbkRlY2xhcmF0aW9uKFxuICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsIHRoaXMuZ2V0TW9kaWZpZXJzKHN0bXQpLFxuICAgICAgICAgICAgLyogYXN0ZXJpc2tUb2tlbiAqLyB1bmRlZmluZWQsIHN0bXQubmFtZSwgLyogdHlwZVBhcmFtZXRlcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgc3RtdC5wYXJhbXMubWFwKFxuICAgICAgICAgICAgICAgIHAgPT4gdHMuY3JlYXRlUGFyYW1ldGVyKFxuICAgICAgICAgICAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCwgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgLyogZG90RG90RG90VG9rZW4gKi8gdW5kZWZpbmVkLCBwLm5hbWUpKSxcbiAgICAgICAgICAgIC8qIHR5cGUgKi8gdW5kZWZpbmVkLCB0aGlzLl92aXNpdFN0YXRlbWVudHMoc3RtdC5zdGF0ZW1lbnRzKSkpO1xuICB9XG5cbiAgdmlzaXRFeHByZXNzaW9uU3RtdChzdG10OiBFeHByZXNzaW9uU3RhdGVtZW50KSB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKHN0bXQsIHRzLmNyZWF0ZVN0YXRlbWVudChzdG10LmV4cHIudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSk7XG4gIH1cblxuICB2aXNpdFJldHVyblN0bXQoc3RtdDogUmV0dXJuU3RhdGVtZW50KSB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBzdG10LCB0cy5jcmVhdGVSZXR1cm4oc3RtdC52YWx1ZSA/IHN0bXQudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpIDogdW5kZWZpbmVkKSk7XG4gIH1cblxuICB2aXNpdERlY2xhcmVDbGFzc1N0bXQoc3RtdDogQ2xhc3NTdG10KSB7XG4gICAgY29uc3QgbW9kaWZpZXJzID0gdGhpcy5nZXRNb2RpZmllcnMoc3RtdCk7XG4gICAgY29uc3QgZmllbGRzID0gc3RtdC5maWVsZHMubWFwKGZpZWxkID0+IHtcbiAgICAgIGNvbnN0IHByb3BlcnR5ID0gdHMuY3JlYXRlUHJvcGVydHkoXG4gICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsIC8qIG1vZGlmaWVycyAqLyB0cmFuc2xhdGVNb2RpZmllcnMoZmllbGQubW9kaWZpZXJzKSxcbiAgICAgICAgICBmaWVsZC5uYW1lLFxuICAgICAgICAgIC8qIHF1ZXN0aW9uVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgICAgIC8qIHR5cGUgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgIGZpZWxkLmluaXRpYWxpemVyID09IG51bGwgPyB0cy5jcmVhdGVOdWxsKCkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWVsZC5pbml0aWFsaXplci52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpO1xuXG4gICAgICBpZiAodGhpcy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcikge1xuICAgICAgICAvLyBDbG9zdXJlIGNvbXBpbGVyIHRyYW5zZm9ybXMgdGhlIGZvcm0gYFNlcnZpY2UuybVwcm92ID0gWGAgaW50byBgU2VydmljZSTJtXByb3YgPSBYYC4gVG9cbiAgICAgICAgLy8gcHJldmVudCB0aGlzIHRyYW5zZm9ybWF0aW9uLCBzdWNoIGFzc2lnbm1lbnRzIG5lZWQgdG8gYmUgYW5ub3RhdGVkIHdpdGggQG5vY29sbGFwc2UuXG4gICAgICAgIC8vIE5vdGUgdGhhdCB0c2lja2xlIGlzIHR5cGljYWxseSByZXNwb25zaWJsZSBmb3IgYWRkaW5nIHN1Y2ggYW5ub3RhdGlvbnMsIGhvd2V2ZXIgaXRcbiAgICAgICAgLy8gZG9lc24ndCB5ZXQgaGFuZGxlIHN5bnRoZXRpYyBmaWVsZHMgYWRkZWQgZHVyaW5nIG90aGVyIHRyYW5zZm9ybWF0aW9ucy5cbiAgICAgICAgdHMuYWRkU3ludGhldGljTGVhZGluZ0NvbW1lbnQoXG4gICAgICAgICAgICBwcm9wZXJ0eSwgdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhLCAnKiBAbm9jb2xsYXBzZSAnLFxuICAgICAgICAgICAgLyogaGFzVHJhaWxpbmdOZXdMaW5lICovIGZhbHNlKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHByb3BlcnR5O1xuICAgIH0pO1xuICAgIGNvbnN0IGdldHRlcnMgPSBzdG10LmdldHRlcnMubWFwKFxuICAgICAgICBnZXR0ZXIgPT4gdHMuY3JlYXRlR2V0QWNjZXNzb3IoXG4gICAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCwgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCwgZ2V0dGVyLm5hbWUsIC8qIHBhcmFtZXRlcnMgKi9bXSxcbiAgICAgICAgICAgIC8qIHR5cGUgKi8gdW5kZWZpbmVkLCB0aGlzLl92aXNpdFN0YXRlbWVudHMoZ2V0dGVyLmJvZHkpKSk7XG5cbiAgICBjb25zdCBjb25zdHJ1Y3RvciA9XG4gICAgICAgIChzdG10LmNvbnN0cnVjdG9yTWV0aG9kICYmIFt0cy5jcmVhdGVDb25zdHJ1Y3RvcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIHBhcmFtZXRlcnMgKi9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0bXQuY29uc3RydWN0b3JNZXRob2QucGFyYW1zLm1hcChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwID0+IHRzLmNyZWF0ZVBhcmFtZXRlcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIGRvdERvdERvdFRva2VuICovIHVuZGVmaW5lZCwgcC5uYW1lKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl92aXNpdFN0YXRlbWVudHMoc3RtdC5jb25zdHJ1Y3Rvck1ldGhvZC5ib2R5KSldKSB8fFxuICAgICAgICBbXTtcblxuICAgIC8vIFRPRE8ge2NodWNran06IERldGVybWluZSB3aGF0IHNob3VsZCBiZSBkb25lIGZvciBhIG1ldGhvZCB3aXRoIGEgbnVsbCBuYW1lLlxuICAgIGNvbnN0IG1ldGhvZHMgPSBzdG10Lm1ldGhvZHMuZmlsdGVyKG1ldGhvZCA9PiBtZXRob2QubmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kID0+IHRzLmNyZWF0ZU1ldGhvZChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIG1vZGlmaWVycyAqLyB0cmFuc2xhdGVNb2RpZmllcnMobWV0aG9kLm1vZGlmaWVycyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIGFzdHJpc2tUb2tlbiAqLyB1bmRlZmluZWQsIG1ldGhvZC5uYW1lIS8qIGd1YXJkZWQgYnkgZmlsdGVyICovLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBxdWVzdGlvblRva2VuICovIHVuZGVmaW5lZCwgLyogdHlwZVBhcmFtZXRlcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRob2QucGFyYW1zLm1hcChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHAgPT4gdHMuY3JlYXRlUGFyYW1ldGVyKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLCAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIGRvdERvdERvdFRva2VuICovIHVuZGVmaW5lZCwgcC5uYW1lKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIHR5cGUgKi8gdW5kZWZpbmVkLCB0aGlzLl92aXNpdFN0YXRlbWVudHMobWV0aG9kLmJvZHkpKSk7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBzdG10LFxuICAgICAgICB0cy5jcmVhdGVDbGFzc0RlY2xhcmF0aW9uKFxuICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsIG1vZGlmaWVycywgc3RtdC5uYW1lLCAvKiB0eXBlUGFyYW1ldGVycyovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIHN0bXQucGFyZW50ICYmXG4gICAgICAgICAgICAgICAgICAgIFt0cy5jcmVhdGVIZXJpdGFnZUNsYXVzZShcbiAgICAgICAgICAgICAgICAgICAgICAgIHRzLlN5bnRheEtpbmQuRXh0ZW5kc0tleXdvcmQsIFtzdG10LnBhcmVudC52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCldKV0gfHxcbiAgICAgICAgICAgICAgICBbXSxcbiAgICAgICAgICAgIFsuLi5maWVsZHMsIC4uLmdldHRlcnMsIC4uLmNvbnN0cnVjdG9yLCAuLi5tZXRob2RzXSkpO1xuICB9XG5cbiAgdmlzaXRJZlN0bXQoc3RtdDogSWZTdG10KSB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBzdG10LFxuICAgICAgICB0cy5jcmVhdGVJZihcbiAgICAgICAgICAgIHN0bXQuY29uZGl0aW9uLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSwgdGhpcy5fdmlzaXRTdGF0ZW1lbnRzKHN0bXQudHJ1ZUNhc2UpLFxuICAgICAgICAgICAgc3RtdC5mYWxzZUNhc2UgJiYgc3RtdC5mYWxzZUNhc2UubGVuZ3RoICYmIHRoaXMuX3Zpc2l0U3RhdGVtZW50cyhzdG10LmZhbHNlQ2FzZSkgfHxcbiAgICAgICAgICAgICAgICB1bmRlZmluZWQpKTtcbiAgfVxuXG4gIHZpc2l0VHJ5Q2F0Y2hTdG10KHN0bXQ6IFRyeUNhdGNoU3RtdCk6IFJlY29yZGVkTm9kZTx0cy5UcnlTdGF0ZW1lbnQ+IHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIHN0bXQsXG4gICAgICAgIHRzLmNyZWF0ZVRyeShcbiAgICAgICAgICAgIHRoaXMuX3Zpc2l0U3RhdGVtZW50cyhzdG10LmJvZHlTdG10cyksXG4gICAgICAgICAgICB0cy5jcmVhdGVDYXRjaENsYXVzZShcbiAgICAgICAgICAgICAgICBDQVRDSF9FUlJPUl9OQU1FLFxuICAgICAgICAgICAgICAgIHRoaXMuX3Zpc2l0U3RhdGVtZW50c1ByZWZpeChcbiAgICAgICAgICAgICAgICAgICAgW3RzLmNyZWF0ZVZhcmlhYmxlU3RhdGVtZW50KFxuICAgICAgICAgICAgICAgICAgICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIFt0cy5jcmVhdGVWYXJpYWJsZURlY2xhcmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIENBVENIX1NUQUNLX05BTUUsIC8qIHR5cGUgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5jcmVhdGVJZGVudGlmaWVyKENBVENIX0VSUk9SX05BTUUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5jcmVhdGVJZGVudGlmaWVyKENBVENIX1NUQUNLX05BTUUpKSldKV0sXG4gICAgICAgICAgICAgICAgICAgIHN0bXQuY2F0Y2hTdG10cykpLFxuICAgICAgICAgICAgLyogZmluYWxseUJsb2NrICovIHVuZGVmaW5lZCkpO1xuICB9XG5cbiAgdmlzaXRUaHJvd1N0bXQoc3RtdDogVGhyb3dTdG10KSB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKHN0bXQsIHRzLmNyZWF0ZVRocm93KHN0bXQuZXJyb3IudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSk7XG4gIH1cblxuICB2aXNpdENvbW1lbnRTdG10KHN0bXQ6IENvbW1lbnRTdG10LCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKSB7XG4gICAgY29uc3QgdGV4dCA9IHN0bXQubXVsdGlsaW5lID8gYCAke3N0bXQuY29tbWVudH0gYCA6IGAgJHtzdG10LmNvbW1lbnR9YDtcbiAgICByZXR1cm4gdGhpcy5jcmVhdGVDb21tZW50U3RtdCh0ZXh0LCBzdG10Lm11bHRpbGluZSwgc291cmNlRmlsZSk7XG4gIH1cblxuICB2aXNpdEpTRG9jQ29tbWVudFN0bXQoc3RtdDogSlNEb2NDb21tZW50U3RtdCwgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSkge1xuICAgIHJldHVybiB0aGlzLmNyZWF0ZUNvbW1lbnRTdG10KHN0bXQudG9TdHJpbmcoKSwgdHJ1ZSwgc291cmNlRmlsZSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUNvbW1lbnRTdG10KHRleHQ6IHN0cmluZywgbXVsdGlsaW5lOiBib29sZWFuLCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTpcbiAgICAgIHRzLk5vdEVtaXR0ZWRTdGF0ZW1lbnQge1xuICAgIGNvbnN0IGNvbW1lbnRTdG10ID0gdHMuY3JlYXRlTm90RW1pdHRlZFN0YXRlbWVudChzb3VyY2VGaWxlKTtcbiAgICBjb25zdCBraW5kID1cbiAgICAgICAgbXVsdGlsaW5lID8gdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhIDogdHMuU3ludGF4S2luZC5TaW5nbGVMaW5lQ29tbWVudFRyaXZpYTtcbiAgICB0cy5zZXRTeW50aGV0aWNMZWFkaW5nQ29tbWVudHMoY29tbWVudFN0bXQsIFt7a2luZCwgdGV4dCwgcG9zOiAtMSwgZW5kOiAtMX1dKTtcbiAgICByZXR1cm4gY29tbWVudFN0bXQ7XG4gIH1cblxuICAvLyBFeHByZXNzaW9uVmlzaXRvclxuICB2aXNpdFdyYXBwZWROb2RlRXhwcihleHByOiBXcmFwcGVkTm9kZUV4cHI8YW55Pikge1xuICAgIHJldHVybiB0aGlzLnJlY29yZChleHByLCBleHByLm5vZGUpO1xuICB9XG5cbiAgdmlzaXRUeXBlb2ZFeHByKGV4cHI6IFR5cGVvZkV4cHIpIHtcbiAgICBjb25zdCB0eXBlT2YgPSB0cy5jcmVhdGVUeXBlT2YoZXhwci5leHByLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSk7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKGV4cHIsIHR5cGVPZik7XG4gIH1cblxuICAvLyBFeHByZXNzaW9uVmlzaXRvclxuICB2aXNpdFJlYWRWYXJFeHByKGV4cHI6IFJlYWRWYXJFeHByKSB7XG4gICAgc3dpdGNoIChleHByLmJ1aWx0aW4pIHtcbiAgICAgIGNhc2UgQnVpbHRpblZhci5UaGlzOlxuICAgICAgICByZXR1cm4gdGhpcy5yZWNvcmQoZXhwciwgdHMuY3JlYXRlSWRlbnRpZmllcihNRVRIT0RfVEhJU19OQU1FKSk7XG4gICAgICBjYXNlIEJ1aWx0aW5WYXIuQ2F0Y2hFcnJvcjpcbiAgICAgICAgcmV0dXJuIHRoaXMucmVjb3JkKGV4cHIsIHRzLmNyZWF0ZUlkZW50aWZpZXIoQ0FUQ0hfRVJST1JfTkFNRSkpO1xuICAgICAgY2FzZSBCdWlsdGluVmFyLkNhdGNoU3RhY2s6XG4gICAgICAgIHJldHVybiB0aGlzLnJlY29yZChleHByLCB0cy5jcmVhdGVJZGVudGlmaWVyKENBVENIX1NUQUNLX05BTUUpKTtcbiAgICAgIGNhc2UgQnVpbHRpblZhci5TdXBlcjpcbiAgICAgICAgcmV0dXJuIHRoaXMucmVjb3JkKGV4cHIsIHRzLmNyZWF0ZVN1cGVyKCkpO1xuICAgIH1cbiAgICBpZiAoZXhwci5uYW1lKSB7XG4gICAgICByZXR1cm4gdGhpcy5yZWNvcmQoZXhwciwgdHMuY3JlYXRlSWRlbnRpZmllcihleHByLm5hbWUpKTtcbiAgICB9XG4gICAgdGhyb3cgRXJyb3IoYFVuZXhwZWN0ZWQgUmVhZFZhckV4cHIgZm9ybWApO1xuICB9XG5cbiAgdmlzaXRXcml0ZVZhckV4cHIoZXhwcjogV3JpdGVWYXJFeHByKTogUmVjb3JkZWROb2RlPHRzLkJpbmFyeUV4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIGV4cHIsXG4gICAgICAgIHRzLmNyZWF0ZUFzc2lnbm1lbnQoXG4gICAgICAgICAgICB0cy5jcmVhdGVJZGVudGlmaWVyKGV4cHIubmFtZSksIGV4cHIudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSk7XG4gIH1cblxuICB2aXNpdFdyaXRlS2V5RXhwcihleHByOiBXcml0ZUtleUV4cHIpOiBSZWNvcmRlZE5vZGU8dHMuQmluYXJ5RXhwcmVzc2lvbj4ge1xuICAgIHJldHVybiB0aGlzLnJlY29yZChcbiAgICAgICAgZXhwcixcbiAgICAgICAgdHMuY3JlYXRlQXNzaWdubWVudChcbiAgICAgICAgICAgIHRzLmNyZWF0ZUVsZW1lbnRBY2Nlc3MoXG4gICAgICAgICAgICAgICAgZXhwci5yZWNlaXZlci52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCksIGV4cHIuaW5kZXgudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSxcbiAgICAgICAgICAgIGV4cHIudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSk7XG4gIH1cblxuICB2aXNpdFdyaXRlUHJvcEV4cHIoZXhwcjogV3JpdGVQcm9wRXhwcik6IFJlY29yZGVkTm9kZTx0cy5CaW5hcnlFeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLFxuICAgICAgICB0cy5jcmVhdGVBc3NpZ25tZW50KFxuICAgICAgICAgICAgdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoZXhwci5yZWNlaXZlci52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCksIGV4cHIubmFtZSksXG4gICAgICAgICAgICBleHByLnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSkpO1xuICB9XG5cbiAgdmlzaXRJbnZva2VNZXRob2RFeHByKGV4cHI6IEludm9rZU1ldGhvZEV4cHIpOiBSZWNvcmRlZE5vZGU8dHMuQ2FsbEV4cHJlc3Npb24+IHtcbiAgICBjb25zdCBtZXRob2ROYW1lID0gZ2V0TWV0aG9kTmFtZShleHByKTtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIGV4cHIsXG4gICAgICAgIHRzLmNyZWF0ZUNhbGwoXG4gICAgICAgICAgICB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhleHByLnJlY2VpdmVyLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSwgbWV0aG9kTmFtZSksXG4gICAgICAgICAgICAvKiB0eXBlQXJndW1lbnRzICovIHVuZGVmaW5lZCwgZXhwci5hcmdzLm1hcChhcmcgPT4gYXJnLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSkpKTtcbiAgfVxuXG4gIHZpc2l0SW52b2tlRnVuY3Rpb25FeHByKGV4cHI6IEludm9rZUZ1bmN0aW9uRXhwcik6IFJlY29yZGVkTm9kZTx0cy5DYWxsRXhwcmVzc2lvbj4ge1xuICAgIHJldHVybiB0aGlzLnJlY29yZChcbiAgICAgICAgZXhwcixcbiAgICAgICAgdHMuY3JlYXRlQ2FsbChcbiAgICAgICAgICAgIGV4cHIuZm4udmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpLCAvKiB0eXBlQXJndW1lbnRzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGV4cHIuYXJncy5tYXAoYXJnID0+IGFyZy52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpKSk7XG4gIH1cblxuICB2aXNpdEluc3RhbnRpYXRlRXhwcihleHByOiBJbnN0YW50aWF0ZUV4cHIpOiBSZWNvcmRlZE5vZGU8dHMuTmV3RXhwcmVzc2lvbj4ge1xuICAgIHJldHVybiB0aGlzLnJlY29yZChcbiAgICAgICAgZXhwcixcbiAgICAgICAgdHMuY3JlYXRlTmV3KFxuICAgICAgICAgICAgZXhwci5jbGFzc0V4cHIudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpLCAvKiB0eXBlQXJndW1lbnRzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGV4cHIuYXJncy5tYXAoYXJnID0+IGFyZy52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpKSk7XG4gIH1cblxuICB2aXNpdExpdGVyYWxFeHByKGV4cHI6IExpdGVyYWxFeHByKSB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKGV4cHIsIGNyZWF0ZUxpdGVyYWwoZXhwci52YWx1ZSkpO1xuICB9XG5cbiAgdmlzaXRMb2NhbGl6ZWRTdHJpbmcoZXhwcjogTG9jYWxpemVkU3RyaW5nLCBjb250ZXh0OiBhbnkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2xvY2FsaXplZCBzdHJpbmdzIGFyZSBub3Qgc3VwcG9ydGVkIGluIHByZS1pdnkgbW9kZS4nKTtcbiAgfVxuXG4gIHZpc2l0RXh0ZXJuYWxFeHByKGV4cHI6IEV4dGVybmFsRXhwcikge1xuICAgIHJldHVybiB0aGlzLnJlY29yZChleHByLCB0aGlzLl92aXNpdElkZW50aWZpZXIoZXhwci52YWx1ZSkpO1xuICB9XG5cbiAgdmlzaXRDb25kaXRpb25hbEV4cHIoZXhwcjogQ29uZGl0aW9uYWxFeHByKTogUmVjb3JkZWROb2RlPHRzLlBhcmVudGhlc2l6ZWRFeHByZXNzaW9uPiB7XG4gICAgLy8gVE9ETyB7Y2h1Y2tqfTogUmV2aWV3IHVzZSBvZiAhIG9uIGZhbHNlQ2FzZS4gU2hvdWxkIGl0IGJlIG5vbi1udWxsYWJsZT9cbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIGV4cHIsXG4gICAgICAgIHRzLmNyZWF0ZVBhcmVuKHRzLmNyZWF0ZUNvbmRpdGlvbmFsKFxuICAgICAgICAgICAgZXhwci5jb25kaXRpb24udmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpLCBleHByLnRydWVDYXNlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSxcbiAgICAgICAgICAgIGV4cHIuZmFsc2VDYXNlIS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpKSk7XG4gIH1cblxuICB2aXNpdE5vdEV4cHIoZXhwcjogTm90RXhwcik6IFJlY29yZGVkTm9kZTx0cy5QcmVmaXhVbmFyeUV4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIGV4cHIsXG4gICAgICAgIHRzLmNyZWF0ZVByZWZpeChcbiAgICAgICAgICAgIHRzLlN5bnRheEtpbmQuRXhjbGFtYXRpb25Ub2tlbiwgZXhwci5jb25kaXRpb24udmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSk7XG4gIH1cblxuICB2aXNpdEFzc2VydE5vdE51bGxFeHByKGV4cHI6IEFzc2VydE5vdE51bGwpOiBSZWNvcmRlZE5vZGU8dHMuRXhwcmVzc2lvbj4ge1xuICAgIHJldHVybiBleHByLmNvbmRpdGlvbi52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCk7XG4gIH1cblxuICB2aXNpdENhc3RFeHByKGV4cHI6IENhc3RFeHByKTogUmVjb3JkZWROb2RlPHRzLkV4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gZXhwci52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCk7XG4gIH1cblxuICB2aXNpdEZ1bmN0aW9uRXhwcihleHByOiBGdW5jdGlvbkV4cHIpIHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmQoXG4gICAgICAgIGV4cHIsXG4gICAgICAgIHRzLmNyZWF0ZUZ1bmN0aW9uRXhwcmVzc2lvbihcbiAgICAgICAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsIC8qIGFzdHJpc2tUb2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAvKiBuYW1lICovIGV4cHIubmFtZSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICBleHByLnBhcmFtcy5tYXAoXG4gICAgICAgICAgICAgICAgcCA9PiB0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAgICAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLCAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAvKiBkb3REb3REb3RUb2tlbiAqLyB1bmRlZmluZWQsIHAubmFtZSkpLFxuICAgICAgICAgICAgLyogdHlwZSAqLyB1bmRlZmluZWQsIHRoaXMuX3Zpc2l0U3RhdGVtZW50cyhleHByLnN0YXRlbWVudHMpKSk7XG4gIH1cblxuICB2aXNpdEJpbmFyeU9wZXJhdG9yRXhwcihleHByOiBCaW5hcnlPcGVyYXRvckV4cHIpOlxuICAgICAgUmVjb3JkZWROb2RlPHRzLkJpbmFyeUV4cHJlc3Npb258dHMuUGFyZW50aGVzaXplZEV4cHJlc3Npb24+IHtcbiAgICBsZXQgYmluYXJ5T3BlcmF0b3I6IHRzLkJpbmFyeU9wZXJhdG9yO1xuICAgIHN3aXRjaCAoZXhwci5vcGVyYXRvcikge1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5BbmQ6XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5BbXBlcnNhbmRBbXBlcnNhbmRUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLkJpdHdpc2VBbmQ6XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5BbXBlcnNhbmRUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLkJpZ2dlcjpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkdyZWF0ZXJUaGFuVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5CaWdnZXJFcXVhbHM6XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5HcmVhdGVyVGhhbkVxdWFsc1Rva2VuO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQmluYXJ5T3BlcmF0b3IuRGl2aWRlOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuU2xhc2hUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLkVxdWFsczpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkVxdWFsc0VxdWFsc1Rva2VuO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQmluYXJ5T3BlcmF0b3IuSWRlbnRpY2FsOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuRXF1YWxzRXF1YWxzRXF1YWxzVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5Mb3dlcjpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkxlc3NUaGFuVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5Mb3dlckVxdWFsczpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkxlc3NUaGFuRXF1YWxzVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5NaW51czpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLk1pbnVzVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5Nb2R1bG86XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5QZXJjZW50VG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5NdWx0aXBseTpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkFzdGVyaXNrVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5Ob3RFcXVhbHM6XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5FeGNsYW1hdGlvbkVxdWFsc1Rva2VuO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQmluYXJ5T3BlcmF0b3IuTm90SWRlbnRpY2FsOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuRXhjbGFtYXRpb25FcXVhbHNFcXVhbHNUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLk9yOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuQmFyQmFyVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5QbHVzOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuUGx1c1Rva2VuO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBvcGVyYXRvcjogJHtleHByLm9wZXJhdG9yfWApO1xuICAgIH1cbiAgICBjb25zdCBiaW5hcnkgPSB0cy5jcmVhdGVCaW5hcnkoXG4gICAgICAgIGV4cHIubGhzLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSwgYmluYXJ5T3BlcmF0b3IsIGV4cHIucmhzLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSk7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKGV4cHIsIGV4cHIucGFyZW5zID8gdHMuY3JlYXRlUGFyZW4oYmluYXJ5KSA6IGJpbmFyeSk7XG4gIH1cblxuICB2aXNpdFJlYWRQcm9wRXhwcihleHByOiBSZWFkUHJvcEV4cHIpOiBSZWNvcmRlZE5vZGU8dHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLCB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhleHByLnJlY2VpdmVyLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSwgZXhwci5uYW1lKSk7XG4gIH1cblxuICB2aXNpdFJlYWRLZXlFeHByKGV4cHI6IFJlYWRLZXlFeHByKTogUmVjb3JkZWROb2RlPHRzLkVsZW1lbnRBY2Nlc3NFeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLFxuICAgICAgICB0cy5jcmVhdGVFbGVtZW50QWNjZXNzKFxuICAgICAgICAgICAgZXhwci5yZWNlaXZlci52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCksIGV4cHIuaW5kZXgudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSk7XG4gIH1cblxuICB2aXNpdExpdGVyYWxBcnJheUV4cHIoZXhwcjogTGl0ZXJhbEFycmF5RXhwcik6IFJlY29yZGVkTm9kZTx0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLCB0cy5jcmVhdGVBcnJheUxpdGVyYWwoZXhwci5lbnRyaWVzLm1hcChlbnRyeSA9PiBlbnRyeS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpKSk7XG4gIH1cblxuICB2aXNpdExpdGVyYWxNYXBFeHByKGV4cHI6IExpdGVyYWxNYXBFeHByKTogUmVjb3JkZWROb2RlPHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLFxuICAgICAgICB0cy5jcmVhdGVPYmplY3RMaXRlcmFsKGV4cHIuZW50cmllcy5tYXAoXG4gICAgICAgICAgICBlbnRyeSA9PiB0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQoXG4gICAgICAgICAgICAgICAgZW50cnkucXVvdGVkIHx8ICFfVkFMSURfSURFTlRJRklFUl9SRS50ZXN0KGVudHJ5LmtleSkgP1xuICAgICAgICAgICAgICAgICAgICB0cy5jcmVhdGVMaXRlcmFsKGVudHJ5LmtleSkgOlxuICAgICAgICAgICAgICAgICAgICBlbnRyeS5rZXksXG4gICAgICAgICAgICAgICAgZW50cnkudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSkpKTtcbiAgfVxuXG4gIHZpc2l0Q29tbWFFeHByKGV4cHI6IENvbW1hRXhwcik6IFJlY29yZGVkTm9kZTx0cy5FeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVjb3JkKFxuICAgICAgICBleHByLFxuICAgICAgICBleHByLnBhcnRzLm1hcChlID0+IGUudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKVxuICAgICAgICAgICAgLnJlZHVjZTx0cy5FeHByZXNzaW9ufG51bGw+KFxuICAgICAgICAgICAgICAgIChsZWZ0LCByaWdodCkgPT5cbiAgICAgICAgICAgICAgICAgICAgbGVmdCA/IHRzLmNyZWF0ZUJpbmFyeShsZWZ0LCB0cy5TeW50YXhLaW5kLkNvbW1hVG9rZW4sIHJpZ2h0KSA6IHJpZ2h0LFxuICAgICAgICAgICAgICAgIG51bGwpKTtcbiAgfVxuXG4gIHByaXZhdGUgX3Zpc2l0U3RhdGVtZW50cyhzdGF0ZW1lbnRzOiBTdGF0ZW1lbnRbXSk6IHRzLkJsb2NrIHtcbiAgICByZXR1cm4gdGhpcy5fdmlzaXRTdGF0ZW1lbnRzUHJlZml4KFtdLCBzdGF0ZW1lbnRzKTtcbiAgfVxuXG4gIHByaXZhdGUgX3Zpc2l0U3RhdGVtZW50c1ByZWZpeChwcmVmaXg6IHRzLlN0YXRlbWVudFtdLCBzdGF0ZW1lbnRzOiBTdGF0ZW1lbnRbXSkge1xuICAgIHJldHVybiB0cy5jcmVhdGVCbG9jayhbXG4gICAgICAuLi5wcmVmaXgsIC4uLnN0YXRlbWVudHMubWFwKHN0bXQgPT4gc3RtdC52aXNpdFN0YXRlbWVudCh0aGlzLCBudWxsKSkuZmlsdGVyKGYgPT4gZiAhPSBudWxsKVxuICAgIF0pO1xuICB9XG5cbiAgcHJpdmF0ZSBfdmlzaXRJZGVudGlmaWVyKHZhbHVlOiBFeHRlcm5hbFJlZmVyZW5jZSk6IHRzLkV4cHJlc3Npb24ge1xuICAgIC8vIG5hbWUgY2FuIG9ubHkgYmUgbnVsbCBkdXJpbmcgSklUIHdoaWNoIG5ldmVyIGV4ZWN1dGVzIHRoaXMgY29kZS5cbiAgICBjb25zdCBtb2R1bGVOYW1lID0gdmFsdWUubW9kdWxlTmFtZSwgbmFtZSA9IHZhbHVlLm5hbWUhO1xuICAgIGxldCBwcmVmaXhJZGVudDogdHMuSWRlbnRpZmllcnxudWxsID0gbnVsbDtcbiAgICBpZiAobW9kdWxlTmFtZSkge1xuICAgICAgbGV0IHByZWZpeCA9IHRoaXMuX2ltcG9ydHNXaXRoUHJlZml4ZXMuZ2V0KG1vZHVsZU5hbWUpO1xuICAgICAgaWYgKHByZWZpeCA9PSBudWxsKSB7XG4gICAgICAgIHByZWZpeCA9IGBpJHt0aGlzLl9pbXBvcnRzV2l0aFByZWZpeGVzLnNpemV9YDtcbiAgICAgICAgdGhpcy5faW1wb3J0c1dpdGhQcmVmaXhlcy5zZXQobW9kdWxlTmFtZSwgcHJlZml4KTtcbiAgICAgIH1cbiAgICAgIHByZWZpeElkZW50ID0gdHMuY3JlYXRlSWRlbnRpZmllcihwcmVmaXgpO1xuICAgIH1cbiAgICBpZiAocHJlZml4SWRlbnQpIHtcbiAgICAgIHJldHVybiB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhwcmVmaXhJZGVudCwgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGlkID0gdHMuY3JlYXRlSWRlbnRpZmllcihuYW1lKTtcbiAgICAgIGlmICh0aGlzLl9leHBvcnRlZFZhcmlhYmxlSWRlbnRpZmllcnMuaGFzKG5hbWUpKSB7XG4gICAgICAgIC8vIEluIG9yZGVyIGZvciB0aGlzIG5ldyBpZGVudGlmaWVyIG5vZGUgdG8gYmUgcHJvcGVybHkgcmV3cml0dGVuIGluIENvbW1vbkpTIG91dHB1dCxcbiAgICAgICAgLy8gaXQgbXVzdCBoYXZlIGl0cyBvcmlnaW5hbCBub2RlIHNldCB0byBhIHBhcnNlZCBpbnN0YW5jZSBvZiB0aGUgc2FtZSBpZGVudGlmaWVyLlxuICAgICAgICB0cy5zZXRPcmlnaW5hbE5vZGUoaWQsIHRoaXMuX2V4cG9ydGVkVmFyaWFibGVJZGVudGlmaWVycy5nZXQobmFtZSkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGlkO1xuICAgIH1cbiAgfVxufVxuXG5cbmZ1bmN0aW9uIGdldE1ldGhvZE5hbWUobWV0aG9kUmVmOiB7bmFtZTogc3RyaW5nfG51bGw7IGJ1aWx0aW46IEJ1aWx0aW5NZXRob2QgfCBudWxsfSk6IHN0cmluZyB7XG4gIGlmIChtZXRob2RSZWYubmFtZSkge1xuICAgIHJldHVybiBtZXRob2RSZWYubmFtZTtcbiAgfSBlbHNlIHtcbiAgICBzd2l0Y2ggKG1ldGhvZFJlZi5idWlsdGluKSB7XG4gICAgICBjYXNlIEJ1aWx0aW5NZXRob2QuQmluZDpcbiAgICAgICAgcmV0dXJuICdiaW5kJztcbiAgICAgIGNhc2UgQnVpbHRpbk1ldGhvZC5Db25jYXRBcnJheTpcbiAgICAgICAgcmV0dXJuICdjb25jYXQnO1xuICAgICAgY2FzZSBCdWlsdGluTWV0aG9kLlN1YnNjcmliZU9ic2VydmFibGU6XG4gICAgICAgIHJldHVybiAnc3Vic2NyaWJlJztcbiAgICB9XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKCdVbmV4cGVjdGVkIG1ldGhvZCByZWZlcmVuY2UgZm9ybScpO1xufVxuXG5mdW5jdGlvbiBtb2RpZmllckZyb21Nb2RpZmllcihtb2RpZmllcjogU3RtdE1vZGlmaWVyKTogdHMuTW9kaWZpZXIge1xuICBzd2l0Y2ggKG1vZGlmaWVyKSB7XG4gICAgY2FzZSBTdG10TW9kaWZpZXIuRXhwb3J0ZWQ6XG4gICAgICByZXR1cm4gdHMuY3JlYXRlVG9rZW4odHMuU3ludGF4S2luZC5FeHBvcnRLZXl3b3JkKTtcbiAgICBjYXNlIFN0bXRNb2RpZmllci5GaW5hbDpcbiAgICAgIHJldHVybiB0cy5jcmVhdGVUb2tlbih0cy5TeW50YXhLaW5kLkNvbnN0S2V5d29yZCk7XG4gICAgY2FzZSBTdG10TW9kaWZpZXIuUHJpdmF0ZTpcbiAgICAgIHJldHVybiB0cy5jcmVhdGVUb2tlbih0cy5TeW50YXhLaW5kLlByaXZhdGVLZXl3b3JkKTtcbiAgICBjYXNlIFN0bXRNb2RpZmllci5TdGF0aWM6XG4gICAgICByZXR1cm4gdHMuY3JlYXRlVG9rZW4odHMuU3ludGF4S2luZC5TdGF0aWNLZXl3b3JkKTtcbiAgfVxuICByZXR1cm4gZXJyb3IoYHVua25vd24gc3RhdGVtZW50IG1vZGlmaWVyYCk7XG59XG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZU1vZGlmaWVycyhtb2RpZmllcnM6IFN0bXRNb2RpZmllcltdfG51bGwpOiB0cy5Nb2RpZmllcltdfHVuZGVmaW5lZCB7XG4gIHJldHVybiBtb2RpZmllcnMgPT0gbnVsbCA/IHVuZGVmaW5lZCA6IG1vZGlmaWVycyEubWFwKG1vZGlmaWVyRnJvbU1vZGlmaWVyKTtcbn1cbiJdfQ==