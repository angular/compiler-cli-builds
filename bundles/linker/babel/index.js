
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
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/file_system/src/compiler_host.mjs
import {
  EOL
} from "os";
import ts from "typescript";

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
  isRoot(path) {
    return this.dirname(path) === this.normalize(path);
  }
  isRooted(path) {
    return isAbsolute(path);
  }
  relative(from, to) {
    return this.normalize(relative2(from, to));
  }
  basename(filePath, extension) {
    return basename(filePath, extension);
  }
  extname(path) {
    return extname(path);
  }
  normalize(path) {
    return path.replace(/\\/g, "/");
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
  exists(path) {
    return existsSync(path);
  }
  readFile(path) {
    return readFileSync(path, "utf8");
  }
  readFileBuffer(path) {
    return readFileSync(path);
  }
  readdir(path) {
    return readdirSync(path);
  }
  lstat(path) {
    return lstatSync(path);
  }
  stat(path) {
    return statSync(path);
  }
  realpath(path) {
    return this.resolve(realpathSync(path));
  }
  getDefaultLibLocation() {
    const requireFn = isCommonJS ? __require : module.createRequire(currentFileUrl);
    return this.resolve(requireFn.resolve("typescript"), "..");
  }
};
var NodeJSFileSystem = class extends NodeJSReadonlyFileSystem {
  writeFile(path, data, exclusive = false) {
    writeFileSync(path, data, exclusive ? { flag: "wx" } : void 0);
  }
  removeFile(path) {
    unlinkSync(path);
  }
  symlink(target, path) {
    symlinkSync(target, path);
  }
  copyFile(from, to) {
    copyFileSync(from, to);
  }
  moveFile(from, to) {
    renameSync(from, to);
  }
  ensureDir(path) {
    const parents = [];
    while (!this.isRoot(path) && !this.exists(path)) {
      parents.push(path);
      path = this.dirname(path);
    }
    while (parents.length) {
      this.safeMkdir(parents.pop());
    }
  }
  removeDeep(path) {
    rmdirSync(path, { recursive: true });
  }
  safeMkdir(path) {
    try {
      mkdirSync(path);
    } catch (err) {
      if (!this.exists(path) || !this.stat(path).isDirectory()) {
        throw err;
      }
    }
  }
};
function toggleCase(str) {
  return str.replace(/\w/g, (ch) => ch.toUpperCase() === ch ? ch.toLowerCase() : ch.toUpperCase());
}

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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/src/fatal_linker_error.mjs
var FatalLinkerError = class extends Error {
  constructor(node, message) {
    super(message);
    this.node = node;
    this.type = "FatalLinkerError";
  }
};
function isFatalLinkerError(e) {
  return e && e.type === "FatalLinkerError";
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/src/ast/utils.mjs
function assert(node, predicate, expected) {
  if (!predicate(node)) {
    throw new FatalLinkerError(node, `Unsupported syntax, expected ${expected}.`);
  }
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/src/ast/ast_value.mjs
import {
  WrappedNodeExpr
} from "@angular/compiler";
var AstObject = class {
  constructor(expression, obj, host) {
    this.expression = expression;
    this.obj = obj;
    this.host = host;
  }
  static parse(expression, host) {
    const obj = host.parseObjectLiteral(expression);
    return new AstObject(expression, obj, host);
  }
  has(propertyName) {
    return this.obj.has(propertyName);
  }
  getNumber(propertyName) {
    return this.host.parseNumericLiteral(this.getRequiredProperty(propertyName));
  }
  getString(propertyName) {
    return this.host.parseStringLiteral(this.getRequiredProperty(propertyName));
  }
  getBoolean(propertyName) {
    return this.host.parseBooleanLiteral(this.getRequiredProperty(propertyName));
  }
  getObject(propertyName) {
    const expr = this.getRequiredProperty(propertyName);
    const obj = this.host.parseObjectLiteral(expr);
    return new AstObject(expr, obj, this.host);
  }
  getArray(propertyName) {
    const arr = this.host.parseArrayLiteral(this.getRequiredProperty(propertyName));
    return arr.map((entry) => new AstValue(entry, this.host));
  }
  getOpaque(propertyName) {
    return new WrappedNodeExpr(this.getRequiredProperty(propertyName));
  }
  getNode(propertyName) {
    return this.getRequiredProperty(propertyName);
  }
  getValue(propertyName) {
    return new AstValue(this.getRequiredProperty(propertyName), this.host);
  }
  toLiteral(mapper) {
    const result = {};
    for (const [key, expression] of this.obj) {
      result[key] = mapper(new AstValue(expression, this.host));
    }
    return result;
  }
  toMap(mapper) {
    const result = new Map();
    for (const [key, expression] of this.obj) {
      result.set(key, mapper(new AstValue(expression, this.host)));
    }
    return result;
  }
  getRequiredProperty(propertyName) {
    if (!this.obj.has(propertyName)) {
      throw new FatalLinkerError(this.expression, `Expected property '${propertyName}' to be present.`);
    }
    return this.obj.get(propertyName);
  }
};
var AstValue = class {
  constructor(expression, host) {
    this.expression = expression;
    this.host = host;
  }
  getSymbolName() {
    return this.host.getSymbolName(this.expression);
  }
  isNumber() {
    return this.host.isNumericLiteral(this.expression);
  }
  getNumber() {
    return this.host.parseNumericLiteral(this.expression);
  }
  isString() {
    return this.host.isStringLiteral(this.expression);
  }
  getString() {
    return this.host.parseStringLiteral(this.expression);
  }
  isBoolean() {
    return this.host.isBooleanLiteral(this.expression);
  }
  getBoolean() {
    return this.host.parseBooleanLiteral(this.expression);
  }
  isObject() {
    return this.host.isObjectLiteral(this.expression);
  }
  getObject() {
    return AstObject.parse(this.expression, this.host);
  }
  isArray() {
    return this.host.isArrayLiteral(this.expression);
  }
  getArray() {
    const arr = this.host.parseArrayLiteral(this.expression);
    return arr.map((entry) => new AstValue(entry, this.host));
  }
  isFunction() {
    return this.host.isFunctionExpression(this.expression);
  }
  getFunctionReturnValue() {
    return new AstValue(this.host.parseReturnValue(this.expression), this.host);
  }
  isCallExpression() {
    return this.host.isCallExpression(this.expression);
  }
  getCallee() {
    return new AstValue(this.host.parseCallee(this.expression), this.host);
  }
  getArguments() {
    const args = this.host.parseArguments(this.expression);
    return args.map((arg) => new AstValue(arg, this.host));
  }
  getOpaque() {
    return new WrappedNodeExpr(this.expression);
  }
  getRange() {
    return this.host.getRange(this.expression);
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/src/file_linker/emit_scopes/emit_scope.mjs
import { ConstantPool } from "@angular/compiler";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/src/linker_import_generator.mjs
var LinkerImportGenerator = class {
  constructor(ngImport) {
    this.ngImport = ngImport;
  }
  generateNamespaceImport(moduleName) {
    this.assertModuleName(moduleName);
    return this.ngImport;
  }
  generateNamedImport(moduleName, originalSymbol) {
    this.assertModuleName(moduleName);
    return { moduleImport: this.ngImport, symbol: originalSymbol };
  }
  assertModuleName(moduleName) {
    if (moduleName !== "@angular/core") {
      throw new FatalLinkerError(this.ngImport, `Unable to import from anything other than '@angular/core'`);
    }
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/src/file_linker/emit_scopes/emit_scope.mjs
var EmitScope = class {
  constructor(ngImport, translator) {
    this.ngImport = ngImport;
    this.translator = translator;
    this.constantPool = new ConstantPool();
  }
  translateDefinition(definition) {
    return this.translator.translateExpression(definition, new LinkerImportGenerator(this.ngImport));
  }
  getConstantStatements() {
    const importGenerator = new LinkerImportGenerator(this.ngImport);
    return this.constantPool.statements.map((statement) => this.translator.translateStatement(statement, importGenerator));
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/src/file_linker/emit_scopes/iife_emit_scope.mjs
var IifeEmitScope = class extends EmitScope {
  constructor(ngImport, translator, factory) {
    super(ngImport, translator);
    this.factory = factory;
  }
  translateDefinition(definition) {
    const constantStatements = super.getConstantStatements();
    const returnStatement = this.factory.createReturnStatement(super.translateDefinition(definition));
    const body = this.factory.createBlock([...constantStatements, returnStatement]);
    const fn = this.factory.createFunctionExpression(null, [], body);
    return this.factory.createCallExpression(fn, [], false);
  }
  getConstantStatements() {
    throw new Error("BUG - IifeEmitScope should not expose any constant statements");
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/src/file_linker/partial_linkers/partial_linker_selector.mjs
import semver from "semver";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/src/file_linker/get_source_file.mjs
function createGetSourceFile(sourceUrl, code, loader) {
  if (loader === null) {
    return () => null;
  } else {
    let sourceFile = void 0;
    return () => {
      if (sourceFile === void 0) {
        sourceFile = loader.loadSourceFile(sourceUrl, code);
      }
      return sourceFile;
    };
  }
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/src/file_linker/partial_linkers/partial_class_metadata_linker_1.mjs
import { compileClassMetadata } from "@angular/compiler";
var PartialClassMetadataLinkerVersion1 = class {
  linkPartialDeclaration(constantPool, metaObj) {
    const meta = toR3ClassMetadata(metaObj);
    return compileClassMetadata(meta);
  }
};
function toR3ClassMetadata(metaObj) {
  return {
    type: metaObj.getOpaque("type"),
    decorators: metaObj.getOpaque("decorators"),
    ctorParameters: metaObj.has("ctorParameters") ? metaObj.getOpaque("ctorParameters") : null,
    propDecorators: metaObj.has("propDecorators") ? metaObj.getOpaque("propDecorators") : null
  };
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/src/file_linker/partial_linkers/partial_component_linker_1.mjs
import { ChangeDetectionStrategy, compileComponentFromMetadata, DEFAULT_INTERPOLATION_CONFIG, InterpolationConfig, makeBindingParser as makeBindingParser2, parseTemplate, ViewEncapsulation } from "@angular/compiler";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/src/file_linker/partial_linkers/partial_directive_linker_1.mjs
import { compileDirectiveFromMetadata, makeBindingParser, ParseLocation, ParseSourceFile, ParseSourceSpan } from "@angular/compiler";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/src/file_linker/partial_linkers/util.mjs
import { createR3ProviderExpression, outputAst as o2 } from "@angular/compiler";
function wrapReference(wrapped) {
  return { value: wrapped, type: wrapped };
}
function parseEnum(value, Enum) {
  const symbolName = value.getSymbolName();
  if (symbolName === null) {
    throw new FatalLinkerError(value.expression, "Expected value to have a symbol name");
  }
  const enumValue = Enum[symbolName];
  if (enumValue === void 0) {
    throw new FatalLinkerError(value.expression, `Unsupported enum value for ${Enum}`);
  }
  return enumValue;
}
function getDependency(depObj) {
  const isAttribute = depObj.has("attribute") && depObj.getBoolean("attribute");
  const token = depObj.getOpaque("token");
  const attributeNameType = isAttribute ? o2.literal("unknown") : null;
  return {
    token,
    attributeNameType,
    host: depObj.has("host") && depObj.getBoolean("host"),
    optional: depObj.has("optional") && depObj.getBoolean("optional"),
    self: depObj.has("self") && depObj.getBoolean("self"),
    skipSelf: depObj.has("skipSelf") && depObj.getBoolean("skipSelf")
  };
}
function extractForwardRef(expr) {
  if (!expr.isCallExpression()) {
    return createR3ProviderExpression(expr.getOpaque(), false);
  }
  const callee = expr.getCallee();
  if (callee.getSymbolName() !== "forwardRef") {
    throw new FatalLinkerError(callee.expression, "Unsupported expression, expected a `forwardRef()` call or a type reference");
  }
  const args = expr.getArguments();
  if (args.length !== 1) {
    throw new FatalLinkerError(expr, "Unsupported `forwardRef(fn)` call, expected a single argument");
  }
  const wrapperFn = args[0];
  if (!wrapperFn.isFunction()) {
    throw new FatalLinkerError(wrapperFn, "Unsupported `forwardRef(fn)` call, expected its argument to be a function");
  }
  return createR3ProviderExpression(wrapperFn.getFunctionReturnValue().getOpaque(), true);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/src/file_linker/partial_linkers/partial_directive_linker_1.mjs
var PartialDirectiveLinkerVersion1 = class {
  constructor(sourceUrl, code) {
    this.sourceUrl = sourceUrl;
    this.code = code;
  }
  linkPartialDeclaration(constantPool, metaObj) {
    const meta = toR3DirectiveMeta(metaObj, this.code, this.sourceUrl);
    const def = compileDirectiveFromMetadata(meta, constantPool, makeBindingParser());
    return def.expression;
  }
};
function toR3DirectiveMeta(metaObj, code, sourceUrl) {
  const typeExpr = metaObj.getValue("type");
  const typeName = typeExpr.getSymbolName();
  if (typeName === null) {
    throw new FatalLinkerError(typeExpr.expression, "Unsupported type, its name could not be determined");
  }
  return {
    typeSourceSpan: createSourceSpan(typeExpr.getRange(), code, sourceUrl),
    type: wrapReference(typeExpr.getOpaque()),
    typeArgumentCount: 0,
    internalType: metaObj.getOpaque("type"),
    deps: null,
    host: toHostMetadata(metaObj),
    inputs: metaObj.has("inputs") ? metaObj.getObject("inputs").toLiteral(toInputMapping) : {},
    outputs: metaObj.has("outputs") ? metaObj.getObject("outputs").toLiteral((value) => value.getString()) : {},
    queries: metaObj.has("queries") ? metaObj.getArray("queries").map((entry) => toQueryMetadata(entry.getObject())) : [],
    viewQueries: metaObj.has("viewQueries") ? metaObj.getArray("viewQueries").map((entry) => toQueryMetadata(entry.getObject())) : [],
    providers: metaObj.has("providers") ? metaObj.getOpaque("providers") : null,
    fullInheritance: false,
    selector: metaObj.has("selector") ? metaObj.getString("selector") : null,
    exportAs: metaObj.has("exportAs") ? metaObj.getArray("exportAs").map((entry) => entry.getString()) : null,
    lifecycle: {
      usesOnChanges: metaObj.has("usesOnChanges") ? metaObj.getBoolean("usesOnChanges") : false
    },
    name: typeName,
    usesInheritance: metaObj.has("usesInheritance") ? metaObj.getBoolean("usesInheritance") : false
  };
}
function toInputMapping(value) {
  if (value.isString()) {
    return value.getString();
  }
  const values = value.getArray().map((innerValue) => innerValue.getString());
  if (values.length !== 2) {
    throw new FatalLinkerError(value.expression, "Unsupported input, expected a string or an array containing exactly two strings");
  }
  return values;
}
function toHostMetadata(metaObj) {
  if (!metaObj.has("host")) {
    return {
      attributes: {},
      listeners: {},
      properties: {},
      specialAttributes: {}
    };
  }
  const host = metaObj.getObject("host");
  const specialAttributes = {};
  if (host.has("styleAttribute")) {
    specialAttributes.styleAttr = host.getString("styleAttribute");
  }
  if (host.has("classAttribute")) {
    specialAttributes.classAttr = host.getString("classAttribute");
  }
  return {
    attributes: host.has("attributes") ? host.getObject("attributes").toLiteral((value) => value.getOpaque()) : {},
    listeners: host.has("listeners") ? host.getObject("listeners").toLiteral((value) => value.getString()) : {},
    properties: host.has("properties") ? host.getObject("properties").toLiteral((value) => value.getString()) : {},
    specialAttributes
  };
}
function toQueryMetadata(obj) {
  let predicate;
  const predicateExpr = obj.getValue("predicate");
  if (predicateExpr.isArray()) {
    predicate = predicateExpr.getArray().map((entry) => entry.getString());
  } else {
    predicate = predicateExpr.getOpaque();
  }
  return {
    propertyName: obj.getString("propertyName"),
    first: obj.has("first") ? obj.getBoolean("first") : false,
    predicate,
    descendants: obj.has("descendants") ? obj.getBoolean("descendants") : false,
    emitDistinctChangesOnly: obj.has("emitDistinctChangesOnly") ? obj.getBoolean("emitDistinctChangesOnly") : true,
    read: obj.has("read") ? obj.getOpaque("read") : null,
    static: obj.has("static") ? obj.getBoolean("static") : false
  };
}
function createSourceSpan(range, code, sourceUrl) {
  const sourceFile = new ParseSourceFile(code, sourceUrl);
  const startLocation = new ParseLocation(sourceFile, range.startPos, range.startLine, range.startCol);
  return new ParseSourceSpan(startLocation, startLocation.moveBy(range.endPos - range.startPos));
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/src/file_linker/partial_linkers/partial_component_linker_1.mjs
var PartialComponentLinkerVersion1 = class {
  constructor(getSourceFile2, sourceUrl, code) {
    this.getSourceFile = getSourceFile2;
    this.sourceUrl = sourceUrl;
    this.code = code;
  }
  linkPartialDeclaration(constantPool, metaObj) {
    const meta = this.toR3ComponentMeta(metaObj);
    const def = compileComponentFromMetadata(meta, constantPool, makeBindingParser2());
    return def.expression;
  }
  toR3ComponentMeta(metaObj) {
    const interpolation = parseInterpolationConfig(metaObj);
    const templateSource = metaObj.getValue("template");
    const isInline = metaObj.has("isInline") ? metaObj.getBoolean("isInline") : false;
    const templateInfo = this.getTemplateInfo(templateSource, isInline);
    const template = parseTemplate(templateInfo.code, templateInfo.sourceUrl, {
      escapedString: templateInfo.isEscaped,
      interpolationConfig: interpolation,
      range: templateInfo.range,
      enableI18nLegacyMessageIdFormat: false,
      preserveWhitespaces: metaObj.has("preserveWhitespaces") ? metaObj.getBoolean("preserveWhitespaces") : false,
      i18nNormalizeLineEndingsInICUs: isInline
    });
    if (template.errors !== null) {
      const errors = template.errors.map((err) => err.toString()).join("\n");
      throw new FatalLinkerError(templateSource.expression, `Errors found in the template:
${errors}`);
    }
    let declarationListEmitMode = 0;
    const collectUsedDirectives = (directives2) => {
      return directives2.map((directive) => {
        const directiveExpr = directive.getObject();
        const type = directiveExpr.getValue("type");
        const selector = directiveExpr.getString("selector");
        const { expression: typeExpr, isForwardRef } = extractForwardRef(type);
        if (isForwardRef) {
          declarationListEmitMode = 1;
        }
        return {
          type: typeExpr,
          selector,
          inputs: directiveExpr.has("inputs") ? directiveExpr.getArray("inputs").map((input) => input.getString()) : [],
          outputs: directiveExpr.has("outputs") ? directiveExpr.getArray("outputs").map((input) => input.getString()) : [],
          exportAs: directiveExpr.has("exportAs") ? directiveExpr.getArray("exportAs").map((exportAs) => exportAs.getString()) : null
        };
      });
    };
    let directives = [];
    if (metaObj.has("components")) {
      directives.push(...collectUsedDirectives(metaObj.getArray("components")));
    }
    if (metaObj.has("directives")) {
      directives.push(...collectUsedDirectives(metaObj.getArray("directives")));
    }
    let pipes = new Map();
    if (metaObj.has("pipes")) {
      pipes = metaObj.getObject("pipes").toMap((pipe) => {
        const { expression: pipeType, isForwardRef } = extractForwardRef(pipe);
        if (isForwardRef) {
          declarationListEmitMode = 1;
        }
        return pipeType;
      });
    }
    return __spreadProps(__spreadValues({}, toR3DirectiveMeta(metaObj, this.code, this.sourceUrl)), {
      viewProviders: metaObj.has("viewProviders") ? metaObj.getOpaque("viewProviders") : null,
      template: {
        nodes: template.nodes,
        ngContentSelectors: template.ngContentSelectors
      },
      declarationListEmitMode,
      styles: metaObj.has("styles") ? metaObj.getArray("styles").map((entry) => entry.getString()) : [],
      encapsulation: metaObj.has("encapsulation") ? parseEncapsulation(metaObj.getValue("encapsulation")) : ViewEncapsulation.Emulated,
      interpolation,
      changeDetection: metaObj.has("changeDetection") ? parseChangeDetectionStrategy(metaObj.getValue("changeDetection")) : ChangeDetectionStrategy.Default,
      animations: metaObj.has("animations") ? metaObj.getOpaque("animations") : null,
      relativeContextFilePath: this.sourceUrl,
      i18nUseExternalIds: false,
      pipes,
      directives
    });
  }
  getTemplateInfo(templateNode, isInline) {
    const range = templateNode.getRange();
    if (!isInline) {
      const externalTemplate = this.tryExternalTemplate(range);
      if (externalTemplate !== null) {
        return externalTemplate;
      }
    }
    return this.templateFromPartialCode(templateNode, range);
  }
  tryExternalTemplate(range) {
    const sourceFile = this.getSourceFile();
    if (sourceFile === null) {
      return null;
    }
    const pos = sourceFile.getOriginalLocation(range.startLine, range.startCol);
    if (pos === null || pos.file === this.sourceUrl || /\.[jt]s$/.test(pos.file) || pos.line !== 0 || pos.column !== 0) {
      return null;
    }
    const templateContents = sourceFile.sources.find((src) => (src == null ? void 0 : src.sourcePath) === pos.file).contents;
    return {
      code: templateContents,
      sourceUrl: pos.file,
      range: { startPos: 0, startLine: 0, startCol: 0, endPos: templateContents.length },
      isEscaped: false
    };
  }
  templateFromPartialCode(templateNode, { startPos, endPos, startLine, startCol }) {
    if (!/["'`]/.test(this.code[startPos]) || this.code[startPos] !== this.code[endPos - 1]) {
      throw new FatalLinkerError(templateNode.expression, `Expected the template string to be wrapped in quotes but got: ${this.code.substring(startPos, endPos)}`);
    }
    return {
      code: this.code,
      sourceUrl: this.sourceUrl,
      range: { startPos: startPos + 1, endPos: endPos - 1, startLine, startCol: startCol + 1 },
      isEscaped: true
    };
  }
};
function parseInterpolationConfig(metaObj) {
  if (!metaObj.has("interpolation")) {
    return DEFAULT_INTERPOLATION_CONFIG;
  }
  const interpolationExpr = metaObj.getValue("interpolation");
  const values = interpolationExpr.getArray().map((entry) => entry.getString());
  if (values.length !== 2) {
    throw new FatalLinkerError(interpolationExpr.expression, "Unsupported interpolation config, expected an array containing exactly two strings");
  }
  return InterpolationConfig.fromArray(values);
}
function parseEncapsulation(encapsulation) {
  const symbolName = encapsulation.getSymbolName();
  if (symbolName === null) {
    throw new FatalLinkerError(encapsulation.expression, "Expected encapsulation to have a symbol name");
  }
  const enumValue = ViewEncapsulation[symbolName];
  if (enumValue === void 0) {
    throw new FatalLinkerError(encapsulation.expression, "Unsupported encapsulation");
  }
  return enumValue;
}
function parseChangeDetectionStrategy(changeDetectionStrategy) {
  const symbolName = changeDetectionStrategy.getSymbolName();
  if (symbolName === null) {
    throw new FatalLinkerError(changeDetectionStrategy.expression, "Expected change detection strategy to have a symbol name");
  }
  const enumValue = ChangeDetectionStrategy[symbolName];
  if (enumValue === void 0) {
    throw new FatalLinkerError(changeDetectionStrategy.expression, "Unsupported change detection strategy");
  }
  return enumValue;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/src/file_linker/partial_linkers/partial_factory_linker_1.mjs
import { compileFactoryFunction, FactoryTarget } from "@angular/compiler";
var PartialFactoryLinkerVersion1 = class {
  linkPartialDeclaration(constantPool, metaObj) {
    const meta = toR3FactoryMeta(metaObj);
    const def = compileFactoryFunction(meta);
    return def.expression;
  }
};
function toR3FactoryMeta(metaObj) {
  const typeExpr = metaObj.getValue("type");
  const typeName = typeExpr.getSymbolName();
  if (typeName === null) {
    throw new FatalLinkerError(typeExpr.expression, "Unsupported type, its name could not be determined");
  }
  return {
    name: typeName,
    type: wrapReference(typeExpr.getOpaque()),
    internalType: metaObj.getOpaque("type"),
    typeArgumentCount: 0,
    target: parseEnum(metaObj.getValue("target"), FactoryTarget),
    deps: getDependencies(metaObj, "deps")
  };
}
function getDependencies(metaObj, propName) {
  if (!metaObj.has(propName)) {
    return null;
  }
  const deps = metaObj.getValue(propName);
  if (deps.isArray()) {
    return deps.getArray().map((dep) => getDependency(dep.getObject()));
  }
  if (deps.isString()) {
    return "invalid";
  }
  return null;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/src/file_linker/partial_linkers/partial_injectable_linker_1.mjs
import { compileInjectable, createR3ProviderExpression as createR3ProviderExpression2, outputAst as o3 } from "@angular/compiler";
var PartialInjectableLinkerVersion1 = class {
  linkPartialDeclaration(constantPool, metaObj) {
    const meta = toR3InjectableMeta(metaObj);
    const def = compileInjectable(meta, false);
    return def.expression;
  }
};
function toR3InjectableMeta(metaObj) {
  const typeExpr = metaObj.getValue("type");
  const typeName = typeExpr.getSymbolName();
  if (typeName === null) {
    throw new FatalLinkerError(typeExpr.expression, "Unsupported type, its name could not be determined");
  }
  const meta = {
    name: typeName,
    type: wrapReference(typeExpr.getOpaque()),
    internalType: typeExpr.getOpaque(),
    typeArgumentCount: 0,
    providedIn: metaObj.has("providedIn") ? extractForwardRef(metaObj.getValue("providedIn")) : createR3ProviderExpression2(o3.literal(null), false)
  };
  if (metaObj.has("useClass")) {
    meta.useClass = extractForwardRef(metaObj.getValue("useClass"));
  }
  if (metaObj.has("useFactory")) {
    meta.useFactory = metaObj.getOpaque("useFactory");
  }
  if (metaObj.has("useExisting")) {
    meta.useExisting = extractForwardRef(metaObj.getValue("useExisting"));
  }
  if (metaObj.has("useValue")) {
    meta.useValue = extractForwardRef(metaObj.getValue("useValue"));
  }
  if (metaObj.has("deps")) {
    meta.deps = metaObj.getArray("deps").map((dep) => getDependency(dep.getObject()));
  }
  return meta;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/src/file_linker/partial_linkers/partial_injector_linker_1.mjs
import { compileInjector } from "@angular/compiler";
var PartialInjectorLinkerVersion1 = class {
  linkPartialDeclaration(constantPool, metaObj) {
    const meta = toR3InjectorMeta(metaObj);
    const def = compileInjector(meta);
    return def.expression;
  }
};
function toR3InjectorMeta(metaObj) {
  const typeExpr = metaObj.getValue("type");
  const typeName = typeExpr.getSymbolName();
  if (typeName === null) {
    throw new FatalLinkerError(typeExpr.expression, "Unsupported type, its name could not be determined");
  }
  return {
    name: typeName,
    type: wrapReference(typeExpr.getOpaque()),
    internalType: metaObj.getOpaque("type"),
    providers: metaObj.has("providers") ? metaObj.getOpaque("providers") : null,
    imports: metaObj.has("imports") ? metaObj.getArray("imports").map((i) => i.getOpaque()) : []
  };
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/src/file_linker/partial_linkers/partial_ng_module_linker_1.mjs
import { compileNgModule } from "@angular/compiler";
var PartialNgModuleLinkerVersion1 = class {
  constructor(emitInline) {
    this.emitInline = emitInline;
  }
  linkPartialDeclaration(constantPool, metaObj) {
    const meta = toR3NgModuleMeta(metaObj, this.emitInline);
    const def = compileNgModule(meta);
    return def.expression;
  }
};
function toR3NgModuleMeta(metaObj, emitInline) {
  const wrappedType = metaObj.getOpaque("type");
  const meta = {
    type: wrapReference(wrappedType),
    internalType: wrappedType,
    adjacentType: wrappedType,
    bootstrap: [],
    declarations: [],
    imports: [],
    exports: [],
    emitInline,
    containsForwardDecls: false,
    schemas: [],
    id: metaObj.has("id") ? metaObj.getOpaque("id") : null
  };
  if (metaObj.has("bootstrap")) {
    const bootstrap = metaObj.getValue("bootstrap");
    if (bootstrap.isFunction()) {
      meta.containsForwardDecls = true;
      meta.bootstrap = wrapReferences(unwrapForwardRefs(bootstrap));
    } else
      meta.bootstrap = wrapReferences(bootstrap);
  }
  if (metaObj.has("declarations")) {
    const declarations = metaObj.getValue("declarations");
    if (declarations.isFunction()) {
      meta.containsForwardDecls = true;
      meta.declarations = wrapReferences(unwrapForwardRefs(declarations));
    } else
      meta.declarations = wrapReferences(declarations);
  }
  if (metaObj.has("imports")) {
    const imports = metaObj.getValue("imports");
    if (imports.isFunction()) {
      meta.containsForwardDecls = true;
      meta.imports = wrapReferences(unwrapForwardRefs(imports));
    } else
      meta.imports = wrapReferences(imports);
  }
  if (metaObj.has("exports")) {
    const exports = metaObj.getValue("exports");
    if (exports.isFunction()) {
      meta.containsForwardDecls = true;
      meta.exports = wrapReferences(unwrapForwardRefs(exports));
    } else
      meta.exports = wrapReferences(exports);
  }
  if (metaObj.has("schemas")) {
    const schemas = metaObj.getValue("schemas");
    meta.schemas = wrapReferences(schemas);
  }
  return meta;
}
function unwrapForwardRefs(field) {
  return field.getFunctionReturnValue();
}
function wrapReferences(values) {
  return values.getArray().map((i) => wrapReference(i.getOpaque()));
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/src/file_linker/partial_linkers/partial_pipe_linker_1.mjs
import { compilePipeFromMetadata } from "@angular/compiler";
var PartialPipeLinkerVersion1 = class {
  constructor() {
  }
  linkPartialDeclaration(constantPool, metaObj) {
    const meta = toR3PipeMeta(metaObj);
    const def = compilePipeFromMetadata(meta);
    return def.expression;
  }
};
function toR3PipeMeta(metaObj) {
  const typeExpr = metaObj.getValue("type");
  const typeName = typeExpr.getSymbolName();
  if (typeName === null) {
    throw new FatalLinkerError(typeExpr.expression, "Unsupported type, its name could not be determined");
  }
  const pure = metaObj.has("pure") ? metaObj.getBoolean("pure") : true;
  return {
    name: typeName,
    type: wrapReference(typeExpr.getOpaque()),
    internalType: metaObj.getOpaque("type"),
    typeArgumentCount: 0,
    deps: null,
    pipeName: metaObj.getString("name"),
    pure
  };
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/src/file_linker/partial_linkers/partial_linker_selector.mjs
var \u0275\u0275ngDeclareDirective = "\u0275\u0275ngDeclareDirective";
var \u0275\u0275ngDeclareClassMetadata = "\u0275\u0275ngDeclareClassMetadata";
var \u0275\u0275ngDeclareComponent = "\u0275\u0275ngDeclareComponent";
var \u0275\u0275ngDeclareFactory = "\u0275\u0275ngDeclareFactory";
var \u0275\u0275ngDeclareInjectable = "\u0275\u0275ngDeclareInjectable";
var \u0275\u0275ngDeclareInjector = "\u0275\u0275ngDeclareInjector";
var \u0275\u0275ngDeclareNgModule = "\u0275\u0275ngDeclareNgModule";
var \u0275\u0275ngDeclarePipe = "\u0275\u0275ngDeclarePipe";
function createLinkerMap(environment, sourceUrl, code) {
  const linkers = new Map();
  const LATEST_VERSION_RANGE = getRange("<=", "13.0.0-rc.0+25.sha-fc6519c.with-local-changes");
  linkers.set(\u0275\u0275ngDeclareDirective, [
    { range: LATEST_VERSION_RANGE, linker: new PartialDirectiveLinkerVersion1(sourceUrl, code) }
  ]);
  linkers.set(\u0275\u0275ngDeclareClassMetadata, [
    { range: LATEST_VERSION_RANGE, linker: new PartialClassMetadataLinkerVersion1() }
  ]);
  linkers.set(\u0275\u0275ngDeclareComponent, [
    {
      range: LATEST_VERSION_RANGE,
      linker: new PartialComponentLinkerVersion1(createGetSourceFile(sourceUrl, code, environment.sourceFileLoader), sourceUrl, code)
    }
  ]);
  linkers.set(\u0275\u0275ngDeclareFactory, [
    { range: LATEST_VERSION_RANGE, linker: new PartialFactoryLinkerVersion1() }
  ]);
  linkers.set(\u0275\u0275ngDeclareInjectable, [
    { range: LATEST_VERSION_RANGE, linker: new PartialInjectableLinkerVersion1() }
  ]);
  linkers.set(\u0275\u0275ngDeclareInjector, [
    { range: LATEST_VERSION_RANGE, linker: new PartialInjectorLinkerVersion1() }
  ]);
  linkers.set(\u0275\u0275ngDeclareNgModule, [
    {
      range: LATEST_VERSION_RANGE,
      linker: new PartialNgModuleLinkerVersion1(environment.options.linkerJitMode)
    }
  ]);
  linkers.set(\u0275\u0275ngDeclarePipe, [
    { range: LATEST_VERSION_RANGE, linker: new PartialPipeLinkerVersion1() }
  ]);
  return linkers;
}
var PartialLinkerSelector = class {
  constructor(linkers, logger, unknownDeclarationVersionHandling) {
    this.linkers = linkers;
    this.logger = logger;
    this.unknownDeclarationVersionHandling = unknownDeclarationVersionHandling;
  }
  supportsDeclaration(functionName) {
    return this.linkers.has(functionName);
  }
  getLinker(functionName, minVersion, version) {
    if (!this.linkers.has(functionName)) {
      throw new Error(`Unknown partial declaration function ${functionName}.`);
    }
    const linkerRanges = this.linkers.get(functionName);
    if (version === "13.0.0-rc.0+25.sha-fc6519c.with-local-changes") {
      return linkerRanges[linkerRanges.length - 1].linker;
    }
    const declarationRange = getRange(">=", minVersion);
    for (const { range: linkerRange, linker } of linkerRanges) {
      if (semver.intersects(declarationRange, linkerRange)) {
        return linker;
      }
    }
    const message = `This application depends upon a library published using Angular version ${version}, which requires Angular version ${minVersion} or newer to work correctly.
Consider upgrading your application to use a more recent version of Angular.`;
    if (this.unknownDeclarationVersionHandling === "error") {
      throw new Error(message);
    } else if (this.unknownDeclarationVersionHandling === "warn") {
      this.logger.warn(`${message}
Attempting to continue using this version of Angular.`);
    }
    return linkerRanges[linkerRanges.length - 1].linker;
  }
};
function getRange(comparator, versionStr) {
  const version = new semver.SemVer(versionStr);
  version.prerelease = [];
  return new semver.Range(`${comparator}${version.format()}`);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/src/file_linker/file_linker.mjs
var FileLinker = class {
  constructor(linkerEnvironment, sourceUrl, code) {
    this.linkerEnvironment = linkerEnvironment;
    this.emitScopes = new Map();
    this.linkerSelector = new PartialLinkerSelector(createLinkerMap(this.linkerEnvironment, sourceUrl, code), this.linkerEnvironment.logger, this.linkerEnvironment.options.unknownDeclarationVersionHandling);
  }
  isPartialDeclaration(calleeName) {
    return this.linkerSelector.supportsDeclaration(calleeName);
  }
  linkPartialDeclaration(declarationFn, args, declarationScope) {
    if (args.length !== 1) {
      throw new Error(`Invalid function call: It should have only a single object literal argument, but contained ${args.length}.`);
    }
    const metaObj = AstObject.parse(args[0], this.linkerEnvironment.host);
    const ngImport = metaObj.getNode("ngImport");
    const emitScope = this.getEmitScope(ngImport, declarationScope);
    const minVersion = metaObj.getString("minVersion");
    const version = metaObj.getString("version");
    const linker = this.linkerSelector.getLinker(declarationFn, minVersion, version);
    const definition = linker.linkPartialDeclaration(emitScope.constantPool, metaObj);
    return emitScope.translateDefinition(definition);
  }
  getConstantStatements() {
    const results = [];
    for (const [constantScope, emitScope] of this.emitScopes.entries()) {
      const statements = emitScope.getConstantStatements();
      results.push({ constantScope, statements });
    }
    return results;
  }
  getEmitScope(ngImport, declarationScope) {
    const constantScope = declarationScope.getConstantScopeRef(ngImport);
    if (constantScope === null) {
      return new IifeEmitScope(ngImport, this.linkerEnvironment.translator, this.linkerEnvironment.factory);
    }
    if (!this.emitScopes.has(constantScope)) {
      this.emitScopes.set(constantScope, new EmitScope(ngImport, this.linkerEnvironment.translator));
    }
    return this.emitScopes.get(constantScope);
  }
};

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
  constructor(sourcePath, contents, rawMap, sources, fs3) {
    this.sourcePath = sourcePath;
    this.contents = contents;
    this.rawMap = rawMap;
    this.sources = sources;
    this.fs = fs3;
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
  constructor(fs3, logger, schemeMap) {
    this.fs = fs3;
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
      const path = this.fs.resolve(sourceRoot, this.replaceSchemeWithPath(source));
      const content = map.sourcesContent && map.sourcesContent[index] || null;
      const sourceOrigin = content !== null && sourceMapOrigin !== ContentOrigin.Provided ? ContentOrigin.Inline : ContentOrigin.FileSystem;
      return this.loadSourceFileInternal(path, content, sourceOrigin, null);
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
  trackPath(path) {
    if (this.currentPaths.includes(path)) {
      throw new Error(`Circular source file mapping dependency: ${this.currentPaths.join(" -> ")} -> ${path}`);
    }
    this.currentPaths.push(path);
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
  replaceSchemeWithPath(path) {
    return path.replace(SCHEME_MATCHER, (_, scheme) => this.schemeMap[scheme.toLowerCase()] || "");
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/src/file_linker/linker_options.mjs
var DEFAULT_LINKER_OPTIONS = {
  sourceMapping: true,
  linkerJitMode: false,
  unknownDeclarationVersionHandling: "error"
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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/translator/src/import_manager.mjs
import ts6 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/imports/src/alias.mjs
import { ExternalExpr as ExternalExpr2 } from "@angular/compiler";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/imports/src/emitter.mjs
import { ExternalExpr, ExternalReference, WrappedNodeExpr as WrappedNodeExpr2 } from "@angular/compiler";
import ts4 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/util/src/typescript.mjs
import ts2 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/imports/src/find_export.mjs
import ts3 from "typescript";

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
import ts5 from "typescript";
var DefaultImportDeclaration = Symbol("DefaultImportDeclaration");

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
    var _a2;
    const varType = this.downlevelVariableDeclarations ? "var" : stmt.hasModifier(StmtModifier.Final) ? "const" : "let";
    return this.attachComments(this.factory.createVariableDeclaration(stmt.name, (_a2 = stmt.value) == null ? void 0 : _a2.visitExpression(this, context.withExpressionMode), varType), stmt.leadingComments);
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
        var _a2;
        return createTemplateElement({
          cooked: e.text,
          raw: e.rawText,
          range: (_a2 = e.sourceSpan) != null ? _a2 : ast.sourceSpan
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
    var _a2;
    return this.factory.createFunctionExpression((_a2 = ast.name) != null ? _a2 : null, ast.params.map((param) => param.name), this.factory.createBlock(this.visitStatements(ast.statements, context)));
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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/translator/src/type_translator.mjs
import {
  BuiltinTypeName
} from "@angular/compiler";
import ts7 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/translator/src/typescript_ast_factory.mjs
import ts8 from "typescript";
var PureAnnotation;
(function(PureAnnotation2) {
  PureAnnotation2["CLOSURE"] = "* @pureOrBreakMyCode ";
  PureAnnotation2["TERSER"] = "@__PURE__";
})(PureAnnotation || (PureAnnotation = {}));
var UNARY_OPERATORS2 = {
  "+": ts8.SyntaxKind.PlusToken,
  "-": ts8.SyntaxKind.MinusToken,
  "!": ts8.SyntaxKind.ExclamationToken
};
var BINARY_OPERATORS2 = {
  "&&": ts8.SyntaxKind.AmpersandAmpersandToken,
  ">": ts8.SyntaxKind.GreaterThanToken,
  ">=": ts8.SyntaxKind.GreaterThanEqualsToken,
  "&": ts8.SyntaxKind.AmpersandToken,
  "/": ts8.SyntaxKind.SlashToken,
  "==": ts8.SyntaxKind.EqualsEqualsToken,
  "===": ts8.SyntaxKind.EqualsEqualsEqualsToken,
  "<": ts8.SyntaxKind.LessThanToken,
  "<=": ts8.SyntaxKind.LessThanEqualsToken,
  "-": ts8.SyntaxKind.MinusToken,
  "%": ts8.SyntaxKind.PercentToken,
  "*": ts8.SyntaxKind.AsteriskToken,
  "!=": ts8.SyntaxKind.ExclamationEqualsToken,
  "!==": ts8.SyntaxKind.ExclamationEqualsEqualsToken,
  "||": ts8.SyntaxKind.BarBarToken,
  "+": ts8.SyntaxKind.PlusToken,
  "??": ts8.SyntaxKind.QuestionQuestionToken
};
var VAR_TYPES = {
  "const": ts8.NodeFlags.Const,
  "let": ts8.NodeFlags.Let,
  "var": ts8.NodeFlags.None
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/src/file_linker/translator.mjs
var Translator = class {
  constructor(factory) {
    this.factory = factory;
  }
  translateExpression(expression, imports, options = {}) {
    return expression.visitExpression(new ExpressionTranslatorVisitor(this.factory, imports, options), new Context(false));
  }
  translateStatement(statement, imports, options = {}) {
    return statement.visitStatement(new ExpressionTranslatorVisitor(this.factory, imports, options), new Context(true));
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/src/file_linker/linker_environment.mjs
var LinkerEnvironment = class {
  constructor(fileSystem, logger, host, factory, options) {
    this.fileSystem = fileSystem;
    this.logger = logger;
    this.host = host;
    this.factory = factory;
    this.options = options;
    this.translator = new Translator(this.factory);
    this.sourceFileLoader = this.options.sourceMapping ? new SourceFileLoader(this.fileSystem, this.logger, {}) : null;
  }
  static create(fileSystem, logger, host, factory, options) {
    var _a2, _b, _c;
    return new LinkerEnvironment(fileSystem, logger, host, factory, {
      sourceMapping: (_a2 = options.sourceMapping) != null ? _a2 : DEFAULT_LINKER_OPTIONS.sourceMapping,
      linkerJitMode: (_b = options.linkerJitMode) != null ? _b : DEFAULT_LINKER_OPTIONS.linkerJitMode,
      unknownDeclarationVersionHandling: (_c = options.unknownDeclarationVersionHandling) != null ? _c : DEFAULT_LINKER_OPTIONS.unknownDeclarationVersionHandling
    });
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/babel/src/babel_core.mjs
import * as _babelNamespace from "@babel/core";
import _babelDefault from "@babel/core";
var _a;
var babel = (_a = _babelDefault) != null ? _a : _babelNamespace;
var _typesNamespace = _babelNamespace.types;
if (_babelDefault !== void 0) {
  _typesNamespace = _babelDefault.types;
}
var types = _typesNamespace;
var NodePath = babel.NodePath;
var transformSync = babel.transformSync;
var parse = babel.parse;

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/babel/src/ast/babel_ast_factory.mjs
var BabelAstFactory = class {
  constructor(sourceUrl) {
    this.sourceUrl = sourceUrl;
    this.createArrayLiteral = types.arrayExpression;
    this.createBlock = types.blockStatement;
    this.createConditional = types.conditionalExpression;
    this.createExpressionStatement = types.expressionStatement;
    this.createIdentifier = types.identifier;
    this.createIfStatement = types.ifStatement;
    this.createNewExpression = types.newExpression;
    this.createParenthesizedExpression = types.parenthesizedExpression;
    this.createReturnStatement = types.returnStatement;
    this.createThrowStatement = types.throwStatement;
    this.createUnaryExpression = types.unaryExpression;
  }
  attachComments(statement, leadingComments) {
    for (let i = leadingComments.length - 1; i >= 0; i--) {
      const comment = leadingComments[i];
      types.addComment(statement, "leading", comment.toString(), !comment.multiline);
    }
  }
  createAssignment(target, value) {
    assert(target, isLExpression, "must be a left hand side expression");
    return types.assignmentExpression("=", target, value);
  }
  createBinaryExpression(leftOperand, operator, rightOperand) {
    switch (operator) {
      case "&&":
      case "||":
      case "??":
        return types.logicalExpression(operator, leftOperand, rightOperand);
      default:
        return types.binaryExpression(operator, leftOperand, rightOperand);
    }
  }
  createCallExpression(callee, args, pure) {
    const call = types.callExpression(callee, args);
    if (pure) {
      types.addComment(call, "leading", " @__PURE__ ", false);
    }
    return call;
  }
  createElementAccess(expression, element) {
    return types.memberExpression(expression, element, true);
  }
  createFunctionDeclaration(functionName, parameters, body) {
    assert(body, types.isBlockStatement, "a block");
    return types.functionDeclaration(types.identifier(functionName), parameters.map((param) => types.identifier(param)), body);
  }
  createFunctionExpression(functionName, parameters, body) {
    assert(body, types.isBlockStatement, "a block");
    const name = functionName !== null ? types.identifier(functionName) : null;
    return types.functionExpression(name, parameters.map((param) => types.identifier(param)), body);
  }
  createLiteral(value) {
    if (typeof value === "string") {
      return types.stringLiteral(value);
    } else if (typeof value === "number") {
      return types.numericLiteral(value);
    } else if (typeof value === "boolean") {
      return types.booleanLiteral(value);
    } else if (value === void 0) {
      return types.identifier("undefined");
    } else if (value === null) {
      return types.nullLiteral();
    } else {
      throw new Error(`Invalid literal: ${value} (${typeof value})`);
    }
  }
  createObjectLiteral(properties) {
    return types.objectExpression(properties.map((prop) => {
      const key = prop.quoted ? types.stringLiteral(prop.propertyName) : types.identifier(prop.propertyName);
      return types.objectProperty(key, prop.value);
    }));
  }
  createPropertyAccess(expression, propertyName) {
    return types.memberExpression(expression, types.identifier(propertyName), false);
  }
  createTaggedTemplate(tag, template) {
    const elements = template.elements.map((element, i) => this.setSourceMapRange(types.templateElement(element, i === template.elements.length - 1), element.range));
    return types.taggedTemplateExpression(tag, types.templateLiteral(elements, template.expressions));
  }
  createTypeOfExpression(expression) {
    return types.unaryExpression("typeof", expression);
  }
  createVariableDeclaration(variableName, initializer, type) {
    return types.variableDeclaration(type, [types.variableDeclarator(types.identifier(variableName), initializer)]);
  }
  setSourceMapRange(node, sourceMapRange) {
    if (sourceMapRange === null) {
      return node;
    }
    node.loc = {
      filename: sourceMapRange.url !== this.sourceUrl ? sourceMapRange.url : void 0,
      start: {
        line: sourceMapRange.start.line + 1,
        column: sourceMapRange.start.column
      },
      end: {
        line: sourceMapRange.end.line + 1,
        column: sourceMapRange.end.column
      }
    };
    node.start = sourceMapRange.start.offset;
    node.end = sourceMapRange.end.offset;
    return node;
  }
};
function isLExpression(expr) {
  return types.isLVal(expr);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/babel/src/ast/babel_ast_host.mjs
var BabelAstHost = class {
  constructor() {
    this.isStringLiteral = types.isStringLiteral;
    this.isNumericLiteral = types.isNumericLiteral;
    this.isArrayLiteral = types.isArrayExpression;
    this.isObjectLiteral = types.isObjectExpression;
    this.isCallExpression = types.isCallExpression;
  }
  getSymbolName(node) {
    if (types.isIdentifier(node)) {
      return node.name;
    } else if (types.isMemberExpression(node) && types.isIdentifier(node.property)) {
      return node.property.name;
    } else {
      return null;
    }
  }
  parseStringLiteral(str) {
    assert(str, types.isStringLiteral, "a string literal");
    return str.value;
  }
  parseNumericLiteral(num) {
    assert(num, types.isNumericLiteral, "a numeric literal");
    return num.value;
  }
  isBooleanLiteral(bool) {
    return types.isBooleanLiteral(bool) || isMinifiedBooleanLiteral(bool);
  }
  parseBooleanLiteral(bool) {
    if (types.isBooleanLiteral(bool)) {
      return bool.value;
    } else if (isMinifiedBooleanLiteral(bool)) {
      return !bool.argument.value;
    } else {
      throw new FatalLinkerError(bool, "Unsupported syntax, expected a boolean literal.");
    }
  }
  parseArrayLiteral(array) {
    assert(array, types.isArrayExpression, "an array literal");
    return array.elements.map((element) => {
      assert(element, isNotEmptyElement, "element in array not to be empty");
      assert(element, isNotSpreadElement, "element in array not to use spread syntax");
      return element;
    });
  }
  parseObjectLiteral(obj) {
    assert(obj, types.isObjectExpression, "an object literal");
    const result = new Map();
    for (const property of obj.properties) {
      assert(property, types.isObjectProperty, "a property assignment");
      assert(property.value, types.isExpression, "an expression");
      assert(property.key, isPropertyName, "a property name");
      const key = types.isIdentifier(property.key) ? property.key.name : property.key.value;
      result.set(key, property.value);
    }
    return result;
  }
  isFunctionExpression(node) {
    return types.isFunction(node);
  }
  parseReturnValue(fn) {
    assert(fn, this.isFunctionExpression, "a function");
    if (!types.isBlockStatement(fn.body)) {
      return fn.body;
    }
    if (fn.body.body.length !== 1) {
      throw new FatalLinkerError(fn.body, "Unsupported syntax, expected a function body with a single return statement.");
    }
    const stmt = fn.body.body[0];
    assert(stmt, types.isReturnStatement, "a function body with a single return statement");
    if (stmt.argument === null) {
      throw new FatalLinkerError(stmt, "Unsupported syntax, expected function to return a value.");
    }
    return stmt.argument;
  }
  parseCallee(call) {
    assert(call, types.isCallExpression, "a call expression");
    assert(call.callee, types.isExpression, "an expression");
    return call.callee;
  }
  parseArguments(call) {
    assert(call, types.isCallExpression, "a call expression");
    return call.arguments.map((arg) => {
      assert(arg, isNotSpreadArgument, "argument not to use spread syntax");
      assert(arg, types.isExpression, "argument to be an expression");
      return arg;
    });
  }
  getRange(node) {
    if (node.loc == null || node.start === null || node.end === null) {
      throw new FatalLinkerError(node, "Unable to read range for node - it is missing location information.");
    }
    return {
      startLine: node.loc.start.line - 1,
      startCol: node.loc.start.column,
      startPos: node.start,
      endPos: node.end
    };
  }
};
function isNotEmptyElement(e) {
  return e !== null;
}
function isNotSpreadElement(e) {
  return !types.isSpreadElement(e);
}
function isPropertyName(e) {
  return types.isIdentifier(e) || types.isStringLiteral(e) || types.isNumericLiteral(e);
}
function isNotSpreadArgument(arg) {
  return !types.isSpreadElement(arg);
}
function isMinifiedBooleanLiteral(node) {
  return types.isUnaryExpression(node) && node.prefix && node.operator === "!" && types.isNumericLiteral(node.argument) && (node.argument.value === 0 || node.argument.value === 1);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/babel/src/babel_declaration_scope.mjs
var BabelDeclarationScope = class {
  constructor(declarationScope) {
    this.declarationScope = declarationScope;
  }
  getConstantScopeRef(expression) {
    let bindingExpression = expression;
    while (types.isMemberExpression(bindingExpression)) {
      bindingExpression = bindingExpression.object;
    }
    if (!types.isIdentifier(bindingExpression)) {
      return null;
    }
    const binding = this.declarationScope.getBinding(bindingExpression.name);
    if (binding === void 0) {
      return null;
    }
    const path = binding.scope.path;
    if (!path.isFunctionParent() && !(path.isProgram() && path.node.sourceType === "module")) {
      return null;
    }
    return path;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/babel/src/es2015_linker_plugin.mjs
function createEs2015LinkerPlugin(_a2) {
  var _b = _a2, { fileSystem, logger } = _b, options = __objRest(_b, ["fileSystem", "logger"]);
  let fileLinker = null;
  return {
    visitor: {
      Program: {
        enter(path) {
          var _a3, _b2;
          assertNull(fileLinker);
          const file = path.hub.file;
          const filename = (_a3 = file.opts.filename) != null ? _a3 : file.opts.filenameRelative;
          if (!filename) {
            throw new Error("No filename (nor filenameRelative) provided by Babel. This is required for the linking of partially compiled directives and components.");
          }
          const sourceUrl = fileSystem.resolve((_b2 = file.opts.cwd) != null ? _b2 : ".", filename);
          const linkerEnvironment = LinkerEnvironment.create(fileSystem, logger, new BabelAstHost(), new BabelAstFactory(sourceUrl), options);
          fileLinker = new FileLinker(linkerEnvironment, sourceUrl, file.code);
        },
        exit() {
          assertNotNull(fileLinker);
          for (const { constantScope, statements } of fileLinker.getConstantStatements()) {
            insertStatements(constantScope, statements);
          }
          fileLinker = null;
        }
      },
      CallExpression(call) {
        if (fileLinker === null) {
          return;
        }
        try {
          const calleeName = getCalleeName(call);
          if (calleeName === null) {
            return;
          }
          const args = call.node.arguments;
          if (!fileLinker.isPartialDeclaration(calleeName) || !isExpressionArray(args)) {
            return;
          }
          const declarationScope = new BabelDeclarationScope(call.scope);
          const replacement = fileLinker.linkPartialDeclaration(calleeName, args, declarationScope);
          call.replaceWith(replacement);
        } catch (e) {
          const node = isFatalLinkerError(e) ? e.node : call.node;
          throw buildCodeFrameError(call.hub.file, e.message, node);
        }
      }
    }
  };
}
function insertStatements(path, statements) {
  if (path.isFunction()) {
    insertIntoFunction(path, statements);
  } else if (path.isProgram()) {
    insertIntoProgram(path, statements);
  }
}
function insertIntoFunction(fn, statements) {
  const body = fn.get("body");
  body.unshiftContainer("body", statements);
}
function insertIntoProgram(program, statements) {
  const body = program.get("body");
  const importStatements = body.filter((statement) => statement.isImportDeclaration());
  if (importStatements.length === 0) {
    program.unshiftContainer("body", statements);
  } else {
    importStatements[importStatements.length - 1].insertAfter(statements);
  }
}
function getCalleeName(call) {
  const callee = call.node.callee;
  if (types.isIdentifier(callee)) {
    return callee.name;
  } else if (types.isMemberExpression(callee) && types.isIdentifier(callee.property)) {
    return callee.property.name;
  } else if (types.isMemberExpression(callee) && types.isStringLiteral(callee.property)) {
    return callee.property.value;
  } else {
    return null;
  }
}
function isExpressionArray(nodes) {
  return nodes.every((node) => types.isExpression(node));
}
function assertNull(obj) {
  if (obj !== null) {
    throw new Error("BUG - expected `obj` to be null");
  }
}
function assertNotNull(obj) {
  if (obj === null) {
    throw new Error("BUG - expected `obj` not to be null");
  }
}
function buildCodeFrameError(file, message, node) {
  const filename = file.opts.filename || "(unknown file)";
  const error = file.buildCodeFrameError(node, message);
  return `${filename}: ${error.message}`;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/babel/src/babel_plugin.mjs
function defaultLinkerPlugin(api, options) {
  api.assertVersion(7);
  return createEs2015LinkerPlugin(__spreadProps(__spreadValues({}, options), {
    fileSystem: new NodeJSFileSystem(),
    logger: new ConsoleLogger(LogLevel.info)
  }));
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/linker/babel/index.mjs
var babel_default = defaultLinkerPlugin;
export {
  createEs2015LinkerPlugin,
  babel_default as default
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
//# sourceMappingURL=index.js.map
