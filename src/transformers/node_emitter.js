/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
        define("@angular/compiler-cli/src/transformers/node_emitter", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/transformers/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NodeEmitterVisitor = exports.updateSourceFile = exports.TypeScriptNodeEmitter = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/translator");
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
            var statements = [].concat.apply([], tslib_1.__spreadArray([], tslib_1.__read(stmts.map(function (stmt) { return stmt.visitStatement(converter, null); }).filter(function (stmt) { return stmt != null; }))));
            var sourceStatements = tslib_1.__spreadArray(tslib_1.__spreadArray(tslib_1.__spreadArray([], tslib_1.__read(converter.getReexports())), tslib_1.__read(converter.getImports())), tslib_1.__read(statements));
            if (preamble) {
                // We always attach the preamble comment to a `NotEmittedStatement` node, because tsickle uses
                // this node type as a marker of the preamble to ensure that it adds its own new nodes after
                // the preamble.
                var preambleCommentHolder = ts.createNotEmittedStatement(sourceFile);
                // Preamble comments are passed through as-is, which means that they must already contain a
                // leading `*` if they should be a JSDOC comment.
                ts.addSyntheticLeadingComment(preambleCommentHolder, ts.SyntaxKind.MultiLineCommentTrivia, preamble, 
                /* hasTrailingNewline */ true);
                sourceStatements.unshift(preambleCommentHolder);
            }
            converter.updateSourceMap(sourceStatements);
            var newSourceFile = ts.updateSourceFileNode(sourceFile, sourceStatements);
            return [newSourceFile, converter.getNodeMap()];
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
                        var newMembers = tslib_1.__spreadArray(tslib_1.__spreadArray([], tslib_1.__read(classDeclaration.members)), tslib_1.__read(newMethods));
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
            newStatements = tslib_1.__spreadArray(tslib_1.__spreadArray(tslib_1.__spreadArray(tslib_1.__spreadArray([], tslib_1.__read(newStatements.slice(0, index))), tslib_1.__read(imports)), tslib_1.__read(prefix)), tslib_1.__read(newStatements.slice(index)));
        }
        else {
            newStatements = tslib_1.__spreadArray(tslib_1.__spreadArray([], tslib_1.__read(prefix)), tslib_1.__read(newStatements));
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
        NodeEmitterVisitor.prototype.postProcess = function (ngNode, tsNode) {
            if (tsNode && !this._nodeMap.has(tsNode)) {
                this._nodeMap.set(tsNode, ngNode);
            }
            if (tsNode !== null && ngNode instanceof compiler_1.Statement && ngNode.leadingComments !== undefined) {
                translator_1.attachComments(tsNode, ngNode.leadingComments);
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
                var tsVarStmt = this.postProcess(stmt, ts.createVariableStatement(/* modifiers */ [], varDeclList));
                var exportStmt = this.postProcess(stmt, ts.createExportDeclaration(
                /*decorators*/ undefined, /*modifiers*/ undefined, ts.createNamedExports([ts.createExportSpecifier(stmt.name, stmt.name)])));
                return [tsVarStmt, exportStmt];
            }
            return this.postProcess(stmt, ts.createVariableStatement(this.getModifiers(stmt), varDeclList));
        };
        NodeEmitterVisitor.prototype.visitDeclareFunctionStmt = function (stmt) {
            return this.postProcess(stmt, ts.createFunctionDeclaration(
            /* decorators */ undefined, this.getModifiers(stmt), 
            /* asteriskToken */ undefined, stmt.name, /* typeParameters */ undefined, stmt.params.map(function (p) { return ts.createParameter(
            /* decorators */ undefined, /* modifiers */ undefined, 
            /* dotDotDotToken */ undefined, p.name); }), 
            /* type */ undefined, this._visitStatements(stmt.statements)));
        };
        NodeEmitterVisitor.prototype.visitExpressionStmt = function (stmt) {
            return this.postProcess(stmt, ts.createStatement(stmt.expr.visitExpression(this, null)));
        };
        NodeEmitterVisitor.prototype.visitReturnStmt = function (stmt) {
            return this.postProcess(stmt, ts.createReturn(stmt.value ? stmt.value.visitExpression(this, null) : undefined));
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
            return this.postProcess(stmt, ts.createClassDeclaration(
            /* decorators */ undefined, modifiers, stmt.name, /* typeParameters*/ undefined, stmt.parent &&
                [ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [stmt.parent.visitExpression(this, null)])] ||
                [], tslib_1.__spreadArray(tslib_1.__spreadArray(tslib_1.__spreadArray(tslib_1.__spreadArray([], tslib_1.__read(fields)), tslib_1.__read(getters)), tslib_1.__read(constructor)), tslib_1.__read(methods))));
        };
        NodeEmitterVisitor.prototype.visitIfStmt = function (stmt) {
            return this.postProcess(stmt, ts.createIf(stmt.condition.visitExpression(this, null), this._visitStatements(stmt.trueCase), stmt.falseCase && stmt.falseCase.length && this._visitStatements(stmt.falseCase) ||
                undefined));
        };
        NodeEmitterVisitor.prototype.visitTryCatchStmt = function (stmt) {
            return this.postProcess(stmt, ts.createTry(this._visitStatements(stmt.bodyStmts), ts.createCatchClause(CATCH_ERROR_NAME, this._visitStatementsPrefix([ts.createVariableStatement(
                /* modifiers */ undefined, [ts.createVariableDeclaration(CATCH_STACK_NAME, /* type */ undefined, ts.createPropertyAccess(ts.createIdentifier(CATCH_ERROR_NAME), ts.createIdentifier(CATCH_STACK_NAME)))])], stmt.catchStmts)), 
            /* finallyBlock */ undefined));
        };
        NodeEmitterVisitor.prototype.visitThrowStmt = function (stmt) {
            return this.postProcess(stmt, ts.createThrow(stmt.error.visitExpression(this, null)));
        };
        // ExpressionVisitor
        NodeEmitterVisitor.prototype.visitWrappedNodeExpr = function (expr) {
            return this.postProcess(expr, expr.node);
        };
        NodeEmitterVisitor.prototype.visitTypeofExpr = function (expr) {
            var typeOf = ts.createTypeOf(expr.expr.visitExpression(this, null));
            return this.postProcess(expr, typeOf);
        };
        // ExpressionVisitor
        NodeEmitterVisitor.prototype.visitReadVarExpr = function (expr) {
            switch (expr.builtin) {
                case compiler_1.BuiltinVar.This:
                    return this.postProcess(expr, ts.createIdentifier(METHOD_THIS_NAME));
                case compiler_1.BuiltinVar.CatchError:
                    return this.postProcess(expr, ts.createIdentifier(CATCH_ERROR_NAME));
                case compiler_1.BuiltinVar.CatchStack:
                    return this.postProcess(expr, ts.createIdentifier(CATCH_STACK_NAME));
                case compiler_1.BuiltinVar.Super:
                    return this.postProcess(expr, ts.createSuper());
            }
            if (expr.name) {
                return this.postProcess(expr, ts.createIdentifier(expr.name));
            }
            throw Error("Unexpected ReadVarExpr form");
        };
        NodeEmitterVisitor.prototype.visitWriteVarExpr = function (expr) {
            return this.postProcess(expr, ts.createAssignment(ts.createIdentifier(expr.name), expr.value.visitExpression(this, null)));
        };
        NodeEmitterVisitor.prototype.visitWriteKeyExpr = function (expr) {
            return this.postProcess(expr, ts.createAssignment(ts.createElementAccess(expr.receiver.visitExpression(this, null), expr.index.visitExpression(this, null)), expr.value.visitExpression(this, null)));
        };
        NodeEmitterVisitor.prototype.visitWritePropExpr = function (expr) {
            return this.postProcess(expr, ts.createAssignment(ts.createPropertyAccess(expr.receiver.visitExpression(this, null), expr.name), expr.value.visitExpression(this, null)));
        };
        NodeEmitterVisitor.prototype.visitInvokeMethodExpr = function (expr) {
            var _this = this;
            var methodName = getMethodName(expr);
            return this.postProcess(expr, ts.createCall(ts.createPropertyAccess(expr.receiver.visitExpression(this, null), methodName), 
            /* typeArguments */ undefined, expr.args.map(function (arg) { return arg.visitExpression(_this, null); })));
        };
        NodeEmitterVisitor.prototype.visitInvokeFunctionExpr = function (expr) {
            var _this = this;
            return this.postProcess(expr, ts.createCall(expr.fn.visitExpression(this, null), /* typeArguments */ undefined, expr.args.map(function (arg) { return arg.visitExpression(_this, null); })));
        };
        NodeEmitterVisitor.prototype.visitTaggedTemplateExpr = function (expr) {
            throw new Error('tagged templates are not supported in pre-ivy mode.');
        };
        NodeEmitterVisitor.prototype.visitInstantiateExpr = function (expr) {
            var _this = this;
            return this.postProcess(expr, ts.createNew(expr.classExpr.visitExpression(this, null), /* typeArguments */ undefined, expr.args.map(function (arg) { return arg.visitExpression(_this, null); })));
        };
        NodeEmitterVisitor.prototype.visitLiteralExpr = function (expr) {
            return this.postProcess(expr, createLiteral(expr.value));
        };
        NodeEmitterVisitor.prototype.visitLocalizedString = function (expr, context) {
            throw new Error('localized strings are not supported in pre-ivy mode.');
        };
        NodeEmitterVisitor.prototype.visitExternalExpr = function (expr) {
            return this.postProcess(expr, this._visitIdentifier(expr.value));
        };
        NodeEmitterVisitor.prototype.visitConditionalExpr = function (expr) {
            // TODO {chuckj}: Review use of ! on falseCase. Should it be non-nullable?
            return this.postProcess(expr, ts.createParen(ts.createConditional(expr.condition.visitExpression(this, null), expr.trueCase.visitExpression(this, null), expr.falseCase.visitExpression(this, null))));
        };
        NodeEmitterVisitor.prototype.visitNotExpr = function (expr) {
            return this.postProcess(expr, ts.createPrefix(ts.SyntaxKind.ExclamationToken, expr.condition.visitExpression(this, null)));
        };
        NodeEmitterVisitor.prototype.visitAssertNotNullExpr = function (expr) {
            return expr.condition.visitExpression(this, null);
        };
        NodeEmitterVisitor.prototype.visitCastExpr = function (expr) {
            return expr.value.visitExpression(this, null);
        };
        NodeEmitterVisitor.prototype.visitFunctionExpr = function (expr) {
            return this.postProcess(expr, ts.createFunctionExpression(
            /* modifiers */ undefined, /* astriskToken */ undefined, 
            /* name */ expr.name || undefined, 
            /* typeParameters */ undefined, expr.params.map(function (p) { return ts.createParameter(
            /* decorators */ undefined, /* modifiers */ undefined, 
            /* dotDotDotToken */ undefined, p.name); }), 
            /* type */ undefined, this._visitStatements(expr.statements)));
        };
        NodeEmitterVisitor.prototype.visitUnaryOperatorExpr = function (expr) {
            var unaryOperator;
            switch (expr.operator) {
                case compiler_1.UnaryOperator.Minus:
                    unaryOperator = ts.SyntaxKind.MinusToken;
                    break;
                case compiler_1.UnaryOperator.Plus:
                    unaryOperator = ts.SyntaxKind.PlusToken;
                    break;
                default:
                    throw new Error("Unknown operator: " + expr.operator);
            }
            var binary = ts.createPrefix(unaryOperator, expr.expr.visitExpression(this, null));
            return this.postProcess(expr, expr.parens ? ts.createParen(binary) : binary);
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
            return this.postProcess(expr, expr.parens ? ts.createParen(binary) : binary);
        };
        NodeEmitterVisitor.prototype.visitReadPropExpr = function (expr) {
            return this.postProcess(expr, ts.createPropertyAccess(expr.receiver.visitExpression(this, null), expr.name));
        };
        NodeEmitterVisitor.prototype.visitReadKeyExpr = function (expr) {
            return this.postProcess(expr, ts.createElementAccess(expr.receiver.visitExpression(this, null), expr.index.visitExpression(this, null)));
        };
        NodeEmitterVisitor.prototype.visitLiteralArrayExpr = function (expr) {
            var _this = this;
            return this.postProcess(expr, ts.createArrayLiteral(expr.entries.map(function (entry) { return entry.visitExpression(_this, null); })));
        };
        NodeEmitterVisitor.prototype.visitLiteralMapExpr = function (expr) {
            var _this = this;
            return this.postProcess(expr, ts.createObjectLiteral(expr.entries.map(function (entry) { return ts.createPropertyAssignment(entry.quoted || !_VALID_IDENTIFIER_RE.test(entry.key) ?
                ts.createLiteral(entry.key) :
                entry.key, entry.value.visitExpression(_this, null)); })));
        };
        NodeEmitterVisitor.prototype.visitCommaExpr = function (expr) {
            var _this = this;
            return this.postProcess(expr, expr.parts.map(function (e) { return e.visitExpression(_this, null); })
                .reduce(function (left, right) {
                return left ? ts.createBinary(left, ts.SyntaxKind.CommaToken, right) : right;
            }, null));
        };
        NodeEmitterVisitor.prototype._visitStatements = function (statements) {
            return this._visitStatementsPrefix([], statements);
        };
        NodeEmitterVisitor.prototype._visitStatementsPrefix = function (prefix, statements) {
            var _this = this;
            return ts.createBlock(tslib_1.__spreadArray(tslib_1.__spreadArray([], tslib_1.__read(prefix)), tslib_1.__read(statements.map(function (stmt) { return stmt.visitStatement(_this, null); }).filter(function (f) { return f != null; }))));
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
    }
    function translateModifiers(modifiers) {
        return modifiers == null ? undefined : modifiers.map(modifierFromModifier);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZV9lbWl0dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy90cmFuc2Zvcm1lcnMvbm9kZV9lbWl0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBZ3ZCO0lBQ2h2QiwrQkFBaUM7SUFFakMseUVBQW1EO0lBQ25ELG9FQUE2QjtJQU03QixJQUFNLGdCQUFnQixHQUFHLE1BQU0sQ0FBQztJQUNoQyxJQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FBQztJQUNqQyxJQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FBQztJQUNqQyxJQUFNLG9CQUFvQixHQUFHLHVCQUF1QixDQUFDO0lBRXJEO1FBQ0UsK0JBQW9CLDBCQUFtQztZQUFuQywrQkFBMEIsR0FBMUIsMEJBQTBCLENBQVM7UUFBRyxDQUFDO1FBRTNELGdEQUFnQixHQUFoQixVQUFpQixVQUF5QixFQUFFLEtBQWtCLEVBQUUsUUFBaUI7WUFFL0UsSUFBTSxTQUFTLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQztZQUMxRSwyRkFBMkY7WUFDM0YsU0FBUztZQUNULElBQU0sVUFBVSxHQUFVLEVBQUUsQ0FBQyxNQUFNLE9BQVQsRUFBRSwyQ0FDckIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxFQUFwQyxDQUFvQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsSUFBSSxJQUFJLElBQUksRUFBWixDQUFZLENBQUMsR0FBQyxDQUFDO1lBQzdGLElBQU0sZ0JBQWdCLHdGQUNkLFNBQVMsQ0FBQyxZQUFZLEVBQUUsbUJBQUssU0FBUyxDQUFDLFVBQVUsRUFBRSxtQkFBSyxVQUFVLEVBQUMs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XG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QXNzZXJ0Tm90TnVsbCwgQmluYXJ5T3BlcmF0b3IsIEJpbmFyeU9wZXJhdG9yRXhwciwgQnVpbHRpbk1ldGhvZCwgQnVpbHRpblZhciwgQ2FzdEV4cHIsIENsYXNzU3RtdCwgQ29tbWFFeHByLCBDb25kaXRpb25hbEV4cHIsIERlY2xhcmVGdW5jdGlvblN0bXQsIERlY2xhcmVWYXJTdG10LCBFeHByZXNzaW9uU3RhdGVtZW50LCBFeHByZXNzaW9uVmlzaXRvciwgRXh0ZXJuYWxFeHByLCBFeHRlcm5hbFJlZmVyZW5jZSwgRnVuY3Rpb25FeHByLCBJZlN0bXQsIEluc3RhbnRpYXRlRXhwciwgSW52b2tlRnVuY3Rpb25FeHByLCBJbnZva2VNZXRob2RFeHByLCBMZWFkaW5nQ29tbWVudCwgbGVhZGluZ0NvbW1lbnQsIExpdGVyYWxBcnJheUV4cHIsIExpdGVyYWxFeHByLCBMaXRlcmFsTWFwRXhwciwgTG9jYWxpemVkU3RyaW5nLCBOb3RFeHByLCBQYXJzZVNvdXJjZUZpbGUsIFBhcnNlU291cmNlU3BhbiwgUGFydGlhbE1vZHVsZSwgUmVhZEtleUV4cHIsIFJlYWRQcm9wRXhwciwgUmVhZFZhckV4cHIsIFJldHVyblN0YXRlbWVudCwgU3RhdGVtZW50LCBTdGF0ZW1lbnRWaXNpdG9yLCBTdG10TW9kaWZpZXIsIFRhZ2dlZFRlbXBsYXRlRXhwciwgVGhyb3dTdG10LCBUcnlDYXRjaFN0bXQsIFR5cGVvZkV4cHIsIFVuYXJ5T3BlcmF0b3IsIFVuYXJ5T3BlcmF0b3JFeHByLCBXcmFwcGVkTm9kZUV4cHIsIFdyaXRlS2V5RXhwciwgV3JpdGVQcm9wRXhwciwgV3JpdGVWYXJFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHthdHRhY2hDb21tZW50c30gZnJvbSAnLi4vbmd0c2MvdHJhbnNsYXRvcic7XG5pbXBvcnQge2Vycm9yfSBmcm9tICcuL3V0aWwnO1xuXG5leHBvcnQgaW50ZXJmYWNlIE5vZGUge1xuICBzb3VyY2VTcGFuOiBQYXJzZVNvdXJjZVNwYW58bnVsbDtcbn1cblxuY29uc3QgTUVUSE9EX1RISVNfTkFNRSA9ICd0aGlzJztcbmNvbnN0IENBVENIX0VSUk9SX05BTUUgPSAnZXJyb3InO1xuY29uc3QgQ0FUQ0hfU1RBQ0tfTkFNRSA9ICdzdGFjayc7XG5jb25zdCBfVkFMSURfSURFTlRJRklFUl9SRSA9IC9eWyRBLVpfXVswLTlBLVpfJF0qJC9pO1xuXG5leHBvcnQgY2xhc3MgVHlwZVNjcmlwdE5vZGVFbWl0dGVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcjogYm9vbGVhbikge31cblxuICB1cGRhdGVTb3VyY2VGaWxlKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIHN0bXRzOiBTdGF0ZW1lbnRbXSwgcHJlYW1ibGU/OiBzdHJpbmcpOlxuICAgICAgW3RzLlNvdXJjZUZpbGUsIE1hcDx0cy5Ob2RlLCBOb2RlPl0ge1xuICAgIGNvbnN0IGNvbnZlcnRlciA9IG5ldyBOb2RlRW1pdHRlclZpc2l0b3IodGhpcy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcik7XG4gICAgLy8gW10uY29uY2F0IGZsYXR0ZW5zIHRoZSByZXN1bHQgc28gdGhhdCBlYWNoIGB2aXNpdC4uLmAgbWV0aG9kIGNhbiBhbHNvIHJldHVybiBhbiBhcnJheSBvZlxuICAgIC8vIHN0bXRzLlxuICAgIGNvbnN0IHN0YXRlbWVudHM6IGFueVtdID0gW10uY29uY2F0KFxuICAgICAgICAuLi5zdG10cy5tYXAoc3RtdCA9PiBzdG10LnZpc2l0U3RhdGVtZW50KGNvbnZlcnRlciwgbnVsbCkpLmZpbHRlcihzdG10ID0+IHN0bXQgIT0gbnVsbCkpO1xuICAgIGNvbnN0IHNvdXJjZVN0YXRlbWVudHMgPVxuICAgICAgICBbLi4uY29udmVydGVyLmdldFJlZXhwb3J0cygpLCAuLi5jb252ZXJ0ZXIuZ2V0SW1wb3J0cygpLCAuLi5zdGF0ZW1lbnRzXTtcbiAgICBpZiAocHJlYW1ibGUpIHtcbiAgICAgIC8vIFdlIGFsd2F5cyBhdHRhY2ggdGhlIHByZWFtYmxlIGNvbW1lbnQgdG8gYSBgTm90RW1pdHRlZFN0YXRlbWVudGAgbm9kZSwgYmVjYXVzZSB0c2lja2xlIHVzZXNcbiAgICAgIC8vIHRoaXMgbm9kZSB0eXBlIGFzIGEgbWFya2VyIG9mIHRoZSBwcmVhbWJsZSB0byBlbnN1cmUgdGhhdCBpdCBhZGRzIGl0cyBvd24gbmV3IG5vZGVzIGFmdGVyXG4gICAgICAvLyB0aGUgcHJlYW1ibGUuXG4gICAgICBjb25zdCBwcmVhbWJsZUNvbW1lbnRIb2xkZXIgPSB0cy5jcmVhdGVOb3RFbWl0dGVkU3RhdGVtZW50KHNvdXJjZUZpbGUpO1xuICAgICAgLy8gUHJlYW1ibGUgY29tbWVudHMgYXJlIHBhc3NlZCB0aHJvdWdoIGFzLWlzLCB3aGljaCBtZWFucyB0aGF0IHRoZXkgbXVzdCBhbHJlYWR5IGNvbnRhaW4gYVxuICAgICAgLy8gbGVhZGluZyBgKmAgaWYgdGhleSBzaG91bGQgYmUgYSBKU0RPQyBjb21tZW50LlxuICAgICAgdHMuYWRkU3ludGhldGljTGVhZGluZ0NvbW1lbnQoXG4gICAgICAgICAgcHJlYW1ibGVDb21tZW50SG9sZGVyLCB0cy5TeW50YXhLaW5kLk11bHRpTGluZUNvbW1lbnRUcml2aWEsIHByZWFtYmxlLFxuICAgICAgICAgIC8qIGhhc1RyYWlsaW5nTmV3bGluZSAqLyB0cnVlKTtcbiAgICAgIHNvdXJjZVN0YXRlbWVudHMudW5zaGlmdChwcmVhbWJsZUNvbW1lbnRIb2xkZXIpO1xuICAgIH1cblxuICAgIGNvbnZlcnRlci51cGRhdGVTb3VyY2VNYXAoc291cmNlU3RhdGVtZW50cyk7XG4gICAgY29uc3QgbmV3U291cmNlRmlsZSA9IHRzLnVwZGF0ZVNvdXJjZUZpbGVOb2RlKHNvdXJjZUZpbGUsIHNvdXJjZVN0YXRlbWVudHMpO1xuICAgIHJldHVybiBbbmV3U291cmNlRmlsZSwgY29udmVydGVyLmdldE5vZGVNYXAoKV07XG4gIH1cbn1cblxuLyoqXG4gKiBVcGRhdGUgdGhlIGdpdmVuIHNvdXJjZSBmaWxlIHRvIGluY2x1ZGUgdGhlIGNoYW5nZXMgc3BlY2lmaWVkIGluIG1vZHVsZS5cbiAqXG4gKiBUaGUgbW9kdWxlIHBhcmFtZXRlciBpcyB0cmVhdGVkIGFzIGEgcGFydGlhbCBtb2R1bGUgbWVhbmluZyB0aGF0IHRoZSBzdGF0ZW1lbnRzIGFyZSBhZGRlZCB0b1xuICogdGhlIG1vZHVsZSBpbnN0ZWFkIG9mIHJlcGxhY2luZyB0aGUgbW9kdWxlLiBBbHNvLCBhbnkgY2xhc3NlcyBhcmUgdHJlYXRlZCBhcyBwYXJ0aWFsIGNsYXNzZXNcbiAqIGFuZCB0aGUgaW5jbHVkZWQgbWVtYmVycyBhcmUgYWRkZWQgdG8gdGhlIGNsYXNzIHdpdGggdGhlIHNhbWUgbmFtZSBpbnN0ZWFkIG9mIGEgbmV3IGNsYXNzXG4gKiBiZWluZyBjcmVhdGVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlU291cmNlRmlsZShcbiAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBtb2R1bGU6IFBhcnRpYWxNb2R1bGUsXG4gICAgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI6IGJvb2xlYW4pOiBbdHMuU291cmNlRmlsZSwgTWFwPHRzLk5vZGUsIE5vZGU+XSB7XG4gIGNvbnN0IGNvbnZlcnRlciA9IG5ldyBOb2RlRW1pdHRlclZpc2l0b3IoYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIpO1xuICBjb252ZXJ0ZXIubG9hZEV4cG9ydGVkVmFyaWFibGVJZGVudGlmaWVycyhzb3VyY2VGaWxlKTtcblxuICBjb25zdCBwcmVmaXhTdGF0ZW1lbnRzID0gbW9kdWxlLnN0YXRlbWVudHMuZmlsdGVyKHN0YXRlbWVudCA9PiAhKHN0YXRlbWVudCBpbnN0YW5jZW9mIENsYXNzU3RtdCkpO1xuICBjb25zdCBjbGFzc2VzID1cbiAgICAgIG1vZHVsZS5zdGF0ZW1lbnRzLmZpbHRlcihzdGF0ZW1lbnQgPT4gc3RhdGVtZW50IGluc3RhbmNlb2YgQ2xhc3NTdG10KSBhcyBDbGFzc1N0bXRbXTtcbiAgY29uc3QgY2xhc3NNYXAgPSBuZXcgTWFwKFxuICAgICAgY2xhc3Nlcy5tYXA8W3N0cmluZywgQ2xhc3NTdG10XT4oY2xhc3NTdGF0ZW1lbnQgPT4gW2NsYXNzU3RhdGVtZW50Lm5hbWUsIGNsYXNzU3RhdGVtZW50XSkpO1xuICBjb25zdCBjbGFzc05hbWVzID0gbmV3IFNldChjbGFzc2VzLm1hcChjbGFzc1N0YXRlbWVudCA9PiBjbGFzc1N0YXRlbWVudC5uYW1lKSk7XG5cbiAgY29uc3QgcHJlZml4OiB0cy5TdGF0ZW1lbnRbXSA9XG4gICAgICBwcmVmaXhTdGF0ZW1lbnRzLm1hcChzdGF0ZW1lbnQgPT4gc3RhdGVtZW50LnZpc2l0U3RhdGVtZW50KGNvbnZlcnRlciwgc291cmNlRmlsZSkpO1xuXG4gIC8vIEFkZCBzdGF0aWMgbWV0aG9kcyB0byBhbGwgdGhlIGNsYXNzZXMgcmVmZXJlbmNlZCBpbiBtb2R1bGUuXG4gIGxldCBuZXdTdGF0ZW1lbnRzID0gc291cmNlRmlsZS5zdGF0ZW1lbnRzLm1hcChub2RlID0+IHtcbiAgICBpZiAobm9kZS5raW5kID09IHRzLlN5bnRheEtpbmQuQ2xhc3NEZWNsYXJhdGlvbikge1xuICAgICAgY29uc3QgY2xhc3NEZWNsYXJhdGlvbiA9IG5vZGUgYXMgdHMuQ2xhc3NEZWNsYXJhdGlvbjtcbiAgICAgIGNvbnN0IG5hbWUgPSBjbGFzc0RlY2xhcmF0aW9uLm5hbWU7XG4gICAgICBpZiAobmFtZSkge1xuICAgICAgICBjb25zdCBjbGFzc1N0YXRlbWVudCA9IGNsYXNzTWFwLmdldChuYW1lLnRleHQpO1xuICAgICAgICBpZiAoY2xhc3NTdGF0ZW1lbnQpIHtcbiAgICAgICAgICBjbGFzc05hbWVzLmRlbGV0ZShuYW1lLnRleHQpO1xuICAgICAgICAgIGNvbnN0IGNsYXNzTWVtYmVySG9sZGVyID1cbiAgICAgICAgICAgICAgY29udmVydGVyLnZpc2l0RGVjbGFyZUNsYXNzU3RtdChjbGFzc1N0YXRlbWVudCkgYXMgdHMuQ2xhc3NEZWNsYXJhdGlvbjtcbiAgICAgICAgICBjb25zdCBuZXdNZXRob2RzID1cbiAgICAgICAgICAgICAgY2xhc3NNZW1iZXJIb2xkZXIubWVtYmVycy5maWx0ZXIobWVtYmVyID0+IG1lbWJlci5raW5kICE9PSB0cy5TeW50YXhLaW5kLkNvbnN0cnVjdG9yKTtcbiAgICAgICAgICBjb25zdCBuZXdNZW1iZXJzID0gWy4uLmNsYXNzRGVjbGFyYXRpb24ubWVtYmVycywgLi4ubmV3TWV0aG9kc107XG5cbiAgICAgICAgICByZXR1cm4gdHMudXBkYXRlQ2xhc3NEZWNsYXJhdGlvbihcbiAgICAgICAgICAgICAgY2xhc3NEZWNsYXJhdGlvbixcbiAgICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyBjbGFzc0RlY2xhcmF0aW9uLmRlY29yYXRvcnMsXG4gICAgICAgICAgICAgIC8qIG1vZGlmaWVycyAqLyBjbGFzc0RlY2xhcmF0aW9uLm1vZGlmaWVycyxcbiAgICAgICAgICAgICAgLyogbmFtZSAqLyBjbGFzc0RlY2xhcmF0aW9uLm5hbWUsXG4gICAgICAgICAgICAgIC8qIHR5cGVQYXJhbWV0ZXJzICovIGNsYXNzRGVjbGFyYXRpb24udHlwZVBhcmFtZXRlcnMsXG4gICAgICAgICAgICAgIC8qIGhlcml0YWdlQ2xhdXNlcyAqLyBjbGFzc0RlY2xhcmF0aW9uLmhlcml0YWdlQ2xhdXNlcyB8fCBbXSxcbiAgICAgICAgICAgICAgLyogbWVtYmVycyAqLyBuZXdNZW1iZXJzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbm9kZTtcbiAgfSk7XG5cbiAgLy8gVmFsaWRhdGUgdGhhdCBhbGwgdGhlIGNsYXNzZXMgaGF2ZSBiZWVuIGdlbmVyYXRlZFxuICBjbGFzc05hbWVzLnNpemUgPT0gMCB8fFxuICAgICAgZXJyb3IoYCR7Y2xhc3NOYW1lcy5zaXplID09IDEgPyAnQ2xhc3MnIDogJ0NsYXNzZXMnfSBcIiR7XG4gICAgICAgICAgQXJyYXkuZnJvbShjbGFzc05hbWVzLmtleXMoKSkuam9pbignLCAnKX1cIiBub3QgZ2VuZXJhdGVkYCk7XG5cbiAgLy8gQWRkIGltcG9ydHMgdG8gdGhlIG1vZHVsZSByZXF1aXJlZCBieSB0aGUgbmV3IG1ldGhvZHNcbiAgY29uc3QgaW1wb3J0cyA9IGNvbnZlcnRlci5nZXRJbXBvcnRzKCk7XG4gIGlmIChpbXBvcnRzICYmIGltcG9ydHMubGVuZ3RoKSB7XG4gICAgLy8gRmluZCB3aGVyZSB0aGUgbmV3IGltcG9ydHMgc2hvdWxkIGdvXG4gICAgY29uc3QgaW5kZXggPSBmaXJzdEFmdGVyKFxuICAgICAgICBuZXdTdGF0ZW1lbnRzLFxuICAgICAgICBzdGF0ZW1lbnQgPT4gc3RhdGVtZW50LmtpbmQgPT09IHRzLlN5bnRheEtpbmQuSW1wb3J0RGVjbGFyYXRpb24gfHxcbiAgICAgICAgICAgIHN0YXRlbWVudC5raW5kID09PSB0cy5TeW50YXhLaW5kLkltcG9ydEVxdWFsc0RlY2xhcmF0aW9uKTtcbiAgICBuZXdTdGF0ZW1lbnRzID1cbiAgICAgICAgWy4uLm5ld1N0YXRlbWVudHMuc2xpY2UoMCwgaW5kZXgpLCAuLi5pbXBvcnRzLCAuLi5wcmVmaXgsIC4uLm5ld1N0YXRlbWVudHMuc2xpY2UoaW5kZXgpXTtcbiAgfSBlbHNlIHtcbiAgICBuZXdTdGF0ZW1lbnRzID0gWy4uLnByZWZpeCwgLi4ubmV3U3RhdGVtZW50c107XG4gIH1cblxuICBjb252ZXJ0ZXIudXBkYXRlU291cmNlTWFwKG5ld1N0YXRlbWVudHMpO1xuICBjb25zdCBuZXdTb3VyY2VGaWxlID0gdHMudXBkYXRlU291cmNlRmlsZU5vZGUoc291cmNlRmlsZSwgbmV3U3RhdGVtZW50cyk7XG5cbiAgcmV0dXJuIFtuZXdTb3VyY2VGaWxlLCBjb252ZXJ0ZXIuZ2V0Tm9kZU1hcCgpXTtcbn1cblxuLy8gUmV0dXJuIHRoZSBpbmRleCBhZnRlciB0aGUgZmlyc3QgdmFsdWUgaW4gYGFgIHRoYXQgZG9lc24ndCBtYXRjaCB0aGUgcHJlZGljYXRlIGFmdGVyIGEgdmFsdWUgdGhhdFxuLy8gZG9lcyBvciAwIGlmIG5vIHZhbHVlcyBtYXRjaC5cbmZ1bmN0aW9uIGZpcnN0QWZ0ZXI8VD4oYTogVFtdLCBwcmVkaWNhdGU6ICh2YWx1ZTogVCkgPT4gYm9vbGVhbikge1xuICBsZXQgaW5kZXggPSAwO1xuICBjb25zdCBsZW4gPSBhLmxlbmd0aDtcbiAgZm9yICg7IGluZGV4IDwgbGVuOyBpbmRleCsrKSB7XG4gICAgY29uc3QgdmFsdWUgPSBhW2luZGV4XTtcbiAgICBpZiAocHJlZGljYXRlKHZhbHVlKSkgYnJlYWs7XG4gIH1cbiAgaWYgKGluZGV4ID49IGxlbikgcmV0dXJuIDA7XG4gIGZvciAoOyBpbmRleCA8IGxlbjsgaW5kZXgrKykge1xuICAgIGNvbnN0IHZhbHVlID0gYVtpbmRleF07XG4gICAgaWYgKCFwcmVkaWNhdGUodmFsdWUpKSBicmVhaztcbiAgfVxuICByZXR1cm4gaW5kZXg7XG59XG5cbi8vIEEgcmVjb3JkZWQgbm9kZSBpcyBhIHN1YnR5cGUgb2YgdGhlIG5vZGUgdGhhdCBpcyBtYXJrZWQgYXMgYmVpbmcgcmVjb3JkZWQuIFRoaXMgaXMgdXNlZFxuLy8gdG8gZW5zdXJlIHRoYXQgTm9kZUVtaXR0ZXJWaXNpdG9yLnJlY29yZCBoYXMgYmVlbiBjYWxsZWQgb24gYWxsIG5vZGVzIHJldHVybmVkIGJ5IHRoZVxuLy8gTm9kZUVtaXR0ZXJWaXNpdG9yXG5leHBvcnQgdHlwZSBSZWNvcmRlZE5vZGU8VCBleHRlbmRzIHRzLk5vZGUgPSB0cy5Ob2RlPiA9IChUJntcbiAgX19yZWNvcmRlZDogYW55O1xufSl8bnVsbDtcblxuZnVuY3Rpb24gZXNjYXBlTGl0ZXJhbCh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHZhbHVlLnJlcGxhY2UoLyhcXFwifFxcXFwpL2csICdcXFxcJDEnKS5yZXBsYWNlKC8oXFxuKXwoXFxyKS9nLCBmdW5jdGlvbih2LCBuLCByKSB7XG4gICAgcmV0dXJuIG4gPyAnXFxcXG4nIDogJ1xcXFxyJztcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUxpdGVyYWwodmFsdWU6IGFueSkge1xuICBpZiAodmFsdWUgPT09IG51bGwpIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlTnVsbCgpO1xuICB9IGVsc2UgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlSWRlbnRpZmllcigndW5kZWZpbmVkJyk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgcmVzdWx0ID0gdHMuY3JlYXRlTGl0ZXJhbCh2YWx1ZSk7XG4gICAgaWYgKHRzLmlzU3RyaW5nTGl0ZXJhbChyZXN1bHQpICYmIHJlc3VsdC50ZXh0LmluZGV4T2YoJ1xcXFwnKSA+PSAwKSB7XG4gICAgICAvLyBIYWNrIHRvIGF2b2lkIHByb2JsZW1zIGNhdXNlIGluZGlyZWN0bHkgYnk6XG4gICAgICAvLyAgICBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzIwMTkyXG4gICAgICAvLyBUaGlzIGF2b2lkcyB0aGUgc3RyaW5nIGVzY2FwaW5nIG5vcm1hbGx5IHBlcmZvcm1lZCBmb3IgYSBzdHJpbmcgcmVseWluZyBvbiB0aGF0XG4gICAgICAvLyBUeXBlU2NyaXB0IGp1c3QgZW1pdHMgdGhlIHRleHQgcmF3IGZvciBhIG51bWVyaWMgbGl0ZXJhbC5cbiAgICAgIChyZXN1bHQgYXMgYW55KS5raW5kID0gdHMuU3ludGF4S2luZC5OdW1lcmljTGl0ZXJhbDtcbiAgICAgIHJlc3VsdC50ZXh0ID0gYFwiJHtlc2NhcGVMaXRlcmFsKHJlc3VsdC50ZXh0KX1cImA7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNFeHBvcnRUeXBlU3RhdGVtZW50KHN0YXRlbWVudDogdHMuU3RhdGVtZW50KTogYm9vbGVhbiB7XG4gIHJldHVybiAhIXN0YXRlbWVudC5tb2RpZmllcnMgJiZcbiAgICAgIHN0YXRlbWVudC5tb2RpZmllcnMuc29tZShtb2QgPT4gbW9kLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXhwb3J0S2V5d29yZCk7XG59XG5cbi8qKlxuICogVmlzaXRzIGFuIG91dHB1dCBhc3QgYW5kIHByb2R1Y2VzIHRoZSBjb3JyZXNwb25kaW5nIFR5cGVTY3JpcHQgc3ludGhldGljIG5vZGVzLlxuICovXG5leHBvcnQgY2xhc3MgTm9kZUVtaXR0ZXJWaXNpdG9yIGltcGxlbWVudHMgU3RhdGVtZW50VmlzaXRvciwgRXhwcmVzc2lvblZpc2l0b3Ige1xuICBwcml2YXRlIF9ub2RlTWFwID0gbmV3IE1hcDx0cy5Ob2RlLCBOb2RlPigpO1xuICBwcml2YXRlIF9pbXBvcnRzV2l0aFByZWZpeGVzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgcHJpdmF0ZSBfcmVleHBvcnRzID0gbmV3IE1hcDxzdHJpbmcsIHtuYW1lOiBzdHJpbmcsIGFzOiBzdHJpbmd9W10+KCk7XG4gIHByaXZhdGUgX3RlbXBsYXRlU291cmNlcyA9IG5ldyBNYXA8UGFyc2VTb3VyY2VGaWxlLCB0cy5Tb3VyY2VNYXBTb3VyY2U+KCk7XG4gIHByaXZhdGUgX2V4cG9ydGVkVmFyaWFibGVJZGVudGlmaWVycyA9IG5ldyBNYXA8c3RyaW5nLCB0cy5JZGVudGlmaWVyPigpO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI6IGJvb2xlYW4pIHt9XG5cbiAgLyoqXG4gICAqIFByb2Nlc3MgdGhlIHNvdXJjZSBmaWxlIGFuZCBjb2xsZWN0IGV4cG9ydGVkIGlkZW50aWZpZXJzIHRoYXQgcmVmZXIgdG8gdmFyaWFibGVzLlxuICAgKlxuICAgKiBPbmx5IHZhcmlhYmxlcyBhcmUgY29sbGVjdGVkIGJlY2F1c2UgZXhwb3J0ZWQgY2xhc3NlcyBzdGlsbCBleGlzdCBpbiB0aGUgbW9kdWxlIHNjb3BlIGluXG4gICAqIENvbW1vbkpTLCB3aGVyZWFzIHZhcmlhYmxlcyBoYXZlIHRoZWlyIGRlY2xhcmF0aW9ucyBtb3ZlZCBvbnRvIHRoZSBgZXhwb3J0c2Agb2JqZWN0LCBhbmQgYWxsXG4gICAqIHJlZmVyZW5jZXMgYXJlIHVwZGF0ZWQgYWNjb3JkaW5nbHkuXG4gICAqL1xuICBsb2FkRXhwb3J0ZWRWYXJpYWJsZUlkZW50aWZpZXJzKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBzb3VyY2VGaWxlLnN0YXRlbWVudHMuZm9yRWFjaChzdGF0ZW1lbnQgPT4ge1xuICAgICAgaWYgKHRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoc3RhdGVtZW50KSAmJiBpc0V4cG9ydFR5cGVTdGF0ZW1lbnQoc3RhdGVtZW50KSkge1xuICAgICAgICBzdGF0ZW1lbnQuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9ucy5mb3JFYWNoKGRlY2xhcmF0aW9uID0+IHtcbiAgICAgICAgICBpZiAodHMuaXNJZGVudGlmaWVyKGRlY2xhcmF0aW9uLm5hbWUpKSB7XG4gICAgICAgICAgICB0aGlzLl9leHBvcnRlZFZhcmlhYmxlSWRlbnRpZmllcnMuc2V0KGRlY2xhcmF0aW9uLm5hbWUudGV4dCwgZGVjbGFyYXRpb24ubmFtZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGdldFJlZXhwb3J0cygpOiB0cy5TdGF0ZW1lbnRbXSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5fcmVleHBvcnRzLmVudHJpZXMoKSlcbiAgICAgICAgLm1hcChcbiAgICAgICAgICAgIChbZXhwb3J0ZWRGaWxlUGF0aCwgcmVleHBvcnRzXSkgPT4gdHMuY3JlYXRlRXhwb3J0RGVjbGFyYXRpb24oXG4gICAgICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICB0cy5jcmVhdGVOYW1lZEV4cG9ydHMoXG4gICAgICAgICAgICAgICAgICAgIHJlZXhwb3J0cy5tYXAoKHtuYW1lLCBhc30pID0+IHRzLmNyZWF0ZUV4cG9ydFNwZWNpZmllcihuYW1lLCBhcykpKSxcbiAgICAgICAgICAgICAgICAvKiBtb2R1bGVTcGVjaWZpZXIgKi8gY3JlYXRlTGl0ZXJhbChleHBvcnRlZEZpbGVQYXRoKSkpO1xuICB9XG5cbiAgZ2V0SW1wb3J0cygpOiB0cy5TdGF0ZW1lbnRbXSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5faW1wb3J0c1dpdGhQcmVmaXhlcy5lbnRyaWVzKCkpXG4gICAgICAgIC5tYXAoXG4gICAgICAgICAgICAoW25hbWVzcGFjZSwgcHJlZml4XSkgPT4gdHMuY3JlYXRlSW1wb3J0RGVjbGFyYXRpb24oXG4gICAgICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAvKiBpbXBvcnRDbGF1c2UgKi9cbiAgICAgICAgICAgICAgICB0cy5jcmVhdGVJbXBvcnRDbGF1c2UoXG4gICAgICAgICAgICAgICAgICAgIC8qIG5hbWUgKi88dHMuSWRlbnRpZmllcj4odW5kZWZpbmVkIGFzIGFueSksXG4gICAgICAgICAgICAgICAgICAgIHRzLmNyZWF0ZU5hbWVzcGFjZUltcG9ydCh0cy5jcmVhdGVJZGVudGlmaWVyKHByZWZpeCkpKSxcbiAgICAgICAgICAgICAgICAvKiBtb2R1bGVTcGVjaWZpZXIgKi8gY3JlYXRlTGl0ZXJhbChuYW1lc3BhY2UpKSk7XG4gIH1cblxuICBnZXROb2RlTWFwKCkge1xuICAgIHJldHVybiB0aGlzLl9ub2RlTWFwO1xuICB9XG5cbiAgdXBkYXRlU291cmNlTWFwKHN0YXRlbWVudHM6IHRzLlN0YXRlbWVudFtdKSB7XG4gICAgbGV0IGxhc3RSYW5nZVN0YXJ0Tm9kZTogdHMuTm9kZXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgbGV0IGxhc3RSYW5nZUVuZE5vZGU6IHRzLk5vZGV8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGxldCBsYXN0UmFuZ2U6IHRzLlNvdXJjZU1hcFJhbmdlfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICAgIGNvbnN0IHJlY29yZExhc3RTb3VyY2VSYW5nZSA9ICgpID0+IHtcbiAgICAgIGlmIChsYXN0UmFuZ2UgJiYgbGFzdFJhbmdlU3RhcnROb2RlICYmIGxhc3RSYW5nZUVuZE5vZGUpIHtcbiAgICAgICAgaWYgKGxhc3RSYW5nZVN0YXJ0Tm9kZSA9PSBsYXN0UmFuZ2VFbmROb2RlKSB7XG4gICAgICAgICAgdHMuc2V0U291cmNlTWFwUmFuZ2UobGFzdFJhbmdlRW5kTm9kZSwgbGFzdFJhbmdlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0cy5zZXRTb3VyY2VNYXBSYW5nZShsYXN0UmFuZ2VTdGFydE5vZGUsIGxhc3RSYW5nZSk7XG4gICAgICAgICAgLy8gT25seSBlbWl0IHRoZSBwb3MgZm9yIHRoZSBmaXJzdCBub2RlIGVtaXR0ZWQgaW4gdGhlIHJhbmdlLlxuICAgICAgICAgIHRzLnNldEVtaXRGbGFncyhsYXN0UmFuZ2VTdGFydE5vZGUsIHRzLkVtaXRGbGFncy5Ob1RyYWlsaW5nU291cmNlTWFwKTtcbiAgICAgICAgICB0cy5zZXRTb3VyY2VNYXBSYW5nZShsYXN0UmFuZ2VFbmROb2RlLCBsYXN0UmFuZ2UpO1xuICAgICAgICAgIC8vIE9ubHkgZW1pdCBlbWl0IGVuZCBmb3IgdGhlIGxhc3Qgbm9kZSBlbWl0dGVkIGluIHRoZSByYW5nZS5cbiAgICAgICAgICB0cy5zZXRFbWl0RmxhZ3MobGFzdFJhbmdlRW5kTm9kZSwgdHMuRW1pdEZsYWdzLk5vTGVhZGluZ1NvdXJjZU1hcCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgdmlzaXROb2RlID0gKHRzTm9kZTogdHMuTm9kZSkgPT4ge1xuICAgICAgY29uc3QgbmdOb2RlID0gdGhpcy5fbm9kZU1hcC5nZXQodHNOb2RlKTtcbiAgICAgIGlmIChuZ05vZGUpIHtcbiAgICAgICAgY29uc3QgcmFuZ2UgPSB0aGlzLnNvdXJjZVJhbmdlT2YobmdOb2RlKTtcbiAgICAgICAgaWYgKHJhbmdlKSB7XG4gICAgICAgICAgaWYgKCFsYXN0UmFuZ2UgfHwgcmFuZ2Uuc291cmNlICE9IGxhc3RSYW5nZS5zb3VyY2UgfHwgcmFuZ2UucG9zICE9IGxhc3RSYW5nZS5wb3MgfHxcbiAgICAgICAgICAgICAgcmFuZ2UuZW5kICE9IGxhc3RSYW5nZS5lbmQpIHtcbiAgICAgICAgICAgIHJlY29yZExhc3RTb3VyY2VSYW5nZSgpO1xuICAgICAgICAgICAgbGFzdFJhbmdlU3RhcnROb2RlID0gdHNOb2RlO1xuICAgICAgICAgICAgbGFzdFJhbmdlID0gcmFuZ2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIGxhc3RSYW5nZUVuZE5vZGUgPSB0c05vZGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRzLmZvckVhY2hDaGlsZCh0c05vZGUsIHZpc2l0Tm9kZSk7XG4gICAgfTtcbiAgICBzdGF0ZW1lbnRzLmZvckVhY2godmlzaXROb2RlKTtcbiAgICByZWNvcmRMYXN0U291cmNlUmFuZ2UoKTtcbiAgfVxuXG4gIHByaXZhdGUgcG9zdFByb2Nlc3M8VCBleHRlbmRzIHRzLk5vZGU+KG5nTm9kZTogTm9kZSwgdHNOb2RlOiBUfG51bGwpOiBSZWNvcmRlZE5vZGU8VD4ge1xuICAgIGlmICh0c05vZGUgJiYgIXRoaXMuX25vZGVNYXAuaGFzKHRzTm9kZSkpIHtcbiAgICAgIHRoaXMuX25vZGVNYXAuc2V0KHRzTm9kZSwgbmdOb2RlKTtcbiAgICB9XG4gICAgaWYgKHRzTm9kZSAhPT0gbnVsbCAmJiBuZ05vZGUgaW5zdGFuY2VvZiBTdGF0ZW1lbnQgJiYgbmdOb2RlLmxlYWRpbmdDb21tZW50cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBhdHRhY2hDb21tZW50cyh0c05vZGUgYXMgdW5rbm93biBhcyB0cy5TdGF0ZW1lbnQsIG5nTm9kZS5sZWFkaW5nQ29tbWVudHMpO1xuICAgIH1cbiAgICByZXR1cm4gdHNOb2RlIGFzIFJlY29yZGVkTm9kZTxUPjtcbiAgfVxuXG4gIHByaXZhdGUgc291cmNlUmFuZ2VPZihub2RlOiBOb2RlKTogdHMuU291cmNlTWFwUmFuZ2V8bnVsbCB7XG4gICAgaWYgKG5vZGUuc291cmNlU3Bhbikge1xuICAgICAgY29uc3Qgc3BhbiA9IG5vZGUuc291cmNlU3BhbjtcbiAgICAgIGlmIChzcGFuLnN0YXJ0LmZpbGUgPT0gc3Bhbi5lbmQuZmlsZSkge1xuICAgICAgICBjb25zdCBmaWxlID0gc3Bhbi5zdGFydC5maWxlO1xuICAgICAgICBpZiAoZmlsZS51cmwpIHtcbiAgICAgICAgICBsZXQgc291cmNlID0gdGhpcy5fdGVtcGxhdGVTb3VyY2VzLmdldChmaWxlKTtcbiAgICAgICAgICBpZiAoIXNvdXJjZSkge1xuICAgICAgICAgICAgc291cmNlID0gdHMuY3JlYXRlU291cmNlTWFwU291cmNlKGZpbGUudXJsLCBmaWxlLmNvbnRlbnQsIHBvcyA9PiBwb3MpO1xuICAgICAgICAgICAgdGhpcy5fdGVtcGxhdGVTb3VyY2VzLnNldChmaWxlLCBzb3VyY2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4ge3Bvczogc3Bhbi5zdGFydC5vZmZzZXQsIGVuZDogc3Bhbi5lbmQub2Zmc2V0LCBzb3VyY2V9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRNb2RpZmllcnMoc3RtdDogU3RhdGVtZW50KSB7XG4gICAgbGV0IG1vZGlmaWVyczogdHMuTW9kaWZpZXJbXSA9IFtdO1xuICAgIGlmIChzdG10Lmhhc01vZGlmaWVyKFN0bXRNb2RpZmllci5FeHBvcnRlZCkpIHtcbiAgICAgIG1vZGlmaWVycy5wdXNoKHRzLmNyZWF0ZVRva2VuKHRzLlN5bnRheEtpbmQuRXhwb3J0S2V5d29yZCkpO1xuICAgIH1cbiAgICByZXR1cm4gbW9kaWZpZXJzO1xuICB9XG5cbiAgLy8gU3RhdGVtZW50VmlzaXRvclxuICB2aXNpdERlY2xhcmVWYXJTdG10KHN0bXQ6IERlY2xhcmVWYXJTdG10KSB7XG4gICAgaWYgKHN0bXQuaGFzTW9kaWZpZXIoU3RtdE1vZGlmaWVyLkV4cG9ydGVkKSAmJiBzdG10LnZhbHVlIGluc3RhbmNlb2YgRXh0ZXJuYWxFeHByICYmXG4gICAgICAgICFzdG10LnR5cGUpIHtcbiAgICAgIC8vIGNoZWNrIGZvciBhIHJlZXhwb3J0XG4gICAgICBjb25zdCB7bmFtZSwgbW9kdWxlTmFtZX0gPSBzdG10LnZhbHVlLnZhbHVlO1xuICAgICAgaWYgKG1vZHVsZU5hbWUpIHtcbiAgICAgICAgbGV0IHJlZXhwb3J0cyA9IHRoaXMuX3JlZXhwb3J0cy5nZXQobW9kdWxlTmFtZSk7XG4gICAgICAgIGlmICghcmVleHBvcnRzKSB7XG4gICAgICAgICAgcmVleHBvcnRzID0gW107XG4gICAgICAgICAgdGhpcy5fcmVleHBvcnRzLnNldChtb2R1bGVOYW1lLCByZWV4cG9ydHMpO1xuICAgICAgICB9XG4gICAgICAgIHJlZXhwb3J0cy5wdXNoKHtuYW1lOiBuYW1lISwgYXM6IHN0bXQubmFtZX0pO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB2YXJEZWNsTGlzdCA9IHRzLmNyZWF0ZVZhcmlhYmxlRGVjbGFyYXRpb25MaXN0KFt0cy5jcmVhdGVWYXJpYWJsZURlY2xhcmF0aW9uKFxuICAgICAgICB0cy5jcmVhdGVJZGVudGlmaWVyKHN0bXQubmFtZSksXG4gICAgICAgIC8qIHR5cGUgKi8gdW5kZWZpbmVkLFxuICAgICAgICAoc3RtdC52YWx1ZSAmJiBzdG10LnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSkgfHwgdW5kZWZpbmVkKV0pO1xuXG4gICAgaWYgKHN0bXQuaGFzTW9kaWZpZXIoU3RtdE1vZGlmaWVyLkV4cG9ydGVkKSkge1xuICAgICAgLy8gTm90ZTogV2UgbmVlZCB0byBhZGQgYW4gZXhwbGljaXQgdmFyaWFibGUgYW5kIGV4cG9ydCBkZWNsYXJhdGlvbiBzbyB0aGF0XG4gICAgICAvLyB0aGUgdmFyaWFibGUgY2FuIGJlIHJlZmVycmVkIGluIHRoZSBzYW1lIGZpbGUgYXMgd2VsbC5cbiAgICAgIGNvbnN0IHRzVmFyU3RtdCA9XG4gICAgICAgICAgdGhpcy5wb3N0UHJvY2VzcyhzdG10LCB0cy5jcmVhdGVWYXJpYWJsZVN0YXRlbWVudCgvKiBtb2RpZmllcnMgKi9bXSwgdmFyRGVjbExpc3QpKTtcbiAgICAgIGNvbnN0IGV4cG9ydFN0bXQgPSB0aGlzLnBvc3RQcm9jZXNzKFxuICAgICAgICAgIHN0bXQsXG4gICAgICAgICAgdHMuY3JlYXRlRXhwb3J0RGVjbGFyYXRpb24oXG4gICAgICAgICAgICAgIC8qZGVjb3JhdG9ycyovIHVuZGVmaW5lZCwgLyptb2RpZmllcnMqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgIHRzLmNyZWF0ZU5hbWVkRXhwb3J0cyhbdHMuY3JlYXRlRXhwb3J0U3BlY2lmaWVyKHN0bXQubmFtZSwgc3RtdC5uYW1lKV0pKSk7XG4gICAgICByZXR1cm4gW3RzVmFyU3RtdCwgZXhwb3J0U3RtdF07XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnBvc3RQcm9jZXNzKHN0bXQsIHRzLmNyZWF0ZVZhcmlhYmxlU3RhdGVtZW50KHRoaXMuZ2V0TW9kaWZpZXJzKHN0bXQpLCB2YXJEZWNsTGlzdCkpO1xuICB9XG5cbiAgdmlzaXREZWNsYXJlRnVuY3Rpb25TdG10KHN0bXQ6IERlY2xhcmVGdW5jdGlvblN0bXQpIHtcbiAgICByZXR1cm4gdGhpcy5wb3N0UHJvY2VzcyhcbiAgICAgICAgc3RtdCxcbiAgICAgICAgdHMuY3JlYXRlRnVuY3Rpb25EZWNsYXJhdGlvbihcbiAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLCB0aGlzLmdldE1vZGlmaWVycyhzdG10KSxcbiAgICAgICAgICAgIC8qIGFzdGVyaXNrVG9rZW4gKi8gdW5kZWZpbmVkLCBzdG10Lm5hbWUsIC8qIHR5cGVQYXJhbWV0ZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIHN0bXQucGFyYW1zLm1hcChcbiAgICAgICAgICAgICAgICBwID0+IHRzLmNyZWF0ZVBhcmFtZXRlcihcbiAgICAgICAgICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgIC8qIGRvdERvdERvdFRva2VuICovIHVuZGVmaW5lZCwgcC5uYW1lKSksXG4gICAgICAgICAgICAvKiB0eXBlICovIHVuZGVmaW5lZCwgdGhpcy5fdmlzaXRTdGF0ZW1lbnRzKHN0bXQuc3RhdGVtZW50cykpKTtcbiAgfVxuXG4gIHZpc2l0RXhwcmVzc2lvblN0bXQoc3RtdDogRXhwcmVzc2lvblN0YXRlbWVudCkge1xuICAgIHJldHVybiB0aGlzLnBvc3RQcm9jZXNzKHN0bXQsIHRzLmNyZWF0ZVN0YXRlbWVudChzdG10LmV4cHIudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSk7XG4gIH1cblxuICB2aXNpdFJldHVyblN0bXQoc3RtdDogUmV0dXJuU3RhdGVtZW50KSB7XG4gICAgcmV0dXJuIHRoaXMucG9zdFByb2Nlc3MoXG4gICAgICAgIHN0bXQsIHRzLmNyZWF0ZVJldHVybihzdG10LnZhbHVlID8gc3RtdC52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkgOiB1bmRlZmluZWQpKTtcbiAgfVxuXG4gIHZpc2l0RGVjbGFyZUNsYXNzU3RtdChzdG10OiBDbGFzc1N0bXQpIHtcbiAgICBjb25zdCBtb2RpZmllcnMgPSB0aGlzLmdldE1vZGlmaWVycyhzdG10KTtcbiAgICBjb25zdCBmaWVsZHMgPSBzdG10LmZpZWxkcy5tYXAoZmllbGQgPT4ge1xuICAgICAgY29uc3QgcHJvcGVydHkgPSB0cy5jcmVhdGVQcm9wZXJ0eShcbiAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCwgLyogbW9kaWZpZXJzICovIHRyYW5zbGF0ZU1vZGlmaWVycyhmaWVsZC5tb2RpZmllcnMpLFxuICAgICAgICAgIGZpZWxkLm5hbWUsXG4gICAgICAgICAgLyogcXVlc3Rpb25Ub2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgLyogdHlwZSAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgZmllbGQuaW5pdGlhbGl6ZXIgPT0gbnVsbCA/IHRzLmNyZWF0ZU51bGwoKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkLmluaXRpYWxpemVyLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSk7XG5cbiAgICAgIGlmICh0aGlzLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyKSB7XG4gICAgICAgIC8vIENsb3N1cmUgY29tcGlsZXIgdHJhbnNmb3JtcyB0aGUgZm9ybSBgU2VydmljZS7JtXByb3YgPSBYYCBpbnRvIGBTZXJ2aWNlJMm1cHJvdiA9IFhgLiBUb1xuICAgICAgICAvLyBwcmV2ZW50IHRoaXMgdHJhbnNmb3JtYXRpb24sIHN1Y2ggYXNzaWdubWVudHMgbmVlZCB0byBiZSBhbm5vdGF0ZWQgd2l0aCBAbm9jb2xsYXBzZS5cbiAgICAgICAgLy8gTm90ZSB0aGF0IHRzaWNrbGUgaXMgdHlwaWNhbGx5IHJlc3BvbnNpYmxlIGZvciBhZGRpbmcgc3VjaCBhbm5vdGF0aW9ucywgaG93ZXZlciBpdFxuICAgICAgICAvLyBkb2Vzbid0IHlldCBoYW5kbGUgc3ludGhldGljIGZpZWxkcyBhZGRlZCBkdXJpbmcgb3RoZXIgdHJhbnNmb3JtYXRpb25zLlxuICAgICAgICB0cy5hZGRTeW50aGV0aWNMZWFkaW5nQ29tbWVudChcbiAgICAgICAgICAgIHByb3BlcnR5LCB0cy5TeW50YXhLaW5kLk11bHRpTGluZUNvbW1lbnRUcml2aWEsICcqIEBub2NvbGxhcHNlICcsXG4gICAgICAgICAgICAvKiBoYXNUcmFpbGluZ05ld0xpbmUgKi8gZmFsc2UpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcHJvcGVydHk7XG4gICAgfSk7XG4gICAgY29uc3QgZ2V0dGVycyA9IHN0bXQuZ2V0dGVycy5tYXAoXG4gICAgICAgIGdldHRlciA9PiB0cy5jcmVhdGVHZXRBY2Nlc3NvcihcbiAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLCAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLCBnZXR0ZXIubmFtZSwgLyogcGFyYW1ldGVycyAqL1tdLFxuICAgICAgICAgICAgLyogdHlwZSAqLyB1bmRlZmluZWQsIHRoaXMuX3Zpc2l0U3RhdGVtZW50cyhnZXR0ZXIuYm9keSkpKTtcblxuICAgIGNvbnN0IGNvbnN0cnVjdG9yID1cbiAgICAgICAgKHN0bXQuY29uc3RydWN0b3JNZXRob2QgJiYgW3RzLmNyZWF0ZUNvbnN0cnVjdG9yKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogcGFyYW1ldGVycyAqL1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RtdC5jb25zdHJ1Y3Rvck1ldGhvZC5wYXJhbXMubWFwKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHAgPT4gdHMuY3JlYXRlUGFyYW1ldGVyKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogZG90RG90RG90VG9rZW4gKi8gdW5kZWZpbmVkLCBwLm5hbWUpKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3Zpc2l0U3RhdGVtZW50cyhzdG10LmNvbnN0cnVjdG9yTWV0aG9kLmJvZHkpKV0pIHx8XG4gICAgICAgIFtdO1xuXG4gICAgLy8gVE9ETyB7Y2h1Y2tqfTogRGV0ZXJtaW5lIHdoYXQgc2hvdWxkIGJlIGRvbmUgZm9yIGEgbWV0aG9kIHdpdGggYSBudWxsIG5hbWUuXG4gICAgY29uc3QgbWV0aG9kcyA9IHN0bXQubWV0aG9kcy5maWx0ZXIobWV0aG9kID0+IG1ldGhvZC5uYW1lKVxuICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRob2QgPT4gdHMuY3JlYXRlTWV0aG9kKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogbW9kaWZpZXJzICovIHRyYW5zbGF0ZU1vZGlmaWVycyhtZXRob2QubW9kaWZpZXJzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogYXN0cmlza1Rva2VuICovIHVuZGVmaW5lZCwgbWV0aG9kLm5hbWUhLyogZ3VhcmRlZCBieSBmaWx0ZXIgKi8sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIHF1ZXN0aW9uVG9rZW4gKi8gdW5kZWZpbmVkLCAvKiB0eXBlUGFyYW1ldGVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZC5wYXJhbXMubWFwKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcCA9PiB0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogZG90RG90RG90VG9rZW4gKi8gdW5kZWZpbmVkLCBwLm5hbWUpKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogdHlwZSAqLyB1bmRlZmluZWQsIHRoaXMuX3Zpc2l0U3RhdGVtZW50cyhtZXRob2QuYm9keSkpKTtcbiAgICByZXR1cm4gdGhpcy5wb3N0UHJvY2VzcyhcbiAgICAgICAgc3RtdCxcbiAgICAgICAgdHMuY3JlYXRlQ2xhc3NEZWNsYXJhdGlvbihcbiAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLCBtb2RpZmllcnMsIHN0bXQubmFtZSwgLyogdHlwZVBhcmFtZXRlcnMqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICBzdG10LnBhcmVudCAmJlxuICAgICAgICAgICAgICAgICAgICBbdHMuY3JlYXRlSGVyaXRhZ2VDbGF1c2UoXG4gICAgICAgICAgICAgICAgICAgICAgICB0cy5TeW50YXhLaW5kLkV4dGVuZHNLZXl3b3JkLCBbc3RtdC5wYXJlbnQudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpXSldIHx8XG4gICAgICAgICAgICAgICAgW10sXG4gICAgICAgICAgICBbLi4uZmllbGRzLCAuLi5nZXR0ZXJzLCAuLi5jb25zdHJ1Y3RvciwgLi4ubWV0aG9kc10pKTtcbiAgfVxuXG4gIHZpc2l0SWZTdG10KHN0bXQ6IElmU3RtdCkge1xuICAgIHJldHVybiB0aGlzLnBvc3RQcm9jZXNzKFxuICAgICAgICBzdG10LFxuICAgICAgICB0cy5jcmVhdGVJZihcbiAgICAgICAgICAgIHN0bXQuY29uZGl0aW9uLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSwgdGhpcy5fdmlzaXRTdGF0ZW1lbnRzKHN0bXQudHJ1ZUNhc2UpLFxuICAgICAgICAgICAgc3RtdC5mYWxzZUNhc2UgJiYgc3RtdC5mYWxzZUNhc2UubGVuZ3RoICYmIHRoaXMuX3Zpc2l0U3RhdGVtZW50cyhzdG10LmZhbHNlQ2FzZSkgfHxcbiAgICAgICAgICAgICAgICB1bmRlZmluZWQpKTtcbiAgfVxuXG4gIHZpc2l0VHJ5Q2F0Y2hTdG10KHN0bXQ6IFRyeUNhdGNoU3RtdCk6IFJlY29yZGVkTm9kZTx0cy5UcnlTdGF0ZW1lbnQ+IHtcbiAgICByZXR1cm4gdGhpcy5wb3N0UHJvY2VzcyhcbiAgICAgICAgc3RtdCxcbiAgICAgICAgdHMuY3JlYXRlVHJ5KFxuICAgICAgICAgICAgdGhpcy5fdmlzaXRTdGF0ZW1lbnRzKHN0bXQuYm9keVN0bXRzKSxcbiAgICAgICAgICAgIHRzLmNyZWF0ZUNhdGNoQ2xhdXNlKFxuICAgICAgICAgICAgICAgIENBVENIX0VSUk9SX05BTUUsXG4gICAgICAgICAgICAgICAgdGhpcy5fdmlzaXRTdGF0ZW1lbnRzUHJlZml4KFxuICAgICAgICAgICAgICAgICAgICBbdHMuY3JlYXRlVmFyaWFibGVTdGF0ZW1lbnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgW3RzLmNyZWF0ZVZhcmlhYmxlRGVjbGFyYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQ0FUQ0hfU1RBQ0tfTkFNRSwgLyogdHlwZSAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLmNyZWF0ZUlkZW50aWZpZXIoQ0FUQ0hfRVJST1JfTkFNRSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLmNyZWF0ZUlkZW50aWZpZXIoQ0FUQ0hfU1RBQ0tfTkFNRSkpKV0pXSxcbiAgICAgICAgICAgICAgICAgICAgc3RtdC5jYXRjaFN0bXRzKSksXG4gICAgICAgICAgICAvKiBmaW5hbGx5QmxvY2sgKi8gdW5kZWZpbmVkKSk7XG4gIH1cblxuICB2aXNpdFRocm93U3RtdChzdG10OiBUaHJvd1N0bXQpIHtcbiAgICByZXR1cm4gdGhpcy5wb3N0UHJvY2VzcyhzdG10LCB0cy5jcmVhdGVUaHJvdyhzdG10LmVycm9yLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSkpO1xuICB9XG5cbiAgLy8gRXhwcmVzc2lvblZpc2l0b3JcbiAgdmlzaXRXcmFwcGVkTm9kZUV4cHIoZXhwcjogV3JhcHBlZE5vZGVFeHByPGFueT4pIHtcbiAgICByZXR1cm4gdGhpcy5wb3N0UHJvY2VzcyhleHByLCBleHByLm5vZGUpO1xuICB9XG5cbiAgdmlzaXRUeXBlb2ZFeHByKGV4cHI6IFR5cGVvZkV4cHIpIHtcbiAgICBjb25zdCB0eXBlT2YgPSB0cy5jcmVhdGVUeXBlT2YoZXhwci5leHByLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSk7XG4gICAgcmV0dXJuIHRoaXMucG9zdFByb2Nlc3MoZXhwciwgdHlwZU9mKTtcbiAgfVxuXG4gIC8vIEV4cHJlc3Npb25WaXNpdG9yXG4gIHZpc2l0UmVhZFZhckV4cHIoZXhwcjogUmVhZFZhckV4cHIpIHtcbiAgICBzd2l0Y2ggKGV4cHIuYnVpbHRpbikge1xuICAgICAgY2FzZSBCdWlsdGluVmFyLlRoaXM6XG4gICAgICAgIHJldHVybiB0aGlzLnBvc3RQcm9jZXNzKGV4cHIsIHRzLmNyZWF0ZUlkZW50aWZpZXIoTUVUSE9EX1RISVNfTkFNRSkpO1xuICAgICAgY2FzZSBCdWlsdGluVmFyLkNhdGNoRXJyb3I6XG4gICAgICAgIHJldHVybiB0aGlzLnBvc3RQcm9jZXNzKGV4cHIsIHRzLmNyZWF0ZUlkZW50aWZpZXIoQ0FUQ0hfRVJST1JfTkFNRSkpO1xuICAgICAgY2FzZSBCdWlsdGluVmFyLkNhdGNoU3RhY2s6XG4gICAgICAgIHJldHVybiB0aGlzLnBvc3RQcm9jZXNzKGV4cHIsIHRzLmNyZWF0ZUlkZW50aWZpZXIoQ0FUQ0hfU1RBQ0tfTkFNRSkpO1xuICAgICAgY2FzZSBCdWlsdGluVmFyLlN1cGVyOlxuICAgICAgICByZXR1cm4gdGhpcy5wb3N0UHJvY2VzcyhleHByLCB0cy5jcmVhdGVTdXBlcigpKTtcbiAgICB9XG4gICAgaWYgKGV4cHIubmFtZSkge1xuICAgICAgcmV0dXJuIHRoaXMucG9zdFByb2Nlc3MoZXhwciwgdHMuY3JlYXRlSWRlbnRpZmllcihleHByLm5hbWUpKTtcbiAgICB9XG4gICAgdGhyb3cgRXJyb3IoYFVuZXhwZWN0ZWQgUmVhZFZhckV4cHIgZm9ybWApO1xuICB9XG5cbiAgdmlzaXRXcml0ZVZhckV4cHIoZXhwcjogV3JpdGVWYXJFeHByKTogUmVjb3JkZWROb2RlPHRzLkJpbmFyeUV4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gdGhpcy5wb3N0UHJvY2VzcyhcbiAgICAgICAgZXhwcixcbiAgICAgICAgdHMuY3JlYXRlQXNzaWdubWVudChcbiAgICAgICAgICAgIHRzLmNyZWF0ZUlkZW50aWZpZXIoZXhwci5uYW1lKSwgZXhwci52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpKTtcbiAgfVxuXG4gIHZpc2l0V3JpdGVLZXlFeHByKGV4cHI6IFdyaXRlS2V5RXhwcik6IFJlY29yZGVkTm9kZTx0cy5CaW5hcnlFeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucG9zdFByb2Nlc3MoXG4gICAgICAgIGV4cHIsXG4gICAgICAgIHRzLmNyZWF0ZUFzc2lnbm1lbnQoXG4gICAgICAgICAgICB0cy5jcmVhdGVFbGVtZW50QWNjZXNzKFxuICAgICAgICAgICAgICAgIGV4cHIucmVjZWl2ZXIudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpLCBleHByLmluZGV4LnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSksXG4gICAgICAgICAgICBleHByLnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSkpO1xuICB9XG5cbiAgdmlzaXRXcml0ZVByb3BFeHByKGV4cHI6IFdyaXRlUHJvcEV4cHIpOiBSZWNvcmRlZE5vZGU8dHMuQmluYXJ5RXhwcmVzc2lvbj4ge1xuICAgIHJldHVybiB0aGlzLnBvc3RQcm9jZXNzKFxuICAgICAgICBleHByLFxuICAgICAgICB0cy5jcmVhdGVBc3NpZ25tZW50KFxuICAgICAgICAgICAgdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoZXhwci5yZWNlaXZlci52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCksIGV4cHIubmFtZSksXG4gICAgICAgICAgICBleHByLnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSkpO1xuICB9XG5cbiAgdmlzaXRJbnZva2VNZXRob2RFeHByKGV4cHI6IEludm9rZU1ldGhvZEV4cHIpOiBSZWNvcmRlZE5vZGU8dHMuQ2FsbEV4cHJlc3Npb24+IHtcbiAgICBjb25zdCBtZXRob2ROYW1lID0gZ2V0TWV0aG9kTmFtZShleHByKTtcbiAgICByZXR1cm4gdGhpcy5wb3N0UHJvY2VzcyhcbiAgICAgICAgZXhwcixcbiAgICAgICAgdHMuY3JlYXRlQ2FsbChcbiAgICAgICAgICAgIHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKGV4cHIucmVjZWl2ZXIudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpLCBtZXRob2ROYW1lKSxcbiAgICAgICAgICAgIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkLCBleHByLmFyZ3MubWFwKGFyZyA9PiBhcmcudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSkpO1xuICB9XG5cbiAgdmlzaXRJbnZva2VGdW5jdGlvbkV4cHIoZXhwcjogSW52b2tlRnVuY3Rpb25FeHByKTogUmVjb3JkZWROb2RlPHRzLkNhbGxFeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucG9zdFByb2Nlc3MoXG4gICAgICAgIGV4cHIsXG4gICAgICAgIHRzLmNyZWF0ZUNhbGwoXG4gICAgICAgICAgICBleHByLmZuLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSwgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICBleHByLmFyZ3MubWFwKGFyZyA9PiBhcmcudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSkpO1xuICB9XG5cbiAgdmlzaXRUYWdnZWRUZW1wbGF0ZUV4cHIoZXhwcjogVGFnZ2VkVGVtcGxhdGVFeHByKTogUmVjb3JkZWROb2RlPHRzLlRhZ2dlZFRlbXBsYXRlRXhwcmVzc2lvbj4ge1xuICAgIHRocm93IG5ldyBFcnJvcigndGFnZ2VkIHRlbXBsYXRlcyBhcmUgbm90IHN1cHBvcnRlZCBpbiBwcmUtaXZ5IG1vZGUuJyk7XG4gIH1cblxuICB2aXNpdEluc3RhbnRpYXRlRXhwcihleHByOiBJbnN0YW50aWF0ZUV4cHIpOiBSZWNvcmRlZE5vZGU8dHMuTmV3RXhwcmVzc2lvbj4ge1xuICAgIHJldHVybiB0aGlzLnBvc3RQcm9jZXNzKFxuICAgICAgICBleHByLFxuICAgICAgICB0cy5jcmVhdGVOZXcoXG4gICAgICAgICAgICBleHByLmNsYXNzRXhwci52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCksIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgZXhwci5hcmdzLm1hcChhcmcgPT4gYXJnLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSkpKTtcbiAgfVxuXG4gIHZpc2l0TGl0ZXJhbEV4cHIoZXhwcjogTGl0ZXJhbEV4cHIpIHtcbiAgICByZXR1cm4gdGhpcy5wb3N0UHJvY2VzcyhleHByLCBjcmVhdGVMaXRlcmFsKGV4cHIudmFsdWUpKTtcbiAgfVxuXG4gIHZpc2l0TG9jYWxpemVkU3RyaW5nKGV4cHI6IExvY2FsaXplZFN0cmluZywgY29udGV4dDogYW55KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdsb2NhbGl6ZWQgc3RyaW5ncyBhcmUgbm90IHN1cHBvcnRlZCBpbiBwcmUtaXZ5IG1vZGUuJyk7XG4gIH1cblxuICB2aXNpdEV4dGVybmFsRXhwcihleHByOiBFeHRlcm5hbEV4cHIpIHtcbiAgICByZXR1cm4gdGhpcy5wb3N0UHJvY2VzcyhleHByLCB0aGlzLl92aXNpdElkZW50aWZpZXIoZXhwci52YWx1ZSkpO1xuICB9XG5cbiAgdmlzaXRDb25kaXRpb25hbEV4cHIoZXhwcjogQ29uZGl0aW9uYWxFeHByKTogUmVjb3JkZWROb2RlPHRzLlBhcmVudGhlc2l6ZWRFeHByZXNzaW9uPiB7XG4gICAgLy8gVE9ETyB7Y2h1Y2tqfTogUmV2aWV3IHVzZSBvZiAhIG9uIGZhbHNlQ2FzZS4gU2hvdWxkIGl0IGJlIG5vbi1udWxsYWJsZT9cbiAgICByZXR1cm4gdGhpcy5wb3N0UHJvY2VzcyhcbiAgICAgICAgZXhwcixcbiAgICAgICAgdHMuY3JlYXRlUGFyZW4odHMuY3JlYXRlQ29uZGl0aW9uYWwoXG4gICAgICAgICAgICBleHByLmNvbmRpdGlvbi52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCksIGV4cHIudHJ1ZUNhc2UudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpLFxuICAgICAgICAgICAgZXhwci5mYWxzZUNhc2UhLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSkpKTtcbiAgfVxuXG4gIHZpc2l0Tm90RXhwcihleHByOiBOb3RFeHByKTogUmVjb3JkZWROb2RlPHRzLlByZWZpeFVuYXJ5RXhwcmVzc2lvbj4ge1xuICAgIHJldHVybiB0aGlzLnBvc3RQcm9jZXNzKFxuICAgICAgICBleHByLFxuICAgICAgICB0cy5jcmVhdGVQcmVmaXgoXG4gICAgICAgICAgICB0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uVG9rZW4sIGV4cHIuY29uZGl0aW9uLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSkpO1xuICB9XG5cbiAgdmlzaXRBc3NlcnROb3ROdWxsRXhwcihleHByOiBBc3NlcnROb3ROdWxsKTogUmVjb3JkZWROb2RlPHRzLkV4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gZXhwci5jb25kaXRpb24udmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpO1xuICB9XG5cbiAgdmlzaXRDYXN0RXhwcihleHByOiBDYXN0RXhwcik6IFJlY29yZGVkTm9kZTx0cy5FeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIGV4cHIudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpO1xuICB9XG5cbiAgdmlzaXRGdW5jdGlvbkV4cHIoZXhwcjogRnVuY3Rpb25FeHByKSB7XG4gICAgcmV0dXJuIHRoaXMucG9zdFByb2Nlc3MoXG4gICAgICAgIGV4cHIsXG4gICAgICAgIHRzLmNyZWF0ZUZ1bmN0aW9uRXhwcmVzc2lvbihcbiAgICAgICAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsIC8qIGFzdHJpc2tUb2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAvKiBuYW1lICovIGV4cHIubmFtZSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICBleHByLnBhcmFtcy5tYXAoXG4gICAgICAgICAgICAgICAgcCA9PiB0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAgICAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLCAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAvKiBkb3REb3REb3RUb2tlbiAqLyB1bmRlZmluZWQsIHAubmFtZSkpLFxuICAgICAgICAgICAgLyogdHlwZSAqLyB1bmRlZmluZWQsIHRoaXMuX3Zpc2l0U3RhdGVtZW50cyhleHByLnN0YXRlbWVudHMpKSk7XG4gIH1cblxuICB2aXNpdFVuYXJ5T3BlcmF0b3JFeHByKGV4cHI6IFVuYXJ5T3BlcmF0b3JFeHByKTpcbiAgICAgIFJlY29yZGVkTm9kZTx0cy5VbmFyeUV4cHJlc3Npb258dHMuUGFyZW50aGVzaXplZEV4cHJlc3Npb24+IHtcbiAgICBsZXQgdW5hcnlPcGVyYXRvcjogdHMuQmluYXJ5T3BlcmF0b3I7XG4gICAgc3dpdGNoIChleHByLm9wZXJhdG9yKSB7XG4gICAgICBjYXNlIFVuYXJ5T3BlcmF0b3IuTWludXM6XG4gICAgICAgIHVuYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLk1pbnVzVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBVbmFyeU9wZXJhdG9yLlBsdXM6XG4gICAgICAgIHVuYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLlBsdXNUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gb3BlcmF0b3I6ICR7ZXhwci5vcGVyYXRvcn1gKTtcbiAgICB9XG4gICAgY29uc3QgYmluYXJ5ID0gdHMuY3JlYXRlUHJlZml4KHVuYXJ5T3BlcmF0b3IsIGV4cHIuZXhwci52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCkpO1xuICAgIHJldHVybiB0aGlzLnBvc3RQcm9jZXNzKGV4cHIsIGV4cHIucGFyZW5zID8gdHMuY3JlYXRlUGFyZW4oYmluYXJ5KSA6IGJpbmFyeSk7XG4gIH1cblxuICB2aXNpdEJpbmFyeU9wZXJhdG9yRXhwcihleHByOiBCaW5hcnlPcGVyYXRvckV4cHIpOlxuICAgICAgUmVjb3JkZWROb2RlPHRzLkJpbmFyeUV4cHJlc3Npb258dHMuUGFyZW50aGVzaXplZEV4cHJlc3Npb24+IHtcbiAgICBsZXQgYmluYXJ5T3BlcmF0b3I6IHRzLkJpbmFyeU9wZXJhdG9yO1xuICAgIHN3aXRjaCAoZXhwci5vcGVyYXRvcikge1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5BbmQ6XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5BbXBlcnNhbmRBbXBlcnNhbmRUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLkJpdHdpc2VBbmQ6XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5BbXBlcnNhbmRUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLkJpZ2dlcjpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkdyZWF0ZXJUaGFuVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5CaWdnZXJFcXVhbHM6XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5HcmVhdGVyVGhhbkVxdWFsc1Rva2VuO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQmluYXJ5T3BlcmF0b3IuRGl2aWRlOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuU2xhc2hUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLkVxdWFsczpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkVxdWFsc0VxdWFsc1Rva2VuO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQmluYXJ5T3BlcmF0b3IuSWRlbnRpY2FsOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuRXF1YWxzRXF1YWxzRXF1YWxzVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5Mb3dlcjpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkxlc3NUaGFuVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5Mb3dlckVxdWFsczpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkxlc3NUaGFuRXF1YWxzVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5NaW51czpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLk1pbnVzVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5Nb2R1bG86XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5QZXJjZW50VG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5NdWx0aXBseTpcbiAgICAgICAgYmluYXJ5T3BlcmF0b3IgPSB0cy5TeW50YXhLaW5kLkFzdGVyaXNrVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5Ob3RFcXVhbHM6XG4gICAgICAgIGJpbmFyeU9wZXJhdG9yID0gdHMuU3ludGF4S2luZC5FeGNsYW1hdGlvbkVxdWFsc1Rva2VuO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQmluYXJ5T3BlcmF0b3IuTm90SWRlbnRpY2FsOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuRXhjbGFtYXRpb25FcXVhbHNFcXVhbHNUb2tlbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJpbmFyeU9wZXJhdG9yLk9yOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuQmFyQmFyVG9rZW47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBCaW5hcnlPcGVyYXRvci5QbHVzOlxuICAgICAgICBiaW5hcnlPcGVyYXRvciA9IHRzLlN5bnRheEtpbmQuUGx1c1Rva2VuO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBvcGVyYXRvcjogJHtleHByLm9wZXJhdG9yfWApO1xuICAgIH1cbiAgICBjb25zdCBiaW5hcnkgPSB0cy5jcmVhdGVCaW5hcnkoXG4gICAgICAgIGV4cHIubGhzLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSwgYmluYXJ5T3BlcmF0b3IsIGV4cHIucmhzLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSk7XG4gICAgcmV0dXJuIHRoaXMucG9zdFByb2Nlc3MoZXhwciwgZXhwci5wYXJlbnMgPyB0cy5jcmVhdGVQYXJlbihiaW5hcnkpIDogYmluYXJ5KTtcbiAgfVxuXG4gIHZpc2l0UmVhZFByb3BFeHByKGV4cHI6IFJlYWRQcm9wRXhwcik6IFJlY29yZGVkTm9kZTx0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gdGhpcy5wb3N0UHJvY2VzcyhcbiAgICAgICAgZXhwciwgdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoZXhwci5yZWNlaXZlci52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCksIGV4cHIubmFtZSkpO1xuICB9XG5cbiAgdmlzaXRSZWFkS2V5RXhwcihleHByOiBSZWFkS2V5RXhwcik6IFJlY29yZGVkTm9kZTx0cy5FbGVtZW50QWNjZXNzRXhwcmVzc2lvbj4ge1xuICAgIHJldHVybiB0aGlzLnBvc3RQcm9jZXNzKFxuICAgICAgICBleHByLFxuICAgICAgICB0cy5jcmVhdGVFbGVtZW50QWNjZXNzKFxuICAgICAgICAgICAgZXhwci5yZWNlaXZlci52aXNpdEV4cHJlc3Npb24odGhpcywgbnVsbCksIGV4cHIuaW5kZXgudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKSk7XG4gIH1cblxuICB2aXNpdExpdGVyYWxBcnJheUV4cHIoZXhwcjogTGl0ZXJhbEFycmF5RXhwcik6IFJlY29yZGVkTm9kZTx0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucG9zdFByb2Nlc3MoXG4gICAgICAgIGV4cHIsIHRzLmNyZWF0ZUFycmF5TGl0ZXJhbChleHByLmVudHJpZXMubWFwKGVudHJ5ID0+IGVudHJ5LnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSkpKTtcbiAgfVxuXG4gIHZpc2l0TGl0ZXJhbE1hcEV4cHIoZXhwcjogTGl0ZXJhbE1hcEV4cHIpOiBSZWNvcmRlZE5vZGU8dHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gdGhpcy5wb3N0UHJvY2VzcyhcbiAgICAgICAgZXhwcixcbiAgICAgICAgdHMuY3JlYXRlT2JqZWN0TGl0ZXJhbChleHByLmVudHJpZXMubWFwKFxuICAgICAgICAgICAgZW50cnkgPT4gdHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KFxuICAgICAgICAgICAgICAgIGVudHJ5LnF1b3RlZCB8fCAhX1ZBTElEX0lERU5USUZJRVJfUkUudGVzdChlbnRyeS5rZXkpID9cbiAgICAgICAgICAgICAgICAgICAgdHMuY3JlYXRlTGl0ZXJhbChlbnRyeS5rZXkpIDpcbiAgICAgICAgICAgICAgICAgICAgZW50cnkua2V5LFxuICAgICAgICAgICAgICAgIGVudHJ5LnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBudWxsKSkpKSk7XG4gIH1cblxuICB2aXNpdENvbW1hRXhwcihleHByOiBDb21tYUV4cHIpOiBSZWNvcmRlZE5vZGU8dHMuRXhwcmVzc2lvbj4ge1xuICAgIHJldHVybiB0aGlzLnBvc3RQcm9jZXNzKFxuICAgICAgICBleHByLFxuICAgICAgICBleHByLnBhcnRzLm1hcChlID0+IGUudmlzaXRFeHByZXNzaW9uKHRoaXMsIG51bGwpKVxuICAgICAgICAgICAgLnJlZHVjZTx0cy5FeHByZXNzaW9ufG51bGw+KFxuICAgICAgICAgICAgICAgIChsZWZ0LCByaWdodCkgPT5cbiAgICAgICAgICAgICAgICAgICAgbGVmdCA/IHRzLmNyZWF0ZUJpbmFyeShsZWZ0LCB0cy5TeW50YXhLaW5kLkNvbW1hVG9rZW4sIHJpZ2h0KSA6IHJpZ2h0LFxuICAgICAgICAgICAgICAgIG51bGwpKTtcbiAgfVxuXG4gIHByaXZhdGUgX3Zpc2l0U3RhdGVtZW50cyhzdGF0ZW1lbnRzOiBTdGF0ZW1lbnRbXSk6IHRzLkJsb2NrIHtcbiAgICByZXR1cm4gdGhpcy5fdmlzaXRTdGF0ZW1lbnRzUHJlZml4KFtdLCBzdGF0ZW1lbnRzKTtcbiAgfVxuXG4gIHByaXZhdGUgX3Zpc2l0U3RhdGVtZW50c1ByZWZpeChwcmVmaXg6IHRzLlN0YXRlbWVudFtdLCBzdGF0ZW1lbnRzOiBTdGF0ZW1lbnRbXSkge1xuICAgIHJldHVybiB0cy5jcmVhdGVCbG9jayhbXG4gICAgICAuLi5wcmVmaXgsIC4uLnN0YXRlbWVudHMubWFwKHN0bXQgPT4gc3RtdC52aXNpdFN0YXRlbWVudCh0aGlzLCBudWxsKSkuZmlsdGVyKGYgPT4gZiAhPSBudWxsKVxuICAgIF0pO1xuICB9XG5cbiAgcHJpdmF0ZSBfdmlzaXRJZGVudGlmaWVyKHZhbHVlOiBFeHRlcm5hbFJlZmVyZW5jZSk6IHRzLkV4cHJlc3Npb24ge1xuICAgIC8vIG5hbWUgY2FuIG9ubHkgYmUgbnVsbCBkdXJpbmcgSklUIHdoaWNoIG5ldmVyIGV4ZWN1dGVzIHRoaXMgY29kZS5cbiAgICBjb25zdCBtb2R1bGVOYW1lID0gdmFsdWUubW9kdWxlTmFtZSwgbmFtZSA9IHZhbHVlLm5hbWUhO1xuICAgIGxldCBwcmVmaXhJZGVudDogdHMuSWRlbnRpZmllcnxudWxsID0gbnVsbDtcbiAgICBpZiAobW9kdWxlTmFtZSkge1xuICAgICAgbGV0IHByZWZpeCA9IHRoaXMuX2ltcG9ydHNXaXRoUHJlZml4ZXMuZ2V0KG1vZHVsZU5hbWUpO1xuICAgICAgaWYgKHByZWZpeCA9PSBudWxsKSB7XG4gICAgICAgIHByZWZpeCA9IGBpJHt0aGlzLl9pbXBvcnRzV2l0aFByZWZpeGVzLnNpemV9YDtcbiAgICAgICAgdGhpcy5faW1wb3J0c1dpdGhQcmVmaXhlcy5zZXQobW9kdWxlTmFtZSwgcHJlZml4KTtcbiAgICAgIH1cbiAgICAgIHByZWZpeElkZW50ID0gdHMuY3JlYXRlSWRlbnRpZmllcihwcmVmaXgpO1xuICAgIH1cbiAgICBpZiAocHJlZml4SWRlbnQpIHtcbiAgICAgIHJldHVybiB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhwcmVmaXhJZGVudCwgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGlkID0gdHMuY3JlYXRlSWRlbnRpZmllcihuYW1lKTtcbiAgICAgIGlmICh0aGlzLl9leHBvcnRlZFZhcmlhYmxlSWRlbnRpZmllcnMuaGFzKG5hbWUpKSB7XG4gICAgICAgIC8vIEluIG9yZGVyIGZvciB0aGlzIG5ldyBpZGVudGlmaWVyIG5vZGUgdG8gYmUgcHJvcGVybHkgcmV3cml0dGVuIGluIENvbW1vbkpTIG91dHB1dCxcbiAgICAgICAgLy8gaXQgbXVzdCBoYXZlIGl0cyBvcmlnaW5hbCBub2RlIHNldCB0byBhIHBhcnNlZCBpbnN0YW5jZSBvZiB0aGUgc2FtZSBpZGVudGlmaWVyLlxuICAgICAgICB0cy5zZXRPcmlnaW5hbE5vZGUoaWQsIHRoaXMuX2V4cG9ydGVkVmFyaWFibGVJZGVudGlmaWVycy5nZXQobmFtZSkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGlkO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRNZXRob2ROYW1lKG1ldGhvZFJlZjoge25hbWU6IHN0cmluZ3xudWxsOyBidWlsdGluOiBCdWlsdGluTWV0aG9kIHwgbnVsbH0pOiBzdHJpbmcge1xuICBpZiAobWV0aG9kUmVmLm5hbWUpIHtcbiAgICByZXR1cm4gbWV0aG9kUmVmLm5hbWU7XG4gIH0gZWxzZSB7XG4gICAgc3dpdGNoIChtZXRob2RSZWYuYnVpbHRpbikge1xuICAgICAgY2FzZSBCdWlsdGluTWV0aG9kLkJpbmQ6XG4gICAgICAgIHJldHVybiAnYmluZCc7XG4gICAgICBjYXNlIEJ1aWx0aW5NZXRob2QuQ29uY2F0QXJyYXk6XG4gICAgICAgIHJldHVybiAnY29uY2F0JztcbiAgICAgIGNhc2UgQnVpbHRpbk1ldGhvZC5TdWJzY3JpYmVPYnNlcnZhYmxlOlxuICAgICAgICByZXR1cm4gJ3N1YnNjcmliZSc7XG4gICAgfVxuICB9XG4gIHRocm93IG5ldyBFcnJvcignVW5leHBlY3RlZCBtZXRob2QgcmVmZXJlbmNlIGZvcm0nKTtcbn1cblxuZnVuY3Rpb24gbW9kaWZpZXJGcm9tTW9kaWZpZXIobW9kaWZpZXI6IFN0bXRNb2RpZmllcik6IHRzLk1vZGlmaWVyIHtcbiAgc3dpdGNoIChtb2RpZmllcikge1xuICAgIGNhc2UgU3RtdE1vZGlmaWVyLkV4cG9ydGVkOlxuICAgICAgcmV0dXJuIHRzLmNyZWF0ZVRva2VuKHRzLlN5bnRheEtpbmQuRXhwb3J0S2V5d29yZCk7XG4gICAgY2FzZSBTdG10TW9kaWZpZXIuRmluYWw6XG4gICAgICByZXR1cm4gdHMuY3JlYXRlVG9rZW4odHMuU3ludGF4S2luZC5Db25zdEtleXdvcmQpO1xuICAgIGNhc2UgU3RtdE1vZGlmaWVyLlByaXZhdGU6XG4gICAgICByZXR1cm4gdHMuY3JlYXRlVG9rZW4odHMuU3ludGF4S2luZC5Qcml2YXRlS2V5d29yZCk7XG4gICAgY2FzZSBTdG10TW9kaWZpZXIuU3RhdGljOlxuICAgICAgcmV0dXJuIHRzLmNyZWF0ZVRva2VuKHRzLlN5bnRheEtpbmQuU3RhdGljS2V5d29yZCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdHJhbnNsYXRlTW9kaWZpZXJzKG1vZGlmaWVyczogU3RtdE1vZGlmaWVyW118bnVsbCk6IHRzLk1vZGlmaWVyW118dW5kZWZpbmVkIHtcbiAgcmV0dXJuIG1vZGlmaWVycyA9PSBudWxsID8gdW5kZWZpbmVkIDogbW9kaWZpZXJzIS5tYXAobW9kaWZpZXJGcm9tTW9kaWZpZXIpO1xufVxuIl19