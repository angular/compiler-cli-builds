"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
var compiler_host_1 = require("./compiler_host");
exports.CompilerHost = compiler_host_1.CompilerHost;
exports.ModuleResolutionHostAdapter = compiler_host_1.ModuleResolutionHostAdapter;
exports.NodeCompilerHostContext = compiler_host_1.NodeCompilerHostContext;
var check_types_1 = require("./diagnostics/check_types");
exports.TypeChecker = check_types_1.TypeChecker;
var expression_diagnostics_1 = require("./diagnostics/expression_diagnostics");
exports.getExpressionDiagnostics = expression_diagnostics_1.getExpressionDiagnostics;
exports.getExpressionScope = expression_diagnostics_1.getExpressionScope;
exports.getTemplateExpressionDiagnostics = expression_diagnostics_1.getTemplateExpressionDiagnostics;
var expression_type_1 = require("./diagnostics/expression_type");
exports.AstType = expression_type_1.AstType;
exports.DiagnosticKind = expression_type_1.DiagnosticKind;
exports.TypeDiagnostic = expression_type_1.TypeDiagnostic;
var symbols_1 = require("./diagnostics/symbols");
exports.BuiltinType = symbols_1.BuiltinType;
var typescript_symbols_1 = require("./diagnostics/typescript_symbols");
exports.getClassFromStaticSymbol = typescript_symbols_1.getClassFromStaticSymbol;
exports.getClassMembers = typescript_symbols_1.getClassMembers;
exports.getClassMembersFromDeclaration = typescript_symbols_1.getClassMembersFromDeclaration;
exports.getPipesTable = typescript_symbols_1.getPipesTable;
exports.getSymbolQuery = typescript_symbols_1.getSymbolQuery;
//# sourceMappingURL=language_services.js.map