
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
    

// packages/compiler-cli/src/ngtsc/imports/src/core_symbols.js
var CORE_SUPPORTED_SYMBOLS = /* @__PURE__ */ new Map([
  ["\u0275\u0275defineInjectable", "\u0275\u0275defineInjectable"],
  ["\u0275\u0275defineService", "\u0275\u0275defineService"],
  ["\u0275\u0275defineInjector", "\u0275\u0275defineInjector"],
  ["\u0275\u0275defineNgModule", "\u0275\u0275defineNgModule"],
  ["\u0275\u0275setNgModuleScope", "\u0275\u0275setNgModuleScope"],
  ["\u0275\u0275inject", "\u0275\u0275inject"],
  ["\u0275\u0275FactoryDeclaration", "\u0275\u0275FactoryDeclaration"],
  ["\u0275setClassMetadata", "setClassMetadata"],
  ["\u0275setClassMetadataAsync", "setClassMetadataAsync"],
  ["\u0275\u0275InjectableDeclaration", "\u0275\u0275InjectableDeclaration"],
  ["\u0275\u0275InjectorDeclaration", "\u0275\u0275InjectorDeclaration"],
  ["\u0275\u0275NgModuleDeclaration", "\u0275\u0275NgModuleDeclaration"],
  ["\u0275NgModuleFactory", "NgModuleFactory"],
  ["\u0275noSideEffects", "\u0275noSideEffects"]
]);
var CORE_MODULE = "@angular/core";
function validateAndRewriteCoreSymbol(name) {
  if (!CORE_SUPPORTED_SYMBOLS.has(name)) {
    throw new Error(`Importing unexpected symbol ${name} while compiling ${CORE_MODULE}`);
  }
  return CORE_SUPPORTED_SYMBOLS.get(name);
}

// packages/compiler-cli/src/ngtsc/hmr/src/extract_dependencies_output.js
import { outputAst as o } from "@angular/compiler";
function extractHmrDependenciesFromOutput(className, output, visitor, availableTopLevel, resolver) {
  const { definition, factory, deferBlockMetadata, classMetadata, debugInfo } = output;
  definition.expression.visitExpression(visitor, null);
  definition.statements.forEach((statement) => statement.visitStatement(visitor, null));
  factory.initializer?.visitExpression(visitor, null);
  factory.statements.forEach((statement) => statement.visitStatement(visitor, null));
  classMetadata?.visitStatement(visitor, null);
  debugInfo?.visitStatement(visitor, null);
  if (deferBlockMetadata.mode === 0) {
    deferBlockMetadata.blocks.forEach((loader) => loader?.visitExpression(visitor, null));
  } else {
    deferBlockMetadata.dependenciesFn?.visitExpression(visitor, null);
  }
  const local = [];
  const seenLocals = /* @__PURE__ */ new Set();
  for (const readNode of visitor.allReads) {
    const readName = resolver.getName(readNode);
    if (readName !== className && !seenLocals.has(readName) && availableTopLevel.has(readName)) {
      const runtimeRepresentation = resolver.getRuntimeRepresentation(readNode);
      if (runtimeRepresentation === null) {
        return null;
      }
      local.push({ name: readName, runtimeRepresentation });
      seenLocals.add(readName);
    }
  }
  return {
    local,
    external: Array.from(visitor.namespaceReads, (name, index) => ({
      moduleName: name,
      assignedName: `\u0275hmr${index}`
    }))
  };
}
var PotentialTopLevelReadsVisitor = class extends o.RecursiveAstVisitor {
  allReads = /* @__PURE__ */ new Set();
  namespaceReads = /* @__PURE__ */ new Set();
  // tslint:disable-next-line:no-any
  visitExternalExpr(ast, context) {
    if (ast.value.moduleName !== null) {
      this.namespaceReads.add(ast.value.moduleName);
    }
    super.visitExternalExpr(ast, context);
  }
  // tslint:disable-next-line:no-any
  visitReadVarExpr(ast, context) {
    this.allReads.add(ast);
    super.visitReadVarExpr(ast, context);
  }
  // tslint:disable-next-line:no-any
  visitWrappedNodeExpr(ast, context) {
    this.addWrappedNodeReads(ast.node);
    super.visitWrappedNodeExpr(ast, context);
  }
};

export {
  CORE_MODULE,
  validateAndRewriteCoreSymbol,
  extractHmrDependenciesFromOutput,
  PotentialTopLevelReadsVisitor
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
//# sourceMappingURL=chunk-75X7ZOFT.js.map
