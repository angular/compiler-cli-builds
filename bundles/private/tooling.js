
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
      const __ESM_IMPORT_META_URL__ = import.meta.url;
    
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/reflection/src/host.mjs
import ts from "typescript";
function isDecoratorIdentifier(exp) {
  return ts.isIdentifier(exp) || ts.isPropertyAccessExpression(exp) && ts.isIdentifier(exp.expression) && ts.isIdentifier(exp.name);
}
var ClassMemberKind;
(function(ClassMemberKind2) {
  ClassMemberKind2[ClassMemberKind2["Constructor"] = 0] = "Constructor";
  ClassMemberKind2[ClassMemberKind2["Getter"] = 1] = "Getter";
  ClassMemberKind2[ClassMemberKind2["Setter"] = 2] = "Setter";
  ClassMemberKind2[ClassMemberKind2["Property"] = 3] = "Property";
  ClassMemberKind2[ClassMemberKind2["Method"] = 4] = "Method";
})(ClassMemberKind || (ClassMemberKind = {}));
var KnownDeclaration;
(function(KnownDeclaration2) {
  KnownDeclaration2[KnownDeclaration2["JsGlobalObject"] = 0] = "JsGlobalObject";
  KnownDeclaration2[KnownDeclaration2["TsHelperAssign"] = 1] = "TsHelperAssign";
  KnownDeclaration2[KnownDeclaration2["TsHelperSpread"] = 2] = "TsHelperSpread";
  KnownDeclaration2[KnownDeclaration2["TsHelperSpreadArrays"] = 3] = "TsHelperSpreadArrays";
  KnownDeclaration2[KnownDeclaration2["TsHelperSpreadArray"] = 4] = "TsHelperSpreadArray";
  KnownDeclaration2[KnownDeclaration2["TsHelperRead"] = 5] = "TsHelperRead";
})(KnownDeclaration || (KnownDeclaration = {}));

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/reflection/src/type_to_value.mjs
import ts2 from "typescript";
function typeToValue(typeNode, checker) {
  if (typeNode === null) {
    return missingType();
  }
  if (!ts2.isTypeReferenceNode(typeNode)) {
    return unsupportedType(typeNode);
  }
  const symbols = resolveTypeSymbols(typeNode, checker);
  if (symbols === null) {
    return unknownReference(typeNode);
  }
  const { local, decl } = symbols;
  if (decl.valueDeclaration === void 0 || decl.flags & ts2.SymbolFlags.ConstEnum) {
    let typeOnlyDecl = null;
    if (decl.declarations !== void 0 && decl.declarations.length > 0) {
      typeOnlyDecl = decl.declarations[0];
    }
    return noValueDeclaration(typeNode, typeOnlyDecl);
  }
  const firstDecl = local.declarations && local.declarations[0];
  if (firstDecl !== void 0) {
    if (ts2.isImportClause(firstDecl) && firstDecl.name !== void 0) {
      if (firstDecl.isTypeOnly) {
        return typeOnlyImport(typeNode, firstDecl);
      }
      return {
        kind: 0,
        expression: firstDecl.name,
        defaultImportStatement: firstDecl.parent
      };
    } else if (ts2.isImportSpecifier(firstDecl)) {
      if (firstDecl.parent.parent.isTypeOnly) {
        return typeOnlyImport(typeNode, firstDecl.parent.parent);
      }
      const importedName = (firstDecl.propertyName || firstDecl.name).text;
      const [_localName, ...nestedPath] = symbols.symbolNames;
      const moduleName = extractModuleName(firstDecl.parent.parent.parent);
      return {
        kind: 1,
        valueDeclaration: decl.valueDeclaration,
        moduleName,
        importedName,
        nestedPath
      };
    } else if (ts2.isNamespaceImport(firstDecl)) {
      if (firstDecl.parent.isTypeOnly) {
        return typeOnlyImport(typeNode, firstDecl.parent);
      }
      if (symbols.symbolNames.length === 1) {
        return namespaceImport(typeNode, firstDecl.parent);
      }
      const [_ns, importedName, ...nestedPath] = symbols.symbolNames;
      const moduleName = extractModuleName(firstDecl.parent.parent);
      return {
        kind: 1,
        valueDeclaration: decl.valueDeclaration,
        moduleName,
        importedName,
        nestedPath
      };
    }
  }
  const expression = typeNodeToValueExpr(typeNode);
  if (expression !== null) {
    return {
      kind: 0,
      expression,
      defaultImportStatement: null
    };
  } else {
    return unsupportedType(typeNode);
  }
}
function unsupportedType(typeNode) {
  return {
    kind: 2,
    reason: { kind: 5, typeNode }
  };
}
function noValueDeclaration(typeNode, decl) {
  return {
    kind: 2,
    reason: { kind: 1, typeNode, decl }
  };
}
function typeOnlyImport(typeNode, importClause) {
  return {
    kind: 2,
    reason: { kind: 2, typeNode, importClause }
  };
}
function unknownReference(typeNode) {
  return {
    kind: 2,
    reason: { kind: 3, typeNode }
  };
}
function namespaceImport(typeNode, importClause) {
  return {
    kind: 2,
    reason: { kind: 4, typeNode, importClause }
  };
}
function missingType() {
  return {
    kind: 2,
    reason: { kind: 0 }
  };
}
function typeNodeToValueExpr(node) {
  if (ts2.isTypeReferenceNode(node)) {
    return entityNameToValue(node.typeName);
  } else {
    return null;
  }
}
function resolveTypeSymbols(typeRef, checker) {
  const typeName = typeRef.typeName;
  const typeRefSymbol = checker.getSymbolAtLocation(typeName);
  if (typeRefSymbol === void 0) {
    return null;
  }
  let local = typeRefSymbol;
  let leftMost = typeName;
  const symbolNames = [];
  while (ts2.isQualifiedName(leftMost)) {
    symbolNames.unshift(leftMost.right.text);
    leftMost = leftMost.left;
  }
  symbolNames.unshift(leftMost.text);
  if (leftMost !== typeName) {
    const localTmp = checker.getSymbolAtLocation(leftMost);
    if (localTmp !== void 0) {
      local = localTmp;
    }
  }
  let decl = typeRefSymbol;
  if (typeRefSymbol.flags & ts2.SymbolFlags.Alias) {
    decl = checker.getAliasedSymbol(typeRefSymbol);
  }
  return { local, decl, symbolNames };
}
function entityNameToValue(node) {
  if (ts2.isQualifiedName(node)) {
    const left = entityNameToValue(node.left);
    return left !== null ? ts2.createPropertyAccess(left, node.right) : null;
  } else if (ts2.isIdentifier(node)) {
    return ts2.getMutableClone(node);
  } else {
    return null;
  }
}
function extractModuleName(node) {
  if (!ts2.isStringLiteral(node.moduleSpecifier)) {
    throw new Error("not a module specifier");
  }
  return node.moduleSpecifier.text;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/reflection/src/typescript.mjs
import ts4 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/reflection/src/util.mjs
import ts3 from "typescript";
function isNamedClassDeclaration(node) {
  return ts3.isClassDeclaration(node) && isIdentifier(node.name);
}
function isIdentifier(node) {
  return node !== void 0 && ts3.isIdentifier(node);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/reflection/src/typescript.mjs
var TypeScriptReflectionHost = class {
  constructor(checker) {
    this.checker = checker;
  }
  getDecoratorsOfDeclaration(declaration) {
    if (declaration.decorators === void 0 || declaration.decorators.length === 0) {
      return null;
    }
    return declaration.decorators.map((decorator) => this._reflectDecorator(decorator)).filter((dec) => dec !== null);
  }
  getMembersOfClass(clazz) {
    const tsClazz = castDeclarationToClassOrDie(clazz);
    return tsClazz.members.map((member) => this._reflectMember(member)).filter((member) => member !== null);
  }
  getConstructorParameters(clazz) {
    const tsClazz = castDeclarationToClassOrDie(clazz);
    const isDeclaration = tsClazz.getSourceFile().isDeclarationFile;
    const ctor = tsClazz.members.find((member) => ts4.isConstructorDeclaration(member) && (isDeclaration || member.body !== void 0));
    if (ctor === void 0) {
      return null;
    }
    return ctor.parameters.map((node) => {
      const name = parameterName(node.name);
      const decorators = this.getDecoratorsOfDeclaration(node);
      let originalTypeNode = node.type || null;
      let typeNode = originalTypeNode;
      if (typeNode && ts4.isUnionTypeNode(typeNode)) {
        let childTypeNodes = typeNode.types.filter((childTypeNode) => !(ts4.isLiteralTypeNode(childTypeNode) && childTypeNode.literal.kind === ts4.SyntaxKind.NullKeyword));
        if (childTypeNodes.length === 1) {
          typeNode = childTypeNodes[0];
        }
      }
      const typeValueReference = typeToValue(typeNode, this.checker);
      return {
        name,
        nameNode: node.name,
        typeValueReference,
        typeNode: originalTypeNode,
        decorators
      };
    });
  }
  getImportOfIdentifier(id) {
    const directImport = this.getDirectImportOfIdentifier(id);
    if (directImport !== null) {
      return directImport;
    } else if (ts4.isQualifiedName(id.parent) && id.parent.right === id) {
      return this.getImportOfNamespacedIdentifier(id, getQualifiedNameRoot(id.parent));
    } else if (ts4.isPropertyAccessExpression(id.parent) && id.parent.name === id) {
      return this.getImportOfNamespacedIdentifier(id, getFarLeftIdentifier(id.parent));
    } else {
      return null;
    }
  }
  getExportsOfModule(node) {
    if (!ts4.isSourceFile(node)) {
      throw new Error(`getExportsOfModule() called on non-SourceFile in TS code`);
    }
    const symbol = this.checker.getSymbolAtLocation(node);
    if (symbol === void 0) {
      return null;
    }
    const map = new Map();
    this.checker.getExportsOfModule(symbol).forEach((exportSymbol) => {
      const decl = this.getDeclarationOfSymbol(exportSymbol, null);
      if (decl !== null) {
        map.set(exportSymbol.name, decl);
      }
    });
    return map;
  }
  isClass(node) {
    return isNamedClassDeclaration(node);
  }
  hasBaseClass(clazz) {
    return this.getBaseClassExpression(clazz) !== null;
  }
  getBaseClassExpression(clazz) {
    if (!(ts4.isClassDeclaration(clazz) || ts4.isClassExpression(clazz)) || clazz.heritageClauses === void 0) {
      return null;
    }
    const extendsClause = clazz.heritageClauses.find((clause) => clause.token === ts4.SyntaxKind.ExtendsKeyword);
    if (extendsClause === void 0) {
      return null;
    }
    const extendsType = extendsClause.types[0];
    if (extendsType === void 0) {
      return null;
    }
    return extendsType.expression;
  }
  getDeclarationOfIdentifier(id) {
    let symbol = this.checker.getSymbolAtLocation(id);
    if (symbol === void 0) {
      return null;
    }
    return this.getDeclarationOfSymbol(symbol, id);
  }
  getDefinitionOfFunction(node) {
    if (!ts4.isFunctionDeclaration(node) && !ts4.isMethodDeclaration(node) && !ts4.isFunctionExpression(node)) {
      return null;
    }
    return {
      node,
      body: node.body !== void 0 ? Array.from(node.body.statements) : null,
      parameters: node.parameters.map((param) => {
        const name = parameterName(param.name);
        const initializer = param.initializer || null;
        return { name, node: param, initializer };
      })
    };
  }
  getGenericArityOfClass(clazz) {
    if (!ts4.isClassDeclaration(clazz)) {
      return null;
    }
    return clazz.typeParameters !== void 0 ? clazz.typeParameters.length : 0;
  }
  getVariableValue(declaration) {
    return declaration.initializer || null;
  }
  getDtsDeclaration(_) {
    return null;
  }
  getInternalNameOfClass(clazz) {
    return clazz.name;
  }
  getAdjacentNameOfClass(clazz) {
    return clazz.name;
  }
  isStaticallyExported(decl) {
    let topLevel = decl;
    if (ts4.isVariableDeclaration(decl) && ts4.isVariableDeclarationList(decl.parent)) {
      topLevel = decl.parent.parent;
    }
    if (topLevel.modifiers !== void 0 && topLevel.modifiers.some((modifier) => modifier.kind === ts4.SyntaxKind.ExportKeyword)) {
      return true;
    }
    if (topLevel.parent === void 0 || !ts4.isSourceFile(topLevel.parent)) {
      return false;
    }
    const localExports = this.getLocalExportedDeclarationsOfSourceFile(decl.getSourceFile());
    return localExports.has(decl);
  }
  getDirectImportOfIdentifier(id) {
    const symbol = this.checker.getSymbolAtLocation(id);
    if (symbol === void 0 || symbol.declarations === void 0 || symbol.declarations.length !== 1) {
      return null;
    }
    const decl = symbol.declarations[0];
    const importDecl = getContainingImportDeclaration(decl);
    if (importDecl === null) {
      return null;
    }
    if (!ts4.isStringLiteral(importDecl.moduleSpecifier)) {
      return null;
    }
    return { from: importDecl.moduleSpecifier.text, name: getExportedName(decl, id) };
  }
  getImportOfNamespacedIdentifier(id, namespaceIdentifier) {
    if (namespaceIdentifier === null) {
      return null;
    }
    const namespaceSymbol = this.checker.getSymbolAtLocation(namespaceIdentifier);
    if (!namespaceSymbol || namespaceSymbol.declarations === void 0) {
      return null;
    }
    const declaration = namespaceSymbol.declarations.length === 1 ? namespaceSymbol.declarations[0] : null;
    if (!declaration) {
      return null;
    }
    const namespaceDeclaration = ts4.isNamespaceImport(declaration) ? declaration : null;
    if (!namespaceDeclaration) {
      return null;
    }
    const importDeclaration = namespaceDeclaration.parent.parent;
    if (!ts4.isStringLiteral(importDeclaration.moduleSpecifier)) {
      return null;
    }
    return {
      from: importDeclaration.moduleSpecifier.text,
      name: id.text
    };
  }
  getDeclarationOfSymbol(symbol, originalId) {
    let valueDeclaration = void 0;
    if (symbol.valueDeclaration !== void 0) {
      valueDeclaration = symbol.valueDeclaration;
    } else if (symbol.declarations !== void 0 && symbol.declarations.length > 0) {
      valueDeclaration = symbol.declarations[0];
    }
    if (valueDeclaration !== void 0 && ts4.isShorthandPropertyAssignment(valueDeclaration)) {
      const shorthandSymbol = this.checker.getShorthandAssignmentValueSymbol(valueDeclaration);
      if (shorthandSymbol === void 0) {
        return null;
      }
      return this.getDeclarationOfSymbol(shorthandSymbol, originalId);
    } else if (valueDeclaration !== void 0 && ts4.isExportSpecifier(valueDeclaration)) {
      const targetSymbol = this.checker.getExportSpecifierLocalTargetSymbol(valueDeclaration);
      if (targetSymbol === void 0) {
        return null;
      }
      return this.getDeclarationOfSymbol(targetSymbol, originalId);
    }
    const importInfo = originalId && this.getImportOfIdentifier(originalId);
    const viaModule = importInfo !== null && importInfo.from !== null && !importInfo.from.startsWith(".") ? importInfo.from : null;
    while (symbol.flags & ts4.SymbolFlags.Alias) {
      symbol = this.checker.getAliasedSymbol(symbol);
    }
    if (symbol.valueDeclaration !== void 0) {
      return {
        node: symbol.valueDeclaration,
        known: null,
        viaModule,
        identity: null,
        kind: 0
      };
    } else if (symbol.declarations !== void 0 && symbol.declarations.length > 0) {
      return {
        node: symbol.declarations[0],
        known: null,
        viaModule,
        identity: null,
        kind: 0
      };
    } else {
      return null;
    }
  }
  _reflectDecorator(node) {
    let decoratorExpr = node.expression;
    let args = null;
    if (ts4.isCallExpression(decoratorExpr)) {
      args = Array.from(decoratorExpr.arguments);
      decoratorExpr = decoratorExpr.expression;
    }
    if (!isDecoratorIdentifier(decoratorExpr)) {
      return null;
    }
    const decoratorIdentifier = ts4.isIdentifier(decoratorExpr) ? decoratorExpr : decoratorExpr.name;
    const importDecl = this.getImportOfIdentifier(decoratorIdentifier);
    return {
      name: decoratorIdentifier.text,
      identifier: decoratorExpr,
      import: importDecl,
      node,
      args
    };
  }
  _reflectMember(node) {
    let kind = null;
    let value = null;
    let name = null;
    let nameNode = null;
    if (ts4.isPropertyDeclaration(node)) {
      kind = ClassMemberKind.Property;
      value = node.initializer || null;
    } else if (ts4.isGetAccessorDeclaration(node)) {
      kind = ClassMemberKind.Getter;
    } else if (ts4.isSetAccessorDeclaration(node)) {
      kind = ClassMemberKind.Setter;
    } else if (ts4.isMethodDeclaration(node)) {
      kind = ClassMemberKind.Method;
    } else if (ts4.isConstructorDeclaration(node)) {
      kind = ClassMemberKind.Constructor;
    } else {
      return null;
    }
    if (ts4.isConstructorDeclaration(node)) {
      name = "constructor";
    } else if (ts4.isIdentifier(node.name)) {
      name = node.name.text;
      nameNode = node.name;
    } else if (ts4.isStringLiteral(node.name)) {
      name = node.name.text;
      nameNode = node.name;
    } else {
      return null;
    }
    const decorators = this.getDecoratorsOfDeclaration(node);
    const isStatic = node.modifiers !== void 0 && node.modifiers.some((mod) => mod.kind === ts4.SyntaxKind.StaticKeyword);
    return {
      node,
      implementation: node,
      kind,
      type: node.type || null,
      name,
      nameNode,
      decorators,
      value,
      isStatic
    };
  }
  getLocalExportedDeclarationsOfSourceFile(file) {
    const cacheSf = file;
    if (cacheSf[LocalExportedDeclarations] !== void 0) {
      return cacheSf[LocalExportedDeclarations];
    }
    const exportSet = new Set();
    cacheSf[LocalExportedDeclarations] = exportSet;
    const sfSymbol = this.checker.getSymbolAtLocation(cacheSf);
    if (sfSymbol === void 0 || sfSymbol.exports === void 0) {
      return exportSet;
    }
    const iter = sfSymbol.exports.values();
    let item = iter.next();
    while (item.done !== true) {
      let exportedSymbol = item.value;
      if (exportedSymbol.flags & ts4.SymbolFlags.Alias) {
        exportedSymbol = this.checker.getAliasedSymbol(exportedSymbol);
      }
      if (exportedSymbol.valueDeclaration !== void 0 && exportedSymbol.valueDeclaration.getSourceFile() === file) {
        exportSet.add(exportedSymbol.valueDeclaration);
      }
      item = iter.next();
    }
    return exportSet;
  }
};
function castDeclarationToClassOrDie(declaration) {
  if (!ts4.isClassDeclaration(declaration)) {
    throw new Error(`Reflecting on a ${ts4.SyntaxKind[declaration.kind]} instead of a ClassDeclaration.`);
  }
  return declaration;
}
function parameterName(name) {
  if (ts4.isIdentifier(name)) {
    return name.text;
  } else {
    return null;
  }
}
function getQualifiedNameRoot(qualifiedName) {
  while (ts4.isQualifiedName(qualifiedName.left)) {
    qualifiedName = qualifiedName.left;
  }
  return ts4.isIdentifier(qualifiedName.left) ? qualifiedName.left : null;
}
function getFarLeftIdentifier(propertyAccess) {
  while (ts4.isPropertyAccessExpression(propertyAccess.expression)) {
    propertyAccess = propertyAccess.expression;
  }
  return ts4.isIdentifier(propertyAccess.expression) ? propertyAccess.expression : null;
}
function getContainingImportDeclaration(node) {
  return ts4.isImportSpecifier(node) ? node.parent.parent.parent : ts4.isNamespaceImport(node) ? node.parent.parent : null;
}
function getExportedName(decl, originalId) {
  return ts4.isImportSpecifier(decl) ? (decl.propertyName !== void 0 ? decl.propertyName : decl.name).text : originalId.text;
}
var LocalExportedDeclarations = Symbol("LocalExportedDeclarations");

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/downlevel_decorators_transform/downlevel_decorators_transform.mjs
import ts6 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/downlevel_decorators_transform/patch_alias_reference_resolution.mjs
import ts5 from "typescript";
var patchedReferencedAliasesSymbol = Symbol("patchedReferencedAliases");
function loadIsReferencedAliasDeclarationPatch(context) {
  if (!isTransformationContextWithEmitResolver(context)) {
    throwIncompatibleTransformationContextError();
  }
  const emitResolver = context.getEmitResolver();
  const existingReferencedAliases = emitResolver[patchedReferencedAliasesSymbol];
  if (existingReferencedAliases !== void 0) {
    return existingReferencedAliases;
  }
  const originalIsReferencedAliasDeclaration = emitResolver.isReferencedAliasDeclaration;
  if (originalIsReferencedAliasDeclaration === void 0) {
    throwIncompatibleTransformationContextError();
  }
  const referencedAliases = new Set();
  emitResolver.isReferencedAliasDeclaration = function(node, ...args) {
    if (isAliasImportDeclaration(node) && referencedAliases.has(node)) {
      return true;
    }
    return originalIsReferencedAliasDeclaration.call(emitResolver, node, ...args);
  };
  return emitResolver[patchedReferencedAliasesSymbol] = referencedAliases;
}
function isAliasImportDeclaration(node) {
  return ts5.isImportSpecifier(node) || ts5.isNamespaceImport(node) || ts5.isImportClause(node);
}
function isTransformationContextWithEmitResolver(context) {
  return context.getEmitResolver !== void 0;
}
function throwIncompatibleTransformationContextError() {
  throw Error("Unable to downlevel Angular decorators due to an incompatible TypeScript version.\nIf you recently updated TypeScript and this issue surfaces now, consider downgrading.\n\nPlease report an issue on the Angular repositories when this issue surfaces and you are using a supposedly compatible TypeScript version.");
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/downlevel_decorators_transform/downlevel_decorators_transform.mjs
function isAngularDecorator(decorator, isCore) {
  return isCore || decorator.import !== null && decorator.import.from === "@angular/core";
}
var DECORATOR_INVOCATION_JSDOC_TYPE = "!Array<{type: !Function, args: (undefined|!Array<?>)}>";
function extractMetadataFromSingleDecorator(decorator, diagnostics) {
  const metadataProperties = [];
  const expr = decorator.expression;
  switch (expr.kind) {
    case ts6.SyntaxKind.Identifier:
      metadataProperties.push(ts6.createPropertyAssignment("type", expr));
      break;
    case ts6.SyntaxKind.CallExpression:
      const call = expr;
      metadataProperties.push(ts6.createPropertyAssignment("type", call.expression));
      if (call.arguments.length) {
        const args = [];
        for (const arg of call.arguments) {
          args.push(arg);
        }
        const argsArrayLiteral = ts6.createArrayLiteral(ts6.createNodeArray(args, true));
        metadataProperties.push(ts6.createPropertyAssignment("args", argsArrayLiteral));
      }
      break;
    default:
      diagnostics.push({
        file: decorator.getSourceFile(),
        start: decorator.getStart(),
        length: decorator.getEnd() - decorator.getStart(),
        messageText: `${ts6.SyntaxKind[decorator.kind]} not implemented in gathering decorator metadata.`,
        category: ts6.DiagnosticCategory.Error,
        code: 0
      });
      break;
  }
  return ts6.createObjectLiteral(metadataProperties);
}
function createCtorParametersClassProperty(diagnostics, entityNameToExpression, ctorParameters, isClosureCompilerEnabled) {
  const params = [];
  for (const ctorParam of ctorParameters) {
    if (!ctorParam.type && ctorParam.decorators.length === 0) {
      params.push(ts6.createNull());
      continue;
    }
    const paramType = ctorParam.type ? typeReferenceToExpression(entityNameToExpression, ctorParam.type) : void 0;
    const members = [ts6.createPropertyAssignment("type", paramType || ts6.createIdentifier("undefined"))];
    const decorators = [];
    for (const deco of ctorParam.decorators) {
      decorators.push(extractMetadataFromSingleDecorator(deco, diagnostics));
    }
    if (decorators.length) {
      members.push(ts6.createPropertyAssignment("decorators", ts6.createArrayLiteral(decorators)));
    }
    params.push(ts6.createObjectLiteral(members));
  }
  const initializer = ts6.createArrowFunction(void 0, void 0, [], void 0, ts6.createToken(ts6.SyntaxKind.EqualsGreaterThanToken), ts6.createArrayLiteral(params, true));
  const ctorProp = ts6.createProperty(void 0, [ts6.createToken(ts6.SyntaxKind.StaticKeyword)], "ctorParameters", void 0, void 0, initializer);
  if (isClosureCompilerEnabled) {
    ts6.setSyntheticLeadingComments(ctorProp, [
      {
        kind: ts6.SyntaxKind.MultiLineCommentTrivia,
        text: [
          `*`,
          ` * @type {function(): !Array<(null|{`,
          ` *   type: ?,`,
          ` *   decorators: (undefined|${DECORATOR_INVOCATION_JSDOC_TYPE}),`,
          ` * })>}`,
          ` * @nocollapse`,
          ` `
        ].join("\n"),
        pos: -1,
        end: -1,
        hasTrailingNewLine: true
      }
    ]);
  }
  return ctorProp;
}
function typeReferenceToExpression(entityNameToExpression, node) {
  let kind = node.kind;
  if (ts6.isLiteralTypeNode(node)) {
    kind = node.literal.kind;
  }
  switch (kind) {
    case ts6.SyntaxKind.FunctionType:
    case ts6.SyntaxKind.ConstructorType:
      return ts6.createIdentifier("Function");
    case ts6.SyntaxKind.ArrayType:
    case ts6.SyntaxKind.TupleType:
      return ts6.createIdentifier("Array");
    case ts6.SyntaxKind.TypePredicate:
    case ts6.SyntaxKind.TrueKeyword:
    case ts6.SyntaxKind.FalseKeyword:
    case ts6.SyntaxKind.BooleanKeyword:
      return ts6.createIdentifier("Boolean");
    case ts6.SyntaxKind.StringLiteral:
    case ts6.SyntaxKind.StringKeyword:
      return ts6.createIdentifier("String");
    case ts6.SyntaxKind.ObjectKeyword:
      return ts6.createIdentifier("Object");
    case ts6.SyntaxKind.NumberKeyword:
    case ts6.SyntaxKind.NumericLiteral:
      return ts6.createIdentifier("Number");
    case ts6.SyntaxKind.TypeReference:
      const typeRef = node;
      return entityNameToExpression(typeRef.typeName);
    case ts6.SyntaxKind.UnionType:
      const childTypeNodes = node.types.filter((t) => !(ts6.isLiteralTypeNode(t) && t.literal.kind === ts6.SyntaxKind.NullKeyword));
      return childTypeNodes.length === 1 ? typeReferenceToExpression(entityNameToExpression, childTypeNodes[0]) : void 0;
    default:
      return void 0;
  }
}
function symbolIsRuntimeValue(typeChecker, symbol) {
  if (symbol.flags & ts6.SymbolFlags.Alias) {
    symbol = typeChecker.getAliasedSymbol(symbol);
  }
  return (symbol.flags & ts6.SymbolFlags.Value & ts6.SymbolFlags.ConstEnumExcludes) !== 0;
}
function getDownlevelDecoratorsTransform(typeChecker, host, diagnostics, isCore, isClosureCompilerEnabled, skipClassDecorators) {
  function addJSDocTypeAnnotation(node, jsdocType) {
    if (!isClosureCompilerEnabled) {
      return;
    }
    ts6.setSyntheticLeadingComments(node, [
      {
        kind: ts6.SyntaxKind.MultiLineCommentTrivia,
        text: `* @type {${jsdocType}} `,
        pos: -1,
        end: -1,
        hasTrailingNewLine: true
      }
    ]);
  }
  function createDecoratorClassProperty(decoratorList) {
    const modifier = ts6.createToken(ts6.SyntaxKind.StaticKeyword);
    const initializer = ts6.createArrayLiteral(decoratorList, true);
    const prop = ts6.createProperty(void 0, [modifier], "decorators", void 0, void 0, initializer);
    addJSDocTypeAnnotation(prop, DECORATOR_INVOCATION_JSDOC_TYPE);
    return prop;
  }
  function createPropDecoratorsClassProperty(diagnostics2, properties) {
    const entries = [];
    for (const [name, decorators] of properties.entries()) {
      entries.push(ts6.createPropertyAssignment(name, ts6.createArrayLiteral(decorators.map((deco) => extractMetadataFromSingleDecorator(deco, diagnostics2)))));
    }
    const initializer = ts6.createObjectLiteral(entries, true);
    const prop = ts6.createProperty(void 0, [ts6.createToken(ts6.SyntaxKind.StaticKeyword)], "propDecorators", void 0, void 0, initializer);
    addJSDocTypeAnnotation(prop, `!Object<string, ${DECORATOR_INVOCATION_JSDOC_TYPE}>`);
    return prop;
  }
  return (context) => {
    const referencedParameterTypes = loadIsReferencedAliasDeclarationPatch(context);
    function entityNameToExpression(name) {
      const symbol = typeChecker.getSymbolAtLocation(name);
      if (!symbol || !symbolIsRuntimeValue(typeChecker, symbol) || !symbol.declarations || symbol.declarations.length === 0) {
        return void 0;
      }
      if (ts6.isQualifiedName(name)) {
        const containerExpr = entityNameToExpression(name.left);
        if (containerExpr === void 0) {
          return void 0;
        }
        return ts6.createPropertyAccess(containerExpr, name.right);
      }
      const decl = symbol.declarations[0];
      if (isAliasImportDeclaration(decl)) {
        referencedParameterTypes.add(decl);
        if (decl.name !== void 0) {
          return ts6.getMutableClone(decl.name);
        }
      }
      return ts6.getMutableClone(name);
    }
    function transformClassElement(element) {
      element = ts6.visitEachChild(element, decoratorDownlevelVisitor, context);
      const decoratorsToKeep = [];
      const toLower = [];
      const decorators = host.getDecoratorsOfDeclaration(element) || [];
      for (const decorator of decorators) {
        const decoratorNode = decorator.node;
        if (!isAngularDecorator(decorator, isCore)) {
          decoratorsToKeep.push(decoratorNode);
          continue;
        }
        toLower.push(decoratorNode);
      }
      if (!toLower.length)
        return [void 0, element, []];
      if (!element.name || !ts6.isIdentifier(element.name)) {
        diagnostics.push({
          file: element.getSourceFile(),
          start: element.getStart(),
          length: element.getEnd() - element.getStart(),
          messageText: `Cannot process decorators for class element with non-analyzable name.`,
          category: ts6.DiagnosticCategory.Error,
          code: 0
        });
        return [void 0, element, []];
      }
      const name = element.name.text;
      const mutable = ts6.getMutableClone(element);
      mutable.decorators = decoratorsToKeep.length ? ts6.setTextRange(ts6.createNodeArray(decoratorsToKeep), mutable.decorators) : void 0;
      return [name, mutable, toLower];
    }
    function transformConstructor(ctor) {
      ctor = ts6.visitEachChild(ctor, decoratorDownlevelVisitor, context);
      const newParameters = [];
      const oldParameters = ts6.visitParameterList(ctor.parameters, decoratorDownlevelVisitor, context);
      const parametersInfo = [];
      for (const param of oldParameters) {
        const decoratorsToKeep = [];
        const paramInfo = { decorators: [], type: null };
        const decorators = host.getDecoratorsOfDeclaration(param) || [];
        for (const decorator of decorators) {
          const decoratorNode = decorator.node;
          if (!isAngularDecorator(decorator, isCore)) {
            decoratorsToKeep.push(decoratorNode);
            continue;
          }
          paramInfo.decorators.push(decoratorNode);
        }
        if (param.type) {
          paramInfo.type = param.type;
        }
        parametersInfo.push(paramInfo);
        const newParam = ts6.updateParameter(param, decoratorsToKeep.length ? decoratorsToKeep : void 0, param.modifiers, param.dotDotDotToken, param.name, param.questionToken, param.type, param.initializer);
        newParameters.push(newParam);
      }
      const updated = ts6.updateConstructor(ctor, ctor.decorators, ctor.modifiers, newParameters, ts6.visitFunctionBody(ctor.body, decoratorDownlevelVisitor, context));
      return [updated, parametersInfo];
    }
    function transformClassDeclaration(classDecl) {
      classDecl = ts6.getMutableClone(classDecl);
      const newMembers = [];
      const decoratedProperties = new Map();
      let classParameters = null;
      for (const member of classDecl.members) {
        switch (member.kind) {
          case ts6.SyntaxKind.PropertyDeclaration:
          case ts6.SyntaxKind.GetAccessor:
          case ts6.SyntaxKind.SetAccessor:
          case ts6.SyntaxKind.MethodDeclaration: {
            const [name, newMember, decorators] = transformClassElement(member);
            newMembers.push(newMember);
            if (name)
              decoratedProperties.set(name, decorators);
            continue;
          }
          case ts6.SyntaxKind.Constructor: {
            const ctor = member;
            if (!ctor.body)
              break;
            const [newMember, parametersInfo] = transformConstructor(member);
            classParameters = parametersInfo;
            newMembers.push(newMember);
            continue;
          }
          default:
            break;
        }
        newMembers.push(ts6.visitEachChild(member, decoratorDownlevelVisitor, context));
      }
      const decoratorsToKeep = new Set(classDecl.decorators);
      const possibleAngularDecorators = host.getDecoratorsOfDeclaration(classDecl) || [];
      let hasAngularDecorator = false;
      const decoratorsToLower = [];
      for (const decorator of possibleAngularDecorators) {
        const decoratorNode = decorator.node;
        const isNgDecorator = isAngularDecorator(decorator, isCore);
        if (isNgDecorator) {
          hasAngularDecorator = true;
        }
        if (isNgDecorator && !skipClassDecorators) {
          decoratorsToLower.push(extractMetadataFromSingleDecorator(decoratorNode, diagnostics));
          decoratorsToKeep.delete(decoratorNode);
        }
      }
      if (decoratorsToLower.length) {
        newMembers.push(createDecoratorClassProperty(decoratorsToLower));
      }
      if (classParameters) {
        if (hasAngularDecorator || classParameters.some((p) => !!p.decorators.length)) {
          newMembers.push(createCtorParametersClassProperty(diagnostics, entityNameToExpression, classParameters, isClosureCompilerEnabled));
        }
      }
      if (decoratedProperties.size) {
        newMembers.push(createPropDecoratorsClassProperty(diagnostics, decoratedProperties));
      }
      const members = ts6.setTextRange(ts6.createNodeArray(newMembers, classDecl.members.hasTrailingComma), classDecl.members);
      return ts6.updateClassDeclaration(classDecl, decoratorsToKeep.size ? Array.from(decoratorsToKeep) : void 0, classDecl.modifiers, classDecl.name, classDecl.typeParameters, classDecl.heritageClauses, members);
    }
    function decoratorDownlevelVisitor(node) {
      if (ts6.isClassDeclaration(node)) {
        return transformClassDeclaration(node);
      }
      return ts6.visitEachChild(node, decoratorDownlevelVisitor, context);
    }
    return (sf) => {
      return ts6.visitEachChild(sf, decoratorDownlevelVisitor, context);
    };
  };
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/private/tooling.mjs
var GLOBAL_DEFS_FOR_TERSER = {
  ngDevMode: false,
  ngI18nClosureMode: false
};
var GLOBAL_DEFS_FOR_TERSER_WITH_AOT = __spreadProps(__spreadValues({}, GLOBAL_DEFS_FOR_TERSER), {
  ngJitMode: false
});
function constructorParametersDownlevelTransform(program) {
  const typeChecker = program.getTypeChecker();
  const reflectionHost = new TypeScriptReflectionHost(typeChecker);
  return getDownlevelDecoratorsTransform(typeChecker, reflectionHost, [], false, false, true);
}
export {
  GLOBAL_DEFS_FOR_TERSER,
  GLOBAL_DEFS_FOR_TERSER_WITH_AOT,
  constructorParametersDownlevelTransform
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
//# sourceMappingURL=tooling.js.map
