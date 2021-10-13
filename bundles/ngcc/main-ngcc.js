#!/usr/bin/env node

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
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw new Error('Dynamic require of "' + x + '" is not supported');
});

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/dependencies/commonjs_dependency_host.mjs
import ts9 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/host/commonjs_umd_utils.mjs
import ts3 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/util/src/typescript.mjs
import ts2 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/file_system/src/compiler_host.mjs
import {
  EOL
} from "os";
import ts from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/file_system/src/invalid_file_system.mjs
var InvalidFileSystem = class {
  exists(path7) {
    throw makeError();
  }
  readFile(path7) {
    throw makeError();
  }
  readFileBuffer(path7) {
    throw makeError();
  }
  writeFile(path7, data, exclusive) {
    throw makeError();
  }
  removeFile(path7) {
    throw makeError();
  }
  symlink(target, path7) {
    throw makeError();
  }
  readdir(path7) {
    throw makeError();
  }
  lstat(path7) {
    throw makeError();
  }
  stat(path7) {
    throw makeError();
  }
  pwd() {
    throw makeError();
  }
  chdir(path7) {
    throw makeError();
  }
  extname(path7) {
    throw makeError();
  }
  copyFile(from, to) {
    throw makeError();
  }
  moveFile(from, to) {
    throw makeError();
  }
  ensureDir(path7) {
    throw makeError();
  }
  removeDeep(path7) {
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
  isRoot(path7) {
    throw makeError();
  }
  isRooted(path7) {
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
  normalize(path7) {
    throw makeError();
  }
};
function makeError() {
  return new Error("FileSystem has not been configured. Please call `setFileSystem()` before calling this method.");
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/file_system/src/util.mjs
var TS_DTS_JS_EXTENSION = /(?:\.d)?\.ts$|\.js$/;
function stripExtension(path7) {
  return path7.replace(TS_DTS_JS_EXTENSION, "");
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/file_system/src/helpers.mjs
var fs = new InvalidFileSystem();
function getFileSystem() {
  return fs;
}
function setFileSystem(fileSystem) {
  fs = fileSystem;
}
function absoluteFrom(path7) {
  if (!fs.isRooted(path7)) {
    throw new Error(`Internal Error: absoluteFrom(${path7}): path is not absolute`);
  }
  return fs.resolve(path7);
}
var ABSOLUTE_PATH = Symbol("AbsolutePath");
function absoluteFromSourceFile(sf) {
  const sfWithPatch = sf;
  if (sfWithPatch[ABSOLUTE_PATH] === void 0) {
    sfWithPatch[ABSOLUTE_PATH] = fs.resolve(sfWithPatch.fileName);
  }
  return sfWithPatch[ABSOLUTE_PATH];
}
function dirname(file) {
  return fs.dirname(file);
}
function resolve(basePath, ...paths) {
  return fs.resolve(basePath, ...paths);
}
function isRooted(path7) {
  return fs.isRooted(path7);
}
function relative(from, to) {
  return fs.relative(from, to);
}
function isLocalRelativePath(relativePath) {
  return !isRooted(relativePath) && !relativePath.startsWith("..");
}
function toRelativeImport(relativePath) {
  return isLocalRelativePath(relativePath) ? `./${relativePath}` : relativePath;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/file_system/src/compiler_host.mjs
var NgtscCompilerHost = class {
  constructor(fs5, options2 = {}) {
    this.fs = fs5;
    this.options = options2;
  }
  getSourceFile(fileName, languageVersion) {
    const text = this.readFile(fileName);
    return text !== void 0 ? ts.createSourceFile(fileName, text, languageVersion, true) : void 0;
  }
  getDefaultLibFileName(options2) {
    return this.fs.join(this.getDefaultLibLocation(), ts.getDefaultLibFileName(options2));
  }
  getDefaultLibLocation() {
    return this.fs.getDefaultLibLocation();
  }
  writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles) {
    const path7 = absoluteFrom(fileName);
    this.fs.ensureDir(this.fs.dirname(path7));
    this.fs.writeFile(path7, data);
  }
  getCurrentDirectory() {
    return this.fs.pwd();
  }
  getCanonicalFileName(fileName) {
    return this.useCaseSensitiveFileNames() ? fileName : fileName.toLowerCase();
  }
  useCaseSensitiveFileNames() {
    return this.fs.isCaseSensitive();
  }
  getNewLine() {
    switch (this.options.newLine) {
      case ts.NewLineKind.CarriageReturnLineFeed:
        return "\r\n";
      case ts.NewLineKind.LineFeed:
        return "\n";
      default:
        return EOL;
    }
  }
  fileExists(fileName) {
    const absPath = this.fs.resolve(fileName);
    return this.fs.exists(absPath) && this.fs.stat(absPath).isFile();
  }
  readFile(fileName) {
    const absPath = this.fs.resolve(fileName);
    if (!this.fileExists(absPath)) {
      return void 0;
    }
    return this.fs.readFile(absPath);
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/file_system/src/logical.mjs
var LogicalProjectPath = {
  relativePathBetween: function(from, to) {
    const relativePath = relative(dirname(resolve(from)), resolve(to));
    return toRelativeImport(relativePath);
  }
};
var LogicalFileSystem = class {
  constructor(rootDirs, compilerHost) {
    this.compilerHost = compilerHost;
    this.cache = new Map();
    this.rootDirs = rootDirs.concat([]).sort((a, b) => b.length - a.length);
    this.canonicalRootDirs = this.rootDirs.map((dir) => this.compilerHost.getCanonicalFileName(dir));
  }
  logicalPathOfSf(sf) {
    return this.logicalPathOfFile(absoluteFrom(sf.fileName));
  }
  logicalPathOfFile(physicalFile) {
    const canonicalFilePath = this.compilerHost.getCanonicalFileName(physicalFile);
    if (!this.cache.has(canonicalFilePath)) {
      let logicalFile = null;
      for (let i = 0; i < this.rootDirs.length; i++) {
        const rootDir = this.rootDirs[i];
        const canonicalRootDir = this.canonicalRootDirs[i];
        if (isWithinBasePath(canonicalRootDir, canonicalFilePath)) {
          logicalFile = this.createLogicalProjectPath(physicalFile, rootDir);
          if (logicalFile.indexOf("/node_modules/") !== -1) {
            logicalFile = null;
          } else {
            break;
          }
        }
      }
      this.cache.set(canonicalFilePath, logicalFile);
    }
    return this.cache.get(canonicalFilePath);
  }
  createLogicalProjectPath(file, rootDir) {
    const logicalPath = stripExtension(file.substr(rootDir.length));
    return logicalPath.startsWith("/") ? logicalPath : "/" + logicalPath;
  }
};
function isWithinBasePath(base, path7) {
  return isLocalRelativePath(relative(base, path7));
}

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
var NodeJSPathManipulation = class {
  pwd() {
    return this.normalize(process.cwd());
  }
  chdir(dir) {
    process.chdir(dir);
  }
  resolve(...paths) {
    return this.normalize(resolve2(...paths));
  }
  dirname(file) {
    return this.normalize(dirname2(file));
  }
  join(basePath, ...paths) {
    return this.normalize(join(basePath, ...paths));
  }
  isRoot(path7) {
    return this.dirname(path7) === this.normalize(path7);
  }
  isRooted(path7) {
    return isAbsolute(path7);
  }
  relative(from, to) {
    return this.normalize(relative2(from, to));
  }
  basename(filePath, extension) {
    return basename(filePath, extension);
  }
  extname(path7) {
    return extname(path7);
  }
  normalize(path7) {
    return path7.replace(/\\/g, "/");
  }
};
var isCommonJS = typeof __filename !== "undefined";
var currentFileUrl = isCommonJS ? null : __ESM_IMPORT_META_URL__;
var currentFileName = isCommonJS ? __filename : fileURLToPath(currentFileUrl);
var NodeJSReadonlyFileSystem = class extends NodeJSPathManipulation {
  constructor() {
    super(...arguments);
    this._caseSensitive = void 0;
  }
  isCaseSensitive() {
    if (this._caseSensitive === void 0) {
      this._caseSensitive = !existsSync(this.normalize(toggleCase(currentFileName)));
    }
    return this._caseSensitive;
  }
  exists(path7) {
    return existsSync(path7);
  }
  readFile(path7) {
    return readFileSync(path7, "utf8");
  }
  readFileBuffer(path7) {
    return readFileSync(path7);
  }
  readdir(path7) {
    return readdirSync(path7);
  }
  lstat(path7) {
    return lstatSync(path7);
  }
  stat(path7) {
    return statSync(path7);
  }
  realpath(path7) {
    return this.resolve(realpathSync(path7));
  }
  getDefaultLibLocation() {
    const requireFn = isCommonJS ? __require : module.createRequire(currentFileUrl);
    return this.resolve(requireFn.resolve("typescript"), "..");
  }
};
var NodeJSFileSystem = class extends NodeJSReadonlyFileSystem {
  writeFile(path7, data, exclusive = false) {
    writeFileSync(path7, data, exclusive ? { flag: "wx" } : void 0);
  }
  removeFile(path7) {
    unlinkSync(path7);
  }
  symlink(target, path7) {
    symlinkSync(target, path7);
  }
  copyFile(from, to) {
    copyFileSync(from, to);
  }
  moveFile(from, to) {
    renameSync(from, to);
  }
  ensureDir(path7) {
    const parents = [];
    while (!this.isRoot(path7) && !this.exists(path7)) {
      parents.push(path7);
      path7 = this.dirname(path7);
    }
    while (parents.length) {
      this.safeMkdir(parents.pop());
    }
  }
  removeDeep(path7) {
    rmdirSync(path7, { recursive: true });
  }
  safeMkdir(path7) {
    try {
      mkdirSync(path7);
    } catch (err) {
      if (!this.exists(path7) || !this.stat(path7).isDirectory()) {
        throw err;
      }
    }
  }
};
function toggleCase(str) {
  return str.replace(/\w/g, (ch) => ch.toUpperCase() === ch ? ch.toLowerCase() : ch.toUpperCase());
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/util/src/typescript.mjs
var D_TS = /\.d\.ts$/i;
function isSymbolWithValueDeclaration(symbol) {
  return symbol != null && symbol.valueDeclaration !== void 0 && symbol.declarations !== void 0;
}
function isDtsPath(filePath) {
  return D_TS.test(filePath);
}
function isFromDtsFile(node) {
  let sf = node.getSourceFile();
  if (sf === void 0) {
    sf = ts2.getOriginalNode(node).getSourceFile();
  }
  return sf !== void 0 && sf.isDeclarationFile;
}
function nodeNameForError(node) {
  if (node.name !== void 0 && ts2.isIdentifier(node.name)) {
    return node.name.text;
  } else {
    const kind = ts2.SyntaxKind[node.kind];
    const { line, character } = ts2.getLineAndCharacterOfPosition(node.getSourceFile(), node.getStart());
    return `${kind}@${line}:${character}`;
  }
}
function getSourceFile(node) {
  const directSf = node.getSourceFile();
  return directSf !== void 0 ? directSf : ts2.getOriginalNode(node).getSourceFile();
}
function getSourceFileOrNull(program, fileName) {
  return program.getSourceFile(fileName) || null;
}
function identifierOfNode(decl) {
  if (decl.name !== void 0 && ts2.isIdentifier(decl.name)) {
    return decl.name;
  } else {
    return null;
  }
}
function isDeclaration(node) {
  return isValueDeclaration(node) || isTypeDeclaration(node);
}
function isValueDeclaration(node) {
  return ts2.isClassDeclaration(node) || ts2.isFunctionDeclaration(node) || ts2.isVariableDeclaration(node);
}
function isTypeDeclaration(node) {
  return ts2.isEnumDeclaration(node) || ts2.isTypeAliasDeclaration(node) || ts2.isInterfaceDeclaration(node);
}
function isNamedDeclaration(node) {
  const namedNode = node;
  return namedNode.name !== void 0 && ts2.isIdentifier(namedNode.name);
}
function nodeDebugInfo(node) {
  const sf = getSourceFile(node);
  const { line, character } = ts2.getLineAndCharacterOfPosition(sf, node.pos);
  return `[${sf.fileName}: ${ts2.SyntaxKind[node.kind]} @ ${line}:${character}]`;
}
function resolveModuleName(moduleName, containingFile, compilerOptions, compilerHost, moduleResolutionCache) {
  if (compilerHost.resolveModuleNames) {
    return compilerHost.resolveModuleNames([moduleName], containingFile, void 0, void 0, compilerOptions)[0];
  } else {
    return ts2.resolveModuleName(moduleName, containingFile, compilerOptions, compilerHost, moduleResolutionCache !== null ? moduleResolutionCache : void 0).resolvedModule;
  }
}
function isAssignment(node) {
  return ts2.isBinaryExpression(node) && node.operatorToken.kind === ts2.SyntaxKind.EqualsToken;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/host/commonjs_umd_utils.mjs
function findNamespaceOfIdentifier(id) {
  return id.parent && ts3.isPropertyAccessExpression(id.parent) && id.parent.name === id && ts3.isIdentifier(id.parent.expression) ? id.parent.expression : null;
}
function findRequireCallReference(id, checker) {
  var _a, _b;
  const symbol = checker.getSymbolAtLocation(id) || null;
  const declaration = (_b = symbol == null ? void 0 : symbol.valueDeclaration) != null ? _b : (_a = symbol == null ? void 0 : symbol.declarations) == null ? void 0 : _a[0];
  const initializer = declaration && ts3.isVariableDeclaration(declaration) && declaration.initializer || null;
  return initializer && isRequireCall(initializer) ? initializer : null;
}
function isWildcardReexportStatement(stmt) {
  if (!ts3.isExpressionStatement(stmt) || !ts3.isCallExpression(stmt.expression)) {
    return false;
  }
  let fnName = null;
  if (ts3.isIdentifier(stmt.expression.expression)) {
    fnName = stmt.expression.expression.text;
  } else if (ts3.isPropertyAccessExpression(stmt.expression.expression) && ts3.isIdentifier(stmt.expression.expression.name)) {
    fnName = stmt.expression.expression.name.text;
  }
  if (fnName !== "__export" && fnName !== "__exportStar") {
    return false;
  }
  return stmt.expression.arguments.length > 0;
}
function isDefinePropertyReexportStatement(stmt) {
  if (!ts3.isExpressionStatement(stmt) || !ts3.isCallExpression(stmt.expression)) {
    return false;
  }
  if (!ts3.isPropertyAccessExpression(stmt.expression.expression) || !ts3.isIdentifier(stmt.expression.expression.expression) || stmt.expression.expression.expression.text !== "Object" || !ts3.isIdentifier(stmt.expression.expression.name) || stmt.expression.expression.name.text !== "defineProperty") {
    return false;
  }
  const args = stmt.expression.arguments;
  if (args.length !== 3) {
    return false;
  }
  const exportsObject = args[0];
  if (!ts3.isIdentifier(exportsObject) || exportsObject.text !== "exports") {
    return false;
  }
  const propertyKey = args[1];
  if (!ts3.isStringLiteral(propertyKey)) {
    return false;
  }
  const propertyDescriptor = args[2];
  if (!ts3.isObjectLiteralExpression(propertyDescriptor)) {
    return false;
  }
  return propertyDescriptor.properties.some((prop) => prop.name !== void 0 && ts3.isIdentifier(prop.name) && prop.name.text === "get");
}
function extractGetterFnExpression(statement) {
  const args = statement.expression.arguments;
  const getterFn = args[2].properties.find((prop) => prop.name !== void 0 && ts3.isIdentifier(prop.name) && prop.name.text === "get");
  if (getterFn === void 0 || !ts3.isPropertyAssignment(getterFn) || !ts3.isFunctionExpression(getterFn.initializer)) {
    return null;
  }
  const returnStatement = getterFn.initializer.body.statements[0];
  if (!ts3.isReturnStatement(returnStatement) || returnStatement.expression === void 0) {
    return null;
  }
  return returnStatement.expression;
}
function isRequireCall(node) {
  return ts3.isCallExpression(node) && ts3.isIdentifier(node.expression) && node.expression.text === "require" && node.arguments.length === 1 && ts3.isStringLiteral(node.arguments[0]);
}
function isExternalImport(path7) {
  return !/^\.\.?(\/|$)/.test(path7);
}
function isExportsDeclaration(expr) {
  return expr.parent && isExportsAssignment(expr.parent);
}
function isExportsAssignment(expr) {
  return isAssignment(expr) && ts3.isPropertyAccessExpression(expr.left) && ts3.isIdentifier(expr.left.expression) && expr.left.expression.text === "exports" && ts3.isIdentifier(expr.left.name);
}
function isExportsStatement(stmt) {
  return ts3.isExpressionStatement(stmt) && isExportsAssignment(stmt.expression);
}
function skipAliases(node) {
  while (isAssignment(node)) {
    node = node.right;
  }
  return node;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/utils.mjs
import ts8 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/reflection/src/host.mjs
import ts4 from "typescript";
var Decorator = {
  nodeForError: (decorator) => {
    if (decorator.node !== null) {
      return decorator.node;
    } else {
      return decorator.synthesizedFor;
    }
  }
};
function isDecoratorIdentifier(exp) {
  return ts4.isIdentifier(exp) || ts4.isPropertyAccessExpression(exp) && ts4.isIdentifier(exp.expression) && ts4.isIdentifier(exp.name);
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
import ts5 from "typescript";
function typeToValue(typeNode, checker) {
  if (typeNode === null) {
    return missingType();
  }
  if (!ts5.isTypeReferenceNode(typeNode)) {
    return unsupportedType(typeNode);
  }
  const symbols = resolveTypeSymbols(typeNode, checker);
  if (symbols === null) {
    return unknownReference(typeNode);
  }
  const { local, decl } = symbols;
  if (decl.valueDeclaration === void 0 || decl.flags & ts5.SymbolFlags.ConstEnum) {
    let typeOnlyDecl = null;
    if (decl.declarations !== void 0 && decl.declarations.length > 0) {
      typeOnlyDecl = decl.declarations[0];
    }
    return noValueDeclaration(typeNode, typeOnlyDecl);
  }
  const firstDecl = local.declarations && local.declarations[0];
  if (firstDecl !== void 0) {
    if (ts5.isImportClause(firstDecl) && firstDecl.name !== void 0) {
      if (firstDecl.isTypeOnly) {
        return typeOnlyImport(typeNode, firstDecl);
      }
      return {
        kind: 0,
        expression: firstDecl.name,
        defaultImportStatement: firstDecl.parent
      };
    } else if (ts5.isImportSpecifier(firstDecl)) {
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
    } else if (ts5.isNamespaceImport(firstDecl)) {
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
  if (ts5.isTypeReferenceNode(node)) {
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
  while (ts5.isQualifiedName(leftMost)) {
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
  if (typeRefSymbol.flags & ts5.SymbolFlags.Alias) {
    decl = checker.getAliasedSymbol(typeRefSymbol);
  }
  return { local, decl, symbolNames };
}
function entityNameToValue(node) {
  if (ts5.isQualifiedName(node)) {
    const left = entityNameToValue(node.left);
    return left !== null ? ts5.createPropertyAccess(left, node.right) : null;
  } else if (ts5.isIdentifier(node)) {
    return ts5.getMutableClone(node);
  } else {
    return null;
  }
}
function extractModuleName(node) {
  if (!ts5.isStringLiteral(node.moduleSpecifier)) {
    throw new Error("not a module specifier");
  }
  return node.moduleSpecifier.text;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/reflection/src/typescript.mjs
import ts7 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/reflection/src/util.mjs
import ts6 from "typescript";
function isNamedClassDeclaration(node) {
  return ts6.isClassDeclaration(node) && isIdentifier(node.name);
}
function isNamedFunctionDeclaration(node) {
  return ts6.isFunctionDeclaration(node) && isIdentifier(node.name);
}
function isNamedVariableDeclaration(node) {
  return ts6.isVariableDeclaration(node) && isIdentifier(node.name);
}
function isIdentifier(node) {
  return node !== void 0 && ts6.isIdentifier(node);
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
    const ctor = tsClazz.members.find((member) => ts7.isConstructorDeclaration(member) && (isDeclaration2 || member.body !== void 0));
    if (ctor === void 0) {
      return null;
    }
    return ctor.parameters.map((node) => {
      const name = parameterName(node.name);
      const decorators = this.getDecoratorsOfDeclaration(node);
      let originalTypeNode = node.type || null;
      let typeNode = originalTypeNode;
      if (typeNode && ts7.isUnionTypeNode(typeNode)) {
        let childTypeNodes = typeNode.types.filter((childTypeNode) => !(ts7.isLiteralTypeNode(childTypeNode) && childTypeNode.literal.kind === ts7.SyntaxKind.NullKeyword));
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
    } else if (ts7.isQualifiedName(id.parent) && id.parent.right === id) {
      return this.getImportOfNamespacedIdentifier(id, getQualifiedNameRoot(id.parent));
    } else if (ts7.isPropertyAccessExpression(id.parent) && id.parent.name === id) {
      return this.getImportOfNamespacedIdentifier(id, getFarLeftIdentifier(id.parent));
    } else {
      return null;
    }
  }
  getExportsOfModule(node) {
    if (!ts7.isSourceFile(node)) {
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
    if (!(ts7.isClassDeclaration(clazz) || ts7.isClassExpression(clazz)) || clazz.heritageClauses === void 0) {
      return null;
    }
    const extendsClause = clazz.heritageClauses.find((clause) => clause.token === ts7.SyntaxKind.ExtendsKeyword);
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
    if (!ts7.isFunctionDeclaration(node) && !ts7.isMethodDeclaration(node) && !ts7.isFunctionExpression(node)) {
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
    if (!ts7.isClassDeclaration(clazz)) {
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
    if (ts7.isVariableDeclaration(decl) && ts7.isVariableDeclarationList(decl.parent)) {
      topLevel = decl.parent.parent;
    }
    if (topLevel.modifiers !== void 0 && topLevel.modifiers.some((modifier) => modifier.kind === ts7.SyntaxKind.ExportKeyword)) {
      return true;
    }
    if (topLevel.parent === void 0 || !ts7.isSourceFile(topLevel.parent)) {
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
    if (!ts7.isStringLiteral(importDecl.moduleSpecifier)) {
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
    const namespaceDeclaration = ts7.isNamespaceImport(declaration) ? declaration : null;
    if (!namespaceDeclaration) {
      return null;
    }
    const importDeclaration = namespaceDeclaration.parent.parent;
    if (!ts7.isStringLiteral(importDeclaration.moduleSpecifier)) {
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
    if (valueDeclaration !== void 0 && ts7.isShorthandPropertyAssignment(valueDeclaration)) {
      const shorthandSymbol = this.checker.getShorthandAssignmentValueSymbol(valueDeclaration);
      if (shorthandSymbol === void 0) {
        return null;
      }
      return this.getDeclarationOfSymbol(shorthandSymbol, originalId);
    } else if (valueDeclaration !== void 0 && ts7.isExportSpecifier(valueDeclaration)) {
      const targetSymbol = this.checker.getExportSpecifierLocalTargetSymbol(valueDeclaration);
      if (targetSymbol === void 0) {
        return null;
      }
      return this.getDeclarationOfSymbol(targetSymbol, originalId);
    }
    const importInfo = originalId && this.getImportOfIdentifier(originalId);
    const viaModule = importInfo !== null && importInfo.from !== null && !importInfo.from.startsWith(".") ? importInfo.from : null;
    while (symbol.flags & ts7.SymbolFlags.Alias) {
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
    if (ts7.isCallExpression(decoratorExpr)) {
      args = Array.from(decoratorExpr.arguments);
      decoratorExpr = decoratorExpr.expression;
    }
    if (!isDecoratorIdentifier(decoratorExpr)) {
      return null;
    }
    const decoratorIdentifier = ts7.isIdentifier(decoratorExpr) ? decoratorExpr : decoratorExpr.name;
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
    if (ts7.isPropertyDeclaration(node)) {
      kind = ClassMemberKind.Property;
      value = node.initializer || null;
    } else if (ts7.isGetAccessorDeclaration(node)) {
      kind = ClassMemberKind.Getter;
    } else if (ts7.isSetAccessorDeclaration(node)) {
      kind = ClassMemberKind.Setter;
    } else if (ts7.isMethodDeclaration(node)) {
      kind = ClassMemberKind.Method;
    } else if (ts7.isConstructorDeclaration(node)) {
      kind = ClassMemberKind.Constructor;
    } else {
      return null;
    }
    if (ts7.isConstructorDeclaration(node)) {
      name = "constructor";
    } else if (ts7.isIdentifier(node.name)) {
      name = node.name.text;
      nameNode = node.name;
    } else if (ts7.isStringLiteral(node.name)) {
      name = node.name.text;
      nameNode = node.name;
    } else {
      return null;
    }
    const decorators = this.getDecoratorsOfDeclaration(node);
    const isStatic = node.modifiers !== void 0 && node.modifiers.some((mod) => mod.kind === ts7.SyntaxKind.StaticKeyword);
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
      if (exportedSymbol.flags & ts7.SymbolFlags.Alias) {
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
function reflectTypeEntityToDeclaration(type, checker) {
  let realSymbol = checker.getSymbolAtLocation(type);
  if (realSymbol === void 0) {
    throw new Error(`Cannot resolve type entity ${type.getText()} to symbol`);
  }
  while (realSymbol.flags & ts7.SymbolFlags.Alias) {
    realSymbol = checker.getAliasedSymbol(realSymbol);
  }
  let node = null;
  if (realSymbol.valueDeclaration !== void 0) {
    node = realSymbol.valueDeclaration;
  } else if (realSymbol.declarations !== void 0 && realSymbol.declarations.length === 1) {
    node = realSymbol.declarations[0];
  } else {
    throw new Error(`Cannot resolve type entity symbol to declaration`);
  }
  if (ts7.isQualifiedName(type)) {
    if (!ts7.isIdentifier(type.left)) {
      throw new Error(`Cannot handle qualified name with non-identifier lhs`);
    }
    const symbol = checker.getSymbolAtLocation(type.left);
    if (symbol === void 0 || symbol.declarations === void 0 || symbol.declarations.length !== 1) {
      throw new Error(`Cannot resolve qualified type entity lhs to symbol`);
    }
    const decl = symbol.declarations[0];
    if (ts7.isNamespaceImport(decl)) {
      const clause = decl.parent;
      const importDecl = clause.parent;
      if (!ts7.isStringLiteral(importDecl.moduleSpecifier)) {
        throw new Error(`Module specifier is not a string`);
      }
      return { node, from: importDecl.moduleSpecifier.text };
    } else if (ts7.isModuleDeclaration(decl)) {
      return { node, from: null };
    } else {
      throw new Error(`Unknown import type?`);
    }
  } else {
    return { node, from: null };
  }
}
function filterToMembersWithDecorator(members, name, module7) {
  return members.filter((member) => !member.isStatic).map((member) => {
    if (member.decorators === null) {
      return null;
    }
    const decorators = member.decorators.filter((dec) => {
      if (dec.import !== null) {
        return dec.import.name === name && (module7 === void 0 || dec.import.from === module7);
      } else {
        return dec.name === name && module7 === void 0;
      }
    });
    if (decorators.length === 0) {
      return null;
    }
    return { member, decorators };
  }).filter((value) => value !== null);
}
function reflectObjectLiteral(node) {
  const map = new Map();
  node.properties.forEach((prop) => {
    if (ts7.isPropertyAssignment(prop)) {
      const name = propertyNameToString(prop.name);
      if (name === null) {
        return;
      }
      map.set(name, prop.initializer);
    } else if (ts7.isShorthandPropertyAssignment(prop)) {
      map.set(prop.name.text, prop.name);
    } else {
      return;
    }
  });
  return map;
}
function castDeclarationToClassOrDie(declaration) {
  if (!ts7.isClassDeclaration(declaration)) {
    throw new Error(`Reflecting on a ${ts7.SyntaxKind[declaration.kind]} instead of a ClassDeclaration.`);
  }
  return declaration;
}
function parameterName(name) {
  if (ts7.isIdentifier(name)) {
    return name.text;
  } else {
    return null;
  }
}
function propertyNameToString(node) {
  if (ts7.isIdentifier(node) || ts7.isStringLiteral(node) || ts7.isNumericLiteral(node)) {
    return node.text;
  } else {
    return null;
  }
}
function getQualifiedNameRoot(qualifiedName) {
  while (ts7.isQualifiedName(qualifiedName.left)) {
    qualifiedName = qualifiedName.left;
  }
  return ts7.isIdentifier(qualifiedName.left) ? qualifiedName.left : null;
}
function getFarLeftIdentifier(propertyAccess) {
  while (ts7.isPropertyAccessExpression(propertyAccess.expression)) {
    propertyAccess = propertyAccess.expression;
  }
  return ts7.isIdentifier(propertyAccess.expression) ? propertyAccess.expression : null;
}
function getContainingImportDeclaration(node) {
  return ts7.isImportSpecifier(node) ? node.parent.parent.parent : ts7.isNamespaceImport(node) ? node.parent.parent : null;
}
function getExportedName(decl, originalId) {
  return ts7.isImportSpecifier(decl) ? (decl.propertyName !== void 0 ? decl.propertyName : decl.name).text : originalId.text;
}
var LocalExportedDeclarations = Symbol("LocalExportedDeclarations");

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/utils.mjs
function isDefined(value) {
  return value !== void 0 && value !== null;
}
function getNameText(name) {
  return ts8.isIdentifier(name) || ts8.isLiteralExpression(name) ? name.text : name.getText();
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
  return namedDeclaration.name !== void 0 && ts8.isIdentifier(namedDeclaration.name);
}
function isRelativePath(path7) {
  return isRooted(path7) || /^\.\.?(\/|\\|$)/.test(path7);
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
function resolveFileWithPostfixes(fs5, path7, postFixes) {
  for (const postFix of postFixes) {
    const testPath = absoluteFrom(path7 + postFix);
    if (fs5.exists(testPath) && fs5.stat(testPath).isFile()) {
      return testPath;
    }
  }
  return null;
}
function getTsHelperFnFromDeclaration(decl) {
  if (!ts8.isFunctionDeclaration(decl) && !ts8.isVariableDeclaration(decl)) {
    return null;
  }
  if (decl.name === void 0 || !ts8.isIdentifier(decl.name)) {
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
function stripExtension2(fileName) {
  return fileName.replace(/\..+$/, "");
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/dependencies/module_resolver.mjs
var ModuleResolver = class {
  constructor(fs5, pathMappings, relativeExtensions = ["", ".js", "/index.js"]) {
    this.fs = fs5;
    this.relativeExtensions = relativeExtensions;
    this.pathMappings = pathMappings ? this.processPathMappings(pathMappings) : [];
  }
  resolveModuleImport(moduleName, fromPath) {
    if (isRelativePath(moduleName)) {
      return this.resolveAsRelativePath(moduleName, fromPath);
    } else {
      return this.pathMappings.length && this.resolveByPathMappings(moduleName, fromPath) || this.resolveAsEntryPoint(moduleName, fromPath);
    }
  }
  processPathMappings(pathMappings) {
    const baseUrl = this.fs.resolve(pathMappings.baseUrl);
    return Object.keys(pathMappings.paths).map((pathPattern) => {
      const matcher = splitOnStar(pathPattern);
      const templates = pathMappings.paths[pathPattern].map(splitOnStar);
      return { matcher, templates, baseUrl };
    });
  }
  resolveAsRelativePath(moduleName, fromPath) {
    const resolvedPath = resolveFileWithPostfixes(this.fs, this.fs.resolve(this.fs.dirname(fromPath), moduleName), this.relativeExtensions);
    return resolvedPath && new ResolvedRelativeModule(resolvedPath);
  }
  resolveByPathMappings(moduleName, fromPath) {
    const mappedPaths = this.findMappedPaths(moduleName);
    if (mappedPaths.length > 0) {
      const packagePath = this.findPackagePath(fromPath);
      if (packagePath !== null) {
        for (const mappedPath of mappedPaths) {
          if (this.isEntryPoint(mappedPath)) {
            return new ResolvedExternalModule(mappedPath);
          }
          const nonEntryPointImport = this.resolveAsRelativePath(mappedPath, fromPath);
          if (nonEntryPointImport !== null) {
            return isRelativeImport(packagePath, mappedPath) ? nonEntryPointImport : new ResolvedDeepImport(mappedPath);
          }
        }
      }
    }
    return null;
  }
  resolveAsEntryPoint(moduleName, fromPath) {
    let folder = fromPath;
    while (!this.fs.isRoot(folder)) {
      folder = this.fs.dirname(folder);
      if (folder.endsWith("node_modules")) {
        folder = this.fs.dirname(folder);
      }
      const modulePath = this.fs.resolve(folder, "node_modules", moduleName);
      if (this.isEntryPoint(modulePath)) {
        return new ResolvedExternalModule(modulePath);
      } else if (this.resolveAsRelativePath(modulePath, fromPath)) {
        return new ResolvedDeepImport(modulePath);
      }
    }
    return null;
  }
  isEntryPoint(modulePath) {
    return this.fs.exists(this.fs.join(modulePath, "package.json"));
  }
  findMappedPaths(moduleName) {
    const matches = this.pathMappings.map((mapping) => this.matchMapping(moduleName, mapping));
    let bestMapping;
    let bestMatch;
    for (let index = 0; index < this.pathMappings.length; index++) {
      const mapping = this.pathMappings[index];
      const match = matches[index];
      if (match !== null) {
        if (!mapping.matcher.hasWildcard) {
          bestMatch = match;
          bestMapping = mapping;
          break;
        }
        if (!bestMapping || mapping.matcher.prefix > bestMapping.matcher.prefix) {
          bestMatch = match;
          bestMapping = mapping;
        }
      }
    }
    return bestMapping !== void 0 && bestMatch !== void 0 ? this.computeMappedTemplates(bestMapping, bestMatch) : [];
  }
  matchMapping(path7, mapping) {
    const { prefix, postfix, hasWildcard } = mapping.matcher;
    if (hasWildcard) {
      return path7.startsWith(prefix) && path7.endsWith(postfix) ? path7.substring(prefix.length, path7.length - postfix.length) : null;
    } else {
      return path7 === prefix ? "" : null;
    }
  }
  computeMappedTemplates(mapping, match) {
    return mapping.templates.map((template) => this.fs.resolve(mapping.baseUrl, template.prefix + match + template.postfix));
  }
  findPackagePath(path7) {
    let folder = path7;
    while (!this.fs.isRoot(folder)) {
      folder = this.fs.dirname(folder);
      if (this.fs.exists(this.fs.join(folder, "package.json"))) {
        return folder;
      }
    }
    return null;
  }
};
var ResolvedExternalModule = class {
  constructor(entryPointPath) {
    this.entryPointPath = entryPointPath;
  }
};
var ResolvedRelativeModule = class {
  constructor(modulePath) {
    this.modulePath = modulePath;
  }
};
var ResolvedDeepImport = class {
  constructor(importPath) {
    this.importPath = importPath;
  }
};
function splitOnStar(str) {
  const [prefix, postfix] = str.split("*", 2);
  return { prefix, postfix: postfix || "", hasWildcard: postfix !== void 0 };
}
function isRelativeImport(from, to) {
  return to.startsWith(from) && !to.includes("node_modules");
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/dependencies/dependency_host.mjs
function createDependencyInfo() {
  return { dependencies: new Set(), missing: new Set(), deepImports: new Set() };
}
var DependencyHostBase = class {
  constructor(fs5, moduleResolver) {
    this.fs = fs5;
    this.moduleResolver = moduleResolver;
  }
  collectDependencies(entryPointPath, { dependencies, missing, deepImports }) {
    const resolvedFile = resolveFileWithPostfixes(this.fs, entryPointPath, this.moduleResolver.relativeExtensions);
    if (resolvedFile !== null) {
      const alreadySeen = new Set();
      this.recursivelyCollectDependencies(resolvedFile, dependencies, missing, deepImports, alreadySeen);
    }
  }
  collectDependenciesInFiles(files, { dependencies, missing, deepImports }) {
    const alreadySeen = new Set();
    for (const file of files) {
      this.processFile(file, dependencies, missing, deepImports, alreadySeen);
    }
  }
  recursivelyCollectDependencies(file, dependencies, missing, deepImports, alreadySeen) {
    const fromContents = this.fs.readFile(file);
    if (this.canSkipFile(fromContents)) {
      return;
    }
    const imports = this.extractImports(file, fromContents);
    for (const importPath of imports) {
      const resolved = this.processImport(importPath, file, dependencies, missing, deepImports, alreadySeen);
      if (!resolved) {
        missing.add(importPath);
      }
    }
  }
  processImport(importPath, file, dependencies, missing, deepImports, alreadySeen) {
    const resolvedModule = this.moduleResolver.resolveModuleImport(importPath, file);
    if (resolvedModule === null) {
      return false;
    }
    if (resolvedModule instanceof ResolvedRelativeModule) {
      this.processFile(resolvedModule.modulePath, dependencies, missing, deepImports, alreadySeen);
    } else if (resolvedModule instanceof ResolvedDeepImport) {
      deepImports.add(resolvedModule.importPath);
    } else {
      dependencies.add(resolvedModule.entryPointPath);
    }
    return true;
  }
  processFile(file, dependencies, missing, deepImports, alreadySeen) {
    if (!alreadySeen.has(file)) {
      alreadySeen.add(file);
      this.recursivelyCollectDependencies(file, dependencies, missing, deepImports, alreadySeen);
    }
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/dependencies/commonjs_dependency_host.mjs
var CommonJsDependencyHost = class extends DependencyHostBase {
  canSkipFile(fileContents) {
    return !hasRequireCalls(fileContents);
  }
  extractImports(file, fileContents) {
    const sf = ts9.createSourceFile(file, fileContents, ts9.ScriptTarget.ES2015, false, ts9.ScriptKind.JS);
    const requireCalls = [];
    for (const stmt of sf.statements) {
      if (ts9.isVariableStatement(stmt)) {
        const declarations = stmt.declarationList.declarations;
        for (const declaration of declarations) {
          if (declaration.initializer !== void 0 && isRequireCall(declaration.initializer)) {
            requireCalls.push(declaration.initializer);
          }
        }
      } else if (ts9.isExpressionStatement(stmt)) {
        if (isRequireCall(stmt.expression)) {
          requireCalls.push(stmt.expression);
        } else if (isWildcardReexportStatement(stmt)) {
          const firstExportArg = stmt.expression.arguments[0];
          if (isRequireCall(firstExportArg)) {
            requireCalls.push(firstExportArg);
          }
        } else if (ts9.isBinaryExpression(stmt.expression) && stmt.expression.operatorToken.kind === ts9.SyntaxKind.EqualsToken) {
          if (isRequireCall(stmt.expression.right)) {
            requireCalls.push(stmt.expression.right);
          } else if (ts9.isObjectLiteralExpression(stmt.expression.right)) {
            stmt.expression.right.properties.forEach((prop) => {
              if (ts9.isPropertyAssignment(prop) && isRequireCall(prop.initializer)) {
                requireCalls.push(prop.initializer);
              }
            });
          }
        }
      }
    }
    return new Set(requireCalls.map((call) => call.arguments[0].text));
  }
};
function hasRequireCalls(source) {
  return /require\(['"]/.test(source);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/dependencies/dependency_resolver.mjs
import { DepGraph } from "dependency-graph";
import module2 from "module";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/packages/entry_point.mjs
import ts15 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/host/umd_host.mjs
import ts14 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/host/esm2015_host.mjs
import ts12 from "typescript";

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
import ts10 from "typescript";
var PRE_R3_MARKER = "__PRE_R3__";
var POST_R3_MARKER = "__POST_R3__";
function isSwitchableVariableDeclaration(node) {
  return ts10.isVariableDeclaration(node) && !!node.initializer && ts10.isIdentifier(node.initializer) && node.initializer.text.endsWith(PRE_R3_MARKER);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/host/utils.mjs
import ts11 from "typescript";
function stripParentheses(node) {
  return ts11.isParenthesizedExpression(node) ? node.expression : node;
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
    if ((classSymbol == null ? void 0 : classSymbol.implementation.valueDeclaration) === void 0 || !isNamedDeclaration2(classSymbol.implementation.valueDeclaration)) {
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
    if (!isNamedDeclaration2(declaration)) {
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
      if (variableValue !== null && ts12.isClassExpression(variableValue)) {
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
    if (isConcreteDeclaration(declaration) && ts12.isVariableDeclaration(declaration.node)) {
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
  getSwitchableDeclarations(module7) {
    return module7.getText().indexOf(PRE_R3_MARKER) >= 0 ? findAll(module7, isSwitchableVariableDeclaration) : [];
  }
  getVariableValue(declaration) {
    const value = super.getVariableValue(declaration);
    if (value) {
      return value;
    }
    const block = declaration.parent.parent.parent;
    const symbol = this.checker.getSymbolAtLocation(declaration.name);
    if (symbol && (ts12.isBlock(block) || ts12.isSourceFile(block))) {
      const decorateCall = this.findDecoratedVariableValue(block, symbol);
      const target = decorateCall && decorateCall.arguments[1];
      if (target && ts12.isIdentifier(target)) {
        const targetSymbol = this.checker.getSymbolAtLocation(target);
        const targetDeclaration = targetSymbol && targetSymbol.valueDeclaration;
        if (targetDeclaration) {
          if (ts12.isClassDeclaration(targetDeclaration) || ts12.isFunctionDeclaration(targetDeclaration)) {
            return targetDeclaration.name || null;
          } else if (ts12.isVariableDeclaration(targetDeclaration)) {
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
    if (dtsDeclaration && ts12.isClassDeclaration(dtsDeclaration)) {
      return dtsDeclaration.typeParameters ? dtsDeclaration.typeParameters.length : 0;
    }
    return null;
  }
  getDtsDeclaration(declaration) {
    if (this.dts === null) {
      return null;
    }
    if (!isNamedDeclaration2(declaration)) {
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
    if (ts12.isBlock(container)) {
      const returnStatementIndex = container.statements.findIndex(ts12.isReturnStatement);
      if (returnStatementIndex === -1) {
        throw new Error(`Compiled class wrapper IIFE does not have a return statement: ${classSymbol.name} in ${classSymbol.declaration.valueDeclaration.getSourceFile().fileName}`);
      }
      last = container.statements[returnStatementIndex - 1];
    } else if (ts12.isSourceFile(container)) {
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
    if (ts12.isVariableStatement(statement)) {
      statement.declarationList.declarations.forEach((declaration) => {
        const classSymbol = this.getClassSymbol(declaration);
        if (classSymbol) {
          classes.set(classSymbol.implementation, classSymbol);
        }
      });
    } else if (ts12.isClassDeclaration(statement)) {
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
    if (ts12.isClassExpression(declaration) && hasNameIdentifier(declaration)) {
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
    if (innerDeclaration !== null && isNamedDeclaration2(innerDeclaration)) {
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
    if (!ts12.isClassExpression(innerDeclaration) && !ts12.isFunctionExpression(innerDeclaration)) {
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
    if (!ts12.isVariableStatement(statement)) {
      return;
    }
    const declarations = statement.declarationList.declarations;
    if (declarations.length !== 1) {
      return;
    }
    const declaration = declarations[0];
    const initializer = declaration.initializer;
    if (!ts12.isIdentifier(declaration.name) || !initializer || !isAssignment2(initializer) || !ts12.isIdentifier(initializer.left) || !this.isClass(declaration)) {
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
    if (ts12.isBinaryExpression(node) && node.operatorToken.kind === ts12.SyntaxKind.EqualsToken) {
      const left = node.left;
      const right = node.right;
      if (ts12.isIdentifier(left) && this.checker.getSymbolAtLocation(left) === symbol) {
        return ts12.isCallExpression(right) && getCalleeName(right) === "__decorate" ? right : null;
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
      if (ts12.isBinaryExpression(decoratorsIdentifier.parent) && decoratorsIdentifier.parent.operatorToken.kind === ts12.SyntaxKind.EqualsToken) {
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
    if (ts12.isVariableDeclaration(symbol.declaration.valueDeclaration)) {
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
      if (ts12.isVariableDeclaration(symbol.adjacent.valueDeclaration)) {
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
    if (propDecoratorsMap && ts12.isObjectLiteralExpression(propDecoratorsMap)) {
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
    if (!ts12.isCallExpression(expression)) {
      return null;
    }
    const call = expression;
    const helperName = getCalleeName(call);
    if (helperName === "__metadata") {
      const key = call.arguments[0];
      if (key === void 0 || !ts12.isStringLiteral(key) || key.text !== "design:paramtypes") {
        return null;
      }
      const value = call.arguments[1];
      if (value === void 0 || !ts12.isArrayLiteralExpression(value)) {
        return null;
      }
      return {
        type: "params",
        types: Array.from(value.elements)
      };
    }
    if (helperName === "__param") {
      const indexArg = call.arguments[0];
      const index = indexArg && ts12.isNumericLiteral(indexArg) ? parseInt(indexArg.text, 10) : NaN;
      if (isNaN(index)) {
        return null;
      }
      const decoratorCall = call.arguments[1];
      if (decoratorCall === void 0 || !ts12.isCallExpression(decoratorCall)) {
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
    const decoratorIdentifier = ts12.isIdentifier(decoratorExpression) ? decoratorExpression : decoratorExpression.name;
    return {
      name: decoratorIdentifier.text,
      identifier: decoratorExpression,
      import: this.getImportOfIdentifier(decoratorIdentifier),
      node: call,
      args: Array.from(call.arguments)
    };
  }
  getHelperCall(statement, helperNames) {
    if ((ts12.isExpressionStatement(statement) || ts12.isReturnStatement(statement)) && statement.expression) {
      let expression = statement.expression;
      while (isAssignment2(expression)) {
        expression = expression.right;
      }
      if (ts12.isCallExpression(expression)) {
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
    if (ts12.isArrayLiteralExpression(decoratorsArray)) {
      decoratorsArray.elements.forEach((node) => {
        if (ts12.isObjectLiteralExpression(node)) {
          const decorator = reflectObjectLiteral(node);
          if (decorator.has("type")) {
            let decoratorType = decorator.get("type");
            if (isDecoratorIdentifier(decoratorType)) {
              const decoratorIdentifier = ts12.isIdentifier(decoratorType) ? decoratorType : decoratorType.name;
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
    if (symbol.flags & ts12.SymbolFlags.Accessor) {
      const members = [];
      const setter = symbol.declarations && symbol.declarations.find(ts12.isSetAccessor);
      const getter = symbol.declarations && symbol.declarations.find(ts12.isGetAccessor);
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
    if (symbol.flags & ts12.SymbolFlags.Method) {
      kind = ClassMemberKind.Method;
    } else if (symbol.flags & ts12.SymbolFlags.Property) {
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
    } else if (ts12.isConstructorDeclaration(node)) {
      kind = ClassMemberKind.Constructor;
      name = "constructor";
      isStatic = false;
    }
    if (kind === null) {
      this.logger.warn(`Unknown member type: "${node.getText()}`);
      return null;
    }
    if (!name) {
      if (isNamedDeclaration2(node)) {
        name = node.name.text;
        nameNode = node.name;
      } else {
        return null;
      }
    }
    if (isStatic === void 0) {
      isStatic = node.modifiers !== void 0 && node.modifiers.some((mod) => mod.kind === ts12.SyntaxKind.StaticKeyword);
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
    if (ts12.isIdentifier(expression)) {
      return this.getImportOfIdentifier(expression);
    } else if (ts12.isPropertyAccessExpression(expression) && ts12.isIdentifier(expression.name)) {
      return this.getImportOfIdentifier(expression.name);
    } else {
      return null;
    }
  }
  getParamInfoFromStaticProperty(paramDecoratorsProperty) {
    const paramDecorators = getPropertyValueFromSymbol(paramDecoratorsProperty);
    if (paramDecorators) {
      const container = ts12.isArrowFunction(paramDecorators) ? paramDecorators.body : paramDecorators;
      if (ts12.isArrayLiteralExpression(container)) {
        const elements = container.elements;
        return elements.map((element) => ts12.isObjectLiteralExpression(element) ? reflectObjectLiteral(element) : null).map((paramInfo) => {
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
    if (ts12.isBlock(statement.parent)) {
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
        if (exportedSymbol.flags & ts12.SymbolFlags.Alias) {
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
    if (ts12.isIdentifier(expression)) {
      return this.getDeclarationOfIdentifier(expression);
    }
    if (!ts12.isPropertyAccessExpression(expression) || !ts12.isIdentifier(expression.expression)) {
      return null;
    }
    const namespaceDecl = this.getDeclarationOfIdentifier(expression.expression);
    if (!namespaceDecl || !ts12.isSourceFile(namespaceDecl.node)) {
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
    if (!ts12.isVariableDeclaration(node) || !ts12.isIdentifier(node.name) || node.name.text !== "Object" || node.type === void 0) {
      return false;
    }
    const typeNode = node.type;
    if (!ts12.isTypeReferenceNode(typeNode) || !ts12.isIdentifier(typeNode.typeName) || typeNode.typeName.text !== "ObjectConstructor") {
      return false;
    }
    return this.src.program.isSourceFileDefaultLibrary(node.getSourceFile());
  }
  resolveEnumMembers(declaration) {
    if (declaration.initializer !== void 0)
      return null;
    const variableStmt = declaration.parent.parent;
    if (!ts12.isVariableStatement(variableStmt))
      return null;
    const block = variableStmt.parent;
    if (!ts12.isBlock(block) && !ts12.isSourceFile(block))
      return null;
    const declarationIndex = block.statements.findIndex((statement) => statement === variableStmt);
    if (declarationIndex === -1 || declarationIndex === block.statements.length - 1)
      return null;
    const subsequentStmt = block.statements[declarationIndex + 1];
    if (!ts12.isExpressionStatement(subsequentStmt))
      return null;
    const iife = stripParentheses(subsequentStmt.expression);
    if (!ts12.isCallExpression(iife) || !isEnumDeclarationIife(iife))
      return null;
    const fn = stripParentheses(iife.expression);
    if (!ts12.isFunctionExpression(fn))
      return null;
    return this.reflectEnumMembers(fn);
  }
  reflectEnumMembers(fn) {
    if (fn.parameters.length !== 1)
      return null;
    const enumName = fn.parameters[0].name;
    if (!ts12.isIdentifier(enumName))
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
    if (!ts12.isExpressionStatement(statement))
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
  if (!ts12.isBinaryExpression(arg) || arg.operatorToken.kind !== ts12.SyntaxKind.BarBarToken || !ts12.isParenthesizedExpression(arg.right)) {
    return false;
  }
  const right = arg.right.expression;
  if (!ts12.isBinaryExpression(right) || right.operatorToken.kind !== ts12.SyntaxKind.EqualsToken) {
    return false;
  }
  if (!ts12.isObjectLiteralExpression(right.right) || right.right.properties.length !== 0) {
    return false;
  }
  return true;
}
function isEnumAssignment(enumName, expression) {
  if (!ts12.isBinaryExpression(expression) || expression.operatorToken.kind !== ts12.SyntaxKind.EqualsToken || !ts12.isElementAccessExpression(expression.left)) {
    return false;
  }
  const enumIdentifier = expression.left.expression;
  return ts12.isIdentifier(enumIdentifier) && enumIdentifier.text === enumName.text;
}
function reflectEnumAssignment(expression) {
  const memberName = expression.left.argumentExpression;
  if (!ts12.isPropertyName(memberName))
    return null;
  return { name: memberName, initializer: expression.right };
}
function isAssignmentStatement(statement) {
  return ts12.isExpressionStatement(statement) && isAssignment2(statement.expression) && ts12.isIdentifier(statement.expression.left);
}
function getIifeBody(expression) {
  const call = stripParentheses(expression);
  if (!ts12.isCallExpression(call)) {
    return void 0;
  }
  const fn = stripParentheses(call.expression);
  if (!ts12.isFunctionExpression(fn) && !ts12.isArrowFunction(fn)) {
    return void 0;
  }
  return fn.body;
}
function isAssignment2(node) {
  return ts12.isBinaryExpression(node) && node.operatorToken.kind === ts12.SyntaxKind.EqualsToken;
}
function isClassDecorateCall(call, matches) {
  const helperArgs = call.arguments[0];
  if (helperArgs === void 0 || !ts12.isArrayLiteralExpression(helperArgs)) {
    return false;
  }
  const target = call.arguments[1];
  return target !== void 0 && ts12.isIdentifier(target) && matches(target);
}
function isMemberDecorateCall(call, matches) {
  const helperArgs = call.arguments[0];
  if (helperArgs === void 0 || !ts12.isArrayLiteralExpression(helperArgs)) {
    return false;
  }
  const target = call.arguments[1];
  if (target === void 0 || !ts12.isPropertyAccessExpression(target) || !ts12.isIdentifier(target.expression) || !matches(target.expression) || target.name.text !== "prototype") {
    return false;
  }
  const memberName = call.arguments[2];
  return memberName !== void 0 && ts12.isStringLiteral(memberName);
}
function getPropertyValueFromSymbol(propSymbol) {
  const propIdentifier = propSymbol.valueDeclaration;
  const parent = propIdentifier && propIdentifier.parent;
  return parent && ts12.isBinaryExpression(parent) ? parent.right : void 0;
}
function getCalleeName(call) {
  if (ts12.isIdentifier(call.expression)) {
    return stripDollarSuffix(call.expression.text);
  }
  if (ts12.isPropertyAccessExpression(call.expression)) {
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
  if (ts12.isClassExpression(expression) && hasNameIdentifier(expression)) {
    return expression;
  }
  const iifeBody = getIifeBody(expression);
  if (iifeBody === void 0) {
    return null;
  }
  if (!ts12.isBlock(iifeBody)) {
    return ts12.isClassExpression(iifeBody) && isNamedDeclaration2(iifeBody) ? iifeBody : null;
  } else {
    for (const statement of iifeBody.statements) {
      if (isNamedClassDeclaration(statement) || isNamedFunctionDeclaration(statement)) {
        return statement;
      }
      if (ts12.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (isInitializedVariableClassDeclaration(declaration)) {
            const expression2 = skipClassAliases(declaration);
            if (ts12.isClassExpression(expression2) && hasNameIdentifier(expression2)) {
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
  const argsProperty = node.properties.filter(ts12.isPropertyAssignment).find((property2) => getNameText(property2.name) === "args");
  const argsExpression = argsProperty && argsProperty.initializer;
  return argsExpression && ts12.isArrayLiteralExpression(argsExpression) ? Array.from(argsExpression.elements) : [];
}
function isPropertyAccess(node) {
  return !!node.parent && ts12.isBinaryExpression(node.parent) && ts12.isPropertyAccessExpression(node);
}
function isThisAssignment(node) {
  return ts12.isBinaryExpression(node) && ts12.isPropertyAccessExpression(node.left) && node.left.expression.kind === ts12.SyntaxKind.ThisKeyword;
}
function isNamedDeclaration2(node) {
  const anyNode = node;
  return !!anyNode.name && ts12.isIdentifier(anyNode.name);
}
function isClassMemberType(node) {
  return (ts12.isClassElement(node) || isPropertyAccess(node) || ts12.isBinaryExpression(node)) && !ts12.isIndexSignatureDeclaration(node);
}
function getFarLeftHandSideOfAssignment(declaration) {
  let node = declaration.parent;
  if (isAssignment2(node) && ts12.isIdentifier(node.left)) {
    node = node.parent;
  }
  return ts12.isVariableDeclaration(node) ? node : void 0;
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
  if (!firstStatement || !ts12.isExpressionStatement(firstStatement))
    return false;
  return isSynthesizedSuperCall(firstStatement.expression);
}
function isSynthesizedSuperCall(expression) {
  if (!ts12.isCallExpression(expression))
    return false;
  if (expression.expression.kind !== ts12.SyntaxKind.SuperKeyword)
    return false;
  if (expression.arguments.length !== 1)
    return false;
  const argument = expression.arguments[0];
  return ts12.isSpreadElement(argument) && ts12.isIdentifier(argument.expression) && argument.expression.text === "arguments";
}
function getContainingStatement(node) {
  while (node.parent) {
    if (ts12.isBlock(node.parent) || ts12.isSourceFile(node.parent)) {
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
    if (ts12.isBlock(node)) {
      return false;
    }
  }
  return true;
}
function getOuterNodeFromInnerDeclaration(node) {
  if (!ts12.isFunctionDeclaration(node) && !ts12.isClassDeclaration(node) && !ts12.isVariableStatement(node)) {
    return null;
  }
  let outerNode = node.parent;
  if (!outerNode || !ts12.isBlock(outerNode))
    return null;
  outerNode = outerNode.parent;
  if (!outerNode || !ts12.isFunctionExpression(outerNode) && !ts12.isArrowFunction(outerNode)) {
    return null;
  }
  outerNode = outerNode.parent;
  if (outerNode && ts12.isParenthesizedExpression(outerNode))
    outerNode = outerNode.parent;
  if (!outerNode || !ts12.isCallExpression(outerNode))
    return null;
  outerNode = outerNode.parent;
  if (outerNode && ts12.isParenthesizedExpression(outerNode))
    outerNode = outerNode.parent;
  while (isAssignment2(outerNode.parent)) {
    outerNode = outerNode.parent;
  }
  return outerNode;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/host/esm5_host.mjs
import ts13 from "typescript";
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
    if (!ts13.isCallExpression(iife.parent)) {
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
    if (!ts13.isVariableDeclaration(declaration.node) || declaration.node.initializer !== void 0 || !ts13.isBlock(declaration.node.parent.parent.parent)) {
      return declaration;
    }
    const block = declaration.node.parent.parent.parent;
    const aliasSymbol = this.checker.getSymbolAtLocation(declaration.node.name);
    for (let i = 0; i < block.statements.length; i++) {
      const statement = block.statements[i];
      if (isAssignmentStatement(statement) && ts13.isIdentifier(statement.expression.left) && ts13.isIdentifier(statement.expression.right) && this.checker.getSymbolAtLocation(statement.expression.left) === aliasSymbol) {
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
    if (!ts13.isFunctionDeclaration(constructor))
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
    if (expression && ts13.isArrayLiteralExpression(expression)) {
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
      if (member && member.kind === ClassMemberKind.Method && member.isStatic && member.node && ts13.isPropertyAccessExpression(member.node) && member.node.parent && ts13.isBinaryExpression(member.node.parent) && ts13.isFunctionExpression(member.node.parent.right)) {
        member.implementation = member.node.parent.right;
      }
    });
    return members;
  }
  getStatementsForClass(classSymbol) {
    const classDeclarationParent = classSymbol.implementation.valueDeclaration.parent;
    return ts13.isBlock(classDeclarationParent) ? Array.from(classDeclarationParent.statements) : [];
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
    if (!ts13.isVariableStatement(statement))
      return false;
    const variableDeclarations = statement.declarationList.declarations;
    if (variableDeclarations.length !== 1)
      return false;
    const variableDeclaration = variableDeclarations[0];
    if (!ts13.isIdentifier(variableDeclaration.name) || !variableDeclaration.name.text.startsWith("_this"))
      return false;
    const initializer = variableDeclaration.initializer;
    if (!initializer)
      return false;
    return this.isSynthesizedDefaultSuperCall(initializer);
  }
  isSynthesizedSuperReturnStatement(statement) {
    if (!ts13.isReturnStatement(statement))
      return false;
    const expression = statement.expression;
    if (!expression)
      return false;
    return this.isSynthesizedDefaultSuperCall(expression);
  }
  isSynthesizedDefaultSuperCall(expression) {
    if (!isBinaryExpr(expression, ts13.SyntaxKind.BarBarToken))
      return false;
    if (expression.right.kind !== ts13.SyntaxKind.ThisKeyword)
      return false;
    const left = expression.left;
    if (isBinaryExpr(left, ts13.SyntaxKind.AmpersandAmpersandToken)) {
      return isSuperNotNull(left.left) && this.isSuperApplyCall(left.right);
    } else {
      return this.isSuperApplyCall(left);
    }
  }
  isSuperApplyCall(expression) {
    if (!ts13.isCallExpression(expression) || expression.arguments.length !== 2)
      return false;
    const targetFn = expression.expression;
    if (!ts13.isPropertyAccessExpression(targetFn))
      return false;
    if (!isSuperIdentifier(targetFn.expression))
      return false;
    if (targetFn.name.text !== "apply")
      return false;
    const thisArgument = expression.arguments[0];
    if (thisArgument.kind !== ts13.SyntaxKind.ThisKeyword)
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
      if (!ts13.isArrayLiteralExpression(firstArg) || firstArg.elements.length !== 0) {
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
    if (!ts13.isCallExpression(expression)) {
      return null;
    }
    const receiverExpr = expression.expression;
    let receiver = null;
    if (ts13.isIdentifier(receiverExpr)) {
      receiver = this.getDeclarationOfIdentifier(receiverExpr);
    } else if (ts13.isPropertyAccessExpression(receiverExpr) && ts13.isIdentifier(receiverExpr.name)) {
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
  if (!ts13.isCallExpression(node))
    return null;
  const fn = node.expression;
  if (!ts13.isPropertyAccessExpression(fn) || !ts13.isIdentifier(fn.expression) || fn.expression.text !== "Object" || fn.name.text !== "defineProperty")
    return null;
  const descriptor = node.arguments[2];
  if (!descriptor || !ts13.isObjectLiteralExpression(descriptor))
    return null;
  return {
    setter: readPropertyFunctionExpression(descriptor, "set"),
    getter: readPropertyFunctionExpression(descriptor, "get")
  };
}
function readPropertyFunctionExpression(object, name) {
  const property2 = object.properties.find((p2) => ts13.isPropertyAssignment(p2) && ts13.isIdentifier(p2.name) && p2.name.text === name);
  return property2 && ts13.isFunctionExpression(property2.initializer) && property2.initializer || null;
}
function getReturnStatement(declaration) {
  return declaration && ts13.isFunctionExpression(declaration) ? declaration.body.statements.find(ts13.isReturnStatement) : void 0;
}
function reflectArrayElement(element) {
  return ts13.isObjectLiteralExpression(element) ? reflectObjectLiteral(element) : null;
}
function isArgumentsIdentifier(expression) {
  return ts13.isIdentifier(expression) && expression.text === "arguments";
}
function isSuperNotNull(expression) {
  return isBinaryExpr(expression, ts13.SyntaxKind.ExclamationEqualsEqualsToken) && isSuperIdentifier(expression.left);
}
function isBinaryExpr(expression, operator) {
  return ts13.isBinaryExpression(expression) && expression.operatorToken.kind === operator;
}
function isSuperIdentifier(node) {
  return ts13.isIdentifier(node) && node.text.startsWith("_super");
}
function captureParamInitializer(statement, parameters) {
  if (ts13.isIfStatement(statement) && isUndefinedComparison(statement.expression) && ts13.isBlock(statement.thenStatement) && statement.thenStatement.statements.length === 1) {
    const ifStatementComparison = statement.expression;
    const thenStatement = statement.thenStatement.statements[0];
    if (isAssignmentStatement(thenStatement)) {
      const comparisonName = ifStatementComparison.left.text;
      const assignmentName = thenStatement.expression.left.text;
      if (comparisonName === assignmentName) {
        const parameter = parameters.find((p2) => p2.name === comparisonName);
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
  return ts13.isBinaryExpression(expression) && expression.operatorToken.kind === ts13.SyntaxKind.EqualsEqualsEqualsToken && ts13.isVoidExpression(expression.right) && ts13.isIdentifier(expression.left);
}
function getIifeFn(classSymbol) {
  if (classSymbol === void 0) {
    return null;
  }
  const innerDeclaration = classSymbol.implementation.valueDeclaration;
  const iifeBody = innerDeclaration.parent;
  if (!ts13.isBlock(iifeBody)) {
    return null;
  }
  const iifeWrapper = iifeBody.parent;
  return iifeWrapper && ts13.isFunctionExpression(iifeWrapper) ? iifeWrapper : null;
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
  getExportsOfModule(module7) {
    return super.getExportsOfModule(module7) || this.umdExports.get(module7.getSourceFile());
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
    if (ts14.isIdentifier(initializer)) {
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
    if (!isAssignment2(initializer) || !ts14.isIdentifier(initializer.left) || !this.isClass(declaration)) {
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
    const requireCall = isRequireCall(reexportArg) ? reexportArg : ts14.isIdentifier(reexportArg) ? findRequireCallReference(reexportArg, this.checker) : null;
    let importPath = null;
    if (requireCall !== null) {
      importPath = requireCall.arguments[0].text;
    } else if (ts14.isIdentifier(reexportArg)) {
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
    const viaModule = stripExtension2(importedFile.fileName);
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
    return declaration && ts14.isParameter(declaration) ? declaration : null;
  }
  getUmdDeclaration(id) {
    const nsIdentifier = findNamespaceOfIdentifier(id);
    if (nsIdentifier === null) {
      return null;
    }
    if (nsIdentifier.parent.parent && isExportsAssignment(nsIdentifier.parent.parent)) {
      const initializer = nsIdentifier.parent.parent.right;
      if (ts14.isIdentifier(initializer)) {
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
    if (moduleDeclaration === null || moduleDeclaration.node === null || !ts14.isSourceFile(moduleDeclaration.node)) {
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
    const exportsSymbol = this.checker.getSymbolsInScope(id, ts14.SymbolFlags.Variable).find((symbol) => symbol.name === "exports");
    const node = (exportsSymbol == null ? void 0 : exportsSymbol.valueDeclaration) !== void 0 && !ts14.isFunctionExpression(exportsSymbol.valueDeclaration.parent) ? exportsSymbol.valueDeclaration : id.getSourceFile();
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
    const module7 = this.resolveModuleName(importPath, id.getSourceFile());
    if (module7 === void 0) {
      return null;
    }
    const viaModule = isExternalImport(importPath) ? importPath : null;
    return { kind: 0, node: module7, viaModule, known: null, identity: null };
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
      const moduleInfo = ts14.resolveModuleName(moduleName, containingFile.fileName, this.program.getCompilerOptions(), this.compilerHost);
      return moduleInfo.resolvedModule && this.program.getSourceFile(absoluteFrom(moduleInfo.resolvedModule.resolvedFileName));
    }
  }
};
function parseStatementForUmdModule(statement) {
  const wrapperCall = getUmdWrapperCall(statement);
  if (!wrapperCall)
    return null;
  const wrapperFn = wrapperCall.expression;
  if (!ts14.isFunctionExpression(wrapperFn))
    return null;
  const factoryFnParamIndex = wrapperFn.parameters.findIndex((parameter) => ts14.isIdentifier(parameter.name) && parameter.name.text === "factory");
  if (factoryFnParamIndex === -1)
    return null;
  const factoryFn = stripParentheses(wrapperCall.arguments[factoryFnParamIndex]);
  if (!factoryFn || !ts14.isFunctionExpression(factoryFn))
    return null;
  return { wrapperFn, factoryFn };
}
function getUmdWrapperCall(statement) {
  if (!ts14.isExpressionStatement(statement) || !ts14.isParenthesizedExpression(statement.expression) || !ts14.isCallExpression(statement.expression.expression) || !ts14.isFunctionExpression(statement.expression.expression.expression)) {
    return null;
  }
  return statement.expression.expression;
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
  if (!ts14.isExpressionStatement(statement)) {
    throw new Error("UMD wrapper body is not an expression statement:\n" + wrapperFn.body.getText());
  }
  const modulePaths = [];
  findModulePaths(statement.expression);
  return modulePaths[paramIndex - 1];
  function findModulePaths(node) {
    if (isRequireCall(node)) {
      const argument = node.arguments[0];
      if (ts14.isStringLiteral(argument)) {
        modulePaths.push(argument.text);
      }
    } else {
      node.forEachChild(findModulePaths);
    }
  }
}
function isExportsIdentifier(node) {
  return ts14.isIdentifier(node) && node.text === "exports";
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/packages/entry_point.mjs
var SUPPORTED_FORMAT_PROPERTIES = ["fesm2015", "fesm5", "es2015", "esm2015", "esm5", "main", "module", "browser"];
var NO_ENTRY_POINT = "no-entry-point";
var IGNORED_ENTRY_POINT = "ignored-entry-point";
var INCOMPATIBLE_ENTRY_POINT = "incompatible-entry-point";
function getEntryPointInfo(fs5, config, logger, packagePath, entryPointPath) {
  const packagePackageJsonPath = fs5.resolve(packagePath, "package.json");
  const entryPointPackageJsonPath = fs5.resolve(entryPointPath, "package.json");
  const loadedPackagePackageJson = loadPackageJson(fs5, packagePackageJsonPath);
  const loadedEntryPointPackageJson = packagePackageJsonPath === entryPointPackageJsonPath ? loadedPackagePackageJson : loadPackageJson(fs5, entryPointPackageJsonPath);
  const { packageName, packageVersion } = getPackageNameAndVersion(fs5, packagePath, loadedPackagePackageJson, loadedEntryPointPackageJson);
  const packageConfig = config.getPackageConfig(packageName, packagePath, packageVersion);
  const entryPointConfig = packageConfig.entryPoints.get(entryPointPath);
  let entryPointPackageJson;
  if (entryPointConfig === void 0) {
    if (!fs5.exists(entryPointPackageJsonPath)) {
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
    entryPointPackageJson = mergeConfigAndPackageJson(fs5, loadedEntryPointPackageJson, entryPointConfig, packagePath, entryPointPath);
  }
  const typings = entryPointPackageJson.typings || entryPointPackageJson.types || guessTypingsFromPackageJson(fs5, entryPointPath, entryPointPackageJson);
  if (typeof typings !== "string") {
    return INCOMPATIBLE_ENTRY_POINT;
  }
  const metadataPath = fs5.resolve(entryPointPath, typings.replace(/\.d\.ts$/, "") + ".metadata.json");
  const compiledByAngular = entryPointConfig !== void 0 || fs5.exists(metadataPath);
  const entryPointInfo = {
    name: entryPointPackageJson.name,
    path: entryPointPath,
    packageName,
    packagePath,
    packageJson: entryPointPackageJson,
    typings: fs5.resolve(entryPointPath, typings),
    compiledByAngular,
    ignoreMissingDependencies: entryPointConfig !== void 0 ? !!entryPointConfig.ignoreMissingDependencies : false,
    generateDeepReexports: entryPointConfig !== void 0 ? !!entryPointConfig.generateDeepReexports : false
  };
  return entryPointInfo;
}
function isEntryPoint(result) {
  return result !== NO_ENTRY_POINT && result !== INCOMPATIBLE_ENTRY_POINT && result !== IGNORED_ENTRY_POINT;
}
function getEntryPointFormat(fs5, entryPoint, property2) {
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
      return sniffModuleFormat(fs5, fs5.join(entryPoint.path, browserFile));
    case "main":
      const mainFile = entryPoint.packageJson["main"];
      if (mainFile === void 0) {
        return void 0;
      }
      return sniffModuleFormat(fs5, fs5.join(entryPoint.path, mainFile));
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
function loadPackageJson(fs5, packageJsonPath) {
  try {
    return JSON.parse(fs5.readFile(packageJsonPath));
  } catch {
    return null;
  }
}
function sniffModuleFormat(fs5, sourceFilePath) {
  const resolvedPath = resolveFileWithPostfixes(fs5, sourceFilePath, ["", ".js", "/index.js"]);
  if (resolvedPath === null) {
    return void 0;
  }
  const sourceFile = ts15.createSourceFile(sourceFilePath, fs5.readFile(resolvedPath), ts15.ScriptTarget.ES5);
  if (sourceFile.statements.length === 0) {
    return void 0;
  }
  if (ts15.isExternalModule(sourceFile)) {
    return "esm5";
  } else if (parseStatementForUmdModule(sourceFile.statements[0]) !== null) {
    return "umd";
  } else {
    return "commonjs";
  }
}
function mergeConfigAndPackageJson(fs5, entryPointPackageJson, entryPointConfig, packagePath, entryPointPath) {
  if (entryPointPackageJson !== null) {
    return __spreadValues(__spreadValues({}, entryPointPackageJson), entryPointConfig.override);
  } else {
    const name = `${fs5.basename(packagePath)}/${fs5.relative(packagePath, entryPointPath)}`;
    return __spreadValues({ name }, entryPointConfig.override);
  }
}
function guessTypingsFromPackageJson(fs5, entryPointPath, entryPointPackageJson) {
  for (const prop of SUPPORTED_FORMAT_PROPERTIES) {
    const field = entryPointPackageJson[prop];
    if (typeof field !== "string") {
      continue;
    }
    const relativeTypingsPath = field.replace(/\.js$/, ".d.ts");
    const typingsPath = fs5.resolve(entryPointPath, relativeTypingsPath);
    if (fs5.exists(typingsPath)) {
      return typingsPath;
    }
  }
  return null;
}
function getPackageNameAndVersion(fs5, packagePath, packagePackageJson, entryPointPackageJson) {
  var _a;
  let packageName;
  if (packagePackageJson !== null) {
    packageName = packagePackageJson.name;
  } else if (entryPointPackageJson !== null) {
    packageName = /^(?:@[^/]+\/)?[^/]*/.exec(entryPointPackageJson.name)[0];
  } else {
    const lastSegment = fs5.basename(packagePath);
    const secondLastSegment = fs5.basename(fs5.dirname(packagePath));
    packageName = secondLastSegment.startsWith("@") ? `${secondLastSegment}/${lastSegment}` : lastSegment;
  }
  return {
    packageName,
    packageVersion: (_a = packagePackageJson == null ? void 0 : packagePackageJson.version) != null ? _a : null
  };
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/dependencies/dependency_resolver.mjs
var builtinNodeJsModules = new Set(module2.builtinModules);
var DependencyResolver = class {
  constructor(fs5, logger, config, hosts, typingsHost) {
    this.fs = fs5;
    this.logger = logger;
    this.config = config;
    this.hosts = hosts;
    this.typingsHost = typingsHost;
  }
  sortEntryPointsByDependency(entryPoints, target) {
    const { invalidEntryPoints, ignoredDependencies, graph } = this.computeDependencyGraph(entryPoints);
    let sortedEntryPointNodes;
    if (target) {
      if (target.compiledByAngular && graph.hasNode(target.path)) {
        sortedEntryPointNodes = graph.dependenciesOf(target.path);
        sortedEntryPointNodes.push(target.path);
      } else {
        sortedEntryPointNodes = [];
      }
    } else {
      sortedEntryPointNodes = graph.overallOrder();
    }
    return {
      entryPoints: sortedEntryPointNodes.map((path7) => graph.getNodeData(path7)),
      graph,
      invalidEntryPoints,
      ignoredDependencies
    };
  }
  getEntryPointWithDependencies(entryPoint) {
    const dependencies = createDependencyInfo();
    if (entryPoint.compiledByAngular) {
      const formatInfo = this.getEntryPointFormatInfo(entryPoint);
      const host = this.hosts[formatInfo.format];
      if (!host) {
        throw new Error(`Could not find a suitable format for computing dependencies of entry-point: '${entryPoint.path}'.`);
      }
      host.collectDependencies(formatInfo.path, dependencies);
      this.typingsHost.collectDependencies(entryPoint.typings, dependencies);
    }
    return { entryPoint, depInfo: dependencies };
  }
  computeDependencyGraph(entryPoints) {
    const invalidEntryPoints = [];
    const ignoredDependencies = [];
    const graph = new DepGraph();
    const angularEntryPoints = entryPoints.filter((e) => e.entryPoint.compiledByAngular);
    angularEntryPoints.forEach((e) => graph.addNode(e.entryPoint.path, e.entryPoint));
    angularEntryPoints.forEach(({ entryPoint, depInfo: { dependencies, missing, deepImports } }) => {
      const missingDependencies = Array.from(missing).filter((dep) => !builtinNodeJsModules.has(dep));
      if (missingDependencies.length > 0 && !entryPoint.ignoreMissingDependencies) {
        removeNodes(entryPoint, missingDependencies);
      } else {
        dependencies.forEach((dependencyPath) => {
          if (!graph.hasNode(entryPoint.path)) {
          } else if (graph.hasNode(dependencyPath)) {
            graph.addDependency(entryPoint.path, dependencyPath);
          } else if (invalidEntryPoints.some((i) => i.entryPoint.path === dependencyPath)) {
            removeNodes(entryPoint, [dependencyPath]);
          } else {
            ignoredDependencies.push({ entryPoint, dependencyPath });
          }
        });
      }
      if (deepImports.size > 0) {
        const notableDeepImports = this.filterIgnorableDeepImports(entryPoint, deepImports);
        if (notableDeepImports.length > 0) {
          const imports = notableDeepImports.map((i) => `'${i}'`).join(", ");
          this.logger.warn(`Entry point '${entryPoint.name}' contains deep imports into ${imports}. This is probably not a problem, but may cause the compilation of entry points to be out of order.`);
        }
      }
    });
    return { invalidEntryPoints, ignoredDependencies, graph };
    function removeNodes(entryPoint, missingDependencies) {
      const nodesToRemove = [entryPoint.path, ...graph.dependantsOf(entryPoint.path)];
      nodesToRemove.forEach((node) => {
        invalidEntryPoints.push({ entryPoint: graph.getNodeData(node), missingDependencies });
        graph.removeNode(node);
      });
    }
  }
  getEntryPointFormatInfo(entryPoint) {
    for (const property2 of SUPPORTED_FORMAT_PROPERTIES) {
      const formatPath = entryPoint.packageJson[property2];
      if (formatPath === void 0)
        continue;
      const format = getEntryPointFormat(this.fs, entryPoint, property2);
      if (format === void 0)
        continue;
      return { format, path: this.fs.resolve(entryPoint.path, formatPath) };
    }
    throw new Error(`There is no appropriate source code format in '${entryPoint.path}' entry-point.`);
  }
  filterIgnorableDeepImports(entryPoint, deepImports) {
    const version = entryPoint.packageJson.version || null;
    const packageConfig = this.config.getPackageConfig(entryPoint.packageName, entryPoint.packagePath, version);
    const matchers = packageConfig.ignorableDeepImportMatchers;
    return Array.from(deepImports).filter((deepImport) => !matchers.some((matcher) => matcher.test(deepImport)));
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/dependencies/esm_dependency_host.mjs
import ts16 from "typescript";
var EsmDependencyHost = class extends DependencyHostBase {
  constructor(fs5, moduleResolver, scanImportExpressions = true) {
    super(fs5, moduleResolver);
    this.scanImportExpressions = scanImportExpressions;
    this.scanner = ts16.createScanner(ts16.ScriptTarget.Latest, true);
  }
  canSkipFile(fileContents) {
    return !hasImportOrReexportStatements(fileContents);
  }
  extractImports(file, fileContents) {
    const imports = new Set();
    const templateStack = [];
    let lastToken = ts16.SyntaxKind.Unknown;
    let currentToken = ts16.SyntaxKind.Unknown;
    const stopAtIndex = findLastPossibleImportOrReexport(fileContents);
    this.scanner.setText(fileContents);
    while ((currentToken = this.scanner.scan()) !== ts16.SyntaxKind.EndOfFileToken) {
      if (this.scanner.getTokenPos() > stopAtIndex) {
        break;
      }
      switch (currentToken) {
        case ts16.SyntaxKind.TemplateHead:
          templateStack.push(currentToken);
          break;
        case ts16.SyntaxKind.OpenBraceToken:
          if (templateStack.length > 0) {
            templateStack.push(currentToken);
          }
          break;
        case ts16.SyntaxKind.CloseBraceToken:
          if (templateStack.length > 0) {
            const templateToken = templateStack[templateStack.length - 1];
            if (templateToken === ts16.SyntaxKind.TemplateHead) {
              currentToken = this.scanner.reScanTemplateToken(false);
              if (currentToken === ts16.SyntaxKind.TemplateTail) {
                templateStack.pop();
              }
            } else {
              templateStack.pop();
            }
          }
          break;
        case ts16.SyntaxKind.SlashToken:
        case ts16.SyntaxKind.SlashEqualsToken:
          if (canPrecedeARegex(lastToken)) {
            currentToken = this.scanner.reScanSlashToken();
          }
          break;
        case ts16.SyntaxKind.ImportKeyword:
          const importPath = this.extractImportPath();
          if (importPath !== null) {
            imports.add(importPath);
          }
          break;
        case ts16.SyntaxKind.ExportKeyword:
          const reexportPath = this.extractReexportPath();
          if (reexportPath !== null) {
            imports.add(reexportPath);
          }
          break;
      }
      lastToken = currentToken;
    }
    this.scanner.setText("");
    return imports;
  }
  extractImportPath() {
    let sideEffectImportPath = this.tryStringLiteral();
    if (sideEffectImportPath !== null) {
      return sideEffectImportPath;
    }
    let kind = this.scanner.getToken();
    if (kind === ts16.SyntaxKind.OpenParenToken) {
      return this.scanImportExpressions ? this.tryStringLiteral() : null;
    }
    if (kind === ts16.SyntaxKind.Identifier) {
      kind = this.scanner.scan();
      if (kind === ts16.SyntaxKind.CommaToken) {
        kind = this.scanner.scan();
      }
    }
    if (kind === ts16.SyntaxKind.AsteriskToken) {
      kind = this.skipNamespacedClause();
      if (kind === null) {
        return null;
      }
    } else if (kind === ts16.SyntaxKind.OpenBraceToken) {
      kind = this.skipNamedClause();
    }
    if (kind !== ts16.SyntaxKind.FromKeyword) {
      return null;
    }
    return this.tryStringLiteral();
  }
  extractReexportPath() {
    let token = this.scanner.scan();
    if (token === ts16.SyntaxKind.AsteriskToken) {
      token = this.skipNamespacedClause();
      if (token === null) {
        return null;
      }
    } else if (token === ts16.SyntaxKind.OpenBraceToken) {
      token = this.skipNamedClause();
    }
    if (token !== ts16.SyntaxKind.FromKeyword) {
      return null;
    }
    return this.tryStringLiteral();
  }
  skipNamespacedClause() {
    let token = this.scanner.scan();
    if (token === ts16.SyntaxKind.AsKeyword) {
      token = this.scanner.scan();
      if (token !== ts16.SyntaxKind.Identifier) {
        return null;
      }
      token = this.scanner.scan();
    }
    return token;
  }
  skipNamedClause() {
    let braceCount = 1;
    let token = this.scanner.scan();
    while (braceCount > 0 && token !== ts16.SyntaxKind.EndOfFileToken) {
      if (token === ts16.SyntaxKind.OpenBraceToken) {
        braceCount++;
      } else if (token === ts16.SyntaxKind.CloseBraceToken) {
        braceCount--;
      }
      token = this.scanner.scan();
    }
    return token;
  }
  tryStringLiteral() {
    return this.scanner.scan() === ts16.SyntaxKind.StringLiteral ? this.scanner.getTokenValue() : null;
  }
};
function hasImportOrReexportStatements(source) {
  return /(?:import|export)[\s\S]+?(["'])(?:\\\1|.)+?\1/.test(source);
}
function findLastPossibleImportOrReexport(source) {
  return Math.max(source.lastIndexOf("import"), source.lastIndexOf(" from "));
}
function canPrecedeARegex(kind) {
  switch (kind) {
    case ts16.SyntaxKind.Identifier:
    case ts16.SyntaxKind.StringLiteral:
    case ts16.SyntaxKind.NumericLiteral:
    case ts16.SyntaxKind.BigIntLiteral:
    case ts16.SyntaxKind.RegularExpressionLiteral:
    case ts16.SyntaxKind.ThisKeyword:
    case ts16.SyntaxKind.PlusPlusToken:
    case ts16.SyntaxKind.MinusMinusToken:
    case ts16.SyntaxKind.CloseParenToken:
    case ts16.SyntaxKind.CloseBracketToken:
    case ts16.SyntaxKind.CloseBraceToken:
    case ts16.SyntaxKind.TrueKeyword:
    case ts16.SyntaxKind.FalseKeyword:
      return false;
    default:
      return true;
  }
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/dependencies/dts_dependency_host.mjs
var DtsDependencyHost = class extends EsmDependencyHost {
  constructor(fs5, pathMappings) {
    super(fs5, new ModuleResolver(fs5, pathMappings, ["", ".d.ts", "/index.d.ts", ".js", "/index.js"]), false);
  }
  processImport(importPath, file, dependencies, missing, deepImports, alreadySeen) {
    return super.processImport(importPath, file, dependencies, missing, deepImports, alreadySeen) || super.processImport(`@types/${importPath}`, file, dependencies, missing, deepImports, alreadySeen);
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/dependencies/umd_dependency_host.mjs
import ts17 from "typescript";
var UmdDependencyHost = class extends DependencyHostBase {
  canSkipFile(fileContents) {
    return !hasRequireCalls(fileContents);
  }
  extractImports(file, fileContents) {
    const sf = ts17.createSourceFile(file, fileContents, ts17.ScriptTarget.ES2015, false, ts17.ScriptKind.JS);
    if (sf.statements.length !== 1) {
      return new Set();
    }
    const umdModule = parseStatementForUmdModule(sf.statements[0]);
    const umdImports = umdModule && getImportsOfUmdModule(umdModule);
    if (umdImports === null) {
      return new Set();
    }
    return new Set(umdImports.map((i) => i.path));
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/entry_point_finder/utils.mjs
function getBasePaths(logger, sourceDirectory, pathMappings) {
  const fs5 = getFileSystem();
  const basePaths = [sourceDirectory];
  if (pathMappings) {
    const baseUrl = fs5.resolve(pathMappings.baseUrl);
    if (fs5.isRoot(baseUrl)) {
      logger.warn(`The provided pathMappings baseUrl is the root path ${baseUrl}.
This is likely to mess up how ngcc finds entry-points and is probably not correct.
Please check your path mappings configuration such as in the tsconfig.json file.`);
    }
    for (const paths of Object.values(pathMappings.paths)) {
      for (const path7 of paths) {
        let foundMatch = false;
        const { prefix, hasWildcard } = extractPathPrefix(path7);
        let basePath = fs5.resolve(baseUrl, prefix);
        if (fs5.exists(basePath) && fs5.stat(basePath).isFile()) {
          basePath = fs5.dirname(basePath);
        }
        if (fs5.exists(basePath)) {
          basePaths.push(basePath);
          foundMatch = true;
        }
        if (hasWildcard) {
          const wildcardContainer = fs5.dirname(basePath);
          const wildcardPrefix = fs5.basename(basePath);
          if (isExistingDirectory(fs5, wildcardContainer)) {
            const candidates = fs5.readdir(wildcardContainer);
            for (const candidate of candidates) {
              if (candidate.startsWith(wildcardPrefix)) {
                const candidatePath = fs5.resolve(wildcardContainer, candidate);
                if (isExistingDirectory(fs5, candidatePath)) {
                  foundMatch = true;
                  basePaths.push(candidatePath);
                }
              }
            }
          }
        }
        if (!foundMatch) {
          logger.debug(`The basePath "${basePath}" computed from baseUrl "${baseUrl}" and path mapping "${path7}" does not exist in the file-system.
It will not be scanned for entry-points.`);
        }
      }
    }
  }
  const dedupedBasePaths = dedupePaths(fs5, basePaths);
  if (fs5.basename(sourceDirectory) === "node_modules" && !dedupedBasePaths.includes(sourceDirectory)) {
    dedupedBasePaths.unshift(sourceDirectory);
  }
  return dedupedBasePaths;
}
function isExistingDirectory(fs5, path7) {
  return fs5.exists(path7) && fs5.stat(path7).isDirectory();
}
function extractPathPrefix(path7) {
  const [prefix, rest] = path7.split("*", 2);
  return { prefix, hasWildcard: rest !== void 0 };
}
function trackDuration(task, log) {
  const startTime2 = Date.now();
  const result = task();
  const duration = Math.round((Date.now() - startTime2) / 100) / 10;
  log(duration);
  return result;
}
function dedupePaths(fs5, paths) {
  const root = { children: new Map() };
  for (const path7 of paths) {
    addPath(fs5, root, path7);
  }
  return flattenTree(root);
}
function addPath(fs5, root, path7) {
  let node = root;
  if (!fs5.isRoot(path7)) {
    const segments = path7.split("/");
    for (let index = 0; index < segments.length; index++) {
      if (isLeaf(node)) {
        return;
      }
      const next = segments[index];
      if (!node.children.has(next)) {
        node.children.set(next, { children: new Map() });
      }
      node = node.children.get(next);
    }
  }
  convertToLeaf(node, path7);
}
function flattenTree(root) {
  const paths = [];
  const nodes = [root];
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];
    if (isLeaf(node)) {
      paths.push(node.path);
    } else {
      node.children.forEach((value) => nodes.push(value));
    }
  }
  return paths;
}
function isLeaf(node) {
  return node.path !== void 0;
}
function convertToLeaf(node, path7) {
  node.path = path7;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/entry_point_finder/directory_walker_entry_point_finder.mjs
var DirectoryWalkerEntryPointFinder = class {
  constructor(logger, resolver, entryPointCollector, entryPointManifest, sourceDirectory, pathMappings) {
    this.logger = logger;
    this.resolver = resolver;
    this.entryPointCollector = entryPointCollector;
    this.entryPointManifest = entryPointManifest;
    this.sourceDirectory = sourceDirectory;
    this.pathMappings = pathMappings;
    this.basePaths = getBasePaths(this.logger, this.sourceDirectory, this.pathMappings);
  }
  findEntryPoints() {
    const unsortedEntryPoints = [];
    for (const basePath of this.basePaths) {
      const entryPoints = this.entryPointManifest.readEntryPointsUsingManifest(basePath) || this.walkBasePathForPackages(basePath);
      entryPoints.forEach((e) => unsortedEntryPoints.push(e));
    }
    return this.resolver.sortEntryPointsByDependency(unsortedEntryPoints);
  }
  walkBasePathForPackages(basePath) {
    this.logger.debug(`No manifest found for ${basePath} so walking the directories for entry-points.`);
    const entryPoints = trackDuration(() => this.entryPointCollector.walkDirectoryForPackages(basePath), (duration) => this.logger.debug(`Walking ${basePath} for entry-points took ${duration}s.`));
    this.entryPointManifest.writeEntryPointManifest(basePath, entryPoints);
    return entryPoints;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/writing/in_place_file_writer.mjs
var NGCC_BACKUP_EXTENSION = ".__ivy_ngcc_bak";
var InPlaceFileWriter = class {
  constructor(fs5, logger, errorOnFailedEntryPoint) {
    this.fs = fs5;
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
  constructor(fs5, logger, errorOnFailedEntryPoint, pkgJsonUpdater) {
    super(fs5, logger, errorOnFailedEntryPoint);
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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/entry_point_finder/entry_point_collector.mjs
var EntryPointCollector = class {
  constructor(fs5, config, logger, resolver) {
    this.fs = fs5;
    this.config = config;
    this.logger = logger;
    this.resolver = resolver;
  }
  walkDirectoryForPackages(sourceDirectory) {
    const primaryEntryPoint = getEntryPointInfo(this.fs, this.config, this.logger, sourceDirectory, sourceDirectory);
    if (primaryEntryPoint === INCOMPATIBLE_ENTRY_POINT) {
      return [];
    }
    const entryPoints = [];
    if (primaryEntryPoint !== NO_ENTRY_POINT) {
      if (primaryEntryPoint !== IGNORED_ENTRY_POINT) {
        entryPoints.push(this.resolver.getEntryPointWithDependencies(primaryEntryPoint));
      }
      this.collectSecondaryEntryPoints(entryPoints, sourceDirectory, sourceDirectory, this.fs.readdir(sourceDirectory));
      if (entryPoints.some((e) => e.entryPoint.compiledByAngular)) {
        const nestedNodeModulesPath = this.fs.join(sourceDirectory, "node_modules");
        if (this.fs.exists(nestedNodeModulesPath)) {
          entryPoints.push(...this.walkDirectoryForPackages(nestedNodeModulesPath));
        }
      }
      return entryPoints;
    }
    for (const path7 of this.fs.readdir(sourceDirectory)) {
      if (isIgnorablePath(path7)) {
        continue;
      }
      const absolutePath = this.fs.resolve(sourceDirectory, path7);
      const stat = this.fs.lstat(absolutePath);
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        continue;
      }
      entryPoints.push(...this.walkDirectoryForPackages(this.fs.join(sourceDirectory, path7)));
    }
    return entryPoints;
  }
  collectSecondaryEntryPoints(entryPoints, packagePath, directory, paths) {
    for (const path7 of paths) {
      if (isIgnorablePath(path7)) {
        continue;
      }
      const absolutePath = this.fs.resolve(directory, path7);
      const stat = this.fs.lstat(absolutePath);
      if (stat.isSymbolicLink()) {
        continue;
      }
      const isDirectory = stat.isDirectory();
      if (!path7.endsWith(".js") && !isDirectory) {
        continue;
      }
      const possibleEntryPointPath = isDirectory ? absolutePath : stripJsExtension(absolutePath);
      const subEntryPoint = getEntryPointInfo(this.fs, this.config, this.logger, packagePath, possibleEntryPointPath);
      if (isEntryPoint(subEntryPoint)) {
        entryPoints.push(this.resolver.getEntryPointWithDependencies(subEntryPoint));
      }
      if (!isDirectory) {
        continue;
      }
      const canContainEntryPoints = subEntryPoint === NO_ENTRY_POINT || subEntryPoint === INCOMPATIBLE_ENTRY_POINT;
      const childPaths = this.fs.readdir(absolutePath);
      if (canContainEntryPoints && childPaths.some((childPath) => childPath.endsWith(".js") && this.fs.stat(this.fs.resolve(absolutePath, childPath)).isFile())) {
        continue;
      }
      this.collectSecondaryEntryPoints(entryPoints, packagePath, absolutePath, childPaths);
    }
  }
};
function stripJsExtension(filePath) {
  return filePath.replace(/\.js$/, "");
}
function isIgnorablePath(path7) {
  return path7.startsWith(".") || path7 === "node_modules" || path7 === NGCC_DIRECTORY;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/path_mappings.mjs
function getPathMappingsFromTsConfig(fs5, tsConfig, projectPath) {
  if (tsConfig !== null && tsConfig.options.baseUrl !== void 0 && tsConfig.options.paths !== void 0) {
    return {
      baseUrl: fs5.resolve(projectPath, tsConfig.options.baseUrl),
      paths: tsConfig.options.paths
    };
  }
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/entry_point_finder/tracing_entry_point_finder.mjs
var TracingEntryPointFinder = class {
  constructor(fs5, config, logger, resolver, basePath, pathMappings) {
    this.fs = fs5;
    this.config = config;
    this.logger = logger;
    this.resolver = resolver;
    this.basePath = basePath;
    this.pathMappings = pathMappings;
    this.basePaths = null;
  }
  findEntryPoints() {
    const unsortedEntryPoints = new Map();
    const unprocessedPaths = this.getInitialEntryPointPaths();
    while (unprocessedPaths.length > 0) {
      const path7 = unprocessedPaths.shift();
      const entryPointWithDeps = this.getEntryPointWithDeps(path7);
      if (entryPointWithDeps === null) {
        continue;
      }
      unsortedEntryPoints.set(entryPointWithDeps.entryPoint.path, entryPointWithDeps);
      entryPointWithDeps.depInfo.dependencies.forEach((dep) => {
        if (!unsortedEntryPoints.has(dep)) {
          unprocessedPaths.push(dep);
        }
      });
    }
    return this.resolver.sortEntryPointsByDependency(Array.from(unsortedEntryPoints.values()));
  }
  getBasePaths() {
    if (this.basePaths === null) {
      this.basePaths = getBasePaths(this.logger, this.basePath, this.pathMappings);
    }
    return this.basePaths;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/entry_point_finder/program_based_entry_point_finder.mjs
var ProgramBasedEntryPointFinder = class extends TracingEntryPointFinder {
  constructor(fs5, config, logger, resolver, entryPointCollector, entryPointManifest, basePath, tsConfig, projectPath) {
    super(fs5, config, logger, resolver, basePath, getPathMappingsFromTsConfig(fs5, tsConfig, projectPath));
    this.entryPointCollector = entryPointCollector;
    this.entryPointManifest = entryPointManifest;
    this.tsConfig = tsConfig;
    this.entryPointsWithDependencies = null;
  }
  getInitialEntryPointPaths() {
    const moduleResolver = new ModuleResolver(this.fs, this.pathMappings, ["", ".ts", "/index.ts"]);
    const host = new EsmDependencyHost(this.fs, moduleResolver);
    const dependencies = createDependencyInfo();
    const rootFiles = this.tsConfig.rootNames.map((rootName) => this.fs.resolve(rootName));
    this.logger.debug(`Using the program from ${this.tsConfig.project} to seed the entry-point finding.`);
    this.logger.debug(`Collecting dependencies from the following files:` + rootFiles.map((file) => `
- ${file}`));
    host.collectDependenciesInFiles(rootFiles, dependencies);
    return Array.from(dependencies.dependencies);
  }
  getEntryPointWithDeps(entryPointPath) {
    const entryPoints = this.findOrLoadEntryPoints();
    if (!entryPoints.has(entryPointPath)) {
      return null;
    }
    const entryPointWithDeps = entryPoints.get(entryPointPath);
    if (!entryPointWithDeps.entryPoint.compiledByAngular) {
      return null;
    }
    return entryPointWithDeps;
  }
  findOrLoadEntryPoints() {
    if (this.entryPointsWithDependencies === null) {
      const entryPointsWithDependencies = this.entryPointsWithDependencies = new Map();
      for (const basePath of this.getBasePaths()) {
        const entryPoints = this.entryPointManifest.readEntryPointsUsingManifest(basePath) || this.walkBasePathForPackages(basePath);
        for (const e of entryPoints) {
          entryPointsWithDependencies.set(e.entryPoint.path, e);
        }
      }
    }
    return this.entryPointsWithDependencies;
  }
  walkBasePathForPackages(basePath) {
    this.logger.debug(`No manifest found for ${basePath} so walking the directories for entry-points.`);
    const entryPoints = trackDuration(() => this.entryPointCollector.walkDirectoryForPackages(basePath), (duration) => this.logger.debug(`Walking ${basePath} for entry-points took ${duration}s.`));
    this.entryPointManifest.writeEntryPointManifest(basePath, entryPoints);
    return entryPoints;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/packages/build_marker.mjs
var NGCC_VERSION = "13.0.0-next.14+49.sha-ae44c85.with-local-changes";
function needsCleaning(packageJson) {
  return Object.values(packageJson.__processed_by_ivy_ngcc__ || {}).some((value) => value !== NGCC_VERSION);
}
function cleanPackageJson(packageJson) {
  if (packageJson.__processed_by_ivy_ngcc__ !== void 0) {
    delete packageJson.__processed_by_ivy_ngcc__;
    for (const prop of Object.keys(packageJson)) {
      if (prop.endsWith(NGCC_PROPERTY_EXTENSION)) {
        delete packageJson[prop];
      }
    }
    const scripts = packageJson.scripts;
    if (scripts !== void 0 && scripts.prepublishOnly) {
      delete scripts.prepublishOnly;
      if (scripts.prepublishOnly__ivy_ngcc_bak !== void 0) {
        scripts.prepublishOnly = scripts.prepublishOnly__ivy_ngcc_bak;
        delete scripts.prepublishOnly__ivy_ngcc_bak;
      }
    }
    return true;
  }
  return false;
}
function hasBeenProcessed(packageJson, format) {
  return packageJson.__processed_by_ivy_ngcc__ !== void 0 && packageJson.__processed_by_ivy_ngcc__[format] === NGCC_VERSION;
}
function markAsProcessed(pkgJsonUpdater, packageJson, packageJsonPath, formatProperties) {
  const update = pkgJsonUpdater.createUpdate();
  for (const prop of formatProperties) {
    update.addChange(["__processed_by_ivy_ngcc__", prop], NGCC_VERSION, "alphabetic");
  }
  const oldPrepublishOnly = packageJson.scripts && packageJson.scripts.prepublishOnly;
  const newPrepublishOnly = `node --eval "console.error('ERROR: Trying to publish a package that has been compiled by NGCC. This is not allowed.\\nPlease delete and rebuild the package, without compiling with NGCC, before attempting to publish.\\nNote that NGCC may have been run by importing this package into another project that is being built with Ivy enabled.\\n')" && exit 1`;
  if (oldPrepublishOnly && oldPrepublishOnly !== newPrepublishOnly) {
    update.addChange(["scripts", "prepublishOnly__ivy_ngcc_bak"], oldPrepublishOnly);
  }
  update.addChange(["scripts", "prepublishOnly"], newPrepublishOnly);
  update.writeChanges(packageJsonPath, packageJson);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/entry_point_finder/targeted_entry_point_finder.mjs
var TargetedEntryPointFinder = class extends TracingEntryPointFinder {
  constructor(fs5, config, logger, resolver, basePath, pathMappings, targetPath) {
    super(fs5, config, logger, resolver, basePath, pathMappings);
    this.targetPath = targetPath;
  }
  findEntryPoints() {
    const entryPoints = super.findEntryPoints();
    const invalidTarget = entryPoints.invalidEntryPoints.find((i) => i.entryPoint.path === this.targetPath);
    if (invalidTarget !== void 0) {
      throw new Error(`The target entry-point "${invalidTarget.entryPoint.name}" has missing dependencies:
` + invalidTarget.missingDependencies.map((dep) => ` - ${dep}
`).join(""));
    }
    return entryPoints;
  }
  targetNeedsProcessingOrCleaning(propertiesToConsider, compileAllFormats) {
    const entryPointWithDeps = this.getEntryPointWithDeps(this.targetPath);
    if (entryPointWithDeps === null) {
      return false;
    }
    for (const property2 of propertiesToConsider) {
      if (entryPointWithDeps.entryPoint.packageJson[property2]) {
        if (!hasBeenProcessed(entryPointWithDeps.entryPoint.packageJson, property2)) {
          return true;
        }
        if (!compileAllFormats) {
          return false;
        }
      }
    }
    return false;
  }
  getInitialEntryPointPaths() {
    return [this.targetPath];
  }
  getEntryPointWithDeps(entryPointPath) {
    const packagePath = this.computePackagePath(entryPointPath);
    const entryPoint = getEntryPointInfo(this.fs, this.config, this.logger, packagePath, entryPointPath);
    if (!isEntryPoint(entryPoint) || !entryPoint.compiledByAngular) {
      return null;
    }
    return this.resolver.getEntryPointWithDependencies(entryPoint);
  }
  computePackagePath(entryPointPath) {
    if (this.isPathContainedBy(this.basePath, entryPointPath)) {
      const packagePath = this.computePackagePathFromContainingPath(entryPointPath, this.basePath);
      if (packagePath !== null) {
        return packagePath;
      }
    }
    for (const basePath of this.getBasePaths()) {
      if (this.isPathContainedBy(basePath, entryPointPath)) {
        const packagePath = this.computePackagePathFromContainingPath(entryPointPath, basePath);
        if (packagePath !== null) {
          return packagePath;
        }
        break;
      }
    }
    return this.computePackagePathFromNearestNodeModules(entryPointPath);
  }
  isPathContainedBy(base, test) {
    return test === base || test.startsWith(base) && !this.fs.relative(base, test).startsWith("..");
  }
  computePackagePathFromContainingPath(entryPointPath, containingPath) {
    let packagePath = containingPath;
    const segments = this.splitPath(this.fs.relative(containingPath, entryPointPath));
    let nodeModulesIndex = segments.lastIndexOf("node_modules");
    if (nodeModulesIndex === -1) {
      if (this.fs.exists(this.fs.join(packagePath, "package.json"))) {
        return packagePath;
      }
    }
    while (nodeModulesIndex >= 0) {
      packagePath = this.fs.join(packagePath, segments.shift());
      nodeModulesIndex--;
    }
    for (const segment of segments) {
      packagePath = this.fs.join(packagePath, segment);
      if (this.fs.exists(this.fs.join(packagePath, "package.json"))) {
        return packagePath;
      }
    }
    return null;
  }
  computePackagePathFromNearestNodeModules(entryPointPath) {
    let packagePath = entryPointPath;
    let scopedPackagePath = packagePath;
    let containerPath = this.fs.dirname(packagePath);
    while (!this.fs.isRoot(containerPath) && !containerPath.endsWith("node_modules")) {
      scopedPackagePath = packagePath;
      packagePath = containerPath;
      containerPath = this.fs.dirname(containerPath);
    }
    if (this.fs.exists(this.fs.join(packagePath, "package.json"))) {
      return packagePath;
    } else if (this.fs.basename(packagePath).startsWith("@") && this.fs.exists(this.fs.join(scopedPackagePath, "package.json"))) {
      return scopedPackagePath;
    } else {
      return entryPointPath;
    }
  }
  splitPath(path7) {
    const segments = [];
    let container = this.fs.dirname(path7);
    while (path7 !== container) {
      segments.unshift(this.fs.basename(path7));
      path7 = container;
      container = this.fs.dirname(container);
    }
    return segments;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/execution/tasks/api.mjs
var DtsProcessing;
(function(DtsProcessing2) {
  DtsProcessing2[DtsProcessing2["Yes"] = 0] = "Yes";
  DtsProcessing2[DtsProcessing2["No"] = 1] = "No";
  DtsProcessing2[DtsProcessing2["Only"] = 2] = "Only";
})(DtsProcessing || (DtsProcessing = {}));
var TaskDependencies = Map;

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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/execution/tasks/queues/base_task_queue.mjs
var BaseTaskQueue = class {
  constructor(logger, tasks, dependencies) {
    this.logger = logger;
    this.tasks = tasks;
    this.dependencies = dependencies;
    this.inProgressTasks = new Set();
    this.tasksToSkip = new Map();
  }
  get allTasksCompleted() {
    return this.tasks.length === 0 && this.inProgressTasks.size === 0;
  }
  getNextTask() {
    let nextTask = this.computeNextTask();
    while (nextTask !== null) {
      if (!this.tasksToSkip.has(nextTask)) {
        break;
      }
      this.markAsCompleted(nextTask);
      const failedTask = this.tasksToSkip.get(nextTask);
      this.logger.warn(`Skipping processing of ${nextTask.entryPoint.name} because its dependency ${failedTask.entryPoint.name} failed to compile.`);
      nextTask = this.computeNextTask();
    }
    return nextTask;
  }
  markAsCompleted(task) {
    if (!this.inProgressTasks.has(task)) {
      throw new Error(`Trying to mark task that was not in progress as completed: ${stringifyTask(task)}`);
    }
    this.inProgressTasks.delete(task);
  }
  markAsFailed(task) {
    if (this.dependencies.has(task)) {
      for (const dependentTask of this.dependencies.get(task)) {
        this.skipDependentTasks(dependentTask, task);
      }
    }
  }
  markAsUnprocessed(task) {
    if (!this.inProgressTasks.has(task)) {
      throw new Error(`Trying to mark task that was not in progress as unprocessed: ${stringifyTask(task)}`);
    }
    this.inProgressTasks.delete(task);
    this.tasks.unshift(task);
  }
  toString() {
    const inProgTasks = Array.from(this.inProgressTasks);
    return `${this.constructor.name}
  All tasks completed: ${this.allTasksCompleted}
  Unprocessed tasks (${this.tasks.length}): ${this.stringifyTasks(this.tasks, "    ")}
  In-progress tasks (${inProgTasks.length}): ${this.stringifyTasks(inProgTasks, "    ")}`;
  }
  skipDependentTasks(task, failedTask) {
    this.tasksToSkip.set(task, failedTask);
    if (this.dependencies.has(task)) {
      for (const dependentTask of this.dependencies.get(task)) {
        this.skipDependentTasks(dependentTask, failedTask);
      }
    }
  }
  stringifyTasks(tasks, indentation) {
    return tasks.map((task) => `
${indentation}- ${stringifyTask(task)}`).join("");
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/execution/tasks/queues/parallel_task_queue.mjs
var ParallelTaskQueue = class extends BaseTaskQueue {
  constructor(logger, tasks, dependencies) {
    super(logger, sortTasksByPriority(tasks, dependencies), dependencies);
    this.blockedTasks = getBlockedTasks(dependencies);
  }
  computeNextTask() {
    const nextTaskIdx = this.tasks.findIndex((task) => !this.blockedTasks.has(task));
    if (nextTaskIdx === -1)
      return null;
    const nextTask = this.tasks[nextTaskIdx];
    this.tasks.splice(nextTaskIdx, 1);
    this.inProgressTasks.add(nextTask);
    return nextTask;
  }
  markAsCompleted(task) {
    super.markAsCompleted(task);
    if (!this.dependencies.has(task)) {
      return;
    }
    for (const dependentTask of this.dependencies.get(task)) {
      if (this.blockedTasks.has(dependentTask)) {
        const blockingTasks = this.blockedTasks.get(dependentTask);
        blockingTasks.delete(task);
        if (blockingTasks.size === 0) {
          this.blockedTasks.delete(dependentTask);
        }
      }
    }
  }
  toString() {
    return `${super.toString()}
  Blocked tasks (${this.blockedTasks.size}): ${this.stringifyBlockedTasks("    ")}`;
  }
  stringifyBlockedTasks(indentation) {
    return Array.from(this.blockedTasks).map(([task, blockingTasks]) => `
${indentation}- ${stringifyTask(task)} (${blockingTasks.size}): ` + this.stringifyTasks(Array.from(blockingTasks), `${indentation}    `)).join("");
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/execution/tasks/queues/serial_task_queue.mjs
var SerialTaskQueue = class extends BaseTaskQueue {
  computeNextTask() {
    const nextTask = this.tasks.shift() || null;
    if (nextTask) {
      if (this.inProgressTasks.size > 0) {
        const inProgressTask = this.inProgressTasks.values().next().value;
        throw new Error("Trying to get next task, while there is already a task in progress: " + stringifyTask(inProgressTask));
      }
      this.inProgressTasks.add(nextTask);
    }
    return nextTask;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/writing/cleaning/utils.mjs
function isLocalDirectory(fs5, path7) {
  if (fs5.exists(path7)) {
    const stat = fs5.lstat(path7);
    return stat.isDirectory();
  } else {
    return false;
  }
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/writing/cleaning/cleaning_strategies.mjs
var PackageJsonCleaner = class {
  constructor(fs5) {
    this.fs = fs5;
  }
  canClean(_path, basename6) {
    return basename6 === "package.json";
  }
  clean(path7, _basename) {
    const packageJson = JSON.parse(this.fs.readFile(path7));
    if (cleanPackageJson(packageJson)) {
      this.fs.writeFile(path7, `${JSON.stringify(packageJson, null, 2)}
`);
    }
  }
};
var NgccDirectoryCleaner = class {
  constructor(fs5) {
    this.fs = fs5;
  }
  canClean(path7, basename6) {
    return basename6 === NGCC_DIRECTORY && isLocalDirectory(this.fs, path7);
  }
  clean(path7, _basename) {
    this.fs.removeDeep(path7);
  }
};
var BackupFileCleaner = class {
  constructor(fs5) {
    this.fs = fs5;
  }
  canClean(path7, basename6) {
    return this.fs.extname(basename6) === NGCC_BACKUP_EXTENSION && this.fs.exists(absoluteFrom(path7.replace(NGCC_BACKUP_EXTENSION, "")));
  }
  clean(path7, _basename) {
    this.fs.moveFile(path7, absoluteFrom(path7.replace(NGCC_BACKUP_EXTENSION, "")));
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/writing/cleaning/package_cleaner.mjs
var PackageCleaner = class {
  constructor(fs5, cleaners) {
    this.fs = fs5;
    this.cleaners = cleaners;
  }
  clean(directory) {
    const basenames = this.fs.readdir(directory);
    for (const basename6 of basenames) {
      if (basename6 === "node_modules") {
        continue;
      }
      const path7 = this.fs.resolve(directory, basename6);
      for (const cleaner of this.cleaners) {
        if (cleaner.canClean(path7, basename6)) {
          cleaner.clean(path7, basename6);
          break;
        }
      }
      if (isLocalDirectory(this.fs, path7)) {
        this.clean(path7);
      }
    }
  }
};
function cleanOutdatedPackages(fileSystem, entryPoints) {
  const packagesToClean = new Set();
  for (const entryPoint of entryPoints) {
    if (needsCleaning(entryPoint.packageJson)) {
      packagesToClean.add(entryPoint.packagePath);
    }
  }
  const cleaner = new PackageCleaner(fileSystem, [
    new PackageJsonCleaner(fileSystem),
    new NgccDirectoryCleaner(fileSystem),
    new BackupFileCleaner(fileSystem)
  ]);
  for (const packagePath of packagesToClean) {
    cleaner.clean(packagePath);
  }
  return packagesToClean.size > 0;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/execution/analyze_entry_points.mjs
function getAnalyzeEntryPointsFn(logger, finder, fileSystem, supportedPropertiesToConsider, typingsOnly, compileAllFormats, propertiesToConsider, inParallel) {
  return () => {
    logger.debug("Analyzing entry-points...");
    const startTime2 = Date.now();
    let entryPointInfo = finder.findEntryPoints();
    const cleaned = cleanOutdatedPackages(fileSystem, entryPointInfo.entryPoints);
    if (cleaned) {
      entryPointInfo = finder.findEntryPoints();
    }
    const { entryPoints, invalidEntryPoints, graph } = entryPointInfo;
    logInvalidEntryPoints(logger, invalidEntryPoints);
    const unprocessableEntryPointPaths = [];
    const tasks = [];
    for (const entryPoint of entryPoints) {
      const packageJson = entryPoint.packageJson;
      const { propertiesToProcess, equivalentPropertiesMap } = getPropertiesToProcess(packageJson, supportedPropertiesToConsider, compileAllFormats, typingsOnly);
      if (propertiesToProcess.length === 0) {
        unprocessableEntryPointPaths.push(entryPoint.path);
        continue;
      }
      const hasProcessedTypings = hasBeenProcessed(packageJson, "typings");
      if (hasProcessedTypings && typingsOnly) {
        logger.debug(`Skipping ${entryPoint.name} : typings have already been processed.`);
        continue;
      }
      let processDts = hasProcessedTypings ? DtsProcessing.No : typingsOnly ? DtsProcessing.Only : DtsProcessing.Yes;
      for (const formatProperty of propertiesToProcess) {
        if (hasBeenProcessed(entryPoint.packageJson, formatProperty)) {
          logger.debug(`Skipping ${entryPoint.name} : ${formatProperty} (already compiled).`);
          continue;
        }
        const formatPropertiesToMarkAsProcessed = equivalentPropertiesMap.get(formatProperty);
        tasks.push({ entryPoint, formatProperty, formatPropertiesToMarkAsProcessed, processDts });
        processDts = DtsProcessing.No;
      }
    }
    if (unprocessableEntryPointPaths.length > 0) {
      throw new Error(`Unable to process any formats for the following entry-points (tried ${propertiesToConsider.join(", ")}): ` + unprocessableEntryPointPaths.map((path7) => `
  - ${path7}`).join(""));
    }
    const duration = Math.round((Date.now() - startTime2) / 100) / 10;
    logger.debug(`Analyzed ${entryPoints.length} entry-points in ${duration}s. (Total tasks: ${tasks.length})`);
    return getTaskQueue(logger, inParallel, tasks, graph);
  };
}
function logInvalidEntryPoints(logger, invalidEntryPoints) {
  invalidEntryPoints.forEach((invalidEntryPoint) => {
    logger.debug(`Invalid entry-point ${invalidEntryPoint.entryPoint.path}.`, `It is missing required dependencies:
` + invalidEntryPoint.missingDependencies.map((dep) => ` - ${dep}`).join("\n"));
  });
}
function getPropertiesToProcess(packageJson, propertiesToConsider, compileAllFormats, typingsOnly) {
  const formatPathsToConsider = new Set();
  const propertiesToProcess = [];
  for (const prop of propertiesToConsider) {
    const formatPath = packageJson[prop];
    if (typeof formatPath !== "string")
      continue;
    if (formatPathsToConsider.has(formatPath))
      continue;
    formatPathsToConsider.add(formatPath);
    propertiesToProcess.push(prop);
    if (!compileAllFormats)
      break;
  }
  const formatPathToProperties = {};
  for (const prop of SUPPORTED_FORMAT_PROPERTIES) {
    const formatPath = packageJson[prop];
    if (typeof formatPath !== "string")
      continue;
    if (!formatPathsToConsider.has(formatPath))
      continue;
    const list = formatPathToProperties[formatPath] || (formatPathToProperties[formatPath] = []);
    list.push(prop);
  }
  const equivalentPropertiesMap = new Map();
  for (const prop of propertiesToConsider) {
    const formatPath = packageJson[prop];
    const equivalentProperties = typingsOnly ? [] : formatPathToProperties[formatPath];
    equivalentPropertiesMap.set(prop, equivalentProperties);
  }
  return { propertiesToProcess, equivalentPropertiesMap };
}
function getTaskQueue(logger, inParallel, tasks, graph) {
  const dependencies = computeTaskDependencies(tasks, graph);
  return inParallel ? new ParallelTaskQueue(logger, tasks, dependencies) : new SerialTaskQueue(logger, tasks, dependencies);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/execution/cluster/master.mjs
import cluster2 from "cluster";
import module3 from "module";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/execution/cluster/utils.mjs
import cluster from "cluster";
var Deferred = class {
  constructor() {
    this.promise = new Promise((resolve5, reject) => {
      this.resolve = resolve5;
      this.reject = reject;
    });
  }
};
var sendMessageToWorker = (workerId, msg) => {
  if (!cluster.isMaster) {
    throw new Error("Unable to send message to worker process: Sender is not the master process.");
  }
  const worker = cluster.workers[workerId];
  if (worker === void 0 || worker.isDead() || !worker.isConnected()) {
    throw new Error("Unable to send message to worker process: Recipient does not exist or has disconnected.");
  }
  return new Promise((resolve5, reject) => {
    worker.send(msg, (err) => err === null ? resolve5() : reject(err));
  });
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/execution/cluster/master.mjs
var ClusterMaster = class {
  constructor(maxWorkerCount, fileSystem, logger, fileWriter, pkgJsonUpdater, analyzeEntryPoints, createTaskCompletedCallback) {
    this.maxWorkerCount = maxWorkerCount;
    this.fileSystem = fileSystem;
    this.logger = logger;
    this.fileWriter = fileWriter;
    this.pkgJsonUpdater = pkgJsonUpdater;
    this.finishedDeferred = new Deferred();
    this.processingStartTime = -1;
    this.taskAssignments = new Map();
    this.remainingRespawnAttempts = 3;
    if (!cluster2.isMaster) {
      throw new Error("Tried to instantiate `ClusterMaster` on a worker process.");
    }
    cluster2.setupMaster({ exec: getClusterWorkerScriptPath(fileSystem) });
    this.taskQueue = analyzeEntryPoints();
    this.onTaskCompleted = createTaskCompletedCallback(this.taskQueue);
  }
  run() {
    if (this.taskQueue.allTasksCompleted) {
      return Promise.resolve();
    }
    cluster2.on("message", this.wrapEventHandler((worker, msg) => this.onWorkerMessage(worker.id, msg)));
    cluster2.on("exit", this.wrapEventHandler((worker, code, signal) => this.onWorkerExit(worker, code, signal)));
    cluster2.fork();
    return this.finishedDeferred.promise.then(() => this.stopWorkers(), (err) => {
      this.stopWorkers();
      return Promise.reject(err);
    });
  }
  maybeDistributeWork() {
    let isWorkerAvailable = false;
    if (this.taskQueue.allTasksCompleted) {
      const duration = Math.round((Date.now() - this.processingStartTime) / 100) / 10;
      this.logger.debug(`Processed tasks in ${duration}s.`);
      return this.finishedDeferred.resolve();
    }
    for (const [workerId, assignedTask] of Array.from(this.taskAssignments)) {
      if (assignedTask !== null) {
        continue;
      } else {
        isWorkerAvailable = true;
      }
      const task = this.taskQueue.getNextTask();
      if (task === null) {
        break;
      }
      this.taskAssignments.set(workerId, { task });
      sendMessageToWorker(workerId, { type: "process-task", task });
      isWorkerAvailable = false;
    }
    if (!isWorkerAvailable) {
      const spawnedWorkerCount = Object.keys(cluster2.workers).length;
      if (spawnedWorkerCount < this.maxWorkerCount) {
        this.logger.debug("Spawning another worker process as there is more work to be done.");
        cluster2.fork();
      } else {
        this.logger.debug(`All ${spawnedWorkerCount} workers are currently busy and cannot take on more work.`);
      }
    } else {
      const busyWorkers = Array.from(this.taskAssignments).filter(([_workerId, task]) => task !== null).map(([workerId]) => workerId);
      const totalWorkerCount = this.taskAssignments.size;
      const idleWorkerCount = totalWorkerCount - busyWorkers.length;
      this.logger.debug(`No assignments for ${idleWorkerCount} idle (out of ${totalWorkerCount} total) workers. Busy workers: ${busyWorkers.join(", ")}`);
      if (busyWorkers.length === 0) {
        throw new Error(`There are still unprocessed tasks in the queue and no tasks are currently in progress, yet the queue did not return any available tasks: ${this.taskQueue}`);
      }
    }
  }
  onWorkerExit(worker, code, signal) {
    if (worker.exitedAfterDisconnect)
      return;
    const assignment = this.taskAssignments.get(worker.id);
    this.taskAssignments.delete(worker.id);
    this.logger.warn(`Worker #${worker.id} exited unexpectedly (code: ${code} | signal: ${signal}).
  Current task: ${assignment == null ? "-" : stringifyTask(assignment.task)}
  Current phase: ${assignment == null ? "-" : assignment.files == null ? "compiling" : "writing files"}`);
    if (assignment == null) {
      this.logger.debug(`Spawning another worker process to replace #${worker.id}...`);
      cluster2.fork();
    } else {
      const { task, files } = assignment;
      if (files != null) {
        this.logger.debug(`Reverting ${files.length} transformed files...`);
        this.fileWriter.revertBundle(task.entryPoint, files, task.formatPropertiesToMarkAsProcessed);
      }
      this.taskQueue.markAsUnprocessed(task);
      const spawnedWorkerCount = Object.keys(cluster2.workers).length;
      if (spawnedWorkerCount > 0) {
        this.logger.debug(`Not spawning another worker process to replace #${worker.id}. Continuing with ${spawnedWorkerCount} workers...`);
        this.maybeDistributeWork();
      } else if (this.remainingRespawnAttempts > 0) {
        this.logger.debug(`Spawning another worker process to replace #${worker.id}...`);
        this.remainingRespawnAttempts--;
        cluster2.fork();
      } else {
        throw new Error("All worker processes crashed and attempts to re-spawn them failed. Please check your system and ensure there is enough memory available.");
      }
    }
  }
  onWorkerMessage(workerId, msg) {
    if (msg.type === "ready") {
      this.onWorkerReady(workerId);
      return;
    }
    if (!this.taskAssignments.has(workerId)) {
      const knownWorkers = Array.from(this.taskAssignments.keys());
      throw new Error(`Received message from unknown worker #${workerId} (known workers: ${knownWorkers.join(", ")}): ${JSON.stringify(msg)}`);
    }
    switch (msg.type) {
      case "error":
        throw new Error(`Error on worker #${workerId}: ${msg.error}`);
      case "task-completed":
        return this.onWorkerTaskCompleted(workerId, msg);
      case "transformed-files":
        return this.onWorkerTransformedFiles(workerId, msg);
      case "update-package-json":
        return this.onWorkerUpdatePackageJson(workerId, msg);
      default:
        throw new Error(`Invalid message received from worker #${workerId}: ${JSON.stringify(msg)}`);
    }
  }
  onWorkerReady(workerId) {
    if (this.taskAssignments.has(workerId)) {
      throw new Error(`Invariant violated: Worker #${workerId} came online more than once.`);
    }
    if (this.processingStartTime === -1) {
      this.logger.debug("Processing tasks...");
      this.processingStartTime = Date.now();
    }
    this.taskAssignments.set(workerId, null);
    this.maybeDistributeWork();
  }
  onWorkerTaskCompleted(workerId, msg) {
    const assignment = this.taskAssignments.get(workerId) || null;
    if (assignment === null) {
      throw new Error(`Expected worker #${workerId} to have a task assigned, while handling message: ` + JSON.stringify(msg));
    }
    this.onTaskCompleted(assignment.task, msg.outcome, msg.message);
    this.taskQueue.markAsCompleted(assignment.task);
    this.taskAssignments.set(workerId, null);
    this.maybeDistributeWork();
  }
  onWorkerTransformedFiles(workerId, msg) {
    const assignment = this.taskAssignments.get(workerId) || null;
    if (assignment === null) {
      throw new Error(`Expected worker #${workerId} to have a task assigned, while handling message: ` + JSON.stringify(msg));
    }
    const oldFiles = assignment.files;
    const newFiles = msg.files;
    if (oldFiles !== void 0) {
      throw new Error(`Worker #${workerId} reported transformed files more than once.
  Old files (${oldFiles.length}): [${oldFiles.join(", ")}]
  New files (${newFiles.length}): [${newFiles.join(", ")}]
`);
    }
    assignment.files = newFiles;
  }
  onWorkerUpdatePackageJson(workerId, msg) {
    const assignment = this.taskAssignments.get(workerId) || null;
    if (assignment === null) {
      throw new Error(`Expected worker #${workerId} to have a task assigned, while handling message: ` + JSON.stringify(msg));
    }
    const entryPoint = assignment.task.entryPoint;
    const expectedPackageJsonPath = this.fileSystem.resolve(entryPoint.path, "package.json");
    if (expectedPackageJsonPath !== msg.packageJsonPath) {
      throw new Error(`Received '${msg.type}' message from worker #${workerId} for '${msg.packageJsonPath}', but was expecting '${expectedPackageJsonPath}' (based on task assignment).`);
    }
    this.pkgJsonUpdater.writeChanges(msg.changes, msg.packageJsonPath, entryPoint.packageJson);
  }
  stopWorkers() {
    const workers = Object.values(cluster2.workers);
    this.logger.debug(`Stopping ${workers.length} workers...`);
    cluster2.removeAllListeners();
    workers.forEach((worker) => worker.kill());
  }
  wrapEventHandler(fn) {
    return async (...args) => {
      try {
        await fn(...args);
      } catch (err) {
        this.finishedDeferred.reject(err);
      }
    };
  }
};
function getClusterWorkerScriptPath(fileSystem) {
  const requireFn = typeof __require !== "undefined" ? __require : module3.createRequire(__ESM_IMPORT_META_URL__);
  const workerScriptPath = requireFn.resolve("@angular/compiler-cli/ngcc/src/execution/cluster/ngcc_cluster_worker");
  return fileSystem.resolve(workerScriptPath);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/execution/cluster/executor.mjs
var ClusterExecutor = class {
  constructor(workerCount, fileSystem, logger, fileWriter, pkgJsonUpdater, lockFile, createTaskCompletedCallback) {
    this.workerCount = workerCount;
    this.fileSystem = fileSystem;
    this.logger = logger;
    this.fileWriter = fileWriter;
    this.pkgJsonUpdater = pkgJsonUpdater;
    this.lockFile = lockFile;
    this.createTaskCompletedCallback = createTaskCompletedCallback;
  }
  async execute(analyzeEntryPoints, _createCompileFn) {
    return this.lockFile.lock(async () => {
      this.logger.debug(`Running ngcc on ${this.constructor.name} (using ${this.workerCount} worker processes).`);
      const master = new ClusterMaster(this.workerCount, this.fileSystem, this.logger, this.fileWriter, this.pkgJsonUpdater, analyzeEntryPoints, this.createTaskCompletedCallback);
      return await master.run();
    });
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/execution/create_compile_function.mjs
import ts62 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/diagnostics/src/error.mjs
import ts18 from "typescript";

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
var COMPILER_ERRORS_WITH_GUIDES = new Set([
  ErrorCode.DECORATOR_ARG_NOT_LITERAL,
  ErrorCode.IMPORT_CYCLE_DETECTED,
  ErrorCode.PARAM_MISSING_TOKEN,
  ErrorCode.SCHEMA_INVALID_ELEMENT,
  ErrorCode.SCHEMA_INVALID_ATTRIBUTE,
  ErrorCode.MISSING_REFERENCE_TARGET,
  ErrorCode.COMPONENT_INVALID_SHADOW_DOM_SELECTOR
]);
function ngErrorCode(code) {
  return parseInt("-99" + code);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/diagnostics/src/error.mjs
var FatalDiagnosticError = class {
  constructor(code, node, message, relatedInformation) {
    this.code = code;
    this.node = node;
    this.message = message;
    this.relatedInformation = relatedInformation;
    this._isFatalDiagnosticError = true;
  }
  toDiagnostic() {
    return makeDiagnostic(this.code, this.node, this.message, this.relatedInformation);
  }
};
function makeDiagnostic(code, node, messageText, relatedInformation) {
  node = ts18.getOriginalNode(node);
  return {
    category: ts18.DiagnosticCategory.Error,
    code: ngErrorCode(code),
    file: ts18.getOriginalNode(node).getSourceFile(),
    start: node.getStart(void 0, false),
    length: node.getWidth(),
    messageText,
    relatedInformation
  };
}
function makeRelatedInformation(node, messageText) {
  node = ts18.getOriginalNode(node);
  return {
    category: ts18.DiagnosticCategory.Message,
    code: 0,
    file: node.getSourceFile(),
    start: node.getStart(),
    length: node.getWidth(),
    messageText
  };
}
function isFatalDiagnosticError(err) {
  return err._isFatalDiagnosticError === true;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/diagnostics/src/util.mjs
var ERROR_CODE_MATCHER = /(\u001b\[\d+m ?)TS-99(\d+: ?\u001b\[\d+m)/g;
function replaceTsWithNgInErrors(errors) {
  return errors.replace(ERROR_CODE_MATCHER, "$1NG$2");
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/packages/bundle_program.mjs
import ts20 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/packages/patch_ts_expando_initializer.mjs
import ts19 from "typescript";
function patchTsGetExpandoInitializer() {
  if (isTs31778GetExpandoInitializerFixed()) {
    return null;
  }
  const originalGetExpandoInitializer = ts19.getExpandoInitializer;
  if (originalGetExpandoInitializer === void 0) {
    throw makeUnsupportedTypeScriptError();
  }
  ts19.getExpandoInitializer = (initializer, isPrototypeAssignment) => {
    if (ts19.isParenthesizedExpression(initializer) && ts19.isCallExpression(initializer.expression)) {
      initializer = initializer.expression;
    }
    return originalGetExpandoInitializer(initializer, isPrototypeAssignment);
  };
  return originalGetExpandoInitializer;
}
function restoreGetExpandoInitializer(originalGetExpandoInitializer) {
  if (originalGetExpandoInitializer !== null) {
    ts19.getExpandoInitializer = originalGetExpandoInitializer;
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
  const sourceFile = ts19.createSourceFile("test.js", sourceText, ts19.ScriptTarget.ES5, true, ts19.ScriptKind.JS);
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
  const options2 = { noResolve: true, noLib: true, noEmit: true, allowJs: true };
  const program = ts19.createProgram(["test.js"], options2, host);
  function visitor(node) {
    if (ts19.isVariableDeclaration(node) && hasNameIdentifier(node) && node.name.text === "A") {
      return node;
    }
    return ts19.forEachChild(node, visitor);
  }
  const declaration = ts19.forEachChild(sourceFile, visitor);
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
function makeBundleProgram(fs5, isCore, pkg, path7, r3FileName, options2, host, additionalFiles = []) {
  const r3SymbolsPath = isCore ? findR3SymbolsPath(fs5, fs5.dirname(path7), r3FileName) : null;
  let rootPaths = r3SymbolsPath ? [path7, r3SymbolsPath, ...additionalFiles] : [path7, ...additionalFiles];
  const originalGetExpandoInitializer = patchTsGetExpandoInitializer();
  const program = ts20.createProgram(rootPaths, options2, host);
  program.getTypeChecker();
  restoreGetExpandoInitializer(originalGetExpandoInitializer);
  const file = program.getSourceFile(path7);
  const r3SymbolsFile = r3SymbolsPath && program.getSourceFile(r3SymbolsPath) || null;
  return { program, options: options2, host, package: pkg, path: path7, file, r3SymbolsPath, r3SymbolsFile };
}
function findR3SymbolsPath(fs5, directory, filename) {
  const r3SymbolsFilePath = fs5.resolve(directory, filename);
  if (fs5.exists(r3SymbolsFilePath)) {
    return r3SymbolsFilePath;
  }
  const subDirectories = fs5.readdir(directory).filter((p2) => !p2.startsWith(".")).filter((p2) => p2 !== "node_modules").filter((p2) => {
    const stat = fs5.lstat(fs5.resolve(directory, p2));
    return stat.isDirectory() && !stat.isSymbolicLink();
  });
  for (const subDirectory of subDirectories) {
    const r3SymbolsFilePath2 = findR3SymbolsPath(fs5, fs5.resolve(directory, subDirectory), filename);
    if (r3SymbolsFilePath2) {
      return r3SymbolsFilePath2;
    }
  }
  return null;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/packages/ngcc_compiler_host.mjs
import ts21 from "typescript";
var NgccSourcesCompilerHost = class extends NgtscCompilerHost {
  constructor(fs5, options2, cache, moduleResolutionCache, packagePath) {
    super(fs5, options2);
    this.cache = cache;
    this.moduleResolutionCache = moduleResolutionCache;
    this.packagePath = packagePath;
  }
  getSourceFile(fileName, languageVersion) {
    return this.cache.getCachedSourceFile(fileName, languageVersion);
  }
  resolveModuleNames(moduleNames, containingFile, reusedNames, redirectedReference) {
    return moduleNames.map((moduleName) => {
      const { resolvedModule } = ts21.resolveModuleName(moduleName, containingFile, this.options, this, this.moduleResolutionCache, redirectedReference);
      if ((resolvedModule == null ? void 0 : resolvedModule.extension) === ts21.Extension.Dts && containingFile.endsWith(".js") && isRelativePath(moduleName)) {
        const jsFile = resolvedModule.resolvedFileName.replace(/\.d\.ts$/, ".js");
        if (this.fileExists(jsFile)) {
          return __spreadProps(__spreadValues({}, resolvedModule), { resolvedFileName: jsFile, extension: ts21.Extension.Js });
        }
      }
      if ((resolvedModule == null ? void 0 : resolvedModule.extension) === ts21.Extension.Js && !isWithinPackage(this.packagePath, this.fs.resolve(resolvedModule.resolvedFileName))) {
        return void 0;
      }
      return resolvedModule;
    });
  }
};
var NgccDtsCompilerHost = class extends NgtscCompilerHost {
  constructor(fs5, options2, cache, moduleResolutionCache) {
    super(fs5, options2);
    this.cache = cache;
    this.moduleResolutionCache = moduleResolutionCache;
  }
  getSourceFile(fileName, languageVersion) {
    return this.cache.getCachedSourceFile(fileName, languageVersion);
  }
  resolveModuleNames(moduleNames, containingFile, reusedNames, redirectedReference) {
    return moduleNames.map((moduleName) => {
      const { resolvedModule } = ts21.resolveModuleName(moduleName, containingFile, this.options, this, this.moduleResolutionCache, redirectedReference);
      return resolvedModule;
    });
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/packages/source_file_cache.mjs
import ts22 from "typescript";
var SharedFileCache = class {
  constructor(fs5) {
    this.fs = fs5;
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
      const sf = ts22.createSourceFile(absPath, content, ts22.ScriptTarget.ES2015);
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
      const sf = ts22.createSourceFile(absPath, content, ts22.ScriptTarget.ES2015);
      this.sfCache.set(absPath, sf);
    }
    return this.sfCache.get(absPath);
  }
};
var DEFAULT_LIB_PATTERN = ["node_modules", "typescript", "lib", /^lib\..+\.d\.ts$/];
function isDefaultLibrary(absPath, fs5) {
  return isFile(absPath, DEFAULT_LIB_PATTERN, fs5);
}
var ANGULAR_DTS_PATTERN = ["node_modules", "@angular", /./, /\.d\.ts$/];
function isAngularDts(absPath, fs5) {
  return isFile(absPath, ANGULAR_DTS_PATTERN, fs5);
}
function isFile(path7, segments, fs5) {
  for (let i = segments.length - 1; i >= 0; i--) {
    const pattern = segments[i];
    const segment = fs5.basename(path7);
    if (typeof pattern === "string") {
      if (pattern !== segment) {
        return false;
      }
    } else {
      if (!pattern.test(segment)) {
        return false;
      }
    }
    path7 = fs5.dirname(path7);
  }
  return true;
}
var EntryPointFileCache = class {
  constructor(fs5, sharedFileCache) {
    this.fs = fs5;
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
    const sf = ts22.createSourceFile(fileName, content, languageVersion);
    this.sfCache.set(absPath, sf);
    return sf;
  }
};
function readFile(absPath, fs5) {
  if (!fs5.exists(absPath) || !fs5.stat(absPath).isFile()) {
    return void 0;
  }
  return fs5.readFile(absPath);
}
function createModuleResolutionCache(fs5) {
  return ts22.createModuleResolutionCache(fs5.pwd(), (fileName) => {
    return fs5.isCaseSensitive() ? fileName : fileName.toLowerCase();
  });
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/packages/entry_point_bundle.mjs
function makeEntryPointBundle(fs5, entryPoint, sharedFileCache, moduleResolutionCache, formatPath, isCore, format, dtsProcessing, pathMappings, mirrorDtsFromSrc = false, enableI18nLegacyMessageIdFormat = true) {
  const rootDir = entryPoint.packagePath;
  const options2 = __spreadValues({ allowJs: true, maxNodeModuleJsDepth: Infinity, rootDir }, pathMappings);
  const entryPointCache = new EntryPointFileCache(fs5, sharedFileCache);
  const dtsHost = new NgccDtsCompilerHost(fs5, options2, entryPointCache, moduleResolutionCache);
  const srcHost = new NgccSourcesCompilerHost(fs5, options2, entryPointCache, moduleResolutionCache, entryPoint.packagePath);
  const absFormatPath = fs5.resolve(entryPoint.path, formatPath);
  const typingsPath = fs5.resolve(entryPoint.path, entryPoint.typings);
  const src = makeBundleProgram(fs5, isCore, entryPoint.packagePath, absFormatPath, "r3_symbols.js", options2, srcHost);
  const additionalDtsFiles = dtsProcessing !== DtsProcessing.No && mirrorDtsFromSrc ? computePotentialDtsFilesFromJsFiles(fs5, src.program, absFormatPath, typingsPath) : [];
  const dts = dtsProcessing !== DtsProcessing.No ? makeBundleProgram(fs5, isCore, entryPoint.packagePath, typingsPath, "r3_symbols.d.ts", __spreadProps(__spreadValues({}, options2), { allowJs: false }), dtsHost, additionalDtsFiles) : null;
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
function computePotentialDtsFilesFromJsFiles(fs5, srcProgram, formatPath, typingsPath) {
  const formatRoot = fs5.dirname(formatPath);
  const typingsRoot = fs5.dirname(typingsPath);
  const additionalFiles = [];
  for (const sf of srcProgram.getSourceFiles()) {
    if (!sf.fileName.endsWith(".js")) {
      continue;
    }
    const mirroredDtsPath = fs5.resolve(typingsRoot, fs5.relative(formatRoot, sf.fileName.replace(/\.js$/, ".d.ts")));
    if (fs5.exists(mirroredDtsPath)) {
      additionalFiles.push(mirroredDtsPath);
    }
  }
  return additionalFiles;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/packages/transformer.mjs
import ts61 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/analysis/decoration_analyzer.mjs
import { ConstantPool as ConstantPool2 } from "@angular/compiler";

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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/component.mjs
import { compileClassMetadata as compileClassMetadata3, compileComponentFromMetadata, compileDeclareClassMetadata as compileDeclareClassMetadata3, compileDeclareComponentFromMetadata, CssSelector, DEFAULT_INTERPOLATION_CONFIG, DomElementSchemaRegistry, ExternalExpr as ExternalExpr7, FactoryTarget as FactoryTarget3, InterpolationConfig, makeBindingParser as makeBindingParser2, ParseSourceFile as ParseSourceFile2, parseTemplate, R3TargetBinder, SelectorMatcher, ViewEncapsulation, WrappedNodeExpr as WrappedNodeExpr6 } from "@angular/compiler";
import ts46 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/imports/src/alias.mjs
import { ExternalExpr as ExternalExpr2 } from "@angular/compiler";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/imports/src/emitter.mjs
import { ExternalExpr, ExternalReference, WrappedNodeExpr } from "@angular/compiler";
import ts24 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/imports/src/find_export.mjs
import ts23 from "typescript";
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
      throw new Error(`Debug assert: unable to import a Reference to non-declaration of type ${ts24.SyntaxKind[ref.node.kind]}.`);
    } else if ((importFlags & ImportFlags.AllowTypeImports) === 0 && isTypeDeclaration(ref.node)) {
      throw new Error(`Importing a type-only declaration of type ${ts24.SyntaxKind[ref.node.kind]} in a value position is not allowed.`);
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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/imports/src/alias.mjs
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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/util/src/path.mjs
function relativePathBetween(from, to) {
  const relativePath = stripExtension(relative(dirname(resolve(from)), resolve(to)));
  return relativePath !== "" ? toRelativeImport(relativePath) : null;
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
import ts25 from "typescript";
var DefaultImportDeclaration = Symbol("DefaultImportDeclaration");
function attachDefaultImportDeclaration(expr, importDecl) {
  expr[DefaultImportDeclaration] = importDecl;
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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/imports/src/resolver.mjs
var ModuleResolver2 = class {
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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/incremental/semantic_graph/src/api.mjs
import ts26 from "typescript";
var SemanticSymbol = class {
  constructor(decl) {
    this.decl = decl;
    this.path = absoluteFromSourceFile(decl.getSourceFile());
    this.identifier = getSymbolIdentifier(decl);
  }
};
function getSymbolIdentifier(decl) {
  if (!ts26.isSourceFile(decl.parent)) {
    return null;
  }
  return decl.name.text;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/incremental/semantic_graph/src/graph.mjs
import { ExternalExpr as ExternalExpr3 } from "@angular/compiler";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/incremental/semantic_graph/src/type_parameters.mjs
import ts27 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/incremental/semantic_graph/src/util.mjs
function isSymbolEqual(a, b) {
  if (a.decl === b.decl) {
    return true;
  }
  if (a.identifier === null || b.identifier === null) {
    return false;
  }
  return a.path === b.path && a.identifier === b.identifier;
}
function isReferenceEqual(a, b) {
  if (!isSymbolEqual(a.symbol, b.symbol)) {
    return false;
  }
  return a.importPath === b.importPath;
}
function referenceEquality(a, b) {
  return a === b;
}
function isArrayEqual(a, b, equalityTester = referenceEquality) {
  if (a === null || b === null) {
    return a === b;
  }
  if (a.length !== b.length) {
    return false;
  }
  return !a.some((item, index) => !equalityTester(item, b[index]));
}
function isSetEqual(a, b, equalityTester = referenceEquality) {
  if (a === null || b === null) {
    return a === b;
  }
  if (a.size !== b.size) {
    return false;
  }
  for (const itemA of a) {
    let found = false;
    for (const itemB of b) {
      if (equalityTester(itemA, itemB)) {
        found = true;
        break;
      }
    }
    if (!found) {
      return false;
    }
  }
  return true;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/incremental/semantic_graph/src/type_parameters.mjs
function extractSemanticTypeParameters(node) {
  if (!ts27.isClassDeclaration(node) || node.typeParameters === void 0) {
    return null;
  }
  return node.typeParameters.map((typeParam) => ({ hasGenericTypeBound: typeParam.constraint !== void 0 }));
}
function areTypeParametersEqual(current, previous) {
  if (!isArrayEqual(current, previous, isTypeParameterEqual)) {
    return false;
  }
  if (current !== null && current.some((typeParam) => typeParam.hasGenericTypeBound)) {
    return false;
  }
  return true;
}
function isTypeParameterEqual(a, b) {
  return a.hasGenericTypeBound === b.hasGenericTypeBound;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/metadata/src/api.mjs
var MetaType;
(function(MetaType2) {
  MetaType2[MetaType2["Pipe"] = 0] = "Pipe";
  MetaType2[MetaType2["Directive"] = 1] = "Directive";
})(MetaType || (MetaType = {}));

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/metadata/src/dts.mjs
import ts29 from "typescript";

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
import ts28 from "typescript";
function extractReferencesFromType(checker, def, bestGuessOwningModule) {
  if (!ts28.isTupleTypeNode(def)) {
    return [];
  }
  return def.elements.map((element) => {
    if (!ts28.isTypeQueryNode(element)) {
      throw new Error(`Expected TypeQueryNode: ${nodeDebugInfo(element)}`);
    }
    const type = element.exprName;
    const { node, from } = reflectTypeEntityToDeclaration(type, checker);
    if (!isNamedClassDeclaration(node)) {
      throw new Error(`Expected named ClassDeclaration: ${nodeDebugInfo(node)}`);
    }
    if (from !== null && !from.startsWith(".")) {
      return new Reference(node, { specifier: from, resolutionContext: def.getSourceFile().fileName });
    } else {
      return new Reference(node, bestGuessOwningModule);
    }
  });
}
function readStringType(type) {
  if (!ts28.isLiteralTypeNode(type) || !ts28.isStringLiteral(type.literal)) {
    return null;
  }
  return type.literal.text;
}
function readStringMapType(type) {
  if (!ts28.isTypeLiteralNode(type)) {
    return {};
  }
  const obj = {};
  type.members.forEach((member) => {
    if (!ts28.isPropertySignature(member) || member.type === void 0 || member.name === void 0 || !ts28.isStringLiteral(member.name)) {
      return;
    }
    const value = readStringType(member.type);
    if (value === null) {
      return null;
    }
    obj[member.name.text] = value;
  });
  return obj;
}
function readStringArrayType(type) {
  if (!ts28.isTupleTypeNode(type)) {
    return [];
  }
  const res = [];
  type.elements.forEach((el) => {
    if (!ts28.isLiteralTypeNode(el) || !ts28.isStringLiteral(el.literal)) {
      return;
    }
    res.push(el.literal.text);
  });
  return res;
}
function extractDirectiveTypeCheckMeta(node, inputs, reflector) {
  const members = reflector.getMembersOfClass(node);
  const staticMembers = members.filter((member) => member.isStatic);
  const ngTemplateGuards = staticMembers.map(extractTemplateGuard).filter((guard) => guard !== null);
  const hasNgTemplateContextGuard = staticMembers.some((member) => member.kind === ClassMemberKind.Method && member.name === "ngTemplateContextGuard");
  const coercedInputFields = new Set(staticMembers.map(extractCoercedInput).filter((inputName) => inputName !== null));
  const restrictedInputFields = new Set();
  const stringLiteralInputFields = new Set();
  const undeclaredInputFields = new Set();
  for (const classPropertyName of inputs.classPropertyNames) {
    const field = members.find((member) => member.name === classPropertyName);
    if (field === void 0 || field.node === null) {
      undeclaredInputFields.add(classPropertyName);
      continue;
    }
    if (isRestricted(field.node)) {
      restrictedInputFields.add(classPropertyName);
    }
    if (field.nameNode !== null && ts28.isStringLiteral(field.nameNode)) {
      stringLiteralInputFields.add(classPropertyName);
    }
  }
  const arity = reflector.getGenericArityOfClass(node);
  return {
    hasNgTemplateContextGuard,
    ngTemplateGuards,
    coercedInputFields,
    restrictedInputFields,
    stringLiteralInputFields,
    undeclaredInputFields,
    isGeneric: arity !== null && arity > 0
  };
}
function isRestricted(node) {
  if (node.modifiers === void 0) {
    return false;
  }
  return node.modifiers.some((modifier) => modifier.kind === ts28.SyntaxKind.PrivateKeyword || modifier.kind === ts28.SyntaxKind.ProtectedKeyword || modifier.kind === ts28.SyntaxKind.ReadonlyKeyword);
}
function extractTemplateGuard(member) {
  if (!member.name.startsWith("ngTemplateGuard_")) {
    return null;
  }
  const inputName = afterUnderscore(member.name);
  if (member.kind === ClassMemberKind.Property) {
    let type = null;
    if (member.type !== null && ts28.isLiteralTypeNode(member.type) && ts28.isStringLiteral(member.type.literal)) {
      type = member.type.literal.text;
    }
    if (type !== "binding") {
      return null;
    }
    return { inputName, type };
  } else if (member.kind === ClassMemberKind.Method) {
    return { inputName, type: "invocation" };
  } else {
    return null;
  }
}
function extractCoercedInput(member) {
  if (member.kind !== ClassMemberKind.Property || !member.name.startsWith("ngAcceptInputType_")) {
    return null;
  }
  return afterUnderscore(member.name);
}
var CompoundMetadataReader = class {
  constructor(readers) {
    this.readers = readers;
  }
  getDirectiveMetadata(node) {
    for (const reader of this.readers) {
      const meta = reader.getDirectiveMetadata(node);
      if (meta !== null) {
        return meta;
      }
    }
    return null;
  }
  getNgModuleMetadata(node) {
    for (const reader of this.readers) {
      const meta = reader.getNgModuleMetadata(node);
      if (meta !== null) {
        return meta;
      }
    }
    return null;
  }
  getPipeMetadata(node) {
    for (const reader of this.readers) {
      const meta = reader.getPipeMetadata(node);
      if (meta !== null) {
        return meta;
      }
    }
    return null;
  }
};
function afterUnderscore(str) {
  const pos = str.indexOf("_");
  if (pos === -1) {
    throw new Error(`Expected '${str}' to contain '_'`);
  }
  return str.substr(pos + 1);
}
function hasInjectableFields(clazz, host) {
  const members = host.getMembersOfClass(clazz);
  return members.some(({ isStatic, name }) => isStatic && (name === "\u0275prov" || name === "\u0275fac"));
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/metadata/src/dts.mjs
var DtsMetadataReader = class {
  constructor(checker, reflector) {
    this.checker = checker;
    this.reflector = reflector;
  }
  getNgModuleMetadata(ref) {
    const clazz = ref.node;
    const ngModuleDef = this.reflector.getMembersOfClass(clazz).find((member) => member.name === "\u0275mod" && member.isStatic);
    if (ngModuleDef === void 0) {
      return null;
    } else if (ngModuleDef.type === null || !ts29.isTypeReferenceNode(ngModuleDef.type) || ngModuleDef.type.typeArguments === void 0 || ngModuleDef.type.typeArguments.length !== 4) {
      return null;
    }
    const [_, declarationMetadata, importMetadata, exportMetadata] = ngModuleDef.type.typeArguments;
    return {
      ref,
      declarations: extractReferencesFromType(this.checker, declarationMetadata, ref.bestGuessOwningModule),
      exports: extractReferencesFromType(this.checker, exportMetadata, ref.bestGuessOwningModule),
      imports: extractReferencesFromType(this.checker, importMetadata, ref.bestGuessOwningModule),
      schemas: [],
      rawDeclarations: null
    };
  }
  getDirectiveMetadata(ref) {
    const clazz = ref.node;
    const def = this.reflector.getMembersOfClass(clazz).find((field) => field.isStatic && (field.name === "\u0275cmp" || field.name === "\u0275dir"));
    if (def === void 0) {
      return null;
    } else if (def.type === null || !ts29.isTypeReferenceNode(def.type) || def.type.typeArguments === void 0 || def.type.typeArguments.length < 2) {
      return null;
    }
    const isComponent = def.name === "\u0275cmp";
    const ctorParams = this.reflector.getConstructorParameters(clazz);
    const isStructural = !isComponent && ctorParams !== null && ctorParams.some((param) => {
      return param.typeValueReference.kind === 1 && param.typeValueReference.moduleName === "@angular/core" && param.typeValueReference.importedName === "TemplateRef";
    });
    const inputs = ClassPropertyMapping.fromMappedObject(readStringMapType(def.type.typeArguments[3]));
    const outputs = ClassPropertyMapping.fromMappedObject(readStringMapType(def.type.typeArguments[4]));
    return __spreadProps(__spreadValues({
      type: MetaType.Directive,
      ref,
      name: clazz.name.text,
      isComponent,
      selector: readStringType(def.type.typeArguments[1]),
      exportAs: readStringArrayType(def.type.typeArguments[2]),
      inputs,
      outputs,
      queries: readStringArrayType(def.type.typeArguments[5])
    }, extractDirectiveTypeCheckMeta(clazz, inputs, this.reflector)), {
      baseClass: readBaseClass(clazz, this.checker, this.reflector),
      isPoisoned: false,
      isStructural
    });
  }
  getPipeMetadata(ref) {
    const def = this.reflector.getMembersOfClass(ref.node).find((field) => field.isStatic && field.name === "\u0275pipe");
    if (def === void 0) {
      return null;
    } else if (def.type === null || !ts29.isTypeReferenceNode(def.type) || def.type.typeArguments === void 0 || def.type.typeArguments.length < 2) {
      return null;
    }
    const type = def.type.typeArguments[1];
    if (!ts29.isLiteralTypeNode(type) || !ts29.isStringLiteral(type.literal)) {
      return null;
    }
    const name = type.literal.text;
    return {
      type: MetaType.Pipe,
      ref,
      name,
      nameExpr: null
    };
  }
};
function readBaseClass(clazz, checker, reflector) {
  if (!isNamedClassDeclaration(clazz)) {
    return reflector.hasBaseClass(clazz) ? "dynamic" : null;
  }
  if (clazz.heritageClauses !== void 0) {
    for (const clause of clazz.heritageClauses) {
      if (clause.token === ts29.SyntaxKind.ExtendsKeyword) {
        const baseExpr = clause.types[0].expression;
        let symbol = checker.getSymbolAtLocation(baseExpr);
        if (symbol === void 0) {
          return "dynamic";
        } else if (symbol.flags & ts29.SymbolFlags.Alias) {
          symbol = checker.getAliasedSymbol(symbol);
        }
        if (symbol.valueDeclaration !== void 0 && isNamedClassDeclaration(symbol.valueDeclaration)) {
          return new Reference(symbol.valueDeclaration);
        } else {
          return "dynamic";
        }
      }
    }
  }
  return null;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/metadata/src/inheritance.mjs
function flattenInheritedDirectiveMetadata(reader, dir) {
  const topMeta = reader.getDirectiveMetadata(dir);
  if (topMeta === null) {
    throw new Error(`Metadata not found for directive: ${dir.debugName}`);
  }
  if (topMeta.baseClass === null) {
    return topMeta;
  }
  const coercedInputFields = new Set();
  const undeclaredInputFields = new Set();
  const restrictedInputFields = new Set();
  const stringLiteralInputFields = new Set();
  let isDynamic = false;
  let inputs = ClassPropertyMapping.empty();
  let outputs = ClassPropertyMapping.empty();
  let isStructural = false;
  const addMetadata = (meta) => {
    if (meta.baseClass === "dynamic") {
      isDynamic = true;
    } else if (meta.baseClass !== null) {
      const baseMeta = reader.getDirectiveMetadata(meta.baseClass);
      if (baseMeta !== null) {
        addMetadata(baseMeta);
      } else {
        isDynamic = true;
      }
    }
    isStructural = isStructural || meta.isStructural;
    inputs = ClassPropertyMapping.merge(inputs, meta.inputs);
    outputs = ClassPropertyMapping.merge(outputs, meta.outputs);
    for (const coercedInputField of meta.coercedInputFields) {
      coercedInputFields.add(coercedInputField);
    }
    for (const undeclaredInputField of meta.undeclaredInputFields) {
      undeclaredInputFields.add(undeclaredInputField);
    }
    for (const restrictedInputField of meta.restrictedInputFields) {
      restrictedInputFields.add(restrictedInputField);
    }
    for (const field of meta.stringLiteralInputFields) {
      stringLiteralInputFields.add(field);
    }
  };
  addMetadata(topMeta);
  return __spreadProps(__spreadValues({}, topMeta), {
    inputs,
    outputs,
    coercedInputFields,
    undeclaredInputFields,
    restrictedInputFields,
    stringLiteralInputFields,
    baseClass: isDynamic ? "dynamic" : null,
    isStructural
  });
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/metadata/src/registry.mjs
var LocalMetadataRegistry = class {
  constructor() {
    this.directives = new Map();
    this.ngModules = new Map();
    this.pipes = new Map();
  }
  getDirectiveMetadata(ref) {
    return this.directives.has(ref.node) ? this.directives.get(ref.node) : null;
  }
  getNgModuleMetadata(ref) {
    return this.ngModules.has(ref.node) ? this.ngModules.get(ref.node) : null;
  }
  getPipeMetadata(ref) {
    return this.pipes.has(ref.node) ? this.pipes.get(ref.node) : null;
  }
  registerDirectiveMetadata(meta) {
    this.directives.set(meta.ref.node, meta);
  }
  registerNgModuleMetadata(meta) {
    this.ngModules.set(meta.ref.node, meta);
  }
  registerPipeMetadata(meta) {
    this.pipes.set(meta.ref.node, meta);
  }
};
var CompoundMetadataRegistry = class {
  constructor(registries) {
    this.registries = registries;
  }
  registerDirectiveMetadata(meta) {
    for (const registry of this.registries) {
      registry.registerDirectiveMetadata(meta);
    }
  }
  registerNgModuleMetadata(meta) {
    for (const registry of this.registries) {
      registry.registerNgModuleMetadata(meta);
    }
  }
  registerPipeMetadata(meta) {
    for (const registry of this.registries) {
      registry.registerPipeMetadata(meta);
    }
  }
};
var InjectableClassRegistry = class {
  constructor(host) {
    this.host = host;
    this.classes = new Set();
  }
  registerInjectable(declaration) {
    this.classes.add(declaration);
  }
  isInjectable(declaration) {
    return this.classes.has(declaration) || hasInjectableFields(declaration, this.host);
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/metadata/src/resource_registry.mjs
var ResourceRegistry = class {
  constructor() {
    this.externalTemplateToComponentsMap = new Map();
    this.componentToTemplateMap = new Map();
    this.componentToStylesMap = new Map();
    this.externalStyleToComponentsMap = new Map();
  }
  getComponentsWithTemplate(template) {
    if (!this.externalTemplateToComponentsMap.has(template)) {
      return new Set();
    }
    return this.externalTemplateToComponentsMap.get(template);
  }
  registerResources(resources, component) {
    if (resources.template !== null) {
      this.registerTemplate(resources.template, component);
    }
    for (const style of resources.styles) {
      this.registerStyle(style, component);
    }
  }
  registerTemplate(templateResource, component) {
    const { path: path7 } = templateResource;
    if (path7 !== null) {
      if (!this.externalTemplateToComponentsMap.has(path7)) {
        this.externalTemplateToComponentsMap.set(path7, new Set());
      }
      this.externalTemplateToComponentsMap.get(path7).add(component);
    }
    this.componentToTemplateMap.set(component, templateResource);
  }
  getTemplate(component) {
    if (!this.componentToTemplateMap.has(component)) {
      return null;
    }
    return this.componentToTemplateMap.get(component);
  }
  registerStyle(styleResource, component) {
    const { path: path7 } = styleResource;
    if (!this.componentToStylesMap.has(component)) {
      this.componentToStylesMap.set(component, new Set());
    }
    if (path7 !== null) {
      if (!this.externalStyleToComponentsMap.has(path7)) {
        this.externalStyleToComponentsMap.set(path7, new Set());
      }
      this.externalStyleToComponentsMap.get(path7).add(component);
    }
    this.componentToStylesMap.get(component).add(styleResource);
  }
  getStyles(component) {
    if (!this.componentToStylesMap.has(component)) {
      return new Set();
    }
    return this.componentToStylesMap.get(component);
  }
  getComponentsWithStyle(styleUrl) {
    if (!this.externalStyleToComponentsMap.has(styleUrl)) {
      return new Set();
    }
    return this.externalStyleToComponentsMap.get(styleUrl);
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/partial_evaluator/src/diagnostics.mjs
import ts30 from "typescript";

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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/partial_evaluator/src/diagnostics.mjs
function describeResolvedType(value, maxDepth = 1) {
  var _a, _b;
  if (value === null) {
    return "null";
  } else if (value === void 0) {
    return "undefined";
  } else if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") {
    return typeof value;
  } else if (value instanceof Map) {
    if (maxDepth === 0) {
      return "object";
    }
    const entries = Array.from(value.entries()).map(([key, v]) => {
      return `${quoteKey(key)}: ${describeResolvedType(v, maxDepth - 1)}`;
    });
    return entries.length > 0 ? `{ ${entries.join("; ")} }` : "{}";
  } else if (value instanceof ResolvedModule) {
    return "(module)";
  } else if (value instanceof EnumValue) {
    return (_a = value.enumRef.debugName) != null ? _a : "(anonymous)";
  } else if (value instanceof Reference) {
    return (_b = value.debugName) != null ? _b : "(anonymous)";
  } else if (Array.isArray(value)) {
    if (maxDepth === 0) {
      return "Array";
    }
    return `[${value.map((v) => describeResolvedType(v, maxDepth - 1)).join(", ")}]`;
  } else if (value instanceof DynamicValue) {
    return "(not statically analyzable)";
  } else if (value instanceof KnownFn) {
    return "Function";
  } else {
    return "unknown";
  }
}
function quoteKey(key) {
  if (/^[a-z0-9_]+$/i.test(key)) {
    return key;
  } else {
    return `'${key.replace(/'/g, "\\'")}'`;
  }
}
function traceDynamicValue(node, value) {
  return value.accept(new TraceDynamicValueVisitor(node));
}
var TraceDynamicValueVisitor = class {
  constructor(node) {
    this.node = node;
    this.currentContainerNode = null;
  }
  visitDynamicInput(value) {
    const trace = value.reason.accept(this);
    if (this.shouldTrace(value.node)) {
      const info = makeRelatedInformation(value.node, "Unable to evaluate this expression statically.");
      trace.unshift(info);
    }
    return trace;
  }
  visitDynamicString(value) {
    return [makeRelatedInformation(value.node, "A string value could not be determined statically.")];
  }
  visitExternalReference(value) {
    const name = value.reason.debugName;
    const description = name !== null ? `'${name}'` : "an anonymous declaration";
    return [makeRelatedInformation(value.node, `A value for ${description} cannot be determined statically, as it is an external declaration.`)];
  }
  visitComplexFunctionCall(value) {
    return [
      makeRelatedInformation(value.node, "Unable to evaluate function call of complex function. A function must have exactly one return statement."),
      makeRelatedInformation(value.reason.node, "Function is declared here.")
    ];
  }
  visitInvalidExpressionType(value) {
    return [makeRelatedInformation(value.node, "Unable to evaluate an invalid expression.")];
  }
  visitUnknown(value) {
    return [makeRelatedInformation(value.node, "Unable to evaluate statically.")];
  }
  visitUnknownIdentifier(value) {
    return [makeRelatedInformation(value.node, "Unknown reference.")];
  }
  visitDynamicType(value) {
    return [makeRelatedInformation(value.node, "Dynamic type.")];
  }
  visitUnsupportedSyntax(value) {
    return [makeRelatedInformation(value.node, "This syntax is not supported.")];
  }
  shouldTrace(node) {
    if (node === this.node) {
      return false;
    }
    const container = getContainerNode(node);
    if (container === this.currentContainerNode) {
      return false;
    }
    this.currentContainerNode = container;
    return true;
  }
};
function getContainerNode(node) {
  let currentNode = node;
  while (currentNode !== void 0) {
    switch (currentNode.kind) {
      case ts30.SyntaxKind.ExpressionStatement:
      case ts30.SyntaxKind.VariableStatement:
      case ts30.SyntaxKind.ReturnStatement:
      case ts30.SyntaxKind.IfStatement:
      case ts30.SyntaxKind.SwitchStatement:
      case ts30.SyntaxKind.DoStatement:
      case ts30.SyntaxKind.WhileStatement:
      case ts30.SyntaxKind.ForStatement:
      case ts30.SyntaxKind.ForInStatement:
      case ts30.SyntaxKind.ForOfStatement:
      case ts30.SyntaxKind.ContinueStatement:
      case ts30.SyntaxKind.BreakStatement:
      case ts30.SyntaxKind.ThrowStatement:
      case ts30.SyntaxKind.ObjectBindingPattern:
      case ts30.SyntaxKind.ArrayBindingPattern:
        return currentNode;
    }
    currentNode = currentNode.parent;
  }
  return node.getSourceFile();
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/partial_evaluator/src/interpreter.mjs
import ts31 from "typescript";

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
  [ts31.SyntaxKind.PlusToken, literalBinaryOp((a, b) => a + b)],
  [ts31.SyntaxKind.MinusToken, literalBinaryOp((a, b) => a - b)],
  [ts31.SyntaxKind.AsteriskToken, literalBinaryOp((a, b) => a * b)],
  [ts31.SyntaxKind.SlashToken, literalBinaryOp((a, b) => a / b)],
  [ts31.SyntaxKind.PercentToken, literalBinaryOp((a, b) => a % b)],
  [ts31.SyntaxKind.AmpersandToken, literalBinaryOp((a, b) => a & b)],
  [ts31.SyntaxKind.BarToken, literalBinaryOp((a, b) => a | b)],
  [ts31.SyntaxKind.CaretToken, literalBinaryOp((a, b) => a ^ b)],
  [ts31.SyntaxKind.LessThanToken, literalBinaryOp((a, b) => a < b)],
  [ts31.SyntaxKind.LessThanEqualsToken, literalBinaryOp((a, b) => a <= b)],
  [ts31.SyntaxKind.GreaterThanToken, literalBinaryOp((a, b) => a > b)],
  [ts31.SyntaxKind.GreaterThanEqualsToken, literalBinaryOp((a, b) => a >= b)],
  [ts31.SyntaxKind.EqualsEqualsToken, literalBinaryOp((a, b) => a == b)],
  [ts31.SyntaxKind.EqualsEqualsEqualsToken, literalBinaryOp((a, b) => a === b)],
  [ts31.SyntaxKind.ExclamationEqualsToken, literalBinaryOp((a, b) => a != b)],
  [ts31.SyntaxKind.ExclamationEqualsEqualsToken, literalBinaryOp((a, b) => a !== b)],
  [ts31.SyntaxKind.LessThanLessThanToken, literalBinaryOp((a, b) => a << b)],
  [ts31.SyntaxKind.GreaterThanGreaterThanToken, literalBinaryOp((a, b) => a >> b)],
  [ts31.SyntaxKind.GreaterThanGreaterThanGreaterThanToken, literalBinaryOp((a, b) => a >>> b)],
  [ts31.SyntaxKind.AsteriskAsteriskToken, literalBinaryOp((a, b) => Math.pow(a, b))],
  [ts31.SyntaxKind.AmpersandAmpersandToken, referenceBinaryOp((a, b) => a && b)],
  [ts31.SyntaxKind.BarBarToken, referenceBinaryOp((a, b) => a || b)]
]);
var UNARY_OPERATORS = new Map([
  [ts31.SyntaxKind.TildeToken, (a) => ~a],
  [ts31.SyntaxKind.MinusToken, (a) => -a],
  [ts31.SyntaxKind.PlusToken, (a) => +a],
  [ts31.SyntaxKind.ExclamationToken, (a) => !a]
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
    if (node.kind === ts31.SyntaxKind.TrueKeyword) {
      return true;
    } else if (node.kind === ts31.SyntaxKind.FalseKeyword) {
      return false;
    } else if (node.kind === ts31.SyntaxKind.NullKeyword) {
      return null;
    } else if (ts31.isStringLiteral(node)) {
      return node.text;
    } else if (ts31.isNoSubstitutionTemplateLiteral(node)) {
      return node.text;
    } else if (ts31.isTemplateExpression(node)) {
      result = this.visitTemplateExpression(node, context);
    } else if (ts31.isNumericLiteral(node)) {
      return parseFloat(node.text);
    } else if (ts31.isObjectLiteralExpression(node)) {
      result = this.visitObjectLiteralExpression(node, context);
    } else if (ts31.isIdentifier(node)) {
      result = this.visitIdentifier(node, context);
    } else if (ts31.isPropertyAccessExpression(node)) {
      result = this.visitPropertyAccessExpression(node, context);
    } else if (ts31.isCallExpression(node)) {
      result = this.visitCallExpression(node, context);
    } else if (ts31.isConditionalExpression(node)) {
      result = this.visitConditionalExpression(node, context);
    } else if (ts31.isPrefixUnaryExpression(node)) {
      result = this.visitPrefixUnaryExpression(node, context);
    } else if (ts31.isBinaryExpression(node)) {
      result = this.visitBinaryExpression(node, context);
    } else if (ts31.isArrayLiteralExpression(node)) {
      result = this.visitArrayLiteralExpression(node, context);
    } else if (ts31.isParenthesizedExpression(node)) {
      result = this.visitParenthesizedExpression(node, context);
    } else if (ts31.isElementAccessExpression(node)) {
      result = this.visitElementAccessExpression(node, context);
    } else if (ts31.isAsExpression(node)) {
      result = this.visitExpression(node.expression, context);
    } else if (ts31.isNonNullExpression(node)) {
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
      if (ts31.isSpreadElement(element)) {
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
      const property2 = node.properties[i];
      if (ts31.isPropertyAssignment(property2)) {
        const name = this.stringNameFromPropertyName(property2.name, context);
        if (name === void 0) {
          return DynamicValue.fromDynamicInput(node, DynamicValue.fromDynamicString(property2.name));
        }
        map.set(name, this.visitExpression(property2.initializer, context));
      } else if (ts31.isShorthandPropertyAssignment(property2)) {
        const symbol = this.checker.getShorthandAssignmentValueSymbol(property2);
        if (symbol === void 0 || symbol.valueDeclaration === void 0) {
          map.set(property2.name.text, DynamicValue.fromUnknown(property2));
        } else {
          map.set(property2.name.text, this.visitDeclaration(symbol.valueDeclaration, context));
        }
      } else if (ts31.isSpreadAssignment(property2)) {
        const spread = this.visitExpression(property2.expression, context);
        if (spread instanceof DynamicValue) {
          return DynamicValue.fromDynamicInput(node, spread);
        } else if (spread instanceof Map) {
          spread.forEach((value, key) => map.set(key, value));
        } else if (spread instanceof ResolvedModule) {
          spread.getExports().forEach((value, key) => map.set(key, value));
        } else {
          return DynamicValue.fromDynamicInput(node, DynamicValue.fromInvalidExpressionType(property2, spread));
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
      if (node.originalKeywordKind === ts31.SyntaxKind.UndefinedKeyword) {
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
    } else if (ts31.isVariableDeclaration(node)) {
      return this.visitVariableDeclaration(node, context);
    } else if (ts31.isParameter(node) && context.scope.has(node)) {
      return context.scope.get(node);
    } else if (ts31.isExportAssignment(node)) {
      return this.visitExpression(node.expression, context);
    } else if (ts31.isEnumDeclaration(node)) {
      return this.visitEnumDeclaration(node, context);
    } else if (ts31.isSourceFile(node)) {
      return this.visitSourceFile(node, context);
    } else if (ts31.isBindingElement(node)) {
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
        const module7 = owningModule(context, lhs.bestGuessOwningModule);
        let value = void 0;
        const member = this.host.getMembersOfClass(ref).find((member2) => member2.isStatic && member2.name === strIndex);
        if (member !== void 0) {
          if (member.value !== null) {
            value = this.visitExpression(member.value, context);
          } else if (member.implementation !== null) {
            value = new Reference(member.implementation, module7);
          } else if (member.node) {
            value = new Reference(member.node, module7);
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
    } else if (fn.body.length !== 1 || !ts31.isReturnStatement(fn.body[0])) {
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
      if (ts31.isSpreadElement(arg)) {
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
    const path7 = [];
    let closestDeclaration = node;
    while (ts31.isBindingElement(closestDeclaration) || ts31.isArrayBindingPattern(closestDeclaration) || ts31.isObjectBindingPattern(closestDeclaration)) {
      if (ts31.isBindingElement(closestDeclaration)) {
        path7.unshift(closestDeclaration);
      }
      closestDeclaration = closestDeclaration.parent;
    }
    if (!ts31.isVariableDeclaration(closestDeclaration) || closestDeclaration.initializer === void 0) {
      return DynamicValue.fromUnknown(node);
    }
    let value = this.visit(closestDeclaration.initializer, context);
    for (const element of path7) {
      let key;
      if (ts31.isArrayBindingPattern(element.parent)) {
        key = element.parent.elements.indexOf(element);
      } else {
        const name = element.propertyName || element.name;
        if (ts31.isIdentifier(name)) {
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
    if (ts31.isIdentifier(node) || ts31.isStringLiteral(node) || ts31.isNumericLiteral(node)) {
      return node.text;
    } else if (ts31.isComputedPropertyName(node)) {
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
    if (ts31.isLiteralTypeNode(node)) {
      return this.visitExpression(node.literal, context);
    } else if (ts31.isTupleTypeNode(node)) {
      return this.visitTupleType(node, context);
    } else if (ts31.isNamedTupleMember(node)) {
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
  return ts31.isFunctionDeclaration(ref.node) || ts31.isMethodDeclaration(ref.node) || ts31.isFunctionExpression(ref.node);
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
  if (node.parent === void 0 || !ts31.isVariableDeclarationList(node.parent)) {
    return false;
  }
  const declList = node.parent;
  if (declList.parent === void 0 || !ts31.isVariableStatement(declList.parent)) {
    return false;
  }
  const varStmt = declList.parent;
  return varStmt.modifiers !== void 0 && varStmt.modifiers.some((mod) => mod.kind === ts31.SyntaxKind.DeclareKeyword);
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
import ts32 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/transform/src/compilation.mjs
import ts33 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/transform/src/trait.mjs
var TraitState;
(function(TraitState2) {
  TraitState2[TraitState2["Pending"] = 0] = "Pending";
  TraitState2[TraitState2["Analyzed"] = 1] = "Analyzed";
  TraitState2[TraitState2["Resolved"] = 2] = "Resolved";
  TraitState2[TraitState2["Skipped"] = 3] = "Skipped";
})(TraitState || (TraitState = {}));
var Trait = {
  pending: (handler, detected) => TraitImpl.pending(handler, detected)
};
var TraitImpl = class {
  constructor(handler, detected) {
    this.state = TraitState.Pending;
    this.analysis = null;
    this.symbol = null;
    this.resolution = null;
    this.analysisDiagnostics = null;
    this.resolveDiagnostics = null;
    this.handler = handler;
    this.detected = detected;
  }
  toAnalyzed(analysis, diagnostics, symbol) {
    this.assertTransitionLegal(TraitState.Pending, TraitState.Analyzed);
    this.analysis = analysis;
    this.analysisDiagnostics = diagnostics;
    this.symbol = symbol;
    this.state = TraitState.Analyzed;
    return this;
  }
  toResolved(resolution, diagnostics) {
    this.assertTransitionLegal(TraitState.Analyzed, TraitState.Resolved);
    if (this.analysis === null) {
      throw new Error(`Cannot transition an Analyzed trait with a null analysis to Resolved`);
    }
    this.resolution = resolution;
    this.state = TraitState.Resolved;
    this.resolveDiagnostics = diagnostics;
    return this;
  }
  toSkipped() {
    this.assertTransitionLegal(TraitState.Pending, TraitState.Skipped);
    this.state = TraitState.Skipped;
    return this;
  }
  assertTransitionLegal(allowedState, transitionTo) {
    if (!(this.state === allowedState)) {
      throw new Error(`Assertion failure: cannot transition from ${TraitState[this.state]} to ${TraitState[transitionTo]}.`);
    }
  }
  static pending(handler, detected) {
    return new TraitImpl(handler, detected);
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/transform/src/compilation.mjs
var TraitCompiler = class {
  constructor(handlers, reflector, perf, incrementalBuild, compileNonExportedClasses, compilationMode, dtsTransforms, semanticDepGraphUpdater) {
    this.handlers = handlers;
    this.reflector = reflector;
    this.perf = perf;
    this.incrementalBuild = incrementalBuild;
    this.compileNonExportedClasses = compileNonExportedClasses;
    this.compilationMode = compilationMode;
    this.dtsTransforms = dtsTransforms;
    this.semanticDepGraphUpdater = semanticDepGraphUpdater;
    this.classes = new Map();
    this.fileToClasses = new Map();
    this.filesWithoutTraits = new Set();
    this.reexportMap = new Map();
    this.handlersByName = new Map();
    for (const handler of handlers) {
      this.handlersByName.set(handler.name, handler);
    }
  }
  analyzeSync(sf) {
    this.analyze(sf, false);
  }
  analyzeAsync(sf) {
    return this.analyze(sf, true);
  }
  analyze(sf, preanalyze) {
    if (sf.isDeclarationFile) {
      return void 0;
    }
    const promises = [];
    const priorWork = this.incrementalBuild.priorAnalysisFor(sf);
    if (priorWork !== null) {
      this.perf.eventCount(PerfEvent.SourceFileReuseAnalysis);
      if (priorWork.length > 0) {
        for (const priorRecord of priorWork) {
          this.adopt(priorRecord);
        }
        this.perf.eventCount(PerfEvent.TraitReuseAnalysis, priorWork.length);
      } else {
        this.filesWithoutTraits.add(sf);
      }
      return;
    }
    const visit2 = (node) => {
      if (this.reflector.isClass(node)) {
        this.analyzeClass(node, preanalyze ? promises : null);
      }
      ts33.forEachChild(node, visit2);
    };
    visit2(sf);
    if (preanalyze && promises.length > 0) {
      return Promise.all(promises).then(() => void 0);
    } else {
      return void 0;
    }
  }
  recordFor(clazz) {
    if (this.classes.has(clazz)) {
      return this.classes.get(clazz);
    } else {
      return null;
    }
  }
  recordsFor(sf) {
    if (!this.fileToClasses.has(sf)) {
      return null;
    }
    const records = [];
    for (const clazz of this.fileToClasses.get(sf)) {
      records.push(this.classes.get(clazz));
    }
    return records;
  }
  getAnalyzedRecords() {
    const result = new Map();
    for (const [sf, classes] of this.fileToClasses) {
      const records = [];
      for (const clazz of classes) {
        records.push(this.classes.get(clazz));
      }
      result.set(sf, records);
    }
    for (const sf of this.filesWithoutTraits) {
      result.set(sf, []);
    }
    return result;
  }
  adopt(priorRecord) {
    const record = {
      hasPrimaryHandler: priorRecord.hasPrimaryHandler,
      hasWeakHandlers: priorRecord.hasWeakHandlers,
      metaDiagnostics: priorRecord.metaDiagnostics,
      node: priorRecord.node,
      traits: []
    };
    for (const priorTrait of priorRecord.traits) {
      const handler = this.handlersByName.get(priorTrait.handler.name);
      let trait = Trait.pending(handler, priorTrait.detected);
      if (priorTrait.state === TraitState.Analyzed || priorTrait.state === TraitState.Resolved) {
        const symbol = this.makeSymbolForTrait(handler, record.node, priorTrait.analysis);
        trait = trait.toAnalyzed(priorTrait.analysis, priorTrait.analysisDiagnostics, symbol);
        if (trait.analysis !== null && trait.handler.register !== void 0) {
          trait.handler.register(record.node, trait.analysis);
        }
      } else if (priorTrait.state === TraitState.Skipped) {
        trait = trait.toSkipped();
      }
      record.traits.push(trait);
    }
    this.classes.set(record.node, record);
    const sf = record.node.getSourceFile();
    if (!this.fileToClasses.has(sf)) {
      this.fileToClasses.set(sf, new Set());
    }
    this.fileToClasses.get(sf).add(record.node);
  }
  scanClassForTraits(clazz) {
    if (!this.compileNonExportedClasses && !this.reflector.isStaticallyExported(clazz)) {
      return null;
    }
    const decorators = this.reflector.getDecoratorsOfDeclaration(clazz);
    return this.detectTraits(clazz, decorators);
  }
  detectTraits(clazz, decorators) {
    let record = this.recordFor(clazz);
    let foundTraits = [];
    for (const handler of this.handlers) {
      const result = handler.detect(clazz, decorators);
      if (result === void 0) {
        continue;
      }
      const isPrimaryHandler = handler.precedence === HandlerPrecedence.PRIMARY;
      const isWeakHandler = handler.precedence === HandlerPrecedence.WEAK;
      const trait = Trait.pending(handler, result);
      foundTraits.push(trait);
      if (record === null) {
        record = {
          node: clazz,
          traits: [trait],
          metaDiagnostics: null,
          hasPrimaryHandler: isPrimaryHandler,
          hasWeakHandlers: isWeakHandler
        };
        this.classes.set(clazz, record);
        const sf = clazz.getSourceFile();
        if (!this.fileToClasses.has(sf)) {
          this.fileToClasses.set(sf, new Set());
        }
        this.fileToClasses.get(sf).add(clazz);
      } else {
        if (!isWeakHandler && record.hasWeakHandlers) {
          record.traits = record.traits.filter((field) => field.handler.precedence !== HandlerPrecedence.WEAK);
          record.hasWeakHandlers = false;
        } else if (isWeakHandler && !record.hasWeakHandlers) {
          continue;
        }
        if (isPrimaryHandler && record.hasPrimaryHandler) {
          record.metaDiagnostics = [{
            category: ts33.DiagnosticCategory.Error,
            code: Number("-99" + ErrorCode.DECORATOR_COLLISION),
            file: getSourceFile(clazz),
            start: clazz.getStart(void 0, false),
            length: clazz.getWidth(),
            messageText: "Two incompatible decorators on class"
          }];
          record.traits = foundTraits = [];
          break;
        }
        record.traits.push(trait);
        record.hasPrimaryHandler = record.hasPrimaryHandler || isPrimaryHandler;
      }
    }
    return foundTraits.length > 0 ? foundTraits : null;
  }
  makeSymbolForTrait(handler, decl, analysis) {
    if (analysis === null) {
      return null;
    }
    const symbol = handler.symbol(decl, analysis);
    if (symbol !== null && this.semanticDepGraphUpdater !== null) {
      const isPrimary = handler.precedence === HandlerPrecedence.PRIMARY;
      if (!isPrimary) {
        throw new Error(`AssertionError: ${handler.name} returned a symbol but is not a primary handler.`);
      }
      this.semanticDepGraphUpdater.registerSymbol(symbol);
    }
    return symbol;
  }
  analyzeClass(clazz, preanalyzeQueue) {
    const traits = this.scanClassForTraits(clazz);
    if (traits === null) {
      return;
    }
    for (const trait of traits) {
      const analyze = () => this.analyzeTrait(clazz, trait);
      let preanalysis = null;
      if (preanalyzeQueue !== null && trait.handler.preanalyze !== void 0) {
        try {
          preanalysis = trait.handler.preanalyze(clazz, trait.detected.metadata) || null;
        } catch (err) {
          if (err instanceof FatalDiagnosticError) {
            trait.toAnalyzed(null, [err.toDiagnostic()], null);
            return;
          } else {
            throw err;
          }
        }
      }
      if (preanalysis !== null) {
        preanalyzeQueue.push(preanalysis.then(analyze));
      } else {
        analyze();
      }
    }
  }
  analyzeTrait(clazz, trait, flags) {
    var _a, _b, _c;
    if (trait.state !== TraitState.Pending) {
      throw new Error(`Attempt to analyze trait of ${clazz.name.text} in state ${TraitState[trait.state]} (expected DETECTED)`);
    }
    this.perf.eventCount(PerfEvent.TraitAnalyze);
    let result;
    try {
      result = trait.handler.analyze(clazz, trait.detected.metadata, flags);
    } catch (err) {
      if (err instanceof FatalDiagnosticError) {
        trait.toAnalyzed(null, [err.toDiagnostic()], null);
        return;
      } else {
        throw err;
      }
    }
    const symbol = this.makeSymbolForTrait(trait.handler, clazz, (_a = result.analysis) != null ? _a : null);
    if (result.analysis !== void 0 && trait.handler.register !== void 0) {
      trait.handler.register(clazz, result.analysis);
    }
    trait = trait.toAnalyzed((_b = result.analysis) != null ? _b : null, (_c = result.diagnostics) != null ? _c : null, symbol);
  }
  resolve() {
    var _a, _b;
    const classes = Array.from(this.classes.keys());
    for (const clazz of classes) {
      const record = this.classes.get(clazz);
      for (let trait of record.traits) {
        const handler = trait.handler;
        switch (trait.state) {
          case TraitState.Skipped:
            continue;
          case TraitState.Pending:
            throw new Error(`Resolving a trait that hasn't been analyzed: ${clazz.name.text} / ${Object.getPrototypeOf(trait.handler).constructor.name}`);
          case TraitState.Resolved:
            throw new Error(`Resolving an already resolved trait`);
        }
        if (trait.analysis === null) {
          continue;
        }
        if (handler.resolve === void 0) {
          trait = trait.toResolved(null, null);
          continue;
        }
        let result;
        try {
          result = handler.resolve(clazz, trait.analysis, trait.symbol);
        } catch (err) {
          if (err instanceof FatalDiagnosticError) {
            trait = trait.toResolved(null, [err.toDiagnostic()]);
            continue;
          } else {
            throw err;
          }
        }
        trait = trait.toResolved((_a = result.data) != null ? _a : null, (_b = result.diagnostics) != null ? _b : null);
        if (result.reexports !== void 0) {
          const fileName = clazz.getSourceFile().fileName;
          if (!this.reexportMap.has(fileName)) {
            this.reexportMap.set(fileName, new Map());
          }
          const fileReexports = this.reexportMap.get(fileName);
          for (const reexport of result.reexports) {
            fileReexports.set(reexport.asAlias, [reexport.fromModule, reexport.symbolName]);
          }
        }
      }
    }
  }
  typeCheck(sf, ctx) {
    if (!this.fileToClasses.has(sf)) {
      return;
    }
    for (const clazz of this.fileToClasses.get(sf)) {
      const record = this.classes.get(clazz);
      for (const trait of record.traits) {
        if (trait.state !== TraitState.Resolved) {
          continue;
        } else if (trait.handler.typeCheck === void 0) {
          continue;
        }
        if (trait.resolution !== null) {
          trait.handler.typeCheck(ctx, clazz, trait.analysis, trait.resolution);
        }
      }
    }
  }
  extendedTemplateCheck(sf, extendedTemplateChecker) {
    const classes = this.fileToClasses.get(sf);
    if (classes === void 0) {
      return [];
    }
    const diagnostics = [];
    for (const clazz of classes) {
      if (!isNamedClassDeclaration(clazz)) {
        continue;
      }
      const record = this.classes.get(clazz);
      for (const trait of record.traits) {
        if (trait.handler.extendedTemplateCheck === void 0) {
          continue;
        }
        diagnostics.push(...trait.handler.extendedTemplateCheck(clazz, extendedTemplateChecker));
      }
    }
    return diagnostics;
  }
  index(ctx) {
    for (const clazz of this.classes.keys()) {
      const record = this.classes.get(clazz);
      for (const trait of record.traits) {
        if (trait.state !== TraitState.Resolved) {
          continue;
        } else if (trait.handler.index === void 0) {
          continue;
        }
        if (trait.resolution !== null) {
          trait.handler.index(ctx, clazz, trait.analysis, trait.resolution);
        }
      }
    }
  }
  xi18n(bundle) {
    for (const clazz of this.classes.keys()) {
      const record = this.classes.get(clazz);
      for (const trait of record.traits) {
        if (trait.state !== TraitState.Analyzed && trait.state !== TraitState.Resolved) {
          continue;
        } else if (trait.handler.xi18n === void 0) {
          continue;
        }
        if (trait.analysis !== null) {
          trait.handler.xi18n(bundle, clazz, trait.analysis);
        }
      }
    }
  }
  updateResources(clazz) {
    if (!this.reflector.isClass(clazz) || !this.classes.has(clazz)) {
      return;
    }
    const record = this.classes.get(clazz);
    for (const trait of record.traits) {
      if (trait.state !== TraitState.Resolved || trait.handler.updateResources === void 0) {
        continue;
      }
      trait.handler.updateResources(clazz, trait.analysis, trait.resolution);
    }
  }
  compile(clazz, constantPool) {
    const original = ts33.getOriginalNode(clazz);
    if (!this.reflector.isClass(clazz) || !this.reflector.isClass(original) || !this.classes.has(original)) {
      return null;
    }
    const record = this.classes.get(original);
    let res = [];
    for (const trait of record.traits) {
      if (trait.state !== TraitState.Resolved || trait.analysisDiagnostics !== null || trait.resolveDiagnostics !== null) {
        continue;
      }
      let compileRes;
      if (this.compilationMode === CompilationMode.PARTIAL && trait.handler.compilePartial !== void 0) {
        compileRes = trait.handler.compilePartial(clazz, trait.analysis, trait.resolution);
      } else {
        compileRes = trait.handler.compileFull(clazz, trait.analysis, trait.resolution, constantPool);
      }
      const compileMatchRes = compileRes;
      if (Array.isArray(compileMatchRes)) {
        for (const result of compileMatchRes) {
          if (!res.some((r) => r.name === result.name)) {
            res.push(result);
          }
        }
      } else if (!res.some((result) => result.name === compileMatchRes.name)) {
        res.push(compileMatchRes);
      }
    }
    this.dtsTransforms.getIvyDeclarationTransform(original.getSourceFile()).addFields(original, res);
    return res.length > 0 ? res : null;
  }
  decoratorsFor(node) {
    const original = ts33.getOriginalNode(node);
    if (!this.reflector.isClass(original) || !this.classes.has(original)) {
      return [];
    }
    const record = this.classes.get(original);
    const decorators = [];
    for (const trait of record.traits) {
      if (trait.state !== TraitState.Resolved) {
        continue;
      }
      if (trait.detected.trigger !== null && ts33.isDecorator(trait.detected.trigger)) {
        decorators.push(trait.detected.trigger);
      }
    }
    return decorators;
  }
  get diagnostics() {
    const diagnostics = [];
    for (const clazz of this.classes.keys()) {
      const record = this.classes.get(clazz);
      if (record.metaDiagnostics !== null) {
        diagnostics.push(...record.metaDiagnostics);
      }
      for (const trait of record.traits) {
        if ((trait.state === TraitState.Analyzed || trait.state === TraitState.Resolved) && trait.analysisDiagnostics !== null) {
          diagnostics.push(...trait.analysisDiagnostics);
        }
        if (trait.state === TraitState.Resolved && trait.resolveDiagnostics !== null) {
          diagnostics.push(...trait.resolveDiagnostics);
        }
      }
    }
    return diagnostics;
  }
  get exportStatements() {
    return this.reexportMap;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/transform/src/declaration.mjs
import ts38 from "typescript";

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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/translator/src/import_manager.mjs
import ts34 from "typescript";
var ImportManager = class {
  constructor(rewriter = new NoopImportRewriter(), prefix = "i") {
    this.rewriter = rewriter;
    this.prefix = prefix;
    this.specifierToIdentifier = new Map();
    this.nextIndex = 0;
  }
  generateNamespaceImport(moduleName) {
    if (!this.specifierToIdentifier.has(moduleName)) {
      this.specifierToIdentifier.set(moduleName, ts34.createIdentifier(`${this.prefix}${this.nextIndex++}`));
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
var ExpressionTranslatorVisitor = class {
  constructor(factory, imports, options2) {
    this.factory = factory;
    this.imports = imports;
    this.downlevelTaggedTemplates = options2.downlevelTaggedTemplates === true;
    this.downlevelVariableDeclarations = options2.downlevelVariableDeclarations === true;
    this.recordWrappedNode = options2.recordWrappedNode || (() => {
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
    if (!BINARY_OPERATORS2.has(ast.operator)) {
      throw new Error(`Unknown binary operator: ${BinaryOperator[ast.operator]}`);
    }
    return this.factory.createBinaryExpression(ast.lhs.visitExpression(this, context), BINARY_OPERATORS2.get(ast.operator), ast.rhs.visitExpression(this, context));
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
    if (!UNARY_OPERATORS2.has(ast.operator)) {
      throw new Error(`Unknown unary operator: ${UnaryOperator[ast.operator]}`);
    }
    return this.factory.createUnaryExpression(UNARY_OPERATORS2.get(ast.operator), ast.expr.visitExpression(this, context));
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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/translator/src/type_translator.mjs
import {
  BuiltinTypeName
} from "@angular/compiler";
import ts35 from "typescript";
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
        return ts35.createKeywordTypeNode(ts35.SyntaxKind.BooleanKeyword);
      case BuiltinTypeName.Dynamic:
        return ts35.createKeywordTypeNode(ts35.SyntaxKind.AnyKeyword);
      case BuiltinTypeName.Int:
      case BuiltinTypeName.Number:
        return ts35.createKeywordTypeNode(ts35.SyntaxKind.NumberKeyword);
      case BuiltinTypeName.String:
        return ts35.createKeywordTypeNode(ts35.SyntaxKind.StringKeyword);
      case BuiltinTypeName.None:
        return ts35.createKeywordTypeNode(ts35.SyntaxKind.NeverKeyword);
      default:
        throw new Error(`Unsupported builtin type: ${BuiltinTypeName[type.name]}`);
    }
  }
  visitExpressionType(type, context) {
    const typeNode = this.translateExpression(type.value, context);
    if (type.typeParams === null) {
      return typeNode;
    }
    if (!ts35.isTypeReferenceNode(typeNode)) {
      throw new Error("An ExpressionType with type arguments must translate into a TypeReferenceNode");
    } else if (typeNode.typeArguments !== void 0) {
      throw new Error(`An ExpressionType with type arguments cannot have multiple levels of type arguments`);
    }
    const typeArgs = type.typeParams.map((param) => this.translateType(param, context));
    return ts35.createTypeReferenceNode(typeNode.typeName, typeArgs);
  }
  visitArrayType(type, context) {
    return ts35.createArrayTypeNode(this.translateType(type.of, context));
  }
  visitMapType(type, context) {
    const parameter = ts35.createParameter(void 0, void 0, void 0, "key", void 0, ts35.createKeywordTypeNode(ts35.SyntaxKind.StringKeyword));
    const typeArgs = type.valueType !== null ? this.translateType(type.valueType, context) : ts35.createKeywordTypeNode(ts35.SyntaxKind.UnknownKeyword);
    const indexSignature = ts35.createIndexSignature(void 0, void 0, [parameter], typeArgs);
    return ts35.createTypeLiteralNode([indexSignature]);
  }
  visitReadVarExpr(ast, context) {
    if (ast.name === null) {
      throw new Error(`ReadVarExpr with no variable name in type`);
    }
    return ts35.createTypeQueryNode(ts35.createIdentifier(ast.name));
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
      return ts35.createLiteralTypeNode(ts35.createNull());
    } else if (ast.value === void 0) {
      return ts35.createKeywordTypeNode(ts35.SyntaxKind.UndefinedKeyword);
    } else if (typeof ast.value === "boolean") {
      return ts35.createLiteralTypeNode(ts35.createLiteral(ast.value));
    } else if (typeof ast.value === "number") {
      return ts35.createLiteralTypeNode(ts35.createLiteral(ast.value));
    } else {
      return ts35.createLiteralTypeNode(ts35.createLiteral(ast.value));
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
    const symbolIdentifier = ts35.createIdentifier(symbol);
    const typeName = moduleImport ? ts35.createQualifiedName(moduleImport, symbolIdentifier) : symbolIdentifier;
    const typeArguments = ast.typeParams !== null ? ast.typeParams.map((type) => this.translateType(type, context)) : void 0;
    return ts35.createTypeReferenceNode(typeName, typeArguments);
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
    return ts35.createTupleTypeNode(values);
  }
  visitLiteralMapExpr(ast, context) {
    const entries = ast.entries.map((entry) => {
      const { key, quoted } = entry;
      const type = this.translateExpression(entry.value, context);
      return ts35.createPropertySignature(void 0, quoted ? ts35.createStringLiteral(key) : key, void 0, type, void 0);
    });
    return ts35.createTypeLiteralNode(entries);
  }
  visitCommaExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitWrappedNodeExpr(ast, context) {
    const node = ast.node;
    if (ts35.isEntityName(node)) {
      return ts35.createTypeReferenceNode(node, void 0);
    } else if (ts35.isTypeNode(node)) {
      return node;
    } else if (ts35.isLiteralExpression(node)) {
      return ts35.createLiteralTypeNode(node);
    } else {
      throw new Error(`Unsupported WrappedNodeExpr in TypeTranslatorVisitor: ${ts35.SyntaxKind[node.kind]}`);
    }
  }
  visitTypeofExpr(ast, context) {
    const typeNode = this.translateExpression(ast.expr, context);
    if (!ts35.isTypeReferenceNode(typeNode)) {
      throw new Error(`The target of a typeof expression must be a type reference, but it was
          ${ts35.SyntaxKind[typeNode.kind]}`);
    }
    return ts35.createTypeQueryNode(typeNode.typeName);
  }
  translateType(type, context) {
    const typeNode = type.visitType(this, context);
    if (!ts35.isTypeNode(typeNode)) {
      throw new Error(`A Type must translate to a TypeNode, but was ${ts35.SyntaxKind[typeNode.kind]}`);
    }
    return typeNode;
  }
  translateExpression(expr, context) {
    const typeNode = expr.visitExpression(this, context);
    if (!ts35.isTypeNode(typeNode)) {
      throw new Error(`An Expression must translate to a TypeNode, but was ${ts35.SyntaxKind[typeNode.kind]}`);
    }
    return typeNode;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/translator/src/typescript_ast_factory.mjs
import ts36 from "typescript";
var PureAnnotation;
(function(PureAnnotation2) {
  PureAnnotation2["CLOSURE"] = "* @pureOrBreakMyCode ";
  PureAnnotation2["TERSER"] = "@__PURE__";
})(PureAnnotation || (PureAnnotation = {}));
var UNARY_OPERATORS3 = {
  "+": ts36.SyntaxKind.PlusToken,
  "-": ts36.SyntaxKind.MinusToken,
  "!": ts36.SyntaxKind.ExclamationToken
};
var BINARY_OPERATORS3 = {
  "&&": ts36.SyntaxKind.AmpersandAmpersandToken,
  ">": ts36.SyntaxKind.GreaterThanToken,
  ">=": ts36.SyntaxKind.GreaterThanEqualsToken,
  "&": ts36.SyntaxKind.AmpersandToken,
  "/": ts36.SyntaxKind.SlashToken,
  "==": ts36.SyntaxKind.EqualsEqualsToken,
  "===": ts36.SyntaxKind.EqualsEqualsEqualsToken,
  "<": ts36.SyntaxKind.LessThanToken,
  "<=": ts36.SyntaxKind.LessThanEqualsToken,
  "-": ts36.SyntaxKind.MinusToken,
  "%": ts36.SyntaxKind.PercentToken,
  "*": ts36.SyntaxKind.AsteriskToken,
  "!=": ts36.SyntaxKind.ExclamationEqualsToken,
  "!==": ts36.SyntaxKind.ExclamationEqualsEqualsToken,
  "||": ts36.SyntaxKind.BarBarToken,
  "+": ts36.SyntaxKind.PlusToken,
  "??": ts36.SyntaxKind.QuestionQuestionToken
};
var VAR_TYPES = {
  "const": ts36.NodeFlags.Const,
  "let": ts36.NodeFlags.Let,
  "var": ts36.NodeFlags.None
};
var TypeScriptAstFactory = class {
  constructor(annotateForClosureCompiler) {
    this.annotateForClosureCompiler = annotateForClosureCompiler;
    this.externalSourceFiles = new Map();
    this.attachComments = attachComments;
    this.createArrayLiteral = ts36.createArrayLiteral;
    this.createConditional = ts36.createConditional;
    this.createElementAccess = ts36.createElementAccess;
    this.createExpressionStatement = ts36.createExpressionStatement;
    this.createIdentifier = ts36.createIdentifier;
    this.createParenthesizedExpression = ts36.createParen;
    this.createPropertyAccess = ts36.createPropertyAccess;
    this.createThrowStatement = ts36.createThrow;
    this.createTypeOfExpression = ts36.createTypeOf;
  }
  createAssignment(target, value) {
    return ts36.createBinary(target, ts36.SyntaxKind.EqualsToken, value);
  }
  createBinaryExpression(leftOperand, operator, rightOperand) {
    return ts36.createBinary(leftOperand, BINARY_OPERATORS3[operator], rightOperand);
  }
  createBlock(body) {
    return ts36.createBlock(body);
  }
  createCallExpression(callee, args, pure) {
    const call = ts36.createCall(callee, void 0, args);
    if (pure) {
      ts36.addSyntheticLeadingComment(call, ts36.SyntaxKind.MultiLineCommentTrivia, this.annotateForClosureCompiler ? PureAnnotation.CLOSURE : PureAnnotation.TERSER, false);
    }
    return call;
  }
  createFunctionDeclaration(functionName, parameters, body) {
    if (!ts36.isBlock(body)) {
      throw new Error(`Invalid syntax, expected a block, but got ${ts36.SyntaxKind[body.kind]}.`);
    }
    return ts36.createFunctionDeclaration(void 0, void 0, void 0, functionName, void 0, parameters.map((param) => ts36.createParameter(void 0, void 0, void 0, param)), void 0, body);
  }
  createFunctionExpression(functionName, parameters, body) {
    if (!ts36.isBlock(body)) {
      throw new Error(`Invalid syntax, expected a block, but got ${ts36.SyntaxKind[body.kind]}.`);
    }
    return ts36.createFunctionExpression(void 0, void 0, functionName != null ? functionName : void 0, void 0, parameters.map((param) => ts36.createParameter(void 0, void 0, void 0, param)), void 0, body);
  }
  createIfStatement(condition, thenStatement, elseStatement) {
    return ts36.createIf(condition, thenStatement, elseStatement != null ? elseStatement : void 0);
  }
  createLiteral(value) {
    if (value === void 0) {
      return ts36.createIdentifier("undefined");
    } else if (value === null) {
      return ts36.createNull();
    } else {
      return ts36.createLiteral(value);
    }
  }
  createNewExpression(expression, args) {
    return ts36.createNew(expression, void 0, args);
  }
  createObjectLiteral(properties) {
    return ts36.createObjectLiteral(properties.map((prop) => ts36.createPropertyAssignment(prop.quoted ? ts36.createLiteral(prop.propertyName) : ts36.createIdentifier(prop.propertyName), prop.value)));
  }
  createReturnStatement(expression) {
    return ts36.createReturn(expression != null ? expression : void 0);
  }
  createTaggedTemplate(tag, template) {
    let templateLiteral;
    const length = template.elements.length;
    const head = template.elements[0];
    if (length === 1) {
      templateLiteral = ts36.createNoSubstitutionTemplateLiteral(head.cooked, head.raw);
    } else {
      const spans = [];
      for (let i = 1; i < length - 1; i++) {
        const { cooked, raw, range } = template.elements[i];
        const middle = createTemplateMiddle(cooked, raw);
        if (range !== null) {
          this.setSourceMapRange(middle, range);
        }
        spans.push(ts36.createTemplateSpan(template.expressions[i - 1], middle));
      }
      const resolvedExpression = template.expressions[length - 2];
      const templatePart = template.elements[length - 1];
      const templateTail = createTemplateTail(templatePart.cooked, templatePart.raw);
      if (templatePart.range !== null) {
        this.setSourceMapRange(templateTail, templatePart.range);
      }
      spans.push(ts36.createTemplateSpan(resolvedExpression, templateTail));
      templateLiteral = ts36.createTemplateExpression(ts36.createTemplateHead(head.cooked, head.raw), spans);
    }
    if (head.range !== null) {
      this.setSourceMapRange(templateLiteral, head.range);
    }
    return ts36.createTaggedTemplate(tag, templateLiteral);
  }
  createUnaryExpression(operator, operand) {
    return ts36.createPrefix(UNARY_OPERATORS3[operator], operand);
  }
  createVariableDeclaration(variableName, initializer, type) {
    return ts36.createVariableStatement(void 0, ts36.createVariableDeclarationList([ts36.createVariableDeclaration(variableName, void 0, initializer != null ? initializer : void 0)], VAR_TYPES[type]));
  }
  setSourceMapRange(node, sourceMapRange) {
    if (sourceMapRange === null) {
      return node;
    }
    const url = sourceMapRange.url;
    if (!this.externalSourceFiles.has(url)) {
      this.externalSourceFiles.set(url, ts36.createSourceMapSource(url, sourceMapRange.content, (pos) => pos));
    }
    const source = this.externalSourceFiles.get(url);
    ts36.setSourceMapRange(node, { pos: sourceMapRange.start.offset, end: sourceMapRange.end.offset, source });
    return node;
  }
};
function createTemplateMiddle(cooked, raw) {
  const node = ts36.createTemplateHead(cooked, raw);
  node.kind = ts36.SyntaxKind.TemplateMiddle;
  return node;
}
function createTemplateTail(cooked, raw) {
  const node = ts36.createTemplateHead(cooked, raw);
  node.kind = ts36.SyntaxKind.TemplateTail;
  return node;
}
function attachComments(statement, leadingComments) {
  for (const comment of leadingComments) {
    const commentKind = comment.multiline ? ts36.SyntaxKind.MultiLineCommentTrivia : ts36.SyntaxKind.SingleLineCommentTrivia;
    if (comment.multiline) {
      ts36.addSyntheticLeadingComment(statement, commentKind, comment.toString(), comment.trailingNewline);
    } else {
      for (const line of comment.toString().split("\n")) {
        ts36.addSyntheticLeadingComment(statement, commentKind, line, comment.trailingNewline);
      }
    }
  }
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/translator/src/typescript_translator.mjs
function translateStatement(statement, imports, options2 = {}) {
  return statement.visitStatement(new ExpressionTranslatorVisitor(new TypeScriptAstFactory(options2.annotateForClosureCompiler === true), imports, options2), new Context(true));
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/transform/src/utils.mjs
import ts37 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/transform/src/declaration.mjs
var DtsTransformRegistry = class {
  constructor() {
    this.ivyDeclarationTransforms = new Map();
  }
  getIvyDeclarationTransform(sf) {
    if (!this.ivyDeclarationTransforms.has(sf)) {
      this.ivyDeclarationTransforms.set(sf, new IvyDeclarationDtsTransform());
    }
    return this.ivyDeclarationTransforms.get(sf);
  }
  getAllTransforms(sf) {
    if (!sf.isDeclarationFile) {
      return null;
    }
    const originalSf = ts38.getOriginalNode(sf);
    let transforms = null;
    if (this.ivyDeclarationTransforms.has(originalSf)) {
      transforms = [];
      transforms.push(this.ivyDeclarationTransforms.get(originalSf));
    }
    return transforms;
  }
};
var IvyDeclarationDtsTransform = class {
  constructor() {
    this.declarationFields = new Map();
  }
  addFields(decl, fields) {
    this.declarationFields.set(decl, fields);
  }
  transformClass(clazz, members, imports) {
    const original = ts38.getOriginalNode(clazz);
    if (!this.declarationFields.has(original)) {
      return clazz;
    }
    const fields = this.declarationFields.get(original);
    const newMembers = fields.map((decl) => {
      const modifiers = [ts38.createModifier(ts38.SyntaxKind.StaticKeyword)];
      const typeRef = translateType(decl.type, imports);
      markForEmitAsSingleLine(typeRef);
      return ts38.createProperty(void 0, modifiers, decl.name, void 0, typeRef, void 0);
    });
    return ts38.updateClassDeclaration(clazz, clazz.decorators, clazz.modifiers, clazz.name, clazz.typeParameters, clazz.heritageClauses, [...members, ...newMembers]);
  }
};
function markForEmitAsSingleLine(node) {
  ts38.setEmitFlags(node, ts38.EmitFlags.SingleLine);
  ts38.forEachChild(node, markForEmitAsSingleLine);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/transform/src/transform.mjs
import { ConstantPool } from "@angular/compiler";
import ts40 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/util/src/visitor.mjs
import ts39 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/transform/src/transform.mjs
var NO_DECORATORS = new Set();

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/diagnostics.mjs
import ts42 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/util.mjs
import { ExternalExpr as ExternalExpr4, LiteralExpr, ParseLocation, ParseSourceFile, ParseSourceSpan, ReadPropExpr, WrappedNodeExpr as WrappedNodeExpr2 } from "@angular/compiler";
import ts41 from "typescript";
function getConstructorDependencies(clazz, reflector, isCore) {
  const deps = [];
  const errors = [];
  let ctorParams = reflector.getConstructorParameters(clazz);
  if (ctorParams === null) {
    if (reflector.hasBaseClass(clazz)) {
      return null;
    } else {
      ctorParams = [];
    }
  }
  ctorParams.forEach((param, idx) => {
    let token = valueReferenceToExpression(param.typeValueReference);
    let attributeNameType = null;
    let optional = false, self = false, skipSelf = false, host = false;
    (param.decorators || []).filter((dec) => isCore || isAngularCore(dec)).forEach((dec) => {
      const name = isCore || dec.import === null ? dec.name : dec.import.name;
      if (name === "Inject") {
        if (dec.args === null || dec.args.length !== 1) {
          throw new FatalDiagnosticError(ErrorCode.DECORATOR_ARITY_WRONG, Decorator.nodeForError(dec), `Unexpected number of arguments to @Inject().`);
        }
        token = new WrappedNodeExpr2(dec.args[0]);
      } else if (name === "Optional") {
        optional = true;
      } else if (name === "SkipSelf") {
        skipSelf = true;
      } else if (name === "Self") {
        self = true;
      } else if (name === "Host") {
        host = true;
      } else if (name === "Attribute") {
        if (dec.args === null || dec.args.length !== 1) {
          throw new FatalDiagnosticError(ErrorCode.DECORATOR_ARITY_WRONG, Decorator.nodeForError(dec), `Unexpected number of arguments to @Attribute().`);
        }
        const attributeName = dec.args[0];
        token = new WrappedNodeExpr2(attributeName);
        if (ts41.isStringLiteralLike(attributeName)) {
          attributeNameType = new LiteralExpr(attributeName.text);
        } else {
          attributeNameType = new WrappedNodeExpr2(ts41.createKeywordTypeNode(ts41.SyntaxKind.UnknownKeyword));
        }
      } else {
        throw new FatalDiagnosticError(ErrorCode.DECORATOR_UNEXPECTED, Decorator.nodeForError(dec), `Unexpected decorator ${name} on parameter.`);
      }
    });
    if (token === null) {
      if (param.typeValueReference.kind !== 2) {
        throw new Error("Illegal state: expected value reference to be unavailable if no token is present");
      }
      errors.push({
        index: idx,
        param,
        reason: param.typeValueReference.reason
      });
    } else {
      deps.push({ token, attributeNameType, optional, self, skipSelf, host });
    }
  });
  if (errors.length === 0) {
    return { deps };
  } else {
    return { deps: null, errors };
  }
}
function valueReferenceToExpression(valueRef) {
  if (valueRef.kind === 2) {
    return null;
  } else if (valueRef.kind === 0) {
    const expr = new WrappedNodeExpr2(valueRef.expression);
    if (valueRef.defaultImportStatement !== null) {
      attachDefaultImportDeclaration(expr, valueRef.defaultImportStatement);
    }
    return expr;
  } else {
    let importExpr = new ExternalExpr4({ moduleName: valueRef.moduleName, name: valueRef.importedName });
    if (valueRef.nestedPath !== null) {
      for (const property2 of valueRef.nestedPath) {
        importExpr = new ReadPropExpr(importExpr, property2);
      }
    }
    return importExpr;
  }
}
function unwrapConstructorDependencies(deps) {
  if (deps === null) {
    return null;
  } else if (deps.deps !== null) {
    return deps.deps;
  } else {
    return "invalid";
  }
}
function getValidConstructorDependencies(clazz, reflector, isCore) {
  return validateConstructorDependencies(clazz, getConstructorDependencies(clazz, reflector, isCore));
}
function validateConstructorDependencies(clazz, deps) {
  if (deps === null) {
    return null;
  } else if (deps.deps !== null) {
    return deps.deps;
  } else {
    const error2 = deps.errors[0];
    throw createUnsuitableInjectionTokenError(clazz, error2);
  }
}
function createUnsuitableInjectionTokenError(clazz, error2) {
  const { param, index, reason } = error2;
  let chainMessage = void 0;
  let hints = void 0;
  switch (reason.kind) {
    case 5:
      chainMessage = "Consider using the @Inject decorator to specify an injection token.";
      hints = [
        makeRelatedInformation(reason.typeNode, "This type is not supported as injection token.")
      ];
      break;
    case 1:
      chainMessage = "Consider using the @Inject decorator to specify an injection token.";
      hints = [
        makeRelatedInformation(reason.typeNode, "This type does not have a value, so it cannot be used as injection token.")
      ];
      if (reason.decl !== null) {
        hints.push(makeRelatedInformation(reason.decl, "The type is declared here."));
      }
      break;
    case 2:
      chainMessage = "Consider changing the type-only import to a regular import, or use the @Inject decorator to specify an injection token.";
      hints = [
        makeRelatedInformation(reason.typeNode, "This type is imported using a type-only import, which prevents it from being usable as an injection token."),
        makeRelatedInformation(reason.importClause, "The type-only import occurs here.")
      ];
      break;
    case 4:
      chainMessage = "Consider using the @Inject decorator to specify an injection token.";
      hints = [
        makeRelatedInformation(reason.typeNode, "This type corresponds with a namespace, which cannot be used as injection token."),
        makeRelatedInformation(reason.importClause, "The namespace import occurs here.")
      ];
      break;
    case 3:
      chainMessage = "The type should reference a known declaration.";
      hints = [makeRelatedInformation(reason.typeNode, "This type could not be resolved.")];
      break;
    case 0:
      chainMessage = "Consider adding a type to the parameter or use the @Inject decorator to specify an injection token.";
      break;
  }
  const chain = {
    messageText: `No suitable injection token for parameter '${param.name || index}' of class '${clazz.name.text}'.`,
    category: ts41.DiagnosticCategory.Error,
    code: 0,
    next: [{
      messageText: chainMessage,
      category: ts41.DiagnosticCategory.Message,
      code: 0
    }]
  };
  return new FatalDiagnosticError(ErrorCode.PARAM_MISSING_TOKEN, param.nameNode, chain, hints);
}
function toR3Reference(valueRef, typeRef, valueContext, typeContext, refEmitter) {
  return {
    value: refEmitter.emit(valueRef, valueContext).expression,
    type: refEmitter.emit(typeRef, typeContext, ImportFlags.ForceNewImport | ImportFlags.AllowTypeImports).expression
  };
}
function isAngularCore(decorator) {
  return decorator.import !== null && decorator.import.from === "@angular/core";
}
function isAngularCoreReference(reference, symbolName) {
  return reference.ownedByModuleGuess === "@angular/core" && reference.debugName === symbolName;
}
function findAngularDecorator(decorators, name, isCore) {
  return decorators.find((decorator) => isAngularDecorator(decorator, name, isCore));
}
function isAngularDecorator(decorator, name, isCore) {
  if (isCore) {
    return decorator.name === name;
  } else if (isAngularCore(decorator)) {
    return decorator.import.name === name;
  }
  return false;
}
function unwrapExpression(node) {
  while (ts41.isAsExpression(node) || ts41.isParenthesizedExpression(node)) {
    node = node.expression;
  }
  return node;
}
function expandForwardRef(arg) {
  arg = unwrapExpression(arg);
  if (!ts41.isArrowFunction(arg) && !ts41.isFunctionExpression(arg)) {
    return null;
  }
  const body = arg.body;
  if (ts41.isBlock(body)) {
    if (body.statements.length !== 1) {
      return null;
    }
    const stmt = body.statements[0];
    if (!ts41.isReturnStatement(stmt) || stmt.expression === void 0) {
      return null;
    }
    return stmt.expression;
  } else {
    return body;
  }
}
function tryUnwrapForwardRef(node, reflector) {
  node = unwrapExpression(node);
  if (!ts41.isCallExpression(node) || node.arguments.length !== 1) {
    return null;
  }
  const fn = ts41.isPropertyAccessExpression(node.expression) ? node.expression.name : node.expression;
  if (!ts41.isIdentifier(fn)) {
    return null;
  }
  const expr = expandForwardRef(node.arguments[0]);
  if (expr === null) {
    return null;
  }
  const imp = reflector.getImportOfIdentifier(fn);
  if (imp === null || imp.from !== "@angular/core" || imp.name !== "forwardRef") {
    return null;
  }
  return expr;
}
function forwardRefResolver(ref, args) {
  if (!isAngularCoreReference(ref, "forwardRef") || args.length !== 1) {
    return null;
  }
  return expandForwardRef(args[0]);
}
function combineResolvers(resolvers) {
  return (ref, args) => {
    for (const resolver of resolvers) {
      const resolved = resolver(ref, args);
      if (resolved !== null) {
        return resolved;
      }
    }
    return null;
  };
}
function isExpressionForwardReference(expr, context, contextSource) {
  if (isWrappedTsNodeExpr(expr)) {
    const node = ts41.getOriginalNode(expr.node);
    return node.getSourceFile() === contextSource && context.pos < node.pos;
  } else {
    return false;
  }
}
function isWrappedTsNodeExpr(expr) {
  return expr instanceof WrappedNodeExpr2;
}
function readBaseClass2(node, reflector, evaluator) {
  const baseExpression = reflector.getBaseClassExpression(node);
  if (baseExpression !== null) {
    const baseClass = evaluator.evaluate(baseExpression);
    if (baseClass instanceof Reference && reflector.isClass(baseClass.node)) {
      return baseClass;
    } else {
      return "dynamic";
    }
  }
  return null;
}
var parensWrapperTransformerFactory = (context) => {
  const visitor = (node) => {
    const visited = ts41.visitEachChild(node, visitor, context);
    if (ts41.isArrowFunction(visited) || ts41.isFunctionExpression(visited)) {
      return ts41.createParen(visited);
    }
    return visited;
  };
  return (node) => ts41.visitEachChild(node, visitor, context);
};
function wrapFunctionExpressionsInParens(expression) {
  return ts41.transform(expression, [parensWrapperTransformerFactory]).transformed[0];
}
function makeDuplicateDeclarationError(node, data, kind) {
  const context = [];
  for (const decl of data) {
    if (decl.rawDeclarations === null) {
      continue;
    }
    const contextNode = decl.ref.getOriginForDiagnostics(decl.rawDeclarations, decl.ngModule.name);
    context.push(makeRelatedInformation(contextNode, `'${node.name.text}' is listed in the declarations of the NgModule '${decl.ngModule.name.text}'.`));
  }
  return makeDiagnostic(ErrorCode.NGMODULE_DECLARATION_NOT_UNIQUE, node.name, `The ${kind} '${node.name.text}' is declared by more than one NgModule.`, context);
}
function resolveProvidersRequiringFactory(rawProviders, reflector, evaluator) {
  const providers = new Set();
  const resolvedProviders = evaluator.evaluate(rawProviders);
  if (!Array.isArray(resolvedProviders)) {
    return providers;
  }
  resolvedProviders.forEach(function processProviders(provider) {
    let tokenClass = null;
    if (Array.isArray(provider)) {
      provider.forEach(processProviders);
    } else if (provider instanceof Reference) {
      tokenClass = provider;
    } else if (provider instanceof Map && provider.has("useClass") && !provider.has("deps")) {
      const useExisting = provider.get("useClass");
      if (useExisting instanceof Reference) {
        tokenClass = useExisting;
      }
    }
    if (tokenClass !== null && !tokenClass.node.getSourceFile().isDeclarationFile && reflector.isClass(tokenClass.node)) {
      const constructorParameters = reflector.getConstructorParameters(tokenClass.node);
      if (constructorParameters !== null && constructorParameters.length > 0) {
        providers.add(tokenClass);
      }
    }
  });
  return providers;
}
function wrapTypeReference(reflector, clazz) {
  const dtsClass = reflector.getDtsDeclaration(clazz);
  const value = new WrappedNodeExpr2(clazz.name);
  const type = dtsClass !== null && isNamedClassDeclaration(dtsClass) ? new WrappedNodeExpr2(dtsClass.name) : value;
  return { value, type };
}
function createSourceSpan(node) {
  const sf = node.getSourceFile();
  const [startOffset, endOffset] = [node.getStart(), node.getEnd()];
  const { line: startLine, character: startCol } = sf.getLineAndCharacterOfPosition(startOffset);
  const { line: endLine, character: endCol } = sf.getLineAndCharacterOfPosition(endOffset);
  const parseSf = new ParseSourceFile(sf.getFullText(), sf.fileName);
  return new ParseSourceSpan(new ParseLocation(parseSf, startOffset, startLine + 1, startCol + 1), new ParseLocation(parseSf, endOffset, endLine + 1, endCol + 1));
}
function compileResults(fac, def, metadataStmt, propName) {
  const statements = def.statements;
  if (metadataStmt !== null) {
    statements.push(metadataStmt);
  }
  return [
    fac,
    {
      name: propName,
      initializer: def.expression,
      statements: def.statements,
      type: def.type
    }
  ];
}
function toFactoryMetadata(meta, target) {
  return {
    name: meta.name,
    type: meta.type,
    internalType: meta.internalType,
    typeArgumentCount: meta.typeArgumentCount,
    deps: meta.deps,
    target
  };
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/diagnostics.mjs
function createValueHasWrongTypeError(node, value, messageText) {
  var _a;
  let chainedMessage;
  let relatedInformation;
  if (value instanceof DynamicValue) {
    chainedMessage = "Value could not be determined statically.";
    relatedInformation = traceDynamicValue(node, value);
  } else if (value instanceof Reference) {
    const target = value.debugName !== null ? `'${value.debugName}'` : "an anonymous declaration";
    chainedMessage = `Value is a reference to ${target}.`;
    const referenceNode = (_a = identifierOfNode(value.node)) != null ? _a : value.node;
    relatedInformation = [makeRelatedInformation(referenceNode, "Reference is declared here.")];
  } else {
    chainedMessage = `Value is of type '${describeResolvedType(value)}'.`;
  }
  const chain = {
    messageText,
    category: ts42.DiagnosticCategory.Error,
    code: 0,
    next: [{
      messageText: chainedMessage,
      category: ts42.DiagnosticCategory.Message,
      code: 0
    }]
  };
  return new FatalDiagnosticError(ErrorCode.VALUE_HAS_WRONG_TYPE, node, chain, relatedInformation);
}
function getProviderDiagnostics(providerClasses, providersDeclaration, registry) {
  const diagnostics = [];
  for (const provider of providerClasses) {
    if (registry.isInjectable(provider.node)) {
      continue;
    }
    const contextNode = provider.getOriginForDiagnostics(providersDeclaration);
    diagnostics.push(makeDiagnostic(ErrorCode.UNDECORATED_PROVIDER, contextNode, `The class '${provider.node.name.text}' cannot be created via dependency injection, as it does not have an Angular decorator. This will result in an error at runtime.

Either add the @Injectable() decorator to '${provider.node.name.text}', or configure a different provider (such as a provider with 'useFactory').
`, [makeRelatedInformation(provider.node, `'${provider.node.name.text}' is declared here.`)]));
  }
  return diagnostics;
}
function getDirectiveDiagnostics(node, reader, evaluator, reflector, scopeRegistry, kind) {
  let diagnostics = [];
  const addDiagnostics = (more) => {
    if (more === null) {
      return;
    } else if (diagnostics === null) {
      diagnostics = Array.isArray(more) ? more : [more];
    } else if (Array.isArray(more)) {
      diagnostics.push(...more);
    } else {
      diagnostics.push(more);
    }
  };
  const duplicateDeclarations = scopeRegistry.getDuplicateDeclarations(node);
  if (duplicateDeclarations !== null) {
    addDiagnostics(makeDuplicateDeclarationError(node, duplicateDeclarations, kind));
  }
  addDiagnostics(checkInheritanceOfDirective(node, reader, reflector, evaluator));
  return diagnostics;
}
function getUndecoratedClassWithAngularFeaturesDiagnostic(node) {
  return makeDiagnostic(ErrorCode.UNDECORATED_CLASS_USING_ANGULAR_FEATURES, node.name, `Class is using Angular features but is not decorated. Please add an explicit Angular decorator.`);
}
function checkInheritanceOfDirective(node, reader, reflector, evaluator) {
  if (!reflector.isClass(node) || reflector.getConstructorParameters(node) !== null) {
    return null;
  }
  let baseClass = readBaseClass2(node, reflector, evaluator);
  while (baseClass !== null) {
    if (baseClass === "dynamic") {
      return null;
    }
    const baseClassMeta = reader.getDirectiveMetadata(baseClass);
    if (baseClassMeta !== null) {
      return null;
    }
    const baseClassConstructorParams = reflector.getConstructorParameters(baseClass.node);
    const newParentClass = readBaseClass2(baseClass.node, reflector, evaluator);
    if (baseClassConstructorParams !== null && baseClassConstructorParams.length > 0) {
      return getInheritedUndecoratedCtorDiagnostic(node, baseClass, reader);
    } else if (baseClassConstructorParams !== null || newParentClass === null) {
      return null;
    }
    baseClass = newParentClass;
  }
  return null;
}
function getInheritedUndecoratedCtorDiagnostic(node, baseClass, reader) {
  const subclassMeta = reader.getDirectiveMetadata(new Reference(node));
  const dirOrComp = subclassMeta.isComponent ? "Component" : "Directive";
  const baseClassName = baseClass.debugName;
  return makeDiagnostic(ErrorCode.DIRECTIVE_INHERITS_UNDECORATED_CTOR, node.name, `The ${dirOrComp.toLowerCase()} ${node.name.text} inherits its constructor from ${baseClassName}, but the latter does not have an Angular decorator of its own. Dependency injection will not be able to resolve the parameters of ${baseClassName}'s constructor. Either add a @Directive decorator to ${baseClassName}, or add an explicit constructor to ${node.name.text}.`);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/directive.mjs
import { compileClassMetadata, compileDeclareClassMetadata, compileDeclareDirectiveFromMetadata, compileDirectiveFromMetadata, emitDistinctChangesOnlyDefaultValue, ExternalExpr as ExternalExpr5, FactoryTarget, getSafePropertyAccessString, makeBindingParser, parseHostBindings, verifyHostBindings, WrappedNodeExpr as WrappedNodeExpr4 } from "@angular/compiler";
import ts44 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/factory.mjs
import { compileDeclareFactoryFunction, compileFactoryFunction } from "@angular/compiler";
function compileNgFactoryDefField(metadata) {
  const res = compileFactoryFunction(metadata);
  return { name: "\u0275fac", initializer: res.expression, statements: res.statements, type: res.type };
}
function compileDeclareFactory(metadata) {
  const res = compileDeclareFactoryFunction(metadata);
  return { name: "\u0275fac", initializer: res.expression, statements: res.statements, type: res.type };
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/metadata.mjs
import { FunctionExpr, LiteralArrayExpr, LiteralExpr as LiteralExpr2, literalMap, ReturnStatement, WrappedNodeExpr as WrappedNodeExpr3 } from "@angular/compiler";
import ts43 from "typescript";
function extractClassMetadata(clazz, reflection, isCore, annotateForClosureCompiler, angularDecoratorTransform = (dec) => dec) {
  if (!reflection.isClass(clazz)) {
    return null;
  }
  const id = reflection.getAdjacentNameOfClass(clazz);
  const classDecorators = reflection.getDecoratorsOfDeclaration(clazz);
  if (classDecorators === null) {
    return null;
  }
  const ngClassDecorators = classDecorators.filter((dec) => isAngularDecorator2(dec, isCore)).map((decorator) => decoratorToMetadata(angularDecoratorTransform(decorator), annotateForClosureCompiler)).map((decorator) => removeIdentifierReferences(decorator, id.text));
  if (ngClassDecorators.length === 0) {
    return null;
  }
  const metaDecorators = new WrappedNodeExpr3(ts43.createArrayLiteral(ngClassDecorators));
  let metaCtorParameters = null;
  const classCtorParameters = reflection.getConstructorParameters(clazz);
  if (classCtorParameters !== null) {
    const ctorParameters = classCtorParameters.map((param) => ctorParameterToMetadata(param, isCore));
    metaCtorParameters = new FunctionExpr([], [
      new ReturnStatement(new LiteralArrayExpr(ctorParameters))
    ]);
  }
  let metaPropDecorators = null;
  const classMembers = reflection.getMembersOfClass(clazz).filter((member) => !member.isStatic && member.decorators !== null && member.decorators.length > 0);
  const duplicateDecoratedMemberNames = classMembers.map((member) => member.name).filter((name, i, arr) => arr.indexOf(name) < i);
  if (duplicateDecoratedMemberNames.length > 0) {
    throw new Error(`Duplicate decorated properties found on class '${clazz.name.text}': ` + duplicateDecoratedMemberNames.join(", "));
  }
  const decoratedMembers = classMembers.map((member) => {
    var _a;
    return classMemberToMetadata((_a = member.nameNode) != null ? _a : member.name, member.decorators, isCore);
  });
  if (decoratedMembers.length > 0) {
    metaPropDecorators = new WrappedNodeExpr3(ts43.createObjectLiteral(decoratedMembers));
  }
  return {
    type: new WrappedNodeExpr3(id),
    decorators: metaDecorators,
    ctorParameters: metaCtorParameters,
    propDecorators: metaPropDecorators
  };
}
function ctorParameterToMetadata(param, isCore) {
  const type = param.typeValueReference.kind !== 2 ? valueReferenceToExpression(param.typeValueReference) : new LiteralExpr2(void 0);
  const mapEntries = [
    { key: "type", value: type, quoted: false }
  ];
  if (param.decorators !== null) {
    const ngDecorators = param.decorators.filter((dec) => isAngularDecorator2(dec, isCore)).map((decorator) => decoratorToMetadata(decorator));
    const value = new WrappedNodeExpr3(ts43.createArrayLiteral(ngDecorators));
    mapEntries.push({ key: "decorators", value, quoted: false });
  }
  return literalMap(mapEntries);
}
function classMemberToMetadata(name, decorators, isCore) {
  const ngDecorators = decorators.filter((dec) => isAngularDecorator2(dec, isCore)).map((decorator) => decoratorToMetadata(decorator));
  const decoratorMeta = ts43.createArrayLiteral(ngDecorators);
  return ts43.createPropertyAssignment(name, decoratorMeta);
}
function decoratorToMetadata(decorator, wrapFunctionsInParens) {
  if (decorator.identifier === null) {
    throw new Error("Illegal state: synthesized decorator cannot be emitted in class metadata.");
  }
  const properties = [
    ts43.createPropertyAssignment("type", ts43.getMutableClone(decorator.identifier))
  ];
  if (decorator.args !== null && decorator.args.length > 0) {
    const args = decorator.args.map((arg) => {
      const expr = ts43.getMutableClone(arg);
      return wrapFunctionsInParens ? wrapFunctionExpressionsInParens(expr) : expr;
    });
    properties.push(ts43.createPropertyAssignment("args", ts43.createArrayLiteral(args)));
  }
  return ts43.createObjectLiteral(properties, true);
}
function isAngularDecorator2(decorator, isCore) {
  return isCore || decorator.import !== null && decorator.import.from === "@angular/core";
}
function removeIdentifierReferences(node, name) {
  const result = ts43.transform(node, [(context) => (root) => ts43.visitNode(root, function walk(current) {
    return ts43.isIdentifier(current) && current.text === name ? ts43.createIdentifier(current.text) : ts43.visitEachChild(current, walk, context);
  })]);
  return result.transformed[0];
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/directive.mjs
var EMPTY_OBJECT = {};
var FIELD_DECORATORS = [
  "Input",
  "Output",
  "ViewChild",
  "ViewChildren",
  "ContentChild",
  "ContentChildren",
  "HostBinding",
  "HostListener"
];
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
var DirectiveSymbol = class extends SemanticSymbol {
  constructor(decl, selector, inputs, outputs, exportAs, typeCheckMeta, typeParameters) {
    super(decl);
    this.selector = selector;
    this.inputs = inputs;
    this.outputs = outputs;
    this.exportAs = exportAs;
    this.typeCheckMeta = typeCheckMeta;
    this.typeParameters = typeParameters;
    this.baseClass = null;
  }
  isPublicApiAffected(previousSymbol) {
    if (!(previousSymbol instanceof DirectiveSymbol)) {
      return true;
    }
    return this.selector !== previousSymbol.selector || !isArrayEqual(this.inputs.propertyNames, previousSymbol.inputs.propertyNames) || !isArrayEqual(this.outputs.propertyNames, previousSymbol.outputs.propertyNames) || !isArrayEqual(this.exportAs, previousSymbol.exportAs);
  }
  isTypeCheckApiAffected(previousSymbol) {
    if (this.isPublicApiAffected(previousSymbol)) {
      return true;
    }
    if (!(previousSymbol instanceof DirectiveSymbol)) {
      return true;
    }
    if (!isArrayEqual(Array.from(this.inputs), Array.from(previousSymbol.inputs), isInputMappingEqual) || !isArrayEqual(Array.from(this.outputs), Array.from(previousSymbol.outputs), isInputMappingEqual)) {
      return true;
    }
    if (!areTypeParametersEqual(this.typeParameters, previousSymbol.typeParameters)) {
      return true;
    }
    if (!isTypeCheckMetaEqual(this.typeCheckMeta, previousSymbol.typeCheckMeta)) {
      return true;
    }
    if (!isBaseClassEqual(this.baseClass, previousSymbol.baseClass)) {
      return true;
    }
    return false;
  }
};
function isInputMappingEqual(current, previous) {
  return current[0] === previous[0] && current[1] === previous[1];
}
function isTypeCheckMetaEqual(current, previous) {
  if (current.hasNgTemplateContextGuard !== previous.hasNgTemplateContextGuard) {
    return false;
  }
  if (current.isGeneric !== previous.isGeneric) {
    return false;
  }
  if (!isArrayEqual(current.ngTemplateGuards, previous.ngTemplateGuards, isTemplateGuardEqual)) {
    return false;
  }
  if (!isSetEqual(current.coercedInputFields, previous.coercedInputFields)) {
    return false;
  }
  if (!isSetEqual(current.restrictedInputFields, previous.restrictedInputFields)) {
    return false;
  }
  if (!isSetEqual(current.stringLiteralInputFields, previous.stringLiteralInputFields)) {
    return false;
  }
  if (!isSetEqual(current.undeclaredInputFields, previous.undeclaredInputFields)) {
    return false;
  }
  return true;
}
function isTemplateGuardEqual(current, previous) {
  return current.inputName === previous.inputName && current.type === previous.type;
}
function isBaseClassEqual(current, previous) {
  if (current === null || previous === null) {
    return current === previous;
  }
  return isSymbolEqual(current, previous);
}
var DirectiveDecoratorHandler = class {
  constructor(reflector, evaluator, metaRegistry, scopeRegistry, metaReader, injectableRegistry, isCore, semanticDepGraphUpdater, annotateForClosureCompiler, compileUndecoratedClassesWithAngularFeatures, perf) {
    this.reflector = reflector;
    this.evaluator = evaluator;
    this.metaRegistry = metaRegistry;
    this.scopeRegistry = scopeRegistry;
    this.metaReader = metaReader;
    this.injectableRegistry = injectableRegistry;
    this.isCore = isCore;
    this.semanticDepGraphUpdater = semanticDepGraphUpdater;
    this.annotateForClosureCompiler = annotateForClosureCompiler;
    this.compileUndecoratedClassesWithAngularFeatures = compileUndecoratedClassesWithAngularFeatures;
    this.perf = perf;
    this.precedence = HandlerPrecedence.PRIMARY;
    this.name = DirectiveDecoratorHandler.name;
  }
  detect(node, decorators) {
    if (!decorators) {
      const angularField = this.findClassFieldWithAngularFeatures(node);
      return angularField ? { trigger: angularField.node, decorator: null, metadata: null } : void 0;
    } else {
      const decorator = findAngularDecorator(decorators, "Directive", this.isCore);
      return decorator ? { trigger: decorator.node, decorator, metadata: decorator } : void 0;
    }
  }
  analyze(node, decorator, flags = HandlerFlags.NONE) {
    if (this.compileUndecoratedClassesWithAngularFeatures === false && decorator === null) {
      return { diagnostics: [getUndecoratedClassWithAngularFeaturesDiagnostic(node)] };
    }
    this.perf.eventCount(PerfEvent.AnalyzeDirective);
    const directiveResult = extractDirectiveMetadata(node, decorator, this.reflector, this.evaluator, this.isCore, flags, this.annotateForClosureCompiler);
    if (directiveResult === void 0) {
      return {};
    }
    const analysis = directiveResult.metadata;
    let providersRequiringFactory = null;
    if (directiveResult !== void 0 && directiveResult.decorator.has("providers")) {
      providersRequiringFactory = resolveProvidersRequiringFactory(directiveResult.decorator.get("providers"), this.reflector, this.evaluator);
    }
    return {
      analysis: {
        inputs: directiveResult.inputs,
        outputs: directiveResult.outputs,
        meta: analysis,
        classMetadata: extractClassMetadata(node, this.reflector, this.isCore, this.annotateForClosureCompiler),
        baseClass: readBaseClass2(node, this.reflector, this.evaluator),
        typeCheckMeta: extractDirectiveTypeCheckMeta(node, directiveResult.inputs, this.reflector),
        providersRequiringFactory,
        isPoisoned: false,
        isStructural: directiveResult.isStructural
      }
    };
  }
  symbol(node, analysis) {
    const typeParameters = extractSemanticTypeParameters(node);
    return new DirectiveSymbol(node, analysis.meta.selector, analysis.inputs, analysis.outputs, analysis.meta.exportAs, analysis.typeCheckMeta, typeParameters);
  }
  register(node, analysis) {
    const ref = new Reference(node);
    this.metaRegistry.registerDirectiveMetadata(__spreadProps(__spreadValues({
      type: MetaType.Directive,
      ref,
      name: node.name.text,
      selector: analysis.meta.selector,
      exportAs: analysis.meta.exportAs,
      inputs: analysis.inputs,
      outputs: analysis.outputs,
      queries: analysis.meta.queries.map((query) => query.propertyName),
      isComponent: false,
      baseClass: analysis.baseClass
    }, analysis.typeCheckMeta), {
      isPoisoned: analysis.isPoisoned,
      isStructural: analysis.isStructural
    }));
    this.injectableRegistry.registerInjectable(node);
  }
  resolve(node, analysis, symbol) {
    if (this.semanticDepGraphUpdater !== null && analysis.baseClass instanceof Reference) {
      symbol.baseClass = this.semanticDepGraphUpdater.getSymbol(analysis.baseClass.node);
    }
    const diagnostics = [];
    if (analysis.providersRequiringFactory !== null && analysis.meta.providers instanceof WrappedNodeExpr4) {
      const providerDiagnostics = getProviderDiagnostics(analysis.providersRequiringFactory, analysis.meta.providers.node, this.injectableRegistry);
      diagnostics.push(...providerDiagnostics);
    }
    const directiveDiagnostics = getDirectiveDiagnostics(node, this.metaReader, this.evaluator, this.reflector, this.scopeRegistry, "Directive");
    if (directiveDiagnostics !== null) {
      diagnostics.push(...directiveDiagnostics);
    }
    return { diagnostics: diagnostics.length > 0 ? diagnostics : void 0 };
  }
  compileFull(node, analysis, resolution, pool) {
    const fac = compileNgFactoryDefField(toFactoryMetadata(analysis.meta, FactoryTarget.Directive));
    const def = compileDirectiveFromMetadata(analysis.meta, pool, makeBindingParser());
    const classMetadata = analysis.classMetadata !== null ? compileClassMetadata(analysis.classMetadata).toStmt() : null;
    return compileResults(fac, def, classMetadata, "\u0275dir");
  }
  compilePartial(node, analysis, resolution) {
    const fac = compileDeclareFactory(toFactoryMetadata(analysis.meta, FactoryTarget.Directive));
    const def = compileDeclareDirectiveFromMetadata(analysis.meta);
    const classMetadata = analysis.classMetadata !== null ? compileDeclareClassMetadata(analysis.classMetadata).toStmt() : null;
    return compileResults(fac, def, classMetadata, "\u0275dir");
  }
  findClassFieldWithAngularFeatures(node) {
    return this.reflector.getMembersOfClass(node).find((member) => {
      if (!member.isStatic && member.kind === ClassMemberKind.Method && LIFECYCLE_HOOKS.has(member.name)) {
        return true;
      }
      if (member.decorators) {
        return member.decorators.some((decorator) => FIELD_DECORATORS.some((decoratorName) => isAngularDecorator(decorator, decoratorName, this.isCore)));
      }
      return false;
    });
  }
};
function extractDirectiveMetadata(clazz, decorator, reflector, evaluator, isCore, flags, annotateForClosureCompiler, defaultSelector = null) {
  let directive;
  if (decorator === null || decorator.args === null || decorator.args.length === 0) {
    directive = new Map();
  } else if (decorator.args.length !== 1) {
    throw new FatalDiagnosticError(ErrorCode.DECORATOR_ARITY_WRONG, Decorator.nodeForError(decorator), `Incorrect number of arguments to @${decorator.name} decorator`);
  } else {
    const meta = unwrapExpression(decorator.args[0]);
    if (!ts44.isObjectLiteralExpression(meta)) {
      throw new FatalDiagnosticError(ErrorCode.DECORATOR_ARG_NOT_LITERAL, meta, `@${decorator.name} argument must be an object literal`);
    }
    directive = reflectObjectLiteral(meta);
  }
  if (directive.has("jit")) {
    return void 0;
  }
  const members = reflector.getMembersOfClass(clazz);
  const decoratedElements = members.filter((member) => !member.isStatic && member.decorators !== null);
  const coreModule = isCore ? void 0 : "@angular/core";
  const inputsFromMeta = parseFieldToPropertyMapping(directive, "inputs", evaluator);
  const inputsFromFields = parseDecoratedFields(filterToMembersWithDecorator(decoratedElements, "Input", coreModule), evaluator, resolveInput);
  const outputsFromMeta = parseFieldToPropertyMapping(directive, "outputs", evaluator);
  const outputsFromFields = parseDecoratedFields(filterToMembersWithDecorator(decoratedElements, "Output", coreModule), evaluator, resolveOutput);
  const contentChildFromFields = queriesFromFields(filterToMembersWithDecorator(decoratedElements, "ContentChild", coreModule), reflector, evaluator);
  const contentChildrenFromFields = queriesFromFields(filterToMembersWithDecorator(decoratedElements, "ContentChildren", coreModule), reflector, evaluator);
  const queries = [...contentChildFromFields, ...contentChildrenFromFields];
  const viewChildFromFields = queriesFromFields(filterToMembersWithDecorator(decoratedElements, "ViewChild", coreModule), reflector, evaluator);
  const viewChildrenFromFields = queriesFromFields(filterToMembersWithDecorator(decoratedElements, "ViewChildren", coreModule), reflector, evaluator);
  const viewQueries = [...viewChildFromFields, ...viewChildrenFromFields];
  if (directive.has("queries")) {
    const queriesFromDecorator = extractQueriesFromDecorator(directive.get("queries"), reflector, evaluator, isCore);
    queries.push(...queriesFromDecorator.content);
    viewQueries.push(...queriesFromDecorator.view);
  }
  let selector = defaultSelector;
  if (directive.has("selector")) {
    const expr = directive.get("selector");
    const resolved = evaluator.evaluate(expr);
    if (typeof resolved !== "string") {
      throw createValueHasWrongTypeError(expr, resolved, `selector must be a string`);
    }
    selector = resolved === "" ? defaultSelector : resolved;
    if (!selector) {
      throw new FatalDiagnosticError(ErrorCode.DIRECTIVE_MISSING_SELECTOR, expr, `Directive ${clazz.name.text} has no selector, please add it!`);
    }
  }
  const host = extractHostBindings(decoratedElements, evaluator, coreModule, directive);
  const providers = directive.has("providers") ? new WrappedNodeExpr4(annotateForClosureCompiler ? wrapFunctionExpressionsInParens(directive.get("providers")) : directive.get("providers")) : null;
  const usesOnChanges = members.some((member) => !member.isStatic && member.kind === ClassMemberKind.Method && member.name === "ngOnChanges");
  let exportAs = null;
  if (directive.has("exportAs")) {
    const expr = directive.get("exportAs");
    const resolved = evaluator.evaluate(expr);
    if (typeof resolved !== "string") {
      throw createValueHasWrongTypeError(expr, resolved, `exportAs must be a string`);
    }
    exportAs = resolved.split(",").map((part) => part.trim());
  }
  const rawCtorDeps = getConstructorDependencies(clazz, reflector, isCore);
  const ctorDeps = selector !== null ? validateConstructorDependencies(clazz, rawCtorDeps) : unwrapConstructorDependencies(rawCtorDeps);
  const isStructural = ctorDeps !== null && ctorDeps !== "invalid" && ctorDeps.some((dep) => dep.token instanceof ExternalExpr5 && dep.token.value.moduleName === "@angular/core" && dep.token.value.name === "TemplateRef");
  const usesInheritance = reflector.hasBaseClass(clazz);
  const type = wrapTypeReference(reflector, clazz);
  const internalType = new WrappedNodeExpr4(reflector.getInternalNameOfClass(clazz));
  const inputs = ClassPropertyMapping.fromMappedObject(__spreadValues(__spreadValues({}, inputsFromMeta), inputsFromFields));
  const outputs = ClassPropertyMapping.fromMappedObject(__spreadValues(__spreadValues({}, outputsFromMeta), outputsFromFields));
  const metadata = {
    name: clazz.name.text,
    deps: ctorDeps,
    host,
    lifecycle: {
      usesOnChanges
    },
    inputs: inputs.toJointMappedObject(),
    outputs: outputs.toDirectMappedObject(),
    queries,
    viewQueries,
    selector,
    fullInheritance: !!(flags & HandlerFlags.FULL_INHERITANCE),
    type,
    internalType,
    typeArgumentCount: reflector.getGenericArityOfClass(clazz) || 0,
    typeSourceSpan: createSourceSpan(clazz.name),
    usesInheritance,
    exportAs,
    providers
  };
  return {
    decorator: directive,
    metadata,
    inputs,
    outputs,
    isStructural
  };
}
function extractQueryMetadata(exprNode, name, args, propertyName, reflector, evaluator) {
  var _a;
  if (args.length === 0) {
    throw new FatalDiagnosticError(ErrorCode.DECORATOR_ARITY_WRONG, exprNode, `@${name} must have arguments`);
  }
  const first = name === "ViewChild" || name === "ContentChild";
  const node = (_a = tryUnwrapForwardRef(args[0], reflector)) != null ? _a : args[0];
  const arg = evaluator.evaluate(node);
  let isStatic = false;
  let predicate = null;
  if (arg instanceof Reference || arg instanceof DynamicValue) {
    predicate = new WrappedNodeExpr4(node);
  } else if (typeof arg === "string") {
    predicate = [arg];
  } else if (isStringArrayOrDie(arg, `@${name} predicate`, node)) {
    predicate = arg;
  } else {
    throw createValueHasWrongTypeError(node, arg, `@${name} predicate cannot be interpreted`);
  }
  let read = null;
  let descendants = name !== "ContentChildren";
  let emitDistinctChangesOnly = emitDistinctChangesOnlyDefaultValue;
  if (args.length === 2) {
    const optionsExpr = unwrapExpression(args[1]);
    if (!ts44.isObjectLiteralExpression(optionsExpr)) {
      throw new FatalDiagnosticError(ErrorCode.DECORATOR_ARG_NOT_LITERAL, optionsExpr, `@${name} options must be an object literal`);
    }
    const options2 = reflectObjectLiteral(optionsExpr);
    if (options2.has("read")) {
      read = new WrappedNodeExpr4(options2.get("read"));
    }
    if (options2.has("descendants")) {
      const descendantsExpr = options2.get("descendants");
      const descendantsValue = evaluator.evaluate(descendantsExpr);
      if (typeof descendantsValue !== "boolean") {
        throw createValueHasWrongTypeError(descendantsExpr, descendantsValue, `@${name} options.descendants must be a boolean`);
      }
      descendants = descendantsValue;
    }
    if (options2.has("emitDistinctChangesOnly")) {
      const emitDistinctChangesOnlyExpr = options2.get("emitDistinctChangesOnly");
      const emitDistinctChangesOnlyValue = evaluator.evaluate(emitDistinctChangesOnlyExpr);
      if (typeof emitDistinctChangesOnlyValue !== "boolean") {
        throw createValueHasWrongTypeError(emitDistinctChangesOnlyExpr, emitDistinctChangesOnlyValue, `@${name} options.emitDistinctChangesOnly must be a boolean`);
      }
      emitDistinctChangesOnly = emitDistinctChangesOnlyValue;
    }
    if (options2.has("static")) {
      const staticValue = evaluator.evaluate(options2.get("static"));
      if (typeof staticValue !== "boolean") {
        throw createValueHasWrongTypeError(node, staticValue, `@${name} options.static must be a boolean`);
      }
      isStatic = staticValue;
    }
  } else if (args.length > 2) {
    throw new FatalDiagnosticError(ErrorCode.DECORATOR_ARITY_WRONG, node, `@${name} has too many arguments`);
  }
  return {
    propertyName,
    predicate,
    first,
    descendants,
    read,
    static: isStatic,
    emitDistinctChangesOnly
  };
}
function extractQueriesFromDecorator(queryData, reflector, evaluator, isCore) {
  const content = [], view = [];
  if (!ts44.isObjectLiteralExpression(queryData)) {
    throw new FatalDiagnosticError(ErrorCode.VALUE_HAS_WRONG_TYPE, queryData, "Decorator queries metadata must be an object literal");
  }
  reflectObjectLiteral(queryData).forEach((queryExpr, propertyName) => {
    queryExpr = unwrapExpression(queryExpr);
    if (!ts44.isNewExpression(queryExpr)) {
      throw new FatalDiagnosticError(ErrorCode.VALUE_HAS_WRONG_TYPE, queryData, "Decorator query metadata must be an instance of a query type");
    }
    const queryType = ts44.isPropertyAccessExpression(queryExpr.expression) ? queryExpr.expression.name : queryExpr.expression;
    if (!ts44.isIdentifier(queryType)) {
      throw new FatalDiagnosticError(ErrorCode.VALUE_HAS_WRONG_TYPE, queryData, "Decorator query metadata must be an instance of a query type");
    }
    const type = reflector.getImportOfIdentifier(queryType);
    if (type === null || !isCore && type.from !== "@angular/core" || !QUERY_TYPES.has(type.name)) {
      throw new FatalDiagnosticError(ErrorCode.VALUE_HAS_WRONG_TYPE, queryData, "Decorator query metadata must be an instance of a query type");
    }
    const query = extractQueryMetadata(queryExpr, type.name, queryExpr.arguments || [], propertyName, reflector, evaluator);
    if (type.name.startsWith("Content")) {
      content.push(query);
    } else {
      view.push(query);
    }
  });
  return { content, view };
}
function isStringArrayOrDie(value, name, node) {
  if (!Array.isArray(value)) {
    return false;
  }
  for (let i = 0; i < value.length; i++) {
    if (typeof value[i] !== "string") {
      throw createValueHasWrongTypeError(node, value[i], `Failed to resolve ${name} at position ${i} to a string`);
    }
  }
  return true;
}
function parseFieldArrayValue(directive, field, evaluator) {
  if (!directive.has(field)) {
    return null;
  }
  const expression = directive.get(field);
  const value = evaluator.evaluate(expression);
  if (!isStringArrayOrDie(value, field, expression)) {
    throw createValueHasWrongTypeError(expression, value, `Failed to resolve @Directive.${field} to a string array`);
  }
  return value;
}
function parseFieldToPropertyMapping(directive, field, evaluator) {
  const metaValues = parseFieldArrayValue(directive, field, evaluator);
  if (!metaValues) {
    return EMPTY_OBJECT;
  }
  return metaValues.reduce((results, value) => {
    const [field2, property2] = value.split(":", 2).map((str) => str.trim());
    results[field2] = property2 || field2;
    return results;
  }, {});
}
function parseDecoratedFields(fields, evaluator, mapValueResolver) {
  return fields.reduce((results, field) => {
    const fieldName = field.member.name;
    field.decorators.forEach((decorator) => {
      if (decorator.args == null || decorator.args.length === 0) {
        results[fieldName] = fieldName;
      } else if (decorator.args.length === 1) {
        const property2 = evaluator.evaluate(decorator.args[0]);
        if (typeof property2 !== "string") {
          throw createValueHasWrongTypeError(Decorator.nodeForError(decorator), property2, `@${decorator.name} decorator argument must resolve to a string`);
        }
        results[fieldName] = mapValueResolver(property2, fieldName);
      } else {
        throw new FatalDiagnosticError(ErrorCode.DECORATOR_ARITY_WRONG, Decorator.nodeForError(decorator), `@${decorator.name} can have at most one argument, got ${decorator.args.length} argument(s)`);
      }
    });
    return results;
  }, {});
}
function resolveInput(publicName, internalName) {
  return [publicName, internalName];
}
function resolveOutput(publicName, internalName) {
  return publicName;
}
function queriesFromFields(fields, reflector, evaluator) {
  return fields.map(({ member, decorators }) => {
    const decorator = decorators[0];
    const node = member.node || Decorator.nodeForError(decorator);
    if (member.decorators.some((v) => v.name === "Input")) {
      throw new FatalDiagnosticError(ErrorCode.DECORATOR_COLLISION, node, "Cannot combine @Input decorators with query decorators");
    }
    if (decorators.length !== 1) {
      throw new FatalDiagnosticError(ErrorCode.DECORATOR_COLLISION, node, "Cannot have multiple query decorators on the same class member");
    } else if (!isPropertyTypeMember(member)) {
      throw new FatalDiagnosticError(ErrorCode.DECORATOR_UNEXPECTED, node, "Query decorator must go on a property-type member");
    }
    return extractQueryMetadata(node, decorator.name, decorator.args || [], member.name, reflector, evaluator);
  });
}
function isPropertyTypeMember(member) {
  return member.kind === ClassMemberKind.Getter || member.kind === ClassMemberKind.Setter || member.kind === ClassMemberKind.Property;
}
function evaluateHostExpressionBindings(hostExpr, evaluator) {
  const hostMetaMap = evaluator.evaluate(hostExpr);
  if (!(hostMetaMap instanceof Map)) {
    throw createValueHasWrongTypeError(hostExpr, hostMetaMap, `Decorator host metadata must be an object`);
  }
  const hostMetadata = {};
  hostMetaMap.forEach((value, key) => {
    if (value instanceof EnumValue) {
      value = value.resolved;
    }
    if (typeof key !== "string") {
      throw createValueHasWrongTypeError(hostExpr, key, `Decorator host metadata must be a string -> string object, but found unparseable key`);
    }
    if (typeof value == "string") {
      hostMetadata[key] = value;
    } else if (value instanceof DynamicValue) {
      hostMetadata[key] = new WrappedNodeExpr4(value.node);
    } else {
      throw createValueHasWrongTypeError(hostExpr, value, `Decorator host metadata must be a string -> string object, but found unparseable value`);
    }
  });
  const bindings = parseHostBindings(hostMetadata);
  const errors = verifyHostBindings(bindings, createSourceSpan(hostExpr));
  if (errors.length > 0) {
    throw new FatalDiagnosticError(ErrorCode.HOST_BINDING_PARSE_ERROR, hostExpr, errors.map((error2) => error2.msg).join("\n"));
  }
  return bindings;
}
function extractHostBindings(members, evaluator, coreModule, metadata) {
  let bindings;
  if (metadata && metadata.has("host")) {
    bindings = evaluateHostExpressionBindings(metadata.get("host"), evaluator);
  } else {
    bindings = parseHostBindings({});
  }
  filterToMembersWithDecorator(members, "HostBinding", coreModule).forEach(({ member, decorators }) => {
    decorators.forEach((decorator) => {
      let hostPropertyName = member.name;
      if (decorator.args !== null && decorator.args.length > 0) {
        if (decorator.args.length !== 1) {
          throw new FatalDiagnosticError(ErrorCode.DECORATOR_ARITY_WRONG, Decorator.nodeForError(decorator), `@HostBinding can have at most one argument, got ${decorator.args.length} argument(s)`);
        }
        const resolved = evaluator.evaluate(decorator.args[0]);
        if (typeof resolved !== "string") {
          throw createValueHasWrongTypeError(Decorator.nodeForError(decorator), resolved, `@HostBinding's argument must be a string`);
        }
        hostPropertyName = resolved;
      }
      bindings.properties[hostPropertyName] = getSafePropertyAccessString("this", member.name);
    });
  });
  filterToMembersWithDecorator(members, "HostListener", coreModule).forEach(({ member, decorators }) => {
    decorators.forEach((decorator) => {
      let eventName = member.name;
      let args = [];
      if (decorator.args !== null && decorator.args.length > 0) {
        if (decorator.args.length > 2) {
          throw new FatalDiagnosticError(ErrorCode.DECORATOR_ARITY_WRONG, decorator.args[2], `@HostListener can have at most two arguments`);
        }
        const resolved = evaluator.evaluate(decorator.args[0]);
        if (typeof resolved !== "string") {
          throw createValueHasWrongTypeError(decorator.args[0], resolved, `@HostListener's event name argument must be a string`);
        }
        eventName = resolved;
        if (decorator.args.length === 2) {
          const expression = decorator.args[1];
          const resolvedArgs = evaluator.evaluate(decorator.args[1]);
          if (!isStringArrayOrDie(resolvedArgs, "@HostListener.args", expression)) {
            throw createValueHasWrongTypeError(decorator.args[1], resolvedArgs, `@HostListener's second argument must be a string array`);
          }
          args = resolvedArgs;
        }
      }
      bindings.listeners[eventName] = `${member.name}(${args.join(",")})`;
    });
  });
  return bindings;
}
var QUERY_TYPES = new Set([
  "ContentChild",
  "ContentChildren",
  "ViewChild",
  "ViewChildren"
]);

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/ng_module.mjs
import { compileClassMetadata as compileClassMetadata2, compileDeclareClassMetadata as compileDeclareClassMetadata2, compileDeclareInjectorFromMetadata, compileDeclareNgModuleFromMetadata, compileInjector, compileNgModule, CUSTOM_ELEMENTS_SCHEMA, ExternalExpr as ExternalExpr6, FactoryTarget as FactoryTarget2, InvokeFunctionExpr, LiteralArrayExpr as LiteralArrayExpr2, LiteralExpr as LiteralExpr3, NO_ERRORS_SCHEMA, R3Identifiers, STRING_TYPE, WrappedNodeExpr as WrappedNodeExpr5 } from "@angular/compiler";
import ts45 from "typescript";
var NgModuleSymbol = class extends SemanticSymbol {
  constructor() {
    super(...arguments);
    this.remotelyScopedComponents = [];
  }
  isPublicApiAffected(previousSymbol) {
    if (!(previousSymbol instanceof NgModuleSymbol)) {
      return true;
    }
    return false;
  }
  isEmitAffected(previousSymbol) {
    if (!(previousSymbol instanceof NgModuleSymbol)) {
      return true;
    }
    if (previousSymbol.remotelyScopedComponents.length !== this.remotelyScopedComponents.length) {
      return true;
    }
    for (const currEntry of this.remotelyScopedComponents) {
      const prevEntry = previousSymbol.remotelyScopedComponents.find((prevEntry2) => {
        return isSymbolEqual(prevEntry2.component, currEntry.component);
      });
      if (prevEntry === void 0) {
        return true;
      }
      if (!isArrayEqual(currEntry.usedDirectives, prevEntry.usedDirectives, isReferenceEqual)) {
        return true;
      }
      if (!isArrayEqual(currEntry.usedPipes, prevEntry.usedPipes, isReferenceEqual)) {
        return true;
      }
    }
    return false;
  }
  isTypeCheckApiAffected(previousSymbol) {
    if (!(previousSymbol instanceof NgModuleSymbol)) {
      return true;
    }
    return false;
  }
  addRemotelyScopedComponent(component, usedDirectives, usedPipes) {
    this.remotelyScopedComponents.push({ component, usedDirectives, usedPipes });
  }
};
var NgModuleDecoratorHandler = class {
  constructor(reflector, evaluator, metaReader, metaRegistry, scopeRegistry, referencesRegistry, isCore, refEmitter, factoryTracker, annotateForClosureCompiler, injectableRegistry, perf, localeId) {
    this.reflector = reflector;
    this.evaluator = evaluator;
    this.metaReader = metaReader;
    this.metaRegistry = metaRegistry;
    this.scopeRegistry = scopeRegistry;
    this.referencesRegistry = referencesRegistry;
    this.isCore = isCore;
    this.refEmitter = refEmitter;
    this.factoryTracker = factoryTracker;
    this.annotateForClosureCompiler = annotateForClosureCompiler;
    this.injectableRegistry = injectableRegistry;
    this.perf = perf;
    this.localeId = localeId;
    this.precedence = HandlerPrecedence.PRIMARY;
    this.name = NgModuleDecoratorHandler.name;
  }
  detect(node, decorators) {
    if (!decorators) {
      return void 0;
    }
    const decorator = findAngularDecorator(decorators, "NgModule", this.isCore);
    if (decorator !== void 0) {
      return {
        trigger: decorator.node,
        decorator,
        metadata: decorator
      };
    } else {
      return void 0;
    }
  }
  analyze(node, decorator) {
    this.perf.eventCount(PerfEvent.AnalyzeNgModule);
    const name = node.name.text;
    if (decorator.args === null || decorator.args.length > 1) {
      throw new FatalDiagnosticError(ErrorCode.DECORATOR_ARITY_WRONG, Decorator.nodeForError(decorator), `Incorrect number of arguments to @NgModule decorator`);
    }
    const meta = decorator.args.length === 1 ? unwrapExpression(decorator.args[0]) : ts45.createObjectLiteral([]);
    if (!ts45.isObjectLiteralExpression(meta)) {
      throw new FatalDiagnosticError(ErrorCode.DECORATOR_ARG_NOT_LITERAL, meta, "@NgModule argument must be an object literal");
    }
    const ngModule = reflectObjectLiteral(meta);
    if (ngModule.has("jit")) {
      return {};
    }
    const moduleResolvers = combineResolvers([
      (ref) => this._extractModuleFromModuleWithProvidersFn(ref.node),
      forwardRefResolver
    ]);
    const diagnostics = [];
    let declarationRefs = [];
    let rawDeclarations = null;
    if (ngModule.has("declarations")) {
      rawDeclarations = ngModule.get("declarations");
      const declarationMeta = this.evaluator.evaluate(rawDeclarations, forwardRefResolver);
      declarationRefs = this.resolveTypeList(rawDeclarations, declarationMeta, name, "declarations");
      for (const ref of declarationRefs) {
        if (ref.node.getSourceFile().isDeclarationFile) {
          const errorNode = ref.getOriginForDiagnostics(rawDeclarations);
          diagnostics.push(makeDiagnostic(ErrorCode.NGMODULE_INVALID_DECLARATION, errorNode, `Cannot declare '${ref.node.name.text}' in an NgModule as it's not a part of the current compilation.`, [makeRelatedInformation(ref.node.name, `'${ref.node.name.text}' is declared here.`)]));
        }
      }
    }
    if (diagnostics.length > 0) {
      return { diagnostics };
    }
    let importRefs = [];
    if (ngModule.has("imports")) {
      const rawImports = ngModule.get("imports");
      const importsMeta = this.evaluator.evaluate(rawImports, moduleResolvers);
      importRefs = this.resolveTypeList(rawImports, importsMeta, name, "imports");
    }
    let exportRefs = [];
    if (ngModule.has("exports")) {
      const rawExports = ngModule.get("exports");
      const exportsMeta = this.evaluator.evaluate(rawExports, moduleResolvers);
      exportRefs = this.resolveTypeList(rawExports, exportsMeta, name, "exports");
      this.referencesRegistry.add(node, ...exportRefs);
    }
    let bootstrapRefs = [];
    if (ngModule.has("bootstrap")) {
      const expr = ngModule.get("bootstrap");
      const bootstrapMeta = this.evaluator.evaluate(expr, forwardRefResolver);
      bootstrapRefs = this.resolveTypeList(expr, bootstrapMeta, name, "bootstrap");
    }
    const schemas = [];
    if (ngModule.has("schemas")) {
      const rawExpr = ngModule.get("schemas");
      const result = this.evaluator.evaluate(rawExpr);
      if (!Array.isArray(result)) {
        throw createValueHasWrongTypeError(rawExpr, result, `NgModule.schemas must be an array`);
      }
      for (const schemaRef of result) {
        if (!(schemaRef instanceof Reference)) {
          throw createValueHasWrongTypeError(rawExpr, result, "NgModule.schemas must be an array of schemas");
        }
        const id2 = schemaRef.getIdentityIn(schemaRef.node.getSourceFile());
        if (id2 === null || schemaRef.ownedByModuleGuess !== "@angular/core") {
          throw createValueHasWrongTypeError(rawExpr, result, "NgModule.schemas must be an array of schemas");
        }
        switch (id2.text) {
          case "CUSTOM_ELEMENTS_SCHEMA":
            schemas.push(CUSTOM_ELEMENTS_SCHEMA);
            break;
          case "NO_ERRORS_SCHEMA":
            schemas.push(NO_ERRORS_SCHEMA);
            break;
          default:
            throw createValueHasWrongTypeError(rawExpr, schemaRef, `'${schemaRef.debugName}' is not a valid NgModule schema`);
        }
      }
    }
    const id = ngModule.has("id") ? new WrappedNodeExpr5(ngModule.get("id")) : null;
    const valueContext = node.getSourceFile();
    let typeContext = valueContext;
    const typeNode = this.reflector.getDtsDeclaration(node);
    if (typeNode !== null) {
      typeContext = typeNode.getSourceFile();
    }
    const bootstrap = bootstrapRefs.map((bootstrap2) => this._toR3Reference(bootstrap2, valueContext, typeContext));
    const declarations = declarationRefs.map((decl) => this._toR3Reference(decl, valueContext, typeContext));
    const imports = importRefs.map((imp) => this._toR3Reference(imp, valueContext, typeContext));
    const exports = exportRefs.map((exp) => this._toR3Reference(exp, valueContext, typeContext));
    const isForwardReference = (ref) => isExpressionForwardReference(ref.value, node.name, valueContext);
    const containsForwardDecls = bootstrap.some(isForwardReference) || declarations.some(isForwardReference) || imports.some(isForwardReference) || exports.some(isForwardReference);
    const type = wrapTypeReference(this.reflector, node);
    const internalType = new WrappedNodeExpr5(this.reflector.getInternalNameOfClass(node));
    const adjacentType = new WrappedNodeExpr5(this.reflector.getAdjacentNameOfClass(node));
    const ngModuleMetadata = {
      type,
      internalType,
      adjacentType,
      bootstrap,
      declarations,
      exports,
      imports,
      containsForwardDecls,
      id,
      emitInline: false,
      schemas: []
    };
    const rawProviders = ngModule.has("providers") ? ngModule.get("providers") : null;
    const wrapperProviders = rawProviders !== null ? new WrappedNodeExpr5(this.annotateForClosureCompiler ? wrapFunctionExpressionsInParens(rawProviders) : rawProviders) : null;
    const injectorImports = [];
    if (ngModule.has("imports")) {
      injectorImports.push(new WrappedNodeExpr5(ngModule.get("imports")));
    }
    const injectorMetadata = {
      name,
      type,
      internalType,
      providers: wrapperProviders,
      imports: injectorImports
    };
    const factoryMetadata = {
      name,
      type,
      internalType,
      typeArgumentCount: 0,
      deps: getValidConstructorDependencies(node, this.reflector, this.isCore),
      target: FactoryTarget2.NgModule
    };
    return {
      analysis: {
        id,
        schemas,
        mod: ngModuleMetadata,
        inj: injectorMetadata,
        fac: factoryMetadata,
        declarations: declarationRefs,
        rawDeclarations,
        imports: importRefs,
        exports: exportRefs,
        providers: rawProviders,
        providersRequiringFactory: rawProviders ? resolveProvidersRequiringFactory(rawProviders, this.reflector, this.evaluator) : null,
        classMetadata: extractClassMetadata(node, this.reflector, this.isCore, this.annotateForClosureCompiler),
        factorySymbolName: node.name.text
      }
    };
  }
  symbol(node) {
    return new NgModuleSymbol(node);
  }
  register(node, analysis) {
    this.metaRegistry.registerNgModuleMetadata({
      ref: new Reference(node),
      schemas: analysis.schemas,
      declarations: analysis.declarations,
      imports: analysis.imports,
      exports: analysis.exports,
      rawDeclarations: analysis.rawDeclarations
    });
    if (this.factoryTracker !== null) {
      this.factoryTracker.track(node.getSourceFile(), {
        name: analysis.factorySymbolName,
        hasId: analysis.id !== null
      });
    }
    this.injectableRegistry.registerInjectable(node);
  }
  resolve(node, analysis) {
    const scope = this.scopeRegistry.getScopeOfModule(node);
    const diagnostics = [];
    const scopeDiagnostics = this.scopeRegistry.getDiagnosticsOfModule(node);
    if (scopeDiagnostics !== null) {
      diagnostics.push(...scopeDiagnostics);
    }
    if (analysis.providersRequiringFactory !== null) {
      const providerDiagnostics = getProviderDiagnostics(analysis.providersRequiringFactory, analysis.providers, this.injectableRegistry);
      diagnostics.push(...providerDiagnostics);
    }
    const data = {
      injectorImports: []
    };
    if (scope !== null && !scope.compilation.isPoisoned) {
      const context = getSourceFile(node);
      for (const exportRef of analysis.exports) {
        if (isNgModule(exportRef.node, scope.compilation)) {
          data.injectorImports.push(this.refEmitter.emit(exportRef, context).expression);
        }
      }
      for (const decl of analysis.declarations) {
        const metadata = this.metaReader.getDirectiveMetadata(decl);
        if (metadata !== null && metadata.selector === null) {
          throw new FatalDiagnosticError(ErrorCode.DIRECTIVE_MISSING_SELECTOR, decl.node, `Directive ${decl.node.name.text} has no selector, please add it!`);
        }
      }
    }
    if (diagnostics.length > 0) {
      return { diagnostics };
    }
    if (scope === null || scope.compilation.isPoisoned || scope.exported.isPoisoned || scope.reexports === null) {
      return { data };
    } else {
      return {
        data,
        reexports: scope.reexports
      };
    }
  }
  compileFull(node, { inj, mod, fac, classMetadata, declarations }, { injectorImports }) {
    const factoryFn = compileNgFactoryDefField(fac);
    const ngInjectorDef = compileInjector(this.mergeInjectorImports(inj, injectorImports));
    const ngModuleDef = compileNgModule(mod);
    const statements = ngModuleDef.statements;
    const metadata = classMetadata !== null ? compileClassMetadata2(classMetadata) : null;
    this.insertMetadataStatement(statements, metadata);
    this.appendRemoteScopingStatements(statements, node, declarations);
    return this.compileNgModule(factoryFn, ngInjectorDef, ngModuleDef);
  }
  compilePartial(node, { inj, fac, mod, classMetadata }, { injectorImports }) {
    const factoryFn = compileDeclareFactory(fac);
    const injectorDef = compileDeclareInjectorFromMetadata(this.mergeInjectorImports(inj, injectorImports));
    const ngModuleDef = compileDeclareNgModuleFromMetadata(mod);
    const metadata = classMetadata !== null ? compileDeclareClassMetadata2(classMetadata) : null;
    this.insertMetadataStatement(ngModuleDef.statements, metadata);
    return this.compileNgModule(factoryFn, injectorDef, ngModuleDef);
  }
  mergeInjectorImports(inj, injectorImports) {
    return __spreadProps(__spreadValues({}, inj), { imports: [...inj.imports, ...injectorImports] });
  }
  insertMetadataStatement(ngModuleStatements, metadata) {
    if (metadata !== null) {
      ngModuleStatements.unshift(metadata.toStmt());
    }
  }
  appendRemoteScopingStatements(ngModuleStatements, node, declarations) {
    const context = getSourceFile(node);
    for (const decl of declarations) {
      const remoteScope = this.scopeRegistry.getRemoteScope(decl.node);
      if (remoteScope !== null) {
        const directives = remoteScope.directives.map((directive) => this.refEmitter.emit(directive, context).expression);
        const pipes = remoteScope.pipes.map((pipe) => this.refEmitter.emit(pipe, context).expression);
        const directiveArray = new LiteralArrayExpr2(directives);
        const pipesArray = new LiteralArrayExpr2(pipes);
        const declExpr = this.refEmitter.emit(decl, context).expression;
        const setComponentScope = new ExternalExpr6(R3Identifiers.setComponentScope);
        const callExpr = new InvokeFunctionExpr(setComponentScope, [declExpr, directiveArray, pipesArray]);
        ngModuleStatements.push(callExpr.toStmt());
      }
    }
  }
  compileNgModule(factoryFn, injectorDef, ngModuleDef) {
    const res = [
      factoryFn,
      {
        name: "\u0275mod",
        initializer: ngModuleDef.expression,
        statements: ngModuleDef.statements,
        type: ngModuleDef.type
      },
      {
        name: "\u0275inj",
        initializer: injectorDef.expression,
        statements: injectorDef.statements,
        type: injectorDef.type
      }
    ];
    if (this.localeId) {
      res.push({
        name: "\u0275loc",
        initializer: new LiteralExpr3(this.localeId),
        statements: [],
        type: STRING_TYPE
      });
    }
    return res;
  }
  _toR3Reference(valueRef, valueContext, typeContext) {
    if (valueRef.hasOwningModuleGuess) {
      return toR3Reference(valueRef, valueRef, valueContext, valueContext, this.refEmitter);
    } else {
      let typeRef = valueRef;
      let typeNode = this.reflector.getDtsDeclaration(typeRef.node);
      if (typeNode !== null && isNamedClassDeclaration(typeNode)) {
        typeRef = new Reference(typeNode);
      }
      return toR3Reference(valueRef, typeRef, valueContext, typeContext, this.refEmitter);
    }
  }
  _extractModuleFromModuleWithProvidersFn(node) {
    const type = node.type || null;
    return type && (this._reflectModuleFromTypeParam(type, node) || this._reflectModuleFromLiteralType(type));
  }
  _reflectModuleFromTypeParam(type, node) {
    if (!ts45.isTypeReferenceNode(type)) {
      return null;
    }
    const typeName = type && (ts45.isIdentifier(type.typeName) && type.typeName || ts45.isQualifiedName(type.typeName) && type.typeName.right) || null;
    if (typeName === null) {
      return null;
    }
    const id = this.reflector.getImportOfIdentifier(typeName);
    if (id === null || id.name !== "ModuleWithProviders") {
      return null;
    }
    if (!this.isCore && id.from !== "@angular/core") {
      return null;
    }
    if (type.typeArguments === void 0 || type.typeArguments.length !== 1) {
      const parent = ts45.isMethodDeclaration(node) && ts45.isClassDeclaration(node.parent) ? node.parent : null;
      const symbolName = (parent && parent.name ? parent.name.getText() + "." : "") + (node.name ? node.name.getText() : "anonymous");
      throw new FatalDiagnosticError(ErrorCode.NGMODULE_MODULE_WITH_PROVIDERS_MISSING_GENERIC, type, `${symbolName} returns a ModuleWithProviders type without a generic type argument. Please add a generic type argument to the ModuleWithProviders type. If this occurrence is in library code you don't control, please contact the library authors.`);
    }
    const arg = type.typeArguments[0];
    return typeNodeToValueExpr(arg);
  }
  _reflectModuleFromLiteralType(type) {
    if (!ts45.isIntersectionTypeNode(type)) {
      return null;
    }
    for (const t of type.types) {
      if (ts45.isTypeLiteralNode(t)) {
        for (const m of t.members) {
          const ngModuleType = ts45.isPropertySignature(m) && ts45.isIdentifier(m.name) && m.name.text === "ngModule" && m.type || null;
          const ngModuleExpression = ngModuleType && typeNodeToValueExpr(ngModuleType);
          if (ngModuleExpression) {
            return ngModuleExpression;
          }
        }
      }
    }
    return null;
  }
  isClassDeclarationReference(ref) {
    return this.reflector.isClass(ref.node);
  }
  resolveTypeList(expr, resolvedList, className, arrayName) {
    const refList = [];
    if (!Array.isArray(resolvedList)) {
      throw createValueHasWrongTypeError(expr, resolvedList, `Expected array when reading the NgModule.${arrayName} of ${className}`);
    }
    resolvedList.forEach((entry, idx) => {
      if (entry instanceof Map && entry.has("ngModule")) {
        entry = entry.get("ngModule");
      }
      if (Array.isArray(entry)) {
        refList.push(...this.resolveTypeList(expr, entry, className, arrayName));
      } else if (entry instanceof Reference) {
        if (!this.isClassDeclarationReference(entry)) {
          throw createValueHasWrongTypeError(entry.node, entry, `Value at position ${idx} in the NgModule.${arrayName} of ${className} is not a class`);
        }
        refList.push(entry);
      } else {
        throw createValueHasWrongTypeError(expr, entry, `Value at position ${idx} in the NgModule.${arrayName} of ${className} is not a reference`);
      }
    });
    return refList;
  }
};
function isNgModule(node, compilation) {
  return !compilation.directives.some((directive) => directive.ref.node === node) && !compilation.pipes.some((pipe) => pipe.ref.node === node);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/component.mjs
var EMPTY_MAP = new Map();
var EMPTY_ARRAY = [];
var ComponentSymbol = class extends DirectiveSymbol {
  constructor() {
    super(...arguments);
    this.usedDirectives = [];
    this.usedPipes = [];
    this.isRemotelyScoped = false;
  }
  isEmitAffected(previousSymbol, publicApiAffected) {
    if (!(previousSymbol instanceof ComponentSymbol)) {
      return true;
    }
    const isSymbolUnaffected = (current, previous) => isReferenceEqual(current, previous) && !publicApiAffected.has(current.symbol);
    return this.isRemotelyScoped !== previousSymbol.isRemotelyScoped || !isArrayEqual(this.usedDirectives, previousSymbol.usedDirectives, isSymbolUnaffected) || !isArrayEqual(this.usedPipes, previousSymbol.usedPipes, isSymbolUnaffected);
  }
  isTypeCheckBlockAffected(previousSymbol, typeCheckApiAffected) {
    if (!(previousSymbol instanceof ComponentSymbol)) {
      return true;
    }
    const isInheritanceChainAffected = (symbol) => {
      let currentSymbol = symbol;
      while (currentSymbol instanceof DirectiveSymbol) {
        if (typeCheckApiAffected.has(currentSymbol)) {
          return true;
        }
        currentSymbol = currentSymbol.baseClass;
      }
      return false;
    };
    const isDirectiveUnaffected = (current, previous) => isReferenceEqual(current, previous) && !isInheritanceChainAffected(current.symbol);
    const isPipeUnaffected = (current, previous) => isReferenceEqual(current, previous) && !typeCheckApiAffected.has(current.symbol);
    return !isArrayEqual(this.usedDirectives, previousSymbol.usedDirectives, isDirectiveUnaffected) || !isArrayEqual(this.usedPipes, previousSymbol.usedPipes, isPipeUnaffected);
  }
};
var ComponentDecoratorHandler = class {
  constructor(reflector, evaluator, metaRegistry, metaReader, scopeReader, scopeRegistry, typeCheckScopeRegistry, resourceRegistry, isCore, resourceLoader, rootDirs, defaultPreserveWhitespaces, i18nUseExternalIds, enableI18nLegacyMessageIdFormat, usePoisonedData, i18nNormalizeLineEndingsInICUs, moduleResolver, cycleAnalyzer, cycleHandlingStrategy, refEmitter, depTracker, injectableRegistry, semanticDepGraphUpdater, annotateForClosureCompiler, perf) {
    this.reflector = reflector;
    this.evaluator = evaluator;
    this.metaRegistry = metaRegistry;
    this.metaReader = metaReader;
    this.scopeReader = scopeReader;
    this.scopeRegistry = scopeRegistry;
    this.typeCheckScopeRegistry = typeCheckScopeRegistry;
    this.resourceRegistry = resourceRegistry;
    this.isCore = isCore;
    this.resourceLoader = resourceLoader;
    this.rootDirs = rootDirs;
    this.defaultPreserveWhitespaces = defaultPreserveWhitespaces;
    this.i18nUseExternalIds = i18nUseExternalIds;
    this.enableI18nLegacyMessageIdFormat = enableI18nLegacyMessageIdFormat;
    this.usePoisonedData = usePoisonedData;
    this.i18nNormalizeLineEndingsInICUs = i18nNormalizeLineEndingsInICUs;
    this.moduleResolver = moduleResolver;
    this.cycleAnalyzer = cycleAnalyzer;
    this.cycleHandlingStrategy = cycleHandlingStrategy;
    this.refEmitter = refEmitter;
    this.depTracker = depTracker;
    this.injectableRegistry = injectableRegistry;
    this.semanticDepGraphUpdater = semanticDepGraphUpdater;
    this.annotateForClosureCompiler = annotateForClosureCompiler;
    this.perf = perf;
    this.literalCache = new Map();
    this.elementSchemaRegistry = new DomElementSchemaRegistry();
    this.preanalyzeTemplateCache = new Map();
    this.preanalyzeStylesCache = new Map();
    this.precedence = HandlerPrecedence.PRIMARY;
    this.name = ComponentDecoratorHandler.name;
  }
  detect(node, decorators) {
    if (!decorators) {
      return void 0;
    }
    const decorator = findAngularDecorator(decorators, "Component", this.isCore);
    if (decorator !== void 0) {
      return {
        trigger: decorator.node,
        decorator,
        metadata: decorator
      };
    } else {
      return void 0;
    }
  }
  preanalyze(node, decorator) {
    if (!this.resourceLoader.canPreload) {
      return void 0;
    }
    const meta = this._resolveLiteral(decorator);
    const component = reflectObjectLiteral(meta);
    const containingFile = node.getSourceFile().fileName;
    const resolveStyleUrl = (styleUrl) => {
      try {
        const resourceUrl = this.resourceLoader.resolve(styleUrl, containingFile);
        return this.resourceLoader.preload(resourceUrl, { type: "style", containingFile });
      } catch {
        return void 0;
      }
    };
    const templateAndTemplateStyleResources = this._preloadAndParseTemplate(node, decorator, component, containingFile).then((template) => {
      if (template === null) {
        return void 0;
      }
      return Promise.all(template.styleUrls.map((styleUrl) => resolveStyleUrl(styleUrl))).then(() => void 0);
    });
    const componentStyleUrls = this._extractComponentStyleUrls(component);
    let inlineStyles;
    if (component.has("styles")) {
      const litStyles = parseFieldArrayValue(component, "styles", this.evaluator);
      if (litStyles === null) {
        this.preanalyzeStylesCache.set(node, null);
      } else {
        inlineStyles = Promise.all(litStyles.map((style) => this.resourceLoader.preprocessInline(style, { type: "style", containingFile }))).then((styles) => {
          this.preanalyzeStylesCache.set(node, styles);
        });
      }
    } else {
      this.preanalyzeStylesCache.set(node, null);
    }
    return Promise.all([
      templateAndTemplateStyleResources,
      inlineStyles,
      ...componentStyleUrls.map((styleUrl) => resolveStyleUrl(styleUrl.url))
    ]).then(() => void 0);
  }
  analyze(node, decorator, flags = HandlerFlags.NONE) {
    var _a, _b;
    this.perf.eventCount(PerfEvent.AnalyzeComponent);
    const containingFile = node.getSourceFile().fileName;
    this.literalCache.delete(decorator);
    let diagnostics;
    let isPoisoned = false;
    const directiveResult = extractDirectiveMetadata(node, decorator, this.reflector, this.evaluator, this.isCore, flags, this.annotateForClosureCompiler, this.elementSchemaRegistry.getDefaultComponentElementName());
    if (directiveResult === void 0) {
      return {};
    }
    const { decorator: component, metadata, inputs, outputs } = directiveResult;
    const encapsulation = (_a = this._resolveEnumValue(component, "encapsulation", "ViewEncapsulation")) != null ? _a : ViewEncapsulation.Emulated;
    const changeDetection = this._resolveEnumValue(component, "changeDetection", "ChangeDetectionStrategy");
    let animations = null;
    if (component.has("animations")) {
      animations = new WrappedNodeExpr6(component.get("animations"));
    }
    const relativeContextFilePath = this.rootDirs.reduce((previous, rootDir) => {
      const candidate = relative(absoluteFrom(rootDir), absoluteFrom(containingFile));
      if (previous === void 0 || candidate.length < previous.length) {
        return candidate;
      } else {
        return previous;
      }
    }, void 0);
    let viewProvidersRequiringFactory = null;
    let providersRequiringFactory = null;
    let wrappedViewProviders = null;
    if (component.has("viewProviders")) {
      const viewProviders = component.get("viewProviders");
      viewProvidersRequiringFactory = resolveProvidersRequiringFactory(viewProviders, this.reflector, this.evaluator);
      wrappedViewProviders = new WrappedNodeExpr6(this.annotateForClosureCompiler ? wrapFunctionExpressionsInParens(viewProviders) : viewProviders);
    }
    if (component.has("providers")) {
      providersRequiringFactory = resolveProvidersRequiringFactory(component.get("providers"), this.reflector, this.evaluator);
    }
    let template;
    if (this.preanalyzeTemplateCache.has(node)) {
      const preanalyzed = this.preanalyzeTemplateCache.get(node);
      this.preanalyzeTemplateCache.delete(node);
      template = preanalyzed;
    } else {
      const templateDecl = this.parseTemplateDeclaration(decorator, component, containingFile);
      template = this.extractTemplate(node, templateDecl);
    }
    const templateResource = template.declaration.isInline ? { path: null, expression: component.get("template") } : {
      path: absoluteFrom(template.declaration.resolvedTemplateUrl),
      expression: template.sourceMapping.node
    };
    let styles = [];
    const styleResources = this._extractStyleResources(component, containingFile);
    const styleUrls = [
      ...this._extractComponentStyleUrls(component),
      ...this._extractTemplateStyleUrls(template)
    ];
    for (const styleUrl of styleUrls) {
      try {
        const resourceUrl = this.resourceLoader.resolve(styleUrl.url, containingFile);
        const resourceStr = this.resourceLoader.load(resourceUrl);
        styles.push(resourceStr);
        if (this.depTracker !== null) {
          this.depTracker.addResourceDependency(node.getSourceFile(), absoluteFrom(resourceUrl));
        }
      } catch {
        if (diagnostics === void 0) {
          diagnostics = [];
        }
        const resourceType = styleUrl.source === 2 ? 2 : 1;
        diagnostics.push(this.makeResourceNotFoundError(styleUrl.url, styleUrl.nodeForError, resourceType).toDiagnostic());
      }
    }
    if (encapsulation === ViewEncapsulation.ShadowDom && metadata.selector !== null) {
      const selectorError = checkCustomElementSelectorForErrors(metadata.selector);
      if (selectorError !== null) {
        if (diagnostics === void 0) {
          diagnostics = [];
        }
        diagnostics.push(makeDiagnostic(ErrorCode.COMPONENT_INVALID_SHADOW_DOM_SELECTOR, component.get("selector"), selectorError));
      }
    }
    let inlineStyles = null;
    if (this.preanalyzeStylesCache.has(node)) {
      inlineStyles = this.preanalyzeStylesCache.get(node);
      this.preanalyzeStylesCache.delete(node);
      if (inlineStyles !== null) {
        styles.push(...inlineStyles);
      }
    } else {
      if (this.resourceLoader.canPreprocess) {
        throw new Error("Inline resource processing requires asynchronous preanalyze.");
      }
      if (component.has("styles")) {
        const litStyles = parseFieldArrayValue(component, "styles", this.evaluator);
        if (litStyles !== null) {
          inlineStyles = [...litStyles];
          styles.push(...litStyles);
        }
      }
    }
    if (template.styles.length > 0) {
      styles.push(...template.styles);
    }
    const output = {
      analysis: {
        baseClass: readBaseClass2(node, this.reflector, this.evaluator),
        inputs,
        outputs,
        meta: __spreadProps(__spreadValues({}, metadata), {
          template: {
            nodes: template.nodes,
            ngContentSelectors: template.ngContentSelectors
          },
          encapsulation,
          interpolation: (_b = template.interpolationConfig) != null ? _b : DEFAULT_INTERPOLATION_CONFIG,
          styles,
          animations,
          viewProviders: wrappedViewProviders,
          i18nUseExternalIds: this.i18nUseExternalIds,
          relativeContextFilePath
        }),
        typeCheckMeta: extractDirectiveTypeCheckMeta(node, inputs, this.reflector),
        classMetadata: extractClassMetadata(node, this.reflector, this.isCore, this.annotateForClosureCompiler, (dec) => this._transformDecoratorToInlineResources(dec, component, styles, template)),
        template,
        providersRequiringFactory,
        viewProvidersRequiringFactory,
        inlineStyles,
        styleUrls,
        resources: {
          styles: styleResources,
          template: templateResource
        },
        isPoisoned
      },
      diagnostics
    };
    if (changeDetection !== null) {
      output.analysis.meta.changeDetection = changeDetection;
    }
    return output;
  }
  symbol(node, analysis) {
    const typeParameters = extractSemanticTypeParameters(node);
    return new ComponentSymbol(node, analysis.meta.selector, analysis.inputs, analysis.outputs, analysis.meta.exportAs, analysis.typeCheckMeta, typeParameters);
  }
  register(node, analysis) {
    const ref = new Reference(node);
    this.metaRegistry.registerDirectiveMetadata(__spreadProps(__spreadValues({
      type: MetaType.Directive,
      ref,
      name: node.name.text,
      selector: analysis.meta.selector,
      exportAs: analysis.meta.exportAs,
      inputs: analysis.inputs,
      outputs: analysis.outputs,
      queries: analysis.meta.queries.map((query) => query.propertyName),
      isComponent: true,
      baseClass: analysis.baseClass
    }, analysis.typeCheckMeta), {
      isPoisoned: analysis.isPoisoned,
      isStructural: false
    }));
    this.resourceRegistry.registerResources(analysis.resources, node);
    this.injectableRegistry.registerInjectable(node);
  }
  index(context, node, analysis) {
    if (analysis.isPoisoned && !this.usePoisonedData) {
      return null;
    }
    const scope = this.scopeReader.getScopeForComponent(node);
    const selector = analysis.meta.selector;
    const matcher = new SelectorMatcher();
    if (scope !== null) {
      if ((scope.compilation.isPoisoned || scope.exported.isPoisoned) && !this.usePoisonedData) {
        return null;
      }
      for (const directive of scope.compilation.directives) {
        if (directive.selector !== null) {
          matcher.addSelectables(CssSelector.parse(directive.selector), directive);
        }
      }
    }
    const binder = new R3TargetBinder(matcher);
    const boundTemplate = binder.bind({ template: analysis.template.diagNodes });
    context.addComponent({
      declaration: node,
      selector,
      boundTemplate,
      templateMeta: {
        isInline: analysis.template.declaration.isInline,
        file: analysis.template.file
      }
    });
  }
  typeCheck(ctx, node, meta) {
    if (this.typeCheckScopeRegistry === null || !ts46.isClassDeclaration(node)) {
      return;
    }
    if (meta.isPoisoned && !this.usePoisonedData) {
      return;
    }
    const scope = this.typeCheckScopeRegistry.getTypeCheckScope(node);
    if (scope.isPoisoned && !this.usePoisonedData) {
      return;
    }
    const binder = new R3TargetBinder(scope.matcher);
    ctx.addTemplate(new Reference(node), binder, meta.template.diagNodes, scope.pipes, scope.schemas, meta.template.sourceMapping, meta.template.file, meta.template.errors);
  }
  extendedTemplateCheck(component, extendedTemplateChecker) {
    return extendedTemplateChecker.getDiagnosticsForComponent(component);
  }
  resolve(node, analysis, symbol) {
    if (this.semanticDepGraphUpdater !== null && analysis.baseClass instanceof Reference) {
      symbol.baseClass = this.semanticDepGraphUpdater.getSymbol(analysis.baseClass.node);
    }
    if (analysis.isPoisoned && !this.usePoisonedData) {
      return {};
    }
    const context = node.getSourceFile();
    const scope = this.scopeReader.getScopeForComponent(node);
    let metadata = analysis.meta;
    const data = {
      directives: EMPTY_ARRAY,
      pipes: EMPTY_MAP,
      declarationListEmitMode: 0
    };
    if (scope !== null && (!scope.compilation.isPoisoned || this.usePoisonedData)) {
      const matcher = new SelectorMatcher();
      for (const dir of scope.compilation.directives) {
        if (dir.selector !== null) {
          matcher.addSelectables(CssSelector.parse(dir.selector), dir);
        }
      }
      const pipes = new Map();
      for (const pipe of scope.compilation.pipes) {
        pipes.set(pipe.name, pipe.ref);
      }
      const binder = new R3TargetBinder(matcher);
      const bound = binder.bind({ template: metadata.template.nodes });
      const usedDirectives = bound.getUsedDirectives().map((directive) => {
        const type = this.refEmitter.emit(directive.ref, context);
        return {
          ref: directive.ref,
          type: type.expression,
          importedFile: type.importedFile,
          selector: directive.selector,
          inputs: directive.inputs.propertyNames,
          outputs: directive.outputs.propertyNames,
          exportAs: directive.exportAs,
          isComponent: directive.isComponent
        };
      });
      const usedPipes = [];
      for (const pipeName of bound.getUsedPipes()) {
        if (!pipes.has(pipeName)) {
          continue;
        }
        const pipe = pipes.get(pipeName);
        const type = this.refEmitter.emit(pipe, context);
        usedPipes.push({
          ref: pipe,
          pipeName,
          expression: type.expression,
          importedFile: type.importedFile
        });
      }
      if (this.semanticDepGraphUpdater !== null) {
        symbol.usedDirectives = usedDirectives.map((dir) => this.semanticDepGraphUpdater.getSemanticReference(dir.ref.node, dir.type));
        symbol.usedPipes = usedPipes.map((pipe) => this.semanticDepGraphUpdater.getSemanticReference(pipe.ref.node, pipe.expression));
      }
      const cyclesFromDirectives = new Map();
      for (const usedDirective of usedDirectives) {
        const cycle = this._checkForCyclicImport(usedDirective.importedFile, usedDirective.type, context);
        if (cycle !== null) {
          cyclesFromDirectives.set(usedDirective, cycle);
        }
      }
      const cyclesFromPipes = new Map();
      for (const usedPipe of usedPipes) {
        const cycle = this._checkForCyclicImport(usedPipe.importedFile, usedPipe.expression, context);
        if (cycle !== null) {
          cyclesFromPipes.set(usedPipe, cycle);
        }
      }
      const cycleDetected = cyclesFromDirectives.size !== 0 || cyclesFromPipes.size !== 0;
      if (!cycleDetected) {
        for (const { type, importedFile } of usedDirectives) {
          this._recordSyntheticImport(importedFile, type, context);
        }
        for (const { expression, importedFile } of usedPipes) {
          this._recordSyntheticImport(importedFile, expression, context);
        }
        const wrapDirectivesAndPipesInClosure = usedDirectives.some((dir) => isExpressionForwardReference(dir.type, node.name, context)) || usedPipes.some((pipe) => isExpressionForwardReference(pipe.expression, node.name, context));
        data.directives = usedDirectives;
        data.pipes = new Map(usedPipes.map((pipe) => [pipe.pipeName, pipe.expression]));
        data.declarationListEmitMode = wrapDirectivesAndPipesInClosure ? 1 : 0;
      } else {
        if (this.cycleHandlingStrategy === 0) {
          this.scopeRegistry.setComponentRemoteScope(node, usedDirectives.map((dir) => dir.ref), usedPipes.map((pipe) => pipe.ref));
          symbol.isRemotelyScoped = true;
          if (this.semanticDepGraphUpdater !== null) {
            const moduleSymbol = this.semanticDepGraphUpdater.getSymbol(scope.ngModule);
            if (!(moduleSymbol instanceof NgModuleSymbol)) {
              throw new Error(`AssertionError: Expected ${scope.ngModule.name} to be an NgModuleSymbol.`);
            }
            moduleSymbol.addRemotelyScopedComponent(symbol, symbol.usedDirectives, symbol.usedPipes);
          }
        } else {
          const relatedMessages = [];
          for (const [dir, cycle] of cyclesFromDirectives) {
            relatedMessages.push(makeCyclicImportInfo(dir.ref, dir.isComponent ? "component" : "directive", cycle));
          }
          for (const [pipe, cycle] of cyclesFromPipes) {
            relatedMessages.push(makeCyclicImportInfo(pipe.ref, "pipe", cycle));
          }
          throw new FatalDiagnosticError(ErrorCode.IMPORT_CYCLE_DETECTED, node, "One or more import cycles would need to be created to compile this component, which is not supported by the current compiler configuration.", relatedMessages);
        }
      }
    }
    const diagnostics = [];
    if (analysis.providersRequiringFactory !== null && analysis.meta.providers instanceof WrappedNodeExpr6) {
      const providerDiagnostics = getProviderDiagnostics(analysis.providersRequiringFactory, analysis.meta.providers.node, this.injectableRegistry);
      diagnostics.push(...providerDiagnostics);
    }
    if (analysis.viewProvidersRequiringFactory !== null && analysis.meta.viewProviders instanceof WrappedNodeExpr6) {
      const viewProviderDiagnostics = getProviderDiagnostics(analysis.viewProvidersRequiringFactory, analysis.meta.viewProviders.node, this.injectableRegistry);
      diagnostics.push(...viewProviderDiagnostics);
    }
    const directiveDiagnostics = getDirectiveDiagnostics(node, this.metaReader, this.evaluator, this.reflector, this.scopeRegistry, "Component");
    if (directiveDiagnostics !== null) {
      diagnostics.push(...directiveDiagnostics);
    }
    if (diagnostics.length > 0) {
      return { diagnostics };
    }
    return { data };
  }
  xi18n(ctx, node, analysis) {
    var _a;
    ctx.updateFromTemplate(analysis.template.content, analysis.template.declaration.resolvedTemplateUrl, (_a = analysis.template.interpolationConfig) != null ? _a : DEFAULT_INTERPOLATION_CONFIG);
  }
  updateResources(node, analysis) {
    const containingFile = node.getSourceFile().fileName;
    const templateDecl = analysis.template.declaration;
    if (!templateDecl.isInline) {
      analysis.template = this.extractTemplate(node, templateDecl);
    }
    let styles = [];
    if (analysis.styleUrls !== null) {
      for (const styleUrl of analysis.styleUrls) {
        try {
          const resolvedStyleUrl = this.resourceLoader.resolve(styleUrl.url, containingFile);
          const styleText = this.resourceLoader.load(resolvedStyleUrl);
          styles.push(styleText);
        } catch (e) {
        }
      }
    }
    if (analysis.inlineStyles !== null) {
      for (const styleText of analysis.inlineStyles) {
        styles.push(styleText);
      }
    }
    for (const styleText of analysis.template.styles) {
      styles.push(styleText);
    }
    analysis.meta.styles = styles;
  }
  compileFull(node, analysis, resolution, pool) {
    if (analysis.template.errors !== null && analysis.template.errors.length > 0) {
      return [];
    }
    const meta = __spreadValues(__spreadValues({}, analysis.meta), resolution);
    const fac = compileNgFactoryDefField(toFactoryMetadata(meta, FactoryTarget3.Component));
    const def = compileComponentFromMetadata(meta, pool, makeBindingParser2());
    const classMetadata = analysis.classMetadata !== null ? compileClassMetadata3(analysis.classMetadata).toStmt() : null;
    return compileResults(fac, def, classMetadata, "\u0275cmp");
  }
  compilePartial(node, analysis, resolution) {
    if (analysis.template.errors !== null && analysis.template.errors.length > 0) {
      return [];
    }
    const templateInfo = {
      content: analysis.template.content,
      sourceUrl: analysis.template.declaration.resolvedTemplateUrl,
      isInline: analysis.template.declaration.isInline,
      inlineTemplateLiteralExpression: analysis.template.sourceMapping.type === "direct" ? new WrappedNodeExpr6(analysis.template.sourceMapping.node) : null
    };
    const meta = __spreadValues(__spreadValues({}, analysis.meta), resolution);
    const fac = compileDeclareFactory(toFactoryMetadata(meta, FactoryTarget3.Component));
    const def = compileDeclareComponentFromMetadata(meta, analysis.template, templateInfo);
    const classMetadata = analysis.classMetadata !== null ? compileDeclareClassMetadata3(analysis.classMetadata).toStmt() : null;
    return compileResults(fac, def, classMetadata, "\u0275cmp");
  }
  _transformDecoratorToInlineResources(dec, component, styles, template) {
    if (dec.name !== "Component") {
      return dec;
    }
    if (!component.has("templateUrl") && !component.has("styleUrls")) {
      return dec;
    }
    const metadata = new Map(component);
    if (metadata.has("templateUrl")) {
      metadata.delete("templateUrl");
      metadata.set("template", ts46.createStringLiteral(template.content));
    }
    if (metadata.has("styleUrls")) {
      metadata.delete("styleUrls");
      metadata.set("styles", ts46.createArrayLiteral(styles.map((s) => ts46.createStringLiteral(s))));
    }
    const newMetadataFields = [];
    for (const [name, value] of metadata.entries()) {
      newMetadataFields.push(ts46.createPropertyAssignment(name, value));
    }
    return __spreadProps(__spreadValues({}, dec), { args: [ts46.createObjectLiteral(newMetadataFields)] });
  }
  _resolveLiteral(decorator) {
    if (this.literalCache.has(decorator)) {
      return this.literalCache.get(decorator);
    }
    if (decorator.args === null || decorator.args.length !== 1) {
      throw new FatalDiagnosticError(ErrorCode.DECORATOR_ARITY_WRONG, Decorator.nodeForError(decorator), `Incorrect number of arguments to @Component decorator`);
    }
    const meta = unwrapExpression(decorator.args[0]);
    if (!ts46.isObjectLiteralExpression(meta)) {
      throw new FatalDiagnosticError(ErrorCode.DECORATOR_ARG_NOT_LITERAL, meta, `Decorator argument must be literal.`);
    }
    this.literalCache.set(decorator, meta);
    return meta;
  }
  _resolveEnumValue(component, field, enumSymbolName) {
    let resolved = null;
    if (component.has(field)) {
      const expr = component.get(field);
      const value = this.evaluator.evaluate(expr);
      if (value instanceof EnumValue && isAngularCoreReference(value.enumRef, enumSymbolName)) {
        resolved = value.resolved;
      } else {
        throw createValueHasWrongTypeError(expr, value, `${field} must be a member of ${enumSymbolName} enum from @angular/core`);
      }
    }
    return resolved;
  }
  _extractComponentStyleUrls(component) {
    if (!component.has("styleUrls")) {
      return [];
    }
    return this._extractStyleUrlsFromExpression(component.get("styleUrls"));
  }
  _extractStyleUrlsFromExpression(styleUrlsExpr) {
    const styleUrls = [];
    if (ts46.isArrayLiteralExpression(styleUrlsExpr)) {
      for (const styleUrlExpr of styleUrlsExpr.elements) {
        if (ts46.isSpreadElement(styleUrlExpr)) {
          styleUrls.push(...this._extractStyleUrlsFromExpression(styleUrlExpr.expression));
        } else {
          const styleUrl = this.evaluator.evaluate(styleUrlExpr);
          if (typeof styleUrl !== "string") {
            throw createValueHasWrongTypeError(styleUrlExpr, styleUrl, "styleUrl must be a string");
          }
          styleUrls.push({
            url: styleUrl,
            source: 2,
            nodeForError: styleUrlExpr
          });
        }
      }
    } else {
      const evaluatedStyleUrls = this.evaluator.evaluate(styleUrlsExpr);
      if (!isStringArray(evaluatedStyleUrls)) {
        throw createValueHasWrongTypeError(styleUrlsExpr, evaluatedStyleUrls, "styleUrls must be an array of strings");
      }
      for (const styleUrl of evaluatedStyleUrls) {
        styleUrls.push({
          url: styleUrl,
          source: 2,
          nodeForError: styleUrlsExpr
        });
      }
    }
    return styleUrls;
  }
  _extractStyleResources(component, containingFile) {
    const styles = new Set();
    function stringLiteralElements(array) {
      return array.elements.filter((e) => ts46.isStringLiteralLike(e));
    }
    const styleUrlsExpr = component.get("styleUrls");
    if (styleUrlsExpr !== void 0 && ts46.isArrayLiteralExpression(styleUrlsExpr)) {
      for (const expression of stringLiteralElements(styleUrlsExpr)) {
        try {
          const resourceUrl = this.resourceLoader.resolve(expression.text, containingFile);
          styles.add({ path: absoluteFrom(resourceUrl), expression });
        } catch {
        }
      }
    }
    const stylesExpr = component.get("styles");
    if (stylesExpr !== void 0 && ts46.isArrayLiteralExpression(stylesExpr)) {
      for (const expression of stringLiteralElements(stylesExpr)) {
        styles.add({ path: null, expression });
      }
    }
    return styles;
  }
  _preloadAndParseTemplate(node, decorator, component, containingFile) {
    if (component.has("templateUrl")) {
      const templateUrlExpr = component.get("templateUrl");
      const templateUrl = this.evaluator.evaluate(templateUrlExpr);
      if (typeof templateUrl !== "string") {
        throw createValueHasWrongTypeError(templateUrlExpr, templateUrl, "templateUrl must be a string");
      }
      try {
        const resourceUrl = this.resourceLoader.resolve(templateUrl, containingFile);
        const templatePromise = this.resourceLoader.preload(resourceUrl, { type: "template", containingFile });
        if (templatePromise !== void 0) {
          return templatePromise.then(() => {
            const templateDecl = this.parseTemplateDeclaration(decorator, component, containingFile);
            const template = this.extractTemplate(node, templateDecl);
            this.preanalyzeTemplateCache.set(node, template);
            return template;
          });
        } else {
          return Promise.resolve(null);
        }
      } catch (e) {
        throw this.makeResourceNotFoundError(templateUrl, templateUrlExpr, 0);
      }
    } else {
      const templateDecl = this.parseTemplateDeclaration(decorator, component, containingFile);
      const template = this.extractTemplate(node, templateDecl);
      this.preanalyzeTemplateCache.set(node, template);
      return Promise.resolve(template);
    }
  }
  extractTemplate(node, template) {
    if (template.isInline) {
      let sourceStr;
      let sourceParseRange = null;
      let templateContent;
      let sourceMapping;
      let escapedString = false;
      let sourceMapUrl;
      if (ts46.isStringLiteral(template.expression) || ts46.isNoSubstitutionTemplateLiteral(template.expression)) {
        sourceParseRange = getTemplateRange(template.expression);
        sourceStr = template.expression.getSourceFile().text;
        templateContent = template.expression.text;
        escapedString = true;
        sourceMapping = {
          type: "direct",
          node: template.expression
        };
        sourceMapUrl = template.resolvedTemplateUrl;
      } else {
        const resolvedTemplate = this.evaluator.evaluate(template.expression);
        if (typeof resolvedTemplate !== "string") {
          throw createValueHasWrongTypeError(template.expression, resolvedTemplate, "template must be a string");
        }
        sourceStr = resolvedTemplate;
        templateContent = resolvedTemplate;
        sourceMapping = {
          type: "indirect",
          node: template.expression,
          componentClass: node,
          template: templateContent
        };
        sourceMapUrl = null;
      }
      return __spreadProps(__spreadValues({}, this._parseTemplate(template, sourceStr, sourceParseRange, escapedString, sourceMapUrl)), {
        content: templateContent,
        sourceMapping,
        declaration: template
      });
    } else {
      const templateContent = this.resourceLoader.load(template.resolvedTemplateUrl);
      if (this.depTracker !== null) {
        this.depTracker.addResourceDependency(node.getSourceFile(), absoluteFrom(template.resolvedTemplateUrl));
      }
      return __spreadProps(__spreadValues({}, this._parseTemplate(template, templateContent, null, false, template.resolvedTemplateUrl)), {
        content: templateContent,
        sourceMapping: {
          type: "external",
          componentClass: node,
          node: template.templateUrlExpression,
          template: templateContent,
          templateUrl: template.resolvedTemplateUrl
        },
        declaration: template
      });
    }
  }
  _parseTemplate(template, sourceStr, sourceParseRange, escapedString, sourceMapUrl) {
    const i18nNormalizeLineEndingsInICUs = escapedString || this.i18nNormalizeLineEndingsInICUs;
    const parsedTemplate = parseTemplate(sourceStr, sourceMapUrl != null ? sourceMapUrl : "", {
      preserveWhitespaces: template.preserveWhitespaces,
      interpolationConfig: template.interpolationConfig,
      range: sourceParseRange != null ? sourceParseRange : void 0,
      escapedString,
      enableI18nLegacyMessageIdFormat: this.enableI18nLegacyMessageIdFormat,
      i18nNormalizeLineEndingsInICUs,
      alwaysAttemptHtmlToR3AstConversion: this.usePoisonedData
    });
    const { nodes: diagNodes } = parseTemplate(sourceStr, sourceMapUrl != null ? sourceMapUrl : "", {
      preserveWhitespaces: true,
      preserveLineEndings: true,
      interpolationConfig: template.interpolationConfig,
      range: sourceParseRange != null ? sourceParseRange : void 0,
      escapedString,
      enableI18nLegacyMessageIdFormat: this.enableI18nLegacyMessageIdFormat,
      i18nNormalizeLineEndingsInICUs,
      leadingTriviaChars: [],
      alwaysAttemptHtmlToR3AstConversion: this.usePoisonedData
    });
    return __spreadProps(__spreadValues({}, parsedTemplate), {
      diagNodes,
      file: new ParseSourceFile2(sourceStr, sourceMapUrl != null ? sourceMapUrl : "")
    });
  }
  parseTemplateDeclaration(decorator, component, containingFile) {
    let preserveWhitespaces = this.defaultPreserveWhitespaces;
    if (component.has("preserveWhitespaces")) {
      const expr = component.get("preserveWhitespaces");
      const value = this.evaluator.evaluate(expr);
      if (typeof value !== "boolean") {
        throw createValueHasWrongTypeError(expr, value, "preserveWhitespaces must be a boolean");
      }
      preserveWhitespaces = value;
    }
    let interpolationConfig = DEFAULT_INTERPOLATION_CONFIG;
    if (component.has("interpolation")) {
      const expr = component.get("interpolation");
      const value = this.evaluator.evaluate(expr);
      if (!Array.isArray(value) || value.length !== 2 || !value.every((element) => typeof element === "string")) {
        throw createValueHasWrongTypeError(expr, value, "interpolation must be an array with 2 elements of string type");
      }
      interpolationConfig = InterpolationConfig.fromArray(value);
    }
    if (component.has("templateUrl")) {
      const templateUrlExpr = component.get("templateUrl");
      const templateUrl = this.evaluator.evaluate(templateUrlExpr);
      if (typeof templateUrl !== "string") {
        throw createValueHasWrongTypeError(templateUrlExpr, templateUrl, "templateUrl must be a string");
      }
      try {
        const resourceUrl = this.resourceLoader.resolve(templateUrl, containingFile);
        return {
          isInline: false,
          interpolationConfig,
          preserveWhitespaces,
          templateUrl,
          templateUrlExpression: templateUrlExpr,
          resolvedTemplateUrl: resourceUrl
        };
      } catch (e) {
        throw this.makeResourceNotFoundError(templateUrl, templateUrlExpr, 0);
      }
    } else if (component.has("template")) {
      return {
        isInline: true,
        interpolationConfig,
        preserveWhitespaces,
        expression: component.get("template"),
        templateUrl: containingFile,
        resolvedTemplateUrl: containingFile
      };
    } else {
      throw new FatalDiagnosticError(ErrorCode.COMPONENT_MISSING_TEMPLATE, Decorator.nodeForError(decorator), "component is missing a template");
    }
  }
  _resolveImportedFile(importedFile, expr, origin) {
    if (importedFile !== "unknown") {
      return importedFile;
    }
    if (!(expr instanceof ExternalExpr7)) {
      return null;
    }
    return this.moduleResolver.resolveModule(expr.value.moduleName, origin.fileName);
  }
  _checkForCyclicImport(importedFile, expr, origin) {
    const imported = this._resolveImportedFile(importedFile, expr, origin);
    if (imported === null) {
      return null;
    }
    return this.cycleAnalyzer.wouldCreateCycle(origin, imported);
  }
  _recordSyntheticImport(importedFile, expr, origin) {
    const imported = this._resolveImportedFile(importedFile, expr, origin);
    if (imported === null) {
      return;
    }
    this.cycleAnalyzer.recordSyntheticImport(origin, imported);
  }
  makeResourceNotFoundError(file, nodeForError, resourceType) {
    let errorText;
    switch (resourceType) {
      case 0:
        errorText = `Could not find template file '${file}'.`;
        break;
      case 1:
        errorText = `Could not find stylesheet file '${file}' linked from the template.`;
        break;
      case 2:
        errorText = `Could not find stylesheet file '${file}'.`;
        break;
    }
    return new FatalDiagnosticError(ErrorCode.COMPONENT_RESOURCE_NOT_FOUND, nodeForError, errorText);
  }
  _extractTemplateStyleUrls(template) {
    if (template.styleUrls === null) {
      return [];
    }
    const nodeForError = getTemplateDeclarationNodeForError(template.declaration);
    return template.styleUrls.map((url) => ({ url, source: 1, nodeForError }));
  }
};
function getTemplateRange(templateExpr) {
  const startPos = templateExpr.getStart() + 1;
  const { line, character } = ts46.getLineAndCharacterOfPosition(templateExpr.getSourceFile(), startPos);
  return {
    startPos,
    startLine: line,
    startCol: character,
    endPos: templateExpr.getEnd() - 1
  };
}
function isStringArray(resolvedValue) {
  return Array.isArray(resolvedValue) && resolvedValue.every((elem) => typeof elem === "string");
}
function getTemplateDeclarationNodeForError(declaration) {
  switch (declaration.isInline) {
    case true:
      return declaration.expression;
    case false:
      return declaration.templateUrlExpression;
  }
}
function makeCyclicImportInfo(ref, type, cycle) {
  const name = ref.debugName || "(unknown)";
  const path7 = cycle.getPath().map((sf) => sf.fileName).join(" -> ");
  const message = `The ${type} '${name}' is used in the template but importing it would create a cycle: `;
  return makeRelatedInformation(ref.node, message + path7);
}
function checkCustomElementSelectorForErrors(selector) {
  if (selector.includes(".") || selector.includes("[") && selector.includes("]")) {
    return null;
  }
  if (!/^[a-z]/.test(selector)) {
    return "Selector of a ShadowDom-encapsulated component must start with a lower case letter.";
  }
  if (/[A-Z]/.test(selector)) {
    return "Selector of a ShadowDom-encapsulated component must all be in lower case.";
  }
  if (!selector.includes("-")) {
    return "Selector of a component that uses ViewEncapsulation.ShadowDom must contain a hyphen.";
  }
  return null;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/injectable.mjs
import { compileClassMetadata as compileClassMetadata4, compileDeclareClassMetadata as compileDeclareClassMetadata4, compileDeclareInjectableFromMetadata, compileInjectable, createR3ProviderExpression, FactoryTarget as FactoryTarget4, LiteralExpr as LiteralExpr4, WrappedNodeExpr as WrappedNodeExpr7 } from "@angular/compiler";
import ts47 from "typescript";
var InjectableDecoratorHandler = class {
  constructor(reflector, isCore, strictCtorDeps, injectableRegistry, perf, errorOnDuplicateProv = true) {
    this.reflector = reflector;
    this.isCore = isCore;
    this.strictCtorDeps = strictCtorDeps;
    this.injectableRegistry = injectableRegistry;
    this.perf = perf;
    this.errorOnDuplicateProv = errorOnDuplicateProv;
    this.precedence = HandlerPrecedence.SHARED;
    this.name = InjectableDecoratorHandler.name;
  }
  detect(node, decorators) {
    if (!decorators) {
      return void 0;
    }
    const decorator = findAngularDecorator(decorators, "Injectable", this.isCore);
    if (decorator !== void 0) {
      return {
        trigger: decorator.node,
        decorator,
        metadata: decorator
      };
    } else {
      return void 0;
    }
  }
  analyze(node, decorator) {
    this.perf.eventCount(PerfEvent.AnalyzeInjectable);
    const meta = extractInjectableMetadata(node, decorator, this.reflector);
    const decorators = this.reflector.getDecoratorsOfDeclaration(node);
    return {
      analysis: {
        meta,
        ctorDeps: extractInjectableCtorDeps(node, meta, decorator, this.reflector, this.isCore, this.strictCtorDeps),
        classMetadata: extractClassMetadata(node, this.reflector, this.isCore),
        needsFactory: !decorators || decorators.every((current) => !isAngularCore(current) || current.name === "Injectable")
      }
    };
  }
  symbol() {
    return null;
  }
  register(node) {
    this.injectableRegistry.registerInjectable(node);
  }
  compileFull(node, analysis) {
    return this.compile(compileNgFactoryDefField, (meta) => compileInjectable(meta, false), compileClassMetadata4, node, analysis);
  }
  compilePartial(node, analysis) {
    return this.compile(compileDeclareFactory, compileDeclareInjectableFromMetadata, compileDeclareClassMetadata4, node, analysis);
  }
  compile(compileFactoryFn, compileInjectableFn, compileClassMetadataFn, node, analysis) {
    const results = [];
    if (analysis.needsFactory) {
      const meta = analysis.meta;
      const factoryRes = compileFactoryFn(toFactoryMetadata(__spreadProps(__spreadValues({}, meta), { deps: analysis.ctorDeps }), FactoryTarget4.Injectable));
      if (analysis.classMetadata !== null) {
        factoryRes.statements.push(compileClassMetadataFn(analysis.classMetadata).toStmt());
      }
      results.push(factoryRes);
    }
    const \u0275prov = this.reflector.getMembersOfClass(node).find((member) => member.name === "\u0275prov");
    if (\u0275prov !== void 0 && this.errorOnDuplicateProv) {
      throw new FatalDiagnosticError(ErrorCode.INJECTABLE_DUPLICATE_PROV, \u0275prov.nameNode || \u0275prov.node || node, "Injectables cannot contain a static \u0275prov property, because the compiler is going to generate one.");
    }
    if (\u0275prov === void 0) {
      const res = compileInjectableFn(analysis.meta);
      results.push({ name: "\u0275prov", initializer: res.expression, statements: res.statements, type: res.type });
    }
    return results;
  }
};
function extractInjectableMetadata(clazz, decorator, reflector) {
  const name = clazz.name.text;
  const type = wrapTypeReference(reflector, clazz);
  const internalType = new WrappedNodeExpr7(reflector.getInternalNameOfClass(clazz));
  const typeArgumentCount = reflector.getGenericArityOfClass(clazz) || 0;
  if (decorator.args === null) {
    throw new FatalDiagnosticError(ErrorCode.DECORATOR_NOT_CALLED, Decorator.nodeForError(decorator), "@Injectable must be called");
  }
  if (decorator.args.length === 0) {
    return {
      name,
      type,
      typeArgumentCount,
      internalType,
      providedIn: createR3ProviderExpression(new LiteralExpr4(null), false)
    };
  } else if (decorator.args.length === 1) {
    const metaNode = decorator.args[0];
    if (!ts47.isObjectLiteralExpression(metaNode)) {
      throw new FatalDiagnosticError(ErrorCode.DECORATOR_ARG_NOT_LITERAL, metaNode, `@Injectable argument must be an object literal`);
    }
    const meta = reflectObjectLiteral(metaNode);
    const providedIn = meta.has("providedIn") ? getProviderExpression(meta.get("providedIn"), reflector) : createR3ProviderExpression(new LiteralExpr4(null), false);
    let deps = void 0;
    if ((meta.has("useClass") || meta.has("useFactory")) && meta.has("deps")) {
      const depsExpr = meta.get("deps");
      if (!ts47.isArrayLiteralExpression(depsExpr)) {
        throw new FatalDiagnosticError(ErrorCode.VALUE_NOT_LITERAL, depsExpr, `@Injectable deps metadata must be an inline array`);
      }
      deps = depsExpr.elements.map((dep) => getDep(dep, reflector));
    }
    const result = { name, type, typeArgumentCount, internalType, providedIn };
    if (meta.has("useValue")) {
      result.useValue = getProviderExpression(meta.get("useValue"), reflector);
    } else if (meta.has("useExisting")) {
      result.useExisting = getProviderExpression(meta.get("useExisting"), reflector);
    } else if (meta.has("useClass")) {
      result.useClass = getProviderExpression(meta.get("useClass"), reflector);
      result.deps = deps;
    } else if (meta.has("useFactory")) {
      result.useFactory = new WrappedNodeExpr7(meta.get("useFactory"));
      result.deps = deps;
    }
    return result;
  } else {
    throw new FatalDiagnosticError(ErrorCode.DECORATOR_ARITY_WRONG, decorator.args[2], "Too many arguments to @Injectable");
  }
}
function getProviderExpression(expression, reflector) {
  const forwardRefValue = tryUnwrapForwardRef(expression, reflector);
  return createR3ProviderExpression(new WrappedNodeExpr7(forwardRefValue != null ? forwardRefValue : expression), forwardRefValue !== null);
}
function extractInjectableCtorDeps(clazz, meta, decorator, reflector, isCore, strictCtorDeps) {
  if (decorator.args === null) {
    throw new FatalDiagnosticError(ErrorCode.DECORATOR_NOT_CALLED, Decorator.nodeForError(decorator), "@Injectable must be called");
  }
  let ctorDeps = null;
  if (decorator.args.length === 0) {
    if (strictCtorDeps) {
      ctorDeps = getValidConstructorDependencies(clazz, reflector, isCore);
    } else {
      ctorDeps = unwrapConstructorDependencies(getConstructorDependencies(clazz, reflector, isCore));
    }
    return ctorDeps;
  } else if (decorator.args.length === 1) {
    const rawCtorDeps = getConstructorDependencies(clazz, reflector, isCore);
    if (strictCtorDeps && meta.useValue === void 0 && meta.useExisting === void 0 && meta.useClass === void 0 && meta.useFactory === void 0) {
      ctorDeps = validateConstructorDependencies(clazz, rawCtorDeps);
    } else {
      ctorDeps = unwrapConstructorDependencies(rawCtorDeps);
    }
  }
  return ctorDeps;
}
function getDep(dep, reflector) {
  const meta = {
    token: new WrappedNodeExpr7(dep),
    attributeNameType: null,
    host: false,
    optional: false,
    self: false,
    skipSelf: false
  };
  function maybeUpdateDecorator(dec, reflector2, token) {
    const source = reflector2.getImportOfIdentifier(dec);
    if (source === null || source.from !== "@angular/core") {
      return false;
    }
    switch (source.name) {
      case "Inject":
        if (token !== void 0) {
          meta.token = new WrappedNodeExpr7(token);
        }
        break;
      case "Optional":
        meta.optional = true;
        break;
      case "SkipSelf":
        meta.skipSelf = true;
        break;
      case "Self":
        meta.self = true;
        break;
      default:
        return false;
    }
    return true;
  }
  if (ts47.isArrayLiteralExpression(dep)) {
    dep.elements.forEach((el) => {
      let isDecorator = false;
      if (ts47.isIdentifier(el)) {
        isDecorator = maybeUpdateDecorator(el, reflector);
      } else if (ts47.isNewExpression(el) && ts47.isIdentifier(el.expression)) {
        const token = el.arguments && el.arguments.length > 0 && el.arguments[0] || void 0;
        isDecorator = maybeUpdateDecorator(el.expression, reflector, token);
      }
      if (!isDecorator) {
        meta.token = new WrappedNodeExpr7(el);
      }
    });
  }
  return meta;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/pipe.mjs
import { compileClassMetadata as compileClassMetadata5, compileDeclareClassMetadata as compileDeclareClassMetadata5, compileDeclarePipeFromMetadata, compilePipeFromMetadata, FactoryTarget as FactoryTarget5, WrappedNodeExpr as WrappedNodeExpr8 } from "@angular/compiler";
import ts48 from "typescript";
var PipeSymbol = class extends SemanticSymbol {
  constructor(decl, name) {
    super(decl);
    this.name = name;
  }
  isPublicApiAffected(previousSymbol) {
    if (!(previousSymbol instanceof PipeSymbol)) {
      return true;
    }
    return this.name !== previousSymbol.name;
  }
  isTypeCheckApiAffected(previousSymbol) {
    return this.isPublicApiAffected(previousSymbol);
  }
};
var PipeDecoratorHandler = class {
  constructor(reflector, evaluator, metaRegistry, scopeRegistry, injectableRegistry, isCore, perf) {
    this.reflector = reflector;
    this.evaluator = evaluator;
    this.metaRegistry = metaRegistry;
    this.scopeRegistry = scopeRegistry;
    this.injectableRegistry = injectableRegistry;
    this.isCore = isCore;
    this.perf = perf;
    this.precedence = HandlerPrecedence.PRIMARY;
    this.name = PipeDecoratorHandler.name;
  }
  detect(node, decorators) {
    if (!decorators) {
      return void 0;
    }
    const decorator = findAngularDecorator(decorators, "Pipe", this.isCore);
    if (decorator !== void 0) {
      return {
        trigger: decorator.node,
        decorator,
        metadata: decorator
      };
    } else {
      return void 0;
    }
  }
  analyze(clazz, decorator) {
    this.perf.eventCount(PerfEvent.AnalyzePipe);
    const name = clazz.name.text;
    const type = wrapTypeReference(this.reflector, clazz);
    const internalType = new WrappedNodeExpr8(this.reflector.getInternalNameOfClass(clazz));
    if (decorator.args === null) {
      throw new FatalDiagnosticError(ErrorCode.DECORATOR_NOT_CALLED, Decorator.nodeForError(decorator), `@Pipe must be called`);
    }
    if (decorator.args.length !== 1) {
      throw new FatalDiagnosticError(ErrorCode.DECORATOR_ARITY_WRONG, Decorator.nodeForError(decorator), "@Pipe must have exactly one argument");
    }
    const meta = unwrapExpression(decorator.args[0]);
    if (!ts48.isObjectLiteralExpression(meta)) {
      throw new FatalDiagnosticError(ErrorCode.DECORATOR_ARG_NOT_LITERAL, meta, "@Pipe must have a literal argument");
    }
    const pipe = reflectObjectLiteral(meta);
    if (!pipe.has("name")) {
      throw new FatalDiagnosticError(ErrorCode.PIPE_MISSING_NAME, meta, `@Pipe decorator is missing name field`);
    }
    const pipeNameExpr = pipe.get("name");
    const pipeName = this.evaluator.evaluate(pipeNameExpr);
    if (typeof pipeName !== "string") {
      throw createValueHasWrongTypeError(pipeNameExpr, pipeName, `@Pipe.name must be a string`);
    }
    let pure = true;
    if (pipe.has("pure")) {
      const expr = pipe.get("pure");
      const pureValue = this.evaluator.evaluate(expr);
      if (typeof pureValue !== "boolean") {
        throw createValueHasWrongTypeError(expr, pureValue, `@Pipe.pure must be a boolean`);
      }
      pure = pureValue;
    }
    return {
      analysis: {
        meta: {
          name,
          type,
          internalType,
          typeArgumentCount: this.reflector.getGenericArityOfClass(clazz) || 0,
          pipeName,
          deps: getValidConstructorDependencies(clazz, this.reflector, this.isCore),
          pure
        },
        classMetadata: extractClassMetadata(clazz, this.reflector, this.isCore),
        pipeNameExpr
      }
    };
  }
  symbol(node, analysis) {
    return new PipeSymbol(node, analysis.meta.name);
  }
  register(node, analysis) {
    const ref = new Reference(node);
    this.metaRegistry.registerPipeMetadata({ type: MetaType.Pipe, ref, name: analysis.meta.pipeName, nameExpr: analysis.pipeNameExpr });
    this.injectableRegistry.registerInjectable(node);
  }
  resolve(node) {
    const duplicateDeclData = this.scopeRegistry.getDuplicateDeclarations(node);
    if (duplicateDeclData !== null) {
      return {
        diagnostics: [makeDuplicateDeclarationError(node, duplicateDeclData, "Pipe")]
      };
    }
    return {};
  }
  compileFull(node, analysis) {
    const fac = compileNgFactoryDefField(toFactoryMetadata(analysis.meta, FactoryTarget5.Pipe));
    const def = compilePipeFromMetadata(analysis.meta);
    const classMetadata = analysis.classMetadata !== null ? compileClassMetadata5(analysis.classMetadata).toStmt() : null;
    return compileResults(fac, def, classMetadata, "\u0275pipe");
  }
  compilePartial(node, analysis) {
    const fac = compileDeclareFactory(toFactoryMetadata(analysis.meta, FactoryTarget5.Pipe));
    const def = compileDeclarePipeFromMetadata(analysis.meta);
    const classMetadata = analysis.classMetadata !== null ? compileDeclareClassMetadata5(analysis.classMetadata).toStmt() : null;
    return compileResults(fac, def, classMetadata, "\u0275pipe");
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/cycles/src/analyzer.mjs
var CycleAnalyzer = class {
  constructor(importGraph) {
    this.importGraph = importGraph;
    this.cachedResults = null;
  }
  wouldCreateCycle(from, to) {
    if (this.cachedResults === null || this.cachedResults.from !== from) {
      this.cachedResults = new CycleResults(from, this.importGraph);
    }
    return this.cachedResults.wouldBeCyclic(to) ? new Cycle(this.importGraph, from, to) : null;
  }
  recordSyntheticImport(from, to) {
    this.cachedResults = null;
    this.importGraph.addSyntheticImport(from, to);
  }
};
var NgCyclicResult = Symbol("NgCyclicResult");
var CycleResults = class {
  constructor(from, importGraph) {
    this.from = from;
    this.importGraph = importGraph;
    this.cyclic = {};
    this.acyclic = {};
  }
  wouldBeCyclic(sf) {
    const cached = this.getCachedResult(sf);
    if (cached !== null) {
      return cached;
    }
    if (sf === this.from) {
      return true;
    }
    this.markAcyclic(sf);
    const imports = this.importGraph.importsOf(sf);
    for (const imported of imports) {
      if (this.wouldBeCyclic(imported)) {
        this.markCyclic(sf);
        return true;
      }
    }
    return false;
  }
  getCachedResult(sf) {
    const result = sf[NgCyclicResult];
    if (result === this.cyclic) {
      return true;
    } else if (result === this.acyclic) {
      return false;
    } else {
      return null;
    }
  }
  markCyclic(sf) {
    sf[NgCyclicResult] = this.cyclic;
  }
  markAcyclic(sf) {
    sf[NgCyclicResult] = this.acyclic;
  }
};
var Cycle = class {
  constructor(importGraph, from, to) {
    this.importGraph = importGraph;
    this.from = from;
    this.to = to;
  }
  getPath() {
    return [this.from, ...this.importGraph.findPath(this.to, this.from)];
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/cycles/src/imports.mjs
import ts49 from "typescript";
var ImportGraph = class {
  constructor(checker, perf) {
    this.checker = checker;
    this.perf = perf;
    this.imports = new Map();
  }
  importsOf(sf) {
    if (!this.imports.has(sf)) {
      this.imports.set(sf, this.scanImports(sf));
    }
    return this.imports.get(sf);
  }
  findPath(start, end) {
    if (start === end) {
      return [start];
    }
    const found = new Set([start]);
    const queue = [new Found(start, null)];
    while (queue.length > 0) {
      const current = queue.shift();
      const imports = this.importsOf(current.sourceFile);
      for (const importedFile of imports) {
        if (!found.has(importedFile)) {
          const next = new Found(importedFile, current);
          if (next.sourceFile === end) {
            return next.toPath();
          }
          found.add(importedFile);
          queue.push(next);
        }
      }
    }
    return null;
  }
  addSyntheticImport(sf, imported) {
    if (isLocalFile(imported)) {
      this.importsOf(sf).add(imported);
    }
  }
  scanImports(sf) {
    return this.perf.inPhase(PerfPhase.CycleDetection, () => {
      const imports = new Set();
      for (const stmt of sf.statements) {
        if (!ts49.isImportDeclaration(stmt) && !ts49.isExportDeclaration(stmt) || stmt.moduleSpecifier === void 0) {
          continue;
        }
        if (ts49.isImportDeclaration(stmt) && stmt.importClause !== void 0 && stmt.importClause.isTypeOnly) {
          continue;
        }
        const symbol = this.checker.getSymbolAtLocation(stmt.moduleSpecifier);
        if (symbol === void 0 || symbol.valueDeclaration === void 0) {
          continue;
        }
        const moduleFile = symbol.valueDeclaration;
        if (ts49.isSourceFile(moduleFile) && isLocalFile(moduleFile)) {
          imports.add(moduleFile);
        }
      }
      return imports;
    });
  }
};
function isLocalFile(sf) {
  return !sf.isDeclarationFile;
}
var Found = class {
  constructor(sourceFile, parent) {
    this.sourceFile = sourceFile;
    this.parent = parent;
  }
  toPath() {
    const array = [];
    let current = this;
    while (current !== null) {
      array.push(current.sourceFile);
      current = current.parent;
    }
    return array.reverse();
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/scope/src/dependency.mjs
var MetadataDtsModuleScopeResolver = class {
  constructor(dtsMetaReader, aliasingHost) {
    this.dtsMetaReader = dtsMetaReader;
    this.aliasingHost = aliasingHost;
    this.cache = new Map();
  }
  resolve(ref) {
    const clazz = ref.node;
    const sourceFile = clazz.getSourceFile();
    if (!sourceFile.isDeclarationFile) {
      throw new Error(`Debug error: DtsModuleScopeResolver.read(${ref.debugName} from ${sourceFile.fileName}), but not a .d.ts file`);
    }
    if (this.cache.has(clazz)) {
      return this.cache.get(clazz);
    }
    const directives = [];
    const pipes = [];
    const ngModules = new Set([clazz]);
    const meta = this.dtsMetaReader.getNgModuleMetadata(ref);
    if (meta === null) {
      this.cache.set(clazz, null);
      return null;
    }
    const declarations = new Set();
    for (const declRef of meta.declarations) {
      declarations.add(declRef.node);
    }
    for (const exportRef of meta.exports) {
      const directive = this.dtsMetaReader.getDirectiveMetadata(exportRef);
      if (directive !== null) {
        const isReExport = !declarations.has(exportRef.node);
        directives.push(this.maybeAlias(directive, sourceFile, isReExport));
        continue;
      }
      const pipe = this.dtsMetaReader.getPipeMetadata(exportRef);
      if (pipe !== null) {
        const isReExport = !declarations.has(exportRef.node);
        pipes.push(this.maybeAlias(pipe, sourceFile, isReExport));
        continue;
      }
      const exportScope2 = this.resolve(exportRef);
      if (exportScope2 !== null) {
        if (this.aliasingHost === null) {
          directives.push(...exportScope2.exported.directives);
          pipes.push(...exportScope2.exported.pipes);
        } else {
          for (const directive2 of exportScope2.exported.directives) {
            directives.push(this.maybeAlias(directive2, sourceFile, true));
          }
          for (const pipe2 of exportScope2.exported.pipes) {
            pipes.push(this.maybeAlias(pipe2, sourceFile, true));
          }
          for (const ngModule of exportScope2.exported.ngModules) {
            ngModules.add(ngModule);
          }
        }
      }
      continue;
    }
    const exportScope = {
      exported: {
        directives,
        pipes,
        ngModules: Array.from(ngModules),
        isPoisoned: false
      }
    };
    this.cache.set(clazz, exportScope);
    return exportScope;
  }
  maybeAlias(dirOrPipe, maybeAliasFrom, isReExport) {
    const ref = dirOrPipe.ref;
    if (this.aliasingHost === null || ref.node.getSourceFile() === maybeAliasFrom) {
      return dirOrPipe;
    }
    const alias = this.aliasingHost.getAliasIn(ref.node, maybeAliasFrom, isReExport);
    if (alias === null) {
      return dirOrPipe;
    }
    return __spreadProps(__spreadValues({}, dirOrPipe), {
      ref: ref.cloneWithAlias(alias)
    });
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/scope/src/local.mjs
import { ExternalExpr as ExternalExpr8 } from "@angular/compiler";
import ts50 from "typescript";
var LocalModuleScopeRegistry = class {
  constructor(localReader, dependencyScopeReader, refEmitter, aliasingHost) {
    this.localReader = localReader;
    this.dependencyScopeReader = dependencyScopeReader;
    this.refEmitter = refEmitter;
    this.aliasingHost = aliasingHost;
    this.sealed = false;
    this.declarationToModule = new Map();
    this.duplicateDeclarations = new Map();
    this.moduleToRef = new Map();
    this.cache = new Map();
    this.remoteScoping = new Map();
    this.scopeErrors = new Map();
    this.modulesWithStructuralErrors = new Set();
  }
  registerNgModuleMetadata(data) {
    this.assertCollecting();
    const ngModule = data.ref.node;
    this.moduleToRef.set(data.ref.node, data.ref);
    for (const decl of data.declarations) {
      this.registerDeclarationOfModule(ngModule, decl, data.rawDeclarations);
    }
  }
  registerDirectiveMetadata(directive) {
  }
  registerPipeMetadata(pipe) {
  }
  getScopeForComponent(clazz) {
    const scope = !this.declarationToModule.has(clazz) ? null : this.getScopeOfModule(this.declarationToModule.get(clazz).ngModule);
    return scope;
  }
  getDuplicateDeclarations(node) {
    if (!this.duplicateDeclarations.has(node)) {
      return null;
    }
    return Array.from(this.duplicateDeclarations.get(node).values());
  }
  getScopeOfModule(clazz) {
    return this.moduleToRef.has(clazz) ? this.getScopeOfModuleReference(this.moduleToRef.get(clazz)) : null;
  }
  getDiagnosticsOfModule(clazz) {
    this.getScopeOfModule(clazz);
    if (this.scopeErrors.has(clazz)) {
      return this.scopeErrors.get(clazz);
    } else {
      return null;
    }
  }
  registerDeclarationOfModule(ngModule, decl, rawDeclarations) {
    const declData = {
      ngModule,
      ref: decl,
      rawDeclarations
    };
    if (this.duplicateDeclarations.has(decl.node)) {
      this.duplicateDeclarations.get(decl.node).set(ngModule, declData);
    } else if (this.declarationToModule.has(decl.node) && this.declarationToModule.get(decl.node).ngModule !== ngModule) {
      const duplicateDeclMap = new Map();
      const firstDeclData = this.declarationToModule.get(decl.node);
      this.modulesWithStructuralErrors.add(firstDeclData.ngModule);
      this.modulesWithStructuralErrors.add(ngModule);
      duplicateDeclMap.set(firstDeclData.ngModule, firstDeclData);
      duplicateDeclMap.set(ngModule, declData);
      this.duplicateDeclarations.set(decl.node, duplicateDeclMap);
      this.declarationToModule.delete(decl.node);
    } else {
      this.declarationToModule.set(decl.node, declData);
    }
  }
  getScopeOfModuleReference(ref) {
    if (this.cache.has(ref.node)) {
      return this.cache.get(ref.node);
    }
    this.sealed = true;
    const ngModule = this.localReader.getNgModuleMetadata(ref);
    if (ngModule === null) {
      this.cache.set(ref.node, null);
      return null;
    }
    const compilationModules = new Set([ngModule.ref.node]);
    const exportedModules = new Set([ngModule.ref.node]);
    const diagnostics = [];
    const compilationDirectives = new Map();
    const compilationPipes = new Map();
    const declared = new Set();
    const exportDirectives = new Map();
    const exportPipes = new Map();
    let isPoisoned = false;
    if (this.modulesWithStructuralErrors.has(ngModule.ref.node)) {
      isPoisoned = true;
    }
    for (const decl of ngModule.imports) {
      const importScope = this.getExportedScope(decl, diagnostics, ref.node, "import");
      if (importScope === null) {
        diagnostics.push(invalidRef(ref.node, decl, "import"));
        isPoisoned = true;
        continue;
      } else if (importScope === "invalid" || importScope.exported.isPoisoned) {
        diagnostics.push(invalidTransitiveNgModuleRef(ref.node, decl, "import"));
        isPoisoned = true;
        if (importScope === "invalid") {
          continue;
        }
      }
      for (const directive of importScope.exported.directives) {
        compilationDirectives.set(directive.ref.node, directive);
      }
      for (const pipe of importScope.exported.pipes) {
        compilationPipes.set(pipe.ref.node, pipe);
      }
      for (const importedModule of importScope.exported.ngModules) {
        compilationModules.add(importedModule);
      }
    }
    for (const decl of ngModule.declarations) {
      const directive = this.localReader.getDirectiveMetadata(decl);
      const pipe = this.localReader.getPipeMetadata(decl);
      if (directive !== null) {
        compilationDirectives.set(decl.node, __spreadProps(__spreadValues({}, directive), { ref: decl }));
        if (directive.isPoisoned) {
          isPoisoned = true;
        }
      } else if (pipe !== null) {
        compilationPipes.set(decl.node, __spreadProps(__spreadValues({}, pipe), { ref: decl }));
      } else {
        const errorNode = decl.getOriginForDiagnostics(ngModule.rawDeclarations);
        diagnostics.push(makeDiagnostic(ErrorCode.NGMODULE_INVALID_DECLARATION, errorNode, `The class '${decl.node.name.text}' is listed in the declarations of the NgModule '${ngModule.ref.node.name.text}', but is not a directive, a component, or a pipe. Either remove it from the NgModule's declarations, or add an appropriate Angular decorator.`, [makeRelatedInformation(decl.node.name, `'${decl.node.name.text}' is declared here.`)]));
        isPoisoned = true;
        continue;
      }
      declared.add(decl.node);
    }
    for (const decl of ngModule.exports) {
      const exportScope = this.getExportedScope(decl, diagnostics, ref.node, "export");
      if (exportScope === "invalid" || exportScope !== null && exportScope.exported.isPoisoned) {
        diagnostics.push(invalidTransitiveNgModuleRef(ref.node, decl, "export"));
        isPoisoned = true;
        if (exportScope === "invalid") {
          continue;
        }
      } else if (exportScope !== null) {
        for (const directive of exportScope.exported.directives) {
          exportDirectives.set(directive.ref.node, directive);
        }
        for (const pipe of exportScope.exported.pipes) {
          exportPipes.set(pipe.ref.node, pipe);
        }
        for (const exportedModule of exportScope.exported.ngModules) {
          exportedModules.add(exportedModule);
        }
      } else if (compilationDirectives.has(decl.node)) {
        const directive = compilationDirectives.get(decl.node);
        exportDirectives.set(decl.node, directive);
      } else if (compilationPipes.has(decl.node)) {
        const pipe = compilationPipes.get(decl.node);
        exportPipes.set(decl.node, pipe);
      } else {
        if (this.localReader.getDirectiveMetadata(decl) !== null || this.localReader.getPipeMetadata(decl) !== null) {
          diagnostics.push(invalidReexport(ref.node, decl));
        } else {
          diagnostics.push(invalidRef(ref.node, decl, "export"));
        }
        isPoisoned = true;
        continue;
      }
    }
    const exported = {
      directives: Array.from(exportDirectives.values()),
      pipes: Array.from(exportPipes.values()),
      ngModules: Array.from(exportedModules),
      isPoisoned
    };
    const reexports = this.getReexports(ngModule, ref, declared, exported, diagnostics);
    const scope = {
      ngModule: ngModule.ref.node,
      compilation: {
        directives: Array.from(compilationDirectives.values()),
        pipes: Array.from(compilationPipes.values()),
        ngModules: Array.from(compilationModules),
        isPoisoned
      },
      exported,
      reexports,
      schemas: ngModule.schemas
    };
    if (diagnostics.length > 0) {
      this.scopeErrors.set(ref.node, diagnostics);
      this.modulesWithStructuralErrors.add(ref.node);
    }
    this.cache.set(ref.node, scope);
    return scope;
  }
  getRemoteScope(node) {
    return this.remoteScoping.has(node) ? this.remoteScoping.get(node) : null;
  }
  setComponentRemoteScope(node, directives, pipes) {
    this.remoteScoping.set(node, { directives, pipes });
  }
  getExportedScope(ref, diagnostics, ownerForErrors, type) {
    if (ref.node.getSourceFile().isDeclarationFile) {
      if (!ts50.isClassDeclaration(ref.node)) {
        const code = type === "import" ? ErrorCode.NGMODULE_INVALID_IMPORT : ErrorCode.NGMODULE_INVALID_EXPORT;
        diagnostics.push(makeDiagnostic(code, identifierOfNode(ref.node) || ref.node, `Appears in the NgModule.${type}s of ${nodeNameForError(ownerForErrors)}, but could not be resolved to an NgModule`));
        return "invalid";
      }
      return this.dependencyScopeReader.resolve(ref);
    } else {
      return this.getScopeOfModuleReference(ref);
    }
  }
  getReexports(ngModule, ref, declared, exported, diagnostics) {
    let reexports = null;
    const sourceFile = ref.node.getSourceFile();
    if (this.aliasingHost === null) {
      return null;
    }
    reexports = [];
    const reexportMap = new Map();
    const ngModuleRef = ref;
    const addReexport = (exportRef) => {
      if (exportRef.node.getSourceFile() === sourceFile) {
        return;
      }
      const isReExport = !declared.has(exportRef.node);
      const exportName = this.aliasingHost.maybeAliasSymbolAs(exportRef, sourceFile, ngModule.ref.node.name.text, isReExport);
      if (exportName === null) {
        return;
      }
      if (!reexportMap.has(exportName)) {
        if (exportRef.alias && exportRef.alias instanceof ExternalExpr8) {
          reexports.push({
            fromModule: exportRef.alias.value.moduleName,
            symbolName: exportRef.alias.value.name,
            asAlias: exportName
          });
        } else {
          const expr = this.refEmitter.emit(exportRef.cloneWithNoIdentifiers(), sourceFile).expression;
          if (!(expr instanceof ExternalExpr8) || expr.value.moduleName === null || expr.value.name === null) {
            throw new Error("Expected ExternalExpr");
          }
          reexports.push({
            fromModule: expr.value.moduleName,
            symbolName: expr.value.name,
            asAlias: exportName
          });
        }
        reexportMap.set(exportName, exportRef);
      } else {
        const prevRef = reexportMap.get(exportName);
        diagnostics.push(reexportCollision(ngModuleRef.node, prevRef, exportRef));
      }
    };
    for (const { ref: ref2 } of exported.directives) {
      addReexport(ref2);
    }
    for (const { ref: ref2 } of exported.pipes) {
      addReexport(ref2);
    }
    return reexports;
  }
  assertCollecting() {
    if (this.sealed) {
      throw new Error(`Assertion: LocalModuleScopeRegistry is not COLLECTING`);
    }
  }
};
function invalidRef(clazz, decl, type) {
  const code = type === "import" ? ErrorCode.NGMODULE_INVALID_IMPORT : ErrorCode.NGMODULE_INVALID_EXPORT;
  const resolveTarget = type === "import" ? "NgModule" : "NgModule, Component, Directive, or Pipe";
  let message = `Appears in the NgModule.${type}s of ${nodeNameForError(clazz)}, but could not be resolved to an ${resolveTarget} class.

`;
  const library = decl.ownedByModuleGuess !== null ? ` (${decl.ownedByModuleGuess})` : "";
  const sf = decl.node.getSourceFile();
  if (!sf.isDeclarationFile) {
    const annotationType = type === "import" ? "@NgModule" : "Angular";
    message += `Is it missing an ${annotationType} annotation?`;
  } else if (sf.fileName.indexOf("node_modules") !== -1) {
    message += `This likely means that the library${library} which declares ${decl.debugName} has not been processed correctly by ngcc, or is not compatible with Angular Ivy. Check if a newer version of the library is available, and update if so. Also consider checking with the library's authors to see if the library is expected to be compatible with Ivy.`;
  } else {
    message += `This likely means that the dependency${library} which declares ${decl.debugName} has not been processed correctly by ngcc.`;
  }
  return makeDiagnostic(code, identifierOfNode(decl.node) || decl.node, message);
}
function invalidTransitiveNgModuleRef(clazz, decl, type) {
  const code = type === "import" ? ErrorCode.NGMODULE_INVALID_IMPORT : ErrorCode.NGMODULE_INVALID_EXPORT;
  return makeDiagnostic(code, identifierOfNode(decl.node) || decl.node, `Appears in the NgModule.${type}s of ${nodeNameForError(clazz)}, but itself has errors`);
}
function invalidReexport(clazz, decl) {
  return makeDiagnostic(ErrorCode.NGMODULE_INVALID_REEXPORT, identifierOfNode(decl.node) || decl.node, `Present in the NgModule.exports of ${nodeNameForError(clazz)} but neither declared nor imported`);
}
function reexportCollision(module7, refA, refB) {
  const childMessageText = `This directive/pipe is part of the exports of '${module7.name.text}' and shares the same name as another exported directive/pipe.`;
  return makeDiagnostic(ErrorCode.NGMODULE_REEXPORT_NAME_COLLISION, module7.name, `
    There was a name collision between two classes named '${refA.node.name.text}', which are both part of the exports of '${module7.name.text}'.

    Angular generates re-exports of an NgModule's exported directives/pipes from the module's source file in certain cases, using the declared name of the class. If two classes of the same name are exported, this automatic naming does not work.

    To fix this problem please re-export one or both classes directly from this file.
  `.trim(), [
    makeRelatedInformation(refA.node.name, childMessageText),
    makeRelatedInformation(refB.node.name, childMessageText)
  ]);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/scope/src/typecheck.mjs
import { CssSelector as CssSelector2, SelectorMatcher as SelectorMatcher2 } from "@angular/compiler";
import ts51 from "typescript";
var TypeCheckScopeRegistry = class {
  constructor(scopeReader, metaReader) {
    this.scopeReader = scopeReader;
    this.metaReader = metaReader;
    this.flattenedDirectiveMetaCache = new Map();
    this.scopeCache = new Map();
  }
  getTypeCheckScope(node) {
    const matcher = new SelectorMatcher2();
    const directives = [];
    const pipes = new Map();
    const scope = this.scopeReader.getScopeForComponent(node);
    if (scope === null) {
      return {
        matcher,
        directives,
        pipes,
        schemas: [],
        isPoisoned: false
      };
    }
    if (this.scopeCache.has(scope.ngModule)) {
      return this.scopeCache.get(scope.ngModule);
    }
    for (const meta of scope.compilation.directives) {
      if (meta.selector !== null) {
        const extMeta = this.getTypeCheckDirectiveMetadata(meta.ref);
        matcher.addSelectables(CssSelector2.parse(meta.selector), extMeta);
        directives.push(extMeta);
      }
    }
    for (const { name, ref } of scope.compilation.pipes) {
      if (!ts51.isClassDeclaration(ref.node)) {
        throw new Error(`Unexpected non-class declaration ${ts51.SyntaxKind[ref.node.kind]} for pipe ${ref.debugName}`);
      }
      pipes.set(name, ref);
    }
    const typeCheckScope = {
      matcher,
      directives,
      pipes,
      schemas: scope.schemas,
      isPoisoned: scope.compilation.isPoisoned || scope.exported.isPoisoned
    };
    this.scopeCache.set(scope.ngModule, typeCheckScope);
    return typeCheckScope;
  }
  getTypeCheckDirectiveMetadata(ref) {
    const clazz = ref.node;
    if (this.flattenedDirectiveMetaCache.has(clazz)) {
      return this.flattenedDirectiveMetaCache.get(clazz);
    }
    const meta = flattenInheritedDirectiveMetadata(this.metaReader, ref);
    this.flattenedDirectiveMetaCache.set(clazz, meta);
    return meta;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/migrations/utils.mjs
import ts52 from "typescript";
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
    args.push(reifySourceFile(ts52.createObjectLiteral(metaArgs)));
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
      reifySourceFile(ts52.createObjectLiteral(metaArgs))
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
  return ts52.createPropertyAssignment(name, ts52.createStringLiteral(value));
}
var EMPTY_SF = ts52.createSourceFile("(empty)", "", ts52.ScriptTarget.Latest);
function reifySourceFile(expr) {
  const printer = ts52.createPrinter();
  const exprText = printer.printNode(ts52.EmitHint.Unspecified, expr, EMPTY_SF);
  const sf = ts52.createSourceFile("(synthetic)", `const expr = ${exprText};`, ts52.ScriptTarget.Latest, true, ts52.ScriptKind.JS);
  const stmt = sf.statements[0];
  if (!ts52.isVariableStatement(stmt)) {
    throw new Error(`Expected VariableStatement, got ${ts52.SyntaxKind[stmt.kind]}`);
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
    const baseRef = readBaseClass2(ref.node, host.reflectionHost, host.evaluator);
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
import ts53 from "typescript";
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
    category: ts53.DiagnosticCategory.Message,
    code: 0
  }];
  if (decorator.args !== null) {
    const args = decorator.args.map((arg) => arg.getText()).join(", ");
    chain.push({
      messageText: `@${decorator.name}(${args})`,
      category: ts53.DiagnosticCategory.Message,
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
  constructor(fs5) {
    this.fs = fs5;
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
  constructor(fs5, bundle, reflectionHost, referencesRegistry, diagnosticHandler = () => {
  }, tsConfig = null) {
    this.fs = fs5;
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
    this.moduleResolver = new ModuleResolver2(this.program, this.options, this.host, null);
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
    const constantPool = new ConstantPool2();
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
import ts54 from "typescript";
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
          const typeParam = dtsFnType && ts54.isTypeReferenceNode(dtsFnType) && dtsFnType.typeArguments && dtsFnType.typeArguments[0] || null;
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
    if (implementation === null || !ts54.isFunctionDeclaration(implementation) && !ts54.isMethodDeclaration(implementation) && !ts54.isFunctionExpression(implementation)) {
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
    if (!ts54.isReturnStatement(lastStatement) || lastStatement.expression === void 0) {
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
      dtsFn = dtsClass && ts54.isClassDeclaration(dtsClass) ? dtsClass.members.find((member) => ts54.isMethodDeclaration(member) && ts54.isIdentifier(member.name) && member.name.text === fn.name) : null;
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
  return ts54.isFunctionDeclaration(declaration) || ts54.isMethodDeclaration(declaration);
}
function isAnyKeyword(typeParam) {
  return typeParam.kind === ts54.SyntaxKind.AnyKeyword;
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
import ts55 from "typescript";
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
  getExportsOfModule(module7) {
    return super.getExportsOfModule(module7) || this.commonJsExports.get(module7.getSourceFile());
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
    const requireCall = isRequireCall(reexportArg) ? reexportArg : ts55.isIdentifier(reexportArg) ? findRequireCallReference(reexportArg, this.checker) : null;
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
    const module7 = this.resolveModuleName(importPath, id.getSourceFile());
    if (module7 === void 0) {
      return null;
    }
    const viaModule = isExternalImport(importPath) ? importPath : null;
    return { node: module7, known: null, viaModule, identity: null, kind: 0 };
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
      const moduleInfo = ts55.resolveModuleName(moduleName, containingFile.fileName, this.program.getCompilerOptions(), this.compilerHost);
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
  getExportsOfModule(module7) {
    if (isFromDtsFile(module7)) {
      const exportMap = this.tsHost.getExportsOfModule(module7);
      if (exportMap !== null) {
        exportMap.forEach((decl) => this.detectKnownDeclaration(decl));
      }
      return exportMap;
    }
    return this.ngccHost.getExportsOfModule(module7);
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
  getSwitchableDeclarations(module7) {
    return this.ngccHost.getSwitchableDeclarations(module7);
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
import ts58 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/rendering/esm5_rendering_formatter.mjs
import ts57 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/rendering/esm_rendering_formatter.mjs
import ts56 from "typescript";

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
function stripExtension3(filePath) {
  return filePath.replace(/\.(js|d\.ts)$/, "");
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/rendering/esm_rendering_formatter.mjs
var EsmRenderingFormatter = class {
  constructor(fs5, host, isCore) {
    this.fs = fs5;
    this.host = host;
    this.isCore = isCore;
    this.printer = ts56.createPrinter({ newLine: ts56.NewLineKind.LineFeed });
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
        const basePath = stripExtension3(from);
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
      if (ts56.isArrayLiteralExpression(containerNode)) {
        const items = containerNode.elements;
        if (items.length === nodesToRemove.length) {
          const statement = findStatement(containerNode);
          if (statement) {
            if (ts56.isExpressionStatement(statement)) {
              output.remove(statement.getFullStart(), statement.getEnd());
            } else if (ts56.isReturnStatement(statement) && statement.expression && isAssignment2(statement.expression)) {
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
      const importPath = info.ngModule.ownedByModuleGuess || (declarationFile !== ngModuleFile ? stripExtension3(relativeImport) : null);
      const ngModule = generateImportString(importManager, importPath, ngModuleName);
      if (info.declaration.type) {
        const typeName = info.declaration.type && ts56.isTypeReferenceNode(info.declaration.type) ? info.declaration.type.typeName : null;
        if (this.isCoreModuleWithProvidersType(typeName)) {
          outputText.overwrite(info.declaration.type.getStart(), info.declaration.type.getEnd(), `ModuleWithProviders<${ngModule}>`);
        } else {
          const originalTypeString = info.declaration.type.getText();
          outputText.overwrite(info.declaration.type.getStart(), info.declaration.type.getEnd(), `(${originalTypeString})&{ngModule:${ngModule}}`);
        }
      } else {
        const lastToken = info.declaration.getLastToken();
        const insertPoint = lastToken && lastToken.kind === ts56.SyntaxKind.SemicolonToken ? lastToken.getStart() : info.declaration.getEnd();
        outputText.appendLeft(insertPoint, `: ${generateImportString(importManager, "@angular/core", "ModuleWithProviders")}<${ngModule}>`);
      }
    });
  }
  printStatement(stmt, sourceFile, importManager) {
    const node = translateStatement(stmt, importManager);
    const code = this.printer.printNode(ts56.EmitHint.Unspecified, node, sourceFile);
    return code;
  }
  findEndOfImports(sf) {
    for (const stmt of sf.statements) {
      if (!ts56.isImportDeclaration(stmt) && !ts56.isImportEqualsDeclaration(stmt) && !ts56.isNamespaceImport(stmt)) {
        return stmt.getStart();
      }
    }
    return 0;
  }
  isCoreModuleWithProvidersType(typeName) {
    const id = typeName && ts56.isIdentifier(typeName) ? this.host.getImportOfIdentifier(typeName) : null;
    return id && id.name === "ModuleWithProviders" && (this.isCore || id.from === "@angular/core");
  }
};
function findStatement(node) {
  while (node) {
    if (ts56.isExpressionStatement(node) || ts56.isReturnStatement(node)) {
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
  return lastToken && lastToken.kind === ts56.SyntaxKind.SemicolonToken ? statement.getEnd() - 1 : statement.getEnd();
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
    if (!iifeBody || !ts57.isBlock(iifeBody)) {
      throw new Error(`Compiled class declaration is not inside an IIFE: ${compiledClass.name} in ${compiledClass.declaration.getSourceFile().fileName}`);
    }
    const returnStatement = iifeBody.statements.find(ts57.isReturnStatement);
    if (!returnStatement) {
      throw new Error(`Compiled class wrapper IIFE does not have a return statement: ${compiledClass.name} in ${compiledClass.declaration.getSourceFile().fileName}`);
    }
    const insertionPoint = returnStatement.getFullStart();
    output.appendLeft(insertionPoint, "\n" + definitions);
  }
  printStatement(stmt, sourceFile, importManager) {
    const node = translateStatement(stmt, importManager, { downlevelTaggedTemplates: true, downlevelVariableDeclarations: true });
    const code = this.printer.printNode(ts57.EmitHint.Unspecified, node, sourceFile);
    return code;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/rendering/commonjs_rendering_formatter.mjs
var CommonJsRenderingFormatter = class extends Esm5RenderingFormatter {
  constructor(fs5, commonJsHost, isCore) {
    super(fs5, commonJsHost, isCore);
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
      const basePath = stripExtension3(e.from);
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
      if (ts58.isExpressionStatement(statement) && isRequireCall(statement.expression)) {
        continue;
      }
      const declarations = ts58.isVariableStatement(statement) ? Array.from(statement.declarationList.declarations) : [];
      if (declarations.some((d) => !d.initializer || !isRequireCall(d.initializer))) {
        return statement.getStart();
      }
    }
    return 0;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/rendering/dts_renderer.mjs
import MagicString from "magic-string";
import ts59 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/constants.mjs
var IMPORT_PREFIX = "\u0275ngcc";
var NGCC_TIMED_OUT_EXIT_CODE = 177;

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/rendering/source_maps.mjs
import mapHelpers3 from "convert-source-map";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/sourcemaps/src/content_origin.mjs
var ContentOrigin;
(function(ContentOrigin2) {
  ContentOrigin2[ContentOrigin2["Provided"] = 0] = "Provided";
  ContentOrigin2[ContentOrigin2["Inline"] = 1] = "Inline";
  ContentOrigin2[ContentOrigin2["FileSystem"] = 2] = "FileSystem";
})(ContentOrigin || (ContentOrigin = {}));

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/sourcemaps/src/source_file.mjs
import mapHelpers from "convert-source-map";
import { decode, encode } from "sourcemap-codec";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/sourcemaps/src/segment_marker.mjs
function compareSegments(a, b) {
  return a.position - b.position;
}
function offsetSegment(startOfLinePositions, marker, offset) {
  if (offset === 0) {
    return marker;
  }
  let line = marker.line;
  const position = marker.position + offset;
  while (line < startOfLinePositions.length - 1 && startOfLinePositions[line + 1] <= position) {
    line++;
  }
  while (line > 0 && startOfLinePositions[line] > position) {
    line--;
  }
  const column = position - startOfLinePositions[line];
  return { line, column, position, next: void 0 };
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/sourcemaps/src/source_file.mjs
function removeSourceMapComments(contents) {
  return mapHelpers.removeMapFileComments(mapHelpers.removeComments(contents)).replace(/\n\n$/, "\n");
}
var SourceFile = class {
  constructor(sourcePath, contents, rawMap, sources, fs5) {
    this.sourcePath = sourcePath;
    this.contents = contents;
    this.rawMap = rawMap;
    this.sources = sources;
    this.fs = fs5;
    this.contents = removeSourceMapComments(contents);
    this.startOfLinePositions = computeStartOfLinePositions(this.contents);
    this.flattenedMappings = this.flattenMappings();
  }
  renderFlattenedSourceMap() {
    const sources = new IndexedMap();
    const names = new IndexedSet();
    const mappings = [];
    const sourcePathDir = this.fs.dirname(this.sourcePath);
    const relativeSourcePathCache = new Cache((input) => this.fs.relative(sourcePathDir, input));
    for (const mapping of this.flattenedMappings) {
      const sourceIndex = sources.set(relativeSourcePathCache.get(mapping.originalSource.sourcePath), mapping.originalSource.contents);
      const mappingArray = [
        mapping.generatedSegment.column,
        sourceIndex,
        mapping.originalSegment.line,
        mapping.originalSegment.column
      ];
      if (mapping.name !== void 0) {
        const nameIndex = names.add(mapping.name);
        mappingArray.push(nameIndex);
      }
      const line = mapping.generatedSegment.line;
      while (line >= mappings.length) {
        mappings.push([]);
      }
      mappings[line].push(mappingArray);
    }
    const sourceMap = {
      version: 3,
      file: this.fs.relative(sourcePathDir, this.sourcePath),
      sources: sources.keys,
      names: names.values,
      mappings: encode(mappings),
      sourcesContent: sources.values
    };
    return sourceMap;
  }
  getOriginalLocation(line, column) {
    if (this.flattenedMappings.length === 0) {
      return null;
    }
    let position;
    if (line < this.startOfLinePositions.length) {
      position = this.startOfLinePositions[line] + column;
    } else {
      position = this.contents.length;
    }
    const locationSegment = { line, column, position, next: void 0 };
    let mappingIndex = findLastMappingIndexBefore(this.flattenedMappings, locationSegment, false, 0);
    if (mappingIndex < 0) {
      mappingIndex = 0;
    }
    const { originalSegment, originalSource, generatedSegment } = this.flattenedMappings[mappingIndex];
    const offset = locationSegment.position - generatedSegment.position;
    const offsetOriginalSegment = offsetSegment(originalSource.startOfLinePositions, originalSegment, offset);
    return {
      file: originalSource.sourcePath,
      line: offsetOriginalSegment.line,
      column: offsetOriginalSegment.column
    };
  }
  flattenMappings() {
    const mappings = parseMappings(this.rawMap && this.rawMap.map, this.sources, this.startOfLinePositions);
    ensureOriginalSegmentLinks(mappings);
    const flattenedMappings = [];
    for (let mappingIndex = 0; mappingIndex < mappings.length; mappingIndex++) {
      const aToBmapping = mappings[mappingIndex];
      const bSource = aToBmapping.originalSource;
      if (bSource.flattenedMappings.length === 0) {
        flattenedMappings.push(aToBmapping);
        continue;
      }
      const incomingStart = aToBmapping.originalSegment;
      const incomingEnd = incomingStart.next;
      let outgoingStartIndex = findLastMappingIndexBefore(bSource.flattenedMappings, incomingStart, false, 0);
      if (outgoingStartIndex < 0) {
        outgoingStartIndex = 0;
      }
      const outgoingEndIndex = incomingEnd !== void 0 ? findLastMappingIndexBefore(bSource.flattenedMappings, incomingEnd, true, outgoingStartIndex) : bSource.flattenedMappings.length - 1;
      for (let bToCmappingIndex = outgoingStartIndex; bToCmappingIndex <= outgoingEndIndex; bToCmappingIndex++) {
        const bToCmapping = bSource.flattenedMappings[bToCmappingIndex];
        flattenedMappings.push(mergeMappings(this, aToBmapping, bToCmapping));
      }
    }
    return flattenedMappings;
  }
};
function findLastMappingIndexBefore(mappings, marker, exclusive, lowerIndex) {
  let upperIndex = mappings.length - 1;
  const test = exclusive ? -1 : 0;
  if (compareSegments(mappings[lowerIndex].generatedSegment, marker) > test) {
    return -1;
  }
  let matchingIndex = -1;
  while (lowerIndex <= upperIndex) {
    const index = upperIndex + lowerIndex >> 1;
    if (compareSegments(mappings[index].generatedSegment, marker) <= test) {
      matchingIndex = index;
      lowerIndex = index + 1;
    } else {
      upperIndex = index - 1;
    }
  }
  return matchingIndex;
}
function mergeMappings(generatedSource, ab, bc) {
  const name = bc.name || ab.name;
  const diff = compareSegments(bc.generatedSegment, ab.originalSegment);
  if (diff > 0) {
    return {
      name,
      generatedSegment: offsetSegment(generatedSource.startOfLinePositions, ab.generatedSegment, diff),
      originalSource: bc.originalSource,
      originalSegment: bc.originalSegment
    };
  } else {
    return {
      name,
      generatedSegment: ab.generatedSegment,
      originalSource: bc.originalSource,
      originalSegment: offsetSegment(bc.originalSource.startOfLinePositions, bc.originalSegment, -diff)
    };
  }
}
function parseMappings(rawMap, sources, generatedSourceStartOfLinePositions) {
  if (rawMap === null) {
    return [];
  }
  const rawMappings = decode(rawMap.mappings);
  if (rawMappings === null) {
    return [];
  }
  const mappings = [];
  for (let generatedLine = 0; generatedLine < rawMappings.length; generatedLine++) {
    const generatedLineMappings = rawMappings[generatedLine];
    for (const rawMapping of generatedLineMappings) {
      if (rawMapping.length >= 4) {
        const originalSource = sources[rawMapping[1]];
        if (originalSource === null || originalSource === void 0) {
          continue;
        }
        const generatedColumn = rawMapping[0];
        const name = rawMapping.length === 5 ? rawMap.names[rawMapping[4]] : void 0;
        const line = rawMapping[2];
        const column = rawMapping[3];
        const generatedSegment = {
          line: generatedLine,
          column: generatedColumn,
          position: generatedSourceStartOfLinePositions[generatedLine] + generatedColumn,
          next: void 0
        };
        const originalSegment = {
          line,
          column,
          position: originalSource.startOfLinePositions[line] + column,
          next: void 0
        };
        mappings.push({ name, generatedSegment, originalSegment, originalSource });
      }
    }
  }
  return mappings;
}
function extractOriginalSegments(mappings) {
  const originalSegments = new Map();
  for (const mapping of mappings) {
    const originalSource = mapping.originalSource;
    if (!originalSegments.has(originalSource)) {
      originalSegments.set(originalSource, []);
    }
    const segments = originalSegments.get(originalSource);
    segments.push(mapping.originalSegment);
  }
  originalSegments.forEach((segmentMarkers) => segmentMarkers.sort(compareSegments));
  return originalSegments;
}
function ensureOriginalSegmentLinks(mappings) {
  const segmentsBySource = extractOriginalSegments(mappings);
  segmentsBySource.forEach((markers) => {
    for (let i = 0; i < markers.length - 1; i++) {
      markers[i].next = markers[i + 1];
    }
  });
}
function computeStartOfLinePositions(str) {
  const NEWLINE_MARKER_OFFSET = 1;
  const lineLengths = computeLineLengths(str);
  const startPositions = [0];
  for (let i = 0; i < lineLengths.length - 1; i++) {
    startPositions.push(startPositions[i] + lineLengths[i] + NEWLINE_MARKER_OFFSET);
  }
  return startPositions;
}
function computeLineLengths(str) {
  return str.split(/\n/).map((s) => s.length);
}
var IndexedMap = class {
  constructor() {
    this.map = new Map();
    this.keys = [];
    this.values = [];
  }
  set(key, value) {
    if (this.map.has(key)) {
      return this.map.get(key);
    }
    const index = this.values.push(value) - 1;
    this.keys.push(key);
    this.map.set(key, index);
    return index;
  }
};
var IndexedSet = class {
  constructor() {
    this.map = new Map();
    this.values = [];
  }
  add(value) {
    if (this.map.has(value)) {
      return this.map.get(value);
    }
    const index = this.values.push(value) - 1;
    this.map.set(value, index);
    return index;
  }
};
var Cache = class {
  constructor(computeFn) {
    this.computeFn = computeFn;
    this.map = new Map();
  }
  get(input) {
    if (!this.map.has(input)) {
      this.map.set(input, this.computeFn(input));
    }
    return this.map.get(input);
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/sourcemaps/src/source_file_loader.mjs
import mapHelpers2 from "convert-source-map";
var SCHEME_MATCHER = /^([a-z][a-z0-9.-]*):\/\//i;
var SourceFileLoader = class {
  constructor(fs5, logger, schemeMap) {
    this.fs = fs5;
    this.logger = logger;
    this.schemeMap = schemeMap;
    this.currentPaths = [];
  }
  loadSourceFile(sourcePath, contents = null, mapAndPath = null) {
    const contentsOrigin = contents !== null ? ContentOrigin.Provided : ContentOrigin.FileSystem;
    const sourceMapInfo = mapAndPath && __spreadValues({ origin: ContentOrigin.Provided }, mapAndPath);
    return this.loadSourceFileInternal(sourcePath, contents, contentsOrigin, sourceMapInfo);
  }
  loadSourceFileInternal(sourcePath, contents, sourceOrigin, sourceMapInfo) {
    const previousPaths = this.currentPaths.slice();
    try {
      if (contents === null) {
        if (!this.fs.exists(sourcePath)) {
          return null;
        }
        contents = this.readSourceFile(sourcePath);
      }
      if (sourceMapInfo === null) {
        sourceMapInfo = this.loadSourceMap(sourcePath, contents, sourceOrigin);
      }
      let sources = [];
      if (sourceMapInfo !== null) {
        const basePath = sourceMapInfo.mapPath || sourcePath;
        sources = this.processSources(basePath, sourceMapInfo);
      }
      return new SourceFile(sourcePath, contents, sourceMapInfo, sources, this.fs);
    } catch (e) {
      this.logger.warn(`Unable to fully load ${sourcePath} for source-map flattening: ${e.message}`);
      return null;
    } finally {
      this.currentPaths = previousPaths;
    }
  }
  loadSourceMap(sourcePath, sourceContents, sourceOrigin) {
    const lastLine = this.getLastNonEmptyLine(sourceContents);
    const inline = mapHelpers2.commentRegex.exec(lastLine);
    if (inline !== null) {
      return {
        map: mapHelpers2.fromComment(inline.pop()).sourcemap,
        mapPath: null,
        origin: ContentOrigin.Inline
      };
    }
    if (sourceOrigin === ContentOrigin.Inline) {
      return null;
    }
    const external = mapHelpers2.mapFileCommentRegex.exec(lastLine);
    if (external) {
      try {
        const fileName = external[1] || external[2];
        const externalMapPath = this.fs.resolve(this.fs.dirname(sourcePath), fileName);
        return {
          map: this.readRawSourceMap(externalMapPath),
          mapPath: externalMapPath,
          origin: ContentOrigin.FileSystem
        };
      } catch (e) {
        this.logger.warn(`Unable to fully load ${sourcePath} for source-map flattening: ${e.message}`);
        return null;
      }
    }
    const impliedMapPath = this.fs.resolve(sourcePath + ".map");
    if (this.fs.exists(impliedMapPath)) {
      return {
        map: this.readRawSourceMap(impliedMapPath),
        mapPath: impliedMapPath,
        origin: ContentOrigin.FileSystem
      };
    }
    return null;
  }
  processSources(basePath, { map, origin: sourceMapOrigin }) {
    const sourceRoot = this.fs.resolve(this.fs.dirname(basePath), this.replaceSchemeWithPath(map.sourceRoot || ""));
    return map.sources.map((source, index) => {
      const path7 = this.fs.resolve(sourceRoot, this.replaceSchemeWithPath(source));
      const content = map.sourcesContent && map.sourcesContent[index] || null;
      const sourceOrigin = content !== null && sourceMapOrigin !== ContentOrigin.Provided ? ContentOrigin.Inline : ContentOrigin.FileSystem;
      return this.loadSourceFileInternal(path7, content, sourceOrigin, null);
    });
  }
  readSourceFile(sourcePath) {
    this.trackPath(sourcePath);
    return this.fs.readFile(sourcePath);
  }
  readRawSourceMap(mapPath) {
    this.trackPath(mapPath);
    return JSON.parse(this.fs.readFile(mapPath));
  }
  trackPath(path7) {
    if (this.currentPaths.includes(path7)) {
      throw new Error(`Circular source file mapping dependency: ${this.currentPaths.join(" -> ")} -> ${path7}`);
    }
    this.currentPaths.push(path7);
  }
  getLastNonEmptyLine(contents) {
    let trailingWhitespaceIndex = contents.length - 1;
    while (trailingWhitespaceIndex > 0 && (contents[trailingWhitespaceIndex] === "\n" || contents[trailingWhitespaceIndex] === "\r")) {
      trailingWhitespaceIndex--;
    }
    let lastRealLineIndex = contents.lastIndexOf("\n", trailingWhitespaceIndex - 1);
    if (lastRealLineIndex === -1) {
      lastRealLineIndex = 0;
    }
    return contents.substr(lastRealLineIndex + 1);
  }
  replaceSchemeWithPath(path7) {
    return path7.replace(SCHEME_MATCHER, (_, scheme) => this.schemeMap[scheme.toLowerCase()] || "");
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/rendering/source_maps.mjs
function renderSourceAndMap(logger, fs5, sourceFile, generatedMagicString) {
  var _a;
  const sourceFilePath = absoluteFromSourceFile(sourceFile);
  const sourceMapPath = absoluteFrom(`${sourceFilePath}.map`);
  const generatedContent = generatedMagicString.toString();
  const generatedMap = generatedMagicString.generateMap({ file: sourceFilePath, source: sourceFilePath, includeContent: true });
  try {
    const loader = new SourceFileLoader(fs5, logger, {});
    const generatedFile = loader.loadSourceFile(sourceFilePath, generatedContent, { map: generatedMap, mapPath: sourceMapPath });
    const rawMergedMap = generatedFile.renderFlattenedSourceMap();
    const mergedMap = mapHelpers3.fromObject(rawMergedMap);
    const originalFile = loader.loadSourceFile(sourceFilePath, generatedMagicString.original);
    if (originalFile.rawMap === null && !sourceFile.isDeclarationFile || ((_a = originalFile.rawMap) == null ? void 0 : _a.origin) === ContentOrigin.Inline) {
      return [
        { path: sourceFilePath, contents: `${generatedFile.contents}
${mergedMap.toComment()}` }
      ];
    }
    const sourceMapComment = mapHelpers3.generateMapFileComment(`${fs5.basename(sourceFilePath)}.map`);
    return [
      { path: sourceFilePath, contents: `${generatedFile.contents}
${sourceMapComment}` },
      { path: sourceMapPath, contents: mergedMap.toJSON() }
    ];
  } catch (e) {
    logger.error(`Error when flattening the source-map "${sourceMapPath}" for "${sourceFilePath}": ${e.toString()}`);
    return [
      { path: sourceFilePath, contents: generatedContent },
      { path: sourceMapPath, contents: mapHelpers3.fromObject(generatedMap).toJSON() }
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
  constructor(dtsFormatter, fs5, logger, host, bundle) {
    this.dtsFormatter = dtsFormatter;
    this.fs = fs5;
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
    const printer = ts59.createPrinter();
    const importManager = new ImportManager(getImportRewriter(this.bundle.dts.r3SymbolsFile, this.bundle.isCore, false), IMPORT_PREFIX);
    renderInfo.classInfo.forEach((dtsClass) => {
      const endOfClass = dtsClass.dtsDeclaration.getEnd();
      dtsClass.compilation.forEach((declaration) => {
        const type = translateType(declaration.type, importManager);
        markForEmitAsSingleLine2(type);
        const typeStr = printer.printNode(ts59.EmitHint.Unspecified, type, dtsFile);
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
function markForEmitAsSingleLine2(node) {
  ts59.setEmitFlags(node, ts59.EmitFlags.SingleLine);
  ts59.forEachChild(node, markForEmitAsSingleLine2);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/rendering/renderer.mjs
import { jsDocComment, WrappedNodeExpr as WrappedNodeExpr9, WritePropExpr } from "@angular/compiler";
import MagicString2 from "magic-string";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/rendering/rendering_formatter.mjs
var RedundantDecoratorMap = Map;

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/rendering/renderer.mjs
var Renderer = class {
  constructor(host, srcFormatter, fs5, logger, bundle, tsConfig = null) {
    this.host = host;
    this.srcFormatter = srcFormatter;
    this.fs = fs5;
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
      const entryPointBasePath = stripExtension3(this.bundle.src.path);
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
  const receiver = new WrappedNodeExpr9(receiverName);
  const statement = new WritePropExpr(receiver, propName, initializer, void 0, void 0).toStmt();
  if (leadingComment !== void 0) {
    statement.addLeadingComment(leadingComment);
  }
  return statement;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/rendering/umd_rendering_formatter.mjs
import ts60 from "typescript";
var UmdRenderingFormatter = class extends Esm5RenderingFormatter {
  constructor(fs5, umdHost, isCore) {
    super(fs5, umdHost, isCore);
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
    const wrapperFunction = umdModule.wrapperFn;
    renderCommonJsDependencies(output, wrapperFunction, imports);
    renderAmdDependencies(output, wrapperFunction, imports);
    renderGlobalDependencies(output, wrapperFunction, imports);
    renderFactoryParameters(output, wrapperFunction, imports);
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
      const basePath = stripExtension3(e.from);
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
  if (dependencyArray === void 0 || !ts60.isArrayLiteralExpression(dependencyArray)) {
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
function renderFactoryParameters(output, wrapperFunction, imports) {
  const wrapperCall = wrapperFunction.parent;
  const secondArgument = wrapperCall.arguments[1];
  if (!secondArgument) {
    return;
  }
  const factoryFunction = ts60.isParenthesizedExpression(secondArgument) ? secondArgument.expression : secondArgument;
  if (!ts60.isFunctionExpression(factoryFunction)) {
    return;
  }
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
  if (!ts60.isConditionalExpression(value)) {
    return false;
  }
  if (!ts60.isBinaryExpression(value.condition) || value.condition.operatorToken.kind !== ts60.SyntaxKind.AmpersandAmpersandToken) {
    return false;
  }
  if (!oneOfBinaryConditions(value.condition, (exp) => isTypeOf(exp, "exports", "module"))) {
    return false;
  }
  if (!ts60.isCallExpression(value.whenTrue) || !ts60.isIdentifier(value.whenTrue.expression)) {
    return false;
  }
  return value.whenTrue.expression.text === "factory";
}
function isAmdConditional(value) {
  if (!ts60.isConditionalExpression(value)) {
    return false;
  }
  if (!ts60.isBinaryExpression(value.condition) || value.condition.operatorToken.kind !== ts60.SyntaxKind.AmpersandAmpersandToken) {
    return false;
  }
  if (!oneOfBinaryConditions(value.condition, (exp) => isTypeOf(exp, "define"))) {
    return false;
  }
  if (!ts60.isCallExpression(value.whenTrue) || !ts60.isIdentifier(value.whenTrue.expression)) {
    return false;
  }
  return value.whenTrue.expression.text === "define";
}
function isGlobalFactoryCall(value) {
  if (ts60.isCallExpression(value) && !!value.parent) {
    value = isCommaExpression(value.parent) ? value.parent : value;
    value = ts60.isParenthesizedExpression(value.parent) ? value.parent : value;
    return !!value.parent && ts60.isConditionalExpression(value.parent) && value.parent.whenFalse === value;
  } else {
    return false;
  }
}
function isCommaExpression(value) {
  return ts60.isBinaryExpression(value) && value.operatorToken.kind === ts60.SyntaxKind.CommaToken;
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
  return ts60.isBinaryExpression(node) && ts60.isTypeOfExpression(node.left) && ts60.isIdentifier(node.left.expression) && types.indexOf(node.left.expression.text) !== -1;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/packages/transformer.mjs
var Transformer = class {
  constructor(fs5, logger, tsConfig = null) {
    this.fs = fs5;
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
  return diagnostics.some((d) => d.category === ts61.DiagnosticCategory.Error);
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
          logger.warn(replaceTsWithNgInErrors(ts62.formatDiagnosticsWithColorAndContext(result.diagnostics, bundle.src.host)));
        }
        const writeBundle = () => {
          fileWriter.writeBundle(bundle, result.transformedFiles, formatPropertiesToMarkAsProcessed);
          logger.debug(`  Successfully compiled ${entryPoint.name} : ${formatProperty}`);
          onTaskCompleted(task, 0, null);
        };
        const beforeWritingResult = beforeWritingFiles(result.transformedFiles);
        return beforeWritingResult instanceof Promise ? beforeWritingResult.then(writeBundle) : writeBundle();
      } else {
        const errors = replaceTsWithNgInErrors(ts62.formatDiagnosticsWithColorAndContext(result.diagnostics, bundle.src.host));
        onTaskCompleted(task, 1, `compilation errors:
${errors}`);
      }
    };
  };
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/execution/single_process_executor.mjs
var SingleProcessorExecutorBase = class {
  constructor(logger, createTaskCompletedCallback) {
    this.logger = logger;
    this.createTaskCompletedCallback = createTaskCompletedCallback;
  }
  doExecute(analyzeEntryPoints, createCompileFn) {
    this.logger.debug(`Running ngcc on ${this.constructor.name}.`);
    const taskQueue = analyzeEntryPoints();
    const onTaskCompleted = this.createTaskCompletedCallback(taskQueue);
    const compile = createCompileFn(() => {
    }, onTaskCompleted);
    this.logger.debug("Processing tasks...");
    const startTime2 = Date.now();
    while (!taskQueue.allTasksCompleted) {
      const task = taskQueue.getNextTask();
      compile(task);
      taskQueue.markAsCompleted(task);
    }
    const duration = Math.round((Date.now() - startTime2) / 1e3);
    this.logger.debug(`Processed tasks in ${duration}s.`);
  }
};
var SingleProcessExecutorSync = class extends SingleProcessorExecutorBase {
  constructor(logger, lockFile, createTaskCompletedCallback) {
    super(logger, createTaskCompletedCallback);
    this.lockFile = lockFile;
  }
  execute(analyzeEntryPoints, createCompileFn) {
    this.lockFile.lock(() => this.doExecute(analyzeEntryPoints, createCompileFn));
  }
};
var SingleProcessExecutorAsync = class extends SingleProcessorExecutorBase {
  constructor(logger, lockFile, createTaskCompletedCallback) {
    super(logger, createTaskCompletedCallback);
    this.lockFile = lockFile;
  }
  async execute(analyzeEntryPoints, createCompileFn) {
    await this.lockFile.lock(async () => this.doExecute(analyzeEntryPoints, createCompileFn));
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/execution/tasks/completion.mjs
function composeTaskCompletedCallbacks(callbacks) {
  return (task, outcome, message) => {
    const callback = callbacks[outcome];
    if (callback === void 0) {
      throw new Error(`Unknown task outcome: "${outcome}" - supported outcomes: ${JSON.stringify(Object.keys(callbacks))}`);
    }
    callback(task, message);
  };
}
function createMarkAsProcessedHandler(fs5, pkgJsonUpdater) {
  return (task) => {
    const { entryPoint, formatPropertiesToMarkAsProcessed, processDts } = task;
    const packageJsonPath = fs5.resolve(entryPoint.path, "package.json");
    const propsToMarkAsProcessed = [...formatPropertiesToMarkAsProcessed];
    if (processDts !== DtsProcessing.No) {
      propsToMarkAsProcessed.push("typings");
    }
    markAsProcessed(pkgJsonUpdater, entryPoint.packageJson, packageJsonPath, propsToMarkAsProcessed);
  };
}
function createThrowErrorHandler(fs5) {
  return (task, message) => {
    throw new Error(createErrorMessage(fs5, task, message));
  };
}
function createLogErrorHandler(logger, fs5, taskQueue) {
  return (task, message) => {
    taskQueue.markAsFailed(task);
    logger.error(createErrorMessage(fs5, task, message));
  };
}
function createErrorMessage(fs5, task, message) {
  var _a;
  const jsFormat = `\`${task.formatProperty}\` as ${(_a = getEntryPointFormat(fs5, task.entryPoint, task.formatProperty)) != null ? _a : "unknown format"}`;
  const format = task.typingsOnly ? `typings only using ${jsFormat}` : jsFormat;
  message = message !== null ? ` due to ${message}` : "";
  return `Failed to compile entry-point ${task.entryPoint.name} (${format})` + message;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/locking/async_locker.mjs
var TimeoutError = class extends Error {
  constructor() {
    super(...arguments);
    this.code = NGCC_TIMED_OUT_EXIT_CODE;
  }
};
var AsyncLocker = class {
  constructor(lockFile, logger, retryDelay, retryAttempts) {
    this.lockFile = lockFile;
    this.logger = logger;
    this.retryDelay = retryDelay;
    this.retryAttempts = retryAttempts;
  }
  async lock(fn) {
    await this.create();
    try {
      return await fn();
    } finally {
      this.lockFile.remove();
    }
  }
  async create() {
    let pid = "";
    for (let attempts = 0; attempts < this.retryAttempts; attempts++) {
      try {
        return this.lockFile.write();
      } catch (e) {
        if (e.code !== "EEXIST") {
          throw e;
        }
        const newPid = this.lockFile.read();
        if (newPid !== pid) {
          attempts = 0;
          pid = newPid;
        }
        if (attempts === 0) {
          this.logger.info(`Another process, with id ${pid}, is currently running ngcc.
Waiting up to ${this.retryDelay * this.retryAttempts / 1e3}s for it to finish.
(If you are sure no ngcc process is running then you should delete the lock-file at ${this.lockFile.path}.)`);
        }
        await new Promise((resolve5) => setTimeout(resolve5, this.retryDelay));
      }
    }
    throw new TimeoutError(`Timed out waiting ${this.retryAttempts * this.retryDelay / 1e3}s for another ngcc process, with id ${pid}, to complete.
(If you are sure no ngcc process is running then you should delete the lock-file at ${this.lockFile.path}.)`);
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/locking/lock_file_with_child_process/index.mjs
import { fork } from "child_process";
import module5 from "module";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/logging/src/logger.mjs
var LogLevel;
(function(LogLevel2) {
  LogLevel2[LogLevel2["debug"] = 0] = "debug";
  LogLevel2[LogLevel2["info"] = 1] = "info";
  LogLevel2[LogLevel2["warn"] = 2] = "warn";
  LogLevel2[LogLevel2["error"] = 3] = "error";
})(LogLevel || (LogLevel = {}));

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/logging/src/console_logger.mjs
var RESET = "[0m";
var RED = "[31m";
var YELLOW = "[33m";
var BLUE = "[36m";
var DEBUG = `${BLUE}Debug:${RESET}`;
var WARN = `${YELLOW}Warning:${RESET}`;
var ERROR = `${RED}Error:${RESET}`;
var ConsoleLogger = class {
  constructor(level) {
    this.level = level;
  }
  debug(...args) {
    if (this.level <= LogLevel.debug)
      console.debug(DEBUG, ...args);
  }
  info(...args) {
    if (this.level <= LogLevel.info)
      console.info(...args);
  }
  warn(...args) {
    if (this.level <= LogLevel.warn)
      console.warn(WARN, ...args);
  }
  error(...args) {
    if (this.level <= LogLevel.error)
      console.error(ERROR, ...args);
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/locking/lock_file.mjs
import module4 from "module";
function getLockFilePath(fs5) {
  const requireFn = typeof __require !== "undefined" ? __require : module4.createRequire(__ESM_IMPORT_META_URL__);
  const ngccEntryPointFile = requireFn.resolve("@angular/compiler-cli/ngcc");
  return fs5.resolve(ngccEntryPointFile, "../__ngcc_lock_file__");
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/locking/lock_file_with_child_process/util.mjs
function removeLockFile(fs5, logger, lockFilePath, pid) {
  try {
    logger.debug(`Attempting to remove lock-file at ${lockFilePath}.`);
    const lockFilePid = fs5.readFile(lockFilePath);
    if (lockFilePid === pid) {
      logger.debug(`PIDs match (${pid}), so removing ${lockFilePath}.`);
      fs5.removeFile(lockFilePath);
    } else {
      logger.debug(`PIDs do not match (${pid} and ${lockFilePid}), so not removing ${lockFilePath}.`);
    }
  } catch (e) {
    if (e.code === "ENOENT") {
      logger.debug(`The lock-file at ${lockFilePath} was already removed.`);
    } else {
      throw e;
    }
  }
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/locking/lock_file_with_child_process/index.mjs
var LockFileWithChildProcess = class {
  constructor(fs5, logger) {
    this.fs = fs5;
    this.logger = logger;
    this.path = getLockFilePath(fs5);
    this.unlocker = this.createUnlocker(this.path);
  }
  write() {
    if (this.unlocker === null) {
      this.unlocker = this.createUnlocker(this.path);
    }
    this.logger.debug(`Attemping to write lock-file at ${this.path} with PID ${process.pid}`);
    this.fs.writeFile(this.path, process.pid.toString(), true);
    this.logger.debug(`Written lock-file at ${this.path} with PID ${process.pid}`);
  }
  read() {
    try {
      return this.fs.readFile(this.path);
    } catch {
      return "{unknown}";
    }
  }
  remove() {
    removeLockFile(this.fs, this.logger, this.path, process.pid.toString());
    if (this.unlocker !== null) {
      this.unlocker.disconnect();
      this.unlocker = null;
    }
  }
  createUnlocker(path7) {
    var _a, _b;
    this.logger.debug("Forking unlocker child-process");
    const logLevel = this.logger.level !== void 0 ? this.logger.level.toString() : LogLevel.info.toString();
    const isWindows = process.platform === "win32";
    const unlocker = fork(getLockFileUnlockerScriptPath(this.fs), [path7, logLevel], { detached: true, stdio: isWindows ? "pipe" : "inherit" });
    if (isWindows) {
      (_a = unlocker.stdout) == null ? void 0 : _a.on("data", process.stdout.write.bind(process.stdout));
      (_b = unlocker.stderr) == null ? void 0 : _b.on("data", process.stderr.write.bind(process.stderr));
    }
    return unlocker;
  }
};
function getLockFileUnlockerScriptPath(fileSystem) {
  const requireFn = typeof __require !== "undefined" ? __require : module5.createRequire(__ESM_IMPORT_META_URL__);
  const unlockerScriptPath = requireFn.resolve("@angular/compiler-cli/ngcc/src/locking/lock_file_with_child_process/ngcc_lock_unlocker");
  return fileSystem.resolve(unlockerScriptPath);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/locking/sync_locker.mjs
var SyncLocker = class {
  constructor(lockFile) {
    this.lockFile = lockFile;
  }
  lock(fn) {
    this.create();
    try {
      return fn();
    } finally {
      this.lockFile.remove();
    }
  }
  create() {
    try {
      this.lockFile.write();
    } catch (e) {
      if (e.code !== "EEXIST") {
        throw e;
      }
      this.handleExistingLockFile();
    }
  }
  handleExistingLockFile() {
    const pid = this.lockFile.read();
    throw new Error(`ngcc is already running at process with id ${pid}.
If you are running multiple builds in parallel then you might try pre-processing your node_modules via the command line ngcc tool before starting the builds.
(If you are sure no ngcc process is running then you should delete the lock-file at ${this.lockFile.path}.)`);
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/ngcc_options.mjs
import {
  cpus
} from "os";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/perform_compile.mjs
import { isSyntaxError as isSyntaxError2 } from "@angular/compiler";
import ts112 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/api.mjs
var UNKNOWN_ERROR_CODE = 500;
var EmitFlags;
(function(EmitFlags2) {
  EmitFlags2[EmitFlags2["DTS"] = 1] = "DTS";
  EmitFlags2[EmitFlags2["JS"] = 2] = "JS";
  EmitFlags2[EmitFlags2["Metadata"] = 4] = "Metadata";
  EmitFlags2[EmitFlags2["I18nBundle"] = 8] = "I18nBundle";
  EmitFlags2[EmitFlags2["Codegen"] = 16] = "Codegen";
  EmitFlags2[EmitFlags2["Default"] = 19] = "Default";
  EmitFlags2[EmitFlags2["All"] = 31] = "All";
})(EmitFlags || (EmitFlags = {}));

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/compiler_host.mjs
import { collectExternalReferences, syntaxError as syntaxError2, TypeScriptEmitter } from "@angular/compiler";
import fs3 from "fs";
import {
  basename as basename5,
  dirname as dirname5,
  join as join5,
  normalize as normalize3,
  relative as relative4,
  resolve as resolve3
} from "path";
import ts69 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/metadata/collector.mjs
import ts65 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/metadata/evaluator.mjs
import ts63 from "typescript";
var spreadElementSyntaxKind = ts63.SyntaxKind.SpreadElement || ts63.SyntaxKind.SpreadElementExpression;
var empty = ts63.createNodeArray();

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/metadata/symbols.mjs
import ts64 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/metadata/bundle_index_host.mjs
import {
  basename as basename4,
  dirname as dirname4,
  join as join4,
  normalize as normalize2
} from "path";
import ts67 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/metadata/bundler.mjs
import {
  basename as basename3,
  dirname as dirname3,
  join as join3,
  normalize,
  sep
} from "path";
import ts66 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/util.mjs
import { syntaxError } from "@angular/compiler";
import {
  relative as relative3
} from "path";
import ts68 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/program.mjs
import { core, createAotCompiler, getMissingNgModuleMetadataErrorData, getParseErrors, isFormattedError, isSyntaxError } from "@angular/compiler";
import {
  readFileSync as readFileSync2
} from "fs";
import * as path6 from "path";
import ts111 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/diagnostics/translate_diagnostics.mjs
import ts70 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/core/src/compiler.mjs
import ts99 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/entry_point/src/generator.mjs
import ts71 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/entry_point/src/private_export_checker.mjs
import ts72 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/program_driver/src/api.mjs
var NgOriginalFile = Symbol("NgOriginalFile");
var UpdateMode;
(function(UpdateMode2) {
  UpdateMode2[UpdateMode2["Complete"] = 0] = "Complete";
  UpdateMode2[UpdateMode2["Incremental"] = 1] = "Incremental";
})(UpdateMode || (UpdateMode = {}));

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/program_driver/src/ts_create_program_driver.mjs
import ts76 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/shims/src/adapter.mjs
import ts73 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/shims/src/expando.mjs
var NgExtension = Symbol("NgExtension");

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/shims/src/factory_generator.mjs
import ts74 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/shims/src/summary_generator.mjs
import ts75 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/incremental/src/state.mjs
var IncrementalStateKind;
(function(IncrementalStateKind2) {
  IncrementalStateKind2[IncrementalStateKind2["Fresh"] = 0] = "Fresh";
  IncrementalStateKind2[IncrementalStateKind2["Delta"] = 1] = "Delta";
  IncrementalStateKind2[IncrementalStateKind2["Analyzed"] = 2] = "Analyzed";
})(IncrementalStateKind || (IncrementalStateKind = {}));

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/incremental/src/incremental.mjs
var PhaseKind;
(function(PhaseKind2) {
  PhaseKind2[PhaseKind2["Analysis"] = 0] = "Analysis";
  PhaseKind2[PhaseKind2["TypeCheckAndEmit"] = 1] = "TypeCheckAndEmit";
})(PhaseKind || (PhaseKind = {}));

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/incremental/src/strategy.mjs
var SYM_INCREMENTAL_STATE = Symbol("NgIncrementalState");

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/indexer/src/api.mjs
var IdentifierKind;
(function(IdentifierKind2) {
  IdentifierKind2[IdentifierKind2["Property"] = 0] = "Property";
  IdentifierKind2[IdentifierKind2["Method"] = 1] = "Method";
  IdentifierKind2[IdentifierKind2["Element"] = 2] = "Element";
  IdentifierKind2[IdentifierKind2["Template"] = 3] = "Template";
  IdentifierKind2[IdentifierKind2["Attribute"] = 4] = "Attribute";
  IdentifierKind2[IdentifierKind2["Reference"] = 5] = "Reference";
  IdentifierKind2[IdentifierKind2["Variable"] = 6] = "Variable";
})(IdentifierKind || (IdentifierKind = {}));

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/indexer/src/transform.mjs
import { ParseSourceFile as ParseSourceFile3 } from "@angular/compiler";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/indexer/src/template.mjs
import { ASTWithSource, ImplicitReceiver, RecursiveAstVisitor, TmplAstElement, TmplAstRecursiveVisitor, TmplAstReference, TmplAstTemplate } from "@angular/compiler";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/resource/src/loader.mjs
import ts77 from "typescript";
var RESOURCE_MARKER = ".$ngresource$";
var RESOURCE_MARKER_TS = RESOURCE_MARKER + ".ts";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/switch/src/switch.mjs
import ts78 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/checker.mjs
import { CssSelector as CssSelector3, DomElementSchemaRegistry as DomElementSchemaRegistry3 } from "@angular/compiler";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/api/checker.mjs
var OptimizeFor;
(function(OptimizeFor2) {
  OptimizeFor2[OptimizeFor2["SingleFile"] = 0] = "SingleFile";
  OptimizeFor2[OptimizeFor2["WholeProgram"] = 1] = "WholeProgram";
})(OptimizeFor || (OptimizeFor = {}));

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/api/completion.mjs
var CompletionKind;
(function(CompletionKind2) {
  CompletionKind2[CompletionKind2["Reference"] = 0] = "Reference";
  CompletionKind2[CompletionKind2["Variable"] = 1] = "Variable";
})(CompletionKind || (CompletionKind = {}));

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/api/symbols.mjs
var SymbolKind;
(function(SymbolKind2) {
  SymbolKind2[SymbolKind2["Input"] = 0] = "Input";
  SymbolKind2[SymbolKind2["Output"] = 1] = "Output";
  SymbolKind2[SymbolKind2["Binding"] = 2] = "Binding";
  SymbolKind2[SymbolKind2["Reference"] = 3] = "Reference";
  SymbolKind2[SymbolKind2["Variable"] = 4] = "Variable";
  SymbolKind2[SymbolKind2["Directive"] = 5] = "Directive";
  SymbolKind2[SymbolKind2["Element"] = 6] = "Element";
  SymbolKind2[SymbolKind2["Template"] = 7] = "Template";
  SymbolKind2[SymbolKind2["Expression"] = 8] = "Expression";
  SymbolKind2[SymbolKind2["DomBinding"] = 9] = "DomBinding";
  SymbolKind2[SymbolKind2["Pipe"] = 10] = "Pipe";
})(SymbolKind || (SymbolKind = {}));

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/diagnostics/src/diagnostic.mjs
import ts79 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/diagnostics/src/id.mjs
var TEMPLATE_ID = Symbol("ngTemplateId");
var NEXT_TEMPLATE_ID = Symbol("ngNextTemplateId");

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/completion.mjs
import { EmptyExpr, ImplicitReceiver as ImplicitReceiver2, PropertyRead, PropertyWrite, SafePropertyRead, TmplAstReference as TmplAstReference2, TmplAstTextAttribute } from "@angular/compiler";
import ts81 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/comments.mjs
import { AbsoluteSourceSpan as AbsoluteSourceSpan2 } from "@angular/compiler";
import ts80 from "typescript";
var CommentTriviaType;
(function(CommentTriviaType2) {
  CommentTriviaType2["DIAGNOSTIC"] = "D";
  CommentTriviaType2["EXPRESSION_TYPE_IDENTIFIER"] = "T";
})(CommentTriviaType || (CommentTriviaType = {}));
var ExpressionIdentifier;
(function(ExpressionIdentifier2) {
  ExpressionIdentifier2["DIRECTIVE"] = "DIR";
  ExpressionIdentifier2["COMPONENT_COMPLETION"] = "COMPCOMP";
  ExpressionIdentifier2["EVENT_PARAMETER"] = "EP";
})(ExpressionIdentifier || (ExpressionIdentifier = {}));
var IGNORE_FOR_DIAGNOSTICS_MARKER = `${CommentTriviaType.DIAGNOSTIC}:ignore`;

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/context.mjs
import ts95 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/dom.mjs
import { DomElementSchemaRegistry as DomElementSchemaRegistry2 } from "@angular/compiler";
import ts82 from "typescript";
var REGISTRY = new DomElementSchemaRegistry2();

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/environment.mjs
import { ExpressionType, ExternalExpr as ExternalExpr9 } from "@angular/compiler";
import ts88 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/ts_util.mjs
import ts83 from "typescript";
var SAFE_TO_CAST_WITHOUT_PARENS = new Set([
  ts83.SyntaxKind.ParenthesizedExpression,
  ts83.SyntaxKind.Identifier,
  ts83.SyntaxKind.CallExpression,
  ts83.SyntaxKind.NonNullExpression,
  ts83.SyntaxKind.ElementAccessExpression,
  ts83.SyntaxKind.PropertyAccessExpression,
  ts83.SyntaxKind.ArrayLiteralExpression,
  ts83.SyntaxKind.ObjectLiteralExpression,
  ts83.SyntaxKind.StringLiteral,
  ts83.SyntaxKind.NumericLiteral,
  ts83.SyntaxKind.TrueKeyword,
  ts83.SyntaxKind.FalseKeyword,
  ts83.SyntaxKind.NullKeyword,
  ts83.SyntaxKind.UndefinedKeyword
]);

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/type_constructor.mjs
import ts87 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/tcb_util.mjs
import ts86 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/type_parameter_emitter.mjs
import ts85 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/type_emitter.mjs
import ts84 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/tcb_util.mjs
var TcbInliningRequirement;
(function(TcbInliningRequirement2) {
  TcbInliningRequirement2[TcbInliningRequirement2["MustInline"] = 0] = "MustInline";
  TcbInliningRequirement2[TcbInliningRequirement2["ShouldInlineForGenericBounds"] = 1] = "ShouldInlineForGenericBounds";
  TcbInliningRequirement2[TcbInliningRequirement2["None"] = 2] = "None";
})(TcbInliningRequirement || (TcbInliningRequirement = {}));

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/oob.mjs
import { TmplAstElement as TmplAstElement2 } from "@angular/compiler";
import ts89 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/shim.mjs
import ts90 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/type_check_block.mjs
import { BindingPipe, Call as Call2, DYNAMIC_TYPE, ImplicitReceiver as ImplicitReceiver4, PropertyRead as PropertyRead2, PropertyWrite as PropertyWrite2, SafePropertyRead as SafePropertyRead3, ThisReceiver, TmplAstBoundAttribute, TmplAstBoundText, TmplAstElement as TmplAstElement3, TmplAstIcu, TmplAstReference as TmplAstReference3, TmplAstTemplate as TmplAstTemplate2, TmplAstTextAttribute as TmplAstTextAttribute2, TmplAstVariable as TmplAstVariable2 } from "@angular/compiler";
import ts93 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/diagnostics.mjs
import { AbsoluteSourceSpan as AbsoluteSourceSpan3 } from "@angular/compiler";
import ts91 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/expression.mjs
import { ASTWithSource as ASTWithSource2, Call, EmptyExpr as EmptyExpr2, SafeKeyedRead, SafePropertyRead as SafePropertyRead2 } from "@angular/compiler";
import ts92 from "typescript";
var NULL_AS_ANY = ts92.createAsExpression(ts92.createNull(), ts92.createKeywordTypeNode(ts92.SyntaxKind.AnyKeyword));
var UNDEFINED = ts92.createIdentifier("undefined");
var UNARY_OPS = new Map([
  ["+", ts92.SyntaxKind.PlusToken],
  ["-", ts92.SyntaxKind.MinusToken]
]);
var BINARY_OPS = new Map([
  ["+", ts92.SyntaxKind.PlusToken],
  ["-", ts92.SyntaxKind.MinusToken],
  ["<", ts92.SyntaxKind.LessThanToken],
  [">", ts92.SyntaxKind.GreaterThanToken],
  ["<=", ts92.SyntaxKind.LessThanEqualsToken],
  [">=", ts92.SyntaxKind.GreaterThanEqualsToken],
  ["==", ts92.SyntaxKind.EqualsEqualsToken],
  ["===", ts92.SyntaxKind.EqualsEqualsEqualsToken],
  ["*", ts92.SyntaxKind.AsteriskToken],
  ["/", ts92.SyntaxKind.SlashToken],
  ["%", ts92.SyntaxKind.PercentToken],
  ["!=", ts92.SyntaxKind.ExclamationEqualsToken],
  ["!==", ts92.SyntaxKind.ExclamationEqualsEqualsToken],
  ["||", ts92.SyntaxKind.BarBarToken],
  ["&&", ts92.SyntaxKind.AmpersandAmpersandToken],
  ["&", ts92.SyntaxKind.AmpersandToken],
  ["|", ts92.SyntaxKind.BarToken],
  ["??", ts92.SyntaxKind.QuestionQuestionToken]
]);
var VeSafeLhsInferenceBugDetector = class {
  static veWillInferAnyFor(ast) {
    const visitor = VeSafeLhsInferenceBugDetector.SINGLETON;
    return ast instanceof Call ? ast.visit(visitor) : ast.receiver.visit(visitor);
  }
  visitUnary(ast) {
    return ast.expr.visit(this);
  }
  visitBinary(ast) {
    return ast.left.visit(this) || ast.right.visit(this);
  }
  visitChain(ast) {
    return false;
  }
  visitConditional(ast) {
    return ast.condition.visit(this) || ast.trueExp.visit(this) || ast.falseExp.visit(this);
  }
  visitCall(ast) {
    return true;
  }
  visitImplicitReceiver(ast) {
    return false;
  }
  visitThisReceiver(ast) {
    return false;
  }
  visitInterpolation(ast) {
    return ast.expressions.some((exp) => exp.visit(this));
  }
  visitKeyedRead(ast) {
    return false;
  }
  visitKeyedWrite(ast) {
    return false;
  }
  visitLiteralArray(ast) {
    return true;
  }
  visitLiteralMap(ast) {
    return true;
  }
  visitLiteralPrimitive(ast) {
    return false;
  }
  visitPipe(ast) {
    return true;
  }
  visitPrefixNot(ast) {
    return ast.expression.visit(this);
  }
  visitNonNullAssert(ast) {
    return ast.expression.visit(this);
  }
  visitPropertyRead(ast) {
    return false;
  }
  visitPropertyWrite(ast) {
    return false;
  }
  visitQuote(ast) {
    return false;
  }
  visitSafePropertyRead(ast) {
    return false;
  }
  visitSafeKeyedRead(ast) {
    return false;
  }
};
VeSafeLhsInferenceBugDetector.SINGLETON = new VeSafeLhsInferenceBugDetector();

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/template_semantics.mjs
import { ImplicitReceiver as ImplicitReceiver3, RecursiveAstVisitor as RecursiveAstVisitor2, TmplAstVariable } from "@angular/compiler";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/type_check_block.mjs
var TcbGenericContextBehavior;
(function(TcbGenericContextBehavior2) {
  TcbGenericContextBehavior2[TcbGenericContextBehavior2["UseEmitter"] = 0] = "UseEmitter";
  TcbGenericContextBehavior2[TcbGenericContextBehavior2["CopyClassNodes"] = 1] = "CopyClassNodes";
  TcbGenericContextBehavior2[TcbGenericContextBehavior2["FallbackToAny"] = 2] = "FallbackToAny";
})(TcbGenericContextBehavior || (TcbGenericContextBehavior = {}));
var INFER_TYPE_FOR_CIRCULAR_OP_EXPR = ts93.createNonNullExpression(ts93.createNull());

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/type_check_file.mjs
import ts94 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/context.mjs
var InliningMode;
(function(InliningMode2) {
  InliningMode2[InliningMode2["InlineOps"] = 0] = "InlineOps";
  InliningMode2[InliningMode2["Error"] = 1] = "Error";
})(InliningMode || (InliningMode = {}));

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/source.mjs
import { ParseLocation as ParseLocation2, ParseSourceSpan as ParseSourceSpan2 } from "@angular/compiler";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/template_symbol_builder.mjs
import { AST, ASTWithSource as ASTWithSource3, BindingPipe as BindingPipe2, PropertyRead as PropertyRead3, PropertyWrite as PropertyWrite3, SafePropertyRead as SafePropertyRead4, TmplAstBoundAttribute as TmplAstBoundAttribute2, TmplAstBoundEvent, TmplAstElement as TmplAstElement4, TmplAstReference as TmplAstReference4, TmplAstTemplate as TmplAstTemplate3, TmplAstTextAttribute as TmplAstTextAttribute3, TmplAstVariable as TmplAstVariable3 } from "@angular/compiler";
import ts96 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/checker.mjs
var REGISTRY2 = new DomElementSchemaRegistry3();

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/extended/checks/invalid_banana_in_box/index.mjs
import { TmplAstBoundEvent as TmplAstBoundEvent2 } from "@angular/compiler";
import ts97 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/extended/api/api.mjs
import { ASTWithSource as ASTWithSource4, RecursiveAstVisitor as RecursiveAstVisitor3 } from "@angular/compiler";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/extended/checks/nullish_coalescing_not_nullable/index.mjs
import { Binary } from "@angular/compiler";
import ts98 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/core/src/compiler.mjs
var CompilationTicketKind;
(function(CompilationTicketKind2) {
  CompilationTicketKind2[CompilationTicketKind2["Fresh"] = 0] = "Fresh";
  CompilationTicketKind2[CompilationTicketKind2["IncrementalTypeScript"] = 1] = "IncrementalTypeScript";
  CompilationTicketKind2[CompilationTicketKind2["IncrementalResource"] = 2] = "IncrementalResource";
})(CompilationTicketKind || (CompilationTicketKind = {}));

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/program.mjs
import { HtmlParser, MessageBundle } from "@angular/compiler";
import ts102 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/i18n.mjs
import { Xliff, Xliff2, Xmb } from "@angular/compiler";
import {
  relative as relative5,
  resolve as resolve4,
  sep as sep2
} from "path";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/typescript_support.mjs
import ts100 from "typescript";
var tsVersion = ts100.version;

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/core/src/host.mjs
import ts101 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/downlevel_decorators_transform/downlevel_decorators_transform.mjs
import ts104 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/downlevel_decorators_transform/patch_alias_reference_resolution.mjs
import ts103 from "typescript";
var patchedReferencedAliasesSymbol = Symbol("patchedReferencedAliases");

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/inline_resources.mjs
import ts105 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/lower_expressions.mjs
import { createLoweredSymbol, isLoweredSymbol } from "@angular/compiler";
import ts106 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/metadata_cache.mjs
import ts107 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/node_emitter_transform.mjs
import ts109 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/node_emitter.mjs
import { BinaryOperator as BinaryOperator2, BuiltinMethod, BuiltinVar, ClassStmt, ExternalExpr as ExternalExpr10, Statement, StmtModifier as StmtModifier2, UnaryOperator as UnaryOperator2 } from "@angular/compiler";
import ts108 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/r3_metadata_transform.mjs
import { ClassStmt as ClassStmt2, StmtModifier as StmtModifier3 } from "@angular/compiler";
import ts110 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/program.mjs
var LOWER_FIELDS = ["useValue", "useFactory", "data", "id", "loadChildren"];
var R3_LOWER_FIELDS = [...LOWER_FIELDS, "providers", "imports", "exports"];
var emptyModules = {
  ngModules: [],
  ngModuleByPipeOrDirective: new Map(),
  files: []
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/perform_compile.mjs
function calcProjectFileAndBasePath(project, host = getFileSystem()) {
  const absProject = host.resolve(project);
  const projectIsDir = host.lstat(absProject).isDirectory();
  const projectFile = projectIsDir ? host.join(absProject, "tsconfig.json") : absProject;
  const projectDir = projectIsDir ? absProject : host.dirname(absProject);
  const basePath = host.resolve(projectDir);
  return { projectFile, basePath };
}
function readConfiguration(project, existingOptions, host = getFileSystem()) {
  var _a;
  try {
    const fs5 = getFileSystem();
    const readConfigFile = (configFile) => ts112.readConfigFile(configFile, (file) => host.readFile(host.resolve(file)));
    const readAngularCompilerOptions = (configFile, parentOptions = {}) => {
      const { config: config2, error: error3 } = readConfigFile(configFile);
      if (error3) {
        return parentOptions;
      }
      const existingNgCompilerOptions = __spreadValues(__spreadValues({}, config2.angularCompilerOptions), parentOptions);
      if (config2.extends && typeof config2.extends === "string") {
        const extendedConfigPath = getExtendedConfigPath(configFile, config2.extends, host, fs5);
        if (extendedConfigPath !== null) {
          return readAngularCompilerOptions(extendedConfigPath, existingNgCompilerOptions);
        }
      }
      return existingNgCompilerOptions;
    };
    const { projectFile, basePath } = calcProjectFileAndBasePath(project, host);
    const configFileName = host.resolve(host.pwd(), projectFile);
    const { config, error: error2 } = readConfigFile(projectFile);
    if (error2) {
      return {
        project,
        errors: [error2],
        rootNames: [],
        options: {},
        emitFlags: EmitFlags.Default
      };
    }
    const existingCompilerOptions = __spreadValues(__spreadValues({
      genDir: basePath,
      basePath
    }, readAngularCompilerOptions(configFileName)), existingOptions);
    const parseConfigHost = createParseConfigHost(host, fs5);
    const { options: options2, errors, fileNames: rootNames, projectReferences } = ts112.parseJsonConfigFileContent(config, parseConfigHost, basePath, existingCompilerOptions, configFileName);
    options2.enableIvy = !!((_a = options2.enableIvy) != null ? _a : true);
    let emitFlags = EmitFlags.Default;
    if (!(options2.skipMetadataEmit || options2.flatModuleOutFile)) {
      emitFlags |= EmitFlags.Metadata;
    }
    if (options2.skipTemplateCodegen) {
      emitFlags = emitFlags & ~EmitFlags.Codegen;
    }
    return { project: projectFile, rootNames, projectReferences, options: options2, errors, emitFlags };
  } catch (e) {
    const errors = [{
      category: ts112.DiagnosticCategory.Error,
      messageText: e.stack,
      file: void 0,
      start: void 0,
      length: void 0,
      source: "angular",
      code: UNKNOWN_ERROR_CODE
    }];
    return { project: "", errors, rootNames: [], options: {}, emitFlags: EmitFlags.Default };
  }
}
function createParseConfigHost(host, fs5 = getFileSystem()) {
  return {
    fileExists: host.exists.bind(host),
    readDirectory: ts112.sys.readDirectory,
    readFile: host.readFile.bind(host),
    useCaseSensitiveFileNames: fs5.isCaseSensitive()
  };
}
function getExtendedConfigPath(configFile, extendsValue, host, fs5) {
  const result = getExtendedConfigPathWorker(configFile, extendsValue, host, fs5);
  if (result !== null) {
    return result;
  }
  return getExtendedConfigPathWorker(configFile, `${extendsValue}.json`, host, fs5);
}
function getExtendedConfigPathWorker(configFile, extendsValue, host, fs5) {
  if (extendsValue.startsWith(".") || fs5.isRooted(extendsValue)) {
    const extendedConfigPath = host.resolve(host.dirname(configFile), extendsValue);
    if (host.exists(extendedConfigPath)) {
      return extendedConfigPath;
    }
  } else {
    const parseConfigHost = createParseConfigHost(host, fs5);
    const { resolvedModule } = ts112.nodeModuleNameResolver(extendsValue, configFile, { moduleResolution: ts112.ModuleResolutionKind.NodeJs, resolveJsonModule: true }, parseConfigHost);
    if (resolvedModule) {
      return absoluteFrom(resolvedModule.resolvedFileName);
    }
  }
  return null;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/ngcc_options.mjs
function getSharedSetup(options2) {
  const fileSystem = getFileSystem();
  const absBasePath = absoluteFrom(options2.basePath);
  const projectPath = fileSystem.dirname(absBasePath);
  const tsConfig = options2.tsConfigPath !== null ? getTsConfig(options2.tsConfigPath || projectPath) : null;
  let { basePath, targetEntryPointPath, propertiesToConsider = SUPPORTED_FORMAT_PROPERTIES, typingsOnly = false, compileAllFormats = true, createNewEntryPointFormats = false, logger = new ConsoleLogger(LogLevel.info), pathMappings = getPathMappingsFromTsConfig(fileSystem, tsConfig, projectPath), async = false, errorOnFailedEntryPoint = false, enableI18nLegacyMessageIdFormat = true, invalidateEntryPointManifest = false, tsConfigPath } = options2;
  if (!!targetEntryPointPath) {
    errorOnFailedEntryPoint = true;
  }
  if (typingsOnly) {
    compileAllFormats = false;
  }
  checkForSolutionStyleTsConfig(fileSystem, logger, projectPath, options2.tsConfigPath, tsConfig);
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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/packages/configuration.mjs
import { createHash } from "crypto";
import module6 from "module";
import semver from "semver";
import {
  runInNewContext
} from "vm";
var PartiallyProcessedConfig = class {
  constructor(projectConfig) {
    this.packages = new Map();
    this.locking = {};
    this.hashAlgorithm = "sha256";
    if (projectConfig.locking !== void 0) {
      this.locking = projectConfig.locking;
    }
    for (const packageNameAndVersion in projectConfig.packages) {
      const packageConfig = projectConfig.packages[packageNameAndVersion];
      if (packageConfig) {
        const [packageName, versionRange = "*"] = this.splitNameAndVersion(packageNameAndVersion);
        this.addPackageConfig(packageName, __spreadProps(__spreadValues({}, packageConfig), { versionRange }));
      }
    }
    if (projectConfig.hashAlgorithm !== void 0) {
      this.hashAlgorithm = projectConfig.hashAlgorithm;
    }
  }
  splitNameAndVersion(packageNameAndVersion) {
    const versionIndex = packageNameAndVersion.lastIndexOf("@");
    return versionIndex > 0 ? [
      packageNameAndVersion.substring(0, versionIndex),
      packageNameAndVersion.substring(versionIndex + 1)
    ] : [packageNameAndVersion, void 0];
  }
  addPackageConfig(packageName, config) {
    if (!this.packages.has(packageName)) {
      this.packages.set(packageName, []);
    }
    this.packages.get(packageName).push(config);
  }
  findPackageConfig(packageName, version) {
    var _a;
    if (!this.packages.has(packageName)) {
      return null;
    }
    const configs = this.packages.get(packageName);
    if (version === null) {
      return configs[0];
    }
    return (_a = configs.find((config) => semver.satisfies(version, config.versionRange, { includePrerelease: true }))) != null ? _a : null;
  }
  toJson() {
    return JSON.stringify(this, (key, value) => {
      if (value instanceof Map) {
        const res = {};
        for (const [k, v] of value) {
          res[k] = v;
        }
        return res;
      } else {
        return value;
      }
    });
  }
};
var DEFAULT_NGCC_CONFIG = {
  packages: {
    "angular2-highcharts": {
      entryPoints: {
        ".": {
          override: {
            main: "./index.js"
          }
        }
      }
    },
    "ng2-dragula": {
      entryPoints: {
        "./dist": { ignore: true }
      }
    }
  },
  locking: {
    retryDelay: 500,
    retryAttempts: 500
  }
};
var NGCC_CONFIG_FILENAME = "ngcc.config.js";
var isCommonJS2 = typeof __require !== "undefined";
var currentFileUrl2 = isCommonJS2 ? null : __ESM_IMPORT_META_URL__;
var ProcessedNgccPackageConfig = class {
  constructor(fs5, packagePath, { entryPoints = {}, ignorableDeepImportMatchers = [] }) {
    const absolutePathEntries = Object.entries(entryPoints).map(([relativePath, config]) => [fs5.resolve(packagePath, relativePath), config]);
    this.packagePath = packagePath;
    this.entryPoints = new Map(absolutePathEntries);
    this.ignorableDeepImportMatchers = ignorableDeepImportMatchers;
  }
};
var NgccConfiguration = class {
  constructor(fs5, baseDir) {
    this.fs = fs5;
    this.cache = new Map();
    this.defaultConfig = new PartiallyProcessedConfig(DEFAULT_NGCC_CONFIG);
    this.projectConfig = new PartiallyProcessedConfig(this.loadProjectConfig(baseDir));
    this.hashAlgorithm = this.projectConfig.hashAlgorithm;
    this.hash = this.computeHash();
  }
  getLockingConfig() {
    let { retryAttempts, retryDelay } = this.projectConfig.locking;
    if (retryAttempts === void 0) {
      retryAttempts = this.defaultConfig.locking.retryAttempts;
    }
    if (retryDelay === void 0) {
      retryDelay = this.defaultConfig.locking.retryDelay;
    }
    return { retryAttempts, retryDelay };
  }
  getPackageConfig(packageName, packagePath, version) {
    const rawPackageConfig = this.getRawPackageConfig(packageName, packagePath, version);
    return new ProcessedNgccPackageConfig(this.fs, packagePath, rawPackageConfig);
  }
  getRawPackageConfig(packageName, packagePath, version) {
    const cacheKey = packageName + (version !== null ? `@${version}` : "");
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    const projectLevelConfig = this.projectConfig.findPackageConfig(packageName, version);
    if (projectLevelConfig !== null) {
      this.cache.set(cacheKey, projectLevelConfig);
      return projectLevelConfig;
    }
    const packageLevelConfig = this.loadPackageConfig(packagePath, version);
    if (packageLevelConfig !== null) {
      this.cache.set(cacheKey, packageLevelConfig);
      return packageLevelConfig;
    }
    const defaultLevelConfig = this.defaultConfig.findPackageConfig(packageName, version);
    if (defaultLevelConfig !== null) {
      this.cache.set(cacheKey, defaultLevelConfig);
      return defaultLevelConfig;
    }
    return { versionRange: "*" };
  }
  loadProjectConfig(baseDir) {
    const configFilePath = this.fs.join(baseDir, NGCC_CONFIG_FILENAME);
    if (this.fs.exists(configFilePath)) {
      try {
        return this.evalSrcFile(configFilePath);
      } catch (e) {
        throw new Error(`Invalid project configuration file at "${configFilePath}": ` + e.message);
      }
    } else {
      return { packages: {} };
    }
  }
  loadPackageConfig(packagePath, version) {
    const configFilePath = this.fs.join(packagePath, NGCC_CONFIG_FILENAME);
    if (this.fs.exists(configFilePath)) {
      try {
        const packageConfig = this.evalSrcFile(configFilePath);
        return __spreadProps(__spreadValues({}, packageConfig), {
          versionRange: version || "*"
        });
      } catch (e) {
        throw new Error(`Invalid package configuration file at "${configFilePath}": ` + e.message);
      }
    } else {
      return null;
    }
  }
  evalSrcFile(srcPath) {
    const requireFn = isCommonJS2 ? __require : module6.createRequire(currentFileUrl2);
    const src = this.fs.readFile(srcPath);
    const theExports = {};
    const sandbox = {
      module: { exports: theExports },
      exports: theExports,
      require: requireFn,
      __dirname: this.fs.dirname(srcPath),
      __filename: srcPath
    };
    runInNewContext(src, sandbox, { filename: srcPath });
    return sandbox.module.exports;
  }
  computeHash() {
    return createHash(this.hashAlgorithm).update(this.projectConfig.toJson()).digest("hex");
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/packages/entry_point_manifest.mjs
import { createHash as createHash2 } from "crypto";
var EntryPointManifest = class {
  constructor(fs5, config, logger) {
    this.fs = fs5;
    this.config = config;
    this.logger = logger;
  }
  readEntryPointsUsingManifest(basePath) {
    try {
      if (this.fs.basename(basePath) !== "node_modules") {
        return null;
      }
      const manifestPath = this.getEntryPointManifestPath(basePath);
      if (!this.fs.exists(manifestPath)) {
        return null;
      }
      const computedLockFileHash = this.computeLockFileHash(basePath);
      if (computedLockFileHash === null) {
        return null;
      }
      const { ngccVersion, configFileHash, lockFileHash, entryPointPaths } = JSON.parse(this.fs.readFile(manifestPath));
      if (ngccVersion !== NGCC_VERSION || configFileHash !== this.config.hash || lockFileHash !== computedLockFileHash) {
        return null;
      }
      this.logger.debug(`Entry-point manifest found for ${basePath} so loading entry-point information directly.`);
      const startTime2 = Date.now();
      const entryPoints = [];
      for (const [packagePath, entryPointPath, dependencyPaths = [], missingPaths = [], deepImportPaths = []] of entryPointPaths) {
        const result = getEntryPointInfo(this.fs, this.config, this.logger, this.fs.resolve(basePath, packagePath), this.fs.resolve(basePath, entryPointPath));
        if (!isEntryPoint(result)) {
          throw new Error(`The entry-point manifest at ${manifestPath} contained an invalid pair of package paths: [${packagePath}, ${entryPointPath}]`);
        } else {
          entryPoints.push({
            entryPoint: result,
            depInfo: {
              dependencies: new Set(dependencyPaths),
              missing: new Set(missingPaths),
              deepImports: new Set(deepImportPaths)
            }
          });
        }
      }
      const duration = Math.round((Date.now() - startTime2) / 100) / 10;
      this.logger.debug(`Reading entry-points using the manifest entries took ${duration}s.`);
      return entryPoints;
    } catch (e) {
      this.logger.warn(`Unable to read the entry-point manifest for ${basePath}:
`, e.stack || e.toString());
      return null;
    }
  }
  writeEntryPointManifest(basePath, entryPoints) {
    if (this.fs.basename(basePath) !== "node_modules") {
      return;
    }
    const lockFileHash = this.computeLockFileHash(basePath);
    if (lockFileHash === null) {
      return;
    }
    const manifest = {
      ngccVersion: NGCC_VERSION,
      configFileHash: this.config.hash,
      lockFileHash,
      entryPointPaths: entryPoints.map((e) => {
        const entryPointPaths = [
          this.fs.relative(basePath, e.entryPoint.packagePath),
          this.fs.relative(basePath, e.entryPoint.path)
        ];
        if (e.depInfo.dependencies.size > 0) {
          entryPointPaths[2] = Array.from(e.depInfo.dependencies);
        } else if (e.depInfo.missing.size > 0 || e.depInfo.deepImports.size > 0) {
          entryPointPaths[2] = [];
        }
        if (e.depInfo.missing.size > 0) {
          entryPointPaths[3] = Array.from(e.depInfo.missing);
        } else if (e.depInfo.deepImports.size > 0) {
          entryPointPaths[3] = [];
        }
        if (e.depInfo.deepImports.size > 0) {
          entryPointPaths[4] = Array.from(e.depInfo.deepImports);
        }
        return entryPointPaths;
      })
    };
    this.fs.writeFile(this.getEntryPointManifestPath(basePath), JSON.stringify(manifest));
  }
  getEntryPointManifestPath(basePath) {
    return this.fs.resolve(basePath, "__ngcc_entry_points__.json");
  }
  computeLockFileHash(basePath) {
    const directory = this.fs.dirname(basePath);
    for (const lockFileName of ["yarn.lock", "package-lock.json"]) {
      const lockFilePath = this.fs.resolve(directory, lockFileName);
      if (this.fs.exists(lockFilePath)) {
        const lockFileContents = this.fs.readFile(lockFilePath);
        return createHash2(this.config.hashAlgorithm).update(lockFileContents).digest("hex");
      }
    }
    return null;
  }
};
var InvalidatingEntryPointManifest = class extends EntryPointManifest {
  readEntryPointsUsingManifest(_basePath) {
    return null;
  }
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
  constructor(fs5) {
    this.fs = fs5;
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
  const otherProps = allProps.filter((p2) => p2 !== prop);
  const nextPropIdx = otherProps.findIndex(isNextProp);
  const propsToShift = nextPropIdx === -1 ? [] : otherProps.slice(nextPropIdx);
  movePropToEnd(ctx, prop);
  propsToShift.forEach((p2) => movePropToEnd(ctx, p2));
}
function movePropToEnd(ctx, prop) {
  const value = ctx[prop];
  delete ctx[prop];
  ctx[prop] = value;
}
function positionProperty(ctx, prop, positioning) {
  switch (positioning) {
    case "alphabetic":
      movePropBefore(ctx, prop, (p2) => p2 > prop);
      break;
    case "unimportant":
      break;
    default:
      if (typeof positioning !== "object" || positioning.before === void 0) {
        throw new Error(`Unknown positioning (${JSON.stringify(positioning)}) for property '${prop}'.`);
      }
      movePropBefore(ctx, prop, (p2) => p2 === positioning.before);
      break;
  }
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/main.mjs
function mainNgcc(options2) {
  const { basePath, targetEntryPointPath, propertiesToConsider, typingsOnly, compileAllFormats, logger, pathMappings, async, errorOnFailedEntryPoint, enableI18nLegacyMessageIdFormat, invalidateEntryPointManifest, fileSystem, absBasePath, projectPath, tsConfig, getFileWriter } = getSharedSetup(options2);
  const config = new NgccConfiguration(fileSystem, projectPath);
  const dependencyResolver = getDependencyResolver(fileSystem, logger, config, pathMappings);
  const entryPointManifest = invalidateEntryPointManifest ? new InvalidatingEntryPointManifest(fileSystem, config, logger) : new EntryPointManifest(fileSystem, config, logger);
  const supportedPropertiesToConsider = ensureSupportedProperties(propertiesToConsider);
  const absoluteTargetEntryPointPath = targetEntryPointPath !== void 0 ? fileSystem.resolve(basePath, targetEntryPointPath) : null;
  const finder = getEntryPointFinder(fileSystem, logger, dependencyResolver, config, entryPointManifest, absBasePath, absoluteTargetEntryPointPath, pathMappings, options2.findEntryPointsFromTsConfigProgram ? tsConfig : null, projectPath);
  if (finder instanceof TargetedEntryPointFinder && !finder.targetNeedsProcessingOrCleaning(supportedPropertiesToConsider, compileAllFormats)) {
    logger.debug("The target entry-point has already been processed");
    return;
  }
  const workerCount = async ? getMaxNumberOfWorkers() : 1;
  const inParallel = workerCount > 1;
  const analyzeEntryPoints = getAnalyzeEntryPointsFn(logger, finder, fileSystem, supportedPropertiesToConsider, typingsOnly, compileAllFormats, propertiesToConsider, inParallel);
  const pkgJsonUpdater = new DirectPackageJsonUpdater(fileSystem);
  const fileWriter = getFileWriter(pkgJsonUpdater);
  const createCompileFn = getCreateCompileFn(fileSystem, logger, fileWriter, enableI18nLegacyMessageIdFormat, tsConfig, pathMappings);
  const createTaskCompletedCallback = getCreateTaskCompletedCallback(pkgJsonUpdater, errorOnFailedEntryPoint, logger, fileSystem);
  const executor = getExecutor(async, workerCount, logger, fileWriter, pkgJsonUpdater, fileSystem, config, createTaskCompletedCallback);
  return executor.execute(analyzeEntryPoints, createCompileFn);
}
function ensureSupportedProperties(properties) {
  if (properties === SUPPORTED_FORMAT_PROPERTIES)
    return SUPPORTED_FORMAT_PROPERTIES;
  const supportedProperties = [];
  for (const prop of properties) {
    if (SUPPORTED_FORMAT_PROPERTIES.indexOf(prop) !== -1) {
      supportedProperties.push(prop);
    }
  }
  if (supportedProperties.length === 0) {
    throw new Error(`No supported format property to consider among [${properties.join(", ")}]. Supported properties: ${SUPPORTED_FORMAT_PROPERTIES.join(", ")}`);
  }
  return supportedProperties;
}
function getCreateTaskCompletedCallback(pkgJsonUpdater, errorOnFailedEntryPoint, logger, fileSystem) {
  return (taskQueue) => composeTaskCompletedCallbacks({
    [0]: createMarkAsProcessedHandler(fileSystem, pkgJsonUpdater),
    [1]: errorOnFailedEntryPoint ? createThrowErrorHandler(fileSystem) : createLogErrorHandler(logger, fileSystem, taskQueue)
  });
}
function getExecutor(async, workerCount, logger, fileWriter, pkgJsonUpdater, fileSystem, config, createTaskCompletedCallback) {
  const lockFile = new LockFileWithChildProcess(fileSystem, logger);
  if (async) {
    const { retryAttempts, retryDelay } = config.getLockingConfig();
    const locker = new AsyncLocker(lockFile, logger, retryDelay, retryAttempts);
    if (workerCount > 1) {
      return new ClusterExecutor(workerCount, fileSystem, logger, fileWriter, pkgJsonUpdater, locker, createTaskCompletedCallback);
    } else {
      return new SingleProcessExecutorAsync(logger, locker, createTaskCompletedCallback);
    }
  } else {
    return new SingleProcessExecutorSync(logger, new SyncLocker(lockFile), createTaskCompletedCallback);
  }
}
function getDependencyResolver(fileSystem, logger, config, pathMappings) {
  const moduleResolver = new ModuleResolver(fileSystem, pathMappings);
  const esmDependencyHost = new EsmDependencyHost(fileSystem, moduleResolver);
  const umdDependencyHost = new UmdDependencyHost(fileSystem, moduleResolver);
  const commonJsDependencyHost = new CommonJsDependencyHost(fileSystem, moduleResolver);
  const dtsDependencyHost = new DtsDependencyHost(fileSystem, pathMappings);
  return new DependencyResolver(fileSystem, logger, config, {
    esm5: esmDependencyHost,
    esm2015: esmDependencyHost,
    umd: umdDependencyHost,
    commonjs: commonJsDependencyHost
  }, dtsDependencyHost);
}
function getEntryPointFinder(fs5, logger, resolver, config, entryPointManifest, basePath, absoluteTargetEntryPointPath, pathMappings, tsConfig, projectPath) {
  if (absoluteTargetEntryPointPath !== null) {
    return new TargetedEntryPointFinder(fs5, config, logger, resolver, basePath, pathMappings, absoluteTargetEntryPointPath);
  } else {
    const entryPointCollector = new EntryPointCollector(fs5, config, logger, resolver);
    if (tsConfig !== null) {
      return new ProgramBasedEntryPointFinder(fs5, config, logger, resolver, entryPointCollector, entryPointManifest, basePath, tsConfig, projectPath);
    } else {
      return new DirectoryWalkerEntryPointFinder(logger, resolver, entryPointCollector, entryPointManifest, basePath, pathMappings);
    }
  }
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/src/command_line_options.mjs
import yargs from "yargs";
function parseCommandLineOptions(args) {
  var _a;
  const options2 = yargs(args).option("s", {
    alias: "source",
    describe: "A path (relative to the working directory) of the `node_modules` folder to process.",
    default: "./node_modules",
    type: "string"
  }).option("f", { alias: "formats", hidden: true, array: true, type: "string" }).option("p", {
    alias: "properties",
    array: true,
    describe: "An array of names of properties in package.json to compile (e.g. `module` or `main`)\nEach of these properties should hold the path to a bundle-format.\nIf provided, only the specified properties are considered for processing.\nIf not provided, all the supported format properties (e.g. fesm2015, fesm5, es2015, esm2015, esm5, main, module) in the package.json are considered.",
    type: "string"
  }).option("t", {
    alias: "target",
    describe: "A relative path (from the `source` path) to a single entry-point to process (plus its dependencies).\nIf this property is provided then `error-on-failed-entry-point` is forced to true.\nThis option overrides the `--use-program-dependencies` option.",
    type: "string"
  }).option("use-program-dependencies", {
    type: "boolean",
    describe: "If this property is provided then the entry-points to process are parsed from the program defined by the loaded tsconfig.json. See `--tsconfig`.\nThis option is overridden by the `--target` option."
  }).option("first-only", {
    describe: "If specified then only the first matching package.json property will be compiled.\nThis option is overridden by `--typings-only`.",
    type: "boolean"
  }).option("typings-only", {
    describe: "If specified then only the typings files are processed, and no JS source files will be modified.\nSetting this option will force `--first-only` to be set, since only one format is needed to process the typings",
    type: "boolean"
  }).option("create-ivy-entry-points", {
    describe: "If specified then new `*_ivy_ngcc` entry-points will be added to package.json rather than modifying the ones in-place.\nFor this to work you need to have custom resolution set up (e.g. in webpack) to look for these new entry-points.\nThe Angular CLI does this already, so it is safe to use this option if the project is being built via the CLI.",
    type: "boolean"
  }).option("legacy-message-ids", {
    describe: "Render `$localize` messages with legacy format ids.\nThe default value is `true`. Only set this to `false` if you do not want legacy message ids to\nbe rendered. For example, if you are not using legacy message ids in your translation files\nAND are not doing compile-time inlining of translations, in which case the extra message ids\nwould add unwanted size to the final source bundle.\nIt is safe to leave this set to true if you are doing compile-time inlining because the extra\nlegacy message ids will all be stripped during translation.",
    type: "boolean",
    default: true
  }).option("async", {
    describe: "Whether to compile asynchronously. This is enabled by default as it allows compilations to be parallelized.\nDisabling asynchronous compilation may be useful for debugging.",
    type: "boolean",
    default: true
  }).option("l", {
    alias: "loglevel",
    describe: "The lowest severity logging message that should be output.",
    choices: ["debug", "info", "warn", "error"],
    type: "string"
  }).option("invalidate-entry-point-manifest", {
    describe: "If this is set then ngcc will not read an entry-point manifest file from disk.\nInstead it will walk the directory tree as normal looking for entry-points, and then write a new manifest file.",
    type: "boolean",
    default: false
  }).option("error-on-failed-entry-point", {
    describe: "Set this option in order to terminate immediately with an error code if an entry-point fails to be processed.\nIf `-t`/`--target` is provided then this property is always true and cannot be changed. Otherwise the default is false.\nWhen set to false, ngcc will continue to process entry-points after a failure. In which case it will log an error and resume processing other entry-points.",
    type: "boolean",
    default: false
  }).option("tsconfig", {
    describe: "A path to a tsconfig.json file that will be used to configure the Angular compiler and module resolution used by ngcc.\nIf not provided, ngcc will attempt to read a `tsconfig.json` file from the folder above that given by the `-s` option.\nSet to false (via `--no-tsconfig`) if you do not want ngcc to use any `tsconfig.json` file.",
    type: "string"
  }).strict().help().parseSync();
  if ((_a = options2.f) == null ? void 0 : _a.length) {
    console.error("The formats option (-f/--formats) has been removed. Consider the properties option (-p/--properties) instead.");
    process.exit(1);
  }
  const fs5 = new NodeJSFileSystem();
  setFileSystem(fs5);
  const baseSourcePath = fs5.resolve(options2.s || "./node_modules");
  const propertiesToConsider = options2.p;
  const targetEntryPointPath = options2.t;
  const compileAllFormats = !options2["first-only"];
  const typingsOnly = options2["typings-only"];
  const createNewEntryPointFormats = options2["create-ivy-entry-points"];
  const logLevel = options2.l;
  const enableI18nLegacyMessageIdFormat = options2["legacy-message-ids"];
  const invalidateEntryPointManifest = options2["invalidate-entry-point-manifest"];
  const errorOnFailedEntryPoint = options2["error-on-failed-entry-point"];
  const findEntryPointsFromTsConfigProgram = options2["use-program-dependencies"];
  const tsConfigPath = `${options2.tsconfig}` === "false" ? null : options2.tsconfig;
  const logger = logLevel && new ConsoleLogger(LogLevel[logLevel]);
  return {
    basePath: baseSourcePath,
    propertiesToConsider,
    targetEntryPointPath,
    typingsOnly,
    compileAllFormats,
    createNewEntryPointFormats,
    logger,
    enableI18nLegacyMessageIdFormat,
    async: options2.async,
    invalidateEntryPointManifest,
    errorOnFailedEntryPoint,
    tsConfigPath,
    findEntryPointsFromTsConfigProgram
  };
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/ngcc/main-ngcc.mjs
process.title = "ngcc";
var startTime = Date.now();
var options = parseCommandLineOptions(process.argv.slice(2));
(async () => {
  try {
    await mainNgcc(options);
    if (options.logger) {
      const duration = Math.round((Date.now() - startTime) / 1e3);
      options.logger.debug(`Run ngcc in ${duration}s.`);
    }
    process.exitCode = 0;
  } catch (e) {
    console.error(e.stack || e.message);
    process.exit(typeof e.code === "number" ? e.code : 1);
  }
})();
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
//# sourceMappingURL=main-ngcc.js.map
