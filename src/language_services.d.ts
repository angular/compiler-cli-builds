/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export { AngularCompilerOptions } from '@angular/tsc-wrapped';
export { CompilerHost, CompilerHostContext, MetadataProvider, ModuleResolutionHostAdapter, NodeCompilerHostContext } from './compiler_host';
export { TypeChecker } from './diagnostics/check_types';
export { DiagnosticTemplateInfo, ExpressionDiagnostic, getExpressionDiagnostics, getExpressionScope, getTemplateExpressionDiagnostics } from './diagnostics/expression_diagnostics';
export { AstType, DiagnosticKind, ExpressionDiagnosticsContext, TypeDiagnostic } from './diagnostics/expression_type';
export { BuiltinType, DeclarationKind, Definition, Location, PipeInfo, Pipes, Signature, Span, Symbol, SymbolDeclaration, SymbolQuery, SymbolTable } from './diagnostics/symbols';
export { getClassFromStaticSymbol, getClassMembers, getClassMembersFromDeclaration, getPipesTable, getSymbolQuery } from './diagnostics/typescript_symbols';
