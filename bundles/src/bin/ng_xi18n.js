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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/bin/ng_xi18n.mjs
import "reflect-metadata";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/file_system/src/compiler_host.mjs
import {
  EOL
} from "os";
import ts from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/file_system/src/invalid_file_system.mjs
var InvalidFileSystem = class {
  exists(path8) {
    throw makeError();
  }
  readFile(path8) {
    throw makeError();
  }
  readFileBuffer(path8) {
    throw makeError();
  }
  writeFile(path8, data, exclusive) {
    throw makeError();
  }
  removeFile(path8) {
    throw makeError();
  }
  symlink(target, path8) {
    throw makeError();
  }
  readdir(path8) {
    throw makeError();
  }
  lstat(path8) {
    throw makeError();
  }
  stat(path8) {
    throw makeError();
  }
  pwd() {
    throw makeError();
  }
  chdir(path8) {
    throw makeError();
  }
  extname(path8) {
    throw makeError();
  }
  copyFile(from, to) {
    throw makeError();
  }
  moveFile(from, to) {
    throw makeError();
  }
  ensureDir(path8) {
    throw makeError();
  }
  removeDeep(path8) {
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
  isRoot(path8) {
    throw makeError();
  }
  isRooted(path8) {
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
  normalize(path8) {
    throw makeError();
  }
};
function makeError() {
  return new Error("FileSystem has not been configured. Please call `setFileSystem()` before calling this method.");
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/file_system/src/util.mjs
var TS_DTS_JS_EXTENSION = /(?:\.d)?\.ts$|\.js$/;
function stripExtension(path8) {
  return path8.replace(TS_DTS_JS_EXTENSION, "");
}
function getSourceFileOrError(program, fileName) {
  const sf = program.getSourceFile(fileName);
  if (sf === void 0) {
    throw new Error(`Program does not contain "${fileName}" - available files are ${program.getSourceFiles().map((sf2) => sf2.fileName).join(", ")}`);
  }
  return sf;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/file_system/src/helpers.mjs
var fs = new InvalidFileSystem();
function getFileSystem() {
  return fs;
}
function setFileSystem(fileSystem) {
  fs = fileSystem;
}
function absoluteFrom(path8) {
  if (!fs.isRooted(path8)) {
    throw new Error(`Internal Error: absoluteFrom(${path8}): path is not absolute`);
  }
  return fs.resolve(path8);
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
function join(basePath, ...paths) {
  return fs.join(basePath, ...paths);
}
function resolve(basePath, ...paths) {
  return fs.resolve(basePath, ...paths);
}
function isRooted(path8) {
  return fs.isRooted(path8);
}
function relative(from, to) {
  return fs.relative(from, to);
}
function basename(filePath, extension) {
  return fs.basename(filePath, extension);
}
function isLocalRelativePath(relativePath) {
  return !isRooted(relativePath) && !relativePath.startsWith("..");
}
function toRelativeImport(relativePath) {
  return isLocalRelativePath(relativePath) ? `./${relativePath}` : relativePath;
}

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
function isWithinBasePath(base, path8) {
  return isLocalRelativePath(relative(base, path8));
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
  basename as basename2,
  dirname as dirname2,
  extname,
  isAbsolute,
  join as join2,
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
    return this.normalize(join2(basePath, ...paths));
  }
  isRoot(path8) {
    return this.dirname(path8) === this.normalize(path8);
  }
  isRooted(path8) {
    return isAbsolute(path8);
  }
  relative(from, to) {
    return this.normalize(relative2(from, to));
  }
  basename(filePath, extension) {
    return basename2(filePath, extension);
  }
  extname(path8) {
    return extname(path8);
  }
  normalize(path8) {
    return path8.replace(/\\/g, "/");
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
  exists(path8) {
    return existsSync(path8);
  }
  readFile(path8) {
    return readFileSync(path8, "utf8");
  }
  readFileBuffer(path8) {
    return readFileSync(path8);
  }
  readdir(path8) {
    return readdirSync(path8);
  }
  lstat(path8) {
    return lstatSync(path8);
  }
  stat(path8) {
    return statSync(path8);
  }
  realpath(path8) {
    return this.resolve(realpathSync(path8));
  }
  getDefaultLibLocation() {
    const requireFn = isCommonJS ? __require : module.createRequire(currentFileUrl);
    return this.resolve(requireFn.resolve("typescript"), "..");
  }
};
var NodeJSFileSystem = class extends NodeJSReadonlyFileSystem {
  writeFile(path8, data, exclusive = false) {
    writeFileSync(path8, data, exclusive ? { flag: "wx" } : void 0);
  }
  removeFile(path8) {
    unlinkSync(path8);
  }
  symlink(target, path8) {
    symlinkSync(target, path8);
  }
  copyFile(from, to) {
    copyFileSync(from, to);
  }
  moveFile(from, to) {
    renameSync(from, to);
  }
  ensureDir(path8) {
    const parents = [];
    while (!this.isRoot(path8) && !this.exists(path8)) {
      parents.push(path8);
      path8 = this.dirname(path8);
    }
    while (parents.length) {
      this.safeMkdir(parents.pop());
    }
  }
  removeDeep(path8) {
    rmdirSync(path8, { recursive: true });
  }
  safeMkdir(path8) {
    try {
      mkdirSync(path8);
    } catch (err) {
      if (!this.exists(path8) || !this.stat(path8).isDirectory()) {
        throw err;
      }
    }
  }
};
function toggleCase(str) {
  return str.replace(/\w/g, (ch) => ch.toUpperCase() === ch ? ch.toLowerCase() : ch.toUpperCase());
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/extract_i18n.mjs
import yargs2 from "yargs";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/main.mjs
import ts87 from "typescript";
import yargs from "yargs";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/perform_compile.mjs
import { isSyntaxError as isSyntaxError2 } from "@angular/compiler";
import ts85 from "typescript";

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
import ts2 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/diagnostics/src/util.mjs
var ERROR_CODE_MATCHER = /(\u001b\[\d+m ?)TS-99(\d+: ?\u001b\[\d+m)/g;
function replaceTsWithNgInErrors(errors) {
  return errors.replace(ERROR_CODE_MATCHER, "$1NG$2");
}
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
  node = ts2.getOriginalNode(node);
  return {
    category: ts2.DiagnosticCategory.Error,
    code: ngErrorCode(code),
    file: ts2.getOriginalNode(node).getSourceFile(),
    start: node.getStart(void 0, false),
    length: node.getWidth(),
    messageText,
    relatedInformation
  };
}
function makeRelatedInformation(node, messageText) {
  node = ts2.getOriginalNode(node);
  return {
    category: ts2.DiagnosticCategory.Message,
    code: 0,
    file: node.getSourceFile(),
    start: node.getStart(),
    length: node.getWidth(),
    messageText
  };
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/diagnostics/src/error_details_base_url.mjs
var ERROR_DETAILS_PAGE_BASE_URL = "https://angular.io/errors";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/api.mjs
var DEFAULT_ERROR_CODE = 100;
var UNKNOWN_ERROR_CODE = 500;
var SOURCE = "angular";
function isTsDiagnostic(diagnostic) {
  return diagnostic != null && diagnostic.source !== "angular";
}
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
import ts9 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/metadata/collector.mjs
import ts5 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/metadata/evaluator.mjs
import ts3 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/metadata/schema.mjs
var METADATA_VERSION = 4;
function isClassMetadata(value) {
  return value && value.__symbolic === "class";
}
function isInterfaceMetadata(value) {
  return value && value.__symbolic === "interface";
}
function isMethodMetadata(value) {
  return value && (value.__symbolic === "constructor" || value.__symbolic === "method");
}
function isConstructorMetadata(value) {
  return value && value.__symbolic === "constructor";
}
function isFunctionMetadata(value) {
  return value && value.__symbolic === "function";
}
function isMetadataSymbolicExpression(value) {
  if (value) {
    switch (value.__symbolic) {
      case "binary":
      case "call":
      case "index":
      case "new":
      case "pre":
      case "reference":
      case "select":
      case "spread":
      case "if":
        return true;
    }
  }
  return false;
}
function isMetadataSymbolicCallExpression(value) {
  return value && (value.__symbolic === "call" || value.__symbolic === "new");
}
function isMetadataGlobalReferenceExpression(value) {
  return value && value.name && !value.module && isMetadataSymbolicReferenceExpression(value);
}
function isMetadataModuleReferenceExpression(value) {
  return value && value.module && !value.name && !value.default && isMetadataSymbolicReferenceExpression(value);
}
function isMetadataImportedSymbolReferenceExpression(value) {
  return value && value.module && !!value.name && isMetadataSymbolicReferenceExpression(value);
}
function isMetadataImportDefaultReference(value) {
  return value && value.module && value.default && isMetadataSymbolicReferenceExpression(value);
}
function isMetadataSymbolicReferenceExpression(value) {
  return value && value.__symbolic === "reference";
}
function isMetadataSymbolicSelectExpression(value) {
  return value && value.__symbolic === "select";
}
function isMetadataSymbolicSpreadExpression(value) {
  return value && value.__symbolic === "spread";
}
function isMetadataError(value) {
  return value && value.__symbolic === "error";
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/metadata/evaluator.mjs
var spreadElementSyntaxKind = ts3.SyntaxKind.SpreadElement || ts3.SyntaxKind.SpreadElementExpression;
function isMethodCallOf(callExpression, memberName) {
  const expression = callExpression.expression;
  if (expression.kind === ts3.SyntaxKind.PropertyAccessExpression) {
    const propertyAccessExpression = expression;
    const name = propertyAccessExpression.name;
    if (name.kind == ts3.SyntaxKind.Identifier) {
      return name.text === memberName;
    }
  }
  return false;
}
function isCallOf(callExpression, ident) {
  const expression = callExpression.expression;
  if (expression.kind === ts3.SyntaxKind.Identifier) {
    const identifier = expression;
    return identifier.text === ident;
  }
  return false;
}
function recordMapEntry(entry, node, nodeMap, sourceFile) {
  if (!nodeMap.has(entry)) {
    nodeMap.set(entry, node);
    if (node && (isMetadataImportedSymbolReferenceExpression(entry) || isMetadataImportDefaultReference(entry)) && entry.line == null) {
      const info = sourceInfo(node, sourceFile);
      if (info.line != null)
        entry.line = info.line;
      if (info.character != null)
        entry.character = info.character;
    }
  }
  return entry;
}
function everyNodeChild(node, cb) {
  return !ts3.forEachChild(node, (node2) => !cb(node2));
}
function isPrimitive(value) {
  return Object(value) !== value;
}
function isDefined(obj) {
  return obj !== void 0;
}
function getSourceFileOfNode(node) {
  while (node && node.kind != ts3.SyntaxKind.SourceFile) {
    node = node.parent;
  }
  return node;
}
function sourceInfo(node, sourceFile) {
  if (node) {
    sourceFile = sourceFile || getSourceFileOfNode(node);
    if (sourceFile) {
      return ts3.getLineAndCharacterOfPosition(sourceFile, node.getStart(sourceFile));
    }
  }
  return {};
}
function errorSymbol(message, node, context, sourceFile) {
  const result = __spreadValues({ __symbolic: "error", message }, sourceInfo(node, sourceFile));
  if (context) {
    result.context = context;
  }
  return result;
}
var Evaluator = class {
  constructor(symbols, nodeMap, options = {}, recordExport) {
    this.symbols = symbols;
    this.nodeMap = nodeMap;
    this.options = options;
    this.recordExport = recordExport;
  }
  nameOf(node) {
    if (node && node.kind == ts3.SyntaxKind.Identifier) {
      return node.text;
    }
    const result = node && this.evaluateNode(node);
    if (isMetadataError(result) || typeof result === "string") {
      return result;
    } else {
      return errorSymbol("Name expected", node, { received: node && node.getText() || "<missing>" });
    }
  }
  isFoldable(node) {
    return this.isFoldableWorker(node, new Map());
  }
  isFoldableWorker(node, folding) {
    if (node) {
      switch (node.kind) {
        case ts3.SyntaxKind.ObjectLiteralExpression:
          return everyNodeChild(node, (child) => {
            if (child.kind === ts3.SyntaxKind.PropertyAssignment) {
              const propertyAssignment = child;
              return this.isFoldableWorker(propertyAssignment.initializer, folding);
            }
            return false;
          });
        case ts3.SyntaxKind.ArrayLiteralExpression:
          return everyNodeChild(node, (child) => this.isFoldableWorker(child, folding));
        case ts3.SyntaxKind.CallExpression:
          const callExpression = node;
          if (isMethodCallOf(callExpression, "concat") && arrayOrEmpty(callExpression.arguments).length === 1) {
            const arrayNode = callExpression.expression.expression;
            if (this.isFoldableWorker(arrayNode, folding) && this.isFoldableWorker(callExpression.arguments[0], folding)) {
              const arrayValue = this.evaluateNode(arrayNode);
              if (arrayValue && Array.isArray(arrayValue)) {
                return true;
              }
            }
          }
          if (isCallOf(callExpression, "CONST_EXPR") && arrayOrEmpty(callExpression.arguments).length === 1)
            return this.isFoldableWorker(callExpression.arguments[0], folding);
          return false;
        case ts3.SyntaxKind.NoSubstitutionTemplateLiteral:
        case ts3.SyntaxKind.StringLiteral:
        case ts3.SyntaxKind.NumericLiteral:
        case ts3.SyntaxKind.NullKeyword:
        case ts3.SyntaxKind.TrueKeyword:
        case ts3.SyntaxKind.FalseKeyword:
        case ts3.SyntaxKind.TemplateHead:
        case ts3.SyntaxKind.TemplateMiddle:
        case ts3.SyntaxKind.TemplateTail:
          return true;
        case ts3.SyntaxKind.ParenthesizedExpression:
          const parenthesizedExpression = node;
          return this.isFoldableWorker(parenthesizedExpression.expression, folding);
        case ts3.SyntaxKind.BinaryExpression:
          const binaryExpression = node;
          switch (binaryExpression.operatorToken.kind) {
            case ts3.SyntaxKind.PlusToken:
            case ts3.SyntaxKind.MinusToken:
            case ts3.SyntaxKind.AsteriskToken:
            case ts3.SyntaxKind.SlashToken:
            case ts3.SyntaxKind.PercentToken:
            case ts3.SyntaxKind.AmpersandAmpersandToken:
            case ts3.SyntaxKind.BarBarToken:
              return this.isFoldableWorker(binaryExpression.left, folding) && this.isFoldableWorker(binaryExpression.right, folding);
            default:
              return false;
          }
        case ts3.SyntaxKind.PropertyAccessExpression:
          const propertyAccessExpression = node;
          return this.isFoldableWorker(propertyAccessExpression.expression, folding);
        case ts3.SyntaxKind.ElementAccessExpression:
          const elementAccessExpression = node;
          return this.isFoldableWorker(elementAccessExpression.expression, folding) && this.isFoldableWorker(elementAccessExpression.argumentExpression, folding);
        case ts3.SyntaxKind.Identifier:
          let identifier = node;
          let reference = this.symbols.resolve(identifier.text);
          if (reference !== void 0 && isPrimitive(reference)) {
            return true;
          }
          break;
        case ts3.SyntaxKind.TemplateExpression:
          const templateExpression = node;
          return templateExpression.templateSpans.every((span) => this.isFoldableWorker(span.expression, folding));
      }
    }
    return false;
  }
  evaluateNode(node, preferReference) {
    const t = this;
    let error2;
    function recordEntry(entry, node2) {
      if (t.options.substituteExpression) {
        const newEntry = t.options.substituteExpression(entry, node2);
        if (t.recordExport && newEntry != entry && isMetadataGlobalReferenceExpression(newEntry)) {
          t.recordExport(newEntry.name, entry);
        }
        entry = newEntry;
      }
      return recordMapEntry(entry, node2, t.nodeMap);
    }
    function isFoldableError(value) {
      return !t.options.verboseInvalidExpression && isMetadataError(value);
    }
    const resolveName = (name, preferReference2) => {
      const reference = this.symbols.resolve(name, preferReference2);
      if (reference === void 0) {
        return recordEntry({ __symbolic: "reference", name }, node);
      }
      if (reference && isMetadataSymbolicReferenceExpression(reference)) {
        return recordEntry(__spreadValues({}, reference), node);
      }
      return reference;
    };
    switch (node.kind) {
      case ts3.SyntaxKind.ObjectLiteralExpression:
        let obj = {};
        let quoted = [];
        ts3.forEachChild(node, (child) => {
          switch (child.kind) {
            case ts3.SyntaxKind.ShorthandPropertyAssignment:
            case ts3.SyntaxKind.PropertyAssignment:
              const assignment = child;
              if (assignment.name.kind == ts3.SyntaxKind.StringLiteral) {
                const name2 = assignment.name.text;
                quoted.push(name2);
              }
              const propertyName = this.nameOf(assignment.name);
              if (isFoldableError(propertyName)) {
                error2 = propertyName;
                return true;
              }
              const propertyValue = isPropertyAssignment(assignment) ? this.evaluateNode(assignment.initializer, true) : resolveName(propertyName, true);
              if (isFoldableError(propertyValue)) {
                error2 = propertyValue;
                return true;
              } else {
                obj[propertyName] = isPropertyAssignment(assignment) ? recordEntry(propertyValue, assignment.initializer) : propertyValue;
              }
          }
        });
        if (error2)
          return error2;
        if (this.options.quotedNames && quoted.length) {
          obj["$quoted$"] = quoted;
        }
        return recordEntry(obj, node);
      case ts3.SyntaxKind.ArrayLiteralExpression:
        let arr = [];
        ts3.forEachChild(node, (child) => {
          const value = this.evaluateNode(child, true);
          if (isFoldableError(value)) {
            error2 = value;
            return true;
          }
          if (isMetadataSymbolicSpreadExpression(value)) {
            if (Array.isArray(value.expression)) {
              for (const spreadValue of value.expression) {
                arr.push(spreadValue);
              }
              return;
            }
          }
          arr.push(value);
        });
        if (error2)
          return error2;
        return recordEntry(arr, node);
      case spreadElementSyntaxKind:
        let spreadExpression = this.evaluateNode(node.expression);
        return recordEntry({ __symbolic: "spread", expression: spreadExpression }, node);
      case ts3.SyntaxKind.CallExpression:
        const callExpression = node;
        if (isCallOf(callExpression, "forwardRef") && arrayOrEmpty(callExpression.arguments).length === 1) {
          const firstArgument = callExpression.arguments[0];
          if (firstArgument.kind == ts3.SyntaxKind.ArrowFunction) {
            const arrowFunction = firstArgument;
            return recordEntry(this.evaluateNode(arrowFunction.body), node);
          }
        }
        const args2 = arrayOrEmpty(callExpression.arguments).map((arg) => this.evaluateNode(arg));
        if (this.isFoldable(callExpression)) {
          if (isMethodCallOf(callExpression, "concat")) {
            const arrayValue = this.evaluateNode(callExpression.expression.expression);
            if (isFoldableError(arrayValue))
              return arrayValue;
            return arrayValue.concat(args2[0]);
          }
        }
        if (isCallOf(callExpression, "CONST_EXPR") && arrayOrEmpty(callExpression.arguments).length === 1) {
          return recordEntry(args2[0], node);
        }
        const expression = this.evaluateNode(callExpression.expression);
        if (isFoldableError(expression)) {
          return recordEntry(expression, node);
        }
        let result = { __symbolic: "call", expression };
        if (args2 && args2.length) {
          result.arguments = args2;
        }
        return recordEntry(result, node);
      case ts3.SyntaxKind.NewExpression:
        const newExpression = node;
        const newArgs = arrayOrEmpty(newExpression.arguments).map((arg) => this.evaluateNode(arg));
        const newTarget = this.evaluateNode(newExpression.expression);
        if (isMetadataError(newTarget)) {
          return recordEntry(newTarget, node);
        }
        const call = { __symbolic: "new", expression: newTarget };
        if (newArgs.length) {
          call.arguments = newArgs;
        }
        return recordEntry(call, node);
      case ts3.SyntaxKind.PropertyAccessExpression: {
        const propertyAccessExpression = node;
        const expression2 = this.evaluateNode(propertyAccessExpression.expression);
        if (isFoldableError(expression2)) {
          return recordEntry(expression2, node);
        }
        const member = this.nameOf(propertyAccessExpression.name);
        if (isFoldableError(member)) {
          return recordEntry(member, node);
        }
        if (expression2 && this.isFoldable(propertyAccessExpression.expression))
          return expression2[member];
        if (isMetadataModuleReferenceExpression(expression2)) {
          return recordEntry({ __symbolic: "reference", module: expression2.module, name: member }, node);
        }
        return recordEntry({ __symbolic: "select", expression: expression2, member }, node);
      }
      case ts3.SyntaxKind.ElementAccessExpression: {
        const elementAccessExpression = node;
        const expression2 = this.evaluateNode(elementAccessExpression.expression);
        if (isFoldableError(expression2)) {
          return recordEntry(expression2, node);
        }
        if (!elementAccessExpression.argumentExpression) {
          return recordEntry(errorSymbol("Expression form not supported", node), node);
        }
        const index = this.evaluateNode(elementAccessExpression.argumentExpression);
        if (isFoldableError(expression2)) {
          return recordEntry(expression2, node);
        }
        if (this.isFoldable(elementAccessExpression.expression) && this.isFoldable(elementAccessExpression.argumentExpression))
          return expression2[index];
        return recordEntry({ __symbolic: "index", expression: expression2, index }, node);
      }
      case ts3.SyntaxKind.Identifier:
        const identifier = node;
        const name = identifier.text;
        return resolveName(name, preferReference);
      case ts3.SyntaxKind.TypeReference:
        const typeReferenceNode = node;
        const typeNameNode = typeReferenceNode.typeName;
        const getReference = (node2) => {
          if (typeNameNode.kind === ts3.SyntaxKind.QualifiedName) {
            const qualifiedName = node2;
            const left2 = this.evaluateNode(qualifiedName.left);
            if (isMetadataModuleReferenceExpression(left2)) {
              return recordEntry({
                __symbolic: "reference",
                module: left2.module,
                name: qualifiedName.right.text
              }, node2);
            }
            return { __symbolic: "select", expression: left2, member: qualifiedName.right.text };
          } else {
            const identifier2 = typeNameNode;
            const symbol = this.symbols.resolve(identifier2.text);
            if (isFoldableError(symbol) || isMetadataSymbolicReferenceExpression(symbol)) {
              return recordEntry(symbol, node2);
            }
            return recordEntry(errorSymbol("Could not resolve type", node2, { typeName: identifier2.text }), node2);
          }
        };
        const typeReference = getReference(typeNameNode);
        if (isFoldableError(typeReference)) {
          return recordEntry(typeReference, node);
        }
        if (!isMetadataModuleReferenceExpression(typeReference) && typeReferenceNode.typeArguments && typeReferenceNode.typeArguments.length) {
          const args3 = typeReferenceNode.typeArguments.map((element) => this.evaluateNode(element));
          typeReference.arguments = args3;
        }
        return recordEntry(typeReference, node);
      case ts3.SyntaxKind.UnionType:
        const unionType = node;
        const references = unionType.types.filter((n) => n.kind !== ts3.SyntaxKind.UndefinedKeyword && !(ts3.isLiteralTypeNode(n) && n.literal.kind === ts3.SyntaxKind.NullKeyword)).map((n) => this.evaluateNode(n));
        let candidate = null;
        for (let i = 0; i < references.length; i++) {
          const reference = references[i];
          if (isMetadataSymbolicReferenceExpression(reference)) {
            if (candidate) {
              if (reference.name == candidate.name && reference.module == candidate.module && !reference.arguments) {
                candidate = reference;
              }
            } else {
              candidate = reference;
            }
          } else {
            return reference;
          }
        }
        if (candidate)
          return candidate;
        break;
      case ts3.SyntaxKind.NoSubstitutionTemplateLiteral:
      case ts3.SyntaxKind.StringLiteral:
      case ts3.SyntaxKind.TemplateHead:
      case ts3.SyntaxKind.TemplateTail:
      case ts3.SyntaxKind.TemplateMiddle:
        return node.text;
      case ts3.SyntaxKind.NumericLiteral:
        return parseFloat(node.text);
      case ts3.SyntaxKind.AnyKeyword:
        return recordEntry({ __symbolic: "reference", name: "any" }, node);
      case ts3.SyntaxKind.StringKeyword:
        return recordEntry({ __symbolic: "reference", name: "string" }, node);
      case ts3.SyntaxKind.NumberKeyword:
        return recordEntry({ __symbolic: "reference", name: "number" }, node);
      case ts3.SyntaxKind.BooleanKeyword:
        return recordEntry({ __symbolic: "reference", name: "boolean" }, node);
      case ts3.SyntaxKind.ArrayType:
        const arrayTypeNode = node;
        return recordEntry({
          __symbolic: "reference",
          name: "Array",
          arguments: [this.evaluateNode(arrayTypeNode.elementType)]
        }, node);
      case ts3.SyntaxKind.NullKeyword:
        return null;
      case ts3.SyntaxKind.TrueKeyword:
        return true;
      case ts3.SyntaxKind.FalseKeyword:
        return false;
      case ts3.SyntaxKind.ParenthesizedExpression:
        const parenthesizedExpression = node;
        return this.evaluateNode(parenthesizedExpression.expression);
      case ts3.SyntaxKind.TypeAssertionExpression:
        const typeAssertion = node;
        return this.evaluateNode(typeAssertion.expression);
      case ts3.SyntaxKind.PrefixUnaryExpression:
        const prefixUnaryExpression = node;
        const operand = this.evaluateNode(prefixUnaryExpression.operand);
        if (isDefined(operand) && isPrimitive(operand)) {
          switch (prefixUnaryExpression.operator) {
            case ts3.SyntaxKind.PlusToken:
              return +operand;
            case ts3.SyntaxKind.MinusToken:
              return -operand;
            case ts3.SyntaxKind.TildeToken:
              return ~operand;
            case ts3.SyntaxKind.ExclamationToken:
              return !operand;
          }
        }
        let operatorText;
        switch (prefixUnaryExpression.operator) {
          case ts3.SyntaxKind.PlusToken:
            operatorText = "+";
            break;
          case ts3.SyntaxKind.MinusToken:
            operatorText = "-";
            break;
          case ts3.SyntaxKind.TildeToken:
            operatorText = "~";
            break;
          case ts3.SyntaxKind.ExclamationToken:
            operatorText = "!";
            break;
          default:
            return void 0;
        }
        return recordEntry({ __symbolic: "pre", operator: operatorText, operand }, node);
      case ts3.SyntaxKind.BinaryExpression:
        const binaryExpression = node;
        const left = this.evaluateNode(binaryExpression.left);
        const right = this.evaluateNode(binaryExpression.right);
        if (isDefined(left) && isDefined(right)) {
          if (isPrimitive(left) && isPrimitive(right))
            switch (binaryExpression.operatorToken.kind) {
              case ts3.SyntaxKind.BarBarToken:
                return left || right;
              case ts3.SyntaxKind.AmpersandAmpersandToken:
                return left && right;
              case ts3.SyntaxKind.AmpersandToken:
                return left & right;
              case ts3.SyntaxKind.BarToken:
                return left | right;
              case ts3.SyntaxKind.CaretToken:
                return left ^ right;
              case ts3.SyntaxKind.EqualsEqualsToken:
                return left == right;
              case ts3.SyntaxKind.ExclamationEqualsToken:
                return left != right;
              case ts3.SyntaxKind.EqualsEqualsEqualsToken:
                return left === right;
              case ts3.SyntaxKind.ExclamationEqualsEqualsToken:
                return left !== right;
              case ts3.SyntaxKind.LessThanToken:
                return left < right;
              case ts3.SyntaxKind.GreaterThanToken:
                return left > right;
              case ts3.SyntaxKind.LessThanEqualsToken:
                return left <= right;
              case ts3.SyntaxKind.GreaterThanEqualsToken:
                return left >= right;
              case ts3.SyntaxKind.LessThanLessThanToken:
                return left << right;
              case ts3.SyntaxKind.GreaterThanGreaterThanToken:
                return left >> right;
              case ts3.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
                return left >>> right;
              case ts3.SyntaxKind.PlusToken:
                return left + right;
              case ts3.SyntaxKind.MinusToken:
                return left - right;
              case ts3.SyntaxKind.AsteriskToken:
                return left * right;
              case ts3.SyntaxKind.SlashToken:
                return left / right;
              case ts3.SyntaxKind.PercentToken:
                return left % right;
            }
          return recordEntry({
            __symbolic: "binop",
            operator: binaryExpression.operatorToken.getText(),
            left,
            right
          }, node);
        }
        break;
      case ts3.SyntaxKind.ConditionalExpression:
        const conditionalExpression = node;
        const condition = this.evaluateNode(conditionalExpression.condition);
        const thenExpression = this.evaluateNode(conditionalExpression.whenTrue);
        const elseExpression = this.evaluateNode(conditionalExpression.whenFalse);
        if (isPrimitive(condition)) {
          return condition ? thenExpression : elseExpression;
        }
        return recordEntry({ __symbolic: "if", condition, thenExpression, elseExpression }, node);
      case ts3.SyntaxKind.FunctionExpression:
      case ts3.SyntaxKind.ArrowFunction:
        return recordEntry(errorSymbol("Lambda not supported", node), node);
      case ts3.SyntaxKind.TaggedTemplateExpression:
        return recordEntry(errorSymbol("Tagged template expressions are not supported in metadata", node), node);
      case ts3.SyntaxKind.TemplateExpression:
        const templateExpression = node;
        if (this.isFoldable(node)) {
          return templateExpression.templateSpans.reduce((previous, current) => previous + this.evaluateNode(current.expression) + this.evaluateNode(current.literal), this.evaluateNode(templateExpression.head));
        } else {
          return templateExpression.templateSpans.reduce((previous, current) => {
            const expr = this.evaluateNode(current.expression);
            const literal2 = this.evaluateNode(current.literal);
            if (isFoldableError(expr))
              return expr;
            if (isFoldableError(literal2))
              return literal2;
            if (typeof previous === "string" && typeof expr === "string" && typeof literal2 === "string") {
              return previous + expr + literal2;
            }
            let result2 = expr;
            if (previous !== "") {
              result2 = { __symbolic: "binop", operator: "+", left: previous, right: expr };
            }
            if (literal2 != "") {
              result2 = { __symbolic: "binop", operator: "+", left: result2, right: literal2 };
            }
            return result2;
          }, this.evaluateNode(templateExpression.head));
        }
      case ts3.SyntaxKind.AsExpression:
        const asExpression = node;
        return this.evaluateNode(asExpression.expression);
      case ts3.SyntaxKind.ClassExpression:
        return { __symbolic: "class" };
    }
    return recordEntry(errorSymbol("Expression form not supported", node), node);
  }
};
function isPropertyAssignment(node) {
  return node.kind == ts3.SyntaxKind.PropertyAssignment;
}
var empty = ts3.createNodeArray();
function arrayOrEmpty(v) {
  return v || empty;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/metadata/symbols.mjs
import ts4 from "typescript";
var Symbols = class {
  constructor(sourceFile) {
    this.sourceFile = sourceFile;
    this.references = new Map();
  }
  resolve(name, preferReference) {
    return preferReference && this.references.get(name) || this.symbols.get(name);
  }
  define(name, value) {
    this.symbols.set(name, value);
  }
  defineReference(name, value) {
    this.references.set(name, value);
  }
  has(name) {
    return this.symbols.has(name);
  }
  get symbols() {
    let result = this._symbols;
    if (!result) {
      result = this._symbols = new Map();
      populateBuiltins(result);
      this.buildImports();
    }
    return result;
  }
  buildImports() {
    const symbols = this._symbols;
    const stripQuotes = (s) => s.replace(/^['"]|['"]$/g, "");
    const visit2 = (node) => {
      switch (node.kind) {
        case ts4.SyntaxKind.ImportEqualsDeclaration:
          const importEqualsDeclaration = node;
          if (importEqualsDeclaration.moduleReference.kind === ts4.SyntaxKind.ExternalModuleReference) {
            const externalReference = importEqualsDeclaration.moduleReference;
            if (externalReference.expression) {
              if (!externalReference.expression.parent) {
                externalReference.expression.parent = externalReference;
                externalReference.parent = this.sourceFile;
              }
              const from2 = stripQuotes(externalReference.expression.getText());
              symbols.set(importEqualsDeclaration.name.text, { __symbolic: "reference", module: from2 });
              break;
            }
          }
          symbols.set(importEqualsDeclaration.name.text, { __symbolic: "error", message: `Unsupported import syntax` });
          break;
        case ts4.SyntaxKind.ImportDeclaration:
          const importDecl = node;
          if (!importDecl.importClause) {
            break;
          }
          if (!importDecl.moduleSpecifier.parent) {
            importDecl.moduleSpecifier.parent = importDecl;
            importDecl.parent = this.sourceFile;
          }
          const from = stripQuotes(importDecl.moduleSpecifier.getText());
          if (importDecl.importClause.name) {
            symbols.set(importDecl.importClause.name.text, { __symbolic: "reference", module: from, default: true });
          }
          const bindings = importDecl.importClause.namedBindings;
          if (bindings) {
            switch (bindings.kind) {
              case ts4.SyntaxKind.NamedImports:
                for (const binding of bindings.elements) {
                  symbols.set(binding.name.text, {
                    __symbolic: "reference",
                    module: from,
                    name: binding.propertyName ? binding.propertyName.text : binding.name.text
                  });
                }
                break;
              case ts4.SyntaxKind.NamespaceImport:
                symbols.set(bindings.name.text, { __symbolic: "reference", module: from });
                break;
            }
          }
          break;
      }
      ts4.forEachChild(node, visit2);
    };
    if (this.sourceFile) {
      ts4.forEachChild(this.sourceFile, visit2);
    }
  }
};
function populateBuiltins(symbols) {
  [
    "Object",
    "Function",
    "String",
    "Number",
    "Array",
    "Boolean",
    "Map",
    "NaN",
    "Infinity",
    "Math",
    "Date",
    "RegExp",
    "Error",
    "Error",
    "EvalError",
    "RangeError",
    "ReferenceError",
    "SyntaxError",
    "TypeError",
    "URIError",
    "JSON",
    "ArrayBuffer",
    "DataView",
    "Int8Array",
    "Uint8Array",
    "Uint8ClampedArray",
    "Uint16Array",
    "Int16Array",
    "Int32Array",
    "Uint32Array",
    "Float32Array",
    "Float64Array"
  ].forEach((name) => symbols.set(name, { __symbolic: "reference", name }));
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/metadata/collector.mjs
var isStatic = (node) => ts5.getCombinedModifierFlags(node) & ts5.ModifierFlags.Static;
var MetadataCollector = class {
  constructor(options = {}) {
    this.options = options;
  }
  getMetadata(sourceFile, strict = false, substituteExpression) {
    const locals = new Symbols(sourceFile);
    const nodeMap = new Map();
    const composedSubstituter = substituteExpression && this.options.substituteExpression ? (value, node) => this.options.substituteExpression(substituteExpression(value, node), node) : substituteExpression;
    const evaluatorOptions = substituteExpression ? __spreadProps(__spreadValues({}, this.options), { substituteExpression: composedSubstituter }) : this.options;
    let metadata;
    const evaluator = new Evaluator(locals, nodeMap, evaluatorOptions, (name, value) => {
      if (!metadata)
        metadata = {};
      metadata[name] = value;
    });
    let exports = void 0;
    function objFromDecorator(decoratorNode) {
      return evaluator.evaluateNode(decoratorNode.expression);
    }
    function recordEntry(entry, node) {
      if (composedSubstituter) {
        entry = composedSubstituter(entry, node);
      }
      return recordMapEntry(entry, node, nodeMap, sourceFile);
    }
    function errorSym(message, node, context) {
      return errorSymbol(message, node, context, sourceFile);
    }
    function maybeGetSimpleFunction(functionDeclaration) {
      if (functionDeclaration.name && functionDeclaration.name.kind == ts5.SyntaxKind.Identifier) {
        const nameNode = functionDeclaration.name;
        const functionName = nameNode.text;
        const functionBody = functionDeclaration.body;
        if (functionBody && functionBody.statements.length == 1) {
          const statement = functionBody.statements[0];
          if (statement.kind === ts5.SyntaxKind.ReturnStatement) {
            const returnStatement = statement;
            if (returnStatement.expression) {
              const func = {
                __symbolic: "function",
                parameters: namesOf(functionDeclaration.parameters),
                value: evaluator.evaluateNode(returnStatement.expression)
              };
              if (functionDeclaration.parameters.some((p2) => p2.initializer != null)) {
                func.defaults = functionDeclaration.parameters.map((p2) => p2.initializer && evaluator.evaluateNode(p2.initializer));
              }
              return recordEntry({ func, name: functionName }, functionDeclaration);
            }
          }
        }
      }
    }
    function classMetadataOf(classDeclaration) {
      const result = { __symbolic: "class" };
      function getDecorators(decorators) {
        if (decorators && decorators.length)
          return decorators.map((decorator) => objFromDecorator(decorator));
        return void 0;
      }
      function referenceFrom(node) {
        const result2 = evaluator.evaluateNode(node);
        if (isMetadataError(result2) || isMetadataSymbolicReferenceExpression(result2) || isMetadataSymbolicSelectExpression(result2)) {
          return result2;
        } else {
          return errorSym("Symbol reference expected", node);
        }
      }
      if (classDeclaration.heritageClauses) {
        classDeclaration.heritageClauses.forEach((hc) => {
          if (hc.token === ts5.SyntaxKind.ExtendsKeyword && hc.types) {
            hc.types.forEach((type) => result.extends = referenceFrom(type.expression));
          }
        });
      }
      const typeParameters = classDeclaration.typeParameters;
      if (typeParameters && typeParameters.length) {
        result.arity = typeParameters.length;
      }
      if (classDeclaration.decorators) {
        result.decorators = getDecorators(classDeclaration.decorators);
      }
      let members = null;
      function recordMember(name, metadata2) {
        if (!members)
          members = {};
        const data = members.hasOwnProperty(name) ? members[name] : [];
        data.push(metadata2);
        members[name] = data;
      }
      let statics = null;
      function recordStaticMember(name, value) {
        if (!statics)
          statics = {};
        statics[name] = value;
      }
      for (const member of classDeclaration.members) {
        let isConstructor = false;
        switch (member.kind) {
          case ts5.SyntaxKind.Constructor:
          case ts5.SyntaxKind.MethodDeclaration:
            isConstructor = member.kind === ts5.SyntaxKind.Constructor;
            const method = member;
            if (isStatic(method)) {
              const maybeFunc = maybeGetSimpleFunction(method);
              if (maybeFunc) {
                recordStaticMember(maybeFunc.name, maybeFunc.func);
              }
              continue;
            }
            const methodDecorators = getDecorators(method.decorators);
            const parameters = method.parameters;
            const parameterDecoratorData = [];
            const parametersData = [];
            let hasDecoratorData = false;
            let hasParameterData = false;
            for (const parameter of parameters) {
              const parameterData = getDecorators(parameter.decorators);
              parameterDecoratorData.push(parameterData);
              hasDecoratorData = hasDecoratorData || !!parameterData;
              if (isConstructor) {
                if (parameter.type) {
                  parametersData.push(referenceFrom(parameter.type));
                } else {
                  parametersData.push(null);
                }
                hasParameterData = true;
              }
            }
            const data = { __symbolic: isConstructor ? "constructor" : "method" };
            const name = isConstructor ? "__ctor__" : evaluator.nameOf(member.name);
            if (methodDecorators) {
              data.decorators = methodDecorators;
            }
            if (hasDecoratorData) {
              data.parameterDecorators = parameterDecoratorData;
            }
            if (hasParameterData) {
              data.parameters = parametersData;
            }
            if (!isMetadataError(name)) {
              recordMember(name, data);
            }
            break;
          case ts5.SyntaxKind.PropertyDeclaration:
          case ts5.SyntaxKind.GetAccessor:
          case ts5.SyntaxKind.SetAccessor:
            const property = member;
            if (isStatic(property)) {
              const name2 = evaluator.nameOf(property.name);
              if (!isMetadataError(name2) && !shouldIgnoreStaticMember(name2)) {
                if (property.initializer) {
                  const value = evaluator.evaluateNode(property.initializer);
                  recordStaticMember(name2, value);
                } else {
                  recordStaticMember(name2, errorSym("Variable not initialized", property.name));
                }
              }
            }
            const propertyDecorators = getDecorators(property.decorators);
            if (propertyDecorators) {
              const name2 = evaluator.nameOf(property.name);
              if (!isMetadataError(name2)) {
                recordMember(name2, { __symbolic: "property", decorators: propertyDecorators });
              }
            }
            break;
        }
      }
      if (members) {
        result.members = members;
      }
      if (statics) {
        result.statics = statics;
      }
      return recordEntry(result, classDeclaration);
    }
    const exportMap = new Map();
    ts5.forEachChild(sourceFile, (node) => {
      switch (node.kind) {
        case ts5.SyntaxKind.ExportDeclaration:
          const exportDeclaration = node;
          const { moduleSpecifier, exportClause } = exportDeclaration;
          if (!moduleSpecifier && exportClause && ts5.isNamedExports(exportClause)) {
            exportClause.elements.forEach((spec) => {
              const exportedAs = spec.name.text;
              const name = (spec.propertyName || spec.name).text;
              exportMap.set(name, exportedAs);
            });
          }
      }
    });
    const isExport = (node) => sourceFile.isDeclarationFile || ts5.getCombinedModifierFlags(node) & ts5.ModifierFlags.Export;
    const isExportedIdentifier = (identifier) => identifier && exportMap.has(identifier.text);
    const isExported3 = (node) => isExport(node) || isExportedIdentifier(node.name);
    const exportedIdentifierName = (identifier) => identifier && (exportMap.get(identifier.text) || identifier.text);
    const exportedName = (node) => exportedIdentifierName(node.name);
    ts5.forEachChild(sourceFile, (node) => {
      switch (node.kind) {
        case ts5.SyntaxKind.ClassDeclaration:
          const classDeclaration = node;
          if (classDeclaration.name) {
            const className = classDeclaration.name.text;
            if (isExported3(classDeclaration)) {
              locals.define(className, { __symbolic: "reference", name: exportedName(classDeclaration) });
            } else {
              locals.define(className, errorSym("Reference to non-exported class", node, { className }));
            }
          }
          break;
        case ts5.SyntaxKind.InterfaceDeclaration:
          const interfaceDeclaration = node;
          if (interfaceDeclaration.name) {
            const interfaceName = interfaceDeclaration.name.text;
            locals.define(interfaceName, { __symbolic: "reference", name: "any" });
          }
          break;
        case ts5.SyntaxKind.FunctionDeclaration:
          const functionDeclaration = node;
          if (!isExported3(functionDeclaration)) {
            const nameNode = functionDeclaration.name;
            if (nameNode && nameNode.text) {
              locals.define(nameNode.text, errorSym("Reference to a non-exported function", nameNode, { name: nameNode.text }));
            }
          }
          break;
      }
    });
    ts5.forEachChild(sourceFile, (node) => {
      switch (node.kind) {
        case ts5.SyntaxKind.ExportDeclaration:
          const exportDeclaration = node;
          const { moduleSpecifier, exportClause } = exportDeclaration;
          if (!moduleSpecifier) {
            if (exportClause && ts5.isNamedExports(exportClause)) {
              exportClause.elements.forEach((spec) => {
                const name = spec.name.text;
                if (!metadata || !metadata[name]) {
                  const propNode = spec.propertyName || spec.name;
                  const value = evaluator.evaluateNode(propNode);
                  if (!metadata)
                    metadata = {};
                  metadata[name] = recordEntry(value, node);
                }
              });
            }
          }
          if (moduleSpecifier && moduleSpecifier.kind == ts5.SyntaxKind.StringLiteral) {
            const from = moduleSpecifier.text;
            const moduleExport = { from };
            if (exportClause && ts5.isNamedExports(exportClause)) {
              moduleExport.export = exportClause.elements.map((spec) => spec.propertyName ? { name: spec.propertyName.text, as: spec.name.text } : spec.name.text);
            }
            if (!exports)
              exports = [];
            exports.push(moduleExport);
          }
          break;
        case ts5.SyntaxKind.ClassDeclaration:
          const classDeclaration = node;
          if (classDeclaration.name) {
            if (isExported3(classDeclaration)) {
              const name = exportedName(classDeclaration);
              if (name) {
                if (!metadata)
                  metadata = {};
                metadata[name] = classMetadataOf(classDeclaration);
              }
            }
          }
          break;
        case ts5.SyntaxKind.TypeAliasDeclaration:
          const typeDeclaration = node;
          if (typeDeclaration.name && isExported3(typeDeclaration)) {
            const name = exportedName(typeDeclaration);
            if (name) {
              if (!metadata)
                metadata = {};
              metadata[name] = { __symbolic: "interface" };
            }
          }
          break;
        case ts5.SyntaxKind.InterfaceDeclaration:
          const interfaceDeclaration = node;
          if (interfaceDeclaration.name && isExported3(interfaceDeclaration)) {
            const name = exportedName(interfaceDeclaration);
            if (name) {
              if (!metadata)
                metadata = {};
              metadata[name] = { __symbolic: "interface" };
            }
          }
          break;
        case ts5.SyntaxKind.FunctionDeclaration:
          const functionDeclaration = node;
          if (isExported3(functionDeclaration) && functionDeclaration.name) {
            const name = exportedName(functionDeclaration);
            const maybeFunc = maybeGetSimpleFunction(functionDeclaration);
            if (name) {
              if (!metadata)
                metadata = {};
              metadata[name] = maybeFunc ? recordEntry(maybeFunc.func, node) : { __symbolic: "function" };
            }
          }
          break;
        case ts5.SyntaxKind.EnumDeclaration:
          const enumDeclaration = node;
          if (isExported3(enumDeclaration)) {
            const enumValueHolder = {};
            const enumName = exportedName(enumDeclaration);
            let nextDefaultValue = 0;
            let writtenMembers = 0;
            for (const member of enumDeclaration.members) {
              let enumValue;
              if (!member.initializer) {
                enumValue = nextDefaultValue;
              } else {
                enumValue = evaluator.evaluateNode(member.initializer);
              }
              let name = void 0;
              if (member.name.kind == ts5.SyntaxKind.Identifier) {
                const identifier = member.name;
                name = identifier.text;
                enumValueHolder[name] = enumValue;
                writtenMembers++;
              }
              if (typeof enumValue === "number") {
                nextDefaultValue = enumValue + 1;
              } else if (name) {
                nextDefaultValue = {
                  __symbolic: "binary",
                  operator: "+",
                  left: {
                    __symbolic: "select",
                    expression: recordEntry({ __symbolic: "reference", name: enumName }, node),
                    name
                  }
                };
              } else {
                nextDefaultValue = recordEntry(errorSym("Unsupported enum member name", member.name), node);
              }
            }
            if (writtenMembers) {
              if (enumName) {
                if (!metadata)
                  metadata = {};
                metadata[enumName] = recordEntry(enumValueHolder, node);
              }
            }
          }
          break;
        case ts5.SyntaxKind.VariableStatement:
          const variableStatement = node;
          for (const variableDeclaration of variableStatement.declarationList.declarations) {
            if (variableDeclaration.name.kind == ts5.SyntaxKind.Identifier) {
              const nameNode = variableDeclaration.name;
              let varValue;
              if (variableDeclaration.initializer) {
                varValue = evaluator.evaluateNode(variableDeclaration.initializer);
              } else {
                varValue = recordEntry(errorSym("Variable not initialized", nameNode), nameNode);
              }
              let exported = false;
              if (isExport(variableStatement) || isExport(variableDeclaration) || isExportedIdentifier(nameNode)) {
                const name = exportedIdentifierName(nameNode);
                if (name) {
                  if (!metadata)
                    metadata = {};
                  metadata[name] = recordEntry(varValue, node);
                }
                exported = true;
              }
              if (typeof varValue == "string" || typeof varValue == "number" || typeof varValue == "boolean") {
                locals.define(nameNode.text, varValue);
                if (exported) {
                  locals.defineReference(nameNode.text, { __symbolic: "reference", name: nameNode.text });
                }
              } else if (!exported) {
                if (varValue && !isMetadataError(varValue)) {
                  locals.define(nameNode.text, recordEntry(varValue, node));
                } else {
                  locals.define(nameNode.text, recordEntry(errorSym("Reference to a local symbol", nameNode, { name: nameNode.text }), node));
                }
              }
            } else {
              const report = (nameNode) => {
                switch (nameNode.kind) {
                  case ts5.SyntaxKind.Identifier:
                    const name = nameNode;
                    const varValue = errorSym("Destructuring not supported", name);
                    locals.define(name.text, varValue);
                    if (isExport(node)) {
                      if (!metadata)
                        metadata = {};
                      metadata[name.text] = varValue;
                    }
                    break;
                  case ts5.SyntaxKind.BindingElement:
                    const bindingElement = nameNode;
                    report(bindingElement.name);
                    break;
                  case ts5.SyntaxKind.ObjectBindingPattern:
                  case ts5.SyntaxKind.ArrayBindingPattern:
                    const bindings = nameNode;
                    bindings.elements.forEach(report);
                    break;
                }
              };
              report(variableDeclaration.name);
            }
          }
          break;
      }
    });
    if (metadata || exports) {
      if (!metadata)
        metadata = {};
      else if (strict) {
        validateMetadata(sourceFile, nodeMap, metadata);
      }
      const result = {
        __symbolic: "module",
        version: this.options.version || METADATA_VERSION,
        metadata
      };
      if (sourceFile.moduleName)
        result.importAs = sourceFile.moduleName;
      if (exports)
        result.exports = exports;
      return result;
    }
  }
};
function validateMetadata(sourceFile, nodeMap, metadata) {
  let locals = new Set(["Array", "Object", "Set", "Map", "string", "number", "any"]);
  function validateExpression(expression) {
    if (!expression) {
      return;
    } else if (Array.isArray(expression)) {
      expression.forEach(validateExpression);
    } else if (typeof expression === "object" && !expression.hasOwnProperty("__symbolic")) {
      Object.getOwnPropertyNames(expression).forEach((v) => validateExpression(expression[v]));
    } else if (isMetadataError(expression)) {
      reportError(expression);
    } else if (isMetadataGlobalReferenceExpression(expression)) {
      if (!locals.has(expression.name)) {
        const reference = metadata[expression.name];
        if (reference) {
          validateExpression(reference);
        }
      }
    } else if (isFunctionMetadata(expression)) {
      validateFunction(expression);
    } else if (isMetadataSymbolicExpression(expression)) {
      switch (expression.__symbolic) {
        case "binary":
          const binaryExpression = expression;
          validateExpression(binaryExpression.left);
          validateExpression(binaryExpression.right);
          break;
        case "call":
        case "new":
          const callExpression = expression;
          validateExpression(callExpression.expression);
          if (callExpression.arguments)
            callExpression.arguments.forEach(validateExpression);
          break;
        case "index":
          const indexExpression = expression;
          validateExpression(indexExpression.expression);
          validateExpression(indexExpression.index);
          break;
        case "pre":
          const prefixExpression = expression;
          validateExpression(prefixExpression.operand);
          break;
        case "select":
          const selectExpression = expression;
          validateExpression(selectExpression.expression);
          break;
        case "spread":
          const spreadExpression = expression;
          validateExpression(spreadExpression.expression);
          break;
        case "if":
          const ifExpression = expression;
          validateExpression(ifExpression.condition);
          validateExpression(ifExpression.elseExpression);
          validateExpression(ifExpression.thenExpression);
          break;
      }
    }
  }
  function validateMember(classData, member) {
    if (member.decorators) {
      member.decorators.forEach(validateExpression);
    }
    if (isMethodMetadata(member) && member.parameterDecorators) {
      member.parameterDecorators.forEach(validateExpression);
    }
    if (classData.decorators && isConstructorMetadata(member) && member.parameters) {
      member.parameters.forEach(validateExpression);
    }
  }
  function validateClass(classData) {
    if (classData.decorators) {
      classData.decorators.forEach(validateExpression);
    }
    if (classData.members) {
      Object.getOwnPropertyNames(classData.members).forEach((name) => classData.members[name].forEach((m) => validateMember(classData, m)));
    }
    if (classData.statics) {
      Object.getOwnPropertyNames(classData.statics).forEach((name) => {
        const staticMember = classData.statics[name];
        if (isFunctionMetadata(staticMember)) {
          validateExpression(staticMember.value);
        } else {
          validateExpression(staticMember);
        }
      });
    }
  }
  function validateFunction(functionDeclaration) {
    if (functionDeclaration.value) {
      const oldLocals = locals;
      if (functionDeclaration.parameters) {
        locals = new Set(oldLocals.values());
        if (functionDeclaration.parameters)
          functionDeclaration.parameters.forEach((n) => locals.add(n));
      }
      validateExpression(functionDeclaration.value);
      locals = oldLocals;
    }
  }
  function shouldReportNode(node) {
    if (node) {
      const nodeStart = node.getStart();
      return !(node.pos != nodeStart && sourceFile.text.substring(node.pos, nodeStart).indexOf("@dynamic") >= 0);
    }
    return true;
  }
  function reportError(error2) {
    const node = nodeMap.get(error2);
    if (shouldReportNode(node)) {
      const lineInfo = error2.line != void 0 ? error2.character != void 0 ? `:${error2.line + 1}:${error2.character + 1}` : `:${error2.line + 1}` : "";
      throw new Error(`${sourceFile.fileName}${lineInfo}: Metadata collected contains an error that will be reported at runtime: ${expandedMessage(error2)}.
  ${JSON.stringify(error2)}`);
    }
  }
  Object.getOwnPropertyNames(metadata).forEach((name) => {
    const entry = metadata[name];
    try {
      if (isClassMetadata(entry)) {
        validateClass(entry);
      }
    } catch (e) {
      const node = nodeMap.get(entry);
      if (shouldReportNode(node)) {
        if (node) {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          throw new Error(`${sourceFile.fileName}:${line + 1}:${character + 1}: Error encountered in metadata generated for exported symbol '${name}': 
 ${e.message}`);
        }
        throw new Error(`Error encountered in metadata generated for exported symbol ${name}: 
 ${e.message}`);
      }
    }
  });
}
function namesOf(parameters) {
  const result = [];
  function addNamesOf(name) {
    if (name.kind == ts5.SyntaxKind.Identifier) {
      const identifier = name;
      result.push(identifier.text);
    } else {
      const bindingPattern = name;
      for (const element of bindingPattern.elements) {
        const name2 = element.name;
        if (name2) {
          addNamesOf(name2);
        }
      }
    }
  }
  for (const parameter of parameters) {
    addNamesOf(parameter.name);
  }
  return result;
}
function shouldIgnoreStaticMember(memberName) {
  return memberName.startsWith("ngAcceptInputType_") || memberName.startsWith("ngTemplateGuard_");
}
function expandedMessage(error2) {
  switch (error2.message) {
    case "Reference to non-exported class":
      if (error2.context && error2.context.className) {
        return `Reference to a non-exported class ${error2.context.className}. Consider exporting the class`;
      }
      break;
    case "Variable not initialized":
      return "Only initialized variables and constants can be referenced because the value of this variable is needed by the template compiler";
    case "Destructuring not supported":
      return "Referencing an exported destructured variable or constant is not supported by the template compiler. Consider simplifying this to avoid destructuring";
    case "Could not resolve type":
      if (error2.context && error2.context.typeName) {
        return `Could not resolve type ${error2.context.typeName}`;
      }
      break;
    case "Function call not supported":
      let prefix = error2.context && error2.context.name ? `Calling function '${error2.context.name}', f` : "F";
      return prefix + "unction calls are not supported. Consider replacing the function or lambda with a reference to an exported function";
    case "Reference to a local symbol":
      if (error2.context && error2.context.name) {
        return `Reference to a local (non-exported) symbol '${error2.context.name}'. Consider exporting the symbol`;
      }
  }
  return error2.message;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/metadata/bundle_index_host.mjs
import {
  basename as basename4,
  dirname as dirname4,
  join as join4,
  normalize as normalize2
} from "path";
import ts7 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/metadata/bundler.mjs
import {
  basename as basename3,
  dirname as dirname3,
  join as join3,
  normalize,
  sep
} from "path";
import ts6 from "typescript";
var PRIVATE_NAME_CHARS = "abcdefghijklmnopqrstuvwxyz";
var MetadataBundler = class {
  constructor(root, importAs, host, privateSymbolPrefix) {
    this.root = root;
    this.importAs = importAs;
    this.host = host;
    this.symbolMap = new Map();
    this.metadataCache = new Map();
    this.exports = new Map();
    this.rootModule = `./${basename3(root)}`;
    this.privateSymbolPrefix = (privateSymbolPrefix || "").replace(/\W/g, "_");
  }
  getMetadataBundle() {
    const exportedSymbols = this.exportAll(this.rootModule);
    this.canonicalizeSymbols(exportedSymbols);
    const metadata = this.getEntries(exportedSymbols);
    const privates = Array.from(this.symbolMap.values()).filter((s) => s.referenced && s.isPrivate).map((s) => ({
      privateName: s.privateName,
      name: s.declaration.name,
      module: s.declaration.module
    }));
    const origins = Array.from(this.symbolMap.values()).filter((s) => s.referenced && !s.reexport).reduce((p2, s) => {
      p2[s.isPrivate ? s.privateName : s.name] = s.declaration.module;
      return p2;
    }, {});
    const exports = this.getReExports(exportedSymbols);
    return {
      metadata: {
        __symbolic: "module",
        version: METADATA_VERSION,
        exports: exports.length ? exports : void 0,
        metadata,
        origins,
        importAs: this.importAs
      },
      privates
    };
  }
  static resolveModule(importName, from) {
    return resolveModule(importName, from);
  }
  getMetadata(moduleName) {
    let result = this.metadataCache.get(moduleName);
    if (!result) {
      if (moduleName.startsWith(".")) {
        const fullModuleName = resolveModule(moduleName, this.root);
        result = this.host.getMetadataFor(fullModuleName, this.root);
      }
      this.metadataCache.set(moduleName, result);
    }
    return result;
  }
  exportAll(moduleName) {
    const module2 = this.getMetadata(moduleName);
    let result = this.exports.get(moduleName);
    if (result) {
      return result;
    }
    result = [];
    const exportSymbol = (exportedSymbol, exportAs) => {
      const symbol = this.symbolOf(moduleName, exportAs);
      result.push(symbol);
      exportedSymbol.reexportedAs = symbol;
      symbol.exports = exportedSymbol;
    };
    if (module2 && module2.metadata) {
      for (let key in module2.metadata) {
        const data = module2.metadata[key];
        if (isMetadataImportedSymbolReferenceExpression(data)) {
          const exportFrom = resolveModule(data.module, moduleName);
          this.exportAll(exportFrom);
          const symbol = this.symbolOf(exportFrom, data.name);
          exportSymbol(symbol, key);
        } else {
          result.push(this.symbolOf(moduleName, key));
        }
      }
    }
    if (module2 && module2.exports) {
      let unnamedModuleExportsIdx = 0;
      for (const exportDeclaration of module2.exports) {
        const exportFrom = resolveModule(exportDeclaration.from, moduleName);
        const exportedSymbols = this.exportAll(exportFrom);
        if (exportDeclaration.export) {
          for (const exportItem of exportDeclaration.export) {
            const name = typeof exportItem == "string" ? exportItem : exportItem.name;
            const exportAs = typeof exportItem == "string" ? exportItem : exportItem.as;
            const symbol = this.symbolOf(exportFrom, name);
            if (exportedSymbols && exportedSymbols.length == 1 && exportedSymbols[0].reexport && exportedSymbols[0].name == "*") {
              symbol.reexport = true;
            }
            exportSymbol(this.symbolOf(exportFrom, name), exportAs);
          }
        } else {
          const exportedSymbols2 = this.exportAll(exportFrom);
          for (const exportedSymbol of exportedSymbols2) {
            const name = exportedSymbol.name === "*" ? `unnamed_reexport_${unnamedModuleExportsIdx++}` : exportedSymbol.name;
            exportSymbol(exportedSymbol, name);
          }
        }
      }
    }
    if (!module2) {
      const symbol = this.symbolOf(moduleName, "*");
      symbol.reexport = true;
      result.push(symbol);
    }
    this.exports.set(moduleName, result);
    return result;
  }
  canonicalizeSymbols(exportedSymbols) {
    const symbols = Array.from(this.symbolMap.values());
    this.exported = new Set(exportedSymbols);
    symbols.forEach(this.canonicalizeSymbol, this);
  }
  canonicalizeSymbol(symbol) {
    const rootExport = getRootExport(symbol);
    const declaration = getSymbolDeclaration(symbol);
    const isPrivate = !this.exported.has(rootExport);
    const canonicalSymbol = isPrivate ? declaration : rootExport;
    symbol.isPrivate = isPrivate;
    symbol.declaration = declaration;
    symbol.canonicalSymbol = canonicalSymbol;
    symbol.reexport = declaration.reexport;
  }
  getEntries(exportedSymbols) {
    const result = {};
    const exportedNames = new Set(exportedSymbols.map((s) => s.name));
    let privateName = 0;
    function newPrivateName(prefix) {
      while (true) {
        let digits = [];
        let index = privateName++;
        let base = PRIVATE_NAME_CHARS;
        while (!digits.length || index > 0) {
          digits.unshift(base[index % base.length]);
          index = Math.floor(index / base.length);
        }
        const result2 = `\u0275${prefix}${digits.join("")}`;
        if (!exportedNames.has(result2))
          return result2;
      }
    }
    exportedSymbols.forEach((symbol) => this.convertSymbol(symbol));
    const symbolsMap = new Map();
    Array.from(this.symbolMap.values()).forEach((symbol) => {
      if (symbol.referenced && !symbol.reexport) {
        let name = symbol.name;
        const identifier = `${symbol.declaration.module}:${symbol.declaration.name}`;
        if (symbol.isPrivate && !symbol.privateName) {
          name = newPrivateName(this.privateSymbolPrefix);
          symbol.privateName = name;
        }
        if (symbolsMap.has(identifier)) {
          const names = symbolsMap.get(identifier);
          names.push(name);
        } else {
          symbolsMap.set(identifier, [name]);
        }
        result[name] = symbol.value;
      }
    });
    symbolsMap.forEach((names, identifier) => {
      if (names.length > 1) {
        const [module2, declaredName] = identifier.split(":");
        let reference = names.indexOf(declaredName);
        if (reference === -1) {
          reference = 0;
        }
        names.forEach((name, i) => {
          if (i !== reference) {
            result[name] = { __symbolic: "reference", name: names[reference] };
          }
        });
      }
    });
    return result;
  }
  getReExports(exportedSymbols) {
    const modules = new Map();
    const exportAlls = new Set();
    for (const symbol of exportedSymbols) {
      if (symbol.reexport) {
        const declaration = symbol.declaration;
        const module2 = declaration.module;
        if (declaration.name == "*") {
          exportAlls.add(declaration.module);
        } else {
          let entry = modules.get(module2);
          if (!entry) {
            entry = [];
            modules.set(module2, entry);
          }
          const as = symbol.name;
          const name = declaration.name;
          entry.push({ name, as });
        }
      }
    }
    return [
      ...Array.from(exportAlls.values()).map((from) => ({ from })),
      ...Array.from(modules.entries()).map(([from, exports]) => ({ export: exports, from }))
    ];
  }
  convertSymbol(symbol) {
    const canonicalSymbol = symbol.canonicalSymbol;
    if (!canonicalSymbol.referenced) {
      canonicalSymbol.referenced = true;
      const declaration = canonicalSymbol.declaration;
      const module2 = this.getMetadata(declaration.module);
      if (module2) {
        const value = module2.metadata[declaration.name];
        if (value && !declaration.name.startsWith("___")) {
          canonicalSymbol.value = this.convertEntry(declaration.module, value);
        }
      }
    }
  }
  convertEntry(moduleName, value) {
    if (isClassMetadata(value)) {
      return this.convertClass(moduleName, value);
    }
    if (isFunctionMetadata(value)) {
      return this.convertFunction(moduleName, value);
    }
    if (isInterfaceMetadata(value)) {
      return value;
    }
    return this.convertValue(moduleName, value);
  }
  convertClass(moduleName, value) {
    return {
      __symbolic: "class",
      arity: value.arity,
      extends: this.convertExpression(moduleName, value.extends),
      decorators: value.decorators && value.decorators.map((d) => this.convertExpression(moduleName, d)),
      members: this.convertMembers(moduleName, value.members),
      statics: value.statics && this.convertStatics(moduleName, value.statics)
    };
  }
  convertMembers(moduleName, members) {
    const result = {};
    for (const name in members) {
      const value = members[name];
      result[name] = value.map((v) => this.convertMember(moduleName, v));
    }
    return result;
  }
  convertMember(moduleName, member) {
    const result = { __symbolic: member.__symbolic };
    result.decorators = member.decorators && member.decorators.map((d) => this.convertExpression(moduleName, d));
    if (isMethodMetadata(member)) {
      result.parameterDecorators = member.parameterDecorators && member.parameterDecorators.map((d) => d && d.map((p2) => this.convertExpression(moduleName, p2)));
      if (isConstructorMetadata(member)) {
        if (member.parameters) {
          result.parameters = member.parameters.map((p2) => this.convertExpression(moduleName, p2));
        }
      }
    }
    return result;
  }
  convertStatics(moduleName, statics) {
    let result = {};
    for (const key in statics) {
      const value = statics[key];
      if (isFunctionMetadata(value)) {
        result[key] = this.convertFunction(moduleName, value);
      } else if (isMetadataSymbolicCallExpression(value)) {
        result[key] = this.convertValue(moduleName, value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  convertFunction(moduleName, value) {
    return {
      __symbolic: "function",
      parameters: value.parameters,
      defaults: value.defaults && value.defaults.map((v) => this.convertValue(moduleName, v)),
      value: this.convertValue(moduleName, value.value)
    };
  }
  convertValue(moduleName, value) {
    if (isPrimitive2(value)) {
      return value;
    }
    if (isMetadataError(value)) {
      return this.convertError(moduleName, value);
    }
    if (isMetadataSymbolicExpression(value)) {
      return this.convertExpression(moduleName, value);
    }
    if (Array.isArray(value)) {
      return value.map((v) => this.convertValue(moduleName, v));
    }
    const object = value;
    const result = {};
    for (const key in object) {
      result[key] = this.convertValue(moduleName, object[key]);
    }
    return result;
  }
  convertExpression(moduleName, value) {
    if (value) {
      switch (value.__symbolic) {
        case "error":
          return this.convertError(moduleName, value);
        case "reference":
          return this.convertReference(moduleName, value);
        default:
          return this.convertExpressionNode(moduleName, value);
      }
    }
    return value;
  }
  convertError(module2, value) {
    return {
      __symbolic: "error",
      message: value.message,
      line: value.line,
      character: value.character,
      context: value.context,
      module: module2
    };
  }
  convertReference(moduleName, value) {
    const createReference = (symbol) => {
      const declaration = symbol.declaration;
      if (declaration.module.startsWith(".")) {
        this.convertSymbol(symbol);
        return {
          __symbolic: "reference",
          get name() {
            const canonicalSymbol = symbol.canonicalSymbol;
            if (canonicalSymbol.isPrivate == null) {
              throw Error("Invalid state: isPrivate was not initialized");
            }
            return canonicalSymbol.isPrivate ? canonicalSymbol.privateName : canonicalSymbol.name;
          }
        };
      } else {
        return { __symbolic: "reference", name: declaration.name, module: declaration.module };
      }
    };
    if (isMetadataGlobalReferenceExpression(value)) {
      const metadata = this.getMetadata(moduleName);
      if (metadata && metadata.metadata && metadata.metadata[value.name]) {
        return createReference(this.canonicalSymbolOf(moduleName, value.name));
      }
      if (value.arguments) {
        return {
          __symbolic: "reference",
          name: value.name,
          arguments: value.arguments.map((a) => this.convertValue(moduleName, a))
        };
      }
      return value;
    }
    if (isMetadataImportedSymbolReferenceExpression(value)) {
      if (value.module.startsWith(".")) {
        const referencedModule = resolveModule(value.module, moduleName);
        const referencedName = value.name;
        return createReference(this.canonicalSymbolOf(referencedModule, referencedName));
      }
      if (value.arguments) {
        return {
          __symbolic: "reference",
          name: value.name,
          module: value.module,
          arguments: value.arguments.map((a) => this.convertValue(moduleName, a))
        };
      }
      return value;
    }
    if (isMetadataModuleReferenceExpression(value)) {
      if (value.module.startsWith(".")) {
        return {
          __symbolic: "error",
          message: "Unsupported bundled module reference",
          context: { module: value.module }
        };
      }
      return value;
    }
  }
  convertExpressionNode(moduleName, value) {
    const result = { __symbolic: value.__symbolic };
    for (const key in value) {
      result[key] = this.convertValue(moduleName, value[key]);
    }
    return result;
  }
  symbolOf(module2, name) {
    const symbolKey = `${module2}:${name}`;
    let symbol = this.symbolMap.get(symbolKey);
    if (!symbol) {
      symbol = { module: module2, name };
      this.symbolMap.set(symbolKey, symbol);
    }
    return symbol;
  }
  canonicalSymbolOf(module2, name) {
    this.exportAll(module2);
    const symbol = this.symbolOf(module2, name);
    if (!symbol.canonicalSymbol) {
      this.canonicalizeSymbol(symbol);
    }
    return symbol;
  }
};
var CompilerHostAdapter = class {
  constructor(host, cache, options) {
    this.host = host;
    this.cache = cache;
    this.options = options;
    this.collector = new MetadataCollector();
  }
  getMetadataFor(fileName, containingFile) {
    const { resolvedModule } = ts6.resolveModuleName(fileName, containingFile, this.options, this.host);
    let sourceFile;
    if (resolvedModule) {
      let { resolvedFileName } = resolvedModule;
      if (resolvedModule.extension !== ".ts") {
        resolvedFileName = resolvedFileName.replace(/(\.d\.ts|\.js)$/, ".ts");
      }
      sourceFile = this.host.getSourceFile(resolvedFileName, ts6.ScriptTarget.Latest);
    } else {
      if (!this.host.fileExists(fileName + ".ts"))
        return void 0;
      sourceFile = this.host.getSourceFile(fileName + ".ts", ts6.ScriptTarget.Latest);
    }
    if (!sourceFile) {
      return void 0;
    } else if (this.cache) {
      return this.cache.getMetadata(sourceFile);
    } else {
      return this.collector.getMetadata(sourceFile);
    }
  }
};
function resolveModule(importName, from) {
  if (importName.startsWith(".") && from) {
    let normalPath = normalize(join3(dirname3(from), importName));
    if (!normalPath.startsWith(".") && from.startsWith(".")) {
      normalPath = `.${sep}${normalPath}`;
    }
    return normalPath.replace(/\\/g, "/");
  }
  return importName;
}
function isPrimitive2(o3) {
  return o3 === null || typeof o3 !== "function" && typeof o3 !== "object";
}
function getRootExport(symbol) {
  return symbol.reexportedAs ? getRootExport(symbol.reexportedAs) : symbol;
}
function getSymbolDeclaration(symbol) {
  return symbol.exports ? getSymbolDeclaration(symbol.exports) : symbol;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/metadata/index_writer.mjs
var INDEX_HEADER = `/**
 * Generated bundle index. Do not edit.
 */
`;
function privateEntriesToIndex(index, privates) {
  const results = [INDEX_HEADER];
  results.push(`export * from '${index}';`, "");
  const exports = new Map();
  for (const entry of privates) {
    let entries = exports.get(entry.module);
    if (!entries) {
      entries = [];
      exports.set(entry.module, entries);
    }
    entries.push(entry);
  }
  const compareEntries = compare((e) => e.name);
  const compareModules = compare((e) => e[0]);
  const orderedExports = Array.from(exports).map(([module2, entries]) => [module2, entries.sort(compareEntries)]).sort(compareModules);
  for (const [module2, entries] of orderedExports) {
    let symbols = entries.map((e) => `${e.name} as ${e.privateName}`);
    results.push(`export {${symbols}} from '${module2}';`);
  }
  return results.join("\n");
}
function compare(select) {
  return (a, b) => {
    const ak = select(a);
    const bk = select(b);
    return ak > bk ? 1 : ak < bk ? -1 : 0;
  };
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/metadata/bundle_index_host.mjs
var DTS = /\.d\.ts$/;
var JS_EXT = /(\.js|)$/;
function createSyntheticIndexHost(delegate, syntheticIndex) {
  const normalSyntheticIndexName = normalize2(syntheticIndex.name);
  const newHost = Object.create(delegate);
  newHost.fileExists = (fileName) => {
    return normalize2(fileName) == normalSyntheticIndexName || delegate.fileExists(fileName);
  };
  newHost.readFile = (fileName) => {
    return normalize2(fileName) == normalSyntheticIndexName ? syntheticIndex.content : delegate.readFile(fileName);
  };
  newHost.getSourceFile = (fileName, languageVersion, onError) => {
    if (normalize2(fileName) == normalSyntheticIndexName) {
      const sf = ts7.createSourceFile(fileName, syntheticIndex.content, languageVersion, true);
      if (delegate.fileNameToModuleName) {
        sf.moduleName = delegate.fileNameToModuleName(fileName);
      }
      return sf;
    }
    return delegate.getSourceFile(fileName, languageVersion, onError);
  };
  newHost.writeFile = (fileName, data, writeByteOrderMark, onError, sourceFiles) => {
    delegate.writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles);
    if (fileName.match(DTS) && sourceFiles && sourceFiles.length == 1 && normalize2(sourceFiles[0].fileName) === normalSyntheticIndexName) {
      const metadataName = fileName.replace(DTS, ".metadata.json");
      const indexMetadata = syntheticIndex.getMetadata();
      delegate.writeFile(metadataName, indexMetadata, writeByteOrderMark, onError, []);
    }
  };
  return newHost;
}
function createBundleIndexHost(ngOptions, rootFiles, host, getMetadataCache) {
  const files = rootFiles.filter((f) => !DTS.test(f));
  let indexFile;
  if (files.length === 1) {
    indexFile = files[0];
  } else {
    for (const f of files) {
      if (f.endsWith("/index.ts")) {
        if (!indexFile || indexFile.length > f.length) {
          indexFile = f;
        }
      }
    }
  }
  if (!indexFile) {
    return {
      host,
      errors: [{
        file: null,
        start: null,
        length: null,
        messageText: 'Angular compiler option "flatModuleIndex" requires one and only one .ts file in the "files" field.',
        category: ts7.DiagnosticCategory.Error,
        code: 0
      }]
    };
  }
  const indexModule = indexFile.replace(/\.ts$/, "");
  const getMetadataBundle = (cache) => {
    const bundler = new MetadataBundler(indexModule, ngOptions.flatModuleId, new CompilerHostAdapter(host, cache, ngOptions), ngOptions.flatModulePrivateSymbolPrefix);
    return bundler.getMetadataBundle();
  };
  const metadataBundle = getMetadataBundle(null);
  const name = join4(dirname4(indexModule), ngOptions.flatModuleOutFile.replace(JS_EXT, ".ts"));
  const libraryIndex = `./${basename4(indexModule)}`;
  const content = privateEntriesToIndex(libraryIndex, metadataBundle.privates);
  host = createSyntheticIndexHost(host, {
    name,
    content,
    getMetadata: () => {
      const metadataBundle2 = getMetadataBundle(getMetadataCache());
      return JSON.stringify(metadataBundle2.metadata);
    }
  });
  return { host, indexName: name };
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/util.mjs
import { syntaxError } from "@angular/compiler";
import {
  relative as relative3
} from "path";
import ts8 from "typescript";
var GENERATED_FILES = /(.*?)\.(ngfactory|shim\.ngstyle|ngstyle|ngsummary)\.(js|d\.ts|ts)$/;
var DTS2 = /\.d\.ts$/;
var TS = /^(?!.*\.d\.ts$).*\.ts$/;
function tsStructureIsReused(program) {
  return program.structureIsReused;
}
function error(msg) {
  throw new Error(`Internal error: ${msg}`);
}
function createMessageDiagnostic(messageText) {
  return {
    file: void 0,
    start: void 0,
    length: void 0,
    category: ts8.DiagnosticCategory.Message,
    messageText,
    code: DEFAULT_ERROR_CODE,
    source: SOURCE
  };
}
function isInRootDir(fileName, options) {
  return !options.rootDir || pathStartsWithPrefix(options.rootDir, fileName);
}
function relativeToRootDirs(filePath, rootDirs) {
  if (!filePath)
    return filePath;
  for (const dir of rootDirs || []) {
    const rel = pathStartsWithPrefix(dir, filePath);
    if (rel) {
      return rel;
    }
  }
  return filePath;
}
function pathStartsWithPrefix(prefix, fullPath) {
  const rel = relative3(prefix, fullPath);
  return rel.startsWith("..") ? null : rel;
}
function ngToTsDiagnostic(ng2) {
  let file;
  let start;
  let length;
  if (ng2.span) {
    file = { fileName: ng2.span.start.file.url, text: ng2.span.start.file.content };
    start = ng2.span.start.offset;
    length = ng2.span.end.offset - start;
  }
  return {
    file,
    messageText: ng2.messageText,
    category: ng2.category,
    code: ng2.code,
    start,
    length
  };
}
function stripComment(commentText) {
  return commentText.replace(/^\/\*\*?/, "").replace(/\*\/$/, "").trim();
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/metadata_reader.mjs
function createMetadataReaderCache() {
  const data = new Map();
  return { data };
}
function readMetadata(filePath, host, cache) {
  let metadatas = cache && cache.data.get(filePath);
  if (metadatas) {
    return metadatas;
  }
  if (host.fileExists(filePath)) {
    if (DTS2.test(filePath)) {
      metadatas = readMetadataFile(host, filePath);
      if (!metadatas) {
        metadatas = [upgradeMetadataWithDtsData(host, { "__symbolic": "module", "version": 1, "metadata": {} }, filePath)];
      }
    } else {
      const metadata = host.getSourceFileMetadata(filePath);
      metadatas = metadata ? [metadata] : [];
    }
  }
  if (cache && (!host.cacheMetadata || host.cacheMetadata(filePath))) {
    cache.data.set(filePath, metadatas);
  }
  return metadatas;
}
function readMetadataFile(host, dtsFilePath) {
  const metadataPath = dtsFilePath.replace(DTS2, ".metadata.json");
  if (!host.fileExists(metadataPath)) {
    return void 0;
  }
  try {
    const metadataOrMetadatas = JSON.parse(host.readFile(metadataPath));
    const metadatas = metadataOrMetadatas ? Array.isArray(metadataOrMetadatas) ? metadataOrMetadatas : [metadataOrMetadatas] : [];
    if (metadatas.length) {
      let maxMetadata = metadatas.reduce((p2, c) => p2.version > c.version ? p2 : c);
      if (maxMetadata.version < METADATA_VERSION) {
        metadatas.push(upgradeMetadataWithDtsData(host, maxMetadata, dtsFilePath));
      }
    }
    return metadatas;
  } catch (e) {
    console.error(`Failed to read JSON file ${metadataPath}`);
    throw e;
  }
}
function upgradeMetadataWithDtsData(host, oldMetadata, dtsFilePath) {
  let newMetadata = {
    "__symbolic": "module",
    "version": METADATA_VERSION,
    "metadata": __spreadValues({}, oldMetadata.metadata)
  };
  if (oldMetadata.exports) {
    newMetadata.exports = oldMetadata.exports;
  }
  if (oldMetadata.importAs) {
    newMetadata.importAs = oldMetadata.importAs;
  }
  if (oldMetadata.origins) {
    newMetadata.origins = oldMetadata.origins;
  }
  const dtsMetadata = host.getSourceFileMetadata(dtsFilePath);
  if (dtsMetadata) {
    for (let prop in dtsMetadata.metadata) {
      if (!newMetadata.metadata[prop]) {
        newMetadata.metadata[prop] = dtsMetadata.metadata[prop];
      }
    }
    if (dtsMetadata["importAs"])
      newMetadata["importAs"] = dtsMetadata["importAs"];
    if ((!oldMetadata.version || oldMetadata.version < 3) && dtsMetadata.exports) {
      newMetadata.exports = dtsMetadata.exports;
    }
  }
  return newMetadata;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/compiler_host.mjs
var NODE_MODULES_PACKAGE_NAME = /node_modules\/((\w|-|\.)+|(@(\w|-|\.)+\/(\w|-|\.)+))/;
var EXT = /(\.ts|\.d\.ts|\.js|\.jsx|\.tsx)$/;
var CSS_PREPROCESSOR_EXT = /(\.scss|\.sass|\.less|\.styl)$/;
var wrapHostForTest = null;
function createCompilerHost({ options, tsHost = ts9.createCompilerHost(options, true) }) {
  if (wrapHostForTest !== null) {
    tsHost = wrapHostForTest(tsHost);
  }
  return tsHost;
}
function assert(condition) {
  if (!condition) {
  }
  return condition;
}
var TsCompilerAotCompilerTypeCheckHostAdapter = class {
  constructor(rootFiles, options, context, metadataProvider, codeGenerator, librarySummaries = new Map()) {
    this.rootFiles = rootFiles;
    this.options = options;
    this.context = context;
    this.metadataProvider = metadataProvider;
    this.codeGenerator = codeGenerator;
    this.librarySummaries = librarySummaries;
    this.metadataReaderCache = createMetadataReaderCache();
    this.fileNameToModuleNameCache = new Map();
    this.flatModuleIndexCache = new Map();
    this.flatModuleIndexNames = new Set();
    this.flatModuleIndexRedirectNames = new Set();
    this.originalSourceFiles = new Map();
    this.originalFileExistsCache = new Map();
    this.generatedSourceFiles = new Map();
    this.generatedCodeFor = new Map();
    this.emitter = new TypeScriptEmitter();
    this.getDefaultLibFileName = (options2) => this.context.getDefaultLibFileName(options2);
    this.getCurrentDirectory = () => this.context.getCurrentDirectory();
    this.getCanonicalFileName = (fileName) => this.context.getCanonicalFileName(fileName);
    this.useCaseSensitiveFileNames = () => this.context.useCaseSensitiveFileNames();
    this.getNewLine = () => this.context.getNewLine();
    this.realpath = (p2) => p2;
    this.writeFile = this.context.writeFile.bind(this.context);
    this.moduleResolutionCache = ts9.createModuleResolutionCache(this.context.getCurrentDirectory(), this.context.getCanonicalFileName.bind(this.context));
    const basePath = this.options.basePath;
    this.rootDirs = (this.options.rootDirs || [this.options.basePath]).map((p2) => resolve3(basePath, p2));
    if (context.getDirectories) {
      this.getDirectories = (path8) => context.getDirectories(path8);
    }
    if (context.directoryExists) {
      this.directoryExists = (directoryName) => context.directoryExists(directoryName);
    }
    if (context.getCancellationToken) {
      this.getCancellationToken = () => context.getCancellationToken();
    }
    if (context.getDefaultLibLocation) {
      this.getDefaultLibLocation = () => context.getDefaultLibLocation();
    }
    if (context.resolveTypeReferenceDirectives) {
      this.resolveTypeReferenceDirectives = (names, containingFile) => context.resolveTypeReferenceDirectives(names, containingFile);
    }
    if (context.trace) {
      this.trace = (s) => context.trace(s);
    }
    if (context.fileNameToModuleName) {
      this.fileNameToModuleName = context.fileNameToModuleName.bind(context);
    }
    if (context.resourceNameToFileName) {
      this.resourceNameToFileName = context.resourceNameToFileName.bind(context);
    }
    if (context.toSummaryFileName) {
      this.toSummaryFileName = context.toSummaryFileName.bind(context);
    }
    if (context.fromSummaryFileName) {
      this.fromSummaryFileName = context.fromSummaryFileName.bind(context);
    }
    this.metadataReaderHost = {
      cacheMetadata: () => true,
      getSourceFileMetadata: (filePath) => {
        const sf = this.getOriginalSourceFile(filePath);
        return sf ? this.metadataProvider.getMetadata(sf) : void 0;
      },
      fileExists: (filePath) => this.originalFileExists(filePath),
      readFile: (filePath) => assert(this.context.readFile(filePath))
    };
  }
  resolveModuleName(moduleName, containingFile) {
    const rm = ts9.resolveModuleName(moduleName, containingFile.replace(/\\/g, "/"), this.options, this, this.moduleResolutionCache).resolvedModule;
    if (rm && this.isSourceFile(rm.resolvedFileName) && DTS2.test(rm.resolvedFileName)) {
      rm.isExternalLibraryImport = false;
    }
    return rm;
  }
  resolveModuleNames(moduleNames, containingFile) {
    return moduleNames.map((moduleName) => this.resolveModuleName(moduleName, containingFile));
  }
  moduleNameToFileName(m, containingFile) {
    if (!containingFile) {
      if (m.indexOf(".") === 0) {
        throw new Error("Resolution of relative paths requires a containing file.");
      }
      containingFile = this.rootFiles[0];
    }
    if (this.context.moduleNameToFileName) {
      return this.context.moduleNameToFileName(m, containingFile);
    }
    const resolved = this.resolveModuleName(m, containingFile);
    return resolved ? resolved.resolvedFileName : null;
  }
  fileNameToModuleName(importedFile, containingFile) {
    const cacheKey = `${importedFile}:${containingFile}`;
    let moduleName = this.fileNameToModuleNameCache.get(cacheKey);
    if (moduleName != null) {
      return moduleName;
    }
    const originalImportedFile = importedFile;
    if (this.options.traceResolution) {
      console.error("fileNameToModuleName from containingFile", containingFile, "to importedFile", importedFile);
    }
    importedFile = importedFile.replace(EXT, "");
    const importedFilePackageName = getPackageName(importedFile);
    const containingFilePackageName = getPackageName(containingFile);
    if (importedFilePackageName === containingFilePackageName || GENERATED_FILES.test(originalImportedFile)) {
      const rootedContainingFile = relativeToRootDirs(containingFile, this.rootDirs);
      const rootedImportedFile = relativeToRootDirs(importedFile, this.rootDirs);
      if (rootedContainingFile !== containingFile && rootedImportedFile !== importedFile) {
        containingFile = rootedContainingFile;
        importedFile = rootedImportedFile;
      }
      moduleName = dotRelative(dirname5(containingFile), importedFile);
    } else if (importedFilePackageName) {
      moduleName = stripNodeModulesPrefix(importedFile);
      if (originalImportedFile.endsWith(".d.ts")) {
        try {
          const modulePath = importedFile.substring(0, importedFile.length - moduleName.length) + importedFilePackageName;
          const packageJson = JSON.parse(fs3.readFileSync(modulePath + "/package.json", "utf8"));
          const packageTypings = join(modulePath, packageJson.typings);
          if (packageTypings === originalImportedFile) {
            moduleName = importedFilePackageName;
          }
        } catch {
        }
      }
    } else {
      throw new Error(`Trying to import a source file from a node_modules package: import ${originalImportedFile} from ${containingFile}`);
    }
    this.fileNameToModuleNameCache.set(cacheKey, moduleName);
    return moduleName;
  }
  resourceNameToFileName(resourceName, containingFile) {
    const firstChar = resourceName[0];
    if (firstChar === "/") {
      resourceName = resourceName.slice(1);
    } else if (firstChar !== ".") {
      resourceName = `./${resourceName}`;
    }
    let filePathWithNgResource = this.moduleNameToFileName(addNgResourceSuffix(resourceName), containingFile);
    if (!filePathWithNgResource && CSS_PREPROCESSOR_EXT.test(resourceName)) {
      const fallbackResourceName = resourceName.replace(CSS_PREPROCESSOR_EXT, ".css");
      filePathWithNgResource = this.moduleNameToFileName(addNgResourceSuffix(fallbackResourceName), containingFile);
    }
    const result = filePathWithNgResource ? stripNgResourceSuffix(filePathWithNgResource) : null;
    if (!result && this.context.reportMissingResource) {
      this.context.reportMissingResource(resourceName);
    }
    return result;
  }
  toSummaryFileName(fileName, referringSrcFileName) {
    return this.fileNameToModuleName(fileName, referringSrcFileName);
  }
  fromSummaryFileName(fileName, referringLibFileName) {
    const resolved = this.moduleNameToFileName(fileName, referringLibFileName);
    if (!resolved) {
      throw new Error(`Could not resolve ${fileName} from ${referringLibFileName}`);
    }
    return resolved;
  }
  parseSourceSpanOf(fileName, line, character) {
    const data = this.generatedSourceFiles.get(fileName);
    if (data && data.emitCtx) {
      return data.emitCtx.spanOf(line, character);
    }
    return null;
  }
  getOriginalSourceFile(filePath, languageVersion, onError) {
    if (this.originalSourceFiles.has(filePath)) {
      return this.originalSourceFiles.get(filePath);
    }
    if (!languageVersion) {
      languageVersion = this.options.target || ts9.ScriptTarget.Latest;
    }
    const sf = this.context.getSourceFile(filePath, languageVersion, onError) || null;
    this.originalSourceFiles.set(filePath, sf);
    return sf;
  }
  updateGeneratedFile(genFile) {
    if (!genFile.stmts) {
      throw new Error(`Invalid Argument: Expected a GenerateFile with statements. ${genFile.genFileUrl}`);
    }
    const oldGenFile = this.generatedSourceFiles.get(genFile.genFileUrl);
    if (!oldGenFile) {
      throw new Error(`Illegal State: previous GeneratedFile not found for ${genFile.genFileUrl}.`);
    }
    const newRefs = genFileExternalReferences(genFile);
    const oldRefs = oldGenFile.externalReferences;
    let refsAreEqual = oldRefs.size === newRefs.size;
    if (refsAreEqual) {
      newRefs.forEach((r) => refsAreEqual = refsAreEqual && oldRefs.has(r));
    }
    if (!refsAreEqual) {
      throw new Error(`Illegal State: external references changed in ${genFile.genFileUrl}.
Old: ${Array.from(oldRefs)}.
New: ${Array.from(newRefs)}`);
    }
    return this.addGeneratedFile(genFile, newRefs);
  }
  addGeneratedFile(genFile, externalReferences) {
    if (!genFile.stmts) {
      throw new Error(`Invalid Argument: Expected a GenerateFile with statements. ${genFile.genFileUrl}`);
    }
    const { sourceText, context } = this.emitter.emitStatementsAndContext(genFile.genFileUrl, genFile.stmts, "", false);
    const sf = ts9.createSourceFile(genFile.genFileUrl, sourceText, this.options.target || ts9.ScriptTarget.Latest);
    if (this.options.module === ts9.ModuleKind.AMD || this.options.module === ts9.ModuleKind.UMD) {
      if (this.context.amdModuleName) {
        const moduleName = this.context.amdModuleName(sf);
        if (moduleName)
          sf.moduleName = moduleName;
      } else if (/node_modules/.test(genFile.genFileUrl)) {
        sf.moduleName = stripNodeModulesPrefix(genFile.genFileUrl.replace(EXT, ""));
      }
    }
    this.generatedSourceFiles.set(genFile.genFileUrl, {
      sourceFile: sf,
      emitCtx: context,
      externalReferences
    });
    return sf;
  }
  shouldGenerateFile(fileName) {
    if (!isInRootDir(fileName, this.options)) {
      return { generate: false };
    }
    const genMatch = GENERATED_FILES.exec(fileName);
    if (!genMatch) {
      return { generate: false };
    }
    const [, base, genSuffix, suffix] = genMatch;
    if (suffix !== "ts" && suffix !== "tsx") {
      return { generate: false };
    }
    let baseFileName;
    if (genSuffix.indexOf("ngstyle") >= 0) {
      if (!this.originalFileExists(base)) {
        return { generate: false };
      }
    } else {
      baseFileName = [`${base}.ts`, `${base}.tsx`, `${base}.d.ts`].find((baseFileName2) => this.isSourceFile(baseFileName2) && this.originalFileExists(baseFileName2));
      if (!baseFileName) {
        return { generate: false };
      }
    }
    return { generate: true, baseFileName };
  }
  shouldGenerateFilesFor(fileName) {
    return !GENERATED_FILES.test(fileName) && this.isSourceFile(fileName) && isInRootDir(fileName, this.options);
  }
  getSourceFile(fileName, languageVersion, onError) {
    let genFileNames = [];
    let sf = this.getGeneratedFile(fileName);
    if (!sf) {
      const summary = this.librarySummaries.get(fileName);
      if (summary) {
        if (!summary.sourceFile) {
          summary.sourceFile = ts9.createSourceFile(fileName, summary.text, this.options.target || ts9.ScriptTarget.Latest);
        }
        sf = summary.sourceFile;
        const redirectInfo = sf.redirectInfo;
        if (redirectInfo !== void 0) {
          sf = redirectInfo.unredirected;
        }
        genFileNames = [];
      }
    }
    if (!sf) {
      sf = this.getOriginalSourceFile(fileName);
      const cachedGenFiles = this.generatedCodeFor.get(fileName);
      if (cachedGenFiles) {
        genFileNames = cachedGenFiles;
      } else {
        if (!this.options.noResolve && this.shouldGenerateFilesFor(fileName)) {
          genFileNames = this.codeGenerator.findGeneratedFileNames(fileName).filter((fileName2) => this.shouldGenerateFile(fileName2).generate);
        }
        this.generatedCodeFor.set(fileName, genFileNames);
      }
    }
    if (sf) {
      addReferencesToSourceFile(sf, genFileNames);
    }
    return sf;
  }
  getGeneratedFile(fileName) {
    const genSrcFile = this.generatedSourceFiles.get(fileName);
    if (genSrcFile) {
      return genSrcFile.sourceFile;
    }
    const { generate, baseFileName } = this.shouldGenerateFile(fileName);
    if (generate) {
      const genFile = this.codeGenerator.generateFile(fileName, baseFileName);
      return this.addGeneratedFile(genFile, genFileExternalReferences(genFile));
    }
    return null;
  }
  originalFileExists(fileName) {
    let fileExists = this.originalFileExistsCache.get(fileName);
    if (fileExists == null) {
      fileExists = this.context.fileExists(fileName);
      this.originalFileExistsCache.set(fileName, fileExists);
    }
    return fileExists;
  }
  fileExists(fileName) {
    fileName = stripNgResourceSuffix(fileName);
    if (this.librarySummaries.has(fileName) || this.generatedSourceFiles.has(fileName)) {
      return true;
    }
    if (this.shouldGenerateFile(fileName).generate) {
      return true;
    }
    return this.originalFileExists(fileName);
  }
  loadSummary(filePath) {
    const summary = this.librarySummaries.get(filePath);
    if (summary) {
      return summary.text;
    }
    if (this.originalFileExists(filePath)) {
      return assert(this.context.readFile(filePath));
    }
    return null;
  }
  isSourceFile(filePath) {
    if (this.options.skipTemplateCodegen && !this.options.fullTemplateTypeCheck) {
      return false;
    }
    if (this.librarySummaries.has(filePath)) {
      return false;
    }
    if (GENERATED_FILES.test(filePath)) {
      return false;
    }
    if (this.options.generateCodeForLibraries === false && DTS2.test(filePath)) {
      return false;
    }
    if (DTS2.test(filePath)) {
      if (this.hasBundleIndex(filePath)) {
        const normalFilePath = normalize3(filePath);
        return this.flatModuleIndexNames.has(normalFilePath) || this.flatModuleIndexRedirectNames.has(normalFilePath);
      }
    }
    return true;
  }
  readFile(fileName) {
    const summary = this.librarySummaries.get(fileName);
    if (summary) {
      return summary.text;
    }
    return this.context.readFile(fileName);
  }
  getMetadataFor(filePath) {
    return readMetadata(filePath, this.metadataReaderHost, this.metadataReaderCache);
  }
  loadResource(filePath) {
    if (this.context.readResource)
      return this.context.readResource(filePath);
    if (!this.originalFileExists(filePath)) {
      throw syntaxError2(`Error: Resource file not found: ${filePath}`);
    }
    return assert(this.context.readFile(filePath));
  }
  getOutputName(filePath) {
    return relative4(this.getCurrentDirectory(), filePath);
  }
  hasBundleIndex(filePath) {
    const checkBundleIndex = (directory) => {
      let result = this.flatModuleIndexCache.get(directory);
      if (result == null) {
        if (basename5(directory) == "node_module") {
          result = false;
        } else {
          try {
            const packageFile = join5(directory, "package.json");
            if (this.originalFileExists(packageFile)) {
              result = false;
              const packageContent = JSON.parse(assert(this.context.readFile(packageFile)));
              if (packageContent.typings) {
                const typings = normalize3(join5(directory, packageContent.typings));
                if (DTS2.test(typings)) {
                  const metadataFile = typings.replace(DTS2, ".metadata.json");
                  if (this.originalFileExists(metadataFile)) {
                    const metadata = JSON.parse(assert(this.context.readFile(metadataFile)));
                    if (metadata.flatModuleIndexRedirect) {
                      this.flatModuleIndexRedirectNames.add(typings);
                    } else if (metadata.importAs) {
                      this.flatModuleIndexNames.add(typings);
                      result = true;
                    }
                  }
                }
              }
            } else {
              const parent = dirname5(directory);
              if (parent != directory) {
                result = checkBundleIndex(parent);
              } else {
                result = false;
              }
            }
          } catch {
            result = false;
          }
        }
        this.flatModuleIndexCache.set(directory, result);
      }
      return result;
    };
    return checkBundleIndex(dirname5(filePath));
  }
};
function genFileExternalReferences(genFile) {
  return new Set(collectExternalReferences(genFile.stmts).map((er) => er.moduleName));
}
function addReferencesToSourceFile(sf, genFileNames) {
  let originalReferencedFiles = sf.originalReferencedFiles;
  if (!originalReferencedFiles) {
    originalReferencedFiles = sf.referencedFiles;
    sf.originalReferencedFiles = originalReferencedFiles;
  }
  const newReferencedFiles = [...originalReferencedFiles];
  genFileNames.forEach((gf) => newReferencedFiles.push({ fileName: gf, pos: 0, end: 0 }));
  sf.referencedFiles = newReferencedFiles;
}
function getOriginalReferences(sourceFile) {
  return sourceFile && sourceFile.originalReferencedFiles;
}
function dotRelative(from, to) {
  const rPath = relative4(from, to).replace(/\\/g, "/");
  return rPath.startsWith(".") ? rPath : "./" + rPath;
}
function getPackageName(filePath) {
  const match = NODE_MODULES_PACKAGE_NAME.exec(filePath);
  return match ? match[1] : null;
}
function stripNodeModulesPrefix(filePath) {
  return filePath.replace(/.*node_modules\//, "");
}
function stripNgResourceSuffix(fileName) {
  return fileName.replace(/\.\$ngresource\$.*/, "");
}
function addNgResourceSuffix(fileName) {
  return `${fileName}.$ngresource$`;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/program.mjs
import { core, createAotCompiler, getMissingNgModuleMetadataErrorData, getParseErrors, isFormattedError, isSyntaxError } from "@angular/compiler";
import {
  readFileSync as readFileSync2
} from "fs";
import * as path6 from "path";
import ts84 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/diagnostics/translate_diagnostics.mjs
import ts10 from "typescript";
function translateDiagnostics(host, untranslatedDiagnostics) {
  const ts88 = [];
  const ng2 = [];
  untranslatedDiagnostics.forEach((diagnostic) => {
    if (diagnostic.file && diagnostic.start && GENERATED_FILES.test(diagnostic.file.fileName)) {
      if (diagnostic.code === 6133) {
        return;
      }
      const span = sourceSpanOf(host, diagnostic.file, diagnostic.start);
      if (span) {
        const fileName = span.start.file.url;
        ng2.push({
          messageText: diagnosticMessageToString(diagnostic.messageText),
          category: diagnostic.category,
          span,
          source: SOURCE,
          code: DEFAULT_ERROR_CODE
        });
      }
    } else {
      ts88.push(diagnostic);
    }
  });
  return { ts: ts88, ng: ng2 };
}
function sourceSpanOf(host, source, start) {
  const { line, character } = ts10.getLineAndCharacterOfPosition(source, start);
  return host.parseSourceSpanOf(source.fileName, line, character);
}
function diagnosticMessageToString(message) {
  return ts10.flattenDiagnosticMessageText(message, "\n");
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/core/src/compiler.mjs
import ts72 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/component.mjs
import { compileClassMetadata as compileClassMetadata3, compileComponentFromMetadata, compileDeclareClassMetadata as compileDeclareClassMetadata3, compileDeclareComponentFromMetadata, CssSelector, DEFAULT_INTERPOLATION_CONFIG, DomElementSchemaRegistry, ExternalExpr as ExternalExpr7, FactoryTarget as FactoryTarget3, InterpolationConfig, makeBindingParser as makeBindingParser2, ParseSourceFile as ParseSourceFile2, parseTemplate, R3TargetBinder, SelectorMatcher, ViewEncapsulation, WrappedNodeExpr as WrappedNodeExpr6 } from "@angular/compiler";
import ts39 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/imports/src/alias.mjs
import { ExternalExpr as ExternalExpr2 } from "@angular/compiler";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/imports/src/emitter.mjs
import { ExternalExpr, ExternalReference, WrappedNodeExpr } from "@angular/compiler";
import ts13 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/util/src/typescript.mjs
import ts11 from "typescript";
var TS2 = /\.tsx?$/i;
var D_TS = /\.d\.ts$/i;
function isSymbolWithValueDeclaration(symbol) {
  return symbol != null && symbol.valueDeclaration !== void 0 && symbol.declarations !== void 0;
}
function isDtsPath(filePath) {
  return D_TS.test(filePath);
}
function isNonDeclarationTsPath(filePath) {
  return TS2.test(filePath) && !D_TS.test(filePath);
}
function nodeNameForError(node) {
  if (node.name !== void 0 && ts11.isIdentifier(node.name)) {
    return node.name.text;
  } else {
    const kind = ts11.SyntaxKind[node.kind];
    const { line, character } = ts11.getLineAndCharacterOfPosition(node.getSourceFile(), node.getStart());
    return `${kind}@${line}:${character}`;
  }
}
function getSourceFile(node) {
  const directSf = node.getSourceFile();
  return directSf !== void 0 ? directSf : ts11.getOriginalNode(node).getSourceFile();
}
function getSourceFileOrNull(program, fileName) {
  return program.getSourceFile(fileName) || null;
}
function getTokenAtPosition(sf, pos) {
  return ts11.getTokenAtPosition(sf, pos);
}
function identifierOfNode(decl) {
  if (decl.name !== void 0 && ts11.isIdentifier(decl.name)) {
    return decl.name;
  } else {
    return null;
  }
}
function isDeclaration(node) {
  return isValueDeclaration(node) || isTypeDeclaration(node);
}
function isValueDeclaration(node) {
  return ts11.isClassDeclaration(node) || ts11.isFunctionDeclaration(node) || ts11.isVariableDeclaration(node);
}
function isTypeDeclaration(node) {
  return ts11.isEnumDeclaration(node) || ts11.isTypeAliasDeclaration(node) || ts11.isInterfaceDeclaration(node);
}
function isNamedDeclaration(node) {
  const namedNode = node;
  return namedNode.name !== void 0 && ts11.isIdentifier(namedNode.name);
}
function getRootDirs(host, options) {
  const rootDirs = [];
  const cwd = host.getCurrentDirectory();
  const fs5 = getFileSystem();
  if (options.rootDirs !== void 0) {
    rootDirs.push(...options.rootDirs);
  } else if (options.rootDir !== void 0) {
    rootDirs.push(options.rootDir);
  } else {
    rootDirs.push(cwd);
  }
  return rootDirs.map((rootDir) => fs5.resolve(cwd, host.getCanonicalFileName(rootDir)));
}
function nodeDebugInfo(node) {
  const sf = getSourceFile(node);
  const { line, character } = ts11.getLineAndCharacterOfPosition(sf, node.pos);
  return `[${sf.fileName}: ${ts11.SyntaxKind[node.kind]} @ ${line}:${character}]`;
}
function resolveModuleName(moduleName, containingFile, compilerOptions, compilerHost, moduleResolutionCache) {
  if (compilerHost.resolveModuleNames) {
    return compilerHost.resolveModuleNames([moduleName], containingFile, void 0, void 0, compilerOptions)[0];
  } else {
    return ts11.resolveModuleName(moduleName, containingFile, compilerOptions, compilerHost, moduleResolutionCache !== null ? moduleResolutionCache : void 0).resolvedModule;
  }
}
function isAssignment(node) {
  return ts11.isBinaryExpression(node) && node.operatorToken.kind === ts11.SyntaxKind.EqualsToken;
}
function toUnredirectedSourceFile(sf) {
  const redirectInfo = sf.redirectInfo;
  if (redirectInfo === void 0) {
    return sf;
  }
  return redirectInfo.unredirected;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/imports/src/find_export.mjs
import ts12 from "typescript";
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
      throw new Error(`Debug assert: unable to import a Reference to non-declaration of type ${ts13.SyntaxKind[ref.node.kind]}.`);
    } else if ((importFlags & ImportFlags.AllowTypeImports) === 0 && isTypeDeclaration(ref.node)) {
      throw new Error(`Importing a type-only declaration of type ${ts13.SyntaxKind[ref.node.kind]} in a value position is not allowed.`);
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
function normalizeSeparators2(path8) {
  return path8.replace(/\\/g, "/");
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
import ts14 from "typescript";
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
    const originalSf = ts14.getOriginalNode(sf);
    if (!this.sourceFileToUsedImports.has(originalSf)) {
      return sf;
    }
    const importsToPreserve = this.sourceFileToUsedImports.get(originalSf);
    const statements = sf.statements.map((stmt) => {
      if (ts14.isImportDeclaration(stmt) && importsToPreserve.has(stmt)) {
        stmt = ts14.getMutableClone(stmt);
      }
      return stmt;
    });
    this.sourceFileToUsedImports.delete(originalSf);
    return ts14.updateSourceFileNode(sf, statements);
  }
};

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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/incremental/semantic_graph/src/api.mjs
import ts15 from "typescript";
var SemanticSymbol = class {
  constructor(decl) {
    this.decl = decl;
    this.path = absoluteFromSourceFile(decl.getSourceFile());
    this.identifier = getSymbolIdentifier(decl);
  }
};
function getSymbolIdentifier(decl) {
  if (!ts15.isSourceFile(decl.parent)) {
    return null;
  }
  return decl.name.text;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/incremental/semantic_graph/src/graph.mjs
import { ExternalExpr as ExternalExpr3 } from "@angular/compiler";
var OpaqueSymbol = class extends SemanticSymbol {
  isPublicApiAffected() {
    return false;
  }
  isTypeCheckApiAffected() {
    return false;
  }
};
var SemanticDepGraph = class {
  constructor() {
    this.files = new Map();
    this.symbolByDecl = new Map();
  }
  registerSymbol(symbol) {
    this.symbolByDecl.set(symbol.decl, symbol);
    if (symbol.identifier !== null) {
      if (!this.files.has(symbol.path)) {
        this.files.set(symbol.path, new Map());
      }
      this.files.get(symbol.path).set(symbol.identifier, symbol);
    }
  }
  getEquivalentSymbol(symbol) {
    let previousSymbol = this.getSymbolByDecl(symbol.decl);
    if (previousSymbol === null && symbol.identifier !== null) {
      previousSymbol = this.getSymbolByName(symbol.path, symbol.identifier);
    }
    return previousSymbol;
  }
  getSymbolByName(path8, identifier) {
    if (!this.files.has(path8)) {
      return null;
    }
    const file = this.files.get(path8);
    if (!file.has(identifier)) {
      return null;
    }
    return file.get(identifier);
  }
  getSymbolByDecl(decl) {
    if (!this.symbolByDecl.has(decl)) {
      return null;
    }
    return this.symbolByDecl.get(decl);
  }
};
var SemanticDepGraphUpdater = class {
  constructor(priorGraph) {
    this.priorGraph = priorGraph;
    this.newGraph = new SemanticDepGraph();
    this.opaqueSymbols = new Map();
  }
  registerSymbol(symbol) {
    this.newGraph.registerSymbol(symbol);
  }
  finalize() {
    if (this.priorGraph === null) {
      return {
        needsEmit: new Set(),
        needsTypeCheckEmit: new Set(),
        newGraph: this.newGraph
      };
    }
    const needsEmit = this.determineInvalidatedFiles(this.priorGraph);
    const needsTypeCheckEmit = this.determineInvalidatedTypeCheckFiles(this.priorGraph);
    return {
      needsEmit,
      needsTypeCheckEmit,
      newGraph: this.newGraph
    };
  }
  determineInvalidatedFiles(priorGraph) {
    const isPublicApiAffected = new Set();
    for (const symbol of this.newGraph.symbolByDecl.values()) {
      const previousSymbol = priorGraph.getEquivalentSymbol(symbol);
      if (previousSymbol === null || symbol.isPublicApiAffected(previousSymbol)) {
        isPublicApiAffected.add(symbol);
      }
    }
    const needsEmit = new Set();
    for (const symbol of this.newGraph.symbolByDecl.values()) {
      if (symbol.isEmitAffected === void 0) {
        continue;
      }
      const previousSymbol = priorGraph.getEquivalentSymbol(symbol);
      if (previousSymbol === null || symbol.isEmitAffected(previousSymbol, isPublicApiAffected)) {
        needsEmit.add(symbol.path);
      }
    }
    return needsEmit;
  }
  determineInvalidatedTypeCheckFiles(priorGraph) {
    const isTypeCheckApiAffected = new Set();
    for (const symbol of this.newGraph.symbolByDecl.values()) {
      const previousSymbol = priorGraph.getEquivalentSymbol(symbol);
      if (previousSymbol === null || symbol.isTypeCheckApiAffected(previousSymbol)) {
        isTypeCheckApiAffected.add(symbol);
      }
    }
    const needsTypeCheckEmit = new Set();
    for (const symbol of this.newGraph.symbolByDecl.values()) {
      if (symbol.isTypeCheckBlockAffected === void 0) {
        continue;
      }
      const previousSymbol = priorGraph.getEquivalentSymbol(symbol);
      if (previousSymbol === null || symbol.isTypeCheckBlockAffected(previousSymbol, isTypeCheckApiAffected)) {
        needsTypeCheckEmit.add(symbol.path);
      }
    }
    return needsTypeCheckEmit;
  }
  getSemanticReference(decl, expr) {
    return {
      symbol: this.getSymbol(decl),
      importPath: getImportPath(expr)
    };
  }
  getSymbol(decl) {
    const symbol = this.newGraph.getSymbolByDecl(decl);
    if (symbol === null) {
      return this.getOpaqueSymbol(decl);
    }
    return symbol;
  }
  getOpaqueSymbol(decl) {
    if (this.opaqueSymbols.has(decl)) {
      return this.opaqueSymbols.get(decl);
    }
    const symbol = new OpaqueSymbol(decl);
    this.opaqueSymbols.set(decl, symbol);
    return symbol;
  }
};
function getImportPath(expr) {
  if (expr instanceof ExternalExpr3) {
    return `${expr.value.moduleName}$${expr.value.name}`;
  } else {
    return null;
  }
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/incremental/semantic_graph/src/type_parameters.mjs
import ts16 from "typescript";

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
  if (!ts16.isClassDeclaration(node) || node.typeParameters === void 0) {
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
import ts22 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/reflection/src/host.mjs
import ts17 from "typescript";
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
  return ts17.isIdentifier(exp) || ts17.isPropertyAccessExpression(exp) && ts17.isIdentifier(exp.expression) && ts17.isIdentifier(exp.name);
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
import ts18 from "typescript";
function typeToValue(typeNode, checker) {
  if (typeNode === null) {
    return missingType();
  }
  if (!ts18.isTypeReferenceNode(typeNode)) {
    return unsupportedType(typeNode);
  }
  const symbols = resolveTypeSymbols(typeNode, checker);
  if (symbols === null) {
    return unknownReference(typeNode);
  }
  const { local, decl } = symbols;
  if (decl.valueDeclaration === void 0 || decl.flags & ts18.SymbolFlags.ConstEnum) {
    let typeOnlyDecl = null;
    if (decl.declarations !== void 0 && decl.declarations.length > 0) {
      typeOnlyDecl = decl.declarations[0];
    }
    return noValueDeclaration(typeNode, typeOnlyDecl);
  }
  const firstDecl = local.declarations && local.declarations[0];
  if (firstDecl !== void 0) {
    if (ts18.isImportClause(firstDecl) && firstDecl.name !== void 0) {
      if (firstDecl.isTypeOnly) {
        return typeOnlyImport(typeNode, firstDecl);
      }
      return {
        kind: 0,
        expression: firstDecl.name,
        defaultImportStatement: firstDecl.parent
      };
    } else if (ts18.isImportSpecifier(firstDecl)) {
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
    } else if (ts18.isNamespaceImport(firstDecl)) {
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
  if (ts18.isTypeReferenceNode(node)) {
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
  while (ts18.isQualifiedName(leftMost)) {
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
  if (typeRefSymbol.flags & ts18.SymbolFlags.Alias) {
    decl = checker.getAliasedSymbol(typeRefSymbol);
  }
  return { local, decl, symbolNames };
}
function entityNameToValue(node) {
  if (ts18.isQualifiedName(node)) {
    const left = entityNameToValue(node.left);
    return left !== null ? ts18.createPropertyAccess(left, node.right) : null;
  } else if (ts18.isIdentifier(node)) {
    return ts18.getMutableClone(node);
  } else {
    return null;
  }
}
function extractModuleName(node) {
  if (!ts18.isStringLiteral(node.moduleSpecifier)) {
    throw new Error("not a module specifier");
  }
  return node.moduleSpecifier.text;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/reflection/src/typescript.mjs
import ts20 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/reflection/src/util.mjs
import ts19 from "typescript";
function isNamedClassDeclaration(node) {
  return ts19.isClassDeclaration(node) && isIdentifier(node.name);
}
function isIdentifier(node) {
  return node !== void 0 && ts19.isIdentifier(node);
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
    const ctor = tsClazz.members.find((member) => ts20.isConstructorDeclaration(member) && (isDeclaration2 || member.body !== void 0));
    if (ctor === void 0) {
      return null;
    }
    return ctor.parameters.map((node) => {
      const name = parameterName(node.name);
      const decorators = this.getDecoratorsOfDeclaration(node);
      let originalTypeNode = node.type || null;
      let typeNode = originalTypeNode;
      if (typeNode && ts20.isUnionTypeNode(typeNode)) {
        let childTypeNodes = typeNode.types.filter((childTypeNode) => !(ts20.isLiteralTypeNode(childTypeNode) && childTypeNode.literal.kind === ts20.SyntaxKind.NullKeyword));
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
    } else if (ts20.isQualifiedName(id.parent) && id.parent.right === id) {
      return this.getImportOfNamespacedIdentifier(id, getQualifiedNameRoot(id.parent));
    } else if (ts20.isPropertyAccessExpression(id.parent) && id.parent.name === id) {
      return this.getImportOfNamespacedIdentifier(id, getFarLeftIdentifier(id.parent));
    } else {
      return null;
    }
  }
  getExportsOfModule(node) {
    if (!ts20.isSourceFile(node)) {
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
    if (!(ts20.isClassDeclaration(clazz) || ts20.isClassExpression(clazz)) || clazz.heritageClauses === void 0) {
      return null;
    }
    const extendsClause = clazz.heritageClauses.find((clause) => clause.token === ts20.SyntaxKind.ExtendsKeyword);
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
    if (!ts20.isFunctionDeclaration(node) && !ts20.isMethodDeclaration(node) && !ts20.isFunctionExpression(node)) {
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
    if (!ts20.isClassDeclaration(clazz)) {
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
    if (ts20.isVariableDeclaration(decl) && ts20.isVariableDeclarationList(decl.parent)) {
      topLevel = decl.parent.parent;
    }
    if (topLevel.modifiers !== void 0 && topLevel.modifiers.some((modifier) => modifier.kind === ts20.SyntaxKind.ExportKeyword)) {
      return true;
    }
    if (topLevel.parent === void 0 || !ts20.isSourceFile(topLevel.parent)) {
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
    if (!ts20.isStringLiteral(importDecl.moduleSpecifier)) {
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
    const namespaceDeclaration = ts20.isNamespaceImport(declaration) ? declaration : null;
    if (!namespaceDeclaration) {
      return null;
    }
    const importDeclaration = namespaceDeclaration.parent.parent;
    if (!ts20.isStringLiteral(importDeclaration.moduleSpecifier)) {
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
    if (valueDeclaration !== void 0 && ts20.isShorthandPropertyAssignment(valueDeclaration)) {
      const shorthandSymbol = this.checker.getShorthandAssignmentValueSymbol(valueDeclaration);
      if (shorthandSymbol === void 0) {
        return null;
      }
      return this.getDeclarationOfSymbol(shorthandSymbol, originalId);
    } else if (valueDeclaration !== void 0 && ts20.isExportSpecifier(valueDeclaration)) {
      const targetSymbol = this.checker.getExportSpecifierLocalTargetSymbol(valueDeclaration);
      if (targetSymbol === void 0) {
        return null;
      }
      return this.getDeclarationOfSymbol(targetSymbol, originalId);
    }
    const importInfo = originalId && this.getImportOfIdentifier(originalId);
    const viaModule = importInfo !== null && importInfo.from !== null && !importInfo.from.startsWith(".") ? importInfo.from : null;
    while (symbol.flags & ts20.SymbolFlags.Alias) {
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
    let args2 = null;
    if (ts20.isCallExpression(decoratorExpr)) {
      args2 = Array.from(decoratorExpr.arguments);
      decoratorExpr = decoratorExpr.expression;
    }
    if (!isDecoratorIdentifier(decoratorExpr)) {
      return null;
    }
    const decoratorIdentifier = ts20.isIdentifier(decoratorExpr) ? decoratorExpr : decoratorExpr.name;
    const importDecl = this.getImportOfIdentifier(decoratorIdentifier);
    return {
      name: decoratorIdentifier.text,
      identifier: decoratorExpr,
      import: importDecl,
      node,
      args: args2
    };
  }
  _reflectMember(node) {
    let kind = null;
    let value = null;
    let name = null;
    let nameNode = null;
    if (ts20.isPropertyDeclaration(node)) {
      kind = ClassMemberKind.Property;
      value = node.initializer || null;
    } else if (ts20.isGetAccessorDeclaration(node)) {
      kind = ClassMemberKind.Getter;
    } else if (ts20.isSetAccessorDeclaration(node)) {
      kind = ClassMemberKind.Setter;
    } else if (ts20.isMethodDeclaration(node)) {
      kind = ClassMemberKind.Method;
    } else if (ts20.isConstructorDeclaration(node)) {
      kind = ClassMemberKind.Constructor;
    } else {
      return null;
    }
    if (ts20.isConstructorDeclaration(node)) {
      name = "constructor";
    } else if (ts20.isIdentifier(node.name)) {
      name = node.name.text;
      nameNode = node.name;
    } else if (ts20.isStringLiteral(node.name)) {
      name = node.name.text;
      nameNode = node.name;
    } else {
      return null;
    }
    const decorators = this.getDecoratorsOfDeclaration(node);
    const isStatic2 = node.modifiers !== void 0 && node.modifiers.some((mod) => mod.kind === ts20.SyntaxKind.StaticKeyword);
    return {
      node,
      implementation: node,
      kind,
      type: node.type || null,
      name,
      nameNode,
      decorators,
      value,
      isStatic: isStatic2
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
      if (exportedSymbol.flags & ts20.SymbolFlags.Alias) {
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
  while (realSymbol.flags & ts20.SymbolFlags.Alias) {
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
  if (ts20.isQualifiedName(type)) {
    if (!ts20.isIdentifier(type.left)) {
      throw new Error(`Cannot handle qualified name with non-identifier lhs`);
    }
    const symbol = checker.getSymbolAtLocation(type.left);
    if (symbol === void 0 || symbol.declarations === void 0 || symbol.declarations.length !== 1) {
      throw new Error(`Cannot resolve qualified type entity lhs to symbol`);
    }
    const decl = symbol.declarations[0];
    if (ts20.isNamespaceImport(decl)) {
      const clause = decl.parent;
      const importDecl = clause.parent;
      if (!ts20.isStringLiteral(importDecl.moduleSpecifier)) {
        throw new Error(`Module specifier is not a string`);
      }
      return { node, from: importDecl.moduleSpecifier.text };
    } else if (ts20.isModuleDeclaration(decl)) {
      return { node, from: null };
    } else {
      throw new Error(`Unknown import type?`);
    }
  } else {
    return { node, from: null };
  }
}
function filterToMembersWithDecorator(members, name, module2) {
  return members.filter((member) => !member.isStatic).map((member) => {
    if (member.decorators === null) {
      return null;
    }
    const decorators = member.decorators.filter((dec) => {
      if (dec.import !== null) {
        return dec.import.name === name && (module2 === void 0 || dec.import.from === module2);
      } else {
        return dec.name === name && module2 === void 0;
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
    if (ts20.isPropertyAssignment(prop)) {
      const name = propertyNameToString(prop.name);
      if (name === null) {
        return;
      }
      map.set(name, prop.initializer);
    } else if (ts20.isShorthandPropertyAssignment(prop)) {
      map.set(prop.name.text, prop.name);
    } else {
      return;
    }
  });
  return map;
}
function castDeclarationToClassOrDie(declaration) {
  if (!ts20.isClassDeclaration(declaration)) {
    throw new Error(`Reflecting on a ${ts20.SyntaxKind[declaration.kind]} instead of a ClassDeclaration.`);
  }
  return declaration;
}
function parameterName(name) {
  if (ts20.isIdentifier(name)) {
    return name.text;
  } else {
    return null;
  }
}
function propertyNameToString(node) {
  if (ts20.isIdentifier(node) || ts20.isStringLiteral(node) || ts20.isNumericLiteral(node)) {
    return node.text;
  } else {
    return null;
  }
}
function getQualifiedNameRoot(qualifiedName) {
  while (ts20.isQualifiedName(qualifiedName.left)) {
    qualifiedName = qualifiedName.left;
  }
  return ts20.isIdentifier(qualifiedName.left) ? qualifiedName.left : null;
}
function getFarLeftIdentifier(propertyAccess) {
  while (ts20.isPropertyAccessExpression(propertyAccess.expression)) {
    propertyAccess = propertyAccess.expression;
  }
  return ts20.isIdentifier(propertyAccess.expression) ? propertyAccess.expression : null;
}
function getContainingImportDeclaration(node) {
  return ts20.isImportSpecifier(node) ? node.parent.parent.parent : ts20.isNamespaceImport(node) ? node.parent.parent : null;
}
function getExportedName(decl, originalId) {
  return ts20.isImportSpecifier(decl) ? (decl.propertyName !== void 0 ? decl.propertyName : decl.name).text : originalId.text;
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
import ts21 from "typescript";
function extractReferencesFromType(checker, def, bestGuessOwningModule) {
  if (!ts21.isTupleTypeNode(def)) {
    return [];
  }
  return def.elements.map((element) => {
    if (!ts21.isTypeQueryNode(element)) {
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
  if (!ts21.isLiteralTypeNode(type) || !ts21.isStringLiteral(type.literal)) {
    return null;
  }
  return type.literal.text;
}
function readStringMapType(type) {
  if (!ts21.isTypeLiteralNode(type)) {
    return {};
  }
  const obj = {};
  type.members.forEach((member) => {
    if (!ts21.isPropertySignature(member) || member.type === void 0 || member.name === void 0 || !ts21.isStringLiteral(member.name)) {
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
  if (!ts21.isTupleTypeNode(type)) {
    return [];
  }
  const res = [];
  type.elements.forEach((el) => {
    if (!ts21.isLiteralTypeNode(el) || !ts21.isStringLiteral(el.literal)) {
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
    if (field.nameNode !== null && ts21.isStringLiteral(field.nameNode)) {
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
  return node.modifiers.some((modifier) => modifier.kind === ts21.SyntaxKind.PrivateKeyword || modifier.kind === ts21.SyntaxKind.ProtectedKeyword || modifier.kind === ts21.SyntaxKind.ReadonlyKeyword);
}
function extractTemplateGuard(member) {
  if (!member.name.startsWith("ngTemplateGuard_")) {
    return null;
  }
  const inputName = afterUnderscore(member.name);
  if (member.kind === ClassMemberKind.Property) {
    let type = null;
    if (member.type !== null && ts21.isLiteralTypeNode(member.type) && ts21.isStringLiteral(member.type.literal)) {
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
  return members.some(({ isStatic: isStatic2, name }) => isStatic2 && (name === "\u0275prov" || name === "\u0275fac"));
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
    } else if (ngModuleDef.type === null || !ts22.isTypeReferenceNode(ngModuleDef.type) || ngModuleDef.type.typeArguments === void 0 || ngModuleDef.type.typeArguments.length !== 4) {
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
    } else if (def.type === null || !ts22.isTypeReferenceNode(def.type) || def.type.typeArguments === void 0 || def.type.typeArguments.length < 2) {
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
    } else if (def.type === null || !ts22.isTypeReferenceNode(def.type) || def.type.typeArguments === void 0 || def.type.typeArguments.length < 2) {
      return null;
    }
    const type = def.type.typeArguments[1];
    if (!ts22.isLiteralTypeNode(type) || !ts22.isStringLiteral(type.literal)) {
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
      if (clause.token === ts22.SyntaxKind.ExtendsKeyword) {
        const baseExpr = clause.types[0].expression;
        let symbol = checker.getSymbolAtLocation(baseExpr);
        if (symbol === void 0) {
          return "dynamic";
        } else if (symbol.flags & ts22.SymbolFlags.Alias) {
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
    const { path: path8 } = templateResource;
    if (path8 !== null) {
      if (!this.externalTemplateToComponentsMap.has(path8)) {
        this.externalTemplateToComponentsMap.set(path8, new Set());
      }
      this.externalTemplateToComponentsMap.get(path8).add(component);
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
    const { path: path8 } = styleResource;
    if (!this.componentToStylesMap.has(component)) {
      this.componentToStylesMap.set(component, new Set());
    }
    if (path8 !== null) {
      if (!this.externalStyleToComponentsMap.has(path8)) {
        this.externalStyleToComponentsMap.set(path8, new Set());
      }
      this.externalStyleToComponentsMap.get(path8).add(component);
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
import ts23 from "typescript";

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
      case ts23.SyntaxKind.ExpressionStatement:
      case ts23.SyntaxKind.VariableStatement:
      case ts23.SyntaxKind.ReturnStatement:
      case ts23.SyntaxKind.IfStatement:
      case ts23.SyntaxKind.SwitchStatement:
      case ts23.SyntaxKind.DoStatement:
      case ts23.SyntaxKind.WhileStatement:
      case ts23.SyntaxKind.ForStatement:
      case ts23.SyntaxKind.ForInStatement:
      case ts23.SyntaxKind.ForOfStatement:
      case ts23.SyntaxKind.ContinueStatement:
      case ts23.SyntaxKind.BreakStatement:
      case ts23.SyntaxKind.ThrowStatement:
      case ts23.SyntaxKind.ObjectBindingPattern:
      case ts23.SyntaxKind.ArrayBindingPattern:
        return currentNode;
    }
    currentNode = currentNode.parent;
  }
  return node.getSourceFile();
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/partial_evaluator/src/interpreter.mjs
import ts24 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/partial_evaluator/src/builtin.mjs
var ArraySliceBuiltinFn = class extends KnownFn {
  constructor(lhs) {
    super();
    this.lhs = lhs;
  }
  evaluate(node, args2) {
    if (args2.length === 0) {
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
  evaluate(node, args2) {
    const result = [...this.lhs];
    for (const arg of args2) {
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
var StringConcatBuiltinFn = class extends KnownFn {
  constructor(lhs) {
    super();
    this.lhs = lhs;
  }
  evaluate(node, args2) {
    let result = this.lhs;
    for (const arg of args2) {
      const resolved = arg instanceof EnumValue ? arg.resolved : arg;
      if (typeof resolved === "string" || typeof resolved === "number" || typeof resolved === "boolean" || resolved == null) {
        result = result.concat(resolved);
      } else {
        return DynamicValue.fromUnknown(node);
      }
    }
    return result;
  }
};
var ObjectAssignBuiltinFn = class extends KnownFn {
  evaluate(node, args2) {
    if (args2.length === 0) {
      return DynamicValue.fromUnsupportedSyntax(node);
    }
    for (const arg of args2) {
      if (arg instanceof DynamicValue) {
        return DynamicValue.fromDynamicInput(node, arg);
      } else if (!(arg instanceof Map)) {
        return DynamicValue.fromUnsupportedSyntax(node);
      }
    }
    const [target, ...sources] = args2;
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
  evaluate(node, args2) {
    const result = [];
    for (const arg of args2) {
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
  evaluate(node, args2) {
    if (args2.length !== 2 && args2.length !== 3) {
      return DynamicValue.fromUnknown(node);
    }
    const [to, from] = args2;
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
  evaluate(node, args2) {
    if (args2.length !== 1) {
      return DynamicValue.fromUnknown(node);
    }
    const [value] = args2;
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
  [ts24.SyntaxKind.PlusToken, literalBinaryOp((a, b) => a + b)],
  [ts24.SyntaxKind.MinusToken, literalBinaryOp((a, b) => a - b)],
  [ts24.SyntaxKind.AsteriskToken, literalBinaryOp((a, b) => a * b)],
  [ts24.SyntaxKind.SlashToken, literalBinaryOp((a, b) => a / b)],
  [ts24.SyntaxKind.PercentToken, literalBinaryOp((a, b) => a % b)],
  [ts24.SyntaxKind.AmpersandToken, literalBinaryOp((a, b) => a & b)],
  [ts24.SyntaxKind.BarToken, literalBinaryOp((a, b) => a | b)],
  [ts24.SyntaxKind.CaretToken, literalBinaryOp((a, b) => a ^ b)],
  [ts24.SyntaxKind.LessThanToken, literalBinaryOp((a, b) => a < b)],
  [ts24.SyntaxKind.LessThanEqualsToken, literalBinaryOp((a, b) => a <= b)],
  [ts24.SyntaxKind.GreaterThanToken, literalBinaryOp((a, b) => a > b)],
  [ts24.SyntaxKind.GreaterThanEqualsToken, literalBinaryOp((a, b) => a >= b)],
  [ts24.SyntaxKind.EqualsEqualsToken, literalBinaryOp((a, b) => a == b)],
  [ts24.SyntaxKind.EqualsEqualsEqualsToken, literalBinaryOp((a, b) => a === b)],
  [ts24.SyntaxKind.ExclamationEqualsToken, literalBinaryOp((a, b) => a != b)],
  [ts24.SyntaxKind.ExclamationEqualsEqualsToken, literalBinaryOp((a, b) => a !== b)],
  [ts24.SyntaxKind.LessThanLessThanToken, literalBinaryOp((a, b) => a << b)],
  [ts24.SyntaxKind.GreaterThanGreaterThanToken, literalBinaryOp((a, b) => a >> b)],
  [ts24.SyntaxKind.GreaterThanGreaterThanGreaterThanToken, literalBinaryOp((a, b) => a >>> b)],
  [ts24.SyntaxKind.AsteriskAsteriskToken, literalBinaryOp((a, b) => Math.pow(a, b))],
  [ts24.SyntaxKind.AmpersandAmpersandToken, referenceBinaryOp((a, b) => a && b)],
  [ts24.SyntaxKind.BarBarToken, referenceBinaryOp((a, b) => a || b)]
]);
var UNARY_OPERATORS = new Map([
  [ts24.SyntaxKind.TildeToken, (a) => ~a],
  [ts24.SyntaxKind.MinusToken, (a) => -a],
  [ts24.SyntaxKind.PlusToken, (a) => +a],
  [ts24.SyntaxKind.ExclamationToken, (a) => !a]
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
    if (node.kind === ts24.SyntaxKind.TrueKeyword) {
      return true;
    } else if (node.kind === ts24.SyntaxKind.FalseKeyword) {
      return false;
    } else if (node.kind === ts24.SyntaxKind.NullKeyword) {
      return null;
    } else if (ts24.isStringLiteral(node)) {
      return node.text;
    } else if (ts24.isNoSubstitutionTemplateLiteral(node)) {
      return node.text;
    } else if (ts24.isTemplateExpression(node)) {
      result = this.visitTemplateExpression(node, context);
    } else if (ts24.isNumericLiteral(node)) {
      return parseFloat(node.text);
    } else if (ts24.isObjectLiteralExpression(node)) {
      result = this.visitObjectLiteralExpression(node, context);
    } else if (ts24.isIdentifier(node)) {
      result = this.visitIdentifier(node, context);
    } else if (ts24.isPropertyAccessExpression(node)) {
      result = this.visitPropertyAccessExpression(node, context);
    } else if (ts24.isCallExpression(node)) {
      result = this.visitCallExpression(node, context);
    } else if (ts24.isConditionalExpression(node)) {
      result = this.visitConditionalExpression(node, context);
    } else if (ts24.isPrefixUnaryExpression(node)) {
      result = this.visitPrefixUnaryExpression(node, context);
    } else if (ts24.isBinaryExpression(node)) {
      result = this.visitBinaryExpression(node, context);
    } else if (ts24.isArrayLiteralExpression(node)) {
      result = this.visitArrayLiteralExpression(node, context);
    } else if (ts24.isParenthesizedExpression(node)) {
      result = this.visitParenthesizedExpression(node, context);
    } else if (ts24.isElementAccessExpression(node)) {
      result = this.visitElementAccessExpression(node, context);
    } else if (ts24.isAsExpression(node)) {
      result = this.visitExpression(node.expression, context);
    } else if (ts24.isNonNullExpression(node)) {
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
      if (ts24.isSpreadElement(element)) {
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
      if (ts24.isPropertyAssignment(property)) {
        const name = this.stringNameFromPropertyName(property.name, context);
        if (name === void 0) {
          return DynamicValue.fromDynamicInput(node, DynamicValue.fromDynamicString(property.name));
        }
        map.set(name, this.visitExpression(property.initializer, context));
      } else if (ts24.isShorthandPropertyAssignment(property)) {
        const symbol = this.checker.getShorthandAssignmentValueSymbol(property);
        if (symbol === void 0 || symbol.valueDeclaration === void 0) {
          map.set(property.name.text, DynamicValue.fromUnknown(property));
        } else {
          map.set(property.name.text, this.visitDeclaration(symbol.valueDeclaration, context));
        }
      } else if (ts24.isSpreadAssignment(property)) {
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
      if (node.originalKeywordKind === ts24.SyntaxKind.UndefinedKeyword) {
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
    } else if (ts24.isVariableDeclaration(node)) {
      return this.visitVariableDeclaration(node, context);
    } else if (ts24.isParameter(node) && context.scope.has(node)) {
      return context.scope.get(node);
    } else if (ts24.isExportAssignment(node)) {
      return this.visitExpression(node.expression, context);
    } else if (ts24.isEnumDeclaration(node)) {
      return this.visitEnumDeclaration(node, context);
    } else if (ts24.isSourceFile(node)) {
      return this.visitSourceFile(node, context);
    } else if (ts24.isBindingElement(node)) {
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
    } else if (typeof lhs === "string" && rhs === "concat") {
      return new StringConcatBuiltinFn(lhs);
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
    } else if (fn.body.length !== 1 || !ts24.isReturnStatement(fn.body[0])) {
      return DynamicValue.fromComplexFunctionCall(node, fn);
    }
    const ret = fn.body[0];
    const args2 = this.evaluateFunctionArguments(node, context);
    const newScope = new Map();
    const calleeContext = __spreadProps(__spreadValues({}, context), { scope: newScope });
    fn.parameters.forEach((param, index) => {
      let arg = args2[index];
      if (param.node.dotDotDotToken !== void 0) {
        arg = args2.slice(index);
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
    const args2 = [];
    for (const arg of node.arguments) {
      if (ts24.isSpreadElement(arg)) {
        args2.push(...this.visitSpreadElement(arg, context));
      } else {
        args2.push(this.visitExpression(arg, context));
      }
    }
    return args2;
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
    const path8 = [];
    let closestDeclaration = node;
    while (ts24.isBindingElement(closestDeclaration) || ts24.isArrayBindingPattern(closestDeclaration) || ts24.isObjectBindingPattern(closestDeclaration)) {
      if (ts24.isBindingElement(closestDeclaration)) {
        path8.unshift(closestDeclaration);
      }
      closestDeclaration = closestDeclaration.parent;
    }
    if (!ts24.isVariableDeclaration(closestDeclaration) || closestDeclaration.initializer === void 0) {
      return DynamicValue.fromUnknown(node);
    }
    let value = this.visit(closestDeclaration.initializer, context);
    for (const element of path8) {
      let key;
      if (ts24.isArrayBindingPattern(element.parent)) {
        key = element.parent.elements.indexOf(element);
      } else {
        const name = element.propertyName || element.name;
        if (ts24.isIdentifier(name)) {
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
    if (ts24.isIdentifier(node) || ts24.isStringLiteral(node) || ts24.isNumericLiteral(node)) {
      return node.text;
    } else if (ts24.isComputedPropertyName(node)) {
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
    if (ts24.isLiteralTypeNode(node)) {
      return this.visitExpression(node.literal, context);
    } else if (ts24.isTupleTypeNode(node)) {
      return this.visitTupleType(node, context);
    } else if (ts24.isNamedTupleMember(node)) {
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
  return ts24.isFunctionDeclaration(ref.node) || ts24.isMethodDeclaration(ref.node) || ts24.isFunctionExpression(ref.node);
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
  if (node.parent === void 0 || !ts24.isVariableDeclarationList(node.parent)) {
    return false;
  }
  const declList = node.parent;
  if (declList.parent === void 0 || !ts24.isVariableStatement(declList.parent)) {
    return false;
  }
  const varStmt = declList.parent;
  return varStmt.modifiers !== void 0 && varStmt.modifiers.some((mod) => mod.kind === ts24.SyntaxKind.DeclareKeyword);
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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/perf/src/clock.mjs
function mark() {
  return process.hrtime();
}
function timeSinceInMicros(mark2) {
  const delta = process.hrtime(mark2);
  return delta[0] * 1e6 + Math.floor(delta[1] / 1e3);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/perf/src/recorder.mjs
var ActivePerfRecorder = class {
  constructor(zeroTime) {
    this.zeroTime = zeroTime;
    this.currentPhase = PerfPhase.Unaccounted;
    this.currentPhaseEntered = this.zeroTime;
    this.counters = Array(PerfEvent.LAST).fill(0);
    this.phaseTime = Array(PerfPhase.LAST).fill(0);
    this.bytes = Array(PerfCheckpoint.LAST).fill(0);
    this.memory(PerfCheckpoint.Initial);
  }
  static zeroedToNow() {
    return new ActivePerfRecorder(mark());
  }
  reset() {
    this.counters = Array(PerfEvent.LAST).fill(0);
    this.phaseTime = Array(PerfPhase.LAST).fill(0);
    this.bytes = Array(PerfCheckpoint.LAST).fill(0);
    this.zeroTime = mark();
    this.currentPhase = PerfPhase.Unaccounted;
    this.currentPhaseEntered = this.zeroTime;
  }
  memory(after) {
    this.bytes[after] = process.memoryUsage().heapUsed;
  }
  phase(phase) {
    const previous = this.currentPhase;
    this.phaseTime[this.currentPhase] += timeSinceInMicros(this.currentPhaseEntered);
    this.currentPhase = phase;
    this.currentPhaseEntered = mark();
    return previous;
  }
  inPhase(phase, fn) {
    const previousPhase = this.phase(phase);
    try {
      return fn();
    } finally {
      this.phase(previousPhase);
    }
  }
  eventCount(counter, incrementBy = 1) {
    this.counters[counter] += incrementBy;
  }
  finalize() {
    this.phase(PerfPhase.Unaccounted);
    const results = {
      events: {},
      phases: {},
      memory: {}
    };
    for (let i = 0; i < this.phaseTime.length; i++) {
      if (this.phaseTime[i] > 0) {
        results.phases[PerfPhase[i]] = this.phaseTime[i];
      }
    }
    for (let i = 0; i < this.phaseTime.length; i++) {
      if (this.counters[i] > 0) {
        results.events[PerfEvent[i]] = this.counters[i];
      }
    }
    for (let i = 0; i < this.bytes.length; i++) {
      if (this.bytes[i] > 0) {
        results.memory[PerfCheckpoint[i]] = this.bytes[i];
      }
    }
    return results;
  }
};
var DelegatingPerfRecorder = class {
  constructor(target) {
    this.target = target;
  }
  eventCount(counter, incrementBy) {
    this.target.eventCount(counter, incrementBy);
  }
  phase(phase) {
    return this.target.phase(phase);
  }
  inPhase(phase, fn) {
    const previousPhase = this.target.phase(phase);
    try {
      return fn();
    } finally {
      this.target.phase(previousPhase);
    }
  }
  memory(after) {
    this.target.memory(after);
  }
  reset() {
    this.target.reset();
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
import ts25 from "typescript";
function aliasTransformFactory(exportStatements) {
  return (context) => {
    return (file) => {
      if (ts25.isBundle(file) || !exportStatements.has(file.fileName)) {
        return file;
      }
      const statements = [...file.statements];
      exportStatements.get(file.fileName).forEach(([moduleName, symbolName], aliasName) => {
        const stmt = ts25.createExportDeclaration(void 0, void 0, ts25.createNamedExports([ts25.createExportSpecifier(symbolName, aliasName)]), ts25.createStringLiteral(moduleName));
        statements.push(stmt);
      });
      return ts25.updateSourceFileNode(file, statements);
    };
  };
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/transform/src/compilation.mjs
import ts26 from "typescript";

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
      ts26.forEachChild(node, visit2);
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
            category: ts26.DiagnosticCategory.Error,
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
    const original = ts26.getOriginalNode(clazz);
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
    const original = ts26.getOriginalNode(node);
    if (!this.reflector.isClass(original) || !this.classes.has(original)) {
      return [];
    }
    const record = this.classes.get(original);
    const decorators = [];
    for (const trait of record.traits) {
      if (trait.state !== TraitState.Resolved) {
        continue;
      }
      if (trait.detected.trigger !== null && ts26.isDecorator(trait.detected.trigger)) {
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
import ts31 from "typescript";

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
import ts27 from "typescript";
var ImportManager = class {
  constructor(rewriter = new NoopImportRewriter(), prefix = "i") {
    this.rewriter = rewriter;
    this.prefix = prefix;
    this.specifierToIdentifier = new Map();
    this.nextIndex = 0;
  }
  generateNamespaceImport(moduleName) {
    if (!this.specifierToIdentifier.has(moduleName)) {
      this.specifierToIdentifier.set(moduleName, ts27.createIdentifier(`${this.prefix}${this.nextIndex++}`));
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
import ts28 from "typescript";
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
        return ts28.createKeywordTypeNode(ts28.SyntaxKind.BooleanKeyword);
      case BuiltinTypeName.Dynamic:
        return ts28.createKeywordTypeNode(ts28.SyntaxKind.AnyKeyword);
      case BuiltinTypeName.Int:
      case BuiltinTypeName.Number:
        return ts28.createKeywordTypeNode(ts28.SyntaxKind.NumberKeyword);
      case BuiltinTypeName.String:
        return ts28.createKeywordTypeNode(ts28.SyntaxKind.StringKeyword);
      case BuiltinTypeName.None:
        return ts28.createKeywordTypeNode(ts28.SyntaxKind.NeverKeyword);
      default:
        throw new Error(`Unsupported builtin type: ${BuiltinTypeName[type.name]}`);
    }
  }
  visitExpressionType(type, context) {
    const typeNode = this.translateExpression(type.value, context);
    if (type.typeParams === null) {
      return typeNode;
    }
    if (!ts28.isTypeReferenceNode(typeNode)) {
      throw new Error("An ExpressionType with type arguments must translate into a TypeReferenceNode");
    } else if (typeNode.typeArguments !== void 0) {
      throw new Error(`An ExpressionType with type arguments cannot have multiple levels of type arguments`);
    }
    const typeArgs = type.typeParams.map((param) => this.translateType(param, context));
    return ts28.createTypeReferenceNode(typeNode.typeName, typeArgs);
  }
  visitArrayType(type, context) {
    return ts28.createArrayTypeNode(this.translateType(type.of, context));
  }
  visitMapType(type, context) {
    const parameter = ts28.createParameter(void 0, void 0, void 0, "key", void 0, ts28.createKeywordTypeNode(ts28.SyntaxKind.StringKeyword));
    const typeArgs = type.valueType !== null ? this.translateType(type.valueType, context) : ts28.createKeywordTypeNode(ts28.SyntaxKind.UnknownKeyword);
    const indexSignature = ts28.createIndexSignature(void 0, void 0, [parameter], typeArgs);
    return ts28.createTypeLiteralNode([indexSignature]);
  }
  visitReadVarExpr(ast, context) {
    if (ast.name === null) {
      throw new Error(`ReadVarExpr with no variable name in type`);
    }
    return ts28.createTypeQueryNode(ts28.createIdentifier(ast.name));
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
      return ts28.createLiteralTypeNode(ts28.createNull());
    } else if (ast.value === void 0) {
      return ts28.createKeywordTypeNode(ts28.SyntaxKind.UndefinedKeyword);
    } else if (typeof ast.value === "boolean") {
      return ts28.createLiteralTypeNode(ts28.createLiteral(ast.value));
    } else if (typeof ast.value === "number") {
      return ts28.createLiteralTypeNode(ts28.createLiteral(ast.value));
    } else {
      return ts28.createLiteralTypeNode(ts28.createLiteral(ast.value));
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
    const symbolIdentifier = ts28.createIdentifier(symbol);
    const typeName = moduleImport ? ts28.createQualifiedName(moduleImport, symbolIdentifier) : symbolIdentifier;
    const typeArguments = ast.typeParams !== null ? ast.typeParams.map((type) => this.translateType(type, context)) : void 0;
    return ts28.createTypeReferenceNode(typeName, typeArguments);
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
    return ts28.createTupleTypeNode(values);
  }
  visitLiteralMapExpr(ast, context) {
    const entries = ast.entries.map((entry) => {
      const { key, quoted } = entry;
      const type = this.translateExpression(entry.value, context);
      return ts28.createPropertySignature(void 0, quoted ? ts28.createStringLiteral(key) : key, void 0, type, void 0);
    });
    return ts28.createTypeLiteralNode(entries);
  }
  visitCommaExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitWrappedNodeExpr(ast, context) {
    const node = ast.node;
    if (ts28.isEntityName(node)) {
      return ts28.createTypeReferenceNode(node, void 0);
    } else if (ts28.isTypeNode(node)) {
      return node;
    } else if (ts28.isLiteralExpression(node)) {
      return ts28.createLiteralTypeNode(node);
    } else {
      throw new Error(`Unsupported WrappedNodeExpr in TypeTranslatorVisitor: ${ts28.SyntaxKind[node.kind]}`);
    }
  }
  visitTypeofExpr(ast, context) {
    const typeNode = this.translateExpression(ast.expr, context);
    if (!ts28.isTypeReferenceNode(typeNode)) {
      throw new Error(`The target of a typeof expression must be a type reference, but it was
          ${ts28.SyntaxKind[typeNode.kind]}`);
    }
    return ts28.createTypeQueryNode(typeNode.typeName);
  }
  translateType(type, context) {
    const typeNode = type.visitType(this, context);
    if (!ts28.isTypeNode(typeNode)) {
      throw new Error(`A Type must translate to a TypeNode, but was ${ts28.SyntaxKind[typeNode.kind]}`);
    }
    return typeNode;
  }
  translateExpression(expr, context) {
    const typeNode = expr.visitExpression(this, context);
    if (!ts28.isTypeNode(typeNode)) {
      throw new Error(`An Expression must translate to a TypeNode, but was ${ts28.SyntaxKind[typeNode.kind]}`);
    }
    return typeNode;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/translator/src/typescript_ast_factory.mjs
import ts29 from "typescript";
var PureAnnotation;
(function(PureAnnotation2) {
  PureAnnotation2["CLOSURE"] = "* @pureOrBreakMyCode ";
  PureAnnotation2["TERSER"] = "@__PURE__";
})(PureAnnotation || (PureAnnotation = {}));
var UNARY_OPERATORS3 = {
  "+": ts29.SyntaxKind.PlusToken,
  "-": ts29.SyntaxKind.MinusToken,
  "!": ts29.SyntaxKind.ExclamationToken
};
var BINARY_OPERATORS3 = {
  "&&": ts29.SyntaxKind.AmpersandAmpersandToken,
  ">": ts29.SyntaxKind.GreaterThanToken,
  ">=": ts29.SyntaxKind.GreaterThanEqualsToken,
  "&": ts29.SyntaxKind.AmpersandToken,
  "/": ts29.SyntaxKind.SlashToken,
  "==": ts29.SyntaxKind.EqualsEqualsToken,
  "===": ts29.SyntaxKind.EqualsEqualsEqualsToken,
  "<": ts29.SyntaxKind.LessThanToken,
  "<=": ts29.SyntaxKind.LessThanEqualsToken,
  "-": ts29.SyntaxKind.MinusToken,
  "%": ts29.SyntaxKind.PercentToken,
  "*": ts29.SyntaxKind.AsteriskToken,
  "!=": ts29.SyntaxKind.ExclamationEqualsToken,
  "!==": ts29.SyntaxKind.ExclamationEqualsEqualsToken,
  "||": ts29.SyntaxKind.BarBarToken,
  "+": ts29.SyntaxKind.PlusToken,
  "??": ts29.SyntaxKind.QuestionQuestionToken
};
var VAR_TYPES = {
  "const": ts29.NodeFlags.Const,
  "let": ts29.NodeFlags.Let,
  "var": ts29.NodeFlags.None
};
var TypeScriptAstFactory = class {
  constructor(annotateForClosureCompiler) {
    this.annotateForClosureCompiler = annotateForClosureCompiler;
    this.externalSourceFiles = new Map();
    this.attachComments = attachComments;
    this.createArrayLiteral = ts29.createArrayLiteral;
    this.createConditional = ts29.createConditional;
    this.createElementAccess = ts29.createElementAccess;
    this.createExpressionStatement = ts29.createExpressionStatement;
    this.createIdentifier = ts29.createIdentifier;
    this.createParenthesizedExpression = ts29.createParen;
    this.createPropertyAccess = ts29.createPropertyAccess;
    this.createThrowStatement = ts29.createThrow;
    this.createTypeOfExpression = ts29.createTypeOf;
  }
  createAssignment(target, value) {
    return ts29.createBinary(target, ts29.SyntaxKind.EqualsToken, value);
  }
  createBinaryExpression(leftOperand, operator, rightOperand) {
    return ts29.createBinary(leftOperand, BINARY_OPERATORS3[operator], rightOperand);
  }
  createBlock(body) {
    return ts29.createBlock(body);
  }
  createCallExpression(callee, args2, pure) {
    const call = ts29.createCall(callee, void 0, args2);
    if (pure) {
      ts29.addSyntheticLeadingComment(call, ts29.SyntaxKind.MultiLineCommentTrivia, this.annotateForClosureCompiler ? PureAnnotation.CLOSURE : PureAnnotation.TERSER, false);
    }
    return call;
  }
  createFunctionDeclaration(functionName, parameters, body) {
    if (!ts29.isBlock(body)) {
      throw new Error(`Invalid syntax, expected a block, but got ${ts29.SyntaxKind[body.kind]}.`);
    }
    return ts29.createFunctionDeclaration(void 0, void 0, void 0, functionName, void 0, parameters.map((param) => ts29.createParameter(void 0, void 0, void 0, param)), void 0, body);
  }
  createFunctionExpression(functionName, parameters, body) {
    if (!ts29.isBlock(body)) {
      throw new Error(`Invalid syntax, expected a block, but got ${ts29.SyntaxKind[body.kind]}.`);
    }
    return ts29.createFunctionExpression(void 0, void 0, functionName != null ? functionName : void 0, void 0, parameters.map((param) => ts29.createParameter(void 0, void 0, void 0, param)), void 0, body);
  }
  createIfStatement(condition, thenStatement, elseStatement) {
    return ts29.createIf(condition, thenStatement, elseStatement != null ? elseStatement : void 0);
  }
  createLiteral(value) {
    if (value === void 0) {
      return ts29.createIdentifier("undefined");
    } else if (value === null) {
      return ts29.createNull();
    } else {
      return ts29.createLiteral(value);
    }
  }
  createNewExpression(expression, args2) {
    return ts29.createNew(expression, void 0, args2);
  }
  createObjectLiteral(properties) {
    return ts29.createObjectLiteral(properties.map((prop) => ts29.createPropertyAssignment(prop.quoted ? ts29.createLiteral(prop.propertyName) : ts29.createIdentifier(prop.propertyName), prop.value)));
  }
  createReturnStatement(expression) {
    return ts29.createReturn(expression != null ? expression : void 0);
  }
  createTaggedTemplate(tag, template) {
    let templateLiteral;
    const length = template.elements.length;
    const head = template.elements[0];
    if (length === 1) {
      templateLiteral = ts29.createNoSubstitutionTemplateLiteral(head.cooked, head.raw);
    } else {
      const spans = [];
      for (let i = 1; i < length - 1; i++) {
        const { cooked, raw, range } = template.elements[i];
        const middle = createTemplateMiddle(cooked, raw);
        if (range !== null) {
          this.setSourceMapRange(middle, range);
        }
        spans.push(ts29.createTemplateSpan(template.expressions[i - 1], middle));
      }
      const resolvedExpression = template.expressions[length - 2];
      const templatePart = template.elements[length - 1];
      const templateTail = createTemplateTail(templatePart.cooked, templatePart.raw);
      if (templatePart.range !== null) {
        this.setSourceMapRange(templateTail, templatePart.range);
      }
      spans.push(ts29.createTemplateSpan(resolvedExpression, templateTail));
      templateLiteral = ts29.createTemplateExpression(ts29.createTemplateHead(head.cooked, head.raw), spans);
    }
    if (head.range !== null) {
      this.setSourceMapRange(templateLiteral, head.range);
    }
    return ts29.createTaggedTemplate(tag, templateLiteral);
  }
  createUnaryExpression(operator, operand) {
    return ts29.createPrefix(UNARY_OPERATORS3[operator], operand);
  }
  createVariableDeclaration(variableName, initializer, type) {
    return ts29.createVariableStatement(void 0, ts29.createVariableDeclarationList([ts29.createVariableDeclaration(variableName, void 0, initializer != null ? initializer : void 0)], VAR_TYPES[type]));
  }
  setSourceMapRange(node, sourceMapRange) {
    if (sourceMapRange === null) {
      return node;
    }
    const url = sourceMapRange.url;
    if (!this.externalSourceFiles.has(url)) {
      this.externalSourceFiles.set(url, ts29.createSourceMapSource(url, sourceMapRange.content, (pos) => pos));
    }
    const source = this.externalSourceFiles.get(url);
    ts29.setSourceMapRange(node, { pos: sourceMapRange.start.offset, end: sourceMapRange.end.offset, source });
    return node;
  }
};
function createTemplateMiddle(cooked, raw) {
  const node = ts29.createTemplateHead(cooked, raw);
  node.kind = ts29.SyntaxKind.TemplateMiddle;
  return node;
}
function createTemplateTail(cooked, raw) {
  const node = ts29.createTemplateHead(cooked, raw);
  node.kind = ts29.SyntaxKind.TemplateTail;
  return node;
}
function attachComments(statement, leadingComments) {
  for (const comment of leadingComments) {
    const commentKind = comment.multiline ? ts29.SyntaxKind.MultiLineCommentTrivia : ts29.SyntaxKind.SingleLineCommentTrivia;
    if (comment.multiline) {
      ts29.addSyntheticLeadingComment(statement, commentKind, comment.toString(), comment.trailingNewline);
    } else {
      for (const line of comment.toString().split("\n")) {
        ts29.addSyntheticLeadingComment(statement, commentKind, line, comment.trailingNewline);
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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/transform/src/utils.mjs
import ts30 from "typescript";
function addImports(importManager, sf, extraStatements = []) {
  const addedImports = importManager.getAllImports(sf.fileName).map((i) => {
    const qualifier = ts30.createIdentifier(i.qualifier.text);
    const importClause = ts30.createImportClause(void 0, ts30.createNamespaceImport(qualifier));
    const decl = ts30.createImportDeclaration(void 0, void 0, importClause, ts30.createLiteral(i.specifier));
    ts30.setOriginalNode(i.qualifier, decl);
    return decl;
  });
  const existingImports = sf.statements.filter((stmt) => isImportStatement(stmt));
  const body = sf.statements.filter((stmt) => !isImportStatement(stmt));
  if (addedImports.length > 0) {
    const fileoverviewAnchorStmt = ts30.createNotEmittedStatement(sf);
    return ts30.updateSourceFileNode(sf, ts30.createNodeArray([
      fileoverviewAnchorStmt,
      ...existingImports,
      ...addedImports,
      ...extraStatements,
      ...body
    ]));
  }
  return sf;
}
function isImportStatement(stmt) {
  return ts30.isImportDeclaration(stmt) || ts30.isImportEqualsDeclaration(stmt) || ts30.isNamespaceImport(stmt);
}

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
    const originalSf = ts31.getOriginalNode(sf);
    let transforms = null;
    if (this.ivyDeclarationTransforms.has(originalSf)) {
      transforms = [];
      transforms.push(this.ivyDeclarationTransforms.get(originalSf));
    }
    return transforms;
  }
};
function declarationTransformFactory(transformRegistry, importRewriter, importPrefix) {
  return (context) => {
    const transformer = new DtsTransformer(context, importRewriter, importPrefix);
    return (fileOrBundle) => {
      if (ts31.isBundle(fileOrBundle)) {
        return fileOrBundle;
      }
      const transforms = transformRegistry.getAllTransforms(fileOrBundle);
      if (transforms === null) {
        return fileOrBundle;
      }
      return transformer.transform(fileOrBundle, transforms);
    };
  };
}
var DtsTransformer = class {
  constructor(ctx, importRewriter, importPrefix) {
    this.ctx = ctx;
    this.importRewriter = importRewriter;
    this.importPrefix = importPrefix;
  }
  transform(sf, transforms) {
    const imports = new ImportManager(this.importRewriter, this.importPrefix);
    const visitor = (node) => {
      if (ts31.isClassDeclaration(node)) {
        return this.transformClassDeclaration(node, transforms, imports);
      } else if (ts31.isFunctionDeclaration(node)) {
        return this.transformFunctionDeclaration(node, transforms, imports);
      } else {
        return ts31.visitEachChild(node, visitor, this.ctx);
      }
    };
    sf = ts31.visitNode(sf, visitor);
    return addImports(imports, sf);
  }
  transformClassDeclaration(clazz, transforms, imports) {
    let elements = clazz.members;
    let elementsChanged = false;
    for (const transform of transforms) {
      if (transform.transformClassElement !== void 0) {
        for (let i = 0; i < elements.length; i++) {
          const res = transform.transformClassElement(elements[i], imports);
          if (res !== elements[i]) {
            if (!elementsChanged) {
              elements = [...elements];
              elementsChanged = true;
            }
            elements[i] = res;
          }
        }
      }
    }
    let newClazz = clazz;
    for (const transform of transforms) {
      if (transform.transformClass !== void 0) {
        const inputMembers = clazz === newClazz ? elements : newClazz.members;
        newClazz = transform.transformClass(newClazz, inputMembers, imports);
      }
    }
    if (elementsChanged && clazz === newClazz) {
      newClazz = ts31.updateClassDeclaration(clazz, clazz.decorators, clazz.modifiers, clazz.name, clazz.typeParameters, clazz.heritageClauses, elements);
    }
    return newClazz;
  }
  transformFunctionDeclaration(declaration, transforms, imports) {
    let newDecl = declaration;
    for (const transform of transforms) {
      if (transform.transformFunctionDeclaration !== void 0) {
        newDecl = transform.transformFunctionDeclaration(newDecl, imports);
      }
    }
    return newDecl;
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
    const original = ts31.getOriginalNode(clazz);
    if (!this.declarationFields.has(original)) {
      return clazz;
    }
    const fields = this.declarationFields.get(original);
    const newMembers = fields.map((decl) => {
      const modifiers = [ts31.createModifier(ts31.SyntaxKind.StaticKeyword)];
      const typeRef = translateType(decl.type, imports);
      markForEmitAsSingleLine(typeRef);
      return ts31.createProperty(void 0, modifiers, decl.name, void 0, typeRef, void 0);
    });
    return ts31.updateClassDeclaration(clazz, clazz.decorators, clazz.modifiers, clazz.name, clazz.typeParameters, clazz.heritageClauses, [...members, ...newMembers]);
  }
};
function markForEmitAsSingleLine(node) {
  ts31.setEmitFlags(node, ts31.EmitFlags.SingleLine);
  ts31.forEachChild(node, markForEmitAsSingleLine);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/transform/src/transform.mjs
import { ConstantPool } from "@angular/compiler";
import ts33 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/util/src/visitor.mjs
import ts32 from "typescript";
function visit(node, visitor, context) {
  return visitor._visit(node, context);
}
var Visitor = class {
  constructor() {
    this._before = new Map();
    this._after = new Map();
  }
  _visitListEntryNode(node, visitor) {
    const result = visitor(node);
    if (result.before !== void 0) {
      this._before.set(result.node, result.before);
    }
    if (result.after !== void 0) {
      this._after.set(result.node, result.after);
    }
    return result.node;
  }
  visitOtherNode(node) {
    return node;
  }
  _visit(node, context) {
    let visitedNode = null;
    node = ts32.visitEachChild(node, (child) => this._visit(child, context), context);
    if (ts32.isClassDeclaration(node)) {
      visitedNode = this._visitListEntryNode(node, (node2) => this.visitClassDeclaration(node2));
    } else {
      visitedNode = this.visitOtherNode(node);
    }
    if (hasStatements(visitedNode)) {
      visitedNode = this._maybeProcessStatements(visitedNode);
    }
    return visitedNode;
  }
  _maybeProcessStatements(node) {
    if (node.statements.every((stmt) => !this._before.has(stmt) && !this._after.has(stmt))) {
      return node;
    }
    const clone = ts32.getMutableClone(node);
    const newStatements = [];
    clone.statements.forEach((stmt) => {
      if (this._before.has(stmt)) {
        newStatements.push(...this._before.get(stmt));
        this._before.delete(stmt);
      }
      newStatements.push(stmt);
      if (this._after.has(stmt)) {
        newStatements.push(...this._after.get(stmt));
        this._after.delete(stmt);
      }
    });
    clone.statements = ts32.createNodeArray(newStatements, node.statements.hasTrailingComma);
    return clone;
  }
};
function hasStatements(node) {
  const block = node;
  return block.statements !== void 0 && Array.isArray(block.statements);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/transform/src/transform.mjs
var NO_DECORATORS = new Set();
var CLOSURE_FILE_OVERVIEW_REGEXP = /\s+@fileoverview\s+/i;
function ivyTransformFactory(compilation, reflector, importRewriter, defaultImportTracker, perf, isCore, isClosureCompilerEnabled) {
  const recordWrappedNode = createRecorderFn(defaultImportTracker);
  return (context) => {
    return (file) => {
      return perf.inPhase(PerfPhase.Compile, () => transformIvySourceFile(compilation, context, reflector, importRewriter, file, isCore, isClosureCompilerEnabled, recordWrappedNode));
    };
  };
}
var IvyCompilationVisitor = class extends Visitor {
  constructor(compilation, constantPool) {
    super();
    this.compilation = compilation;
    this.constantPool = constantPool;
    this.classCompilationMap = new Map();
  }
  visitClassDeclaration(node) {
    const result = this.compilation.compile(node, this.constantPool);
    if (result !== null) {
      this.classCompilationMap.set(node, result);
    }
    return { node };
  }
};
var IvyTransformationVisitor = class extends Visitor {
  constructor(compilation, classCompilationMap, reflector, importManager, recordWrappedNodeExpr, isClosureCompilerEnabled, isCore) {
    super();
    this.compilation = compilation;
    this.classCompilationMap = classCompilationMap;
    this.reflector = reflector;
    this.importManager = importManager;
    this.recordWrappedNodeExpr = recordWrappedNodeExpr;
    this.isClosureCompilerEnabled = isClosureCompilerEnabled;
    this.isCore = isCore;
  }
  visitClassDeclaration(node) {
    if (!this.classCompilationMap.has(node)) {
      return { node };
    }
    const translateOptions = {
      recordWrappedNode: this.recordWrappedNodeExpr,
      annotateForClosureCompiler: this.isClosureCompilerEnabled
    };
    const statements = [];
    const members = [...node.members];
    for (const field of this.classCompilationMap.get(node)) {
      const exprNode = translateExpression(field.initializer, this.importManager, translateOptions);
      const property = ts33.createProperty(void 0, [ts33.createToken(ts33.SyntaxKind.StaticKeyword)], field.name, void 0, void 0, exprNode);
      if (this.isClosureCompilerEnabled) {
        ts33.addSyntheticLeadingComment(property, ts33.SyntaxKind.MultiLineCommentTrivia, "* @nocollapse ", false);
      }
      field.statements.map((stmt) => translateStatement(stmt, this.importManager, translateOptions)).forEach((stmt) => statements.push(stmt));
      members.push(property);
    }
    node = ts33.updateClassDeclaration(node, maybeFilterDecorator(node.decorators, this.compilation.decoratorsFor(node)), node.modifiers, node.name, node.typeParameters, node.heritageClauses || [], members.map((member) => this._stripAngularDecorators(member)));
    return { node, after: statements };
  }
  _angularCoreDecorators(decl) {
    const decorators = this.reflector.getDecoratorsOfDeclaration(decl);
    if (decorators === null) {
      return NO_DECORATORS;
    }
    const coreDecorators = decorators.filter((dec) => this.isCore || isFromAngularCore(dec)).map((dec) => dec.node);
    if (coreDecorators.length > 0) {
      return new Set(coreDecorators);
    } else {
      return NO_DECORATORS;
    }
  }
  _nonCoreDecoratorsOnly(node) {
    if (node.decorators === void 0) {
      return void 0;
    }
    const coreDecorators = this._angularCoreDecorators(node);
    if (coreDecorators.size === node.decorators.length) {
      return void 0;
    } else if (coreDecorators.size === 0) {
      return node.decorators;
    }
    const filtered = node.decorators.filter((dec) => !coreDecorators.has(dec));
    if (filtered.length === 0) {
      return void 0;
    }
    const array = ts33.createNodeArray(filtered);
    array.pos = node.decorators.pos;
    array.end = node.decorators.end;
    return array;
  }
  _stripAngularDecorators(node) {
    if (ts33.isParameter(node)) {
      node = ts33.updateParameter(node, this._nonCoreDecoratorsOnly(node), node.modifiers, node.dotDotDotToken, node.name, node.questionToken, node.type, node.initializer);
    } else if (ts33.isMethodDeclaration(node) && node.decorators !== void 0) {
      node = ts33.updateMethod(node, this._nonCoreDecoratorsOnly(node), node.modifiers, node.asteriskToken, node.name, node.questionToken, node.typeParameters, node.parameters, node.type, node.body);
    } else if (ts33.isPropertyDeclaration(node) && node.decorators !== void 0) {
      node = ts33.updateProperty(node, this._nonCoreDecoratorsOnly(node), node.modifiers, node.name, node.questionToken, node.type, node.initializer);
    } else if (ts33.isGetAccessor(node)) {
      node = ts33.updateGetAccessor(node, this._nonCoreDecoratorsOnly(node), node.modifiers, node.name, node.parameters, node.type, node.body);
    } else if (ts33.isSetAccessor(node)) {
      node = ts33.updateSetAccessor(node, this._nonCoreDecoratorsOnly(node), node.modifiers, node.name, node.parameters, node.body);
    } else if (ts33.isConstructorDeclaration(node)) {
      const parameters = node.parameters.map((param) => this._stripAngularDecorators(param));
      node = ts33.updateConstructor(node, node.decorators, node.modifiers, parameters, node.body);
    }
    return node;
  }
};
function transformIvySourceFile(compilation, context, reflector, importRewriter, file, isCore, isClosureCompilerEnabled, recordWrappedNode) {
  const constantPool = new ConstantPool(isClosureCompilerEnabled);
  const importManager = new ImportManager(importRewriter);
  const compilationVisitor = new IvyCompilationVisitor(compilation, constantPool);
  visit(file, compilationVisitor, context);
  const transformationVisitor = new IvyTransformationVisitor(compilation, compilationVisitor.classCompilationMap, reflector, importManager, recordWrappedNode, isClosureCompilerEnabled, isCore);
  let sf = visit(file, transformationVisitor, context);
  const downlevelTranslatedCode = getLocalizeCompileTarget(context) < ts33.ScriptTarget.ES2015;
  const constants = constantPool.statements.map((stmt) => translateStatement(stmt, importManager, {
    recordWrappedNode,
    downlevelTaggedTemplates: downlevelTranslatedCode,
    downlevelVariableDeclarations: downlevelTranslatedCode,
    annotateForClosureCompiler: isClosureCompilerEnabled
  }));
  const fileOverviewMeta = isClosureCompilerEnabled ? getFileOverviewComment(sf.statements) : null;
  sf = addImports(importManager, sf, constants);
  if (fileOverviewMeta !== null) {
    setFileOverviewComment(sf, fileOverviewMeta);
  }
  return sf;
}
function getLocalizeCompileTarget(context) {
  const target = context.getCompilerOptions().target || ts33.ScriptTarget.ES2015;
  return target !== ts33.ScriptTarget.JSON ? target : ts33.ScriptTarget.ES2015;
}
function getFileOverviewComment(statements) {
  if (statements.length > 0) {
    const host = statements[0];
    let trailing = false;
    let comments = ts33.getSyntheticLeadingComments(host);
    if (!comments || comments.length === 0) {
      trailing = true;
      comments = ts33.getSyntheticTrailingComments(host);
    }
    if (comments && comments.length > 0 && CLOSURE_FILE_OVERVIEW_REGEXP.test(comments[0].text)) {
      return { comments, host, trailing };
    }
  }
  return null;
}
function setFileOverviewComment(sf, fileoverview) {
  const { comments, host, trailing } = fileoverview;
  if (sf.statements.length > 0 && host !== sf.statements[0]) {
    if (trailing) {
      ts33.setSyntheticTrailingComments(host, void 0);
    } else {
      ts33.setSyntheticLeadingComments(host, void 0);
    }
    ts33.setSyntheticLeadingComments(sf.statements[0], comments);
  }
}
function maybeFilterDecorator(decorators, toRemove) {
  if (decorators === void 0) {
    return void 0;
  }
  const filtered = decorators.filter((dec) => toRemove.find((decToRemove) => ts33.getOriginalNode(dec) === decToRemove) === void 0);
  if (filtered.length === 0) {
    return void 0;
  }
  return ts33.createNodeArray(filtered);
}
function isFromAngularCore(decorator) {
  return decorator.import !== null && decorator.import.from === "@angular/core";
}
function createRecorderFn(defaultImportTracker) {
  return (node) => {
    const importDecl = getDefaultImportDeclaration(node);
    if (importDecl !== null) {
      defaultImportTracker.recordUsedImport(importDecl);
    }
  };
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/diagnostics.mjs
import ts35 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/util.mjs
import { ExternalExpr as ExternalExpr4, LiteralExpr, ParseLocation, ParseSourceFile, ParseSourceSpan, ReadPropExpr, WrappedNodeExpr as WrappedNodeExpr2 } from "@angular/compiler";
import ts34 from "typescript";
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
        if (ts34.isStringLiteralLike(attributeName)) {
          attributeNameType = new LiteralExpr(attributeName.text);
        } else {
          attributeNameType = new WrappedNodeExpr2(ts34.createKeywordTypeNode(ts34.SyntaxKind.UnknownKeyword));
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
      for (const property of valueRef.nestedPath) {
        importExpr = new ReadPropExpr(importExpr, property);
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
    category: ts34.DiagnosticCategory.Error,
    code: 0,
    next: [{
      messageText: chainMessage,
      category: ts34.DiagnosticCategory.Message,
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
  while (ts34.isAsExpression(node) || ts34.isParenthesizedExpression(node)) {
    node = node.expression;
  }
  return node;
}
function expandForwardRef(arg) {
  arg = unwrapExpression(arg);
  if (!ts34.isArrowFunction(arg) && !ts34.isFunctionExpression(arg)) {
    return null;
  }
  const body = arg.body;
  if (ts34.isBlock(body)) {
    if (body.statements.length !== 1) {
      return null;
    }
    const stmt = body.statements[0];
    if (!ts34.isReturnStatement(stmt) || stmt.expression === void 0) {
      return null;
    }
    return stmt.expression;
  } else {
    return body;
  }
}
function tryUnwrapForwardRef(node, reflector) {
  node = unwrapExpression(node);
  if (!ts34.isCallExpression(node) || node.arguments.length !== 1) {
    return null;
  }
  const fn = ts34.isPropertyAccessExpression(node.expression) ? node.expression.name : node.expression;
  if (!ts34.isIdentifier(fn)) {
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
function forwardRefResolver(ref, args2) {
  if (!isAngularCoreReference(ref, "forwardRef") || args2.length !== 1) {
    return null;
  }
  return expandForwardRef(args2[0]);
}
function combineResolvers(resolvers) {
  return (ref, args2) => {
    for (const resolver of resolvers) {
      const resolved = resolver(ref, args2);
      if (resolved !== null) {
        return resolved;
      }
    }
    return null;
  };
}
function isExpressionForwardReference(expr, context, contextSource) {
  if (isWrappedTsNodeExpr(expr)) {
    const node = ts34.getOriginalNode(expr.node);
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
    const visited = ts34.visitEachChild(node, visitor, context);
    if (ts34.isArrowFunction(visited) || ts34.isFunctionExpression(visited)) {
      return ts34.createParen(visited);
    }
    return visited;
  };
  return (node) => ts34.visitEachChild(node, visitor, context);
};
function wrapFunctionExpressionsInParens(expression) {
  return ts34.transform(expression, [parensWrapperTransformerFactory]).transformed[0];
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
    category: ts35.DiagnosticCategory.Error,
    code: 0,
    next: [{
      messageText: chainedMessage,
      category: ts35.DiagnosticCategory.Message,
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
import { compileClassMetadata, compileDeclareClassMetadata, compileDeclareDirectiveFromMetadata, compileDirectiveFromMetadata, createMayBeForwardRefExpression, emitDistinctChangesOnlyDefaultValue, ExternalExpr as ExternalExpr5, FactoryTarget, getSafePropertyAccessString, makeBindingParser, parseHostBindings, verifyHostBindings, WrappedNodeExpr as WrappedNodeExpr4 } from "@angular/compiler";
import ts37 from "typescript";

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
import ts36 from "typescript";
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
  const metaDecorators = new WrappedNodeExpr3(ts36.createArrayLiteral(ngClassDecorators));
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
    metaPropDecorators = new WrappedNodeExpr3(ts36.createObjectLiteral(decoratedMembers));
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
    const value = new WrappedNodeExpr3(ts36.createArrayLiteral(ngDecorators));
    mapEntries.push({ key: "decorators", value, quoted: false });
  }
  return literalMap(mapEntries);
}
function classMemberToMetadata(name, decorators, isCore) {
  const ngDecorators = decorators.filter((dec) => isAngularDecorator2(dec, isCore)).map((decorator) => decoratorToMetadata(decorator));
  const decoratorMeta = ts36.createArrayLiteral(ngDecorators);
  return ts36.createPropertyAssignment(name, decoratorMeta);
}
function decoratorToMetadata(decorator, wrapFunctionsInParens) {
  if (decorator.identifier === null) {
    throw new Error("Illegal state: synthesized decorator cannot be emitted in class metadata.");
  }
  const properties = [
    ts36.createPropertyAssignment("type", ts36.getMutableClone(decorator.identifier))
  ];
  if (decorator.args !== null && decorator.args.length > 0) {
    const args2 = decorator.args.map((arg) => {
      const expr = ts36.getMutableClone(arg);
      return wrapFunctionsInParens ? wrapFunctionExpressionsInParens(expr) : expr;
    });
    properties.push(ts36.createPropertyAssignment("args", ts36.createArrayLiteral(args2)));
  }
  return ts36.createObjectLiteral(properties, true);
}
function isAngularDecorator2(decorator, isCore) {
  return isCore || decorator.import !== null && decorator.import.from === "@angular/core";
}
function removeIdentifierReferences(node, name) {
  const result = ts36.transform(node, [(context) => (root) => ts36.visitNode(root, function walk(current) {
    return ts36.isIdentifier(current) && current.text === name ? ts36.createIdentifier(current.text) : ts36.visitEachChild(current, walk, context);
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
    if (!ts37.isObjectLiteralExpression(meta)) {
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
function extractQueryMetadata(exprNode, name, args2, propertyName, reflector, evaluator) {
  if (args2.length === 0) {
    throw new FatalDiagnosticError(ErrorCode.DECORATOR_ARITY_WRONG, exprNode, `@${name} must have arguments`);
  }
  const first = name === "ViewChild" || name === "ContentChild";
  const forwardReferenceTarget = tryUnwrapForwardRef(args2[0], reflector);
  const node = forwardReferenceTarget != null ? forwardReferenceTarget : args2[0];
  const arg = evaluator.evaluate(node);
  let isStatic2 = false;
  let predicate = null;
  if (arg instanceof Reference || arg instanceof DynamicValue) {
    predicate = createMayBeForwardRefExpression(new WrappedNodeExpr4(node), forwardReferenceTarget !== null ? 2 : 0);
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
  if (args2.length === 2) {
    const optionsExpr = unwrapExpression(args2[1]);
    if (!ts37.isObjectLiteralExpression(optionsExpr)) {
      throw new FatalDiagnosticError(ErrorCode.DECORATOR_ARG_NOT_LITERAL, optionsExpr, `@${name} options must be an object literal`);
    }
    const options = reflectObjectLiteral(optionsExpr);
    if (options.has("read")) {
      read = new WrappedNodeExpr4(options.get("read"));
    }
    if (options.has("descendants")) {
      const descendantsExpr = options.get("descendants");
      const descendantsValue = evaluator.evaluate(descendantsExpr);
      if (typeof descendantsValue !== "boolean") {
        throw createValueHasWrongTypeError(descendantsExpr, descendantsValue, `@${name} options.descendants must be a boolean`);
      }
      descendants = descendantsValue;
    }
    if (options.has("emitDistinctChangesOnly")) {
      const emitDistinctChangesOnlyExpr = options.get("emitDistinctChangesOnly");
      const emitDistinctChangesOnlyValue = evaluator.evaluate(emitDistinctChangesOnlyExpr);
      if (typeof emitDistinctChangesOnlyValue !== "boolean") {
        throw createValueHasWrongTypeError(emitDistinctChangesOnlyExpr, emitDistinctChangesOnlyValue, `@${name} options.emitDistinctChangesOnly must be a boolean`);
      }
      emitDistinctChangesOnly = emitDistinctChangesOnlyValue;
    }
    if (options.has("static")) {
      const staticValue = evaluator.evaluate(options.get("static"));
      if (typeof staticValue !== "boolean") {
        throw createValueHasWrongTypeError(node, staticValue, `@${name} options.static must be a boolean`);
      }
      isStatic2 = staticValue;
    }
  } else if (args2.length > 2) {
    throw new FatalDiagnosticError(ErrorCode.DECORATOR_ARITY_WRONG, node, `@${name} has too many arguments`);
  }
  return {
    propertyName,
    predicate,
    first,
    descendants,
    read,
    static: isStatic2,
    emitDistinctChangesOnly
  };
}
function extractQueriesFromDecorator(queryData, reflector, evaluator, isCore) {
  const content = [], view = [];
  if (!ts37.isObjectLiteralExpression(queryData)) {
    throw new FatalDiagnosticError(ErrorCode.VALUE_HAS_WRONG_TYPE, queryData, "Decorator queries metadata must be an object literal");
  }
  reflectObjectLiteral(queryData).forEach((queryExpr, propertyName) => {
    queryExpr = unwrapExpression(queryExpr);
    if (!ts37.isNewExpression(queryExpr)) {
      throw new FatalDiagnosticError(ErrorCode.VALUE_HAS_WRONG_TYPE, queryData, "Decorator query metadata must be an instance of a query type");
    }
    const queryType = ts37.isPropertyAccessExpression(queryExpr.expression) ? queryExpr.expression.name : queryExpr.expression;
    if (!ts37.isIdentifier(queryType)) {
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
    const [field2, property] = value.split(":", 2).map((str) => str.trim());
    results[field2] = property || field2;
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
        const property = evaluator.evaluate(decorator.args[0]);
        if (typeof property !== "string") {
          throw createValueHasWrongTypeError(Decorator.nodeForError(decorator), property, `@${decorator.name} decorator argument must resolve to a string`);
        }
        results[fieldName] = mapValueResolver(property, fieldName);
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
      let args2 = [];
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
          args2 = resolvedArgs;
        }
      }
      bindings.listeners[eventName] = `${member.name}(${args2.join(",")})`;
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
import { compileClassMetadata as compileClassMetadata2, compileDeclareClassMetadata as compileDeclareClassMetadata2, compileDeclareInjectorFromMetadata, compileDeclareNgModuleFromMetadata, compileInjector, compileNgModule, CUSTOM_ELEMENTS_SCHEMA, ExternalExpr as ExternalExpr6, FactoryTarget as FactoryTarget2, InvokeFunctionExpr, LiteralArrayExpr as LiteralArrayExpr2, NO_ERRORS_SCHEMA, R3Identifiers, WrappedNodeExpr as WrappedNodeExpr5 } from "@angular/compiler";
import ts38 from "typescript";
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
  constructor(reflector, evaluator, metaReader, metaRegistry, scopeRegistry, referencesRegistry, isCore, refEmitter, factoryTracker, annotateForClosureCompiler, injectableRegistry, perf) {
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
    const meta = decorator.args.length === 1 ? unwrapExpression(decorator.args[0]) : ts38.createObjectLiteral([]);
    if (!ts38.isObjectLiteralExpression(meta)) {
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
    if (!ts38.isTypeReferenceNode(type)) {
      return null;
    }
    const typeName = type && (ts38.isIdentifier(type.typeName) && type.typeName || ts38.isQualifiedName(type.typeName) && type.typeName.right) || null;
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
      const parent = ts38.isMethodDeclaration(node) && ts38.isClassDeclaration(node.parent) ? node.parent : null;
      const symbolName = (parent && parent.name ? parent.name.getText() + "." : "") + (node.name ? node.name.getText() : "anonymous");
      throw new FatalDiagnosticError(ErrorCode.NGMODULE_MODULE_WITH_PROVIDERS_MISSING_GENERIC, type, `${symbolName} returns a ModuleWithProviders type without a generic type argument. Please add a generic type argument to the ModuleWithProviders type. If this occurrence is in library code you don't control, please contact the library authors.`);
    }
    const arg = type.typeArguments[0];
    return typeNodeToValueExpr(arg);
  }
  _reflectModuleFromLiteralType(type) {
    if (!ts38.isIntersectionTypeNode(type)) {
      return null;
    }
    for (const t of type.types) {
      if (ts38.isTypeLiteralNode(t)) {
        for (const m of t.members) {
          const ngModuleType = ts38.isPropertySignature(m) && ts38.isIdentifier(m.name) && m.name.text === "ngModule" && m.type || null;
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
    if (this.typeCheckScopeRegistry === null || !ts39.isClassDeclaration(node)) {
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
      metadata.set("template", ts39.createStringLiteral(template.content));
    }
    if (metadata.has("styleUrls")) {
      metadata.delete("styleUrls");
      metadata.set("styles", ts39.createArrayLiteral(styles.map((s) => ts39.createStringLiteral(s))));
    }
    const newMetadataFields = [];
    for (const [name, value] of metadata.entries()) {
      newMetadataFields.push(ts39.createPropertyAssignment(name, value));
    }
    return __spreadProps(__spreadValues({}, dec), { args: [ts39.createObjectLiteral(newMetadataFields)] });
  }
  _resolveLiteral(decorator) {
    if (this.literalCache.has(decorator)) {
      return this.literalCache.get(decorator);
    }
    if (decorator.args === null || decorator.args.length !== 1) {
      throw new FatalDiagnosticError(ErrorCode.DECORATOR_ARITY_WRONG, Decorator.nodeForError(decorator), `Incorrect number of arguments to @Component decorator`);
    }
    const meta = unwrapExpression(decorator.args[0]);
    if (!ts39.isObjectLiteralExpression(meta)) {
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
    if (ts39.isArrayLiteralExpression(styleUrlsExpr)) {
      for (const styleUrlExpr of styleUrlsExpr.elements) {
        if (ts39.isSpreadElement(styleUrlExpr)) {
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
      return array.elements.filter((e) => ts39.isStringLiteralLike(e));
    }
    const styleUrlsExpr = component.get("styleUrls");
    if (styleUrlsExpr !== void 0 && ts39.isArrayLiteralExpression(styleUrlsExpr)) {
      for (const expression of stringLiteralElements(styleUrlsExpr)) {
        try {
          const resourceUrl = this.resourceLoader.resolve(expression.text, containingFile);
          styles.add({ path: absoluteFrom(resourceUrl), expression });
        } catch {
        }
      }
    }
    const stylesExpr = component.get("styles");
    if (stylesExpr !== void 0 && ts39.isArrayLiteralExpression(stylesExpr)) {
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
      if (ts39.isStringLiteral(template.expression) || ts39.isNoSubstitutionTemplateLiteral(template.expression)) {
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
  const { line, character } = ts39.getLineAndCharacterOfPosition(templateExpr.getSourceFile(), startPos);
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
  const path8 = cycle.getPath().map((sf) => sf.fileName).join(" -> ");
  const message = `The ${type} '${name}' is used in the template but importing it would create a cycle: `;
  return makeRelatedInformation(ref.node, message + path8);
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
import { compileClassMetadata as compileClassMetadata4, compileDeclareClassMetadata as compileDeclareClassMetadata4, compileDeclareInjectableFromMetadata, compileInjectable, createMayBeForwardRefExpression as createMayBeForwardRefExpression2, FactoryTarget as FactoryTarget4, LiteralExpr as LiteralExpr3, WrappedNodeExpr as WrappedNodeExpr7 } from "@angular/compiler";
import ts40 from "typescript";
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
      providedIn: createMayBeForwardRefExpression2(new LiteralExpr3(null), 0)
    };
  } else if (decorator.args.length === 1) {
    const metaNode = decorator.args[0];
    if (!ts40.isObjectLiteralExpression(metaNode)) {
      throw new FatalDiagnosticError(ErrorCode.DECORATOR_ARG_NOT_LITERAL, metaNode, `@Injectable argument must be an object literal`);
    }
    const meta = reflectObjectLiteral(metaNode);
    const providedIn = meta.has("providedIn") ? getProviderExpression(meta.get("providedIn"), reflector) : createMayBeForwardRefExpression2(new LiteralExpr3(null), 0);
    let deps = void 0;
    if ((meta.has("useClass") || meta.has("useFactory")) && meta.has("deps")) {
      const depsExpr = meta.get("deps");
      if (!ts40.isArrayLiteralExpression(depsExpr)) {
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
  return createMayBeForwardRefExpression2(new WrappedNodeExpr7(forwardRefValue != null ? forwardRefValue : expression), forwardRefValue !== null ? 2 : 0);
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
  if (ts40.isArrayLiteralExpression(dep)) {
    dep.elements.forEach((el) => {
      let isDecorator = false;
      if (ts40.isIdentifier(el)) {
        isDecorator = maybeUpdateDecorator(el, reflector);
      } else if (ts40.isNewExpression(el) && ts40.isIdentifier(el.expression)) {
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
import ts41 from "typescript";
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
    if (!ts41.isObjectLiteralExpression(meta)) {
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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/annotations/src/references_registry.mjs
var NoopReferencesRegistry = class {
  add(source, ...references) {
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
import ts42 from "typescript";
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
        if (!ts42.isImportDeclaration(stmt) && !ts42.isExportDeclaration(stmt) || stmt.moduleSpecifier === void 0) {
          continue;
        }
        if (ts42.isImportDeclaration(stmt) && stmt.importClause !== void 0 && stmt.importClause.isTypeOnly) {
          continue;
        }
        const symbol = this.checker.getSymbolAtLocation(stmt.moduleSpecifier);
        if (symbol === void 0 || symbol.valueDeclaration === void 0) {
          continue;
        }
        const moduleFile = symbol.valueDeclaration;
        if (ts42.isSourceFile(moduleFile) && isLocalFile(moduleFile)) {
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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/entry_point/src/generator.mjs
import ts43 from "typescript";
var FlatIndexGenerator = class {
  constructor(entryPoint, relativeFlatIndexPath, moduleName) {
    this.entryPoint = entryPoint;
    this.moduleName = moduleName;
    this.shouldEmit = true;
    this.flatIndexPath = join(dirname(entryPoint), relativeFlatIndexPath).replace(/\.js$/, "") + ".ts";
  }
  makeTopLevelShim() {
    const relativeEntryPoint = relativePathBetween(this.flatIndexPath, this.entryPoint);
    const contents = `/**
 * Generated bundle index. Do not edit.
 */

export * from '${relativeEntryPoint}';
`;
    const genFile = ts43.createSourceFile(this.flatIndexPath, contents, ts43.ScriptTarget.ES2015, true, ts43.ScriptKind.TS);
    if (this.moduleName !== null) {
      genFile.moduleName = this.moduleName;
    }
    return genFile;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/entry_point/src/logic.mjs
function findFlatIndexEntryPoint(rootFiles) {
  const tsFiles = rootFiles.filter((file) => isNonDeclarationTsPath(file));
  let resolvedEntryPoint = null;
  if (tsFiles.length === 1) {
    resolvedEntryPoint = tsFiles[0];
  } else {
    for (const tsFile of tsFiles) {
      if (getFileSystem().basename(tsFile) === "index.ts" && (resolvedEntryPoint === null || tsFile.length <= resolvedEntryPoint.length)) {
        resolvedEntryPoint = tsFile;
      }
    }
  }
  return resolvedEntryPoint;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/entry_point/src/private_export_checker.mjs
import ts44 from "typescript";
function checkForPrivateExports(entryPoint, checker, refGraph) {
  const diagnostics = [];
  const topLevelExports = new Set();
  const moduleSymbol = checker.getSymbolAtLocation(entryPoint);
  if (moduleSymbol === void 0) {
    throw new Error(`Internal error: failed to get symbol for entrypoint`);
  }
  const exportedSymbols = checker.getExportsOfModule(moduleSymbol);
  exportedSymbols.forEach((symbol) => {
    if (symbol.flags & ts44.SymbolFlags.Alias) {
      symbol = checker.getAliasedSymbol(symbol);
    }
    const decl = symbol.valueDeclaration;
    if (decl !== void 0) {
      topLevelExports.add(decl);
    }
  });
  const checkedSet = new Set();
  topLevelExports.forEach((mainExport) => {
    refGraph.transitiveReferencesOf(mainExport).forEach((transitiveReference) => {
      if (checkedSet.has(transitiveReference)) {
        return;
      }
      checkedSet.add(transitiveReference);
      if (!topLevelExports.has(transitiveReference)) {
        const descriptor = getDescriptorOfDeclaration(transitiveReference);
        const name = getNameOfDeclaration(transitiveReference);
        let visibleVia = "NgModule exports";
        const transitivePath = refGraph.pathFrom(mainExport, transitiveReference);
        if (transitivePath !== null) {
          visibleVia = transitivePath.map((seg) => getNameOfDeclaration(seg)).join(" -> ");
        }
        const diagnostic = __spreadProps(__spreadValues({
          category: ts44.DiagnosticCategory.Error,
          code: ngErrorCode(ErrorCode.SYMBOL_NOT_EXPORTED),
          file: transitiveReference.getSourceFile()
        }, getPosOfDeclaration(transitiveReference)), {
          messageText: `Unsupported private ${descriptor} ${name}. This ${descriptor} is visible to consumers via ${visibleVia}, but is not exported from the top-level library entrypoint.`
        });
        diagnostics.push(diagnostic);
      }
    });
  });
  return diagnostics;
}
function getPosOfDeclaration(decl) {
  const node = getIdentifierOfDeclaration(decl) || decl;
  return {
    start: node.getStart(),
    length: node.getEnd() + 1 - node.getStart()
  };
}
function getIdentifierOfDeclaration(decl) {
  if ((ts44.isClassDeclaration(decl) || ts44.isVariableDeclaration(decl) || ts44.isFunctionDeclaration(decl)) && decl.name !== void 0 && ts44.isIdentifier(decl.name)) {
    return decl.name;
  } else {
    return null;
  }
}
function getNameOfDeclaration(decl) {
  const id = getIdentifierOfDeclaration(decl);
  return id !== null ? id.text : "(unnamed)";
}
function getDescriptorOfDeclaration(decl) {
  switch (decl.kind) {
    case ts44.SyntaxKind.ClassDeclaration:
      return "class";
    case ts44.SyntaxKind.FunctionDeclaration:
      return "function";
    case ts44.SyntaxKind.VariableDeclaration:
      return "variable";
    case ts44.SyntaxKind.EnumDeclaration:
      return "enum";
    default:
      return "declaration";
  }
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/entry_point/src/reference_graph.mjs
var ReferenceGraph = class {
  constructor() {
    this.references = new Map();
  }
  add(from, to) {
    if (!this.references.has(from)) {
      this.references.set(from, new Set());
    }
    this.references.get(from).add(to);
  }
  transitiveReferencesOf(target) {
    const set = new Set();
    this.collectTransitiveReferences(set, target);
    return set;
  }
  pathFrom(source, target) {
    return this.collectPathFrom(source, target, new Set());
  }
  collectPathFrom(source, target, seen) {
    if (source === target) {
      return [target];
    } else if (seen.has(source)) {
      return null;
    }
    seen.add(source);
    if (!this.references.has(source)) {
      return null;
    } else {
      let candidatePath = null;
      this.references.get(source).forEach((edge) => {
        if (candidatePath !== null) {
          return;
        }
        const partialPath = this.collectPathFrom(edge, target, seen);
        if (partialPath !== null) {
          candidatePath = [source, ...partialPath];
        }
      });
      return candidatePath;
    }
  }
  collectTransitiveReferences(set, decl) {
    if (this.references.has(decl)) {
      this.references.get(decl).forEach((ref) => {
        if (!set.has(ref)) {
          set.add(ref);
          this.collectTransitiveReferences(set, ref);
        }
      });
    }
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/program_driver/src/api.mjs
var NgOriginalFile = Symbol("NgOriginalFile");
var UpdateMode;
(function(UpdateMode2) {
  UpdateMode2[UpdateMode2["Complete"] = 0] = "Complete";
  UpdateMode2[UpdateMode2["Incremental"] = 1] = "Incremental";
})(UpdateMode || (UpdateMode = {}));

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/program_driver/src/ts_create_program_driver.mjs
import ts48 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/shims/src/adapter.mjs
import ts45 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/shims/src/expando.mjs
var NgExtension = Symbol("NgExtension");
function isExtended(sf) {
  return sf[NgExtension] !== void 0;
}
function sfExtensionData(sf) {
  const extSf = sf;
  if (extSf[NgExtension] !== void 0) {
    return extSf[NgExtension];
  }
  const extension = {
    isTopLevelShim: false,
    fileShim: null,
    originalReferencedFiles: null,
    taggedReferenceFiles: null
  };
  extSf[NgExtension] = extension;
  return extension;
}
function isFileShimSourceFile(sf) {
  return isExtended(sf) && sf[NgExtension].fileShim !== null;
}
function isShim(sf) {
  return isExtended(sf) && (sf[NgExtension].fileShim !== null || sf[NgExtension].isTopLevelShim);
}
function copyFileShimData(from, to) {
  if (!isFileShimSourceFile(from)) {
    return;
  }
  sfExtensionData(to).fileShim = sfExtensionData(from).fileShim;
}
function untagAllTsFiles(program) {
  for (const sf of program.getSourceFiles()) {
    untagTsFile(sf);
  }
}
function retagAllTsFiles(program) {
  for (const sf of program.getSourceFiles()) {
    retagTsFile(sf);
  }
}
function untagTsFile(sf) {
  if (sf.isDeclarationFile || !isExtended(sf)) {
    return;
  }
  const ext = sfExtensionData(sf);
  if (ext.originalReferencedFiles !== null) {
    sf.referencedFiles = ext.originalReferencedFiles;
  }
}
function retagTsFile(sf) {
  if (sf.isDeclarationFile || !isExtended(sf)) {
    return;
  }
  const ext = sfExtensionData(sf);
  if (ext.taggedReferenceFiles !== null) {
    sf.referencedFiles = ext.taggedReferenceFiles;
  }
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/shims/src/util.mjs
var TS_EXTENSIONS = /\.tsx?$/i;
function makeShimFileName(fileName, suffix) {
  return absoluteFrom(fileName.replace(TS_EXTENSIONS, suffix));
}
function generatedModuleName(originalModuleName, originalFileName, genSuffix) {
  let moduleName;
  if (originalFileName.endsWith("/index.ts")) {
    moduleName = originalModuleName + "/index" + genSuffix;
  } else {
    moduleName = originalModuleName + genSuffix;
  }
  return moduleName;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/shims/src/adapter.mjs
var ShimAdapter = class {
  constructor(delegate, tsRootFiles, topLevelGenerators, perFileGenerators, oldProgram) {
    this.delegate = delegate;
    this.shims = new Map();
    this.priorShims = new Map();
    this.notShims = new Set();
    this.generators = [];
    this.ignoreForEmit = new Set();
    this.extensionPrefixes = [];
    for (const gen of perFileGenerators) {
      const pattern = `^(.*)\\.${gen.extensionPrefix}\\.ts$`;
      const regexp = new RegExp(pattern, "i");
      this.generators.push({
        generator: gen,
        test: regexp,
        suffix: `.${gen.extensionPrefix}.ts`
      });
      this.extensionPrefixes.push(gen.extensionPrefix);
    }
    const extraInputFiles = [];
    for (const gen of topLevelGenerators) {
      const sf = gen.makeTopLevelShim();
      sfExtensionData(sf).isTopLevelShim = true;
      if (!gen.shouldEmit) {
        this.ignoreForEmit.add(sf);
      }
      const fileName = absoluteFromSourceFile(sf);
      this.shims.set(fileName, sf);
      extraInputFiles.push(fileName);
    }
    for (const rootFile of tsRootFiles) {
      for (const gen of this.generators) {
        extraInputFiles.push(makeShimFileName(rootFile, gen.suffix));
      }
    }
    this.extraInputFiles = extraInputFiles;
    if (oldProgram !== null) {
      for (const oldSf of oldProgram.getSourceFiles()) {
        if (oldSf.isDeclarationFile || !isFileShimSourceFile(oldSf)) {
          continue;
        }
        this.priorShims.set(absoluteFromSourceFile(oldSf), oldSf);
      }
    }
  }
  maybeGenerate(fileName) {
    if (this.notShims.has(fileName)) {
      return null;
    } else if (this.shims.has(fileName)) {
      return this.shims.get(fileName);
    }
    if (isDtsPath(fileName)) {
      this.notShims.add(fileName);
      return null;
    }
    for (const record of this.generators) {
      const match = record.test.exec(fileName);
      if (match === null) {
        continue;
      }
      const prefix = match[1];
      let baseFileName = absoluteFrom(prefix + ".ts");
      if (!this.delegate.fileExists(baseFileName)) {
        baseFileName = absoluteFrom(prefix + ".tsx");
        if (!this.delegate.fileExists(baseFileName)) {
          return void 0;
        }
      }
      const inputFile = this.delegate.getSourceFile(baseFileName, ts45.ScriptTarget.Latest);
      if (inputFile === void 0 || isShim(inputFile)) {
        return void 0;
      }
      return this.generateSpecific(fileName, record.generator, inputFile);
    }
    this.notShims.add(fileName);
    return null;
  }
  generateSpecific(fileName, generator, inputFile) {
    let priorShimSf = null;
    if (this.priorShims.has(fileName)) {
      priorShimSf = this.priorShims.get(fileName);
      this.priorShims.delete(fileName);
    }
    const shimSf = generator.generateShimForFile(inputFile, fileName, priorShimSf);
    sfExtensionData(shimSf).fileShim = {
      extension: generator.extensionPrefix,
      generatedFrom: absoluteFromSourceFile(inputFile)
    };
    if (!generator.shouldEmit) {
      this.ignoreForEmit.add(shimSf);
    }
    this.shims.set(fileName, shimSf);
    return shimSf;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/shims/src/factory_generator.mjs
import ts46 from "typescript";
var TS_DTS_SUFFIX = /(\.d)?\.ts$/;
var STRIP_NG_FACTORY = /(.*)NgFactory$/;
var FactoryGenerator = class {
  constructor() {
    this.sourceInfo = new Map();
    this.sourceToFactorySymbols = new Map();
    this.shouldEmit = true;
    this.extensionPrefix = "ngfactory";
  }
  generateShimForFile(sf, genFilePath) {
    const absoluteSfPath = absoluteFromSourceFile(sf);
    const relativePathToSource = "./" + basename(sf.fileName).replace(TS_DTS_SUFFIX, "");
    const symbolNames = sf.statements.filter(ts46.isClassDeclaration).filter((decl) => isExported(decl) && decl.decorators !== void 0 && decl.name !== void 0).map((decl) => decl.name.text);
    let sourceText = "";
    const leadingComment = getFileoverviewComment(sf);
    if (leadingComment !== null) {
      sourceText = leadingComment + "\n\n";
    }
    if (symbolNames.length > 0) {
      const varLines = symbolNames.map((name) => `export const ${name}NgFactory: i0.\u0275NgModuleFactory<any> = new i0.\u0275NgModuleFactory(${name});`);
      sourceText += [
        `import * as i0 from '@angular/core';`,
        `import {${symbolNames.join(", ")}} from '${relativePathToSource}';`,
        ...varLines
      ].join("\n");
    }
    sourceText += "\nexport const \u0275NonEmptyModule = true;";
    const genFile = ts46.createSourceFile(genFilePath, sourceText, sf.languageVersion, true, ts46.ScriptKind.TS);
    if (sf.moduleName !== void 0) {
      genFile.moduleName = generatedModuleName(sf.moduleName, sf.fileName, ".ngfactory");
    }
    const moduleSymbols = new Map();
    this.sourceToFactorySymbols.set(absoluteSfPath, moduleSymbols);
    this.sourceInfo.set(genFilePath, {
      sourceFilePath: absoluteSfPath,
      moduleSymbols
    });
    return genFile;
  }
  track(sf, moduleInfo) {
    if (this.sourceToFactorySymbols.has(sf.fileName)) {
      this.sourceToFactorySymbols.get(sf.fileName).set(moduleInfo.name, moduleInfo);
    }
  }
};
function isExported(decl) {
  return decl.modifiers !== void 0 && decl.modifiers.some((mod) => mod.kind == ts46.SyntaxKind.ExportKeyword);
}
function generatedFactoryTransform(factoryMap, importRewriter) {
  return (context) => {
    return (file) => {
      return transformFactorySourceFile(factoryMap, context, importRewriter, file);
    };
  };
}
function transformFactorySourceFile(factoryMap, context, importRewriter, file) {
  if (!factoryMap.has(file.fileName)) {
    return file;
  }
  const { moduleSymbols, sourceFilePath } = factoryMap.get(file.fileName);
  const transformedStatements = [];
  let nonEmptyExport = null;
  const coreImportIdentifiers = new Set();
  for (const stmt of file.statements) {
    if (ts46.isImportDeclaration(stmt) && ts46.isStringLiteral(stmt.moduleSpecifier) && stmt.moduleSpecifier.text === "@angular/core") {
      const rewrittenModuleSpecifier = importRewriter.rewriteSpecifier("@angular/core", sourceFilePath);
      if (rewrittenModuleSpecifier !== stmt.moduleSpecifier.text) {
        transformedStatements.push(ts46.updateImportDeclaration(stmt, stmt.decorators, stmt.modifiers, stmt.importClause, ts46.createStringLiteral(rewrittenModuleSpecifier)));
        if (stmt.importClause !== void 0 && stmt.importClause.namedBindings !== void 0 && ts46.isNamespaceImport(stmt.importClause.namedBindings)) {
          coreImportIdentifiers.add(stmt.importClause.namedBindings.name.text);
        }
      } else {
        transformedStatements.push(stmt);
      }
    } else if (ts46.isVariableStatement(stmt) && stmt.declarationList.declarations.length === 1) {
      const decl = stmt.declarationList.declarations[0];
      if (ts46.isIdentifier(decl.name)) {
        if (decl.name.text === "\u0275NonEmptyModule") {
          nonEmptyExport = stmt;
          continue;
        }
        const match = STRIP_NG_FACTORY.exec(decl.name.text);
        const module2 = match ? moduleSymbols.get(match[1]) : null;
        if (module2) {
          const moduleIsTreeShakable = !module2.hasId;
          const newStmt = !moduleIsTreeShakable ? stmt : updateInitializers(stmt, (init) => init ? wrapInNoSideEffects(init) : void 0);
          transformedStatements.push(newStmt);
        }
      } else {
        transformedStatements.push(stmt);
      }
    } else {
      transformedStatements.push(stmt);
    }
  }
  if (!transformedStatements.some(ts46.isVariableStatement) && nonEmptyExport !== null) {
    transformedStatements.push(nonEmptyExport);
  }
  file = ts46.updateSourceFileNode(file, transformedStatements);
  if (coreImportIdentifiers.size > 0) {
    const visit2 = (node) => {
      node = ts46.visitEachChild(node, (child) => visit2(child), context);
      if (ts46.isPropertyAccessExpression(node) && ts46.isIdentifier(node.expression) && coreImportIdentifiers.has(node.expression.text)) {
        const rewrittenSymbol = importRewriter.rewriteSymbol(node.name.text, "@angular/core");
        if (rewrittenSymbol !== node.name.text) {
          const updated = ts46.updatePropertyAccess(node, node.expression, ts46.createIdentifier(rewrittenSymbol));
          node = updated;
        }
      }
      return node;
    };
    file = visit2(file);
  }
  return file;
}
function getFileoverviewComment(sourceFile) {
  const text = sourceFile.getFullText();
  const trivia = text.substring(0, sourceFile.getStart());
  const leadingComments = ts46.getLeadingCommentRanges(trivia, 0);
  if (!leadingComments || leadingComments.length === 0) {
    return null;
  }
  const comment = leadingComments[0];
  if (comment.kind !== ts46.SyntaxKind.MultiLineCommentTrivia) {
    return null;
  }
  if (text.substring(comment.end, comment.end + 2) !== "\n\n") {
    return null;
  }
  const commentText = text.substring(comment.pos, comment.end);
  if (commentText.indexOf("@license") !== -1) {
    return null;
  }
  return commentText;
}
function wrapInNoSideEffects(expr) {
  const noSideEffects = ts46.createPropertyAccess(ts46.createIdentifier("i0"), "\u0275noSideEffects");
  return ts46.createCall(noSideEffects, [], [
    ts46.createFunctionExpression([], void 0, void 0, [], [], void 0, ts46.createBlock([
      ts46.createReturn(expr)
    ]))
  ]);
}
function updateInitializers(stmt, update) {
  return ts46.updateVariableStatement(stmt, stmt.modifiers, ts46.updateVariableDeclarationList(stmt.declarationList, stmt.declarationList.declarations.map((decl) => ts46.updateVariableDeclaration(decl, decl.name, decl.type, update(decl.initializer)))));
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/shims/src/reference_tagger.mjs
var ShimReferenceTagger = class {
  constructor(shimExtensions) {
    this.tagged = new Set();
    this.enabled = true;
    this.suffixes = shimExtensions.map((extension) => `.${extension}.ts`);
  }
  tag(sf) {
    if (!this.enabled || sf.isDeclarationFile || isShim(sf) || this.tagged.has(sf) || !isNonDeclarationTsPath(sf.fileName)) {
      return;
    }
    const ext = sfExtensionData(sf);
    if (ext.originalReferencedFiles === null) {
      ext.originalReferencedFiles = sf.referencedFiles;
    }
    const referencedFiles = [...ext.originalReferencedFiles];
    const sfPath = absoluteFromSourceFile(sf);
    for (const suffix of this.suffixes) {
      referencedFiles.push({
        fileName: makeShimFileName(sfPath, suffix),
        pos: 0,
        end: 0
      });
    }
    ext.taggedReferenceFiles = referencedFiles;
    sf.referencedFiles = referencedFiles;
    this.tagged.add(sf);
  }
  finalize() {
    this.enabled = false;
    this.tagged.clear();
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/shims/src/summary_generator.mjs
import ts47 from "typescript";
var SummaryGenerator = class {
  constructor() {
    this.shouldEmit = true;
    this.extensionPrefix = "ngsummary";
  }
  generateShimForFile(sf, genFilePath) {
    const symbolNames = [];
    for (const stmt of sf.statements) {
      if (ts47.isClassDeclaration(stmt)) {
        if (!isExported2(stmt) || stmt.decorators === void 0 || stmt.name === void 0) {
          continue;
        }
        symbolNames.push(stmt.name.text);
      } else if (ts47.isExportDeclaration(stmt)) {
        if (stmt.exportClause === void 0 || stmt.moduleSpecifier !== void 0 || !ts47.isNamedExports(stmt.exportClause)) {
          continue;
        }
        for (const specifier of stmt.exportClause.elements) {
          symbolNames.push(specifier.name.text);
        }
      }
    }
    const varLines = symbolNames.map((name) => `export const ${name}NgSummary: any = null;`);
    if (varLines.length === 0) {
      varLines.push(`export const \u0275empty = null;`);
    }
    const sourceText = varLines.join("\n");
    const genFile = ts47.createSourceFile(genFilePath, sourceText, sf.languageVersion, true, ts47.ScriptKind.TS);
    if (sf.moduleName !== void 0) {
      genFile.moduleName = generatedModuleName(sf.moduleName, sf.fileName, ".ngsummary");
    }
    return genFile;
  }
};
function isExported2(decl) {
  return decl.modifiers !== void 0 && decl.modifiers.some((mod) => mod.kind == ts47.SyntaxKind.ExportKeyword);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/program_driver/src/ts_create_program_driver.mjs
var DelegatingCompilerHost = class {
  constructor(delegate) {
    this.delegate = delegate;
    this.createHash = this.delegateMethod("createHash");
    this.directoryExists = this.delegateMethod("directoryExists");
    this.getCancellationToken = this.delegateMethod("getCancellationToken");
    this.getCanonicalFileName = this.delegateMethod("getCanonicalFileName");
    this.getCurrentDirectory = this.delegateMethod("getCurrentDirectory");
    this.getDefaultLibFileName = this.delegateMethod("getDefaultLibFileName");
    this.getDefaultLibLocation = this.delegateMethod("getDefaultLibLocation");
    this.getDirectories = this.delegateMethod("getDirectories");
    this.getEnvironmentVariable = this.delegateMethod("getEnvironmentVariable");
    this.getNewLine = this.delegateMethod("getNewLine");
    this.getParsedCommandLine = this.delegateMethod("getParsedCommandLine");
    this.getSourceFileByPath = this.delegateMethod("getSourceFileByPath");
    this.readDirectory = this.delegateMethod("readDirectory");
    this.readFile = this.delegateMethod("readFile");
    this.realpath = this.delegateMethod("realpath");
    this.resolveModuleNames = this.delegateMethod("resolveModuleNames");
    this.resolveTypeReferenceDirectives = this.delegateMethod("resolveTypeReferenceDirectives");
    this.trace = this.delegateMethod("trace");
    this.useCaseSensitiveFileNames = this.delegateMethod("useCaseSensitiveFileNames");
  }
  delegateMethod(name) {
    return this.delegate[name] !== void 0 ? this.delegate[name].bind(this.delegate) : void 0;
  }
};
var UpdatedProgramHost = class extends DelegatingCompilerHost {
  constructor(sfMap, originalProgram, delegate, shimExtensionPrefixes) {
    super(delegate);
    this.originalProgram = originalProgram;
    this.shimExtensionPrefixes = shimExtensionPrefixes;
    this.shimTagger = new ShimReferenceTagger(this.shimExtensionPrefixes);
    this.sfMap = sfMap;
  }
  getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile) {
    let delegateSf = this.originalProgram.getSourceFile(fileName);
    if (delegateSf === void 0) {
      delegateSf = this.delegate.getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
    }
    if (delegateSf === void 0) {
      return void 0;
    }
    let sf;
    if (this.sfMap.has(fileName)) {
      sf = this.sfMap.get(fileName);
      copyFileShimData(delegateSf, sf);
    } else {
      sf = delegateSf;
    }
    sf = toUnredirectedSourceFile(sf);
    this.shimTagger.tag(sf);
    return sf;
  }
  postProgramCreationCleanup() {
    this.shimTagger.finalize();
  }
  writeFile() {
    throw new Error(`TypeCheckProgramHost should never write files`);
  }
  fileExists(fileName) {
    return this.sfMap.has(fileName) || this.delegate.fileExists(fileName);
  }
};
var TsCreateProgramDriver = class {
  constructor(originalProgram, originalHost, options, shimExtensionPrefixes) {
    this.originalProgram = originalProgram;
    this.originalHost = originalHost;
    this.options = options;
    this.shimExtensionPrefixes = shimExtensionPrefixes;
    this.sfMap = new Map();
    this.program = this.originalProgram;
    this.supportsInlineOperations = true;
  }
  getProgram() {
    return this.program;
  }
  updateFiles(contents, updateMode) {
    if (contents.size === 0) {
      if (updateMode !== UpdateMode.Complete || this.sfMap.size === 0) {
        return;
      }
    }
    if (updateMode === UpdateMode.Complete) {
      this.sfMap.clear();
    }
    for (const [filePath, { newText, originalFile }] of contents.entries()) {
      const sf = ts48.createSourceFile(filePath, newText, ts48.ScriptTarget.Latest, true);
      if (originalFile !== null) {
        sf[NgOriginalFile] = originalFile;
      }
      this.sfMap.set(filePath, sf);
    }
    const host = new UpdatedProgramHost(this.sfMap, this.originalProgram, this.originalHost, this.shimExtensionPrefixes);
    const oldProgram = this.program;
    retagAllTsFiles(oldProgram);
    this.program = ts48.createProgram({
      host,
      rootNames: this.program.getRootFileNames(),
      options: this.options,
      oldProgram
    });
    host.postProgramCreationCleanup();
    untagAllTsFiles(this.program);
    untagAllTsFiles(oldProgram);
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/incremental/src/dependency_tracking.mjs
var FileDependencyGraph = class {
  constructor() {
    this.nodes = new Map();
  }
  addDependency(from, on) {
    this.nodeFor(from).dependsOn.add(absoluteFromSourceFile(on));
  }
  addResourceDependency(from, resource) {
    this.nodeFor(from).usesResources.add(resource);
  }
  recordDependencyAnalysisFailure(file) {
    this.nodeFor(file).failedAnalysis = true;
  }
  getResourceDependencies(from) {
    const node = this.nodes.get(from);
    return node ? [...node.usesResources] : [];
  }
  updateWithPhysicalChanges(previous, changedTsPaths, deletedTsPaths, changedResources) {
    const logicallyChanged = new Set();
    for (const sf of previous.nodes.keys()) {
      const sfPath = absoluteFromSourceFile(sf);
      const node = previous.nodeFor(sf);
      if (isLogicallyChanged(sf, node, changedTsPaths, deletedTsPaths, changedResources)) {
        logicallyChanged.add(sfPath);
      } else if (!deletedTsPaths.has(sfPath)) {
        this.nodes.set(sf, {
          dependsOn: new Set(node.dependsOn),
          usesResources: new Set(node.usesResources),
          failedAnalysis: false
        });
      }
    }
    return logicallyChanged;
  }
  nodeFor(sf) {
    if (!this.nodes.has(sf)) {
      this.nodes.set(sf, {
        dependsOn: new Set(),
        usesResources: new Set(),
        failedAnalysis: false
      });
    }
    return this.nodes.get(sf);
  }
};
function isLogicallyChanged(sf, node, changedTsPaths, deletedTsPaths, changedResources) {
  if (node.failedAnalysis) {
    return true;
  }
  const sfPath = absoluteFromSourceFile(sf);
  if (changedTsPaths.has(sfPath) || deletedTsPaths.has(sfPath)) {
    return true;
  }
  for (const dep of node.dependsOn) {
    if (changedTsPaths.has(dep) || deletedTsPaths.has(dep)) {
      return true;
    }
  }
  for (const dep of node.usesResources) {
    if (changedResources.has(dep)) {
      return true;
    }
  }
  return false;
}

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
var IncrementalCompilation = class {
  constructor(state, depGraph, versions, step) {
    this.depGraph = depGraph;
    this.versions = versions;
    this.step = step;
    this._state = state;
    this.phase = {
      kind: PhaseKind.Analysis,
      semanticDepGraphUpdater: new SemanticDepGraphUpdater(step !== null ? step.priorState.semanticDepGraph : null)
    };
  }
  static fresh(program, versions) {
    const state = {
      kind: IncrementalStateKind.Fresh
    };
    return new IncrementalCompilation(state, new FileDependencyGraph(), versions, null);
  }
  static incremental(program, newVersions, oldProgram, oldState, modifiedResourceFiles, perf) {
    return perf.inPhase(PerfPhase.Reconciliation, () => {
      const physicallyChangedTsFiles = new Set();
      const changedResourceFiles = new Set(modifiedResourceFiles != null ? modifiedResourceFiles : []);
      let priorAnalysis;
      switch (oldState.kind) {
        case IncrementalStateKind.Fresh:
          return IncrementalCompilation.fresh(program, newVersions);
        case IncrementalStateKind.Analyzed:
          priorAnalysis = oldState;
          break;
        case IncrementalStateKind.Delta:
          priorAnalysis = oldState.lastAnalyzedState;
          for (const sfPath of oldState.physicallyChangedTsFiles) {
            physicallyChangedTsFiles.add(sfPath);
          }
          for (const resourcePath of oldState.changedResourceFiles) {
            changedResourceFiles.add(resourcePath);
          }
          break;
      }
      const oldVersions = priorAnalysis.versions;
      const oldFilesArray = oldProgram.getSourceFiles().map(toOriginalSourceFile);
      const oldFiles = new Set(oldFilesArray);
      const deletedTsFiles = new Set(oldFilesArray.map((sf) => absoluteFromSourceFile(sf)));
      for (const possiblyRedirectedNewFile of program.getSourceFiles()) {
        const sf = toOriginalSourceFile(possiblyRedirectedNewFile);
        const sfPath = absoluteFromSourceFile(sf);
        deletedTsFiles.delete(sfPath);
        if (oldFiles.has(sf)) {
          if (oldVersions === null || newVersions === null) {
            continue;
          }
          if (oldVersions.has(sfPath) && newVersions.has(sfPath) && oldVersions.get(sfPath) === newVersions.get(sfPath)) {
            continue;
          }
        }
        if (sf.isDeclarationFile) {
          return IncrementalCompilation.fresh(program, newVersions);
        }
        physicallyChangedTsFiles.add(sfPath);
      }
      for (const deletedFileName of deletedTsFiles) {
        physicallyChangedTsFiles.delete(resolve(deletedFileName));
      }
      const depGraph = new FileDependencyGraph();
      const logicallyChangedTsFiles = depGraph.updateWithPhysicalChanges(priorAnalysis.depGraph, physicallyChangedTsFiles, deletedTsFiles, changedResourceFiles);
      for (const sfPath of physicallyChangedTsFiles) {
        logicallyChangedTsFiles.add(sfPath);
      }
      const state = {
        kind: IncrementalStateKind.Delta,
        physicallyChangedTsFiles,
        changedResourceFiles,
        lastAnalyzedState: priorAnalysis
      };
      return new IncrementalCompilation(state, depGraph, newVersions, {
        priorState: priorAnalysis,
        logicallyChangedTsFiles
      });
    });
  }
  get state() {
    return this._state;
  }
  get semanticDepGraphUpdater() {
    if (this.phase.kind !== PhaseKind.Analysis) {
      throw new Error(`AssertionError: Cannot update the SemanticDepGraph after analysis completes`);
    }
    return this.phase.semanticDepGraphUpdater;
  }
  recordSuccessfulAnalysis(traitCompiler) {
    if (this.phase.kind !== PhaseKind.Analysis) {
      throw new Error(`AssertionError: Incremental compilation in phase ${PhaseKind[this.phase.kind]}, expected Analysis`);
    }
    const { needsEmit, needsTypeCheckEmit, newGraph } = this.phase.semanticDepGraphUpdater.finalize();
    let emitted;
    if (this.step === null) {
      emitted = new Set();
    } else {
      emitted = new Set(this.step.priorState.emitted);
      for (const sfPath of this.step.logicallyChangedTsFiles) {
        emitted.delete(sfPath);
      }
      for (const sfPath of needsEmit) {
        emitted.delete(sfPath);
      }
    }
    this._state = {
      kind: IncrementalStateKind.Analyzed,
      versions: this.versions,
      depGraph: this.depGraph,
      semanticDepGraph: newGraph,
      priorAnalysis: traitCompiler.getAnalyzedRecords(),
      typeCheckResults: null,
      emitted
    };
    this.phase = {
      kind: PhaseKind.TypeCheckAndEmit,
      needsEmit,
      needsTypeCheckEmit
    };
  }
  recordSuccessfulTypeCheck(results) {
    if (this._state.kind !== IncrementalStateKind.Analyzed) {
      throw new Error(`AssertionError: Expected successfully analyzed compilation.`);
    } else if (this.phase.kind !== PhaseKind.TypeCheckAndEmit) {
      throw new Error(`AssertionError: Incremental compilation in phase ${PhaseKind[this.phase.kind]}, expected TypeCheck`);
    }
    this._state.typeCheckResults = results;
  }
  recordSuccessfulEmit(sf) {
    if (this._state.kind !== IncrementalStateKind.Analyzed) {
      throw new Error(`AssertionError: Expected successfully analyzed compilation.`);
    }
    this._state.emitted.add(absoluteFromSourceFile(sf));
  }
  priorAnalysisFor(sf) {
    if (this.step === null) {
      return null;
    }
    const sfPath = absoluteFromSourceFile(sf);
    if (this.step.logicallyChangedTsFiles.has(sfPath)) {
      return null;
    }
    const priorAnalysis = this.step.priorState.priorAnalysis;
    if (!priorAnalysis.has(sf)) {
      return null;
    }
    return priorAnalysis.get(sf);
  }
  priorTypeCheckingResultsFor(sf) {
    if (this.phase.kind !== PhaseKind.TypeCheckAndEmit) {
      throw new Error(`AssertionError: Expected successfully analyzed compilation.`);
    }
    if (this.step === null) {
      return null;
    }
    const sfPath = absoluteFromSourceFile(sf);
    if (this.step.logicallyChangedTsFiles.has(sfPath) || this.phase.needsTypeCheckEmit.has(sfPath)) {
      return null;
    }
    if (this.step.priorState.typeCheckResults === null || !this.step.priorState.typeCheckResults.has(sfPath)) {
      return null;
    }
    const priorResults = this.step.priorState.typeCheckResults.get(sfPath);
    if (priorResults.hasInlines) {
      return null;
    }
    return priorResults;
  }
  safeToSkipEmit(sf) {
    if (this.step === null) {
      return false;
    }
    const sfPath = absoluteFromSourceFile(sf);
    if (this.step.logicallyChangedTsFiles.has(sfPath)) {
      return false;
    }
    if (this.phase.kind !== PhaseKind.TypeCheckAndEmit) {
      throw new Error(`AssertionError: Expected successful analysis before attempting to emit files`);
    }
    if (this.phase.needsEmit.has(sfPath)) {
      return false;
    }
    return this.step.priorState.emitted.has(sfPath);
  }
};
function toOriginalSourceFile(sf) {
  const unredirectedSf = toUnredirectedSourceFile(sf);
  const originalFile = unredirectedSf[NgOriginalFile];
  if (originalFile !== void 0) {
    return originalFile;
  } else {
    return unredirectedSf;
  }
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/incremental/src/strategy.mjs
var TrackedIncrementalBuildStrategy = class {
  constructor() {
    this.state = null;
    this.isSet = false;
  }
  getIncrementalState() {
    return this.state;
  }
  setIncrementalState(state) {
    this.state = state;
    this.isSet = true;
  }
  toNextBuildStrategy() {
    const strategy = new TrackedIncrementalBuildStrategy();
    strategy.state = this.isSet ? this.state : null;
    return strategy;
  }
};
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
var AbsoluteSourceSpan = class {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/indexer/src/context.mjs
var IndexingContext = class {
  constructor() {
    this.components = new Set();
  }
  addComponent(info) {
    this.components.add(info);
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/indexer/src/transform.mjs
import { ParseSourceFile as ParseSourceFile3 } from "@angular/compiler";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/indexer/src/template.mjs
import { ASTWithSource, ImplicitReceiver, RecursiveAstVisitor, TmplAstElement, TmplAstRecursiveVisitor, TmplAstReference, TmplAstTemplate } from "@angular/compiler";
var ExpressionVisitor = class extends RecursiveAstVisitor {
  constructor(expressionStr, absoluteOffset, boundTemplate, targetToIdentifier) {
    super();
    this.expressionStr = expressionStr;
    this.absoluteOffset = absoluteOffset;
    this.boundTemplate = boundTemplate;
    this.targetToIdentifier = targetToIdentifier;
    this.identifiers = [];
  }
  static getIdentifiers(ast, source, absoluteOffset, boundTemplate, targetToIdentifier) {
    const visitor = new ExpressionVisitor(source, absoluteOffset, boundTemplate, targetToIdentifier);
    visitor.visit(ast);
    return visitor.identifiers;
  }
  visit(ast) {
    ast.visit(this);
  }
  visitPropertyRead(ast, context) {
    this.visitIdentifier(ast, IdentifierKind.Property);
    super.visitPropertyRead(ast, context);
  }
  visitPropertyWrite(ast, context) {
    this.visitIdentifier(ast, IdentifierKind.Property);
    super.visitPropertyWrite(ast, context);
  }
  visitIdentifier(ast, kind) {
    if (!(ast.receiver instanceof ImplicitReceiver)) {
      return;
    }
    const identifierStart = ast.sourceSpan.start - this.absoluteOffset;
    if (!this.expressionStr.substring(identifierStart).startsWith(ast.name)) {
      throw new Error(`Impossible state: "${ast.name}" not found in "${this.expressionStr}" at location ${identifierStart}`);
    }
    const absoluteStart = this.absoluteOffset + identifierStart;
    const span = new AbsoluteSourceSpan(absoluteStart, absoluteStart + ast.name.length);
    const targetAst = this.boundTemplate.getExpressionTarget(ast);
    const target = targetAst ? this.targetToIdentifier(targetAst) : null;
    const identifier = {
      name: ast.name,
      span,
      kind,
      target
    };
    this.identifiers.push(identifier);
  }
};
var TemplateVisitor = class extends TmplAstRecursiveVisitor {
  constructor(boundTemplate) {
    super();
    this.boundTemplate = boundTemplate;
    this.identifiers = new Set();
    this.targetIdentifierCache = new Map();
    this.elementAndTemplateIdentifierCache = new Map();
  }
  visit(node) {
    node.visit(this);
  }
  visitAll(nodes) {
    nodes.forEach((node) => this.visit(node));
  }
  visitElement(element) {
    const elementIdentifier = this.elementOrTemplateToIdentifier(element);
    this.identifiers.add(elementIdentifier);
    this.visitAll(element.references);
    this.visitAll(element.inputs);
    this.visitAll(element.attributes);
    this.visitAll(element.children);
    this.visitAll(element.outputs);
  }
  visitTemplate(template) {
    const templateIdentifier = this.elementOrTemplateToIdentifier(template);
    this.identifiers.add(templateIdentifier);
    this.visitAll(template.variables);
    this.visitAll(template.attributes);
    this.visitAll(template.templateAttrs);
    this.visitAll(template.children);
    this.visitAll(template.references);
  }
  visitBoundAttribute(attribute) {
    if (attribute.valueSpan === void 0) {
      return;
    }
    const identifiers = ExpressionVisitor.getIdentifiers(attribute.value, attribute.valueSpan.toString(), attribute.valueSpan.start.offset, this.boundTemplate, this.targetToIdentifier.bind(this));
    identifiers.forEach((id) => this.identifiers.add(id));
  }
  visitBoundEvent(attribute) {
    this.visitExpression(attribute.handler);
  }
  visitBoundText(text) {
    this.visitExpression(text.value);
  }
  visitReference(reference) {
    const referenceIdentifer = this.targetToIdentifier(reference);
    this.identifiers.add(referenceIdentifer);
  }
  visitVariable(variable) {
    const variableIdentifier = this.targetToIdentifier(variable);
    this.identifiers.add(variableIdentifier);
  }
  elementOrTemplateToIdentifier(node) {
    if (this.elementAndTemplateIdentifierCache.has(node)) {
      return this.elementAndTemplateIdentifierCache.get(node);
    }
    let name;
    let kind;
    if (node instanceof TmplAstTemplate) {
      name = node.tagName;
      kind = IdentifierKind.Template;
    } else {
      name = node.name;
      kind = IdentifierKind.Element;
    }
    const sourceSpan = node.startSourceSpan;
    const start = this.getStartLocation(name, sourceSpan);
    const absoluteSpan = new AbsoluteSourceSpan(start, start + name.length);
    const attributes = node.attributes.map(({ name: name2, sourceSpan: sourceSpan2 }) => {
      return {
        name: name2,
        span: new AbsoluteSourceSpan(sourceSpan2.start.offset, sourceSpan2.end.offset),
        kind: IdentifierKind.Attribute
      };
    });
    const usedDirectives = this.boundTemplate.getDirectivesOfNode(node) || [];
    const identifier = {
      name,
      span: absoluteSpan,
      kind,
      attributes: new Set(attributes),
      usedDirectives: new Set(usedDirectives.map((dir) => {
        return {
          node: dir.ref.node,
          selector: dir.selector
        };
      }))
    };
    this.elementAndTemplateIdentifierCache.set(node, identifier);
    return identifier;
  }
  targetToIdentifier(node) {
    if (this.targetIdentifierCache.has(node)) {
      return this.targetIdentifierCache.get(node);
    }
    const { name, sourceSpan } = node;
    const start = this.getStartLocation(name, sourceSpan);
    const span = new AbsoluteSourceSpan(start, start + name.length);
    let identifier;
    if (node instanceof TmplAstReference) {
      const refTarget = this.boundTemplate.getReferenceTarget(node);
      let target = null;
      if (refTarget) {
        if (refTarget instanceof TmplAstElement || refTarget instanceof TmplAstTemplate) {
          target = {
            node: this.elementOrTemplateToIdentifier(refTarget),
            directive: null
          };
        } else {
          target = {
            node: this.elementOrTemplateToIdentifier(refTarget.node),
            directive: refTarget.directive.ref.node
          };
        }
      }
      identifier = {
        name,
        span,
        kind: IdentifierKind.Reference,
        target
      };
    } else {
      identifier = {
        name,
        span,
        kind: IdentifierKind.Variable
      };
    }
    this.targetIdentifierCache.set(node, identifier);
    return identifier;
  }
  getStartLocation(name, context) {
    const localStr = context.toString();
    if (!localStr.includes(name)) {
      throw new Error(`Impossible state: "${name}" not found in "${localStr}"`);
    }
    return context.start.offset + localStr.indexOf(name);
  }
  visitExpression(ast) {
    if (ast instanceof ASTWithSource && ast.source !== null) {
      const targetToIdentifier = this.targetToIdentifier.bind(this);
      const absoluteOffset = ast.sourceSpan.start;
      const identifiers = ExpressionVisitor.getIdentifiers(ast, ast.source, absoluteOffset, this.boundTemplate, targetToIdentifier);
      identifiers.forEach((id) => this.identifiers.add(id));
    }
  }
};
function getTemplateIdentifiers(boundTemplate) {
  const visitor = new TemplateVisitor(boundTemplate);
  if (boundTemplate.target.template !== void 0) {
    visitor.visitAll(boundTemplate.target.template);
  }
  return visitor.identifiers;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/indexer/src/transform.mjs
function generateAnalysis(context) {
  const analysis = new Map();
  context.components.forEach(({ declaration, selector, boundTemplate, templateMeta }) => {
    const name = declaration.name.getText();
    const usedComponents = new Set();
    const usedDirs = boundTemplate.getUsedDirectives();
    usedDirs.forEach((dir) => {
      if (dir.isComponent) {
        usedComponents.add(dir.ref.node);
      }
    });
    const componentFile = new ParseSourceFile3(declaration.getSourceFile().getFullText(), declaration.getSourceFile().fileName);
    let templateFile;
    if (templateMeta.isInline) {
      templateFile = componentFile;
    } else {
      templateFile = templateMeta.file;
    }
    analysis.set(declaration, {
      name,
      selector,
      file: componentFile,
      template: {
        identifiers: getTemplateIdentifiers(boundTemplate),
        usedComponents,
        isInline: templateMeta.isInline,
        file: templateFile
      }
    });
  });
  return analysis;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/resource/src/loader.mjs
import ts49 from "typescript";
var CSS_PREPROCESSOR_EXT2 = /(\.scss|\.sass|\.less|\.styl)$/;
var RESOURCE_MARKER = ".$ngresource$";
var RESOURCE_MARKER_TS = RESOURCE_MARKER + ".ts";
var AdapterResourceLoader = class {
  constructor(adapter, options) {
    this.adapter = adapter;
    this.options = options;
    this.cache = new Map();
    this.fetching = new Map();
    this.lookupResolutionHost = createLookupResolutionHost(this.adapter);
    this.canPreload = !!this.adapter.readResource;
    this.canPreprocess = !!this.adapter.transformResource;
  }
  resolve(url, fromFile) {
    let resolvedUrl = null;
    if (this.adapter.resourceNameToFileName) {
      resolvedUrl = this.adapter.resourceNameToFileName(url, fromFile, (url2, fromFile2) => this.fallbackResolve(url2, fromFile2));
    } else {
      resolvedUrl = this.fallbackResolve(url, fromFile);
    }
    if (resolvedUrl === null) {
      throw new Error(`HostResourceResolver: could not resolve ${url} in context of ${fromFile})`);
    }
    return resolvedUrl;
  }
  preload(resolvedUrl, context) {
    if (!this.adapter.readResource) {
      throw new Error("HostResourceLoader: the CompilerHost provided does not support pre-loading resources.");
    }
    if (this.cache.has(resolvedUrl)) {
      return void 0;
    } else if (this.fetching.has(resolvedUrl)) {
      return this.fetching.get(resolvedUrl);
    }
    let result = this.adapter.readResource(resolvedUrl);
    if (this.adapter.transformResource && context.type === "style") {
      const resourceContext = {
        type: "style",
        containingFile: context.containingFile,
        resourceFile: resolvedUrl
      };
      result = Promise.resolve(result).then(async (str) => {
        const transformResult = await this.adapter.transformResource(str, resourceContext);
        return transformResult === null ? str : transformResult.content;
      });
    }
    if (typeof result === "string") {
      this.cache.set(resolvedUrl, result);
      return void 0;
    } else {
      const fetchCompletion = result.then((str) => {
        this.fetching.delete(resolvedUrl);
        this.cache.set(resolvedUrl, str);
      });
      this.fetching.set(resolvedUrl, fetchCompletion);
      return fetchCompletion;
    }
  }
  async preprocessInline(data, context) {
    if (!this.adapter.transformResource || context.type !== "style") {
      return data;
    }
    const transformResult = await this.adapter.transformResource(data, { type: "style", containingFile: context.containingFile, resourceFile: null });
    if (transformResult === null) {
      return data;
    }
    return transformResult.content;
  }
  load(resolvedUrl) {
    if (this.cache.has(resolvedUrl)) {
      return this.cache.get(resolvedUrl);
    }
    const result = this.adapter.readResource ? this.adapter.readResource(resolvedUrl) : this.adapter.readFile(resolvedUrl);
    if (typeof result !== "string") {
      throw new Error(`HostResourceLoader: loader(${resolvedUrl}) returned a Promise`);
    }
    this.cache.set(resolvedUrl, result);
    return result;
  }
  invalidate() {
    this.cache.clear();
  }
  fallbackResolve(url, fromFile) {
    let candidateLocations;
    if (url.startsWith("/")) {
      candidateLocations = this.getRootedCandidateLocations(url);
    } else {
      if (!url.startsWith(".")) {
        url = `./${url}`;
      }
      candidateLocations = this.getResolvedCandidateLocations(url, fromFile);
    }
    for (const candidate of candidateLocations) {
      if (this.adapter.fileExists(candidate)) {
        return candidate;
      } else if (CSS_PREPROCESSOR_EXT2.test(candidate)) {
        const cssFallbackUrl = candidate.replace(CSS_PREPROCESSOR_EXT2, ".css");
        if (this.adapter.fileExists(cssFallbackUrl)) {
          return cssFallbackUrl;
        }
      }
    }
    return null;
  }
  getRootedCandidateLocations(url) {
    const segment = "." + url;
    return this.adapter.rootDirs.map((rootDir) => join(rootDir, segment));
  }
  getResolvedCandidateLocations(url, fromFile) {
    const failedLookup = ts49.resolveModuleName(url + RESOURCE_MARKER, fromFile, this.options, this.lookupResolutionHost);
    if (failedLookup.failedLookupLocations === void 0) {
      throw new Error(`Internal error: expected to find failedLookupLocations during resolution of resource '${url}' in context of ${fromFile}`);
    }
    return failedLookup.failedLookupLocations.filter((candidate) => candidate.endsWith(RESOURCE_MARKER_TS)).map((candidate) => candidate.slice(0, -RESOURCE_MARKER_TS.length));
  }
};
function createLookupResolutionHost(adapter) {
  var _a, _b, _c;
  return {
    directoryExists(directoryName) {
      if (directoryName.includes(RESOURCE_MARKER)) {
        return false;
      } else if (adapter.directoryExists !== void 0) {
        return adapter.directoryExists(directoryName);
      } else {
        return true;
      }
    },
    fileExists(fileName) {
      if (fileName.includes(RESOURCE_MARKER)) {
        return false;
      } else {
        return adapter.fileExists(fileName);
      }
    },
    readFile: adapter.readFile.bind(adapter),
    getCurrentDirectory: adapter.getCurrentDirectory.bind(adapter),
    getDirectories: (_a = adapter.getDirectories) == null ? void 0 : _a.bind(adapter),
    realpath: (_b = adapter.realpath) == null ? void 0 : _b.bind(adapter),
    trace: (_c = adapter.trace) == null ? void 0 : _c.bind(adapter)
  };
}

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
function reexportCollision(module2, refA, refB) {
  const childMessageText = `This directive/pipe is part of the exports of '${module2.name.text}' and shares the same name as another exported directive/pipe.`;
  return makeDiagnostic(ErrorCode.NGMODULE_REEXPORT_NAME_COLLISION, module2.name, `
    There was a name collision between two classes named '${refA.node.name.text}', which are both part of the exports of '${module2.name.text}'.

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
import ts52 from "typescript";
function makeTemplateDiagnostic(templateId, mapping, span, category, code, messageText, relatedMessages) {
  if (mapping.type === "direct") {
    let relatedInformation = void 0;
    if (relatedMessages !== void 0) {
      relatedInformation = [];
      for (const relatedMessage of relatedMessages) {
        relatedInformation.push({
          category: ts52.DiagnosticCategory.Message,
          code: 0,
          file: relatedMessage.sourceFile,
          start: relatedMessage.start,
          length: relatedMessage.end - relatedMessage.start,
          messageText: relatedMessage.text
        });
      }
    }
    return {
      source: "ngtsc",
      code,
      category,
      messageText,
      file: mapping.node.getSourceFile(),
      componentFile: mapping.node.getSourceFile(),
      templateId,
      start: span.start.offset,
      length: span.end.offset - span.start.offset,
      relatedInformation
    };
  } else if (mapping.type === "indirect" || mapping.type === "external") {
    const componentSf = mapping.componentClass.getSourceFile();
    const componentName = mapping.componentClass.name.text;
    const fileName = mapping.type === "indirect" ? `${componentSf.fileName} (${componentName} template)` : mapping.templateUrl;
    const sf = ts52.createSourceFile(fileName, mapping.template, ts52.ScriptTarget.Latest, false, ts52.ScriptKind.JSX);
    let relatedInformation = [];
    if (relatedMessages !== void 0) {
      for (const relatedMessage of relatedMessages) {
        relatedInformation.push({
          category: ts52.DiagnosticCategory.Message,
          code: 0,
          file: relatedMessage.sourceFile,
          start: relatedMessage.start,
          length: relatedMessage.end - relatedMessage.start,
          messageText: relatedMessage.text
        });
      }
    }
    relatedInformation.push({
      category: ts52.DiagnosticCategory.Message,
      code: 0,
      file: componentSf,
      start: mapping.node.getStart(),
      length: mapping.node.getEnd() - mapping.node.getStart(),
      messageText: `Error occurs in the template of component ${componentName}.`
    });
    return {
      source: "ngtsc",
      category,
      code,
      messageText,
      file: sf,
      componentFile: componentSf,
      templateId,
      start: span.start.offset,
      length: span.end.offset - span.start.offset,
      relatedInformation
    };
  } else {
    throw new Error(`Unexpected source mapping type: ${mapping.type}`);
  }
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/diagnostics/src/id.mjs
var TEMPLATE_ID = Symbol("ngTemplateId");
var NEXT_TEMPLATE_ID = Symbol("ngNextTemplateId");
function getTemplateId(clazz) {
  const node = clazz;
  if (node[TEMPLATE_ID] === void 0) {
    node[TEMPLATE_ID] = allocateTemplateId(node.getSourceFile());
  }
  return node[TEMPLATE_ID];
}
function allocateTemplateId(sf) {
  if (sf[NEXT_TEMPLATE_ID] === void 0) {
    sf[NEXT_TEMPLATE_ID] = 1;
  }
  return `tcb${sf[NEXT_TEMPLATE_ID]++}`;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/completion.mjs
import { EmptyExpr, ImplicitReceiver as ImplicitReceiver2, PropertyRead, PropertyWrite, SafePropertyRead, TmplAstReference as TmplAstReference2, TmplAstTextAttribute } from "@angular/compiler";
import ts54 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/comments.mjs
import { AbsoluteSourceSpan as AbsoluteSourceSpan2 } from "@angular/compiler";
import ts53 from "typescript";
var parseSpanComment = /^(\d+),(\d+)$/;
function readSpanComment(node, sourceFile = node.getSourceFile()) {
  return ts53.forEachTrailingCommentRange(sourceFile.text, node.getEnd(), (pos, end, kind) => {
    if (kind !== ts53.SyntaxKind.MultiLineCommentTrivia) {
      return null;
    }
    const commentText = sourceFile.text.substring(pos + 2, end - 2);
    const match = commentText.match(parseSpanComment);
    if (match === null) {
      return null;
    }
    return new AbsoluteSourceSpan2(+match[1], +match[2]);
  }) || null;
}
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
function addExpressionIdentifier(node, identifier) {
  ts53.addSyntheticTrailingComment(node, ts53.SyntaxKind.MultiLineCommentTrivia, `${CommentTriviaType.EXPRESSION_TYPE_IDENTIFIER}:${identifier}`, false);
}
var IGNORE_FOR_DIAGNOSTICS_MARKER = `${CommentTriviaType.DIAGNOSTIC}:ignore`;
function markIgnoreDiagnostics(node) {
  ts53.addSyntheticTrailingComment(node, ts53.SyntaxKind.MultiLineCommentTrivia, IGNORE_FOR_DIAGNOSTICS_MARKER, false);
}
function hasIgnoreForDiagnosticsMarker(node, sourceFile) {
  return ts53.forEachTrailingCommentRange(sourceFile.text, node.getEnd(), (pos, end, kind) => {
    if (kind !== ts53.SyntaxKind.MultiLineCommentTrivia) {
      return null;
    }
    const commentText = sourceFile.text.substring(pos + 2, end - 2);
    return commentText === IGNORE_FOR_DIAGNOSTICS_MARKER;
  }) === true;
}
function makeRecursiveVisitor(visitor) {
  function recursiveVisitor(node) {
    const res = visitor(node);
    return res !== null ? res : node.forEachChild(recursiveVisitor);
  }
  return recursiveVisitor;
}
function getSpanFromOptions(opts) {
  let withSpan = null;
  if (opts.withSpan !== void 0) {
    if (opts.withSpan instanceof AbsoluteSourceSpan2) {
      withSpan = opts.withSpan;
    } else {
      withSpan = { start: opts.withSpan.start.offset, end: opts.withSpan.end.offset };
    }
  }
  return withSpan;
}
function findFirstMatchingNode(tcb, opts) {
  var _a;
  const withSpan = getSpanFromOptions(opts);
  const withExpressionIdentifier = opts.withExpressionIdentifier;
  const sf = tcb.getSourceFile();
  const visitor = makeRecursiveVisitor((node) => {
    if (!opts.filter(node)) {
      return null;
    }
    if (withSpan !== null) {
      const comment = readSpanComment(node, sf);
      if (comment === null || withSpan.start !== comment.start || withSpan.end !== comment.end) {
        return null;
      }
    }
    if (withExpressionIdentifier !== void 0 && !hasExpressionIdentifier(sf, node, withExpressionIdentifier)) {
      return null;
    }
    return node;
  });
  return (_a = tcb.forEachChild(visitor)) != null ? _a : null;
}
function findAllMatchingNodes(tcb, opts) {
  const withSpan = getSpanFromOptions(opts);
  const withExpressionIdentifier = opts.withExpressionIdentifier;
  const results = [];
  const stack = [tcb];
  const sf = tcb.getSourceFile();
  while (stack.length > 0) {
    const node = stack.pop();
    if (!opts.filter(node)) {
      stack.push(...node.getChildren());
      continue;
    }
    if (withSpan !== null) {
      const comment = readSpanComment(node, sf);
      if (comment === null || withSpan.start !== comment.start || withSpan.end !== comment.end) {
        stack.push(...node.getChildren());
        continue;
      }
    }
    if (withExpressionIdentifier !== void 0 && !hasExpressionIdentifier(sf, node, withExpressionIdentifier)) {
      continue;
    }
    results.push(node);
  }
  return results;
}
function hasExpressionIdentifier(sourceFile, node, identifier) {
  return ts53.forEachTrailingCommentRange(sourceFile.text, node.getEnd(), (pos, end, kind) => {
    if (kind !== ts53.SyntaxKind.MultiLineCommentTrivia) {
      return false;
    }
    const commentText = sourceFile.text.substring(pos + 2, end - 2);
    return commentText === `${CommentTriviaType.EXPRESSION_TYPE_IDENTIFIER}:${identifier}`;
  }) || false;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/completion.mjs
var CompletionEngine = class {
  constructor(tcb, data, shimPath) {
    this.tcb = tcb;
    this.data = data;
    this.shimPath = shimPath;
    this.templateContextCache = new Map();
    this.expressionCompletionCache = new Map();
    const globalRead = findFirstMatchingNode(this.tcb, {
      filter: ts54.isPropertyAccessExpression,
      withExpressionIdentifier: ExpressionIdentifier.COMPONENT_COMPLETION
    });
    if (globalRead !== null) {
      this.componentContext = {
        shimPath: this.shimPath,
        positionInShimFile: globalRead.name.getStart()
      };
    } else {
      this.componentContext = null;
    }
  }
  getGlobalCompletions(context, node) {
    if (this.componentContext === null) {
      return null;
    }
    const templateContext = this.getTemplateContextCompletions(context);
    if (templateContext === null) {
      return null;
    }
    let nodeContext = null;
    if (node instanceof EmptyExpr) {
      const nodeLocation = findFirstMatchingNode(this.tcb, {
        filter: ts54.isIdentifier,
        withSpan: node.sourceSpan
      });
      if (nodeLocation !== null) {
        nodeContext = {
          shimPath: this.shimPath,
          positionInShimFile: nodeLocation.getStart()
        };
      }
    }
    if (node instanceof PropertyRead && node.receiver instanceof ImplicitReceiver2) {
      const nodeLocation = findFirstMatchingNode(this.tcb, {
        filter: ts54.isPropertyAccessExpression,
        withSpan: node.sourceSpan
      });
      if (nodeLocation) {
        nodeContext = {
          shimPath: this.shimPath,
          positionInShimFile: nodeLocation.getStart()
        };
      }
    }
    return {
      componentContext: this.componentContext,
      templateContext,
      nodeContext
    };
  }
  getExpressionCompletionLocation(expr) {
    if (this.expressionCompletionCache.has(expr)) {
      return this.expressionCompletionCache.get(expr);
    }
    let tsExpr = null;
    if (expr instanceof PropertyRead || expr instanceof PropertyWrite) {
      tsExpr = findFirstMatchingNode(this.tcb, {
        filter: ts54.isPropertyAccessExpression,
        withSpan: expr.nameSpan
      });
    } else if (expr instanceof SafePropertyRead) {
      const ternaryExpr = findFirstMatchingNode(this.tcb, {
        filter: ts54.isParenthesizedExpression,
        withSpan: expr.sourceSpan
      });
      if (ternaryExpr === null || !ts54.isConditionalExpression(ternaryExpr.expression)) {
        return null;
      }
      const whenTrue = ternaryExpr.expression.whenTrue;
      if (ts54.isPropertyAccessExpression(whenTrue)) {
        tsExpr = whenTrue;
      } else if (ts54.isCallExpression(whenTrue) && ts54.isPropertyAccessExpression(whenTrue.expression)) {
        tsExpr = whenTrue.expression;
      }
    }
    if (tsExpr === null) {
      return null;
    }
    const res = {
      shimPath: this.shimPath,
      positionInShimFile: tsExpr.name.getEnd()
    };
    this.expressionCompletionCache.set(expr, res);
    return res;
  }
  getLiteralCompletionLocation(expr) {
    if (this.expressionCompletionCache.has(expr)) {
      return this.expressionCompletionCache.get(expr);
    }
    let tsExpr = null;
    if (expr instanceof TmplAstTextAttribute) {
      const strNode = findFirstMatchingNode(this.tcb, {
        filter: ts54.isParenthesizedExpression,
        withSpan: expr.sourceSpan
      });
      if (strNode !== null && ts54.isStringLiteral(strNode.expression)) {
        tsExpr = strNode.expression;
      }
    } else {
      tsExpr = findFirstMatchingNode(this.tcb, {
        filter: (n) => ts54.isStringLiteral(n) || ts54.isNumericLiteral(n),
        withSpan: expr.sourceSpan
      });
    }
    if (tsExpr === null) {
      return null;
    }
    let positionInShimFile = tsExpr.getEnd();
    if (ts54.isStringLiteral(tsExpr)) {
      positionInShimFile -= 1;
    }
    const res = {
      shimPath: this.shimPath,
      positionInShimFile
    };
    this.expressionCompletionCache.set(expr, res);
    return res;
  }
  getTemplateContextCompletions(context) {
    if (this.templateContextCache.has(context)) {
      return this.templateContextCache.get(context);
    }
    const templateContext = new Map();
    for (const node of this.data.boundTarget.getEntitiesInTemplateScope(context)) {
      if (node instanceof TmplAstReference2) {
        templateContext.set(node.name, {
          kind: CompletionKind.Reference,
          node
        });
      } else {
        templateContext.set(node.name, {
          kind: CompletionKind.Variable,
          node
        });
      }
    }
    this.templateContextCache.set(context, templateContext);
    return templateContext;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/context.mjs
import ts68 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/dom.mjs
import { DomElementSchemaRegistry as DomElementSchemaRegistry2 } from "@angular/compiler";
import ts55 from "typescript";
var REGISTRY = new DomElementSchemaRegistry2();
var REMOVE_XHTML_REGEX = /^:xhtml:/;
var RegistryDomSchemaChecker = class {
  constructor(resolver) {
    this.resolver = resolver;
    this._diagnostics = [];
  }
  get diagnostics() {
    return this._diagnostics;
  }
  checkElement(id, element, schemas) {
    const name = element.name.replace(REMOVE_XHTML_REGEX, "");
    if (!REGISTRY.hasElement(name, schemas)) {
      const mapping = this.resolver.getSourceMapping(id);
      let errorMsg = `'${name}' is not a known element:
`;
      errorMsg += `1. If '${name}' is an Angular component, then verify that it is part of this module.
`;
      if (name.indexOf("-") > -1) {
        errorMsg += `2. If '${name}' is a Web Component then add 'CUSTOM_ELEMENTS_SCHEMA' to the '@NgModule.schemas' of this component to suppress this message.`;
      } else {
        errorMsg += `2. To allow any element add 'NO_ERRORS_SCHEMA' to the '@NgModule.schemas' of this component.`;
      }
      const diag = makeTemplateDiagnostic(id, mapping, element.startSourceSpan, ts55.DiagnosticCategory.Error, ngErrorCode(ErrorCode.SCHEMA_INVALID_ELEMENT), errorMsg);
      this._diagnostics.push(diag);
    }
  }
  checkProperty(id, element, name, span, schemas) {
    if (!REGISTRY.hasProperty(element.name, name, schemas)) {
      const mapping = this.resolver.getSourceMapping(id);
      let errorMsg = `Can't bind to '${name}' since it isn't a known property of '${element.name}'.`;
      if (element.name.startsWith("ng-")) {
        errorMsg += `
1. If '${name}' is an Angular directive, then add 'CommonModule' to the '@NgModule.imports' of this component.
2. To allow any property add 'NO_ERRORS_SCHEMA' to the '@NgModule.schemas' of this component.`;
      } else if (element.name.indexOf("-") > -1) {
        errorMsg += `
1. If '${element.name}' is an Angular component and it has '${name}' input, then verify that it is part of this module.
2. If '${element.name}' is a Web Component then add 'CUSTOM_ELEMENTS_SCHEMA' to the '@NgModule.schemas' of this component to suppress this message.
3. To allow any property add 'NO_ERRORS_SCHEMA' to the '@NgModule.schemas' of this component.`;
      }
      const diag = makeTemplateDiagnostic(id, mapping, span, ts55.DiagnosticCategory.Error, ngErrorCode(ErrorCode.SCHEMA_INVALID_ATTRIBUTE), errorMsg);
      this._diagnostics.push(diag);
    }
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/environment.mjs
import { ExpressionType, ExternalExpr as ExternalExpr9 } from "@angular/compiler";
import ts61 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/ts_util.mjs
import ts56 from "typescript";
var SAFE_TO_CAST_WITHOUT_PARENS = new Set([
  ts56.SyntaxKind.ParenthesizedExpression,
  ts56.SyntaxKind.Identifier,
  ts56.SyntaxKind.CallExpression,
  ts56.SyntaxKind.NonNullExpression,
  ts56.SyntaxKind.ElementAccessExpression,
  ts56.SyntaxKind.PropertyAccessExpression,
  ts56.SyntaxKind.ArrayLiteralExpression,
  ts56.SyntaxKind.ObjectLiteralExpression,
  ts56.SyntaxKind.StringLiteral,
  ts56.SyntaxKind.NumericLiteral,
  ts56.SyntaxKind.TrueKeyword,
  ts56.SyntaxKind.FalseKeyword,
  ts56.SyntaxKind.NullKeyword,
  ts56.SyntaxKind.UndefinedKeyword
]);
function tsCastToAny(expr) {
  if (!SAFE_TO_CAST_WITHOUT_PARENS.has(expr.kind)) {
    expr = ts56.createParen(expr);
  }
  return ts56.createParen(ts56.createAsExpression(expr, ts56.createKeywordTypeNode(ts56.SyntaxKind.AnyKeyword)));
}
function tsCreateElement(tagName) {
  const createElement = ts56.createPropertyAccess(ts56.createIdentifier("document"), "createElement");
  return ts56.createCall(createElement, void 0, [ts56.createLiteral(tagName)]);
}
function tsDeclareVariable(id, type) {
  const decl = ts56.createVariableDeclaration(id, type, ts56.createNonNullExpression(ts56.createNull()));
  return ts56.createVariableStatement(void 0, [decl]);
}
function tsCreateTypeQueryForCoercedInput(typeName, coercedInputName) {
  return ts56.createTypeQueryNode(ts56.createQualifiedName(typeName, `ngAcceptInputType_${coercedInputName}`));
}
function tsCreateVariable(id, initializer) {
  const decl = ts56.createVariableDeclaration(id, void 0, initializer);
  return ts56.createVariableStatement(void 0, [decl]);
}
function tsCallMethod(receiver, methodName, args2 = []) {
  const methodAccess = ts56.createPropertyAccess(receiver, methodName);
  return ts56.createCall(methodAccess, void 0, args2);
}
function checkIfClassIsExported(node) {
  if (node.modifiers !== void 0 && node.modifiers.some((mod) => mod.kind === ts56.SyntaxKind.ExportKeyword)) {
    return true;
  } else if (node.parent !== void 0 && ts56.isSourceFile(node.parent) && checkIfFileHasExport(node.parent, node.name.text)) {
    return true;
  }
  return false;
}
function checkIfFileHasExport(sf, name) {
  for (const stmt of sf.statements) {
    if (ts56.isExportDeclaration(stmt) && stmt.exportClause !== void 0 && ts56.isNamedExports(stmt.exportClause)) {
      for (const element of stmt.exportClause.elements) {
        if (element.propertyName === void 0 && element.name.text === name) {
          return true;
        } else if (element.propertyName !== void 0 && element.propertyName.text == name) {
          return true;
        }
      }
    }
  }
  return false;
}
function isAccessExpression(node) {
  return ts56.isPropertyAccessExpression(node) || ts56.isElementAccessExpression(node);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/type_constructor.mjs
import ts60 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/tcb_util.mjs
import ts59 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/type_parameter_emitter.mjs
import ts58 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/type_emitter.mjs
import ts57 from "typescript";
var INELIGIBLE = {};
function canEmitType(type, resolver) {
  return canEmitTypeWorker(type);
  function canEmitTypeWorker(type2) {
    return visitNode(type2) !== INELIGIBLE;
  }
  function visitNode(node) {
    if (ts57.isImportTypeNode(node)) {
      return INELIGIBLE;
    }
    if (ts57.isTypeReferenceNode(node) && !canEmitTypeReference(node)) {
      return INELIGIBLE;
    } else {
      return ts57.forEachChild(node, visitNode);
    }
  }
  function canEmitTypeReference(type2) {
    const reference = resolver(type2);
    if (reference === null) {
      return false;
    }
    if (reference instanceof Reference) {
      return true;
    }
    return type2.typeArguments === void 0 || type2.typeArguments.every(canEmitTypeWorker);
  }
}
var TypeEmitter = class {
  constructor(resolver, emitReference) {
    this.resolver = resolver;
    this.emitReference = emitReference;
  }
  emitType(type) {
    const typeReferenceTransformer = (context) => {
      const visitNode = (node) => {
        if (ts57.isImportTypeNode(node)) {
          throw new Error("Unable to emit import type");
        }
        if (ts57.isTypeReferenceNode(node)) {
          return this.emitTypeReference(node);
        } else if (ts57.isLiteralExpression(node)) {
          const clone = ts57.getMutableClone(node);
          ts57.setTextRange(clone, { pos: -1, end: -1 });
          return clone;
        } else {
          return ts57.visitEachChild(node, visitNode, context);
        }
      };
      return (node) => ts57.visitNode(node, visitNode);
    };
    return ts57.transform(type, [typeReferenceTransformer]).transformed[0];
  }
  emitTypeReference(type) {
    const reference = this.resolver(type);
    if (reference === null) {
      throw new Error("Unable to emit an unresolved reference");
    }
    let typeArguments = void 0;
    if (type.typeArguments !== void 0) {
      typeArguments = ts57.createNodeArray(type.typeArguments.map((typeArg) => this.emitType(typeArg)));
    }
    let typeName = type.typeName;
    if (reference instanceof Reference) {
      const emittedType = this.emitReference(reference);
      if (!ts57.isTypeReferenceNode(emittedType)) {
        throw new Error(`Expected TypeReferenceNode for emitted reference, got ${ts57.SyntaxKind[emittedType.kind]}`);
      }
      typeName = emittedType.typeName;
    }
    return ts57.updateTypeReferenceNode(type, typeName, typeArguments);
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/type_parameter_emitter.mjs
var TypeParameterEmitter = class {
  constructor(typeParameters, reflector) {
    this.typeParameters = typeParameters;
    this.reflector = reflector;
  }
  canEmit() {
    if (this.typeParameters === void 0) {
      return true;
    }
    return this.typeParameters.every((typeParam) => {
      return this.canEmitType(typeParam.constraint) && this.canEmitType(typeParam.default);
    });
  }
  canEmitType(type) {
    if (type === void 0) {
      return true;
    }
    return canEmitType(type, (typeReference) => this.resolveTypeReference(typeReference));
  }
  emit(emitReference) {
    if (this.typeParameters === void 0) {
      return void 0;
    }
    const emitter = new TypeEmitter((type) => this.resolveTypeReference(type), emitReference);
    return this.typeParameters.map((typeParam) => {
      const constraint = typeParam.constraint !== void 0 ? emitter.emitType(typeParam.constraint) : void 0;
      const defaultType = typeParam.default !== void 0 ? emitter.emitType(typeParam.default) : void 0;
      return ts58.updateTypeParameterDeclaration(typeParam, typeParam.name, constraint, defaultType);
    });
  }
  resolveTypeReference(type) {
    const target = ts58.isIdentifier(type.typeName) ? type.typeName : type.typeName.right;
    const declaration = this.reflector.getDeclarationOfIdentifier(target);
    if (declaration === null || declaration.node === null) {
      return null;
    }
    if (this.isLocalTypeParameter(declaration.node)) {
      return type;
    }
    let owningModule2 = null;
    if (declaration.viaModule !== null) {
      owningModule2 = {
        specifier: declaration.viaModule,
        resolutionContext: type.getSourceFile().fileName
      };
    }
    if (!this.isTopLevelExport(declaration.node)) {
      return null;
    }
    return new Reference(declaration.node, owningModule2);
  }
  isTopLevelExport(decl) {
    if (decl.parent === void 0 || !ts58.isSourceFile(decl.parent)) {
      return false;
    }
    return this.reflector.isStaticallyExported(decl);
  }
  isLocalTypeParameter(decl) {
    return this.typeParameters.some((param) => param === decl);
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/tcb_util.mjs
var TcbInliningRequirement;
(function(TcbInliningRequirement2) {
  TcbInliningRequirement2[TcbInliningRequirement2["MustInline"] = 0] = "MustInline";
  TcbInliningRequirement2[TcbInliningRequirement2["ShouldInlineForGenericBounds"] = 1] = "ShouldInlineForGenericBounds";
  TcbInliningRequirement2[TcbInliningRequirement2["None"] = 2] = "None";
})(TcbInliningRequirement || (TcbInliningRequirement = {}));
function requiresInlineTypeCheckBlock(node, usedPipes, reflector) {
  if (!checkIfClassIsExported(node)) {
    return TcbInliningRequirement.MustInline;
  } else if (!checkIfGenericTypeBoundsAreContextFree(node, reflector)) {
    return TcbInliningRequirement.ShouldInlineForGenericBounds;
  } else if (Array.from(usedPipes.values()).some((pipeRef) => !checkIfClassIsExported(pipeRef.node))) {
    return TcbInliningRequirement.MustInline;
  } else {
    return TcbInliningRequirement.None;
  }
}
function getTemplateMapping(shimSf, position, resolver, isDiagnosticRequest) {
  const node = getTokenAtPosition(shimSf, position);
  const sourceLocation = findSourceLocation(node, shimSf, isDiagnosticRequest);
  if (sourceLocation === null) {
    return null;
  }
  const mapping = resolver.getSourceMapping(sourceLocation.id);
  const span = resolver.toParseSourceSpan(sourceLocation.id, sourceLocation.span);
  if (span === null) {
    return null;
  }
  return { sourceLocation, templateSourceMapping: mapping, span };
}
function findTypeCheckBlock(file, id, isDiagnosticRequest) {
  for (const stmt of file.statements) {
    if (ts59.isFunctionDeclaration(stmt) && getTemplateId2(stmt, file, isDiagnosticRequest) === id) {
      return stmt;
    }
  }
  return null;
}
function findSourceLocation(node, sourceFile, isDiagnosticsRequest) {
  while (node !== void 0 && !ts59.isFunctionDeclaration(node)) {
    if (hasIgnoreForDiagnosticsMarker(node, sourceFile) && isDiagnosticsRequest) {
      return null;
    }
    const span = readSpanComment(node, sourceFile);
    if (span !== null) {
      const id = getTemplateId2(node, sourceFile, isDiagnosticsRequest);
      if (id === null) {
        return null;
      }
      return { id, span };
    }
    node = node.parent;
  }
  return null;
}
function getTemplateId2(node, sourceFile, isDiagnosticRequest) {
  while (!ts59.isFunctionDeclaration(node)) {
    if (hasIgnoreForDiagnosticsMarker(node, sourceFile) && isDiagnosticRequest) {
      return null;
    }
    node = node.parent;
    if (node === void 0) {
      return null;
    }
  }
  const start = node.getFullStart();
  return ts59.forEachLeadingCommentRange(sourceFile.text, start, (pos, end, kind) => {
    if (kind !== ts59.SyntaxKind.MultiLineCommentTrivia) {
      return null;
    }
    const commentText = sourceFile.text.substring(pos + 2, end - 2);
    return commentText;
  }) || null;
}
function checkIfGenericTypeBoundsAreContextFree(node, reflector) {
  return new TypeParameterEmitter(node.typeParameters, reflector).canEmit();
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/type_constructor.mjs
function generateTypeCtorDeclarationFn(node, meta, nodeTypeRef, typeParams, reflector) {
  if (requiresInlineTypeCtor(node, reflector)) {
    throw new Error(`${node.name.text} requires an inline type constructor`);
  }
  const rawTypeArgs = typeParams !== void 0 ? generateGenericArgs(typeParams) : void 0;
  const rawType = ts60.createTypeReferenceNode(nodeTypeRef, rawTypeArgs);
  const initParam = constructTypeCtorParameter(node, meta, rawType);
  const typeParameters = typeParametersWithDefaultTypes(typeParams);
  if (meta.body) {
    const fnType = ts60.createFunctionTypeNode(typeParameters, [initParam], rawType);
    const decl = ts60.createVariableDeclaration(meta.fnName, fnType, ts60.createNonNullExpression(ts60.createNull()));
    const declList = ts60.createVariableDeclarationList([decl], ts60.NodeFlags.Const);
    return ts60.createVariableStatement(void 0, declList);
  } else {
    return ts60.createFunctionDeclaration(void 0, [ts60.createModifier(ts60.SyntaxKind.DeclareKeyword)], void 0, meta.fnName, typeParameters, [initParam], rawType, void 0);
  }
}
function generateInlineTypeCtor(node, meta) {
  const rawTypeArgs = node.typeParameters !== void 0 ? generateGenericArgs(node.typeParameters) : void 0;
  const rawType = ts60.createTypeReferenceNode(node.name, rawTypeArgs);
  const initParam = constructTypeCtorParameter(node, meta, rawType);
  let body = void 0;
  if (meta.body) {
    body = ts60.createBlock([
      ts60.createReturn(ts60.createNonNullExpression(ts60.createNull()))
    ]);
  }
  return ts60.createMethod(void 0, [ts60.createModifier(ts60.SyntaxKind.StaticKeyword)], void 0, meta.fnName, void 0, typeParametersWithDefaultTypes(node.typeParameters), [initParam], rawType, body);
}
function constructTypeCtorParameter(node, meta, rawType) {
  let initType = null;
  const keys = meta.fields.inputs;
  const plainKeys = [];
  const coercedKeys = [];
  for (const key of keys) {
    if (!meta.coercedInputFields.has(key)) {
      plainKeys.push(ts60.createLiteralTypeNode(ts60.createStringLiteral(key)));
    } else {
      coercedKeys.push(ts60.createPropertySignature(void 0, key, void 0, tsCreateTypeQueryForCoercedInput(rawType.typeName, key), void 0));
    }
  }
  if (plainKeys.length > 0) {
    const keyTypeUnion = ts60.createUnionTypeNode(plainKeys);
    initType = ts60.createTypeReferenceNode("Pick", [rawType, keyTypeUnion]);
  }
  if (coercedKeys.length > 0) {
    const coercedLiteral = ts60.createTypeLiteralNode(coercedKeys);
    initType = initType !== null ? ts60.createIntersectionTypeNode([initType, coercedLiteral]) : coercedLiteral;
  }
  if (initType === null) {
    initType = ts60.createTypeLiteralNode([]);
  }
  return ts60.createParameter(void 0, void 0, void 0, "init", void 0, initType, void 0);
}
function generateGenericArgs(params) {
  return params.map((param) => ts60.createTypeReferenceNode(param.name, void 0));
}
function requiresInlineTypeCtor(node, host) {
  return !checkIfGenericTypeBoundsAreContextFree(node, host);
}
function typeParametersWithDefaultTypes(params) {
  if (params === void 0) {
    return void 0;
  }
  return params.map((param) => {
    if (param.default === void 0) {
      return ts60.updateTypeParameterDeclaration(param, param.name, param.constraint, ts60.createKeywordTypeNode(ts60.SyntaxKind.AnyKeyword));
    } else {
      return param;
    }
  });
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/environment.mjs
var Environment = class {
  constructor(config, importManager, refEmitter, reflector, contextFile) {
    this.config = config;
    this.importManager = importManager;
    this.refEmitter = refEmitter;
    this.reflector = reflector;
    this.contextFile = contextFile;
    this.nextIds = {
      pipeInst: 1,
      typeCtor: 1
    };
    this.typeCtors = new Map();
    this.typeCtorStatements = [];
    this.pipeInsts = new Map();
    this.pipeInstStatements = [];
  }
  typeCtorFor(dir) {
    const dirRef = dir.ref;
    const node = dirRef.node;
    if (this.typeCtors.has(node)) {
      return this.typeCtors.get(node);
    }
    if (requiresInlineTypeCtor(node, this.reflector)) {
      const ref = this.reference(dirRef);
      const typeCtorExpr = ts61.createPropertyAccess(ref, "ngTypeCtor");
      this.typeCtors.set(node, typeCtorExpr);
      return typeCtorExpr;
    } else {
      const fnName = `_ctor${this.nextIds.typeCtor++}`;
      const nodeTypeRef = this.referenceType(dirRef);
      if (!ts61.isTypeReferenceNode(nodeTypeRef)) {
        throw new Error(`Expected TypeReferenceNode from reference to ${dirRef.debugName}`);
      }
      const meta = {
        fnName,
        body: true,
        fields: {
          inputs: dir.inputs.classPropertyNames,
          outputs: dir.outputs.classPropertyNames,
          queries: dir.queries
        },
        coercedInputFields: dir.coercedInputFields
      };
      const typeParams = this.emitTypeParameters(node);
      const typeCtor = generateTypeCtorDeclarationFn(node, meta, nodeTypeRef.typeName, typeParams, this.reflector);
      this.typeCtorStatements.push(typeCtor);
      const fnId = ts61.createIdentifier(fnName);
      this.typeCtors.set(node, fnId);
      return fnId;
    }
  }
  pipeInst(ref) {
    if (this.pipeInsts.has(ref.node)) {
      return this.pipeInsts.get(ref.node);
    }
    const pipeType = this.referenceType(ref);
    const pipeInstId = ts61.createIdentifier(`_pipe${this.nextIds.pipeInst++}`);
    this.pipeInstStatements.push(tsDeclareVariable(pipeInstId, pipeType));
    this.pipeInsts.set(ref.node, pipeInstId);
    return pipeInstId;
  }
  reference(ref) {
    const ngExpr = this.refEmitter.emit(ref, this.contextFile, ImportFlags.NoAliasing);
    return translateExpression(ngExpr.expression, this.importManager);
  }
  referenceType(ref) {
    const ngExpr = this.refEmitter.emit(ref, this.contextFile, ImportFlags.NoAliasing | ImportFlags.AllowTypeImports);
    return translateType(new ExpressionType(ngExpr.expression), this.importManager);
  }
  emitTypeParameters(declaration) {
    const emitter = new TypeParameterEmitter(declaration.typeParameters, this.reflector);
    return emitter.emit((ref) => this.referenceType(ref));
  }
  referenceExternalType(moduleName, name, typeParams) {
    const external = new ExternalExpr9({ moduleName, name });
    return translateType(new ExpressionType(external, [], typeParams), this.importManager);
  }
  getPreludeStatements() {
    return [
      ...this.pipeInstStatements,
      ...this.typeCtorStatements
    ];
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/oob.mjs
import { TmplAstElement as TmplAstElement2 } from "@angular/compiler";
import ts62 from "typescript";
var OutOfBandDiagnosticRecorderImpl = class {
  constructor(resolver) {
    this.resolver = resolver;
    this._diagnostics = [];
    this.recordedPipes = new Set();
  }
  get diagnostics() {
    return this._diagnostics;
  }
  missingReferenceTarget(templateId, ref) {
    const mapping = this.resolver.getSourceMapping(templateId);
    const value = ref.value.trim();
    const errorMsg = `No directive found with exportAs '${value}'.`;
    this._diagnostics.push(makeTemplateDiagnostic(templateId, mapping, ref.valueSpan || ref.sourceSpan, ts62.DiagnosticCategory.Error, ngErrorCode(ErrorCode.MISSING_REFERENCE_TARGET), errorMsg));
  }
  missingPipe(templateId, ast) {
    if (this.recordedPipes.has(ast)) {
      return;
    }
    const mapping = this.resolver.getSourceMapping(templateId);
    const errorMsg = `No pipe found with name '${ast.name}'.`;
    const sourceSpan = this.resolver.toParseSourceSpan(templateId, ast.nameSpan);
    if (sourceSpan === null) {
      throw new Error(`Assertion failure: no SourceLocation found for usage of pipe '${ast.name}'.`);
    }
    this._diagnostics.push(makeTemplateDiagnostic(templateId, mapping, sourceSpan, ts62.DiagnosticCategory.Error, ngErrorCode(ErrorCode.MISSING_PIPE), errorMsg));
    this.recordedPipes.add(ast);
  }
  illegalAssignmentToTemplateVar(templateId, assignment, target) {
    var _a, _b;
    const mapping = this.resolver.getSourceMapping(templateId);
    const errorMsg = `Cannot use variable '${assignment.name}' as the left-hand side of an assignment expression. Template variables are read-only.`;
    const sourceSpan = this.resolver.toParseSourceSpan(templateId, assignment.sourceSpan);
    if (sourceSpan === null) {
      throw new Error(`Assertion failure: no SourceLocation found for property binding.`);
    }
    this._diagnostics.push(makeTemplateDiagnostic(templateId, mapping, sourceSpan, ts62.DiagnosticCategory.Error, ngErrorCode(ErrorCode.WRITE_TO_READ_ONLY_VARIABLE), errorMsg, [{
      text: `The variable ${assignment.name} is declared here.`,
      start: ((_a = target.valueSpan) == null ? void 0 : _a.start.offset) || target.sourceSpan.start.offset,
      end: ((_b = target.valueSpan) == null ? void 0 : _b.end.offset) || target.sourceSpan.end.offset,
      sourceFile: mapping.node.getSourceFile()
    }]));
  }
  duplicateTemplateVar(templateId, variable, firstDecl) {
    const mapping = this.resolver.getSourceMapping(templateId);
    const errorMsg = `Cannot redeclare variable '${variable.name}' as it was previously declared elsewhere for the same template.`;
    this._diagnostics.push(makeTemplateDiagnostic(templateId, mapping, variable.sourceSpan, ts62.DiagnosticCategory.Error, ngErrorCode(ErrorCode.DUPLICATE_VARIABLE_DECLARATION), errorMsg, [{
      text: `The variable '${firstDecl.name}' was first declared here.`,
      start: firstDecl.sourceSpan.start.offset,
      end: firstDecl.sourceSpan.end.offset,
      sourceFile: mapping.node.getSourceFile()
    }]));
  }
  requiresInlineTcb(templateId, node) {
    this._diagnostics.push(makeInlineDiagnostic(templateId, ErrorCode.INLINE_TCB_REQUIRED, node.name, `This component requires inline template type-checking, which is not supported by the current environment.`));
  }
  requiresInlineTypeConstructors(templateId, node, directives) {
    let message;
    if (directives.length > 1) {
      message = `This component uses directives which require inline type constructors, which are not supported by the current environment.`;
    } else {
      message = `This component uses a directive which requires an inline type constructor, which is not supported by the current environment.`;
    }
    this._diagnostics.push(makeInlineDiagnostic(templateId, ErrorCode.INLINE_TYPE_CTOR_REQUIRED, node.name, message, directives.map((dir) => makeRelatedInformation(dir.name, `Requires an inline type constructor.`))));
  }
  suboptimalTypeInference(templateId, variables) {
    const mapping = this.resolver.getSourceMapping(templateId);
    let diagnosticVar = null;
    for (const variable of variables) {
      if (diagnosticVar === null || (variable.value === "" || variable.value === "$implicit")) {
        diagnosticVar = variable;
      }
    }
    if (diagnosticVar === null) {
      return;
    }
    let varIdentification = `'${diagnosticVar.name}'`;
    if (variables.length === 2) {
      varIdentification += ` (and 1 other)`;
    } else if (variables.length > 2) {
      varIdentification += ` (and ${variables.length - 1} others)`;
    }
    const message = `This structural directive supports advanced type inference, but the current compiler configuration prevents its usage. The variable ${varIdentification} will have type 'any' as a result.

Consider enabling the 'strictTemplates' option in your tsconfig.json for better type inference within this template.`;
    this._diagnostics.push(makeTemplateDiagnostic(templateId, mapping, diagnosticVar.keySpan, ts62.DiagnosticCategory.Suggestion, ngErrorCode(ErrorCode.SUGGEST_SUBOPTIMAL_TYPE_INFERENCE), message));
  }
  splitTwoWayBinding(templateId, input, output, inputConsumer, outputConsumer) {
    const mapping = this.resolver.getSourceMapping(templateId);
    const errorMsg = `The property and event halves of the two-way binding '${input.name}' are not bound to the same target.
            Find more at https://angular.io/guide/two-way-binding#how-two-way-binding-works`;
    const relatedMessages = [];
    relatedMessages.push({
      text: `The property half of the binding is to the '${inputConsumer.name.text}' component.`,
      start: inputConsumer.name.getStart(),
      end: inputConsumer.name.getEnd(),
      sourceFile: inputConsumer.name.getSourceFile()
    });
    if (outputConsumer instanceof TmplAstElement2) {
      let message = `The event half of the binding is to a native event called '${input.name}' on the <${outputConsumer.name}> DOM element.`;
      if (!mapping.node.getSourceFile().isDeclarationFile) {
        message += `
 
 Are you missing an output declaration called '${output.name}'?`;
      }
      relatedMessages.push({
        text: message,
        start: outputConsumer.sourceSpan.start.offset + 1,
        end: outputConsumer.sourceSpan.start.offset + outputConsumer.name.length + 1,
        sourceFile: mapping.node.getSourceFile()
      });
    } else {
      relatedMessages.push({
        text: `The event half of the binding is to the '${outputConsumer.name.text}' component.`,
        start: outputConsumer.name.getStart(),
        end: outputConsumer.name.getEnd(),
        sourceFile: outputConsumer.name.getSourceFile()
      });
    }
    this._diagnostics.push(makeTemplateDiagnostic(templateId, mapping, input.keySpan, ts62.DiagnosticCategory.Error, ngErrorCode(ErrorCode.SPLIT_TWO_WAY_BINDING), errorMsg, relatedMessages));
  }
};
function makeInlineDiagnostic(templateId, code, node, messageText, relatedInformation) {
  return __spreadProps(__spreadValues({}, makeDiagnostic(code, node, messageText, relatedInformation)), {
    componentFile: node.getSourceFile(),
    templateId
  });
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/shim.mjs
import ts63 from "typescript";
var TypeCheckShimGenerator = class {
  constructor() {
    this.extensionPrefix = "ngtypecheck";
    this.shouldEmit = false;
  }
  generateShimForFile(sf, genFilePath, priorShimSf) {
    if (priorShimSf !== null) {
      return priorShimSf;
    }
    return ts63.createSourceFile(genFilePath, "export const USED_FOR_NG_TYPE_CHECKING = true;", ts63.ScriptTarget.Latest, true, ts63.ScriptKind.TS);
  }
  static shimFor(fileName) {
    return absoluteFrom(fileName.replace(/\.tsx?$/, ".ngtypecheck.ts"));
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/type_check_block.mjs
import { BindingPipe, Call as Call2, DYNAMIC_TYPE, ImplicitReceiver as ImplicitReceiver4, PropertyRead as PropertyRead2, PropertyWrite as PropertyWrite2, SafePropertyRead as SafePropertyRead3, ThisReceiver, TmplAstBoundAttribute, TmplAstBoundText, TmplAstElement as TmplAstElement3, TmplAstIcu, TmplAstReference as TmplAstReference3, TmplAstTemplate as TmplAstTemplate2, TmplAstTextAttribute as TmplAstTextAttribute2, TmplAstVariable as TmplAstVariable2 } from "@angular/compiler";
import ts66 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/diagnostics.mjs
import { AbsoluteSourceSpan as AbsoluteSourceSpan3 } from "@angular/compiler";
import ts64 from "typescript";
function wrapForDiagnostics(expr) {
  return ts64.createParen(expr);
}
function wrapForTypeChecker(expr) {
  return ts64.createParen(expr);
}
function addParseSpanInfo(node, span) {
  let commentText;
  if (span instanceof AbsoluteSourceSpan3) {
    commentText = `${span.start},${span.end}`;
  } else {
    commentText = `${span.start.offset},${span.end.offset}`;
  }
  ts64.addSyntheticTrailingComment(node, ts64.SyntaxKind.MultiLineCommentTrivia, commentText, false);
}
function addTemplateId(tcb, id) {
  ts64.addSyntheticLeadingComment(tcb, ts64.SyntaxKind.MultiLineCommentTrivia, id, true);
}
function shouldReportDiagnostic(diagnostic) {
  const { code } = diagnostic;
  if (code === 6133) {
    return false;
  } else if (code === 6199) {
    return false;
  } else if (code === 2695) {
    return false;
  } else if (code === 7006) {
    return false;
  }
  return true;
}
function translateDiagnostic(diagnostic, resolver) {
  if (diagnostic.file === void 0 || diagnostic.start === void 0) {
    return null;
  }
  const fullMapping = getTemplateMapping(diagnostic.file, diagnostic.start, resolver, true);
  if (fullMapping === null) {
    return null;
  }
  const { sourceLocation, templateSourceMapping, span } = fullMapping;
  return makeTemplateDiagnostic(sourceLocation.id, templateSourceMapping, span, diagnostic.category, diagnostic.code, diagnostic.messageText);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/expression.mjs
import { ASTWithSource as ASTWithSource2, Call, EmptyExpr as EmptyExpr2, SafeKeyedRead, SafePropertyRead as SafePropertyRead2 } from "@angular/compiler";
import ts65 from "typescript";
var NULL_AS_ANY = ts65.createAsExpression(ts65.createNull(), ts65.createKeywordTypeNode(ts65.SyntaxKind.AnyKeyword));
var UNDEFINED = ts65.createIdentifier("undefined");
var UNARY_OPS = new Map([
  ["+", ts65.SyntaxKind.PlusToken],
  ["-", ts65.SyntaxKind.MinusToken]
]);
var BINARY_OPS = new Map([
  ["+", ts65.SyntaxKind.PlusToken],
  ["-", ts65.SyntaxKind.MinusToken],
  ["<", ts65.SyntaxKind.LessThanToken],
  [">", ts65.SyntaxKind.GreaterThanToken],
  ["<=", ts65.SyntaxKind.LessThanEqualsToken],
  [">=", ts65.SyntaxKind.GreaterThanEqualsToken],
  ["==", ts65.SyntaxKind.EqualsEqualsToken],
  ["===", ts65.SyntaxKind.EqualsEqualsEqualsToken],
  ["*", ts65.SyntaxKind.AsteriskToken],
  ["/", ts65.SyntaxKind.SlashToken],
  ["%", ts65.SyntaxKind.PercentToken],
  ["!=", ts65.SyntaxKind.ExclamationEqualsToken],
  ["!==", ts65.SyntaxKind.ExclamationEqualsEqualsToken],
  ["||", ts65.SyntaxKind.BarBarToken],
  ["&&", ts65.SyntaxKind.AmpersandAmpersandToken],
  ["&", ts65.SyntaxKind.AmpersandToken],
  ["|", ts65.SyntaxKind.BarToken],
  ["??", ts65.SyntaxKind.QuestionQuestionToken]
]);
function astToTypescript(ast, maybeResolve, config) {
  const translator = new AstTranslator(maybeResolve, config);
  return translator.translate(ast);
}
var AstTranslator = class {
  constructor(maybeResolve, config) {
    this.maybeResolve = maybeResolve;
    this.config = config;
  }
  translate(ast) {
    if (ast instanceof ASTWithSource2) {
      ast = ast.ast;
    }
    if (ast instanceof EmptyExpr2) {
      const res = ts65.factory.createIdentifier("undefined");
      addParseSpanInfo(res, ast.sourceSpan);
      return res;
    }
    const resolved = this.maybeResolve(ast);
    if (resolved !== null) {
      return resolved;
    }
    return ast.visit(this);
  }
  visitUnary(ast) {
    const expr = this.translate(ast.expr);
    const op = UNARY_OPS.get(ast.operator);
    if (op === void 0) {
      throw new Error(`Unsupported Unary.operator: ${ast.operator}`);
    }
    const node = wrapForDiagnostics(ts65.createPrefix(op, expr));
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
  visitBinary(ast) {
    const lhs = wrapForDiagnostics(this.translate(ast.left));
    const rhs = wrapForDiagnostics(this.translate(ast.right));
    const op = BINARY_OPS.get(ast.operation);
    if (op === void 0) {
      throw new Error(`Unsupported Binary.operation: ${ast.operation}`);
    }
    const node = ts65.createBinary(lhs, op, rhs);
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
  visitChain(ast) {
    const elements = ast.expressions.map((expr) => this.translate(expr));
    const node = wrapForDiagnostics(ts65.createCommaList(elements));
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
  visitConditional(ast) {
    const condExpr = this.translate(ast.condition);
    const trueExpr = this.translate(ast.trueExp);
    const falseExpr = wrapForTypeChecker(this.translate(ast.falseExp));
    const node = ts65.createParen(ts65.createConditional(condExpr, trueExpr, falseExpr));
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
  visitImplicitReceiver(ast) {
    throw new Error("Method not implemented.");
  }
  visitThisReceiver(ast) {
    throw new Error("Method not implemented.");
  }
  visitInterpolation(ast) {
    return ast.expressions.reduce((lhs, ast2) => ts65.createBinary(lhs, ts65.SyntaxKind.PlusToken, wrapForTypeChecker(this.translate(ast2))), ts65.createLiteral(""));
  }
  visitKeyedRead(ast) {
    const receiver = wrapForDiagnostics(this.translate(ast.receiver));
    const key = this.translate(ast.key);
    const node = ts65.createElementAccess(receiver, key);
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
  visitKeyedWrite(ast) {
    const receiver = wrapForDiagnostics(this.translate(ast.receiver));
    const left = ts65.createElementAccess(receiver, this.translate(ast.key));
    const right = wrapForTypeChecker(this.translate(ast.value));
    const node = wrapForDiagnostics(ts65.createBinary(left, ts65.SyntaxKind.EqualsToken, right));
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
  visitLiteralArray(ast) {
    const elements = ast.expressions.map((expr) => this.translate(expr));
    const literal2 = ts65.createArrayLiteral(elements);
    const node = this.config.strictLiteralTypes ? literal2 : tsCastToAny(literal2);
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
  visitLiteralMap(ast) {
    const properties = ast.keys.map(({ key }, idx) => {
      const value = this.translate(ast.values[idx]);
      return ts65.createPropertyAssignment(ts65.createStringLiteral(key), value);
    });
    const literal2 = ts65.createObjectLiteral(properties, true);
    const node = this.config.strictLiteralTypes ? literal2 : tsCastToAny(literal2);
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
  visitLiteralPrimitive(ast) {
    let node;
    if (ast.value === void 0) {
      node = ts65.createIdentifier("undefined");
    } else if (ast.value === null) {
      node = ts65.createNull();
    } else {
      node = ts65.createLiteral(ast.value);
    }
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
  visitNonNullAssert(ast) {
    const expr = wrapForDiagnostics(this.translate(ast.expression));
    const node = ts65.createNonNullExpression(expr);
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
  visitPipe(ast) {
    throw new Error("Method not implemented.");
  }
  visitPrefixNot(ast) {
    const expression = wrapForDiagnostics(this.translate(ast.expression));
    const node = ts65.createLogicalNot(expression);
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
  visitPropertyRead(ast) {
    const receiver = wrapForDiagnostics(this.translate(ast.receiver));
    const name = ts65.createPropertyAccess(receiver, ast.name);
    addParseSpanInfo(name, ast.nameSpan);
    const node = wrapForDiagnostics(name);
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
  visitPropertyWrite(ast) {
    const receiver = wrapForDiagnostics(this.translate(ast.receiver));
    const left = ts65.createPropertyAccess(receiver, ast.name);
    addParseSpanInfo(left, ast.nameSpan);
    const leftWithPath = wrapForDiagnostics(left);
    addParseSpanInfo(leftWithPath, ast.sourceSpan);
    const right = wrapForTypeChecker(this.translate(ast.value));
    const node = wrapForDiagnostics(ts65.createBinary(leftWithPath, ts65.SyntaxKind.EqualsToken, right));
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
  visitQuote(ast) {
    return NULL_AS_ANY;
  }
  visitSafePropertyRead(ast) {
    let node;
    const receiver = wrapForDiagnostics(this.translate(ast.receiver));
    if (this.config.strictSafeNavigationTypes) {
      const expr = ts65.createPropertyAccess(ts65.createNonNullExpression(receiver), ast.name);
      addParseSpanInfo(expr, ast.nameSpan);
      node = ts65.createParen(ts65.createConditional(NULL_AS_ANY, expr, UNDEFINED));
    } else if (VeSafeLhsInferenceBugDetector.veWillInferAnyFor(ast)) {
      node = ts65.createPropertyAccess(tsCastToAny(receiver), ast.name);
    } else {
      const expr = ts65.createPropertyAccess(ts65.createNonNullExpression(receiver), ast.name);
      addParseSpanInfo(expr, ast.nameSpan);
      node = tsCastToAny(expr);
    }
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
  visitSafeKeyedRead(ast) {
    const receiver = wrapForDiagnostics(this.translate(ast.receiver));
    const key = this.translate(ast.key);
    let node;
    if (this.config.strictSafeNavigationTypes) {
      const expr = ts65.createElementAccess(ts65.createNonNullExpression(receiver), key);
      addParseSpanInfo(expr, ast.sourceSpan);
      node = ts65.createParen(ts65.createConditional(NULL_AS_ANY, expr, UNDEFINED));
    } else if (VeSafeLhsInferenceBugDetector.veWillInferAnyFor(ast)) {
      node = ts65.createElementAccess(tsCastToAny(receiver), key);
    } else {
      const expr = ts65.createElementAccess(ts65.createNonNullExpression(receiver), key);
      addParseSpanInfo(expr, ast.sourceSpan);
      node = tsCastToAny(expr);
    }
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
  visitCall(ast) {
    const args2 = ast.args.map((expr2) => this.translate(expr2));
    const expr = wrapForDiagnostics(this.translate(ast.receiver));
    let node;
    if (ast.receiver instanceof SafePropertyRead2 || ast.receiver instanceof SafeKeyedRead) {
      if (this.config.strictSafeNavigationTypes) {
        const call = ts65.createCall(ts65.createNonNullExpression(expr), void 0, args2);
        node = ts65.createParen(ts65.createConditional(NULL_AS_ANY, call, UNDEFINED));
      } else if (VeSafeLhsInferenceBugDetector.veWillInferAnyFor(ast)) {
        node = ts65.createCall(tsCastToAny(expr), void 0, args2);
      } else {
        node = tsCastToAny(ts65.createCall(ts65.createNonNullExpression(expr), void 0, args2));
      }
    } else {
      node = ts65.createCall(expr, void 0, args2);
    }
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
};
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
var ExpressionSemanticVisitor = class extends RecursiveAstVisitor2 {
  constructor(templateId, boundTarget, oob) {
    super();
    this.templateId = templateId;
    this.boundTarget = boundTarget;
    this.oob = oob;
  }
  visitPropertyWrite(ast, context) {
    super.visitPropertyWrite(ast, context);
    if (!(ast.receiver instanceof ImplicitReceiver3)) {
      return;
    }
    const target = this.boundTarget.getExpressionTarget(ast);
    if (target instanceof TmplAstVariable) {
      this.oob.illegalAssignmentToTemplateVar(this.templateId, ast, target);
    }
  }
  static visit(ast, id, boundTarget, oob) {
    ast.visit(new ExpressionSemanticVisitor(id, boundTarget, oob));
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/type_check_block.mjs
var TcbGenericContextBehavior;
(function(TcbGenericContextBehavior2) {
  TcbGenericContextBehavior2[TcbGenericContextBehavior2["UseEmitter"] = 0] = "UseEmitter";
  TcbGenericContextBehavior2[TcbGenericContextBehavior2["CopyClassNodes"] = 1] = "CopyClassNodes";
  TcbGenericContextBehavior2[TcbGenericContextBehavior2["FallbackToAny"] = 2] = "FallbackToAny";
})(TcbGenericContextBehavior || (TcbGenericContextBehavior = {}));
function generateTypeCheckBlock(env, ref, name, meta, domSchemaChecker, oobRecorder, genericContextBehavior) {
  const tcb = new Context2(env, domSchemaChecker, oobRecorder, meta.id, meta.boundTarget, meta.pipes, meta.schemas);
  const scope = Scope.forNodes(tcb, null, tcb.boundTarget.target.template, null);
  const ctxRawType = env.referenceType(ref);
  if (!ts66.isTypeReferenceNode(ctxRawType)) {
    throw new Error(`Expected TypeReferenceNode when referencing the ctx param for ${ref.debugName}`);
  }
  let typeParameters = void 0;
  let typeArguments = void 0;
  if (ref.node.typeParameters !== void 0) {
    if (!env.config.useContextGenericType) {
      genericContextBehavior = TcbGenericContextBehavior.FallbackToAny;
    }
    switch (genericContextBehavior) {
      case TcbGenericContextBehavior.UseEmitter:
        typeParameters = new TypeParameterEmitter(ref.node.typeParameters, env.reflector).emit((typeRef) => env.referenceType(typeRef));
        typeArguments = typeParameters.map((param) => ts66.factory.createTypeReferenceNode(param.name));
        break;
      case TcbGenericContextBehavior.CopyClassNodes:
        typeParameters = [...ref.node.typeParameters];
        typeArguments = typeParameters.map((param) => ts66.factory.createTypeReferenceNode(param.name));
        break;
      case TcbGenericContextBehavior.FallbackToAny:
        typeArguments = ref.node.typeParameters.map(() => ts66.factory.createKeywordTypeNode(ts66.SyntaxKind.AnyKeyword));
        break;
    }
  }
  const paramList = [tcbCtxParam(ref.node, ctxRawType.typeName, typeArguments)];
  const scopeStatements = scope.render();
  const innerBody = ts66.createBlock([
    ...env.getPreludeStatements(),
    ...scopeStatements
  ]);
  const body = ts66.createBlock([ts66.createIf(ts66.createTrue(), innerBody, void 0)]);
  const fnDecl = ts66.createFunctionDeclaration(void 0, void 0, void 0, name, env.config.useContextGenericType ? typeParameters : void 0, paramList, void 0, body);
  addTemplateId(fnDecl, meta.id);
  return fnDecl;
}
var TcbOp = class {
  circularFallback() {
    return INFER_TYPE_FOR_CIRCULAR_OP_EXPR;
  }
};
var TcbElementOp = class extends TcbOp {
  constructor(tcb, scope, element) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.element = element;
  }
  get optional() {
    return true;
  }
  execute() {
    const id = this.tcb.allocateId();
    const initializer = tsCreateElement(this.element.name);
    addParseSpanInfo(initializer, this.element.startSourceSpan || this.element.sourceSpan);
    this.scope.addStatement(tsCreateVariable(id, initializer));
    return id;
  }
};
var TcbVariableOp = class extends TcbOp {
  constructor(tcb, scope, template, variable) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.template = template;
    this.variable = variable;
  }
  get optional() {
    return false;
  }
  execute() {
    const ctx = this.scope.resolve(this.template);
    const id = this.tcb.allocateId();
    const initializer = ts66.createPropertyAccess(ctx, this.variable.value || "$implicit");
    addParseSpanInfo(id, this.variable.keySpan);
    let variable;
    if (this.variable.valueSpan !== void 0) {
      addParseSpanInfo(initializer, this.variable.valueSpan);
      variable = tsCreateVariable(id, wrapForTypeChecker(initializer));
    } else {
      variable = tsCreateVariable(id, initializer);
    }
    addParseSpanInfo(variable.declarationList.declarations[0], this.variable.sourceSpan);
    this.scope.addStatement(variable);
    return id;
  }
};
var TcbTemplateContextOp = class extends TcbOp {
  constructor(tcb, scope) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.optional = true;
  }
  execute() {
    const ctx = this.tcb.allocateId();
    const type = ts66.createKeywordTypeNode(ts66.SyntaxKind.AnyKeyword);
    this.scope.addStatement(tsDeclareVariable(ctx, type));
    return ctx;
  }
};
var TcbTemplateBodyOp = class extends TcbOp {
  constructor(tcb, scope, template) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.template = template;
  }
  get optional() {
    return false;
  }
  execute() {
    const directiveGuards = [];
    const directives = this.tcb.boundTarget.getDirectivesOfNode(this.template);
    if (directives !== null) {
      for (const dir of directives) {
        const dirInstId = this.scope.resolve(this.template, dir);
        const dirId = this.tcb.env.reference(dir.ref);
        dir.ngTemplateGuards.forEach((guard2) => {
          const boundInput = this.template.inputs.find((i) => i.name === guard2.inputName) || this.template.templateAttrs.find((i) => i instanceof TmplAstBoundAttribute && i.name === guard2.inputName);
          if (boundInput !== void 0) {
            const expr = tcbExpression(boundInput.value, this.tcb, this.scope);
            markIgnoreDiagnostics(expr);
            if (guard2.type === "binding") {
              directiveGuards.push(expr);
            } else {
              const guardInvoke = tsCallMethod(dirId, `ngTemplateGuard_${guard2.inputName}`, [
                dirInstId,
                expr
              ]);
              addParseSpanInfo(guardInvoke, boundInput.value.sourceSpan);
              directiveGuards.push(guardInvoke);
            }
          }
        });
        if (dir.hasNgTemplateContextGuard) {
          if (this.tcb.env.config.applyTemplateContextGuards) {
            const ctx = this.scope.resolve(this.template);
            const guardInvoke = tsCallMethod(dirId, "ngTemplateContextGuard", [dirInstId, ctx]);
            addParseSpanInfo(guardInvoke, this.template.sourceSpan);
            directiveGuards.push(guardInvoke);
          } else if (this.template.variables.length > 0 && this.tcb.env.config.suggestionsForSuboptimalTypeInference) {
            this.tcb.oobRecorder.suboptimalTypeInference(this.tcb.id, this.template.variables);
          }
        }
      }
    }
    let guard = null;
    if (directiveGuards.length > 0) {
      guard = directiveGuards.reduce((expr, dirGuard) => ts66.createBinary(expr, ts66.SyntaxKind.AmpersandAmpersandToken, dirGuard), directiveGuards.pop());
    }
    const tmplScope = Scope.forNodes(this.tcb, this.scope, this.template, guard);
    const statements = tmplScope.render();
    if (statements.length === 0) {
      return null;
    }
    let tmplBlock = ts66.createBlock(statements);
    if (guard !== null) {
      tmplBlock = ts66.createIf(guard, tmplBlock);
    }
    this.scope.addStatement(tmplBlock);
    return null;
  }
};
var TcbTextInterpolationOp = class extends TcbOp {
  constructor(tcb, scope, binding) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.binding = binding;
  }
  get optional() {
    return false;
  }
  execute() {
    const expr = tcbExpression(this.binding.value, this.tcb, this.scope);
    this.scope.addStatement(ts66.createExpressionStatement(expr));
    return null;
  }
};
var TcbDirectiveTypeOpBase = class extends TcbOp {
  constructor(tcb, scope, node, dir) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.node = node;
    this.dir = dir;
  }
  get optional() {
    return true;
  }
  execute() {
    const dirRef = this.dir.ref;
    const rawType = this.tcb.env.referenceType(this.dir.ref);
    let type;
    if (this.dir.isGeneric === false || dirRef.node.typeParameters === void 0) {
      type = rawType;
    } else {
      if (!ts66.isTypeReferenceNode(rawType)) {
        throw new Error(`Expected TypeReferenceNode when referencing the type for ${this.dir.ref.debugName}`);
      }
      const typeArguments = dirRef.node.typeParameters.map(() => ts66.factory.createKeywordTypeNode(ts66.SyntaxKind.AnyKeyword));
      type = ts66.factory.createTypeReferenceNode(rawType.typeName, typeArguments);
    }
    const id = this.tcb.allocateId();
    addExpressionIdentifier(type, ExpressionIdentifier.DIRECTIVE);
    addParseSpanInfo(type, this.node.startSourceSpan || this.node.sourceSpan);
    this.scope.addStatement(tsDeclareVariable(id, type));
    return id;
  }
};
var TcbNonGenericDirectiveTypeOp = class extends TcbDirectiveTypeOpBase {
  execute() {
    const dirRef = this.dir.ref;
    if (this.dir.isGeneric) {
      throw new Error(`Assertion Error: expected ${dirRef.debugName} not to be generic.`);
    }
    return super.execute();
  }
};
var TcbGenericDirectiveTypeWithAnyParamsOp = class extends TcbDirectiveTypeOpBase {
  execute() {
    const dirRef = this.dir.ref;
    if (dirRef.node.typeParameters === void 0) {
      throw new Error(`Assertion Error: expected typeParameters when creating a declaration for ${dirRef.debugName}`);
    }
    return super.execute();
  }
};
var TcbReferenceOp = class extends TcbOp {
  constructor(tcb, scope, node, host, target) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.node = node;
    this.host = host;
    this.target = target;
    this.optional = true;
  }
  execute() {
    const id = this.tcb.allocateId();
    let initializer = this.target instanceof TmplAstTemplate2 || this.target instanceof TmplAstElement3 ? this.scope.resolve(this.target) : this.scope.resolve(this.host, this.target);
    if (this.target instanceof TmplAstElement3 && !this.tcb.env.config.checkTypeOfDomReferences || !this.tcb.env.config.checkTypeOfNonDomReferences) {
      initializer = ts66.createAsExpression(initializer, ts66.createKeywordTypeNode(ts66.SyntaxKind.AnyKeyword));
    } else if (this.target instanceof TmplAstTemplate2) {
      initializer = ts66.createAsExpression(initializer, ts66.createKeywordTypeNode(ts66.SyntaxKind.AnyKeyword));
      initializer = ts66.createAsExpression(initializer, this.tcb.env.referenceExternalType("@angular/core", "TemplateRef", [DYNAMIC_TYPE]));
      initializer = ts66.createParen(initializer);
    }
    addParseSpanInfo(initializer, this.node.sourceSpan);
    addParseSpanInfo(id, this.node.keySpan);
    this.scope.addStatement(tsCreateVariable(id, initializer));
    return id;
  }
};
var TcbInvalidReferenceOp = class extends TcbOp {
  constructor(tcb, scope) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.optional = true;
  }
  execute() {
    const id = this.tcb.allocateId();
    this.scope.addStatement(tsCreateVariable(id, NULL_AS_ANY));
    return id;
  }
};
var TcbDirectiveCtorOp = class extends TcbOp {
  constructor(tcb, scope, node, dir) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.node = node;
    this.dir = dir;
  }
  get optional() {
    return true;
  }
  execute() {
    const id = this.tcb.allocateId();
    addExpressionIdentifier(id, ExpressionIdentifier.DIRECTIVE);
    addParseSpanInfo(id, this.node.startSourceSpan || this.node.sourceSpan);
    const genericInputs = new Map();
    const inputs = getBoundInputs(this.dir, this.node, this.tcb);
    for (const input of inputs) {
      if (!this.tcb.env.config.checkTypeOfAttributes && input.attribute instanceof TmplAstTextAttribute2) {
        continue;
      }
      for (const fieldName of input.fieldNames) {
        if (genericInputs.has(fieldName)) {
          continue;
        }
        const expression = translateInput(input.attribute, this.tcb, this.scope);
        genericInputs.set(fieldName, {
          type: "binding",
          field: fieldName,
          expression,
          sourceSpan: input.attribute.sourceSpan
        });
      }
    }
    for (const [fieldName] of this.dir.inputs) {
      if (!genericInputs.has(fieldName)) {
        genericInputs.set(fieldName, { type: "unset", field: fieldName });
      }
    }
    const typeCtor = tcbCallTypeCtor(this.dir, this.tcb, Array.from(genericInputs.values()));
    markIgnoreDiagnostics(typeCtor);
    this.scope.addStatement(tsCreateVariable(id, typeCtor));
    return id;
  }
  circularFallback() {
    return new TcbDirectiveCtorCircularFallbackOp(this.tcb, this.scope, this.node, this.dir);
  }
};
var TcbDirectiveInputsOp = class extends TcbOp {
  constructor(tcb, scope, node, dir) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.node = node;
    this.dir = dir;
  }
  get optional() {
    return false;
  }
  execute() {
    let dirId = null;
    const inputs = getBoundInputs(this.dir, this.node, this.tcb);
    for (const input of inputs) {
      const expr = widenBinding(translateInput(input.attribute, this.tcb, this.scope), this.tcb);
      let assignment = wrapForDiagnostics(expr);
      for (const fieldName of input.fieldNames) {
        let target;
        if (this.dir.coercedInputFields.has(fieldName)) {
          const dirTypeRef = this.tcb.env.referenceType(this.dir.ref);
          if (!ts66.isTypeReferenceNode(dirTypeRef)) {
            throw new Error(`Expected TypeReferenceNode from reference to ${this.dir.ref.debugName}`);
          }
          const id = this.tcb.allocateId();
          const type = tsCreateTypeQueryForCoercedInput(dirTypeRef.typeName, fieldName);
          this.scope.addStatement(tsDeclareVariable(id, type));
          target = id;
        } else if (this.dir.undeclaredInputFields.has(fieldName)) {
          continue;
        } else if (!this.tcb.env.config.honorAccessModifiersForInputBindings && this.dir.restrictedInputFields.has(fieldName)) {
          if (dirId === null) {
            dirId = this.scope.resolve(this.node, this.dir);
          }
          const id = this.tcb.allocateId();
          const dirTypeRef = this.tcb.env.referenceType(this.dir.ref);
          if (!ts66.isTypeReferenceNode(dirTypeRef)) {
            throw new Error(`Expected TypeReferenceNode from reference to ${this.dir.ref.debugName}`);
          }
          const type = ts66.createIndexedAccessTypeNode(ts66.createTypeQueryNode(dirId), ts66.createLiteralTypeNode(ts66.createStringLiteral(fieldName)));
          const temp = tsDeclareVariable(id, type);
          this.scope.addStatement(temp);
          target = id;
        } else {
          if (dirId === null) {
            dirId = this.scope.resolve(this.node, this.dir);
          }
          target = this.dir.stringLiteralInputFields.has(fieldName) ? ts66.createElementAccess(dirId, ts66.createStringLiteral(fieldName)) : ts66.createPropertyAccess(dirId, ts66.createIdentifier(fieldName));
        }
        if (input.attribute.keySpan !== void 0) {
          addParseSpanInfo(target, input.attribute.keySpan);
        }
        assignment = ts66.createBinary(target, ts66.SyntaxKind.EqualsToken, assignment);
      }
      addParseSpanInfo(assignment, input.attribute.sourceSpan);
      if (!this.tcb.env.config.checkTypeOfAttributes && input.attribute instanceof TmplAstTextAttribute2) {
        markIgnoreDiagnostics(assignment);
      }
      this.scope.addStatement(ts66.createExpressionStatement(assignment));
    }
    return null;
  }
};
var TcbDirectiveCtorCircularFallbackOp = class extends TcbOp {
  constructor(tcb, scope, node, dir) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.node = node;
    this.dir = dir;
  }
  get optional() {
    return false;
  }
  execute() {
    const id = this.tcb.allocateId();
    const typeCtor = this.tcb.env.typeCtorFor(this.dir);
    const circularPlaceholder = ts66.createCall(typeCtor, void 0, [ts66.createNonNullExpression(ts66.createNull())]);
    this.scope.addStatement(tsCreateVariable(id, circularPlaceholder));
    return id;
  }
};
var TcbDomSchemaCheckerOp = class extends TcbOp {
  constructor(tcb, element, checkElement, claimedInputs) {
    super();
    this.tcb = tcb;
    this.element = element;
    this.checkElement = checkElement;
    this.claimedInputs = claimedInputs;
  }
  get optional() {
    return false;
  }
  execute() {
    if (this.checkElement) {
      this.tcb.domSchemaChecker.checkElement(this.tcb.id, this.element, this.tcb.schemas);
    }
    for (const binding of this.element.inputs) {
      if (binding.type === 0 && this.claimedInputs.has(binding.name)) {
        continue;
      }
      if (binding.type === 0) {
        if (binding.name !== "style" && binding.name !== "class") {
          const propertyName = ATTR_TO_PROP[binding.name] || binding.name;
          this.tcb.domSchemaChecker.checkProperty(this.tcb.id, this.element, propertyName, binding.sourceSpan, this.tcb.schemas);
        }
      }
    }
    return null;
  }
};
var ATTR_TO_PROP = {
  "class": "className",
  "for": "htmlFor",
  "formaction": "formAction",
  "innerHtml": "innerHTML",
  "readonly": "readOnly",
  "tabindex": "tabIndex"
};
var TcbUnclaimedInputsOp = class extends TcbOp {
  constructor(tcb, scope, element, claimedInputs) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.element = element;
    this.claimedInputs = claimedInputs;
  }
  get optional() {
    return false;
  }
  execute() {
    let elId = null;
    for (const binding of this.element.inputs) {
      if (binding.type === 0 && this.claimedInputs.has(binding.name)) {
        continue;
      }
      const expr = widenBinding(tcbExpression(binding.value, this.tcb, this.scope), this.tcb);
      if (this.tcb.env.config.checkTypeOfDomBindings && binding.type === 0) {
        if (binding.name !== "style" && binding.name !== "class") {
          if (elId === null) {
            elId = this.scope.resolve(this.element);
          }
          const propertyName = ATTR_TO_PROP[binding.name] || binding.name;
          const prop = ts66.createElementAccess(elId, ts66.createStringLiteral(propertyName));
          const stmt = ts66.createBinary(prop, ts66.SyntaxKind.EqualsToken, wrapForDiagnostics(expr));
          addParseSpanInfo(stmt, binding.sourceSpan);
          this.scope.addStatement(ts66.createExpressionStatement(stmt));
        } else {
          this.scope.addStatement(ts66.createExpressionStatement(expr));
        }
      } else {
        this.scope.addStatement(ts66.createExpressionStatement(expr));
      }
    }
    return null;
  }
};
var TcbDirectiveOutputsOp = class extends TcbOp {
  constructor(tcb, scope, node, dir) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.node = node;
    this.dir = dir;
  }
  get optional() {
    return false;
  }
  execute() {
    let dirId = null;
    const outputs = this.dir.outputs;
    for (const output of this.node.outputs) {
      if (output.type !== 0 || !outputs.hasBindingPropertyName(output.name)) {
        continue;
      }
      if (this.tcb.env.config.checkTypeOfOutputEvents && output.name.endsWith("Change")) {
        const inputName = output.name.slice(0, -6);
        isSplitTwoWayBinding(inputName, output, this.node.inputs, this.tcb);
      }
      const field = outputs.getByBindingPropertyName(output.name)[0].classPropertyName;
      if (dirId === null) {
        dirId = this.scope.resolve(this.node, this.dir);
      }
      const outputField = ts66.createElementAccess(dirId, ts66.createStringLiteral(field));
      addParseSpanInfo(outputField, output.keySpan);
      if (this.tcb.env.config.checkTypeOfOutputEvents) {
        const handler = tcbCreateEventHandler(output, this.tcb, this.scope, 0);
        const subscribeFn = ts66.createPropertyAccess(outputField, "subscribe");
        const call = ts66.createCall(subscribeFn, void 0, [handler]);
        addParseSpanInfo(call, output.sourceSpan);
        this.scope.addStatement(ts66.createExpressionStatement(call));
      } else {
        this.scope.addStatement(ts66.createExpressionStatement(outputField));
        const handler = tcbCreateEventHandler(output, this.tcb, this.scope, 1);
        this.scope.addStatement(ts66.createExpressionStatement(handler));
      }
      ExpressionSemanticVisitor.visit(output.handler, this.tcb.id, this.tcb.boundTarget, this.tcb.oobRecorder);
    }
    return null;
  }
};
var TcbUnclaimedOutputsOp = class extends TcbOp {
  constructor(tcb, scope, element, claimedOutputs) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.element = element;
    this.claimedOutputs = claimedOutputs;
  }
  get optional() {
    return false;
  }
  execute() {
    let elId = null;
    for (const output of this.element.outputs) {
      if (this.claimedOutputs.has(output.name)) {
        continue;
      }
      if (this.tcb.env.config.checkTypeOfOutputEvents && output.name.endsWith("Change")) {
        const inputName = output.name.slice(0, -6);
        if (isSplitTwoWayBinding(inputName, output, this.element.inputs, this.tcb)) {
          continue;
        }
      }
      if (output.type === 1) {
        const eventType = this.tcb.env.config.checkTypeOfAnimationEvents ? this.tcb.env.referenceExternalType("@angular/animations", "AnimationEvent") : 1;
        const handler = tcbCreateEventHandler(output, this.tcb, this.scope, eventType);
        this.scope.addStatement(ts66.createExpressionStatement(handler));
      } else if (this.tcb.env.config.checkTypeOfDomEvents) {
        const handler = tcbCreateEventHandler(output, this.tcb, this.scope, 0);
        if (elId === null) {
          elId = this.scope.resolve(this.element);
        }
        const propertyAccess = ts66.createPropertyAccess(elId, "addEventListener");
        addParseSpanInfo(propertyAccess, output.keySpan);
        const call = ts66.createCall(propertyAccess, void 0, [ts66.createStringLiteral(output.name), handler]);
        addParseSpanInfo(call, output.sourceSpan);
        this.scope.addStatement(ts66.createExpressionStatement(call));
      } else {
        const handler = tcbCreateEventHandler(output, this.tcb, this.scope, 1);
        this.scope.addStatement(ts66.createExpressionStatement(handler));
      }
      ExpressionSemanticVisitor.visit(output.handler, this.tcb.id, this.tcb.boundTarget, this.tcb.oobRecorder);
    }
    return null;
  }
};
var TcbComponentContextCompletionOp = class extends TcbOp {
  constructor(scope) {
    super();
    this.scope = scope;
    this.optional = false;
  }
  execute() {
    const ctx = ts66.createIdentifier("ctx");
    const ctxDot = ts66.createPropertyAccess(ctx, "");
    markIgnoreDiagnostics(ctxDot);
    addExpressionIdentifier(ctxDot, ExpressionIdentifier.COMPONENT_COMPLETION);
    this.scope.addStatement(ts66.createExpressionStatement(ctxDot));
    return null;
  }
};
var INFER_TYPE_FOR_CIRCULAR_OP_EXPR = ts66.createNonNullExpression(ts66.createNull());
var Context2 = class {
  constructor(env, domSchemaChecker, oobRecorder, id, boundTarget, pipes, schemas) {
    this.env = env;
    this.domSchemaChecker = domSchemaChecker;
    this.oobRecorder = oobRecorder;
    this.id = id;
    this.boundTarget = boundTarget;
    this.pipes = pipes;
    this.schemas = schemas;
    this.nextId = 1;
  }
  allocateId() {
    return ts66.createIdentifier(`_t${this.nextId++}`);
  }
  getPipeByName(name) {
    if (!this.pipes.has(name)) {
      return null;
    }
    return this.pipes.get(name);
  }
};
var Scope = class {
  constructor(tcb, parent = null, guard = null) {
    this.tcb = tcb;
    this.parent = parent;
    this.guard = guard;
    this.opQueue = [];
    this.elementOpMap = new Map();
    this.directiveOpMap = new Map();
    this.referenceOpMap = new Map();
    this.templateCtxOpMap = new Map();
    this.varMap = new Map();
    this.statements = [];
  }
  static forNodes(tcb, parent, templateOrNodes, guard) {
    const scope = new Scope(tcb, parent, guard);
    if (parent === null && tcb.env.config.enableTemplateTypeChecker) {
      scope.opQueue.push(new TcbComponentContextCompletionOp(scope));
    }
    let children;
    if (templateOrNodes instanceof TmplAstTemplate2) {
      const varMap = new Map();
      for (const v of templateOrNodes.variables) {
        if (!varMap.has(v.name)) {
          varMap.set(v.name, v);
        } else {
          const firstDecl = varMap.get(v.name);
          tcb.oobRecorder.duplicateTemplateVar(tcb.id, v, firstDecl);
        }
        const opIndex = scope.opQueue.push(new TcbVariableOp(tcb, scope, templateOrNodes, v)) - 1;
        scope.varMap.set(v, opIndex);
      }
      children = templateOrNodes.children;
    } else {
      children = templateOrNodes;
    }
    for (const node of children) {
      scope.appendNode(node);
    }
    return scope;
  }
  resolve(node, directive) {
    const res = this.resolveLocal(node, directive);
    if (res !== null) {
      const clone = ts66.getMutableClone(res);
      ts66.setSyntheticTrailingComments(clone, []);
      return clone;
    } else if (this.parent !== null) {
      return this.parent.resolve(node, directive);
    } else {
      throw new Error(`Could not resolve ${node} / ${directive}`);
    }
  }
  addStatement(stmt) {
    this.statements.push(stmt);
  }
  render() {
    for (let i = 0; i < this.opQueue.length; i++) {
      const skipOptional = !this.tcb.env.config.enableTemplateTypeChecker;
      this.executeOp(i, skipOptional);
    }
    return this.statements;
  }
  guards() {
    let parentGuards = null;
    if (this.parent !== null) {
      parentGuards = this.parent.guards();
    }
    if (this.guard === null) {
      return parentGuards;
    } else if (parentGuards === null) {
      return this.guard;
    } else {
      return ts66.createBinary(parentGuards, ts66.SyntaxKind.AmpersandAmpersandToken, this.guard);
    }
  }
  resolveLocal(ref, directive) {
    if (ref instanceof TmplAstReference3 && this.referenceOpMap.has(ref)) {
      return this.resolveOp(this.referenceOpMap.get(ref));
    } else if (ref instanceof TmplAstVariable2 && this.varMap.has(ref)) {
      return this.resolveOp(this.varMap.get(ref));
    } else if (ref instanceof TmplAstTemplate2 && directive === void 0 && this.templateCtxOpMap.has(ref)) {
      return this.resolveOp(this.templateCtxOpMap.get(ref));
    } else if ((ref instanceof TmplAstElement3 || ref instanceof TmplAstTemplate2) && directive !== void 0 && this.directiveOpMap.has(ref)) {
      const dirMap = this.directiveOpMap.get(ref);
      if (dirMap.has(directive)) {
        return this.resolveOp(dirMap.get(directive));
      } else {
        return null;
      }
    } else if (ref instanceof TmplAstElement3 && this.elementOpMap.has(ref)) {
      return this.resolveOp(this.elementOpMap.get(ref));
    } else {
      return null;
    }
  }
  resolveOp(opIndex) {
    const res = this.executeOp(opIndex, false);
    if (res === null) {
      throw new Error(`Error resolving operation, got null`);
    }
    return res;
  }
  executeOp(opIndex, skipOptional) {
    const op = this.opQueue[opIndex];
    if (!(op instanceof TcbOp)) {
      return op;
    }
    if (skipOptional && op.optional) {
      return null;
    }
    this.opQueue[opIndex] = op.circularFallback();
    const res = op.execute();
    this.opQueue[opIndex] = res;
    return res;
  }
  appendNode(node) {
    if (node instanceof TmplAstElement3) {
      const opIndex = this.opQueue.push(new TcbElementOp(this.tcb, this, node)) - 1;
      this.elementOpMap.set(node, opIndex);
      this.appendDirectivesAndInputsOfNode(node);
      this.appendOutputsOfNode(node);
      for (const child of node.children) {
        this.appendNode(child);
      }
      this.checkAndAppendReferencesOfNode(node);
    } else if (node instanceof TmplAstTemplate2) {
      this.appendDirectivesAndInputsOfNode(node);
      this.appendOutputsOfNode(node);
      const ctxIndex = this.opQueue.push(new TcbTemplateContextOp(this.tcb, this)) - 1;
      this.templateCtxOpMap.set(node, ctxIndex);
      if (this.tcb.env.config.checkTemplateBodies) {
        this.opQueue.push(new TcbTemplateBodyOp(this.tcb, this, node));
      } else if (this.tcb.env.config.alwaysCheckSchemaInTemplateBodies) {
        this.appendDeepSchemaChecks(node.children);
      }
      this.checkAndAppendReferencesOfNode(node);
    } else if (node instanceof TmplAstBoundText) {
      this.opQueue.push(new TcbTextInterpolationOp(this.tcb, this, node));
    } else if (node instanceof TmplAstIcu) {
      this.appendIcuExpressions(node);
    }
  }
  checkAndAppendReferencesOfNode(node) {
    for (const ref of node.references) {
      const target = this.tcb.boundTarget.getReferenceTarget(ref);
      let ctxIndex;
      if (target === null) {
        this.tcb.oobRecorder.missingReferenceTarget(this.tcb.id, ref);
        ctxIndex = this.opQueue.push(new TcbInvalidReferenceOp(this.tcb, this)) - 1;
      } else if (target instanceof TmplAstTemplate2 || target instanceof TmplAstElement3) {
        ctxIndex = this.opQueue.push(new TcbReferenceOp(this.tcb, this, ref, node, target)) - 1;
      } else {
        ctxIndex = this.opQueue.push(new TcbReferenceOp(this.tcb, this, ref, node, target.directive)) - 1;
      }
      this.referenceOpMap.set(ref, ctxIndex);
    }
  }
  appendDirectivesAndInputsOfNode(node) {
    const claimedInputs = new Set();
    const directives = this.tcb.boundTarget.getDirectivesOfNode(node);
    if (directives === null || directives.length === 0) {
      if (node instanceof TmplAstElement3) {
        this.opQueue.push(new TcbUnclaimedInputsOp(this.tcb, this, node, claimedInputs));
        this.opQueue.push(new TcbDomSchemaCheckerOp(this.tcb, node, true, claimedInputs));
      }
      return;
    }
    const dirMap = new Map();
    for (const dir of directives) {
      let directiveOp;
      const host = this.tcb.env.reflector;
      const dirRef = dir.ref;
      if (!dir.isGeneric) {
        directiveOp = new TcbNonGenericDirectiveTypeOp(this.tcb, this, node, dir);
      } else if (!requiresInlineTypeCtor(dirRef.node, host) || this.tcb.env.config.useInlineTypeConstructors) {
        directiveOp = new TcbDirectiveCtorOp(this.tcb, this, node, dir);
      } else {
        directiveOp = new TcbGenericDirectiveTypeWithAnyParamsOp(this.tcb, this, node, dir);
      }
      const dirIndex = this.opQueue.push(directiveOp) - 1;
      dirMap.set(dir, dirIndex);
      this.opQueue.push(new TcbDirectiveInputsOp(this.tcb, this, node, dir));
    }
    this.directiveOpMap.set(node, dirMap);
    if (node instanceof TmplAstElement3) {
      for (const dir of directives) {
        for (const propertyName of dir.inputs.propertyNames) {
          claimedInputs.add(propertyName);
        }
      }
      this.opQueue.push(new TcbUnclaimedInputsOp(this.tcb, this, node, claimedInputs));
      const checkElement = directives.length === 0;
      this.opQueue.push(new TcbDomSchemaCheckerOp(this.tcb, node, checkElement, claimedInputs));
    }
  }
  appendOutputsOfNode(node) {
    const claimedOutputs = new Set();
    const directives = this.tcb.boundTarget.getDirectivesOfNode(node);
    if (directives === null || directives.length === 0) {
      if (node instanceof TmplAstElement3) {
        this.opQueue.push(new TcbUnclaimedOutputsOp(this.tcb, this, node, claimedOutputs));
      }
      return;
    }
    for (const dir of directives) {
      this.opQueue.push(new TcbDirectiveOutputsOp(this.tcb, this, node, dir));
    }
    if (node instanceof TmplAstElement3) {
      for (const dir of directives) {
        for (const outputProperty of dir.outputs.propertyNames) {
          claimedOutputs.add(outputProperty);
        }
      }
      this.opQueue.push(new TcbUnclaimedOutputsOp(this.tcb, this, node, claimedOutputs));
    }
  }
  appendDeepSchemaChecks(nodes) {
    for (const node of nodes) {
      if (!(node instanceof TmplAstElement3 || node instanceof TmplAstTemplate2)) {
        continue;
      }
      if (node instanceof TmplAstElement3) {
        const claimedInputs = new Set();
        const directives = this.tcb.boundTarget.getDirectivesOfNode(node);
        let hasDirectives;
        if (directives === null || directives.length === 0) {
          hasDirectives = false;
        } else {
          hasDirectives = true;
          for (const dir of directives) {
            for (const propertyName of dir.inputs.propertyNames) {
              claimedInputs.add(propertyName);
            }
          }
        }
        this.opQueue.push(new TcbDomSchemaCheckerOp(this.tcb, node, !hasDirectives, claimedInputs));
      }
      this.appendDeepSchemaChecks(node.children);
    }
  }
  appendIcuExpressions(node) {
    for (const variable of Object.values(node.vars)) {
      this.opQueue.push(new TcbTextInterpolationOp(this.tcb, this, variable));
    }
    for (const placeholder of Object.values(node.placeholders)) {
      if (placeholder instanceof TmplAstBoundText) {
        this.opQueue.push(new TcbTextInterpolationOp(this.tcb, this, placeholder));
      }
    }
  }
};
function tcbCtxParam(node, name, typeArguments) {
  const type = ts66.factory.createTypeReferenceNode(name, typeArguments);
  return ts66.factory.createParameterDeclaration(void 0, void 0, void 0, "ctx", void 0, type, void 0);
}
function tcbExpression(ast, tcb, scope) {
  const translator = new TcbExpressionTranslator(tcb, scope);
  return translator.translate(ast);
}
var TcbExpressionTranslator = class {
  constructor(tcb, scope) {
    this.tcb = tcb;
    this.scope = scope;
  }
  translate(ast) {
    return astToTypescript(ast, (ast2) => this.resolve(ast2), this.tcb.env.config);
  }
  resolve(ast) {
    if (ast instanceof PropertyRead2 && ast.receiver instanceof ImplicitReceiver4) {
      return this.resolveTarget(ast);
    } else if (ast instanceof PropertyWrite2 && ast.receiver instanceof ImplicitReceiver4) {
      const target = this.resolveTarget(ast);
      if (target === null) {
        return null;
      }
      const expr = this.translate(ast.value);
      const result = ts66.createParen(ts66.createBinary(target, ts66.SyntaxKind.EqualsToken, expr));
      addParseSpanInfo(result, ast.sourceSpan);
      return result;
    } else if (ast instanceof ImplicitReceiver4) {
      return ts66.createIdentifier("ctx");
    } else if (ast instanceof BindingPipe) {
      const expr = this.translate(ast.exp);
      const pipeRef = this.tcb.getPipeByName(ast.name);
      let pipe;
      if (pipeRef === null) {
        this.tcb.oobRecorder.missingPipe(this.tcb.id, ast);
        pipe = NULL_AS_ANY;
      } else {
        pipe = this.tcb.env.pipeInst(pipeRef);
      }
      const args2 = ast.args.map((arg) => this.translate(arg));
      let methodAccess = ts66.factory.createPropertyAccessExpression(pipe, "transform");
      addParseSpanInfo(methodAccess, ast.nameSpan);
      if (!this.tcb.env.config.checkTypeOfPipes) {
        methodAccess = ts66.factory.createAsExpression(methodAccess, ts66.factory.createKeywordTypeNode(ts66.SyntaxKind.AnyKeyword));
      }
      const result = ts66.createCall(methodAccess, void 0, [expr, ...args2]);
      addParseSpanInfo(result, ast.sourceSpan);
      return result;
    } else if (ast instanceof Call2 && (ast.receiver instanceof PropertyRead2 || ast.receiver instanceof SafePropertyRead3) && !(ast.receiver.receiver instanceof ThisReceiver)) {
      if (ast.receiver.name === "$any" && ast.args.length === 1) {
        const expr = this.translate(ast.args[0]);
        const exprAsAny = ts66.createAsExpression(expr, ts66.createKeywordTypeNode(ts66.SyntaxKind.AnyKeyword));
        const result = ts66.createParen(exprAsAny);
        addParseSpanInfo(result, ast.sourceSpan);
        return result;
      }
      const receiver = this.resolveTarget(ast);
      if (receiver === null) {
        return null;
      }
      const method = wrapForDiagnostics(receiver);
      addParseSpanInfo(method, ast.receiver.nameSpan);
      const args2 = ast.args.map((arg) => this.translate(arg));
      const node = ts66.createCall(method, void 0, args2);
      addParseSpanInfo(node, ast.sourceSpan);
      return node;
    } else {
      return null;
    }
  }
  resolveTarget(ast) {
    const binding = this.tcb.boundTarget.getExpressionTarget(ast);
    if (binding === null) {
      return null;
    }
    const expr = this.scope.resolve(binding);
    addParseSpanInfo(expr, ast.sourceSpan);
    return expr;
  }
};
function tcbCallTypeCtor(dir, tcb, inputs) {
  const typeCtor = tcb.env.typeCtorFor(dir);
  const members = inputs.map((input) => {
    const propertyName = ts66.createStringLiteral(input.field);
    if (input.type === "binding") {
      const expr = widenBinding(input.expression, tcb);
      const assignment = ts66.createPropertyAssignment(propertyName, wrapForDiagnostics(expr));
      addParseSpanInfo(assignment, input.sourceSpan);
      return assignment;
    } else {
      return ts66.createPropertyAssignment(propertyName, NULL_AS_ANY);
    }
  });
  return ts66.createCall(typeCtor, void 0, [ts66.createObjectLiteral(members)]);
}
function getBoundInputs(directive, node, tcb) {
  const boundInputs = [];
  const processAttribute = (attr) => {
    if (attr instanceof TmplAstBoundAttribute && attr.type !== 0) {
      return;
    }
    const inputs = directive.inputs.getByBindingPropertyName(attr.name);
    if (inputs === null) {
      return;
    }
    const fieldNames = inputs.map((input) => input.classPropertyName);
    boundInputs.push({ attribute: attr, fieldNames });
  };
  node.inputs.forEach(processAttribute);
  node.attributes.forEach(processAttribute);
  if (node instanceof TmplAstTemplate2) {
    node.templateAttrs.forEach(processAttribute);
  }
  return boundInputs;
}
function translateInput(attr, tcb, scope) {
  if (attr instanceof TmplAstBoundAttribute) {
    return tcbExpression(attr.value, tcb, scope);
  } else {
    return ts66.createStringLiteral(attr.value);
  }
}
function widenBinding(expr, tcb) {
  if (!tcb.env.config.checkTypeOfInputBindings) {
    return tsCastToAny(expr);
  } else if (!tcb.env.config.strictNullInputBindings) {
    if (ts66.isObjectLiteralExpression(expr) || ts66.isArrayLiteralExpression(expr)) {
      return expr;
    } else {
      return ts66.createNonNullExpression(expr);
    }
  } else {
    return expr;
  }
}
var EVENT_PARAMETER = "$event";
function tcbCreateEventHandler(event, tcb, scope, eventType) {
  const handler = tcbEventHandlerExpression(event.handler, tcb, scope);
  let eventParamType;
  if (eventType === 0) {
    eventParamType = void 0;
  } else if (eventType === 1) {
    eventParamType = ts66.createKeywordTypeNode(ts66.SyntaxKind.AnyKeyword);
  } else {
    eventParamType = eventType;
  }
  const guards = scope.guards();
  let body = ts66.createExpressionStatement(handler);
  if (guards !== null) {
    body = ts66.createIf(guards, body);
  }
  const eventParam = ts66.createParameter(void 0, void 0, void 0, EVENT_PARAMETER, void 0, eventParamType);
  addExpressionIdentifier(eventParam, ExpressionIdentifier.EVENT_PARAMETER);
  return ts66.createFunctionExpression(void 0, void 0, void 0, void 0, [eventParam], ts66.createKeywordTypeNode(ts66.SyntaxKind.AnyKeyword), ts66.createBlock([body]));
}
function tcbEventHandlerExpression(ast, tcb, scope) {
  const translator = new TcbEventHandlerTranslator(tcb, scope);
  return translator.translate(ast);
}
function isSplitTwoWayBinding(inputName, output, inputs, tcb) {
  const input = inputs.find((input2) => input2.name === inputName);
  if (input === void 0 || input.sourceSpan !== output.sourceSpan) {
    return false;
  }
  const inputConsumer = tcb.boundTarget.getConsumerOfBinding(input);
  const outputConsumer = tcb.boundTarget.getConsumerOfBinding(output);
  if (outputConsumer === null || inputConsumer.ref === void 0 || outputConsumer instanceof TmplAstTemplate2) {
    return false;
  }
  if (outputConsumer instanceof TmplAstElement3) {
    tcb.oobRecorder.splitTwoWayBinding(tcb.id, input, output, inputConsumer.ref.node, outputConsumer);
    return true;
  } else if (outputConsumer.ref !== inputConsumer.ref) {
    tcb.oobRecorder.splitTwoWayBinding(tcb.id, input, output, inputConsumer.ref.node, outputConsumer.ref.node);
    return true;
  }
  return false;
}
var TcbEventHandlerTranslator = class extends TcbExpressionTranslator {
  resolve(ast) {
    if (ast instanceof PropertyRead2 && ast.receiver instanceof ImplicitReceiver4 && !(ast.receiver instanceof ThisReceiver) && ast.name === EVENT_PARAMETER) {
      const event = ts66.createIdentifier(EVENT_PARAMETER);
      addParseSpanInfo(event, ast.nameSpan);
      return event;
    }
    return super.resolve(ast);
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/type_check_file.mjs
import ts67 from "typescript";
var TypeCheckFile = class extends Environment {
  constructor(fileName, config, refEmitter, reflector, compilerHost) {
    super(config, new ImportManager(new NoopImportRewriter(), "i"), refEmitter, reflector, ts67.createSourceFile(compilerHost.getCanonicalFileName(fileName), "", ts67.ScriptTarget.Latest, true));
    this.fileName = fileName;
    this.nextTcbId = 1;
    this.tcbStatements = [];
  }
  addTypeCheckBlock(ref, meta, domSchemaChecker, oobRecorder, genericContextBehavior) {
    const fnId = ts67.createIdentifier(`_tcb${this.nextTcbId++}`);
    const fn = generateTypeCheckBlock(this, ref, fnId, meta, domSchemaChecker, oobRecorder, genericContextBehavior);
    this.tcbStatements.push(fn);
  }
  render(removeComments) {
    let source = this.importManager.getAllImports(this.contextFile.fileName).map((i) => `import * as ${i.qualifier.text} from '${i.specifier}';`).join("\n") + "\n\n";
    const printer = ts67.createPrinter({ removeComments });
    source += "\n";
    for (const stmt of this.pipeInstStatements) {
      source += printer.printNode(ts67.EmitHint.Unspecified, stmt, this.contextFile) + "\n";
    }
    for (const stmt of this.typeCtorStatements) {
      source += printer.printNode(ts67.EmitHint.Unspecified, stmt, this.contextFile) + "\n";
    }
    source += "\n";
    for (const stmt of this.tcbStatements) {
      source += printer.printNode(ts67.EmitHint.Unspecified, stmt, this.contextFile) + "\n";
    }
    source += "\nexport const IS_A_MODULE = true;\n";
    return source;
  }
  getPreludeStatements() {
    return [];
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/context.mjs
var InliningMode;
(function(InliningMode2) {
  InliningMode2[InliningMode2["InlineOps"] = 0] = "InlineOps";
  InliningMode2[InliningMode2["Error"] = 1] = "Error";
})(InliningMode || (InliningMode = {}));
var TypeCheckContextImpl = class {
  constructor(config, compilerHost, refEmitter, reflector, host, inlining, perf) {
    this.config = config;
    this.compilerHost = compilerHost;
    this.refEmitter = refEmitter;
    this.reflector = reflector;
    this.host = host;
    this.inlining = inlining;
    this.perf = perf;
    this.fileMap = new Map();
    this.opMap = new Map();
    this.typeCtorPending = new Set();
    if (inlining === InliningMode.Error && config.useInlineTypeConstructors) {
      throw new Error(`AssertionError: invalid inlining configuration.`);
    }
  }
  addTemplate(ref, binder, template, pipes, schemas, sourceMapping, file, parseErrors) {
    if (!this.host.shouldCheckComponent(ref.node)) {
      return;
    }
    const fileData = this.dataForFile(ref.node.getSourceFile());
    const shimData = this.pendingShimForComponent(ref.node);
    const templateId = fileData.sourceManager.getTemplateId(ref.node);
    const templateDiagnostics = [];
    if (parseErrors !== null) {
      templateDiagnostics.push(...this.getTemplateDiagnostics(parseErrors, templateId, sourceMapping));
    }
    const boundTarget = binder.bind({ template });
    if (this.inlining === InliningMode.InlineOps) {
      for (const dir of boundTarget.getUsedDirectives()) {
        const dirRef = dir.ref;
        const dirNode = dirRef.node;
        if (!dir.isGeneric || !requiresInlineTypeCtor(dirNode, this.reflector)) {
          continue;
        }
        this.addInlineTypeCtor(fileData, dirNode.getSourceFile(), dirRef, {
          fnName: "ngTypeCtor",
          body: !dirNode.getSourceFile().isDeclarationFile,
          fields: {
            inputs: dir.inputs.classPropertyNames,
            outputs: dir.outputs.classPropertyNames,
            queries: dir.queries
          },
          coercedInputFields: dir.coercedInputFields
        });
      }
    }
    shimData.templates.set(templateId, {
      template,
      boundTarget,
      templateDiagnostics
    });
    const inliningRequirement = requiresInlineTypeCheckBlock(ref.node, pipes, this.reflector);
    if (this.inlining === InliningMode.Error && inliningRequirement === TcbInliningRequirement.MustInline) {
      shimData.oobRecorder.requiresInlineTcb(templateId, ref.node);
      this.perf.eventCount(PerfEvent.SkipGenerateTcbNoInline);
      return;
    }
    const meta = {
      id: fileData.sourceManager.captureSource(ref.node, sourceMapping, file),
      boundTarget,
      pipes,
      schemas
    };
    this.perf.eventCount(PerfEvent.GenerateTcb);
    if (inliningRequirement !== TcbInliningRequirement.None && this.inlining === InliningMode.InlineOps) {
      this.addInlineTypeCheckBlock(fileData, shimData, ref, meta);
    } else if (inliningRequirement === TcbInliningRequirement.ShouldInlineForGenericBounds && this.inlining === InliningMode.Error) {
      shimData.file.addTypeCheckBlock(ref, meta, shimData.domSchemaChecker, shimData.oobRecorder, TcbGenericContextBehavior.FallbackToAny);
    } else {
      shimData.file.addTypeCheckBlock(ref, meta, shimData.domSchemaChecker, shimData.oobRecorder, TcbGenericContextBehavior.UseEmitter);
    }
  }
  addInlineTypeCtor(fileData, sf, ref, ctorMeta) {
    if (this.typeCtorPending.has(ref.node)) {
      return;
    }
    this.typeCtorPending.add(ref.node);
    if (!this.opMap.has(sf)) {
      this.opMap.set(sf, []);
    }
    const ops = this.opMap.get(sf);
    ops.push(new TypeCtorOp(ref, ctorMeta));
    fileData.hasInlines = true;
  }
  transform(sf) {
    if (!this.opMap.has(sf)) {
      return null;
    }
    const importManager = new ImportManager(new NoopImportRewriter(), "_i");
    const ops = this.opMap.get(sf).sort(orderOps);
    const textParts = splitStringAtPoints(sf.text, ops.map((op) => op.splitPoint));
    const printer = ts68.createPrinter({ omitTrailingSemicolon: true });
    let code = textParts[0];
    ops.forEach((op, idx) => {
      const text = op.execute(importManager, sf, this.refEmitter, printer);
      code += "\n\n" + text + textParts[idx + 1];
    });
    let imports = importManager.getAllImports(sf.fileName).map((i) => `import * as ${i.qualifier.text} from '${i.specifier}';`).join("\n");
    code = imports + "\n" + code;
    return code;
  }
  finalize() {
    const updates = new Map();
    for (const originalSf of this.opMap.keys()) {
      const newText = this.transform(originalSf);
      if (newText !== null) {
        updates.set(absoluteFromSourceFile(originalSf), {
          newText,
          originalFile: originalSf
        });
      }
    }
    for (const [sfPath, pendingFileData] of this.fileMap) {
      for (const pendingShimData of pendingFileData.shimData.values()) {
        this.host.recordShimData(sfPath, {
          genesisDiagnostics: [
            ...pendingShimData.domSchemaChecker.diagnostics,
            ...pendingShimData.oobRecorder.diagnostics
          ],
          hasInlines: pendingFileData.hasInlines,
          path: pendingShimData.file.fileName,
          templates: pendingShimData.templates
        });
        const sfText = pendingShimData.file.render(false);
        updates.set(pendingShimData.file.fileName, {
          newText: sfText,
          originalFile: null
        });
      }
    }
    return updates;
  }
  addInlineTypeCheckBlock(fileData, shimData, ref, tcbMeta) {
    const sf = ref.node.getSourceFile();
    if (!this.opMap.has(sf)) {
      this.opMap.set(sf, []);
    }
    const ops = this.opMap.get(sf);
    ops.push(new InlineTcbOp(ref, tcbMeta, this.config, this.reflector, shimData.domSchemaChecker, shimData.oobRecorder));
    fileData.hasInlines = true;
  }
  pendingShimForComponent(node) {
    const fileData = this.dataForFile(node.getSourceFile());
    const shimPath = TypeCheckShimGenerator.shimFor(absoluteFromSourceFile(node.getSourceFile()));
    if (!fileData.shimData.has(shimPath)) {
      fileData.shimData.set(shimPath, {
        domSchemaChecker: new RegistryDomSchemaChecker(fileData.sourceManager),
        oobRecorder: new OutOfBandDiagnosticRecorderImpl(fileData.sourceManager),
        file: new TypeCheckFile(shimPath, this.config, this.refEmitter, this.reflector, this.compilerHost),
        templates: new Map()
      });
    }
    return fileData.shimData.get(shimPath);
  }
  dataForFile(sf) {
    const sfPath = absoluteFromSourceFile(sf);
    if (!this.fileMap.has(sfPath)) {
      const data = {
        hasInlines: false,
        sourceManager: this.host.getSourceManager(sfPath),
        shimData: new Map()
      };
      this.fileMap.set(sfPath, data);
    }
    return this.fileMap.get(sfPath);
  }
  getTemplateDiagnostics(parseErrors, templateId, sourceMapping) {
    return parseErrors.map((error2) => {
      const span = error2.span;
      if (span.start.offset === span.end.offset) {
        span.end.offset++;
      }
      return makeTemplateDiagnostic(templateId, sourceMapping, span, ts68.DiagnosticCategory.Error, ngErrorCode(ErrorCode.TEMPLATE_PARSE_ERROR), error2.msg);
    });
  }
};
var InlineTcbOp = class {
  constructor(ref, meta, config, reflector, domSchemaChecker, oobRecorder) {
    this.ref = ref;
    this.meta = meta;
    this.config = config;
    this.reflector = reflector;
    this.domSchemaChecker = domSchemaChecker;
    this.oobRecorder = oobRecorder;
  }
  get splitPoint() {
    return this.ref.node.end + 1;
  }
  execute(im, sf, refEmitter, printer) {
    const env = new Environment(this.config, im, refEmitter, this.reflector, sf);
    const fnName = ts68.createIdentifier(`_tcb_${this.ref.node.pos}`);
    const fn = generateTypeCheckBlock(env, this.ref, fnName, this.meta, this.domSchemaChecker, this.oobRecorder, TcbGenericContextBehavior.CopyClassNodes);
    return printer.printNode(ts68.EmitHint.Unspecified, fn, sf);
  }
};
var TypeCtorOp = class {
  constructor(ref, meta) {
    this.ref = ref;
    this.meta = meta;
  }
  get splitPoint() {
    return this.ref.node.end - 1;
  }
  execute(im, sf, refEmitter, printer) {
    const tcb = generateInlineTypeCtor(this.ref.node, this.meta);
    return printer.printNode(ts68.EmitHint.Unspecified, tcb, sf);
  }
};
function orderOps(op1, op2) {
  return op1.splitPoint - op2.splitPoint;
}
function splitStringAtPoints(str, points) {
  const splits = [];
  let start = 0;
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    splits.push(str.substring(start, point));
    start = point;
  }
  splits.push(str.substring(start));
  return splits;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/source.mjs
import { ParseLocation as ParseLocation2, ParseSourceSpan as ParseSourceSpan2 } from "@angular/compiler";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/line_mappings.mjs
var LF_CHAR = 10;
var CR_CHAR = 13;
var LINE_SEP_CHAR = 8232;
var PARAGRAPH_CHAR = 8233;
function getLineAndCharacterFromPosition(lineStartsMap, position) {
  const lineIndex = findClosestLineStartPosition(lineStartsMap, position);
  return { character: position - lineStartsMap[lineIndex], line: lineIndex };
}
function computeLineStartsMap(text) {
  const result = [0];
  let pos = 0;
  while (pos < text.length) {
    const char = text.charCodeAt(pos++);
    if (char === CR_CHAR) {
      if (text.charCodeAt(pos) === LF_CHAR) {
        pos++;
      }
      result.push(pos);
    } else if (char === LF_CHAR || char === LINE_SEP_CHAR || char === PARAGRAPH_CHAR) {
      result.push(pos);
    }
  }
  result.push(pos);
  return result;
}
function findClosestLineStartPosition(linesMap, position, low = 0, high = linesMap.length - 1) {
  while (low <= high) {
    const pivotIdx = Math.floor((low + high) / 2);
    const pivotEl = linesMap[pivotIdx];
    if (pivotEl === position) {
      return pivotIdx;
    } else if (position > pivotEl) {
      low = pivotIdx + 1;
    } else {
      high = pivotIdx - 1;
    }
  }
  return low - 1;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/source.mjs
var TemplateSource = class {
  constructor(mapping, file) {
    this.mapping = mapping;
    this.file = file;
    this.lineStarts = null;
  }
  toParseSourceSpan(start, end) {
    const startLoc = this.toParseLocation(start);
    const endLoc = this.toParseLocation(end);
    return new ParseSourceSpan2(startLoc, endLoc);
  }
  toParseLocation(position) {
    const lineStarts = this.acquireLineStarts();
    const { line, character } = getLineAndCharacterFromPosition(lineStarts, position);
    return new ParseLocation2(this.file, position, line, character);
  }
  acquireLineStarts() {
    if (this.lineStarts === null) {
      this.lineStarts = computeLineStartsMap(this.file.content);
    }
    return this.lineStarts;
  }
};
var TemplateSourceManager = class {
  constructor() {
    this.templateSources = new Map();
  }
  getTemplateId(node) {
    return getTemplateId(node);
  }
  captureSource(node, mapping, file) {
    const id = getTemplateId(node);
    this.templateSources.set(id, new TemplateSource(mapping, file));
    return id;
  }
  getSourceMapping(id) {
    if (!this.templateSources.has(id)) {
      throw new Error(`Unexpected unknown template ID: ${id}`);
    }
    return this.templateSources.get(id).mapping;
  }
  toParseSourceSpan(id, span) {
    if (!this.templateSources.has(id)) {
      return null;
    }
    const templateSource = this.templateSources.get(id);
    return templateSource.toParseSourceSpan(span.start, span.end);
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/template_symbol_builder.mjs
import { AST, ASTWithSource as ASTWithSource3, BindingPipe as BindingPipe2, PropertyRead as PropertyRead3, PropertyWrite as PropertyWrite3, SafePropertyRead as SafePropertyRead4, TmplAstBoundAttribute as TmplAstBoundAttribute2, TmplAstBoundEvent, TmplAstElement as TmplAstElement4, TmplAstReference as TmplAstReference4, TmplAstTemplate as TmplAstTemplate3, TmplAstTextAttribute as TmplAstTextAttribute3, TmplAstVariable as TmplAstVariable3 } from "@angular/compiler";
import ts69 from "typescript";
var SymbolBuilder = class {
  constructor(shimPath, typeCheckBlock, templateData, componentScopeReader, getTypeChecker) {
    this.shimPath = shimPath;
    this.typeCheckBlock = typeCheckBlock;
    this.templateData = templateData;
    this.componentScopeReader = componentScopeReader;
    this.getTypeChecker = getTypeChecker;
    this.symbolCache = new Map();
  }
  getSymbol(node) {
    if (this.symbolCache.has(node)) {
      return this.symbolCache.get(node);
    }
    let symbol = null;
    if (node instanceof TmplAstBoundAttribute2 || node instanceof TmplAstTextAttribute3) {
      symbol = this.getSymbolOfInputBinding(node);
    } else if (node instanceof TmplAstBoundEvent) {
      symbol = this.getSymbolOfBoundEvent(node);
    } else if (node instanceof TmplAstElement4) {
      symbol = this.getSymbolOfElement(node);
    } else if (node instanceof TmplAstTemplate3) {
      symbol = this.getSymbolOfAstTemplate(node);
    } else if (node instanceof TmplAstVariable3) {
      symbol = this.getSymbolOfVariable(node);
    } else if (node instanceof TmplAstReference4) {
      symbol = this.getSymbolOfReference(node);
    } else if (node instanceof BindingPipe2) {
      symbol = this.getSymbolOfPipe(node);
    } else if (node instanceof AST) {
      symbol = this.getSymbolOfTemplateExpression(node);
    } else {
    }
    this.symbolCache.set(node, symbol);
    return symbol;
  }
  getSymbolOfAstTemplate(template) {
    const directives = this.getDirectivesOfNode(template);
    return { kind: SymbolKind.Template, directives, templateNode: template };
  }
  getSymbolOfElement(element) {
    var _a;
    const elementSourceSpan = (_a = element.startSourceSpan) != null ? _a : element.sourceSpan;
    const node = findFirstMatchingNode(this.typeCheckBlock, { withSpan: elementSourceSpan, filter: ts69.isVariableDeclaration });
    if (node === null) {
      return null;
    }
    const symbolFromDeclaration = this.getSymbolOfTsNode(node);
    if (symbolFromDeclaration === null || symbolFromDeclaration.tsSymbol === null) {
      return null;
    }
    const directives = this.getDirectivesOfNode(element);
    return __spreadProps(__spreadValues({}, symbolFromDeclaration), {
      kind: SymbolKind.Element,
      directives,
      templateNode: element
    });
  }
  getDirectivesOfNode(element) {
    var _a;
    const elementSourceSpan = (_a = element.startSourceSpan) != null ? _a : element.sourceSpan;
    const tcbSourceFile = this.typeCheckBlock.getSourceFile();
    const isDirectiveDeclaration = (node) => (ts69.isTypeNode(node) || ts69.isIdentifier(node)) && ts69.isVariableDeclaration(node.parent) && hasExpressionIdentifier(tcbSourceFile, node, ExpressionIdentifier.DIRECTIVE);
    const nodes = findAllMatchingNodes(this.typeCheckBlock, { withSpan: elementSourceSpan, filter: isDirectiveDeclaration });
    return nodes.map((node) => {
      var _a2;
      const symbol = this.getSymbolOfTsNode(node.parent);
      if (symbol === null || !isSymbolWithValueDeclaration(symbol.tsSymbol) || !ts69.isClassDeclaration(symbol.tsSymbol.valueDeclaration)) {
        return null;
      }
      const meta = this.getDirectiveMeta(element, symbol.tsSymbol.valueDeclaration);
      if (meta === null) {
        return null;
      }
      const ngModule = this.getDirectiveModule(symbol.tsSymbol.valueDeclaration);
      if (meta.selector === null) {
        return null;
      }
      const isComponent = (_a2 = meta.isComponent) != null ? _a2 : null;
      const directiveSymbol = __spreadProps(__spreadValues({}, symbol), {
        tsSymbol: symbol.tsSymbol,
        selector: meta.selector,
        isComponent,
        ngModule,
        kind: SymbolKind.Directive,
        isStructural: meta.isStructural
      });
      return directiveSymbol;
    }).filter((d) => d !== null);
  }
  getDirectiveMeta(host, directiveDeclaration) {
    var _a;
    let directives = this.templateData.boundTarget.getDirectivesOfNode(host);
    const firstChild = host.children[0];
    if (firstChild instanceof TmplAstElement4) {
      const isMicrosyntaxTemplate = host instanceof TmplAstTemplate3 && sourceSpanEqual(firstChild.sourceSpan, host.sourceSpan);
      if (isMicrosyntaxTemplate) {
        const firstChildDirectives = this.templateData.boundTarget.getDirectivesOfNode(firstChild);
        if (firstChildDirectives !== null && directives !== null) {
          directives = directives.concat(firstChildDirectives);
        } else {
          directives = directives != null ? directives : firstChildDirectives;
        }
      }
    }
    if (directives === null) {
      return null;
    }
    return (_a = directives.find((m) => m.ref.node === directiveDeclaration)) != null ? _a : null;
  }
  getDirectiveModule(declaration) {
    const scope = this.componentScopeReader.getScopeForComponent(declaration);
    if (scope === null) {
      return null;
    }
    return scope.ngModule;
  }
  getSymbolOfBoundEvent(eventBinding) {
    const consumer = this.templateData.boundTarget.getConsumerOfBinding(eventBinding);
    if (consumer === null) {
      return null;
    }
    let expectedAccess;
    if (consumer instanceof TmplAstTemplate3 || consumer instanceof TmplAstElement4) {
      expectedAccess = "addEventListener";
    } else {
      const bindingPropertyNames = consumer.outputs.getByBindingPropertyName(eventBinding.name);
      if (bindingPropertyNames === null || bindingPropertyNames.length === 0) {
        return null;
      }
      expectedAccess = bindingPropertyNames[0].classPropertyName;
    }
    function filter(n) {
      if (!isAccessExpression(n)) {
        return false;
      }
      if (ts69.isPropertyAccessExpression(n)) {
        return n.name.getText() === expectedAccess;
      } else {
        return ts69.isStringLiteral(n.argumentExpression) && n.argumentExpression.text === expectedAccess;
      }
    }
    const outputFieldAccesses = findAllMatchingNodes(this.typeCheckBlock, { withSpan: eventBinding.keySpan, filter });
    const bindings = [];
    for (const outputFieldAccess of outputFieldAccesses) {
      if (consumer instanceof TmplAstTemplate3 || consumer instanceof TmplAstElement4) {
        if (!ts69.isPropertyAccessExpression(outputFieldAccess)) {
          continue;
        }
        const addEventListener = outputFieldAccess.name;
        const tsSymbol = this.getTypeChecker().getSymbolAtLocation(addEventListener);
        const tsType = this.getTypeChecker().getTypeAtLocation(addEventListener);
        const positionInShimFile = this.getShimPositionForNode(addEventListener);
        const target = this.getSymbol(consumer);
        if (target === null || tsSymbol === void 0) {
          continue;
        }
        bindings.push({
          kind: SymbolKind.Binding,
          tsSymbol,
          tsType,
          target,
          shimLocation: { shimPath: this.shimPath, positionInShimFile }
        });
      } else {
        if (!ts69.isElementAccessExpression(outputFieldAccess)) {
          continue;
        }
        const tsSymbol = this.getTypeChecker().getSymbolAtLocation(outputFieldAccess.argumentExpression);
        if (tsSymbol === void 0) {
          continue;
        }
        const target = this.getDirectiveSymbolForAccessExpression(outputFieldAccess, consumer);
        if (target === null) {
          continue;
        }
        const positionInShimFile = this.getShimPositionForNode(outputFieldAccess);
        const tsType = this.getTypeChecker().getTypeAtLocation(outputFieldAccess);
        bindings.push({
          kind: SymbolKind.Binding,
          tsSymbol,
          tsType,
          target,
          shimLocation: { shimPath: this.shimPath, positionInShimFile }
        });
      }
    }
    if (bindings.length === 0) {
      return null;
    }
    return { kind: SymbolKind.Output, bindings };
  }
  getSymbolOfInputBinding(binding) {
    const consumer = this.templateData.boundTarget.getConsumerOfBinding(binding);
    if (consumer === null) {
      return null;
    }
    if (consumer instanceof TmplAstElement4 || consumer instanceof TmplAstTemplate3) {
      const host = this.getSymbol(consumer);
      return host !== null ? { kind: SymbolKind.DomBinding, host } : null;
    }
    const nodes = findAllMatchingNodes(this.typeCheckBlock, { withSpan: binding.sourceSpan, filter: isAssignment });
    const bindings = [];
    for (const node of nodes) {
      if (!isAccessExpression(node.left)) {
        continue;
      }
      const symbolInfo = this.getSymbolOfTsNode(node.left);
      if (symbolInfo === null || symbolInfo.tsSymbol === null) {
        continue;
      }
      const target = this.getDirectiveSymbolForAccessExpression(node.left, consumer);
      if (target === null) {
        continue;
      }
      bindings.push(__spreadProps(__spreadValues({}, symbolInfo), {
        tsSymbol: symbolInfo.tsSymbol,
        kind: SymbolKind.Binding,
        target
      }));
    }
    if (bindings.length === 0) {
      return null;
    }
    return { kind: SymbolKind.Input, bindings };
  }
  getDirectiveSymbolForAccessExpression(node, { isComponent, selector, isStructural }) {
    var _a;
    const tsSymbol = this.getTypeChecker().getSymbolAtLocation(node.expression);
    if ((tsSymbol == null ? void 0 : tsSymbol.declarations) === void 0 || tsSymbol.declarations.length === 0 || selector === null) {
      return null;
    }
    const [declaration] = tsSymbol.declarations;
    if (!ts69.isVariableDeclaration(declaration) || !hasExpressionIdentifier(declaration.getSourceFile(), (_a = declaration.type) != null ? _a : declaration.name, ExpressionIdentifier.DIRECTIVE)) {
      return null;
    }
    const symbol = this.getSymbolOfTsNode(declaration);
    if (symbol === null || !isSymbolWithValueDeclaration(symbol.tsSymbol) || !ts69.isClassDeclaration(symbol.tsSymbol.valueDeclaration)) {
      return null;
    }
    const ngModule = this.getDirectiveModule(symbol.tsSymbol.valueDeclaration);
    return {
      kind: SymbolKind.Directive,
      tsSymbol: symbol.tsSymbol,
      tsType: symbol.tsType,
      shimLocation: symbol.shimLocation,
      isComponent,
      isStructural,
      selector,
      ngModule
    };
  }
  getSymbolOfVariable(variable) {
    const node = findFirstMatchingNode(this.typeCheckBlock, { withSpan: variable.sourceSpan, filter: ts69.isVariableDeclaration });
    if (node === null || node.initializer === void 0) {
      return null;
    }
    const expressionSymbol = this.getSymbolOfTsNode(node.initializer);
    if (expressionSymbol === null) {
      return null;
    }
    return {
      tsType: expressionSymbol.tsType,
      tsSymbol: expressionSymbol.tsSymbol,
      initializerLocation: expressionSymbol.shimLocation,
      kind: SymbolKind.Variable,
      declaration: variable,
      localVarLocation: {
        shimPath: this.shimPath,
        positionInShimFile: this.getShimPositionForNode(node.name)
      }
    };
  }
  getSymbolOfReference(ref) {
    const target = this.templateData.boundTarget.getReferenceTarget(ref);
    let node = findFirstMatchingNode(this.typeCheckBlock, { withSpan: ref.sourceSpan, filter: ts69.isVariableDeclaration });
    if (node === null || target === null || node.initializer === void 0) {
      return null;
    }
    const originalDeclaration = ts69.isParenthesizedExpression(node.initializer) && ts69.isAsExpression(node.initializer.expression) ? this.getTypeChecker().getSymbolAtLocation(node.name) : this.getTypeChecker().getSymbolAtLocation(node.initializer);
    if (originalDeclaration === void 0 || originalDeclaration.valueDeclaration === void 0) {
      return null;
    }
    const symbol = this.getSymbolOfTsNode(originalDeclaration.valueDeclaration);
    if (symbol === null || symbol.tsSymbol === null) {
      return null;
    }
    const referenceVarShimLocation = {
      shimPath: this.shimPath,
      positionInShimFile: this.getShimPositionForNode(node)
    };
    if (target instanceof TmplAstTemplate3 || target instanceof TmplAstElement4) {
      return {
        kind: SymbolKind.Reference,
        tsSymbol: symbol.tsSymbol,
        tsType: symbol.tsType,
        target,
        declaration: ref,
        targetLocation: symbol.shimLocation,
        referenceVarLocation: referenceVarShimLocation
      };
    } else {
      if (!ts69.isClassDeclaration(target.directive.ref.node)) {
        return null;
      }
      return {
        kind: SymbolKind.Reference,
        tsSymbol: symbol.tsSymbol,
        tsType: symbol.tsType,
        declaration: ref,
        target: target.directive.ref.node,
        targetLocation: symbol.shimLocation,
        referenceVarLocation: referenceVarShimLocation
      };
    }
  }
  getSymbolOfPipe(expression) {
    const methodAccess = findFirstMatchingNode(this.typeCheckBlock, { withSpan: expression.nameSpan, filter: ts69.isPropertyAccessExpression });
    if (methodAccess === null) {
      return null;
    }
    const pipeVariableNode = methodAccess.expression;
    const pipeDeclaration = this.getTypeChecker().getSymbolAtLocation(pipeVariableNode);
    if (pipeDeclaration === void 0 || pipeDeclaration.valueDeclaration === void 0) {
      return null;
    }
    const pipeInstance = this.getSymbolOfTsNode(pipeDeclaration.valueDeclaration);
    if (pipeInstance === null || !isSymbolWithValueDeclaration(pipeInstance.tsSymbol)) {
      return null;
    }
    const symbolInfo = this.getSymbolOfTsNode(methodAccess);
    if (symbolInfo === null) {
      return null;
    }
    return __spreadProps(__spreadValues({
      kind: SymbolKind.Pipe
    }, symbolInfo), {
      classSymbol: __spreadProps(__spreadValues({}, pipeInstance), {
        tsSymbol: pipeInstance.tsSymbol
      })
    });
  }
  getSymbolOfTemplateExpression(expression) {
    if (expression instanceof ASTWithSource3) {
      expression = expression.ast;
    }
    const expressionTarget = this.templateData.boundTarget.getExpressionTarget(expression);
    if (expressionTarget !== null) {
      return this.getSymbol(expressionTarget);
    }
    let withSpan = expression.sourceSpan;
    if (expression instanceof PropertyWrite3) {
      withSpan = expression.nameSpan;
    }
    let node = null;
    if (expression instanceof PropertyRead3) {
      node = findFirstMatchingNode(this.typeCheckBlock, { withSpan, filter: ts69.isPropertyAccessExpression });
    }
    if (node === null) {
      node = findFirstMatchingNode(this.typeCheckBlock, { withSpan, filter: anyNodeFilter });
    }
    if (node === null) {
      return null;
    }
    while (ts69.isParenthesizedExpression(node)) {
      node = node.expression;
    }
    if (expression instanceof SafePropertyRead4 && ts69.isConditionalExpression(node)) {
      const whenTrueSymbol = this.getSymbolOfTsNode(node.whenTrue);
      if (whenTrueSymbol === null) {
        return null;
      }
      return __spreadProps(__spreadValues({}, whenTrueSymbol), {
        kind: SymbolKind.Expression,
        tsType: this.getTypeChecker().getTypeAtLocation(node)
      });
    } else {
      const symbolInfo = this.getSymbolOfTsNode(node);
      return symbolInfo === null ? null : __spreadProps(__spreadValues({}, symbolInfo), { kind: SymbolKind.Expression });
    }
  }
  getSymbolOfTsNode(node) {
    var _a;
    while (ts69.isParenthesizedExpression(node)) {
      node = node.expression;
    }
    let tsSymbol;
    if (ts69.isPropertyAccessExpression(node)) {
      tsSymbol = this.getTypeChecker().getSymbolAtLocation(node.name);
    } else if (ts69.isElementAccessExpression(node)) {
      tsSymbol = this.getTypeChecker().getSymbolAtLocation(node.argumentExpression);
    } else {
      tsSymbol = this.getTypeChecker().getSymbolAtLocation(node);
    }
    const positionInShimFile = this.getShimPositionForNode(node);
    const type = this.getTypeChecker().getTypeAtLocation(node);
    return {
      tsSymbol: (_a = tsSymbol != null ? tsSymbol : type.symbol) != null ? _a : null,
      tsType: type,
      shimLocation: { shimPath: this.shimPath, positionInShimFile }
    };
  }
  getShimPositionForNode(node) {
    if (ts69.isTypeReferenceNode(node)) {
      return this.getShimPositionForNode(node.typeName);
    } else if (ts69.isQualifiedName(node)) {
      return node.right.getStart();
    } else if (ts69.isPropertyAccessExpression(node)) {
      return node.name.getStart();
    } else if (ts69.isElementAccessExpression(node)) {
      return node.argumentExpression.getStart();
    } else {
      return node.getStart();
    }
  }
};
function anyNodeFilter(n) {
  return true;
}
function sourceSpanEqual(a, b) {
  return a.start.offset === b.start.offset && a.end.offset === b.end.offset;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/checker.mjs
var REGISTRY2 = new DomElementSchemaRegistry3();
var TemplateTypeCheckerImpl = class {
  constructor(originalProgram, programDriver, typeCheckAdapter, config, refEmitter, reflector, compilerHost, priorBuild, componentScopeReader, typeCheckScopeRegistry, perf) {
    this.originalProgram = originalProgram;
    this.programDriver = programDriver;
    this.typeCheckAdapter = typeCheckAdapter;
    this.config = config;
    this.refEmitter = refEmitter;
    this.reflector = reflector;
    this.compilerHost = compilerHost;
    this.priorBuild = priorBuild;
    this.componentScopeReader = componentScopeReader;
    this.typeCheckScopeRegistry = typeCheckScopeRegistry;
    this.perf = perf;
    this.state = new Map();
    this.completionCache = new Map();
    this.symbolBuilderCache = new Map();
    this.scopeCache = new Map();
    this.elementTagCache = new Map();
    this.isComplete = false;
  }
  getTemplate(component) {
    const { data } = this.getLatestComponentState(component);
    if (data === null) {
      return null;
    }
    return data.template;
  }
  getLatestComponentState(component) {
    this.ensureShimForComponent(component);
    const sf = component.getSourceFile();
    const sfPath = absoluteFromSourceFile(sf);
    const shimPath = TypeCheckShimGenerator.shimFor(sfPath);
    const fileRecord = this.getFileData(sfPath);
    if (!fileRecord.shimData.has(shimPath)) {
      return { data: null, tcb: null, shimPath };
    }
    const templateId = fileRecord.sourceManager.getTemplateId(component);
    const shimRecord = fileRecord.shimData.get(shimPath);
    const id = fileRecord.sourceManager.getTemplateId(component);
    const program = this.programDriver.getProgram();
    const shimSf = getSourceFileOrNull(program, shimPath);
    if (shimSf === null || !fileRecord.shimData.has(shimPath)) {
      throw new Error(`Error: no shim file in program: ${shimPath}`);
    }
    let tcb = findTypeCheckBlock(shimSf, id, false);
    if (tcb === null) {
      const inlineSf = getSourceFileOrError(program, sfPath);
      tcb = findTypeCheckBlock(inlineSf, id, false);
    }
    let data = null;
    if (shimRecord.templates.has(templateId)) {
      data = shimRecord.templates.get(templateId);
    }
    return { data, tcb, shimPath };
  }
  isTrackedTypeCheckFile(filePath) {
    return this.getFileAndShimRecordsForPath(filePath) !== null;
  }
  getFileAndShimRecordsForPath(shimPath) {
    for (const fileRecord of this.state.values()) {
      if (fileRecord.shimData.has(shimPath)) {
        return { fileRecord, shimRecord: fileRecord.shimData.get(shimPath) };
      }
    }
    return null;
  }
  getTemplateMappingAtShimLocation({ shimPath, positionInShimFile }) {
    const records = this.getFileAndShimRecordsForPath(absoluteFrom(shimPath));
    if (records === null) {
      return null;
    }
    const { fileRecord } = records;
    const shimSf = this.programDriver.getProgram().getSourceFile(absoluteFrom(shimPath));
    if (shimSf === void 0) {
      return null;
    }
    return getTemplateMapping(shimSf, positionInShimFile, fileRecord.sourceManager, false);
  }
  generateAllTypeCheckBlocks() {
    this.ensureAllShimsForAllFiles();
  }
  getDiagnosticsForFile(sf, optimizeFor) {
    switch (optimizeFor) {
      case OptimizeFor.WholeProgram:
        this.ensureAllShimsForAllFiles();
        break;
      case OptimizeFor.SingleFile:
        this.ensureAllShimsForOneFile(sf);
        break;
    }
    return this.perf.inPhase(PerfPhase.TtcDiagnostics, () => {
      const sfPath = absoluteFromSourceFile(sf);
      const fileRecord = this.state.get(sfPath);
      const typeCheckProgram = this.programDriver.getProgram();
      const diagnostics = [];
      if (fileRecord.hasInlines) {
        const inlineSf = getSourceFileOrError(typeCheckProgram, sfPath);
        diagnostics.push(...typeCheckProgram.getSemanticDiagnostics(inlineSf).map((diag) => convertDiagnostic(diag, fileRecord.sourceManager)));
      }
      for (const [shimPath, shimRecord] of fileRecord.shimData) {
        const shimSf = getSourceFileOrError(typeCheckProgram, shimPath);
        diagnostics.push(...typeCheckProgram.getSemanticDiagnostics(shimSf).map((diag) => convertDiagnostic(diag, fileRecord.sourceManager)));
        diagnostics.push(...shimRecord.genesisDiagnostics);
        for (const templateData of shimRecord.templates.values()) {
          diagnostics.push(...templateData.templateDiagnostics);
        }
      }
      return diagnostics.filter((diag) => diag !== null);
    });
  }
  getDiagnosticsForComponent(component) {
    this.ensureShimForComponent(component);
    return this.perf.inPhase(PerfPhase.TtcDiagnostics, () => {
      const sf = component.getSourceFile();
      const sfPath = absoluteFromSourceFile(sf);
      const shimPath = TypeCheckShimGenerator.shimFor(sfPath);
      const fileRecord = this.getFileData(sfPath);
      if (!fileRecord.shimData.has(shimPath)) {
        return [];
      }
      const templateId = fileRecord.sourceManager.getTemplateId(component);
      const shimRecord = fileRecord.shimData.get(shimPath);
      const typeCheckProgram = this.programDriver.getProgram();
      const diagnostics = [];
      if (shimRecord.hasInlines) {
        const inlineSf = getSourceFileOrError(typeCheckProgram, sfPath);
        diagnostics.push(...typeCheckProgram.getSemanticDiagnostics(inlineSf).map((diag) => convertDiagnostic(diag, fileRecord.sourceManager)));
      }
      const shimSf = getSourceFileOrError(typeCheckProgram, shimPath);
      diagnostics.push(...typeCheckProgram.getSemanticDiagnostics(shimSf).map((diag) => convertDiagnostic(diag, fileRecord.sourceManager)));
      diagnostics.push(...shimRecord.genesisDiagnostics);
      for (const templateData of shimRecord.templates.values()) {
        diagnostics.push(...templateData.templateDiagnostics);
      }
      return diagnostics.filter((diag) => diag !== null && diag.templateId === templateId);
    });
  }
  getTypeCheckBlock(component) {
    return this.getLatestComponentState(component).tcb;
  }
  getGlobalCompletions(context, component, node) {
    const engine = this.getOrCreateCompletionEngine(component);
    if (engine === null) {
      return null;
    }
    return this.perf.inPhase(PerfPhase.TtcAutocompletion, () => engine.getGlobalCompletions(context, node));
  }
  getExpressionCompletionLocation(ast, component) {
    const engine = this.getOrCreateCompletionEngine(component);
    if (engine === null) {
      return null;
    }
    return this.perf.inPhase(PerfPhase.TtcAutocompletion, () => engine.getExpressionCompletionLocation(ast));
  }
  getLiteralCompletionLocation(node, component) {
    const engine = this.getOrCreateCompletionEngine(component);
    if (engine === null) {
      return null;
    }
    return this.perf.inPhase(PerfPhase.TtcAutocompletion, () => engine.getLiteralCompletionLocation(node));
  }
  invalidateClass(clazz) {
    this.completionCache.delete(clazz);
    this.symbolBuilderCache.delete(clazz);
    this.scopeCache.delete(clazz);
    this.elementTagCache.delete(clazz);
    const sf = clazz.getSourceFile();
    const sfPath = absoluteFromSourceFile(sf);
    const shimPath = TypeCheckShimGenerator.shimFor(sfPath);
    const fileData = this.getFileData(sfPath);
    const templateId = fileData.sourceManager.getTemplateId(clazz);
    fileData.shimData.delete(shimPath);
    fileData.isComplete = false;
    this.isComplete = false;
  }
  makeTemplateDiagnostic(clazz, sourceSpan, category, errorCode, message, relatedInformation) {
    const sfPath = absoluteFromSourceFile(clazz.getSourceFile());
    const fileRecord = this.state.get(sfPath);
    const templateId = fileRecord.sourceManager.getTemplateId(clazz);
    const mapping = fileRecord.sourceManager.getSourceMapping(templateId);
    return __spreadProps(__spreadValues({}, makeTemplateDiagnostic(templateId, mapping, sourceSpan, category, ngErrorCode(errorCode), message, relatedInformation)), {
      __ngCode: errorCode
    });
  }
  getOrCreateCompletionEngine(component) {
    if (this.completionCache.has(component)) {
      return this.completionCache.get(component);
    }
    const { tcb, data, shimPath } = this.getLatestComponentState(component);
    if (tcb === null || data === null) {
      return null;
    }
    const engine = new CompletionEngine(tcb, data, shimPath);
    this.completionCache.set(component, engine);
    return engine;
  }
  maybeAdoptPriorResultsForFile(sf) {
    const sfPath = absoluteFromSourceFile(sf);
    if (this.state.has(sfPath)) {
      const existingResults = this.state.get(sfPath);
      if (existingResults.isComplete) {
        return;
      }
    }
    const previousResults = this.priorBuild.priorTypeCheckingResultsFor(sf);
    if (previousResults === null || !previousResults.isComplete) {
      return;
    }
    this.perf.eventCount(PerfEvent.ReuseTypeCheckFile);
    this.state.set(sfPath, previousResults);
  }
  ensureAllShimsForAllFiles() {
    if (this.isComplete) {
      return;
    }
    this.perf.inPhase(PerfPhase.TcbGeneration, () => {
      const host = new WholeProgramTypeCheckingHost(this);
      const ctx = this.newContext(host);
      for (const sf of this.originalProgram.getSourceFiles()) {
        if (sf.isDeclarationFile || isShim(sf)) {
          continue;
        }
        this.maybeAdoptPriorResultsForFile(sf);
        const sfPath = absoluteFromSourceFile(sf);
        const fileData = this.getFileData(sfPath);
        if (fileData.isComplete) {
          continue;
        }
        this.typeCheckAdapter.typeCheck(sf, ctx);
        fileData.isComplete = true;
      }
      this.updateFromContext(ctx);
      this.isComplete = true;
    });
  }
  ensureAllShimsForOneFile(sf) {
    this.perf.inPhase(PerfPhase.TcbGeneration, () => {
      this.maybeAdoptPriorResultsForFile(sf);
      const sfPath = absoluteFromSourceFile(sf);
      const fileData = this.getFileData(sfPath);
      if (fileData.isComplete) {
        return;
      }
      const host = new SingleFileTypeCheckingHost(sfPath, fileData, this);
      const ctx = this.newContext(host);
      this.typeCheckAdapter.typeCheck(sf, ctx);
      fileData.isComplete = true;
      this.updateFromContext(ctx);
    });
  }
  ensureShimForComponent(component) {
    const sf = component.getSourceFile();
    const sfPath = absoluteFromSourceFile(sf);
    const shimPath = TypeCheckShimGenerator.shimFor(sfPath);
    this.maybeAdoptPriorResultsForFile(sf);
    const fileData = this.getFileData(sfPath);
    if (fileData.shimData.has(shimPath)) {
      return;
    }
    const host = new SingleShimTypeCheckingHost(sfPath, fileData, this, shimPath);
    const ctx = this.newContext(host);
    this.typeCheckAdapter.typeCheck(sf, ctx);
    this.updateFromContext(ctx);
  }
  newContext(host) {
    const inlining = this.programDriver.supportsInlineOperations ? InliningMode.InlineOps : InliningMode.Error;
    return new TypeCheckContextImpl(this.config, this.compilerHost, this.refEmitter, this.reflector, host, inlining, this.perf);
  }
  clearAllShimDataUsingInlines() {
    for (const fileData of this.state.values()) {
      if (!fileData.hasInlines) {
        continue;
      }
      for (const [shimFile, shimData] of fileData.shimData.entries()) {
        if (shimData.hasInlines) {
          fileData.shimData.delete(shimFile);
        }
      }
      fileData.hasInlines = false;
      fileData.isComplete = false;
      this.isComplete = false;
    }
  }
  updateFromContext(ctx) {
    const updates = ctx.finalize();
    return this.perf.inPhase(PerfPhase.TcbUpdateProgram, () => {
      if (updates.size > 0) {
        this.perf.eventCount(PerfEvent.UpdateTypeCheckProgram);
      }
      this.programDriver.updateFiles(updates, UpdateMode.Incremental);
      this.priorBuild.recordSuccessfulTypeCheck(this.state);
      this.perf.memory(PerfCheckpoint.TtcUpdateProgram);
    });
  }
  getFileData(path8) {
    if (!this.state.has(path8)) {
      this.state.set(path8, {
        hasInlines: false,
        sourceManager: new TemplateSourceManager(),
        isComplete: false,
        shimData: new Map()
      });
    }
    return this.state.get(path8);
  }
  getSymbolOfNode(node, component) {
    const builder = this.getOrCreateSymbolBuilder(component);
    if (builder === null) {
      return null;
    }
    return this.perf.inPhase(PerfPhase.TtcSymbol, () => builder.getSymbol(node));
  }
  getOrCreateSymbolBuilder(component) {
    if (this.symbolBuilderCache.has(component)) {
      return this.symbolBuilderCache.get(component);
    }
    const { tcb, data, shimPath } = this.getLatestComponentState(component);
    if (tcb === null || data === null) {
      return null;
    }
    const builder = new SymbolBuilder(shimPath, tcb, data, this.componentScopeReader, () => this.programDriver.getProgram().getTypeChecker());
    this.symbolBuilderCache.set(component, builder);
    return builder;
  }
  getDirectivesInScope(component) {
    const data = this.getScopeData(component);
    if (data === null) {
      return null;
    }
    return data.directives;
  }
  getPipesInScope(component) {
    const data = this.getScopeData(component);
    if (data === null) {
      return null;
    }
    return data.pipes;
  }
  getDirectiveMetadata(dir) {
    if (!isNamedClassDeclaration(dir)) {
      return null;
    }
    return this.typeCheckScopeRegistry.getTypeCheckDirectiveMetadata(new Reference(dir));
  }
  getPotentialElementTags(component) {
    if (this.elementTagCache.has(component)) {
      return this.elementTagCache.get(component);
    }
    const tagMap = new Map();
    for (const tag of REGISTRY2.allKnownElementNames()) {
      tagMap.set(tag, null);
    }
    const scope = this.getScopeData(component);
    if (scope !== null) {
      for (const directive of scope.directives) {
        for (const selector of CssSelector3.parse(directive.selector)) {
          if (selector.element === null || tagMap.has(selector.element)) {
            continue;
          }
          tagMap.set(selector.element, directive);
        }
      }
    }
    this.elementTagCache.set(component, tagMap);
    return tagMap;
  }
  getPotentialDomBindings(tagName) {
    const attributes = REGISTRY2.allKnownAttributesOfElement(tagName);
    return attributes.map((attribute) => ({
      attribute,
      property: REGISTRY2.getMappedPropName(attribute)
    }));
  }
  getPotentialDomEvents(tagName) {
    return REGISTRY2.allKnownEventsOfElement(tagName);
  }
  getScopeData(component) {
    if (this.scopeCache.has(component)) {
      return this.scopeCache.get(component);
    }
    if (!isNamedClassDeclaration(component)) {
      throw new Error(`AssertionError: components must have names`);
    }
    const scope = this.componentScopeReader.getScopeForComponent(component);
    if (scope === null) {
      return null;
    }
    const data = {
      directives: [],
      pipes: [],
      isPoisoned: scope.compilation.isPoisoned
    };
    const typeChecker = this.programDriver.getProgram().getTypeChecker();
    for (const dir of scope.compilation.directives) {
      if (dir.selector === null) {
        continue;
      }
      const tsSymbol = typeChecker.getSymbolAtLocation(dir.ref.node.name);
      if (!isSymbolWithValueDeclaration(tsSymbol)) {
        continue;
      }
      let ngModule = null;
      const moduleScopeOfDir = this.componentScopeReader.getScopeForComponent(dir.ref.node);
      if (moduleScopeOfDir !== null) {
        ngModule = moduleScopeOfDir.ngModule;
      }
      data.directives.push({
        isComponent: dir.isComponent,
        isStructural: dir.isStructural,
        selector: dir.selector,
        tsSymbol,
        ngModule
      });
    }
    for (const pipe of scope.compilation.pipes) {
      const tsSymbol = typeChecker.getSymbolAtLocation(pipe.ref.node.name);
      if (tsSymbol === void 0) {
        continue;
      }
      data.pipes.push({
        name: pipe.name,
        tsSymbol
      });
    }
    this.scopeCache.set(component, data);
    return data;
  }
};
function convertDiagnostic(diag, sourceResolver) {
  if (!shouldReportDiagnostic(diag)) {
    return null;
  }
  return translateDiagnostic(diag, sourceResolver);
}
var WholeProgramTypeCheckingHost = class {
  constructor(impl) {
    this.impl = impl;
  }
  getSourceManager(sfPath) {
    return this.impl.getFileData(sfPath).sourceManager;
  }
  shouldCheckComponent(node) {
    const sfPath = absoluteFromSourceFile(node.getSourceFile());
    const shimPath = TypeCheckShimGenerator.shimFor(sfPath);
    const fileData = this.impl.getFileData(sfPath);
    return !fileData.shimData.has(shimPath);
  }
  recordShimData(sfPath, data) {
    const fileData = this.impl.getFileData(sfPath);
    fileData.shimData.set(data.path, data);
    if (data.hasInlines) {
      fileData.hasInlines = true;
    }
  }
  recordComplete(sfPath) {
    this.impl.getFileData(sfPath).isComplete = true;
  }
};
var SingleFileTypeCheckingHost = class {
  constructor(sfPath, fileData, impl) {
    this.sfPath = sfPath;
    this.fileData = fileData;
    this.impl = impl;
    this.seenInlines = false;
  }
  assertPath(sfPath) {
    if (this.sfPath !== sfPath) {
      throw new Error(`AssertionError: querying TypeCheckingHost outside of assigned file`);
    }
  }
  getSourceManager(sfPath) {
    this.assertPath(sfPath);
    return this.fileData.sourceManager;
  }
  shouldCheckComponent(node) {
    if (this.sfPath !== absoluteFromSourceFile(node.getSourceFile())) {
      return false;
    }
    const shimPath = TypeCheckShimGenerator.shimFor(this.sfPath);
    return !this.fileData.shimData.has(shimPath);
  }
  recordShimData(sfPath, data) {
    this.assertPath(sfPath);
    if (data.hasInlines && !this.seenInlines) {
      this.impl.clearAllShimDataUsingInlines();
      this.seenInlines = true;
    }
    this.fileData.shimData.set(data.path, data);
    if (data.hasInlines) {
      this.fileData.hasInlines = true;
    }
  }
  recordComplete(sfPath) {
    this.assertPath(sfPath);
    this.fileData.isComplete = true;
  }
};
var SingleShimTypeCheckingHost = class extends SingleFileTypeCheckingHost {
  constructor(sfPath, fileData, impl, shimPath) {
    super(sfPath, fileData, impl);
    this.shimPath = shimPath;
  }
  shouldCheckNode(node) {
    if (this.sfPath !== absoluteFromSourceFile(node.getSourceFile())) {
      return false;
    }
    const shimPath = TypeCheckShimGenerator.shimFor(this.sfPath);
    if (shimPath !== this.shimPath) {
      return false;
    }
    return !this.fileData.shimData.has(shimPath);
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/extended/src/extended_template_checker.mjs
var ExtendedTemplateCheckerImpl = class {
  constructor(templateTypeChecker, typeChecker, templateChecks) {
    this.templateChecks = templateChecks;
    this.ctx = { templateTypeChecker, typeChecker };
  }
  getDiagnosticsForComponent(component) {
    const template = this.ctx.templateTypeChecker.getTemplate(component);
    if (template === null) {
      return [];
    }
    const diagnostics = [];
    for (const check of this.templateChecks) {
      diagnostics.push(...check.run(this.ctx, component, template));
    }
    return diagnostics;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/extended/checks/invalid_banana_in_box/index.mjs
import { TmplAstBoundEvent as TmplAstBoundEvent2 } from "@angular/compiler";
import ts70 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/extended/api/api.mjs
import { ASTWithSource as ASTWithSource4, RecursiveAstVisitor as RecursiveAstVisitor3 } from "@angular/compiler";
var TemplateCheckWithVisitor = class {
  run(ctx, component, template) {
    const visitor = new TemplateVisitor2(ctx, component, this);
    return visitor.getDiagnostics(template);
  }
};
var TemplateVisitor2 = class extends RecursiveAstVisitor3 {
  constructor(ctx, component, check) {
    super();
    this.ctx = ctx;
    this.component = component;
    this.check = check;
    this.diagnostics = [];
  }
  visit(node, context) {
    this.diagnostics.push(...this.check.visitNode(this.ctx, this.component, node));
    node.visit(this);
  }
  visitAllNodes(nodes) {
    for (const node of nodes) {
      this.visit(node);
    }
  }
  visitAst(ast) {
    if (ast instanceof ASTWithSource4) {
      ast = ast.ast;
    }
    this.visit(ast);
  }
  visitElement(element) {
    this.visitAllNodes(element.attributes);
    this.visitAllNodes(element.inputs);
    this.visitAllNodes(element.outputs);
    this.visitAllNodes(element.references);
    this.visitAllNodes(element.children);
  }
  visitTemplate(template) {
    this.visitAllNodes(template.attributes);
    if (template.tagName === "ng-template") {
      this.visitAllNodes(template.inputs);
      this.visitAllNodes(template.outputs);
      this.visitAllNodes(template.templateAttrs);
    }
    this.visitAllNodes(template.variables);
    this.visitAllNodes(template.references);
    this.visitAllNodes(template.children);
  }
  visitContent(content) {
  }
  visitVariable(variable) {
  }
  visitReference(reference) {
  }
  visitTextAttribute(attribute) {
  }
  visitBoundAttribute(attribute) {
    this.visitAst(attribute.value);
  }
  visitBoundEvent(attribute) {
    this.visitAst(attribute.handler);
  }
  visitText(text) {
  }
  visitBoundText(text) {
    this.visitAst(text.value);
  }
  visitIcu(icu) {
  }
  getDiagnostics(template) {
    this.diagnostics = [];
    this.visitAllNodes(template);
    return this.diagnostics;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/extended/checks/invalid_banana_in_box/index.mjs
var InvalidBananaInBoxCheck = class extends TemplateCheckWithVisitor {
  constructor() {
    super(...arguments);
    this.code = ErrorCode.INVALID_BANANA_IN_BOX;
  }
  visitNode(ctx, component, node) {
    if (!(node instanceof TmplAstBoundEvent2))
      return [];
    const name = node.name;
    if (!name.startsWith("[") || !name.endsWith("]"))
      return [];
    const boundSyntax = node.sourceSpan.toString();
    const expectedBoundSyntax = boundSyntax.replace(`(${name})`, `[(${name.slice(1, -1)})]`);
    const diagnostic = ctx.templateTypeChecker.makeTemplateDiagnostic(component, node.sourceSpan, ts70.DiagnosticCategory.Warning, ErrorCode.INVALID_BANANA_IN_BOX, `In the two-way binding syntax the parentheses should be inside the brackets, ex. '${expectedBoundSyntax}'.
        Find more at https://angular.io/guide/two-way-binding`);
    return [diagnostic];
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/extended/checks/nullish_coalescing_not_nullable/index.mjs
import { Binary } from "@angular/compiler";
import ts71 from "typescript";
var NullishCoalescingNotNullableCheck = class extends TemplateCheckWithVisitor {
  constructor() {
    super(...arguments);
    this.code = ErrorCode.NULLISH_COALESCING_NOT_NULLABLE;
  }
  visitNode(ctx, component, node) {
    if (!(node instanceof Binary) || node.operation !== "??")
      return [];
    const symbolLeft = ctx.templateTypeChecker.getSymbolOfNode(node.left, component);
    if (symbolLeft === null || symbolLeft.kind !== SymbolKind.Expression) {
      return [];
    }
    const typeLeft = symbolLeft.tsType;
    if (typeLeft.getNonNullableType() !== typeLeft)
      return [];
    const symbol = ctx.templateTypeChecker.getSymbolOfNode(node, component);
    if (symbol.kind !== SymbolKind.Expression) {
      return [];
    }
    const span = ctx.templateTypeChecker.getTemplateMappingAtShimLocation(symbol.shimLocation).span;
    const diagnostic = ctx.templateTypeChecker.makeTemplateDiagnostic(component, span, ts71.DiagnosticCategory.Warning, ErrorCode.NULLISH_COALESCING_NOT_NULLABLE, `The left side of this nullish coalescing operation does not include 'null' or 'undefined' in its type, therefore the '??' operator can be safely removed.`);
    return [diagnostic];
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/core/src/compiler.mjs
var CompilationTicketKind;
(function(CompilationTicketKind2) {
  CompilationTicketKind2[CompilationTicketKind2["Fresh"] = 0] = "Fresh";
  CompilationTicketKind2[CompilationTicketKind2["IncrementalTypeScript"] = 1] = "IncrementalTypeScript";
  CompilationTicketKind2[CompilationTicketKind2["IncrementalResource"] = 2] = "IncrementalResource";
})(CompilationTicketKind || (CompilationTicketKind = {}));
function freshCompilationTicket(tsProgram, options, incrementalBuildStrategy, programDriver, perfRecorder, enableTemplateTypeChecker, usePoisonedData) {
  return {
    kind: CompilationTicketKind.Fresh,
    tsProgram,
    options,
    incrementalBuildStrategy,
    programDriver,
    enableTemplateTypeChecker,
    usePoisonedData,
    perfRecorder: perfRecorder != null ? perfRecorder : ActivePerfRecorder.zeroedToNow()
  };
}
function incrementalFromCompilerTicket(oldCompiler, newProgram, incrementalBuildStrategy, programDriver, modifiedResourceFiles, perfRecorder) {
  const oldProgram = oldCompiler.getCurrentProgram();
  const oldState = oldCompiler.incrementalStrategy.getIncrementalState(oldProgram);
  if (oldState === null) {
    return freshCompilationTicket(newProgram, oldCompiler.options, incrementalBuildStrategy, programDriver, perfRecorder, oldCompiler.enableTemplateTypeChecker, oldCompiler.usePoisonedData);
  }
  if (perfRecorder === null) {
    perfRecorder = ActivePerfRecorder.zeroedToNow();
  }
  const incrementalCompilation = IncrementalCompilation.incremental(newProgram, versionMapFromProgram(newProgram, programDriver), oldProgram, oldState, modifiedResourceFiles, perfRecorder);
  return {
    kind: CompilationTicketKind.IncrementalTypeScript,
    enableTemplateTypeChecker: oldCompiler.enableTemplateTypeChecker,
    usePoisonedData: oldCompiler.usePoisonedData,
    options: oldCompiler.options,
    incrementalBuildStrategy,
    incrementalCompilation,
    programDriver,
    newProgram,
    perfRecorder
  };
}
var NgCompiler = class {
  constructor(adapter, options, inputProgram, programDriver, incrementalStrategy, incrementalCompilation, enableTemplateTypeChecker, usePoisonedData, livePerfRecorder) {
    this.adapter = adapter;
    this.options = options;
    this.inputProgram = inputProgram;
    this.programDriver = programDriver;
    this.incrementalStrategy = incrementalStrategy;
    this.incrementalCompilation = incrementalCompilation;
    this.enableTemplateTypeChecker = enableTemplateTypeChecker;
    this.usePoisonedData = usePoisonedData;
    this.livePerfRecorder = livePerfRecorder;
    this.compilation = null;
    this.constructionDiagnostics = [];
    this.nonTemplateDiagnostics = null;
    this.delegatingPerfRecorder = new DelegatingPerfRecorder(this.perfRecorder);
    if (this.options._extendedTemplateDiagnostics === true && this.options.strictTemplates === false) {
      throw new Error("The '_extendedTemplateDiagnostics' option requires 'strictTemplates' to also be enabled.");
    }
    this.constructionDiagnostics.push(...this.adapter.constructionDiagnostics);
    const incompatibleTypeCheckOptionsDiagnostic = verifyCompatibleTypeCheckOptions(this.options);
    if (incompatibleTypeCheckOptionsDiagnostic !== null) {
      this.constructionDiagnostics.push(incompatibleTypeCheckOptionsDiagnostic);
    }
    this.currentProgram = inputProgram;
    this.closureCompilerEnabled = !!this.options.annotateForClosureCompiler;
    this.entryPoint = adapter.entryPoint !== null ? getSourceFileOrNull(inputProgram, adapter.entryPoint) : null;
    const moduleResolutionCache = ts72.createModuleResolutionCache(this.adapter.getCurrentDirectory(), this.adapter.getCanonicalFileName.bind(this.adapter));
    this.moduleResolver = new ModuleResolver(inputProgram, this.options, this.adapter, moduleResolutionCache);
    this.resourceManager = new AdapterResourceLoader(adapter, this.options);
    this.cycleAnalyzer = new CycleAnalyzer(new ImportGraph(inputProgram.getTypeChecker(), this.delegatingPerfRecorder));
    this.incrementalStrategy.setIncrementalState(this.incrementalCompilation.state, inputProgram);
    this.ignoreForDiagnostics = new Set(inputProgram.getSourceFiles().filter((sf) => this.adapter.isShim(sf)));
    this.ignoreForEmit = this.adapter.ignoreForEmit;
    let dtsFileCount = 0;
    let nonDtsFileCount = 0;
    for (const sf of inputProgram.getSourceFiles()) {
      if (sf.isDeclarationFile) {
        dtsFileCount++;
      } else {
        nonDtsFileCount++;
      }
    }
    livePerfRecorder.eventCount(PerfEvent.InputDtsFile, dtsFileCount);
    livePerfRecorder.eventCount(PerfEvent.InputTsFile, nonDtsFileCount);
  }
  static fromTicket(ticket, adapter) {
    switch (ticket.kind) {
      case CompilationTicketKind.Fresh:
        return new NgCompiler(adapter, ticket.options, ticket.tsProgram, ticket.programDriver, ticket.incrementalBuildStrategy, IncrementalCompilation.fresh(ticket.tsProgram, versionMapFromProgram(ticket.tsProgram, ticket.programDriver)), ticket.enableTemplateTypeChecker, ticket.usePoisonedData, ticket.perfRecorder);
      case CompilationTicketKind.IncrementalTypeScript:
        return new NgCompiler(adapter, ticket.options, ticket.newProgram, ticket.programDriver, ticket.incrementalBuildStrategy, ticket.incrementalCompilation, ticket.enableTemplateTypeChecker, ticket.usePoisonedData, ticket.perfRecorder);
      case CompilationTicketKind.IncrementalResource:
        const compiler = ticket.compiler;
        compiler.updateWithChangedResources(ticket.modifiedResourceFiles, ticket.perfRecorder);
        return compiler;
    }
  }
  get perfRecorder() {
    return this.livePerfRecorder;
  }
  get incrementalDriver() {
    return this.incrementalCompilation;
  }
  updateWithChangedResources(changedResources, perfRecorder) {
    this.livePerfRecorder = perfRecorder;
    this.delegatingPerfRecorder.target = perfRecorder;
    perfRecorder.inPhase(PerfPhase.ResourceUpdate, () => {
      if (this.compilation === null) {
        return;
      }
      this.resourceManager.invalidate();
      const classesToUpdate = new Set();
      for (const resourceFile of changedResources) {
        for (const templateClass of this.getComponentsWithTemplateFile(resourceFile)) {
          classesToUpdate.add(templateClass);
        }
        for (const styleClass of this.getComponentsWithStyleFile(resourceFile)) {
          classesToUpdate.add(styleClass);
        }
      }
      for (const clazz of classesToUpdate) {
        this.compilation.traitCompiler.updateResources(clazz);
        if (!ts72.isClassDeclaration(clazz)) {
          continue;
        }
        this.compilation.templateTypeChecker.invalidateClass(clazz);
      }
    });
  }
  getResourceDependencies(file) {
    this.ensureAnalyzed();
    return this.incrementalCompilation.depGraph.getResourceDependencies(file);
  }
  getDiagnostics() {
    const diagnostics = [];
    diagnostics.push(...this.getNonTemplateDiagnostics(), ...this.getTemplateDiagnostics());
    if (this.options._extendedTemplateDiagnostics) {
      diagnostics.push(...this.getExtendedTemplateDiagnostics());
    }
    return this.addMessageTextDetails(diagnostics);
  }
  getDiagnosticsForFile(file, optimizeFor) {
    const diagnostics = [];
    diagnostics.push(...this.getNonTemplateDiagnostics().filter((diag) => diag.file === file), ...this.getTemplateDiagnosticsForFile(file, optimizeFor));
    if (this.options._extendedTemplateDiagnostics) {
      diagnostics.push(...this.getExtendedTemplateDiagnostics(file));
    }
    return this.addMessageTextDetails(diagnostics);
  }
  getDiagnosticsForComponent(component) {
    const compilation = this.ensureAnalyzed();
    const ttc = compilation.templateTypeChecker;
    const diagnostics = [];
    diagnostics.push(...ttc.getDiagnosticsForComponent(component));
    if (this.options._extendedTemplateDiagnostics) {
      const extendedTemplateChecker = compilation.extendedTemplateChecker;
      diagnostics.push(...extendedTemplateChecker.getDiagnosticsForComponent(component));
    }
    return this.addMessageTextDetails(diagnostics);
  }
  addMessageTextDetails(diagnostics) {
    return diagnostics.map((diag) => {
      if (diag.code && COMPILER_ERRORS_WITH_GUIDES.has(ngErrorCode(diag.code))) {
        return __spreadProps(__spreadValues({}, diag), {
          messageText: diag.messageText + `. Find more at ${ERROR_DETAILS_PAGE_BASE_URL}/NG${ngErrorCode(diag.code)}`
        });
      }
      return diag;
    });
  }
  getOptionDiagnostics() {
    return this.constructionDiagnostics;
  }
  getCurrentProgram() {
    return this.currentProgram;
  }
  getTemplateTypeChecker() {
    if (!this.enableTemplateTypeChecker) {
      throw new Error("The `TemplateTypeChecker` does not work without `enableTemplateTypeChecker`.");
    }
    return this.ensureAnalyzed().templateTypeChecker;
  }
  getComponentsWithTemplateFile(templateFilePath) {
    const { resourceRegistry } = this.ensureAnalyzed();
    return resourceRegistry.getComponentsWithTemplate(resolve(templateFilePath));
  }
  getComponentsWithStyleFile(styleFilePath) {
    const { resourceRegistry } = this.ensureAnalyzed();
    return resourceRegistry.getComponentsWithStyle(resolve(styleFilePath));
  }
  getComponentResources(classDecl) {
    if (!isNamedClassDeclaration(classDecl)) {
      return null;
    }
    const { resourceRegistry } = this.ensureAnalyzed();
    const styles = resourceRegistry.getStyles(classDecl);
    const template = resourceRegistry.getTemplate(classDecl);
    if (template === null) {
      return null;
    }
    return { styles, template };
  }
  getMeta(classDecl) {
    var _a;
    if (!isNamedClassDeclaration(classDecl)) {
      return null;
    }
    const ref = new Reference(classDecl);
    const { metaReader } = this.ensureAnalyzed();
    const meta = (_a = metaReader.getPipeMetadata(ref)) != null ? _a : metaReader.getDirectiveMetadata(ref);
    if (meta === null) {
      return null;
    }
    return meta;
  }
  async analyzeAsync() {
    if (this.compilation !== null) {
      return;
    }
    await this.perfRecorder.inPhase(PerfPhase.Analysis, async () => {
      this.compilation = this.makeCompilation();
      const promises = [];
      for (const sf of this.inputProgram.getSourceFiles()) {
        if (sf.isDeclarationFile) {
          continue;
        }
        let analysisPromise = this.compilation.traitCompiler.analyzeAsync(sf);
        if (analysisPromise !== void 0) {
          promises.push(analysisPromise);
        }
      }
      await Promise.all(promises);
      this.perfRecorder.memory(PerfCheckpoint.Analysis);
      this.resolveCompilation(this.compilation.traitCompiler);
    });
  }
  prepareEmit() {
    const compilation = this.ensureAnalyzed();
    const coreImportsFrom = compilation.isCore ? getR3SymbolsFile(this.inputProgram) : null;
    let importRewriter;
    if (coreImportsFrom !== null) {
      importRewriter = new R3SymbolsImportRewriter(coreImportsFrom.fileName);
    } else {
      importRewriter = new NoopImportRewriter();
    }
    const defaultImportTracker = new DefaultImportTracker();
    const before = [
      ivyTransformFactory(compilation.traitCompiler, compilation.reflector, importRewriter, defaultImportTracker, this.delegatingPerfRecorder, compilation.isCore, this.closureCompilerEnabled),
      aliasTransformFactory(compilation.traitCompiler.exportStatements),
      defaultImportTracker.importPreservingTransformer()
    ];
    const afterDeclarations = [];
    if (compilation.dtsTransforms !== null) {
      afterDeclarations.push(declarationTransformFactory(compilation.dtsTransforms, importRewriter));
    }
    if (compilation.aliasingHost !== null && compilation.aliasingHost.aliasExportsInDts) {
      afterDeclarations.push(aliasTransformFactory(compilation.traitCompiler.exportStatements));
    }
    if (this.adapter.factoryTracker !== null) {
      before.push(generatedFactoryTransform(this.adapter.factoryTracker.sourceInfo, importRewriter));
    }
    return { transformers: { before, afterDeclarations } };
  }
  getIndexedComponents() {
    const compilation = this.ensureAnalyzed();
    const context = new IndexingContext();
    compilation.traitCompiler.index(context);
    return generateAnalysis(context);
  }
  xi18n(ctx) {
    const compilation = this.ensureAnalyzed();
    compilation.traitCompiler.xi18n(ctx);
  }
  ensureAnalyzed() {
    if (this.compilation === null) {
      this.analyzeSync();
    }
    return this.compilation;
  }
  analyzeSync() {
    this.perfRecorder.inPhase(PerfPhase.Analysis, () => {
      this.compilation = this.makeCompilation();
      for (const sf of this.inputProgram.getSourceFiles()) {
        if (sf.isDeclarationFile) {
          continue;
        }
        this.compilation.traitCompiler.analyzeSync(sf);
      }
      this.perfRecorder.memory(PerfCheckpoint.Analysis);
      this.resolveCompilation(this.compilation.traitCompiler);
    });
  }
  resolveCompilation(traitCompiler) {
    this.perfRecorder.inPhase(PerfPhase.Resolve, () => {
      traitCompiler.resolve();
      this.incrementalCompilation.recordSuccessfulAnalysis(traitCompiler);
      this.perfRecorder.memory(PerfCheckpoint.Resolve);
    });
  }
  get fullTemplateTypeCheck() {
    const strictTemplates = !!this.options.strictTemplates;
    return strictTemplates || !!this.options.fullTemplateTypeCheck;
  }
  getTypeCheckingConfig() {
    const strictTemplates = !!this.options.strictTemplates;
    const useInlineTypeConstructors = this.programDriver.supportsInlineOperations;
    let typeCheckingConfig;
    if (this.fullTemplateTypeCheck) {
      typeCheckingConfig = {
        applyTemplateContextGuards: strictTemplates,
        checkQueries: false,
        checkTemplateBodies: true,
        alwaysCheckSchemaInTemplateBodies: true,
        checkTypeOfInputBindings: strictTemplates,
        honorAccessModifiersForInputBindings: false,
        strictNullInputBindings: strictTemplates,
        checkTypeOfAttributes: strictTemplates,
        checkTypeOfDomBindings: false,
        checkTypeOfOutputEvents: strictTemplates,
        checkTypeOfAnimationEvents: strictTemplates,
        checkTypeOfDomEvents: strictTemplates,
        checkTypeOfDomReferences: strictTemplates,
        checkTypeOfNonDomReferences: true,
        checkTypeOfPipes: true,
        strictSafeNavigationTypes: strictTemplates,
        useContextGenericType: strictTemplates,
        strictLiteralTypes: true,
        enableTemplateTypeChecker: this.enableTemplateTypeChecker,
        useInlineTypeConstructors,
        suggestionsForSuboptimalTypeInference: this.enableTemplateTypeChecker && !strictTemplates
      };
    } else {
      typeCheckingConfig = {
        applyTemplateContextGuards: false,
        checkQueries: false,
        checkTemplateBodies: false,
        alwaysCheckSchemaInTemplateBodies: this.closureCompilerEnabled,
        checkTypeOfInputBindings: false,
        strictNullInputBindings: false,
        honorAccessModifiersForInputBindings: false,
        checkTypeOfAttributes: false,
        checkTypeOfDomBindings: false,
        checkTypeOfOutputEvents: false,
        checkTypeOfAnimationEvents: false,
        checkTypeOfDomEvents: false,
        checkTypeOfDomReferences: false,
        checkTypeOfNonDomReferences: false,
        checkTypeOfPipes: false,
        strictSafeNavigationTypes: false,
        useContextGenericType: false,
        strictLiteralTypes: false,
        enableTemplateTypeChecker: this.enableTemplateTypeChecker,
        useInlineTypeConstructors,
        suggestionsForSuboptimalTypeInference: false
      };
    }
    if (this.options.strictInputTypes !== void 0) {
      typeCheckingConfig.checkTypeOfInputBindings = this.options.strictInputTypes;
      typeCheckingConfig.applyTemplateContextGuards = this.options.strictInputTypes;
    }
    if (this.options.strictInputAccessModifiers !== void 0) {
      typeCheckingConfig.honorAccessModifiersForInputBindings = this.options.strictInputAccessModifiers;
    }
    if (this.options.strictNullInputTypes !== void 0) {
      typeCheckingConfig.strictNullInputBindings = this.options.strictNullInputTypes;
    }
    if (this.options.strictOutputEventTypes !== void 0) {
      typeCheckingConfig.checkTypeOfOutputEvents = this.options.strictOutputEventTypes;
      typeCheckingConfig.checkTypeOfAnimationEvents = this.options.strictOutputEventTypes;
    }
    if (this.options.strictDomEventTypes !== void 0) {
      typeCheckingConfig.checkTypeOfDomEvents = this.options.strictDomEventTypes;
    }
    if (this.options.strictSafeNavigationTypes !== void 0) {
      typeCheckingConfig.strictSafeNavigationTypes = this.options.strictSafeNavigationTypes;
    }
    if (this.options.strictDomLocalRefTypes !== void 0) {
      typeCheckingConfig.checkTypeOfDomReferences = this.options.strictDomLocalRefTypes;
    }
    if (this.options.strictAttributeTypes !== void 0) {
      typeCheckingConfig.checkTypeOfAttributes = this.options.strictAttributeTypes;
    }
    if (this.options.strictContextGenerics !== void 0) {
      typeCheckingConfig.useContextGenericType = this.options.strictContextGenerics;
    }
    if (this.options.strictLiteralTypes !== void 0) {
      typeCheckingConfig.strictLiteralTypes = this.options.strictLiteralTypes;
    }
    return typeCheckingConfig;
  }
  getTemplateDiagnostics() {
    const compilation = this.ensureAnalyzed();
    const diagnostics = [];
    for (const sf of this.inputProgram.getSourceFiles()) {
      if (sf.isDeclarationFile || this.adapter.isShim(sf)) {
        continue;
      }
      diagnostics.push(...compilation.templateTypeChecker.getDiagnosticsForFile(sf, OptimizeFor.WholeProgram));
    }
    const program = this.programDriver.getProgram();
    this.incrementalStrategy.setIncrementalState(this.incrementalCompilation.state, program);
    this.currentProgram = program;
    return diagnostics;
  }
  getTemplateDiagnosticsForFile(sf, optimizeFor) {
    const compilation = this.ensureAnalyzed();
    const diagnostics = [];
    if (!sf.isDeclarationFile && !this.adapter.isShim(sf)) {
      diagnostics.push(...compilation.templateTypeChecker.getDiagnosticsForFile(sf, optimizeFor));
    }
    const program = this.programDriver.getProgram();
    this.incrementalStrategy.setIncrementalState(this.incrementalCompilation.state, program);
    this.currentProgram = program;
    return diagnostics;
  }
  getNonTemplateDiagnostics() {
    if (this.nonTemplateDiagnostics === null) {
      const compilation = this.ensureAnalyzed();
      this.nonTemplateDiagnostics = [...compilation.traitCompiler.diagnostics];
      if (this.entryPoint !== null && compilation.exportReferenceGraph !== null) {
        this.nonTemplateDiagnostics.push(...checkForPrivateExports(this.entryPoint, this.inputProgram.getTypeChecker(), compilation.exportReferenceGraph));
      }
    }
    return this.nonTemplateDiagnostics;
  }
  getExtendedTemplateDiagnostics(sf) {
    const diagnostics = [];
    const compilation = this.ensureAnalyzed();
    const extendedTemplateChecker = compilation.extendedTemplateChecker;
    if (sf !== void 0) {
      return compilation.traitCompiler.extendedTemplateCheck(sf, extendedTemplateChecker);
    }
    for (const sf2 of this.inputProgram.getSourceFiles()) {
      diagnostics.push(...compilation.traitCompiler.extendedTemplateCheck(sf2, extendedTemplateChecker));
    }
    return diagnostics;
  }
  makeCompilation() {
    const checker = this.inputProgram.getTypeChecker();
    const reflector = new TypeScriptReflectionHost(checker);
    let refEmitter;
    let aliasingHost = null;
    if (this.adapter.unifiedModulesHost === null || !this.options._useHostForImportGeneration) {
      let localImportStrategy;
      if (this.options.rootDir !== void 0 || this.options.rootDirs !== void 0 && this.options.rootDirs.length > 0) {
        localImportStrategy = new LogicalProjectStrategy(reflector, new LogicalFileSystem([...this.adapter.rootDirs], this.adapter));
      } else {
        localImportStrategy = new RelativePathStrategy(reflector);
      }
      refEmitter = new ReferenceEmitter([
        new LocalIdentifierStrategy(),
        new AbsoluteModuleStrategy(this.inputProgram, checker, this.moduleResolver, reflector),
        localImportStrategy
      ]);
      if (this.entryPoint === null && this.options.generateDeepReexports === true) {
        aliasingHost = new PrivateExportAliasingHost(reflector);
      }
    } else {
      refEmitter = new ReferenceEmitter([
        new LocalIdentifierStrategy(),
        new AliasStrategy(),
        new UnifiedModulesStrategy(reflector, this.adapter.unifiedModulesHost)
      ]);
      aliasingHost = new UnifiedModulesAliasingHost(this.adapter.unifiedModulesHost);
    }
    const evaluator = new PartialEvaluator(reflector, checker, this.incrementalCompilation.depGraph);
    const dtsReader = new DtsMetadataReader(checker, reflector);
    const localMetaRegistry = new LocalMetadataRegistry();
    const localMetaReader = localMetaRegistry;
    const depScopeReader = new MetadataDtsModuleScopeResolver(dtsReader, aliasingHost);
    const scopeRegistry = new LocalModuleScopeRegistry(localMetaReader, depScopeReader, refEmitter, aliasingHost);
    const scopeReader = scopeRegistry;
    const semanticDepGraphUpdater = this.incrementalCompilation.semanticDepGraphUpdater;
    const metaRegistry = new CompoundMetadataRegistry([localMetaRegistry, scopeRegistry]);
    const injectableRegistry = new InjectableClassRegistry(reflector);
    const metaReader = new CompoundMetadataReader([localMetaReader, dtsReader]);
    const typeCheckScopeRegistry = new TypeCheckScopeRegistry(scopeReader, metaReader);
    let referencesRegistry;
    let exportReferenceGraph = null;
    if (this.entryPoint !== null) {
      exportReferenceGraph = new ReferenceGraph();
      referencesRegistry = new ReferenceGraphAdapter(exportReferenceGraph);
    } else {
      referencesRegistry = new NoopReferencesRegistry();
    }
    const dtsTransforms = new DtsTransformRegistry();
    const isCore = isAngularCorePackage(this.inputProgram);
    const resourceRegistry = new ResourceRegistry();
    const compilationMode = this.options.compilationMode === "partial" && !isCore ? CompilationMode.PARTIAL : CompilationMode.FULL;
    const cycleHandlingStrategy = compilationMode === CompilationMode.FULL ? 0 : 1;
    const handlers = [
      new ComponentDecoratorHandler(reflector, evaluator, metaRegistry, metaReader, scopeReader, scopeRegistry, typeCheckScopeRegistry, resourceRegistry, isCore, this.resourceManager, this.adapter.rootDirs, this.options.preserveWhitespaces || false, this.options.i18nUseExternalIds !== false, this.options.enableI18nLegacyMessageIdFormat !== false, this.usePoisonedData, this.options.i18nNormalizeLineEndingsInICUs, this.moduleResolver, this.cycleAnalyzer, cycleHandlingStrategy, refEmitter, this.incrementalCompilation.depGraph, injectableRegistry, semanticDepGraphUpdater, this.closureCompilerEnabled, this.delegatingPerfRecorder),
      new DirectiveDecoratorHandler(reflector, evaluator, metaRegistry, scopeRegistry, metaReader, injectableRegistry, isCore, semanticDepGraphUpdater, this.closureCompilerEnabled, false, this.delegatingPerfRecorder),
      new PipeDecoratorHandler(reflector, evaluator, metaRegistry, scopeRegistry, injectableRegistry, isCore, this.delegatingPerfRecorder),
      new InjectableDecoratorHandler(reflector, isCore, this.options.strictInjectionParameters || false, injectableRegistry, this.delegatingPerfRecorder),
      new NgModuleDecoratorHandler(reflector, evaluator, metaReader, metaRegistry, scopeRegistry, referencesRegistry, isCore, refEmitter, this.adapter.factoryTracker, this.closureCompilerEnabled, injectableRegistry, this.delegatingPerfRecorder)
    ];
    const traitCompiler = new TraitCompiler(handlers, reflector, this.delegatingPerfRecorder, this.incrementalCompilation, this.options.compileNonExportedClasses !== false, compilationMode, dtsTransforms, semanticDepGraphUpdater);
    const notifyingDriver = new NotifyingProgramDriverWrapper(this.programDriver, (program) => {
      this.incrementalStrategy.setIncrementalState(this.incrementalCompilation.state, program);
      this.currentProgram = program;
    });
    const templateTypeChecker = new TemplateTypeCheckerImpl(this.inputProgram, notifyingDriver, traitCompiler, this.getTypeCheckingConfig(), refEmitter, reflector, this.adapter, this.incrementalCompilation, scopeRegistry, typeCheckScopeRegistry, this.delegatingPerfRecorder);
    const templateChecks = [new InvalidBananaInBoxCheck()];
    if (this.options.strictNullChecks) {
      templateChecks.push(new NullishCoalescingNotNullableCheck());
    }
    const extendedTemplateChecker = new ExtendedTemplateCheckerImpl(templateTypeChecker, checker, templateChecks);
    return {
      isCore,
      traitCompiler,
      reflector,
      scopeRegistry,
      dtsTransforms,
      exportReferenceGraph,
      metaReader,
      typeCheckScopeRegistry,
      aliasingHost,
      refEmitter,
      templateTypeChecker,
      resourceRegistry,
      extendedTemplateChecker
    };
  }
};
function isAngularCorePackage(program) {
  const r3Symbols = getR3SymbolsFile(program);
  if (r3Symbols === null) {
    return false;
  }
  return r3Symbols.statements.some((stmt) => {
    if (!ts72.isVariableStatement(stmt)) {
      return false;
    }
    if (stmt.modifiers === void 0 || !stmt.modifiers.some((mod) => mod.kind === ts72.SyntaxKind.ExportKeyword)) {
      return false;
    }
    return stmt.declarationList.declarations.some((decl) => {
      if (!ts72.isIdentifier(decl.name) || decl.name.text !== "ITS_JUST_ANGULAR") {
        return false;
      }
      if (decl.initializer === void 0 || decl.initializer.kind !== ts72.SyntaxKind.TrueKeyword) {
        return false;
      }
      return true;
    });
  });
}
function getR3SymbolsFile(program) {
  return program.getSourceFiles().find((file) => file.fileName.indexOf("r3_symbols.ts") >= 0) || null;
}
function verifyCompatibleTypeCheckOptions(options) {
  if (options.fullTemplateTypeCheck === false && options.strictTemplates === true) {
    return {
      category: ts72.DiagnosticCategory.Error,
      code: ngErrorCode(ErrorCode.CONFIG_STRICT_TEMPLATES_IMPLIES_FULL_TEMPLATE_TYPECHECK),
      file: void 0,
      start: void 0,
      length: void 0,
      messageText: `Angular compiler option "strictTemplates" is enabled, however "fullTemplateTypeCheck" is disabled.

Having the "strictTemplates" flag enabled implies that "fullTemplateTypeCheck" is also enabled, so
the latter can not be explicitly disabled.

One of the following actions is required:
1. Remove the "fullTemplateTypeCheck" option.
2. Remove "strictTemplates" or set it to 'false'.

More information about the template type checking compiler options can be found in the documentation:
https://v9.angular.io/guide/template-typecheck#template-type-checking`
    };
  }
  return null;
}
var ReferenceGraphAdapter = class {
  constructor(graph) {
    this.graph = graph;
  }
  add(source, ...references) {
    for (const { node } of references) {
      let sourceFile = node.getSourceFile();
      if (sourceFile === void 0) {
        sourceFile = ts72.getOriginalNode(node).getSourceFile();
      }
      if (sourceFile === void 0 || !isDtsPath(sourceFile.fileName)) {
        this.graph.add(source, node);
      }
    }
  }
};
var NotifyingProgramDriverWrapper = class {
  constructor(delegate, notifyNewProgram) {
    var _a;
    this.delegate = delegate;
    this.notifyNewProgram = notifyNewProgram;
    this.getSourceFileVersion = (_a = this.delegate.getSourceFileVersion) == null ? void 0 : _a.bind(this);
  }
  get supportsInlineOperations() {
    return this.delegate.supportsInlineOperations;
  }
  getProgram() {
    return this.delegate.getProgram();
  }
  updateFiles(contents, updateMode) {
    this.delegate.updateFiles(contents, updateMode);
    this.notifyNewProgram(this.delegate.getProgram());
  }
};
function versionMapFromProgram(program, driver) {
  if (driver.getSourceFileVersion === void 0) {
    return null;
  }
  const versions = new Map();
  for (const possiblyRedirectedSourceFile of program.getSourceFiles()) {
    const sf = toUnredirectedSourceFile(possiblyRedirectedSourceFile);
    versions.set(absoluteFromSourceFile(sf), driver.getSourceFileVersion(sf));
  }
  return versions;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/program.mjs
import { HtmlParser, MessageBundle } from "@angular/compiler";
import ts75 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/i18n.mjs
import { Xliff, Xliff2, Xmb } from "@angular/compiler";
import {
  relative as relative5,
  resolve as resolve4,
  sep as sep2
} from "path";
function i18nGetExtension(formatName) {
  const format = formatName.toLowerCase();
  switch (format) {
    case "xmb":
      return "xmb";
    case "xlf":
    case "xlif":
    case "xliff":
    case "xlf2":
    case "xliff2":
      return "xlf";
  }
  throw new Error(`Unsupported format "${formatName}"`);
}
function i18nExtract(formatName, outFile, host, options, bundle, pathResolve = resolve4) {
  formatName = formatName || "xlf";
  const ext = i18nGetExtension(formatName);
  const content = i18nSerialize(bundle, formatName, options);
  const dstFile = outFile || `messages.${ext}`;
  const dstPath = pathResolve(options.outDir || options.basePath, dstFile);
  host.writeFile(dstPath, content, false, void 0, []);
  return [dstPath];
}
function i18nSerialize(bundle, formatName, options) {
  const format = formatName.toLowerCase();
  let serializer;
  switch (format) {
    case "xmb":
      serializer = new Xmb();
      break;
    case "xliff2":
    case "xlf2":
      serializer = new Xliff2();
      break;
    case "xlf":
    case "xliff":
    default:
      serializer = new Xliff();
  }
  return bundle.write(serializer, getPathNormalizer(options.basePath));
}
function getPathNormalizer(basePath) {
  return (sourcePath) => {
    sourcePath = basePath ? relative5(basePath, sourcePath) : sourcePath;
    return sourcePath.split(sep2).join("/");
  };
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/typescript_support.mjs
import ts73 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/diagnostics/typescript_version.mjs
function toNumbers(value) {
  const suffixIndex = value.lastIndexOf("-");
  return value.slice(0, suffixIndex === -1 ? value.length : suffixIndex).split(".").map((segment) => {
    const parsed = parseInt(segment, 10);
    if (isNaN(parsed)) {
      throw Error(`Unable to parse version string ${value}.`);
    }
    return parsed;
  });
}
function compareNumbers(a, b) {
  const max = Math.max(a.length, b.length);
  const min = Math.min(a.length, b.length);
  for (let i = 0; i < min; i++) {
    if (a[i] > b[i])
      return 1;
    if (a[i] < b[i])
      return -1;
  }
  if (min !== max) {
    const longestArray = a.length === max ? a : b;
    const comparisonResult = a.length === max ? 1 : -1;
    for (let i = min; i < max; i++) {
      if (longestArray[i] > 0) {
        return comparisonResult;
      }
    }
  }
  return 0;
}
function compareVersions(v1, v2) {
  return compareNumbers(toNumbers(v1), toNumbers(v2));
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/typescript_support.mjs
var MIN_TS_VERSION = "4.4.2";
var MAX_TS_VERSION = "4.5.0";
var tsVersion = ts73.version;
function checkVersion(version, minVersion, maxVersion) {
  if (compareVersions(version, minVersion) < 0 || compareVersions(version, maxVersion) >= 0) {
    throw new Error(`The Angular Compiler requires TypeScript >=${minVersion} and <${maxVersion} but ${version} was found instead.`);
  }
}
function verifySupportedTypeScriptVersion() {
  checkVersion(tsVersion, MIN_TS_VERSION, MAX_TS_VERSION);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/core/src/host.mjs
import ts74 from "typescript";
var DelegatingCompilerHost2 = class {
  constructor(delegate) {
    this.delegate = delegate;
    this.createHash = this.delegateMethod("createHash");
    this.directoryExists = this.delegateMethod("directoryExists");
    this.fileNameToModuleName = this.delegateMethod("fileNameToModuleName");
    this.getCancellationToken = this.delegateMethod("getCancellationToken");
    this.getCanonicalFileName = this.delegateMethod("getCanonicalFileName");
    this.getCurrentDirectory = this.delegateMethod("getCurrentDirectory");
    this.getDefaultLibFileName = this.delegateMethod("getDefaultLibFileName");
    this.getDefaultLibLocation = this.delegateMethod("getDefaultLibLocation");
    this.getDirectories = this.delegateMethod("getDirectories");
    this.getEnvironmentVariable = this.delegateMethod("getEnvironmentVariable");
    this.getModifiedResourceFiles = this.delegateMethod("getModifiedResourceFiles");
    this.getNewLine = this.delegateMethod("getNewLine");
    this.getParsedCommandLine = this.delegateMethod("getParsedCommandLine");
    this.getSourceFileByPath = this.delegateMethod("getSourceFileByPath");
    this.readDirectory = this.delegateMethod("readDirectory");
    this.readFile = this.delegateMethod("readFile");
    this.readResource = this.delegateMethod("readResource");
    this.transformResource = this.delegateMethod("transformResource");
    this.realpath = this.delegateMethod("realpath");
    this.resolveModuleNames = this.delegateMethod("resolveModuleNames");
    this.resolveTypeReferenceDirectives = this.delegateMethod("resolveTypeReferenceDirectives");
    this.resourceNameToFileName = this.delegateMethod("resourceNameToFileName");
    this.trace = this.delegateMethod("trace");
    this.useCaseSensitiveFileNames = this.delegateMethod("useCaseSensitiveFileNames");
    this.writeFile = this.delegateMethod("writeFile");
  }
  delegateMethod(name) {
    return this.delegate[name] !== void 0 ? this.delegate[name].bind(this.delegate) : void 0;
  }
};
var NgCompilerHost = class extends DelegatingCompilerHost2 {
  constructor(delegate, inputFiles, rootDirs, shimAdapter, shimTagger, entryPoint, factoryTracker, diagnostics) {
    super(delegate);
    this.shimAdapter = shimAdapter;
    this.shimTagger = shimTagger;
    this.factoryTracker = null;
    this.entryPoint = null;
    this.factoryTracker = factoryTracker;
    this.entryPoint = entryPoint;
    this.constructionDiagnostics = diagnostics;
    this.inputFiles = [...inputFiles, ...shimAdapter.extraInputFiles];
    this.rootDirs = rootDirs;
    if (this.resolveModuleNames === void 0) {
      this.resolveModuleNames = this.createCachedResolveModuleNamesFunction();
    }
  }
  get ignoreForEmit() {
    return this.shimAdapter.ignoreForEmit;
  }
  get shimExtensionPrefixes() {
    return this.shimAdapter.extensionPrefixes;
  }
  postProgramCreationCleanup() {
    this.shimTagger.finalize();
  }
  static wrap(delegate, inputFiles, options, oldProgram) {
    const allowEmptyCodegenFiles = options.allowEmptyCodegenFiles || false;
    const shouldGenerateFactoryShims = options.generateNgFactoryShims !== void 0 ? options.generateNgFactoryShims : allowEmptyCodegenFiles;
    const shouldGenerateSummaryShims = options.generateNgSummaryShims !== void 0 ? options.generateNgSummaryShims : allowEmptyCodegenFiles;
    const topLevelShimGenerators = [];
    const perFileShimGenerators = [];
    if (shouldGenerateSummaryShims) {
      perFileShimGenerators.push(new SummaryGenerator());
    }
    let factoryTracker = null;
    if (shouldGenerateFactoryShims) {
      const factoryGenerator = new FactoryGenerator();
      perFileShimGenerators.push(factoryGenerator);
      factoryTracker = factoryGenerator;
    }
    const rootDirs = getRootDirs(delegate, options);
    perFileShimGenerators.push(new TypeCheckShimGenerator());
    let diagnostics = [];
    const normalizedTsInputFiles = [];
    for (const inputFile of inputFiles) {
      if (!isNonDeclarationTsPath(inputFile)) {
        continue;
      }
      normalizedTsInputFiles.push(resolve(inputFile));
    }
    let entryPoint = null;
    if (options.flatModuleOutFile != null && options.flatModuleOutFile !== "") {
      entryPoint = findFlatIndexEntryPoint(normalizedTsInputFiles);
      if (entryPoint === null) {
        diagnostics.push({
          category: ts74.DiagnosticCategory.Error,
          code: ngErrorCode(ErrorCode.CONFIG_FLAT_MODULE_NO_INDEX),
          file: void 0,
          start: void 0,
          length: void 0,
          messageText: 'Angular compiler option "flatModuleOutFile" requires one and only one .ts file in the "files" field.'
        });
      } else {
        const flatModuleId = options.flatModuleId || null;
        const flatModuleOutFile = normalizeSeparators2(options.flatModuleOutFile);
        const flatIndexGenerator = new FlatIndexGenerator(entryPoint, flatModuleOutFile, flatModuleId);
        topLevelShimGenerators.push(flatIndexGenerator);
      }
    }
    const shimAdapter = new ShimAdapter(delegate, normalizedTsInputFiles, topLevelShimGenerators, perFileShimGenerators, oldProgram);
    const shimTagger = new ShimReferenceTagger(perFileShimGenerators.map((gen) => gen.extensionPrefix));
    return new NgCompilerHost(delegate, inputFiles, rootDirs, shimAdapter, shimTagger, entryPoint, factoryTracker, diagnostics);
  }
  isShim(sf) {
    return isShim(sf);
  }
  getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile) {
    const shimSf = this.shimAdapter.maybeGenerate(resolve(fileName));
    if (shimSf !== null) {
      return shimSf;
    }
    const sf = this.delegate.getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
    if (sf === void 0) {
      return void 0;
    }
    this.shimTagger.tag(sf);
    return sf;
  }
  fileExists(fileName) {
    return this.delegate.fileExists(fileName) || this.shimAdapter.maybeGenerate(resolve(fileName)) != null;
  }
  get unifiedModulesHost() {
    return this.fileNameToModuleName !== void 0 ? this : null;
  }
  createCachedResolveModuleNamesFunction() {
    const moduleResolutionCache = ts74.createModuleResolutionCache(this.getCurrentDirectory(), this.getCanonicalFileName.bind(this));
    return (moduleNames, containingFile, reusedNames, redirectedReference, options) => {
      return moduleNames.map((moduleName) => {
        const module2 = ts74.resolveModuleName(moduleName, containingFile, options, this, moduleResolutionCache, redirectedReference);
        return module2.resolvedModule;
      });
    };
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/program.mjs
var NgtscProgram = class {
  constructor(rootNames, options, delegateHost, oldProgram) {
    this.options = options;
    const perfRecorder = ActivePerfRecorder.zeroedToNow();
    perfRecorder.phase(PerfPhase.Setup);
    if (!options.disableTypeScriptVersionCheck) {
      verifySupportedTypeScriptVersion();
    }
    const reuseProgram = oldProgram == null ? void 0 : oldProgram.compiler.getCurrentProgram();
    this.host = NgCompilerHost.wrap(delegateHost, rootNames, options, reuseProgram != null ? reuseProgram : null);
    if (reuseProgram !== void 0) {
      retagAllTsFiles(reuseProgram);
    }
    this.tsProgram = perfRecorder.inPhase(PerfPhase.TypeScriptProgramCreate, () => ts75.createProgram(this.host.inputFiles, options, this.host, reuseProgram));
    perfRecorder.phase(PerfPhase.Unaccounted);
    perfRecorder.memory(PerfCheckpoint.TypeScriptProgramCreate);
    this.host.postProgramCreationCleanup();
    untagAllTsFiles(this.tsProgram);
    const programDriver = new TsCreateProgramDriver(this.tsProgram, this.host, this.options, this.host.shimExtensionPrefixes);
    this.incrementalStrategy = oldProgram !== void 0 ? oldProgram.incrementalStrategy.toNextBuildStrategy() : new TrackedIncrementalBuildStrategy();
    const modifiedResourceFiles = new Set();
    if (this.host.getModifiedResourceFiles !== void 0) {
      const strings = this.host.getModifiedResourceFiles();
      if (strings !== void 0) {
        for (const fileString of strings) {
          modifiedResourceFiles.add(absoluteFrom(fileString));
        }
      }
    }
    let ticket;
    if (oldProgram === void 0) {
      ticket = freshCompilationTicket(this.tsProgram, options, this.incrementalStrategy, programDriver, perfRecorder, false, false);
    } else {
      ticket = incrementalFromCompilerTicket(oldProgram.compiler, this.tsProgram, this.incrementalStrategy, programDriver, modifiedResourceFiles, perfRecorder);
    }
    this.compiler = NgCompiler.fromTicket(ticket, this.host);
  }
  getTsProgram() {
    return this.tsProgram;
  }
  getReuseTsProgram() {
    return this.compiler.getCurrentProgram();
  }
  getTsOptionDiagnostics(cancellationToken) {
    return this.compiler.perfRecorder.inPhase(PerfPhase.TypeScriptDiagnostics, () => this.tsProgram.getOptionsDiagnostics(cancellationToken));
  }
  getTsSyntacticDiagnostics(sourceFile, cancellationToken) {
    return this.compiler.perfRecorder.inPhase(PerfPhase.TypeScriptDiagnostics, () => {
      const ignoredFiles = this.compiler.ignoreForDiagnostics;
      let res;
      if (sourceFile !== void 0) {
        if (ignoredFiles.has(sourceFile)) {
          return [];
        }
        res = this.tsProgram.getSyntacticDiagnostics(sourceFile, cancellationToken);
      } else {
        const diagnostics = [];
        for (const sf of this.tsProgram.getSourceFiles()) {
          if (!ignoredFiles.has(sf)) {
            diagnostics.push(...this.tsProgram.getSyntacticDiagnostics(sf, cancellationToken));
          }
        }
        res = diagnostics;
      }
      return res;
    });
  }
  getTsSemanticDiagnostics(sourceFile, cancellationToken) {
    return this.compiler.perfRecorder.inPhase(PerfPhase.TypeScriptDiagnostics, () => {
      const ignoredFiles = this.compiler.ignoreForDiagnostics;
      let res;
      if (sourceFile !== void 0) {
        if (ignoredFiles.has(sourceFile)) {
          return [];
        }
        res = this.tsProgram.getSemanticDiagnostics(sourceFile, cancellationToken);
      } else {
        const diagnostics = [];
        for (const sf of this.tsProgram.getSourceFiles()) {
          if (!ignoredFiles.has(sf)) {
            diagnostics.push(...this.tsProgram.getSemanticDiagnostics(sf, cancellationToken));
          }
        }
        res = diagnostics;
      }
      return res;
    });
  }
  getNgOptionDiagnostics(cancellationToken) {
    return this.compiler.getOptionDiagnostics();
  }
  getNgStructuralDiagnostics(cancellationToken) {
    return [];
  }
  getNgSemanticDiagnostics(fileName, cancellationToken) {
    let sf = void 0;
    if (fileName !== void 0) {
      sf = this.tsProgram.getSourceFile(fileName);
      if (sf === void 0) {
        return [];
      }
    }
    if (sf === void 0) {
      return this.compiler.getDiagnostics();
    } else {
      return this.compiler.getDiagnosticsForFile(sf, OptimizeFor.WholeProgram);
    }
  }
  loadNgStructureAsync() {
    return this.compiler.analyzeAsync();
  }
  listLazyRoutes(entryRoute) {
    return [];
  }
  emitXi18n() {
    var _a, _b, _c;
    const ctx = new MessageBundle(new HtmlParser(), [], {}, (_a = this.options.i18nOutLocale) != null ? _a : null);
    this.compiler.xi18n(ctx);
    i18nExtract((_b = this.options.i18nOutFormat) != null ? _b : null, (_c = this.options.i18nOutFile) != null ? _c : null, this.host, this.options, ctx, resolve);
  }
  emit(opts) {
    if (opts !== void 0 && opts.emitFlags !== void 0 && opts.emitFlags & EmitFlags.I18nBundle) {
      this.emitXi18n();
      if (!(opts.emitFlags & EmitFlags.JS)) {
        return {
          diagnostics: [],
          emitSkipped: true,
          emittedFiles: []
        };
      }
    }
    this.compiler.perfRecorder.memory(PerfCheckpoint.PreEmit);
    const res = this.compiler.perfRecorder.inPhase(PerfPhase.TypeScriptEmit, () => {
      const { transformers } = this.compiler.prepareEmit();
      const ignoreFiles = this.compiler.ignoreForEmit;
      const emitCallback = opts && opts.emitCallback || defaultEmitCallback;
      const writeFile = (fileName, data, writeByteOrderMark, onError, sourceFiles) => {
        if (sourceFiles !== void 0) {
          for (const writtenSf of sourceFiles) {
            if (writtenSf.isDeclarationFile) {
              continue;
            }
            this.compiler.incrementalCompilation.recordSuccessfulEmit(writtenSf);
          }
        }
        this.host.writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles);
      };
      const customTransforms = opts && opts.customTransformers;
      const beforeTransforms = transformers.before || [];
      const afterDeclarationsTransforms = transformers.afterDeclarations;
      if (customTransforms !== void 0 && customTransforms.beforeTs !== void 0) {
        beforeTransforms.push(...customTransforms.beforeTs);
      }
      const emitResults = [];
      for (const targetSourceFile of this.tsProgram.getSourceFiles()) {
        if (targetSourceFile.isDeclarationFile || ignoreFiles.has(targetSourceFile)) {
          continue;
        }
        if (this.compiler.incrementalCompilation.safeToSkipEmit(targetSourceFile)) {
          this.compiler.perfRecorder.eventCount(PerfEvent.EmitSkipSourceFile);
          continue;
        }
        this.compiler.perfRecorder.eventCount(PerfEvent.EmitSourceFile);
        emitResults.push(emitCallback({
          targetSourceFile,
          program: this.tsProgram,
          host: this.host,
          options: this.options,
          emitOnlyDtsFiles: false,
          writeFile,
          customTransformers: {
            before: beforeTransforms,
            after: customTransforms && customTransforms.afterTs,
            afterDeclarations: afterDeclarationsTransforms
          }
        }));
      }
      this.compiler.perfRecorder.memory(PerfCheckpoint.Emit);
      return (opts && opts.mergeEmitResultsCallback || mergeEmitResults)(emitResults);
    });
    if (this.options.tracePerformance !== void 0) {
      const perf = this.compiler.perfRecorder.finalize();
      getFileSystem().writeFile(getFileSystem().resolve(this.options.tracePerformance), JSON.stringify(perf, null, 2));
    }
    return res;
  }
  getIndexedComponents() {
    return this.compiler.getIndexedComponents();
  }
  getLibrarySummaries() {
    throw new Error("Method not implemented.");
  }
  getEmittedGeneratedFiles() {
    throw new Error("Method not implemented.");
  }
  getEmittedSourceFiles() {
    throw new Error("Method not implemented.");
  }
};
var defaultEmitCallback = ({ program, targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers }) => program.emit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers);
function mergeEmitResults(emitResults) {
  const diagnostics = [];
  let emitSkipped = false;
  const emittedFiles = [];
  for (const er of emitResults) {
    diagnostics.push(...er.diagnostics);
    emitSkipped = emitSkipped || er.emitSkipped;
    emittedFiles.push(...er.emittedFiles || []);
  }
  return { diagnostics, emitSkipped, emittedFiles };
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/downlevel_decorators_transform/downlevel_decorators_transform.mjs
import ts77 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/downlevel_decorators_transform/patch_alias_reference_resolution.mjs
import ts76 from "typescript";
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
  emitResolver.isReferencedAliasDeclaration = function(node, ...args2) {
    if (isAliasImportDeclaration(node) && referencedAliases.has(node)) {
      return true;
    }
    return originalIsReferencedAliasDeclaration.call(emitResolver, node, ...args2);
  };
  return emitResolver[patchedReferencedAliasesSymbol] = referencedAliases;
}
function isAliasImportDeclaration(node) {
  return ts76.isImportSpecifier(node) || ts76.isNamespaceImport(node) || ts76.isImportClause(node);
}
function isTransformationContextWithEmitResolver(context) {
  return context.getEmitResolver !== void 0;
}
function throwIncompatibleTransformationContextError() {
  throw Error("Unable to downlevel Angular decorators due to an incompatible TypeScript version.\nIf you recently updated TypeScript and this issue surfaces now, consider downgrading.\n\nPlease report an issue on the Angular repositories when this issue surfaces and you are using a supposedly compatible TypeScript version.");
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/downlevel_decorators_transform/downlevel_decorators_transform.mjs
function isAngularDecorator3(decorator, isCore) {
  return isCore || decorator.import !== null && decorator.import.from === "@angular/core";
}
var DECORATOR_INVOCATION_JSDOC_TYPE = "!Array<{type: !Function, args: (undefined|!Array<?>)}>";
function extractMetadataFromSingleDecorator(decorator, diagnostics) {
  const metadataProperties = [];
  const expr = decorator.expression;
  switch (expr.kind) {
    case ts77.SyntaxKind.Identifier:
      metadataProperties.push(ts77.createPropertyAssignment("type", expr));
      break;
    case ts77.SyntaxKind.CallExpression:
      const call = expr;
      metadataProperties.push(ts77.createPropertyAssignment("type", call.expression));
      if (call.arguments.length) {
        const args2 = [];
        for (const arg of call.arguments) {
          args2.push(arg);
        }
        const argsArrayLiteral = ts77.createArrayLiteral(ts77.createNodeArray(args2, true));
        metadataProperties.push(ts77.createPropertyAssignment("args", argsArrayLiteral));
      }
      break;
    default:
      diagnostics.push({
        file: decorator.getSourceFile(),
        start: decorator.getStart(),
        length: decorator.getEnd() - decorator.getStart(),
        messageText: `${ts77.SyntaxKind[decorator.kind]} not implemented in gathering decorator metadata.`,
        category: ts77.DiagnosticCategory.Error,
        code: 0
      });
      break;
  }
  return ts77.createObjectLiteral(metadataProperties);
}
function createCtorParametersClassProperty(diagnostics, entityNameToExpression, ctorParameters, isClosureCompilerEnabled) {
  const params = [];
  for (const ctorParam of ctorParameters) {
    if (!ctorParam.type && ctorParam.decorators.length === 0) {
      params.push(ts77.createNull());
      continue;
    }
    const paramType = ctorParam.type ? typeReferenceToExpression(entityNameToExpression, ctorParam.type) : void 0;
    const members = [ts77.createPropertyAssignment("type", paramType || ts77.createIdentifier("undefined"))];
    const decorators = [];
    for (const deco of ctorParam.decorators) {
      decorators.push(extractMetadataFromSingleDecorator(deco, diagnostics));
    }
    if (decorators.length) {
      members.push(ts77.createPropertyAssignment("decorators", ts77.createArrayLiteral(decorators)));
    }
    params.push(ts77.createObjectLiteral(members));
  }
  const initializer = ts77.createArrowFunction(void 0, void 0, [], void 0, ts77.createToken(ts77.SyntaxKind.EqualsGreaterThanToken), ts77.createArrayLiteral(params, true));
  const ctorProp = ts77.createProperty(void 0, [ts77.createToken(ts77.SyntaxKind.StaticKeyword)], "ctorParameters", void 0, void 0, initializer);
  if (isClosureCompilerEnabled) {
    ts77.setSyntheticLeadingComments(ctorProp, [
      {
        kind: ts77.SyntaxKind.MultiLineCommentTrivia,
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
  if (ts77.isLiteralTypeNode(node)) {
    kind = node.literal.kind;
  }
  switch (kind) {
    case ts77.SyntaxKind.FunctionType:
    case ts77.SyntaxKind.ConstructorType:
      return ts77.createIdentifier("Function");
    case ts77.SyntaxKind.ArrayType:
    case ts77.SyntaxKind.TupleType:
      return ts77.createIdentifier("Array");
    case ts77.SyntaxKind.TypePredicate:
    case ts77.SyntaxKind.TrueKeyword:
    case ts77.SyntaxKind.FalseKeyword:
    case ts77.SyntaxKind.BooleanKeyword:
      return ts77.createIdentifier("Boolean");
    case ts77.SyntaxKind.StringLiteral:
    case ts77.SyntaxKind.StringKeyword:
      return ts77.createIdentifier("String");
    case ts77.SyntaxKind.ObjectKeyword:
      return ts77.createIdentifier("Object");
    case ts77.SyntaxKind.NumberKeyword:
    case ts77.SyntaxKind.NumericLiteral:
      return ts77.createIdentifier("Number");
    case ts77.SyntaxKind.TypeReference:
      const typeRef = node;
      return entityNameToExpression(typeRef.typeName);
    case ts77.SyntaxKind.UnionType:
      const childTypeNodes = node.types.filter((t) => !(ts77.isLiteralTypeNode(t) && t.literal.kind === ts77.SyntaxKind.NullKeyword));
      return childTypeNodes.length === 1 ? typeReferenceToExpression(entityNameToExpression, childTypeNodes[0]) : void 0;
    default:
      return void 0;
  }
}
function symbolIsRuntimeValue(typeChecker, symbol) {
  if (symbol.flags & ts77.SymbolFlags.Alias) {
    symbol = typeChecker.getAliasedSymbol(symbol);
  }
  return (symbol.flags & ts77.SymbolFlags.Value & ts77.SymbolFlags.ConstEnumExcludes) !== 0;
}
function getDownlevelDecoratorsTransform(typeChecker, host, diagnostics, isCore, isClosureCompilerEnabled, skipClassDecorators) {
  function addJSDocTypeAnnotation(node, jsdocType) {
    if (!isClosureCompilerEnabled) {
      return;
    }
    ts77.setSyntheticLeadingComments(node, [
      {
        kind: ts77.SyntaxKind.MultiLineCommentTrivia,
        text: `* @type {${jsdocType}} `,
        pos: -1,
        end: -1,
        hasTrailingNewLine: true
      }
    ]);
  }
  function createDecoratorClassProperty(decoratorList) {
    const modifier = ts77.createToken(ts77.SyntaxKind.StaticKeyword);
    const initializer = ts77.createArrayLiteral(decoratorList, true);
    const prop = ts77.createProperty(void 0, [modifier], "decorators", void 0, void 0, initializer);
    addJSDocTypeAnnotation(prop, DECORATOR_INVOCATION_JSDOC_TYPE);
    return prop;
  }
  function createPropDecoratorsClassProperty(diagnostics2, properties) {
    const entries = [];
    for (const [name, decorators] of properties.entries()) {
      entries.push(ts77.createPropertyAssignment(name, ts77.createArrayLiteral(decorators.map((deco) => extractMetadataFromSingleDecorator(deco, diagnostics2)))));
    }
    const initializer = ts77.createObjectLiteral(entries, true);
    const prop = ts77.createProperty(void 0, [ts77.createToken(ts77.SyntaxKind.StaticKeyword)], "propDecorators", void 0, void 0, initializer);
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
      if (ts77.isQualifiedName(name)) {
        const containerExpr = entityNameToExpression(name.left);
        if (containerExpr === void 0) {
          return void 0;
        }
        return ts77.createPropertyAccess(containerExpr, name.right);
      }
      const decl = symbol.declarations[0];
      if (isAliasImportDeclaration(decl)) {
        referencedParameterTypes.add(decl);
        if (decl.name !== void 0) {
          return ts77.getMutableClone(decl.name);
        }
      }
      return ts77.getMutableClone(name);
    }
    function transformClassElement(element) {
      element = ts77.visitEachChild(element, decoratorDownlevelVisitor, context);
      const decoratorsToKeep = [];
      const toLower = [];
      const decorators = host.getDecoratorsOfDeclaration(element) || [];
      for (const decorator of decorators) {
        const decoratorNode = decorator.node;
        if (!isAngularDecorator3(decorator, isCore)) {
          decoratorsToKeep.push(decoratorNode);
          continue;
        }
        toLower.push(decoratorNode);
      }
      if (!toLower.length)
        return [void 0, element, []];
      if (!element.name || !ts77.isIdentifier(element.name)) {
        diagnostics.push({
          file: element.getSourceFile(),
          start: element.getStart(),
          length: element.getEnd() - element.getStart(),
          messageText: `Cannot process decorators for class element with non-analyzable name.`,
          category: ts77.DiagnosticCategory.Error,
          code: 0
        });
        return [void 0, element, []];
      }
      const name = element.name.text;
      const mutable = ts77.getMutableClone(element);
      mutable.decorators = decoratorsToKeep.length ? ts77.setTextRange(ts77.createNodeArray(decoratorsToKeep), mutable.decorators) : void 0;
      return [name, mutable, toLower];
    }
    function transformConstructor(ctor) {
      ctor = ts77.visitEachChild(ctor, decoratorDownlevelVisitor, context);
      const newParameters = [];
      const oldParameters = ctor.parameters;
      const parametersInfo = [];
      for (const param of oldParameters) {
        const decoratorsToKeep = [];
        const paramInfo = { decorators: [], type: null };
        const decorators = host.getDecoratorsOfDeclaration(param) || [];
        for (const decorator of decorators) {
          const decoratorNode = decorator.node;
          if (!isAngularDecorator3(decorator, isCore)) {
            decoratorsToKeep.push(decoratorNode);
            continue;
          }
          paramInfo.decorators.push(decoratorNode);
        }
        if (param.type) {
          paramInfo.type = param.type;
        }
        parametersInfo.push(paramInfo);
        const newParam = ts77.updateParameter(param, decoratorsToKeep.length ? decoratorsToKeep : void 0, param.modifiers, param.dotDotDotToken, param.name, param.questionToken, param.type, param.initializer);
        newParameters.push(newParam);
      }
      const updated = ts77.updateConstructor(ctor, ctor.decorators, ctor.modifiers, newParameters, ctor.body);
      return [updated, parametersInfo];
    }
    function transformClassDeclaration(classDecl) {
      classDecl = ts77.getMutableClone(classDecl);
      const newMembers = [];
      const decoratedProperties = new Map();
      let classParameters = null;
      for (const member of classDecl.members) {
        switch (member.kind) {
          case ts77.SyntaxKind.PropertyDeclaration:
          case ts77.SyntaxKind.GetAccessor:
          case ts77.SyntaxKind.SetAccessor:
          case ts77.SyntaxKind.MethodDeclaration: {
            const [name, newMember, decorators] = transformClassElement(member);
            newMembers.push(newMember);
            if (name)
              decoratedProperties.set(name, decorators);
            continue;
          }
          case ts77.SyntaxKind.Constructor: {
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
        newMembers.push(ts77.visitEachChild(member, decoratorDownlevelVisitor, context));
      }
      const decoratorsToKeep = new Set(classDecl.decorators);
      const possibleAngularDecorators = host.getDecoratorsOfDeclaration(classDecl) || [];
      let hasAngularDecorator = false;
      const decoratorsToLower = [];
      for (const decorator of possibleAngularDecorators) {
        const decoratorNode = decorator.node;
        const isNgDecorator = isAngularDecorator3(decorator, isCore);
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
        if (hasAngularDecorator || classParameters.some((p2) => !!p2.decorators.length)) {
          newMembers.push(createCtorParametersClassProperty(diagnostics, entityNameToExpression, classParameters, isClosureCompilerEnabled));
        }
      }
      if (decoratedProperties.size) {
        newMembers.push(createPropDecoratorsClassProperty(diagnostics, decoratedProperties));
      }
      const members = ts77.setTextRange(ts77.createNodeArray(newMembers, classDecl.members.hasTrailingComma), classDecl.members);
      return ts77.updateClassDeclaration(classDecl, decoratorsToKeep.size ? Array.from(decoratorsToKeep) : void 0, classDecl.modifiers, classDecl.name, classDecl.typeParameters, classDecl.heritageClauses, members);
    }
    function decoratorDownlevelVisitor(node) {
      if (ts77.isClassDeclaration(node)) {
        return transformClassDeclaration(node);
      }
      return ts77.visitEachChild(node, decoratorDownlevelVisitor, context);
    }
    return (sf) => {
      return ts77.visitEachChild(sf, decoratorDownlevelVisitor, context);
    };
  };
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/inline_resources.mjs
import ts78 from "typescript";
var PRECONDITIONS_TEXT = "angularCompilerOptions.enableResourceInlining requires all resources to be statically resolvable.";
function getResourceLoader(host, containingFileName) {
  return {
    get(url) {
      if (typeof url !== "string") {
        throw new Error("templateUrl and stylesUrl must be string literals. " + PRECONDITIONS_TEXT);
      }
      const fileName = host.resourceNameToFileName(url, containingFileName);
      if (fileName) {
        const content = host.loadResource(fileName);
        if (typeof content !== "string") {
          throw new Error("Cannot handle async resource. " + PRECONDITIONS_TEXT);
        }
        return content;
      }
      throw new Error(`Failed to resolve ${url} from ${containingFileName}. ${PRECONDITIONS_TEXT}`);
    }
  };
}
var InlineResourcesMetadataTransformer = class {
  constructor(host) {
    this.host = host;
  }
  start(sourceFile) {
    const loader = getResourceLoader(this.host, sourceFile.fileName);
    return (value, node) => {
      if (isClassMetadata(value) && ts78.isClassDeclaration(node) && value.decorators) {
        value.decorators.forEach((d) => {
          if (isMetadataSymbolicCallExpression(d) && isMetadataImportedSymbolReferenceExpression(d.expression) && d.expression.module === "@angular/core" && d.expression.name === "Component" && d.arguments) {
            d.arguments = d.arguments.map(this.updateDecoratorMetadata.bind(this, loader));
          }
        });
      }
      return value;
    };
  }
  updateDecoratorMetadata(loader, arg) {
    if (arg["templateUrl"]) {
      arg["template"] = loader.get(arg["templateUrl"]);
      delete arg["templateUrl"];
    }
    const styles = arg["styles"] || [];
    const styleUrls = arg["styleUrls"] || [];
    if (!Array.isArray(styles))
      throw new Error("styles should be an array");
    if (!Array.isArray(styleUrls))
      throw new Error("styleUrls should be an array");
    styles.push(...styleUrls.map((styleUrl) => loader.get(styleUrl)));
    if (styles.length > 0) {
      arg["styles"] = styles;
      delete arg["styleUrls"];
    }
    return arg;
  }
};
function getInlineResourcesTransformFactory(program, host) {
  return (context) => (sourceFile) => {
    const loader = getResourceLoader(host, sourceFile.fileName);
    const visitor = (node) => {
      if (!ts78.isClassDeclaration(node)) {
        return node;
      }
      const newDecorators = ts78.visitNodes(node.decorators, (node2) => {
        if (ts78.isDecorator(node2) && isComponentDecorator(node2, program.getTypeChecker())) {
          return updateDecorator(node2, loader);
        }
        return node2;
      });
      const newMembers = ts78.visitNodes(node.members, (node2) => {
        if (ts78.isClassElement(node2)) {
          return updateAnnotations(node2, loader, program.getTypeChecker());
        } else {
          return node2;
        }
      });
      return ts78.updateClassDeclaration(node, newDecorators, node.modifiers, node.name, node.typeParameters, node.heritageClauses || [], newMembers);
    };
    return ts78.visitEachChild(sourceFile, visitor, context);
  };
}
function updateDecorator(node, loader) {
  if (!ts78.isCallExpression(node.expression)) {
    return node;
  }
  const expr = node.expression;
  const newArguments = updateComponentProperties(expr.arguments, loader);
  return ts78.updateDecorator(node, ts78.updateCall(expr, expr.expression, expr.typeArguments, newArguments));
}
function updateAnnotations(node, loader, typeChecker) {
  if (!ts78.isPropertyDeclaration(node) || !ts78.isIdentifier(node.name) || node.name.text !== "decorators" || !node.initializer || !ts78.isArrayLiteralExpression(node.initializer)) {
    return node;
  }
  const newAnnotations = node.initializer.elements.map((annotation) => {
    if (!ts78.isObjectLiteralExpression(annotation))
      return annotation;
    const decoratorType = annotation.properties.find((p2) => isIdentifierNamed(p2, "type"));
    if (!decoratorType || !ts78.isPropertyAssignment(decoratorType) || !ts78.isIdentifier(decoratorType.initializer) || !isComponentSymbol(decoratorType.initializer, typeChecker)) {
      return annotation;
    }
    const newAnnotation = annotation.properties.map((prop) => {
      if (!isIdentifierNamed(prop, "args") || !ts78.isPropertyAssignment(prop) || !ts78.isArrayLiteralExpression(prop.initializer))
        return prop;
      const newDecoratorArgs = ts78.updatePropertyAssignment(prop, prop.name, ts78.createArrayLiteral(updateComponentProperties(prop.initializer.elements, loader)));
      return newDecoratorArgs;
    });
    return ts78.updateObjectLiteral(annotation, newAnnotation);
  });
  return ts78.updateProperty(node, node.decorators, node.modifiers, node.name, node.questionToken, node.type, ts78.updateArrayLiteral(node.initializer, newAnnotations));
}
function isIdentifierNamed(p2, name) {
  return !!p2.name && ts78.isIdentifier(p2.name) && p2.name.text === name;
}
function isComponentDecorator(node, typeChecker) {
  if (!ts78.isCallExpression(node.expression)) {
    return false;
  }
  const callExpr = node.expression;
  let identifier;
  if (ts78.isIdentifier(callExpr.expression)) {
    identifier = callExpr.expression;
  } else {
    return false;
  }
  return isComponentSymbol(identifier, typeChecker);
}
function isComponentSymbol(identifier, typeChecker) {
  if (!ts78.isIdentifier(identifier))
    return false;
  const symbol = typeChecker.getSymbolAtLocation(identifier);
  if (!symbol || !symbol.declarations || !symbol.declarations.length) {
    console.error(`Unable to resolve symbol '${identifier.text}' in the program, does it type-check?`);
    return false;
  }
  const declaration = symbol.declarations[0];
  if (!declaration || !ts78.isImportSpecifier(declaration)) {
    return false;
  }
  const name = (declaration.propertyName || declaration.name).text;
  const moduleId = declaration.parent.parent.parent.moduleSpecifier.text;
  return moduleId === "@angular/core" && name === "Component";
}
function updateComponentProperties(args2, loader) {
  if (args2.length !== 1) {
    return args2;
  }
  const componentArg = args2[0];
  if (!ts78.isObjectLiteralExpression(componentArg)) {
    return args2;
  }
  const newProperties = [];
  const newStyleExprs = [];
  componentArg.properties.forEach((prop) => {
    if (!ts78.isPropertyAssignment(prop) || ts78.isComputedPropertyName(prop.name)) {
      newProperties.push(prop);
      return;
    }
    switch (prop.name.text) {
      case "styles":
        if (!ts78.isArrayLiteralExpression(prop.initializer)) {
          throw new Error("styles takes an array argument");
        }
        newStyleExprs.push(...prop.initializer.elements);
        break;
      case "styleUrls":
        if (!ts78.isArrayLiteralExpression(prop.initializer)) {
          throw new Error("styleUrls takes an array argument");
        }
        newStyleExprs.push(...prop.initializer.elements.map((expr) => {
          if (!ts78.isStringLiteral(expr) && !ts78.isNoSubstitutionTemplateLiteral(expr)) {
            throw new Error("Can only accept string literal arguments to styleUrls. " + PRECONDITIONS_TEXT);
          }
          const styles = loader.get(expr.text);
          return ts78.createLiteral(styles);
        }));
        break;
      case "templateUrl":
        if (!ts78.isStringLiteral(prop.initializer) && !ts78.isNoSubstitutionTemplateLiteral(prop.initializer)) {
          throw new Error("Can only accept a string literal argument to templateUrl. " + PRECONDITIONS_TEXT);
        }
        const template = loader.get(prop.initializer.text);
        newProperties.push(ts78.updatePropertyAssignment(prop, ts78.createIdentifier("template"), ts78.createLiteral(template)));
        break;
      default:
        newProperties.push(prop);
    }
  });
  if (newStyleExprs.length > 0) {
    const newStyles = ts78.createPropertyAssignment(ts78.createIdentifier("styles"), ts78.createArrayLiteral(newStyleExprs));
    newProperties.push(newStyles);
  }
  return ts78.createNodeArray([ts78.updateObjectLiteral(componentArg, newProperties)]);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/lower_expressions.mjs
import { createLoweredSymbol, isLoweredSymbol } from "@angular/compiler";
import ts79 from "typescript";
function toMap(items, select) {
  return new Map(items.map((i) => [select(i), i]));
}
function isLexicalScope(node) {
  switch (node.kind) {
    case ts79.SyntaxKind.ArrowFunction:
    case ts79.SyntaxKind.FunctionExpression:
    case ts79.SyntaxKind.FunctionDeclaration:
    case ts79.SyntaxKind.ClassExpression:
    case ts79.SyntaxKind.ClassDeclaration:
    case ts79.SyntaxKind.FunctionType:
    case ts79.SyntaxKind.TypeLiteral:
    case ts79.SyntaxKind.ArrayType:
      return true;
  }
  return false;
}
function transformSourceFile(sourceFile, requests, context) {
  const inserts = [];
  const locations = Array.from(requests.keys());
  const min = Math.min(...locations);
  const max = Math.max(...locations);
  function shouldVisit(pos, end) {
    return pos <= max && end >= min || pos == -1;
  }
  function visitSourceFile(sourceFile2) {
    function topLevelStatement(node) {
      const declarations = [];
      function visitNode(node2) {
        const { pos: pos2, end: end2, kind, parent: originalParent } = ts79.getOriginalNode(node2);
        const nodeRequest = requests.get(pos2);
        if (nodeRequest && nodeRequest.kind == kind && nodeRequest.end == end2) {
          if (originalParent && originalParent.kind === ts79.SyntaxKind.VariableDeclaration) {
            const varParent = originalParent;
            if (varParent.name.kind === ts79.SyntaxKind.Identifier) {
              const varName = varParent.name.text;
              const exportName2 = nodeRequest.name;
              declarations.push({
                name: exportName2,
                node: ts79.createIdentifier(varName),
                order: 1
              });
              return node2;
            }
          }
          const exportName = nodeRequest.name;
          declarations.push({ name: exportName, node: node2, order: 0 });
          return ts79.createIdentifier(exportName);
        }
        let result = node2;
        if (shouldVisit(pos2, end2) && !isLexicalScope(node2)) {
          result = ts79.visitEachChild(node2, visitNode, context);
        }
        return result;
      }
      const { pos, end } = ts79.getOriginalNode(node);
      let resultStmt;
      if (shouldVisit(pos, end)) {
        resultStmt = ts79.visitEachChild(node, visitNode, context);
      } else {
        resultStmt = node;
      }
      if (declarations.length) {
        inserts.push({ relativeTo: resultStmt, declarations });
      }
      return resultStmt;
    }
    let newStatements = sourceFile2.statements.map(topLevelStatement);
    if (inserts.length) {
      const insertMap = toMap(inserts, (i) => i.relativeTo);
      const tmpStatements = [];
      newStatements.forEach((statement) => {
        const insert = insertMap.get(statement);
        if (insert) {
          const before = insert.declarations.filter((d) => d.order === 0);
          if (before.length) {
            tmpStatements.push(createVariableStatementForDeclarations(before));
          }
          tmpStatements.push(statement);
          const after = insert.declarations.filter((d) => d.order === 1);
          if (after.length) {
            tmpStatements.push(createVariableStatementForDeclarations(after));
          }
        } else {
          tmpStatements.push(statement);
        }
      });
      tmpStatements.push(ts79.createExportDeclaration(void 0, void 0, ts79.createNamedExports(inserts.reduce((accumulator, insert) => [...accumulator, ...insert.declarations], []).map((declaration) => ts79.createExportSpecifier(void 0, declaration.name)))));
      newStatements = tmpStatements;
    }
    const newSf = ts79.updateSourceFileNode(sourceFile2, ts79.setTextRange(ts79.createNodeArray(newStatements), sourceFile2.statements));
    if (!(sourceFile2.flags & ts79.NodeFlags.Synthesized)) {
      newSf.flags &= ~ts79.NodeFlags.Synthesized;
    }
    return newSf;
  }
  return visitSourceFile(sourceFile);
}
function createVariableStatementForDeclarations(declarations) {
  const varDecls = declarations.map((i) => ts79.createVariableDeclaration(i.name, void 0, i.node));
  return ts79.createVariableStatement(void 0, ts79.createVariableDeclarationList(varDecls, ts79.NodeFlags.Const));
}
function getExpressionLoweringTransformFactory(requestsMap, program) {
  return (context) => (sourceFile) => {
    const originalFile = program.getSourceFile(sourceFile.fileName);
    if (originalFile) {
      const requests = requestsMap.getRequests(originalFile);
      if (requests && requests.size) {
        return transformSourceFile(sourceFile, requests, context);
      }
    }
    return sourceFile;
  };
}
function isEligibleForLowering(node) {
  if (node) {
    switch (node.kind) {
      case ts79.SyntaxKind.SourceFile:
      case ts79.SyntaxKind.Decorator:
        return true;
      case ts79.SyntaxKind.ClassDeclaration:
      case ts79.SyntaxKind.InterfaceDeclaration:
      case ts79.SyntaxKind.EnumDeclaration:
      case ts79.SyntaxKind.FunctionDeclaration:
        return false;
      case ts79.SyntaxKind.VariableDeclaration:
        const isExported3 = (ts79.getCombinedModifierFlags(node) & ts79.ModifierFlags.Export) == 0;
        const varNode = node;
        return isExported3 || varNode.initializer !== void 0 && (ts79.isObjectLiteralExpression(varNode.initializer) || ts79.isArrayLiteralExpression(varNode.initializer) || ts79.isCallExpression(varNode.initializer));
    }
    return isEligibleForLowering(node.parent);
  }
  return true;
}
function isPrimitive3(value) {
  return Object(value) !== value;
}
function isRewritten(value) {
  return isMetadataGlobalReferenceExpression(value) && isLoweredSymbol(value.name);
}
function isLiteralFieldNamed(node, names) {
  if (node.parent && node.parent.kind == ts79.SyntaxKind.PropertyAssignment) {
    const property = node.parent;
    if (property.parent && property.parent.kind == ts79.SyntaxKind.ObjectLiteralExpression && property.name && property.name.kind == ts79.SyntaxKind.Identifier) {
      const propertyName = property.name;
      return names.has(propertyName.text);
    }
  }
  return false;
}
var LowerMetadataTransform = class {
  constructor(lowerableFieldNames) {
    this.requests = new Map();
    this.lowerableFieldNames = new Set(lowerableFieldNames);
  }
  getRequests(sourceFile) {
    let result = this.requests.get(sourceFile.fileName);
    if (!result) {
      this.cache.getMetadata(sourceFile);
      result = this.requests.get(sourceFile.fileName) || new Map();
    }
    return result;
  }
  connect(cache) {
    this.cache = cache;
  }
  start(sourceFile) {
    let identNumber = 0;
    const freshIdent = () => createLoweredSymbol(identNumber++);
    const requests = new Map();
    this.requests.set(sourceFile.fileName, requests);
    const replaceNode = (node) => {
      const name = freshIdent();
      requests.set(node.pos, { name, kind: node.kind, location: node.pos, end: node.end });
      return { __symbolic: "reference", name };
    };
    const isExportedSymbol = (() => {
      let exportTable;
      return (node) => {
        if (node.kind == ts79.SyntaxKind.Identifier) {
          const ident = node;
          if (!exportTable) {
            exportTable = createExportTableFor(sourceFile);
          }
          return exportTable.has(ident.text);
        }
        return false;
      };
    })();
    const isExportedPropertyAccess = (node) => {
      if (node.kind === ts79.SyntaxKind.PropertyAccessExpression) {
        const pae = node;
        if (isExportedSymbol(pae.expression)) {
          return true;
        }
      }
      return false;
    };
    const hasLowerableParentCache = new Map();
    const shouldBeLowered = (node) => {
      if (node === void 0) {
        return false;
      }
      let lowerable = false;
      if ((node.kind === ts79.SyntaxKind.ArrowFunction || node.kind === ts79.SyntaxKind.FunctionExpression) && isEligibleForLowering(node)) {
        lowerable = true;
      } else if (isLiteralFieldNamed(node, this.lowerableFieldNames) && isEligibleForLowering(node) && !isExportedSymbol(node) && !isExportedPropertyAccess(node)) {
        lowerable = true;
      }
      return lowerable;
    };
    const hasLowerableParent = (node) => {
      if (node === void 0) {
        return false;
      }
      if (!hasLowerableParentCache.has(node)) {
        hasLowerableParentCache.set(node, shouldBeLowered(node.parent) || hasLowerableParent(node.parent));
      }
      return hasLowerableParentCache.get(node);
    };
    const isLowerable = (node) => {
      if (node === void 0) {
        return false;
      }
      return shouldBeLowered(node) && !hasLowerableParent(node);
    };
    return (value, node) => {
      if (!isPrimitive3(value) && !isRewritten(value) && isLowerable(node)) {
        return replaceNode(node);
      }
      return value;
    };
  }
};
function createExportTableFor(sourceFile) {
  const exportTable = new Set();
  ts79.forEachChild(sourceFile, function scan(node) {
    switch (node.kind) {
      case ts79.SyntaxKind.ClassDeclaration:
      case ts79.SyntaxKind.FunctionDeclaration:
      case ts79.SyntaxKind.InterfaceDeclaration:
        if ((ts79.getCombinedModifierFlags(node) & ts79.ModifierFlags.Export) != 0) {
          const classDeclaration = node;
          const name = classDeclaration.name;
          if (name)
            exportTable.add(name.text);
        }
        break;
      case ts79.SyntaxKind.VariableStatement:
        const variableStatement = node;
        for (const declaration of variableStatement.declarationList.declarations) {
          scan(declaration);
        }
        break;
      case ts79.SyntaxKind.VariableDeclaration:
        const variableDeclaration = node;
        if ((ts79.getCombinedModifierFlags(variableDeclaration) & ts79.ModifierFlags.Export) != 0 && variableDeclaration.name.kind == ts79.SyntaxKind.Identifier) {
          const name = variableDeclaration.name;
          exportTable.add(name.text);
        }
        break;
      case ts79.SyntaxKind.ExportDeclaration:
        const exportDeclaration = node;
        const { moduleSpecifier, exportClause } = exportDeclaration;
        if (!moduleSpecifier && exportClause && ts79.isNamedExports(exportClause)) {
          exportClause.elements.forEach((spec) => {
            exportTable.add(spec.name.text);
          });
        }
    }
  });
  return exportTable;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/metadata_cache.mjs
import ts80 from "typescript";
var MetadataCache = class {
  constructor(collector, strict, transformers) {
    this.collector = collector;
    this.strict = strict;
    this.transformers = transformers;
    this.metadataCache = new Map();
    for (let transformer of transformers) {
      if (transformer.connect) {
        transformer.connect(this);
      }
    }
  }
  getMetadata(sourceFile) {
    if (this.metadataCache.has(sourceFile.fileName)) {
      return this.metadataCache.get(sourceFile.fileName);
    }
    let substitute = void 0;
    const declarationFile = sourceFile.isDeclarationFile;
    const moduleFile = ts80.isExternalModule(sourceFile);
    if (!declarationFile && moduleFile) {
      for (let transform of this.transformers) {
        const transformSubstitute = transform.start(sourceFile);
        if (transformSubstitute) {
          if (substitute) {
            const previous = substitute;
            substitute = (value, node) => transformSubstitute(previous(value, node), node);
          } else {
            substitute = transformSubstitute;
          }
        }
      }
    }
    const isTsFile = TS.test(sourceFile.fileName);
    const result = this.collector.getMetadata(sourceFile, this.strict && isTsFile, substitute);
    this.metadataCache.set(sourceFile.fileName, result);
    return result;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/node_emitter_transform.mjs
import ts82 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/node_emitter.mjs
import { BinaryOperator as BinaryOperator2, BuiltinMethod, BuiltinVar, ClassStmt, ExternalExpr as ExternalExpr10, Statement, StmtModifier as StmtModifier2, UnaryOperator as UnaryOperator2 } from "@angular/compiler";
import ts81 from "typescript";
var METHOD_THIS_NAME = "this";
var CATCH_ERROR_NAME = "error";
var CATCH_STACK_NAME = "stack";
var _VALID_IDENTIFIER_RE = /^[$A-Z_][0-9A-Z_$]*$/i;
var TypeScriptNodeEmitter = class {
  constructor(annotateForClosureCompiler) {
    this.annotateForClosureCompiler = annotateForClosureCompiler;
  }
  updateSourceFile(sourceFile, stmts, preamble) {
    const converter = new NodeEmitterVisitor(this.annotateForClosureCompiler);
    const statements = [].concat(...stmts.map((stmt) => stmt.visitStatement(converter, null)).filter((stmt) => stmt != null));
    const sourceStatements = [...converter.getReexports(), ...converter.getImports(), ...statements];
    if (preamble) {
      const preambleCommentHolder = ts81.createNotEmittedStatement(sourceFile);
      ts81.addSyntheticLeadingComment(preambleCommentHolder, ts81.SyntaxKind.MultiLineCommentTrivia, preamble, true);
      sourceStatements.unshift(preambleCommentHolder);
    }
    converter.updateSourceMap(sourceStatements);
    const newSourceFile = ts81.updateSourceFileNode(sourceFile, sourceStatements);
    return [newSourceFile, converter.getNodeMap()];
  }
};
function updateSourceFile(sourceFile, module2, annotateForClosureCompiler) {
  const converter = new NodeEmitterVisitor(annotateForClosureCompiler);
  converter.loadExportedVariableIdentifiers(sourceFile);
  const prefixStatements = module2.statements.filter((statement) => !(statement instanceof ClassStmt));
  const classes = module2.statements.filter((statement) => statement instanceof ClassStmt);
  const classMap = new Map(classes.map((classStatement) => [classStatement.name, classStatement]));
  const classNames = new Set(classes.map((classStatement) => classStatement.name));
  const prefix = prefixStatements.map((statement) => statement.visitStatement(converter, sourceFile));
  let newStatements = sourceFile.statements.map((node) => {
    if (node.kind == ts81.SyntaxKind.ClassDeclaration) {
      const classDeclaration = node;
      const name = classDeclaration.name;
      if (name) {
        const classStatement = classMap.get(name.text);
        if (classStatement) {
          classNames.delete(name.text);
          const classMemberHolder = converter.visitDeclareClassStmt(classStatement);
          const newMethods = classMemberHolder.members.filter((member) => member.kind !== ts81.SyntaxKind.Constructor);
          const newMembers = [...classDeclaration.members, ...newMethods];
          return ts81.updateClassDeclaration(classDeclaration, classDeclaration.decorators, classDeclaration.modifiers, classDeclaration.name, classDeclaration.typeParameters, classDeclaration.heritageClauses || [], newMembers);
        }
      }
    }
    return node;
  });
  classNames.size == 0 || error(`${classNames.size == 1 ? "Class" : "Classes"} "${Array.from(classNames.keys()).join(", ")}" not generated`);
  const imports = converter.getImports();
  if (imports && imports.length) {
    const index = firstAfter(newStatements, (statement) => statement.kind === ts81.SyntaxKind.ImportDeclaration || statement.kind === ts81.SyntaxKind.ImportEqualsDeclaration);
    newStatements = [...newStatements.slice(0, index), ...imports, ...prefix, ...newStatements.slice(index)];
  } else {
    newStatements = [...prefix, ...newStatements];
  }
  converter.updateSourceMap(newStatements);
  const newSourceFile = ts81.updateSourceFileNode(sourceFile, newStatements);
  return [newSourceFile, converter.getNodeMap()];
}
function firstAfter(a, predicate) {
  let index = 0;
  const len = a.length;
  for (; index < len; index++) {
    const value = a[index];
    if (predicate(value))
      break;
  }
  if (index >= len)
    return 0;
  for (; index < len; index++) {
    const value = a[index];
    if (!predicate(value))
      break;
  }
  return index;
}
function escapeLiteral(value) {
  return value.replace(/(\"|\\)/g, "\\$1").replace(/(\n)|(\r)/g, function(v, n, r) {
    return n ? "\\n" : "\\r";
  });
}
function createLiteral(value) {
  if (value === null) {
    return ts81.createNull();
  } else if (value === void 0) {
    return ts81.createIdentifier("undefined");
  } else {
    const result = ts81.createLiteral(value);
    if (ts81.isStringLiteral(result) && result.text.indexOf("\\") >= 0) {
      result.kind = ts81.SyntaxKind.NumericLiteral;
      result.text = `"${escapeLiteral(result.text)}"`;
    }
    return result;
  }
}
function isExportTypeStatement(statement) {
  return !!statement.modifiers && statement.modifiers.some((mod) => mod.kind === ts81.SyntaxKind.ExportKeyword);
}
var NodeEmitterVisitor = class {
  constructor(annotateForClosureCompiler) {
    this.annotateForClosureCompiler = annotateForClosureCompiler;
    this._nodeMap = new Map();
    this._importsWithPrefixes = new Map();
    this._reexports = new Map();
    this._templateSources = new Map();
    this._exportedVariableIdentifiers = new Map();
  }
  loadExportedVariableIdentifiers(sourceFile) {
    sourceFile.statements.forEach((statement) => {
      if (ts81.isVariableStatement(statement) && isExportTypeStatement(statement)) {
        statement.declarationList.declarations.forEach((declaration) => {
          if (ts81.isIdentifier(declaration.name)) {
            this._exportedVariableIdentifiers.set(declaration.name.text, declaration.name);
          }
        });
      }
    });
  }
  getReexports() {
    return Array.from(this._reexports.entries()).map(([exportedFilePath, reexports]) => ts81.createExportDeclaration(void 0, void 0, ts81.createNamedExports(reexports.map(({ name, as }) => ts81.createExportSpecifier(name, as))), createLiteral(exportedFilePath)));
  }
  getImports() {
    return Array.from(this._importsWithPrefixes.entries()).map(([namespace, prefix]) => ts81.createImportDeclaration(void 0, void 0, ts81.createImportClause(void 0, ts81.createNamespaceImport(ts81.createIdentifier(prefix))), createLiteral(namespace)));
  }
  getNodeMap() {
    return this._nodeMap;
  }
  updateSourceMap(statements) {
    let lastRangeStartNode = void 0;
    let lastRangeEndNode = void 0;
    let lastRange = void 0;
    const recordLastSourceRange = () => {
      if (lastRange && lastRangeStartNode && lastRangeEndNode) {
        if (lastRangeStartNode == lastRangeEndNode) {
          ts81.setSourceMapRange(lastRangeEndNode, lastRange);
        } else {
          ts81.setSourceMapRange(lastRangeStartNode, lastRange);
          ts81.setEmitFlags(lastRangeStartNode, ts81.EmitFlags.NoTrailingSourceMap);
          ts81.setSourceMapRange(lastRangeEndNode, lastRange);
          ts81.setEmitFlags(lastRangeEndNode, ts81.EmitFlags.NoLeadingSourceMap);
        }
      }
    };
    const visitNode = (tsNode) => {
      const ngNode = this._nodeMap.get(tsNode);
      if (ngNode) {
        const range = this.sourceRangeOf(ngNode);
        if (range) {
          if (!lastRange || range.source != lastRange.source || range.pos != lastRange.pos || range.end != lastRange.end) {
            recordLastSourceRange();
            lastRangeStartNode = tsNode;
            lastRange = range;
          }
          lastRangeEndNode = tsNode;
        }
      }
      ts81.forEachChild(tsNode, visitNode);
    };
    statements.forEach(visitNode);
    recordLastSourceRange();
  }
  postProcess(ngNode, tsNode) {
    if (tsNode && !this._nodeMap.has(tsNode)) {
      this._nodeMap.set(tsNode, ngNode);
    }
    if (tsNode !== null && ngNode instanceof Statement && ngNode.leadingComments !== void 0) {
      attachComments(tsNode, ngNode.leadingComments);
    }
    return tsNode;
  }
  sourceRangeOf(node) {
    if (node.sourceSpan) {
      const span = node.sourceSpan;
      if (span.start.file == span.end.file) {
        const file = span.start.file;
        if (file.url) {
          let source = this._templateSources.get(file);
          if (!source) {
            source = ts81.createSourceMapSource(file.url, file.content, (pos) => pos);
            this._templateSources.set(file, source);
          }
          return { pos: span.start.offset, end: span.end.offset, source };
        }
      }
    }
    return null;
  }
  getModifiers(stmt) {
    let modifiers = [];
    if (stmt.hasModifier(StmtModifier2.Exported)) {
      modifiers.push(ts81.createToken(ts81.SyntaxKind.ExportKeyword));
    }
    return modifiers;
  }
  visitDeclareVarStmt(stmt) {
    if (stmt.hasModifier(StmtModifier2.Exported) && stmt.value instanceof ExternalExpr10 && !stmt.type) {
      const { name, moduleName } = stmt.value.value;
      if (moduleName) {
        let reexports = this._reexports.get(moduleName);
        if (!reexports) {
          reexports = [];
          this._reexports.set(moduleName, reexports);
        }
        reexports.push({ name, as: stmt.name });
        return null;
      }
    }
    const varDeclList = ts81.createVariableDeclarationList([ts81.createVariableDeclaration(ts81.createIdentifier(stmt.name), void 0, stmt.value && stmt.value.visitExpression(this, null) || void 0)]);
    if (stmt.hasModifier(StmtModifier2.Exported)) {
      const tsVarStmt = this.postProcess(stmt, ts81.createVariableStatement([], varDeclList));
      const exportStmt = this.postProcess(stmt, ts81.createExportDeclaration(void 0, void 0, ts81.createNamedExports([ts81.createExportSpecifier(stmt.name, stmt.name)])));
      return [tsVarStmt, exportStmt];
    }
    return this.postProcess(stmt, ts81.createVariableStatement(this.getModifiers(stmt), varDeclList));
  }
  visitDeclareFunctionStmt(stmt) {
    return this.postProcess(stmt, ts81.createFunctionDeclaration(void 0, this.getModifiers(stmt), void 0, stmt.name, void 0, stmt.params.map((p2) => ts81.createParameter(void 0, void 0, void 0, p2.name)), void 0, this._visitStatements(stmt.statements)));
  }
  visitExpressionStmt(stmt) {
    return this.postProcess(stmt, ts81.createStatement(stmt.expr.visitExpression(this, null)));
  }
  visitReturnStmt(stmt) {
    return this.postProcess(stmt, ts81.createReturn(stmt.value ? stmt.value.visitExpression(this, null) : void 0));
  }
  visitDeclareClassStmt(stmt) {
    const modifiers = this.getModifiers(stmt);
    const fields = stmt.fields.map((field) => {
      const property = ts81.createProperty(void 0, translateModifiers(field.modifiers), field.name, void 0, void 0, field.initializer == null ? ts81.createNull() : field.initializer.visitExpression(this, null));
      if (this.annotateForClosureCompiler) {
        ts81.addSyntheticLeadingComment(property, ts81.SyntaxKind.MultiLineCommentTrivia, "* @nocollapse ", false);
      }
      return property;
    });
    const getters = stmt.getters.map((getter) => ts81.createGetAccessor(void 0, void 0, getter.name, [], void 0, this._visitStatements(getter.body)));
    const constructor = stmt.constructorMethod && [ts81.createConstructor(void 0, void 0, stmt.constructorMethod.params.map((p2) => ts81.createParameter(void 0, void 0, void 0, p2.name)), this._visitStatements(stmt.constructorMethod.body))] || [];
    const methods = stmt.methods.filter((method) => method.name).map((method) => ts81.createMethod(void 0, translateModifiers(method.modifiers), void 0, method.name, void 0, void 0, method.params.map((p2) => ts81.createParameter(void 0, void 0, void 0, p2.name)), void 0, this._visitStatements(method.body)));
    return this.postProcess(stmt, ts81.createClassDeclaration(void 0, modifiers, stmt.name, void 0, stmt.parent && [ts81.createHeritageClause(ts81.SyntaxKind.ExtendsKeyword, [stmt.parent.visitExpression(this, null)])] || [], [...fields, ...getters, ...constructor, ...methods]));
  }
  visitIfStmt(stmt) {
    return this.postProcess(stmt, ts81.createIf(stmt.condition.visitExpression(this, null), this._visitStatements(stmt.trueCase), stmt.falseCase && stmt.falseCase.length && this._visitStatements(stmt.falseCase) || void 0));
  }
  visitTryCatchStmt(stmt) {
    return this.postProcess(stmt, ts81.createTry(this._visitStatements(stmt.bodyStmts), ts81.createCatchClause(CATCH_ERROR_NAME, this._visitStatementsPrefix([ts81.createVariableStatement(void 0, [ts81.createVariableDeclaration(CATCH_STACK_NAME, void 0, ts81.createPropertyAccess(ts81.createIdentifier(CATCH_ERROR_NAME), ts81.createIdentifier(CATCH_STACK_NAME)))])], stmt.catchStmts)), void 0));
  }
  visitThrowStmt(stmt) {
    return this.postProcess(stmt, ts81.createThrow(stmt.error.visitExpression(this, null)));
  }
  visitWrappedNodeExpr(expr) {
    return this.postProcess(expr, expr.node);
  }
  visitTypeofExpr(expr) {
    const typeOf = ts81.createTypeOf(expr.expr.visitExpression(this, null));
    return this.postProcess(expr, typeOf);
  }
  visitReadVarExpr(expr) {
    switch (expr.builtin) {
      case BuiltinVar.This:
        return this.postProcess(expr, ts81.createIdentifier(METHOD_THIS_NAME));
      case BuiltinVar.CatchError:
        return this.postProcess(expr, ts81.createIdentifier(CATCH_ERROR_NAME));
      case BuiltinVar.CatchStack:
        return this.postProcess(expr, ts81.createIdentifier(CATCH_STACK_NAME));
      case BuiltinVar.Super:
        return this.postProcess(expr, ts81.createSuper());
    }
    if (expr.name) {
      return this.postProcess(expr, ts81.createIdentifier(expr.name));
    }
    throw Error(`Unexpected ReadVarExpr form`);
  }
  visitWriteVarExpr(expr) {
    return this.postProcess(expr, ts81.createAssignment(ts81.createIdentifier(expr.name), expr.value.visitExpression(this, null)));
  }
  visitWriteKeyExpr(expr) {
    return this.postProcess(expr, ts81.createAssignment(ts81.createElementAccess(expr.receiver.visitExpression(this, null), expr.index.visitExpression(this, null)), expr.value.visitExpression(this, null)));
  }
  visitWritePropExpr(expr) {
    return this.postProcess(expr, ts81.createAssignment(ts81.createPropertyAccess(expr.receiver.visitExpression(this, null), expr.name), expr.value.visitExpression(this, null)));
  }
  visitInvokeFunctionExpr(expr) {
    return this.postProcess(expr, ts81.createCall(expr.fn.visitExpression(this, null), void 0, expr.args.map((arg) => arg.visitExpression(this, null))));
  }
  visitTaggedTemplateExpr(expr) {
    throw new Error("tagged templates are not supported in pre-ivy mode.");
  }
  visitInstantiateExpr(expr) {
    return this.postProcess(expr, ts81.createNew(expr.classExpr.visitExpression(this, null), void 0, expr.args.map((arg) => arg.visitExpression(this, null))));
  }
  visitLiteralExpr(expr) {
    return this.postProcess(expr, createLiteral(expr.value));
  }
  visitLocalizedString(expr, context) {
    throw new Error("localized strings are not supported in pre-ivy mode.");
  }
  visitExternalExpr(expr) {
    return this.postProcess(expr, this._visitIdentifier(expr.value));
  }
  visitConditionalExpr(expr) {
    return this.postProcess(expr, ts81.createParen(ts81.createConditional(expr.condition.visitExpression(this, null), expr.trueCase.visitExpression(this, null), expr.falseCase.visitExpression(this, null))));
  }
  visitNotExpr(expr) {
    return this.postProcess(expr, ts81.createPrefix(ts81.SyntaxKind.ExclamationToken, expr.condition.visitExpression(this, null)));
  }
  visitAssertNotNullExpr(expr) {
    return expr.condition.visitExpression(this, null);
  }
  visitCastExpr(expr) {
    return expr.value.visitExpression(this, null);
  }
  visitFunctionExpr(expr) {
    return this.postProcess(expr, ts81.createFunctionExpression(void 0, void 0, expr.name || void 0, void 0, expr.params.map((p2) => ts81.createParameter(void 0, void 0, void 0, p2.name)), void 0, this._visitStatements(expr.statements)));
  }
  visitUnaryOperatorExpr(expr) {
    let unaryOperator;
    switch (expr.operator) {
      case UnaryOperator2.Minus:
        unaryOperator = ts81.SyntaxKind.MinusToken;
        break;
      case UnaryOperator2.Plus:
        unaryOperator = ts81.SyntaxKind.PlusToken;
        break;
      default:
        throw new Error(`Unknown operator: ${expr.operator}`);
    }
    const binary = ts81.createPrefix(unaryOperator, expr.expr.visitExpression(this, null));
    return this.postProcess(expr, expr.parens ? ts81.createParen(binary) : binary);
  }
  visitBinaryOperatorExpr(expr) {
    let binaryOperator;
    switch (expr.operator) {
      case BinaryOperator2.And:
        binaryOperator = ts81.SyntaxKind.AmpersandAmpersandToken;
        break;
      case BinaryOperator2.BitwiseAnd:
        binaryOperator = ts81.SyntaxKind.AmpersandToken;
        break;
      case BinaryOperator2.Bigger:
        binaryOperator = ts81.SyntaxKind.GreaterThanToken;
        break;
      case BinaryOperator2.BiggerEquals:
        binaryOperator = ts81.SyntaxKind.GreaterThanEqualsToken;
        break;
      case BinaryOperator2.Divide:
        binaryOperator = ts81.SyntaxKind.SlashToken;
        break;
      case BinaryOperator2.Equals:
        binaryOperator = ts81.SyntaxKind.EqualsEqualsToken;
        break;
      case BinaryOperator2.Identical:
        binaryOperator = ts81.SyntaxKind.EqualsEqualsEqualsToken;
        break;
      case BinaryOperator2.Lower:
        binaryOperator = ts81.SyntaxKind.LessThanToken;
        break;
      case BinaryOperator2.LowerEquals:
        binaryOperator = ts81.SyntaxKind.LessThanEqualsToken;
        break;
      case BinaryOperator2.Minus:
        binaryOperator = ts81.SyntaxKind.MinusToken;
        break;
      case BinaryOperator2.Modulo:
        binaryOperator = ts81.SyntaxKind.PercentToken;
        break;
      case BinaryOperator2.Multiply:
        binaryOperator = ts81.SyntaxKind.AsteriskToken;
        break;
      case BinaryOperator2.NotEquals:
        binaryOperator = ts81.SyntaxKind.ExclamationEqualsToken;
        break;
      case BinaryOperator2.NotIdentical:
        binaryOperator = ts81.SyntaxKind.ExclamationEqualsEqualsToken;
        break;
      case BinaryOperator2.Or:
        binaryOperator = ts81.SyntaxKind.BarBarToken;
        break;
      case BinaryOperator2.NullishCoalesce:
        binaryOperator = ts81.SyntaxKind.QuestionQuestionToken;
        break;
      case BinaryOperator2.Plus:
        binaryOperator = ts81.SyntaxKind.PlusToken;
        break;
      default:
        throw new Error(`Unknown operator: ${expr.operator}`);
    }
    const binary = ts81.createBinary(expr.lhs.visitExpression(this, null), binaryOperator, expr.rhs.visitExpression(this, null));
    return this.postProcess(expr, expr.parens ? ts81.createParen(binary) : binary);
  }
  visitReadPropExpr(expr) {
    return this.postProcess(expr, ts81.createPropertyAccess(expr.receiver.visitExpression(this, null), expr.name));
  }
  visitReadKeyExpr(expr) {
    return this.postProcess(expr, ts81.createElementAccess(expr.receiver.visitExpression(this, null), expr.index.visitExpression(this, null)));
  }
  visitLiteralArrayExpr(expr) {
    return this.postProcess(expr, ts81.createArrayLiteral(expr.entries.map((entry) => entry.visitExpression(this, null))));
  }
  visitLiteralMapExpr(expr) {
    return this.postProcess(expr, ts81.createObjectLiteral(expr.entries.map((entry) => ts81.createPropertyAssignment(entry.quoted || !_VALID_IDENTIFIER_RE.test(entry.key) ? ts81.createLiteral(entry.key) : entry.key, entry.value.visitExpression(this, null)))));
  }
  visitCommaExpr(expr) {
    return this.postProcess(expr, expr.parts.map((e) => e.visitExpression(this, null)).reduce((left, right) => left ? ts81.createBinary(left, ts81.SyntaxKind.CommaToken, right) : right, null));
  }
  _visitStatements(statements) {
    return this._visitStatementsPrefix([], statements);
  }
  _visitStatementsPrefix(prefix, statements) {
    return ts81.createBlock([
      ...prefix,
      ...statements.map((stmt) => stmt.visitStatement(this, null)).filter((f) => f != null)
    ]);
  }
  _visitIdentifier(value) {
    const moduleName = value.moduleName, name = value.name;
    let prefixIdent = null;
    if (moduleName) {
      let prefix = this._importsWithPrefixes.get(moduleName);
      if (prefix == null) {
        prefix = `i${this._importsWithPrefixes.size}`;
        this._importsWithPrefixes.set(moduleName, prefix);
      }
      prefixIdent = ts81.createIdentifier(prefix);
    }
    if (prefixIdent) {
      return ts81.createPropertyAccess(prefixIdent, name);
    } else {
      const id = ts81.createIdentifier(name);
      if (this._exportedVariableIdentifiers.has(name)) {
        ts81.setOriginalNode(id, this._exportedVariableIdentifiers.get(name));
      }
      return id;
    }
  }
};
function modifierFromModifier(modifier) {
  switch (modifier) {
    case StmtModifier2.Exported:
      return ts81.createToken(ts81.SyntaxKind.ExportKeyword);
    case StmtModifier2.Final:
      return ts81.createToken(ts81.SyntaxKind.ConstKeyword);
    case StmtModifier2.Private:
      return ts81.createToken(ts81.SyntaxKind.PrivateKeyword);
    case StmtModifier2.Static:
      return ts81.createToken(ts81.SyntaxKind.StaticKeyword);
  }
}
function translateModifiers(modifiers) {
  return modifiers == null ? void 0 : modifiers.map(modifierFromModifier);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/node_emitter_transform.mjs
function getPreamble(original) {
  return `*
 * @fileoverview This file was generated by the Angular template compiler. Do not edit.
 * ${original}
 * @suppress {suspiciousCode,uselessCode,missingProperties,missingOverride,checkTypes,extraRequire}
 * tslint:disable
 `;
}
function getAngularEmitterTransformFactory(generatedFiles, program, annotateForClosureCompiler) {
  return function() {
    const emitter = new TypeScriptNodeEmitter(annotateForClosureCompiler);
    return function(sourceFile) {
      const g = generatedFiles.get(sourceFile.fileName);
      const orig = g && program.getSourceFile(g.srcFileUrl);
      let originalComment = "";
      if (orig)
        originalComment = getFileoverviewComment2(orig);
      const preamble = getPreamble(originalComment);
      if (g && g.stmts) {
        const [newSourceFile] = emitter.updateSourceFile(sourceFile, g.stmts, preamble);
        return newSourceFile;
      } else if (GENERATED_FILES.test(sourceFile.fileName)) {
        const commentStmt = ts82.createNotEmittedStatement(sourceFile);
        ts82.addSyntheticLeadingComment(commentStmt, ts82.SyntaxKind.MultiLineCommentTrivia, preamble, true);
        return ts82.updateSourceFileNode(sourceFile, [commentStmt]);
      }
      return sourceFile;
    };
  };
}
function getFileoverviewComment2(sourceFile) {
  const trivia = sourceFile.getFullText().substring(0, sourceFile.getStart());
  const leadingComments = ts82.getLeadingCommentRanges(trivia, 0);
  if (!leadingComments || leadingComments.length === 0)
    return "";
  const comment = leadingComments[0];
  if (comment.kind !== ts82.SyntaxKind.MultiLineCommentTrivia)
    return "";
  if (sourceFile.getFullText().substring(comment.end, comment.end + 2) !== "\n\n")
    return "";
  const commentText = sourceFile.getFullText().substring(comment.pos, comment.end);
  if (commentText.indexOf("@license") !== -1)
    return "";
  return stripComment(commentText).replace(/^\*\s+/, "");
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/r3_metadata_transform.mjs
import { ClassStmt as ClassStmt2, StmtModifier as StmtModifier3 } from "@angular/compiler";
import ts83 from "typescript";
var PartialModuleMetadataTransformer = class {
  constructor(modules) {
    this.moduleMap = new Map(modules.map((m) => [m.fileName, m]));
  }
  start(sourceFile) {
    const partialModule = this.moduleMap.get(sourceFile.fileName);
    if (partialModule) {
      const classMap = new Map(partialModule.statements.filter(isClassStmt).map((s) => [s.name, s]));
      if (classMap.size > 0) {
        return (value, node) => {
          if (isClassMetadata(value) && node.kind === ts83.SyntaxKind.ClassDeclaration) {
            const classDeclaration = node;
            if (classDeclaration.name) {
              const partialClass = classMap.get(classDeclaration.name.text);
              if (partialClass) {
                for (const field of partialClass.fields) {
                  if (field.name && field.modifiers && field.modifiers.some((modifier) => modifier === StmtModifier3.Static)) {
                    value.statics = __spreadProps(__spreadValues({}, value.statics || {}), { [field.name]: {} });
                  }
                }
              }
            }
          }
          return value;
        };
      }
    }
  }
};
function isClassStmt(v) {
  return v instanceof ClassStmt2;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/r3_transform.mjs
function getAngularClassTransformerFactory(modules, annotateForClosureCompiler) {
  if (modules.length === 0) {
    return () => (sf) => sf;
  }
  const moduleMap = new Map(modules.map((m) => [m.fileName, m]));
  return function(context) {
    return function(sourceFile) {
      const module2 = moduleMap.get(sourceFile.fileName);
      if (module2 && module2.statements.length > 0) {
        const [newSourceFile] = updateSourceFile(sourceFile, module2, annotateForClosureCompiler);
        return newSourceFile;
      }
      return sourceFile;
    };
  };
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/program.mjs
var MAX_FILE_COUNT_FOR_SINGLE_FILE_EMIT = 20;
var VE_DISABLED_MESSAGE = `
This compilation is using the View Engine compiler which is no longer supported by the Angular team
and is being removed. Please upgrade to the Ivy compiler by switching to \`NgtscProgram\`. See
https://angular.io/guide/ivy for more information.
`.trim().split("\n").join(" ");
var LOWER_FIELDS = ["useValue", "useFactory", "data", "id", "loadChildren"];
var R3_LOWER_FIELDS = [...LOWER_FIELDS, "providers", "imports", "exports"];
var tempProgramHandlerForTest = null;
var emptyModules = {
  ngModules: [],
  ngModuleByPipeOrDirective: new Map(),
  files: []
};
var defaultEmitCallback2 = ({ program, targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers }) => program.emit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers);
var AngularCompilerProgram = class {
  constructor(rootNames, options, host, oldProgram) {
    this.options = options;
    this.host = host;
    this._optionsDiagnostics = [];
    this._transformTsDiagnostics = [];
    this._isCompilingAngularCore = null;
    if (true) {
      throw new Error(VE_DISABLED_MESSAGE);
    }
    this.rootNames = [...rootNames];
    if (!options.disableTypeScriptVersionCheck) {
      verifySupportedTypeScriptVersion();
    }
    this.oldTsProgram = oldProgram ? oldProgram.getTsProgram() : void 0;
    if (oldProgram) {
      this.oldProgramLibrarySummaries = oldProgram.getLibrarySummaries();
      this.oldProgramEmittedGeneratedFiles = oldProgram.getEmittedGeneratedFiles();
      this.oldProgramEmittedSourceFiles = oldProgram.getEmittedSourceFiles();
    }
    if (options.flatModuleOutFile) {
      const { host: bundleHost, indexName, errors } = createBundleIndexHost(options, this.rootNames, host, () => this.flatModuleMetadataCache);
      if (errors) {
        this._optionsDiagnostics.push(...errors.map((e) => ({
          category: e.category,
          messageText: e.messageText,
          source: SOURCE,
          code: DEFAULT_ERROR_CODE
        })));
      } else {
        this.rootNames.push(indexName);
        this.host = bundleHost;
      }
    }
    this.loweringMetadataTransform = new LowerMetadataTransform(options.enableIvy !== false ? R3_LOWER_FIELDS : LOWER_FIELDS);
    this.metadataCache = this.createMetadataCache([this.loweringMetadataTransform]);
  }
  createMetadataCache(transformers) {
    return new MetadataCache(new MetadataCollector({ quotedNames: true }), !!this.options.strictMetadataEmit, transformers);
  }
  getLibrarySummaries() {
    const result = new Map();
    if (this.oldProgramLibrarySummaries) {
      this.oldProgramLibrarySummaries.forEach((summary, fileName) => result.set(fileName, summary));
    }
    if (this.emittedLibrarySummaries) {
      this.emittedLibrarySummaries.forEach((summary, fileName) => result.set(summary.fileName, summary));
    }
    return result;
  }
  getEmittedGeneratedFiles() {
    const result = new Map();
    if (this.oldProgramEmittedGeneratedFiles) {
      this.oldProgramEmittedGeneratedFiles.forEach((genFile, fileName) => result.set(fileName, genFile));
    }
    if (this.emittedGeneratedFiles) {
      this.emittedGeneratedFiles.forEach((genFile) => result.set(genFile.genFileUrl, genFile));
    }
    return result;
  }
  getEmittedSourceFiles() {
    const result = new Map();
    if (this.oldProgramEmittedSourceFiles) {
      this.oldProgramEmittedSourceFiles.forEach((sf, fileName) => result.set(fileName, sf));
    }
    if (this.emittedSourceFiles) {
      this.emittedSourceFiles.forEach((sf) => result.set(sf.fileName, sf));
    }
    return result;
  }
  getTsProgram() {
    return this.tsProgram;
  }
  getTsOptionDiagnostics(cancellationToken) {
    return this.tsProgram.getOptionsDiagnostics(cancellationToken);
  }
  getNgOptionDiagnostics(cancellationToken) {
    return [...this._optionsDiagnostics, ...getNgOptionDiagnostics(this.options)];
  }
  getTsSyntacticDiagnostics(sourceFile, cancellationToken) {
    return this.tsProgram.getSyntacticDiagnostics(sourceFile, cancellationToken);
  }
  getNgStructuralDiagnostics(cancellationToken) {
    return this.structuralDiagnostics;
  }
  getTsSemanticDiagnostics(sourceFile, cancellationToken) {
    const sourceFiles = sourceFile ? [sourceFile] : this.tsProgram.getSourceFiles();
    let diags = [];
    sourceFiles.forEach((sf) => {
      if (!GENERATED_FILES.test(sf.fileName)) {
        diags.push(...this.tsProgram.getSemanticDiagnostics(sf, cancellationToken));
      }
    });
    return diags;
  }
  getNgSemanticDiagnostics(fileName, cancellationToken) {
    let diags = [];
    this.tsProgram.getSourceFiles().forEach((sf) => {
      if (GENERATED_FILES.test(sf.fileName) && !sf.isDeclarationFile) {
        diags.push(...this.tsProgram.getSemanticDiagnostics(sf, cancellationToken));
      }
    });
    const { ng: ng2 } = translateDiagnostics(this.hostAdapter, diags);
    return ng2;
  }
  loadNgStructureAsync() {
    if (this._analyzedModules) {
      throw new Error("Angular structure already loaded");
    }
    return Promise.resolve().then(() => {
      const { tmpProgram, sourceFiles, tsFiles, rootNames } = this._createProgramWithBasicStubs();
      return this.compiler.loadFilesAsync(sourceFiles, tsFiles).then(({ analyzedModules, analyzedInjectables }) => {
        if (this._analyzedModules) {
          throw new Error("Angular structure loaded both synchronously and asynchronously");
        }
        this._updateProgramWithTypeCheckStubs(tmpProgram, analyzedModules, analyzedInjectables, rootNames);
      });
    }).catch((e) => this._createProgramOnError(e));
  }
  listLazyRoutes(route) {
    return [];
  }
  emit(parameters = {}) {
    if (this.options.enableIvy !== false) {
      throw new Error("Cannot run legacy compiler in ngtsc mode");
    }
    return this._emitRender2(parameters);
  }
  _emitRender2({ emitFlags = EmitFlags.Default, cancellationToken, customTransformers, emitCallback = defaultEmitCallback2, mergeEmitResultsCallback = mergeEmitResults2 } = {}) {
    const emitStart = Date.now();
    if (emitFlags & EmitFlags.I18nBundle) {
      const locale = this.options.i18nOutLocale || null;
      const file = this.options.i18nOutFile || null;
      const format = this.options.i18nOutFormat || null;
      const bundle = this.compiler.emitMessageBundle(this.analyzedModules, locale);
      i18nExtract(format, file, this.host, this.options, bundle);
    }
    if ((emitFlags & (EmitFlags.JS | EmitFlags.DTS | EmitFlags.Metadata | EmitFlags.Codegen)) === 0) {
      return { emitSkipped: true, diagnostics: [], emittedFiles: [] };
    }
    let { genFiles, genDiags } = this.generateFilesForEmit(emitFlags);
    if (genDiags.length) {
      return {
        diagnostics: genDiags,
        emitSkipped: true,
        emittedFiles: []
      };
    }
    this.emittedGeneratedFiles = genFiles;
    const outSrcMapping = [];
    const genFileByFileName = new Map();
    genFiles.forEach((genFile) => genFileByFileName.set(genFile.genFileUrl, genFile));
    this.emittedLibrarySummaries = [];
    this._transformTsDiagnostics = [];
    const emittedSourceFiles = [];
    const writeTsFile = (outFileName, outData, writeByteOrderMark, onError, sourceFiles) => {
      const sourceFile = sourceFiles && sourceFiles.length == 1 ? sourceFiles[0] : null;
      let genFile;
      if (sourceFile) {
        outSrcMapping.push({ outFileName, sourceFile });
        genFile = genFileByFileName.get(sourceFile.fileName);
        if (!sourceFile.isDeclarationFile && !GENERATED_FILES.test(sourceFile.fileName)) {
          const originalFile = this.tsProgram.getSourceFile(sourceFile.fileName);
          if (originalFile) {
            emittedSourceFiles.push(originalFile);
          }
        }
      }
      this.writeFile(outFileName, outData, writeByteOrderMark, onError, genFile, sourceFiles);
    };
    const modules = this._analyzedInjectables && this.compiler.emitAllPartialModules2(this._analyzedInjectables);
    const tsCustomTransformers = this.calculateTransforms(genFileByFileName, modules, customTransformers);
    const emitOnlyDtsFiles = (emitFlags & (EmitFlags.DTS | EmitFlags.JS)) == EmitFlags.DTS;
    const augmentedReferences = new Map();
    for (const sourceFile of this.tsProgram.getSourceFiles()) {
      const originalReferences = getOriginalReferences(sourceFile);
      if (originalReferences) {
        augmentedReferences.set(sourceFile, sourceFile.referencedFiles);
        sourceFile.referencedFiles = originalReferences;
      }
    }
    const genTsFiles = [];
    const genJsonFiles = [];
    genFiles.forEach((gf) => {
      if (gf.stmts) {
        genTsFiles.push(gf);
      }
      if (gf.source) {
        genJsonFiles.push(gf);
      }
    });
    let emitResult;
    let emittedUserTsCount;
    try {
      const sourceFilesToEmit = this.getSourceFilesForEmit();
      if (sourceFilesToEmit && sourceFilesToEmit.length + genTsFiles.length < MAX_FILE_COUNT_FOR_SINGLE_FILE_EMIT) {
        const fileNamesToEmit = [...sourceFilesToEmit.map((sf) => sf.fileName), ...genTsFiles.map((gf) => gf.genFileUrl)];
        emitResult = mergeEmitResultsCallback(fileNamesToEmit.map((fileName) => emitResult = emitCallback({
          program: this.tsProgram,
          host: this.host,
          options: this.options,
          writeFile: writeTsFile,
          emitOnlyDtsFiles,
          customTransformers: tsCustomTransformers,
          targetSourceFile: this.tsProgram.getSourceFile(fileName)
        })));
        emittedUserTsCount = sourceFilesToEmit.length;
      } else {
        emitResult = emitCallback({
          program: this.tsProgram,
          host: this.host,
          options: this.options,
          writeFile: writeTsFile,
          emitOnlyDtsFiles,
          customTransformers: tsCustomTransformers
        });
        emittedUserTsCount = this.tsProgram.getSourceFiles().length - genTsFiles.length;
      }
    } finally {
      for (const [sourceFile, references] of Array.from(augmentedReferences)) {
        sourceFile.referencedFiles = references;
      }
    }
    this.emittedSourceFiles = emittedSourceFiles;
    if (emitResult && this.options.noEmitOnError === true) {
      const translatedEmitDiags = translateDiagnostics(this.hostAdapter, emitResult.diagnostics);
      emitResult.diagnostics = translatedEmitDiags.ts.concat(this.structuralDiagnostics.concat(translatedEmitDiags.ng).map(ngToTsDiagnostic));
    }
    if (emitResult && !outSrcMapping.length) {
      emitResult.diagnostics = emitResult.diagnostics.concat([createMessageDiagnostic(`Emitted no files.`)]);
      return emitResult;
    }
    let sampleSrcFileName;
    let sampleOutFileName;
    if (outSrcMapping.length) {
      sampleSrcFileName = outSrcMapping[0].sourceFile.fileName;
      sampleOutFileName = outSrcMapping[0].outFileName;
    }
    const srcToOutPath = createSrcToOutPathMapper(this.options.outDir, sampleSrcFileName, sampleOutFileName);
    if (emitFlags & EmitFlags.Codegen) {
      genJsonFiles.forEach((gf) => {
        const outFileName = srcToOutPath(gf.genFileUrl);
        this.writeFile(outFileName, gf.source, false, void 0, gf);
      });
    }
    let metadataJsonCount = 0;
    if (emitFlags & EmitFlags.Metadata) {
      this.tsProgram.getSourceFiles().forEach((sf) => {
        if (!sf.isDeclarationFile && !GENERATED_FILES.test(sf.fileName)) {
          metadataJsonCount++;
          const metadata = this.metadataCache.getMetadata(sf);
          if (metadata) {
            const metadataText = JSON.stringify([metadata]);
            const outFileName = srcToOutPath(sf.fileName.replace(/\.tsx?$/, ".metadata.json"));
            this.writeFile(outFileName, metadataText, false, void 0, void 0, [sf]);
          }
        }
      });
    }
    const emitEnd = Date.now();
    if (emitResult && this.options.diagnostics) {
      emitResult.diagnostics = emitResult.diagnostics.concat([createMessageDiagnostic([
        `Emitted in ${emitEnd - emitStart}ms`,
        `- ${emittedUserTsCount} user ts files`,
        `- ${genTsFiles.length} generated ts files`,
        `- ${genJsonFiles.length + metadataJsonCount} generated json files`
      ].join("\n"))]);
    }
    return emitResult;
  }
  get compiler() {
    if (!this._compiler) {
      this._createCompiler();
    }
    return this._compiler;
  }
  get hostAdapter() {
    if (!this._hostAdapter) {
      this._createCompiler();
    }
    return this._hostAdapter;
  }
  get analyzedModules() {
    if (!this._analyzedModules) {
      this.initSync();
    }
    return this._analyzedModules;
  }
  get structuralDiagnostics() {
    let diagnostics = this._structuralDiagnostics;
    if (!diagnostics) {
      this.initSync();
      diagnostics = this._structuralDiagnostics = this._structuralDiagnostics || [];
    }
    return diagnostics;
  }
  get tsProgram() {
    if (!this._tsProgram) {
      this.initSync();
    }
    return this._tsProgram;
  }
  get isCompilingAngularCore() {
    if (this._isCompilingAngularCore !== null) {
      return this._isCompilingAngularCore;
    }
    return this._isCompilingAngularCore = isAngularCorePackage(this.tsProgram);
  }
  calculateTransforms(genFiles, partialModules, customTransformers) {
    const beforeTs = [];
    const metadataTransforms = [];
    const flatModuleMetadataTransforms = [];
    const annotateForClosureCompiler = this.options.annotateForClosureCompiler || false;
    if (this.options.enableResourceInlining) {
      beforeTs.push(getInlineResourcesTransformFactory(this.tsProgram, this.hostAdapter));
      const transformer = new InlineResourcesMetadataTransformer(this.hostAdapter);
      metadataTransforms.push(transformer);
      flatModuleMetadataTransforms.push(transformer);
    }
    if (!this.options.disableExpressionLowering) {
      beforeTs.push(getExpressionLoweringTransformFactory(this.loweringMetadataTransform, this.tsProgram));
      metadataTransforms.push(this.loweringMetadataTransform);
    }
    if (genFiles) {
      beforeTs.push(getAngularEmitterTransformFactory(genFiles, this.getTsProgram(), annotateForClosureCompiler));
    }
    if (partialModules) {
      beforeTs.push(getAngularClassTransformerFactory(partialModules, annotateForClosureCompiler));
      const transformer = new PartialModuleMetadataTransformer(partialModules);
      metadataTransforms.push(transformer);
      flatModuleMetadataTransforms.push(transformer);
    }
    if (customTransformers && customTransformers.beforeTs) {
      beforeTs.push(...customTransformers.beforeTs);
    }
    if (this.options.annotationsAs !== "decorators") {
      const typeChecker = this.getTsProgram().getTypeChecker();
      const reflectionHost = new TypeScriptReflectionHost(typeChecker);
      beforeTs.push(getDownlevelDecoratorsTransform(typeChecker, reflectionHost, [], this.isCompilingAngularCore, annotateForClosureCompiler, false));
    }
    if (metadataTransforms.length > 0) {
      this.metadataCache = this.createMetadataCache(metadataTransforms);
    }
    if (flatModuleMetadataTransforms.length > 0) {
      this.flatModuleMetadataCache = this.createMetadataCache(flatModuleMetadataTransforms);
    }
    const afterTs = customTransformers ? customTransformers.afterTs : void 0;
    return { before: beforeTs, after: afterTs };
  }
  initSync() {
    if (this._analyzedModules) {
      return;
    }
    try {
      const { tmpProgram, sourceFiles, tsFiles, rootNames } = this._createProgramWithBasicStubs();
      const { analyzedModules, analyzedInjectables } = this.compiler.loadFilesSync(sourceFiles, tsFiles);
      this._updateProgramWithTypeCheckStubs(tmpProgram, analyzedModules, analyzedInjectables, rootNames);
    } catch (e) {
      this._createProgramOnError(e);
    }
  }
  _createCompiler() {
    const codegen = {
      generateFile: (genFileName, baseFileName) => this._compiler.emitBasicStub(genFileName, baseFileName),
      findGeneratedFileNames: (fileName) => this._compiler.findGeneratedFileNames(fileName)
    };
    this._hostAdapter = new TsCompilerAotCompilerTypeCheckHostAdapter(this.rootNames, this.options, this.host, this.metadataCache, codegen, this.oldProgramLibrarySummaries);
    const aotOptions = getAotCompilerOptions(this.options);
    const errorCollector = this.options.collectAllErrors || this.options.fullTemplateTypeCheck ? (err) => this._addStructuralDiagnostics(err) : void 0;
    this._compiler = createAotCompiler(this._hostAdapter, aotOptions, errorCollector).compiler;
  }
  _createProgramWithBasicStubs() {
    if (this._analyzedModules) {
      throw new Error(`Internal Error: already initialized!`);
    }
    const oldTsProgram = this.oldTsProgram;
    this.oldTsProgram = void 0;
    const codegen = {
      generateFile: (genFileName, baseFileName) => this.compiler.emitBasicStub(genFileName, baseFileName),
      findGeneratedFileNames: (fileName) => this.compiler.findGeneratedFileNames(fileName)
    };
    let rootNames = [...this.rootNames];
    if (this.options.generateCodeForLibraries !== false) {
      rootNames = rootNames.filter((fn) => !GENERATED_FILES.test(fn));
    }
    if (this.options.noResolve) {
      this.rootNames.forEach((rootName) => {
        if (this.hostAdapter.shouldGenerateFilesFor(rootName)) {
          rootNames.push(...this.compiler.findGeneratedFileNames(rootName));
        }
      });
    }
    const tmpProgram = ts84.createProgram(rootNames, this.options, this.hostAdapter, oldTsProgram);
    if (tempProgramHandlerForTest !== null) {
      tempProgramHandlerForTest(tmpProgram);
    }
    const sourceFiles = [];
    const tsFiles = [];
    tmpProgram.getSourceFiles().forEach((sf) => {
      if (this.hostAdapter.isSourceFile(sf.fileName)) {
        sourceFiles.push(sf.fileName);
      }
      if (TS.test(sf.fileName) && !DTS2.test(sf.fileName)) {
        tsFiles.push(sf.fileName);
      }
    });
    return { tmpProgram, sourceFiles, tsFiles, rootNames };
  }
  _updateProgramWithTypeCheckStubs(tmpProgram, analyzedModules, analyzedInjectables, rootNames) {
    this._analyzedModules = analyzedModules;
    this._analyzedInjectables = analyzedInjectables;
    tmpProgram.getSourceFiles().forEach((sf) => {
      if (sf.fileName.endsWith(".ngfactory.ts")) {
        const { generate, baseFileName } = this.hostAdapter.shouldGenerateFile(sf.fileName);
        if (generate) {
          const genFile = this.compiler.emitTypeCheckStub(sf.fileName, baseFileName);
          if (genFile) {
            this.hostAdapter.updateGeneratedFile(genFile);
          }
        }
      }
    });
    this._tsProgram = ts84.createProgram(rootNames, this.options, this.hostAdapter, tmpProgram);
    if (tsStructureIsReused(this._tsProgram) !== 2) {
      throw new Error(`Internal Error: The structure of the program changed during codegen.`);
    }
  }
  _createProgramOnError(e) {
    this._analyzedModules = emptyModules;
    this.oldTsProgram = void 0;
    this._hostAdapter.isSourceFile = () => false;
    this._tsProgram = ts84.createProgram(this.rootNames, this.options, this.hostAdapter);
    if (isSyntaxError(e)) {
      this._addStructuralDiagnostics(e);
      return;
    }
    throw e;
  }
  _addStructuralDiagnostics(error2) {
    const diagnostics = this._structuralDiagnostics || (this._structuralDiagnostics = []);
    if (isSyntaxError(error2)) {
      diagnostics.push(...syntaxErrorToDiagnostics(error2, this.tsProgram));
    } else {
      diagnostics.push({
        messageText: error2.toString(),
        category: ts84.DiagnosticCategory.Error,
        source: SOURCE,
        code: DEFAULT_ERROR_CODE
      });
    }
  }
  generateFilesForEmit(emitFlags) {
    try {
      if (!(emitFlags & EmitFlags.Codegen)) {
        return { genFiles: [], genDiags: [] };
      }
      let genFiles = this.compiler.emitAllImpls(this.analyzedModules).filter((genFile) => isInRootDir(genFile.genFileUrl, this.options));
      if (this.oldProgramEmittedGeneratedFiles) {
        const oldProgramEmittedGeneratedFiles = this.oldProgramEmittedGeneratedFiles;
        genFiles = genFiles.filter((genFile) => {
          const oldGenFile = oldProgramEmittedGeneratedFiles.get(genFile.genFileUrl);
          return !oldGenFile || !genFile.isEquivalent(oldGenFile);
        });
      }
      return { genFiles, genDiags: [] };
    } catch (e) {
      if (isSyntaxError(e)) {
        const genDiags = [{
          file: void 0,
          start: void 0,
          length: void 0,
          messageText: e.message,
          category: ts84.DiagnosticCategory.Error,
          source: SOURCE,
          code: DEFAULT_ERROR_CODE
        }];
        return { genFiles: [], genDiags };
      }
      throw e;
    }
  }
  getSourceFilesForEmit() {
    let sourceFilesToEmit = this.tsProgram.getSourceFiles().filter((sf) => {
      return !sf.isDeclarationFile && !GENERATED_FILES.test(sf.fileName);
    });
    if (this.oldProgramEmittedSourceFiles) {
      sourceFilesToEmit = sourceFilesToEmit.filter((sf) => {
        const oldFile = this.oldProgramEmittedSourceFiles.get(sf.fileName);
        return sf !== oldFile;
      });
    }
    return sourceFilesToEmit;
  }
  writeFile(outFileName, outData, writeByteOrderMark, onError, genFile, sourceFiles) {
    let baseFile;
    if (genFile) {
      baseFile = this.tsProgram.getSourceFile(genFile.srcFileUrl);
      if (baseFile) {
        if (!this.emittedLibrarySummaries) {
          this.emittedLibrarySummaries = [];
        }
        if (genFile.genFileUrl.endsWith(".ngsummary.json") && baseFile.fileName.endsWith(".d.ts")) {
          this.emittedLibrarySummaries.push({
            fileName: baseFile.fileName,
            text: baseFile.text,
            sourceFile: baseFile
          });
          this.emittedLibrarySummaries.push({ fileName: genFile.genFileUrl, text: outData });
          if (!this.options.declaration) {
            const ngFactoryDts = genFile.genFileUrl.substring(0, genFile.genFileUrl.length - 15) + ".ngfactory.d.ts";
            this.emittedLibrarySummaries.push({ fileName: ngFactoryDts, text: "" });
          }
        } else if (outFileName.endsWith(".d.ts") && baseFile.fileName.endsWith(".d.ts")) {
          const dtsSourceFilePath = genFile.genFileUrl.replace(/\.ts$/, ".d.ts");
          this.emittedLibrarySummaries.push({ fileName: dtsSourceFilePath, text: outData });
        }
      }
    }
    const isGenerated = GENERATED_FILES.test(outFileName);
    if (isGenerated && !this.options.allowEmptyCodegenFiles && (!genFile || !genFile.stmts || genFile.stmts.length === 0)) {
      return;
    }
    if (baseFile) {
      sourceFiles = sourceFiles ? [...sourceFiles, baseFile] : [baseFile];
    }
    this.host.writeFile(outFileName, outData, writeByteOrderMark, onError, sourceFiles);
  }
};
function createProgram({ rootNames, options, host, oldProgram }) {
  if (options.enableIvy !== false) {
    return new NgtscProgram(rootNames, options, host, oldProgram);
  } else {
    return new AngularCompilerProgram(rootNames, options, host, oldProgram);
  }
}
function getAotCompilerOptions(options) {
  let missingTranslation = core.MissingTranslationStrategy.Warning;
  switch (options.i18nInMissingTranslations) {
    case "ignore":
      missingTranslation = core.MissingTranslationStrategy.Ignore;
      break;
    case "error":
      missingTranslation = core.MissingTranslationStrategy.Error;
      break;
  }
  let translations = "";
  if (options.i18nInFile) {
    if (!options.i18nInLocale) {
      throw new Error(`The translation file (${options.i18nInFile}) locale must be provided.`);
    }
    translations = readFileSync2(options.i18nInFile, "utf8");
  } else {
    missingTranslation = core.MissingTranslationStrategy.Ignore;
  }
  return {
    locale: options.i18nInLocale,
    i18nFormat: options.i18nInFormat || options.i18nOutFormat,
    i18nUseExternalIds: options.i18nUseExternalIds,
    translations,
    missingTranslation,
    enableSummariesForJit: options.enableSummariesForJit,
    preserveWhitespaces: options.preserveWhitespaces,
    fullTemplateTypeCheck: options.fullTemplateTypeCheck,
    allowEmptyCodegenFiles: options.allowEmptyCodegenFiles,
    enableIvy: options.enableIvy,
    createExternalSymbolFactoryReexports: options.createExternalSymbolFactoryReexports
  };
}
function getNgOptionDiagnostics(options) {
  if (options.annotationsAs) {
    switch (options.annotationsAs) {
      case "decorators":
      case "static fields":
        break;
      default:
        return [{
          messageText: 'Angular compiler options "annotationsAs" only supports "static fields" and "decorators"',
          category: ts84.DiagnosticCategory.Error,
          source: SOURCE,
          code: DEFAULT_ERROR_CODE
        }];
    }
  }
  return [];
}
function normalizeSeparators3(path8) {
  return path8.replace(/\\/g, "/");
}
function createSrcToOutPathMapper(outDir, sampleSrcFileName, sampleOutFileName, host = path6) {
  if (outDir) {
    let path8 = {};
    if (sampleSrcFileName == null || sampleOutFileName == null) {
      throw new Error(`Can't calculate the rootDir without a sample srcFileName / outFileName. `);
    }
    const srcFileDir = normalizeSeparators3(host.dirname(sampleSrcFileName));
    const outFileDir = normalizeSeparators3(host.dirname(sampleOutFileName));
    if (srcFileDir === outFileDir) {
      return (srcFileName) => srcFileName;
    }
    const srcDirParts = srcFileDir.split("/");
    const outDirParts = normalizeSeparators3(host.relative(outDir, outFileDir)).split("/");
    let i = 0;
    while (i < Math.min(srcDirParts.length, outDirParts.length) && srcDirParts[srcDirParts.length - 1 - i] === outDirParts[outDirParts.length - 1 - i])
      i++;
    const rootDir = srcDirParts.slice(0, srcDirParts.length - i).join("/");
    return (srcFileName) => {
      return normalizeSeparators3(host.resolve(outDir, host.relative(rootDir, srcFileName)));
    };
  } else {
    return (srcFileName) => normalizeSeparators3(srcFileName);
  }
}
function mergeEmitResults2(emitResults) {
  const diagnostics = [];
  let emitSkipped = false;
  const emittedFiles = [];
  for (const er of emitResults) {
    diagnostics.push(...er.diagnostics);
    emitSkipped = emitSkipped || er.emitSkipped;
    emittedFiles.push(...er.emittedFiles || []);
  }
  return { diagnostics, emitSkipped, emittedFiles };
}
function diagnosticSourceOfSpan(span) {
  return { fileName: span.start.file.url, text: span.start.file.content };
}
function diagnosticChainFromFormattedDiagnosticChain(chain) {
  return {
    messageText: chain.message,
    next: chain.next && chain.next.map(diagnosticChainFromFormattedDiagnosticChain),
    position: chain.position
  };
}
function syntaxErrorToDiagnostics(error2, program) {
  const parserErrors = getParseErrors(error2);
  if (parserErrors && parserErrors.length) {
    return parserErrors.map((e) => ({
      messageText: e.contextualMessage(),
      file: diagnosticSourceOfSpan(e.span),
      start: e.span.start.offset,
      length: e.span.end.offset - e.span.start.offset,
      category: ts84.DiagnosticCategory.Error,
      source: SOURCE,
      code: DEFAULT_ERROR_CODE
    }));
  } else if (isFormattedError(error2)) {
    return [{
      messageText: error2.message,
      chain: error2.chain && diagnosticChainFromFormattedDiagnosticChain(error2.chain),
      category: ts84.DiagnosticCategory.Error,
      source: SOURCE,
      code: DEFAULT_ERROR_CODE,
      position: error2.position
    }];
  }
  const ngModuleErrorData = getMissingNgModuleMetadataErrorData(error2);
  if (ngModuleErrorData !== null) {
    const ngModuleClass = getDtsClass(program, ngModuleErrorData.fileName, ngModuleErrorData.className);
    if (ngModuleClass !== null && isIvyNgModule(ngModuleClass)) {
      return [{
        messageText: `The NgModule '${ngModuleErrorData.className}' in '${ngModuleErrorData.fileName}' is imported by this compilation, but appears to be part of a library compiled for Angular Ivy. This may occur because:

  1) the library was processed with 'ngcc'. Removing and reinstalling node_modules may fix this problem.

  2) the library was published for Angular Ivy and v12+ applications only. Check its peer dependencies carefully and ensure that you're using a compatible version of Angular.

See https://angular.io/errors/NG6999 for more information.
`,
        category: ts84.DiagnosticCategory.Error,
        code: DEFAULT_ERROR_CODE,
        source: SOURCE
      }];
    }
  }
  return [{
    messageText: error2.message,
    category: ts84.DiagnosticCategory.Error,
    code: DEFAULT_ERROR_CODE,
    source: SOURCE
  }];
}
function getDtsClass(program, fileName, className) {
  const sf = program.getSourceFile(fileName);
  if (sf === void 0 || !sf.isDeclarationFile) {
    return null;
  }
  for (const stmt of sf.statements) {
    if (!ts84.isClassDeclaration(stmt)) {
      continue;
    }
    if (stmt.name === void 0 || stmt.name.text !== className) {
      continue;
    }
    return stmt;
  }
  return null;
}
function isIvyNgModule(clazz) {
  for (const member of clazz.members) {
    if (!ts84.isPropertyDeclaration(member)) {
      continue;
    }
    if (ts84.isIdentifier(member.name) && member.name.text === "\u0275mod") {
      return true;
    }
  }
  return false;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/perform_compile.mjs
var defaultFormatHost = {
  getCurrentDirectory: () => ts85.sys.getCurrentDirectory(),
  getCanonicalFileName: (fileName) => fileName,
  getNewLine: () => ts85.sys.newLine
};
function displayFileName(fileName, host) {
  return relative(resolve(host.getCurrentDirectory()), resolve(host.getCanonicalFileName(fileName)));
}
function formatDiagnosticPosition(position, host = defaultFormatHost) {
  return `${displayFileName(position.fileName, host)}(${position.line + 1},${position.column + 1})`;
}
function flattenDiagnosticMessageChain(chain, host = defaultFormatHost, indent = 0) {
  const newLine = host.getNewLine();
  let result = "";
  if (indent) {
    result += newLine;
    for (let i = 0; i < indent; i++) {
      result += "  ";
    }
  }
  result += chain.messageText;
  const position = chain.position;
  if (position && indent !== 0) {
    result += ` at ${formatDiagnosticPosition(position, host)}`;
  }
  indent++;
  if (chain.next) {
    for (const kid of chain.next) {
      result += flattenDiagnosticMessageChain(kid, host, indent);
    }
  }
  return result;
}
function formatDiagnostic(diagnostic, host = defaultFormatHost) {
  let result = "";
  const newLine = host.getNewLine();
  const span = diagnostic.span;
  if (span) {
    result += `${formatDiagnosticPosition({ fileName: span.start.file.url, line: span.start.line, column: span.start.col }, host)}: `;
  } else if (diagnostic.position) {
    result += `${formatDiagnosticPosition(diagnostic.position, host)}: `;
  }
  if (diagnostic.span && diagnostic.span.details) {
    result += `${diagnostic.span.details}, ${diagnostic.messageText}${newLine}`;
  } else if (diagnostic.chain) {
    result += `${flattenDiagnosticMessageChain(diagnostic.chain, host)}.${newLine}`;
  } else {
    result += `${diagnostic.messageText}${newLine}`;
  }
  return result;
}
function formatDiagnostics(diags, host = defaultFormatHost) {
  if (diags && diags.length) {
    return diags.map((diagnostic) => {
      if (isTsDiagnostic(diagnostic)) {
        return replaceTsWithNgInErrors(ts85.formatDiagnosticsWithColorAndContext([diagnostic], host));
      } else {
        return formatDiagnostic(diagnostic, host);
      }
    }).join("");
  } else {
    return "";
  }
}
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
    const readConfigFile = (configFile) => ts85.readConfigFile(configFile, (file) => host.readFile(host.resolve(file)));
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
    const { options, errors, fileNames: rootNames, projectReferences } = ts85.parseJsonConfigFileContent(config, parseConfigHost, basePath, existingCompilerOptions, configFileName);
    options.enableIvy = !!((_a = options.enableIvy) != null ? _a : true);
    let emitFlags = EmitFlags.Default;
    if (!(options.skipMetadataEmit || options.flatModuleOutFile)) {
      emitFlags |= EmitFlags.Metadata;
    }
    if (options.skipTemplateCodegen) {
      emitFlags = emitFlags & ~EmitFlags.Codegen;
    }
    return { project: projectFile, rootNames, projectReferences, options, errors, emitFlags };
  } catch (e) {
    const errors = [{
      category: ts85.DiagnosticCategory.Error,
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
    readDirectory: ts85.sys.readDirectory,
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
    const { resolvedModule } = ts85.nodeModuleNameResolver(extendsValue, configFile, { moduleResolution: ts85.ModuleResolutionKind.NodeJs, resolveJsonModule: true }, parseConfigHost);
    if (resolvedModule) {
      return absoluteFrom(resolvedModule.resolvedFileName);
    }
  }
  return null;
}
function exitCodeFromResult(diags) {
  if (!diags)
    return 0;
  if (diags.every((diag) => diag.category !== ts85.DiagnosticCategory.Error)) {
    return 0;
  }
  return diags.some((d) => d.source === "angular" && d.code === UNKNOWN_ERROR_CODE) ? 2 : 1;
}
function performCompilation({ rootNames, options, host, oldProgram, emitCallback, mergeEmitResultsCallback, gatherDiagnostics = defaultGatherDiagnostics, customTransformers, emitFlags = EmitFlags.Default, modifiedResourceFiles = null }) {
  let program;
  let emitResult;
  let allDiagnostics = [];
  try {
    if (!host) {
      host = createCompilerHost({ options });
    }
    if (modifiedResourceFiles) {
      host.getModifiedResourceFiles = () => modifiedResourceFiles;
    }
    program = createProgram({ rootNames, host, options, oldProgram });
    const beforeDiags = Date.now();
    allDiagnostics.push(...gatherDiagnostics(program));
    if (options.diagnostics) {
      const afterDiags = Date.now();
      allDiagnostics.push(createMessageDiagnostic(`Time for diagnostics: ${afterDiags - beforeDiags}ms.`));
    }
    if (!hasErrors(allDiagnostics)) {
      emitResult = program.emit({ emitCallback, mergeEmitResultsCallback, customTransformers, emitFlags });
      allDiagnostics.push(...emitResult.diagnostics);
      return { diagnostics: allDiagnostics, program, emitResult };
    }
    return { diagnostics: allDiagnostics, program };
  } catch (e) {
    let errMsg;
    let code;
    if (isSyntaxError2(e)) {
      errMsg = e.message;
      code = DEFAULT_ERROR_CODE;
    } else {
      errMsg = e.stack;
      program = void 0;
      code = UNKNOWN_ERROR_CODE;
    }
    allDiagnostics.push({ category: ts85.DiagnosticCategory.Error, messageText: errMsg, code, source: SOURCE });
    return { diagnostics: allDiagnostics, program };
  }
}
function defaultGatherDiagnostics(program) {
  const allDiagnostics = [];
  function checkDiagnostics(diags) {
    if (diags) {
      allDiagnostics.push(...diags);
      return !hasErrors(diags);
    }
    return true;
  }
  let checkOtherDiagnostics = true;
  checkOtherDiagnostics = checkOtherDiagnostics && checkDiagnostics([...program.getTsOptionDiagnostics(), ...program.getNgOptionDiagnostics()]);
  checkOtherDiagnostics = checkOtherDiagnostics && checkDiagnostics(program.getTsSyntacticDiagnostics());
  checkOtherDiagnostics = checkOtherDiagnostics && checkDiagnostics([...program.getTsSemanticDiagnostics(), ...program.getNgStructuralDiagnostics()]);
  checkOtherDiagnostics = checkOtherDiagnostics && checkDiagnostics(program.getNgSemanticDiagnostics());
  return allDiagnostics;
}
function hasErrors(diags) {
  return diags.some((d) => d.category === ts85.DiagnosticCategory.Error);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/perform_watch.mjs
import {
  watch
} from "chokidar";
import {
  normalize as normalize4
} from "path";
import ts86 from "typescript";
function totalCompilationTimeDiagnostic(timeInMillis) {
  let duration;
  if (timeInMillis > 1e3) {
    duration = `${(timeInMillis / 1e3).toPrecision(2)}s`;
  } else {
    duration = `${timeInMillis}ms`;
  }
  return {
    category: ts86.DiagnosticCategory.Message,
    messageText: `Total time: ${duration}`,
    code: DEFAULT_ERROR_CODE,
    source: SOURCE
  };
}
var FileChangeEvent;
(function(FileChangeEvent2) {
  FileChangeEvent2[FileChangeEvent2["Change"] = 0] = "Change";
  FileChangeEvent2[FileChangeEvent2["CreateDelete"] = 1] = "CreateDelete";
  FileChangeEvent2[FileChangeEvent2["CreateDeleteDir"] = 2] = "CreateDeleteDir";
})(FileChangeEvent || (FileChangeEvent = {}));
function createPerformWatchHost(configFileName, reportDiagnostics, existingOptions, createEmitCallback2) {
  return {
    reportDiagnostics,
    createCompilerHost: (options) => createCompilerHost({ options }),
    readConfiguration: () => readConfiguration(configFileName, existingOptions),
    createEmitCallback: (options) => createEmitCallback2 ? createEmitCallback2(options) : void 0,
    onFileChange: (options, listener, ready) => {
      if (!options.basePath) {
        reportDiagnostics([{
          category: ts86.DiagnosticCategory.Error,
          messageText: "Invalid configuration option. baseDir not specified",
          source: SOURCE,
          code: DEFAULT_ERROR_CODE
        }]);
        return { close: () => {
        } };
      }
      const watcher = watch(options.basePath, {
        ignored: /((^[\/\\])\..)|(\.js$)|(\.map$)|(\.metadata\.json|node_modules)/,
        ignoreInitial: true,
        persistent: true
      });
      watcher.on("all", (event, path8) => {
        switch (event) {
          case "change":
            listener(FileChangeEvent.Change, path8);
            break;
          case "unlink":
          case "add":
            listener(FileChangeEvent.CreateDelete, path8);
            break;
          case "unlinkDir":
          case "addDir":
            listener(FileChangeEvent.CreateDeleteDir, path8);
            break;
        }
      });
      watcher.on("ready", ready);
      return { close: () => watcher.close(), ready };
    },
    setTimeout: ts86.sys.clearTimeout && ts86.sys.setTimeout || setTimeout,
    clearTimeout: ts86.sys.setTimeout && ts86.sys.clearTimeout || clearTimeout
  };
}
function performWatchCompilation(host) {
  let cachedProgram;
  let cachedCompilerHost;
  let cachedOptions;
  let timerHandleForRecompilation;
  const ignoreFilesForWatch = new Set();
  const fileCache = new Map();
  const firstCompileResult = doCompilation();
  let resolveReadyPromise;
  const readyPromise = new Promise((resolve5) => resolveReadyPromise = resolve5);
  const fileWatcher = host.onFileChange(cachedOptions.options, watchedFileChanged, resolveReadyPromise);
  return { close, ready: (cb) => readyPromise.then(cb), firstCompileResult };
  function cacheEntry(fileName) {
    fileName = normalize4(fileName);
    let entry = fileCache.get(fileName);
    if (!entry) {
      entry = {};
      fileCache.set(fileName, entry);
    }
    return entry;
  }
  function close() {
    fileWatcher.close();
    if (timerHandleForRecompilation) {
      host.clearTimeout(timerHandleForRecompilation.timerHandle);
      timerHandleForRecompilation = void 0;
    }
  }
  function doCompilation() {
    if (!cachedOptions) {
      cachedOptions = host.readConfiguration();
    }
    if (cachedOptions.errors && cachedOptions.errors.length) {
      host.reportDiagnostics(cachedOptions.errors);
      return cachedOptions.errors;
    }
    const startTime = Date.now();
    if (!cachedCompilerHost) {
      cachedCompilerHost = host.createCompilerHost(cachedOptions.options);
      const originalWriteFileCallback = cachedCompilerHost.writeFile;
      cachedCompilerHost.writeFile = function(fileName, data, writeByteOrderMark, onError, sourceFiles = []) {
        ignoreFilesForWatch.add(normalize4(fileName));
        return originalWriteFileCallback(fileName, data, writeByteOrderMark, onError, sourceFiles);
      };
      const originalFileExists = cachedCompilerHost.fileExists;
      cachedCompilerHost.fileExists = function(fileName) {
        const ce = cacheEntry(fileName);
        if (ce.exists == null) {
          ce.exists = originalFileExists.call(this, fileName);
        }
        return ce.exists;
      };
      const originalGetSourceFile = cachedCompilerHost.getSourceFile;
      cachedCompilerHost.getSourceFile = function(fileName, languageVersion) {
        const ce = cacheEntry(fileName);
        if (!ce.sf) {
          ce.sf = originalGetSourceFile.call(this, fileName, languageVersion);
        }
        return ce.sf;
      };
      const originalReadFile = cachedCompilerHost.readFile;
      cachedCompilerHost.readFile = function(fileName) {
        const ce = cacheEntry(fileName);
        if (ce.content == null) {
          ce.content = originalReadFile.call(this, fileName);
        }
        return ce.content;
      };
      cachedCompilerHost.getModifiedResourceFiles = function() {
        if (timerHandleForRecompilation === void 0) {
          return void 0;
        }
        return timerHandleForRecompilation.modifiedResourceFiles;
      };
    }
    ignoreFilesForWatch.clear();
    const oldProgram = cachedProgram;
    cachedProgram = void 0;
    const compileResult = performCompilation({
      rootNames: cachedOptions.rootNames,
      options: cachedOptions.options,
      host: cachedCompilerHost,
      oldProgram,
      emitCallback: host.createEmitCallback(cachedOptions.options)
    });
    if (compileResult.diagnostics.length) {
      host.reportDiagnostics(compileResult.diagnostics);
    }
    const endTime = Date.now();
    if (cachedOptions.options.diagnostics) {
      const totalTime = (endTime - startTime) / 1e3;
      host.reportDiagnostics([totalCompilationTimeDiagnostic(endTime - startTime)]);
    }
    const exitCode = exitCodeFromResult(compileResult.diagnostics);
    if (exitCode == 0) {
      cachedProgram = compileResult.program;
      host.reportDiagnostics([createMessageDiagnostic("Compilation complete. Watching for file changes.")]);
    } else {
      host.reportDiagnostics([createMessageDiagnostic("Compilation failed. Watching for file changes.")]);
    }
    return compileResult.diagnostics;
  }
  function resetOptions() {
    cachedProgram = void 0;
    cachedCompilerHost = void 0;
    cachedOptions = void 0;
  }
  function watchedFileChanged(event, fileName) {
    const normalizedPath = normalize4(fileName);
    if (cachedOptions && event === FileChangeEvent.Change && normalizedPath === normalize4(cachedOptions.project)) {
      resetOptions();
    } else if (event === FileChangeEvent.CreateDelete || event === FileChangeEvent.CreateDeleteDir) {
      cachedOptions = void 0;
    }
    if (event === FileChangeEvent.CreateDeleteDir) {
      fileCache.clear();
    } else {
      fileCache.delete(normalizedPath);
    }
    if (!ignoreFilesForWatch.has(normalizedPath)) {
      startTimerForRecompilation(normalizedPath);
    }
  }
  function startTimerForRecompilation(changedPath) {
    if (timerHandleForRecompilation) {
      host.clearTimeout(timerHandleForRecompilation.timerHandle);
    } else {
      timerHandleForRecompilation = {
        modifiedResourceFiles: new Set(),
        timerHandle: void 0
      };
    }
    timerHandleForRecompilation.timerHandle = host.setTimeout(recompile, 250);
    timerHandleForRecompilation.modifiedResourceFiles.add(changedPath);
  }
  function recompile() {
    host.reportDiagnostics([createMessageDiagnostic("File change detected. Starting incremental compilation.")]);
    doCompilation();
    timerHandleForRecompilation = void 0;
  }
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/main.mjs
function main(args2, consoleError = console.error, config, customTransformers, programReuse, modifiedResourceFiles, tsickle) {
  let { project, rootNames, options, errors: configErrors, watch: watch2, emitFlags } = config || readNgcCommandLineAndConfiguration(args2);
  if (configErrors.length) {
    return reportErrorsAndExit(configErrors, void 0, consoleError);
  }
  if (watch2) {
    const result = watchMode(project, options, consoleError);
    return reportErrorsAndExit(result.firstCompileResult, options, consoleError);
  }
  let oldProgram;
  if (programReuse !== void 0) {
    oldProgram = programReuse.program;
  }
  const { diagnostics: compileDiags, program } = performCompilation({
    rootNames,
    options,
    emitFlags,
    oldProgram,
    emitCallback: createEmitCallback(options, tsickle),
    customTransformers,
    modifiedResourceFiles
  });
  if (programReuse !== void 0) {
    programReuse.program = program;
  }
  return reportErrorsAndExit(compileDiags, options, consoleError);
}
function createEmitCallback(options, tsickle) {
  if (!options.annotateForClosureCompiler) {
    return void 0;
  }
  if (tsickle == void 0) {
    throw Error("Tsickle is not provided but `annotateForClosureCompiler` is enabled.");
  }
  const tsickleHost = {
    shouldSkipTsickleProcessing: (fileName) => /\.d\.ts$/.test(fileName) || !options.enableIvy && GENERATED_FILES.test(fileName),
    pathToModuleName: (context, importPath) => "",
    shouldIgnoreWarningsForPath: (filePath) => false,
    fileNameToModuleId: (fileName) => fileName,
    googmodule: false,
    untyped: true,
    convertIndexImportShorthand: false,
    transformDecorators: false,
    transformTypesToClosure: true
  };
  return ({ program, targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers = {}, host, options: options2 }) => tsickle.emitWithTsickle(program, __spreadProps(__spreadValues({}, tsickleHost), { options: options2, moduleResolutionHost: host }), host, options2, targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, {
    beforeTs: customTransformers.before,
    afterTs: customTransformers.after
  });
}
function readNgcCommandLineAndConfiguration(args2) {
  const options = {};
  const parsedArgs = yargs(args2).parserConfiguration({ "strip-aliased": true }).option("i18nFile", { type: "string" }).option("i18nFormat", { type: "string" }).option("locale", { type: "string" }).option("missingTranslation", { type: "string", choices: ["error", "warning", "ignore"] }).option("outFile", { type: "string" }).option("watch", { type: "boolean", alias: ["w"] }).parseSync();
  if (parsedArgs.i18nFile)
    options.i18nInFile = parsedArgs.i18nFile;
  if (parsedArgs.i18nFormat)
    options.i18nInFormat = parsedArgs.i18nFormat;
  if (parsedArgs.locale)
    options.i18nInLocale = parsedArgs.locale;
  if (parsedArgs.missingTranslation)
    options.i18nInMissingTranslations = parsedArgs.missingTranslation;
  const config = readCommandLineAndConfiguration(args2, options, ["i18nFile", "i18nFormat", "locale", "missingTranslation", "watch"]);
  return __spreadProps(__spreadValues({}, config), { watch: parsedArgs.watch });
}
function readCommandLineAndConfiguration(args2, existingOptions = {}, ngCmdLineOptions = []) {
  let cmdConfig = ts87.parseCommandLine(args2);
  const project = cmdConfig.options.project || ".";
  const cmdErrors = cmdConfig.errors.filter((e) => {
    if (typeof e.messageText === "string") {
      const msg = e.messageText;
      return !ngCmdLineOptions.some((o3) => msg.indexOf(o3) >= 0);
    }
    return true;
  });
  if (cmdErrors.length) {
    return {
      project,
      rootNames: [],
      options: cmdConfig.options,
      errors: cmdErrors,
      emitFlags: EmitFlags.Default
    };
  }
  const config = readConfiguration(project, cmdConfig.options);
  const options = __spreadValues(__spreadValues({}, config.options), existingOptions);
  if (options.locale) {
    options.i18nInLocale = options.locale;
  }
  return {
    project,
    rootNames: config.rootNames,
    options,
    errors: config.errors,
    emitFlags: config.emitFlags
  };
}
function getFormatDiagnosticsHost(options) {
  const basePath = options ? options.basePath : void 0;
  return {
    getCurrentDirectory: () => basePath || ts87.sys.getCurrentDirectory(),
    getCanonicalFileName: (fileName) => fileName.replace(/\\/g, "/"),
    getNewLine: () => {
      if (options && options.newLine !== void 0) {
        return options.newLine === ts87.NewLineKind.LineFeed ? "\n" : "\r\n";
      }
      return ts87.sys.newLine;
    }
  };
}
function reportErrorsAndExit(allDiagnostics, options, consoleError = console.error) {
  const errorsAndWarnings = allDiagnostics.filter((d) => d.category !== ts87.DiagnosticCategory.Message);
  printDiagnostics(errorsAndWarnings, options, consoleError);
  return exitCodeFromResult(allDiagnostics);
}
function watchMode(project, options, consoleError) {
  return performWatchCompilation(createPerformWatchHost(project, (diagnostics) => {
    printDiagnostics(diagnostics, options, consoleError);
  }, options, (options2) => createEmitCallback(options2)));
}
function printDiagnostics(diagnostics, options, consoleError) {
  if (diagnostics.length === 0) {
    return;
  }
  const formatHost = getFormatDiagnosticsHost(options);
  consoleError(formatDiagnostics(diagnostics, formatHost));
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/extract_i18n.mjs
function mainXi18n(args2, consoleError = console.error) {
  const config = readXi18nCommandLineAndConfiguration(args2);
  return main(args2, consoleError, config, void 0, void 0, void 0);
}
function readXi18nCommandLineAndConfiguration(args2) {
  const options = {};
  const parsedArgs = yargs2(args2).option("i18nFormat", { type: "string" }).option("locale", { type: "string" }).option("outFile", { type: "string" }).parseSync();
  if (parsedArgs.outFile)
    options.i18nOutFile = parsedArgs.outFile;
  if (parsedArgs.i18nFormat)
    options.i18nOutFormat = parsedArgs.i18nFormat;
  if (parsedArgs.locale)
    options.i18nOutLocale = parsedArgs.locale;
  const config = readCommandLineAndConfiguration(args2, options, [
    "outFile",
    "i18nFormat",
    "locale"
  ]);
  return __spreadProps(__spreadValues({}, config), { emitFlags: EmitFlags.I18nBundle });
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/bin/ng_xi18n.mjs
process.title = "Angular i18n Message Extractor (ng-xi18n)";
var args = process.argv.slice(2);
setFileSystem(new NodeJSFileSystem());
process.exitCode = mainXi18n(args);
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Closure Compiler ignores @suppress and similar if the comment contains @license.
//# sourceMappingURL=ng_xi18n.js.map
