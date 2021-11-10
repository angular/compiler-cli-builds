
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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/component.mjs
import { compileClassMetadata as compileClassMetadata3, compileComponentFromMetadata, compileDeclareClassMetadata as compileDeclareClassMetadata3, compileDeclareComponentFromMetadata, CssSelector, DEFAULT_INTERPOLATION_CONFIG, DomElementSchemaRegistry, ExternalExpr as ExternalExpr7, FactoryTarget as FactoryTarget3, InterpolationConfig, makeBindingParser as makeBindingParser2, ParseSourceFile as ParseSourceFile2, parseTemplate, R3TargetBinder, SelectorMatcher, ViewEncapsulation, WrappedNodeExpr as WrappedNodeExpr6 } from "@angular/compiler";
import ts31 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/diagnostics/src/error_code.mjs
var ErrorCode;
(function(ErrorCode2) {
  ErrorCode2[ErrorCode2["DECORATOR_ARG_NOT_LITERAL"] = 1001] = "DECORATOR_ARG_NOT_LITERAL";
  ErrorCode2[ErrorCode2["DECORATOR_ARITY_WRONG"] = 1002] = "DECORATOR_ARITY_WRONG";
  ErrorCode2[ErrorCode2["DECORATOR_NOT_CALLED"] = 1003] = "DECORATOR_NOT_CALLED";
  ErrorCode2[ErrorCode2["DECORATOR_ON_ANONYMOUS_CLASS"] = 1004] = "DECORATOR_ON_ANONYMOUS_CLASS";
  ErrorCode2[ErrorCode2["DECORATOR_UNEXPECTED"] = 1005] = "DECORATOR_UNEXPECTED";
  ErrorCode2[ErrorCode2["DECORATOR_COLLISION"] = 1006] = "DECORATOR_COLLISION";
  ErrorCode2[ErrorCode2["VALUE_HAS_WRONG_TYPE"] = 1010] = "VALUE_HAS_WRONG_TYPE";
  ErrorCode2[ErrorCode2["VALUE_NOT_LITERAL"] = 1011] = "VALUE_NOT_LITERAL";
  ErrorCode2[ErrorCode2["COMPONENT_MISSING_TEMPLATE"] = 2001] = "COMPONENT_MISSING_TEMPLATE";
  ErrorCode2[ErrorCode2["PIPE_MISSING_NAME"] = 2002] = "PIPE_MISSING_NAME";
  ErrorCode2[ErrorCode2["PARAM_MISSING_TOKEN"] = 2003] = "PARAM_MISSING_TOKEN";
  ErrorCode2[ErrorCode2["DIRECTIVE_MISSING_SELECTOR"] = 2004] = "DIRECTIVE_MISSING_SELECTOR";
  ErrorCode2[ErrorCode2["UNDECORATED_PROVIDER"] = 2005] = "UNDECORATED_PROVIDER";
  ErrorCode2[ErrorCode2["DIRECTIVE_INHERITS_UNDECORATED_CTOR"] = 2006] = "DIRECTIVE_INHERITS_UNDECORATED_CTOR";
  ErrorCode2[ErrorCode2["UNDECORATED_CLASS_USING_ANGULAR_FEATURES"] = 2007] = "UNDECORATED_CLASS_USING_ANGULAR_FEATURES";
  ErrorCode2[ErrorCode2["COMPONENT_RESOURCE_NOT_FOUND"] = 2008] = "COMPONENT_RESOURCE_NOT_FOUND";
  ErrorCode2[ErrorCode2["COMPONENT_INVALID_SHADOW_DOM_SELECTOR"] = 2009] = "COMPONENT_INVALID_SHADOW_DOM_SELECTOR";
  ErrorCode2[ErrorCode2["SYMBOL_NOT_EXPORTED"] = 3001] = "SYMBOL_NOT_EXPORTED";
  ErrorCode2[ErrorCode2["SYMBOL_EXPORTED_UNDER_DIFFERENT_NAME"] = 3002] = "SYMBOL_EXPORTED_UNDER_DIFFERENT_NAME";
  ErrorCode2[ErrorCode2["IMPORT_CYCLE_DETECTED"] = 3003] = "IMPORT_CYCLE_DETECTED";
  ErrorCode2[ErrorCode2["CONFIG_FLAT_MODULE_NO_INDEX"] = 4001] = "CONFIG_FLAT_MODULE_NO_INDEX";
  ErrorCode2[ErrorCode2["CONFIG_STRICT_TEMPLATES_IMPLIES_FULL_TEMPLATE_TYPECHECK"] = 4002] = "CONFIG_STRICT_TEMPLATES_IMPLIES_FULL_TEMPLATE_TYPECHECK";
  ErrorCode2[ErrorCode2["HOST_BINDING_PARSE_ERROR"] = 5001] = "HOST_BINDING_PARSE_ERROR";
  ErrorCode2[ErrorCode2["TEMPLATE_PARSE_ERROR"] = 5002] = "TEMPLATE_PARSE_ERROR";
  ErrorCode2[ErrorCode2["NGMODULE_INVALID_DECLARATION"] = 6001] = "NGMODULE_INVALID_DECLARATION";
  ErrorCode2[ErrorCode2["NGMODULE_INVALID_IMPORT"] = 6002] = "NGMODULE_INVALID_IMPORT";
  ErrorCode2[ErrorCode2["NGMODULE_INVALID_EXPORT"] = 6003] = "NGMODULE_INVALID_EXPORT";
  ErrorCode2[ErrorCode2["NGMODULE_INVALID_REEXPORT"] = 6004] = "NGMODULE_INVALID_REEXPORT";
  ErrorCode2[ErrorCode2["NGMODULE_MODULE_WITH_PROVIDERS_MISSING_GENERIC"] = 6005] = "NGMODULE_MODULE_WITH_PROVIDERS_MISSING_GENERIC";
  ErrorCode2[ErrorCode2["NGMODULE_REEXPORT_NAME_COLLISION"] = 6006] = "NGMODULE_REEXPORT_NAME_COLLISION";
  ErrorCode2[ErrorCode2["NGMODULE_DECLARATION_NOT_UNIQUE"] = 6007] = "NGMODULE_DECLARATION_NOT_UNIQUE";
  ErrorCode2[ErrorCode2["NGMODULE_VE_DEPENDENCY_ON_IVY_LIB"] = 6999] = "NGMODULE_VE_DEPENDENCY_ON_IVY_LIB";
  ErrorCode2[ErrorCode2["SCHEMA_INVALID_ELEMENT"] = 8001] = "SCHEMA_INVALID_ELEMENT";
  ErrorCode2[ErrorCode2["SCHEMA_INVALID_ATTRIBUTE"] = 8002] = "SCHEMA_INVALID_ATTRIBUTE";
  ErrorCode2[ErrorCode2["MISSING_REFERENCE_TARGET"] = 8003] = "MISSING_REFERENCE_TARGET";
  ErrorCode2[ErrorCode2["MISSING_PIPE"] = 8004] = "MISSING_PIPE";
  ErrorCode2[ErrorCode2["WRITE_TO_READ_ONLY_VARIABLE"] = 8005] = "WRITE_TO_READ_ONLY_VARIABLE";
  ErrorCode2[ErrorCode2["DUPLICATE_VARIABLE_DECLARATION"] = 8006] = "DUPLICATE_VARIABLE_DECLARATION";
  ErrorCode2[ErrorCode2["SPLIT_TWO_WAY_BINDING"] = 8007] = "SPLIT_TWO_WAY_BINDING";
  ErrorCode2[ErrorCode2["INVALID_BANANA_IN_BOX"] = 8101] = "INVALID_BANANA_IN_BOX";
  ErrorCode2[ErrorCode2["NULLISH_COALESCING_NOT_NULLABLE"] = 8102] = "NULLISH_COALESCING_NOT_NULLABLE";
  ErrorCode2[ErrorCode2["INLINE_TCB_REQUIRED"] = 8900] = "INLINE_TCB_REQUIRED";
  ErrorCode2[ErrorCode2["INLINE_TYPE_CTOR_REQUIRED"] = 8901] = "INLINE_TYPE_CTOR_REQUIRED";
  ErrorCode2[ErrorCode2["INJECTABLE_DUPLICATE_PROV"] = 9001] = "INJECTABLE_DUPLICATE_PROV";
  ErrorCode2[ErrorCode2["SUGGEST_STRICT_TEMPLATES"] = 10001] = "SUGGEST_STRICT_TEMPLATES";
  ErrorCode2[ErrorCode2["SUGGEST_SUBOPTIMAL_TYPE_INFERENCE"] = 10002] = "SUGGEST_SUBOPTIMAL_TYPE_INFERENCE";
})(ErrorCode || (ErrorCode = {}));

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/diagnostics/src/docs.mjs
var COMPILER_ERRORS_WITH_GUIDES = new Set([
  ErrorCode.DECORATOR_ARG_NOT_LITERAL,
  ErrorCode.IMPORT_CYCLE_DETECTED,
  ErrorCode.PARAM_MISSING_TOKEN,
  ErrorCode.SCHEMA_INVALID_ELEMENT,
  ErrorCode.SCHEMA_INVALID_ATTRIBUTE,
  ErrorCode.MISSING_REFERENCE_TARGET,
  ErrorCode.COMPONENT_INVALID_SHADOW_DOM_SELECTOR
]);

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/diagnostics/src/error.mjs
import ts from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/file_system/src/compiler_host.mjs
import {
  EOL
} from "os";
import ts2 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/file_system/src/invalid_file_system.mjs
var InvalidFileSystem = class {
  exists(path) {
    throw makeError();
  }
  readFile(path) {
    throw makeError();
  }
  readFileBuffer(path) {
    throw makeError();
  }
  writeFile(path, data, exclusive) {
    throw makeError();
  }
  removeFile(path) {
    throw makeError();
  }
  symlink(target, path) {
    throw makeError();
  }
  readdir(path) {
    throw makeError();
  }
  lstat(path) {
    throw makeError();
  }
  stat(path) {
    throw makeError();
  }
  pwd() {
    throw makeError();
  }
  chdir(path) {
    throw makeError();
  }
  extname(path) {
    throw makeError();
  }
  copyFile(from, to) {
    throw makeError();
  }
  moveFile(from, to) {
    throw makeError();
  }
  ensureDir(path) {
    throw makeError();
  }
  removeDeep(path) {
    throw makeError();
  }
  isCaseSensitive() {
    throw makeError();
  }
  resolve(...paths) {
    throw makeError();
  }
  dirname(file) {
    throw makeError();
  }
  join(basePath, ...paths) {
    throw makeError();
  }
  isRoot(path) {
    throw makeError();
  }
  isRooted(path) {
    throw makeError();
  }
  relative(from, to) {
    throw makeError();
  }
  basename(filePath, extension) {
    throw makeError();
  }
  realpath(filePath) {
    throw makeError();
  }
  getDefaultLibLocation() {
    throw makeError();
  }
  normalize(path) {
    throw makeError();
  }
};
function makeError() {
  return new Error("FileSystem has not been configured. Please call `setFileSystem()` before calling this method.");
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/file_system/src/helpers.mjs
var fs = new InvalidFileSystem();
var ABSOLUTE_PATH = Symbol("AbsolutePath");

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/file_system/src/node_js_file_system.mjs
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmdirSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync
} from "fs";
import module from "module";
import {
  basename,
  dirname as dirname2,
  extname,
  isAbsolute,
  join,
  relative as relative2,
  resolve as resolve2
} from "path";
import { fileURLToPath } from "url";
var isCommonJS = typeof __filename !== "undefined";
var currentFileUrl = isCommonJS ? null : __ESM_IMPORT_META_URL__;
var currentFileName = isCommonJS ? __filename : fileURLToPath(currentFileUrl);

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/imports/src/alias.mjs
import { ExternalExpr as ExternalExpr2 } from "@angular/compiler";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/imports/src/emitter.mjs
import { ExternalExpr, ExternalReference, WrappedNodeExpr } from "@angular/compiler";
import ts5 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/util/src/typescript.mjs
import ts3 from "typescript";
function identifierOfNode(decl) {
  if (decl.name !== void 0 && ts3.isIdentifier(decl.name)) {
    return decl.name;
  } else {
    return null;
  }
}
function isDeclaration(node) {
  return isValueDeclaration(node) || isTypeDeclaration(node);
}
function isValueDeclaration(node) {
  return ts3.isClassDeclaration(node) || ts3.isFunctionDeclaration(node) || ts3.isVariableDeclaration(node);
}
function isTypeDeclaration(node) {
  return ts3.isEnumDeclaration(node) || ts3.isTypeAliasDeclaration(node) || ts3.isInterfaceDeclaration(node);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/imports/src/find_export.mjs
import ts4 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/imports/src/emitter.mjs
var ImportFlags;
(function(ImportFlags2) {
  ImportFlags2[ImportFlags2["None"] = 0] = "None";
  ImportFlags2[ImportFlags2["ForceNewImport"] = 1] = "ForceNewImport";
  ImportFlags2[ImportFlags2["NoAliasing"] = 2] = "NoAliasing";
  ImportFlags2[ImportFlags2["AllowTypeImports"] = 4] = "AllowTypeImports";
})(ImportFlags || (ImportFlags = {}));

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/imports/src/core.mjs
var CORE_SUPPORTED_SYMBOLS = new Map([
  ["\u0275\u0275defineInjectable", "\u0275\u0275defineInjectable"],
  ["\u0275\u0275defineInjector", "\u0275\u0275defineInjector"],
  ["\u0275\u0275defineNgModule", "\u0275\u0275defineNgModule"],
  ["\u0275\u0275setNgModuleScope", "\u0275\u0275setNgModuleScope"],
  ["\u0275\u0275inject", "\u0275\u0275inject"],
  ["\u0275\u0275FactoryDeclaration", "\u0275\u0275FactoryDeclaration"],
  ["\u0275setClassMetadata", "setClassMetadata"],
  ["\u0275\u0275InjectableDeclaration", "\u0275\u0275InjectableDeclaration"],
  ["\u0275\u0275InjectorDeclaration", "\u0275\u0275InjectorDeclaration"],
  ["\u0275\u0275NgModuleDeclaration", "\u0275\u0275NgModuleDeclaration"],
  ["\u0275NgModuleFactory", "NgModuleFactory"],
  ["\u0275noSideEffects", "\u0275noSideEffects"]
]);

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/imports/src/default.mjs
import ts6 from "typescript";
var DefaultImportDeclaration = Symbol("DefaultImportDeclaration");

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/imports/src/references.mjs
var Reference = class {
  constructor(node, bestGuessOwningModule = null) {
    this.node = node;
    this.identifiers = [];
    this.synthetic = false;
    this._alias = null;
    this.bestGuessOwningModule = bestGuessOwningModule;
    const id = identifierOfNode(node);
    if (id !== null) {
      this.identifiers.push(id);
    }
  }
  get ownedByModuleGuess() {
    if (this.bestGuessOwningModule !== null) {
      return this.bestGuessOwningModule.specifier;
    } else {
      return null;
    }
  }
  get hasOwningModuleGuess() {
    return this.bestGuessOwningModule !== null;
  }
  get debugName() {
    const id = identifierOfNode(this.node);
    return id !== null ? id.text : null;
  }
  get alias() {
    return this._alias;
  }
  addIdentifier(identifier) {
    this.identifiers.push(identifier);
  }
  getIdentityIn(context) {
    return this.identifiers.find((id) => id.getSourceFile() === context) || null;
  }
  getIdentityInExpression(expr) {
    const sf = expr.getSourceFile();
    return this.identifiers.find((id) => {
      if (id.getSourceFile() !== sf) {
        return false;
      }
      return id.pos >= expr.pos && id.end <= expr.end;
    }) || null;
  }
  getOriginForDiagnostics(container, fallback = container) {
    const id = this.getIdentityInExpression(container);
    return id !== null ? id : fallback;
  }
  cloneWithAlias(alias) {
    const ref = new Reference(this.node, this.bestGuessOwningModule);
    ref.identifiers = [...this.identifiers];
    ref._alias = alias;
    return ref;
  }
  cloneWithNoIdentifiers() {
    const ref = new Reference(this.node, this.bestGuessOwningModule);
    ref._alias = this._alias;
    ref.identifiers = [];
    return ref;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/incremental/semantic_graph/src/api.mjs
import ts7 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/incremental/semantic_graph/src/graph.mjs
import { ExternalExpr as ExternalExpr3 } from "@angular/compiler";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/incremental/semantic_graph/src/type_parameters.mjs
import ts8 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/metadata/src/api.mjs
var MetaType;
(function(MetaType2) {
  MetaType2[MetaType2["Pipe"] = 0] = "Pipe";
  MetaType2[MetaType2["Directive"] = 1] = "Directive";
})(MetaType || (MetaType = {}));

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/metadata/src/dts.mjs
import ts14 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/reflection/src/host.mjs
import ts9 from "typescript";
function isDecoratorIdentifier(exp) {
  return ts9.isIdentifier(exp) || ts9.isPropertyAccessExpression(exp) && ts9.isIdentifier(exp.expression) && ts9.isIdentifier(exp.name);
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
function isConcreteDeclaration(decl) {
  return decl.kind === 0;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/reflection/src/type_to_value.mjs
import ts10 from "typescript";
function typeToValue(typeNode, checker) {
  if (typeNode === null) {
    return missingType();
  }
  if (!ts10.isTypeReferenceNode(typeNode)) {
    return unsupportedType(typeNode);
  }
  const symbols = resolveTypeSymbols(typeNode, checker);
  if (symbols === null) {
    return unknownReference(typeNode);
  }
  const { local, decl } = symbols;
  if (decl.valueDeclaration === void 0 || decl.flags & ts10.SymbolFlags.ConstEnum) {
    let typeOnlyDecl = null;
    if (decl.declarations !== void 0 && decl.declarations.length > 0) {
      typeOnlyDecl = decl.declarations[0];
    }
    return noValueDeclaration(typeNode, typeOnlyDecl);
  }
  const firstDecl = local.declarations && local.declarations[0];
  if (firstDecl !== void 0) {
    if (ts10.isImportClause(firstDecl) && firstDecl.name !== void 0) {
      if (firstDecl.isTypeOnly) {
        return typeOnlyImport(typeNode, firstDecl);
      }
      return {
        kind: 0,
        expression: firstDecl.name,
        defaultImportStatement: firstDecl.parent
      };
    } else if (ts10.isImportSpecifier(firstDecl)) {
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
    } else if (ts10.isNamespaceImport(firstDecl)) {
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
  if (ts10.isTypeReferenceNode(node)) {
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
  while (ts10.isQualifiedName(leftMost)) {
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
  if (typeRefSymbol.flags & ts10.SymbolFlags.Alias) {
    decl = checker.getAliasedSymbol(typeRefSymbol);
  }
  return { local, decl, symbolNames };
}
function entityNameToValue(node) {
  if (ts10.isQualifiedName(node)) {
    const left = entityNameToValue(node.left);
    return left !== null ? ts10.createPropertyAccess(left, node.right) : null;
  } else if (ts10.isIdentifier(node)) {
    return ts10.getMutableClone(node);
  } else {
    return null;
  }
}
function extractModuleName(node) {
  if (!ts10.isStringLiteral(node.moduleSpecifier)) {
    throw new Error("not a module specifier");
  }
  return node.moduleSpecifier.text;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/reflection/src/typescript.mjs
import ts12 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/reflection/src/util.mjs
import ts11 from "typescript";
function isNamedClassDeclaration(node) {
  return ts11.isClassDeclaration(node) && isIdentifier(node.name);
}
function isIdentifier(node) {
  return node !== void 0 && ts11.isIdentifier(node);
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
    const isDeclaration2 = tsClazz.getSourceFile().isDeclarationFile;
    const ctor = tsClazz.members.find((member) => ts12.isConstructorDeclaration(member) && (isDeclaration2 || member.body !== void 0));
    if (ctor === void 0) {
      return null;
    }
    return ctor.parameters.map((node) => {
      const name = parameterName(node.name);
      const decorators = this.getDecoratorsOfDeclaration(node);
      let originalTypeNode = node.type || null;
      let typeNode = originalTypeNode;
      if (typeNode && ts12.isUnionTypeNode(typeNode)) {
        let childTypeNodes = typeNode.types.filter((childTypeNode) => !(ts12.isLiteralTypeNode(childTypeNode) && childTypeNode.literal.kind === ts12.SyntaxKind.NullKeyword));
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
    } else if (ts12.isQualifiedName(id.parent) && id.parent.right === id) {
      return this.getImportOfNamespacedIdentifier(id, getQualifiedNameRoot(id.parent));
    } else if (ts12.isPropertyAccessExpression(id.parent) && id.parent.name === id) {
      return this.getImportOfNamespacedIdentifier(id, getFarLeftIdentifier(id.parent));
    } else {
      return null;
    }
  }
  getExportsOfModule(node) {
    if (!ts12.isSourceFile(node)) {
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
    if (!(ts12.isClassDeclaration(clazz) || ts12.isClassExpression(clazz)) || clazz.heritageClauses === void 0) {
      return null;
    }
    const extendsClause = clazz.heritageClauses.find((clause) => clause.token === ts12.SyntaxKind.ExtendsKeyword);
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
    if (!ts12.isFunctionDeclaration(node) && !ts12.isMethodDeclaration(node) && !ts12.isFunctionExpression(node)) {
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
    if (!ts12.isClassDeclaration(clazz)) {
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
    if (ts12.isVariableDeclaration(decl) && ts12.isVariableDeclarationList(decl.parent)) {
      topLevel = decl.parent.parent;
    }
    if (topLevel.modifiers !== void 0 && topLevel.modifiers.some((modifier) => modifier.kind === ts12.SyntaxKind.ExportKeyword)) {
      return true;
    }
    if (topLevel.parent === void 0 || !ts12.isSourceFile(topLevel.parent)) {
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
    if (!ts12.isStringLiteral(importDecl.moduleSpecifier)) {
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
    const namespaceDeclaration = ts12.isNamespaceImport(declaration) ? declaration : null;
    if (!namespaceDeclaration) {
      return null;
    }
    const importDeclaration = namespaceDeclaration.parent.parent;
    if (!ts12.isStringLiteral(importDeclaration.moduleSpecifier)) {
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
    if (valueDeclaration !== void 0 && ts12.isShorthandPropertyAssignment(valueDeclaration)) {
      const shorthandSymbol = this.checker.getShorthandAssignmentValueSymbol(valueDeclaration);
      if (shorthandSymbol === void 0) {
        return null;
      }
      return this.getDeclarationOfSymbol(shorthandSymbol, originalId);
    } else if (valueDeclaration !== void 0 && ts12.isExportSpecifier(valueDeclaration)) {
      const targetSymbol = this.checker.getExportSpecifierLocalTargetSymbol(valueDeclaration);
      if (targetSymbol === void 0) {
        return null;
      }
      return this.getDeclarationOfSymbol(targetSymbol, originalId);
    }
    const importInfo = originalId && this.getImportOfIdentifier(originalId);
    const viaModule = importInfo !== null && importInfo.from !== null && !importInfo.from.startsWith(".") ? importInfo.from : null;
    while (symbol.flags & ts12.SymbolFlags.Alias) {
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
    if (ts12.isCallExpression(decoratorExpr)) {
      args = Array.from(decoratorExpr.arguments);
      decoratorExpr = decoratorExpr.expression;
    }
    if (!isDecoratorIdentifier(decoratorExpr)) {
      return null;
    }
    const decoratorIdentifier = ts12.isIdentifier(decoratorExpr) ? decoratorExpr : decoratorExpr.name;
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
    if (ts12.isPropertyDeclaration(node)) {
      kind = ClassMemberKind.Property;
      value = node.initializer || null;
    } else if (ts12.isGetAccessorDeclaration(node)) {
      kind = ClassMemberKind.Getter;
    } else if (ts12.isSetAccessorDeclaration(node)) {
      kind = ClassMemberKind.Setter;
    } else if (ts12.isMethodDeclaration(node)) {
      kind = ClassMemberKind.Method;
    } else if (ts12.isConstructorDeclaration(node)) {
      kind = ClassMemberKind.Constructor;
    } else {
      return null;
    }
    if (ts12.isConstructorDeclaration(node)) {
      name = "constructor";
    } else if (ts12.isIdentifier(node.name)) {
      name = node.name.text;
      nameNode = node.name;
    } else if (ts12.isStringLiteral(node.name)) {
      name = node.name.text;
      nameNode = node.name;
    } else {
      return null;
    }
    const decorators = this.getDecoratorsOfDeclaration(node);
    const isStatic = node.modifiers !== void 0 && node.modifiers.some((mod) => mod.kind === ts12.SyntaxKind.StaticKeyword);
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
      if (exportedSymbol.flags & ts12.SymbolFlags.Alias) {
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
function reflectObjectLiteral(node) {
  const map = new Map();
  node.properties.forEach((prop) => {
    if (ts12.isPropertyAssignment(prop)) {
      const name = propertyNameToString(prop.name);
      if (name === null) {
        return;
      }
      map.set(name, prop.initializer);
    } else if (ts12.isShorthandPropertyAssignment(prop)) {
      map.set(prop.name.text, prop.name);
    } else {
      return;
    }
  });
  return map;
}
function castDeclarationToClassOrDie(declaration) {
  if (!ts12.isClassDeclaration(declaration)) {
    throw new Error(`Reflecting on a ${ts12.SyntaxKind[declaration.kind]} instead of a ClassDeclaration.`);
  }
  return declaration;
}
function parameterName(name) {
  if (ts12.isIdentifier(name)) {
    return name.text;
  } else {
    return null;
  }
}
function propertyNameToString(node) {
  if (ts12.isIdentifier(node) || ts12.isStringLiteral(node) || ts12.isNumericLiteral(node)) {
    return node.text;
  } else {
    return null;
  }
}
function getQualifiedNameRoot(qualifiedName) {
  while (ts12.isQualifiedName(qualifiedName.left)) {
    qualifiedName = qualifiedName.left;
  }
  return ts12.isIdentifier(qualifiedName.left) ? qualifiedName.left : null;
}
function getFarLeftIdentifier(propertyAccess) {
  while (ts12.isPropertyAccessExpression(propertyAccess.expression)) {
    propertyAccess = propertyAccess.expression;
  }
  return ts12.isIdentifier(propertyAccess.expression) ? propertyAccess.expression : null;
}
function getContainingImportDeclaration(node) {
  return ts12.isImportSpecifier(node) ? node.parent.parent.parent : ts12.isNamespaceImport(node) ? node.parent.parent : null;
}
function getExportedName(decl, originalId) {
  return ts12.isImportSpecifier(decl) ? (decl.propertyName !== void 0 ? decl.propertyName : decl.name).text : originalId.text;
}
var LocalExportedDeclarations = Symbol("LocalExportedDeclarations");

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/metadata/src/property_mapping.mjs
var ClassPropertyMapping = class {
  constructor(forwardMap) {
    this.forwardMap = forwardMap;
    this.reverseMap = reverseMapFromForwardMap(forwardMap);
  }
  static empty() {
    return new ClassPropertyMapping(new Map());
  }
  static fromMappedObject(obj) {
    const forwardMap = new Map();
    for (const classPropertyName of Object.keys(obj)) {
      const value = obj[classPropertyName];
      const bindingPropertyName = Array.isArray(value) ? value[0] : value;
      const inputOrOutput = { classPropertyName, bindingPropertyName };
      forwardMap.set(classPropertyName, inputOrOutput);
    }
    return new ClassPropertyMapping(forwardMap);
  }
  static merge(a, b) {
    const forwardMap = new Map(a.forwardMap.entries());
    for (const [classPropertyName, inputOrOutput] of b.forwardMap) {
      forwardMap.set(classPropertyName, inputOrOutput);
    }
    return new ClassPropertyMapping(forwardMap);
  }
  get classPropertyNames() {
    return Array.from(this.forwardMap.keys());
  }
  get propertyNames() {
    return Array.from(this.reverseMap.keys());
  }
  hasBindingPropertyName(propertyName) {
    return this.reverseMap.has(propertyName);
  }
  getByBindingPropertyName(propertyName) {
    return this.reverseMap.has(propertyName) ? this.reverseMap.get(propertyName) : null;
  }
  getByClassPropertyName(classPropertyName) {
    return this.forwardMap.has(classPropertyName) ? this.forwardMap.get(classPropertyName) : null;
  }
  toDirectMappedObject() {
    const obj = {};
    for (const [classPropertyName, inputOrOutput] of this.forwardMap) {
      obj[classPropertyName] = inputOrOutput.bindingPropertyName;
    }
    return obj;
  }
  toJointMappedObject() {
    const obj = {};
    for (const [classPropertyName, inputOrOutput] of this.forwardMap) {
      if (inputOrOutput.bindingPropertyName === classPropertyName) {
        obj[classPropertyName] = inputOrOutput.bindingPropertyName;
      } else {
        obj[classPropertyName] = [inputOrOutput.bindingPropertyName, classPropertyName];
      }
    }
    return obj;
  }
  *[Symbol.iterator]() {
    for (const [classPropertyName, inputOrOutput] of this.forwardMap.entries()) {
      yield [classPropertyName, inputOrOutput.bindingPropertyName];
    }
  }
};
function reverseMapFromForwardMap(forwardMap) {
  const reverseMap = new Map();
  for (const [_, inputOrOutput] of forwardMap) {
    if (!reverseMap.has(inputOrOutput.bindingPropertyName)) {
      reverseMap.set(inputOrOutput.bindingPropertyName, []);
    }
    reverseMap.get(inputOrOutput.bindingPropertyName).push(inputOrOutput);
  }
  return reverseMap;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/metadata/src/util.mjs
import ts13 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/partial_evaluator/src/diagnostics.mjs
import ts15 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/partial_evaluator/src/dynamic.mjs
var DynamicValue = class {
  constructor(node, reason, code) {
    this.node = node;
    this.reason = reason;
    this.code = code;
  }
  static fromDynamicInput(node, input) {
    return new DynamicValue(node, input, 0);
  }
  static fromDynamicString(node) {
    return new DynamicValue(node, void 0, 1);
  }
  static fromExternalReference(node, ref) {
    return new DynamicValue(node, ref, 2);
  }
  static fromUnsupportedSyntax(node) {
    return new DynamicValue(node, void 0, 3);
  }
  static fromUnknownIdentifier(node) {
    return new DynamicValue(node, void 0, 4);
  }
  static fromInvalidExpressionType(node, value) {
    return new DynamicValue(node, value, 5);
  }
  static fromComplexFunctionCall(node, fn) {
    return new DynamicValue(node, fn, 6);
  }
  static fromDynamicType(node) {
    return new DynamicValue(node, void 0, 7);
  }
  static fromUnknown(node) {
    return new DynamicValue(node, void 0, 8);
  }
  isFromDynamicInput() {
    return this.code === 0;
  }
  isFromDynamicString() {
    return this.code === 1;
  }
  isFromExternalReference() {
    return this.code === 2;
  }
  isFromUnsupportedSyntax() {
    return this.code === 3;
  }
  isFromUnknownIdentifier() {
    return this.code === 4;
  }
  isFromInvalidExpressionType() {
    return this.code === 5;
  }
  isFromComplexFunctionCall() {
    return this.code === 6;
  }
  isFromDynamicType() {
    return this.code === 7;
  }
  isFromUnknown() {
    return this.code === 8;
  }
  accept(visitor) {
    switch (this.code) {
      case 0:
        return visitor.visitDynamicInput(this);
      case 1:
        return visitor.visitDynamicString(this);
      case 2:
        return visitor.visitExternalReference(this);
      case 3:
        return visitor.visitUnsupportedSyntax(this);
      case 4:
        return visitor.visitUnknownIdentifier(this);
      case 5:
        return visitor.visitInvalidExpressionType(this);
      case 6:
        return visitor.visitComplexFunctionCall(this);
      case 7:
        return visitor.visitDynamicType(this);
      case 8:
        return visitor.visitUnknown(this);
    }
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/partial_evaluator/src/result.mjs
var ResolvedModule = class {
  constructor(exports, evaluate) {
    this.exports = exports;
    this.evaluate = evaluate;
  }
  getExport(name) {
    if (!this.exports.has(name)) {
      return void 0;
    }
    return this.evaluate(this.exports.get(name));
  }
  getExports() {
    const map = new Map();
    this.exports.forEach((decl, name) => {
      map.set(name, this.evaluate(decl));
    });
    return map;
  }
};
var EnumValue = class {
  constructor(enumRef, name, resolved) {
    this.enumRef = enumRef;
    this.name = name;
    this.resolved = resolved;
  }
};
var KnownFn = class {
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/partial_evaluator/src/interpreter.mjs
import ts16 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/partial_evaluator/src/builtin.mjs
var ArraySliceBuiltinFn = class extends KnownFn {
  constructor(lhs) {
    super();
    this.lhs = lhs;
  }
  evaluate(node, args) {
    if (args.length === 0) {
      return this.lhs;
    } else {
      return DynamicValue.fromUnknown(node);
    }
  }
};
var ArrayConcatBuiltinFn = class extends KnownFn {
  constructor(lhs) {
    super();
    this.lhs = lhs;
  }
  evaluate(node, args) {
    const result = [...this.lhs];
    for (const arg of args) {
      if (arg instanceof DynamicValue) {
        result.push(DynamicValue.fromDynamicInput(node, arg));
      } else if (Array.isArray(arg)) {
        result.push(...arg);
      } else {
        result.push(arg);
      }
    }
    return result;
  }
};
var ObjectAssignBuiltinFn = class extends KnownFn {
  evaluate(node, args) {
    if (args.length === 0) {
      return DynamicValue.fromUnsupportedSyntax(node);
    }
    for (const arg of args) {
      if (arg instanceof DynamicValue) {
        return DynamicValue.fromDynamicInput(node, arg);
      } else if (!(arg instanceof Map)) {
        return DynamicValue.fromUnsupportedSyntax(node);
      }
    }
    const [target, ...sources] = args;
    for (const source of sources) {
      source.forEach((value, key) => target.set(key, value));
    }
    return target;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/partial_evaluator/src/ts_helpers.mjs
var AssignHelperFn = class extends ObjectAssignBuiltinFn {
};
var SpreadHelperFn = class extends KnownFn {
  evaluate(node, args) {
    const result = [];
    for (const arg of args) {
      if (arg instanceof DynamicValue) {
        result.push(DynamicValue.fromDynamicInput(node, arg));
      } else if (Array.isArray(arg)) {
        result.push(...arg);
      } else {
        result.push(arg);
      }
    }
    return result;
  }
};
var SpreadArrayHelperFn = class extends KnownFn {
  evaluate(node, args) {
    if (args.length !== 2 && args.length !== 3) {
      return DynamicValue.fromUnknown(node);
    }
    const [to, from] = args;
    if (to instanceof DynamicValue) {
      return DynamicValue.fromDynamicInput(node, to);
    } else if (from instanceof DynamicValue) {
      return DynamicValue.fromDynamicInput(node, from);
    }
    if (!Array.isArray(to)) {
      return DynamicValue.fromInvalidExpressionType(node, to);
    } else if (!Array.isArray(from)) {
      return DynamicValue.fromInvalidExpressionType(node, from);
    }
    return to.concat(from);
  }
};
var ReadHelperFn = class extends KnownFn {
  evaluate(node, args) {
    if (args.length !== 1) {
      return DynamicValue.fromUnknown(node);
    }
    const [value] = args;
    if (value instanceof DynamicValue) {
      return DynamicValue.fromDynamicInput(node, value);
    }
    if (!Array.isArray(value)) {
      return DynamicValue.fromInvalidExpressionType(node, value);
    }
    return value;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/partial_evaluator/src/known_declaration.mjs
var jsGlobalObjectValue = new Map([["assign", new ObjectAssignBuiltinFn()]]);
var assignTsHelperFn = new AssignHelperFn();
var spreadTsHelperFn = new SpreadHelperFn();
var spreadArrayTsHelperFn = new SpreadArrayHelperFn();
var readTsHelperFn = new ReadHelperFn();
function resolveKnownDeclaration(decl) {
  switch (decl) {
    case KnownDeclaration.JsGlobalObject:
      return jsGlobalObjectValue;
    case KnownDeclaration.TsHelperAssign:
      return assignTsHelperFn;
    case KnownDeclaration.TsHelperSpread:
    case KnownDeclaration.TsHelperSpreadArrays:
      return spreadTsHelperFn;
    case KnownDeclaration.TsHelperSpreadArray:
      return spreadArrayTsHelperFn;
    case KnownDeclaration.TsHelperRead:
      return readTsHelperFn;
    default:
      throw new Error(`Cannot resolve known declaration. Received: ${KnownDeclaration[decl]}.`);
  }
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/partial_evaluator/src/interpreter.mjs
function literalBinaryOp(op) {
  return { op, literal: true };
}
function referenceBinaryOp(op) {
  return { op, literal: false };
}
var BINARY_OPERATORS = new Map([
  [ts16.SyntaxKind.PlusToken, literalBinaryOp((a, b) => a + b)],
  [ts16.SyntaxKind.MinusToken, literalBinaryOp((a, b) => a - b)],
  [ts16.SyntaxKind.AsteriskToken, literalBinaryOp((a, b) => a * b)],
  [ts16.SyntaxKind.SlashToken, literalBinaryOp((a, b) => a / b)],
  [ts16.SyntaxKind.PercentToken, literalBinaryOp((a, b) => a % b)],
  [ts16.SyntaxKind.AmpersandToken, literalBinaryOp((a, b) => a & b)],
  [ts16.SyntaxKind.BarToken, literalBinaryOp((a, b) => a | b)],
  [ts16.SyntaxKind.CaretToken, literalBinaryOp((a, b) => a ^ b)],
  [ts16.SyntaxKind.LessThanToken, literalBinaryOp((a, b) => a < b)],
  [ts16.SyntaxKind.LessThanEqualsToken, literalBinaryOp((a, b) => a <= b)],
  [ts16.SyntaxKind.GreaterThanToken, literalBinaryOp((a, b) => a > b)],
  [ts16.SyntaxKind.GreaterThanEqualsToken, literalBinaryOp((a, b) => a >= b)],
  [ts16.SyntaxKind.EqualsEqualsToken, literalBinaryOp((a, b) => a == b)],
  [ts16.SyntaxKind.EqualsEqualsEqualsToken, literalBinaryOp((a, b) => a === b)],
  [ts16.SyntaxKind.ExclamationEqualsToken, literalBinaryOp((a, b) => a != b)],
  [ts16.SyntaxKind.ExclamationEqualsEqualsToken, literalBinaryOp((a, b) => a !== b)],
  [ts16.SyntaxKind.LessThanLessThanToken, literalBinaryOp((a, b) => a << b)],
  [ts16.SyntaxKind.GreaterThanGreaterThanToken, literalBinaryOp((a, b) => a >> b)],
  [ts16.SyntaxKind.GreaterThanGreaterThanGreaterThanToken, literalBinaryOp((a, b) => a >>> b)],
  [ts16.SyntaxKind.AsteriskAsteriskToken, literalBinaryOp((a, b) => Math.pow(a, b))],
  [ts16.SyntaxKind.AmpersandAmpersandToken, referenceBinaryOp((a, b) => a && b)],
  [ts16.SyntaxKind.BarBarToken, referenceBinaryOp((a, b) => a || b)]
]);
var UNARY_OPERATORS = new Map([
  [ts16.SyntaxKind.TildeToken, (a) => ~a],
  [ts16.SyntaxKind.MinusToken, (a) => -a],
  [ts16.SyntaxKind.PlusToken, (a) => +a],
  [ts16.SyntaxKind.ExclamationToken, (a) => !a]
]);
var StaticInterpreter = class {
  constructor(host, checker, dependencyTracker) {
    this.host = host;
    this.checker = checker;
    this.dependencyTracker = dependencyTracker;
  }
  visit(node, context) {
    return this.visitExpression(node, context);
  }
  visitExpression(node, context) {
    let result;
    if (node.kind === ts16.SyntaxKind.TrueKeyword) {
      return true;
    } else if (node.kind === ts16.SyntaxKind.FalseKeyword) {
      return false;
    } else if (node.kind === ts16.SyntaxKind.NullKeyword) {
      return null;
    } else if (ts16.isStringLiteral(node)) {
      return node.text;
    } else if (ts16.isNoSubstitutionTemplateLiteral(node)) {
      return node.text;
    } else if (ts16.isTemplateExpression(node)) {
      result = this.visitTemplateExpression(node, context);
    } else if (ts16.isNumericLiteral(node)) {
      return parseFloat(node.text);
    } else if (ts16.isObjectLiteralExpression(node)) {
      result = this.visitObjectLiteralExpression(node, context);
    } else if (ts16.isIdentifier(node)) {
      result = this.visitIdentifier(node, context);
    } else if (ts16.isPropertyAccessExpression(node)) {
      result = this.visitPropertyAccessExpression(node, context);
    } else if (ts16.isCallExpression(node)) {
      result = this.visitCallExpression(node, context);
    } else if (ts16.isConditionalExpression(node)) {
      result = this.visitConditionalExpression(node, context);
    } else if (ts16.isPrefixUnaryExpression(node)) {
      result = this.visitPrefixUnaryExpression(node, context);
    } else if (ts16.isBinaryExpression(node)) {
      result = this.visitBinaryExpression(node, context);
    } else if (ts16.isArrayLiteralExpression(node)) {
      result = this.visitArrayLiteralExpression(node, context);
    } else if (ts16.isParenthesizedExpression(node)) {
      result = this.visitParenthesizedExpression(node, context);
    } else if (ts16.isElementAccessExpression(node)) {
      result = this.visitElementAccessExpression(node, context);
    } else if (ts16.isAsExpression(node)) {
      result = this.visitExpression(node.expression, context);
    } else if (ts16.isNonNullExpression(node)) {
      result = this.visitExpression(node.expression, context);
    } else if (this.host.isClass(node)) {
      result = this.visitDeclaration(node, context);
    } else {
      return DynamicValue.fromUnsupportedSyntax(node);
    }
    if (result instanceof DynamicValue && result.node !== node) {
      return DynamicValue.fromDynamicInput(node, result);
    }
    return result;
  }
  visitArrayLiteralExpression(node, context) {
    const array = [];
    for (let i = 0; i < node.elements.length; i++) {
      const element = node.elements[i];
      if (ts16.isSpreadElement(element)) {
        array.push(...this.visitSpreadElement(element, context));
      } else {
        array.push(this.visitExpression(element, context));
      }
    }
    return array;
  }
  visitObjectLiteralExpression(node, context) {
    const map = new Map();
    for (let i = 0; i < node.properties.length; i++) {
      const property = node.properties[i];
      if (ts16.isPropertyAssignment(property)) {
        const name = this.stringNameFromPropertyName(property.name, context);
        if (name === void 0) {
          return DynamicValue.fromDynamicInput(node, DynamicValue.fromDynamicString(property.name));
        }
        map.set(name, this.visitExpression(property.initializer, context));
      } else if (ts16.isShorthandPropertyAssignment(property)) {
        const symbol = this.checker.getShorthandAssignmentValueSymbol(property);
        if (symbol === void 0 || symbol.valueDeclaration === void 0) {
          map.set(property.name.text, DynamicValue.fromUnknown(property));
        } else {
          map.set(property.name.text, this.visitDeclaration(symbol.valueDeclaration, context));
        }
      } else if (ts16.isSpreadAssignment(property)) {
        const spread = this.visitExpression(property.expression, context);
        if (spread instanceof DynamicValue) {
          return DynamicValue.fromDynamicInput(node, spread);
        } else if (spread instanceof Map) {
          spread.forEach((value, key) => map.set(key, value));
        } else if (spread instanceof ResolvedModule) {
          spread.getExports().forEach((value, key) => map.set(key, value));
        } else {
          return DynamicValue.fromDynamicInput(node, DynamicValue.fromInvalidExpressionType(property, spread));
        }
      } else {
        return DynamicValue.fromUnknown(node);
      }
    }
    return map;
  }
  visitTemplateExpression(node, context) {
    const pieces = [node.head.text];
    for (let i = 0; i < node.templateSpans.length; i++) {
      const span = node.templateSpans[i];
      const value = literal(this.visit(span.expression, context), () => DynamicValue.fromDynamicString(span.expression));
      if (value instanceof DynamicValue) {
        return DynamicValue.fromDynamicInput(node, value);
      }
      pieces.push(`${value}`, span.literal.text);
    }
    return pieces.join("");
  }
  visitIdentifier(node, context) {
    const decl = this.host.getDeclarationOfIdentifier(node);
    if (decl === null) {
      if (node.originalKeywordKind === ts16.SyntaxKind.UndefinedKeyword) {
        return void 0;
      } else {
        if (this.dependencyTracker !== null && this.host.getImportOfIdentifier(node) !== null) {
          this.dependencyTracker.recordDependencyAnalysisFailure(context.originatingFile);
        }
        return DynamicValue.fromUnknownIdentifier(node);
      }
    }
    if (decl.known !== null) {
      return resolveKnownDeclaration(decl.known);
    } else if (isConcreteDeclaration(decl) && decl.identity !== null && decl.identity.kind === 0) {
      return this.getResolvedEnum(decl.node, decl.identity.enumMembers, context);
    }
    const declContext = __spreadValues(__spreadValues({}, context), joinModuleContext(context, node, decl));
    const result = this.visitAmbiguousDeclaration(decl, declContext);
    if (result instanceof Reference) {
      if (!result.synthetic) {
        result.addIdentifier(node);
      }
    } else if (result instanceof DynamicValue) {
      return DynamicValue.fromDynamicInput(node, result);
    }
    return result;
  }
  visitDeclaration(node, context) {
    if (this.dependencyTracker !== null) {
      this.dependencyTracker.addDependency(context.originatingFile, node.getSourceFile());
    }
    if (this.host.isClass(node)) {
      return this.getReference(node, context);
    } else if (ts16.isVariableDeclaration(node)) {
      return this.visitVariableDeclaration(node, context);
    } else if (ts16.isParameter(node) && context.scope.has(node)) {
      return context.scope.get(node);
    } else if (ts16.isExportAssignment(node)) {
      return this.visitExpression(node.expression, context);
    } else if (ts16.isEnumDeclaration(node)) {
      return this.visitEnumDeclaration(node, context);
    } else if (ts16.isSourceFile(node)) {
      return this.visitSourceFile(node, context);
    } else if (ts16.isBindingElement(node)) {
      return this.visitBindingElement(node, context);
    } else {
      return this.getReference(node, context);
    }
  }
  visitVariableDeclaration(node, context) {
    const value = this.host.getVariableValue(node);
    if (value !== null) {
      return this.visitExpression(value, context);
    } else if (isVariableDeclarationDeclared(node)) {
      if (node.type !== void 0) {
        const evaluatedType = this.visitType(node.type, context);
        if (!(evaluatedType instanceof DynamicValue)) {
          return evaluatedType;
        }
      }
      return this.getReference(node, context);
    } else {
      return void 0;
    }
  }
  visitEnumDeclaration(node, context) {
    const enumRef = this.getReference(node, context);
    const map = new Map();
    node.members.forEach((member) => {
      const name = this.stringNameFromPropertyName(member.name, context);
      if (name !== void 0) {
        const resolved = member.initializer && this.visit(member.initializer, context);
        map.set(name, new EnumValue(enumRef, name, resolved));
      }
    });
    return map;
  }
  visitElementAccessExpression(node, context) {
    const lhs = this.visitExpression(node.expression, context);
    if (lhs instanceof DynamicValue) {
      return DynamicValue.fromDynamicInput(node, lhs);
    }
    const rhs = this.visitExpression(node.argumentExpression, context);
    if (rhs instanceof DynamicValue) {
      return DynamicValue.fromDynamicInput(node, rhs);
    }
    if (typeof rhs !== "string" && typeof rhs !== "number") {
      return DynamicValue.fromInvalidExpressionType(node, rhs);
    }
    return this.accessHelper(node, lhs, rhs, context);
  }
  visitPropertyAccessExpression(node, context) {
    const lhs = this.visitExpression(node.expression, context);
    const rhs = node.name.text;
    if (lhs instanceof DynamicValue) {
      return DynamicValue.fromDynamicInput(node, lhs);
    }
    return this.accessHelper(node, lhs, rhs, context);
  }
  visitSourceFile(node, context) {
    const declarations = this.host.getExportsOfModule(node);
    if (declarations === null) {
      return DynamicValue.fromUnknown(node);
    }
    return new ResolvedModule(declarations, (decl) => {
      if (decl.known !== null) {
        return resolveKnownDeclaration(decl.known);
      }
      const declContext = __spreadValues(__spreadValues({}, context), joinModuleContext(context, node, decl));
      return this.visitAmbiguousDeclaration(decl, declContext);
    });
  }
  visitAmbiguousDeclaration(decl, declContext) {
    return decl.kind === 1 && decl.implementation !== void 0 && !isDeclaration(decl.implementation) ? this.visitExpression(decl.implementation, declContext) : this.visitDeclaration(decl.node, declContext);
  }
  accessHelper(node, lhs, rhs, context) {
    const strIndex = `${rhs}`;
    if (lhs instanceof Map) {
      if (lhs.has(strIndex)) {
        return lhs.get(strIndex);
      } else {
        return void 0;
      }
    } else if (lhs instanceof ResolvedModule) {
      return lhs.getExport(strIndex);
    } else if (Array.isArray(lhs)) {
      if (rhs === "length") {
        return lhs.length;
      } else if (rhs === "slice") {
        return new ArraySliceBuiltinFn(lhs);
      } else if (rhs === "concat") {
        return new ArrayConcatBuiltinFn(lhs);
      }
      if (typeof rhs !== "number" || !Number.isInteger(rhs)) {
        return DynamicValue.fromInvalidExpressionType(node, rhs);
      }
      return lhs[rhs];
    } else if (lhs instanceof Reference) {
      const ref = lhs.node;
      if (this.host.isClass(ref)) {
        const module2 = owningModule(context, lhs.bestGuessOwningModule);
        let value = void 0;
        const member = this.host.getMembersOfClass(ref).find((member2) => member2.isStatic && member2.name === strIndex);
        if (member !== void 0) {
          if (member.value !== null) {
            value = this.visitExpression(member.value, context);
          } else if (member.implementation !== null) {
            value = new Reference(member.implementation, module2);
          } else if (member.node) {
            value = new Reference(member.node, module2);
          }
        }
        return value;
      } else if (isDeclaration(ref)) {
        return DynamicValue.fromDynamicInput(node, DynamicValue.fromExternalReference(ref, lhs));
      }
    } else if (lhs instanceof DynamicValue) {
      return DynamicValue.fromDynamicInput(node, lhs);
    }
    return DynamicValue.fromUnknown(node);
  }
  visitCallExpression(node, context) {
    const lhs = this.visitExpression(node.expression, context);
    if (lhs instanceof DynamicValue) {
      return DynamicValue.fromDynamicInput(node, lhs);
    }
    if (lhs instanceof KnownFn) {
      return lhs.evaluate(node, this.evaluateFunctionArguments(node, context));
    }
    if (!(lhs instanceof Reference)) {
      return DynamicValue.fromInvalidExpressionType(node.expression, lhs);
    }
    const fn = this.host.getDefinitionOfFunction(lhs.node);
    if (fn === null) {
      return DynamicValue.fromInvalidExpressionType(node.expression, lhs);
    }
    if (!isFunctionOrMethodReference(lhs)) {
      return DynamicValue.fromInvalidExpressionType(node.expression, lhs);
    }
    if (fn.body === null) {
      let expr = null;
      if (context.foreignFunctionResolver) {
        expr = context.foreignFunctionResolver(lhs, node.arguments);
      }
      if (expr === null) {
        return DynamicValue.fromDynamicInput(node, DynamicValue.fromExternalReference(node.expression, lhs));
      }
      if (expr.getSourceFile() !== node.expression.getSourceFile() && lhs.bestGuessOwningModule !== null) {
        context = __spreadProps(__spreadValues({}, context), {
          absoluteModuleName: lhs.bestGuessOwningModule.specifier,
          resolutionContext: lhs.bestGuessOwningModule.resolutionContext
        });
      }
      return this.visitFfrExpression(expr, context);
    }
    let res = this.visitFunctionBody(node, fn, context);
    if (res instanceof DynamicValue && context.foreignFunctionResolver !== void 0) {
      const ffrExpr = context.foreignFunctionResolver(lhs, node.arguments);
      if (ffrExpr !== null) {
        const ffrRes = this.visitFfrExpression(ffrExpr, context);
        if (!(ffrRes instanceof DynamicValue)) {
          res = ffrRes;
        }
      }
    }
    return res;
  }
  visitFfrExpression(expr, context) {
    const res = this.visitExpression(expr, context);
    if (res instanceof Reference) {
      res.synthetic = true;
    }
    return res;
  }
  visitFunctionBody(node, fn, context) {
    if (fn.body === null) {
      return DynamicValue.fromUnknown(node);
    } else if (fn.body.length !== 1 || !ts16.isReturnStatement(fn.body[0])) {
      return DynamicValue.fromComplexFunctionCall(node, fn);
    }
    const ret = fn.body[0];
    const args = this.evaluateFunctionArguments(node, context);
    const newScope = new Map();
    const calleeContext = __spreadProps(__spreadValues({}, context), { scope: newScope });
    fn.parameters.forEach((param, index) => {
      let arg = args[index];
      if (param.node.dotDotDotToken !== void 0) {
        arg = args.slice(index);
      }
      if (arg === void 0 && param.initializer !== null) {
        arg = this.visitExpression(param.initializer, calleeContext);
      }
      newScope.set(param.node, arg);
    });
    return ret.expression !== void 0 ? this.visitExpression(ret.expression, calleeContext) : void 0;
  }
  visitConditionalExpression(node, context) {
    const condition = this.visitExpression(node.condition, context);
    if (condition instanceof DynamicValue) {
      return DynamicValue.fromDynamicInput(node, condition);
    }
    if (condition) {
      return this.visitExpression(node.whenTrue, context);
    } else {
      return this.visitExpression(node.whenFalse, context);
    }
  }
  visitPrefixUnaryExpression(node, context) {
    const operatorKind = node.operator;
    if (!UNARY_OPERATORS.has(operatorKind)) {
      return DynamicValue.fromUnsupportedSyntax(node);
    }
    const op = UNARY_OPERATORS.get(operatorKind);
    const value = this.visitExpression(node.operand, context);
    if (value instanceof DynamicValue) {
      return DynamicValue.fromDynamicInput(node, value);
    } else {
      return op(value);
    }
  }
  visitBinaryExpression(node, context) {
    const tokenKind = node.operatorToken.kind;
    if (!BINARY_OPERATORS.has(tokenKind)) {
      return DynamicValue.fromUnsupportedSyntax(node);
    }
    const opRecord = BINARY_OPERATORS.get(tokenKind);
    let lhs, rhs;
    if (opRecord.literal) {
      lhs = literal(this.visitExpression(node.left, context), (value) => DynamicValue.fromInvalidExpressionType(node.left, value));
      rhs = literal(this.visitExpression(node.right, context), (value) => DynamicValue.fromInvalidExpressionType(node.right, value));
    } else {
      lhs = this.visitExpression(node.left, context);
      rhs = this.visitExpression(node.right, context);
    }
    if (lhs instanceof DynamicValue) {
      return DynamicValue.fromDynamicInput(node, lhs);
    } else if (rhs instanceof DynamicValue) {
      return DynamicValue.fromDynamicInput(node, rhs);
    } else {
      return opRecord.op(lhs, rhs);
    }
  }
  visitParenthesizedExpression(node, context) {
    return this.visitExpression(node.expression, context);
  }
  evaluateFunctionArguments(node, context) {
    const args = [];
    for (const arg of node.arguments) {
      if (ts16.isSpreadElement(arg)) {
        args.push(...this.visitSpreadElement(arg, context));
      } else {
        args.push(this.visitExpression(arg, context));
      }
    }
    return args;
  }
  visitSpreadElement(node, context) {
    const spread = this.visitExpression(node.expression, context);
    if (spread instanceof DynamicValue) {
      return [DynamicValue.fromDynamicInput(node, spread)];
    } else if (!Array.isArray(spread)) {
      return [DynamicValue.fromInvalidExpressionType(node, spread)];
    } else {
      return spread;
    }
  }
  visitBindingElement(node, context) {
    const path = [];
    let closestDeclaration = node;
    while (ts16.isBindingElement(closestDeclaration) || ts16.isArrayBindingPattern(closestDeclaration) || ts16.isObjectBindingPattern(closestDeclaration)) {
      if (ts16.isBindingElement(closestDeclaration)) {
        path.unshift(closestDeclaration);
      }
      closestDeclaration = closestDeclaration.parent;
    }
    if (!ts16.isVariableDeclaration(closestDeclaration) || closestDeclaration.initializer === void 0) {
      return DynamicValue.fromUnknown(node);
    }
    let value = this.visit(closestDeclaration.initializer, context);
    for (const element of path) {
      let key;
      if (ts16.isArrayBindingPattern(element.parent)) {
        key = element.parent.elements.indexOf(element);
      } else {
        const name = element.propertyName || element.name;
        if (ts16.isIdentifier(name)) {
          key = name.text;
        } else {
          return DynamicValue.fromUnknown(element);
        }
      }
      value = this.accessHelper(element, value, key, context);
      if (value instanceof DynamicValue) {
        return value;
      }
    }
    return value;
  }
  stringNameFromPropertyName(node, context) {
    if (ts16.isIdentifier(node) || ts16.isStringLiteral(node) || ts16.isNumericLiteral(node)) {
      return node.text;
    } else if (ts16.isComputedPropertyName(node)) {
      const literal2 = this.visitExpression(node.expression, context);
      return typeof literal2 === "string" ? literal2 : void 0;
    } else {
      return void 0;
    }
  }
  getResolvedEnum(node, enumMembers, context) {
    const enumRef = this.getReference(node, context);
    const map = new Map();
    enumMembers.forEach((member) => {
      const name = this.stringNameFromPropertyName(member.name, context);
      if (name !== void 0) {
        const resolved = this.visit(member.initializer, context);
        map.set(name, new EnumValue(enumRef, name, resolved));
      }
    });
    return map;
  }
  getReference(node, context) {
    return new Reference(node, owningModule(context));
  }
  visitType(node, context) {
    if (ts16.isLiteralTypeNode(node)) {
      return this.visitExpression(node.literal, context);
    } else if (ts16.isTupleTypeNode(node)) {
      return this.visitTupleType(node, context);
    } else if (ts16.isNamedTupleMember(node)) {
      return this.visitType(node.type, context);
    }
    return DynamicValue.fromDynamicType(node);
  }
  visitTupleType(node, context) {
    const res = [];
    for (const elem of node.elements) {
      res.push(this.visitType(elem, context));
    }
    return res;
  }
};
function isFunctionOrMethodReference(ref) {
  return ts16.isFunctionDeclaration(ref.node) || ts16.isMethodDeclaration(ref.node) || ts16.isFunctionExpression(ref.node);
}
function literal(value, reject) {
  if (value instanceof EnumValue) {
    value = value.resolved;
  }
  if (value instanceof DynamicValue || value === null || value === void 0 || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return reject(value);
}
function isVariableDeclarationDeclared(node) {
  if (node.parent === void 0 || !ts16.isVariableDeclarationList(node.parent)) {
    return false;
  }
  const declList = node.parent;
  if (declList.parent === void 0 || !ts16.isVariableStatement(declList.parent)) {
    return false;
  }
  const varStmt = declList.parent;
  return varStmt.modifiers !== void 0 && varStmt.modifiers.some((mod) => mod.kind === ts16.SyntaxKind.DeclareKeyword);
}
var EMPTY = {};
function joinModuleContext(existing, node, decl) {
  if (decl.viaModule !== null && decl.viaModule !== existing.absoluteModuleName) {
    return {
      absoluteModuleName: decl.viaModule,
      resolutionContext: node.getSourceFile().fileName
    };
  } else {
    return EMPTY;
  }
}
function owningModule(context, override = null) {
  let specifier = context.absoluteModuleName;
  if (override !== null) {
    specifier = override.specifier;
  }
  if (specifier !== null) {
    return {
      specifier,
      resolutionContext: context.resolutionContext
    };
  } else {
    return null;
  }
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/partial_evaluator/src/interface.mjs
var PartialEvaluator = class {
  constructor(host, checker, dependencyTracker) {
    this.host = host;
    this.checker = checker;
    this.dependencyTracker = dependencyTracker;
  }
  evaluate(expr, foreignFunctionResolver) {
    const interpreter = new StaticInterpreter(this.host, this.checker, this.dependencyTracker);
    const sourceFile = expr.getSourceFile();
    return interpreter.visit(expr, {
      originatingFile: sourceFile,
      absoluteModuleName: null,
      resolutionContext: sourceFile.fileName,
      scope: new Map(),
      foreignFunctionResolver
    });
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/perf/src/api.mjs
var PerfPhase;
(function(PerfPhase2) {
  PerfPhase2[PerfPhase2["Unaccounted"] = 0] = "Unaccounted";
  PerfPhase2[PerfPhase2["Setup"] = 1] = "Setup";
  PerfPhase2[PerfPhase2["TypeScriptProgramCreate"] = 2] = "TypeScriptProgramCreate";
  PerfPhase2[PerfPhase2["Reconciliation"] = 3] = "Reconciliation";
  PerfPhase2[PerfPhase2["ResourceUpdate"] = 4] = "ResourceUpdate";
  PerfPhase2[PerfPhase2["TypeScriptDiagnostics"] = 5] = "TypeScriptDiagnostics";
  PerfPhase2[PerfPhase2["Analysis"] = 6] = "Analysis";
  PerfPhase2[PerfPhase2["Resolve"] = 7] = "Resolve";
  PerfPhase2[PerfPhase2["CycleDetection"] = 8] = "CycleDetection";
  PerfPhase2[PerfPhase2["TcbGeneration"] = 9] = "TcbGeneration";
  PerfPhase2[PerfPhase2["TcbUpdateProgram"] = 10] = "TcbUpdateProgram";
  PerfPhase2[PerfPhase2["TypeScriptEmit"] = 11] = "TypeScriptEmit";
  PerfPhase2[PerfPhase2["Compile"] = 12] = "Compile";
  PerfPhase2[PerfPhase2["TtcAutocompletion"] = 13] = "TtcAutocompletion";
  PerfPhase2[PerfPhase2["TtcDiagnostics"] = 14] = "TtcDiagnostics";
  PerfPhase2[PerfPhase2["TtcSymbol"] = 15] = "TtcSymbol";
  PerfPhase2[PerfPhase2["LsReferencesAndRenames"] = 16] = "LsReferencesAndRenames";
  PerfPhase2[PerfPhase2["LsQuickInfo"] = 17] = "LsQuickInfo";
  PerfPhase2[PerfPhase2["LsDefinition"] = 18] = "LsDefinition";
  PerfPhase2[PerfPhase2["LsCompletions"] = 19] = "LsCompletions";
  PerfPhase2[PerfPhase2["LsTcb"] = 20] = "LsTcb";
  PerfPhase2[PerfPhase2["LsDiagnostics"] = 21] = "LsDiagnostics";
  PerfPhase2[PerfPhase2["LsComponentLocations"] = 22] = "LsComponentLocations";
  PerfPhase2[PerfPhase2["LsSignatureHelp"] = 23] = "LsSignatureHelp";
  PerfPhase2[PerfPhase2["LAST"] = 24] = "LAST";
})(PerfPhase || (PerfPhase = {}));
var PerfEvent;
(function(PerfEvent2) {
  PerfEvent2[PerfEvent2["InputDtsFile"] = 0] = "InputDtsFile";
  PerfEvent2[PerfEvent2["InputTsFile"] = 1] = "InputTsFile";
  PerfEvent2[PerfEvent2["AnalyzeComponent"] = 2] = "AnalyzeComponent";
  PerfEvent2[PerfEvent2["AnalyzeDirective"] = 3] = "AnalyzeDirective";
  PerfEvent2[PerfEvent2["AnalyzeInjectable"] = 4] = "AnalyzeInjectable";
  PerfEvent2[PerfEvent2["AnalyzeNgModule"] = 5] = "AnalyzeNgModule";
  PerfEvent2[PerfEvent2["AnalyzePipe"] = 6] = "AnalyzePipe";
  PerfEvent2[PerfEvent2["TraitAnalyze"] = 7] = "TraitAnalyze";
  PerfEvent2[PerfEvent2["TraitReuseAnalysis"] = 8] = "TraitReuseAnalysis";
  PerfEvent2[PerfEvent2["SourceFilePhysicalChange"] = 9] = "SourceFilePhysicalChange";
  PerfEvent2[PerfEvent2["SourceFileLogicalChange"] = 10] = "SourceFileLogicalChange";
  PerfEvent2[PerfEvent2["SourceFileReuseAnalysis"] = 11] = "SourceFileReuseAnalysis";
  PerfEvent2[PerfEvent2["GenerateTcb"] = 12] = "GenerateTcb";
  PerfEvent2[PerfEvent2["SkipGenerateTcbNoInline"] = 13] = "SkipGenerateTcbNoInline";
  PerfEvent2[PerfEvent2["ReuseTypeCheckFile"] = 14] = "ReuseTypeCheckFile";
  PerfEvent2[PerfEvent2["UpdateTypeCheckProgram"] = 15] = "UpdateTypeCheckProgram";
  PerfEvent2[PerfEvent2["EmitSkipSourceFile"] = 16] = "EmitSkipSourceFile";
  PerfEvent2[PerfEvent2["EmitSourceFile"] = 17] = "EmitSourceFile";
  PerfEvent2[PerfEvent2["LAST"] = 18] = "LAST";
})(PerfEvent || (PerfEvent = {}));
var PerfCheckpoint;
(function(PerfCheckpoint2) {
  PerfCheckpoint2[PerfCheckpoint2["Initial"] = 0] = "Initial";
  PerfCheckpoint2[PerfCheckpoint2["TypeScriptProgramCreate"] = 1] = "TypeScriptProgramCreate";
  PerfCheckpoint2[PerfCheckpoint2["PreAnalysis"] = 2] = "PreAnalysis";
  PerfCheckpoint2[PerfCheckpoint2["Analysis"] = 3] = "Analysis";
  PerfCheckpoint2[PerfCheckpoint2["Resolve"] = 4] = "Resolve";
  PerfCheckpoint2[PerfCheckpoint2["TtcGeneration"] = 5] = "TtcGeneration";
  PerfCheckpoint2[PerfCheckpoint2["TtcUpdateProgram"] = 6] = "TtcUpdateProgram";
  PerfCheckpoint2[PerfCheckpoint2["PreEmit"] = 7] = "PreEmit";
  PerfCheckpoint2[PerfCheckpoint2["Emit"] = 8] = "Emit";
  PerfCheckpoint2[PerfCheckpoint2["LAST"] = 9] = "LAST";
})(PerfCheckpoint || (PerfCheckpoint = {}));

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/perf/src/noop.mjs
var NoopPerfRecorder = class {
  eventCount() {
  }
  memory() {
  }
  phase() {
    return PerfPhase.Unaccounted;
  }
  inPhase(phase, fn) {
    return fn();
  }
  reset() {
  }
};
var NOOP_PERF_RECORDER = new NoopPerfRecorder();

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/transform/src/api.mjs
var CompilationMode;
(function(CompilationMode2) {
  CompilationMode2[CompilationMode2["FULL"] = 0] = "FULL";
  CompilationMode2[CompilationMode2["PARTIAL"] = 1] = "PARTIAL";
})(CompilationMode || (CompilationMode = {}));
var HandlerPrecedence;
(function(HandlerPrecedence2) {
  HandlerPrecedence2[HandlerPrecedence2["PRIMARY"] = 0] = "PRIMARY";
  HandlerPrecedence2[HandlerPrecedence2["SHARED"] = 1] = "SHARED";
  HandlerPrecedence2[HandlerPrecedence2["WEAK"] = 2] = "WEAK";
})(HandlerPrecedence || (HandlerPrecedence = {}));
var HandlerFlags;
(function(HandlerFlags2) {
  HandlerFlags2[HandlerFlags2["NONE"] = 0] = "NONE";
  HandlerFlags2[HandlerFlags2["FULL_INHERITANCE"] = 1] = "FULL_INHERITANCE";
})(HandlerFlags || (HandlerFlags = {}));

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/transform/src/alias.mjs
import ts17 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/transform/src/compilation.mjs
import ts18 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/transform/src/trait.mjs
var TraitState;
(function(TraitState2) {
  TraitState2[TraitState2["Pending"] = 0] = "Pending";
  TraitState2[TraitState2["Analyzed"] = 1] = "Analyzed";
  TraitState2[TraitState2["Resolved"] = 2] = "Resolved";
  TraitState2[TraitState2["Skipped"] = 3] = "Skipped";
})(TraitState || (TraitState = {}));

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/transform/src/declaration.mjs
import ts23 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/translator/src/import_manager.mjs
import ts19 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/translator/src/translator.mjs
import {
  BinaryOperator,
  ConditionalExpr,
  StmtModifier,
  UnaryOperator
} from "@angular/compiler";
var UNARY_OPERATORS2 = new Map([
  [UnaryOperator.Minus, "-"],
  [UnaryOperator.Plus, "+"]
]);
var BINARY_OPERATORS2 = new Map([
  [BinaryOperator.And, "&&"],
  [BinaryOperator.Bigger, ">"],
  [BinaryOperator.BiggerEquals, ">="],
  [BinaryOperator.BitwiseAnd, "&"],
  [BinaryOperator.Divide, "/"],
  [BinaryOperator.Equals, "=="],
  [BinaryOperator.Identical, "==="],
  [BinaryOperator.Lower, "<"],
  [BinaryOperator.LowerEquals, "<="],
  [BinaryOperator.Minus, "-"],
  [BinaryOperator.Modulo, "%"],
  [BinaryOperator.Multiply, "*"],
  [BinaryOperator.NotEquals, "!="],
  [BinaryOperator.NotIdentical, "!=="],
  [BinaryOperator.Or, "||"],
  [BinaryOperator.Plus, "+"],
  [BinaryOperator.NullishCoalesce, "??"]
]);

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/translator/src/type_translator.mjs
import {
  BuiltinTypeName
} from "@angular/compiler";
import ts20 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/translator/src/typescript_ast_factory.mjs
import ts21 from "typescript";
var PureAnnotation;
(function(PureAnnotation2) {
  PureAnnotation2["CLOSURE"] = "* @pureOrBreakMyCode ";
  PureAnnotation2["TERSER"] = "@__PURE__";
})(PureAnnotation || (PureAnnotation = {}));
var UNARY_OPERATORS3 = {
  "+": ts21.SyntaxKind.PlusToken,
  "-": ts21.SyntaxKind.MinusToken,
  "!": ts21.SyntaxKind.ExclamationToken
};
var BINARY_OPERATORS3 = {
  "&&": ts21.SyntaxKind.AmpersandAmpersandToken,
  ">": ts21.SyntaxKind.GreaterThanToken,
  ">=": ts21.SyntaxKind.GreaterThanEqualsToken,
  "&": ts21.SyntaxKind.AmpersandToken,
  "/": ts21.SyntaxKind.SlashToken,
  "==": ts21.SyntaxKind.EqualsEqualsToken,
  "===": ts21.SyntaxKind.EqualsEqualsEqualsToken,
  "<": ts21.SyntaxKind.LessThanToken,
  "<=": ts21.SyntaxKind.LessThanEqualsToken,
  "-": ts21.SyntaxKind.MinusToken,
  "%": ts21.SyntaxKind.PercentToken,
  "*": ts21.SyntaxKind.AsteriskToken,
  "!=": ts21.SyntaxKind.ExclamationEqualsToken,
  "!==": ts21.SyntaxKind.ExclamationEqualsEqualsToken,
  "||": ts21.SyntaxKind.BarBarToken,
  "+": ts21.SyntaxKind.PlusToken,
  "??": ts21.SyntaxKind.QuestionQuestionToken
};
var VAR_TYPES = {
  "const": ts21.NodeFlags.Const,
  "let": ts21.NodeFlags.Let,
  "var": ts21.NodeFlags.None
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/transform/src/utils.mjs
import ts22 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/transform/src/transform.mjs
import { ConstantPool } from "@angular/compiler";
import ts25 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/util/src/visitor.mjs
import ts24 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/transform/src/transform.mjs
var NO_DECORATORS = new Set();

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/diagnostics.mjs
import ts27 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/util.mjs
import { ExternalExpr as ExternalExpr4, LiteralExpr, ParseLocation, ParseSourceFile, ParseSourceSpan, ReadPropExpr, WrappedNodeExpr as WrappedNodeExpr2 } from "@angular/compiler";
import ts26 from "typescript";
function isAngularCoreReference(reference, symbolName) {
  return reference.ownedByModuleGuess === "@angular/core" && reference.debugName === symbolName;
}
function unwrapExpression(node) {
  while (ts26.isAsExpression(node) || ts26.isParenthesizedExpression(node)) {
    node = node.expression;
  }
  return node;
}
function expandForwardRef(arg) {
  arg = unwrapExpression(arg);
  if (!ts26.isArrowFunction(arg) && !ts26.isFunctionExpression(arg)) {
    return null;
  }
  const body = arg.body;
  if (ts26.isBlock(body)) {
    if (body.statements.length !== 1) {
      return null;
    }
    const stmt = body.statements[0];
    if (!ts26.isReturnStatement(stmt) || stmt.expression === void 0) {
      return null;
    }
    return stmt.expression;
  } else {
    return body;
  }
}
function forwardRefResolver(ref, args) {
  if (!isAngularCoreReference(ref, "forwardRef") || args.length !== 1) {
    return null;
  }
  return expandForwardRef(args[0]);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/directive.mjs
import { compileClassMetadata, compileDeclareClassMetadata, compileDeclareDirectiveFromMetadata, compileDirectiveFromMetadata, createMayBeForwardRefExpression, emitDistinctChangesOnlyDefaultValue, ExternalExpr as ExternalExpr5, FactoryTarget, getSafePropertyAccessString, makeBindingParser, parseHostBindings, verifyHostBindings, WrappedNodeExpr as WrappedNodeExpr4 } from "@angular/compiler";
import ts29 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/factory.mjs
import { compileDeclareFactoryFunction, compileFactoryFunction } from "@angular/compiler";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/metadata.mjs
import { FunctionExpr, LiteralArrayExpr, LiteralExpr as LiteralExpr2, literalMap, ReturnStatement, WrappedNodeExpr as WrappedNodeExpr3 } from "@angular/compiler";
import ts28 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/directive.mjs
var LIFECYCLE_HOOKS = new Set([
  "ngOnChanges",
  "ngOnInit",
  "ngOnDestroy",
  "ngDoCheck",
  "ngAfterViewInit",
  "ngAfterViewChecked",
  "ngAfterContentInit",
  "ngAfterContentChecked"
]);
var QUERY_TYPES = new Set([
  "ContentChild",
  "ContentChildren",
  "ViewChild",
  "ViewChildren"
]);

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/ng_module.mjs
import { compileClassMetadata as compileClassMetadata2, compileDeclareClassMetadata as compileDeclareClassMetadata2, compileDeclareInjectorFromMetadata, compileDeclareNgModuleFromMetadata, compileInjector, compileNgModule, CUSTOM_ELEMENTS_SCHEMA, ExternalExpr as ExternalExpr6, FactoryTarget as FactoryTarget2, InvokeFunctionExpr, LiteralArrayExpr as LiteralArrayExpr2, NO_ERRORS_SCHEMA, R3Identifiers, WrappedNodeExpr as WrappedNodeExpr5 } from "@angular/compiler";
import ts30 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/component.mjs
var EMPTY_MAP = new Map();

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/injectable.mjs
import { compileClassMetadata as compileClassMetadata4, compileDeclareClassMetadata as compileDeclareClassMetadata4, compileDeclareInjectableFromMetadata, compileInjectable, createMayBeForwardRefExpression as createMayBeForwardRefExpression2, FactoryTarget as FactoryTarget4, LiteralExpr as LiteralExpr3, WrappedNodeExpr as WrappedNodeExpr7 } from "@angular/compiler";
import ts32 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/pipe.mjs
import { compileClassMetadata as compileClassMetadata5, compileDeclareClassMetadata as compileDeclareClassMetadata5, compileDeclarePipeFromMetadata, compilePipeFromMetadata, FactoryTarget as FactoryTarget5, WrappedNodeExpr as WrappedNodeExpr8 } from "@angular/compiler";
import ts33 from "typescript";
export {
  DynamicValue,
  PartialEvaluator,
  Reference,
  StaticInterpreter,
  TypeScriptReflectionHost,
  forwardRefResolver,
  reflectObjectLiteral
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
//# sourceMappingURL=migrations.js.map
