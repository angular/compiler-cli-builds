
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
      const __ESM_IMPORT_META_URL__ = import.meta.url;
    
import {
  CycleAnalyzer,
  ImportGraph,
  LocalModuleScopeRegistry,
  MetadataDtsModuleScopeResolver,
  TypeCheckScopeRegistry,
  readConfiguration
} from "./chunk-H72LWJP4.js";
import {
  CompilationMode,
  ComponentDecoratorHandler,
  CompoundMetadataReader,
  CompoundMetadataRegistry,
  DirectiveDecoratorHandler,
  DtsMetadataReader,
  DtsTransformRegistry,
  HandlerFlags,
  InjectableClassRegistry,
  InjectableDecoratorHandler,
  LocalMetadataRegistry,
  NgModuleDecoratorHandler,
  PartialEvaluator,
  PipeDecoratorHandler,
  ResourceRegistry,
  TraitCompiler,
  TraitState,
  forwardRefResolver,
  isFatalDiagnosticError,
  readBaseClass,
  replaceTsWithNgInErrors
} from "./chunk-II56HG36.js";
import {
  ClassMemberKind,
  KnownDeclaration,
  TypeScriptReflectionHost,
  isConcreteDeclaration,
  isDecoratorIdentifier,
  isNamedClassDeclaration,
  isNamedFunctionDeclaration,
  isNamedVariableDeclaration,
  reflectObjectLiteral
} from "./chunk-S3QIIFH7.js";
import {
  ConsoleLogger,
  LogLevel
} from "./chunk-SKBLJA43.js";
import {
  ContentOrigin,
  SourceFileLoader
} from "./chunk-FOIIOIVJ.js";
import {
  AbsoluteModuleStrategy,
  ImportManager,
  LocalIdentifierStrategy,
  LogicalProjectStrategy,
  ModuleResolver,
  NoopImportRewriter,
  PrivateExportAliasingHost,
  R3SymbolsImportRewriter,
  Reference,
  ReferenceEmitter,
  isAssignment,
  isDtsPath,
  isFromDtsFile,
  isSymbolWithValueDeclaration,
  translateStatement,
  translateType,
  validateAndRewriteCoreSymbol
} from "./chunk-HYTAZOQJ.js";
import {
  LogicalFileSystem,
  NgtscCompilerHost,
  absoluteFrom,
  absoluteFromSourceFile,
  dirname,
  getFileSystem,
  isLocalRelativePath,
  isRooted,
  relative,
  toRelativeImport
} from "./chunk-3IV7S3VF.js";
import {
  NOOP_PERF_RECORDER
} from "./chunk-GLCRIILX.js";
import {
  __spreadProps,
  __spreadValues
} from "./chunk-5VGHS4A4.js";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/execution/create_compile_function.mjs
import ts23 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/packages/entry_point.mjs
import ts8 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/host/umd_host.mjs
import ts7 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/utils.mjs
import ts from "typescript";
function isDefined(value) {
  return value !== void 0 && value !== null;
}
function getNameText(name) {
  return ts.isIdentifier(name) || ts.isLiteralExpression(name) ? name.text : name.getText();
}
function findAll(node, test) {
  const nodes = [];
  findAllVisitor(node);
  return nodes;
  function findAllVisitor(n) {
    if (test(n)) {
      nodes.push(n);
    } else {
      n.forEachChild((child) => findAllVisitor(child));
    }
  }
}
function hasNameIdentifier(declaration) {
  const namedDeclaration = declaration;
  return namedDeclaration.name !== void 0 && ts.isIdentifier(namedDeclaration.name);
}
function isRelativePath(path) {
  return isRooted(path) || /^\.\.?(\/|\\|$)/.test(path);
}
var FactoryMap = class {
  constructor(factory, entries) {
    this.factory = factory;
    this.internalMap = new Map(entries);
  }
  get(key) {
    if (!this.internalMap.has(key)) {
      this.internalMap.set(key, this.factory(key));
    }
    return this.internalMap.get(key);
  }
  set(key, value) {
    this.internalMap.set(key, value);
  }
};
function resolveFileWithPostfixes(fs, path, postFixes) {
  for (const postFix of postFixes) {
    const testPath = absoluteFrom(path + postFix);
    if (fs.exists(testPath) && fs.stat(testPath).isFile()) {
      return testPath;
    }
  }
  return null;
}
function getTsHelperFnFromDeclaration(decl) {
  if (!ts.isFunctionDeclaration(decl) && !ts.isVariableDeclaration(decl)) {
    return null;
  }
  if (decl.name === void 0 || !ts.isIdentifier(decl.name)) {
    return null;
  }
  return getTsHelperFnFromIdentifier(decl.name);
}
function getTsHelperFnFromIdentifier(id) {
  switch (stripDollarSuffix(id.text)) {
    case "__assign":
      return KnownDeclaration.TsHelperAssign;
    case "__spread":
      return KnownDeclaration.TsHelperSpread;
    case "__spreadArrays":
      return KnownDeclaration.TsHelperSpreadArrays;
    case "__spreadArray":
      return KnownDeclaration.TsHelperSpreadArray;
    case "__read":
      return KnownDeclaration.TsHelperRead;
    default:
      return null;
  }
}
function stripDollarSuffix(value) {
  return value.replace(/\$\d+$/, "");
}
function stripExtension(fileName) {
  return fileName.replace(/\..+$/, "");
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/host/commonjs_umd_utils.mjs
import ts2 from "typescript";
function findNamespaceOfIdentifier(id) {
  return id.parent && ts2.isPropertyAccessExpression(id.parent) && id.parent.name === id && ts2.isIdentifier(id.parent.expression) ? id.parent.expression : null;
}
function findRequireCallReference(id, checker) {
  var _a, _b;
  const symbol = checker.getSymbolAtLocation(id) || null;
  const declaration = (_b = symbol == null ? void 0 : symbol.valueDeclaration) != null ? _b : (_a = symbol == null ? void 0 : symbol.declarations) == null ? void 0 : _a[0];
  const initializer = declaration && ts2.isVariableDeclaration(declaration) && declaration.initializer || null;
  return initializer && isRequireCall(initializer) ? initializer : null;
}
function isWildcardReexportStatement(stmt) {
  if (!ts2.isExpressionStatement(stmt) || !ts2.isCallExpression(stmt.expression)) {
    return false;
  }
  let fnName = null;
  if (ts2.isIdentifier(stmt.expression.expression)) {
    fnName = stmt.expression.expression.text;
  } else if (ts2.isPropertyAccessExpression(stmt.expression.expression) && ts2.isIdentifier(stmt.expression.expression.name)) {
    fnName = stmt.expression.expression.name.text;
  }
  if (fnName !== "__export" && fnName !== "__exportStar") {
    return false;
  }
  return stmt.expression.arguments.length > 0;
}
function isDefinePropertyReexportStatement(stmt) {
  if (!ts2.isExpressionStatement(stmt) || !ts2.isCallExpression(stmt.expression)) {
    return false;
  }
  if (!ts2.isPropertyAccessExpression(stmt.expression.expression) || !ts2.isIdentifier(stmt.expression.expression.expression) || stmt.expression.expression.expression.text !== "Object" || !ts2.isIdentifier(stmt.expression.expression.name) || stmt.expression.expression.name.text !== "defineProperty") {
    return false;
  }
  const args = stmt.expression.arguments;
  if (args.length !== 3) {
    return false;
  }
  const exportsObject = args[0];
  if (!ts2.isIdentifier(exportsObject) || exportsObject.text !== "exports") {
    return false;
  }
  const propertyKey = args[1];
  if (!ts2.isStringLiteral(propertyKey)) {
    return false;
  }
  const propertyDescriptor = args[2];
  if (!ts2.isObjectLiteralExpression(propertyDescriptor)) {
    return false;
  }
  return propertyDescriptor.properties.some((prop) => prop.name !== void 0 && ts2.isIdentifier(prop.name) && prop.name.text === "get");
}
function extractGetterFnExpression(statement) {
  const args = statement.expression.arguments;
  const getterFn = args[2].properties.find((prop) => prop.name !== void 0 && ts2.isIdentifier(prop.name) && prop.name.text === "get");
  if (getterFn === void 0 || !ts2.isPropertyAssignment(getterFn) || !ts2.isFunctionExpression(getterFn.initializer)) {
    return null;
  }
  const returnStatement = getterFn.initializer.body.statements[0];
  if (!ts2.isReturnStatement(returnStatement) || returnStatement.expression === void 0) {
    return null;
  }
  return returnStatement.expression;
}
function isRequireCall(node) {
  return ts2.isCallExpression(node) && ts2.isIdentifier(node.expression) && node.expression.text === "require" && node.arguments.length === 1 && ts2.isStringLiteral(node.arguments[0]);
}
function isExternalImport(path) {
  return !/^\.\.?(\/|$)/.test(path);
}
function isExportsDeclaration(expr) {
  return expr.parent && isExportsAssignment(expr.parent);
}
function isExportsAssignment(expr) {
  return isAssignment(expr) && ts2.isPropertyAccessExpression(expr.left) && ts2.isIdentifier(expr.left.expression) && expr.left.expression.text === "exports" && ts2.isIdentifier(expr.left.name);
}
function isExportsStatement(stmt) {
  return ts2.isExpressionStatement(stmt) && isExportsAssignment(stmt.expression);
}
function skipAliases(node) {
  while (isAssignment(node)) {
    node = node.right;
  }
  return node;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/host/esm2015_host.mjs
import ts5 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/analysis/util.mjs
function isWithinPackage(packagePath, filePath) {
  const relativePath = relative(packagePath, filePath);
  return isLocalRelativePath(relativePath) && !relativePath.startsWith("node_modules/");
}
var NoopDependencyTracker = class {
  addDependency() {
  }
  addResourceDependency() {
  }
  recordDependencyAnalysisFailure() {
  }
};
var NOOP_DEPENDENCY_TRACKER = new NoopDependencyTracker();

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/host/ngcc_host.mjs
import ts3 from "typescript";
var PRE_R3_MARKER = "__PRE_R3__";
var POST_R3_MARKER = "__POST_R3__";
function isSwitchableVariableDeclaration(node) {
  return ts3.isVariableDeclaration(node) && !!node.initializer && ts3.isIdentifier(node.initializer) && node.initializer.text.endsWith(PRE_R3_MARKER);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/host/utils.mjs
import ts4 from "typescript";
function stripParentheses(node) {
  return ts4.isParenthesizedExpression(node) ? node.expression : node;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/host/esm2015_host.mjs
var DECORATORS = "decorators";
var PROP_DECORATORS = "propDecorators";
var CONSTRUCTOR = "__constructor";
var CONSTRUCTOR_PARAMS = "ctorParameters";
var Esm2015ReflectionHost = class extends TypeScriptReflectionHost {
  constructor(logger, isCore, src, dts = null) {
    super(src.program.getTypeChecker());
    this.logger = logger;
    this.isCore = isCore;
    this.src = src;
    this.dts = dts;
    this.publicDtsDeclarationMap = null;
    this.privateDtsDeclarationMap = null;
    this.preprocessedSourceFiles = new Set();
    this.aliasedClassDeclarations = new Map();
    this.decoratorCache = new Map();
  }
  getClassSymbol(declaration) {
    const symbol = this.getClassSymbolFromOuterDeclaration(declaration);
    if (symbol !== void 0) {
      return symbol;
    }
    const innerDeclaration = this.getInnerDeclarationFromAliasOrInner(declaration);
    return this.getClassSymbolFromInnerDeclaration(innerDeclaration);
  }
  getDecoratorsOfDeclaration(declaration) {
    const symbol = this.getClassSymbol(declaration);
    if (!symbol) {
      return null;
    }
    return this.getDecoratorsOfSymbol(symbol);
  }
  getMembersOfClass(clazz) {
    const classSymbol = this.getClassSymbol(clazz);
    if (!classSymbol) {
      throw new Error(`Attempted to get members of a non-class: "${clazz.getText()}"`);
    }
    return this.getMembersOfSymbol(classSymbol);
  }
  getConstructorParameters(clazz) {
    const classSymbol = this.getClassSymbol(clazz);
    if (!classSymbol) {
      throw new Error(`Attempted to get constructor parameters of a non-class: "${clazz.getText()}"`);
    }
    const parameterNodes = this.getConstructorParameterDeclarations(classSymbol);
    if (parameterNodes) {
      return this.getConstructorParamInfo(classSymbol, parameterNodes);
    }
    return null;
  }
  getBaseClassExpression(clazz) {
    const superBaseClassIdentifier = super.getBaseClassExpression(clazz);
    if (superBaseClassIdentifier) {
      return superBaseClassIdentifier;
    }
    const classSymbol = this.getClassSymbol(clazz);
    if ((classSymbol == null ? void 0 : classSymbol.implementation.valueDeclaration) === void 0 || !isNamedDeclaration(classSymbol.implementation.valueDeclaration)) {
      return null;
    }
    return super.getBaseClassExpression(classSymbol.implementation.valueDeclaration);
  }
  getInternalNameOfClass(clazz) {
    const classSymbol = this.getClassSymbol(clazz);
    if (classSymbol === void 0) {
      throw new Error(`getInternalNameOfClass() called on a non-class: expected ${clazz.name.text} to be a class declaration.`);
    }
    return this.getNameFromClassSymbolDeclaration(classSymbol, classSymbol.implementation.valueDeclaration);
  }
  getAdjacentNameOfClass(clazz) {
    const classSymbol = this.getClassSymbol(clazz);
    if (classSymbol === void 0) {
      throw new Error(`getAdjacentNameOfClass() called on a non-class: expected ${clazz.name.text} to be a class declaration.`);
    }
    return this.getAdjacentNameOfClassSymbol(classSymbol);
  }
  getNameFromClassSymbolDeclaration(classSymbol, declaration) {
    if (declaration === void 0) {
      throw new Error(`getInternalNameOfClass() called on a class with an undefined internal declaration. External class name: ${classSymbol.name}; internal class name: ${classSymbol.implementation.name}.`);
    }
    if (!isNamedDeclaration(declaration)) {
      throw new Error(`getInternalNameOfClass() called on a class with an anonymous inner declaration: expected a name on:
${declaration.getText()}`);
    }
    return declaration.name;
  }
  isClass(node) {
    return super.isClass(node) || this.getClassSymbol(node) !== void 0;
  }
  getDeclarationOfIdentifier(id) {
    const superDeclaration = super.getDeclarationOfIdentifier(id);
    if (superDeclaration === null) {
      return superDeclaration;
    }
    if (superDeclaration.known !== null || isConcreteDeclaration(superDeclaration) && superDeclaration.identity !== null) {
      return superDeclaration;
    }
    let declarationNode = superDeclaration.node;
    if (isNamedVariableDeclaration(superDeclaration.node) && !isTopLevel(superDeclaration.node)) {
      const variableValue = this.getVariableValue(superDeclaration.node);
      if (variableValue !== null && ts5.isClassExpression(variableValue)) {
        declarationNode = getContainingStatement(variableValue);
      }
    }
    const outerNode = getOuterNodeFromInnerDeclaration(declarationNode);
    const declaration = outerNode !== null && isNamedVariableDeclaration(outerNode) ? this.getDeclarationOfIdentifier(outerNode.name) : superDeclaration;
    if (declaration === null || declaration.known !== null || isConcreteDeclaration(declaration) && declaration.identity !== null) {
      return declaration;
    }
    const aliasedIdentifier = this.resolveAliasedClassIdentifier(declaration.node);
    if (aliasedIdentifier !== null) {
      return this.getDeclarationOfIdentifier(aliasedIdentifier);
    }
    if (isConcreteDeclaration(declaration) && ts5.isVariableDeclaration(declaration.node)) {
      const enumMembers = this.resolveEnumMembers(declaration.node);
      if (enumMembers !== null) {
        declaration.identity = { kind: 0, enumMembers };
      }
    }
    return declaration;
  }
  getDecoratorsOfSymbol(symbol) {
    const { classDecorators } = this.acquireDecoratorInfo(symbol);
    if (classDecorators === null) {
      return null;
    }
    return Array.from(classDecorators);
  }
  getSwitchableDeclarations(module) {
    return module.getText().indexOf(PRE_R3_MARKER) >= 0 ? findAll(module, isSwitchableVariableDeclaration) : [];
  }
  getVariableValue(declaration) {
    const value = super.getVariableValue(declaration);
    if (value) {
      return value;
    }
    const block = declaration.parent.parent.parent;
    const symbol = this.checker.getSymbolAtLocation(declaration.name);
    if (symbol && (ts5.isBlock(block) || ts5.isSourceFile(block))) {
      const decorateCall = this.findDecoratedVariableValue(block, symbol);
      const target = decorateCall && decorateCall.arguments[1];
      if (target && ts5.isIdentifier(target)) {
        const targetSymbol = this.checker.getSymbolAtLocation(target);
        const targetDeclaration = targetSymbol && targetSymbol.valueDeclaration;
        if (targetDeclaration) {
          if (ts5.isClassDeclaration(targetDeclaration) || ts5.isFunctionDeclaration(targetDeclaration)) {
            return targetDeclaration.name || null;
          } else if (ts5.isVariableDeclaration(targetDeclaration)) {
            let targetValue = targetDeclaration.initializer;
            while (targetValue && isAssignment2(targetValue)) {
              targetValue = targetValue.right;
            }
            if (targetValue) {
              return targetValue;
            }
          }
        }
      }
    }
    return null;
  }
  findClassSymbols(sourceFile) {
    const classes = new Map();
    this.getModuleStatements(sourceFile).forEach((statement) => this.addClassSymbolsFromStatement(classes, statement));
    return Array.from(classes.values());
  }
  getGenericArityOfClass(clazz) {
    const dtsDeclaration = this.getDtsDeclaration(clazz);
    if (dtsDeclaration && ts5.isClassDeclaration(dtsDeclaration)) {
      return dtsDeclaration.typeParameters ? dtsDeclaration.typeParameters.length : 0;
    }
    return null;
  }
  getDtsDeclaration(declaration) {
    if (this.dts === null) {
      return null;
    }
    if (!isNamedDeclaration(declaration)) {
      throw new Error(`Cannot get the dts file for a declaration that has no name: ${declaration.getText()} in ${declaration.getSourceFile().fileName}`);
    }
    const decl = this.getDeclarationOfIdentifier(declaration.name);
    if (decl === null) {
      throw new Error(`Cannot get the dts file for a node that cannot be associated with a declaration ${declaration.getText()} in ${declaration.getSourceFile().fileName}`);
    }
    if (this.publicDtsDeclarationMap === null) {
      this.publicDtsDeclarationMap = this.computePublicDtsDeclarationMap(this.src, this.dts);
    }
    if (this.publicDtsDeclarationMap.has(decl.node)) {
      return this.publicDtsDeclarationMap.get(decl.node);
    }
    if (this.privateDtsDeclarationMap === null) {
      this.privateDtsDeclarationMap = this.computePrivateDtsDeclarationMap(this.src, this.dts);
    }
    if (this.privateDtsDeclarationMap.has(decl.node)) {
      return this.privateDtsDeclarationMap.get(decl.node);
    }
    return null;
  }
  getEndOfClass(classSymbol) {
    const implementation = classSymbol.implementation;
    let last = implementation.valueDeclaration;
    const implementationStatement = getContainingStatement(last);
    if (implementationStatement === null)
      return last;
    const container = implementationStatement.parent;
    if (ts5.isBlock(container)) {
      const returnStatementIndex = container.statements.findIndex(ts5.isReturnStatement);
      if (returnStatementIndex === -1) {
        throw new Error(`Compiled class wrapper IIFE does not have a return statement: ${classSymbol.name} in ${classSymbol.declaration.valueDeclaration.getSourceFile().fileName}`);
      }
      last = container.statements[returnStatementIndex - 1];
    } else if (ts5.isSourceFile(container)) {
      if (implementation.exports !== void 0) {
        implementation.exports.forEach((exportSymbol) => {
          if (exportSymbol.valueDeclaration === void 0) {
            return;
          }
          const exportStatement = getContainingStatement(exportSymbol.valueDeclaration);
          if (exportStatement !== null && last.getEnd() < exportStatement.getEnd()) {
            last = exportStatement;
          }
        });
      }
      const helpers = this.getHelperCallsForClass(classSymbol, ["__decorate", "__extends", "__param", "__metadata"]);
      helpers.forEach((helper) => {
        const helperStatement = getContainingStatement(helper);
        if (helperStatement !== null && last.getEnd() < helperStatement.getEnd()) {
          last = helperStatement;
        }
      });
    }
    return last;
  }
  detectKnownDeclaration(decl) {
    if (decl.known === null && this.isJavaScriptObjectDeclaration(decl)) {
      decl.known = KnownDeclaration.JsGlobalObject;
    }
    return decl;
  }
  addClassSymbolsFromStatement(classes, statement) {
    if (ts5.isVariableStatement(statement)) {
      statement.declarationList.declarations.forEach((declaration) => {
        const classSymbol = this.getClassSymbol(declaration);
        if (classSymbol) {
          classes.set(classSymbol.implementation, classSymbol);
        }
      });
    } else if (ts5.isClassDeclaration(statement)) {
      const classSymbol = this.getClassSymbol(statement);
      if (classSymbol) {
        classes.set(classSymbol.implementation, classSymbol);
      }
    }
  }
  getInnerDeclarationFromAliasOrInner(declaration) {
    if (declaration.parent !== void 0 && isNamedVariableDeclaration(declaration.parent)) {
      const variableValue = this.getVariableValue(declaration.parent);
      if (variableValue !== null) {
        declaration = variableValue;
      }
    }
    return declaration;
  }
  getClassSymbolFromOuterDeclaration(declaration) {
    if (isNamedClassDeclaration(declaration) && isTopLevel(declaration)) {
      return this.createClassSymbol(declaration.name, null);
    }
    if (!isInitializedVariableClassDeclaration(declaration)) {
      return void 0;
    }
    const innerDeclaration = getInnerClassDeclaration(skipClassAliases(declaration));
    if (innerDeclaration === null) {
      return void 0;
    }
    return this.createClassSymbol(declaration.name, innerDeclaration);
  }
  getClassSymbolFromInnerDeclaration(declaration) {
    let outerDeclaration = void 0;
    if (ts5.isClassExpression(declaration) && hasNameIdentifier(declaration)) {
      outerDeclaration = getFarLeftHandSideOfAssignment(declaration);
      if (outerDeclaration !== void 0 && !isTopLevel(outerDeclaration)) {
        outerDeclaration = getContainingVariableDeclaration(outerDeclaration);
      }
    } else if (isNamedClassDeclaration(declaration)) {
      if (isTopLevel(declaration)) {
        outerDeclaration = declaration;
      } else {
        outerDeclaration = getContainingVariableDeclaration(declaration);
      }
    }
    if (outerDeclaration === void 0 || !hasNameIdentifier(outerDeclaration)) {
      return void 0;
    }
    return this.createClassSymbol(outerDeclaration.name, declaration);
  }
  createClassSymbol(outerDeclaration, innerDeclaration) {
    const declarationSymbol = this.checker.getSymbolAtLocation(outerDeclaration);
    if (declarationSymbol === void 0) {
      return void 0;
    }
    let implementationSymbol = declarationSymbol;
    if (innerDeclaration !== null && isNamedDeclaration(innerDeclaration)) {
      implementationSymbol = this.checker.getSymbolAtLocation(innerDeclaration.name);
    }
    if (!isSymbolWithValueDeclaration(implementationSymbol)) {
      return void 0;
    }
    const classSymbol = {
      name: declarationSymbol.name,
      declaration: declarationSymbol,
      implementation: implementationSymbol,
      adjacent: this.getAdjacentSymbol(declarationSymbol, implementationSymbol)
    };
    return classSymbol;
  }
  getAdjacentSymbol(declarationSymbol, implementationSymbol) {
    if (declarationSymbol === implementationSymbol) {
      return void 0;
    }
    const innerDeclaration = implementationSymbol.valueDeclaration;
    if (!ts5.isClassExpression(innerDeclaration) && !ts5.isFunctionExpression(innerDeclaration)) {
      return void 0;
    }
    const adjacentDeclaration = getFarLeftHandSideOfAssignment(innerDeclaration);
    if (adjacentDeclaration === void 0 || !isNamedVariableDeclaration(adjacentDeclaration)) {
      return void 0;
    }
    const adjacentSymbol = this.checker.getSymbolAtLocation(adjacentDeclaration.name);
    if (adjacentSymbol === declarationSymbol || adjacentSymbol === implementationSymbol || !isSymbolWithValueDeclaration(adjacentSymbol)) {
      return void 0;
    }
    return adjacentSymbol;
  }
  getDeclarationOfSymbol(symbol, originalId) {
    const declaration = super.getDeclarationOfSymbol(symbol, originalId);
    if (declaration === null) {
      return null;
    }
    return this.detectKnownDeclaration(declaration);
  }
  resolveAliasedClassIdentifier(declaration) {
    this.ensurePreprocessed(declaration.getSourceFile());
    return this.aliasedClassDeclarations.has(declaration) ? this.aliasedClassDeclarations.get(declaration) : null;
  }
  ensurePreprocessed(sourceFile) {
    if (!this.preprocessedSourceFiles.has(sourceFile)) {
      this.preprocessedSourceFiles.add(sourceFile);
      for (const statement of this.getModuleStatements(sourceFile)) {
        this.preprocessStatement(statement);
      }
    }
  }
  preprocessStatement(statement) {
    if (!ts5.isVariableStatement(statement)) {
      return;
    }
    const declarations = statement.declarationList.declarations;
    if (declarations.length !== 1) {
      return;
    }
    const declaration = declarations[0];
    const initializer = declaration.initializer;
    if (!ts5.isIdentifier(declaration.name) || !initializer || !isAssignment2(initializer) || !ts5.isIdentifier(initializer.left) || !this.isClass(declaration)) {
      return;
    }
    const aliasedIdentifier = initializer.left;
    const aliasedDeclaration = this.getDeclarationOfIdentifier(aliasedIdentifier);
    if (aliasedDeclaration === null) {
      throw new Error(`Unable to locate declaration of ${aliasedIdentifier.text} in "${statement.getText()}"`);
    }
    this.aliasedClassDeclarations.set(aliasedDeclaration.node, declaration.name);
  }
  getModuleStatements(sourceFile) {
    return Array.from(sourceFile.statements);
  }
  findDecoratedVariableValue(node, symbol) {
    if (!node) {
      return null;
    }
    if (ts5.isBinaryExpression(node) && node.operatorToken.kind === ts5.SyntaxKind.EqualsToken) {
      const left = node.left;
      const right = node.right;
      if (ts5.isIdentifier(left) && this.checker.getSymbolAtLocation(left) === symbol) {
        return ts5.isCallExpression(right) && getCalleeName(right) === "__decorate" ? right : null;
      }
      return this.findDecoratedVariableValue(right, symbol);
    }
    return node.forEachChild((node2) => this.findDecoratedVariableValue(node2, symbol)) || null;
  }
  getStaticProperty(symbol, propertyName) {
    var _a, _b, _c, _d;
    return ((_a = symbol.implementation.exports) == null ? void 0 : _a.get(propertyName)) || ((_c = (_b = symbol.adjacent) == null ? void 0 : _b.exports) == null ? void 0 : _c.get(propertyName)) || ((_d = symbol.declaration.exports) == null ? void 0 : _d.get(propertyName));
  }
  acquireDecoratorInfo(classSymbol) {
    const decl = classSymbol.declaration.valueDeclaration;
    if (this.decoratorCache.has(decl)) {
      return this.decoratorCache.get(decl);
    }
    const staticProps = this.computeDecoratorInfoFromStaticProperties(classSymbol);
    const helperCalls = this.computeDecoratorInfoFromHelperCalls(classSymbol);
    const decoratorInfo = {
      classDecorators: staticProps.classDecorators || helperCalls.classDecorators,
      memberDecorators: staticProps.memberDecorators || helperCalls.memberDecorators,
      constructorParamInfo: staticProps.constructorParamInfo || helperCalls.constructorParamInfo
    };
    this.decoratorCache.set(decl, decoratorInfo);
    return decoratorInfo;
  }
  computeDecoratorInfoFromStaticProperties(classSymbol) {
    let classDecorators = null;
    let memberDecorators = null;
    let constructorParamInfo = null;
    const decoratorsProperty = this.getStaticProperty(classSymbol, DECORATORS);
    if (decoratorsProperty !== void 0) {
      classDecorators = this.getClassDecoratorsFromStaticProperty(decoratorsProperty);
    }
    const propDecoratorsProperty = this.getStaticProperty(classSymbol, PROP_DECORATORS);
    if (propDecoratorsProperty !== void 0) {
      memberDecorators = this.getMemberDecoratorsFromStaticProperty(propDecoratorsProperty);
    }
    const constructorParamsProperty = this.getStaticProperty(classSymbol, CONSTRUCTOR_PARAMS);
    if (constructorParamsProperty !== void 0) {
      constructorParamInfo = this.getParamInfoFromStaticProperty(constructorParamsProperty);
    }
    return { classDecorators, memberDecorators, constructorParamInfo };
  }
  getClassDecoratorsFromStaticProperty(decoratorsSymbol) {
    const decoratorsIdentifier = decoratorsSymbol.valueDeclaration;
    if (decoratorsIdentifier && decoratorsIdentifier.parent) {
      if (ts5.isBinaryExpression(decoratorsIdentifier.parent) && decoratorsIdentifier.parent.operatorToken.kind === ts5.SyntaxKind.EqualsToken) {
        const decoratorsArray = decoratorsIdentifier.parent.right;
        return this.reflectDecorators(decoratorsArray).filter((decorator) => this.isFromCore(decorator));
      }
    }
    return null;
  }
  getMembersOfSymbol(symbol) {
    const members = [];
    const { memberDecorators } = this.acquireDecoratorInfo(symbol);
    const decoratorsMap = new Map(memberDecorators);
    if (symbol.implementation.members) {
      symbol.implementation.members.forEach((value, key) => {
        const decorators = decoratorsMap.get(key);
        const reflectedMembers = this.reflectMembers(value, decorators);
        if (reflectedMembers) {
          decoratorsMap.delete(key);
          members.push(...reflectedMembers);
        }
      });
    }
    if (symbol.implementation.exports) {
      symbol.implementation.exports.forEach((value, key) => {
        const decorators = decoratorsMap.get(key);
        const reflectedMembers = this.reflectMembers(value, decorators, true);
        if (reflectedMembers) {
          decoratorsMap.delete(key);
          members.push(...reflectedMembers);
        }
      });
    }
    if (ts5.isVariableDeclaration(symbol.declaration.valueDeclaration)) {
      if (symbol.declaration.exports) {
        symbol.declaration.exports.forEach((value, key) => {
          const decorators = decoratorsMap.get(key);
          const reflectedMembers = this.reflectMembers(value, decorators, true);
          if (reflectedMembers) {
            decoratorsMap.delete(key);
            members.push(...reflectedMembers);
          }
        });
      }
    }
    if (symbol.adjacent !== void 0) {
      if (ts5.isVariableDeclaration(symbol.adjacent.valueDeclaration)) {
        if (symbol.adjacent.exports !== void 0) {
          symbol.adjacent.exports.forEach((value, key) => {
            const decorators = decoratorsMap.get(key);
            const reflectedMembers = this.reflectMembers(value, decorators, true);
            if (reflectedMembers) {
              decoratorsMap.delete(key);
              members.push(...reflectedMembers);
            }
          });
        }
      }
    }
    decoratorsMap.forEach((value, key) => {
      members.push({
        implementation: null,
        decorators: value,
        isStatic: false,
        kind: ClassMemberKind.Property,
        name: key,
        nameNode: null,
        node: null,
        type: null,
        value: null
      });
    });
    return members;
  }
  getMemberDecoratorsFromStaticProperty(decoratorsProperty) {
    const memberDecorators = new Map();
    const propDecoratorsMap = getPropertyValueFromSymbol(decoratorsProperty);
    if (propDecoratorsMap && ts5.isObjectLiteralExpression(propDecoratorsMap)) {
      const propertiesMap = reflectObjectLiteral(propDecoratorsMap);
      propertiesMap.forEach((value, name) => {
        const decorators = this.reflectDecorators(value).filter((decorator) => this.isFromCore(decorator));
        if (decorators.length) {
          memberDecorators.set(name, decorators);
        }
      });
    }
    return memberDecorators;
  }
  computeDecoratorInfoFromHelperCalls(classSymbol) {
    let classDecorators = null;
    const memberDecorators = new Map();
    const constructorParamInfo = [];
    const getConstructorParamInfo = (index) => {
      let param = constructorParamInfo[index];
      if (param === void 0) {
        param = constructorParamInfo[index] = { decorators: null, typeExpression: null };
      }
      return param;
    };
    const helperCalls = this.getHelperCallsForClass(classSymbol, ["__decorate"]);
    const outerDeclaration = classSymbol.declaration.valueDeclaration;
    const innerDeclaration = classSymbol.implementation.valueDeclaration;
    const adjacentDeclaration = this.getAdjacentNameOfClassSymbol(classSymbol).parent;
    const matchesClass = (identifier) => {
      const decl = this.getDeclarationOfIdentifier(identifier);
      return decl !== null && (decl.node === adjacentDeclaration || decl.node === outerDeclaration || decl.node === innerDeclaration);
    };
    for (const helperCall of helperCalls) {
      if (isClassDecorateCall(helperCall, matchesClass)) {
        const helperArgs = helperCall.arguments[0];
        for (const element of helperArgs.elements) {
          const entry = this.reflectDecorateHelperEntry(element);
          if (entry === null) {
            continue;
          }
          if (entry.type === "decorator") {
            if (this.isFromCore(entry.decorator)) {
              (classDecorators || (classDecorators = [])).push(entry.decorator);
            }
          } else if (entry.type === "param:decorators") {
            const param = getConstructorParamInfo(entry.index);
            (param.decorators || (param.decorators = [])).push(entry.decorator);
          } else if (entry.type === "params") {
            entry.types.forEach((type, index) => getConstructorParamInfo(index).typeExpression = type);
          }
        }
      } else if (isMemberDecorateCall(helperCall, matchesClass)) {
        const helperArgs = helperCall.arguments[0];
        const memberName = helperCall.arguments[2].text;
        for (const element of helperArgs.elements) {
          const entry = this.reflectDecorateHelperEntry(element);
          if (entry === null) {
            continue;
          }
          if (entry.type === "decorator") {
            if (this.isFromCore(entry.decorator)) {
              const decorators = memberDecorators.has(memberName) ? memberDecorators.get(memberName) : [];
              decorators.push(entry.decorator);
              memberDecorators.set(memberName, decorators);
            }
          } else {
          }
        }
      }
    }
    return { classDecorators, memberDecorators, constructorParamInfo };
  }
  reflectDecorateHelperEntry(expression) {
    if (!ts5.isCallExpression(expression)) {
      return null;
    }
    const call = expression;
    const helperName = getCalleeName(call);
    if (helperName === "__metadata") {
      const key = call.arguments[0];
      if (key === void 0 || !ts5.isStringLiteral(key) || key.text !== "design:paramtypes") {
        return null;
      }
      const value = call.arguments[1];
      if (value === void 0 || !ts5.isArrayLiteralExpression(value)) {
        return null;
      }
      return {
        type: "params",
        types: Array.from(value.elements)
      };
    }
    if (helperName === "__param") {
      const indexArg = call.arguments[0];
      const index = indexArg && ts5.isNumericLiteral(indexArg) ? parseInt(indexArg.text, 10) : NaN;
      if (isNaN(index)) {
        return null;
      }
      const decoratorCall = call.arguments[1];
      if (decoratorCall === void 0 || !ts5.isCallExpression(decoratorCall)) {
        return null;
      }
      const decorator2 = this.reflectDecoratorCall(decoratorCall);
      if (decorator2 === null) {
        return null;
      }
      return {
        type: "param:decorators",
        index,
        decorator: decorator2
      };
    }
    const decorator = this.reflectDecoratorCall(call);
    if (decorator === null) {
      return null;
    }
    return {
      type: "decorator",
      decorator
    };
  }
  reflectDecoratorCall(call) {
    const decoratorExpression = call.expression;
    if (!isDecoratorIdentifier(decoratorExpression)) {
      return null;
    }
    const decoratorIdentifier = ts5.isIdentifier(decoratorExpression) ? decoratorExpression : decoratorExpression.name;
    return {
      name: decoratorIdentifier.text,
      identifier: decoratorExpression,
      import: this.getImportOfIdentifier(decoratorIdentifier),
      node: call,
      args: Array.from(call.arguments)
    };
  }
  getHelperCall(statement, helperNames) {
    if ((ts5.isExpressionStatement(statement) || ts5.isReturnStatement(statement)) && statement.expression) {
      let expression = statement.expression;
      while (isAssignment2(expression)) {
        expression = expression.right;
      }
      if (ts5.isCallExpression(expression)) {
        const calleeName = getCalleeName(expression);
        if (calleeName !== null && helperNames.includes(calleeName)) {
          return expression;
        }
      }
    }
    return null;
  }
  reflectDecorators(decoratorsArray) {
    const decorators = [];
    if (ts5.isArrayLiteralExpression(decoratorsArray)) {
      decoratorsArray.elements.forEach((node) => {
        if (ts5.isObjectLiteralExpression(node)) {
          const decorator = reflectObjectLiteral(node);
          if (decorator.has("type")) {
            let decoratorType = decorator.get("type");
            if (isDecoratorIdentifier(decoratorType)) {
              const decoratorIdentifier = ts5.isIdentifier(decoratorType) ? decoratorType : decoratorType.name;
              decorators.push({
                name: decoratorIdentifier.text,
                identifier: decoratorType,
                import: this.getImportOfIdentifier(decoratorIdentifier),
                node,
                args: getDecoratorArgs(node)
              });
            }
          }
        }
      });
    }
    return decorators;
  }
  reflectMembers(symbol, decorators, isStatic) {
    if (symbol.flags & ts5.SymbolFlags.Accessor) {
      const members = [];
      const setter = symbol.declarations && symbol.declarations.find(ts5.isSetAccessor);
      const getter = symbol.declarations && symbol.declarations.find(ts5.isGetAccessor);
      const setterMember = setter && this.reflectMember(setter, ClassMemberKind.Setter, decorators, isStatic);
      if (setterMember) {
        members.push(setterMember);
        decorators = void 0;
      }
      const getterMember = getter && this.reflectMember(getter, ClassMemberKind.Getter, decorators, isStatic);
      if (getterMember) {
        members.push(getterMember);
      }
      return members;
    }
    let kind = null;
    if (symbol.flags & ts5.SymbolFlags.Method) {
      kind = ClassMemberKind.Method;
    } else if (symbol.flags & ts5.SymbolFlags.Property) {
      kind = ClassMemberKind.Property;
    }
    const node = symbol.valueDeclaration || symbol.declarations && symbol.declarations[0];
    if (!node) {
      return null;
    }
    const member = this.reflectMember(node, kind, decorators, isStatic);
    if (!member) {
      return null;
    }
    return [member];
  }
  reflectMember(node, kind, decorators, isStatic) {
    let value = null;
    let name = null;
    let nameNode = null;
    if (!isClassMemberType(node)) {
      return null;
    }
    if (isStatic && isPropertyAccess(node)) {
      name = node.name.text;
      value = kind === ClassMemberKind.Property ? node.parent.right : null;
    } else if (isThisAssignment(node)) {
      kind = ClassMemberKind.Property;
      name = node.left.name.text;
      value = node.right;
      isStatic = false;
    } else if (ts5.isConstructorDeclaration(node)) {
      kind = ClassMemberKind.Constructor;
      name = "constructor";
      isStatic = false;
    }
    if (kind === null) {
      this.logger.warn(`Unknown member type: "${node.getText()}`);
      return null;
    }
    if (!name) {
      if (isNamedDeclaration(node)) {
        name = node.name.text;
        nameNode = node.name;
      } else {
        return null;
      }
    }
    if (isStatic === void 0) {
      isStatic = node.modifiers !== void 0 && node.modifiers.some((mod) => mod.kind === ts5.SyntaxKind.StaticKeyword);
    }
    const type = node.type || null;
    return {
      node,
      implementation: node,
      kind,
      type,
      name,
      nameNode,
      value,
      isStatic,
      decorators: decorators || []
    };
  }
  getConstructorParameterDeclarations(classSymbol) {
    const members = classSymbol.implementation.members;
    if (members && members.has(CONSTRUCTOR)) {
      const constructorSymbol = members.get(CONSTRUCTOR);
      const constructor = constructorSymbol.declarations && constructorSymbol.declarations[0];
      if (!constructor) {
        return [];
      }
      if (constructor.parameters.length > 0) {
        return Array.from(constructor.parameters);
      }
      if (isSynthesizedConstructor(constructor)) {
        return null;
      }
      return [];
    }
    return null;
  }
  getConstructorParamInfo(classSymbol, parameterNodes) {
    const { constructorParamInfo } = this.acquireDecoratorInfo(classSymbol);
    return parameterNodes.map((node, index) => {
      const { decorators, typeExpression } = constructorParamInfo[index] ? constructorParamInfo[index] : { decorators: null, typeExpression: null };
      const nameNode = node.name;
      const typeValueReference = this.typeToValue(typeExpression);
      return {
        name: getNameText(nameNode),
        nameNode,
        typeValueReference,
        typeNode: null,
        decorators
      };
    });
  }
  typeToValue(typeExpression) {
    if (typeExpression === null) {
      return {
        kind: 2,
        reason: { kind: 0 }
      };
    }
    const imp = this.getImportOfExpression(typeExpression);
    const decl = this.getDeclarationOfExpression(typeExpression);
    if (imp === null || decl === null) {
      return {
        kind: 0,
        expression: typeExpression,
        defaultImportStatement: null
      };
    }
    return {
      kind: 1,
      valueDeclaration: decl.node,
      moduleName: imp.from,
      importedName: imp.name,
      nestedPath: null
    };
  }
  getImportOfExpression(expression) {
    if (ts5.isIdentifier(expression)) {
      return this.getImportOfIdentifier(expression);
    } else if (ts5.isPropertyAccessExpression(expression) && ts5.isIdentifier(expression.name)) {
      return this.getImportOfIdentifier(expression.name);
    } else {
      return null;
    }
  }
  getParamInfoFromStaticProperty(paramDecoratorsProperty) {
    const paramDecorators = getPropertyValueFromSymbol(paramDecoratorsProperty);
    if (paramDecorators) {
      const container = ts5.isArrowFunction(paramDecorators) ? paramDecorators.body : paramDecorators;
      if (ts5.isArrayLiteralExpression(container)) {
        const elements = container.elements;
        return elements.map((element) => ts5.isObjectLiteralExpression(element) ? reflectObjectLiteral(element) : null).map((paramInfo) => {
          const typeExpression = paramInfo && paramInfo.has("type") ? paramInfo.get("type") : null;
          const decoratorInfo = paramInfo && paramInfo.has("decorators") ? paramInfo.get("decorators") : null;
          const decorators = decoratorInfo && this.reflectDecorators(decoratorInfo).filter((decorator) => this.isFromCore(decorator));
          return { typeExpression, decorators };
        });
      } else if (paramDecorators !== void 0) {
        this.logger.warn("Invalid constructor parameter decorator in " + paramDecorators.getSourceFile().fileName + ":\n", paramDecorators.getText());
      }
    }
    return null;
  }
  getHelperCallsForClass(classSymbol, helperNames) {
    return this.getStatementsForClass(classSymbol).map((statement) => this.getHelperCall(statement, helperNames)).filter(isDefined);
  }
  getStatementsForClass(classSymbol) {
    const classNode = classSymbol.implementation.valueDeclaration;
    if (isTopLevel(classNode)) {
      return this.getModuleStatements(classNode.getSourceFile());
    }
    const statement = getContainingStatement(classNode);
    if (ts5.isBlock(statement.parent)) {
      return Array.from(statement.parent.statements);
    }
    throw new Error(`Unable to find adjacent statements for ${classSymbol.name}`);
  }
  isFromCore(decorator) {
    if (this.isCore) {
      return !decorator.import || /^\./.test(decorator.import.from);
    } else {
      return !!decorator.import && decorator.import.from === "@angular/core";
    }
  }
  computePublicDtsDeclarationMap(src, dts) {
    const declarationMap = new Map();
    const dtsDeclarationMap = new Map();
    const rootDts = getRootFileOrFail(dts);
    this.collectDtsExportedDeclarations(dtsDeclarationMap, rootDts, dts.program.getTypeChecker());
    const rootSrc = getRootFileOrFail(src);
    this.collectSrcExportedDeclarations(declarationMap, dtsDeclarationMap, rootSrc);
    return declarationMap;
  }
  computePrivateDtsDeclarationMap(src, dts) {
    const declarationMap = new Map();
    const dtsDeclarationMap = new Map();
    const typeChecker = dts.program.getTypeChecker();
    const dtsFiles = getNonRootPackageFiles(dts);
    for (const dtsFile of dtsFiles) {
      this.collectDtsExportedDeclarations(dtsDeclarationMap, dtsFile, typeChecker);
    }
    const srcFiles = getNonRootPackageFiles(src);
    for (const srcFile of srcFiles) {
      this.collectSrcExportedDeclarations(declarationMap, dtsDeclarationMap, srcFile);
    }
    return declarationMap;
  }
  collectDtsExportedDeclarations(dtsDeclarationMap, srcFile, checker) {
    const srcModule = srcFile && checker.getSymbolAtLocation(srcFile);
    const moduleExports = srcModule && checker.getExportsOfModule(srcModule);
    if (moduleExports) {
      moduleExports.forEach((exportedSymbol) => {
        const name = exportedSymbol.name;
        if (exportedSymbol.flags & ts5.SymbolFlags.Alias) {
          exportedSymbol = checker.getAliasedSymbol(exportedSymbol);
        }
        const declaration = exportedSymbol.valueDeclaration;
        if (declaration && !dtsDeclarationMap.has(name)) {
          dtsDeclarationMap.set(name, declaration);
        }
      });
    }
  }
  collectSrcExportedDeclarations(declarationMap, dtsDeclarationMap, srcFile) {
    const fileExports = this.getExportsOfModule(srcFile);
    if (fileExports !== null) {
      for (const [exportName, { node: declarationNode }] of fileExports) {
        if (dtsDeclarationMap.has(exportName)) {
          declarationMap.set(declarationNode, dtsDeclarationMap.get(exportName));
        }
      }
    }
  }
  getDeclarationOfExpression(expression) {
    if (ts5.isIdentifier(expression)) {
      return this.getDeclarationOfIdentifier(expression);
    }
    if (!ts5.isPropertyAccessExpression(expression) || !ts5.isIdentifier(expression.expression)) {
      return null;
    }
    const namespaceDecl = this.getDeclarationOfIdentifier(expression.expression);
    if (!namespaceDecl || !ts5.isSourceFile(namespaceDecl.node)) {
      return null;
    }
    const namespaceExports = this.getExportsOfModule(namespaceDecl.node);
    if (namespaceExports === null) {
      return null;
    }
    if (!namespaceExports.has(expression.name.text)) {
      return null;
    }
    const exportDecl = namespaceExports.get(expression.name.text);
    return __spreadProps(__spreadValues({}, exportDecl), { viaModule: namespaceDecl.viaModule });
  }
  isJavaScriptObjectDeclaration(decl) {
    const node = decl.node;
    if (!ts5.isVariableDeclaration(node) || !ts5.isIdentifier(node.name) || node.name.text !== "Object" || node.type === void 0) {
      return false;
    }
    const typeNode = node.type;
    if (!ts5.isTypeReferenceNode(typeNode) || !ts5.isIdentifier(typeNode.typeName) || typeNode.typeName.text !== "ObjectConstructor") {
      return false;
    }
    return this.src.program.isSourceFileDefaultLibrary(node.getSourceFile());
  }
  resolveEnumMembers(declaration) {
    if (declaration.initializer !== void 0)
      return null;
    const variableStmt = declaration.parent.parent;
    if (!ts5.isVariableStatement(variableStmt))
      return null;
    const block = variableStmt.parent;
    if (!ts5.isBlock(block) && !ts5.isSourceFile(block))
      return null;
    const declarationIndex = block.statements.findIndex((statement) => statement === variableStmt);
    if (declarationIndex === -1 || declarationIndex === block.statements.length - 1)
      return null;
    const subsequentStmt = block.statements[declarationIndex + 1];
    if (!ts5.isExpressionStatement(subsequentStmt))
      return null;
    const iife = stripParentheses(subsequentStmt.expression);
    if (!ts5.isCallExpression(iife) || !isEnumDeclarationIife(iife))
      return null;
    const fn = stripParentheses(iife.expression);
    if (!ts5.isFunctionExpression(fn))
      return null;
    return this.reflectEnumMembers(fn);
  }
  reflectEnumMembers(fn) {
    if (fn.parameters.length !== 1)
      return null;
    const enumName = fn.parameters[0].name;
    if (!ts5.isIdentifier(enumName))
      return null;
    const enumMembers = [];
    for (const statement of fn.body.statements) {
      const enumMember = this.reflectEnumMember(enumName, statement);
      if (enumMember === null) {
        return null;
      }
      enumMembers.push(enumMember);
    }
    return enumMembers;
  }
  reflectEnumMember(enumName, statement) {
    if (!ts5.isExpressionStatement(statement))
      return null;
    const expression = statement.expression;
    if (!isEnumAssignment(enumName, expression)) {
      return null;
    }
    const assignment = reflectEnumAssignment(expression);
    if (assignment != null) {
      return assignment;
    }
    const innerExpression = expression.left.argumentExpression;
    if (!isEnumAssignment(enumName, innerExpression)) {
      return null;
    }
    return reflectEnumAssignment(innerExpression);
  }
  getAdjacentNameOfClassSymbol(classSymbol) {
    if (classSymbol.adjacent !== void 0) {
      return this.getNameFromClassSymbolDeclaration(classSymbol, classSymbol.adjacent.valueDeclaration);
    } else {
      return this.getNameFromClassSymbolDeclaration(classSymbol, classSymbol.implementation.valueDeclaration);
    }
  }
};
function isEnumDeclarationIife(iife) {
  if (iife.arguments.length !== 1)
    return false;
  const arg = iife.arguments[0];
  if (!ts5.isBinaryExpression(arg) || arg.operatorToken.kind !== ts5.SyntaxKind.BarBarToken || !ts5.isParenthesizedExpression(arg.right)) {
    return false;
  }
  const right = arg.right.expression;
  if (!ts5.isBinaryExpression(right) || right.operatorToken.kind !== ts5.SyntaxKind.EqualsToken) {
    return false;
  }
  if (!ts5.isObjectLiteralExpression(right.right) || right.right.properties.length !== 0) {
    return false;
  }
  return true;
}
function isEnumAssignment(enumName, expression) {
  if (!ts5.isBinaryExpression(expression) || expression.operatorToken.kind !== ts5.SyntaxKind.EqualsToken || !ts5.isElementAccessExpression(expression.left)) {
    return false;
  }
  const enumIdentifier = expression.left.expression;
  return ts5.isIdentifier(enumIdentifier) && enumIdentifier.text === enumName.text;
}
function reflectEnumAssignment(expression) {
  const memberName = expression.left.argumentExpression;
  if (!ts5.isPropertyName(memberName))
    return null;
  return { name: memberName, initializer: expression.right };
}
function isAssignmentStatement(statement) {
  return ts5.isExpressionStatement(statement) && isAssignment2(statement.expression) && ts5.isIdentifier(statement.expression.left);
}
function getIifeBody(expression) {
  const call = stripParentheses(expression);
  if (!ts5.isCallExpression(call)) {
    return void 0;
  }
  const fn = stripParentheses(call.expression);
  if (!ts5.isFunctionExpression(fn) && !ts5.isArrowFunction(fn)) {
    return void 0;
  }
  return fn.body;
}
function isAssignment2(node) {
  return ts5.isBinaryExpression(node) && node.operatorToken.kind === ts5.SyntaxKind.EqualsToken;
}
function isClassDecorateCall(call, matches) {
  const helperArgs = call.arguments[0];
  if (helperArgs === void 0 || !ts5.isArrayLiteralExpression(helperArgs)) {
    return false;
  }
  const target = call.arguments[1];
  return target !== void 0 && ts5.isIdentifier(target) && matches(target);
}
function isMemberDecorateCall(call, matches) {
  const helperArgs = call.arguments[0];
  if (helperArgs === void 0 || !ts5.isArrayLiteralExpression(helperArgs)) {
    return false;
  }
  const target = call.arguments[1];
  if (target === void 0 || !ts5.isPropertyAccessExpression(target) || !ts5.isIdentifier(target.expression) || !matches(target.expression) || target.name.text !== "prototype") {
    return false;
  }
  const memberName = call.arguments[2];
  return memberName !== void 0 && ts5.isStringLiteral(memberName);
}
function getPropertyValueFromSymbol(propSymbol) {
  const propIdentifier = propSymbol.valueDeclaration;
  const parent = propIdentifier && propIdentifier.parent;
  return parent && ts5.isBinaryExpression(parent) ? parent.right : void 0;
}
function getCalleeName(call) {
  if (ts5.isIdentifier(call.expression)) {
    return stripDollarSuffix(call.expression.text);
  }
  if (ts5.isPropertyAccessExpression(call.expression)) {
    return stripDollarSuffix(call.expression.name.text);
  }
  return null;
}
function isInitializedVariableClassDeclaration(node) {
  return isNamedVariableDeclaration(node) && node.initializer !== void 0;
}
function skipClassAliases(node) {
  let expression = node.initializer;
  while (isAssignment2(expression)) {
    expression = expression.right;
  }
  return expression;
}
function getInnerClassDeclaration(expression) {
  if (ts5.isClassExpression(expression) && hasNameIdentifier(expression)) {
    return expression;
  }
  const iifeBody = getIifeBody(expression);
  if (iifeBody === void 0) {
    return null;
  }
  if (!ts5.isBlock(iifeBody)) {
    return ts5.isClassExpression(iifeBody) && isNamedDeclaration(iifeBody) ? iifeBody : null;
  } else {
    for (const statement of iifeBody.statements) {
      if (isNamedClassDeclaration(statement) || isNamedFunctionDeclaration(statement)) {
        return statement;
      }
      if (ts5.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (isInitializedVariableClassDeclaration(declaration)) {
            const expression2 = skipClassAliases(declaration);
            if (ts5.isClassExpression(expression2) && hasNameIdentifier(expression2)) {
              return expression2;
            }
          }
        }
      }
    }
  }
  return null;
}
function getDecoratorArgs(node) {
  const argsProperty = node.properties.filter(ts5.isPropertyAssignment).find((property2) => getNameText(property2.name) === "args");
  const argsExpression = argsProperty && argsProperty.initializer;
  return argsExpression && ts5.isArrayLiteralExpression(argsExpression) ? Array.from(argsExpression.elements) : [];
}
function isPropertyAccess(node) {
  return !!node.parent && ts5.isBinaryExpression(node.parent) && ts5.isPropertyAccessExpression(node);
}
function isThisAssignment(node) {
  return ts5.isBinaryExpression(node) && ts5.isPropertyAccessExpression(node.left) && node.left.expression.kind === ts5.SyntaxKind.ThisKeyword;
}
function isNamedDeclaration(node) {
  const anyNode = node;
  return !!anyNode.name && ts5.isIdentifier(anyNode.name);
}
function isClassMemberType(node) {
  return (ts5.isClassElement(node) || isPropertyAccess(node) || ts5.isBinaryExpression(node)) && !ts5.isIndexSignatureDeclaration(node);
}
function getFarLeftHandSideOfAssignment(declaration) {
  let node = declaration.parent;
  if (isAssignment2(node) && ts5.isIdentifier(node.left)) {
    node = node.parent;
  }
  return ts5.isVariableDeclaration(node) ? node : void 0;
}
function getContainingVariableDeclaration(node) {
  node = node.parent;
  while (node !== void 0) {
    if (isNamedVariableDeclaration(node)) {
      return node;
    }
    node = node.parent;
  }
  return void 0;
}
function isSynthesizedConstructor(constructor) {
  if (!constructor.body)
    return false;
  const firstStatement = constructor.body.statements[0];
  if (!firstStatement || !ts5.isExpressionStatement(firstStatement))
    return false;
  return isSynthesizedSuperCall(firstStatement.expression);
}
function isSynthesizedSuperCall(expression) {
  if (!ts5.isCallExpression(expression))
    return false;
  if (expression.expression.kind !== ts5.SyntaxKind.SuperKeyword)
    return false;
  if (expression.arguments.length !== 1)
    return false;
  const argument = expression.arguments[0];
  return ts5.isSpreadElement(argument) && ts5.isIdentifier(argument.expression) && argument.expression.text === "arguments";
}
function getContainingStatement(node) {
  while (node.parent) {
    if (ts5.isBlock(node.parent) || ts5.isSourceFile(node.parent)) {
      break;
    }
    node = node.parent;
  }
  return node;
}
function getRootFileOrFail(bundle) {
  const rootFile = bundle.program.getSourceFile(bundle.path);
  if (rootFile === void 0) {
    throw new Error(`The given rootPath ${rootFile} is not a file of the program.`);
  }
  return rootFile;
}
function getNonRootPackageFiles(bundle) {
  const rootFile = bundle.program.getSourceFile(bundle.path);
  return bundle.program.getSourceFiles().filter((f) => f !== rootFile && isWithinPackage(bundle.package, absoluteFromSourceFile(f)));
}
function isTopLevel(node) {
  while (node = node.parent) {
    if (ts5.isBlock(node)) {
      return false;
    }
  }
  return true;
}
function getOuterNodeFromInnerDeclaration(node) {
  if (!ts5.isFunctionDeclaration(node) && !ts5.isClassDeclaration(node) && !ts5.isVariableStatement(node)) {
    return null;
  }
  let outerNode = node.parent;
  if (!outerNode || !ts5.isBlock(outerNode))
    return null;
  outerNode = outerNode.parent;
  if (!outerNode || !ts5.isFunctionExpression(outerNode) && !ts5.isArrowFunction(outerNode)) {
    return null;
  }
  outerNode = outerNode.parent;
  if (outerNode && ts5.isParenthesizedExpression(outerNode))
    outerNode = outerNode.parent;
  if (!outerNode || !ts5.isCallExpression(outerNode))
    return null;
  outerNode = outerNode.parent;
  if (outerNode && ts5.isParenthesizedExpression(outerNode))
    outerNode = outerNode.parent;
  while (isAssignment2(outerNode.parent)) {
    outerNode = outerNode.parent;
  }
  return outerNode;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/host/esm5_host.mjs
import ts6 from "typescript";
var Esm5ReflectionHost = class extends Esm2015ReflectionHost {
  getBaseClassExpression(clazz) {
    const superBaseClassExpression = super.getBaseClassExpression(clazz);
    if (superBaseClassExpression !== null) {
      return superBaseClassExpression;
    }
    const iife = getIifeFn(this.getClassSymbol(clazz));
    if (iife === null)
      return null;
    if (iife.parameters.length !== 1 || !isSuperIdentifier(iife.parameters[0].name)) {
      return null;
    }
    if (!ts6.isCallExpression(iife.parent)) {
      return null;
    }
    return iife.parent.arguments[0];
  }
  getDeclarationOfIdentifier(id) {
    const declaration = super.getDeclarationOfIdentifier(id);
    if (declaration === null) {
      const nonEmittedNorImportedTsHelperDeclaration = getTsHelperFnFromIdentifier(id);
      if (nonEmittedNorImportedTsHelperDeclaration !== null) {
        return {
          kind: 1,
          node: id,
          known: nonEmittedNorImportedTsHelperDeclaration,
          viaModule: null
        };
      }
    }
    if (declaration === null || declaration.node === null || declaration.known !== null) {
      return declaration;
    }
    if (!ts6.isVariableDeclaration(declaration.node) || declaration.node.initializer !== void 0 || !ts6.isBlock(declaration.node.parent.parent.parent)) {
      return declaration;
    }
    const block = declaration.node.parent.parent.parent;
    const aliasSymbol = this.checker.getSymbolAtLocation(declaration.node.name);
    for (let i = 0; i < block.statements.length; i++) {
      const statement = block.statements[i];
      if (isAssignmentStatement(statement) && ts6.isIdentifier(statement.expression.left) && ts6.isIdentifier(statement.expression.right) && this.checker.getSymbolAtLocation(statement.expression.left) === aliasSymbol) {
        return this.getDeclarationOfIdentifier(statement.expression.right);
      }
    }
    return declaration;
  }
  getDefinitionOfFunction(node) {
    const definition = super.getDefinitionOfFunction(node);
    if (definition === null) {
      return null;
    }
    if (definition.body !== null) {
      let lookingForInitializers = true;
      const statements = definition.body.filter((s) => {
        lookingForInitializers = lookingForInitializers && captureParamInitializer(s, definition.parameters);
        return !lookingForInitializers;
      });
      definition.body = statements;
    }
    return definition;
  }
  detectKnownDeclaration(decl) {
    decl = super.detectKnownDeclaration(decl);
    if (decl.known === null && decl.node !== null) {
      decl.known = getTsHelperFnFromDeclaration(decl.node);
    }
    return decl;
  }
  getClassSymbolFromInnerDeclaration(declaration) {
    const classSymbol = super.getClassSymbolFromInnerDeclaration(declaration);
    if (classSymbol !== void 0) {
      return classSymbol;
    }
    if (!isNamedFunctionDeclaration(declaration)) {
      return void 0;
    }
    const outerNode = getOuterNodeFromInnerDeclaration(declaration);
    if (outerNode === null || !hasNameIdentifier(outerNode)) {
      return void 0;
    }
    return this.createClassSymbol(outerNode.name, declaration);
  }
  getConstructorParameterDeclarations(classSymbol) {
    const constructor = classSymbol.implementation.valueDeclaration;
    if (!ts6.isFunctionDeclaration(constructor))
      return null;
    if (constructor.parameters.length > 0) {
      return Array.from(constructor.parameters);
    }
    if (this.isSynthesizedConstructor(constructor)) {
      return null;
    }
    return [];
  }
  getParamInfoFromStaticProperty(paramDecoratorsProperty) {
    const paramDecorators = getPropertyValueFromSymbol(paramDecoratorsProperty);
    const returnStatement = getReturnStatement(paramDecorators);
    const expression = returnStatement ? returnStatement.expression : paramDecorators;
    if (expression && ts6.isArrayLiteralExpression(expression)) {
      const elements = expression.elements;
      return elements.map(reflectArrayElement).map((paramInfo) => {
        const typeExpression = paramInfo && paramInfo.has("type") ? paramInfo.get("type") : null;
        const decoratorInfo = paramInfo && paramInfo.has("decorators") ? paramInfo.get("decorators") : null;
        const decorators = decoratorInfo && this.reflectDecorators(decoratorInfo);
        return { typeExpression, decorators };
      });
    } else if (paramDecorators !== void 0) {
      this.logger.warn("Invalid constructor parameter decorator in " + paramDecorators.getSourceFile().fileName + ":\n", paramDecorators.getText());
    }
    return null;
  }
  reflectMembers(symbol, decorators, isStatic) {
    const node = symbol.valueDeclaration || symbol.declarations && symbol.declarations[0];
    const propertyDefinition = node && getPropertyDefinition(node);
    if (propertyDefinition) {
      const members2 = [];
      if (propertyDefinition.setter) {
        members2.push({
          node,
          implementation: propertyDefinition.setter,
          kind: ClassMemberKind.Setter,
          type: null,
          name: symbol.name,
          nameNode: null,
          value: null,
          isStatic: isStatic || false,
          decorators: decorators || []
        });
        decorators = void 0;
      }
      if (propertyDefinition.getter) {
        members2.push({
          node,
          implementation: propertyDefinition.getter,
          kind: ClassMemberKind.Getter,
          type: null,
          name: symbol.name,
          nameNode: null,
          value: null,
          isStatic: isStatic || false,
          decorators: decorators || []
        });
      }
      return members2;
    }
    const members = super.reflectMembers(symbol, decorators, isStatic);
    members && members.forEach((member) => {
      if (member && member.kind === ClassMemberKind.Method && member.isStatic && member.node && ts6.isPropertyAccessExpression(member.node) && member.node.parent && ts6.isBinaryExpression(member.node.parent) && ts6.isFunctionExpression(member.node.parent.right)) {
        member.implementation = member.node.parent.right;
      }
    });
    return members;
  }
  getStatementsForClass(classSymbol) {
    const classDeclarationParent = classSymbol.implementation.valueDeclaration.parent;
    return ts6.isBlock(classDeclarationParent) ? Array.from(classDeclarationParent.statements) : [];
  }
  isSynthesizedConstructor(constructor) {
    if (!constructor.body)
      return false;
    const firstStatement = constructor.body.statements[0];
    if (!firstStatement)
      return false;
    return this.isSynthesizedSuperThisAssignment(firstStatement) || this.isSynthesizedSuperReturnStatement(firstStatement);
  }
  isSynthesizedSuperThisAssignment(statement) {
    if (!ts6.isVariableStatement(statement))
      return false;
    const variableDeclarations = statement.declarationList.declarations;
    if (variableDeclarations.length !== 1)
      return false;
    const variableDeclaration = variableDeclarations[0];
    if (!ts6.isIdentifier(variableDeclaration.name) || !variableDeclaration.name.text.startsWith("_this"))
      return false;
    const initializer = variableDeclaration.initializer;
    if (!initializer)
      return false;
    return this.isSynthesizedDefaultSuperCall(initializer);
  }
  isSynthesizedSuperReturnStatement(statement) {
    if (!ts6.isReturnStatement(statement))
      return false;
    const expression = statement.expression;
    if (!expression)
      return false;
    return this.isSynthesizedDefaultSuperCall(expression);
  }
  isSynthesizedDefaultSuperCall(expression) {
    if (!isBinaryExpr(expression, ts6.SyntaxKind.BarBarToken))
      return false;
    if (expression.right.kind !== ts6.SyntaxKind.ThisKeyword)
      return false;
    const left = expression.left;
    if (isBinaryExpr(left, ts6.SyntaxKind.AmpersandAmpersandToken)) {
      return isSuperNotNull(left.left) && this.isSuperApplyCall(left.right);
    } else {
      return this.isSuperApplyCall(left);
    }
  }
  isSuperApplyCall(expression) {
    if (!ts6.isCallExpression(expression) || expression.arguments.length !== 2)
      return false;
    const targetFn = expression.expression;
    if (!ts6.isPropertyAccessExpression(targetFn))
      return false;
    if (!isSuperIdentifier(targetFn.expression))
      return false;
    if (targetFn.name.text !== "apply")
      return false;
    const thisArgument = expression.arguments[0];
    if (thisArgument.kind !== ts6.SyntaxKind.ThisKeyword)
      return false;
    const argumentsExpr = expression.arguments[1];
    if (isArgumentsIdentifier(argumentsExpr)) {
      return true;
    }
    return this.isSpreadArgumentsExpression(argumentsExpr);
  }
  isSpreadArgumentsExpression(expression) {
    const call = this.extractKnownHelperCall(expression);
    if (call === null) {
      return false;
    }
    if (call.helper === KnownDeclaration.TsHelperSpread) {
      return call.args.length === 1 && isArgumentsIdentifier(call.args[0]);
    } else if (call.helper === KnownDeclaration.TsHelperSpreadArray) {
      if (call.args.length !== 2 && call.args.length !== 3) {
        return false;
      }
      const firstArg = call.args[0];
      if (!ts6.isArrayLiteralExpression(firstArg) || firstArg.elements.length !== 0) {
        return false;
      }
      const secondArg = this.extractKnownHelperCall(call.args[1]);
      if (secondArg === null || secondArg.helper !== KnownDeclaration.TsHelperRead) {
        return false;
      }
      return secondArg.args.length === 1 && isArgumentsIdentifier(secondArg.args[0]);
    } else {
      return false;
    }
  }
  extractKnownHelperCall(expression) {
    if (!ts6.isCallExpression(expression)) {
      return null;
    }
    const receiverExpr = expression.expression;
    let receiver = null;
    if (ts6.isIdentifier(receiverExpr)) {
      receiver = this.getDeclarationOfIdentifier(receiverExpr);
    } else if (ts6.isPropertyAccessExpression(receiverExpr) && ts6.isIdentifier(receiverExpr.name)) {
      receiver = this.getDeclarationOfIdentifier(receiverExpr.name);
    }
    if (receiver === null || receiver.known === null) {
      return null;
    }
    return {
      helper: receiver.known,
      args: expression.arguments
    };
  }
};
function getPropertyDefinition(node) {
  if (!ts6.isCallExpression(node))
    return null;
  const fn = node.expression;
  if (!ts6.isPropertyAccessExpression(fn) || !ts6.isIdentifier(fn.expression) || fn.expression.text !== "Object" || fn.name.text !== "defineProperty")
    return null;
  const descriptor = node.arguments[2];
  if (!descriptor || !ts6.isObjectLiteralExpression(descriptor))
    return null;
  return {
    setter: readPropertyFunctionExpression(descriptor, "set"),
    getter: readPropertyFunctionExpression(descriptor, "get")
  };
}
function readPropertyFunctionExpression(object, name) {
  const property2 = object.properties.find((p) => ts6.isPropertyAssignment(p) && ts6.isIdentifier(p.name) && p.name.text === name);
  return property2 && ts6.isFunctionExpression(property2.initializer) && property2.initializer || null;
}
function getReturnStatement(declaration) {
  return declaration && ts6.isFunctionExpression(declaration) ? declaration.body.statements.find(ts6.isReturnStatement) : void 0;
}
function reflectArrayElement(element) {
  return ts6.isObjectLiteralExpression(element) ? reflectObjectLiteral(element) : null;
}
function isArgumentsIdentifier(expression) {
  return ts6.isIdentifier(expression) && expression.text === "arguments";
}
function isSuperNotNull(expression) {
  return isBinaryExpr(expression, ts6.SyntaxKind.ExclamationEqualsEqualsToken) && isSuperIdentifier(expression.left);
}
function isBinaryExpr(expression, operator) {
  return ts6.isBinaryExpression(expression) && expression.operatorToken.kind === operator;
}
function isSuperIdentifier(node) {
  return ts6.isIdentifier(node) && node.text.startsWith("_super");
}
function captureParamInitializer(statement, parameters) {
  if (ts6.isIfStatement(statement) && isUndefinedComparison(statement.expression) && ts6.isBlock(statement.thenStatement) && statement.thenStatement.statements.length === 1) {
    const ifStatementComparison = statement.expression;
    const thenStatement = statement.thenStatement.statements[0];
    if (isAssignmentStatement(thenStatement)) {
      const comparisonName = ifStatementComparison.left.text;
      const assignmentName = thenStatement.expression.left.text;
      if (comparisonName === assignmentName) {
        const parameter = parameters.find((p) => p.name === comparisonName);
        if (parameter) {
          parameter.initializer = thenStatement.expression.right;
          return true;
        }
      }
    }
  }
  return false;
}
function isUndefinedComparison(expression) {
  return ts6.isBinaryExpression(expression) && expression.operatorToken.kind === ts6.SyntaxKind.EqualsEqualsEqualsToken && ts6.isVoidExpression(expression.right) && ts6.isIdentifier(expression.left);
}
function getIifeFn(classSymbol) {
  if (classSymbol === void 0) {
    return null;
  }
  const innerDeclaration = classSymbol.implementation.valueDeclaration;
  const iifeBody = innerDeclaration.parent;
  if (!ts6.isBlock(iifeBody)) {
    return null;
  }
  const iifeWrapper = iifeBody.parent;
  return iifeWrapper && ts6.isFunctionExpression(iifeWrapper) ? iifeWrapper : null;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/host/umd_host.mjs
var UmdReflectionHost = class extends Esm5ReflectionHost {
  constructor(logger, isCore, src, dts = null) {
    super(logger, isCore, src, dts);
    this.umdModules = new FactoryMap((sf) => this.computeUmdModule(sf));
    this.umdExports = new FactoryMap((sf) => this.computeExportsOfUmdModule(sf));
    this.umdImportPaths = new FactoryMap((param) => this.computeImportPath(param));
    this.program = src.program;
    this.compilerHost = src.host;
  }
  getImportOfIdentifier(id) {
    const nsIdentifier = findNamespaceOfIdentifier(id);
    const importParameter = nsIdentifier && this.findUmdImportParameter(nsIdentifier);
    const from = importParameter && this.getUmdImportPath(importParameter);
    return from !== null ? { from, name: id.text } : null;
  }
  getDeclarationOfIdentifier(id) {
    const declaration = this.getExportsDeclaration(id) || this.getUmdModuleDeclaration(id) || this.getUmdDeclaration(id);
    if (declaration !== null) {
      return declaration;
    }
    const superDeclaration = super.getDeclarationOfIdentifier(id);
    if (superDeclaration === null) {
      return null;
    }
    const outerNode = getOuterNodeFromInnerDeclaration(superDeclaration.node);
    if (outerNode === null) {
      return superDeclaration;
    }
    if (!isExportsAssignment(outerNode)) {
      return superDeclaration;
    }
    return {
      kind: 1,
      node: outerNode.left,
      implementation: outerNode.right,
      known: null,
      viaModule: null
    };
  }
  getExportsOfModule(module) {
    return super.getExportsOfModule(module) || this.umdExports.get(module.getSourceFile());
  }
  getUmdModule(sourceFile) {
    if (sourceFile.isDeclarationFile) {
      return null;
    }
    return this.umdModules.get(sourceFile);
  }
  getUmdImportPath(importParameter) {
    return this.umdImportPaths.get(importParameter);
  }
  getModuleStatements(sourceFile) {
    const umdModule = this.getUmdModule(sourceFile);
    return umdModule !== null ? Array.from(umdModule.factoryFn.body.statements) : [];
  }
  getClassSymbolFromOuterDeclaration(declaration) {
    const superSymbol = super.getClassSymbolFromOuterDeclaration(declaration);
    if (superSymbol) {
      return superSymbol;
    }
    if (!isExportsDeclaration(declaration)) {
      return void 0;
    }
    let initializer = skipAliases(declaration.parent.right);
    if (ts7.isIdentifier(initializer)) {
      const implementation = this.getDeclarationOfIdentifier(initializer);
      if (implementation !== null) {
        const implementationSymbol = this.getClassSymbol(implementation.node);
        if (implementationSymbol !== null) {
          return implementationSymbol;
        }
      }
    }
    const innerDeclaration = getInnerClassDeclaration(initializer);
    if (innerDeclaration !== null) {
      return this.createClassSymbol(declaration.name, innerDeclaration);
    }
    return void 0;
  }
  getClassSymbolFromInnerDeclaration(declaration) {
    const superClassSymbol = super.getClassSymbolFromInnerDeclaration(declaration);
    if (superClassSymbol !== void 0) {
      return superClassSymbol;
    }
    if (!isNamedFunctionDeclaration(declaration)) {
      return void 0;
    }
    const outerNode = getOuterNodeFromInnerDeclaration(declaration);
    if (outerNode === null || !isExportsAssignment(outerNode)) {
      return void 0;
    }
    return this.createClassSymbol(outerNode.left.name, declaration);
  }
  addClassSymbolsFromStatement(classes, statement) {
    super.addClassSymbolsFromStatement(classes, statement);
    if (isExportsStatement(statement)) {
      const classSymbol = this.getClassSymbol(statement.expression.left);
      if (classSymbol) {
        classes.set(classSymbol.implementation, classSymbol);
      }
    }
  }
  preprocessStatement(statement) {
    super.preprocessStatement(statement);
    if (!isExportsStatement(statement)) {
      return;
    }
    const declaration = statement.expression.left;
    const initializer = statement.expression.right;
    if (!isAssignment2(initializer) || !ts7.isIdentifier(initializer.left) || !this.isClass(declaration)) {
      return;
    }
    const aliasedIdentifier = initializer.left;
    const aliasedDeclaration = this.getDeclarationOfIdentifier(aliasedIdentifier);
    if (aliasedDeclaration === null || aliasedDeclaration.node === null) {
      throw new Error(`Unable to locate declaration of ${aliasedIdentifier.text} in "${statement.getText()}"`);
    }
    this.aliasedClassDeclarations.set(aliasedDeclaration.node, declaration.name);
  }
  computeUmdModule(sourceFile) {
    if (sourceFile.statements.length !== 1) {
      throw new Error(`Expected UMD module file (${sourceFile.fileName}) to contain exactly one statement, but found ${sourceFile.statements.length}.`);
    }
    return parseStatementForUmdModule(sourceFile.statements[0]);
  }
  computeExportsOfUmdModule(sourceFile) {
    const moduleMap = new Map();
    for (const statement of this.getModuleStatements(sourceFile)) {
      if (isExportsStatement(statement)) {
        const exportDeclaration = this.extractBasicUmdExportDeclaration(statement);
        if (!moduleMap.has(exportDeclaration.name)) {
          moduleMap.set(exportDeclaration.name, exportDeclaration.declaration);
        }
      } else if (isWildcardReexportStatement(statement)) {
        const reexports = this.extractUmdWildcardReexports(statement, sourceFile);
        for (const reexport of reexports) {
          moduleMap.set(reexport.name, reexport.declaration);
        }
      } else if (isDefinePropertyReexportStatement(statement)) {
        const exportDeclaration = this.extractUmdDefinePropertyExportDeclaration(statement);
        if (exportDeclaration !== null) {
          moduleMap.set(exportDeclaration.name, exportDeclaration.declaration);
        }
      }
    }
    return moduleMap;
  }
  computeImportPath(param) {
    const umdModule = this.getUmdModule(param.getSourceFile());
    if (umdModule === null) {
      return null;
    }
    const imports = getImportsOfUmdModule(umdModule);
    if (imports === null) {
      return null;
    }
    let importPath = null;
    for (const i of imports) {
      this.umdImportPaths.set(i.parameter, i.path);
      if (i.parameter === param) {
        importPath = i.path;
      }
    }
    return importPath;
  }
  extractBasicUmdExportDeclaration(statement) {
    var _a;
    const name = statement.expression.left.name.text;
    const exportExpression = skipAliases(statement.expression.right);
    const declaration = (_a = this.getDeclarationOfExpression(exportExpression)) != null ? _a : {
      kind: 1,
      node: statement.expression.left,
      implementation: statement.expression.right,
      known: null,
      viaModule: null
    };
    return { name, declaration };
  }
  extractUmdWildcardReexports(statement, containingFile) {
    const reexportArg = statement.expression.arguments[0];
    const requireCall = isRequireCall(reexportArg) ? reexportArg : ts7.isIdentifier(reexportArg) ? findRequireCallReference(reexportArg, this.checker) : null;
    let importPath = null;
    if (requireCall !== null) {
      importPath = requireCall.arguments[0].text;
    } else if (ts7.isIdentifier(reexportArg)) {
      const importParameter = this.findUmdImportParameter(reexportArg);
      importPath = importParameter && this.getUmdImportPath(importParameter);
    }
    if (importPath === null) {
      return [];
    }
    const importedFile = this.resolveModuleName(importPath, containingFile);
    if (importedFile === void 0) {
      return [];
    }
    const importedExports = this.getExportsOfModule(importedFile);
    if (importedExports === null) {
      return [];
    }
    const viaModule = stripExtension(importedFile.fileName);
    const reexports = [];
    importedExports.forEach((decl, name) => reexports.push({ name, declaration: __spreadProps(__spreadValues({}, decl), { viaModule }) }));
    return reexports;
  }
  extractUmdDefinePropertyExportDeclaration(statement) {
    const args = statement.expression.arguments;
    const name = args[1].text;
    const getterFnExpression = extractGetterFnExpression(statement);
    if (getterFnExpression === null) {
      return null;
    }
    const declaration = this.getDeclarationOfExpression(getterFnExpression);
    if (declaration !== null) {
      return { name, declaration };
    }
    return {
      name,
      declaration: {
        kind: 1,
        node: args[1],
        implementation: getterFnExpression,
        known: null,
        viaModule: null
      }
    };
  }
  findUmdImportParameter(id) {
    const symbol = id && this.checker.getSymbolAtLocation(id) || null;
    const declaration = symbol && symbol.valueDeclaration;
    return declaration && ts7.isParameter(declaration) ? declaration : null;
  }
  getUmdDeclaration(id) {
    const nsIdentifier = findNamespaceOfIdentifier(id);
    if (nsIdentifier === null) {
      return null;
    }
    if (nsIdentifier.parent.parent && isExportsAssignment(nsIdentifier.parent.parent)) {
      const initializer = nsIdentifier.parent.parent.right;
      if (ts7.isIdentifier(initializer)) {
        return this.getDeclarationOfIdentifier(initializer);
      }
      return this.detectKnownDeclaration({
        kind: 1,
        node: nsIdentifier.parent.parent.left,
        implementation: skipAliases(nsIdentifier.parent.parent.right),
        viaModule: null,
        known: null
      });
    }
    const moduleDeclaration = this.getUmdModuleDeclaration(nsIdentifier);
    if (moduleDeclaration === null || moduleDeclaration.node === null || !ts7.isSourceFile(moduleDeclaration.node)) {
      return null;
    }
    const moduleExports = this.getExportsOfModule(moduleDeclaration.node);
    if (moduleExports === null) {
      return null;
    }
    const declaration = moduleExports.get(id.text);
    if (!moduleExports.has(id.text)) {
      return null;
    }
    const viaModule = declaration.viaModule === null ? moduleDeclaration.viaModule : declaration.viaModule;
    return __spreadProps(__spreadValues({}, declaration), { viaModule, known: getTsHelperFnFromIdentifier(id) });
  }
  getExportsDeclaration(id) {
    if (!isExportsIdentifier(id)) {
      return null;
    }
    const exportsSymbol = this.checker.getSymbolsInScope(id, ts7.SymbolFlags.Variable).find((symbol) => symbol.name === "exports");
    const node = (exportsSymbol == null ? void 0 : exportsSymbol.valueDeclaration) !== void 0 && !ts7.isFunctionExpression(exportsSymbol.valueDeclaration.parent) ? exportsSymbol.valueDeclaration : id.getSourceFile();
    return {
      kind: 0,
      node,
      viaModule: null,
      known: null,
      identity: null
    };
  }
  getUmdModuleDeclaration(id) {
    const importPath = this.getImportPathFromParameter(id) || this.getImportPathFromRequireCall(id);
    if (importPath === null) {
      return null;
    }
    const module = this.resolveModuleName(importPath, id.getSourceFile());
    if (module === void 0) {
      return null;
    }
    const viaModule = isExternalImport(importPath) ? importPath : null;
    return { kind: 0, node: module, viaModule, known: null, identity: null };
  }
  getImportPathFromParameter(id) {
    const importParameter = this.findUmdImportParameter(id);
    if (importParameter === null) {
      return null;
    }
    return this.getUmdImportPath(importParameter);
  }
  getImportPathFromRequireCall(id) {
    const requireCall = findRequireCallReference(id, this.checker);
    if (requireCall === null) {
      return null;
    }
    return requireCall.arguments[0].text;
  }
  getDeclarationOfExpression(expression) {
    const inner = getInnerClassDeclaration(expression);
    if (inner !== null) {
      const outer = getOuterNodeFromInnerDeclaration(inner);
      if (outer !== null && isExportsAssignment(outer)) {
        return {
          kind: 1,
          node: outer.left,
          implementation: inner,
          known: null,
          viaModule: null
        };
      }
    }
    return super.getDeclarationOfExpression(expression);
  }
  resolveModuleName(moduleName, containingFile) {
    if (this.compilerHost.resolveModuleNames) {
      const moduleInfo = this.compilerHost.resolveModuleNames([moduleName], containingFile.fileName, void 0, void 0, this.program.getCompilerOptions())[0];
      return moduleInfo && this.program.getSourceFile(absoluteFrom(moduleInfo.resolvedFileName));
    } else {
      const moduleInfo = ts7.resolveModuleName(moduleName, containingFile.fileName, this.program.getCompilerOptions(), this.compilerHost);
      return moduleInfo.resolvedModule && this.program.getSourceFile(absoluteFrom(moduleInfo.resolvedModule.resolvedFileName));
    }
  }
};
function parseStatementForUmdModule(statement) {
  const wrapper = getUmdWrapper(statement);
  if (wrapper === null)
    return null;
  const factoryFnParamIndex = wrapper.fn.parameters.findIndex((parameter) => ts7.isIdentifier(parameter.name) && parameter.name.text === "factory");
  if (factoryFnParamIndex === -1)
    return null;
  const factoryFn = stripParentheses(wrapper.call.arguments[factoryFnParamIndex]);
  if (!factoryFn || !ts7.isFunctionExpression(factoryFn))
    return null;
  return { wrapperFn: wrapper.fn, factoryFn };
}
function getUmdWrapper(statement) {
  if (!ts7.isExpressionStatement(statement))
    return null;
  if (ts7.isParenthesizedExpression(statement.expression) && ts7.isCallExpression(statement.expression.expression) && ts7.isFunctionExpression(statement.expression.expression.expression)) {
    const call = statement.expression.expression;
    const fn = statement.expression.expression.expression;
    return { call, fn };
  }
  if (ts7.isCallExpression(statement.expression) && ts7.isParenthesizedExpression(statement.expression.expression) && ts7.isFunctionExpression(statement.expression.expression.expression)) {
    const call = statement.expression;
    const fn = statement.expression.expression.expression;
    return { call, fn };
  }
  return null;
}
function getImportsOfUmdModule(umdModule) {
  const imports = [];
  for (let i = 1; i < umdModule.factoryFn.parameters.length; i++) {
    imports.push({
      parameter: umdModule.factoryFn.parameters[i],
      path: getRequiredModulePath(umdModule.wrapperFn, i)
    });
  }
  return imports;
}
function getRequiredModulePath(wrapperFn, paramIndex) {
  const statement = wrapperFn.body.statements[0];
  if (!ts7.isExpressionStatement(statement)) {
    throw new Error("UMD wrapper body is not an expression statement:\n" + wrapperFn.body.getText());
  }
  const modulePaths = [];
  findModulePaths(statement.expression);
  return modulePaths[paramIndex - 1];
  function findModulePaths(node) {
    if (isRequireCall(node)) {
      const argument = node.arguments[0];
      if (ts7.isStringLiteral(argument)) {
        modulePaths.push(argument.text);
      }
    } else {
      node.forEachChild(findModulePaths);
    }
  }
}
function isExportsIdentifier(node) {
  return ts7.isIdentifier(node) && node.text === "exports";
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/packages/entry_point.mjs
var SUPPORTED_FORMAT_PROPERTIES = ["fesm2015", "fesm5", "es2015", "esm2015", "esm5", "main", "module", "browser"];
var NO_ENTRY_POINT = "no-entry-point";
var IGNORED_ENTRY_POINT = "ignored-entry-point";
var INCOMPATIBLE_ENTRY_POINT = "incompatible-entry-point";
function getEntryPointInfo(fs, config, logger, packagePath, entryPointPath) {
  const packagePackageJsonPath = fs.resolve(packagePath, "package.json");
  const entryPointPackageJsonPath = fs.resolve(entryPointPath, "package.json");
  const loadedPackagePackageJson = loadPackageJson(fs, packagePackageJsonPath);
  const loadedEntryPointPackageJson = packagePackageJsonPath === entryPointPackageJsonPath ? loadedPackagePackageJson : loadPackageJson(fs, entryPointPackageJsonPath);
  const { packageName, packageVersion } = getPackageNameAndVersion(fs, packagePath, loadedPackagePackageJson, loadedEntryPointPackageJson);
  const packageConfig = config.getPackageConfig(packageName, packagePath, packageVersion);
  const entryPointConfig = packageConfig.entryPoints.get(entryPointPath);
  let entryPointPackageJson;
  if (entryPointConfig === void 0) {
    if (!fs.exists(entryPointPackageJsonPath)) {
      return NO_ENTRY_POINT;
    } else if (loadedEntryPointPackageJson === null) {
      logger.warn(`Failed to read entry point info from invalid 'package.json' file: ${entryPointPackageJsonPath}`);
      return INCOMPATIBLE_ENTRY_POINT;
    } else {
      entryPointPackageJson = loadedEntryPointPackageJson;
    }
  } else if (entryPointConfig.ignore === true) {
    return IGNORED_ENTRY_POINT;
  } else {
    entryPointPackageJson = mergeConfigAndPackageJson(fs, loadedEntryPointPackageJson, entryPointConfig, packagePath, entryPointPath);
  }
  const typings = entryPointPackageJson.typings || entryPointPackageJson.types || guessTypingsFromPackageJson(fs, entryPointPath, entryPointPackageJson);
  if (typeof typings !== "string") {
    return INCOMPATIBLE_ENTRY_POINT;
  }
  const metadataPath = fs.resolve(entryPointPath, typings.replace(/\.d\.ts$/, "") + ".metadata.json");
  const compiledByAngular = entryPointConfig !== void 0 || fs.exists(metadataPath);
  const entryPointInfo = {
    name: entryPointPackageJson.name,
    path: entryPointPath,
    packageName,
    packagePath,
    packageJson: entryPointPackageJson,
    typings: fs.resolve(entryPointPath, typings),
    compiledByAngular,
    ignoreMissingDependencies: entryPointConfig !== void 0 ? !!entryPointConfig.ignoreMissingDependencies : false,
    generateDeepReexports: entryPointConfig !== void 0 ? !!entryPointConfig.generateDeepReexports : false
  };
  return entryPointInfo;
}
function isEntryPoint(result) {
  return result !== NO_ENTRY_POINT && result !== INCOMPATIBLE_ENTRY_POINT && result !== IGNORED_ENTRY_POINT;
}
function getEntryPointFormat(fs, entryPoint, property2) {
  switch (property2) {
    case "fesm2015":
      return "esm2015";
    case "fesm5":
      return "esm5";
    case "es2015":
      return "esm2015";
    case "esm2015":
      return "esm2015";
    case "esm5":
      return "esm5";
    case "browser":
      const browserFile = entryPoint.packageJson["browser"];
      if (typeof browserFile !== "string") {
        return void 0;
      }
      return sniffModuleFormat(fs, fs.join(entryPoint.path, browserFile));
    case "main":
      const mainFile = entryPoint.packageJson["main"];
      if (mainFile === void 0) {
        return void 0;
      }
      return sniffModuleFormat(fs, fs.join(entryPoint.path, mainFile));
    case "module":
      const moduleFilePath = entryPoint.packageJson["module"];
      if (typeof moduleFilePath === "string" && moduleFilePath.includes("esm2015")) {
        return `esm2015`;
      }
      return "esm5";
    default:
      return void 0;
  }
}
function loadPackageJson(fs, packageJsonPath) {
  try {
    return JSON.parse(fs.readFile(packageJsonPath));
  } catch {
    return null;
  }
}
function sniffModuleFormat(fs, sourceFilePath) {
  const resolvedPath = resolveFileWithPostfixes(fs, sourceFilePath, ["", ".js", "/index.js"]);
  if (resolvedPath === null) {
    return void 0;
  }
  const sourceFile = ts8.createSourceFile(sourceFilePath, fs.readFile(resolvedPath), ts8.ScriptTarget.ES5);
  if (sourceFile.statements.length === 0) {
    return void 0;
  }
  if (ts8.isExternalModule(sourceFile)) {
    return "esm5";
  } else if (parseStatementForUmdModule(sourceFile.statements[0]) !== null) {
    return "umd";
  } else {
    return "commonjs";
  }
}
function mergeConfigAndPackageJson(fs, entryPointPackageJson, entryPointConfig, packagePath, entryPointPath) {
  if (entryPointPackageJson !== null) {
    return __spreadValues(__spreadValues({}, entryPointPackageJson), entryPointConfig.override);
  } else {
    const name = `${fs.basename(packagePath)}/${fs.relative(packagePath, entryPointPath)}`;
    return __spreadValues({ name }, entryPointConfig.override);
  }
}
function guessTypingsFromPackageJson(fs, entryPointPath, entryPointPackageJson) {
  for (const prop of SUPPORTED_FORMAT_PROPERTIES) {
    const field = entryPointPackageJson[prop];
    if (typeof field !== "string") {
      continue;
    }
    const relativeTypingsPath = field.replace(/\.js$/, ".d.ts");
    const typingsPath = fs.resolve(entryPointPath, relativeTypingsPath);
    if (fs.exists(typingsPath)) {
      return typingsPath;
    }
  }
  return null;
}
function getPackageNameAndVersion(fs, packagePath, packagePackageJson, entryPointPackageJson) {
  var _a;
  let packageName;
  if (packagePackageJson !== null) {
    packageName = packagePackageJson.name;
  } else if (entryPointPackageJson !== null) {
    packageName = /^(?:@[^/]+\/)?[^/]*/.exec(entryPointPackageJson.name)[0];
  } else {
    const lastSegment = fs.basename(packagePath);
    const secondLastSegment = fs.basename(fs.dirname(packagePath));
    packageName = secondLastSegment.startsWith("@") ? `${secondLastSegment}/${lastSegment}` : lastSegment;
  }
  return {
    packageName,
    packageVersion: (_a = packagePackageJson == null ? void 0 : packagePackageJson.version) != null ? _a : null
  };
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/execution/tasks/api.mjs
var DtsProcessing;
(function(DtsProcessing2) {
  DtsProcessing2[DtsProcessing2["Yes"] = 0] = "Yes";
  DtsProcessing2[DtsProcessing2["No"] = 1] = "No";
  DtsProcessing2[DtsProcessing2["Only"] = 2] = "Only";
})(DtsProcessing || (DtsProcessing = {}));
var TaskDependencies = Map;

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/packages/bundle_program.mjs
import ts10 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/packages/patch_ts_expando_initializer.mjs
import ts9 from "typescript";
function patchTsGetExpandoInitializer() {
  if (isTs31778GetExpandoInitializerFixed()) {
    return null;
  }
  const originalGetExpandoInitializer = ts9.getExpandoInitializer;
  if (originalGetExpandoInitializer === void 0) {
    throw makeUnsupportedTypeScriptError();
  }
  ts9.getExpandoInitializer = (initializer, isPrototypeAssignment) => {
    if (ts9.isParenthesizedExpression(initializer) && ts9.isCallExpression(initializer.expression)) {
      initializer = initializer.expression;
    }
    return originalGetExpandoInitializer(initializer, isPrototypeAssignment);
  };
  return originalGetExpandoInitializer;
}
function restoreGetExpandoInitializer(originalGetExpandoInitializer) {
  if (originalGetExpandoInitializer !== null) {
    ts9.getExpandoInitializer = originalGetExpandoInitializer;
  }
}
var ts31778FixedResult = null;
function isTs31778GetExpandoInitializerFixed() {
  if (ts31778FixedResult !== null) {
    return ts31778FixedResult;
  }
  ts31778FixedResult = checkIfExpandoPropertyIsPresent();
  if (!ts31778FixedResult) {
    const originalGetExpandoInitializer = patchTsGetExpandoInitializer();
    try {
      const patchIsSuccessful = checkIfExpandoPropertyIsPresent();
      if (!patchIsSuccessful) {
        throw makeUnsupportedTypeScriptError();
      }
    } finally {
      restoreGetExpandoInitializer(originalGetExpandoInitializer);
    }
  }
  return ts31778FixedResult;
}
function checkIfExpandoPropertyIsPresent() {
  const sourceText = `
    (function() {
      var A = (function() {
        function A() {}
        return A;
      }());
      A.expando = true;
    }());`;
  const sourceFile = ts9.createSourceFile("test.js", sourceText, ts9.ScriptTarget.ES5, true, ts9.ScriptKind.JS);
  const host = {
    getSourceFile() {
      return sourceFile;
    },
    fileExists() {
      return true;
    },
    readFile() {
      return "";
    },
    writeFile() {
    },
    getDefaultLibFileName() {
      return "";
    },
    getCurrentDirectory() {
      return "";
    },
    getDirectories() {
      return [];
    },
    getCanonicalFileName(fileName) {
      return fileName;
    },
    useCaseSensitiveFileNames() {
      return true;
    },
    getNewLine() {
      return "\n";
    }
  };
  const options = { noResolve: true, noLib: true, noEmit: true, allowJs: true };
  const program = ts9.createProgram(["test.js"], options, host);
  function visitor(node) {
    if (ts9.isVariableDeclaration(node) && hasNameIdentifier(node) && node.name.text === "A") {
      return node;
    }
    return ts9.forEachChild(node, visitor);
  }
  const declaration = ts9.forEachChild(sourceFile, visitor);
  if (declaration === void 0) {
    throw new Error("Unable to find declaration of outer A");
  }
  const symbol = program.getTypeChecker().getSymbolAtLocation(declaration.name);
  if (symbol === void 0) {
    throw new Error("Unable to resolve symbol of outer A");
  }
  return symbol.exports !== void 0 && symbol.exports.has("expando");
}
function makeUnsupportedTypeScriptError() {
  return new Error("The TypeScript version used is not supported by ngcc.");
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/packages/bundle_program.mjs
function makeBundleProgram(fs, isCore, pkg, path, r3FileName, options, host, additionalFiles = []) {
  const r3SymbolsPath = isCore ? findR3SymbolsPath(fs, fs.dirname(path), r3FileName) : null;
  let rootPaths = r3SymbolsPath ? [path, r3SymbolsPath, ...additionalFiles] : [path, ...additionalFiles];
  const originalGetExpandoInitializer = patchTsGetExpandoInitializer();
  const program = ts10.createProgram(rootPaths, options, host);
  program.getTypeChecker();
  restoreGetExpandoInitializer(originalGetExpandoInitializer);
  const file = program.getSourceFile(path);
  const r3SymbolsFile = r3SymbolsPath && program.getSourceFile(r3SymbolsPath) || null;
  return { program, options, host, package: pkg, path, file, r3SymbolsPath, r3SymbolsFile };
}
function findR3SymbolsPath(fs, directory, filename) {
  const r3SymbolsFilePath = fs.resolve(directory, filename);
  if (fs.exists(r3SymbolsFilePath)) {
    return r3SymbolsFilePath;
  }
  const subDirectories = fs.readdir(directory).filter((p) => !p.startsWith(".")).filter((p) => p !== "node_modules").filter((p) => {
    const stat = fs.lstat(fs.resolve(directory, p));
    return stat.isDirectory() && !stat.isSymbolicLink();
  });
  for (const subDirectory of subDirectories) {
    const r3SymbolsFilePath2 = findR3SymbolsPath(fs, fs.resolve(directory, subDirectory), filename);
    if (r3SymbolsFilePath2) {
      return r3SymbolsFilePath2;
    }
  }
  return null;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/packages/ngcc_compiler_host.mjs
import ts11 from "typescript";
var NgccSourcesCompilerHost = class extends NgtscCompilerHost {
  constructor(fs, options, cache, moduleResolutionCache, packagePath) {
    super(fs, options);
    this.cache = cache;
    this.moduleResolutionCache = moduleResolutionCache;
    this.packagePath = packagePath;
  }
  getSourceFile(fileName, languageVersion) {
    return this.cache.getCachedSourceFile(fileName, languageVersion);
  }
  resolveModuleNames(moduleNames, containingFile, reusedNames, redirectedReference) {
    return moduleNames.map((moduleName) => {
      const { resolvedModule } = ts11.resolveModuleName(moduleName, containingFile, this.options, this, this.moduleResolutionCache, redirectedReference);
      if ((resolvedModule == null ? void 0 : resolvedModule.extension) === ts11.Extension.Dts && containingFile.endsWith(".js") && isRelativePath(moduleName)) {
        const jsFile = resolvedModule.resolvedFileName.replace(/\.d\.ts$/, ".js");
        if (this.fileExists(jsFile)) {
          return __spreadProps(__spreadValues({}, resolvedModule), { resolvedFileName: jsFile, extension: ts11.Extension.Js });
        }
      }
      if ((resolvedModule == null ? void 0 : resolvedModule.extension) === ts11.Extension.Js && !isWithinPackage(this.packagePath, this.fs.resolve(resolvedModule.resolvedFileName))) {
        return void 0;
      }
      return resolvedModule;
    });
  }
};
var NgccDtsCompilerHost = class extends NgtscCompilerHost {
  constructor(fs, options, cache, moduleResolutionCache) {
    super(fs, options);
    this.cache = cache;
    this.moduleResolutionCache = moduleResolutionCache;
  }
  getSourceFile(fileName, languageVersion) {
    return this.cache.getCachedSourceFile(fileName, languageVersion);
  }
  resolveModuleNames(moduleNames, containingFile, reusedNames, redirectedReference) {
    return moduleNames.map((moduleName) => {
      const { resolvedModule } = ts11.resolveModuleName(moduleName, containingFile, this.options, this, this.moduleResolutionCache, redirectedReference);
      return resolvedModule;
    });
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/packages/source_file_cache.mjs
import ts12 from "typescript";
var SharedFileCache = class {
  constructor(fs) {
    this.fs = fs;
    this.sfCache = new Map();
  }
  getCachedSourceFile(fileName) {
    const absPath = this.fs.resolve(fileName);
    if (isDefaultLibrary(absPath, this.fs)) {
      return this.getStableCachedFile(absPath);
    } else if (isAngularDts(absPath, this.fs)) {
      return this.getVolatileCachedFile(absPath);
    } else {
      return void 0;
    }
  }
  getStableCachedFile(absPath) {
    if (!this.sfCache.has(absPath)) {
      const content = readFile(absPath, this.fs);
      if (content === void 0) {
        return void 0;
      }
      const sf = ts12.createSourceFile(absPath, content, ts12.ScriptTarget.ES2015);
      this.sfCache.set(absPath, sf);
    }
    return this.sfCache.get(absPath);
  }
  getVolatileCachedFile(absPath) {
    const content = readFile(absPath, this.fs);
    if (content === void 0) {
      return void 0;
    }
    if (!this.sfCache.has(absPath) || this.sfCache.get(absPath).text !== content) {
      const sf = ts12.createSourceFile(absPath, content, ts12.ScriptTarget.ES2015);
      this.sfCache.set(absPath, sf);
    }
    return this.sfCache.get(absPath);
  }
};
var DEFAULT_LIB_PATTERN = ["node_modules", "typescript", "lib", /^lib\..+\.d\.ts$/];
function isDefaultLibrary(absPath, fs) {
  return isFile(absPath, DEFAULT_LIB_PATTERN, fs);
}
var ANGULAR_DTS_PATTERN = ["node_modules", "@angular", /./, /\.d\.ts$/];
function isAngularDts(absPath, fs) {
  return isFile(absPath, ANGULAR_DTS_PATTERN, fs);
}
function isFile(path, segments, fs) {
  for (let i = segments.length - 1; i >= 0; i--) {
    const pattern = segments[i];
    const segment = fs.basename(path);
    if (typeof pattern === "string") {
      if (pattern !== segment) {
        return false;
      }
    } else {
      if (!pattern.test(segment)) {
        return false;
      }
    }
    path = fs.dirname(path);
  }
  return true;
}
var EntryPointFileCache = class {
  constructor(fs, sharedFileCache) {
    this.fs = fs;
    this.sharedFileCache = sharedFileCache;
    this.sfCache = new Map();
  }
  getCachedSourceFile(fileName, languageVersion) {
    const staticSf = this.sharedFileCache.getCachedSourceFile(fileName);
    if (staticSf !== void 0) {
      return staticSf;
    }
    const absPath = this.fs.resolve(fileName);
    if (this.sfCache.has(absPath)) {
      return this.sfCache.get(absPath);
    }
    const content = readFile(absPath, this.fs);
    if (content === void 0) {
      return void 0;
    }
    const sf = ts12.createSourceFile(fileName, content, languageVersion);
    this.sfCache.set(absPath, sf);
    return sf;
  }
};
function readFile(absPath, fs) {
  if (!fs.exists(absPath) || !fs.stat(absPath).isFile()) {
    return void 0;
  }
  return fs.readFile(absPath);
}
function createModuleResolutionCache(fs) {
  return ts12.createModuleResolutionCache(fs.pwd(), (fileName) => {
    return fs.isCaseSensitive() ? fileName : fileName.toLowerCase();
  });
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/packages/entry_point_bundle.mjs
function makeEntryPointBundle(fs, entryPoint, sharedFileCache, moduleResolutionCache, formatPath, isCore, format, dtsProcessing, pathMappings, mirrorDtsFromSrc = false, enableI18nLegacyMessageIdFormat = true) {
  const rootDir = entryPoint.packagePath;
  const options = __spreadValues({ allowJs: true, maxNodeModuleJsDepth: Infinity, rootDir }, pathMappings);
  const entryPointCache = new EntryPointFileCache(fs, sharedFileCache);
  const dtsHost = new NgccDtsCompilerHost(fs, options, entryPointCache, moduleResolutionCache);
  const srcHost = new NgccSourcesCompilerHost(fs, options, entryPointCache, moduleResolutionCache, entryPoint.packagePath);
  const absFormatPath = fs.resolve(entryPoint.path, formatPath);
  const typingsPath = fs.resolve(entryPoint.path, entryPoint.typings);
  const src = makeBundleProgram(fs, isCore, entryPoint.packagePath, absFormatPath, "r3_symbols.js", options, srcHost);
  const additionalDtsFiles = dtsProcessing !== DtsProcessing.No && mirrorDtsFromSrc ? computePotentialDtsFilesFromJsFiles(fs, src.program, absFormatPath, typingsPath) : [];
  const dts = dtsProcessing !== DtsProcessing.No ? makeBundleProgram(fs, isCore, entryPoint.packagePath, typingsPath, "r3_symbols.d.ts", __spreadProps(__spreadValues({}, options), { allowJs: false }), dtsHost, additionalDtsFiles) : null;
  const isFlatCore = isCore && src.r3SymbolsFile === null;
  return {
    entryPoint,
    format,
    rootDirs: [rootDir],
    isCore,
    isFlatCore,
    src,
    dts,
    dtsProcessing,
    enableI18nLegacyMessageIdFormat
  };
}
function computePotentialDtsFilesFromJsFiles(fs, srcProgram, formatPath, typingsPath) {
  const formatRoot = fs.dirname(formatPath);
  const typingsRoot = fs.dirname(typingsPath);
  const additionalFiles = [];
  for (const sf of srcProgram.getSourceFiles()) {
    if (!sf.fileName.endsWith(".js")) {
      continue;
    }
    const mirroredDtsPath = fs.resolve(typingsRoot, fs.relative(formatRoot, sf.fileName.replace(/\.js$/, ".d.ts")));
    if (fs.exists(mirroredDtsPath)) {
      additionalFiles.push(mirroredDtsPath);
    }
  }
  return additionalFiles;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/packages/transformer.mjs
import ts22 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/analysis/decoration_analyzer.mjs
import { ConstantPool } from "@angular/compiler";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/migrations/utils.mjs
import ts13 from "typescript";
function isClassDeclaration(clazz) {
  return isNamedClassDeclaration(clazz) || isNamedFunctionDeclaration(clazz) || isNamedVariableDeclaration(clazz);
}
function hasDirectiveDecorator(host, clazz) {
  const ref = new Reference(clazz);
  return host.metadata.getDirectiveMetadata(ref) !== null;
}
function hasPipeDecorator(host, clazz) {
  const ref = new Reference(clazz);
  return host.metadata.getPipeMetadata(ref) !== null;
}
function hasConstructor(host, clazz) {
  return host.reflectionHost.getConstructorParameters(clazz) !== null;
}
function createDirectiveDecorator(clazz, metadata) {
  const args = [];
  if (metadata !== void 0) {
    const metaArgs = [];
    if (metadata.selector !== null) {
      metaArgs.push(property("selector", metadata.selector));
    }
    if (metadata.exportAs !== null) {
      metaArgs.push(property("exportAs", metadata.exportAs.join(", ")));
    }
    args.push(reifySourceFile(ts13.createObjectLiteral(metaArgs)));
  }
  return {
    name: "Directive",
    identifier: null,
    import: { name: "Directive", from: "@angular/core" },
    node: null,
    synthesizedFor: clazz.name,
    args
  };
}
function createComponentDecorator(clazz, metadata) {
  const metaArgs = [
    property("template", "")
  ];
  if (metadata.selector !== null) {
    metaArgs.push(property("selector", metadata.selector));
  }
  if (metadata.exportAs !== null) {
    metaArgs.push(property("exportAs", metadata.exportAs.join(", ")));
  }
  return {
    name: "Component",
    identifier: null,
    import: { name: "Component", from: "@angular/core" },
    node: null,
    synthesizedFor: clazz.name,
    args: [
      reifySourceFile(ts13.createObjectLiteral(metaArgs))
    ]
  };
}
function createInjectableDecorator(clazz) {
  return {
    name: "Injectable",
    identifier: null,
    import: { name: "Injectable", from: "@angular/core" },
    node: null,
    synthesizedFor: clazz.name,
    args: []
  };
}
function property(name, value) {
  return ts13.createPropertyAssignment(name, ts13.createStringLiteral(value));
}
var EMPTY_SF = ts13.createSourceFile("(empty)", "", ts13.ScriptTarget.Latest);
function reifySourceFile(expr) {
  const printer = ts13.createPrinter();
  const exprText = printer.printNode(ts13.EmitHint.Unspecified, expr, EMPTY_SF);
  const sf = ts13.createSourceFile("(synthetic)", `const expr = ${exprText};`, ts13.ScriptTarget.Latest, true, ts13.ScriptKind.JS);
  const stmt = sf.statements[0];
  if (!ts13.isVariableStatement(stmt)) {
    throw new Error(`Expected VariableStatement, got ${ts13.SyntaxKind[stmt.kind]}`);
  }
  return stmt.declarationList.declarations[0].initializer;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/migrations/missing_injectable_migration.mjs
var MissingInjectableMigration = class {
  apply(clazz, host) {
    const decorators = host.reflectionHost.getDecoratorsOfDeclaration(clazz);
    if (decorators === null) {
      return null;
    }
    for (const decorator of decorators) {
      const name = getAngularCoreDecoratorName(decorator);
      if (name === "NgModule") {
        migrateNgModuleProviders(decorator, host);
      } else if (name === "Directive") {
        migrateDirectiveProviders(decorator, host, false);
      } else if (name === "Component") {
        migrateDirectiveProviders(decorator, host, true);
      }
    }
    return null;
  }
};
function migrateNgModuleProviders(decorator, host) {
  if (decorator.args === null || decorator.args.length !== 1) {
    return;
  }
  const metadata = host.evaluator.evaluate(decorator.args[0], forwardRefResolver);
  if (!(metadata instanceof Map)) {
    return;
  }
  migrateProviders(metadata, "providers", host);
}
function migrateDirectiveProviders(decorator, host, isComponent) {
  if (decorator.args === null || decorator.args.length !== 1) {
    return;
  }
  const metadata = host.evaluator.evaluate(decorator.args[0], forwardRefResolver);
  if (!(metadata instanceof Map)) {
    return;
  }
  migrateProviders(metadata, "providers", host);
  if (isComponent) {
    migrateProviders(metadata, "viewProviders", host);
  }
}
function migrateProviders(metadata, field, host) {
  if (!metadata.has(field)) {
    return;
  }
  const providers = metadata.get(field);
  if (!Array.isArray(providers)) {
    return;
  }
  for (const provider of providers) {
    migrateProvider(provider, host);
  }
}
function migrateProvider(provider, host) {
  if (provider instanceof Map) {
    if (!provider.has("provide") || provider.has("useValue") || provider.has("useFactory") || provider.has("useExisting")) {
      return;
    }
    if (provider.has("useClass")) {
      if (!provider.has("deps")) {
        migrateProviderClass(provider.get("useClass"), host);
      }
    } else {
      migrateProviderClass(provider.get("provide"), host);
    }
  } else if (Array.isArray(provider)) {
    for (const v of provider) {
      migrateProvider(v, host);
    }
  } else {
    migrateProviderClass(provider, host);
  }
}
function migrateProviderClass(provider, host) {
  if (!(provider instanceof Reference)) {
    return;
  }
  const clazz = provider.node;
  if (isClassDeclaration(clazz) && host.isInScope(clazz) && needsInjectableDecorator(clazz, host)) {
    host.injectSyntheticDecorator(clazz, createInjectableDecorator(clazz));
  }
}
var NO_MIGRATE_DECORATORS = new Set(["Injectable", "Directive", "Component", "Pipe"]);
function needsInjectableDecorator(clazz, host) {
  const decorators = host.getAllDecorators(clazz);
  if (decorators === null) {
    return true;
  }
  for (const decorator of decorators) {
    const name = getAngularCoreDecoratorName(decorator);
    if (name !== null && NO_MIGRATE_DECORATORS.has(name)) {
      return false;
    }
  }
  return true;
}
function getAngularCoreDecoratorName(decorator) {
  if (decorator.import === null || decorator.import.from !== "@angular/core") {
    return null;
  }
  return decorator.import.name;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/migrations/undecorated_child_migration.mjs
var UndecoratedChildMigration = class {
  apply(clazz, host) {
    const moduleMeta = host.metadata.getNgModuleMetadata(new Reference(clazz));
    if (moduleMeta === null) {
      return null;
    }
    for (const decl of moduleMeta.declarations) {
      this.maybeMigrate(decl, host);
    }
    return null;
  }
  maybeMigrate(ref, host) {
    if (hasDirectiveDecorator(host, ref.node) || hasPipeDecorator(host, ref.node)) {
      return;
    }
    const baseRef = readBaseClass(ref.node, host.reflectionHost, host.evaluator);
    if (baseRef === null) {
      return;
    } else if (baseRef === "dynamic") {
      return;
    }
    this.maybeMigrate(baseRef, host);
    const baseMeta = host.metadata.getDirectiveMetadata(baseRef);
    if (baseMeta === null) {
      return;
    }
    if (baseMeta.isComponent) {
      host.injectSyntheticDecorator(ref.node, createComponentDecorator(ref.node, baseMeta), HandlerFlags.FULL_INHERITANCE);
    } else {
      host.injectSyntheticDecorator(ref.node, createDirectiveDecorator(ref.node, baseMeta), HandlerFlags.FULL_INHERITANCE);
    }
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/migrations/undecorated_parent_migration.mjs
var UndecoratedParentMigration = class {
  apply(clazz, host) {
    if (!hasDirectiveDecorator(host, clazz) || hasConstructor(host, clazz)) {
      return null;
    }
    let baseClazzRef = determineBaseClass(clazz, host);
    while (baseClazzRef !== null) {
      const baseClazz = baseClazzRef.node;
      if (hasDirectiveDecorator(host, baseClazz) || !host.isInScope(baseClazz)) {
        break;
      }
      host.injectSyntheticDecorator(baseClazz, createDirectiveDecorator(baseClazz));
      if (hasConstructor(host, baseClazz)) {
        break;
      }
      baseClazzRef = determineBaseClass(baseClazz, host);
    }
    return null;
  }
};
function determineBaseClass(clazz, host) {
  const baseClassExpr = host.reflectionHost.getBaseClassExpression(clazz);
  if (baseClassExpr === null) {
    return null;
  }
  const baseClass = host.evaluator.evaluate(baseClassExpr);
  if (!(baseClass instanceof Reference) || !isClassDeclaration(baseClass.node)) {
    return null;
  }
  return baseClass;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/analysis/migration_host.mjs
import ts14 from "typescript";
var DefaultMigrationHost = class {
  constructor(reflectionHost, metadata, evaluator, compiler, entryPointPath) {
    this.reflectionHost = reflectionHost;
    this.metadata = metadata;
    this.evaluator = evaluator;
    this.compiler = compiler;
    this.entryPointPath = entryPointPath;
  }
  injectSyntheticDecorator(clazz, decorator, flags) {
    const migratedTraits = this.compiler.injectSyntheticDecorator(clazz, decorator, flags);
    for (const trait of migratedTraits) {
      if ((trait.state === TraitState.Analyzed || trait.state === TraitState.Resolved) && trait.analysisDiagnostics !== null) {
        trait.analysisDiagnostics = trait.analysisDiagnostics.map((diag) => createMigrationDiagnostic(diag, clazz, decorator));
      }
      if (trait.state === TraitState.Resolved && trait.resolveDiagnostics !== null) {
        trait.resolveDiagnostics = trait.resolveDiagnostics.map((diag) => createMigrationDiagnostic(diag, clazz, decorator));
      }
    }
  }
  getAllDecorators(clazz) {
    return this.compiler.getAllDecorators(clazz);
  }
  isInScope(clazz) {
    return isWithinPackage(this.entryPointPath, absoluteFromSourceFile(clazz.getSourceFile()));
  }
};
function createMigrationDiagnostic(diagnostic, source, decorator) {
  const clone = __spreadValues({}, diagnostic);
  const chain = [{
    messageText: `Occurs for @${decorator.name} decorator inserted by an automatic migration`,
    category: ts14.DiagnosticCategory.Message,
    code: 0
  }];
  if (decorator.args !== null) {
    const args = decorator.args.map((arg) => arg.getText()).join(", ");
    chain.push({
      messageText: `@${decorator.name}(${args})`,
      category: ts14.DiagnosticCategory.Message,
      code: 0
    });
  }
  if (typeof clone.messageText === "string") {
    clone.messageText = {
      messageText: clone.messageText,
      category: diagnostic.category,
      code: diagnostic.code,
      next: chain
    };
  } else {
    if (clone.messageText.next === void 0) {
      clone.messageText.next = chain;
    } else {
      clone.messageText.next.push(...chain);
    }
  }
  return clone;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/analysis/ngcc_trait_compiler.mjs
var NgccTraitCompiler = class extends TraitCompiler {
  constructor(handlers, ngccReflector) {
    super(handlers, ngccReflector, NOOP_PERF_RECORDER, new NoIncrementalBuild(), true, CompilationMode.FULL, new DtsTransformRegistry(), null);
    this.ngccReflector = ngccReflector;
  }
  get analyzedFiles() {
    return Array.from(this.fileToClasses.keys());
  }
  analyzeFile(sf) {
    const ngccClassSymbols = this.ngccReflector.findClassSymbols(sf);
    for (const classSymbol of ngccClassSymbols) {
      this.analyzeClass(classSymbol.declaration.valueDeclaration, null);
    }
    return void 0;
  }
  injectSyntheticDecorator(clazz, decorator, flags) {
    const migratedTraits = this.detectTraits(clazz, [decorator]);
    if (migratedTraits === null) {
      return [];
    }
    for (const trait of migratedTraits) {
      this.analyzeTrait(clazz, trait, flags);
    }
    return migratedTraits;
  }
  getAllDecorators(clazz) {
    const record = this.recordFor(clazz);
    if (record === null) {
      return null;
    }
    return record.traits.map((trait) => trait.detected.decorator).filter(isDefined);
  }
};
var NoIncrementalBuild = class {
  priorAnalysisFor(sf) {
    return null;
  }
  priorTypeCheckingResultsFor() {
    return null;
  }
  recordSuccessfulTypeCheck() {
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/analysis/types.mjs
var DecorationAnalyses = Map;

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/analysis/decoration_analyzer.mjs
var NgccResourceLoader = class {
  constructor(fs) {
    this.fs = fs;
    this.canPreload = false;
    this.canPreprocess = false;
  }
  preload() {
    throw new Error("Not implemented.");
  }
  preprocessInline() {
    throw new Error("Not implemented.");
  }
  load(url) {
    return this.fs.readFile(this.fs.resolve(url));
  }
  resolve(url, containingFile) {
    return this.fs.resolve(this.fs.dirname(containingFile), url);
  }
};
var DecorationAnalyzer = class {
  constructor(fs, bundle, reflectionHost, referencesRegistry, diagnosticHandler = () => {
  }, tsConfig = null) {
    this.fs = fs;
    this.bundle = bundle;
    this.reflectionHost = reflectionHost;
    this.referencesRegistry = referencesRegistry;
    this.diagnosticHandler = diagnosticHandler;
    this.tsConfig = tsConfig;
    this.program = this.bundle.src.program;
    this.options = this.bundle.src.options;
    this.host = this.bundle.src.host;
    this.typeChecker = this.bundle.src.program.getTypeChecker();
    this.rootDirs = this.bundle.rootDirs;
    this.packagePath = this.bundle.entryPoint.packagePath;
    this.isCore = this.bundle.isCore;
    this.compilerOptions = this.tsConfig !== null ? this.tsConfig.options : {};
    this.moduleResolver = new ModuleResolver(this.program, this.options, this.host, null);
    this.resourceManager = new NgccResourceLoader(this.fs);
    this.metaRegistry = new LocalMetadataRegistry();
    this.dtsMetaReader = new DtsMetadataReader(this.typeChecker, this.reflectionHost);
    this.fullMetaReader = new CompoundMetadataReader([this.metaRegistry, this.dtsMetaReader]);
    this.refEmitter = new ReferenceEmitter([
      new LocalIdentifierStrategy(),
      new AbsoluteModuleStrategy(this.program, this.typeChecker, this.moduleResolver, this.reflectionHost),
      new LogicalProjectStrategy(this.reflectionHost, new LogicalFileSystem(this.rootDirs, this.host))
    ]);
    this.aliasingHost = this.bundle.entryPoint.generateDeepReexports ? new PrivateExportAliasingHost(this.reflectionHost) : null;
    this.dtsModuleScopeResolver = new MetadataDtsModuleScopeResolver(this.dtsMetaReader, this.aliasingHost);
    this.scopeRegistry = new LocalModuleScopeRegistry(this.metaRegistry, this.dtsModuleScopeResolver, this.refEmitter, this.aliasingHost);
    this.fullRegistry = new CompoundMetadataRegistry([this.metaRegistry, this.scopeRegistry]);
    this.evaluator = new PartialEvaluator(this.reflectionHost, this.typeChecker, null);
    this.importGraph = new ImportGraph(this.typeChecker, NOOP_PERF_RECORDER);
    this.cycleAnalyzer = new CycleAnalyzer(this.importGraph);
    this.injectableRegistry = new InjectableClassRegistry(this.reflectionHost);
    this.typeCheckScopeRegistry = new TypeCheckScopeRegistry(this.scopeRegistry, this.fullMetaReader);
    this.handlers = [
      new ComponentDecoratorHandler(this.reflectionHost, this.evaluator, this.fullRegistry, this.fullMetaReader, this.scopeRegistry, this.scopeRegistry, this.typeCheckScopeRegistry, new ResourceRegistry(), this.isCore, this.resourceManager, this.rootDirs, !!this.compilerOptions.preserveWhitespaces, true, this.bundle.enableI18nLegacyMessageIdFormat, false, false, this.moduleResolver, this.cycleAnalyzer, 0, this.refEmitter, NOOP_DEPENDENCY_TRACKER, this.injectableRegistry, null, !!this.compilerOptions.annotateForClosureCompiler, NOOP_PERF_RECORDER),
      new DirectiveDecoratorHandler(this.reflectionHost, this.evaluator, this.fullRegistry, this.scopeRegistry, this.fullMetaReader, this.injectableRegistry, this.isCore, null, !!this.compilerOptions.annotateForClosureCompiler, true, NOOP_PERF_RECORDER),
      new PipeDecoratorHandler(this.reflectionHost, this.evaluator, this.metaRegistry, this.scopeRegistry, this.injectableRegistry, this.isCore, NOOP_PERF_RECORDER),
      new InjectableDecoratorHandler(this.reflectionHost, this.isCore, false, this.injectableRegistry, NOOP_PERF_RECORDER, false),
      new NgModuleDecoratorHandler(this.reflectionHost, this.evaluator, this.fullMetaReader, this.fullRegistry, this.scopeRegistry, this.referencesRegistry, this.isCore, this.refEmitter, null, !!this.compilerOptions.annotateForClosureCompiler, this.injectableRegistry, NOOP_PERF_RECORDER)
    ];
    this.compiler = new NgccTraitCompiler(this.handlers, this.reflectionHost);
    this.migrations = [
      new UndecoratedParentMigration(),
      new UndecoratedChildMigration(),
      new MissingInjectableMigration()
    ];
  }
  analyzeProgram() {
    for (const sourceFile of this.program.getSourceFiles()) {
      if (!sourceFile.isDeclarationFile && isWithinPackage(this.packagePath, absoluteFromSourceFile(sourceFile))) {
        this.compiler.analyzeFile(sourceFile);
      }
    }
    this.applyMigrations();
    this.compiler.resolve();
    this.reportDiagnostics();
    const decorationAnalyses = new DecorationAnalyses();
    for (const analyzedFile of this.compiler.analyzedFiles) {
      const compiledFile = this.compileFile(analyzedFile);
      decorationAnalyses.set(compiledFile.sourceFile, compiledFile);
    }
    return decorationAnalyses;
  }
  applyMigrations() {
    const migrationHost = new DefaultMigrationHost(this.reflectionHost, this.fullMetaReader, this.evaluator, this.compiler, this.bundle.entryPoint.path);
    this.migrations.forEach((migration) => {
      this.compiler.analyzedFiles.forEach((analyzedFile) => {
        const records = this.compiler.recordsFor(analyzedFile);
        if (records === null) {
          throw new Error("Assertion error: file to migrate must have records.");
        }
        records.forEach((record) => {
          const addDiagnostic = (diagnostic) => {
            if (record.metaDiagnostics === null) {
              record.metaDiagnostics = [];
            }
            record.metaDiagnostics.push(diagnostic);
          };
          try {
            const result = migration.apply(record.node, migrationHost);
            if (result !== null) {
              addDiagnostic(result);
            }
          } catch (e) {
            if (isFatalDiagnosticError(e)) {
              addDiagnostic(e.toDiagnostic());
            } else {
              throw e;
            }
          }
        });
      });
    });
  }
  reportDiagnostics() {
    this.compiler.diagnostics.forEach(this.diagnosticHandler);
  }
  compileFile(sourceFile) {
    const constantPool = new ConstantPool();
    const records = this.compiler.recordsFor(sourceFile);
    if (records === null) {
      throw new Error("Assertion error: file to compile must have records.");
    }
    const compiledClasses = [];
    for (const record of records) {
      const compilation = this.compiler.compile(record.node, constantPool);
      if (compilation === null) {
        continue;
      }
      compiledClasses.push({
        name: record.node.name.text,
        decorators: this.compiler.getAllDecorators(record.node),
        declaration: record.node,
        compilation
      });
    }
    const reexports = this.getReexportsForSourceFile(sourceFile);
    return { constantPool, sourceFile, compiledClasses, reexports };
  }
  getReexportsForSourceFile(sf) {
    const exportStatements = this.compiler.exportStatements;
    if (!exportStatements.has(sf.fileName)) {
      return [];
    }
    const exports = exportStatements.get(sf.fileName);
    const reexports = [];
    exports.forEach(([fromModule, symbolName], asAlias) => {
      reexports.push({ asAlias, fromModule, symbolName });
    });
    return reexports;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/analysis/module_with_providers_analyzer.mjs
import ts15 from "typescript";
var ModuleWithProvidersAnalyses = Map;
var ModuleWithProvidersAnalyzer = class {
  constructor(host, typeChecker, referencesRegistry, processDts) {
    this.host = host;
    this.typeChecker = typeChecker;
    this.referencesRegistry = referencesRegistry;
    this.processDts = processDts;
    this.evaluator = new PartialEvaluator(this.host, this.typeChecker, null);
  }
  analyzeProgram(program) {
    const analyses = new ModuleWithProvidersAnalyses();
    const rootFiles = this.getRootFiles(program);
    rootFiles.forEach((f) => {
      const fns = this.getModuleWithProvidersFunctions(f);
      fns && fns.forEach((fn) => {
        if (fn.ngModule.bestGuessOwningModule === null) {
          this.referencesRegistry.add(fn.ngModule.node, new Reference(fn.ngModule.node));
        }
        if (this.processDts) {
          const dtsFn = this.getDtsModuleWithProvidersFunction(fn);
          const dtsFnType = dtsFn.declaration.type;
          const typeParam = dtsFnType && ts15.isTypeReferenceNode(dtsFnType) && dtsFnType.typeArguments && dtsFnType.typeArguments[0] || null;
          if (!typeParam || isAnyKeyword(typeParam)) {
            const dtsFile = dtsFn.declaration.getSourceFile();
            const analysis = analyses.has(dtsFile) ? analyses.get(dtsFile) : [];
            analysis.push(dtsFn);
            analyses.set(dtsFile, analysis);
          }
        }
      });
    });
    return analyses;
  }
  getRootFiles(program) {
    return program.getRootFileNames().map((f) => program.getSourceFile(f)).filter(isDefined);
  }
  getModuleWithProvidersFunctions(f) {
    const exports = this.host.getExportsOfModule(f);
    if (!exports)
      return [];
    const infos = [];
    exports.forEach((declaration) => {
      if (declaration.node === null) {
        return;
      }
      if (this.host.isClass(declaration.node)) {
        this.host.getMembersOfClass(declaration.node).forEach((member) => {
          if (member.isStatic) {
            const info = this.parseForModuleWithProviders(member.name, member.node, member.implementation, declaration.node);
            if (info) {
              infos.push(info);
            }
          }
        });
      } else {
        if (hasNameIdentifier(declaration.node)) {
          const info = this.parseForModuleWithProviders(declaration.node.name.text, declaration.node);
          if (info) {
            infos.push(info);
          }
        }
      }
    });
    return infos;
  }
  parseForModuleWithProviders(name, node, implementation = node, container = null) {
    if (implementation === null || !ts15.isFunctionDeclaration(implementation) && !ts15.isMethodDeclaration(implementation) && !ts15.isFunctionExpression(implementation)) {
      return null;
    }
    const declaration = implementation;
    const definition = this.host.getDefinitionOfFunction(declaration);
    if (definition === null) {
      return null;
    }
    const body = definition.body;
    if (body === null || body.length === 0) {
      return null;
    }
    const lastStatement = body[body.length - 1];
    if (!ts15.isReturnStatement(lastStatement) || lastStatement.expression === void 0) {
      return null;
    }
    const result = this.evaluator.evaluate(lastStatement.expression);
    if (!(result instanceof Map) || !result.has("ngModule")) {
      return null;
    }
    const ngModuleRef = result.get("ngModule");
    if (!(ngModuleRef instanceof Reference)) {
      return null;
    }
    if (!isNamedClassDeclaration(ngModuleRef.node) && !isNamedVariableDeclaration(ngModuleRef.node)) {
      throw new Error(`The identity given by ${ngModuleRef.debugName} referenced in "${declaration.getText()}" doesn't appear to be a "class" declaration.`);
    }
    const ngModule = ngModuleRef;
    return { name, ngModule, declaration, container };
  }
  getDtsModuleWithProvidersFunction(fn) {
    let dtsFn = null;
    const containerClass = fn.container && this.host.getClassSymbol(fn.container);
    if (containerClass) {
      const dtsClass = this.host.getDtsDeclaration(containerClass.declaration.valueDeclaration);
      dtsFn = dtsClass && ts15.isClassDeclaration(dtsClass) ? dtsClass.members.find((member) => ts15.isMethodDeclaration(member) && ts15.isIdentifier(member.name) && member.name.text === fn.name) : null;
    } else {
      dtsFn = this.host.getDtsDeclaration(fn.declaration);
    }
    if (!dtsFn) {
      throw new Error(`Matching type declaration for ${fn.declaration.getText()} is missing`);
    }
    if (!isFunctionOrMethod(dtsFn)) {
      throw new Error(`Matching type declaration for ${fn.declaration.getText()} is not a function: ${dtsFn.getText()}`);
    }
    const container = containerClass ? containerClass.declaration.valueDeclaration : null;
    const ngModule = this.resolveNgModuleReference(fn);
    return { name: fn.name, container, declaration: dtsFn, ngModule };
  }
  resolveNgModuleReference(fn) {
    const ngModule = fn.ngModule;
    if (ngModule.bestGuessOwningModule !== null) {
      return ngModule;
    }
    const dtsNgModule = this.host.getDtsDeclaration(ngModule.node);
    if (!dtsNgModule) {
      throw new Error(`No typings declaration can be found for the referenced NgModule class in ${fn.declaration.getText()}.`);
    }
    if (!isNamedClassDeclaration(dtsNgModule)) {
      throw new Error(`The referenced NgModule in ${fn.declaration.getText()} is not a named class declaration in the typings program; instead we get ${dtsNgModule.getText()}`);
    }
    return new Reference(dtsNgModule, null);
  }
};
function isFunctionOrMethod(declaration) {
  return ts15.isFunctionDeclaration(declaration) || ts15.isMethodDeclaration(declaration);
}
function isAnyKeyword(typeParam) {
  return typeParam.kind === ts15.SyntaxKind.AnyKeyword;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/analysis/ngcc_references_registry.mjs
var NgccReferencesRegistry = class {
  constructor(host) {
    this.host = host;
    this.map = new Map();
  }
  add(source, ...references) {
    references.forEach((ref) => {
      if (ref.bestGuessOwningModule === null && hasNameIdentifier(ref.node)) {
        const declaration = this.host.getDeclarationOfIdentifier(ref.node.name);
        if (declaration && hasNameIdentifier(declaration.node)) {
          this.map.set(declaration.node.name, declaration);
        }
      }
    });
  }
  getDeclarationMap() {
    return this.map;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/analysis/private_declarations_analyzer.mjs
var PrivateDeclarationsAnalyzer = class {
  constructor(host, referencesRegistry) {
    this.host = host;
    this.referencesRegistry = referencesRegistry;
  }
  analyzeProgram(program) {
    const rootFiles = this.getRootFiles(program);
    return this.getPrivateDeclarations(rootFiles, this.referencesRegistry.getDeclarationMap());
  }
  getRootFiles(program) {
    return program.getRootFileNames().map((f) => program.getSourceFile(f)).filter(isDefined);
  }
  getPrivateDeclarations(rootFiles, declarations) {
    const privateDeclarations = new Map(declarations);
    rootFiles.forEach((f) => {
      const exports = this.host.getExportsOfModule(f);
      if (exports) {
        exports.forEach((declaration, exportedName) => {
          if (declaration.node !== null && hasNameIdentifier(declaration.node)) {
            if (privateDeclarations.has(declaration.node.name)) {
              const privateDeclaration = privateDeclarations.get(declaration.node.name);
              if (privateDeclaration.node !== declaration.node) {
                throw new Error(`${declaration.node.name.text} is declared multiple times.`);
              }
              privateDeclarations.delete(declaration.node.name);
            }
          }
        });
      }
    });
    return Array.from(privateDeclarations.keys()).map((id) => {
      const from = absoluteFromSourceFile(id.getSourceFile());
      const declaration = privateDeclarations.get(id);
      const dtsDeclaration = this.host.getDtsDeclaration(declaration.node);
      const dtsFrom = dtsDeclaration && absoluteFromSourceFile(dtsDeclaration.getSourceFile());
      return { identifier: id.text, from, dtsFrom };
    });
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/analysis/switch_marker_analyzer.mjs
var SwitchMarkerAnalyses = Map;
var SwitchMarkerAnalyzer = class {
  constructor(host, packagePath) {
    this.host = host;
    this.packagePath = packagePath;
  }
  analyzeProgram(program) {
    const analyzedFiles = new SwitchMarkerAnalyses();
    program.getSourceFiles().filter((sourceFile) => isWithinPackage(this.packagePath, absoluteFromSourceFile(sourceFile))).forEach((sourceFile) => {
      const declarations = this.host.getSwitchableDeclarations(sourceFile);
      if (declarations.length) {
        analyzedFiles.set(sourceFile, { sourceFile, declarations });
      }
    });
    return analyzedFiles;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/host/commonjs_host.mjs
import ts16 from "typescript";
var CommonJsReflectionHost = class extends Esm5ReflectionHost {
  constructor(logger, isCore, src, dts = null) {
    super(logger, isCore, src, dts);
    this.commonJsExports = new FactoryMap((sf) => this.computeExportsOfCommonJsModule(sf));
    this.topLevelHelperCalls = new FactoryMap((helperName) => new FactoryMap((sf) => sf.statements.map((stmt) => this.getHelperCall(stmt, [helperName])).filter(isDefined)));
    this.program = src.program;
    this.compilerHost = src.host;
  }
  getImportOfIdentifier(id) {
    const requireCall = this.findCommonJsImport(id);
    if (requireCall === null) {
      return null;
    }
    return { from: requireCall.arguments[0].text, name: id.text };
  }
  getDeclarationOfIdentifier(id) {
    return this.getCommonJsModuleDeclaration(id) || super.getDeclarationOfIdentifier(id);
  }
  getExportsOfModule(module) {
    return super.getExportsOfModule(module) || this.commonJsExports.get(module.getSourceFile());
  }
  getHelperCallsForClass(classSymbol, helperNames) {
    const esm5HelperCalls = super.getHelperCallsForClass(classSymbol, helperNames);
    if (esm5HelperCalls.length > 0) {
      return esm5HelperCalls;
    } else {
      const sourceFile = classSymbol.declaration.valueDeclaration.getSourceFile();
      return this.getTopLevelHelperCalls(sourceFile, helperNames);
    }
  }
  getTopLevelHelperCalls(sourceFile, helperNames) {
    const calls = [];
    helperNames.forEach((helperName) => {
      const helperCallsMap = this.topLevelHelperCalls.get(helperName);
      calls.push(...helperCallsMap.get(sourceFile));
    });
    return calls;
  }
  computeExportsOfCommonJsModule(sourceFile) {
    const moduleMap = new Map();
    for (const statement of this.getModuleStatements(sourceFile)) {
      if (isExportsStatement(statement)) {
        const exportDeclaration = this.extractBasicCommonJsExportDeclaration(statement);
        moduleMap.set(exportDeclaration.name, exportDeclaration.declaration);
      } else if (isWildcardReexportStatement(statement)) {
        const reexports = this.extractCommonJsWildcardReexports(statement, sourceFile);
        for (const reexport of reexports) {
          moduleMap.set(reexport.name, reexport.declaration);
        }
      } else if (isDefinePropertyReexportStatement(statement)) {
        const exportDeclaration = this.extractCommonJsDefinePropertyExportDeclaration(statement);
        if (exportDeclaration !== null) {
          moduleMap.set(exportDeclaration.name, exportDeclaration.declaration);
        }
      }
    }
    return moduleMap;
  }
  extractBasicCommonJsExportDeclaration(statement) {
    var _a;
    const exportExpression = skipAliases(statement.expression.right);
    const node = statement.expression.left;
    const declaration = (_a = this.getDeclarationOfExpression(exportExpression)) != null ? _a : {
      kind: 1,
      node,
      implementation: exportExpression,
      known: null,
      viaModule: null
    };
    return { name: node.name.text, declaration };
  }
  extractCommonJsWildcardReexports(statement, containingFile) {
    const reexportArg = statement.expression.arguments[0];
    const requireCall = isRequireCall(reexportArg) ? reexportArg : ts16.isIdentifier(reexportArg) ? findRequireCallReference(reexportArg, this.checker) : null;
    if (requireCall === null) {
      return [];
    }
    const importPath = requireCall.arguments[0].text;
    const importedFile = this.resolveModuleName(importPath, containingFile);
    if (importedFile === void 0) {
      return [];
    }
    const importedExports = this.getExportsOfModule(importedFile);
    if (importedExports === null) {
      return [];
    }
    const viaModule = isExternalImport(importPath) ? importPath : null;
    const reexports = [];
    importedExports.forEach((declaration, name) => {
      if (viaModule !== null && declaration.viaModule === null) {
        declaration = __spreadProps(__spreadValues({}, declaration), { viaModule });
      }
      reexports.push({ name, declaration });
    });
    return reexports;
  }
  extractCommonJsDefinePropertyExportDeclaration(statement) {
    const args = statement.expression.arguments;
    const name = args[1].text;
    const getterFnExpression = extractGetterFnExpression(statement);
    if (getterFnExpression === null) {
      return null;
    }
    const declaration = this.getDeclarationOfExpression(getterFnExpression);
    if (declaration !== null) {
      return { name, declaration };
    }
    return {
      name,
      declaration: {
        kind: 1,
        node: args[1],
        implementation: getterFnExpression,
        known: null,
        viaModule: null
      }
    };
  }
  findCommonJsImport(id) {
    const nsIdentifier = findNamespaceOfIdentifier(id);
    return nsIdentifier && findRequireCallReference(nsIdentifier, this.checker);
  }
  getCommonJsModuleDeclaration(id) {
    const requireCall = findRequireCallReference(id, this.checker);
    if (requireCall === null) {
      return null;
    }
    const importPath = requireCall.arguments[0].text;
    const module = this.resolveModuleName(importPath, id.getSourceFile());
    if (module === void 0) {
      return null;
    }
    const viaModule = isExternalImport(importPath) ? importPath : null;
    return { node: module, known: null, viaModule, identity: null, kind: 0 };
  }
  getDeclarationOfExpression(expression) {
    const inner = getInnerClassDeclaration(expression);
    if (inner !== null) {
      const outer = getOuterNodeFromInnerDeclaration(inner);
      if (outer !== null && isExportsAssignment(outer)) {
        return {
          kind: 1,
          node: outer.left,
          implementation: inner,
          known: null,
          viaModule: null
        };
      }
    }
    return super.getDeclarationOfExpression(expression);
  }
  resolveModuleName(moduleName, containingFile) {
    if (this.compilerHost.resolveModuleNames) {
      const moduleInfo = this.compilerHost.resolveModuleNames([moduleName], containingFile.fileName, void 0, void 0, this.program.getCompilerOptions())[0];
      return moduleInfo && this.program.getSourceFile(absoluteFrom(moduleInfo.resolvedFileName));
    } else {
      const moduleInfo = ts16.resolveModuleName(moduleName, containingFile.fileName, this.program.getCompilerOptions(), this.compilerHost);
      return moduleInfo.resolvedModule && this.program.getSourceFile(absoluteFrom(moduleInfo.resolvedModule.resolvedFileName));
    }
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/host/delegating_host.mjs
var DelegatingReflectionHost = class {
  constructor(tsHost, ngccHost) {
    this.tsHost = tsHost;
    this.ngccHost = ngccHost;
  }
  getConstructorParameters(clazz) {
    if (isFromDtsFile(clazz)) {
      return this.tsHost.getConstructorParameters(clazz);
    }
    return this.ngccHost.getConstructorParameters(clazz);
  }
  getDeclarationOfIdentifier(id) {
    if (isFromDtsFile(id)) {
      const declaration = this.tsHost.getDeclarationOfIdentifier(id);
      return declaration !== null ? this.detectKnownDeclaration(declaration) : null;
    }
    return this.ngccHost.getDeclarationOfIdentifier(id);
  }
  getDecoratorsOfDeclaration(declaration) {
    if (isFromDtsFile(declaration)) {
      return this.tsHost.getDecoratorsOfDeclaration(declaration);
    }
    return this.ngccHost.getDecoratorsOfDeclaration(declaration);
  }
  getDefinitionOfFunction(fn) {
    if (isFromDtsFile(fn)) {
      return this.tsHost.getDefinitionOfFunction(fn);
    }
    return this.ngccHost.getDefinitionOfFunction(fn);
  }
  getDtsDeclaration(declaration) {
    if (isFromDtsFile(declaration)) {
      return this.tsHost.getDtsDeclaration(declaration);
    }
    return this.ngccHost.getDtsDeclaration(declaration);
  }
  getExportsOfModule(module) {
    if (isFromDtsFile(module)) {
      const exportMap = this.tsHost.getExportsOfModule(module);
      if (exportMap !== null) {
        exportMap.forEach((decl) => this.detectKnownDeclaration(decl));
      }
      return exportMap;
    }
    return this.ngccHost.getExportsOfModule(module);
  }
  getGenericArityOfClass(clazz) {
    if (isFromDtsFile(clazz)) {
      return this.tsHost.getGenericArityOfClass(clazz);
    }
    return this.ngccHost.getGenericArityOfClass(clazz);
  }
  getImportOfIdentifier(id) {
    if (isFromDtsFile(id)) {
      return this.tsHost.getImportOfIdentifier(id);
    }
    return this.ngccHost.getImportOfIdentifier(id);
  }
  getInternalNameOfClass(clazz) {
    if (isFromDtsFile(clazz)) {
      return this.tsHost.getInternalNameOfClass(clazz);
    }
    return this.ngccHost.getInternalNameOfClass(clazz);
  }
  getAdjacentNameOfClass(clazz) {
    if (isFromDtsFile(clazz)) {
      return this.tsHost.getAdjacentNameOfClass(clazz);
    }
    return this.ngccHost.getAdjacentNameOfClass(clazz);
  }
  getMembersOfClass(clazz) {
    if (isFromDtsFile(clazz)) {
      return this.tsHost.getMembersOfClass(clazz);
    }
    return this.ngccHost.getMembersOfClass(clazz);
  }
  getVariableValue(declaration) {
    if (isFromDtsFile(declaration)) {
      return this.tsHost.getVariableValue(declaration);
    }
    return this.ngccHost.getVariableValue(declaration);
  }
  hasBaseClass(clazz) {
    if (isFromDtsFile(clazz)) {
      return this.tsHost.hasBaseClass(clazz);
    }
    return this.ngccHost.hasBaseClass(clazz);
  }
  getBaseClassExpression(clazz) {
    if (isFromDtsFile(clazz)) {
      return this.tsHost.getBaseClassExpression(clazz);
    }
    return this.ngccHost.getBaseClassExpression(clazz);
  }
  isClass(node) {
    if (isFromDtsFile(node)) {
      return this.tsHost.isClass(node);
    }
    return this.ngccHost.isClass(node);
  }
  findClassSymbols(sourceFile) {
    return this.ngccHost.findClassSymbols(sourceFile);
  }
  getClassSymbol(node) {
    return this.ngccHost.getClassSymbol(node);
  }
  getDecoratorsOfSymbol(symbol) {
    return this.ngccHost.getDecoratorsOfSymbol(symbol);
  }
  getSwitchableDeclarations(module) {
    return this.ngccHost.getSwitchableDeclarations(module);
  }
  getEndOfClass(classSymbol) {
    return this.ngccHost.getEndOfClass(classSymbol);
  }
  detectKnownDeclaration(decl) {
    return this.ngccHost.detectKnownDeclaration(decl);
  }
  isStaticallyExported(decl) {
    return this.ngccHost.isStaticallyExported(decl);
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/rendering/commonjs_rendering_formatter.mjs
import ts19 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/rendering/esm5_rendering_formatter.mjs
import ts18 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/rendering/esm_rendering_formatter.mjs
import ts17 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/rendering/ngcc_import_rewriter.mjs
var NgccFlatImportRewriter = class {
  shouldImportSymbol(symbol, specifier) {
    if (specifier === "@angular/core") {
      return false;
    } else {
      return true;
    }
  }
  rewriteSymbol(symbol, specifier) {
    if (specifier === "@angular/core") {
      return validateAndRewriteCoreSymbol(symbol);
    } else {
      return symbol;
    }
  }
  rewriteSpecifier(originalModulePath, inContextOfFile) {
    return originalModulePath;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/rendering/utils.mjs
function getImportRewriter(r3SymbolsFile, isCore, isFlat) {
  if (isCore && isFlat) {
    return new NgccFlatImportRewriter();
  } else if (isCore) {
    return new R3SymbolsImportRewriter(r3SymbolsFile.fileName);
  } else {
    return new NoopImportRewriter();
  }
}
function stripExtension2(filePath) {
  return filePath.replace(/\.(js|d\.ts)$/, "");
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/rendering/esm_rendering_formatter.mjs
var EsmRenderingFormatter = class {
  constructor(fs, host, isCore) {
    this.fs = fs;
    this.host = host;
    this.isCore = isCore;
    this.printer = ts17.createPrinter({ newLine: ts17.NewLineKind.LineFeed });
  }
  addImports(output, imports, sf) {
    if (imports.length === 0) {
      return;
    }
    const insertionPoint = this.findEndOfImports(sf);
    const renderedImports = imports.map((i) => `import * as ${i.qualifier.text} from '${i.specifier}';
`).join("");
    output.appendLeft(insertionPoint, renderedImports);
  }
  addExports(output, entryPointBasePath, exports, importManager, file) {
    exports.forEach((e) => {
      let exportFrom = "";
      const isDtsFile = isDtsPath(entryPointBasePath);
      const from = isDtsFile ? e.dtsFrom : e.from;
      if (from) {
        const basePath = stripExtension2(from);
        const relativePath = this.fs.relative(this.fs.dirname(entryPointBasePath), basePath);
        const relativeImport = toRelativeImport(relativePath);
        exportFrom = entryPointBasePath !== basePath ? ` from '${relativeImport}'` : "";
      }
      const exportStr = `
export {${e.identifier}}${exportFrom};`;
      output.append(exportStr);
    });
  }
  addDirectExports(output, exports, importManager, file) {
    for (const e of exports) {
      const exportStatement = `
export {${e.symbolName} as ${e.asAlias}} from '${e.fromModule}';`;
      output.append(exportStatement);
    }
  }
  addConstants(output, constants, file) {
    if (constants === "") {
      return;
    }
    const insertionPoint = this.findEndOfImports(file);
    output.appendRight(insertionPoint, "\n" + constants + "\n");
  }
  addDefinitions(output, compiledClass, definitions) {
    const classSymbol = this.host.getClassSymbol(compiledClass.declaration);
    if (!classSymbol) {
      throw new Error(`Compiled class does not have a valid symbol: ${compiledClass.name}`);
    }
    const declarationStatement = getContainingStatement(classSymbol.implementation.valueDeclaration);
    const insertionPoint = declarationStatement.getEnd();
    output.appendLeft(insertionPoint, "\n" + definitions);
  }
  addAdjacentStatements(output, compiledClass, statements) {
    const classSymbol = this.host.getClassSymbol(compiledClass.declaration);
    if (!classSymbol) {
      throw new Error(`Compiled class does not have a valid symbol: ${compiledClass.name}`);
    }
    const endOfClass = this.host.getEndOfClass(classSymbol);
    output.appendLeft(endOfClass.getEnd(), "\n" + statements);
  }
  removeDecorators(output, decoratorsToRemove) {
    decoratorsToRemove.forEach((nodesToRemove, containerNode) => {
      if (ts17.isArrayLiteralExpression(containerNode)) {
        const items = containerNode.elements;
        if (items.length === nodesToRemove.length) {
          const statement = findStatement(containerNode);
          if (statement) {
            if (ts17.isExpressionStatement(statement)) {
              output.remove(statement.getFullStart(), statement.getEnd());
            } else if (ts17.isReturnStatement(statement) && statement.expression && isAssignment2(statement.expression)) {
              const startOfRemoval = statement.expression.left.getEnd();
              const endOfRemoval = getEndExceptSemicolon(statement);
              output.remove(startOfRemoval, endOfRemoval);
            }
          }
        } else {
          nodesToRemove.forEach((node) => {
            const nextSibling = getNextSiblingInArray(node, items);
            let end;
            if (nextSibling !== null && output.slice(nextSibling.getFullStart() - 1, nextSibling.getFullStart()) === ",") {
              end = nextSibling.getFullStart() - 1 + nextSibling.getLeadingTriviaWidth();
            } else if (output.slice(node.getEnd(), node.getEnd() + 1) === ",") {
              end = node.getEnd() + 1;
            } else {
              end = node.getEnd();
            }
            output.remove(node.getFullStart(), end);
          });
        }
      }
    });
  }
  rewriteSwitchableDeclarations(outputText, sourceFile, declarations) {
    declarations.forEach((declaration) => {
      const start = declaration.initializer.getStart();
      const end = declaration.initializer.getEnd();
      const replacement = declaration.initializer.text.replace(PRE_R3_MARKER, POST_R3_MARKER);
      outputText.overwrite(start, end, replacement);
    });
  }
  addModuleWithProvidersParams(outputText, moduleWithProviders, importManager) {
    moduleWithProviders.forEach((info) => {
      const ngModuleName = info.ngModule.node.name.text;
      const declarationFile = absoluteFromSourceFile(info.declaration.getSourceFile());
      const ngModuleFile = absoluteFromSourceFile(info.ngModule.node.getSourceFile());
      const relativePath = this.fs.relative(this.fs.dirname(declarationFile), ngModuleFile);
      const relativeImport = toRelativeImport(relativePath);
      const importPath = info.ngModule.ownedByModuleGuess || (declarationFile !== ngModuleFile ? stripExtension2(relativeImport) : null);
      const ngModule = generateImportString(importManager, importPath, ngModuleName);
      if (info.declaration.type) {
        const typeName = info.declaration.type && ts17.isTypeReferenceNode(info.declaration.type) ? info.declaration.type.typeName : null;
        if (this.isCoreModuleWithProvidersType(typeName)) {
          outputText.overwrite(info.declaration.type.getStart(), info.declaration.type.getEnd(), `ModuleWithProviders<${ngModule}>`);
        } else {
          const originalTypeString = info.declaration.type.getText();
          outputText.overwrite(info.declaration.type.getStart(), info.declaration.type.getEnd(), `(${originalTypeString})&{ngModule:${ngModule}}`);
        }
      } else {
        const lastToken = info.declaration.getLastToken();
        const insertPoint = lastToken && lastToken.kind === ts17.SyntaxKind.SemicolonToken ? lastToken.getStart() : info.declaration.getEnd();
        outputText.appendLeft(insertPoint, `: ${generateImportString(importManager, "@angular/core", "ModuleWithProviders")}<${ngModule}>`);
      }
    });
  }
  printStatement(stmt, sourceFile, importManager) {
    const node = translateStatement(stmt, importManager);
    const code = this.printer.printNode(ts17.EmitHint.Unspecified, node, sourceFile);
    return code;
  }
  findEndOfImports(sf) {
    for (const stmt of sf.statements) {
      if (!ts17.isImportDeclaration(stmt) && !ts17.isImportEqualsDeclaration(stmt) && !ts17.isNamespaceImport(stmt)) {
        return stmt.getStart();
      }
    }
    return 0;
  }
  isCoreModuleWithProvidersType(typeName) {
    const id = typeName && ts17.isIdentifier(typeName) ? this.host.getImportOfIdentifier(typeName) : null;
    return id && id.name === "ModuleWithProviders" && (this.isCore || id.from === "@angular/core");
  }
};
function findStatement(node) {
  while (node) {
    if (ts17.isExpressionStatement(node) || ts17.isReturnStatement(node)) {
      return node;
    }
    node = node.parent;
  }
  return void 0;
}
function generateImportString(importManager, importPath, importName) {
  const importAs = importPath ? importManager.generateNamedImport(importPath, importName) : null;
  return importAs && importAs.moduleImport ? `${importAs.moduleImport.text}.${importAs.symbol}` : `${importName}`;
}
function getNextSiblingInArray(node, array) {
  const index = array.indexOf(node);
  return index !== -1 && array.length > index + 1 ? array[index + 1] : null;
}
function getEndExceptSemicolon(statement) {
  const lastToken = statement.getLastToken();
  return lastToken && lastToken.kind === ts17.SyntaxKind.SemicolonToken ? statement.getEnd() - 1 : statement.getEnd();
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/rendering/esm5_rendering_formatter.mjs
var Esm5RenderingFormatter = class extends EsmRenderingFormatter {
  addDefinitions(output, compiledClass, definitions) {
    const classSymbol = this.host.getClassSymbol(compiledClass.declaration);
    if (!classSymbol) {
      throw new Error(`Compiled class "${compiledClass.name}" in "${compiledClass.declaration.getSourceFile().fileName}" does not have a valid syntax.
Expected an ES5 IIFE wrapped function. But got:
` + compiledClass.declaration.getText());
    }
    const declarationStatement = getContainingStatement(classSymbol.implementation.valueDeclaration);
    const iifeBody = declarationStatement.parent;
    if (!iifeBody || !ts18.isBlock(iifeBody)) {
      throw new Error(`Compiled class declaration is not inside an IIFE: ${compiledClass.name} in ${compiledClass.declaration.getSourceFile().fileName}`);
    }
    const returnStatement = iifeBody.statements.find(ts18.isReturnStatement);
    if (!returnStatement) {
      throw new Error(`Compiled class wrapper IIFE does not have a return statement: ${compiledClass.name} in ${compiledClass.declaration.getSourceFile().fileName}`);
    }
    const insertionPoint = returnStatement.getFullStart();
    output.appendLeft(insertionPoint, "\n" + definitions);
  }
  printStatement(stmt, sourceFile, importManager) {
    const node = translateStatement(stmt, importManager, { downlevelTaggedTemplates: true, downlevelVariableDeclarations: true });
    const code = this.printer.printNode(ts18.EmitHint.Unspecified, node, sourceFile);
    return code;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/rendering/commonjs_rendering_formatter.mjs
var CommonJsRenderingFormatter = class extends Esm5RenderingFormatter {
  constructor(fs, commonJsHost, isCore) {
    super(fs, commonJsHost, isCore);
    this.commonJsHost = commonJsHost;
  }
  addImports(output, imports, file) {
    if (imports.length === 0) {
      return;
    }
    const insertionPoint = this.findEndOfImports(file);
    const renderedImports = imports.map((i) => `var ${i.qualifier.text} = require('${i.specifier}');
`).join("");
    output.appendLeft(insertionPoint, renderedImports);
  }
  addExports(output, entryPointBasePath, exports, importManager, file) {
    exports.forEach((e) => {
      const basePath = stripExtension2(e.from);
      const relativePath = "./" + this.fs.relative(this.fs.dirname(entryPointBasePath), basePath);
      const namedImport = entryPointBasePath !== basePath ? importManager.generateNamedImport(relativePath, e.identifier) : { symbol: e.identifier, moduleImport: null };
      const importNamespace = namedImport.moduleImport ? `${namedImport.moduleImport.text}.` : "";
      const exportStr = `
exports.${e.identifier} = ${importNamespace}${namedImport.symbol};`;
      output.append(exportStr);
    });
  }
  addDirectExports(output, exports, importManager, file) {
    for (const e of exports) {
      const namedImport = importManager.generateNamedImport(e.fromModule, e.symbolName);
      const importNamespace = namedImport.moduleImport ? `${namedImport.moduleImport.text}.` : "";
      const exportStr = `
exports.${e.asAlias} = ${importNamespace}${namedImport.symbol};`;
      output.append(exportStr);
    }
  }
  findEndOfImports(sf) {
    for (const statement of sf.statements) {
      if (ts19.isExpressionStatement(statement) && isRequireCall(statement.expression)) {
        continue;
      }
      const declarations = ts19.isVariableStatement(statement) ? Array.from(statement.declarationList.declarations) : [];
      if (declarations.some((d) => !d.initializer || !isRequireCall(d.initializer))) {
        return statement.getStart();
      }
    }
    return 0;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/rendering/dts_renderer.mjs
import MagicString from "magic-string";
import ts20 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/constants.mjs
var IMPORT_PREFIX = "\u0275ngcc";
var NGCC_TIMED_OUT_EXIT_CODE = 177;

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/rendering/source_maps.mjs
import mapHelpers from "convert-source-map";
function renderSourceAndMap(logger, fs, sourceFile, generatedMagicString) {
  var _a;
  const sourceFilePath = absoluteFromSourceFile(sourceFile);
  const sourceMapPath = absoluteFrom(`${sourceFilePath}.map`);
  const generatedContent = generatedMagicString.toString();
  const generatedMap = generatedMagicString.generateMap({ file: sourceFilePath, source: sourceFilePath, includeContent: true });
  try {
    const loader = new SourceFileLoader(fs, logger, {});
    const generatedFile = loader.loadSourceFile(sourceFilePath, generatedContent, { map: generatedMap, mapPath: sourceMapPath });
    const rawMergedMap = generatedFile.renderFlattenedSourceMap();
    const mergedMap = mapHelpers.fromObject(rawMergedMap);
    const originalFile = loader.loadSourceFile(sourceFilePath, generatedMagicString.original);
    if (originalFile.rawMap === null && !sourceFile.isDeclarationFile || ((_a = originalFile.rawMap) == null ? void 0 : _a.origin) === ContentOrigin.Inline) {
      return [
        { path: sourceFilePath, contents: `${generatedFile.contents}
${mergedMap.toComment()}` }
      ];
    }
    const sourceMapComment = mapHelpers.generateMapFileComment(`${fs.basename(sourceFilePath)}.map`);
    return [
      { path: sourceFilePath, contents: `${generatedFile.contents}
${sourceMapComment}` },
      { path: sourceMapPath, contents: mergedMap.toJSON() }
    ];
  } catch (e) {
    logger.error(`Error when flattening the source-map "${sourceMapPath}" for "${sourceFilePath}": ${e.toString()}`);
    return [
      { path: sourceFilePath, contents: generatedContent },
      { path: sourceMapPath, contents: mapHelpers.fromObject(generatedMap).toJSON() }
    ];
  }
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/rendering/dts_renderer.mjs
var DtsRenderInfo = class {
  constructor() {
    this.classInfo = [];
    this.moduleWithProviders = [];
    this.privateExports = [];
    this.reexports = [];
  }
};
var DtsRenderer = class {
  constructor(dtsFormatter, fs, logger, host, bundle) {
    this.dtsFormatter = dtsFormatter;
    this.fs = fs;
    this.logger = logger;
    this.host = host;
    this.bundle = bundle;
  }
  renderProgram(decorationAnalyses, privateDeclarationsAnalyses, moduleWithProvidersAnalyses) {
    const renderedFiles = [];
    if (this.bundle.dts) {
      const dtsFiles = this.getTypingsFilesToRender(decorationAnalyses, privateDeclarationsAnalyses, moduleWithProvidersAnalyses);
      if (!dtsFiles.has(this.bundle.dts.file)) {
        dtsFiles.set(this.bundle.dts.file, new DtsRenderInfo());
      }
      dtsFiles.forEach((renderInfo, file) => renderedFiles.push(...this.renderDtsFile(file, renderInfo)));
    }
    return renderedFiles;
  }
  renderDtsFile(dtsFile, renderInfo) {
    const outputText = new MagicString(dtsFile.text);
    const printer = ts20.createPrinter();
    const importManager = new ImportManager(getImportRewriter(this.bundle.dts.r3SymbolsFile, this.bundle.isCore, false), IMPORT_PREFIX);
    renderInfo.classInfo.forEach((dtsClass) => {
      const endOfClass = dtsClass.dtsDeclaration.getEnd();
      dtsClass.compilation.forEach((declaration) => {
        const type = translateType(declaration.type, importManager);
        markForEmitAsSingleLine(type);
        const typeStr = printer.printNode(ts20.EmitHint.Unspecified, type, dtsFile);
        const newStatement = `    static ${declaration.name}: ${typeStr};
`;
        outputText.appendRight(endOfClass - 1, newStatement);
      });
    });
    if (renderInfo.reexports.length > 0) {
      for (const e of renderInfo.reexports) {
        const newStatement = `
export {${e.symbolName} as ${e.asAlias}} from '${e.fromModule}';`;
        outputText.append(newStatement);
      }
    }
    this.dtsFormatter.addModuleWithProvidersParams(outputText, renderInfo.moduleWithProviders, importManager);
    this.dtsFormatter.addExports(outputText, dtsFile.fileName, renderInfo.privateExports, importManager, dtsFile);
    this.dtsFormatter.addImports(outputText, importManager.getAllImports(dtsFile.fileName), dtsFile);
    return renderSourceAndMap(this.logger, this.fs, dtsFile, outputText);
  }
  getTypingsFilesToRender(decorationAnalyses, privateDeclarationsAnalyses, moduleWithProvidersAnalyses) {
    const dtsMap = new Map();
    decorationAnalyses.forEach((compiledFile) => {
      let appliedReexports = false;
      compiledFile.compiledClasses.forEach((compiledClass) => {
        const dtsDeclaration = this.host.getDtsDeclaration(compiledClass.declaration);
        if (dtsDeclaration) {
          const dtsFile = dtsDeclaration.getSourceFile();
          const renderInfo = dtsMap.has(dtsFile) ? dtsMap.get(dtsFile) : new DtsRenderInfo();
          renderInfo.classInfo.push({ dtsDeclaration, compilation: compiledClass.compilation });
          if (!appliedReexports && compiledClass.declaration.getSourceFile().fileName === dtsFile.fileName.replace(/\.d\.ts$/, ".js")) {
            renderInfo.reexports.push(...compiledFile.reexports);
            appliedReexports = true;
          }
          dtsMap.set(dtsFile, renderInfo);
        }
      });
    });
    if (moduleWithProvidersAnalyses !== null) {
      moduleWithProvidersAnalyses.forEach((moduleWithProvidersToFix, dtsFile) => {
        const renderInfo = dtsMap.has(dtsFile) ? dtsMap.get(dtsFile) : new DtsRenderInfo();
        renderInfo.moduleWithProviders = moduleWithProvidersToFix;
        dtsMap.set(dtsFile, renderInfo);
      });
    }
    if (privateDeclarationsAnalyses.length) {
      privateDeclarationsAnalyses.forEach((e) => {
        if (!e.dtsFrom) {
          throw new Error(`There is no typings path for ${e.identifier} in ${e.from}.
We need to add an export for this class to a .d.ts typings file because Angular compiler needs to be able to reference this class in compiled code, such as templates.
The simplest fix for this is to ensure that this class is exported from the package's entry-point.`);
        }
      });
      const dtsEntryPoint = this.bundle.dts.file;
      const renderInfo = dtsMap.has(dtsEntryPoint) ? dtsMap.get(dtsEntryPoint) : new DtsRenderInfo();
      renderInfo.privateExports = privateDeclarationsAnalyses;
      dtsMap.set(dtsEntryPoint, renderInfo);
    }
    return dtsMap;
  }
};
function markForEmitAsSingleLine(node) {
  ts20.setEmitFlags(node, ts20.EmitFlags.SingleLine);
  ts20.forEachChild(node, markForEmitAsSingleLine);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/rendering/renderer.mjs
import { jsDocComment, WrappedNodeExpr, WritePropExpr } from "@angular/compiler";
import MagicString2 from "magic-string";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/rendering/rendering_formatter.mjs
var RedundantDecoratorMap = Map;

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/rendering/renderer.mjs
var Renderer = class {
  constructor(host, srcFormatter, fs, logger, bundle, tsConfig = null) {
    this.host = host;
    this.srcFormatter = srcFormatter;
    this.fs = fs;
    this.logger = logger;
    this.bundle = bundle;
    this.tsConfig = tsConfig;
  }
  renderProgram(decorationAnalyses, switchMarkerAnalyses, privateDeclarationsAnalyses) {
    const renderedFiles = [];
    this.bundle.src.program.getSourceFiles().forEach((sourceFile) => {
      if (decorationAnalyses.has(sourceFile) || switchMarkerAnalyses.has(sourceFile) || sourceFile === this.bundle.src.file) {
        const compiledFile = decorationAnalyses.get(sourceFile);
        const switchMarkerAnalysis = switchMarkerAnalyses.get(sourceFile);
        renderedFiles.push(...this.renderFile(sourceFile, compiledFile, switchMarkerAnalysis, privateDeclarationsAnalyses));
      }
    });
    return renderedFiles;
  }
  renderFile(sourceFile, compiledFile, switchMarkerAnalysis, privateDeclarationsAnalyses) {
    const isEntryPoint2 = sourceFile === this.bundle.src.file;
    const outputText = new MagicString2(sourceFile.text);
    if (switchMarkerAnalysis) {
      this.srcFormatter.rewriteSwitchableDeclarations(outputText, switchMarkerAnalysis.sourceFile, switchMarkerAnalysis.declarations);
    }
    const importManager = new ImportManager(getImportRewriter(this.bundle.src.r3SymbolsFile, this.bundle.isCore, this.bundle.isFlatCore), IMPORT_PREFIX);
    if (compiledFile) {
      const decoratorsToRemove = this.computeDecoratorsToRemove(compiledFile.compiledClasses);
      this.srcFormatter.removeDecorators(outputText, decoratorsToRemove);
      compiledFile.compiledClasses.forEach((clazz) => {
        var _a;
        const renderedDefinition = this.renderDefinitions(compiledFile.sourceFile, clazz, importManager, !!((_a = this.tsConfig) == null ? void 0 : _a.options.annotateForClosureCompiler));
        this.srcFormatter.addDefinitions(outputText, clazz, renderedDefinition);
        const renderedStatements = this.renderAdjacentStatements(compiledFile.sourceFile, clazz, importManager);
        this.srcFormatter.addAdjacentStatements(outputText, clazz, renderedStatements);
      });
      if (!isEntryPoint2 && compiledFile.reexports.length > 0) {
        this.srcFormatter.addDirectExports(outputText, compiledFile.reexports, importManager, compiledFile.sourceFile);
      }
      this.srcFormatter.addConstants(outputText, renderConstantPool(this.srcFormatter, compiledFile.sourceFile, compiledFile.constantPool, importManager), compiledFile.sourceFile);
    }
    if (isEntryPoint2) {
      const entryPointBasePath = stripExtension2(this.bundle.src.path);
      this.srcFormatter.addExports(outputText, entryPointBasePath, privateDeclarationsAnalyses, importManager, sourceFile);
    }
    if (isEntryPoint2 || compiledFile) {
      this.srcFormatter.addImports(outputText, importManager.getAllImports(sourceFile.fileName), sourceFile);
    }
    if (compiledFile || switchMarkerAnalysis || isEntryPoint2) {
      return renderSourceAndMap(this.logger, this.fs, sourceFile, outputText);
    } else {
      return [];
    }
  }
  computeDecoratorsToRemove(classes) {
    const decoratorsToRemove = new RedundantDecoratorMap();
    classes.forEach((clazz) => {
      if (clazz.decorators === null) {
        return;
      }
      clazz.decorators.forEach((dec) => {
        if (dec.node === null) {
          return;
        }
        const decoratorArray = dec.node.parent;
        if (!decoratorsToRemove.has(decoratorArray)) {
          decoratorsToRemove.set(decoratorArray, [dec.node]);
        } else {
          decoratorsToRemove.get(decoratorArray).push(dec.node);
        }
      });
    });
    return decoratorsToRemove;
  }
  renderDefinitions(sourceFile, compiledClass, imports, annotateForClosureCompiler) {
    const name = this.host.getInternalNameOfClass(compiledClass.declaration);
    const leadingComment = annotateForClosureCompiler ? jsDocComment([{ tagName: "nocollapse" }]) : void 0;
    const statements = compiledClass.compilation.map((c) => createAssignmentStatement(name, c.name, c.initializer, leadingComment));
    return this.renderStatements(sourceFile, statements, imports);
  }
  renderAdjacentStatements(sourceFile, compiledClass, imports) {
    const statements = [];
    for (const c of compiledClass.compilation) {
      statements.push(...c.statements);
    }
    return this.renderStatements(sourceFile, statements, imports);
  }
  renderStatements(sourceFile, statements, imports) {
    const printStatement = (stmt) => this.srcFormatter.printStatement(stmt, sourceFile, imports);
    return statements.map(printStatement).join("\n");
  }
};
function renderConstantPool(formatter, sourceFile, constantPool, imports) {
  const printStatement = (stmt) => formatter.printStatement(stmt, sourceFile, imports);
  return constantPool.statements.map(printStatement).join("\n");
}
function createAssignmentStatement(receiverName, propName, initializer, leadingComment) {
  const receiver = new WrappedNodeExpr(receiverName);
  const statement = new WritePropExpr(receiver, propName, initializer, void 0, void 0).toStmt();
  if (leadingComment !== void 0) {
    statement.addLeadingComment(leadingComment);
  }
  return statement;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/rendering/umd_rendering_formatter.mjs
import ts21 from "typescript";
var UmdRenderingFormatter = class extends Esm5RenderingFormatter {
  constructor(fs, umdHost, isCore) {
    super(fs, umdHost, isCore);
    this.umdHost = umdHost;
  }
  addImports(output, imports, file) {
    if (imports.length === 0) {
      return;
    }
    const umdModule = this.umdHost.getUmdModule(file);
    if (!umdModule) {
      return;
    }
    const { wrapperFn, factoryFn } = umdModule;
    renderCommonJsDependencies(output, wrapperFn, imports);
    renderAmdDependencies(output, wrapperFn, imports);
    renderGlobalDependencies(output, wrapperFn, imports);
    renderFactoryParameters(output, factoryFn, imports);
  }
  addExports(output, entryPointBasePath, exports, importManager, file) {
    const umdModule = this.umdHost.getUmdModule(file);
    if (!umdModule) {
      return;
    }
    const factoryFunction = umdModule.factoryFn;
    const lastStatement = factoryFunction.body.statements[factoryFunction.body.statements.length - 1];
    const insertionPoint = lastStatement ? lastStatement.getEnd() : factoryFunction.body.getEnd() - 1;
    exports.forEach((e) => {
      const basePath = stripExtension2(e.from);
      const relativePath = "./" + this.fs.relative(this.fs.dirname(entryPointBasePath), basePath);
      const namedImport = entryPointBasePath !== basePath ? importManager.generateNamedImport(relativePath, e.identifier) : { symbol: e.identifier, moduleImport: null };
      const importNamespace = namedImport.moduleImport ? `${namedImport.moduleImport.text}.` : "";
      const exportStr = `
exports.${e.identifier} = ${importNamespace}${namedImport.symbol};`;
      output.appendRight(insertionPoint, exportStr);
    });
  }
  addDirectExports(output, exports, importManager, file) {
    const umdModule = this.umdHost.getUmdModule(file);
    if (!umdModule) {
      return;
    }
    const factoryFunction = umdModule.factoryFn;
    const lastStatement = factoryFunction.body.statements[factoryFunction.body.statements.length - 1];
    const insertionPoint = lastStatement ? lastStatement.getEnd() : factoryFunction.body.getEnd() - 1;
    for (const e of exports) {
      const namedImport = importManager.generateNamedImport(e.fromModule, e.symbolName);
      const importNamespace = namedImport.moduleImport ? `${namedImport.moduleImport.text}.` : "";
      const exportStr = `
exports.${e.asAlias} = ${importNamespace}${namedImport.symbol};`;
      output.appendRight(insertionPoint, exportStr);
    }
  }
  addConstants(output, constants, file) {
    if (constants === "") {
      return;
    }
    const umdModule = this.umdHost.getUmdModule(file);
    if (!umdModule) {
      return;
    }
    const factoryFunction = umdModule.factoryFn;
    const firstStatement = factoryFunction.body.statements[0];
    const insertionPoint = firstStatement ? firstStatement.getStart() : factoryFunction.body.getStart() + 1;
    output.appendLeft(insertionPoint, "\n" + constants + "\n");
  }
};
function renderCommonJsDependencies(output, wrapperFunction, imports) {
  const conditional = find(wrapperFunction.body.statements[0], isCommonJSConditional);
  if (!conditional) {
    return;
  }
  const factoryCall = conditional.whenTrue;
  const injectionPoint = factoryCall.arguments.length > 0 ? factoryCall.arguments[0].getFullStart() : factoryCall.getEnd() - 1;
  const importString = imports.map((i) => `require('${i.specifier}')`).join(",");
  output.appendLeft(injectionPoint, importString + (factoryCall.arguments.length > 0 ? "," : ""));
}
function renderAmdDependencies(output, wrapperFunction, imports) {
  const conditional = find(wrapperFunction.body.statements[0], isAmdConditional);
  if (!conditional) {
    return;
  }
  const amdDefineCall = conditional.whenTrue;
  const importString = imports.map((i) => `'${i.specifier}'`).join(",");
  const factoryIndex = amdDefineCall.arguments.length - 1;
  const dependencyArray = amdDefineCall.arguments[factoryIndex - 1];
  if (dependencyArray === void 0 || !ts21.isArrayLiteralExpression(dependencyArray)) {
    const injectionPoint = amdDefineCall.arguments[factoryIndex].getFullStart();
    output.appendLeft(injectionPoint, `[${importString}],`);
  } else {
    const injectionPoint = dependencyArray.elements.length > 0 ? dependencyArray.elements[0].getFullStart() : dependencyArray.getEnd() - 1;
    output.appendLeft(injectionPoint, importString + (dependencyArray.elements.length > 0 ? "," : ""));
  }
}
function renderGlobalDependencies(output, wrapperFunction, imports) {
  const globalFactoryCall = find(wrapperFunction.body.statements[0], isGlobalFactoryCall);
  if (!globalFactoryCall) {
    return;
  }
  const injectionPoint = globalFactoryCall.arguments.length > 0 ? globalFactoryCall.arguments[0].getFullStart() : globalFactoryCall.getEnd() - 1;
  const importString = imports.map((i) => `global.${getGlobalIdentifier(i)}`).join(",");
  output.appendLeft(injectionPoint, importString + (globalFactoryCall.arguments.length > 0 ? "," : ""));
}
function renderFactoryParameters(output, factoryFunction, imports) {
  const parameters = factoryFunction.parameters;
  const parameterString = imports.map((i) => i.qualifier.text).join(",");
  if (parameters.length > 0) {
    const injectionPoint = parameters[0].getFullStart();
    output.appendLeft(injectionPoint, parameterString + ",");
  } else {
    const injectionPoint = factoryFunction.getStart() + factoryFunction.getText().indexOf("()") + 1;
    output.appendLeft(injectionPoint, parameterString);
  }
}
function isCommonJSConditional(value) {
  if (!ts21.isConditionalExpression(value)) {
    return false;
  }
  if (!ts21.isBinaryExpression(value.condition) || value.condition.operatorToken.kind !== ts21.SyntaxKind.AmpersandAmpersandToken) {
    return false;
  }
  if (!oneOfBinaryConditions(value.condition, (exp) => isTypeOf(exp, "exports", "module"))) {
    return false;
  }
  if (!ts21.isCallExpression(value.whenTrue) || !ts21.isIdentifier(value.whenTrue.expression)) {
    return false;
  }
  return value.whenTrue.expression.text === "factory";
}
function isAmdConditional(value) {
  if (!ts21.isConditionalExpression(value)) {
    return false;
  }
  if (!ts21.isBinaryExpression(value.condition) || value.condition.operatorToken.kind !== ts21.SyntaxKind.AmpersandAmpersandToken) {
    return false;
  }
  if (!oneOfBinaryConditions(value.condition, (exp) => isTypeOf(exp, "define"))) {
    return false;
  }
  if (!ts21.isCallExpression(value.whenTrue) || !ts21.isIdentifier(value.whenTrue.expression)) {
    return false;
  }
  return value.whenTrue.expression.text === "define";
}
function isGlobalFactoryCall(value) {
  if (ts21.isCallExpression(value) && !!value.parent) {
    value = isCommaExpression(value.parent) ? value.parent : value;
    value = ts21.isParenthesizedExpression(value.parent) ? value.parent : value;
    return !!value.parent && ts21.isConditionalExpression(value.parent) && value.parent.whenFalse === value;
  } else {
    return false;
  }
}
function isCommaExpression(value) {
  return ts21.isBinaryExpression(value) && value.operatorToken.kind === ts21.SyntaxKind.CommaToken;
}
function getGlobalIdentifier(i) {
  return i.specifier.replace(/^@angular\//, "ng.").replace(/^@/, "").replace(/\//g, ".").replace(/[-_]+(.?)/g, (_, c) => c.toUpperCase()).replace(/^./, (c) => c.toLowerCase());
}
function find(node, test) {
  return test(node) ? node : node.forEachChild((child) => find(child, test));
}
function oneOfBinaryConditions(node, test) {
  return test(node.left) || test(node.right);
}
function isTypeOf(node, ...types) {
  return ts21.isBinaryExpression(node) && ts21.isTypeOfExpression(node.left) && ts21.isIdentifier(node.left.expression) && types.indexOf(node.left.expression.text) !== -1;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/packages/transformer.mjs
var Transformer = class {
  constructor(fs, logger, tsConfig = null) {
    this.fs = fs;
    this.logger = logger;
    this.tsConfig = tsConfig;
  }
  transform(bundle) {
    const ngccReflectionHost = this.getHost(bundle);
    const tsReflectionHost = new TypeScriptReflectionHost(bundle.src.program.getTypeChecker());
    const reflectionHost = new DelegatingReflectionHost(tsReflectionHost, ngccReflectionHost);
    const { decorationAnalyses, switchMarkerAnalyses, privateDeclarationsAnalyses, moduleWithProvidersAnalyses, diagnostics } = this.analyzeProgram(reflectionHost, bundle);
    if (hasErrors(diagnostics)) {
      return { success: false, diagnostics };
    }
    let renderedFiles = [];
    if (bundle.dtsProcessing !== DtsProcessing.Only) {
      const srcFormatter = this.getRenderingFormatter(ngccReflectionHost, bundle);
      const renderer = new Renderer(reflectionHost, srcFormatter, this.fs, this.logger, bundle, this.tsConfig);
      renderedFiles = renderer.renderProgram(decorationAnalyses, switchMarkerAnalyses, privateDeclarationsAnalyses);
    }
    if (bundle.dts) {
      const dtsFormatter = new EsmRenderingFormatter(this.fs, reflectionHost, bundle.isCore);
      const dtsRenderer = new DtsRenderer(dtsFormatter, this.fs, this.logger, reflectionHost, bundle);
      const renderedDtsFiles = dtsRenderer.renderProgram(decorationAnalyses, privateDeclarationsAnalyses, moduleWithProvidersAnalyses);
      renderedFiles = renderedFiles.concat(renderedDtsFiles);
    }
    return { success: true, diagnostics, transformedFiles: renderedFiles };
  }
  getHost(bundle) {
    switch (bundle.format) {
      case "esm2015":
        return new Esm2015ReflectionHost(this.logger, bundle.isCore, bundle.src, bundle.dts);
      case "esm5":
        return new Esm5ReflectionHost(this.logger, bundle.isCore, bundle.src, bundle.dts);
      case "umd":
        return new UmdReflectionHost(this.logger, bundle.isCore, bundle.src, bundle.dts);
      case "commonjs":
        return new CommonJsReflectionHost(this.logger, bundle.isCore, bundle.src, bundle.dts);
      default:
        throw new Error(`Reflection host for "${bundle.format}" not yet implemented.`);
    }
  }
  getRenderingFormatter(host, bundle) {
    switch (bundle.format) {
      case "esm2015":
        return new EsmRenderingFormatter(this.fs, host, bundle.isCore);
      case "esm5":
        return new Esm5RenderingFormatter(this.fs, host, bundle.isCore);
      case "umd":
        if (!(host instanceof UmdReflectionHost)) {
          throw new Error("UmdRenderer requires a UmdReflectionHost");
        }
        return new UmdRenderingFormatter(this.fs, host, bundle.isCore);
      case "commonjs":
        return new CommonJsRenderingFormatter(this.fs, host, bundle.isCore);
      default:
        throw new Error(`Renderer for "${bundle.format}" not yet implemented.`);
    }
  }
  analyzeProgram(reflectionHost, bundle) {
    const referencesRegistry = new NgccReferencesRegistry(reflectionHost);
    const switchMarkerAnalyzer = new SwitchMarkerAnalyzer(reflectionHost, bundle.entryPoint.packagePath);
    const switchMarkerAnalyses = switchMarkerAnalyzer.analyzeProgram(bundle.src.program);
    const diagnostics = [];
    const decorationAnalyzer = new DecorationAnalyzer(this.fs, bundle, reflectionHost, referencesRegistry, (diagnostic) => diagnostics.push(diagnostic), this.tsConfig);
    const decorationAnalyses = decorationAnalyzer.analyzeProgram();
    const moduleWithProvidersAnalyzer = new ModuleWithProvidersAnalyzer(reflectionHost, bundle.src.program.getTypeChecker(), referencesRegistry, bundle.dts !== null);
    const moduleWithProvidersAnalyses = moduleWithProvidersAnalyzer && moduleWithProvidersAnalyzer.analyzeProgram(bundle.src.program);
    const privateDeclarationsAnalyzer = new PrivateDeclarationsAnalyzer(reflectionHost, referencesRegistry);
    const privateDeclarationsAnalyses = privateDeclarationsAnalyzer.analyzeProgram(bundle.src.program);
    return {
      decorationAnalyses,
      switchMarkerAnalyses,
      privateDeclarationsAnalyses,
      moduleWithProvidersAnalyses,
      diagnostics
    };
  }
};
function hasErrors(diagnostics) {
  return diagnostics.some((d) => d.category === ts22.DiagnosticCategory.Error);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/execution/create_compile_function.mjs
function getCreateCompileFn(fileSystem, logger, fileWriter, enableI18nLegacyMessageIdFormat, tsConfig, pathMappings) {
  return (beforeWritingFiles, onTaskCompleted) => {
    const transformer = new Transformer(fileSystem, logger, tsConfig);
    const sharedFileCache = new SharedFileCache(fileSystem);
    const moduleResolutionCache = createModuleResolutionCache(fileSystem);
    return (task) => {
      const { entryPoint, formatProperty, formatPropertiesToMarkAsProcessed, processDts } = task;
      const isCore = entryPoint.name === "@angular/core";
      const packageJson = entryPoint.packageJson;
      const formatPath = packageJson[formatProperty];
      const format = getEntryPointFormat(fileSystem, entryPoint, formatProperty);
      if (!formatPath || !format) {
        onTaskCompleted(task, 1, `property \`${formatProperty}\` pointing to a missing or empty file: ${formatPath}`);
        return;
      }
      logger.info(`Compiling ${entryPoint.name} : ${formatProperty} as ${format}`);
      const bundle = makeEntryPointBundle(fileSystem, entryPoint, sharedFileCache, moduleResolutionCache, formatPath, isCore, format, processDts, pathMappings, true, enableI18nLegacyMessageIdFormat);
      const result = transformer.transform(bundle);
      if (result.success) {
        if (result.diagnostics.length > 0) {
          logger.warn(replaceTsWithNgInErrors(ts23.formatDiagnosticsWithColorAndContext(result.diagnostics, bundle.src.host)));
        }
        const writeBundle = () => {
          fileWriter.writeBundle(bundle, result.transformedFiles, formatPropertiesToMarkAsProcessed);
          logger.debug(`  Successfully compiled ${entryPoint.name} : ${formatProperty}`);
          onTaskCompleted(task, 0, null);
        };
        const beforeWritingResult = beforeWritingFiles(result.transformedFiles);
        return beforeWritingResult instanceof Promise ? beforeWritingResult.then(writeBundle) : writeBundle();
      } else {
        const errors = replaceTsWithNgInErrors(ts23.formatDiagnosticsWithColorAndContext(result.diagnostics, bundle.src.host));
        onTaskCompleted(task, 1, `compilation errors:
${errors}`);
      }
    };
  };
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/ngcc_options.mjs
import {
  cpus
} from "os";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/path_mappings.mjs
function getPathMappingsFromTsConfig(fs, tsConfig, projectPath) {
  if (tsConfig !== null && tsConfig.options.baseUrl !== void 0 && tsConfig.options.paths !== void 0) {
    return {
      baseUrl: fs.resolve(projectPath, tsConfig.options.baseUrl),
      paths: tsConfig.options.paths
    };
  }
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/writing/in_place_file_writer.mjs
var NGCC_BACKUP_EXTENSION = ".__ivy_ngcc_bak";
var InPlaceFileWriter = class {
  constructor(fs, logger, errorOnFailedEntryPoint) {
    this.fs = fs;
    this.logger = logger;
    this.errorOnFailedEntryPoint = errorOnFailedEntryPoint;
  }
  writeBundle(_bundle, transformedFiles, _formatProperties) {
    transformedFiles.forEach((file) => this.writeFileAndBackup(file));
  }
  revertBundle(_entryPoint, transformedFilePaths, _formatProperties) {
    for (const filePath of transformedFilePaths) {
      this.revertFileAndBackup(filePath);
    }
  }
  writeFileAndBackup(file) {
    this.fs.ensureDir(dirname(file.path));
    const backPath = absoluteFrom(`${file.path}${NGCC_BACKUP_EXTENSION}`);
    if (this.fs.exists(backPath)) {
      if (this.errorOnFailedEntryPoint) {
        throw new Error(`Tried to overwrite ${backPath} with an ngcc back up file, which is disallowed.`);
      } else {
        this.logger.error(`Tried to write ${backPath} with an ngcc back up file but it already exists so not writing, nor backing up, ${file.path}.
This error may be caused by one of the following:
* two or more entry-points overlap and ngcc has been asked to process some files more than once.
  In this case, you should check other entry-points in this package
  and set up a config to ignore any that you are not using.
* a previous run of ngcc was killed in the middle of processing, in a way that cannot be recovered.
  In this case, you should try cleaning the node_modules directory and any dist directories that contain local libraries. Then try again.`);
      }
    } else {
      if (this.fs.exists(file.path)) {
        this.fs.moveFile(file.path, backPath);
      }
      this.fs.writeFile(file.path, file.contents);
    }
  }
  revertFileAndBackup(filePath) {
    if (this.fs.exists(filePath)) {
      this.fs.removeFile(filePath);
      const backPath = absoluteFrom(`${filePath}${NGCC_BACKUP_EXTENSION}`);
      if (this.fs.exists(backPath)) {
        this.fs.moveFile(backPath, filePath);
      }
    }
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/writing/new_entry_point_file_writer.mjs
var NGCC_DIRECTORY = "__ivy_ngcc__";
var NGCC_PROPERTY_EXTENSION = "_ivy_ngcc";
var NewEntryPointFileWriter = class extends InPlaceFileWriter {
  constructor(fs, logger, errorOnFailedEntryPoint, pkgJsonUpdater) {
    super(fs, logger, errorOnFailedEntryPoint);
    this.pkgJsonUpdater = pkgJsonUpdater;
  }
  writeBundle(bundle, transformedFiles, formatProperties) {
    const entryPoint = bundle.entryPoint;
    const ngccFolder = this.fs.join(entryPoint.packagePath, NGCC_DIRECTORY);
    this.copyBundle(bundle, entryPoint.packagePath, ngccFolder, transformedFiles);
    transformedFiles.forEach((file) => this.writeFile(file, entryPoint.packagePath, ngccFolder));
    this.updatePackageJson(entryPoint, formatProperties, ngccFolder);
  }
  revertBundle(entryPoint, transformedFilePaths, formatProperties) {
    for (const filePath of transformedFilePaths) {
      this.revertFile(filePath, entryPoint.packagePath);
    }
    this.revertPackageJson(entryPoint, formatProperties);
  }
  copyBundle(bundle, packagePath, ngccFolder, transformedFiles) {
    const doNotCopy = new Set(transformedFiles.map((f) => f.path));
    bundle.src.program.getSourceFiles().forEach((sourceFile) => {
      const originalPath = absoluteFromSourceFile(sourceFile);
      if (doNotCopy.has(originalPath)) {
        return;
      }
      const relativePath = this.fs.relative(packagePath, originalPath);
      const isInsidePackage = isLocalRelativePath(relativePath);
      if (!sourceFile.isDeclarationFile && isInsidePackage) {
        const newPath = this.fs.resolve(ngccFolder, relativePath);
        this.fs.ensureDir(this.fs.dirname(newPath));
        this.fs.copyFile(originalPath, newPath);
        this.copyAndUpdateSourceMap(originalPath, newPath);
      }
    });
  }
  copyAndUpdateSourceMap(originalSrcPath, newSrcPath) {
    var _a;
    const sourceMapPath = originalSrcPath + ".map";
    if (this.fs.exists(sourceMapPath)) {
      try {
        const sourceMap = JSON.parse(this.fs.readFile(sourceMapPath));
        const newSourceMapPath = newSrcPath + ".map";
        const relativePath = this.fs.relative(this.fs.dirname(newSourceMapPath), this.fs.dirname(sourceMapPath));
        sourceMap.sourceRoot = this.fs.join(relativePath, sourceMap.sourceRoot || ".");
        this.fs.ensureDir(this.fs.dirname(newSourceMapPath));
        this.fs.writeFile(newSourceMapPath, JSON.stringify(sourceMap));
      } catch (e) {
        this.logger.warn(`Failed to process source-map at ${sourceMapPath}`);
        this.logger.warn((_a = e.message) != null ? _a : e);
      }
    }
  }
  writeFile(file, packagePath, ngccFolder) {
    if (isDtsPath(file.path.replace(/\.map$/, ""))) {
      super.writeFileAndBackup(file);
    } else {
      const relativePath = this.fs.relative(packagePath, file.path);
      const newFilePath = this.fs.resolve(ngccFolder, relativePath);
      this.fs.ensureDir(this.fs.dirname(newFilePath));
      this.fs.writeFile(newFilePath, file.contents);
    }
  }
  revertFile(filePath, packagePath) {
    if (isDtsPath(filePath.replace(/\.map$/, ""))) {
      super.revertFileAndBackup(filePath);
    } else if (this.fs.exists(filePath)) {
      const relativePath = this.fs.relative(packagePath, filePath);
      const newFilePath = this.fs.resolve(packagePath, NGCC_DIRECTORY, relativePath);
      this.fs.removeFile(newFilePath);
    }
  }
  updatePackageJson(entryPoint, formatProperties, ngccFolder) {
    if (formatProperties.length === 0) {
      return;
    }
    const packageJson = entryPoint.packageJson;
    const packageJsonPath = this.fs.join(entryPoint.path, "package.json");
    const oldFormatProp = formatProperties[0];
    const oldFormatPath = packageJson[oldFormatProp];
    const oldAbsFormatPath = this.fs.resolve(entryPoint.path, oldFormatPath);
    const newAbsFormatPath = this.fs.resolve(ngccFolder, this.fs.relative(entryPoint.packagePath, oldAbsFormatPath));
    const newFormatPath = this.fs.relative(entryPoint.path, newAbsFormatPath);
    const update = this.pkgJsonUpdater.createUpdate();
    for (const formatProperty of formatProperties) {
      if (packageJson[formatProperty] !== oldFormatPath) {
        throw new Error(`Unable to update '${packageJsonPath}': Format properties (${formatProperties.join(", ")}) map to more than one format-path.`);
      }
      update.addChange([`${formatProperty}${NGCC_PROPERTY_EXTENSION}`], newFormatPath, { before: formatProperty });
    }
    update.writeChanges(packageJsonPath, packageJson);
  }
  revertPackageJson(entryPoint, formatProperties) {
    if (formatProperties.length === 0) {
      return;
    }
    const packageJson = entryPoint.packageJson;
    const packageJsonPath = this.fs.join(entryPoint.path, "package.json");
    const update = this.pkgJsonUpdater.createUpdate();
    for (const formatProperty of formatProperties) {
      update.addChange([`${formatProperty}${NGCC_PROPERTY_EXTENSION}`], void 0);
    }
    update.writeChanges(packageJsonPath, packageJson);
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/ngcc_options.mjs
function getSharedSetup(options) {
  const fileSystem = getFileSystem();
  const absBasePath = absoluteFrom(options.basePath);
  const projectPath = fileSystem.dirname(absBasePath);
  const tsConfig = options.tsConfigPath !== null ? getTsConfig(options.tsConfigPath || projectPath) : null;
  let { basePath, targetEntryPointPath, propertiesToConsider = SUPPORTED_FORMAT_PROPERTIES, typingsOnly = false, compileAllFormats = true, createNewEntryPointFormats = false, logger = new ConsoleLogger(LogLevel.info), pathMappings = getPathMappingsFromTsConfig(fileSystem, tsConfig, projectPath), async = false, errorOnFailedEntryPoint = false, enableI18nLegacyMessageIdFormat = true, invalidateEntryPointManifest = false, tsConfigPath } = options;
  if (!!targetEntryPointPath) {
    errorOnFailedEntryPoint = true;
  }
  if (typingsOnly) {
    compileAllFormats = false;
  }
  checkForSolutionStyleTsConfig(fileSystem, logger, projectPath, options.tsConfigPath, tsConfig);
  return {
    basePath,
    targetEntryPointPath,
    propertiesToConsider,
    typingsOnly,
    compileAllFormats,
    createNewEntryPointFormats,
    logger,
    pathMappings,
    async,
    errorOnFailedEntryPoint,
    enableI18nLegacyMessageIdFormat,
    invalidateEntryPointManifest,
    tsConfigPath,
    fileSystem,
    absBasePath,
    projectPath,
    tsConfig,
    getFileWriter: (pkgJsonUpdater) => createNewEntryPointFormats ? new NewEntryPointFileWriter(fileSystem, logger, errorOnFailedEntryPoint, pkgJsonUpdater) : new InPlaceFileWriter(fileSystem, logger, errorOnFailedEntryPoint)
  };
}
var tsConfigCache = null;
var tsConfigPathCache = null;
function getTsConfig(tsConfigPath) {
  if (tsConfigPath !== tsConfigPathCache) {
    tsConfigPathCache = tsConfigPath;
    tsConfigCache = readConfiguration(tsConfigPath);
  }
  return tsConfigCache;
}
function clearTsConfigCache() {
  tsConfigPathCache = null;
  tsConfigCache = null;
}
function checkForSolutionStyleTsConfig(fileSystem, logger, projectPath, tsConfigPath, tsConfig) {
  if (tsConfigPath !== null && !tsConfigPath && tsConfig !== null && tsConfig.rootNames.length === 0 && tsConfig.projectReferences !== void 0 && tsConfig.projectReferences.length > 0) {
    logger.warn(`The inferred tsconfig file "${tsConfig.project}" appears to be "solution-style" since it contains no root files but does contain project references.
This is probably not wanted, since ngcc is unable to infer settings like "paths" mappings from such a file.
Perhaps you should have explicitly specified one of the referenced projects using the --tsconfig option. For example:

` + tsConfig.projectReferences.map((ref) => `  ngcc ... --tsconfig "${ref.originalPath}"
`).join("") + `
Find out more about solution-style tsconfig at https://devblogs.microsoft.com/typescript/announcing-typescript-3-9/#solution-style-tsconfig.
If you did intend to use this file, then you can hide this warning by providing it explicitly:

  ngcc ... --tsconfig "${fileSystem.relative(projectPath, tsConfig.project)}"`);
  }
}
function getMaxNumberOfWorkers() {
  const maxWorkers = process.env.NGCC_MAX_WORKERS;
  if (maxWorkers === void 0) {
    return Math.max(1, Math.min(4, cpus().length - 1));
  }
  const numericMaxWorkers = +maxWorkers.trim();
  if (!Number.isInteger(numericMaxWorkers)) {
    throw new Error("NGCC_MAX_WORKERS should be an integer.");
  } else if (numericMaxWorkers < 1) {
    throw new Error("NGCC_MAX_WORKERS should be at least 1.");
  }
  return numericMaxWorkers;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/execution/tasks/utils.mjs
var stringifyTask = (task) => `{entryPoint: ${task.entryPoint.name}, formatProperty: ${task.formatProperty}, processDts: ${DtsProcessing[task.processDts]}}`;
function computeTaskDependencies(tasks, graph) {
  const dependencies = new TaskDependencies();
  const candidateDependencies = new Map();
  tasks.forEach((task) => {
    const entryPointPath = task.entryPoint.path;
    const deps = graph.dependenciesOf(entryPointPath);
    const taskDependencies = deps.filter((dep) => candidateDependencies.has(dep)).map((dep) => candidateDependencies.get(dep));
    if (taskDependencies.length > 0) {
      for (const dependency of taskDependencies) {
        const taskDependents = getDependentsSet(dependencies, dependency);
        taskDependents.add(task);
      }
    }
    if (task.processDts !== DtsProcessing.No) {
      if (candidateDependencies.has(entryPointPath)) {
        const otherTask = candidateDependencies.get(entryPointPath);
        throw new Error(`Invariant violated: Multiple tasks are assigned generating typings for '${entryPointPath}':
  - ${stringifyTask(otherTask)}
  - ${stringifyTask(task)}`);
      }
      candidateDependencies.set(entryPointPath, task);
    } else {
      if (candidateDependencies.has(entryPointPath)) {
        const typingsTask = candidateDependencies.get(entryPointPath);
        const typingsTaskDependents = getDependentsSet(dependencies, typingsTask);
        typingsTaskDependents.add(task);
      }
    }
  });
  return dependencies;
}
function getDependentsSet(map, task) {
  if (!map.has(task)) {
    map.set(task, new Set());
  }
  return map.get(task);
}
function getBlockedTasks(dependencies) {
  const blockedTasks = new Map();
  for (const [dependency, dependents] of dependencies) {
    for (const dependent of dependents) {
      const dependentSet = getDependentsSet(blockedTasks, dependent);
      dependentSet.add(dependency);
    }
  }
  return blockedTasks;
}
function sortTasksByPriority(tasks, dependencies) {
  const priorityPerTask = new Map();
  const computePriority = (task, idx) => [dependencies.has(task) ? dependencies.get(task).size : 0, idx];
  tasks.forEach((task, i) => priorityPerTask.set(task, computePriority(task, i)));
  return tasks.slice().sort((task1, task2) => {
    const [p1, idx1] = priorityPerTask.get(task1);
    const [p2, idx2] = priorityPerTask.get(task2);
    return p2 - p1 || idx1 - idx2;
  });
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/execution/cluster/utils.mjs
import cluster from "cluster";
var Deferred = class {
  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
};
var sendMessageToMaster = (msg) => {
  if (cluster.isMaster) {
    throw new Error("Unable to send message to the master process: Already on the master process.");
  }
  return new Promise((resolve, reject) => {
    if (process.send === void 0) {
      throw new Error("Unable to send message to the master process: Missing `process.send()`.");
    }
    process.send(msg, (err) => err === null ? resolve() : reject(err));
  });
};
var sendMessageToWorker = (workerId, msg) => {
  if (!cluster.isMaster) {
    throw new Error("Unable to send message to worker process: Sender is not the master process.");
  }
  const worker = cluster.workers[workerId];
  if (worker === void 0 || worker.isDead() || !worker.isConnected()) {
    throw new Error("Unable to send message to worker process: Recipient does not exist or has disconnected.");
  }
  return new Promise((resolve, reject) => {
    worker.send(msg, (err) => err === null ? resolve() : reject(err));
  });
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/writing/package_json_updater.mjs
var PackageJsonUpdate = class {
  constructor(writeChangesImpl) {
    this.writeChangesImpl = writeChangesImpl;
    this.changes = [];
    this.applied = false;
  }
  addChange(propertyPath, value, positioning = "unimportant") {
    this.ensureNotApplied();
    this.changes.push([propertyPath, value, positioning]);
    return this;
  }
  writeChanges(packageJsonPath, parsedJson) {
    this.ensureNotApplied();
    this.writeChangesImpl(this.changes, packageJsonPath, parsedJson);
    this.applied = true;
  }
  ensureNotApplied() {
    if (this.applied) {
      throw new Error("Trying to apply a `PackageJsonUpdate` that has already been applied.");
    }
  }
};
var DirectPackageJsonUpdater = class {
  constructor(fs) {
    this.fs = fs;
  }
  createUpdate() {
    return new PackageJsonUpdate((...args) => this.writeChanges(...args));
  }
  writeChanges(changes, packageJsonPath, preExistingParsedJson) {
    if (changes.length === 0) {
      throw new Error(`No changes to write to '${packageJsonPath}'.`);
    }
    const parsedJson = this.fs.exists(packageJsonPath) ? JSON.parse(this.fs.readFile(packageJsonPath)) : {};
    for (const [propPath, value, positioning] of changes) {
      if (propPath.length === 0) {
        throw new Error(`Missing property path for writing value to '${packageJsonPath}'.`);
      }
      applyChange(parsedJson, propPath, value, positioning);
      if (preExistingParsedJson) {
        applyChange(preExistingParsedJson, propPath, value, "unimportant");
      }
    }
    this.fs.ensureDir(dirname(packageJsonPath));
    this.fs.writeFile(packageJsonPath, `${JSON.stringify(parsedJson, null, 2)}
`);
  }
};
function applyChange(ctx, propPath, value, positioning) {
  const lastPropIdx = propPath.length - 1;
  const lastProp = propPath[lastPropIdx];
  for (let i = 0; i < lastPropIdx; i++) {
    const key = propPath[i];
    const newCtx = ctx.hasOwnProperty(key) ? ctx[key] : ctx[key] = {};
    if (typeof newCtx !== "object" || newCtx === null || Array.isArray(newCtx)) {
      throw new Error(`Property path '${propPath.join(".")}' does not point to an object.`);
    }
    ctx = newCtx;
  }
  ctx[lastProp] = value;
  positionProperty(ctx, lastProp, positioning);
}
function movePropBefore(ctx, prop, isNextProp) {
  const allProps = Object.keys(ctx);
  const otherProps = allProps.filter((p) => p !== prop);
  const nextPropIdx = otherProps.findIndex(isNextProp);
  const propsToShift = nextPropIdx === -1 ? [] : otherProps.slice(nextPropIdx);
  movePropToEnd(ctx, prop);
  propsToShift.forEach((p) => movePropToEnd(ctx, p));
}
function movePropToEnd(ctx, prop) {
  const value = ctx[prop];
  delete ctx[prop];
  ctx[prop] = value;
}
function positionProperty(ctx, prop, positioning) {
  switch (positioning) {
    case "alphabetic":
      movePropBefore(ctx, prop, (p) => p > prop);
      break;
    case "unimportant":
      break;
    default:
      if (typeof positioning !== "object" || positioning.before === void 0) {
        throw new Error(`Unknown positioning (${JSON.stringify(positioning)}) for property '${prop}'.`);
      }
      movePropBefore(ctx, prop, (p) => p === positioning.before);
      break;
  }
}

export {
  isWildcardReexportStatement,
  isRequireCall,
  isRelativePath,
  resolveFileWithPostfixes,
  parseStatementForUmdModule,
  getImportsOfUmdModule,
  SUPPORTED_FORMAT_PROPERTIES,
  NO_ENTRY_POINT,
  IGNORED_ENTRY_POINT,
  INCOMPATIBLE_ENTRY_POINT,
  getEntryPointInfo,
  isEntryPoint,
  getEntryPointFormat,
  NGCC_BACKUP_EXTENSION,
  NGCC_DIRECTORY,
  NGCC_PROPERTY_EXTENSION,
  getPathMappingsFromTsConfig,
  DtsProcessing,
  stringifyTask,
  computeTaskDependencies,
  getBlockedTasks,
  sortTasksByPriority,
  Deferred,
  sendMessageToMaster,
  sendMessageToWorker,
  NGCC_TIMED_OUT_EXIT_CODE,
  getCreateCompileFn,
  getSharedSetup,
  clearTsConfigCache,
  getMaxNumberOfWorkers,
  PackageJsonUpdate,
  DirectPackageJsonUpdater,
  applyChange
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
//# sourceMappingURL=chunk-ALIYIPPJ.js.map
