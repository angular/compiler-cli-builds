
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
      const __ESM_IMPORT_META_URL__ = import.meta.url;
    
import {
  LogicalProjectPath,
  absoluteFrom,
  absoluteFromSourceFile,
  dirname,
  getFileSystem,
  relative,
  resolve,
  stripExtension,
  toRelativeImport
} from "./chunk-EP5JHXG2.js";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/util/src/typescript.mjs
import ts from "typescript";
var TS = /\.tsx?$/i;
var D_TS = /\.d\.ts$/i;
var PARSED_TS_VERSION = parseFloat(ts.versionMajorMinor);
function isSymbolWithValueDeclaration(symbol) {
  return symbol != null && symbol.valueDeclaration !== void 0 && symbol.declarations !== void 0;
}
function isDtsPath(filePath) {
  return D_TS.test(filePath);
}
function isNonDeclarationTsPath(filePath) {
  return TS.test(filePath) && !D_TS.test(filePath);
}
function isFromDtsFile(node) {
  let sf = node.getSourceFile();
  if (sf === void 0) {
    sf = ts.getOriginalNode(node).getSourceFile();
  }
  return sf !== void 0 && sf.isDeclarationFile;
}
function nodeNameForError(node) {
  if (node.name !== void 0 && ts.isIdentifier(node.name)) {
    return node.name.text;
  } else {
    const kind = ts.SyntaxKind[node.kind];
    const { line, character } = ts.getLineAndCharacterOfPosition(node.getSourceFile(), node.getStart());
    return `${kind}@${line}:${character}`;
  }
}
function getSourceFile(node) {
  const directSf = node.getSourceFile();
  return directSf !== void 0 ? directSf : ts.getOriginalNode(node).getSourceFile();
}
function getSourceFileOrNull(program, fileName) {
  return program.getSourceFile(fileName) || null;
}
function getTokenAtPosition(sf, pos) {
  return ts.getTokenAtPosition(sf, pos);
}
function identifierOfNode(decl) {
  if (decl.name !== void 0 && ts.isIdentifier(decl.name)) {
    return decl.name;
  } else {
    return null;
  }
}
function isDeclaration(node) {
  return isValueDeclaration(node) || isTypeDeclaration(node);
}
function isValueDeclaration(node) {
  return ts.isClassDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node);
}
function isTypeDeclaration(node) {
  return ts.isEnumDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node);
}
function isNamedDeclaration(node) {
  const namedNode = node;
  return namedNode.name !== void 0 && ts.isIdentifier(namedNode.name);
}
function getRootDirs(host, options) {
  const rootDirs = [];
  const cwd = host.getCurrentDirectory();
  const fs = getFileSystem();
  if (options.rootDirs !== void 0) {
    rootDirs.push(...options.rootDirs);
  } else if (options.rootDir !== void 0) {
    rootDirs.push(options.rootDir);
  } else {
    rootDirs.push(cwd);
  }
  return rootDirs.map((rootDir) => fs.resolve(cwd, host.getCanonicalFileName(rootDir)));
}
function nodeDebugInfo(node) {
  const sf = getSourceFile(node);
  const { line, character } = ts.getLineAndCharacterOfPosition(sf, node.pos);
  return `[${sf.fileName}: ${ts.SyntaxKind[node.kind]} @ ${line}:${character}]`;
}
function resolveModuleName(moduleName, containingFile, compilerOptions, compilerHost, moduleResolutionCache) {
  if (compilerHost.resolveModuleNames) {
    return compilerHost.resolveModuleNames([moduleName], containingFile, void 0, void 0, compilerOptions)[0];
  } else {
    return ts.resolveModuleName(moduleName, containingFile, compilerOptions, compilerHost, moduleResolutionCache !== null ? moduleResolutionCache : void 0).resolvedModule;
  }
}
function isAssignment(node) {
  return ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken;
}
function toUnredirectedSourceFile(sf) {
  const redirectInfo = sf.redirectInfo;
  if (redirectInfo === void 0) {
    return sf;
  }
  return redirectInfo.unredirected;
}
function createExportSpecifier(propertyName, name, isTypeOnly = false) {
  return PARSED_TS_VERSION > 4.4 ? ts.createExportSpecifier(isTypeOnly, propertyName, name) : ts.createExportSpecifier(propertyName, name);
}

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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/imports/src/alias.mjs
import { ExternalExpr as ExternalExpr2 } from "@angular/compiler";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/imports/src/emitter.mjs
import { ExternalExpr, ExternalReference, WrappedNodeExpr } from "@angular/compiler";
import ts3 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/imports/src/find_export.mjs
import ts2 from "typescript";
function findExportedNameOfNode(target, file, reflector) {
  const exports = reflector.getExportsOfModule(file);
  if (exports === null) {
    return null;
  }
  const declaredName = isNamedDeclaration(target) ? target.name.text : null;
  let foundExportName = null;
  for (const [exportName, declaration] of exports) {
    if (declaration.node !== target) {
      continue;
    }
    if (exportName === declaredName) {
      return exportName;
    }
    foundExportName = exportName;
  }
  if (foundExportName === null) {
    throw new Error(`Failed to find exported name of node (${target.getText()}) in '${file.fileName}'.`);
  }
  return foundExportName;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/imports/src/emitter.mjs
var ImportFlags;
(function(ImportFlags2) {
  ImportFlags2[ImportFlags2["None"] = 0] = "None";
  ImportFlags2[ImportFlags2["ForceNewImport"] = 1] = "ForceNewImport";
  ImportFlags2[ImportFlags2["NoAliasing"] = 2] = "NoAliasing";
  ImportFlags2[ImportFlags2["AllowTypeImports"] = 4] = "AllowTypeImports";
})(ImportFlags || (ImportFlags = {}));
var ReferenceEmitter = class {
  constructor(strategies) {
    this.strategies = strategies;
  }
  emit(ref, context, importFlags = ImportFlags.None) {
    for (const strategy of this.strategies) {
      const emitted = strategy.emit(ref, context, importFlags);
      if (emitted !== null) {
        return emitted;
      }
    }
    throw new Error(`Unable to write a reference to ${nodeNameForError(ref.node)} in ${ref.node.getSourceFile().fileName} from ${context.fileName}`);
  }
};
var LocalIdentifierStrategy = class {
  emit(ref, context, importFlags) {
    const refSf = getSourceFile(ref.node);
    if (importFlags & ImportFlags.ForceNewImport && refSf !== context) {
      return null;
    }
    if (!isDeclaration(ref.node) && refSf === context) {
      return {
        expression: new WrappedNodeExpr(ref.node),
        importedFile: null
      };
    }
    const identifier = ref.getIdentityIn(context);
    if (identifier !== null) {
      return {
        expression: new WrappedNodeExpr(identifier),
        importedFile: null
      };
    } else {
      return null;
    }
  }
};
var AbsoluteModuleStrategy = class {
  constructor(program, checker, moduleResolver, reflectionHost) {
    this.program = program;
    this.checker = checker;
    this.moduleResolver = moduleResolver;
    this.reflectionHost = reflectionHost;
    this.moduleExportsCache = new Map();
  }
  emit(ref, context, importFlags) {
    if (ref.bestGuessOwningModule === null) {
      return null;
    } else if (!isDeclaration(ref.node)) {
      throw new Error(`Debug assert: unable to import a Reference to non-declaration of type ${ts3.SyntaxKind[ref.node.kind]}.`);
    } else if ((importFlags & ImportFlags.AllowTypeImports) === 0 && isTypeDeclaration(ref.node)) {
      throw new Error(`Importing a type-only declaration of type ${ts3.SyntaxKind[ref.node.kind]} in a value position is not allowed.`);
    }
    const { specifier, resolutionContext } = ref.bestGuessOwningModule;
    const exports = this.getExportsOfModule(specifier, resolutionContext);
    if (exports === null || !exports.exportMap.has(ref.node)) {
      throw new Error(`Symbol ${ref.debugName} declared in ${getSourceFile(ref.node).fileName} is not exported from ${specifier} (import into ${context.fileName})`);
    }
    const symbolName = exports.exportMap.get(ref.node);
    return {
      expression: new ExternalExpr(new ExternalReference(specifier, symbolName)),
      importedFile: exports.module
    };
  }
  getExportsOfModule(moduleName, fromFile) {
    if (!this.moduleExportsCache.has(moduleName)) {
      this.moduleExportsCache.set(moduleName, this.enumerateExportsOfModule(moduleName, fromFile));
    }
    return this.moduleExportsCache.get(moduleName);
  }
  enumerateExportsOfModule(specifier, fromFile) {
    const entryPointFile = this.moduleResolver.resolveModule(specifier, fromFile);
    if (entryPointFile === null) {
      return null;
    }
    const exports = this.reflectionHost.getExportsOfModule(entryPointFile);
    if (exports === null) {
      return null;
    }
    const exportMap = new Map();
    for (const [name, declaration] of exports) {
      if (exportMap.has(declaration.node)) {
        const existingExport = exportMap.get(declaration.node);
        if (isNamedDeclaration(declaration.node) && declaration.node.name.text === existingExport) {
          continue;
        }
      }
      exportMap.set(declaration.node, name);
    }
    return { module: entryPointFile, exportMap };
  }
};
var LogicalProjectStrategy = class {
  constructor(reflector, logicalFs) {
    this.reflector = reflector;
    this.logicalFs = logicalFs;
  }
  emit(ref, context) {
    const destSf = getSourceFile(ref.node);
    const destPath = this.logicalFs.logicalPathOfSf(destSf);
    if (destPath === null) {
      return null;
    }
    const originPath = this.logicalFs.logicalPathOfSf(context);
    if (originPath === null) {
      throw new Error(`Debug assert: attempt to import from ${context.fileName} but it's outside the program?`);
    }
    if (destPath === originPath) {
      return null;
    }
    const name = findExportedNameOfNode(ref.node, destSf, this.reflector);
    if (name === null) {
      return null;
    }
    const moduleName = LogicalProjectPath.relativePathBetween(originPath, destPath);
    return {
      expression: new ExternalExpr({ moduleName, name }),
      importedFile: destSf
    };
  }
};
var RelativePathStrategy = class {
  constructor(reflector) {
    this.reflector = reflector;
  }
  emit(ref, context) {
    const destSf = getSourceFile(ref.node);
    const relativePath = relative(dirname(absoluteFromSourceFile(context)), absoluteFromSourceFile(destSf));
    const moduleName = toRelativeImport(stripExtension(relativePath));
    const name = findExportedNameOfNode(ref.node, destSf, this.reflector);
    return { expression: new ExternalExpr({ moduleName, name }), importedFile: destSf };
  }
};
var UnifiedModulesStrategy = class {
  constructor(reflector, unifiedModulesHost) {
    this.reflector = reflector;
    this.unifiedModulesHost = unifiedModulesHost;
  }
  emit(ref, context) {
    const destSf = getSourceFile(ref.node);
    const name = findExportedNameOfNode(ref.node, destSf, this.reflector);
    if (name === null) {
      return null;
    }
    const moduleName = this.unifiedModulesHost.fileNameToModuleName(destSf.fileName, context.fileName);
    return {
      expression: new ExternalExpr({ moduleName, name }),
      importedFile: destSf
    };
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/imports/src/alias.mjs
var CHARS_TO_ESCAPE = /[^a-zA-Z0-9/_]/g;
var UnifiedModulesAliasingHost = class {
  constructor(unifiedModulesHost) {
    this.unifiedModulesHost = unifiedModulesHost;
    this.aliasExportsInDts = false;
  }
  maybeAliasSymbolAs(ref, context, ngModuleName, isReExport) {
    if (!isReExport) {
      return null;
    }
    return this.aliasName(ref.node, context);
  }
  getAliasIn(decl, via, isReExport) {
    if (!isReExport) {
      return null;
    }
    const moduleName = this.unifiedModulesHost.fileNameToModuleName(via.fileName, via.fileName);
    return new ExternalExpr2({ moduleName, name: this.aliasName(decl, via) });
  }
  aliasName(decl, context) {
    const declModule = this.unifiedModulesHost.fileNameToModuleName(decl.getSourceFile().fileName, context.fileName);
    const replaced = declModule.replace(CHARS_TO_ESCAPE, "_").replace(/\//g, "$");
    return "\u0275ng$" + replaced + "$$" + decl.name.text;
  }
};
var PrivateExportAliasingHost = class {
  constructor(host) {
    this.host = host;
    this.aliasExportsInDts = true;
  }
  maybeAliasSymbolAs(ref, context, ngModuleName) {
    if (ref.hasOwningModuleGuess) {
      return null;
    }
    const exports = this.host.getExportsOfModule(context);
    if (exports === null) {
      throw new Error(`Could not determine the exports of: ${context.fileName}`);
    }
    let found = false;
    exports.forEach((value) => {
      if (value.node === ref.node) {
        found = true;
      }
    });
    if (found) {
      return null;
    }
    return `\u0275ngExport\u0275${ngModuleName}\u0275${ref.node.name.text}`;
  }
  getAliasIn() {
    return null;
  }
};
var AliasStrategy = class {
  emit(ref, context, importMode) {
    if (importMode & ImportFlags.NoAliasing || ref.alias === null) {
      return null;
    }
    return { expression: ref.alias, importedFile: "unknown" };
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/util/src/path.mjs
function relativePathBetween(from, to) {
  const relativePath = stripExtension(relative(dirname(resolve(from)), resolve(to)));
  return relativePath !== "" ? toRelativeImport(relativePath) : null;
}
function normalizeSeparators(path) {
  return path.replace(/\\/g, "/");
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/imports/src/core.mjs
var NoopImportRewriter = class {
  shouldImportSymbol(symbol, specifier) {
    return true;
  }
  rewriteSymbol(symbol, specifier) {
    return symbol;
  }
  rewriteSpecifier(specifier, inContextOfFile) {
    return specifier;
  }
};
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
var CORE_MODULE = "@angular/core";
var R3SymbolsImportRewriter = class {
  constructor(r3SymbolsPath) {
    this.r3SymbolsPath = r3SymbolsPath;
  }
  shouldImportSymbol(symbol, specifier) {
    return true;
  }
  rewriteSymbol(symbol, specifier) {
    if (specifier !== CORE_MODULE) {
      return symbol;
    }
    return validateAndRewriteCoreSymbol(symbol);
  }
  rewriteSpecifier(specifier, inContextOfFile) {
    if (specifier !== CORE_MODULE) {
      return specifier;
    }
    const relativePathToR3Symbols = relativePathBetween(inContextOfFile, this.r3SymbolsPath);
    if (relativePathToR3Symbols === null) {
      throw new Error(`Failed to rewrite import inside ${CORE_MODULE}: ${inContextOfFile} -> ${this.r3SymbolsPath}`);
    }
    return relativePathToR3Symbols;
  }
};
function validateAndRewriteCoreSymbol(name) {
  if (!CORE_SUPPORTED_SYMBOLS.has(name)) {
    throw new Error(`Importing unexpected symbol ${name} while compiling ${CORE_MODULE}`);
  }
  return CORE_SUPPORTED_SYMBOLS.get(name);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/imports/src/default.mjs
import ts4 from "typescript";
var DefaultImportDeclaration = Symbol("DefaultImportDeclaration");
function attachDefaultImportDeclaration(expr, importDecl) {
  expr[DefaultImportDeclaration] = importDecl;
}
function getDefaultImportDeclaration(expr) {
  var _a;
  return (_a = expr[DefaultImportDeclaration]) != null ? _a : null;
}
var DefaultImportTracker = class {
  constructor() {
    this.sourceFileToUsedImports = new Map();
  }
  recordUsedImport(importDecl) {
    const sf = getSourceFile(importDecl);
    if (!this.sourceFileToUsedImports.has(sf)) {
      this.sourceFileToUsedImports.set(sf, new Set());
    }
    this.sourceFileToUsedImports.get(sf).add(importDecl);
  }
  importPreservingTransformer() {
    return (context) => {
      return (sf) => {
        return this.transformSourceFile(sf);
      };
    };
  }
  transformSourceFile(sf) {
    const originalSf = ts4.getOriginalNode(sf);
    if (!this.sourceFileToUsedImports.has(originalSf)) {
      return sf;
    }
    const importsToPreserve = this.sourceFileToUsedImports.get(originalSf);
    const statements = sf.statements.map((stmt) => {
      if (ts4.isImportDeclaration(stmt) && importsToPreserve.has(stmt)) {
        stmt = ts4.getMutableClone(stmt);
      }
      return stmt;
    });
    this.sourceFileToUsedImports.delete(originalSf);
    return ts4.updateSourceFileNode(sf, statements);
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/imports/src/resolver.mjs
var ModuleResolver = class {
  constructor(program, compilerOptions, host, moduleResolutionCache) {
    this.program = program;
    this.compilerOptions = compilerOptions;
    this.host = host;
    this.moduleResolutionCache = moduleResolutionCache;
  }
  resolveModule(moduleName, containingFile) {
    const resolved = resolveModuleName(moduleName, containingFile, this.compilerOptions, this.host, this.moduleResolutionCache);
    if (resolved === void 0) {
      return null;
    }
    return getSourceFileOrNull(this.program, absoluteFrom(resolved.resolvedFileName));
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/translator/src/context.mjs
var Context = class {
  constructor(isStatement) {
    this.isStatement = isStatement;
  }
  get withExpressionMode() {
    return this.isStatement ? new Context(false) : this;
  }
  get withStatementMode() {
    return !this.isStatement ? new Context(true) : this;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/translator/src/translator.mjs
import {
  BinaryOperator,
  ConditionalExpr,
  StmtModifier,
  UnaryOperator
} from "@angular/compiler";
var UNARY_OPERATORS = new Map([
  [UnaryOperator.Minus, "-"],
  [UnaryOperator.Plus, "+"]
]);
var BINARY_OPERATORS = new Map([
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
var ExpressionTranslatorVisitor = class {
  constructor(factory, imports, options) {
    this.factory = factory;
    this.imports = imports;
    this.downlevelTaggedTemplates = options.downlevelTaggedTemplates === true;
    this.downlevelVariableDeclarations = options.downlevelVariableDeclarations === true;
    this.recordWrappedNode = options.recordWrappedNode || (() => {
    });
  }
  visitDeclareVarStmt(stmt, context) {
    var _a;
    const varType = this.downlevelVariableDeclarations ? "var" : stmt.hasModifier(StmtModifier.Final) ? "const" : "let";
    return this.attachComments(this.factory.createVariableDeclaration(stmt.name, (_a = stmt.value) == null ? void 0 : _a.visitExpression(this, context.withExpressionMode), varType), stmt.leadingComments);
  }
  visitDeclareFunctionStmt(stmt, context) {
    return this.attachComments(this.factory.createFunctionDeclaration(stmt.name, stmt.params.map((param) => param.name), this.factory.createBlock(this.visitStatements(stmt.statements, context.withStatementMode))), stmt.leadingComments);
  }
  visitExpressionStmt(stmt, context) {
    return this.attachComments(this.factory.createExpressionStatement(stmt.expr.visitExpression(this, context.withStatementMode)), stmt.leadingComments);
  }
  visitReturnStmt(stmt, context) {
    return this.attachComments(this.factory.createReturnStatement(stmt.value.visitExpression(this, context.withExpressionMode)), stmt.leadingComments);
  }
  visitDeclareClassStmt(_stmt, _context) {
    throw new Error("Method not implemented.");
  }
  visitIfStmt(stmt, context) {
    return this.attachComments(this.factory.createIfStatement(stmt.condition.visitExpression(this, context), this.factory.createBlock(this.visitStatements(stmt.trueCase, context.withStatementMode)), stmt.falseCase.length > 0 ? this.factory.createBlock(this.visitStatements(stmt.falseCase, context.withStatementMode)) : null), stmt.leadingComments);
  }
  visitTryCatchStmt(_stmt, _context) {
    throw new Error("Method not implemented.");
  }
  visitThrowStmt(stmt, context) {
    return this.attachComments(this.factory.createThrowStatement(stmt.error.visitExpression(this, context.withExpressionMode)), stmt.leadingComments);
  }
  visitReadVarExpr(ast, _context) {
    const identifier = this.factory.createIdentifier(ast.name);
    this.setSourceMapRange(identifier, ast.sourceSpan);
    return identifier;
  }
  visitWriteVarExpr(expr, context) {
    const assignment = this.factory.createAssignment(this.setSourceMapRange(this.factory.createIdentifier(expr.name), expr.sourceSpan), expr.value.visitExpression(this, context));
    return context.isStatement ? assignment : this.factory.createParenthesizedExpression(assignment);
  }
  visitWriteKeyExpr(expr, context) {
    const exprContext = context.withExpressionMode;
    const target = this.factory.createElementAccess(expr.receiver.visitExpression(this, exprContext), expr.index.visitExpression(this, exprContext));
    const assignment = this.factory.createAssignment(target, expr.value.visitExpression(this, exprContext));
    return context.isStatement ? assignment : this.factory.createParenthesizedExpression(assignment);
  }
  visitWritePropExpr(expr, context) {
    const target = this.factory.createPropertyAccess(expr.receiver.visitExpression(this, context), expr.name);
    return this.factory.createAssignment(target, expr.value.visitExpression(this, context));
  }
  visitInvokeFunctionExpr(ast, context) {
    return this.setSourceMapRange(this.factory.createCallExpression(ast.fn.visitExpression(this, context), ast.args.map((arg) => arg.visitExpression(this, context)), ast.pure), ast.sourceSpan);
  }
  visitTaggedTemplateExpr(ast, context) {
    return this.setSourceMapRange(this.createTaggedTemplateExpression(ast.tag.visitExpression(this, context), {
      elements: ast.template.elements.map((e) => {
        var _a;
        return createTemplateElement({
          cooked: e.text,
          raw: e.rawText,
          range: (_a = e.sourceSpan) != null ? _a : ast.sourceSpan
        });
      }),
      expressions: ast.template.expressions.map((e) => e.visitExpression(this, context))
    }), ast.sourceSpan);
  }
  visitInstantiateExpr(ast, context) {
    return this.factory.createNewExpression(ast.classExpr.visitExpression(this, context), ast.args.map((arg) => arg.visitExpression(this, context)));
  }
  visitLiteralExpr(ast, _context) {
    return this.setSourceMapRange(this.factory.createLiteral(ast.value), ast.sourceSpan);
  }
  visitLocalizedString(ast, context) {
    const elements = [createTemplateElement(ast.serializeI18nHead())];
    const expressions = [];
    for (let i = 0; i < ast.expressions.length; i++) {
      const placeholder = this.setSourceMapRange(ast.expressions[i].visitExpression(this, context), ast.getPlaceholderSourceSpan(i));
      expressions.push(placeholder);
      elements.push(createTemplateElement(ast.serializeI18nTemplatePart(i + 1)));
    }
    const localizeTag = this.factory.createIdentifier("$localize");
    return this.setSourceMapRange(this.createTaggedTemplateExpression(localizeTag, { elements, expressions }), ast.sourceSpan);
  }
  createTaggedTemplateExpression(tag, template) {
    return this.downlevelTaggedTemplates ? this.createES5TaggedTemplateFunctionCall(tag, template) : this.factory.createTaggedTemplate(tag, template);
  }
  createES5TaggedTemplateFunctionCall(tagHandler, { elements, expressions }) {
    const { moduleImport, symbol } = this.imports.generateNamedImport("tslib", "__makeTemplateObject");
    const __makeTemplateObjectHelper = moduleImport === null ? this.factory.createIdentifier(symbol) : this.factory.createPropertyAccess(moduleImport, symbol);
    const cooked = [];
    const raw = [];
    for (const element of elements) {
      cooked.push(this.factory.setSourceMapRange(this.factory.createLiteral(element.cooked), element.range));
      raw.push(this.factory.setSourceMapRange(this.factory.createLiteral(element.raw), element.range));
    }
    const templateHelperCall = this.factory.createCallExpression(__makeTemplateObjectHelper, [this.factory.createArrayLiteral(cooked), this.factory.createArrayLiteral(raw)], false);
    return this.factory.createCallExpression(tagHandler, [templateHelperCall, ...expressions], false);
  }
  visitExternalExpr(ast, _context) {
    if (ast.value.name === null) {
      if (ast.value.moduleName === null) {
        throw new Error("Invalid import without name nor moduleName");
      }
      return this.imports.generateNamespaceImport(ast.value.moduleName);
    }
    if (ast.value.moduleName !== null) {
      const { moduleImport, symbol } = this.imports.generateNamedImport(ast.value.moduleName, ast.value.name);
      if (moduleImport === null) {
        return this.factory.createIdentifier(symbol);
      } else {
        return this.factory.createPropertyAccess(moduleImport, symbol);
      }
    } else {
      return this.factory.createIdentifier(ast.value.name);
    }
  }
  visitConditionalExpr(ast, context) {
    let cond = ast.condition.visitExpression(this, context);
    if (ast.condition instanceof ConditionalExpr) {
      cond = this.factory.createParenthesizedExpression(cond);
    }
    return this.factory.createConditional(cond, ast.trueCase.visitExpression(this, context), ast.falseCase.visitExpression(this, context));
  }
  visitNotExpr(ast, context) {
    return this.factory.createUnaryExpression("!", ast.condition.visitExpression(this, context));
  }
  visitAssertNotNullExpr(ast, context) {
    return ast.condition.visitExpression(this, context);
  }
  visitCastExpr(ast, context) {
    return ast.value.visitExpression(this, context);
  }
  visitFunctionExpr(ast, context) {
    var _a;
    return this.factory.createFunctionExpression((_a = ast.name) != null ? _a : null, ast.params.map((param) => param.name), this.factory.createBlock(this.visitStatements(ast.statements, context)));
  }
  visitBinaryOperatorExpr(ast, context) {
    if (!BINARY_OPERATORS.has(ast.operator)) {
      throw new Error(`Unknown binary operator: ${BinaryOperator[ast.operator]}`);
    }
    return this.factory.createBinaryExpression(ast.lhs.visitExpression(this, context), BINARY_OPERATORS.get(ast.operator), ast.rhs.visitExpression(this, context));
  }
  visitReadPropExpr(ast, context) {
    return this.factory.createPropertyAccess(ast.receiver.visitExpression(this, context), ast.name);
  }
  visitReadKeyExpr(ast, context) {
    return this.factory.createElementAccess(ast.receiver.visitExpression(this, context), ast.index.visitExpression(this, context));
  }
  visitLiteralArrayExpr(ast, context) {
    return this.factory.createArrayLiteral(ast.entries.map((expr) => this.setSourceMapRange(expr.visitExpression(this, context), ast.sourceSpan)));
  }
  visitLiteralMapExpr(ast, context) {
    const properties = ast.entries.map((entry) => {
      return {
        propertyName: entry.key,
        quoted: entry.quoted,
        value: entry.value.visitExpression(this, context)
      };
    });
    return this.setSourceMapRange(this.factory.createObjectLiteral(properties), ast.sourceSpan);
  }
  visitCommaExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitWrappedNodeExpr(ast, _context) {
    this.recordWrappedNode(ast);
    return ast.node;
  }
  visitTypeofExpr(ast, context) {
    return this.factory.createTypeOfExpression(ast.expr.visitExpression(this, context));
  }
  visitUnaryOperatorExpr(ast, context) {
    if (!UNARY_OPERATORS.has(ast.operator)) {
      throw new Error(`Unknown unary operator: ${UnaryOperator[ast.operator]}`);
    }
    return this.factory.createUnaryExpression(UNARY_OPERATORS.get(ast.operator), ast.expr.visitExpression(this, context));
  }
  visitStatements(statements, context) {
    return statements.map((stmt) => stmt.visitStatement(this, context)).filter((stmt) => stmt !== void 0);
  }
  setSourceMapRange(ast, span) {
    return this.factory.setSourceMapRange(ast, createRange(span));
  }
  attachComments(statement, leadingComments) {
    if (leadingComments !== void 0) {
      this.factory.attachComments(statement, leadingComments);
    }
    return statement;
  }
};
function createTemplateElement({ cooked, raw, range }) {
  return { cooked, raw, range: createRange(range) };
}
function createRange(span) {
  if (span === null) {
    return null;
  }
  const { start, end } = span;
  const { url, content } = start.file;
  if (!url) {
    return null;
  }
  return {
    url,
    content,
    start: { offset: start.offset, line: start.line, column: start.col },
    end: { offset: end.offset, line: end.line, column: end.col }
  };
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/translator/src/import_manager.mjs
import ts5 from "typescript";
var ImportManager = class {
  constructor(rewriter = new NoopImportRewriter(), prefix = "i") {
    this.rewriter = rewriter;
    this.prefix = prefix;
    this.specifierToIdentifier = new Map();
    this.nextIndex = 0;
  }
  generateNamespaceImport(moduleName) {
    if (!this.specifierToIdentifier.has(moduleName)) {
      this.specifierToIdentifier.set(moduleName, ts5.createIdentifier(`${this.prefix}${this.nextIndex++}`));
    }
    return this.specifierToIdentifier.get(moduleName);
  }
  generateNamedImport(moduleName, originalSymbol) {
    const symbol = this.rewriter.rewriteSymbol(originalSymbol, moduleName);
    if (!this.rewriter.shouldImportSymbol(symbol, moduleName)) {
      return { moduleImport: null, symbol };
    }
    const moduleImport = this.generateNamespaceImport(moduleName);
    return { moduleImport, symbol };
  }
  getAllImports(contextPath) {
    const imports = [];
    for (const [originalSpecifier, qualifier] of this.specifierToIdentifier) {
      const specifier = this.rewriter.rewriteSpecifier(originalSpecifier, contextPath);
      imports.push({
        specifier,
        qualifier
      });
    }
    return imports;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/translator/src/type_translator.mjs
import {
  BuiltinTypeName
} from "@angular/compiler";
import ts6 from "typescript";
function translateType(type, imports) {
  return type.visitType(new TypeTranslatorVisitor(imports), new Context(false));
}
var TypeTranslatorVisitor = class {
  constructor(imports) {
    this.imports = imports;
  }
  visitBuiltinType(type, context) {
    switch (type.name) {
      case BuiltinTypeName.Bool:
        return ts6.createKeywordTypeNode(ts6.SyntaxKind.BooleanKeyword);
      case BuiltinTypeName.Dynamic:
        return ts6.createKeywordTypeNode(ts6.SyntaxKind.AnyKeyword);
      case BuiltinTypeName.Int:
      case BuiltinTypeName.Number:
        return ts6.createKeywordTypeNode(ts6.SyntaxKind.NumberKeyword);
      case BuiltinTypeName.String:
        return ts6.createKeywordTypeNode(ts6.SyntaxKind.StringKeyword);
      case BuiltinTypeName.None:
        return ts6.createKeywordTypeNode(ts6.SyntaxKind.NeverKeyword);
      default:
        throw new Error(`Unsupported builtin type: ${BuiltinTypeName[type.name]}`);
    }
  }
  visitExpressionType(type, context) {
    const typeNode = this.translateExpression(type.value, context);
    if (type.typeParams === null) {
      return typeNode;
    }
    if (!ts6.isTypeReferenceNode(typeNode)) {
      throw new Error("An ExpressionType with type arguments must translate into a TypeReferenceNode");
    } else if (typeNode.typeArguments !== void 0) {
      throw new Error(`An ExpressionType with type arguments cannot have multiple levels of type arguments`);
    }
    const typeArgs = type.typeParams.map((param) => this.translateType(param, context));
    return ts6.createTypeReferenceNode(typeNode.typeName, typeArgs);
  }
  visitArrayType(type, context) {
    return ts6.createArrayTypeNode(this.translateType(type.of, context));
  }
  visitMapType(type, context) {
    const parameter = ts6.createParameter(void 0, void 0, void 0, "key", void 0, ts6.createKeywordTypeNode(ts6.SyntaxKind.StringKeyword));
    const typeArgs = type.valueType !== null ? this.translateType(type.valueType, context) : ts6.createKeywordTypeNode(ts6.SyntaxKind.UnknownKeyword);
    const indexSignature = ts6.createIndexSignature(void 0, void 0, [parameter], typeArgs);
    return ts6.createTypeLiteralNode([indexSignature]);
  }
  visitReadVarExpr(ast, context) {
    if (ast.name === null) {
      throw new Error(`ReadVarExpr with no variable name in type`);
    }
    return ts6.createTypeQueryNode(ts6.createIdentifier(ast.name));
  }
  visitWriteVarExpr(expr, context) {
    throw new Error("Method not implemented.");
  }
  visitWriteKeyExpr(expr, context) {
    throw new Error("Method not implemented.");
  }
  visitWritePropExpr(expr, context) {
    throw new Error("Method not implemented.");
  }
  visitInvokeFunctionExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitTaggedTemplateExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitInstantiateExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitLiteralExpr(ast, context) {
    if (ast.value === null) {
      return ts6.createLiteralTypeNode(ts6.createNull());
    } else if (ast.value === void 0) {
      return ts6.createKeywordTypeNode(ts6.SyntaxKind.UndefinedKeyword);
    } else if (typeof ast.value === "boolean") {
      return ts6.createLiteralTypeNode(ts6.createLiteral(ast.value));
    } else if (typeof ast.value === "number") {
      return ts6.createLiteralTypeNode(ts6.createLiteral(ast.value));
    } else {
      return ts6.createLiteralTypeNode(ts6.createLiteral(ast.value));
    }
  }
  visitLocalizedString(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitExternalExpr(ast, context) {
    if (ast.value.moduleName === null || ast.value.name === null) {
      throw new Error(`Import unknown module or symbol`);
    }
    const { moduleImport, symbol } = this.imports.generateNamedImport(ast.value.moduleName, ast.value.name);
    const symbolIdentifier = ts6.createIdentifier(symbol);
    const typeName = moduleImport ? ts6.createQualifiedName(moduleImport, symbolIdentifier) : symbolIdentifier;
    const typeArguments = ast.typeParams !== null ? ast.typeParams.map((type) => this.translateType(type, context)) : void 0;
    return ts6.createTypeReferenceNode(typeName, typeArguments);
  }
  visitConditionalExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitNotExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitAssertNotNullExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitCastExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitFunctionExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitUnaryOperatorExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitBinaryOperatorExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitReadPropExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitReadKeyExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitLiteralArrayExpr(ast, context) {
    const values = ast.entries.map((expr) => this.translateExpression(expr, context));
    return ts6.createTupleTypeNode(values);
  }
  visitLiteralMapExpr(ast, context) {
    const entries = ast.entries.map((entry) => {
      const { key, quoted } = entry;
      const type = this.translateExpression(entry.value, context);
      return ts6.createPropertySignature(void 0, quoted ? ts6.createStringLiteral(key) : key, void 0, type, void 0);
    });
    return ts6.createTypeLiteralNode(entries);
  }
  visitCommaExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitWrappedNodeExpr(ast, context) {
    const node = ast.node;
    if (ts6.isEntityName(node)) {
      return ts6.createTypeReferenceNode(node, void 0);
    } else if (ts6.isTypeNode(node)) {
      return node;
    } else if (ts6.isLiteralExpression(node)) {
      return ts6.createLiteralTypeNode(node);
    } else {
      throw new Error(`Unsupported WrappedNodeExpr in TypeTranslatorVisitor: ${ts6.SyntaxKind[node.kind]}`);
    }
  }
  visitTypeofExpr(ast, context) {
    const typeNode = this.translateExpression(ast.expr, context);
    if (!ts6.isTypeReferenceNode(typeNode)) {
      throw new Error(`The target of a typeof expression must be a type reference, but it was
          ${ts6.SyntaxKind[typeNode.kind]}`);
    }
    return ts6.createTypeQueryNode(typeNode.typeName);
  }
  translateType(type, context) {
    const typeNode = type.visitType(this, context);
    if (!ts6.isTypeNode(typeNode)) {
      throw new Error(`A Type must translate to a TypeNode, but was ${ts6.SyntaxKind[typeNode.kind]}`);
    }
    return typeNode;
  }
  translateExpression(expr, context) {
    const typeNode = expr.visitExpression(this, context);
    if (!ts6.isTypeNode(typeNode)) {
      throw new Error(`An Expression must translate to a TypeNode, but was ${ts6.SyntaxKind[typeNode.kind]}`);
    }
    return typeNode;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/translator/src/typescript_ast_factory.mjs
import ts7 from "typescript";
var PureAnnotation;
(function(PureAnnotation2) {
  PureAnnotation2["CLOSURE"] = "* @pureOrBreakMyCode ";
  PureAnnotation2["TERSER"] = "@__PURE__";
})(PureAnnotation || (PureAnnotation = {}));
var UNARY_OPERATORS2 = {
  "+": ts7.SyntaxKind.PlusToken,
  "-": ts7.SyntaxKind.MinusToken,
  "!": ts7.SyntaxKind.ExclamationToken
};
var BINARY_OPERATORS2 = {
  "&&": ts7.SyntaxKind.AmpersandAmpersandToken,
  ">": ts7.SyntaxKind.GreaterThanToken,
  ">=": ts7.SyntaxKind.GreaterThanEqualsToken,
  "&": ts7.SyntaxKind.AmpersandToken,
  "/": ts7.SyntaxKind.SlashToken,
  "==": ts7.SyntaxKind.EqualsEqualsToken,
  "===": ts7.SyntaxKind.EqualsEqualsEqualsToken,
  "<": ts7.SyntaxKind.LessThanToken,
  "<=": ts7.SyntaxKind.LessThanEqualsToken,
  "-": ts7.SyntaxKind.MinusToken,
  "%": ts7.SyntaxKind.PercentToken,
  "*": ts7.SyntaxKind.AsteriskToken,
  "!=": ts7.SyntaxKind.ExclamationEqualsToken,
  "!==": ts7.SyntaxKind.ExclamationEqualsEqualsToken,
  "||": ts7.SyntaxKind.BarBarToken,
  "+": ts7.SyntaxKind.PlusToken,
  "??": ts7.SyntaxKind.QuestionQuestionToken
};
var VAR_TYPES = {
  "const": ts7.NodeFlags.Const,
  "let": ts7.NodeFlags.Let,
  "var": ts7.NodeFlags.None
};
var TypeScriptAstFactory = class {
  constructor(annotateForClosureCompiler) {
    this.annotateForClosureCompiler = annotateForClosureCompiler;
    this.externalSourceFiles = new Map();
    this.attachComments = attachComments;
    this.createArrayLiteral = ts7.createArrayLiteral;
    this.createConditional = ts7.createConditional;
    this.createElementAccess = ts7.createElementAccess;
    this.createExpressionStatement = ts7.createExpressionStatement;
    this.createIdentifier = ts7.createIdentifier;
    this.createParenthesizedExpression = ts7.createParen;
    this.createPropertyAccess = ts7.createPropertyAccess;
    this.createThrowStatement = ts7.createThrow;
    this.createTypeOfExpression = ts7.createTypeOf;
  }
  createAssignment(target, value) {
    return ts7.createBinary(target, ts7.SyntaxKind.EqualsToken, value);
  }
  createBinaryExpression(leftOperand, operator, rightOperand) {
    return ts7.createBinary(leftOperand, BINARY_OPERATORS2[operator], rightOperand);
  }
  createBlock(body) {
    return ts7.createBlock(body);
  }
  createCallExpression(callee, args, pure) {
    const call = ts7.createCall(callee, void 0, args);
    if (pure) {
      ts7.addSyntheticLeadingComment(call, ts7.SyntaxKind.MultiLineCommentTrivia, this.annotateForClosureCompiler ? PureAnnotation.CLOSURE : PureAnnotation.TERSER, false);
    }
    return call;
  }
  createFunctionDeclaration(functionName, parameters, body) {
    if (!ts7.isBlock(body)) {
      throw new Error(`Invalid syntax, expected a block, but got ${ts7.SyntaxKind[body.kind]}.`);
    }
    return ts7.createFunctionDeclaration(void 0, void 0, void 0, functionName, void 0, parameters.map((param) => ts7.createParameter(void 0, void 0, void 0, param)), void 0, body);
  }
  createFunctionExpression(functionName, parameters, body) {
    if (!ts7.isBlock(body)) {
      throw new Error(`Invalid syntax, expected a block, but got ${ts7.SyntaxKind[body.kind]}.`);
    }
    return ts7.createFunctionExpression(void 0, void 0, functionName != null ? functionName : void 0, void 0, parameters.map((param) => ts7.createParameter(void 0, void 0, void 0, param)), void 0, body);
  }
  createIfStatement(condition, thenStatement, elseStatement) {
    return ts7.createIf(condition, thenStatement, elseStatement != null ? elseStatement : void 0);
  }
  createLiteral(value) {
    if (value === void 0) {
      return ts7.createIdentifier("undefined");
    } else if (value === null) {
      return ts7.createNull();
    } else {
      return ts7.createLiteral(value);
    }
  }
  createNewExpression(expression, args) {
    return ts7.createNew(expression, void 0, args);
  }
  createObjectLiteral(properties) {
    return ts7.createObjectLiteral(properties.map((prop) => ts7.createPropertyAssignment(prop.quoted ? ts7.createLiteral(prop.propertyName) : ts7.createIdentifier(prop.propertyName), prop.value)));
  }
  createReturnStatement(expression) {
    return ts7.createReturn(expression != null ? expression : void 0);
  }
  createTaggedTemplate(tag, template) {
    let templateLiteral;
    const length = template.elements.length;
    const head = template.elements[0];
    if (length === 1) {
      templateLiteral = ts7.createNoSubstitutionTemplateLiteral(head.cooked, head.raw);
    } else {
      const spans = [];
      for (let i = 1; i < length - 1; i++) {
        const { cooked, raw, range } = template.elements[i];
        const middle = createTemplateMiddle(cooked, raw);
        if (range !== null) {
          this.setSourceMapRange(middle, range);
        }
        spans.push(ts7.createTemplateSpan(template.expressions[i - 1], middle));
      }
      const resolvedExpression = template.expressions[length - 2];
      const templatePart = template.elements[length - 1];
      const templateTail = createTemplateTail(templatePart.cooked, templatePart.raw);
      if (templatePart.range !== null) {
        this.setSourceMapRange(templateTail, templatePart.range);
      }
      spans.push(ts7.createTemplateSpan(resolvedExpression, templateTail));
      templateLiteral = ts7.createTemplateExpression(ts7.createTemplateHead(head.cooked, head.raw), spans);
    }
    if (head.range !== null) {
      this.setSourceMapRange(templateLiteral, head.range);
    }
    return ts7.createTaggedTemplate(tag, templateLiteral);
  }
  createUnaryExpression(operator, operand) {
    return ts7.createPrefix(UNARY_OPERATORS2[operator], operand);
  }
  createVariableDeclaration(variableName, initializer, type) {
    return ts7.createVariableStatement(void 0, ts7.createVariableDeclarationList([ts7.createVariableDeclaration(variableName, void 0, initializer != null ? initializer : void 0)], VAR_TYPES[type]));
  }
  setSourceMapRange(node, sourceMapRange) {
    if (sourceMapRange === null) {
      return node;
    }
    const url = sourceMapRange.url;
    if (!this.externalSourceFiles.has(url)) {
      this.externalSourceFiles.set(url, ts7.createSourceMapSource(url, sourceMapRange.content, (pos) => pos));
    }
    const source = this.externalSourceFiles.get(url);
    ts7.setSourceMapRange(node, { pos: sourceMapRange.start.offset, end: sourceMapRange.end.offset, source });
    return node;
  }
};
function createTemplateMiddle(cooked, raw) {
  const node = ts7.createTemplateHead(cooked, raw);
  node.kind = ts7.SyntaxKind.TemplateMiddle;
  return node;
}
function createTemplateTail(cooked, raw) {
  const node = ts7.createTemplateHead(cooked, raw);
  node.kind = ts7.SyntaxKind.TemplateTail;
  return node;
}
function attachComments(statement, leadingComments) {
  for (const comment of leadingComments) {
    const commentKind = comment.multiline ? ts7.SyntaxKind.MultiLineCommentTrivia : ts7.SyntaxKind.SingleLineCommentTrivia;
    if (comment.multiline) {
      ts7.addSyntheticLeadingComment(statement, commentKind, comment.toString(), comment.trailingNewline);
    } else {
      for (const line of comment.toString().split("\n")) {
        ts7.addSyntheticLeadingComment(statement, commentKind, line, comment.trailingNewline);
      }
    }
  }
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/translator/src/typescript_translator.mjs
function translateExpression(expression, imports, options = {}) {
  return expression.visitExpression(new ExpressionTranslatorVisitor(new TypeScriptAstFactory(options.annotateForClosureCompiler === true), imports, options), new Context(false));
}
function translateStatement(statement, imports, options = {}) {
  return statement.visitStatement(new ExpressionTranslatorVisitor(new TypeScriptAstFactory(options.annotateForClosureCompiler === true), imports, options), new Context(true));
}

export {
  isSymbolWithValueDeclaration,
  isDtsPath,
  isNonDeclarationTsPath,
  isFromDtsFile,
  nodeNameForError,
  getSourceFile,
  getSourceFileOrNull,
  getTokenAtPosition,
  identifierOfNode,
  isDeclaration,
  getRootDirs,
  nodeDebugInfo,
  isAssignment,
  toUnredirectedSourceFile,
  createExportSpecifier,
  ImportFlags,
  ReferenceEmitter,
  LocalIdentifierStrategy,
  AbsoluteModuleStrategy,
  LogicalProjectStrategy,
  RelativePathStrategy,
  UnifiedModulesStrategy,
  UnifiedModulesAliasingHost,
  PrivateExportAliasingHost,
  AliasStrategy,
  relativePathBetween,
  normalizeSeparators,
  NoopImportRewriter,
  R3SymbolsImportRewriter,
  validateAndRewriteCoreSymbol,
  attachDefaultImportDeclaration,
  getDefaultImportDeclaration,
  DefaultImportTracker,
  Reference,
  ModuleResolver,
  Context,
  ImportManager,
  ExpressionTranslatorVisitor,
  translateType,
  translateExpression,
  translateStatement
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
//# sourceMappingURL=chunk-LSI3A7YI.js.map
